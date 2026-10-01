# CR-606 — プロパティパネルは、タスク・マイルストーン・依存線ごとに行を出し分け、色と担当者を 1 つずつの入力で選ばせる

> 起草の状態: 当てた —— 8 節の**波 1（仕様の文）だけ**（2026-10-01、枝 `spec-pass-1001`、仕様の通し。`061a7f8c` の上）。E-01 〜 E-09・E-12・E-13・E-15・E-16・E-19・E-20・E-24・E-25・E-29 〜 E-37 と、E-26 の行 33・34（`PR-22`・`PR-25` の備考）を当て、`npm run gen`・`npm run gen:components` を打った。⛔ 波 2・3 の原稿の編集（E-10・E-11・E-14・E-17・E-18・E-21 〜 E-23・E-26 の残り・E-27・E-28）は当てていない —— 読む側のコードと同じ巡で当てる（規則 02 の 3.5: `heldByOf` は知らない行で投げ、`lineWeight` の改名は生成される型を変える）。⇒ 生成器（`tools/generate_property_items.py`・`generate_display_words.py`・`generate_startup_template.py`）にも触れていない。旧はどれも 1 回で当たった（CR-603 〜 CR-605 が変えた文に載るものは無い）。⚠️ 新を当てた字面に揃えたもの: E-01（まだ無い行 `PR-40` を名指すと検査 7 が赤 ⇒ 行 ID を落とした）・E-02 の末行と E-04（`CL-2`）・E-16（`S-374` の注）・E-24（`VG-5`）（検査 11 の新しい重複 ⇒ 言い直した）・E-31（1 行の末に改行の 2 つの空白を足した）・E-33（`erd.schema.json` は `transparent` に `false` しか許さず「無い ＝ 取る」⇒ 鍵を消した）。E-29 は `settings.json` で 19 回（`CR-605` の `S-450` の注が 1 回足した）。行 ID は `PR-<新1>` 〜 `PR-<新11>` → `PR-34` 〜 `PR-44`（本書の中だけ。表 T-016 には波 2 が足す）。検査 37 の対応表に `PR-22`・`PR-25`・`K-60`・`IC-17`・`IC-123`・`IC-124`・`IV-9` の指紋を登録した（対を読んでから）。
> 読んだ木: `b2-panel-crs` の `0590ad03`（`refactor`）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から受けた（B2: CR-606..609）。⭐ 本書が作る仕様の行 ID は表 T-016 の 11 行だけで、番号は仮（`PR-34` 〜 `PR-44`）とする（2 節）。
> ⛔ 当てる順: `CR-606` → `CR-607` → `CR-609` → `CR-608`。本書は先頭であり、後の 2 つは本書の新しい文の上に載せ直す（「重なり」の節）。
> 閉じるもの: `DFC-1329`・`DFC-1330`・`DFC-1331`・`DFC-1332`・`DFC-1333`・`DFC-1334` と、畳む `DFC-565`・`DFC-1012`（12 節）。
> 並べ方の見本: `previous-project-result/25-colour-input-layout/index.html`（別の体が作っている。本書は書かない）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定の逐語（`docs/development-records/rulings.md` から写した）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-859` | 「#10 マイルストーンの依存関係がプロパティーパネルに表示されない。<br>依存先タスクのタスク名とUIDを書け」 | 表 T-016 に読むだけの先行・後続の行（`PR-37`・`PR-38`）と、依存線の行（`PR-41` 〜 `PR-44`） |
| `JDG-860` | 「#11 タスクやマイルストーンのプロパティーパネルで現在<br>名称<br>となっている部分は<br>タスク名 / task name<br>マイルストーン名 / milestone name<br>とせよ。 ただし、データの識別子はMSPDIに合わせろ。<br>名称だけだと何の名称か分からない。<br><br>その下にタスクIDを入れろ。 一旦今は表示のみでOK。」 | `PR-1` の語を種類で分ける（E-02・E-17）。識別子は `name`（`Task/Name`）のまま。下に読むだけの `uid` の行（`PR-34`） |
| `JDG-861` | 「#12 プロパティーパネルで担当者名の表示がおかしい。<br>複数の担当者を入力するとき、なぜか2種類の入力方法があり、1つはまともに動かないで無駄に枠だけ増える。<br>担当者名を入力するとき、ドロップダウンだけでなく、昇順/降順ソートと部分一致検索を可能とせよ。」 | `AS-5` を 1 つの組み合わせの入力に書き換える（E-07） |
| `JDG-862` | 「#13 プロパティーパネルでタスクに対してマイルストーン形状を選択可能としている。<br>同じくマイルストーンなのに開始日/終了日の両方(つまり期間)を入力できる。これはダメ。<br>マイルストーンは予定日/実績日だけを入力させろ<br>タスクとマイルストーンでプロパティーの構成を変えろ。」 | 表 T-016 の新しい欄 `出す種類`（`shownFor`）と、マイルストーンの予定日・実績日の行（E-02・E-26） |
| `JDG-863` | 「#14 プロパティーパネルの色の入力が分かりにくい。 以下のように直せ。<br> fill color    Light: □/ Dark: □       塗塗潰し色<br>               [project theme color]     プロジェクトテーマ色<br>               □□□□□<br>               □□□□□<br>               [nofill][custom]          塗潰しなし/その他の色<br> outline color Light: □/ Dark: □       枠線色<br>               [project theme color]     プロジェクトテーマ色<br>               □□□□□<br>               □□□□□<br>               [noline][custom]          線なし/その他の色<br> outline width [1～10]px                 枠線幅」 | `CV-9` の並びを覆す（E-05）。`PR-12` を塗り・枠線の色・枠線幅の 3 行に割る（E-26）。`lineWeight` を `strokeWidthPx` へ（E-14） |
| `JDG-864` | 「#15 設定のプロパティーで現在テーマの色相となっている部分はテーマ色とせよ<br><br>これらの変更にともなって、各種変数名オブジェクト名などの識別子の名称も<br>GRS JSONのスキーマ含めて仕様・コードすべて見直せ。<br>他の識別子と干渉しないか確認し、干渉する場合は複数の案を挙げて比較検討し、最適案を根拠と共に示せ。<br>GRSのJSONのスキーマが変わる場合、まだ正式運用していないので過去の版との互換性を考慮する必要はない。」 | 語だけ「テーマ色」（E-29）。識別子の表は 0.3 節 |
| `JDG-990` | 問い 1: **「塗潰し色<br>ライト:□ (テーマ)  / ダーク: □ (テーマ<br>と言いう表記にしろ。 (テーマ)はテーマ色解いて選んだ時に出す。 □はテーマの色でぬる。」** と **「(b) 2 行に折れてよい」** ／ 問い 2: **「B. ハイライトボックスの枠 透明の線ってつかめないの？」** と **「(i) タスクと同じ規則で「線なし」を置く」** ／ 問い 3: **「「塗潰しなし」と「プロジェクトテーマ色」分けて考えろ。  塗潰しなしは、背景の色になるんだぞ？」** ／ 問い 4: **「「既定の色」に変える」** ／ 問い 5: **「枠線幅を実績バーの縁にも掛ける」** ／ 問い 6: **「ボックスの欄の並び順: 提案通りでOK。」**（2026-10-01。見本 `previous-project-result/25-colour-input-layout/`（`bf7e96dc`）を見せた別のセッション「Show the colour-input sample to the user (B2)」が問い、答えを逐語で B2 へ返した。番号は調整役が次の調整役の控え 990〜999 から割り当てた） | 0 節 ③ の裁定 3 〜 8（「JDG-990 の問い n」） |
| `JDG-922` | 「他は、全部推奨どおり」 | 上の 6 つの台帳の行の推奨をすべて採る（#10: 先行と後続の両方 ／ #11: `uid` を「UID」で ／ #12: 「“xxx” を追加」を選んだときだけ人を作る ／ #13: 残す行と外す行 ／ #14: 1〜10px、細・中・太は 1・2・3px ／ #15: 語だけ、`themeHue` は据え置き、線の幅だけ `strokeWidthPx`） |

⚠️ 覆す裁定: `JDG-383`・`JDG-405`（色の欄の 2 段目を [任意] [透明] [テーマ] とした並び）を、新しい `JDG-863` が覆す。`JDG-456`・`JDG-464`（ボックスの列）の並びと範囲のうち、範囲の上限 8 だけを `JDG-922` の #14 が覆す。ボックスの行の並びは覆さない（`DFC-1412` へ —— JDG-990 の問い 6）。⚠️ `FR-019` の「ハイライトボックスの枠の線に透明を選ばせてはならない（MUST NOT）」と、起草のときの決定 11 は、JDG-990 の問い 2 が覆す。

### 0.2 調べた結果（`0590ad03`）

1. **表 T-016 は 27 行・6 列で、原稿は `docs/spec/_source/property-items.json`**（生成は `docs/spec/_source/property_items_json_to_md.py`、`src` への写しは `tools/generate_property_items.py`）。`対象` の欄は `Task`・`TaskGroup`・`CommentBox`・`HighlightBox` の 4 値で、`Task` の行 15 行はタスクとマイルストーンを分けない。
2. **依存線の項目は表に無い。** `FR-009`（`01-04-requirements.md:2748`）が「表 T-016 は `Task` の属性表であり依存線の行を持たない」と書き、コードが手で並べる（`src/adapter/screen-renderer/properties-panel.ts` の `DEPENDENCY_ITEMS`・`SUCCESSOR_ROW = 'FR-009'`・`dependencyFields`。4 つとも `isEditable: true` —— `DFC-565`）。種別は略号で出す関数（`dependencyText`）があるが、欄の名は列名のまま（`DFC-1329`）。
3. **マイルストーンの正は `Task.milestone`**（表 T-005 の `G-1`、`AT-30`）。形（`shapeKind`）は `FR-083` がタスクとマイルストーンのあいだで変えさせない。
4. **マイルストーンの予定日と実績日は、今ある命令で書ける。** 予定日は `CM-11`（`setTaskPlanDates`、開始と終了を 1 つの命令で持つ）に同じ日を 2 つ渡す。実績日は `CM-13`（`setTaskPlanActualState`、予実の 5 列）で 表 T-019 の `PA-5`（完了: `actualStart` ＝ `actualFinish`）か `PA-1`（未着手）に置く —— `FR-011` が「マイルストーンの実績の終了日は `actualStart` と同じ日」と書き、`PV-5` が同じ置き方をする。⇒ 新しい命令は要らない。
5. **`lineWeight`（`AT-104`、列挙 3 値）は描かれていない。** `src/adapter/svg-renderer/schedule-task-figures.ts` の `paintOf` の 2 つの呼び手は、予定も実績も `settings.planStroke`（表 T-201 の `S-39`、1px）で描く。`lineWeight` を読むのは型・スキーマ・命令・欄だけである。⇒ 置き換えても描いた絵は変わらない（`null` のまま）。
6. **`S-39` は形の幾何にも入る** —— `FR-094` の 表 T-259 の `VG-5` が「枠線（`S-39` に描く比を掛けた太さ）」の外側の縁で隙間を測り（`JDG-160` の b「バーの枠線の外側から測る」）、`src/entity/layout-engine/schedule-layout/shape-cross-sections.ts` と `schedule-geometry/dependency-route.ts` が `planStroke / 2` を使う。⇒ タスクごとの太さは幾何にも届かせる（決定 6）。
7. **ボックスの枠の太さの上限 8 は生成された定数である**（`properties-panel.ts`・`edit-annotation.ts`・`highlight-box.ts` の `NOT_STORED_ANNOTATION_BOUNDS` は `// </generated>` の区画）。⇒ `settings.json` の 2 セルと `npm run gen` で届く（生成器の群は既にある）。
8. **担当者の欄は 1 人につき 2 つの器を持つ** —— `src/framework/dom-screen-surface/properties-panel-drawing.ts` の `fieldElement`（`<select>`）と `searchElements`（`datalist` 付きの字の欄）。字の欄の確定は `src/adapter/input-command-translator/field-commit.ts` の `commandsFromAssigneeField` が名簿に無い名から `CM-40` を出す。
9. **「テーマの色相」は `docs/spec` の手書きの原稿に 39 回・37 行、生成物に 20 回**（手書きの原稿: `01-04-requirements.md` 14・`tbl-glossary.md` 3・`display-words.json` 2・`erd.json` 1・`row-id-prefixes.json` 1・`settings.json` 18。生成物: `fig-erd-detail.md` 1・`tbl-row-id-prefixes.md` 1・`tbl-settings.md` 18）。`tbl-glossary.md` は生成物ではない（冒頭に「本書が用語の正である」、生成器の出力先に無い）。`src`・`tests` にも 11 回（うち 8 回は仕様の文を引く試験）。
10. **検索パネルの絞り込み（`SV-7`・`SV-8`）は作られていない**（`DFC-1362`。`search-table-filters.ts` は `export {}` だけ）。共有できるのは「比べ方」と「並べ替えの入口」であり、器は違う（検索は複数選び・印・すべて入れる／外す。担当者は 1 つ選び・足す項目）。⇒ 1 つの器として仕様に書くほど綺麗な単位ではない（決定 9）。

### 0.3 識別子の表（`DFC-1334` の推奨。`JDG-922` の #15 が採った）

| もの | 画面の語（ja ／ en） | 識別子 | 決め手 |
|---|---|---|---|
| テーマの色相の欄 | テーマ色 ／ theme colour（利用者の答え（2026-10-01、JDG-966）） | `themeHue`（`AT-19`・`K-60`・`S-73`）据え置き | 値は本当に色相 0〜359。`themeColor` にすると、ほかの `*Color` が色の綴り（表 T-294 の名か `#rrggbb`）を持つのと割れる |
| 名の欄 | タスク名 ／ task name、マイルストーン名 ／ milestone name | `name`（`AT-27`、MSPDI `Task/Name`）据え置き | マイルストーンに別の要素は無い |
| 出し分けの欄 | 出す種類 | 表 T-016 の列 `shownFor`（`task` ／ `milestone` ／ `both`） | 案 A（`DFC-1332`） |
| 塗りの色 | 塗潰し色 ／ fill colour | `fillColor` 据え置き（`TaskVisual`・`CommentBox`・`HighlightBox` で同じ） | 3 つの実体で同じ名 |
| 枠線の色 | 枠線色 ／ outline colour | `strokeColor` 据え置き | 同上 |
| 枠線の太さ | 枠線幅（px） ／ outline width (px) | `lineWeight` → **`strokeWidthPx`**（`AT-104`）、命令 `setTaskVisualLineWeight` → **`setTaskVisualStrokeWidth`**（`CM-24`） | ボックスの `strokeWidthPx`（`AT-145`・`AT-149`）と命令 `setHighlightBoxStrokeWidth`（`CM-77`）・`setCommentBoxStrokeWidth`（`CM-81`）と同じ名と単位 |
| ID の欄 | UID ／ UID | `uid`（`AT-24`、MSPDI `Task/UID`）据え置き | `Task/ID`（`DV-4`）は書き出しの順で変わる |

⚠️ 干渉の確かめ: `strokeWidthPx` は `TaskVisual` に無く（`erd.json` の `TaskVisual` の列は `taskUid`・`shapeKind`・`milestoneGlyph`・`fillColor`・`strokeColor`・`lineWeight`）、ボックスの同名の列と意味・単位が同じ。`setTaskVisualStrokeWidth` は 表 T-108 に無い。`shownFor`・`oneInput`・`milestoneLabel` は `_source` の原稿に無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— 利用者が `dist/index.html` を使って挙げた 6 項目（#10 〜 #15）はどれも「読めない・迷う」である: 「名称」が何の名か分からない、担当者の器が 2 つある、マイルストーンに期間を打たせる、色の並びが分かりにくい、「テーマの色相」という語。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— ① `FR-009` は「編集できるのはラグ」「取り込んだ種別は書き換えてはならない（MUST NOT）」と書き、`UC-004` の手順 5 は「種別だけを選ぶ入口は設けない」と書くが、`DFC-1012` の期待値は「その 4 つから選ばせること」と書く ⇒ 仕様の側（読むだけ）に揃え、`DFC-1012` の「選ばせる」は採らない（決定 4）。② 依存線の項目の正がコードの手書きの表（`DEPENDENCY_ITEMS`）にしか無い ⇒ 表 T-016 の行にする（E-09・E-26）。③ `CL-2`「細 / 中 / 太」と `AT-104` の列挙が同じ値を 2 か所で持つ ⇒ 範囲を `AT-104` の 1 か所に置き、`CL-2` は指す（E-04）。
- **`R1.5`（MECE）** —— 表 T-016 の `Task` の行を `出す種類` で 3 つに分ける。`task`・`milestone`・`both` の 3 値でどの行も 1 つに入る。`Task` でない行は欄を持たない（生成器が拒む）。
- **`R1.6`（否定要求は代替を示す）** —— `AS-7` の「打っただけの字で作ってはならない」には、足す項目を選ぶ道を `AS-5` に置いた。
- **`R4.3`（原子性）** —— マイルストーンの予定日・実績日は 2 列を 1 つの命令（`CM-11`・`CM-13`）で書き、開始と終了がずれた途中の状態を作らない。担当者を足すときの `CM-40`・`CM-44`（・`CM-45`）の 1 回の呼び出しは今のまま（表 T-225 の下の段）。
- **`R2.1`（命名）** —— 0.3 節の表。`strokeWidthPx` と `setTaskVisualStrokeWidth` はボックスの先例と同じ形。
- **`R2.7`（DRY）・`R2.21`（1 つの仕事は 1 か所）** —— 部分一致の比べ方を `SV-4` の 1 か所に置き、担当者の欄はそれを指す（E-07）。並べ替えの入口は `IC-123`・`IC-124` の 2 行を 2 つの面で使う（`IC-52` と同じ形。E-12・E-13）。
- **`R2.9`（YAGNI）** —— 依存線の種別を選ぶ器・命令を作らない（決定 4）。検索と担当者の器を 1 つに畳む抽象を仕様に書かない（決定 9）。

