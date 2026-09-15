// Unit tests for UF-45 `clipboard-gateway.ts` (the public entry) and UF-46

import { describe, expect, it } from 'vitest'

import * as clipboardGateway from '../../src/adapter/clipboard-gateway/clipboard-gateway'
import {
  writeClipboard,
  type Clipboard,
  type ClipboardContent,
  type ClipboardFault,
  type ClipboardWriting,
} from '../../src/adapter/clipboard-gateway/clipboard-gateway'
import {
  exportPng,
  exportSvg,
  type ExportScene,
  type Rasterizer,
} from '../../src/adapter/image-exporter/image-exporter'
import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from '../contract/spec-table'
import { rowNameFont } from '../fixtures/row-name-font'


const T_008_R9 = {
  id: 'CHN-9',
  from: 'DEV-1',
  to: 'the OS clipboard',
  carries: ['picture', 'document'],
  isOutboundOnly: true,
  isValidatedIntake: false,
} as const

const T_024_IO_6 = {
  id: 'IO-6',
  route: 'clipboard',
  canWrite: true,
  canRead: false,
} as const

const T_064_PI_24 = {
  id: 'PI-24',
  component: 'ClipboardGateway',
  published: ['Clipboard', 'writeClipboard'],
  runtimeNames: ['writeClipboard'],
} as const

const T_065_IF_5 = {
  id: 'IF-5',
  seam: 'Clipboard',
  declaredBy: 'ClipboardGateway',
  implementedBy: 'BrowserClipboard',
  member: 'writeClipboardContent',
} as const

const CLIPBOARD_FAULTS: readonly ClipboardFault[] = [
  'notPermitted',
  'unsupported',
  'writeFailed',
]

const T_037_ROWS: readonly {
  readonly id: string
  readonly owes: string
  readonly holds: (faults: readonly ClipboardFault[]) => boolean
}[] = [
  {
    id: 'NT-1',
    owes: 'the refusal says which of the three happened, so words can name it',
    holds: (faults) => faults.every((fault) => /^[a-z][A-Za-z]*$/.test(fault)),
  },
  {
    id: 'NT-3a',
    owes: 'the three are told apart, so each can carry a different next step',
    holds: (faults) => new Set(faults).size === faults.length,
  },
]


const BOUNDARY_TEXTS: readonly { readonly why: string; readonly text: string }[] = [
  { why: 'empty', text: '' },
  { why: 'one character', text: 'x' },
  {
    why: 'a picture as SvgRenderer would have made it (PI-19)',
    text: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"></svg>',
  },
  { why: 'text outside ASCII', text: '\u65e5\u7a0b \u2014 \u00dcnicode \u2713' },
  { why: 'a long payload -- no cap is set for this route', text: 'x'.repeat(200_000) },
]

const EVERY_CONTENT: readonly { readonly why: string; readonly content: ClipboardContent }[] = [
  ...BOUNDARY_TEXTS.map(({ why, text }) => ({
    why: `picture, ${why}`,
    content: { kind: 'picture', svg: text } as ClipboardContent,
  })),
  ...BOUNDARY_TEXTS.map(({ why, text }) => ({
    why: `document, ${why}`,
    content: { kind: 'document', text } as ClipboardContent,
  })),
]

const PICTURE: ClipboardContent = { kind: 'picture', svg: '<svg/>' }
const DOCUMENT: ClipboardContent = { kind: 'document', text: 'a document for an AI' }

const stringOf = (content: ClipboardContent): string =>
  content.kind === 'picture' ? content.svg : content.text


interface Recording {
  readonly clipboard: Clipboard
  readonly received: ClipboardContent[]
}

function answeringClipboard(answer: ClipboardWriting): Recording {
  const received: ClipboardContent[] = []
  return {
    received,
    clipboard: {
      writeClipboardContent: (content: ClipboardContent): Promise<ClipboardWriting> => {
        received.push(content)
        return Promise.resolve(answer)
      },
    },
  }
}

function rejectingClipboard(reason: unknown): Clipboard {
  return {
    writeClipboardContent: (): Promise<ClipboardWriting> => Promise.reject(reason),
  }
}

function throwingClipboard(reason: unknown): Clipboard {
  return {
    writeClipboardContent: (): Promise<ClipboardWriting> => {
      throw reason
    },
  }
}

function watchedClipboard(answer: ClipboardWriting): {
  readonly clipboard: Clipboard
  readonly touched: string[]
} {
  const touched: string[] = []
  const inner: Clipboard = {
    writeClipboardContent: (): Promise<ClipboardWriting> => Promise.resolve(answer),
  }
  const clipboard = new Proxy(inner, {
    get(target, key, receiver): unknown {
      if (typeof key === 'string') touched.push(key)
      return Reflect.get(target, key, receiver) as unknown
    },
  })
  return { clipboard, touched }
}

