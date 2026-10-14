# CR-748 —— ヘルプの基本操作の塊の上に、GRS の概要紹介の頁へのリンクを置く

> 起草の状態: **当てた**（2026-10-14、調整役が示した基点 `e4d07fdb` の上、枝 `cr-748-help-about-link`）。仕様・生成器・src と、既存の試験の組み立ての見本 2 本（新しい項目 `aboutLink` を足しただけ）を当て、仕様だけを読む体が試験 `tests/unit/cr-748-help-about-link.test.ts` を書いた。`dist` の作り直しと `GT-2` は調整役が行う。
> 下書きは `ac5d5bd0` の上で起こした。基点で 0.1 の 5 行を引き直し、どれも成り立った（`helpLegalElement`・`linkedWordsOf`・`helpHeadings` の `basics`・頁の `?lang=`・`CN-6`）。
> ID の帯: 番号 `CR-748`、変更履歴 `4.57`、裁定 `JDG-2028`〜`JDG-2033`、台帳 `DFC-2510`〜`DFC-2512`、`perf-pending` `197`、設定の行 `S-583`（調整役が確かめた）を受けた。使ったのは `CR-748`・`4.57`・`JDG-2028`〜`JDG-2033`・`197`・`S-583`。台帳の行は使っていない（新しい欠陥は無い）。`ac5d5bd0` の木で `CR-748` を名乗る変更要求は 0 件、`JDG-2028` は 0 件、変更履歴の `4.57` の行は 0 件だった。
> 当てるもの: `JDG-2028`（リンクの場所）・`JDG-2030`（リンクはヘルプの言語で頁を開く）・`JDG-2032`（en の語「About GRS」）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`ac5d5bd0`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| ヘルプはすでに押せるリンクを持つ | `src/framework/dom-screen-surface/open-modals-drawing.ts` の `helpLegalElement` は、著作権表示を `linkElement` で `S-459` へのリンクにする。脚注 ※1 は `src/adapter/screen-renderer/notices.ts` の `linkedWordsOf` が `{downloadUrl}` に `S-350` を差し込む | 新しいリンクも同じ `linkElement` で描く（X-5） |
| 塊の見出しは辞書が持つ | `docs/spec/_source/display-words.json` の `helpHeadings` は `basics` を先頭に 6 つの塊を持ち、`src/adapter/screen-renderer/open-modals.ts` の `HELP_HEADINGS_BY_BLOCK` が読む | リンクは `basics` の見出しの上に置く（X-4） |
| 頁は言語の指定を受け取れる | `docs/about/index.html` は `?lang=ja` / `?lang=en` を読み、無ければ覚えた言語、それも無ければブラウザの言語で開く（`JDG-2031`、本書と同じ枝のコミット） | リンクに `?lang=` を付ける（X-3） |
| 押したリンクは外部通信に当たらない | 表 T-003 の `CN-6` の ⚠️ と `FR-073`: 人が押したリンクで閲覧環境が別の頁を新しいタブに開くのは、成果物の通信ではない | 新しいタブで開く（X-5） |
| ⚠️ ヘルプは `main` の外で変わっている | `integ/coord-1011` は `CR-710`〜`CR-744` を持ち、ヘルプの `MK-17` を変える（調整役の報告） | 当てる前に、基点で 0.1 の 4 行を引き直す（7 節） |

### 0.2 裁定の鎖（`rulings.md` を「紹介」「about」「ヘルプ」「リンク」「S-459」「S-350」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1990` | 紹介頁は `docs/about/index.html` に置き、公開の `/about/` で開く | リンクの宛先 |
| `JDG-1991`・`JDG-2029` | 英語版は同じファイルの中で切り替える | 頁が 1 つなので、言語は `?lang=` で渡す |
| `JDG-2028` | ヘルプの基本操作の塊の上に「GRS の概要紹介」のリンクを置く | X-1〜X-5 |
| `JDG-2030` | リンクはヘルプの言語で頁を開く（推奨どおり） | X-3 |
| `JDG-2032` | リンクの en の語は「About GRS」（推奨どおり） | X-2 |
| `JDG-1589`〜`JDG-1590` | 入手の頁の所は `S-350` が持ち、語には書き写さない | X-1 の前例 |

覆す裁定は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-4` / `GL-006`（マニュアルを読まずに使える）—— ヘルプは、どこに何が在るかを 1 画面で見渡す道である（`FR-036`）。GRS 自体の概要もそこから 1 回押せば届く。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 頁の所は設定の行 1 つが持ち、辞書の語には書き写さない（`S-350` と同じ扱い）。
- `R2.22`（名は指すものを言う）—— 設定の行の鍵と辞書の鍵は「概要紹介の頁」を名乗る（X-2 の案）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 頁の所は `_assets/tbl-settings.md` の 表 T-206 の新しい行 `S-583` が持つ。値は `https://goodrelax.github.io/gr-scheduler/about/` | `S-350`・`S-459` と同じ置き場。`JDG-1990` が公開の所を決めた | 無い —— `S-583` は `e4d07fdb` の表 T-206 の最大 `S-582` の次で、調整役が確かめた |
| X-2 | リンクの語は辞書に足す: ja「GRS の概要紹介」（`JDG-2028` の語）、en「About GRS」 | 画面の語は辞書だけが持つ（`FR-038`） | 無い —— en の語は利用者が `JDG-2032` で選んだ |
| X-3 | リンクの宛先は、X-1 の所に `?lang=` とヘルプの言語（`ja` / `en`）を付けたもの | `JDG-2030` | 無い |
| X-4 | リンクはヘルプの本文の、`basics` の塊の見出しのすぐ上に 1 行で置く。凡例とタイトルバーには置かない | `JDG-2028` の「基本操作ブロックの上」 | 無い |
| X-5 | 押したら閲覧環境の新しいタブで開く。描き方は著作権表示と同じ `linkElement` | `FR-069` の著作権表示・表 T-349 の `BR-4` と同じ作法 | 無い |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| ヘルプの基本操作の塊の上 | 何も無い | 「GRS の概要紹介」（en「About GRS」）のリンクが 1 行 |
| リンクを押す（ヘルプが日本語） | —— | 新しいタブで `…/about/?lang=ja` が開く |
| リンクを押す（ヘルプが英語） | —— | 新しいタブで `…/about/?lang=en` が開く |
| ネットワークが無い | —— | 閲覧環境が開けないと告げる。`GRS` は何も送らず、何も取得しない（`CN-6`） |

