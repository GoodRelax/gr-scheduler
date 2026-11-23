# readDelayDiagnosis の答えの外の名 —— 全部（方針を当てた表の案）

Agent API の名 2 の席が作業役に作らせ、席が確かめた（2026-11-24、コミット 86da8f06e の木）。持ち主に問う 4 問は GQA BGQA7 の [rev] の問 21〜24。
`agent-api-names-missing-from-list.md` の B 節（#15〜#36、5 問）の上に積んだ。同じ名は「前 #n」と書く。前の答えを変えた所は、その行に訳を書いた。

## 略

| 略 | ファイル（木の根から） |
|:---|:---|
| diag | `src/entity/document-model/schedule/delay-diagnostics.ts` |
| fixes | `src/entity/document-model/schedule/delay-fixes.ts` |
| members | `docs/spec/_source/agent-api-members.json` |
| req | `docs/spec/01-04-requirements.md` |
| words | `docs/spec/_source/display-words.json` |
| props | `docs/spec/_assets/tbl-property-items.md` |
| rulings | `docs/development-records/rulings.md` |
| policy | `studies/76-grs-json-beta-shape/terms/agent-api-naming-policy-draft.md`（P-1〜P-12） |
| list | `studies/76-grs-json-beta-shape/terms/agent-api-names-by-policy-draft.md`（`JDG-3781` が確定） |
| map | `studies/76-grs-json-beta-shape/commands-map.md` |
| beta | `studies/76-grs-json-beta-shape/terms/grs-json-beta.schema.json` |
| glossary | `studies/76-grs-json-beta-shape/terms/glossary-draft/glossary.json` |
| nrules | `studies/76-grs-json-beta-shape/terms/grs-json-review-request-4.md`（N-1〜N-17 の表、:53〜73。順は `JDG-3638` rulings:3788） |

N の行: N-3 nrules:55、N-1 :58、N-6 :59、N-5 :60、N-2 :61、N-4 :62、N-7 :63、N-8 :64、N-9 :65、N-10 :67、N-13 :68、N-14 :69、N-17 :70、N-12 :71。
P の行: P-4 policy:12、P-5 :13、P-7 :15、P-8 :16、P-9 :17、P-10 :18、P-11 :19、P-12 :20。

仕分け: **既決** ＝ 裁定が名を決めた。**方針** ＝ 規則から名が 1 つに決まる（行に規則を書く）。**問 Qn** ＝ 持ち主に問う（終わりの節）。
「数」の列は、その行が持つ名の数。値の組は値 1 つを 1 名と数える。

答えの元の形: `AgentDelayDiagnostics`（src/adapter/agent-api-endpoint/agent-api-members.ts:186〜189）＝ diag:98〜110 の欄 ＋ `fixProposals`・`fixLog`。部分と上限は同じファイルの :420〜424 が当てる。中の並びは切らない（上限は根の並びだけ）。

## 1. 根の欄と引数

| # | α の名 | 道 | 意味 | 裁定 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | `outcome` | 根 | 診断したか（`DX-1`、req:3876、diag:99） | 無い | 問 Q1（推し `isDiagnosed`） | 問 Q1 | 1 |
| 2 | 値 `diagnosed`・`notDiagnosed` | `outcome` | 診断した ／ 基準日が無いので診断しなかった | 無い | Q1 に従う | 問 Q1 | 2 |
| 3 | `statusDate` | 根 | 基準日（`DX-2`） | β `project.statusDate`（beta:967） | 今のまま。基準日が無いときはキーを書かない（N-12） | 方針（P-4）前 #24 | 1 |
| 4 | `findings` | 根 | 指摘の並び（`DX-3`） | 無い | 今のまま | 方針（P-12。画面の列 Finding、glossary:12504）前 #15 | 1 |
| 5 | `bottlenecks` | 根 | ボトルネック（`DX-4`） | `JDG-3466` rulings:3658 が語 `bottleneck` | 今のまま | 方針（P-4）前 #16 | 1 |
| 6 | `terminalPushOuts` | 根 | 末端ごとの遅れ（`DX-5`） | `JDG-3473` rulings:3665 | `endTaskDelays` | 既決 前 #17 | 1 |
| 7 | `walls` | 根 | 診断が止まった所（`DX-6`） | `JDG-3473` | `diagnosisBlockers` | 既決 前 #18 | 1 |
| 8 | `unreliableCount` | 根 | 紫（`DG-1`）のタスクの数（`DX-7`） | `JDG-1924` rulings:2222 | 今のまま | 既決（P-8 にも合う） | 1 |
| 9 | `markerStates` | 根 | タスクごとの 表 T-315 の状態（`DX-8`） | `JDG-3372` rulings:3609 が Marker を禁じる | 問 Q3（推し `diagnosisMarks`） | 問 Q3 前 #19 | 1 |
| 10 | `settledPushOuts` | 根 | 完了したタスクの遅延寄与（`DX-9`） | `JDG-3473` | `finishedDelayContributions` | 既決 前 #20 | 1 |
| 11 | `derivedParentTasks` | 根 | 導いた親（diag:108） | 無い | 今のまま | 方針（P-12）前 #21。表 T-317（req:3870〜3887）に行が無い | 1 |
| 12 | `lateDays` | 根 | 遅れ（`PM-4`）のタスクと日数（`DX-10`、req:3885） | 無い | `delays` | 方針（P-4: 用語集の語 `delay` glossary:1614、`JDG-3735` rulings:3885 の値。N-8）。前 #22 を問いから移した。訳: 中身は glossary の `delay` の定義そのもの。`Days` は単位で、並びの名に付けない（N-10。中に `taskUid` もある） | 1 |
| 13 | `fixProposals` | 根 | 修正案の行（`DX-11`） | list:264 | 今のまま | 既決（`JDG-3781`）前 #26 | 1 |
| 14 | `fixLog` | 根 | 修正の記録の行（`DX-12`） | list:156（表の値 `fixLog`） | 今のまま | 方針（P-4。glossary:1869、`JDG-3466`）前 #27 | 1 |
| 15 | 引数 `parts` | 道具 | 残す部分の名 | list:186 | 今のまま。値は上の新しい名（P-4） | 既決（`JDG-3781`） | 1 |
| 16 | 引数 `limit` | 道具 | 並びの要素の上限 | `JDG-3781` rulings:3931、list:185 | 今のまま | 既決 | 1 |

