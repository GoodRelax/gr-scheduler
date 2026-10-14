# CR-768 —— 保存の選択面に渡す媒体の型は表 T-024 が持ち、遅延診断レポートの `.md` も同表の行になり、仕様の値の手の写しは生成に替わる

> 起草の状態: 起草だけ（2026-10-15、`4a907919` の上で起草した）。当てていない —— `docs/spec`・`src`・`tests`・生成器・基準線に触れていない。11 節に利用者へ問うことは無い（裁定 `JDG-2163` が向きを決め、残りは ③ に問わずに決めたこととして書いた）。仕様の差し替え・`npm run gen`・コード・試験は調整役が体に手配する。
> ID の帯: 番号 `CR-765`〜`CR-768`、裁定 `JDG-2220`〜`JDG-2229`、台帳 `DFC-2720`〜`DFC-2729`、`PND-948`〜`PND-951`、見本の置き場 `57` を調整役から受けた（4 つの変更要求で共有）。本書が使うのは `CR-768` だけ（裁定・台帳・`PND` の番号は使わない）。変更履歴と `perf-pending` の番号は当てる体が調整役から受ける。`4a907919` の木で `CR-768` を名乗るものは 0 件、`JDG-2220`〜`JDG-2229`・`DFC-2720`〜`DFC-2729`・`PND-948`〜`PND-951` を行に持つ台帳は 0 件だった（13 節）。
> 当てるもの: 裁定 `JDG-2163`（表 T-024 に遅延診断レポートの Markdown の行と、保存の選択面に渡す媒体の型の欄を足し、`MEDIA_TYPE_OF_EXTENSION` を表から生成する）と、`DFC-2645` が数えた残りの手の写し。閉じるもの: 台帳 `DFC-2645`（`TASK_GROUP_GUARDS` は `CR-767` の後の波 C、`WRITTEN_PROPERTIES` は `CR-765`、`ARMED_BY_ENTRY`・`FONT_SCALE_STEPS` は `CR-579` が持つ —— 8 節）。
> 3 つの部に分けて書く。A 部 ＝ 表 T-024 と `FR-096` と `RW-7`（仕様が変わる）、B 部 ＝ 仕様が変わらない手の写し 9 つ（コードと生成器だけ）、C 部 ＝ `TASK_GROUP_GUARDS`（`CR-767` の後）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`4a907919`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| 依頼文「表 T-317 の `RW-6`」 | `RW-6`・`RW-7` は `FR-134` の 表 T-346 の行（`01-04-requirements.md` の 3826 行・3827 行）。表 T-317 は遅延診断のレポートの欄 | 本書は 表 T-346 と書く |
| 表 T-024 に媒体の型の欄を足すのは、今の仕様と矛盾しない | `FR-096` が逆を言う —— 「⛔ その伝え方が要する媒体型を、本書のどの表にも持たせてはならない（MUST NOT） —— 媒体型は外の規格が決めている値であり、宿主の作法であって製品の値ではない」「⇒ 持ち場は `05-07-design.md` の Framework 層とすること（MUST）」「⛔ 表に列を足すと、外で決まっている値を本書が二重に持つことになる」。入ったのは `ea0f706ca`（2026-09-01）で、守る裁定の行は無い（`rulings.md` を「媒体」で引いて `JDG-2163` だけ） | 偽。⭐ 文の理由も今は偽である —— 6 つの値のうち `.svg`・`.html`・`.md` の 3 つは `image/x-grs-svg`・`text/x-grs-html`・`text/x-grs-markdown` で、外の規格ではなく本製品が `JDG-1165` のために決めた値である。`JDG-2163` が文を覆す（X-3） |
| `.md` の行を足しても、文書の書き出し（`IC-2`）の選択面は変わらない（裁定「画面は変わらない」） | `FR-096` の選ばせる集まりは「表 T-024 のうち書出の方向を持ち、ファイルとして出る形式」。`.md` の行はこれに当たる。生成器 `tools/generate_exchange_formats.py` は拡張子を持つ書出の行を全部 `export-formats.json` に出し、`open-modals.ts` がそれを選択面のボタンにする（語の無いボタンが 1 つ増える）。`tools/generate_display_words.py` の `EXPORT_FORMATS_NOT_OFFERED = ('IO-5', 'IO-6')` も新しい行に語を求める。表 T-340 の `SX-2` も同じ集まりを読む | 偽 —— 何も足さなければ選択面に `.md` が出る。⭐ 表に「`IC-2` に出す」の欄を足して選ばせる集まりを機械で読める形にする（③ の X-b） |
| `MEDIA_TYPE_OF_EXTENSION` の写しは 1 つ | `file-system-access-file-store.ts` の 100〜111 行（拡張子 → 型の 6 組、読むのは `saveFileTypesFor` だけ）。ほかに `.md` の字が `delay-diagnostics-report.ts` の 155 行（`MARKDOWN_EXTENSION`）と `delay-diagnostics-report-window.ts` の 32 行に手で書かれている —— 値の集まりではないので検査 69・70 は数えない | 真だが足りない —— 2 つの `.md` も 表 T-024 の新しい行から読ませる（X-6） |
| 生成器は欄を 1 つ足せば読む | `generate_exchange_formats.py` は 7 つの欄を位置で読み（`FIELDS`）、欄の数が違えば止まる | 真ではない。当てる体が `FIELDS` と添字を直す（5 節） |
| `RW-7` を書き替えても試験は赤くならない | `tests/contract/dfc-1722-jdg-1165-the-save-chooser-names-one-extension.test.ts` が `RW-7` の文「書いた名前が `.md` で終わることを保証する…」をそのまま引き、拡張子を正規表現で取る | 偽 —— 試験の体が、拡張子を 表 T-024 の新しい行から読む形に直す（5 節） |
| 手の写しは 14 | 検査 69 の基準線 16 から偶然の 3（`CALENDAR_CONSUMED`・`COLOR_FORM_OF_COLUMN`・`KEY`）を除いて 13、検査 70 の `spec-copy` 1（`EDITED_BY_SCREEN`） | 真。持ち手は 8 節の表 |
| 写しを直すとき基準線も直す | 検査 69・70 は、直した写しの記録が残っていても赤になる（「払った借りは同じ変更で抜く」）。基準線を下げるのは調整役が決めてよい（`JDG-520`） | 真。写しごとに記録を同じ巡で抜く（5 節） |

