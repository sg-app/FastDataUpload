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
   Express-Server (ein Container, ein Image)
   → /api/*  Token-Store (In-Memory)
   → /*      ausgelieferte React-SPA
                        │
                        ▼
                Docker Volume ./uploads
```

## Features

- **QR-Code-Generierung** – automatisch beim Öffnen der Startseite
- **10 Minuten gültige Tokens** – per `TOKEN_EXPIRY_MINUTES` konfigurierbar
- **Reload-Button** – erzeugt sofort einen neuen Token, der alte wird ungültig
- **Mobile-first Upload-Seite** – Drag & Drop, Mehrfachauswahl, Fortschrittsanzeige,
  Live-Countdown bis zum Ablauf
- **Volume Mount** – alle Dateien landen in `./uploads` auf dem Host
- **Ein Image, ein Container** – API und SPA laufen in einem Prozess auf Port `3001`
- **Runtime-Konfiguration** – `APP_URL`/`APP_NAME` kommen aus der Container-Umgebung
  (kein Rebuild nötig, siehe `GET /api/config`)
- **Nginx Proxy Manager ready** – Subdomain bzw. eigener Proxy Host pro Instanz
- **Nur die App ist erreichbar** – kein Directory Listing, keine anderen Ressourcen
- **Konfigurierbares Upload-Limit** – `MAX_FILE_SIZE_MB` (Standard 50 MB)
- **Automatische Veröffentlichung** – GitHub Actions baut, testet und pusht das Image
  nach GHCR und erstellt Releases (GitVersion + git-cliff)
- **Logos** – SVG-Master plus generierte PNG-Varianten

## Tech-Stack

| Bereich    | Technologie                                                    |
| ---------- | -------------------------------------------------------------- |
| Runtime    | Node.js 26 (`node:26-alpine`, Active LTS ab 28.10.2026)         |
| Backend    | Express 5, TypeScript 7, Multer 2, Helmet 8                     |
| Frontend   | React 19, React Router 7, TypeScript 7, Vite 8, TailwindCSS 4   |
| QR-Code    | `qrcode.react` 4                                                |
| Webserver  | Express liefert API **und** SPA (Single Image); optional Nginx  |
| Container  | Docker, Docker Compose                                          |
| CI/CD      | GitHub Actions, GitVersion, GHCR, git-cliff                     |

> **Versionsstand:** Alle Abhängigkeiten sind auf dem jeweils neuesten stabilen
> Stand (siehe `backend/package.json` / `frontend/package.json`).
> **Wichtig beim Major-Sprung auf TailwindCSS 4:** Das Theme steht nicht mehr in
> `tailwind.config.js`, sondern in `frontend/src/index.css` (`@theme`) und wird
> über das `@tailwindcss/vite`-Plugin in den Build eingebunden.
> **Lokal wird Node.js ≥ 24 benötigt** (`node --version`); in den Containern läuft
> Node 26.

## Verzeichnisstruktur

```
FastDataUpload/
├─ Dockerfile              Ein-Image-Build (SPA + API)  ← veröffentlichtes Image
├─ docker-compose.yml      Ein Container (empfohlen)
├─ docker-compose.split.yml Zwei Container (Backend + Nginx)
├─ GitVersion.yml          Fallback für die Versionierung
├─ backend/                Express + TypeScript API
│  ├─ Dockerfile           Nur-API-Image (Zwei-Container-Variante)
│  └─ src/
│     ├─ config.ts            ENV-Konfiguration
│     ├─ server.ts            Bootstrap + SPA-Auslieferung
│     ├─ routes/              token- und upload-Routen
│     ├─ middleware/          CORS, Token-Auth, Fehlerbehandlung
│     └─ services/            Token-Store, Upload-Helfer
├─ frontend/               React SPA (+ Nginx für die Split-Variante)
│  ├─ src/
│  │  ├─ pages/       QRCodePage, UploadPage, NotFoundPage
│  │  ├─ components/  Logo, QRCodeDisplay, Timer, FileUploader
│  │  ├─ hooks/       useCountdown, useUpload
│  │  └─ lib/         api, env
│  ├─ public/         Logos (SVG + PNG), favicon
│  ├─ nginx.conf      Nur für die Zwei-Container-Variante
│  └─ Dockerfile      Nur-Web-Image (Zwei-Container-Variante)
├─ scripts/                Logo-Generator & Smoke-Test (lokal)
├─ .github/workflows/      CI/CD (Build, Test, Image, Release)
├─ .env.example
└─ .dockerignore
```

## Schnellstart mit Docker

Ein Image enthält Backend **und** Frontend – es läuft also nur ein Container:

```bash
# 1. Konfiguration anlegen
cp .env.example .env
#    -> Werte anpassen (siehe Abschnitt "Umgebungsvariablen"), z. B.
#       APP_URL=https://upload.example.com  (Laufzeit, kein Rebuild nötig)

# 2. Image bauen und starten
docker compose up -d --build

# 3. Aufrufen
#    QR-Code-Seite:  http://localhost:8080/
```

Die hochgeladenen Dateien liegen anschließend auf dem Host in `./uploads`.

Veröffentlichtes Image verwenden (ohne eigenen Build):

```bash
docker compose pull
docker compose up -d
```

Ganz ohne Compose:

```bash
docker run -d --name fastdataupload \
  --restart unless-stopped \
  -p 8080:3001 \
  -v "$PWD/uploads:/app/uploads" \
  -e APP_URL=https://upload.example.com \
  ghcr.io/sg-app/fastdataupload:latest
```

## Veröffentlichung (CI/CD)

`.github/workflows/cicd.yml` läuft bei jedem Push und Pull Request. Auf `main` und
`develop` wird dabei ein Image veröffentlicht und ein Release erzeugt:

| Job          | Aufgabe                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `gitversion` | SemVer aus der Git-Historie (Konfiguration aus `sg-app/Shared`, Fallback: `GitVersion.yml`)      |
| `test`       | `npm ci` + Build von Backend und Frontend + Smoke-Test (Health, Runtime-Config, Token, Upload, SPA) |
| `docker`     | Image bauen, Container-Smoke-Test (inkl. Upload nach `/app/uploads`), Push nach GHCR              |
| `release`    | Changelog via git-cliff, GitHub Release mit Tag `<SemVer>`                                       |

Image-Tags:

| Branch              | Tags                                                              |
| ------------------- | ----------------------------------------------------------------- |
| `main`              | `latest`, `<major>`, `<major>.<minor>`, `<major>.<minor>.<patch>` |
| `develop`           | `pre`, `develop`, `<SemVer>` (mit PreRelease-Tag)                 |
| Feature-Branch / PR | nur Branch-Name als Tag – **kein** Push                           |

Benötigte Repository-Einstellungen:

- **Secret `SHAREDREPOTOKEN`** – lesender Zugriff auf das Repository `sg-app/Shared`
  (zentrale `GitVersion.yml` und `cliff.toml`). Ist das Secret nicht gesetzt, läuft
  die Pipeline trotzdem und verwendet `GitVersion.yml` aus diesem Repository.
- **Laufzeit-Konfiguration `APP_URL` / `APP_NAME`:** Die öffentliche Domain wird
  zur Laufzeit aus der Container-Umgebung gelesen (`GET /api/config`) und im
  Deployment gesetzt (`docker compose up -d`) – die CI muss nichts davon wissen.
- **Optional (Fallback beim Build):** Repository-Variablen `VITE_APP_URL` /
  `VITE_APP_NAME` (Settings → Secrets and variables → Actions → Variables)
  backen die Werte zusätzlich ins Bundle, falls die API nicht erreichbar ist.
  `APP_URL` aus der Container-Umgebung hat immer Vorrang; ohne gesetzten Wert
  verwendet die SPA die Browser-Origin (aktueller Host).
- Für GHCR ist kein weiteres Secret nötig, der Workflow nutzt `secrets.GITHUB_TOKEN`.
  Das Paket erscheint unter `ghcr.io/<owner>/<repo>`; für öffentliches Ziehen muss es
  in den Package-Settings auf *public* gestellt werden.

## Lokale Entwicklung

Voraussetzung: **Node.js ≥ 24** (getestet mit Node 24 und in den Containern mit Node 26).

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
(siehe `frontend/vite.config.ts`). Da lokal kein SPA-Verzeichnis existiert, läuft
das Backend automatisch im API-only-Modus.

### Tests & Builds

```bash
cd backend  && npm run build          # TypeScript-Kompilierung
cd frontend && npm run build          # Produktions-Build
powershell -File scripts/smoke-test.ps1   # API-Smoke-Test (Backend muss gebaut sein)
powershell -File scripts/generate-logos.ps1  # PNG-Logos neu erzeugen
```

Den Produktionsmodus (Backend liefert die SPA aus) lokal wie in der CI testen:

```bash
cd backend
# Windows PowerShell:
$env:SPA_DIR = "../frontend/dist"; $env:UPLOAD_DIR = "../uploads"; npm start
# Bash:
SPA_DIR=../frontend/dist UPLOAD_DIR=../uploads npm start
# -> http://localhost:3001/ liefert die gebaute SPA
```

## Umgebungsvariablen

Alle Werte sind in der `.env` (Kopie von `.env.example`) einstellbar.

### Backend (Laufzeit)

| Variable                | Standard       | Beschreibung                                                                |
| ----------------------- | -------------- | --------------------------------------------------------------------------- |
| `TOKEN_EXPIRY_MINUTES`  | `10`           | Gültigkeit eines Upload-Tokens in Minuten                                   |
| `MAX_FILE_SIZE_MB`      | `50`           | Max. Größe **pro Datei** in MB (hochauflösende Handyfotos: 5–25 MB typisch) |
| `MAX_FILES_PER_REQUEST` | `20`           | Max. Anzahl Dateien pro Upload-Request                                      |
| `UPLOAD_DIR`            | `/app/uploads` | Zielverzeichnis im Container (per Volume Mount auf `./uploads` gelegt)      |
| `SPA_DIR`               | `/app/public`  | Verzeichnis der gebauten SPA. Fehlt es, läuft der Server im API-only-Modus  |
| `CORS_ORIGIN`           | leer           | Kommagetrennte Liste erlaubter Origins. Leer = Request-Origin spiegeln       |
| `PORT`                  | `3001`         | Interner Port des Express-Servers (im Image fest gesetzt)                   |

### Frontend-Runtime-Konfiguration (Container-Umgebung)

| Variable        | Standard         | Beschreibung                                                                                                                          |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_URL`       | leer             | **Öffentliche Basis-URL** – genau diese wird in den QR-Code geschrieben. Leer = Browser-Origin. Beispiel: `https://upload.example.com` |
| `APP_NAME`      | `FastDataUpload` | Anzeigename (UI + Seitentitel)                                                                                                        |

`APP_URL` und `APP_NAME` werden vom Backend aus der Container-Umgebung gelesen und
über `GET /api/config` an die SPA ausgeliefert – **zur Laufzeit**, ein Rebuild ist
also nicht nötig. Optional lassen sich `VITE_APP_URL` / `VITE_APP_NAME` beim Build
einbacken (nur als Fallback, falls die API nicht erreichbar ist).

### Docker

| Variable   | Standard                               | Beschreibung                                                                 |
| ---------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| `IMAGE`    | `ghcr.io/sg-app/fastdataupload:latest` | Image, das Compose verwendet (`IMAGE=fastdataupload:latest` für lokale Builds) |
| `WEB_PORT` | `8080`                                 | Host-Port, der auf den Container-Port `3001` zeigt                           |

> **Hinweis:** `APP_URL` / `APP_NAME` werden zur **Laufzeit** aus der
> Container-Umgebung gelesen (`GET /api/config`) – `.env` anpassen und
> `docker compose up -d` genügt, ein Rebuild ist **nicht** nötig.

## Nginx Proxy Manager einrichten

Voraussetzung: `docker compose up -d` läuft und `VITE_APP_URL` zeigt bereits
auf die gewünschte Domain (z. B. `https://upload.example.com`).

### Variante A – eigener Proxy Host (empfohlen)

1. **Hosts → Proxy Hosts → Add Proxy Host**
2. **Details**
   - Domain Names: `upload.example.com`
   - Scheme: `http`
   - Forward Hostname / IP: `fastdataupload` *(Container-Name, wenn NPM im
     gleichen Docker-Netzwerk läuft)* – oder `host.docker.internal` bzw. Host-IP
   - Forward Port: `3001` *(bei Container-Name)* bzw. `8080` *(bei Host-IP)*
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
    proxy_pass http://fastdataupload:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> **Subdomain-Konzept:** Der Upload-Link ist **pfadbasiert**
> (`https://upload.example.com/upload/<token>`). Es wird also nur **eine**
> Subdomain pro Instanz benötigt – kein Wildcard-DNS. Die Domain wird zentral
> über `VITE_APP_URL` gesteuert.

> **Netzwerk-Hinweis:** Läuft NPM in einem anderen Compose-Projekt, verbinde das
> Netzwerk dieses Projekts mit dem NPM-Netzwerk oder nutze den veröffentlichten
> Host-Port (`http://<host-ip>:8080`). Beides funktioniert.

## Wann ein Image – wann zwei?

Standard ist hier **ein Image**: Express liefert `/api/*` und die gebaute SPA aus,
der Container lauscht auf einem Port (`3001`) und schreibt in ein Volume.

| Kriterium            | Ein Image (Standard)                                        | Zwei Images (`docker-compose.split.yml`)              |
| -------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Deployment           | 1 Container, 1 Port, 1 Volume                               | 2 Container, internes Netz, Nginx davor               |
| CORS / Weiterleitung | entfällt (gleiche Origin)                                   | Nginx proxied `/api` an den Backend-Container         |
| Updates              | 1 Image, 1 Tag                                              | 2 Images, die getrennt gebaut/getaggt werden müssen   |
| Größe / Overhead     | Node-Runtime (~190 MB)                                      | Node-Runtime + Nginx (~49 MB)                         |
| Wartung              | eine Dockerfile, ein Compose-Service                        | zwei Dockerfiles, `nginx.conf` zusätzlich zu pflegen  |
| Sinnvoll wenn        | Frontend und Backend gemeinsam released werden (hier so)    | bestehender Nginx-Aufbau, getrennte Skalierung, CDN   |

Die Zwei-Container-Variante wird lokal aus dem Quellcode gebaut:

```bash
docker compose -f docker-compose.split.yml up -d --build
# Backend: fastdataupload-backend:latest (Port 3001, nur intern)
# Web:     fastdataupload-web:latest     (NPM zeigt auf Port 80 bzw. Host 8080)
```

Dort bleibt `backend/Dockerfile` unverändert einsetzbar (`SPA_DIR` wird nicht
gesetzt → API-only-Modus) und `frontend/nginx.conf` liefert die SPA aus.

## API-Referenz

| Methode  | Pfad                         | Beschreibung                                    |
| -------- | ---------------------------- | ----------------------------------------------- |
| `GET`    | `/api/config`                | Runtime-Konfiguration für die SPA (`appName`, `appUrl`) |
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

| Datei                            | Verwendung                       |
| -------------------------------- | -------------------------------- |
| `logo.svg`                       | Wortmarke + Symbol (horizontal)  |
| `logo-mobile.svg`                | Gestapelte Variante für Handys   |
| `logo-icon.svg`                  | Quadratisches Symbol             |
| `logo-icon-{512,256,128,64}.png` | PNG-Exporte (App-Icons, Docs)    |
| `favicon.svg`                    | Favicon (auch im QR-Code-Center) |

Farbschema: Blau `#2563eb` -> Grün `#10b981` (Verlauf), moderner Flat-Stil.
PNGs neu erzeugen: `powershell -File scripts/generate-logos.ps1`

## Sicherheit & Grenzen

- **Token-Isolation:** Jeder Upload-Request wird serverseitig gegen den
  In-Memory-Store geprüft. Abgelaufene/ungültige Tokens liefern `403`.
- **Abgelaufene Tokens** werden jede Minute automatisch entfernt.
- **Nur die App ist exponiert:** Der Server liefert ausschließlich `/api/*` und die
  Build-Artefakte der SPA aus, ein Directory Listing gibt es nicht. Die Antworten
  enthalten Security-Header und eine explizite Content-Security-Policy
  (siehe `backend/src/server.ts`).
- **Kein HTTP-Zugriff auf Uploads:** Dateien sind nur über das Volume auf dem Host
  erreichbar, nicht per Web.
- **Container läuft als Non-Root** (`node`, uid 1000). Bei einem Bind-Mount muss das
  Host-Verzeichnis für diese uid schreibbar sein:
  `sudo chown -R 1000:1000 ./uploads` (Alternativ `chmod 777 ./uploads`, nicht empfohlen).
- **Limits:** `MAX_FILE_SIZE_MB` (pro Datei) und `MAX_FILES_PER_REQUEST`.
- **In-Memory = ephemer:** Nach einem Container-Neustart sind alle Tokens ungültig
  (für 10-Minuten-Sessions gewünscht). Bereits hochgeladene Dateien bleiben erhalten.
- **Kein Login:** Wer den Token kennt, darf innerhalb der Gültigkeit hochladen -
  beabsichtigt, da die Freigabe per physischer Nähe (QR-Code) erfolgt.

## Lizenz

Interne Nutzung - Nutzung auf eigenes Risiko.