## 2. 指摘 `findings[]`（型 `DelayFinding`、diag:41〜49）

| # | α の名 | 道 | 意味 | 裁定 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 17 | `row` | `findings[]` | 観点の行 ID（diag:42） | `JDG-3285` rulings:3532 が値の行 ID を禁じる | 問 Q4（推し `reason`） | 問 Q4 | 1 |
| 18 | 値 `VC-1`〜`VC-15`・`VS-1`〜`VS-6`・`VO-1`〜`VO-5` | `row` | 観点（req:3657〜3671・3683〜3688・3698〜3702） | 名は未定（`studies/76-grs-json-beta-shape/spec-rows-map.md:82`） | 問 Q4 の表 | 問 Q4 | 26 |
| 19 | `kind` | `findings[]` | 矛盾・疑義・記載漏れ（diag:43・342） | `JDG-3564` rulings:3746: `kind` 禁止。形を変えない分類は `xxxType` | `findingType` | 方針（`JDG-3564`・N-7。形は変わらない。素の `type` は判別子だけなので、N-4 の「持ち主を繰り返さない」は当たらない） | 1 |
| 20 | 値 `suspicion`・`omission` | `kind` | 疑義（表 T-311）・記載漏れ（表 T-312） | `JDG-3508` rulings:3700、`JDG-3762` rulings:3912 | 今のまま | 既決 | 2 |
| 21 | 値 `contradiction` | `kind` | 矛盾（表 T-310） | `JDG-3508` は「src の FindingKind の名と同じ」と言うだけ | 今のまま | 方針（P-12。表 T-310 の題、words:6795 の DW-1 の語も contradiction） | 1 |
| 22 | `layer` | `findings[]`・`fixProposals[]` | 直す順の目安。1 が先（req:3651。記載漏れは null） | 無い | `layerIndex`（0 から。記載漏れはキーを書かない） | 方針（P-8・`JDG-3776` rulings:3926: 何番目かは 0 から `…Index`。N-12）。注: 値が 1 つずれる | 1 |
| 23 | `uid` | `findings[]`・`bottlenecks[]`・`finishedDelayContributions[]`・`endTaskDelays[]`・`markerStates[]`・`derivedParentTasks[]`・`lateDays[]`（7 か所） | そのタスク | 無い | `taskUid` | 方針（N-5。P-4: 修正案の行は `taskUid`、fixes:120） | 1 |
| 24 | `name` | `findings[]`・`bottlenecks[]`・`finishedDelayContributions[]`・`endTaskDelays[]`（4 か所） | そのタスクの名 | 列 `taskName`（`JDG-3726` rulings:3876） | `taskName` | 方針（P-4。修正案の行は `taskName`、fixes:121） | 1 |
| 25 | `values` | `findings[]` | 判定に使った値（`DX-3`） | 無い | 今のまま | 方針（P-12） | 1 |
| 26 | `proposedActualFinish` | `findings[]` | `VO-5` の達成日の候補（req:3878、diag:972） | 無い | `suggestedActualFinish` | 方針（P-4: 「候補」は `suggested`。fixes:31 の `suggestedDate`、fixes:133 の `suggested`） | 1 |

### 2-1. `findings[].values` の中のキー（diag:692〜972）

| # | α の名 | 使う観点 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|
| 27 | `predecessorUid` | VC-2・3・13・15、VS-1・3・4 | 今のまま | 既決（`JDG-3622` ② rulings:3772: MSPDI の名） | 1 |
| 28 | `successorUid` | VO-3 | 今のまま | 既決（list:81、`JDG-3781`） | 1 |
| 29 | `predecessorUids` | VC-1・14 | 今のまま | 方針（N-3 の名の複数、N-8） | 1 |
| 30 | `milestone`・`start`・`finish`・`percentComplete`・`actualStart`・`actualFinish`・`stop`・`resume`・`resumeValid`・`parentTaskUid` | 多く | 今のまま | 方針（P-4: β の Task のキー、beta:1159〜1227） | 10 |
| 31 | `childUids` | VC-9・10、VS-2 | `childTaskUids` | 方針（N-5） | 1 |
| 32 | `candidateUids` | VO-4 | `candidateParentTaskUids` | 方針（N-5。候補は親タスク、req:3701） | 1 |
| 33 | `leftmostUid`・`rightmostUid` | VS-6 | `leftmostTaskUid`・`rightmostTaskUid` | 方針（N-5） | 2 |
| 34 | `childStart`・`childFinish`・`childActualStart`・`childActualFinish` | VC-11・12 | 今のまま | 方針（P-12。MSPDI の語に頭を付けた名）。注: N-13 が当たるかは 未確認 | 4 |
| 35 | `predecessorStart`・`predecessorFinish`・`predecessorActualStart`・`predecessorActualFinish` | VC-13・15、VS-4 | 今のまま | 方針（P-12） | 4 |
| 36 | `linkType` | VC-13・15、VS-4 | 今のまま | 方針（β は `predecessorLinks[].type`（beta:1331）だが、平らな袋では持ち主の語を落とすと読み違える。N-2 が N-4 に勝つ、`JDG-3650` ① rulings:3800） | 1 |
| 37 | `lag` | VC-15 | `linkLag` | 方針（P-4: β の `linkLag`、beta:1346） | 1 |
| 38 | `parentPoint`・`leftmostPoint`・`rightmostPoint` | VS-6 | `parentPointDay`・`leftmostPointDay`・`rightmostPointDay` | 方針（N-13: 日だけの値は `…Day`。値は `textOfDay`、diag:888〜891） | 3 |
| 39 | `outsideMinutes` | VS-6 | 今のまま | 方針（P-12・N-10） | 1 |
| 40 | `parentTaskProgressToleranceDays` | VS-6 | `parentTaskProgressToleranceWorkingDays` | 既決（`JDG-3738` rulings:3888。P-4: β の設定の名、list:140） | 1 |
| 41 | `taskGroupAboveWithoutSpanBar` | VO-4 | 問 Q4（推し `spanlessParentTaskGroupName`） | 問 Q4（P-5 の前置詞 Above・Without。値はタスクグループの名か、名が無ければ id、diag:587） | 1 |

