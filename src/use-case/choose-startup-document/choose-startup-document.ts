// ChooseStartupDocument -- public entry of this folder.
//
// @unit      UF-23   (docs/spec/05-07-design.md, table T-075)
// @component ChooseStartupDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-14
//
// Step BO-2 of table T-077 -- "表 T-034 の順で最初に開く文書を決める" -- and
// nothing else. The order is table T-034 itself:
//
//     BT-1  the document embedded in the file        (FR-067)
//     BT-2  the document handed at startup           (path R-1 of table T-008)
//     BT-3  the autosaved document                   (FR-026)
//     BT-4  the template for the first screen        (FR-027)
//
// FR-062 states the order and then adds the MUST NOT that shapes the other half
// of this file: "負けた自動保存を黙って捨ててはならない". Table T-034's closing
// note says what to do with the loser instead, and `autosave` of `StartupChoice`
// is that answer -- three outcomes, one per sentence of the note.
//
// ⚠️ Nothing here reads a file, storage, the clock or the DOM. LY-5 leaves every
// outside value to the Framework, so all four candidates ARRIVE AS VALUES,
// already decoded and already through FR-023's validation (table T-008 marks
// R-1 and R-3 untrusted, and BT-1 rides in on the file itself). A candidate that
// could not be read arrives as `unreadable` / `entryCountNotOne` / `broken`,
// never as `read`.
//
// ⚠️ The figure source (docs/spec/_assets/source/components.json) draws an edge
// ChooseStartupDocument -> ValidateImportedDocument, "checks each candidate".
// That call is NOT made here: `validateImportedDocument` (PI-13, UF-22) has no
// signature yet, and a pure unit cannot depend on one it cannot see. The
// candidate shapes below already carry the outcome that check produces, so
// moving the call inside later changes this file only. ⚠️ It is a decision of
// this file, not of the specification.
//
// ⚠️ Failure is a value. This function never throws: AG-8 wants the caller told,
// and R7.10 wants it told by the return value. Everything FR-067, FR-026 and
// FR-062 require to be TOLD leaves in `notices`; who gathers those onto the one
// startup screen NT-4 demands is the ScreenRenderer's business (UF-67), not this
// unit's.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { Document } from '../../entity/document-model/document/document'
import { isNewerStamp } from '../../entity/document-model/document-stamp/document-stamp'

/** The four rows of table T-034, in the order the table lists them. */
export type StartupRow = 'BT-1' | 'BT-2' | 'BT-3' | 'BT-4'

/**
 * BT-1 -- the document embedded in the single `.html` (FR-067).
 *
 * FR-067 names two ways this row can fail and treats them alike: the embedded
 * document cannot be read, or the file does not hold exactly one embedding slot
 * ("入れ口が 1 つでない"). Both must be told and both descend to the next rank.
 */
export type EmbeddedCandidate =
  | { readonly kind: 'none' }
  | { readonly kind: 'read'; readonly document: Document; readonly documentKey: string }
  | { readonly kind: 'unreadable' }
  /** ⚠️ `entryCount` is 0 or 2 and above; exactly one is the `read` case. */
  | { readonly kind: 'entryCountNotOne'; readonly entryCount: number }

/**
 * BT-2 -- the document handed at startup. The path is R-1 of table T-008 and
 * what happens to it after it is opened is FR-087's.
 *
 * ⚠️ `unreadable` descends to BT-3 and raises a notice, the same way BT-1 does.
 * That is a reading, not a quotation: FR-067 spells the descent out for BT-1 and
 * table T-034's note spells it out for BT-3, but BT-2 has no sentence of its
 * own. Table T-034 is an ORDER, so a rank that yields no document is passed
 * over, and NT-1 of table T-037 makes telling the person a MUST wherever input
 * is turned away. ⚠️ It is a decision of this file, not of the specification.
 */
export type HandedCandidate =
  | { readonly kind: 'none' }
  | { readonly kind: 'read'; readonly document: Document; readonly documentKey: string }
  | { readonly kind: 'unreadable' }

