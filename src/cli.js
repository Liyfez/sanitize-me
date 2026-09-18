import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { sanitizeFile, sanitizeFilename, sanitizeHtml, sanitizeQuery } from './index.js';
import { sanitizeText } from './sanitizers/text.js';
import { sanitizeUrl, isLikelyUrl } from './sanitizers/url.js';
import { startServer } from './ui/server.js';
import { openFilePicker } from './utils/picker.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const LIME = '\x1b[38;2;57;255;20m';
const DIM = '\x1b[90m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

const BANNER = `${LIME}
  ███████╗ █████╗ ███╗   ██╗██╗████████╗██╗███████╗███████╗       ███╗   ███╗███████╗
  ██╔════╝██╔══██╗████╗  ██║██║╚══██╔══╝██║╚══███╔╝██╔════╝       ████╗ ████║██╔════╝
  ███████╗███████║██╔██╗ ██║██║   ██║   ██║  ███╔╝ █████╗  █████╗ ██╔████╔██║█████╗  
  ╚════██║██╔══██║██║╚██╗██║██║   ██║   ██║ ███╔╝  ██╔══╝  ╚════╝ ██║╚██╔╝██║██╔══╝  
  ███████║██║  ██║██║ ╚████║██║   ██║   ██║███████╗███████╗       ██║ ╚═╝ ██║███████╗
  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝╚══════╝╚══════╝       ╚═╝     ╚═╝╚══════╝
${RESET}  ${LIME}Local-First Document, Media & Data Privacy Airlock${RESET} ${DIM}v${pkg.version}${RESET}\n`;

function printHelp() {
  console.log(BANNER);
  console.log(`
${BOLD}COMMAND GUIDE & CHEATSHEET (/help, -help)${RESET}

${LIME}${BOLD}QUICK START — 3 EASIEST WAYS TO USE:${RESET}
  1. ${CYAN}npx sanitize-me${RESET}              Open interactive menu (press Enter to choose)
  2. ${CYAN}npx sanitize-me --pick${RESET}       Open native File Explorer / Finder to choose any file
  3. ${CYAN}npx sanitize-me <file>${RESET}       Directly clean any photo, document, or log file

─────────────────────────────────────────────────────────────────────────────
${BOLD}WHAT DO YOU WANT TO CLEAN? (BY TASK)${RESET}

  📸 ${BOLD}1. PHOTOS & IMAGES (Lossless EXIF Stripper)${RESET}
     ${CYAN}npx sanitize-me photo.jpg${RESET}          Creates clean_photo.jpg (0% compression loss)
     ${CYAN}npx sanitize-me -i image.png${RESET}       Overwrite original file in-place
     ${CYAN}npx sanitize-me *.webp -o ./clean${RESET}   Batch clean into specific folder
     ${DIM}Strips: GPS coordinates, camera serial, maker notes, timestamps, Photoshop IPTC.${RESET}

  📄 ${BOLD}2. PDF DOCUMENTS (Safe Metadata Blanking)${RESET}
     ${CYAN}npx sanitize-me contract.pdf${RESET}       Blanks /Author, /Creator, /Producer, /XMP
     ${DIM}Keeps byte offsets identical so PDF pages and tables never corrupt.${RESET}

  🔑 ${BOLD}3. LOGS, SECRETS & TEXT (PII & Token Scrubber)${RESET}
     ${CYAN}cat app.log | npx sanitize-me${RESET}      Redact API keys, tokens, IPs, emails from stream
     ${CYAN}pbpaste | npx sanitize-me | pbcopy${RESET}  Scrub clipboard before pasting into tickets or chats
     ${DIM}Redacts: OpenAI (sk-...), GitHub (ghp_...), AWS, Stripe, JWTs, IPs, Luhn credit cards.${RESET}

  🔗 ${BOLD}4. URLS & TRACKING LINKS${RESET}
     ${CYAN}npx sanitize-me "https://amazon.com/dp/B000?utm_source=tw&tag=aff-20"${RESET}
     ${DIM}Strips 40+ tracking parameters (utm_*, fbclid, gclid, si, aff_*) and unwraps redirects.${RESET}

  🛡️  ${BOLD}5. HTML & XSS NEUTRALIZATION (DOMPurify Alternative)${RESET}
     ${CYAN}npx sanitize-me --html "<script>alert(1)</script><b>Safe</b>"${RESET}
     ${CYAN}cat page.html | npx sanitize-me --html > clean.html${RESET}
     ${CYAN}npx sanitize-me --html "<p>Text</p>" --text-only${RESET}
     ${DIM}Destroys nested evasion tags (<scr<script>ipt>), inline on* handlers, and javascript: URIs.${RESET}

  🗄️  ${BOLD}6. DATABASE & NOSQL QUERIES (mongo-sanitize Alternative)${RESET}
     ${CYAN}npx sanitize-me --query '{"user":"admin","$gt":""}'${RESET}
     ${DIM}Recursively strips MongoDB operator keys ($gt, $ne, $where) and dot-notation paths.${RESET}

  📁 ${BOLD}7. FILENAMES (sanitize-filename Alternative)${RESET}
     ${CYAN}npx sanitize-me --filename "../../bad:name?.txt"${RESET}
     ${DIM}Strips path traversal (../), illegal characters, control codes, and Windows reserved names (CON, PRN).${RESET}

  🌐 ${BOLD}8. OFFLINE WEB DASHBOARD${RESET}
     ${CYAN}npx sanitize-me --gui${RESET}              Launch browser drag-and-drop airlock (100% offline)

─────────────────────────────────────────────────────────────────────────────
${BOLD}OPTIONS & FLAGS REFERENCE${RESET}

  ${GREEN}-p,  --pick, -pick${RESET}             Open native file explorer dialog to browse files
  ${GREEN}-o,  --output <dir>${RESET}             Specify destination folder for sanitized files
  ${GREEN}-i,  --in-place${RESET}                 Overwrite original file directly
  ${GREEN}-d,  --dry-run${RESET}                  Analyze and preview stripped tags without writing
  ${GREEN}-j,  --json${RESET}                     Output machine-readable JSON format
  ${GREEN}-x,  --html, -html [markup]${RESET}    Sanitize HTML string or stream and neutralize XSS
  ${GREEN}     --text-only${RESET}                Used with --html to strip all HTML tags
  ${GREEN}     --query, --nosql [json]${RESET}    Sanitize NoSQL / JSON query from operator injection
  ${GREEN}-fn, --filename, -filename [n]${RESET} Sanitize a filename and strip path traversal
  ${GREEN}     --gui, --ui, -gui${RESET}          Force launch local Web GUI on http://127.0.0.1:4488
  ${GREEN}-h,  --help, -help, /help${RESET}       Show this comprehensive guide
  ${GREEN}-v,  --version, -version${RESET}        Show package version
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

async function processSingleFile(filePath, flags) {
  try {
    const resolvedPath = resolve(process.cwd(), filePath);
    if (!existsSync(resolvedPath)) {
      console.error(`\n\x1b[31m✖ File not found:\x1b[0m ${filePath}`);
      console.error(`  ${DIM}Tip: Run ${CYAN}npx sanitize-me --pick${DIM} to select your file visually using the file explorer.${RESET}\n`);
      return;
    }

    const result = sanitizeFile(resolvedPath, {
      outputPath: flags.output,
      inPlace: flags.inPlace,
      dryRun: flags.dryRun
    });

    if (flags.json) {
      const { buffer: _buf, ...jsonSafe } = result;
      console.log(JSON.stringify(jsonSafe, null, 2));
    } else {
      console.log(`\n${GREEN}✔ Sanitized [${result.type}]:${RESET} ${filePath}`);
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
    console.error(`\x1b[31m✖ Error processing ${filePath}:${RESET} ${err.message}`);
  }
}

async function runInteractiveMenu(flags) {
  console.log(BANNER);
  console.log(`${BOLD}Quick Menu — Select an action or type /help:${RESET}
  ${GREEN}[1]${RESET} 📁 Pick file via File Explorer      ${DIM}(browse visually)${RESET}
  ${GREEN}[2]${RESET} 🔑 Paste text / log to scrub        ${DIM}(API keys, tokens, emails, IPs)${RESET}
  ${GREEN}[3]${RESET} 🔗 Clean a tracking link (URL)      ${DIM}(strip UTM, fbclid, session IDs)${RESET}
  ${GREEN}[4]${RESET} 🛡️  Sanitize HTML / XSS              ${DIM}(neutralize scripts & event handlers)${RESET}
  ${GREEN}[5]${RESET} 🗄️  Sanitize NoSQL / JSON query      ${DIM}(strip $gt, $where, operator injection)${RESET}
  ${GREEN}[6]${RESET} 📝 Sanitize a filename              ${DIM}(strip path traversal & illegal chars)${RESET}
  ${GREEN}[7]${RESET} 🌐 Launch browser Web GUI           ${DIM}(100% offline visual dashboard)${RESET}
  ${GREEN}[8]${RESET} ❓ Command guide & cheatsheet       ${DIM}(/help, -help)${RESET}
  ${GREEN}[0]${RESET} 🚪 Exit
`);

  const rl = readline.createInterface({ input, output });

  try {
    const rawChoice = await rl.question(`${BOLD}> ${RESET}`);
    const choice = rawChoice.trim();
    const lowerChoice = choice.toLowerCase();

    if (!choice || choice === '0' || ['exit', 'quit', 'q', 'close', 'done'].includes(lowerChoice)) {
      console.log(`${DIM}Exited. Tip: Run ${CYAN}npx sanitize-me <file>${DIM} anytime.${RESET}`);
      return;
    }

    if (choice === '1' || ['pick', 'p', 'file', 'files', 'browse', 'explorer'].includes(lowerChoice)) {
      console.log(`${DIM}Opening file explorer...${RESET}`);
      const selected = await openFilePicker();
      if (selected) {
        console.log(`Selected: ${selected}`);
        await processSingleFile(selected, flags);
      } else {
        console.log(`${DIM}File selection cancelled.${RESET}`);
      }
      return;
    }

    if (choice === '2' || ['text', 'log', 'logs', 'secret', 'secrets', 'token', 'tokens', 't'].includes(lowerChoice)) {
      console.log(`${DIM}Enter text / error log (paste and press Enter):${RESET}`);
      const text = await rl.question('> ');
      if (text) {
        const res = sanitizeText(text);
        console.log(`\n${GREEN}✔ Sanitized output (${res.totalRedactions} redacted):${RESET}`);
        console.log(res.text);
      }
      return;
    }

    if (choice === '3' || ['url', 'link', 'links', 'u', 'clean-url', 'uri'].includes(lowerChoice)) {
      console.log(`${DIM}Paste target URL with tracking parameters:${RESET}`);
      const url = await rl.question('> ');
      if (url) {
        const clean = sanitizeUrl(url);
        console.log(`\n${GREEN}✔ Clean URL:${RESET} ${clean.cleanUrl}`);
        if (clean.removedParams.length > 0) {
          console.log(`${DIM}Removed ${clean.removedParams.length} tracker(s): ${clean.removedParams.join(', ')}${RESET}`);
        }
      }
      return;
    }

    if (choice === '4' || ['html', 'xss', 'h', 'webpage'].includes(lowerChoice)) {
      console.log(`${DIM}Paste HTML markup to sanitize:${RESET}`);
      const rawHtml = await rl.question('> ');
      if (rawHtml) {
        const clean = sanitizeHtml(rawHtml);
        console.log(`\n${GREEN}✔ Sanitized HTML (XSS Neutralized):${RESET}`);
        console.log(clean);
      }
      return;
    }

    if (choice === '5' || ['query', 'nosql', 'json', 'mongo', 'q'].includes(lowerChoice)) {
      console.log(`${DIM}Paste JSON or database query string:${RESET}`);
      const rawQuery = await rl.question('> ');
      if (rawQuery) {
        const clean = sanitizeQuery(rawQuery);
        console.log(`\n${GREEN}✔ Sanitized query (Operators Removed):${RESET}`);
        console.log(typeof clean === 'string' ? clean : JSON.stringify(clean, null, 2));
      }
      return;
    }

    if (choice === '6' || ['filename', 'name', 'fn', 'f'].includes(lowerChoice)) {
      console.log(`${DIM}Enter filename to sanitize:${RESET}`);
      const rawName = await rl.question('> ');
      if (rawName) {
        const clean = sanitizeFilename(rawName);
        console.log(`\n${GREEN}✔ Safe filename:${RESET} ${clean}`);
      }
      return;
    }

    if (choice === '7' || ['gui', 'ui', 'web', 'browser', 'g', 'w'].includes(lowerChoice)) {
      console.log(`${GREEN}[sanitize-me]${RESET} Starting local web airlock...`);
      const { url } = await startServer({ open: true });
      console.log(`${CYAN}✔ Web GUI running at:${RESET} ${url}`);
      console.log(`${DIM}(Press Ctrl+C to terminate)${RESET}\n`);
      return;
    }

    if (choice === '8' || ['help', '/help', '-help', '--help', '?', '-?', '/?', 'h', 'guide', 'info', 'cheat'].includes(lowerChoice)) {
      printHelp();
      return;
    }

    // Check if user directly pasted or typed a URL
    if (isLikelyUrl(choice)) {
      const clean = sanitizeUrl(choice);
      console.log(`\n${GREEN}✔ Clean URL:${RESET} ${clean.cleanUrl}`);
      if (clean.removedParams.length > 0) {
        console.log(`${DIM}Removed: ${clean.removedParams.join(', ')}${RESET}`);
      }
      return;
    }

    // Check if user dragged-and-dropped or entered a valid file path
    const strippedPath = choice.replace(/^["']|["']$/g, '');
    if (existsSync(strippedPath)) {
      await processSingleFile(strippedPath, flags);
      return;
    } else if (/\.(jpe?g|png|webp|gif|pdf|txt|log|json|env|xml|csv)$/i.test(strippedPath)) {
      console.log(`\n\x1b[31m✖ File not found:\x1b[0m "${strippedPath}"`);
      console.log(`  ${DIM}Tip: Type ${CYAN}1${DIM} or run ${CYAN}npx sanitize-me --pick${DIM} to select files with your file manager.${RESET}\n`);
      return;
    }

    // Otherwise treat as plain text to scrub
    const res = sanitizeText(choice);
    console.log(`\n${GREEN}✔ Sanitized output (${res.totalRedactions} redacted):${RESET}`);
    console.log(res.text);

  } finally {
    rl.close();
  }
}

export async function runCli(argv = process.argv.slice(2)) {
  const HELP_ALIASES = new Set([
    '-h', '--help', '-help', '/help', 'help', '?', '-?', '/?', '--guide', 'guide', '-man', '--man'
  ]);

  const getFlagVal = (...names) => {
    for (const name of names) {
      const idx = argv.indexOf(name);
      if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith('-')) {
        return argv[idx + 1];
      }
    }
    return null;
  };

  const htmlVal = getFlagVal('-x', '--html', '-html');
  const queryVal = getFlagVal('--query', '-query', '--nosql', '-nosql');
  const filenameVal = getFlagVal('-fn', '--filename', '-filename');

  const flags = {
    help: argv.some(a => HELP_ALIASES.has(a.toLowerCase())),
    version: argv.includes('-v') || argv.includes('--version') || argv.includes('-version'),
    gui: argv.includes('--gui') || argv.includes('--ui') || argv.includes('-gui'),
    pick: argv.includes('-p') || argv.includes('--pick') || argv.includes('-pick') || argv.includes('pick'),
    inPlace: argv.includes('-i') || argv.includes('--in-place') || argv.includes('-in-place'),
    dryRun: argv.includes('-d') || argv.includes('--dry-run') || argv.includes('-dry-run'),
    json: argv.includes('-j') || argv.includes('--json') || argv.includes('-json'),
    html: argv.includes('-x') || argv.includes('--html') || argv.includes('-html'),
    query: argv.includes('--query') || argv.includes('-query') || argv.includes('--nosql') || argv.includes('-nosql'),
    filename: argv.includes('-fn') || argv.includes('--filename') || argv.includes('-filename'),
    textOnly: argv.includes('--text-only') || argv.includes('-text-only'),
    output: null
  };

  const outputIdx = argv.findIndex(a => a === '-o' || a === '--output' || a === '-output');
  if (outputIdx !== -1 && argv[outputIdx + 1]) {
    flags.output = argv[outputIdx + 1];
  }

  // Filter out flag args to get positional targets
  const flagNamesWithVal = new Set([
    '-o', '--output', '-output',
    '-x', '--html', '-html',
    '--query', '-query', '--nosql', '-nosql',
    '-fn', '--filename', '-filename'
  ]);
  const targets = argv.filter((arg, idx) => {
    if (arg.startsWith('-')) return false;
    if (idx > 0 && flagNamesWithVal.has(argv[idx - 1])) return false;
    if (['help', '/help', '-help', '?', 'pick', 'gui', 'web'].includes(arg.toLowerCase())) return false;
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

  // Unknown flag warning
  const KNOWN_FLAGS = new Set([
    '-h', '--help', '-help', '/help', 'help', '?', '-?', '/?', '--guide', 'guide', '-man', '--man',
    '-v', '--version', '-version',
    '-gui', '--gui', '--ui', '-ui',
    '-p', '--pick', '-pick', 'pick',
    '-i', '--in-place', '-in-place',
    '-d', '--dry-run', '-dry-run',
    '-j', '--json', '-json',
    '-x', '--html', '-html',
    '--query', '-query', '--nosql', '-nosql',
    '-fn', '--filename', '-filename',
    '--text-only', '-text-only',
    '-o', '--output', '-output'
  ]);

  for (const arg of argv) {
    if (arg.startsWith('-') && !KNOWN_FLAGS.has(arg.toLowerCase())) {
      console.log(`\n${YELLOW}⚠ Unknown option:${RESET} "${arg}"`);
      console.log(`  ${DIM}Run ${CYAN}npx sanitize-me --help${DIM} to see all valid commands and flags.${RESET}\n`);
      return;
    }
  }

  // Direct HTML sanitizer
  if (flags.html) {
    let payload = htmlVal || targets[0];
    if (!payload && !process.stdin.isTTY) {
      payload = await readStdin();
    }
    if (!payload && process.stdin.isTTY) {
      const rl = readline.createInterface({ input, output });
      console.log(`${DIM}Enter HTML markup to sanitize (press Enter):${RESET}`);
      payload = await rl.question('> ');
      rl.close();
    }
    if (payload != null && payload.trim().length > 0) {
      const clean = sanitizeHtml(payload, { textOnly: flags.textOnly });
      if (flags.json) {
        console.log(JSON.stringify({ cleanHtml: clean }, null, 2));
      } else {
        process.stdout.write(clean + '\n');
      }
      return;
    }
  }

  // Direct NoSQL query sanitizer
  if (flags.query) {
    let payload = queryVal || targets[0];
    if (!payload && !process.stdin.isTTY) {
      payload = await readStdin();
    }
    if (!payload && process.stdin.isTTY) {
      const rl = readline.createInterface({ input, output });
      console.log(`${DIM}Enter NoSQL / JSON query to sanitize (press Enter):${RESET}`);
      payload = await rl.question('> ');
      rl.close();
    }
    if (payload != null && payload.trim().length > 0) {
      const clean = sanitizeQuery(payload);
      if (flags.json) {
        console.log(JSON.stringify({ cleanQuery: clean }, null, 2));
      } else {
        const outStr = typeof clean === 'string' ? clean : JSON.stringify(clean, null, 2);
        process.stdout.write(outStr + '\n');
      }
      return;
    }
  }

  // Direct filename sanitizer
  if (flags.filename) {
    let payload = filenameVal || targets[0];
    if (!payload && !process.stdin.isTTY) {
      payload = (await readStdin()).trim();
    }
    if (!payload && process.stdin.isTTY) {
      const rl = readline.createInterface({ input, output });
      console.log(`${DIM}Enter filename to sanitize (press Enter):${RESET}`);
      payload = (await rl.question('> ')).trim();
      rl.close();
    }
    if (payload != null && payload.trim().length > 0) {
      const clean = sanitizeFilename(payload);
      if (flags.json) {
        console.log(JSON.stringify({ cleanFilename: clean }, null, 2));
      } else {
        process.stdout.write(clean + '\n');
      }
      return;
    }
  }

  // Handle direct file picker flag
  if (flags.pick) {
    console.log(`${DIM}Opening file explorer...${RESET}`);
    const selected = await openFilePicker();
    if (selected) {
      console.log(`Selected: ${selected}`);
      await processSingleFile(selected, flags);
    } else {
      console.log(`${DIM}File selection cancelled.${RESET}`);
    }
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

  // 2. Explicit GUI flag
  if (flags.gui) {
    console.log(BANNER);
    console.log(`${GREEN}[sanitize-me]${RESET} Starting local web airlock...`);
    const { url } = await startServer({ open: true });
    console.log(`${CYAN}✔ Web GUI running at:${RESET} ${url}`);
    console.log(`${DIM}(100% offline, zero cloud connections. Press Ctrl+C to terminate)${RESET}\n`);
    return;
  }

  // 3. No targets specified in interactive terminal -> Run intuitive menu
  if (targets.length === 0) {
    await runInteractiveMenu(flags);
    return;
  }

  // 4. Process positional targets
  for (const target of targets) {
    if (isLikelyUrl(target)) {
      const clean = sanitizeUrl(target);
      if (flags.json) {
        console.log(JSON.stringify(clean, null, 2));
      } else {
        console.log(`\n${GREEN}Clean URL:${RESET} ${clean.cleanUrl}`);
        if (clean.removedParams.length > 0) {
          console.log(`${DIM}Removed ${clean.removedParams.length} tracker(s): ${clean.removedParams.join(', ')}${RESET}`);
        }
      }
      continue;
    }

    await processSingleFile(target, flags);
  }
}

// Auto-run if executed directly as entrypoint
runCli().catch(err => {
  console.error('\x1b[31m[sanitize-me error]\x1b[0m', err.message);
  process.exit(1);
});
