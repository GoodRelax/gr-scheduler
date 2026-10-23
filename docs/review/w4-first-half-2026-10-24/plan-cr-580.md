# CR-580 の計画 —— `src/adapter/document-codec/mspdi-codec.ts` を集まりごとに割る（今日の木で測り直し）

測った木: ブランチ `w4-first-half`、`d0ae3a9c8`（作業木）。
CR 本文（`change-request/CR-580-*.md`、`d65097b9` で起草）の数と file:line はすべて古い。下はすべて今日の木で測った。
測りの台本は scratchpad の `p580/`（`units.mjs`・`cochange.mjs`・`cochange-rw.mjs`）。木には入れていない。

CR から受け継ぐ方針（逐語を保つもの）:
- 利用者の裁定（2026-09-26、JDG-695）「手書きが 1,000 行を超える `src` のファイルは、必ず割る（生成の区画は数えない）。」「501〜1,000 行のファイルは、レビューが 2 つ以上の責務を見つけたときだけ割る。」
- 0 節 ③ の 1〜5（読みと書きでは割らない／依存はタスクに残す／語彙は入口に残す／`CARRIED_ROW_PATHS` は入口に残す／持ち回った行の戻しはどの集まりも同じ側に揃える = D-a）。⚠️ ③-5 の「兄弟の側に揃える」は下の 2 節で 1 つ変える（戻す関数そのものは `mspdi-child-placement.ts` へ）。

---

## 1. 測った事実

### 1.1 大きさ

| 量 | 値 | 方法 |
| --- | --: | --- |
| 手書きの行（生成の区画なし） | 1,419 | `wc -l`；`grep -n "generated" mspdi-codec.ts` は 0 件 |
| 頂上の文 | 118（import 9 ／ 再出し 1 ／ 宣言 108） | `node docs/review/w4-first-half-2026-10-24/scripts/outline.mjs src/adapter/document-codec/mspdi-codec.ts` |
| check 60 の HELD | 1 行（`tasksInWbsOrder lines=31 branches=16`） | `grep mspdi-codec .claude/skills/spec-graph-check/function-size-baseline.txt` |

### 1.2 案の集まりごとの範囲（前に付くコメントと空行を次の宣言に含めた和）

方法: `node scripts/units580.mjs src/adapter/document-codec/mspdi-codec.ts <outdir> rows`（rolldown `parseAst` で頂上の文を取り、前の文の終わり + 1 から自分の終わりまでを 1 つの範囲にし、重なり 0・漏れ 0・合計 = 1,419 を確かめた）。

| 集まり | 範囲の和（今日の宣言のまま） | 含む頂上の宣言 |
| --- | --: | --- |
| 入口に残す | 552（見出し 4 行と import 51 行を含む） | `MspdiNotice` `MspdiDecoding` `MspdiEncoding` `MSPDI_NAMESPACE` `CARRIED_NAMESPACE` `PATHS` `CARRIED_ROW_PATHS` `notice` `leafText` `childOf` `textColumn` `integerColumn` `wholeNumberOf` `booleanColumn` `isTrue` `MspdiVersion` `CarryHolder` `mspdiVersionOfCarried` `carryHoldersOf` `isObject` `leaf` `optionalLeaf` `absentLeaf` `ImportRun` `documentFromMspdi` `withSourceNamespace` `BYTE_ORDER_MARK` `withoutLeadingByteOrderMark` `scheduleFromRoot` `projectFromRoot` `PROJECT_CONSUMED` `DEFAULT_START_TIME` `DEFAULT_FINISH_TIME` `timeColumn` `PROJECT_SUMMARY_UID` `PROJECT_SUMMARY_OUTLINE_LEVEL` `isProjectSummary` `SummaryTarget` `summaryTargetOf` `ExportRun` `mspdiFromDocument` `writtenProjectColumns` `writtenProjectChildren` `isCarriedRow` `GRS_SAVE_VERSION` `UNSTATED_CURRENCY_CODE` `collection` `latestTaskFinish` `withoutLeaves` |
| 控え（carry の読み） | 55 | `CarrySplit`(186-190) `carrySplit`(191-206) `carriedElement`(207-217) `keepFirstLeaf`(218-224) `duplicateLeafCount`(225-240) |
| 持ち回った行の戻し | 17 | `splicedCarriedRows`(1103-1119) → `mspdi-child-placement.ts` へ |
| 実績の長さ | 92（うち `durationOfMinutes` 7 は G33 で `Schedule` へ） | `STOP_COUNTED_FROM`(84-88) `minutesOfDuration`(165-178) `durationOfMinutes`(179-185) `withStopsFromActualDurations`(662-683) `minutesOfActualDuration`(684-695) `writtenStop`(1248-1257) `writtenActualDuration`(1258-1279) |
| 暦 | 209 | `ONE_OCCURRENCE`(312) `ENDS_BY_FINISH_DATE`(313) `CALENDAR_CONSUMED`(501-504) `WEEKDAY_CONSUMED`(505-506) `EXCEPTION_CONSUMED`(507-508) `CalendarsReading`(810-814) `calendarsFromRoot`(815-847) `weekDaysOfCalendar`(848-869) `WORKING_TIMES`(870-871) `workingTimesOf`(872-881) `consumedWithWorkingTimes`(882-887) `exceptionsOfCalendar`(888-923) `writtenCalendar`(1335-1355) `writtenWeekDay`(1356-1369) `writtenException`(1370-1404) `writtenWorkingTimes`(1405-1419) |
| 担当者 | 64 | `RESOURCE_CONSUMED`(495-498) `ResourcesReading`(730-734) `resourcesFromRoot`(735-769) `writtenResources`(1299-1318) |
| 割当 | 60 | `WHOLE_UNITS`(310-311) `ASSIGNMENT_CONSUMED`(499-500) `AssignmentsReading`(770-774) `assignmentsFromRoot`(775-809) `writtenAssignment`(1319-1334) |
| タスク | 370（うち `MUST_START_ON` 3 行は残す。下の 3 節） | `TASK_CONSUMED`(487-494) `DEPENDENCY_CONSUMED`(509-512) `TasksReading`(513-518) `outlineBaseOf`(543-552) `tasksFromRoot`(553-593) `lastIndexShallowerThan`(594-602) `countOfChildrenSoFar`(603-620) `TaskColumnsOfFile`(621-625) `taskFromElement`(626-661) `LinksReading`(696-700) `linksOfTask`(701-729) `writtenTasks`(1043-1063) `tasksInWbsOrder`(1064-1097) `rankOfSibling`(1098-1102) `taskDepths`(1120-1137) `outlineNumbers`(1138-1159) `writtenTask`(1160-1207) `CONSTRAINT_LEAVES`(1208-1210) `MUST_START_ON`(1211-1213) `writtenConstraintOfGrs`(1214-1239) `writtenDependency`(1280-1298) |

