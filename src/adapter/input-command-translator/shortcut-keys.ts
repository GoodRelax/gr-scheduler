// File: InputCommandTranslator: turns a key press into an operation by table T-036.
// @unit      UF-90   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { escapeTarget } from '../../entity/document-model/screen-state/screen-state'
import { taskByUid } from '../../entity/document-model/schedule/schedule'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
import type { KeyInput } from './input-source'
import {
  CONSUMED_ELSEWHERE,
  KEY,
  UNASSIGNED,
  acted,
  changed,
  changedInOrder,
  escapeContextOf,
  isCombo,
  isSingleCharacterKey,
  type InputContext,
  type TranslatedInput,
} from './input-command-translator'
import { displayScaleStep } from './display-scale-steps'
import {
  fitWrites,
  keyZoomFactor,
  verticalZoomAnswer,
  statusLineWrites,
  zoomTimes,
  zoomWrites,
} from './zoom-and-fit'

// Spec: T-036, IN-5a, IN-4, MK-10, SK-24, IMPS-1874, IMPS-1875, IMPS-1876, SK-10, SK-20, SK-21, SK-6, SK-7, SK-9, IMPS-1887
/** @purity pure */
export function commandFromKey(input: KeyInput, context: InputContext): TranslatedInput {
  const key = input.key
  const modifiers = input.modifiers
  const plain = isCombo(modifiers, false, false, false)
  const ctrl = isCombo(modifiers, true, false, false)
  const ctrlShift = isCombo(modifiers, true, true, false)

  // Why: a field asked for but not yet focused takes its keys too, or the first letter typed
  // after MK-13 or HF-14 reaches SK-14 or SK-18 instead of the name.
  if (context.isTextEntryUnsettled || context.isTextFieldFocusWanted === true) {
    if ((plain || isCombo(modifiers, false, true, false)) && isSingleCharacterKey(key)) return UNASSIGNED
    if (plain && (key === KEY.del || key === KEY.backspace)) return UNASSIGNED
  }
  if (context.isTextEntryUnsettled) {
    if (ctrl && (key === KEY.c || key === KEY.v || key === KEY.a)) return UNASSIGNED
  }

  if (plain && key === KEY.enter) {
    if (context.isNoticeStanding === true) return acted({ kind: 'dismissNotice' })
    if (context.isTextEntryUnsettled) return acted({ kind: 'settleTextEntry' })
    // Why: same kind as the settle stage; only the shell knows whether its commit settled anything.
    if (context.isPropertiesPanelShowing === true) return acted({ kind: 'settleTextEntry' })
    // Trap: with nothing chosen (task groups too) Enter stays unassigned, or tabbed-to controls lose activation.
    return escapeContextOf(context).isSelectionStanding === true ? CONSUMED_ELSEWHERE : UNASSIGNED
  }

  if (plain && key === KEY.escape) {
    return escapeTarget(escapeContextOf(context)) === null
      ? UNASSIGNED
      : CONSUMED_ELSEWHERE
  }

  if (ctrl && key === KEY.a) return CONSUMED_ELSEWHERE
  if (ctrl && key === KEY.f) return CONSUMED_ELSEWHERE

  if (plain && (key === KEY.del || key === KEY.backspace)) {
    return changed(deleteCommandsFor(context))
  }

  if (ctrl && key === KEY.c) return acted({ kind: 'copySelection' })
  if (ctrl && key === KEY.v) return acted({ kind: 'pasteClipboard' })
  if (ctrl && key === KEY.z) return acted({ kind: 'undoEdit' })
  if (ctrl && key === KEY.y) return acted({ kind: 'redoEdit' })
  if (ctrlShift && key === KEY.z) return acted({ kind: 'redoEdit' })
  if (plain && key === KEY.f2) {
    return acted({ kind: 'editInPlace', target: { kind: 'documentTitle' } })
  }
  if (ctrl && key === KEY.o) return acted({ kind: 'openDocumentFile' })
  if (ctrl && key === KEY.s) return acted({ kind: 'saveDocumentFile' })
  if (ctrl && key === KEY.r) return acted({ kind: 'reopenDocumentFile' })
  if (plain && key === KEY.n) return acted({ kind: 'startNewDocument' })

  if (ctrlShift && key === KEY.e) return CONSUMED_ELSEWHERE
  // Why: screenEventFromInput sends F1, P and F11 (T-280, PI-18); acting here as well asks twice.
  if (plain && (key === KEY.f1 || key === KEY.p || key === KEY.f11)) return CONSUMED_ELSEWHERE

  if (isTimeZoomKey(input)) {
    const factor = keyZoomFactor(context, key === KEY.plus)
    return changed(zoomWrites(context, zoomTimes(context, factor, 'x'), null, null, null))
  }
  if (isVerticalZoomKey(input)) {
    return verticalZoomAnswer(context, keyZoomFactor(context, key === KEY.plus), null, null)
  }

  // Trap: Ctrl alone with + / - / 0 stays UNASSIGNED; it is the browser's own zoom (T-255).
  if (isDisplayScaleKey(input)) {
    return displayScaleStep(context, key === KEY.plus ? 1 : -1)
  }

  if (plain && key === KEY.f) return changedInOrder(fitWrites(context))

  if (ctrlShift && key === KEY.d) {
    return changed(statusLineWrites(context))
  }

  return UNASSIGNED
}

/** @purity pure */
function isPlusOrMinus(key: string): boolean {
  return key === KEY.plus || key === KEY.minus
}

// Spec: SK-16, SK-16b
/** @purity pure */
function isTimeZoomKey(input: KeyInput): boolean {
  return isCombo(input.modifiers, false, true, false) && isPlusOrMinus(input.key)
}

// Spec: SK-16a, SK-16c
/** @purity pure */
function isVerticalZoomKey(input: KeyInput): boolean {
  return isCombo(input.modifiers, false, false, true) && isPlusOrMinus(input.key)
}

// Spec: SK-22, SK-23, MK-10, IMPS-1876, IMPS-1236
/** @purity pure */
function isDisplayScaleKey(input: KeyInput): boolean {
  return isCombo(input.modifiers, true, true, false) && isPlusOrMinus(input.key)
}

// Spec: EL-17, UN-8, FR-039
/** @purity pure */
export function isViewScaleKey(input: KeyInput): boolean {
  return isTimeZoomKey(input) || isVerticalZoomKey(input) || isDisplayScaleKey(input)
}

// Spec: SK-3, SL-1, FR-046, IMPS-1400, IMPS-1417, IMPS-1419, PTL-11
/** @purity pure */
function deleteCommandsFor(context: InputContext): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  const commands: DocumentCommand[] = []
  for (const one of context.selection.items) {
    switch (one.kind) {
      case 'task':
        commands.push({ kind: 'deleteTask', taskUid: one.uid })
        break
      case 'dependency': {
        const successor = taskByUid(schedule, one.successorUid)
        const edge = successor === null ? undefined : successor.dependencies[one.ordinal]
        if (edge === undefined) break
        commands.push({
          kind: 'deleteDependency',
          predecessorUid: edge.predecessorUid,
          successorUid: one.successorUid,
        })
        break
      }
      case 'highlightBox':
        commands.push({ kind: 'deleteHighlightBox', highlightBoxId: one.id })
        break
      case 'commentBox':
        commands.push({ kind: 'deleteCommentBox', commentBoxId: one.id })
        break
      case 'statusLine':
        commands.push({ kind: 'clearStatusDate' })
        break
      case 'parentTaskLink':
        commands.push({ kind: 'setTaskParentTask', taskUid: one.childUid, parentTaskUid: null })
        break
    }
  }
  return commands
}
