# CR-772 —— タスクグループは 1 回のドラッグで、縦で隙間を、横で段を選んで置く

> 起草と仕様の段: 2026-10-16、聞き取りの席（`545dc42a` の上）。⭐ **仕様の段は当てた**（`docs/spec` の本文・表・原稿と `npm run gen`、変更履歴 4.83）。⛔ **コード（`src` の手書きの部分）と試験は当てていない** —— 実装の体が 5 節の継ぎ目で当て、別の体が仕様だけを読んで試験を書く。
> ID の帯: 番号 `CR-772`・変更履歴 4.83 を調整役から受けた。`S-597`〜`S-599` は合流した木の `S-` の最大 596 の次から取った。引いた ID: `RS-36`〜`RS-39`・`S-212`（`retired.py` に理由とともに記した）。`perf-pending` の 220 は実装の体が着地のときに足す（8 節）。
> 当てるもの: 利用者の裁定 `JDG-2390`（案 B —— 1 回のドラッグで位置と段）・`JDG-2391`（畳んだまま末子）・`JDG-2392`（縁の自動送り ＋ 押したままホイール）・`JDG-2393`（段の上限は黙って止める）・`JDG-2394`（隠した行の前後・掴んだ 1 つだけ・キーボードの入口なし・親だけは動かさない）。閉じるもの: 台帳 `DFC-2900`。
> 覆すもの: 2026-08-30 の「上下か左右どちらかのみ」（`JDG-2397` に写した `PND-400` の逐語 —— `JDG-2390` が覆した。「配下もつれて移動する」は保つ）。`HF-15` の「折りたたまれた群の中の場所を選んではならない（MUST NOT）」（`JDG-2391`）と「動かせないときは理由を告げる（MUST）」のうち段の上限（`JDG-2393`）。
> 見本: `studies/58-task-group-free-drag/index.html`（規則 1〜7 を動かしている。利用者が触って `JDG-2391` を答えた）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`545dc42a`）

| 主張 | 見たもの | 扱い |
|---|---|---|
| 利用者の 4 回のドラッグは効いていなかった | **偽**。操作の記録（2026-10-15 23:08）の 4 回とも `act=changeDocument`。4 回とも最初の動きが縦で、位置の軸に固まった（段の軸は 0 回） | 欠陥ではなく仕様（軸の固定）が原因 —— 本書 |
| 段を変えるには左右の別のドラッグが要る | 真。`task-group-grab.ts` の `taskGroupGrabAxisAt` が最初の向きで軸を決め、`commandFromRowGrab` は軸ごとに 1 つの `moveTaskGroup` しか作らない | X-1 |
| 右へ動かすと、畳まれた兄弟の中へ消える | 真（コードの読み）。`taskGroupGrabLandingOf` は `treeState` を見ない。上下だけが畳まれた群の中を除く（`taskGroupGrabPlacesInDrawingOrder`） | `JDG-2391` で「末子に入る」が正になった |
| 画面の外へは運べない | 真（コードの読み）。置ける場所は `drawnTaskGroupBoxes` だけから作り、送る仕組みが無い | X-1 の縁の送り |
| `RS-36`〜`RS-39` を読むのは掴みだけ | 真。`frame-loop.ts` の 938〜941 行と `notice-values.ts`（生成）だけ | X-5 で引く |
| `S-212` を読むのは掴みだけ | 真。`task-group-grab.ts` の `taskGroupGrabResistedPx` だけ | X-6 で引く |

