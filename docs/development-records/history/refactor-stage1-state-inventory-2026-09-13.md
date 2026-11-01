# リファクタ 段 1（棚卸し）—— 保存しない状態と、その依存の一覧（2026-09-13 立案の計画に対する実測）

**本書は、`refactor-plan-report-2026-09-13.md` の段 1 の成果物である。** コードは読んだだけで、1 行も変えていない。
⭐ 数にはすべて測り方を添える（記録の 1 節）。⚠️ 行の要旨から判断したものは「判断」と書く。
⛔ 決めること（遷移の持ち主の 2 択など）は前に立つ者が行う。本書は材料だけを置く。

---

## 現在地

- **一覧は 101 行である。** 内訳は下の表のとおり。
- **`frameLoop` が直に持つ `let` は 60 で、計画の数と一致した。** 一覧の該当節の行も 60 で、欠け・重複は 0（記録の 1 節で照合した）。
- **UseCase のモジュール状態は 2 で、計画の数と一致した。** ただし `src/` 全体では 5 である（Framework に 3 つ。記録の 2 節）。
- **領域ごとの数は、計画の仮分けと 6 領域で食い違った**（記録の 3 節）。
- **仕様が名指す状態は 44、名指さない（実装の都合）は 57**（`frameLoop` の 60 に限れば 38 と 22）。記録の 5 節。

| 一覧の節 | 行数 | 何を数えたか |
|---|---|---|
| A. `frameLoop` の `let` | 60 | `frame-loop.ts` の 1458〜3630 行（`frameLoop` の本体）で、字下げ 2 の `let` |
| B. `frameLoop` の中身を変える `const` | 1 | 同じ範囲で、字下げ 2 の `const` のうち、中身を書き換えるもの |
| C. `boot` のクロージャ状態 | 10 | `single-html-shell.ts` の `boot`（240〜437 行）で、字下げ 2 の `let` |
| D. `domScreenSurface` のクロージャ状態 | 25 | `dom-screen-surface.ts` の `domScreenSurface`（1890〜2699 行）で、字下げ 2 の `let` 23 と、中身を書き換える `const` 2 |
| E. モジュールスコープの可変状態 | 5 | `src/` の全 `.ts` で、トップレベルの `let`、および中身を書き換えるトップレベルの `const` |
| 計 | 101 | |

---

## 状態表

**欄の読み方:**
- 所在は宣言の行。書き手と読み手は `関数名:行`。`carryOutAction` は `case` の名を `[ ]` で添えた。
- 読み手の数には宣言の行を含めない。同じ行で読んで書く場合は、書き手と読み手の両方に数えた。
- 依存は、書く・読む行と同じ行、およびその直前 4 行の `if` の条件に現れる他の状態（機械）に、読んで足したもの（判断）。
- 変わる速さ: 離散（押す・掴む・問い・書き込み・入口）／連続（ポインタ座標・寸法・時刻。計画 4 節の「状態機械に入れない」側）。
- 非同期: 「はい（直）」は、`async` 関数の中で `await` の後に読み書きするか、`Promise` の待ちの間ずっと立っている。「はい（1 段）」は、`await` の後に呼ぶ関数（`holder.replace` ・ `replaceHeldDocument` ・ `raiseNotice` ・ `tellWhatTheImportDropped`）の中で書く。タイマーの起床は「タイマー」と書き、`await` とは分けた。

### A. `frameLoop` の `let`（`src/framework/single-html-shell/frame-loop.ts`）