和: 552 + 55 + 17 + 92 + 209 + 64 + 60 + 370 = 1,419。

⚠️ CR の第 2 案から消えた宣言（今日の木に無い）: `minutesPerWorkingDay`・`tellRoundedActualDurations`・`workingDaysOfActualDuration`・`NO_RECURRENCE`・`ImportRun.roundedActualDurationCount`（CR-710 が分の数えへ移した）。
今日の木で足された宣言: `CARRIED_NAMESPACE`・`withSourceNamespace`（EX-15）、`STOP_COUNTED_FROM`・`writtenStop`・`minutesOfActualDuration`（FR-011）、`absentLeaf`・`WHOLE_UNITS`・`ONE_OCCURRENCE`・`ENDS_BY_FINISH_DATE`（CR-654）、`timeColumn`・`DEFAULT_*_TIME`・`writtenProjectColumns`（CR-646）、`WORKING_TIMES`・`workingTimesOf`・`consumedWithWorkingTimes`・`writtenWorkingTimes`（CR-710）。

### 1.3 読み手（ファイルの外）

方法: `grep -rn "from './mspdi-codec'\|document-codec/mspdi-codec'" src tests`（複数行の import は `grep -z` で平らにして名を数えた）。

| 読み手 | 名 |
| --- | --- |
| `document-codec.ts`（PI-20 の公開入口） | `withoutLeadingByteOrderMark`、`documentFromMspdi`・`mspdiFromDocument`、型 `MspdiDecoding`・`MspdiEncoding`・`MspdiFault`・`MspdiNotice` |
| `json-codec.ts` | `isObject`・`mspdiVersionOfCarried`・`withoutLeadingByteOrderMark` |
| `grs-json-schema.ts` | `isObject` |
| `mspdi-fade-frames.ts` | `PATHS`・`childOf`・`integerColumn`・`leaf`・`notice`・`textColumn`・`wholeNumberOf`・型 `ExportRun` |
| tests（16 本） | `documentFromMspdi`（13）・`mspdiFromDocument`（10）・`MSPDI_NAMESPACE`（5）・型 4 つ |

⇒ 外から読まれる名は**すべて入口に残る**。tests の import は 1 本も変わらない。

### 1.4 文字で読む試験

方法: `grep -rln "mspdi-codec" tests` の各ファイルで `readFileSync|?raw|readFile(` の当たりを `src/adapter/document-codec` で絞った。
⇒ **`mspdi-codec.ts` を字で読む試験は 0 本。** 当たりはどれも `startup-template.json`・`mspdi-custom-fields.json`・`exchange-formats.json`（`tests/unit/uf-36.test.ts:2493-2499` ほか）で、動かない。
検査の側: `check-literal-restatement.py:74`・`check-twin-comments.py:52` は鍵を名で持つ（「⭐ Never a file and never a line」）。`literal-restatement-baseline.txt:49` の `CALENDAR_CONSUMED` は名で引くので、`mspdi-calendars.ts` へ動いても緑のまま。`twin-comments-baseline.txt:41` は BOM の 2 つのコーデックで、`withoutLeadingByteOrderMark` は入口に残る。

### 1.5 共変（規則 04 の 6 と CR-432 の 4.1 の数え方）

方法: `node scripts/cochange580.mjs`。`mspdi-codec.ts` に触れた直近 80 件（実際は merge を除く 38 件）について、`git diff -U0 <c>^ <c>` の各行を、その版を `parseAst` で読んだ頂上の宣言の範囲へ写した。除いたもの: 誕生と半分以上を書き換えた commit（`1d0412b17`・`4715c3165`）、コメントだけの差分（5 件）、CR-554 の移し M1〜M4（`108e2c0f1`・`8e8a018e8`・`5076f77f7`・`225314c26`）、いま別のファイルに居る名（`mspdi-xml` ほか）への当たり。残り 25 件。閾値は CR-432 の S2: 0.5 を超え、かつ小さい側が 5 件以上で拒む。入口（残る元のファイル）との共変は拒む理由にしない。

| 組 | 両方 ／ 小さい側 | 判定 |
| --- | --- | --- |
| 読み 〜 書き（別の数え方: `cochange-rw.mjs`） | 12 ／ 15 = 0.80 | **拒む** ⇒ 読みと書きでは割らない（CR ③-1 を今日の木でも再現） |
| 実績の長さ 〜 タスク | 6 ／ 8 = 0.75 | **拒む**（下で JDG-681 により割る） |
| 控え 〜 タスク | 2 ／ 2 | 証拠なし（下限 5 未満） |
| 暦 〜 担当者・割当・タスク | 2/2・3/4・3/4 | 証拠なし |
| 担当者 〜 割当・タスク | 2/2・2/2 | 証拠なし |
| 割当 〜 タスク | 3 ／ 4 | 証拠なし |
| 実績の長さ 〜 暦・担当者・割当、控え 〜 実績の長さ | 1/4・0/2・0/4・0/2 | 証拠なし（いちばん低い） |
| 入口 〜 各集まり | 0.50〜1.00 | 拒む理由にしない（残る元のファイル） |

改名だけの commit 4 件（CR-708・769・771・792）を更に除いても、実績の長さ 〜 タスクは 6 ／ 8 のまま（`SKIP=... node cochange.mjs`）。

**実績の長さ 〜 タスク 0.75 を JDG-681 で割る理由**: 共有した 6 件（`a60213f33`・`091204300`・`70cc21007`・`4d00e69a3`・`f4ff49460`・`b41e412d5`）でタスクの側が変えたのは、ほぼ `writtenTask` の葉の並び（新しい葉の呼び出しを 1 行足す）と `writtenConstraintOfGrs`（`durationOfMinutes` の呼び）である。後者は G33 の畳みで `Schedule` へ出る。
読む側の `withStopsFromActualDurations` は入口が文書全体に 1 度だけ呼び（`:398`）、暦（`workingCalendarOf(schedule)`）を要するので、タスクを読む歩きの段ではない。`FR-011` の数え方の変更はこの集まりだけを書き換える。⇒ R2.2a の段 4 で別の変更理由が挙がる。加えて `DFC-1057` が「2 つのコーデックが 1 本を呼ぶ」置き場を `DocumentCodec` の中に求めており、独立したファイルがその家になる。

### 1.6 MSPDI のスキーマを読む試験（作業木ではスキップ）

方法: `cat tests/fixtures/mspdi-xsd.json`。読み手 13 本（`tests/unit/uf-36.test.ts` 162 件を含む）は、`docs/reference/mspdi/**` の無い作業木では `vitest.config.ts` が外し、`tests/contract/mspdi-xsd-local-only.test.ts` が理由を名乗ってスキップとして数える（JDG-644）。`tools/gate/run-gate.mjs` は作業木では止まる。
⇒ ⛔ スキーマは写さない。根の作業木（`docs/reference/mspdi/pj12`・`pj15` が在る、`ls ../../../docs/reference/mspdi` で確認）で前に立つ者が回す（5 節の出口）。