### 0.2 裁定の鎖（`rulings.md` を「`HF-15`」「並べ替え」「階層」「軸」「掴み代」「`GR-20`」「`HM-3a`」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `PND-400`（2026-08-30、`JDG-2397` に写した） | 上下で位置、左右で階層。どちらか一方のみ。配下は付いて行く | 「どちらか一方のみ」を覆す（`JDG-2390`）。配下は保つ |
| `JDG-30`・`JDG-561`・`JDG-1552` | 兄弟の並べ替えはパネルのドラッグ（`HM-8`）、並びは木の順（`HM-9`）、`order` は 0 から振り直す | 変えない |
| `JDG-306` | ほかの編集グループのタスクグループの中へは動かせない | 変えない（`DFC-730` の実装待ちは残る） |
| `JDG-1617` | 導いたタスクグループを移したときの WBS の親（`HM-12`） | 変えない |
| `JDG-94`・`JDG-109` | 掴み代の印の濃さ（`S-231`） | 変えない |
| `JDG-2390`〜`JDG-2394` | 本件 | 当てる |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-006`（`CH-4` 説明を読まずに操作できるようにする）—— 段を変える左右の動きは画面のどこにも書かれておらず、利用者は 4 回とも縦だけを使った。1 回のドラッグで、見えている落ち先へ置ける。
- `GL-001`（`UC-002` が満たす目標）—— 階層の組み立てが 1 回の手で済む。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.2`（検証できる表現）—— 隙間（行の中点で数える）・段の範囲（下限と上限の式）・親（木を上へたどる）・並び（上の行を含む枝の次）を式で書いた。見本 58 の `landingAt` と同じ式である。
- `R1.3`（同じことを 2 か所で言わない）—— HF-15 の新しい文は仕様だけが持ち、本書に写さない（4 節）。差し込み線と親の枠の太さは `HF-18` の帯と同じ `S-213` を読む（`S-213` の注が「1 つの数」と言う）。
- `R2.7`（マジックナンバー）—— 縁の幅・速さ・写しのずれを `S-597`〜`S-599` にした。速さは描画の回数ではなく毎秒で書いた。
- R4 の状態機械 —— 軸の 2 状態が 1 つ（`carrying`）になる。出来事は運ぶ値を持たない（`axis` が無くなる）。

### ③ 利用者に問わずに決めたこと（覆してよい）

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 段は横の移動を字下げで割って**四捨五入**する（今のコードは切り捨て） | 見本 58 の `Math.round`。線が段の境目の半分で跳ぶので、手の位置と合う | 今の「手より半歩先に動かない」（`task-group-grab.ts` の WHY）とは逆 |
| X-b | 「中へ」の札を描かない。親の枠は畳まれていてもいなくても同じ太さ（`S-213`） | 辞書（`display-words.json`）は「語は利用者が書く。体が作らない」と言う。札の語は利用者が書いていない（見本の語は席が書いた）⇒ 11 節の Q1 | 畳まれた親へ入るときの見分けは、線の字下げと親の枠だけ |
| X-c | 写し（④）を描く。中身は掴み代の印とタスクグループ名だけ（配下の数を添えない） | 見本 58 が写しを描いた。数を添えると語の置き方（`HF-18` の `▾`）を決め直すことになる | — |
| X-d | 親の枠は、見本の 1px ではなく `S-213`（3px） | 新しい数を作らない。`S-213` の注が「パネルに引く 1 本の線」をまとめる | 見本より太い |
| X-e | 送りの速さは縁への近さに比例（`S-597` の内側の端で 0、縁で `S-598`）、縁の外は `S-598` | 見本 58 の `loop` | — |
| X-f | ピン止めでパネルの先頭へ上げた行（`FR-098`）は、隙間の数に入れない | `GR-20` が「上げた位置で掴むと木の順でなく描く順を触る」と言う理由が、落とす側にも当たる | 上げた行の前後へは落とせない |
| X-g | `RS-38`（深さの上限）も引く | `JDG-2393` で掴みからは告げない。ほかの入口（`Agent API` の `CM-73`）の拒みは `HM-3a` と命令の拒みが持ち、`RS-38` を読まない（`frame-loop.ts` だけが読む） | — |
| X-h | `S-215` の地は、掴んでいるタスクグループに加えて描かれている配下にも敷く | 「配下ごと持ち上がる」が読める。見本は配下も薄くした | — |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| 1 回のドラッグで変えられるもの | 位置か段のどちらか（最初の向きで固定） | 位置と段の両方 |
| 縦 | 同じ段の置き場所を描く順にたどる | 描かれている行のあいだの隙間を選ぶ |
| 横 | 右 1 歩 ＝ すぐ上の兄弟の末子、左 1 歩 ＝ 親の次の兄弟 | 隙間に置ける段（下の行の段 〜 上の行の段 ＋ 1）から選ぶ |
| 畳まれたタスクグループ | 中へ置けない（上下）、右では中へ消える | 真下の隙間で段 ＋ 1 を選べば末子、畳んだまま |
| 段の上限 | 拒んで告げる（`RS-38`）、拒んだ向きへ 0.4 だけ付いて行く | 線が上限の段で黙って止まる。置ける段が無い隙間では線も書き込みも無い |
| 落ち先の表示 | 掴んだ行の辺の軸の帯（`S-151`／`S-152`）と地 | 差し込み線・親の枠（`S-151`、`S-213`）・地（`S-215`）・写し（`S-599`） |
| 画面の外 | 運べない | 縁で縦に送る（`S-597`・`S-598`）、ホイールでも送れる |
| 書き込み | `CM-73` を 1 回（軸ごと） | `CM-73` を 1 回（元の場所なら書かない） |

