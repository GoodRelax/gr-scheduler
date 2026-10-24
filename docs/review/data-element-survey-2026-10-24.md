# データ要素の全数 —— OKPN・OMPV・null（2026-10-24）

07 に R2 の OKPN/OMPV と R3 の Null Trap を足した日に、今の木の違反を 1 度だけ数えた記録である（`JDG-3226`）。
数えたのは統合の枝 `8d162d7c7` の上。本書は数えるだけで、何も直していない。

`JDG-3226` の決め方: **スキーマの違反は `CR-851` が β の前に必ず 0 にする。それ以外は全数を数え、影響（コンポーネントをまたぐか・純粋関数か など）を見て 1 件ずつ決める。**
台帳の行は `DFC-3564`（スキーマ）・`DFC-3565`（src）。

## 1. スキーマ —— 検査 90 の基準線（195 件）

数え方: `python .claude/skills/spec-graph-check/check-data-element-kinds.py --write-baseline`。生成した 2 つのスキーマの、`properties` の下の定義 1 つを 1 つのデータ要素として JSON Pointer で名指す。行は `.claude/skills/spec-graph-check/data-element-kinds-baseline.txt`。

| 種類 | 規則 | `grs-document.schema.json` | `grs-commands.schema.json` | 何か |
|---|---|---|---|---|
| packed | OKPN | 8 | 8 | 色の要素（`TaskGroup.color`・`TaskVisual` の 2・`CommentBox` の 3・`HighlightBox` の 2、とそれを書くコマンドの引数）が明暗の 2 値を `/` で詰める |
| mixed | OKPN | 8 | 8 | 同じ色の要素が、パレットの名（`red`・`transparent` など）と色コードを 1 つの `pattern` に混ぜる |
| spaced | OKPN | 1 | 1 | `displayTimeZones` の列挙の値 `"UTC-08:00 DST"` が UTC の差と夏時間かを 1 つの値に詰める |
| null | Null Trap（R3） | 83 | 78 | `null` を取る要素 |
| **計** | | **100** | **95** | **195** |

⚠️ 日時の `pattern`（`^-?\d{4,}-…`）は、初めの版では量指定子 `{4,}` のカンマを区切りと読み、36 件が packed に数えられていた。量指定子を外して読み直し、自己試験に 1 件足した。ISO 8601 の日時は 1 つの値である（07 の「例外」）。

### 1.1 `CR-851` の棚卸しとの突き合わせ

`CR-851` の棚卸し（枝 `answers-ahead` の `studies/75-grs-json-reshape/multi-meaning-inventory.md`、所見 55）と、検査 90 が見るものを並べた。

| 棚卸しの所見 | 検査 90 |
|---|---|
| 01 色の 2 値を 1 つの字列に詰める | packed 16 |
| 02 パレットの名と任意の値が同じ欄 | mixed 16 |
| 13 `displayTimeZones` の ` DST` | spaced 2 |
| 03・14・21〜24・27・31・33・35・47・52・54 ほか、`null` に意味を持たせる欄 | null 161 の中 |
| 意味が散文にしか無い所見（37 `00:00:00` を 24:00 と読む、39 `linkType` の数、49 書き手の語 など） | 見えない —— 07 の R2 の OMPV のレビューが持つ。MSPDI に縛られる 16 件は 07 の「例外」（規格がデータ要素の仕様を定める）に当たる |

⚠️ `CR-851` に渡すこと（調整役を通す）:
1. 棚卸しの所見 01 の「よりきれいな形」は、片側が無いときを `{"kind":"custom","light":"#c0504d","dark":null}` と書く。これは R3 の Null Trap の推奨に反する —— 片側が無いときは `dark` のキーを書かない。
2. 原稿の書き方の決まり `docs/spec/_source/erd.schema.json` の `nullable` の説明は、例に「`'可（`null` = 根）'`」を挙げる。これは `null` に「根」の意味を持たせる書き方（OMPV・Null Trap）を教えている。形を直すときに、この説明も直す。
3. `CR-851` は、データ要素の原稿を変えるので、検査 22 が第 0 節②に `OKPN` と `OMPV` を求める（`CR-851` から）。

## 2. src の `null` —— 1924 か所（144 ファイル）

数え方: `node docs/review/data-element-survey-2026-10-24/null-survey.mjs`。`src/` の `.ts`（`.test.ts` と `.d.ts` を除く）を `rolldown/parseAst` で読み、型の位置の `null`（`TSNullKeyword`）を 1 つずつ数えた。全行は `docs/review/data-element-survey-2026-10-24/null-survey.tsv`。
grep の `| null`（1913 か所・143 ファイル）より多いのは、`null | T` の順と、複数行に割った型も数えたためである。