---

## 2. ユニットの表

形はすべて「そのまま移す」。閉包は無い（頂上の関数だけ）ので (F)・(M) は要らない。
行は「移す範囲の和 ＋ 見出し 4 行と空行 1 行 ＋ 取り込みの見込み」。取り込みの行は見込みであり、波で実測する。

| 行 ID（仮） | ファイル | 責務文（T-075 の形）と R2.2a の畳み | 中身 | 見込みの行 |
| --- | --- | --- | --- | --: |
| `UF-36`（残る） | `mspdi-codec.ts`（入口） | 下の 4 節の新しい文。主の句「`MSPDI` の `Project` 要素と文書を相互に写す」。要約タスク（`MR-4`・`EX-5`）は「`MSPDI` がプロジェクトを表すもう 1 つの形」として (b)、版（`EX-1`・`AT-143`）は `Project.sourceFormat` の値として (b)、`Project` に作る値（`DV-1`〜`DV-3`・`DV-12`）と名前空間（`EX-15`）は (b)、文書の組み立て（集まりを兄弟に問い、`uidHighWaterMark` を合わせる）は (a)、兄弟への委ね・語彙・公開の入口と型は (c) | 上の表の「入口に残す」 | ≈ 535（552 − import の減り ≈ 11 − D-a ≈ 4 ＋ 兄弟 6 つの import ≈ 0） |
| `UF-p1` | `mspdi-carry.ts`（新） | 「要素の子のうち文書が読まないものを、葉は `carry` に、子を持つ要素は届いた順の番号と共に `carryElements` に控える（`DF-3`・`RS-60`） —— 同じ名の葉は最初を取り、残りの数を数える（`MR-3`）」。`carriedElement` の再帰は (a)、`keepFirstLeaf`・`duplicateLeafCount` は (c) | `CarrySplit` `carrySplit` `carriedElement` `keepFirstLeaf` `duplicateLeafCount` | ≈ 62 |
| `UF-154`（育つ） | `mspdi-child-placement.ts`（既存 186） | 文に「集まりの中の持ち回った行」を足す（4 節）。`splicedCarriedRows` は既存の「持ち回った子を届いた順で戻し」の範囲 (b) —— 集まりの行はその集まりの要素の子である | 既存 ＋ `splicedCarriedRows` | ≈ 205（186 ＋ 17 ＋ import 2） |
| `UF-p2` | `mspdi-actual-durations.ts`（新） | 「`MSPDI` の実績の長さ（`ActualDuration`）と、文書の停止日（`stop`）を相互に写す（`FR-011`・`AT-141`・表 T-019） —— 読むときは長さを文書の暦で進めて停止日を置き、長さが読めない・数えられないときは告げ、書くときは日時から実績の長さを作り（表 T-059 の `DV-11`）、元の長さを持ち回っているあいだは停止日を書かない」。読み・書きの半分は「相互に」の (b)、告知と `STOP_COUNTED_FROM` の保持は (c)、`minutesOfDuration` は `minutesOfActualDuration` の段 (a) | `STOP_COUNTED_FROM` `minutesOfDuration` `withStopsFromActualDurations` `minutesOfActualDuration` `writtenStop` `writtenActualDuration` | ≈ 100（85 ＋ 5 ＋ import ≈ 12 − E04 で 2） |
| `UF-p3` | `mspdi-calendars.ts`（新） | 「`MSPDI` の `Calendar` 要素を、子の `WeekDay`・`Exception`・`WorkingTime` と共に、文書の暦へ相互に写す（`AT-158`〜`AT-162`） —— 繰り返す例外日は実の日付へ広げずに告げ、書くときは一度きりの例外日に読み手が要る 2 つの葉を補う（表 T-059 の `DV-13`・`DV-14`、`EX-13`）」。`WeekDay`・`Exception` は子として (b)、告知と補いは (c) | 上の表の「暦」＋ D-a の `writtenCalendars` | ≈ 233（209 ＋ 5 ＋ import ≈ 12 ＋ 7） |
| `UF-p4` | `mspdi-resources.ts`（新） | 「`MSPDI` の `Resource` 要素と、文書の担当者を相互に写す —— `UID` の無い行と空の行は原形のまま控え、書き出すときに `ID` を振り直す（表 T-059 の `DV-10`）」。控えと振り直しは (c)・(b) | 上の表の「担当者」 | ≈ 75 |
| `UF-p5` | `mspdi-assignments.ts`（新） | 「`MSPDI` の `Assignment` 要素と、文書の割当を相互に写す —— プロジェクトの要約タスクを指す行と `UID` の無い行は原形のまま控え（`MR-4`）、書くとき `Units` が無ければ補う（表 T-059 の `DV-15`、`EX-14`）」 | 上の表の「割当」＋ D-a の `writtenAssignments` | ≈ 79 |
| `UF-p6` | `mspdi-tasks.ts`（新） | 「`MSPDI` の `Task` 要素を、子の `PredecessorLink` と共に、文書のタスクと依存へ相互に写す —— アウトラインの段から WBS の親と並びを読み（`FR-021`）、書くときは WBS の順に並べて `ID`・`OutlineLevel`・`OutlineNumber`・`Summary` を作り（表 T-059 の `DV-4`〜`DV-7`）、`GRS` が作った文書のタスクには制約の 2 列と予定の長さを書く（`EX-11`・`EX-12`・`DV-8`）。<br>フェード日数の値は `mspdi-fade-frames.ts` に、実績の長さと停止日は `mspdi-actual-durations.ts` に問う」。依存は `Task` の子として (b)、WBS の値と制約は (b)、委ねは (c) | 上の表の「タスク」 | ≈ 397（367 ＋ 5 ＋ import ≈ 25） |

**入口は ≈ 535 行**（< 1,000、目安の 850 を大きく下回る）。どの兄弟も 1,000 を超えない（最大 `mspdi-tasks.ts` ≈ 397）。
入口が 501〜1,000 に残るが、責務は「`Project` 要素と文書」の 1 つで、ほかは (a)〜(c) に畳める（上）。⇒ JDG-695 の後段（2 つ以上の責務のときだけ割る）に当たらない。

