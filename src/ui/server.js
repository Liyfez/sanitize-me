import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { exec } from 'node:child_process';
import { sanitizeText } from '../sanitizers/text.js';
import { sanitizeUrl } from '../sanitizers/url.js';
import { sanitizeImage } from '../sanitizers/images.js';
import { sanitizePdf } from '../sanitizers/pdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HTML_CONTENT = readFileSync(join(__dirname, 'public', 'index.html'), 'utf8');

function openUrlInBrowser(url) {
  const platform = process.platform;
  let cmd = '';
  if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, () => {});
}

/**
 * Start the local-first offline Web UI server
 * @param {{ port?: number, open?: boolean }} options
 * @returns {Promise<{ server: import('node:http').Server, port: number, url: string }>}
 */
export function startServer(options = {}) {
  const preferredPort = options.port || 4488;
  const shouldOpen = options.open !== false;

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

      // CORS for local loopback
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
      }

      // Root GUI
      if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(HTML_CONTENT);
      }

      // API: Text Sanitization
      if (req.method === 'POST' && parsedUrl.pathname === '/api/sanitize-text') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const result = sanitizeText(data.text || '');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // API: URL Sanitization
      if (req.method === 'POST' && parsedUrl.pathname === '/api/sanitize-url') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const result = sanitizeUrl(data.url || '');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // API: File Sanitization
      if (req.method === 'POST' && parsedUrl.pathname === '/api/sanitize-file') {
        const filename = parsedUrl.searchParams.get('filename') || 'file.bin';
        const ext = extname(filename).toLowerCase();
        const chunks = [];

        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            let result;
            let stripped = [];

            if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
              result = sanitizeImage(buffer);
              stripped = result.stripped;
            } else if (ext === '.pdf') {
              result = sanitizePdf(buffer);
              stripped = result.stripped;
            } else {
              // Treat as text
              const textRes = sanitizeText(buffer.toString('utf8'));
              result = {
                buffer: Buffer.from(textRes.text, 'utf8'),
                stripped: Object.entries(textRes.stats).map(([k, v]) => `${k} (${v})`)
              };
              stripped = result.stripped;
            }

            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="clean_${filename}"`,
              'X-Stripped-Tags': JSON.stringify(stripped)
            });
            res.end(result.buffer);
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        server.listen(preferredPort + 1, '127.0.0.1');
      } else {
        reject(err);
      }
    });

    server.listen(preferredPort, '127.0.0.1', () => {
      const address = server.address();
      const actualPort = typeof address === 'string' ? preferredPort : address.port;
      const url = `http://127.0.0.1:${actualPort}`;
      if (shouldOpen) {
        openUrlInBrowser(url);
      }
      resolve({ server, port: actualPort, url });
    });
  });
}
