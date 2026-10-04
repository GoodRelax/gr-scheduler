# CR-673 —— 2026-10-04 の監査の残り（テーマ色の見本もモノクロで灰・窓の字の入口の名・基準線を一時的に上げる許し・中断中の実績の線・線の矢印の矢じりの幅・旧の口・戻り止めの置き場）

> 起草の状態: 当てた（2026-10-04 夜、レーン L6。調整役の統合点 `032c9ce4` から早送りした作業木）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-673`、裁定の帯 `JDG-1452`〜`JDG-1455`、未決の帯 `PND-749`〜`PND-750`、台帳の帯 `DFC-2091` は調整役から受けた（13 節で、木のどこにも `CR-673` ・ `JDG-1452` ・ `PND-749` ・ `DFC-2091` が無いことを測った）。使ったのは `PND-749` と `DFC-2091` だけ。
> 閉じるもの: `DFC-1874`・`DFC-1875`・`DFC-1876`・`DFC-1877`・`DFC-1879`・`DFC-1881`・`DFC-1883`（監査 `docs/review/user-raised-items-audit-2026-10-04.md` の 7 節が「当てる」と残した行）。`DFC-1850` は確かめて、当てずに持ち越す（4 節）。
> 仕様の新しい識別子: 取らない。`PK-4` の形の欄に数を 1 つ足し、`FR-041` の例外の文を消し、辞書の `IC-127` の語を改める。
> 触らないもの: `DFC-1878`（取下げ済み）・`DFC-1880`（ヘルプの最大化、レーン L2 の `CR-669`）・`DFC-1882`（日付の範囲のつなぎ、レーン L3 の `CR-670`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `docs/development-records/rulings.md` の該当行）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1244` の 6 | 「テーマ色もグレーでいいよ。 グレーにしたときの色のイメージが見れてよい。」 | `FR-041` の例外（テーマ色の見本だけモノクロを効かせない）を消す（E-01）。`DFC-1879` |
| `JDG-1245` の 7 | 「②も「文字サイズ / Font size」 (Recommended)」 | 辞書の `IC-127` の札を「文字サイズ / Font size」にする（E-02）。`DFC-1881` |
| `JDG-1245` の 10 | 「いまも生きている（規則へ書く） (Recommended)」 | `JDG-778` の許しを規則 04 の 6.3 節へ書く（E-03）。`DFC-1883` |
| `JDG-778` | 「テストの基準線を一時的に上げてよいと各エージェントに伝えろ。仕様を変えて実装したら、多少のバグは出る。 その代わり司令塔のおまえがどこまで直させるか指示しろ。 試験の進捗について毎回俺の裁定はは面倒だ。」 | E-03 の中身 |
| `JDG-230` | 「㉖ 再開アイコン → 推奨通り」 | `FR-109` の「中断のあいだの実績の線は停止日で矢じりを付けずに止める」。仕様は既に新しい形で、コードが古い（E-04、`DFC-1874`） |
| `JDG-206` | 「依存線のマウスカーソルが予定と見間違えそうだ。 矢じりの幅を今の半分にしろ。 …」 | 矢じりの幅を `PK-4` に数で書き、コードをその数にする（E-05、`DFC-1875`） |
| `JDG-290` の ② | 「「置き換えてよい」」 | 確定していない入力の真偽の口を、始まり・終わりの知らせ（`IF-9`）に置き換えた。残っていた旧の口を消す（E-06、`DFC-1876`） |
| `JDG-637` | 「→提案通り」（`dfc-*` を system ／契約試験へ移す） | 単体の置き場に残った 2 本を契約試験へ移す（E-07、`DFC-1877`） |

