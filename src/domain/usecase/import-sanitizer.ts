/**
 * UseCase layer: the import sanitizer / trust-boundary gatekeeper (ARCH-C-026,
 * IO-L1-006, ITEM-L2-001). Every byte that enters the app from an untrusted file
 * (JSON / MSPDI XML / SVG / PNG) or from localStorage MUST pass through here
 * before it reaches the model or the DOM (security-design SEC-DESIGN-001 §2.2).
 *
 * All functions in this module are PURE (no DOM, no I/O) so the security controls
 * are unit-testable in a plain Node environment and reused identically at runtime
 * and in tests. The DOM-facing glue (File API reads, wiring into the store) lives
 * in src/adapters/io/.
 *
 * Controls implemented here (security-design §3):
 * - §3.2/C-03/C-04  SVG allowlist sanitize (strip script, on-handlers,
 *   foreignObject, external refs, javascript URLs) via parse then allowlist
 *   rebuild (not regex deletion).
 * - §3.3/C-05/C-06  JSON prototype-pollution guard (__proto__/constructor/
 *   prototype) + depth guard, before schema validation.
 * - §3.4/C-07/C-08  XML DOCTYPE/ENTITY rejection (XXE + billion-laughs).
 * - §3.5/C-09/C-10  PNG magic-byte + IHDR dimension validation.
 * - §3.6/C-11       resource limits (bytes / node count / nesting depth).
 * - §3.1/C-02/M-3   paint attributes validated (external url() refs rejected).
 */

import { isSafePaintValue } from './color-validator.js';

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
  /** Max SVG payload size in bytes. */
  maxSvgBytes: 5 * 1024 * 1024,
  /** Max PNG payload size in bytes. */
  maxPngBytes: 10 * 1024 * 1024,
  /** Max item count in an imported JSON/MSPDI document. */
  maxItemCount: 20_000,
  /** Max structural nesting depth for parsed JSON/XML. */
  maxNestingDepth: 64,
  /** Max element count in an imported SVG. */
  maxSvgNodeCount: 5_000,
  /** Max PNG edge length in pixels. */
  maxPngDimension: 4096,
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
// PNG: magic-byte + dimension validation (§3.5)
// ---------------------------------------------------------------------------

/** The 8-byte PNG signature (security-design §3.5). */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

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

/** Result of a successful PNG validation. */
export interface ValidatedPng {
  readonly width: number;
  readonly height: number;
  /** Self-contained `data:image/png;base64,...` URI (never an external ref). */
  readonly sanitizedDataUri: string;
}

/**
 * Validate a PNG by its magic bytes and IHDR dimensions, then package it as an
 * opaque base64 data URI (§3.5, C-09). The raster is never decoded/executed; PNG
 * text metadata is ignored.
 *
 * @param bytes - The raw file bytes.
 * @returns The validated dimensions and a self-contained data URI.
 * @throws {ImportRejectedError} When the signature, size, or dimensions are invalid.
 */
export function validatePng(bytes: Uint8Array): ValidatedPng {
  if (bytes.length > IMPORT_LIMITS.maxPngBytes) {
    throw new ImportRejectedError(
      `PNG exceeds the ${IMPORT_LIMITS.maxPngBytes}-byte import limit`,
    );
  }
  // IHDR (25 bytes) sits right after the 8-byte signature; width/height are the
  // first two big-endian 32-bit fields of its data at offsets 16 and 20.
  if (bytes.length < 24) {
    throw new ImportRejectedError('PNG is too small to contain an IHDR header');
  }
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) {
      throw new ImportRejectedError('Not a PNG file (bad magic bytes)');
    }
  }
  const readUint32 = (offset: number): number =>
    ((bytes[offset] ?? 0) * 0x1000000) +
    (((bytes[offset + 1] ?? 0) << 16) | ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0));
  const width = readUint32(16);
  const height = readUint32(20);
  if (width <= 0 || height <= 0) {
    throw new ImportRejectedError('PNG has invalid (non-positive) dimensions');
  }
  if (width > IMPORT_LIMITS.maxPngDimension || height > IMPORT_LIMITS.maxPngDimension) {
    throw new ImportRejectedError(
      `PNG dimensions ${width}x${height} exceed the ${IMPORT_LIMITS.maxPngDimension}px limit`,
    );
  }
  return {
    width,
    height,
    sanitizedDataUri: `data:image/png;base64,${bytesToBase64(bytes)}`,
  };
}

