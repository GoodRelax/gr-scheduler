// SingleHtmlShell -- holds the WBS parent view: the toggle, the drawn families and the QN-12 chooser (FR-135).
// @unit      UF-197  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import {
  wbsParentResolutionsOf,
  type Schedule,
  type WbsParentResolution,
} from '../../entity/document-model/schedule/schedule'
import { taskUidsIn, type Selection } from '../../entity/document-model/selection/selection'
import type { WbsParentFamilies } from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import type { HumanInput } from '../../adapter/input-command-translator/input-command-translator'
import type { IconId, ScreenViewReadings } from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'

const WBS_PARENT_LINKS_ENTRY: IconId = 'IC-141'

// WHY: the dictionary part of the arrows' choice; either wording of the first choice keeps the tasks.
const WBS_PARENT_LINKS_ANSWER = 'links'

const ESCAPE_KEY = 'Esc'

const NOTHING_PICKED: Selection = { items: [], ordered: true }

type Point = { readonly x: number; readonly y: number }

type PointedHolder = { readonly kind: string; readonly taskUid: number }

type PointedItem = { readonly item: { readonly kind: string } }

interface HeldChoice {
  readonly mixed: Selection
  readonly at: Point
}

interface HeldResolutions {
  readonly of: Schedule
  readonly resolutions: ReadonlyMap<number, WbsParentResolution>
}

export type WbsParentChoiceStep =
  | { readonly kind: 'kept' }
  | { readonly kind: 'closed' }
  | { readonly kind: 'picked'; readonly picked: Selection }

export type WbsParentReadings = Pick<ScreenViewReadings, 'isDelayDiagnosticsShown' | 'isWbsParentLinksShown'> & {
  readonly wbsParentChoice: NonNullable<ScreenViewReadings['wbsParentChoice']> | null
}

/** @purity pure */
function isSameNumbers(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((one, at) => one === b[at])
}

// see FR-135, T-351
// WHY: the owners kept while arrows are picked are the ones drawn just before, so a Shift click reaches a second arrow.
/** @purity pure */
export function wbsParentFamiliesOf(
  resolutions: ReadonlyMap<number, WbsParentResolution>,
  selection: Selection,
  pointedUid: number | null,
  held: WbsParentFamilies | null,
  heldAnchorUids: readonly number[],
): { readonly families: WbsParentFamilies; readonly anchorUids: readonly number[] } {
  const taskUids = taskUidsIn(selection)
  const linkChildUids = selection.items.flatMap((one) => (one.kind === 'wbsParentLink' ? [one.childUid] : []))
  const anchorUids = linkChildUids.length === 0 ? [] : heldAnchorUids.length > 0 ? heldAnchorUids : (held?.ownerUids ?? [])
  const pointed = pointedUid === null ? [] : [pointedUid]
  const ownerUids = [...new Set([...taskUids, ...anchorUids, ...linkChildUids, ...pointed])]
  const isUnmoved = held !== null && held.resolutions === resolutions && held.pointedUid === pointedUid &&
    isSameNumbers(held.ownerUids, ownerUids) && isSameNumbers([...held.selectedLinkChildUids], linkChildUids)
  if (isUnmoved) return { families: held, anchorUids }
  return { families: { resolutions, ownerUids, pointedUid, selectedLinkChildUids: new Set(linkChildUids) }, anchorUids }
}

// see WL-13
/** @purity pure */
export function isMixedParentPick(picked: Selection): boolean {
  return picked.items.some((one) => one.kind === 'task') && picked.items.some((one) => one.kind === 'wbsParentLink')
}

// see WL-13, QN-12
/** @purity pure */
export function selectionOfParentChoice(mixed: Selection, answer: string): Selection {
  const kept = answer === WBS_PARENT_LINKS_ANSWER ? 'wbsParentLink' : 'task'
  return { items: mixed.items.filter((one) => one.kind === kept), ordered: mixed.ordered }
}