**名の点検（R2.1・R2.14・JDG-820）**:
- どれも「`mspdi-` ＋ 交換相手の集まり（複数形）」か、中身の名詞（`carry`・`actual-durations`）。`-and-`・`Manager`・`Helper`・`Utils` なし。
- 近い名: `src` に `*duration*`・`*carry*`・`*assignment*` のファイルは無い。`edit-calendar.ts`・`calendar-day.ts`・`working-calendar.ts`・`resource-list.ts`・`edit-resource.ts` は別のフォルダの別の意味で、`mspdi-` の頭で分かれる（`find src -name "*.ts" | grep -i "duration\|calendar\|resource\|assignment\|carry"`）。
- `mspdi-resources.ts` に割当を含めない（CR の 2.3 の退けた案のとおり。別の集まり `Project/Assignments` を隠す）。
- `mspdi-actual-durations.ts`: CR の仮の名 `mspdi-durations.ts` を改めた。G33 の畳みで `Duration` の綴りは `Schedule` へ出て、残る中身は `ActualDuration` と `Stop` だけなので、`durations` は中身より広いことを言う。
- 新しい関数 `writtenCalendars`・`writtenAssignments` は既存の `writtenTasks`・`writtenResources` と同じ形（POLA）。

**CR ③-5 からの変更**: `splicedCarriedRows` を `mspdi-carry.ts` ではなく `mspdi-child-placement.ts` に置く。
- 理由: `UF-154` の文が既に「持ち回った子を届いた順で戻し」を持つ。集まりの行を戻すのも同じ仕事であり、`writtenCarriedElement`（child-placement）を呼ぶ。2 つのファイルが「持ち回ったものはどこで戻るか」（`UD-5`）に答えるのを避ける（R2.21）。CR の 4 節の 1 が「`mspdi-carry.ts` と `UF-154` の重なり」を確かめよと残していた問いへの答えである。
- 代償: child-placement が入口から `CARRIED_ROW_PATHS`・`PATHS` を関数の中で読むので、入口 ↔ child-placement の実行時の輪が 1 つ増える（下の輪の項）。

**輪と TDZ（全波に掛かる）**:
- `UT-17` の逐語「`MSPDI` の兄弟が共有する要素の木の語彙（要素の道・葉の読み書き・告知）は公開エントリに置いた」と CR ③-3 に従い、語彙は入口に残る。⇒ 兄弟 6 つと child-placement は入口から実行時の名を取り込み、入口は兄弟を取り込む（輪）。既存の `mspdi-fade-frames.ts` ↔ 入口、`grs-json-schema.ts` ↔ 入口と同じ形である。
- TDZ が起きないことの根拠: 兄弟の頂上の `const` はどれも字の並びだけ（`*_CONSUMED`・`WORKING_TIMES`・`ONE_OCCURRENCE`・`ENDS_BY_FINISH_DATE`・`WHOLE_UNITS`・`STOP_COUNTED_FROM`・`CONSTRAINT_LEAVES`）。child-placement の `PARENT_ORDERS` は JSON だけを読む。入口の頂上で別のモジュールの束縛を読むものは無い（`CARRIED_ROW_PATHS` は自分の `PATHS` だけ）。⇒ どの順で評価されても、初期化の時に未初期化の束縛を読まない。
- ⚠️ 共通の指示書の「兄弟は入口を取り込まない（型だけは可）」とは食い違う。7 節の問い 1 に置いた。
- 波ごとの機械の確かめ: 各兄弟について、頂上の `const`／`let` の初期化式に、入口・別の兄弟が頂上で宣言する名が現れないことを `parseAst` で数え、0 を出口にする。

**公開の名は増やさない**: `document-codec.ts`（PI-20）は変わらない。入口が新しく `export` する名（ファイルの内側だけ）: `booleanColumn` `isTrue` `optionalLeaf` `absentLeaf` `collection` `withoutLeaves` `isProjectSummary` `summaryTargetOf`、型 `SummaryTarget` `ImportRun`。`docs/review/public-entry-index.md` には「file only」として刷られる（`npm run gen` で作り直す）。

---

## 3. DFC-1073 の群

方法: 台帳の file:line を今日の木で読み直した（`grep -n` と `sed -n`）。値が変わるかは、両方の本体を読み比べ、分岐と投げ方の違いを数えた。

| 群 | 今日もあるか（新しい file:line） | 畳むか | 持ち主 | T-064（PI-1）の名 | 波 |
| --- | --- | --- | --- | --- | --- |
| G33 前半 | ある。`mspdi-codec.ts:180-185` `durationOfMinutes` ＝ `task-plan-actual.ts:287-292` `durationText`（本体が 1 字も違わない） | **畳む**（値は変わらない） | `src/entity/document-model/schedule/calendar-day.ts`（7 節の問い 2。代わりは `working-calendar.ts`） | **足す: `durationTextOfMinutes`**（`schedule.ts` の `./calendar-day` の再出しに 1 行） | W1 |
| G33 後半 | **もう無い**。`minutesPerWorkingDay`／`minutesPerDayOf` は CR-710 で消え、使う側は公開済みの `minutesPerWorkingDayOf` を読む | — | — | — | — |
| G34 | ある。`mspdi-codec.ts:1208-1239`（`CONSTRAINT_LEAVES`・`MUST_START_ON`・`writtenConstraintOfGrs`）と `task-plan-actual.ts:230-261`（`CARRIED_PLAN_LEAVES`・`MUST_START_ON`・`datedPlanOf`・`pinnedToStart`） | **核は畳まない**（値が変わる）。`Duration` の綴りだけは G33 で 1 か所になる。予定の長さは既に公開の `plannedDurationMinutesOf` を両方が読む | `DFC-1063` に残す | なし | — |
| | 値が変わる根拠: 書き出しは長さの数えが投げれば告げて制約の 2 葉だけを返し（`:1229-1238`）、`Duration` を持ち回っていれば長さを書かない（`:1228`）。編集は投げても捕まえず（`task-plan-actual.ts:243-249`、`DFC-1063` の再現どおり `DaySpanTooWide` で止まる）、3 つの葉を常に置き換える（`:255-261`）。`sourceFormat` での分け方（書き出しは `grs` だけに書く／編集は `grs` なら外し、ほかは置く）は両側の WHY が言う意図である。⇒ 1 本の `startPinOf` にするには投げたときの答えを 1 つに決めねばならず、それは `DFC-1063` の判断である | | | | |
| G37(b) | ある。`mspdi-codec.ts:384-390` `Math.max(...spread)` | 畳まない（20 万行で `RangeError` が消える＝値が変わる） | `DFC-1066` | なし | — |
| E04 | ある。`mspdi-codec.ts:1267-1271`（`actualInstantsOf` ＋ `actualMinutesOf`）＝ `properties-panel.ts:405-409` `actualLengthTextInTime` の同じ組 ＝ `working-calendar.ts:697` の `workingTimeCounterOf(...).actualLengthMinutes`（`percent-complete.ts` は CR-710 の後この数え手を使うので、もう写しではない） | **畳む**（値は変わらない） | 既存の `working-calendar.ts` の `workingTimeCounterOf`（PI-1 に公開済み） | **足さない**（既存の `workingTimeCounterOf` を使う。7 節の問い 2 の (b) で `actualLengthMinutesOf` を足す案も挙げた） | W1 |
| | 値が同じ根拠: 数え手の `lengthOf` は `ends[1] === ends[0] ? 0 : actualMinutesAt(index, …)`、`actualMinutesOf` は `end === start ? 0 : actualMinutesAt(timeIndexOf(within), …)`（`working-calendar.ts:665-667`・`:688-697`）。端の読みは両方とも `instantOnSideOver(() => timeIndexOf(within))`（`:391-407`）。`timeIndexOf`・`indexOfCalendar`・`instantOnSideOver` は投げない（`throw` の 10 か所はどれも日の歩きの中、`grep -n "throw " working-calendar.ts`）。⇒ 書き出しの `try` の中へ端の読みが入っても、捕まえる例外は増えない。投げ方の違い（パネルは捕まえない）は `DFC-1063` のまま | | | | |
| E07 | ある。`mspdi-codec.ts:1120-1137` `taskDepths`（親の表を歩く、手数をタスク数で縛る）と `mspdi-imported-task-groups.ts:23-26`（ファイルの順に親の深さ ＋ 1） | **畳まない**（値が変わる）。UID が重なると 2 つの答えが割れる（調査の再現: `taskDepths` {1:4,2:4} ／ 取り込みの行 {1:3,2:2}）。どちらへ寄せても片方の答えが変わる | `DFC-922`（と `JDG-78` の後の `DFC-586`） | なし | — |
| H07 | ある。`mspdi-codec.ts:662-695` `withStopsFromActualDurations` と `json-codec.ts:321` `withStopsFromOlderLengths`（呼び `:388`） | 畳まない（JSON の拒みが告げるに変わる＝値が変わる） | `DFC-1057`。⭐ 本書が作る `mspdi-actual-durations.ts` がその 1 本の家になる | なし | — |
| G02（延長） | **もう無い**。`latestTaskFinish`（`:1029-1042`）は `instantOnSide` の分で比べ、手の鍵は消えた | — | — | — | — |
| G04（延長） | ある。`mspdi-codec.ts:1065-1097` `tasksInWbsOrder`（明示のスタック）と `taskGroupRankById`（`schedule-invariants.ts:152`・`input-command-translator.ts:1402`、再帰） | 本書では畳まない。歩きを `Task` と `TaskGroup` の両方へ一般化するのは新しい関数で、深い木での再帰の溢れ（投げる／投げない）が変わる。`taskGroupRankById` の 1 本化は CR-579 の分 | 後の変更要求（`PND-420`・`DFC-262` と共に） | なし | — |
| G38 | 台帳が写しではないと判じた | — | — | — | — |

