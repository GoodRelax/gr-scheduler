# 用語集の要協議事項

- 作成: 2026-07-23 / 改訂: 2026-07-23 (第2版。ユーザー確定を反映し、新規 5 件を追加)
- 対象: `docs/spec/glossary.md`（製品用語の SSOT）
- 使い方: 各項目は「現状 → 選択肢 → 推奨」。決めてほしいのは「決定」欄だけ

読む順: §0 実測決着 → §1 確定済み (記録) → §2 いま整理したい (section/category) →
§3 今回新たに出た協議事項 → §4 据え置き → §5 用語集の未完部分

---

## 0. 実測で決着した件 (判断不要)

### 用語集の置き場所

質問「`docs/spec` 配下でないと StrictDoc で参照・表示できないのでは？」→ そのとおり。
ただし理由は「StrictDoc は入力フォルダ内の Markdown も文書として取り込む」ため。

- `docs/spec/glossary.md` を置いて `strictdoc export docs/spec` → publish 成功、
  `output/html/spec/glossary.html` ほか 4 本を生成。Markdown 表は `<table>` で描画。
- 先例: `docs/spec/_assets/*.md`（アーキ図 7 本）が既に同じ仕組みで publish 済み。
- 対応済み: 用語集は `docs/spec/glossary.md` に配置。`docs/glossary.md` は削除。

制約 (守ること): この Markdown は docutils を通るため、CJK に隣接した `**太字**` は
変換されず literal のまま出る。用語集では太字を使わない。

### 最終日 (D-20)

質問「epoch date があるなら最終日の定義は？」→ 最終日に相当する格納フィールドは無い。
時間軸は `epochDate`（原点）から開放端で、右端はコンテンツとスクロールで決まる派生値。
コードを確認済み（`epochDate` 以外に軸の終端を持つ状態は存在しない）。
用語が要るなら「派生のコンテンツ終端日」だが、格納値ではないので用語集には
説明だけ載せた。新フィールドは提案しない (要れば別途)。

---

## 1. 確定済み (記録。用語集へ反映済み)

ユーザー 2026-07-23 の指示で確定。目標名を `glossary.md` の §4-§9 に反映した。
改名を伴うものは現行コードがまだ旧名なので、実際の改名は CR 作業。

| ID | 確定内容 | 改名の有無 |
|---|---|---|
| D-1 | 端点を廃止。開始日/終了日 (データ) と 開始点/終了点 (掴み) を分離 | 用語のみ |
| D-2 | LOD の型は `LevelOfDetail` | 実装時に反映 |
| D-6 | ヘッダーは `Cmd` (command palette)、パレットは `P` (plan) | ヘッダー字を `P`→`Cmd` |
| D-8 | `status` → `progressStatus` (末尾 Label は付けない) | JSON 改名 |
| D-9 | `startDate`/`endDate` → `planStart`/`planEnd` | JSON 改名 (対称化) |
| D-10 | 略称ラベルを `abbreviation` に統一 (`abbrev`/`labelPosition`/`labelOffset` を寄せる) | JSON 改名 |
| D-11 | `Schedule canvas` / 日程表キャンバス に統一 | i18n 英語を修正 |
| D-13 | `targetDate` → `deadline` | JSON 改名 |
| D-14 | `planActualDisplay` → `planSideVisibility` + `actualSideVisibility` | JSON 構造変更 |
| D-16 | 計測スパンは `measuredSpanDays` | 新設 |
| D-3/4/5 | Section 廃止・アクティビティ分類 3 層へ一本化 (§2) | JSON 構造変更 |
| D-17 | 両方 panel。左 Activity Title Panel / 右 Properties Panel | DOM 改名 |
| D-18 | 文字列判別値は kebab 維持 | 変更なし |
| D-19 | `'body'` は日本語のみ分ける (既定案) | 変更なし |