## 3. ボトルネックと完了済みの遅延寄与（型 `DelayQuantities`・`Bottleneck`、diag:52〜63）

`uid`・`name` は #23・#24 で数えた。

| # | α の名 | 意味 | 裁定 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|:---|
| 42 | `inheritedDelayMinutes` | 先行に押された開始の遅れ（`DQ-2`、req:3765） | `JDG-3476` rulings:3668 | `dependencyDelayMinutes` | 既決 前 #28 | 1 |
| 43 | `selfDelayMinutes` | 自分の終了の遅れ（`DQ-3`） | `JDG-3476` | `internalDelayMinutes` | 既決 前 #29 | 1 |
| 44 | `pushOutMinutes` | 末端の遅れに占める分（`DQ-4`） | `JDG-3473`・`JDG-3476` | `delayContributionMinutes` | 既決 前 #30 | 1 |
| 45 | `terminalsReached` | 届いた末端の数 | `JDG-3473` が `endTasksReached`。後の P-8 が `…Count` | 問 Q2 | 問 Q2 前 #31 | 1 |
| 46 | `path` | 根からボトルネックまでの祖先の uid（`DX-4`、diag:62） | 無い | `bottleneckPathTaskUids` | 方針（P-4: 用語集の語 `bottleneckPath` glossary:1772、`JDG-3466`。N-5。P-5: `path` は読みが 2 つ、方針の例 `path` → `existingFilePath`） | 1 |

## 4. 末端ごとの遅れ `endTaskDelays[]`（型 `TerminalPushOut`、diag:66〜71）

| # | α の名 | 意味 | 裁定 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|:---|
| 47 | `terminalDelayMinutes` | 末端の遅れ | `JDG-3473`・`JDG-3476` | `endTaskDelayMinutes` | 既決 前 #32 | 1 |
| 48 | `givenTo` | その遅れを生んだタスクと分（members:577・588） | 無い | `delayContributions` | 方針（P-5・P-11: `To` は行き先だけ。P-4: `JDG-3473` の語）前 #33 | 1 |
| 49 | `givenTo[].uid` | 遅れを生んだタスク | 無い | `taskUid` | 方針（N-5） | 1 |
| 50 | `givenTo[].minutes` | そのタスクが占める分 | 無い | `delayContributionMinutes` | 方針（P-4: #44 と同じ量。N-10） | 1 |

## 5. 診断阻害 `diagnosisBlockers[]`（型 `AnalysisWall`、diag:73〜78）

| # | α の名 | 意味 | 裁定 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|:---|
| 51 | `row` | 表 T-316 の行（止まった訳） | `JDG-3285`・`JDG-3564` | `causeType` | 方針（`JDG-3564`: 形を変えない分類は `xxxType`。xxx は 表 T-316 の列「原因」（req:3773）。隣の `causeTaskUid` と対）。前 #34 を問いから移した | 1 |
| 52 | 値 `DW-1` | 矛盾（表 T-310 の指摘）を持つタスク（req:3775） | 無い | `contradiction` | 方針（P-4: 原因は #21 の矛盾そのもの。words:6795 も「A contradiction stops…」） | 1 |
| 53 | 値 `DW-2` | 親が 1 つに決まらないタスク（`VO-4`、req:3776） | 無い | `VO-4` の名と同じ（Q4 の推し `parentTaskUndecided`） | 問 Q4（P-4 で `VO-4` と同じ語。語は Q4 で決まる） | 1 |
| 54 | 値 `DW-3` | 先行の無いマイルストーン（req:3777） | 無い | Q4 の推し `milestonePredecessorMissing` | 問 Q4 | 1 |
| 55 | `causeUid` | 原因のタスク | 無い | `causeTaskUid` | 方針（N-5）前 #35 | 1 |
| 56 | `stoppedCount` | 止まった範囲のタスクの数（diag:76。説明 members:579・590 に出ない） | 無い | `stoppedTaskCount` | 方針（P-8。P-4 で #57 とそろえる） | 1 |
| 57 | `stoppedUids` | 診断しなかったタスク（原因が先頭） | 無い | `stoppedTaskUids` | 方針（N-5）前 #36 | 1 |

## 6. `markerStates[]`（型 `DelayMarkerState`、diag:80〜83）

| # | α の名 | 意味 | 裁定 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|:---|
| 58 | `row` | 表 T-315 の行 | `JDG-3285` | Q3 に従う（推し `diagnosisMark`） | 問 Q3 | 1 |
| 59 | 値 `DG-1`・`DG-2`・`DG-3` | 信用できない・ボトルネック・ボトルネック経路（req:3829〜3831） | `JDG-3466` rulings:3658（glossary:1755〜1805 が `rowId` で結ぶ） | `unreliable`・`bottleneck`・`bottleneckPath` | 既決 | 3 |
| 60 | 値 `DG-4` | 遅れ（req:3832） | `JDG-3735` rulings:3885（glossary:1614） | `delay` | 既決 | 1 |

## 7. `derivedParentTasks[]`（型 `DerivedParentTask`、diag:85〜88）

| # | α の名 | 意味 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|
| 61 | `parentUid` | 導いた親 | `parentTaskUid` | 方針（N-5。β の `parentTaskUid` beta:1227） | 1 |

## 8. 遅れ `delays[]`（今の `lateDays`、型 `LateDays`、diag:91〜95）

