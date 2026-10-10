// CR-723 spec-only contract: the clauses and rows that put the tables' views into the GRS JSON (FR-151, OP-18, UN-20, CM-92, S-560 to S-572, T-372).

import { describe, expect, it } from 'vitest'

import { bare, specTable, unbroken } from './spec-table'
import { GLOSSARY, KEYS_OF, REQUIREMENTS, SETTINGS_BOOK, TABLES } from './cr-723-stage'

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? '')

// WHY: each clause ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_151_NOT_SAVED = '⛔ パネルの表示・位置・大きさ・語・列の幅を文書に保存してはならない（MUST NOT） —— 画面の使い方であって文書の内容ではない（`_assets/tbl-settings.md` の 表 T-206 の `S-442`・`S-419`・`S-420`）。'
const FR_151_SAVED = '⭐ 3 つの表の見え方 —— 表示の列の値・スケジュールフィルタの入切・列のフィルタ・並べ替え —— は文書に保存すること（MUST）'
const FR_151_WHY = '（`_assets/tbl-settings.md` の 表 T-203 の `S-560` 〜 `S-572`） —— スケジュールフィルタを掛けた日程を、そのまま人に渡すためである（利用者が定めた）。'
const FR_151_EDIT = '表の見え方を変えたら未保存の編集（`FR-100`）であり、取り消しの 1 段である（`FR-031` の 表 T-027 の `UN-20`）。'
const FR_151_RECEIVER = '⚠️ 受け取った人は、開いた直後に赤い入口と帯（`_assets/tbl-glossary.md` の `U-67`）で、スケジュールフィルタを掛けた日程だと読める（表 T-024a の `OP-18`）。'
const FR_134_NOT_WRITTEN = '⛔ レポートと窓の状態（出ているか・位置・大きさ・語・列の幅）を文書に書いてはならない（MUST NOT）'
const FR_134_SAVED = '⚠️ レポートの表の見え方は保存する —— `FR-151`（表 T-203 の `S-564` 〜 `S-567`）。'
const FR_099_NOT_SAVED = '⛔ ウィンドウの状態（出ているか・位置・大きさ・語・列の幅・選択）を文書に保存してはならない（MUST NOT）'
const FR_099_SAVED = '⚠️ 保存する側の値は `FR-151` が持つ —— 担当リストの表は 表 T-203 の `S-568` 〜 `S-572`。'

const OP_18_REPLACE = '**置き換えを選んで** `GRS JSON` を読んだときは、文書が持つ 3 つの表の見え方（`_assets/tbl-settings.md` の 表 T-203 の `S-560` 〜 `S-572`、規則は `FR-151` の 表 T-353）に替えること（MUST）。'
const OP_18_MINIMIZED = 'スケジュールフィルタを掛けている表（`S-560`・`S-564`・`S-568` が真）のウィンドウを、最小化（`FR-036` の 表 T-335 の `WB-2`）で出し、その表の `IC-143` と起動アイコンを赤で描くこと（MUST）（表 T-353 の `TV-12`）'
const OP_18_SEARCH = '検索パネルはタスクの表を出す。'
const OP_18_DIAGNOSE = '⭐ 遅延診断レポートの表のスケジュールフィルタを掛けている文書では、遅延診断を始め（`FR-130`）、レポートの窓を最小化で出す'
const OP_18_NO_DATE = '基準日（`FR-046`）が無く診断できないときは、レポートの表のスケジュールフィルタを解除して開く —— 未保存の編集にしない。'
const OP_18_DROP = '⭐ 文書に無い `uid`（`S-561`・`S-565`・`S-569`）と、表に無い列の行 ID（表 T-372 の `column`）は、読むときに黙って捨てる —— 拒まない'
const OP_18_NOT_EDIT = '⚠️ 開いたことは未保存の編集ではない —— 文書が持つ値を読んだだけである'

