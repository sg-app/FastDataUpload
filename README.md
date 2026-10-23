# FastDataUpload

Schneller, temporärer Upload-Dienst für Fotos und Dateien vom Smartphone – ohne App,
ohne Login. Der Bediener zeigt einen **QR-Code**, das Handy scannt ihn und lädt direkt
in ein Docker-Volume hoch.

```
┌─────────────────┐        scan         ┌──────────────────────┐
│  QR-Code Seite  │  ───────────────▶   │  Handy Upload-Seite  │
│  (Desktop)      │                     │  /upload/<token>     │
│  10-Min-Token   │                     │  Bilder / Dateien    │
└─────────────────┘                     └──────────┬───────────┘
        │  Reload = neuer Token                     │
        ▼                                          ▼
   Backend API  ◀──────────────────────────────────┘
   Token-Store (In-Memory)                 Docker Volume ./uploads
```

## Features

- **QR-Code-Generierung** – automatisch beim Öffnen der Startseite
- **10 Minuten gültige Tokens** – per `TOKEN_EXPIRY_MINUTES` konfigurierbar
- **Reload-Button** – erzeugt sofort einen neuen Token, der alte wird ungültig
- **Mobile-first Upload-Seite** – Drag & Drop, Mehrfachauswahl, Fortschrittsanzeige,
  Live-Countdown bis zum Ablauf
- **Volume Mount** – alle Dateien landen in `./uploads` auf dem Host
- **Nginx Proxy Manager ready** – Subdomain bzw. eigener Proxy Host pro Instanz
- **Nur die App ist erreichbar** – kein Directory Listing, keine anderen Ressourcen
- **Konfigurierbares Upload-Limit** – `MAX_FILE_SIZE_MB` (Standard 50 MB)
- **Logos** – SVG-Master plus generierte PNG-Varianten

## Tech-Stack

| Bereich   | Technologie                                     |
| --------- | ----------------------------------------------- |
| Backend   | Node.js, Express, TypeScript, Multer            |
| Frontend  | React 18, TypeScript, Vite, TailwindCSS          |
| QR-Code   | `qrcode.react`                                   |
| Webserver | Nginx (SPA + API-Reverse-Proxy im Web-Container) |
| Container | Docker, Docker Compose                           |

## Verzeichnisstruktur

```
FastDataUpload/
├─ backend/            Express + TypeScript API
│  └─ src/
│     ├─ config.ts            ENV-Konfiguration
│     ├─ server.ts            Express Bootstrap
│     ├─ routes/              token- und upload-Routen
│     ├─ middleware/          CORS, Token-Auth, Fehlerbehandlung
│     └─ services/            Token-Store, Upload-Helfer
├─ frontend/           React SPA + Nginx
│  ├─ src/
│  │  ├─ pages/       QRCodePage, UploadPage, NotFoundPage
│  │  ├─ components/  Logo, QRCodeDisplay, Timer, FileUploader
│  │  ├─ hooks/       useCountdown, useUpload
│  │  └─ lib/         api, env
│  ├─ public/         Logos (SVG + PNG), favicon
│  └─ nginx.conf      Container-Konfiguration
├─ scripts/            Logo-Generator & Smoke-Test
├─ docker-compose.yml
└─ .env.example
```

## Schnellstart mit Docker

```bash
# 1. Konfiguration anlegen
cp .env.example .env
#    -> Werte anpassen (siehe Abschnitt "Umgebungsvariablen")

# 2. Starten
docker compose up -d --build

# 3. Aufrufen
#    QR-Code-Seite:  http://localhost:8080/
```

Die hochgeladenen Dateien liegen anschließend auf dem Host in `./uploads`.

## Lokale Entwicklung

Zwei Terminals:

```bash
# Terminal 1 – Backend (http://localhost:3001)
cd backend
npm install
npm run dev

# Terminal 2 – Frontend (http://localhost:3000)
cd frontend
npm install
npm run dev
```

Der Vite-Dev-Server proxied `/api` automatisch an `http://localhost:3001`
(siehe `frontend/vite.config.ts`).

### Tests & Builds

```bash
cd backend  && npm run build          # TypeScript-Kompilierung
cd frontend && npm run build          # Produktions-Build
powershell -File scripts/smoke-test.ps1   # API-Smoke-Test (Backend muss gebaut sein)
powershell -File scripts/generate-logos.ps1  # PNG-Logos neu erzeugen
```

## Umgebungsvariablen

Alle Werte sind in der `.env` (Kopie von `.env.example`) einstellbar.

### Backend

| Variable                | Standard       | Beschreibung                                                                 |
| ----------------------- | -------------- | ---------------------------------------------------------------------------- |
| `PORT`                  | `3001`         | Port des Express-Servers im Container                                        |
| `TOKEN_EXPIRY_MINUTES`  | `10`           | Gültigkeit eines Upload-Tokens in Minuten                                    |
| `MAX_FILE_SIZE_MB`      | `50`           | Max. Größe **pro Datei** in MB (hochauflösende Handyfotos: 5–25 MB typisch)  |
| `MAX_FILES_PER_REQUEST` | `20`           | Max. Anzahl Dateien pro Upload-Request                                       |
| `UPLOAD_DIR`            | `/app/uploads` | Zielverzeichnis im Container (per Volume Mount auf `./uploads` gelegt)       |
| `CORS_ORIGIN`           | leer           | Kommagetrennte Liste erlaubter Origins. Leer = Request-Origin spiegeln        |

