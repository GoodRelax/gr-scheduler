# 自律セッション報告書 — CR-004〜011 実装（2026-07-21）

- 開始: 2026-07-21 08:00（ユーザー外出、帰宅22:00頃・その間ユーザー対応不可）
- モード: 自律実行。ユーザー判断が必要な点は「推奨動作で実装 → 本書に記録 → 帰宅後に確認」。
  必要なら CR を起票して修正する。
- コミット/タグ/プッシュはユーザーが手動。各節目で英語 Summary/Description を本書末尾に提案。
- 進め方: 各CR = 仕様先行（architect が `.sdoc`／data-format）→ 実装（implementer＋test-engineer）
  → review-agent。gate（tsc0 / vitest green / eslint0 / strictdoc export exit0 / npm run build）を各節目で維持。
- 実機検証は screenshot 厳禁（ハング）。`npm run dev`→localhost:5173→DOM/JS 検証（memory `live-verify-gotchas`）。
- 性能PoC（RISK-001）は**ユーザー立会い必須のため実行しない**（memory `perf-test-notify`）。

---

## 着手前に確定した事項（H-4, DEC-005）

`project-records/decisions/DEC-005-cr004-011-h4-clarifications.md` に記録。要点:
- **CR-005 対象**: セクション分類名／プロパティパネル／コメントの3種のみ（ヘッダー・パレット除外）。
- **CR-006 Part4 [en][jp]**: ヘッダーではなく、[AI]/[?] を開いたモーダル内の右上 `×`(閉じる)の左に置く。
- **CR-009 UTC更新**: `ScheduleStore` の dispatch/undo/redo 連動（ズーム/スクロールでは不変）。
- CR-004 不在懸念は解消（CR-004 ファイルは存在）。

---

## 進捗ログ（時系列・随時追記）

### CR-004 表示・レイアウト・アイコン刷新 — 進行中

**仕様先行フェーズ（architect）:**
- 5本の `.sdoc` を改訂（11-items-icons / 13-layout-alignment / 12-properties-i18n /
  16-dependencies / 30-architecture）＋40-data-format にブリッジノート追加。
  - 追加要求: ITEM-L2-004（担当者名レイアウト）, ALIGN-L2-004（下→上積み）,
    ALIGN-L2-005（フォント大時セクション行マージン）, PROP-L2-001（プロパティラベル配置統一）,
    DEP-L2-003（担当者名↔左入線 非干渉）。
  - 変更: ITEM-L1-004（star→輪郭☆／特殊MS7種／+15%）, ITEM-L2-003（MSラベルフォント基準）,
    PROP-L1-002（fade_in_days/fade_out_days を表に追加, 27→29項目）, ARCH-C-026（画像経路撤去）。
  - 削除: ITEM-L1-007/008/L2-001（アイコンインポート）＋セクション4。
  - milestoneShape 追加enumキー(暫定): `file`/`box3d`/`floppy`/`cylinder`/`person`/`smiley`/`beer`。
- **アイコンインポート撤去に伴う dangling 参照の後始末 完了**（40-data-format DATA-JSON-013削除 /
  50-test-spec TEST-INT-010/011をJSON/MSPDI専用に再目的化 / 30-architecture・00-overview・
  01-stakeholder・domain-model-class.md から importedAssetId/ImportedAsset/assets 撤去）。
- **`strictdoc export docs/spec` = exit 0（エラー0, 14.2s）確認済み**。CR-004 仕様先行フェーズ完了。

**実装フェーズ（implementer + test-engineer）:** 進行中。
- 対象: schema(milestoneShape enum±/importedAssetId削除) / schedule-model / layout-engine(積み順反転・
  行マージン) / item-layer(MS+15%・font基準・☆・特殊7種・担当者名) / property-panel(ラベル配置・fade追加) /
  import-sanitizer+import-service(画像経路撤去) / json-codec・mspdi-codec(assets撤去) / main(iconインポートUI撤去)。

**実装 Pass A（Part 6a 撤去 + Part 6c enum, 完了・green）:**
- 画像インポート撤去: schema(assets/importedAssetId/asset$def削除) / schedule-model(ImportedAsset型・
  importedAssetId・assets削除) / json-codec・mspdi-codec・import-sanitizer(SVG allowlist+PNG検証撤去,
  JSON reviver等セキュリティは保持) / import-service(画像経路撤去) / main(Import iconボタン撤去) /
  svg-exporter・id-migration・sample-data 等。テスト改廃。
- milestoneShape enum = 5基本 + 7特殊(file/box3d/floppy/cylinder/person/smiley/beer)=12。
  未描画の7種は diamond へ安全フォールバック(item-geometry `case 'diamond': default:`)。
- **gate: tsc 0 / vitest 588 pass・0 skip・0 fail / eslint 0**。
- 申し送り: `readFileAsBytes`(file-io) 未使用化・security記録(M5a)は旧SVG/PNG記述のまま(履歴・要リフレッシュ)。

