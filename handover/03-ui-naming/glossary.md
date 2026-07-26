# gr-scheduler 用語集 (製品用語の SSOT)

本文書は gr-scheduler の製品用語の唯一の正である。
仕様書 (`docs/spec/**`)・実装の識別子・UI 表示文字列・マウスオーバーのヘルプは、
すべてこの表の語に従うこと。ここに無い語を新設したときは、まずこの表へ足すこと。

関連文書:

- `docs/analysis/glossary-open-questions-ja.md` — 本用語集で未確定・要協議の項目
- `process-rules/glossary.md` — 別物。full-auto-dev フレームワークの用語集であり製品用語は含まない
- `docs/spec/00-overview.sdoc` §4 — 旧用語集。本文書へ移行する (CR-017 の architect 作業で置換予定)

置き場所について: 本文書は `docs/spec/` 配下に置く。StrictDoc は入力フォルダ内の
Markdown も文書として取り込むため、ここに置けば `strictdoc export` の成果物に
用語集の HTML が生成される (2026-07-23 に実測して確認済み)。

状態: 第3版 (2026-07-23)。ユーザー確定の改名を反映。`実装` 列の「改名予定」は
唯一の正としての目標名で、現行コードはまだ旧名である (該当は §12 の揺れ表を参照)。
`未確認` は対応識別子をコードでまだ確認していない語。

---

## 1. 表の読み方

| 列 | 意味 |
|---|---|
| English | 正規の英語用語。識別子はこの語から機械的に導く (§2) |
| 日本語 | 日本語 UI と日本語仕様書で使う語 |
| ヘッダー | ヘッダーバーに出るアイコン表記。無ければ `なし` |
| パレット | コマンドパレットに出るアイコン表記。無ければ `なし` |
| 説明 | 一文の定義 |
| 実装 | コード上の名前。規則どおりなら代表形のみ、不規則なら実名を明示 |

## 2. 識別子の導出規則

読み替えは機械的に行う。ここを人間の裁量にすると、読み替えの揺れ自体が
新しい用語の揺れになる。

| 役割 | 記法 | 実例 |
|---|---|---|
| 型・インタフェース・クラス | PascalCase | `ScheduleItem` / `LevelOfDetail` |
| 関数・メソッド・プロパティ・変数 | camelCase | `actualStart` / `drawsActualBar` |
| 定数 | SCREAMING_SNAKE_CASE | `MIN_ACTUAL_BAR_WIDTH_PX` |
| 文字列リテラルの判別値・DOM の `data-role`・CSS クラス | kebab-case | `'actual-only'` / `fit-to-content` |
| JSON 文書のプロパティ名 | camelCase | `fadeInDays` |
| i18n キー・プロパティパネルの項目名 | snake_case | `fade_in_days` |

同じ概念でも面が違えば記法が違う。対応は §10 の表を見ること。
文字列リテラルの判別値を kebab とするか camel とするかは §12 D-18 で協議中。

略語 (LOD, MSPDI, CUD など) は散文と UI 表示にだけ使う。識別子には正式名称を展開した
語を使うこと。全大文字の識別子は定数の記法なので、略語をそのまま識別子にすると
種別を誤読させる。LOD の型名は `LevelOfDetail` (ユーザー確定)。

---

## 3. 画面の領域と部品

### 3.1 領域

領域名は両方 panel で揃える (D-17 確定)。左は Activity Title Panel、右は Properties Panel。