改名 (D-8/9/10/13/14 + Section 廃止) は `schemaVersion` を上げてマイグレーションが要る。
CR-017 (三状態モデル) と混ぜず、独立した「用語正規化 CR」に切ることを推奨する。
理由: モデル変更の差分と機械的改名の差分が同じコミットに乗ると、レビューが読めなくなる。
順序は §3 D-23 で協議。

---

## 2. 確定 — アクティビティ分類モデル (旧 D-3 / D-4 / D-5)

ユーザー確定 (2026-07-23):「Section はもうやめよう」。分類は `Activity` 接頭辞の 3 層へ
一本化する。以前の案 C (Section 廃止・3 層) を採り、命名を Activity 系にした。

### 2.0 確定した命名

| 役割 | 確定名 | 旧 |
|---|---|---|
| 左パネルの領域 | Activity Title Panel (アクティビティ見出しパネル) | classification pane / section area |
| 第 1 層 | activity major category | major category / section |
| 第 2 層 | activity middle category | middle category / classification |
| 第 3 層 | activity minor category | minor category / detail |

- Section は概念ごと廃止。行の畳み・並べ替え・表示切替 (旧 item35-38) は
  最上位の activity major category が担う。
- 旧語 (section / classification / track / detail、中小分類の二重ラベル) はすべて廃止。

### 2.0.1 これで発生する変更 (CR 化する)

1. JSON: `sections[]` / `section.rowIds` / `row.sectionId` / `section.collapsed` /
   `section.order` を廃止し、畳み・順序・表示状態を activity major category へ移す。
   `majorCategory` → `activityMajorCategory` ほか改名。`schemaVersion` を上げて移行。
2. 仕様: `15-classification-sections.sdoc` の `SECT-*` 要求群を全面改訂
   (Section 前提の要求文を activity major category ベースへ)。
3. DOM: `left-classification-pane` → `activity-title-panel`、
   `track-label` / `detail-label` → `activity-middle-category-label` /
   `activity-minor-category-label`。E2E セレクタが動く。
4. UI 文字列: i18n `classification_pane` の見直し。

これは CR-017 (三状態モデル) とは無関係の大きな改名・データ移行なので、
独立した「用語正規化 CR」に切る。実装順は用語正規化を先にするか後にするかを要相談 (§3 D-23)。

### 2.0.2 参考: 検討した実データ構造 (確定前の調査)

```
ScheduleDocument
  ├ sections[]   … Section { id, name, order, rowIds[], collapsed }
  ├ rows[]       … Row { id, sectionId, depth(0|1|2),
  │                      majorLabel, middleLabel, minorLabel,      ← 新
  │                      classificationLabel, subClassificationLabel } ← 旧
  └ items[]      … Item { rowId, majorCategory, middleCategory, minorCategory, … }
```

つまり束ねる仕組みが 2 つある。

- Section が Row を束ねる (`section.rowIds` / `row.sectionId`)
- Row 自身が depth で大中小の階層を持つ (大分類の行が中小を配下に持つ)

さらに分類名が 3 系統 (アイテム属性 `majorCategory`、旧ラベル `classificationLabel`、
新ラベル `majorLabel`) で二重化している (D-5)。

### 2.2 何が問題か

1. Section と 大分類 (major category) がどちらも「行のまとまり」で、上下関係が不明 (D-3)。
2. 同じ 3 階層を面ごとに違う語で呼ぶ: category / classification / (左ペインの) track・detail (D-4)。
3. 中分類・小分類のラベルが旧新で二重定義 (D-5)。

(以下は確定前に検討したモデル案の記録。結論は §2.0 の案 C 系＝Section 廃止。)
案 A = セクションを表示単位として分類と直交させる案、
案 B = セクションを第 0 層に据える 4 段階層案、
案 C = セクション廃止で大分類が束ね役を兼ねる案。採用は案 C の命名を Activity 系にしたもの。

---

## 3. 今回の協議で確定した項目 (記録)

ユーザー確定 (2026-07-23):

### D-17. pane と panel の非対称 → 確定: 両方 panel