---

## 2. 新しい識別子と、引いた識別子

| 何か | 置き場 | 番号 |
|---|---|---|
| 縁からの距離 36px（🔎） | `_source/settings.json` の保存しない区（`S-215` の次） | `S-597` |
| 最も速い速さ 840px/s（🔎） | 同上 | `S-598` |
| 写しのずれ 8px（🔎） | 同上 | `S-599` |
| 状態 `grabPressed`・`carrying`、出来事 `taskGroupGrabTravelPassed` | `_source/state-machines.json` | — |
| 引いた: `RS-36`〜`RS-39`（表 T-233）・`S-212`（表 T-206） | `retired.py` に理由 | — |

---

## 3. ⛔ 消したもの（旧 → 新）

| 旧 | 新 |
|---|---|
| `HF-15`「軸を 1 本に固定すること（MUST）」とその理由・閾値の文 | 「1 回のドラッグで、位置と段の両方を決めること（MUST）」「向きで軸を分けてはならない（MUST NOT）」と `S-208` で運び始める文 |
| `HF-15`「上下は位置を変え、段を変えてはならない（MUST NOT）」「その段に置ける場所を描く順にたどる」「末子の次は次の群の長子」 | 縦で隙間を選ぶ文 |
| `HF-15`「折りたたまれた群の中の場所を選んではならない（MUST NOT）」 | 畳まれた真下の隙間で段 ＋ 1 を選べる文（`JDG-2391`） |
| `HF-15`「左右は段を変える」「右 1 歩・左 1 歩」「上に兄弟が無いと右へ動かせない」「左へ出たとき後ろの兄弟は元の親に残す」「上限を超える右移動を受け付けない」 | 横で段を選ぶ文・範囲の文・親と並びの文 |
| `HF-15`「握っているあいだ追従させる。刻みは `S-37`。刻みを別に持たない（MUST NOT）」 | ④ 写しを付いて行かせる文。段の刻みは横で段を選ぶ文が `S-37` を名指す |
| `HF-15`「動かせないときは、動かさずに理由を告げる（MUST）（表 T-233）」 | 端の段で黙って止める文（`JDG-2393`） |
| `HF-15`「いまどちらの軸が生きているかを描く（MUST）」と帯の色 `S-151`／`S-152`、`HF-18` と同じ帯の文、「描かないと壊れた操作子と見分けがつかない」 | ①〜④ の落ち先の表示 |
| `HF-15`「拒まれた向きへの追従は途中で止める（MUST）」（`S-212`）と「拒んだうえに付いて行かせてはならない（MUST NOT）」 | なし |
| `UC-002` 2a「`GRS` は移動を受け付けず、深さの上限に達したことを通知する。」 | 掴んで運ぶときは選ばせない（黙って止まる）。ほかの入口は受け付けず通知する |
| 表 T-233 の `RS-36`〜`RS-39` と辞書の 4 つの語 | なし |
| 表 T-206 の `S-212` | なし |
| `S-208` の名「掴んだタスクグループの軸が決まる距離」と注の「最初に動いた向きで軸が決まり、離すまで変わらない」 | 「運び始める距離」「超える前に離せば選ぶだけ」 |
| `S-213` の名「タスクグループの辺に引く帯の太さ（`HF-15` と `HF-18`）」と注の「`HF-15` の軸の帯」 | 「パネルに引く帯と線の太さ（`HF-18` の帯と、`HF-15` の差し込み線と親の枠）」 |
| 状態 `axisUndecided`・`changingPosition`・`changingDepth`、見張り `isPositionAxis`、出来事 `taskGroupGrabAxisSettled` と運ぶ値 `axis` | `grabPressed`・`carrying`、`taskGroupGrabTravelPassed`（運ぶ値なし） |
| 表 T-075 の `UF-97`「落ち先を並びか深さの書き込みに変える」 | 「落ち先（隙間と段）を親と並びの書き込み（`CM-73`）に変える」 |