/**
 * BT-3 -- the autosaved document (FR-026).
 *
 * `broken` is FR-026's "保存された内容が壊れているとき、黙って破棄してはならない"
 * and table T-034's "壊れていれば知らせたうえで退避する": it is told AND set
 * aside, and it can never win, so a broken autosave is always a losing one.
 */
export type AutosaveCandidate =
  | { readonly kind: 'none' }
  | { readonly kind: 'read'; readonly document: Document; readonly documentKey: string }
  | { readonly kind: 'broken' }

/**
 * The four candidates of table T-034, as SingleHtmlShell hands them over.
 *
 * ⚠️ `template` is not optional. The order has to end somewhere, and FR-067 says
 * in as many words that a lost BT-1 descends rather than starting empty ("空で
 * 起動するのではない"). FR-027 keeps exactly one template and FR-095 returns to
 * this same state, so BT-4 always yields a document.
 *
 * ⚠️ What is IN that template is FR-027's (newly written, and neutral as to
 * industry and product down to the identifier values) and not this unit's -- it
 * arrives as a value like the other three.
 */
export interface StartupCandidates {
  readonly embedded: EmbeddedCandidate
  readonly handed: HandedCandidate
  readonly autosave: AutosaveCandidate
  readonly template: Document
}

/**
 * What becomes of the autosave that did not win. The three kinds other than
 * `none` are the three sentences of table T-034's closing note, in its order.
 */
export type AutosaveDisposition =
  /** There is no losing autosave: none was stored, or BT-3 itself won. */
  | { readonly kind: 'none' }
  /**
   * "別の文書なら触らない" -- and also the same document whose autosave is NOT
   * newer, because the note asks for a confirmation only when it is newer, and
   * FR-062 forbids discarding it either way.
   */
  | { readonly kind: 'leaveAlone' }
  /**
   * "同じ文書で自動保存のほうが新しければ確認を求める". The stored document
   * travels with the question so that answering it needs no second read of
   * storage (R7.4: the collecting is over before the deciding starts).
   */
  | { readonly kind: 'askToRecover'; readonly document: Document }
  /** "壊れていれば知らせたうえで退避する" -- the notice is in `notices`. */
  | { readonly kind: 'quarantine' }

/** One thing the startup MUST tell the person about (FR-076, table T-037). */
export type StartupNoticeCode =
  | 'embeddedUnreadable'
  | 'embeddedEntryCountNotOne'
  | 'handedUnreadable'
  | 'autosaveBroken'

export interface StartupNotice {
  /** The row of table T-034 the notice is about. */
  readonly row: StartupRow
  /** The requirement that makes telling a MUST. */
  readonly rule: string
  readonly code: StartupNoticeCode
}

export interface StartupChoice {
  /** The row of table T-034 that won. */
  readonly row: StartupRow
  /** The document BO-3 and BO-4 then work from. */
  readonly document: Document
  readonly autosave: AutosaveDisposition
  /** In the order of table T-034, so the one screen reads top down. */
  readonly notices: readonly StartupNotice[]
}

// ⛔ STOP -- `documentKey` is NOT a value the specification decides.
//
// Table T-034's note splits the losing autosave on "同じ文書" against "別の
// 文書", and FR-061 makes never confusing two of them a MUST NOT ("同じ機で別の
// 文書や複製を開いても、自動保存が互いを取り違えてはならない"). But no
// requirement says what makes two documents the same one. `Project.id` is not
// it -- AT-1 of the ERD is nullable and marked "主キーにしない" -- and S-99b of
// `_assets/tbl-settings.md` names a 「文書の識別子」 for the Agent API's records
// without defining one either.
//
// So this unit only COMPARES two keys for equality, and never derives one. The
// Framework supplies them: it is the key its autosave slot stands under, which
// is the same value FR-061 already requires it to keep straight. HOW that key is
// derived from a document is an open ruling.

/**
 * The key of the row that won, or `null` when the winner carries none.
 *
 * ⚠️ Only BT-1 and BT-2 can win over a stored autosave -- if BT-3 wins there is
 * no loser, and BT-4 wins only when BT-3 yielded nothing -- so a `null` here
 * always means the autosave is not the same document.
 *
 * @purity pure
 */