左 = Activity Title Panel、右 = Properties Panel。DOM 名 `left-classification-pane` →
`activity-title-panel` は E2E に響くので用語正規化 CR で。

### D-18. 文字列リテラル判別値 → 確定: kebab 維持

`'resize-start'` 等はそのまま。全 union 値 (`'actual-only'` 等) と一貫。
用語集の English 列 (start handle) と実装の判別値 (`'resize-start'`) は役割が違うと割り切る。

### D-19. `'body'` の曖昧さ → 確定 (既定案): 日本語のみ分ける

バー本体 / 枠本体 / コメント本体。判別値 `'body'` は維持 (D-18 kebab 維持と整合)。
ユーザーは明示回答しなかったが、推奨案 1 を既定として採用。異論があれば戻す。

### D-21. `CursorMode` と `CursorGuideMode` の重複 → 記録

`CursorMode = 'vertical-line' | 'crosshair'` と
`CursorGuideMode = 'none' | 'crosshair' | 'single-vertical' | 'double-vertical'` が併存。
実装を追って旧 `CursorMode` が未使用なら廃止。次セッションで調査。

### D-22. アイテムを activity に改名するか → 協議中 (新規)

**背景**: 分類を `Activity` 接頭辞にしたので、分類される当のアイテム (task / milestone) 自体を
`activity` と呼ぶかが問題になる。CLAUDE.md の「1 車種 = 1 行 = 全フェーズ」から、
1 行 (= 1 車種) を activity と捉える読み方もありうる。

**選択肢**:

1. アイテムは `item` (task / milestone) のまま。`Activity` は分類・パネルの接頭辞に限る
2. アイテムを `activity` に改名 (task / milestone は activity の種別)
3. 行 (row) を `activity` に改名 (1 行 = 1 アクティビティ)

**推奨**: **1**。改名の波及が最小。`Activity` は「分類ツリーとその見出しパネル」の名前空間に
限定し、アイテム/行の語はそのまま残す。2 や 3 は広範囲の改名で、利得より混乱が大きい。

**決定**: どれか。

### D-23. 用語正規化 CR を CR-017 の前と後どちらでやるか → 協議中 (新規)

改名系 (D-8/9/10/13/14 + Section 廃止 D-3/4/5) は `schemaVersion` を上げる大きな移行。
CR-017 (三状態モデル) の実装コードも `planActualDisplay` 等に触れるため、順序で干渉する。

**選択肢**:

1. 用語正規化を先 → CR-017。CR-017 が最初から新名で書ける (推奨)
2. CR-017 を先 → 用語正規化。三状態モデルを早く形にできるが、直後に大改名で差分が重なる

**推奨**: **1**。CR-017 が `planSideVisibility` 等の新名で書ければ、二度手間が無い。
ただし用語正規化は範囲が広く時間がかかるので、CR-017 を急ぐなら 2 も可。

**決定**: どちらか。

**決定**: 調査を次セッションで行う、で可か。

---

## 4. 据え置き (記録のみ)

### D-7. パレットの呼び名が 2 つある

コードは `command palette`、UI 表示は「メインツールバー」(i18n `toolbar` / `palette_toggle`)。
推奨は `command palette` / コマンドパレットへ統一 (ドラッグで動く浮遊パネルなので
「ツールバー」だと動かせない印象)。ヘッダーの `Cmd` (D-6 確定) とも整合する。
i18n 英日文字列の修正が要るので CR で。

---

## 5. 用語集の未完部分 (協議ではなく作業)

`glossary.md` の `実装` 列が `未確認` の語。次セッションで埋める。

- `ribbon` (帯) の実装識別子
- `level of detail` のプロパティ・関数識別子 (型は `LevelOfDetail` 確定)
- `time axis granularity` (時間軸粒度)
- i18n キーとプロパティパネル項目名の全対応表 (§10 は 4 行の抜粋のみ)

`00-overview.sdoc` §4 の旧用語集は、本用語集へのリンクだけを残す形に置き換える。
CR-017 の architect 作業で行う (未レビューの仕様差分を今入れないため)。
