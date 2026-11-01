# 持ち回り（carry）—— GRS が使わない MSPDI の値を、どう持ってどう書き戻すか

CR-851 の英語の説明文（D105・D106・D115・D116・D161・D162 ほか、写しの器 16 行と、
「持つが数えない」列）へのコメントに答えるための解説である。
事実は仕様書と CR-851 の表から取り、出典を最後に並べる。
仕様書の今の版は旧名（`carry`・`carryElements`）で書かれ、CR-851 が `passthroughValues`・`passthroughElements` へ改める。
本書は新しい名で書く。

---

## 1. スキーマの冒頭に入れる文言の案

### 1.1 根の説明の「Concepts:」に入れる 2 行

```text
Carried: GRS does not use it, but keeps it and writes it back to MSPDI unchanged, so nothing in the file is lost.
Editing a task's planned or actual dates rewrites the carried values that follow from them, such as Duration.
```

- 1 行目が札（タグ）の定め。以後の説明は、文の頭に `Carried:` と書くか、文中で `carried` と言うだけで済む。
  語数は 22 語と 18 語。
- 「keeps it」を「does not use it」より後ろの、独立した動詞に置いた。
  「does not read, kept and written back」は、「read」「kept」「written back」の 3 つが
  どれも `not` に掛かるように読める（利用者がそう読んだ）。`but keeps it and writes it back` なら、
  否定は `use` だけに掛かる。
- 2 行目は例外の 1 文。これが無いと「unchanged」が、編集したタスクにも成り立つと読める（2 節の表）。
- 札の語は利用者の言葉「carry」に合わせ、仕様書の語の定め（`G-13` の語「Carry」）とも同じにした。
  プロパティ名は `passthrough…` なので語が 2 つになる —— 4 節の 食い違い 2 を参照。
- 根で「A property with no value is omitted」と既に言っているので、各行の「Absent when there are none.」は要らない（E2）。

### 1.2 写しの器 2 つの説明（どの実体でも同じ文）

| プロパティ | 案（英語） |
|---|---|
| `passthroughValues` | Carried: MSPDI values of this element that GRS does not use, under their MSPDI names. |
| `passthroughElements` | Carried: whole MSPDI elements under this one that GRS does not use, each written back in its place. |

- `passthroughElements` を「child elements」と書かないのは、`Project` の器には孫の要素
  （`Tasks` の下のプロジェクトの要約タスクなど、行にならなかったもの）も入るからである（`DF-3`）。
- 「in its place」は `ordinal`（D275）と書き出しの並べ方（`EX-10`）が支える。

### 1.3 「持つが数えない」列の型

型は「`Same as MSPDI X.` ＋ `Carried` で、GRS が代わりに何を使うか / どの値だけを数えるか」の 1 文とする。

| 行 | プロパティ | 案（英語） |
|---|---|---|
| D109 | `Calendar.baseCalendarUid` | Same as MSPDI Calendar/BaseCalendarUID. Carried: GRS never takes days from the base calendar. |
| D142 | `Task.calendarUid` | Same as MSPDI Task/CalendarUID. Carried: working days are counted with project.calendarUid. |
| D172 | `Resource.calendarUid` | Same as MSPDI Resource/CalendarUID. Carried: working days are counted with project.calendarUid. |
| D167 | `Dependency.lagFormat` | Same as MSPDI PredecessorLink/LagFormat. GRS counts the lag only when this is 7 (working days), 5 (hours) or 3 (minutes); with any other value the lag is only shown and carried. GRS writes the unit the lag was typed in. |
| D130 | `Exception.recurrenceKind` | Same as MSPDI Exception/Type. GRS counts only a one-off exception: 9, absent, or 1 with recurrencePeriod absent or 1; any other exception is carried. Write 1 for an exception you add. |

- `concepts/calendar.md` が暦の Concepts 行（「document calendar」）を入れるなら、D142・D172 の
  `project.calendarUid` は `the document calendar` に置き換えてよい。どちらを採っても型は同じ。
