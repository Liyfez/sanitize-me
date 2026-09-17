import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sanitizeFile } from './index.js';
import { sanitizeText } from './sanitizers/text.js';
import { sanitizeUrl, isLikelyUrl } from './sanitizers/url.js';
import { startServer } from './ui/server.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function printHelp() {
  console.log(`
sanitize-me v${pkg.version}
Local-first document, media, and data privacy airlock.

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

OPTIONS:
  -o, --output <path>    Custom output destination
  -i, --in-place         Overwrite original file directly
  -d, --dry-run          Inspect metadata/PII without modifying files
  -j, --json             Output machine-readable JSON
      --gui, --ui        Force launch local Web UI
  -h, --help             Display this help message
  -v, --version          Display version
`);
}

async function readStdin() {
  return new Promise((res, rej) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => res(data));
    process.stdin.on('error', err => rej(err));
  });
}

export async function runCli(argv = process.argv.slice(2)) {
  const flags = {
    help: argv.includes('-h') || argv.includes('--help'),
    version: argv.includes('-v') || argv.includes('--version'),
    gui: argv.includes('--gui') || argv.includes('--ui'),
    inPlace: argv.includes('-i') || argv.includes('--in-place'),
    dryRun: argv.includes('-d') || argv.includes('--dry-run'),
    json: argv.includes('-j') || argv.includes('--json'),
    output: null
  };

  const outputIdx = argv.findIndex(a => a === '-o' || a === '--output');
  if (outputIdx !== -1 && argv[outputIdx + 1]) {
    flags.output = argv[outputIdx + 1];
  }

  // Filter out flag args to get positional targets
  const targets = argv.filter((arg, idx) => {
    if (arg.startsWith('-')) return false;
    if (idx > 0 && (argv[idx - 1] === '-o' || argv[idx - 1] === '--output')) return false;
    return true;
  });

  if (flags.help) {
    printHelp();
    return;
  }

  if (flags.version) {
    console.log(pkg.version);
    return;
  }

  // 1. Check if input is piped through stdin
  if (!process.stdin.isTTY && targets.length === 0) {
    const stdinContent = await readStdin();
    if (isLikelyUrl(stdinContent)) {
      const urlResult = sanitizeUrl(stdinContent);
      if (flags.json) {
        console.log(JSON.stringify(urlResult, null, 2));
      } else {
        process.stdout.write(urlResult.cleanUrl + '\n');
      }
    } else {
      const textResult = sanitizeText(stdinContent);
      if (flags.json) {
        console.log(JSON.stringify(textResult, null, 2));
      } else {
        process.stdout.write(textResult.text);
      }
    }
    return;
  }

  // 2. Explicit GUI flag or no args provided in terminal -> launch offline Web GUI
  if (flags.gui || targets.length === 0) {
    console.log(`\x1b[32m[sanitize-me]\x1b[0m Starting local-first privacy airlock UI...`);
    const { url } = await startServer({ open: true });
    console.log(`\x1b[36m✔ Web GUI running at:\x1b[0m ${url}`);
    console.log(`\x1b[90m(100% offline, zero cloud connections. Press Ctrl+C to terminate)\x1b[0m\n`);
    return;
  }

  // 3. Process positional targets
  for (const target of targets) {
    // Check if target is a URL
    if (isLikelyUrl(target)) {
      const clean = sanitizeUrl(target);
      if (flags.json) {
        console.log(JSON.stringify(clean, null, 2));
      } else {
        console.log(`\n\x1b[32mClean URL:\x1b[0m ${clean.cleanUrl}`);
        if (clean.removedParams.length > 0) {
          console.log(`\x1b[90mRemoved ${clean.removedParams.length} tracker(s): ${clean.removedParams.join(', ')}\x1b[0m`);
        }
      }
      continue;
    }

    // Process file
    try {
      const resolvedPath = resolve(process.cwd(), target);
      const result = sanitizeFile(resolvedPath, {
        outputPath: flags.output,
        inPlace: flags.inPlace,
        dryRun: flags.dryRun
      });

      if (flags.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\x1b[32m✔ Sanitized [${result.type}]:\x1b[0m ${target}`);
        if (result.outputPath) {
          console.log(`  Output: ${result.outputPath}`);
        }
        if (result.stripped && result.stripped.length > 0) {
          console.log(`  Stripped: ${result.stripped.join(', ')}`);
        }
        if (result.totalRedactions) {
          console.log(`  Redacted: ${result.totalRedactions} sensitive item(s)`);
        }
        if (result.bytesSaved > 0) {
          console.log(`  Space saved: ${(result.bytesSaved / 1024).toFixed(1)} KB`);
        }
      }
    } catch (err) {
      console.error(`\x1b[31m✖ Error processing ${target}:\x1b[0m ${err.message}`);
    }
  }
}

// Auto-run if executed directly as entrypoint
runCli().catch(err => {
  console.error('\x1b[31m[sanitize-me error]\x1b[0m', err.message);
  process.exit(1);
});
