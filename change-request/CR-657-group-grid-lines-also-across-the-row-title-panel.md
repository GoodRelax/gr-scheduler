# CR-657 —— グループ罫線を行見出しパネルにも引く

> 起草の状態: 当てた（2026-10-04、調整役の統合点 `1a925ae8` から早送りした作業木）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-657`、裁定の帯 `JDG-1360`〜`JDG-1364` は調整役から受けた（13 節で、木のどこにも `CR-657` と `JDG-1360`〜`JDG-1364` が無いことを測った）。裁定の行は足さない —— 決めたことは `JDG-1097` と調整役の決定（0.1 節）で尽きる。台帳の行は既にある `DFC-1680` だけを使い、新しい `DFC` は取らない。仕様の新しい識別子は取らない（2 節）。
> 閉じるもの: 台帳 `DFC-1680`（グループ罫線を表示しても、行見出しパネルには線が入らず、行の区切りが分かりにくい）。
> 覆すもの: 無い。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定と調整役の決定（全文は `docs/development-records/rulings.md` の該当行）

| 出どころ | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1097`（2026-10-01） | 「追加で相談。  横罫線を表示した時、タスクグループタイトル部に線が入っておらず、区切りが分かりにくい。タスクグループの部分まで線を延ばせ。 ただし、投入のタイミングは無理ないところでやれ。」 | 「横罫線」はグループ罫線（`U-18`、切り替えは `S-68`）。行見出しパネル（`U-22`）の行の境にも同じ線を引く（E-01） |
| 利用者（2026-10-04、調整役が受けた） | 「タスクグループパネルに横の罫線が表示されない。 これも最近指摘したが直ってないぞ？」 | 投入の時期が来た（`JDG-1097` の「無理ないところで」を調整役が今と決めた） |
| 調整役の決定（2026-10-04、本書の依頼） | ① `S-68` が真のあいだ、同じ線（太さ・色・縦の位置が同じ）を行見出しパネルの各 `TaskGroup` の境に引き、区切りを左端から右端まで続ける。`EP-9` の「`Group Grid Lines` と同じ線」の先例に倣う。② 書き出し（`EP-3` / `EP-5`）も同じに引く —— 書き出しは画面に従う。③ 留めた行の帯の境も、日程の側と同じ規則に従う | ① E-01。② E-03 —— `FR-080` の STATEMENT（表示の切り替えの結果を書き出しでも同じにする）と 表 T-041 の `WY-3` が既に画面と書き出しの一致を定めているので、それを指す。③ E-02 —— 日程の側は留めた行も含めて行ごとに下の境へ線を引く（`src/adapter/svg-renderer/schedule-grid.ts` の `gridParts`）。行見出しパネルも同じ行の境から引くので、帯の境は留めた最後の行の下の線になる |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **1 行 ＝ 1 対象の読みやすさ**（`FR-042` の RATIONALE「境界が見えないとどこまでが 1 行か読めない」）。日程の側には境の線があるのに、題の列（行見出しパネル）で線が途切れるので、どの題がどの帯の行かを境で読み取れない。線を左端まで続ければ、題と帯が 1 本の区切りの中に収まる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.4`（境界）** —— 行見出しパネルの行の境に引く線が仕様のどこにも無かった（`DFC-1680`）。⇒ `FR-042` の RATIONALE、境界にグループ罫線を描く MUST の隣に置く。① 留めた行の帯の境: 日程の側と同じ行の境から読むので、帯の境にも線が入る（E-02）。② 行の一部だけが見えている行（帯の下へ半分潜った行、`Row Area` の下端で切れた行）: 日程の側は見えている部分の下端に引く。行見出しパネルの行の箱も同じ切り方（`src/framework/single-html-shell/frame-loop.ts` の `drawnRowBoxesOf`）なので、同じ位置になる。③ 行見出しパネルで行を掴んで動かしているあいだ（`HF-15`）: 線は掴んだ行の置かれた位置（`rowBoxes`）から引き、掴んだ行の絵とともには動かさない —— 日程の側の線も、離すまで動かない。④ `S-68` が偽: どちらの側にも引かない。
- **`R1.3`（同じことを 2 か所で言わない）** —— 線を引く規則は `FR-042` に 1 度だけ置き、`FR-098`（留めた行）と 表 T-076 の `EP-3`（書き出し）はそこを指す。太さは `EP-9` が言う 1 か所（`GROUP_GRID_LINE_WIDTH_PX`）、色は 表 T-236 の `S-165`（行の帯の縁の色）の 1 行から両側が読む（5 節）。
- **数の主張（`S-68` の注「本数は行数ぶんで軽い」）** —— 線は見えている行ごとに日程の側と行見出しパネルの 2 本になる。注の「行数ぶん」は偽になるので「行数の 2 倍」へ直す（S-01）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 規則は `FR-042` の RATIONALE、既にある「境界にはグループ罫線を描くこと（MUST）」の直後に置く。`FR-085`（行見出しパネルの要求）には置かない | 境界に線を引く MUST が `FR-042` に在る。行見出しパネルへ延ばすのは同じ MUST の及ぶ範囲を広げることで、別の要求に置くと 1 つの決まりが 2 か所に割れる | 無い |
| 決定 2 | `IC-43` の説明・`K-83` の意味・`U-18` の名・`EP-5`・`ZO-7`・`OD-4` は変えない | `IC-43` は「グループ罫線を表示する・非表示にする」と言い、`FR-042` を指す —— 線がどこまで延びるかは `FR-042` が持つ。`K-83` の「`TaskGroup` 境界の横線」は真のまま。`EP-5` は `U-18` を `Row Area` の中身に数えるが、そこだけに在るとは言わない。`ZO-7` と `OD-4` は日程の図の重ね順で、行見出しパネルは 表 T-020 の外 | 無い |
| 決定 3 | 行見出しパネルの中では、線を行の地の上に描き、ポインタを合わせた行（`HF-19` の操作子が出る行）は線の上に描く | 行の地（`PAINT.panel`）は不透明なので、線を地の後ろに置くと見えない。操作子の格子が下の行へ垂れたとき（`HF-19`）、線が操作子を横切ると押す相手が読みにくい | ポインタを合わせた行の上下の線は、その行の地に半分（太さの半分）隠れる。仕様の字ではない —— 描き手の並べ方（9 節） |
| 決定 4 | 新しい表の行・設定値・確定名を作らない | `EP-9` と `FR-098` の「新しい確定名も新しい設定値のキーも作らない」と同じ読み | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 行見出しパネルにも同じ線を引く | `docs/spec/01-04-requirements.md` の `FR-042` の RATIONALE | E-01 |
| 留めた行の帯の境 | 同 `FR-098` の「帯とスクロールする残りの境目を …」の段 | E-02 |
| 書き出し | 同 `FR-080` の 表 T-076 の `EP-3` | E-03 |
| 表示の切り替えの注 | `docs/spec/_source/settings.json` の `S-68` の注（生成物 `_assets/tbl-settings.md` の 表 T-202） | S-01 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行 | E-04 |

**数**: 表の行 ±0。要求の増減 0。図 0。設定値 ±0。辞書 ±0。

---

## 2. 新しい識別子

取らない。表・行・接頭辞・設定値・要求・入口・保留の行のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消す文 | 代わり |
|---|---|---|
| `S-68` の注 | 「本数は行数ぶんで軽い」 | 「日程の側と行見出しパネルの両方に引き、本数は行数の 2 倍で軽い」 |

⭐ 消さないもの: `FR-042` の RATIONALE の境界の MUST、`FR-098` の「新しい確定名も新しい設定値のキーも作らない」、`EP-9` の全文、`IC-43`・`K-83`・`U-18`・`EP-5`・`ZO-7`・`OD-4`（決定 2）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧が 1 回だけ現れることを数えること。改行は各ファイルの多数派。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-042` の RATIONALE の 1 行目「**RATIONALE**: **`TaskGroup` の境界にはグループ罫線を描くこと（MUST）** —— 1 行 ＝ 1 対象がマルチバーの中核なので、境界が見えないとどこまでが 1 行か読めない。」の行末に改行の 2 空白を足し、その後に次の 3 行を足す:

```text
⭐ **境界の線は、日程の側（`Row Area`、`U-50`）だけでなく、行見出しパネル（`U-22`）の行の境にも引くこと（MUST）** —— 引くのは `Group Grid Lines`（`U-18`）と同じ線であり、同じ線とは太さ・色・縦の位置が同じであるということである（`FR-080` の 表 T-076 の `EP-9` と同じ読み）。  
線は行見出しパネルの左端から右端まで引き、日程の側の線と切れ目なく続けること（MUST） —— 題の列で線が途切れると、どの題がどの帯の行かを境で読めない。  
⛔ **新しい確定名も新しい設定値のキーも作らない** —— 両側に引くかどうかは 表 T-202 の `S-68` 1 つが決める。
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`FR-098`。「帯とスクロールする残りの境目を、`Group Grid Lines`（`U-18`）で示すこと（MUST） —— 示さないと、留めた行がどこまでかを読めない。  」の後に 1 行足す: 「⭐ 行見出しの側の境目も同じ線で示す —— 行見出しパネルにも線を引く規則は `FR-042` が持つ。  」

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
表 T-076 の `EP-3` の理由と扱いの欄。旧「設けると名前の打ち切りの位置が画面と食い違う（`FR-085`） |」 新「設けると名前の打ち切りの位置が画面と食い違う（`FR-085`）。<br>⭐ 行の境のグループ罫線（`U-18`）も画面のとおり描く —— 行見出しパネルにも引く規則は `FR-042` が持ち、書き出しを画面と同じにするのは `FR-080` の STATEMENT（表示の切り替えの結果を書き出しでも同じにする）と 表 T-041 の `WY-3` である |」

<!-- EDIT id=S-01 file=docs/spec/_source/settings.json -->
`S-68` の `note.ja`。旧「グループ罫線。本数は行数ぶんで軽い。描く規則と理由は `FR-042`」 新「グループ罫線。日程の側と行見出しパネルの両方に引き、本数は行数の 2 倍で軽い。描く規則と理由は `FR-042`」

<!-- EDIT id=E-04 file=docs/development-records/changelog.md -->
変更履歴の表の終わりに次の版の 1 行を足す（版はコミットの直前に木の最大を測って決める —— 02 の 2.5 節）。

### 4.1 生成物

- `npm run gen` が `docs/spec/_assets/tbl-settings.md` を刷る。手で直さない。
- `tools/generate_entity_types.py` の `SCREEN_COLOURS` に `S-165` を足し、`npm run gen` が `src/framework/dom-screen-surface/dom-screen-surface.ts` の生成の段を刷る（行見出しパネルは DOM で描くので、線の色を画面の側の色の表から読む —— 5 節）。

---

## 5. 継ぎ目

```
SEAM (CR-657)
- Width: GROUP_GRID_LINE_WIDTH_PX (svg-renderer.ts, already published as PI-19 for EP-9).
  The Row Title Panel reads the same constant; no second number.
