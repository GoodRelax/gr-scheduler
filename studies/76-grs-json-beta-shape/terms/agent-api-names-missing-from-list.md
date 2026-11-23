# 一覧に出てこない名 —— 定めの所・既決の裁定・新しい名・仕分け（AI-C のレビューの続き）

Agent API の名 2 の席が作業役に調べさせ、席が確かめた（2026-11-24、コミット 86da8f06e の木）。持ち主に問う名は GQA BGQA7 の [rev] に入れた。
出どころ: レビュー `studies/76-grs-json-beta-shape/terms/agent-api-names-ai-c-review.md` の 38〜57 行。
パスは木の根からの相対。`members` は `docs/spec/_source/agent-api-members.json`、`commands` は `docs/spec/_source/grs-commands.schema.json`、`rulings` は `docs/development-records/rulings.md`、`list` は `studies/76-grs-json-beta-shape/terms/agent-api-names-by-policy-draft.md`、`map` は `studies/76-grs-json-beta-shape/commands-map.md`、`beta` は `studies/76-grs-json-beta-shape/terms/grs-json-beta.schema.json`、`tree` は `studies/76-grs-json-beta-shape/terms/grs-json-final-review-tree.md`、`queue` は `studies/76-grs-json-beta-shape/terms/13-glossary-queue.md`、`glossary` は `studies/76-grs-json-beta-shape/terms/glossary-draft/glossary.json`。
仕分け: 既決 ＝ 裁定が決めている。方針で一つ ＝ P-1〜P-12 から名が 1 つに決まる。持ち主に問う ＝ 名の選びが残る。退く ＝ 名が無くなる。
GRS JSON β（`beta` と `tree`）は凍結済み。どの行も β を変えない。

## A. Agent API（members）