| 状態 | 所在 | 型 | 初期値 | 書き手 | 読み手 | 依存 | 速さ | 領域 | 仕様の名 | 非同期 |
|---|---|---|---|---|---|---|---|---|---|---|
| `held` | 1471 | `HeldDocument` | 引数の文書と空の履歴 | 1 — `holder.replace`:1583（UseCase の `applyDocumentChange` / `replaceDocument` が呼ぶ） | 34 — `runFrame`×4、`carryOutAction`×3、`openDocumentIntoHold`×3、`holder.replace`×2、`answerSettledEntry`×2、`pasteWhatWasCopied`×2、`standOnWhatWasCreated`×2、`owesFrame`×2、ほか 14 関数×1 | 書くとき `selection`（刈る）・`watermarkStampedAt`（刻む）・`namingCreatedTaskUid`・`environment`（`ask` のガード）。読むとき `previewDocument`（`runFrame` で優先） | 離散 | 文書と現在値の芯 | `CS-4`、表 T-230 | はい（直）— `openDocumentIntoHold`:2631・2647 は `await` の後で読む。`saveHeldDocumentToFile`:2706 は最初の `await` の前で捕まえる |
| `environment` | 1472 | `FrameEnvironment`（推論） | 引数 `env` | 2 — `resize`:3593、`settleFirstFrameEnvironment`:3601 | 30 — `exportScene`×7、`runFrame`×6、`collectInputContext`×2、`resize`×2、ほか 13 か所×1。うち `settled(environment)` のガードが `ask` の前に 10 か所 | 書くとき前の値（`isSameEnvironment`） | 連続 | （10 領域の外）環境の値 | `BO-1` | いいえ |
| `selection` | 1473 | `Selection` | `emptySelection()` | 4 — `holder.replace`:1585、`carryOutAction['settleTextEntry']`:3174、`standOnWhatWasCreated`:3322、`receiveInput`:3455 | 16 — `receiveInput`×3、`runFrame`×3、`holder.replace`×2、`showPropertiesOfChoice`×2、`owesFrame`×2、ほか 4 | `held`（刈る）、`namingCreatedTaskUid`（動いたら消す）、`asking`・`screenState`（settleTextEntry のガード） | 離散 | 選択 | `SL-1` | はい（1 段）— `holder.replace` |
| `screenState` | 1474 | `ScreenState` | `emptyScreenState()` | 9 — `answerWatermarkUnlock`:2024、`matchWatermarkUnlock`:2042、`askHowToOpen`:2453、`askWhichFileToTakeFrom`:2471、`tellWhatTheImportDropped`:2508、`answerSettledEntry`:2940・2951、`answerSettledFormat`:2965、`receiveInput`:3459 | 25 — `receiveInput`×6、`runFrame`×2、`answerWatermarkUnlock`×2、`collectInputContext`×2、`answerSettledEntry`×2、`owesFrame`×2、ほか 9 | `asking`（`isSurfaceStanding`）、`dualCursorFollowing`（`pressRowOf`）、`isPaletteMinimised`、`openChoosing`・`mergeChoosing`・`droppedTaskNames`（面が閉じたら片付ける） | 離散 | 画面の値 | `CP-36`、`S-99e`・`S-99f`・`S-99g`・`S-144` | はい（直）— `matchWatermarkUnlock`:2042 は `await sha256HexOf` の後で書く |
| `watermarkStampedAt` | 1475 | `string`（推論） | `readInstantOfWrite()` | 1 — `holder.replace`:1581 | 1 — `watermarkNow`:1485 | `held`（文書が変わったときだけ刻む）、`screenState.watermarkVisible` | 離散 | 画面の値 | `FR-020`（実行時の日時） | はい（1 段）— `holder.replace` |
| `values` | 1488 | `FrameValues` ／ `null` | `null` | 1 — `runFrame`:1770 | 6 — `runFrame`:1792、`repeatHeldEntry`:1912、`readSnapshot`:2222、`receiveInput`:3390、`isBrowserDefaultStopped`:3572、`current`:3606 | 作るときに `environment`・`held`・`previewDocument`・`selection`・`isLevelZeroFolded`・`addedRowOwedSight` ほか | 離散（フレームごとの派生値） | 文書と現在値の芯 | 実装の都合 | いいえ |
| `owed` | 1489 | `boolean`（推論） | `false` | 2 — `runFrame`:1737、`ask`:1882 | 1 — `ask`:1881 | なし | 離散 | 文書と現在値の芯 | 実装の都合 | いいえ |
| `pressed` | 1490 | `PointerPress` ／ `null` | `null` | 5 — `carryOutAction['moveCommandPalette']`:3225、`carryOutAction['followRowGrab']`:3234、`receiveInput`:3415・3473・3508 | 16 — `receiveInput`×5、`carryOutAction`×3、`owesFrame`×2、ほか 6 | `partUnderPointer`（押下時）、`screenState`・`dualCursorFollowing`（`collectPress`）、`pointerAt`（範囲選択・プレビュー） | 離散。ただし `followedTo`（3508）はポインタ移動ごと | 身振り | `CS-2`、`AG-9`、`PTD-1` | いいえ |
| `previewDocument` | 1491 | `Document` ／ `null` | `null` | 2 — `replaceHeldDocument`:2417、`receiveInput`:3543 | 1 — `runFrame`:1738 | `pressed`・`pointerAt`・`held`（`previewOfHeldPress`） | 連続（移動ごとに作り直す） | 身振り | 実装の都合 | はい（1 段）— `replaceHeldDocument` |
| `commandPaletteDraggedTo` | 1492 | 座標 ／ `null` | `null` | 2 — `carryOutAction['moveCommandPalette']`:3222、`receiveInput`:3479 | 3 — `runFrame`:1842、`carryOutAction`:3221、`receiveInput`:3418 | `commandPaletteCornerAtPress`（中断で戻す） | 連続（掴んでいる間）。離した後は置き場所として残る | 画面の値 | `FR-053`、`GR-19` | いいえ |
| `commandPaletteCornerAtPress` | 1493 | 座標 ／ `null` | `null` | 2 — `receiveInput`:3416・3481 | 2 — `receiveInput`:3478・3479 | `partUnderPointer`（`IC-53` の上か）、`commandPaletteDraggedTo` | 離散（押した時点の値） | 身振り | 実装の都合 | いいえ |
| `rowGrabbedAt` | 1494 | 行・段・軸・抵抗・縦位置 ／ `null` | `null` | 2 — `carryOutAction['followRowGrab']`:3235、`receiveInput`:3482 | 1 — `runFrame`:1843 | `pressed`（軸を押下へ戻す） | 連続（`atY`・`resistedPx`） | 身振り | `HF-15` | いいえ |
| `isLevelZeroFolded` | 1501 | `boolean` | `false` | 2 — `carryOutAction['setLevelZeroFolded']`:3289、`standOnWhatWasCreated`:3330 | 7 — `runFrame`×2、`exportScene`×2、`collectInputContext`、`pasteWhatWasCopied`、`standOnWhatWasCreated` | `held`（作った行が段 0 か） | 離散 | 画面の値 | `HR-2` | いいえ |
| `isMilestoneListOpen` | 1503 | `boolean` | `false` | 1 — `answerSettledEntry`:2893 | 3 — `recordFrame`、`runFrame`、`answerSettledEntry` | なし | 離散 | 画面の値 | `S-142`、`IC-50` | いいえ |
| `isPaletteMinimised` | 1504 | `boolean` | `false` | 2 — `answerSettledEntry`:2880、`receiveInput`:3460 | 3 — `recordFrame`、`runFrame`、`answerSettledEntry` | `screenState.paletteShown`（出し直したら下ろす） | 離散 | 画面の値 | `S-200`、`IC-75` | いいえ |
| `isRecordingInteractions` | 1505 | `boolean` | `false` | 2 — `turnInteractionRecord`:1720・1726 | 5 — `recordLine`、`recordHappening`、`recordFrame`、`turnInteractionRecord`、`runFrame` | 記録の 3 つの数と `interactionRecord`（切り替えで空にする） | 離散 | 操作の記録 | `S-206`、`FR-102` | いいえ |
| `interactionRecordDropped` | 1507 | `number` | `0` | 3 — `recordLine`:1636、`turnInteractionRecord`:1717・1728 | 1 — `interactionRecordText`:1705 | `isRecordingInteractions`（ガード）、`S-207` | 離散 | 操作の記録 | 実装の都合 | いいえ |
| `interactionRecordBeganAt` | 1508 | `number` | `0` | 1 — `turnInteractionRecord`:1719 | 1 — `recordLine`:1632 | `isRecordingInteractions` | 連続（時刻） | 操作の記録 | 実装の都合 | いいえ |
| `interactionRecordOffered` | 1509 | `number` | `0` | 3 — `recordLine`:1631、`turnInteractionRecord`:1718・1729 | 2 — `recordLine`:1633、`interactionRecordText`:1704 | `isRecordingInteractions`、`interactionRecord` | 離散 | 操作の記録 | 実装の都合 | いいえ |
| `fromStartupTemplate` | 1512 | `boolean` | 引数 `startedFromTemplate` | 2 — `replaceHeldDocument`:2419・2420 | 2 — `runFrame`:1751、`exportScene`:2082 | 置き換えの行（`RD-4` で下ろし `RD-7` で立てる） | 離散 | 文書と現在値の芯 | 実装の都合（由来は `BT-4`） | はい（1 段）— `replaceHeldDocument` |
| `openedFileName` | 1513 | `string` ／ `null` | `null` | 1 — `saveHeldDocumentToFile`:2722 | 1 — `runFrame`:1829 | なし | 離散 | ファイル操作と問いの待ち | `FR-101` | はい（直）— `await` の後で書く |
| `fileSavedAt` | 1514 | `string` ／ `null` | `null` | 1 — `saveHeldDocumentToFile`:2724 | 1 — `runFrame`:1830 | なし | 離散 | ファイル操作と問いの待ち | `FR-101` | はい（直） |
| `hasUnsavedEdits` | 1515 | `boolean` | `false` | 3 — `writeDocument`:2394、`replaceHeldDocument`:2418、`saveHeldDocumentToFile`:2725 | 1 — 公開の口 `hasUnsavedEdits`:3564 | 置き換えの行（`RD-4` / `RD-6` / `RD-7`） | 離散 | ファイル操作と問いの待ち | `FR-100` | はい（直） |
| `selectedGroupIds` | 1518 | `readonly string[]` | `[]` | 4 — `carryOutAction['chooseRow']`:3248・3250・3252、`standOnWhatWasCreated`:3331 | 9 — `copyForPaste`×3、`pasteCommandFor`×2、`showPropertiesOfChoice`×2、`runFrame`、`carryOutAction` | `selection`（`showPropertiesOfChoice`）、`copiedForPaste` | 離散 | 選択 | `FR-085`、`FR-042`（置き場は PND-142 が未裁定） | いいえ |
| `copiedForPaste` | 1519 | 行か `Task` ／ `null` | `null` | 2 — `copyForPaste`:2985・2992 | 1 — `pasteWhatWasCopied`:3001 | `selectedGroupIds`・`selection`（ガード） | 離散 | 選択 | `FR-033` | いいえ |
| `selectedResourceUids` | 1525 | `readonly number[]` | `[]` | 2 — `carryOutAction['chooseResources']`:3262、`carryOutAction['toggleChosenResource']`:3268 | 3 — `runFrame`、`answerSettledEntry`:2914、`carryOutAction`:3267 | `asking`（削除のガード）。`held` の削除で刈られない（DFC-541 ①） | 離散 | 選択 | `FR-099`（置き場は PND-143） | いいえ |
| `propertiesShowing` | 1528 | `PropertiesShowing` | `null` | 2 — `carryOutAction['toggleDocumentSettingsProperties']`:3280、`showPropertiesOfChoice`:3309 | 3 — `propertiesShowingNow`、`withPropertiesPanelShown`、`carryOutAction` | `isPropertiesPanelPutAway`（読むときに重ねる）、`selection`・`selectedGroupIds`（ガード） | 離散 | 画面の値 | `S-99h`（PND-144） | いいえ |
| `propertiesSubject` | 1529 | `PropertiesSubject` ／ `null` | `null` | 1 — `showPropertiesOfChoice`:3312 | 1 — `runFrame`:1852 | `selection`・`selectedGroupIds` | 離散 | 画面の値 | 実装の都合（PND-144） | いいえ |
| `isPropertiesPanelPutAway` | 1532 | `boolean` | `false` | 7 — `answerSettledEntry`:2860、`carryOutAction['settleTextEntry']`:3173・3178、`carryOutAction['toggleDocumentSettingsProperties']`:3277、`showPropertiesOfChoice`:3308、`receiveInput`:3423・3465 | 2 — `propertiesShowingNow`、`withPropertiesPanelShown` | `propertiesShowing`、`namingCreatedTaskUid`・`didSettleFieldEntry`・`screenState`・`asking`（settleTextEntry）、`partUnderPointer.dividerPanel` | 離散 | 画面の値 | `S-99h`（PND-338） | いいえ |
| `isAgentApiEnabled` | 1533 | `boolean` | `startupAgentApiEnabled()` | 1 — `setAgentApiEnabled`:2214 | 6 — `carryOutAction`×2、`runFrame`、`setAgentApiEnabled`、`answerSettledEntry`、`watchAgentApiEnabling` | `agentApiEnablingWatch`（書いたら知らせる） | 離散 | Agent API | `S-99b`、`FR-065` | いいえ |
| `agentApiEnablingWatch` | 1534 | 関数 ／ `null` | `null` | 1 — `watchAgentApiEnabling`:3622 | 1 — `setAgentApiEnabled`:2216 | `isAgentApiEnabled` | 離散（起動時に 1 回） | Agent API | 実装の都合 | いいえ |
| `isDialogueFieldVisible` | 1535 | `boolean` | `true` | 1 — `carryOutAction['toggleDialogueFieldVisible']`:3299 | 2 — `runFrame`、`carryOutAction` | なし（PND-419） | 離散 | 画面の値 | `S-99i`、`FR-066` | いいえ |
| `language` | 1536 | `DisplayLanguage` | 配線の値か `startupDisplayLanguage()` | 1 — `answerSettledEntry`:2875 | 6 — `runFrame`×2、`exportScene`×2、`answerSettledEntry`×2 | なし | 離散 | 画面の値 | `S-99`、`FR-038` | いいえ |
| `raisedNotices` | 1537 | `readonly RaisedNotice[]` | `[]` | 4 — `raiseNotice`:1975・1983、`dismissNewestNotice`:2004、`receiveInput`:3429 | 10 — `dismissNewestNotice`×2、`receiveInput`×2、`recordFrame`、`runFrame`、`raiseNotice`、`noticesWithout`、`collectInputContext`、`owesFrame` | `noticeReasonsOnArrival`（消す順）、`partUnderPointer.noticeDismissKey`、`environment` | 離散 | 通知 | `NT-3`、`NT-8`、`FR-076` | はい（1 段）— `raiseNotice` |
| `stackSafetyCapToldFor` | 1538 | `string` ／ `null` | `null` | 2 — `runFrame`:1764・1767 | 1 — `runFrame`:1763 | フレームの値の `stackSafetyCapReached` | 離散（フレームごとの判定） | 通知 | 実装の都合（理由は `RS-24`） | いいえ |
| `stackSafetyCapOfLastExportScene` | 1540 | `string` ／ `null` | `null` | 1 — `exportScene`:2094 | 2 — `exportPictureContent`:2776、`carryOutAction['copyPictureToClipboard']`:3124 | `stackSafetyCapOwedByPictureExport` | 離散 | 通知 | 実装の都合 | いいえ（読み手 2 つとも `await` の前で写す。`exportScene` は Agent API の `readSnapshot` からも呼ばれて上書きする） |
| `stackSafetyCapOwedByPictureExport` | 1541 | `string` ／ `null` | `null` | 3 — `exportHeldDocumentToFile`:2740・2753、`exportPictureContent`:2776 | 1 — `exportHeldDocumentToFile`:2752 | `stackSafetyCapOfLastExportScene` | 離散 | 通知 | 実装の都合 | はい（直）— 2752・2753 は `await saveDocumentFile` の後 |
| `asking` | 1543 | 問いと `settle` ／ `null` | `null` | 5 — `answerConfirmation`:2014、`askToWriteOverDestination`:2432、`askToDiscardCurrentDocument`:2480、`answerSettledEntry`:2925、`carryOutAction['changeDocument']`:3074 | 17 — `carryOutAction`×5、`answerSettledEntry`×2、`receiveInput`×2、`isBrowserDefaultStopped`×2、ほか 6 | `isFileOperationWaiting`・`openChoosing`（同じガードに 5 回並ぶ）、`screenState`（`isSurfaceStanding`） | 離散 | ファイル操作と問いの待ち | `NT-7`、`FR-032`、`QN-4`、`QN-5` | はい（直）— `startNewDocument`:2498 と `openDocumentIntoHold`:2609 が答えを `await` で待つ |
| `openChoosing` | 1548 | `settle` ／ `null` | `null` | 3 — `askHowToOpen`:2447、`answerSettledEntry`:2939、`receiveInput`:3519 | 8 — `carryOutAction`×3、`receiveInput`×2、`takeInHandedDocument`、`answerSettledEntry`、`answerSettledFormat` | `screenState.surface`（閉じたら `null` で落とす）、`asking`・`isFileOperationWaiting` | 離散 | ファイル操作と問いの待ち | `OP-3` | はい（直）— `openDocumentIntoHold`:2605 |
| `mergeChoosing` | 1553 | `settle` ／ `null` | `null` | 3 — `askWhichFileToTakeFrom`:2464、`answerSettledEntry`:2948、`receiveInput`:3525 | 3 — `answerSettledEntry`:2946、`receiveInput`:3523・3524 | `screenState.surface`、`mergeCandidates`・`unreadColumns`（一緒に空にする） | 離散 | ファイル操作と問いの待ち | `FR-022`、`U-61` | はい（直）— `openDocumentIntoHold`:2633 |
| `mergeCandidates` | 1557 | `readonly MergeCandidateLine[]` | `[]` | 3 — `askWhichFileToTakeFrom`:2470、`answerSettledEntry`:2949、`receiveInput`:3526 | 1 — `runFrame`:1854 | `mergeChoosing`、`screenState` | 離散 | ファイル操作と問いの待ち | `U-61` | はい（直）— 待ちの間だけ立つ |
| `unreadColumns` | 1558 | `readonly string[]` | `[]` | 3 — `openDocumentIntoHold`:2558、`answerSettledEntry`:2950、`receiveInput`:3527 | 1 — `runFrame`:1855 | `mergeChoosing`・`screenState`（片付けは合流の面にだけ付く） | 離散 | ファイル操作と問いの待ち | `FR-073`（DFC-561） | はい（直）— 2558 は `await openDocumentFile` の後 |
| `droppedTaskNames` | 1559 | `readonly (string or null)[]` | `[]` | 2 — `tellWhatTheImportDropped`:2507、`receiveInput`:3532 | 2 — `runFrame`:1856、`receiveInput`:3531 | `screenState.surface`（取り込みの報告の面） | 離散 | ファイル操作と問いの待ち | `U-62`、`FR-023` | はい（1 段）— `tellWhatTheImportDropped` |
| `isFileOperationWaiting` | 1560 | `boolean` | `false` | 6 — `endFileOperationWait`:1874、`takeInHandedDocument`:2686、`answerSettledFormat`:2975、`carryOutAction`:3116・3150・3161 | 5 — `carryOutAction`×3、`takeInHandedDocument`、`answerSettledFormat` | `asking`・`openChoosing`（同じ行のガード） | 離散 | ファイル操作と問いの待ち | `OP-8`、`CS-4` | はい（直）— 立ててから `.finally(endFileOperationWait)` まで `await` を丸ごとまたぐ（PND-187） |
| `pointerAt` | 1561 | 座標 ／ `null` | `null` | 1 — `receiveInput`:3409 | 9 — `runFrame`×4、`receiveInput`×5 | `pressed`（範囲選択・プレビュー）、`dualCursorFollowing`、`partUnderPointer`・`grabUnderPointer` | 連続 | ポインタとツールチップ | 実装の都合 | いいえ |
| `partUnderPointer` | 1562 | `ScreenPart` ／ `null` | `null` | 1 — `receiveInput`:3412 | 11 — `receiveInput`×9、`runFrame`、`owesFrame` | `pressed`、`raisedNotices`（消す鍵）、`isPropertiesPanelPutAway`（境界の押下）、`commandPaletteDraggedTo` | 連続（移動ごとに問い直す） | ポインタとツールチップ | 実装の都合（PND-141） | いいえ |
| `grabUnderPointer` | 1563 | `Grabbed` ／ `null` | `null` | 1 — `receiveInput`:3537 | 7 — `runFrame`×3、`receiveInput`×3、`owesFrame` | `pointerAt`・`partUnderPointer`・`dualCursorFollowing`（`grabAtPointer`） | 連続 | ポインタとツールチップ | 実装の都合 | いいえ |
| `isTooltipStanding` | 1564 | `boolean` | `false` | 1 — `runFrame`:1862 | 3 — `owesFrame`、`receiveInput`:3451、`isBrowserDefaultStopped`:3582 | 画面の記述の `tooltips`（フレームの派生） | 離散 | ポインタとツールチップ | `IN-4`（出ている説明の段） | いいえ |
| `isTooltipDismissed` | 1565 | `boolean` | `false` | 2 — `receiveInput`:3411・3453 | 1 — `runFrame`:1841 | `pointerAt`（動いたら戻す） | 離散 | ポインタとツールチップ | `IN-3`（消せること） | いいえ |
| `pointerRestingSince` | 1566 | `number` ／ `null` | `null` | 1 — `beginPointerRest`:1890 | 1 — `runFrame`:1740 | `pointerAt`（動いたときだけ） | 連続（時刻） | ポインタとツールチップ | 実装の都合（待ち時間は `EZ-2`・`S-124`） | タイマー |
| `callOffIconHintWait` | 1567 | 関数 ／ `null` | `null` | 3 — `beginPointerRest`:1892・1895（タイマーの中）・1898 | 1 — `beginPointerRest`:1891 | 文書の設定 `iconHintDelayMs` | 離散 | ポインタとツールチップ | 実装の都合 | タイマー |
| `callOffEntryRepeat` | 1568 | 関数 ／ `null` | `null` | 3 — `beginEntryRepeat` の `tickAfter`:1934（タイマーの中）・1940、`endEntryRepeat`:1948 | 1 — `endEntryRepeat`:1947 | `pressed`（`pressHeldOnRepeatingEntry`） | 離散 | 身振り | 実装の都合（繰り返しは `FR-018`・`S-172`・`S-173`） | タイマー |
| `dualCursorFollowing` | 1569 | `DualCursorSide` ／ `null` | `null` | 2 — `carryOutAction['setDualCursorFollowing']`:3285、`receiveInput`:3467 | 9 — `runFrame`×3、`recordFrame`、`collectPress`、`grabAtPointer`、`pointerShapeAt`、`collectInputContext`、`owesFrame` | `pointerAt`（線の位置）、`screenState`（`pressRowOf`） | 離散 | 画面の値 | `PTD-2`、`IN-4`、`CU-2` | いいえ |
| `dialogueLog` | 1571 | `DialogueLog` | `emptyDialogueLog()` | 1 — `dialogueHolder.replace`:2244 | 5 — `audience.deliver`:1595、`runFrame`、`exportScene`、`readSnapshot`、`dialogueHolder.read` | `held`（配るとき一緒に） | 離散 | Agent API | `AG-11` | いいえ |
| `isSettlingFieldCommit` | 2312 | `boolean` | `false` | 2 — `spendFieldCommit`:3378・3382 | 1 — `collectWriteMoment`:2371 | 面への問い `hasUnsettledTextEntry` | 離散（try/finally の窓） | 名前付けと入力欄の流れ | 実装の都合（`WS-2` の窓を自分の確定で閉じないため） | いいえ |
| `nameFieldWantedRow` | 2314 | `string` ／ `null` | `null` | 8 — `runFrame`:1867、`carryOutAction['editInPlace']`:3192・3197・3201・3206・3211、`standOnWhatWasCreated`:3324・3333 | 2 — `runFrame`:1865・1866 | 配線の `focusPropertyField`（描いた後） | 離散 | 名前付けと入力欄の流れ | `MK-13`、`HF-14` | いいえ |
| `namingCreatedTaskUid` | 2316 | `number` ／ `null` | `null` | 3 — `endCreatedNamingIfChosenMoved`:2320、`carryOutAction['settleTextEntry']`:3172、`standOnWhatWasCreated`:3325 | 1 — `carryOutAction`:3171 | `selection`（動いたら消す）、`asking`・`screenState`（ガード）、`isPropertiesPanelPutAway` | 離散 | 名前付けと入力欄の流れ | `FR-091` | はい（1 段）— `holder.replace` |
| `addedRowOwedSight` | 2323 | `string` ／ `null` | `null` | 2 — `runFrame`:1779、`standOnWhatWasCreated`:3334 | 2 — `runFrame`:1777・1778 | 描いた行の箱（フレームの値） | 離散 | 名前付けと入力欄の流れ | `HF-17` | いいえ |
| `noticeReasonsOnArrival` | 2326 | `ReadonlySet<string>` | 空の `Set` | 1 — `receiveInput`:3397 | 2 — `dismissNewestNotice`:2000、`receiveInput`:3444 | `raisedNotices` | 離散（入力ごと） | 通知 | 実装の都合（`NT-8` の「いちばん新しい」を押した時点で測る印） | いいえ |
| `didSettleFieldEntry` | 2328 | `boolean` | `false` | 2 — `spendFieldCommit`:3370・3375 | 1 — `carryOutAction['settleTextEntry']`:3177 | 面への問い `readFieldCommit` | 離散（入力ごと） | 名前付けと入力欄の流れ | 実装の都合（段の分け方は `SK-19`） | いいえ |

