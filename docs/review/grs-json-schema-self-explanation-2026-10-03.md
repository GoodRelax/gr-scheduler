# GRS JSON のスキーマは自分を説明できるか（2026-10-03）

⭐ 利用者の問い（`docs/development-records/rulings.md` の `JDG-1190`）への答えと、変える所の一覧である。
⚠️ 本書は調査の記録であり、仕様ではない。仕様・スキーマ・生成器は本書では直していない（`JDG-1194`）。
変更要求の番号と当てる時期は調整役が配る。

## 1. 確かめ方

1. 統合点 `95cd59d2` の `docs/spec/_source/grs-document.schema.json` だけを、初見の体に渡した。
   - 体は Sonnet と Opus の 2 つ。どちらも、ほかのファイルを読まず、ウェブも使わない。
2. 体にさせたことは 3 つ。
   - 形式を自分の言葉で解説させた。
   - 同じ日程を 1 本書かせた。2 本の行、マイルストーン、色、形、フェード、進行中の実績、依存、担当、コメントボックスを含む。
   - 推し量った鍵と、作者への問いを挙げさせた。
3. 1 回目の 2 本の文書は、本体の読み込みの路（`documentFromJson` → `validateImportedDocument`）に一時の試験で通した。その試験は消してある。
4. 指摘を写しのスキーマに当て、毎回新しい初見の体に読ませ直した。
   - 写しは、本物の生成器の出力を scratchpad で後から加工したものである。
   - 4 版まで作り、3 回読ませた（1 回目は元のスキーマ、2 回目は 2 版、3 回目は 3 版）。
   - 4 版は 3 回目の指摘のうち事実で済む 2 つ（`CV-3`・`IV-6`）と `themeHue` の既定値だけを当てたもので、読ませていない。
5. 写しのスキーマに、出荷の文書 3 本を Draft 2020-12 で照らした。
   - 照らした文書: `src/framework/single-html-shell/empty-document.json`、`docs/guides/schedule-to-grs-json/grs-skeleton.json`、`tests/fixtures/measuring-document.json`。
   - 誤りは 2 版から 4 版まで、どれも 0 件だった。

## 2. 結果

### 2.1 元のスキーマでは、形は書けるが意味を取り違えたまま通る

1 回目の 2 本は、どちらも本体に受理された。範囲へ寄せられたのは `rulerHeight` の 1 件だけである。

| 取り違え | 1 回目（元） | 2 回目（2 版） | 3 回目（3 版） |
| --- | --- | --- | --- |
| 「40% 進行中」を `percentComplete` だけで書き、`stop` を空にした（実績バーは床の長さに縮む。`FR-011`・`FR-012`） | 2 体とも | Sonnet（`stop` を状況日に置き、40 と書いた） | 0 体 |
| `documentSettings` が雛形の既定と違う（`zoomX` 20、`rulerFont` 12、`rowTitlePanelWidth` 150 など） | 2 体とも | 0 体（頼まれた表示の切り替えだけを変えた） | 0 体 |
| `schemaVersion` を当て推量で書いた（"1"、"1.0"。正しくは "2026-09-27"） | 2 体とも | 0 体 | 0 体 |
| 日付を日付だけで書いた（`"2026-04-01"`） | 2 体とも | 0 体 | 0 体 |
| `stackOrder` に段を書いた（人は段を指定できない。`ST-6`） | 2 体とも | 0 体 | 0 体 |
| 2 日のラグを 9600（0.1 分 × 480 分 × 2）以外で書いた | （頼んでいない） | Sonnet（1440 分で 28800） | 0 体 |

⇒ 3 回目は 2 体とも、稼働日を数えて `stop` と `percentComplete` を合わせた。どちらも 40% は整数の日では出せないと述べ、41 と書いた。

### 2.2 原因

1. **原稿にある情報を、生成器が落としている。**
   - `erd.json` の列の `meaning` は日本語だけで、スキーマに出していない。
   - 日時の印 `isDate` は、スキーマに出していない（`DFC-1793`）。
   - 設定の表の既定値は 1 つも出していない。
2. **既存の説明が雑音になっている。**
   - `DR-2 of table T-052` や `FR-063` は、スキーマだけを持つ読み手には引けない。
   - "weak entity" と "self-referencing" は、文書を書く人の役に立たない。
   - 根の説明の "Never edit by hand" を、文書を手で書くなと読みかけた体がいる。
   - `TaskVisual` の説明は、存在しない鍵を指す（`DFC-1792`）。
