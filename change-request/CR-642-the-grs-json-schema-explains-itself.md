# CR-642 — GRS JSON のスキーマが、スキーマだけを持つ書き手に自分を説明する

> 起草の状態: 当てた（2026-10-03、`4a69512a` の上）。起草と当てを同じコミットで行った。
> ID の帯: 番号 `CR-642` と台帳の帯 `DFC-1794`〜`DFC-1799` は調整役から受けた。⭐ 仕様の新しい識別子（表・行 ID・接頭辞・設定の行・要求）は 1 つも取らない（2 節）。
> 閉じるもの: `JDG-1190`・`JDG-1192`・`JDG-1193`（`JDG-1194` が渡した変更の一覧 `docs/review/grs-json-schema-self-explanation-2026-10-03.md` の C-1〜C-3・C-5・C-6・C-8〜C-12）、`DFC-1791`・`DFC-1792` の仕様の側、案内のずれ（`DFC-1790`）の仕様の側。
> ⛔ 閉じないもの: C-4（日付の `pattern`、`JDG-1191`・`DFC-1793`）は `DFC-1795` を、C-7（`schemaVersion` の `const`）は `DFC-1794` を待つ（0.2 節）。`PND-675`〜`PND-678` は利用者の裁定を待つので決めていない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md` の `JDG-1190`〜`JDG-1194`。全文は同書を見よ）

| 裁定 | 逐語（抜粋） | 本書での扱い |
|---|---|---|
| `JDG-1190` | 「くれぐれもコメントをむやみに増やすなよ？ 基本はオブジェクト名と構造で語る。 概要とWhyだけコメント。 Whatのコメントが必要なら、それはダメ。」 | Chapter 6.2 に説明の規則を足し（E-06）、説明は原稿の `schemaNote`（22 列）とエンティティの説明（12）から刷る（E-01〜E-05） |
| `JDG-1191` | 「将来的に時刻まで処理することを考えろ。」 | ⛔ **当てなかった**（0.2 節の問い 2）。日付と時刻の形は根の説明が言う（E-05）が、`pattern` は出していない |
| `JDG-1192` | 「MSPDI由来の部分はプロパティー名や定義値をMSPDIに合わせるのが鉄則。 MSPDI側の問題なのでコメントで補うことを許可する」 | 名と値は変えず、符号の意味を `schemaNote` で補った（`linkType`・`lag`・`lagFormat`・`weekStartDay`・`dayType`・`recurrenceKind`・`resourceKind`） |
| `JDG-1193` | 「MSPDI の名のまま＋1 文 (Recommended)」 | `Task.stop` は改名せず、`schemaNote` に 1 文 |
| `JDG-1194` | 「写しで試して一覧を渡す (Recommended)」 | 写しで効いた形（調査の付録 A）を、本物の原稿と生成器へ当てた |

### 0.2 ⛔ 当てる前に確かめた 3 つ（調整役の問い）

**問い 1 —— 本体の読み込みは `const` を解するか。⇒ 解さない。C-7 は当てていない（`DFC-1794`）。**

- 照合の表は、生成器 `tools/generate_json_schema_validator.py` がスキーマから刷る（`UF-152` の `grs-json-schema.ts`）。生成器は 11 の語（`EXPRESSED`、`:83`）と、捨てる語（`DROPPED`、`:92`）しか知らず、それ以外の語に出会うと止まる（`unknown_keyword`、`:126`・`:148`）。⇒ スキーマに `const` を出すと `npm run gen` が止まる。
- 手で書いた歩き手（`src/adapter/document-codec/grs-json-schema.ts` の `SchemaNode`、`:29`、と `collectFaults`、`:951`）にも `const` の欄は無い。
- ⚠️ 歩き手に `const` を解させても、本番の路では効かない —— `documentFromJson` は照合の前に、版の欄をこの造りの知る最大の版へ書き換える（`src/adapter/document-codec/json-codec.ts` の `withOwnSchemaVersion`、`:178`。照合は `:357`）。版の比べは `formatVersionReading`（`:168`）の仕事である。効くのは、最大の版を渡さずに `documentFromJson` を呼ぶ試験だけであり、試験の文書は版に `'1'`・`'2026-01-01'`・`'grs-1'` などを書いている。
- ⇒ どちらにするか（生成器の `DROPPED` に理由つきで入れるか、歩き手が判じるか）は本書では決めない。`DFC-1794` に両側を書いた。

**問い 2 —— 日付の `pattern` で落ちる見本・試験の文書はどれか。⇒ 見本と雛形は 0 件。試験は 13 ファイル 47 件が落ち、うち 5 件は要求の振る舞いが壊れる。C-4 は当てていない（`DFC-1795`）。**

- 写しの木で `isDate` の 18 列と `scrollDate` に `pattern` `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$` を出し、`npm run gen` して測った。
- 見本と雛形（Draft 2020-12、`jsonschema` 4.26）: `src/framework/single-html-shell/empty-document.json`・`startup-template.json`・`tests/fixtures/measuring-document.json`・`docs/guides/schedule-to-grs-json/grs-skeleton.json` は誤り 0。`sample-schedule/Three-Year Product Plan.json`（2175 件）と `previous-project-result/10-agent-interface/samples/grs-document-with-revision-stamp.json`（33 件）は `pattern` を足す前から同じ数だけ誤り、`pattern` の誤りは 0 件（`DFC-1799`）。
- 試験（`vitest` フル）: base の失敗 4 件に対し 51 件。増えた 47 件は 13 ファイル —— `tests/contract/dfc-1224-merge-and-overlay-keep-the-save-target.test.ts`、`tests/unit/` の `cr-404-a-row-opened-by-hand-stays-open`・`fr-023-drops-unusable-dates-and-tells-the-names`・`fr-029-the-reason-a-press-carries`・`fr-072-a-moved-selection-does-not-open-the-panel`・`h3-a-file-drop-wakes-a-frame`・`in-4-escape-closes-the-panel`・`t-015-t-051-the-four-folding-controls`・`uf-47-48-choosers`・`uf-47-48`・`uf-48-input`・`uf-48-undo-through-the-one-path`・`uf-48-write-moment`。
- ⛔ 42 件は日付だけの値（`'2026-04-01'`）を書いた手書きの文書であり、データとして直せる。**だが `fr-023-…` の 5 件は直せない** —— `start: ''` の `Task` を `FR-023` のとおり 1 行だけ落として残りを取り込むことを確かめる試験であり、`pattern` があると照合が文書ごと拒む（`RS-25`）。
  - `05-07-design.md:1290` は「日程データの群がスキーマに合わない文書は、文書ごと拒む」（MUST NOT で寛さを禁じる）。
  - `01-04-requirements.md:6338`（`FR-023`）は「その行を落として残りを取り込むこと（MUST）」。
  - ⇒ 日付を `pattern` で照合の表に入れると、2 つの MUST がぶつかる。どちらを曲げるかは仕様の決定なので、本書は C-4 を当てず、`DFC-1795` に両側を書いた。⚠️ 交換相手から取り込んだ値の綴りを保つ `EX-4` も同じ所に触れる（取り込んだ `xsd:dateTime` が小数秒や帯を持てば、保存した `GRS JSON` が開き直せない）。
- ⭐ 根の説明は「日付は帯を持たない日時で、今は日だけを使い 00:00:00 を書く」と言う（E-05、付録 A のまま）。書き手への約束は説明で届き、照合は今のままである。

**問い 3 —— 設定の既定値の正はどこか。⇒ `docs/spec/_source/settings.json`。スキーマは、`src/` の型を起こす生成器と同じ読み方で読む。**

- 既定の欄の正は `settings.json` の各行の `default`（`num` / `lit`）であり、式で書かれた行（`rulerFont` の `S-3`、`rulerHeight` の `S-2`）は `tools/generate_entity_types.py` の `derived_defaults`（`:785`）が解く。同じ生成器の `settings_manuscript`（`:740`）が鍵ごとの行を読み、`SETTINGS_DEFAULTS` を刷る。
- 起動時の文書 `empty-document.json` は、その `SETTINGS_DEFAULTS` を `tools/generate_startup_template.py` の `settings_defaults`（`:1020`）が読み直した生成物であり、正ではない（調査の写しはこれを使ったが、本書は使わない）。
- ⇒ `erd_json_to_schema.py` は `generate_entity_types` を取り込み、`settings_manuscript`・`derived_defaults`・`bound_pieces`・`bound_expression` を呼ぶ（E-03）。3 つ目の写しは作らない。`Project.themeHue` の既定は、原稿の列が名指す `S-73` の行を同じ読み方で読む（`defaultFrom`、E-01・E-02）。
- ⚠️ 実行の順の罠は無い —— `npm run gen` は `gen:schema` を `types` より先に回すが、読むのは原稿（`settings.json`）であり、`src/` の生成物ではない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-1` の `GL-004`**（成果物が構造化データである —— 機械が読める形で出し入れできる）。外で書かれた `GRS JSON`（`AI` が画像から書くものを含む。`FR-068`）が、スキーマだけを読んで正しく書けるようになる。調査では、元のスキーマを渡した 2 体がどちらも 40% 進行中を `percentComplete` だけで書き、設定を既定と違えて書き、版を当て推量した —— 文書は受理され、意味を取り違えたまま開いた（調査の 2.1 節）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— 設定の既定値をスキーマへ刷るとき、値の正を 2 つにしないこと（問い 3）。⇒ `settings.json` を `generate_entity_types.py` の読み方で読む。⚠️ 同じ条項で 2 つのぶつかりが出た: 日付の `pattern` と `FR-023`（問い 2、`DFC-1795`）、`AT-47` の新しい単位と表 T-213 の `S-118`（ラグの単位は稼働日。`DFC-1798`）。前者は当てずに残し、後者は `JDG-1192` に従って `AT-47` を交換相手に合わせ、`S-118` 側の読み方を台帳に残した。
- **`R1.4`（境界・空の場合）** —— 保存する鍵を名指す上下限（`rulerFont` の上限は `rulerHeight` を名指す）は数へ解かない。既定値で解いた数は、既定値のときにしか正しくない（決定 3）。
- **`R2.9`（YAGNI）** —— `schemaNote` は要る 22 列にだけ置く。名と型で足りる列には足さない（`JDG-1190` の「むやみに増やすな」）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | C-4 と C-7 を当てず、台帳に残す | 問い 1・問い 2 の測った結果。どちらも本書の外（`tools/` の生成器か `src/` の歩き手、または要求）を決めないと当たらない | `JDG-1191` は未着地のまま。根の説明が日時の形を言うだけで、照合は日付だけの文書も通す |
| 決定 2 | `Dependency.lag` の説明は付録 A の文から 1 か所変えた —— 「tenths of a working minute whatever lagFormat says」を「tenths of a minute whatever lagFormat says; a working day (lagFormat 7) is project.minutesPerDay minutes」にした | XSD は `LinkLag` を「tenths of a minute」とだけ言う（`mspdi_pj12.xsd:2198`）。`LagFormat` は経過日（`8=ed`）も持つので、「稼働の分」は経過の形では偽になる | 付録 A の写しで測った文と 1 語違う |
| 決定 3 | 上下限を数へ解くのは、名指す鍵がすべて文書に保存しない定数で、数の既定を持つときだけ。配列の鍵（`pinnedGroupIds` の `pinnedRowMax`）は解かない | `generate_entity_types.py` が `IV-16` の式へ定数を畳む線（`:2514`）と同じ。C-6 の「数の型の鍵に限る」 | `SETTINGS_BOUNDS` に、同じ数の閉じた上下限と式が並ぶ（`DFC-1797`） |
| 決定 4 | 生成の注記（作り直し方）は根の `$comment` に移し、根の説明は書き手向けの概要（付録 A）にした | 検査 21 が見るのは先頭 1400 字の語であり、`$comment` でも満たす。調査で根の「Never edit by hand」を「文書を手で書くな」と読みかけた体がいた | 無い |
| 決定 5 | `TaskVisual` の `description.ja` も「タスクの見せ方。形と色」に直した（表 T-056 の `ET-11`） | `DFC-1792` の「`description.ja` が同じ誤りを持つかは確かめていない」—— 確かめたら持っていた | 表 T-056 の升 1 つが変わる |
| 決定 6 | 持ち回りの器は、`carry` の列（エンティティが `carry: true`）だけを `$defs/Carry` へ向ける。`CarryElement.fields` は向けない | `fields` は解釈しない要素の属性であり、器とは別の意味である | 無い |
| 決定 7 | プロンプトの手順 5 のラグは、`project.minutesPerDay` が `null` のとき 480 分と書いた | 土台の文書は `minutesPerDay` を `null` にしたまま写させる（手順 1）。数を書かないと、書き手は 2 日のラグを計算できない。既に手順 8 が `themeHue` の 214 を書いている前例に倣った | `S-128` の値がプロンプトにもう 1 か所在る |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 列の説明（22 列）・エンティティの説明（12）・`AT-47`・`themeHue` の既定の出どころ | `docs/spec/_source/erd.json` | E-01 |
| 原稿の形（`schemaNote`・`defaultFrom`） | `docs/spec/_source/erd.schema.json` | E-02 |
| 説明・持ち回りの器・既定値・上下限・根の説明 | `docs/spec/_source/erd_json_to_schema.py` | E-03〜E-05 |
| 説明の規則・既定値の読み方・器の 1 か所 | `docs/spec/05-07-design.md` の Chapter 6.2 | E-06 |
| プロンプトの手順 3（`editGroup`・`minHeight`・`black`）と手順 5（ラグ） | `docs/spec/_source/image-to-grs-json-prompt.ja.md`・`.en.md` | E-07 |