### ③ 利用者に問わずに決めたこと

⭐ **利用者が答えたこと（起草の後、2026-10-01。台帳の行はセッションが起こす）** —— 下の 2 つは問わずに決めたものではなく、答えを受けて本書に当てたものである。

| # | 答え | 本書での扱い |
|---|---|---|
| 裁定 1 | 利用者の答え（2026-10-01、JDG-965）: 起草のときの 11 節の問い 1 に「出す」（案 A） —— 「“xxx” を追加」は、打った字と**等しい**名の担当者がいないときに出す（一部に当たる候補が在っても出す） | E-07（`AS-5`）の「打った字と等しい名の担当者がいないときは、候補の末尾に … 足す項目を 1 つ出すこと（MUST）」、5 節の継ぎ目、決定 8・決定 10 はこの答えに従う |
| 裁定 3 | JDG-990 の問い 1: 色の欄は欄名を 1 行に置き、その下に「ライト: □ (テーマ) / ダーク: □ (テーマ)」。「(テーマ)」はテーマ色を選んだときだけ出し、□ はテーマの色で塗る。狭いときは 2 行に折れてよい | E-05（`CV-9` の ⓪・① と `null` の印・2 行）、E-30（`FR-006` の項目名の例外）、E-28（辞書の `themeMark`） |
| 裁定 4 | JDG-990 の問い 2: ハイライトボックスの枠にもタスクと同じ規則で「線なし」を置く（透明の線でも掴める） | E-05（`CV-9`）・E-31（`FR-019`）・E-32（`HB-12`: 掴み代は線の色によらない）・E-33（`AT-121`）・E-26（`PR-22`）・E-37（`IV-9`、決定 14） |
| 裁定 5 | JDG-990 の問い 3: 塗潰しなし（背景が見える）とプロジェクトテーマ色（テーマの色で塗る）を別の値にする | 決定 13。E-31・E-34（`AT-146`）・E-35（`S-370`）・E-36（表 T-217 の結び）・E-26（`PR-25`） |
| 裁定 6 | JDG-990 の問い 4: 色相に従わないボックスの枠の既定の値のボタンは「既定の色」（en: Default colour） | E-05（`CV-9` の ② の語の規則、決定 15）、E-28（`defaultColour`・`defaultMark`） |
| 裁定 7 | JDG-990 の問い 5: 枠線幅は実績バーの縁にも掛ける | E-14（`AT-104` の意味）、E-26（`PR-40`）、5 節 |
| 裁定 8 | JDG-990 の問い 6: ボックスの欄の並びは別の変更要求で揃える | `DFC-1412`（10 節） |
| 裁定 2 | 利用者の答え（2026-10-01、JDG-966）: 「en も theme colour に」 —— en の語も変える。識別子 `themeHue` は据え置く | E-29 が en の「theme hue」6 回（手書きの原稿）と `K-60` の en の語（`themeHue` → `theme colour`）も書き換える。綴りは辞書の英語の文に合わせて `colour`（決定 12） |

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | マイルストーンかどうかは `Task.milestone` で決める。形（`shapeKind`）では決めない | 表 T-005 の `G-1`・`AT-30`・`FR-009` の「本段の『マイルストーン』は `Task.milestone` が真の `Task`」 | 取り込んだ文書で `Task.milestone` と形が食い違えば、欄は `Task.milestone` に従う |
| 決定 2 | `PR-1` は割らず、辞書の `properties` の項に `milestoneLabel` を足して名を種類で変える。予定日・実績日は行を分ける | `PR-1` は状態機械（`fieldEditStateMachine` の `fieldRow`）・`FR-001`・`FR-091`・`FR-016` が名指す。割ると 7 か所の `fieldRow` と要求 3 つが動く。日付は器の数が違う（2 つ → 1 つ） | `FR-006` の「名は行に 1 つ」に 1 つの例外（E-02） |
| 決定 3 | マイルストーンからは `JDG-922` の #13 の「残す」に無い行を外す: 実績の開始・期間・終了（1 つの実績日へ）、完了率（`PR-9`）、再開の 2 行、フェード。UID と先行・後続の行は両方に出す | #13 は残す行を列挙している。完了率は実績日から 0 か 100 に決まり、読む値を足さない。UID と依存は `JDG-859`・`JDG-860` が両方に求める | マイルストーンで完了率を読むことはできない |
| 決定 4 | 依存線の種別と両端は読むだけ。編集できるのはラグだけ | `FR-009`・`UC-004` の手順 5・表 T-108 に命令が無い（`DFC-565` の決定仕様） | `DFC-1012` の期待値の後半（4 つから選ばせる）を採らない |
| 決定 5 | タスクの枠線幅の `null` は `S-39` の太さで描き、新しい設定値の行を作らない。範囲 1〜10 は `AT-104` に置く（`grs-document.schema.json` の `minimum`・`maximum` になる） | 今の絵は `S-39` で描いている（0.2 節の 5）。`FR-006` が「数値の下限と上限は `grs-document.schema.json` が持つ」と書く（ボックスの列だけが 表 T-217 の例外） | ボックスは範囲が 表 T-217 に、タスクは `AT-104` に在る —— 2 か所だが、それぞれ `FR-006` の定めた置き場 |
| 決定 6 | タスクの枠線幅は描く太さだけでなく幾何（`VG-5` の描いた端）にも届かせる | `JDG-160` の b「バーの枠線の外側から測る」は裁かれた行であり、太い枠線を幾何に入れないと外側の縁が隣の形に食い込む | 幾何の 2 ファイル（`shape-cross-sections.ts`・`dependency-route.ts`）がタスクごとの太さを読む |
| 決定 7 | 変更前の予定の輪郭（`BL-3`）は `S-39` のまま。今の予定の枠線幅を継がない | 変更前の輪郭は今の予定の見た目ではない（色も `S-443` の固定色） | 太い枠線のタスクでは、変更前の輪郭が今の輪郭より細い |
| 決定 8 | 担当者の欄の確定（何も強調せずに `Enter`、`IN-6` の外の押下）は、等しい名があればそれを選び、無ければ何も書かない。打った字は残らない | `JDG-922` の #12「選んだときだけ人を作る」。`IN-6` の「確定すること」は等しい名を選ぶことで果たす | `IN-6` の「打った内容が押下 1 つで消えてはならない」の例外になる（`AS-5` に書く） |
| 決定 9 | 検索パネルと担当者の欄は、比べ方（`SV-4`）と並べ替えの入口（`IC-123`・`IC-124`）を共有し、器は共有しない | 0.2 節の 10 | コードで候補を絞って並べる純関数を共有するのは実装の選択（9 節） |
| 決定 10 | 候補は名の昇順から始め、向きは覚えない。同じ名は `uid` の昇順。足す項目は候補の末尾 | 表示だけの選択（規則 06 の `C`） | 開くたびに昇順へ戻る |
| 決定 11 | （取り下げ —— JDG-990 の問い 2 が覆した。裁定 4） | — | — |
| 決定 12 | 本書が足す en の語の綴りは英国式の `colour` とする（`theme colour`・`fill colour`・`outline colour`・`Project theme colour`） | `display-words.json` の英語の文は `colour`（4 回、例 `IC-100` の「go back to colour」）。`color` は列名に近い語（`PR-19` の `color`、`strokeColor`・`planActualGuideColor`）だけ。`JDG-863` の「fill color」は米国式だが、画面の語の綴りは辞書に揃える | `JDG-863` の綴りと違う（語の意味は同じ） |
| 決定 13 | ハイライトボックスの塗りの `null`（プロジェクトテーマ色）はテーマの色 `S-155`（予定バーの塗り）で塗る。⚠️ **仮の値 PND-609**（規則 06 の `A`）: どの 表 T-236 の行で塗るか —— 推しは `S-155`。`S-370`（透明）は「置くときに列へ写す値」にし、新しい箱は今までどおり塗らずに置く | 裁定 5。`S-155` は色相に従い（○）、`S-371` の既定 50% の透過率を掛けると淡い帯になる。タスクの塗りの `null` と同じ色なので、同じ語（プロジェクトテーマ色）が同じ色を出す。写す形は `S-132` の先例 | `S-370` の意味が「`null` の色」から「置くときの値」に変わる。`S-155` を覆すのは `FR-019`・`AT-146` の 2 か所の 1 語 |
| 決定 14 | ハイライトボックスも、塗りと枠の線を同時に透明にさせない（`IV-9` を 2 つの実体に広げる） | `FR-007` の STATEMENT の「塗りと輪郭を同時に透明にすることを許してはならない（MUST NOT）」は色を選ぶこと一般の規則であり、裁定 4 が枠に透明を開いたので初めて当たる | 新しい箱（塗りが透明）で「線なし」を押すと拒まれる —— 先に塗りを選ぶ |
| 決定 15 | ② の語と `null` の印は、`null` が描く色の 表 T-236 の色相の欄で決める: ○ なら「プロジェクトテーマ色」と「(テーマ)」、— なら「既定の色」と「(既定)」。コメントボックスの字（`S-147`、—）にも当てる | 裁定 6 はボックスの枠を名指した。同じ理由（色相に従わない色を「テーマ」と呼ばない）が字にも当たる | 語が欄ごとに 2 つある |
| 決定 16 | 項目名を 1 行に置くのは、すべての色の行（タスク・行・ボックス）とする | 裁定 3。`CV-9` は色の欄すべての形であり、タスクだけ変えると欄ごとに形が違う | `FR-006` の「項目名は左」に例外が 1 つ（E-30） |

⚠️ 規則 06 の `A`〜`C` の仮の値（台帳の `PND` へ載せる候補）: **PND-609 —— 決定 13 のハイライトボックスの塗りの `null` の色（推し `S-155`、`A`）**、決定 10（候補の既定の向き・覚えない・足す項目の位置 —— `C`）と、辞書の新しい語（「塗潰しなし」「線なし」「その他の色」「プロジェクトテーマ色」「枠線幅（px）」、en の `colour` の綴り「先行」「後続」「種別」「予定日」「実績日」、「既定の色」「(テーマ)」「(既定)」、`{name}（UID {uid}）`、`“{name}” を追加` —— `C`）。

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 |
|---|---|---|
| 色の行と枠線幅の並び | `FR-006` の RATIONALE の 1 段 | E-01 |
| 名を種類で変える・種類で絞る | `FR-006` の 2 段 | E-02 |
| 操作子を 2 つ以上持つ行の例 | `FR-006` の 1 文 | E-03 |
| 線の太さ | 表 T-017 の `CL-2` | E-04 |
| 色の欄の並び | 表 T-017b の `CV-9` | E-05 |
| 担当者の欄 | 表 T-225 の `AS-1`・`AS-5`・`AS-7` | E-06 〜 E-08 |
| 依存線の項目 | `FR-009` の 1 段 | E-09 |
| 語と命令の名 | 表 T-102 の `P-18`、表 T-108 の `CM-24` | E-10・E-11 |
| 並べ替えの入口 | 表 T-109 の `IC-123`・`IC-124` | E-12・E-13 |
| 枠線の太さの列 | `erd.json` の `AT-104` | E-14 |
| ボックスの枠の太さの上限 | `settings.json` の `S-369`・`S-374` | E-15・E-16 |
| 辞書 | `display-words.json` の `PR-1`・`PR-12`・`colourField` の 2 項と、足す項（E-28） | E-17 〜 E-20・E-28 |
| 表 T-016 の形 | `property-items.schema.json` | E-21 |
| 絵をデータにするプロンプト | `image-to-grs-json-prompt.ja.md`・`.en.md` | E-22・E-23 |
| 隙間を測る端・変更前の輪郭 | 表 T-259 の `VG-5`、表 T-339 の `BL-3` | E-24・E-25 |
| 表 T-016 の行 | `property-items.json`（規則で当てる） | E-26 |
| 表 T-016 の刷り方 | `property_items_json_to_md.py`（刷る文と列） | E-27 |
| 色の行の項目名 | `FR-006` の 1 文 | E-30 |
| ハイライトボックスの塗りと線なし | `FR-019` の 12 行、表 T-246 の `HB-12`、`erd.json` の `AT-121`・`AT-146`、`settings.json` の `S-370` と 表 T-217 の結び、表 T-220 の `IV-9` | E-31 〜 E-37 |
| テーマ色 ／ theme colour | 手書きの原稿の「テーマの色相」36 行と en の「theme hue」6 行・`K-60` の en（規則で当てる） | E-29 |

**数**: 仕様の編集 37（旧を引く 33、規則で当てる 4）。

## 2. 新しい識別子

- ⚠️ **表 T-016 の行 ID 11 個は仮である**: `PR-34` 〜 `PR-44`（何の行かは E-26 の表）。番号は当てる時に、その日の木で表 T-016 と退役の名簿（`.claude/skills/spec-graph-check/retired.py`）を測り直して取る（規則 02 の 2.5 節）。本書の中の `PR-<新n>` はすべてその番号に置き換える。
- 表 T-016 の新しい列: 見出し `出す種類`、原稿の鍵 `shownFor`（値 `task`・`milestone`・`both`）。
- 原稿の鍵（識別子ではない）: `property-items.json` の `oneInput`、`display-words.json` の `properties` の項の `milestoneLabel`、`display-words.json` の新しい節 `propertyField`（部 `dependencyEnd`・`addResource`）、`colourField` の部 `noFill`・`noLine`。
- 名を変えるもの（数は増えない）: `AT-104` の列 `lineWeight` → `strokeWidthPx`、`CM-24` の確定名 `setTaskVisualLineWeight` → `setTaskVisualStrokeWidth`。
- 表・要求・接頭辞・設定値の行・文書 UID・`IC` の行: 作らない。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`0590ad03`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `lineWeight`（列挙 `thin`・`medium`・`thick`） | `erd.json` の `AT-104`、生成物 `grs-document.schema.json`・`fig-erd-detail.md`・`tbl-property-items.md`、`tbl-glossary.md` の `P-18`、プロンプト 2 つ | `strokeWidthPx`（整数 1〜10、`null` ＝ `S-39`） | E-10・E-14・E-22・E-23・E-26 と `npm run gen` |
| `setTaskVisualLineWeight` | `tbl-glossary.md` の `CM-24`、`src` の 4 ファイル | `setTaskVisualStrokeWidth` | E-11、9 節 |
| `CL-2` の「細 / 中 / 太」 | `01-04-requirements.md:2006` | 整数の px（範囲は `AT-104`） | E-04 |
| `CV-9` の「その下の段にカスタムカラーの入口、透明、テーマに戻す入口の順」 | `01-04-requirements.md:2030` | ① 側ごとの 1 行 ② テーマ ③ 5×2 ④ 透明・カスタム | E-05 |
| `PR-12` の 3 列の 1 行（`strokeColor / fillColor / lineWeight`）と語「線 / 塗り / 太さ」 | `property-items.json`・`display-words.json` | `PR-12`（`fillColor`、塗潰し色）・`PR-39`（`strokeColor`、枠線色）・`PR-40`（`strokeWidthPx`、枠線幅（px）） | E-18・E-26 |
| `AS-5` の「名簿から選ばせる形とし、ドロップダウンと部分一致の検索を添える」と「空の欄で選ぶか打てば」 | `01-04-requirements.md:2222` | 1 つの組み合わせの入力（E-07） | E-07 |
| 打っただけの字で `Resource` を作る道 | `AS-7`、`field-commit.ts` の `commandsFromAssigneeField` | `AS-5` の足す項目を選んだときだけ | E-08、9 節 |
| 依存線の項目の手書きの表 | `properties-panel.ts` の `DEPENDENCY_ITEMS`・`SUCCESSOR_ROW`・`SUCCESSOR_NAME` | 表 T-016 の対象 `Dependency` の 4 行 | E-09・E-26、9 節 |
| `FR-009` の「表 T-016 は `Task` の属性表であり依存線の行を持たない」 | `01-04-requirements.md:2748` | 表 T-016 の対象 `Dependency` の行 | E-09 |
| `FR-019` の「ハイライトボックスの枠の線に透明を選ばせてはならない（MUST NOT）」、`AT-121` の `"transparent": false`、`PR-22` の「透明は取らない」、`CV-9` の「ハイライトボックスの枠の欄には透明を並べない」、`edit-annotation.ts` の `CM-55` の拒み | `01-04-requirements.md:5581`・`:2030`、`erd.json:2790`、`property-items.json:421` | 線なしを選べる（塗りと同時は `IV-9` が拒む） | E-05・E-26・E-31・E-33・E-37、9 節 |
| `HighlightBox.fillColor` の `null` ＝ `S-370`（透明） | `FR-019`・`AT-146`・`S-370`・`PR-25` | `null` ＝ テーマの色 `S-155`（PND-609）、置くときに `S-370` を写す | E-26・E-31・E-34・E-35・E-36 |
| 色の行の項目名を左に置く | `FR-006:1904` | 欄の上の 1 行 | E-30 |
| 語「テーマの色相」（39 回）と en の「theme hue」（6 回）・`K-60` の en の語 `themeHue` | 0.2 節の 9、E-29 の表 | 「テーマ色」（`AT-19`・`S-73` の値の説明だけ「テーマ色の色相」）、「theme colour」 | E-29 と `npm run gen`・`npm run gen:components` |
| 語「名称」（`PR-1`）・「任意」「テーマ」（`colourField`） | `display-words.json` | タスク名 ／ マイルストーン名、その他の色、プロジェクトテーマ色 | E-17・E-19・E-20 |
| ボックスの枠の太さの上限 8 | `settings.json` の `S-369`・`S-374` | 10 | E-15・E-16 |