| English | 日本語 | ヘッダー | パレット | 説明 | 実装 |
|---|---|---|---|---|---|
| app header | ヘッダー | 全体 | なし | 画面最上部の帯。ブランディング・タイトル・ヘッダーボタンを載せる | `app-header` / `grsch-app-header` |
| branding | ブランディング | あり | なし | GR Scheduler の名称と著作権表示 | `app-branding` / `grsch-header-branding` |
| schedule title | 日程表タイトル | あり | なし | 文書の名前。クリックまたは F2 で編集する | `schedule-name-editor` / JSON `title` |
| command palette | コマンドパレット | なし | 全体 | 描画と表示を操作するボタン群。ドラッグで移動できる浮遊パネル | `command-palette` (UI 表示は D-7 で協議) |
| palette group | パレットグループ | なし | なし | パレット内のボタンのまとまり (Add など) | `grsch-cmd-group` |
| activity title panel | アクティビティ見出しパネル | なし | なし | 画面左の固定パネル。アクティビティの見出しを分類階層で表示する (旧 分類ペイン。D-17) | `activity-title-panel` (改名予定、現 `left-classification-pane` / i18n `classification_pane`) |
| panel divider | パネル分割線 | なし | なし | 左パネルの幅を変えるドラッグ境界 | `left-pane-divider` (改名予定) |
| schedule canvas | 日程表キャンバス | なし | なし | 中央の描画領域。行とアイテムを描く | i18n `schedule_canvas` (D-11) |
| time ruler | 時間軸ルーラー | なし | なし | キャンバス上端の年・月・日・曜の目盛り | `grsch-ruler-bg` / `RulerLayer` |
| properties panel | プロパティパネル | なし | あり | 右側の属性編集パネル | `grsch-prop-panel` / `toggle-properties` |
| help modal | ヘルプ | あり | なし | 操作説明のモーダル | `help-dialog` / `open-help` |
| AI export modal | AI 連携出力 | あり | なし | 文書 JSON を AI へ渡すためのモーダル | `ai-dialog` / `open-ai` |
| hidden section tab | 非表示セクションタブ | なし | なし | 隠したセクションを戻す小タブ | `hidden-section-tab` |
| autosave status | 自動保存の状態 | あり | なし | localStorage への保存の成否表示 | `grsch-save-status` / i18n `autosave_status` |

### 3.2 ヘッダーの操作 (左から順)

順序の唯一の正は `HEADER_ELEMENT_ROLES` (`src/app/header-model.ts`)。

| English | 日本語 | ヘッダー | パレット | 説明 | 実装 |
|---|---|---|---|---|---|
| fit to content | 全体表示 | `Fit` | `⤢` | 日程全体がビューポートに収まるよう合わせる | `header-fit` / `fit-to-content` |
| command palette toggle | コマンドパレット表示切替 | `Cmd` | なし | コマンドパレットの表示と非表示を切り替える (旧 `P`、D-6 で確定) | `header-palette-toggle` |
| screenshot | スクリーンショット | `SS` | なし | ビューポートの画像をクリップボードへ複写する | `screenshot` |
| load | 読み込み | `Load` | なし | JSON / MSPDI XML を取り込むメニュー | `load` |
| save | 保存 | `Save` | なし | JSON / MSPDI XML / SVG を書き出すメニュー | `save` |
| theme | テーマ | `Light` `Dark` `Mono L` `Mono D` | なし | 4 モードの配色選択 | `theme-light` ほか / `THEME_BUTTON_SPECS` |
| baseline | 変更前予定 (ベースライン) | `Base V` `Base I` | なし | 変更前の予定を参照文書として重ねる表示の切替 | `baseline-visible` / `baseline-invisible` |
| undo | 元に戻す | `↶` | なし | 直前の操作を取り消す | `undo` |
| redo | やり直し | `↷` | なし | 取り消した操作をやり直す | `redo` |
| AI export | AI 連携出力 | `AI` | なし | AI へ渡す JSON を表示するモーダルを開く | `open-ai` |
| help | ヘルプ | `?` | なし | 操作説明のモーダルを開く | `open-help` |

### 3.3 パレットの操作

