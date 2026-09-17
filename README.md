# sanitize-me

> **Local-first document, media, and data privacy airlock.**  
> Instantly strip hidden tracking parameters, camera EXIF GPS locations, and confidential credentials before sharing or feeding files to AI models.

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)](package.json)
[![License: All Rights Reserved](https://img.shields.io/badge/license-All_Rights_Reserved-red.svg)](LICENSE)

---

## ⚡ The Market Problem & Why `sanitize-me`

1. **The AI Privacy Leak**: Users and teams constantly paste error traces, config dumps, and server logs into AI platforms (ChatGPT, Claude, Copilot) without noticing embedded auth headers, API tokens (`sk-...`, `ghp_...`), private IP addresses, or customer PII.
2. **Metadata Anxiety**: Casual internet users and creators post photos and PDFs unaware that high-precision GPS coordinates, camera serial numbers, and machine author tags remain embedded.
3. **Web-Tool Distrust**: Most web-based "EXIF removers" or "log scrubbers" upload your personal files to unknown third-party cloud servers.
4. **The `npx` Sweet Spot**: `sanitize-me` runs instantly with zero installation, 100% offline, directly from your terminal or clipboard.

---

## 🚀 Quickstart (Zero Installation)

No installation required. Run directly with `npx`:

### 1. Text, Logs & Clipboard Scrubbing
Pipe any text, log stream, or clipboard content:

```bash
# Scrub logs before sharing or pasting to AI models
cat server.log | npx sanitize-me

# On macOS: Clean clipboard and paste
pbpaste | npx sanitize-me | pbcopy

# On Linux:
xclip -o | npx sanitize-me | xclip -sel clip
```

Replaces sensitive entities with generic placeholders:
- **Emails**: `<EMAIL_REDACTED>`
- **IPs**: `<IP_REDACTED>` / `<IPV6_REDACTED>`
- **API Keys & Tokens**: OpenAI (`sk-...`), GitHub (`ghp_...`), AWS (`AKIA...`), Google, Slack, Stripe
- **JWTs**: `<JWT_REDACTED>`
- **Auth Headers**: `Authorization: Bearer <AUTH_REDACTED>`, `Cookie: <COOKIE_REDACTED>`
- **Credit Cards**: `<CREDIT_CARD_REDACTED>` (validated via Luhn algorithm)
- **Local File Paths**: `C:\Users\<USER>\...`, `/home/<USER>/...`

---

### 2. URL Cleaning & Tracking Removal
Remove tracking parameters (`utm_*`, `fbclid`, `gclid`, `si=`, affiliate tags) and unwrap redirection gateways:

```bash
npx sanitize-me "https://www.amazon.com/dp/B00000?utm_source=tw&tag=affiliate-20&ref_=as_li"
# Output: https://www.amazon.com/dp/B00000

npx sanitize-me "https://youtu.be/dQw4w9WgXcQ?si=abcdef123456&feature=share"
# Output: https://youtu.be/dQw4w9WgXcQ
```

---

### 3. Media & Document Sanitization (Lossless)
Strip metadata from images and documents directly on the binary stream with **zero re-compression or quality degradation**:

```bash
# Sanitize photos (strips GPS coordinates, camera model, serials, maker notes)
npx sanitize-me photo.jpg
# -> Creates photo.clean.jpg (100% original pixel data preserved)

# Sanitize multiple files or PDFs
npx sanitize-me document.pdf profile.png debug.log

# Overwrite in-place
npx sanitize-me -i photo.jpg
```

Supported formats:
- **JPEG**: Losslessly removes APP1 (EXIF / XMP / GPS), APP13 (IPTC), and COM markers.
- **PNG**: Strips ancillary chunks (`eXIf`, `tEXt`, `zTXt`, `iTXt`, `tIME`).
- **WebP**: Strips `EXIF` and `XMP ` RIFF chunks.
- **PDF**: Safely neutralizes `/Info` dictionary (`/Author`, `/Creator`, `/Producer`, `/CreationDate`) and `/Type /Metadata` XML streams while keeping byte offsets intact to avoid cross-reference table corruption.

---

### 4. Non-Developer Offline Web GUI
Run with no arguments to launch an instant local drag-and-drop web UI in your browser:

```bash
npx sanitize-me
```

- Spins up a lightweight server on `127.0.0.1:4488`.
- 100% offline, zero external CDN scripts or trackers.
- Drag-and-drop image/PDF uploader with instant clean file download.
- Interactive text and URL cleaning tabs with copy buttons.

---

## 🛠 CLI Flags & Options

```text
USAGE:
  sanitize-me [options] [targets...]

OPTIONS:
  -o, --output <path>    Custom output destination
  -i, --in-place         Overwrite original file directly
  -d, --dry-run          Inspect metadata/PII without modifying files
  -j, --json             Output machine-readable JSON
      --gui, --ui        Force launch local Web UI
  -h, --help             Display help
  -v, --version          Display version
```

---

## 💻 Programmatic API

You can also import `sanitize-me` directly in your Node.js projects:

```javascript
import {
  sanitizeText,
  sanitizeUrl,
  sanitizeImage,
  sanitizePdf,
  sanitizeFile
} from 'sanitize-me';

// Text & Logs
const cleanLog = sanitizeText('sk-proj-1234567890abcdef1234567890');
console.log(cleanLog.text); // <API_KEY_REDACTED>

// URLs
const cleanLink = sanitizeUrl('https://example.com/?utm_source=twitter&keep=yes');
console.log(cleanLink.cleanUrl); // https://example.com/?keep=yes

// Files & Images
const fileResult = sanitizeFile('./photo.jpg', { outputPath: './clean_photo.jpg' });
console.log(fileResult.stripped); // ['APP1 (EXIF / GPS / XMP)']
```

---

## 🔒 Security & Privacy Guarantee

- **Zero Network Calls**: `sanitize-me` never dials out to any server or cloud API.
- **Zero Dependencies**: Pure Node.js standard library implementation. No npm supply-chain vulnerabilities.
- **Memory Execution**: All binary and text processing happens in local RAM.

---

## 📄 License

Copyright (c) 2026 Liyfez. All Rights Reserved.  
Free to run and use for personal, educational, or internal organizational purposes. Copying, cloning, redistribution, and unauthorized resale of the source code are strictly prohibited. See [LICENSE](LICENSE) for details.
