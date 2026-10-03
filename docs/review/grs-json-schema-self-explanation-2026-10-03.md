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

⛔ 2026-10-03: C-4 と C-7 は `CR-642` が当てなかった（`DFC-1795`・`DFC-1794`）。裁定 `JDG-1200`・`JDG-1202` の後、C-4 は C-15・C-29 が、C-7 は C-31 が継ぐ（5.3 節） —— 下の ⚠️ の 1 つ目と 2 つ目は裁定の前に書いた。

⚠️ 当てる前に確かめること。

- **`src/adapter/document-codec/grs-json-schema.ts` は、スキーマから刷られた照合の表である。** C-4 の `pattern` が入ると、日付だけの文書（1 回目の 2 体が書いた形）は読み込みで拒まれる（`RS-25`）。日程側は厳格という今の決まり（`OP-6`）のとおりであり、書き手の約束がはっきりする。
- **同ユニットの解する語に `const` があるかを確かめること**（`UF-152` は「11 の語だけを解し」と書く）。無ければ C-7 の前に足す。
- `withOwnSchemaVersion` が古い版の文書の版をどう扱うかも確かめること。
- **C-6 の既定値の正をどこに置くかは、当てる者が決める。** 設定の表の既定の欄は、`rulerFont` のように式で書かれた行がある。写しでは起動時の文書（`empty-document.json`）の値を使った。
- 生成物が変わるので `npm run gen` と `npm run gen:check` を回す。検査 75（案内の照合）も回す。

## 4. 残した問い（2026-10-03 にすべて裁定された）

| 番号 | 問い |
| --- | --- |
| `PND-675` | 誰も読まない `TaskGroupMember.stackOrder` を、文書から消すか ⇒ `JDG-1195`: 消し、積む向きに Why（C-25・C-26） |
| `PND-676` | 読み込んだ `percentComplete` が日付と食い違うとき、どちらを正とするか ⇒ `JDG-1196`: `GRS JSON` を読むときは日付が正（C-27） |
| `PND-677` | どの `Task` も `TaskVisual` を持たなければならないか ⇒ `JDG-1197`: ちょうど 1 つを課す（C-22・C-28） |
| `PND-678` | `fadeInDays`・`fadeOutDays` の名を「薄れ」と読む体が多い —— 名を変えるか ⇒ `JDG-1198`: 名は変えず 1 文で補う（`CR-642` で着地済み —— 7.4 節） |

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

⭐ 2026-10-03 に改めた —— 独立のレビューワーが「まだ変更要求にできない」とした指摘 14 を当てた。行の番号は統合点 `fc89944b` の木で測り直した。
⭐ どの C も「裁定」の欄に仕える裁定を名指す。裁定から C への引き当ては 7.2 節、C から変更要求への割り当ては 7.1 節が持つ。
⚠️ 「案」と書いた所は裁定が言っていないことであり、当てる変更要求が決める。