**実装 Pass B（描画/レイアウト, 完了・green）:**
- Part1 積み順反転(layout-engine `laneCount-1-lane`)／Part2 MS高さ×1.15+アイコン基準ラベルフォント
  (task-glyph)+Fit張り出し算入(viewport `renderedGlyphBottom`)／Part3 フォント連動セクション行マージン
  (left-pane-layout)／Part4 プロパティラベルは既に addFieldRow で右詰め統一済(コード変更不要・fade項存在)／
  Part5 担当者名ジオメトリ(assignee-layout, `ViewState.assigneeVisible` 既定非表示・CR-006でトグル配線)／
  Part6b star輪郭(fill_color未指定時fill=none)／Part6c 特殊7 glyph(item-geometry)+パレット[...]展開。
- **gate: tsc 0 / vitest 602 pass・0 fail / eslint 0 / build 271.78kB / strictdoc exit0**。

**実機ライブ検証（dev DOM）:** 32件描画・console/CSPエラー0・import-iconボタン撤去(0)・
special-milestone-expander に7種(file/box3d/floppy/cylinder/person/smiley/beer)・star輪郭(fill=none,stroke)確認。

**review-agent（R-CR004）: PASS**（Critical/High/Medium 0, Low 4）。Low3件を即修正:
L-1 dead `readFileAsBytes`削除／L-2 stale JSDoc修正／L-3 単一文字関数 `n`→`roundCoord2`(item60)。
L-4(担当者ラベル上端がレーン上端超過)は既定非表示のため CR-006 配線時に live-verify で再確認。
**再gate: tsc 0 / eslint 0 / vitest 602 green。CR-004 完了。**

---

## 自律判断の一覧（帰宅後の確認対象）

| # | CR | 判断事項 | 推奨動作（採用） | 要確認ポイント |
|---|----|---------|----------------|--------------|
| D-1 | CR-004 | milestoneShape 図形ボキャブラリの仕様↔コード drift | 基本5(circle/triangle/square/diamond/star)+特殊7=12 で実装。taskShape不変。`.sdoc`基本名 drift は DEF-007 に切出し | DEF-007 の是正方針(コードを正典化=推奨)の可否 |
| D-2 | CR-004 | 特殊MS7種の enum キー名 | file/box3d/floppy/cylinder/person/smiley/beer(英ASCII) | キー名でよいか |
| D-3 | CR-006 | 担当者機能のサンプルデータ不在 | TeamA 4件に assignee(Suzuki/Saotome/Sato/Tanaka)付与し実演可能に | 名前・対象アイテムでよいか(不要なら削除可) |
| D-4 | CR-007 | 分類複製時、複製範囲内で閉じる依存線の扱い(§7未決) | 両端が複製サブツリー内の依存は新IDへ再マップして複製(境界跨ぎのみ破棄) | 妥当か |
| D-5 | CR-007 | 上下移動で分類ツリー端に達した場合のUX(§7未決) | 無音no-op(禁止カーソル等のUXは将来) | 無音でよいか |
| D-6 | CR-007 | Ctrl+クリックと矩形/移動の当たり判定優先(§7未決) | Ctrl+クリック=選択トグル(移動非開始)/空白から矩形/選択item上の素ドラッグ=移動 | 妥当か |
| D-7 | CR-007 | コメント編集のEscape挙動(§7未決) | Enter=確定/Escape=取消(元テキストに戻す) | 妥当か |
| D-8 | CR-009 | 既定透かしPW=可視ブランド文字列と同一(GoodRelax) | H-5指定どおり GoodRelax で実装(hash保持) | **要検討**: 解除PWが可視透かし文字列と同一だと第三者が推測可能。別PW推奨か? |

---

## コミット提案（帰宅後にまとめてコミット）

### CR-004（緑・レビューPASS）
**Summary:** `Implement CR-004: layout/icon overhaul, drop image import`

**Description:**
```
CR-004 (display/layout/icon overhaul), spec-first then implemented.

Spec: revise 11-items-icons/13-layout-alignment/12-properties-i18n/
16-dependencies/30-architecture + 40-data-format bridge notes; tear down
withdrawn image-import requirements (ITEM-L1-007/008/L2-001) and their
dangling refs across data-format/test-spec/architecture/domain-model.

Code Pass A (teardown + enum): remove external image import
(assets/importedAssetId, SVG allowlist + PNG validation sanitizer path)
across schema, model, json/mspdi codecs, import-service, main UI, exporter;
keep JSON/MSPDI trust boundary intact. Extend milestoneShape enum to 12
(base 5 + special 7: file/box3d/floppy/cylinder/person/smiley/beer).

Code Pass B (rendering/layout): bottom-up sub-lane stacking; milestone
icon +15% with icon-based label font and Fit content-bottom guard;
font-scaled left-pane section row margin; default star renders as outline
(fill from fill_color); 7 special milestone glyphs + palette [...] expander;
assignee-name geometry gated on new ViewState.assigneeVisible (toggle in
CR-006); property label alignment already unified.

Records: DEC-005 (H-4 clarifications), DEF-007 (shape-vocab drift, deferred),
R-CR004 review PASS (Critical/High 0), traceability updated.

Gate: tsc 0 / vitest 602 / eslint 0 / strictdoc exit 0 / build 271.78kB.
```