3. **本物の Why が無い。**
   - 進捗を日付で持つ理由。
   - 行（`TaskGroup`）と WBS を分ける理由。
   - すべての鍵を書く理由。
   - 暦を 1 つだけ使う理由。

## 3. 変える所の一覧（調整役へ）

⭐ 方針は `JDG-1190` のとおりで、名と構造で語るのが先、説明は概要と Why だけである。

- MSPDI 由来の符号は説明で補ってよい（`JDG-1192`）。名と値は MSPDI のまま。
- `Task.stop` は改名せず、1 文の説明を付ける（`JDG-1193`）。
- 日付は日付と時刻の形を保つ（`JDG-1191`）。

| # | どこを | どう変えるか | 効いたこと（2 節の行） |
| --- | --- | --- | --- |
| C-1 | `docs/spec/_source/erd.json` の列 | 任意の鍵 `schemaNote`（`{"en": …}`）を、要る列にだけ足す（付録 A の 22 列）。`docs/spec/_source/erd.schema.json` がその鍵を許すようにする | 進捗・ラグ・`stackOrder`・暦・曜日の取り違え |
| C-2 | `erd.json` のエンティティの `description.en` | 仕様 ID・DB の用語・存在しない鍵を除いて書き直す（付録 A の 12 エンティティ）。⚠️ "row" を「レコード」の意味で使わない —— 画面の行（`TaskGroup`）とぶつかる | 雑音の除去 |
| C-3 | `docs/spec/_source/erd_json_to_schema.py` | 列の `schemaNote` を `description` として出す | C-1 を届ける |
| C-4 | 同上 | 日時の列（`isDate`）と設定の日付の型（`scrollDate`）に `pattern` `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$` を出す | 日付の形 |
| C-5 | 同上 | `carry` を `$defs/Carry` への参照にし、説明を 1 か所に置く | 持ち回りの器を空にする理由 |
| C-6 | 同上 | `documentSettings` の各鍵に `default` を出す。記号で書かれた上下限（`zoomMin` など）は、数の既定を持つ鍵なら数へ解いて出す（数の型の鍵に限る） | 設定の既定 |
| C-7 | 同上 | `schemaVersion` を、その造りの版の `const` とする（版の正は `src/framework/single-html-shell/startup-template-manifest.json`） | 版 |
| C-8 | 同上 | `Project.themeHue` に `default` を出す。値の正は `S-73`（表 T-216）とし、生成器はそこから読む | 色相の既定 |
| C-9 | 同上 | 根の説明を、文書を書く人向けの概要に替える（付録 A）。生成の注記は `$comment` へ移す。`schedule` と `documentSettings` の説明から仕様 ID を除く | 全体の見取り図・終了日を含むこと・色の空の側 |
| C-10 | `docs/spec/05-07-design.md` の Chapter 6.2 | スキーマの説明の規則を足す —— 読み手はスキーマだけを持つ書き手であり、説明は概要と Why に限ること、仕様 ID を書かないこと、MSPDI 由来の符号は説明で補ってよいこと | 規則の置き場 |
| C-11 | `docs/spec/_assets/fig-erd-detail.md` の `AT-47` と、`docs/spec/_source/image-to-grs-json-prompt.ja.md`・`image-to-grs-json-prompt.en.md` の手順 5 | ラグの単位を XSD に合わせる（`DFC-1791`） | ラグ |
| C-12 | `docs/spec/_source/image-to-grs-json-prompt.ja.md`・`image-to-grs-json-prompt.en.md` の手順 3 | 既知の残り（`height` → `minHeight`、`editGroup`、行の色に `black` を使えない）。スキーマが言うようになったことは、プロンプトから削ってよい | — |

⚠️ 当てる前に確かめること。

