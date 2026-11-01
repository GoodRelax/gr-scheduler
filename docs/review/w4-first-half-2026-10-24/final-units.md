# 確定のユニット表 —— CR-578 / CR-579 / CR-580（R2 の審査を畳んだ版、2026-10-24）

読んだ木: `w4-first-half` の `d0ae3a9c8`（作業木）。入力: 同じフォルダの `plan-cr-578.md`・`plan-cr-579.md`・`plan-cr-580.md`・`review-r2.md`。

## 0. 共通の約束

- **名は仮**: 審査の問い Q1〜Q7 の名は、審査の推奨（第 1 案）を仮に当てた。該当の行に「（名は問い Qn で確かめる）」と書いた。問いの本文は各 CR の 4 節。
- **行 ID**: 表 T-075 の `UF-208`〜`UF-240` のうち、`UF-208`〜`UF-237` の 30 を使った（CR-578 の 18 → CR-579 の 6 → CR-580 の 6。各 CR の中はファイルを作る波の順 —— 各コミットでその時の最大 +1 になる）。**使わない ID: `UF-238`・`UF-239`・`UF-240`**。確かめ: `grep -o "^| UF-[0-9]*" docs/spec/05-07-design.md | sort -t- -k2 -n | tail -1` → `UF-207`（`UF-208` 以上は 0 件）。
- **`SU-3`**: 185 → CR-578 の後 203 → CR-579 の後 209 → CR-580 の後 **215**（新しいファイル 1 つにつき、そのファイルを作る波のコミットで +1）。
- **行の数え方**（「手書き行」の欄）: 移す範囲の和（各宣言・閉包の項に、その前のコメントと空行を付けた行数）＋ 取り込み・出し直しの見積り。
  - CR-578: スクラッチの `partition.mjs` を `map-v4.json` ＋ 下の移しで**記憶の中で**走らせ直した（ファイルは書いていない）。和 4,463 ＝ 元の `partition-v4.txt` の和 4,463 と一致（漏れ 0）。取り込みの見積りは計画の値（新しい兄弟 15〜60 行）。
  - CR-579: 計画 1.2 の群の行数（`ranges579.mjs`）から、移る宣言の行を足し引きした。
  - CR-580: 計画 1.2 の集まりの和（`p580/units.mjs`）から `MUST_START_ON` の 3 行を動かした。
- **検査 60**: 閾値は `check-function-size.py:150-151` の `LINE_BAND = 50`・`BRANCH_BAND = 15`。新しい HELD は 3 つの CR とも 0 の設計（各 CR の 3 節の末尾）。
- **形の記号**: (F) 閉包の値を手の束で受ける頂上の関数 ／ (M) 自分の `let` だけを持つ小さな工場 ／ 移 = 頂上の宣言をそのまま移す。形の欄の後ろに T-075 の純粋性を書いた。

---

## CR-578 —— `frame-loop.ts`（入口 + 新 18、既存 8 が育つ）

### 1. ユニットの表