| # | 今の名（定めの所） | 何か | 既決の裁定・対応表 | 新しい名 | 仕分け |
|:---|:---|:---|:---|:---|:---|
| 1 | `AgentRefusal.target`（members:1379） | 断られた呼び出しの名。α は行 ID か規則の在りかを入れる | map:285 が `target` → `member`（道具の名）＋ `from` に分ける。list:385 は `member` を今のままの名に入れ、list:299 も `member` を使う。queue:1662（問 31-27）の `member` が同じ物。`JDG-3781` が list を確定 | `Refusal.member` | 既決（`JDG-3781`。改名の行が無いだけ） |
| 2 | `AgentRefusal.stamp`（members:1393） | 断りが返す今の刻印 | map:287 は `stamp` のまま（`refusedBy` が `page` のときだけ持つ）。`JDG-3783`（rulings:3933）は同じ物を `ChangeNotice.stamp` と書く。list は `expectedStamp`（list:264）・`readStamp`（list:186）を今のままとした | `Refusal.stamp`（今のまま） | 方針で一つ（P-4: Agent API の中で刻印は `stamp` 1 語）。注: P-9 の字のとおりなら欄の型は `Stamp` になるが、型は β の `DocumentStamp`（#5）なので型の名は変えない |
| 3 | `AgentTableColumn.kind`（members:1992、値 `'text' \| 'date'`） | 列の値が語か日付か | `JDG-3564`（rulings:3746）が `AgentTableColumn.kind` → `valueType` と決めた。型の名は `JDG-3782`（rulings:3932）で `TableColumn` | `TableColumn.valueType` | 既決（`JDG-3564`） |
| 4 | 型 `Document`（members:97。`readDocument` の答え members:306、`ImportSource` members:1657・1669） | 1 つの文書 | β の根の物は `ScheduleDocument`（beta:11、tree の R001）。`JDG-3518`（rulings:3710）も `ScheduleDocument`（スケジュール文書）を GRS JSON の語に入れる | `ScheduleDocument` | 方針で一つ（P-4）。注: `readDocument` は `parts`・`taskUids` で部分を省く（members:298〜302）。必須のキーを欠く答えに同じ型の名を使うと、P-4 の後半（値の形が違えば名も変える）に触れうる。説明の 1 文で補うか、席が決める |
| 5 | 型 `DocumentStamp`（members:100） | 文書の刻印 | `JDG-3712`（rulings:3862）が「`documentStamp`（型 `DocumentStamp`。Agent API の書き込みで照らす印と同じ物）」と決めた。`JDG-3570`（rulings:3570）も同じ。β の `$defs/DocumentStamp`（beta:1818） | `DocumentStamp`（今のまま） | 既決（`JDG-3712`） |
| 6 | 型 `DelayDiagnosticsReport`（members:115。`AgentDelayDiagnostics` が extends する members:1721〜1725） | 遅延診断のレポート（表 T-317） | list:223 が `AgentDelayDiagnostics` → `DelayDiagnosisReport`。`JDG-3512`（rulings:3704）のとおり改めると、元の型も `DelayDiagnosisReport` になり、2 つの型が 1 つの名を持つ。表 T-317 は修正案と修正の記録を `DX-11`・`DX-12` に持つ（`docs/spec/01-04-requirements.md:3886`・`3887`）ので、足し分の 2 欄（members:1729・1736）も T-317 の欄である | 無くす（`DelayDiagnosisReport` 1 つに畳む） | 退く（P-4・`JDG-3512`。1 つの物に型 2 つは要らない） |
| 7 | 型 `InvariantRow`（members:124。`AgentRefusalReason` の値 members:1517） | 取り込みの検証が断った行 ID（表 T-220） | map:319 が「IV-n → `documentInvalid`、欠陥ごとの理由は `documentFaults[{at, reason, message}]`」。`JDG-3285`（rulings:3532）は外に行 ID を出さない | 無くす | 退く（map:319・`JDG-3285`） |
| 8 | 型 `CodecRefusalReason`（members:127。値 members:1511） | 取り込みの読みが断った行 ID（表 T-233） | map:316 が RS-25 → `schemaViolation`、map:317 が RS-64 → `formatTooNew`。`JDG-3285` | 無くす | 退く（map:316〜317・`JDG-3285`） |
| 9 | 型 `AgentRefusalReason`（members:1420。欄 members:1387） | 断りの理由の値の和 | list:473 が「P-5 で頭の `Agent` を外す。名は問いに無い」 | `RefusalReason` | 方針で一つ（P-5 で `Agent` を外す。P-9 の欄の名 `reason` に、N-2 で持ち主 `Refusal` を残す。`JDG-3782` の `TableColumn` と同じ作り）。注: 命令の断りの理由は別の値の組なので、要るなら `CommandRefusalReason` |
| 10 | `readTableRows.word`（members:462） | 行を絞る語 | list:186 が `readSearchRows.word` を今のまま | 今のまま | 方針で一つ（P-4: 同じ意味の引数は同じ語） |
| 11 | `readTableRows.filters`（members:470） | 人の列のフィルタを当てるか | list:186 が `readSearchRows.filters` を今のまま | 今のまま | 方針で一つ（P-4） |
| 12 | `readTableRows.offset`（members:478） | ページの最初の行の位置 | `JDG-3777`（rulings:3927）が「`offset`・`nextOffset`・`limit` は今のまま（`readSearchRows`・`readTableRows` ほか）」 | 今のまま | 既決（`JDG-3777`） |
| 13 | `readTableRows.limit`（members:486） | 返す行の数 | 同上 | 今のまま | 既決（`JDG-3777`） |
| 14 | `readSearchRows.offset`（members:400） | タスクの行の最初の位置 | 同上。list:264 も `offset` を今のまま | 今のまま | 既決（`JDG-3777`） |

## B. `readDelayDiagnosis` の部分と、中の欄

