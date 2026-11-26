// CR-759 spec-only clauses: the sentences of T-346, T-373 and T-374 these cases are driven by, copied byte for byte from docs/spec

export const RW_12_LEFT_PACKED_ORDER =
  '`GRS` は、修正案の下の段に、左詰めで、左から「修正件数 : n 件」（チェックの入った行の数 —— 見出しのチェックボックス（表 T-374 の `FM-1`）で入れ外しした行を含む、辞書の `delayFixes` の `fixCount`）・`IC-166`（推奨案をすべて採用する —— `RW-18`）・`IC-157`（上書きして修正）・`IC-158`（スケジュールを別名でバックアップして修正）を並べること（利用者が定めた）。'

export const RW_12_NOTICE_LINE =
  '`GRS` は、結果の知らせ（`RW-17`）を、修正案の下の段の並びの下に 1 行を足して出すこと。'

export const RW_17_UNDER_AT_THE_LEFT =
  '束を発行した後（`FR-155`）、束を当てたとき、`GRS` は、修正案の下の段（`RW-12`）の釦の並びの下に 1 行を足し、足した行の左端から、辞書の `delayFixes` の `fixedNotice`（n は当てた束の行の数）を出すこと。'

export const RW_17_ONE_LINE_TALLER =
  '`GRS` は、修正案の下の段を、知らせがある間だけ 1 行高くすること。'

export const RW_18_TICKS =
  '`IC-166`（下の段 `RW-12`）を押したとき、`GRS` は、修正案の表のうち、修正のしかたが機械の行と、択が 1 つの選ぶの行で、チェックが入っておらず効く（`FM-1` —— 読み取り専用の行と、元の行を外した連鎖の行は効かない）すべての行にチェックを入れること（利用者が定めた）。`IC-166` を押したとき、`GRS` は、`RW-16` のとおり修正案を 1 度作り直すこと。'

export const RW_18_HIDDEN_ROWS_TOO =
  '`IC-166` を押したとき、`GRS` は、列のフィルタと入力欄の語で一覧から外れている行にもチェックを入れること。'

export const RW_18_UNTOUCHED =
  '`IC-166` を押したとき、`GRS` は、チェックを外さないこと。`IC-166` を押したとき、`GRS` は、日付の候補の行・択が 2 つ以上の選ぶの行・手で修正の行に触れないこと。'

export const RW_18_INERT =
  '入れる行が 1 つも無い間、`GRS` は、`IC-166` を効かせないこと（`FR-092`）。'

export const RW_18_NO_STEP =
  '`GRS` は、`IC-166` の押下で取り消しの段を積まないこと（`FR-155` —— チェックは文書に書かない）。'

export const FM_1_ONE_CHOICE =
  '⭐ 択が 1 つの選ぶの行は、チェックを入れればその択を選んだものとする（利用者が定めた） —— 択の一覧を出さない（`FM-8`）。'

export const FM_1_TWO_CHOICES =
  '⭐ 択が 2 つ以上の選ぶの行で、択を選んでいないうちに箱を押したら、チェックを入れず、その行の修正後の択の一覧へ入力の焦点を移して一覧を開く —— 見えるチェックと数える行（表 T-346 の `RW-12` の n）を食い違わせない。'

export const FM_8_ONE_CHOICE_WORD =
  '択が 1 つならその択の語（一覧にしない —— チェックで採る、`FM-1`）'

export const T_373_ONE_CHOICE =
  '`GRS` は、選ぶの行のうち択が 1 つの行では、択を並べず、人がチェックを入れれば択を採ること（利用者が定めた —— 表 T-374 の `FM-1`）。'

export const T_374_FM_1_WIDTH =
  '`GRS` は、列の既定の幅を、`FM-4` は `_assets/tbl-settings.md` の `S-481`、`FM-5` は `S-478` とし、ほかの列（`FM-1` を含む）は `SV-18` と同じ規則で測ること。'

export const T_374_FM_1_EDGE =
  '`GRS` は、`FM-1` にも、ほかの列と同じく右の境目（表 T-023d の `GR-28`）を持たせ、引いて幅を変えられるようにすること。'