const EVERY_REASON: readonly { readonly why: string; readonly reason: unknown }[] = [
  { why: 'an Error', reason: new Error('NotAllowedError: write permission denied') },
  { why: 'a string', reason: 'the clipboard is not available here' },
  { why: 'undefined', reason: undefined },
  { why: 'null', reason: null },
  { why: 'an object that is not an Error', reason: { name: 'NotAllowedError' } },
]


describe('the rosters these cases walk are the ones the tables state', () => {
  it('carries CHN-9\'s two payloads, the three faults, and both T-037 rows', () => {
    expect(T_008_R9.carries).toHaveLength(2)
    expect(CLIPBOARD_FAULTS).toHaveLength(3)
    expect(new Set(CLIPBOARD_FAULTS).size).toBe(3)
    expect(T_037_ROWS).toHaveLength(2)
    expect(EVERY_CONTENT).toHaveLength(BOUNDARY_TEXTS.length * T_008_R9.carries.length)
    expect(EVERY_REASON.length).toBeGreaterThan(0)
  })

  it('builds one content of every kind CHN-9 names, in the row\'s order', () => {
    const kinds = EVERY_CONTENT.map(({ content }) => content.kind)
    expect([...new Set(kinds)]).toEqual([...T_008_R9.carries])
  })
})


describe('PI-24 of table T-064 -- the whole of what ClipboardGateway publishes', () => {
  it('publishes `writeClipboard`, and no second runtime member', () => {
    expect(Object.keys(clipboardGateway).sort()).toEqual([...T_064_PI_24.runtimeNames].sort())
    expect(typeof writeClipboard).toBe('function')
  })

  it('re-exports the seam declared in this folder (Chapter 5.3, MUST)', () => {
    const seam: Clipboard | null = null
    const content: ClipboardContent | null = null
    const fault: ClipboardFault | null = null
    const writing: ClipboardWriting | null = null
    expect([seam, content, fault, writing]).toEqual([null, null, null, null])
  })

  it('takes the seam first and the content second', () => {
    expect(writeClipboard.length).toBe(2)
  })
})


describe('FR-033 -- the OS clipboard is written and never read', () => {
  it('publishes no member that would read the clipboard', () => {
    for (const name of Object.keys(clipboardGateway)) {
      expect(/read|paste|receive/i.test(name), `${T_024_IO_6.id}: ${name}`).toBe(false)
    }
    expect(T_024_IO_6.canRead).toBe(false)
    expect(T_008_R9.isOutboundOnly).toBe(true)
  })

  it('touches the one member of the seam and nothing else on it', async () => {
    const { clipboard, touched } = watchedClipboard({ ok: true })
    await writeClipboard(clipboard, PICTURE)
    expect(touched).toEqual([T_065_IF_5.member])
  })

  it('asks the seam once per call -- one request, one write', async () => {
    const { clipboard, received } = answeringClipboard({ ok: true })
    await writeClipboard(clipboard, PICTURE)
    expect(received).toHaveLength(1)
    await writeClipboard(clipboard, DOCUMENT)
    expect(received).toHaveLength(2)
  })

  it('refuses nothing of its own -- CHN-9 is send only, so FR-023 does not reach it', async () => {
    expect(T_008_R9.isValidatedIntake).toBe(false)
    for (const { why, content } of EVERY_CONTENT) {
      const { clipboard, received } = answeringClipboard({ ok: true })
      const writing = await writeClipboard(clipboard, content)
      expect(received, why).toHaveLength(1)
      expect(writing, why).toEqual({ ok: true })
    }
  })
})


describe('CHN-9 of table T-008 -- both payloads leave, exactly as they arrived', () => {
  it('hands every payload of both kinds to the seam (one case walks the row)', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      const { clipboard, received } = answeringClipboard({ ok: true })
      await writeClipboard(clipboard, content)
      expect(received[0], why).toEqual(content)
      expect(received[0], why).toBe(content)
    }
  })

  it('sends the same picture it was given -- nothing is made again here (FR-025)', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      const { clipboard, received } = answeringClipboard({ ok: true })
      await writeClipboard(clipboard, content)
      const sent = received[0]
      expect(sent?.kind, why).toBe(content.kind)
      expect(sent === undefined ? '' : stringOf(sent), why).toBe(stringOf(content))
    }
  })

  it('leaves the content it was handed as it found it', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      const frozen = Object.freeze({ ...content }) as ClipboardContent
      const { clipboard } = answeringClipboard({ ok: true })
      await expect(writeClipboard(clipboard, frozen), why).resolves.toEqual({ ok: true })
      expect(frozen, why).toEqual(content)
    }
  })

  it('answers a promise rather than acting into the dark', () => {
    const { clipboard } = answeringClipboard({ ok: true })
    const answer = writeClipboard(clipboard, DOCUMENT)
    expect(typeof answer.then).toBe('function')
    return answer
  })
})


