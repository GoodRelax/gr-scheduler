# 時刻とタイムゾーン —— GRS JSON は時刻をどう書くか（CR-851 の行のレビュー D097・D098・D138 への答え）

2026-10-25。読むだけで調べた（書いたのは本ファイルだけ）。名は CR-851 の後の名（`changeLogEntries`・`firstDay`／`lastDay`・`viewTimeZone` の `kind`）で書く。
仕様書（`docs/spec`）はまだ CR-851 の前の名（`changeLog`・`fitSpanStart`・`viewTimeZone` の `null`）である。
【一般知識】と書いた所は、MS Project についての一般的な知識であり、本リポジトリの出典で確かめたものではない。

## 1. スキーマの冒頭に入れる文言の案

ルートの `description` の「Concepts:」の段（`concepts/task-groups-and-wbs.md` の 1 節が置く段）に、次の 3 行を足す。

```text
Schedule date-times are wall-clock times with no offset, as MSPDI writes them, in project.scheduleDataTimeZone. GRS never converts them.
Record times (documentStamp, changeLogEntries, buildVersion) are UTC. viewTimeZone and displayTimeZones only choose the clocks shown; no stored value changes.
An end at 00:00 closes the day before: a finish of 2026-06-24T00:00:00 ends on 23 June, and a toTime of 00:00:00 is 24:00.
```

- 1 行目 18 語、2 行目 19 語、3 行目 23 語。
- 1 行目は「どの時計の数字か」「帯を書かない」「換算しない」、2 行目は「UTC のもの」と「見せるだけのもの」、3 行目は「終わりの 0:00」の 1 つの読み方を言う。
- 書き方の細かい決まり（秒は読まない、日の範囲は両端を含む）は `$defs/DateTime`・`$defs/Day` に置いたまま（`JDG-3331` の「決まりは効く所に 1 回」）。
- 既定の時刻（8:00 ／ 17:00）は冒頭に入れない。効くのは `defaultStartTime`・`defaultFinishTime` を見る書き手だけであり、そこで言えば足りる。

冒頭に上の 3 行がある前提の、各プロパティの説明の案（各 2 文以内、`shipped-text-criteria.md` の E1〜E7）:

| 行 | プロパティ | 案 |
|---|---|---|
| D097 | `Project.defaultStartTime` | Same as MSPDI Project/DefaultStartTime: the time of day GRS gives a start it sets by the day (start of a Task or a BaselineTask, actualStart, resume, project.startDate); 08:00:00 when absent. A milestone's start gets defaultFinishTime instead. |
| D098 | `Project.defaultFinishTime` | Same as MSPDI Project/DefaultFinishTime: the time of day GRS gives a finish it sets by the day (finish of a Task or a BaselineTask, actualFinish, stop, deadline, project.statusDate) and a milestone's start; 17:00:00 when absent. |
| D138 | `WorkingTime.toTime` | Same as MSPDI WorkingTime/ToTime: 00:00:00 means 24:00, the end of the day. |

- D097・D098 の「sets by the day」は、表 T-350 の `WT-4` の例外（`ActualDuration` から置く `stop` は計算した瞬間 —— `01-04-requirements.md:7145`）を外すための言い方である。
- 「08:00:00」「17:00:00」は字で書く。下書きの `{{S-482}}`／`{{S-483}}` は生成器が値に置き換える（`review-page/build_review_page.py:53`〜`:63`）。
- D138 の案は「except that」を外した。00:00:00 を 24:00 と読むのは MS Project 自身の書き方であり、MSPDI との違いではない（3 節）。

## 2. やさしい説明

### 2.1 時刻の種類

GRS JSON の時刻は、次の 5 種類である。

