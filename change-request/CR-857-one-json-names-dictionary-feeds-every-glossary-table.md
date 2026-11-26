# CR-857 —— 名の辞書を 1 本の JSON にし、用語集の表をその JSON から作る

> 起草の状態: 段 1 を当てた（2026-11-24、develop `5b2a45ca7`）。段 1b・段 2・段 3 の一部（スキーマの移しと `specTableRowId` の当て）を後任の席が当てた（2026-11-25、枝 `claude/cr857-glossary-2-19be85`）。残りは 1 節の表。
> ID の帯: BOSS から番号 `CR-857`、裁定 `JDG-3841`〜`JDG-3850` を受けた。本書は裁定を 1 つも足していない（持ち主への問いは 0 節の ④）。
> 基準書: 確定の写し 版 `20261123T131438Z` に加え、版 `20261123T220647Z`（`checkedBasis` と、プロジェクトのキーの頭の `x`）に合わせた。
> 当てるもの: `JDG-3411`・`JDG-3415`・`JDG-3416`・`JDG-3419`・`JDG-3420`（辞書のスキーマだけ）・`JDG-3422`・`JDG-3423`・`JDG-3425`・`JDG-3513`・`JDG-3524`・`JDG-3825`・`JDG-3833`、新しい NDD レビュー基準（版 `20261123T131438Z`）の付録 A.6「機械が読む原本」と「JSON のキーの一覧」、チェックリストの「用語集」（study 82 の A7・A8）。
> 計画: `studies/82-anms-ndd-apply-plan/README.md` の段 B3（最優先、`JDG-3833`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`86da8f06e`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| 用語集は `tbl-glossary.md` の 382 行で、名だけを持つ（study 82 の A7） | 382 行のうち表 T-109（アイコン 138 行）は「面・群・正・切り替える設定値・構え」の設計の列を持ち、`tools/generate_icon_roster.py` がその表を原稿として読んで `src/` へ書く。表 T-104 も「群」の列を持つ | 表を JSON から作る切り替えを段 2 に分けた（1 節）。段 1 は、表と辞書の名の食い違いを生成物に並べ、黙ってずれないようにした |
| 下書き `glossary.json` の語は 1,511（study 82 の 7 節） | 1,511。キーが camelCase でない語 204、持ち主の欄で分けた語 387、大文字と小文字だけが違う組 25 | 基準の「camelCase・一意」に合わせるキーの決まり K1〜K5 を置いた（3 節） |
| 下書きは確定した 113 語の文をまだ持たない（`13-glossary-settled.md` の頭） | その通り。確定の表は日本語の意味だけを持ち、英語の意味は下書きのまま | 確定の日本語に合わせて英語を書き直し、英語を正にした（`JDG-3825`、4 節） |
| 外との約束の語（GRS JSON・Agent API・文書の命令）は持ち主の裁定で覆われる（study 82 の 7 節） | 凍結した契約と語ごとに突き合わせた（4 節の表） | 突き合った語だけに拠り所を付けた |

### 0.2 裁定の鎖（`rulings.md` を「CR-857」「glossary」「名の辞書」で引いた）

- `CR-857` が当てると書いた裁定は 115 行ある（状態の欄が「`CR-857` が当てる」の行を `grep -c` で数えた）。本書の段 1 は、辞書の形と生成の決まりの裁定（`JDG-3411`〜`JDG-3427` のうち辞書に及ぶもの）と、確定した 113 語の文（`JDG-3513`）を当てる。仕様の本文・画面・src へ及ぶ裁定（例: `JDG-3491` の `rowId` → `specTableRowId` の src への当て、`JDG-3549` の「暦」→「カレンダー」の仕様と画面への当て、`JDG-3470` の価値のことばの仕様への当て）は、改名の手順（study 82 の A9）で `CR-855` と段 3 が当てる（1 節の表）。
- `JDG-3420` は原稿のスキーマ 11 本と新しい辞書のスキーマを `docs/development-rules/` の下の 1 つのフォルダーへ移すと決めた。段 1 は辞書のスキーマだけを `docs/development-rules/manuscript-schemas/` に置いた。残り 11 本の移しと、名を書くファイル（のべ 92）の道の直しは段 3 に置く。
- GRS JSON（`JDG-3807`）と Agent API の名（`JDG-3771`〜`JDG-3785`）は変えない。本書は語の名を 1 つも変えていない —— 辞書のキーは辞書の中の ID であり、GRS が画面・ファイル・API に書く名は `label.en` と `identifier` にそのまま残した（3 節）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- 直接に前へ進める課題と目標は無い —— 道具立ての変更である。製品の動きは変わらない（`dist` の差は 0）。
- 間接には `CH-4`（`GL-006`、説明を読まずに操作できる）と `CH-1`（`GL-004`、構造化した日程データを出す）を支える。1 つの物を画面・仕様・GRS JSON・Agent API で 1 つの名で呼ぶ土台を 1 か所にまとめ、持ち主が名を確かめた記録を語ごとに持つ。

### ② レビュー観点のどの条項を当て、何が出たか

- 新しい NDD レビュー基準の「機械が読む原本」（MUST）—— 製品のコードは 52,283 行で 10,000 行を超えるので、用語集を JSON で持つ。キーは camelCase、言語ごとの文は BCP 47 のタグをキーにし、`en` を必ず持つ。段 1 で `glossary.json` をこの形にした。「JSON と表の両方があれば JSON を正にし、表を JSON から作る」は段 2 で満たす（それまでは 0.1 の 1 行目の扱い）。
- 同じ基準の「用語集」（MUST）—— 各語に人が確かめた記録を持つ。欄 `checkedBasis`（拠り所の裁定の ID）を足した。拠り所の無い語は、命名のレビュー（BGQA9 の問 13）と持ち主の判断を待つ（5 節）。
- 07 の R2 の OKPN と OMPV —— 1 つの文字列に 2 つの言語を入れない（`JDG-3425`）。キーと持ち主を 1 つの文字列に詰めない。書き名を `label.en` と `identifier` に分け、`key` を辞書の ID の 1 種類の値だけにした。
- 07 の R1 の「仕様の重複・競合の排除」—— 名の正は `glossary.json` 1 か所。段 2 までは `tbl-glossary.md` にも名があるので、生成物が両者の食い違いを全部並べる（`glossary-review-base.md` の最後の節）。