| English | 日本語 | ヘッダー | パレット | 説明 | 実装 |
|---|---|---|---|---|---|
| properties panel toggle | プロパティパネル表示切替 | なし | `▤` | 右のプロパティパネルを開閉する | `toggle-properties` |
| fullscreen | 全画面表示 | なし | `⛶` | Fullscreen API で全画面にする | `toggle-fullscreen` |
| dependency link mode | 依存リンクモード | なし | `↔` | クリックで依存線をつなぐモード | `toggle-link` |
| plan display | 予定の表示 | なし | `P` | 予定側の可視性を切り替える | `toggle-plan` / i18n `plan_display` |
| actual display | 実績の表示 | なし | `A` | 実績側の可視性を切り替える | `toggle-actual` / i18n `actual_display` |
| plan-actual style | 予実スタイル | なし | `Ao` `As` | 予実を重ねるか上下に分けるかの排他選択 | `plan-actual-style-mode` |
| cursor guide mode | ガイドカーソルのモード | なし | あり (4 種) | ガイド無し・十字・縦1本・縦2本の排他選択 | `cursor-guide-mode` |
| date gridline | 日付グリッド線 | なし | あり | 日付の縦罫線の表示切替 | `toggle-grid-date` |
| category gridline | 分類グリッド線 | なし | あり | 分類の横罫線の表示切替 | `toggle-grid-category` |
| progress line | イナズマ線 | なし | あり | 実績の進み遅れを折れ線で示す線の表示切替 | `palette-progress-line-toggle` |
| add comment | コメント追加 | なし | あり | 引き出し線付きのコメントを置く | i18n `add_comment` |
| add box | 枠追加 | なし | あり | 丸角の囲み枠を置く | i18n `add_box` |
| watermark | 透かし | なし | あり | 画面全体の斜めタイル識別表示の切替 | i18n `watermark` |
| assignee display | 担当者名の表示 | なし | あり | 担当者名の表示切替 | `palette-assignee-toggle` |
| font scale | 文字サイズ | なし | あり | 小・中・大の 3 段階 | JSON `fontScale` (`S` / `M` / `L`) |

---

## 4. アイテムと字形

| English | 日本語 | ヘッダー | パレット | 説明 | 実装 |
|---|---|---|---|---|---|
| item | アイテム | なし | なし | マイルストーン (点) またはタスク (期間) の総称 | `ScheduleItem` |
| milestone | マイルストーン | なし | あり | 特定日を表す点イベント | `itemKind` が `'milestone'` |
| task | タスク | なし | あり | 開始日と終了日を持つ期間 | `itemKind` が `'task'` |
| bar | 矩形 | なし | あり | 矩形のタスク字形。フェード設定可 | `'bar'` |
| chevron | 矢羽根 | なし | あり | 矢羽根のタスク字形。フェード設定可 | `'chevron'` |
| arrow | 矢印 | なし | あり | 線と矢尻のタスク字形。フェード設定不可 | `'arrow'` |
| span glyph | スパン字形 | なし | あり | 両端に点を持つ細線のタスク字形。フェード設定不可 | `'span'` |
| task shape | タスク字形 | なし | なし | タスクの見た目の種類 (bar / chevron / arrow / span) | `TaskShape` / JSON `taskShape` |
| milestone shape | マイルストーン字形 | なし | なし | マイルストーンの見た目の種類 (菱形ほか) | `MilestoneShape` / JSON `milestoneShape` |
| icon shape kind | アイコン字形種別 | なし | なし | タスク字形とマイルストーン字形を統合した種別 | `IconShapeKind` / JSON `iconShapeKind` |
| abbreviation | 略称ラベル | なし | なし | アイテムに添える短い名前。アイテムとは独立に移動できる | JSON `abbreviation` (改名予定、現 `abbrev`。D-10) |
| abbreviation position | 略称ラベル位置 | なし | なし | 略称ラベルの字形に対するアンカー位置 | JSON `abbreviationPosition` (改名予定、現 `labelPosition`) |
| abbreviation offset | 略称ラベルオフセット | なし | なし | アンカーからの画面座標のずらし量 | JSON `abbreviationOffset` (改名予定、現 `labelOffset`。`dx` / `dy`) |
| full name | 正式名称 | なし | なし | アイテムの正式な名前 | JSON `fullName` |
| description | 説明 | なし | なし | アイテムの自由記述 | JSON `description` |
| assignee | 担当者 | なし | なし | 責任を持つ人または組織 | JSON `assignee` |
| remarks | 備考 | なし | なし | 補足の自由記述 | JSON `remarks` |
| progress status | 進捗ステータス | なし | なし | 進捗の自由文字列ラベル。数値の進捗率とは別 | JSON `progressStatus` (改名予定、現 `status`。D-8) |
| progress ratio | 進捗率 | なし | なし | アイテム区間に対する進捗の割合 (0 以上 1 以下) | JSON `progressRatio` |
| fade-in | フェードイン | なし | なし | バー左端のテーパ。開始日の曖昧さを表す | JSON `fadeInDays` |
| fade-out | フェードアウト | なし | なし | バー右端のテーパ。終了日の曖昧さを表す | JSON `fadeOutDays` |
| importance | 重要度 | なし | なし | 0 以上 1 以下の重み。詳細度の選別に使う | JSON `importance` |
| fill color | 塗り色 | なし | なし | 字形の塗り | JSON `fillColor` / `fillColorExplicit` |
| stroke color | 線色 | なし | なし | 字形の輪郭線の色 | JSON `strokeColor` |
| line weight | 線の太さ | なし | なし | 字形の輪郭線の太さ | JSON `lineWeight` |