| 種類（型） | 書き方 | どの時計の数字か | 主なプロパティ | 見せる基準（`viewTimeZone`）を変えると |
|---|---|---|---|---|
| 日程の日時（`DateTime`） | `2026-10-01T08:00:00`（帯なし、秒まで書き、分まで読む） | 日程データのタイムゾーン（`project.scheduleDataTimeZone`）の壁時計 | タスクの開始・終了・実績・中断・再開・期限、`startDate`・`statusDate`、基準計画、例外日の `fromDate`／`toDate`、コメントボックスの自由点 | 保存の数字は変わらない。目盛と、画面に見せる日時だけが別の時計に直る |
| 作成日時（`creationDate`、形は `DateTime`） | 同じ形で秒まで | 作った PC のその場所の時刻（`WT-9`） | `Project.creationDate` | 変わらない |
| 記録の時刻（`UtcInstant`） | `2026-10-25T03:04:05Z` | UTC | `documentStamp` の 3 つ、`changeLogEntries[].changedAt`、`buildVersion` | 変わらない。誰が見てもその人の手元の時刻で見せられるよう UTC にした（`doc-shape-map.tsv` の `fileSavedAt` の旧説明） |
| 日（`Day`） | `2026-10-01`（時刻なし。`firstDay`〜`lastDay` は両端を含む） | プロパティごとに言う。ハイライトボックスと列のフィルタは日程データのタイムゾーン、全体表示の期間（`fitSpan`）は見せる基準 | `HighlightBox.firstDay`／`lastDay`、`fitSpan`、`scrollPosition.leftEdgeDay`、`ColumnFilter` | 日の字は変わらない |
| 1 日の中の時刻（`Time`） | `08:00:00`（日付を持たない） | 時計を持たない（どの日にも当てる） | `defaultStartTime`・`defaultFinishTime`、`WorkingTime.fromTime`／`toTime` | 変わらない |

タイムゾーンそのものを持つプロパティは 3 つである。

- `project.scheduleDataTimeZone` —— 保存する日時の数字が「どの時計の時刻か」。`UTC+09:00` のような固定の差で、夏時間に季節で切り替えない（`FR-156`）。MSPDI には置き場が無いので書き出さない（`AT-157`）。MSPDI を取り込んだ文書では、取り込んだ PC の地域にする（`JDG-1711`）。
- `documentSettings.viewTimeZone` —— 画面の目盛と日時を「どの時計で見せるか」。`sameAsScheduleData` なら日程データのタイムゾーンに従う（`S-574`）。
- `documentSettings.displayTimeZones` —— 目盛の下に足す時計の段（4 つまで、`S-575`）。夏時間の行も選べるが、1 年中その差で読む（例 PDT は 1 月でも UTC-7、`FR-156`）。

変わるもの・変わらないもの（`FR-156`・`FR-157`）:

- 見せる基準を変える ⇒ 画面の見え方だけが変わる。保存の数字は 1 つも変わらない。
- 日程データのタイムゾーンを付け替える（設定の面の「換算しない」側） ⇒ 数字は変わらず、その数字が指す瞬間が変わる。
- タイムシフト（`FR-157`） ⇒ 日程の日時の数字をすべて書き換える。だから確認を取ってから実行する。
- 記録の時刻（UTC）と 1 日の中の時刻は、どの操作でも換算されない。

### 2.2 GRS が書く時刻（表 T-350、`01-04-requirements.md:7138`〜`:7151`）

人が日の単位で置いた値（ドラッグや日付の欄）に、GRS が付ける時刻である。

| 値 | 付ける時刻 | 出どころ |
|---|---|---|
| 開始の側: `Task.start`・`BaselineTask.start`・`Project.startDate` | 既定の開始時刻（無ければ 08:00:00） | 公式 —— MS Project は時刻なしで入れた開始日に既定の開始時刻を当てる（`WT-1`） |
| 終了の側: `Task.finish`・`BaselineTask.finish` | 既定の終了時刻（無ければ 17:00:00） | 公式（`WT-2`） |
| `actualStart`・`resume` | 既定の開始時刻 | GRS の選択（`WT-3`） |
| `actualFinish`・`stop`・`deadline`・`statusDate` | 既定の終了時刻（実績の長さから置く `stop` は計算した瞬間） | GRS の選択（`WT-4`） |
| マイルストーンの開始の側 | 既定の終了時刻 —— 開始と終了が同じ瞬間 | GRS の選択（`WT-5`、`JDG-1621`・`JDG-1698`・`JDG-1710`） |
| 例外日の `fromDate`／`toDate` | `00:00:00`／`23:59:00` | 公式の例（`WT-6`・`WT-7`） |
| 取り込んだまま編集していない値 | 元の字のまま | `WT-10`・`EX-4` |