⭐ **消さないもの**: `themeHue`・`name`・`fillColor`・`strokeColor`・`uid` の識別子。`PR-18` の語「名称」（10 節）。ボックスの行の並び（`DFC-1412`）。`PR-28` の 3 色の 1 行。`CM-9` の「名称を変える」。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（13 節で 33 の旧をどれも 1 回と数えた）。旧・新は行の全体（末の改行まで）であり、行末の 2 つの半角空白も旧と新の一部である。
⚠️ 生成物（`docs/spec/_assets/tbl-property-items.md`・`tbl-settings.md`・`fig-erd-detail.md`・`tbl-row-id-prefixes.md`、`grs-document.schema.json`、`src` の生成物）は手で直さない。原稿を直して `npm run gen` を打つ。
⚠️ `PR-<新n>` は当てる時に取った番号に置き換える（2 節）。

### 4.1 旧を引く編集（E-01 〜 E-25・E-30 〜 E-37）

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:1878`、1 行）
```text
⭐ 色の行（表 T-016 の入力の型に `色` を含む行）は、同じ対象の行の並びの末尾に置くこと（MUST） —— 日付と名前を先に読ませ、見た目の設定を後ろへ寄せる。  
```
新
```text
⭐ 色の行（表 T-016 の入力の型に `色` を含む行）は、同じ対象の行の並びの末尾に置くこと（MUST） —— 日付と名前を先に読ませ、見た目の設定を後ろへ寄せる。  
⭐ ただし、`Task` の枠線幅の行は、色の行の後ろ（`Task` の行の最後）に置くこと（MUST） —— 塗りの色 → 枠線の色 → 枠線の幅 は、利用者が示した並びである。  
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:1887`、7 行）
```text
⚠️ 名は行に 1 つであって、列ごとではない —— 1 つの行が列を 2 つ以上持つことがあり（同表の `PR-3` や `PR-14`）、**列名を繋いだものを名にしてはならない（MUST NOT）。**

⛔ いま選ばれているものと同じ「対象」を持つ行だけを出すこと（MUST）。  
対象の違う行を出してはならない（MUST NOT）—— **対象は 表 T-016 の `対象` の欄が持つ。**  
⛔ **本文がその欄の値を数え上げてはならない（MUST NOT）** —— **数え上げると、表に行を足すたびに 2 か所を直すことになり、必ず片方が遅れる。**  
⚠️ 同表の並びは下の段が定めるとおり印刷順そのものなので、対象を見ないと `TaskGroup` の `minHeight` が `Task` のパネルにも出る。  
⭐ **同じ対象の行どうしの相対順は変わらない** —— **絞るだけであって、並べ替えではない。**
```
新
```text
⚠️ 名は行に 1 つであって、列ごとではない —— 1 つの行が列を 2 つ以上持つことがあり（同表の `PR-3` や `PR-14`）、**列名を繋いだものを名にしてはならない（MUST NOT）。**  
⭐ ただし、タスクとマイルストーンの両方に出す行のうち、名が何の名かを言う行（同表の `PR-1`）は、`FR-038` の辞書がマイルストーンのときの名も同じ行 ID で持ち、選んでいるものの種類の名で出すこと（MUST） —— 「名称」だけでは何の名かが読めない。

⛔ いま選ばれているものと同じ「対象」を持つ行だけを出すこと（MUST）。  
対象の違う行を出してはならない（MUST NOT）—— **対象は 表 T-016 の `対象` の欄が持つ。**  
⛔ **本文がその欄の値を数え上げてはならない（MUST NOT）** —— **数え上げると、表に行を足すたびに 2 か所を直すことになり、必ず片方が遅れる。**  
⚠️ 同表の並びは下の段が定めるとおり印刷順そのものなので、対象を見ないと `TaskGroup` の `minHeight` が `Task` のパネルにも出る。  
⭐ **同じ対象の行どうしの相対順は変わらない** —— **絞るだけであって、並べ替えではない。**  
⭐ 対象が `Task` の行は、さらに同表の `出す種類` の欄で絞ること（MUST） —— `Task.milestone`（`_assets/fig-erd-detail.md` の `AT-30`）が真のタスクには `milestone` か `both` の行だけを、偽のタスクには `task` か `both` の行だけを出す。  
⛔ 絞る鍵を図形の列に取ってはならない（MUST NOT） —— 行の出し分けも、名称ラベルの `ND-1` ・ `ND-2` の書き分けと同じ鍵（表 T-251 の下の段）で決める。
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:1911`、1 行）
```text
同じ行に並ぶ操作子をすべてその幅で並べられないときは、その行を折り返すこと（MUST）（表 T-016 の `PR-3` や `PR-12` のように、1 つの行が操作子を 2 つ以上持つことがある）**。**  
```
新
```text
同じ行に並ぶ操作子をすべてその幅で並べられないときは、その行を折り返すこと（MUST）（表 T-016 の `PR-3` や `PR-14` のように、1 つの行が操作子を 2 つ以上持つことがある）**。**  
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:2006`、1 行）
```text
| CL-2 | 線の太さ | 細 / 中 / 太 |
```
新
```text
| CL-2 | 線の太さ | 整数の px。<br>受ける下限と上限は列の定義（`AT-104`）に書く。<br>`null` のときは `_assets/tbl-settings.md` の 表 T-201 の `S-39` の太さで描く |
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:2030`、1 行）
```text
| CV-9 | 色の欄 | プロパティパネルの色の欄は、表 T-294 の名とカスタムカラーの入口を並べて選ばせること（MUST）。<br>⭐ 並べ方は、透明を除く名を同表の行の順に、1 段に `_assets/tbl-settings.md` の 表 T-206 の `S-338` 個ずつ並べ、その下の段にカスタムカラーの入口、透明、テーマに戻す入口の順に置くこと（MUST）。<br>⭐ テーマに戻す入口は `CV-5` の「戻す入口」（`FR-007`）であり、押したらその欄の色をテーマ追随（`null`）へ戻すこと（MUST） —— カスタムカラーなら 2 つの値を両方捨てる（`CV-5`）。<br>⭐ 閲覧環境の色の入力（`input type=color`）は、カスタムカラーの入口を押したときにだけ出すこと（MUST） —— 常に出すと、並べた名と入力のどちらで選ぶのかが読めない。<br>その欄に並べない名（下の 2 つ）の場所は空けたままとし、後ろの名を詰めてはならない（MUST NOT） —— 欄によって同じ色の場所が変わると、場所で覚えられない。<br>名の見本は、その欄が描く形（`CV-6`）の、いま描いている明暗の値で塗ること（MUST） —— 見本と描かれる色が食い違わない。<br>⭐ `FR-041` のモノクロ（`_assets/tbl-settings.md` の 表 T-203 の `S-74`）が入っているあいだは、名の見本と側ごとの見本を、同じ色を `CV-7` で無彩色にした値で塗ること（MUST） —— 作者はモノクロでどう見えるかで色を選び、色を確かめるならカラーへ戻せばよい（透明の市松と未定義の破線はそのまま）。<br>⭐ 欄には、選んでいる色の明るいテーマの側と暗いテーマの側を 1 行に並べ、側ごとに見本と値を示すこと（MUST）（例: `ライト: ■ #AAAAAA / ダーク: ■ #050505`）。<br>値は、`#rrggbb` の側は英大文字の 16 進、名の側はその名の語とする。<br>⭐ 透明の側は、値を透明の語とし、見本を市松で示すこと（MUST） —— 1 辺を 表 T-206 の `S-335` 個のますに割り、ますを 表 T-236 の `S-336` と `S-337` で交互に塗る。<br>⭐ 未定義の側は、値を空け、見本を縁だけの破線で示し、`CV-3` で描く値がどちらの側と同じかを語で添えること（MUST）。<br>ハイライトボックスの枠の欄には透明を並べない（`FR-019`）。<br>その欄では透明の場所は空けたままとし、テーマに戻す入口はその後ろに置く（枠の色もテーマ追随へ戻せる）。<br>コメントボックスの線の欄と字の欄には透明を並べない（`FR-019`）。<br>その 2 つの欄でも透明の場所は空けたままとし、テーマに戻す入口はその後ろに置く。<br>行の色の欄には黒を並べない（表 T-294 の `S-315`）。<br>⭐ 行の色の欄が並べる名を、`TaskGroup.color` が受ける名の唯一の一覧とすること（MUST） —— 一覧は、表 T-294 の名のうち、行の帯の欄が「—」でないものとする（透明は「描かない」を持つので一覧に入る）。<br>⛔ 一覧の外の名（黒）は、`CM-30`（`FR-042`）も、`GRS JSON` の取り込み（`05-07-design.md` の 表 T-220 の前文のスキーマ、拒んだときの理由は 表 T-233 の `RS-25`）も受けてはならない（MUST NOT） —— パネルが出さない名を命令と取り込みが受けると、どの見本も選ばれていない欄と、テーマの帯で描かれる行が残る。<br>⭐ 一覧は列の形（`_assets/fig-erd-detail.md` の `AT-58`）から生成し、欄・命令・取り込みのどれにも手で書き写してはならない（MUST NOT）。<br>語は `FR-038` の辞書が持つ |
```
新
```text
| CV-9 | 色の欄 | プロパティパネルの色の欄は、表 T-294 の名とカスタムカラーの入口を並べて選ばせること（MUST）。<br>⭐ 並べ方は、上から次の順とすること（MUST）: ⓪ 欄の名（`FR-006` の項目名）だけの 1 行、① 選んでいる色の側ごとの見本と値の 1 行（本行の後の段）、② テーマに戻す入口、③ 透明を除く名を同表の行の順に、1 段に `_assets/tbl-settings.md` の 表 T-206 の `S-338` 個ずつ並べた段、④ 透明の入口とカスタムカラーの入口をこの順に並べた 1 行。<br>⭐ 透明の入口の語は、塗りの欄（`fillColor` と `TaskGroup.color`）では塗りの無いことを、線の欄（`strokeColor`）では線の無いことを言う語とすること（MUST） —— 同じ「透明」でも、塗りの欄では塗らないこと（後ろが見える）、線の欄では線を引かないことを選んでいる。<br>⭐ ② の入口の語は、その欄の `null` が描く色の 表 T-236 の行の色相の欄が ○ ならテーマの色を言う語、— なら既定の色を言う語とすること（MUST） —— 色相に従わない固定の色（ボックスの線の `S-312`、字の `S-147`）を「テーマ」と呼ぶと、押して出る色と語が食い違う。<br>⭐ この並べ方を触って確かめる見本は `previous-project-result/25-colour-input-layout/index.html` である。<br>⭐ テーマに戻す入口は `CV-5` の「戻す入口」（`FR-007`）であり、押したらその欄の色をテーマ追随（`null`）へ戻すこと（MUST） —— カスタムカラーなら 2 つの値を両方捨てる（`CV-5`）。<br>⭐ 閲覧環境の色の入力（`input type=color`）は、カスタムカラーの入口を押したときにだけ出すこと（MUST） —— 常に出すと、並べた名と入力のどちらで選ぶのかが読めない。<br>その欄に並べない名（下の 2 つ）の場所は空けたままとし、後ろの名を詰めてはならない（MUST NOT） —— 欄によって同じ色の場所が変わると、場所で覚えられない。<br>名の見本は、その欄が描く形（`CV-6`）の、いま描いている明暗の値で塗ること（MUST） —— 見本と描かれる色が食い違わない。<br>⭐ `FR-041` のモノクロ（`_assets/tbl-settings.md` の 表 T-203 の `S-74`）が入っているあいだは、名の見本と側ごとの見本を、同じ色を `CV-7` で無彩色にした値で塗ること（MUST） —— 作者はモノクロでどう見えるかで色を選び、色を確かめるならカラーへ戻せばよい（透明の市松と未定義の破線はそのまま）。<br>⭐ 欄には、選んでいる色の明るいテーマの側と暗いテーマの側を 1 行に並べ、側ごとに見本と値を示すこと（MUST）（例: `ライト: ■ #AAAAAA / ダーク: ■ #050505`）。<br>⭐ 欄の値が `null`（② を選んでいる）ときは、側ごとの見本を、その欄の `null` がいま描いている色（テーマの色か既定の色）で塗り、値の代わりに、テーマなら「(テーマ)」、既定なら「(既定)」の印を添えること（MUST）（例: `ライト: ■ (テーマ) / ダーク: ■ (テーマ)`） —— 印は `null` のときにだけ出す。<br>⭐ パネルの幅に 1 行が入らないときは、ライトの側とダークの側の 2 行に折ってよい（`FR-006` の折り返し）。<br>値は、`#rrggbb` の側は英大文字の 16 進、名の側はその名の語とする。<br>⭐ 透明の側は、値を透明の語とし、見本を市松で示すこと（MUST） —— 1 辺を 表 T-206 の `S-335` 個のますに割り、ますを 表 T-236 の `S-336` と `S-337` で交互に塗る。<br>⭐ 未定義の側は、値を空け、見本を縁だけの破線で示し、`CV-3` で描く値がどちらの側と同じかを語で添えること（MUST）。<br>ハイライトボックスの枠の欄にも透明（線なし）を並べる —— 線が透明でも枠は掴める（`FR-016` の 表 T-246 の `HB-12`）。<br>コメントボックスの線の欄と字の欄には透明を並べない（`FR-019`）。<br>その 2 つの欄では ④ の透明の場所を空けたままとし、カスタムカラーの入口を前へ詰めない。<br>行の色の欄には黒を並べない（表 T-294 の `S-315`）。<br>⭐ 行の色の欄が並べる名を、`TaskGroup.color` が受ける名の唯一の一覧とすること（MUST） —— 一覧は、表 T-294 の名のうち、行の帯の欄が「—」でないものとする（透明は「描かない」を持つので一覧に入る）。<br>⛔ 一覧の外の名（黒）は、`CM-30`（`FR-042`）も、`GRS JSON` の取り込み（`05-07-design.md` の 表 T-220 の前文のスキーマ、拒んだときの理由は 表 T-233 の `RS-25`）も受けてはならない（MUST NOT） —— パネルが出さない名を命令と取り込みが受けると、どの見本も選ばれていない欄と、テーマの帯で描かれる行が残る。<br>⭐ 一覧は列の形（`_assets/fig-erd-detail.md` の `AT-58`）から生成し、欄・命令・取り込みのどれにも手で書き写してはならない（MUST NOT）。<br>語は `FR-038` の辞書が持つ |
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:2218`、1 行）
```text
| AS-1 | 担当ラベルをダブルクリックした | プロパティパネルを出し、担当者の欄（表 T-016 の `PR-16`）を編集できる状態にして焦点を置くこと（MUST）—— ⛔ **その場で打ち換える器を置いてはならない（MUST NOT）** —— 表 T-023 の `MK-13` が挙げるほかの対象はすべてパネルへ行っており、担当ラベルだけが別の器官を要求する理由が無い。<br>⭐ **先例は 表 T-051 の `HF-14` である** —— **押された瞬間にパネルを出し、名前の欄で名づけさせる。<br>**⛔ `FR-091` の「同じ 1 回の押下でパネルを閉じ、その選択を解く」をここへ写してはならない（MUST NOT） —— **あちらは作った直後の名称に限った条項であり**（同要求が自ら「これは作った直後の場面に限る（MUST）」と述べている）、**担当ラベルの編集は何も作っていない。<br>** 入口の割当は表 T-023 の `MK-13`、掴み領域は表 T-023d の `GR-11` が既に持つ。<br>⭐ 担当者の欄は、就いている担当者 1 人につき 1 つある（`AS-5`）。<br>焦点を置くのは、押した担当ラベルが名を出している担当者の欄（`FR-059`）とし、ラベルが `-` を出しているとき（`AS-2`）は空の欄とすること（MUST） —— 押したラベルに見えている人の欄へ行く。<br>そのまま名を打てば、その人を替えることになる（`AS-12`） |
```
新
```text
| AS-1 | 担当ラベルをダブルクリックした | プロパティパネルを出し、担当者の欄（表 T-016 の `PR-16`）を編集できる状態にして焦点を置くこと（MUST）—— ⛔ **その場で打ち換える器を置いてはならない（MUST NOT）** —— 表 T-023 の `MK-13` が挙げるほかの対象はすべてパネルへ行っており、担当ラベルだけが別の器官を要求する理由が無い。<br>⭐ **先例は 表 T-051 の `HF-14` である** —— **押された瞬間にパネルを出し、名前の欄で名づけさせる。<br>**⛔ `FR-091` の「同じ 1 回の押下でパネルを閉じ、その選択を解く」をここへ写してはならない（MUST NOT） —— **あちらは作った直後の名称に限った条項であり**（同要求が自ら「これは作った直後の場面に限る（MUST）」と述べている）、**担当ラベルの編集は何も作っていない。<br>** 入口の割当は表 T-023 の `MK-13`、掴み領域は表 T-023d の `GR-11` が既に持つ。<br>⭐ 担当者の欄は、就いている担当者 1 人につき 1 つある（`AS-5`）。<br>焦点を置くのは、押した担当ラベルが名を出している担当者の欄（`FR-059`）とし、ラベルが `-` を出しているとき（`AS-2`）は空の欄とすること（MUST） —— 押したラベルに見えている人の欄へ行く。<br>そのまま名を打って候補を選べば、その人を替えることになる（`AS-5` ・ `AS-12`） |
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:2222`、1 行）
```text
| AS-5 | プロパティパネルの担当者（表 T-016 の `PR-16`） | **編集できること（MUST）。<br>** 名簿から選ばせる形とし、**ドロップダウンと部分一致の検索を添えること（MUST）**。<br>⭐ 担当者の欄は、そのタスクに就いている担当者 1 人につき 1 つ出し、その下に空の欄を常に 1 つ出すこと（MUST） —— どの欄も同じ形であり、空の欄で選ぶか打てば 1 人を足せる（`AS-12`）。<br>足すための印も語も置かない —— 空の欄がその入口である。<br>欄の並びは、`FR-059` が担当ラベルに定める順と同じとすること（MUST） —— 同じ人たちの並びを、画面の 2 か所で違えない。<br>⭐ 欄に出す担当者は、資源の種類で絞らない —— `FR-059` の種類の絞りは担当ラベルのものであり、ここで絞ると、取り込んだ材料資源や費用資源の割当を解く道が無くなる。<br>⭐ 欄が出すのは担当者の名だけであり、割当率は出さない —— 割当率は編集しない（本要求の RATIONALE） |
```
新
```text
| AS-5 | プロパティパネルの担当者（表 T-016 の `PR-16`） | **編集できること（MUST）。<br>** ⭐ 担当者の欄は、そのタスクに就いている担当者 1 人につき 1 つ出し、その下に空の欄を常に 1 つ出すこと（MUST） —— どの欄も同じ形であり、空の欄で選べば 1 人を足せる（`AS-12`）。<br>足すための印も語も置かない —— 空の欄がその入口である。<br>⭐ 1 つの欄は、字を打てて候補の一覧（ドロップダウン）を開ける 1 つの入力とすること（MUST）。<br>⛔ 1 つの欄に、選ぶ器と打つ器を別々に置いてはならない（MUST NOT） —— 器が 2 つあると、どちらの値が書かれるのかが読めず、打つ器に残った字が確定のたびに担当者を作る。<br>⭐ 候補は名簿の担当者とし、打った字を担当者名の一部と比べて、当たる候補だけに絞ること（MUST）。<br>比べ方は 表 T-330 の `SV-4` と同じとすること（MUST） —— 同じ名簿を 2 か所で違う比べ方で絞ると、検索パネルで見つかる人が担当者の欄で見つからない。<br>⭐ 候補は名の昇順に並べ、一覧の頭に置く `IC-123`（昇順）と `IC-124`（降順）で向きを変えさせること（MUST） —— 入口は検索パネルの列の並べ替え（`SV-7`）と同じものである。<br>同じ名の候補は `uid` の昇順とする（`uid` を添えるのは `AS-6`）。<br>⭐ 打った字と等しい名の担当者がいないときは、候補の末尾に、打った字を名とする担当者を足す項目を 1 つ出すこと（MUST）（語は `FR-038` の辞書）。<br>⛔ 打った字が `-` のときは出してはならない（MUST NOT） —— `-` は解除の合図である（`AS-3` ・ `AS-4`）。<br>足す項目を選んだときの規則は `AS-7` が持つ。<br>⭐ 欄が書くのは、候補か足す項目を選んだとき（押す、または矢印で強調して `Enter`）と、`AS-3` の `-` を確定したときだけとすること（MUST）。<br>⭐ 何も強調せずに確定したとき（`Enter`、表 T-028 の `IN-6` の外の押下）は、打った字と等しい名の候補があればそれを選んだものとし（同じ名が 2 つ以上なら `AS-8`）、無ければ何も書かないこと（MUST）。<br>⚠️ 無ければ打った字は残らない —— 名簿に無い名を足すのは足す項目を選んだときだけであり（`AS-7`）、`IN-6` の「取り消してはならない」は、この欄では等しい名を選ぶことで果たす。<br>欄の並びは、`FR-059` が担当ラベルに定める順と同じとすること（MUST） —— 同じ人たちの並びを、画面の 2 か所で違えない。<br>⭐ 欄に出す担当者は、資源の種類で絞らない —— `FR-059` の種類の絞りは担当ラベルのものであり、ここで絞ると、取り込んだ材料資源や費用資源の割当を解く道が無くなる。<br>⭐ 欄が出すのは担当者の名だけであり、割当率は出さない —— 割当率は編集しない（本要求の RATIONALE） |
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:2224`、1 行）
```text
| AS-7 | 名簿に無い名前を受け取った | **その名前の `Resource` を作ってから割り当てること（MUST）**（表 T-108 の `CM-40` と `CM-44`）。<br>種類と採番は本要求の上の段落が持つ。<br>⛔ 就いている担当者の欄で受け取っても、同じように振る舞うこと（MUST）。<br>就いている担当者の改名として扱ってはならない（MUST NOT） —— 名簿に無い名前の入力は差し替えである。<br>⭐ 差し替えるか足すかは、受け取った欄が決める（`AS-12`） —— 就いている担当者の欄ならその人の割当を解き（表 T-108 の `CM-45`、`AS-3` と同じ語）、空の欄なら解かない。<br>⛔ **解いても担当者そのものは残る**（本要求の上の段落）—— 担当者そのものを消す道は、担当者一覧に既に在る |
```
新
```text
| AS-7 | 名簿に無い名前を受け取った（`AS-5` の足す項目を選んだ） | **その名前の `Resource` を作ってから割り当てること（MUST）**（表 T-108 の `CM-40` と `CM-44`）。<br>種類と採番は本要求の上の段落が持つ。<br>⛔ `Resource` を作るのは、`AS-5` の足す項目を選んだときだけとすること（MUST）。<br>打っただけの字（何も選ばずに `Enter` を押した・焦点が欄を離れた）で作ってはならない（MUST NOT） —— 打ちかけの字や打ち間違いが名簿に残り、候補の一覧が汚れる（削除の道は `FR-099` にしか無い）。<br>⛔ 就いている担当者の欄で受け取っても、同じように振る舞うこと（MUST）。<br>就いている担当者の改名として扱ってはならない（MUST NOT） —— 名簿に無い名前の入力は差し替えである。<br>⭐ 差し替えるか足すかは、受け取った欄が決める（`AS-12`） —— 就いている担当者の欄ならその人の割当を解き（表 T-108 の `CM-45`、`AS-3` と同じ語）、空の欄なら解かない。<br>⛔ **解いても担当者そのものは残る**（本要求の上の段落）—— 担当者そのものを消す道は、担当者一覧に既に在る |
```

<!-- EDIT id=E-09 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:2748`、1 行）
```text
依存線を選んだときにプロパティパネルへ出す項目は、種別・ラグ・両端とすること（MUST） —— 表 T-016 は `Task` の属性表であり依存線の行を持たないので、`FR-072` の解決先がこれになる。  
```
新
```text
依存線を選んだときにプロパティパネルへ出す項目は、表 T-016 の `対象` が `Dependency` の行（種別・ラグ・両端）とすること（MUST） —— `FR-072` の解決先がこれになる。  
⭐ 編集できるのはラグだけであり、種別と両端は同表が読み取り専用と記す —— 表 T-108 に種別や端を変える命令は無く（`CM-36` 〜 `CM-38`）、種別を変えるときは依存を引き直す（`UC-004` の手順 5）。  
⭐ 種別は本要求の 表 T-018 の `名` の欄の略号で、両端はタスクの名と `uid` で示すこと（MUST） —— 名と `uid` の並べ方は `FR-038` の辞書が持つ。  
```

