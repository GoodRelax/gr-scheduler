// SingleHtmlShell frame loop -- the watermark unlock gate: the answer's SHA-256 against the stored or default digest.
// @unit      UF-166  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import { readBrowserStored } from './browser-stored-values'
import { openSurfaceNameIn, WATERMARK_UNLOCK_ROW, type FrameLoopHands } from './frame-loop'

const HEX_DIGIT_BITS = 4
const HEX_DIGIT_MASK = 0xf
const HEX_DIGITS = '0123456789abcdef'

/** @purity pure */
function hexOfByte(value: number): string {
  const high = HEX_DIGITS[(value >> HEX_DIGIT_BITS) & HEX_DIGIT_MASK] ?? ''
  const low = HEX_DIGITS[value & HEX_DIGIT_MASK] ?? ''
  return high + low
}

// see FR-020, S-101
/** @purity semi-pure-b */
async function sha256HexOf(text: string): Promise<string | null> {
  const digester = globalThis.crypto?.subtle
  if (digester === undefined) return null
  try {
    const digest = await digester.digest('SHA-256', new TextEncoder().encode(text))
    let spelled = ''
    for (const byte of new Uint8Array(digest)) spelled += hexOfByte(byte)
    return spelled
  } catch {
    return null
  }
}

// see FR-020, FR-086, S-99c, S-101
/** @purity semi-pure-b */
function watermarkUnlockDigest(): string {
  const set = readBrowserStored('S-99c')
  // TRAP: an empty stored digest must count as unset, or the empty password opens the gate.
  return set === null || set === '' ? WATERMARK_UNLOCK_DIGEST['S-101'] : set
}

export type WatermarkUnlockHands = Pick<FrameLoopHands, 'readSession' | 'readValues' | 'sendToSession' | 'ask'>

// see FR-020, U-60
/** @purity non-pure */
export function answerWatermarkUnlock(hands: WatermarkUnlockHands, isProceeding: boolean): boolean {
  if (openSurfaceNameIn(hands.readSession()) !== WATERMARK_UNLOCK_ROW) return false
  hands.sendToSession({ type: 'watermarkUnlockAnswered', isProceeding }, hands.readValues())
  if (!isProceeding) hands.ask()
  return true
}

// see FR-020, RS-41
/** @purity non-pure */
export async function matchWatermarkUnlock(hands: WatermarkUnlockHands, answer: string): Promise<void> {
  const given = await sha256HexOf(answer)
  // DEVIATION: spec says a reason with no row is RS-15 (T-233); here no SHA-256 reads as RS-41 (DFC-559)
  if (given === null || given !== watermarkUnlockDigest()) {
    hands.sendToSession({ type: 'watermarkUnlockMismatched' }, null)
    return
  }
  hands.sendToSession({ type: 'watermarkUnlockMatched' }, null)
  hands.ask()
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-207)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-207, FR-020
export const WATERMARK_UNLOCK_DIGEST: {
  readonly 'S-101': string
} = {
  'S-101': 'e2b7f98dfe8145444b33263989fe5e47f9150fe1ef6460713268af974e6df134',
}
// </generated>