### B. `frameLoop` の中身を変える `const`（同じファイル）

| 状態 | 所在 | 型 | 初期値 | 書き手 | 読み手 | 依存 | 速さ | 領域 | 仕様の名 | 非同期 |
|---|---|---|---|---|---|---|---|---|---|---|
| `interactionRecord` | 1506 | `string[]` | `[]` | 4 — `recordLine`:1633（push）・1635（shift）、`turnInteractionRecord`:1716・1727（長さを 0） | 2 — `recordLine`:1634、`interactionRecordText`:1704 | `isRecordingInteractions`（ガード）、`interactionRecordOffered`・`interactionRecordDropped`、`S-207` | 離散 | 操作の記録 | `FR-102` | いいえ |

### C. `boot` のクロージャ状態（`src/framework/single-html-shell/single-html-shell.ts`）

| 状態 | 所在 | 型 | 初期値 | 書き手 | 読み手 | 依存 | 速さ | 領域 | 仕様の名 | 非同期 |
|---|---|---|---|---|---|---|---|---|---|---|
| `appHeaderHeightPx` | 251 | `number`（推論） | `0` | 1 — 配線 `onAppHeaderHeightPx`:332 | 1 — `nowEnvironment`:255 | `rowControlsHeightPx`、`loop`（`resize` を呼ぶ） | 連続（測った寸法） | （10 領域の外）環境の値 | 実装の都合 | いいえ |
| `rowControlsHeightPx` | 252 | `number`（推論） | `0` | 1 — 配線 `onRowControlsHeightPx`:327 | 1 — `nowEnvironment`:255 | `appHeaderHeightPx`、`loop` | 連続 | （10 領域の外）環境の値 | 実装の都合 | いいえ |
| `loop` | 253 | `FrameLoop` ／ `null` | `null` | 1 — `boot`:390 | 9 — `boot`×6、`heldTheme`、配線の 2 つ | `themeDocument`（`loop` が無い間の代わり） | 離散（起動時に 1 回） | 文書と現在値の芯 | 実装の都合 | いいえ |
| `themeDocument` | 261 | `Document` | 同梱の雛形 | 1 — `boot`:346 | 1 — `heldTheme`:265 | `loop` | 離散（起動時に 1 回） | 文書と現在値の芯 | 実装の都合 | いいえ |
| `pageGroundWritten` | 272 | `string`（推論） | 空文字 | 1 — `paintPageGround`:278 | 1 — `paintPageGround`:277 | なし | 離散 | （10 領域の外）DOM へ書いた値の覚え | 実装の都合 | いいえ |
| `documentLanguageWritten` | 282 | `string`（推論） | 空文字 | 1 — `nameDocumentLanguage`:287 | 1 — `nameDocumentLanguage`:286 | なし | 離散 | （10 領域の外）DOM へ書いた値の覚え | 実装の都合 | いいえ |
| `browserTabHeadingWritten` | 294 | `string` ／ `null` | `null` | 1 — `nameBrowserTab`:301 | 1 — `nameBrowserTab`:300 | なし | 離散 | （10 領域の外）DOM へ書いた値の覚え | 実装の都合 | いいえ |
| `focusPropertyFieldHeld` | 307 | 関数 ／ `null` | `null` | 1 — 配線 `holdFocusPropertyField`:319 | 1 — 配線 `focusPropertyField`:378 | なし | 離散（起動時に 1 回） | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `readWatermarkUnlockAnswerHeld` | 309 | 関数 ／ `null` | `null` | 1 — 配線 `holdReadWatermarkUnlockAnswer`:323 | 1 — 配線 `readWatermarkUnlockAnswer`:380 | なし | 離散（起動時に 1 回） | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `pointerShapeShown` | 361 | `string`（推論） | 空文字 | 1 — `showPointerShape`:365 | 1 — `showPointerShape`:364 | なし | 離散 | ポインタとツールチップ | 実装の都合 | いいえ |