- **`src/adapter/document-codec/grs-json-schema.ts` は、スキーマから刷られた照合の表である。** C-4 の `pattern` が入ると、日付だけの文書（1 回目の 2 体が書いた形）は読み込みで拒まれる（`RS-25`）。日程側は厳格という今の決まり（`OP-6`）のとおりであり、書き手の約束がはっきりする。
- **同ユニットの解する語に `const` があるかを確かめること**（`UF-152` は「11 の語だけを解し」と書く）。無ければ C-7 の前に足す。
- `withOwnSchemaVersion` が古い版の文書の版をどう扱うかも確かめること。
- **C-6 の既定値の正をどこに置くかは、当てる者が決める。** 設定の表の既定の欄は、`rulerFont` のように式で書かれた行がある。写しでは起動時の文書（`empty-document.json`）の値を使った。
- 生成物が変わるので `npm run gen` と `npm run gen:check` を回す。検査 75（案内の照合）も回す。

## 4. 残した問い

| 番号 | 問い |
| --- | --- |
| `PND-675` | 誰も読まない `TaskGroupMember.stackOrder` を、文書から消すか |
| `PND-676` | 読み込んだ `percentComplete` が日付と食い違うとき、どちらを正とするか |
| `PND-677` | どの `Task` も `TaskVisual` を持たなければならないか |
| `PND-678` | `fadeInDays`・`fadeOutDays` の名を「薄れ」と読む体が多い —— 名を変えるか |

## 5. 日時の時刻（`PND-679` → `JDG-1203`〜`JDG-1205`）

⭐ 根拠は公式文書だけである（`JDG-1204`）。ローカル複製は `docs/reference/mspdi/` と `docs/reference/w3c/`（追跡しない。`docs/reference/README.md`）。

### 5.1 公式の根拠

| # | 公式の記述 | 出典 |
| --- | --- | --- |
| 根拠 1 | MSPDI の日付の列（Task の Start・Finish・Stop・Resume・ActualStart・ActualFinish・Deadline、Project の StartDate・FinishDate・StatusDate、暦の例外の FromDate・ToDate、Task の Baseline の Start・Finish）は `xsd:dateTime` | `mspdi_pj12.xsd`（例: Finish は 1697 行、StatusDate は 662 行）、`mspdi_pj15.xsd` も同じ |
| 根拠 2 | 書式は「YYYY-MM-DDTHH:MM:SS」 | Learn「Introduction to Project XML Data」（`learn-docs/project-xml-data-interchange/introduction-to-project-xml-data.md` 78 行） |
| 根拠 3 | Start ／ Finish は「date and time」 | Learn `start-element.md`・`finish-element.md` の 13 行 |
| 根拠 4 | 時刻なしで開始日を入れると既定の開始時刻、終了日なら既定の終了時刻を使う。暦に書いた時刻はこの既定に優先する | https://support.microsoft.com/en-us/office/change-default-times-for-entered-start-or-finish-dates-1b3cf861-d045-4b72-94a5-60ea318d01ad |
| 根拠 5 | 既定は 8:00 A.M. と 5:00 P.M. | https://support.microsoft.com/en-us/project/how-project-schedules-tasks-behind-the-scenes |
| 根拠 6 | `DefaultStartTime` ／ `DefaultFinishTime` は `xsd:time`、「新しいタスクの既定の開始 ／ 終了時刻」 | `mspdi_pj12.xsd` 419〜426 行 |
| 根拠 7 | 帯を持たない dateTime は、ある場所の「ローカル」の時刻 | W3C XML Schema Part 2（`docs/reference/w3c/xmlschema-2.html`） |
| 根拠 8 | 暦の例外は、例で FromDate `T00:00:00`、ToDate `T23:59:00` と書かれる（規則としての定めは無い） | Learn `calendar-element.md` 154〜155 行 |

**公式に定めが無いこと**
- 終了が `00:00:00` の値をどう読むか。
- 期限・状況日・実績・中断・再開を時刻なしで入れたときの時刻。
- マイルストーンの時刻。
- 帯や小数秒を MSPDI の読み手が受けるか。
- ⚠️ 実機の MS Project での往復は、このセッションでは試していない。

### 5.2 決めたこと（`JDG-1205`）

| 列 | `GRS` が書く時刻 | 根拠 |
| --- | --- | --- |
| `start`・`BaselineTask.start`・`Project.startDate` | 既定の開始時刻 | 根拠 4 |
| `finish`・`BaselineTask.finish` | 既定の終了時刻 | 根拠 4 |
| `actualStart`・`resume` | 既定の開始時刻 | GRS の選択（根拠 3 の類推） |
| `actualFinish`・`stop`・`deadline`・`statusDate` | 既定の終了時刻 | GRS の選択（根拠 3 の類推） |
| マイルストーン（開始＝終了） | 既定の開始時刻 | GRS の選択（日付は開始として入れる。根拠 4） |
| 丸 1 日の範囲（暦の例外・`HighlightBox.startDate` ／ `endDate`・`CommentBox.anchorDate`・`scrollDate`） | `00:00:00` 〜 `23:59:00` | 根拠 8（例） |
| 取り込んだまま編集していない値 | 元の字面 | `EX-4` |

