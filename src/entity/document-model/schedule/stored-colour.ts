// Schedule -- the stored spelling of a chosen colour: a palette name or a light/dark custom pair.
// @unit      UF-130  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import { COLUMN_SHAPES } from './schedule-entities'

export const TRANSPARENT = 'transparent'

// see CV-2
export interface CustomColour {
  readonly light: string | null
  readonly dark: string | null
}

const SIDE_HEX = /^#[0-9a-fA-F]{6}$/

const CUSTOM_SIDES_CUT = '/'

// see CV-1, T-294
const PALETTE_SPELLINGS: readonly string[] = COLUMN_SHAPES.TaskVisual['fillColor']?.choices ?? []

// see CV-2
/** @purity pure */
export function customColourOf(stored: string): CustomColour | null {
  const sides = stored.split(CUSTOM_SIDES_CUT)
  if (sides.length !== 2) return null
  const [light = '', dark = ''] = sides
  if (light === '' && dark === '') return null
  if ((light !== '' && !SIDE_HEX.test(light)) || (dark !== '' && !SIDE_HEX.test(dark))) return null
  return {
    light: light === '' ? null : light.toLowerCase(),
    dark: dark === '' ? null : dark.toLowerCase(),
  }
}

// see CV-3
/** @purity pure */
export function customSideOf(colour: CustomColour, dark: boolean): string {
  const drawn = dark ? (colour.dark ?? colour.light) : (colour.light ?? colour.dark)
  return drawn ?? ''
}

// see CV-1, CV-2, FR-019
/** @purity pure */
export function isStoredColour(text: string, allowsTransparent: boolean): boolean {
  if (PALETTE_SPELLINGS.includes(text)) return allowsTransparent || text !== TRANSPARENT
  return customColourOf(text) !== null
}

// see CV-4
// WHY: null when chosen is not one #rrggbb, i.e. not a pick from the custom entrance.
/** @purity pure */
export function customColourChosen(previous: string | null, chosen: string, dark: boolean): string | null {
  if (!SIDE_HEX.test(chosen)) return null
  const kept = previous === null ? null : customColourOf(previous)
  const hex = chosen.toLowerCase()
  const light = dark ? (kept?.light ?? null) : hex
  const darkSide = dark ? hex : (kept?.dark ?? null)
  return `${light ?? ''}${CUSTOM_SIDES_CUT}${darkSide ?? ''}`
}
