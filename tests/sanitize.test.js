import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeText } from '../src/sanitizers/text.js';
import { sanitizeUrl, isLikelyUrl } from '../src/sanitizers/url.js';
import { sanitizeJpeg, sanitizePng, sanitizeWebp } from '../src/sanitizers/images.js';
import { sanitizePdf } from '../src/sanitizers/pdf.js';
import { startServer } from '../src/ui/server.js';

describe('Text & Log Sanitizer', () => {
  test('redacts emails and IPv4/IPv6 addresses', () => {
    const input = 'Contact user.name+dev@corp.internal from 192.168.1.105 or 2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    const res = sanitizeText(input);

    assert.ok(!res.text.includes('user.name+dev@corp.internal'));
    assert.ok(res.text.includes('<EMAIL_REDACTED>'));
    assert.ok(!res.text.includes('192.168.1.105'));
    assert.ok(res.text.includes('<IP_REDACTED>'));
    assert.ok(res.text.includes('<IPV6_REDACTED>'));
    assert.strictEqual(res.stats.email, 1);
    assert.strictEqual(res.stats.ipv4, 1);
    assert.strictEqual(res.stats.ipv6, 1);
  });

  test('redacts OpenAI, GitHub, AWS, and Stripe tokens', () => {
    const fakeStripe = ['sk', 'test', '51A2B3C4D5E6F7G8H9I0J1K2L3'].join('_');
    const fakeGh = ['ghp', '1234567890abcdef1234567890abcdef1234'].join('_');
    const fakeOpenAi = ['sk', 'proj', '1234567890abcdef1234567890abcdef'].join('-');
    const input = [
      `openai_key: ${fakeOpenAi}`,
      `gh_token: ${fakeGh}`,
      'aws_id: AKIAIOSFODNN7EXAMPLE',
      `stripe: ${fakeStripe}`
    ].join('\n');

    const res = sanitizeText(input);
    assert.ok(!res.text.includes(fakeOpenAi));
    assert.ok(!res.text.includes(fakeGh));
    assert.ok(!res.text.includes('AKIAIOSFODNN7EXAMPLE'));
    assert.ok(!res.text.includes(fakeStripe));
    assert.ok(res.text.includes('<API_KEY_REDACTED>'));
    assert.ok(res.text.includes('<GITHUB_TOKEN_REDACTED>'));
    assert.ok(res.text.includes('<AWS_KEY_REDACTED>'));
    assert.ok(res.text.includes('<STRIPE_KEY_REDACTED>'));
  });

  test('redacts JWT tokens and private keys', () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const fakeKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0abcdef...\n-----END RSA PRIVATE KEY-----';
    const res = sanitizeText(`${fakeJwt}\n${fakeKey}`);

    assert.ok(!res.text.includes(fakeJwt));
    assert.ok(res.text.includes('<JWT_REDACTED>'));
    assert.ok(!res.text.includes('MIIEowIBAAKCAQEA0abcdef'));
    assert.ok(res.text.includes('<PRIVATE_KEY_REDACTED>'));
  });

  test('redacts credit cards with Luhn check, ignores invalid numbers', () => {
    // Valid Visa test number (satisfies Luhn)
    const validVisa = '4532 0150 0000 0007';
    const invalidNumber = '1234 5678 9012 3456'; // does not satisfy Luhn
    const res = sanitizeText(`Card: ${validVisa}, Ref: ${invalidNumber}`);

    assert.ok(!res.text.includes(validVisa));
    assert.ok(res.text.includes('<CREDIT_CARD_REDACTED>'));
    assert.ok(res.text.includes(invalidNumber)); // Invalid preserved
  });

  test('redacts user file paths', () => {
    const input = 'Error at C:\\Users\\alice\\repo\\main.js and /home/bob/secret.env';
    const res = sanitizeText(input);
    assert.ok(res.text.includes('C:\\Users\\<USER>\\repo\\main.js'));
    assert.ok(res.text.includes('/home/<USER>/secret.env'));
  });
});

