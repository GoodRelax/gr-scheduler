/**
 * UseCase layer: the import sanitizer / trust-boundary gatekeeper (ARCH-C-026,
 * IO-L1-006). Every byte that enters the app from an untrusted file (JSON / MSPDI
 * XML) or from localStorage MUST pass through here before it reaches the model
 * (security-design SEC-DESIGN-001 §2.2).
 *
 * The external image-import path (SVG allowlist sanitize + PNG magic/IHDR
 * validation) was withdrawn in CR-004 Part 6a; only the JSON/MSPDI trust boundary
 * remains.
 *
 * All functions in this module are PURE (no DOM, no I/O) so the security controls
 * are unit-testable in a plain Node environment and reused identically at runtime
 * and in tests. The DOM-facing glue (File API reads, wiring into the store) lives
 * in src/adapters/io/.
 *
 * Controls implemented here (security-design §3):
 * - §3.3/C-05/C-06  JSON prototype-pollution guard (__proto__/constructor/
 *   prototype) + depth guard, before schema validation.
 * - §3.4/C-07/C-08  XML DOCTYPE/ENTITY rejection (XXE + billion-laughs).
 * - §3.6/C-11       resource limits (bytes / nesting depth).
 */

/**
 * Raised when an untrusted import is rejected wholesale (all-or-nothing, never
 * partially applied) per security-design §3.6. Carries a human-readable reason
 * suitable for a user toast.
 */
export class ImportRejectedError extends Error {
  public constructor(reason: string) {
    super(reason);
    this.name = 'ImportRejectedError';
  }
}

/** Resource limits (security-design §3.6, tunable). */
export const IMPORT_LIMITS = {
  /** Max JSON payload size in bytes. */
  maxJsonBytes: 20 * 1024 * 1024,
  /** Max MSPDI XML payload size in bytes. */
  maxXmlBytes: 20 * 1024 * 1024,
  /** Max item count in an imported JSON/MSPDI document. */
  maxItemCount: 20_000,
  /** Max structural nesting depth for parsed JSON/XML. */
  maxNestingDepth: 64,
} as const;

/** Keys that enable prototype pollution and are always dropped (§3.3, C-06). */
const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** UTF-8 byte length of a string without allocating a Buffer (cross-env). */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate: consumes the following low surrogate as a 4-byte pair.
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/**
 * Reject an oversize payload before any parsing (§3.6, C-11).
 *
 * @param text - The raw payload.
 * @param maxBytes - Byte ceiling.
 * @param label - Human label for the error message.
 * @throws {ImportRejectedError} When the payload exceeds the ceiling.
 */
export function assertWithinByteLimit(text: string, maxBytes: number, label: string): void {
  const bytes = utf8ByteLength(text);
  if (bytes > maxBytes) {
    throw new ImportRejectedError(
      `${label} exceeds the ${maxBytes}-byte import limit (${bytes} bytes)`,
    );
  }
}

// ---------------------------------------------------------------------------
// JSON: prototype-pollution guard + depth guard (§3.3)
// ---------------------------------------------------------------------------

/**
 * Parse JSON with a reviver that drops prototype-pollution keys (§3.3, C-06).
 * The returned value is an ordinary parsed value with `__proto__` /
 * `constructor` / `prototype` keys removed, so a malicious
 * `{"__proto__":{...}}` never mutates `Object.prototype`.
 *
 * @param jsonText - The untrusted JSON text.
 * @returns The parsed value (still untyped; validate before use).
 * @throws {ImportRejectedError} When the text is not valid JSON.
 */
export function safeJsonParse(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText, (key, value) => {
      if (FORBIDDEN_JSON_KEYS.has(key)) {
        return undefined;
      }
      return value as unknown;
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ImportRejectedError(`Malformed JSON: ${detail}`);
  }
}

/**
 * Assert the structural nesting depth of a parsed value is within the limit
 * (§3.6, C-11). Guards against deeply nested JSON used to exhaust the stack.
 *
 * @param value - Parsed JSON value.
 * @param maxDepth - Depth ceiling (defaults to IMPORT_LIMITS.maxNestingDepth).
 * @throws {ImportRejectedError} When the value nests deeper than the ceiling.
 */
export function assertJsonDepth(value: unknown, maxDepth: number = IMPORT_LIMITS.maxNestingDepth): void {
  const walk = (node: unknown, depth: number): void => {
    if (depth > maxDepth) {
      throw new ImportRejectedError(`JSON nesting exceeds the ${maxDepth}-level depth limit`);
    }
    if (Array.isArray(node)) {
      for (const child of node) {
        walk(child, depth + 1);
      }
    } else if (node !== null && typeof node === 'object') {
      for (const child of Object.values(node)) {
        walk(child, depth + 1);
      }
    }
  };
  walk(value, 0);
}

// ---------------------------------------------------------------------------
// XML: DOCTYPE / ENTITY rejection (§3.4)
// ---------------------------------------------------------------------------

/**
 * Reject any XML containing a DOCTYPE or ENTITY declaration (§3.4, C-07/C-08).
 * This is a defensive layer on top of the browser DOMParser (which already does
 * not resolve external entities), and additionally blocks billion-laughs
 * entity-expansion DoS.
 *
 * @param xmlText - The untrusted XML text.
 * @throws {ImportRejectedError} When a DOCTYPE or ENTITY declaration is present.
 */
export function rejectXmlDoctype(xmlText: string): void {
  if (/<!DOCTYPE/i.test(xmlText) || /<!ENTITY/i.test(xmlText)) {
    throw new ImportRejectedError('DOCTYPE/ENTITY declarations are not allowed (XXE guard)');
  }
}

// ---------------------------------------------------------------------------
// Base64 (cross-env encoder, used by the MSPDI Notes sidecar)
// ---------------------------------------------------------------------------

/** Base64 alphabet for the pure (cross-env) encoder. */
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode bytes to a base64 string without relying on `btoa`/`Buffer`, so it runs
 * identically in the browser and in Node test runners.
 *
 * @param bytes - Raw bytes.
 * @returns The base64 encoding.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const byte0 = bytes[index] ?? 0;
    const byte1 = bytes[index + 1] ?? 0;
    const byte2 = bytes[index + 2] ?? 0;
    const triple = (byte0 << 16) | (byte1 << 8) | byte2;
    output += BASE64_ALPHABET[(triple >> 18) & 0x3f];
    output += BASE64_ALPHABET[(triple >> 12) & 0x3f];
    output += index + 1 < bytes.length ? BASE64_ALPHABET[(triple >> 6) & 0x3f] : '=';
    output += index + 2 < bytes.length ? BASE64_ALPHABET[triple & 0x3f] : '=';
  }
  return output;
}