---

## 2. 新しい識別子

| 種類 | 識別子 | 中身 |
|---|---|---|
| 設定の行 | `S-583` | 概要紹介の頁の所。`https://goodrelax.github.io/gr-scheduler/about/` |
| 辞書の組 | `helpLinks`（鍵は `link`）の `about` | ja「GRS の概要紹介」／en「About GRS」。組は `tools/generate_display_words.py` の `HELP_LINKS` が持つ（表の行ではないので、`HELP_LEGAL_PARTS` と同じく生成器が持つ） |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

無い —— 足すだけである。

---

## 4. 書き直す所

| 所 | 書き直し |
|---|---|
| `docs/spec/01-04-requirements.md` の `FR-036` | 「ヘルプは、`basics` の塊の見出しのすぐ上に、概要紹介の頁（表 T-206 の `S-xxx`）へのリンクを 1 行置くこと（MUST）。宛先はその所にヘルプの言語を `?lang=` で付けたものとし、押したら閲覧環境の新しいタブで開くこと（MUST）」を足す。理由: 利用者が `JDG-2028`・`JDG-2030` で定めた |
| `docs/spec/_source/settings.json` | X-1 の行を `S-350`・`S-459` の隣に足す（生成物 `_assets/tbl-settings.md` を作り直す） |
| `docs/spec/_source/display-words.json` | X-2 の組 `helpLinks` を `helpFootnotes` の次に足す |
| `tools/generate_display_words.py` | `HELP_LINKS` と、名簿・形・並びの 3 か所に `helpLinks` を足す |
| `tools/generate_entity_types.py` | `NOT_STORED_ABOUT_ADDRESS`（`S-583`）を足し、`open-modals.ts` に生成の区画を置く |
| `src/adapter/screen-renderer/screen-renderer.ts` | `HelpLink` の型と、`HelpModal` の `aboutLink` を足す |
| `src/adapter/screen-renderer/open-modals.ts` | `helpAboutLink` が語と宛先（X-3）を作り、`helpModalFromSession` が `aboutLink` に置く |
| `src/framework/dom-screen-surface/open-modals-drawing.ts` | `helpAboutLinkElement` が `linkElement` でリンクの 1 行（`data-help-link="about"`）を描き、`helpColumnsElement` が `basics` の塊の枠の直前に置く |
| `tests/unit/uf-71.test.ts`・`tests/unit/uf-72-screen-part.test.ts` | ヘルプの面の見本に `aboutLink` を足す（型が求める。見ることは変えない） |
| `docs/development-records/changelog.md` | `4.57` の行 |
| `docs/development-rules/03-implementation.md` | 生成する定数の一覧に `NOT_STORED_ABOUT_ADDRESS` を足す（検査 30） |
| 生成物 | `_assets/tbl-settings.md`・`_assets/tbl-row-id-prefixes.md`・`docs/review/public-entry-index.md`・`docs/development-records/test-inventory.md` を作り直す |
| `perf-pending` | `197` の行（語と設定の名簿を画面が読む） |

---

## 5. 試験

- 書くのは、仕様だけを読む別の体（`docs/development-rules/05-working-method.md` の分業。書いた者に試験を書かせない）。
- 見ること: ヘルプを開くとリンクが `basics` の塊の見出しより上に 1 つだけ在る／語がヘルプの言語の辞書の語である／宛先が `S-xxx` の値に `?lang=<ヘルプの言語>` を付けたものである／新しいタブで開く（`target="_blank"`）。
- ヘルプの言語を切り替えたら、語と宛先の `lang` が両方とも変わる。

---

## 6. 影響

- `impact.py FR-036`（`e4d07fdb`）: 要求 17 件・参照 66 箇所が `FR-036` を指す。本書は `FR-036` に 1 文を足すだけで、ほかの文を変えないので、指す側の読みは変わらない。
- `impact.py S-583`: 指すのは `FR-036` の 1 箇所だけ。
- 画面の語が 1 つ増えるので、ヘルプが 1 画面に収まるか（`FR-036` の ⭐ 「ヘルプを 1 画面に収める」）を基点のビルドで確かめる。

---

## 7. 当てる順

1. 調整役が示す基点から枝を切り、0.1 の 5 行を引き直す（`MK-17` の変化を含む）。
2. 仕様（4 節の仕様の行）→ `npm run gen` → 生成物の差分を読む。
3. src（4 節の src の行）。
4. 仕様だけを読む体が 5 節の試験を書く。
5. `check.sh` を exit 0 にし、個人情報の件数を数えて、調整役へ sha を送る。`dist` の作り直しと `GT-2` は調整役が行う。

---

## 8. 衝突の確認（`ac5d5bd0`）

| 識別子 | 木の中の件数 |
|---|---|
| `CR-748` | 0 |
| `JDG-2028`〜`JDG-2033` | 0 |
| 変更履歴 `4.57` | 0 |
