import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Test client-side ArrayBuffer routines in Node environment

function cleanJpegClient(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { bytes, stripped: [] };
  }
  const stripped = [];
  const chunks = [bytes.slice(0, 2)];
  let offset = 2;
  const view = new DataView(arrayBuffer);

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      chunks.push(bytes.slice(offset));
      break;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd9) {
      chunks.push(bytes.slice(offset, offset + 2));
      break;
    }
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(bytes.slice(offset, offset + 2));
      offset += 2;
      continue;
    }
    if (offset + 4 > bytes.length) {
      chunks.push(bytes.slice(offset));
      break;
    }
    const len = view.getUint16(offset + 2, false);
    const end = offset + 2 + len;
    if (end > bytes.length) {
      chunks.push(bytes.slice(offset));
      break;
    }
    let drop = false;
    if (marker === 0xe1) { drop = true; stripped.push('APP1 (EXIF / GPS / XMP)'); }
    else if (marker === 0xed) { drop = true; stripped.push('APP13 (IPTC / Photoshop)'); }
    else if (marker === 0xfe) { drop = true; stripped.push('COM (User Comments)'); }
    else if (marker === 0xe2) {
      let h = '';
      for (let i = 0; i < 4 && offset + 4 + i < bytes.length; i++) h += String.fromCharCode(bytes[offset + 4 + i]);
      if (h === 'FPXR') { drop = true; stripped.push('APP2 (FlashPix)'); }
    }

    if (!drop) chunks.push(bytes.slice(offset, end));
    if (marker === 0xda) { chunks.push(bytes.slice(end)); break; }
    offset = end;
  }
  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const cleanBytes = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) { cleanBytes.set(c, pos); pos += c.length; }
  return { bytes: cleanBytes, stripped };
}

function cleanPngClient(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 8 || !sig.every((b, i) => bytes[i] === b)) {
    return { bytes, stripped: [] };
  }
  const stripped = [];
  const chunks = [bytes.slice(0, 8)];
  const dropTypes = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME', 'dSIG']);
  let offset = 8;

  while (offset + 8 <= bytes.length) {
    const len = view.getUint32(offset, false);
    let type = '';
    for (let i = 0; i < 4; i++) type += String.fromCharCode(bytes[offset + 4 + i]);
    const totalChunk = 12 + len;
    if (offset + totalChunk > bytes.length) {
      chunks.push(bytes.slice(offset));
      break;
    }
    if (dropTypes.has(type)) {
      stripped.push(`PNG ${type}`);
    } else {
      chunks.push(bytes.slice(offset, offset + totalChunk));
    }
    offset += totalChunk;
    if (type === 'IEND') break;
  }
  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const cleanBytes = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) { cleanBytes.set(c, pos); pos += c.length; }
  return { bytes: cleanBytes, stripped };
}

function cleanWebpClient(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  if (bytes.length < 12) return { bytes, stripped: [] };
  let riff = '', webp = '';
  for (let i = 0; i < 4; i++) {
    riff += String.fromCharCode(bytes[i]);
    webp += String.fromCharCode(bytes[8 + i]);
  }
  if (riff !== 'RIFF' || webp !== 'WEBP') return { bytes, stripped: [] };

  const stripped = [];
  const chunks = [];
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    let fourCC = '';
    for (let i = 0; i < 4; i++) fourCC += String.fromCharCode(bytes[offset + i]);
    const chunkSize = view.getUint32(offset + 4, true);
    const paddedSize = chunkSize + (chunkSize % 2);
    const nextOffset = offset + 8 + paddedSize;

    if (fourCC === 'EXIF' || fourCC === 'XMP ') {
      stripped.push(`WebP ${fourCC.trim()}`);
    } else if (fourCC === 'VP8X') {
      const chunkCopy = bytes.slice(offset, Math.min(nextOffset, bytes.length));
      if (chunkCopy.length >= 9) {
        chunkCopy[8] &= ~((1 << 3) | (1 << 2));
      }
      chunks.push(chunkCopy);
    } else {
      chunks.push(bytes.slice(offset, Math.min(nextOffset, bytes.length)));
    }
    offset = nextOffset;
  }

  const bodyLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const cleanBytes = new Uint8Array(12 + bodyLen);
  for (let i = 0; i < 4; i++) cleanBytes[i] = 'RIFF'.charCodeAt(i);
  new DataView(cleanBytes.buffer).setUint32(4, bodyLen + 4, true);
  for (let i = 0; i < 4; i++) cleanBytes[8 + i] = 'WEBP'.charCodeAt(i);

  let pos = 12;
  for (const c of chunks) { cleanBytes.set(c, pos); pos += c.length; }
  return { bytes: cleanBytes, stripped };
}

function cleanPdfClient(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer.slice(0));
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  if (!str.startsWith('%PDF-')) return { bytes, stripped: [] };

  const stripped = [];
  const fields = ['Author', 'Creator', 'Producer', 'CreationDate', 'ModDate', 'Keywords', 'Subject', 'Company'];
  for (const f of fields) {
    const re = new RegExp(`(/${f}\\s*)(\\((?:[^\\\\)]|\\\\.)*\\)|<[0-9a-fA-F\\s]*>)`, 'g');
    let m;
    while ((m = re.exec(str)) !== null) {
      const valOffset = m.index + m[1].length;
      const valLen = m[2].length;
      if (valLen >= 2) {
        for (let i = valOffset; i < valOffset + valLen; i++) bytes[i] = 0x20;
        bytes[valOffset] = 0x28;
        bytes[valOffset + 1] = 0x29;
        stripped.push(`PDF /Info /${f}`);
      }
    }
  }

  const metaRegex = /\/Type\s*\/Metadata[\s\S]*?stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let metaMatch;
  while ((metaMatch = metaRegex.exec(str)) !== null) {
    const streamContent = metaMatch[1];
    const streamOffset = metaMatch.index + metaMatch[0].indexOf(streamContent);
    for (let i = streamOffset; i < streamOffset + streamContent.length; i++) bytes[i] = 0x20;
    stripped.push('PDF XMP /Metadata Stream');
  }

  return { bytes, stripped: [...new Set(stripped)] };
}

describe('Browser Client-Side Sanitizers', () => {
  test('strips PNG metadata client-side via ArrayBuffer', () => {
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const textChunk = [
      0x00, 0x00, 0x00, 0x04,
      0x74, 0x45, 0x58, 0x74, // tEXt
      0x61, 0x62, 0x63, 0x64,
      0x00, 0x00, 0x00, 0x00
    ];
    const iendChunk = [
      0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44, // IEND
      0xae, 0x42, 0x60, 0x82
    ];
    const rawPng = new Uint8Array([...pngSig, ...textChunk, ...iendChunk]).buffer;
    const resPng = cleanPngClient(rawPng);

    assert.strictEqual(resPng.stripped[0], 'PNG tEXt');
    assert.strictEqual(resPng.bytes.length, 8 + 12);
  });

  test('blanks PDF metadata client-side while preserving byte offset', () => {
    const pdfStr = '%PDF-1.4\n1 0 obj\n<< /Author (SecretAuthor) >>\nendobj\n%%EOF';
    const rawPdf = new Uint8Array(Buffer.from(pdfStr, 'binary')).buffer;
    const resPdf = cleanPdfClient(rawPdf);

    assert.strictEqual(resPdf.stripped[0], 'PDF /Info /Author');
    const cleanStr = Buffer.from(resPdf.bytes).toString('binary');
    assert.ok(!cleanStr.includes('SecretAuthor'));
    assert.strictEqual(cleanStr.length, pdfStr.length);
  });
});
