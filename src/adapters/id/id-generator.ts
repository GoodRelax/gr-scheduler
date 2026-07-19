/**
 * Adapter layer: identifier generation (the "id seam", ARCH DIP). Domain code
 * stays PURE and accepts ids as plain data; this adapter is the ONE place that
 * reaches for a source of entropy (the Web Crypto API), so unit tests can inject a
 * deterministic generator and the domain never depends on randomness.
 *
 * Two kinds of identifier are minted here:
 *
 * - PROJECT id: a UUID v4 (`crypto.randomUUID`) minted once per document at
 *   creation, the stable top-level reference for the whole schedule.
 * - SECTION / ITEM id: a short 8-char `[A-Za-z0-9]` token, unique WITHIN the
 *   project (collision-retry against the ids already in use), used as the stable
 *   reference that dependencies and classification state point at.
 */

/** The 62-symbol alphabet for short ids (URL-safe, no separators). */
const SHORT_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Character length of a generated short id. 62^8 ~= 2.18e14 distinct keys. */
export const SHORT_ID_LENGTH = 8;

/** Largest multiple of the alphabet size that fits in a byte, for unbiased sampling. */
const UNBIASED_BYTE_CEILING = Math.floor(256 / SHORT_ID_ALPHABET.length) * SHORT_ID_ALPHABET.length;

/**
 * Resolve the Web Crypto implementation, failing loudly rather than silently
 * falling back to a weak `Math.random` source (the id seam must stay trustworthy).
 */
function webCrypto(): Crypto {
  const cryptoImpl = globalThis.crypto;
  if (cryptoImpl === undefined || typeof cryptoImpl.getRandomValues !== 'function') {
    throw new Error('Web Crypto API is unavailable; cannot generate identifiers');
  }
  return cryptoImpl;
}

/**
 * Mint a single random 8-char `[A-Za-z0-9]` token. Rejection-samples random bytes
 * so each symbol is uniformly distributed (no modulo bias). This has NO uniqueness
 * guarantee on its own; use {@link generateUniqueShortId} to guarantee uniqueness
 * within a project.
 *
 * @returns A random short id.
 */
export function randomShortId(): string {
  const cryptoImpl = webCrypto();
  let token = '';
  const buffer = new Uint8Array(SHORT_ID_LENGTH);
  while (token.length < SHORT_ID_LENGTH) {
    cryptoImpl.getRandomValues(buffer);
    for (let index = 0; index < buffer.length && token.length < SHORT_ID_LENGTH; index += 1) {
      const sample = buffer[index] ?? 0;
      if (sample < UNBIASED_BYTE_CEILING) {
        token += SHORT_ID_ALPHABET[sample % SHORT_ID_ALPHABET.length];
      }
    }
  }
  return token;
}

/**
 * Mint a short id guaranteed not to collide with any id in `existingIds`, retrying
 * on the (astronomically rare) collision so "unique within the project" is a hard
 * guarantee rather than merely a probability (batch requirement: collision-retry).
 *
 * @param existingIds - The ids already in use across the whole document.
 * @returns A short id absent from `existingIds`.
 * @throws When the id space is implausibly saturated (defensive; never expected).
 */
export function generateUniqueShortId(existingIds: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = randomShortId();
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
  throw new Error('Exhausted short-id generation attempts (id space is implausibly dense)');
}

/**
 * Mint a fresh project id: a UUID v4. Uses `crypto.randomUUID` where available and
 * otherwise assembles a v4 UUID from random bytes, so the adapter works across the
 * browser runtime and the Node test runtime alike.
 *
 * @returns A newly minted UUID v4.
 */
export function generateProjectId(): string {
  const cryptoImpl = webCrypto();
  if (typeof cryptoImpl.randomUUID === 'function') {
    return cryptoImpl.randomUUID();
  }
  const bytes = new Uint8Array(16);
  cryptoImpl.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 1 (RFC 4122)
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * The injectable id-generation service. Callers that create items/sections/projects
 * depend on this interface, not on the concrete functions, so a test can supply a
 * deterministic generator.
 */
export interface IdGenerator {
  /** Mint a fresh project id (UUID v4). */
  newProjectId(): string;
  /** Mint a short id unique against `existingIds`. */
  newShortId(existingIds: ReadonlySet<string>): string;
}

/**
 * Create the production id generator backed by Web Crypto.
 *
 * @returns An {@link IdGenerator}.
 */
export function createIdGenerator(): IdGenerator {
  return {
    newProjectId: generateProjectId,
    newShortId: generateUniqueShortId,
  };
}
