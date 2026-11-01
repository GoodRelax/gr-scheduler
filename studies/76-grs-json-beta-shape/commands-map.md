# CR-851 命令と拒否の理由 —— 読みやすい版

`commands-map.tsv`・`refusal-reasons-map.tsv`・`commands-choices.md` から刷った読みやすい版（正は 2 つの TSV）。選んだこと（覆してよいもの）と数の測り方は `commands-choices.md` にある。命令は 93 から 43 へ（名つき 34 ＋ 編集の命令 9）。

## 1. 編集の命令の読み方

形: `{"kind":"edit<実体>", <プロパティ>, "set":{<欄>:<値>,…}, "clear":[<欄の名>,…]}`

1. **set と clear のどちらか 1 つ以上**を持つ。空の `set`・空の `clear` は書かない（`minProperties: 1`・`minItems: 1`、違えば `malformedRequest`）。
2. **set にも clear にも無い欄は触らない。**
3. **clear はプロパティを消す。任意のプロパティならどれでも clear できる**（JDG-3309: 無い ＝ プロパティを省く、MSPDI と同じ）。必須の欄（いつも値を持つ欄）は clear に載らない。`{"kind":"none"}` は無い —— 「無い」はいつもプロパティの不在で言う。残る状態の kind は「ほかに従う」3 つだけ: `{"kind":"theme"}`（色）、`{"kind":"sameAsScheduleData"}`（viewTimeZone）、`{"kind":"notDecided"}`（scrollPosition）。これらは値なので set で書く。
4. **空の配列は書かない。** 並びを空にするのは clear（プロパティが消える）。名つきの命令が並びを空にするとき（`unpinTaskGroup` で最後の 1 つを外すなど）もプロパティを消す。
5. **同じ欄を set と clear の両方に書けば拒む**（`fieldSetAndCleared`）。
6. **文字の欄に空の字列は書けない**（`minLength: 1`）—— 空にするのは clear。
7. **判定は書いた後の行で行う。** 片方だけ送ってよい。組の規則（IV-9・IV-10・IV-12・IV-19・FX-1・書き直した IV-8）は書いた後の行で判定する。
8. **edit は名指した欄だけを書く。** 例外は 1 つだけ: `editTask` の start・finish が動いたら percentComplete と carry の Manual*／余裕を作り直す（導く値）。第 1 版の fontSizeStep の波及は 2 プロパティが文書から消えて無くなり（JDG-3294）、第 2 版の名の写しは JDG-3315 で撤回した。ほかの欄へ波及させる規則（JDG-3304 の 50 など）は画面が同じ命令の set に入れて送る。刻印と changeLog はいつも動く。
9. 何も変えない edit は受けて、同じ文書を返す。プロパティの指す行が無ければ `notFound`（`field` にプロパティの名）。

## 2. 編集の命令 9 つ —— 欄ごとの set / clear と規則

### B.1 `editProject`（プロパティなし）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `title` | ○ | ○ | 字列 1〜255 字（JDG-3287） | 画面の文書名と書き出しの名は AT-3 の「無いとき」に従う |
| `name`・`subject`・`category`・`company`・`manager`・`author` | ○ | ○ | 字列 1 字以上。`name` は 255 字（JDG-3287）、ほかは XSD が言わなければ 512 字と仮定 | MSPDI へ書かない |
| `revision` | ○ | ○ | 0 以上の整数 → outOfRange | 同上 |
| `startDate` | ○ | ○ | 日時 → unusableDate | 同上 |
| `statusDate` | ○ | ○ | 日時、受け入れる日の内 → unusableDate | 基準日線を立てない（AT-13） |
| `themeHue` | ○ | × | 整数 0〜359 → outOfRange | - |
| `parentTaskProgressToleranceWorkingDays` | ○ | × | 0 以上の整数 → outOfRange | - |
| `scheduleDataTimeZone` | ○ | × | `$defs/UtcOffset`。換算しない。`viewTimeZone` が `sameAsScheduleData` なら見せる帯もついて行く | - |

書けない: 取り込みだけが書く列、`uidHighWaterMark`・`importSequence`・`sourceFormat`、`weekStartDay`（`replaceCalendarRules`、選んだこと 9）。

### B.2 `editTask`（プロパティ `taskUid`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `name` | ○ | ○ | 字列 1〜512 字。⭐ タスクグループには何も写さない —— 名の無いタスクグループにも（JDG-3315） | 名の無いタスク（JDG-3315）。タスクグループには触れない |
| `notes` | ○ | ○ | 字列 1〜65535 字 | 備考なし |
| `start`・`finish` | ○ | × | 日時 → unusableDate。書いた後に finish が前 → endBeforeStart、フェードが収まらない → fadeLongerThanTask。動いたら percentComplete と carry を作り直す | -（任意のプロパティだが、日付の無いタスクは取り込みで拒む RS-81 ので GRS の中では消さない） |
| `deadline` | ○ | ○ | 日時 → unusableDate | 期限なし |
| `fadeInCalendarDays`・`fadeOutCalendarDays`（JDG-3312 の名を仮定） | ○ | ○ | 0 以上の整数（0 は端を平らにする明示のゼロ）→ outOfRange。finish を要す → fadeWithoutFinish、和が期間（暦日）を超えない → fadeLongerThanTask | 置いていない（矢羽根の端は既定の深さ、FD-5） |
| `parentTaskUid` | ○ | ○ | 指す先が無い → notFound、自分の部分木の中 → wouldMakeCycle。wbsOrder は動かさない | 根のタスク |
| `hyperlinkAddress` | ○ | ○ | URL 1〜512 字（MSPDI の `Task/HyperlinkAddress`）。JDG-3185 の読み方（前後の空白と制御文字を除き、大文字小文字を問わない）で `javascript:`・`vbscript:`・`data:` → hyperlinkSchemeNotAllowed（JDG-3314） | リンクなし |
| `hyperlink` | ○ | ○ | 見出し 1〜512 字（`Task/Hyperlink`） | 見出しなし |

書けない: `uid`、`milestone`（命令が無い。形のプロパティはこれに従う）、`wbsOrder`、実績の 4 列（`placeTaskPlanActual` ほか）、`percentComplete`（導く値）、`dependencies`、`calendarUid`・`resumeValid`・`carry`。