定めの所: `parts` の意味は members:556（ja）・557（en）。中の欄は説明 members:576〜582（ja）・588〜592（en）。src の形は `src/entity/document-model/schedule/delay-diagnostics.ts:37〜110`。
道具の名は `JDG-3512` で `readDelayDiagnosis`（list:186 の注・list:472）。

| # | 今の名 | 何か（src） | 既決の裁定 | 新しい名 | 仕分け |
|:---|:---|:---|:---|:---|:---|
| 15 | `findings` | 指摘の並び（`DX-3`、src:101） | 無い | 今のまま | 方針で一つ（P-12。画面の列「Finding / 指摘」glossary の `findingColumn` と同じ語） |
| 16 | `bottlenecks` | ボトルネックの並び（`DX-4`、src:102） | `JDG-3466`（rulings:3658）が語 `bottleneck` を確定 | 今のまま | 方針で一つ（P-4・P-12） |
| 17 | `terminalPushOuts` | 末端ごとの遅れ（`DX-5`、src:103） | `JDG-3473`（rulings:3665）が `endTaskDelays` | `endTaskDelays` | 既決（`JDG-3473`） |
| 18 | `walls` | 診断が止まった所（`DX-6`、src:104） | `JDG-3473` が `diagnosisBlockers` | `diagnosisBlockers` | 既決（`JDG-3473`）。注: queue:1022 の問 34-8 の文はまだ `walls` と書く |
| 19 | `markerStates` | タスクごとの表 T-315 の状態 `DG-1`〜`DG-4`（`DX-8`、src:106・80〜83） | `JDG-3372`（rulings:3609）が「Marker」と書くのを禁じる。改名の裁定は無い | 下の問い | 持ち主に問う |
| 20 | `settledPushOuts` | 完了したタスクの押し出し（`DX-9`、src:107） | `JDG-3473` が `finishedDelayContributions` | `finishedDelayContributions` | 既決（`JDG-3473`） |
| 21 | `derivedParentTasks` | 親を導いたタスクと、導いた親（src:108・85〜88） | 無い | 今のまま（中の `parentUid` は `parentTaskUid`） | 方針で一つ（P-12。過去分詞＋名詞は P-5 に合う。中の名は P-1 の N-5 と β の `parentTaskUid`）。注: 表 T-317（requirements:3876〜3887）にこの部分の行が無い。ja の説明（members:556）も挙げない |
| 22 | `lateDays` | 遅れたタスクの日数（`DX-10`、src:109・91〜95） | 無い | 下の問い | 持ち主に問う |
| 23 | `outcome` | 実行の結果 `'diagnosed' \| 'notDiagnosed'`（`DX-1`、src:99） | 無い。P-9 は `…Outcome` を「値か断りを返す答えの型」に取っておく | 下の問い | 持ち主に問う |
| 24 | `statusDate` | 基準日（`DX-2`、src:100） | β の `project.statusDate`（glossary の `/grsJson/project/statusDate`） | 今のまま | 方針で一つ（P-4） |
| 25 | `unreliableCount` | 信用できないタスクの数（`DX-7`、src:105） | `JDG-3466` が語 `unreliable` を確定 | 今のまま | 方針で一つ（P-8 の `…Count`・P-4） |
| 26 | `fixProposals` | 修正案の行（`DX-11`、members:1729） | list:264 が今のまま | 今のまま | 既決（`JDG-3781`） |
| 27 | `fixLog` | 修正の記録の行（`DX-12`、members:1736） | list:156 が表の値 `fixLog`、list:153 が型 `FixLogRow` | 今のまま | 方針で一つ（P-4） |
| 28 | `inheritedDelayMinutes` | 先行に押された開始の遅れ（src:55） | `JDG-3476`（rulings:3668）が `dependencyDelayMinutes` | `dependencyDelayMinutes` | 既決（`JDG-3476`） |
| 29 | `selfDelayMinutes` | 自分の終了の遅れ（src:56） | `JDG-3476` が `internalDelayMinutes` | `internalDelayMinutes` | 既決（`JDG-3476`） |
| 30 | `pushOutMinutes` | 末端の遅れに占める分（src:57） | `JDG-3473` と `JDG-3476` が `delayContributionMinutes` | `delayContributionMinutes` | 既決（`JDG-3473`） |
| 31 | `terminalsReached` | 届いた末端の数（src:58） | `JDG-3473`（2026-10-30）が `endTasksReached`。後の P-8（`JDG-3716`・`JDG-3776`）は「個数は `…Count`」 | 下の問い | 持ち主に問う（2 つの裁定が食い違う） |
| 32 | `terminalDelayMinutes` | 末端の遅れ（src:69） | `JDG-3473` と `JDG-3476` が `endTaskDelayMinutes` | `endTaskDelayMinutes` | 既決（`JDG-3473`） |
| 33 | `givenTo` | その末端の遅れを生んだタスクと分 `{uid, minutes}[]`（src:70） | 無い | `delayContributions`（中は `taskUid`・`delayContributionMinutes`） | 方針で一つ（P-5 は前置詞を、P-11 は行き先でない `To` を退ける。中身は「そのタスクが末端の遅れに占める分」で、`JDG-3473` の語 `delayContribution` そのもの ＝ P-4） |
| 34 | `row`（`walls[].row`、値 `DW-1`〜`DW-3`、src:74） | 止まった訳の種類 | `JDG-3285` が行 ID の値を禁じる。`JDG-3564` は「形を変えない分類は `xxxType`」。名も値の名も決まっていない | 下の問い | 持ち主に問う |
| 35 | `causeUid`（src:75） | 原因のタスク | 無い | `causeTaskUid` | 方針で一つ（P-1 の N-5: 参照は相手の名＋`Uid`。list:37 の `sourceUids` → `sourceTaskUids` と同じ） |
| 36 | `stoppedUids`（src:77） | 診断しなかったタスク | 無い | `stoppedTaskUids` | 方針で一つ（P-1 の N-5） |

