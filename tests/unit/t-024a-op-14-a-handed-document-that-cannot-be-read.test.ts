// Unit tests: a document handed at startup that cannot be read is told, and the startup descends.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { bare, specTable } from '../contract/spec-table'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  chooseStartupDocument,
  type StartupCandidates,
} from '../../src/use-case/choose-startup-document/choose-startup-document'
import {
  frameLoop,
  type FrameEnvironment,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'

const T_233 = specTable('T-233')

const T_233_MANNER = 1

const reasonRow = (specTableRowId: string): readonly string[] => {
  const row = T_233.rows.find((one) => one.id === specTableRowId)
  if (row === undefined) throw new Error(`table T-233 has no row ${specTableRowId}`)
  return row.cells
}

const mannerOf = (specTableRowId: string): string => bare(reasonRow(specTableRowId)[T_233_MANNER] ?? '')

interface ReasonWords {
  readonly specTableRowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep: Readonly<Record<DisplayLanguage, string>>
}

// Why: a notice carries words, not a row ID, so a case pins it to a T-233 row by that row's dictionary words;
// whether src/ holds the same words is checked by npm run words:check, not here.
const MANUSCRIPT_WORDS = JSON.parse(
  readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as { reasons: ReasonWords[] }

const wordsFor = (specTableRowId: string): ReasonWords => {
  const found = MANUSCRIPT_WORDS.reasons.find((one) => one.specTableRowId === specTableRowId)
  if (found === undefined) {
    throw new Error(`table T-233 row ${specTableRowId} has no entry in FR-038's dictionary`)
  }
  return found
}

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const templateDocument = (): Document => structuredClone(TEMPLATE) as unknown as Document

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as unknown as { requestAnimationFrame?: unknown })
  .requestAnimationFrame

function host(): { surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = (
    callback: (time: number) => void,
  ): number => {
    waiting.push(callback)
    return waiting.length
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
    },
  }
}

function screenPane(language: DisplayLanguage): {
  wiring: ScreenWiring
  last(): ScreenView
} {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => null as ScreenPart | null,
  }
  return {
    wiring: { surface, language },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) {
    delete (globalThis as unknown as { requestAnimationFrame?: unknown }).requestAnimationFrame
  } else {
    ;(globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = realRaf
  }
})

// Spec: OP-14, BT-2, BT-4, FR-062, FR-027, FR-087, T-034
// Why: the shell's map from notice code to T-233 row exports nothing, so only a Playwright case (TS-1, TS-3)
// reaches it; these cases hold the two reachable ends, UF-23's answer and the loop's telling (DFC-124).
describe('OP-14 -- a document handed at startup that cannot be read', () => {
  it('⭐ MUST: is not dropped in silence, and the startup descends rather than starting empty', () => {
    const template = templateDocument()
    const candidates: StartupCandidates = {
      embedded: { kind: 'none' },
      handed: { kind: 'unreadable' },
      template,
    }

    const choice = chooseStartupDocument(candidates)

    expect(choice.notices.length, 'the handed document was dropped in silence').toBe(1)
    expect(choice.row, 'BT-4 is the next rank of table T-034 below BT-2').toBe('BT-4')
    expect(choice.document, 'FR-027 (MUST): the startup never ends empty').toBe(template)
  })

  it('⛔ and a handed document that CAN be read is told nothing -- so the telling is about the failure', () => {
    // Why: without this, the case above stays green over a startup that tells something whatever happens.
    const handed = templateDocument()
    const choice = chooseStartupDocument({
      embedded: { kind: 'none' },
      handed: { kind: 'read', document: handed },
      template: templateDocument(),
    })

    expect(choice.row).toBe('BT-2')
    expect(choice.document).toBe(handed)
    expect(choice.notices).toEqual([])
  })
})

// Spec: OP-14, RS-26, NT-1, T-233, FR-038
describe('OP-14 -- the notice it raises is table T-233 row RS-26', () => {
  it('⭐ table T-233 holds RS-26, and OP-14 gives it NT-1 as its manner', () => {
    // Why: read rather than copied, so a retired or changed row fails here instead of passing on a copy.
    expect(reasonRow('RS-26').length, 'table T-233 has no row RS-26').toBeGreaterThan(0)
    expect(mannerOf('RS-26')).toBe('NT-1')
  })

  it.each(['ja', 'en'] as const)(
    '⭐ MUST: raising it puts NT-1 up in the dictionary s own words (%s)',
    (language) => {
      const pen = host()
      const screen = screenPane(language)
      const loop = frameLoop(pen.surface, templateDocument(), SCREEN, screen.wiring)
      pen.runAnimationFrames()

      expect(screen.last().notices, 'nothing was raised yet').toEqual([])

      loop.raiseStartupNotice('RS-26')
      pen.runAnimationFrames()

      const notices = screen.last().notices
      expect(notices.length, 'OP-14 (MUST): the failure was not told').toBe(1)
      expect(notices[0]?.text).toBe(wordsFor('RS-26').text[language])
      expect(notices[0]?.manner).toBe(mannerOf('RS-26'))
    },
  )

  it('⛔ and it is RS-26 s own words, not a word any reason would have done for', () => {
    // Why: without this, the case above stays green over a loop that tells one sentence for every T-233 row,
    // as a handedUnreadable pointed at the fallback row RS-15 would.
    const pen = host()
    const screen = screenPane('ja')
    const loop = frameLoop(pen.surface, templateDocument(), SCREEN, screen.wiring)
    pen.runAnimationFrames()

    loop.raiseStartupNotice('RS-26')
    pen.runAnimationFrames()

    const told = screen.last().notices[0]?.text
    expect(told).not.toBe(wordsFor('RS-15').text['ja'])
    expect(told).not.toBe(wordsFor('RS-25').text['ja'])
    expect(told).not.toBe(wordsFor('RS-21').text['ja'])
  })
})