- フェード（D156・D157）は逆向き —— GRS 自身の値を MSPDI へ書く —— なので `Carried` は付けない。
  今の「Written to MSPDI as a Task/ExtendedAttribute.」のままでよい。

---

## 2. やさしい解説

### 2.1 一言でいうと

MS Project の XML（MSPDI）には、GRS が使わない項目がたくさんある（費用、仕事量の単位、スラック、独自の列など）。
GRS はそれらを捨てずに GRS JSON の中へしまっておき、MSPDI へ書き出すときに、来たときの字のまま元の場所へ戻す。
これが「持ち回り（carry）」である。
目的は、MS Project → GRS → MS Project と通しても、GRS が知らない情報が消えないこと（往復無損失、`FR-021`）。
使わない項目を捨てると、相手側の情報が GRS を通るたびに減っていく —— 後から足すことはできない、と仕様書は理由を書いている。

### 2.2 何を、どこに、場面ごとにどうするか

| 持ち回るもの | GRS JSON での置き場 | MSPDI を開く | GRS で編集する | GRS JSON へ保存 | MSPDI へ書き出す | 取り込み直す・合流する |
|---|---|---|---|---|---|---|
| 値だけの項目（例 `Cost`・`Units`・`xmlns`） | 持ち主の `passthroughValues`（`Project`・`Calendar`・`WeekDay`・`Exception`・`Task`・`Dependency`・`Resource`・`Assignment` の 8 つ） | 名と字をそのまま控える | 編集しないタスクの値は触らない。日付を編集したタスクは一部を作り直す（下の 2.3） | そのまま書く。無ければプロパティごと書かない | 来た字のまま、元の位置へ書く | 合流した後は無損失を約束しない（`LM-5`） |
| 要素まるごと（例 `WorkWeeks`・独自の列・要約タスク） | 持ち主の `passthroughElements`。行にならなかったものは、それを束ねる親の器（`Project` が多い） | 名・葉・子・並び順ごと控える | 触らない | そのまま書く | 元の並びの場所へ戻す | 同上 |
| 知っている列だが数えないもの（`Calendar.baseCalendarUid`・`Task`/`Resource` の `calendarUid`・7/5/3 以外の `lagFormat`・繰り返しの例外日） | 普通の列 | 列として読む | 画面には出すが、日数の計算には使わない | そのまま書く | そのまま書く | 同上 |
| GRS 自身の値を MSPDI に載せるもの（フェードの日数） | `Task.fadeInCalendarDays` / `fadeOutCalendarDays` | 名簿で見分けたフェードの枠だけ読む | 編集できる | そのまま書く | `Task/ExtendedAttribute` の空き枠に書く | 合わない枠は読まずに持ち回る |

### 2.3 編集したとき —— 「unchanged」が崩れる所

- 編集していないタスクの値は書き換えない（`EX-2`）。持ち回りの値もそのまま戻る。
- タスクの日付を編集すると、持ち回りの `ConstraintType`・`ConstraintDate`・`Duration` を作り直す（`EX-11`・`EX-12`）。
  `ManualStart` などは新しい日付から同じ綴りで作り直し、余裕日数（`TotalSlack` など）は書かない（`EX-12`）。
  日付の命令（`editTask` の `start`・`finish`）は、動いたら持ち回りの値を作り直す（`commands-map.tsv` の CM-11）。
- 実績を編集すると、`ActualDuration` は日付から数え直す（`DV-11`）。編集するまでは、取り込んだ原値をそのまま返す。
- 工数（`Work`）を持つファイルで進捗を編集しても、工数は書き換えず消しもせず、相手側で直すよう告げる（`EX-3`）。
- タスクを消せば、そのタスクの持ち回りも一緒に消える（消すことは編集である、`FR-021` の範囲の注）。
- 1.1 の 2 行目は、これらを 1 文にまとめたものである。

### 2.4 取り込み直したとき・合流したとき

- 無損失を約束するのは「1 つのファイルを、合流させず、編集せずに書き出したとき」だけである（`FR-021`・`LM-5`）。
  2 つのファイルが同じ要素について別々の持ち回りを抱えると、片方しか書き戻せないからである。
