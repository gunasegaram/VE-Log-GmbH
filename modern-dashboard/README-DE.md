# VE-Log – Website-Projekt

## Lokal starten

Voraussetzungen: Node.js 20+ und npm.

1. Entpacke diesen Ordner.
2. Öffne ein Terminal in diesem Ordner.
3. Führe `npm install` aus.
4. Starte die Entwicklungsversion mit `npm run dev`.
5. Öffne die angezeigte lokale Adresse (standardmäßig http://localhost:3000).

## Produktionsversion bauen

`npm run build` erstellt die veröffentlichbaren Dateien im Ordner `dist/`. Diese Dateien können bei einem passenden statischen Hosting veröffentlicht werden.

## Hinweise

- Projekt- und Nachkalkulationsdaten werden laut aktuellem Code lokal im Browser gespeichert.
- PDF-Dateien mit rein gescannten Bildern können ohne OCR unter Umständen nicht ausgelesen werden.
- Vor einer Veröffentlichung sollten Datenschutz, Zugriffsschutz, Datenhaltung und ggf. Backend-/Firebase-Regeln geprüft werden.
- `.env.example` enthält nur eine Vorlage. Trage dort keine geheimen Schlüssel ein, die im Browser öffentlich sichtbar würden.


## Zusammengeführte VE-Log-Version

- `src/` enthält die React-Web-App mit dem bestehenden VE-Log-Layout.
- `public/baustellennachkalkulation.html` enthält den bereitgestellten vollständigen Einzeldatei-Code für die ausführliche Baustellen-Nachkalkulation.
- In der Seitenleiste gibt es einen Link **„Nachkalkulation (Vollversion)”**. Die Vollversion nutzt das gleiche VE-Log-Farbschema und ist im selben Projekt enthalten.
- Die Vollversion speichert Baustellen und Stammpreise lokal im jeweiligen Browser. Daten zwischen den beiden Oberflächen werden nicht automatisch synchronisiert.
- Bitte vor produktiver Nutzung beide Oberflächen und besonders Excel-/PDF-Importe mit echten Beispieldateien testen.