| # | 裁定 | どこを（`fc89944b` で測った） | どう変えるか | CR |
| --- | --- | --- | --- | --- |
| C-13 | `JDG-1205`・`JDG-1203`・`JDG-1204` | 表 T-033 の `EX-7`（`01-04-requirements.md:6193`） | 「時刻は `00:00:00`」を 5.2 節の表（列の側ごとの時刻）に替える。根拠の欄は公式の出典だけを名指し、類推で埋めた行は「GRS の選択」と名乗る（`JDG-1204`）。⭐ 1 文を足す —— MSPDI の `Project/FinishDate` は `GRS` が作る値で、最も遅い `Task.finish` の字面をそのまま書く（`mspdi-codec.ts:920`〜`:921` の `latestTaskFinish`、`:966`〜`:978`）ので、終了の側の時刻を継ぐ。⚠️ 当たるまで `EX-7` と `JDG-1205` は食い違ったまま（7.3 節） | D |
| C-14 | `JDG-1205` | `docs/spec/_assets/fig-erd-detail.md` の `Project` の行・`docs/spec/_source/erd.json` の `Project` | `defaultStartTime` ／ `defaultFinishTime` を足す（`xsd:time` の字面、可、出自 Own、交換相手 `Project/DefaultStartTime` ／ `DefaultFinishTime`）。今は取り込みで `Project.carry` に入り、書き出し（`mspdi-codec.ts:891` の `writtenProjectChildren`）は名で書かない。往復は C-33 | D |
| C-15 | `JDG-1200`・`JDG-1205` | `docs/spec/_source/erd_json_to_schema.py`（`:30`〜`:32` が「a date column carries NO pattern yet」と書く）・`tools/generate_json_schema_validator.py`・`tests/fixtures/grs-document.ts` | ⭐ 最小の形。① スキーマは `$defs/DateTime` を 1 つ置き（`{"type": ["string", "null"], "pattern": …}`）、`isDate` の 18 列をどれもそれへの `$ref` にする —— 18 列はどれも `null` 可（`erd.json` で数えた）。`pattern` は `xsd:dateTime` の字面 `^-?\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z\|[+-]\d{2}:\d{2})?$`（小数秒と帯を許す。`JDG-1205` が `JDG-1200` の字面を広げた）。② 照合の表の生成器は、パスで語を捨てる仕組みを既に持つ —— `RELAXED_ROOT`（`:106`）と `RELAXED_OFF`（`:116`）を `:172`〜`:176` が読む。同じ形でポインタの定数を 1 つ（`/$defs/DateTime`）足し、そこでは `pattern` だけを捨て、理由を「日付は `FR-023` の検査（`IV-14`。先頭の日を読み、使えない行だけ落とす）が見る」と書く。⚠️ `$ref` の隣に `DROPPED` でない語を置くと生成器は止まる（`:150`〜`:157`）—— `pattern` は `$defs` の側だけに置く。③ `scrollDate` は `documentSettings` の下なので、`pattern` は既に `RELAXED_OFF` で捨てられる —— スキーマに出すだけでよい。④ 試験の側の ajv（`tests/fixtures/grs-document.ts:11`、`strict: false` で `pattern` を守らせる。読み込むファイルは 30）は書く路（`FR-024`）の確かめなので守らせたままにし、`FR-023` の入力（使えない日付）をその確かめに通さない —— 通している試験を CR A が数えて分ける | A |
| C-16 | `JDG-1205` | 原稿の手順 2（`docs/spec/_source/image-to-grs-json-prompt.ja.md:25` ほか、`.en.md` も）・案内の土台（`docs/guides/schedule-to-grs-json/grs-skeleton.json`）・見本 | 「`T00:00:00` の形」を 5.2 節の時刻に替える。生成物は作り直す（C-18）。根の説明は C-24 が持つ | D |
| C-17 | `JDG-1205` | 書く路の `textOfDay`（`src/entity/document-model/schedule/calendar-day.ts:30`〜`:33`、いつも `T00:00:00` を書く）。呼び口 46（18 ファイル） | ⛔ `textOfDay` は日だけを表す鍵の字面として変えない —— 毎フレームの路が `Map` の鍵に使う（`task-figures.ts:668`、`schedule-layout.ts:193`。`frame-loop.ts:1876` の `readToday` も同じ関数）ので、側で時刻を変えると同じ日の鍵が割れる。⭐ 書く所にだけ、側ごとの書き手（開始の側・終了の側・丸 1 日）を別に足し、C-14 の 2 列を読ませる。MSPDI の書き出しも同じ書き手を使う。⚠️ 毎フレームの源に触れるので、当てるコミットは `docs/development-records/perf-pending.md` に CR の行を 1 つ持つ（検査 66） | D |
| C-18 | `JDG-1206`・`JDG-1209` | 表 T-297（足さない）・起動時の見本・3 年の見本（`sample-schedule/Three-Year Product Plan.json`）・試験用の文書・案内の土台 | 行を足さない（`JDG-1206`）。D の形で全部を 1 度だけ作り直す —— D の版を上げた後。⭐ `DFC-1799`（3 年の見本が刊行するスキーマに 2175 件合わない）はこの作り直しで閉じる | D |
| C-19 | `JDG-1207` の後半（`JDG-1210` が保つ） | 表 T-033 の `EX-11`（`01-04-requirements.md:6197`）・`EX-12`（`:6198`） | `ConstraintDate` は書き出した `Start` と同じ値（開始の側の時刻を含む）。`ManualStart` ／ `ManualFinish` は書き出した `Start` ／ `Finish` と同じ日時を、取り込んだ綴りで。（`CreationDate` ／ `LastSaved` は C-23 —— `JDG-1207` の前半は `JDG-1210` が覆した） | D |
| C-20 | `JDG-1201`・`JDG-1208` | `AT-48`（`fig-erd-detail.md:361`）・`S-118`（`tbl-settings.md:652`）・`PR-42`（`tbl-property-items.md:69`）・`VC-15`（`01-04-requirements.md:3434`）・`BD-2`（`:3511`）・`delay-diagnostics.ts:333` の STOP・`field-commit.ts:340`〜`:343`・`edit-dependency.ts:102`〜`:103`・`:136`・`tools/generate_startup_template.py:2336`〜`:2341` と `:3328` | 保存は 0.1 分（`AT-47` は `CR-642` で済み）。`S-118` を「見せる単位: 稼働日」と読める文に替える。解するのは `lagFormat` 7 だけ —— パネルは稼働日で見せ、打つのは整数の稼働日で、書くときは 日数 × `Project.minutesPerDay`（空なら `S-128`）× 10 を `lag` に、7 を `lagFormat` に書く（新しい依存は今 `lagFormat: null` を書く —— `edit-dependency.ts:103`）。ほかの形式はパネルで MS Project の字面（`2ed`・`50%`）で読むだけ、遅延診断は数えず（`VC-15`・`BD-2` の結果が変わる）、値は往復でそのまま。取り込んだ端数は見せるだけ。起動時の見本の生成器が日数で書くラグ（`:2336`）と、日数であることを確かめる所（`:3328`）を 0.1 分へ直す。⚠️ 当たるまで `S-118` と `AT-47` は食い違ったまま（7.3 節） | B |
| C-21 | `JDG-1209` | 表 T-052 の `DR-4`（`01-04-requirements.md:6385`）・`FR-073`・`FR-024`・`tools/generate_startup_template.py:140` の `SCHEMA_VERSION` | 版の正は 1 つ —— `SCHEMA_VERSION`（`startup-template-manifest.json:2` へ刷られる。スキーマの `const` も同じ所から読む —— C-31）。D の全部を 1 つの CR に入れ、版を 1 度だけ、当てる日の日付へ上げる | D |
| C-22 | `JDG-1197` | `mspdi-codec.ts:381`（取り込みが `taskVisuals: []` を組む）・`import-document.ts:783`（合流が `visuals.delete(uid)` する） | どの `Task` も `TaskVisual` を 1 つ持つように作る。無いときの代わりの描き方（約 8 か所）は C-28 の不変条件が立った後に消す | D |
| C-23 | `JDG-1210` | `AT-9`（`fig-erd-detail.md:320`）・`AT-11`（`:322`、消す）・`AT-140`（`:449`）・表 T-059（`:464`）・`FR-101`・`erd.json:580`（`created`）・`:613`（`lastSaved`）・`mspdi-codec.ts:406`・`:408`（読む）・`:910`・`:912`（書く） | `created` は `GRS` で新しく作るときに、その場所の時刻（帯なし）を書く。取り込んだ値は保つ。`lastSaved` の列を消し、MSPDI の `LastSaved` は書き出すその瞬間の現地時刻（帯なし、秒まで）で作る（表 T-059 に行）。往復の突き合わせから外す（`fileSavedUtc` と同じ扱い） | D |
| C-24 | `JDG-1211`・`JDG-1210` | スキーマの説明（`erd.json` の `schemaNote` と、`erd_json_to_schema.py:167` の `ROOT_DESCRIPTION` —— `:173`〜`:174` が今「writes 00:00:00」と言う） | 日時の使い分けの理由を書く（`JDG-1211`）。⚠️ `fileSavedUtc` の文は、`JDG-1210` の文案の 3 つの理由（`schedule.project` でなく刻印に置くので保存が `scheduleUpdatedUtc` を動かさない ／ UTC なので読む人の現地時刻で示せる ／ `LastSaved` は書き出しで作る）を落とさないこと。付録 A の根の説明の日時の文は、下の 1 つ目に替える。<br>根の説明（日時の文を替える）: 「Times come in two kinds, for two reasons. Schedule dates (start, finish, deadline, statusDate, calendar exceptions, notes) are local date-times without a zone, exactly as MS Project writes them, so that they round-trip unchanged. GRS uses only their day for now; when it writes one it uses the project's default start time on a start-side column and its default finish time on a finish-side column, and 00:00:00..23:59:00 for a whole-day range, because that is what MS Project does with a date entered without a time, so the value already means the right instant when times are used. Record instants (documentStamp, changeLog) are UTC, so that every reader sees them in their own local time.」<br>`documentStamp`: 「When the document last changed and was saved, and who wrote it last. These instants live outside schedule and documentSettings so that writing them never moves either group's clock.」<br>`documentStamp.fileSavedUtc`: 「When this document was last written to its file. It lives in documentStamp, not in schedule.project, so that a save does not move scheduleUpdatedUtc; it is UTC so that each reader sees it in their own local time. MS Project's LastSaved is not stored but made from the moment of export, so that the save time is held once and a save never counts as a schedule change.」<br>`Project.created`: 「MS Project's CreationDate: a local date-time like the schedule dates; GRS writes it when it makes a new document and keeps an imported one.」<br>`Project.defaultStartTime` ／ `defaultFinishTime`（新しい列）: 「MS Project's DefaultStartTime / DefaultFinishTime: the times GRS writes on start-side and finish-side dates; 08:00:00 and 17:00:00 when the file has none.」 | D |
| C-25 | `JDG-1195` | `AT-62`（`fig-erd-detail.md:375`、図の行 `:95`）・`erd.json:1628`・生成物 4（`grs-json-schema.ts:281`・`:290`、`schedule-entities.ts:156`、`startup-template.json`、`image-to-grs-json-prompt.json`）・手書き 2（`mspdi-imported-rows.ts:49`、`task-create.ts:90`）・`tools/generate_startup_template.py:1548`（書く）と `:4142`〜`:4157` の `check_stack_order`（呼び口 `:4404`）・原稿の手順 3（`image-to-grs-json-prompt.ja.md:62`・`.en.md:62`）・名の例（表 T-005 の `G-4` = `01-04-requirements.md:254`、語幹の例 `:312`、表 T-006a の `W-2` = `:327`・`W-7` = `:332`、所属の例 `:405`、`tbl-glossary.md:31` の `N-4`）・`ST-6`（`:1568`）・付録 A の `TaskGroupMember.stackOrder` の行 | 列を文書から消す（運用前なので読み替えない —— `JDG-1206`）。積む順は `ST-2` の自動のまま。生成物は `npm run gen` で刷り直す。名の例は生きた列の名へ替える（案: `W-2` は `groupId`、`W-7` は `TaskGroupMember.groupId`）。`G-4`・`N-4` の語「積み順」を、列を指さない語として残すか退かせるかは CR D が決める。`ST-6` の「人が `stackOrder` を指定した」の文を列なしで書き直す。試験は 93 ファイルが名を持つ（上限） | D |
| C-26 | `JDG-1195` | `ST-5`（`01-04-requirements.md:1567`）・`S-58`（`tbl-settings.md:163`）・スキーマの `documentSettings.stackDirection`（`grs-document.schema.json:263`、今は `enum` と `default` だけ） | `ST-5` と `S-58` に Why を 1 文 —— `up` は右上のゴールへ積み上げる図、`down` は右下のゴールへ積み下げる図にするため。スキーマにも 1 文。⚠️ `documentSettings` の鍵に説明を出す路が生成器に無い（`erd_json_to_schema.py:377` は列の `schemaNote` だけを `description` にする）—— `settings.json` の行に `schemaNote` を持たせて刷る路を足す。文案: 「up stacks a row's tasks so that the chart climbs to a goal at the upper right; down stacks them so that it descends to a goal at the lower right.」 | D |
| C-27 | `JDG-1196` | `FR-012`（`01-04-requirements.md:3134`〜）・`OP-6`（`:6578`）・`AT-39`（`fig-erd-detail.md:352`）・`VC-5`（`01-04-requirements.md:3424`）・`erd.json:1176` の `schemaNote`・`documentFromJson`（`json-codec.ts:336`）の呼び口 6 | ① `FR-012` に 1 文: `GRS JSON`（単一 `.html` に埋め込んだものを含む）を読んだときも、格納済みの完了率を日付から数え直す。MSPDI を読んだときは取り込んだ値を保つ（`FR-021`）。今の `FR-012` は「日付を編集したとき」と暦の編集だけを言う。② `OP-6` と `AT-39` に同じ向きを 1 句。③ 読む路の呼び口は 6 —— `agent-api-members.ts:285`・`embedded-html-codec.ts:156`・`document-file-flow.ts:249`・`:344`・`:740`・`single-html-shell.ts:222`。数え直しは `percent-complete.ts:45` の `repriced` が既に持つ。6 か所に散らさず 1 か所で当てる席と、`Agent API` の読み（`:285`）が「`GRS JSON` を読んだとき」に入るかを CR C が決める。④ `VC-5`（`percentComplete` が 0 より大きいのに `actualStart` が無い）は、数え直した `GRS JSON` では立たない —— MSPDI だけに当たる行と書く。⑤ `schemaNote` の「GRS keeps it in step when dates change, so write what the dates give」を「GRS recounts it from the dates whenever it reads this file, so the dates decide; write what they give.」に替える。⑥ 開いただけで値が変わりうる（見落とし 5、試験 `dfc-378`）—— 件数を告げる（`FR-012` の暦の数え直しと同じ `NT-3`・`RS-52`）か黙って直すかを CR C が決める | C |
| C-28 | `JDG-1197` | 表 T-220（`05-07-design.md:1304` の `IV-6` の隣）・`AT-97`（`fig-erd-detail.md:410`）・`erd.json` の `TaskVisual` の説明 | `IV-6` と同じ形の行を足す: 「どの `Task` も、ちょうど 1 つの `TaskVisual` から指されること ｜ `Task` の主キーと `TaskVisual.taskUid` ｜ 構造」。`AT-97` の意味の欄に「どの `Task` にもちょうど 1 つ」。スキーマの `TaskVisual` の説明に `TaskGroupMember` と同じ形の 1 句（「every task has exactly one」） | D |
| C-29 | `JDG-1200` | 表 T-220 の前文（`05-07-design.md:1290`「日程データの群がスキーマに合わない文書は、文書ごと拒む」）・`UF-152`（`:483`「11 の語だけを解し」）・`FR-024`（`01-04-requirements.md:6359`〜） | ① `:1290` の MUST に、日時の列の `pattern` だけを外す 1 文を足す —— 日時の形は `IV-14` と `FR-023` が判じ、照合の表に載せない（使えない日付の行だけを落とすため）。② `UF-152` に、日付の `pattern` を捨てることを 1 句。③ `FR-024` に「日時の列は、いつも日時の形で書くこと（MUST）」を足す —— 今の `FR-024`（`:6361`〜`:6369`）に日時の形の文は無い | A |
| C-30 | `JDG-1201` | 原稿の手順 5（`image-to-grs-json-prompt.ja.md:54`「null なら 480 分」、`.en.md:54`「480 when that is null」）・`erd.json:1347` の `Dependency.lag` の `schemaNote`・案内の手順 5（`DFC-1796`） | 手順 5 の 480 は `S-128`（🔎 の値）の手の写しである —— 生成器が `S-128` から刷る（今の原稿の生成器 `tools/generate_image_to_grs_json_prompt.py` は散文の値を差し込まない）か、値を書かない文にする。`schemaNote` は `minutesPerDay` が `null` のときの換算を言わない —— 同じく `S-128` から刷った値で 1 句足す。手書きの案内（`DFC-1796`）も同じ文へ | B |
| C-31 | `JDG-1202`・`JDG-1209` | `erd_json_to_schema.py`・`tools/generate_json_schema_validator.py` の `DROPPED`（`:92`〜`:100`）・`DR-4`（`01-04-requirements.md:6385`） | （`CR-642` が当てなかった C-7 を継ぐ）スキーマは `schemaVersion` を `const` で言う。値は `tools/generate_startup_template.py:140` の `SCHEMA_VERSION` から読み、打ち込まない（C-21）。照合の表の生成器は `DROPPED` に `const` を足し、理由を「版は `formatVersionReading` が判じる」とする（`JDG-1202`）—— `json-codec.ts:351` が照合（`:357`）の前に判じる。`DR-4` に、スキーマが版を `const` で言うことを 1 文 | A |
| C-32 | `JDG-1205` | 5.2 節の表の「丸 1 日の範囲」の行 | `JDG-1205` が言わない 3 つを決める。① `CommentBox.anchorDate` と `scrollDate` は範囲ではなく 1 点である —— 1 点が書く時刻を名指す（案: 範囲の始まりと同じ `00:00:00`。根拠 8 の FromDate の例）。② 既定の時刻 `08:00:00` ／ `17:00:00` の置き場を名指す（案: `tbl-settings.md` と `settings.json` の新しい 2 行。生成器が刷り、`src` に打ち込まない —— 6 節の D7 の「設定 2 行」）。③ 保存された `defaultStartTime` ／ `defaultFinishTime` が `xsd:time` の字面でないとき（案: `GRS JSON` ではスキーマが `xsd:time` の `pattern` を言い、照合はそれを守らせる —— 日程データの群なので `05-07-design.md:1290` のとおり文書ごと拒む。MSPDI の取り込みでは字面の合わない値を列へ移さず `carry` に残し（`EX-4`）、列は `null` で ② の既定を使う） | D |
| C-33 | `JDG-1205`（`FR-021` の往復） | `mspdi-codec.ts` の取り込み（`Project` の知らない子は `Project.carry` へ）と書き出し（`:891`〜`:922` の `writtenProjectChildren`）・`mspdi-child-order.json:37`〜`:38`（XSD の並び: `CalendarUID` の後、`MinutesPerDay` の前） | 取り込みで `DefaultStartTime` ／ `DefaultFinishTime` を `carry` から列（C-14）へ移し、書き出しでは XSD の並びの位置に `PlacedChild` として書く。`carry` に残すと、2 度書くか、列の値が書き出しに届かない | D |
| C-34 | `JDG-1205`（見落とし 6） | `delay-diagnostics-report.ts:181`（`plannedStart === plannedFinish` で 1 日を判じる）・`edit-annotation.ts:222`（`anchorDate ===`）・`:293`〜`:294`（`startDate` ／ `endDate ===`）・`edit-calendar.ts:155`〜`:156`（`fromDate` ／ `toDate ===`） | 日付の字面の等しさを、日で比べる形に替える（`dayOf`・`compareDays`）—— 開始の側 `08:00` と終了の側 `17:00` は同じ日でも字面が違う。マイルストーンを切り替えるときは終了の時刻も書き直す | D |
| C-35 | `JDG-1197`（見落とし 7） | 見本 3 本（起動時の見本はタスク 1000 のうち 963 が `TaskVisual` を持たない）・性能の関門（`JDG-605`） | C-18 の作り直しで `TaskVisual` が見本ごとに約 960 増える —— 主へ早送りする前に性能の関門で測り、毎フレームの路が描く数の差を報告する | D |