| UF | ファイル | 責務の文 | 手書き行 | 中身（短く） | 形 ／ 純粋性 |
| --- | --- | --- | --: | --- | --- |
| `UF-48`（入口） | `frame-loop.ts` | 2. の `UF-48` の新しい文のとおり（主の句「フレームの 1 周期の部品を 1 度だけ結ぶ」） | ≈690（範囲 474 ＋ 取り込み ≈90 ＋ 出し直し ≈45 ＋ `FrameLoopParts` の型と生成 ≈80） | 継ぎ目の型（`FrameEnvironment` 〜 `FrameLoopHands`、新 `FrameLoopParts`、`Merge*`）、`startingSession`・`documentAtUnsavedMarkDrop`・`startupReadingLanded`・`FULL_SCREEN_REFUSED_REASON`・`PROPERTIES_PANEL_SURFACE`・**`fileDragEventIn`**（審査: 入口に残す）、閉包: `session`・`savedDocument`・`environment`・`agentApiEnablingWatch`・`changeWatchers`・`sendToSession`・`hands`・`parts`・兄弟の工場の生成・`raiseNotice`・**`raiseFileFault`**（審査: `raiseNotice` の隣）・`endFileOperation`・`sendFromFlow`・`isPropertiesPanelOnScreen`・`storeAgentApiEnabling`・`snapshotSource`・`askBrowserForFullScreen`・返す面、生成 `NOT_STORED_SCROLLBAR_SIZES` | 結線 ／ `non-pure` |
| `UF-208` | `clock-readers.ts` | フレームループの周期が読む宿主の時計 —— 今日・書いた時刻・その場の時刻・標準時の時差・単調な ms —— を読む | ≈55（48 ＋ 5） | `readToday`・`readInstantOfWrite`・`readLocalMoment`・`readSystemStandardTimeZone`・`readMonotonicMs`・`PC_OFFSET_HOUR`・`JANUARY`・`JULY` | 移 ／ `semi-pure-b` |
| `UF-209` | `outcome-notices.ts`（名は問い Q2 で確かめる） | シェルが告げる理由（表 T-233）と問い（告げ方 `NT-7` の確認）を、起きたこと（ファイルの失敗・書き込みの拒み・絵の失敗・使い切った入口）から選び、兄弟が共有する問いの型と告げ方を持つ | ≈195（179 ＋ 15） | 理由の表 4（`NOTICE_REASON_OF_*`）・`REFUSAL_SITUATIONS`・`situationReasonOf`・`noticeReasonOfRefusals`・`reasonOfWriteRefusal`・`noWorkingWeekdayReason`・理由の定数 10・`CONFIRMATION_MANNER`・`ConfirmationQuestion`・`DISCARD_QUESTION`・`discardQuestionOf`・`GRS_RESET_ENTRY`・`GRS_RESET_QUESTION`・`grsResetEntryPressedOf`・`AGENT_OPEN_FILE_ASKED`・`changeQuestionRaisedBy`（(F) は持たない） | 移 ／ `pure` |
| `UF-210` | `screen-session-queries.ts` | セッションの現在値（`PI-39` の `ScreenSession`）から、シェルが読む値を答える問い合わせ —— 開いた面・デュアルカーソル・言語・パネル・立っている通知・問い・ファイルの操作・選択 | ≈140（124 ＋ 15） | `openSurfaceNameIn` 〜 `isFlowSurface` の 22 宣言（計画のとおり、`fileDragEventIn` を除く）。G53x のフォルダの中の分（`field-entry.ts` の 2・`interaction-record.ts` の 1）を寄せる | 移 ／ `pure` |
| `UF-211` | `windows-hold.ts`（名は問い Q3 で確かめる） | 表 T-335 のウィンドウ（ヘルプ・検索パネル・遅延診断レポート・担当リスト）の状態を持ち、押し・掴み・列の幅・打った語・閉じる・`Esc` の段に合わせて動かす（`WB-6`・`WB-8`・`WB-9`・`SV-14`・`SV-18`・`RO-1`・`RW-1`） | ≈435（403 − 2 ＋ 35） | `heldWindowsOf`（既存の (M)。`spendEscapeRung` を窓を閉じるだけの `closeOnEscape(session, level): boolean` にする）・`tableWindowsHeldIn`・`closingHoldOf`・`closedTablesOf`・`WindowPlaces`・`STARTING_WINDOW_PLACES`・`withTableWindows` 〜 `windowPlacesAfterOutsidePress`・`windowReadingsOf`・`grabbedShown`・`grabbedWindowBox`・`windowShownIn`・`windowDisplayKeyOf`・`TABLE_WINDOW_OF_SURFACE`・`reportWithInput`・`resourceListWithInput`・`searchViewWithFilterChanges`・`searchPanelWithTypedWord`・`isFilterPressedOutside`・型 4（`ESCAPE_*` と直しの提案の数えは出ていく） | 移（(M) は既存） ／ `non-pure` |
| `UF-212` | `search-hit-jump.ts` | 検索の当たり（表 T-332）へ飛ぶ —— 押して離したセルから当たりを求め、表示の書き込みと選択を出し、描いていない的は次の絵で置き直す（`SJ-0`〜`SJ-10`・`AM-16`） | ≈170（147 ＋ 25） | `jumpToSearchHit`・`landJump`・`owedJumpHolder`（既存の (M)）・`landingAgentHolder`・`searchJumpOnRelease`・`searchHitOf`・`actionWithJumpViews`・型 4・`SEARCH_HIT_JUMPED`・`PINNED_TASK_GROUPS_LEAVE_NO_ROOM_REASON` | 移 ／ `non-pure` |
| `UF-213` | `task-group-grab-scroll.ts` | タスクグループを掴んで運ぶ間（`HF-15`）、端で巻いたスクロールをフレームの値として持ち（`WS-2`）、離したときに 1 度だけ書く（`S-597`・`S-598`） | ≈105（91 ＋ 15） | `taskGroupGrabCarryOf`・`heldGrabScrollOf`（既存の (M)）・`turnedGrabScrollPlace`・`HeldGrabScroll`・`PLAIN_MODIFIERS`・`MS_PER_SECOND`（`writeScrollPlace` は門へ） | 移 ／ `non-pure` |
| `UF-214` | `drawn-picture-hold.ts` | 描いた絵のレイアウトと幾何（`layoutFromSchedule`・`geometryFromLayout`）を、絵が読むものが同じあいだ使い回す（表 T-071 の `CA-1`）—— 状態日だけの違いはレイアウトを作り直さない | ≈105（89 ＋ 15） | (M) `drawnPictureHoldOf`（`drawnPicture`）、`PictureInputs`・`DrawnPicture`・`GeometryArguments`・`isSameRecord`・`isSameScreenRegions`・`isSameScheduleApartFromStatusDate`・`isSameLayoutInputs`・`isSamePictureInputs` | (M)＋移 ／ `non-pure` |
| `UF-215` | `command-palette-place.ts` | コマンドパレットの置き場（`FR-053`）を持つ —— 引いた分だけ動かし、窓の中へ戻し、押しが中断したら押した時の角へ戻す | ≈75（48 ＋ 25） | (M) `commandPalettePlaceOf`（`commandPaletteDraggedTo`・`commandPaletteCornerAtPress`、命令 `forgetCornerAtPress`・`settleInWindow` ほか）、`paletteCornerOf`・`paletteCornerInWindow`・`windowSizeOf`・`bandSizeOf`・`PALETTE_GRAB_BAND_ENTRY` | (M)＋移 ／ `non-pure` |
| `UF-216` | `pointer-press-hold.ts` | 押している間の押し（`CS-2`・表 T-289）と、その押しの間に `held-press-preview.ts` が作ったプレビュー（表 T-023d）を持つ | ≈95（80 ＋ 15） | (M) `pointerPressHoldOf`（`pressed`・`previewDocument`・`heldPropertyPanelWidth`）、(F) `collectPress`、`measuredAtPress`・`followedPressOf`・`pressedOnOf`・`heldWholeOf`・`HeldWholes`・`POINTER_RELEASED`・`PRESS_INTERRUPTED`（押しの始まりと終わりは `input-reception.ts` へ） | (M)＋(F)＋移 ／ `non-pure` |
| `UF-217` | `delay-diagnostics-hold.ts` | 遅延診断の結果（`FR-130`・`S-445`）を、保持している文書ごとに 1 度だけ求めて持ち、入口で出し入れする —— 印を操作したタスクを外し、窓の行を指し（`RW-19`）、実行の後に出した直しの提案を外す（`RW-16`・`FR-155`） | ≈145（121 ＋ 22） | (M) `delayDiagnosticsHoldOf`、(F) `delayDiagnosticsNow`・`showDelayDiagnostics`・`showDiagnosisRow`、`HeldDelayDiagnostics`・`DelayDiagnosticsDrawing`・`delayDiagnosticsOf`・`heldAfterMarkerOperated`・`isDelayDiagnosticsReportOpen`・`DelayDiagnosticsPress`・`answerDelayDiagnosticsEntry`・`reportHeldOf`・`DELAY_DIAGNOSTICS_ENTRY`・`RE_DIAGNOSE_ENTRY`、**`proposalsNotIssuedSinceRun`・`DelayFixSubjectKey`・`FixLogSource`**（審査: 窓から来る） | (M)＋(F)＋移 ／ `non-pure` |
| `UF-218` | `under-pointer-hold.ts` | ポインタの下にあるもの —— 点・面の部品・掴み・説明の的（`EZ-2`・`IN-3`）—— を、入力ごとに 1 回の歩きで求めて持つ（表 T-023d） | ≈185（163 ＋ 20） | (M) `underPointerHoldOf`（7 `let`）、(F) `answersAtPointerOf`・`noteHintTarget`、`hintReleasedEntryAfter`・`hintEntryOf`・`HintHolder`・`HintTarget`・`NO_HINT_TARGET`・`iconRowOf`・`hintTargetOf`・`HintWalk`・`hintWalkAt`・`isSameHintTarget`・`HINT_TARGET_CHANGED`・`NO_POINTER_ANSWERS`・`isSameScreenPart`・`isSameGrab`・`isSameGrabbedItem`・`itemKeyOf`（`dualCursorDrawnOf` は `frame-run.ts` へ） | (M)＋(F)＋移 ／ `non-pure` |
| `UF-219` | `input-reception.ts` | 入口の入力（表 T-078 の `FT-1`）を 1 つ受けて表 T-283 の段の順に 1 度だけ消費し、押しの始まりと終わりを受け持ちの兄弟へ配り、フレームを負うかとブラウザの既定の動作を止めるか（`IN-4a`）を同じ段の読みで答える。<br>`Esc` の段は `escapeTarget` で決めて 1 段 1 行で送る（表 T-283）。 | ≈525（471 ＋ 新 `spendEscapeRung` ≈6 ＋ 取り込み ≈50） | `receiveInput`・`owesFrame`・`isBrowserDefaultStopped`・`spentOnParentTaskChoice`・`spendNoticeRungFirst`・`dismissNoticeByKey`・`answerConfirmation`・`startsNoTextSelection`・**`beginPointerPress`・`endPointerPress`**（審査: 押しの配り）・**新 `spendEscapeRung`**（窓が閉じなければ段の出来事を送る）（以上 F）、**`ESCAPE_RUNG_EVENTS`・`ESCAPE_*` 8**（審査: 窓から来る）、キーと答えの定数・`isConfirmationAnswerKey`・`GUIDE_CURSOR_NONE`・`isNoticeDismissKey`・`isLandingMarkClearedBy`・`continuationMarkClickedOf`・`isRefusedPanelWidth`・`SENT_AFTER_PRESS_DROPS`・`isSentBeforePressDrops`・宿主に任せる入力 5・選択の動き 5・`hasEndedGesture`・`escapeLevelOf`・`LANDING_MARK_CLEAR_ASKED`・`NEWEST_NOTICE_DISMISS_ASKED`（`pruneChoiceTo` は門へ） | (F)＋移 ／ `non-pure` |
| `UF-220` | `input-context-collection.ts` | 翻訳器へ渡す入力の文脈（`PI-18` の `InputContext`）を、フレームの値と保持している値から 1 つの入力に 1 度だけ集める | ≈90（70 ＋ 20） | (F) `collectInputContext`、`windowFocusContextOf`・`SEARCH_FIELD_ROWS`・`NO_MARKED_TASKS` | (F)＋移 ／ `non-pure` |
| `UF-221` | `action-carrying.ts` | 翻訳器が返した動作（表 T-036）を運ぶ —— 文書の変更・取り消し・ファイルの求め・コピー・全画面などを門と流れと副作用へ渡し、作ったものの上に立ち、プロパティパネルに選択を見せる（`FR-072`） | ≈400（354 ＋ 45） | (F) `carryOutAction`・`carryOutOwedAction`・`askToStartNewDocument`・`repeatHeldEntry`・`showDisplayScaleMessage`・`showVerticalZoomEndMessage`・`settleOnScreen`・`copyImageToJsonPrompt`・`standOnWhatWasCreated`・`showPropertiesOfChoice`・`followChoiceOnPanel`、`subjectOfChoice`・`PanelSubjectPick`・`taskGroupsChosenWith`・`creationLandingOf`・`CreatedSubject`・`copyPromptAndHandSchema`・`startingAfreshCall`・`startedDocumentOf`・`resetGrs`・出来事の定数 7 | (F)＋移 ／ `non-pure` |
| `UF-222` | `settled-entry-answers.ts` | 離したときに定まった入口・答え・書式（表 T-109）のうち、シェルが自ら答えるものに答える —— 言語・ヘルプの言語・パレットの最小化・操作の記録・節目の一覧・新規・GRS リセット・開き方と合流の答え・検索パネルの入口（`SV-1`・`SV-3`・`SV-7`）・遅延診断の入口へ振る | ≈210（182 ＋ 25） | (F) `answerSettledEntry`、`entrySettledOnRelease`・`answerSettledOnRelease`・`surfaceSettledOnRelease`・`formatSettledOnRelease`・`filterColumnOf`・`filterListedOf`・`searchPanelAfterEntry`・入口の定数 14・`PANEL_CLOSE_ASKED`・`INTERACTION_RECORD_TOGGLED` | (F)＋移 ／ `non-pure` |
| `UF-223` | `document-write-gate.ts` | 文書への書き込みと差し替えを書き込みの門（`WS-2`・`WS-6`・`WS-7`・表 T-230）を通して運ぶ —— 保持している文書を持ち、門の拒みを告げ（表 T-233）、表示の場所の書き込み（`OP-10`）も同じ門に通し、書いた後に選択とプレビューを文書に合わせ、変更を見張り手へ届ける（`HS-12`） | ≈285（247 ＋ 40） | (M) `documentHolderOf`（`held`）、(F) `writeDocument`・`replaceHeldDocument`・`replaceHeldDocumentAt`・`collectWriteMoment`・`changeAudienceOf`・**`raiseWriteRefusal`・`pruneChoiceTo`**（審査）、**`writeScrollPlace`**（審査: 掴みのファイルから）、`settingsLimitsOf`・`HISTORY_LIMITS`・`BYTES_PER_MEGABYTE`・`LANDING_OF_REPLACEMENT_ROW`・`landingOfReplacement`・`resourcePruningOf`・`taskGroupsWithinSchedule`・`historyStepsOf`・`agentHolderOf`・出来事の定数 5、生成 `EDITED_BY_SCREEN` | (M)＋(F)＋移 ／ `non-pure` |
| `UF-224` | `frame-run.ts`（名は問い Q1 で確かめる） | 表 T-078 の契機でフレームを 1 回走らせる —— 寸法が定まってから（`BO-1`）表 T-068 の絵を同じ読み（`ScreenViewReadings`）で組んで描き手へ渡し、次のフレームに負うもの（見せる位置・焦点）を返す | ≈480（424 ＋ 55） | (F) `runFrame`・`ask`・`runAskedFrame`、(M) `frameValuesHoldOf`・`watermarkStampOf`・`shownFrameHoldOf`・`frameOwingsOf`・積み上げの上限の告げ・パネルの幅の追従、`ScreenViewReadingsTaken`・`screenViewReadingsOf`・`shownSpanTextsOf`・`environmentForRegionsOf`・`propertiesPanelWidthOf`・`defaultPanelWidthOf`・`panelFacesIn`・`panelFaceWidthEventOf`・`unstoredZoomOf`・`writeOwedSight`・`beneathAndMarqueeOverlayShowerOf`・`stackSafetyCapToldAfter`・ズームの端 6・`isSizeSettled`・`isSameEnvironment`・`SEARCH_PANEL_SURFACE`・`HELP_MODAL_SURFACE`・`SEARCH_WORD_ROW`・**`dualCursorDrawnOf`**（審査）、生成 4（`NOT_STORED_PROPERTIES_PANEL_SIZES`・`_FLOOR`・`NOT_STORED_SCHEDULE_FILTER_BAR_SIZES`・`NOT_STORED_WATERMARK_NAME`） | (F)＋(M)＋移 ／ `non-pure` |
| `UF-225` | `export-scene.ts` | 書き出しの絵（`FR-080`・`EP-11`・`EP-12`）を、画面と同じ読みで組む | ≈220（186 ＋ 35） | (F) `exportScene`（HELD 68/2 の鍵の付け替え）・`exportViewNow`、`ExportSceneWithCapStop`・`ExportView`・`screenExportViewOf`・`spanExportViewOf`・`regionsClosedUnderTaskGroupArea`・`pictureSessionOf`。`screenViewReadingsOf` は `frame-run.ts` から値で取り込む（一方向）、透かしの刻は `parts` から | (F)＋移 ／ `non-pure` |
| `UF-123`（育つ） | `session-effects.ts` | 2. のとおり文に 1 句足す | ≈200（34 ＋ 143 ＋ 25） | `ScreenEffectHands`・`effectRunnersOf`・`screenDraftRunnersOf`・`ScreenDraftEffectName`、(F) `screenEffectHandsOf`（旧閉包の `effectRunners`） | 移＋(F) ／ `non-pure` |
| `UF-161`（育つ） | `view-place.ts` | 2. のとおり文に 1 句足す | ≈237（229 ＋ 8） | G47 の `zoomLimits()` | 畳み ／ `non-pure` |
| `UF-157`・`UF-195`（育つ） | `pointer-shape.ts` ／ `delay-diagnostics-report-window.ts` | 変えない | ≈435 ／ ≈207 | `WINDOW_GRAB_POINTERS`・`windowGrabPointerOf` ／ (F) `answerReportEntry` | 移 ／ (F) |
| `UF-164`・`UF-163`・`UF-166`・`UF-165`（育つ） | `field-entry.ts` ／ `frame-clock-wakes.ts` ／ `watermark-unlock.ts` ／ `document-file-flow.ts` | 変えない | +6 ／ +1 ／ +3 ／ +11（`document-file-flow.ts` は 1,320 → ≈1,331） | ただ 1 人の使い手への定数（計画のとおり） | 移 |

