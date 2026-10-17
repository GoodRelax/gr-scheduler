# CR-789 —— 運んでいるタスクグループの写しと差し込み線は最前面でちらつかず、落ち先は丸の付いた線 O---- だけで示す

> 状態: ⭐ **当てた** —— 2026-10-17、束 A の席（`6989ddaa` の上）が仕様・コードを当てた（変更履歴 4.99）。仕様だけを読む別の体が試験を書いた（`tests/contract/cr-789-*`）。
> 当てる裁定: `JDG-2460`（`DFC-2960`）・`JDG-2461`・`JDG-2462`（`DFC-2961`）・`JDG-2560`（運ぶあいだ操作子を出さない）・`JDG-2561`（丸は外径 12px・輪 3px）。
> 覆すもの: 親の枠（`JDG-2390`・`JDG-2391`・`JDG-2398`・`JDG-2411` の枠の部分 —— 2026-10-17 に `JDG-2462` が覆し、状態は既に 覆された（一部））。
> 新しい ID: 表 T-206 の `S-620`。引いた ID: 無し。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 ちらつきの原因 —— 測った（`DFC-2960`）

測り方: `6989ddaa` の出荷ビルド（`dist/index.html`）を Playwright（Chromium、1600 × 900、起動の見本）で開き、いちばん上のタスクグループの掴み代を押して、2px ずつ 60 回下へ動かした。描画ごと（`requestAnimationFrame`）に、ポインタの下の行の `:hover`・その計算された `z-index`・操作子 `IC-82` の `visibility`・写しの上の点（ポインタ ＋ 12px）で最前面にある要素を読んだ。写しは `pointer-events:none` なので、読む一瞬だけ当たりを持たせた。パネルの木の子の差し替えは `MutationObserver` で数えた。探りは `scratch/dfc-2960/probe.mjs`（追跡しない）。

| 測ったもの | 直す前（`6989ddaa`） | 直した後 |
|---|---|---|
| 60 回の移動で、パネルの行を全部作り直した回数 | 57 | 1（運び始めの 1 回 —— 地 `S-215` を敷く） |
| 写しを描いた描画のうち、写しが行の下に在った回数 | 156 / 206 | 0 / 169 |
| ポインタの下の行が操作子を出していた描画 | 213 / 213 | 9 / 178（`S-208` を超える前の、まだ押しているだけの間） |
| 丸を描いた描画 | 0 | 169 |

原因は 3 つが重なっていた。

| # | 所（file:line は `6989ddaa`） | 入れた変更 | 起きること |
|---|---|---|---|
| C-1 | `src/adapter/screen-renderer/task-group-panel.ts:184` の `grabCuesOf` が写しの位置（ポインタの x, y）を `TaskGroupPanel` に載せ、`src/framework/dom-screen-surface/dom-screen-surface.ts:1186` がパネル全体を 1 つの鍵 `taskGroupPanel` で比べる ⇒ `:1228` の `fillTaskGroupTitleTree` が `task-group-panel-drawing.ts:631` の `replaceChildren` で木を丸ごと作り直す | `9a6432c6`（`CR-772` の実装） | ポインタが動くたびに行の要素が作り替わる。⚠️ 見立て（未測定）: 実物の Chrome では新しい要素の `:hover` が次の当たりの計算まで立たず、操作子と前後の順が点滅する。headless では 213 描画のどれでも `:hover` が立っていたので、この点滅そのものは測れていない |
| C-2 | `dom-screen-surface.ts:626`〜`627` の `> [data-group-id]:hover {z-index:1;}` | `bfc27af9e`（`CR-553`） | ポインタの下の行が z-index 1 を得て、z-index を持たない写し（`task-group-panel-drawing.ts:233` の `grabCopyElement`）と差し込み線の上に来る。写しは `S-599` だけ右下にずれてポインタの下の行に半ば重なるので、行を渡るたびに写しが隠れたり出たりする |
| C-3 | `dom-screen-surface.ts:618`〜`623` の `[data-group-id]:hover` が操作子を見せる | `bfc27af9e`（`CR-553`） | 運んでいるあいだもポインタの下の行が操作子と地を出し、行を渡るたびに点いたり消えたりする ——「操作子付近のちらつき」 |

