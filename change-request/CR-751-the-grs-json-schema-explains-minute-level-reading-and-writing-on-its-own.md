# CR-751 —— GRS JSON のスキーマが、日単位と分単位の読み書きを自分で説明する

> 起草の状態: 起草だけ（2026-10-15、`f7adce14` の上）。当てていない —— 仕様の差し替え・`npm run gen`・試験は調整役が体に手配する（利用者の指示 2026-10-15「調整役に仕様書を差し替えてGRSに実装してもらえ」）。
> ID の帯: 番号 `CR-751`、台帳 `DFC-2493`〜`DFC-2505`、裁定 `JDG-2039`〜`JDG-2042`（使ったのは `2039`・`2040`）を調整役から受けた（`handoff.md` の `475cb1de`）。変更履歴と `perf-pending` の番号は当てる体が調整役から受ける。
> 当てるもの: `JDG-2039`（タイムゾーンの 28 の地名を選択肢として縛る）・`JDG-2040`（スキーマだけを渡した新しい体に日単位と分単位の日程を書かせる試験の手順）、台帳 `DFC-2493`〜`DFC-2505`。
> 起こり: 進捗の表 10-15 版（`studies/38-project-progress/`）を分単位で書いた席が、スキーマだけでは分からず仕様とコードを読んだ 13 点。利用者の言葉（2026-10-15）:「初見AIがGRSのJSONのスキーマを読むだけでスケジュールの読み書き方法を理解できることが要求だ。」

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`f7adce14`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| スキーマは手で直さない | `docs/spec/_source/grs-document.schema.json` の `$comment`「Generated from … Never edit by hand」。生成器は `docs/spec/_source/erd_json_to_schema.py`、`npm run gen:check` が食い違いを赤にする | 直す先は原本（`erd.json` の `schemaNote`・`settings.json` の行・生成器の定数）。スキーマは生成し直すだけ |
| 説明の規則はすでに在る | 生成器の頭の注「THE SCHEMA EXPLAINS ITSELF TO ONE WHO HAS ONLY IT (CR-642)」、`05-07-design.md` の 6.2 節（説明は概要と理由だけ、仕様の ID を書かない） | 規則は変えない。`CR-710` と `CR-741` が読みを変えたときに説明が直らなかった |
| 先頭の説明が古い | 生成器の `ROOT_DESCRIPTION`（`erd_json_to_schema.py` の 242〜253 行）「GRS uses only their day for now」「A last day (finish, actualFinish, stop, endDate) is included」 | `FR-054` は日時を日程データのタイムゾーンの瞬間として分まで読む（秒は切り捨て、時差を換算しない）—— X-1 |
| マイルストーンの時刻の規則が 3 か所で食い違う | 表 T-350 の `WT-5`（終了の側の時刻で、開始と終了が同じ瞬間）と `ROOT_DESCRIPTION` は合う。`docs/guides/schedule-to-grs-json/prompt-ja.md` の 46 行目、`docs/spec/_source/image-to-grs-json-prompt.ja.md`・`.en.md` の 25 行目は「開始の側の時刻」 | 3 つの写しを `WT-5` へ合わせる —— X-3 |
| `stop` と `percentComplete` の説明が日の言い方 | `erd.json` の `Task.stop`「the last day the actual has reached」、`Task.percentComplete`「both in working days」。`FR-011` は実績の長さを `actualStart` から `actualFinish`（未完了なら `stop` の瞬間）まで、`FR-012` は稼働時間の分で数える | X-4・X-5 |
| `WorkingTime` の規則がスキーマに無い | `IV-24`（0 本か 1〜`S-582` 本、始まりが終わりより前、終わりの `00:00:00` は 24:00、重ならない、接するのはよい）、`AT-162`。`WorkingTime` の列と `workingTimes` の配列に説明が無い | X-6・X-7 |
| `minutesPerDay` が `RS-89` を起こすことを書き手が知れない | `FR-054`（1d は `minutesPerDay`、空なら `S-128`）、`RS-89`（時間帯の合計が `minutesPerDay` と違う稼働日を持つ文書を開いたとき）。コードは例外日も数える（`working-calendar.ts` の `holdsWorkingDayUnlikeMinutesPerDay`）が、仕様は「稼働日」としか言わない | X-8。仕様に「例外日も数える」を足す |
| 例外日の `fromDate` の説明が 1 回きりの例外日と食い違う | `erd.json` の `Exception.fromDate`「not a range of real days」と `AT-79`・`AT-80`（繰り返しの起点）に対し、`WC-4` は「繰り返しの無い例外日では、始まりと終わりの日が実日付の範囲」 | X-9 |
| 地名がスキーマに無く、名簿の外の値の読みを仕様が言わない | `FR-156` は 表 T-376 の 28 個から選ばせる。スキーマの `scheduleDataTimeZone` は `type: string` で、説明が `FR-156` を名指す（6.2 節の「仕様の ID を書かない」に反する）。コードは名簿の外を UTC として読む（`time-zone.ts`）が、編集の命令は拒む（`edit-project.ts`） | X-10（`JDG-2039`） |
| `viewTimeZone` に型が無い | `$comment`「Settings keys whose own row does not say what type they hold, left unconstrained here: viewTimeZone」。`S-574`（表 T-376 の地域名か `null`）・`S-575`（0〜4 個の地域名）の行に機械の型が無い | X-11 |
| `documentSettings` の 34 キーのうち 33 に説明が無い | 生成したスキーマを数えた。説明を持つのは `stackDirection` だけ | 名と構造で分かるキーには足さない（`JDG-1190`）。分単位の書き手が迷った `showsTimeOfDay`・`fitSpanFixed` と `Project.statusDate` だけ —— X-12 |