### ③ 持ち主に**問わずに決めた**こと（**覆してよい**）

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 辞書は平らな配列 `terms[]` を持ち、分類の木は `groups[]`（各群が親の群を指す）と語の `group`・`parent` の欄で持つ | 基準の「`terms[]` の配列」と、分類の木（`JDG-3415`・`JDG-3427`）の両立 | 木の形は欄で辿る |
| X-b | キーの決まり K1〜K5（3 節） | 基準の「camelCase・一意・数の ID にしない」 | 型の名（`Task`）のキーは `taskType` になる。書き名は `label.en` に残る |
| X-c | 語の名を人が書き名のまま読む語（JSON のキー・API のメンバ）は、`label` を `{ en: 書き名, ja: 書き名 }` にした | 基準が `label` を必須にした。下書きは人が書き名を読む語に `label` を持たなかった | 日本語の名はレビューの観点 V6 で量る |
| X-d | 拠り所の欄は、基準の任意のキー `checkedBasis` にし、裁定の ID を配列で持つ（1 語を 2 つ以上の裁定が確かめることがある） | 基準書 版 `20261123T220647Z` の「JSON のキーの一覧」が `checkedBasis` を足した | 基準が 1 つの ID だけを許すと読めたら、配列を 1 つに絞る |
| X-e | プロジェクトのキーは `x` で始まる camelCase にした: 頭の `xGroups`、語の `xGroup`・`xParent`・`xIdentifier`・`xOwner`・`xSpecTableRowId`・`xSince`・`xExpansion`・`xNonLiteral`・`xUsage`・`xUses`・`xTags`。`xGroups` の中の欄（`key`・`parent`・`title`・`description`・`tags`）は、プロジェクトが作った入れ物の中なので `x` を付けない | 基準書 版 `20261123T220647Z` の付録 A.6（チーム T への問い T5 の答え）。段 B4 の登録簿と状態遷移の原本も同じ形にそろえる | — |
| X-f | 表を JSON から作る切り替えを段 2 に分けた | 表 T-109 の設計の列は名の辞書の事実ではない（SSOT）。別の原稿へ移す仕事が要る | 段 2 までは名が 2 か所にある。食い違いは生成物に並べた |
| X-g | 段 2 の切り替えの日、`tbl-glossary.md` は前の手書きの版と字句どおり同じ（前置きの生成物の印の行だけが違う）。持ち主が裁定した改名は、仕様へは `CR-855` が原稿を直して刷り直して当てる | 試験の多くが仕様の表の升を字句どおり引く。段 2 で名を変えると、改名の手順を通らずに仕様と試験が動く | 辞書の名と表の名が違う語は、改名が仕様へ届くまで表に前の名が刷られる |
| X-h | 辞書が改名を記録した語で、仕様がまだ前の名を使う物は、`renames[]` の欄 `xAppliedToSpec: false` で示し、生成器はその間 `from` を刷る（11 名） | 改名が仕様へ届いたかを機械が読める形で持つ。`CR-855` が当てたら欄を消す | — |
| X-i | 辞書に語も改名の記録も無い名（58）は、名を作らず、`glossary-tables.json` に字のまま残して生成物（レビューの土台）に並べた | 名の裁定は持ち主だけ（`JDG-3686`）。記録の無い改名を席が書けば、裁定を作ることになる | 段 2 の「名は辞書から刷る」は 202/260 で満ちる。残りは命名のレビューと `CR-855` |
| X-j | 命名の決まり 22 語は、番号（N-1〜N-17）でなくキーで引く | 決まりの番号の頭 `N-` が、表 T-101 の行 ID の頭 `N-` とぶつかった（検査 83）。`JDG-3427` の「なぜは番号でなく語で引く」 | 審査の記録の番号から語へは、`namingRules` の意味の文と改名の表で辿る |

### ④ 持ち主に問うたこと

- 本書からの新しい問いは 0。命名の観点は BGQA9 の問 13 が問う（study 82 の席が出した）。残りの語の判断は、問 13 の答えの後に BOSS が立てるレビューの席の表で問う。
- 後任の席は BGQA11 を作った: 問 1 = 持ち主が後の裁定で別の名を選んだ 37 語を辞書でその名にそろえるか、問 2 = 「スケジュールフィルタの帯」（`U-67`）の新しい名。前の名 `Refusal` の使い回しは BGQA7 の問 26 が問う。

---

## 1. 段と範囲

