// Contract test: the words a notice carries are read against the ROW OF TABLE
// T-233 they are carried for.
//
// Table T-218 row TS-5 puts this here: the seam between the manuscript's table
// and FR-038's dictionary is owned by neither side, and the file is driven by
// table T-233 read at run time.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS -- ledger row DFC-166
// ---------------------------------------------------------------------------
//
// On 2026-08-31 the 場面 of `RS-30` was rewritten and the dictionary was not.
// A person who pressed a spent `IC-90` was told 「この行は既に畳まれています」
// while the reason the notice was raised for was that the row was NOT folded.
// ⛔ EVERY MACHINE CHECK STAYED GREEN, because they all ask whether the row's
// word REACHED the screen and never whether it says what the row says:
//
//   * tests/contract/display-words.contract.test.ts walks the dictionary and
//     holds each word to the place that prints it -- driven by the dictionary,
//     so a word that turned into its own opposite is carried faithfully.
//   * tests/unit/fr-029-the-reason-a-press-carries.test.ts reads the same
//     dictionary for its expectation, and says so itself: 「WHAT THE WORDS SAY.
//     FR-038's dictionary holds them; these cases ask that the words which
//     arrived are the ones that dictionary holds for the row」.
//
// ---------------------------------------------------------------------------
// ⛔⛔ WHAT docs/spec DOES AND DOES NOT SAY -- READ THIS BEFORE CHANGING A CASE
// ---------------------------------------------------------------------------
//
// The closing of 表 T-037 binds the two sides ONE WAY ONLY:
//
//   「⭐ 通知が運ぶ理由は 表 T-233 の行とすること（MUST）。同表に無い理由を運んで
//    はならない（MUST NOT）—— 理由の語は `FR-038` の辞書が持ち、辞書は行 ID で
//    引く。⛔ **行を足すときは、辞書の原稿にも項を足すこと（MUST）** —— 生成器が
//    本表から名簿を起こすので、片方だけを書けば黙らずに落ちる。」
//
// ⛔ THAT IS AN OBLIGATION ABOUT ADDING A ROW, NOT ABOUT REWRITING ONE, and
// ledger row DFC-166 says as much: 「足すときは守られたが、書き換えるときのことは
// 書かれていなかった」. ⛔ MISSING FROM docs/spec: any row saying that the word
// the dictionary holds for a reason must tell the 場面 that reason's row states.
// The nearest thing is 表 T-037's `NT-1` 「どの項目が、なぜ誤りかを文字で示すこと
// （MUST）」 -- a notice must say WHY -- which no machine can weigh over prose.
//
// ⇒ SO THE LAST GROUP BELOW IS A REVIEW LATCH AND NOT A CLAIM ABOUT BEHAVIOUR.
// It records, per row, the fingerprint of the 場面 AND the words TAKEN TOGETHER,
// as they were last read against each other. Either side moving fails the row
// and asks a person to read the pair again. ⛔ It does not, and cannot, assert
// that the words are true; ⭐ it makes it impossible for one side to move in
// silence, which is the whole of what happened in DFC-166.
//
// ⚠️ WHEN THIS FAILS, THE FIX IS NOT TO PASTE THE NEW FINGERPRINT IN. Read the
// row's 場面 and the dictionary's three fields together, decide whether the
// words still tell that scene, CORRECT THE WORDS IF THEY DO NOT, and only then
// record the new fingerprint.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md, section 1). ⛔ NO FILE UNDER src/ WAS READ; the generated
// dictionary is JSON data and is read as data, the way
// tests/contract/display-words.contract.test.ts reads it.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bare, specTable } from './spec-table'

// ---------------------------------------------------------------------------
// The two sides
// ---------------------------------------------------------------------------

const ROOT = process.cwd()

/** Chapter 6.2 (MUST): the manuscript the words are written in. */
const MANUSCRIPT_PATH = join(ROOT, 'docs', 'spec', '_source', 'display-words.json')

