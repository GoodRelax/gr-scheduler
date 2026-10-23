# R2 の独立審査 —— CR-578 / CR-579 / CR-580 の分割の表（2026-10-24、審査の体）

読んだ木: `w4-first-half` の `d0ae3a9c8`（作業木）。読んだ計画: 同じフォルダの `plan-cr-578.md`・`plan-cr-579.md`・`plan-cr-580.md`。
基準: `docs/development-rules/07-review-standards.md` の R2（Naming・R2.2a の 5 段・R2.2b・R2.13・R2.14・R2.16・R2.21）と JDG-820。比べた行: `docs/spec/05-07-design.md` の表 T-075 の `UF-30`〜`UF-102`（:459-473）、`UF-34`〜`UF-156`（:479-486）、`UF-47`〜`UF-206`（:495-514）と `UT-6`（:334）。
測り方: 中身の欄の宣言を 1 つずつ `grep -n -E "(function|const|let|type|interface) <名>\b"` で引いて本体を読み、呼び手を `grep -n "\b<名>("` で数えた（行番号は下の各行）。名の近さは `git ls-files 'src/*.ts' | sed 's#.*/##' | sort` の全 185 本（`git ls-files 'src/*.ts' | wc -l`）と、近い名のファイルの見出しの 1 行目を読んだ。

判定: **pass** = そのまま当ててよい（remark は直しが要らない注記）／ **fix** = 当てる前に表を直す。

---

## CR-578（`frame-loop.ts`）—— pass 13 ／ fix 10