**数**: 要求の文 0、図 0、表の行 0、設定の行 0。表 T-056 の升 1（`ET-11`）、表 T-058 の升 1（`AT-47`）。Chapter 6.2 に段落 2（`（MUST）` 4・`（MUST NOT）` 1）。⚠️ 新しい 5 つの印を逐語で引く試験はまだ無い —— 検査 39 の「引かれていない」に 5 つが入る（当てた木で 2156。基準の内なので赤ではない）。試験は仕様だけを読む試験の体が書く（8 節）。

---

## 2. 新しい識別子

仕様の識別子は 1 つも取らない。原稿の鍵を 2 つ足す —— `erd.json` の列の `schemaNote`、列の型の `defaultFrom`。台帳の行は `DFC-1794`〜`DFC-1799`（12 節）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`4a69512a`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 根の `description`「Generated from … Never edit by hand. Rebuild: …」 | `grs-document.schema.json`（生成器の `build`） | 根の `$comment` の先頭（同じ文、原稿に `settings.json` を足した） | E-05 |
| `schedule` の説明「The schedule group (DR-2 of table T-052).」 | 同 | 「The data: what is exported to MS Project, and what GRS adds to draw it.」 | E-05 |
| `documentSettings` の説明「The presentation group (DR-3 of table T-052). FR-063 fixes what is in it.」 | 同 | 付録 A.1 の文 | E-05 |
| 8 つの `carry` の `{type: object, additionalProperties: {type: string}}` | `$defs` の `Project`・`Task`・`Dependency`・`Calendar`・`WeekDay`・`Exception`・`Resource`・`Assignment` | `{"$ref": "#/$defs/Carry"}` と新しい `$defs/Carry` 1 つ | E-04 |
| 12 のエンティティの `description.en` | `erd.json` | 付録 A.2 の文 | E-01 |
| `TaskVisual` の `description.ja`「タスクの見せ方。形・色・名前の置き方」 | `erd.json`（刊行物は表 T-056 の `ET-11`） | 「タスクの見せ方。形と色」 | E-01 |
| `AT-47` の意味「ラグ。単位は `lagFormat`」 | `erd.json`（刊行物は表 T-058） | 4 節 E-01 の文 | E-01 |
| プロンプトの「height は null」「lagFormat 7 は日で、lag はその日数」（ja）、「height is null」「lagFormat 7 means days, and lag is that number of days」（en） | `image-to-grs-json-prompt.ja.md`・`.en.md` | 4 節 E-07 の文 | E-07 |

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。付録 A（`docs/review/grs-json-schema-self-explanation-2026-10-03.md`）からの差だけをここに書く。

