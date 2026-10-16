# VE-Log Endprojekt – zusammengeführt

Dieses Paket enthält das bestehende `velog-main`-Projekt und zusätzlich das React-Dashboard samt Excel/PDF-Import- und Nachkalkulations-Komponenten.

## Bestehende VE-Log-Webseite
Die ursprünglichen HTML-/JS-Dateien, Logo, Formulare, Mitarbeiterverwaltung, Baustellen- und Nachweis-Seiten wurden beibehalten. `index.html` bleibt die ursprüngliche Login-Seite.

## Neue Vollversion
- `baustellennachkalkulation-vollversion.html` – eigenständige vollständige Nachkalkulationsseite.
- `modern-dashboard/` – React/Vite-Dashboard-Projekt mit Quellcode und `public/baustellennachkalkulation.html`.

## Bereitstellung
Wenn Sie die bestehenden HTML-Dateien bei einem statischen Hosting hochladen, laden Sie den Inhalt dieses Ordners zusammen hoch und behalten Sie die Ordnerstruktur bei.

Das React-Dashboard ist ein separates Vite-Projekt im Unterordner `modern-dashboard`. Für dessen Entwicklung:
1. `cd modern-dashboard`
2. `npm install`
3. `npm run dev`

Für den produktiven React-Build: `npm run build`; anschließend den erzeugten `dist`-Ordner entsprechend Ihrem Hosting veröffentlichen.

## Wichtiger Hinweis
Die Dateien sind in einem Paket zusammengeführt und die Originaldateien wurden nicht überschrieben (außer der ergänzten Navigationsverknüpfung im `dashboard.html`). Die unterschiedlichen Oberflächen verwenden derzeit nicht automatisch denselben Datenbestand. Firebase-Konfiguration, Hosting-Regeln und Zugangsdaten müssen vor Veröffentlichung in Ihrer Umgebung geprüft werden. Keine geheimen Schlüssel in ein öffentliches Repository hochladen.