| 段 | 中身 | 席 | 状態 |
|---|---|---|---|
| 1 | `docs/spec/_source/glossary.json`（`terms[]` の形、英語が正、`checkedBasis`、凍結した契約の名）、`docs/development-rules/manuscript-schemas/glossary.schema.json`、検査と生成の道具 `glossary_json_to_md.py`、命名のレビューの土台（`studies/82-anms-ndd-apply-plan/glossary-review/`）、移しの道具 | 本書の席 | 当てた |
| 1b | 持ち主の文の裁定を辞書へ当てる（付録 A の「段 1b」の 38 行）。遅延診断の派生の名 13 を `delayDiagnosis` へ。命名の決まり 22 語を足す。検査 2 つ（文の中の名、略語の展開形）を足す | 後任の席 | 当てた |
| 2 | `tbl-glossary.md` を `glossary.json` と 2 つの新しい原稿 `glossary-tables.json`（名でない文・表の並び・名でない升）・`icons.json`（表 T-109 の 138 行）から刷る。`generate_icon_roster.py` は原稿を読む。生成物の差は `src/` で 0 | 後任の席 | 当てた（名 260 のうち 202 を辞書から刷る。残り 58 は 7 節） |
| 3 | 原稿のスキーマの移し（`JDG-3420`。12 本、後から足された `row-id-prefixes.schema.json` を含む）、`rowId` → `specTableRowId` の原稿・道具・src・試験への当て（`JDG-3491`） | 後任の席 | 当てた |
| 3（残り） | 規則 07 への「他動詞は目的語を書く」（`JDG-3483`。段 B1 の規則席と合わせる）、`erd.json` ほかの原稿が名を辞書の ID で指す形（`JDG-3411`）、仕様の本文の名の検査（`JDG-3418` の後半）、移したスキーマ 12 本の和文の説明（`JDG-3422`） | 段 B1・B4 の席と `CR-855` | まだ |
| 改名 | 持ち主が裁定した名（辞書と仕様の表が違う語）を仕様・コード・試験へ当てる | `CR-855`（改名の手順、study 82 の A9） | まだ |

---

## 2. 新しい識別子

- 原稿 `docs/spec/_source/glossary.json`、スキーマ `docs/development-rules/manuscript-schemas/glossary.schema.json`、道具 `docs/spec/_source/glossary_json_to_md.py`（`npm run glossary`・`npm run glossary:check`。`npm run gen`・`npm run gen:check` の鎖に入れた）。
- 生成物 `studies/82-anms-ndd-apply-plan/glossary-review/glossary-terms.tsv`・`glossary-review-base.md`（検査 21 の一覧に足した）。
- 仕様の行 ID は足さない。

---

## 3. キーの決まり（K1〜K5）

基準は、キーを「語の英語、camelCase、一意、数の ID にしない」とする。下書きは書き名と持ち主の組で語を分け、型の名を PascalCase で書いた。

| # | 決まり | 例 |
|---|---|---|
| K1 | 書き名が camelCase なら、書き名をキーにする | `startDate` → `startDate` |
| K2 | 大文字で始まる書き名は、頭の大文字の並びを小文字にする | `Task` → `task`、`SSOT` → `ssot`、`JSONSchema` → `jsonSchema` |
| K3 | 持ち主のある語は、持ち主と書き名をつなぐ | `Color` の `kind` → `colorKind` |
| K4 | K2 で、持ち主の無いほかの語とキーが重なるとき、型の名の語に `Type` を足す | 型 `Task` → `taskType`（考えの `task` の隣） |
| K5 | K3 の語が K4 のキーとなお重なるとき、K3 の語に `Property` を足す | `Color` の `type` → `colorTypeProperty`（型 `Color` → `colorType` の隣） |

- 書き名（GRS が画面・ファイル・API に書く名）は `label.en` に残す。`label.en` が画面の名（例 `Task Name`）で、キーも書き名と違うとき（88 語）は、書き名を `identifier` に残す。
- 移しの道具は、決まりを当てた後に重なるキーが残れば止まる。残りは 0 だった。

---

## 4. 移しと拠り所

移しの道具 `migrate_to_terms_array.py` は、下書きの木を平らな `terms[]` にし、次の 4 つの入力を当てた。入力は `studies/76-grs-json-beta-shape/terms/glossary-draft/migration-inputs/` に置いた（どの入力も、別のエージェントが原典を読んで作り、本書の席が数と食い違いを確かめた）。

| 入力 | 中身 | 拠り所 |
|---|---|---|
| `settled-patch.json` | 確定した 113 語（Part 1〜5）の日本語の意味と、それに合わせて書き直した英語の意味、略語 25 語の `xExpansion`、改名 2（`rowId` → `specTableRowId`、`delayDiagnostics` → `delayDiagnosis`）、足す語 2（`divideAndConquer`・`affirmativeActiveWording`）、分ける語 1（`doubtfulOrMissing` → `suspicion`・`omission`）、まとめる語 1（`diagnosableDelay` を `delayDiagnosis` へ。価値の群はタグで指す） | `JDG-3513`・`JDG-3491`・`JDG-3512`・`JDG-3516`・`JDG-3490`・`JDG-3508`・`JDG-3524`、木の語 8 つは `JDG-3660` |
| `contract-check.tsv`・`contract-missing.tsv` | 外との約束の 609 語を凍結した GRS JSON・文書の命令・Agent API の名と突き合わせた結果（合う 359、改名 218、契約に無い 32。契約にだけある名 87） | `JDG-3807`・`JDG-3781` ほか |
| `contract-patch.json` | 辞書を凍結した名へそろえる当て物（改名 213、追加 57、削除 21、そのまま 17）。名は 1 つも作っていない。説明文は凍結したスキーマの英語と和文の表から写した | `JDG-3807`・`JDG-3781`、改名ごとの裁定 |
| `ruling-basis.tsv` | 画面・設定・開発の語 800 について、持ち主がその名を選んだ裁定を探した結果（確かめ済み 240、食い違い 40、無し 520） | `JDG-3348`〜`JDG-3379` ほか 105 の裁定 |

- 食い違い 40（持ち主が別の名を選んだ語。例: `zoomToFitIcon` の「全体を収める」→「全体表示」、`JDG-3376`）は、本書で名を変えず、拠り所も付けない。`ruling-basis.tsv` の `conflict` の行が持つ。命名のレビューの席と `CR-855` が扱う。
- 凍結した名どうしで、前の名を別の語が名に使う例が 1 つある（`Refusal` → `CommandRefusal` と、前の `AgentRefusal` → `Refusal`、`JDG-3781`）。基準書の付録 A.2 は前の名の使い回しを禁じるので、生成物の最後の節に並べた。持ち主が扱いを決める。
- 移しの道具は、下書きの「フィルター」を表記の表（規則 02 の 5 節）の「フィルタ」へ改めた（検査 32）。