### B.3 `editTaskVisual`（プロパティ `taskUid`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `taskShape` | ○ | × | `rectangle`・`chevron`・`arrow`・`endpointSpan`。マイルストーンでないタスクだけが持つ —— マイルストーンに送れば拒む → milestoneShapeMismatch（FR-083 の乗り換えの禁止を保つ、JDG-3311） | -（持つべき行では必ず持つ） |
| `milestoneShape` | ○ | × | SH-5 の名。マイルストーンだけが持つ —— ほかに送れば拒む → milestoneShapeMismatch | - |
| `fillColor`・`strokeColor` | ○ | ○ | palette・custom・theme（JDG-3310）。書いた後に 2 つともプロパティが無い → fillAndStrokeBothInvisible | 描かない |
| `strokeWidthPx` | ○ | × | 整数 1〜10、既定 1（JDG-3308）。表示倍率 100 の CSS px（JDG-3291） | - |

### B.4 `editTaskGroup`（プロパティ `taskGroupId`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `name` | ○ | ○ | 字列 1〜512 字。表すタスクの名についていかない（JDG-3303） | 名の無いタスクグループ（JDG-3315 —— 拒まない、何も写らない） |
| `color` | ○ | ○ | palette（`ink` を除く）・custom・theme | 帯を塗らない（JDG-3310） |
| `minHeightPx` | ○ | ○ | 1 以上の整数。表示倍率 100 の CSS px、verticalZoomRatio では変わらない（JDG-3291） | 床なし（第 1 版の「0 ＝ 床なし」は JDG-3309 で覆った） |
| `treeState` | ○ | × | `auto`・`collapsed`・`expanded`・`temporarilyExpanded`・`hidden` | - |
| `editGroup` | △ | △ | 字列 1 字以上。⚠️ FR-111 が出来るまで set も clear も断る → notImplemented（選んだこと 8） | 誰でも編集できる |
| `hyperlinkAddress`・`hyperlink` | ○ | ○ | `editTask` と同じ（GRS の任意の列、JDG-3314） | リンクなし |

書けない: `id`、`parentId`・`order`（`moveTaskGroup`・`reorderTaskGroupSiblings`）、`representedTaskUid`（作るときと `deleteTask` だけ）。

### B.5 `editResource`（プロパティ `resourceUid`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `name` | ○ | ○ | 字列 1〜512 字 | 名の無い担当（MSPDI へ書かない） |

### B.6 `editCommentBox`（プロパティ `commentBoxId`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `text` | ○ | ○ | 字列 1〜65535 字 | 本文なし（第 1 版の `""` は JDG-3309 でプロパティの不在へ） |
| `anchor` | ○ | × | 和 `freePoint`（`dateTime`・`taskGroupId`・`bandFraction`）・`task`・`highlightBox`（中は全部必須）。吸着先が無い → notFound、日時 → unusableDate、`bandFraction` → outOfRange | - |
| `bodyOffsetPx` | ○ | × | `{"dx","dy"}` の有限の数 → outOfRange。⚠️ 表示倍率に従うようになる（JDG-3291） | - |
| `strokeColor`・`textColor` | ○ | × | palette・custom・theme。線と字はいつも描く（FR-019 を必須の欄として保つ） | - |
| `strokeWidthPx` | ○ | × | AT-149 の範囲の整数。⚠️ 表示倍率に従う（JDG-3291） | - |
| `fillColor` | ○ | × | palette・custom・theme。箱の塗りはいつも色を持つ（JDG-3276・JDG-3310）。透過率 100 の箱で色を選んだら 50（JDG-3304）は画面が同じ set に入れて送る | - |
| `fillTransparencyPercent` | ○ | × | 整数 0〜100。見えない塗り ＝ 100 | - |
| `fontSizePx` | ○ | × | 整数 8〜24。⚠️ 表示倍率に従う（JDG-3291、JDG-456・464・2895 を表示倍率について覆す） | - |
| `hyperlinkAddress`・`hyperlink` | ○ | ○ | `editTask` と同じ（JDG-3314） | リンクなし |

### B.7 `editHighlightBox`（プロパティ `highlightBoxId`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `firstDay`・`lastDay` | ○ | × | `$defs/Day` → unusableDate。書いた後に逆さ → highlightBoxInverted | - |
| `topTaskGroupId`・`bottomTaskGroupId` | ○ | × | 指す先が無い → notFound。書いた後に逆さ → highlightBoxInverted | - |
| `strokeColor` | ○ | ○ | palette・custom・theme | 枠を描かない（JDG-3310）。透過率 100 なら拒む → fillAndStrokeBothInvisible |
| `strokeWidthPx` | ○ | × | AT-145 の範囲の整数。⚠️ 表示倍率に従う（JDG-3291） | - |
| `fillColor` | ○ | × | palette・custom・theme（いつも色を持つ） | - |
| `fillTransparencyPercent` | ○ | × | 整数 0〜100。書いた後に枠のプロパティが無く 100 → fillAndStrokeBothInvisible | - |

書けない: `cornerRadiusPx`（作るときに S-132 を写す）。

### B.8 `editDocumentSettings`（プロパティなし）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `stackDirection` | ○ | × | `up`・`down` | - |
| 真偽 11（`isBaselineVisible`・`isPlanVisible`・`isActualVisible`・`isProgressLineVisible`・`isProgressMarkerVisible`・`isDateGridLinesVisible`・`isGroupGridLinesVisible`・`isAssigneeVisible`・`isPercentCompleteVisible`・`isDependencyVisible`・`isPlanDatesVisible`） | ○ | × | 真偽 | - |
| `fontSizeStep` | ○ | × | `small`・`medium`・`large`（JDG-3295）。目盛の大きさは描く側が導く（JDG-3294） | - |
| `isThemeMonochrome` | ○ | × | 真偽 | - |
| `dayWidthPx` | ○ | × | 数 0.075〜900（1 日の幅、表示倍率 100 の CSS px）→ outOfRange、範囲へ丸めるのは今のまま（JDG-3292） | - |
| `verticalZoomRatio` | ○ | × | 数 1〜240（JDG-3293・3296） | - |
| `taskGroupAutoExpandDepth` | ○ | × | 整数 0〜4（treeState が auto のタスクグループが開く深さ、JDG-3293・3296） | - |
| `scrollPosition` | ○ | × | `{"kind":"notDecided"}` ／ `{"kind":"placed","leftEdgeDay","leftEdgeDayFraction","topEdgeTaskGroupId","topEdgeTaskGroupFraction"}` | - |
| `taskGroupPanelWidthPx` | ○ | × | 0 より大きく、Task Group Area を 0 以下にしない → outOfRange。表示倍率 100 の CSS px（JDG-3291） | - |
| `isTaskGroupPanelWidthFixed` | ○ | × | 真偽 | - |
| `displayScalePercent` | ○ | × | 50・67・75・90・100・110・125・150・175・200（JDG-3292） | - |
| `fitSpan` | ○ | ○ | `{"firstDay","lastDay","isFixed"}`。lastDay が前 → endBeforeStart | 期間なし（固定も無い） |
| `viewTimeZone` | ○ | × | `{"kind":"sameAsScheduleData"}` ／ `{"kind":"fixed","offset"}`。見せる時刻だけ換算する | - |
| `displayTimeZones` | ○ | ○ | `[{"offset","season"}]` 1〜4 個 | 0 個 |
| `isTimeOfDayVisible` | ○ | × | 真偽 | - |
| `levelZeroTreeState` | ○ | × | `auto`・`collapsed` | - |