注: `row` は `findings[].row`（src:42）・`markerStates[].row`（src:82）・`lateDays[].row`（src:93）にもあり、どれも行 ID を返す（`JDG-3285` に反する）。名の問いは #34 と同じ形で解ける。src の `walls[].stoppedCount`（src:76）は説明に出ないので数えていない。

### 持ち主に問う 5 つ

**#19 `markerStates`**（タスクごとの、遅延診断が進捗マークに与える状態。値は `unreliable`・`bottleneck`・`bottleneckPath`・`delay`。表 T-315 の題は requirements:3823）

| 案 | 名 | 根拠 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `diagnosisMarks`（中は `taskUid`・`diagnosisMark`） | β の説明（beta:2397）が `unreliable`・`bottleneck`・`bottleneckPath` を「the diagnosis marks」と呼ぶ（P-4）。`JDG-3372` の語 Mark | `delay` は診断の前から付く印（requirements:3832）も入る |
| b | `progressStatusMarkStates` | `JDG-3742` の語「進捗ステータスマーク」 | `DX-8` は「日程表に描く印ではない」と言う（requirements:3883） |
| c | `diagnosisStatuses` | β の列 `diagnosisStatus`（`JDG-3726`） | 列の値の組（`suspicion`・`omission`・`finishedDelayContribution` を含む、beta:2397）と違う |

**#22 `lateDays`**（遅れたタスクと、遅れの稼働日の数）

| 案 | 名 | 根拠 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `delays`（中の日数は `delayWorkingDays`） | 遅れの語は glossary の `delay`（`JDG-3735` の値も `delay`）。単位は中の名が言う（`JDG-3476` の「単位を付けて誤解を無くす」） | 名が短い |
| b | `delayWorkingDays` | 並びの名が値の単位まで言う | 並びの名と中の数の名が同じになる |
| c | `lateDays` のまま | 画面の語「Late」 | 用語集のキー `delay` と 2 語になる。単位が稼働日か暦日かを言わない |

