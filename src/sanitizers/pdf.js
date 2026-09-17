/**
 * PDF Metadata Neutralizer.
 * Safely blanks out /Info metadata fields and XMP /Metadata streams
 * while preserving byte offsets to prevent xref table corruption.
 */

export function sanitizePdf(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  // Verify PDF header %PDF-1.x
  if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Invalid PDF format');
  }

  // Create mutable working copy
  const clean = Buffer.from(buffer);
  const stripped = [];

  // 1. Sanitize /Info dictionary fields: Author, Creator, Producer, CreationDate, ModDate, Title, Subject, Keywords
  const infoFields = [
    'Author',
    'Creator',
    'Producer',
    'CreationDate',
    'ModDate',
    'Keywords',
    'Subject',
    'Company',
    'SourceModified'
  ];

  for (const field of infoFields) {
    // Matches /Field (content...) or /Field <hex...>
    const fieldRegex = new RegExp(`(/${field}\\s*)(\\((?:[^\\\\)]|\\\\.)*\\)|<[0-9a-fA-F\\s]*>)`, 'g');
    const content = clean.toString('binary');
    let match;

    while ((match = fieldRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      const prefix = match[1];
      const val = match[2];
      const valOffset = matchIndex + prefix.length;
      const valLength = val.length;

      // Blank out the value with empty string wrapped in spaces to keep byte alignment
      // e.g. "(John Doe)" (9 bytes) -> "( )      "
      if (valLength >= 2) {
        clean.fill(0x20, valOffset, valOffset + valLength); // fill with spaces
        clean[valOffset] = 0x28; // '('
        clean[valOffset + 1] = 0x29; // ')'
        stripped.push(`PDF /Info /${field}`);
      }
    }
  }

  // 2. Sanitize /Metadata XMP streams
  // Look for /Type /Metadata ... stream ... endstream
  const content = clean.toString('binary');
  const metadataRegex = /\/Type\s*\/Metadata[\s\S]*?stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let metaMatch;

  while ((metaMatch = metadataRegex.exec(content)) !== null) {
    const streamContent = metaMatch[1];
    const streamOffset = metaMatch.index + metaMatch[0].indexOf(streamContent);
    const streamLength = streamContent.length;

    if (streamLength > 0) {
      // Overwrite XMP XML content with whitespace to preserve xref byte offsets
      clean.fill(0x20, streamOffset, streamOffset + streamLength);
      stripped.push('PDF XMP /Metadata Stream');
    }
  }

  return {
    buffer: clean,
    stripped: [...new Set(stripped)],
    format: 'pdf',
    originalSize: buffer.length,
    newSize: clean.length,
    bytesSaved: 0 // Byte offsets preserved for xref validity
  };
}