- **E-01**（`erd.json`）—— 付録 A.2 の 12 の説明を `description.en` へ、付録 A.3 の 22 の文を列の `schemaNote.en` へそのまま写した。差は `Dependency.lag` の 1 つ（決定 2）。`TaskVisual` の `description.ja` を直した（決定 5）。`Dependency.lag` の `meaning.ja`（`AT-47`）を次にした:
  「ラグ。**単位は `lagFormat` が何であっても 0.1 分である**（`mspdi_pj12.xsd:2196`〜`2198` の `LinkLag`） —— `lagFormat` は表示の単位だけを言い（同 `:2201`〜`2203`）、稼働日で表す形（`7`）では 1 日が `Project.minutesPerDay` 分である」
  `Project.themeHue` の `json` に `"defaultFrom": "S-73"` を足した。
- **E-02**（`erd.schema.json`）—— 列に任意の `schemaNote`（`{"en": 文字列}`）を、列の型に任意の `defaultFrom`（`^S-[0-9]+[a-z]?$`）を許した。
- **E-03**（生成器）—— `documentSettings` の各鍵に `default` を出す。名指す鍵がすべて定数の上下限を数で出す（`rowTitlePanelWidth` の下限 80、`rulerFont` の下限 12、`zoomX`・`zoomY` の 0.02〜64）。`defaultFrom` を読んで `default` を出す（`themeHue` の 214）。
- **E-04**（生成器）—— `carry` の列を `$defs/Carry` への参照にする。器の要素の型は原稿から採り、8 つが食い違えば止まる。
- **E-05**（生成器）—— 列の `schemaNote` を `description` として出す。根・`schedule`・`documentSettings`・`Carry` の説明は付録 A.1 の文。生成の注記は根の `$comment`。
- **E-06**（`05-07-design.md` の Chapter 6.2、「起こしたスキーマは言語に属さない」の段の後）—— 2 段を足した。読み手はスキーマだけを持つ書き手であること・説明は概要と理由だけ（MUST）・仕様の ID を書かない（MUST NOT）・交換相手の列は名も値もそのままで符号は説明で補ってよいこと・`schemaNote` は要る列にだけ。既定値と、定数を名指す上下限の数を刷ること（MUST）と、その値を `settings.json` から型の生成器と同じ読み方で読むこと（MUST）、保存する鍵を名指す上下限は解かないこと、`themeHue` の既定、器を 1 つの定義へ向けること。
- **E-07**（プロンプト ja・en）—— 手順 3 を案内（`docs/guides/schedule-to-grs-json/prompt-*.md`、`DFC-1790` で直した）と同じ文にした（`editGroup` は null、`minHeight` は null、行の色に `black` を使えない）。手順 5 のラグを、0.1 分の単位と 2 日 = 9600 の例にした（決定 7）。