---

## 5. 予定と実績

| English | 日本語 | ヘッダー | パレット | 説明 | 実装 |
|---|---|---|---|---|---|
| plan | 予定 | なし | `P` | 計画された日程。開始日と終了日を持つ | JSON `planStart` / `planEnd` (改名予定、現 `startDate` / `endDate`。D-9) |
| actual | 実績 | なし | `A` | 実際に起きた日程。記録されるまでデータは存在しない | JSON `actualStart` / `actualEnd` |
| plan start date | 予定開始日 | なし | なし | 予定の開始日 (データ) | JSON `planStart` (改名予定、現 `startDate`) |
| plan end date | 予定終了日 | なし | なし | 予定の終了日 (データ) | JSON `planEnd` (改名予定、現 `endDate`) |
| actual start date | 実績開始日 | なし | なし | 実績の開始日 (データ) | JSON `actualStart` |
| actual end date | 実績終了日 | なし | なし | 実績の終了日 (データ) | JSON `actualEnd` |
| deadline | 期限 | なし | なし | 「この日までに終える」独立マーカー。終了日とは別。MSPDI の Deadline と往復する | JSON `deadline` (改名予定、現 `targetDate`。D-13) |
| progress line | イナズマ線 | なし | あり | 実績を基準日で折れ線状に結び、遅れと進みを可視化する線 | JSON `progressLineVisible` |
| baseline | 変更前予定 (ベースライン) | あり | なし | 変更前の予定。別文書として読み込み重ねて表示する | `baseline-visible` |
| plan-actual style | 予実スタイル | なし | `Ao` `As` | 予定と実績の縦方向の描き方 (overlap / separate の排他選択) | JSON `planActualStyle` |
| overlap | 重ね表示 | なし | `Ao` | 予定バーと実績バーを同じ行の同じ高さに重ねて描くスタイル。両者が縦に重なる | `'overlap'` |
| separate | 上下分離表示 | なし | `As` | 実績バーを予定バーの直下の別レーンに積んで描くスタイル。行の高さがその分伸びる | `'separate'` |
| plan side visibility | 予定側の可視性 | なし | `P` | 予定側の 3 状態 (非表示 / 表示のみ / 操作可能)。CR-017 | JSON `planSideVisibility` (新設予定) |
| actual side visibility | 実績側の可視性 | なし | `A` | 実績側の 3 状態 (非表示 / 表示のみ / 操作可能)。CR-017 | JSON `actualSideVisibility` (新設予定) |