書けない: `pinnedTaskGroupIds`（`pinTaskGroup`・`unpinTaskGroup`）、`tableViews`（`editTableView`）。`rulerFontSizePx`・`rulerHeightPx` は文書から消える（JDG-3294）。

### B.9 `editTableView`（プロパティ `table`: `searchPanel`・`delayDiagnosticsReport`・`resourceList`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `isScheduleFilterApplied` | ○（3 表） | × | 真偽 | - |
| `shownTaskUids` | ○（`searchPanel`・`delayDiagnosticsReport`） | ○ | uid の並び（1 つ以上）。ほかの表で書けば表ごとの `oneOf` が拒む | 1 つも表示にしていない |
| `shownResourceUids` | ○（`resourceList`） | ○ | uid の並び | 同上 |
| `isUnassignedShown` | ○（`resourceList`） | × | 真偽 | - |
| `columnFilters` | ○（3 表） | ○ | 和 `values`・`dateRange`（所見 50〜52）、列のプロパティは表ごとの enum | フィルタなし |
| `sort` | ○（3 表） | ○ | `{"column","direction"}` | 既定の並び |

## 3. 名つきのまま残る命令 34

| 命令 | 運ぶ値 | 今の命令 | 規則（今から移るもの） |
| --- | --- | --- | --- |
| `shiftScheduleTimes` | minutes (integer) | CM-98 shiftScheduleTimes | 計算を伴う（書き換える列と残す列は FR-157）ので名のまま。整数でない（旧 FR-157）→ outOfRange、受け入れる日の外（旧 IV-14）→ unusableDate |
| `shiftScheduleToStartDate` | newStartDay ($defs/Day "YYYY-MM-DD") —— 値の名と型は所見 09/12 の Day に揃えた仮定 | CM-99 shiftScheduleToStartDate | 稼働日でずらす計算（FR-159）なので名のまま。日付でない（旧 FR-159）・範囲外（旧 IV-14）→ unusableDate |
| `createTask` | taskShape (rectangle\|chevron\|arrow\|endpointSpan) か milestoneShape (diamond ほか SH-5 の名) のどちらか 1 つ (oneOf), start, finish (DateTime), taskGroupId | CM-6 createTask | milestoneShape を持てばマイルストーン（Task.milestone を真に）、taskShape を持てば期間のあるタスク —— 今の shapeKind "milestone" の読み替え（JDG-3311）。新しい uid は uidHighWaterMark+1（今のまま）。taskGroupId がどのタスクグループも名指さなければその id で最上段のタスクグループを作る —— 名のプロパティを持たないタスクグループ（JDG-3315: 名は強いない、GRS はタスクの名をタスクグループへ写さない）、representedTaskUid は新しい uid。TaskVisual の行を 1 つ作り、strokeWidthPx 1（JDG-3308）、fillColor/strokeColor {"kind":"theme"} を書く。日時（旧 IV-14）→ unusableDate、終わりが前（旧 FR-012）→ endBeforeStart |
| `deleteTask` | taskUid | CM-7 deleteTask | 部分木ごと消す（今のまま）。消したタスクを表すタスクグループは representedTaskUid のプロパティを消すだけで、名は書かない（JDG-3315 で IV-8 が退き、今の settledTaskGroup の「既定の名で確定させる」は無くなる）。吸着していたコメントボックスは anchor が freePoint に落ちる（FR-019） |
| `pasteTasks` | sourceUids (list), landing? (同じ) | CM-8 pasteTasks | 変わらない。指す先が無い（旧 IV-2）→ notFound |
| `placeTaskPlanActual`（改名） | taskUid, place (同じ形) | CM-13 setTaskPlanActualState | 5 つの列と carry を表 T-019 の 1 行として置く計算なので名つきのまま。名だけ変える —— set で始まる名は edit の set と紛れる（選んだこと 1）。実績が始まりより前に終わる（旧 IV-21）→ negativeActualLength、日時（旧 IV-14）→ unusableDate |
| `beginTaskActual` | 同じ | CM-14 beginTaskActual | 変わらない。予定の始まりが無い（旧 FR-043）→ taskWithoutDates、既に始まっている（旧 FR-043）→ alreadyStarted、旧 IV-21 → negativeActualLength、旧 IV-14 → unusableDate |
| `cycleTaskPlanActualState` | taskUid, remembered? (RememberedActual。覚えた実績が無ければプロパティを省く), snapMinutes? | CM-15 cycleTaskPlanActualState | 状態機械を 1 段進める計算なので名のまま。旧の null はプロパティを省く（JDG-3309）。旧 FR-011/FR-012 の拒否は文で endBeforeStart / taskWithoutDates に振り分ける |
| `moveTaskToTaskGroup` | 同じ | CM-19 moveTaskToTaskGroup | 動かすので名のまま（TaskGroupMember を書き、タスクの並びを木の順に直す）。指す先が無い（旧 IV-2）→ notFound、どのタスクグループにも載っていない（旧 IV-6）→ taskGroupMembershipBroken |
| `createTaskGroup` | id, parentId? (省けば最上段), name? (string 1..512), representedTaskUid?, order | CM-26 createTaskGroup | name も representedTaskUid も任意のプロパティで、両方無くてよい（JDG-3315: 名は強いない、IV-8 と今の FR-058 の拒否は退く）。id の重複（旧 IV-1）→ duplicateKey、order（旧 AT-55）→ outOfRange、親が無い（旧 FR-085）→ notFound、深さ（旧 FR-085・S-125）→ taskGroupTooDeep、representedTaskUid の uid が無い（旧 IV-2）→ notFound |
| `deleteTaskGroup` | taskGroupId | CM-27 deleteTaskGroup | 読まれない値 newTaskGroupId を外す。無い（旧 FR-032）→ notFound。タスクグループを全部消したら（IV-20 は 1 つ以上を要す）名 "Untitled" の最上段のタスクグループを 1 つ作る（JDG-3315） |
| `pasteTaskGroupSubtree` | sourceTaskGroupId, parentId? (省けば最上段), newTaskGroupIds (map) | CM-28 pasteTaskGroupSubtree | 複製元・親が無い（旧 IV-2）→ notFound、深さ（旧 FR-033）→ taskGroupTooDeep、写しの id が無い（旧 AT-51）→ missingValue、id が使われている（旧 IV-1）→ duplicateKey |
| `reorderTaskGroupSiblings` | parentId? (省けば最上段), orderedIds (list) | CM-35 reorderTaskGroupSiblings | 親が無い（旧 FR-005）→ notFound、同じ id が 2 度・兄弟を全部名指さない（旧 HM-8）→ siblingListMismatch |
| `resetTaskGroupTreeStates` | (値なし) | CM-72 resetTaskGroupTreeStates | 全部のタスクグループにかかる計算なので名のまま。変わらない |
| `moveTaskGroup` | taskGroupId, parentId? (省けば最上段), order | CM-73 moveTaskGroup | 無い（旧 FR-005）→ notFound、自分や子孫の下（旧 HM-4）→ wouldMakeCycle、深さ（旧 HM-3a）→ taskGroupTooDeep |
| `createDependency` | 同じ | CM-36 createDependency | 旧 rule FR-009 の 5 つの拒否を理由の名に分ける: 両端が同じタスク → bothEndsAreOneTask（今の reasonCategory をそのまま理由に格上げ）、同じ向きの線が既にある → alreadyExists、先行・後続が無い → notFound、予定の日付が無い → taskWithoutDates |
| `deleteDependency` | 同じ | CM-37 deleteDependency | 変わらない（その向きの線を全部消す） |
| `deleteDependencyAt` | 同じ | CM-93 deleteDependencyAt | その線が無い（旧 FR-155）→ notFound |
| `changeDependencyLag`（改名） | predecessorUid, successorUid, lag ({"kind":"workingDays","workingDays":n} \| {"kind":"typed","minutes":n,"unit":"day\|hour\|minute"}) —— 和の形と語は仮定 | CM-38 setDependencyLag | 単位を linkLag（10 分の 1 分）と lagFormat へ換える計算なので名つきのまま。名だけ変える（選んだこと 1）。その向きの線を全部書き換える（今のまま）。線が無い（旧 FR-009）→ notFound、単位の誤り（旧 FR-009）→ スキーマ。2 つの形を値の kind の和にする（「無い」の kind ではないので JDG-3309 に反しない） |
| `replaceCalendarRules`（改名） | 同じ 4 つ（省けばその部分は今のまま） | CM-39 setCalendar | 曜日の行・例外日の全部・時間帯を WC-8 で多くの行へ書き分ける計算なので名つきのまま。名だけ変える（選んだこと 1）。dayType 1..7 の外（旧 AT-73）・weekStartDay 0..6 の外（旧 AT-17）→ outOfRange、稼働する曜日が 0（旧 FR-088）→ calendarWithoutWorkingDay、時間帯（旧 IV-24）→ invalidWorkingTimes。⚠️ weekStartDay は Project の列なので editProject の set に移す案もある（選んだこと 9） |
| `createResource` | name | CM-40 createResource | 変わらない |
| `deleteResources` | 同じ | CM-42 deleteResources | 無い（旧 FR-099）→ notFound |
| `deleteUnreferencedResources` | (値なし) | CM-43 deleteUnreferencedResources | 変わらない |
| `createAssignment` | 同じ | CM-44 createAssignment | タスク・担当が無い（旧 IV-2）→ notFound、同じ割当が既にある（旧 FR-008）→ alreadyExists |
| `deleteAssignment` | 同じ | CM-45 deleteAssignment | その割当が無い（旧 FR-008）→ notFound |
| `createCommentBox` | commentBoxId, anchor ({"kind":"freePoint","dateTime","taskGroupId","bandFraction"} \| {"kind":"task","taskUid","figure","point","fallback":{"taskGroupId","bandFraction"}} \| {"kind":"highlightBox","highlightBoxId","point","fallback":{...}} —— 中は全部必須) | CM-46 createCommentBox | 吸着の組の不揃い（旧 AT-165・AT-166・AT-167）は和の形でスキーマが拒む。置くときに書く: strokeWidthPx S-374、strokeColor・textColor・fillColor {"kind":"theme"}（この 3 つはいつも色を持つ、JDG-3310）、fillTransparencyPercent 0（JDG-3304）、fontSizePx 10、bodyOffsetPx {0,0}。text はプロパティを持たない（本文はまだ無い）。id の重複（旧 IV-1）→ duplicateKey、吸着先が無い（旧 IV-2）→ notFound、日時（旧 AT-113・IV-14）→ unusableDate、帯の割合（旧 AT-163）→ outOfRange |
| `deleteCommentBox` | 同じ | CM-47 deleteCommentBox | 無い（旧 AT-110）→ notFound |
| `bringCommentBoxToFront` | 同じ | CM-100 bringCommentBoxToFront | 並びの順を動かすので名のまま。無い（旧 AT-110）→ notFound |
| `createHighlightBox` | highlightBoxId, firstDay, lastDay ($defs/Day), topTaskGroupId, bottomTaskGroupId —— range の包みを外し、欄の名を文書の欄の名（所見 09）に揃える | CM-52 createHighlightBox | 置くときに書く: strokeWidthPx S-369、cornerRadiusPx S-132、strokeColor・fillColor {"kind":"theme"}、fillTransparencyPercent 100（JDG-3304）。id の重複（旧 IV-1）→ duplicateKey、日付（旧 AT-117・AT-118・IV-14）→ unusableDate、タスクグループが無い（旧 IV-2）→ notFound、逆さ（IV-19）→ highlightBoxInverted |
| `deleteHighlightBox` | 同じ | CM-53 deleteHighlightBox | 無い（旧 AT-116）→ notFound |
| `bringHighlightBoxToFront` | 同じ | CM-101 bringHighlightBoxToFront | 無い（旧 AT-116）→ notFound |
| `pinTaskGroup` | 同じ | CM-68 pinTaskGroup | 並びへ足す操作なので名のまま。上限（旧 FR-098）→ limitReached。並びが空なら pinnedTaskGroupIds のプロパティは無い（JDG-3309）ので、最初の 1 つでプロパティができる |
| `unpinTaskGroup` | 同じ | CM-69 unpinTaskGroup | 最後の 1 つを外したら pinnedTaskGroupIds のプロパティを消す（空の配列を書かない、JDG-3309） |
| `fitScheduleToScreenOnPage` | (値なし) | CM-102 fitScheduleToScreenOnPage | ページが自分の画面から数える計算なので名のまま。画面をまだ描いていない（旧 FR-055）→ notDrawnYet |