// ---------------------------------------------------------------------------
// SVG: parse -> allowlist rebuild sanitizer (§3.2)
// ---------------------------------------------------------------------------

/**
 * Purely-drawing SVG elements that survive sanitization (security-design §3.2
 * step 3). Compared case-insensitively but the ORIGINAL case is preserved on
 * output because SVG element names such as `linearGradient` are case-sensitive.
 * `script`, `foreignObject`, `a`, `style` are intentionally absent: any element
 * not in this set is dropped together with its entire subtree.
 */
const SVG_ELEMENT_ALLOWLIST = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'lineargradient',
  'radialgradient',
  'stop',
  'title',
  'desc',
  'clippath',
  'symbol',
  'marker',
  'use',
  'image',
]);

/** Attribute names carrying a URL reference that must be validated (§3.2). */
const URL_ATTRIBUTE_NAMES = new Set(['href', 'xlink:href', 'src']);

/**
 * Paint attributes whose value can carry a `url(...)` paint reference. An
 * external reference here (`fill="url(http://evil)"`) turns a shared SVG into an
 * exfiltration beacon, so these are validated against the color allowlist
 * (internal `url(#id)` refs allowed) rather than passed through (M5a review M-3).
 */
const PAINT_ATTRIBUTE_NAMES = new Set([
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'lighting-color',
  'color',
]);

interface SvgAttribute {
  readonly name: string;
  readonly value: string;
}

interface SvgElementNode {
  readonly kind: 'element';
  readonly name: string;
  readonly attributes: SvgAttribute[];
  readonly children: SvgNode[];
}

interface SvgTextNode {
  readonly kind: 'text';
  readonly text: string;
}

type SvgNode = SvgElementNode | SvgTextNode;

/** Decode the XML/HTML entities an attacker could use to obfuscate `javascript:`. */
function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const codePoint = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    switch (body.toLowerCase()) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default:
        return match;
    }
  });
}

/** Escape text node content for safe re-serialization (§3.1). */
function escapeXmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape an attribute value for safe re-serialization (§3.1). */
function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** True when a URL attribute value is safe: internal fragment or embedded image. */
function isSafeUrlValue(rawValue: string): boolean {
  const value = decodeEntities(rawValue).trim().toLowerCase();
  if (value.startsWith('#')) {
    return true;
  }
  return value.startsWith('data:image/png') || value.startsWith('data:image/svg+xml');
}

/** True when a `style` value is free of external/script-bearing CSS (§3.2). */
function isSafeStyleValue(rawValue: string): boolean {
  const value = decodeEntities(rawValue).toLowerCase();
  return (
    !value.includes('url(') &&
    !value.includes('@import') &&
    !value.includes('expression') &&
    !value.includes('javascript:')
  );
}

/** Keep only safe attributes on an allowlisted element (§3.2 step 4). */
function filterAttributes(attributes: readonly SvgAttribute[]): SvgAttribute[] {
  const kept: SvgAttribute[] = [];
  for (const attribute of attributes) {
    const lowerName = attribute.name.toLowerCase();
    // Drop every event handler attribute (onload, onclick, onbegin, ...).
    if (lowerName.startsWith('on')) {
      continue;
    }
    const decodedValue = decodeEntities(attribute.value).toLowerCase();
    // Drop any attribute value that smuggles a javascript: URL.
    if (decodedValue.includes('javascript:')) {
      continue;
    }
    if (URL_ATTRIBUTE_NAMES.has(lowerName) && !isSafeUrlValue(attribute.value)) {
      continue;
    }
    // Drop paint attributes that carry an EXTERNAL url() reference (beacon), but
    // keep color literals and internal url(#id) gradient references (M-3 / L-1).
    if (PAINT_ATTRIBUTE_NAMES.has(lowerName) && !isSafePaintValue(attribute.value)) {
      continue;
    }
    if (lowerName === 'style' && !isSafeStyleValue(attribute.value)) {
      continue;
    }
    kept.push(attribute);
  }
  return kept;
}

