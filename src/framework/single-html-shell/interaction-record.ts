// SingleHtmlShell frame loop -- keeps the interaction record (FR-102) within S-207 and hands it to the clipboard.
// @unit      UF-160  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type {
  ScreenSession,
  ScreenValuesEvent,
} from '../../use-case/advance-screen-session/advance-screen-session'
import type { HumanInput } from '../../adapter/input-command-translator/input-command-translator'
import { writeClipboard } from '../../adapter/clipboard-gateway/clipboard-gateway'
import {
  dualCursorFollowingIn,
  isQuestionAskedIn,
  panelShowingIn,
  readMonotonicMs,
  standingNoticesIn,
  type FrameLoopHands,
} from './frame-loop'

// see FR-102, IR-1, IR-2, IR-3
// TRAP: the dash the record already writes for an empty value; IR-2's third value of S-99h is none.
const UNREAD_IN_RECORD = '-'

const PANEL_NOT_SHOWN_IN_RECORD = 'none'

// see IR-1
// TRAP: single-html-shell.ts answers this when the focus is on no field and no entrance.
export const FOCUS_ON_DOCUMENT_BODY = 'body'

/** @purity pure */
function paletteMinimisedForRecordOf(session: ScreenSession, whileHidden: boolean): boolean {
  const palette = session.screen.paletteDisplayState
  return palette.kind === 'hidden' ? whileHidden : palette.child.kind === 'minimised'
}

/** @purity pure */
export function isRecordingInteractionsIn(session: ScreenSession): boolean {
  return session.interactionRecord.interactionRecordingState.kind === 'recordingInteractions'
}

export type InteractionRecordHands = Pick<FrameLoopHands, 'readSession' | 'readEnvironment' | 'screen' | 'clipboard'>

export interface InteractionRecorder {
  appendRecordedLine(what: string, detail: string): void
  beginInteractionRecord(): void
  handInteractionRecordToClipboard(): void
  notePaletteEvent(event: ScreenValuesEvent): void
  isPaletteMinimisedWhileHidden(): boolean
}

/** @purity non-pure */
export function interactionRecorderOf(hands: InteractionRecordHands): InteractionRecorder {
  // DEVIATION: spec says a hidden palette has no minimise state (T-280); here the record keeps it (DFC-707)
  let paletteMinimisedWhileHidden = false
  const recordedLines: string[] = []
  let interactionRecordDropped = 0
  let interactionRecordBeganAt = 0
  let interactionRecordOffered = 0

  /** @purity non-pure */
  function appendRecordedLine(what: string, detail: string): void {
    interactionRecordOffered += 1
    const foundAt = Math.round(readMonotonicMs() - interactionRecordBeganAt)
    recordedLines.push(`${interactionRecordOffered}\t${foundAt}\t${what}\t${detail}`)
    while (recordedLines.length > NOT_STORED_INTERACTION_RECORD_LIMITS['S-207']) {
      recordedLines.shift()
      interactionRecordDropped += 1
    }
  }

  /** @purity semi-pure-b */
  function interactionRecordText(): string {
    const head = [
      'GRS interaction record (FR-102) -- no document contents are recorded',
      `lines: ${recordedLines.length} kept of ${interactionRecordOffered} offered, ` +
        `${interactionRecordDropped} dropped from the oldest end ` +
        `(cap ${NOT_STORED_INTERACTION_RECORD_LIMITS['S-207']}, S-207)`,
      'seq\tms\twhat\tdetail',
    ]
    return [...head, ...recordedLines].join('\n')
  }

  // see IC-76, FR-102
  /** @purity non-pure */
  function beginInteractionRecord(): void {
    recordedLines.length = 0
    interactionRecordDropped = 0
    interactionRecordOffered = 0
    interactionRecordBeganAt = readMonotonicMs()
    recordLine(hands, recorder, 'record', 'started entrance=IC-76')
  }

  /** @purity non-pure */
  function handInteractionRecordToClipboard(): void {
    appendRecordedLine('record', 'stopped entrance=IC-76')
    const text = interactionRecordText()
    recordedLines.length = 0
    interactionRecordDropped = 0
    interactionRecordOffered = 0
    const seam = hands.clipboard
    if (seam === undefined) return
    void writeClipboard(seam, { kind: 'record', text })
  }

  /** @purity non-pure */
  function notePaletteEvent(event: ScreenValuesEvent): void {
    if (event.type === 'paletteToggled') {
      paletteMinimisedWhileHidden = paletteMinimisedForRecordOf(hands.readSession(), paletteMinimisedWhileHidden)
    }
    if (event.type === 'paletteMinimiseToggled') paletteMinimisedWhileHidden = !paletteMinimisedWhileHidden
  }

  /** @purity semi-pure-b */
  function isPaletteMinimisedWhileHidden(): boolean {
    return paletteMinimisedWhileHidden
  }

  const recorder: InteractionRecorder = {
    appendRecordedLine,
    beginInteractionRecord,
    handInteractionRecordToClipboard,
    notePaletteEvent,
    isPaletteMinimisedWhileHidden,
  }
  return recorder
}