**本書で足す PI-1 の名は 1 つ**: `durationTextOfMinutes`。
- 持ち主のファイル: `src/entity/document-model/schedule/calendar-day.ts`（問い 2 の推奨）。
- 本体（`durationOfMinutes` と同じ字）: `const whole = Math.max(0, Math.round(minutes)); return \`PT${Math.floor(whole / 60)}H${whole % 60}M0S\``。前に `// see EX-9` と `/** @purity pure */`。
- 呼び手が切り替わる所:
  - `mspdi-codec.ts:1231`（波 W7 の後は `mspdi-tasks.ts` の `writtenConstraintOfGrs`）
  - `mspdi-codec.ts:1271`（W3 の後は `mspdi-actual-durations.ts` の `writtenActualDuration`）
  - `task-plan-actual.ts:248`（`datedPlanOf`）
- 消すもの: `mspdi-codec.ts:180-185`・`task-plan-actual.ts:287-292`。

**E04 の呼び手が切り替わる所**（新しい名なし）:
- `mspdi-codec.ts:1267-1271` → `workingTimeCounterOf(within).actualLengthMinutes(task)`（`null` なら `[]`。`actualInstantsOf`・`actualMinutesOf` の import が消える）。
- `src/adapter/screen-renderer/properties-panel.ts:405-409` → 同じ式（`null` なら `textOfValue(null)`）。

---

## 4. 仕様の書き換え（`docs/spec/05-07-design.md`）

### 4.1 表 T-075

**`UF-36`**（`:482`）
- 旧: 「`MSPDI` の要素の木と文書を、列ごとに相互に写す（`FR-021`・`FR-057`） —— 読まない子を `carry` に控えて書くとき元の位置へ戻し（`DF-3`・`MR-3`・`RS-60`）、プロジェクトの要約タスクを `Task` にせず原形のまま控え（`MR-4`・`EX-5`）、版を判じ（`EX-1`・`AT-143`）、書き出すときに作る値を作り（表 T-059）、実績の長さを停止日に直し（`FR-011`・`AT-141`）、制約の 2 列を写す（`EX-11`・`EX-12`）。<br>XML の文字列と要素の木の変換は `mspdi-xml.ts` に、書き出す要素の子の並び（`EX-10`）は `mspdi-child-placement.ts` に、フェード日数と拡張領域の枠（`EX-6`・`EX-8`）は `mspdi-fade-frames.ts` に、取り込んだタスクのタスクグループと所属（`FR-058`）は `mspdi-imported-task-groups.ts` に問う。<br>兄弟が使う要素の木の語彙と、外へ見せる入口と型を持ち、外れの型を出し直す」
- 新: 「`MSPDI` の `Project` 要素と文書を相互に写し、文書を組み立てる（`FR-021`・`FR-057`） —— プロジェクトの要約タスクを `Task` にせず原形のまま控え（`MR-4`・`EX-5`）、版を判じ（`EX-1`・`AT-143`）、取り込み元の名前空間を控え（`EX-15`）、`Project` に書き出すときに作る値を作る（表 T-059 の `DV-1`〜`DV-3`・`DV-12`）。<br>`Calendar`・`Task`・`Resource`・`Assignment` の要素は `mspdi-calendars.ts`・`mspdi-tasks.ts`・`mspdi-resources.ts`・`mspdi-assignments.ts` に、読まない子を控えるのは `mspdi-carry.ts` に、実績の長さと停止日は `mspdi-actual-durations.ts` に、XML の文字列と要素の木の変換は `mspdi-xml.ts` に、書き出す要素の子の並びと持ち回った子と行の戻し（`EX-10`・`DF-3`）は `mspdi-child-placement.ts` に、フェード日数と拡張領域の枠（`EX-6`・`EX-8`）は `mspdi-fade-frames.ts` に、取り込んだタスクのタスクグループと所属（`FR-058`）は `mspdi-imported-task-groups.ts` に問う。<br>兄弟が使う要素の木の語彙と要約タスクの判じ、外へ見せる入口と型を持ち、外れの型を出し直す」
- 「負う要求」は `FR-021`（`OW-2`）・`FR-057`（`OW-1`）のまま。
- 波ごとに、その波が出した集まりの句を「…に問う」の列へ移す（W2: 控え、W3: 実績の長さ、W4: 暦、W5: 担当者、W6: 割当、W7: タスクと制約）。