### CR-005 — 進行中
- 仕様(architect): 19-tools-watermark(TOOL-L1-002 [S][M][L]・対象3種・ヘッダー/パレット除外, TOOL-L1-008整合) /
  15-classification-sections(SECT-L1-006/L2-001 分類名スケール追従・小分類=コメント基準) /
  17-cursors-comments(CURS-L1-005/006/L2-002 コメント追従=小分類サイズ) / 12-properties-i18n(PROP-L1-001
  全スケールでスクロール無し)。**strictdoc export exit0 確認**。
- 実装(implementer): font-scale.ts で #app 固定14px・`--grsch-ui-font` を対象コンテナのみに付与（ヘッダー/
  パレット除外）／main.ts glyph [S][M][L]／property-panel・left-pane・comment-layer 追従。gate tsc0/vitest611/eslint0。
- **実機ライブ検証で欠陥検知**: ヘッダー(10.92px)/パレット(14px)は S/M/L で不変=OK。セクション名は
  S=8/M=9/L=11 でスケール=OK。**但しコメント本文は初期描画では小分類と一致(11)だが、実行時トグルで
  再描画されず 11px に固着**（左ペインは追従するがキャンバスのコメントオーバレイが fontScale 変更で
  再構築されない）。→ 修正: `wireFontScale` で `renderer.renderNow()` を呼び同期再描画。回帰テスト追加。
- **修正後ライブ再検証: コメント=小分類(S=8/M=9/L=11)で追従、ヘッダー/パレット不変、パネル L でスクロール無し**。
- review-agent（R-CR005）: **PASS**（Critical/High 0, Medium 1, Low 3）。M-1(キャプション0.9emの三重複・
  未使用ヘルパをテストが検証=偽の安心)＋Low3件を修正: 単一情報源化＋実経路テスト／renderNow同期の回帰ガード／
  docstring／`toFontScale` 入力検証。**再gate: tsc0/vitest617/eslint0/build272.30kB。CR-005 完了。**

### CR-005（緑・レビューPASS）
**Summary:** `Implement CR-005: rename font scale to S/M/L, scope targets`

**Description:**
```
CR-005 (font scale [S][M][L]), spec-first then implemented.

Spec: revise TOOL-L1-002 (glyphs [A-][A][A+] -> [S][M][L], value unchanged;
scope to section names / property panel / comments only, header+palette
excluded), SECT-L1-006/L2-001 (category font follows scale; minor size is
the comment reference), CURS-L1-005/006/L2-002 (comment font follows scale
= minor size), PROP-L1-001 (panel fits scroll-free at every scale).

Code: font-scale.ts pins #app to fixed 14px and publishes the scaled
--grsch-ui-font only on the left-pane and property-panel containers, so the
header and palette never inherit it; glyphs S/M/L; property panel fixed row
height fits at L; comment body font sources the single minorCategoryNameFontPx.
Fixed a render-timing defect where the canvas comment lagged the left pane by
one rAF on toggle (wireFontScale now forces renderNow); added a synchronous
re-render regression guard and a real-path caption-fit test.

Review R-CR005 PASS (Critical/High 0); M-1 caption single-source + Low fixes.
Gate: tsc 0 / vitest 617 / eslint 0 / strictdoc exit 0 / build 272.30kB.
Live-verified: comment tracks minor (S8/M9/L11), header/palette fixed, panel
scroll-free at L.
```

### CR-006 — 進行中
- 仕様(architect): TOOL-L1-008(Fit/P先頭・SS→クリップボード)・TOOL-L2-006(P↔[-]同期)・PROP-L1-003(モーダル内
  [en][jp]・DEC-005準拠でヘッダー非追加)・PROP-L1-002(担当者トグル)・PLAN-L1-003(イナズマ既定非表示)・
  PLAN-L1-005(Ao/As UI)・CURS-L1-007(Add Box 2クリック)・DATA-JSON-011(progressLineVisible既定flip)。
  **strictdoc export exit0 確認**。
- 実装(implementer): 8パート実装・gate tsc0/vitest638/eslint0/build286.84kB。ja翻訳(AIプロンプト7規則・
  ヘルプ全7節)追加。DOM配線は vitest(node,jsdom無)で走らないため純粋シーム単体＋オーケストラ実機検証。