/**
 * Minimal hardened XML tokenizer that builds a shallow node tree. It never
 * evaluates anything and is only used to feed the allowlist rebuild below; DOCTYPE
 * has already been rejected upstream so no entity expansion occurs.
 */
function tokenizeSvg(source: string): SvgElementNode {
  const rootChildren: SvgNode[] = [];
  const stack: SvgElementNode[] = [];
  let nodeCount = 0;
  let index = 0;

  const currentChildren = (): SvgNode[] =>
    stack.length === 0 ? rootChildren : (stack[stack.length - 1] as SvgElementNode).children;

  while (index < source.length) {
    const lessThan = source.indexOf('<', index);
    if (lessThan === -1) {
      const trailing = source.slice(index);
      if (trailing.trim().length > 0) {
        currentChildren().push({ kind: 'text', text: trailing });
      }
      break;
    }
    if (lessThan > index) {
      const text = source.slice(index, lessThan);
      if (text.trim().length > 0) {
        currentChildren().push({ kind: 'text', text });
      }
    }

    if (source.startsWith('<!--', lessThan)) {
      const end = source.indexOf('-->', lessThan + 4);
      index = end === -1 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', lessThan)) {
      const end = source.indexOf(']]>', lessThan + 9);
      const text = source.slice(lessThan + 9, end === -1 ? source.length : end);
      if (text.trim().length > 0) {
        currentChildren().push({ kind: 'text', text });
      }
      index = end === -1 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith('<!', lessThan) || source.startsWith('<?', lessThan)) {
      const end = source.indexOf('>', lessThan + 2);
      index = end === -1 ? source.length : end + 1;
      continue;
    }

    const greaterThan = source.indexOf('>', lessThan);
    if (greaterThan === -1) {
      break;
    }
    const rawTag = source.slice(lessThan + 1, greaterThan);
    index = greaterThan + 1;

    if (rawTag.startsWith('/')) {
      // Closing tag: pop the nearest matching open element.
      const closeName = rawTag.slice(1).trim().toLowerCase();
      for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
        if ((stack[depth] as SvgElementNode).name.toLowerCase() === closeName) {
          stack.length = depth;
          break;
        }
      }
      continue;
    }

    const selfClose = rawTag.endsWith('/');
    const tagBody = selfClose ? rawTag.slice(0, -1) : rawTag;
    const parsed = parseTag(tagBody);
    if (parsed === null) {
      continue;
    }
    nodeCount += 1;
    if (nodeCount > IMPORT_LIMITS.maxSvgNodeCount) {
      throw new ImportRejectedError(
        `SVG exceeds the ${IMPORT_LIMITS.maxSvgNodeCount}-node import limit`,
      );
    }
    const element: SvgElementNode = {
      kind: 'element',
      name: parsed.name,
      attributes: parsed.attributes,
      children: [],
    };
    currentChildren().push(element);
    if (!selfClose) {
      stack.push(element);
      if (stack.length > IMPORT_LIMITS.maxNestingDepth) {
        throw new ImportRejectedError(
          `SVG nesting exceeds the ${IMPORT_LIMITS.maxNestingDepth}-level depth limit`,
        );
      }
    }
  }

  const svgRoot = findFirstSvg(rootChildren);
  if (svgRoot === null) {
    throw new ImportRejectedError('Imported file does not contain an <svg> root');
  }
  return svgRoot;
}

/** Parse a start-tag body into an element name and its raw attributes. */
function parseTag(tagBody: string): { name: string; attributes: SvgAttribute[] } | null {
  const trimmed = tagBody.trim();
  const nameMatch = /^([^\s/>]+)/.exec(trimmed);
  if (nameMatch === null) {
    return null;
  }
  const name = nameMatch[1] as string;
  const attributes: SvgAttribute[] = [];
  const attrPattern = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let attrMatch: RegExpExecArray | null;
  attrPattern.lastIndex = nameMatch[0].length;
  while ((attrMatch = attrPattern.exec(trimmed)) !== null) {
    const attrName = attrMatch[1] as string;
    const attrValue = attrMatch[3] ?? attrMatch[4] ?? attrMatch[5] ?? '';
    attributes.push({ name: attrName, value: decodeEntities(attrValue) });
  }
  return { name, attributes };
}

