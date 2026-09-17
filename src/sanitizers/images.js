/**
 * Lossless binary image metadata and EXIF stripper.
 * Operates directly on binary byte streams without re-compressing or degrading pixel data.
 */

// JPEG Marker constants
const JPEG_SOI = 0xffd8;
const JPEG_SOS = 0xffda;
const JPEG_EOI = 0xffd9;

/**
 * Strip metadata from JPEG buffer (APP1/Exif/XMP, APP13/IPTC, COM comments)
 * @param {Buffer} buffer
 * @returns {{ buffer: Buffer, stripped: string[] }}
 */
export function sanitizeJpeg(buffer) {
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== JPEG_SOI) {
    throw new Error('Invalid JPEG format');
  }

  const stripped = [];
  const chunks = [];
  chunks.push(buffer.subarray(0, 2)); // Keep SOI

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      // Stray byte before marker, keep scan intact
      chunks.push(buffer.subarray(offset));
      break;
    }

    const marker = buffer[offset + 1];

    // Standalone markers without length
    if (marker === 0xd9) { // EOI
      chunks.push(buffer.subarray(offset, offset + 2));
      break;
    }
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) { // Restart markers or escaped 0xFF
      chunks.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    if (offset + 4 > buffer.length) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    const segmentEnd = offset + 2 + segmentLength;

    if (segmentEnd > buffer.length) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Identify markers to drop:
    // 0xE1 = APP1 (EXIF, XMP, GPS, MakerNotes)
    // 0xED = APP13 (Photoshop IPTC)
    // 0xFE = COM (Comment)
    // 0xE2 = APP2 FlashPix (keep ICC profile if present)
    let drop = false;
    if (marker === 0xe1) {
      drop = true;
      stripped.push('APP1 (EXIF / GPS / XMP)');
    } else if (marker === 0xed) {
      drop = true;
      stripped.push('APP13 (IPTC / Photoshop)');
    } else if (marker === 0xfe) {
      drop = true;
      stripped.push('COM (Text Comments)');
    } else if (marker === 0xe2) {
      // Check if FlashPix
      const header = buffer.subarray(offset + 4, Math.min(segmentEnd, offset + 9)).toString('ascii');
      if (header.startsWith('FPXR')) {
        drop = true;
        stripped.push('APP2 (FlashPix Metadata)');
      }
    }

    if (!drop) {
      chunks.push(buffer.subarray(offset, segmentEnd));
    }

    if (marker === 0xda) {
      // SOS (Start of Scan) - entropy data follows until EOI
      chunks.push(buffer.subarray(segmentEnd));
      break;
    }

    offset = segmentEnd;
  }

  return {
    buffer: Buffer.concat(chunks),
    stripped
  };
}

/**
 * Strip ancillary metadata chunks from PNG buffer (eXIf, tEXt, zTXt, iTXt, tIME)
 * @param {Buffer} buffer
 * @returns {{ buffer: Buffer, stripped: string[] }}
 */
export function sanitizePng(buffer) {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Invalid PNG format');
  }

  const stripped = [];
  const chunks = [PNG_SIGNATURE];
  const stripChunkTypes = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME', 'dSIG']);

  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const totalChunkLength = 12 + length; // 4 len + 4 type + data + 4 crc

    if (offset + totalChunkLength > buffer.length) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    if (stripChunkTypes.has(type)) {
      stripped.push(`PNG ${type}`);
    } else {
      chunks.push(buffer.subarray(offset, offset + totalChunkLength));
    }

    offset += totalChunkLength;
    if (type === 'IEND') break;
  }

  return {
    buffer: Buffer.concat(chunks),
    stripped
  };
}

/**
 * Strip metadata chunks (EXIF, XMP) from WebP buffer
 * @param {Buffer} buffer
 * @returns {{ buffer: Buffer, stripped: string[] }}
 */
export function sanitizeWebp(buffer) {
  if (buffer.length < 12 ||
      buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
      buffer.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw new Error('Invalid WebP format');
  }

  const stripped = [];
  const chunks = [];
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const fourCC = buffer.subarray(offset, offset + 4).toString('ascii');
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const paddedSize = chunkSize + (chunkSize % 2); // RIFF chunks are 2-byte aligned
    const nextOffset = offset + 8 + paddedSize;

    if (fourCC === 'EXIF' || fourCC === 'XMP ') {
      stripped.push(`WebP ${fourCC.trim()}`);
    } else if (fourCC === 'VP8X') {
      // Modify VP8X flags: clear EXIF (bit 3) and XMP (bit 2)
      const chunkCopy = Buffer.from(buffer.subarray(offset, Math.min(nextOffset, buffer.length)));
      if (chunkCopy.length >= 9) {
        // Flags byte is at chunkCopy[8] (offset 8 from chunk start)
        let flags = chunkCopy[8];
        flags &= ~(1 << 3); // Clear EXIF flag
        flags &= ~(1 << 2); // Clear XMP flag
        chunkCopy[8] = flags;
      }
      chunks.push(chunkCopy);
    } else {
      chunks.push(buffer.subarray(offset, Math.min(nextOffset, buffer.length)));
    }

    offset = nextOffset;
  }

  const bodyBuffer = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(bodyBuffer.length + 4, 4);
  header.write('WEBP', 8, 'ascii');

  return {
    buffer: Buffer.concat([header, bodyBuffer]),
    stripped
  };
}

/**
 * Auto-detect image format and sanitize metadata
 * @param {Buffer} buffer
 * @returns {{ buffer: Buffer, stripped: string[], format: string, bytesSaved: number }}
 */
export function sanitizeImage(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  let result;
  let format;

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    format = 'jpeg';
    result = sanitizeJpeg(buffer);
  } else if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    format = 'png';
    result = sanitizePng(buffer);
  } else if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    format = 'webp';
    result = sanitizeWebp(buffer);
  } else {
    throw new Error('Unsupported image format. Supported formats: JPEG, PNG, WebP');
  }

  return {
    buffer: result.buffer,
    stripped: result.stripped,
    format,
    originalSize: buffer.length,
    newSize: result.buffer.length,
    bytesSaved: Math.max(0, buffer.length - result.buffer.length)
  };
}