当てた後に打ったもの: `npm run gen` → `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。

### 4.1 重なり

`change-request/` のうち `erd_json_to_schema.py` か `grs-document.schema.json` の説明を書く変更要求で、着地していないものは無い。`image-to-grs-json-prompt.*.md` の手順 3・手順 5 を書く着地していない変更要求も無い。

---

## 5. 継ぎ目

```
SEAM (CR-642)
- Generated, no hand-written code changed:
  * src/adapter/document-codec/grs-json-schema.ts (generated region): the
    eight `carry` nodes become `ref: 'Carry'` and SCHEMA_DEFS gains `Carry`
    ({type object, values {type string}}) -- the same check as before.
    `description` and `default` are DROPPED by the validator generator, so
    the walker judges exactly what it judged on the base.
  * src/entity/document-model/document-settings/document-settings.ts:
    SETTINGS_BOUNDS gains the closed bound beside the folded expression for
    rowTitlePanelWidth (min 80), rulerFont (min 12), zoomX / zoomY
    (min 0.02, max 64) -- same numbers (DFC-1797). SETTINGS_DEFAULTS unchanged.
  * src/adapter/screen-renderer/image-to-grs-json-prompt.json: the two
    prompts (steps 3 and 5) and the minified schema.
- Code wave (a later lane, not this CR):
  * DFC-1794: decide `const` for schemaVersion -- either DROPPED with a reason
    in tools/generate_json_schema_validator.py (the version is judged by
    formatVersionReading, json-codec.ts:168, after withOwnSchemaVersion :178
    rewrites it), or the walker learns it. Then erd_json_to_schema.py emits
    `"const": <the build's version>` read from the one place the version is
    held (tools/generate_startup_template.py SCHEMA_VERSION, :140, printed
    into startup-template-manifest.json).
  * DFC-1795: decide how the date-time pattern meets FR-023 before
    erd_json_to_schema.py emits it; 13 test files hold date-only data.
  * DFC-1797: print either the closed bound or the folded expression.
  * DFC-1798: the properties panel stores what is typed into Dependency.lag
    unconverted (field-commit.ts:340, edit-dependency.ts:136), while table
    T-213 S-118 says the lag's unit is the working day.