用語の使い分け (重要):

- 「開始日 / 終了日」は日付そのもの (データ)。実装は `planStart` / `actualEnd` 等。
- 「開始点 / 終了点」は画面上で掴む場所 (マウス操作)。§6 で定義する。
- 日付を指すときに「開始点」と言わない。掴む場所を指すときに「開始日」と言わない。

---

## 6. マウス操作と掴み領域 (Pointer Regions & Handles)

ポインタがアイテムや注記のどこに当たったかで、始まる操作が変わる。掴める場所を
「掴み領域 (hit region)」と呼び、そのうちドラッグの起点になる小さな領域を
「掴み点 (handle)」と呼ぶ。唯一の正はヒットテスタ (`src/adapters/render/hit-tester.ts`) と
辺判定 (`src/domain/usecase/edge-hit.ts`)。実装値は判別用の文字列リテラル (§12 D-18)。

### 6.1 操作 (ジェスチャ)

| English | 日本語 | 説明 | 実装 |
|---|---|---|---|
| move | 平行移動 | 掴んだ対象を丸ごとずらす | ジェスチャ `mode: 'move'` |
| resize | リサイズ | 端を掴んで開始日または終了日を変える | ジェスチャ `mode: 'resize'` |
| label drag | ラベル移動 | 略称ラベルだけをずらす | region `'label'` から |
| anchor drag | アンカー移動 | コメントの引出し先をずらす | `mode: 'comment-anchor-move'` |

### 6.2 タスクの掴み領域 (予定側・実績側で共通)

| English | 日本語 | 説明 | 実装 (region) |
|---|---|---|---|
| start handle | 開始点 | バー左端。掴むと開始日を変える (resize) | `'resize-start'` |
| end handle | 終了点 | バー右端。掴むと終了日を変える (resize) | `'resize-end'` |
| task body | バー本体 | 開始点と終了点を除いた中間部。掴むと平行移動 (move) | `'body'` (改名検討 `'task-body'`。D-19) |

予定側の端点は予定日を、実績側の端点は実績日を書き換える (CR-017)。

### 6.3 タスク字形に固有の掴み点 (予定側のみ)

| English | 日本語 | 説明 | 実装 (region) |
|---|---|---|---|
| fade-in handle | フェードイン掴み点 | バー左上の角。掴むと fade-in 量を変える。bar と chevron のみ | `'fade-in'` |
| fade-out handle | フェードアウト掴み点 | バー右下の角。掴むと fade-out 量を変える。bar と chevron のみ | `'fade-out'` |

arrow と span はフェード掴み点を出さない (ユーザー確定)。

### 6.4 マイルストーンの掴み領域

| English | 日本語 | 説明 | 実装 |
|---|---|---|---|
| milestone point | マイルストーン点 | 点そのもの。掴むと平行移動 (move)。端点も辺も持たない | `isTask` が false のため region は常に `'body'` |

マイルストーンには開始点・終了点・フェード掴み点は無い。

### 6.5 略称ラベルの掴み領域

| English | 日本語 | 説明 | 実装 (region) |
|---|---|---|---|
| abbreviation handle | 略称ラベル掴み | ラベル本体。掴むとラベルだけを平行移動する | `'label'` (改名検討 `'abbreviation'`。D-10) |

掴みの優先順位は「端点 > 略称ラベル > バー本体」(CR-017)。

### 6.6 注記の掴み領域

| English | 日本語 | 説明 | 実装 (region) |
|---|---|---|---|
| box body | 枠本体 | 丸角囲みの内部。掴むと平行移動 | `'body'` |
| box corner handle | 枠の角掴み | 丸角囲みの 4 隅。掴むとリサイズ | `'resize-nw'` / `'resize-ne'` / `'resize-sw'` / `'resize-se'` |
| comment body | コメント本体 | 吹き出しの本体。掴むと平行移動 | `'body'` |
| leader anchor handle | 引出しアンカー掴み | コメントの引出し線の先端。掴むと指す先を変える | `'anchor'` |

