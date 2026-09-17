import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { sanitizeFile } from './index.js';
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
${BOLD}COMMAND GUIDE (/help)${RESET}

${BOLD}1. FILE CLEANING (Images, PDFs, Logs)${RESET}
   ${CYAN}npx sanitize-me --pick${RESET}             Open native File Explorer dialog to pick a file
   ${CYAN}npx sanitize-me photo.jpg${RESET}          Strips EXIF, GPS, camera serial, maker notes
   ${CYAN}npx sanitize-me doc.pdf${RESET}            Blanks PDF /Author, /Creator, /Producer metadata
   ${CYAN}npx sanitize-me file.png -i${RESET}        Overwrite file in-place
   ${CYAN}npx sanitize-me f1.jpg f2.pdf -o ./out${RESET} Save sanitized files to custom folder

${BOLD}2. TEXT & LOG SANITIZING (Secrets & PII)${RESET}
   ${CYAN}cat server.log | npx sanitize-me${RESET}   Redact API keys, tokens, IPs, emails from piped stream
   ${CYAN}pbpaste | npx sanitize-me | pbcopy${RESET} Sanitize clipboard before pasting into tickets or chats

${BOLD}3. URL TRACKER STRIPPING${RESET}
   ${CYAN}npx sanitize-me "https://amazon.com/dp/B000?utm_source=tw&tag=aff-20"${RESET}
   Strips UTM parameters, affiliate tags, Facebook clids, YouTube session IDs.

${BOLD}4. INTERACTIVE & WEB MODES${RESET}
   ${CYAN}npx sanitize-me${RESET}                    Launch interactive terminal menu
   ${CYAN}npx sanitize-me --gui${RESET}              Open local drag-and-drop web UI in browser

${BOLD}OPTIONS & FLAGS${RESET}
   ${GREEN}-p, --pick${RESET}             Open file explorer to browse and choose a file
   ${GREEN}-o, --output <dir>${RESET}     Specify output directory for sanitized files
   ${GREEN}-i, --in-place${RESET}         Overwrite original file directly
   ${GREEN}-d, --dry-run${RESET}          Analyze metadata/PII without writing files
   ${GREEN}-j, --json${RESET}             Output machine-readable JSON format
   ${GREEN}    --gui, --ui${RESET}        Force launch localhost Web GUI
   ${GREEN}-h, --help, /help${RESET}      Show this guide
   ${GREEN}-v, --version${RESET}          Show version
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
  console.log(`${BOLD}Choose an action or type /help:${RESET}
  ${GREEN}[1]${RESET} Pick file via File Explorer ${DIM}(or type: pick)${RESET}
  ${GREEN}[2]${RESET} Paste text or error log to scrub
  ${GREEN}[3]${RESET} Clean a tracking link (URL)
  ${GREEN}[4]${RESET} Launch offline Web GUI ${DIM}(browser)${RESET}
  ${GREEN}[5]${RESET} Command guide & examples ${DIM}(/help)${RESET}
  ${GREEN}[0]${RESET} Exit
`);

  const rl = readline.createInterface({ input, output });

  try {
    const rawChoice = await rl.question(`${BOLD}> ${RESET}`);
    const choice = rawChoice.trim();

    if (!choice || choice === '0' || choice.toLowerCase() === 'exit' || choice.toLowerCase() === 'q') {
      console.log('Exiting.');
      return;
    }

    if (choice === '1' || choice.toLowerCase() === 'pick' || choice.toLowerCase() === 'p') {
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

    if (choice === '2' || choice.toLowerCase() === 'text' || choice.toLowerCase() === 'log') {
      console.log(`${DIM}Enter text (paste and press Enter):${RESET}`);
      const text = await rl.question('> ');
      if (text) {
        const res = sanitizeText(text);
        console.log(`\n${GREEN}✔ Sanitized output (${res.totalRedactions} redacted):${RESET}`);
        console.log(res.text);
      }
      return;
    }

    if (choice === '3' || choice.toLowerCase() === 'url') {
      console.log(`${DIM}Paste target URL:${RESET}`);
      const url = await rl.question('> ');
      if (url) {
        const clean = sanitizeUrl(url);
        console.log(`\n${GREEN}Clean URL:${RESET} ${clean.cleanUrl}`);
        if (clean.removedParams.length > 0) {
          console.log(`${DIM}Removed ${clean.removedParams.length} tracker(s): ${clean.removedParams.join(', ')}${RESET}`);
        }
      }
      return;
    }

    if (choice === '4' || choice.toLowerCase() === 'gui' || choice.toLowerCase() === 'web') {
      console.log(`${GREEN}[sanitize-me]${RESET} Starting local web airlock...`);
      const { url } = await startServer({ open: true });
      console.log(`${CYAN}✔ Web GUI running at:${RESET} ${url}`);
      console.log(`${DIM}(Press Ctrl+C to terminate)${RESET}\n`);
      return;
    }

    if (choice === '5' || choice === '/help' || choice.toLowerCase() === 'help' || choice === '?') {
      printHelp();
      return;
    }

    // Check if user directly pasted or typed a URL
    if (isLikelyUrl(choice)) {
      const clean = sanitizeUrl(choice);
      console.log(`\n${GREEN}Clean URL:${RESET} ${clean.cleanUrl}`);
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
    }

    // Otherwise treat as plain text to scrub
    const res = sanitizeText(choice);
    console.log(`\n${GREEN}Sanitized output (${res.totalRedactions} redacted):${RESET}`);
    console.log(res.text);

  } finally {
    rl.close();
  }
}

export async function runCli(argv = process.argv.slice(2)) {
  const flags = {
    help: argv.includes('-h') || argv.includes('--help') || argv.includes('/help') || argv.includes('help') || argv.includes('?'),
    version: argv.includes('-v') || argv.includes('--version'),
    gui: argv.includes('--gui') || argv.includes('--ui'),
    pick: argv.includes('-p') || argv.includes('--pick') || argv.includes('pick'),
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
    if (['help', '/help', '?', 'pick', 'gui', 'web'].includes(arg.toLowerCase())) return false;
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