**`UF-154`**（`:484`）
- 旧: 「… —— 持ち回った子を届いた順で戻し、宣言の無い子を宣言された隣に付ける。…」
- 新: 「… —— 持ち回った子と、集まりの中の持ち回った行（`DF-3`）を届いた順で戻し、宣言の無い子を宣言された隣に付ける。…」（W2）

**`UF-170`**（`calendar-day.ts`、`:385`）
- 旧: 「暦の日付（`CalendarDay`）を字と相互に変え、比べ、日の番号で数える（`EX-2`・`EX-7`・`FD-6`）。…」
- 新: 「暦の日付（`CalendarDay`）を字と相互に変え、比べ、日の番号で数え（`EX-2`・`EX-7`・`FD-6`）、時間の量（分）を交換の綴り `PTnHnMnS`（`EX-9`）で書く。…」（W1。問い 2 で `working-calendar.ts` を選ぶなら、代わりに `UF-128` の「予定の長さ（`DV-8`）を数えるのも本ユニットだけである」に「その長さを交換の綴り（`EX-9`）で書くのも」を足す）
- ファイルの見出し（`calendar-day.ts:1`）も「… their text form, their order and their numbers, and the exchange text of a length in minutes.」へ。

**新しい行**（W2〜W7、各 1 行、層 Adapter、コンポーネント `DocumentCodec`、`pure`、負う要求 —）: 2 節の表の `UF-p1`〜`UF-p6` の責務文をそのまま。

### 4.2 表 T-063 `UT-17`（`:345`）

- ファイルの列: `mspdi-imported-task-groups.ts` の後に ／ `mspdi-carry.ts` ／ `mspdi-actual-durations.ts` ／ `mspdi-calendars.ts` ／ `mspdi-resources.ts` ／ `mspdi-assignments.ts` ／ `mspdi-tasks.ts` を足す（波ごとに 1 つ）。
- 理由の欄に足す文: 「`MSPDI` の集まりごとの写しは、交換相手のスキーマのその集まり（`Calendar`・`Task`・`Resource`・`Assignment`）の列が、読まない子を控える規則は `DF-3`・`MR-3` が、実績の長さと停止日の換算は `FR-011`・`AT-141` が変わったときに書き直す」。
- 語彙の文: 「`MSPDI` の兄弟が共有する要素の木の語彙（要素の道・葉の読み書き・告知）は公開エントリに置いた」→「… 語彙（要素の道・葉の読み書き・告知）と、プロジェクトの要約タスクの判じ（`MR-4`）は公開エントリに置いた」（W5/W6/W7 で `summaryTargetOf` を兄弟が読み始める W6 に当てる）。

### 4.3 表 T-074 `SU-3`（`:246`）

- 今日 185。本書で ＋6（`mspdi-carry`・`mspdi-actual-durations`・`mspdi-calendars`・`mspdi-resources`・`mspdi-assignments`・`mspdi-tasks`）。CR-578・CR-579 の後の数から波ごとに 1 ずつ上げる。
- 数を書く所: `SU-3` の 1 か所だけ（`grep -rn "SU-3" tools .claude/skills tests docs/spec`）。`tests/contract/units.contract.test.ts:23` は `statedCount('SU-3')` で読み、`audit-ch5.py`（検査 33）は T-075 と突き合わせる。⇒ 試験の字は変えない。

### 4.4 表 T-064（`docs/spec/_source/published-entries.json` の `PI-1`）

- W1 で 1 メンバを足す: `durationTextOfMinutes`、note「時間の量（分）を `EX-9` の綴り `PTnHnMnS` で書く。」「`MSPDI` の書き出しと日付の編集（`EX-12` の `ManualDuration`・`Duration`）が同じ 1 本を読む」。
- `npm run gen` で `_assets/tbl-published-entries.md` と `docs/review/public-entry-index.md` を作り直す（全波。兄弟の `export` が index の「file only」に刷られるので、どの波も `gen:check` が要る）。

### 4.5 ほかに直す文

- CR-580 本文そのもの（数・file:line・2.3 の表・4 節・6 節）。前に立つ者が書き直す。⚠️ 帯 `JDG-696`〜`JDG-699`・`DFC-1046`〜`DFC-1050` の「どれも未使用」は今日も成り立つか検査 62 が測り直す。
- `docs/development-records/defects.md` の `DFC-1073` の対応の欄: G33・E04 を畳んだ、G34・G37(b)・E07・H07・G04 は各行へ、G02 は消えた、を記す。

---

## 5. 波（1 波 1 コミット、順に。割る体は同時に 1 体だけ）

順の理由: 畳み（Schedule と呼び手）を先に置き、次に皆が呼ぶ側（控え・実績の長さ）、最後にタスク（いちばん大きく、実績の長さとフェードを呼ぶ）。暦・担当者・割当は互いに独立。