describe('FR-028 -- a refusal is a value, and this entry never throws', () => {
  it('gives back the seam\'s success as it stands', async () => {
    const { clipboard } = answeringClipboard({ ok: true })
    const writing = await writeClipboard(clipboard, PICTURE)
    expect(writing).toEqual({ ok: true })
    expect(Object.keys(writing)).toEqual(['ok'])
  })

  it('gives back each fault the seam names, unchanged (one case walks the three)', async () => {
    for (const fault of CLIPBOARD_FAULTS) {
      const { clipboard } = answeringClipboard({ ok: false, fault })
      const writing = await writeClipboard(clipboard, PICTURE)
      expect(writing, fault).toEqual({ ok: false, fault })
    }
  })

  it('resolves a value when the seam\'s promise rejects, for every reason', async () => {
    for (const { why, reason } of EVERY_REASON) {
      const writing = await writeClipboard(rejectingClipboard(reason), PICTURE)
      expect(writing, why).toEqual({ ok: false, fault: 'writeFailed' })
    }
  })

  it('resolves a value when the seam throws before it returns a promise', async () => {
    for (const { why, reason } of EVERY_REASON) {
      const writing = await writeClipboard(throwingClipboard(reason), DOCUMENT)
      expect(writing, why).toEqual({ ok: false, fault: 'writeFailed' })
    }
  })

  it('never throws and never rejects, for any payload and any reason', async () => {
    for (const { why, content } of EVERY_CONTENT) {
      for (const { why: whyReason, reason } of EVERY_REASON) {
        const where = `${why} / ${whyReason}`
        const rejected = writeClipboard(rejectingClipboard(reason), content)
        await expect(rejected, where).resolves.toHaveProperty('ok', false)
        const thrown = writeClipboard(throwingClipboard(reason), content)
        await expect(thrown, where).resolves.toHaveProperty('ok', false)
      }
    }
  })

  it('lets no message from the far side reach the caller', async () => {
    const sentence = 'NotAllowedError: Write permission denied.'
    const writing = await writeClipboard(rejectingClipboard(new Error(sentence)), PICTURE)
    expect(Object.keys(writing).sort()).toEqual(['fault', 'ok'])
    expect(JSON.stringify(writing)).not.toContain('NotAllowed')
    expect(JSON.stringify(writing)).not.toContain(sentence)
  })
})


describe('table T-037 -- the refusal carries what the notice needs', () => {
  it('holds every row of the fixed copy (one case walks both)', () => {
    for (const row of T_037_ROWS) {
      expect(row.holds(CLIPBOARD_FAULTS), `${row.id}: ${row.owes}`).toBe(true)
    }
  })

  it('names which refusal happened, and carries no prose of its own (NT-1)', async () => {
    for (const fault of CLIPBOARD_FAULTS) {
      const { clipboard } = answeringClipboard({ ok: false, fault })
      const writing = await writeClipboard(clipboard, DOCUMENT)
      expect(writing.ok, fault).toBe(false)
      if (writing.ok) continue
      expect(writing.fault, fault).toBe(fault)
      expect(writing.fault, fault).not.toContain(' ')
      expect(Object.keys(writing).sort(), fault).toEqual(['fault', 'ok'])
    }
  })

  it('tells success and refusal apart by `ok` alone, never by an absence', async () => {
    const good = await writeClipboard(answeringClipboard({ ok: true }).clipboard, PICTURE)
    expect(good.ok).toBe(true)
    expect(good).not.toHaveProperty('fault')
    for (const fault of CLIPBOARD_FAULTS) {
      const bad = await writeClipboard(answeringClipboard({ ok: false, fault }).clipboard, PICTURE)
      expect(bad.ok, fault).toBe(false)
      expect(bad, fault).toHaveProperty('fault')
    }
  })

  it('reports a rejection as one of the three, so a next step exists (NT-3a)', async () => {
    for (const { why, reason } of EVERY_REASON) {
      const writing = await writeClipboard(rejectingClipboard(reason), PICTURE)
      expect(writing.ok, why).toBe(false)
      if (writing.ok) continue
      expect(CLIPBOARD_FAULTS, why).toContain(writing.fault)
    }
  })
})