/** Depth-first search for the first `<svg>` element in a forest. */
function findFirstSvg(nodes: readonly SvgNode[]): SvgElementNode | null {
  for (const node of nodes) {
    if (node.kind !== 'element') {
      continue;
    }
    if (node.name.toLowerCase() === 'svg') {
      return node;
    }
    const nested = findFirstSvg(node.children);
    if (nested !== null) {
      return nested;
    }
  }
  return null;
}

/** Re-serialize an allowlisted node tree; disallowed elements drop their subtree. */
function serializeSafe(node: SvgNode): string {
  if (node.kind === 'text') {
    return escapeXmlText(node.text);
  }
  if (!SVG_ELEMENT_ALLOWLIST.has(node.name.toLowerCase())) {
    // Non-allowlisted element (script/foreignObject/a/style/unknown): drop it
    // AND its entire subtree by not recursing.
    return '';
  }
  const attributes = filterAttributes(node.attributes)
    .map((attribute) => ` ${attribute.name}="${escapeXmlAttribute(attribute.value)}"`)
    .join('');
  const inner = node.children.map(serializeSafe).join('');
  if (inner.length === 0) {
    return `<${node.name}${attributes}/>`;
  }
  return `<${node.name}${attributes}>${inner}</${node.name}>`;
}

/**
 * Sanitize an untrusted SVG string into a safe, self-contained SVG (§3.2,
 * C-03/C-04). Parses the input, keeps only allowlisted drawing elements and safe
 * attributes, and re-serializes. Guarantees the output contains no `<script>`,
 * no `on*` handlers, no `<foreignObject>`, and no external/`javascript:`
 * references. Enforces byte, node-count and depth limits.
 *
 * @param svgText - The untrusted SVG source.
 * @returns A sanitized SVG string usable as an imported icon asset.
 * @throws {ImportRejectedError} When limits are exceeded or no <svg> root exists.
 */
export function sanitizeSvg(svgText: string): string {
  assertWithinByteLimit(svgText, IMPORT_LIMITS.maxSvgBytes, 'SVG');
  rejectXmlDoctype(svgText);
  const svgRoot = tokenizeSvg(svgText);
  const ensured = ensureSvgNamespace(svgRoot);
  return serializeSafe(ensured);
}

/** Ensure the root svg carries the SVG namespace so it renders standalone. */
function ensureSvgNamespace(svgRoot: SvgElementNode): SvgElementNode {
  const hasNamespace = svgRoot.attributes.some((attribute) => attribute.name.toLowerCase() === 'xmlns');
  if (hasNamespace) {
    return svgRoot;
  }
  return {
    ...svgRoot,
    attributes: [{ name: 'xmlns', value: 'http://www.w3.org/2000/svg' }, ...svgRoot.attributes],
  };
}

/**
 * Wrap a sanitized SVG string into a self-contained base64 `data:` URI suitable
 * for {@link import('../model/schedule-model.js').ImportedAsset.sanitizedDataUri}.
 *
 * @param sanitizedSvg - Output of {@link sanitizeSvg}.
 * @returns A `data:image/svg+xml;base64,...` URI.
 */
export function svgToDataUri(sanitizedSvg: string): string {
  // Encode as UTF-8 bytes so multi-byte glyphs survive base64.
  const bytes = new Uint8Array(utf8ByteLength(sanitizedSvg));
  let offset = 0;
  for (const codePoint of sanitizedSvg) {
    const code = codePoint.codePointAt(0) ?? 0;
    if (code < 0x80) {
      bytes[offset++] = code;
    } else if (code < 0x800) {
      bytes[offset++] = 0xc0 | (code >> 6);
      bytes[offset++] = 0x80 | (code & 0x3f);
    } else if (code < 0x10000) {
      bytes[offset++] = 0xe0 | (code >> 12);
      bytes[offset++] = 0x80 | ((code >> 6) & 0x3f);
      bytes[offset++] = 0x80 | (code & 0x3f);
    } else {
      bytes[offset++] = 0xf0 | (code >> 18);
      bytes[offset++] = 0x80 | ((code >> 12) & 0x3f);
      bytes[offset++] = 0x80 | ((code >> 6) & 0x3f);
      bytes[offset++] = 0x80 | (code & 0x3f);
    }
  }
  return `data:image/svg+xml;base64,${bytesToBase64(bytes)}`;
}