**#23 `outcome`**（値は「診断した」と「基準日が無いので診断しなかった」の 2 つだけ、requirements:3876）

| 案 | 名 | 根拠 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `isDiagnosed`（真偽） | P-7（答えの真偽は `is…`）。値は 2 つで、しなかった訳は基準日が無いことだけ（`statusDate` はいつも返る） | 値の形が文字列から真偽に変わる |
| b | `diagnosisResult`（値は今の 2 つ） | 形を変えない | 「結果」は診断の中身と読み違えうる |
| c | `runResult` | 行いの結果と分かる | 同上 |

**#31 `terminalsReached`**

| 案 | 名 | 根拠 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `reachedEndTaskCount` | 後の決まり P-8（個数は `…Count`）。`taskRowCount`・`rowCount`（list:261・262）と同じ形 | `JDG-3473` の名を改める |
| b | `endTasksReached` | `JDG-3473` のまま | P-8 に合わない |

**#34 `walls[].row`**（止まった訳の種類。値も名が要る）

| 案 | 名 | 根拠 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `causeType` | `JDG-3564`（形を変えない分類は `xxxType`）。隣の `causeTaskUid` と対。N-4 で親の語 blocker を繰り返さない | 「原因の種類」と「止まった訳」が同じかを説明で言う |
| b | `diagnosisBlockerType` | 何の種類かを名が全部言う | 親 `diagnosisBlockers[]` の語を繰り返す（N-4） |
| c | `blockerType` | 短い | 同上 |

値の名（`DW-1` 値が矛盾するタスク・`DW-2` 親を導けないタスク・`DW-3` 先行の無いマイルストーン）も、`JDG-3285` のとおり英語の名が要る。どの裁定にも無い（未決）。

## C. 文書の命令（commands。α の命令の名で書く）

| # | 今の名（定めの所） | 何か | 既決の裁定・対応表 | 新しい名 | 仕分け |
|:---|:---|:---|:---|:---|:---|
| 37 | `setTaskPlanActualState.place.state` の値 `notStarted`（commands:742）・`inProgress`（754）・`suspendedWithResumeDate`（777）・`suspendedWithoutResumeDate`（806）・`finished`（829）。新しい命令は `setTaskProgressStatus.progressStatus.state`（list:29・54） | 進捗ステータスの 5 つ | `JDG-2740`（rulings:3068）がこの 5 語を決めた。`JDG-3735`（rulings:3885）が同じ 5 語を表の列の隠す値に使い、`JDG-3742`（rulings:3892）がその列を `progressStatus` と改めた。β の説明（beta:2397）と glossary（glossary:924〜988 の `progressStatus` の子）も同じ 5 語 | 今のまま（5 語） | 既決（`JDG-2740`）。GRS JSON と画面の値に一致する |
| 38 | `cycleTaskPlanActualState.remembered.carriedActualDuration`（commands:943。原稿は `docs/spec/_source/document-commands.json:292`）。新しい名は `cycleTaskProgressStatus.removedActual`（list:31） | 外した実績の、持ち越した MSPDI の `ActualDuration` | `JDG-3766`（rulings:3916）が語 carried を除き passthrough で言う。list:164 が `includeCarry` → `includePassthrough`。β は `ActualDuration` をキーに持たず、`grs.passthrough` に MSPDI の名で持つ（`JDG-3606` rulings:3756、beta:2036） | `passthroughActualDuration` | 方針で一つ（P-4: carry → passthrough の置き換え。後ろは MSPDI の要素の名） |
| 39 | `setCalendar.exceptions[].recurrenceKind`（commands:1645）。新しい命令は `replaceCalendarRules` | 例外の繰り返し方 1〜9 | `JDG-3628`（rulings:3778）が `calendars[].exceptions[].type` と決めた。β の `Exception.type`（beta:1102）、tree の R168 | `type` | 既決（`JDG-3628`。P-4 で命令も同じキー） |
| 40 | `setCalendar.exceptions[].carryElements`（commands:1691） | 例外の下の、持ち越した MSPDI の子の要素 | `JDG-3606` が持ち越しを `passthrough` 1 つに MSPDI の構造のまま持つと決め、`ordinal` も捨てた。`JDG-3748`（rulings:3898）が `grs.passthrough` に置いた。β の Exception は `grs.passthrough` だけ（beta:1121〜1124） | 無くす（`carry` と一緒に `grs.passthrough` に畳む） | 退く（`JDG-3606`・`JDG-3748`）。注: map:163 は `replaceCalendarRules` の引数を「同じ 4 つ」と書き、退く名を書いていない。隣の `carry`（commands:1685）・`ordinal`（commands:1616）も同じく退く |
| 41 | `setCommentBoxLeaderShapeKind.leaderShapeKind` の値 `calloutBox`・`polyline`（commands:2018〜2021） | 引出し線の形 | map:215 が命令を退け（`retiredName` で断る）、map:276 が列 `leaderShapeKind` → 無い（所見 32）。`studies/76-grs-json-beta-shape/doc-shape-map.md:299` も remove。β の `CommentBox`（beta:1636〜1691）にも `CommentBoxStyle`（beta:2321）にも引出し線の形のキーは無い | 無くす | 退く（map:215・276）。レビューの「退くなら対応表に書く」は、もう書いてある |