時刻を書いていない日付の字（`2026-01-05`）は、開始の側ならその日の最初の稼働時間帯の始まり、終了の側ならその日の最後の稼働時間帯の終わりと読む（`FR-054`、`01-04-requirements.md:6131`、`JDG-1978` 2026-10-11）。
00:00 と読まないのは、終了の側で前の日の終わりになり、最後の日が 1 日消えるからである（同 `:6133`）。
⚠️ ただし CR-851 の `DateTime` の形は日付だけの字を通さない（5 節の 3）。

### 2.3 既定の時刻 —— MS Project と GRS

| 項目 | MS Project | GRS | 合っているか |
|---|---|---|---|
| 既定の開始時刻 | 8:00 AM（Microsoft サポート、`S-482`・`JDG-1205`） | `08:00:00`（`S-482`） | 合う |
| 既定の終了時刻 | 5:00 PM（同） | `17:00:00`（`S-483`） | 合う |
| 既定の暦の時間帯 | Standard 暦 8:00-12:00・13:00-17:00（`S-580` が Learn の例と同じとする） | `08:00:00-12:00:00, 13:00:00-17:00:00`（`S-580`） | 合う |
| 1 日の分数 | 480 分 【一般知識】 | `480`（`S-128`） | 合う |
| MSPDI に既定の時刻の要素が無いとき | 自分の既定を使う | GRS も 8:00／17:00 を使うが、要素は書き足さない（`S-482` の ⚠️） | 合う（往復で何も増えない） |
| 時刻なしで入れたマイルストーンの日 | 【一般知識】依存で置かれると先行の終わり（17:00）に、日付を打つと既定の開始時刻（8:00）になる | いつも既定の終了時刻（`WT-5`） | 打った場合は違う。依存の向きの矛盾を出さないための GRS の選択（`JDG-1621`） |

### 2.4 MSPDI 自体の時刻の書き方

- 日時は `xsd:dateTime` だが、MS Project が書くのは帯の無い秒までの形（`2025-10-01T08:00:00`）である（`JDG-3261`、`FR-156` の RATIONALE —— 公式のスキーマに時差の要素は無い）。
- `DefaultStartTime`／`DefaultFinishTime`・`FromTime`／`ToTime` は `xsd:time`（`08:00:00`）。
- 【一般知識】MS Project は、真夜中に終わる時間帯の `ToTime` を `00:00:00` と書く。組み込みの「24 時間」暦は、稼働日ごとに `FromTime 00:00:00`・`ToTime 00:00:00` の 1 本で書かれる。
- 本リポジトリの見本 `sample-schedule/sample-large-erp-program.en.xml:1374`〜`:1386`（暦「24x7 Cutover」）も 00:00:00〜00:00:00 で全日を書く。⚠️ ただしこれは本プロジェクトが作った見本であり、MS Project が書いた証拠ではない。

## 3. 24:00 の経緯

### 3.1 いつ・誰が決めたか