### D. `domScreenSurface` のクロージャ状態（`src/framework/dom-screen-surface/dom-screen-surface.ts`）

⚠️ 書き手の「Esc の keydown」「Enter の keydown」「focusin」などは、`propertiesPanel` に付けた無名のリスナー（2323〜2383 行）である。

| 状態 | 所在 | 型 | 初期値 | 書き手 | 読み手 | 依存 | 速さ | 領域 | 仕様の名 | 非同期 |
|---|---|---|---|---|---|---|---|---|---|---|
| `watermarkUnlockEntry` | 1909 | `TextEntryControl` ／ `null` | `null` | 1 — `showScreenView`:2208 | 8 — `watchWatermarkUnlock` のリスナー×5、`releaseWatermarkUnlockOnPressOutside`、`readWatermarkUnlockAnswer`、`releaseTakenBackWatermarkUnlock` | `isWatermarkUnlockHeld`・`isWatermarkUnlockTakenBack` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `lastKeys` | 1943 | 部品ごとの記述の文字列 | `{}` | 1 — `showScreenView`:2239 | 3 — `showScreenView` の `changed`:2132、`showScreenView`:2147・2185 | `documentTitleEntry`・`isFieldHeld`（描き直しを見送った部品は古い鍵を残す） | 離散（フレームごと） | （10 領域の外）描き手の差分の覚え | 実装の都合 | いいえ |
| `langShown` | 1944 | `string`（推論） | 空文字 | 1 — `showScreenView`:2140 | 1 — `showScreenView`:2139 | なし | 離散 | （10 領域の外）DOM へ書いた値の覚え | 実装の都合（PND-323） | いいえ |
| `headerHeightPx` | 1945 | `number`（推論） | `0` | 1 — `reportHeaderHeight`:1983 | 7 — `placePanels`×3、`showScreenView`×2、`reportHeaderHeight`、`rowControlsMeasureKey` | `isHeaderHeightSettled` | 連続（測った寸法） | （10 領域の外）環境の値 | 実装の都合 | いいえ |
| `isHeaderHeightSettled` | 1947 | `boolean` | `false` | 1 — `reportHeaderHeight`:1982 | 1 — `reportHeaderHeight`:1981 | `headerHeightPx` | 離散 | （10 領域の外）環境の値 | 実装の都合 | いいえ |
| `rowControlsHeightPx` | 1948 | `number`（推論） | `0` | 1 — `reportRowControlsHeight`:2026 | 3 — `reportRowControlsHeight`:2015・2020・2025 | `rowControlsMeasuredAgainst`・`rowControlsPanelDrawnAtMs` | 連続 | （10 領域の外）環境の値 | 実装の都合（測る規則は `LF-3`・`HF-19`） | いいえ |
| `rowControlsMeasuredAgainst` | 1949 | `string` ／ `null` | `null` | 1 — `reportRowControlsHeight`:2019 | 1 — `reportRowControlsHeight`:2016 | `rowControlsHeightPx` | 離散 | （10 領域の外）環境の値 | 実装の都合 | いいえ |
| `rowControlsPanelDrawnAtMs` | 1950 | `number`（推論） | `0` | 1 — `reportRowControlsHeight`:2012 | 1 — `reportRowControlsHeight`:2011 | `rowControlsHeightPx` | 連続（時刻） | （10 領域の外）環境の値 | 実装の都合 | いいえ |
| `settled` | 1951 | `Settlement` ／ `null` | `null` | 2 — `onEntryKeyDown`:2036、`showScreenView`:2246 | 1 — `readDialogueInput`:2252 | `isFieldUp` | 離散 | Agent API | `AG-11`（確定した発話） | いいえ |
| `isFieldUp` | 1952 | `boolean` | `false` | 1 — `showScreenView`:2224 | 2 — `onEntryKeyDown`:2035、`readDialogueInput`:2251 | 画面の記述の `dialogueField` | 離散 | Agent API | 実装の都合（`S-99i` の写し） | いいえ |
| `fieldCommit` | 1953 | `FieldCommit` ／ `null` | `null` | 5 — `onFieldChange`:2279、Enter の keydown:2374、`settleOnPressOutside`:2414、`settleDocumentTitle`:2483、`readFieldCommit`:2618 | 1 — `readFieldCommit`:2617 | `heldTextControl`・`heldTextValueAtFocus`・`documentTitleValueAtFocus` | 離散 | 名前付けと入力欄の流れ | 実装の都合（口は表 T-065 の `IF-9`） | いいえ |
| `isFieldHeld` | 2300 | `boolean` | `false` | 5 — `releaseTakenBackText`:2320、focusin:2324、focusout:2330、Enter の keydown:2381、`settleOnPressOutside`:2426 | 1 — `showScreenView`:2184 | `heldTextControl`・`isHeldTextTakenBack` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `isNoticeShowing` | 2301 | `boolean` | `false` | 1 — `showScreenView`:2119 | 1 — `isPressTakenByStandingNotice`:2305 | 画面の記述の `notices`（`frameLoop` の `raisedNotices` の写し） | 離散 | 通知 | 実装の都合（写し。規則は `NT-8`） | いいえ |
| `heldTextControl` | 2308 | `TextEntryControl` ／ `null` | `null` | 5 — `releaseTakenBackText`:2318、focusin:2325、focusout:2331、Enter の keydown:2379、`settleOnPressOutside`:2424 | 8 — リスナー×4、`onFieldChange`、`releaseTakenBackText`、`settleOnPressOutside`、`hasUnsettledTextEntry` | `heldTextValueAtFocus`・`isHeldTextTakenBack`、`documentTitleEntry`・`isWatermarkUnlockHeld`（`hasUnsettledTextEntry` で合わせる） | 離散 | 名前付けと入力欄の流れ | `IN-4`（確定していないその場の編集）、`IN-6`、`AG-9` | いいえ |
| `heldTextValueAtFocus` | 2309 | `string`（推論） | 空文字 | 7 — `releaseTakenBackText`:2319、focusin:2326、focusout:2332、Enter の keydown:2375・2380、`settleOnPressOutside`:2415・2425 | 4 — `onFieldChange`:2278、Esc の keydown:2351、Enter の keydown:2374、`settleOnPressOutside`:2413 | `heldTextControl`、`fieldCommit` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `isHeldTextTakenBack` | 2310 | `boolean` | `false` | 7 — `releaseTakenBackText`:2321、focusin:2327、focusout:2333、input:2336、Esc の keydown:2352、Enter の keydown:2382、`settleOnPressOutside`:2417 | 3 — `releaseTakenBackText`:2316、Esc の keydown:2345、keyup:2358 | `heldTextControl`、`isNoticeShowing`（Esc を通知に譲る） | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `documentTitleEntry` | 2429 | `TextEntryControl` ／ `null` | `null` | 2 — `openDocumentTitleField`:2452、`closeDocumentTitleField`:2464 | 7 — `showScreenView`、`openDocumentTitleField`、`closeDocumentTitleField`、`settleDocumentTitle`、`settleDocumentTitleOnPressOutside`、`watchDocumentTitleField` の `isStanding`、`hasUnsettledTextEntry` | `documentTitleBox`・`documentTitleShown` | 離散 | 名前付けと入力欄の流れ | `FR-035`、`IN-6` | いいえ |
| `documentTitleBox` | 2430 | `HTMLElement` ／ `null` | `null` | 1 — `showScreenView`:2149 | 2 — `openDocumentTitleField`:2441、`closeDocumentTitleField`:2468 | `documentTitleEntry` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `documentTitleShown` | 2431 | `string`（推論） | 空文字 | 1 — `showScreenView`:2155 | 3 — `openDocumentTitleField`:2447・2453、`closeDocumentTitleField`:2468 | `documentTitleBox` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `documentTitleValueAtFocus` | 2432 | `string`（推論） | 空文字 | 3 — `openDocumentTitleField`:2453、`closeDocumentTitleField`:2465、`settleDocumentTitle`:2484 | 3 — `settleDocumentTitle`:2477・2480、`watchDocumentTitleField` の Esc:2523 | `documentTitleEntry`、`documentTitleShown` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `isDocumentTitleTakenBack` | 2433 | `boolean` | `false` | 4 — `openDocumentTitleField`:2454、`closeDocumentTitleField`:2466、`watchDocumentTitleField` の input:2508・Esc:2524 | 2 — `watchDocumentTitleField` の Esc:2518・keyup:2527 | `documentTitleEntry`、`isNoticeShowing` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `isWatermarkUnlockHeld` | 2551 | `boolean` | `false` | 4 — `releaseWatermarkUnlockOnPressOutside`:2399、`watchWatermarkUnlock` の focusin:2565・focusout:2571、`releaseTakenBackWatermarkUnlock`:2604 | 3 — `releaseWatermarkUnlockOnPressOutside`:2396、`watchWatermarkUnlock` の keydown:2579、`hasUnsettledTextEntry`:2612 | `watermarkUnlockEntry`、`isWatermarkUnlockTakenBack` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `isWatermarkUnlockTakenBack` | 2552 | `boolean` | `false` | 6 — `releaseWatermarkUnlockOnPressOutside`:2400、`watchWatermarkUnlock` のリスナー:2568・2572・2575・2587、`releaseTakenBackWatermarkUnlock`:2605 | 3 — `watchWatermarkUnlock` のリスナー:2582・2593、`releaseTakenBackWatermarkUnlock`:2602 | `watermarkUnlockEntry`、`isNoticeShowing` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `anchorsByPart` | 1957 | `Map`（部品 → 鍵 → 要素） | 空の `Map` | 1 — `anchorsOf`:1962（内側を空に）・1963 | 2 — `anchorsOf`:1961、`anchorFor`:1969 | なし | 離散（部品を描き直すごと） | ポインタとツールチップ（説明の置き場所） | 実装の都合 | いいえ |
| `typedControlsByRow` | 2284 | `Map`（行 → 入力欄） | 空の `Map` | 1 — `showScreenView`:2192 が `fillPropertiesPanel` に渡し、先で書く | 2 — `showScreenView`:2192、`focusPropertyField`:2293 | `isFieldHeld`（持っている間は描き直さない） | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |

### E. モジュールスコープの可変状態（`src/` 全体）

| 状態 | 所在 | 型 | 初期値 | 書き手 | 読み手 | 依存 | 速さ | 領域 | 仕様の名 | 非同期 |
|---|---|---|---|---|---|---|---|---|---|---|
| `deliveringNotices` | `use-case/apply-document-change/apply-document-change.ts`:69 | `boolean`（推論） | `false` | 2 — `replaceThenTell`:85・89 | 1 — `momentInsideTheWindow`:73 | `holder.replace` の後に立て、`audience.deliver` の間だけ立つ | 離散（try/finally の窓） | 通知 | `WS-2`（第 5.5 節の配りの窓） | いいえ |
| `REGISTRATIONS` | `use-case/notify-change-watchers/notify-change-watchers.ts`:37 | `Map<string, Registration>` | 空の `Map` | 3 — `watchChanges`:43、`unwatchChanges`:49、`notifyChangeWatchers`:74 | 3 — `watchChanges`:42、`notifyChangeWatchers`:56・73 | `frameLoop` の `dialogueLog`（配る発話） | 離散 | Agent API | `AG-6` | いいえ |
| `deliveredAppShellHtml` | `framework/single-html-shell/single-html-shell.ts`:63 | `string` ／ `null` | `null` | 1 — `boot`:242 | 1 — `appShellSource` の `readAppShell`:77 | なし（起動の最初の文でなければならない） | 離散（起動時に 1 回） | ファイル操作と問いの待ち | 実装の都合（口は表 T-065 の `IF-8`） | いいえ |
| `CONTROL_KEYS` | `framework/dom-screen-surface/dom-screen-surface.ts`:1214 | `WeakMap<Element, 行と鍵>` | 空の `WeakMap` | 3 — `controlElement`:1320、`searchElements`:1359、`openDocumentTitleField`:2448 | 1 — `fieldCommitOf`:2265 | `TYPED_CONTROLS` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |
| `TYPED_CONTROLS` | `framework/dom-screen-surface/dom-screen-surface.ts`:1261 | `WeakSet<object>` | 空の `WeakSet` | 3 — `controlElement`:1322、`searchElements`:1360、`openDocumentTitleField`:2449 | 1 — `textEntryControlOf`:1266 | `CONTROL_KEYS` | 離散 | 名前付けと入力欄の流れ | 実装の都合 | いいえ |