⭐ 同じ・似た主題の裁定を `rulings.md` で引いた（「モノクロ」「文字の大きさ」「Text size」「基準線」「矢じり」「中断」「hasUnsettledTextEntry」）。覆す側の印は既に付いている —— `JDG-452`（テーマ色の見本の読み）と `JDG-647`（札「文字の大きさ / Text size」）は「覆された（一部）」、`JDG-778` は「一部適用済」で規則の文を `DFC-1883` に待たせていた。`JDG-1244`・`JDG-1245` より新しい、同じ主題の裁定は無い。⚠️ `JDG-1243` の 2 は誤った前提の問いだった（`JDG-1349`、`DFC-1878` 取下げ）—— 本書の 3 件に同じ誤りが無いことを、問いの文と仕様・辞書の今の文で照らして確かめた（`IC-127` の札は辞書 `display-words.json` の `IC-127` が「文字の大きさ / Text size」、`FR-041` の例外は `01-04-requirements.md` の段落に在った）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-006`**（読まずに使える） —— 同じ字形 Aa の入口が、パレットでは「文字サイズ」、窓では「文字の大きさ」と名を変えると、別の働きに読める。モノクロで画面の一部だけが色を残すと、モノクロが効いているかが読めない（`FR-041` の段落の理由そのもの）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R2.14`（POLA）** —— モノクロで、テーマ色の見本だけが色を持つのは、色の欄の見本が灰になる（`CV-9`、`JDG-524`）のと食い違う。⇒ 例外を消す。
- **`R1.3`（唯一の正）** —— 札の語の正は辞書 `docs/spec/_source/display-words.json` だけ。⇒ 辞書だけを直し、`npm run gen` で写しを刷る。矢じりの幅の正は 表 T-269 の `PK-4` に置く（それまではコードの道筋の文字列にしか無かった）。
- **`R2.9`（YAGNI: 未使用のものを残さない）** —— `hasUnsettledTextEntry` は `src/` の呼び手が 0。⇒ 宣言・実装・試験の作り物から消す。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | `IC-127` の説明の文の「文字の大きさ / text size」も「文字サイズ / font size」にそろえる | 札と説明で同じものを別の名で呼ばない（`R2.14`）。`JDG-1245` の 7 は名をそろえると答えた | 無い |
| X-2 | `PK-4` に書く数は矢じりの幅だけ（一辺の 4 分の 1、24 の格子で 6）。長さはいまのコードの 9 のまま | `JDG-206` が言ったのは幅だけ。見本（`grab-area-sizing-sample.html` の `LINE_ARROW_HEAD`）は幅 6 | 見本の長さ 6 とは違う —— 見て細すぎれば長さも書く |
| X-3 | 中断中の実績の線は、矢じりの先（矢印）または終わりの点の中心（端点スパン）まで平らに引き、始まりの点は残す | `FR-109`「停止日で … 付けずに止める」。線の長さは停止日の端のまま | 無い |
| X-4 | `hasUnsettledTextEntry` を読んでいた試験は、`IF-9` の知らせから「開いている欄があるか」を数える小さな道具（`tests/fixtures/field-edit-notices.ts`）に移す。試験の中身（何を確かめるか）は変えない | 旧の口と知らせは同じ 3 つの状態（欄・透かしの解除・文書の題）で立つ（`field-editing.ts` の `holdText`・題・透かし） | 無い |
| X-5 | 戻り止め 2 本の行き先は `tests/system` でなく `tests/contract` | `JDG-637` の適用（`CR-573` の 15 節）と同じ —— 2 本は vitest で書かれ、`tests/system` は Playwright | 無い |
| X-6 | `DFC-1850` は当てない（4 節） | 押した先の親入力の面が `src/` に無く、形が決まっていない | パネルの親のリンクは、もう 1 巡待つ |

---

## 1. 範囲 —— 監査が残した行を 1 行ずつ確かめた

| 行 | 確かめたこと（`032c9ce4`） | 本書 |
|---|---|---|
| `DFC-1874` | 開いている。`task-figures.ts` の `lineBar` は矢印に必ず矢じりを付け、呼び手は中断を見ない | E-04 で直す |
| `DFC-1875` | 開いている。`pointer-shape.ts` の `LINE_ARROW_END_PATH` の矢じりは y 6〜18（幅 12）、`PK-4` に数が無い | E-05 で直す |
| `DFC-1876` | 開いている。`src` の宣言 1・実装 1・露出 1、呼び手 0。試験の作り物 107 行と、読む試験 5 ファイル | E-06 で直す |
| `DFC-1877` | 開いている。2 本とも `tests/unit` に在る | E-07 で直す |
| `DFC-1879` | 開いている。`properties-panel.ts` の `themeHueField` が `colourOf(..., false)` | E-01 で直す |
| `DFC-1881` | 開いている。辞書の `IC-127` は「文字の大きさ / Text size」 | E-02 で直す |
| `DFC-1883` | 開いている。規則 04 の 6.3 節の表は「上げる —— 毎回、利用者の了承」だけ | E-03 で直す |
| `DFC-1850` | 開いている（4 節）。`CR-631` は 4.4 節を当てず、`CR-658` は親定義の入口の置き場だけ | 当てない |

---

## 2. ⛔ 消すものを先に列挙する（旧 → 新）