### 0.2 裁定の鎖（`rulings.md` を「スキーマ」「自己説明」「初見」「`scheduleDataTimeZone`」「T-376」「地名」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1190` | スキーマだけを渡された初見の AI が誤解せずに日程を書けること。説明は概要と Why だけ、What の説明が要るなら名か構造で言う | 守る —— 本書の説明は Why と、名からは読めない約束だけ。言えることは `enum` などの構造で言う |
| `JDG-1191` | 日時は時刻まで持つ形（帯なし、MSPDI と同じ）を保つ | 変えない。時刻を必ず書くことを説明で言う |
| `JDG-1192` | MSPDI 由来の符号は説明で補ってよい | `WorkingTime.toTime` の `00:00:00`（24:00）と `Exception` の範囲の説明はこれに当たる |
| `JDG-1193` | `Task.stop` は名を変えず 1 文で補う | その 1 文を分の言い方へ直す（X-4） |
| `JDG-1194` | 写しで試し、初見の体に読ませ直して効いた形だけを渡す | 1 回きりだった。`JDG-2040` が手順にする（X-14） |
| `JDG-2039` | 28 の地名を選択肢として縛る | X-10 |
| `JDG-2040` | スキーマだけを渡した新しい体に日単位と分単位の日程を書かせる試験の手順 | X-14 |