---

## 記録

### 1. 数え方と照合（2026-09-14 実測）

| 数 | 値 | 測り方 |
|---|---|---|
| `frame-loop.ts` の字下げ 2 の `let`（ファイル全体） | 62 | `grep -nE "^  let " src/framework/single-html-shell/frame-loop.ts` |
| そのうち `frameLoop` の本体の中 | 60 | 上の行番号を `frameLoop` の範囲 1458〜3630 で切った。範囲は `grep -nE "^(export )?(async )?function " frame-loop.ts` の開始行と、`grep -n "^}"` の最初の閉じ（3630）で決めた。外の 2 つは `confirmationOwedBy`:1269 と `confirmationOwedByResourceDeletion`:1314 の関数ローカル |
| 一覧 A 節の行数と照合 | 60 行、欠け 0、重複 0 | A 節の表の第 1 セルの変数名の集合と、上の 60 の変数名の集合を突き合わせた（記録の 1a） |
| `frameLoop` の字下げ 2 の `const` のうち、中身を書き換えるもの | 1 | 同じ範囲の `^  const ` 8 件を読み、`.push`・`.shift`・`length = 0` を持つのは `interactionRecord` だけ |
| `boot` の字下げ 2 の `let` | 10 | `grep -nE "^\s*let " single-html-shell.ts` の 11 件から、トップレベルの 1 件（63 行）を除いた |
| `domScreenSurface` の字下げ 2 の `let` | 23 | `grep -nE "^  let " dom-screen-surface.ts` の 26 件を、範囲 1890〜2699 で切った。外の 3 件（487・1181・1560）はモジュール関数のローカル |
| `domScreenSurface` の中身を書き換える `const` | 2 | 同じ範囲の `^  const .* = (new \|\[\|\{)` 3 件を読み、`DOCUMENT_TITLE_KEY` は書き換えないので除いた |
| モジュールスコープの `let` | 2 | `grep -rnE "^(export )?(let\|var) " src --include=*.ts` |
| モジュールスコープで中身を書き換える `const` | 3 | `grep -rnE "^(export )?const \w+(: [^=]+)? = (new (Map\|Set\|WeakMap\|WeakSet)\|\[\]\|\{\})" src` の 38 件の名前ごとに、`名前\.(set\|add\|delete\|clear\|push\|pop\|splice\|shift\|unshift\|sort\|reverse)\(` を `src/` 全体で grep した。当たったのは `REGISTRATIONS`・`CONTROL_KEYS`・`TYPED_CONTROLS` の 3 つ。Adapter と Entity の `Map` 29 件は作った後に書き換えない |
| 書き手・読み手の数 | 表のとおり | 変数ごとに、宣言の範囲で `(?<![\w.$])名前(?![\w$])` を行ごとに探した。`//` の後と引用符の文字列は除き、テンプレート文字列の `${}` は残した。`名前 =`（`==` と `=>` を除く）・`+=`・`++`・`.push` などを書き、残りを読みとした。囲む関数は、宣言の行と中括弧の深さで追い、複数行にわたる宣言は読んで直した |
| 機械の誤検出で直したもの | 3 件 | ① `recordedModifiers`:1642・1647 のローカル `held` は同名の別物 ② `recordFrame`:1696 の文字列 `asking=` は書き手ではない（同じ行の `asking !== null` は読み手） ③ `boot`:393 の `loop.settleFirstFrameEnvironment` は `.set` の前方一致で、書き手ではない |