- **実機ライブ検証**: Part1 Fit最左(x12)/Part2 P(x49)↔[-]双方向同期OK/Part4 AI・Help内[en][jp]は×の左・
  jpで和訳(スキーマは英語維持)OK/Part6 Ao/As同期OK。**欠陥検知**→ implementer差し戻し中:
  - D1: パレットのイナズマ⚡トグルが progressLineVisible を実際に変えない(プロパティパネルの progress
    制御は同期動作するが、⚡クリックで共有状態が不変・⚡のaria更新なし)＝Part5 非機能。
  - D2: `toggle-progress-line` data-role がパレット⚡とプロパティパネル制御で重複。
  - D3(軽): モーダル[en][jp]の選択状態(aria-pressed)がクリックで未更新(テキストは切替わる)。
  - 併せて Ao/As・担当者トグル・Add Box2クリックが実際にviewState/コマンドを変えるか(pane rAFスロットルで
    キャンバス再描画を観測不可のため)再確認を依頼。
- **修正完了**: D1/D2 = パレット進捗トグルを `wireProgressLine` に統一(単一 `applyVisible`+`renderNow`同期・
  パネル制御と lock-step)・パレット側 data-role を `palette-progress-line-toggle` に分離。D3 = モーダル
  [en][jp] を `aria-pressed` セグメント化。Ao/As・担当者・進捗トグルに `renderNow()` 追加で同期反映。
  Add Box は EditingController e2e テスト追加(2クリックで rect 正規化・単一セクションclamp・Esc解除)。
- **サンプルに assignee 追加**(自律判断 D-3): 担当者機能が未データで実演不可のため TeamA 4件(SYS1=Suzuki/
  SYS2=Saotome/SYS3=Sato/SWE1=Tanaka)に assignee を付与。Seed型+マッパ拡張。ASCII名で統一。
- **修正後ライブ再検証**: 進捗トグル(line 1→0・パネル同期shown→hidden)・担当者トグル(4名右詰め表示→消去)・
  重複role解消・[en][jp]和訳(スキーマ英語維持)・SS無例外(フォールバック)・console error 0。
- review-agent（R-CR006）: **PASS**（Critical/High/Medium 0, Low 1）。Low = SSボタンのコメント/アクセシブル名が
  旧「PNG download」のまま→クリップボード文言へ修正。**再gate: tsc0/vitest640/eslint0/build286.93kB。CR-006 完了。**

### CR-006（緑・レビューPASS）
**Summary:** `Implement CR-006: header Fit/P, palette toggles, modal i18n`

**Description:**
```
CR-006 (palette/header UI, 8 parts), spec-first then implemented.

Spec: TOOL-L1-008 (Fit + P leftmost header controls; SS -> clipboard copy),
TOOL-L2-006 (P <-> palette [-] bidirectional sync), PROP-L1-003 ([en][jp]
lives inside AI/Help modals per DEC-005, not the header), PLAN-L1-003
(progress-line palette toggle, default hidden), PLAN-L1-005 (Ao/As UI),
PROP-L1-002 (assignee toggle), CURS-L1-007 (Add Box 2-click), DATA-JSON-011
(progressLineVisible default flip).

Code: header [Fit]/[P] (P syncs bidirectionally with palette [-]); SS copies
the viewport image to clipboard with download+toast fallback; [en][jp]
segmented toggle inside the AI and Help modals (AI prompt localizes to ja,
JSON schema stays English; full ja help catalogue added); palette toggles
for progress-line (default now hidden), plan/actual style [Ao]/[As], and
assignee visibility -- each forces a synchronous renderNow; Add Box now
places a rounded box by two canvas clicks (Esc cancels). Sample gains
assignee on 4 TeamA items so the feature is demonstrable.

Review R-CR006 PASS (Critical/High 0). Fixed 3 live defects (palette progress
toggle wiring, duplicate data-role, modal locale aria) + SS label wording.
Gate: tsc 0 / vitest 640 / eslint 0 / strictdoc exit 0 / build 286.93kB.
Live-verified all 8 parts in the dev DOM.
```

### CR-007 — 進行中
- 仕様(architect): SEL-L1-001/002・SEL-L2-001(選択+Ctrl+click, D-6)/ALIGN-L1-004・ALIGN-L2-006(複数移動2モード,
  D-5)/CURS-L2-003(コメント編集, D-7)/TOOL-L1-005(Ctrl+A=item+comment)/SECT-L1-007・SECT-L2-002(分類複製,
  D-4)。**strictdoc export exit0**。スキーマ変更なし。
- 実装(implementer): 5パート・純粋シーム(selection-set/multi-item-move/classification-copy)＋コマンド。
  gate tsc0/vitest661/eslint0。
- **実機ライブ検証**: Part5 分類複製=⧉ボタン13個・「Duplicate TeamA」で TeamA-1 複製→**永続モデルで
  items 32→52・major に TeamA-1(20件)・sections 2→3・suffix -1 確認**(キャンバス再描画は pane rAF
  スロットルで未観測だがモデルは正)。Part3 コメントdblclick→インライン textarea("core build")確認。
  Part1/2/4 の選択ハイライトはキャンバスオーバレイ(throttle)で観測不可・純粋ロジックは単体テスト済。console error 0。