- Colour: row S-165 of table T-236 (the value has one source, settings.json, generated into
  both colour tables). Each side names the row the way EP-9's divider already names S-149
  on both sides (dom-screen-surface.ts PAINT_ROW, image-exporter.ts dividerLinesSvg) --
  no new published member, so table T-064 does not change.
- screen-renderer.ts RowTitlePanel: optional groupGridLines?: readonly ScreenRect[] -- one
  rect per described row, at the row's bottom edge, the panel's full width, centred on the
  edge like the schedule side's stroke. Empty when S-68 is false.
- row-title-panel.ts rowTitlePanelFromSchedule: builds groupGridLines from the PLACED boxes
  (readings.rowBoxes, pinned rows included), never from a held row's moved box. The boxes
  are cut exactly as schedule-grid.ts gridParts cuts a row (frame-loop.ts drawnRowBoxesOf),
  so both sides put the line at the same y.
- row-title-panel-drawing.ts fillRowTitleTree: appends one div per rect after the rows
  (STYLE.groupGridLine: PAINT.groupGridLine, pointer-events none). A hovered row
  (z-index 1) stays above them (decision 3).
- dom-screen-surface.ts PAINT_ROW: groupGridLine = 'S-165'; SCREEN_COLOURS gains S-165
  through tools/generate_entity_types.py.
- image-exporter.ts exportSvg: groupGridLinesSvg draws the same rects in colourOf('S-165')
  after the row titles, before the dividers (EP-3).
