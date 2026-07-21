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
| DEF-006 Fit垂直クリップ修正（最下段バー非クリップ, ラベル衝突推定器のzoomY依存レーン増をFitへ反映） | STK-L0-021, item7 | viewport（computeFitViewForItems/measureItemsFitExtent に labelExtent注入 + measureRenderedContentBottomPx で zoomY 精緻化ループ）, svg-renderer（fitToContentがestimateInnerLeftLabelExtentPxを注入）, visual-data-batch.test（estimator-aware RENDERED bottom）, e2e:visual-data-batch（RENDERED box of EVERY item） |
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
| WM/COMMENT/SEL1: 透かし既定オン・薄さ0.06・既定文字列"GoodRelax"・UTC ISO8601日時（分精度末尾Z）必須（CR-009 Part2）・UTC再採番は内容変更時のみ＝dispatch/undo/redo（CR-009 Part3/DEC-005 #3, ズーム/スクロール・トグルでは不変, 再帰防止） | TOOL-L1-007, TOOL-L2-001/002/004 | watermark-builder（resolveWatermark=absent→enabled default＋UTC必須, LAYER_OPACITY=0.06, formatWatermarkTimestampUtc）, schedule-model（DEFAULT_WATERMARK_TEXT）, schedule-store（onContentChange=dispatch/undo/redoのみ発火, replaceDocument除外）, svg-renderer（renderWatermark=resolve使用）, main（wireWatermarkTimestamp=seed＋onContentChange再採番/renderer.setViewState外, wireWatermarkはトグルで非採番, export materialize）; watermark-builder.test, command-history.test（content-change signal）, render-layers.test, e2e:watermark-comments-batch |
| WM/COMMENT/SEL2: 透かし非表示にパスワード要求（SHA-256ハッシュ比較, 生パスワード非保存, 既定=GoodRelax=既定透かし文字列（CR-009 Part1）, 旧watermark-unlockは非解錠, StrictDoc記録） | TOOL-L2-003/005（security-design §6） | watermark-password（sha256Hex/matchesWatermarkHidePassword, crypto.subtle）, schedule-model（Watermark.hideHash/DEFAULT_WATERMARK_HIDE_PASSWORD_HASH=380e83…=SHA-256(GoodRelax)）, main（誤→表示維持/正→非表示, ハッシュのみ）, json-codec（viewState往復）, docs/spec/19-tools-watermark.sdoc（既定パスワード記録）; watermark-password.test（constant pin/plaintext hash/旧非解錠/ハッシュのみ）, e2e:watermark-comments-batch（誤/正/JSONハッシュのみ） |
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
| PLAN-L1-005（新規） | 18-plan-actual | 予実描画スタイル viewState.planActualStyle=overlap（既定）/separate | done (IM2/IM3)：`plan-actual-geometry.ts` 2モード幾何＋item-layer 配線（IM2）、配色＝彩度導出（淡/濃）＋線幅冗長符号（IM3） |
| PLAN-L2-001 | 18-plan-actual | イナズマ線 front 統一規則（実績日あり/なし/未着手の3分岐） | done (IM2)：`computeProgressFrontDate` 4ケース＋マイルストーン点特例、progress-today-layer 配線 |
| DEP-L1-005（新規） | 16-dependencies | 依存 linkType（FS/SS/FF/SF、既定FS）、MSPDI Type と往復 | done (IM2)：mspdi-codec Type 往復（FF=0/FS=1/SF=2/SS=3） |
| DEP-L1-006（新規） | 16-dependencies | 依存 符号付き lagDays（正=ラグ/負=リード）、MSPDI LinkLag と往復（暦日近似） | done (IM2)：mspdi-codec LinkLag/LagFormat=8（1日=14400） |
| ITEM-L1-011（新規） | 11-items-icons | 期限マーカー item.targetDate、MSPDI Deadline と往復 | done (IM2)：mspdi-codec Deadline 往復＋property-panel target_date 編集 |
| DATA-JSON-006 | 40-data-format | actualStart/actualEnd/progressRatio/previousPlan（実績日フィールド方式。previousPlan は CR-002 Part 3 により別ファイル参照方式へ supersede、下表参照） | done (IM1/IM2)：モデル＋property-panel 予実日付編集 |
| DATA-JSON-008 | 40-data-format | dependency に linkType/lagDays 追加 | done (IM1) |
| DATA-JSON-011 | 40-data-format | viewState に planActualStyle 追加 | done (IM1/IM2) |
| DATA-JSON-015（新規） | 40-data-format | item.targetDate 期限マーカー | done (IM1/IM2) |
| DATA-MSPDI-003 | 40-data-format | ActualStart/Finish・Baseline・PercentComplete 往復（B-4。Baseline 部分は CR-002 Part 3 により id 突合の best-effort 往復へ改訂） | done (IM2+補完)：ActualStart/Finish/PercentComplete 往復。Baseline は補完セッションで `mspdi-codec.exportMspdi(scheduleDocument, baselineDocument?)` に実装（id 突合・BaselineNumber=0/BaselineStart/BaselineFinish 合成、未突合は非出力）。Import は per-item baseline フィールド不在のため best-effort で drop＋名前空間ロガー debug（`grsch:mspdi`）に記録。呼出しは `main.ts` save-xml が renderer の baselineDocument を渡す |
| DATA-MSPDI-004 | 40-data-format | PredecessorLink Type / LinkLag（linkType/lagDays） | done (IM2) |
| DATA-MSPDI-007（新規） | 40-data-format | Resource/Assignment（assignee, B-2）、PercentComplete（progressRatio, B-3） | done (IM2) |
| DATA-MSPDI-008（新規） | 40-data-format | Splits/SplitPart→マルチバー（B-5）、description→Task/Notes（B-6） | done (IM2) |
| DATA-MSPDI-009（新規） | 40-data-format | Deadline↔targetDate、Constraint は見送り | done (IM2) |
| 実装差分（§5） | 40-data-format | schema.json/model/codec の具体差分を実装セッション向けに明記 | pending |

## CR-002 (予実配色・マイルストーン描画・ベースライン別ファイル参照) 改訂トレース — 仕様先行・実装後追い