const TV_6_COUNTS = '掛けたことは `UN-20` の 1 段である。'
const TV_8_EDIT = '⭐ どの解除も表の見え方の変更であり、未保存の編集で取り消しの 1 段である（表 T-027 の `UN-20`） —— ウィンドウを閉じて解除したときも同じで、取り消すとスケジュールフィルタが掛かり、ウィンドウが最小化（`FR-036` の 表 T-335 の `WB-2`）で戻る（利用者が定めた）。'
const TV_8_BAND = '帯の「スケジュールフィルタを解除」は、すべての表の解除を合わせて 1 段とする'
const TV_9_REPLACED = '置き換えた文書が持つ 3 つの表の見え方（`_assets/tbl-settings.md` の 表 T-203 の `S-560` 〜 `S-572`）に替え、スケジュールフィルタを掛けている表のウィンドウを出す（表 T-024a の `OP-18`）。'
const TV_9_NONE = '見え方を持たない文書（新規・MSPDI）は既定 —— どの行も「表示」、どの表もスケジュールフィルタを掛けず、列のフィルタと並べ替えも無い'
const SV_14_REMEMBER = '語・表の切り替え・列の幅・位置・大きさは、同じ画面のあいだ覚え、開き直したときに戻す'
const SV_14_STAYS = '表示の列の値（`SQ-10`）・列のフィルタ・並べ替えは、閉じても残る —— 文書が持つ'
const WB_6_MINIMIZED = '⚠️ 文書を開いたときにスケジュールフィルタのために出すウィンドウ（表 T-024a の `OP-18`）は、`WB-2` から始める'
const UN_20_SJ = '⭐ 飛ぶ（`SJ-0`）ために行を「表示」に戻したこと・スケジュールフィルタを解除したことは、`SJ-2` の展開と同じ 1 段に入れる。'
const UN_20_OUT = '⚠️ 語・ウィンドウの位置と大きさ・最小化と最大化・列の幅・開いているフィルタは対象外 —— 文書に保存しない（`FR-151`）'
const CD_1_TAIL = '表の見え方でその `Task` を「非表示」とする値（`_assets/tbl-settings.md` の `S-561`・`S-565`）'
const CD_5_TAIL = '表の見え方でその担当を「非表示」とする値（`_assets/tbl-settings.md` の `S-569`）も消える'
const S_445_EXCEPTION = '⭐ 例外: 開いた文書が遅延診断レポートの表のスケジュールフィルタを掛けている（表 T-203 の `S-564` が真）ときは、開いたときに診断を始める（表 T-024a の `OP-18` —— 利用者が定めた）。'

describe('CR-723 -- FR-151, FR-134, FR-099 narrow what is not saved and say what is', () => {
  it('FR-151 (MUST NOT): the panel, its place, size, word and column widths are still not saved', () => {
    expect(REQUIREMENTS).toContain(FR_151_NOT_SAVED)
  })

  it('FR-151 (MUST): the three tables\' views are saved, for handing the filtered schedule to a person', () => {
    expect(REQUIREMENTS).toContain(FR_151_SAVED + FR_151_WHY)
  })

  it('FR-151: a change of a view is an unsaved edit and one undo step; the receiver reads it by the red entrance and the bar', () => {
    expect(REQUIREMENTS).toContain(FR_151_EDIT)
    expect(REQUIREMENTS).toContain(FR_151_RECEIVER)
  })

  it('FR-151: the old ban on saving the Visibility, the eye and the undo record is gone', () => {
    expect(REQUIREMENTS).not.toContain('表ごとの表示の列の値とスケジュールフィルタの入切も文書に保存してはならない')
    expect(REQUIREMENTS).not.toContain('取り消しの記録にも載せない')
    expect(REQUIREMENTS).not.toContain('パネルの表示・位置・大きさ・語・フィルタ・並べ替え・列の幅を文書に保存してはならない')
  })

  it('FR-134 (MUST NOT): the report window state is not written, but the report table\'s view is saved (S-564 to S-567)', () => {
    expect(REQUIREMENTS).toContain(FR_134_NOT_WRITTEN)
    expect(REQUIREMENTS).toContain(FR_134_SAVED)
    expect(REQUIREMENTS).not.toContain('（出ているか・位置・大きさ・語・フィルタ・並べ替え）を文書に書いてはならない')
  })

  it('FR-099 (MUST NOT): the Resource List window state is not saved, but its table\'s view is (S-568 to S-572)', () => {
    expect(REQUIREMENTS).toContain(FR_099_NOT_SAVED)
    expect(REQUIREMENTS).toContain(FR_099_SAVED)
    expect(REQUIREMENTS).not.toContain('（出ているか・位置・大きさ・語・列のフィルタ・並べ替え・列の幅・選択）を文書に保存してはならない')
  })
})

describe('CR-723 -- table T-024a OP-18 opens a document with its views', () => {
  it('OP-18 sits between OP-6 and OP-7 and holds the five clauses', () => {
    const ids = specTable('T-024a').rows.map((one) => one.id)
    expect(ids.indexOf('OP-18')).toBeGreaterThan(ids.indexOf('OP-6'))
    expect(ids.indexOf('OP-18')).toBeLessThan(ids.indexOf('OP-7'))
    const say = cellOf('T-024a', 'OP-18', '規則')
    expect(say, 'the cell is read by its heading').not.toBe('')
    for (const clause of [OP_18_REPLACE, OP_18_MINIMIZED, OP_18_SEARCH, OP_18_DIAGNOSE, OP_18_NO_DATE, OP_18_DROP, OP_18_NOT_EDIT]) {
      expect(say).toContain(clause)
    }
  })

  it('OP-18 names the eye, the minimized start and the report diagnosis, and no other table row', () => {
    expect(REQUIREMENTS).toContain(OP_18_REPLACE)
    expect(REQUIREMENTS).toContain(OP_18_MINIMIZED)
  })
})

