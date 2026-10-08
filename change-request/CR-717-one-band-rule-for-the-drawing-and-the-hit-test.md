# CR-717 —— 依存線が帯に入るかの判じは 1 つ、描く側と当たり判定が同じ判じを読む

> 起草の状態: 当てた（2026-10-09、作業木 `f4d2a430` の上）。起草・仕様・コード・既存の試験・台帳を同じ作業木で行った。仕様だけを読む試験は別の体が書く（9 節）。
> ID の帯: 番号 `CR-717` と、`DFC-2303`〜`DFC-2305` を調整役から受けた。使ったのは `CR-717` と `DFC-2303`・`DFC-2304`（`DFC-2305` は使わない）。`f4d2a430` の木で `CR-717` を名乗る所は 0 件。`DFC-2303` は `CR-714` の帯の行の 1 件だけ（同書は使わなかったと書く）。表の新しい行・`JDG`・`PND` の新しい行は使わない。
> 当てる台帳の行: `DFC-2161`（`docs/development-records/defects.md`）。利用者の裁定は無い —— 技術の判断である（3 節の X-1〜X-4）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果

| 行の読み | `f4d2a430` で見たもの | 本書での扱い |
|---|---|---|
| 帯の規則を描く側（`isInTheBand`）と当たり判定（`isLineScrolling`）が別々に持つ | 誤り（もう 1 か所）—— `f5cb5b0c` が規則を `schedule-geometry.ts` の `isLinkInBand` に寄せ、両方が閉包 `pinnedBand.holdsLink` で読んでいた | 規則の置き場を 表 T-064 に載せる（E-02）。閉包は消し、名の在る関数を両方が読む |
| 選んだ線と印の線で食い違う | 半分正しい —— 選んだ線（`SL-8`）は省いた形で描かれ、両方とも線自身の省き方で決める（一致）。送った先の印の線（`EL-19`）だけ、描く側は両端が見えている線として決め、当たり判定の `item-hit-area.ts:790-791` は `false` を渡して線自身の省き方で決めていた | 当たり判定が送った先の印の線を受け取り、同じ引数で読む（5 節） |
| 「帯に入るか」は依存線だけの話 | タスクの図形も 2 か所 —— 描く側（`svg-renderer.ts` が行の `isPinned` から集合を作り、`schedule-task-figures.ts` が置き場の行で引く）と、幾何の `pinnedBand.pinnedTaskUids`（当たり判定が読む）。今は同じ答え | 本書では直さない（X-5、`DFC-2304`） |

### 0.2 裁定の鎖（rulings.md を「帯」「ピン止め」「当たり」「送った先」で引いた）

| 裁定・行 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-441` | 両端が見えていない依存線は描かない | 保つ（表 T-303 の `EL-6`） |
| `CR-688` の 10 節・12 節 | `DFC-2161` を 1 か所にするには 表 T-064 に名を足す CR が要る | 本書がそれである |
| `DFC-640`（`arrowHeadOf`・`selectedLinksOf`） | 描く側と当たり判定が読むものを 表 T-064 の `PI-6` に載せて 1 か所から読む | 同じ形で `isLinkInBand` を載せる |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-1` / `GL-008` —— 帯の中で描かれていない所が押しに応えない。描いた絵と押せる所が一致する。

### ② レビュー観点のどの条項を当て、何が出たか

- `R2.21`・`R2.22`（判じは 1 か所、写さずに公開する）—— 依存線の帯の判じを `PI-6` に載せた（E-02）。タスクの図形の判じの写しは `DFC-2304` に残した（X-5）。
- `R1.4`（境界）—— 帯が無いとき（偽）、送った先の印の線（`EL-19`）、範囲選択（印は押下で消えるので、送った先の印の線は無い —— `EL-17`）。
- `R1.3`（同じことを 2 か所で言わない）—— 帯に描くかの文は `FR-098` に在るまま。新しい文は判じの置き場を指すだけで、規則を言い直さない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 案 ①（規則を `ScheduleGeometry` の名の在る関数にし、送った先の印の線かを引数で渡す）を採る | 案 ② は `DependencyGeometry` に帯の値を持たせるが、送った先の印は幾何の入力に無い（見る人の状態）ので、幾何を印の出入りで組み直すことになる | 当たり判定が印の状態を受け取る引数が 1 つ増える |
| X-2 | 閉包 `pinnedBand.holdsLink` を消し、`isLinkInBand` を書き出す | 公開の名は関数として 表 T-064 に載る（検査 26b）。同じ規則への入口を 2 つ置かない | 無い |
| X-3 | 描く形と取る形の違い（送った先の印の線は経路の全体が描かれるのに、当たり判定は省いた短い線で取る）は直さない | 帯の判じとは別の食い違いで、経路の全体の矢じりを幾何に持たせる変更が要る | `DFC-2303` に残した |
| X-4 | 名 `isLinkInBand`・`pinnedBand`・`isLineScrolling` は変えない | 調整役の指示（改名は `CR-708`） | 無い |
| X-5 | タスクの図形の層を幾何の集合で選ぶ直しは外した | 当てると `svg-renderer.ts` のコードが 4 行減り、注釈の密度（検査 55、`floor(666 / 9) = 74` に注釈 74 行で上限ちょうど）が 1 行超えた。注釈を消すか基準を動かすかは本書の持ち場の外 | `DFC-2304` に残した（今は同じ答え） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 帯に入るかの判じは 1 つ | `docs/spec/01-04-requirements.md` の `FR-098` | E-01 |
| 判じの置き場 | `docs/spec/_source/published-entries.json` の 表 T-064 の `PI-6`（`isLinkInBand`） | E-02 |
| 当たり判定が送った先の印の線を受け取る | 同 `PI-7` の `pointerWalkOf`・`PointerWalk` の注 | E-03 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行（4.17） | E-04 |