<!-- EDIT id=E-10 file=docs/spec/_assets/tbl-glossary.md -->
旧（`tbl-glossary.md:70`、1 行）
```text
| P-18 | `strokeColor` / `fillColor` / `lineWeight` | 線色 / 塗り色 / 線の太さ |
```
新
```text
| P-18 | `strokeColor` / `fillColor` / `strokeWidthPx` | 線色 / 塗り色 / 線の太さ |
```

<!-- EDIT id=E-11 file=docs/spec/_assets/tbl-glossary.md -->
旧（`tbl-glossary.md:437`、1 行）
```text
| CM-24 | `TaskVisual` | `setTaskVisualLineWeight` | — | 線の太さを置く | `FR-007` |
```
新
```text
| CM-24 | `TaskVisual` | `setTaskVisualStrokeWidth` | — | 線の太さを置く | `FR-007` |
```

<!-- EDIT id=E-12 file=docs/spec/_assets/tbl-glossary.md -->
旧（`tbl-glossary.md:617`、1 行）
```text
| IC-123 | `Search Panel` | — | その列で昇順に並べる | `FR-151` | — | — |
```
新
```text
| IC-123 | `Search Panel` / `Properties Panel` | — | その列で昇順に並べる。<br>プロパティパネルでは、担当者の欄の候補を名の昇順に並べる（`FR-008` の 表 T-225 の `AS-5`） | `FR-151` ・ `FR-008` | — | — |
```

<!-- EDIT id=E-13 file=docs/spec/_assets/tbl-glossary.md -->
旧（`tbl-glossary.md:618`、1 行）
```text
| IC-124 | `Search Panel` | — | その列で降順に並べる | `FR-151` | — | — |
```
新
```text
| IC-124 | `Search Panel` / `Properties Panel` | — | その列で降順に並べる。<br>プロパティパネルでは、担当者の欄の候補を名の降順に並べる（`FR-008` の 表 T-225 の `AS-5`） | `FR-151` ・ `FR-008` | — | — |
```

<!-- EDIT id=E-14 file=docs/spec/_source/erd.json -->
旧（`erd.json:2375`、18 行）
```json
     "seat": 104,
     "name": "lineWeight",
     "type": "列挙（3 値）",
     "nullable": "可",
     "json": {
      "kind": "enum",
      "values": [
       "thin",
       "medium",
       "thick"
      ],
      "null": true
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "輪郭の太さ"
```
新
```json
     "seat": 104,
     "name": "strokeWidthPx",
     "type": "整数（px）",
     "nullable": "可（`null` = 表 T-201 の `S-39`）",
     "json": {
      "kind": "integer",
      "min": 1,
      "max": 10,
      "null": true
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "輪郭（枠線）の太さ。予定バーと実績バーの縁の両方をこの太さで描く。`null` は `_assets/tbl-settings.md` の表 T-201 の `S-39` の太さで描く。範囲はハイライトボックスとコメントボックスの枠の太さ（表 T-217 の `S-369` ・ `S-374`）と揃える（`FR-007` の 表 T-017 の `CL-2`）"
```

<!-- EDIT id=E-15 file=docs/spec/_source/settings.json -->
旧（`settings.json:7574`、5 行）
```json
     "max": {
      "num": "8"
     },
     "note": {
      "ja": "ハイライトボックスの枠の線の太さ（px、`AT-145`）。列が `null` のときに描く値である。ズームによらず一定に描く規則は `FR-019` が持つ。既定は、本行より前のコードが描いていた太さ。下限は、枠が箱を掴む所の目印だからである（`FR-019`）。上限は測って決めた値ではない"
```
新
```json
     "max": {
      "num": "10"
     },
     "note": {
      "ja": "ハイライトボックスの枠の線の太さ（px、`AT-145`）。列が `null` のときに描く値である。ズームによらず一定に描く規則は `FR-019` が持つ。既定は、本行より前のコードが描いていた太さ。下限は、枠が箱を掴む所の目印だからである（`FR-019`）。上限はタスクの枠線の太さ（`AT-104`）と揃えた値であり、測って決めた値ではない"
```

<!-- EDIT id=E-16 file=docs/spec/_source/settings.json -->
旧（`settings.json:7632`、5 行）
```json
     "max": {
      "num": "8"
     },
     "note": {
      "ja": "コメントボックスの本文の箱の枠と引出し線の太さ（px、`AT-149`）。列が `null` のときに描く値である。ズームによらず一定に描く規則は `FR-019` が持つ。既定は、本行より前のコードが描いていた太さ。下限は、1px を割ると画面の画素に届かず線が消えるからである（表 T-257 の `RR-5` と同じ理由）。上限は測って決めた値ではない"
```
新
```json
     "max": {
      "num": "10"
     },
     "note": {
      "ja": "コメントボックスの本文の箱の枠と引出し線の太さ（px、`AT-149`）。列が `null` のときに描く値である。ズームによらず一定に描く規則は `FR-019` が持つ。既定は、本行より前のコードが描いていた太さ。下限は、1px を割ると画面の画素に届かず線が消えるからである（表 T-257 の `RR-5` と同じ理由）。上限の 10 は `S-369` と同じ数に置いた（測っていない）"
```

<!-- EDIT id=E-17 file=docs/spec/_source/display-words.json -->
旧（`display-words.json:1259`、4 行）
```json
   "rowId": "PR-1",
   "label": {
    "ja": "名称",
    "en": "name"
```
新
```json
   "rowId": "PR-1",
   "label": {
    "ja": "タスク名",
    "en": "task name"
   },
   "milestoneLabel": {
    "ja": "マイルストーン名",
    "en": "milestone name"
```

<!-- EDIT id=E-18 file=docs/spec/_source/display-words.json -->
旧（`display-words.json:1357`、4 行）
```json
   "rowId": "PR-12",
   "label": {
    "ja": "線 / 塗り / 太さ",
    "en": "stroke / fill / weight"
```
新
```json
   "rowId": "PR-12",
   "label": {
    "ja": "塗潰し色",
    "en": "fill colour"
```

<!-- EDIT id=E-19 file=docs/spec/_source/display-words.json -->
旧（`display-words.json:3966`、4 行）
```json
   "part": "custom",
   "text": {
    "ja": "任意",
    "en": "Custom"
```
新
```json
   "part": "custom",
   "text": {
    "ja": "その他の色",
    "en": "Custom"
```

<!-- EDIT id=E-20 file=docs/spec/_source/display-words.json -->
旧（`display-words.json:4001`、5 行）
```json
   "part": "theme",
   "text": {
    "ja": "テーマ",
    "en": "Theme"
   }
```
新
```json
   "part": "theme",
   "text": {
    "ja": "プロジェクトテーマ色",
    "en": "Project theme colour"
   }
```

