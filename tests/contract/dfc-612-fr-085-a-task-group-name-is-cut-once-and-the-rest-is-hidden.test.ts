// DFC-612: the drawn task group name carries the one cut and symbol FR-085 sets, no second symbol; width beyond it is hidden (FR-085).

import { describe, expect, it } from 'vitest'

import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { selfAndDescendants, styleMap, surfaceOf, wire, type FakeElement } from '../fixtures/fake-browser'

const CUT_LABEL = 'a very long name cut at the pa…'
const WHOLE_LABEL = 'a very long name cut at the panel width by the approximation'

const viewWith = (label: string, isLabelTruncated: boolean): ScreenView =>
  ({
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: {
      documentTitle: null,
      openedFileName: null,
      fileSavedAt: null,
      fileSavedByteLength: null,
      fileNeverSavedText: '',
      commands: [],
      language: 'ja',
    },
    taskGroupPanel: {
      pinnedTitles: [],
      titles: [
        {
          groupId: 'g1',
          depth: 2,
          fontPx: 13,
          indentPx: 20,
          box: { x: 0, y: 100, width: 220, height: 40 },
          label,
          wholeLabel: WHOLE_LABEL,
          isLabelTruncated,
          expander: { canOpen: false, canClose: false, canCloseBelow: false },
          isPinned: false,
          isSelected: false,
        },
      ],
    },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }) as unknown as ScreenView

const nameElementOf = (label: string, isLabelTruncated: boolean): { readonly name: FakeElement; readonly chain: readonly FakeElement[] } => {
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': 37 })
  surfaceOf(built).showScreenView(viewWith(label, isLabelTruncated))
  const holders = selfAndDescendants(built.root()).filter((one) =>
    one.childNodes.some((node) => 'data' in node && node.data === label),
  )
  const name = holders[0]
  if (name === undefined) throw new Error('the task group name was not drawn as one text')
  const chain: FakeElement[] = []
  for (let at: FakeElement | null = name; at !== null; at = at.parentNode) chain.push(at)
  return { name, chain }
}

describe('DFC-612: the drawn task group name is cut once, by the panel rule, and the excess is only hidden (FR-085)', () => {
  it('FR-085 the name is drawn exactly as the panel rule cut it, symbol included', () => {
    const { name } = nameElementOf(CUT_LABEL, true)
    expect(name.textContent).toBe(CUT_LABEL)
  })

  it('FR-085 (MUST NOT) no box around the name adds a second cut symbol of its own', () => {
    const { chain } = nameElementOf(CUT_LABEL, true)
    const adding = chain
      .map((one) => (styleMap(one).get('text-overflow') ?? '').trim().toLowerCase())
      .filter((value) => value !== '' && value !== 'clip' && value !== 'unset' && value !== 'initial')
    expect(adding).toEqual([])
  })

  it('FR-085 (MUST) the width beyond the usable room is hidden', () => {
    const { chain } = nameElementOf(CUT_LABEL, true)
    const hides = chain.some((one) => ['hidden', 'clip'].includes((styleMap(one).get('overflow') ?? styleMap(one).get('overflow-x') ?? '').trim().toLowerCase()))
    expect(hides).toBe(true)
  })

  it('FR-085 a name that was not cut is drawn whole', () => {
    const { name } = nameElementOf('short', false)
    expect(name.textContent).toBe('short')
  })
})
