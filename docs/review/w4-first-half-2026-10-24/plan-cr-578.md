# CR-578 の計画 —— `frame-loop.ts` を 1,000 行の下まで割る（2026-10-24、計画の体）

> 読んだ木: ブランチ `w4-first-half` の `d0ae3a9c8`（作業木）。行番号はすべてこの木。
> CR 本文（`change-request/CR-578-…md`、`d65097b9` で起草）の数と file:line は古い。**決めた向き**（入口は 850 前後・兄弟は 1,000 以下・(F)/(M) の 2 形・書き出しの絵は FRAME と・`Agent API` の継ぎ目は入口と・NOTE は別ファイル・`CR-579` の継ぎ目 4.1）と、引いている裁定 `JDG-680`・`JDG-681`・`JDG-695` はそのまま受ける。
> 測りの台本はスクラッチパッド（このファイルと同じフォルダ）: `refs.mjs`（参照の図）・`lets.mjs`（`let` の読み書き）・`partition.mjs` ＋ `map-v4.json`（宣言 → ユニットの割り当てと行の和）・`cochange.mjs`（共変）・結果 `partition-v4.txt`・`units-v4.txt`・`cochange-v4.txt`。

---

## 1. 測った事実

### 1.1 大きさ

| 項目 | 値 | 測り方 |
| --- | --- | --- |
| `frame-loop.ts` 全行 | 4,464（手書き 4,409 ＋ 生成 55、`:4410-:4464`） | `wc -l`、`awk '/<generated -- do not edit by hand>/{g=1} !g{n++} /<\/generated>/{g=0} END{print n}'` |
| 取り込み・出し直し | `:1-:308`（308 行） | `node docs/review/w4-first-half-2026-10-24/scripts/outline.mjs <file>` |
| 継ぎ目の型 | `:310-:450`（`FrameEnvironment` 〜 `FrameLoopHands`） | 同上 |
| 閉包の外の頂上の宣言 | `:452-:2877` と生成の区画 | 同上（329 の頂上の宣言、`refs.mjs`） |
| 閉包 `frameLoop` | `:2880-:4408`、1,529 行・分岐 5。`let` 30・内側の関数とその他の項 111・返す面 `:4279-:4407`（129 行、項 20） | outline ＋ `function-size.mjs`（検査 60 と同じ測り。基準線の HELD は 1531/5） |
| 兄弟の手書き行（同じ awk） | `document-file-flow.ts` **1,320** ／ `single-html-shell.ts` 700 ／ `shown-tasks-hold.ts` 467 ／ `pointer-shape.ts` 413 ／ `field-entry.ts` 286 ／ 残り 15 本は 229 以下 | `for f in src/framework/single-html-shell/*.ts` に同じ awk |
| 検査 60 の帯に近い関数（50 行・15 分岐） | `receiveInput` 156/68・`carryOutAction` 155/45・`runFrame` 122/11・`answerSettledEntry` 71/24・`exportScene` 68/2（以上 HELD）／ 帯の手前: `effectRunnersOf` 49・`taskGroupGrabCarryOf` 49・`heldWindowsOf` 49・`collectInputContext` 46・`owesFrame` 26/**15**・`isBrowserDefaultStopped` 22/13 | `{"files":[{file,text}]}` を `.claude/skills/spec-graph-check/function-size.mjs` の stdin へ |
| 検査 55（コメントの密度） | `frame-loop.ts` 9.8%（code 3,424 ／ comment 371）、木 9.7%（余り 190 行） | `python .claude/skills/spec-graph-check/check-comment-rules.py --list` |

### 1.2 閉包の `let` の棚卸し（30）と置き場

測り方: `refs.mjs` が閉包の各項の識別子の読み（`R`）と代入（`W`、`??=` を含む）を集め、`lets.mjs` が `let` ごとに並べた（名で照合。影になる局所名は見ていない —— 置き場の判定には足りる）。
**30 のすべてが (M) の形で置ける。止まる `let` は無い。**

| `let` | 書く項 | 読む項（主なもの） | 置き場（書く者が持つ） |
| --- | --- | --- | --- |
| `session` ・ `savedDocument` | `sendToSession` | ほぼ全部 | 入口（`sendToSession` が入口に残る） |
| `environment` | 返す面 `resize`・`settleFirstFrameEnvironment` | `runFrame` ほか 13 | 入口 |
| `agentApiEnablingWatch` | 返す面 `watchAgentApiEnabling` | `storeAgentApiEnabling`（入口） | 入口 |
| `held` | `holder.replace` | 22 項 | `document-write-gate.ts` の (M) `documentHolderOf` |
| `watermarkStampedAt` | `holder.replace` | `watermarkNow` | `frame-drawing.ts` の (M) `watermarkStampOf`（`restamp()` を `holder.replace` が呼ぶ） |
| `values` ・ `owed` | `runFrame`・`ask` | `hands` ほか 15 | `frame-drawing.ts` の (M) `frameValuesHoldOf`（`ask` ・ `readValues` ・ `isFrameOwed`） |
| `drawnPicture` | `runFrame` | `runFrame` | `drawn-picture-hold.ts` の (M)（`beneath-picture-hold.ts` と同じ形） |
| `stackSafetyCapToldFor` | `runFrame` | `runFrame` | `frame-drawing.ts` の (M)（`isNewCapStop(layout)`） |
| `isTooltipStanding` ・ `shownNotices` | `runFrame` | `owesFrame`・`receiveInput`・`isBrowserDefaultStopped`・`dismissNoticeByKey` | `frame-drawing.ts` の (M) `shownFrameHoldOf`（いま描いた絵が見せているもの） |
| `isSearchWordFocusOwed` ・ `addedTaskGroupOwedSight` | 副作用の手（`focusSearchWord`・`bringCreatedTaskGroupIntoSight`）と `runFrame`（取り下げ） | `runFrame` | `frame-drawing.ts` の (M) `frameOwingsOf`（次のフレームに負うもの） |
| `lastPanelFaces` | `followPanelFace` | 同 | `frame-drawing.ts` の (M)（パネルの幅の追従） |
| `pressed` | `endPointerPress`・`carryOutAction`（パレットの追従・掴みの運び）・`receiveInput` | `runFrame` ほか 7 | `pointer-press-hold.ts` の (M) `pointerPressHoldOf` |
| `previewDocument` ・ `heldPropertyPanelWidth` | `replaceHeldDocumentAt`（消す）・`receiveInput` | `runFrame` | 同じ (M)（押しが先に見せるもの。`holdPreview` ・ `forgetPreview`） |
| `commandPaletteDraggedTo` ・ `commandPaletteCornerAtPress` | 副作用の手 `restorePaletteCorner`・`endPointerPress`・`carryOutAction`・`receiveInput`・返す面 `resize` | `runFrame`・`effectRunners` | `command-palette-place.ts` の (M) |
| `delayDiagnosticsShown` ・ `delayDiagnosticsHeld` | `showDelayDiagnostics`・`delayDiagnosticsNow`（`??=`）・`receiveInput`（`heldAfterMarkerOperated`） | `runFrame`・`answerSettledEntry`・返す面 | `delay-diagnostics-hold.ts` の (M)（`noteMarkerOperated(uid)` を `receiveInput` が呼ぶ） |
| `pointerAt` ・ `partUnderPointer` ・ `grabUnderPointer` ・ `pointerWalk` ・ `hintReleasedEntry` ・ `hintTarget` ・ `hintWalk` | `receiveInput`・`answersAtPointerOf`・`noteHintTarget` | `runFrame`・`owesFrame`・`receiveInput` | `under-pointer-hold.ts` の (M)（1 回の歩きが掴みと説明の的を同時に答える —— `answersAtPointer`、DFC-1810） |

⚠️ `watermarkStampOf` は作る時に時計（`readInstantOfWrite`）と `S-99a`（`readBrowserStored`）を読む —— 今の閉包と同じ位置（`session` の初期化の直後）で作り、宿主への呼び出しの順を変えない。CR-554 の「工場は作る時に宿主に触らない」の例外として明記する。

### 1.3 読み手

- **`frame-loop.ts` を取り込むファイル: 169**（src の兄弟 14 ・ tests 155）。取り込まれている名は 61（スクラッチパッドの `importers.mjs` が `git ls-files src tests tools` の `import {…} from '…frame-loop'` を数えた）。⇒ いま公開している名（自前 55 ＋ 出し直し 13）を、移した後もすべて入口から出し直す。
- **兄弟が入口から値を取り込んでいる（いまの循環）**: `copy-and-paste`・`document-file-flow`（27 名）・`field-entry`・`frame-clock-wakes`・`interaction-record`・`pointer-shape`・`resource-list-window`・`view-place`・`watermark-unlock`・`beneath-picture-hold`・`single-html-shell`。⇒ 計画では、移した名の**持ち主**から取り込むよう兄弟の取り込み行を書き換える。終わった時、兄弟が入口から取り込むのは**型だけ**になる（`single-html-shell.ts` は入口の取り込み手なので例外で、値 `frameLoop` などを取る —— 入口はそれを取り込まないので循環しない）。
- **字で読む試験・道具**（コードが動くと割れる）:
  - `tests/contract/cr-768-the-hand-copies-are-generated-and-drift-is-caught.contract.test.ts:27`・`:105-106`・`:228`・`:235` —— `FRAME_LOOP` の生成の区画の `EDITED_BY_SCREEN` を字で読む。⇒ `EDITED_BY_SCREEN` を `document-write-gate.ts` へ移す波で道を書き換える。
  - `tests/contract/cr-430-ga-pointer-column.test.ts:22`・`cr-430-table-pk-the-pointer-shapes.test.ts:202` —— 入口を動的 import して名を引く。出し直しで足りる。
  - `tests/unit/uf-48-one-input-one-step.test.ts:25-30`・`cr-389-…:70` —— `05-07-design.md` の**どこか**に `UF_48_ONE_ROAD` ・ `UF_48_ESC_ONE_RUNG` ・ `UF_48_INSIDE_THE_CALL` の文が逐語であることを見る（行は問わない）。⇒ 文を別の行へ移しても、逐語なら緑。
  - `tools/generate_entity_types.py:3733`（生成先の行）と `:3919`（重複を許す名の表）—— 生成の区画の行先。
  - `tools/test_route.py:316`・`:319` と `docs/development-rules/04-verification.md:303`（5 節の「毎フレームの経路」表 —— `test_route.py` が読む）。
  - `.claude/skills/spec-graph-check/twin-comments-baseline.txt:145-147`（`frameLoop.isBrowserDefaultStopped.level` と `receiveInput` の双子 —— DFC の I07）。
  - `.claude/skills/spec-graph-check/function-size-baseline.txt:108-113`（HELD 6 行）。
  - `src/framework/dom-screen-surface/dom-screen-surface.ts:424` のコメント（`paletteCornerInWindow` の在り処）。

### 1.4 共変（継ぎ目の置き場を選ぶ物差し、rule 04 の 6）

測り方（`cochange.mjs`）: `frame-loop.ts` のコードを変えた直近 80 コミット（`0c479bcf1` 2026-10-08 〜 `53ce08362` 2026-10-24、コメントだけのコミットは落とした）の `git diff -U0` の行を、その版（消した行は親の版）の構文木で頂上の宣言か閉包の項へ写し、今日の名で 2 節のユニットへ写した。今日に無い名は落とした。数 ＝ 両方に触れたコミット ÷ 小さい側のコミット。小さい側が 3 件以下の組は読まない。

| 組（2 節のユニットの符号） | 数 | 読み |
| --- | --- | --- |
| 旧 `effectRunners` の文字列（入口）〜 `effectRunnersOf` | **1.00（9/9）** | 必ず共に変わる ⇒ 両方を `session-effects.ts` へ一緒に出す（2 節）。出した後の `session-effects` 〜 `action-carrying` は 0.80（8/10） |
| `exportScene` 〜 `runFrame` の側 | **1.00（6/6）**（試しに分けた測り、`cochange-v1.txt`） | 同じ `ScreenViewReadingsTaken` を 2 か所で組む ⇒ CR の向きどおり `frame-drawing.ts` に一緒に置く |
| ズームの端の保持 〜 フレーム | 0.86（6/7、v1） | 一緒に置く |
| `answerReportEntry` 〜 フレーム | 0.83（5/6） | 小さい。`delay-diagnostics-report-window.ts`（UF-195）へ出す |
| 検索の飛び 〜 フレーム ／ 〜 入力 | 0.78（7/9）／ 0.67（6/9） | 拒む。`JDG-681` により割り、最も低い所で切る |
| 入口 〜 フレーム | 0.64（14/22） | 拒む（割る） |
| 入力 〜 動作（`carryOutAction`） | **0.38（6/16）** | 立つ ⇒ `input-reception` と `action-carrying` は別 |
| 窓の場所 〜 入力 ／ 〜 入口の答え | 0.57 ／ 0.58 | 拒む（割る） |
| 文書の門 〜 動作 ／ 〜 フレーム | 0.55 ／ 0.55 | 拒む（割る） |
| 通知の理由 〜 入口 ／ 〜 ほか | 0.71（5/7）／ 0.43 以下 | 入口とだけ高い（`raiseNotice` が入口に残るため）。CR の向きどおり別ファイル |
| セッションの問い合わせ 〜 どれも | 0.50 以下（4 件） | 立つ |
| 押し ・ ポインタの下 ・ パレット | 0.38 以下 ／ 件数 3 以下 | 立つ |

⇒ CR の 3 節の結論（「S2 だけでは入口が 2,400 行残る、拒まれる継ぎ目でも割り、共変は置き場を選ぶ」）は今日も同じ。

---

## 2. ユニットの表

**行の数え方**: `partition.mjs` が、各頂上の宣言と閉包の項に、その前のコメントと空行を付けた行の数を、`map-v4.json` の割り当てで足した（`partition-v4.txt`）。**取り込みの行は含まない** —— 「見積り」の欄は、移す範囲の和 ＋ 取り込みの見積り（新しい兄弟は 15〜60 行）。(F) に直すと `p.` の接頭辞が付くが、行の数はほぼ変わらない（関数の中の行を割らない限り）。

符号の凡例: (F) 閉包の値を手の束 `FrameLoopParts` で受ける頂上の関数 ／ (M) 自分の `let` だけを持つ小さな工場 ／ 移 = 頂上の関数・定数をそのまま移す。

| ファイル（仮の行 ID） | 責務の文（R2.2a の畳み） | 中身 | 見積り（手書き行） | 形 |
| --- | --- | --- | --- | --- |
| `frame-loop.ts`（`UF-48`、入口） | 表 T-078 の契機を受けてセッションを 1 段進め、フレームの 1 周期の部品を 1 度だけ結ぶ —— 出来事は 1 本の送り口 `sendToSession` だけを通す（`SF-6`・`SF-7`）。`SnapshotSource` の実装、`Agent API` の有効の記憶、全画面表示の求めと `S-99f` への写し。<br>畳み: 送り口・部品の結び = 主の句。「契機を受けて」(a)。`SnapshotSource`・全画面は継ぎ目の宣言 (c)。`Agent API` の有効の記憶は返す面 `watchAgentApiEnabling` が書く値 (c) | 継ぎ目の型（`FrameEnvironment`・`FrameValues`・`HeldDocumentCall`・`HandedImport`・`AgentApiSeams`・`StartupNoticeReason`・`FrameLoop`・`FullScreenHost`・`ScreenWiring`・`FrameLoopHands`・**新 `FrameLoopParts`**・`MergeCandidateLine`/`MergeChoices`/`MergeMapping`）、`startingSession`・`documentAtUnsavedMarkDrop`・`startupReadingLanded`・`FULL_SCREEN_REFUSED_REASON`・`PROPERTIES_PANEL_SURFACE`、閉包: `session`・`savedDocument`・`environment`・`agentApiEnablingWatch`・`changeWatchers`・`sendToSession`・`hands`・`parts`・兄弟の工場の生成・`raiseNotice`・`endFileOperation`・`sendFromFlow`・`isPropertiesPanelOnScreen`・`storeAgentApiEnabling`・`snapshotSource`・`askBrowserForFullScreen`・返す面（`agentApiSeams` を含む）、生成の区画は `NOT_STORED_SCROLLBAR_SIZES` だけ | 移さない分 458 ＋ 取り込み 約 90 ＋ 出し直し 約 40 ＋ `FrameLoopParts` の型と生成 約 80 ⇒ **約 670**（目標 850 の下。足りなければ `agent-api-seams.ts` を出す —— 約 65 行の予備の手） | 結線 |
| `frame-drawing.ts`（`UF-p1`） | 表 T-068 の 1 回分の絵を計算する —— 画面のフレーム（`LY-5`、表 T-078 の契機で起こし、寸法が定まってから走る `BO-1`）と書き出しの絵（`FR-080`・`EP-11`・`EP-12`）へ、同じ読み（`ScreenViewReadings`）で組み、描き手へ渡す。<br>畳み: 画面と書き出しは働きが及ぶ先 (b)、同じ読みで組むは手順 (a)、寸法・透かしの刻・ズームの端・パネルの幅は計算に掛かる値 (c)。⚠️ 段 4 の反証: 「書き出しだけの規則（`EP-12`）が変わる」出来事は挙げられる —— 審査の体が FAIL と判じたら `export-scene.ts`（約 190 行、`exportScene`・`exportViewNow`・書き出しの見え方 3 つ・`pictureSessionOf`）を出す。継ぎ目は (F) なので出す費用は小さい | `runFrame`・`ask`・`runAskedFrame`・`exportScene`・`exportViewNow`（F）、(M): `frameValuesHoldOf`（`values`・`owed`）・`watermarkStampOf`（`watermarkStampedAt`・`S-99a`）・`shownFrameHoldOf`・`frameOwingsOf`・積み上げの上限の告げ（`stackSafetyCapToldFor`）・パネルの幅の追従（`lastPanelFaces`・`followPanelFace`）、頂上: `ScreenViewReadingsTaken`・`screenViewReadingsOf`・`shownSpanTextsOf`・`environmentForRegionsOf`・`propertiesPanelWidthOf`・`defaultPanelWidthOf`・`panelFacesIn`・`panelFaceWidthEventOf`・`unstoredZoomOf`・`writeOwedSight`・`beneathAndMarqueeOverlayShowerOf`・`stackSafetyCapToldAfter`・ズームの端（`ZoomEntranceEnds`・`HeldZoomEnds`・`VIEW_PLACE_FIELDS`・`isSameApartFromViewPlace`・`isSameZoomEndsInputs`・`zoomEntranceEndsHoldOf`）・書き出し（`ExportSceneWithCapStop`・`ExportView`・`screenExportViewOf`・`regionsClosedUnderTaskGroupArea`・`spanExportViewOf`・`pictureSessionOf`）・`isSizeSettled`・`isSameEnvironment`・`SEARCH_PANEL_SURFACE`・`HELP_MODAL_SURFACE`・`SEARCH_WORD_ROW`、生成: `NOT_STORED_PROPERTIES_PANEL_SIZES`・`_FLOOR`・`NOT_STORED_SCHEDULE_FILTER_BAR_SIZES`・`NOT_STORED_WATERMARK_NAME` | 601 ＋ 取り込み 約 60 ⇒ **約 660**（501〜1,000 の帯 —— R2.2a の審査が要る） | (F)＋(M)＋移 |
| `input-reception.ts`（`UF-p2`） | 入口の入力（表 T-078 の `FT-1`）を 1 つ受け、表 T-283 の段の順に 1 度だけ消費し、フレームを負うかを決める —— `Esc` の段は `escapeTarget` で決めて 1 段 1 行で送る（表 T-283）。ブラウザの既定の動作を止めるかを、同じ段の読みで答える（`IN-4a`）。<br>畳み: 「段の順に消費」(a)、「フレームを負うか」(a)（`FR-048`・`NFR-010`）、既定の動作を止める答えは同じ段の読みの継ぎ目 (c)（I07 を畳むので 1 つの読みになる） | `receiveInput`・`owesFrame`・`isBrowserDefaultStopped`（返す面から）・`spentOnParentTaskChoice`・`spendNoticeRungFirst`・`dismissNoticeByKey`・`answerConfirmation`・`startsNoTextSelection`・`pruneChoiceTo`（F）、頂上: キーと答え（`ESCAPE_KEY`・`ENTER_KEY`・`CONFIRMATION_*`・`isConfirmationAnswerKey`）・`GUIDE_CURSOR_NONE`・`isNoticeDismissKey`・`isLandingMarkClearedBy`・`continuationMarkClickedOf`・`isRefusedPanelWidth`・`SENT_AFTER_PRESS_DROPS`・`isSentBeforePressDrops`・宿主に任せる入力（`isWindowGrabPress`・`isOnTableWindowBody`・`isLeftToTheHost`・`isFloatingFieldPress`・`HOLIDAY_SETTINGS_SURFACE`）・選択の動き（`pickedObjectsOf`・`choiceEventOf`・`isTaskGroupChoiceSpentBy`・`SELECTION_ESCAPE_PRESSED`・`SELECTION_SETTLE_KEY_PRESSED`）・`hasEndedGesture`・`escapeLevelOf`・`LANDING_MARK_CLEAR_ASKED`・`NEWEST_NOTICE_DISMISS_ASKED` | 421 ＋ 約 50 ⇒ **約 470** | (F)＋移 |
| `input-context-collection.ts`（`UF-p3`） | 翻訳器へ渡す入力の文脈（`PI-18` の `InputContext`）を、フレームの値と保持している値から 1 度に集める（`R7.4` —— 1 つの入力に 1 つの文脈） | `collectInputContext`（F）、`windowFocusContextOf`・`SEARCH_FIELD_ROWS`・`NO_MARKED_TASKS` | 70 ＋ 約 20 ⇒ **約 90** | (F)＋移 |
| `action-carrying.ts`（`UF-p4`） | 翻訳器が返した動作（表 T-036）を運ぶ —— 文書の変更・取り消し・ファイルの求め・コピー・全画面などを、門と流れと副作用へ渡し、作ったものの上に立ち、プロパティパネルに選択を見せる（`FR-072`）。<br>畳み: 運ぶ先の列挙は (b)、作ったものの上に立つ・パネルに見せるは動作の後段 (a) | `carryOutAction`・`carryOutOwedAction`・`askToStartNewDocument`・`repeatHeldEntry`・`showDisplayScaleMessage`・`showVerticalZoomEndMessage`・`settleOnScreen`・`copyImageToJsonPrompt`・`standOnWhatWasCreated`・`showPropertiesOfChoice`・`followChoiceOnPanel`（F）、頂上: `subjectOfChoice`・`PanelSubjectPick`・`taskGroupsChosenWith`・`creationLandingOf`・`CreatedSubject`・`copyPromptAndHandSchema`・`startingAfreshCall`・`startedDocumentOf`・`resetGrs`・出来事の定数 7 | 354 ＋ 約 45 ⇒ **約 400** | (F)＋移 |
| `settled-entry-answers.ts`（`UF-p5`） | 離したときに定まった入口（表 T-109）のうち、シェルが自ら答えるものに答える —— 言語・ヘルプの言語・パレットの最小化・操作の記録・節目の一覧・新規・GRS リセット・開き方と合流の答え・検索パネルの入口（`SV-1`・`SV-3`・`SV-7`）・遅延診断の入口へ振る。<br>畳み: 入口の列挙は (b)、「離したときに定まった」は (c) | `answerSettledEntry`（F）、`entrySettledOnRelease`・`answerSettledOnRelease`・`surfaceSettledOnRelease`・`formatSettledOnRelease`・`filterColumnOf`・`filterListedOf`・`searchPanelAfterEntry`・入口の定数 14（`SCREEN_LANGUAGE_ENTRY` 〜 `MERGE_MAPPING_OF_ENTRY`、`GRS_RESET_ENTRY`、`REPORT_RESTORE_ENTRY`）・`PANEL_CLOSE_ASKED`・`INTERACTION_RECORD_TOGGLED` | 182 ＋ 約 25 ⇒ **約 210** | (F)＋移 |
| `document-write-gate.ts`（`UF-p6`） | 文書への書き込みと差し替えを、書き込みの門（`WS-2`・`WS-6`・`WS-7`・表 T-230）を通して運ぶ —— 保持している文書を持ち、書いた後に選択とプレビューを文書に合わせ、変更を見張り手へ届ける（`HS-12`）。<br>畳み: 持つ (c)、合わせる・届ける (a) | (M) `documentHolderOf`（`held`）、(F) `writeDocument`・`replaceHeldDocument`・`replaceHeldDocumentAt`・`collectWriteMoment`・`changeAudienceOf`（旧 `audience`）、頂上: `settingsLimitsOf`（閉包から出す。閉包の値を読まない）・`HISTORY_LIMITS`・`BYTES_PER_MEGABYTE`・`LANDING_OF_REPLACEMENT_ROW`・`landingOfReplacement`・`resourcePruningOf`・`taskGroupsWithinSchedule`・`historyStepsOf`・`agentHolderOf`・出来事の定数 5、生成: `EDITED_BY_SCREEN` | 219 ＋ 約 35 ⇒ **約 255** | (M)＋(F)＋移 |
| `table-window-places.ts`（`UF-p7`） | 3 つの表の窓（検索パネル・遅延診断レポート・担当リスト）とヘルプの置き場（表 T-335）を持ち、押し・掴み・列の幅・打った語・閉じる・`Esc` の段に合わせて動かす（`WB-6`・`WB-8`・`WB-9`・`SV-14`・`SV-18`・`RO-1`・`RW-1`）。<br>畳み: 動かす契機の列挙は (b) | `heldWindowsOf`（既存の (M)）・`tableWindowsHeldIn`・`closingHoldOf`・`closedTablesOf`・`WindowPlaces`・`STARTING_WINDOW_PLACES`・`withTableWindows` 〜 `windowPlacesAfterOutsidePress`（14）・`windowReadingsOf`・`grabbedShown`・`grabbedWindowBox`・`windowShownIn`・`windowDisplayKeyOf`・`TABLE_WINDOW_OF_SURFACE`・`reportWithInput`・`resourceListWithInput`・`searchViewWithFilterChanges`・`searchPanelWithTypedWord`・`isFilterPressedOutside`・`ESCAPE_RUNG_EVENTS` と `ESCAPE_*` 8・`proposalsNotIssuedSinceRun`・`DelayFixSubjectKey`・`FixLogSource`・型 4 | 451 ＋ 約 35 ⇒ **約 485**（帯の手前。波で 500 を超えたら `ESCAPE_RUNG_EVENTS` 群 25 行を `input-reception.ts` へ） | 移（(M) は既存） |
| `search-hit-jump.ts`（`UF-p8`） | 検索の当たり（表 T-332）へ飛ぶ —— 押して離したセルから当たりを求め、表示の書き込みと選択を出し、描いていない的は次の絵で置き直す（`SJ-0`〜`SJ-10`・`AM-16`） | `jumpToSearchHit`・`landJump`・`owedJumpHolder`（既存の (M)）・`landingAgentHolder`・`searchJumpOnRelease`・`searchHitOf`・`actionWithJumpViews`・型 4・`SEARCH_HIT_JUMPED`・`PINNED_TASK_GROUPS_LEAVE_NO_ROOM_REASON` | 147 ＋ 約 25 ⇒ **約 170** | 移 |
| `notice-reasons.ts`（`UF-p9`） | シェルが告げる理由（表 T-233）と問い（告げ方 `NT-7` の確認）を、起きたこと（ファイルの失敗・書き込みの拒み・絵の失敗・使い切った入口）から選ぶ。<br>畳み: 問いは告げ方が確認である通知 (b)。選ぶ元の列挙は (b) | `NOTICE_REASON_OF_FILE_FAULT`・`_WRITE_REFUSAL`・`_RASTER_FAULT`・`_SPENT_ENTRANCE`・`REFUSAL_SITUATIONS`・`situationReasonOf`・`noticeReasonOfRefusals`・`reasonOfWriteRefusal`・`noWorkingWeekdayReason`・理由の定数 10・`CONFIRMATION_MANNER`・`ConfirmationQuestion`・`DISCARD_QUESTION`・`discardQuestionOf`・`GRS_RESET_QUESTION`・`grsResetEntryPressedOf`・`AGENT_OPEN_FILE_ASKED`・`changeQuestionRaisedBy`、(F) `raiseFileFault`・`raiseWriteRefusal` | 194 ＋ 約 15 ⇒ **約 210** | 移＋(F) |
| `screen-session-queries.ts`（`UF-p10`） | セッションの現在値（`PI-39` の `ScreenSession`）から、シェルが読む値を答える問い合わせ —— 開いた面・デュアルカーソル・言語・パネル・立っている通知・問い・ファイルの操作・選択 | `openSurfaceNameIn`・`dualCursorFollowingIn`・`screenLanguageIn`・`panelShowingIn`・`PanelShowing`・`standingNoticesIn`・`raisedNoticesOf`・`isDeliveringNoticesIn`・`importReportLinesIn`・`landedLinkIn`・`isChangingDocumentIn`・`isAgentApiEnabledIn`・`selectedObjectsIn`・`NO_OBJECTS_SELECTED`・`isQuestionAskedIn`・`questionIn`・`isAnySurfaceStanding`・`fileOperationKindIn`・`mergeReviewIn`・`isFlowSurface`・`FLOW_SURFACE_ROWS`・`DIFFERENCE_REVIEW_ROW`・`fileDragEventIn`。（任意: `field-entry.ts` の `fieldFocusWantedIn`・`isEditingFieldIn`、`interaction-record.ts` の `isRecordingInteractionsIn` を寄せる —— G53x のフォルダの中の分） | 132 ＋ 約 15 ⇒ **約 150** | 移 |
| `delay-diagnostics-hold.ts`（`UF-p11`） | 遅延診断の結果（`FR-130`・`S-445`）を、保持している文書ごとに 1 度だけ求めて持ち（決定 17）、入口で出し入れする —— 印を操作したタスクを外し、窓の行を指す（`RW-19`）。<br>畳み: 出し入れ・外す・指すは保持の手順 (a) | (M) `delayDiagnosticsHoldOf`（`delayDiagnosticsShown`・`delayDiagnosticsHeld`）、(F) `delayDiagnosticsNow`・`showDelayDiagnostics`・`showDiagnosisRow`、頂上: `HeldDelayDiagnostics`・`DelayDiagnosticsDrawing`・`delayDiagnosticsOf`・`heldAfterMarkerOperated`・`isDelayDiagnosticsReportOpen`・`DelayDiagnosticsPress`・`answerDelayDiagnosticsEntry`・`reportHeldOf`・`DELAY_DIAGNOSTICS_ENTRY`・`RE_DIAGNOSE_ENTRY` | 103 ＋ 約 20 ⇒ **約 125** | (M)＋(F)＋移 |
| `under-pointer-hold.ts`（`UF-p12`） | ポインタの下にあるもの —— 点・面の部品・掴み・説明の的（`EZ-2`・`IN-3`）—— を、入力ごとに 1 回の歩きで求めて持つ（表 T-023d、DFC-1810）。<br>畳み: 説明の的は同じ歩きが答えるもの (b) | (M) `underPointerHoldOf`（`pointerAt`・`partUnderPointer`・`grabUnderPointer`・`pointerWalk`・`hintReleasedEntry`・`hintTarget`・`hintWalk`）、(F) `answersAtPointerOf`・`noteHintTarget`、頂上: `hintReleasedEntryAfter`・`hintEntryOf`・`HintHolder`・`HintTarget`・`NO_HINT_TARGET`・`iconRowOf`・`hintTargetOf`・`HintWalk`・`hintWalkAt`・`isSameHintTarget`・`HINT_TARGET_CHANGED`・`NO_POINTER_ANSWERS`・`isSameScreenPart`・`isSameGrab`・`isSameGrabbedItem`・`itemKeyOf`・`dualCursorDrawnOf` | 172 ＋ 約 20 ⇒ **約 190** | (M)＋(F)＋移 |
| `pointer-press-hold.ts`（`UF-p13`） | 押している間の押し（`CS-2`・表 T-289）と、その押しが先に見せるもの（プレビューの文書・掴んだパネルの幅、表 T-023d・`FR-052`）を持つ —— 押しの始まりと終わりをセッションへ告げる。<br>畳み: 告げるは持つことの手順 (a) | (M) `pointerPressHoldOf`（`pressed`・`previewDocument`・`heldPropertyPanelWidth`）、(F) `collectPress`・`beginPointerPress`・`endPointerPress`、頂上: `measuredAtPress`・`followedPressOf`・`pressedOnOf`・`heldWholeOf`・`HeldWholes`・`POINTER_RELEASED`・`PRESS_INTERRUPTED` | 109 ＋ 約 20 ⇒ **約 130** | (M)＋(F)＋移 |
| `command-palette-place.ts`（`UF-p14`） | コマンドパレットの置き場（`FR-053`・`JDG-660`）を持つ —— 引いた分だけ動かし、窓の中へ戻し、押しが中断したら押した時の角へ戻す | (M) `commandPalettePlaceOf`（`commandPaletteDraggedTo`・`commandPaletteCornerAtPress`）、頂上: `paletteCornerOf`・`paletteCornerInWindow`・`windowSizeOf`・`bandSizeOf`・`PALETTE_GRAB_BAND_ENTRY` | 48 ＋ 約 25（命令の関数）⇒ **約 75** | (M)＋移 |
| `drawn-picture-hold.ts`（`UF-p15`） | 描いた絵のレイアウトと幾何（`layoutFromSchedule`・`geometryFromLayout`）を、絵が読むものが同じあいだ使い回す（表 T-071 の `CA-1`）—— 状態日だけの違いはレイアウトを作り直さない | (M) `drawnPictureHoldOf`（`drawnPicture`。今の `drawnPictureOf(held, inputs)` を工場に包む）、`PictureInputs`・`DrawnPicture`・`GeometryArguments`・`isSameRecord`・`isSameScreenRegions`・`isSameScheduleApartFromStatusDate`・`isSameLayoutInputs`・`isSamePictureInputs` | 89 ＋ 約 15 ⇒ **約 105** | (M)＋移 |
| `task-group-grab-carry.ts`（`UF-p16`） | タスクグループを掴んで運ぶ間（`HF-15`）、端で巻いたスクロールをフレームの値として持ち（`WS-2`）、離したときに 1 度だけ書く（`S-597`・`S-598`） | `taskGroupGrabCarryOf`・`heldGrabScrollOf`（既存の (M)）・`turnedGrabScrollPlace`・`writeScrollPlace`・`HeldGrabScroll`・`PLAIN_MODIFIERS`・`MS_PER_SECOND` | 103 ＋ 約 15 ⇒ **約 120** | 移 |
| `clock-readers.ts`（`UF-p17`） | 宿主の時計を読む —— 今日・書いた時刻・その場の時刻・標準時の時差・単調な ms（`semi-pure-b`） | `readToday`・`readInstantOfWrite`・`readLocalMoment`・`readSystemStandardTimeZone`・`readMonotonicMs`・`PC_OFFSET_HOUR`・`JANUARY`・`JULY` | 48 ＋ 約 5 ⇒ **約 55** | 移 |
| `session-effects.ts`（`UF-123`、既存が育つ） | 今の責務に「シェルの副作用の手の表（どの手が各副作用を実行するか）」を足す（表 T-280 ほかの升の全数を負うので、表の型と同じ変更理由） | `ScreenEffectHands`・`effectRunnersOf`・`screenDraftRunnersOf`・`ScreenDraftEffectName`、(F) `screenEffectHandsOf`（旧閉包の `effectRunners` の文字列 46 行） | 34 ＋ 143 ＋ 約 25 ⇒ **約 200** | 移＋(F) |
| `pointer-shape.ts`（`UF-157`、既存） | 変えない（表 T-269 の形の 1 つとして窓の縁の形を受ける） | `WINDOW_GRAB_POINTERS`・`windowGrabPointerOf` | 413 ＋ 21 ⇒ **約 435** | 移 |
| `delay-diagnostics-report-window.ts`（`UF-195`、既存） | 変えない（窓の入口に答える） | (F) `answerReportEntry`（旧閉包の 11 行の包み） | 189 ＋ 約 18 ⇒ **約 207** | (F) |
| `view-place.ts`（`UF-161`、既存） | 変えない | G47 の `zoomLimits()`（`S-96`〜`S-98` を 1 か所で組む） | 229 ＋ 約 8 | 畳み |
| `field-entry.ts`・`frame-clock-wakes.ts`・`watermark-unlock.ts`・`document-file-flow.ts`（既存） | 変えない | ただ 1 人の使い手へ: `CHOICE_MOVED`・`FIELD_FOCUS_WITHDRAWN`・`FIELD_FOCUS_WITHDRAWING_KEYS` → `field-entry.ts`、`ENTRY_REPEAT_TIME_ELAPSED` → `frame-clock-wakes.ts`、`WATERMARK_UNLOCK_ROW` → `watermark-unlock.ts`、`GREATEST_KNOWN_SCHEMA_VERSION`・`AGENT_DOCUMENT_HANDED`・`DOCUMENT_OPEN_FAILED`・`DOCUMENT_FILE_WRITE_ENDED`・`EXPORT_CHOOSER_ROW`・`OPEN_CHOOSER_ROW` → `document-file-flow.ts`（+11、⚠️ 7 節 問い 1） | +6 ／ +1 ／ +3 ／ +11 | 移 |

**合計の確かめ**: 移す範囲 4,464 行（生成と取り込みを含む全行）を、上の 26 の行き先と「取り込み 308」「生成 55」で割り切った（`partition-v4.txt` の和 ＝ 4,464、割り当て漏れ 0）。

### 2.1 手の束 `FrameLoopParts`（(F) の受け口）

- 入口に `export interface FrameLoopParts extends FrameLoopHands` を置き、兄弟の工場の生成の後に 1 度だけ組む: (M) の持ち手（`press`・`underPointer`・`palette`・`diagnostics`・`frameValues`・`shownFrame`・`owings`・`watermark`・`picture`・`documentHolder`）、既存の工場（`windows`・`shownTasks`・`parentTasks`・`documentFileFlow`・`grabCarry`・`interactionRecorder`・`fieldFocusRetries`・`heldViewPlace`・`owedJump`・`zoomEntranceEndsAt`・`beneathPicture`・`bandCeilingFor`・`pointerShapeAt`・時計の待ちの 8 つ・`followTimedNotices`）、宿主の口（`surface`・`showPointerShape`・`fullScreen`・`emptyDocument`・`pageReload`・`showBeneathAndMarqueeOverlay`）、`audience`・`changeWatchers`。
- これは (M) の `let` を 1 つの記録へ集める形ではない —— 束が持つのは**持ち手と関数の参照**で、`let` はそれぞれの (M) の中に残る（CR-554 4.1 の (F)）。各 (F) の兄弟は `Pick<FrameLoopParts, …>` で読む名だけを宣言する（ISP）。
- `hands` は今のまま先に作り、兄弟の工場へ渡す。`hands` の `runFrame`・`exportScene`・`writeDocument` などは `() => runFrame(parts)` の矢印で、`parts` の生成より後にしか呼ばれない（工場は作る時に `hands` を呼ばない —— CR-554 の規則、今も守られている）。

---

## 3. DFC-1071 の群

確かめ方: 台帳の群ごとに、名と式で `git grep`／Grep した（コマンドは各行）。「T-064」は他の部品の公開口の行（`docs/spec/_source/published-entries.json`）を足すか。

| 群 | 今日の在り処 | 判定 | 持ち主（割った後） | T-064 | 波 |
| --- | --- | --- | --- | --- | --- |
| G28 `screenLanguageIn` ＝ `displayLanguageOf` | `frame-loop.ts:1217` ／ `screen-renderer.ts:838`（`?? 'en'` ＝ `DEFAULT_DISPLAY_LANGUAGE` `:834` も `'en'`） | 残る・値は同じ | `screen-renderer.ts` の `displayLanguageOf` を読み、`screenLanguageIn` を消す | **要**（`PI-37` に `displayLanguageOf`） | W9 |
| G29x `'U-60'` が 4 か所 | `frame-loop.ts:730` ・ `open-modals.ts:78` ・ `field-editing.ts:439` ・ `screen-values.ts:652`（生成の番人）・`:661` | 残る | ⛔ 本 CR では畳まない（`AdvanceScreenSession` の手書き定数と生成の番人に触る）。シェルの写しはただ 1 人の使い手 `watermark-unlock.ts` へ移すだけ | 要（`PI-39`） | 台帳に残す（7 節 問い 2） |
| G32a `rowGrabbedAt` の型 | `git grep rowGrabbedAt -- src` 0 件 | **既に無い** | — | — | 台帳を閉じる候補 |
| G44 離したときの見張り | `frame-loop.ts:2738`・`:2746`・`:2754`・`:2765`（4 本）・`:2376`・`:2383`（2 本）／ 翻訳器 `screen-state-input.ts:373`・`selection-input.ts:208` | 残る・値は同じ | ⛔ 翻訳器の持ち物（`CR-579` 4.1: 翻訳器の補助を兄弟へ引き込まない・写さない）。`CR-579` が `pressedPartOnRelease` を翻訳器の入口から出した後に、`settled-entry-answers.ts` の 6 本をそれに替える | 要（`PI-18`） | `CR-579` の後（7 節 問い 2） |
| G47 `S-96`〜`S-98` を 3 つの形に組む | `frame-loop.ts:3515-3516`（`settingsLimitsOf`）・`:3634-3636`（`collectInputContext`）・`view-place.ts:137-139` | 残る・値は同じ・フォルダの中 | `view-place.ts` に 1 本の `zoomLimits()`、2 か所が読む | 不要 | W6（`input-context-collection` の波） |
| G48 `escapeContextOf` で組む | `frame-loop.ts:2468` が既に `escapeContextOf(context)` | **既に畳まれた** | — | — | 台帳を閉じる候補 |
| G53a `isQuestionAskedIn` ＝ `file-flow-values.ts` | `frame-loop.ts:2591` ／ `file-flow-values.ts:311`（関数の中の式） | 残る | `screen-session-queries.ts` に 1 つ。⛔ 使用例の側（use-case）を公開口にするのは本 CR では行わない | 要（`PI-39`） | 台帳に残す（問い 2） |
| G53x セッションの読み手 | フレームループの 23 本 ／ `field-entry.ts:58`・`:64` ／ `interaction-record.ts:38` ／ 内側の双子（`command-palette.ts:156`・`tooltips.ts:599`・`notice-values.ts:666` ほか） | 残る | **フォルダの中の分だけ** `screen-session-queries.ts` へ寄せる（W1）。部品をまたぐ分は ⛔ 本 CR では行わない | 要（`PI-39`） | W1 ／ 残りは台帳 |
| G53b | → `DFC-1070` | 別の行 | — | — | — |
| E03 `readInstantOfWrite` ＝ `stampOf` | `toISOString().replace` は `frame-loop.ts:2816` の 1 か所だけ（Grep） | **既に無い**（双子が消えた） | — | — | 台帳を閉じる候補 |
| E14・N2 `drawnRowBoxesOf` | `drawnTaskGroupBoxesOf` は `task-group-panel.ts:502`（`PI-37`）にあり、シェルは取り込むだけ | **既に畳まれた** | — | — | 台帳を閉じる候補 |
| E17 `collectPress`・`grabAtPointer`・`pointer-shape.ts` の見張り | `collectPress` `:3562`・`answersAtPointerOf` `:3597`・`pointer-shape.ts` | 残る・⚠️ 台帳自身が「デュアルカーソル追従中に `pressedOn {kind:'grab'}` を送るかは未実測」 | ⛔ 値が変わりうる（未実測）—— 畳まない | — | 台帳に残す |
| E18 `isOnTheChart` と `startsNoTextSelection` | `input-command-translator.ts:992` ／ `frame-loop.ts:3585` | 残る | ⛔ 翻訳器の持ち物（`PE-0` の述語を翻訳器に置く案）—— `CR-579` の後 | 要（`PI-18`） | `CR-579` の後 |
| E31 `isSameGrabbedItem` と `itemKeyOf` | `frame-loop.ts:2501`・`:2561`（同じファイル） | 残る・値は同じ（種ごとに接頭辞が固定なので「鍵が等しい ⇔ 項が等しい」） | `under-pointer-hold.ts` で `isSameGrabbedItem = itemKeyOf(a) === itemKeyOf(b)` | 不要 | W4（`under-pointer-hold` の波）。照合器で `owesFrame` の答えが同じことを見る |
| E39 `'Esc'`・`'Enter'`・`'Y'`・`'N'` | `frame-loop.ts:463-464`・`:475-476` ／ 翻訳器 `KEY`（`input-command-translator.ts:452`、`escape:'Esc'`・`enter:'Enter'`・`y:'Y'`・`n:'N'`）／ `dom-input-source.ts:44` | 残る・値は同じ | シェルの 4 定数を消し、翻訳器の入口の `KEY` を読む（翻訳器は**変えない** —— 既に公開されている名を取り込むだけ）。`dom-input-source.ts` の分は別の部品なので台帳に残す | **要**（`PI-18` に `KEY`） | W9 |
| E43 面の名 | `frame-loop.ts:490`・`:493`・`:499` ／ `dom-screen-surface.ts:64`・`:66` ほか | 残る | ⛔ 台帳が「先に `DFC-703` の U 行の問いを決める」—— 裁定待ち。畳まない | — | 台帳に残す |
| H08 クリップボードの絵の道 ＝ `rasteredContent` | `carryOutAction` の `copyPictureToClipboard`（`frame-loop.ts:3890-3922`）／ `document-file-flow.ts:1238` | 残る・値は同じ | `document-file-flow.ts` の `rasteredContent` を（フォルダの中で）公開し、`action-carrying.ts` が読む。⚠️ 順を保つ: `rasterizer` が無いときは場面を作る前に `SEAM_ABSENT` を告げる今の順を残す（`rasteredContent` の自前の見張りは二重になるが届かない） | 不要（同じ部品の中） | W7 |
| H20 `OpenChoice` ＝ `FileFlowOpenChoice` | `frame-loop.ts:123` は `import-document` の `OpenChoice` を取り込むだけ | シェルに写しは無い（双子は use-case どうし） | — | — | 本 CR の外（台帳に残す） |
| H22 `NoticeReason` の 54 行 | `frame-loop.ts:108` は `advance-screen-session` から取り込む | **既に畳まれた** | — | — | 台帳を閉じる候補 |
| I01 `history.done`／`undone` の長さ | `frame-loop.ts:3207-3208`（`canUndo`・`canRedo`）・`:3867`・`:3874`（取り消し・やり直し）／ `edit-history.ts:31` `stepCount`（呼び手 0）。`undone` の読み手は entity に無い | 残る・値は同じ | `done` の 2 か所は `stepCount` を読む。`undone` の 2 か所は `document-write-gate.ts` の 1 つの読み手へ寄せる（シェルの中で 1 か所） | **要**（`PI-4` に `stepCount`） | W9 |
| I02 レイアウトの流れ 3 つ | `runFrame` ・ `exportScene` ・ `copy-and-paste.ts` | 残る・⚠️ 台帳自身が「`ST-7` の段の上限が割れる恐れ、未証明」 | ⛔ 値が変わりうる —— 畳まない | — | 台帳に残す（`PND-254` の隣） |
| I03 `dualCursorFollowingIn` ＝ `tooltips.ts:194-195` | `'placingCursorA' ? 'cursorA'` は `frame-loop.ts:1212` だけ | **既に無い** | — | — | 台帳を閉じる候補 |
| I05 `isNothingPicked` | `frame-loop.ts:1405`（`subjectOfChoice`）／ `properties-panel.ts:2261`（局所の定数） | 残る | ⛔ 相手が adapter の関数の中の局所の定数 —— 公開させるには adapter のコードを変える。本 CR では行わない | 要（`PI-37`） | 台帳に残す（問い 2） |
| I06 | → `DFC-1058` | 別の行 | — | — | — |
| I07 `receiveInput` と `isBrowserDefaultStopped` の「keep in step」 | `frame-loop.ts:4294-4303`（返す面）・`:4186-4192`（`receiveInput`）。検査の双子の基準線 `twin-comments-baseline.txt:145-147` | 残る・値は同じ | `input-reception.ts` の 1 つの読み（`escapeLevelNow(p, input, context)`）を両方が呼ぶ。双子の記録が消える（基準線を下げる） | 不要 | W5（`input-reception` の波） |

まとめ: **畳む 7**（G47・E31・H08・I07 はフォルダの中、G28・E39・I01 は他の部品の既に公開されている名を読み T-064 に 1 名ずつ足す）、**既に無い 7**（G32a・G48・E03・E14・H22・I03、H20 はシェルに写しが無い）、**翻訳器の持ち物で `CR-579` の後 2**（G44・E18）、**値が変わりうる・裁定待ちで外す 3**（E17・E43・I02）、**他の部品のコードを変える要るので問う 4**（G29x・G53a・G53x の部品をまたぐ分・I05）。

---

## 4. 仕様の書き換え

### 4.1 表 T-075

**`UF-48` の責務（旧 → 新）**。旧: 1.3 の読みのとおり（`現在値の保持（…）、フレームを起こす契機の観測（表 T-078）、フレーム先頭の収集と計算、描画と入力への配り、SnapshotSource の実装、全画面表示…（MUST）…ポインタの形は pointer-shape.ts に…問う。…兄弟が共有する語彙（問いの型・告げ方）と…手の束（FrameLoopHands）を持つ。⚠️ 本ユニットは R2.2a と R2.2b を満たさない …いまは 1 つの周期に置く`）。
新（逐語の案）:

> 現在値の保持（保存しない画面とセッションの値は、セッションの現在値（`PI-39` の `ScreenSession`）1 つとして持つ。<br>出来事は 1 本の送り口 `sendToSession` だけを通し、`advanceScreenSession` で 1 段進めて参照を差し替え、返った副作用をその同じ呼び出しの中で `UF-123` の実行に渡す —— `SF-6` ・ `SF-7`）と、フレームの 1 周期の部品を 1 度だけ結ぶこと —— 表 T-078 の契機（入力・寸法・押し続け・渡された文書・ファイルのドロップ）を受け持ちの兄弟へ渡し、兄弟は閉包の値を、本ユニットが 1 度だけ作る手の束（`FrameLoopHands` ・ `FrameLoopParts`）から読む。<br>`SnapshotSource` の実装、`Agent API` の有効の記憶（`FR-065`）、全画面表示をブラウザに求めることと、ブラウザが告げた全画面表示の変化を 表 T-206 の `S-99f` へ写すこと（`FR-071`）。<br>⭐ 全画面表示の求めは、入口の入力（表 T-078 の `FT-1`）を受けたその呼び出しの中で、フレームを待たずに出すこと（MUST） —— （以下、今の文を逐語で残す）。<br>入力の受け取りは `input-reception.ts` に、入力の文脈は `input-context-collection.ts` に、動作は `action-carrying.ts` に、シェルが答える入口は `settled-entry-answers.ts` に、書き込みの門は `document-write-gate.ts` に、フレームと書き出しの絵は `frame-drawing.ts` に、（今の兄弟の並び）…に問う。<br>削除が負う問いを立てるかは `EditDocument`（`PI-9`）に問い、告げ方（`NT-7`）だけを添える。

- 消す文: 「`Esc` の段は `escapeTarget` で決めて 1 段 1 行で送る（表 T-283）。」→ 逐語のまま `input-reception.ts` の行へ移す（`uf-48-one-input-one-step.test.ts` は `05-07` 全体に文があるかを見るので緑のまま）。「描き手へは根の状態と `ScreenViewReadings` を渡す」「フレーム先頭の収集と計算、描画と入力への配り」→ `frame-drawing.ts` の行へ。「兄弟が共有する語彙（問いの型・告げ方）」→ `notice-reasons.ts` の行へ。⚠️ の 2 文（R2.2a・R2.2b を満たさない）は消す —— 借りが返る。
- `UF-48` の「負う要求」: `FR-068`（`OW-2`）→ `action-carrying.ts`（`copyImageToJsonPrompt`）、`NFR-002`・`NFR-003`（`OW-4`）→ `frame-drawing.ts`、`NFR-010`（`OW-1`）→ `input-reception.ts`（`owesFrame`）、`FR-100`（`OW-2`）は入口に残す（`hasUnsavedEdits`・`documentAtUnsavedMarkDrop`）。`cr-435-…contract.test.ts:281` は 1 要求 1 ユニットを見るので、移すだけで緑。

**新しい行（17）**: 2 節の表の「ファイル」「責務の文」をそのまま行にする（`コンポーネント` = `SingleHtmlShell`、`純粋性` = `non-pure`。ただし `screen-session-queries.ts`・`notice-reasons.ts` は中身が `pure` のクエリと定数だけなので `pure`、`clock-readers.ts` は `semi-pure-b`。⚠️ `notice-reasons.ts` は (F) `raiseFileFault` を持つので `non-pure` —— (F) を入口に残すなら `pure`。審査で決める）。行 ID は調整役が振る（`UF-p1`〜`UF-p17`）。各ファイルの頭に `@unit      UF-xx ` と `@purity` を書く（`tests/contract/units.contract.test.ts:79-90` が見る）。

**既存の行の追記**: `UF-123`（`session-effects.ts`）に「シェルの副作用の手の表（`screenEffectHandsOf` ・ `effectRunnersOf`）」、`UF-161`（`view-place.ts`）に「ズームの段と上下限を 1 か所で組む（`zoomLimits`、`S-96`〜`S-98`）」。`UF-157`・`UF-195` は文を変えない。

### 4.2 表 T-063 の `UT-6`

- ファイルの列: 今の 20 本に新しい 17 本を足す（37 本）。
- 「`frame-loop.ts` の周期から、変更の理由が別の塊を兄弟へ出した（`UD-1`）——」の列挙に足す: 入力の受け取りは表 T-078 の `FT-1` と表 T-283 が、入力の文脈は `PI-18` の `InputContext` が、動作は表 T-036 が、シェルが答える入口は表 T-109 が、書き込みの門は `WS-2`・`WS-6`・`WS-7` と表 T-230 が、フレームと書き出しの絵は表 T-068・`LY-5`・`FR-080` が、窓の置き場は表 T-335 が、検索の飛びは表 T-332 が、告げる理由は表 T-233 が、セッションの問い合わせは `PI-39` が、遅延診断の保持は `FR-130` と `S-445` が、ポインタの下は表 T-023d と `EZ-2` が、押しは `CS-2` と表 T-289 が、パレットの置き場は `FR-053` が、描いた絵の使い回しは表 T-071 の `CA-1` が、掴んだタスクグループの運びは `HF-15` が、時計の読みは `FT-4` 以外の時刻の読み（`WT-9`・`DV-12` ほか）が変わったときに書き直す。
- 「兄弟が共有する語彙は `frame-loop.ts` に置き、`frame-loop.ts` が兄弟の名を出し直す。」→「兄弟が共有する型と手の束は `frame-loop.ts` に置き、値の語彙はそれを持つ兄弟に置く。`frame-loop.ts` は外の取り込み手のために兄弟の名を出し直し、兄弟は `frame-loop.ts` から型だけを取り込む。」
- 末尾の ⚠️（割らないと R2.2 に反する）は残す。

### 4.3 表 T-074 の `SU-3` と数を言う所

- `SU-3`: **185 → 202**（新 17。`document-file-flow.ts` を本 CR で割るならさらに +2 —— 7 節 問い 1）。
- 数を字で持つ試験・文書: `tests/contract/units.contract.test.ts:12-23` は `SU-3` を読むので書き換え不要。`git grep -n "185" docs tests tools` でユニットの数としての 185 は `05-07-design.md:246` だけ（確かめた）。

### 4.4 表 T-064（W9 だけ）

`docs/spec/_source/published-entries.json` に 3 名（`PI-37` + `displayLanguageOf`、`PI-18` + `KEY`、`PI-4` + `stepCount`）。生成物 `_assets/tbl-published-entries.md` は `npm run` の生成で作り直す。⚠️ `PI-18` は `CR-579` も触りうる —— 併合の順で調整役が見る。

### 4.5 規則の文書

- `docs/development-rules/04-verification.md:303` の「フレームの走行」の置き場を `frame-loop.ts` ・ `frame-drawing.ts` ・ `drawn-picture-hold.ts` に（`tools/test_route.py` がこの表を読むので、PERF の門が新しいファイルでも開く）。`tools/test_route.py:316`・`:319` の自己試験の道は `frame-loop.ts` のままでよい（表に残る）。
- `04-verification.md:606` の「`frame-loop.ts` の `POINTER_SHAPE_BY_GRAB`」は既に古い（`pointer-shape.ts`）—— 同じ波でついでに直すか、台帳へ（本 CR の範囲の外、報告だけ）。

---

## 5. 波（1 波 = 1 コミット、割る体は同時に 1 体）

**前提（割る前）**: ① 名と責務の文を別の体に R2（R2.1・R2.2a・R2.2b・R2.14・R2.21・R2.22・JDG-820）で審査させ、確定表を利用者に見せる（rule 05 割る波の手順 1、`JDG-548`・`JDG-550`）。② **W0 照合器**: 分割前の木だけを読む別の体が作る（宿主への呼び出しの列・フレームの列・送った出来事の列・`isBrowserDefaultStopped` の答え・書き出しの絵の sha256）。感度を 10 件で測らせ、分岐網羅を報告させる。最初の src の波より先に併合。

各波の共通の手順: (M) の波より前は、(F) へ出した関数が閉包に残る `let` を `parts` の読み手（`() => isTooltipStanding` など）で読む —— その `let` の波で読み手の中身を (M) に差し替える。照合器でバイト一致 ・ `vitest` ・ `check.sh` ・ `gen:check` ・ `tsc` を前に立つ者が回し直す。新しいファイルの T-075 の行・`UT-6` のファイルの列・`SU-3` の数は**その波のコミットに入れる**（`units.contract.test.ts` が行とファイルの両方を見るので、片方だけでは赤）。入口は移した名を出し直す。兄弟の取り込み行は持ち主へ書き換える。

| 波 | 動かすもの | 出し直し・書き換え | 危険と見張り |
| --- | --- | --- | --- |
| W1 | **移だけ**: `clock-readers.ts`・`notice-reasons.ts`（理由と問い、(F) の 2 つは W3 で）・`screen-session-queries.ts`（G53x のフォルダの中の分を含む）、ただ 1 人の使い手への定数（`field-entry`・`frame-clock-wakes`・`watermark-unlock`・`document-file-flow` へ） | 兄弟 11 本の取り込み行を持ち主へ。入口は全名を出し直す | 頂上の `const` だけ —— 兄弟の頂上の初期化が入口の名を読まない（TDZ 無し）。`GREATEST_KNOWN_SCHEMA_VERSION` は JSON から作る `const` なので `document-file-flow.ts` で同じく作る |
| W2 | **移だけ**: `table-window-places.ts`（`heldWindowsOf` ほか）・`search-hit-jump.ts`（`owedJumpHolder` ほか）・`task-group-grab-carry.ts`・`drawn-picture-hold.ts`（頂上の部分だけ。`let drawnPicture` はまだ閉包）・`pointer-shape.ts` へ窓の縁の形 | `beneath-picture-hold.ts` の `isSameRecord`・`isSameScreenRegions` を新しい持ち主から | `heldWindowsOf`・`taskGroupGrabCarryOf` は 49 行 —— 1 行でも増えれば新しい HELD（検査 60 が赤）。行を足さない |
| W3 | `FrameLoopParts` を入れる（型と生成、まだ誰も使わない）＋ (M) 4 つ: `command-palette-place.ts`・`pointer-press-hold.ts`（`collectPress`・`beginPointerPress`・`endPointerPress` を (F) に）・`delay-diagnostics-hold.ts`（(F) 3 つ）・`notice-reasons.ts` の (F) `raiseFileFault`・`raiseWriteRefusal`、`answerReportEntry` → `delay-diagnostics-report-window.ts` | 閉包の書き手は (M) の命令を呼ぶ | ⛔ `endPointerPress` の順: 押しを落とす → `sendToSession` → 押した時の角を消す（`restorePaletteCorner` の副作用がその間に角を読む、TRAP `:3360`）→ 運びの終わり → 窓の押しの終わり → 角を窓の中へ。命令をこの順で呼ぶ |
| W4 | `under-pointer-hold.ts`（(M) 7 `let`、(F) `answersAtPointerOf`・`noteHintTarget`）＋ E31 を畳む | — | `owesFrame` は 26/**15** —— 読みを `p.underPointer.part()` に替えても分岐を増やさない（16 で帯に入る） |
| W5 | `input-reception.ts`（`receiveInput`・`owesFrame`・`isBrowserDefaultStopped` ほか）＋ I07 を畳む | 双子の基準線から 1 記録が消える（下げる —— 調整役が書く）。検査 60: `receiveInput` を付け替え（156/68 を超えない） | `receiveInput` は今 156 行 —— `let` の代入を命令に替えても行を増やさない。超えるなら同じ波で補助を 1 つ出す |
| W6 | `input-context-collection.ts`（`collectInputContext`）＋ G47 を畳む（`view-place.ts` に `zoomLimits()`） | — | `collectInputContext` は 46 行 —— 50 を超えない |
| W7 | `action-carrying.ts`（`carryOutAction` ほか）＋ `settled-entry-answers.ts`（`answerSettledEntry` ほか）＋ H08 を畳む | 検査 60: `carryOutAction`・`answerSettledEntry` を付け替え | ⚠️ H08 は場面を作る前の `rasterizer` の見張りを残す（2 節）。`PICTURE_COPIED` の後の `STACK_SAFETY_CAP` の順も残す |
| W8 | `document-write-gate.ts`（(M) `documentHolderOf`、(F) `writeDocument`・`replaceHeldDocument(At)`・`changeAudienceOf`）＋ 生成の `EDITED_BY_SCREEN` を移す | `tools/generate_entity_types.py:3733` の行先と `:3919` の表を分ける。`cr-768-….contract.test.ts:27` の道を `document-write-gate.ts` に | `holder.replace` の順: 文書が変わったら透かしの刻を打ち直す → `held` を差し替え → 選択を刈る → 担当の選択を刈る → 寸法が定まっていればフレームを求める（TRAP `:2960`）。透かしの (M) はまだ閉包にあるので、W8 では命令を手で受ける |
| W9 | `frame-drawing.ts`（`runFrame`・`ask`・`runAskedFrame`・`exportScene`・(M) 6 つ・`drawn-picture-hold` の (M) 化・ズームの端・パネルの幅）＋ 生成の 4 定数を移す ＋ `session-effects.ts` へ副作用の手（`screenEffectHandsOf`・`effectRunnersOf`）＋ G28・E39・I01 を畳む（T-064 に 3 名） | 生成器の行先をさらに分ける。`04-verification.md:303` の表を直す。検査 60: `runFrame`・`exportScene` を付け替え、`frameLoop` を下げる | ⚠️ 大きい波。分けるなら W9a（フレーム）・W9b（副作用の手）・W9c（T-064 の 3 名）。`watermarkStampOf` は今の位置で作る（時計 → `S-99a` の順）。`screenEffectHandsOf` は 46 行の文字列 ＋ 包み 3 行 ＝ 49 —— 50 を超えない |
| W10 | 仕上げ: `UF-48` の文の書き換え・⚠️ の 2 文を消す・`dom-screen-surface.ts:424` のコメント・ほかのファイルのコメントの「どのファイルにあるか」を掃く・dist を作り直して Playwright・`file://`・1920×1080 で起動（コンソールのエラー 0、描いた図形の数が分割前と同じ）、e2e は `GRS_PERF` 無しで | — | 出口の赤が分割のせいかは、同じ作業木で src を `d0ae3a9c8` に戻して同じ試験を走らせて判じる（手順 6） |

**循環の向き**（全波で守る）: 入口 → 兄弟（値）、兄弟 → 入口（**型だけ**）。兄弟どうしは「保持（(M)）と語彙（`notice-reasons`・`screen-session-queries`・`clock-readers`）が葉」「(F) の兄弟が葉を取り込む」「(F) どうしの呼び出しは `input-reception → {settled-entry-answers, action-carrying, search-hit-jump, delay-diagnostics-hold}`、`settled-entry-answers → {action-carrying, delay-diagnostics-hold, delay-diagnostics-report-window}`、`delay-diagnostics-report-window → {search-hit-jump, action-carrying}`」の一方向。逆向きが要る所は `parts` の関数で呼ぶ。

---

## 6. 検査への見込み

| 検査 | 見込み | 根拠・測り方 |
| --- | --- | --- |
| 60（関数の大きさ） | HELD の付け替え 5（`runFrame`・`exportScene` → `frame-drawing.ts`、`receiveInput` → `input-reception.ts`、`carryOutAction` → `action-carrying.ts`、`answerSettledEntry` → `settled-entry-answers.ts`）。`frameLoop` 1531 → **約 370**（入口に残る閉包の項の和、`partition-v4.json` の `E` の閉包の項 ＋ `parts` の生成 約 45）。新しい HELD は**0 の設計**: (M) はどれも 25 行以下、帯の手前の 49 行の 3 つと 46 行の 1 つと新しい 49 行の 1 つは行を足さない | `function-size.mjs`。⚠️ 付け替えた関数が 1 行でも増えれば赤 —— 波ごとに測る |
| 55（コメントの密度、100 行以上のファイルは 10%） | 割ると濃くなる所: `input-reception`（約 −9 行）・`action-carrying`（約 −8）・`document-write-gate`（約 −4）・`table-window-places`（約 −1）。合計 **約 22 行**のコメントを、コメントの規則の 5 節どおり台帳へ起こして消す。100 行未満のファイル（`pointer-press-hold` ほか 6）は木の密度だけに効く（余り 190 行） | `partition.mjs` の近似（`//`・`/*`・`*` で始まる行と、`//` を後ろに持つコードの行。`@purity` の行は数えない）に取り込みの見積りを足した。**近似** —— 波ごとに `check-comment-rules.py --list` で測る |
| 45（同じ式の繰り返し） | `p.` の接頭辞と出し直しの行で、下限の下の重複が 20 字句を超えうる（CR-554 の学び ④） | 測れていない。波ごとに `check-repeated-expressions.py`。型なら既存の名で解く |
| 59（部品の辺） | 変わらない。新しいファイルはすべて `SingleHtmlShell` の中。畳み G28（→ `ScreenRenderer`）・E39（→ `InputCommandTranslator`）・I01（→ `EditHistory`）の辺はすでにある（入口が今それぞれから取り込んでいる） | `frame-loop.ts:6-300` の取り込み |
| 61（モジュールの可変状態） | 0（`src/framework` は読まない） | CR 5.3 |
| 26b ・ 18 ・ 44 | 新しいファイルは T-075 の行が入るまで赤 ⇒ 行をその波のコミットに入れる | rule 05 手順 5 |
| 双子のコメント | I07 の 1 記録が消える（基準線を下げる） | `twin-comments-baseline.txt:145-147` |
| 字の写し（70）・生成（`gen:check`） | 生成の区画の行先が `frame-drawing.ts` と `document-write-gate.ts` に分かれる ⇒ `generate_entity_types.py` の 2 か所 | `:3733`・`:3919` |
| FS（新しいファイルの大きさの検査、CR 5.1） | FS はまだ木に無い（`ls .claude/skills/spec-graph-check/` に大きさの検査は `check-function-size.py` だけ）。入れるなら、基準線の初めに `document-file-flow.ts` 1,320 が載る（7 節 問い 1） | CR 5.1 |

---

## 7. 残る問い（利用者の判断が要るものだけ）

### 問い 1 —— `document-file-flow.ts`（1,320 行）を本 CR で割るか

- 機構: `JDG-695` は 1,000 を超える手書きの `src` のファイルを割れ（MUST）と言い、CR-578 の出口は「兄弟のどれも 1,000 を超えない」（CR 2.1）。CR を起草した時 852 行だった兄弟が、その後の CR で 1,320 行に育った（同じ awk）。本計画は 6 定数（+11 行）をここへ移す。
- 実測: 書き出しの側（`landSavedDocument` 〜 `askToOpenDroppedFile`、`:1065-:1319` ＋ その側だけの定数）約 290 行、遅延診断の直しの束の保持（`delayFixBundleHoldOf` ほか `:482-:560`）約 80 行。2 つを出せば約 960 行。
- 選択肢:
  - **A（推奨）**: 本 CR の外の新しい CR にし、同じ車線で CR-578 の直後に回す（`CR-579`・`CR-580` とは別フォルダなので並べられる）。CR-578 の出口の文は「本 CR が動かした兄弟は 1,000 を超えない」と読む。理由: 割り方の証拠（共変・要求の所有）は別に測るべきで、CR-578 の波をこれ以上大きくしない。
  - B: CR-578 に W11・W12 として足す（`document-file-writing.ts`・`delay-fix-bundle-hold.ts`）。CR の出口の文を字のとおり満たす。
  - C: 今は割らない（`JDG-695` に反する）。
- 覆す費用: A→B は波を足すだけ。C は `JDG-695` の違反が残る。

### 問い 2 —— 他の部品のコードを変えて畳む群（G29x・G53a・G53x の部品をまたぐ分・I05）と、翻訳器の持ち物の群（G44・E18）を、いつ畳むか

- 機構: 台帳の ① は「CR-578 の分割で畳む」だが、これらは `AdvanceScreenSession`（生成の番人を含む）・`ScreenRenderer` の関数の中・翻訳器のコードを変えないと 1 か所にならない。CR-578 の分割は `SingleHtmlShell` の中の移しであり、翻訳器は `CR-579` の持ち物（CR 4.1・10 節）。
- 選択肢:
  - **A（推奨）**: CR-578 はフォルダの中で畳めるもの（G47・E31・H08・I07）と、既に公開された名を読むだけのもの（G28・E39・I01）だけを畳む。翻訳器の 2 群は `CR-579` の後に、残り 4 群は別の畳む CR に回し、DFC-1071 の行を「残る群」に書き換える。
  - B: CR-578 にすべて入れる（use-case・adapter・翻訳器にも触る。`CR-579` と同じファイルを触るので並べられない）。
  - C: 何も畳まない（形だけ割る —— 台帳の ②）。
- 覆す費用: A は後で畳む CR が 1〜2 本増える。B は CR-579 と直列になる。

（名前の審査で決まるもの —— `notice-reasons.ts` と adapter の `notices.ts`・生成の `NoticeReason` との紛れ、`pointer-press-hold.ts` と `held-press-preview.ts` の紛れ、`frame-drawing.ts` が 501〜1,000 の帯で R2.2a を通るか（通らなければ `export-scene.ts` を出す）—— は利用者の問いではなく、手順 1 の審査の体が判じる。）

---

## 8. `CR-579` への中継（4.1 の更新）

今日 `frame-loop.ts:142-162` が翻訳器の入口から取り込む名と、割った後の取り込み手:

| 名 | 割った後の取り込み手 |
| --- | --- |
| `commandFromInput` | `input-reception.ts`・`action-carrying.ts`（`repeatHeldEntry`）・`task-group-grab-carry.ts`・`search-hit-jump.ts`（型の位置）|
| `diagnosisRowAskedOf`・`markerOperatedTaskUidOf`・`screenEventFromInput`・`escapeContextOf`・`isCombo`・`isLandingMarkKeptBy`・`isTypedIntoSearchWord`・`selectionFromInput` | `input-reception.ts` |
| `pressedRowOf` | `pointer-press-hold.ts` |
| `fitWrites` | `frame-loop.ts`（`agentApiSeams` の `pageFitWrites`） |
| `zoomEntranceEndsOf` | `frame-drawing.ts` |
| `NOT_STORED_ZOOM_STEP` | `view-place.ts`（G47 の `zoomLimits()` だけ。今も取り込んでいる） |
| `KEY`（**新**、E39） | `input-reception.ts` |
| 型 `HumanInput`・`InputAction`・`InputContext`・`PointerInput`・`PointerPress`・`SpentEntranceSituation` | 多数の兄弟 |

CR-578 は翻訳器の補助を兄弟へ引き込まず、写さない。翻訳器のファイルには触らない（T-064 の `PI-18` に `KEY` を 1 名足すのは仕様の行だけ）。