describe('CR-723 -- the lifetime of the schedule filter follows the document (T-353, T-330, T-335)', () => {
  it('TV-6: turning it on is one undo step of UN-20 and opens no task group', () => {
    const say = cellOf('T-353', 'TV-6', '定め')
    expect(say).toContain(TV_6_COUNTS)
    expect(say).toContain('`treeState` を変えない（利用者が定めた）')
    expect(say).toContain('を、表示の列の値の変更（`UN-20`）と合わせて 1 段とする')
  })

  it('TV-8: every release is an edit and a step; closing the window and undoing brings it back minimized; the bar is one step', () => {
    const say = cellOf('T-353', 'TV-8', '定め')
    expect(say).toContain(TV_8_EDIT)
    expect(say).toContain(TV_8_BAND)
    expect(say).toContain('解除しても表示の列の値は残る（利用者が定めた）')
  })

  it('TV-9: replacing the document takes the new document\'s views; a document without views is the default', () => {
    const say = cellOf('T-353', 'TV-9', '定め')
    expect(say).toContain(TV_9_REPLACED)
    expect(say).toContain(TV_9_NONE)
    expect(say).not.toContain('3 つの表の表示の列の値を捨て')
  })

  it('SV-14: the Visibility, the column filters and the sort stay after the panel is closed', () => {
    const say = cellOf('T-330', 'SV-14', '定め')
    expect(say).toContain(SV_14_REMEMBER)
    expect(say).toContain(SV_14_STAYS)
    expect(say).not.toContain('語・表の切り替え・フィルタ・並べ替え・列の幅・位置・大きさは')
  })

  it('WB-6: a window shown for the schedule filter on opening starts at WB-2', () => {
    expect(unbroken(specTable('T-335').rows.find((one) => one.id === 'WB-6')?.cells.join(' ') ?? '')).toContain(WB_6_MINIMIZED)
  })
})

describe('CR-723 -- UN-20 is the undo row of a view, CD-1 and CD-5 take the hidden rows with the target, CM-92 is the one command', () => {
  it('UN-20 sits after UN-14 and counts one change as one step, the jump with the unfold, and leaves the window state out', () => {
    const ids = specTable('T-027').rows.map((one) => one.id)
    expect(ids.indexOf('UN-20')).toBeGreaterThan(ids.indexOf('UN-14'))
    const text = cellOf('T-027', 'UN-20', '操作')
    expect(text).toContain('1 回の変更を 1 段とする')
    expect(text).toContain(UN_20_SJ)
    expect(text).toContain(UN_20_OUT)
  })

  it('CD-1 and CD-5: deleting the target takes the hidden-row value with it', () => {
    const task = cellOf('T-050', 'CD-1', '一緒に消えるもの')
    const resource = cellOf('T-050', 'CD-5', '一緒に消えるもの')
    expect(task).toContain(CD_1_TAIL)
    expect(resource).toContain(CD_5_TAIL)
  })

  it('CM-92 setTableView is the one command that replaces one table\'s view', () => {
    const row = specTable('T-108').rows.find((one) => one.id === 'CM-92')
    expect(row).toBeDefined()
    const cells = row?.cells.map((one) => unbroken(one)).join(' | ') ?? ''
    expect(cells).toContain('`setTableView`')
    expect(cells).toContain('表 1 つの見え方（表示の列の値・スケジュールフィルタの入切・列のフィルタ・並べ替え')
    expect(GLOSSARY).toContain('出す命令は `setTableView`（表 T-108 の `CM-92`）1 つであり、未保存の編集（`FR-100`）で取り消しの 1 段である（`FR-031` の 表 T-027 の `UN-20`）')
  })
})