| ユニット | 判定 | 所見（R2 の条） | 直しの案（名・文） |
| --- | --- | --- | --- |
| `frame-loop.ts`（入口） | **fix**（記録） | R2.2a 段 2: 畳みの記録が「送り口・部品の結び = 主の句」と主を 2 つ選んでいる。段 2 は主を 1 つだけ選ぶ。全画面表示の求めは継ぎ目の宣言ではなく振る舞い（`askBrowserForFullScreen` :4043、拒みを告げる）なので「継ぎ目の宣言 (c)」の理由は当たらない | 主の句 =「フレームの 1 周期の部品を 1 度だけ結ぶ」。セッションの現在値は「保持する値 (c)」、「出来事は 1 本の送り口だけを通す」は「禁止 (c)」、`SnapshotSource`・`FullScreenHost`・`AgentApiSeams` は「継ぎ目の実装 (c)」と書き直す（`FullScreenHost` の実装として書けば (c) が立つ）。文の中身は変えなくてよい |
| `frame-drawing.ts` | **fix** | ① R2.1/R2.14: 同じ層の `dom-screen-surface/*-drawing.ts`（`screen-frame-drawing.ts`・`window-frame-drawing.ts` は DOM の描き手）と、`screen-frame.ts`（`UF-61` 画面の枠）・`frame-drags.ts`（`UF-94` 画面の枠）の「frame = 枠」と紛れる。② 中身が文と合わない: `runFrame`（:3108）は絵を計算するだけでなく、`showScreenView` で見せ、`raiseNotice`（:3139）で告げ、`writeOwedSight` →`writeScrollPlace`（:2290・:2297）で文書を書き、`followPanelFace` で出来事を送り、`focusWantedField`・`recordFrame` を呼ぶ。③ R2.2a 段 4: 計画の自らの反証（`EP-12` だけが変わる出来事）が立つ —— 書き出しの絵だけを書き換えさせる出来事が挙がるので FAIL。共変 1.00 は JDG-681 により割る理由を消さない | 名 `frame-run.ts`（`runFrame`・04-verification.md :302 の「フレームの走行」と同じ語）。文「表 T-078 の契機でフレームを 1 回走らせる —— 寸法が定まってから（`BO-1`）表 T-068 の絵を同じ読み（`ScreenViewReadings`）で組んで描き手へ渡し、次のフレームに負うもの（見せる位置・焦点）を返す」。書き出しは `export-scene.ts`（`exportScene`・`exportViewNow`・`ExportSceneWithCapStop`・`ExportView`・`screenExportViewOf`・`spanExportViewOf`・`regionsClosedUnderTaskGroupArea`・`pictureSessionOf`）—— 文「書き出しの絵（`FR-080`・`EP-11`・`EP-12`）を、画面と同じ読みで組む」。`image-exporter.ts` の型 `ExportScene` を組むので名は中身を言う。`dualCursorDrawnOf`（下の `under-pointer-hold` の行）をここへ |
| `input-reception.ts` | **fix** | 中身が文と合わない: `pruneChoiceTo`（:3609、`selectionPruned` を送る命令）の呼び手は `holder.replace`（:2958）と `runFrame`（:3140）だけで、`receiveInput` は呼ばない。`document-write-gate.ts` の文「書いた後に選択とプレビューを文書に合わせ」の仕事そのもの（R2.21 の向き） | `pruneChoiceTo` を `document-write-gate.ts` へ。ほかは pass（`answerConfirmation`・`dismissNoticeByKey`・`spendNoticeRungFirst`・`spentOnParentTaskChoice` は :4134-4204 で `receiveInput` が呼ぶ） |
| `input-context-collection.ts` | pass | 文と中身が合う。`InputContext` を定義する名（`input-context.ts`）にしないのは正しい（型は翻訳器が持つ） | — |
| `action-carrying.ts` | pass | remark: 同じフォルダで「carry」が 2 つの意味（動作を運ぶ／掴んだタスクグループを運ぶ `task-group-grab-carry.ts`）。後者を改名すれば消える。`showDisplayScaleMessage`・`showVerticalZoomEndMessage` は `receiveInput`（:4234・:4237）が動作の後に呼ぶ —— 動作の後段 (a) として通る | — |
| `settled-entry-answers.ts` | pass | remark: `answerSettledOnRelease`・`formatSettledOnRelease`・`surfaceSettledOnRelease` は入口ではなく「離したときに定まった答え・書式・面」を読む。文の (b) の範囲へ「離したときに定まった答えと書式」を足す | 文に「離したときに定まった入口・答え・書式」と書く |
| `document-write-gate.ts` | **fix** | R2.21/R2.14: `raiseWriteRefusal` の呼び手は `writeDocument`・`replaceHeldDocument`（:3708・:3716）だけなのに、計画は `notice-reasons.ts` へ置く。門の拒みを告げるのは門の仕事。`pruneChoiceTo` が来る（上）。remark: 「gate」は `file-gateway`・`clipboard-gateway`（外への口）と語が近いが、`WS-2` の「書き込みの門」の訳で、`UF-165` も「ファイルの門」と書くので名は通す | 中身に `raiseWriteRefusal`・`pruneChoiceTo` を足す |
| `table-window-places.ts` | **fix** | ① JDG-820: 持つのは置き場だけでなく窓の値全体 —— `WindowPlaces`（:1730）は検索パネルのセッション（打った語・フィルタ）・レポートと担当リストの窓・閉じた窓・前後の並びを持つ。② 紛れ: `screen-renderer/table-window.ts`（`UF-193`「3 つの表の窓が共有するもの」）・`window-box.ts`（`UF-189`「窓の置き場」）。ヘルプは表の窓ではないのに入る。③ R2.14: `spendEscapeRung`（:2186）は窓に関わらない `Esc` の段の出来事（`ESCAPE_RUNG_EVENTS` :809）まで送る。④ `proposalsNotIssuedSinceRun`（:552）・`DelayFixSubjectKey`・`FixLogSource` は遅延診断の直しの提案の数え（`RW-16`・`FR-155`）で窓の置き場ではない | 名 `windows-hold.ts`（表 T-335「ウィンドウの状態と振舞い」、フォルダの `*-hold.ts` と既存の工場 `heldWindowsOf` に揃う）。文「表 T-335 のウィンドウ（ヘルプ・検索パネル・遅延診断レポート・担当リスト）の状態を持ち、押し・掴み・列の幅・打った語・閉じる・`Esc` の段に合わせて動かす」。窓に関わらない段の出来事は `input-reception.ts` へ（計画の予備の手を本手にする）。直しの提案の数えは `delay-diagnostics-hold.ts` へ |
| `search-hit-jump.ts` | pass | remark: use-case の `search-jump.ts`（`UF-179`、表 T-332 の書き込み）と名が近い。本体を読んだ（:`jumpToSearchHit`）—— 計算は `searchJumpReachOf`・`searchJumpWrites`・`searchJumpCommands` を呼ぶだけで写しは無い（R2.21 ok）。層とフォルダで分かれる | — |
| `notice-reasons.ts` | **fix** | ① R2.14 紛れ: `docs/spec/_source/notice-reasons.json` が理由の名簿の原稿で、それを刷る先は `notice-values.ts`（見出し :6）、型は生成の `NoticeReason`。`notice-reasons.ts` という名は名簿そのものを持つと読まれる。adapter の `notices.ts`・`notices-drawing.ts` とも近い。② R2.13: 文は「選ぶ」（問い）なのに (F) `raiseFileFault`・`raiseWriteRefusal`（:3414・:3421、告げる命令）を持つ —— 計画自身も純粋性で迷っている。③ 中身に出来事の組み立て（`AGENT_OPEN_FILE_ASKED` :847 は `SessionEvent`、`grsResetEntryPressedOf` :2635、`changeQuestionRaisedBy` :2530）がある —— 文の「問い（`NT-7` の確認）」の範囲 (b) として通るが、名の「reasons」は問いを言わない | `raiseFileFault` は入口（`raiseNotice` の隣、手の束 :447 の口）、`raiseWriteRefusal` は `document-write-gate.ts` へ ⇒ 本ユニットは `pure`。名は問い Q2 |
| `screen-session-queries.ts` | pass | remark: `fileDragEventIn`（:2598）は出来事を組む関数で、呼び手は返す面だけ（:4404）—— 入口に残すのが素直。`mergeReviewIn` は `ScreenViewReadingsTaken`（フレームの側の型）を返すので、問い合わせが絵の側の型に寄る（R2.16 の向きは同じフォルダの中なので可）。G53x の部品をまたぐ写しは台帳どおり残る | `fileDragEventIn` を入口へ（任意） |
| `delay-diagnostics-hold.ts` | pass | remark: `answerDelayDiagnosticsEntry`（:2009）の `RE_DIAGNOSE_ENTRY` の腕はレポートの面の上の入口で、`UF-195` の「レポートの窓の入口に答える」と重なる。今の分け方を動かすだけなので本 CR では直さない。上の直しの提案の数えを受ける | — |
| `under-pointer-hold.ts` | **fix** | 中身が文と合わない: `dualCursorDrawnOf`（:1194）はポインタの下を求めず、描くデュアルカーソルの位置を組む。呼び手は `runFrame`（:3165）だけ | `dualCursorDrawnOf` を `frame-run.ts` へ |
| `pointer-press-hold.ts` | **fix** | ① R2.14: 「持つ」ユニットの (F) `endPointerPress`（:3362）は押しを告げるだけでなく、パレットの角を窓の中へ戻し（`commandPaletteDraggedTo`）、`grabCarry.end`・`windows.endPress` を呼ぶ —— 3 つの兄弟を指揮する。「告げるは持つことの手順 (a)」は当たらない。② 紛れ: `held-press-preview.ts`（`UF-158`）が `previewOfHeldPress`・`heldPropertyPanelWidthOf`（:96・:131）でプレビューの文書とパネルの幅を作り、本ユニットがそれを持つ。名が「press」「hold/held」で互いに似る | `beginPointerPress`・`endPointerPress` は入口か `input-reception.ts` へ（押しの始まりと終わりを各兄弟へ配るのは結線の側）。本ユニットは (M) と `collectPress`・頂上の関数だけ。文「押している間の押し（`CS-2`・表 T-289）と、その押しの間に `held-press-preview.ts` が作ったプレビュー（表 T-023d）を持つ」。名はこのままでよい（直すと 2 つの文が「作る／持つ」で分かれる） |
| `command-palette-place.ts` | pass | `view-place.ts` と同じ「place」の使い方（置き場）。文と中身が合う | — |
| `drawn-picture-hold.ts` | pass | `beneath-picture-hold.ts` と同じ形・同じ語。entity の `drawn-task-groups.ts` とは層が違い、意味も「描いた」で同じ | — |
| `task-group-grab-carry.ts` | **fix** | ① JDG-820: 中身は掴んだ間の端のスクロール（`heldGrabScrollOf`・`turnedGrabScrollPlace`・`HeldGrabScroll`、工場 :2093 の `edgeScroll`・`scrolled`）で、運び（落ち先）は翻訳器の `task-group-grab.ts`（`UF-97`「HF-15 に従って運び」）が持つ —— 名と文が翻訳器の行と同じことを言う。② `writeScrollPlace`（:2297）は掴みに限らず `writeOwedSight`（:2290、見せる位置の書き込み）も呼ぶ —— 掴みのファイルに汎用の書き込みが居ると R2.14 | 名 `task-group-grab-scroll.ts`。文「タスクグループを掴んで運ぶ間（`HF-15`）、端で巻いたスクロールをフレームの値として持ち（`WS-2`）、離したときに 1 度だけ書く（`S-597`・`S-598`）」は今のまま通る。`writeScrollPlace` は `document-write-gate.ts` へ（表示の位置の書き込み） |
| `clock-readers.ts` | pass | remark: R2.21 —— `delay-diagnostics-report-window.ts:88`・`:120` が `new Date()` を自分で読む（`localMomentOf` は秒の無い別の書式 `RW-15` で、値は畳めない）。`single-html-shell.ts:567` の `Date.now()` も同じ。文を「`frame-loop` の周期が読む宿主の時計」と狭めるか、台帳に 1 行 | — |
| `session-effects.ts`（育つ） | **fix**（仕様の文） | `UT-6`（05-07-design.md :334）が「『書き込みの中身が違う』は `frame-loop.ts` の実行の行である（`UD-5`）」と書く。手の表を出すと、この文の指す先が 2 つのファイルに分かれる。計画 4.2 はこの文を直していない。表そのものの移しは pass（効果の種類が 1 つ増えると型と表が必ず共に変わる、共変 9/9） | `UT-6` の文を「『書き込みの中身が違う』は手を持つ兄弟（`document-write-gate.ts` ほか）の行、『どの手に渡したか』は `session-effects.ts` の行」へ |
| `pointer-shape.ts`・`delay-diagnostics-report-window.ts`・`view-place.ts` | pass | 文は変えず、中身が文の範囲に入る | — |
| `field-entry.ts`・`frame-clock-wakes.ts`・`watermark-unlock.ts`・`document-file-flow.ts` | pass | ただ 1 人の使い手へ定数を移すだけ | — |