## 4. 退く名（送られたら `retiredName` で断り、代わりがあれば `replacement` に入れる）

### 4.1 命令の名 72

| 退く名 | 今の行 | 代わり | なぜ退くか |
| --- | --- | --- | --- |
| `setProjectTitle` | CM-1 | editProject（set title、clear title） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setProjectProfile` | CM-2 | editProject（set name、set subject、set category、set company、set manager、set author、set revision、set startDate、clear その 8 つの名から） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setStatusDate` | CM-3 | editProject（set statusDate） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `clearStatusDate` | CM-4 | editProject（clear statusDate） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setThemeHue` | CM-5 | editProject（set themeHue） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setParentTaskProgressToleranceDays` | CM-87 | editProject（set parentTaskProgressToleranceWorkingDays） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setScheduleDataTimeZone` | CM-94 | editProject（set scheduleDataTimeZone） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskName` | CM-9 | editTask（set name、clear name） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskNotes` | CM-10 | editTask（set notes、clear notes） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskPlanDates` | CM-11 | editTask（set start、set finish） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskDeadline` | CM-12 | editTask（set deadline、clear deadline） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskPlanActualState` | CM-13 | placeTaskPlanActual | 名つきの命令は set で始めない（選んだこと 1） |
| `setTaskFadeInDays` | CM-16 | editTask（set fadeInCalendarDays、clear fadeInCalendarDays） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskFadeOutDays` | CM-17 | editTask（set fadeOutCalendarDays、clear fadeOutCalendarDays） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskParentTask` | CM-18 | editTask（set parentTaskUid、clear parentTaskUid） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskVisualShapeKind` | CM-20 | editTaskVisual（set taskShape） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskVisualMilestoneGlyph` | CM-21 | editTaskVisual（set milestoneShape） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskVisualColors` | CM-22 | editTaskVisual（set fillColor、set strokeColor、clear fillColor、clear strokeColor） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `resetTaskVisualColors` | CM-23 | editTaskVisual（set fillColor、set strokeColor） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskVisualStrokeWidthPx` | CM-24 | editTaskVisual（set strokeWidthPx） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskGroupName` | CM-29 | editTaskGroup（set name、clear name） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskGroupColor` | CM-30 | editTaskGroup（set color、clear color） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `resetTaskGroupColor` | CM-31 | editTaskGroup（set color） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskGroupMinHeightPx` | CM-32 | editTaskGroup（set minHeightPx、clear minHeightPx） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskGroupTreeState` | CM-85 | editTaskGroup（set treeState） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskGroupEditPermission` | CM-76 | editTaskGroup（set editGroup、clear editGroup） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setDependencyLag` | CM-38 | changeDependencyLag | 名つきの命令は set で始めない（選んだこと 1） |
| `setCalendar` | CM-39 | replaceCalendarRules | 名つきの命令は set で始めない（選んだこと 1） |
| `setResourceName` | CM-41 | editResource（set name、clear name） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setCommentBoxText` | CM-48 | editCommentBox（set text、clear text） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setCommentBoxLeaderShapeKind` | CM-49 | （無い） | 列 leaderShapeKind を消す（値が絵を変えない、所見 32）ので命令も退く。送られたら retiredName（replacement なし）で断る |
| `setCommentBoxAnchor` | CM-50 | editCommentBox（set anchor） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setCommentBoxBodyOffsetPx` | CM-51 | editCommentBox（set bodyOffsetPx） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setCommentBoxStrokeColor` | CM-80 | editCommentBox（set strokeColor） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setCommentBoxStrokeWidthPx` | CM-81 | editCommentBox（set strokeWidthPx） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setCommentBoxFillColor` | CM-82 | editCommentBox（set fillColor） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setCommentBoxFillTransparencyPercent` | CM-83 | editCommentBox（set fillTransparencyPercent） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setCommentBoxTextColor` | CM-84 | editCommentBox（set textColor） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setCommentBoxFontSizePx` | CM-103 | editCommentBox（set fontSizePx） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setHighlightBoxRange` | CM-54 | editHighlightBox（set firstDay、set lastDay、set topTaskGroupId、set bottomTaskGroupId） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setHighlightBoxStrokeColor` | CM-55 | editHighlightBox（set strokeColor、clear strokeColor） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setHighlightBoxStrokeWidthPx` | CM-77 | editHighlightBox（set strokeWidthPx） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setHighlightBoxFillColor` | CM-78 | editHighlightBox（set fillColor） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setHighlightBoxFillTransparencyPercent` | CM-79 | editHighlightBox（set fillTransparencyPercent） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setStackDirection` | CM-56 | editDocumentSettings（set stackDirection） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setVisibilitySetting` | CM-58 | editDocumentSettings（set isBaselineVisible、set isPlanVisible、set isActualVisible、set isProgressLineVisible、set isProgressMarkerVisible、set isDateGridLinesVisible、set isGroupGridLinesVisible、set isAssigneeVisible、set isPercentCompleteVisible、set isDependencyVisible、set isPlanDatesVisible） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setFontSizeStep` | CM-62 | editDocumentSettings（set fontSizeStep） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setThemeMonochrome` | CM-64 | editDocumentSettings（set isThemeMonochrome） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setZoom` | CM-65 | editDocumentSettings（set dayWidthPx、set verticalZoomRatio、set taskGroupAutoExpandDepth） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setScrollPosition` | CM-66 | editDocumentSettings（set scrollPosition） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskGroupPanelWidthPx` | CM-67 | editDocumentSettings（set taskGroupPanelWidthPx） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `fitScheduleToScreen` | CM-71 | editDocumentSettings（set dayWidthPx、set verticalZoomRatio、set taskGroupAutoExpandDepth、set scrollPosition） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setDisplayScale` | CM-74 | editDocumentSettings（set displayScalePercent） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setFitSpan` | CM-88 | editDocumentSettings（set fitSpan） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `clearFitSpan` | CM-89 | editDocumentSettings（clear fitSpan） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setFitSpanFixed` | CM-90 | editDocumentSettings（set fitSpan） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskGroupPanelWidthFixed` | CM-91 | editDocumentSettings（set isTaskGroupPanelWidthFixed） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTableView` | CM-92 | editTableView（set isScheduleFilterApplied、set shownTaskUids、set shownResourceUids、set isUnassignedShown、set columnFilters、set sort、clear shownTaskUids、clear shownResourceUids、clear columnFilters、clear sort） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setViewTimeZone` | CM-95 | editDocumentSettings（set viewTimeZone） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setDisplayTimeZones` | CM-96 | editDocumentSettings（set displayTimeZones、clear displayTimeZones） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTimeOfDayVisible` | CM-97 | editDocumentSettings（set isTimeOfDayVisible） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setLevelZeroTreeState` | CM-86 | editDocumentSettings（set levelZeroTreeState） | 1 つの実体の欄を書く命令を編集の命令に畳む（JDG-3267・JDG-3268） |
| `setTaskVisualNamePlacement` | CM-25 | （無い） | (退いた: JDG-372 で名称の位置の機能ごと落とした) |
| `setTaskGroupCollapsed` | CM-33 | editTaskGroup set.treeState | (退いた: CR-570 で treeState 1 列へ) |
| `setTaskGroupHidden` | CM-34 | editTaskGroup set.treeState | (退いた: CR-570) |
| `setTaskGroupKeptOpen` | CM-75 | editTaskGroup set.treeState | (退いた: CR-570) |
| `setPlanActualDisplay` | CM-57 | editDocumentSettings set.isPlanVisible / set.isActualVisible | (退いた: 2026-09-07 S-59 を S-227・S-228 の 2 つの真偽へ) |
| `setGuideCursorMode` | CM-59 | （無い） | (退いた: CR-572 で文書に持たない画面の値へ移った、と読んだ) |
| `setDualCursor` | CM-60 | （無い） | (退いた: CR-572、同上) |
| `clearDualCursor` | CM-61 | （無い） | (退いた: CR-572、同上) |
| `setThemePreference` | CM-63 | （無い） | (退いた: CR-572、同上) |
| `setExportPngScale` | CM-70 | （無い） | (退いた: 2026-09-06 PNG の倍率ごと) |