<!-- EDIT id=E-21 file=docs/spec/_source/property-items.schema.json -->
旧（`property-items.schema.json:79`、11 行）
```json
     "appliesTo": {
      "description": "Which selection this row belongs to. FR-006 (MUST) makes the panel print only the rows whose appliesTo matches what is selected, and forbids printing the others -- without it a TaskGroup's height would be drawn on a Task's panel, because the array's order IS the print order and every row in it would be printed. Absent means Task. A CommentBox row is one whose entrance is the panel (FR-097).",
      "type": "string",
      "enum": [
       "Task",
       "TaskGroup",
       "CommentBox",
       "HighlightBox"
      ]
     },
     "note": {
```
新
```json
     "appliesTo": {
      "description": "Which selection this row belongs to. FR-006 (MUST) makes the panel print only the rows whose appliesTo matches what is selected, and forbids printing the others -- without it a TaskGroup's height would be drawn on a Task's panel, because the array's order IS the print order and every row in it would be printed. Absent means Task. A CommentBox row is one whose entrance is the panel (FR-097). A Dependency row is printed when a dependency line is selected (FR-009).",
      "type": "string",
      "enum": [
       "Task",
       "TaskGroup",
       "CommentBox",
       "HighlightBox",
       "Dependency"
      ]
     },
     "shownFor": {
      "description": "Which kind of task the row is printed for: task (Task.milestone is false), milestone (Task.milestone is true) or both. FR-006 (MUST) filters a Task's rows by it after appliesTo. REQUIRED on every row whose appliesTo is Task and FORBIDDEN on every other row -- property_items_json_to_md.py refuses both, so that no Task row is shown for a kind by accident.",
      "type": "string",
      "enum": [
       "task",
       "milestone",
       "both"
      ]
     },
     "oneInput": {
      "description": "True when ONE input writes the same value to every entry of `columns` -- a milestone's planned date writes start and finish, its actual date actualStart and actualFinish (an MSPDI milestone starts and finishes on one day). `inputKinds` then holds exactly one kind. Absent means one input per column.",
      "type": "boolean"
     },
     "note": {
```

<!-- EDIT id=E-22 file=docs/spec/_source/image-to-grs-json-prompt.ja.md -->
旧（`image-to-grs-json-prompt.ja.md:76`、2 行）
```text
   - lineWeight は輪郭の太さを、原本の中で比べて "thin" / "medium" / "thick" から選ぶ。違いが見えなければ null。
   - 1 件の形: {"taskUid": uid, "shapeKind": 上の値, "milestoneGlyph": 上の値か null, "fillColor": 色か null, "strokeColor": 色か null, "lineWeight": 太さか null}
```
新
```text
   - strokeWidthPx は輪郭の太さを、原本の中で比べて 1 〜 10 の整数（px）で選ぶ。細い・中くらい・太いの 3 つに見えるなら 1 ・ 2 ・ 3。違いが見えなければ null。
   - 1 件の形: {"taskUid": uid, "shapeKind": 上の値, "milestoneGlyph": 上の値か null, "fillColor": 色か null, "strokeColor": 色か null, "strokeWidthPx": 太さか null}
```

<!-- EDIT id=E-23 file=docs/spec/_source/image-to-grs-json-prompt.en.md -->
旧（`image-to-grs-json-prompt.en.md:76`、2 行）
```text
   - lineWeight is the outline thickness compared within the original: "thin" / "medium" / "thick". null when no difference is visible.
   - Shape of one entry: {"taskUid": uid, "shapeKind": value above, "milestoneGlyph": value above or null, "fillColor": colour or null, "strokeColor": colour or null, "lineWeight": weight or null}
```
新
```text
   - strokeWidthPx is the outline thickness compared within the original, as an integer from 1 to 10 (px). When you see three weights, thin / medium / thick, write 1 / 2 / 3. null when no difference is visible.
   - Shape of one entry: {"taskUid": uid, "shapeKind": value above, "milestoneGlyph": value above or null, "fillColor": colour or null, "strokeColor": colour or null, "strokeWidthPx": weight or null}
```

<!-- EDIT id=E-24 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:1338`、1 行）
```text
| VG-5 | 測る端 | 上の形の描いた下端と、下の形の描いた上端のあいだで測ること（MUST）。<br>描いた端は、表 T-038 の `OC-6` を含めて形が縦に取る広がりの端とし、枠線を持つ形では枠線の外側の縁とする —— 枠線（`S-39` に描く比を掛けた太さ）は形の端を中心に引くので、その半分が形の外へ出る。<br>⭐ 線だけの形（表 T-012 の `SH-3` / `SH-4`）の 1 段目は、字の大きさで数えること（MUST） —— 描いた字の箱ではない（`FR-109` の 表 T-271 の `XS-4`）。<br>⚠️ 再開アイコンの縦棒が下の隙間へ出るぶんは、本行の端に数えない —— 数えると、中断にするたびに段が動く |
```
新
```text
| VG-5 | 測る端 | 上の形の描いた下端と、下の形の描いた上端のあいだで測ること（MUST）。<br>描いた端は、表 T-038 の `OC-6` を含めて形が縦に取る広がりの端とし、枠線を持つ形では枠線の外側の縁とする —— 枠線（その形の枠線の太さの列 `AT-104` の値、`null` のときは `S-39` に、描く比を掛けた太さ）は形の端を中心に引くので、その半分が形の外へ出る。<br>⭐ 線だけの形（表 T-012 の `SH-3` / `SH-4`）の 1 段目は、字の大きさで数えること（MUST） —— 描いた字の箱ではない（`FR-109` の 表 T-271 の `XS-4`）。<br>⚠️ 再開アイコンの縦棒が下の隙間へ出るぶんは、本行の端に数えない —— 数えると、中断にするたびに段が動く |
```

<!-- EDIT id=E-25 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:3762`、1 行）
```text
| BL-3 | 線 | 塗らず、輪郭の線だけを描くこと（MUST）。<br>色は `_assets/tbl-settings.md` の 表 T-236 の `S-443`、太さは同書の 表 T-201 の `S-39`（予定の輪郭と同じ太さ）、破線の刻みは同書の 表 T-206 の `S-444` とする。<br>⛔ 刻みを 表 T-208 の `S-104`（予実の補助線）や 表 T-206 の `S-175`（選択の枠）と同じ組にしてはならない（MUST NOT） —— 色だけで区別しない規則（`FR-015`）を、刻みでも守る |
```
新
```text
| BL-3 | 線 | 塗らず、輪郭の線だけを描くこと（MUST）。<br>色は `_assets/tbl-settings.md` の 表 T-236 の `S-443`、太さは同書の 表 T-201 の `S-39`（枠線の太さを指定していない予定の輪郭と同じ太さ —— 今の予定の `AT-104` は継がない）、破線の刻みは同書の 表 T-206 の `S-444` とする。<br>⛔ 刻みを 表 T-208 の `S-104`（予実の補助線）や 表 T-206 の `S-175`（選択の枠）と同じ組にしてはならない（MUST NOT） —— 色だけで区別しない規則（`FR-015`）を、刻みでも守る |
```

<!-- EDIT id=E-30 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:1904`、1 行）
```text
⛔ **項目名は値の欄の左に置き、右詰めにすること（MUST）**—— **名前と値の境目が縦に揃っていないと、目が行ごとに境目を探し直すことになる。**  
```
新
```text
⛔ **項目名は値の欄の左に置き、右詰めにすること（MUST）**—— **名前と値の境目が縦に揃っていないと、目が行ごとに境目を探し直すことになる。**  
⭐ ただし、色の行（入力の型が `色` の行）は、項目名を欄の上の 1 行に置くこと（MUST） —— 色の欄は見本の段を持つ背の高い欄であり（表 T-017b の `CV-9` の ⓪）、名を左に置くと、見本の段が名の幅だけ狭くなる。  
```

<!-- EDIT id=E-31 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:5572`、12 行）
```text
⭐ 3 つの列が `null` のときは、表 T-217 の同じ列の既定で描くこと（MUST） —— 既定の 1 行を替えれば、値を置いていない箱がすべて追随する。  
⭐ `HighlightBox.fillColor`（`AT-146`）は、描いた箱の内側を、パレット色なら `_assets/tbl-settings.md` の 表 T-294 がその名に持つ塗りの値で、カスタムカラーなら 表 T-017b の `CV-3` で決まった値そのもので、不透明度を 1 − `AT-147` ÷ 100 として塗ること（MUST） —— 描く値の選び方は同表の `CV-6` に従い、`CV-10` の導出は実績バーの塗りだけに当たるのでここには当てない。  
`AT-147` は透過率（0 は不透明、100 は透明）である。  
塗りの色が透明の箱は塗らない（`S-370` の既定は透明である）。  
⭐ 塗りは `FR-110` の 表 T-020 の `ZO-14` に描くこと（MUST） —— バーと字より手前に色を重ねると、表 T-017a の `CT-1` 〜 `CT-5` を測った組が崩れる。  
⭐ 表 T-217 の数値の列（`AT-122` ・ `AT-145` ・ `AT-147` ・ `AT-149` ・ `AT-151`）が同表の下限と上限の外の値を持つ文書を読んだときは、範囲へ寄せて描き、文書を書き換えないこと（MUST） —— 1 つの見せ方の値のために文書を拒めば、ほかの値まで読めなくなる（`05-07-design.md` が `documentSettings` について述べる寛さと同じである）。  
⭐ 同じ範囲の外の値を置く命令（表 T-108 の `CM-77` ・ `CM-79` ・ `CM-81` ・ `CM-83`）は拒むこと（MUST） —— 範囲へ寄せて書くと、置いた値と保存された値が食い違う。  
その固定色は、テーマの色相・依存線・イナズマ線のいずれからも離した色とすることが望ましい（SHOULD）—— 注記が日程の要素と見分けられなくなる。  
⚠️ **離すことを MUST にはしない（SHOULD に留める）** —— 注記の色は色相 26 で依存線と同じ色相であるが、大きな問題ではないので、困ったときに直す。  
ハイライトボックスの枠の線に透明を選ばせてはならない（MUST NOT） —— 枠は箱を掴む唯一の所であり（表 T-246 の `HB-12`）、塗りは透明でありうるので、線を透明にすると掴む所が見えなくなる。  
⭐ 塗りには透明を選ばせてよい —— 塗りの欄は 表 T-017b の `CV-9` のとおり透明を並べる。  
色の欄のテーマに戻す入口は、塗りを `null`（`_assets/tbl-settings.md` の `S-370` の色で描く、既定は透明）へ戻す。  
```
新
```text
⭐ 線の太さと透過率の列が `null` のときは、表 T-217 の同じ列の既定で描くこと（MUST） —— 既定の 1 行を替えれば、値を置いていない箱がすべて追随する。  
⭐ 塗りの色の列が `null` のときは、テーマの色（`_assets/tbl-settings.md` の 表 T-236 の `S-155`）で塗ること（MUST） —— `null` は色の欄の「プロジェクトテーマ色」（表 T-017b の `CV-9` の ②）であり、透明（塗潰しなし）とは別の値である。  
⭐ 置くとき（表 T-108 の `CM-52`）は、塗りの色の列に 表 T-217 の `S-370`（透明）を写すこと（MUST） —— 新しい箱は今までどおり塗らずに置く。  
⭐ `HighlightBox.fillColor`（`AT-146`）は、描いた箱の内側を、パレット色なら `_assets/tbl-settings.md` の 表 T-294 がその名に持つ塗りの値で、カスタムカラーなら 表 T-017b の `CV-3` で決まった値そのもので、不透明度を 1 − `AT-147` ÷ 100 として塗ること（MUST） —— 描く値の選び方は同表の `CV-6` に従い、`CV-10` の導出は実績バーの塗りだけに当たるのでここには当てない。  
`AT-147` は透過率（0 は不透明、100 は透明）である。  
塗りの色が透明の箱は塗らない —— 後ろが見える。  
⭐ 塗りは `FR-110` の 表 T-020 の `ZO-14` に描くこと（MUST） —— バーと字より手前に色を重ねると、表 T-017a の `CT-1` 〜 `CT-5` を測った組が崩れる。  
⭐ 表 T-217 の数値の列（`AT-122` ・ `AT-145` ・ `AT-147` ・ `AT-149` ・ `AT-151`）が同表の下限と上限の外の値を持つ文書を読んだときは、範囲へ寄せて描き、文書を書き換えないこと（MUST） —— 1 つの見せ方の値のために文書を拒めば、ほかの値まで読めなくなる（`05-07-design.md` が `documentSettings` について述べる寛さと同じである）。  
⭐ 同じ範囲の外の値を置く命令（表 T-108 の `CM-77` ・ `CM-79` ・ `CM-81` ・ `CM-83`）は拒むこと（MUST） —— 範囲へ寄せて書くと、置いた値と保存された値が食い違う。  
その固定色は、テーマ色・依存線・イナズマ線のいずれからも離した色とすることが望ましい（SHOULD）—— 注記が日程の要素と見分けられなくなる。  
⚠️ **離すことを MUST にはしない（SHOULD に留める）** —— 注記の色は色相 26 で依存線と同じ色相であるが、大きな問題ではないので、困ったときに直す。  
ハイライトボックスの枠の線にも、タスクと同じく透明（線なし）を選ばせること（MUST） —— 線が透明でも、枠を掴む所（表 T-246 の `HB-12`）は同じ所に残る。  
⛔ ただし、塗りと枠の線を同時に透明にすることを許してはならない（MUST NOT） —— `FR-007` の同じ禁止であり、箱が見えなくなる（`05-07-design.md` の 表 T-220 の `IV-9`）。  
⭐ 塗りには透明を選ばせてよい —— 塗りの欄は 表 T-017b の `CV-9` のとおり透明を並べる。  
色の欄の ② の入口は、塗りを `null`（テーマの色 `S-155` で塗る）へ、枠の線を `null`（注記の色 `S-312` で描く —— 語は既定の色）へ戻す。  
```

<!-- EDIT id=E-32 file=docs/spec/01-04-requirements.md -->
旧（`01-04-requirements.md:4053`、1 行）
```text
| HB-12 | 枠（掴み点を除く枠線） | 描いた枠線。<br>掴み代は、描いた線の縁から内と外へ 表 T-206 の `S-293`（線の中心から、描いた太さ `_assets/fig-erd-detail.md` の `AT-145` の半分に `S-293` を足した距離）。<br>描いた形の上では、描いた線そのもの（線の中心から太さの半分）だけ。<br>引けば大きさを変えずに箱を動かし、離したときは、横は引いた量で日の列ごとに平行に移し（予定の平行移動と同じ読み）、縦は `HB-3` を置く。<br>ポインタは `PK-11` | 本体は枠線の近くだけであり、内側は素通しにする（利用者の指示である）。<br>利用者が指定した枠の掴み代 3px は、描いた線から測る。<br>形の上の読みは依存線と同じである（表 T-267 の `HT-1`） |
```
新
```text
| HB-12 | 枠（掴み点を除く枠線） | 描いた枠線。<br>掴み代は、描いた線の縁から内と外へ 表 T-206 の `S-293`（線の中心から、描いた太さ `_assets/fig-erd-detail.md` の `AT-145` の半分に `S-293` を足した距離）。<br>描いた形の上では、描いた線そのもの（線の中心から太さの半分）だけ。<br>⭐ 枠の線が透明（線なし）でも、掴み代は同じ所に同じ幅で置くこと（MUST） —— 掴み代は枠の位置と太さ（`AT-145`）で決まり、線の色によらない。<br>引けば大きさを変えずに箱を動かし、離したときは、横は引いた量で日の列ごとに平行に移し（予定の平行移動と同じ読み）、縦は `HB-3` を置く。<br>ポインタは `PK-11` | 本体は枠線の近くだけであり、内側は素通しにする（利用者の指示である）。<br>利用者が指定した枠の掴み代 3px は、描いた線から測る。<br>形の上の読みは依存線と同じである（表 T-267 の `HT-1`） |
```

<!-- EDIT id=E-33 file=docs/spec/_source/erd.json -->
旧（`erd.json:2790`、14 行）
```json
     "seat": 121,
     "name": "strokeColor",
     "type": "文字列",
     "nullable": "可",
     "json": {
      "kind": "color",
      "null": true,
      "transparent": false
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "枠の色。形は `AT-102` と同じ。ただし透明は取らない（`FR-019`）"
```
新
```json
     "seat": 121,
     "name": "strokeColor",
     "type": "文字列",
     "nullable": "可",
     "json": {
      "kind": "color",
      "null": true
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "枠の色。形は `AT-102` と同じ。透明（線なし）も取るが、塗り（`AT-146`）と同時には取らない（`FR-019`）。`null` は注記の色 `S-312` で描く"
```

<!-- EDIT id=E-34 file=docs/spec/_source/erd.json -->
旧（`erd.json:2851`、1 行）
```json
      "ja": "塗りの色。形は `AT-102` と同じ。透明も取る。`null` は `_assets/tbl-settings.md` の表 T-217 の `S-370` の色で描く（既定は透明 ＝ 塗らない。`FR-019`）"
```
新
```json
      "ja": "塗りの色。形は `AT-102` と同じ。透明も取る。`null` はテーマの色（`_assets/tbl-settings.md` の表 T-236 の `S-155`）で塗る。置くときは表 T-217 の `S-370`（透明）を写す（`FR-019`）"
```