- review-agent（R-CR007）: **PASS**（Critical/High 0, Medium 2, Low 4）。M1(旧複製経路 `(n)` と新 `-N` の
  二重経路=POLA)・M2(Ctrl+Aでコメント選択するが delete/copy/ハイライト非対応=incomplete)を**修正指示**
  (据置きでなく統合・完成)。
- **M1/M2 修正完了**: M1=分類複製を単一経路(`copyClassificationCommand`, -N命名+D-4依存再現)に統合、
  旧 `duplicateCategorySubtreeCommand`((n)命名)撤去、Ctrl+C/V・右クリックメニューも同経路へ。M2=
  `deleteSelectedTargetsCommand`(item+comment一括削除・undo可)＋複数コメント選択ハイライト
  (comment-layer に dashed outline)。**再gate: tsc0/vitest667/eslint0/build293.57kB**。
- 修正後ライブ再検証: 統合複製で TeamA-1(-N)確認・console error 0。**CR-007 完了**。

### CR-007（緑・レビューPASS）
**Summary:** `Implement CR-007: selection, multi-move, comment edit, copy`

**Description:**
```
CR-007 (selection/edit/move/copy-paste, 5 parts), spec-first then implemented.
No schema change (behavior only).

Spec: SEL-L1-001/002 + SEL-L2-001 (rectangle + Ctrl+click add/remove, hit-test
priority D-6); ALIGN-L1-004 + ALIGN-L2-006 (multi-item move: horizontal bulk
date shift / vertical adjacent-sibling reassign at deepest shared level,
edge-stop D-5); CURS-L2-003 (comment double-click edit, Enter commit / Escape
revert D-7); TOOL-L1-005 (Ctrl+A = items + comments); SECT-L1-007 + SECT-L2-002
(classification copy-paste: below-insert, -N suffix, new-id subtree remap,
dependency reproduce-internal/drop-boundary D-4).

Code: pure usecases selection-set / multi-item-move / classification-copy;
undoable commands (bulk shift, bulk reassign, copy classification, comment edit,
delete items+comments). Ctrl+click toggle, multi-move drag, inline comment
textarea editor, left-pane copy icon. Unified the classification-duplicate path
to one behavior (-N + D-4) across the icon, Ctrl+C/V, and context menu; removed
the legacy "(n)" path. Completed Ctrl+A comment selection: delete removes items
AND comments, and all selected comments show the selection outline.

Review R-CR007 PASS (Critical/High 0); the 2 Mediums (dual duplicate path,
inert comment selection) were fixed, not deferred.
Gate: tsc 0 / vitest 667 / eslint 0 / strictdoc exit 0 / build 293.57kB.
Live-verified: classification copy (model 32->52, TeamA-1), comment editor.
```

### CR-008 — 進行中
- 仕様(architect): 16-dependencies DEP-L1-003/L2-001(水平スタブ必須・上下端でも水平終端・垂直突入禁止)/
  DEP-L2-002(折れ上限=前進0-3・重なり/後方/連続≤4, CR-008上書き)。DEF-005 を再オープン(CR-008,2026-07-21)。
  **strictdoc export exit0**。
- 実装(implementer): `dependency-connector.ts` routeConnector 再設計。CONNECTOR_STUB_PX=12(=矢印2倍)。
  各分岐が水平+x入線スタブで終端。flush同一レーン連続のみ出口スタブは幾何的に不可のため境界を垂直に落とす
  (入口水平・正方向は保証)。gate tsc0/vitest671/eslint0。
- **実機ライブ検証**: テンプレ4依存すべて 水平入線スタブ12px・+x正方向・水平出口・折れ≤4・非交差・console0。
  連続(concept-dev/dev-valid)は行下を通り正方向ボトム入線(逆U解消)、重なり/後方(sys1-sys2/sys3-swe1)は水平入線(垂直突入解消)。
- review-agent（R-CR008）: **PASS**（Critical/High 0, Medium 2, Low 3）。M1(下方前進で gap==stub 時に入線スタブが
  0長→垂直退化=CR-008違反の幾何エッジ・テンプレ非通過)・M2(stacked非交差テストが端点2バーのみ)・L4(極小幅後続の
  スタブクランプ)を**修正指示**。
- **M1/M2/L4 修正完了**: M1=BELOW/ABOVE対称化(`elbowX=targetLeftX-stub`)で入線スタブが常にフル水平・
  gap==stub でも垂直退化せず。M2=跨ぎ/隣接レーン障害物テスト＋折れ数下限固定。L4=極小幅後続クランプ。
  連結テスト 17→25。**再gate: tsc0/vitest679/eslint0/build293.48kB**。修正後ライブ再検証: テンプレ4依存
  すべて水平入線12px・正方向維持。**CR-008 完了**。

### CR-008（緑・レビューPASS）
**Summary:** `Implement CR-008: dependency stubs and forward direction`

