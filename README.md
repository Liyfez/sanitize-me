<div align="center">

<img src="./assets/sanitize_me_banner.png" alt="SANITIZE-ME Logo Banner" width="720" />

<p>
  <strong>⚡ Local-First Document, Media & Data Privacy Airlock</strong>
</p>

[![Website](https://img.shields.io/badge/Website-liyfez.github.io%2Fsanitize--me-39ff14?style=flat-square&logo=google-chrome&logoColor=black)](https://liyfez.github.io/sanitize-me/)
[![GitHub Release](https://img.shields.io/github/v/release/Liyfez/sanitize-me?color=39ff14&style=flat-square&logo=github)](https://github.com/Liyfez/sanitize-me/releases)
[![npm version](https://img.shields.io/npm/v/sanitize-me.svg?color=39ff14&style=flat-square&logo=npm)](https://www.npmjs.com/package/sanitize-me)
[![GitHub Packages](https://img.shields.io/badge/packages-GitHub_Registry-1a243b?style=flat-square&logo=github)](https://github.com/Liyfez/sanitize-me/pkgs/npm/sanitize-me)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg?style=flat-square)](#)
[![License: All Rights Reserved](https://img.shields.io/badge/License-All_Rights_Reserved-red.svg?style=flat-square)](LICENSE)

*Instantly strip hidden tracking parameters, camera EXIF GPS locations, and confidential credentials before sharing or feeding files to AI models.*

🌐 **[Live Website & In-Browser Airlock Demo](https://liyfez.github.io/sanitize-me/)**

</div>

---

## ⚡ Instant Execution (No Install Required)

Run directly from any terminal or workflow via `npx`:

```bash
# Clean an image losslessly (strips GPS, camera serial, maker notes)
npx sanitize-me photo.jpg

# Clean and unwrap a tracking link
npx sanitize-me "https://amazon.com/dp/B00000?utm_source=twitter&tag=affiliate-20"

# Redact logs, auth headers, and API keys before feeding to ChatGPT / Claude
cat debug.log | npx sanitize-me

# Launch local drag-and-drop Web GUI (100% offline localhost)
npx sanitize-me
```

Or install globally:

```bash
npm install -g sanitize-me
```

---

## 📦 Releases & Packages

`sanitize-me` is available through multiple distribution channels:

| Channel | Install / Download Command | Notes |
| :--- | :--- | :--- |
| **NPX (Zero Install)** | `npx sanitize-me [targets...]` | Direct ephemeral execution, no global footprint |
| **NPM Global** | `npm install -g sanitize-me` | Global CLI binary available as `sanitize-me` |
| **GitHub Packages** | `npm install @liyfez/sanitize-me` | Distributed via GitHub Packages registry |
| **GitHub Releases** | [**Download Assets (`.tgz`)**](https://github.com/Liyfez/sanitize-me/releases) | Pre-packaged tarballs with signed release checksums |

---

## 🛡️ Core Sanitization Engines

### 1. 📷 Image & Media Mode (Lossless Binary Stripper)
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

### 2. 📝 Text, Log & Clipboard Mode (AI Privacy Pre-Flight)
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

# macOS: Sanitize clipboard before pasting into ChatGPT
pbpaste | sanitize-me | pbcopy

# Linux:
xclip -o | sanitize-me | xclip -sel clip
```

---

### 3. 🔗 Clean URL Mode
Unwraps search redirect wrappers (Google `/url?q=...`, Facebook `l.php?u=...`) and strips over 30 marketing/affiliate tracking parameters:

```bash
sanitize-me "https://www.amazon.com/dp/B00000?utm_source=tw&tag=affiliate-20&ref_=as_li"
# Output: https://www.amazon.com/dp/B00000

sanitize-me "https://youtu.be/dQw4w9WgXcQ?si=tracking123&feature=share"
# Output: https://youtu.be/dQw4w9WgXcQ
```

---

### 4. 📄 PDF Metadata Neutralizer
Safely blanks `/Info` dictionary entries (`/Author`, `/Creator`, `/Producer`, `/CreationDate`, `/ModDate`) and `/Metadata` XMP streams while **strictly preserving byte offsets** to guarantee PDF cross-reference (`xref`) tables never corrupt.

---

### 5. 🖥️ Non-Dev Local Web GUI Mode
Running `sanitize-me` with no arguments opens an instant local web airlock in your default browser:

```bash
sanitize-me
# or: sanitize-me --gui
```

- Runs on `http://127.0.0.1:4488`.
- 100% offline, zero CDN calls, zero external telemetries.
- Drag-and-drop interface for images, PDFs, logs, and URLs with live diff indicators.

---

## 🖥️ Terminal Preview

```text
  ███████╗ █████╗ ███╗   ██╗██╗████████╗██╗███████╗███████╗    ███╗   ███╗███████╗
  ██╔════╝██╔══██╗████╗  ██║██║╚══██╔══╝██║╚══███╔╝██╔════╝    ████╗ ████║██╔════╝
  ███████╗███████║██╔██╗ ██║██║   ██║   ██║  ███╔╝ █████╗      ██╔████╔██║█████╗  
  ╚════██║██╔══██║██║╚██╗██║██║   ██║   ██║ ███╔╝  ██╔══╝      ██║╚██╔╝██║██╔══╝  
  ███████║██║  ██║██║ ╚████║██║   ██║   ██║███████╗███████╗██╗ ██║ ╚═╝ ██║███████╗
  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝╚══════╝╚══════╝╚═╝ ╚═╝     ╚═╝╚══════╝
  ⚡ Local-First Document, Media & Data Privacy Airlock v1.0.0

USAGE:
  # Stdin pipe (Logs & clipboard data)
  cat logs.txt | npx sanitize-me
  pbpaste | npx sanitize-me

  # Clean URLs (strip tracking params, UTM, and redirect wrappers)
  npx sanitize-me "https://amazon.com/dp/1234?utm_source=fb&tag=affiliate"

  # Sanitize files (strip EXIF, GPS, camera metadata, PDF author, PII)
  npx sanitize-me photo.jpg
  npx sanitize-me doc.pdf log.txt -o ./clean/

  # Launch local offline web GUI (drag-and-drop UI)
  npx sanitize-me
  npx sanitize-me --gui
```

---

## 💻 Programmatic Node.js API

```javascript
import {
  sanitizeText,
  sanitizeUrl,
  sanitizeImage,
  sanitizePdf,
  sanitizeFile
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
```

---

## 🔒 Privacy & Architecture Guarantees

- **Zero Cloud Uploads**: Works completely offline on air-gapped machines.
- **Zero Runtime Dependencies**: Built entirely with native Node.js primitives (`Buffer`, `node:http`, `node:crypto`, `node:fs`). Zero third-party supply chain risk.
- **In-Memory Operation**: No temporary files or staging caches are written to disk.

---

## 📄 License

Copyright (c) 2026 Liyfez. All Rights Reserved.  
Free for personal, educational, and internal organizational execution. Unauthorized source reproduction, redistribution, public mirroring, or commercial re-branding is strictly prohibited. See [LICENSE](LICENSE) for terms.