const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const existing = built[head]
    const group = (typeof existing === 'object' && existing !== null ? existing : {}) as Record<
      string,
      unknown
    >
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const EXPORT_SETTINGS = nestedFrom(SETTINGS_DEFAULTS) as unknown as DocumentSettings

const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)

const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 has no row S-73')
  const found = /-?\d+(?:\.\d+)?/.exec((row.by[DEFAULT_COLUMN] ?? '').replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error('table T-216 row S-73 states no number')
  return value
})()

const EXPORT_SCREEN = { width: 1000, height: 800, appHeaderHeight: 56 } as const

const EXPORT_REGIONS: ScreenRegions = (() => {
  const canvasHeight = EXPORT_SCREEN.height - EXPORT_SCREEN.appHeaderHeight
  const rowAreaWidth =
    EXPORT_SCREEN.width - EXPORT_SETTINGS.canvasPadding - EXPORT_SETTINGS.rowTitlePanelWidth
  return {
    appHeader: { x: 0, y: 0, width: EXPORT_SCREEN.width, height: EXPORT_SCREEN.appHeaderHeight },
    scheduleCanvas: {
      x: 0,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: EXPORT_SCREEN.width,
      height: canvasHeight,
    },
    rowTitlePanel: {
      x: 0,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: EXPORT_SETTINGS.rowTitlePanelWidth,
      height: canvasHeight,
    },
    timeRuler: {
      x: EXPORT_SETTINGS.rowTitlePanelWidth,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: rowAreaWidth,
      height: EXPORT_SETTINGS.rulerHeight,
    },
    propertiesPanel: {
      x: EXPORT_SCREEN.width,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: 0,
      height: canvasHeight,
    },
    rowArea: {
      x: EXPORT_SETTINGS.rowTitlePanelWidth,
      y: EXPORT_SCREEN.appHeaderHeight + EXPORT_SETTINGS.rulerHeight,
      width: rowAreaWidth,
      height: canvasHeight - EXPORT_SETTINGS.rulerHeight - EXPORT_SETTINGS.canvasPadding,
    },
  }
})()