### 6.7 依存線の掴み領域

| English | 日本語 | 説明 | 実装 |
|---|---|---|---|
| dependency anchor | 依存アンカー | 依存線の引出し口。外接矩形の 9 点 (0 が左上、8 が右下) | JSON `fromAnchor` / `toAnchor` |
| bend | 折れ点 | 依存線の折れ曲がり点 | JSON `bends` |

---

## 7. 行・アクティビティ分類

Section の概念は廃止した (D-3/4/5 確定)。行のまとまり・畳み・並べ替え・表示切替は、
最上位の分類 (activity major category) が担う。分類は 3 層に一本化し、`Activity` を
接頭辞に付ける。旧語 (section / classification / track / detail、旧ラベルの二重定義) は
すべて廃止する。

| English | 日本語 | ヘッダー | パレット | 説明 | 実装 |
|---|---|---|---|---|---|
| ribbon | 帯 | なし | なし | 日程キャンバスの 1 段。複数アイテムを横並べに載せる | 未確認 |
| row | 行 | なし | なし | アクティビティ見出しパネルの 1 項目と、対応するキャンバスの帯 | `Row` / JSON `rows` |
| lane | レーン | なし | なし | 行の中でアイテムが重ならないように積まれる段 | `laneIndex` |
| activity major category | アクティビティ大分類 | なし | なし | 分類階層の第 1 層。畳み・並べ替え・表示切替の単位 (旧 section を兼ねる) | JSON `activityMajorCategory` (改名予定、現 `majorCategory` / `majorLabel`) |
| activity middle category | アクティビティ中分類 | なし | なし | 分類階層の第 2 層 | JSON `activityMiddleCategory` (改名予定、現 `middleCategory` / `middleLabel` / `classificationLabel`) |
| activity minor category | アクティビティ小分類 | なし | なし | 分類階層の第 3 層 | JSON `activityMinorCategory` (改名予定、現 `minorCategory` / `minorLabel` / `subClassificationLabel`) |
| activity category depth | 分類の深さ | なし | なし | 行が属する層 (0 が大分類、1 が中分類、2 が小分類) | JSON `depth` |
| declared activity category | 宣言済み分類 | なし | なし | アイテムが未使用でも保持する分類の組 | JSON `declaredCategories` (改名検討) |
| activity category node | アクティビティ分類ノード | なし | なし | 見出しパネルの木構造の 1 節点 | `node-name` / `node-controls` / JSON `classificationNodeStates` |
| activity category gridline | 分類グリッド線 | なし | あり | 分類の境界を示す横罫線 | `toggle-grid-category` |

`activity title`（アクティビティ見出し）は、上記いずれかの分類ノードがパネルに表示する見出し文字列を指す。
アイテム (task / milestone) を `activity` に改名するかは D-22 で協議中。

---

## 8. 時間軸・ズーム・詳細度

| English | 日本語 | ヘッダー | パレット | 説明 | 実装 |
|---|---|---|---|---|---|
| epoch date | 基準原点日 | なし | なし | 時間軸の原点となる暦日。時間軸はここから開放端 (最終日という格納値は無い。D-20) | JSON `epochDate` |
| day number | 日番号 | なし | なし | 基準原点日からの経過日数 | `toDayNumber` |
| world coordinate | ワールド座標 | なし | なし | スクロール前の描画座標系 | `worldX` / `worldY` |
| screen coordinate | スクリーン座標 | なし | なし | スクロール後の画面座標系 | `screenX` / `screenY` |
| zoom | ズーム | なし | なし | 拡大縮小の倍率 | JSON `zoomX` / `zoomY` |
| anisotropic zoom | 異方性ズーム | なし | なし | 縦と横を独立に拡大縮小できるズーム | JSON `zoomX` と `zoomY` が独立 |
| level of detail | 詳細度 | なし | なし | ズーム率に応じて時間軸粒度と表示アイテムを増減する仕組み。散文では LOD と略す | `LevelOfDetail` (型)。実装識別子は未確認 |
| time axis granularity | 時間軸粒度 | なし | なし | ルーラーの刻み (年 / 年月 / 月日曜) の 3 段階 | 未確認 |
| today line | 本日線 | なし | あり | 今日の日付を示す縦線 | JSON `todayLineVisible` |
| date gridline | 日付グリッド線 | なし | あり | 日付の境界を示す縦罫線 | JSON `gridDateLinesVisible` |