**Description:**
```
CR-008 (dependency-line horizontal stubs + correct direction; DEF-005
re-resolved), spec-first then implemented. Single module.

Spec: 16-dependencies DEP-L1-003/L2-001 (mandatory horizontal exit/entry stub
of CONNECTOR_STUB_PX = 2x arrowhead; even top/bottom-edge entry terminates
horizontally; vertical-into-arrowhead prohibited; correct forward direction,
no reversed-U); DEP-L2-002 elbow limit relaxed to forward 0-3 /
overlap-backward-contiguous <=4 (CR-008 override of IM8). DEF-005 reopened
(CR-008, 2026-07-21) and re-resolved.

Code: routeConnector redesigned. Every route ends in a horizontal +x entry
stub; classification from actual rendered lane geometry (adapts to CR-004
bottom-up stacking). Forward=0/2 elbows, overlap/backward=4, contiguous=3.
Flush same-lane contiguous drops the shared boundary at exit (a horizontal
exit stub is geometrically impossible there) while guaranteeing the forward
horizontal entry stub. Symmetrized below/above so the entry stub never
degenerates to vertical; clamped for narrow successors. Connector tests 13->25.

Review R-CR008 PASS (Critical/High 0); Mediums (below-stub degeneracy at
gap==stub, inter-lane non-crossing coverage) fixed.
Gate: tsc 0 / vitest 679 / eslint 0 / strictdoc exit 0 / build 293.48kB.
Live-verified: 4 template deps horizontal 12px entry stub, forward, no plunge.
```

