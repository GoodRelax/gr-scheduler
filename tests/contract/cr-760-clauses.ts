// CR-760 spec-only clauses: the sentences of docs/spec the marker status and the Task Type cases are driven by

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

export const SQ_5_VALUE =
  'そのタスクの進捗ステータスマークの値（`FR-013` の 表 T-021、遅延診断を出しているあいだ（表 T-206 の `S-445`）は `FR-133` の 表 T-315 の優先順で勝つもの）'
export const SQ_5_DG_WINS = '値が 表 T-315 の `DG-1` 〜 `DG-3` か 表 T-021 の `PM-4` ならその行'
export const SQ_5_LATE_ALWAYS = '⭐ 遅れ（`PM-4`、表 T-021b）は予定の日と基準日だけで決まるので、診断を出していなくても出す。'
export const SQ_5_WHILE_SHOWN = '`GRS` は、`SQ-5` に `DG-1` 〜 `DG-3` を、遅延診断を出している間だけ出すこと。'
export const SQ_5_NOT_BY_DRAWING = '`GRS` は、`SQ-5` の値を、進捗ステータスマークを描くかどうか（`S-63`・`IC-40`）によらずに決めること。'
export const SQ_5_GLYPHS =
  '未着手は `PM-1a`、進行中は `PM-1`、完了は `PM-2`、中断の 2 つは `PM-3`、遅れは `PM-4`、信用できない・要修正は `DG-1`、ボトルネックは `DG-2` の炎、ボトルネック経路は `DG-3`。'
export const SQ_5_WORDS = '表 T-315 の `DG-1` 〜 `DG-4` の語（`FR-134` の 表 T-347 の `DT-1` と同じ語 —— `PM-4` は `DG-4` の語）'

export const SV_8_STATES =
  '状態の列（`SQ-5`）で昇順に並べ替えたとき、`GRS` は、行を 信用できない・要修正 → ボトルネック → ボトルネック経路 → 遅れ → 未着手 → 進行中 → 完了 → 中断・再開予定あり → 中断・再開日未定 の順に並べること。'
export const SV_8_TIES = '`GRS` は、値が同じ行の既定の並びを保つこと。'
export const SV_8_TASK_TYPE =
  'タスク種別の列（`SQ-14`・`FR-134` の 表 T-347 の `DT-9`・`FR-155` の 表 T-374 の `FM-9`）で昇順に並べ替えたとき、`GRS` は、表示の言語によらず、行を タスク → マイルストーン の順に並べること。タスク種別の列（`SQ-14`・`DT-9`・`FM-9`）で降順に並べ替えたとき、`GRS` は、表示の言語によらず、行を マイルストーン → タスク の順に並べること —— 字の順で比べると言語ごとに逆になり、言語を替えると行が跳ねる。'

export const SQ_14_VALUE = '`Task.milestone`（`_assets/fig-erd-detail.md` の `AT-30`） —— 真ならマイルストーン、偽か空ならタスク。'
export const SQ_14_NOT_SHAPE = '`GRS` は、`SQ-14` の値を、描く形（`TaskVisual.shapeKind`）で決めないこと。'
export const SQ_14_WORDS = '辞書の `taskTypes` の語（タスク ／ マイルストーン）。'
export const SQ_14_SORT = '`GRS` は、`SQ-14` の並べ替えで、表示の言語によらず、タスク → マイルストーン を昇順とすること（`SV-8`）。'
export const SQ_14_FILTER = '値の一覧（「タスク」「マイルストーン」）'
export const T_331_TYPE_LEFT_OF_TASK = '`GRS` は、タスク種別の列（`SQ-14`）をタスクの列（`SQ-1`）の 1 つ左に置くこと。'
export const T_347_ORDER = '`GRS` は、表 T-347 の欄を 表 T-347 の行の順に左から並べること —— 表示・ステータス・進捗・タスク種別・タスク・担当・予定日・実績日・理由。'
export const DT_9_VALUE = '表 T-331 の `SQ-14` と同じ'
export const FM_9_VALUE = '行の `Task`（`FM-5`）の、表 T-331 の `SQ-14` と同じ値'
export const T_374_FIXED =
  '`GRS` は、横は、修正案の表では 修正・修正方法・指摘・タスク種別・タスク を、修正の記録の表では 日時・指摘・タスク種別・タスク を左に固定すること（`RW-10` と同じ理由）。'
export const SV_6_FIXED =
  '`GRS` は、横には、タスクの表では `SQ-1` まで（表 T-331 の並びで 表示・進捗ステータス・完了率・タスク種別・タスク の 5 列）、コメントボックスの表では `SQ-7` までを左に固定すること（表 T-257 の `RR-4` と同じ形）。'