## 足しの問い 1: `scheduleData.scheduleDataTimeZone` を書く命令

| 所 | 書く命令 | 値の形 |
|:---|:---|:---|
| α の原稿 | `setScheduleDataTimeZone`（commands:452〜497） | 文字列の鍵 `"UTC+09:00"` など（commands:459〜490） |
| CR-851 の対応表 | `editProject` の `set.scheduleDataTimeZone`（map:32、map:191。`studies/76-grs-json-beta-shape/commands-choices.md:62` も同じ） | `$defs/UtcOffset` |
| β の GRS JSON | 置き場は `scheduleData` の直下 `scheduleDataTimeZone { utcOffset }`（beta:651〜661、tree の R100〜R101） | `{ "utcOffset": "+09:00" }` |

- β の置き場は `project` の外である。`JDG-3755`（rulings:3755）が Project から出し、`JDG-3618`（rulings:3768）が `scheduleData` の直下に置き、`JDG-3644`・`JDG-3645`（rulings:3794・3795）が形を `{ utcOffset }` にした。
- map の `editProject` は、この裁定より前の形で書いている。P-3 の `edit<実体>` は 1 つの実体の欄を書くので、`project` の外のキーを書くと名と働きが合わない。どの裁定も、どの命令が書くかを決めていない（未決）。
- map の `editProject` の `set` には、ほかにも置き場が変わった欄がある: `themeHue`（`JDG-3713` rulings:3863 で `documentSettings.themeHue`）と `parentTaskProgressToleranceWorkingDays`（list:140 で `editDocumentSettings.set.delayDiagnosisSettings.parentTaskProgressToleranceWorkingDays`）。

持ち主に問う（数には入れない）:

| 案 | 命令 | 根拠 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 名つきの `setScheduleDataTimeZone`（値 `scheduleDataTimeZone: { utcOffset }`） | P-3（`set…` は値を 1 つ置く）。`scheduleData` で命令が書ける欄はこれだけ（ほかの 4 つは取り込みだけが書く、map:34）。`viewTimeZone` がついて行く働き（map:32）を名つきの命令が持てる | 命令が 1 つ増える |
| b | `editProject.set.scheduleDataTimeZone` のまま | map のとおり | 書くキーが `project` の外（P-3・P-4 に合わない） |
| c | `editScheduleData`（`set.scheduleDataTimeZone`） | `edit<実体>` の形 | 書ける欄が 1 つだけの edit になる |