### 4.2 命令の中で名が変わる・消える欄（退いた名の一覧に入る）

| 退く欄の名 | 代わり | 裁定 |
| --- | --- | --- |
| `shapeKind` | taskShape（期間のあるタスク）／ milestoneShape（マイルストーン） | JDG-3311 |
| `milestoneGlyph` | milestoneShape | JDG-3311 |
| `zoomX` | dayWidthPx | JDG-3292 |
| `zoomY` | verticalZoomRatio ・ taskGroupAutoExpandDepth | JDG-3293・JDG-3296 |
| `displayScale` | displayScalePercent | JDG-3292 |
| `fontSizeStep の値 S / M / L` | small / medium / large | JDG-3295 |
| `rulerFontSizePx ・ rulerHeightPx` | （無い —— 描く側が導く） | JDG-3294 |
| `fadeInDays ・ fadeOutDays` | fadeInCalendarDays ・ fadeOutCalendarDays | JDG-3312 |
| `derivedFromTaskUid` | representedTaskUid | 所見 27 |
| `editPermission` | editGroup | 所見 28 |
| `parentTaskProgressToleranceDays` | parentTaskProgressToleranceWorkingDays | 所見 16 |
| `HighlightRange の start ・ finish` | firstDay ・ lastDay | 所見 09 |
| `scrollDate ・ scrollTaskGroupId ・ scrollDateFraction ・ scrollTaskGroupFraction` | scrollPosition（leftEdgeDay ほか） | absence-classification・doc-shape-map |
| `fitSpanStart ・ fitSpanFinish ・ isFitSpanFixed` | fitSpan（firstDay ・ lastDay ・ isFixed） | JDG-3309 |
| `leaderShapeKind` | （無い） | 所見 32 |
| `deleteTaskGroup の newTaskGroupId` | （無い —— 読まれていなかった） | 選んだこと 19 |

