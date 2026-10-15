import * as pdfjsLib from 'pdfjs-dist';
import { CostCategory, ParsedPosition, ParseResult, PositionKind, PositionSide, MasterRate } from '../types';
import { parseGermanNumber, detectCategory, cents } from './calculations';

// Configure pdfjs worker to reliable CDN version matching installed pdfjs-dist
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextLine {
  y: number;
  items: RawTextItem[];
  text: string;
}

// Regex for common German construction and commercial units
const UNIT_REGEX = /\b(Std\.?|Stunden?|\bh\b|Tag(?:e)?|t|to\.?|Tonnen?|m[²³23]|qm|cbm|lfm|\bm\b|Stk\.?|Stck\.?|Stück|Psch\.?|pauschal|Pauschale|\bl\b|Liter|Ltr\.?|kg|km|Fahrt(?:en)?|Schicht(?:en)?|Woche(?:n)?)\b/i;

// Standardized display for units
function normalizeUnit(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (/^(std\.?|stunden?|h)$/i.test(s)) return 'Std.';
  if (/^(tag|tage)$/i.test(s)) return 'Tag';
  if (/^(t|to\.?|tonnen?)$/i.test(s)) return 't';
  if (/^(m³|m3|cbm)$/i.test(s)) return 'm³';
  if (/^(m²|m2|qm)$/i.test(s)) return 'm²';
  if (/^(l|liter|ltr\.?)$/i.test(s)) return 'Liter';
  if (/^(stk\.?|stck\.?|stück)$/i.test(s)) return 'Stk.';
  if (/^(psch\.?|pauschal|pauschale)$/i.test(s)) return 'pauschal';
  if (/^(lfm|m|meter)$/i.test(s)) return 'm';
  if (/^(fahrt|fahrten)$/i.test(s)) return 'Fahrt';
  if (/^(schicht|schichten)$/i.test(s)) return 'Schicht';
  return raw.trim();
}

/**
 * Extracts and reconstructs clean text lines from a PDF page
 */
async function extractLinesFromPage(page: pdfjsLib.PDFPageProxy): Promise<TextLine[]> {
  const content = await page.getTextContent();
  const rawItems: RawTextItem[] = [];

  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    rawItems.push({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width || 0,
      height: item.height || 0,
    });
  }

  // Group text items by Y coordinate with vertical threshold tolerance (approx 3.5 points)
  const lineGroups: { y: number; items: RawTextItem[] }[] = [];

  for (const item of rawItems) {
    const existingGroup = lineGroups.find((g) => Math.abs(g.y - item.y) <= 3.5);
    if (existingGroup) {
      existingGroup.items.push(item);
    } else {
      lineGroups.push({ y: item.y, items: [item] });
    }
  }

  // Sort lines top to bottom (PDF Y is 0 at bottom, so larger Y is near top)
  lineGroups.sort((a, b) => b.y - a.y);

  // In each line, sort items left to right
  return lineGroups.map((g) => {
    g.items.sort((a, b) => a.x - b.x);
    // Join with space if not already separated
    const lineText = g.items
      .map((it) => it.str.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ');
    return {
      y: g.y,
      items: g.items,
      text: lineText,
    };
  });
}

/**
 * Helper to compute SHA-256 hash of ArrayBuffer
 */