### 0.2 裁定の鎖（`rulings.md` を「`HF-15`」「`HF-6`」「枠」「差し込み線」「写し」「操作子」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-2390`・`JDG-2391`・`JDG-2398`・`JDG-2411` | 落ち先の親を `S-213` の枠で囲む。畳んだ親へ入れるときも枠 | 枠の部分は `JDG-2462` が覆した（状態は既に 覆された（一部））。線・地・写しは保つ |
| `JDG-394`・`JDG-421`・`JDG-423` | 操作子の群の振る舞い（`HF-6`・`HF-19`） | 運ぶあいだだけ描かない（`JDG-2560`）。ふだんの振る舞いは変えない |
| `JDG-2460`〜`JDG-2462`・`JDG-2560`・`JDG-2561` | 本件 | 当てる |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-008`（見たとおりに応える）と `CH-3`。利用者が「バグのように見える」と言ったちらつき（`JDG-2460`）と、「意味が不明」と言った親の枠（`JDG-2461`）を直す。落ち先の段は丸の位置で読める。

### ② レビュー観点のどの条項を当て、何が出たか

- `docs/development-rules/07-review-standards.md` の **`R2`**（規則の在り処が 1 つ）—— 写しと線を描く所が行を描く所と同じ鍵で動いていた。描く物ごとに鍵を分け（`taskGroupRowsOf` と `taskGroupGrabCuesOf`）、線と写しは前の層 1 つだけが描く。
- **`R2.7`**（マジックナンバー）—— 丸の外径を `S-620` にした。輪の太さは新しい行にせず `S-213` を読む（`S-213` の注が「パネルに引く線の太さは 1 つの数」と言う）。
- **`R1.3`**（同じことを 2 か所で言わない）—— 運ぶあいだ操作子を描かない規則は `HF-15` が持ち、`HF-6` は `HF-15` を指すだけにした。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 線と写しは、木（`Task Group Title Tree`）と同じ `UZ-11` で木の後ろに置いた別の層（`Task Group Grab Cues`）に描く —— 新しい `UZ-` の行は作らない | `UZ-11` が「中の前後は各要求が持つ」と言う。同じ z では後の層が前に描かれる | 写しがプロパティパネルの上に出るのは前と同じ |
| X-b | 運び始めに行を 1 回だけ作り直すのは残す | 掴んだ行と配下に地（`S-215`）を敷くのは行の描きである。ポインタの動きでは作り直さない | — |
| X-c | 運ぶあいだの印として木の `data-task-group-carried` を `"true"` にし、操作子を見せる規則と行を前へ出す規則の両方をその印で止める | `JDG-2560` の「どの行の操作子も出さない」。前へ出す規則は写しを隠すだけになる | — |
| X-d | `TaskGroupDropCue` から `parentTaskGroupId` を除いた | 枠が無くなり、読む所が無い。線の字下げは `lineIndentPx` が既に持つ | `CR-772` の試験 1 件の期待を直した |

---

## 1. 範囲 —— 行き先

| # | 直すこと | 仕様の ID | 直す物 |
|---|---|---|---|
| 1 | 線と写しをパネルの行と操作子より前に描き、ポインタが動いただけでは行を描き直さない | 表 T-051 の `HF-15`（③ の後の 2 文） | `task-group-panel-drawing.ts` の `fillTaskGroupGrabCues`・`taskGroupGrabCuesOf`・`taskGroupRowsOf`、`dom-screen-surface.ts` の層 `taskGroupGrabCueLayer` と鍵 `taskGroupGrabCues` |
| 2 | 運ぶあいだ、どの行にも操作子とその地を描かない | `HF-15`・`HF-6` の末尾 | `dom-screen-surface.ts` の `TASK_GROUP_TREE_NOT_CARRIED`（印 `TASK_GROUP_CARRIED_MARK`） |
| 3 | 親の枠をやめ、線の左端に丸（O----）を立てる。線は境目に立ち、畳んだ親の中へは 1 段深い線で示す | `HF-15` の ①・表 T-206 の `S-620`・`S-213` | `task-group-panel-drawing.ts` の `dropRingElement`（`markDropParent` を除いた） |

## 2. 新しい識別子

| ID | 何か |
|---|---|
| `S-620` | 差し込み線の左端の丸の外径（12px 🔎）。生成した定数は `dom-screen-surface.ts` の `NOT_STORED_TASK_GROUP_DROP_RING_SIZES`（`tools/generate_entity_types.py` に組を足した） |

## 3. ⛔ 消したもの（旧 → 新）

| 旧 | 新 |
|---|---|
| `HF-15` の「② 親になるタスクグループを枠で囲む（最上段に置くなら囲まない）。」 | 消した。代わりに「⛔ 落ち先を示すために、タスクグループを枠で囲んではならない（MUST NOT）」 |
| `HF-15` の「線と枠の色は …」 | 「線と丸の色は …」 |
| `HF-15` の ③（地）・④（写し） | ②・③ に繰り上げた（中身は同じ） |
| 表 T-206 の `S-213` の「差し込み線と親の枠」（値と注） | 「差し込み線と丸の輪」 |
| `task-group-panel-drawing.ts` の `markDropParent` と印 `data-drop-parent` | 消した |
| `TaskGroupDropCue.parentTaskGroupId` | 消した |
| `fillTaskGroupTitleTree` が線と写しも描く | 行だけを描く。線と写しは `fillTaskGroupGrabCues` |

## 4. 書き直した所（当てた。新しい文の正は仕様である —— 本書に写さない）

- 表 T-051 の `HF-15`: ① の後に、線は境目に立つ・左端の丸・丸の形（`S-620`・`S-213`・`S-150`）・破線の段でも輪は実線・畳んだ親の中へは 1 段深い線・枠を描かない。③ の後に、線と写しを行と操作子より前に描く・ポインタの動きで行を描き直さない・運ぶあいだ操作子とその地を描かない（ピン止めの `IC-60` の印は残す）。
- 表 T-051 の `HF-6`: 末尾に「運んでいるあいだは描かない。規則と理由は `HF-15`」。
- 表 T-206: `S-620` を足し、`S-213` の語を直した。

## 5. 継ぎ目（コード）と試験

試験は、仕様（`docs/spec`）と本書だけを読む別の体が書く。継ぎ目の名は次のとおり（逐語）。

| 継ぎ目 | 所 | 何を約束するか |
|---|---|---|
| `fillTaskGroupGrabCues(host, layer, tree, panel)` | `src/framework/dom-screen-surface/task-group-panel-drawing.ts` | `layer` の子を、差し込み線（`data-role="Task Group Drop Line"`、その子に丸 `data-drop-ring`）と写し（`data-role="Task Group Grab Copy"`）だけにする。線か写しがあれば `tree` の `data-task-group-carried` を `"true"`、無ければ `"false"` にする |
| `taskGroupGrabCuesOf(panel)` / `taskGroupRowsOf(panel)` | 同上 | 前者は線と写しと線の幅の元（`dropCue`・`grabCopy`・`panelBox`）、後者は線と写しを `null` にしたパネル。画面は前者が変わったときだけ層を、後者が変わったときだけ行を描き直す |
| `fillTaskGroupTitleTree(host, tree, panel, anchors)` | 同上 | 行・罫・目盛の略語を描く。線・写し・枠は描かない |
| `TASK_GROUP_CARRIED_MARK` | `src/framework/dom-screen-surface/dom-screen-surface.ts` | `'data-task-group-carried'`。⚠️ 見せる規則が読み込みのときに読むので、描きの側ではなく画面の側に置く —— 描きの側に置くと、描きのファイルが先に読まれたとき、2 つのファイルの循環の向こうで `undefined` になる（仕様だけを読む試験の体が見つけた） |
| `domScreenSurface(wiring).showScreenView(view)` の層 | `src/framework/dom-screen-surface/dom-screen-surface.ts` | 層 `data-role="Task Group Grab Cues"` は `data-role="Task Group Title Tree"` の後ろの兄弟で、同じ z-index（`UZ-11`）。運ぶあいだ写しの位置だけが変わった `view` では、木の子は差し替わらない |
| 見せる規則（`<style>` の中身） | 同上 | 操作子を見せる規則と `z-index:1` の規則は、どれも `[data-task-group-carried="false"]` の木の下でだけ当たる（否定ではなく値で合わせる —— 運ぶ前の最初の描画で `"false"` が立つ） |
| `NOT_STORED_TASK_GROUP_DROP_RING_SIZES['S-620']` | 同上（生成） | 12 |

直した既存の試験: `tests/contract/cr-772-hf-15-the-drop-is-drawn-while-carrying.contract.test.ts`（親の枠の 3 件を除き、線と写しを層から読む）と `tests/contract/cr-772-clauses.ts`（文の番号と「線と丸の色」）。

## 6. グラフ（`impact.py HF-15 HF-6 S-213 S-620`、`6989ddaa` の上）

`S-620` を指すのは `HF-15`（`FR-004` の表 T-051）だけ。`S-213` は `HF-15`・`HF-18` と表 T-206 の 8 節。`HF-6` は `HF-15`・`HF-19`・`FR-085` から指される —— 本書は `HF-6` のふだんの振る舞いを変えないので、`HF-19` と `FR-085` に及ばない。

## 7. 影響

```
仕様の他の行     HF-6 の末尾 1 文・S-213 の値と注・S-620（新）
生成物           tbl-settings.md・dom-screen-surface.ts の生成ブロック・public-entry-index.md・tbl-row-id-prefixes.md の数
試験             新しい試験は別の体が仕様だけから書く。CR-772 の描きの試験 1 本を直した
毎フレームの仕事 減る —— 運ぶあいだ、行の木の作り直し（行の数に比例）が無くなり、線と写しの 2 要素だけを描き直す。
                 鍵の文字列化は、行の側と線の側の 2 回になる（パネルを 1 回 JSON にしていたのが、写しの無いパネル 1 回と小さな 3 項 1 回）
```

## 8. ⛔ この変更でやらないこと

- 運ぶあいだのポインタの形・地・写しの中身は変えない。
- 深さの上限越えの問い（`QN-16`、`CR-774`）は変えない —— 破線の線にも丸を立てるだけである。

## 9. 台帳

`DFC-2960`・`DFC-2961` を `試験待ち` にした。変更履歴 4.99。

## 10. 利用者の実物の手順（調整役が確かめの一覧へ）

1. 起動の見本を開き、タスクグループパネルのいちばん上のタスクグループの掴み代（`⋮⋮`）を押したまま、ゆっくり下へ運ぶ。⇒ 名前の写しが常に見え、行を渡っても隠れない。どの行にも操作子（[タスクグループを削除]・[配下に追加]・[折りたたむ] など）が出ない。
2. 行の境目で止め、ポインタを左右に動かす。⇒ 線の左端の丸が段の字下げとともに左右へ動く。どのタスクグループにも枠が出ない（ピン止めした行にも）。
3. 畳んだタスクグループの真下の境目で右へ動かす。⇒ その行の下に 1 段深い線と丸が出る。離すと末子になり、畳んだまま。
4. 離すか `Esc` を押したあと、行にポインタを乗せる。⇒ 操作子がふだんどおり出る。
