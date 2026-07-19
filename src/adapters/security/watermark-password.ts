/**
 * Adapter layer (Clean Architecture): the watermark hide-password gate
 * (security-design §6, TOOL-L2-003). Hiding the evidence watermark requires a
 * password; this adapter hashes the entered password with SHA-256 via the Web
 * Crypto API (`crypto.subtle`) and compares the hex digest to a stored hash. The
 * raw password is NEVER stored or serialized -- only its hash lives in the model /
 * exported document / built HTML.
 *
 * SECURITY NOTE: this is a client-side, single-file application, so a
 * password-gated hide is a SOFT deterrent only. A determined user can edit the DOM
 * / HTML directly to reveal or remove the mark. Storing only the hash and
 * documenting the default password for server-side rotation is the correct
 * practice, but the client cannot enforce the gate cryptographically.
 */

/**
 * Compute the lowercase-hex SHA-256 digest of a UTF-8 string using the Web Crypto
 * API. Available as a global (`crypto.subtle`) both in the browser and in the
 * Node / test runtime.
 *
 * @param text - The plaintext to hash (e.g. an entered password).
 * @returns The 64-character lowercase hex SHA-256 digest.
 */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  let hex = '';
  for (const byte of new Uint8Array(digest)) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Whether an entered password matches a stored SHA-256 hex hash (TOOL-L2-003).
 * Returns false for an empty input or a non-matching hash. Never reveals the
 * expected password; only the hash is compared.
 *
 * @param enteredPassword - The password the user typed to hide the watermark.
 * @param expectedHash - The stored lowercase-hex SHA-256 hash to match against.
 * @returns True only when SHA-256(enteredPassword) equals `expectedHash`.
 */
export async function matchesWatermarkHidePassword(
  enteredPassword: string,
  expectedHash: string,
): Promise<boolean> {
  if (enteredPassword.length === 0) {
    return false;
  }
  const actualHash = await sha256Hex(enteredPassword);
  return actualHash === expectedHash;
}