- 合流で「上書き」を選ぶと、取り込み元が持つ値で置き換える（`MG-8`）。持ち回りの器を丸ごと替えるのか混ぜるのかは、仕様書に書かれていない（4 節）。
- CR-851 より前の GRS が書き出したフェードの枠（名が `fadeInDays`・`fadeOutDays`）は、新しい名簿に合わないので、
  フェードとしては読まれず、要素ごと持ち回られて書き出しでそのまま戻る（CR-851 の `EX-6`）。
  画面ではフェードが消えて見えるが、ファイルからは消えない。
- MSPDI の決まった値の集合の外の値は、日程の計算に効く要素（依存の種別・ラグの単位・曜日・繰り返し）なら取り込みを拒み、
  効かない要素なら `passthroughValues` に持ってそのまま戻す（CR-851 の `MR-5`、`JDG-3289`）。

### 2.5 AI が GRS JSON を書くとき

- 日程を一から書く AI は、写しの器を書かなくてよい。GRS が新しく作る文書も器を書かない（`BK-4`）。
- AI が器を書けば、GRS はそれを中身を見ずに持ち、MSPDI へ書き出すときにその字のまま出す。
  形の上限は、名が 512 字・値が 65535 字・1 件以上（`doc-shape-choices.md` の L1・L2）、要素の入れ子は 16 段（`S-133`）。
- 遅延診断は器の中身を読まない（`FR-131`）。Agent API の `readDocument` は、既定では器を外して返す（`AM-3` の `includePassthrough`）。
  器が文書の大半を占め、AI の受け口を超えるためである。
- 器の鍵が GRS の列と同じ名（例 `Start`）だったときの扱いは、仕様書に書かれていない（4 節）。

---

## 3. 新しい型で置き換わる行（`doc-shape-map.tsv`）

行番号は `doc-shape-map.tsv` のデータ行の順（D001 が最初の行）。レビューのページの番号と同じ。

### 3.1 写しの器（16 行）—— 今の案はどれも同じ 2 文

- 今の案（値）: `MSPDI values that GRS does not read, kept and written back unchanged. Absent when there are none.`
- 今の案（要素）: `MSPDI elements that GRS does not read, kept and written back unchanged. Absent when there are none.`

| 行 | 置き場 | 新しい案 |
|---|---|---|
| D105 | `Project.passthroughValues` | Carried: MSPDI values of this element that GRS does not use, under their MSPDI names. |
| D106 | `Project.passthroughElements` | Carried: whole MSPDI elements under this one that GRS does not use, each written back in its place. |
| D115 | `Calendar.passthroughValues` | （D105 と同じ） |
| D116 | `Calendar.passthroughElements` | （D106 と同じ） |
| D122 | `WeekDay.passthroughValues` | （D105 と同じ） |
| D123 | `WeekDay.passthroughElements` | （D106 と同じ） |
| D133 | `Exception.passthroughValues` | （D105 と同じ） |
| D134 | `Exception.passthroughElements` | （D106 と同じ） |
| D161 | `Task.passthroughValues` | （D105 と同じ） |
| D162 | `Task.passthroughElements` | （D106 と同じ） |
| D168 | `Dependency.passthroughValues` | （D105 と同じ） |
| D169 | `Dependency.passthroughElements` | （D106 と同じ） |
| D176 | `Resource.passthroughValues` | （D105 と同じ） |
| D177 | `Resource.passthroughElements` | （D106 と同じ） |
| D182 | `Assignment.passthroughValues` | （D105 と同じ） |
| D183 | `Assignment.passthroughElements` | （D106 と同じ） |

### 3.2 型の定義（2 行）

| 行 | 置き場 | 今の案 | 新しい案 |
|---|---|---|---|
| D273 | `$defs/PassthroughValues` | MSPDI values that GRS does not read, kept under their MSPDI names and written back unchanged. | Carried MSPDI values, keyed by their MSPDI names. |
| D274 | `$defs/PassthroughElement` | One MSPDI element that GRS does not read, kept and written back unchanged in its place. | One carried MSPDI element, kept whole and written back in its place. |