| 日付 | 出来事 | 中身 |
|---|---|---|
| 2026-10-03 | `JDG-1192`（利用者の裁定） | MSPDI 由来の列は名も値も MSPDI のまま。符号の意味が名から読めないのは MSPDI の事情なので、説明で補ってよい |
| 2026-10-08 | `JDG-1702`（利用者の裁定） | 稼働時間は MSPDI の時間帯（`WorkingTimes`）で持つ |
| 2026-10-08 | `JDG-1714`（利用者の裁定） | 取り込んだ終了 `00:00:00` は字面どおりの瞬間 —— 6/24 00:00 は 6/23 の終わり |
| 2026-10-10 | `JDG-1787`（利用者の裁定） | 時間帯を GRS で直せるようにし、1 日 5 本まで（公式 XSD の `maxOccurs="5"`） |
| 2026-10-11 | `CR-710` の X-19（起草の席が当てるときに決めた） | 不変条件 `IV-24` を足し、「終わりの `00:00:00` は 24:00」と書いた。根拠の欄は `JDG-1787` と XSD だけで、24:00 の部分を名指す裁定は無い |
| 2026-10-11 | `CR-743`（変更履歴 4.51） | 休日の設定の時刻の欄で、終わりの側の `0:00` を `24:00` と読む（`WC-8`） |
| 2026-10-15 | `CR-751`（変更履歴 4.60、`DFC-2498`） | スキーマの `toTime` に「00:00:00 here is the end of the day (24:00), as MS Project writes it.」と書いた（`JDG-1192` の補いとして） |

`rulings.md` を「24:00」「00:00:00」「toTime」「IV-24」で探した範囲では、`toTime` の 24:00 そのものを利用者に問うた行は見つからなかった。
決めたのは `CR-710` の起草の席であり、`JDG-1192`（MSPDI の書き方に従う）と `JDG-1702`（MSPDI の時間帯を読む）から導いたものである。

### 3.2 理由は妥当か —— 妥当と判断する

1. **MSPDI がそう書く。** 真夜中に終わる時間帯（夜勤の 16:00-24:00、24 時間の暦）を MS Project は `ToTime 00:00:00` と書く【一般知識】。`JDG-1192` は MSPDI の値の意味を変えないことを求める。00:00:00 を「その日の始まり」と読むと、取り込んだ夜勤の暦が壊れる。
2. **ほかの書き方が無い。** `xsd:time` は 1 日の中の時刻の型であり、「24:00」を書けない（`JDG-3261` で `HH:MM:SS` だけを通すことにしたので、GRS JSON でも書けない）。
3. **不変条件と合う。** `IV-24` は「始まりが終わりより前」を求める（`05-07-design.md:1347`）。00:00:00 を 0 分と読むと、16:00-00:00 が逆向きになって断られる。コードも終わりの側の 0 分だけを 1440 分と読む（`src/entity/document-model/schedule/working-calendar.ts:524`〜`:528`）。
4. **日時の終了の読みと同じ筋である。** `JDG-1714` の「終了 6/24 00:00 は 6/23 の終わり」と、`toTime` の「00:00:00 は 24:00」は、どちらも「終わりの側の 0:00 は前の日を閉じる」の 1 つの読みである。`toTime` は日付を持たないので、閉じる日は時間帯のその日になる。

### 3.3 冒頭に書くか —— 書くのがよい（1 節の 3 行目）

- 誤解されやすいのは `toTime` より、タスクの終了の `T00:00:00` である。外の道具や AI が「6/24 00:00」と書くと 1 日短く見える（`JDG-1714` の ⭐）。2 つを 1 行で言えば、両方の誤解を 1 度に防げる。
- ⚠️ 冒頭に足すことは `JDG-3331`（2026-10-25、冒頭は語の定めと 2 文だけ、決まりは型へ）を一部覆す。足すなら覆したことを裁定の行に残す。冒頭を長くしないため、3 行で止める。
- 残る問い: `PND-938`（`DFC-2697`、未裁定）—— `defaultFinishTime` が `00:00:00` の文書で GRS がタスクの終了をその日の `T00:00:00` と書くと、`FR-054` の読みで 1 日前に落ちる。推奨は「翌日の `00:00:00` を書く」（`pending-decisions.md:505`）。3 行目の読みを冒頭に書くなら、この問いも同じ筋で決めるのがよい。

## 4. コメントへの答え