**1a. A 節の照合の手順:** 本書の A 節の表から、第 1 セルのバッククォートの中の名前を抜き、`frame-loop.ts` の 1458〜3630 行の `^  let (\w+)` の名前と集合として比べた。差は両方向とも 0、表の中の重複も 0。

### 2. 計画の数との突き合わせ

| 計画の数（記録の 1 節） | 実測 | 食い違いと理由 |
|---|---|---|
| `frameLoop` が直に持つ `let` 60 | 60 | 一致。⚠️ ただし「字下げ 2 の `let`」をファイル全体で数えると 62 になる（範囲で切る必要がある） |
| （計画に無い） | `frameLoop` の中身を変える `const` 1 | `let` だけを数えると `interactionRecord` が漏れる |
| UseCase のモジュールスコープの可変状態 2 | 2 | 一致（`REGISTRATIONS` と `deliveringNotices`） |
| （計画に無い） | Framework のモジュールスコープの可変状態 3 | `deliveredAppShellHtml`・`CONTROL_KEYS`・`TYPED_CONTROLS`。計画の門（段 3）は UseCase だけを見るので、この 3 つは門に掛からない |
| （計画に無い） | シェルと画面の面のクロージャ状態 35 | `boot` 10、`domScreenSurface` 25。⚠️ 本書の範囲外の Framework のクロージャ（`dom-input-source.ts` 3、`file-system-access-file-store.ts` 5、`canvas-rasterizer.ts` 1、`dom-svg-surface.ts` 1。字下げ 2 の `let` の件数で、関数ローカルかどうかは未確認）は数えていない |

### 3. 領域ごとの行数 —— 使われ方から分けた結果と、計画の仮分け

| 領域 | 計画の仮分け（`frameLoop` の 60） | 実測 A 節（60） | 全 101 行 | 食い違いの中身 |
|---|---|---|---|---|
| ファイル操作と問いの待ち | 11 | 10 | 11 | 仮分けより 1 少ない |
| 画面の値 | 10 | 12 | 12 | `commandPaletteDraggedTo`（離した後も置き場所として残る）、`dualCursorFollowing`（当たり判定を止めるモード。`PTD-2`）、`watermarkStampedAt`、`isLevelZeroFolded` を使われ方から入れた |
| ポインタとツールチップ | 8 | 7 | 9 | `callOffEntryRepeat` は押し続けの繰り返しで、ポインタではなく身振りが読む |
| 身振り | 6 | 5 | 5 | |
| 文書と現在値の芯 | 5 | 4 | 6 | ⚠️ 計画が芯の例に挙げた `dialogueLog` は、書き手が Agent API の口（`dialogueHolder.replace`）だけで、読み手も配りと Agent API なので、Agent API に入れた |
| 通知 | 5 | 5 | 7 | |
| 名前付けと入力欄の流れ | 5 | 5 | 23 | 画面の面（`dom-screen-surface.ts` の D 節と E 節）の入力欄の持ち方が 16 行ある |
| 選択 | 4 | 4 | 4 | |
| 操作の記録 | 4 | 4 | 5 | |
| Agent API | 2 | 3 | 6 | `dialogueLog` の移動 |
| （10 領域の外）環境の値 | 0 | 1 | 8 | ⚠️ `environment` と測った寸法は 10 領域のどれにも入らない。計画 3 節の到達点「状態の値 1 つと、環境の値だけ」の後者に当たる |
| （10 領域の外）DOM へ書いた値の覚え・描き手の差分の覚え | 0 | 0 | 5 | 同じ値を DOM へ 2 度書かないための覚え。状態機械の外に残るもの（判断） |
| 計 | 60 | 60 | 101 | |

