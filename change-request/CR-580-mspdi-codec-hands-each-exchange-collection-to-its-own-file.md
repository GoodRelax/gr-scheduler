# CR-580 — `mspdi-codec.ts` をもう一度割り、交換相手の集まりごとの写しを兄弟へ出す

> ⛔ **状態: 起草の途中（2026-09-26）。ユニットの表は、調整役の重複関数の調査の報告を待つ。利用者にはまだ見せていない。**
> 調整役の指示（2026-09-26、利用者の「開いているセッションが多すぎる」による）で、この時点で止めてコミットした。計画は後で組み直す。
> 読んだ木: `d65097b9`（ブランチ `refactor` の先端）。行番号・数は、断りの無い限りすべてこの木で測った。
> ID の帯: 調整役から `CR-580`、`JDG-696`〜`JDG-699`、`DFC-1046`〜`DFC-1050` を受けた。
> 表 T-075 の新しい行は仮の番号 `UF-p1`〜`UF-p6` で書く。
> 調整役が `CR-578`・`CR-579` の後、本書を当てる直前に、検査 62 で max+1 へ詰める。
>
> **開くもの**: 利用者の裁定（2026-09-26、調整役の案 B への答え「提案通りでOK」）。
> - 手書きが 1,000 行を超える `src` のファイルは、必ず割る（生成の区画は数えない）。
> - 501〜1,000 行のファイルは、レビューが 2 つ以上の責務を見つけたときだけ割る。
> - 1,000 行を再び超えさせない検査は `CR-578` が足す（本書ではない）。
>
> 超える 3 ファイルのうち、`src/adapter/document-codec/mspdi-codec.ts`（手書き 1,324 行、生成 0）が本書の分である。
> 当てる順（調整役）: `CR-578`（`frame-loop.ts`）→ `CR-579`（`input-command-translator.ts`）→ 本書。
> どれも `CR-574`・`CR-575`・`CR-577`・`CR-555`〜`CR-563` より前に当てる。
>
> ⛔ **本書は起草だけである。** `src/`・`tests/`・`docs/spec/`・基準線は、本書を当てる波（6 節）が書き換える。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⚠️ **直に前へ進めるものは無い。利用者が画面で気づく変化は 0 である**（`CR-554` の 0 節 ① と同じ答え）。
表 T-054 の `CH-1` 〜 `CH-6` のどれにも、`GL-001` 〜 `GL-008` のどれにも直には結ばない。作り方の側の手入れである。
間接の結びは、利用者の目的「目的はとにかく変更に強くすること。」（`CR-432` の 4.1 に逐語）である。
暦・担当者・割当・タスク・長さ・持ち回りの規則が変わったとき、最初に開くファイルが 1 つに決まるようにする（表 T-276 の `UD-5`）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` を当てた。名を先に問い（`JDG-548`）、別の体に反証させた（2 節）。

- `R2.2c` —— `UF-36` を書き換えるので、`R2.2a` をいま当て直す。`CR-554` の 4.8 の畳みをそのまま受け継げない。
- `R2.2a`（責務文の 5 段）—— 第 1 案の 4 つの責務文のうち、2 つが FAIL した（2.2）。
  - 入口の「読まない子を `carry` に控えて戻す」は (a) として畳めない。分割の後は兄弟 6 つが `carrySplit` を呼び、`MR-3` の変更は `keepFirstLeaf`（`:211`）と `duplicateLeafCount`（`:217`）だけを書き換える。
  - タスクの「実績の長さを停止日に直す」は (a) として畳めない。入口が `withStopsFromActualDurations` を単独で呼ぶ（`:369`）。
- `R2.1`（名が体を表す）—— 第 1 案の `mspdi-resources.ts` は、`Resources` と並ぶ別の集まり `Assignments`（`PATHS` の `:84`・`:85`）を隠していた。
- 表 T-276 の `UD-1`・`UD-5` —— 継ぎ目は、交換相手の `Project` の下の集まり（`Calendars`・`Tasks`・`Resources`・`Assignments`）と、それらが共に頼る 2 つの規則（持ち回り・長さの変換）に沿う。

### ③ 利用者に問わずに決めたこと

1. **読みと書きでは割らない。** 共変が 0.83（6 件中 5）で拒む（1.3）。どのユニットも、読みと書きの半分を共に持つ。
2. **依存（`PredecessorLink`）はタスクのユニットに残す。** 交換相手のスキーマが `Task` の子として入れ子にし、`linksOfTask` と `writtenDependency` は外から単独で呼ばれない。
   ⚠️ 第 1 案の理由「`writtenTask` の 1 つの `xsd:sequence` の中で書くから（S3）」は反証で崩れた —— 同じ並びの中で `writtenFadeValues`（`:1135`）と `fadeOfCarried`（`:592`）は既に別のファイルを呼ぶ。理由は入れ子のほうである。
3. **要素の木の語彙（`PATHS`・`leaf`・`childOf`・`textColumn` ほか）は入口に残す。** `CR-554` の 15.6.4 が語彙だけのユニット（`mspdi-leaves.ts`）を S4 で退けた。`mspdi-xml.ts` へ移す案は反証で崩れた（2.3）。
4. **`CARRIED_ROW_PATHS` は入口に残す。** 読み込みの時に `PATHS` を読む唯一の頂上の `const`（`:89`）である。兄弟へ出すと、入口との輪の中で TDZ になる。
5. **持ち回った行を集まりへ戻す（`splicedCarriedRows`）のは、どの集まりも兄弟の側に揃える。** 今は暦と割当だけを入口が戻し（`:925`・`:933`）、タスクと担当者は兄弟が戻す（`:1000`・`:1248`）。これが設計した唯一のコードの違い D-a である（3 節）。

---

## 1. 読んで確かめた事実（`d65097b9` で測った）

### 1.1 大きさと、`CR-554` の後の変化

- `mspdi-codec.ts` は 1,324 行（生成 0）。頂上の宣言は 98 個、コード 1,104 行、コメント 57 行。
- `CR-554`（M1〜M4 は `108e2c0f`・`8e8a018e`・`5076f77f`・`225314c2`）の後は 1,273 行だった。
- その後に入口へ触れたのは `dfbba1de`（`CR-569` の波 2a、1,273 → 1,324）だけである。
  - 触れた先: 要約タスクの補助（入口）、`outlineBaseOf`・`tasksFromRoot`・`taskFromElement`・`linksOfTask`（タスク）、`assignmentsFromRoot`（割当）。
  - `CR-565`・`CR-567` は `json-codec.ts`・`grs-json-schema.ts`・`mspdi-imported-rows.ts` だけに触れた。
- 関数の大きさ: `writtenProjectChildren` 56/7 と `tasksInWbsOrder` 31/16 は、`.claude/skills/spec-graph-check/function-size-baseline.txt` の 38・39 行の `HELD` と合う。

### 1.2 外から読まれる名（分割の後も、すべて入口が出す）

- `document-codec.ts`: `withoutLeadingByteOrderMark` と `PI-20` の名。
- `json-codec.ts`: `isObject`・`mspdiVersionOfCarried`・`withoutLeadingByteOrderMark`。
- `grs-json-schema.ts`: `isObject`。
- `mspdi-fade-frames.ts`: `PATHS`・`childOf`・`integerColumn`・`leaf`・`notice`・`textColumn`・`wholeNumberOf` と型 `ExportRun`。
- 試験 8 本: 公開の名だけ ⇒ `tests/` の取り込みは変わらない（`CR-573` が `tests/` を持つ間も衝突しない）。

### 1.3 共変（`CR-554` の 13 節の手 1 と同じ数え方）

- 範囲 70 個に `git log -L` を掛けた。分割前の歴史まで遡る。
- M1〜M4 は 23 の範囲の歴史に現れ、移しとして除いた。誕生として `4715c316`・`1d0412b1` を除いた。`9ded3cb3` はコメントだけの変更である。
- 較正: 読み 〜 書きは `CR-554` の 4.8 と同じ **0.83（6 件中 5）** を再現した。

| 組 | 両方 ／ 小さい側 | 数 | 判定 |
| --- | --- | --- | --- |
| 読み 〜 書き | 5 ／ 6 | 0.83 | **拒む**（`7f9b4692` を除いて 0.80、4 ／ 5） |
| タスクの読み 〜 タスクの書き | 3 ／ 5 | 0.60 | **拒む**（感度では 2 ／ 4 で下限に届かない） |
| 暦 〜 担当者と割当 | 1 ／ 1 | — | 証拠なし |
| 暦 〜 タスク | 1 ／ 1 | — | 証拠なし |
| 担当者と割当 〜 タスク | 2 ／ 2 | — | 証拠なし |
| タスク 〜 WBS の並び | 4 ／ 4 | — | 証拠なし（WBS に触れたコミットは、すべてタスクにも触れた） |
| 持ち回り 〜 各集まり | 3 以下 | — | 証拠なし |

- ユニットごとのコミットの数: 暦 1、担当者と割当 2、タスク 8、WBS 4、持ち回り 3。
- ⚠️ 第 2 案（2.3 の表）の分け方そのものでの共変は、まだ測っていない（4 節の 1）。第 1 案の反証の体が、入口を 4 つに割る分け方・依存と割当を出す分け方・実績の長さと制約を出す分け方を測り、どれも「証拠なし」だった。

### 1.4 待っている変更要求との衝突

`change-request/CR-555`〜`CR-563`・`CR-571`〜`CR-577` の本文を、`document-codec`・`mspdi-codec`・`mspdi-*.ts` で数えた。

| 変更要求 | `document-codec` | `mspdi-codec` | 他の `mspdi-*.ts` | 中身 |
| --- | --: | --: | --: | --- |
| `CR-558` | 1 | 0 | 0 | `json-codec.ts` だけ |
| `CR-559` | 2 | 0 | 0 | `json-codec.ts` だけ |
| `CR-562` | 3 | 0 | 0 | `json-codec.ts`・`document-codec.ts` |
| `CR-563` | 0 | 1 | 0 | `grep` の除外の中に名が出るだけ |
| `CR-576` | 2 | 0 | 2 | `mspdi-fade-frames.ts:94-113`・`:250-251` を証拠として読むだけ。波 3 の試験が往復を確かめる |
| ほか | 0 | 0 | 0 | — |

⇒ **本書より先に当てねばならない変更要求は無い。** 動く宣言の名での照合は、まだしていない（4 節の 2）。

### 1.5 XSD（手元だけ）

- 試験 13 本が `docs/reference/mspdi/` の XSD を読む（`git grep -l "reference/mspdi\|pj12\|pj15\|\.xsd" -- tests`）。例: `tests/unit/uf-36.test.ts`・`tests/unit/cr-429-*.test.ts`・`tests/unit/dfc-685-*.test.ts`・`tests/nfr/nfr-004-single-file.test.ts`。
- XSD は `.gitignore` の下にあり、作業木には無い。
- 分割の照合器（5 節）は XSD を要しない。コーデックが実行時に読むのは、コミット済みの `mspdi-child-order.json` と `mspdi-custom-fields.json` だけである。

---

## 2. 継ぎ目を決めた道すじ

### 2.1 第 1 案（測る体の推奨）

入口 551 ＋ `mspdi-tasks.ts` 491 ＋ `mspdi-resources.ts` 120 ＋ `mspdi-calendars.ts` 162 ＝ 1,324。

### 2.2 第 1 案への反証（別の体、読むだけ）

| 主張 | 結果 | 証拠 |
| --- | --- | --- |
| 範囲 551 ／ 491 ／ 120 ／ 162、重なり 0・漏れ 0 | 成り立つ | 宣言の名で独立に導き直した |
| TDZ 無し | 成り立つ | 読み込みの時に束縛を読むのは `CARRIED_ROW_PATHS` → `PATHS`（`:89`）だけで、両方とも入口 |
| 新しい兄弟どうしは互いに取り込まない | 字だけ直す | `mspdi-tasks` は既存の `mspdi-fade-frames` を取り込む（`:503`・`:592`・`:1135`）。兄弟だけの輪は無い |
| 入口の責務文が PASS | **崩れた** | `carry` は (a) ではない —— 分割の後は兄弟が `carrySplit`・`carriedElement`（`:514` ほか 15 か所）と `splicedCarriedRows`（`:1000`・`:1248`）を呼ぶ。`MR-3` の変更は `keepFirstLeaf`（`:211`）と `duplicateLeafCount`（`:217`）だけを書き換え、表 T-058 の Project の行とは出どころが別 |
| 入口の (c)「兄弟が使う語彙」 | **崩れた** | `UT-17` が言う語彙は「要素の道・葉の読み書き・告知」だけである。第 1 案は、その外の名を 11 個新しく出す（`carrySplit`・`carriedElement`・`splicedCarriedRows`・`summaryTargetOf`・`isProjectSummary`・`SummaryTarget`・`ImportRun`・`collection`・`booleanColumn`・`isTrue`・`optionalLeaf`） |
| `mspdi-tasks` の責務文が PASS | **崩れた** | `withStopsFromActualDurations` を入口が単独で呼ぶ（`:369`）。`FR-054` の丸めの変更は `:540-549`・`:657-661` だけを書き換える |
| `mspdi-resources` の名 | **崩れた** | `Assignments` は別の集まり（`:85` と `:84`）。`dfbba1de` が触れたのは `assignmentsFromRoot` だけ（`MR-4`、タスクの側の理由） |
| 持ち回った行を戻す場所 | **新しい指摘** | 暦と割当は入口が戻し（`:925`・`:933`）、タスクと担当者は兄弟が戻す ⇒ `UD-5` で 2 ファイルが答える |
| 丸めの数の状態 | **新しい指摘** | `roundedActualDurationCount` は入口の `ImportRun`（`:302`、初期化 `:318`）にあり、読むのは長さの変換だけ（`:541`・`:659`） |
| 検査 33 | **見落とし** | `SU-3` の「160。」（`05-07-design.md:247`）を波ごとに 1 つ上げる |
| 表 T-059 を 1 つのファイルに置く（`CR-554:538`） | 覆す | 表 T-059 の行は実体ごとである（DV-1〜DV-3 は Project、DV-4〜DV-8・DV-11 は Task、DV-10 は Resource）。`CR-554` の 4.8 が守ったのは、Task の行が `writtenTask` の 1 つの並びで組まれることであり、第 2 案もそれを 1 つのファイルに残す |

⭐ 1 つ見つかれば、ほかにもあると読んだ（`JDG-548`）。

### 2.3 第 2 案 —— ⏳ 仮の表（重複関数の調査を待つ。利用者にはまだ見せていない）

⚠️ `mspdi-durations.ts` と `mspdi-tasks.ts` の行数は宣言の範囲の和で出した見積りである。第 2 案の反証の体は、調整役の停止の指示で途中で止めた（4 節の 1）。

| 行 ID（仮） | ユニット | 行 | 束ねる名 | 責務文（R2.2a の主の句と、畳んだ句） |
| --- | --- | --: | --- | --- |
| `UF-36`（残る） | `mspdi-codec.ts`（入口） | 474 | 見出しと取り込み、`MspdiNotice`・`MspdiDecoding`・`MspdiEncoding`・`MSPDI_NAMESPACE`・`PATHS`・`CARRIED_ROW_PATHS`、語彙（`notice` 〜 `isTrue`、`isObject`・`leaf`・`optionalLeaf`）、版（`MspdiVersion` 〜 `carryHoldersOf`）、`ImportRun`・`documentFromMspdi`・`BYTE_ORDER_MARK`・`withoutLeadingByteOrderMark`・`scheduleFromRoot`・`projectFromRoot`・`PROJECT_CONSUMED`、要約タスク（`PROJECT_SUMMARY_*`・`isProjectSummary`・`SummaryTarget`・`summaryTargetOf`）、`ExportRun`・`mspdiFromDocument`・`writtenProjectChildren`・`GRS_SAVE_VERSION`・`UNSTATED_CURRENCY_CODE`・`collection`・`latestTaskFinish` | 「MSPDI の `Project` 要素と文書を相互に写す（`FR-021`・`FR-057`）」。Project の列と書き出しで作る値 DV-1〜DV-3 は (b)。要約タスクは MSPDI がプロジェクトを表すもう 1 つの形であり、`Task` にせず控える（`MR-4`・`EX-5`）は (b)。版を列 `sourceFormat` の値として判じる（`EX-1`・`AT-143`）は (b)。集まりは兄弟に問う・要素の木の語彙と公開の入口と型は (c) |
| `UF-p1` | `mspdi-carry.ts` | 77 | `CarrySplit`・`carrySplit`・`carriedElement`・`keepFirstLeaf`・`duplicateLeafCount`・`isCarriedRow`・`splicedCarriedRows` | 「文書が読まない子を控え、書くとき元の位置へ戻す（`DF-3`・`MR-3`・`RS-60`）」。同じ名の葉は最初を取り、残りを数える（`MR-3`）は (c) |
| `UF-p2` | `mspdi-durations.ts` | 110 | `minutesOfDuration`・`durationOfMinutes`・`minutesPerWorkingDay`・`tellRoundedActualDurations`・`withStopsFromActualDurations`・`workingDaysOfActualDuration`・`writtenActualDuration` | 「MSPDI の長さ（`Duration`・`ActualDuration`）と、文書の稼働日の数を相互に変える」。`PT…H…M…S` の綴り（`EX-9`）は (c)。実績の長さと停止日（`FR-011`・`AT-141`）は (b)。半日へ丸めて丸めた数を告げる（`FR-054`）は (c) |
| `UF-p3` | `mspdi-tasks.ts` | 381 | `TASK_CONSUMED`・`DEPENDENCY_CONSUMED`・`TasksReading`・`outlineBaseOf` 〜 `countOfChildrenSoFar`・`TaskColumnsOfFile`・`taskFromElement`・`LinksReading`・`linksOfTask`・`writtenTasks`・`tasksInWbsOrder`・`rankOfSibling`・`taskDepths`・`outlineNumbers`・`writtenTask`・`CONSTRAINT_LEAVES`・`MUST_START_ON`・`writtenConstraintOfGrs`・`withoutLeaves`・`writtenDependency` | 「MSPDI の `Task` 要素を、子の `PredecessorLink` と共に、文書のタスクと依存へ相互に写す」。WBS の親・並び・アウトライン番号（表 T-059 の DV-4〜DV-7、`AT-139`）は (b)。制約の 2 つの葉（`EX-11`・`EX-12`）は (b)。フェードと長さの値は兄弟に問う（c） |
| `UF-p4` | `mspdi-calendars.ts` | 162 | `CALENDAR_CONSUMED`・`WEEKDAY_CONSUMED`・`EXCEPTION_CONSUMED`・`CalendarsReading`・`calendarsFromRoot`・`weekDaysOfCalendar`・`exceptionsOfCalendar`・`NO_RECURRENCE`・`writtenCalendar`・`writtenWeekDay`・`writtenException` | 「MSPDI の `Calendar` 要素を、子の `WeekDay`・`Exception` と共に、文書の暦へ相互に写す」。繰り返す例外日を展開せず告げる（`FR-054`）は (c) |
| `UF-p5` | `mspdi-resources.ts` | 64 | `RESOURCE_CONSUMED`・`ResourcesReading`・`resourcesFromRoot`・`writtenResources` | 「MSPDI の `Resource` 要素と、文書の担当者を相互に写す」。書き出しで作る ID（DV-10）は (b) |
| `UF-p6` | `mspdi-assignments.ts` | 56 | `ASSIGNMENT_CONSUMED`・`AssignmentsReading`・`assignmentsFromRoot`・`writtenAssignment` | 「MSPDI の `Assignment` 要素と、文書の割当を相互に写す」。要約タスクを指す割当を控える（`MR-4`）は (c) |

合計 474 ＋ 77 ＋ 110 ＋ 381 ＋ 162 ＋ 64 ＋ 56 ＝ 1,324。入口は 474 行で、501 行を下回る。

退けた名と分け方:

| 案 | 退けた理由 |
| --- | --- |
| `mspdi-reader.ts` ／ `mspdi-writer.ts` | 共変が拒む（0.83） |
| `mspdi-resources.ts` に割当を含める | `R2.1`: 別の集まりを隠す。`UF-15`（`edit-resource.ts`）の前例も同じ欠けを持つので、前例にならない |
| `mspdi-assignees.ts` | 用語集 N-10 は「担当者」を `Resource` の名とする（`docs/spec/_assets/tbl-glossary.md:38`）。`docs/development-rules/03-implementation.md:13` は改名を禁じる |
| `mspdi-task-columns.ts` ほか「-columns」 | 文書の側の半分しか言わない。ユニットは子を含む要素全体を写す |
| `mspdi-wbs.ts`（WBS だけ） | 読みの半分が `tasksFromRoot` のループの本体にある（S3） |
| 第 1 案の `mspdi-carry.ts`（160 行） | `CARRIED_ROW_PATHS` を持つと TDZ。コメント密度 15 ／ 12 で検査 55 が赤。第 2 案は 77 行でどちらも起きない |
| 語彙を `mspdi-xml.ts` へ | 兄弟は持ち回りと要約の値を入口から実行時に取り込み続ける。`UT-17`・`CR-554:1434`・`UF-153` に反し、xml と child-placement の間に型の輪を作る |
| `mspdi-tasks.ts` だけを出す（入口 833） | 入口が 501〜1,000 に残り、繰り返す例外日の告知（`:849-855`）と Project の列（`:389-423`）の出どころが別 ⇒ 2 つの責務 |

---

## 3. 設計したコードの違い（照合器が許すものだけ）

- **D-a**: 暦と割当の持ち回った行を戻す呼び出し（`:925`・`:933`）を、兄弟の `writtenCalendars(schedule)` ／ `writtenAssignments(schedule)` へ移す。どちらも、`writtenTasks` ／ `writtenResources` と同じく、戻した後の集まりを返す。`:924` の `TRAP` のコメントも共に動く。
- **D-b**: ファイルをまたぐ名に `export` を足すことと、取り込みの文。
- ほかの違いはすべて失敗とする。公開の名は増やさない（入口が出し直す名は 1.2 のまま）。

---

## 4. ⏳ 止めた時点で残っていること

1. **第 2 案の反証**（別の体）—— 次を測り直す。
   - 範囲の割り当て（重なり 0・漏れ 0、合計 1,324）。
   - 取り込みの辺と TDZ。
   - 7 つの責務文の `R2.2a`（とくに `mspdi-carry.ts` と `mspdi-child-placement.ts`（`UF-154`「持ち回った子を届いた順で戻し」）の重なり、`mspdi-durations.ts` の `EX-9`・`FR-054`・`FR-011` が 1 つの理由か）。
   - `UD-5` の 8 つの問い。
   - 第 2 案の分け方での共変。
   - コメント密度と関数の大きさ（D-a が `writtenProjectChildren` の行数を変えるか）。
   - 波ごとの検査。
   - 動く宣言の名での、待っている変更要求との照合。
2. **重複関数の調査**（調整役が別のセッションで走らせている）—— このファイルに落ちる組は、本書の中で 1 つにまとめる。2 つの写しのまま動かさない。
   反証の体が挙げた候補（判じていない）:
   - D1: `:163`（`durationOfMinutes`）＝ `src/use-case/edit-document/task-plan-actual.ts:277`、`:170` ≈ `:270`、`:1152`（`MUST_START_ON`）＝ `:213`、`:1149` ⊂ `:210`、`:1168-1170` ≈ `:223-228`。
   - D2: `:621` と `json-codec.ts:284`。
   - D3: `:1060`（`taskDepths`）と `mspdi-imported-rows.ts:16-26`・`:55`、`schedule-invariants.ts:67`、`validate-imported-document.ts:92`。
   - D4: `:1008-1016` と `task-group-order.ts:63-67`。
   - D5: `:971` と `calendar-day.ts:36`・`:45`。
   - D6: `:1181` と `task-plan-actual.ts:236-237`、`json-codec.ts:265`・`:295`。
   - D7: `:283`（`isObject`）と `agent-api-members.ts:178`。
3. **利用者に見せる最終の表** —— 1 と 2 の後。

---

## 5. 照合器（W0 —— どの波より先に、分割前の木から別の体が作る）

⛔ 振る舞いを保つ証明は 3 段とする（`CR-554` の 15.6.13、`CR-568` の 5 節の形）。照合器はセッションの一時フォルダに置き、木には入れない。
作る体は分割する体とは別で、分割前の木だけを読む。

1. **字句の一致**: 動かす宣言ごとに、分割前の本体と移した後の本体を、コメントと空白を除いた字句列で比べる（`comment-cleanup-identity-check` の方法）。許す違いは 3 節の D-a と D-b だけ。
2. **値のバイト一致**:
   - 「前」: 分割前の木を `git archive <分割前の sha> src` で一時フォルダへ出し、非公開の関数にだけ `export` を足した写し。
   - 入力:
     - `sample-schedule/*.xml` の 7 本。
     - `sample-schedule/*.json` の 2 本とアプリの起動の見本を、書き出して読み直したもの。
     - `tests/unit/cr-429-mspdi-fixtures.ts` の見本。
     - 手で作る境界の入力 —— 繰り返す葉、宣言の無い子、`UID` の無い `Calendar`、要約タスクを指す割当と依存、`ActualDuration` の丸め、`pj15` だけの子、BOM。
   - 比べるもの: 各入力の `documentFromMspdi` の JSON、`mspdiFromDocument` の字、告知の列、`duplicateLeaves`。
   - 動かす非公開の関数ごとの値（`carrySplit`・`splicedCarriedRows`・`workingDaysOfActualDuration`・`outlineNumbers` ほか）も JSON の行で比べる。
3. **感度**: 動かす兄弟ごとに少なくとも 1 か所、計 10 件以上をわざと壊し、すべてが赤になることを確かめてから使う。照合器自身の網羅（文・分岐・関数）を報告する（`CR-554` の基準: `mspdi-codec.ts` は 94.6 ／ 85.4 ／ 100）。

---

## 6. 波（1 波 1 コミット、順に。割る体は同時に 1 体だけ）

⚠️ 順と各波の編集は、4 節の 1 の反証で確かめてから決める。いまの案は、呼ばれる側を先に置く順である。

| 波 | 出すもの | 同じコミットで書き換えるもの |
| --- | --- | --- |
| W0 | 照合器（木には書かない） | — |
| V1 | `mspdi-carry.ts` | 入口、`05-07-design.md`（表 T-075 の行、`UF-36` の責務の欄、`UT-17` のファイルの列と語彙の文、`SU-3` の数） |
| V2 | `mspdi-durations.ts` | 同上 |
| V3 | `mspdi-calendars.ts`（D-a の暦の半分） | 同上 |
| V4 | `mspdi-resources.ts` | 同上 |
| V5 | `mspdi-assignments.ts`（D-a の割当の半分） | 同上 |
| V6 | `mspdi-tasks.ts` | 同上 ＋ `function-size-baseline.txt` の `tasksInWbsOrder` の鍵（改名。`JDG-520` の下で調整役が当てる） |

各波の出口（前に立つ者が回し直す）:
- 照合器のバイト一致。
- `npm run typecheck`・`npm run gen:check`。
- `npm run test` —— ⛔ **MSPDI の試験 13 本（1.5）は XSD が要るので、根の作業木で調整役が回す**（`JDG-644`、`CR-573`）。作業木では、XSD の無い試験は理由とパスを名乗ってスキップする（`CR-573` の後）。
- `rm -rf output && npm run check`、とくに次の検査:

| 検査 | 見込み |
| --- | --- |
| 18（`generate_unit_tree.py`、`src` が表 T-075 のユニットをちょうど持つ） | 行とファイルを同じコミットで足せば緑 |
| 33（`audit-ch5.py`、`SU-3` の数） | 波ごとに 160 から 1 つ上げる（`CR-578`・`CR-579` の後の数から） |
| 59（コンポーネントの辺） | 0 —— 辺はすべて `DocumentCodec` の中。`DocumentCodec` → `Schedule` は宣言済み（`components.json:884-889`） |
| 60（関数の大きさ） | V6 で `tasksInWbsOrder` の鍵を付け替える。`writtenProjectChildren` は入口に残る（D-a で行数が減れば下げる向き） |
| 61（モジュールの状態） | 0 —— 頂上の `const` を同じファイルが書き換えない |
| 19・26b・45・55 | 緑の見込み（19 は同じコンポーネントの中の辺を見ない。26b はフォルダの外へ出る名が無い。45 は取り込みの文を除く。55 は第 2 案の `mspdi-carry.ts` で 9 のまま） |
| 62 | 仮の `UF-p1`〜`UF-p6` を調整役が詰めた後に緑 |

⛔ e2e は `GRS_PERF` を付けずに回す。

---

## 7. 台帳

⛔ 本書は台帳をまだ書かない。帯は `JDG-696`〜`JDG-699`、`DFC-1046`〜`DFC-1050`（どれも未使用）。
重複の組を 1 つにまとめる判断が、利用者に問うものなら `JDG-` に、コードの食い違いなら `DFC-` に起こす。

---

## 8. ⛔ この変更でやらないこと

- 振る舞いを変えること（3 節の D-a と D-b のほかは、照合器が失敗とする）。
- 公開の名を変えること・増やすこと。
- `tests/` の取り込みを変えること（`CR-573` が `tests/` を持つ）。
- 1,000 行を超えさせない検査を足すこと（`CR-578` の分）。
- XSD と SDK のファイルをコミットすること。
- 基準線を上げる向きに書き換えること。

---

## 9. 測り方の再現

本書の数は、`d65097b9` から次の手で作った。スクリプトはセッションの一時フォルダに置いたので、木には無い（`CR-554` の 13 節と同じ扱い）。

1. **宣言と範囲**: 頂上の宣言ごとに、前に付くコメントを含む `[始, 終]` を取り、重なり 0・漏れ 0・合計 ＝ `wc -l` を表明で確かめた。
2. **共変**: `CR-554` の 13 節の手 1 のとおり。M1〜M4 は、`mspdi-codec.ts` からコードを除いただけのコミットとして移しと見て除いた。
3. **取り込みの辺と TDZ**: 各ユニットのコードの語（コメントと文字列を除く）を、別のユニットが頂上で宣言する名と突き合わせた。頂上の `const` の初期化式に、別のモジュールの束縛が現れるかを見た。
4. **コメント密度**: `.claude/skills/spec-graph-check/check-comment-rules.py` の `measure_text` を、各ユニットの範囲の行に 5 行の見出しを付けた字に掛けた。
5. **関数の大きさ**: `.claude/skills/spec-graph-check/function-size.mjs`。
6. **待っている変更要求**: `grep -o "document-codec"`・`"mspdi-codec"`・`"mspdi-[a-z-]+\.ts"` を各変更要求に掛けて数えた。
7. **XSD の要る試験**: `git grep -l "reference/mspdi\|pj12\|pj15\|\.xsd" -- tests`（13 本）。
