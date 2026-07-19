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
| 17 cursors-comments | CURS | STK-L0-012 | C-005,007,016 | annotation, cursor-span, svg-renderer | cursor-span, annotation-commands |
| 18 plan-actual | PLAN | STK-L0-011 | C-003,014 | progress-line-builder | progress-line-builder |
| 19 tools-watermark | TOOL | STK-L0-008/013/019/021/022 | C-006,007,019,027,028,030,031 | watermark-builder, schedule-store, item-clipboard, keyboard-shortcuts, tool-palette | command-history, watermark-builder, font-scale |
| 20 io-interop | IO | STK-L0-014/015 | C-017,018,024,025,026 | json-codec, mspdi-codec, svg-exporter, file-io, autosave | json-codec, mspdi-codec, svg-exporter, pipeline-integration |
| 25 nfr-a11y | NFR | STK-L0-015/016/017/018/020 | C-028,029,030,032,033,035 | a11y-tokens, contrast, accessible-name, keyboard-commands, a11y-stylesheet | contrast, accessible-name, a11y-encoding, keyboard-commands, e2e:a11y |

## 特記トレース（★/★★ とモックFB）

| 由来 | 要求 | 実装/テスト |
|---|---|---|
| ★item12 移動⇔プロパティ双方向同期 | ALIGN-L1-003/L2-002 | bidirectional-sync.test |
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
| UI/操作FB: 積層バーは95%高で境界可視化 | ITEM-L1, item7 | layout-engine（STACKED_BAR_HEIGHT_RATIO=0.95）, ui-feedback-batch.test, e2e:ui-feedback-batch |
| UI/操作FB: ガイドカーソル4排他モード（none/十字/縦1/縦2, viewState永続, i18n en/ja, ポインタ追従） | CURS-L1-003, item9-12 | schedule-model（CursorGuideMode/cursorGuideMode）, svg-renderer（renderCursorGuide/pointerClient追従）, main（radiogroup, 旧dual-cursorトグル置換）, i18n, json-codec（往復）, ui-feedback-batch.test, e2e:ui-feedback-batch |

## 非機能・横断の検証

| 観点 | 要求/決定 | 検証 |
|---|---|---|
| 性能 | NFR-L1-002, RISK-001, DEC-001/ADR-009 | 性能PoC（162.3fps/4.6ms/p95 6.20ms, ユーザー立会い 2026-07-18） |
| セキュリティ | IO-L1-006, ITEM-L2-001, CSP | M5a敵対レビュー PASS, import-sanitizer/color-validator/sanitizer-invariant テスト, npm audit 0 |
| アクセシビリティ | STK-L0-016, NFR-L1-003..006 | axe e2e PASS(serious/critical 0), contrast/accessible-name/keyboard-commands, `docs/dev/a11y-wcag21-aa-checklist.md` |
| 単一HTML | STK-L0-015, NFR-L1-001, ADR-003 | ビルド検証（外部参照0・CSP sha256一致） |

## 結論

user-order 62項目 → 要求 → 設計 → データ契約 → テスト が一気通貫でトレースされ、**未被覆 0**。
テスト結果は `docs/spec/51-test-results.sdoc`（35 TEST_RESULT 全PASS）、詳細な項目別割当は
`user-order-coverage.md` を参照。