**入口 `frame-loop.ts`（≈670）の R2.2b**: 要約である（主 =「部品を 1 度だけ結ぶ」、兄弟への委ねは (c)）。単なる入れ物ではない —— 送り口・現在値・返す面と継ぎ目の実装という固有の中身を持つ。上の記録の直しだけで通る。

---

## CR-579（`input-command-translator.ts`）—— pass 10 ／ fix 4

| ユニット | 判定 | 所見（R2 の条） | 直しの案（名・文） |
| --- | --- | --- | --- |
| `input-command-translator.ts`（入口） | **fix**（文） | R2.14: 文の主「答える兄弟を選ぶ」は中身より狭い —— `commandFromEntry`（:1174 からの腕）は `openDocumentFile`・`undoEdit`・テーマ・積む向き・パレットの最小化などを兄弟に渡さずその場で答える。中身の `placementAt`・`taskShapeKindNamed`・`milestoneGlyphNamed`・`boxById`（2 つ以下の兄弟が読む補助）は文の「出し直す補助」にも「語彙」にも入らない。`MODIFIER_ONLY_KEYS`（:1067）が修飾キーのファイルの外に残る（L 群なので理由はあるが、名が POLA） | 文「`CP-18` の残り —— 入力の種類と押した所から、表 T-023a・表 T-109 の台帳に従って答える —— 固定の動作は自ら答え、ほかは答える兄弟を選ぶ。<br>兄弟とシェルが共有する語彙（入力の文脈と押し・出力の型・`Esc` の段の材料 `IN-4`）と、兄弟が共有する小さな補助を持ち、日程表の座標と修飾キーの読みを出し直す」。R2.2b は pass（要約。台帳が固有の仕事） |
| `chart-coordinates.ts` | pass | R2.2a は `JDG-690`（R と D を 1 つの兄弟へ）が決めた。remark: `dayShifted`・`dayShift` は座標でなく日の番号の足し引き、錨の `panTo`・`isScrollPositionInForce` は書き込み —— 名は計画の Q2 で問う（下の問いには入れない。計画の推奨で足りる） | — |
| `modifier-keys.ts` | **fix** | JDG-820: 中身の `KEY`（:452）は `F1`・`A`〜`Z`・`Enter`・`Esc`・`Delete` を含むキーの名の全部で、修飾キーではない。`isTypedIntoSearchWord`・`isEnterInSearchPanel`・`isSingleCharacterKey`（`IN-5a`・`SV-5`）も修飾を読まない。同じフォルダの `shortcut-keys.ts`（`UF-90` 打鍵 → 操作）と「-keys」で並ぶ | 名は問い Q4。文「キーの名と、修飾キーとの組（キーとポインタ）を読み、修飾の割当（`MK-10`・`MK-12`・`MK-16`）・押したときの修飾（`CY-11`）・`Alt` の吸着（`SG-4`）・検索の語の欄が取るキー（`IN-5a`・`SV-5`）を判ずる」 |
| `task-alignment.ts` | pass | `alignAnswer` は `verticalZoomAnswer` と同じ形（POLA） | — |
| `resource-list-entrances.ts` | pass | remark: シェルの `resource-list-window.ts`（`UF-200`「担当リストのウィンドウの入口に答える —— 表と枠の入口」）と入口が重なるかを見た —— 本ユニットは `IC-63`〜`IC-65`・`IC-67`・`IC-68` の選びだけで重ならない（R2.21 ok）。文に「担当の選び」と書いてあるので通す | — |
| `display-setting-entrances.ts` | **fix** | R2.14: 表示の倍率（`displayScaleDown/Up`）も文書の表示の設定なのに、その入口は `display-scale-steps.ts`（`UF-93`）に残る。名が中身より広く、`display-scale-steps.ts` と頭の語が同じ。中身は押すたびに次の値へ移す切り替え（`IC-99` 段・`IC-100` 色・`IC-101` 向き・`FR-049` の見せる・隠す） | 名は問い Q5 |
| `src/entity/.../task-group-tree.ts` | **fix** | ① JDG-820: 新しい関数 `taskGroupTreeDepth` は「木の深さ（最大）」と読める。指すのは 1 つのタスクグループの深さ（`edit-task-group.ts:105` `depthOf(byId, taskGroup)`）。② 名 `task-group-tree.ts` は木について何でも入る形で、中身（順位と深さ = 木の中の位置）より広い。同じ語の `task-group-tree-entrances.ts` もある。③ `taskGroupRankById` を `schedule-invariants.ts` から出すと、その行の文（`IV-19`）も直す | 関数 `taskGroupDepthOf(byId, taskGroup)`（`taskGroupRankById` と対）。名は問い Q6。`schedule-invariants.ts` の T-075 の行と見出しから順位を外す波を明記 |
| `zoom-and-fit.ts`（育つ） | pass | `FR-016` の MUST NOT を (c) で足す。文は要約のまま | — |
| `screen-state-input.ts`・`task-group-tree-entrances.ts`・`task-group-grab.ts`・`shortcut-keys.ts`（育つ） | pass | ただ 1 人の読み手へ移す・写しを 1 本にする | — |
| `item-grab.ts`・`armed-placement.ts`・`field-commit.ts` | pass | 取り込みの出どころが変わるだけ | — |