D275〜D278（`ordinal`・`name`・`fields`・`children`）は今の案のままでよい。

### 3.3 「持つが数えない」列（5 行）

| 行 | 置き場 | 今の案 | 新しい案 |
|---|---|---|---|
| D109 | `Calendar.baseCalendarUid` | Same as MSPDI Calendar/BaseCalendarUID. GRS does not follow it when it counts working days. | Same as MSPDI Calendar/BaseCalendarUID. Carried: GRS never takes days from the base calendar. |
| D142 | `Task.calendarUid` | Same as MSPDI Task/CalendarUID. GRS keeps it only to write it back; working days are counted with project.calendarUid. | Same as MSPDI Task/CalendarUID. Carried: working days are counted with project.calendarUid. |
| D172 | `Resource.calendarUid` | Same as MSPDI Resource/CalendarUID. GRS keeps it only to write it back; working days are counted with project.calendarUid. | Same as MSPDI Resource/CalendarUID. Carried: working days are counted with project.calendarUid. |
| D167 | `Dependency.lagFormat` | Same as MSPDI PredecessorLink/LagFormat. GRS counts only 7 (working days), 5 (hours) and 3 (minutes); it keeps any other value but does not count the lag. GRS writes the unit that the lag was typed in. | Same as MSPDI PredecessorLink/LagFormat. GRS counts the lag only when this is 7 (working days), 5 (hours) or 3 (minutes); with any other value the lag is only shown and carried. GRS writes the unit the lag was typed in. |
| D130 | `Exception.recurrenceKind` | Same as MSPDI Exception/Type. GRS counts only a one-off exception: 9, absent, or 1 with recurrencePeriod absent or 1. It keeps any other exception but does not count it. Write 1 for an exception you add. | Same as MSPDI Exception/Type. GRS counts only a one-off exception: 9, absent, or 1 with recurrencePeriod absent or 1; any other exception is carried. Write 1 for an exception you add. |

### 3.4 変えない行（逆向き・別の理由）

- D156・D157（フェード）: 「Written to MSPDI as a Task/ExtendedAttribute.」のまま。
- D092（`scheduleDataTimeZone`）・D184（`TaskGroup`）: 「MSPDI へ書かない」 GRS だけの値。根の木で印の無いものは GRS 独自と決めた（`JDG-3338`）ので、札は要らない。

### 3.5 同じ英文を持つ別の場所（直すときに一緒に直す）

- `spec-rows-map.tsv` の erd.json の AT 行の `en:`（AT-22・23・43・44・49・50・68・69・75・76・83・84・90・91・95・96、AT-33・AT-89 ほか）。
- `spec-rows-map.tsv` の `CARRY_DESCRIPTION`（生成器の中の英語。D273 と同じ文）。
- 根の説明（`ROOT_DESCRIPTION`）の「Terms:」の後ろに「Concepts:」の 2 行を足す。

---

## 4. コメントへの答え

### D105・D106・D115・D161・D162 「GRS が keep もしないように見えるよ？ 違うよね？」

違う。GRS は使わないが、持っていて、そのまま書き戻す。
今の文は `not` が `read`・`kept`・`written back` の全部に掛かるように読めるので、1.1 の形
（`does not use it, but keeps it and writes it back`）に直す。
各行は `Carried:` の札で始め、意味は根の 1 行で 1 度だけ言う。

### 「carry の考え方を 1 枚の .md に」「そのエッセンスを GRS JSON の冒頭に」

本書が 1 枚目。冒頭の 2 行は 1.1。

### D116 「これ系多いな。まとめて短文で書けないか？ タグ付け的に。GRS doesn't use, just carry to MSPDI 的に」

`Carried:` を札にした。写しの器 16 行は 2 つの同じ文になり（3.1）、「持つが数えない」列 5 行も同じ札で短くなる（3.3）。

### 食い違い

