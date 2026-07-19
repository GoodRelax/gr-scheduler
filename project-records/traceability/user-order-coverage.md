# user-order.md 網羅トレーサビリティ (control document)

- 目的: `user-order.md`（62項目+サブ項目）が漏れなく仕様（StrictDoc 要求）へ落ちることを保証する
- 状態: **全項目に L1 要求 UID を割当済み（漏れ 0）**。`strictdoc export docs/spec` = exit 0 / エラー0
- 更新日: 2026-07-18（L1-L3 ドメイン要求作成後、実UID反映）

## ドメイン文書と UID プレフィクス

| 文書 | UIDプレフィクス | 主要L0 |
|---|---|---|
| 10-canvas-view | CANVAS | STK-L0-001/004/008/019/021 |
| 11-items-icons | ITEM | STK-L0-006/001 |
| 12-properties-i18n | PROP | STK-L0-007/016 |
| 13-layout-alignment | ALIGN | STK-L0-003/005 |
| 14-zoom-lod | ZOOM | STK-L0-002 |
| 15-classification-sections | SECT | STK-L0-009 |
| 16-dependencies | DEP | STK-L0-010 |
| 17-cursors-comments | CURS | STK-L0-012 |
| 18-plan-actual | PLAN | STK-L0-011 |
| 19-tools-watermark | TOOL | STK-L0-008/013/019/021/022 |
| 20-io-interop | IO | STK-L0-014/015 |
| 25-nfr-a11y | NFR | STK-L0-015/016/017/018/020 |

## 項目別カバレッジ（user-order 全項目 → 割当 L1 要求UID）