## 足しの問い 2: `editTableWindow`（α は `setTableView`、map は `editTableView`）の `set` のキー

| β のキー（tree） | α の名（commands） | map の名（map:132〜138） | 決めた裁定 | 一覧にあるか |
|:---|:---|:---|:---|:---|
| `isScheduleFilteredByChecks`（R431・R436） | `view.visibility.isScheduleFilterApplied`（commands:3007） | `isScheduleFilterApplied` | `JDG-3728`（rulings:3878） | ある（list:121） |
| `checkedTaskUids[]`（R432） | `view.visibility.shownTaskUids`（commands:2992） | `shownTaskUids` | `JDG-3617`（rulings:3767）、`JDG-3713`（rulings:3863）が確定 | 無い |
| `isUnassignedChecked`（R437） | `view.visibility.isUnassignedShown`（commands:3004） | `isUnassignedShown` | 同上 | 無い |
| `checkedResourceUids[]`（R438） | `view.visibility.shownResourceUids`（commands:2998） | `shownResourceUids` | 同上 | 無い |
| `columnFilters[]`（R433・R439） | `view.columnFilters`（commands:3019） | `columnFilters` | 名は同じ | 無い（同じ名） |
| `columnSort`（R434・R440） | `view.sort`（commands:3057） | `sort` | `JDG-3708`（rulings:3858） | 無い |

- 答え: β の木のキーは上の 6 つで、`set` はこの名を持つ（P-4。list:52 の「`set` は GRS JSON のキーを書く」）。どれも裁定が β の名を決めているので、命令の名は方針で一つに決まる。
- 行番号: 依頼の「R432〜R438」は、tree:464〜474 では `TaskTableWindow` が R430〜R434、`ResourceTableWindow` が R435〜R440 である。
- α の `view.visibility` の入れ子は β に無い（キーは窓の型の直下、beta:2477〜2533）。
- 窓の名の値は `searchPanel` → `searchWindow`、`delayDiagnosticsReport` → `delayDiagnosisReportWindow`、`resourceList` → `resourceListWindow`（list:119・120・232）。

## そのほかに見つけたこと

- members:556（ja）の `parts` は `settledPushOuts`・`derivedParentTasks`・`lateDays` を挙げず、members:557（en）は挙げる。ja と en が食い違う。
- 表 T-317（requirements:3876〜3887）に `derivedParentTasks` の行が無い。答えにあって仕様の表に無い部分である。
- `setTaskProgressStatus.progressStatus.state` は判別子（値で欄の組が変わる）だが、名は `state` である。`JDG-3564` は判別子を `type` と言う。list:54 が `state` を今のままと決めた（`JDG-3781`）ので、ここでは数えない。
- `AgentRefusal.refusals` は map:288 で `commandRefusals`・`documentFaults` に分かれる。`documentFaults[]` の要素の型の名と、その `reason` の値の型の名は、list にも map にも無い（未確認）。

## 数

| 仕分け | 数 | 番号 |
|:---|:---|:---|
| 既決 | 16 | 1・3・5・12・13・14・17・18・20・26・28・29・30・32・37・39 |
| 方針で一つ | 15 | 2・4・9・10・11・15・16・21・24・25・27・33・35・36・38 |
| 持ち主に問う | 5 | 19・22・23・31・34 |
| 退く | 5 | 6・7・8・40・41 |
| 計 | 41 | A 14・B 22・C 5 |

数え方: 依頼の名を 1 行 1 名で数えた。#37 の値 5 つは 1 行、#41 の値 2 つは 1 行と数えた。足しの問い 2 つ（`scheduleDataTimeZone` を書く命令は持ち主に問う 1、`editTableWindow` のキー 6 つは方針で一つ）は上の数に入れていない。
