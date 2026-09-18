import { readFileSync, writeFileSync } from 'node:fs';
import { extname, basename, join, dirname } from 'node:path';
import { sanitizeImage, sanitizeJpeg, sanitizePng, sanitizeWebp } from './sanitizers/images.js';
import { sanitizePdf } from './sanitizers/pdf.js';
import { sanitizeText } from './sanitizers/text.js';
import { sanitizeUrl, isLikelyUrl } from './sanitizers/url.js';
import { sanitizeFilename } from './sanitizers/filename.js';
import { sanitizeHtml } from './sanitizers/html.js';
import { sanitizeQuery } from './sanitizers/query.js';
import { startServer } from './ui/server.js';

export {
  sanitizeImage,
  sanitizeJpeg,
  sanitizePng,
  sanitizeWebp,
  sanitizePdf,
  sanitizeText,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeHtml,
  sanitizeQuery,
  isLikelyUrl,
  startServer
};

/**
 * Automatically detects file type, sanitizes metadata/PII, and optionally writes clean output.
 * @param {string} filePath
 * @param {{ outputPath?: string, inPlace?: boolean, dryRun?: boolean }} [options]
 */
export function sanitizeFile(filePath, options = {}) {
  const ext = extname(filePath).toLowerCase();
  const rawBuffer = readFileSync(filePath);

  let result;
  let type;

  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    type = 'image';
    result = sanitizeImage(rawBuffer);
  } else if (ext === '.pdf') {
    type = 'pdf';
    result = sanitizePdf(rawBuffer);
  } else {
    // Treat as text / log file
    type = 'text';
    const textContent = rawBuffer.toString('utf8');
    const textRes = sanitizeText(textContent);
    result = {
      buffer: Buffer.from(textRes.text, 'utf8'),
      stats: textRes.stats,
      totalRedactions: textRes.totalRedactions,
      format: 'text',
      originalSize: rawBuffer.length,
      newSize: Buffer.byteLength(textRes.text),
      bytesSaved: Math.max(0, rawBuffer.length - Buffer.byteLength(textRes.text))
    };
  }

  let finalOutputPath = null;
  if (!options.dryRun) {
    if (options.inPlace) {
      finalOutputPath = filePath;
    } else if (options.outputPath) {
      finalOutputPath = options.outputPath;
    } else {
      // Default: <name>.sanitized.<ext>
      const dir = dirname(filePath);
      const base = basename(filePath, ext);
      finalOutputPath = join(dir, `${base}.clean${ext}`);
    }
    writeFileSync(finalOutputPath, result.buffer);
  }

  return {
    ...result,
    type,
    inputPath: filePath,
    outputPath: finalOutputPath
  };
}