CR-002（承認 2026-07-20、`change-request-002-20260720-054132.md`）の Part 1〜3 を仕様先行で
`.sdoc` へ反映済み。CR-001 Part A の previousPlan 据え置きおよび Part B-4 の MSPDI Baseline clean
往復を supersede する。実装は IM1（スキーマスワップ・`previousPlan` 除去）/IM2（front 特例）/IM3
（配色彩度導出・マイルストーン2マーカー・ベースライン別ファイル参照ローダ＋グレーアンダーレイ）/
IM4（ヘッダー Base V/I 集約）で完了（`project-management/handoff-cr-001-002-003-implementation.md`
§3）。**旧ギャップ解消済み**: MSPDI `BaselineStart`/`BaselineFinish` の best-effort id 突合往復
（DATA-MSPDI-003 の CR-002 改訂分）は補完セッションで `src/domain/usecase/mspdi-codec.ts` に
実装完了（export=id 突合合成／import=drop＋debug ログ、tsc/vitest 591 pass/eslint 緑）。Import 側の
非対称（ドロップ）は `importMspdi` の JSDoc とコード内コメントで DATA-MSPDI-003 "best-effort" を
参照して明文化。`.sdoc` プローズの flat 形状同期は DEF-004（IM5 対応）の範囲。DEC-003（CR-001 承認）参照。

| 改訂要求/契約 | 文書 | 内容 | 実装状態 |
|---|---|---|---|
| PLAN-L1-004 | 18-plan-actual | 変更前予定（ベースライン）を別ファイル参照方式へ改訂（`previousPlan` フィールド廃止、id 突合、薄グレー・編集不可アンダーレイ、対象行と同高さ描画） | done (IM3)：`collectBaselineGhosts`（id 突合・実績無視）＋`ghost-layer`（グレー・同高さアンダーレイ・`data-role="baseline-underlay"`）＋`import-service.importBaselineDocumentFile`（JSON限定ローダ）＋`svg-renderer` ランタイム state（`setBaselineDocument`/`setBaselineVisible`・非永続）。**IM4 完了**: ヘッダー Base V/Base I 2ボタン化（`data-role="baseline-visible"/"baseline-invisible"`）＋Load メニュー「JSON as baseline」に集約、暫定パレットボタン撤去 |
| PLAN-L1-005 | 18-plan-actual | Overlap 塗り分けを彩度導出（淡=予定/濃=実績）＋線幅（予定細/実績太、破線不採用）で明確化 | done (IM3)：`plan-actual-colors`（HSL parse/format＋`planColorFrom`淡/`actualColorFrom`濃＋`displayFillColor`/`actualDisplayFillColor`、`fillColorExplicit` 上書き）＋`a11y-tokens.planActualStrokeWidthPx`（予定細/実績太、破線不採用）＋item-layer 配線 |
| PLAN-L2-001 | 18-plan-actual | マイルストーンの front 特例を追加（区間なし=点。実績あれば actualStart、無ければ startDate。補間しない） | done (IM2/IM3)：`computeProgressFrontDate` の milestone 特例（IM2）＋item-layer 2マーカー描画（予定=startDate・実績=actualStart・塗り無し・細リーダー、IM3） |
| PLAN-L1-006（新規） | 18-plan-actual | 予実の配色をベース色から彩度で導出し線幅を非色冗長符号とする（予定=淡/実績=濃、破線不使用） | done (IM3)：`plan-actual-colors.ts`（`parseColorToHsl`/`hslToCss`/`planColorFrom`＝淡・`actualColorFrom`＝濃、旧固定 緑/橙 は廃止）＋`a11y-tokens.ts`（`PLAN_STROKE_WIDTH_PX`=1/`ACTUAL_STROKE_WIDTH_PX`=2.5・`planActualStrokeWidthPx`、破線不使用）＋item-layer 配線 |
| PLAN-L1-007（新規） | 18-plan-actual | マイルストーンの予実は2マーカー（予定=startDate/実績=actualStart）で描き区間を塗りつぶさない | done (IM3)：`item-layer.ts`（`milestoneActualMarker`／`drawMilestoneActualMarker`、`data-role="milestone-actual-marker"`、塗り無し・任意の細リーダー線） |
| DATA-JSON-016（新規） | 40-data-format | ベースライン参照文書（`previousPlan` 廃止に伴う新概念。id 突合・過去予定スナップショット・JSON限定） | done (IM3)：`import-service.importBaselineDocumentFile`（JSON限定・`deserializeScheduleDocument` 検証、MSPDI拒否）＋`progress-line-builder.collectBaselineGhosts`（id 突合・実績無視）＋`ghost-layer`（グレー・同高さアンダーレイ） |
| 40-data-format | 40-data-format | `previousPlan` DATAFIELD（DATA-JSON-006 の一部）廃止、ベースライン参照文書の概念を追加、DATA-MSPDI-003 の Baseline マッピングを best-effort id 突合へ改訂、配色（彩度/線幅）を presentation ノートとして追記 | partial：`previousPlan` 除去は done (IM1, `gr-scheduler.schema.json`/`schedule-model.ts`)、ベースライン参照文書の概念は上表 DATA-JSON-016 行へ分離し done (IM3)。**MSPDI Baseline best-effort id 突合は未実装**（`mspdi-codec.ts` に Baseline 関連コード無し、grep で確認。要フォローアップ、別途 CR/defect での起票を検討）。配色 presentation ノートの `.sdoc` プローズ反映は DEF-004（`40-data-format.sdoc` §1 flat 同期）の範囲として pending |
| スキーマ | `docs/api/gr-scheduler.schema.next.json` | `previousPlan` を除去（実装フェーズで現行 `gr-scheduler.schema.json` へスワップ） | done (IM1)：スワップ実施済み（`gr-scheduler.schema.next.json` は削除済、現行 `gr-scheduler.schema.json` に `previousPlan` 不在を確認） |

## CR-003 (ヘッダー再編・ラベル位置・依存線自動配線) 改訂トレース — 仕様先行・実装後追い