### 0.2 裁定の鎖（`rulings.md` を「`T-024`」「`IO-7`」「`RW-7`」「媒体」「選択面の種類」「`MEDIA_TYPE`」「`text/x-grs-html`」「手の写し」「基準線」と、写しの 14 の名で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-2071` | 仕様書が唯一の正。コードは仕様書に合わせる | 本書の起こり（`DFC-2645` はその ③ の調べ） |
| `JDG-2163` | 表 T-024 に `.md` の行と媒体の型の欄（6 形式すべて）を足し、`RW-7` は拡張子をその行から引き、`MEDIA_TYPE_OF_EXTENSION` は表から生成する。画面は変わらない | A 部そのもの |
| `JDG-1165` | 単一 HTML を保存する選択面の種類は `.html` だけにする（宿主がよく知る型を渡すと別の拡張子まで並ぶ） | 変えない。その工夫（`x-` の型）を表の値として残す |
| `JDG-1018`・`JDG-1230` | レポートの名と、書き出すファイル名（ASCII、`_delay-diagnostics_`、基準日、`.md`） | 変えない。`.md` の字だけを 表 T-024 から引く |
| `JDG-520` | 基準線は調整役が下げ・刈ってよい | B 部・C 部で記録を抜く根拠 |
| `JDG-2161` | 状態機械のガードの条件は原稿が持つ | C 部は `CR-767` が当たった後（8 節） |