注:
- **1,000 の約束**: 入口 ≈690、兄弟の最大 `input-reception.ts` ≈525。例外は `document-file-flow.ts`（今 1,320、+11）だけで、親の裁定どおり本 CR では割らない（別の CR）。それでも 6 定数をここへ移すのは「兄弟は入口から型だけを取り込む」を守るため（ただ 1 人の使い手がこのファイル）。
- **501〜1,000 の帯**: 入口 ≈690（審査: R2.2b は要約で pass）、`input-reception.ts` ≈525（計画 ≈470 から押しの配りと `Esc` の段の出来事が来て帯に入った。中身はどれも「段の順に消費する」の手順 (a) —— 審査の行で `pruneChoiceTo` 以外は pass）。
- **`負う要求` の移り**（`UF-48` から）: `FR-068`（`OW-2`）→ `UF-221`、`NFR-002`・`NFR-003`（`OW-4`）→ `UF-224`、`NFR-010`（`OW-1`）→ `UF-219`、`FR-100`（`OW-2`）は入口に残る。
- **文から外した字**: 計画の `input-context-collection.ts` の「`R7.4`」と `under-pointer-hold.ts` の「DFC-1810」、`delay-diagnostics-hold.ts` の「決定 17」は仕様 ID でない（T-075 の既存の行は仕様 ID だけを添える）ので、文から外した。
- **検査 55**（近似、`partition.mjs` の数え ＋ 取り込みのコード行）: 台帳へ起こして消すコメント ≈24 行 —— `input-reception.ts` ≈13（コード ≈396 → 上限 44、コメント 57）・`action-carrying.ts` ≈7・`document-write-gate.ts` ≈3・`delay-diagnostics-hold.ts` ≈1。`windows-hold.ts` は 37/上限 37 で赤でなくなる。入口・`frame-run.ts`（30/44）・`export-scene.ts`（17/21）は緑。波ごとに `check-comment-rules.py --list` で測り直す。
- **検査 60**: HELD の付け替え 5（`runFrame` → `frame-run.ts`、`exportScene` → `export-scene.ts`、`receiveInput` → `input-reception.ts`、`carryOutAction` → `action-carrying.ts`、`answerSettledEntry` → `settled-entry-answers.ts`）、`frameLoop` は 1531 → ≈380 へ下がる（`raiseFileFault` の 8 行が残る分だけ計画の ≈370 より多い）。新しい関数は `spendEscapeRung`（≈6 行、`receiveInput` の中の 1 行の呼びを替えるだけなので `receiveInput` の行は増えない）だけ。`heldWindowsOf`（49）は `closeOnEscape` で ≈2 行減る。`endPointerPress` を (F) にしても ≈18 行。帯の手前の `taskGroupGrabCarryOf` 49・`screenEffectHandsOf` 49・`collectInputContext` 46・`owesFrame` 26/15 は行と分岐を足さない。

### 2. 文が変わる既存の行（旧 → 新、逐語）

**`UF-48`（`frame-loop.ts`）の責務の欄**

- 旧:
  > 現在値の保持（保存しない画面とセッションの値は、セッションの現在値（`PI-39` の `ScreenSession`）1 つとして持つ。<br>出来事は 1 本の送り口 `sendToSession` だけを通し、`advanceScreenSession` で 1 段進めて参照を差し替え、返った副作用をその同じ呼び出しの中で `UF-123` の実行に渡す —— `SF-6` ・ `SF-7`。<br>`Esc` の段は `escapeTarget` で決めて 1 段 1 行で送る（表 T-283）。<br>描き手へは根の状態と `ScreenViewReadings` を渡す）、フレームを起こす契機の観測（表 T-078）、フレーム先頭の収集と計算、描画と入力への配り、`SnapshotSource` の実装、全画面表示をブラウザに求めることと、ブラウザが告げた全画面表示の変化を 表 T-206 の `S-99f` へ写すこと（`FR-071`）。<br>⭐ 全画面表示の求めは、入口の入力（表 T-078 の `FT-1`）を受けたその呼び出しの中で、フレームを待たずに出すこと（MUST） —— ブラウザは利用者の操作による活性の中で出された求めしか受け付けず、活性をどこまで持ち越すかはブラウザごとに違うので、入力を受けた呼び出しの中で出すことだけが、どのブラウザでも活性の中にある。<br>ポインタの形は `pointer-shape.ts` に、掴んで動かす間の先の描画は `held-press-preview.ts` に、ブラウザに残す値の読み書きは `browser-stored-values.ts` に、操作の記録は `interaction-record.ts` に、表示の場所は `view-place.ts` に、時間でフレームを起こす待ちは `frame-clock-wakes.ts` に、名前付けと入力欄の出来事は `field-entry.ts` に、文書のファイルの流れは `document-file-flow.ts` に、透かしの解除の門は `watermark-unlock.ts` に、縦軸のズームの天井の使い回しは `task-group-band-ceiling-cache.ts` に、コピーと貼り付けは `copy-and-paste.ts` に問う。<br>削除が負う問いを立てるかは `EditDocument`（`PI-9`）に問い、告げ方（`NT-7`）だけを添える。<br>兄弟が共有する語彙（問いの型・告げ方）と、兄弟が閉包の値を読む手の束（`FrameLoopHands`）を持つ。<br>⚠️ 本ユニットは `R2.2a` と `R2.2b` を満たさない —— セッションを 1 段進めることとフレームを計算して配ることが 1 つの周期に残る。<br>2 つは多くの変更で共に書き換わってきたので、いまは 1 つの周期に置く
- 新:
  > 現在値の保持 —— 保存しない画面とセッションの値は、セッションの現在値（`PI-39` の `ScreenSession`）1 つとして持つ。<br>出来事は 1 本の送り口 `sendToSession` だけを通し、`advanceScreenSession` で 1 段進めて参照を差し替え、返った副作用をその同じ呼び出しの中で `UF-123` の実行に渡す —— `SF-6` ・ `SF-7`。<br>フレームの 1 周期の部品を 1 度だけ結ぶ —— 表 T-078 の契機（入力・寸法・押し続け・渡された文書・ファイルのドロップ）を受け持ちの兄弟へ渡し、兄弟は閉包の値を、本ユニットが 1 度だけ作る手の束（`FrameLoopHands` ・ `FrameLoopParts`）から読む。<br>`SnapshotSource` の実装、`Agent API` の有効の記憶（`FR-065`）、通知を上げる 1 本の口（`FR-076`）とファイルの失敗をそこから告げること、全画面表示をブラウザに求めることと、ブラウザが告げた全画面表示の変化を 表 T-206 の `S-99f` へ写すこと（`FR-071`）。<br>⭐ 全画面表示の求めは、入口の入力（表 T-078 の `FT-1`）を受けたその呼び出しの中で、フレームを待たずに出すこと（MUST） —— ブラウザは利用者の操作による活性の中で出された求めしか受け付けず、活性をどこまで持ち越すかはブラウザごとに違うので、入力を受けた呼び出しの中で出すことだけが、どのブラウザでも活性の中にある。<br>入力の受け取りは `input-reception.ts` に、入力の文脈は `input-context-collection.ts` に、動作は `action-carrying.ts` に、シェルが答える入口は `settled-entry-answers.ts` に、書き込みの門は `document-write-gate.ts` に、フレームの走行は `frame-run.ts` に、書き出しの絵は `export-scene.ts` に、ウィンドウの状態は `windows-hold.ts` に、検索の飛びは `search-hit-jump.ts` に、告げる理由と問いは `outcome-notices.ts` に、セッションの問い合わせは `screen-session-queries.ts` に、遅延診断の保持は `delay-diagnostics-hold.ts` に、ポインタの下は `under-pointer-hold.ts` に、押しは `pointer-press-hold.ts` に、パレットの置き場は `command-palette-place.ts` に、描いた絵の使い回しは `drawn-picture-hold.ts` に、掴んだタスクグループの端のスクロールは `task-group-grab-scroll.ts` に、宿主の時計の読みは `clock-readers.ts` に、ポインタの形は `pointer-shape.ts` に、掴んで動かす間の先の描画は `held-press-preview.ts` に、ブラウザに残す値の読み書きは `browser-stored-values.ts` に、操作の記録は `interaction-record.ts` に、表示の場所は `view-place.ts` に、時間でフレームを起こす待ちは `frame-clock-wakes.ts` に、名前付けと入力欄の出来事は `field-entry.ts` に、文書のファイルの流れは `document-file-flow.ts` に、透かしの解除の門は `watermark-unlock.ts` に、縦軸のズームの天井の使い回しは `task-group-band-ceiling-cache.ts` に、コピーと貼り付けは `copy-and-paste.ts` に問う。<br>削除が負う問いを立てるかは `EditDocument`（`PI-9`）に問い、告げ方（`NT-7`）だけを添える。<br>兄弟が共有する型と手の束を持ち、外の取り込み手のために兄弟の名を出し直す