```

---

## 6. グラフ（`4a69512a`）

- `impact.py AT-47`: 指す側は参照 1 箇所 —— 表 T-016 の `PR-42`（`tbl-property-items.md:69`、「単位は 表 T-213」）。⚠️ 表 T-213 の `S-118` は「ラグの単位: 稼働日」と言い、`AT-47` の新しい文（0.1 分）とぶつかる —— 保存の単位と見せる単位を分ける読み方はあるが、それを書く要求が無い（`DFC-1798`）。
- 表 T-056 の `ET-11` と 表 T-058 の `AT-47` は、生成器が `erd.json` から刷る（`fig-erd-detail.md`）。
- Chapter 6.2 の新しい 2 段はどの要求も書き換えない。`FR-024`・表 T-220 の前文（`05-07-design.md:1284`）の「`documentSettings` の群にも型・列挙・下限・上限を持たせたまま」は、本書で上下限が増える向きにだけ動く。

---

## 7. 数の予測と測った数

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| スキーマの `description` | 21 → 44 | 生成物の木を歩いて数えた |
| スキーマの大きさ（字下げ 1） | 25,175 → 29,534 バイト | `wc -c` |
| `$defs` | 18 → 19（`Carry`） | 生成器の `--report` |
| 説明の中の仕様の ID | 0（根・群・エンティティ・列のどれにも無い） | 生成物の `description` を正規表現で数えた |
| 生成物のうち中身が動いたファイル | 5（`grs-document.schema.json`・`fig-erd-detail.md`・`grs-json-schema.ts`・`image-to-grs-json-prompt.json`・`document-settings.ts`） | `npm run gen` 後の `git status` |
| 自動試験の失敗の集合（`vitest` フル） | 差 0（両方 30031 件中 4 件、同じ 4 件） | 13 節 |
| `npm run typecheck` の誤り | 0 → 0 | 同 |
| `check.sh` | 当てた木で ALL GREEN（検査 11 は new 0） | `GRS_DEV_PORT=5991`、`rm -rf output` の後 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec/`（原稿・生成器・Chapter 6.2）＋ 生成物 ＋ 台帳 | E-01〜E-07、`npm run gen` | 仕様の波（本書） |
| 1b | `tests/` | Chapter 6.2 の新しい 5 つの印（`（MUST）` 4・`（MUST NOT）` 1）を逐語で引き、刷られたスキーマで確かめる試験（説明に仕様の ID が無い、`documentSettings` の各鍵が `default` を持ち `SETTINGS_DEFAULTS` と等しい、`zoomX` の上下限が数、`carry` が 1 つの定義を指す） | 仕様だけを読む試験の体（本書の書き手ではない） |
| 2 | `tools/generate_json_schema_validator.py` ほか | `DFC-1794`・`DFC-1795`・`DFC-1797` が決まってから | 後の持ち場 |