数: 要求 ±0。表 ±0。表の行 ±0（`PI-6` の項 ＋1）。辞書 ±0。設定値 ±0。図 0。命令 ±0。`01-04-requirements.md` の `（MUST）` の印 ＋1（`FR-098`）。`（MUST NOT）` ±0。

---

## 2. 新しい識別子

関数の名 `isLinkInBand`（`src/` に既に在った名を書き出した）。表の行・設定値・辞書の語は無い。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `ScheduleGeometry` の `pinnedBand.holdsLink`（閉包） | 消す。`isLinkInBand(band, link, isWholeRoute)` を書き出し、`PI-6` に載せる |
| `schedule-task-figures.ts` の `geometry.pinnedBand?.holdsLink(link, ink.isWholeRoute)` | `isLinkInBand(geometry.pinnedBand, link, ink.isWholeRoute)` |
| `item-hit-area.ts` の `isLineScrolling(cut, line)`（中で `holdsLink(line, false)`） | `isLineScrolling(cut, line, isWholeRoute)`。`linesOf` は送った先の印の線なら真を渡す。範囲選択（`marquee.ts`）は偽 |
| `pointerWalkOf(geometry, sizes)` | `pointerWalkOf(geometry, sizes, landed = null)`。`PointerWalk` は `landed` を持つ |
| `frame-loop.ts` の「幾何が変わったら歩きを組み直す」 | 幾何か送った先の印の線が変わったら組み直す |

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-098` の「⭐ 端点の一方だけが見えているときに描く短い線と続きの印（…）は、見えている端の行のために描くものとすること（MUST） —— …残りの領域で切る。」の後に足す:

```text
⭐ 依存線が帯の中に在るかの判じは 1 つとし、描く側と当たり判定（表 T-023d）が同じ判じを読むこと（MUST） —— 判じが 2 つ在ると、帯の中の描かれていない所が押しに応える。
判じの置き場は `05-07-design.md` の 表 T-064 の `PI-6` である。
```

<!-- EDIT id=E-02 file=docs/spec/_source/published-entries.json -->
`PI-6` の `selectedLinksOf` の後に項 `isLinkInBand` を足す。注:

```text
依存線を、ピン止めの帯（`01-04-requirements.md` の `FR-098`）の中に描くかを答える —— 帯に留めた `Task` の集合と、線の省き方（同書の 表 T-303 の `EL-4` ／ `EL-5`）から決める。送った先の印を付けた線（同表の `EL-19`）は、両端が見えている線と同じに決める。
帯が無ければ偽。
⭐ 公開したのは、帯の規則を `src/` の 2 か所に置かないためである（`FR-098`） —— `SvgRenderer` が帯の層へ描く線と、当たり判定が帯で切らない線が同じ 1 つを読む
```

<!-- EDIT id=E-03 file=docs/spec/_source/published-entries.json -->
`PI-7` の `pointerWalkOf` の注の終わりに足す:

```text
送った先の印を付けた線（`01-04-requirements.md` の 表 T-303 の `EL-16`）が在れば、その線の両端の `UID` も受け取る —— 描く側と同じく、帯（`FR-098`）ではその線を両端が見えている線として切る（`EL-19`、`PI-6` の `isLinkInBand`）
```

`PointerWalk` の注の「同じ幾何のあいだは何度でも引ける」を「同じ幾何と同じ送った先の印のあいだは何度でも引ける」にする。

<!-- EDIT id=E-04 file=docs/development-records/changelog.md -->
変更履歴の表の終わりに 4.17 の 1 行を足す（版がぶつかれば調整役が付け直す）。

### 4.1 生成物

`npm run gen` が `docs/spec/_assets/tbl-published-entries.md`（表 T-064）、`docs/development-records/test-inventory.md`、`docs/review/public-entry-index.md` を刷る。手で直さない。

---

## 5. 継ぎ目（コード）

| ファイル | 変えるもの |
|---|---|
| `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts` | `isLinkInBand` を書き出し（帯を受け取り、無ければ偽）、`pinnedBand.holdsLink` を消した |
| `src/adapter/svg-renderer/schedule-task-figures.ts` | 線の層を `isLinkInBand` で選ぶ |
| `src/entity/layout-engine/item-hit-area/item-hit-area.ts` | `isLineScrolling` が `isLinkInBand` を読み、送った先の印の線かを受け取る。`pointerWalkOf` の 3 つ目の引数 |
| `src/entity/layout-engine/item-hit-area/marquee.ts` | 範囲選択は偽を渡す（押下で印が消える —— `EL-17`） |
| `src/framework/single-html-shell/frame-loop.ts` | `landedLinkIn` が印の状態から線を答え、歩きの組み直しの鍵に入れる |

新しい命令・`Agent API` のメンバ・辞書の語は無い。層の向き（entity < use-case < adapter < framework）は変わらない —— `svg-renderer` から `schedule-geometry` への読みは既に在る辺である。

---

## 6. グラフ（`f4d2a430` の上）

- `impact.py FR-098 PI-6 PI-7`: `FR-098` を指すのは要求 14 件・39 か所。どの文も変えない。
- 新しく指す辺: `FR-098` → 表 T-064 ・ `PI-6`、`FR-098` → 表 T-023d。`PI-6` の新しい項 → `FR-098`・表 T-303 の `EL-4`・`EL-5`・`EL-19`。`PI-7` の注 → `EL-16`・`EL-19`・`PI-6`。輪は作らない（`PI-6` から `FR-098` への辺は注の中の指しであり、要求の文は `PI-6` を置き場として指すだけ）。

---

## 7. 試験の測り（既存の試験）

当てた後の `vitest` の全体と `playwright` は報告に書く（調整役の門）。古い振る舞いを主張していた試験は無かった（`holdsLink` を読む試験は 0 件）。

---

## 8. 波

1 つの作業木で、仕様 → 生成 → コード → 試験 → 台帳の順に当てた。描く層の振り分けとポインタの歩きは毎フレームの経路なので、`perf-pending.md` に 1 行足した。

---

## 9. 仕様の外で直すもの

- コード: 5 節。
- 新しい条を逐語で引く試験: `tests/contract/cr-717-one-band-rule-for-the-drawing-and-the-hit-test.test.ts`（検査 39 を上げないため。帯の中の点で、描く側の層と当たり判定の答えが一致すること。直しを外すと 2 件赤）。
- 仕様だけを読む試験（別の体）: `FR-098` の新しい文 —— 先行だけをピン止めした `EL-4` の線と、後続だけをピン止めした `EL-5` の線のそれぞれで、送った先の印の有無の 2 通りに、帯の中で描かれている所だけが応えること。`frame-loop` の歩きが印の出入りで組み直されること（実物の画面で）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 名を変えない —— 改名の `CR-708` が後に持つ。
- 送った先の印の線の取る形（経路の全体と矢じり、続きの印を取らない）は直さない（`DFC-2303`）。
- 基準線の行（`baselineOutlines` の `isPinned`）は幾何の 1 か所で決まっており、触れない。
- タスクの図形の層の写し（`DFC-2304`、X-5）。

---

## 11. 利用者に問うこと

無い（X-1〜X-4 は技術の判断）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `DFC-2161` | 帯の規則が 2 か所 | `仕様待ち` → `実測待ち`（利用者の手順を書いた） |
| `DFC-2303`（新） | 送った先の印の線の、描く形と取る形の違い | `仕様待ち`（`CR` が要るかは調整役が決める） |
| `DFC-2304`（新） | タスクの図形の帯の判じが描く側と当たり判定で別々 | `未検討`（検査 55 の上限が絡む） |

---

## 13. 測り方の再現

```
# the tree: worktree at f4d2a430
git grep -nE "CR-717|DFC-2303" f4d2a430 -- .                   # 1 hit before: the band line of CR-714
git grep -n "holdsLink" f4d2a430 -- src tests                  # 6 lines: the type, the closure and its return, two readers, one comment
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-098 PI-6 PI-7
```