<!-- EDIT id=E-35 file=docs/spec/_source/settings.json -->
旧（`settings.json:7594`、1 行）
```json
      "ja": "ハイライトボックスの塗りの色（`AT-146`。綴りは表 T-294 の保存する綴り）。列が `null` のときに描く値である。⭐ 既定の透明は、本行より前の箱の見え方（塗り無し）である。色の欄のテーマに戻す入口は列を `null` へ戻す（`FR-019`、表 T-017b の `CV-9`）"
```
新
```json
      "ja": "ハイライトボックスの塗りの色（`AT-146`。綴りは表 T-294 の保存する綴り）。箱を置くときに列へ写す値である（`null` はテーマの色 `S-155` で塗る —— `FR-019`）。⭐ 既定の透明は、本行より前の箱の見え方（塗り無し）である。色の欄の ② の入口は列を `null` へ戻す（表 T-017b の `CV-9`）"
```

<!-- EDIT id=E-36 file=docs/spec/_source/settings.json -->
旧（`settings.json:7666`、1 行）
```json
     "ja": "⚠️ **本表の値は日程データの群に入る** —— 収まる先が注記（`HighlightBox` と `CommentBox`）の列だからである。**どちらの群に属するかの判定は表 T-052 が持つ** （表 T-209 と同じ扱いである）。⚠️ `S-132` は置くときに列へ写す。`S-369` 〜 `S-371` と `S-374` ・ `S-375` は写さない —— 列は `null` のまま置き、描くときに本表の既定で描く（`FR-019`）"
```
新
```json
     "ja": "⚠️ **本表の値は日程データの群に入る** —— 収まる先が注記（`HighlightBox` と `CommentBox`）の列だからである。**どちらの群に属するかの判定は表 T-052 が持つ** （表 T-209 と同じ扱いである）。⚠️ `S-132` と `S-370` は置くときに列へ写す（`S-370` を写すのは、`HighlightBox.fillColor` の `null` がテーマの色で塗るからである）。`S-369` ・ `S-371` と `S-374` ・ `S-375` は写さない —— 列は `null` のまま置き、描くときに本表の既定で描く（`FR-019`）"
```

<!-- EDIT id=E-37 file=docs/spec/05-07-design.md -->
旧（`05-07-design.md:1292`、1 行）
```text
| IV-9 | `TaskVisual` の `fillColor` と `strokeColor` が同時に透明でないこと | その 2 列と、透明を表す値（`_assets/tbl-glossary.md` の `P-19`） | 組合せ |
```
新
```text
| IV-9 | `TaskVisual` と `HighlightBox` のそれぞれで、`fillColor` と `strokeColor` が同時に透明でないこと | 実体ごとのその 2 列と、透明を表す値（`_assets/tbl-glossary.md` の `P-19`） | 組合せ |
```

### 4.2 規則で当てる編集（E-26 〜 E-29）

<!-- EDIT id=E-26 file=docs/spec/_source/property-items.json -->
**E-26 —— 表 T-016 の原稿の `items` を、下の表の順と中身にする。**
規則: ① 下の表の順が `items` の順である（`FR-006` の印刷順）。② 「今のまま」の項は、`note`・`mspdi` と、表に書いていない鍵を今の原稿から変えない。③ `対象` が `Task` の項はどれも `shownFor` を持ち、ほかの項は持たない（E-21）。④ `oneInput` は「はい」の項だけが持ち、そのとき `inputKinds` は 1 つ。⑤ `isReadOnly` は「はい」の項だけが持つ。⑥ `appliesTo` は `Task` の項では書かない（無いものは `Task` —— 今の原稿の形）。
確かめ: `npm run gen:items` が `wrote docs/spec/_assets/tbl-property-items.md  (38 row(s))` と言う。

| # | `id` | `columns` | `inputKinds` | `isReadOnly` | 対象 | `shownFor` | `oneInput` | `note.ja` | `mspdi.ja` |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `PR-1` | `name` | 文字 | — | Task | `both` | — | 今のまま | 今のまま |
| 2 | `PR-34` | `uid` | 数値 | はい | Task | `both` | — | `**読み取り専用。** 文書の中で一意・不変の番号（`_assets/fig-erd-detail.md` の `AT-24`）。表示するだけであり、書き出しの順で変わる `Task/ID`（`DV-4`）ではない` | `` `Task/UID` `` |
| 3 | `PR-3` | `start`・`finish` | 日付・日付 | — | Task | `task` | — | 今のまま | 今のまま |
| 4 | `PR-35` | `start`・`finish` | 日付 | — | Task | `milestone` | はい | `マイルストーンの**予定**の日。1 つの入力で `start` と `finish` へ同じ日を書く（表 T-108 の `CM-11`） —— MSPDI のマイルストーンは開始と終了が同じ日である。空のまま確定したときの扱いは `FR-006` の `start` ／ `finish` の欄と同じ` | `` `Task/Start` `Task/Finish`（同じ日） `` |
| 5 | `PR-16` | `assignee` | 選択 | — | Task | `both` | — | 今のまま | 今のまま |
| 6 | `PR-4` | `actualStart` | 日付 | — | Task | `task` | — | 今のまま | 今のまま |
| 7 | `PR-5` | `actualDuration` | 数値 | — | Task | `task` | — | 今のまま | 今のまま |
| 8 | `PR-6` | `actualFinish` | 日付 | — | Task | `task` | — | 今のまま | 今のまま |
| 9 | `PR-36` | `actualStart`・`actualFinish` | 日付 | — | Task | `milestone` | はい | `マイルストーンの実績の日。1 つの入力で `actualStart` と `actualFinish` へ同じ日を書き、表 T-019 の `PA-5`（完了）に置く。空にしたときは両方を空にして `PA-1`（未着手）に置く（どちらも 表 T-108 の `CM-13`）` | `` `Task/ActualStart` `Task/ActualFinish`（同じ日） `` |
| 10 | `PR-9` | `percentComplete` | 数値 | はい | Task | `task` | — | 今のまま | 今のまま |
| 11 | `PR-10` | `deadline` | 日付 | — | Task | `both` | — | 今のまま | 今のまま |
| 12 | `PR-2` | `notes` | 複数行 | — | Task | `both` | — | 今のまま | 今のまま |
| 13 | `PR-7` | `resume` | 日付 | — | Task | `task` | — | 今のまま | 今のまま |
| 14 | `PR-8` | `resumeValid` | 真偽 | — | Task | `task` | — | 今のまま | 今のまま |
| 15 | `PR-17` | `milestoneGlyph` | 選択 | — | Task | `milestone` | — | `マイルストーンの図形（`_assets/fig-erd-detail.md` の `AT-101`）。置いた後も変えられること（`FR-078`）` | 今のまま |
| 16 | `PR-14` | `fadeInDays`・`fadeOutDays` | 数値・数値 | — | Task | `task` | — | 今のまま | 今のまま |
| 17 | `PR-15` | `wbsParentUid` | 選択 | — | Task | `both` | — | 今のまま | 今のまま |
| 18 | `PR-37` | `predecessors` | 文字 | はい | Task | `both` | — | `**読み取り専用。** 文書の列ではない —— この `Task` を後続に持つ依存（`Dependency`）の先行タスクを、1 本につき 1 行、`FR-038` の辞書の形（名と `uid`）で示す。並びは先行の `uid` の昇順。依存が無いときは空の欄とする` | `` `Task/PredecessorLink/PredecessorUID` `` |
| 19 | `PR-38` | `successors` | 文字 | はい | Task | `both` | — | `**読み取り専用。** 文書の列ではない —— この `Task` を先行に持つ依存の後続タスクを、1 本につき 1 行、`FR-038` の辞書の形（名と `uid`）で示す。並びは後続の `uid` の昇順。依存が無いときは空の欄とする` | `無い（後続のタスクの `PredecessorLink` から導く）` |
| 20 | `PR-12` | `fillColor` | 色 | — | Task | `both` | — | `塗りの色（`FR-007`）。欄の並べ方は 表 T-017b の `CV-9`` | 今のまま |
| 21 | `PR-39` | `strokeColor` | 色 | — | Task | `both` | — | `枠線の色（`FR-007`）。欄の並べ方は 表 T-017b の `CV-9`` | `無い（`GRS JSON` のみ）` |
| 22 | `PR-40` | `strokeWidthPx` | 数値 | — | Task | `both` | — | `枠線の太さ（px、予定バーと実績バーの縁の両方に掛ける。`_assets/fig-erd-detail.md` の `AT-104`）。空の欄は `null` ＝ `_assets/tbl-settings.md` の 表 T-201 の `S-39` の太さで描く。範囲は `AT-104` が持つ` | `無い（`GRS JSON` のみ）` |
| 23 〜 26 | `PR-18`・`PR-20`・`PR-33`・`PR-19` | 今のまま | 今のまま | 今のまま | TaskGroup | 持たない | — | 今のまま | 今のまま |
| 27 〜 30 | `PR-21`・`PR-26`・`PR-27`・`PR-28` | 今のまま | 今のまま | 今のまま | CommentBox | 持たない | — | 今のまま | 今のまま |
| 31 | `PR-23` | 今のまま | 今のまま | 今のまま | HighlightBox | 持たない | — | 今のまま | 今のまま |
| 32 | `PR-24` | 今のまま | 今のまま | 今のまま | HighlightBox | 持たない | — | 今のまま | 今のまま |
| 33 | `PR-22` | 今のまま | 今のまま | 今のまま | HighlightBox | 持たない | — | `ハイライトボックスの枠の色（`CM-55`）。`null` ＝ 注記の色 `S-312`（テーマ色に従わない —— 色の欄の語は既定の色）。透明（線なし）も取るが、塗りと同時には取らない（`FR-019`、表 T-017b の `CV-9`）` | 今のまま |
| 34 | `PR-25` | 今のまま | 今のまま | 今のまま | HighlightBox | 持たない | — | `塗りの色。`null` ＝ テーマの色（`_assets/tbl-settings.md` の 表 T-236 の `S-155`）。置くときは同書の `S-370`（透明 ＝ 塗らない）を写す。規則は `FR-019`` | 今のまま |
| 35 | `PR-41` | `linkType` | 文字 | はい | Dependency | 持たない | — | `**読み取り専用。** 依存の種別（`_assets/fig-erd-detail.md` の `AT-46`）。`FR-009` の 表 T-018 の `名` の欄の略号で示し、保存した数を出さない。種別を変える命令は無い（表 T-108 の `CM-36` 〜 `CM-38`）` | `` `PredecessorLink/Type` `` |
| 36 | `PR-42` | `lag` | 数値 | — | Dependency | 持たない | — | `ラグ（`_assets/fig-erd-detail.md` の `AT-47`）。単位は `_assets/tbl-settings.md` の 表 T-213。依存線の行のうち編集できるのは本行だけである（`FR-009`、表 T-108 の `CM-38`）` | `` `PredecessorLink/LinkLag` `` |
| 37 | `PR-43` | `predecessorUid` | 文字 | はい | Dependency | 持たない | — | `**読み取り専用。** 先行タスク（`_assets/fig-erd-detail.md` の `AT-45`）。`FR-038` の辞書の形（名と `uid`）で示す` | `` `PredecessorLink/PredecessorUID` `` |
| 38 | `PR-44` | `successorUid` | 文字 | はい | Dependency | 持たない | — | `**読み取り専用。** 文書の列ではない —— 依存を入れ子で持つ後続タスク（`_assets/fig-erd-detail.md` の `ET-3`）。`FR-038` の辞書の形（名と `uid`）で示す` | `無い（入れ子の位置が表す）` |

⚠️ 表の `note.ja` の欄の外側の 1 組の逆引用符は、この表で文を囲むための印であり、原稿には書かない（中の `` `…` `` は書く）。
⚠️ 行 27 〜 34 は今の原稿の順のまま（`PR-21`・`PR-26`・`PR-27`・`PR-28` と `PR-23`・`PR-24`・`PR-22`・`PR-25`）。並べ替えない（`DFC-1412`）。
⚠️ 行 1 〜 22 の `note.ja` の「今のまま」のうち、`PR-12` の今の備考「FR-007」は上の文に置き換わる（行 20）。

<!-- EDIT id=E-27 file=docs/spec/_source/property_items_json_to_md.py -->
**E-27 —— 生成器が刷る表と文を次のとおりにする**（生成器のコードは当てる体が書く。刷られた `tbl-property-items.md` に次の字が出ること）。
1. 見出しの行: `| 行 ID | 列（`GRS JSON`）| 入力の型 | 対象 | 出す種類 | 備考 | MSPDI |`（区切りの行も 7 列）。
2. `出す種類` の欄: `shownFor` の値を逆引用符で囲んで刷る（`` `task` ``・`` `milestone` ``・`` `both` ``）。持たない項は `—`。
3. `入力の型` の欄: `oneInput` の項は、その 1 つの型の後に `（1 つの入力）` を付ける（例: `日付（1 つの入力）`）。読み取り専用の印（`（読み取り専用）`）はその後ろ。
4. 前文の「本書は全数と、各行の列・入力の型・対象・備考・交換相手の対応を印字する。」を「本書は全数と、各行の列・入力の型・対象・出す種類・備考・交換相手の対応を印字する。」にする。
5. 前文の `対象` の段（「⛔ **`対象` の欄は、…」）の後ろに、次の段を足す:
   `⛔ **`出す種類` の欄は、対象が `Task` の行を、タスクとマイルストーンのどちらを選んだときに出すかを言う（MUST）** —— `FR-006` が `Task.milestone` で絞ると定める。⚠️ **対象が `Task` でない行は欄を持たない（`—`）。**`
6. 拒むもの（`problems`）を 3 つ足す: 対象が `Task` の項に `shownFor` が無い ／ 対象が `Task` でない項に `shownFor` が在る ／ `oneInput` の項の `inputKinds` が 1 つでない。今の「列の数 ＝ 型の数」は `oneInput` の項にだけ当てない。

<!-- EDIT id=E-28 file=docs/spec/_source/display-words.json -->
**E-28 —— 辞書に足す項。**（E-17 〜 E-20 が書き換える 4 項のほかに）
① `properties` に 11 項を足す。置く位置は表 T-016 の同じ行の並び（E-26 の表）に合わせる。

| `rowId` | `label.ja` | `label.en` |
|---|---|---|
| `PR-34` | UID | UID |
| `PR-35` | 予定日 | planned date |
| `PR-36` | 実績日 | actual date |
| `PR-37` | 先行 | predecessors |
| `PR-38` | 後続 | successors |
| `PR-39` | 枠線色 | outline colour |
| `PR-40` | 枠線幅（px） | outline width (px) |
| `PR-41` | 種別 | type |
| `PR-42` | ラグ | lag |
| `PR-43` | 先行 | predecessor |
| `PR-44` | 後続 | successor |

② `colourField` の末尾（`themeHint` の項の後ろ）に 2 項を足す: `{"part": "noFill", "text": {"ja": "塗潰しなし", "en": "No fill"}}`・`{"part": "noLine", "text": {"ja": "線なし", "en": "No line"}}`（`CV-9` の ④ の透明の入口の語）。
③ 新しい節 `propertyField`（形は `colourField` と同じ `part` ／ `text`）を `colourField` の後ろに足す: `{"part": "dependencyEnd", "text": {"ja": "{name}（UID {uid}）", "en": "{name} (UID {uid})"}}`（依存の端と先行・後続の 1 行の形。名が空なら `{name}` を空にする）・`{"part": "addResource", "text": {"ja": "“{name}” を追加", "en": "Add “{name}”"}}`（`AS-5` の足す項目）。
④ `colourField` にさらに 3 項を足す（JDG-990 の問い 1・問い 4）: `{"part": "themeMark", "text": {"ja": "(テーマ)", "en": "(theme)"}}`・`{"part": "defaultMark", "text": {"ja": "(既定)", "en": "(default)"}}`（`CV-9` の `null` の印）・`{"part": "defaultColour", "text": {"ja": "既定の色", "en": "Default colour"}}`（`CV-9` の ② の、色相に従わない欄の語）。
確かめ: `npm run words` が通り、`properties` は 38 項、`colourField` は 12 項、`propertyField` は 2 項。