## 5. 拒否の理由 —— 今 → 新しい名

### 拒否の形

| 今 | 新しい名 | 意味 | 名のある欄 |
| --- | --- | --- | --- |
| AgentRefusal.target ("AM-7" などメンバの行 ID / 取次は "relay") | `member (道具・メンバの名 "applyCommands" など) と from ("page" \| "relay")` | どの呼び出しが拒まれたか / 誰が拒んだか | - |
| AgentRefusal.message (ページ) / what (取次) | `message (両方)` | 人が読む英語の説明。行 ID を含めない | - |
| AgentRefusal.stamp (取次は null) | `stamp —— from "page" のときだけ持つ` | 今の刻印（文書は載せない、AG-2） | - |
| AgentRefusal.refusals (いつも配列、空のことが多い) | `commandRefusals (reason が commandRefused のときだけ) / documentFaults (schemaViolation・documentInvalid のときだけ)` | 命令ごとの拒否 / 取り込んだ文書の欠陥ごとの拒否 | - |
| Refusal.command ("CM-36" など T-108 の行 ID) | `commandIndex (束の中の位置、0 から) と kind (命令の名)` | どの命令が拒まれたか | - |
| Refusal.rule ("FR-009"・"IV-2"・"AT-110" など) | `reason (下の command の行の名)` | なぜ拒まれたか | - |
| Refusal.reasonCategory ("bothEndsAreOneTask" だけ) | `(無くなる —— reason に格上げ)` | - | - |
| InvariantRefusal.at | `documentFaults[].at (JSON Pointer)` | 欠陥のある文書の場所 | - |
| (無い) | `field (命令の中のどの値か、例 "set.start")` | 拒まれた値 | - |

### 上の理由（reason）

| 今 | 新しい名 | 意味 | 名のある欄 |
| --- | --- | --- | --- |
| staleStamp | `staleStamp` | 渡した刻印が今の刻印と 1 つでも違う | stamp |
| notOwnStep | `notOwnStep` | 戻す・進める段を書いたのが呼んだ書き手でない | - |
| gestureInFlight | `gestureInFlight` | 人が文書を変えるドラッグの途中 | - |
| editingInPlace | `editingInPlace` | 人がその場で入力を確定していない | - |
| questionAsked | `questionAsked` | 人に確認の問いを出している | - |
| deliveringNotices | `deliveringNotices` | 変更の知らせを配っている途中 | - |
| commandRefused | `commandRefused` | 束の命令のどれかが拒まれ、束ごと適用しなかった | commandRefusals |
| unknownTask | `unknownTask` | 指した uid のタスクが無い | taskUids (新: 無かった uid の並び) |
| notDrawnYet | `notDrawnYet` | ページがまだ 1 度も描いていない | - |
| tooTall | `tooTall` | 絵が書き出せる高さに収まらない | - |
| rasterFailed | `rasterFailed` | 画像にできなかった | - |
| embeddedHtmlFailed | `embeddedHtmlFailed` | 単一 .html を組めなかった | - |
| notAvailable | `notAvailable` | このページの結線にそのメンバの部品が無い | - |
| malformedRequest | `malformedRequest` | 呼び方・命令の形がスキーマに合わない | at (新: JSON Pointer) |
| commandRefused (取り消し・やり直しの段が無いとき) | `historyEmpty` | 戻す（進める）段が履歴に無い | - |
| commandRefused (当てる修正案が無いとき) | `nothingToIssue` | 当てる修正案が 1 つも無い | - |
| commandRefused (取り込みが着かず欠陥も無いとき) | `importNotLanded` | 人が取り込みを取り消した・開く途中だった・検証を通らなかった（MM-4・OP-5・OP-8） | cause (新: openInProgress \| notValidated \| importCanceled ほか ImportRefusal の名) |
| RS-25 | `schemaViolation` | 渡した GRS JSON がスキーマに合わない（uid の範囲 0..2147483647 の外も、JDG-3284） | documentFaults[{at, message}] |
| RS-64 | `formatTooNew` | schemaVersion がこの造りの知る最大より新しく、スキーマにも合わない | documentFaults, knownSchemaVersion (新) |
| (無い) | `formatTooOld` | schemaVersion がこの造りの読む版より古い（α の文書）。古い版の読み替えは持たない | converterUrl (変換の HTML を入手する所、JDG-3306・JDG-3307), knownSchemaVersion |
| IV-n (どれか。今は最初の欠陥の行 ID を reason に) | `documentInvalid` | 取り込みの検証（FR-023 とその上限）が文書を拒んだ | documentFaults[{at, reason, message}] |