function keyOfWinner(row: StartupRow, candidates: StartupCandidates): string | null {
  if (row === 'BT-1' && candidates.embedded.kind === 'read') return candidates.embedded.documentKey
  if (row === 'BT-2' && candidates.handed.kind === 'read') return candidates.handed.documentKey
  return null
}

/**
 * Table T-034's closing note, in its own order.
 *
 * @purity pure
 */
function dispositionOfAutosave(
  autosave: AutosaveCandidate,
  winnerRow: StartupRow,
  winnerKey: string | null,
  winner: Document,
): AutosaveDisposition {
  if (autosave.kind === 'none') return { kind: 'none' }
  // Broken before same-or-different: a broken copy has no stamp to compare and
  // no document to hand back, and FR-026 wants it told whatever it belonged to.
  if (autosave.kind === 'broken') return { kind: 'quarantine' }
  // BT-3 itself won. Nothing lost, nothing to dispose of.
  if (winnerRow === 'BT-3') return { kind: 'none' }

  // "別の文書なら触らない."
  if (winnerKey === null || winnerKey !== autosave.documentKey) return { kind: 'leaveAlone' }

  // "同じ文書で自動保存のほうが新しければ確認を求める." `isNewerStamp` (PI-3) is
  // the comparison table T-034 asks for, so the revision-then-time rule of
  // FR-063 is not spelled a second time here.
  if (!isNewerStamp(autosave.document.revisionStamp, winner.revisionStamp)) {
    return { kind: 'leaveAlone' }
  }
  return { kind: 'askToRecover', document: autosave.document }
}

/**
 * Everything that must be told, in the order of table T-034.
 *
 * @purity pure
 */
function noticesOfCandidates(candidates: StartupCandidates): readonly StartupNotice[] {
  const notices: StartupNotice[] = []

  // FR-067: "埋め込まれた文書が読み取れないとき、または入れ口が 1 つでないときは、
  // 黙って捨てずに知らせること（MUST）."
  if (candidates.embedded.kind === 'unreadable') {
    notices.push({ row: 'BT-1', rule: 'FR-067', code: 'embeddedUnreadable' })
  }
  if (candidates.embedded.kind === 'entryCountNotOne') {
    notices.push({ row: 'BT-1', rule: 'FR-067', code: 'embeddedEntryCountNotOne' })
  }

  // NT-1 of table T-037: input that is turned away is named and explained.
  if (candidates.handed.kind === 'unreadable') {
    notices.push({ row: 'BT-2', rule: 'FR-076', code: 'handedUnreadable' })
  }

  // FR-026: "復旧できないことを人に知らせること." Table T-034 adds the setting
  // aside, which travels as `quarantine` rather than as a notice.
  if (candidates.autosave.kind === 'broken') {
    notices.push({ row: 'BT-3', rule: 'FR-026', code: 'autosaveBroken' })
  }

  return notices
}

/**
 * Step BO-2 of table T-077: the first document to open, in the order of table
 * T-034, and what becomes of the autosave that lost.
 *
 * @purity pure
 */
export function chooseStartupDocument(candidates: StartupCandidates): StartupChoice {
  // Table T-034 IS this array -- the four rows in the table's order, each paired
  // with the document it yields or `null` when it yields none. Written as the
  // table rather than as four nested branches, so the order can be read off it.
  const order: readonly (readonly [StartupRow, Document | null])[] = [
    ['BT-1', candidates.embedded.kind === 'read' ? candidates.embedded.document : null],
    ['BT-2', candidates.handed.kind === 'read' ? candidates.handed.document : null],
    ['BT-3', candidates.autosave.kind === 'read' ? candidates.autosave.document : null],
    ['BT-4', candidates.template],
  ]

  const won = order.find((entry) => entry[1] !== null)
  // BT-4 always yields one, so `won` is never undefined. The fallback repeats it
  // instead of asserting it, because an assertion here would be the one place a
  // startup could end with no document at all.
  const row = won === undefined ? 'BT-4' : won[0]
  const document = won === undefined || won[1] === null ? candidates.template : won[1]

  return {
    row,
    document,
    autosave: dispositionOfAutosave(
      candidates.autosave,
      row,
      keyOfWinner(row, candidates),
      document,
    ),
    notices: noticesOfCandidates(candidates),
  }
}