**入口（≈890）の R2.2b**: 要約である —— 台帳による振り分けという固有の仕事を持ち、列挙でしか言えない入れ物ではない。直すのは文が中身より狭いこと（R2.14）だけ。

---

## CR-580（`mspdi-codec.ts`）—— pass 7 ／ fix 2

| ユニット | 判定 | 所見（R2 の条） | 直しの案（名・文） |
| --- | --- | --- | --- |
| `mspdi-codec.ts`（入口） | **fix**（中身 1 つ） | 計画 1.2 の表が `MUST_START_ON`（:1213）を入口に「残す」とし、`mspdi-tasks.ts` の見込みも 367 行で数えている。読み手は `writtenConstraintOfGrs`（:1224）だけ —— 兄弟だけが読む定数を入口に置くことになる（R2.14） | `MUST_START_ON` を `writtenConstraintOfGrs` と共に `mspdi-tasks.ts` へ（G34 を畳まないことは変わらない）。文は pass —— 主「`Project` 要素と文書を相互に写す」、組み立ては (a)、語彙・要約タスクの判じ（`summaryTargetOf` を `tasks`・`assignments` が読む、:560・:780）は (c) |
| `mspdi-carry.ts` | **fix** | JDG-820/R2.14: 名は「控え」の全部を言うが、中身は読む側の切り分けだけ（`carrySplit` :193・`carriedElement` :209）。書く側の戻しは `mspdi-child-placement.ts`（既存の `writtenCarriedElement` と移る `splicedCarriedRows` :1105）、版の判じが読む `CarryHolder`・`carryHoldersOf`（:244・:275）は入口に残る —— 「carry」の仕事が 3 つのファイルにあり、`mspdi-carry.ts` を開いた人は戻しを見つけられない | 名は問い Q7。文「要素の子のうち文書が読まないものを、読むときに切り分けて控える —— 葉は `carry` に、子を持つ要素は届いた順の番号と共に `carryElements` に（`DF-3`・`RS-60`）。同じ名の葉は最初を取り、残りの数を数える（`MR-3`）。戻すのは `mspdi-child-placement.ts`」 |
| `mspdi-child-placement.ts`（育つ） | pass | 「持ち回った子を届いた順で戻す」の範囲 (b)。R2.21 の判断（戻しを 1 か所）は正しい | — |
| `mspdi-actual-durations.ts` | pass | 「相互に写す」の主に読み・書きが (b)。H07（`json-codec.ts` の写し）は `DFC-1057` が持つ | — |
| `mspdi-calendars.ts` | pass | `WeekDay`・`Exception`・`WorkingTime` は子 (b) | — |
| `mspdi-resources.ts` | pass | `edit-resource.ts`・`resource-list.ts` とは `mspdi-` の頭で分かれる | — |
| `mspdi-assignments.ts` | pass | `writtenAssignments` は `writtenTasks` と同じ形 | — |
| `mspdi-tasks.ts` | pass | 文は長いが、句はどれも `Task` の列 (b) か委ね (c)。G34 の写しは `DFC-1063` に残る | — |
| `calendar-day.ts`（`durationTextOfMinutes` を足す） | pass | remark: 「暦の日付」のファイルに長さの綴りが入るのは名から外れるが、既に `textOfInstant`（`EX-7`、日付でない時刻の字）を持ち、「交換の字句」の置き場として先例がある。見出しと `UF-170` の文を直す計画どおりで通す（計画の問い 2 の (a) に同意） | — |