覆す裁定: 無い。覆すのは `FR-096` の 4 文（裁定ではなく本文。0.1 の 2 行目）。写しの 14 の名を引いた裁定は 0 件。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- どの課題も直には前へ進めない —— 画面は変わらない。仕様と実装の間の土台の直しであり、`JDG-2071` の「仕様書が正」を値の集まりで守らせる。
- 間接に `CH-5`（`GL-005`、単一の `.html` で完結し、特定の業種にも製品にも依存しない）を支える —— 保存の選択面の工夫（`x-` の型）が仕様から落ちると、次に誰かが「標準の型に直す」と `JDG-1165` の不具合が戻る。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（唯一の正）—— 媒体の型の正が `FR-096` の文では「`05-07-design.md` の Framework 層」とされながら、設計書に型は 1 つも無く、コードだけが持っていた（`grep` で 0 件）。正を 表 T-024 に置く。
- `R2.21`（1 つの仕事は 1 か所）—— `.md` の字が 3 か所（写しの表 1、字 2）。表の 1 行から生成で届かせる。
- `R1.2`（検証できる表現）—— 「書出の方向を持ち、ファイルとして出る」は `.md` の行を足すと選択面の集まりとずれる。欄の値で言う（X-b）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 新しい行は `IO-8`、形式の名は「Markdown」、方向は「書出のみ」、置く位置は `IO-4` の次（ファイルとして出る行を並べたまま、保管庫とクリップボードの前） | `FR-096` の並びは「`IC-2` に出す」の行どうしの順だけを決める（X-b）ので、`IO-8` をどこに置いても選択面の順は変わらない | — |
| X-b | 表 T-024 に「`IC-2` に出す」の欄（値は「出す」／「出さない」）を足し、`FR-096` の選ばせる集まりをこの欄で言う。`IO-5`・`IO-6`・`IO-8` は「出さない」 | 0.1 の 3 行目。ほかの手は、`FR-096` に「`IO-8` を出してはならない」を足して生成器に除く行の一覧を手で持たせることだが、それは仕様の値の手の写しを 1 つ増やす（`EXPORT_FORMATS_NOT_OFFERED` も消せない） | 表の欄が 2 つ増える（媒体の型と合わせて 9 欄） |
| X-c | 媒体の型の欄の名は「保存の選択面に渡す媒体の型」、ファイルとして出ない行（`IO-5`・`IO-6`）は `—` | 裁定の文「保存の選択面に渡す媒体の型（名札）」の語のまま | — |
| X-d | `ARMED_BY_ENTRY`・`FONT_SCALE_STEPS` は本書で直さない —— `CR-579`（起草、`DFC-1072` の G66・E42）が同じファイル `input-command-translator.ts` を割る | 1 つのファイルに書き手は 1 人（`05-working-method.md` の 11 節・13 節） | `CR-579` が当たるまで 2 つの写しが残る |
| X-e | `EDITED_BY_SCREEN` は、表 T-229 を `tools/spec_tables.py` で読む生成器が `frame-loop.ts` に生成の領域として書く（表 T-229 は原稿へ移さない） | 写しは 1 つの値で、表は 3 行。原稿へ移すと表の置き場が変わり、`FR-063`・`FR-064` の指し先が動く | 生成器が 1 つ増える（名は当てる体が `JDG-820` で付ける） |
| X-f | `TABLE_ROW_OF_SAVE_FORM` は、保存の形の名（`grsJson`・`mspdi`…）を行 ID に置き替えて畳む —— 形の名はコードだけが持つ英語の名で、表は持たない | `generate_exchange_formats.py` の注「no English name is minted」。名を表に足すより、コードが行 ID を形の鍵にするほうが写しが 0 になる | `document-file-flow.ts` と `document-codec.ts` の形の鍵が変わる（振る舞いは同じ） |
| X-g | `delay-diagnostics-report-window.ts` は `.md` を自分で持たず、画面の描き手が渡す書き出しの依頼から拡張子を受ける | 層をまたいで同じ値を 2 つ生成するより、依頼に載せる（`CHOOSER_OUT` の前例は層ごとの写しだが、ここは呼び手が既に依頼を作っている） | 依頼の型に欄が 1 つ増える |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| 遅延診断レポートの `.md` の書き出し | 表 T-024 に行が無い。`.md` は `RW-7` の文と 3 つのコードの字が持つ | 表 T-024 の `IO-8`。`RW-7` とコードはその行から引く |
| 保存の選択面に渡す媒体の型 | `FR-096` が表に持つことを禁じ、コードの `MEDIA_TYPE_OF_EXTENSION` だけが持つ | 表 T-024 の欄。コードは生成された写しを読む |
| `IC-2` の選択面に並ぶ形式 | 「書出の方向を持ち、ファイルとして出る」行（生成器は除く行を手で持つ） | 「`IC-2` に出す」の欄が「出す」の行（5 行、順も今と同じ） |
| 画面 | — | 変わらない（`IC-2` の選択面は今と同じ 5 つ、`IC-140` の保存の選択面の種類も今と同じ `.md` 1 つ） |
| 手の写し（`DFC-2645` の 14） | 14 | B 部の 9 と A 部の 1 が 0 に、C 部の 1 は `CR-767` の後に 0 に。`WRITTEN_PROPERTIES` は `CR-765`、2 つは `CR-579` |

---

## 2. 新しい識別子

| 何か | 置き場 | 番号 |
|---|---|---|
| 表 T-024 の行（遅延診断レポートの Markdown） | `docs/spec/01-04-requirements.md` | `IO-8`。`4a907919` で `IO-8` は空いている（`IO-` の行は `IO-1`〜`IO-7`）。当てる時に測り直す |

新しい表・接頭辞・要求・設定の行は無い。表 T-024 の欄が 2 つ増える（X-b・X-c）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

### A 部（`JDG-2163`）