- 試験の逐語（`tests/unit/uf-48-one-input-one-step.test.ts:25-30`）: `UF_48_ONE_ROAD` と `UF_48_INSIDE_THE_CALL` は新しい文にそのまま残る。⚠️ 計画 4.1 の案は「`SF-7`）と、」と書いて `UF_48_ONE_ROAD` の末尾「`SF-7`。」を壊していた —— 上は「現在値の保持 —— 」の形にして直した。`UF_48_ESC_ONE_RUNG` は `UF-219` の行へ逐語で移る（試験は 05-07 全体を見る）。
- 名が問いで変われば（Q1〜Q3）、この文の `frame-run.ts`・`outcome-notices.ts`・`windows-hold.ts` も同じ波で替える。

**`UF-123`（`session-effects.ts`）**

- 旧: 「状態機械が返した副作用を、返った順に 1 つずつ種類ごとの実行へ渡すこと（`runSessionEffects`）と、その実行の表の型（`EffectRunners` —— 副作用の種類の全数を 1 つ残らず求める。<br>全数は 表 T-280 ・ 表 T-286 ・ 表 T-289 ・ 表 T-290 ・ 表 T-292 ・ 表 T-293 の状態遷移表の升）、まだ結線していない領域の種類の置き場（`unwiredEffect` —— 呼ばれたら投げる。<br>シェルはその領域の出来事を送らないので届かない）」
- 新: 「状態機械が返した副作用を、返った順に 1 つずつ種類ごとの実行へ渡すこと（`runSessionEffects`）と、その実行の表の型（`EffectRunners` —— 副作用の種類の全数を 1 つ残らず求める。<br>全数は 表 T-280 ・ 表 T-286 ・ 表 T-289 ・ 表 T-290 ・ 表 T-292 ・ 表 T-293 の状態遷移表の升）と、シェルの副作用の手の表（どの手が各副作用を実行するか —— `screenEffectHandsOf` ・ `effectRunnersOf`）、まだ結線していない領域の種類の置き場（`unwiredEffect` —— 呼ばれたら投げる。<br>シェルはその領域の出来事を送らないので届かない）」

**`UF-161`（`view-place.ts`）**

- 旧: 「表示の場所（`OP-10`）を決める —— 保存された場所があればそれを使い、無ければ全体表示（`FR-055`）を 1 度だけ解いて保つ（表 T-071 の `CA-1` の ①）。<br>起動見本から始めたかを覚え、画面の寸法が変われば解き直し、別の文書が来たら忘れる。<br>起動見本の場所で描いているあいだに書き出す文書へ、その場所を載せる（`OP-10`）」
- 新: 旧の末尾に「<br>ズームの段と上下限（`S-96`〜`S-98`）を 1 か所で組む（`zoomLimits`）」を足す。

**表 T-063 の `UT-6`**（文の単位で置き換える）

- ファイルの欄: 末尾の「／ `resource-list-window.ts`」の後に、新しい 18 本を作る波の順で足す（`clock-readers.ts` ／ `outcome-notices.ts` ／ `screen-session-queries.ts` ／ `windows-hold.ts` ／ `search-hit-jump.ts` ／ `task-group-grab-scroll.ts` ／ `drawn-picture-hold.ts` ／ `command-palette-place.ts` ／ `pointer-press-hold.ts` ／ `delay-diagnostics-hold.ts` ／ `under-pointer-hold.ts` ／ `input-reception.ts` ／ `input-context-collection.ts` ／ `action-carrying.ts` ／ `settled-entry-answers.ts` ／ `document-write-gate.ts` ／ `frame-run.ts` ／ `export-scene.ts`）。
- 旧「「副作用が 2 度実行された」「種類の漏れが型検査を通った」は本ファイル、「書き込みの中身が違う」は `frame-loop.ts` の実行の行である（`UD-5`）。」
  → 新「「副作用が 2 度実行された」「種類の漏れが型検査を通った」「どの手に渡したか」は本ファイル、「書き込みの中身が違う」は手を持つ兄弟（`document-write-gate.ts` ほか）の行である（`UD-5`）。」（審査の `session-effects.ts` の fix）
- 旧「担当リストのウィンドウの入口は同書の 表 T-370 が変わったときに書き直す。」
  → 新「担当リストのウィンドウの入口は同書の 表 T-370 が、入力の受け取りは 表 T-078 の `FT-1` と 表 T-283 が、入力の文脈は `PI-18` の `InputContext` が、動作は 表 T-036 が、シェルが答える入口は 表 T-109 が、書き込みの門は `WS-2`・`WS-6`・`WS-7` と 表 T-230 が、フレームの走行は 表 T-068 と `LY-5` が、書き出しの絵は `FR-080`・`EP-11`・`EP-12` が、ウィンドウの状態は 表 T-335 が、検索の飛びは 表 T-332 が、告げる理由と問いは 表 T-233 が、セッションの問い合わせは `PI-39` が、遅延診断の保持は `FR-130` と `S-445` が、ポインタの下は 表 T-023d と `EZ-2` が、押しは `CS-2` と 表 T-289 が、パレットの置き場は `FR-053` が、描いた絵の使い回しは 表 T-071 の `CA-1` が、掴んだタスクグループの端のスクロールは `HF-15` が、宿主の時計の読みは `FT-4` 以外の時刻の読み（`WT-9`・`DV-12` ほか）が変わったときに書き直す。」
- 旧「兄弟が共有する語彙は `frame-loop.ts` に置き、`frame-loop.ts` が兄弟の名を出し直す。」
  → 新「兄弟が共有する型と手の束は `frame-loop.ts` に置き、値の語彙はそれを持つ兄弟に置く。<br>`frame-loop.ts` は外の取り込み手のために兄弟の名を出し直し、兄弟は `frame-loop.ts` から型だけを取り込む。」
- 旧「兄弟は閉包の値を、`frame-loop.ts` が 1 度だけ作る手の束（`FrameLoopHands`）から読む」
  → 新「兄弟は閉包の値を、`frame-loop.ts` が 1 度だけ作る手の束（`FrameLoopHands` ・ `FrameLoopParts`）から読む」
- 末尾の ⚠️ の文は残す（計画 4.2 のとおり）。

**表 T-064**（W9d）: `PI-37` + `displayLanguageOf`、`PI-18` + `KEY`、`PI-4` + `stepCount`。

### 3. 波（1 波 = 1 コミット、割る体は同時に 1 体）

前提: 確定表と問い Q1〜Q3 の答えを利用者に見せる → W0 照合器（分割前の木だけを読む別の体）を最初に併合。
**持ち主がまだ生まれていない宣言は、その持ち主の波まで入口（閉包）に残す**（途中の波では兄弟が入口の値を関数の中で読む —— 今のフォルダの形。頂上の初期化では読まない）。W10 で「兄弟が入口から取り込むのは型だけ」を数えて 0 を出口にする。各波のコミットに、新しいファイルの T-075 の行・`UT-6` のファイルの欄・`SU-3` +1 を入れる。

| 波 | 動かすもの（新しい行 ID） | 審査で変わった点 | 危険と見張り |
| --- | --- | --- | --- |
| W1 | `clock-readers.ts`（`UF-208`）・`outcome-notices.ts`（`UF-209`、理由と問いだけ）・`screen-session-queries.ts`（`UF-210`、G53x のフォルダの中の分）、ただ 1 人の使い手への定数（`field-entry`・`frame-clock-wakes`・`watermark-unlock`・`document-file-flow`） | `raiseFileFault`・`raiseWriteRefusal` は `outcome-notices.ts` へ行かない（前者は入口に残り、後者は W8）。`fileDragEventIn` は入口に残る | 頂上の `const` だけ。TDZ 無し。兄弟 11 本の取り込みを持ち主へ |
| W2 | `windows-hold.ts`（`UF-211`）・`search-hit-jump.ts`（`UF-212`）・`task-group-grab-scroll.ts`（`UF-213`）・`drawn-picture-hold.ts`（`UF-214`、頂上の部分）、`pointer-shape.ts` へ窓の縁の形 | ① `heldWindowsOf` の `spendEscapeRung` を `closeOnEscape(session, level): boolean`（閉じたら `true`）にし、段の出来事を送る残り半分は閉包の `spendEscapeRung` として入口に残す（W5 で `input-reception.ts` へ）。`ESCAPE_*` 9 宣言も W5 まで入口。② `proposalsNotIssuedSinceRun`・`DelayFixSubjectKey`・`FixLogSource` は W3 まで入口。③ `writeScrollPlace` は W8 まで入口 | `heldWindowsOf`・`taskGroupGrabCarryOf` は 49 行 —— 行を足さない（`closeOnEscape` で前者は減る）。順は保つ: 窓を閉じる試み → 閉じなければ段の出来事 |
| W3 | `FrameLoopParts` を入れる ＋ (M) 3 つ: `command-palette-place.ts`（`UF-215`）・`pointer-press-hold.ts`（`UF-216`、(F) は `collectPress` だけ）・`delay-diagnostics-hold.ts`（`UF-217`、(F) 3 つ ＋ 窓から来る直しの提案の数え）、`answerReportEntry` → `delay-diagnostics-report-window.ts` | `beginPointerPress`・`endPointerPress` は閉包に残し、中身を (M) の命令に替えるだけ（W5 で移す）。`raiseFileFault`・`raiseWriteRefusal` は動かさない | ⛔ `endPointerPress` の順: 押しを落とす → `sendToSession` → 押した時の角を消す（`restorePaletteCorner` の副作用がその間に角を読む、TRAP）→ 運びの終わり → 窓の押しの終わり → 角を窓の中へ |
| W4 | `under-pointer-hold.ts`（`UF-218`）＋ E31 を畳む | `dualCursorDrawnOf` は入れない（W9a まで入口） | `owesFrame` 26/15 —— 分岐を増やさない |
| W5 | `input-reception.ts`（`UF-219`）＋ I07 を畳む ＋ `beginPointerPress`・`endPointerPress` を (F) で ＋ `spendEscapeRung`（(F)）と `ESCAPE_RUNG_EVENTS`・`ESCAPE_*` 8 | `pruneChoiceTo` は入れない（W8 まで閉包） | `receiveInput` 156 行: 呼びの 1 行を `spendEscapeRung(p, escapeLevel, frame)` に替えるだけ。双子の基準線から I07 の 1 記録が消える（調整役が下げる） |
| W6 | `input-context-collection.ts`（`UF-220`）＋ G47（`view-place.ts` の `zoomLimits()`） | — | `collectInputContext` 46 行 —— 50 を超えない |
| W7 | `action-carrying.ts`（`UF-221`）＋ `settled-entry-answers.ts`（`UF-222`）＋ H08 | — | H08 は場面を作る前の `rasterizer` の見張りを残す。`PICTURE_COPIED` の後の `STACK_SAFETY_CAP` の順を残す |
| W8 | `document-write-gate.ts`（`UF-223`）＋ 生成の `EDITED_BY_SCREEN` ＋ `raiseWriteRefusal`・`pruneChoiceTo`・`writeScrollPlace` | 3 つを足す（審査）。`runFrame`（まだ閉包）と `task-group-grab-scroll.ts` は `pruneChoiceTo`／`writeScrollPlace` を門から読む | `generate_entity_types.py:3733`・`:3919` と `cr-768-….contract.test.ts:27` の道。`holder.replace` の順（透かしの刻 → `held` → 選択を刈る → 担当の選択を刈る → フレームを求める） |
| W9a | `frame-run.ts`（`UF-224`）: `runFrame`・`ask`・`runAskedFrame`・(M) 6 つ・`drawn-picture-hold` の (M) 化・ズームの端・パネルの幅・`dualCursorDrawnOf` ＋ 生成の 4 定数 | `exportScene` 側は入れない | `04-verification.md:303` の「フレームの走行」に `frame-run.ts`・`drawn-picture-hold.ts` を足す。`watermarkStampOf` は今の位置で作る（時計 → `S-99a`） |
| W9b | `export-scene.ts`（`UF-225`）: `exportScene`・`exportViewNow` と書き出しの見え方 6 | 新しい波（審査の Q1 の fix） | HELD `exportScene` の鍵を付け替え。`export-scene` → `frame-run` の一方向（`screenViewReadingsOf`） |
| W9c | `session-effects.ts` へ副作用の手（`screenEffectHandsOf`・`effectRunnersOf`）＋ `UT-6` の `UD-5` の文 | `UT-6` の文の直し（審査） | `screenEffectHandsOf` 49 行 —— 50 を超えない |
| W9d | G28・E39・I01 を畳む（T-064 に 3 名） | — | `PI-18` の行は CR-579 と併合の順で調整役が見る |
| W10 | 仕上げ: `UF-48` の文、`dom-screen-surface.ts:424` ほかの「どのファイルか」のコメント、兄弟 → 入口の値の取り込みが 0 であることを数える、dist を作り直して起動の確かめ | — | 出口の赤は、同じ作業木で src を `d0ae3a9c8` に戻して分ける（手順 6） |