**入口（≈535）の R2.2b**: 要約である（`Project` 要素と文書の組み立てが固有の仕事）。501〜1,000 に残るが責務は 1 つ（JDG-695 の後段に当たらない）という計画の判断に同意。

---

## 共通の所見

1. **T-075 の欄には文だけを入れる。** 計画は「2 節の表の責務の文をそのまま行にする」と書くが、2 節の欄には「畳み:」と「⚠️ 段 4 の反証」が混ざっている（578 の `frame-drawing.ts` ほか、579・580 も同じ）。畳みは R2.2a 段 5 の Remark（審査の記録）へ。
2. **文の水準は既存の行と揃っている**（1〜3 文、動詞の句、`——` の後に範囲と制約、行 ID を添える）。578 の `settled-entry-answers.ts`・`screen-session-queries.ts` は列挙が長いが (b) の範囲で、`UF-163`・`UF-198` と同じ程度。
3. **R2.16**: 578 は終わったとき兄弟が入口から型だけを取り込む形で、向きが良くなる。579・580 は今のフォルダの輪（兄弟 ↔ 入口の値）をそのまま使う —— 既存の `mspdi-fade-frames.ts`・翻訳器の 13 兄弟と同じ形なので本 CR の差分としては可。
4. **Manager / Handler / Helper / Utils / data / info・`-and-`**: 3 つの計画の新しい名に 0（計画 3 本の `` `*.ts` `` の名を `sort -u` して `grep -i -E "manager|handler|helper|utils|data|info|-and-"` —— 当たり 2 は既存の `copy-and-paste.ts`・`zoom-and-fit.ts` だけ）。