### Frontend (Build-Zeit, Vite)

| Variable        | Standard         | Beschreibung                                                                                                                        |
| --------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_APP_URL`  | leer             | **Öffentliche Basis-URL** – genau diese wird in den QR-Code geschrieben. Leer = Browser-Origin. Beispiel: `https://upload.example.com` |
| `VITE_APP_NAME` | `FastDataUpload` | Anzeigename                                                                                                                         |

### Docker

| Variable   | Standard | Beschreibung                                                     |
| ---------- | -------- | ---------------------------------------------------------------- |
| `WEB_PORT` | `8080`   | Host-Port des Web-Containers (Nginx). NPM leitet hierher weiter. |

> **Wichtig:** `VITE_APP_URL` wird beim **Build** eingebacken. Nach einer Änderung
> muss der Web-Container neu gebaut werden: `docker compose up -d --build web`

## Nginx Proxy Manager einrichten

Voraussetzung: `docker compose up -d --build` läuft und `VITE_APP_URL` zeigt bereits
auf die gewünschte Domain (z. B. `https://upload.example.com`).

### Variante A – eigener Proxy Host (empfohlen)

1. **Hosts → Proxy Hosts → Add Proxy Host**
2. **Details**
   - Domain Names: `upload.example.com`
   - Scheme: `http`
   - Forward Hostname / IP: `web` *(wenn NPM im gleichen Docker-Netzwerk läuft)*
     – oder `host.docker.internal` bzw. Host-IP mit Port `8080`
   - Forward Port: `80`
   - ✔ Block Common Exploits, ✔ Websockets Support
3. **SSL** – Let's Encrypt anfordern, ✔ Force SSL, ✔ HTTP/2
4. **Advanced** (große Uploads sicherstellen):

   ```nginx
   client_max_body_size 0;
   proxy_request_buffering off;
   proxy_read_timeout 600s;
   proxy_send_timeout 600s;
   ```

5. Speichern – `https://upload.example.com/` zeigt jetzt die QR-Code-Seite.

### Variante B – Custom Location in vorhandenem Host

```nginx
location /upload-app/ {
    proxy_pass http://web:80/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> **Subdomain-Konzept:** Der Upload-Link ist **pfadbasiert**
> (`https://upload.example.com/upload/<token>`). Es wird also nur **eine**
> Subdomain pro Instanz benötigt – kein Wildcard-DNS. Die Domain wird zentral
> über `VITE_APP_URL` gesteuert.

> **Netzwerk-Hinweis:** Läuft NPM in einem anderen Compose-Projekt, verbinde das
> `fastdataupload`-Netzwerk mit dem NPM-Netzwerk oder nutze den veröffentlichten
> Host-Port (`http://<host-ip>:8080`). Beides funktioniert.



## API-Referenz

| Methode  | Pfad                         | Beschreibung                                    |
| -------- | ---------------------------- | ----------------------------------------------- |
| `GET`    | `/api/health`                | Health-Check                                    |
| `POST`   | `/api/token`                 | Neuen Token erzeugen                            |
| `GET`    | `/api/token/:token/validate` | Token prüfen (`200`/`403`)                      |
| `DELETE` | `/api/token/:token`          | Token invalidieren (Reload)                     |
| `POST`   | `/api/upload/:token`         | Dateien hochladen, Feldname `files` (multipart) |

Beispiel:

```bash
TOKEN=$(curl -s -X POST https://upload.example.com/api/token | jq -r .token)
curl -X POST "https://upload.example.com/api/upload/$TOKEN" -F "files=@foto.jpg"
```

## Logos

In `frontend/public/`:

| Datei                            | Verwendung                      |
| -------------------------------- | ------------------------------- |
| `logo.svg`                       | Wortmarke + Symbol (horizontal) |
| `logo-mobile.svg`                | Gestapelte Variante für Handys  |
| `logo-icon.svg`                  | Quadratisches Symbol            |
| `logo-icon-{512,256,128,64}.png` | PNG-Exporte (App-Icons, Docs)   |
| `favicon.svg`                    | Favicon (auch im QR-Code-Center)|

Farbschema: Blau `#2563eb` -> Grün `#10b981` (Verlauf), moderner Flat-Stil.
PNGs neu erzeugen: `powershell -File scripts/generate-logos.ps1`

## Sicherheit & Grenzen

- **Token-Isolation:** Jeder Upload-Request wird serverseitig gegen den
  In-Memory-Store geprüft. Abgelaufene/ungültige Tokens liefern `403`.
- **Abgelaufene Tokens** werden jede Minute automatisch entfernt.
- **Nur die SPA ist exponiert:** Nginx liefert ausschließlich die Build-Artefakte
  aus; Directory Listing ist deaktiviert (`autoindex off`).
- **Kein HTTP-Zugriff auf Uploads:** Dateien sind nur über das Volume auf dem Host
  erreichbar, nicht per Web.
- **Limits:** `MAX_FILE_SIZE_MB` (pro Datei) und `MAX_FILES_PER_REQUEST`.
- **In-Memory = ephemer:** Nach einem Container-Neustart sind alle Tokens ungültig
  (für 10-Minuten-Sessions gewünscht). Bereits hochgeladene Dateien bleiben erhalten.
- **Kein Login:** Wer den Token kennt, darf innerhalb der Gültigkeit hochladen -
  beabsichtigt, da die Freigabe per physischer Nähe (QR-Code) erfolgt.

## Lizenz

Interne Nutzung - Nutzung auf eigenes Risiko.