`HF-15` の掴み代の印の文（`S-231`・`S-151`・ポインタの形・常に描く・`⋮⋮`・操作子が覆わない・幅の詰め方）は 1 文字も変えていない。

---

## 4. 書き直した所（当てた。新しい文の正は仕様である —— 本書に写さない）

| X | 場所 | 中身 |
|---|---|---|
| X-1 | `01-04-requirements.md` の 表 T-051 `HF-15` | 3 節の旧 → 新。新しい文は `HF-15` を読め |
| X-2 | 同 `UC-002` の 2a | 3 節 |
| X-3 | 同 表 T-015a の `HM-3a` | 末尾に「掴んで運ぶときは上限を超える段を選ばせず告げない —— 本行の通知はそれ以外の入口に当たる」 |
| X-4 | `05-07-design.md` 表 T-075 の `UF-97` | 3 節 |
| X-5 | `_source/notice-reasons.json`・`_source/display-words.json` | `RS-36`〜`RS-39` を引いた |
| X-6 | `_source/settings.json` | `S-208`・`S-213` の名と注、`S-212` を引き、`S-597`〜`S-599` を足した |
| X-7 | `_source/state-machines.json` | 出来事と `taskGroupGrabStateMachine`（3 状態） |
| X-8 | `tools/generate_entity_types.py` | `NOT_STORED_TASK_GROUP_GRAB_SIZES` を `S-208`・`S-597`・`S-598` に、`NOT_STORED_TASK_GROUP_GRAB_COPY_SIZES`（`S-599`、`dom-screen-surface.ts`）を足した |
| X-9 | `.claude/skills/spec-graph-check/retired.py` | `RS-36`〜`RS-39`・`S-212` |

### 4.1 生成物（`npm run gen` で書き直された）

`_assets/tbl-notice-reasons.md`・`tbl-settings.md`・`tbl-state-machines.md`・`tbl-row-id-prefixes.md`、`src` の生成区画（`gesture-values.ts`・`notice-values.ts` の型と遷移、`input-command-translator.ts` と `dom-screen-surface.ts` の定数、`display-words.json` の写し）、`docs/development-records/test-inventory.md`。⇒ 手書きのコードが古い名（`axisUndecided`・`'S-212'`・`RS-36` など）を読むので、`tsc` は赤い（7 節）。

---

## 5. 継ぎ目（コード）と試験

