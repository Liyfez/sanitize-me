<div align="center">

<img src="./assets/sanitize_me_banner.png" alt="SANITIZE-ME Logo Banner" width="700" />

<p>
  <strong>Local-first document, media & data privacy airlock</strong>
</p>

[![Website](https://img.shields.io/badge/Website-liyfez.github.io%2Fsanitize--me-39ff14?style=flat-square&logo=google-chrome&logoColor=black)](https://liyfez.github.io/sanitize-me/)
[![NPM Version](https://img.shields.io/npm/v/sanitize-me.svg?color=39ff14&style=flat-square&logo=npm)](https://www.npmjs.com/package/sanitize-me)
[![NPM Downloads](https://img.shields.io/npm/dm/sanitize-me?color=39ff14&style=flat-square&logo=npm)](https://www.npmjs.com/package/sanitize-me)
[![GitHub Release](https://img.shields.io/github/v/release/Liyfez/sanitize-me?color=39ff14&style=flat-square&logo=github)](https://github.com/Liyfez/sanitize-me/releases)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg?style=flat-square)](#)
[![License: All Rights Reserved](https://img.shields.io/badge/License-All_Rights_Reserved-red.svg?style=flat-square)](LICENSE)

*Instantly strip hidden tracking parameters, camera EXIF GPS locations, confidential credentials, XSS payloads, and NoSQL injection operators before sharing.*

[**Live Web Airlock (No Install Needed)**](https://liyfez.github.io/sanitize-me/) &bull; [**NPM Package**](https://www.npmjs.com/package/sanitize-me) &bull; [**GitHub Repository**](https://github.com/Liyfez/sanitize-me)

</div>

> 🛡️ **No Installation Required**: Run directly in your browser with 100% privacy and zero data collection at [**liyfez.github.io/sanitize-me**](https://liyfez.github.io/sanitize-me/). Files process entirely inside your browser RAM without uploading a single byte to the cloud.

---

## 🔒 Security & Zero Data Collection Guarantee

- **Zero Data Collected**: We never view, log, store, or transmit your files, text, or database queries.
- **Zero Network Uploads**: The in-browser airlock decodes data using client Web APIs (`ArrayBuffer`). Open your browser DevTools Network tab: zero outgoing requests.
- **Zero Supply-Chain Vulnerabilities**: 100% pure Node.js stdlib and browser APIs with **0 npm runtime dependencies**.
- **100% Air-Gapped & Offline Ready**: Disconnect your internet connection—everything functions identically.

---

## ⚔️ Unified Replacement for Fragmented npm Packages

Instead of juggling 5 different single-purpose packages with bloated dependencies, `sanitize-me` is the unified, high-performance standard:

| Task / Threat | Fragmented Ecosystem | `sanitize-me` Standard | Key Benefit |
|---|---|---|---|
| **HTML / Text XSS** | `dompurify` (~13M) + `sanitize-html` (~3M) | `sanitizeHtml()` / `--html` | Recursive reduction loop defeats nested evasion tags; 0 dependencies |
| **NoSQL / DB Queries** | `mongo-sanitize` (~500k) | `sanitizeQuery()` / `--query` | Recursive key stripping for `$gt`, `$ne`, `$where`, and dot-notation |
| **Uploaded Filenames** | `sanitize-filename` (~7.4M) | `sanitizeFilename()` / `--filename` | Strips path traversal (`../`) and Windows device names (`CON`, `PRN`) |
| **Photos & Documents** | `exiftool` / Untrusted cloud upload sites | Direct Binary Stripping | 100% pixel fidelity; zero re-encoding loss; PDF xref table safe |
| **Server Logs & PII** | Bespoke regex scripts | Stream Pipeline Scrubber | Scans OpenAI, AWS, GitHub, Stripe keys + Luhn credit card check |
| **Execution Flexibility**| Terminal installation required | **CLI, NPX, or 100% In-Browser** | Zero install needed — run directly at [liyfez.github.io/sanitize-me](https://liyfez.github.io/sanitize-me/) |

---

## Instant Execution

Run directly from any terminal or workflow via `npx`:

```bash
# 1. Don't know the file path? Open native File Explorer / Finder to pick a file
npx sanitize-me --pick

# 2. Clean an image losslessly (strips GPS, camera serial, maker notes)
npx sanitize-me photo.jpg

# 3. Clean and unwrap a tracking link
npx sanitize-me "https://amazon.com/dp/B00000?utm_source=twitter&tag=affiliate-20"

# 4. Redact logs, auth headers, and API keys before sharing or sending
cat debug.log | npx sanitize-me

# 5. Neutralize XSS and sanitize HTML markup
npx sanitize-me --html "<script>alert(1)</script><b>Clean</b>"

# 6. Sanitize NoSQL / MongoDB queries against operator injection
npx sanitize-me --query '{"username":"admin","$gt":""}'

# 7. Sanitize filenames and strip directory traversal
npx sanitize-me --filename "../../bad:name?.txt"

# 8. Show detailed command guide and cheatsheet
npx sanitize-me /help

# 9. Launch interactive terminal menu (or browser GUI with --gui)
npx sanitize-me
```

Or install globally:

```bash
npm install -g sanitize-me
```

---

## Releases & Packages

`sanitize-me` is available through multiple distribution channels:

| Channel | Install / Download Command | Notes |
| :--- | :--- | :--- |
| **NPX** | `npx sanitize-me [targets...]` | [Instant execution on npm](https://www.npmjs.com/package/sanitize-me), zero local footprint |
| **NPM Global** | [`npm install -g sanitize-me`](https://www.npmjs.com/package/sanitize-me) | Global CLI binary published on npmjs.com |
| **GitHub Packages** | `npm install @liyfez/sanitize-me` | Distributed via GitHub Packages registry |
| **GitHub Releases** | [**Download v1.0.5 Assets (`.tgz`)**](https://github.com/Liyfez/sanitize-me/releases/tag/v1.0.5) | Pre-packaged tarballs with signed release checksums |

---

## 📖 Step-by-Step Task Guides

### 📸 Task 1: Clean Photos Before Posting Online (GPS & EXIF)
**Scenario**: Photos taken on smartphones or DSLR cameras contain hidden embedded GPS coordinates (your home/work address), camera serial numbers, and device maker notes.

1. **Run the command** (or don't know the file path? Run `npx sanitize-me --pick`):
   ```bash
   npx sanitize-me photo.jpg
   ```
2. **What happens**: The engine parses the raw binary stream and strips `APP1` / `EXIF` segments losslessly without touching pixel data (0% JPEG re-encoding loss).
3. **Result**: Creates `clean_photo.jpg` in the same directory, 100% safe to upload to Reddit, Discord, forums, or bug trackers.
   - *Tip*: Use `-i` to overwrite in-place: `npx sanitize-me -i photo.jpg`.

---

### 📄 Task 2: Anonymize PDF Resumes, Contracts & Legal Docs
**Scenario**: PDFs store internal author usernames, generator software (`/Creator (Adobe InDesign)`), company names, and revision history.

1. **Run the command**:
   ```bash
   npx sanitize-me contract.pdf
   ```
2. **What happens**: Blanks out `/Author`, `/Creator`, `/Producer`, and `/Metadata` XMP streams with space-padding.
3. **Result**: Byte offsets remain exactly identical, guaranteeing that cross-reference (`xref`) tables and document pages never corrupt.

---

### 🔑 Task 3: Redact Server Logs & Clipboard Before Sharing
**Scenario**: You need to paste terminal traces or error logs into a public GitHub issue, Discord support channel, or client ticket without leaking OpenAI keys, AWS tokens, or user emails.

1. **Pipe your log file or clipboard**:
   ```bash
   # From a log file:
   cat server.log | npx sanitize-me > clean_server.log

   # Directly from system clipboard (macOS):
   pbpaste | npx sanitize-me | pbcopy
   ```
2. **What happens**: Detects and redacts OpenAI (`sk-...`), GitHub (`ghp_...`), AWS (`AKIA...`), Stripe (`sk_...`), JWTs, IPs, and Luhn-validated credit card numbers.
3. **Result**: All secrets are replaced with `<API_KEY_REDACTED>`, `<IP_REDACTED>`, etc., while preserving JSON/stack trace formatting.

---

### 🔗 Task 4: Clean Tracking Links & Strip Surveillance Queries
**Scenario**: URLs copied from Amazon, Twitter/X, YouTube, TikTok, or newsletters contain surveillance parameters and affiliate tags (`utm_*`, `fbclid`, `si=`, `gclid`).

1. **Run with the URL**:
   ```bash
   npx sanitize-me "https://amazon.com/dp/B00000?utm_source=tw&tag=affiliate-20&ref_=as_li"
   ```
2. **What happens**: Unwraps Google and Facebook redirect gateways, removes 40+ tracking parameters, and rebuilds the clean URL.
3. **Result**: Outputs clean canonical URL: `https://amazon.com/dp/B00000`.

---

### 🛡️ Task 5: Prevent XSS in HTML Content (DOMPurify Alternative)
**Scenario**: You accept user-submitted HTML in a web app, comment system, or CMS, and need bulletproof XSS defense without heavy external dependencies.

1. **Run via CLI or import into Node.js**:
   ```bash
   npx sanitize-me --html "<script>alert(1)</script><b>Clean content</b>"
   ```
   ```javascript
   import { sanitizeHtml } from 'sanitize-me';

   const cleanHtml = sanitizeHtml(userInputHtml);
   // Strips scripts, on* handlers, and javascript: protocols
   ```
2. **What happens**: Multi-pass reduction loop destroys nested script evasion vectors (`<scr<script>ipt>`), removes inline event handlers (`onload`, `onerror`), and blocks dangerous pseudo-protocols (`javascript:`, `data:text/html`).
3. **Result**: Safe, clean HTML markup ready to render. Use `--text-only` to strip all tags if plain text is needed.

---

### 🗄️ Task 6: Secure Backend Against NoSQL Query Injection (mongo-sanitize Alternative)
**Scenario**: Attackers bypass authentication by passing objects like `{"password": {"$gt": ""}}` or injecting `$where` clauses into MongoDB queries.

1. **Run via CLI or use in Express middleware**:
   ```bash
   npx sanitize-me --query '{"username": "admin", "password": {"$gt": ""}}'
   ```
   ```javascript
   import { sanitizeQuery } from 'sanitize-me';

   app.use((req, res, next) => {
     req.body = sanitizeQuery(req.body);
     req.query = sanitizeQuery(req.query);
     next();
   });
   ```
2. **What happens**: Deep recursive object walker removes any key starting with `$` or containing dot notation (`user.name`).
3. **Result**: Query is neutralized: `{"username": "admin", "password": {}}`.

---

### 📁 Task 7: Clean Uploaded Filenames & Block Directory Traversal
**Scenario**: Attackers upload files with names like `../../../../etc/passwd` or Windows reserved names like `CON.txt` to trigger server-side traversal or filesystem locks.

1. **Run via CLI or import in your file upload handler**:
   ```bash
   npx sanitize-me --filename "../../../etc/evil:name?.png"
   ```
   ```javascript
   import { sanitizeFilename } from 'sanitize-me';

   const safeFileName = sanitizeFilename(file.originalname);
   // Output: 'etc_evil_name.png'
   ```
2. **What happens**: Strips relative navigation (`../`), illegal characters (`/?<>\\:*|"`), control codes, and prepends underscores to Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).
3. **Result**: Safe, sanitized filename truncated safely to 255 UTF-8 bytes.

---

### 🌐 Task 8: Non-Terminal Browser Airlock (Zero-Install Drag & Drop)
**Scenario**: Team members, clients, or non-developers want to clean files and secrets without touching the terminal.

1. **Open the airlock**:
   - Online: Go to [https://liyfez.github.io/sanitize-me/](https://liyfez.github.io/sanitize-me/)
   - Local: Run `npx sanitize-me --gui` (runs local server on `http://127.0.0.1:4488`)
2. **What happens**: Drag and drop your image, PDF, or paste text/queries.
3. **Result**: All processing runs in browser memory via Web APIs with zero network uploads. Instant download button for clean files.

---

## Core Sanitization Engines

### 1. Image & Media Mode (Lossless Binary Stripper)
Operates directly on binary byte streams without re-compressing or degrading pixel data (0% quality loss):
- **JPEG**: Strips `APP1` (EXIF, GPS, XMP, MakerNotes), `APP13` (Photoshop IPTC), and `COM` comments while keeping JFIF headers, color profiles, and DCT entropy data intact.
- **PNG**: Strips ancillary chunks (`eXIf`, `tEXt`, `zTXt`, `iTXt`, `tIME`, `dSIG`) without altering image pixels.
- **WebP**: Parses RIFF containers and removes `EXIF` and `XMP ` chunks while updating header bitflags.

```bash
# Clean individual photo (creates photo.clean.jpg)
sanitize-me photo.jpg

# Batch sanitize images and documents into a custom directory
sanitize-me raw1.png raw2.jpg doc.pdf -o ./airlock_clean/

# Overwrite in-place
sanitize-me -i profile.jpg
```

---

### 2. Text, Log & Clipboard Mode (Credentials, Secrets & PII)
Scans for regex patterns of sensitive tokens, secrets, and PII, replacing them with generic tags:
- **API Keys & Tokens**: OpenAI (`sk-...`), GitHub (`ghp_...`), AWS (`AKIA...`), Google (`AIza...`), Slack (`xox...`), Stripe (`sk_...`)
- **JWTs**: Decoupled JSON Web Tokens (`eyJ...`) -> `<JWT_REDACTED>`
- **Auth Headers**: `Authorization: Bearer <AUTH_REDACTED>`, `Cookie: <COOKIE_REDACTED>`
- **Credit Cards**: Validated via **Luhn algorithm** to prevent false positives -> `<CREDIT_CARD_REDACTED>`
- **Network Entities**: IPv4, IPv6, and personal emails -> `<IP_REDACTED>`, `<EMAIL_REDACTED>`
- **System Usernames**: Sanitizes file paths (e.g., `C:\Users\alice\...` -> `C:\Users\<USER>\...`)

```bash
# Pipe server traces or env dumps
cat app.log | sanitize-me

# macOS: Sanitize clipboard before pasting into public chats or tickets
pbpaste | sanitize-me | pbcopy

# Linux:
xclip -o | sanitize-me | xclip -sel clip
```

---

### 3. Clean URL Mode
Unwraps search redirect wrappers (Google `/url?q=...`, Facebook `l.php?u=...`) and strips over 30 marketing/affiliate tracking parameters:

```bash
sanitize-me "https://www.amazon.com/dp/B00000?utm_source=tw&tag=affiliate-20&ref_=as_li"
# Output: https://www.amazon.com/dp/B00000

sanitize-me "https://youtu.be/dQw4w9WgXcQ?si=tracking123&feature=share"
# Output: https://youtu.be/dQw4w9WgXcQ
```

---

### 4. PDF Metadata Neutralizer
Safely blanks `/Info` dictionary entries (`/Author`, `/Creator`, `/Producer`, `/CreationDate`, `/ModDate`) and `/Metadata` XMP streams while **strictly preserving byte offsets** to guarantee PDF cross-reference (`xref`) tables never corrupt.

---

### 5. HTML & XSS Neutralizer (DOMPurify & sanitize-html Alternative)
Zero-dependency server-side and browser HTML sanitizer. Defeats nested injection attempts, unclosed script evasion vectors, inline event handlers, and dangerous pseudoprotocols (`javascript:`, `vbscript:`, `data:text/html`).

```bash
# Neutralize XSS from CLI
sanitize-me --html "<script>alert(1)</script><b>Clean</b>"
# Output: <b>Clean</b>

# Pipe HTML files through the airlock
cat page.html | sanitize-me --html > clean.html

# Text-only mode: strip all markup
sanitize-me --html "<p>Keep text</p>" --text-only
# Output: Keep text
```

---

### 6. Database & NoSQL Query Shield (mongo-sanitize Alternative)
Deep recursive sanitization of database query objects and JSON payloads. Strips MongoDB operator keys (`$gt`, `$ne`, `$where`, `$regex`) and dot-notation property traversal (`user.name`) to prevent authentication bypass and query injection:

```bash
# Sanitize JSON query payload
sanitize-me --query '{"username": "admin", "password": {"$gt": ""}}'
# Output: {"username": "admin", "password": {}}
```

---

### 7. Cross-Platform Filename Sanitizer (sanitize-filename Alternative)
Sanitizes file upload names against directory traversal escapes (`../../`), illegal filesystem characters (`/?<>\\:*|"`), control characters, trailing spaces/dots, and Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`). Truncates safely to UTF-8 boundary 255 bytes.

```bash
sanitize-me --filename "../../../etc/bad:name?.png"
# Output: etcbadname.png

sanitize-me --filename "CON.tar.gz"
# Output: _CON.tar.gz
```

---

### 8. Local Offline Web GUI Mode
Running `sanitize-me` with no arguments opens a local web airlock in your default browser:

```bash
sanitize-me
# or: sanitize-me --gui
```

- Runs on `http://127.0.0.1:4488`.
- 100% offline, zero CDN calls, zero external telemetries.
- Drag-and-drop interface for images, PDFs, logs, URLs, HTML/XSS, and NoSQL queries with live tactile sound feedback.

---

## Terminal Preview

```text
COMMAND GUIDE (/help)

1. FILE CLEANING (Images, PDFs, Logs)
   npx sanitize-me --pick             Open native File Explorer dialog to pick a file
   npx sanitize-me photo.jpg          Strips EXIF, GPS, camera serial, maker notes
   npx sanitize-me doc.pdf            Blanks PDF /Author, /Creator, /Producer metadata
   npx sanitize-me file.png -i        Overwrite file in-place
   npx sanitize-me f1.jpg f2.pdf -o ./out Save sanitized files to custom folder

2. TEXT & LOG SANITIZING (Secrets & PII)
   cat server.log | npx sanitize-me   Redact API keys, tokens, IPs, emails from piped stream
   pbpaste | npx sanitize-me | pbcopy Sanitize clipboard before pasting into tickets or chats

3. URL TRACKER STRIPPING
   npx sanitize-me "https://amazon.com/dp/B000?utm_source=tw&tag=aff-20"
   Strips UTM parameters, affiliate tags, Facebook clids, YouTube session IDs.

4. HTML / XSS, NOSQL & FILENAME SANITIZING
   npx sanitize-me --html "<script>alert(1)</script><b>Safe</b>"
   cat page.html | npx sanitize-me --html
   npx sanitize-me --query '{"user":"admin","$gt":""}'
   npx sanitize-me --filename "../../bad:name?.txt"

5. INTERACTIVE & WEB MODES
   npx sanitize-me                    Launch interactive terminal menu
   npx sanitize-me --gui              Open local drag-and-drop web UI in browser

OPTIONS & FLAGS
   -p, --pick             Open file explorer to browse and choose a file
   -o, --output <dir>     Specify output directory for sanitized files
   -i, --in-place         Overwrite original file directly
   -d, --dry-run          Analyze metadata/PII without writing files
   -j, --json             Output machine-readable JSON format
   -x, --html             Sanitize HTML content and neutralize XSS
       --query, --nosql   Sanitize NoSQL injection keys ($gt, $ne, $where)
   -fn, --filename        Sanitize filename and strip path traversal
       --gui, --ui        Force launch localhost Web GUI
   -h, --help, /help      Show this guide
   -v, --version          Show version
```

---

## Programmatic Node.js API

```javascript
import {
  sanitizeText,
  sanitizeUrl,
  sanitizeImage,
  sanitizePdf,
  sanitizeFile,
  sanitizeFilename,
  sanitizeHtml,
  sanitizeQuery
} from 'sanitize-me';

// 1. Scrub Text / Logs
const { text, stats } = sanitizeText('Secret token: sk-proj-1234567890abcdef1234567890');
console.log(text); // 'Secret token: <API_KEY_REDACTED>'

// 2. Clean URLs
const { cleanUrl, removedParams } = sanitizeUrl('https://example.com/?utm_source=mail&ref=123');
console.log(cleanUrl); // 'https://example.com/'

// 3. Lossless Image EXIF Stripping
const { buffer, stripped, bytesSaved } = sanitizeImage(rawJpegBuffer);
console.log(stripped); // ['APP1 (EXIF / GPS / XMP)']

// 4. Sanitize Filenames (sanitize-filename replacement)
const safeName = sanitizeFilename('../../bad:name?.png');
console.log(safeName); // 'badname.png'

// 5. Sanitize HTML / Neutralize XSS (DOMPurify replacement)
const cleanHtml = sanitizeHtml('<script>alert("xss")</script><b>Hello</b>');
console.log(cleanHtml); // '<b>Hello</b>'

// 6. Sanitize NoSQL Queries (mongo-sanitize replacement)
const cleanQuery = sanitizeQuery({ username: 'admin', password: { $gt: '' } });
console.log(cleanQuery); // { username: 'admin', password: {} }
```

---

## CI/CD & Pipeline Airlock (Automated Sanitization)

When sharing diagnostic traces, submitting bug tickets, or publishing build artifacts, raw output often leaks internal credentials or local user paths. `sanitize-me` functions as an automated privacy airlock in your CI/CD and deployment pipelines:

```bash
# GitHub Actions / CI log sanitization step
cat build.log | npx sanitize-me > build.sanitized.log

# Pipe directly into clean output file for public tickets
cat error.log | npx sanitize-me > clean-error.log
```

```javascript
// Pre-sharing log interceptor
import { sanitizeText } from 'sanitize-me';

export function sanitizeDiagnosticLogs(rawOutput) {
  const { text } = sanitizeText(rawOutput);
  return text; // Safe for external sharing or ticket attachments
}
```

---

## Frequently Asked Questions (FAQ)

### Does `sanitize-me` re-encode or compress photos?
**No.** `sanitize-me` uses byte-level stream parsing to remove `APP1` / `eXIf` segments directly. Pixel data (DCT coefficients in JPEG, IDAT chunks in PNG) is 100% untouched with zero generational loss.

### Can it be used in air-gapped environments?
**Yes.** `sanitize-me` has 0 npm runtime dependencies and requires no internet connection. All processing is strictly in-memory.

### How does PDF metadata removal avoid corrupting the file?
PDF files rely on byte-offset cross-reference tables (`xref`). Rather than deleting metadata tags, `sanitize-me` blanks `/Info` and `/Metadata` values with space padding, keeping byte positions unchanged.

---

## Privacy & Architecture Guarantees

- **Zero Cloud Uploads**: Works completely offline on air-gapped machines.
- **Zero Runtime Dependencies**: Built entirely with native Node.js primitives (`Buffer`, `node:http`, `node:crypto`, `node:fs`). Zero third-party supply chain risk.
- **In-Memory Operation**: No temporary files or staging caches are written to disk.

---

## License

Copyright (c) 2026 Liyfez. All Rights Reserved.  
Free for personal, educational, and internal organizational execution. Unauthorized source reproduction, redistribution, public mirroring, or commercial re-branding is strictly prohibited. See [LICENSE](LICENSE) for terms.
