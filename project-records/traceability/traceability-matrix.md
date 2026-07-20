# gr-scheduler トレーサビリティ・マトリクス (V-model)

- 日付: 2026-07-18
- 目的: user-order → 要求 → 設計 → データ契約 → テスト の一貫トレースを俯瞰する
- 保証: **user-order 全62項目に ≥1 の検証テストが存在し、漏れ 0**（項目別詳細は
  `user-order-coverage.md`、機械可読トレースは StrictDoc の DEEP TRACE / MATRIX = `strictdoc export docs/spec`）

## V字トレースの流れ

```
user-order(62) → L0 STK/UC → L1-L3 ドメイン要求 → 設計 ARCH-C → データ契約 DATA-* → テスト TEST/TR
   (item)         (Parent)      (Implements)          (Satisfies)        (Verifies/ResultOf)
```

StrictDoc リレーション: Parent/Child（要求分解）、Implements（設計）、Satisfies（データ形式）、
Verifies（テスト）、ResultOf（結果）。全17 `.sdoc` は `strictdoc export docs/spec` = exit 0 で
リンク健全（未解決リレーションは hard error のため 0件＝全解決）。

## ドメイン別ロールアップ

| ドメイン(文書) | UIDプレフィクス | 主L0 | 実装コンポーネント(ARCH-C) | 実装ファイル(src) | 検証(テスト) |
|---|---|---|---|---|---|
| 10 canvas-view | CANVAS | STK-L0-001/004/008/019/021 | C-011,021,022,002 | layout-engine, viewport, svg-renderer | layout-engine, left-pane-interaction, e2e |
| 11 items-icons | ITEM | STK-L0-006/001 | C-003,022,023,026 | schedule-model, svg-renderer, editing-controller, import-sanitizer | import-sanitizer, layout, accessible-name |
| 12 properties-i18n | PROP | STK-L0-007/016 | C-008,028,029 | i18n, property-panel, cud-palette | i18n, color-validator, accessible-name |
| 13 layout-alignment | ALIGN | STK-L0-003/005 | C-012,023 | alignment-solver, editing-controller | alignment-solver, bidirectional-sync |
| 14 zoom-lod | ZOOM | STK-L0-002 | C-009,010,021 | time-coordinate-mapper, lod-selector, viewport | time-coordinate-mapper, lod-selector |
| 15 classification-sections | SECT | STK-L0-009 | C-002,011,015 | classification-tree（派生ツリー/縦LOD/検証/単一セクションclamp/**宣言ノード合流・NoneN命名・部分木削除**）, section-organizer, left-pane（**+/↓/✕ 追加・削除ボタン, Add sectionツールバー**）, svg-renderer, editing-controller（宣言空行→カテゴリ採用）, schedule-store（normalizer）, commands（reclassify/**addSection・addSubcategory・removeClassificationNode**）, property-panel（minor防止）, json-codec（declaredCategories往復）, sample-data | classification-tree（派生4規則/空枝除外/検証/縦LOD閾値/box clamp）, **classification-editing（NoneN命名/track・detail入れ子/削除reclassify・undo/宣言空表示・item派生空非表示/major必須不変条件/JSON往復）**, section-organizer, section-dependency-commands, left-pane-interaction（**+/↓/✕ 配線・NoneN連番**）, e2e:section-reorder, e2e:classification-tree, **e2e:section-editing（+でNone1可視/↓でtrack追加/✕削除/None2連番/宣言空可視）** |
| 16 dependencies | DEP | STK-L0-010 | C-004,013,022 | dependency-router, svg-renderer | dependency-router (81アンカー対+H-01回帰), section-dependency-commands |
| 17 cursors-comments | CURS | STK-L0-012 | C-005,007,016 | annotation（**anchorItemId/anchorPoint 追加**）, comment-layout（**アンカー解決・引出し線再配線**）, cursor-span, svg-renderer（**item追従アンカー/引出し線最近縁**）, editing-controller（**CommentMoveGesture=吹き出しドラッグ**）, annotation-commands, main（**選択item1個→item束縛コメント**） | cursor-span, annotation-commands, **comment-layout, e2e:watermark-comments-batch** |
| 18 plan-actual | PLAN | STK-L0-011 | C-003,014 | progress-line-builder | progress-line-builder |
| 19 tools-watermark | TOOL | STK-L0-008/013/019/021/022 | C-006,007,019,027,028,030,031 | watermark-builder（**既定オン resolveWatermark/薄さ0.06/UTC ISO8601 formatWatermarkTimestampUtc**）, schedule-model（**Watermark.hideHash, DEFAULT_WATERMARK_TEXT="GoodRelax", 既定hash**）, watermark-password（**SHA-256 hide gate**）, schedule-store, item-clipboard, keyboard-shortcuts, tool-palette, main（**既定オン・非表示パスワード要求・ハッシュのみ保存**） | command-history, watermark-builder, **watermark-password, e2e:watermark-comments-batch**, font-scale |
| 20 io-interop | IO | STK-L0-014/015 | C-017,018,024,025,026 | json-codec（**projectId往復・id移行 assignMissingIds 配線・projectId検証**）, id-migration（**欠落id決定的補完: 決定的UUID/短id, 既存id温存**）, id-generator（**adapter id seam: crypto.randomUUID/8字短id衝突再試行**）, document-schema（**JSON Schema SSOTをTSへ単一取込, main で grScheduler グローバル公開=単一HTMLへインライン**）, mspdi-codec（sidecar経由projectId往復）, svg-exporter, file-io, autosave, sample-data（**projectId付与**）, main（**境界で新規projectId採番**）, editing-controller/item-clipboard（**新規/貼付itemに短一意id**） | json-codec, id-generation（**短id形式/大量無衝突/衝突再試行/決定的移行/import補完/id往復/依存・分類参照維持**）, document-schema-conformance（**直列化サンプルのSchema適合・逸脱検知**）, mspdi-codec, svg-exporter, pipeline-integration |
| 25 nfr-a11y | NFR | STK-L0-015/016/017/018/020 | C-028,029,030,032,033,035 | a11y-tokens, contrast, accessible-name, keyboard-commands, a11y-stylesheet | contrast, accessible-name, a11y-encoding, keyboard-commands, e2e:a11y |

## 特記トレース（★/★★ とモックFB）

| 由来 | 要求 | 実装/テスト |
|---|---|---|
| ★item12 移動⇔プロパティ双方向同期 | ALIGN-L1-003/L2-002 | bidirectional-sync.test |
| 一意ID: project=UUID(v4, crypto.randomUUID)／section・item=8字[A-Za-z0-9]短一意id（生成時・衝突再試行）、import時は欠落idを決定的補完（既存id・依存/分類参照は温存） | IO-L1-001, DATA-JSON-001 | id-generator（adapter id seam）, id-migration（pure 決定的補完）, json-codec（配線/検証）, sample-data/main（境界でprojectId採番）, editing-controller/item-clipboard（短id）; id-generation.test |
| データ契約 SSOT: docs/api/gr-scheduler.schema.json（JSON Schema draft 2020-12＝直列化ドキュメントの単一真実源）、document-schema.ts が単一取込（複製なし）、vite build で単一HTMLへインライン、grScheduler グローバル公開 | DATA-JSON-001..013 | docs/api/gr-scheduler.schema.json, document-schema.ts, main（公開）, 40-data-format.sdoc（SSOT参照）; document-schema-conformance.test（適合＋逸脱検知） |
| ★item36-39 セクション化/順序/表示切替/小タブ | SECT-L1-002〜005 | section-organizer, e2e:section-reorder（F-01でUI配線） |
| ★item46 異方性ズーム | ZOOM-L1-003 | lod-selector/viewport, time-coordinate-mapper |
| ★★item6/6.1-6.3 情報密度/ヘッダー最小/フローティング/フォント | STK-L0-021/022, TOOL-L1-001/002/006 | font-scale, tool-palette, main（フローティング・コマンドパレット＋最小ヘッダー＋全画面キャンバス）, e2e:layout-mock-conformance（回帰ガード） |
| モックFB: 依存線9点終端/最小矢頭/自動配線 | DEP-L1-002/003/004 | dependency-router（H-01回帰含む） |
| モックFB: 基準/差分カーソル・日数上部 | CURS-L1-002 | cursor-span |
| モックFB: 丸角ズーム非依存 | CURS-L2-001 | cursor-span（zoom不変性テスト） |
| モックFB: 左ペイン可変+インデント | CANVAS-L2-001, SECT-L2-001 | left-pane, left-pane-interaction |
| 分類ツリー派生: 大=Section/中=Track/小=detail、item.category から派生 | SECT-L1/L2 | classification-tree（rebuildClassification）, schedule-store（normalizer）, classification-tree.test |
| 分類ツリー: 縦ズームLOD折畳（小→中→大, majorは常時保持） | SECT-L2, ZOOM-L1-003 | classification-tree（collapseRows/閾値）, svg-renderer, left-pane, e2e:classification-tree |
| 分類ツリー: middle空+minor設定は禁止/major必須（import拒否・編集防止） | SECT-L2 | classification-tree（validation）, json-codec（import拒否）, property-panel（minor無効化）, classification-tree.test, e2e:classification-tree |
| 分類ツリー: 丸角ボックスは単一セクション内にclamp | CURS-L1-007 | classification-tree（clampRowIndexToSection）, editing-controller, main（作成clamp）, classification-tree.test, e2e:classification-tree |
| 分類編集: 左ペインで section/track/detail を追加(+/↓)・削除(✕)、既定名 NoneN（親スコープ一意）| SECT-L1/L2（編集リワーク） | schedule-model（DeclaredCategory/declaredCategories）, classification-tree（宣言ノード合流=派生∪宣言, 空宣言は表示/item派生空は非表示, nextDefaultCategoryName, appendDeclaredCategory, removeDeclaredSubtree）, commands（addSectionCommand/addSubcategoryCommand/removeClassificationNodeCommand=削除時itemを親レベルへ再分類, majorは兄弟へ吸収, 最後のmajor削除は拒否）, left-pane（Add sectionツールバー＋ヘッダ/track/detailの追加削除ボタン, aria-label）, editing-controller（宣言空行にitem作成でカテゴリ採用）, json-codec（declaredCategories検証/往復）; テスト: classification-editing.test, left-pane-interaction.test, e2e:section-editing |
| 操作堅牢化: コマンドパレット可動/プロパティ表示切替 | TOOL-L1-001/006, STK-L0-021 | draggable, main, property-panel（setHidden）, e2e:interaction-hardening |
| 操作堅牢化: タスク端リサイズ命中領域/選択・上位バー優先 | ITEM-L1-004 | edge-hit（edgeRegionAt/pickItemHit）, svg-renderer, editing-controller, edge-hit.test, e2e:interaction-hardening |
| 操作堅牢化: 丸角枠リサイズ/注釈選択・Delete（取消可） | CURS-L1-007, TOOL-L1-004 | annotation-commands（resizeRoundedBoxCommand）, editing-controller, keyboard-shortcuts, svg-renderer, annotation-commands.test, e2e:interaction-hardening |
| 操作堅牢化: 固定日付ルーラー（年/月/日+曜, 縦スク固定） | item25/26/50 | date-ruler（buildDateRuler）, svg-renderer, date-ruler.test, e2e:interaction-hardening |
| 操作堅牢化: 既定カーソル=矢印/文脈カーソル | TOOL-L1-001 | svg-renderer（grab撤去）, editing-controller（col-resize/crosshair）, e2e:interaction-hardening |
| UI/操作FB: Fitに左余白（最左マーカー/ラベルを非クリップ, scrollX>=0固定を撤去し暦2000規制内の負scroll許容） | STK-L0-021, item7 | viewport（computeFitViewForItems: scrollX=contentLeftPx-margin）, svg-renderer, ui-feedback-batch.test, e2e:ui-feedback-batch |
| UI/操作FB: アイテム枠は実線・既定無し（選択枠は別ノードで保持） | ITEM-L1, item20 | svg-renderer（resolveStrokeAttribute=none既定・dash撤去）, cud-palette（DEFAULT_STROKE_COLOR=transparent）, sample-data, ui-feedback-batch.test, e2e:ui-feedback-batch |
| UI/操作FB: 空領域ドラッグでラバーバンド複数選択（Shift加算, arm時は作成維持, Ctrl+dragパン維持） | ITEM-L1, TOOL-L1 | editing-controller（MarqueeGesture）, svg-renderer（showMarquee/itemsIntersectingWorldRect）, e2e:ui-feedback-batch |
| UI/操作FB: Ctrl+A 全選択（入力欄では無効） | TOOL-L1-005 | keyboard-shortcuts（selectAll）, e2e:ui-feedback-batch |
| UI/操作FB: プロパティで塗り色変更（予実色を明示上書き, 複数選択適用, 取消可） | PROP-L1-002 | schedule-model（fillColorExplicit）, plan-actual-colors（displayFillColor override）, property-panel（setSelectedItemIds/multi-dispatch）, commands, ui-feedback-batch.test, e2e:ui-feedback-batch |
| UI/操作FB: ESCでプロパティパネルを閉じる（進行中ジェスチャ取消を優先） | TOOL-L1-001 | main（window ESC）, editing-controller（isGestureInProgress/cancelActiveGesture）, e2e:ui-feedback-batch |
| UI/操作FB: 同一分類の時間重複で最大64レーン積層（行高/セクション枠/グリッド/命中/Fit追従） | ARCH-C-011, item7 | layout-engine（layoutRows/RowGeometry/rowBandUnitHeight/rowIndexAtWorldY, MAX_STACK_LANES=64）, svg-renderer（可変行geometry）, editing-controller（renderer.rowIndexAtWorldY）, left-pane, svg-exporter, cursor-span/progress-line-builder（可変resolver）, ui-feedback-batch.test, e2e:ui-feedback-batch |
| UI/操作FB: 積層バーは90%高で境界可視化（0.95→0.90に拡大, 枠付きでも重なって見えない） | ITEM-L1, item7 | layout-engine（STACKED_BAR_HEIGHT_RATIO=0.90）, ui-feedback-batch.test, canvas-objects-batch.test, e2e:ui-feedback-batch, e2e:canvas-objects-batch |
| Canvas-objectsFB: 依存線を選択可能・色編集可・既定=山吹金#F8B500（クリック選択→data-selected, Delete削除, プロパティで色変更, 矢頭はcontext-stroke追従, 往復/色検証） | DEP-L1-001, PROP-L1-002 | schedule-model（Dependency.strokeColor/DEFAULT_DEPENDENCY_LINE_COLOR）, svg-renderer（drawDependency色/選択ハイライト, hitTestDependency=距離判定, setSelectedDependency）, editing-controller（selectDependency/deleteSelectedDependency/setSelectedDependencyColor, 相互排他選択）, commands（setDependencyColorCommand=取消可）, property-panel（dependency-form/line_color palette）, keyboard-shortcuts（Delete）, json-codec（strokeColor色検証/往復）, main（onDependencySelectionChange）; canvas-objects-batch.test, e2e:canvas-objects-batch |
| Canvas-objectsFB: イナズマ線（進捗線）を削除/再表示可・色編集可・既定=紫#7B2FBF（viewState永続, JSON往復） | PLAN-L1-003, item2 | schedule-model（ViewState.progressLineVisible/progressLineColor/DEFAULT_PROGRESS_LINE_COLOR）, svg-renderer（renderIlluminatedLine: visible=false非描画/色適用/data-role=progress-line）, property-panel（attachProgressLineControls: 常設トグル+色, パネル最下部）, main（renderer.setViewState配線）, i18n（progress_line/progress_line_color en/ja）, json-codec（viewState往復）; canvas-objects-batch.test, e2e:canvas-objects-batch |
| Canvas-objectsFB: icon_shape_kind プロパティ（統一図形種）＋タスクarrow/chevron/新span（*--*）作成・描画・切替 | PROP-L1-002/004, ITEM-L1 | schedule-model（IconShapeKind/TaskShape+span/MILESTONE_SHAPE_KINDS/TASK_SHAPE_KINDS, ScheduleItem.iconShapeKind）, task-glyph（effectiveTaskShape/effectiveMilestoneShape/taskGlyphPath arrow/chevron/span/iconShapeKindForCreate）, svg-renderer（ensureTaskGlyphElement path対応/patchItemNode形状描画/data-task-shape）, editing-controller（作成時iconShapeKind設定）, tool-palette（Task spanボタン）, property-panel（icon_shape_kind select 家系別再構築）, commands（ItemPropertyPatch.iconShapeKind/taskShape/milestoneShape）, i18n, json-codec（未知キー往復）; canvas-objects-batch.test, e2e:canvas-objects-batch |
| タスク図形描画バッチ: タスク略称=バー高90%（下限クランプ）・既定中央寄せ／arrow=線矢印（下部・略称は上）／span=*---*両端●（下部・略称は上）／chevron矢羽根フェード（左concave=fade-in・右point=fade-out・作成時14/14日既定・矩形同様の角ハンドルでドラッグ調整=取消可） | ITEM-L1, PROP-L1-002, item60 | task-glyph（taskGlyphPaintMode/taskGlyphPath 線矢印+開矢頭・span連結線+塗り●・chevron fade extent, TaskGlyphOptions, TASK_CONNECTOR_LINE/LABEL_Y_FRACTION, defaultFadeDaysForTaskShape=chevron 14/14）, item-geometry（taskAbbrevFontSize=0.9×高/TASK_LINE_ARROW_STROKE_PX=3, chevronFadeExtentsPx, labelAnchorPoint auto=タスク中央/arrow・spanは線上・milestoneは側方）, item-layer（paintMode line/line-with-dots/fill・data-connector-line-y/data-span-terminals/data-fade-in・out-days・タスクfont-size=0.9×高）, editing-controller（taskCreateFadeFields=chevron作成時14/14, 既存の矩形フェード角ハンドル/hit-tester/buildFadeCommandを全タスク共用）; task-shape-rendering.test, render-layers.test, e2e:task-shape-rendering |
| UI/操作FB: ガイドカーソル4排他モード（none/十字/縦1/縦2, viewState永続, i18n en/ja, ポインタ追従） | CURS-L1-003, item9-12 | schedule-model（CursorGuideMode/cursorGuideMode）, svg-renderer（renderCursorGuide/pointerClient追従）, main（radiogroup, 旧dual-cursorトグル置換）, i18n, json-codec（往復）, ui-feedback-batch.test, e2e:ui-feedback-batch |
| 分類ペイン再編1: 中/小分類も▲▼で兄弟内並替（canvas行順追従, 取消可） | SECT-L1/L2 | schedule-model（ClassificationNodeState.sortIndex）, classification-tree（rebuildClassification=兄弟をsortIndex順に materialize, orderedMiddlesUnderMajor/orderedMinorsUnderMiddle, reorderCategoryNodeStates=密再採番）, commands（reorderCategoryNodeCommand）, left-pane（buildCategoryMoveButton=境界disable/フォーカス復帰）, json-codec（classificationNodeStates検証/往復）; classification-pane-restructure.test, e2e:classification-pane-restructure |
| 分類ペイン再編2: 各ノード個別hide(−)＋親show-all(□), hidden行はcanvas/ペインから除外, JSON往復（取消可・文書永続） | SECT-L1-003/004 | schedule-model（ClassificationNodeState.hidden）, classification-tree（rebuildClassification=hidden subtree除外/空セクションはplaceholder存置, setCategoryNodeHidden, revealDescendants）, commands（setCategoryNodeHiddenCommand/revealDescendantsCommand=majorはSection.collapsedも解除）, left-pane（buildHideButton/buildShowAllButton）; classification-pane-restructure.test, e2e:classification-pane-restructure |
| 分類ペイン再編3: 大/中/小のコピー&ペースト（subtree+item複製, 非衝突名" (n)", 兄弟直後, 取消可, Ctrl+C/V＋右クリックメニュー, 入力欄では無効） | TOOL-L1-003, SECT-L1 | classification-tree（duplicateCategorySubtree/nextCopyName/insertSectionAfterMajor/insertSiblingAfter）, commands（duplicateCategorySubtreeCommand）, left-pane（handlePaneKeydown=Ctrl+C/V＋stopPropagation, openContextMenu Copy/Paste, node選択）; classification-pane-restructure.test, e2e:classification-pane-restructure |
| 分類ペイン再編4: 中分類=上寄せ/小分類=中央寄せでラベル衝突解消（y差） | SECT-L2-001, item6 | left-pane（track-label alignItems=flex-start / detail-label alignItems=center）; classification-pane-restructure.test, e2e:classification-pane-restructure（node-name実y比較） |
| 分類ペイン再編5: 各ノード統一アイコン列 [name] ▲ ▼ □ + - X（旧↓→+へ改名, 大/中のみ□+, 小は▲▼-X, 実focusable button＋aria-label, M5c a11y維持） | SECT-L1, item6 | left-pane（appendNodeControls/buildNameSpan=name先頭/buildMoveButton/buildShowAllButton/buildAddSubButton/buildHideButton/buildDeleteButton, data-role category-move-up/down・show-all・add-subcategory・hide-node・remove-section/track/detail）; classification-pane-restructure.test, e2e:classification-pane-restructure |
| 分類ペイン再編6: 削除確認モーダル（"Delete this section/category?", Delete/Cancel＝D/C頭文字bold, D確定/C・Esc取消/Enter確定, role=dialog aria-modal, focus trap, 既定Cancel, 閉じたらトリガへ復帰, 確定時のみ削除=取消可） | TOOL-L1-004, item6 | left-pane（openDeleteDialog/buildDialogButton/closeDeleteDialog）, commands（removeClassificationNodeCommand）; classification-pane-restructure.test, e2e:classification-pane-restructure |
| SHELL/BRANDING/THEME1: ヘッダー3ゾーン（左=ブランディング＋ファイル操作群＋テーマ選択、中央=タイトル、右=Undo/Redo/[AI]/[?]）, 使用ヒントはヘルプモーダルへ移設。**HEADER-Gでブランディングを2行化: 1行目"GR Scheduler"大きめ, 2行目 "(c) GoodRelax. Apache License 2.0" をGitHubリポジトリへのハイパーリンク(target=_blank rel=noopener noreferrer)** | STK-L0-021/022, TOOL-L1-001 | main（buildChrome=grid 3ゾーン, headerLeft=branding+file-ops+theme, app-branding/app-repo-link/schedule-name/open-help）; e2e:shell-theme-batch（ゾーン順序・重心・repo link）, e2e:header-shell-batch（2行ブランディング/大きめ名/repo href） |
| SHELL/BRANDING/THEME2: ヘルプモーダル（全機能+実在ショートカットを1画面, role=dialog aria-modal, focus trap, Esc閉/フォーカス復帰）。**HEADER-Gで3段組・幅85vw化（高さは据え置き, 見切れ解消）** | STK-L0-016, TOOL-L1-005 | help-modal（buildHelpModel純データ/HelpModal focus trap/column-count 3/width 85vw）, main（[?]配線）, i18n（help）; help-modal.test, e2e:shell-theme-batch, e2e:header-shell-batch（幅≈85%/3段組） |
| SHELL/BRANDING/THEME3: **4テーマモード（Light/Dark/Mono-Light/Mono-Dark）** ヘッダー左セグメント選択。CSSカスタムプロパティtheme層で全UI+キャンバス配色, mono=輝度グレースケール palette＋キャンバスに filter:grayscale(1)（予実/依存/進捗の識別をグレーへ縮退, B/W取込用）, prefers-color-scheme尊重初期値, viewState/localStorage永続, axe AA全モードPASS | STK-L0-016, NFR-L1-003 | theme（installThemeStylesheet=light/dark/mono-light/mono-dark＋grayscale filter, applyThemePreference/resolveThemeMode/isMonochromeMode/isDarkBaseMode/toGrayscaleColor/THEME_MODES/localStorage）, svg-renderer（canvas-bg var）, main（4ボタンwireTheme配線）, schedule-model（ViewState.themePreference=4mode+system）, docs/api schema（themePreference enum拡張）, json-codec（往復）; theme.test（mono resolve/apply/grayscale/stylesheet/往復）, e2e:shell-theme-batch, e2e:header-shell-batch（4モード属性・算出bg・mono grayscale・reload永続・mono axe AA） |
| SHELL/BRANDING/THEME4: ESCの解放（進行中ジェスチャ/モーダル/プロパティパネル開の時のみpreventDefault, それ以外はブラウザへ伝播=F11全画面解除可） | TOOL-L1-001, item6 | main（window ESC=helpModal/gesture/panel判定）, keyboard-navigation（cancelはgesture/arm時のみpreventDefault）; e2e:shell-theme-batch（panel開=handled/idle=非prevent） |
| SHELL/BRANDING/THEME5: プロパティパネルは英語固定（progress-lineラベルもlocale非依存英語） | PROP-L1-004 | main（attachProgressLineControls label=en固定）, property-panel（英語フィールドキー）; e2e:shell-theme-batch（英語プロパティ名） |
| HEADER-G1: ヘッダー左上ファイル操作群（Screen Copy→クリップボードPNG/JSON/SVG/PNG/XML/File Import/All Clear, 各focusable button＋英語aria-label, 既存export/import流用, Screen Copy/PNGは自己完結SVGをラスタライズ, clipboard画像不可時はDL fallback） | IO-L1-003/004, TOOL-L1-001 | main（buildChrome file-ops群/wireInputOutput buildExportSvg共用/screen-copy・export-png・import・all-clear配線）, screen-capture（rasterizeSvgToPng/copyPngToClipboardOrDownload/downloadPngBlob/clipboardSupportsImages/readSvgPixelSize/stripXmlIncompatibleChars=XML不正C0制御除去）, svg-exporter, file-io; screen-capture.test, e2e:header-shell-batch（7ボタン/PNG DL/Screen Copy画像clipboard） |
| HEADER-G2: All Clear確認ダイアログ（role=dialog aria-modal, focus trap, All Clear/Cancel＝A/C頭文字bold, A確定/C・Esc取消, 既定Cancel, 閉→トリガ復帰, 空文書へハードリセット=replaceDocumentで履歴クリア） | TOOL-L1-004, item6 | all-clear-dialog（openAllClearDialog/buildDialogButton）, sample-data（generateEmptyDocument=正規化済み空文書）, main（all-clear配線/generateProjectId）; empty-document.test, e2e:header-shell-batch（ダイアログ表示/C・Esc維持/A空化/bold/既定Cancel/復帰） |
| HEADER-G4: Undo/Redoをヘッダー右へ移設（PowerPoint風 循環矢印 ↶/↷, aria-label Undo/Redo, store.undo/redo配線, 履歴でdisabled同期, パレットからは撤去） | TOOL-L1-001, ADR-002 | main（undo/redo header button/syncHistoryButtons/wireStoreSubscriptions）, tool-palette（Undo/Redo群撤去・updateHistoryState削除）; e2e:header-shell-batch（ヘッダー↶↷/undo・redo動作）, e2e:ui-fixes（パレット非在） |
| HEADER-G5: [AI]ボタン（[?]左）＝コピー用英語プロンプト＋JSON Schema(document-schema SSOT)モーダル（Esc閉/focus trap/role=dialog, Copyで prompt+schema をクリップボードへ, ツールにAI推論は無し, 取得JSONはFile Importで取込） | STK-L0-014, IO-L1-001 | ai-export-modal（AiExportModal/buildAiPromptText/schemaJsonText/buildAiClipboardPayload）, document-schema（SSOT再輸出, grScheduler global）, main（open-ai配線/Esc処理）; ai-export-modal.test（schema一致/ONLY JSON/ASCII/payload合成）, e2e:header-shell-batch（[?]左/schema一致/Copy書込/Esc閉） |
| HEADER-G8: パレット整理（LANGセレクタ撤去=英語専用/透かしユーザー名入力撤去=既定名使用/依存リンクモードトグルでパレット非リフロー=link-hintをabsolute予約領域化） | TOOL-L1-001, PROP-L1-003 | main（buildChrome=Lang群/user-name input撤去, linkHint position:absolute visibility切替, wireToolbarLocalization/wireWatermark整理, wireLanguage削除）, tool-palette; e2e:header-shell-batch（LANG非在/user-name非在/link切替で座標不変）, e2e:shell-theme-batch（英語専用） |
| WM/COMMENT/SEL1: 透かし既定オン・薄さ0.06・既定文字列"GoodRelax"・UTC ISO8601日時（分精度末尾Z） | TOOL-L1-007, TOOL-L2-001/002/004 | watermark-builder（resolveWatermark=absent→enabled default, LAYER_OPACITY=0.06, formatWatermarkTimestampUtc）, schedule-model（DEFAULT_WATERMARK_TEXT）, svg-renderer（renderWatermark=resolve使用）, main（既定オン・UTC timestamp・export materialize）; watermark-builder.test, e2e:watermark-comments-batch |
| WM/COMMENT/SEL2: 透かし非表示にパスワード要求（SHA-256ハッシュ比較, 生パスワード非保存, 既定=watermark-unlock, StrictDoc記録） | TOOL-L2-003/005（security-design §6） | watermark-password（sha256Hex/matchesWatermarkHidePassword, crypto.subtle）, schedule-model（Watermark.hideHash/DEFAULT_WATERMARK_HIDE_PASSWORD_HASH）, main（誤→表示維持/正→非表示, ハッシュのみ）, json-codec（viewState往復）, docs/spec/19-tools-watermark.sdoc（既定パスワード記録）; watermark-password.test, e2e:watermark-comments-batch（誤/正/JSONハッシュのみ） |
| WM/COMMENT/SEL3: コメント位置モデル（アンカー=item束縛{itemId,anchorPoint}or自由ワールド点＋bubbleOffset, 引出し線=最近縁→アンカー再配線, item移動追従, JSON往復） | CURS-L1-005/006, CURS-L2-002 | annotation（anchorItemId/anchorPoint）, comment-layout（resolveItemAnchorPoint/nearestPointOnRect/commentLeaderEndpoints）, svg-renderer（commentAnchorScreenPoint=item placement追従/drawComment最近縁leader/data-role comment-bubble・comment-leader）, editing-controller（CommentMoveGesture=bubbleドラッグ→moveCommentCommand取消可）, main（選択item1個→item束縛）, annotation-commands（moveCommentCommand）; comment-layout.test, annotation-commands.test, e2e:watermark-comments-batch |
| WM/COMMENT/SEL4: マーキー/通常選択で透かし・ラベルTEXTを選択させない（SVGルートuser-select:none, 入力欄は編集可維持） | ITEM-L1, TOOL-L1 | svg-renderer（this.svg.style.userSelect=none/-webkit-user-select）; e2e:watermark-comments-batch（getSelection()空・item選択・input選択可） |

## 非機能・横断の検証

| 観点 | 要求/決定 | 検証 |
|---|---|---|
| 性能 | NFR-L1-002, RISK-001, DEC-001/ADR-009 | 性能PoC（162.3fps/4.6ms/p95 6.20ms, ユーザー立会い 2026-07-18） |
| セキュリティ | IO-L1-006, ITEM-L2-001, CSP | M5a敵対レビュー PASS, import-sanitizer/color-validator/sanitizer-invariant テスト, npm audit 0 |
| アクセシビリティ | STK-L0-016, NFR-L1-003..006 | axe e2e PASS(serious/critical 0), contrast/accessible-name/keyboard-commands, `docs/dev/a11y-wcag21-aa-checklist.md` |
| 単一HTML | STK-L0-015, NFR-L1-001, ADR-003 | ビルド検証（外部参照0・CSP sha256一致） |

## リファクタリング記録（保守性・挙動不変）

| 指摘 | 内容 | 実装（分割後の src マッピング） | 検証 |
|---|---|---|---|
| H-1（R3/R4） | `svg-renderer.ts`（god-object 2935行/60超メソッド）を feature seam で分割。`SvgRenderer` はオーケストレータ/ファサードに縮小（SVGルート・group所有・diffRenderライフサイクル・viewState・公開API・座標変換のみ保持）。**公開API / `data-role`・`data-*` 属性 / DOM構造・順序は不変（バイト等価）** | `render-context.ts`（RenderContext/SVG_NS/RULER_TIER_HEIGHT_PX）, `dependency-geometry.ts`, `item-geometry.ts`, `comment-geometry.ts`, `hit-tester.ts`（4系統: item→fade/edge/body/label, annotation, dependency, 優先順不変）, `layers/{grid,classification,ghost,ruler,watermark,progress-today,cursor-guide,rounded-box,comment,dependency,item}-layer.ts` | 既存 427 単体 + 82 Playwright 全緑, `render-layers.test.ts`（+19）で各レイヤ/hit-testerを疑似SVG-DOM単体検証, dev実機で19アイテム位置・色（依存#F8B500/今日#1E90FF/進捗#7B2FBF/透かし0.06 GoodRelax）不変を確認, CSP sha256再生成 |
| M-4（R6） | 最大・最多変更ファイルの単体テスト0件（E2E依存のみ）＝「単体緑だが実機で壊れる」の構造要因を解消。分割レイヤ/hit-testerに jsdom相当（package.json凍結のため既存 left-pane 流の実DOMシム）単体テストを追加 | `tests/render-layers.test.ts`, `tests/helpers/fake-svg-dom.ts`, `tests/helpers/make-render-context.ts` | diffRender冪等性・ノード生成/除去カウント・hit-test優先順（item/label/dependency/empty/fade）を assert |

## CR-001 (予実: 実績日フィールド方式) 改訂トレース — 仕様先行・実装後追い

CR-001（承認 2026-07-19、`change-request-001-20260719-230349.md`）の Part A/B/C を仕様先行で
`.sdoc` へ反映済み。段階化方針（CR §8）に従い `docs/api/gr-scheduler.schema.json` と `src/**` /
`tests/**` は本フェーズで未変更（実績日フィールド方式の実装は別セッションで schema.json + コードを
同時変更し `tests/document-schema-conformance.test.ts` の緑を保つ）。実装状態は **pending（次セッ
ション）**。DEC-003 参照。

| 改訂要求/契約 | 文書 | 内容（実績日フィールド方式） | 実装状態 |
|---|---|---|---|
| PLAN-L1-001 | 18-plan-actual | 実績を同一アイテムの actualStart/actualEnd で保持、planActualKind/planGroupId 廃止 | pending（次セッション） |
| PLAN-L1-002 | 18-plan-actual | planActualDisplay（可視フィルタ）を planActualStyle と独立に明確化 | done (IM2)：`filterByPlanActualDisplay` を actual-date モデルで復元（actual-only=actualStart 有のみ）、skip 復元 |
| PLAN-L1-005（新規） | 18-plan-actual | 予実描画スタイル viewState.planActualStyle=overlap（既定）/separate | done (IM2)：`plan-actual-geometry.ts` 2モード幾何＋item-layer 配線（配色は IM3） |
| PLAN-L2-001 | 18-plan-actual | イナズマ線 front 統一規則（実績日あり/なし/未着手の3分岐） | done (IM2)：`computeProgressFrontDate` 4ケース＋マイルストーン点特例、progress-today-layer 配線 |
| DEP-L1-005（新規） | 16-dependencies | 依存 linkType（FS/SS/FF/SF、既定FS）、MSPDI Type と往復 | done (IM2)：mspdi-codec Type 往復（FF=0/FS=1/SF=2/SS=3） |
| DEP-L1-006（新規） | 16-dependencies | 依存 符号付き lagDays（正=ラグ/負=リード）、MSPDI LinkLag と往復（暦日近似） | done (IM2)：mspdi-codec LinkLag/LagFormat=8（1日=14400） |
| ITEM-L1-011（新規） | 11-items-icons | 期限マーカー item.targetDate、MSPDI Deadline と往復 | done (IM2)：mspdi-codec Deadline 往復＋property-panel target_date 編集 |
| DATA-JSON-006 | 40-data-format | actualStart/actualEnd/progressRatio/previousPlan（実績日フィールド方式。previousPlan は CR-002 Part 3 により別ファイル参照方式へ supersede、下表参照） | done (IM1/IM2)：モデル＋property-panel 予実日付編集 |
| DATA-JSON-008 | 40-data-format | dependency に linkType/lagDays 追加 | done (IM1) |
| DATA-JSON-011 | 40-data-format | viewState に planActualStyle 追加 | done (IM1/IM2) |
| DATA-JSON-015（新規） | 40-data-format | item.targetDate 期限マーカー | done (IM1/IM2) |
| DATA-MSPDI-003 | 40-data-format | ActualStart/Finish・Baseline・PercentComplete 往復（B-4。Baseline 部分は CR-002 Part 3 により id 突合の best-effort 往復へ改訂） | done (IM2)：ActualStart/Finish/PercentComplete 往復（Baseline は IM3・previousPlan 不出力） |
| DATA-MSPDI-004 | 40-data-format | PredecessorLink Type / LinkLag（linkType/lagDays） | done (IM2) |
| DATA-MSPDI-007（新規） | 40-data-format | Resource/Assignment（assignee, B-2）、PercentComplete（progressRatio, B-3） | done (IM2) |
| DATA-MSPDI-008（新規） | 40-data-format | Splits/SplitPart→マルチバー（B-5）、description→Task/Notes（B-6） | done (IM2) |
| DATA-MSPDI-009（新規） | 40-data-format | Deadline↔targetDate、Constraint は見送り | done (IM2) |
| 実装差分（§5） | 40-data-format | schema.json/model/codec の具体差分を実装セッション向けに明記 | pending |

## CR-002 (予実配色・マイルストーン描画・ベースライン別ファイル参照) 改訂トレース — 仕様先行・実装後追い

CR-002（承認 2026-07-20、`change-request-002-20260720-054132.md`）の Part 1〜3 を仕様先行で
`.sdoc` へ反映済み。CR-001 Part A の previousPlan 据え置きおよび Part B-4 の MSPDI Baseline clean
往復を supersede する。段階化方針（CR-002 §8）に従い `docs/api/gr-scheduler.schema.json` /
`docs/api/gr-scheduler.schema.next.json` と `src/**` / `tests/**` は本フェーズで未変更。実装状態は
**pending（実装セッション）**。DEC-003（CR-001 承認）参照。

| 改訂要求/契約 | 文書 | 内容 | 実装状態 |
|---|---|---|---|
| PLAN-L1-004 | 18-plan-actual | 変更前予定（ベースライン）を別ファイル参照方式へ改訂（`previousPlan` フィールド廃止、id 突合、薄グレー・編集不可アンダーレイ、対象行と同高さ描画） | pending（実装セッション） |
| PLAN-L1-005 | 18-plan-actual | Overlap 塗り分けを彩度導出（淡=予定/濃=実績）＋線幅（予定細/実績太、破線不採用）で明確化 | pending |
| PLAN-L2-001 | 18-plan-actual | マイルストーンの front 特例を追加（区間なし=点。実績あれば actualStart、無ければ startDate。補間しない） | done (IM2)：`computeProgressFrontDate` の milestone 特例で実装（2マーカー描画は IM3） |
| 40-data-format | 40-data-format | `previousPlan` DATAFIELD（DATA-JSON-006 の一部）廃止、ベースライン参照文書の概念を追加、DATA-MSPDI-003 の Baseline マッピングを best-effort id 突合へ改訂、配色（彩度/線幅）を presentation ノートとして追記 | pending |
| スキーマ | `docs/api/gr-scheduler.schema.next.json` | `previousPlan` を除去（実装フェーズで現行 `gr-scheduler.schema.json` へスワップ） | pending |

## CR-003 (ヘッダー再編・ラベル位置・依存線自動配線) 改訂トレース — 仕様先行・実装後追い

CR-003（承認 2026-07-20、`change-request-003-20260720-063933.md`）の Part 1〜3 を仕様先行で
`.sdoc` へ反映済み。CR-002 のベースライン可視トグル（Base V/I）のヘッダー配置を確定する。段階化
方針（CR-003 §8）に従い `docs/api/gr-scheduler.schema.next.json` と `src/**` / `tests/**` は本
フェーズで未変更。実装状態は **pending（実装セッション）**。

| 改訂要求/契約 | 文書 | 内容 | 実装状態 |
|---|---|---|---|
| TOOL-L1-008（新規） | 19-tools-watermark | ヘッダーのボタン配置順序（`GR Scheduler +(c)` → タイトル → SS → Load → Save → Light → Dark → Mono L → Mono D → Base V → Base I → Undo → Redo → AI → ?）と各ボタンの意味（機能実体）を規定する新規要求 | pending（実装セッション） |
| ITEM-L2-002（新規） | 11-items-icons | タスクラベルの既定表示位置 `labelPosition=inner-left`（バー内左揃え。バー外左の既存 `left` とは峻別） | pending |
| ITEM-L2-003（新規） | 11-items-icons | マイルストーンラベルの表示位置（アイコン右 `icon-right`） | pending |
| ALIGN-L2-003（新規） | 13-layout-alignment | ラベルはみ出しが同一セクション内の他タスクと視覚的に重なる場合の縦オフセット衝突回避（ALIGN-L1-001 の上下左右揃え意図を可能な範囲で維持） | pending |
| DEP-L1-003（改訂・全面書換） | 16-dependencies | 依存線を決定的な直交経路で自動配線（右出=先行右辺middle_right/左入=後続左辺middle_left、横スタブ=矢じり先端の2倍、後続下=出直後に下折れ、後続上=後続直前で上折れ、水平重なり時は行間ギャップを通過し両バー非跨ぎ、前進依存が主対象） | pending |
| DEP-L1-002（改訂・注記追加） | 16-dependencies | 9 点アンカー座標定義は保持しつつ、当面は手動選択を用いず DEP-L1-003 の決定的規則（始点middle_right/終点middle_left）で配線する旨を追記 | pending |
| DEP-L2-001（改訂・specialize） | 16-dependencies | 障害物回避直交配線エンジンの始点/終点アンカーを middle_right/middle_left に固定し DEP-L1-003 の決定的規則に従って経路生成 | pending |
| DEP-L2-002（改訂・整合明記） | 16-dependencies | 折れ点数0〜3の制約が DEP-L1-003 の決定的経路と整合する旨を明記 | pending |
| 親 UID（参考・本文不変、子要求追加） | 19-tools-watermark, 11-items-icons, 13-layout-alignment | TOOL-L1-001/002/004/005、ITEM-L1-009/010、ALIGN-L1-001/ALIGN-L2-001 は STATEMENT 本文は改変されておらず、上記の新規/改訂子要求が追加された（親としての整合注記のみ） | pending |
| スキーマ | `docs/api/gr-scheduler.schema.next.json` | `labelPosition` enum に `inner-left` を追加 | pending |

## 結論

user-order 62項目 → 要求 → 設計 → データ契約 → テスト が一気通貫でトレースされ、**未被覆 0**。
テスト結果は `docs/spec/51-test-results.sdoc`（35 TEST_RESULT 全PASS）、詳細な項目別割当は
`user-order-coverage.md` を参照。
