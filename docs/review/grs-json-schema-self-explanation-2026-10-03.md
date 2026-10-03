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
