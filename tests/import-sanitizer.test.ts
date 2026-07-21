import { describe, expect, it } from 'vitest';
import {
  IMPORT_LIMITS,
  ImportRejectedError,
  assertJsonDepth,
  assertWithinByteLimit,
  bytesToBase64,
  rejectXmlDoctype,
  safeJsonParse,
} from '../src/domain/usecase/import-sanitizer.js';

// The external image-import path (SVG allowlist sanitize + PNG magic/IHDR
// validation) was withdrawn in CR-004 Part 6a; only the JSON/MSPDI trust boundary
// remains under test here (IO-L1-006).

describe('resource limits (C-11, ST-13)', () => {
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

describe('base64 helper (MSPDI Notes sidecar)', () => {
  it('encodes bytes to standard base64', () => {
    expect(bytesToBase64(Uint8Array.from([104, 105]))).toBe('aGk=');
  });
});