| # | α の名 | 意味 | 裁定 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|:---|
| 62 | `row` | 表 T-021b の行 | `JDG-3285` | `progressStatus` | 方針（P-4: 3 行は「どの状態のまま過ぎたか」で、進捗ステータスの語そのもの。`JDG-3461` rulings:3653） | 1 |
| 63 | 値 `DL-1`・`DL-2`・`DL-3` | 進行中のまま `finish` を過ぎた ／ 未着手のまま `start` を過ぎた ／ 中断のまま `resume` を過ぎた（req:3557〜3559） | `JDG-2740` rulings:3068 | `inProgress`・`notStarted`・`suspendedWithResumeDate` | 既決。注: `DL-3` が「再開日未定の中断」を含まないことは 未確認（`resume` を過ぎるには再開日が要るので、含まないと読んだ） | 3 |
| 64 | `days` | 遅れの稼働日の数 | 無い | `delayWorkingDays` | 方針（N-10。`DX-10` は稼働日、req:3885。src の関数名も `delayWorkingDays`、diag:20） | 1 |

## 9. 修正案 `fixProposals[]`（型 `DelayFixRow` → `FixProposalRow`、fixes:117〜144）

| # | α の名 | 意味 | 裁定 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|:---|
| 65 | `fixRow` | 表 T-373 の行 ID | `JDG-3285` | 無くす | 方針（P-4。`FA-n` は観点と 1 対 1 で、fixes:1103〜1145 が観点から引くだけ。英語の名を付けると `findingReason` と同じ値になる）。注: 欄が 1 つ減る | 1 |
| 66 | 値 `FA-1`〜`FA-26` | 修正のしかたの行（req:3986〜4011） | `JDG-3285` | 無くす（#65 と一緒） | 方針（P-4） | 26 |
| 67 | `findingRow` | 観点の行 ID | `JDG-3285` | `findingReason`（Q4 で #17 が `check` なら `findingCheck`） | 問 Q4（#17 に従う。行の中では持ち主の語を残す、N-2） | 1 |
| 68 | `taskUid` | 行のタスク | 無い | 今のまま | 方針（P-12・N-5） | 1 |
| 69 | `taskName` | 行のタスクの名 | `JDG-3726` の列 `taskName` | 今のまま | 方針（P-4） | 1 |
| 70 | `column` | 直す値の欄（`FM-6`、req:4042） | 無い | `propertyField` | 方針（P-5: 表の列ではなく、プロパティパネルの欄を指す。P-4: 画面の列は「Property」glossary:12555、値は用語集の `…Field`。#78 の `field` と同じ物なので 1 語） | 1 |
| 71 | 値 `PR-3`・`PR-47`・`PR-35`・`PR-4`・`PR-6`・`PR-36`・`PR-8`・`PR-15` | 予定開始日・予定終了日・予定日（マイルストーン）・実績開始日・実績終了日・実績日（マイルストーン）・再開日確定・親タスク（props:37〜50） | `JDG-3285` | `plannedStartField`・`plannedFinishField`・`plannedDateField`・`actualStartField`・`actualFinishField`・`actualDateField`・`resumeDateConfirmedField`・`parentTaskField` | 方針（P-4: 用語集の下書きが同じ行に付けた名、glossary:11105・11127・11149・11166・11188・11210・11288・11376） | 8 |
| 72 | `before`・`after` | 修正前・修正後 | 無い | 今のまま | 方針（P-12。glossary:12572・12589） | 2 |
| 73 | `key` | 行の鍵（fixes:128。`applyFixProposals.fixProposalKeys` が指す、list:151） | list:264 | 今のまま | 既決（`JDG-3781`）。注: 値が行 ID を含む（`VC-1:12:PR-4:-`、fixes:1165）。名が決まれば値も英語の名になる | 1 |
| 74 | `fixKind` | 修正のしかた（`FM-3`、req:4038） | `JDG-3564` | `fixType` | 方針（`JDG-3564`: 形を変えない分類。P-4: 画面の列「Fix Type」glossary:12487） | 1 |
| 75 | 値 `automatic`・`choose`・`suggestedDate`・`byHand` | 機械・選ぶ・日付の候補・手で修正（表 T-373 の前文 req:3979） | 無い | 今のまま | 方針（P-12・N-14） | 4 |
| 76 | `choices` | 選ぶの行の択 | 無い | 今のまま | 方針（P-12） | 1 |
| 77 | `chosen` | 選んだ択の `key` | 無い | `chosenChoiceKey` | 方針（P-5: 過去分詞だけのキーを使わない、`JDG-3716` rulings:3866） | 1 |
| 78 | `suggested` | 日付の候補（fixes:1245、日の字） | 無い | `suggestedDay` | 方針（P-5・N-13: 日だけの値は `…Day`） | 1 |
| 79 | `checked` | チェックが入っているか | 無い | `isChecked` | 方針（P-7・N-9） | 1 |
| 80 | `isCheckable` | チェックを入れられるか | 無い | 今のまま | 方針（P-12） | 1 |
| 81 | `causedBy` | 連鎖の元の行の `key`（fixes:1323〜1328） | 無い | 今のまま | 方針（P-11: `By` は「誰が」に使える、`JDG-3772` rulings:3922。過去分詞だけの語ではない） | 1 |
| 82 | `refusal` | 当てられない訳（fixes:137） | 無い | `refusalReason` | 方針（P-4: Agent API の `refusal` は断りの物（list:264）。ここは訳の名の字なので形が違う） | 1 |
| 83 | 値 `readOnly` | 編集を受けないタスクグループに載る（`GP-1`、fixes:37） | 無い（命令の断りの名にも無い。map:401 は `notImplemented` だけ） | 今のまま | 方針（P-12・P-10） | 1 |
| 84 | `openField` | 名前を押したときに焦点を移す欄（`RW-13` req:3907、表 T-373 の「開く欄」） | 無い | 問 Q4（推し `focusTarget`） | 問 Q4（P-5: open は読みが 2 つ） | 1 |
| 85 | `openField.taskUid` | 焦点を移すタスク | 無い | 今のまま | 方針（P-12） | 1 |
| 86 | `openField.field` | プロパティパネルの欄（値は #71 と同じ `PR-n`、fixes:469） | 無い | `propertyField` | 方針（P-4: #70 と同じ物） | 1 |
| 87 | `relatedTaskUids` | 行に関係するタスク | 無い | 今のまま | 方針（P-12・N-5） | 1 |
| 88 | `depth` | `parentTaskUid` をたどった深さ（fixes:1216〜1222） | 無い | 問 Q4（推し `parentTaskDepth`） | 問 Q4（P-8 の `…Depth` には合う。ただし用語集の Depth はタスクグループの木の深さ（glossary:1137、`JDG-3660`）で、別の木。P-4 で別の名が要る） | 1 |
| 89 | `applyOrder` | 当てる順（0 から、fixes:1269） | 無い | `applyIndex` | 方針（P-8・`JDG-3776`: `…Order` は使わない） | 1 |
| 90 | `commands` | 当てる文書の命令 | list:264 | 今のまま | 既決（`JDG-3781`） | 1 |

