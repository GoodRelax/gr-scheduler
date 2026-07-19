/**
 * UseCase layer (PURE): deterministic identifier back-fill for imported / legacy
 * documents (DATA-JSON-001 migration). Older sample data and hand-authored JSON may
 * omit the project id or an element's id; this module assigns any MISSING id
 * DETERMINISTICALLY so that every project / section / item ends up with a stable
 * unique id -- WITHOUT reaching for randomness or Web Crypto (that belongs to the
 * adapter id seam, `src/adapters/id/id-generator.ts`, which keeps this codec pure).
 *
 * "Deterministic-safe" means: the same input document always yields the same ids
 * (so a re-import is stable and round-trips), and a freshly assigned id can never
 * collide with an id already present in the document.
 */

/** A raw parsed object indexable by string key (post prototype-guard). */
type RawRecord = Record<string, unknown>;

/**
 * RFC-4122 8-4-4-4-12 shape with a version nibble in 1..5 and an RFC variant nibble.
 * Used to decide whether an existing `projectId` is already a usable UUID.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * True when `value` is a string in canonical UUID form.
 *
 * @param value - The candidate.
 * @returns Whether it is a UUID-shaped string.
 */
export function isUuidLike(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** The document collections whose elements each carry a stable `id`. */
const ID_BEARING_COLLECTIONS = ['sections', 'rows', 'items', 'dependencies', 'annotations', 'assets'] as const;

/** The 62-symbol alphabet mirrored from the id adapter (deterministic short ids). */
const SHORT_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 32-bit FNV-1a hash of `text` (deterministic, dependency-free). */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Sixteen deterministic bytes derived from `seed` via four keyed FNV rounds. */
function seedBytes(seed: string): number[] {
  const bytes: number[] = [];
  for (let round = 0; round < 4; round += 1) {
    const word = fnv1a(`${seed}#${round}`);
    bytes.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
  }
  return bytes;
}

/** Two-hex-digit rendering of a byte. */
function toHex(byte: number): string {
  return byte.toString(16).padStart(2, '0');
}

/**
 * A stable, valid UUID-v4-shaped id derived DETERMINISTICALLY from `seed`. Two
 * byte-identical legacy documents therefore migrate to the same project id (they
 * ARE the same project), while distinct documents get distinct ids with
 * overwhelming probability.
 *
 * @param seed - Identifying content of the document.
 * @returns A UUID-shaped string with the v4 version and RFC variant nibbles set.
 */
export function deterministicUuid(seed: string): string {
  const bytes = seedBytes(seed);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 1 (RFC 4122)
  const hex = bytes.map(toHex).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** An 8-char `[A-Za-z0-9]` token deterministically derived from `seed`. */
function shortTokenFromSeed(seed: string): string {
  const bytes = seedBytes(seed);
  let token = '';
  for (let index = 0; index < 8; index += 1) {
    token += SHORT_ID_ALPHABET[(bytes[index] ?? 0) % SHORT_ID_ALPHABET.length];
  }
  return token;
}

/**
 * A short id deterministically derived from `seed` and guaranteed absent from
 * `used`; on the rare collision it re-hashes with a bumped suffix (still
 * deterministic). The chosen id is added to `used`.
 */
function deterministicShortId(seed: string, used: Set<string>): string {
  let candidate = shortTokenFromSeed(seed);
  let attempt = 0;
  while (used.has(candidate)) {
    attempt += 1;
    candidate = shortTokenFromSeed(`${seed}~${attempt}`);
  }
  used.add(candidate);
  return candidate;
}

/** True for a non-null, non-array object. */
function isPlainObject(value: unknown): value is RawRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** True when `element` already carries a non-empty string id. */
function hasStringId(element: RawRecord): boolean {
  const id = element['id'];
  return typeof id === 'string' && id.length > 0;
}

/** Gather every existing string id across all id-bearing collections. */
function collectExistingIds(raw: RawRecord): Set<string> {
  const used = new Set<string>();
  for (const collection of ID_BEARING_COLLECTIONS) {
    const value = raw[collection];
    if (!Array.isArray(value)) {
      continue;
    }
    for (const element of value) {
      if (isPlainObject(element) && hasStringId(element)) {
        used.add(element['id'] as string);
      }
    }
  }
  return used;
}

/**
 * Assign any MISSING identifiers to a migrated raw document, returning a new record
 * (never mutating the input):
 *
 * - `projectId`: kept when it is already a UUID; otherwise a stable UUID is derived
 *   from the document's identifying content.
 * - every element of `sections` / `rows` / `items` / `dependencies` / `annotations`
 *   / `assets` that lacks a string `id` gets a deterministic short id, unique
 *   against all ids already present.
 *
 * Existing ids are preserved verbatim, so dependency and classification references
 * that point at them keep resolving (no reference is ever broken).
 *
 * @param raw - The migrated raw document object.
 * @returns A new raw document with all missing ids filled in.
 */
export function assignMissingIds(raw: RawRecord): RawRecord {
  const used = collectExistingIds(raw);
  const next: RawRecord = { ...raw };

  if (!isUuidLike(next['projectId'])) {
    next['projectId'] = deterministicUuid(JSON.stringify(raw));
  }

  for (const collection of ID_BEARING_COLLECTIONS) {
    const value = raw[collection];
    if (!Array.isArray(value)) {
      continue;
    }
    let changed = false;
    const mapped = value.map((element, index) => {
      if (!isPlainObject(element) || hasStringId(element)) {
        return element;
      }
      changed = true;
      const seed = `${collection}[${index}]:${JSON.stringify(element)}`;
      return { ...element, id: deterministicShortId(seed, used) };
    });
    if (changed) {
      next[collection] = mapped;
    }
  }
  return next;
}