付随する決定:
- 既定の時刻は、MSPDI の `DefaultStartTime` ／ `DefaultFinishTime` を `Project` の列にして持つ（根拠 6）。無ければ `08:00:00` ／ `17:00:00`（根拠 5）。
- 暦の稼働時間は今は解釈しないので使わない。根拠 4 の「暦の時刻が優先する」は、時刻に対応するときに取り込む。
- スキーマの日時の `pattern` は `xsd:dateTime` の字面とする（根拠 1・根拠 7、`JDG-1200` を広げる）。`GRS` 自身は根拠 2 の書式で書く。
- 読むときは今も日だけを使う（`FR-054`）。時刻に対応する日は、値が既に公式どおりの瞬間なので、版による読み分けが要らない。

### 5.3 変える所（調整役へ）

| # | どこを | どう変えるか |
| --- | --- | --- |
| C-13 | 表 T-033 の `EX-7` | 「時刻は `00:00:00`」を 5.2 節の表に替える（列の種類ごとの時刻） |
| C-14 | `docs/spec/_assets/fig-erd-detail.md`・`erd.json` の `Project` | `defaultStartTime` ／ `defaultFinishTime`（`xsd:time` の字面、出自 Own、交換相手 `Project/DefaultStartTime` ／ `DefaultFinishTime`）を足す（今は `Project.carry` に持ち回っている） |
| C-15 | `erd_json_to_schema.py` と照合の表の生成器 | 日時の `pattern` を `xsd:dateTime` の字面にする。照合では捨てる（`JDG-1200`） |
| C-16 | 根の説明・プロンプトの原稿の手順 2・雛形・見本 | 「GRS は 00:00:00 を書く」を 5.2 節の時刻に替える。生成物は作り直す |
| C-17 | 書く路（`textOfDay` を使う所） | 開始の側と終了の側で時刻を分ける。MSPDI の書き出しも同じ時刻を書く |
| C-18 | 表 T-297 と見本 | 行を足さない（`JDG-1206`）。起動時の見本・3 年の見本・試験用の文書・案内の土台を新しい形で作り直す |
| C-19 | 表 T-033 の `EX-11`・`EX-12`、`AT-9`・`AT-11` | （`CreationDate` ／ `LastSaved` は C-23 へ移した —— `JDG-1210`）`ConstraintDate` は書き出した `Start` と同じ値。`ManualStart` ／ `ManualFinish` は書き出した `Start` ／ `Finish` と同じ日時を取り込んだ綴りで（`JDG-1207`） |
| C-20 | `AT-48`・`S-118`・`PR-42`・`VC-15`・`BD-2`・`delay-diagnostics.ts` の STOP | 解するのは `lagFormat` 7 だけ。パネルは稼働日で見せ、打つのは整数の稼働日で `lagFormat` 7 を書く。ほかの形式は読むだけ・数えない（`JDG-1208`）。起動時の見本の生成器が日数で書くラグを 0.1 分へ直す（6 節の D5） |
| C-21 | 表 T-052 の `DR-4`・起動時の文書の版 | 版を当てる日の日付へ上げる（`JDG-1209`） |
| C-22 | `mspdi-codec.ts` の取り込みと `import-document.ts` の合流 | どの `Task` も `TaskVisual` を 1 つ持つように作る（`JDG-1197`。6 節の D3 が測った 2 か所） |
| C-23 | `AT-9`・`AT-11`・表 T-059・`docs/spec/_source/erd.json` の `Project` | `created` は GRS で新しく作るときに書く。`lastSaved` の列を消し、MSPDI の `LastSaved` は書き出す瞬間の現地時刻で作る（表 T-059 の新しい行）。往復の突き合わせから外す（`JDG-1210`） |
| C-24 | スキーマの説明（`erd.json` の `schemaNote` と根の説明） | 日時の使い分けの理由を書く（`JDG-1211`）。付録 A の根の説明の日時の文は、下の 1 つ目に替える。<br>根の説明（日時の文を替える）: 「Times come in two kinds, for two reasons. Schedule dates (start, finish, deadline, statusDate, calendar exceptions, notes) are local date-times without a zone, exactly as MS Project writes them, so that they round-trip unchanged. GRS uses only their day for now; when it writes one it uses the project's default start time on a start-side column and its default finish time on a finish-side column, and 00:00:00..23:59:00 for a whole-day range, because that is what MS Project does with a date entered without a time, so the value already means the right instant when times are used. Record instants (documentStamp, changeLog) are UTC, so that every reader sees them in their own local time.」<br>`documentStamp`: 「When the document last changed and was saved, and who wrote it last. These instants live outside schedule and documentSettings so that writing them never moves either group's clock.」<br>`documentStamp.fileSavedUtc`: 「When this document was last written to its file. MS Project's LastSaved is not stored but made from the moment of export, so that the save time is held once and a save never counts as a schedule change.」<br>`Project.created`: 「MS Project's CreationDate: a local date-time like the schedule dates; GRS writes it when it makes a new document and keeps an imported one.」<br>`Project.defaultStartTime` ／ `defaultFinishTime`（新しい列）: 「MS Project's DefaultStartTime / DefaultFinishTime: the times GRS writes on start-side and finish-side dates; 08:00:00 and 17:00:00 when the file has none.」 |