## 6. 影響範囲（`JDG-1195`〜`JDG-1205` の全部、2026-10-03 に測った）

⭐ 測り方: 読むだけの体が `948b74cb` の木で測った。仕様は `impact.py`（行と UID は 1 段、表は 2 段）、ほかは grep と生成器・codec の読み。⚠️ 数は上限を含む（試験は列や値を名指すファイルの数で、実際に赤くなる数ではない）。

| 決定 | 仕様 | 原稿・生成器 | `src` | 試験 | 出荷する文書 |
| --- | --- | --- | --- | --- | --- |
| D1 `stackOrder` を消す（`JDG-1195`） | 9 行。`stackOrder` は命名規則の例（表 T-005 の `G-4`、表 T-006a の `W-2`・`W-7` ほか 5 行と `N-4`） | `erd.json`・プロンプトの原稿 2・スキーマ・ERD の図。`generate_startup_template.py` の書く 1 行（`:1548`）と確かめる `check_stack_order`（`:4142`〜`:4157`、呼び口 `:4404`） | 手書き 2（`mspdi-imported-rows.ts:49`・`task-create.ts:90`）、生成物 4（`grs-json-schema.ts`・`schedule-entities.ts`・`startup-template.json`・`image-to-grs-json-prompt.json`） —— 2026-10-03 に `fc89944b` で数え直した（前は「手書き 4、生成物 3」と書いていた） | 92 ファイル | 起動時の見本・3 年の見本・試験用の文書・案内 2 |
| D2 読むとき完了率を数え直す（`JDG-1196`） | `FR-012`・`OP-6`・`AT-39`・`VC-5`・`VC-7` | プロンプトの原稿と案内 | 読み込みの呼び口 6（`json-codec.ts` の `documentFromJson` を呼ぶ所）。数え直しは `percent-complete.ts` の `repriced` が既にある | 17 ファイルに直接 | 3 本（食い違う値の数は測っていない） |
| D3 `TaskVisual` をちょうど 1 つ（`JDG-1197`） | 表 T-220 に新しい行 | — | ⚠️ 今これを破る 2 か所: `mspdi-codec.ts` の取り込み（`taskVisuals: []`）と `import-document.ts` の合流（`visuals.delete`）。代わりの描き方 約 8 か所 | 69 ファイル | ⚠️ 起動時の見本はタスク 1000 のうち 963 が持たない（3 年の見本と試験用の文書も同じ） |
| D4 日付の形を見せ、照合で捨てる（`JDG-1200`） | `FR-023`・`FR-024`・表 T-220 の前文・`UF-152` | `erd_json_to_schema.py`。照合の生成器 `generate_json_schema_validator.py` は、パスで語を捨てる仕組みを既に持つ（`RELAXED_ROOT` `:106`・`RELAXED_OFF` `:116`） —— 日付の `$defs` のポインタを 1 つ足せば済む（C-15）。⚠️ 2026-10-03 に改めた —— 前は「語ごとにしか捨てられず、新しい仕組みが要る」と書いていた（誤り） | 手で直す所 0 | ⚠️ 試験の照合（`tests/fixtures/grs-document.ts` の ajv）は `pattern` を守らせる —— 最大 20 ファイル | — |
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