| 旧 | 新 |
|---|---|
| 表 T-024 の見出し `| 行 ID | 形式 | 方向 | 拡張子 | 先頭の非空白 1 文字 | 用途 | 備考 |` | X-1 |
| 表 T-024 の 7 行（`IO-2`・`IO-1`・`IO-7`・`IO-3`・`IO-4`・`IO-5`・`IO-6`） | X-1（欄を 2 つ足すだけ。ほかの升は変えない） |
| `FR-096` の STATEMENT「**表 T-024 のうち書出の方向を持ち、ファイルとして出る形式**から選ばせ」 | X-3 |
| `FR-096` の 4 文「⭐ 宿主に「その拡張子の形式である」ことを伝える手立てがあるなら、それを使うこと（MUST）。」「⛔ その伝え方が要する媒体型を、本書のどの表にも持たせてはならない（MUST NOT） —— …」「⇒ 持ち場は `05-07-design.md` の Framework 層とすること（MUST） —— …」「⛔ **表に列を足すと、外で決まっている値を本書が二重に持つことになる。**」 | X-3 |
| 表 T-346 の `RW-7` の「＋ 「.md」」と「書いた名前が `.md` で終わることを保証する（`FR-096` の拡張子の定めと同じ）」 | X-4 |
| 表 T-340 の `SX-2` の 1 つ目の升「表 T-024 のうち書出の方向を持ちファイルとして出る、`IO-2` 以外の形式（`IC-2` で選んで書いたとき）」 | X-5 |

### B 部・C 部

仕様の文は消さない。消すのはコードの写しと、基準線の記録（5 節）。

---

## 4. 書き直す所

### A 部 —— 表 T-024 と `FR-096` と `RW-7`（`JDG-2163`）

#### X-1 —— 表 T-024（`FR-021`、`01-04-requirements.md`）

見出しと、足す 2 つの欄の値（ほかの升は今のまま）:

```
| 行 ID | 形式 | 方向 | 拡張子 | 保存の選択面に渡す媒体の型 | `IC-2` に出す | 先頭の非空白 1 文字 | 用途 | 備考 |

IO-2  … | `.json` | `application/json`     | 出す   | `{` | …
IO-1  … | `.xml`  | `application/xml`      | 出す   | `<` | …
IO-7  … | `.html` | `text/x-grs-html`      | 出す   | `<` | …
IO-3  … | `.svg`  | `image/x-grs-svg`      | 出す   | —   | …
IO-4  … | `.png`  | `image/png`            | 出す   | —   | …
IO-8 （X-2）
IO-5  … | —       | —                      | 出さない | — | …
IO-6  … | —       | —                      | 出さない | — | …
```

値は `4a907919` の `file-system-access-file-store.ts` の 100〜111 行の 6 組と同じ（画面が変わらないことの証）。

#### X-2 —— 表 T-024 に 1 行足す（`IO-4` の次）

```
| IO-8 | Markdown | 書出のみ | `.md` | `text/x-grs-markdown` | 出さない | — | 遅延診断レポート（`FR-134` の 表 T-346 の `RW-6` の文字列）をファイルとして渡す | 書く入口は `IC-140`（`FR-134`）—— 文書ではないので `IC-2` に出さない。<br>置き場と名は 表 T-346 の `RW-7`。<br>取り込まない |
```

表の後の注に 2 文足す（「⭐ **拡張子の欄は、…」の段の後）:

```
⭐ **媒体の型の欄も、ファイルとして出る行がすべて持つ** —— `FR-096` が保存の選択面に渡す値の正が本表である。
⭐ **「`IC-2` に出す」の欄は、`FR-096` の選択面に並ぶ行を決める** —— `IO-8` は遅延診断レポートを運び、入口は `IC-140` なので出さない。`IO-5` と `IO-6` はファイルとして出ないので出さない。
```

#### X-3 —— `FR-096`（STATEMENT と 4 文）

STATEMENT の 1 文:

```
**STATEMENT**: 作成者が書き出しを選んだとき、`GRS` は、**表 T-024 のうち「`IC-2` に出す」の欄が「出す」の形式**から選ばせ、選ばれた形式の規約に従って書き出すこと。
```

4 文を次の 3 文に替える:

```
⭐ 宿主に「その拡張子の形式である」ことを伝える手立てがあるなら、表 T-024 の「保存の選択面に渡す媒体の型」の欄の値で伝えること（MUST）。
⭐ **媒体の型は本製品が決める値である** —— 宿主がよく知る型を渡すと、宿主はその型に結び付いたほかの拡張子まで選択面に並べる（利用者が `.html` だけと定めた）ので、`.svg`・`.html`・`.md` には本製品の `x-` の型を渡す。
⛔ **媒体の型を本要求に書き写してはならない（MUST NOT）** —— 拡張子と同じく、正は 表 T-024 ただ 1 か所である。
```

⚠️ `IO-6` の 1 文（「⛔ `IO-6`（クリップボード）を本要求の選択面に出してはならない（MUST NOT）」）は残す —— 欄の値と同じことを言うが、理由（`FR-025` が `IC-3` で直に運ぶ）はここにしか無い。

#### X-4 —— 表 T-346 の `RW-7`（`FR-134`）

```
提案する名は、文書名を `FR-096` の 表 T-352 で整えた名 ＋ 「_」 ＋ `delay-diagnostics` ＋ 「_」 ＋ 基準日（yyyy-mm-dd）＋ 表 T-024 の `IO-8` の拡張子。
…（中の 3 文は今のまま）…
書いた名前が 表 T-024 の `IO-8` の拡張子で終わることを保証し、保存の選択面には同じ行の媒体の型を渡す（`FR-096` の拡張子と媒体の型の定めと同じ）
```

#### X-5 —— 表 T-340 の `SX-2` の 1 つ目の升（`FR-096`）

```
表 T-024 のうち「`IC-2` に出す」の欄が「出す」の、`IO-2` 以外の形式（`IC-2` で選んで書いたとき）
```

⚠️ `NFR-004` の母数「表 T-024 の書出の形式」は変えない —— `IO-8` も母数に入る（`.md` の書き出しもネットワークを切って動くことを確かめる）。

### B 部 —— 仕様が変わらない手の写し 9 つ（コードと生成器だけ）

| 写し | 在り処（`4a907919`） | 正 | 直し |
|---|---|---|---|
| `AppliesTo` | `src/adapter/screen-renderer/properties-panel.ts` 182 行 | `_source/property-items.json` の `appliesTo` | 生成された `property-items.json` から型を導く |
| `HELD_BY_OF_OBJECT` | 同 190 行 | 同（`Task` 以外） | 同じ json から導く |
| `HELD_BY_ON_A_TASK` | 同 197 行 | 同（`appliesTo` が `Task` の行） | 同じ json から導く |
| `ColorForm` | `src/adapter/svg-renderer/svg-renderer.ts` 385 行 | 表 T-236 の 4 つの色の形（`_source/settings.json`） | 生成された `COLOR_NAME_VALUES` の鍵から導く |
| `THEME_ROW_OF_FORM` | 同 582 行 | 同 | `ColorForm` を導いた後、生成された行から引く |
| `ShapeKind` | `src/entity/layout-engine/schedule-layout/schedule-layout.ts` 115 行 | `erd.json` の `TaskVisual.shapeKind` | 生成された `COLUMN_SHAPES.TaskVisual.shapeKind.choices` から導く |
| `ROOT_KEYS` | `src/entity/document-model/document/document.ts` 20 行 | `_source/grs-document.schema.json` の根の鍵 | `tools/generate_entity_types.py` が根の鍵の並びを生成の領域に書く |
| `TABLE_ROW_OF_SAVE_FORM` | `src/framework/single-html-shell/document-file-flow.ts` 190 行 | 表 T-024 の「`IC-2` に出す」行 | 形の鍵を行 ID にする（X-f） |
| `EDITED_BY_SCREEN` | `src/framework/single-html-shell/frame-loop.ts` 455 行 | 表 T-229 の `ED-1` | 表を読む生成器が生成の領域に書く（X-e） |

### C 部 —— `TASK_GROUP_GUARDS`（`CR-767` が当たった後）

`src/use-case/edit-document/task-group-folding.ts` 48 行。`CR-767` が原稿に置くガードの定義から、`tools/generate_state_machine_types.py` がタスクグループの木のガードの名の和の型を生成し、写しは `Record<その型, …>` になる（名の足し・抜けを `tsc` が止める）。関数の本体は手で書く（`CR-767` の Q1 の答えが式なら、本体も生成の候補になる —— `CR-767` の 8 節）。

### 4.1 生成物

当てる体が `npm run gen` で `src/adapter/document-codec/exchange-formats.json`・`src/adapter/screen-renderer/export-formats.json`・新しい `src/framework/file-system-access-file-store/` の媒体の型の写し（X-1 の 6 組、拡張子を鍵に）・`src/adapter/screen-renderer/display-words.json`（`exportFormats` の区は「`IC-2` に出す」行で選ぶ —— 中身は今と同じ 5 語）・生成の領域（B 部の `ROOT_KEYS`・`EDITED_BY_SCREEN`）・`docs/development-records/test-inventory.md` を刷り直す。`strictdoc export docs/spec`（出力は根に残さない —— `rm -rf output`）。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えるもの |
|---|---|
| `tools/generate_exchange_formats.py` | 9 つの欄を見出しで読む（今は位置で 7 つ）。`CHOOSER_OUT` を「`IC-2` に出す」で選ぶ。Framework 層への 3 つ目の出力（拡張子 → 媒体の型、ファイルとして出る 6 行） |
| `tools/generate_display_words.py` | `EXPORT_FORMATS_NOT_OFFERED` を消し、`exportFormats` の区を「`IC-2` に出す」の欄で選ぶ |
| `src/framework/file-system-access-file-store/file-system-access-file-store.ts` | `MEDIA_TYPE_OF_EXTENSION` を消し、生成された写しを読む |
| `src/adapter/screen-renderer/delay-diagnostics-report.ts` | `MARKDOWN_EXTENSION` を消し、`IO-8` の拡張子を生成物から読む |
| `src/framework/single-html-shell/delay-diagnostics-report-window.ts` | `.md` を消し、依頼の拡張子を使う（X-g） |
| `src/framework/single-html-shell/document-file-flow.ts`・`src/adapter/document-codec/document-codec.ts` | X-f |
| B 部の 6 ファイル | 3 節 B 部の表 |
| `tools/generate_entity_types.py` | 根の鍵の並びの生成の領域（`ROOT_KEYS`） |
| 新しい生成器（名は当てる体） | 表 T-229 → `frame-loop.ts` の生成の領域（X-e）。`package.json` の `gen`・`gen:check` に足す |
| `.claude/skills/spec-graph-check/literal-restatement-baseline.txt` | 直した写しの記録（名の行と `why:` の行）を同じ巡で抜く —— A 部で 1、B 部で 8、C 部で 1 |
| `.claude/skills/spec-graph-check/twin-comments-baseline.txt` | `EDITED_BY_SCREEN` の記録（160 行）を、写しの注と一緒に抜く |
| `docs/development-rules/03-implementation.md` | 新しい生成の定数を一覧に足す（検査 30） |

試験（仕様だけを読む別の体が書く —— 規則 04）:

- A: 表 T-024 の「`IC-2` に出す」が「出す」の行が、`IC-2` の選択面にその順で並び、`IO-8` が並ばないこと。保存の選択面に渡す型が、書く行の媒体の型の欄の値と等しいこと（6 行）。`IC-140` の提案する名が `IO-8` の拡張子で終わること。
- `tests/contract/dfc-1722-jdg-1165-the-save-chooser-names-one-extension.test.ts` は `RW-7` の文と拡張子の正規表現を引く —— 拡張子と型を 表 T-024 の行から読む形に直す（試験の体）。
- 表 T-024 の行を数える試験（`tests/contract/if-3-file-store.test.ts` の「5 つの形」、`tests/system/nfr-004-file-scheme-sweep.sws.test.ts` の母数）は、`IO-8` の追加で数が変わる —— 試験の体が仕様から数え直す。
- B 部・C 部: 振る舞いは変わらない。`tsc --noEmit` と検査 69・70 が、写しが 0 になったことを確かめる。

毎フレームの経路（規則 04 の 5 節）に触れない —— 保存の選択面を開く時と、生成の時だけである。`perf-pending` の行は要らない。

---

## 6. グラフ（`impact.py`・`induced.py`、`4a907919`）

- 誘導部分グラフ（A 部の 16 対象: `T-024`・`FR-021`・`FR-096`・`FR-025`・`FR-060`・`FR-134`・`IC-140`・`RW-7`・`RW-6`・`SX-2`・`NFR-004`・`T-229`・`ED-1`・`T-346`・`IC-2`・`FR-067`）: 16 の種がすべて解決、辺 32、閉路 1。
  - 大きさ 8: `FR-021`・`FR-025`・`FR-060`・`FR-096`・`FR-134`・`IC-140`・`IC-2`・`RW-7` —— ⇒ **表 T-024（`FR-021`）・`FR-096`・`RW-7`（`FR-134`）は 1 つの波で書く**。`FR-025`・`FR-060`・`IC-140`・`IC-2` は書き直さない（閉路に入るが文は変わらない）。
  - `T-229`・`ED-1` はどの種とも辺を持たない（B 部は仕様を変えない）。
- 届く所（`impact.py`、深さ 2）:
  - 表 T-024 は要求 13 件（`FR-033`・`FR-012`・`FR-055`・`FR-021`・`FR-025`・`FR-087`・`FR-060`・`FR-062`・`FR-101`・`FR-096`・`FR-067`・`FR-068`・`NFR-004`）、2 次 49 件。行を数える文は `FR-096`（X-3）・`SX-2`（X-5）・`NFR-004`（変えない —— 母数に `IO-8` が入るのが正しい）。ほかは行 ID で指すので欄の追加に動かない。
  - `FR-096` は要求 9 件・参照 24 か所から指される。どれも媒体の型の禁止を写していない（「媒体」を `docs/spec` で引いて `FR-096` の 1 文だけ）。
  - `RW-7` は `FR-134`・`FR-060`・`FR-096`、`05-07-design.md` の 543 行、`tbl-glossary.md` の `IC-140`、`tbl-published-entries.md` の 53 行 —— どれも `.md` の字を写していない（`IC-140` の札の `.md` は画面の語であり、本書は変えない —— 10 節）。
  - 表 T-229 は `FR-063`・`FR-064`（B 部は仕様を変えないので届かない）。
- 足す辺: `FR-096` → 表 T-024 の 2 つの欄（既に表を指す）、`RW-7` → `IO-8`、`IO-8` → `IC-140`・`RW-6`・`RW-7`、`SX-2` → `IC-2`。消す辺は無い。
- 並んで起草・適用している変更要求との重なり: 同じ行を書くものは無い（`CR-752`〜`CR-758` の本文を「`T-024`」「`FR-096`」「`RW-7`」「`SX-2`」で引いて 0 件。`CR-754`〜`CR-757` は枝 `claude/compassionate-goldberg-0bf1a8` の `6f7c3ac3` で読んだ）。`CR-759`〜`CR-764` の草案は、`4a907919` にもどの枝にも見えなかった —— 調整役が当てる前に測り直す。

---

## 7. 数の予測

- 要求 ±0、表 ±0、図 ±0、`UID` ±0。
- 表の行 +1（表 T-024 の `IO-8`）—— `4a907919` の `check.sh` は `tables=240  figures=30  rows=3269  uids=183`、当てた後の予測は `rows=3270`（ほかは同じ）。表の欄 +2（行の数には数えない）。
- `（MUST）`（`01-04-requirements.md`）: −1（「持ち場は … Framework 層とすること（MUST）」）＋ 0（「それを使うこと（MUST）」を「欄の値で伝えること（MUST）」に替える）＝ −1。`4a907919` で 1812 → 1811。`（MUST NOT）`: ±0（「どの表にも持たせてはならない（MUST NOT）」を「本要求に書き写してはならない（MUST NOT）」に替える）。

---

## 8. 波

### 8.1 幅（`05-working-method.md` の 11 節 —— `src` のファイルで割る）

| 部 | 触る `src` のファイル | 進行中の変更要求と共有するファイル |
|---|---|---|
| A | `file-system-access-file-store.ts`・`delay-diagnostics-report.ts`・`delay-diagnostics-report-window.ts`・`document-file-flow.ts`・`document-codec.ts`（と生成器 2 つ） | 草案の本文で名指すものは 0（`CR-740`・`CR-752`〜`CR-758` を数えた）。⚠️ `CR-763`・`CR-764`（遅延診断へ飛ぶ印と (?)）は本文が見えず、`delay-diagnostics-report.ts` に触れる見込み |
| B | `properties-panel.ts`・`svg-renderer.ts`・`schedule-layout.ts`・`document.ts`・`document-file-flow.ts`・`frame-loop.ts`（と `generate_entity_types.py`・新しい生成器） | `properties-panel.ts`（`CR-754`・`CR-755`・`CR-757`）、`svg-renderer.ts`（`CR-740`）、`schedule-layout.ts`（`CR-756`）、`frame-loop.ts`（`CR-740`・`CR-754`・`CR-757`） |
| C | `task-group-folding.ts` | `CR-767` の C 部の後 |

⇒ A 部は 1 体（＋試験の体 1）。B 部は写しごとにファイルが分かれるので 3 体まで並べられる（`properties-panel.ts` の 3 つ ／ `svg-renderer.ts` の 2 つと `schedule-layout.ts` ／ `document.ts`・`document-file-flow.ts`・`frame-loop.ts` の 3 つ）が、共有するファイルの持ち主の変更要求が合流した後に出す。

### 8.2 順

1. 波 A（A 部）—— `CR-763`・`CR-764` が `delay-diagnostics-report.ts` に触れるなら、その合流の後。仕様（表 T-024・`FR-096`・`RW-7`・`SX-2` を 1 度ずつ）→ 生成器 → `npm run gen` → コード → 試験。
2. 波 B（B 部）—— `CR-740`・`CR-754`〜`CR-757` の合流の後（共有する 4 ファイル）。仕様は変えないので、仕様の波とは独立に回せる。
3. 波 C（C 部）—— `CR-767` が原稿とガードの生成を当てた後。

⚠️ `CR-765` は `WRITTEN_PROPERTIES` を、`CR-579` は `ARMED_BY_ENTRY`・`FONT_SCALE_STEPS` を消す。本書の波と基準線の記録を取り合わない（記録は消した変更要求が抜く）。

---

## 9. 仕様の外で直すもの

- 基準線 2 つの記録（5 節）。
- 規則 `docs/development-rules/03-implementation.md` の生成の定数の一覧（検査 30）。
- 見本は作らない（画面は変わらない）。

---

## 10. ⛔ この変更でやらないこと

- `IC-140` の札の語 `.md`（表 T-109・`RW-3` の `[.md]`）を 表 T-024 から引くこと —— 札は画面の語であり、辞書が持つ（`FR-038`）。拡張子と同じ字であるのは偶然ではないが、語を拡張子から作る規則は今の仕様に無い。
- `RW-15`（直す前の控え）の拡張子 —— `IO-2` の `.json` であり、既に 表 T-024 から引いている（`FR-096` の定め）。
- `ARMED_BY_ENTRY`・`FONT_SCALE_STEPS`（`CR-579`）と `WRITTEN_PROPERTIES`（`CR-765`）。
- 偶然の写し 3 つ（`CALENDAR_CONSUMED`・`COLOR_FORM_OF_COLUMN`・`KEY`）—— 検査 69 の基準線が偶然と書く。

---

## 11. 利用者に問うこと

無い —— 向きは `JDG-2163` が決めた。欄の名と値の置き方は ③ に書いた（`JDG-1696` に従い推奨を取った。覆してよい）。

---

## 12. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `defects.md` | `DFC-2645` の対応方針の欄の頭に「指示 —— `CR-768` が当てる（`TASK_GROUP_GUARDS` は `CR-767` の後、`WRITTEN_PROPERTIES` は `CR-765`、`ARMED_BY_ENTRY`・`FONT_SCALE_STEPS` は `CR-579`）」を書いた（本書の起草と同じコミット）。ステータスは `仕様待ち` のまま |
| `rulings.md` | `JDG-2163` の状態の欄を「指示 —— `change-request/CR-768-the-save-chooser-media-types-live-in-table-t-024-and-hand-copies-become-generated.md` が当てる」にした |
| `changelog.md`・`perf-pending.md` | 当てる体が番号を受ける（`perf-pending` は要らない見込み —— 5 節） |

---

## 13. 測り方の再現

```
git grep -c "CR-768" 4a907919 -- change-request docs src tests previous-project-result tools   # 0 件
git grep -n "JDG-222[0-9]\|DFC-272[0-9]\|PND-9\(4[89]\|5[01]\)" 4a907919 -- docs change-request # 0 件
grep -n "^| IO-" docs/spec/01-04-requirements.md                                               # IO-1〜IO-7
grep -n "媒体" docs/spec/*.md docs/spec/_assets/*.md                                            # FR-096 の 1 文だけ
sed -n 100,111p src/framework/file-system-access-file-store/file-system-access-file-store.ts   # 6 組
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-literal-restatement.py      # 16 records
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-024 FR-096 RW-7 RW-6 IC-140 FR-134 T-229 ED-1 SX-2
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py <6 節の 16 対象>
grep -o "（MUST）" docs/spec/01-04-requirements.md | wc -l                                       # 1812
```

---

## 14. 利用者の実物の手順と見積り

- 実物の手順（調整役へ送る —— 利用者に直に頼まない）: ① 書き出し（`IC-2`）を押し、選択面に 5 つの形式が今と同じ順で並び、Markdown が無いこと。② 遅延診断を出して `[.md]`（`IC-140`）を押し、保存の選択面の種類が `.md` 1 つであること。③ 単一 `.html` と SVG を書き出し、選択面の種類が `.html` 1 つ・`.svg` 1 つのままであること（`JDG-1165` が戻っていない）。
- 見積り（当てる側）: A 部 —— 仕様 1 時間、生成器 2 時間、コード 1.5 時間、試験 1.5 時間。B 部 —— 生成器 1.5 時間（根の鍵・表 T-229）、コード 2 時間（9 つ）、検査と基準線 0.5 時間。C 部 —— 0.5 時間（`CR-767` の後）。`check.sh` と全試験 1 時間 —— 計 11.5 時間ほど。