## 6. 影響範囲（`JDG-1195`〜`JDG-1205` の全部、2026-10-03 に測った）

⭐ 測り方: 読むだけの体が `948b74cb` の木で測った。仕様は `impact.py`（行と UID は 1 段、表は 2 段）、ほかは grep と生成器・codec の読み。⚠️ 数は上限を含む（試験は列や値を名指すファイルの数で、実際に赤くなる数ではない）。

| 決定 | 仕様 | 原稿・生成器 | `src` | 試験 | 出荷する文書 |
| --- | --- | --- | --- | --- | --- |
| D1 `stackOrder` を消す（`JDG-1195`） | 9 行。`stackOrder` は命名規則の例（表 T-005 の `G-4`、表 T-006a の `W-2`・`W-7` ほか 5 行と `N-4`） | `erd.json`・プロンプトの原稿 2・スキーマ・ERD の図。`generate_startup_template.py` の 2 行 | 手書き 4（`mspdi-imported-rows.ts`・`task-create.ts` ほか）、生成物 3 | 92 ファイル | 起動時の見本・3 年の見本・試験用の文書・案内 2 |
| D2 読むとき完了率を数え直す（`JDG-1196`） | `FR-012`・`OP-6`・`AT-39`・`VC-5`・`VC-7` | プロンプトの原稿と案内 | 読み込みの呼び口 6（`json-codec.ts` の `documentFromJson` を呼ぶ所）。数え直しは `percent-complete.ts` の `repriced` が既にある | 17 ファイルに直接 | 3 本（食い違う値の数は測っていない） |
| D3 `TaskVisual` をちょうど 1 つ（`JDG-1197`） | 表 T-220 に新しい行 | — | ⚠️ 今これを破る 2 か所: `mspdi-codec.ts` の取り込み（`taskVisuals: []`）と `import-document.ts` の合流（`visuals.delete`）。代わりの描き方 約 8 か所 | 69 ファイル | ⚠️ 起動時の見本はタスク 1000 のうち 963 が持たない（3 年の見本と試験用の文書も同じ） |
| D4 日付の形を見せ、照合で捨てる（`JDG-1200`） | `FR-023`・`FR-024`・表 T-220 の前文・`UF-152` | `erd_json_to_schema.py`。⚠️ 照合の生成器 `generate_json_schema_validator.py` は語ごとにしか捨てられず、日付だけ捨てる仕組みが新しく要る | 手で直す所 0 | ⚠️ 試験の照合（`tests/fixtures/grs-document.ts` の ajv）は `pattern` を守らせる —— 最大 20 ファイル | — |
| D5 ラグは 0.1 分、パネルは日（`JDG-1201`） | `AT-47`（済）・`S-118`・`PR-42`・`S-128`・`VC-15`・`BD-2` | `settings.json`・`property-items.json`・`display-words.json`。⚠️ `generate_startup_template.py` がラグを日数で書き、日数であることを確かめている | `field-commit.ts`・`properties-panel.ts`・`edit-dependency.ts`。`delay-diagnostics.ts` の STOP（単位が未決）が外れ、`VC-15`・`BD-2` の結果が変わる | 23 ファイル | ⚠️ 見本 3 本のラグ 354 件が日数（MSPDI の見本は 0.1 分）—— 今、出荷データの中で単位が食い違う |
| D6 版の `const`（`JDG-1202`） | 表 T-052 の `DR-4` | `erd_json_to_schema.py`・照合の生成器の捨てる語 | 0 | 0（版を上げるたびに案内の例が動く） | 版の字面を持つ 6 本 |
| D7 書く時刻を側で分ける（`JDG-1205`） | `EX-7`・`EX-4`・`FR-054`・`AT-28` ほか、新しい `AT` 2 行と設定 2 行 | `erd.json`・プロンプトの原稿・`settings.json`・`published-entries.json`（`textOfDay`）。`generate_startup_template.py` の `text_of` | `textOfDay` の呼び口 45（17 ファイル）、うち書く所 約 36 | `T00:00:00` を持つ 86 ファイル、`Project` を組む 101 ファイル | 見本 3 本の日付 各 2,500〜2,600、案内の土台 14 |