CR-003（承認 2026-07-20、`change-request-003-20260720-063933.md`）の Part 1〜3 を仕様先行で
`.sdoc` へ反映済み。CR-002 のベースライン可視トグル（Base V/I）のヘッダー配置を確定する。実装は
IM4 で完了（ヘッダー再編・ラベル `inner-left`＋衝突回避・依存線決定的直交配線。
`project-management/handoff-cr-001-002-003-implementation.md` §3）。**DEF-005 は CR-008 で再オープン→
再解決（2026-07-21）**: IM8 の「上下端入線（水平スタブ無し）」方式は矢印が垂直のまま突入し視認方向
が読み取りにくい実データ不具合が判明したため、CR-008 で `routeConnector` を「入退出とも水平スタブで
終端」する方式へ再設計した。重なり/後方は行間ギャップを通過して後続の左辺へ水平（+x）入線し、接触・
同一行 FS は下方へ回り込んで後続下端近傍へ前進方向の水平スタブで入線する（逆向き U 字を解消）。折れ
上限は CR-008 で「前進=0〜3／重なり・後方・同一行連続=最大4」へ緩和（`DEF-005-dep-elbow-parity.md`
参照）。IM5 で新ヘッダー role・新依存幾何に合わせた E2E 改修を実施。

| 改訂要求/契約 | 文書 | 内容 | 実装状態 |
|---|---|---|---|
| TOOL-L1-008（新規） | 19-tools-watermark | ヘッダーのボタン配置順序（`GR Scheduler +(c)` → タイトル → SS → Load → Save → Light → Dark → Mono L → Mono D → Base V → Base I → Undo → Redo → AI → ?）と各ボタンの意味（機能実体）を規定する新規要求 | done (IM4)：`src/app/header-model.ts`（`HEADER_CONTROL_ROLES` 単一SSOT・`LOAD/SAVE_MENU_ITEMS`・`THEME_BUTTON_SPECS`）＋`src/app/main.ts buildChrome`（role→element ルックアップで CR-003 順に append）＋`src/adapters/ui/header-menu.ts`（Load/Save ドロップダウン、aria-haspopup/menu）＋SS=`src/app/viewport-capture.ts`（表示域PNG）。単体：`tests/header-model.test.ts`。E2E：`tests/e2e/cr003-header-dep.spec.ts`（本セッション未実行） |
| ITEM-L2-002（新規） | 11-items-icons | タスクラベルの既定表示位置 `labelPosition=inner-left`（バー内左揃え。バー外左の既存 `left` とは峻別） | done (IM4)：`item-geometry.labelAnchorPoint`（`inner-left` case＋タスク auto 既定→inner-left、arrow/span は連結線上維持）。単体：`tests/task-shape-rendering.test.ts`（inner-left と left の峻別） |
| ITEM-L2-003（新規） | 11-items-icons | マイルストーンラベルの表示位置（アイコン右 `icon-right`） | done (IM4)：`item-geometry.autoLabelAnchor`（milestone→右 `textAnchor='start'`、既存挙動を維持・明文化） |
| ALIGN-L2-003（新規） | 13-layout-alignment | ラベルはみ出しが同一セクション内の他タスクと視覚的に重なる場合の縦オフセット衝突回避（ALIGN-L1-001 の上下左右揃え意図を可能な範囲で維持） | done (IM4)：`layout-engine.assignLanes`（`ItemLabelExtentEstimator` で占有右端をラベルはみ出し分拡張→後続衝突アイテムを1レーン下げる決定的パス）＋`item-geometry.estimateInnerLeftLabelExtentPx`（renderer/left-pane が供給）。単体：`tests/label-collision.test.ts`。**recommended-spec**: 衝突時は後続（order昇順で後）を最小1レーン下方へ |
| DEP-L1-003（改訂・全面書換） | 16-dependencies | 依存線を決定的な直交経路で自動配線（右出=先行右辺middle_right/左入=後続左辺middle_left、横スタブ=矢じり先端の2倍、後続下=出直後に下折れ、後続上=後続直前で上折れ、水平重なり時は行間ギャップを通過し両バー非跨ぎ、前進依存が主対象） | done (IM4→DEF-005 改修→**CR-008 再設計 2026-07-21**)：`dependency-connector.routeConnector` を相対配置別の3経路へ再設計し、CR-008 で**入退出とも水平スタブ終端**へ改修。前進クリア=右辺中央出/左辺中央入（`CONNECTOR_STUB_PX`=2×矢じり・整列0/下2/上2、従来維持で既に水平終端）。重なり/後方=行間ギャップ（`LANE_HUG_FRACTION`）を通過して後続の左辺中央へ水平（+x）入線する L 型（最大4折れ・上下端入線を上書き）。接触・同一行 FS=下方へ回り込み後続下端近傍へ前進方向の水平スタブで入線（3折れ・逆向き U 字解消）。単体：`tests/dependency-connector.test.ts`（25ケース：前進上下・整列・接触・重なり後方・強後方・4テンプレート幾何・M1 gap==stub 境界・M2 隣接レーン非交差＋折れ点=4・L4 極小幅クランプ、全 green） |
| DEP-L1-002（改訂・注記追加） | 16-dependencies | 9 点アンカー座標定義は保持しつつ、当面は手動選択を用いず DEP-L1-003 の決定的規則（始点middle_right/終点middle_left）で配線する旨を追記 | done (IM4)：`dependency-router.ts` の 9 アンカー座標は保持、`dependency-layer`/`hit-tester` は `routeConnector` を使用（手動アンカー無視） |
| DEP-L2-001（改訂・specialize） | 16-dependencies | 障害物回避直交配線エンジンの始点/終点アンカーを middle_right/middle_left に固定し DEP-L1-003 の決定的規則に従って経路生成 | done (IM4→DEF-005 改修→**CR-008 再設計 2026-07-21**)：`routeConnector` が右辺出固定＋相対配置別の決定的直交経路を生成し、CR-008 で全ケース**水平入線スタブ終端**へ改修（前進クリアは左辺入、重なり/後方は行間ギャップ経由で左辺へ水平入線、接触は後続下端近傍へ前進水平入線） |
| DEP-L2-002（改訂・CR-008 折れ上限緩和） | 16-dependencies | 折れ点上限を「前進（後続が右かつ非隣接）=0〜3／重なり・後方・同一行連続=最大4」へ緩和（CR-008 Part 3。水平スタブ必須化・正方向の両立に幾何上4折れが必要なため） | done (IM4→DEF-005 改修→**CR-008 再設計 2026-07-21**)：前進=整列0/上下2（≤3）、接触・同一行 FS=3、重なり/後方=4（水平左辺入線）。旧実装の上下端入線（≤3・水平スタブ無し）を CR-008 で上書きし折れ上限を緩和。`tests/dependency-connector.test.ts` で入退出水平スタブ・接触の前進方向・折れ点上限（前進≤3/その他≤4）・非交差を検証（`DEF-005-dep-elbow-parity.md`） |
| 親 UID（参考・本文不変、子要求追加） | 19-tools-watermark, 11-items-icons, 13-layout-alignment | TOOL-L1-001/002/004/005、ITEM-L1-009/010、ALIGN-L1-001/ALIGN-L2-001 は STATEMENT 本文は改変されておらず、上記の新規/改訂子要求が追加された（親としての整合注記のみ） | done（注記のみ・実装対象なし。`.sdoc` に子要求追加済で充足） |
| スキーマ | `docs/api/gr-scheduler.schema.next.json` | `labelPosition` enum に `inner-left` を追加 | done (IM1/IM4)：スワップ後の現行 `gr-scheduler.schema.json`（`labelPosition` enum に `inner-left` を含むことを確認）へ反映済み |