**一方向の呼び**（全波で守る）: 入口 → 兄弟（値）、兄弟 → 入口（型だけ）。(F) どうし: `input-reception → {settled-entry-answers, action-carrying, search-hit-jump, delay-diagnostics-hold}`、`settled-entry-answers → {action-carrying, delay-diagnostics-hold, delay-diagnostics-report-window}`、`delay-diagnostics-report-window → {search-hit-jump, action-carrying}`、`frame-run → document-write-gate`（`pruneChoiceTo`・`writeScrollPlace`）、`task-group-grab-scroll → document-write-gate`、`export-scene → frame-run`、`windows-hold → delay-diagnostics-hold`（`proposalsNotIssuedSinceRun`）。逆向きは `parts` の関数で呼ぶ。

### 4. 利用者への問い（CR-578）

**Q1 —— フレームを 1 回走らせるファイルの名**
- 場面: 画面のフレームを 1 回走らせる中身。寸法が定まったら絵を組んで描き手へ渡し、見せる位置を文書に書かせ、通知を出し、焦点を合わせ、次のフレームに負うもの（見せる位置・焦点）を返す。書き出しの絵は別の新しいファイル `export-scene.ts`（書き出しの場面）へ分けた。
- 選択肢:
  - (A) `frame-run.ts`（フレームの走行）
  - (B) `frame-picture.ts`（フレームの絵）
  - (C) `frame-drawing.ts`（フレームの描画、計画の名のまま）
- 推奨 **(A)**。中身は描くだけでなく、見せる・告げる・書かせるまで含む。それを「フレームの走行」と呼ぶ語が `04-verification.md` にある。(B)(C) は絵だけを言う。そのうえ (C) は、同じ層の `*-drawing.ts`（DOM の描き手）や、`screen-frame.ts`（画面の枠）の「frame」と紛れる。

**Q2 —— シェルが告げる理由と問いを選ぶファイルの名**
- 場面: ファイルの失敗・書き込みの拒み・絵の失敗・使い切った入口といった「起きたこと」から、通知の理由（表 T-233）と確かめの問い（`NT-7`）を選ぶ表と関数。告げる命令そのもの（`raiseFileFault`・`raiseWriteRefusal`）は、直しの後は入口と書き込みの門にあるので、このファイルは選ぶだけになった（`pure`）。
- 選択肢:
  - (A) `outcome-notices.ts`（起きたことから選ぶ告げと問い）
  - (B) `fault-notices.ts` と `confirmation-questions.ts` の 2 つに分ける
  - (C) `shell-notices.ts`（シェルの通知）
  - (D) `notice-reasons.ts`（計画の名のまま）
- 推奨 **(A)**。(D) は理由の名簿の原稿 `notice-reasons.json` と生成の型 `NoticeReason` と同じ語なので、名簿そのものを持つファイルに読まれる。(A) はこれと紛れず、問いも含む。「choice」はシェルでは選択の意味に使っているので避けた。(B) は、問い（表 T-234）を変える理由を別に持たせたいときの案。

**Q3 —— ウィンドウの状態を持つファイルの名**
- 場面: ヘルプ・検索パネル・遅延診断レポート・担当リストの 4 つのウィンドウについて、状態（置き場・前後の並び・閉じた窓・検索の打った語とフィルタ）を持ち、押し・掴み・列の幅・閉じる・`Esc` に合わせて動かす。
- 選択肢:
  - (A) `windows-hold.ts`（ウィンドウの保持）
  - (B) `table-windows-hold.ts`（表の窓の保持）
  - (C) `table-window-places.ts`（表の窓の置き場、計画の名のまま）
- 推奨 **(A)**。表 T-335「ウィンドウの状態と振舞い」をそのまま持ち、ヘルプも入る。フォルダの `*-hold.ts` と、既存の工場 `heldWindowsOf` にも揃う。(B) だとヘルプが外れる。(C) は置き場以外の中身（打った語・フィルタ）を隠す。しかも `table-window.ts`（`UF-193`）・`window-box.ts`（`UF-189` 窓の置き場）と紛れる。

（審査の `task-group-grab-carry.ts` → `task-group-grab-scroll.ts` は競う名が無いので問わずに当てた。これで同じフォルダの「carry」は 1 つの意味（動作を運ぶ `action-carrying.ts`）だけになる。）

---

## CR-579 —— `input-command-translator.ts`（入口 + 新 6、既存 6 が育つ）

### 1. ユニットの表

| UF | ファイル | 責務の文 | 手書き行 | 中身（短く） | 形 ／ 純粋性 |
| --- | --- | --- | --: | --- | --- |
| `UF-30`（入口） | `input-command-translator.ts` | 2. の `UF-30` の新しい文のとおり | ≈892（計画の ≈890 ＋ 日の番号の名の出し直し 3 − `Schedule` からの取り込み 1。±30） | V（答えの語彙）・P・P'・E（`ENTRY`・振り分け・`armedByEntry`・`guideCursorModeOfEntry`・`VIEW_SCALE_ENTRIES`・`FIXED_ACTION_BY_ENTRY`）・L・X・`placementAt`・`taskShapeKindNamed`・`milestoneGlyphNamed`・`boxById`、生成の区画 | — ／ `pure` |
| `UF-226` | `src/entity/document-model/schedule/task-group-tree-position.ts`（`Schedule`、名は問い Q6 で確かめる） | タスクグループの親子の木の中の位置 —— 兄弟の順に前から歩いた順位（`IV-19`・`SV-8`）と根からの深さ —— を答え、親の無い群と環の群は木の外として数える | ≈48 | `taskGroupRankById`（3 つの写しを 1 つに）・**`taskGroupDepthOf(byId, taskGroup)`**（審査: 計画の `taskGroupTreeDepth` を改名。`edit-task-group.ts:105` の `depthOf` と入口の `taskGroupGrabDepthOf` を 1 つに） | 移 ／ `pure` |
| `UF-227` | `chart-coordinates.ts` | 日程表の上の点を、日（日の番号）とタスクグループに読み替え、スクロールの錨と注記の錨にする —— 錨の書き込みと、書き込みが既に効いているかの判定（`CM-66`）を含む | ≈260（R 178 ＋ D 45 ＋ 見出し 5 ＋ 取り込み ≈30） | D の 8 宣言すべて（`MS_PER_DAY`・`serialOfDay`・`dayFromSerial`・`dayShifted`・`dayAtX`・`pointerDaySerial`・`dayShift`・`compareDay` —— G01/G02 を畳まないので写しのまま移る）、R の 18 宣言 | 移 ／ `pure` |
| `UF-228` | `key-combos.ts`（名は問い Q4 で確かめる） | キーの名と、修飾キーとの組（キーとポインタ）を読み、修飾の割当（`MK-10`・`MK-12`・`MK-16`）・押したときの修飾（`CY-11`）・`Alt` の吸着（`SG-4`）・検索の語の欄が取るキー（`IN-5a`・`SV-5`）を判ずる | ≈120（107 ＋ 5 ＋ ≈8） | M の 12 宣言（`KEY`・`isCtrlHeld`・`isCombo`・`isAssignedPointerCombo`・`isCtrlDragCombo`・`releasedSnapOf`・`isDateKeepingDrag`・`gestureModifiers`・`isSingleCharacterKey`・`FIELD_CTRL_KEYS`・`isTypedIntoSearchWord`・`isEnterInSearchPanel`） | 移（葉: 入口からは `import type` だけ） ／ `pure` |
| `UF-229` | `task-alignment.ts` | 選んだタスクの予定を、最後に選んだタスクの始まりか終わりに揃える書き込みを作り（`FR-034`・`SL-7b`）、描いているタスクグループの中で選んだタスクが 2 つ未満なら揃えるものが無いと答える（`FR-029`） | ≈70 | `chosenDrawnTaskCount`・`alignWrites`・新 `alignAnswer(context, byStart)` | 移 ＋ 腕を 1 関数へ ／ `pure` |
| `UF-230` | `resource-list-entrances.ts` | 担当リストの入口（`IC-63` 〜 `IC-65`・`IC-67`・`IC-68`）を `FR-099` に従って担当の選びに変え、選びが変わらない押しには何もしないと答える（`FR-029`） | ≈45 | `resourceListChoiceCommand`・`resourceListChoiceOfEntry`・新 `commandFromResourceListEntry(entry, resourceUid, context)` | 移 ＋ 腕を 1 関数へ ／ `pure` |
| `UF-231` | `display-switch-entrances.ts`（名は問い Q5 で確かめる） | 表示を切り替える入口（表 T-109 の `FR-049` の切り替えと `IC-99`・`IC-100`・`IC-101`）を、押すたびに次の値へ移す文書の表示の設定値の書き込みに変える —— 次の値は描いた入口でなく文書の値から決める | ≈58（区画を除く） | `VisibleElement`・`visibleElementOfEntry`・`commandFromVisibleElement`・`FontSizeStep`・`nextFontSizeStep`・新 `commandFromDisplaySettingEntry(entry, context)`、生成 `VISIBLE_ELEMENT_BY_ENTRY`（W8）・`FONT_SIZE_STEPS`（W9） | 移 ＋ 腕を 1 関数へ ／ `pure` |
| `UF-92`（育つ） | `zoom-and-fit.ts` | 2. のとおり | 705 → ≈740 | Z の 3 宣言、新 `timeZoomAnswer(context, isIn)`（H11） | 移 |
| `UF-102`・`UF-96`・`UF-97`・`UF-90`（育つ） | `screen-state-input.ts` ／ `task-group-tree-entrances.ts` ／ `task-group-grab.ts` ／ `shortcut-keys.ts` | 変えない | ≈478 ／ ≈289 ／ ≈333 ／ 177 | `rememberedActualIn` ／ `taskGroupDepthOfGroup` ／ 新 `taskGroupChosen`（H13） ／ `timeZoomAnswer` を読む | 移 |
| `UF-98`（触れない） | `item-grab.ts` | 変えない | 1,117（±0） | 取り込みの出どころだけ（`taskGroupRankById` が `Schedule` から）。親の裁定で本 CR では割らない | — |