`layer` は #22 で数えた。

### 9-1. 修正前・修正後の値（型 `DelayFixValue`、fixes:48〜53）

| # | α の名 | 意味 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|
| 91 | `kind` | 値の形を選ぶ | `type` | 方針（`JDG-3564`: 値で欄の組が変わる判別子。N-17） | 1 |
| 92 | 値 `empty`・`date`・`dates`・`flag`・`links` | 空・日付・日付の並び・真偽・依存線 | 今のまま | 方針（P-12・N-14）。注: `links` は命令の語 `Dependency`（list:81）と用語集の `dependency`（glossary:1366）と 2 語になる。β は MSPDI の `predecessorLinks` を使うので、どちらにも決めない | 5 |
| 93 | `text`・`texts` | 日付の字 | 値の形を 1 つに決め、N-13 で `dateTime`・`dateTimes`（日だけなら `day`・`days`） | 方針（N-13）。注: 今はタスクの日時の字（fixes:240、`parent.start`）と日の字（fixes:646）が混ざる。どちらかは 未確認 | 2 |
| 94 | `value` | 真偽の値 | 問 Q4（推し 今のまま） | 問 Q4（P-7 は答えの真偽を `is…` にするが、ここは真偽の欄の値を運ぶ入れ物） | 1 |
| 95 | `links` の中 `predecessorUid`・`successorUid`・`linkType`・`lag` | 依存線の両端・種類・ラグ（fixes:40〜45） | `predecessorUid`・`successorUid`・`linkType` は今のまま、`lag` → `linkLag` | #27・#28・#36・#37 と同じ規則。数えない | 0 |

### 9-2. 択 `choices[]`（型 `DelayFixChoice`、fixes:99〜108）

| # | α の名 | 意味 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|
| 96 | `key` | 択の鍵（`start`・`keep:0`・`delete:…`、fixes:536・631・646） | 今のまま | 方針（P-12） | 1 |
| 97 | `word` | 択の語の鍵 | 今のまま | 方針（P-12） | 1 |
| 98 | 値 `deleteLink`・`setPlannedDate`・`clearParentActualFinish`・`clearMilestoneActuals`・`moveSuccessorToEarliestDate`・`moveStatusDateToActual` | 択の語（fixes:80〜95） | 今のまま | 方針（P-12。`To` は行き先、P-11） | 6 |
| 99 | 値 `clearPauseValues` | 中断の値を外す（`FA-7`） | `clearSuspensionValues` | 方針（P-4: 中断は `suspended…` の語、`JDG-2740` rulings:3068） | 1 |
| 100 | 値 `deleteLinkBetween`・`keepThisLink`・`finishChildrenOnParentFinish`・`finishPredecessorsOnMilestoneDate`・`makeParentTaskFromTaskGroup`・`markAsStarted`・`markAsFinished`・`markAsStillInProgress` | 択の語 | 問 Q4 の表 | 問 Q4（P-5: 前置詞 Between・On・From・As、指す語 This） | 8 |
| 101 | `predecessorUid`・`successorUid` | 語の埋め字 | 今のまま | 既決（`JDG-3622` ②・list:81） | 2 |
| 102 | `date` | 語の埋め字の日 | `day`（日時なら `dateTime`） | 方針（N-13）。注: 値の形は #93 と同じく 未確認 | 1 |
| 103 | `taskGroupName` | 語の埋め字のタスクグループ名 | 今のまま | 方針（P-4: 列 `taskGroupName`、`JDG-3726`） | 1 |

`after`・`commands` は #72・#90 と同じ。

### 9-3. 命令 `commands[]`（型 `DelayFixCommand`、fixes:69〜77）

fixes:68 の WHY のとおり、中身は文書の命令（表 T-108）そのもの。名は命令の名の裁定に従う。

| # | α の名 | 新しい名 | 裁定 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|
| 104 | 判別子 `kind` | `type` | `JDG-3564`・P-2（policy:10・22） | 既決 | 1 |
| 105 | 値 `deleteDependency` | 今のまま | list:81 | 既決 | 1 |
| 106 | 値 `deleteDependencyAt`（中の `order`） | 今のまま（`order` → `index`） | list:73・74、`JDG-3776` | 既決 | 2 |
| 107 | 値 `setTaskPlanDates`・`setTaskName`・`setTaskParentTask` | `editTask`（`set.start`・`set.finish`・`set.name`・`set.parentTaskUid`、無くすときは `clear`） | map:192・194・199、`JDG-3268` rulings:3520 | 既決 | 3 |
| 108 | 値 `setTaskPlanActualState`（中の `place`） | `setTaskProgressStatus`（`progressStatus`） | list:28・29 | 既決 | 2 |
| 109 | 値 `setStatusDate` | `editProject`（`set.statusDate`） | map:187 | 既決 | 1 |
| 110 | 値 `createTask`（中の `shapeKind`、値 `rectangle`） | `createTask`（`taskShape`、値 `rectangle`） | list:54、map:146・262、`JDG-3311` rulings:3548 | 既決 | 3 |
| 111 | `place.state` と値 `notStarted`・`inProgress`・`suspendedWithResumeDate`・`suspendedWithoutResumeDate`・`finished` | 今のまま | `JDG-2740` rulings:3068、list:54 | 既決 | 6 |
| 112 | `stop`・`resume`・`actualStart`・`actualFinish`・`start`・`finish`・`statusDate`・`name`・`parentTaskUid`・`taskUid`・`taskGroupId`・`predecessorUid`・`successorUid` | 今のまま（β と命令のキー） | `JDG-2740`（MSPDI の Stop・Resume の名は変えない）、map:146、list:81 | 既決 | 13 |