## 7. CR split（変更要求への分け方）

⭐ 2026-10-03、独立のレビューワーの順に従う。番号と当てる時期は調整役が配る（`JDG-1199`）。

### 7.1 4 つの変更要求

⭐ A・B・C は形を変えないので版を上げず、互いに独立である。⛔ どれも D の前に当てる —— D は見本と雛形を 1 度だけ作り直し、版を 1 度だけ上げる（`JDG-1209`）。

| CR | 中身 | C | 版 |
| --- | --- | --- | --- |
| A | 日付の形と版をスキーマで見せ、照合では捨てる（`JDG-1200`・`JDG-1202`、`JDG-1205` の `pattern` の字面） | C-15・C-29・C-31 | 上げない |
| B | ラグ（`JDG-1201`・`JDG-1208`） | C-20・C-30 | 上げない |
| C | 読むとき完了率を数え直す（`JDG-1196`） | C-27 | 上げない |
| D | 形を変える 1 つの変更要求（`JDG-1209` の版上げ 1 度）—— `stackOrder` を消す、`TaskVisual` の不変条件、側ごとの時刻と `Project` の 2 列、`created` ／ `lastSaved`（`JDG-1210`）、説明（`JDG-1211`）、見落とし 6、見本・試験用の文書・案内の土台の作り直し | C-13・C-14・C-16・C-17・C-18・C-19・C-21・C-22・C-23・C-24・C-25・C-26・C-28・C-32・C-33・C-34・C-35 | 上げる |