describe('URL Sanitizer', () => {
  test('strips tracking, UTM, and affiliate parameters', () => {
    const url = 'https://www.amazon.com/dp/B00000?utm_source=twitter&utm_medium=cpc&tag=affiliate-20&ref_=as_li_ss_tl&keep=this';
    const res = sanitizeUrl(url);

    assert.ok(!res.cleanUrl.includes('utm_source'));
    assert.ok(!res.cleanUrl.includes('tag='));
    assert.ok(!res.cleanUrl.includes('ref_'));
    assert.ok(res.cleanUrl.includes('keep=this'));
    assert.strictEqual(res.removedParams.length, 4);
  });

  test('strips YouTube share id (si) and Facebook clid', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ?si=abcdef123456&fbclid=IwAR0987';
    const res = sanitizeUrl(url);

    assert.ok(!res.cleanUrl.includes('si='));
    assert.ok(!res.cleanUrl.includes('fbclid='));
    assert.ok(res.cleanUrl.includes('dQw4w9WgXcQ'));
  });

  test('unwraps Google redirect urls', () => {
    const url = 'https://www.google.com/url?q=https%3A%2F%2Fgithub.com%2FLiyfez%2Fsanitize-me&sa=D&sntz=1&usg=AOvVaw0';
    const res = sanitizeUrl(url);

    assert.strictEqual(res.cleanUrl, 'https://github.com/Liyfez/sanitize-me');
  });

  test('identifies likely URLs correctly', () => {
    assert.strictEqual(isLikelyUrl('https://github.com/test'), true);
    assert.strictEqual(isLikelyUrl('http://example.org?q=1'), true);
    assert.strictEqual(isLikelyUrl('just some text with no url'), false);
    assert.strictEqual(isLikelyUrl('https://example.com\nsecond line'), false);
  });
});

describe('Image Sanitizer (JPEG, PNG, WebP)', () => {
  test('strips JPEG APP1 (EXIF) segment losslessly', () => {
    // Construct minimal valid JPEG with APP1 (EXIF marker) and SOS
    // SOI: FF D8
    // APP1: FF E1, length 8 (00 08), data 'Exif\0\0'
    // SOS: FF DA, length 8 (00 08), fake entropy, EOI: FF D9
    const exifData = Buffer.from('Exif\0\0');
    const app1 = Buffer.concat([
      Buffer.from([0xff, 0xe1]),
      Buffer.from([0x00, 2 + exifData.length]),
      exifData
    ]);
    const sos = Buffer.from([0xff, 0xda, 0x00, 0x04, 0x00, 0x00, 0x12, 0x34, 0xff, 0xd9]);
    const rawJpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), app1, sos]);

    const res = sanitizeJpeg(rawJpeg);
    assert.strictEqual(res.stripped.length, 1);
    assert.ok(res.stripped[0].includes('APP1'));

    // Check resulting JPEG has SOI and SOS, but not APP1
    assert.strictEqual(res.buffer[0], 0xff);
    assert.strictEqual(res.buffer[1], 0xd8);
    assert.strictEqual(res.buffer.includes(Buffer.from([0xff, 0xe1])), false);
    assert.strictEqual(res.buffer.includes(Buffer.from([0xff, 0xda])), true);
  });

  test('strips PNG ancillary chunks (tEXt, eXIf)', () => {
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // Create synthetic tEXt chunk
    const textData = Buffer.from('Author\0Alice');
    const textChunk = Buffer.alloc(12 + textData.length);
    textChunk.writeUInt32BE(textData.length, 0);
    textChunk.write('tEXt', 4);
    textData.copy(textChunk, 8);
    // CRC (dummy 4 bytes)
    textChunk.writeUInt32BE(0x12345678, 8 + textData.length);

    // IEND chunk
    const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

    const rawPng = Buffer.concat([pngSig, textChunk, iendChunk]);
    const res = sanitizePng(rawPng);

    assert.strictEqual(res.stripped.length, 1);
    assert.strictEqual(res.stripped[0], 'PNG tEXt');
    assert.strictEqual(res.buffer.includes(Buffer.from('tEXt')), false);
    assert.strictEqual(res.buffer.includes(Buffer.from('IEND')), true);
  });

  test('strips WebP EXIF chunk and resets flags', () => {
    // RIFF .... WEBP VP8X(10 bytes) EXIF(6 bytes)
    const riffHeader = Buffer.from('RIFF\0\0\0\0WEBP');
    // VP8X chunk: FourCC 'VP8X', length 10, flags at offset 8 (EXIF bit is 1<<3 = 8)
    const vp8xData = Buffer.alloc(10);
    vp8xData[0] = 0x08; // EXIF flag active
    const vp8xChunk = Buffer.concat([
      Buffer.from('VP8X'),
      Buffer.from([0x0a, 0x00, 0x00, 0x00]),
      vp8xData
    ]);

    // EXIF chunk: FourCC 'EXIF', length 4
    const exifData = Buffer.from('GPS1');
    const exifChunk = Buffer.concat([
      Buffer.from('EXIF'),
      Buffer.from([0x04, 0x00, 0x00, 0x00]),
      exifData
    ]);

    const rawWebp = Buffer.concat([riffHeader, vp8xChunk, exifChunk]);
    const res = sanitizeWebp(rawWebp);

    assert.strictEqual(res.stripped.length, 1);
    assert.strictEqual(res.stripped[0], 'WebP EXIF');
    assert.strictEqual(res.buffer.includes(Buffer.from('EXIF')), false);
  });
});