---

## 5. 命名のレビューへ渡す土台

- `glossary-review-base.md` は、拠り所（`checkedBasis`）の無い語を区分（画面・MCP の説明・外との約束の群で突き合わなかった語・仕様とコード）ごとに並べ、最後に「仕様の表と辞書で名が違う語」を並べる。`glossary-terms.tsv` は全部の語を 1 行ずつ持つ（列: 順・キー・区分・群・親・書き名・持ち主・英語の名・日本語の名・拠り所・用途・仕様の表の行 ID・仕様の表の名・意味の英語・意味の日本語）。
- BGQA9 の問 13 の答えの後、BOSS が立てるレビューの席はこの 2 つから始める。

---

## 6. 台帳

- 0 件。

---

## 7. 数（予測 → 実測）

| 数 | 予測（study 82） | 実測 |
|---|---:|---:|
| 語 | 1,511 | 1,549（足す語 4、契約の追加 57、削除 21、まとめ 1、分け +1）。段 1b の後 1,571（命名の決まり 22） |
| 群 | — | 66 |
| 拠り所（`checkedBasis`）のある語 | 677 | 985（段 1b の後 1,014） |
| 拠り所の無い語（命名のレビューへ） | 834 | 564（画面 130、MCP の説明 2、契約で突き合わない 4、仕様とコード 428） |
| `xIdentifier` を持つ語 | — | 89 |
| `renames[]` を持つ語 | — | 170 |
| 仕様の表と辞書で名が違う語 | — | 53 |
| 前の名の使い回し | — | 1（`Refusal`。Agent API の名の席が BGQA7 の問 26 で問う） |
| 表の名のうち辞書から刷る名（段 2） | — | 202 / 260（`xAppliedToSpec: false` で前の名を刷る 11 を含む。辞書に無い 58） |
| 表 T-109 の行（`icons.json`） | 138 | 138 |
| `rowId` → `specTableRowId`（段 3） | 約 2,100 | 原稿 599・スキーマ 16・生成器 73・検査 16・生成した src 996・src の ts 185・試験 1,060（タスクグループの ID を言う試験の 27 行は `rowId` のまま） |

- 予測との差: study 82 は、画面と開発の語に持ち主の裁定が無いと見た。実際は画面の語の 240 に、持ち主が名を選んだ裁定があった（4 節）。

---

## 8. 反映記録

- 段 1: 2 節のファイルを足し、`package.json` の `gen`・`gen:check` の鎖、検査 21 の一覧、`source-relations.json` とその図を直した。`npm run glossary:check` は緑。仕様の本文・src・tests は変えていない。
- 段 1b（2026-11-25）: `glossary.json`・`glossary.schema.json`（説明に `x-description-ja`）・`glossary_json_to_md.py` の検査。凍結した GRS JSON の説明の文が「Delay Diagnostics」と「date」を言う所は、スキーマを変えず持ち主へ回した（`JDG-3807`）。
- 段 2（2026-11-25）: 新しい原稿 `glossary-tables.json`・`icons.json` とそのスキーマ、`tbl-glossary.md` を生成物にした、`generate_icon_roster.py` の読み先、検査 21 の一覧と編集のフックの対応表、`09-tools.md`。`src/` の差 0。
- 段 3 の一部（2026-11-25）: スキーマ 12 本を `docs/development-rules/manuscript-schemas/` へ移した（読む所 56 ファイル）。`specTableRowId` の当て（上の 7 節の数）。`dist/index.html` は名の差と CSP の hash だけ変わった。
- 持ち主への問い: `studies/82-anms-ndd-apply-plan/goodrelax-qa-b11-glossary-names.md`（BGQA11、問 2）。
- BGQA11 の答え（2026-11-25）: `JDG-3901`（37 語を後の裁定の名へ。★ の日本語の名を採る）・`JDG-3902`（英語が名詞なら日本語も名詞）・`JDG-3903`（帯の名 `Filtered by Checks Bar` ／ チェックで絞りバー）。`tools/apply_glossary_renames.py` で 47 の改名を記録し、仕様・原稿・試験の 107 か所を置き換えた（手で: `U-10` の 3 行と src の面の名 2 行）。問 3・問 4 の 2 語は仮に当て、2 回目で問う。名の変更でなく仕様の変更になる 3 行（`Canvas Overlays` を消す、`IO-7` の `GRS HTML`、`shapeHeightOf.dumbbell`）は `CR-855`・`CR-851` へ回した。
- BGQA11 の 2 回目（持ち主が 2026-11-25 夜に 1 回目の写しへ書き直した答え、2026-11-27 に当てた）: `JDG-3904`（帯の日本語の名をチェックで日程抽出バー、`JDG-3903` を覆す）・`JDG-3905`（`IC-143` をチェックで日程抽出）・`JDG-3906`（`IC-90`・`IC-92` を 1 階層展開）を道具で 4 つの改名として記録し当てた。`JDG-3907`（Retract の日本語は格納）・`JDG-3908`（チェックで描くタスクを選ぶ働きの日本語は日程抽出）は、名の辞書・表示語・原稿・`05-07-design.md` に当てた。`01-04-requirements.md` の分は、B8b の書き直しが develop に入った後に当てる（BOSS の指示待ち）。
- 付録 A の行き先は、契約へそろえる前（2026-11-24）の仕分けである。「段 1b（まだ）」の行のうち、GRS JSON・Agent API・文書の命令の名を言う行（`JDG-3461`・`JDG-3473`・`JDG-3476`・`JDG-3512`・`JDG-3523`〜`JDG-3529`・`JDG-3541`・`JDG-3551`・`JDG-3556`・`JDG-3605`〜`JDG-3614`・`JDG-3656`）は、契約へそろえた当て物で名が入った。段 1b の席が 1 行ずつ辞書で確かめて閉じた（2026-11-25、付録 A の「段 1b（当てた）」）。