async function computeHash(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Main parser for PDF files (Offers, Invoices, Delivery Slips, Machine Sheets)
 */
export async function parsePdfFile(
  file: File,
  rates: MasterRate[] = []
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const hash = await computeHash(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const allLines: TextLine[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const pageLines = await extractLinesFromPage(page);
    allLines.push(...pageLines);
  }

  const fullText = allLines.map((l) => l.text).join('\n');

  // Detect Document Metadata
  const detectedType = detectDocumentType(fullText, file.name);
  const detectedProjectName = detectProjectName(allLines, fullText);
  const detectedCustomer = detectCustomer(allLines, fullText);
  const detectedDate = detectDate(allLines, fullText);
  const detectedInvoiceNumber = detectInvoiceNumber(allLines, fullText);

  // Default side and kind based on document type
  const isOffer = detectedType === 'offer';
  const defaultSide: PositionSide = isOffer ? 'plan' : 'actual';
  const defaultKind: PositionKind = isOffer ? 'revenue' : 'cost';

  // Extract positions using multi-pass strategies
  const extractedPositions = extractPositionsFromLines(
    allLines,
    rates,
    defaultSide,
    defaultKind
  );

  // Check for Net / Gross / VAT totals in the document
  const totalsInfo = extractTotals(allLines, fullText);

  // If positions were found
  if (extractedPositions.length > 0) {
    return {
      fileName: file.name,
      hash,
      detectedType,
      detectedProjectName,
      detectedCustomer,
      detectedDate,
      detectedInvoiceNumber,
      rows: extractedPositions,
      netTotal: totalsInfo.net ?? extractedPositions.reduce((s, r) => s + r.total, 0),
      grossTotal: totalsInfo.gross,
      vatAmount: totalsInfo.vat,
      rawText: fullText,
      mode: 'positions',
    };
  }

  // Fallback: If no individual line items were recognized, but we found a valid net total
  if (totalsInfo.net && totalsInfo.net > 0) {
    const summaryCategory = detectCategory(
      `${file.name} ${detectedProjectName || ''} ${fullText.slice(0, 1000)}`
    );
    const summaryDescription =
      (detectedType === 'invoice' ? 'Rechnungsbetrag netto ' : 'Angebotsbetrag netto ') +
      (detectedInvoiceNumber ? `(${detectedInvoiceNumber})` : file.name.replace(/\.pdf$/i, ''));

    const summaryPos: ParsedPosition = {
      id: crypto.randomUUID(),
      selected: true,
      description: summaryDescription,
      qty: 1,
      unit: 'pauschal',
      rate: totalsInfo.net,
      total: totalsInfo.net,
      category: summaryCategory,
      side: defaultSide,
      kind: defaultKind,
      date: detectedDate || new Date().toISOString().split('T')[0],
      note: 'Nettobetrag des Belegs automatisch übernommen (Summenbeleg)',
      confidence: 'medium',
    };

    return {
      fileName: file.name,
      hash,
      detectedType,
      detectedProjectName,
      detectedCustomer,
      detectedDate,
      detectedInvoiceNumber,
      rows: [summaryPos],
      netTotal: totalsInfo.net,
      grossTotal: totalsInfo.gross,
      vatAmount: totalsInfo.vat,
      rawText: fullText,
      mode: 'nettotal',
    };
  }

  // Unrecognized fallback with helpful message
  return {
    fileName: file.name,
    hash,
    detectedType,
    detectedProjectName,
    detectedCustomer,
    detectedDate,
    detectedInvoiceNumber,
    rows: [],
    netTotal: null,
    grossTotal: null,
    vatAmount: null,
    rawText: fullText,
    mode: 'unrecognized',
    warning:
      fullText.trim().length === 0
        ? 'Diese PDF enthält keinen durchsuchbaren Text (möglicherweise ein reiner Bildscan). Bitte erfasse die Werte manuell oder nutze einen durchsuchbaren Beleg.'
        : 'Es konnten keine eindeutigen Positionen oder Summenzeilen im Dokument erkannt werden. Du kannst Positionen im Prüfdialog manuell anlegen.',
  };
}

/**
 * Detects whether the file is an offer/quote or an invoice/report/delivery note
 */
function detectDocumentType(
  fullText: string,
  fileName: string
): 'offer' | 'invoice' | 'timesheet' | 'delivery' | 'excel' | 'unknown' {
  const s = `${fileName} ${fullText}`.toLowerCase();

  if (/stundenzettel|stundennachweis|tagesbericht|bautagebericht|arbeitsbericht/i.test(s)) {
    return 'timesheet';
  }
  if (/lieferschein|wiegeschein|fuhrschein/i.test(s)) {
    return 'delivery';
  }
  if (/angebot|kostenvoranschlag|preisanfrage|kalkulation|\blv\b|leistungsverzeichnis/i.test(s)) {
    return 'offer';
  }
  if (/rechnung|schlussrechnung|abschlagsrechnung|teilrechnung|gutschrift|rechnungs-nr|invoice|quittung|tankbeleg|beleg/i.test(s)) {
    return 'invoice';
  }
  return 'invoice';
}

/**
 * Detects project / construction site name
 */
function detectProjectName(lines: TextLine[], fullText: string): string | undefined {
  // Check common keywords
  const patterns = [
    /(?:bauvorhaben|bv|baustelle|projekt|objekt|kommission|einsatzort|lieferort)[:\s]+([^\n\r,;]{3,60})/i,
    /(?:betreff|auftrag)[:\s]+([^\n\r,;]{3,60})/i,
  ];

  for (const pat of patterns) {
    const match = fullText.match(pat);
    if (match && match[1]) {
      const clean = match[1].trim();
      if (clean.length > 2 && !/^(rechnung|angebot|datum|nr|seite)/i.test(clean)) {
        return clean;
      }
    }
  }

  return undefined;
}

/**
 * Detects customer or client name
 */
function detectCustomer(lines: TextLine[], fullText: string): string | undefined {
  const match = fullText.match(/(?:auftraggeber|kunde|rechnungsempf[aä]nger|ag)[:\s]+([^\n\r,;]{3,50})/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return undefined;
}

/**
 * Detects date in the document
 */
function detectDate(lines: TextLine[], fullText: string): string | undefined {
  // Match Date format dd.mm.yyyy or dd/mm/yyyy or yyyy-mm-dd
  const datePattern = /(?:datum|rechnungsdatum|leistungsdatum|stand)[:\s]*([0-3]?\d[./-][0-1]?\d[./-]20\d{2})/i;
  const match = fullText.match(datePattern);
  if (match && match[1]) {
    const parts = match[1].split(/[./-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  // Generic date search
  const genericMatch = fullText.match(/\b([0-3]?\d)\.([0-1]?\d)\.(20\d{2})\b/);
  if (genericMatch) {
    return `${genericMatch[3]}-${genericMatch[2].padStart(2, '0')}-${genericMatch[1].padStart(2, '0')}`;
  }

  return undefined;
}

/**
 * Detects Invoice / Offer Number
 */
function detectInvoiceNumber(lines: TextLine[], fullText: string): string | undefined {
  const match = fullText.match(/(?:rechnungs[- ]?nr\.?|rechnung\s*nr\.?|beleg[- ]?nr\.?|angebots[- ]?nr\.?|angebot\s*nr\.?)[:\s]*([A-Z0-9/_-]{3,30})/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return undefined;
}

/**
 * Extracts Net, Gross and VAT totals from lines
 */
function extractTotals(
  lines: TextLine[],
  fullText: string
): { net: number | null; gross: number | null; vat: number | null } {
  let net: number | null = null;
  let gross: number | null = null;
  let vat: number | null = null;

  // Search through lines for Netto
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].text;
    const isNetLine =
      /nettobetrag|nettosumme|gesamt\s*netto|summe\s*netto|netto\s*gesamt|rechnungssumme\s*netto|gesamtbetrag\s*netto|endbetrag\s*netto|leistungsbetrag\s*netto|zwischensumme/i.test(
        line
      );

    if (isNetLine && !/brutto|mwst|ust/i.test(line)) {
      // Find amounts in this line or subsequent line
      const amounts = extractAmountsFromText(line);
      if (amounts.length > 0) {
        net = amounts[amounts.length - 1];
      } else if (i + 1 < lines.length) {
        const nextAmounts = extractAmountsFromText(lines[i + 1].text);
        if (nextAmounts.length > 0) {
          net = nextAmounts[nextAmounts.length - 1];
        }
      }
    }

    // Check for Brutto / Endbetrag
    if (/gesamtbetrag|rechnungsbetrag|bruttobetrag|bruttosumme|gesamt\s*brutto|endbetrag/i.test(line)) {
      const amounts = extractAmountsFromText(line);
      if (amounts.length > 0) {
        gross = amounts[amounts.length - 1];
      }
    }

    // Check for MwSt / USt
    if (/(?:19%|7%|mwst\.?|ust\.?)/i.test(line)) {
      const amounts = extractAmountsFromText(line);
      if (amounts.length > 0) {
        vat = amounts[amounts.length - 1];
      }
    }
  }

  return { net, gross, vat };
}

/**
 * Extracts all numeric monetary values from a text string
 */
function extractAmountsFromText(text: string): number[] {
  // Match German and standard number formats
  const matches = text.matchAll(/(?:EUR|€)?\s*(-?\d{1,3}(?:\.\d{3})+,\d{2}|-?\d+,\d{2}|\b-?\d+\.\d{2}\b|-?\d+,\d{1}\b)/g);
  const result: number[] = [];
  for (const m of matches) {
    const n = parseGermanNumber(m[1]);
    if (Number.isFinite(n)) {
      result.push(cents(n));
    }
  }
  return result;
}

/**
 * Core Algorithm: Extract position items from lines
 */
function extractPositionsFromLines(
  lines: TextLine[],
  rates: MasterRate[],
  side: PositionSide,
  kind: PositionKind
): ParsedPosition[] {
  const positions: ParsedPosition[] = [];
  let pendingDescBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineObj = lines[i];
    const line = lineObj.text.trim();

    // Skip empty lines or pure header / footer / legal lines
    if (!line) continue;
    if (
      /^(seite\s*\d+|iban|bic|bankverbindung|amtsgericht|geschäftsführer|ust[- ]?id|steuernummer|handelsregister|agb|zahlungsziel|skonto|widerrufsbelehrung)/i.test(
        line
      )
    ) {
      continue;
    }

    // Check if line contains a total or summary keyword
    const isSummaryLine = /^(gesamt(?:summe|betrag|preis)?|summe|nettobetrag|bruttobetrag|mwst|ust|endbetrag|rechnungsbetrag|zwischensumme)\b/i.test(
      line
    );
    if (isSummaryLine) {
      pendingDescBuffer = [];
      continue;
    }

    // Try Strategy 1: Tabular / Inline Position with Unit & Numbers
    const pos = tryParsePositionLine(
      line,
      pendingDescBuffer,
      rates,
      side,
      kind
    );

    if (pos) {
      positions.push(pos);
      pendingDescBuffer = []; // reset description buffer
      continue;
    }

    // If line looks like a descriptive continuation (e.g. "Pos 1.01", "Boden der Einbauklasse 3"), buffer it
    if (
      line.length > 3 &&
      !/^(rechnung|angebot|datum|telefon|fax|e-mail|www)/i.test(line) &&
      !/^\d{1,2}\.\d{1,2}\.20\d{2}$/.test(line)
    ) {
      // Keep only up to 3 previous lines to avoid picking up arbitrary paragraphs
      pendingDescBuffer.push(line);
      if (pendingDescBuffer.length > 3) {
        pendingDescBuffer.shift();
      }
    } else {
      pendingDescBuffer = [];
    }
  }

  return positions;
}

/**
 * Parses a single line or line with buffer into a structured position
 */
function tryParsePositionLine(
  currentLine: string,
  descBuffer: string[],
  rates: MasterRate[],
  side: PositionSide,
  kind: PositionKind
): ParsedPosition | null {
  // Test if line contains a recognizable construction unit
  const unitMatch = currentLine.match(UNIT_REGEX);
  if (!unitMatch || unitMatch.index == null) {
    return null;
  }

  const rawUnit = unitMatch[1];
  const unit = normalizeUnit(rawUnit);
  const unitIdx = unitMatch.index;

  // Split line around the unit: left of unit and right of unit
  const leftPart = currentLine.slice(0, unitIdx).trim();
  const rightPart = currentLine.slice(unitIdx + rawUnit.length).trim();

  // Pattern A: Quantity is immediately before unit on the left
  // e.g. "01.01 Baggerarbeiten CAT 326 40 Std. 125,00 € 5.000,00 €"
  // leftPart ends with quantity!
  const qtyLeftMatch = leftPart.match(/(-?\d{1,3}(?:\.\d{3})*,\d+|-?\d+,\d+|-?\d+(?:\.\d+)?)\s*$/);

  // Pattern B: Quantity is before unit, but description is on the right
  // e.g. "120 to Sand 0/2 gewaschen à 14,50 = 1.740,00"
  // leftPart might just be "[Pos] 120"
  const qtyOnlyMatch = leftPart.match(/(?:^|pos\.?\s*\d*\s*|^\d+[\.\)]\s*)(-?\d{1,3}(?:\.\d{3})*,\d+|-?\d+,\d+|-?\d+(?:\.\d+)?)\s*$/i);

  let qty: number | null = null;
  let description = '';
  let rate: number | null = null;
  let total: number | null = null;
  let posNumber: string | undefined;

  // Extract pos number if line starts with e.g. "1.1", "01.01", "Pos. 2"
  const posNumMatch = currentLine.match(/^(?:pos\.?\s*|pos-nr\.?\s*)?(\d{1,3}(?:\.\d{1,3})*|\d+[\.\)])\s+/i);
  if (posNumMatch) {
    posNumber = posNumMatch[1].replace(/[\.\)]$/, '');
  }

  if (qtyLeftMatch) {
    const parsedQty = parseGermanNumber(qtyLeftMatch[1]);
    if (Number.isFinite(parsedQty) && parsedQty !== 0) {
      qty = parsedQty;
      // Description is everything before the quantity on the left
      const descCandidate = leftPart.slice(0, qtyLeftMatch.index).trim();
      description = descCandidate;

      // Extract numbers from rightPart (prices: EP and/or GP)
      const rightAmounts = extractAmountsFromText(rightPart);

      if (rightAmounts.length >= 2) {
        // e.g. "125,00 € 5.000,00 €" -> rate = 125, total = 5000
        // Check if rightAmounts[0] * qty ≈ rightAmounts[1]
        const prod = cents(qty * rightAmounts[0]);
        if (Math.abs(prod - rightAmounts[1]) <= 0.05) {
          rate = rightAmounts[0];
          total = rightAmounts[1];
        } else {
          // Might be reversed or other column order
          rate = rightAmounts[0];
          total = rightAmounts[rightAmounts.length - 1];
        }
      } else if (rightAmounts.length === 1) {
        // Could be either Unit Price or Total Price
        // If rightPart contains "ges" or "summe" or "=" it's total, else rate
        if (/=|\bges\b|\bsumme\b/i.test(rightPart)) {
          total = rightAmounts[0];
          rate = cents(total / qty);
        } else {
          rate = rightAmounts[0];
          total = cents(qty * rate);
        }
      }
    }
  }

  // If description was empty on the left, check if description is on the right
  // e.g. "25 t Mineralbeton 0/32 16,50 € 412,50 €"
  if (!description && qtyOnlyMatch) {
    const parsedQty = parseGermanNumber(qtyOnlyMatch[1]);
    if (Number.isFinite(parsedQty) && parsedQty !== 0) {
      qty = parsedQty;

      // In rightPart, search for trailing amounts
      const rightAmounts = extractAmountsFromText(rightPart);
      if (rightAmounts.length > 0) {
        if (rightAmounts.length >= 2) {
          rate = rightAmounts[0];
          total = rightAmounts[rightAmounts.length - 1];
        } else {
          rate = rightAmounts[0];
          total = cents(qty * rate);
        }
        // Remove amounts and currency from rightPart to get description
        description = rightPart
          .replace(/(?:EUR|€)?\s*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2}|\b-?\d+\.\d{2}\b)/g, '')
          .replace(/[=àx@]/g, '')
          .trim();
      }
    }
  }

  // Clean description from pos numbers
  if (description) {
    description = description.replace(/^(?:pos\.?\s*|pos-nr\.?\s*)?\d{1,3}(?:\.\d{1,3})*[\.\)]?\s*/i, '').trim();
  }

  // If description is still too short or empty, prepend buffered preceding lines
  if (descBuffer.length > 0) {
    const bufferText = descBuffer.join(' ').replace(/^(?:pos\.?\s*)?\d{1,3}(?:\.\d{1,3})*[\.\)]?\s*/i, '').trim();
    if (bufferText) {
      description = description ? `${bufferText} - ${description}` : bufferText;
    }
  }

  // Validate we have a plausible row
  if (!description || qty == null || !Number.isFinite(qty)) {
    return null;
  }

  // Filter out non-item lines that accidentally matched a unit
  if (/^(iban|datum|seite|rechnung|auftrag|angebot|gesamtsumme)/i.test(description)) {
    return null;
  }

  // If rate is still missing, check master rates
  if (rate == null || !Number.isFinite(rate)) {
    const matchedRate = rates.find(
      (r) =>
        r.unit.toLowerCase() === unit.toLowerCase() &&
        description.toLowerCase().includes(r.name.toLowerCase())
    );
    if (matchedRate) {
      rate = matchedRate.rate;
      total = cents(qty * rate);
    } else {
      rate = 0;
      total = 0;
    }
  } else if (total == null || !Number.isFinite(total)) {
    total = cents(qty * rate);
  }

  const category = detectCategory(description, unit);

  // Confidence assessment
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (rate > 0 && total > 0 && Math.abs(cents(qty * rate) - total) <= 0.05) {
    confidence = 'high';
  } else if (rate > 0 || total > 0) {
    confidence = 'medium';
  }

  return {
    id: crypto.randomUUID(),
    selected: true,
    posNumber,
    description,
    qty,
    unit,
    rate,
    total,
    category,
    side,
    kind,
    note: confidence === 'high' ? 'Automatisch mit hoher Genauigkeit erkannt' : 'Aus PDF-Struktur erkannt, bitte prüfen',
    confidence,
  };
}