---

## 利用者に問うこと（2 つの良い名が競うものだけ）

| # | 対象 | 選択肢 | 推奨 |
| --- | --- | --- | --- |
| Q1 | 578 `frame-drawing.ts` | (A) `frame-run.ts` ／ (B) `frame-picture.ts` ／ (C) `frame-drawing.ts` のまま | **(A)** —— 中身は見せる・告げる・書くまで含む「フレームの走行」（04-verification.md の語）。(C) は `*-drawing.ts`（DOM の描き手）と `screen-frame` の「枠」に紛れる。書き出しは別に `export-scene.ts` |
| Q2 | 578 `notice-reasons.ts` | (A) `outcome-notices.ts`（起きたことから選ぶ告げと問い）／ (B) `fault-notices.ts` と `confirmation-questions.ts` に 2 つ ／ (C) `shell-notices.ts` | **(A)** —— 原稿 `notice-reasons.json`・型 `NoticeReason` と紛れず、問いも含む。「choice」はシェルで選択の意味に使われているので避けた。(B) は問いの変更理由（表 T-234）を分けたいとき |
| Q3 | 578 `table-window-places.ts` | (A) `windows-hold.ts` ／ (B) `table-windows-hold.ts` ／ (C) `table-window-places.ts` のまま | **(A)** —— 表 T-335 の「ウィンドウの状態」を持ち、ヘルプも入る。フォルダの `*-hold.ts` と工場 `heldWindowsOf` に揃う。(B) はヘルプが外れる。(C) は置き場以外（打った語・フィルタ）を隠す |
| Q4 | 579 `modifier-keys.ts` | (A) `key-combos.ts` ／ (B) `modifier-keys.ts` のまま ／ (C) `input-modifiers.ts` ／ (D) `key-names.ts`（`KEY` と検索の語の欄のキー）と `modifier-combos.ts` に 2 つ | **(A)** —— フォルダの語 `isCombo` と同じで、キーの名と修飾の組の両方を言う。(B)(C) は `KEY` の英字と `F` キーを言わず、`shortcut-keys.ts` と並ぶ |
| Q5 | 579 `display-setting-entrances.ts` | (A) `display-switch-entrances.ts` ／ (B) `display-setting-entrances.ts` のまま ／ (C) `appearance-entrances.ts` | **(A)** —— 中身は押すたびに次の値へ移す「表示の切り替え」（`FR-049`）で、倍率（`display-scale-steps.ts`）を含まないことが名から読める |
| Q6 | 579 `Schedule` の新しいファイル | (A) `task-group-tree-position.ts` ／ (B) `task-group-tree.ts` | **(A)** —— 中身は木の中の位置（順位と深さ）だけで、(B) は木について何でも入る名（肥大の予告、R2.1 の Use Case の名と同じ理屈）。関数はどちらでも `taskGroupDepthOf` |
| Q7 | 580 `mspdi-carry.ts` | (A) `mspdi-carry-split.ts` ／ (B) `mspdi-carry.ts` のまま（文に「読むときに切り分ける。戻すのは child-placement」と書く） | **(A)** —— 関数 `carrySplit` と同じ語で、読む側だけであることが名から読める。戻しの置き場（child-placement）は計画の R2.21 の判断どおり |

578 の `task-group-grab-carry.ts` → `task-group-grab-scroll.ts` は中身がスクロールだけで競う名が無いので問わない（fix の行のとおり当てる）。