⇒ 数: A 3、B 2、C 1、D 17、計 23（C-13〜C-35）。どの C もちょうど 1 つの変更要求に属する。
⚠️ C-1〜C-12 は `CR-642` の一覧である（3 節）。そのうち `CR-642` が当てなかった C-4 は C-15・C-29 が、C-7 は C-31 が継ぐので、4 つの変更要求には数えない。

### 7.2 裁定から C への引き当て（`JDG-1195`〜`JDG-1211`）

| 裁定 | C | 備考 |
| --- | --- | --- |
| `JDG-1195` | C-25・C-26 | |
| `JDG-1196` | C-27 | |
| `JDG-1197` | C-22・C-28・C-35 | |
| `JDG-1198` | C-1（`CR-642` で着地済み） | 7.4 節 |
| `JDG-1199` | —— | 手順の指示。本節がそれを果たす（レビューを経た一覧を、調整役が変更要求へ分ける） |
| `JDG-1200` | C-15・C-29 | |
| `JDG-1201` | C-20・C-30 | |
| `JDG-1202` | C-31 | |
| `JDG-1203` | C-13 | 5 節で決めた時刻を `EX-7` へ着地させる |
| `JDG-1204` | C-13 | `EX-7` の根拠は公式の出典だけ、類推は「GRS の選択」 |
| `JDG-1205` | C-13・C-14・C-15・C-16・C-17・C-32・C-33・C-34 | |
| `JDG-1206` | C-18・C-25 | 読み替えない ／ 見本を作り直す |
| `JDG-1207` | C-19 | 前半は `JDG-1210` が覆した（C-23） |
| `JDG-1208` | C-20 | |
| `JDG-1209` | C-21・C-31 | 版の正は `SCHEMA_VERSION` の 1 つ |
| `JDG-1210` | C-23・C-24 | |
| `JDG-1211` | C-24 | |