---

## 9. カーソル・注記・依存線

### 9.1 カーソル系 (family)

デュアルカーソルは「2 本のカーソルで日数を測る」機能、ガイドカーソルは「ポインタに
追従する補助線」機能で、別物。ガイドは 4 モードの排他選択。

| English | 日本語 | ヘッダー | パレット | 説明 | 実装 |
|---|---|---|---|---|---|
| dual cursor | デュアルカーソル | なし | あり | 任意位置に立てる 2 本のカーソル。間の日数を測る | JSON `dualCursor` (`primary` / `secondary` / `visible`) |
| measured span | 計測スパン | なし | なし | デュアルカーソル間の日数。タスク字形の span とは別語義 (D-16) | `measuredSpanDays` (新設予定) |
| cursor guide | ガイドカーソル | なし | あり | ポインタに追従する補助線。次の 4 モードの排他選択 | JSON `cursorGuideMode` |
| guide off | ガイドなし | なし | あり | 補助線を出さない | `'none'` |
| crosshair guide | 十字ガイド | なし | あり | 縦線 1 本 + 横線 1 本がポインタを追う | `'crosshair'` |
| single-vertical guide | 縦1本ガイド | なし | あり | 縦線 1 本がポインタを追う | `'single-vertical'` |
| double-vertical guide | 縦2本ガイド | なし | あり | 縦線 2 本 (固定基準線 + ポインタ線)。計測スパンに使う | `'double-vertical'` |

注意: `CursorMode = 'vertical-line' | 'crosshair'` という別の型も残っている (D-21)。

### 9.2 注記・依存線

| English | 日本語 | ヘッダー | パレット | 説明 | 実装 |
|---|---|---|---|---|---|
| annotation | 注記 | なし | なし | コメントと囲み枠の総称 | JSON `annotations` / `annotationKind` |
| comment | コメント | なし | あり | 引き出し線付きの吹き出し。吹き出しと折れ線の 2 種を持つ | `'callout-box'` / `'polyline'` |
| rounded box | 丸角囲み (枠) | なし | あり | 任意範囲を囲む丸角の矩形。UI 表示名は「枠追加」 | `'rounded-box'` |
| dependency | 依存線 | なし | なし | アイテム間の前後関係を示す線 | JSON `dependencies` |
| link type | 依存の型 | なし | なし | FS / SS / FF / SF などの前後関係の種別 | JSON `linkType` |
| lag | ラグ | なし | なし | 依存関係に与える遅れ日数 | JSON `lagDays` |
| watermark | 透かし | なし | あり | 画面全体に薄く斜めタイル配置する識別表示 | JSON `watermark` (`enabled` / `userName` / `timestamp` / `hideHash`) |

依存アンカーと折れ点の掴み操作は §6.7 を参照。

---

## 10. データ形式 (JSON 文書の構造)

唯一の正は `docs/api/gr-scheduler.schema.json`。本節はその構造の見出しだけを示す。

| 階層 | プロパティ | 内容 |
|---|---|---|
| 文書 | `projectId` `schemaVersion` `title` `epochDate` | 文書の身元とスキーマ版 |
| 文書 | `viewState` | 表示状態 (ズーム・スクロール・各種表示切替) |
| 文書 | `sections` `rows` `items` | 構造の本体 |
| 文書 | `declaredCategories` `classificationNodeStates` | 分類の宣言と表示状態 |
| 文書 | `dependencies` `annotations` | 依存線と注記 |