**決めた文が見ていなかったこと**

| # | 何が | 誰が決めるか |
| --- | --- | --- |
| 見落とし 1 | 「読み替えはしない」（`JDG-601`）と、表 T-297 の MUST（退いた列の扱い）が両立しない。D1・D7 で必須の列が変わると、今保存されている `GRS JSON` は `RS-25` で文書ごと拒まれる | `JDG-1206`: 読み替えない（B） |
| 見落とし 2 | D7 の表に `Project.created`・`Project.lastSaved` が無い。GRS が MSPDI へ書く `ConstraintDate`・`ManualStart`・`ManualFinish` も無い | `JDG-1207`（前半は `JDG-1210` が覆した）: 5.3 節の C-19・C-23 |
| 見落とし 3 | D5 は日の形式しか見ていない —— `lagFormat` 8（暦日、1 日 = 1440 分）と 19・20（百分率）。日に満たない端数の丸め | `JDG-1208`: 日の形式だけを解する（A） |
| 見落とし 4 | D1・D7 で形式の版を上げるか | `JDG-1209`: 上げる（A） |
| 見落とし 5 | D2: 読むたびに数え直すので、AI が書いた完了率は無視され、`VC-5` は `GRS JSON` では出なくなる。開いただけで文書が変わりうる（試験 `dfc-378`） | 変更要求で扱う |
| 見落とし 6 | D7: 日付を文字列で比べる所（`delay-diagnostics-report.ts` の 1 日の判定、`edit-annotation.ts`・`edit-calendar.ts` の変化なしの判定）が時刻で誤る —— 日で比べる。マイルストーンを切り替えると終了の時刻も書き直す | 変更要求で扱う |
| 見落とし 7 | D3: 見本 3 本が `TaskVisual` を約 960 ずつ増やす —— 性能の関門（`JDG-605`）で測る | 変更要求で扱う |

## 付録 A —— 写しの 4 版で当てた説明（英語、そのまま原稿へ写せる形）

⭐ 作り方: 以下は scratchpad の `notes.py` から生成した。版 1 からの差は 2 節の指摘に従う。
⚠️ 数は、説明 21 か所 → 44 か所、スキーマの大きさ（字下げ無し）16,704 → 21,817 バイトである。

### A.1 根と群

| 置き場 | 説明 |
| --- | --- |
| 根 | A GRS schedule document. `schedule` is the data; `documentSettings` is how it is drawn when opened; `documentStamp` and `changeLog` record when, by whom and why it changed. Every key is written, null included, so that "the source had no value" and "the value is 0" are never confused. What comes from MS Project XML (MSPDI) keeps its names and codes, so that a round trip loses nothing. Dates are local date-times without a zone, as MS Project writes them; GRS uses only the day for now and writes 00:00:00, and a last day (finish, actualFinish, stop, endDate) is included. A null colour or width follows the theme. A custom colour gives the light-theme and the dark-theme value ("#light/#dark"; an empty side is drawn with the other), because a readable dark colour cannot be derived from a light one. |
| `schedule` | The data: what is exported to MS Project, and what GRS adds to draw it. |
| `documentSettings` | How the document is drawn when opened. Every key is written even at its default, so that a later change of a default never changes this picture. |
| `$defs/Carry`（新設） | Values of an imported MS Project element that GRS does not interpret, kept to write them back unchanged; {} when nothing was imported. |