describe('PDF Metadata Neutralizer', () => {
  test('safely blanks PDF /Info entries and XMP stream without corrupting byte length', () => {
    const rawPdf = Buffer.from(`%PDF-1.4
1 0 obj
<< /Author (Sadyk Secret) /Creator (SecretCam v1) >>
endobj
2 0 obj
<< /Type /Metadata >>
stream
<x:xmpmeta>Confidential GPS</x:xmpmeta>
endstream
endobj
trailer << /Info 1 0 R >>
%%EOF`);

    const res = sanitizePdf(rawPdf);

    assert.strictEqual(res.newSize, res.originalSize, 'PDF byte offset must stay identical to prevent xref corruption');
    const cleanStr = res.buffer.toString('utf8');
    assert.ok(!cleanStr.includes('Sadyk Secret'));
    assert.ok(!cleanStr.includes('SecretCam v1'));
    assert.ok(!cleanStr.includes('Confidential GPS'));
    assert.ok(res.stripped.length >= 2);
  });
});

describe('Offline Web Server API', () => {
  test('starts localhost server and responds to text & URL endpoints', async () => {
    const { server, url } = await startServer({ port: 49152, open: false });

    try {
      // 1. Test GET /
      const resHtml = await fetch(`${url}/`);
      assert.strictEqual(resHtml.status, 200);
      const htmlText = await resHtml.text();
      assert.ok(htmlText.includes('sanitize-me'));

      // 2. Test POST /api/sanitize-text
      const resText = await fetch(`${url}/api/sanitize-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Call me at test@example.com with key sk-1234567890123456789012' })
      });
      const dataText = await resText.json();
      assert.ok(dataText.text.includes('<EMAIL_REDACTED>'));
      assert.ok(dataText.text.includes('<API_KEY_REDACTED>'));
      assert.strictEqual(dataText.totalRedactions, 2);

      // 3. Test POST /api/sanitize-url
      const resUrl = await fetch(`${url}/api/sanitize-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/item?utm_source=twitter&keep=1' })
      });
      const dataUrl = await resUrl.json();
      assert.strictEqual(dataUrl.cleanUrl, 'https://example.com/item?keep=1');
      assert.deepStrictEqual(dataUrl.removedParams, ['utm_source']);
    } finally {
      server.close();
    }
  });
});