| # | 消すもの（`032c9ce4`） | 置き換わる先 |
|---|---|---|
| 1 | `01-04-requirements.md` の `FR-041`「⛔ 見本にモノクロ（`S-74`）を効かせてはならない（MUST NOT） —— すべての見本が同じ灰になり選べなくなる。」 | 「⚠️ モノクロ（`S-74`）が入っているあいだは、見本も次の段落のとおり灰で描く —— …（`CV-9`）」 |
| 2 | 同「⚠️ 例外は、上の段落のテーマ色の欄の見本だけである —— 見本は … モノクロを効かせない（上の段落の MUST NOT）。」 | 「⚠️ 例外を置かない —— 上の段落のテーマ色の欄の見本も灰で描く。」 |
| 3 | 辞書 `IC-127` の札「文字の大きさ」／"Text size" と説明の「文字の大きさ」／"text size" | 「文字サイズ」／"Font size"、「文字サイズ」／"font size" |
| 4 | 規則 04 の 6.3 節の表「ほかのセッションと体 —— 基準線に触らない」 | 「上の行のほかは基準線に触らない」＋ 新しい行（`JDG-778`） |
| 5 | `ScreenSurface.hasUnsettledTextEntry`（`screen-surface.ts`）・`field-editing.ts` の実装・`dom-screen-surface.ts` の露出 | 無い（`readFieldEditNotices` だけ） |
| 6 | `tests/contract/cr-585-hue-swatches-stay-in-colour.test.ts`（消した例外を守っていた試験） | 退く。新しい形の試験は試験の波が仕様だけを読んで書く |

---

## 3. 書き直す所

### E-01 `FR-041`（テーマ色の見本） —— `DFC-1879`

2 節の 1・2 のとおり。コード: `src/adapter/screen-renderer/properties-panel.ts` の `themeHueField` が `settings.themeMonochrome` を受け取り、見本の `colourOf` に渡す。

⚠️ 追記（2026-10-04、仕様だけの試験の波が見つけた） —— 最初に当てた文は「色相ごとに灰の明るさが違うので、灰にしたときの見え方で選べる」と書いたが、誤りであった。
仕様の灰は HSL の明度を保って彩度を 0 にする（`_assets/tbl-settings.md` の 表 T-294 の前文、`CV-7` の「赤・青・オレンジ・紫・薄い灰色は同じ灰」、公開入口 `achromatic` の「明度を保ったまま」）。
`S-151` の明度は明暗ごとに 1 つ（明 32%・暗 68%）なので、どの色相の見本も同じ灰になる —— 消した MUST NOT の理由「すべての見本が同じ灰になり」と同じ事実である。
⇒ `FR-041` の文を「灰は HSL の明度を保つので（表 T-294 の前文）、どの行の見本も `S-151` の明度の同じ灰になり、モノクロの絵が色相で変わらないことをそのまま見せる」に直した。コードは変えない（`achromatic` は既にその灰を返す）。
試験 `tests/contract/cr-673-monochrome-swatches-font-size-stopped-line-arrow-head-and-field-notices.contract.test.ts` の `it.todo` を、明暗ごとに「見本の灰がすべて `S-151` の明度の灰に等しい」の 1 件にした。
⚠️ 色相ごとに違う灰（知覚の明るさを保つ灰）にするなら、`achromatic` の式そのものを変える別の CR になる —— `CV-7`・`CV-10`・表 T-294 の前文と `NFR-007` の実測が動く。

### E-02 辞書 `IC-127` —— `DFC-1881`

`docs/spec/_source/display-words.json` の `IC-127`: 札 ja「文字サイズ」・en "Font size"、説明 ja「パネルの見出しと表と入力欄の文字サイズを変える（9・10・12 px を順に巡る）」・en "Change the font size of the panel's heading, table and search box (cycles through 9, 10 and 12 px)"。窓の字を保存しないこと（`S-429`）は変えない。`npm run gen` が `src/adapter/screen-renderer/display-words.json` を刷る。

### E-03 規則 04 の 6.3 節 —— `DFC-1883`

「誰が基準線を動かすか」の表に、`JDG-778` の行（仕様を変えて実装する持ち場は、自分の帯の `DFC` と理由を書いて一時的に上げてよい。どこまで直すかは調整役が決めてブリーフに書く。必ず直すもの・上げて先へ進んでよいもの。閉じるときの振り分け）を足し、「上げる」の行を「次の行の持ち場を除く」とした。

### E-04 中断中の実績の線 —— `DFC-1874`

仕様は変えない（`FR-109` は既に新しい形）。`src/entity/layout-engine/schedule-geometry/task-figures.ts` に `stoppedLine` を足し、`planActualState` が `suspendedResumePlanned`・`suspendedResumeUnknown` の `Task` の実績の線から矢じりと終わりの点を外す（X-3）。

