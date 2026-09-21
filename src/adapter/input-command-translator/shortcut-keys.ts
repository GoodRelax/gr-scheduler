// InputCommandTranslator -- turns a key press into an operation by table T-036.
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
  rowZoomAnswer,
  zoomTimes,
  zoomWrites,
} from './zoom-and-fit'

// see T-036, IN-5a, IN-4, MK-10
/** @purity pure */
export function commandFromKey(input: KeyInput, context: InputContext): TranslatedInput {
  const key = input.key
  const modifiers = input.modifiers
  const plain = isCombo(modifiers, false, false, false)
  const ctrl = isCombo(modifiers, true, false, false)
  const ctrlShift = isCombo(modifiers, true, true, false)
  const shiftOnly = isCombo(modifiers, false, true, false)
  const altOnly = isCombo(modifiers, false, false, true)

  // see IN-5a
  // WHY: a field asked for but not yet focused takes its keys too, or the first letter typed
  // after MK-13 or HF-14 reaches SK-14 or SK-18 instead of the name.
  if (context.isTextEntryUnsettled || context.isTextFieldFocusWanted === true) {
    if (plain && isSingleCharacterKey(key)) return UNASSIGNED
    if (plain && (key === KEY.del || key === KEY.backspace)) return UNASSIGNED
  }
  if (context.isTextEntryUnsettled) {
    if (ctrl && (key === KEY.c || key === KEY.v || key === KEY.a)) return UNASSIGNED
  }

  if (plain && key === KEY.enter) {
    if (context.isNoticeStanding === true) return acted({ kind: 'dismissNotice' })
    if (context.isTextEntryUnsettled) return acted({ kind: 'settleTextEntry' })
    // WHY: same kind as the settle stage; only the shell knows whether its commit settled anything.
    if (context.isPropertiesPanelShowing === true) return acted({ kind: 'settleTextEntry' })
    // TRAP: with nothing to act on Enter stays unassigned, or tabbed-to controls lose activation.
    return context.selection.items.length > 0 ? CONSUMED_ELSEWHERE : UNASSIGNED
  }

  if (plain && key === KEY.escape) {
    return escapeTarget(escapeContextOf(context)) === null
      ? UNASSIGNED
      : CONSUMED_ELSEWHERE
  }

  if (ctrl && key === KEY.a) return CONSUMED_ELSEWHERE

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

  if (ctrlShift && key === KEY.e) return CONSUMED_ELSEWHERE
  if (plain && (key === KEY.f1 || key === KEY.p)) return CONSUMED_ELSEWHERE
  // see FR-071, SK-15
  if (plain && key === KEY.f11) return acted({ kind: 'toggleFullScreen' })

  if (shiftOnly && (key === KEY.plus || key === KEY.minus)) {
    const factor = keyZoomFactor(context, key === KEY.plus)
    return changed(zoomWrites(context, zoomTimes(context, factor, 'x'), null, null, null))
  }
  if (altOnly && (key === KEY.plus || key === KEY.minus)) {
    return rowZoomAnswer(context, keyZoomFactor(context, key === KEY.plus), null, null)
  }

  // see SK-22, SK-23, MK-10
  // TRAP: Ctrl alone with + / - / 0 stays UNASSIGNED; it is the browser's own zoom (T-255).
  if (ctrlShift && (key === KEY.plus || key === KEY.minus)) {
    return displayScaleStep(context, key === KEY.plus ? 1 : -1)
  }

  if (plain && key === KEY.f) return changedInOrder(fitWrites(context))

  if (ctrlShift && key === KEY.d) {
    return changed([
      context.document.schedule.project.statusDate === null
        ? { kind: 'setStatusDate', date: context.today }
        : { kind: 'clearStatusDate' },
    ])
  }

  return UNASSIGNED
}

// see SK-3, SL-1, FR-046
/** @purity pure */
function deleteCommandsFor(context: InputContext): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  const commands: DocumentCommand[] = []
  for (const one of context.selection.items) {
    switch (one.kind) {
      case 'task':
        commands.push({ kind: 'deleteTask', uid: one.uid })
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
        commands.push({ kind: 'deleteHighlightBox', id: one.id })
        break
      case 'commentBox':
        commands.push({ kind: 'deleteCommentBox', id: one.id })
        break
      case 'statusLine':
        commands.push({ kind: 'clearStatusDate' })
        break
    }
  }
  return commands
}