## CR-004 (アイコン体系刷新: 外部画像インポート廃止・特殊マイルストーン7種) 改訂トレース — Pass A（enum/スキーマ/モデル）

CR-004（承認 2026-07-21、`change-request-004-20260721-070348.md`）の Part 6a/6c を実装。Part 6b
（★→☆輪郭化）および特殊7図形の SVG 描画は Pass B へ繰越（本 Pass は描画なし・enum/スキーマ/モデルのみ）。
図形ボキャブラリの最終決定は `DEF-007-shape-vocabulary-drift.md` D-1（基本5＋特殊7＝12、taskShape 不変）。

| 改訂要求/契約 | 文書 | 内容 | 実装状態 |
|---|---|---|---|
| ITEM-L1-007/008・ITEM-L2-001（撤廃） | 11-items-icons, 30-architecture | 外部アイコン画像インポート（SVG/PNG）と ARCH-C-026 の画像サニタイズ経路を撤去。JSON/MSPDI 検証（IO-L1-006）は維持 | done (Pass A)：`import-sanitizer.ts` から SVG 許可リストサニタイザ＋PNG マジック/IHDR 検証を削除（JSON reviver/深さ・サイズ上限は保持）、`import-service.ts` の SVG/PNG 経路と `importIconFile` 削除、`main.ts` の Import icon ボタン＋配線削除、`json-codec.ts`/`mspdi-codec.ts`/`svg-exporter.ts`/`id-migration.ts` の assets/importedAssetId 除去。スキーマから `assets` 配列・`importedAssetId`・`asset` $def を削除。単体：`tests/import-sanitizer.test.ts`（JSON/XML/base64 のみ）, `tests/sanitizer-invariant.test.ts`（exporter が sanitizedDataUri 非参照へ反転） |
| ITEM-L1-004（拡張） | 11-items-icons | `milestoneShape` に特殊マイルストーン7種（file/box3d/floppy/cylinder/person/smiley/beer）を追加、基本5・taskShape は不変 | done (Pass A・描画なし)：`schedule-model.ts` の `MilestoneShape` union＋`MILESTONE_SHAPE_KINDS`（12値）拡張、`IconShapeKind = MilestoneShape ∪ TaskShape` が追従。スキーマ `milestoneShape`/`iconShapeKind` enum 拡張。レンダラは未描画図形を `milestonePath` の default（diamond）へ安全フォールバック（クラッシュせず）。単体：`tests/milestone-shape-enum.test.ts`（12値順序・スキーマ enum・floppy 往復） |
| スキーマ/契約 | `docs/api/gr-scheduler.schema.json` | `assets`/`importedAssetId`/`asset` $def 削除、`milestoneShape`/`iconShapeKind` enum に7種追加 | done (Pass A)：`document-schema.ts` は同 JSON を直接 import（SSOT 単一）。`tests/document-schema-conformance.test.ts` 緑（コード出力＝スキーマ） |

**Pass A ゲート**: tsc 0 err / vitest 588 pass・0 fail / eslint 0 err（`src tests`）。

### CR-004 Pass B（描画・レイアウト実装）

| 改訂要求/契約 | 文書 | 内容 | 実装状態 |
|---|---|---|---|
| ALIGN-L2-004（新規） | 13-layout-alignment | サブレーン積み順を下→上へ反転（最上段＝マイルストーン／後発重なり、下段＝先着タスク） | done (Pass B)：`layout-engine.assignLanes` が貪欲割当後にレーン index を `laneCount-1-lane` で反転（単一レーン行は不変・非重なり保持・ALIGN-L2-003 のオフセット方向のみ反転）。単体：`tests/layout-engine.test.ts`（reversed stacking／milestone→top）, 更新 `tests/label-collision.test.ts` |
| ITEM-L1-004 / ITEM-L2-003（寸法・フォント） | 11-items-icons | マイルストーンアイコン高さ＝タスクバー×1.15、ラベルフォントはアイコン寸法基準 | done (Pass B)：`task-glyph.milestoneIconHeightPx`／`milestoneLabelFontSizePx`、`item-layer` がレーン中心に拡大グリフを描画・ラベルをアイコン基準サイズ化。Fit は `viewport.renderedGlyphBottom` で +15% オーバーハングを content-bottom に算入（DEF-006 非回帰）。単体：`tests/cr004-render-geometry.test.ts` |
| ITEM-L1-004 Part 6b（★→☆） | 11-items-icons | 既定 `star` を輪郭表示（fill_color 明示時のみ塗り） | done (Pass B)：`item-layer` の milestone 分岐で `star`＋`fillColorExplicit!==true` を `fill=none, stroke=fillColor` 化。パレット glyph も ☆ 化。単体：`tests/cr004-render-geometry.test.ts` |
| ITEM-L1-004 Part 6c（特殊7描画） | 11-items-icons | file/box3d/floppy/cylinder/person/smiley/beer の SVG グリフ＋パレット `[...]` 展開 | done (Pass B)：`item-geometry` に7グリフビルダー＋`milestoneShapeUsesEvenOdd`（合成サブパスを evenodd で穴抜き）、`tool-palette` の `[...]` expander が7種を配置可能に。単体：`tests/cr004-render-geometry.test.ts`（7種が diamond と異なる非空・相互相違パス） |
| ALIGN-L2-005（新規） | 13-layout-alignment | フォント大時のセクション行マージン（小分類が中分類に被らない） | done (Pass B)：`left-pane-layout.sectionRowLabelOffsets(fontScale)` が中/小 tier オフセットをフォント連動化、`left-pane` が採用。単体：`tests/cr004-render-geometry.test.ts`（L で minor-middle >= line-height・単調増加） |
| ITEM-L2-004 / DEP-L2-003（担当者名） | 11-items-icons, 16-dependencies | 担当者名をアイテム左・右詰めで表示、`middle_left` 入線水平部と非干渉。表示は `viewState.assigneeVisible`（既定 hidden、トグルは CR-006） | done (Pass B)：純関数 `assignee-layout.assigneeLabelGeometry`（右詰め・ボックスをレーン中心より上に配置しスタブと非干渉）、`item-layer.updateAssigneeLabel` が `assigneeVisible` gate で描画。`schedule-model.ViewState.assigneeVisible` 追加＋スキーマ viewState に `assigneeVisible: boolean` 追加。単体：`tests/cr004-render-geometry.test.ts` |
| PROP-L2-001（ラベル配置統一） | 12-properties-i18n | end_date/fade_in_days/fade_out_days/actual_end のラベルを他項目と統一（左・右詰め） | done (既実装で充足)：全フィールドが `property-panel.addFieldRow`（caption 右詰め＋value 左）を共有。fade_in_days/fade_out_days は既存（`addNumberField`）。Pass B での改修不要 |