### 7.3 当たるまで食い違ったままのもの

| 食い違い | 一方 | もう一方 | 消す C |
| --- | --- | --- | --- |
| ラグの単位 | `S-118`「ラグの単位: 稼働日」（`tbl-settings.md:652`） | `AT-47`「単位は `lagFormat` が何であっても 0.1 分」（`fig-erd-detail.md:360`） | C-20（B） |
| 書く時刻 | `EX-7`「`GRS` が書く日付の時刻は `00:00:00`」（`01-04-requirements.md:6193`）と、根の説明の「writes 00:00:00」（`erd_json_to_schema.py:173`〜`:174`） | `JDG-1205`（側ごとの時刻） | C-13・C-24（D） |

⚠️ 当たるまで、裁定はまだ仕様に無い。実装する者は裁定を先取りしない —— 食い違いは右の C が当たって消える。

### 7.4 `JDG-1198` と `CR-642` の突き合わせ

- `JDG-1198` の状態は「適用済 —— `CR-642` が当てた」である。
- 一方 `CR-642` は、6 行と 210 行で「`PND-675`〜`PND-678` は決めない」「どちらの答えも先取りしない」と書く。
- ⇒ 両方とも事実である。`CR-642` が当てた `Task.fadeInDays` の `schemaNote`（`erd.json:1196`「drawn slanted to say the start is not yet firm」）は、名を変えずに 1 文で補う形であり、後から下りた `JDG-1198` と同じ形だった。
- `CR-642` は着地済みなので追記しない（検査 62）。突き合わせは本節と `JDG-1198` の状態の欄が持つ。

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