### 上と命令ごと

| 今 | 新しい名 | 意味 | 名のある欄 |
| --- | --- | --- | --- |
| (無い) | `retiredName` | 退いた名（命令の kind・メンバの名・引数の名・edit の欄の名）が送られた | name, replacement? (代わりが無ければプロパティを省く) |

### 取次だけ

| 今 | 新しい名 | 意味 | 名のある欄 |
| --- | --- | --- | --- |
| pageNotConnected | `pageNotConnected` | 取次に GRS のページが繋がっていない | pageUrl |
| relayTimedOut | `relayTimedOut` | ページが締め切りまでに答えなかった | member, seconds (新: 今は文の中だけ) |
| badFileName | `badFileName` | fileName が保存先のフォルダの中の相対のファイル名でない | fileName (新) |
| fileExists | `fileExists` | そのファイルが既にあり、overwrite true が無い | path (新: 今は文の中だけ) |
| saveFolderUnavailable | `saveFolderUnavailable` | 保存先のフォルダを作れない・読めない・書けない | folder (新) |
| malformedRequest (取次) | `malformedRequest` | readSchema の which・defs・full の形が違う | at (新) |
| MCP の JSON-RPC の誤り "Unknown tool: X" | `(retiredName)` | 知らない道具の名 | name, replacement |

### 取り込んだ文書の欠陥（documentFaults）

| 今 | 新しい名 | 意味 | 名のある欄 |
| --- | --- | --- | --- |
| IV-1 | `duplicateKey` | 主キーの値が同じ配列の中で重複する | at |
| IV-2 | `danglingReference` | 外部キーが指す行が文書に無い | at |
| IV-3 | `pinnedTaskGroupMissing` | ピン止めしたタスクグループが無い | at |
| IV-4 | `taskParentCycle` | タスクの親子に輪がある | at |
| IV-5 | `taskGroupTooDeep` | タスクグループの入れ子が深さの上限を超える | at |
| IV-6 | `taskGroupMembershipBroken` | タスクがちょうど 1 つのタスクグループに載っていない | at |
| IV-7 | `noCalendar` | 暦が 1 つも無い | at |
| IV-8 | `(退く)` | TaskGroup の name と derivedFromTaskUid が同時に null —— JDG-3315（名は強いない）で行ごと退く。名も表すタスクも無いタスクグループを許す | at |
| IV-9 | `fillAndStrokeBothInvisible` | 塗りと線が同時に見えない（TaskVisual は fillColor と strokeColor のプロパティが両方無い、HighlightBox は strokeColor のプロパティが無く透過率 100 —— JDG-3310 で書き直す） | at |
| IV-10 | `endBeforeStart` | タスクの finish が start より前 | at |
| IV-11 | `fadeWithoutFinish` | フェードを持つタスクが finish を持たない | at |
| IV-12 | `fadeLongerThanTask` | フェードの和が期間（暦日）を超える | at |
| IV-14 | `unusableDate` | 日付・日時の列が読めない、または受け入れる日の外 | at |
| IV-15 | `importSequenceAhead` | TaskOrigin.lastSeenImportSequence が Project.importSequence を超える | at |
| IV-16 | `settingOutOfBounds` | 別の設定値を名指す下限・上限を満たさない | at |
| IV-17 | `calendarWithoutWorkingDay` | 文書の暦が稼働する曜日を持たない | at |
| IV-18 | `taskGroupParentCycle` | タスクグループの親子に輪がある | at |
| IV-19 | `highlightBoxInverted` | ハイライトボックスの firstDay が lastDay より後、または上のタスクグループが下より下 | at |
| IV-20 | `noTaskGroup` | タスクグループが 1 つも無い | at |
| IV-21 | `negativeActualLength` | 実績の長さが 0 を下回る（実績が始まりより前に終わる） | at |
| IV-22 | `milestoneShapeMismatch` | 形のプロパティが Task.milestone に合わない —— マイルストーンが taskShape を持つ・milestoneShape を持たない、またはその逆（JDG-3311 で今の IV-22 を書き直す） | at |
| IV-23 | `taskVisualCountNotOne` | タスクがちょうど 1 つの TaskVisual に指されていない | at |
| IV-24 | `invalidWorkingTimes` | 1 日の時間帯の本数・順・重なりが規則に合わない | at |
| RS-78 | `fileTooLarge` | 取り込むファイルが大きさの上限（S-113）を超える | at |
| RS-79 | `tooManyTasks` | 取り込むタスクの数が上限（S-114）を超える | at |
| RS-80 | `taskTreeTooDeep` | 取り込むタスクの WBS の深さが上限（S-115）を超える | at |
| RS-81 | `taskWithoutDates` | 取り込むタスクに start か finish が無い | at |

### 命令ごと（commandRefusals）