| 波 | 動くもの | 再出し・新しい export | 同じコミットの仕様と台帳 | 危うさ |
| --- | --- | --- | --- | --- |
| W0 | 照合器（木に書かない。分割前の木だけを読む別の体） | — | — | 下の「照合器」 |
| W1 | G33: `durationTextOfMinutes` を `calendar-day.ts` へ。`mspdi-codec.ts:180-185`・`task-plan-actual.ts:287-292` を消し、3 つの呼びを切り替える。E04: `mspdi-codec.ts:1267-1271`・`properties-panel.ts:405-409` を数え手へ | `schedule.ts` の `./calendar-day` の再出しに `durationTextOfMinutes` | `UF-170`、`PI-1` の 1 メンバ、`npm run gen` | CR-579 が `calendar-day.ts`（`serial`→改名）と `schedule.ts` の同じ再出しの塊を書き換える ⇒ CR-579 の後に当てる |
| W2 | `mspdi-carry.ts`（`CarrySplit` ほか 5）。`splicedCarriedRows` を `mspdi-child-placement.ts` へ | 入口は `carrySplit`・`carriedElement`・`duplicateLeafCount` を取り込む。child-placement は入口から `CARRIED_ROW_PATHS`（新しく export）と `PATHS` を関数の中で読む | `UF-p1` の行、`UF-36`・`UF-154` の文、`UT-17` の列、`SU-3` ＋1 | child-placement に初めて実行時の輪。TDZ の確かめ（2 節） |
| W3 | `mspdi-actual-durations.ts` | 入口は `withStopsFromActualDurations`、タスク（まだ入口）は `STOP_COUNTED_FROM`・`writtenStop`・`writtenActualDuration` を取り込む | `UF-p2`、`UF-36`、`UT-17`、`SU-3` ＋1 | `writtenTask` の `withoutLeaves(task.carry, [STOP_COUNTED_FROM])` が別のファイルの名を読む |
| W4 | `mspdi-calendars.ts` ＋ D-a（`writtenCalendars(schedule)` を足し、`writtenProjectChildren` の `:989-991` を呼びに替える。`:988` の TRAP は入口の長さの試しの上に残す） | 入口が `optionalLeaf`・`absentLeaf`・`collection`・`booleanColumn` を export | `UF-p3`、`UF-36`、`UT-17`、`SU-3` ＋1 | `literal-restatement-baseline.txt:49` の `CALENDAR_CONSUMED` は名で引く（緑のはず） |
| W5 | `mspdi-resources.ts` | — | `UF-p4`、`UF-36`、`UT-17`、`SU-3` ＋1 | — |
| W6 | `mspdi-assignments.ts` ＋ D-a（`writtenAssignments(schedule)`、`:997-999`） | 入口が `summaryTargetOf`・型 `SummaryTarget`・型 `ImportRun` を export | `UF-p5`、`UF-36`、`UT-17`（要約タスクの判じの文）、`SU-3` ＋1 | — |
| W7 | `mspdi-tasks.ts` | 入口が `isProjectSummary`・`isTrue`・`withoutLeaves` を export | `UF-p6`、`UF-36` の最終の文、`UT-17`、`SU-3` ＋1、`function-size-baseline.txt:72` の鍵を `mspdi-tasks.ts::tasksInWbsOrder` へ付け替え（数は同じ。JDG-520 の下で前に立つ者が当てる） | 輪がいちばん太い（入口・fade-frames・actual-durations・carry・child-placement） |

**呼びの順は変わらない**: `scheduleFromRoot` の暦 → タスク → 担当者 → 割当（告知の並びが同じ）、`writtenProjectChildren` の暦 → タスク → 担当者 → 割当、`withStopsFromActualDurations` は最後。

**許す字の違い**（照合器の 1 段目が受け入れるもの。ほかはすべて失敗）:
- D-a: `writtenCalendars`・`writtenAssignments` の 2 本と、入口の 2 つの呼び。
- D-b: `export` の語と import の文。
- D-c（G33）: `durationOfMinutes(`・`durationText(` → `durationTextOfMinutes(`、消える 2 つの写し。
- D-d（E04）: `writtenActualDuration` と `actualLengthTextInTime` の、数え手を呼ぶ 2〜3 行。

### 照合器（W0。CR の 5 節の 3 段を、今日の入力で）

- 「前」: `git archive <W1 の直前の sha> src` を scratchpad へ出し、非公開の関数にだけ `export` を足した写し。⚠️ 直前の sha は CR-578・CR-579 が着地した後のもの（`calendar-day.ts` の名が CR-579 で変わるため）。
- 入力（スキーマ無しで作れるもの）:
  - `sample-schedule/*.xml` の 6 本、`tests/fixtures/cr-651-large-sample-before-cr-790.ja.xml`
  - `sample-schedule/Three-Year Product Plan.json`・`src/framework/single-html-shell/startup-template.json`・`empty-document.json` を書き出して読み直したもの
  - 手で作る境界の入力: 繰り返す葉、宣言の無い子、`UID` の無い `Calendar`／`Task`／`Resource`／`Assignment`、`IsNull` の行、要約タスクとそれを指す割当と依存、`ActualDuration` の読めない字と数えられない長さ、`pj15` だけの子、名前空間の無い根、BOM
  - ⚠️ `tests/unit/cr-429-mspdi-fixtures.ts` はスキーマを読む（`mspdi-xsd-local-only.test.ts` の印）ので、作業木では使えない。
- 比べるもの: 各入力の `documentFromMspdi` の JSON、`mspdiFromDocument(doc, 固定の lastSaved)` の字、告知の列、`duplicateLeaves` の sha256。
  - 動かす非公開の関数ごとの値: `carrySplit`・`splicedCarriedRows`・`withStopsFromActualDurations`・`writtenStop`・`outlineNumbers`・`taskDepths`・`tasksInWbsOrder` ほか。
  - W1 の畳みのために、全見本の全タスクで:
    - `writtenActualDuration` の前後
    - `properties-panel.ts` の `actualLengthTextInTime`（写しで export）の前後
    - `task-plan-actual.ts` の `planDatesEdited` の前後
    - `actualMinutesOf(within, ...actualInstantsOf(within, t))` と `workingTimeCounterOf(within).actualLengthMinutes(t)` の突き合わせ（日付だけ、端が同じ瞬間、逆向き、未着手のタスクを足す）
- 感度: 動かす兄弟ごとに 1 か所以上、計 10 件以上をわざと壊し、すべて赤になってから使う。照合器自身の網羅（文・分岐・関数）を報告させる。

### 各波の出口

作業木で（割る体の後に前に立つ者が回し直す）:
- 照合器のバイト一致
- `node ../../../node_modules/typescript/bin/tsc --noEmit`、`npm run gen:check`
- `node tools/gate/gate-queue.mjs run -- node ../../../node_modules/vitest/vitest.mjs run`。スキーマの読み手 13 本はスキップと名乗る（期待どおり）。とくに次が緑であること: `cr-376`・`cr-404`・`cr-567`・`cr-569`・`cr-577`・`cr-608`・`cr-618`・`cr-645`・`cr-646`・`cr-651`・`cr-716`・`cr-788`・`dfc-1224`・`dfc-294`・`fr-021` と、`properties-panel`・`task-plan-actual` の試験。
- `rm -rf output && .claude/skills/spec-graph-check/check.sh`（終了コードと最後の行 `red:` で判じる）

根の作業木で（前に立つ者・調整役。JDG-644）:
- スキーマを読む 13 本（`tests/fixtures/mspdi-xsd.json` の `readers`、`uf-36.test.ts` の 162 件を含む）を、W7 の後に 1 度、合流した木で回す。
- 可能なら W4 の後にも 1 度（中ほどで赤を早く拾うため）。
- 赤が出たら、同じ木で `src` を W1 の直前の sha へ戻して同じ試験を走らせ、分割のせいかを分ける（割る波の手順の 6）。
- GT-2 の判定は根で読む。

---

## 6. 検査の見込み