注:
- **1,000 の約束**: 入口 ≈892、新しい兄弟の最大 `chart-coordinates.ts` ≈260、育つ兄弟の最大 `zoom-and-fit.ts` ≈740。例外は `item-grab.ts`（今 1,117、本計画は 1 行も増やさない —— 規則 3）で、親の裁定どおり割らない。
- **G01/G02 を畳まない**（親の裁定、`DFC-1061` が持つ）: 計画の W2 の「`serial`・`dayFromSerial`・`compareDays` を `Schedule` から読む」と `dayShift` の `calendarDaysBetween` 化は外した。写しはそのまま `chart-coordinates.ts` へ移り、入口が `serialOfDay`・`dayFromSerial`・`compareDay`・`dayShift` を出し直す（`item-grab.ts:62-80`・`armed-placement.ts:33` の取り込みは変わらない —— 規則 1）。照合器の「設計した違い ①（年 0〜99）」は無くなる。`DFC-1061` は開けたまま。
- **兄弟が入口の値を読む**（親の裁定）: 今のフォルダの形のまま、関数の中でだけ読み、頂上の初期化では読まない。`key-combos.ts` だけは入口の `MODIFIER_ONLY_KEYS` が初期化で `KEY` を読むので葉（規則 4）。
- **審査の `task-group-tree` ③（`schedule-invariants.ts` の行と見出しから順位を外す）は直すものが無い**: `UF-131` の文「文書の不変条件を表 T-220 の行ごとに判じ、違反の箇所を返す」も、見出し `schedule-invariants.ts:1`「the document invariants, judged row by row of table T-220」も、順位を言っていない（`sed -n 390p docs/spec/05-07-design.md`・`head -4` で読んだ）。W1 で関数が出ていくだけで、文は変えない。
- **検査 55**: 計画の見込みと同じ（`zoom-and-fit.ts` が上限ちょうど、`chart-coordinates.ts` が際どい）。D の 4 宣言はコメント 0 行・コード ≈10 行なので、`chart-coordinates.ts` の密度は計画の見込みより少し良くなる。
- **検査 60**: 上がる行 0。新しい関数（`alignAnswer` ≈8・`commandFromResourceListEntry` ≈10・`commandFromDisplaySettingEntry` ≈20 行 4 分岐・`timeZoomAnswer` ≈4・`taskGroupChosen` ≈7）はどれも帯の下。`commandFromEntry`（139/59）は ≈98 行へ下がる。

### 2. 文が変わる既存の行（旧 → 新、逐語）

**`UF-30`（`input-command-translator.ts`）**
- 旧: 「`CP-18` の残り —— 入力の種類と押した所から、答える兄弟を選ぶ（表 T-023a・表 T-109）。<br>兄弟が共有する語彙と補助 —— 出力の型、日とタスクグループの座標、スクロールの錨 —— を持つ。<br>縦軸の上限の字と帯を、コピーせずに `PI-5`・`PI-37` へ問う」
- 新: 「`CP-18` の残り —— 入力の種類と押した所から、表 T-023a・表 T-109 の台帳に従って答える —— 固定の動作は自ら答え、ほかは答える兄弟を選ぶ。<br>兄弟とシェルが共有する語彙（入力の文脈と押し・出力の型・`Esc` の段の材料 `IN-4`）と、兄弟が共有する小さな補助を持ち、日程表の座標の読みとキーの名・修飾の組の読みを出し直す」
  - 審査の文の「修飾キーの読み」を、Q4 の仮の名（`key-combos.ts`）の中身に合わせて「キーの名・修飾の組の読み」とした。
- 負う要求: 旧「`FR-016`（`OW-3`）・`FR-034`（`OW-1`）・`FR-040`（`OW-4`）・`FR-070`（`OW-3`）」→ 新「`FR-016`（`OW-3`）・`FR-040`（`OW-4`）・`FR-070`（`OW-3`）」（`FR-034`（`OW-1`）は `UF-229` へ、W6）。

**`UF-92`（`zoom-and-fit.ts`）**
- 旧: 「日程表の倍率を決めて書き込む —— 1 段のズームと、全体を収めること」
- 新: 「日程表の倍率を決めて書き込む —— 1 段のズームと、全体を収めること。<br>縦軸の上限の字と帯を、コピーせずに `PI-5`・`PI-37` へ問う」（W3）

**表 T-063 の `UT-10`**
- 旧（末尾の文）: 「兄弟が共有する語彙と補助、入口の振り分け（表 T-023a・表 T-109）は公開エントリに置いた」
- 新: 「兄弟が共有する語彙と入口の振り分け（表 T-023a・表 T-109）は公開エントリに置き、兄弟が共有する補助のうち日程表の座標の読みとキーの名・修飾の組の読みは兄弟に置いて公開エントリから出し直した」

**表 T-064**: `PI-1` に `taskGroupRankById`・`taskGroupDepthOf`（W1）、`nextIssuedUid`（W11）、任意で `taskUidsInTaskGroups`（W12）。`PI-18` は変えない。

### 3. 波（1 波 = 1 コミット）

計画 4 節の規則 規則 1〜規則 7 はそのまま。各波のコミットに T-075 の行・`PI-1` の名・`SU-3` +1 を入れる。

| 波 | すること（新しい行 ID） | 計画から変わった点 |
| --- | --- | --- |
| W1 | `Schedule` に `task-group-tree-position.ts`（`UF-226`）: `taskGroupRankById`（3 つの写しを 1 つに）と `taskGroupDepthOf(byId, taskGroup)`。`schedule.ts` が出し直す。入口の `taskGroupDepthOfGroup` を `task-group-tree-entrances.ts` へ。検査 70 の 2 記録を消す | ファイル名と関数名（審査）。`UF-131` の文は変えない |
| W2 | G65・G22(a) だけ: `TASK_SHAPE_KINDS`・`TASK_MILESTONE_GLYPHS` を消し、`taskShapeKindNamed`・`milestoneGlyphNamed`（改名）が `COLUMN_SHAPES.TaskVisual` の `choices` を読む | ⛔ G01・G02 は外した（`MS_PER_DAY`・`serialOfDay`・`dayFromSerial`・`compareDay`・`dayShift` は W4 で写しのまま移る）。`item-grab.ts` は本波で触れない |
| W3 | Z を `zoom-and-fit.ts` へ ＋ H11 `timeZoomAnswer` | — |
| W4 | `chart-coordinates.ts`（`UF-227`）: R の 18 ＋ D の 8 宣言。入口が 19 名を出し直す（計画の 16 ＋ `serialOfDay`・`dayFromSerial`・`compareDay`。`dayShift` は計画の 16 に入っている） | D をすべて持つ。検査 55 を測って報告 |
| W5 | `key-combos.ts`（`UF-228`）: M の 12 宣言。入口が 6 名を出し直す（規則 4 の葉） | ファイル名と文（審査） |
| W6 | `task-alignment.ts`（`UF-229`） | — |
| W7 | `resource-list-entrances.ts`（`UF-230`） | — |
| W8 | `display-switch-entrances.ts`（`UF-231`）＋ 生成の区画 `VISIBLE_ELEMENT_BY_ENTRY` の行先 | ファイル名（審査）。`generate_entity_types.py` の `TARGETS` と検査 21 の行も新しい名で |
| W9 | `ARMED_BY_ENTRY`（入口）と `FONT_SIZE_STEPS`（`display-switch-entrances.ts`）を生成する | 行先の名だけ |
| W10 | `FIXED_ACTION_BY_ENTRY` の表、H13 `taskGroupChosen`、`rememberedActualIn` → `screen-state-input.ts` | — |
| W11 | `nextIssuedUid` を `schedule.ts` へ（`DFC-1066` ②） | — |
| W12〜W15（任意） | E32/N1・生成の 3 群の行先・H19・`placementAt` | — |

⭐ 1,000 を切るのは W7 の後（≈974）。計画の 2.4 節の表との違いは、W2 の −18 行が W4 へ移り、W4 で出し直しが 3 行増えるだけ —— W2 の後 ≈1,418、W3 の後 ≈1,385、W4 の後 ≈1,156、W7 の後 ≈974、W11 の後 ≈892。
併合: CR-579 は G01/G02 を畳まないので `calendar-day.ts` には触れない。CR-580 と重なるのは `schedule.ts` の出し直しの塊（別の行）と `PI-1` だけ。