const EXPORT_VIEW: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: 'a document on its way to the clipboard',
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  },
  rowTitlePanel: {
    pinnedTitles: [],
    titles: [
      {
        groupId: 'g1',
        depth: 1,
        ...rowNameFont(1),
        indentPx: EXPORT_SETTINGS.rowTitleIndent,
        box: { x: 0, y: 120, width: EXPORT_SETTINGS.rowTitlePanelWidth, height: 60 },
        label: 'a row that reaches the picture',
        wholeLabel: 'a row that reaches the picture',
        isLabelTruncated: false,
        expander: { canOpen: true, canClose: true, canCloseBelow: false },
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
}

const EXPORT_SCENE: ExportScene = {
  svg: '<svg xmlns="http://www.w3.org/2000/svg" data-from="svg-renderer"><circle cx="7" cy="11" r="3"/></svg>',
  regions: EXPORT_REGIONS,
  screenView: EXPORT_VIEW,
  settings: EXPORT_SETTINGS,
  themeHue: THEME_HUE,
}

const sceneOfScreenHeight = (screenHeight: number): ExportScene => {
  const canvasHeight = screenHeight - EXPORT_SCREEN.appHeaderHeight
  const withHeight = (rect: ScreenRegions['rowArea']): ScreenRegions['rowArea'] => ({
    ...rect,
    height: canvasHeight,
  })
  return {
    ...EXPORT_SCENE,
    regions: {
      ...EXPORT_REGIONS,
      scheduleCanvas: withHeight(EXPORT_REGIONS.scheduleCanvas),
      rowTitlePanel: withHeight(EXPORT_REGIONS.rowTitlePanel),
      propertiesPanel: withHeight(EXPORT_REGIONS.propertiesPanel),
      rowArea: {
        ...EXPORT_REGIONS.rowArea,
        height: canvasHeight - EXPORT_SETTINGS.rulerHeight - EXPORT_SETTINGS.canvasPadding,
      },
    },
  }
}

const rootSizeOf = (svg: string): { readonly width: number; readonly height: number } => {
  const root = /<svg((?:[^<>"]|"[^"]*")*)>/.exec(svg)?.[1] ?? ''
  const attr = (name: string): number =>
    Number.parseFloat(new RegExp(`${name}="([^"]*)"`).exec(root)?.[1] ?? 'NaN')
  return { width: attr('width'), height: attr('height') }
}

const STILL_RASTERIZER: Rasterizer = {
  rasterizePng: () => Promise.resolve({ ok: true, pngBytes: Uint8Array.from([0x89, 0x50]) }),
}

const fitOrThrow = <T extends { readonly ok: boolean }>(result: T): Extract<T, { readonly ok: true }> => {
  if (!result.ok) {
    throw new Error('CR-337: exportSvg/exportPng refused a picture this fixture expected to fit (S-217)')
  }
  return result as Extract<T, { readonly ok: true }>
}

describe('IO-6 of table T-024 -- the picture on this route is IO-3\'s own', () => {
  it('GIVEN the picture ImageExporter assembled WHEN it leaves by the clipboard THEN the seam is handed that very string (IO-6, FR-025 :3145)', async () => {
    const assembled = fitOrThrow(exportSvg(EXPORT_SCENE))
    const { clipboard, received } = answeringClipboard({ ok: true })

    await writeClipboard(clipboard, { kind: 'picture', svg: assembled.svg })

    expect(received).toHaveLength(1)
    const sent = received[0]
    expect(sent?.kind).toBe('picture')
    expect(sent === undefined ? '' : stringOf(sent)).toBe(assembled.svg)
  })

  it('GIVEN IO-6 payload WHEN its root is read THEN it is exportCanvas wide and tall, as IO-3 is (S-81 of table T-204)', async () => {
    const assembled = fitOrThrow(exportSvg(EXPORT_SCENE))
    const { clipboard, received } = answeringClipboard({ ok: true })

    await writeClipboard(clipboard, { kind: 'picture', svg: assembled.svg })

    const sent = received[0]
    const size = rootSizeOf(sent === undefined ? '' : stringOf(sent))
    expect(size.width).toBe(EXPORT_SETTINGS.exportCanvas.width)
    expect(size.height).toBeGreaterThanOrEqual(EXPORT_SETTINGS.exportCanvas.height)
    expect(size.height).toBeLessThanOrEqual(EXPORT_SETTINGS.exportCanvasHeightCap)
  })

  it('GIVEN one state WHEN IO-3, IO-4 and IO-6 each take their picture THEN all three carry one drawing (WY-2 of table T-041)', async () => {
    const assembled = fitOrThrow(exportSvg(EXPORT_SCENE))
    const both = fitOrThrow(await exportPng(STILL_RASTERIZER, EXPORT_SCENE))
    const { clipboard, received } = answeringClipboard({ ok: true })

    await writeClipboard(clipboard, { kind: 'picture', svg: assembled.svg })

    expect(both.svg).toBe(assembled.svg)
    const sent = received[0]
    expect(sent === undefined ? '' : stringOf(sent)).toBe(both.svg)
  })

  it('GIVEN a scene too tall for S-217 WHEN IO-6 is taken THEN nothing reaches the clipboard (FR-025 MUST, CR-337)', async () => {
    const ratio = EXPORT_SETTINGS.exportCanvas.width / EXPORT_SCREEN.width
    const overCeiling = EXPORT_SETTINGS.exportCanvasHeightCap / ratio + 1
    expect(overCeiling * ratio, 'the fixture is past S-217').toBeGreaterThan(
      EXPORT_SETTINGS.exportCanvasHeightCap,
    )

    const sentFor = async (screenHeight: number): Promise<readonly ClipboardContent[]> => {
      const { clipboard, received } = answeringClipboard({ ok: true })
      const answer = exportSvg(sceneOfScreenHeight(screenHeight))
      if (answer.ok) await writeClipboard(clipboard, { kind: 'picture', svg: answer.svg })
      return received
    }

    expect(await sentFor(overCeiling), 'nothing may go out for a scene that will not fit').toHaveLength(0)
    expect(await sentFor(EXPORT_SCREEN.height), 'a scene that fits still goes out').toHaveLength(1)
  })

  it('GIVEN the clipboard refuses WHEN an assembled picture is sent THEN the refusal is a value and the picture is untouched (FR-028)', async () => {
    const assembled = fitOrThrow(exportSvg(EXPORT_SCENE))
    for (const fault of CLIPBOARD_FAULTS) {
      const { clipboard } = answeringClipboard({ ok: false, fault })
      const writing = await writeClipboard(clipboard, { kind: 'picture', svg: assembled.svg })
      expect(writing, fault).toEqual({ ok: false, fault })
    }
    expect(fitOrThrow(exportSvg(EXPORT_SCENE)).svg).toBe(assembled.svg)
  })
})