// see WL-13, WL-14, IN-4
// WHY: the chooser takes every key and press while it stands; a press outside closes it and does nothing else.
/** @purity pure */
export function choiceStepOf(mixed: Selection, input: HumanInput, answer: string | null): WbsParentChoiceStep | null {
  if (input.kind === 'key') return input.key === ESCAPE_KEY ? { kind: 'closed' } : { kind: 'kept' }
  if (input.kind !== 'pointer' || (input.phase !== 'down' && input.phase !== 'up')) return null
  if (answer === null) return { kind: 'closed' }
  return input.phase === 'up' ? { kind: 'picked', picked: selectionOfParentChoice(mixed, answer) } : { kind: 'kept' }
}

/** @purity pure */
function isWbsParentArmed(session: ScreenSession): boolean {
  return session.screen.armModeState.kind === 'wbsParentArmed'
}

// see FR-135, S-484, AR-7
/** @purity non-pure */
function wbsParentViewOf() {
  let isShown = false
  let held: HeldResolutions | null = null
  let families: WbsParentFamilies | null = null
  let anchorUids: readonly number[] = []
  return {
    /** @purity non-pure */
    isToggledBy(entry: IconId): boolean {
      if (entry !== WBS_PARENT_LINKS_ENTRY) return false
      isShown = !isShown
      return true
    },
    /** @purity semi-pure-b */
    isShown(): boolean {
      return isShown
    },
    /** @purity non-pure */
    familiesFor(schedule: Schedule, session: ScreenSession, pointed: PointedHolder | null,
                under: PointedItem | null): WbsParentFamilies | null {
      if (!isShown && !isWbsParentArmed(session)) {
        families = null
        anchorUids = []
        return null
      }
      if (held?.of !== schedule) held = { of: schedule, resolutions: wbsParentResolutionsOf({ schedule }) }
      const state = session.selection.selectionState
      const chosen = state.kind === 'objectsSelected' ? state.selectedObjects : NOTHING_PICKED
      // WHY: a pointer moved from a task onto one of its arrows still points at that family, or no arrow could be pressed.
      const isOnArrow = under?.item.kind === 'wbsParentLink'
      const pointedUid = isOnArrow ? (families?.pointedUid ?? null) : pointed?.kind === 'task' ? pointed.taskUid : null
      const next = wbsParentFamiliesOf(held.resolutions, chosen, pointedUid, families, anchorUids)
      families = next.families
      anchorUids = next.anchorUids
      return families
    },
  }
}

// see QN-12, WL-13, WL-14
/** @purity non-pure */
function wbsParentChooserOf() {
  let choice: HeldChoice | null = null
  return {
    /** @purity semi-pure-b */
    choiceReading(session: ScreenSession): WbsParentReadings['wbsParentChoice'] {
      return choice === null ? null : { at: choice.at, isArmed: isWbsParentArmed(session) }
    },
    /** @purity non-pure */
    pickedAfter(picked: Selection, before: Selection, at: Point | null): Selection {
      if (!isMixedParentPick(picked)) return picked
      choice = { mixed: picked, at: at ?? { x: 0, y: 0 } }
      return before
    },
    /** @purity non-pure */
    choiceStepFor(input: HumanInput, answer: string | null): WbsParentChoiceStep | null {
      if (choice === null) return null
      const step = choiceStepOf(choice.mixed, input, answer)
      if (step !== null && step.kind !== 'kept') choice = null
      return step
    },
    /** @purity semi-pure-b */
    isChoiceStanding(): boolean {
      return choice !== null
    },
  }
}

// see FR-135, S-484, QN-12
/** @purity non-pure */
export function wbsParentHoldOf() {
  const view = wbsParentViewOf()
  const chooser = wbsParentChooserOf()
  return {
    ...view,
    ...chooser,
    /** @purity semi-pure-b */
    readings(session: ScreenSession, isDelayDiagnosticsShown: boolean): WbsParentReadings {
      return {
        isDelayDiagnosticsShown,
        isWbsParentLinksShown: view.isShown(),
        wbsParentChoice: chooser.choiceReading(session),
      }
    },
  }
}