### 5.1 実装の体が当てるところ（名は両方の体の指示書に同じ綴りで書く）

| 継ぎ目 | 置き場 | 当てること |
|---|---|---|
| `taskGroupGrabLandingAt(context, heldGroupId, at, press)` → `TaskGroupGrabLanding \| null` | `src/adapter/input-command-translator/task-group-grab.ts`（`UF-97`、`pure`） | `HF-15` の隙間・段の範囲・親・並び・描かれていない行・畳まれた真下を計算する。`TaskGroupGrabLanding` は `{ parentId: string \| null, order: number, depth: number, gapY: number, lineIndentPx: number }`。置ける段が無ければ `null` |
| `commandFromRowGrab` | 同 | 運ばずに離した（`S-208` 以内）→ 今の `chooseTaskGroup`。運んで離した → 落ち先が元と同じか `null` なら書かない、違えば `moveTaskGroup` を 1 つ |
| `taskGroupGrabFollow` | 同 | `followTaskGroupGrab` の `axis`・`atDepth`・`resistedPx` を、落ち先（`TaskGroupGrabLanding`）に替える |
| `taskGroupGrabScrollSpeedAt(pointerY, panelTop, panelBottom)` → px/s（上へ負） | 同 | `S-597`・`S-598`（X-e） |
| 消すもの | 同・`input-command-translator.ts` | `TaskGroupGrabAxis`・`taskGroupGrabAxisAt`・`taskGroupGrabResistedPx`・`taskGroupGrabLandingOf`（歩み）・`taskGroupGrabPlacesInDrawingOrder`・`NOT_STORED_TASK_GROUP_GRAB_SIZES['S-212']` の読み |
| 出来事 `taskGroupGrabTravelPassed` | `src/framework/single-html-shell/frame-loop.ts`（今 3773 行で `taskGroupGrabAxisSettled` を送る所） | 運ぶ値なしで送る。`RS-36`〜`RS-39` の表（938〜941 行）を消す |
| 縁の送り・ホイール | `frame-loop.ts` | 状態が `carrying` のあいだ、フレームごとに速さ × 経った秒だけ縦に送り、送ったら落ち先を選び直す。ホイール（`MK-1`）は掴んでいるあいだも効かせ、送ったあと選び直す |
| 状態の手書きの部分 | `src/use-case/advance-screen-session/gesture-values.ts`（生成区画の外）・`advance-screen-session.ts` 180 行 | `isPositionAxis`・`onTaskGroupGrabAxisSettled` を `grabPressed → carrying` に替える |
| 描く記述 | `src/adapter/screen-renderer/task-group-panel.ts`・`screen-renderer.ts` | `TaskGroupTitle.heldOnAxis` を `isHeld: boolean`（掴んでいる行と描かれている配下）に替え、パネルに落ち先 `dropCue: { lineY, lineIndentPx, parentTaskGroupId: string \| null } \| null` と写し `grabCopy: { x, y, name } \| null` を足す |
| 描く | `src/framework/dom-screen-surface/task-group-panel-drawing.ts`（`UF-105`） | 軸の帯（`taskGroupGrabbedStyle`・`data-held-axis`）を消し、`data-role` が `Task Group Drop Line`・`Task Group Grab Copy` の要素と、親の行の `data-drop-parent="true"` を描く。線と枠は `S-151` と `NOT_STORED_TASK_GROUP_BAND_SIZES['S-213']`、写しは `NOT_STORED_TASK_GROUP_GRAB_COPY_SIZES['S-599']`。⚠️ この定数は今 `dom-screen-surface.ts` の書き出さない `const` である（読む者が居ないと検査 30 が赤い）—— `task-group-panel-drawing.ts` が読むときに、`tools/generate_entity_types.py` の `PUBLISHED_READ_BY_SRC` の `dom-screen-surface.ts` の組へ足して `npm run gen` |

### 5.2 試験の体が仕様だけから書くこと（`HF-15` の文ごと）