### E-05 `PK-4` —— `DFC-1875`

表 T-269 の `PK-4` の形の欄に「矢じりの幅（軸に直角の広さ）は一辺の 4 分の 1 とする（一辺を 24 に割った格子で 6）」を足した。コード: `src/framework/single-html-shell/pointer-shape.ts` の `LINE_ARROW_END_PATH` を `M2 11 H13 V9 L22 12 L13 15 V13 H2 Z` にした。⚠️ 図 F-025（`_assets/fig-pointer-shapes.svg`）は探り（`tools/probe/grab-figures.mjs`）が出荷ビルドから撮る —— 本書では撮り直していない（`DFC-1851` が図 F-025 を持つ）。

### E-06 旧の口 —— `DFC-1876`

2 節の 5。試験の作り物の `hasUnsettledTextEntry: () => …,` 107 行を消し、読む試験 5 ファイル（`dfc-152`・`dfc-571`・`dfc-579`・`cr-439` の 2 本）は `tests/fixtures/field-edit-notices.ts` の `textEntryStandsOpen` を読む（X-4）。`fr-001-fr-083-the-toggle-and-the-drag.test.ts` の作り物は、欄を握ったとき `PR-1` の始まり・終わりの知らせを出す（`fr-072` の作り物と同じ形）。`uf-71`・`uf-72` の `IF-9` の口の名簿から名を消した。

### E-07 戻り止めの置き場 —— `DFC-1877`

`tests/unit/dfc-1130-in7-tooltip-measured-once.test.ts`・`tests/unit/dfc-1720-a-row-control-tip-sits-under-its-row.test.ts` を `tests/contract/` へ `git mv` した（中身は `spec-table` の読み先の 1 行だけ変わる）。

---

## 4. `DFC-1850`（`JDG-1058` ③、パネルの親の名のリンク）を確かめた

- `CR-631` は 11 節の問い 1 で「③ を当てる別の変更要求があるか」を問い、無かったので 4.4 節・決定 13 を当てなかった（`CR-631` の頭の「当てたときの 11 節の答え」）。
- `CR-658` は親定義の入口（`IC-142`）の置き場だけを変えた。`PR-15`・プロパティパネルに触れていない。
- いまの形: `_source/property-items.json` の `PR-15` は入力の型「選択」、`properties-panel.ts` の `parentCandidates` は文書のすべての `Task` を並べる選択の欄。
- ⇒ **当たっていない。** 本書は当てない（X-6）。理由は 2 つ:
  1. リンクを押した先の **親入力の面（`FR-135`）が `src/` に無い** —— `FR-134` の 表 T-312 の `VO-4` の行を押したときも開くと定めるが、どちらの道も開く先が無い。`FR-134` の RATIONALE は「親入力の面の形と寸法は、まだ決めていない —— 触れる見本で決める」。⇒ 台帳 `DFC-2091`（親入力の面が無い）、未決 `PND-749`（面の形と寸法）を起こした。
  2. 4.4 節は表 T-016 に新しい入力の型（リンクと ×）を足し、辞書に「親:」「導出」「未定（候補 n）」「なし」の語を足す —— プロパティパネルはこの波でレーン L4（`CR-671`）が持つ。
- 当てるときの文の案は `CR-631` の 4.4 節と決定 13 のまま使える。⭐ 推奨: `PND-749` の見本で親入力の面の形を決めた後、`DFC-2091` と `DFC-1850` を 1 つの変更要求で当てる。

---

## 5. 継ぎ目

- `ScreenSurface`（表 T-065 の `IF-9`）から `hasUnsettledTextEntry` が抜ける。`IF-9` の文は旧の口を名指していない（`docs/spec` を引いて 0 件）—— 仕様の継ぎ目の表は変わらない。
- `themeHueField(hue, dark, monochrome, language)` —— `properties-panel.ts` の中だけの関数。

## 6. グラフ（`032c9ce4`、`impact.py`）

| ID | 指している要求 ／ 参照 | 本書で変えたもの |
|---|---|---|
| `FR-041` | 表 11・行 26 を指す | 例外の 2 文 |
| `PK-4` | 要求 1 件 ／ 参照 3 か所 | 形の欄に数 |
| `IC-127` | 要求 3 件 ／ 参照 6 か所 | 辞書の語だけ（要求の文は名を書いていない） |
| `FR-109` | — | 仕様は変えない |
| `IF-9` | 要求 3 件 ／ 参照 13 か所 | 仕様は変えない |
| `PR-15` | 要求 0 件 ／ 参照 0 か所 | 変えない（4 節） |