### A.2 エンティティ（`description.en` を替える 12）

| エンティティ | 説明 |
| --- | --- |
| `Task` | One task: its plan, and its actual given by dates. |
| `Dependency` | One dependency, nested under the task that follows it, as MS Project nests it. |
| `TaskGroup` | A row on screen. Rows are kept apart from the WBS (Task.wbsParentUid) so that several tasks can share one row; rows are not exported to MS Project. |
| `TaskGroupMember` | Which row a task sits on; every task sits on exactly one row. |
| `WeekDay` | Whether one day of the week is worked. |
| `Exception` | An exception to a calendar's week, possibly recurring. |
| `TaskVisual` | How a task is drawn: its shape and its colours. |
| `TaskOrigin` | Where an imported task came from, so that importing the same file again updates the task instead of adding a copy. |
| `CarryElement` | One element of an imported MS Project file that GRS does not interpret, kept as it arrived so that it is written back unchanged. |
| `documentStamp` | When the document last changed and was saved, and who wrote it last. |
| `changeLog` | Why a change was made; the conversation that led to it is not stored. |
| `BaselineTask` | One task of an earlier plan, matched to the current task by uid and drawn only as an outline over it. |

### A.3 列（`schemaNote.en` を足す 22）

| 列 | 説明 |
| --- | --- |
| `Project.statusDate` | MS Project's StatusDate; the progress line is drawn on this day. |
| `Project.weekStartDay` | MS Project's numbering: 0 Sunday ... 6 Saturday (one less than WeekDay.dayType). |
| `Project.themeHue` | The hue that tasks and rows without a colour of their own are drawn in. It belongs to the project, not to the reader, so it is here and not in documentSettings. |
| `Project.uidHighWaterMark` | One counter for the uids of tasks, resources, assignments and calendars; uids are never reused, so new ones are taken above it. |
| `Task.milestone` | The fact, exported to MS Project; TaskVisual.shapeKind only draws it and must agree with it. |
| `Task.calendarUid` | Kept only for the MS Project round trip; working days are counted with the one calendar project.calendarUid names. |
| `Task.stop` | MS Project's Stop, kept under its name for the round trip: the last day the actual has reached while the task is unfinished; null once actualFinish is set. |
| `Task.resume` | MS Project's Resume: the day the rest of an interrupted task is planned to restart. |
| `Task.resumeValid` | MS Project's ResumeValid: false means interrupted with no restart day decided. |
| `Task.percentComplete` | Follows from the dates: round(actual length / planned length x 100), both in working days; GRS keeps it in step when dates change, so write what the dates give. Not capped at 100, because an overrun reports more. |
| `Task.fadeInDays` | Days at the start of the bar, inside start..finish, drawn slanted to say the start is not yet firm; a fact about the task, so it travels to MS Project rather than living in TaskVisual. |
| `Task.fadeOutDays` | As fadeInDays, for the finish. |
| `Dependency.linkType` | MS Project's codes: 0 finish-to-finish, 1 finish-to-start, 2 start-to-finish, 3 start-to-start. |
| `Dependency.lag` | MS Project's LinkLag: tenths of a working minute whatever lagFormat says (a day is project.minutesPerDay minutes). |
| `Dependency.lagFormat` | MS Project's LagFormat: the unit the lag is shown in (7 = days). |
| `TaskGroup.treeState` | Saved, like every row state, so that reopening shows what was saved. |
| `TaskGroupMember.stackOrder` | Not read: GRS stacks the tasks of a row automatically. Write null. |
| `WeekDay.dayType` | MS Project's numbering: 1 Sunday ... 7 Saturday (one more than Project.weekStartDay). |
| `Exception.fromDate` | MS Project's start of the recurrence, not a range of real days. |
| `Exception.recurrenceKind` | MS Project's Exception/Type: 1 daily, 2 yearly by day of the month, 3 yearly by position, 4 monthly by day of the month, 5 monthly by position, 6 weekly, 7 by day count, 8 by weekday count, 9 none. |
| `Resource.resourceKind` | MS Project's Type: 0 material, 1 work, 2 cost. |
| `Resource.calendarUid` | As Task.calendarUid. |
