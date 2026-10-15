// CR-772 spec-only clauses: the sentences of HF-15 and its neighbors that the free-drag cases are driven by

export const HF_15_ONE_DRAG = '1 回のドラッグで、位置と段の両方を決めること（MUST）'
export const HF_15_NO_AXIS = '位置と段の両方を決めること（MUST）**。⛔ **向きで軸を分けてはならない（MUST NOT）'
export const HF_15_CARRY_START = '押した点から `_assets/tbl-settings.md` の 表 T-206 の `S-208` を超えて動いたときに運び始めること（MUST）'
export const HF_15_CHOOSE_ONLY = '超える前に離したときは、そのタスクグループを選ぶだけとする（`FR-085`）。'
export const HF_15_GAP = '超える前に離したときは、そのタスクグループを選ぶだけとする（`FR-085`）。⭐ **縦で隙間を選ぶこと（MUST）'
export const HF_15_GAP_MIDPOINT = '隙間は、行の高さの中点がポインタより上にある行の数で決まる'
export const HF_15_DEPTH =
  'ポインタより上にある行の数で決まる（行の高さは `FR-042` でタスクグループごとに違う）。⭐ **横で段を選ぶこと（MUST）'
export const HF_15_DEPTH_ROUNDED =
  '押した点からの横の移動を、描く字下げ（表 T-201 の `S-37` に描く比を掛けた幅）で割って四捨五入した数だけ、元の段から動かす。'
export const HF_15_RANGE =
  '隙間に置ける段は、下限を下のタスクグループの段（無ければ 1）、上限を上のタスクグループの段 ＋ 1（無ければ 1）とすること（MUST）'
export const HF_15_NOT_SHALLOWER = '上のタスクグループの段 ＋ 1（無ければ 1）とすること（MUST）。⛔ 下限より浅く置いてはならない（MUST NOT）'
export const HF_15_STOP_AT_END = '範囲の外へ引いたときは、端の段で黙って止めること（MUST）'
export const HF_15_PARENT =
  '段 d の親は、上のタスクグループから木を上へたどって最初に出会う段 d − 1 のタスクグループとし、d ＝ 1 なら親を持たないこと（MUST）'
export const HF_15_ORDER = '並びは、その親の子のうち、上のタスクグループを含む枝の次とする'
export const HF_15_FIRST_CHILD = '上のタスクグループが親そのものなら長子である。'
export const HF_15_FOLDED = '折りたたまれたタスクグループの真下の隙間では、その段 ＋ 1 を選べること（MUST）'
export const HF_15_FOLDED_LAST = '選ぶと、そのタスクグループの末子になり、畳んだまま保つ（`HM-6`）。'
export const HF_15_UNDRAWN =
  '描かれていないタスクグループ（`HR-6` で隠したもの、`FR-018` の表示量が落としたもの、`FR-098` がパネルの先頭へ上げた行）は、隙間の数に入れないこと（MUST）'
export const HF_15_BETWEEN = 'そのあいだへ落としたときは、上のタスクグループの直後に入れること（MUST）'
export const HF_15_WITH_DESCENDANTS = 'そのあいだへ落としたときは、上のタスクグループの直後に入れること（MUST）。⭐ そのタスクグループの配下ごと動かすこと（MUST）'
export const HF_15_ONLY_THE_GRABBED = '複数のタスクグループを選んでいても、掴んだ 1 つだけを動かすこと（MUST）'
export const HF_15_NO_WRITE_IN_PLACE = '離したとき、元の場所と同じなら書き込まないこと（MUST）'
export const HF_15_ONE_WRITE = '違えば 表 T-108 の `CM-73` を 1 回書く —— 取り消しの 1 手である（`UN-4`）。'
export const HF_15_ESCAPE = '`Esc` で運ぶのをやめる（`IN-4`）。'
export const HF_15_DRAW_TARGET = '`Esc` で運ぶのをやめる（`IN-4`）。⭐ **握っているあいだ、落ち先を描くこと（MUST）'
export const HF_15_LINE = '① 選んだ隙間に、選んだ段の字下げの位置からパネルの右端まで、差し込み線を引く。'
export const HF_15_PARENT_FRAME = '② 親になるタスクグループを枠で囲む（最上段に置くなら囲まない）。'
export const HF_15_LINE_COLOR = '線と枠の色は 表 T-236 の `S-151`、太さは 表 T-206 の `S-213` とすること（MUST）'
export const HF_15_GROUND = '③ 掴んでいるタスクグループとその配下には地を敷くこと（MUST）'
export const HF_15_GROUND_COLOR = '色は 表 T-236 の `S-151`、濃さは 表 T-206 の `S-215` とすること（MUST）'
export const HF_15_COPY = '④ 掴み代の印とタスクグループ名の写しを、ポインタから 表 T-206 の `S-599` だけ右と下へずらして付いて行かせること（MUST）'
export const HF_15_EDGE_SCROLL =
  '掴んだまま、ポインタがタスクグループパネルの上の縁か下の縁から 表 T-206 の `S-597` の内に入ったら、パネルと日程表を縦に送ること（MUST）'
export const HF_15_SPEED = '速さは縁に近いほど速くし、縁とその外では 表 T-206 の `S-598` とする。'
export const HF_15_WHEEL = '縁とその外では 表 T-206 の `S-598` とする。⭐ 握っているあいだもホイールで縦に送れること（MUST）'
export const HF_15_RESELECT = 'どちらで送っても、落ち先は送ったあとの行で選び直す。'

// WHY: the retired HM-3a note and UC-002 2a sentences are in cr-774-clauses.ts, which holds their replacements.
export const UF_97_ROW =
  '掴んだタスクグループを 表 T-051 の `HF-15` に従って運び、落ち先（隙間と段）を親と並びの書き込み（表 T-108 の `CM-73`）に変える'
