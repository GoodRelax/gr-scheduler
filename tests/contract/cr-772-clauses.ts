// CR-772 spec-only clauses: the sentences of HF-15 and its neighbors that the free-drag cases are driven by

export const HF_15_ONE_DRAG = '`GRS` は、1 回のドラッグで、タスクグループの位置と段の両方を決めること。'
export const HF_15_NO_AXIS = 'タスクグループの位置と段の両方を決めること。`GRS` は、向きで軸を分けないこと。'
export const HF_15_CARRY_START = '押した点から `_assets/tbl-settings.md` の 表 T-206 の `S-208` を超えて動かしたとき、`GRS` は、タスクグループを運び始めること。'
export const HF_15_CHOOSE_ONLY = '`S-208` を超える前に離したとき、`GRS` は、タスクグループを選ぶだけにすること（`FR-085`）。'
export const HF_15_GAP = '`S-208` を超える前に離したとき、`GRS` は、タスクグループを選ぶだけにすること（`FR-085`）。タスクグループを運んでいる間、`GRS` は、縦の位置で隙間を選ぶこと。'
export const HF_15_GAP_MIDPOINT = '`GRS` は、隙間を、行の高さの中点がポインタより上にある行の数で決めること（行の高さは `FR-042` でタスクグループごとに違う）。'
export const HF_15_DEPTH =
  '行の高さの中点がポインタより上にある行の数で決めること（行の高さは `FR-042` でタスクグループごとに違う）。タスクグループを運んでいる間、`GRS` は、横の位置で段を選ぶこと。'
export const HF_15_DEPTH_ROUNDED =
  'タスクグループを運んでいる間、`GRS` は、押した点からの横の移動を、描く字下げ（表 T-201 の `S-37` に描く比を掛けた幅）で割って四捨五入した数だけ、元の段から動かすこと。'
export const HF_15_RANGE =
  '`GRS` は、隙間に置ける段を、下限を下のタスクグループの段（無ければ 1）、上限を上のタスクグループの段 ＋ 1（無ければ 1）とすること。'
export const HF_15_NOT_SHALLOWER = '上限を上のタスクグループの段 ＋ 1（無ければ 1）とすること。`GRS` は、下限より浅く置かないこと。'
export const HF_15_STOP_AT_END = '範囲の外へ引いたとき、`GRS` は、端の段で黙って止めること。'
export const HF_15_PARENT =
  '`GRS` は、段 d の親を、上のタスクグループから木を上へたどって最初に出会う段 d − 1 のタスクグループとすること。d ＝ 1 のとき、`GRS` は、親を持たせないこと。'
export const HF_15_ORDER = '`GRS` は、並びを、親の子のうち、上のタスクグループを含む枝の次とすること（上のタスクグループが親そのものなら長子）。'
export const HF_15_FIRST_CHILD = '`GRS` は、並びを、親の子のうち、上のタスクグループを含む枝の次とすること（上のタスクグループが親そのものなら長子）。'
export const HF_15_FOLDED = '`GRS` は、折りたたまれたタスクグループの真下の隙間では、折りたたまれたタスクグループの段 ＋ 1 を選べるようにすること。'
export const HF_15_FOLDED_LAST = '折りたたまれたタスクグループの段 ＋ 1 を選んで離したとき、`GRS` は、運んだタスクグループを折りたたまれたタスクグループの末子にすること。`GRS` は、折りたたまれたタスクグループを畳んだまま保つこと（`HM-6`）。'
export const HF_15_UNDRAWN =
  '`GRS` は、描かれていないタスクグループ（`HR-6` で隠したもの、`FR-018` の表示量が落としたもの、`FR-098` がパネルの先頭へ上げた行）を、隙間の数に入れないこと。'
export const HF_15_BETWEEN = '描かれていないタスクグループのあいだへ落としたとき、`GRS` は、上のタスクグループの直後に入れること。'
export const HF_15_WITH_DESCENDANTS = '上のタスクグループの直後に入れること。`GRS` は、運んだタスクグループを配下ごと動かすこと。'
export const HF_15_ONLY_THE_GRABBED = '複数のタスクグループを選んでいる間も、`GRS` は、掴んだ 1 つだけを動かすこと。'
export const HF_15_NO_WRITE_IN_PLACE = '元の場所と同じ所で離したとき、`GRS` は書き込まないこと。'
export const HF_15_ONE_WRITE = '元の場所と違う所で離したとき、`GRS` は、表 T-108 の `CM-73` を 1 回書くこと（取り消しの 1 手、`UN-4`）。'
export const HF_15_ESCAPE = '運んでいる間に `Esc` を押したとき、`GRS` は運ぶのをやめること（`IN-4`）。'
export const HF_15_DRAW_TARGET =
  '運んでいる間に `Esc` を押したとき、`GRS` は運ぶのをやめること（`IN-4`）。タスクグループを握っている間、`GRS` は落ち先を描くこと。'
export const HF_15_LINE =
  'タスクグループを握っている間、`GRS` は、選んだ隙間に、選んだ段の字下げの位置からパネルの右端まで、差し込み線を引くこと。'
export const HF_15_LINE_COLOR = '`GRS` は、差し込み線と丸の色を 表 T-236 の `S-151`、太さを 表 T-206 の `S-213` とすること。'
export const HF_15_GROUND = 'タスクグループを握っている間、`GRS` は、掴んでいるタスクグループと配下に地を敷くこと。'
export const HF_15_GROUND_COLOR =
  '`GRS` は、掴んでいるタスクグループと配下に敷く地の色を 表 T-236 の `S-151`、濃さを 表 T-206 の `S-215` とすること。'
export const HF_15_COPY =
  'タスクグループを握っている間、`GRS` は、掴み代の印とタスクグループ名の写しを、ポインタから 表 T-206 の `S-599` だけ右と下へずらして付いて行かせること。'
export const HF_15_EDGE_SCROLL =
  '掴んだまま、ポインタがタスクグループパネルの上の縁か下の縁から 表 T-206 の `S-597` の内に入ったとき、`GRS` は、パネルと日程表を縦に送ること。'
export const HF_15_SPEED = '`GRS` は、縦に送る速さを、縁に近いほど速くし、縁と縁の外では 表 T-206 の `S-598` とすること。'
export const HF_15_WHEEL = '縁と縁の外では 表 T-206 の `S-598` とすること。タスクグループを握っている間も、`GRS` は、ホイールで縦に送れるようにすること。'
export const HF_15_RESELECT = '握っている間に縦に送ったとき、`GRS` は、落ち先を送ったあとの行で選び直すこと。'

// Why: the retired HM-3a note and UC-002 2a sentences are in cr-774-clauses.ts, which holds their replacements.
export const UF_97_ROW =
  '掴んだタスクグループを 表 T-051 の `HF-15` に従って運び、落ち先（隙間と段）を親と並びの書き込み（表 T-108 の `CM-73`）に変える'