---

## 9. 測り方の再現

- 語の数・キーの形・持ち主・重なり: `glossary-draft/glossary.json` を群・語・子の順に辿る短い Python で数えた（`definition` を持つ物を語とした）。
- 移し: `python studies/76-grs-json-beta-shape/terms/glossary-draft/migrate_to_terms_array.py <確定の当て物> <契約の突き合わせ> [<裁定の拠り所>] --write`。
- 検査と生成: `npm run glossary:check`。

---

## 付録 A —— `CR-857` が当てる裁定 115 行の行き先

裁定の状態の欄が「`CR-857` が当てる」の行を全部並べる。要約は英語の 1 句、確かめた所は辞書のキーかファイルである（`migration-inputs/cr857-rulings.tsv`）。

| 裁定 | 要約 | 行き先 | 確かめた所 |
| --- | --- | --- | --- |
| `JDG-3411` | One names manuscript; tbl-glossary generated; other manuscripts cite names by ID | 段 3 | glossary.json exists (done); tbl-glossary.md generation is step2; erd.json/settings.json/agent-api-members.json citing glossary keys is step3 |
| `JDG-3413` | Rulings stay in rulings.md; generate JSON-schema/API ruling index | ほか | no generated index of JSON-schema/API rulings exists (grep JDG-3413 hits only rulings.md); no CR-857 step names it |
| `JDG-3414` | Rulings change SSOT via extracted drafts inside each CR | ほか | CR-process rule for docs/development-rules/ and change-request template; not present there and not in any CR-857 step |
| `JDG-3415` | Dictionary keyed by ID; owner split; en/ja texts; uses; tags; taxonomy | 段 1（当てた） | glossary.json terms[] with key, owner (387), label/definition {en,ja}, uses, tags (187), parent (607), groups[] (66); UI parts in screen groups |
| `JDG-3416` | Generate one step from SSOT; shared GRS-JSON-schema assembly module | ほか | glossary_json_to_md.py reads only glossary.json (done); shared schema-assembly module for command schema/MCP/startup generators not built; generator work out... |
| `JDG-3418` | Check that backticked names in definitions/spec exist in dictionary | 段 1b（当てた） | problems() refuses a backticked name or Entity.column in a definition that no term carries (46 misses fixed to 0); the spec-text half is step 3 |
| `JDG-3419` | Place names dictionary at docs/spec/_source/glossary.json | 段 1（当てた） | docs/spec/_source/glossary.json; schema at docs/development-rules/manuscript-schemas/glossary.schema.json |
| `JDG-3420` | Move 11 manuscript schemas plus glossary schema into dev-rules folder | 段 3 | glossary.schema.json moved (done); 11 other *.schema.json still in docs/spec/_source; 92 path references |
| `JDG-3421` | Rebuild generators on dev-rule schemas with shared assembly parts | ほか | generator rebuild (with JDG-3416 shared module) not listed in any CR-857 step |
| `JDG-3422` | Dictionary and dev-rule schemas bilingual, English primary | 段 1b（当てた） | glossary.schema.json: every description has a sibling x-description-ja (26), title x-title-ja; the 12 moved schemas keep English only (step 3 follow-up) |
| `JDG-3424` | Upstream order: schema, dictionary, review .md, then GRS JSON generation | 段 3 | steps 1-3 done (glossary.schema.json, glossary.json, glossary-review-base.md); GRS JSON schema generated from the dictionary and its review table not done (n... |
| `JDG-3425` | definition/label as {en,ja}; key and owner as separate fields | 段 1（当てた） | schema Text {en,ja}; terms carry key + owner (e.g. colorTypeProperty owner Color); tags point by unique key |
| `JDG-3426` | Document command concept in design shape; commands after subjects | 段 1（当てた） | documentCommand in group designShape; documentCommands groups follow screen/settings/agentApi |
| `JDG-3427` | Ten-group build-up order; contract groups carry since | 段 1b（当てた） | xSince on 202 agentApi and 84 documentCommands terms (all 629 contract terms); value is the placeholder the grsJson terms carry until CR-851 sets the version |
| `JDG-3428` | Owner reads 21 core parts first; AI fixes drafts before release | ほか | review-round procedure (BGQA sheets / naming review seat), not a glossary.json fact |
| `JDG-3429` | Add NDD after Naming, Traceability after SSOT; short principle meanings | 段 1（当てた） | designPrinciples order: naming, ndd, ssot, traceability, okpn ...; basis JDG-3513 |
| `JDG-3430` | Part 1 and Part 2 Japanese names and meanings settled | 段 1（当てた） | all 58 rules-group terms carry basis JDG-3513 |
| `JDG-3431` | wbs meaning is the parent-child task tree only | 段 1（当てた） | wbs: "the tree of parent tasks and child tasks", no exchange text; multipleTasksPerRow removed per JDG-3467 |
| `JDG-3432` | Eight value words; Intuitive Interaction; watermark not a value | 段 1（当てた） | group values: 7 terms + tag delayDiagnosis (JDG-3512); intuitiveInteraction ja 直感操作; no watermark term; about page via JDG-3470 |
| `JDG-3433` | milestoneTask names the key; taskShape and milestoneShape say what | 段 1（当てた） | milestoneTask, taskShape, milestoneShape definitions |
| `JDG-3434` | baseline Japanese name is 前回予定; drop 変更前の予定 | 段 1b（当てた） | 変更前の予定 13 -> 1 (only as a word in baseline.avoid) |
| `JDG-3435` | Adopt written Japanese names; schedule is スケジュール | 段 1（当てた） | schedule label.ja スケジュール; basis JDG-3435 on 8 terms |
| `JDG-3461` | Task plan-actual state is named progressStatus | 段 1b（当てた） | setTaskProgressStatus, cycleTaskProgressStatus, documentModelProgressStatus say progress status |
| `JDG-3462` | Multibar term becomes Multi-bar Gantt | 段 1（当てた） | multiBarGantt label Multi-bar Gantt / マルチバーガント |
| `JDG-3463` | Dependency type Japanese names and aliases; hints use 終了 | CR-855 | finishToStart..startToFinish ja names with aliases done (後追終了 per JDG-3486); display-words.json linkHintFS/SF/FF/SS still 完了 and no alias |
| `JDG-3464` | One counting calendar is projectCalendar; drop 文書の暦 | 段 1b（当てた） | 文書の暦 -> プロジェクトカレンダー (3); calendar of the document -> project calendar (4) |
| `JDG-3465` | Progress-line point per task is taskProgressPoint | 段 1（当てた） | taskProgressPoint label Task Progress Point / タスク進捗点 |
| `JDG-3466` | Settle seven delay-diagnosis words as drafted | 段 1（当てた） | bottleneck, bottleneckPath, unreliable, suspicion/omission, fixProposal, fixLog carry basis JDG-3466 (pushOut renamed per JDG-3473) |
| `JDG-3467` | Value group eight keys; goals GL-001..009 kept out | 段 1（当てた） | onePage, smooth, selfExplanatory, intuitiveInteraction, structuredData, singleHtml, aiInteraction + values tag delayDiagnosis; no GL term |
| `JDG-3468` | English dependency type names unchanged, no English aliases | 段 1（当てた） | finishToStart etc. label.en Finish-to-Start..., definition.en has no alias |
| `JDG-3469` | Expected finish is estimatedFinish (終了見込み) | CR-855 | estimatedFinish done in dictionary; spec 11 and src 8 rewrites remain |
| `JDG-3470` | Spec T-106 eight values, T-054 goals, about page wording | CR-855 | targets docs/spec/01-04-requirements.md T-054, docs/about/index.html; T-106 follows from step2 generation; CR-857 sec 0.2 hands it to CR-855/step3 |
| `JDG-3471` | multiBarGantt names the chart type; misuse examples banned | 段 1（当てた） | multiBarGantt definition and usage.bad |
| `JDG-3472` | Add usage good/bad field; avoid holds words only | 段 1（当てた） | schema Term.usage; multiBarGantt usage good 3 / bad 3; avoid entries are words |
| `JDG-3473` | endTask, delayContribution, finishedDelayContribution, diagnosisBlocker; Agent API renames | 段 1b（当てた） | readDelayDiagnosis(+Parts) definitions use endTaskDelays, endTasksReached, delayContributionMinutes, diagnosisBlockers; no push-out wording |
| `JDG-3474` | finishedDelayContribution Japanese is 完了済みの遅延寄与 | 段 1（当てた） | finishedDelayContribution label.ja 完了済みの遅延寄与 |
| `JDG-3475` | Delay diagnosis meaning: diagnosis leaves the document unchanged | 段 1（当てた） | delayDiagnosis definition says the diagnosis keeps the document; schema note is CR-851 |
| `JDG-3476` | Delay amount keys are the Minutes names; Agent API renames | 段 1b（当てた） | same definitions use dependencyDelayMinutes, internalDelayMinutes |
| `JDG-3481` | NDD meaning quotes the Laozi line in pinyin | 段 1（当てた） | ndd definition en and ja carry the pinyin with hanzi |
| `JDG-3482` | Abbreviation terms state their spelled-out name (now expansion field) | 段 1（当てた） | expansion on 25 terms (overturned in part by JDG-3524) |
| `JDG-3483` | Affirmative active wording with objects; add rule to 07 | 段 3 | affirmativeActiveWording term and basis JDG-3483 on 58 terms (done); 07-review-standards.md lacks the transitive-verb-object rule |
| `JDG-3484` | Drop value-word label from diagnosableDelay meaning | 段 1（当てた） | diagnosableDelay merged into delayDiagnosis (JDG-3512); no value-word prefix |
| `JDG-3485` | multiBarGantt meaning is the owner sentence | 段 1（当てた） | multiBarGantt definition ends "GRS は multiBarGantt 方式" |
| `JDG-3486` | Finish-to-finish alias is 後追終了, also in hints | CR-855 | finishToFinish definition 後追終了 done; display-words.json linkHintFF has no alias |
| `JDG-3487` | Rewrite document meaning short and affirmative | 段 1（当てた） | document definition (three parts) |
| `JDG-3488` | Verb names belong to semi-pure (B) functions; say so | 段 1（当てた） | semiPureMutable definition names the verb rule |
| `JDG-3489` | JSON and JSON Schema mean the standards; GRS names carry GRS | 段 1（当てた） | json, jsonSchema definitions; grsJsonFormat, grsDocumentSchema, grsCommandsSchema |
| `JDG-3490` | Rule term AffirmativeActiveWording, Japanese 否定形・受動態の排除 | 段 1（当てた） | affirmativeActiveWording; Japanese name only as the definition head (label.ja = written name per X-c) |
| `JDG-3491` | rowId renamed specTableRowId in dictionary, display words, src | 段 3 | specTableRowId term with renames from rowId and schema field (done); display-words.json, icon-roster.json, tools, src remain |
| `JDG-3492` | schedule meaning in EARS form with date-times | 段 1（当てた） | schedule definition |
| `JDG-3493` | task meaning says a milestone is a kind of task | 段 1（当てた） | task definition |
| `JDG-3494` | Drop shape talk from milestoneTask; chevron is 矢羽根 | 段 1（当てた） | milestoneTask, taskShapeChevron ja 矢羽根; note taskShapeEndpointSpan still endpointSpan while studies/76-grs-json-beta-shape/terms/grs-json-beta.schema.json (f... |
| `JDG-3495` | Time values are date-times, not dates, dictionary-wide | 段 1b（当てた） | 日付 -> 日時 for time values in 12 terms (51 -> 38; the rest are day-only values or screen names) |
| `JDG-3496` | WBS children are 配下, not 下 | 段 1b（当てた） | parentTaskProgressToleranceWorkingDays says 配下のタスク |
| `JDG-3497` | externalWbsMaster is any system exporting/importing MSPDI | 段 1（当てた） | externalWbsMaster definition |
| `JDG-3498` | Dependency meanings say which side waits for which | 段 1（当てた） | dependency, predecessor, successor definitions |
| `JDG-3499` | taskProgressPoint is one point on the time axis | 段 1（当てた） | taskProgressPoint definition |
| `JDG-3500` | delay meaning follows DL-1..DL-3 and status date | 段 1（当てた） | delay definition |
| `JDG-3501` | Delay amount names drop unit; unit stated once | 段 1（当てた） | labels Dependency Delay / 依存関係遅延 etc.; unit in delayDiagnosis definition |
| `JDG-3503` | doubtfulOrMissing breaks OKPN; fix asked | 段 1（当てた） | resolved by JDG-3508: suspicion and omission |
| `JDG-3505` | smooth meaning names layout calculation and drawing | 段 1（当てた） | smooth definition |
| `JDG-3506` | intuitiveInteraction meaning covers while-held and release/cancel | 段 1（当てた） | intuitiveInteraction definition |
| `JDG-3507` | Value meanings never say a state | 段 1（当てた） | values definitions use "という、GRS の特長" (JDG-3509) |
| `JDG-3508` | Split doubtfulOrMissing into suspicion and omission | 段 1（当てた） | suspicion, omission (parent delayDiagnosis) |
| `JDG-3509` | Value meanings read "the quality of GRS that ..." | ほか | all 7 values definitions done; whether spec GL-001..009 sentences change is still undecided in CR-857 (no step) |
| `JDG-3512` | Feature named delayDiagnosis; derived names follow | 段 1b（当てた） | 13 derived terms renamed to delayDiagnosis (renames[] version CR-857); no key/label/identifier spells Diagnostics |
| `JDG-3513` | Settle Parts 1-5 (113 terms) per the sheet | 段 1（当てた） | basis JDG-3513 on 113 terms |
| `JDG-3514` | Adopt eight GRS JSON word meanings (UtcOffset, colors, ColumnFilter) | 段 1（当てた） | utcOffset, colorDimGray, colorLightGray, columnKey, columnFilterType/Values/DateRange, isBlankHidden; note beta uses StandardUtcOffset and has no ColumnKey |
| `JDG-3516` | Add DivideAndConquer before SoC; add to 07 index | 段 3 | divideAndConquer term done; 07-review-standards.md principle index lacks it |
| `JDG-3518` | GRS JSON Japanese labels only for 33 settings words plus 4 | 段 1b（当てた） | label.ja プロジェクト名, プロジェクトタイトル, スケジュールデータ, スケジュール文書 |
| `JDG-3519` | Copy setting names into label.ja without wrap marks | 段 1b（当てた） | wrap mark removed from 22 label.ja (22 -> 0) |
| `JDG-3520` | Add container sentence to 12 MSPDI-same type/array meanings | 段 1b（当てた） | container sentence on all 12 MSPDI-same types and arrays |
| `JDG-3521` | Rewrite UtcInstant meaning; settle five date-time types | 段 1b（当てた） | utcInstant uses the owner sentences; dateTimeType cites scheduleData.scheduleDataTimeZone |
| `JDG-3522` | Rewrite hiddenValues meaning; settle six column words | 段 1b（当てた） | hiddenValues uses the owner sentence; six column words carry the basis |
| `JDG-3523` | ColorSide value renamed hexColor; settle 21 color words | 段 1b（当てた） | hexColor present; no stale value term |
| `JDG-3524` | Add expansion field; generator prints it; check abbreviations have it | 段 1b（当てた） | problems() refuses an acronym label without xExpansion (27 terms, 2 filled); printing in the spec table comes with step 2 |
| `JDG-3526` | Fill/stroke transparency becomes opacityPercent | 段 1b（当てた） | opacityPercent defined in the frozen direction (100 opaque); command definitions use fill.opacityPercent; screen labels go to BGQA11 question 1 |
| `JDG-3527` | Replace ColorSide source with derivedFrom | 段 1b（当てた） | colorSideIsCalculatedFromOppositeColorScheme present; no stale terms |
| `JDG-3528` | HighlightBox top/bottomTaskGroupId become first/lastTaskGroupId | 段 1b（当てた） | createHighlightBox/editHighlightBox use firstTaskGroupId/lastTaskGroupId |
| `JDG-3529` | Fractions become ...Percent (lanePositionPercent etc.) | 段 1b（当てた） | only the ...OffsetPercent terms remain |
| `JDG-3541` | themeHueDegrees becomes named enum themeHue | 段 1b（当てた） | themeHue with its 10 values; definition rewritten |
| `JDG-3542` | highestIssuedUid becomes lastIssuedUid | ほか | superseded: studies/76-grs-json-beta-shape/terms/grs-json-beta.schema.json (frozen, JDG-3807) keeps highestIssuedUid (JDG-3721/JDG-3784); dictionary highestI... |
| `JDG-3544` | documentSettings.tableViews becomes tableWindows | 段 1（当てた） | tableWindows and its three windows in group documentSettings |
| `JDG-3548` | MSPDI Type keys named ...Type with a reason sentence | 段 1b（当てた） | frozen schema keeps type (JDG-3628); the three type terms say why the name copies MSPDI Type |
| `JDG-3549` | Every 暦 in the dictionary becomes カレンダー | 段 1b（当てた） | 暦 (not 暦日) 44 -> 0; Calendar label.ja and two group titles カレンダー |
| `JDG-3550` | Settle 17 calendar words; meanings say カレンダー | 段 1b（当てた） | calendar words say カレンダー |
| `JDG-3551` | Adopt parentTaskProgressToleranceWorkingDays and firstOutlineLevel | 段 1b（当てた） | importedTopTaskOutlineLevel, mspdiImportCount present; stale names fixed in definitions |
| `JDG-3552` | Sibling order of tasks and task groups is siblingOrder | 段 1（当てた） | siblingOrder (sharedTypes); note beta later renamed it siblingIndex |
| `JDG-3553` | Settle 21 keys equal to MSPDI names | 段 1（当てた） | start, finish, milestone, hyperlinkAddress, hyperlink, notes, deadline, actualStart ... isCostResource, resource, assignment present |
| `JDG-3554` | Settle 11 task group words | 段 1（当てた） | parentId, treeState and values, editGroup, color, minHeightPx, taskGroup present; note beta renamed (parentTaskGroupId, showMode) |
| `JDG-3556` | Board proposals A-E: nested style, taskStyles, import numbers, leaderTarget | 段 1b（当てた） | style, leaderTarget, mspdiImportCount present; stale names fixed in definitions |
| `JDG-3557` | MSPDI-derived rows use uid, GRS rows id; Project uid | 段 1（当てた） | uid, id, projectUid; AT-1 and schema are CR-851 |
| `JDG-3558` | uid/id rules live in dictionary; spec 5.4 cites them | 段 3 | uid and id definitions done; spec section 5.4 citing dictionary keys is step3 |
| `JDG-3559` | Dictionary calls identified things entities, not rows | 段 1（当てた） | entity wording in uid, id and the 13 terms of JDG-3561 |
| `JDG-3560` | uid and id definitions use the owner sentences | 段 1（当てた） | uid, id definitions en/ja |
| `JDG-3561` | Thirteen meanings switch row to entity | 段 1（当てた） | ordinal, siblingOrder, taskUid, reasonDuplicateKey, reasonDanglingReference, reasonNotFound ... say 実体 |
| `JDG-3562` | uid unique within its kind; AT-24 fix | 段 1（当てた） | uid definition has the scope sentence; AT-24 and spec 5.4 table are CR-851 |
| `JDG-3563` | Discriminator key is type everywhere, never kind | 段 1（当てた） | colorTypeProperty, columnFilterType, leaderAnchorTypeProperty, writerType, scrollPositionType, viewTimeZoneType, documentCommandTypeProperty, lagType; no kin... |
| `JDG-3564` | No kind key; Refusal.commandType; AgentTableColumn.valueType | 段 1（当てた） | refusalCommandType, agentTableColumnValueType; uid range is schema (CR-851) |
| `JDG-3565` | GRS entity id stays id, random UUID v4 | 段 1（当てた） | id definition has the second sentence; template defect and schema are elsewhere |
| `JDG-3569` | Settle 23 project words | 段 1（当てた） | projectUid, projectName, title, subject ... in group project |
| `JDG-3602` | note to remarks; rootTreeState; document root order | 段 1（当てた） | remarks, rootTreeState present; root property order is schema (CR-851) |
| `JDG-3603` | Root parts named 文書刻印, 文書設定, 変更履歴 | 段 1（当てた） | group stampAndLog 文書刻印と変更履歴, documentSettings 文書設定; only component documentType still says 文書の刻印/変更ログ |
| `JDG-3604` | dependencies to predecessorLinks, Dependency to PredecessorLink | 段 1（当てた） | predecessorLinks, predecessorLink; readSchema example cites PredecessorLink |
| `JDG-3605` | GRS JSON structure; move Project GRS values to GRS object | 段 1b（当てた） | 23 terms moved to their frozen place (scheduleData head -> documentRoot; themeHue, parentTaskProgressToleranceWorkingDays -> documentSettings) |
| `JDG-3606` | Unread MSPDI values in per-entity passthrough; no ordinal | 段 1b（当てた） | no ordinal term; projectCalendarUid uses the frozen sentence |
| `JDG-3607` | Fill and stroke as Paint and Stroke objects | 段 1b（当てた） | Paint, Stroke present; editTaskStyle uses fill/stroke |
| `JDG-3609` | Adopt naming rules N-1..N-12, X-1..X-4, E-1/2/4/5 | 段 1b（当てた） | 22 naming-rule terms under naming (namingRules + 21 tiers of JDG-3638) |
| `JDG-3610` | Shared ShapeStyle {fill, stroke}; comment text style object | 段 1b（当てた） | ShapeStyle, CommentBoxStyle present |
| `JDG-3612` | Comment text style is style.font {color, sizePx} | 段 1b（当てた） | font, sizePx present |
| `JDG-3614` | Per-task GRS values gathered under task grs | 段 1b（当てた） | readDocument/taskGroups definitions use tasks[].grs |
| `JDG-3616` | Add naming rules N-13..N-17; state X-2 | 段 1b（当てた） | N-13..N-17 among the 22 naming-rule terms; X-2 folded into N-3 |
| `JDG-3652` | Naming rules only in the dictionary rules group | 段 1b（当てた） | naming rules only in the rules group designPrinciples |
| `JDG-3656` | expansionState becomes childrenExpansionState; root variant | 段 1b（当てた） | showMode words present; stale names fixed (treeStateMachine follows the spec state machines, CR-851/CR-855) |
| `JDG-3660` | Define task-group tree words root, depth, topLevel, below ... | 段 1（当てた） | root, depth, topLevel, topLevelTaskGroup, parent, child, below, ancestor carry basis JDG-3660 |