1. **「GRS does not read」「written back unchanged」と仕様書** —— 仕様書には、GRS が読む持ち回りの値と、編集で作り直す値がある。
   - 読むもの: `ActualDuration`（`Stop` が無いタスクの `stop` を置くのに使う。`FR-011`、語の定め `G-13` は持ち回りの対象に「算出で置き換えうるが原値を保つ項目」を含める）、根の `xmlns`（`EX-15`、妥当性の判じ方 `EX-1`）、`Occurrences` と `Units` の有無（`EX-13`・`EX-14`）。
   - 作り直すもの: `ConstraintType`・`ConstraintDate`・`Duration`・`Manual…`、書かない余裕日数（`EX-11`・`EX-12`、CM-11）。
   - 1.1 の案は「use」と 2 行目の例外で両方に合わせたが、どちらを正とするかは決めていない。
2. **札の語** —— 語の定め `G-13` は「Carry」、CR-851 は出自の区分を `Carry` → `Passthrough` に、プロパティを `passthrough…` に改める（`spec-rows-map.tsv` の erd.json の origin の行・6.2 の出自の 4 区分）。`G-13` を改める行は表に無い。本書の札「Carried」は `G-13` 側の語である。
3. **D167 の「any other value」と `MR-5`** —— CR-851 が足す `MR-5` は、MSPDI の決まった集合の外の `LagFormat` を取り込みで拒む。D167 の「any other value」は集合の内の 7/5/3 以外を指すはずだが、文からは分からない。スキーマの `lagFormat` の型は範囲の無い `int` で、GRS JSON に集合の外の値が来たときの扱いも書かれていない。

### 仕様書に書かれていないこと（食い違いではない）

- 合流の「上書き」（`MG-8`・`MG-8a`）で、写しの器を丸ごと替えるか、鍵ごとに混ぜるか。
- AI などが書いた器の鍵が、GRS が自分の列として書く名（例 `Start`）と同じだったとき。

---

## 出典

- 往復無損失: `docs/spec/01-04-requirements.md` の `FR-021`（6894 行あたり）、`LM-5`（218 行）、語の定め `G-13`（268 行）。
- 置き場と形: 同 表 T-053 の `DF-1`〜`DF-5`、読み方 表 T-265 の `MR-1`〜`MR-4`。
- 書き出し: 同 表 T-033 の `EX-2`・`EX-3`・`EX-6`・`EX-10`〜`EX-16`（7108〜7123 行）。
- 実績の原値: 同 `FR-011`（3138〜3146 行）、`docs/spec/_assets/fig-erd-detail.md` の `DV-11`・`DV-15`。
- 列の役割: `docs/spec/_assets/fig-erd-detail.md` の `AT-22`・`AT-23`・`AT-43`・`AT-44`・`AT-48`・`AT-66`・`AT-82`・`AT-89`・`AT-95`・`AT-123`〜`AT-126`、`docs/spec/05-07-design.md` 6.2 の出自の 4 区分（1663 行）。
- 遅延診断は読まない: `docs/spec/01-04-requirements.md` の `FR-131`。
- Agent API: `docs/spec/_assets/tbl-agent-api-members.md` の `AM-3`、`spec-rows-map.tsv` の `includePassthrough` の行。
- 生成器の英語: `docs/spec/_source/erd_json_to_schema.py` の `CARRY_DESCRIPTION`（272 行）・`CARRY_DEF`（494 行）。
- CR-851: `change-request/CR-851-grs-json-is-reshaped-once-before-beta-and-alpha-files-go-through-a-converter.md`（`carry` → `passthroughValues` の改名、値の集合の外は `JDG-3289`）。
- 裁定: `docs/development-records/rulings.md` の `JDG-3289`・`JDG-3338`。
- 表: `studies/76-grs-json-beta-shape/doc-shape-map.tsv`（3 節の行）、`spec-rows-map.tsv`（`ROOT_DESCRIPTION`・`CARRY_DESCRIPTION`・`MR-5`・`EX-6`・`EX-11`・AT 行）、`commands-map.tsv` の CM-11、`doc-shape-choices.md` の L1・L2・N1。
- 書く文の決まり: `studies/76-grs-json-beta-shape/shipped-text-criteria.md` の E1〜E7。