**Pass B ゲート**: tsc 0 err / vitest 602 pass・0 fail / eslint 0 err（`src tests`）。

## CR-005 (フォントスケール: 表記 [S][M][L]・対象限定・パネル収まり・コメント追従) 実装トレース

CR-005（承認 2026-07-21、`change-request-005-20260721-070348.md`／方針確定 `DEC-005` 決定1）の
Part 1〜4 を実装。スキーマ不変（`fontScale` enum は `'S'|'M'|'L'` のまま）。

| 改訂要求/契約 | 内容 | 実装状態 |
|---|---|---|
| TOOL-L1-002 Part 1（表記） | フォント切替ボタンを `[A-][A][A+]` → `[S][M][L]` に改称（値は不変） | done：`src/app/font-scale.ts` `FONT_SCALE_GLYPHS = {S:'S',M:'M',L:'L'}` を SSOT 化、`src/app/main.ts buildChrome` が採用。単体：`tests/font-scale.test.ts`（Part 1: glyphs S/M/L・A 不含・px 単調増加） |
| TOOL-L1-002 Part 2（対象限定） | スケール対象を 3 種（セクション名／プロパティパネル／コメント）に限定、ヘッダー・パレットは対象外（現状維持） | done：`font-scale.ts` を「`#app` 一律 var」から「`#app` 固定 `CHROME_BASE_FONT_PX`＋対象コンテナのみ `--grsch-ui-font` var 付与（`applyScaledFontVar`）＋`FONT_SCALED_CLASS` opt-in」へ再設計。左ペイン=`left-pane.ts`（container に var／`LEFT_PANE_NAME_FONT_CSS`）、プロパティパネル=`property-panel.ts`（root に var／`PROPERTY_PANEL_FONT_CSS`／`setFontScale`）。`main.ts` は `applyUniformFontScale`(#app) を撤去。単体：`tests/font-scale.test.ts`（Part 2: #app 固定・header/palette に var 非結線・3対象は var 参照） |
| PROP-L1-001/002 Part 3（収まり） | S/M/L いずれでも 27 項目がスクロールなしで収まる | done：`property-panel.ts` の入力行高を固定 px（`PROPERTY_PANEL_ROW_INPUT_HEIGHT_PX=17`、スケール非依存）に固定しパネル高を有界化。キャプションは L でも行高以内。`overflowY:auto` は安全策として存置。単体：`tests/font-scale.test.ts`（Part 3: 行高固定・`propertyPanelCaptionFontPx(L) <= 行高`） |
| CURS-L1-005/006, CURS-L2-002 Part 4（コメント追従） | コメント本文フォントを固定 `12` 廃止、小分類セクション名サイズに追従 | done：`font-scale.minorCategoryNameFontPx(scale)` を単一ソース化し、`left-pane.ts` の小分類ラベルと `comment-layer.ts buildCommentText` の SVG `font-size` が共通利用（構成上一致）。単体：`tests/font-scale.test.ts`（Part 4: 単調増加・小分類=コメント同値） |
| CURS-L2-002 Part 4（ライブ不具合修正） | ランタイムの `[S][M][L]` トグルでコメントが追従しない（初回描画時のスケールで固定）。左ペインは `onViewStateChange` で同期再描画されるが、キャンバスのコメントは `setViewState` が rAF に描画を予約するだけ（遅延）で、トグル直後は前スケールのまま | done：`main.ts wireFontScale` で `setViewState` 直後に `renderer.renderNow()` を呼び、離散操作であるフォント切替時にキャンバス（コメント本文・アイテムラベル）を左ペイン/プロパティパネルと同期で即時再描画。回帰テスト：`tests/comment-font-scale.test.ts`（`renderOverlay` のクリア→再構築をリプレイし、スケール変更後にコメント `<text>` の `font-size` が新しい小分類サイズ＝8/9/11 に更新されることを検証。純 `buildCommentText` ではなく再描画パスを行使） |

**CR-005 レビュー指摘対応（Medium/Low）**:
- M-1（キャプションサイズ単一ソース化）: 二重ハードコードの `'0.9em'`（field-row / progress-line）と未使用の `propertyPanelCaptionFontPx` を廃し、`PROPERTY_PANEL_CAPTION_EM=0.9` を唯一のソースとして `PROPERTY_PANEL_CAPTION_FONT_CSS='0.9em'` を導出、両キャプション描画箇所が共通利用。収まりテストは実描画値（`PROPERTY_PANEL_CAPTION_FONT_CSS` × パネル本文比 `PROPERTY_PANEL_EM`）から L でのキャプション px を算出し行高以内を検証（`tests/font-scale.test.ts` Part 3 改訂）。
- L-1（renderNow 回帰ガード）: `applyCanvasFontScale(renderer, scale)` を新設（`setViewState`→`renderNow` を同期実行）し `wireFontScale` から利用。`tests/font-scale.test.ts` L-1 でトグル時に `setViewState`→`renderNow` の順で同期描画され、描画時に新スケールが観測されることを検証。
- L-2（docstring 修正）: `applyScaledFontVar` の "three targets" 記述を「CSS var を持つのは左ペイン/プロパティパネルの 2 コンテナのみ、コメントはレイヤ内で `minorCategoryNameFontPx` から算出」に訂正。
- L-3（入力検証）: `dataset.fontScale as FontScale` の無検査アサーションを廃し `toFontScale(value)`（不正時 'M' フォールバック）を導入。`tests/font-scale.test.ts` L-3 で検証。

**CR-005 ゲート**: tsc 0 err / vitest 617 pass・0 fail（66 files）/ eslint 0 err（`src tests`）。
ライブ確認（親セッションが dev DOM で実施）: ヘッダー `[S][M][L]` 表記、S/M/L 切替でセクション名・
プロパティパネル・コメントのみサイズ変化、ヘッダー/パレットは不変、パネルは L でも非スクロール。

## CR-006 (パレット・ヘッダー UI: Fit/P トグル・SS→クリップボード・言語トグル・イナズマ既定・予実スタイル UI・担当者表示・Add Box 2クリック) 実装トレース

CR-006（承認 2026-07-21、`change-request-006-20260721-070348.md`／`DEC-005` 決定2 で Part 4 の配置を確定）
の Part 1〜8 を実装。ヘッダー左端・パレット・モーダル内 UI の追加が中心。

| 改訂要求/契約 | Part | 内容 | 実装状態 |
|---|---|---|---|
| TOOL-L1-008 | Part 1 | ヘッダー左端（ブランディングの左）に `[Fit]` を新設（機能＝`renderer.fitToContent()` 既存流用） | done：`header-model.HEADER_LEFT_CONTROL_ROLES=['header-fit','header-palette-toggle']` を SSOT 化、`main.buildChrome` が headerLeft へ順序生成、`wirePaletteChrome` が click→fitToContent 配線。単体：`tests/cr006-palette-header.test.ts`（左群順序・右群と非重複・ASCII） |
| TOOL-L1-001/008 | Part 2 | ヘッダー左から2番目に `[P]`（`data-role=header-palette-toggle`）、パレット `[-]`（`togglePaletteMinimized`）と双方向連動・最小化時 aria-pressed=false（不活性/色変化） | done：`main.wirePaletteChrome` の `setPaletteMinimized` が `[P]` の aria-pressed/aria-expanded を同期、`[P]` click と `[-]` click が同一 `togglePaletteMinimized` を共有＝双方向。単体：`tests/cr006-palette-header.test.ts`（左群順序）、挙動同期は e2e |
| TOOL-L1-008（改訂） | Part 3 | SS を PNG ダウンロード→**クリップボード画像コピー**（`navigator.clipboard.write`＋`ClipboardItem`）、不可時は PNG ダウンロード fallback＋トースト通知 | done：`main.wireInputOutput` の SS 配線を `copyPngToClipboardOrDownload`（既存 screen-capture）へ変更、outcome に応じ announcer トースト。単体：`tests/cr006-screen-copy.test.ts`（clipboard 成功→'clipboard'／write 拒否→'download' fallback／非対応→'download'、いずれもモック） |
| PROP-L1-003（改訂, DEC-005 決定2） | Part 4 | `[en]/[jp]` を**モーダル内**（AI/Help のヘッダー、`×` の左）に設置しモーダル表示言語を切替。AI はプロンプトのみ和訳・**JSON スキーマは英語のまま** | done：`modal-locale-toggle.ts`（共有トグル `data-role=modal-locale-toggle`）、`ai-export-modal`（`buildAiPromptText(locale)`／`buildAiClipboardPayload(locale)`＝スキーマ常時英語、ja プロンプト＋タイトル/イントロ/コピー文言）、`help-modal`（`buildHelpModel(locale)`＋ja 7セクション全訳／`helpTitle`/`helpUsageHint`）。`main` が `activeLocale` を各モーダルに注入。単体：`tests/cr006-modal-locale.test.ts`（ja≠en・識別子英語・スキーマ英語不変・ショートカット ASCII） |
| PLAN-L1-003（改訂） | Part 5 | パレットにイナズマ線トグル（カーソル群の右）を追加、**既定を非表示へ変更**（`progressLineVisible` 未指定＝hidden） | done：`progress-line-builder.isProgressLineVisible`（`=== true` のみ表示）を新設、`progress-today-layer`／`main.wireProgressLine`／新設 `wirePaletteProgressLine`（`data-role=toggle-progress-line`）が採用。`schedule-model` docstring と `gr-scheduler.schema.json`（`progressLineVisible.default=false`）を更新、デモは `sample-data` の template/sample が明示 `true` で継続表示。単体：`tests/cr006-palette-header.test.ts`（既定 hidden）、更新 `tests/canvas-objects-batch.test.ts`（template opt-in） |
| PLAN-L1-005（UI 新設） | Part 6 | パレットに `[Ao]`(Overlap)/`[As]`(Separate) 切替（`data-role=palette-plan-actual-style`）、既定 Overlap 据置 | done：`plan-actual-geometry.resolvePlanActualStyle`（既定 overlap）新設、`main.wirePlanActualStyle` が radiogroup を `viewState.planActualStyle` に配線。単体：`tests/cr006-palette-header.test.ts`（既定 overlap／separate 解決） |
| PROP-L1-002（UI 追加） | Part 7 | パレットに担当者名 表示/非表示トグル（`data-role=palette-assignee-toggle`）、`viewState.assigneeVisible`（CR-004 Part 5 描画）に配線・既定 hidden | done：`main.wireAssigneeToggle`（`assigneeVisible !== true` トグル）。描画は既存 `item-layer.updateAssigneeLabel`（`assigneeVisible===true` gate）。挙動は e2e |
| CURS-L1-007（操作変更） | Part 8 | Add Box を既定位置生成→**2クリック矩形指定**（左上→右下）、Esc キャンセル、角丸みスクリーン空間固定（CURS-L2-001）不変 | done：`annotation-commands.roundedBoxRectFromCorners`（順不同正規化・行 index 非負クランプ）新設、`editing-controller` に `armBoxPlacement/isBoxPlacementArmed/cancelBoxPlacement/onBoxPlacementChange`＋`handleBoxPlacementClick`（単一セクションクランプ）を追加、`main.wireAnnotationCreation` の boxButton が arm 化＋`wireEscHandling` に box 分岐。単体：`tests/cr006-palette-header.test.ts`（矩形正規化）、2クリック実操作は e2e（node に DOM/`Element` 無く controller 実行不可のため） |

**CR-006 ライブ確認指摘の修正（親セッション live-verify 起点）**:
- D1/D2（Part 5 パレット進捗トグル非機能・data-role 重複）: パレット `[⚡]` の role を
  `palette-progress-line-toggle`（プロパティパネル側 `toggle-progress-line` と分離）へ変更。
  両コントロールを単一 `applyVisible`（`viewState.progressLineVisible` 反転→`renderer.renderNow()`
  即時再描画→パレット aria-pressed とパネル `sync()` を双方向更新）へ集約し、どちらを押しても
  同期。`attachProgressLineControls` は `{sync}` ハンドルを返却。
- D3（Part 4 モーダル言語トグルの選択表示）: `modal-locale-toggle` を radio/aria-checked から
  **aria-pressed**（本コードベースのテーマ選択と同じ排他セグメント方式）へ変更し選択言語を明示。
- Part 6/7/8 の状態変更確認: Ao/As・担当者トグルに `renderer.renderNow()` を追加し rAF スロットル下でも
  即時反映。Add Box 2クリックは `editing-controller` の `instanceof Element` を `typeof Element` ガード化して
  node で駆動可能にし、モック renderer + 疑似 host で 2クリック→`RoundedBoxAnnotation` 生成を検証
  （`tests/cr006-box-placement.test.ts`：矩形正規化・単一セクションクランプ・生成/キャンセル）。

**CR-006 ゲート**: tsc 0 err / vitest 640 pass・0 fail（70 files）/ eslint 0 err（`src tests`）。
DOM 配線（buildChrome・パレット各トグル・2クリックジェスチャ）は `bootstrap()` を import 時実行し
node 環境で不可のため、抽出した純関数シーム（`isProgressLineVisible`/`resolvePlanActualStyle`/
`roundedBoxRectFromCorners`/`buildAiPromptText`/`buildHelpModel`/`copyPngToClipboardOrDownload`）で単体被覆、
実 DOM 挙動は e2e とライブ確認（親セッション）に委譲。

## CR-010 (単一HTMLアプリ内蔵ダウンロード: Help から到達する [Download GR Scheduler]) 実装トレース

CR-010（承認 2026-07-21、`change-request-010-20260721-071425.md`）の Part 1〜3 を実装。スキーマ変更なし。
ヘッダー15要素の並び順（CR-003 確定）は不変で、`[?]`（Help）到達先の Help モーダル内へボタンを追加。

| 改訂要求/契約 | Part | 内容 | 実装状態 |
|---|---|---|---|
| TOOL-L1-008（Help 到達動線） | Part 1 | Help モーダル内に「Download GR Scheduler」ボタン（`data-role=download-app`）を新設。ラベルは CR-006 の `[en]/[jp]` モーダル言語トグルに連動（`downloadAppLabel(locale)`：en=`Download GR Scheduler`／ja=`GR Scheduler をダウンロード`、製品名は不変）。トップレベルヘッダー要素は追加せず | done：`help-modal.ts` の `HelpModal` に第3引数 `onDownloadApp` を追加、`render()` がヘッダー右群 `.grsch-help-actions`（download＋locale-toggle＋close）を構成、`applyLocale()` がラベルを追随更新。単体：`tests/help-modal.test.ts`（`downloadAppLabel` の ja≠en・製品名保持・英語 ASCII） |
| IO-L1-004（出力種別追加） | Part 2 | クリック時に `fetch(location.href)`（`cache:'no-store'`）で配信済み HTML を再取得し `text/html` Blob 化、固定名 `gr-scheduler.html` で保存。既存 Blob ダウンロード基盤（`downloadBlobFile`）を再利用。`document.documentElement.outerHTML`（編集中 DOM）は使用しない | done：`file-io.ts` に `downloadDeliveredApp(deps)`（`sourceUrl`/`fetchImpl`/`downloadBlob` 注入可能）と `DELIVERED_APP_FILE_NAME='gr-scheduler.html'`、`downloadTextFile` を `downloadBlobFile` 経由へリファクタ。単体：`tests/file-io-delivered-app.test.ts`（成功＝取得テキストから Blob 生成・ファイル名・`text/html`／outerHTML 未読トラップ／not-ok=false／reject 捕捉で非throw） |
| IO-L1-004（オフライン扱い） | Part 3 | `file://`/CORS 等で `fetch` 失敗時は実害なし（利用者は既にファイル保有）として `false` を返し throw しない。`main` が失敗時に polite live region で穏当に通知（en/ja） | done：`downloadDeliveredApp` は catch で WARN ログ＋`false` 返却、`main.ts` の Help モーダル配線が `announcer.announce(...)` で通知。単体：`tests/file-io-delivered-app.test.ts`（reject が resolve(false) になり非throw） |

**CR-010 ゲート**: tsc 0 err / vitest 696 pass・0 fail（72 files）/ eslint 0 err（`src tests`）。
`document-schema-conformance.test.ts` は緑維持（スキーマ変更なし）。Help モーダルの実 DOM 配線
（ボタン表示・`fetch(location.href)` 実行）は jsdom 不在（package.json 凍結）のため純関数シーム
（`downloadAppLabel`／`downloadDeliveredApp` の注入シーム）で単体被覆し、実 DOM 挙動は親セッションの
ライブ確認に委譲。

## CR-012 (既定起動テンプレートを予実統一モデルへ移行) 実装トレース

CR-012（承認 2026-07-21、`change-request-012-20260721-073825.md`）の Part 1〜4 を実装。IM7 決定
（予定/実績を別行・別アイテムで保持する keep-as-is 方式）を supersede。スキーマ変更なし、
コアドメインロジック変更なし。対象は `src/app/sample-data.ts` の `generateTemplateDocument` のみ
（`generateSampleDocument`＝ベンチマーク用フィクスチャは既に統一モデルのため対象外）。

| 改訂要求/契約 | Part | 内容 | 実装状態 |
|---|---|---|---|
| PLAN-L1-001/002（予実統一モデル） | Part 1 | 6 件の `*-Actual` アイテムを対応する `*-Plan` アイテムへ統合（`actualStart`/`actualEnd`/`progressRatio` を転記）し、統合元は削除。SoP/SOS 等は予定のみのまま残し疎密を保つ | done：`sample-data.generateTemplateDocument` の `Seed` に `actualStart`/`actualEnd` を追加し `assignee`/`fadeInDays` と同様に mapper で条件付き付与。統合対象＝kickoff/freeze（マイルストーン、`actualEnd` 無し）、concept/dev/sys1/swe2（タスク、実績スパン＋進捗率）。32→**26 アイテム** |
| SECT（分類ツリーの導出） | Part 2 | 空になった `Milestones-Actual`／`Phase-Actual`（Over All・TeamA）／`SWE-Phase-Actual` の 4 中分類が `rebuildClassification` の再導出で自然消滅 | done：導出行数 13→**9 行**（Over All: Milestones, Phase／TeamA: Phase, SYS-Phase, SWE-Phase, Integration, Task{Onboarding, Requirements, Usecase}）。実装コード変更なし |
| PLAN-L1-005 / CR-002 Part 1（配色） | Part 3 | テンプレート専用の赤 `ACTUAL_FILL='#ee6677'` を廃止。ベース色 1 色（`#4477aa`）から `displayFillColor`（淡色＝予定）/`actualDisplayFillColor`（濃色＝実績）が導出 | done：`ACTUAL_FILL` 定数と全参照を削除。全 26 アイテムの `fillColor` は単一のベース色 |
| ITEM-L1-006（分類名） | Part 4 | 実態と乖離する `-Plan` サフィックスを除去（`Milestones-Plan`→`Milestones`, `Phase-Plan`→`Phase`, `SYS-Phase-Plan`→`SYS-Phase`, `SWE-Phase-Plan`→`SWE-Phase`, `Integration-Plan`→`Integration`, `Task-Plan`→`Task`）。小分類（Onboarding/Requirements/Usecase）は不変 | done：アイテム ID（`oa-ms-plan-kickoff` 等）は内部 ID のため**現状維持**（§7 未決事項の判断）。依存 4 本・注記 1 件・担当者・fade・`schemaVersion 2`・`TEMPLATE_PROJECT_ID` を保持 |
| 受入基準 §6（パレット挙動） | 回帰 | `[A]`off=actual-only が真部分集合／`[P]`off=plan-only が全 26 件（空白化しない）／`[Ao]` が実績バーを予定バー上に生成／`[As]` が両サブレーンを生成／実績アイテムがイナズマ線頂点を持つ | done：新設 `tests/cr012-template-plan-actual.test.ts`（12 ケース）。更新：`tests/visual-data-batch.test.ts`（統一モデル・単一ベース色・中分類改称）、`tests/aspice-sample.test.ts`（`actualStart` 判定へ）、`tests/dependency-connector.test.ts`・`tests/e2e/ui-feedback-batch.spec.ts`（コメント）、`tests/e2e/classification-pane-restructure.spec.ts`（`Task-Plan`→`Task`, `Task-Plan-1`→`Task-1`） |

**CR-012 ゲート**: tsc 0 err / vitest 715 pass・0 fail（73 files）/ eslint 0 err（`src tests`）。
`document-schema-conformance.test.ts` は緑維持（スキーマ変更なし）。実 DOM 上の
`[A]`/`[P]`/`[As]`/`[Ao]` 挙動は親セッションのライブ確認に委譲。

## DEF-008 (予実表示フィルタがバー描画をゲートしていない) 修正トレース

DEF-008（`project-records/defects/DEF-008-plan-actual-display-not-gating-bars.md`）の修正。
`planActualDisplay` は「どのアイテムを描くか」だけでなく「どのバーを描くか」も決めるという
PLAN-L1-002 の要求を描画層に反映。`computePlanActualBars` は純ジオメトリのまま据え置き。

| 要求 | 内容 | 実装状態 |
|---|---|---|
| PLAN-L1-002 | 4モード（both / plan-only / actual-only / none）が予定バー・実績バーを個別にゲートする | done (DEF-008)：新設 `src/domain/usecase/plan-actual-display.ts`（`isPlanSideShown`/`isActualSideShown`/`planActualDisplayFromSides`/`computeDisplayedPlanActualBars`）。`item-layer` が `computeDisplayedPlanActualBars` 経由でバーを取得し、抑止側を描かない。`main.ts` のローカル述語と `dependency-visibility.isItemVisibleUnderDisplay` は同述語へ集約（モード判定の重複排除） |
| PLAN-L1-002 / L1-005 | 片側抑止時は抑止側のサブレーンも描かず、残る側が1本のバーとして読めること（Overlap/Separate 共通） | done：`computeDisplayedPlanActualBars` が片側のみのとき overlap フレームで計算 → 残る側がレーン全高。`actual-only` ではプライマリグリフ自体が実績（実績スパンへ移動・濃色・`data-plan-actual-side="actual"`・太線幅）となり、別ノードは生成しない |
| PLAN-L1-007 | マイルストーンの2マーカーも同ゲートに従う | done：`plan-only` で実績マーカー＋リーダー線を除去、`actual-only` で単一マーカーを `actualStart` に描画（`both` のときの実績マーカー位置と一致） |
| PLAN-L1-003 | イナズマ線は実績側の可視性に従う | done：`progress-today-layer` の `=== 'plan-only'` 判定を `!isActualSideShown(...)` へ（`none` でも非表示） |

**DEF-008 ゲート**: tsc 0 err / vitest 746 pass・0 fail（74 files）/ eslint 0 err（`src tests`）。
新設 `tests/plan-actual-display-gating.test.ts`（31 ケース：純ゲート 4モード×2スタイル、
ItemLayer 実描画＝実績あり/なしタスク・マイルストーン、トグル反復でノードが残留しないこと）。
`tests/helpers/fake-svg-dom.ts` に `insertBefore` を追加（マイルストーンのリーダー線が使用）。

## 結論

user-order 62項目 → 要求 → 設計 → データ契約 → テスト が一気通貫でトレースされ、**未被覆 0**。
テスト結果は `docs/spec/51-test-results.sdoc`（35 TEST_RESULT 全PASS）、詳細な項目別割当は
`user-order-coverage.md` を参照。
