// File: ShowConfidentialSchedule: decides who the watermark of use case UC-009 names and whether an answer lifts it.
// @unit      UF-216  (docs/spec/05-07-design.md, table T-075)
// @component ShowConfidentialSchedule, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-50

type StoredValue = string | null

// Spec: FR-020, S-99a, S-99c
// Trap: an empty stored value must count as unset, or the empty password opens the gate.
/** @purity pure */
function storedOrDefault(stored: StoredValue, defaultValue: string): string {
  return stored === null || stored === '' ? defaultValue : stored
}

// Provisional: OPQ-26
// Spec: UC-009, FR-020, S-99a
/** @purity pure */
export function watermarkOpenedByOf(storedName: StoredValue, defaultName: string): string {
  return storedOrDefault(storedName, defaultName)
}

// Provisional: OPQ-26
// Spec: UC-009, FR-020, FR-086, S-99c, S-101
/** @purity pure */
export function isWatermarkUnlockMatched(givenDigest: string, storedDigest: StoredValue, defaultDigest: string): boolean {
  return givenDigest === storedOrDefault(storedDigest, defaultDigest)
}