| 今 | 新しい名 | 意味 | 名のある欄 |
| --- | --- | --- | --- |
| rule IV-2 / AT-110 / AT-116 / FR-004・FR-005・FR-007・FR-008・FR-032・FR-042・FR-085・FR-099・FR-155 / FR-009（無いタスク・無い線） | `notFound` | 名指した行（タスク・タスクグループ・箱・担当・割当・線）が無い | field (どのプロパティが指したか) |
| rule IV-1 | `duplicateKey` | 作る行の id が既に使われている | field |
| rule FR-009（同じ向きの線が既にある）/ FR-008（同じ割当が既にある） | `alreadyExists` | 作ろうとした線・割当が既にある | - |
| rule IV-14 / FR-046 / FR-159 / PF-8 / S-77 / S-518 / AT-113 / AT-117 / AT-118 / FR-157 の範囲外 | `unusableDate` | 日付・日時が読めない、または受け入れる日の外 | field |
| rule S-73 / S-487 / AT-104 / AT-59 / AT-55 / AT-163 / AT-115 / AT-17 / AT-73 / FD-7 / FR-157（整数でない）/ FR-016 / FR-052 / 注記の数の範囲（edit-annotation の rangeRefusal） | `outOfRange` | 数が範囲の外、または整数・有限の数でない | field, min, max (新) |
| rule FR-012 / FX-1 | `endBeforeStart` | 終わり（finish・lastDay）が始まりより前 | field |
| rule IV-21 | `negativeActualLength` | 実績が始まりより前に終わる | - |
| rule IV-11 | `fadeWithoutFinish` | finish の無いタスクにフェードを置こうとした | - |
| rule IV-12 | `fadeLongerThanTask` | フェードが期間（暦日）に収まらない | - |
| rule IV-9 | `fillAndStrokeBothInvisible` | 書いた後の行で塗りと線が同時に見えない | - |
| rule FR-083 | `milestoneShapeMismatch` | マイルストーンに taskShape を、期間のあるタスクに milestoneShape を書こうとした（JDG-3311、FR-083 の乗り換えの禁止を保つ） | - |
| (無い) —— CR-849 | `hyperlinkSchemeNotAllowed` | リンクの宛先（hyperlinkAddress）が、ブラウザと同じ正規化（JDG-3185: 前後の空白と制御文字を除き、スキームを小文字に）の後に javascript:・vbscript:・data: で始まる（JDG-3314） | field |
| rule HM-4 | `wouldMakeCycle` | 自分の部分木の下へ動かそうとした | - |
| rule HM-8 | `siblingListMismatch` | 並べ直す一覧が兄弟をちょうど 1 度ずつ名指さない | - |
| rule FR-085（深さ）/ FR-033 / HM-3a | `taskGroupTooDeep` | タスクグループの深さの上限（S-125）を超える | max (新) |
| rule IV-6 | `taskGroupMembershipBroken` | タスクがどのタスクグループにも載っていない | - |
| rule FR-098 | `limitReached` | ピン止めの数が上限 | max (新) |
| rule AT-51 | `missingValue` | 写しの新しい id が対応に無い | field |
| rule FR-009 + reasonCategory bothEndsAreOneTask | `bothEndsAreOneTask` | 依存の両端が同じタスク | - |
| rule FR-009（予定の日付が無い）/ FR-043（予定の始まりが無い）/ FR-011・FR-012（CM-15 の文で振り分け） | `taskWithoutDates` | 予定の日付を持たないタスク | - |
| rule FR-043（既に始まっている） | `alreadyStarted` | 実績を始めようとしたタスクが既に始まっている | - |
| rule FR-088 | `calendarWithoutWorkingDay` | 書いた後の暦が稼働する曜日を持たない | - |
| rule IV-24 | `invalidWorkingTimes` | 時間帯の本数・順・重なりが規則に合わない | - |
| rule IV-19（新。今は命令の側で見ていない） | `highlightBoxInverted` | 書いた後の箱が逆さ | - |
| rule FR-055 | `notDrawnYet` | ページが画面をまだ描いていないので全体表示を数えられない | - |
| rule T-108 | `unknownCommand` | どの命令でもない kind | kind |
| UnimplementedDocumentCommand（CM-76） | `notImplemented` | まだ作っていない欄（editGroup）を書こうとした | field |
| (無い) | `fieldSetAndCleared` | 同じ欄を set と clear の両方に書いた | field |
| rule FR-035 / FR-058（JDG-3315 で退く）/ FR-078 / CV-1 / CV-9 / FR-019 / FR-156 / FR-004（値の組）/ FR-151 / AT-165 / AT-166 / AT-167 | `(malformedRequest へ)` | スキーマ（enum・minLength・和の形）が拒むので命令ごとの理由にならない | at |

## 6. 拒否の形

推す形（`from` で分ける和。持つプロパティは `from` と `reason` で決まり、無いものはプロパティを省く —— JDG-3309 を答えにも当てる）:

```json
{"ok": false, "refusal": {
  "from": "page",
  "member": "applyCommands",
  "reason": "commandRefused",
  "message": "The batch was not applied: command 2 (editTask) set.finish is before set.start.",
  "stamp": {"scheduleUpdatedAt": "…", "documentUpdatedAt": "…", "lastEditedBy": {"kind": "agent", "name": "claude-desktop"}, "fileSavedAt": "…", "grsBuildVersion": "2026-10-19T02:25:08Z"},
  "commandRefusals": [
    {"commandIndex": 2, "kind": "editTask", "field": "set.finish", "reason": "endBeforeStart", "message": "finish 2026-10-01T08:00:00 is before start 2026-10-03T08:00:00"}
  ]
}}
```

```json
{"ok": false, "refusal": {"from": "relay", "member": "readStamp", "reason": "pageNotConnected", "message": "No GRS page is connected to the relay. …", "pageUrl": "http://127.0.0.1:52011/#k=…"}}
```

```json
{"ok": false, "refusal": {"from": "page", "member": "applyCommands", "reason": "commandRefused", "message": "…", "stamp": {…},
  "commandRefusals": [{"commandIndex": 0, "kind": "setTaskName", "reason": "retiredName", "name": "setTaskName", "replacement": "editTask set.name", "message": "setTaskName was retired; send editTask with set.name."},
                      {"commandIndex": 1, "kind": "setExportPngScale", "reason": "retiredName", "name": "setExportPngScale", "message": "setExportPngScale was retired; nothing replaces it."}]}}
```

```json
{"ok": false, "refusal": {"from": "page", "member": "importDocument", "reason": "formatTooOld", "message": "…", "stamp": {…}, "knownSchemaVersion": "…", "converterUrl": "https://goodrelax.github.io/gr-scheduler/…"}}
```

決め事:

- `from` が `relay` の拒否は `stamp` を持たない。
- `commandRefusals` は reason が `commandRefused` のときだけ、`documentFaults`（`[{at, reason, message}]`）は `schemaViolation`・`documentInvalid`・`formatTooNew` のときだけ持つ（空の配列を書かない）。
- 名のある欄（extras）: `pageUrl`、`seconds`、`fileName`、`path`、`folder`、`name`・`replacement?`（retiredName）、`converterUrl`・`knownSchemaVersion`、`taskUids`、`cause`、`at`、`min`・`max`、`field`。今は文の中にだけある値を欄に出す。
- `message` は英語で、行 ID を含めない（今の "AG-10: …"・"BO-1: no frame yet"・"WS-1 refused it; the rule is AG-2"・"(RL-18)"・"past S-125's" は書き直す）。
- 呼ぶ側は知らない `reason` を失敗として扱う（JDG-3301）。