⚠️ **毎フレームの経路**: `src/adapter/screen-renderer/image-to-grs-json-prompt.json`（生成）が規則 04 の 5 節の `src/adapter/screen-renderer/**` に入るので、`perf-pending.md` に 1 行足した。中身はクリップボードへ写す文字列であり、毎フレームには読まれない。

---

## 9. 仕様の外で直すもの

- 案内 `docs/guides/schedule-to-grs-json/prompt-ja.md`・`prompt-en.md` の手順 5 は、まだ「lag はその日数」と書く（`DFC-1796`）。案内は手で書かれ、検査 75 は散文を読まない。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- C-4（日付の `pattern`）と C-7（`schemaVersion` の `const`）は当てない（0.2 節）。
- `PND-675`（`stackOrder` を消すか）・`PND-676`（`percentComplete` の正）・`PND-677`（`TaskVisual` の数）・`PND-678`（`fadeInDays` の名）は決めない。`stackOrder` と `fadeInDays` の `schemaNote` は付録 A のままで、どちらの答えも先取りしない。
- 表 T-213 の `S-118` は書き換えない（`DFC-1798`）。
- プロンプトから、スキーマが言うようになったことを削ることはしない（C-12 の「削ってよい」は任意）。

---

## 11. 利用者に問うこと