### 9-4. 修正の記録 `fixLog[]`（型 `DelayFixLogRow` → `FixLogRow`、fixes:156〜161）

`fixRow`・`findingRow`・`taskUid`・`taskName`・`column`・`before`・`after` は 9 節と同じ（数えない）。

| # | α の名 | 意味 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|:---|
| 113 | `fixedAt` | 直した時刻。閲覧環境の時刻で、時差を書かない（`FM-2` req:4037、src/framework/single-html-shell/frame-loop.ts:2821〜2825） | `fixedDateTime` | 方針（N-13: `…At` は UTC の瞬間（`Z` 付き）だけ。時差の無い日時は `…DateTime`） | 1 |
| 114 | `order` | 当てた束の中の順（0 から、fixes:1413〜1415） | `applyIndex` | 方針（P-8・`JDG-3776`。P-4: #89 と同じ数） | 1 |
| 115 | `isCascade` | 連鎖の行か | 今のまま | 方針（P-12・P-7） | 1 |

## 10. 型の名（members:96〜130 の `externalTypes`、readSchema の defs）

| # | α の型 | 新しい名 | 仕分け | 数 |
|:---|:---|:---|:---|:---|
| 116 | `AgentDelayDiagnostics` | `DelayDiagnosisReport` | 既決（list:223、`JDG-3781`・`JDG-3512` rulings:3704） | 1 |
| 117 | `DelayDiagnosticsReport` | 無くす（#116 に畳む） | 方針（P-4）前 A #6 | 1 |
| 118 | `DelayFixRow`・`DelayFixLogRow` | `FixProposalRow`・`FixLogRow` | 既決（list:152・153） | 2 |
| 119 | `DelayFixPlacement` | `ProgressStatus` | 既決（list:29） | 1 |
| 120 | `DelayFinding`・`FindingKind`・`TerminalPushOut`・`AnalysisWall`・`LateDays`・`DelayQuantities`・givenTo の要素（名無し）・`DelayFixKind`・`DelayFixChoice`・`DelayFixChoiceWord`・`DelayFixLink` | `Finding`・`FindingType`・`EndTaskDelay`・`DiagnosisBlocker`・`Delay`・`FinishedDelayContribution`・`DelayContribution`・`FixType`・`Choice`・`ChoiceWord`・`Link` | 方針（P-9: 欄の名を PascalCase に、並びは 1 つの形、N-8）。注: `Bottleneck` は `FinishedDelayContribution` を広げる形になる | 11 |
| 121 | `Bottleneck`・`DerivedParentTask`・`FindingValue` | 今のまま | 方針（P-9・P-12） | 3 |
| 122 | `DelayFixCommand` | `DocumentCommand` | 方針（P-4: members:109 の外の型と同じ物） | 1 |
| 123 | `DelayFixValue` | `FixValue` | 方針（P-9 は 3 つの欄（`before`・`after`・択の `after`）が持つ型に名を 1 つに決めない。list:152 と同じく頭の `Delay` を外した） | 1 |
| 124 | `DelayFixRefusal` | `FixRefusalReason` | 方針（P-9 で `RefusalReason` だが、前 A #9 の `RefusalReason` と値の組が違う。P-4） | 1 |
| 125 | `DelayMarkerState`・`DelayMarkerRow` | Q3 に従う（推し `DiagnosisMarkEntry`・`DiagnosisMark`）。Marker は使わない（`JDG-3372`） | 問 Q3 | 2 |
| 126 | `DelayFixOpenField` | Q4 に従う（推し `FocusTarget`） | 問 Q4 | 1 |

## 11. 食い違いと気付いたこと

| # | 何が | どこ | どうする |
|:---|:---|:---|:---|
| C-1 | `JDG-3473`（2026-10-30）が `endTasksReached` と名を決めたが、後の P-8（`JDG-3716` rulings:3866・`JDG-3776` rulings:3926）は個数を `…Count` で終える。後の裁定は前の名を覆すと書いていない | rulings:3665、policy:16 | 問 Q2 |
| C-2 | Agent API の `…Outcome` は「値か断り」の答えの型（P-9、`TableRowsOutcome` など）。答えの中の欄 `outcome` は「診断したか」で、意味が違う（P-4） | diag:99、policy:17、list:223 | 問 Q1 |
| C-3 | `fixedAt` は閲覧環境の時刻で時差を持たない。N-13 の `…At` は UTC の瞬間 | frame-loop.ts:2825、nrules:68 | #113 で `fixedDateTime` |
| C-4 | 用語集の下書きにまだ `delayDiagnostics`（glossary:1635）と道具 `readDelayDiagnostics`（glossary:18340）がある。`JDG-3512` は `delayDiagnosis`・`readDelayDiagnosis` | rulings:3704 | 用語集の席が直す |
| C-5 | 用語集の下書きにまだ `doubtfulOrMissing`（glossary:1806）がある。`JDG-3508`・`JDG-3762` は `suspicion`・`omission` に分けた。β は分けた（beta:2397） | rulings:3700・3912 | 用語集の席が直す |
| C-6 | `parts` の ja（members:556）は `settledPushOuts`・`derivedParentTasks`・`lateDays` を挙げず、en（members:557）は挙げる | 前の作業の所見 | 新しい名で両方を書く |
| C-7 | ja の説明は値の行 ID `DW-1`〜`DW-3` を書く（members:579）。en は「終わりの数」で言う（members:590）。どちらも `JDG-3285` に反する | members:579・590 | 値の名が決まれば名で書く |
| C-8 | 修正案の `key` が行 ID を含む（fixes:1165）。`JDG-3285` は外に出す値の行 ID を禁じる | fixes:1165 | 名が決まれば名を使う。鍵の形は振る舞いなので方針で決める（`JDG-3686` rulings:3836） |
| C-9 | `taskGroupAboveWithoutSpanBar` はタスクグループの名か、名が無いときは id を入れる。1 つのキーに 2 種の値（P-4） | diag:587 | Q4 の名と一緒に、値を名だけか id だけにする（振る舞いなので方針で） |
| C-10 | `fixRow` と `findingRow` は 1 対 1（`FA-n` ↔ 観点） | fixes:1103〜1145、req:3986〜4011 | #65 で `fixRow` を無くす |
| C-11 | `DW-1` は「矛盾を持つ」、`DW-2` は `VO-4` と同じ物 | req:3775・3776 | #52・#53 で同じ語を使う（P-4） |
| C-12 | `layer` を `layerIndex` にすると値が 1 つずれる（1〜6 → 0〜5） | req:3651、diag:344 | #22。`JDG-3776` の理由（数え方を 1 つ）のとおり |
| C-13 | 表 T-317 に `derivedParentTasks` の行が無い | req:3870〜3887 | 前の作業の所見のまま |
| C-14 | 値の日付の字の形が混ざる（日時と日） | fixes:240・646 | #93・#102。形を決めてから名を決める |
| C-15 | 表 T-314 はまだ英の列に `inheritedDelayMinutes`・`selfDelayMinutes`・`pushOutMinutes` を書く | req:3765〜3767 | `CR-851`・`CR-857` が直す（裁定は済み） |