<!-- EDIT id=E-29 file=docs/spec -->
**E-29 —— 手書きの原稿の「テーマの色相」を「テーマ色」に（38 回、36 行 —— 残る 1 回の `01-04-requirements.md:5579`（`FR-019`）は E-31 の新が書く）、en の「theme hue」を「theme colour」に（6 回、6 行）置き換え、`K-60` の en の語を `theme colour` にする。**（ja は `JDG-864`・`JDG-922` の #15、en は利用者の答え（2026-10-01、JDG-966））
例外 2 つ: `erd.json:759`（`AT-19`）と `settings.json:2122`（`S-73`）の値の説明の頭「テーマの色相。」は「テーマ色の色相。」とする —— 値は色相の数である。
en の例外 1 つ: `row-id-prefixes.json:1297` の `TH` の `words` は「Theme Hue」→「Theme Colour (Hue)」 —— 接頭辞 `TH` の頭字の出どころを残す。ほかの en は「theme hue」→「theme colour」（大文字・小文字はその場のまま）。
当てる前に数える: 下の表の行と回がそのままであること。当てた後に数える: `git grep -c "テーマの色相" -- docs/spec` と `git grep -c -i "theme hue" -- docs/spec` がどちらも 0 —— `npm run gen` の後（`tbl-settings.md`・`fig-erd-detail.md`・`tbl-row-id-prefixes.md`）と、`npm run gen:components` の後（`view-read.drawio`・`view-read.svg`。`npm run gen` には入っていない。`.svg` は draw.io が要る —— `docs/spec/_source/build.py` の頭の注）。
⚠️ E-01 〜 E-28・E-30 〜 E-37 のうち「テーマの色相」を持つのは E-31 の旧だけ（`:5579` の 1 回）で、E-31 の新がそれを「テーマ色」に書く（13 節で数えた）⇒ 下の表は `:5579` を除き、同じ行を 2 度書かない。

| ファイル | 行（`0590ad03`） | 回 |
|---|---|---|
| `docs/spec/01-04-requirements.md` | 229（`LM-18`）・1969（`FR-072`）・2067・2068・2069・2072・2089・2101・2102（`FR-041`）・2119（表 T-305 の題）・6253（`DR-5`）・6661・8065（`:5579` は E-31） | 13 |
| `docs/spec/_assets/tbl-glossary.md` | 251（`K-60`）・418（`CM-5`）・549（`IC-17`） | 3 |
| `docs/spec/_source/display-words.json` | 262（`IC-17` の説明）・1907（`K-60` の語） | 2 |
| `docs/spec/_source/display-words.json`（en） | 263（`IC-17` の `hint.en` の「the theme hue」）・1908（`K-60` の `label.en` の `themeHue` —— 「theme hue」の grep には当たらないが語である。`theme colour` にする） | 1 ＋ 語 1 |
| `docs/spec/_source/components.json`（en） | 346・556・696（`description` の「the document's theme hue」）・583（`label` の「colours + theme hue」） | 4 |
| `docs/spec/_source/row-id-prefixes.json`（en） | 1297（`TH` の `words`、上の例外） | 1 |
| `docs/spec/_source/erd.json` | 759（`AT-19`、例外） | 1 |
| `docs/spec/_source/row-id-prefixes.json` | 1300（`TH` の意味） | 1 |
| `docs/spec/_source/settings.json` | 2122（`S-73`、例外）・4738（`S-368`）・5405・5545・5565・5585・5679（2 回）・5697・5717・5893・5933・5973・6013・6053・6073（2 回）・6126 | 18 |

---

## 重なり

後の変更要求（`CR-607`・`CR-609`）は、次の所を本書が書き換えた後の文に載せ直すこと。

| 所 | 本書の編集 | 本書の後の文（変わる語だけ） | 載せ直す変更要求 |
|---|---|---|---|
| `FR-072` の STATEMENT の「`FR-041` のテーマの色相の欄がこれである。」（`01-04-requirements.md:1969`） | E-29 | 「`FR-041` のテーマ色の欄がこれである。」 | `CR-609`（`FR-072`） |
| 表 T-109 の `IC-17` の行（`tbl-glossary.md:549`） | E-29 | 「⭐ テーマ色は、その面の先頭の欄で選ぶ（`FR-041` の 表 T-305）」 | `CR-609`（`IC-17`）・`CR-607` |
| `display-words.json` の `IC-17` の `hint.ja` ・ `hint.en`（`:262`・`:263`） | E-29 | 「文書の描画設定をプロパティパネルに表示する。テーマ色もここで選ぶ」 ／ 「… where the theme colour is chosen」 | `CR-609`（押し直しで閉じると言い足すなら） |
| 表 T-305 の題（`01-04-requirements.md:2119`） | E-29 | 「**表 T-305 — テーマ色の選択肢**」 | `CR-607`（表 T-305） |
| `FR-041` の STATEMENT と後の段（`:2067`・`:2068`・`:2069`・`:2072`・`:2089`・`:2101`・`:2102`） | E-29 | 「テーマの色相」→「テーマ色」だけ | `CR-607`（テーマ色の欄の上の入口） |
| `settings.json` の `S-368`（`:4738`、テーマ色の欄の 1 段の見本の数） | E-29 | 「文書の設定の面の、テーマ色の欄の 1 段に並べる見本の数」 | `CR-607`（欄の上に入口を足すなら） |
| 表 T-108 の `CM-5`（`tbl-glossary.md:418`） | E-29 | 「テーマ色を変える」 | — |

⚠️ 誘導グラフの閉路 `CV-9`・`FR-007`・`FR-041`・`FR-072`・`IC-17`（13 節）: 本書は `CV-9`（E-05）と `FR-041`・`FR-072`・`IC-17`（E-29）を**同じ 1 つの波**で書く。`CR-607`・`CR-609` もこの閉路に触れるので、それぞれが自分の波で 1 度に書く（当てる順が波を分ける）。
⚠️ 本書は `FR-055`（`CR-608`）・`NT-7`（`CR-607`）・表 T-305 の行（`CR-607`）・状態機械 T-280（`CR-609`）に触れない。

---

## 5. 継ぎ目 —— 依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- Table T-016 (docs/spec/_source/property-items.json) is the whole list of panel rows, now also for a
  selected dependency line (appliesTo "Dependency"). A Task row carries shownFor: task | milestone |
  both. A task whose Task.milestone is true gets the milestone and both rows; otherwise task and both.
  Never decide by TaskVisual.shapeKind.
