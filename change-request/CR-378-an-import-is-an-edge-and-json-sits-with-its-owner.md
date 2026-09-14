# CR-378 — import を辺とし、JSON を持ち主のフォルダに置く（リファクタ計画の段 2a）

> **閉じるもの**: ⛔ **利用者の裁定 `JDG-47`（2026-09-13）** —— 逐語は `docs/development-records/rulings.md` の同行。
> - `JDG-47`: 「辺の定義: 型と JSON を含むすべての import を辺とし、「コード ⊆ 図」で検査する形でよい」
> - あわせて守るもの: `JDG-48`（表 T-075 のユニット一覧は仕様に残す）
>
> ⛔ **起草だけである。仕様書・コード・試験・台帳は 1 文字も動かしていない。** 読んだ木は `3cf64a4` である。
> ⭐ 置く位置はリファクタ計画（`docs/development-records/refactor-plan-report-2026-09-13.md`）の状態表の「段 2a 辺の規則」と記録 5 節の段 2a の段落に従う。段 3 の門（コード ⊆ 図）は、本書の表 T-247 と表 T-248 の文から作る。
> ⛔ 段 2b（状態のモデル。`CR-379` として別の体が起草中）は扱わない。境目は第 8 節。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **表 T-054 の `CH-1`〜`CH-6` も、1.3 の `GL-001`〜`GL-008` も、直には前へ進めない。基盤の変更である。**
利用者に見える振る舞いは 1 つも変わらない。
進めるのは、設計の合否を `R2` で判定するという `FR-092` の `EZ-5` の条件（5.1 の末尾）を、`src/` に対して機械で確かめられる形にすることである。
いまは、図（`_source/components.json`）の辺とコードの import が 51 本食い違っていても、どの検査も赤にならない（第 1 節）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` から次を当てた。

- **`R2.19`（コンポーネント境界。参照してよいのは 5.3 が宣言した公開面のみ）** —— 他のコンポーネントのフォルダの `.json` を読む import が **4 本**ある（第 1 節の M-6）。`.json` は公開エントリではないので（表 T-074 の `SU-1`）、4 本とも 5.3 の「フォルダの外から、公開エントリ以外のファイルを読んではならない（MUST NOT）」に当たる。検査 19 は `.json` を読み飛ばすので（`tools/check_layer_rules.py:150-158`）、どれも赤にならなかった。⇒ 表 T-248 の `JF-1`
- **`R2.16`（レイヤー軸。`R2.19` とは別の軸）** —— 4 本のうち 2 本は `UseCase` から `Adapter` のフォルダへ向く（M-5）。表 T-061 の `LR-1`（外向きの依存を作ってはならない）に当たる。⇒ 表 T-247 の `EG-8`（表 T-061 を `.json` の辺にも掛ける）と 表 T-248 の `JF-4`
- **`R2.2`（SRP）** —— 表示語の辞書（`display-words.json`）を `UseCase` の側へ移せば `LR-1` は消えるが、辞書は `ScreenRenderer`（`CP-37`。`UF-60` が表示言語を運ぶ）の責務である。移すと `EditDocument` が画面の語の変更の理由を負う。⇒ 移さず、値を引数で渡す（決定 3）
- **`R2.9`（YAGNI）** —— 辞書を持つための新しいコンポーネントは立てない（決定 3 の退けた案）。読み手が 1 つの `.json` のために公開名を増やさない（決定 4）
- **`R1.3`（唯一の正）** —— 既定の行の名前の綴りを `src/` の 2 か所に置かない、という 表 T-064 の `PI-9` の理由は、公開する側を移しても残す（決定 3）
- **`R2.1`（命名。純粋なクエリは名詞句）** —— 新しい公開名 `extensionOfFormat` を、同じ表の `colourOf` ・ `pressRowOf` ・ `dismissKeyOf` の形に揃えた（決定 5）

### ③ 利用者に問うたこと・**問わずに決めた**こと

**問うて裁定を得た**（本書を起こす前）: `JDG-47`（辺の定義と、コード ⊆ 図で検査する形）と `JDG-48`（表 T-075 を残す）。

**問うこと**: **なし（0 件）。** 問いの候補は 4 つあり、4 つとも `handoff.md` §0.2 の 3 手のどれかが答えを返した（各行の「3 手」の欄）。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | 辺の定義を **表 T-247（8 行、接頭辞 `EG`）** として 5.2 に置く。散文で並べず表にする | `JDG-47` の本文を行に割っただけで、足した規則は `EG-1`（フォルダをコンポーネントへ畳む読み）・`EG-4`（数えないもの）・`EG-7`（呼び返しの持ち主）・`EG-8`（表 T-061 を辺に掛ける）の 4 つである。`EG-1` は 5.3 の「コンポーネントごとにフォルダを作り」と 表 T-006a の `W-11`（`01-04-requirements.md:322`）の逆読み、`EG-4` は検査 19 がパッケージを扱わない理由（`tools/check_layer_rules.py:144-147`）、`EG-7` は計画の記録 5 節、`EG-8` は「辺は依存である」ことの帰結。⭐ 表にするのは、段 3 の門が行ごとに 1 つの判定を持てるようにするためである |
| 決定 2 | `.json` の置き場を **表 T-248（4 行、接頭辞 `JF`）** として 5.3 の MUST NOT の直後に置く。置き場は「中身を責務に持つコンポーネントのフォルダ」とし、読み手の数では決めない | `JF-1` は 表 T-074 の `SU-1` と 5.3 の MUST NOT の帰結。`JF-3` は 表 T-061 の `LR-2`、`JF-4` は `LR-1` と 表 T-060 の `LY-5`（「内側の 3 層はすべて値を引数で受け取る」）の帰結。⚠️ **「読み手のうち最も内側の層に置く」案は退けた** —— 辞書（読み手は `ScreenRenderer` と `EditDocument` と `ApplyDocumentChange`）が `UseCase` へ移り、`R2.2` を割る。⚠️ **「読み手が 1 つなら読み手のフォルダ」案は `JF-2` に含めない** —— 本書の後は 10 個とも読むコンポーネントが 1 つになる（決定 3〜決定 5）ので、その時点では同じ置き場を指すが、読み手の数で決めると読み手が増えた日に置き場を変えさせる（いまの `display-words.json` は読み手が 3 つで、この読みでは置き場が決まらない）。**3 手**: (1) `rulings.md` を `JSON の置き場` ・ `display-words.json` ・ `icon-glyphs.json` ・ `exchange-formats.json` で引いた ⇒ 置き場を裁いた行は 0 件（`JDG-30` と `JDG-73` はファイルが動くことに触れるだけ）。(2) `impact.py SU-1 LR-1 LR-2 LY-5` の近傍 ⇒ `_assets/tbl-glossary.md:495` が「対応表は別のコンポーネントに在り、そちらを import することを 表 T-061 が禁じているので、名簿として運ぶほかに届ける道が無い」と、同じ判断を既に下している。(3) 別の道 ⇒ 公開エントリを介す道と、値を引数で渡す道の 2 つが既に使われている（`PI-9` の `DEFAULT_ROW_NAME`、`SettingsLimits`）⇒ 問いは残らない |
| 決定 3 | **`UseCase` は辞書を読まない。** 既定の行の名前は、`ScreenRenderer` の公開エントリが `DEFAULT_ROW_NAME` として公開し、`UseCase` はその値を引数で受け取る（`JF-4`）。表 T-064 の `PI-9` から `DEFAULT_ROW_NAME` を外し、`PI-37` へ移す。移す理由の文（綴りを `src/` の 2 か所に置かない）は `PI-37` へ持って行く | **3 手**: (1) `rulings.md` を `既定の名前` ・ `DEFAULT_ROW_NAME` ・ `HF-14` ・ `FR-038` ・ `辞書` で引いた ⇒ 0 件。`fixed-defects.md` の `DFC-243` は既定の名前で行を立てる振る舞いの裁定であり、綴りの置き場は裁いていない。(2) `impact.py HF-14 PI-9` の近傍 ⇒ `HF-14`（`01-04-requirements.md:1622`）は「既定の名前は表示語として持つこと（MUST）…置き場は `FR-038` の辞書である」、05-07:1264 は「語が届く先は `src/` の生成物 1 本とし（MUST）」⇒ 辞書を 2 つに割って `UseCase` に写す道は閉じている。`PI-18` の「訳出の側は通知の語彙を知らない」が、語を外側で解く同じ判断を既に下している。(3) 別の道 ⇒ **在る**。`SettingsLimits` は殻（`frame-loop.ts:2203` ・ `:3017`）からも `Agent API`（`agent-api-members.ts:319` の `snapshot.settingsLimits`）からも値として `editDocument` と `applyDocumentChange` へ入っている。行を足す命令は既に `label: DEFAULT_ROW_NAME` を `Adapter` で載せている（`input-command-translator.ts:2309`）。⇒ 問いは残らない。⚠️ **退けた案**: 辞書を持つ新しいコンポーネントを立てる（`R2.9`。表 T-062 を段 2b と同じ巡で動かすことにもなる）／ 生成器が `UseCase` 用に 2 つ目の `.json` を書く（05-07:1264 の MUST を割る） |
| 決定 4 | `icon-glyphs.json` を `src/framework/dom-screen-surface/` へ移す。`ScreenRenderer` の公開名は増やさない | 図形を画面へ描くのは `DomScreenSurface`（`CP-38`）であり、記述の側は行 ID だけを運ぶ（`pending-decisions.md` の `PND-154` の裁定「行 ID を `data-icon` に置き…描く側だけを差し替えられる」）⇒ 中身を責務に持つのは `CP-38`（`JF-2`）。**3 手**: (1) `rulings.md` を `icon-glyphs.json` で引いた ⇒ `JDG-30` の 1 行だけで、名簿の行を足すとファイルが動くと述べるのみ。(2) 近傍 ⇒ 上の `PND-154`。(3) 別の道 ⇒ `ScreenRenderer` の公開エントリが再び公開する道も在るが、読み手が `CP-38` 1 つだけなので公開名を 1 つ増やすだけになる（`R2.9`） |
| 決定 5 | `exchange-formats.json` は `DocumentCodec`（`CP-20`）のフォルダに残し、殻は `DocumentCodec` の公開エントリの新しい名前 `extensionOfFormat`（表 T-024 の行 ID から拡張子を答える。`pure`）を介して読む。表 T-064 の `PI-20` に足す | 形式を持つのは `CP-20` の責務（`GRS JSON`・`MSPDI`・単一 `.html` の相互変換）であり、殻（`CP-25`）は外側の層なので `JF-3`。殻から `DocumentCodec` への辺は図に既に在る（`components.json` の `SingleHtmlShell -> DocumentCodec`）ので、辺は増えない。名前だけが判断である（`R2.1`）。**3 手**: (1) `rulings.md` を `exchange-formats.json` で引いた ⇒ 0 件。(2) 近傍 ⇒ `PI-20` の `formatFromFile`（逆向きの問い）が同じコンポーネントに在る。(3) 別の道 ⇒ 殻が拡張子を自前で持つ道は 05-07:1253-1254 と同じ理由（同じ数を 2 か所に書けば片方が腐る）で閉じている |
| 決定 6 | 表 T-247 と 表 T-248 の席番号・接頭辞は、適用時に次の空きを取る。起草時の空きは `T-247` ・ `T-248` と `EG` ・ `JF` | `grep` で `T-24[7-9]` と `\b(EG|JF)-[0-9]` を `docs/**/*.md` ・ `change-request/*.md` ・ `docs/spec/_source/*.json` から引いて 0 件。⚠️ 段 2b の `CR-379` も表を足しうるので、先に当てた側が番号を取る |
| 決定 7 | `components.json` の `edges` のうちコードが使わない 11 本（第 1 節の M-4）は、本書では規則にしない | `JDG-47` が裁いたのは「コード ⊆ 図」だけである。逆向き（図 ⊆ コード）を MUST にすれば、裁定に無い規則を作ることになる。計画の記録 3 節の目標（「0。残すなら行ごとに理由」）は段 8 で扱う（第 9 節） |

---

## 1. 測った —— 図の辺とコードの辺

**測り方（全数に共通）**: 検査 19 と同じ読み取り（`tools/check_layer_rules.py` の `read_imports` と `unit_key`）を、`src/` の外の使い捨ての読むだけのスクリプトから呼んだ。読み取りの被覆は `COVERAGE 299 of 299 import specifier(s) in 68 file(s)`（100%）、動的な `import(` は 0 件。
`.` で始まる指定子だけを取り、読み手のファイルと読まれるファイルをそれぞれフォルダ単位でコンポーネントへ畳み（フォルダ名の kebab-case を PascalCase にした名は 36 個とも `components.json` の `nodes` の名と一致した）、同じコンポーネントの中の import は辺にしなかった。`.json` を読む import は、置かれたフォルダのコンポーネントを読むものとして数えた（`JDG-47`）。型だけの import は、文が `import type` ／ `export type` で始まるか、波括弧の中がすべて `type` のものとした。

| # | 数え方 | 実測（`3cf64a4`） | 計画の数（記録 1・3 節） | 一致 |
|---|---|--:|--:|---|
| M-1 | `components.json` の `edges`（重複 0） | 85 | 85 | ✅ |
| M-2 | コードのコンポーネント間の辺 | 125 | 125 | ✅ |
| M-3 | 図に無いコードの辺（コードにだけある） | 51 | 51 | ✅ |
| M-3a | 　うち型だけの import でできている辺 | 23 | —— | 計画に無い数 |
| M-3b | 　うち `SingleHtmlShell` から出る辺 | 19 | —— | 計画に無い数 |
| M-4 | コードが使わない図の辺（図にだけある） | 11 | 11 | ✅ |
| M-4a | 両方にある辺 | 74 | 74 | ✅ |
| M-4b | コードの辺のうち、型だけの import でできている辺 | 51 | 51 | ✅ |
| M-5 | `UseCase` から `Adapter` のフォルダの `.json` への import | 2 | 2 | ✅ |
| M-6 | 他のコンポーネントのフォルダの `.json` を読む import（`.json` は公開エントリにならないので、すべて公開エントリ以外） | **4** | 2 | ⚠️ 計画の行を字義どおりに読むと 4（第 4 節の P-2） |
| M-7 | `src/` の `.json` のファイル ／ それを読む import | 10 ／ 24 | —— | 24 のうち 20 は同じフォルダの中 |

**M-6 の 4 本**:

| 読み手 | 読まれる `.json` | 層の向き | 何に使うか | 当たる規則 |
|---|---|---|---|---|
| `src/use-case/apply-document-change/document-change-plan.ts:30` | `src/adapter/screen-renderer/display-words.json` | `UseCase` → `Adapter`（外向き） | `defaultNames` の `row` の `en` を、空の文書に立てる 1 行の名前にする（`:158-173`） | `LR-1`、5.3 の MUST NOT |
| `src/use-case/edit-document/edit-task-group.ts:18` | 同上 | `UseCase` → `Adapter`（外向き） | 同じ語を `DEFAULT_ROW_NAME` として公開し（`:21-23`）、導出元を消すときの名前の最後の拠り所にする（`:290`。`edit-task.ts:409` も同じ名を読む） | `LR-1`、5.3 の MUST NOT |
| `src/framework/dom-screen-surface/dom-screen-surface.ts:33` | `src/adapter/screen-renderer/icon-glyphs.json` | `Framework` → `Adapter`（内向き） | 図形の要素と `viewBox`（`:564`・`:672`） | 5.3 の MUST NOT |
| `src/framework/single-html-shell/frame-loop.ts:104` | `src/adapter/document-codec/exchange-formats.json` | `Framework` → `Adapter`（内向き） | 表 T-024 の行から拡張子を引く（`:727`） | 5.3 の MUST NOT |

⚠️ **検査 19 は緑である**（`OK src/ obeys table T-061 … over all 299 import specifier(s)`）。緑なのは `.json` を「データであってユニットではない」として読み飛ばしているからである（`tools/check_layer_rules.py:150-158`）。**外向きの 2 本は、いまの規則のままで違反である。**

**M-3 の 51 本の内訳**: 型だけのもの 23（`EditDocument -> Document` など。シェルの `SingleHtmlShell -> Document` の 1 本を含む）＋ 値を読むもの 26（シェルの 18 本を含む）＋ `.json` だけでできたもの 2（M-5 の 2 本がつくる `ApplyDocumentChange -> ScreenRenderer` と `EditDocument -> ScreenRenderer`）＝ 51。残る 2 本の `.json` の import（M-6 の下 2 本）は、図に在る辺（`DomScreenSurface -> ScreenRenderer` ・ `SingleHtmlShell -> DocumentCodec`）の上に載っている。

**M-4 の 11 本**: `ApplyDocumentChange -> NotifyChangeWatchers`、`ChooseStartupDocument -> DocumentStamp`、`ChooseStartupDocument -> ValidateImportedDocument`、`ClipboardGateway -> DocumentCodec`、`ClipboardGateway -> ImageExporter`、`EditDocument -> ScheduleLayout`、`FileGateway -> ApplyDocumentChange`、`FileGateway -> DocumentCodec`、`ImportDocument -> ValidateImportedDocument`、`InputCommandTranslator -> ApplyDocumentChange`、`PostDialogueMessage -> NotifyChangeWatchers`。

---

## 2. グラフ

**種**（本書が書き換える行と、書き換えた行が指す行）: `T-061 LR-1 LR-2 LR-5 T-060 LY-5 T-062 CP-20 CP-25 CP-37 CP-38 T-074 SU-1 T-075 T-064 PI-9 PI-18 PI-20 PI-37 HF-14 FR-032 T-065 T-067 T-077 T-078 MN-2 MN-6 FR-038 FR-006 W-11 T-024`（まだ無い `T-247` ・ `T-248` と、仕様の対象でない `PND-154` は種にできない）。

**`induced.py`**（StrictDoc の書き出しは作業木の `scratch/spec-check/sd-out` に作った。gitignore の対象）: 種 31 のうち 31 を解決、種の間の辺 22、**閉路 0**。⇒ 1 つずつ書いてよい。

**`impact.py`**（指されている箇所。行 ID を名指す要求と参照）:

| 種 | 要求 / 参照 | 中身 |
|---|---|---|
| 表 T-061 | 1 件（`FR-006`、`01-04-requirements.md:1748`「パネルを描く側は文書を読まない（表 T-061）」）、2 次 4 件（`FR-011` `FR-013` `FR-029` `FR-040`）、節 3（5.1・5.3・`tbl-glossary.md` の 8 節） | `EG-8` は表 T-061 を広げるのではなく、辺の範囲を `.json` まで広げる。`FR-006` の文は変わらない |
| `LR-1` ／ `LR-2` ／ `LR-5` | 0 / 2 ／ 0 / 2 ／ 0 / 2（5.1 ・ 5.3 ・ 5.6 の `MN-2` `MN-3`） | 文は変えない |
| 表 T-062 ／ `CP-25` ／ `CP-37` ／ `CP-38` | 0 件（節 4）／ 0 / 7 ／ 0 / 2 ／ 0 / 3 | 文は変えない |
| 表 T-074 ／ `SU-1` | 0 件（1.9 と 5.3）／ 0 / 0 | 文は変えない。`JF-1` が `SU-1` を指す |
| 表 T-064 ／ `PI-9` ／ `PI-20` ／ `PI-37` | 2 件（`FR-009` `FR-016`）、2 次 4 件 ／ 0 / 0 ／ 0 / 0 ／ 0 / 0 | 3 行のセルを変える（決定 3・決定 5） |
| `HF-14` | 3 件 / 8（`FR-083` `FR-004` `FR-008`、05-07:398 と :402） | 文は変えない。05-07:402 は `PI-9` のセルそのもの |
| 表 T-065 ／ 表 T-067 ／ 表 T-077 ／ 表 T-078 | 1 件（`FR-040`）／ 6 件（`FR-031` `FR-032` `FR-088` `FR-064` `FR-076` `FR-040`）／ 1 件（`FR-051`）／ 1 件（`NFR-010`。2 次は `FR-048`） | `EG-7` が名指すだけで、文は変えない |
| `MN-2` ／ `MN-6` | 0 / 0 ／ 1 件 / 3（`FR-016`、05-07:398 ・ :457） | 文は変えない。⚠️ `MN-6` の「辺が 3 本増えた」は第 7 節 |
| `LY-5` ／ `W-11` ／ 表 T-024 ／ `FR-032` | 1 件 / 9 ／ 0 / 1 ／ 9 件（2 次 29）／ 7 件 / 18 | 文は変えない。`JF-4` が `LY-5` を、`EG-1` が `W-11` を、`extensionOfFormat` が表 T-024 を、決定 3 が `FR-032`（導出元が名前を持たないときは既定の名前に確定させる）を指す |

**`rulings.md` で引いた**（行 ID を語の境界つきで数えた。ヘッダの行と本文の両方）: `T-075` → `JDG-48`、`T-065` → `JDG-68`、`FR-008` → `JDG-07`、`FR-031` → `JDG-21`、`FR-029` → `JDG-76`。ほかの対象（`T-061` `LR-1` `LR-2` `LR-3` `LR-5` `T-060` `LY-5` `T-062` `CP-20` `CP-25` `CP-37` `CP-38` `T-074` `SU-1` `T-064` `PI-9` `PI-18` `PI-20` `PI-37` `PI-38` `HF-14` `T-067` `WS-7` `T-077` `T-078` `FT-1` `FT-5` `F-013` `MN-2` `MN-5` `MN-6` `T-070` `T-108` `W-11` `T-024` `FR-004` `FR-006` `FR-009` `FR-016` `FR-032` `FR-038` `FR-040` `FR-051` `FR-064` `FR-076` `FR-083` `FR-088` `NFR-010`）は 0 件。
読んだ本文と、本書との関係:

| 裁定 | 着地先の本文 | 本書と衝突するか |
|---|---|---|
| `JDG-47` | 計画の記録 5 節の段 2a（`refactor-plan-report-2026-09-13.md:263-267`） | 本書がその着地である。表 T-247 は同段落の 4 つの点を行にした |
| `JDG-48` | 同 記録 5 節（`:267`「表 T-075 のユニット一覧は仕様に残す」） | しない。`JF-1` は `.json` を表 T-075 に載せないと定め、表 T-075 は 1 行も動かない |
| `JDG-68` | 表 T-065 の `IF-9`（変更なし） | しない。`EG-7` は表 T-065 を指すだけ |
| `JDG-07` | `FR-008` の 表 T-225 の `AS-7` | しない（担当者の差し替え。辺にも置き場にも触れない） |
| `JDG-21` | `FR-031`（何も変えなかった書き込みは段を残さない） | しない |
| `JDG-76` | 表 T-109 と 図 F-019、`FR-036`（未着地） | しない。凡例の印が 図 F-019 に図形を足すと `icon-glyphs.json` が育つが、決定 4 の置き場は変わらない |

⭐ **裁かれた行と導いた条項が食い違った所は 0 件である。**

---

## 3. いまのコードと試験（編集しない。一覧だけ）

| ファイル:行 | 何をしているか | 本書の後にどうなるか |
|---|---|---|
| `src/use-case/apply-document-change/document-change-plan.ts:30, 158-160, 173` | 辞書を読み、空の文書の 1 行の名前にする | 名前を引数（`applyDocumentChange` の入力）で受け取る（`JF-4`） |
| `src/use-case/edit-document/edit-task-group.ts:18, 21-23, 290` | 辞書を読み、`DEFAULT_ROW_NAME` を公開する | 同上。公開をやめる |
| `src/use-case/edit-document/edit-task.ts:30, 409` ／ `edit-document.ts:31, 43` | `DEFAULT_ROW_NAME` を読む ／ 再び公開する | 引数で受け取る ／ 再公開をやめる |
| `src/adapter/input-command-translator/input-command-translator.ts:69, 2309` | `EditDocument` から `DEFAULT_ROW_NAME` を読み、行を足す命令に載せる | `ScreenRenderer` の公開エントリから読む（辺 `InputCommandTranslator -> ScreenRenderer` は図に在る） |
| `src/framework/single-html-shell/frame-loop.ts:2203, 2385, 2583, 3017` ／ `src/adapter/agent-api-endpoint/agent-api-members.ts:309-320` | `editDocument` ／ `applyDocumentChange` を呼ぶ | 既定の行の名前を値として渡す。`Agent API` の側は `SettingsLimits` と同じく殻の渡す値から取る（辺は増えない） |
| `src/framework/dom-screen-surface/dom-screen-surface.ts:33` | `../../adapter/screen-renderer/icon-glyphs.json` | `./icon-glyphs.json`（決定 4） |
| `src/framework/single-html-shell/frame-loop.ts:104, 727` | `exchange-formats.json` を直に読む | `DocumentCodec` の `extensionOfFormat` を呼ぶ（決定 5） |
| `tools/generate_icon_glyphs.py:65` | `REL_OUT = 'src/adapter/screen-renderer/icon-glyphs.json'` | `src/framework/dom-screen-surface/icon-glyphs.json` |
| `tools/check_layer_rules.py:150-158` | `.json` を読み飛ばす | 段 3 で、`EG-8` と `JF-1` を当てる（第 7 節） |

**試験**: `tests/` ・ `tools/` ・ `.claude/` で `icon-glyphs\.json|exchange-formats\.json|DEFAULT_ROW_NAME|PI-9\b` を持つファイルは **19 本**（`tests/unit/uf-71.test.ts`、`tests/contract/fr-029-glyph-coordinate-system.contract.test.ts`、`tests/unit/edit-task.test.ts`、`tests/unit/use-case.test.ts`、`tests/unit/fr-032-a-nameless-task-can-be-deleted.test.ts`、`tests/contract/if-7-snapshot-source.test.ts`、`tests/unit/uf-47-48-choosers.test.ts` など。ほかに `tools/generate_icon_glyphs.py`、`tools/generate_exchange_formats.py`、`.claude/skills/spec-graph-check/check-provenance.py`）。⚠️ 1 本ずつは読んでいない。どれが道の文字列を持ち、どれが名前を import するかは、実装の波で測る。

**段 4〜7 との関係**: `edit-task.ts` と `edit-task-group.ts` は段 4、`input-command-translator.ts` は段 5、`dom-screen-surface.ts` は段 6、`frame-loop.ts` は段 7 で割る。記録 7 節の a（割る前に直す）に従い、`.json` の 4 本の直しは段 3 の門より前の 1 つの波にまとめる。

---

## 4. 計画の主張を開いて確かめた

| # | 計画の主張（ファイル:行） | 開いた所 | 判定 |
|---|---|---|---|
| P-1 | 記録 5 節の段 2a「実行時にコールバックで呼ぶ流れは辺にせず、5.5 の表（T-067 / T-077）が持つ」（`refactor-plan-report-2026-09-13.md:266`） | 表 T-077（`05-07-design.md:727-735`）は起動の順序で、呼び返しの行を持たない。呼び返しの流れを持つのは 表 T-078 の `FT-1`（`DomInputSource` が `IF-2` で渡す。`:754`）と `FT-5`（`PostDialogueMessage` が配る。`:758`）、表 T-065 の `IF-1`〜`IF-9`（実装を宣言した側へ渡す。`:441-450`）、表 T-067 の `WS-7`（通知。`:550`）。`docs/spec` の `*.md` に「コールバック」は 0 件 | ⛔ **一部誤り。** T-067 は正しい、T-077 は誤り、T-078 と T-065 が抜けている。⇒ `EG-7` は T-065 ・ T-067 の `WS-7` ・ T-078 を名指す |
| P-2 | 記録 3 節「他コンポーネントの公開エントリ以外の JSON を読む import 2 → 0」（`:201`） | 第 1 節の M-6 | ⚠️ **字義どおりなら 4。** 直上の行（`UseCase` → `Adapter` の 2）と重ならない残り（`Framework` の 2）を数えたのなら 2 だが、行はそう書いていない |
| P-3 | 記録 1 節「層の規則 違反 0 ／ import 指定子 299」（`:124`） | `python tools/check_layer_rules.py` の出力 | ✅ 出力のとおり。⚠️ ただし `.json` を読み飛ばした緑であり、外向きの 2 本（M-5）が隠れている。計画はそれを書いていない |
| P-4 | 記録 5 節の段 3「検査 19 の読み取りを使えば、新しい読み取りを作らずに済む」（`:270`） | 本書の測定は `read_imports` と `unit_key` をそのまま呼び、被覆 100% で 125 本を出した | ✅ 読み取りは使える。⚠️ 分類（`:150-158` の読み飛ばし）は変えなければならない |
| P-5 | 記録 1 節「components.json の辺 85 ／ コード 125 ／ 両方 74 ／ コードにだけ 51 ／ 図にだけ 11 ／ 型だけ 51」（`:130-135`） | 第 1 節 | ✅ 6 つとも一致 |
| P-6 | 状態表「段 2a の入口の条件は段 0」（`:84`） | 同表 `:82` の段 0 は ✅ | ✅ |
| P-7 | 記録 1 節「検査 19 は層の向き、検査 26b は公開名、検査 33 は仕様の中の数だけを見る。どれも辺を `src/` と比べていない」（`:138`） | `audit-ch5.py`（検査 33）は `components.json` の辺を読む（`:141-154` ・ `:263-267`）が、`src/` は読まない | ✅ 「`src/` と比べていない」は正しい。「数だけ」は言い過ぎ（図の辺の向きと着地も見ている） |

---

## 5. 案 —— 各対象に書く中身

### 5.1 5.2 に置く文と 表 T-247

置く場所: 5.2 の「層をまたぐ矢印は、それを裏づけるコンポーネントどうしの辺が 1 本以上あるときにだけ描かれる（`build.py` が検算する）。」（`05-07-design.md:169`）の直後。

> **コンポーネントどうしの辺を何とするかを 表 T-247 に示す。**  
> 図の原稿の辺は本表で数えた辺をすべて含むこと（MUST）。

**表 T-247 — コンポーネントの辺**

| 行 ID | 規則 |
| --- | --- |
| EG-1 | `src/` の層のフォルダ（`entity/document-model/` ・ `entity/layout-engine/` ・ `use-case/` ・ `adapter/` ・ `framework/`）の直下のフォルダを、1 つのコンポーネントのフォルダとして読むこと（MUST）。<br>その名は、フォルダ名に 表 T-006a の `W-11` を逆向きに当てたもの（kebab-case から PascalCase）とし、表 T-062 のコンポーネント名と一致すること（MUST） |
| EG-2 | コンポーネント A のフォルダの `.ts` が、`.` で始まる指定子で、別のコンポーネント B のフォルダの `.ts` または `.json` を読むとき、A から B への辺が 1 本あるとすること（MUST）。<br>`import … from` ・ `export … from` ・ `import '…'` のいずれも数える。<br>同じ A と B の組は、読む箇所がいくつあっても 1 本とする |
| EG-3 | 型だけを読む import（`import type` ・ `export type` ・ 波括弧の中がすべて `type` のもの）も辺に数えること（MUST） —— 型を読むだけでも、B の型が変われば A が変わるからである |
| EG-4 | 同じコンポーネントのフォルダの中で読むことと、`.` で始まらない指定子で読むことは、辺に数えない |
| EG-5 | 本表で数えた辺はすべて、`_source/components.json` の `edges` に、同じ `source` と `target` の組として在ること（MUST）。<br>`edges` に無い辺をコードに作ってはならない（MUST NOT） |
| EG-6 | `SingleHtmlShell`（`CP-25`）から出る辺も、他の辺と同じく `edges` に 1 本ずつ書くこと（MUST）。<br>結線であることを理由に省いてはならない（MUST NOT） —— 省くと、殻がいくつのコンポーネントを知っているかが図から読めなくなる |
| EG-7 | import を伴わずに実行時に呼び返す流れは、辺に数えない。<br>実装を宣言した側へ渡す流れは 表 T-065、確定を購読者へ配る流れは 表 T-067 の `WS-7`、フレームを起こす流れは 表 T-078 が持つ |
| EG-8 | 表 T-061 の規則は、本表で数えた辺のすべてに掛かること（MUST） —— `.json` を読む辺も含む |

⭐ **機械で確かめられる行**: `EG-1`〜`EG-5` と `EG-8`（段 3 の門）。`EG-6` は `EG-5` が、`EG-7` は数えないことの注なので門を持たない。

### 5.2 5.3 に置く文と 表 T-248

置く場所: 5.3 の「フォルダの外から、公開エントリ以外のファイルを読んではならない（MUST NOT） —— 読めてしまうと、`LR-2` を検査できない。」（`05-07-design.md:238`）の直後。

> **`src/` の `.json` の置き場を 表 T-248 に示す。**

**表 T-248 — `.json` の置き場**

| 行 ID | 規則 |
| --- | --- |
| JF-1 | `src/` の `.json` はユニットではなく、表 T-075 に行を持たない。<br>置かれたフォルダのコンポーネントに属し、公開エントリにはならない（表 T-074 の `SU-1`）。<br>⇒ 他のコンポーネントのフォルダの `.json` を読んではならない（MUST NOT） —— 本節の MUST NOT がそのまま掛かる |
| JF-2 | `.json` は、その中身を 表 T-062 の責務の欄に持つコンポーネントのフォルダに置くこと（MUST） |
| JF-3 | 持ち主と同じ層か、それより外側の層のコンポーネントが中身を要するときは、持ち主の公開エントリが公開する名前（表 T-064）を介して読むこと（MUST） |
| JF-4 | 持ち主より内側の層のコンポーネントが中身を要するときは、その値を引数で受け取ること（MUST） —— 表 T-061 の `LR-1` と 表 T-060 の `LY-5` の帰結である |

⭐ **機械で確かめられる行**: `JF-1`（段 3 の門）。`JF-2` は責務の読みなので、`.json` を足す・移す変更要求の段階で評価する（`JDG-48` と同じ扱い）。

### 5.3 表 T-064 の 3 行

| 行 | いま | 案 |
|---|---|---|
| `PI-9` | … ／ `DEFAULT_ROW_NAME`（行を既定の名前で立てるときの語。表 T-051 の `HF-14`）—— ⭐ 公開したのは、綴りを `src/` の 2 か所に置かないためである —— … | `DEFAULT_ROW_NAME` とその理由の文を外す。`editDocument` は既定の行の名前を値で受け取る（署名は `src/` が持つ） |
| `PI-37` | `ScreenSurface` ／ `ScreenView` ／ … ／ `rulerWeekdayWords` | 末尾に `DEFAULT_ROW_NAME`（行を既定の名前で立てるときの語。表 T-051 の `HF-14`）—— ⭐ **公開したのは、綴りを `src/` の 2 か所に置かないためである**（`PI-9` から移した文。`HF-14` の MUST / MUST NOT の引用もそのまま）。⭐ 内側の層は読まず、値で受け取る（表 T-248 の `JF-4`） |
| `PI-20` | … ／ `formatFromFile`（…） | 末尾に `extensionOfFormat`（表 T-024 の行 ID から、その形式の拡張子を答える。⭐ 殻が形式の名簿を直に読まないために公開した —— 表 T-248 の `JF-3`） |

### 5.4 登録簿

`_source/row-id-prefixes.json` に `EG`（表 T-247。コンポーネントの辺）と `JF`（表 T-248。`.json` の置き場）を足し、`npm run gen:prefixes` で `_assets/tbl-row-id-prefixes.md` を作り直す。

⛔ **新しい拒み方も、新しいコンポーネントも、新しい層をまたぐインターフェースも立てない。**

---

## 6. 数の予測

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行。起草時（`3cf64a4`）は `tables=145  figures=11  rows=1901  uids=153`。

| | 前 | 後（予測） | 差 | 内訳 |
|---|--:|--:|--:|---|
| tables | 145 | 147 | +2 | 表 T-247、表 T-248 |
| figures | 11 | 11 | 0 | 図 F-013 〜 F-017 は `components.json` を動かさないので変わらない |
| rows | 1901 | 1913 | +12 | `EG-1`〜`EG-8`、`JF-1`〜`JF-4`。`PI-9` ・ `PI-20` ・ `PI-37` はセルの編集で行を足さない |
| uids | 153 | 153 | 0 | |

⚠️ 登録簿（`tbl-row-id-prefixes.md`）の表が接頭辞 2 つぶん行を増やすかは、md-checks がその生成物の表を数えるかによる。適用時に実測で直す。

**コードの数の予測**（第 1 節と同じ測り方。適用とコードの波の後）:

| # | 前 | 後 | 理由 |
|---|--:|--:|---|
| M-2 コードの辺 | 125 | 123 | `ApplyDocumentChange -> ScreenRenderer` と `EditDocument -> ScreenRenderer` が消える（決定 3） |
| M-3 図に無いコードの辺 | 51 | 49 | 同上。残る 49 は段 8 で `components.json` へ書く（`EG-6` によりシェルの 19 を含む）か、コードから消す |
| M-4a 両方にある辺 | 74 | 74 | `DomScreenSurface -> ScreenRenderer` は公開エントリの import（`dom-screen-surface.ts:31`）で、`SingleHtmlShell -> DocumentCodec` は公開エントリの import（`frame-loop.ts:103` ・ `single-html-shell.ts:16`）で使われ続ける |
| M-5 | 2 | 0 | 決定 3 |
| M-6 | 4 | 0 | 決定 3 ・ 決定 4 ・ 決定 5 |

---

## 7. 影響 —— 本書の外で動くもの

| 所 | 何が動くか |
|---|---|
| 検査 26b（`check-published-members.py`） | `PI-9` から名が 1 つ消え、`PI-37` と `PI-20` に 1 つずつ増える。⛔ 仕様だけを先に当てると赤になるので、`src/` の公開エントリの直し（第 3 節）と**同じ波で**着地させる（規則 02 の 3.5、`CR-376` と同じ形） |
| 検査 19（`tools/check_layer_rules.py`） | 本書では変えない。段 3 で `EG-5`（コード ⊆ 図）・`EG-8`（`.json` の辺にも 表 T-061）・`JF-1`（他のフォルダの `.json` を読まない）を載せる。`:150-158` の読み飛ばしを外す。⚠️ 段 3 の出口は「今の基準値で緑」なので、M-3 の 49 本は基準線として持ち、増えたら赤にする |
| 検査 21（`check-provenance.py:75`） | `src/adapter/screen-renderer/icon-glyphs.json` の道が `src/framework/dom-screen-surface/icon-glyphs.json` に変わる |
| 検査 27（`tools/generate_icon_glyphs.py --check`、`row_id_prefixes_json_to_md.py --check`） | 出力先の道（`:65`）と、登録簿の 2 行 |
| 検査 33（`audit-ch5.py`） | 読むのは表 T-062 ・ T-063 ・ T-064 ・ T-065 ・ T-075 と `components.json` なので、表 T-247 ・ T-248 は数えない。`PI-37` と `PI-20` の名が増えても「辺の着地先がメンバを持つ」の判定は変わらない |
| 検査 46 ・ 47 ・ 54 | 第 5 節の文は 1 文 1 行、表の中は `<br>` で区切った。履歴の語（「移した」「〜から変えた」）は `PI-37` の案の括弧の中にだけあるので、⛔ **適用時に「`PI-9` から移した文」の括弧を落とす**（検査 54） |
| `docs/spec/05-07-design.md` の 5.6 | `MN-6` と ADR-001 の Consequences は「`Framework` から `layoutEngine` への辺が 3 本増えた」と書く。図の上ではいまも 3 本（`SingleHtmlShell -> ScheduleGeometry / ScheduleLayout / ScreenRegions`）であり、本書の適用では偽にならない。⚠️ **段 8 で `EG-6` に従ってシェルの辺を書くと、コードには `SingleHtmlShell -> ItemHitArea` と `DomScreenSurface -> ScreenRegions` もあるので 5 本になる** —— 段 8 の変更要求の影響の欄で数える |
| `_source/components.json` | 本書では動かさない（段 8 の仕事。計画の状態表 `:91`）。`.claude/hooks/check-after-edit.py:77` の見張りも動かない |
| 試験 | 第 3 節の 19 本。`tests/contract/units.contract.test.ts` と `tests/contract/spec-table.ts` は 05-07 の表を読むので、表が 2 つ増えても員数の主張が崩れないかを適用時に走らせて確かめる |
| `docs/development-records/rulings.md` の `JDG-47` | 着地先の欄に 表 T-247 と 表 T-248 を足す。状態は `適用済` のまま（検査 43） |
| `docs/development-records/changelog.md` | 1 行（適用時） |

---

## 8. 並行する作業との境目

| 相手 | 相手が触るもの | 本書が触るもの | 境目 |
|---|---|---|---|
| **`CR-379`（段 2b 状態のモデル。別の体が起草中）** | ADR-002、状態の SSOT、`UseCase` のモジュール状態の置き場。計画の記録 12 節によれば 表 T-060 の `LY-3`、表 T-062 に 1 行と `CP-18` ・ `CP-25` ・ `CP-36` の責務、表 T-063 ・ T-075 ・ T-064、`components.json` | 表 T-247 ・ T-248 の新設、表 T-064 の `PI-9` ・ `PI-20` ・ `PI-37` のセル | ⛔ 本書は状態・遷移・モジュール状態に 1 語も触れない。⚠️ **重なりうるのは 表 T-064 だけ**で、行が違う（段 2b が足すのは新しいコンポーネントの行）。新しいコンポーネントが `.json` を読むなら 表 T-248 に従う。表の席番号は先に当てた側が取る（決定 6） |
| `CR-376`（実績を日付で持つ） | 文書の列、`erd.json` | —— | 重ならない |
| `CR-377`（ヘルプの建て替え） | `display-words.json` ・ `help-roster.json`（どちらも `ScreenRenderer` のフォルダ）、図 F-019 | `icon-glyphs.json` の置き場 | ⚠️ 凡例の印が 図 F-019 に図形を足すと `icon-glyphs.json` が変わるが、置き場（決定 4）とは独立。新しい名簿を `ScreenRenderer` の外が読むなら 表 T-248 の `JF-3` に従う |
| 仕様を並行して編集している体 | `docs/spec` | —— | 本書は `3cf64a4` の木を読み、`docs/spec` を編集していない。行番号は `3cf64a4` のものなので、適用時に引き直す |

---

## 9. ⛔ この変更でやらないこと

- ⛔ **`components.json` の辺を足しも消しもしない** —— 図の 49 本の書き足し（シェルの 19 を含む）と、コードが使わない 11 本の扱いは段 8
- ⛔ **「図 ⊆ コード」を規則にしない** —— `JDG-47` は片向きしか裁いていない（決定 7）
- ⛔ **検査を足さない** —— 門は段 3。本書は門が読む文だけを置く
- ⛔ **表 T-075 を動かさない** —— `.json` はユニットではない（`JF-1`、`JDG-48`）
- ⛔ **表 T-062 を動かさず、コンポーネントを足さない** —— 辞書のためのコンポーネントは退けた（決定 3）。段 2b の表 T-062 の編集とも重ねない
- ⛔ **最も内側の層に読み手が 2 つ以上あるときの持ち主は決めない** —— `JF-2` は責務で決めるので、いまの `src/` に決まらない例は 0 件である
- ⛔ **状態のモデル・ADR-002・`UseCase` のモジュール状態には触れない**（`CR-379`）
- ⛔ **`src/` と `tests/` には触らない**（起草の段）