覆す裁定は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-1` の `GL-004`（成果物が構造化データである）—— 外で書かれた `GRS JSON`（AI が書くものを含む）が、スキーマだけで正しく書けて、開いて拒まれず、知らせも数え直しも出ない。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— マイルストーンの時刻は 表 T-350 の `WT-5` が持つ。手引きと画像から書く指示の 3 つの写しが古い（X-3）。
- 6.2 節（説明は概要と理由だけ、仕様の ID を書かない）—— `scheduleDataTimeZone` の説明が `FR-156` を名指している（X-10 で直す）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | `documentSettings` の説明は 3 キーだけに足し、残り 30 キーには足さない | `JDG-1190`（名と構造で語る、説明は量より質） | 書き手がそれでも迷うキーは、X-14 の試験が台帳へ出す |
| X-b | 日時の型（`$defs/DateTime`）から時差の字（`Z`・`±hh:mm`）を外さず、書かないことを説明で言う | 設計の 6.1 節: 型に帯を許すのは取り込んだ綴りを往復させるため（`EX-4`） | 書き手が時差を書いても型は通る —— 説明で止める |
| X-c | `WorkingTime` の本数の上限（`S-582`）を `maxItems` で言うかは当てる体が決める | 読み口の検証器は 11 のキーワードだけを読み（`tools/generate_json_schema_validator.py` の `EXPRESSED`）、`maxItems` は無い —— 足すと生成器が止まる。読む条件にせず「書き手への約束」の群へ入れるか、説明で言うかの 2 つ | 当てる体の手間が 1 つ増える |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| スキーマだけを持つ書き手が分単位の日程を書く | 時刻の読み・暦の時間帯・地名・完了率の数え方を、仕様かコードで調べないと書けない（進捗の席が 13 点を記録した） | スキーマの説明と構造だけで書け、出荷物で開いて拒み・知らせ・数え直しが 0 |
| 名簿の外の地名を持つ文書を開く | 黙って UTC として読む | 拒む（`JDG-2039`） |
| 読みを変える CR が説明を直し忘れる | 気づく手立てが無い | X-14 の試験の手順が台帳へ出す |

---

## 2. 新しい識別子

当てる体が帯の中で決める（`FR-156` に足す文の行、名簿の外の地名を拒むときの理由の行が要るなら 表 T-233 の `RS-` の行、`04-verification.md` の節）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `ROOT_DESCRIPTION` の「GRS uses only their day for now; when it writes one it uses the project's default start time …」と「A last day (finish, actualFinish, stop, endDate) is included.」 | X-1 の段落 |
| `erd.json` の `Task.stop` の `schemaNote`「…the last day the actual has reached while the task is unfinished…」 | X-4 |
| `erd.json` の `Task.percentComplete` の `schemaNote`「…both in working days…」 | X-5 |
| `erd.json` の `Exception.fromDate` の `schemaNote`「MS Project's start of the recurrence, not a range of real days.」 | X-9 |
| `erd.json` の `Project.scheduleDataTimeZone` の `schemaNote`（`FR-156` を名指す）と `type: string` だけの型 | X-10 |
| 3 つの写しの「マイルストーンは start も finish も開始の側の時刻」 | X-3 |
| `time-zone.ts` の「名簿の外の値は UTC として読む」 | 読み口で拒むので、ここへは届かない（当てる体が残すか消すかを決める） |

---

## 4. 書き直す所（案。英文は当てる体が整えてよい —— 意味は変えない）

### X-1 —— 生成器 `ROOT_DESCRIPTION` の時刻の段落（`DFC-2493`・`DFC-2495`・`DFC-2497`）

```
Times come in two kinds, for two reasons. Schedule date-times (start, finish, deadline,
statusDate, calendar exceptions, comment and highlight boxes) are wall-clock times without
a zone, exactly as MS Project writes them, so that they round-trip unchanged;
project.scheduleDataTimeZone says whose wall clock they are. They are read as instants to
the minute (seconds are cut) and never shifted by an offset. Write each one with its time:
a date without a time is read as the start of that day's first working span on a start-side
column and the end of its last span on a finish-side column, which is seldom what was meant.
A finish-side value is the instant the work ends; a milestone's start and finish are the same
instant. A whole-day range (calendar exceptions, boxes) runs from 00:00:00 to 23:59:00.
Record instants (documentStamp, changeLog) are UTC, so that every reader sees them in their
own local time.
```

### X-2 —— `$defs/DateTime` に説明を足す（`DFC-2496`）

生成器の `date_time_def()` に説明の口が無いので、定数を 1 つ足す。

```
A wall-clock date-time in project.scheduleDataTimeZone, to the minute. Write no offset: GRS
never converts one, and keeps an imported spelling only for the MS Project round trip.
```

### X-3 —— マイルストーンの時刻の 3 つの写し（`DFC-2494`）

`docs/guides/schedule-to-grs-json/prompt-ja.md`（と `prompt-en.md`）の 46 行目、`docs/spec/_source/image-to-grs-json-prompt.ja.md`・`.en.md` の 25 行目を、表 T-350 の `WT-5` に合わせる（マイルストーンは start も finish も終了の側の時刻で、同じ瞬間）。同じ段落の「時刻は列の側で決まる」も、X-1 の「時刻まで書く」に合わせる。`npm run gen` が `src/adapter/screen-renderer/image-to-grs-json-prompt.json` を書き換える。

### X-4 —— `Task.stop`（`DFC-2495`）

```
MS Project's Stop, kept under its name for the round trip: the instant the actual has
reached while the task is unfinished; null once actualFinish is set.
```

### X-5 —— `Task.percentComplete`（`DFC-2504`）

```
Follows from the dates: round(actual length / planned length x 100), both in working
minutes of the document calendar; the actual runs from actualStart to actualFinish, or to
stop while unfinished, so statusDate does not move it. With no planned length (a
milestone) it is 100 once actualFinish is set and 0 before. GRS recounts it whenever it
reads this file and tells when the stored value differed, so write what the dates give.
Not capped at 100, because an overrun reports more.
```

### X-6 —— `WorkingTime`（`DFC-2498`）

`erd.json` の `WorkingTime` の説明と `toTime` の列（`JDG-1192` の例外 —— MSPDI の書き方）:

```
WorkingTime: One working span of a weekday or an exception day. The spans of one day start
before they end and do not overlap; a span that ends at 12:00 and one that starts at 12:00 only touch, which is fine.
toTime: 00:00:00 here is the end of the day (24:00), as MS Project writes it.
```

本数の上限（`S-582`）は X-c のとおり当てる体が決める。

### X-7 —— `WeekDay.workingTimes`（`DFC-2499`）

```
Empty on a working day means the default spans {{S-580}}.
```

⚠️ 差し込みの印字（`tools/generate_entity_types.py` の `with_calendar_rows_printed`）は字と数の升だけを刷り、時間帯の升（`S-580`）では止まる —— 印字の口を足すか、値を文で書く（値を文で書くと `S-580` と二重になる。`R1.3`）。推奨は口を足す。

### X-8 —— `Project.minutesPerDay`（`DFC-2500`）

```
The length of 1d in durations and lags, in minutes ({{S-128}} when null). Keep it equal to
the working minutes of every working day, exception days with their own spans included:
when one differs, GRS tells so each time the document opens, because 1d would no longer be
a working day.
```

仕様の側: `FR-054` と 表 T-233 の `RS-89` の「稼働日」に、例外日（繰り返しの無いもので、自分の時間帯を持つもの）も数えることを足す（コードはすでにそうしている）。

### X-9 —— `Exception.fromDate`／`toDate`（`DFC-2501`）

```
fromDate: For a one-off exception (see recurrenceKind) fromDate..toDate is the real range of
days, written 00:00:00 and 23:59:00, and its workingTimes replace that day's spans; for a
recurring one it is MS Project's start of the recurrence, not a range of real days.
```

仕様の側: `fig-erd-detail.md` の `AT-79`・`AT-80` を `WC-4` と同じく「繰り返しの無い例外日では実日付の範囲」に直す。

### X-10 —— `Project.scheduleDataTimeZone`（`DFC-2502`、`JDG-2039`）

- 生成器: 表 T-376 の 28 の地名から `enum` を出す口を足す（`tools/generate_time_zone_roster.py` の `build()` と同じく `spec_tables.read(REQ, 'T-376')` で読む。`frag_body()` の `values` は手書きの一覧だけなので、新しい `kind` か同じ読みを足す）。
- 説明（`FR-156` を名指さない）:

```
The region whose wall clock the schedule date-times are. Not written to MS Project, which
has no place for it.
```

- 仕様の側: `FR-156` に「表 T-376 に無い値を持つ `GRS JSON` は開かない（拒む）」を足し、拒む理由の行を決める。⚠️ 読み口の検証器は `enum` を読む条件にする（`generate_json_schema_validator.py` の `EXPRESSED`）ので、名簿の外の値は文書ごと拒まれる —— これが `JDG-2039` で利用者が選んだ結果である。
- 当てる前に、`sample-schedule/`・`tests/fixtures/`・組み込みのテンプレートの `scheduleDataTimeZone` が名簿の中かを数える（`UTC` は 表 T-376 の `ZN-13` に在る）。

### X-11 —— `viewTimeZone`・`displayTimeZones`（`DFC-2503`）

`settings.json` の `S-574`・`S-575` の行に機械の型を書く: `viewTimeZone` は表 T-376 の地名か `null`、`displayTimeZones` は表 T-376 の地名の配列（0〜4 個）。表示設定の値が合わないときは既定へ戻すだけ（`OP-6`）なので、文書は拒まれない。`$comment` の「left unconstrained here: viewTimeZone」は消える。

### X-12 —— 分単位の見え方の 3 キー（`DFC-2505`）

```
showsTimeOfDay: Only how the chart is shown; the stored date-times always keep their time.
fitSpanFixed: When true, Fit and picture export show fitSpanStart..fitSpanFinish (the
  finish day's column included) instead of the whole schedule; opening the document does
  not move the view.
project.statusDate: MS Project's StatusDate: the instant progress is measured at; the
  progress line is drawn there.
```

⚠️ `settings.json` の行の `schemaNote` は差し込みの印字を通らない（生成器の `manuscript_notes()`）—— 本書の 3 文は差し込みを使わない。⚠️ 時刻を表示したとき進捗線が日の中のどこに立つかを仕様が言わない（`CU-1` は「`Project.statusDate` の位置」）—— 当てる体が `CU-1` の読みを確かめ、瞬間でないなら `statusDate` の説明を「day」のままにする。

### X-13 —— 生成物

`npm run gen` が書き換えるもの: `docs/spec/_source/grs-document.schema.json`、`src/adapter/document-codec/grs-json-schema.ts`（`enum` が増える）、`src/adapter/screen-renderer/image-to-grs-json-prompt.json`、エンティティの型（`tools/generate_entity_types.py` が読む分）、`_assets/tbl-settings.md`。どれも手で書かない。

### X-14 —— スキーマだけの書き手の試験（`JDG-2040`）

`docs/development-rules/04-verification.md` に手順を足し、手順が回す道具を置く。

| 段 | 中身 |
|---|---|
| 渡すもの | 新しい体に `docs/spec/_source/grs-document.schema.json` だけを渡す（仕様・コード・見本・前の版は渡さない）。⛔ 体は作業木の外のファイルを読まない |
| 書かせるもの | ① 日単位の日程（平日だけ稼働の暦、タスク・マイルストーン・依存・進行中のタスクを含む）② 分単位の日程（時刻の表示、日程データのタイムゾーン、一部だけ稼働の例外日、時間帯の 24:00、進行中のタスクを含む）の 2 本 |
| 報告させるもの | スキーマの外を読みたくなった点（迷った列・決めかねた値）を 1 点 1 行で |
| 測るもの | スキーマで検証した違反の数、出荷物（`dist/index.html`）で開いたときの拒み・知らせ・コンソールのエラー・ページの例外、`Agent API` の `readDocument` で読み戻した完了率と日時の食い違い（数え直し）。⭐ 測り方は進捗の席の探り（ヘッダーの「開く」`IC-1` → `IC-71` で読ませ、`IC-20` で `Agent API` を有効にして `readDocument`）と同じ |
| 合格 | 違反 0・拒み 0・知らせ 0（書かせた日程が意図して起こすものを除く）・エラー 0・数え直し 0。スキーマの外を読みたくなった点は台帳へ記録する（0 でなくても赤にはしないが、行が立つ） |
| いつ回すか | `erd.json` の `schemaNote`・`settings.json` の行の型と `schemaNote`・生成器の説明、形式の版（`SCHEMA_VERSION`）、日時と暦と完了率の読み（`FR-011`・`FR-012`・`FR-054`・`FR-088`・`FR-156`）を変える CR を当てたとき。本書を当てた後にも 1 度回し、当てる前の結果（13 点）と比べる |

道具の置き場所（`tools/` か `.claude/skills/` か）と、体への指示書の雛形は当てる体が決める。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えるもの |
|---|---|
| `docs/spec/_source/erd_json_to_schema.py` | `ROOT_DESCRIPTION`（X-1）、`$defs/DateTime` の説明（X-2）、表 T-376 からの `enum`（X-10） |
| `docs/spec/_source/erd.json` | X-4〜X-10 と X-12 の `statusDate` の `schemaNote` |
| `docs/spec/_source/settings.json` | X-11 の型、X-12 の `schemaNote` |
| `tools/generate_entity_types.py` | X-7 の時間帯の升の印字（推奨の場合） |
| `src/entity/document-model/schedule/time-zone.ts` | X-10 の後に UTC へ寄せる道を残すか（MSPDI の取り込みは別の道） |
| 試験 | `enum` で名簿の外の地名が拒まれること、名簿の 28 がすべて通ること（契約の試験）。`gen:check` が緑。X-14 の試験を当てる前と後で 1 度ずつ |

毎フレームの経路（規則 04 の 5 節）: 説明と読み口の検証器だけで、描く手順は変わらない。`perf-pending` が要るかは当てる体が規則で確かめる。

---

## 6. グラフ（`impact.py`）

当てる体が `FR-054`・`FR-156`・`RS-89`・`AT-79`・`AT-80`・`S-574`・`S-575` で回す。本書は要求の辺を足さない見込み（`FR-156` に 1 文、`RS-89` に 1 語）。

---

## 7. 数（実測、`f7adce14`）

- 生成したスキーマの `documentSettings` のキー 34、説明を持つもの 1（`stackDirection`）—— Python で数えた。
- `erd.json` の `schemaNote` 27、`settings.json` の `schemaNote` 1 —— `grep -c '"schemaNote"'`。
- 表 T-376 の地名 28 —— `src/entity/document-model/schedule/time-zone-roster.json` の `region` を数えた（表から生成されたもの）。
- 読み口の検証器が読むキーワード 11 —— `tools/generate_json_schema_validator.py` の `EXPRESSED`。
- 差し込み `{{S-…}}` に使える行 7（`S-106`・`107`・`108`・`128`・`482`・`483`・`580`）—— `tools/generate_entity_types.py` の `DEFAULT_CALENDAR_ROWS`。

---

## 8. 台帳

| 台帳 | 動かすもの |
|---|---|
| `defects.md` | `DFC-2493`〜`DFC-2505` を記録した（本書の起草と同じコミット）。当てる体が状態を進める |
| `rulings.md` | `JDG-2039`・`JDG-2040` を記録した（状態「指示 —— `CR-751` が当てる」）。当てたら `適用済` にし、着地の欄に仕様の ID を書く |
| `changelog.md`・`perf-pending.md` | 当てる体が番号を受ける |

---

## 9. 測り方の再現

```
git grep -c "CR-751" f7adce14 -- change-request docs src tests            # 0 件（本書の前）
grep -c '"schemaNote"' docs/spec/_source/erd.json docs/spec/_source/settings.json
python -c "import json;d=json.load(open('docs/spec/_source/grs-document.schema.json',encoding='utf-8'))['properties']['documentSettings']['properties'];print(len(d),sum('description' in v for v in d.values()))"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-156
```

進捗の席の探り（X-14 の測り方の元）: スキーマで検証（Python の `jsonschema`、draft 2020-12）→ Playwright で `dist/index.html` を開き、`showOpenFilePicker` を差し替えて `IC-1` → `IC-71` で読ませる → 題名・知らせの欄・コンソールのエラー・ページの例外を読む → `IC-20` を押して `grSchedulerAgentApi.readDocument()` の完了率と 4 つの日時をファイルと比べる。

---

## 10. 利用者の実物の手順

当てた後、利用者が触る手順は無い（説明と読む条件の変更）。名簿の外の地名（例: `Mars/Base`）を `scheduleDataTimeZone` に書いた GRS JSON を開くと、開かずに理由が告げられるか —— X-14 の試験と契約の試験が押さえるので、利用者の確かめは要らない。

---

## 11. 問い

無い（`JDG-2039`・`JDG-2040` で答え済み）。X-a〜X-c は利用者に問わずに決めた（0 節の ③）。