describe('CR-723 -- table T-203 rows S-560 to S-572 hold the 13 keys with their defaults, and table T-372 holds the two shapes', () => {
  const T_203 = specTable('T-203')
  const keyOfRow = (id: string): string => bare(T_203.rows.find((one) => one.id === id)?.by['キー'] ?? '')
  const defaultOfRow = (id: string): string => bare(T_203.rows.find((one) => one.id === id)?.by['既定'] ?? '')

  const EXPECTED: readonly { id: string; key: string; initial: string }[] = [
    { id: 'S-560', key: 'tableViews.searchPanel.isScheduleFilterApplied', initial: 'false' },
    { id: 'S-561', key: 'tableViews.searchPanel.hiddenTaskUids', initial: '[]' },
    { id: 'S-562', key: 'tableViews.searchPanel.columnFilters', initial: '[]' },
    { id: 'S-563', key: 'tableViews.searchPanel.sort', initial: 'null' },
    { id: 'S-564', key: 'tableViews.delayDiagnosticsReport.isScheduleFilterApplied', initial: 'false' },
    { id: 'S-565', key: 'tableViews.delayDiagnosticsReport.hiddenTaskUids', initial: '[]' },
    { id: 'S-566', key: 'tableViews.delayDiagnosticsReport.columnFilters', initial: '[]' },
    { id: 'S-567', key: 'tableViews.delayDiagnosticsReport.sort', initial: 'null' },
    { id: 'S-568', key: 'tableViews.resourceList.isScheduleFilterApplied', initial: 'false' },
    { id: 'S-569', key: 'tableViews.resourceList.hiddenResourceUids', initial: '[]' },
    { id: 'S-570', key: 'tableViews.resourceList.isUnassignedHidden', initial: 'false' },
    { id: 'S-571', key: 'tableViews.resourceList.columnFilters', initial: '[]' },
    { id: 'S-572', key: 'tableViews.resourceList.sort', initial: 'null' },
  ]

  it('each row is in table T-203 under its key and default (walks every row)', () => {
    for (const one of EXPECTED) {
      expect(keyOfRow(one.id), one.id).toBe(one.key)
      expect(defaultOfRow(one.id), one.id).toBe(one.initial)
    }
  })

  it('the 13 keys are exactly the keys the stage lists for the three tables', () => {
    const fromStage = TABLES.flatMap((table) => KEYS_OF[table].map((key) => `tableViews.${table}.${key}`))
    expect(fromStage.sort()).toEqual(EXPECTED.map((one) => one.key).sort())
  })

  it('S-560 holds the reason, the minimized opening and the pointer to table T-206', () => {
    const say = cellOf('T-203', 'S-560', '意味・範囲の理由')
    expect(say).toContain('変えれば取り消せることは `FR-151` が持つ（表 T-027 の `UN-20`）')
    expect(say).toContain('開いた文書で真なら、その表のウィンドウを最小化で出す（表 T-024a の `OP-18`）')
    expect(say).toContain('語・ウィンドウの位置と大きさ・列の幅は 表 T-206 の行である')
  })

  it('table T-372 holds ColumnFilter (column, hiddenValues, fromDate, toDate) and ColumnSort (column, direction)', () => {
    // WHY: table T-372 carries no row-ID column, so specTable cannot read it; its rows are cut from the caption on.
    const lines = SETTINGS_BOOK.split(/\r?\n/)
    const from = lines.findIndex((line) => line.startsWith('**表 T-372 —'))
    expect(from, 'the caption of table T-372').toBeGreaterThanOrEqual(0)
    const rows = lines.slice(from + 1).filter((line) => line.startsWith('| `'))
    const pairs = rows.map((line) => line.split('|').slice(1, 3).map((cell) => cell.replace(/`/g, '').trim()).join('.'))
    expect(pairs.sort()).toEqual(
      ['ColumnFilter.column', 'ColumnFilter.hiddenValues', 'ColumnFilter.fromDate', 'ColumnFilter.toDate', 'ColumnSort.column', 'ColumnSort.direction'].sort(),
    )
    expect(SETTINGS_BOOK).toContain('3 つの表が同じ形を持つので、形はここに 1 度だけ置き')
  })

  it('table T-206 no longer holds the four rows that kept the Visibility and the eyes off the file, and S-420 and S-546 point at table T-203 for the filters, sort and views', () => {
    const t206 = specTable('T-206').rows.map((one) => one.id)
    for (const number of [494, 495, 547, 548]) expect(t206, `S-${number}`).not.toContain(`S-${number}`)
    expect(unbroken(specTable('T-206').rows.find((one) => one.id === 'S-420')?.cells.join(' ') ?? '')).toContain('列のフィルタと並べ替えは文書が持つ（表 T-203 の `S-562`・`S-563`）')
    expect(unbroken(specTable('T-206').rows.find((one) => one.id === 'S-546')?.cells.join(' ') ?? '')).toContain('表の見え方は 表 T-203 の `S-568` 〜 `S-572`')
  })

  it('S-445 (not saved) has the one exception: a document that saved the report\'s eye starts the diagnosis (S-564, OP-18)', () => {
    expect(unbroken(specTable('T-206').rows.find((one) => one.id === 'S-445')?.cells.join(' ') ?? '')).toContain(S_445_EXCEPTION)
  })
})