## 7. 試験

- 退いた: `tests/contract/cr-585-hue-swatches-stay-in-colour.test.ts`（2 節の 6）と、`tests/contract/cr-557-the-theme-hue-field-heads-the-settings-panel.test.ts` の、消した 2 文を引く 2 行と「モノクロでも見本は色のまま」の 2 件（明暗ごと）。
- 直した（旧の形を写していた作り物と読み手）: 3 節の E-06。
- 移した: 3 節の E-07。
- ⛔ 本書の新しい形（モノクロの見本・`IC-127` の札・`PK-4` の幅・中断中の線）の仕様だけの試験は、本書の当て手は書かない —— 試験の波が書く。

## 8. 毎フレームの経路

`src/entity/layout-engine/schedule-geometry/task-figures.ts`（中断中の `Task` 1 本ごとに配列を 1 つ短くするだけ）・`src/adapter/screen-renderer/properties-panel.ts`（設定の面を出しているときだけ、見本 10 個の色を灰にする）・`src/adapter/screen-renderer/display-words.json`（語だけ）に触れた ⇒ `perf-pending.md` の 92。

## 12. 台帳

| 行 | 本書での扱い |
|---|---|
| `DFC-1874`・`DFC-1875`・`DFC-1879`・`DFC-1881` | `実測待ち`（利用者の手順は 14.2 節） |
| `DFC-1876`・`DFC-1877`・`DFC-1883` | `実測済`（grep と型の検査で確かめた。画面に出ない）。`fixed-defects.md` へ移した |
| `DFC-1850` | `仕様待ち` のまま。4 節の確かめを書き足した |
| `DFC-2091` | 新しい行（親入力の面が `src/` に無い） |
| `PND-749` | 新しい行（親入力の面の形と寸法） |
| `JDG-1244` | 6 を適用済にした（8 は `DFC-1880`、レーン L2） |
| `JDG-1245` | 7・10 を適用済にした（9 は `DFC-1882`、レーン L3） |
| `JDG-778` | 規則の文が着地した、と書き足した |

### 12.3 調整役に宣言する番号

使った: `CR-673`、`PND-749`、`DFC-2091`。使わなかった: `JDG-1452`〜`JDG-1455`、`PND-750`。

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 032c9ce4

# the numbers are unused (0 before drafting)
git grep -n -e "CR-673" -e "JDG-145[2-5]" -e "PND-749" -e "PND-750" -e "DFC-2091"

# same and similar rulings
grep -n "モノクロ" docs/development-records/rulings.md
grep -n "矢じり" docs/development-records/rulings.md
grep -n "JDG-1244\|JDG-1245\|DFC-1879\|DFC-1881\|DFC-1883" docs/development-records/rulings.md

# is each item still open
grep -rn "hasUnsettledTextEntry" src tests
grep -n "LINE_ARROW_END_PATH" src/framework/single-html-shell/pointer-shape.ts
grep -n "colourOf(THEME_HUE_SWATCH_ROW" src/adapter/screen-renderer/properties-panel.ts
grep -n '"IC-127"' -A8 docs/spec/_source/display-words.json
grep -rn "JDG-1058\|DFC-1850" change-request/ docs/development-records/

# the blast radius
python .claude/skills/spec-graph-check/impact.py FR-041
python .claude/skills/spec-graph-check/impact.py PK-4
python .claude/skills/spec-graph-check/impact.py IC-127
python .claude/skills/spec-graph-check/impact.py IF-9
python .claude/skills/spec-graph-check/impact.py PR-15
```

---

## 14. 実物の確かめ

### 14.2 利用者に押してもらう手順（調整役へ渡す。`JDG-1340`）

調整役が作り直した `dist/index.html` を開く。

1. ヘッダーのモノクロの入口を入にし、`IC-17` で文書の設定の面を出す。⇒ テーマ色の見本 10 個が灰で、どれも同じ灰であること（E-01 の追記）。モノクロを切ると色に戻ること。
2. 検索パネル（`Ctrl` ＋ `F`）と遅延診断のレポートの窓で、見出しの行の Aa にポインタを当てる。⇒ 説明が「文字サイズ」（英語では "Font size"）であること。
3. 中断中のタスク（再開予定あり・再開日未定のどちらか）の実績の線を見る。⇒ 停止日で平らに止まり、矢じり（線だけの矢印の形）も終わりの点（端点スパンの形）も無いこと。
4. 依存線の上にポインタを当てる。⇒ 線の矢印のポインタの矢じりが、前より細いこと（幅が半分）。