1. 隙間: 行の中点で数える。いちばん上の上・いちばん下の下。掴んだ行と配下は数えない。
2. 段の範囲: 下限 ＝ 下の行の段（無ければ 1）、上限 ＝ 上の行の段 ＋ 1（無ければ 1）、配下込みで `FR-004`。範囲の外では端で止まり、通知を出さない（`NT-1` が出ないこと）。
3. 置ける段が無い隙間: 線を描かない、離しても `CM-73` を書かない。
4. 親と並び: 段 d の親は上の行から上へたどる。上の行が親なら長子。
5. 畳まれた真下: 段 ＋ 1 で末子、`treeState` は畳んだまま。
6. 隠した行（`HR-6`）のあいだ: 上の行の直後。
7. 配下ごと動く。複数を選んでいても掴んだ 1 つだけ。
8. 元の場所: 書かない（取り消しの段が増えない）。違えば `CM-73` が 1 つ、取り消し 1 手で戻る。`Esc` で何も書かない。
9. `S-208` 以内で離す: 選ぶだけ。
10. 落ち先の表示: 差し込み線（`data-role="Task Group Drop Line"`）、親の枠（`data-drop-parent`、最上段なら無し）、地、写し（`data-role="Task Group Grab Copy"`、ポインタから `S-599`）。
11. 縁の送り: `S-597` の内側の端で 0、縁と外で `S-598`、比例。ホイールでも送れ、落ち先が付いて来る。
12. 状態機械: `notGrabbed → grabPressed → carrying → notGrabbed`、`pressInterrupted` で戻る。

書き直しか削除の対象（今の試験）: `tests/unit/t-051-hf-15-grabbing-a-task-group.test.ts`（軸の試験）・`tests/contract/state-machine-gesture.contract.test.ts`（`isPositionAxis`・`taskGroupGrabAxisSettled`）・`tests/contract/t-233-reason-words-tell-the-row.contract.test.ts`（`RS-36`〜`RS-39`）・`tests/unit/uf-72-screen-part.test.ts`（`heldOnAxis`）・`tests/unit/t-051-hf-14-the-depth-cap-refuses-a-task-group.test.ts`・`tests/use-case/uc-002-build-task-groups-as-a-hierarchy.test.ts`（2a）。掴みを使う e2e: `tests/system/fr-019-hm-9-the-task-group-tree-decides-what-is-below.test.ts`・`tests/system/nfr-004-file-scheme-sweep.sws.test.ts`。

---

## 6. グラフ（`impact.py HF-15`、`545dc42a`）

`HF-15` を指すのは要求 3（`FR-085`・`FR-004`・`FR-016`）、参照 24 箇所。文を変えたのは `HF-15`・`UC-002`・`HM-3a`・`UF-97` と原稿の 4 本だけ。`HR-8`「足したあと動かす（`HF-15`）」・`HF-1`・`HF-4`・`HF-14`（掴み代を空ける）・`GR-20`（掴み代の置き場、ピン止めは掴めない）・`CM-73` は読みが変わらないので触れていない。

---

## 7. 数

- 要求 ±0、表 ±0、表の行 −2（表 T-206 ＋3 −1、表 T-233 −4）、`（MUST）` ＋6、`（MUST NOT）` −3（`HF-15` は 26 → 32 と 11 → 8）。
- `tsc --noEmit`（`545dc42a` ＋ 本書の仕様の段）: 赤 15 —— `frame-loop.ts` 7・`gesture-values.ts` 6（生成区画の外の手書き）・`advance-screen-session.ts` 1・`task-group-grab.ts` 1。どれも引いた名（`axisUndecided`・`changingDepth`・`taskGroupGrabAxisSettled`・`'S-212'`・`RS-36`〜`RS-39`）を読む所である。実装の体が 0 にする。

---

## 8. 波