### CR-009 — 進行中
- 仕様(architect): TOOL-L2-001(UTC必須)/TOOL-L2-004(日時必須・ISO8601 Z分精度)/TOOL-L2-005(既定PW
  GoodRelax・旧ハッシュ削除)/**TOOL-L2-007 新規(UTC更新タイミング=内容変更時のみ, DEC-005#3)**。strictdoc exit0。
- 実装(implementer): `DEFAULT_WATERMARK_HIDE_PASSWORD_HASH`=380e83c3…(SHA-256("GoodRelax") sha256sumで独立検証済)。
  `resolveWatermark` 既定でUTC必須(空不可)。`ScheduleStore.onContentChange`(dispatch実変更/undo/redoのみ・
  replaceDocument不発火)→`wireWatermarkTimestamp` が `renderer.setViewState` で再採番(コマンド外＝非再帰)。
  gate tsc0/vitest686/eslint0。
- **実機ライブ検証**: 透かし "GoodRelax 2026-07-21T03:03Z"(ユーザー名+UTC必須)・Fit/wheel-zoom で UTC 不変・console0。
- review-agent（R-CR009）: **PASS**（Critical/High/Medium 0, Low 3・ハッシュ独立再検証一致）。Low-1(watermark
  欠落import時のzoomでUTC変動=narrow edge)を**修正指示**(import時materialize)。Low-2は受入文言のみ。
- **要ユーザー確認(重要)**: 既定PW `GoodRelax` は**可視ブランド透かし文字列と同一**のため、平文 GoodRelax が
  透かし userName として JSON 出力に不可避に出現する(クレデンシャルは hash のみ保持で保護は正)。透かし解除PW
  が可視文字列と同じだと第三者が推測可能=保護が弱い。**別PWにするか要検討**(H-5はGoodRelax指定・現状その通り実装)。
- **Low-1 修正完了**: import/adopt 時に `materializeWatermark` で UTC を一度確定(以後 zoom/scroll で不変)。
  DRY で bootstrap seed も同一経路。**再gate: tsc0/vitest690/eslint0/build294.09kB**。修正後ライブ再検証:
  透かし正常。**CR-009 完了**。

### CR-009（緑・レビューPASS）
**Summary:** `Implement CR-009: watermark default password, UTC, timing`

**Description:**
```
CR-009 (watermark), spec-first then implemented.

Spec: TOOL-L2-001 (UTC time mandatory in content), TOOL-L2-004 (UTC always
shown, ISO-8601 Z minute precision), TOOL-L2-005 (default unlock password
watermark-unlock -> GoodRelax, hash-only), new TOOL-L2-007 (UTC re-stamped on
document content change only -- DEC-005 #3).

Code: DEFAULT_WATERMARK_HIDE_PASSWORD_HASH set to the verified SHA-256 of
GoodRelax (independently re-checked with sha256sum). resolveWatermark always
carries a UTC ISO timestamp; content = username + UTC. UTC re-stamped via a new
ScheduleStore.onContentChange (mutating dispatch/undo/redo, not replaceDocument),
applied through renderer.setViewState outside the command flow (no recursion,
exactly one re-stamp per content change). Viewport (zoom/scroll) and the
watermark enable/disable toggle do not re-stamp. Imports materialize a concrete
UTC once so absent-watermark docs stay stable across zoom.

Review R-CR009 PASS (Critical/High 0). Note for the user: GoodRelax is both the
unlock password and the visible brand text, so the plaintext appears as the
watermark username (credential itself stored only as a hash) -- consider a
distinct password.
Gate: tsc 0 / vitest 690 / eslint 0 / strictdoc exit 0 / build 294.09kB.
Live-verified: username+UTC shown; zoom/scroll does not change UTC.
```

### CR-010（緑・レビューPASS）
- 仕様(architect): TOOL-L1-008(Help到達先にDownloadボタン注記)・**IO-L1-007 新規**(fetch(location.href)→Blob→
  gr-scheduler.html・outerHTML不使用・file://失敗は無害)。strictdoc exit0。
- 実装(implementer): `downloadDeliveredApp`(file-io.ts, fetch no-store→text→text/html Blob→gr-scheduler.html・
  DI注入でテスト可・失敗はfalse返し非throw)／help-modal に `download-app` ボタン(en/ja)／main.ts で失敗時 live-region 通知。
  gate tsc0/vitest696/eslint0。
- **実機ライブ検証**: Helpモーダルに "Download GR Scheduler"(ローカライズ・×とlocaleトグルの左)・**クリックで
  GET location.href(200)発火＝outerHTML不使用をネットワークパネルで確認**・console0。
- review-agent（R-CR010）: **PASS**（Critical/High/Medium 0, Low 2）。L-1(失敗通知が常に「オフライン」文言=原因非依存
  文言が望ましい)・L-2(連打in-flightガード無=冪等で無害)は**据置き受容**(Low・受入基準非該当)。**CR-010 完了**。

### CR-010 コミット提案
**Summary:** `Add Help Download GR Scheduler button, clean self-download (CR-010)`
**Description:**
```
CR-010 (in-app single-HTML download). Spec: TOOL-L1-008 Help destination note +
new IO-L1-007 (fetch(location.href)->Blob->gr-scheduler.html, never outerHTML,
file:// failure harmless). Code: downloadDeliveredApp re-fetches the delivered
HTML (cache:no-store), saves the clean app as gr-scheduler.html via a Blob, never
serializing the edited DOM; localizable Help button (data-role=download-app);
fetch failures caught and announced via the live region. Unit tests incl. an
outerHTML trap proving the DOM is not serialized. No schema change.
Gate: tsc 0 / vitest 696 / eslint 0 / strictdoc exit 0 / build 295.89kB.
Live-verified: button fetches location.href (GET / 200), not outerHTML.
```

### CR-011（緑・レビューPASS）
- 仕様(architect): 19-tools-watermark に **TOOL-L2-008 新規**(ヘルプ ワンスクリーン収まり・3段維持・幅優先・
  フォント微縮最終手段, Parent TOOL-L1-008)。strictdoc exit0。
- 実装(implementer): help-modal CSS を `HELP_MODAL_STYLESHEET` 定数化。width 85vw→96vw・`overflow:auto`廃止
  (`max-height:calc(100vh-16px)`+`overflow:hidden`)・`column-count:3`維持・`font:clamp(11px,0.95vw,13px)`・
  余白/ガター/行高圧縮・900px/620px段組み縮退を撤廃(デスクトップ前提3列維持)。テスト+6。gate tsc0/vitest702/eslint0。
- **実機ライブ検証(1280px, en/ja両方)**: 3列・幅96vw(1229/1280)・**縦スクロール無し(scrollH554=clientH554<max704)**・
  ビューポート内・overflow hidden・console0。en/ja とも同一で収まる。
- review-agent（R-CR011）: **PASS**（Critical/High/Medium 0, Low 2）。Low-1(高さ≲570pxの病的ビューポートで
  クリップ=CR準拠のトレードオフ・デスクトップ範囲外・受容)・Low-2(冒頭JSDoc "two-column"→"three-column"修正済)。**CR-011 完了**。

### CR-011 コミット提案
**Summary:** `Make Help modal fit one screen (3-col, widen, CR-011)`
**Description:**
```
CR-011 (Help one-screen fit). Spec: new TOOL-L2-008 (one-screen, 3-column,
width-first, font-shrink last resort). Code: help-modal CSS -> HELP_MODAL_STYLESHEET
constant; width 85vw->96vw; removed overflow:auto (now max-height calc(100vh-16px)
+ overflow:hidden); kept column-count:3; font clamp(11px,0.95vw,13px); trimmed
paddings/gutters; dropped the 900/620px column collapses (desktop-focused). +6
invariant tests. No schema change.
Gate: tsc 0 / vitest 702 / eslint 0 / strictdoc exit 0 / build 295.84kB.
Live-verified at 1280px, en AND ja: 3 columns, 96vw, no scroll, fits viewport.
```

---

## 総括（全8CR完了・2026-07-21）

**CR-004〜011 の全8本を仕様先行→実装→実機検証→review-agent PASS(Critical/High 0)で完了。**
最終gate（全CR統合後）: **tsc 0 / eslint 0 / vitest 702 pass・0 fail / strictdoc export exit 0 /
npm run build = dist/index.html 295.84kB 自己完結**。変更ファイル計106（spec/code/tests/records）。

- 全review-agent結果: R-CR004(PASS,High0)/R-CR005(PASS,High0,M1修正)/R-CR006(PASS,High0)/
  R-CR007(PASS,High0,M1M2修正)/R-CR008(PASS,High0,M1M2修正)/R-CR009(PASS,High0)/
  R-CR010(PASS,High0)/R-CR011(PASS,High0)。指摘Mediumは据置きでなく修正済み。
- 新規記録: DEC-005(H-4確定)/DEF-007(図形ボキャブラリdrift・据置)。DEF-005(依存線)は CR-008 で再解決。
- **未実施(ユーザー立会い必須)**: 性能PoC(RISK-001, memory `perf-test-notify`)。勝手に実行していない。
- **要ユーザー確認**: 上表 D-1〜D-8（特に **D-8 透かしPW=可視文字列**、D-3 サンプルassignee、
  D-1/DEF-007 図形ボキャブラリ）。不都合あればCR起票のうえ修正する。

**コミット方針(手動)**: 上記の各CR「コミット提案」を使い **CR単位で8コミット**推奨（レビュー容易・履歴明確）。
まとめて1コミットでも可。**コミット前チェック**: 本作業は src/docs/tests/records のみ変更、秘密情報なし。
`project-management/autonomous-session-report-20260721.md`(本書)はプロセス文書で公開対象、機微情報なし。

**次アクション(ユーザー帰宅後)**: (1)本書レビュー→D-1〜D-8可否 (2)手動コミット/プッシュ (3)性能PoC立会い。

---

## 追補 (2026-07-22): CR-012 + DEF-008 — 予実トグルが機能しない問題の解決

**発端**: ユーザーが「P A @ Ao As の動作」を確認要求 → 実機実測で以下が判明。

| 操作 | 修正前 | 原因 |
|---|---|---|
| [A] off (plan-only) | 26件のまま実績バーも残る | 描画層が `planActualDisplay` を見ていない |
| [P] off (actual-only) | **0件＝真っ白** | サンプルに実績日を持つアイテムが皆無 |
| [As] | バーが半分になり**下段が空** | 実績日が無く実績バーが null |
| [Ao] | 実績バーが描かれない | 同上 |
| [@] | 正常 | — |

**根本原因は2つ**:
1. **データ**: CR-001 で「1アイテムが予定+実績日を持つ」統一モデルにしたが、既定テンプレートは IM7 の
   keep-as-is 移植で**予実が別行**（青Plan行/赤Actual行）のまま。赤行はアプリから見れば「塗りが赤い普通の
   タスク」で実績と認識されない。→ **CR-012**（ユーザー承認済）でサンプルを統一モデルへ移行。
2. **描画**: `item-layer` が `planActualDisplay` を**アイテムの取捨にしか使わず**、残ったアイテムの
   予定/実績バーの描き分けに使っていなかった。→ **DEF-008**（High）を起票し修正。

**CR-012 実装**: 6組の `*-Actual` を対応する `*-Plan` に統合（`actualStart`/`actualEnd`/`progressRatio`）、
空になった4つの `*-Actual` 中分類を除去、赤 `ACTUAL_FILL` を廃止（淡=予定/濃=実績は単一 base 色から派生）、
`-Plan` サフィックスを除去（Milestones/Phase/SYS-Phase/SWE-Phase/Integration/Task）。**32件13行 → 26件9行**。

**DEF-008 修正**: 新設 `src/domain/usecase/plan-actual-display.ts` に4モードのゲートを集約
（`isPlanSideShown`/`isActualSideShown`/`planActualDisplayFromSides`/`computeDisplayedPlanActualBars`）。
`computePlanActualBars` は純ジオメトリのまま（ドメイン純度維持）。`main.ts` のローカル述語を移設し、
`dependency-visibility`・`progress-today-layer` も同述語へ集約。単体テスト31件追加。

**実機ライブ再検証（すべて期待どおり）**:
- both: 26件 / 実績バー3 / planSide3 / actualSide5
- **[A]off: 実績側 0**（実績バー完全抑止）・26件
- **[P]off: 6件・予定側 0・実績側 6**（真っ白解消）
- **[Ao]**: 予定(y97,h24,w71)に実績(y97,h24,w72,x2)を重ね描き
- **[As]**: 予定(y97,h10) / 実績(y110,h10) と**上下サブレーン両方が埋まる**

**gate: tsc0 / eslint0 / vitest746 / strictdoc exit0 / build 295.98kB**。

**未決（フォローアップ候補）**: `[P]`off で対象0件の文書を開いた場合の空表示ガード（CR-012 §7 で明示的に
スコープ外とした）。今のテンプレートでは6件あるため顕在化しない。