## 12. 持ち主に問う（4 問）

### Q1 `outcome`（診断したか）

値は 2 つだけ: 診断した ／ 基準日が無いので診断しなかった（req:3876）。

| 案 | 名 | 根拠 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `isDiagnosed`（真偽） | P-7・N-9。答えの `…Outcome` の語とぶつからない（C-2） | 値の形が字から真偽に変わる |
| b | `diagnosisResult`（値は今の 2 つ） | 形を変えない | 「結果」を診断の中身と読み違えうる |
| c | 無くす | 基準日が無いときは `statusDate` を書かない（N-12）ので、それで分かる | AI が欄の無いことから読み取る必要がある |

### Q2 `terminalsReached`（届いた末端の数）

| 案 | 名 | 根拠 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `reachedEndTaskCount` | 後の決まり P-8（個数は `…Count`）。`rowCount`・`taskRowCount`（list:261・262）と同じ形 | `JDG-3473` の名を改める |
| b | `endTasksReached` | `JDG-3473` のまま | P-8 に合わない |
| c | `endTaskCount` | 短い | 「届いた」が名から落ちる |

### Q3 `markerStates`（タスクごとの診断の状態）

値は `unreliable`・`bottleneck`・`bottleneckPath`・`delay`（#59・#60）。中の欄の名もこれに従う。

| 案 | 名 | 根拠 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `diagnosisMarks`（中は `taskUid`・`diagnosisMark`） | β の説明（beta:2397）が 3 つの値を「the diagnosis marks」と呼ぶ（P-4）。`JDG-3372` の語 Mark | `delay` は診断の前から付く印（req:3832）も入る |
| b | `progressStatusMarks`（中は `progressStatusMark`） | `JDG-3742` rulings:3892 の語「進捗ステータスマーク」 | 5 つの進捗ステータスを入れない。`DX-8` は「日程表に描く印ではない」（req:3883） |
| c | `diagnosisStatuses`（中は `diagnosisStatus`） | 列の名 `diagnosisStatus`（`JDG-3726`） | 列の値の組（`suspicion`・`omission`・`finishedDelayContribution` を含む、beta:2397）と違う |

### Q4 まとめの問い —— 新しい英語の名の表（「表のとおり」か、直す行に ★）

規則は「名を付ける」までしか決めない。語の選びだけが残る行を 1 つの表にした。持ち主の言う「小さい問いは 1 つの GQA に」に従う。

**Q4-1 指摘の観点のキー（#17・#67）**

| 案 | 名 | 根拠 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `reason`（修正案の行では `findingReason`） | 表の列「理由」が観点の語を見せる。その列の名は `diagnosisReason`（`JDG-3726`）。値は P-10 と同じ「何が・どうなった」の名 | 断りの `reason` と同じ語（持ち主が違うので N-4 で読める） |
| b | `check` | 観点 1 行は 1 つの検査 | 新しい語 |

**Q4-2 観点の名（#18、26 名）と止まった訳の名（#53・#54）**

前置詞（P-5）を避け、β の語（`percentComplete`・`actualStart` など）と用語集の語（`dependency`・`milestone`）を使った。画面の語は words:6653〜6809。