列の読み方:
- **置き場**: parameter（関数の引数）／ return（戻り値）／ field（interface・型の欄・クラスの欄）／ variable（変数の注釈）／ type-alias／ other（総称の引数など）
- **またぐ**: その `null` を含む最上位の宣言を、別のコンポーネント（`src/entity/<module>/<component>`、ほかは `src/<layer>/<component>`）のファイルが import している（再 export を辿った）
- **公開**: 最上位の宣言の名が 表 T-064 の公開メンバに在る（`published-entries.json`）
- **純粋性**: 引数と戻り値について、その関数の `@purity`。`none` は interface の中のメソッドの型のように札の無いもの
- **生成**: `<generated>` の区間の中（原稿から刷られる型。`CR-851` が原稿を直せば刷り直しで動く）

| 置き場 | またがない | またぐ | 計 |
|---|---|---|---|
| return | 523 | 75 | 598 |
| field | 289 | 276 | 565 |
| parameter | 496 | 53 | 549 |
| variable | 135 | 30 | 165 |
| other | 28 | 4 | 32 |
| type-alias | 15 | 0 | 15 |
| **計** | **1486** | **438** | **1924** |

| 純粋性（引数と戻り値） | またがない | またぐ |
|---|---|---|
| pure | 774 | 114 |
| non-pure | 136 | 3 |
| semi-pure-b | 59 | 4 |
| none | 50 | 7 |

| 層 | 数 |
|---|---|
| adapter | 604 |
| framework | 601 |
| entity | 545 |
| use-case | 174 |

- 生成の区間の中は 127（`entity/document-model/schedule` 102 ほか）。これは原稿の形から刷られるので、`CR-851` が直せば一緒に動く。
- またぐ 438 のうち、生成の外は 330。いちばん多いのは `entity/document-model/schedule` 185・`adapter/screen-renderer` 97。
- 表 T-064 の公開メンバの宣言にあるのは 283（field 128・return 76・parameter 57・variable 18・other 4）。

### 2.1 決め方の目安（`JDG-3226` の「影響を考えて個別に」を当てるときの順。決めるのは 1 件ずつ）

| 群 | 数 | 07 の R3 の Null Trap の推奨（省けない所）に照らした目安 |
|---|---|---|
| 生成の区間 | 127 | `CR-851` の原稿の直しについて行く |
| またぐ（生成の外） | 330 | 影響が広がる所 —— 判別子つきの共用体を推奨 |
| またがない pure | 774 | 内側で閉じる所 —— 言語の省略（`undefined`）でもよい |
| またがない non-pure・semi-pure-b・none | 245 | 同上。ただし外から読んだ値（ファイル・時計・DOM）の受け口は、入ってきた `null` を受ける `R3.3` の側でもある |

## 3. src の区切り文字の読み手 —— `split` 19 か所

数え方: `grep -rnE "\.split\(" src --include=*.ts --exclude=*.test.ts`（19 か所。`split('')` は 0）を 1 か所ずつ読んだ。

| 場所 | 割るもの | 見立て |
|---|---|---|
| `src/entity/document-model/schedule/stored-color.ts:26` | 任意色の明暗（`CUSTOM_SIDES_CUT`） | **OKPN の違反**（スキーマの packed と同じもの。`CR-851`） |
| `src/use-case/edit-document/task-group-folding.ts:58` | 状態機械のガードの式（`"a & not b"`、表 T-328 から刷られる） | **候補** —— 項と否定を 1 つの文字列に詰める。`null` は「ガード無し」 |
| `src/framework/dom-screen-surface/dom-screen-surface.ts:146` | 画面の属性に並べた理由（`NOTICE_BOX_REASON_SEPARATOR`） | 候補 —— DOM の属性に並びを詰める。DOM の属性をデータ要素に数えるかを先に決める |
| `src/framework/dom-screen-surface/search-panel-drawing.ts:396` | 画面の属性に並べた UID（`UID_JOIN`） | 同上 |
| `src/adapter/input-command-translator/field-commit.ts:659` | 担当の欄に打った名の並び（`ASSIGNEE_LIST_SEPARATOR`） | 人が打った文字を配列へ割る入口 —— 割った後は配列で持つので違反でない見込み |
| `src/adapter/screen-renderer/properties-panel.ts:1232`・`src/entity/document-model/document-settings/document-settings.ts:457`・`:492`・`:515`・`src/entity/document-model/schedule/schedule-invariants.ts:282`・`:660`・`src/framework/single-html-shell/document-file-flow.ts:204` | 設定の鍵の道（`a.b`） | 値ではなく名の道 —— 対象外の見込み |
| `src/adapter/document-codec/json-codec.ts:69` | JSON Pointer | 規格（RFC 6901）が定める —— 例外 |
| `src/adapter/screen-renderer/properties-panel.ts:367` | 日時の書き方から日付を取る | ISO 8601 —— 例外 |
| `src/framework/mcp-relay-server/mcp-relay-server.ts:592`・`:603` | ファイル名・パス | 対象外 |
| `src/entity/layout-engine/schedule-geometry/comment-box.ts:268`・`src/framework/dom-screen-surface/tooltips-drawing.ts:85`・`src/framework/dom-screen-surface/dom-screen-surface.ts:281` | 文の改行・字形の札 | 1 種類の値（文）—— 対象外 |