本書からは問わない。`DFC-1794`・`DFC-1795`・`DFC-1798` の択は、調整役が裁定の問いに起こす。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1190` | 説明は概要と Why だけ | 「適用済」。着地先に Chapter 6.2 と `erd.json`・生成器を名指した |
| `JDG-1191` | 日付は日時の形を保ち、`pattern` で言う | 当てなかった —— 状態を「指示 —— `DFC-1795` の裁定を待つ」にした |
| `JDG-1192` | MSPDI 由来は名も値もそのまま、説明で補う | 「適用済」 |
| `JDG-1193` | `Task.stop` は改名せず 1 文 | 「適用済」 |
| `DFC-1791` | `AT-47` のラグの単位 | `仕様待ち` → `実測待ち`（仕様と刷ったプロンプトは直した。出荷ビルドでの確認はまだ。案内は `DFC-1796`） |
| `DFC-1792` | `TaskVisual` の説明 | `仕様待ち` → `実測待ち` |
| `DFC-1793` | 日時の形をスキーマが言わない | `仕様待ち` のまま。`DFC-1795` を待つと書き足した |
| `DFC-1794`〜`DFC-1799` | 新しい行 | 5 節・9 節・0.2 節のとおり |
| `perf-pending.md` の 67 | `CR-642` の生成物 `image-to-grs-json-prompt.json` | 1 行足した |

---

## 13. 測り方の再現

```
# tree: 4a69512a. erd.json, erd.schema.json and the two prompts are LF-only;
# the JSON manuscripts round-trip through json.dumps(indent=1,
# ensure_ascii=False) byte for byte, so they were edited by a script that
# asserts each old value before replacing it.

# question 2 (the pattern, measured on a copy of this tree and then removed):
#   the generator emitted pattern ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$ on the
#   18 isDate columns and scrollDate; npm run gen; then
python -c "import json,jsonschema; ..."   # Draft202012Validator over the 6 files
node ../../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<file>
#   -> 51 failed (base 4): 47 new in the 13 files listed in 0.2.

# the shipped state (no pattern): full vitest on 4a69512a and on this tree,
# the sets of (file, test name) compared -- 30031 tests, 4 failed on both,
# identical.
npm run typecheck          # 0 errors on both
npm run gen:check          # 0 drift

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py AT-47

# the XSD lines quoted in AT-47 and decision 2 were read in the local copy
# docs/reference/mspdi/pj12/mspdi_pj12.xsd (gitignored, read in the main
# checkout): LinkLag 2196-2198, LagFormat 2201-2203.
```