### 4. 利用者への問い（CR-579）

**Q4 —— キーの名と修飾の組を読むファイルの名**
- 場面: キーの名の全部の表 `KEY`（`F1`・`A`〜`Z`・`Enter`・`Esc`・`Delete` ほか）と、Ctrl・Shift・Alt とキーやポインタとの組を読む小さな関数が入る。修飾の割当・押したときの修飾・`Alt` の吸着・検索の語の欄が取るキーを判ずる。
- 選択肢:
  - (A) `key-combos.ts`（キーの組）
  - (B) `modifier-keys.ts`（修飾キー、計画の名のまま）
  - (C) `input-modifiers.ts`（入力の修飾）
  - (D) `key-names.ts`（`KEY` と検索の語の欄のキー）と `modifier-combos.ts` の 2 つに分ける
- 推奨 **(A)**。フォルダで使っている語 `isCombo` と同じで、キーの名と修飾の組の両方を言う。(B)(C) は `KEY` の英字や `F` キーを言わない。しかも (B) は、同じフォルダの `shortcut-keys.ts`（打鍵 → 操作）と「-keys」で並んでしまう。

**Q5 —— 表示を切り替える入口のファイルの名**
- 場面: 押すたびに次の値へ移る入口が入る。見せる・隠すの切り替え（`FR-049`）、文字の大きさの段（`IC-99`）・色（`IC-100`）・積む向き（`IC-101`）。表示の倍率の入口は別のファイル `display-scale-steps.ts` に残る。
- 選択肢:
  - (A) `display-switch-entrances.ts`（表示の切り替えの入口）
  - (B) `display-setting-entrances.ts`（表示の設定の入口、計画の名のまま）
  - (C) `appearance-entrances.ts`（見た目の入口）
- 推奨 **(A)**。中身は「押すたびに次の値へ移す切り替え」で、倍率を含まないことが名から読める。(B) は倍率も表示の設定なのに含まないので、名が中身より広い。しかも `display-scale-steps.ts` と頭の語が同じになる。

**Q6 —— `Schedule` に作るタスクグループの木の位置のファイルの名**
- 場面: タスクグループの親子の木の中の位置だけを答える小さなファイル（エンティティの層）。兄弟の順に歩いた順位と、根からの深さ。今は 3 か所に同じ写しがある順位と、2 か所にある深さを 1 つにする。関数名はどちらの案でも `taskGroupRankById` と `taskGroupDepthOf`。
- 選択肢:
  - (A) `task-group-tree-position.ts`（タスクグループの木の中の位置）
  - (B) `task-group-tree.ts`（タスクグループの木、計画の名のまま）
- 推奨 **(A)**。中身は木の中の位置（順位と深さ）だけ。(B) は木について何でも入る名で、太っていく予告になる（R2.1 の Use Case の名と同じ理屈）。しかもアダプタの `task-group-tree-entrances.ts` と同じ語になる。

---

## CR-580 —— `mspdi-codec.ts`（入口 + 新 6、既存 2 が育つ）

### 1. ユニットの表

| UF | ファイル | 責務の文 | 手書き行 | 中身（短く） | 形 ／ 純粋性 |
| --- | --- | --- | --: | --- | --- |
| `UF-36`（入口） | `mspdi-codec.ts` | 2. の `UF-36` の新しい文のとおり（主の句「`Project` 要素と文書を相互に写す」） | ≈532（計画の ≈535 − `MUST_START_ON` 3） | 計画 1.2 の「入口に残す」の宣言（`MUST_START_ON` を除く）、`writtenCalendars`・`writtenAssignments` を呼ぶ組み立て | — ／ `pure` |
| `UF-232` | `mspdi-carry-split.ts`（名は問い Q7 で確かめる） | 要素の子のうち文書が読まないものを読むときに切り分けて控え —— 葉は `carry` に、子を持つ要素は届いた順の番号と共に `carryElements` に（`DF-3`・`RS-60`）—— 同じ名の葉は最初を取って残りの数を数え（`MR-3`）、戻すのは `mspdi-child-placement.ts` に任せる | ≈62 | `CarrySplit`・`carrySplit`・`carriedElement`・`keepFirstLeaf`・`duplicateLeafCount` | 移 ／ `pure` |
| `UF-233` | `mspdi-actual-durations.ts` | `MSPDI` の実績の長さ（`ActualDuration`）と文書の停止日（`stop`）を相互に写す（`FR-011`・`AT-141`・表 T-019） —— 読むときは長さを文書の暦で進めて停止日を置き、長さが読めない・数えられないときは告げ、書くときは日時から実績の長さを作り（表 T-059 の `DV-11`）、元の長さを持ち回っているあいだは停止日を書かない | ≈100 | `STOP_COUNTED_FROM`・`minutesOfDuration`・`withStopsFromActualDurations`・`minutesOfActualDuration`・`writtenStop`・`writtenActualDuration`（E04 で数え手を読む） | 移 ／ `pure` |
| `UF-234` | `mspdi-calendars.ts` | `MSPDI` の `Calendar` 要素を、子の `WeekDay`・`Exception`・`WorkingTime` と共に文書の暦へ相互に写す（`AT-158`〜`AT-162`） —— 繰り返す例外日は実の日付へ広げずに告げ、書くときは一度きりの例外日に読み手が要る 2 つの葉を補う（表 T-059 の `DV-13`・`DV-14`、`EX-13`） | ≈233 | 計画 1.2 の「暦」16 宣言 ＋ 新 `writtenCalendars(schedule)` | 移 ／ `pure` |
| `UF-235` | `mspdi-resources.ts` | `MSPDI` の `Resource` 要素と文書の担当者を相互に写す —— `UID` の無い行と空の行は原形のまま控え、書き出すときに `ID` を振り直す（表 T-059 の `DV-10`） | ≈75 | `RESOURCE_CONSUMED`・`ResourcesReading`・`resourcesFromRoot`・`writtenResources` | 移 ／ `pure` |
| `UF-236` | `mspdi-assignments.ts` | `MSPDI` の `Assignment` 要素と文書の割当を相互に写す —— プロジェクトの要約タスクを指す行と `UID` の無い行は原形のまま控え（`MR-4`）、書くとき `Units` が無ければ補う（表 T-059 の `DV-15`、`EX-14`） | ≈79 | `WHOLE_UNITS`・`ASSIGNMENT_CONSUMED`・`AssignmentsReading`・`assignmentsFromRoot`・`writtenAssignment` ＋ 新 `writtenAssignments(schedule)` | 移 ／ `pure` |
| `UF-237` | `mspdi-tasks.ts` | `MSPDI` の `Task` 要素を、子の `PredecessorLink` と共に文書のタスクと依存へ相互に写す —— アウトラインの段から WBS の親と並びを読み（`FR-021`）、書くときは WBS の順に並べて `ID`・`OutlineLevel`・`OutlineNumber`・`Summary` を作り（表 T-059 の `DV-4`〜`DV-7`）、`GRS` が作った文書のタスクには制約の 2 列と予定の長さを書き（`EX-11`・`EX-12`・`DV-8`）、フェード日数は `mspdi-fade-frames.ts` に、実績の長さと停止日は `mspdi-actual-durations.ts` に問う | ≈400（計画の ≈397 ＋ `MUST_START_ON` 3） | 計画 1.2 の「タスク」21 宣言（**`MUST_START_ON` を含む** —— 審査） | 移 ／ `pure` |
| `UF-154`（育つ） | `mspdi-child-placement.ts` | 2. のとおり | 186 → ≈205 | `splicedCarriedRows` | 移 |
| `UF-170`（育つ） | `src/entity/document-model/schedule/calendar-day.ts` | 2. のとおり | ＋≈6 | `durationTextOfMinutes`（G33） | 畳み |

注:
- **1,000 の約束**: 入口 ≈532、兄弟の最大 `mspdi-tasks.ts` ≈400。入口は 501〜1,000 の帯に残るが責務は 1 つ（審査: R2.2b は要約で pass。JDG-695 の後段に当たらない）。
- **`MUST_START_ON`**（審査の fix）: 読み手は `writtenConstraintOfGrs` だけ（`grep -n MUST_START_ON src/adapter/document-codec/*.ts` → `:1213` の宣言と `:1224` の 1 か所）。⇒ `mspdi-tasks.ts` へ。G34 を畳まないことは変わらない（`DFC-1063`）。
- **兄弟が入口の値を読む**（親の裁定、`UT-17` の語彙を公開エントリに置く逐語）: 関数の中でだけ読む。TDZ の数えを各波の出口にする（計画 2 節）。
- **G33・E04**（親の裁定）: `durationTextOfMinutes` を `calendar-day.ts` に置く（案 a）。E04 は既存の `workingTimeCounterOf(within).actualLengthMinutes(task)` を使い、新しい名を足さない。
- **検査 55・60**: 計画のとおり（入口 コード 426/コメント 42 で上限 47、`tasksInWbsOrder` の HELD の鍵を W7 で付け替えるだけ。新しい関数は `writtenCalendars`・`writtenAssignments` 各 ≈5 行）。

### 2. 文が変わる既存の行（旧 → 新、逐語）

