import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const ASCII_ART = `  ███████╗ █████╗ ███╗   ██╗██╗████████╗██╗███████╗███████╗       ███╗   ███╗███████╗
  ██╔════╝██╔══██╗████╗  ██║██║╚══██╔══╝██║╚══███╔╝██╔════╝       ████╗ ████║██╔════╝
  ███████╗███████║██╔██╗ ██║██║   ██║   ██║  ███╔╝ █████╗  █████╗ ██╔████╔██║█████╗  
  ╚════██║██╔══██║██║╚██╗██║██║   ██║   ██║ ███╔╝  ██╔══╝  ╚════╝ ██║╚██╔╝██║██╔══╝  
  ███████║██║  ██║██║ ╚████║██║   ██║   ██║███████╗███████╗       ██║ ╚═╝ ██║███████╗
  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝╚══════╝╚══════╝       ╚═╝     ╚═╝╚══════╝`;

const LOGO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%;
    height: 100%;
    background: transparent !important;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    font-family: 'Consolas', 'Courier New', 'Fira Code', 'JetBrains Mono', monospace;
  }
  .ascii-art {
    font-size: 24px;
    line-height: 1.15;
    font-weight: 900;
    letter-spacing: 0px;
    white-space: pre;
    background: linear-gradient(135deg, #00FF66 0%, #39FF14 25%, #70FF00 50%, #A3E635 75%, #D4FCC3 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
</style>
</head>
<body>
  <div class="ascii-art">${ASCII_ART}</div>
</body>
</html>`;

async function renderHtmlStringToPng(htmlString, outputPngPath, width, height) {
  const tempHtmlPath = path.resolve(process.cwd(), "temp_render.html");
  await fs.writeFile(tempHtmlPath, htmlString, "utf-8");

  const fileUrl = `file:///${tempHtmlPath.replace(/\\/g, "/")}`;

  const args = [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=${width},${height}`,
    "--default-background-color=00000000",
    "--force-device-scale-factor=2",
    `--screenshot=${path.resolve(outputPngPath)}`,
    fileUrl
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(EDGE_PATH, args);
    child.on("close", async (code) => {
      await fs.unlink(tempHtmlPath).catch(() => {});
      if (code === 0) resolve();
      else reject(new Error(`Edge headless exited with code ${code}`));
    });
  });
}

async function main() {
  const assetsDir = path.resolve(process.cwd(), "assets");
  await fs.mkdir(assetsDir, { recursive: true });

  const rawLogoPng = path.join(assetsDir, "sanitize_me_raw.png");
  console.log("[*] Rendering transparent lime green sanitize-me ASCII logo PNG...");
  await renderHtmlStringToPng(LOGO_HTML, rawLogoPng, 1450, 380);
  console.log(`✔ Raw PNG rendered to: ${rawLogoPng}`);
}

main().catch(console.error);