export const RW_10_FIXED =
  '横は `DT-8`・`DT-1`・`DT-3`・`DT-9`・`DT-4`（表示・ステータス・進捗・タスク種別・タスク —— 表 T-347 の並びで左の 5 列）を左に固定し'
export const RW_6_ORDER = '`GRS` は、中身の表に、書き出す時の並べ替えとフィルターを済ませた行を、表 T-347 の欄の順で書くこと。'
export const RW_6_NO_VISIBILITY = '`GRS` は、中身に表示の列（`DT-8`）を書かないこと。'
export const RW_6_FIX_ORDER =
  '`GRS` は、中身の表の後に、修正案の表と修正の記録の表（`FR-155` の 表 T-374）を、それぞれの見出し（辞書の語）・各表のフィルターの条件（無ければ「なし」）・表の順で書き、表には、書き出す時の並べ替えとフィルターを済ませた行を 表 T-374 の欄の順で書くこと。'
export const RW_3_WORD =
  '`GRS` は、入力欄の語が表 T-347 の ステータス・進捗・タスク・担当・予定日（`DT-1`・`DT-3`・`DT-4`・`DT-2`・`DT-5`）の値の一部と一致する行を残すこと（`SV-4` の比べ方）。'
export const SV_4_WHERE =
  '`GRS` は、タスクの表では名前（`SQ-1`）か担当名のどれか 1 つ（`SQ-2`）の一部と語が一致する行を、コメントボックスの表では本文（`SQ-7`）の一部と語が一致する行を載せること。'

export const PM_4_MUST = '`PM-4` が成立したとき、`GRS` は、進捗ステータスマークに `PM-4` を出すこと。'
export const PM_4_NOT_FINISHED = '`GRS` は、完了した `Task` を遅れとしないこと。'
export const T_021B_ALL = '`GRS` は、表 T-021 の `PM-4`（遅れ）を、表 T-021b の `DL-1` 〜 `DL-3` のどれかが成り立つときにだけ成立させること。'
export const T_315_PRIORITY = '優先順の小さいほうが勝つ。'

export const AM_25_STATUS =
  '⭐ ステータス（`SQ-5`）は、遅延診断を出していないときの値（`PM-4` か 表 T-019a の状態）で返す —— 診断の値（表 T-315 の `DG-1` 〜 `DG-3`）は `AM-19` の 表 T-317 の `DX-8` が返す（`FR-134` の、AI へ渡す道は 1 つ）。'
export const AM_25_NO_DIAGNOSIS =
  '⚠️ 遅延診断はしない —— ステータスの遅れは、予定の日が基準日を過ぎたタスク・マイルストーン（表 T-021b）を返すだけであり、信用できない・要修正 (?)・ボトルネック・ボトルネック経路 (!!) は入らない。'
export const AM_25_POINTS_TO = '正確な遅延の解析には遅延診断（`readDelayDiagnostics`、`AM-19`）が要る'
export const AM_19_EXACT = '正確な遅延の解析（信用できない値・ボトルネック・ボトルネック経路）はこの命令が返す。'
export const AM_19_SEARCH_ONLY = '`readSearchRows`（`AM-25`）の遅れは基準日との比べだけである'

export const PI_1_CALL =
  '呼び方: `Task`、基準日（`CalendarDay`、無いこともある）、遅延診断を出しているあいだのそのタスクの 表 T-315 の行（`DG-1` 〜 `DG-3`、無いこともある）の順に渡し、答えは 表 T-021 か 表 T-315 の行 ID（`PM-1a`・`PM-1`・`PM-2`・`PM-3`・`PM-4`・`DG-1`・`DG-2`・`DG-3`）の 1 つ'
export const PI_1_NO_COPY = '—— ⛔ 優先の順をコピーして持たせてはならない（MUST NOT） —— コピーすれば、表の値とタスクグループレーンズのマーカーが食い違う'

const PUBLISHED = JSON.parse(readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'published-entries.json'), 'utf8')) as unknown

// Spec: PI-1
export function publishedNoteOf(name: string): readonly string[] {
  const found: string[][] = []
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const one of value) walk(one)
      return
    }
    if (value === null || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    const note = record['note'] as { ja?: unknown } | undefined
    if (record['name'] === name && Array.isArray(note?.ja)) found.push(note.ja as string[])
    for (const one of Object.values(record)) walk(one)
  }
  walk(PUBLISHED)
  if (found.length !== 1) throw new Error(`published-entries.json holds ${found.length} notes for ${name}`)
  return found[0] ?? []
}