- oneInput rows (the milestone's planned date: start+finish; its actual date: actualStart+actualFinish)
  draw ONE date input. Planned date writes CM-11 setTaskPlanDates with start = finish. Actual date
  writes CM-13 setTaskPlanActualState at PA-5 (both columns the same day) or, when emptied, PA-1.
  No new command.
- PR-1's name is labelled from display-words properties[PR-1].label for a task and
  properties[PR-1].milestoneLabel for a milestone.
- Read-only rows show text only: uid; predecessors / successors (one line per dependency,
  display-words propertyField.dependencyEnd "{name}（UID {uid}）", ordered by the other end's uid);
  dependency linkType as the T-018 abbreviation (FS/SF/FF/SS); predecessorUid / successorUid as
  dependencyEnd. Only the dependency lag is editable (CM-38).
- Colour field order (CV-9): (0) the row name alone on its line (FR-006 exception for colour rows),
  (1) light/dark side line, (2) theme entry (null), (3) 10 swatches, 5 per
  row (S-338), (4) transparent entry then custom entry. The transparent entry's word is
  colourField.noFill on fillColor / TaskGroup.color and colourField.noLine on strokeColor; fields that
  refuse transparent keep its slot empty (comment box line and text only; the highlight box outline
  now offers "no line"). The theme entry reads colourField.theme where null draws a T-236 row whose
  hue column is a circle, else colourField.defaultColour (box outline S-312, comment text S-147).
  While the value is null each side shows the swatch painted with the drawn null colour and the mark
  colourField.themeMark / defaultMark instead of a value. The side line may break into two lines
  (light / dark) when the panel is narrow. Reference layout:
  previous-project-result/25-colour-input-layout/index.html
- TaskVisual.lineWeight is gone; TaskVisual.strokeWidthPx is an integer 1..10 or null (null draws S-39).
  Command setTaskVisualStrokeWidth (CM-24). It is drawn on the plan and actual outline AND used by the
  geometry wherever S-39 was (VG-5: measure from the outline's outer edge). BL-3 keeps S-39.
  S-369 / S-374 upper bound is 10.
- HighlightBox: strokeColor may be transparent; fill and stroke both transparent is refused (IV-9,
  CM-55 / CM-78). The frame grab band (HB-12) stays where the frame is, at the stroke width, whatever
  the stroke colour. fillColor null paints S-155 (PND-609) with the S-371 transparency; a new box
  (CM-52) stores fillColor "transparent" (S-370), so it still looks unfilled. GRS JSON keeps no old-format reading (no lineWeight conversion).
- Assignee field (AS-5): each field is ONE combo input. Candidates = roster, filtered by the SV-4
  comparison, ordered by name ascending (IC-123 / IC-124 switch the direction, not remembered), same
  names by uid. When no candidate's name EQUALS the typed text (and the text is not "-"), the last item
  is propertyField.addResource. Writing happens only on choosing an item, or on an unhighlighted
  commit (Enter, IN-6 outside press) whose text equals a candidate name (AS-8 on duplicates);
  otherwise nothing is written and the typed text is dropped. CM-40 is issued ONLY when the add item is
  chosen (AS-7).
```

## 6. グラフ（`0590ad03`）

- `impact.py FR-006 FR-009 PR-1 PR-3 PR-12 PR-16 PR-17 PR-18 AS-5 AS-7 CV-9 AT-104 K-60 T-016 T-017b`:
  - `FR-006`: 指される 要求 5 件・参照 26 か所（`FR-099`・`FR-011`×2・`FR-043`・`FR-029`・`FR-040`、5.2・5.3 節、表 T-108 の前文、`tbl-property-items.md`、`tbl-settings.md` の 8 節）。
  - `FR-009`: 要求 14 件・参照 45 か所。⭐ 本書が変えるのは `:2748` の 1 段だけで、ほかの 44 か所は依存線の描き方と作り方であり、パネルの項目を引かない。
  - 表 T-016: 行 27、指す要求 18 件（2 次 59 件）。⭐ 行を名指すのは `PR-1`（`FR-001`・`FR-091`・`FR-016`・状態機械 6 か所）、`PR-3`（`FR-006`・`FR-029`）、`PR-12`（`FR-006:1911` だけ —— E-03 で直す）、`PR-16`（`FR-008` 3 か所・状態機械 5 か所）、`PR-18`（`FR-111`）、`PR-17`（0）。⇒ `PR-1`・`PR-3`・`PR-16` の id と列を変えないので、名指す文は偽にならない。
  - 表 T-017b: 指す要求 4 件（`FR-007`・`FR-041`・`FR-019`・`NFR-007`）。`CV-9` を指すのは `FR-041:2097`（テーマ色の欄に `CV-9` の入口を並べない —— 偽にならない）・`FR-019:5582`（透明を取らない欄 —— E-05 が場所を空けたままと書く）ほか 11 か所。
  - `AS-5`: `FR-008` の 3 か所（`:2218` の `AS-1`・`:2220`・`:2228`）。`AS-7`: `:2228`・`:2230`（1 回の呼び出しの段 —— 偽にならない）。
  - `AT-104`・`PR-17`: 指す所 0。`K-60`: `FR-041:2095` の 1 か所（「欄の名は … `K-60` に持つ語」—— 語が変わるだけで真）。
- 足した種 `impact.py FR-007 FR-008 FR-041 FR-072 T-018 PR-22 CL-2 CM-24 AT-145 S-369 S-374 IC-17 IC-123 IC-124 T-305 AT-19 S-39 CM-11 CM-13 AS-1 IN-6 T-225`:
  - `S-39` を指すのは `FR-094` の `VG-5`（`:1338`）と `FR-015` の `BL-3`（`:3762`）の 2 か所 ⇒ E-24・E-25。
  - `IN-6`: `FR-031` の 2 か所・5.3 節・状態機械 2 か所 —— 決定 8 の例外は `AS-5` の欄に閉じ、`IN-6` の文は変えない。
  - `IC-123`・`IC-124`: `FR-151` の各 1 か所。`CM-24`・`CM-11`・`CM-13`・`AT-19`: 指す所 0。
- JDG-990 の後に足した種 `impact.py FR-019 GR-14 PR-22 PR-25 S-370 AT-146 HB-12 AT-121 IV-9`: `FR-019` は要求 8 件・参照 63 か所（`FR-016` の 表 T-246 の行・`FR-110` の `ZO-14`・`UC-008`・5.3 節ほか）。⭐ 変える文は枠の透明と塗りの `null` だけで、掴み点・引出し線・重ね順を言う 60 か所は偽にならない。`GR-14` は 13 か所（掴む対象の列挙 —— 線の色を引かない）。`HB-12` は 6 か所、`AT-121` は 1、`IV-9` は 1（`05-07-design.md` の検査の段）。`rulings.md` の `JDG-455`（枠を引けば動かす）・`JDG-456`（塗りの既定は透明）: 前者は E-32 が守り、後者は E-35・E-36 が守る（新しい箱は塗らない）。
- `induced.py`（45 の種 —— 下の 37 に `FR-019`・`HB-12`・`AT-121`・`AT-146`・`S-370`・`IV-9`・`PR-25`・`GR-14` を足した）: 45 の種がすべて解決、内の辺 67、閉路 2 —— 大きさ 13 の `AT-145`・`AT-146`・`CV-9`・`FR-007`・`FR-019`・`FR-041`・`FR-072`・`HB-12`・`IC-17`・`PR-25`・`S-369`・`S-370`・`S-374` と、`FR-008`・`PR-16`。⇒ 13 の閉路の本書の編集（E-05・E-15・E-16・E-26 の `PR-25`・E-29・E-31・E-32・E-34・E-35）は波 1 で 1 度に書く（8 節）。
- `induced.py`（上の 37 の種）: 37 の種がすべて解決、内の辺 40、閉路 3 —— `AT-145`・`S-369`（値の行と規則の作法）、`CV-9`・`FR-007`・`FR-041`・`FR-072`・`IC-17`（本書は同じ波で書く —— 「重なり」の節）、`FR-008`・`PR-16`（同じ波）。
- `rulings.md` を種ごとに引いた: `CV-9` の並びは `JDG-383`・`JDG-405` が決めていた ⇒ 新しい `JDG-863` が覆す（0.1 節）。`PR-12` の末尾は `JDG-382` ⇒ E-01 が守る（色の行は末尾、枠線幅はその後ろ）。ボックスの列は `JDG-456`・`JDG-464` ⇒ 範囲だけ `JDG-922` の #14 が覆す。`S-39` の測る端は `JDG-160` の b ⇒ 決定 6 が守る。担当者の空の欄は `JDG-527` ⇒ E-07 が守る（空の欄を常に 1 つ）。`AS-5`・`AS-7`・`FR-009`・`IN-6`・`K-60`・`AT-104` を名指す裁定はほかに無い。

## 7. 数の予測

| 何 | 前 | 後 |
|---|---|---|
| tables | — | 差 0（表を足さない・消さない） |
| figures | — | 差 0 |
| uids | — | 差 0 |
| rows | 表 T-016 27 | 38（＋11: `PR-34` 〜 `PR-44`）。ほかの表の行の数は差 0（`IC-123`・`IC-124`・`CM-24`・`AT-104`・`P-18`・`CL-2`・`CV-9`・`AS-*`・`VG-5`・`BL-3`・`S-369`・`S-374` は行の中だけが変わる） |
| 表 T-016 の列 | 6 | 7（`出す種類`） |
| 辞書 `properties` ／ `colourField` ／ `propertyField` | 27 ／ 7 ／ — | 38 ／ 12 ／ 2 |
| `git grep -o "テーマの色相" -- docs/spec` | 59（手書き 39 ＋ 生成 20） | 0 |
| `git grep -o -i "theme hue" -- docs/spec` | 10（手書き 6 ＋ 生成 4: `tbl-row-id-prefixes.md` 1・`view-read.svg` 2・`view-read.drawio` 1） | 0 |
| `git grep -o "lineWeight" -- docs/spec` | 12 | 0 |
| `git grep -c "setTaskVisualLineWeight" -- docs/spec` | 1 | 0 |

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 毎フレーム | 待つもの |
|---|---|---|---|---|
| 0 | ― | 11 節の答えを受ける。`PR-<新n>` の番号を取る（2 節）。33 の旧と E-29 の 36 行をもう 1 度数える | ― | ― |
| 1（仕様の文） | `01-04-requirements.md`（E-01 〜 E-09・E-24・E-25・E-29 〜 E-32 の分）・`05-07-design.md`（E-37）・`tbl-glossary.md`（E-12・E-13・E-29 の分）・`settings.json`（E-15・E-16・E-29・E-35・E-36 の分）・`erd.json`（E-33・E-34 と E-29 の `AT-19`）・`row-id-prefixes.json`・`components.json`・`display-words.json`（E-19・E-20・E-29 の分）・`property-items.json` の `PR-22`・`PR-25` の備考だけ（E-26 の行 33・34） | 仕様の文と語。⭐ 6 節の 13 の閉路をこの波で 1 度に書く。`npm run gen`・`npm run gen:components`。語を引く試験（下の注）を同じ波で直す。⚠️ `AT-121` の `transparent` を開くと、生成されるスキーマは透明の線を受けるが、`edit-annotation.ts` の `CM-55` はまだ拒む —— 波 2 まで画面からは選べない（試験の赤を見込む） | いいえ | ― |
| 2（表 T-016 と担当者と色の欄とボックス） | `property-items.json`（E-26 の残り）・`property-items.schema.json`・`property_items_json_to_md.py`（E-17・E-18・E-21・E-26・E-27・E-28）、`tools/generate_property_items.py`・`tools/generate_display_words.py`、`src/adapter/screen-renderer/properties-panel.ts`、`src/framework/dom-screen-surface/properties-panel-drawing.ts`・`field-editing.ts`、`src/adapter/input-command-translator/field-commit.ts`、`src/use-case/edit-document/edit-annotation.ts`・`src/entity/document-model/schedule/schedule-invariants.ts`・`src/entity/layout-engine/schedule-geometry/highlight-box.ts`・`src/adapter/svg-renderer/schedule-overlays.ts`（ボックスの塗りの `null` と線なし —— 描き手は毎フレーム） | ⛔ **原稿の行と読む側を 1 つの波にする**（規則 02 の 3.5 節: `heldByOf` は知らない行で投げ、`properties-panel.ts` を読む試験がすべて `(0 test)` で落ちる） | いいえ（パネルは選択と押しで作り直す） | ⚠️ **L4 の合流を待つ**（`properties-panel` は `CR-563` の持ち場かもしれない —— 調整役が確かめる）。`dom-screen-surface.ts` の本体は触らない |
| 3（枠線の太さ） | `erd.json`・`tbl-glossary.md`（E-10・E-11・E-14）、プロンプト 2 つ（E-22・E-23）、`src/entity`・`src/use-case/edit-document` の型と命令、`src/adapter/svg-renderer/schedule-task-figures.ts`、`src/entity/layout-engine/schedule-layout/shape-cross-sections.ts`・`schedule-geometry/dependency-route.ts`、`tools/generate_startup_template.py` | 列と命令の名を変え、描く太さと幾何へ届かせる。`npm run gen`（型・スキーマ・起動の雛形） | **はい**（描き手と幾何） | 波 2 の `field-commit.ts` の後（同じファイルの `lineWeight` の腕）。`tools/generate_entity_types.py` は触らない（名は `erd.json` から刷られる） |
| 4（試験） | `tests/contract/cr-606-*.test.ts`（新しいファイルだけ） | 仕様だけを読む体（5 節の継ぎ目） | ― | 波 2・3 の合流の後 |
| 後 | `src/adapter/screen-renderer/search-panel*.ts`・`search-table-filters.ts` | 候補を絞って並べる純関数を担当者の欄と共有する（決定 9） | はい | **L4 の合流を待つ**（`DFC-1362`） |

⚠️ 波 1 で直す試験（仕様の文を逐語で引く —— 検査 42）: `tests/contract/cr-557-a-pressed-hue-swatch-is-one-undoable-step.test.ts`・`cr-557-the-theme-hue-field-heads-the-settings-panel.test.ts`・`cr-585-hue-swatches-stay-in-colour.test.ts`・`cr-585-monochrome-greys-the-chrome-and-ground.test.ts`・`cr-592-monochrome-greys-every-t-236-row.test.ts`、`tests/unit/cr-541-panels-help-tooltip-and-dialogue.test.ts`（どれも「テーマの色相」を含む文を引く）。`check-quoted-source.py --list` で、E-01 〜 E-09・E-24・E-25 の文を引く試験も探す。
⚠️ 波 2 で直す試験: 表 T-016 の列の数を 5 と数える `tests/system/divider-colour-corner-and-sticky-field.test.ts`（`T016_COLUMNS`）・`tests/system/measured-sweep.test.ts`（`T016_COLUMNS`）。表 T-016 を（対象, 列）で 1 行に引く試験は、`start`・`finish`・`actualStart`・`actualFinish` で 2 行に当たる（`tests/system/rows-fixed-with-nothing-holding-them.test.ts` の `propertyRowOf` の形）⇒ `出す種類` でも絞る。`CV-9` の並び・`AS-5` の器・依存線の `isEditable` を主張する試験（`DFC-565`・`DFC-1012` の `test.fail`、`tests/usecase/uc-004-show-dependencies-between-tasks.test.ts`）は緑に変わる ⇒ `tests/known-red.txt` の該当行を外す。

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 関数・定数 | 何を | 毎フレーム |
|---|---|---|---|
| `src/adapter/screen-renderer/properties-panel.ts` | `HELD_BY_ON_A_TASK`・`heldByOf`・`AppliesTo`（`Dependency` を足す）、`taskFields`（`shownFor` と `Task.milestone` で絞る）、`itemName`（`milestoneLabel`）、`DEPENDENCY_ITEMS`・`SUCCESSOR_ROW`・`SUCCESSOR_NAME`・`dependencyFields`・`dependencyText`（表 T-016 の `Dependency` の行へ、`isEditable` は `isReadOnly` から）、`assigneeControls`（1 つの組み合わせの器）、`colourChoicesOf`・`withColourField`（`CV-9` の並び） | 5 節 | いいえ |
| `src/framework/dom-screen-surface/properties-panel-drawing.ts` | `fieldElement`・`searchElements`・`holdTypedEntry`（2 つの器を 1 つへ、`IC-123`・`IC-124`、足す項目）、`colourFieldElements`・`themeEntryElement`・`customEntryElement`・`paletteOrderOf`・`transparentOf`・`colourLastLineStyle`（`CV-9` の並びと透明の入口の語） | 5 節 | いいえ |
| `src/adapter/input-command-translator/field-commit.ts` | `commandFromTaskColumn`（`oneInput` の行: `CM-11` の `start` ＝ `finish`、`CM-13` の `PA-5` ／ `PA-1`）、`commandsFromAssigneeField`（足す項目のときだけ `CM-40`）、`commandFromVisualColumn` の `'lineWeight'` の腕（→ `strokeWidthPx`）、`commandFromDependencyColumn`（ラグだけ） | 5 節 | いいえ |
| `src/use-case/edit-document/edit-task.ts`・`task-appearance.ts`・`edit-document.ts` | `setTaskVisualLineWeight` → `setTaskVisualStrokeWidth`、範囲の外を拒む（`AT-104` の 1〜10） | 名と範囲 | いいえ |
| `src/adapter/svg-renderer/schedule-task-figures.ts` | `paintOf` の 2 つの呼び手（`settings.planStroke` → そのタスクの `strokeWidthPx`、`null` なら `planStroke`。描く比は `planStroke` と同じ） | 描く太さ | **はい** |
| `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts`・`schedule-geometry/dependency-route.ts` | `settings.planStroke / 2` の 2 か所 | タスクごとの太さの半分（`VG-5`、決定 6） | **はい** |
| `src/use-case/edit-document/edit-annotation.ts` | `CM-55` の透明の拒み（`:81`）を外し、塗りと線が同時に透明になる `CM-55`・`CM-78` を拒む。`createHighlightBox` の塗りに `S-370` を写す（`:260` の辺り） | 裁定 4・5、決定 13・14 | いいえ |
| `src/entity/document-model/schedule/schedule-invariants.ts` | `IV-9` を `HighlightBox` にも | 決定 14 | いいえ |
| `src/entity/layout-engine/schedule-geometry/highlight-box.ts`・`src/adapter/svg-renderer/schedule-overlays.ts` | 塗りの `null` を `S-370` ではなくテーマの `S-155` で塗る。枠の掴み代（`HB-12`）を線の色によらず置く（透明の線でも同じ所） | 裁定 4・5 | **はい** |
| `tools/generate_property_items.py` | 出力の項 | `shownFor`・`oneInput` を運ぶ | ― |
| `tools/generate_display_words.py` | `COLOUR_FIELD_PARTS`（`noFill`・`noLine`・`themeMark`・`defaultMark`・`defaultColour`）、新しい `PROPERTY_FIELD_PARTS`（`dependencyEnd`・`addResource`）、`properties` の形（`milestoneLabel` を許す） | E-28 | ― |
| `tools/generate_startup_template.py` | `'lineWeight': weight`（`:2462`） | `strokeWidthPx` へ（互換は持たない —— `JDG-864`） | ― |
| 後: `search-table-filters.ts`（`UF-181`） | 候補を絞って並べる純関数を共有 | 決定 9。**L4 の合流を待つ** | はい |

## 10. ⛔ この変更でやらないこと

- **行（`PR-18`）の語「名称」→「行名」はしない。** `DFC-1330` の `対応案` の欄が提案したが、`対応方針・決定仕様` の欄は「出す ID は UID か ID か」だけを問い、`JDG-922` の #11 もそれだけを答えた。⇒ 採るなら別の変更要求（台帳へ起こす候補）。
- 依存線の種別を選ぶ器・命令を作らない（決定 4、`UC-004` の手順 5）。
- ボックスの行の並びを変えない・`PR-28` の 3 色を割らない —— `DFC-1412` へ（JDG-990 の問い 6）。
- コメントボックスの線と字に透明を開かない（裁定 4 はハイライトボックスの枠だけを答えた）。
- 識別子 `themeHue`・`name`・`fillColor`・`strokeColor`・`uid` を変えない（`JDG-922` の #15）。
- 古い `lineWeight` を読み替えない（`JDG-864`、互換は要らない）。
- 検索パネルの絞り込みを作らない（`DFC-1362`、L4）。
- 新しい設定値の行を足さない（決定 5）⇒ `tools/generate_entity_types.py` の群を足さない。

## 11. 利用者に問うこと

無い。起草のときの問い 1 は利用者の答え（2026-10-01、JDG-965）、問い 2 〜 7 は `JDG-990` の問い 6・2・3・4・5・1 が答えた（0 節 ③ の裁定 1・3 〜 8）。⚠️ 残る仮の値は PND-609（決定 13）だけであり、問いではなく台帳の行で持つ。⛔ PND-609 の行（`docs/development-records/pending-decisions.md`）は、起草の枝では足さない —— 未裁定の `A` の行はコードの `@provisional PND-609` の印と対でなければ検査 25 が赤にする。⇒ 塗りを実装する波が、印と行を同じコミットで足す（番号 PND-609 は B2 の帯から予約した）。

## 12. 台帳

| ID | 何か | 本書で |
|---|---|---|
| `DFC-1329` | マイルストーン（とタスク）に依存が出ない・依存線の側の裸の列名 | 閉じる（仕様とコード） |
| `DFC-1330` | 名の欄が「名称」・ID が出ない | 閉じる（`PR-18` の「行名」は 10 節） |
| `DFC-1331` | 担当者の器が 2 つ（MUST-FIX） | 閉じる |
| `DFC-1332` | タスクとマイルストーンの構成が同じ | 閉じる |
| `DFC-1333` | 色の入力の並び・枠線幅 | 閉じる（ボックスの並びは `DFC-1412`） |
| `DFC-1334` | 「テーマの色相」→「テーマ色」・識別子の見直し | 閉じる（0.3 節の表） |
| `DFC-565` | 依存線のラグ以外が編集できると印される | 畳んで閉じる（E-09・E-26） |
| `DFC-1012` | 依存線の種別を整数で編集させる | 畳んで閉じる（略号で読むだけ —— 決定 4） |
| `DFC-1412` | ボックスの欄の並びをタスクに揃える（JDG-990 の問い 6） | 閉じない（別の変更要求） |
| `DFC-1362` | 検索パネルの絞り込みが無い | 閉じない（L4）。比べ方と入口を共有すると本書が書く |

## 13. 測り方の再現

```
# the tree: b2-panel-crs 0590ad03 (refactor); every spec file below is LF (grep -c $'\r' gave 0)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-006 FR-009 PR-1 PR-3 PR-12 PR-16 PR-17 PR-18 AS-5 AS-7 CV-9 AT-104 K-60 T-016 T-017b
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-007 FR-008 FR-041 FR-072 T-018 PR-22 CL-2 CM-24 AT-145 S-369 S-374 IC-17 IC-123 IC-124 T-305 AT-19 S-39 CM-11 CM-13 AS-1 IN-6 T-225
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py <the 15 seeds>            # 15/15, 6 edges, 0 cycles
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py <the 37 seeds above>      # 37/37, 40 edges, 3 cycles
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-019 GR-14 PR-22 PR-25 S-370 AT-146 HB-12 AT-121 IV-9
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py <the 37 seeds> FR-019 HB-12 AT-121 AT-146 S-370 IV-9 PR-25 GR-14   # 45/45, 67 edges, 2 cycles (13 and 2)
grep -c '"transparent": false' docs/spec/_source/erd.json                     # 3 (AT-121 and the comment box line and text) -- E-33 anchors on "seat": 121
grep -n "^| JDG-990 " docs/development-records/rulings.md                       # the verbatim words of 0.1
# the old blocks: built and counted by a scratchpad script (count on the whole LF-normalised file)
# E-01 docs/spec/01-04-requirements.md:1878 (1 lines) count=1
# E-02 docs/spec/01-04-requirements.md:1887 (7 lines) count=1
# E-03 docs/spec/01-04-requirements.md:1911 (1 lines) count=1
# E-04 docs/spec/01-04-requirements.md:2006 (1 lines) count=1
# E-05 docs/spec/01-04-requirements.md:2030 (1 lines) count=1
# E-06 docs/spec/01-04-requirements.md:2218 (1 lines) count=1
# E-07 docs/spec/01-04-requirements.md:2222 (1 lines) count=1
# E-08 docs/spec/01-04-requirements.md:2224 (1 lines) count=1
# E-09 docs/spec/01-04-requirements.md:2748 (1 lines) count=1
# E-10 docs/spec/_assets/tbl-glossary.md:70 (1 lines) count=1
# E-11 docs/spec/_assets/tbl-glossary.md:437 (1 lines) count=1
# E-12 docs/spec/_assets/tbl-glossary.md:617 (1 lines) count=1
# E-13 docs/spec/_assets/tbl-glossary.md:618 (1 lines) count=1
# E-14 docs/spec/_source/erd.json:2375 (18 lines) count=1
# E-15 docs/spec/_source/settings.json:7574 (5 lines) count=1
# E-16 docs/spec/_source/settings.json:7632 (5 lines) count=1
# E-17 docs/spec/_source/display-words.json:1259 (4 lines) count=1
# E-18 docs/spec/_source/display-words.json:1357 (4 lines) count=1
# E-19 docs/spec/_source/display-words.json:3966 (4 lines) count=1
# E-20 docs/spec/_source/display-words.json:4001 (5 lines) count=1
# E-21 docs/spec/_source/property-items.schema.json:79 (11 lines) count=1
# E-22 docs/spec/_source/image-to-grs-json-prompt.ja.md:76 (2 lines) count=1
# E-23 docs/spec/_source/image-to-grs-json-prompt.en.md:76 (2 lines) count=1
# E-24 docs/spec/01-04-requirements.md:1338 (1 lines) count=1
# E-25 docs/spec/01-04-requirements.md:3762 (1 lines) count=1
# E-30 docs/spec/01-04-requirements.md:1904 (1 lines) count=1
# E-31 docs/spec/01-04-requirements.md:5572 (12 lines) count=1
# E-32 docs/spec/01-04-requirements.md:4053 (1 lines) count=1
# E-33 docs/spec/_source/erd.json:2790 (14 lines) count=1
# E-34 docs/spec/_source/erd.json:2851 (1 lines) count=1
# E-35 docs/spec/_source/settings.json:7594 (1 lines) count=1
# E-36 docs/spec/_source/settings.json:7666 (1 lines) count=1
# E-37 docs/spec/05-07-design.md:1292 (1 lines) count=1
# E-29
git grep -o "テーマの色相" -- docs/spec | wc -l                                  # 59
git grep -c "テーマの色相" -- docs/spec                                          # 14/3/2/1/1/16 hand-written lines, 1/1/16 generated
python: count per line in the six hand-written files                            # 37 lines, 39 hits; settings.json:5679 and :6073 hold 2
grep -c "テーマの色相" <the E-01..E-25 fragment>                                 # 0
git grep -c "テーマの色相" -- src tests                                          # src 2 files (3), tests 6 files (9)
# theme hue (en), for JDG-966
git grep -n -i "theme hue" -- docs/spec                                          # 9 lines: components.json 4, display-words.json 1, row-id-prefixes.json 1 (hand-written); tbl-row-id-prefixes.md 1, view-read.svg 1 line (2 hits), view-read.drawio 1 (generated)
git grep -o -i "theme hue" -- docs/spec | wc -l                                 # 10
grep -o -i "colou\?r" docs/spec/_source/display-words.json | sort | uniq -c   # colour 4 (sentences), color/Color 3 (column-like labels)
# lineWeight
git grep -o "lineWeight" -- docs/spec | wc -l                                    # 12
git grep -c "setTaskVisualLineWeight" -- src                                     # 4 files, 9 hits
# rulings
grep -n "CV-9\|PR-12\|S-39\|planStroke\|VG-5\|AS-5\|AS-7\|IN-6\|K-60\|AT-104\|FR-009" docs/development-records/rulings.md
```