⚠️ 計画 4 節の表は例しか書いていないので、仮分けの 60 行の内訳は本書から復元できない。食い違いの中身は、計画が例に挙げた名前に限って書いた。

### 4. 領域をまたぐ依存（ガードとして読むもの）

| 読む側（領域 ・ 場所） | ガードとして読む状態（領域） | 何を決めるか |
|---|---|---|
| 文書と現在値の芯 ・ `collectWriteMoment` | `pressed`（身振り）、`isSettlingFieldCommit`（名前付け）、面の `hasUnsettledTextEntry` = `heldTextControl`・`isWatermarkUnlockHeld`・`documentTitleEntry`（名前付け）、`deliveringNotices`（通知・UseCase） | `WS-2` が書き込みを拒むか。⭐ 計画 12 節の「書き込みを拒むガードは 3 領域を同時に読む」を裏づけた |
| 文書と現在値の芯 ・ `carryOutAction['changeDocument']` | `asking`（ファイル） | 問いが立っている間の書き込みを捨てる |
| 文書と現在値の芯 ・ `owesFrame` | `pressed`（身振り）、`screenState`・`dualCursorFollowing`（画面）、`selection`（選択）、`raisedNotices`（通知）、`partUnderPointer`・`grabUnderPointer`・`isTooltipStanding`（ポインタ） | フレームを描き直すか。5 領域を読む |
| 入力の翻訳係へ渡す文脈 ・ `collectInputContext` | `screenState`・`isLevelZeroFolded`・`dualCursorFollowing`（画面）、`asking`（ファイル）、`pressed`（身振り）、`raisedNotices`（通知）、`isPropertiesPanelPutAway`・`propertiesShowing`（画面）、`selection`（選択） | `isSurfaceStanding`（= 面 または 問い）、`isNoticeStanding` など |
| `Esc` の段 ・ `receiveInput` と `isBrowserDefaultStopped` の `escapeLevelOf` | `asking`（ファイル）、`isPropertiesPanelPutAway`・`propertiesShowing`（画面）、`isTooltipStanding`（ポインタ）ほか文脈の全部 | `IN-4` の段。同じ判定が 2 か所に書かれている |
| ファイル ・ `receiveInput`:3517〜3533 | `screenState.surface`（画面） | 面が閉じたら `openChoosing`・`mergeChoosing`・`droppedTaskNames` を片付ける |
| ファイル ・ `askHowToOpen` など 3 関数 | —（書く） | ファイル側の関数が `screenState`（画面）を書く。領域をまたぐ書き込み |
| ファイル ・ ファイル操作の 4 つの入口 | `asking`・`openChoosing`・`isFileOperationWaiting`（ファイルの中） | `OP-8`。同じ 3 項のガードが 5 か所に写してある |
| 画面 ・ `carryOutAction['settleTextEntry']` | `asking`（ファイル）、`namingCreatedTaskUid`・`didSettleFieldEntry`（名前付け）、面の `hasUnsettledTextEntry`（名前付け） | `SK-19` の段。パネルを片付けるか |
| 画面 ・ `receiveInput`:3422 | `partUnderPointer.dividerPanel`（ポインタ） | 片付けたパネルを境界の押下で戻すか（PND-451） |
| 画面 ・ `showPropertiesOfChoice` | `selection`・`selectedGroupIds`（選択） | パネルを出すか |
| 画面 ・ `standOnWhatWasCreated`:3330 | `held`（芯） | 段 0 の畳みを解くか |
| 選択 ・ `holder.replace` | `held`（芯） | 選択を刈る |
| 選択 ・ `answerSettledEntry` の `IC-66` | `asking`（ファイル） | 資源の削除を受け付けるか |
| 名前付け ・ `endCreatedNamingIfChosenMoved` | `selection`（選択） | 名付けの場面を終えるか |
| 通知 ・ `receiveInput`:3428 | `partUnderPointer.noticeDismissKey`（ポインタ） | 押した通知を消す |
| 通知 ・ `raiseNotice` など 10 か所 | `environment`（環境） | 積んだ後に描くか |
| ポインタ ・ `pointerShapeAt`・`grabAtPointer` | `pressed`（身振り）、`dualCursorFollowing`・`screenState.armed`（画面） | ポインタの形（`IN-2`）と当たり |
| 身振り ・ `previewOfHeldPress` | `pointerAt`（ポインタ） | プレビューの文書 |
| Agent API ・ `readSnapshot` | `pressed`（身振り）、面の `hasUnsettledTextEntry`（名前付け）、`held`・`values`（芯）、`selection`（選択）、`dialogueLog` | 読み取りの写し。⚠️ `exportScene` を呼ぶので `stackSafetyCapOfLastExportScene`（通知）を上書きする |
| 画面の面 ・ Esc と Enter のリスナー | `isNoticeShowing`（通知の写し） | `NT-8` の消去を入力欄より先に通す |

### 5. 遷移の持ち主の 2 択の材料

| 数え方 | 名指す | 実装の都合 | 計 |
|---|---|---|---|
| A 節（`frameLoop` の `let`） | 38 | 22 | 60 |
| B〜E 節 | 6 | 35 | 41 |
| 全 101 行 | 44 | 57 | 101 |

- 「名指す」は、要求の行（`FR-` の UID、表の行、表 T-206 の `S-` 行）がその値そのものを語っている場合に限った。語が口の表（表 T-065 の `IF-`）だけにある場合と、条件や待ち時間だけを名指す場合は「実装の都合」に数えた（判断）。
- ⚠️ 仕様の 1 つの値を、コードが 2 つの変数で持つ組がある: `S-99h` ↔ `propertiesShowing` と `isPropertiesPanelPutAway`、`U-61` ↔ `mergeChoosing` と `mergeCandidates`、`FR-101` ↔ `openedFileName` と `fileSavedAt`。原稿に載せるなら、状態 1 つに運ぶ値 2 つの形になる。
- ⚠️ 名指す 38 のうち、置き場を仕様が決めていないと台帳が書く行が 4 つある（PND-142・143・144・338）。
- ⭐ 推し（1 行）: 名指す状態が `frameLoop` の 6 割を占め、IN-4 の段と書き込みの拒否が 5 領域をまたぐので、**新しい原稿が持つ** 側が、表の散文を手で追うより写し間違いを機械で止めやすい。

### 6. 読んでいて気づいたこと（台帳には書いていない）

- ⚠️ `openedFileName` の書き手は `saveHeldDocumentToFile`:2722 の 1 つだけで、ファイルを開く道（`openDocumentIntoHold`）は書かない。`FR-101` は「いま開いているファイルの名前」を示せと言うので、開いた直後は名前が出ない疑いがある。**画面で確かめていない**。台帳への記載は前に立つ者に委ねる。
- ⚠️ `asking`・`openChoosing`・`isFileOperationWaiting` の 3 項のガードが 5 か所（2685・2971・3112・3146・3157）に写してある。1 か所だけ `takeInHandedDocument` の側で読み、残り 4 つは入口で読む。
- ⚠️ `escapeLevelOf` の引数の組み立てが `receiveInput`:3446 と `isBrowserDefaultStopped`:3577 に 2 度書かれ、同期はコメント（TRAP）だけが持つ。

### 7. このブリーフの誤り

- **足場の手順の順が逆である。** 「`git log --oneline -1` が `8bf6aca` であること」を `git merge --ff-only 8bf6aca` の前に確かめさせているが、作業木はセッションの起点（`8701ccf`）で切られるので、その時点では必ず外れる。実測: 最初の `git log --oneline -1` は `8701ccf` を返し、早送りの後に `8bf6aca` になった。