**`UF-36`（`mspdi-codec.ts`）**
- 旧: 「`MSPDI` の要素の木と文書を、列ごとに相互に写す（`FR-021`・`FR-057`） —— 読まない子を `carry` に控えて書くとき元の位置へ戻し（`DF-3`・`MR-3`・`RS-60`）、プロジェクトの要約タスクを `Task` にせず原形のまま控え（`MR-4`・`EX-5`）、版を判じ（`EX-1`・`AT-143`）、書き出すときに作る値を作り（表 T-059）、実績の長さを停止日に直し（`FR-011`・`AT-141`）、制約の 2 列を写す（`EX-11`・`EX-12`）。<br>XML の文字列と要素の木の変換は `mspdi-xml.ts` に、書き出す要素の子の並び（`EX-10`）は `mspdi-child-placement.ts` に、フェード日数と拡張領域の枠（`EX-6`・`EX-8`）は `mspdi-fade-frames.ts` に、取り込んだタスクのタスクグループと所属（`FR-058`）は `mspdi-imported-task-groups.ts` に問う。<br>兄弟が使う要素の木の語彙と、外へ見せる入口と型を持ち、外れの型を出し直す」
- 新（W7 の後の最終の文）: 「`MSPDI` の `Project` 要素と文書を相互に写し、文書を組み立てる（`FR-021`・`FR-057`） —— プロジェクトの要約タスクを `Task` にせず原形のまま控え（`MR-4`・`EX-5`）、版を判じ（`EX-1`・`AT-143`）、取り込み元の名前空間を控え（`EX-15`）、`Project` に書き出すときに作る値を作る（表 T-059 の `DV-1`〜`DV-3`・`DV-12`）。<br>`Calendar`・`Task`・`Resource`・`Assignment` の要素は `mspdi-calendars.ts`・`mspdi-tasks.ts`・`mspdi-resources.ts`・`mspdi-assignments.ts` に、読まない子を読むときに切り分けて控えるのは `mspdi-carry-split.ts` に、実績の長さと停止日は `mspdi-actual-durations.ts` に、XML の文字列と要素の木の変換は `mspdi-xml.ts` に、書き出す要素の子の並びと持ち回った子と行の戻し（`EX-10`・`DF-3`）は `mspdi-child-placement.ts` に、フェード日数と拡張領域の枠（`EX-6`・`EX-8`）は `mspdi-fade-frames.ts` に、取り込んだタスクのタスクグループと所属（`FR-058`）は `mspdi-imported-task-groups.ts` に問う。<br>兄弟が使う要素の木の語彙と要約タスクの判じ、外へ見せる入口と型を持ち、外れの型を出し直す」
- 波ごとに、その波が出した集まりの句を「…に問う」の列へ移す（W2 控え、W3 実績の長さ、W4 暦、W5 担当者、W6 割当、W7 タスクと制約）。負う要求は変えない。

**`UF-154`（`mspdi-child-placement.ts`）**（W2）
- 旧: 「書き出す要素の子を、交換相手のスキーマの `xsd:sequence` の順に置く（`EX-10`） —— 持ち回った子を届いた順で戻し、宣言の無い子を宣言された隣に付ける。<br>順の名簿（`pj15` だけが宣言する子の印を含む）を `mspdi-child-order.json` から持ち、`xsd:all` の親と名簿に無い親の子は届いた順に置く」
- 新: 「書き出す要素の子を、交換相手のスキーマの `xsd:sequence` の順に置く（`EX-10`） —— 持ち回った子と、集まりの中の持ち回った行（`DF-3`）を届いた順で戻し、宣言の無い子を宣言された隣に付ける。<br>順の名簿（`pj15` だけが宣言する子の印を含む）を `mspdi-child-order.json` から持ち、`xsd:all` の親と名簿に無い親の子は届いた順に置く」

**`UF-170`（`calendar-day.ts`）**（W1）
- 旧: 「暦の日付（`CalendarDay`）を字と相互に変え、比べ、日の番号で数える（`EX-2`・`EX-7`・`FD-6`）。<br>日を表す鍵の字（時刻を持たない読みのための字）と、丸 1 日の始まりと終わりの字（`01-04-requirements.md` の 表 T-350 の `WT-6`〜`WT-8`）を別に作る」
- 新: 「暦の日付（`CalendarDay`）を字と相互に変え、比べ、日の番号で数え（`EX-2`・`EX-7`・`FD-6`）、時間の量（分）を交換の綴り `PTnHnMnS`（`EX-9`）で書く。<br>日を表す鍵の字（時刻を持たない読みのための字）と、丸 1 日の始まりと終わりの字（`01-04-requirements.md` の 表 T-350 の `WT-6`〜`WT-8`）を別に作る」
- ファイルの見出し（`calendar-day.ts:1`）も「… and the exchange text of a length in minutes.」を足す（計画どおり）。

**表 T-063 の `UT-17`**
- ファイルの欄: 「／ `mspdi-imported-task-groups.ts`」の後に、波ごとに 1 つ足す: `mspdi-carry-split.ts` ／ `mspdi-actual-durations.ts` ／ `mspdi-calendars.ts` ／ `mspdi-resources.ts` ／ `mspdi-assignments.ts` ／ `mspdi-tasks.ts`。
- 理由の欄の「取り込んだタスクから作るタスクグループと所属は `FR-058` と `AT-51` が変わったときに書き直す。」
  → 「取り込んだタスクから作るタスクグループと所属は `FR-058` と `AT-51` が、`MSPDI` の集まりごとの写しは交換相手のスキーマのその集まり（`Calendar`・`Task`・`Resource`・`Assignment`）の列が、読まない子を控える規則は `DF-3`・`MR-3` が、実績の長さと停止日の換算は `FR-011`・`AT-141` が変わったときに書き直す。」
- 旧「`MSPDI` の兄弟が共有する要素の木の語彙（要素の道・葉の読み書き・告知）は公開エントリに置いた」
  → 新「`MSPDI` の兄弟が共有する要素の木の語彙（要素の道・葉の読み書き・告知）と、プロジェクトの要約タスクの判じ（`MR-4`）は公開エントリに置いた」（W6）

**表 T-064**: `PI-1` に `durationTextOfMinutes`（W1）だけ。

### 3. 波（1 波 = 1 コミット）

| 波 | 動くもの（新しい行 ID） | 計画から変わった点 |
| --- | --- | --- |
| W0 | 照合器（分割前の木だけを読む別の体） | 「前」の sha は CR-579 の後でなくてもよい（CR-579 は `calendar-day.ts` に触れなくなった）。ただし `schedule.ts`・`PI-1` が重なるので、併合の順は調整役が決める |
| W1 | G33（`durationTextOfMinutes` を `calendar-day.ts` へ、3 つの呼びを切り替え）・E04（数え手へ）、`UF-170` の文、`PI-1` に 1 名 | 併合の注を直した: CR-579 と重なるのは `schedule.ts` の別の塊と `PI-1` だけ |
| W2 | `mspdi-carry-split.ts`（`UF-232`）、`splicedCarriedRows` → `mspdi-child-placement.ts`、`UF-154` の文 | ファイル名と文（審査） |
| W3 | `mspdi-actual-durations.ts`（`UF-233`） | — |
| W4 | `mspdi-calendars.ts`（`UF-234`）＋ `writtenCalendars` | — |
| W5 | `mspdi-resources.ts`（`UF-235`） | — |
| W6 | `mspdi-assignments.ts`（`UF-236`）＋ `writtenAssignments`、`UT-17` の要約タスクの判じの文 | — |
| W7 | `mspdi-tasks.ts`（`UF-237`）＋ **`MUST_START_ON`**、`UF-36` の最終の文、`function-size-baseline.txt` の `tasksInWbsOrder` の鍵の付け替え | `MUST_START_ON` を入口に残さない（審査）。スキーマを読む 13 本は根の作業木で W7 の後に 1 度 |

呼びの順（暦 → タスク → 担当者 → 割当、`withStopsFromActualDurations` は最後）と許す字の違い D-a〜D-d は計画のとおり。

### 4. 利用者への問い（CR-580）

**Q7 —— 読まない子を控えるファイルの名**
- 場面: `MSPDI` を読むとき、要素の子のうち文書が読まないものを切り分けて控える 5 つの宣言（`carrySplit` ほか）が入る。書くときに元の位置へ戻す仕事は、別のファイル `mspdi-child-placement.ts` にある。版の判じが読む `carryHoldersOf` は入口に残る。
- 選択肢:
  - (A) `mspdi-carry-split.ts`（控えの切り分け）
  - (B) `mspdi-carry.ts`（控え、計画の名のまま）。文には「読むときに切り分ける。戻すのは `mspdi-child-placement.ts`」と書く
- 推奨 **(A)**。関数 `carrySplit` と同じ語で、読む側だけを持つことが名から読める。(B) は控えの全部を持つように読めるので、開いた人が戻しの仕事を探しても見つからない。

---

## 付: 審査の直しの扱いの一覧

| CR | 審査の直し | 扱い |
| --- | --- | --- |
| 578 | 入口の畳みの記録（主を 1 つ） | 表の欄には畳みを書かない約束なので、文の中身は変えずに当てた。`UF-48` の文は主の句「フレームの 1 周期の部品を 1 度だけ結ぶ」と、保持する値・禁止・継ぎ目の実装に分けて書いた |
| 578 | `frame-drawing.ts` → `frame-run.ts` ＋ `export-scene.ts`、`dualCursorDrawnOf` を移す | 当てた（Q1） |
| 578 | `pruneChoiceTo`・`raiseWriteRefusal` → 門、`raiseFileFault` → 入口 | 当てた（読み手: `pruneChoiceTo` は `holder.replace` `:2958`・`runFrame` `:3140`、`raiseWriteRefusal` は `:3708`・`:3716`） |
| 578 | `table-window-places.ts` → `windows-hold.ts`、`ESCAPE_*` → `input-reception.ts`、直しの提案の数え → `delay-diagnostics-hold.ts` | 当てた（Q3）。`ESCAPE_*` 9 は `ESCAPE_RUNG_EVENTS` の中でだけ読まれる（`grep -n`）。窓の工場の `spendEscapeRung`（`:2186`）を、窓を閉じる `closeOnEscape` と段の出来事を送る (F) `spendEscapeRung` の 2 つに分けた（呼ぶ順は変わらない） |
| 578 | `beginPointerPress`・`endPointerPress` を「入口か `input-reception.ts`」へ | 審査の 2 案のうち `input-reception.ts` を選んだ。理由: 呼び手は `receiveInput` だけ（`:4163`・`:4166`・`:4212`）。入口に置くと、兄弟は入口から型しか取り込めないので、`parts` を 1 段余計に経ることになる |
| 578 | `task-group-grab-carry.ts` → `task-group-grab-scroll.ts`、`writeScrollPlace` → 門 | 当てた（読み手: `:2137`・`:2290`） |
| 578 | `settled-entry-answers.ts` の文、`clock-readers.ts` の文を狭める、`fileDragEventIn` を入口へ（任意） | 当てた（`fileDragEventIn` の読み手は返す面 `:4404` だけ） |
| 578 | `UT-6` の `UD-5` の文 | 当てた（W9c） |
| 579 | 入口の文、`modifier-keys.ts`（Q4）、`display-setting-entrances.ts`（Q5）、`task-group-tree.ts`（Q6）と `taskGroupDepthOf` | 当てた。`schedule-invariants.ts` の文と見出しからは、外す字が無かった（順位を言っていない） |
| 580 | `MUST_START_ON` を `mspdi-tasks.ts` へ、`mspdi-carry.ts`（Q7） | 当てた |

退けた直し: 0。