| item | 内容(要約) | L0 | 割当UID |
|---|---|---|---|
| 1 | 全体を1画面でスクロールなし俯瞰 | STK-L0-001 | CANVAS-L1-001 |
| 2 | 1行に複数アイテム(マルチバー) | STK-L0-001 | CANVAS-L1-002, ITEM-L1-001 |
| 3 | 上下左右揃え | STK-L0-003 | ALIGN-L1-001, ALIGN-L2-001 |
| 4 | 単一.htmlで動作 | STK-L0-015 | NFR-L1-001 |
| 5 | WYSIWYG UI | STK-L0-005 | ALIGN-L1-002 |
| 6 | 画面を目一杯使う(情報密度最大) ★★ | STK-L0-021 | CANVAS-L1-003 |
| 6.1 | ヘッダー最小化 ★★ | STK-L0-021 | CANVAS-L1-003 |
| 6.2 | ツールパレットはフローティング ★★ | STK-L0-021 | TOOL-L1-001 |
| 6.3 | 全体フォントサイズ 大/中/小 ★★ | STK-L0-022 | TOOL-L1-002 |
| 6.4 | マニュアル不要 | STK-L0-016 | NFR-L1-003 |
| 6.5 | アフォーダンス | STK-L0-016 | NFR-L1-004 |
| 6.6 | メニューはアイコンで用途伝達 | STK-L0-016 | NFR-L1-005 |
| 7 | 既定アイコン提供 | STK-L0-006 | ITEM-L1-002 |
| 8 | 既定アイコン一覧 | STK-L0-006 | ITEM-L1-003 |
| 9 | MS図形/タスク図形セット | STK-L0-006 | ITEM-L1-004 |
| 10 | 絵文字アイコン | STK-L0-006 | ITEM-L1-005 |
| 11 | 枠色/塗り色選択 | STK-L0-006 | ITEM-L1-006 |
| 12 | ★アイコン移動でプロパティ自動更新 | STK-L0-005 | ALIGN-L1-003, ALIGN-L2-002 |
| 13 | アイテムのコピペ | STK-L0-008 | TOOL-L1-003 |
| 14 | アイコンをインポート | STK-L0-006 | ITEM-L1-007 |
| 15 | インポート形式 SVG/PNG | STK-L0-006 | ITEM-L1-008, ITEM-L2-001 |
| 16 | プロパティ設定可 | STK-L0-007 | PROP-L1-001 |
| 17 | プロパティ24項目 | STK-L0-007 | PROP-L1-002 |
| 18 | property多国語対応 | STK-L0-007 | PROP-L1-003 |
| 19 | property名は英語表記 | STK-L0-007 | PROP-L1-004 |
| 20 | パレット色10色 | STK-L0-007 | PROP-L1-005 |
| 21 | パレット原色不使用(CUD) | STK-L0-016 | PROP-L1-006, NFR-L1-006 |
| 22 | 略称を内部/付近に表示 | STK-L0-006 | ITEM-L1-009 |
| 23 | 略称位置をドラッグ移動 | STK-L0-006 | ITEM-L1-010 |
| 24 | ヘッダー左上にスケジュール名 | STK-L0-001 | CANVAS-L1-004 |
| 25 | ヘッダーに年/月/日/曜日 | STK-L0-001 | CANVAS-L1-005 |
| 26 | ズームで年/月/日/曜の表示切替 | STK-L0-002 | ZOOM-L1-001 |
| 27 | 本日の線 | STK-L0-012 | CURS-L1-001 |
| 28 | デュアルカーソルでスパン計測 | STK-L0-012 | CURS-L1-002 |
| 29 | 縦線/十字線モード個別切替 | STK-L0-012 | CURS-L1-003 |
| 30 | 本日線/カーソルの表示切替 | STK-L0-012 | CURS-L1-004 |
| 31 | 任意の場所にコメント | STK-L0-012 | CURS-L1-005 |
| 32 | コメント2種(引出し四角/折れ線) | STK-L0-012 | CURS-L1-006 |
| 33 | 丸角囲み(Rズーム非依存) | STK-L0-012 | CURS-L1-007, CURS-L2-001 |
| 34 | 依存関係の表現 | STK-L0-010 | DEP-L1-001 |
| 34.1 | 9点アンカーから引出し/引入れ | STK-L0-010 | DEP-L1-002 |
| 34.2 | 依存線を重なり回避で自動配線 | STK-L0-010 | DEP-L1-003, DEP-L2-001 |
| 34.3 | 折れ点0〜3 | STK-L0-010 | DEP-L2-002 |
| (34) | 矢頭は最小サイズ(mockフィードバック) | STK-L0-010 | DEP-L1-004 |
| 35 | 分類する水平線 | STK-L0-009 | SECT-L1-001 |
| 36 | ★セクション化・順序入替 | STK-L0-009 | SECT-L1-002 |
| 37 | ★セクション表示/非表示 | STK-L0-009 | SECT-L1-003 |
| 38 | ★非表示セクションを小タブで再表示 | STK-L0-009 | SECT-L1-004 |
| 39 | ★小タブ増加/水平線を太くしない | STK-L0-009 | SECT-L1-005 |
| 40 | 分類名を画面左側に表示 | STK-L0-009 | SECT-L1-006, SECT-L2-001, CANVAS-L1-006, CANVAS-L2-001 |
| 41 | 分類/スケジュール個別連動スクロール | STK-L0-004 | CANVAS-L1-007, CANVAS-L2-002 |
| 42 | MSProject(MSPDI XML)双方向I/O | STK-L0-014 | IO-L1-002 |
| 43 | JSON I/O(AI向け) | STK-L0-014 | IO-L1-001 |
| 44 | 画面をSVG出力 | STK-L0-014 | IO-L1-003 |
| 45 | センターホイールで拡大縮小 | STK-L0-002 | ZOOM-L1-002 |
| 46 | ★縦のみ/横のみ拡大 | STK-L0-002 | ZOOM-L1-003 |
| 47 | 年単位〜日単位まで表示 | STK-L0-002 | ZOOM-L1-004 |
| 48 | ズームで表示アイテム自動増減(LOD) | STK-L0-002 | ZOOM-L1-005, ZOOM-L2-001, ZOOM-L3-001 |
| 49 | 拡大で上下左右スクロール | STK-L0-004 | CANVAS-L1-008 |
| 50 | スクロールでもヘッダー/分類常時表示 | STK-L0-004 | CANVAS-L1-009 |
| 51 | 初期テンプレート1種 | STK-L0-008 | CANVAS-L1-010 |
| 52 | 拡大時マウスだけでスクロール | STK-L0-019 | CANVAS-L1-011, ZOOM-L1-006 |
| 53 | ショートカットキー | STK-L0-008 | TOOL-L1-005 |
| 54 | 予定と実績を表示/管理 | STK-L0-011 | PLAN-L1-001 |
| 55 | 予定のみ/実績のみ/両方表示 | STK-L0-011 | PLAN-L1-002 |
| 56 | イナズマ線 | STK-L0-011 | PLAN-L1-003, PLAN-L2-001 |
| 57 | 変更前予定をグレー表示 | STK-L0-011 | PLAN-L1-004 |
| 58 | パレット非選択時に薄く透明 | STK-L0-019 | TOOL-L1-006 |
| 59 | 透かし | STK-L0-013 | TOOL-L1-007 |
| 59.1 | 透かしにユーザー名+日時 | STK-L0-013 | TOOL-L2-001 |
| 59.2 | 斜め方向に薄く複数タイル | STK-L0-013 | TOOL-L2-002 |
| 59.3 | 透かし表示/非表示切替 | STK-L0-013 | TOOL-L2-003 |
| 60 | 将来拡張の設計余地(MVP外) | STK-L0-018 | NFR-L1-009 |
| 60.1-60.6 | 共同編集/権限/統合/サブPJ/モード切替/列 | STK-L0-018 | NFR-L1-009 |
| 61 | 命名は名は体を表す(言霊) | STK-L0-020 | NFR-L1-007 |
| 62 | パワポ代替に便利な機能を提案 | STK-L0-020 | NFR-L1-008 (Could) |
| — | 保存(ファイルI/O) | STK-L0-015 | IO-L1-004 |
| — | 保存(localStorage自動保存/復旧) | STK-L0-015 | IO-L1-005 |
| — | Import検証/サニタイズ(XXE/innerHTML禁止) | STK-L0-014/015 | IO-L1-006, ITEM-L2-001 |
| — | Undo/Redo | STK-L0-008 | TOOL-L1-004 |
| — | 性能(60fps/初期1.5s) | STK-L0-017 | NFR-L1-002 |

## レビュー基準（結果）

- [x] 全 item に ≥1 の L1 要求 UID が割当済み（未割当 = 0 → 漏れなし）
- [x] `strictdoc export docs/spec` が exit 0 / エラー0（Parent 参照は全解決）
- [x] ★/★★ 項目（11/12→ALIGN, 35-39→SECT, 45/46→ZOOM, 6/6.1-6.3→CANVAS/TOOL）を明示反映
- [ ] 各 L1 要求は既存 L0 へ Parent トレース（review-agent で確認中）
- [ ] review-agent R1（R1a構造品質 + R1b表現品質）Critical/High = 0（実施中）
