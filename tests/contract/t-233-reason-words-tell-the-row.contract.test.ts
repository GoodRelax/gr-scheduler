// Contract test: the words a notice carries are read against the ROW OF TABLE
// T-233 they are carried for.
//
// Table T-218 row TS-5 puts this here: the seam between the manuscript's table
// and FR-038's dictionary is owned by neither side, and the file is driven by
// table T-233 read at run time.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS -- ledger row D-166
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
// ledger row D-166 says as much: 「足すときは守られたが、書き換えるときのことは
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
// silence, which is the whole of what happened in D-166.
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
 * store that goes stale exactly the way the dictionary did in D-166.
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
  'RS-19': '6a388ae725a11c09',
  'RS-20': '9660f89d7f3c1a5b',
  'RS-21': '320caa7b7c536e85',
  'RS-22': '2ed14dc8b74a9021',
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
  // ⭐ READ AGAINST EACH OTHER ON 2026-09-03 (CR-340, ledger rows D-202 and
  // D-206). ⛔ The fingerprints below were NOT pasted in from a failure
  // message: the 場面 and the three fields of the dictionary were read side by
  // side first, and this note records what that reading found.
  //
  // ⛔⛔ `RS-45` LEFT THE TABLE ON 2026-09-04 (CR-347 §2.7, ledger row D-202,
  //   利用者の裁定 2026-09-03 「html の読み戻しは不要。ユーザーは .html をダブル
  //   クリックして開けばよい」). 表 T-233 no longer holds the row, and the
  //   manuscript no longer holds its 項, so its pairing is not left behind here
  //   -- 「一度退いた行の指紋を残さない」 is the second half of the case below.
  //   ⚠️ 行 ID は席の番号であり、詰めない: no other row moved up into it.
  // `RS-46` -- 場面 「これ以上深い段には行を足せない」; ja 「これ以上深い段には行を
  //   足せません」 is again the same sentence, en 「A row cannot be added any
  //   deeper than this」 says the same, and the next step 「もっと浅い行に足して
  //   ください」 / 「Add it to a shallower row」 is the one `FR-085`'s cap leaves
  //   open. ⭐ It also stays clear of `RS-38` 「深さの上限に達しているので、これ以上
  //   深い段へは動かせない」, which is the MOVE and not the ADD -- the distinction
  //   CR-340 was written to keep. ⇒ the words tell the scene.
  //
  // ⛔⛔ `RS-47` LEFT THE TABLE ON 2026-09-04, THE SAME DAY IT ARRIVED (CR-349
  //   §1, ledger row 1.81 of 表 T-100). It was added by CR-347 for 場面 「渡され
  //   た日程が読めなかった」 with 作法 `NT-3a` and 正 `FR-087`, and the reading
  //   recorded here on the morning of 2026-09-04 argued the two rows were kept
  //   apart. ⛔ THAT READING WAS WRONG, and the entry is withdrawn rather than
  //   corrected: `RS-26` 「起動時に渡された文書が読めなかった」 is the SAME
  //   scene told the OTHER way (`NT-1`, 正 表 T-024a の `OP-14`), so the
  //   specification held two manners for one situation and contradicted itself.
  //   ⭐ 表 T-024a の `OP-14` has held the whole rule since before CR-347 --
  //   「黙って捨てずに通知すること（MUST）。作法は 表 T-037 の `NT-1`… 運ぶ理由は
  //   表 T-233 の `RS-26` とする。そのうえで 表 T-034 の次の順位へ降りること
  //   （MUST）。空で起動してはならない（MUST NOT）」 -- and `FR-087` now points
  //   at it instead of restating it. ⇒ 表 T-233 no longer holds the row and the
  //   manuscript no longer holds its 項, so its pairing is not left behind here.
  //   ⚠️ 行 ID は席の番号であり、詰めない: no other row moved up into it, and the
  //   42 pairings above are untouched -- not one of them was re-keyed, because
  //   not one of their pairs moved.
  // ---------------------------------------------------------------------
  'RS-46': '1dc2be62612383ad',
  'RS-15': 'c85a8bb4ca6b676b',
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
      // is the latch D-166 asks for: the row was rewritten, the word was not,
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
