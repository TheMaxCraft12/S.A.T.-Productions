# S.A.T. Productions – servergeschützter Admin-Bereich

Diese Version nutzt weiterhin GitHub als Code-Repository. Die Website wird über **Cloudflare Pages** veröffentlicht; die Funktionen unter `functions/api/` laufen serverseitig und verwenden eine Cloudflare-D1-Datenbank. Damit ist das Admin-Passwort nicht im HTML-Quellcode.

## Was enthalten ist

- `index.html` – Website mit Login, Admin-Dashboard sowie Hinzufügen, Bearbeiten und Löschen von Projekten/Trailern.
- `functions/api/login.js` – Anmeldung und Sitzungserstellung.
- `functions/api/logout.js` – Abmeldung.
- `functions/api/content.js` – öffentliche Anzeige und geschützte Verwaltung der Inhalte.
- `functions/_lib/auth.js` – PBKDF2-Passwortprüfung, zufällige Sitzungs-Tokens, HttpOnly-Cookie und Login-Sperre nach fünf Fehlversuchen.
- `schema.sql` – Tabellen für Inhalte, Sitzungen und Login-Versuche.
- `hash-password.mjs` – erzeugt lokal einen PBKDF2-SHA-256-Hash. Das Passwort wird nicht in die Website-Datei geschrieben.

## Einrichtung

### 1. GitHub

1. Entpacke dieses Projekt.
2. Lade **alle Dateien und Ordner** in dein Website-Repository auf GitHub hoch. Die `index.html` muss im Hauptordner liegen.
3. GitHub bleibt der Ort, an dem du den Code bearbeitest. GitHub Pages allein kann die serverseitige Anmeldung nicht ausführen.

### 2. Cloudflare Pages mit GitHub verbinden

1. Erstelle ein kostenloses Cloudflare-Konto und öffne **Workers & Pages**.
2. Wähle **Create application → Pages → Connect to Git**.
3. Verbinde GitHub und wähle dein Website-Repository.
4. Als Framework-Voreinstellung **None** auswählen. Build command leer lassen; Build output directory auf `.` setzen.
5. Das Projekt erstellen. Bei jedem Push auf GitHub kann Cloudflare die Website automatisch neu veröffentlichen.

### 3. D1-Datenbank anlegen

Installiere Node.js und Wrangler auf deinem Computer. Öffne im Projektordner ein Terminal:

```bash
npm install -D wrangler
npx wrangler login
npx wrangler d1 create sat-productions-db
```

Cloudflare gibt eine `database_id` aus. Trage diese ID in `wrangler.toml` anstelle von `REPLACE_WITH_YOUR_D1_DATABASE_ID` ein.

Danach die Tabellen anlegen:

```bash
npx wrangler d1 execute sat-productions-db --remote --file=./schema.sql
```

Stelle sicher, dass die D1-Datenbank im Cloudflare-Pages-Projekt mit dem Binding-Namen **DB** verbunden ist. Die Datei `wrangler.toml` enthält dieses Binding bereits; falls du die Datenbank in der Cloudflare-Oberfläche verbindest, muss der Variablenname exakt `DB` lauten.

### 4. Admin-Benutzer und Passwort einrichten

Wähle einen Benutzernamen und ein langes, einzigartiges Passwort (mindestens 12 Zeichen). Verwende nicht dein GitHub-Passwort.

Erzeuge lokal den Passwort-Hash:

```bash
node hash-password.mjs "HIER-DEIN-EIGENES-PASSWORT"
```

Kopiere nur die ausgegebene Zeile, die mit `pbkdf2$` beginnt. Lege in Cloudflare Pages unter **Settings → Variables and Secrets** diese beiden Secrets an:

- `ADMIN_USERNAME` – dein gewünschter Admin-Benutzername
- `ADMIN_PASSWORD_HASH` – die komplette `pbkdf2$...`-Zeile

Beide Werte als **Secret** speichern, nicht als öffentliche Variable. Danach das Pages-Projekt neu bereitstellen.

> Das echte Passwort niemals in GitHub, `index.html`, `wrangler.toml` oder einen Chat schreiben. Den Hash ebenfalls nicht veröffentlichen.

### 5. Test

1. Öffne die veröffentlichte Website über HTTPS.
2. Klicke auf **STUDIO-VERWALTUNG**.
3. Melde dich mit dem eingerichteten Benutzernamen und Passwort an.
4. Füge testweise ein Projekt und einen Trailer hinzu. Die Inhalte sollten nach einem Neuladen auch für Besucher sichtbar sein.
5. Melde dich über **ABMELDEN** wieder ab.

## Hinweise

- Die Admin-Sitzung läuft nach acht Stunden ab. Das Sitzungs-Cookie ist `HttpOnly`, `Secure` und `SameSite=Strict`.
- Nach fünf fehlgeschlagenen Anmeldungen von derselben IP-Adresse wird die Anmeldung für 15 Minuten blockiert.
- Die öffentliche Website zeigt Projekte und Trailer aus der D1-Datenbank. Für Trailer muss eine direkt erreichbare HTTPS-Video-URL verwendet werden; eine normale YouTube-Seiten-URL ist keine direkte MP4-Datei.
- Dieses Projekt verwaltet Metadaten und Video-Links. Für große Videodateien ist ein separater Video-Host sinnvoll.
- Das ist eine lauffähige Grundstruktur, aber die erste Cloudflare-Verknüpfung und D1-Einrichtung muss einmal manuell in deinem Cloudflare-Konto durchgeführt werden.