**D097（`defaultStartTime`）** —— 「(S-482)が不明」は、ページが設定の番号を値にしていなかったためである。`S-482` は「既定の開始時刻 `08:00:00`」（`tbl-settings.md:814`）。今はページも生成器と同じく値を刷る（`build_review_page.py:53`〜`:63`）。説明の中身は表 T-350 の `WT-1`・`WT-3`・`WT-5` と合っている。1 節の案は、「日で置いた開始」に絞り、括弧で並べて短くした。

**D098（`defaultFinishTime`）** —— MS Project の既定は開始 8:00 AM・終了 5:00 PM で、GRS の `08:00:00`／`17:00:00` と合う（2.3 節）。既定の暦（8-12・13-17）と 1 日 480 分も合う。違うのはマイルストーンだけで、GRS はいつも終了の時刻を付ける（`WT-5`、GRS の選択）。時差の話は本ファイルの 2.1 節にまとめた。冒頭に入れるエッセンスは 1 節の 3 行とし、既定の時刻はプロパティの説明に置くのがよい。

**D138（`toTime`）** —— 24:00 は `CR-710`（2026-10-11）の起草の席が `JDG-1192`・`JDG-1702` から導いた決まりで、利用者の裁定の行は無い（3.1 節）。理由（MSPDI がそう書く・24:00 を書く字が無い・`IV-24` の前後・`JDG-1714` と同じ読み）は妥当と判断する（3.2 節）。冒頭の 3 行目に、タスクの終了の 00:00 と合わせて 1 行で書くのを勧める。説明の「except that」は外す —— MSPDI との違いではないからである。

## 5. 食い違い

1. **`toTime` が MSPDI と違うのか。** CR-851 の新しい英語（`doc-shape-map.tsv` の `WorkingTime/toTime` の行）は「Same as MSPDI ..., except that GRS reads 00:00:00 as the end of the day」と、MSPDI との違いとして言う。今のスキーマ（`docs/spec/_source/erd.json:2267`、`grs-document.schema.json:1239`）は「as MS Project writes it」と、MS Project の書き方として言う。仕様の `AT-162`（`fig-erd-detail.md:428`）はどちらとも言わない。
2. **`creationDate` の時計と秒。** `$defs/DateTime` の新しい説明（`doc-shape-map.tsv` の `/$defs/DateTime` の行、`spec-rows-map.tsv` の `DATE_TIME_DESCRIPTION`）は「project.scheduleDataTimeZone の壁時計」「秒は読まない」と言う。`WT-9`（`01-04-requirements.md:7150`）は `creationDate` を「作ったその場所の時刻（秒まで）」と言い、`doc-shape-map.tsv` の `creationDate` の行の理由も「creating PC wall clock to the second」と言う。
3. **日付だけの字と秒を省いた字。** `FR-054`（`01-04-requirements.md:6121`・`:6131`）は `2026-01-05T08:00`（秒なし）と `2026-01-05`（日付だけ）を読めるとし、日付だけの字を稼働時間帯の始まり・終わりと読む。CR-851 の `$defs/DateTime` の `pattern`（`doc-shape-map.tsv` の `/$defs/DateTime` の行）と `FR-024` の書き直し（`spec-rows-map.tsv` の `prose FR-024 STATEMENT`）は `YYYY-MM-DDTHH:MM:SS` だけを通し、外れた値を `FR-023` のとおり扱う。`spec-rows-map.tsv` に `FR-054` のこの段を直す行は無い。
4. **`stop` の時刻。** 新しい D098 の英語は `stop` にいつも `defaultFinishTime` を付けると読める。`WT-4` の ⚠️（`01-04-requirements.md:7145`）は、実績の長さから置く `stop` は計算した瞬間とする。
5. **`displayTimeZones` の英語が 2 つある。** `doc-shape-map.tsv` の行は「Up to four extra clocks, each shown as one more row under the time ruler while the time of day is shown.」、`spec-rows-map.tsv` の `S-575` の行は「Up to four extra clocks shown under the time ruler. Each one is a fixed UTC offset, marked as standard or daylight time. Absent means none; never an empty list.」。
6. **マイルストーンの時刻の古い裁定。** `JDG-1205`（2026-10-03）は「マイルストーンは既定の開始時刻」とした。今の `WT-5` は既定の終了時刻で、`JDG-1621`・`JDG-1710`（2026-10-08）がそう覆した。`JDG-1205` の行に覆された印があるかは確かめていない。