/** Chapter 6.2 (MUST): the one generated file the words reach `src/` by. */
const GENERATED_PATH = join(ROOT, 'src', 'adapter', 'screen-renderer', 'display-words.json')

interface Words {
  readonly ja: string
  readonly en: string
}

interface ReasonEntry {
  readonly rowId: string
  readonly text: Words
  readonly nextStep?: Words
}

const reasonsIn = (path: string): readonly ReasonEntry[] => {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  const section = raw['reasons']
  if (!Array.isArray(section)) throw new Error(`${path} holds no reasons section`)
  return section as readonly ReasonEntry[]
}

const MANUSCRIPT = reasonsIn(MANUSCRIPT_PATH)
const DELIVERED = reasonsIn(GENERATED_PATH)

const T233 = specTable('T-233')

const entryOf = (rowId: string): ReasonEntry => {
  const found = DELIVERED.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no reason ${rowId}`)
  return found
}

/** The 場面 the row states, exactly as the manuscript prints it. */
const sceneOf = (rowId: string): string => {
  const row = T233.rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-233 has no row ${rowId}`)
  const scene = row.by['場面']
  if (scene === undefined) throw new Error('table T-233 has no 場面 column')
  return scene
}

const mannerOf = (rowId: string): string => {
  const row = T233.rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-233 has no row ${rowId}`)
  return bare(row.by['作法'] ?? '')
}

const ROW_IDS: readonly string[] = T233.rows.map((row) => row.id)

// ---------------------------------------------------------------------------
// The pairing, as it was last read
// ---------------------------------------------------------------------------

/**
 * The first 16 hex characters of the SHA-256 of
 * `場面 ja en nextStep.ja nextStep.en`, joined with one space.
 *
 * ⚠️ THE HEADING USED TO SAY THE FIVE WERE JOINED WITH A NUL, and `fingerprintOf`
 * below has always joined them with a space. The comment was corrected rather
 * than the code (2026-09-03): changing the separator would re-key all 43 rows
 * without a single pair having been re-read, which is exactly the paste-in this
 * file exists to forbid. ⛔ A space is the weaker separator -- text moved across
 * a field boundary keeps the same hash -- and that is a real, if small, hole.
 *
 * ⭐ A fingerprint and not the words themselves: FR-038 (MUST NOT) admits ONE
 * store of printed words, and a second copy of them in a test file is a second
 * store that goes stale exactly the way the dictionary did in DFC-166.
 */
const PAIRED_ON_2026_09_03: Readonly<Record<string, string>> = {
  'RS-1': 'a1f303801978cd0b',
  'RS-2': 'bf0dc7411abc1f66',
  'RS-3': '4e786edf4413b782',
  'RS-4': 'b81c82b10e0ecda4',
  'RS-5': 'bcf057c1289a01d5',
  'RS-6': '67b42c21137821d8',
  'RS-7': '2ebb3d4c4213e9d5',
  'RS-8': '8b4b13cddc90d42c',
  'RS-9': '93e0539d0eae329f',
  'RS-10': '8fb99682d5b75c9b',
  'RS-11': 'ffb3da814dfe975b',
  'RS-12': 'aeacff9cd2248a51',
  'RS-13': 'cbeb9438978a562a',
  'RS-14': '8a3b1693d6bc54e1',
  'RS-16': 'd17dd51b976cadca',
  // ⭐⭐ RE-READ 2026-09-05, and the pair still holds. The scene gained
  // 「いまは告げてはならない（MUST NOT）」 when the ruling of that day left
  // the watermark's default name standing and put the road to set one off
  // until later. ⚠️ The words are NOT changed with it: the next step it
  // offers -- set a name and the watermark prints it -- is undoable today,
  // but the row is never told while that is so, and these are the words
  // wanted the day the road is built. ⛔ If the road lands and this pair is
  // still dormant, that is the moment to read them again.
  //
  // ⭐⭐ RE-READ 2026-09-11, and the pair still holds. The scene LOST its last
  // sentence: a dated 2026-09-05 note saying `frame-loop.ts` never called this
  // row in its roll of reasons, because the road that would tell it was never
  // built. The cleanup of 9f359cd folded that out as an implementation RECORD
  // whose original is the ledger -- `DFC-258` of
  // docs/development-records/fixed-defects.md, the row for there being no way
  // to write `FR-086`'s watermark name. (⛔ Neither sentence is re-quoted here:
  // check 42 forbids a comment putting words in docs/spec's mouth that
  // docs/spec no longer carries.)
  // ⭐ THE SCENE ITSELF DID NOT MOVE: the row still opens on the watermark name
  // not yet being set, and still carries the 2026-09-05 ruling that the row is
  // not to be told while no road exists -- which is the half the words answer.
  // ⚠️ The sentence that went was about `src/`, never about the scene, and no
  // word was drawn from it, so the words are left exactly as they were and only
  // the fingerprint is re-recorded.
  'RS-19': '23b990701d8b5422',
  'RS-20': '9660f89d7f3c1a5b',
  'RS-21': '320caa7b7c536e85',
  'RS-22': '1b8ded119f138b08',
  'RS-23': '35646140a764e5e2',
  'RS-24': '11ab639df811d590',
  'RS-25': '0ede3e728aff5d5c',
  'RS-26': '8edc74bc14553b8e',
  'RS-27': '173885a124f06ac3',
  'RS-28': '80b3e0d70b0abd46',
  'RS-29': '9141302ce077d9d5',
  'RS-30': 'd1ed25fff3db71c6',
  'RS-31': '5b41d6369c8ea593',
  'RS-32': '0cbf2fbeaf9801bb',
  'RS-33': '140b0a58e73b1f52',
  'RS-34': '89ad57e7d522bc58',
  'RS-35': 'ba5c8d711fc7a0f3',
  'RS-36': '3f8c01792dd112b0',
  'RS-37': '7a6ca3f9bfef68b7',
  'RS-38': '9c36f2d1fad8587d',
  'RS-39': '4cfb50398940e901',
  'RS-40': 'fa7ae27664d8d2ee',
  'RS-41': '5f77c22a1e6ab2c0',
  'RS-42': 'e814cb5729c9deef',
  'RS-43': '1033e6a435341a3e',
  'RS-44': '5aeba9325454b1ad',
  // ---------------------------------------------------------------------
  // ⭐ READ AGAINST EACH OTHER ON 2026-09-03 (CR-340, ledger rows DFC-202 and
  // DFC-206). ⛔ The fingerprints below were NOT pasted in from a failure
  // message: the 場面 and the three fields of the dictionary were read side by
  // side first, and this note records what that reading found.
  //
  // `RS-46` -- 場面 「これ以上深い段には行を足せない」; ja 「これ以上深い段には行を
  //   足せません」 is again the same sentence, en 「A row cannot be added any
  //   deeper than this」 says the same, and the next step 「もっと浅い行に足して
  //   ください」 / 「Add it to a shallower row」 is the one `FR-085`'s cap leaves
  //   open. ⭐ It also stays clear of `RS-38` 「深さの上限に達しているので、これ以上
  //   深い段へは動かせない」, which is the MOVE and not the ADD -- the distinction
  //   CR-340 was written to keep. ⇒ the words tell the scene.
  // ---------------------------------------------------------------------
  'RS-46': '1dc2be62612383ad',
  //
  // ⭐ READ AGAINST EACH OTHER ON 2026-09-05 (CR-357, ledger row DFC-282,
  //   利用者の裁定 「② ただし、具体的に差分を表示してユーザーの確認を受ける」).
  // `RS-48` -- 場面 「文書の形式の版が、この造りが知る最大の版より新しく、読め
  //   なかった項目がある」; ja 「この文書は新しい形式で書かれており、読めなかった
  //   項目があります」, en 「This document is in a newer format, and some items
  //   could not be read」.
  //   ⛔ THE FIRST DRAFT TOLD ONLY HALF THE SCENE and was corrected before this
  //   fingerprint was taken: it said the format was newer and never said that
  //   anything had failed to read -- which is the half the ruling is about.
  //   ⭐ The next step 「読めなかった項目はそのまま保たれ、保存し直しても失われ
  //   ません」 is the one FR-073 leaves open, and it is the reassurance that
  //   makes accepting the document safe: the ruling turned on not losing what
  //   could not be read.
  //   ⚠️ IT STAYS CLEAR OF ITS TWO NEIGHBOURS, and the distinction is WHY the
  //   item could not be read. `RS-25` 「列が決められた形に合わない」 is a value
  //   that is malformed; this row is a value that is well formed and UNKNOWN.
  //   `RS-26` 「起動時に渡された文書が読めなかった」 is the document not opening
  //   at all; here it opens. ⇒ the words tell the scene.
  'RS-48': '6e26ad7870b49da2',
  // ⭐ ADDED 2026-09-06 (CR-364, the ruling that renaming an assignee must
  // carry the count). The row is FR-008's, and the pairing was read the way
  // this file asks: the 場面 against the three dictionary fields, before
  // anything was recorded.
  'RS-49': 'c75934e3b3e35415',
  // ⭐ ADDED 2026-09-06 (CR-368, FR-023's ruling that the import drops and
  // tells). Read together before anything was recorded, the way this file
  // asks. 場面 「文書が使えない日付を持つ `Task` を落として、残りを取り込んだ」;
  // ja 「下記の無効なタスクを削除して取り込みました」 is the user's own wording of
  // the ruling and says the same scene -- ⭐ 「下記の」 is load-bearing, because
  // FR-023 (MUST NOT) forbids telling the count alone, so the words themselves
  // promise the list the surface draws. en 「The invalid tasks listed below were
  // removed, and the rest was imported」 keeps both halves: what was dropped AND
  // that the rest came in. The next step 「元のファイルの日付を直して読み直すか、
  // 取り消しで取り込む前へ戻せます」 / 「Fix the dates in the original file and read
  // it again, or undo to get back to before the import」 names the two roads the
  // requirement actually leaves open, and no third.
  // ⚠️ It stays clear of `RS-48` 「この文書は新しい形式で書かれており、読めなかった
  // 項目があります」 -- that one is the VERSION being newer and keeps what it could
  // not read, where this one is a value the document cannot use and drops it.
  'RS-50': 'eee407b62182693d',
  // ⭐ ADDED 2026-09-06, on the user's ruling that a document carrying settings
  // out of range is clamped and told about. Read together before the fingerprint
  // was taken: the row of table T-233, the ja and en text, and the next step.
  // ⛔ The words are NOT quoted here -- rule 02 section 4 has a note name its row
  // rather than copy it, and check 42 holds every quotation against the
  // manuscripts, so a copy here would be one more thing to keep in step.
  // ⭐ What the reading found: the scene and both languages say the same two
  // things -- that the values were wrong AND that they were not refused -- and
  // the next step names the only protection the requirement leaves, which is to
  // keep the original file, because nothing is written back until SK-11.
  // ⚠️ It stays clear of RS-48, which is a NEWER FORMAT and keeps what it could
  // not read. This one is a value this build understands and refuses to leave.
  'RS-51': 'dfce4d30e0992bf4',
  // ⭐ ADDED 2026-09-07, on the ruling that editing the working-day calendar
  // recounts the STORED percent complete (FR-012). The row, both languages and
  // the next step were read against each other BEFORE this fingerprint was
  // taken, which is what this record is for.
  // ⛔ The words are NOT quoted here -- rule 02 section 4 has a note name its
  // row rather than copy it, and FR-038 (MUST NOT) admits one store of printed
  // words.
  // ⭐ WHAT THE READING FOUND. The 場面 carries two halves -- the calendar
  //   changed AND the stored value was counted again -- and both languages
  //   carry both; neither says only that the calendar moved, which is the half
  //   that would leave a reader wondering why a number they never touched had
  //   changed. The next step names the ONE road FR-012 leaves open and no
  //   other: 「暦の変更と同じ書き込みの中で行うこと（MUST）。別の書き込みに分け
  //   てはならない（MUST NOT）」, so undo gives back the calendar and the
  //   percent complete together -- which is exactly what both next steps say.
  // ⭐ THE COUNT IS NOT IN THE WORD, AND SHOULD NOT BE. The row's 作法 is
  //   `NT-3`, which is where 「対象の件数を添えること」 lives, and NT-3 names
  //   「暦の変更」 among its own examples. `RS-49` is paired the same way and
  //   its row says so outright: 「件数の示し方は `NT-3` が持つ」. ⇒ a count
  //   spelled into the dictionary would be the second store NT-3 already is.
  // ⚠️ IT STAYS CLEAR OF `RS-21`, and the row says why: RS-21 (`NT-1`) REFUSES
  //   a calendar with no working weekday, where this row is the consequence of
  //   a calendar that WAS accepted. Nothing in either word could be read for
  //   the other scene.
  'RS-52': '046c4301cd3bd708',
  // RS-53 -- 「バーの形状を構えたまま、引かずに離した」, 作法 `NT-1`, 正 `FR-001`.
  //   Read against the words before the fingerprint was taken: the text says a
  //   task has a span and so is not made without a drag, and the next step names
  //   the drag and points at the milestone for a point. ⛔ The words themselves
  //   are not spelled here -- they are the dictionary's (FR-038, MUST NOT).
  // ⭐ THE NEXT STEP NAMES THE ROAD, WHICH IS THE WHOLE POINT OF THE ROW. FR-001
  //   grants it with the reason spelled into the row itself -- 「`RS-27`（押した
  //   入口が、いま行えることを持たない）では、何をすればよいかが読めない。」 -- so a
  //   word that only said "nothing happened" would fail the row it belongs to.
  // ⭐ IT NAMES THE MILESTONE, AND THAT IS NOT A SECOND SCENE. FR-001 keeps
  //   「マイルストーンは押すだけで置くこと（MUST）」 and RS-53's own note says a
  //   point never raises this row, so telling the reader where the press they
  //   just made IS the right gesture is the same one answer, not another row's.
  // ⚠️ IT STAYS CLEAR OF `RS-27`, the fallback: that row is about an ENTRANCE
  //   with nothing to do, where this is a press on the schedule that had a
  //   perfectly good arm and only lacked the drag.
  'RS-53': 'ae22f7d077250374',
  'RS-15': 'c85a8bb4ca6b676b',
  // RS-54 -- 「構えた形状が、選んでいるものに当てられない」, 作法 `NT-1`, 正
  //   `FR-083` (利用者の裁定 2026-09-08). Read against the words before the
  //   fingerprint was taken: the text says the armed shape cannot be applied to
  //   what is selected, and the next step says the arming is still live and
  //   names the road -- clear the selection and drag on empty space. ⛔ The words
  //   themselves are not spelled here; they are the dictionary's (FR-038, MUST
  //   NOT).
  // ⭐ THE ARMING STAYING UP IS THE HALF THE ROW INSISTS ON, and the words carry
  //   it. FR-083 (MUST) says 「形状の変更が拒まれたときも、構えは立てること」 and
  //   the row repeats that the arm is still standing -- so a word that only said
  //   "that cannot be done" would leave a person believing their press was
  //   thrown away entirely, which is the opposite of what the row states.
  // ⭐ THE NEXT STEP IS A ROAD THE SPECIFICATION ITSELF LEAVES OPEN: `SP-1` of
  //   FR-083's own table arms the shape when nothing is selected, so clearing
  //   the selection and dragging on empty space is where the armed shape does
  //   land. ⚠️ The 作法 is `NT-1` and not `NT-3a`, so the step is not owed -- it
  //   is carried all the same, and the case above only holds NT-3a rows to one.
  // ⚠️ IT STAYS CLEAR OF `RS-10`, which the row makes a MUST NOT in as many
  //   words: RS-10 is 「命令が拒否されたので、束ごと落とした」 and its answer is to
  //   take the refused operation out and try again, where this scene has no
  //   operation to take out -- the shape was never applied to anything.
  // ⭐⭐ RE-READ 2026-09-08, AND THE PAIR STILL HOLDS -- the fingerprint below
  //   was re-keyed because the 場面 moved, NOT because a word did. What moved:
  //   the row used to quote FR-083's clause where it says the arm stays up, and
  //   check 11 (duplicate detection) caught that quotation as the same MUST
  //   written in two places; rule 02 has a row name its 正 rather than copy it,
  //   so the row now points at FR-083 instead of transcribing it and adds a
  //   MUST NOT against transcribing it again. ⛔ THE SCENE ITSELF DID NOT
  //   CHANGE: 「構えた形状が、選んでいるものに当てられない」 and 「構えは立った
  //   ままである」 are both still there, word for word, and so is the MUST NOT
  //   against RS-10.
  // ⭐ WHAT THE RE-READING FOUND, reading the 場面, the manuscript dictionary
  //   (docs/spec/_source/display-words.json) and the generated one
  //   (src/adapter/screen-renderer/display-words.json) side by side: the two
  //   dictionaries are identical for this row, and both halves of the scene are
  //   still carried -- the text says the armed shape does not land on what is
  //   selected, and the next step says the arm is still usable before it names
  //   the road. ⇒ nothing needed correcting, so only the record was re-keyed.
  // ⚠️ THE HAZARD THIS FILE EXISTS FOR IS THE OPPOSITE ONE -- DFC-166, where the
  //   scene turned into its own opposite and the word stayed. Here the word and
  //   the scene still say the same thing; the change was a pointer replacing a
  //   copy, which no machine check on either side could have told apart from a
  //   rewrite.
  'RS-54': 'c74301f2856e3258',
  // -----------------------------------------------------------------------
  // ⭐ READ AGAINST EACH OTHER ON 2026-09-09 (the four write refusals table
  // T-233 gained with 表 T-015a の `HM-4` / `FR-009` / `IV-1` / `IV-10` for
  // their 正). ⛔ NOT PASTED IN FROM THE FAILURE MESSAGE: for each row the
  // 場面 column, the ja and en text and the next step were read side by side,
  // and against the 正 the row names, BEFORE anything was recorded here.
  // ⛔ The words are not copied into these notes -- rule 02 section 4 has a
  // note name its row, and FR-038 (MUST NOT) admits one store of them.
  //
  // RS-55 -- 場面 「動かす先が、その行自身か、その行の子孫である」（輪になる）,
  //   作法 `NT-1`, 正 表 T-015a の `HM-4`.
  // ⭐ BOTH HALVES OF THE SCENE ARE IN BOTH LANGUAGES: the destination being
  //   the row ITSELF, and the destination being one of its own descendants.
  //   A word that named only the descendant case would leave the self case
  //   with no word, and the row states the two together.
  // ⭐ THE WORDS DO NOT NARROW THE ROW TO ONE OF ITS TWO USES. The row says
  //   it covers the nesting of rows AND the WBS parent, from one prohibition;
  //   the words speak of moving a row under another and name neither, so
  //   neither use is shut out.
  // ⭐ THE NEXT STEP IS A ROAD `HM-4` ACTUALLY LEAVES OPEN: only a descendant
  //   is refused as a parent, so taking that row out of the subtree first
  //   makes the very same move legal. ⚠️ 作法 is `NT-1`, so a next step is not
  //   owed here; it is carried all the same.
  // ⚠️ IT STAYS CLEAR OF `RS-36` 〜 `RS-39` and `RS-38`, which are the indent
  //   and outdent limits (no sibling above, already shallowest, the depth cap,
  //   nowhere left in that direction). Those refuse a move that would be fine
  //   but for a limit; this one refuses a move that can never be well formed.
  // ⇒ the words tell the scene.
  'RS-55': 'aead1f05c2da7df1',
  //
  // RS-56 -- 場面 「同じ `Task` を、依存の先行と後続の両方にしようとした」,
  //   作法 `NT-1`, 正 `FR-009`.
  // ⭐ THE WORDS SAY THE SAME SENTENCE THE ROW DOES, in the negative, in both
  //   languages: one task at both ends of one dependency.
  // ⭐ AND THEY STAY AS NARROW AS THE ROW. `FR-009` forbids three things in
  //   one clause -- the self reference, a pair that already has a dependency,
  //   and an endpoint that is neither task nor milestone -- and only the first
  //   is this row's. The words name only the first, so they cannot be read
  //   over a refusal this row is not carried for.
  // ⭐ THE NEXT STEP IS THE ROAD THE SAME CLAUSE LEAVES STANDING: 「引きかけの
  //   矢印だけを捨てて構えは解かない」, so the arming survives the refusal and
  //   drawing to another task is the very next thing a person can do.
  // ⇒ the words tell the scene.
  'RS-56': '772c6497e64774be',
  //
  // RS-57 -- 場面 「同じ id を持つものが、この文書に既に在る」, 作法 `NT-1`,
  //   正 Chapter 6.1 の 表 T-220 の `IV-1`.
  // ⭐ `IV-1` is 「主キーの値が、それが並ぶ配列の中で重複しないこと」 and this
  //   row is its violation. The words say a thing with the same id is already
  //   in this document -- the row's own vocabulary (id, not primary key),
  //   which is the vocabulary a reader of the screen has.
  // ⭐ THE NEXT STEP NAMES THE ONE ROAD: give it a different id. `IV-1` is
  //   violated by the duplicate alone, so nothing else clears it.
  // ⚠️ IT STAYS CLEAR OF `RS-25` 「読んだ `GRS JSON` の列が、決められた形に合わ
  //   ない」, which is a malformed value; here the value is well formed and
  //   already taken.
  // ⚠️ WHAT THE READING COULD NOT SETTLE, and it is not a mismatch between the
  //   two sides: the closing of the table keeps 取り込みの検証（`FR-023`）の
  //   拒否 out of T-233 because 表 T-220's rows have row IDs of their own, yet
  //   this row and `RS-58` take T-220 rows for their 正. The scene that
  //   separates them is a WRITE refused by the invariant rather than an import
  //   refused by it. ⛔ That is a question for the manuscript, not for the
  //   words, and it is left where it is.
  // ⇒ the words tell the scene.
  'RS-57': 'ba449a8d282c9699',
  //
  // RS-58 -- 場面 「終了が開始より前である」, 作法 `NT-1`, 正 Chapter 6.1 の
  //   表 T-220 の `IV-10`.
  // ⭐ The row and both languages say one thing and the same thing: the finish
  //   lies before the start.
  // ⭐⭐ THE NEXT STEP IS EXACTLY AS WIDE AS `IV-10` AND NOT NARROWER. The
  //   invariant is 「`finish` が `start` より前でないこと」, which ADMITS the two
  //   being the same day, and the step offers the same day or a later one. A
  //   step that asked for a later day only would forbid what the invariant
  //   allows, and a person who followed it would never learn that a same-day
  //   task is well formed.
  // ⚠️ IT STAYS CLEAR OF `RS-50` 「文書が使えない日付を持つ `Task` を落として、
  //   残りを取り込んだ」: that row is `NT-5`, an import that was ACCEPTED after
  //   dropping rows, where this row is `NT-1`, a write that is refused and
  //   changes nothing.
  // ⇒ the words tell the scene.
  'RS-58': '233c73e32acd128b',
}

const fingerprintOf = (rowId: string): string => {
  const entry = entryOf(rowId)
  const payload = [
    sceneOf(rowId),
    entry.text.ja,
    entry.text.en,
    entry.nextStep?.ja ?? '',
    entry.nextStep?.en ?? '',
  ].join(' ')
  return createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 16)
}

// ---------------------------------------------------------------------------
// The road the words take, so that "delivered" means what it says
// ---------------------------------------------------------------------------

describe('table T-233 -- every row has its word, and no word has no row', () => {
  it('holds a reason for every row of the table and no reason outside it (MUST)', () => {
    // 表 T-037's closing: 「通知が運ぶ理由は 表 T-233 の行とすること（MUST）。
    // 同表に無い理由を運んではならない（MUST NOT）」 and 「行を足すときは、辞書
    // の原稿にも項を足すこと（MUST）」. Both directions, so neither side can
    // grow alone.
    expect([...DELIVERED.map((one) => one.rowId)].sort()).toEqual([...ROW_IDS].sort())
  })

  it('the words that reach src/ are the words the manuscript holds (Chapter 6.2, MUST)', () => {
    // ⭐ THIS IS WHAT MAKES THE LATCH BELOW A LATCH ON DELIVERED PROSE. Chapter
    // 6.2 (MUST) has the words reach `src/` as one generated file; if the two
    // ever parted, a fingerprint taken over either would say nothing about what
    // a reader is told.
    expect(DELIVERED).toEqual(MANUSCRIPT)
  })

  it('says something in both languages for every row (NT-1, MUST)', () => {
    // 表 T-037 `NT-1`: 「どの項目が、なぜ誤りかを文字で示すこと（MUST）… 色や枠
    // だけで示してはならない（MUST NOT）」. An empty word shows nothing.
    for (const rowId of ROW_IDS) {
      const entry = entryOf(rowId)
      expect(entry.text.ja.trim(), `${rowId} has no Japanese word`).not.toBe('')
      expect(entry.text.en.trim(), `${rowId} has no English word`).not.toBe('')
    }
  })

  it('adds the next step wherever the row calls for NT-3a (MUST)', () => {
    // 表 T-037 `NT-3a`: 「次に取れる手段を添えること（MUST）—— … 失敗したこと
    // だけを伝えて手段を示さない通知を出してはならない（MUST NOT）」. Which rows
    // those are is read off the 作法 column, never listed here.
    const owing = ROW_IDS.filter((rowId) => mannerOf(rowId) === 'NT-3a')
    expect(owing.length, 'no row of T-233 calls for NT-3a any more').toBeGreaterThan(0)
    for (const rowId of owing) {
      const next = entryOf(rowId).nextStep
      expect(next?.ja.trim(), `${rowId} is an NT-3a row with no next step in Japanese`).toBeTruthy()
      expect(next?.en.trim(), `${rowId} is an NT-3a row with no next step in English`).toBeTruthy()
    }
  })
})

describe('table T-233 -- the word and the row it is carried for were read together', () => {
  it('has a recorded pairing for every row, and none for a row that is gone', () => {
    // ⛔ A row added to T-233 arrives here without a pairing rather than being
    // waved through, and a retired row's pairing is not left behind.
    expect(Object.keys(PAIRED_ON_2026_09_03).sort()).toEqual([...ROW_IDS].sort())
  })

  it.each(ROW_IDS)(
    '%s: the 場面 and the words it is answered with have not moved apart',
    (rowId) => {
      // ⚠️ NOT A CLAIM THAT THE WORDS ARE TRUE -- see the head of this file. It
      // is the latch DFC-166 asks for: the row was rewritten, the word was not,
      // and nothing said so.
      const entry = entryOf(rowId)
      expect(
        fingerprintOf(rowId),
        `${rowId}: read these together and correct the words if they no longer tell the scene, ` +
          `THEN record the new fingerprint.\n` +
          `  表 T-233 場面: ${sceneOf(rowId)}\n` +
          `  ja: ${entry.text.ja}\n` +
          `  en: ${entry.text.en}\n` +
          `  next (ja): ${entry.nextStep?.ja ?? ''}\n` +
          `  next (en): ${entry.nextStep?.en ?? ''}`,
      ).toBe(PAIRED_ON_2026_09_03[rowId])
    },
  )
})