- schedule-grid.ts: unchanged.
```

---

## 6. グラフ（`1a925ae8`）

- `impact.py FR-042`: 要求 7 件 / 参照 23 か所 —— どれも行の色・最小の高さ・帯を指す。本書が足すのは RATIONALE の 3 行で、指す側の読みは変わらない。
- `impact.py S-68`: `FR-089`（「表示の切り替えも別に持つ（`S-67` と `S-68`）」—— 真のまま）、`tbl-glossary.md` の `IC-43`（決定 2）。
- `impact.py IC-43`: 指している箇所 0。
- `impact.py U-18`: `FR-054` の `OD-4`（重ね順 —— 日程の図の中、真のまま）、`FR-098`（E-02）、`FR-080` の `EP-5` ・ `EP-9`（真のまま）、`tbl-published-entries.md` の `PI-19`（`colourOf` を `ImageExporter` が問える —— 本書もそれを使う）。
- `impact.py EP-3`: `FR-085`（書き出し専用の幅を設けない —— 真のまま）、`FR-080`。
- `impact.py EP-9`: `PI-19` だけ。
- 届いた行で `rulings.md` を引いた: `JDG-1097`（本書が着地させる）。食い違う裁定は無い。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables / figures / uids / rows | 差 0 | 升の中身だけ |
| 「`Group Grid Lines`（`U-18`）と同じ線」の出現（`docs/spec/01-04-requirements.md`） | 1 → 2 | `EP-9` の 1 つに、E-01 の「`Group Grid Lines`（`U-18`）と同じ線であり」が足される |
| `SCREEN_COLOURS` の行 | 16 → 17 | `S-165` |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec/01-04-requirements.md` ・ `_source/settings.json` ・ 生成物 | E-01 〜 E-03、S-01、`npm run gen` | 本書の体 |
| 2 | `src/adapter/screen-renderer/screen-renderer.ts` ・ `row-title-panel.ts` ・ `src/adapter/image-exporter/image-exporter.ts` ・ `src/framework/dom-screen-surface/dom-screen-surface.ts` ・ `row-title-panel-drawing.ts` ・ `tools/generate_entity_types.py` | 5 節の継ぎ目 | 本書の体 |
| 3 | `tests/` | 9 節 | 新しい試験は仕様だけを読む別の体 |

- ⭐ **毎フレームの経路: はい。** 行見出しパネルの記述（`rowTitlePanelFromSchedule`）と DOM の描き直し（`fillRowTitleTree`）は毎フレーム走る。見えている行ごとに矩形 1 つと `div` 1 つが増える（行数ぶん）。`perf-pending.md` に行を足す。

---

## 9. 仕様の外で直すもの

- コード: 8 節の波 2。決定 3 の並べ方（線は行の後ろに足し、ポインタを合わせた行は `z-index` で線の上）は `row-title-panel-drawing.ts` の注に書く。
- 新しい試験（仕様だけを読む体）: `tests/unit/cr-657-*.test.ts` —— E-01（行見出しパネルの各行の境に、日程の側と同じ太さ・色・縦の位置の線が、パネルの幅いっぱいに在る。`S-68` が偽なら無い）、E-02（留めた最後の行の下にも在る）、E-03（書き出しの SVG にも在る）。
- 動く試験: 行見出しパネルの記述を組む既存の試験は `groupGridLines` を持たない字面を使う（欄は省けるので変わらない）。
- 台帳: `defects.md` の `DFC-1680`（`仕様待ち` → `実測待ち`）、`rulings.md` の `JDG-1097`（適用済）、`perf-pending.md` の 1 行。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 日程の側の線（`schedule-grid.ts` の `gridParts`）は変えない。
- 表 T-064 の公開の入口は足さない（5 節）。
- `EP-9` の境界の線の色: 書き出しは `S-149`（`image-exporter.ts` の `dividerLinesSvg`）、画面は `PAINT.rule`（`S-149`）で引いている。`EP-9` は「`Group Grid Lines` と同じ線」と言い、日程の側のグループ罫線の色は `S-165` である。本書の前からの食い違いの疑いなので、本書は直さず調整役へ渡す（報告の 1 行）。
- 日付罫線（`U-17`、`S-67`）は行見出しパネルへ延ばさない —— 縦の線で、行見出しパネルには日付が無い。

---

## 11. 利用者に問うこと

無い。`JDG-1097` と調整役の決定で決まっている。出荷ビルドでの手の確かめは調整役へ手順を渡す（`JDG-1340`）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1097` | 本書の裁定 | 状態を「適用済」にし、着地先に `FR-042` を書く |
| `DFC-1680` | 本書が閉じる | `仕様待ち` → `実測待ち`（自動試験は緑。出荷ビルドで利用者が見るのはまだ） |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 1a925ae8

# the numbers are unused
ls change-request | grep -c CR-657
git grep -l "CR-657"
git grep -l "JDG-136[0-4]\b"

# each old text of section 4 appears exactly once before editing
#   (the edit script asserts count == 1 for every edit, then writes)

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-042 S-68 IC-43 U-18 EP-3 EP-9 FR-098

# the two sides cut a row the same way
grep -n "const top = Math.max(row.y" src/adapter/svg-renderer/schedule-grid.ts src/framework/single-html-shell/frame-loop.ts
```