1. 仕様の段（本書と同じコミット。済み）。
2. 実装の体: 5.1。⭐ 着地のとき `docs/development-records/perf-pending.md` に 220 を足す —— 掴んでいるあいだ、ポインタが動くたびと送りのフレームごとに落ち先を計算する（行の数に比例。`Map` を先に作る —— 規則 04）。
3. 試験の体: 5.2（仕様だけを読む）。
4. 調整役が実物の手順（13 節）を利用者の確かめの一覧へ。

---

## 9. 仕様の外で直すもの

- 見本 58 の README の「どの部分が仕様のどの行か」—— 当てたあとの行に合わせるのは本書の外（見本は案のまま）。
- `DFC-688`（軸が決まらない疑い）—— 実装が着地したら取下げ（軸が無い）。
- `tools/probe/` などで `taskGroupGrabAxisSettled` を送る道具があれば、実装の体が直す。

---

## 10. ⛔ この変更でやらないこと

- キーボードやコマンドで位置と段を変える入口（`JDG-2394` ④）。
- 親だけを動かして子を残す操作（`JDG-2394` ⑤）。
- 複数のタスクグループをまとめて動かすこと（`JDG-2394` ③）。
- ピン止めした行を掴めるようにすること（`GR-20` のまま）。
- 編集グループの拒み（`DFC-730`）、導いたタスクグループの WBS の親（`DFC-1011`）。

---

## 11. 利用者に問うこと（推奨で仮置き —— 利用者は眠っている。`JDG-1696` の扱い）

### Q1 —— 畳まれたタスクグループの中へ入れるとき、親の枠に「中へ」の札を添えますか？

- 場面: 「最も浅い段を 1 階層展開する」のあと、「予備」を畳まれた「設計」の真下へ運び、右へ引く。いま（本書）は「設計」に枠が付き、線が「設計」の字下げの内側に引かれるだけ。見本 58 は札「中へ」／「into」を添えていた。
- 択: A 添えない（本書の仮置き —— 語は辞書に利用者が書くもので、体が作れない）／ B 添える（語を利用者が決める。ja「中へ」、en「into」でよいか）。
- 推奨: A。枠と線の字下げで「中へ入る」が読め、離すと「設計」の数が 1 増える。札の語を足すなら、利用者が語を書いて辞書の行（表 T-109 か `HF-15` の語の区）を足す。

### Q2 —— 親の枠の太さ（見本は 1px、本書は 3px の `S-213`）でよいですか？

- 択: A `S-213`（3px、本書の仮置き —— 新しい数を作らない）／ B 1px の行を新しく足す。
- 推奨: A。

---

## 12. 台帳

| 行 | 状態 |
|---|---|
| `DFC-2900` | `実装待ち` —— 仕様は本書で当てた。コードと試験は 8 節の波 2・3 |
| `JDG-2390`〜`JDG-2394` | 適用済（仕様）—— 着地先の行 |
| `DFC-688` | 実装が着地したら取下げ |

---

## 13. 利用者の実物の手順（調整役が確かめの一覧へ）

1. 98 個の文書を開き、「すべて折りたたむ」→「最も浅い段を 1 階層展開する」。
2. 最上段の 1 つを掴み、別の最上段の真下へ運んで右へ引く —— 線が字下げされ、親に枠が付く。離すと親の数が 1 増え、親は畳んだまま。
3. 「すべて展開する」のあと、いちばん下のタスクグループを掴んでパネルの上の縁まで運ぶ —— 縦に送られる。押したままホイールでも送れる。
4. 2 段目のタスクグループを、いちばん上のタスクグループの上へ運んで左へ引く —— 1 回で最上段の先頭になる。
5. 4 段の深さを持つタスクグループを深い所へ運んで右へ引く —— 線が上限で黙って止まる。
6. 元に戻す（`Ctrl+Z`）で 1 手ずつ戻る。掴んだまま `Esc` で何も変わらない。