## 出典

- `docs/spec/01-04-requirements.md` —— `FR-156`（:5897〜）・`FR-157`（:6005〜）・`FR-054` の最後の段（:6117〜:6133）・`FR-057` の 表 T-350（:7130〜:7151）・表 T-033 の `EX-7`（:7114）・表 T-344 の `WC-8`（:5869）
- `docs/spec/05-07-design.md:1347` —— `IV-24`
- `docs/spec/_assets/tbl-settings.md` —— `S-574`（:183）・`S-575`（:184）・`S-128`（:813）・`S-482`（:814）・`S-483`（:815）・`S-580`（:816）
- `docs/spec/_assets/fig-erd-detail.md` —— `AT-9`（:344）・`AT-154`（:353）・`AT-155`（:354）・`AT-157`（:363）・`AT-162`（:428）
- `docs/spec/_source/erd.json:2262`〜`:2268`、`docs/spec/_source/grs-document.schema.json:1239`
- `docs/development-records/rulings.md` —— `JDG-1192`（:1436）・`JDG-1205`（:1454）・`JDG-1621`（:1888）・`JDG-1698`（:1940）・`JDG-1702`（:2000）・`JDG-1710`（:2008）・`JDG-1711`（:2009）・`JDG-1714`（:2012）・`JDG-1787`（:2028）・`JDG-1978`（:2343）・`JDG-3261`（:3513）・`JDG-3330`（:3567）・`JDG-3331`（:3568）
- `docs/development-records/pending-decisions.md:505`（`PND-938`）、`docs/development-records/defects.md:663`（`DFC-2498`）・`:741`（`DFC-2697`）、`docs/development-records/changelog.md:469`（4.51）・`:475`（4.60）
- `change-request/CR-710-schedules-read-the-time-of-day-with-working-times-time-zones-and-a-time-shift.md:117`（X-19）・`:423`、`change-request/CR-743-the-holiday-settings-surface-opens-holds-its-draft-and-draws-its-list.md:153`、`change-request/CR-751-the-grs-json-schema-explains-minute-level-reading-and-writing-on-its-own.md:34`・`:147`
- `change-request/CR-851-grs-json-is-reshaped-once-before-beta-and-alpha-files-go-through-a-converter.md:16`・`:66`・`:67`
- `studies/76-grs-json-beta-shape/doc-shape-map.tsv` —— `fitSpan`・`viewTimeZone`・`displayTimeZones`・`documentStamp`・`changeLogEntries`・`Project` の時刻の列・`WorkingTime`・`$defs/Day`・`$defs/DateTime`・`$defs/UtcInstant` の行
- `studies/76-grs-json-beta-shape/spec-rows-map.tsv` —— `ROOT_DESCRIPTION`（:397）・`DATE_TIME_DESCRIPTION`（:407）・`prose FR-024 STATEMENT`（:173）・`AT-154`／`AT-155`（:425・:426）・`AT-162`（:500）・`S-575`（:589）
- `studies/76-grs-json-beta-shape/review-results.tsv`（D097・D098・D138 のコメント）、`shipped-text-criteria.md`、`review-page/build_review_page.py:53`〜`:63`
- `src/entity/document-model/schedule/working-calendar.ts:524`〜`:528`、`sample-schedule/sample-large-erp-program.en.xml:1374`〜`:1386`
- 【一般知識】MS Project の `ToTime 00:00:00` の書き方・組み込みの「24 時間」暦・マイルストーンの時刻・1 日 480 分