| 行 | 中身（req） | 推しの名 |
|:---|:---|:---|
| VC-1 | 依存に輪がある（:3657） | `dependencyCycle` |
| VC-2 | 自己依存（:3658） | `selfDependency` |
| VC-3 | 同じ向きの依存が 2 本以上（:3659） | `duplicateDependency` |
| VC-4 | マイルストーンなのに開始と終了が違う（:3660） | `milestoneDatesDiffer` |
| VC-5 | 完了率が 0 より大きいのに実績開始が無い（:3661） | `percentCompleteNoActualStart` |
| VC-6 | 実績終了があるのに実績開始が無い（:3662） | `actualFinishNoActualStart` |
| VC-7 | 未着手なのに中断・再開の日を持つ（:3663） | `notStartedSuspended` |
| VC-8 | 実績終了があるのに再開日が有効（:3664） | `finishedResumeConfirmed` |
| VC-9 | 親が完了なのに子に未完了（:3665） | `parentFinishedChildUnfinished` |
| VC-10 | 子が全部完了なのに親が未完了（:3666） | `childrenFinishedParentUnfinished` |
| VC-11 | 親の予定の両端が子と違う（:3667） | `parentPlanSpanMismatch` |
| VC-12 | 親の実績の両端が子と違う（:3668） | `parentActualSpanMismatch` |
| VC-13 | 後続が完了なのに縛る先行の端が起きていない（:3669） | `bindingPredecessorEndMissing` |
| VC-14 | 手で完了にしたマイルストーンの先行に未完了（:3670） | `milestoneFinishedPredecessorUnfinished` |
| VC-15 | 予定の日付が依存の向きに反する（:3671） | `planDatesViolateDependency` |
| VS-1 | 親子の間に依存がある（:3683） | `parentChildDependency` |
| VS-2 | 子を持つマイルストーン（:3684） | `milestoneHasChildren` |
| VS-3 | 先行が未着手なのに後続が着手済み（:3685） | `successorStartedPredecessorNotStarted` |
| VS-4 | 実績の日付が依存の向きに反する（:3686） | `actualDatesViolateDependency` |
| VS-5 | 実績の日付が基準日より後（:3687） | `futureActualDate` |
| VS-6 | 親の進捗の点が子孫の点の範囲を外れる（:3688） | `parentProgressPointMismatch` |
| VO-1 | 実績開始が無い（:3698） | `actualStartMissing` |
| VO-2 | 実績終了も中断も無い（:3699） | `actualFinishMissing` |
| VO-3 | FS の後続が着手済みなのに先行に実績終了が無い（:3700） | `predecessorActualFinishMissing` |
| VO-4 | 親が 1 つに決まらない（:3701） | `parentTaskUndecided`（`DW-2` も同じ名） |
| VO-5 | 達成しているのに手の実績終了が無い（:3702） | `milestoneAchievedNotFinished` |
| DW-3 | 先行の無いマイルストーン（:3777） | `milestonePredecessorMissing` |

**Q4-3 そのほかのキーと値**

| # | 今の名 | 推しの名 | もう 1 つの案 | 訳 |
|:---|:---|:---|:---|:---|
| #41 | `taskGroupAboveWithoutSpanBar` | `spanlessParentTaskGroupName` | `parentTaskGroupName` | 前置詞を避ける（P-5）。値は名に決める（C-9） |
| #84 | `openField` | `focusTarget` | `focusedField` | 「open」は読みが 2 つ（P-5）。中は `taskUid` と `propertyField` |
| #88 | `depth` | `parentTaskDepth` | `taskTreeDepth` | 用語集の Depth（タスクグループの木）と分ける（P-4） |
| #94 | `value`（真偽） | 今のまま | `isOn` | 入れ物の欄で、答えの真偽ではない |
| #100 | `deleteLinkBetween` | `deleteNamedDependency` | `deleteDependencyLine` | Between は前置詞。Link は命令の語 Dependency にそろえる |
| #100 | `keepThisLink` | `keepDependency` | `keepOneDependency` | This は指す語（P-5） |
| #100 | `finishChildrenOnParentFinish` | `finishChildrenParentFinishDay` | `finishOpenChildren` | On は前置詞 |
| #100 | `finishPredecessorsOnMilestoneDate` | `finishPredecessorsMilestoneDay` | `finishOpenPredecessors` | 同上 |
| #100 | `makeParentTaskFromTaskGroup` | `makeTaskGroupParentTask` | `createParentTaskForTaskGroup` | From は前置詞（P-5 の例） |
| #100 | `markAsStarted`・`markAsFinished`・`markAsStillInProgress` | `markStarted`・`markFinished`・`markStillInProgress` | 今のまま | As は前置詞 |

注: #98 の `deleteLink` も、#100 の行と合わせて `deleteDependency` にそろえるかを、この表で一緒に見てもらうとよい（P-4。今は P-12 で今のままとした）。

## 13. 数

数え方: 表の「数」の列を足した。値の組は値 1 つを 1 名。同じ名が何か所にあっても 1 度だけ数えた（`uid` 7 か所は #23 の 1 名）。9-1 の #95 と 9-4 の共通の欄は数えていない。

| 仕分け | 名の数 | 行 |
|:---|:---|:---|
| 既決 | 63 | 6・7・8・10・13・15・16・20・27・28・40・42・43・44・47・59・60・63・73・90・101・104〜112・116・118・119 |
| 方針で一つ | 151 | 3・4・5・11・12・14・19・21〜26・29〜39・46・48〜52・55〜57・61・62・64〜66・68〜72・74〜83・85〜87・89・91〜93・96〜99・102・103・113〜115・117・120〜124 |
| 持ち主に問う | 51 | Q1: 1・2 ／ Q2: 45 ／ Q3: 9・58・125 ／ Q4: 17・18・41・53・54・67・84・88・94・100・126 |
| 計 | 265 | 126 行（#95 は 0 名） |

方針で一つ 151 名のうち、名を無くすものは 28（#65・#66 の `fixRow` と `FA-1`〜`FA-26`、#117 の型）。今のままは 60、改めるのは 63（「新しい名」の列が「今のまま」か「無くす」で始まるかで数えた）。

持ち主に問う 51 名は 4 問にまとまる。うち 36 名（観点 26・止まった訳 2・択の語 8）は Q4 の 1 枚の表で答えられる。

| 問 | 名 | 推し |
|:---|:---|:---|
| Q1 | `outcome` と値 2 つ | `isDiagnosed` |
| Q2 | `terminalsReached` | `reachedEndTaskCount` |
| Q3 | `markerStates`・中の `row`・型 2 つ | `diagnosisMarks`・`diagnosisMark` |
| Q4 | 観点のキーと 26 名、`DW-2`・`DW-3`、`taskGroupAboveWithoutSpanBar`・`openField`・`depth`・真偽の `value`・択の語 8・`findingRow`・型 `DelayFixOpenField` | 表のとおり |

前の作業の 5 問のうち、`lateDays`（前 #22）と `walls[].row`（前 #34）は規則で決まるので問いから外した（#12・#51 に訳）。残り 3 つ（前 #19・#23・#31）は Q3・Q1・Q2 のまま。