| 検査 | 見込み | 根拠・方法 |
| --- | --- | --- |
| 60（関数の大きさ） | 上がらない。W7 で `tasksInWbsOrder`（31/16）の鍵を付け替えるだけ。新しい関数は `writtenCalendars`・`writtenAssignments`（各 ≈ 5 行、分岐 0）。`writtenProjectChildren`（39 行、帯 50 の下）は D-a で約 4 行減る。`writtenActualDuration`・`actualLengthTextInTime` は E04 で減る | `LINE_BAND = 50`・`BRANCH_BAND = 15`（`check-function-size.py:150-151`） |
| 55（コメント密度 10%） | 緑。100 コード行以上で各ファイルに掛かる。入口 コード 426 ／ コメント 42（上限 47）、暦 181 ／ 8（20）、タスク 318 ／ 19（35）。控え 57・実績の長さ 70・担当者 58・割当 51 コード行は 100 未満で掛からない | `units.mjs` で各ユニットの字を作り、`check-comment-rules.py` の `lex`・`is_code`・`PURITY_ONLY` で数えた（見出し 3 行を含む） |
| 45（同じ式の繰り返し） | 増えない見込み。G33・E04 の畳みで 1〜2 群減るかもしれない（74 → 下げるのは調整役、JDG-520）。`export` を足すと下限の下の写しが 20 字句を越える罠（割る波の手順の 4）があるので、`UID` の無い行を控える 4 か所（`:573-580`・`:748-755`・`:785-792`・`:824-831`）を波ごとに見る | `repeated-expressions-baseline.txt` の 1 行目 74（数で持つ） |
| 59（コンポーネントの辺） | 0。新しい辺は全部 `DocumentCodec` の中。W1 の `ScreenRenderer → Schedule`・`EditDocument → Schedule`・`DocumentCodec → Schedule` は既に在る | — |
| 19（層） | 0 | 同上 |
| 26b（公開メンバ） | W1 で `PI-1` に `durationTextOfMinutes` を同じコミットで足せば緑。兄弟の `export` は公開入口を越えない | `check-published-members.py` |
| 18・44（T-075 とファイル、仕様 ID の参照） | 新しいファイルと T-075 の行を同じコミットで足せば緑。⚠️ 見出しの `@unit UF-p1` などの仮の番号は 44 を赤くするので、前に立つ者が本当の番号（今日の最大は `UF-207`、CR-578・CR-579 の後の max+1）を割り当ててから書く | `grep -n "^| UF-" 05-07-design.md` |
| 33（第 5 章の数） | `SU-3` を波ごとに ＋1 | 4.3 |
| 61（モジュールの状態） | 0。動かす頂上の `const` はどれも書き換えられない | — |
| 62（識別子の予約） | 仮の `UF-p1`〜`UF-p6` を詰めた後に緑。CR の帯の主張は測り直し | — |
| 64・65（純粋性・単体試験か省き） | 0。動かす関数はどれも `/** @purity pure */` を持ったまま動く ⇒ 65 は `UO-1` で省ける | `check-unit-test-or-omission.py` の A の `UO-1` |
| 11（仕様の重複） | 影響なし。`dup-check.py` は `01-04-requirements.md`・用語集・設定の表しか読まない | `dup-check.py:33-37` |

---

## 7. 残る問い

**問い 1 —— 兄弟が入口を取り込む輪を受け入れるか**

場面: `mspdi-tasks.ts` などの兄弟は `childOf`・`leaf`・`PATHS` を入口から取り込み、入口は兄弟を取り込む。

| 案 | 中身 |
| --- | --- |
| (A) 推奨 | 輪を受け入れる。`UT-17` が語彙を公開エントリに置くと逐語で定め、`mspdi-fade-frames.ts`・`grs-json-schema.ts` が既にこの形。TDZ は 2 節の根拠で起きず、波ごとに機械で数える |
| (B) | 語彙だけのユニット（例 `mspdi-element-vocabulary.ts`）を作り、入口と兄弟がそこから取る。`UT-17` の文と CR-554 の 15.6.4（語彙だけのユニットを S4 で退けた）を覆す。ユニットが 1 つ増える |
| (C) | 兄弟が要る語彙を `mspdi-xml.ts` へ移す。CR の 2.3 が反証で退けた（xml と child-placement のあいだに型の輪） |

**問い 2 —— `Schedule` に足す名と置き場**

| 案 | 中身 |
| --- | --- |
| (a) 推奨 | G33: `durationTextOfMinutes` を `calendar-day.ts` に置く —— `EX-9` は `EX-7`（日時の綴り）の先例に倣った交換の字句の規則（`PND-163`）で、`calendar-day.ts` は既に `EX-2`・`EX-7` と `textOfInstant` を持つ。E04: 新しい名を足さず、公開済みの `workingTimeCounterOf(within).actualLengthMinutes(task)` を使う（R2.22「既にある処理は公開エントリから import する」） |
| (b) | E04 で `actualLengthMinutesOf(within, task)` を `working-calendar.ts` の `plannedLengthMinutesOf`（`:487`）の隣に足す（対称で読みやすい。PI-1 にもう 1 つ。台帳の仮の名 `heldActualLengthOf` は「held」が何を指すか言わないので採らない） |
| (c) | G33 を `working-calendar.ts` に置く（調査の案）。832 行の 501〜1,000 のファイルに `EX-9` の綴りという別の変更理由を足すので、JDG-695 の後段のレビューで 2 つ目の責務と読まれやすい |

**問い 3 —— なし**: G34・E07 を畳まないことは、値が変わるので共通の指示書のとおり問わずに外した（それぞれ `DFC-1063`・`DFC-922` が持つ）。

---

## 付: `schedule.ts` まわりの編集の一覧（前に立つ者が CR-579 と並べるため）

| ファイル | 編集 | 波 | CR-579 との重なり |
| --- | --- | --- | --- |
| `src/entity/document-model/schedule/schedule.ts` | `export { … } from './calendar-day'` の塊に `durationTextOfMinutes,` を 1 行（`dayOfInstant,` の次） | W1 | CR-579 が同じ塊の `serial`・`dayFromSerial` を改名する（旧本文の W1） ⇒ CR-579 の後に当てる |
| `src/entity/document-model/schedule/calendar-day.ts` | `durationTextOfMinutes` を足す（≈ 6 行）、見出しの 1 行目 | W1 | CR-579 が同じファイルで改名する |
| `docs/spec/_source/published-entries.json` の `PI-1` | メンバ 1 つ | W1 | CR-579 も `PI-1` に名を足す（旧本文: 3 つ） |
| `src/use-case/edit-document/task-plan-actual.ts` | `durationText` を消し、`datedPlanOf` の呼びを切り替え、import に 1 名 | W1 | なし |
| `src/adapter/screen-renderer/properties-panel.ts` | `actualLengthTextInTime` を数え手へ（import から `actualInstantsOf`・`actualMinutesOf` が外れ、`workingTimeCounterOf` が入る） | W1 | なし |
| `working-calendar.ts` | 変えない（問い 2 が (b) なら W1 で `actualLengthMinutesOf` を 1 本足し、`schedule.ts` の `./working-calendar` の塊にも 1 行） | — | CR-579 も触れうる |