面ごとの記法の違い (同じ概念でも記法が変わる):

| 概念 | JSON | i18n キー | プロパティパネルの項目名 | DOM の `data-role` |
|---|---|---|---|---|
| フェードイン | `fadeInDays` | 未確認 | `fade_in_days` | なし |
| 予実表示 | `planSideVisibility` / `actualSideVisibility` (新設予定) | `plan_display` / `actual_display` | なし | `toggle-plan` / `toggle-actual` |
| 全体表示 | なし | `fit_to_content` | なし | `header-fit` / `fit-to-content` |
| イナズマ線 | `progressLineVisible` | `progress_line` | なし | `palette-progress-line-toggle` |

---

## 11. 外部の語・規格

| English | 日本語 | 説明 |
|---|---|---|
| MSPDI | MSPDI | Microsoft Project Data Interchange。MS Project の XML 交換形式 |
| CUD | カラーユニバーサルデザイン | Color Universal Design。色弱者に配慮した配色設計。原色を避ける |
| EARS | EARS | Easy Approach to Requirements Syntax。要求文の構文パターン |
| WYSIWYG | WYSIWYG | What You See Is What You Get。見たまま編集 |
| WCAG | WCAG | Web Content Accessibility Guidelines。本製品の目標はレベル AA |
| SVG | SVG | Scalable Vector Graphics。画面出力の形式 |

---

## 12. 用語の揺れ (記録のみ。判断は要協議文書を参照)

各項目の詳細と選択肢は `docs/analysis/glossary-open-questions-ja.md` にある。
確定済みは目標名を §4-§9 に反映済み。

| ID | 揺れ | 状態 |
|---|---|---|
| D-1 | 端点という語 | 確定。開始日/終了日 (データ) と 開始点/終了点 (掴み) を分離 (§5・§6) |
| D-2 | LOD の識別子 | 確定。型は `LevelOfDetail` |
| D-3 | セクションと大分類 | 確定。Section 廃止。activity major category が畳み・並べ替えを兼ねる |
| D-4 | 分類の語彙が 4 系統 | 確定。`activityMajor/Middle/MinorCategory` へ一本化 |
| D-5 | 中分類・小分類の二重定義 | 確定。旧ラベル廃止、新フィールドへ一本化 |
| D-6 | `P` の衝突 | 確定。ヘッダーは `Cmd` (command palette)、パレットは `P` (plan) |
| D-7 | パレットの二重名 | 協議中。`command palette` へ統一案 |
| D-8 | `status` が汎用語 | 確定。`progressStatus` (改名予定) |
| D-9 | 予定日付に `plan` が付かない | 確定。`planStart` / `planEnd` (改名予定) |
| D-10 | 略称ラベルの二重名 | 確定。`abbreviation` に統一 (改名予定) |
| D-11 | キャンバスの英日不一致 | 確定。`Schedule canvas` / 日程表キャンバス |
| D-13 | `targetDate` の名前 | 確定。`deadline` (改名予定) |
| D-14 | 予実表示の値 | 確定。`planSideVisibility` / `actualSideVisibility` (新設予定) |
| D-16 | span の二義 | 確定。計測側は `measuredSpanDays` (新設予定) |
| D-17 | pane と panel の非対称 | 確定。両方 panel。左 Activity Title Panel / 右 Properties Panel |
| D-18 | 文字列判別値の kebab / camel | 確定。kebab 維持 |
| D-19 | `'body'` が何の本体か不明 | 確定。日本語のみ分ける (バー本体 / 枠本体 / コメント本体)。判別値 `'body'` は維持 |
| D-20 | 最終日の格納値が無い | 記録。派生値のみ |
| D-21 | `CursorMode` と `CursorGuideMode` の重複 | 記録。次セッションで調査 |
| D-22 | アイテムを activity に改名するか | 協議中 (新規) |