// see FR-102, S-207
/** @purity non-pure */
export function recordLine(
  hands: InteractionRecordHands,
  recorder: Pick<InteractionRecorder, 'appendRecordedLine'>,
  what: string,
  detail: string,
): void {
  if (!isRecordingInteractionsIn(hands.readSession())) return
  recorder.appendRecordedLine(what, detail)
}

/** @purity pure */
function recordedModifiers(modifiers: HumanInput['modifiers']): string {
  const held =
    (modifiers.ctrl ? 'C' : '') +
    (modifiers.shift ? 'S' : '') +
    (modifiers.alt ? 'A' : '') +
    (modifiers.meta ? 'M' : '')
  return held === '' ? '-' : held
}

// TRAP: a one-character key is typed text; recording it puts document contents in the record.
/** @purity pure */
function recordedKey(key: string): string {
  return key.length <= 1 ? '#' : key
}

/** @purity non-pure */
export function recordHappening(
  hands: InteractionRecordHands,
  recorder: Pick<InteractionRecorder, 'appendRecordedLine'>,
  input: HumanInput,
): void {
  if (!isRecordingInteractionsIn(hands.readSession())) return
  const mods = `mods=${recordedModifiers(input.modifiers)}`
  if (input.kind === 'pointer') {
    recordLine(hands, recorder,
      'in.pointer',
      `${input.phase} x=${Math.round(input.x)} y=${Math.round(input.y)} ` +
        `button=${input.button} clicks=${input.clickCount} ${mods}`,
    )
    return
  }
  if (input.kind === 'wheel') {
    recordLine(hands, recorder,
      'in.wheel',
      `x=${Math.round(input.x)} y=${Math.round(input.y)} notches=${input.notches} ${mods}`,
    )
    return
  }
  recordLine(hands, recorder, 'in.key', `key=${recordedKey(input.key)} ${mods}`)
}

/** @purity non-pure */
export function recordFrame(
  hands: InteractionRecordHands,
  recorder: Pick<InteractionRecorder, 'appendRecordedLine' | 'isPaletteMinimisedWhileHidden'>,
  svg: string,
  drawnLayout: ScheduleLayout,
): void {
  const session = hands.readSession()
  if (!isRecordingInteractionsIn(session)) return
  const drawn = new Map<string, number>()
  for (const found of svg.matchAll(/<([a-z]+)[\s/>]/g)) {
    const tag = found[1] ?? ''
    drawn.set(tag, (drawn.get(tag) ?? 0) + 1)
  }
  const census = [...drawn.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([tag, many]) => `${tag}=${many}`)
    .join(' ')
  recordLine(hands, recorder,
    'frame',
    `w=${hands.readEnvironment().width} h=${hands.readEnvironment().height} ` +
      `rows=${drawnLayout.rows.length} bars=${drawnLayout.placements.length} ` +
      `svgBytes=${svg.length} ${census} follow=${dualCursorFollowingIn(session) ?? '-'} ` +
      `minimised=${paletteMinimisedForRecordOf(session, recorder.isPaletteMinimisedWhileHidden())} ` +
      `glyphList=${session.screen.milestoneListDisplayState.kind === 'open'} ` +
      `notices=${standingNoticesIn(session).length} asking=${isQuestionAskedIn(session)} ` +
      `focus=${hands.screen?.readFocusPosition?.() ?? UNREAD_IN_RECORD} ` +
      `panel=${panelShowingIn(session) ?? PANEL_NOT_SHOWN_IN_RECORD} ` +
      `noticeReasons=${recordedNoticeReasons(hands)}`,
  )
}

// see IR-3
/** @purity semi-pure-b */
function recordedNoticeReasons(hands: InteractionRecordHands): string {
  const standing = standingNoticesIn(hands.readSession())
  if (standing.length === 0) return UNREAD_IN_RECORD
  return standing.map((one) => one.reason).join(',')
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_INTERACTION_RECORD_LIMITS: {
  readonly 'S-207': number
} = {
  'S-207': 2000,
}
// </generated>
