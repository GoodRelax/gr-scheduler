# レビュー報告: DEF-009 / DEF-010 / CR-013〜CR-016 実装レビュー

- レビューID: R-CR013-016-implementation-review
- 日付: 2026-07-23
- レビュアー: review-agent
- 対象:
  - DEF-009（[DEF-009-actual-bar-occludes-plan-label.md](../defects/DEF-009-actual-bar-occludes-plan-label.md)）
  - DEF-010（[DEF-010-header-title-hardcoded.md](../defects/DEF-010-header-title-hardcoded.md)）
  - CR-013（[change-request-013-20260722-091015.md](../change-requests/change-request-013-20260722-091015.md)）
  - CR-014（[change-request-014-20260722-091148.md](../change-requests/change-request-014-20260722-091148.md)）
  - CR-015（[change-request-015-20260722-091302.md](../change-requests/change-request-015-20260722-091302.md)）
  - CR-016（[change-request-016-20260722-091430.md](../change-requests/change-request-016-20260722-091430.md)）
- 対象成果物: `src/domain/usecase/{layout-engine,plan-actual-geometry,plan-actual-display,progress-line-builder,viewport,mspdi-codec}.ts`、
  `src/domain/command/commands.ts`、`src/adapters/render/{hit-tester,item-geometry,svg-renderer,layers/item-layer}.ts`、
  `src/adapters/ui/{palette-icon,tool-palette,property-panel}.ts`、`src/app/{header-model,main}.ts`、
  新設テスト 4 ファイル・更新テスト 4 ファイル
- 適用観点: **R2**（設計原則）, **R3**（コーディング品質）, **R4**（並行性・状態遷移）, **R5**（パフォーマンス）
  （テストコードは合否判定材料としてではなく、主張の妥当性検証のため参照）

---

## 総合判定: **FAIL**

High 2 件が残存するため、フェーズ遷移（delivery 反映・コミット）を許可しない。
実装のコア（レーン単位の行伸長・12px フロアのズーム非依存性・ラベル最前面不変条件・
パレット/キャンバスの形状 SSOT・MSPDI 往復）はいずれも**正しく、テストで非空虚に固定されている**。
FAIL の原因は次の 2 点に限定される。

1. **実績バーがドラッグで「予定日付を動かす」掴み代になっている**（H-1、コード）
2. **CR が実装フェーズ成果物として明記した `docs/spec/**` の改訂が未実施で、仕様が実装と矛盾**（H-2、SSOT）

いずれも局所的な修正で解消可能であり、設計のやり直しは不要である。

### 重大度別 件数

| 重大度 | 件数 | 合格基準 | 判定 |
|--------|------|----------|------|
| Critical | 0 | 0 必須 | OK |
| High | **2** | 0 必須 | **NG** |
| Medium | 4 | 件数報告・対応方針の承認 | 報告済み |
| Low | 9 | 記録のみ | 記録済み |

### 品質ゲート実測値

| ゲート | コマンド | 結果 |
|--------|----------|------|
| 型チェック | `npx tsc --noEmit` | **0 エラー** |
| Lint | `npx eslint src tests` | **0 違反** |
| 単体・結合テスト | `npx vitest run` | **816 / 816 PASS（78 ファイル・0 fail）** |

---

## 焦点回答（依頼された確認項目）

### 1. 正しさ（CR-013）

| 確認項目 | 結論 | 根拠 |
|---|---|---|
| レーン単位（行単位でない）の伸長が正しいか | **正しい** | `layout-engine.ts:346-360` が `stacksActualBarBelowPlan` で**実績を積むレーン集合**を求め、`rowBandUnitHeight(laneCount, stackedLanes.size)`（同 202-208）が**その本数ぶんだけ**加算。時間重複 2 レーンで実績 1 本のケースは +1 段のみ（`tests/cr013-separate-row-growth.test.ts:192-211`） |
| 下位レーンが一貫して押し下がるか | **正しい** | `laneTopOf`（同 409-417）が「自分より上の stacked レーン数 × 追加分」を加算。上段実績バー下端 ≤ 下段レーン上端を検証済み（同テスト 213-231）。数式上も上段実績下端 = laneTop + 2.12×bar、下段上端 = laneTop + 2.231×bar で干渉なし |
| 追加分と実描画が同一定義か | **正しい（SSOT）** | `separateActualLaneExtraUnitHeight()`（`layout-engine.ts:90-92`）が `separateActualBarOffsetPx(BASE_LANE_HEIGHT × 0.9)` を呼ぶ。行が確保する量と幾何が描く量が同一関数由来で、ドリフト不能 |
| 12px フロアが真にズーム非依存か | **真にズーム非依存** | ワールド→スクリーンは平行移動のみ（`viewport.ts:93-95` の `screen = world - scroll`。倍率変換は `dateToWorldX` 側で world 座標に吸収済み）。したがって world px == screen px。`tests/cr013-separate-row-growth.test.ts:285-306` が zoomX = 0.25 / 1 / 4 で同一値を実測 |
| 当たり判定矩形と描画矩形が一致するか | **一致** | 双方が `plan-actual-display.computeItemDisplayedBars` / `actualSideLaneRect` を呼ぶ（`item-layer.ts:615-660` と `hit-tester.ts:170-212`）。フロアは `actualBarRenderWidthPx` 1 箇所 |
| 「body 専用」が予定終了日の誤書き換えを防ぐか | **防いでいる。ただし別の誤操作を生む（H-1）** | `hit-tester.ts:126` が実績側候補に `isTask: false` を与え、`edge-hit.edgeRegionAt` が常に `body` を返すためリサイズ辺は予定矩形にしか生じない（`tests/cr013-separate-row-growth.test.ts:384-394` が overlap 回帰を固定）。**しかし `body` は移動ジェスチャの起点でもある**（H-1） |
| ラベル最前面不変条件が遅延生成／モード切替に耐えるか | **耐える** | `labelLayer` は生成時に最後尾へ置かれ**一度も remove されない**（`item-layer.ts:243-249`）。バー/マーカーは `mountBeneathLabels` の `insertBefore`（同 662）経由。グリフ差し替えは `replaceWith`（同 290）で位置を保持するため fade 切替でも順序が壊れない。`tests/item-label-z-order.test.ts:257-300` が `[P]/[A]`・`[Ao]/[As]` 往復と再生成後を検証 |
| ヘッダー順序が単一定数由来か | **単一定数** | `HEADER_ELEMENT_ROLES`（`header-model.ts:60-...`）が唯一の正で、`HEADER_CONTROL_ROLES` はその派生（同 55-58 相当のフィルタ）。`HEADER_LEFT_CONTROL_ROLES` は廃止済み |
| タイトル束縛が dispatch/undo/redo/replaceDocument を網羅し、購読が二重化しないか | **網羅・二重化なし** | `bindHeaderTitleText`（`header-model.ts`）が `store.subscribe` に 1 回だけ登録し、`wireScheduleTitle`（`main.ts:1468-...`）は bootstrap から 1 回だけ呼ばれる。編集中は `dataset.editing` で再描画を抑止し、入力中テキストが購読通知で消えない。unsubscribe は返るが破棄（Low-6） |

### 2. 形状 SSOT（CR-014）

- **テストは「コピー」ではなく本物のキャンバスビルダー出力と突合している。** `tests/cr014-palette-icons.test.ts:206-248` は
  パレットボタンの `<path d>` を `taskGlyphPath(shape, paletteTaskGlyphRect(shape))` および
  `milestonePath(item, …)` の**実行結果**と `toBe` で比較する。期待値のハードコードは無く、
  キャンバス側の形状を変えればパレット側も同時に変わらない限り必ず落ちる。
- **`item-geometry.ts` のリファクタは 12 形状すべてで挙動同一。** `milestonePath` は
  `milestoneShapePath(effectiveMilestoneShape(item), …)` への薄いラッパへ変わっただけで（`item-geometry.ts:386-392`）、
  switch 本体は無改変。`item` を参照する分岐は残っておらず（残っていれば tsc が落ちる）、
  even-odd 判定も `milestoneShapeKindUsesEvenOdd` へ委譲した同値変換。12 形状の突合テストが全緑。
- 比率は `paletteSilverRungPx(n) = 20 / √2ⁿ` の等比ラダーから**導出**され、padding も残余リング
  `(rung0 − rung1)/2`。CSS も定数から生成（`palette-icon.ts:362-387`）されており数値の二重管理なし。

### 3. MSPDI（CR-016）

- **XSD シーケンス順に適合。** vendored `mspdi_pj12.xsd` の Project 子要素は UID(238) → Name(248) → Title(258) → … → CreationDate(318)。
  `mspdi-codec.ts:292-300` は `<Name>` → `<Title>` → `<CreationDate>` の順で出力しており適合（順序はテストでも固定）。
- **タスクの `<Name>` を拾わない。** `projectScalarScope`（同 445-452）が最初の `<Tasks` より前へスコープを限定し、
  `tests/cr016-project-title.test.ts:226-235` が回帰を固定。
- **往復ロスレス。** サイドカー経路（`toStrictEqual` で文書全体一致）・サイドカー無し経路の双方を検証済み。
- 残課題は Low-1（`<Calendars>` は XSD 上 `<Tasks>` より前に来るため、Project/Name も Title も持たない外部ファイルでは
  カレンダー名を拾いうる）のみ。

### 4. 保守性・命名（item60）

- マジックナンバーは実質排除。パレット寸法は白銀ラダー由来、行の追加高は幾何関数由来、
  `MIN_ACTUAL_BAR_WIDTH_PX` は根拠コメント付きの単一定数。例外は `PALETTE_ICON_STROKE_UNITS = 1.6` と
  bespoke アイコンの 20×20 グリッド座標のみで、これは作図値として妥当（Low-9 相当の記録に留める）。
- 命名は言霊規約に適合（`stacksActualBarBelowPlan` / `separateActualLaneExtraUnitHeight` /
  `resolveTitleEditOutcome` / `projectScalarScope` など、真偽値は `is/has/stacks/draws` 始まり、汎用語なし）。
- コード・コメント・ログはすべて英語 ASCII。デッドコードなし（`HEADER_LEFT_CONTROL_ROLES` は削除済み、
  旧 `actualSpanWorldX` のインライン実装は共有関数へ統合済み）。
- **既存テスト 2 件の更新は正当。** `tests/plan-actual-geometry.test.ts` と
  `tests/plan-actual-display-gating.test.ts` の変更は「バー高が半分になる」という**旧仕様の期待値**を
  「全高を保つ」へ置換したもので、`toBeLessThan(LANE_HEIGHT)` → `toBe(LANE_HEIGHT)` と**厳格化**されている。
  アサーションの弱体化・削除・skip は無い。

---

## 指摘事項

### High

#### H-1: 実績バーがドラッグ移動の掴み代になり、予定日付を意図せず書き換える

- **箇所**: `src/adapters/render/hit-tester.ts:184-185`（`actual-only` の単独実績矩形）、
  `src/adapters/render/hit-tester.ts:200-209`（`separate` の下段実績矩形）、
  経路として `src/domain/usecase/edge-hit.ts:117-118`（body へフォールバック）→
  `src/adapters/input/editing-controller.ts:1360-1373`（`mode: 'move'` 生成）→
  `src/domain/command/commands.ts:224-241`（`moveItemCommand` が `startDate`/`endDate` のみシフト）
- **問題**: 実績矩形が `body` ヒットを返すため、実績バーを掴んでドラッグすると**移動ジェスチャ**が開始し、
  `moveItemCommand` が**予定日付（startDate/endDate）**をずらす。実績日付は一切動かない。
  - `separate`（`[As]`）: 掴んだ実績バーはその場に留まり、掴んでいない予定バーだけが動く。
  - `actual-only`（`[A]` のみ）: 描画されている唯一のグリフ（実績）は動かないため**画面上は何も起きず**、
    裏で予定日付だけが書き換わる。次に `[P]` を点けたとき初めて予定がずれていることに気付く。
- **影響**: R2.14（POLA）違反かつ機能誤動作。CR-013 Part 2 が解決しようとした「実績バーを掴む」操作が、
  掴めるようになった結果**別のデータを壊す**。Undo 可能とはいえ、`actual-only` では変更に視覚的フィードバックが無く
  発生に気付けない。CR-013 が実績データのズーム非依存性・再現性を重視した趣旨（§1 課題 2）にも反する。
- **修正案**（いずれか）:
  1. **最小修正**: `itemGrabRects` の戻り値に既にある `isPlanSide` を `HitCandidate`／`ItemHit` まで伝搬し、
     実績側 body ヒットでは `EditingController` が移動ジェスチャを開始せず**選択のみ**を行う
     （`editing-controller.ts:1360` の直前で `hit.side === 'actual'` を早期リターン）。
  2. **CR-013 の意図どおりの実装**: 実績矩形に実績側のリサイズ／移動を割り当て、
     `actualStart`/`actualEnd` を書き込むコマンド（`resizeActualCommand` 等）を新設する（M-1 と同時解消）。
  - どちらを採るかは実装コストと CR-013 §6 受入基準の充足度から orchestrator 判断とし、
    1 を採る場合は M-1 の据置き記録が必須。

#### H-2: CR が実装フェーズ成果物として明記した仕様書改訂が未実施で、仕様が実装と矛盾している

- **箇所**:
  - `docs/spec/19-tools-watermark.sdoc:113-114`（`[Fit]` は「ヘッダーのボタン群の一番左（GR Scheduler +(c) ブランディングより左）」）、
    同 `:165-166`、同 `:185-186`（VERIFICATION が `Fit → P → GR Scheduler +(c) → タイトル → SS → …` を要求）
  - `docs/spec/40-data-format.sdoc:697`（`title` を `Project / Title` のみへマッピング）、同 `:702`（EXAMPLE が `<Title>` のみ）
- **問題**: `git status` 上 `docs/spec/**` は 1 ファイルも変更されていない。
  - CR-015 §3・§8 は `TOOL-L1-008` の並び順表と VERIFICATION の改訂を実装フェーズ成果物として明記している。
    現状、**仕様書の VERIFICATION が実装と正反対の順序を要求**しており、そのまま検証すれば FAIL する。
    新設テスト `tests/header-model.test.ts` は逆の順序を PASS 固定しているため、仕様とテストが真っ向から矛盾する。
  - CR-016 §2 Part 3・§3 は `DATA-MSPDI-001` に `title -> Project/Name`（Export 副次出力・Import フォールバック）の
    追記を求めている。現状、データ形式契約は `<Title>` のみを規定し、EXAMPLE も実出力と一致しない。
- **影響**: 本プロジェクトで既に DEF-002（doc-ssot-drift）として起票された欠陥クラスの再発。
  仕様書は StrictDoc によるトレース・被覆の SSOT であり、要求→実装→テストのトレーサビリティが切れる。
  データ形式契約の齟齬は外部連携（MS Project 相互運用）の判断根拠を誤らせる。
- **修正案**:
  1. `19-tools-watermark.sdoc` `TOOL-L1-008` の並び順表・STATEMENT・VERIFICATION を
     `GR Scheduler +(c) → タイトル → Fit → P → SS → …` へ改訂し、CR-006 Part 1/2 を CR-015 が supersede した旨を明記。
  2. `40-data-format.sdoc` `DATA-MSPDI-001` に `title -> Project/Name`（Export 副次・Import フォールバック、Title 優先）を追記し、
     EXAMPLE を `<Name>` 含みへ更新。
  3. 改訂後 `strictdoc export` を実行し緑を確認（CR 各 §6 の品質ゲート条件）。

### Medium

#### M-1: CR-013 の受入基準「実績バーの右端をドラッグすると actualEnd が書き込まれる」が未実装で、代替設計の決定記録がない

- **箇所**: CR-013 §2 Part 2・§6（受入基準 7 番目）に対し、実装は
  `src/adapters/ui/property-panel.ts:421-431`（`actual_end` 入力時に `actualStart` を `defaultActualStartDate` で補完）に置換。
  `src/adapters/render/hit-tester.ts:126` のコメントが「リサイズ辺は予定側のみ」と設計判断を述べるに留まる。
- **問題**: 承認済み CR の受入基準が未充足のまま「実装完了」として扱われている。
  トレーサビリティ表（`project-records/traceability/traceability-matrix.md`）にも
  「実績を追加する単発アフォーダンスは未実装」とは記されているが、**右端ドラッグ AC の不充足自体は記録されていない**。
- **影響**: 承認済み要求と実装の乖離が未追跡になる。ユーザーが「初回実績入力後に終了日を決める」原体験は
  プロパティパネル経由に変質しており、これは承認された操作系ではない。
- **修正案**: (a) H-1 の修正案 2 と併せて実績側ドラッグを実装する、または
  (b) `project-records/decisions/` に据置き決定（理由・リスク・解消時期）を作成し、CR-013 §6 の当該 AC に据置き注記を付す。

#### M-2: 当たり判定ホットパスで、境界判定より先に全マウント済みアイテムの日付演算を行うようになった

- **箇所**: `src/adapters/render/hit-tester.ts:109-121`（旧コードは `withinX/withinY` 判定で早期 `continue` してから
  `itemById.get` を行っていたが、現在は先に `itemGrabRects(ctx, placement)` を評価する）、
  被呼側 `hit-tester.ts:170-212` → `plan-actual-display.actualSpanWorldX` → `time-coordinate-mapper.toDayNumber`
  （`Date.parse` によるテンプレート文字列生成 + パース）
- **問題**: `hitTest` は `editing-controller.ts:373 / 484 / 1094 / 1139` から**ポインタ移動のたび**に呼ばれる。
  実績を持つアイテム 1 件あたり `dateToWorldX` が 4〜6 回（= `Date.parse` 4〜6 回）走り、
  それがマウント済み（可視）アイテム数ぶん、**カーソルが遠く離れていても**実行される。
  可視 200〜300 件 × 60Hz で毎秒 10 万回規模の日付パースとなり、NFR（中規模で 60fps）に対する余裕を削る。
- **影響**: R5.1／R5.4。機能不正はないが、RISK-001（性能）の主要ホットパスの劣化。
- **修正案**: 安価な AABB 判定を先に戻す。例: まず `planRect` で境界判定し、外れた場合でも
  「実績側矩形が存在しうる y 帯（レーン上端〜レーン下端 + `separateActualBarOffsetPx`）」に入るときだけ
  `itemGrabRects` を評価する。または実績スパンをレイアウト時に 1 回だけ算出して `ItemPlacement` 側へ持たせる
  （`toDayNumber` の結果キャッシュでも可）。

#### M-3: `PLAN-L1-005` が CR-013 の行高規則へ改訂されていない

- **箇所**: `docs/spec/18-plan-actual.sdoc:222` 以降（STATEMENT / RATIONALE / VERIFICATION、特に `:246-252`）
- **問題**: 記述は「予定バーと実績バーが上下に分離して描かれること」に留まり（**誤りではないが**）、
  CR-013 §2 Part 1・§3 が求めた「バー高は通常のまま維持し、実績を持つ行のみ行高が伸びる」という
  今回の中核決定が仕様に存在しない。行高決定はコアドメイン（レイアウトエンジン）へ新たな結合を導入した変更であり、
  現状その根拠はコードと CR 票にしかない。
- **影響**: R1.3 相当（唯一の正の欠落）。将来「Separate はバー高を半分にする」実装へ戻す変更を仕様が阻止できない。
- **修正案**: `PLAN-L1-005` の STATEMENT に行高拡張規則（実績を持つレーンのみ +1 段、バー高不変）を追記し、
  VERIFICATION に「実績を持たない行の高さが変化しないこと」「バー高が overlap と同一であること」を加える。

#### M-4: 実装完了後の記録更新が未実施（defect 状態・CR 受入基準チェック・段階化注記）

- **箇所**: `project-records/defects/DEF-010-header-title-hardcoded.md:8`（`状態: **Open**`。実際は修正済み・ライブ検証済み）、
  CR-013/014/015/016 各票 §6 の受入基準チェックボックスが全件 `- [ ]` のまま、
  各票冒頭の `段階化: 仕様先行 …実装は別セッションで行う` が実装完了後も未更新
- **問題**: DEF-009 は `Fixed（実機ライブ検証済み）` へ更新されているのに DEF-010 だけ `Open` で、
  同一バッチ内で記録粒度が不揃い。CR-016 §7 は「DEF-010 の記録更新・Closed 化判断は defect 管理側で行う」と
  明示的に宿題化しているが、その宿題が未消化。
- **影響**: プロセス規則上の追跡性欠落。次セッションが「未修正の defect が残っている」と誤読する。
- **修正案**: DEF-010 を `Fixed`（検証方法・日付付き）へ更新、CR-013〜016 の §6 を実測に基づきチェック
  （未充足の AC は未チェックのまま M-1 の据置き記録を参照）、§8 の段階化注記に実装完了日を追記。

### Low（記録のみ）

| ID | 箇所 | 内容 | 提案 |
|----|------|------|------|
| L-1 | `src/domain/usecase/mspdi-codec.ts:445-452` | `projectScalarScope` は「最初の `<Tasks` まで」を Project スカラ領域とするが、XSD 上 `<Calendars>`（1198行）は `<Tasks>`（1598行）より前。Project/Name も Title も持たない外部 MSPDI では `<Calendars><Calendar><Name>Standard</Name>` を拾いうる | スコープ終端を `<Tasks` に加え `<Calendars` / `<ExtendedAttributes` でも打ち切る。境界テストを 1 件追加 |
| L-2 | `src/domain/usecase/plan-actual-geometry.ts:111-113` | 12px フロアは overlap でも適用されるため、大きく引いた表示（実績スパンがフロア未満）では実績バーが**自分の予定バーより長く**なり、右へはみ出して「実績が予定を超過」と誤読させうる | 生スパンがフロア未満のときは `min(floor, max(planWidth, floor))` 等で予定バー右端を超えないようクランプ |
| L-3 | `src/adapters/render/layers/item-layer.ts:815 / 849 / 884` | fade ハンドル・選択アウトライン・フォーカスリングは従来どおり `group.appendChild` で**ラベル層より前面**に付く。DEF-009 の不変条件は「テキストはバーより前面」であり装飾は対象外だが、規約はコメントのみで担保されている | 装飾も `mountBeneathLabels` を通すか、`labelLayer` の JSDoc に「選択装飾は意図的に上」と例外を明記 |
| L-4 | `src/domain/usecase/layout-engine.ts:220-226` | `RowGeometry.stacksActualBars` の JSDoc は「左ペイン・エクスポータ・テストが読む」と述べるが、実消費者はテストのみ | JSDoc を実態へ修正するか、左ペインの整合検証に実際に用いる（YAGNI 観点では前者を推奨） |
| L-5 | `src/adapters/render/layers/item-layer.ts:621` | `const { actualStart: _droppedActualStart, ...planOnlyItem } = item;` が `epochDate` 有無に関わらず毎フレーム・毎アイテムで実行され、不要なオブジェクト複製を生む | 分割代入を `epochDate === undefined` の分岐内へ移動 |
| L-6 | `src/app/main.ts`（`wireScheduleTitle` 内 `bindHeaderTitleText(store, paintTitle)`） | 返り値の unsubscribe を破棄。アプリ生存期間と一致するため実害はないが、teardown 経路が存在しない | ハンドルを Chrome/Shell の破棄処理へ保持（将来のマルチインスタンス化に備える） |
| L-7 | `src/domain/usecase/svg-exporter.ts:77-82` | エクスポータは `computeRowGeometry` を共有するため `separate` 時に行が伸びるが、実績バー自体は描画しない（従来からの制限）。`[As]` 中のエクスポートは空白が広い行になる | エクスポータの予実描画対応を別 CR として起票、または `separate` を無視して `overlap` 相当で測る旨を JSDoc に明記 |
| L-8 | `src/app/main.ts`（`scheduleNameLabel` 構築部、`tabIndex = 0` 付与箇所） | 編集可能タイトルは `<span tabindex="0">` で role 未指定。支援技術には「名前のあるフォーカス可能な汎用要素」としてしか伝わらない | `role="button"`（または編集起動用の実ボタン併設）を付与し、WCAG 4.1.2 の Role を満たす |
| L-9 | `project-records/traceability/traceability-matrix.md`（CR-015/CR-016 ゲート節） | 「vitest 776 pass・5 fail」という**セッション途中のスナップショット**が最終値として残り、同一文書内の CR-014 節（816 pass / 0 fail）と矛盾して読める | 最終実測値へ統一し、途中経過は経緯として明示 |

---

## 観点別所見

### R2 設計原則

- **CA/DIP**: 行高という**ドメイン決定**がレンダラではなくユースケース層（`layout-engine`）に置かれた点は、
  CR-013 §2 の意図に対して正しい仕訳。`plan-actual-geometry` は純関数のまま保たれている。
  `header-model.HeaderTitleSource` は `ScheduleStore` 具象ではなく構造的インタフェースに依存しており DIP 適合。
  `palette-icon.ts`（Adapter/UI）が `item-geometry.ts`（Adapter/Render）と domain/usecase のビルダーを参照する方向も内向きで適正。
- **DRY/SSOT**: 形状（パレット↔キャンバス）、行の追加高（レイアウト↔幾何）、当たり判定↔描画、
  ヘッダー順序（要素↔コントロール）、空タイトル代替文字列——本バッチの主要な二重定義はすべて 1 箇所へ集約されている。
  今回の SSOT 破れは**コードではなく仕様書側**（H-2）に残る。
- **POLA**: H-1 が唯一かつ重大な違反。
- **SRP/KISS**: `layoutRows` は行高決定の責務が増えたが、判定は純粋述語へ委譲され関数内は平坦。`hitTester.itemGrabRects` も単責務。

### R3 コーディング品質

- eslint 0 / tsc 0（strict）。安全性未確認の `as` 追加なし（テスト内の意図的なキャストのみ）。
- `projectTitleFromMspdi` は `null` / 空白 / 両欠落の 3 分岐を明示的に処理し、既定値へフォールバック（防御的）。
- `property-panel.dispatchPatch` の `completePatch` フックは、対象アイテムが見つからない場合に元 patch を使う安全側動作。
- 例外の握り潰し・空 catch の新規混入なし。ログは名前空間付き `log.info` を使用し `console.log` 直呼びなし。

### R4 並行性・状態遷移

- 単一スレッド・同期処理であり、await をまたぐ共有状態更新は新規に無い。
- 状態遷移として重要な 2 点はいずれも整合:
  1. `SvgRenderer.setViewState` が `planActualStyle` / `planActualDisplay` 変化時に `layoutDirty` を立てる（`svg-renderer.ts:921-942`）。
     これが無ければ `[Ao]/[As]` 切替後に行高が古いまま描かれるグリッジになる。**正しく塞がれている。**
  2. タイトル編集中（`dataset.editing === 'true'`）は購読描画を抑止し、`settled` フラグで
     Enter / blur / Escape の二重確定を防止（中間状態の観測不能化）。
- 残存する軽微な穴: 編集中にウィンドウレベルの Undo ショートカットが発火した場合、
  編集確定時に古い入力値が上書きコミットされうる（発生条件が限定的なため指摘化せず記録に留める）。

### R5 パフォーマンス

- レイアウト: `stackedLanesOf` は行内アイテム数に線形、`laneTopOf` は最大 64 レーンの集合走査。計算量の悪化は無視できる。
- レンダー: ノード数は不変（実績バーは従来から存在）。`insertBefore` は `appendChild` と同等コスト。
- **当たり判定: M-2 の劣化あり。** 本バッチ唯一の実測影響が見込まれる箇所。
- メモリ: リスナ追加は bootstrap 時の定数個（タイトル関連 3 件）。リークなし。L-6 は teardown 不在の記録のみ。

### テスト品質（参考所見・R6 は本レビューの適用外）

- 新設 44 ケース（DEF-009 11 / CR-013 18 / CR-014 15）＋ CR-016 22 ケースはいずれも非空虚。
  特に「ズーム 3 水準での 12px 一定」「描画矩形＝掴み矩形」「12 形状のパス突合」「MSPDI タスク名誤認防止」は
  仕様の主張を直接固定しており良質。
- 既存テスト 2 件の更新は旧仕様の期待値置換であり、弱体化ではない（前掲）。
- `tests/header-model.test.ts` の「派生関係」テストのみ実装式をそのまま再掲するトートロジーだが、
  同ファイルの絶対順序テストが実値を固定しているため実害なし。

---

## 指摘対応テーブル

| ID | 重大度 | 観点 | 対応 | 対応者 | 状態 |
|----|--------|------|------|--------|------|
| H-1 | High | R2（POLA）/ 機能 | 修正必須（実績 body を選択専用にする、または実績側編集を実装） | implementer | 未対応 |
| H-2 | High | R2（SSOT）/ 文書 | 修正必須（`19-tools-watermark.sdoc` `TOOL-L1-008`・`40-data-format.sdoc` `DATA-MSPDI-001` 改訂＋strictdoc 緑確認） | architect / srs-writer | 未対応 |
| M-1 | Medium | 要求充足 | 実装するか、`project-records/decisions/` へ据置き記録を作成（要 orchestrator 承認） | change-manager | 未対応 |
| M-2 | Medium | R5 | 修正推奨（AABB 早期棄却の復活 or 実績スパンのキャッシュ） | implementer | 未対応 |
| M-3 | Medium | R1.3 相当 / 文書 | 修正推奨（`PLAN-L1-005` へ行高規則を追記） | architect | 未対応 |
| M-4 | Medium | プロセス | 修正推奨（DEF-010 を Fixed 化、CR §6/§8 更新） | orchestrator | 未対応 |
| L-1〜L-9 | Low | R2/R3/R5/a11y | 記録のみ（対応方針は orchestrator 判断） | — | 記録済み |

---

## FAIL 時のルーティング

| 指摘 | 戻り先 |
|------|--------|
| H-1, M-2 | **implementation フェーズ**（コード修正 → 再レビュー） |
| H-2, M-3 | **design フェーズ相当**（`docs/spec/**` 改訂 → strictdoc 緑確認 → 再レビュー） |
| M-1 | **change-manager**（実装 or 据置き決定記録。実装を選ぶ場合は implementation へ） |
| M-4 | **orchestrator / defect 管理**（記録更新のみ、コード変更なし） |

---

## 結論

DEF-009 / DEF-010 / CR-013〜016 の実装は、設計・命名・SSOT・テストのいずれにおいても質が高く、
コアの技術的主張（レーン単位の行伸長、ズーム非依存の 12px フロアと描画/当たり判定の一致、
ラベル最前面の構造的不変条件、パレットとキャンバスの形状 SSOT、MSPDI の順序適合とスコープ付きフォールバック）は
**いずれも検証によって裏付けられた**。品質ゲートは 3 種すべて緑（tsc 0 / vitest 816 pass 0 fail / eslint 0）。

一方で、(1) 実績バーを掴んだドラッグが予定日付を書き換える（`actual-only` では無反応のまま）という
機能誤動作、および (2) CR-015/CR-016 が実装フェーズ成果物として明記した仕様書改訂の未実施により、
仕様書の VERIFICATION が実装と正反対の内容を要求している状態が残る。前者はユーザーが最初に触る操作で
発生し、後者は本プロジェクトが既に DEF-002 として経験した SSOT ドリフトの再発である。

**判定: FAIL（High 2 件）。** 上記 2 件の解消後に再レビューを行い、Medium 4 件は
orchestrator の対応方針承認をもって処理する。

---
---

# 再レビュー（2026-07-23、H-1 / H-2 修正後）

- 再レビューID: R-CR013-016-implementation-review-2
- 日付: 2026-07-23
- レビュアー: review-agent
- 追加対象: DEF-011（SVG エクスポートの実績バー欠落）、DEF-012（タイトルの role / i18n）、
  `src/domain/usecase/plan-actual-paint.ts`（新設）、`src/domain/command/commands.ts`
  （`moveActualSpanCommand` / `resizeActualSpanCommand`）、`docs/spec/**` の改訂 7 ファイル、
  新設テスト `tests/actual-side-drag.test.ts` / `tests/def011-svg-export-plan-actual.test.ts`
- 適用観点: R2 / R3 / R4 / R5（前回と同一）

## 総合判定: **PASS**

Critical 0 件・High 0 件。前回 FAIL の原因であった H-1（実績掴みが予定日を書き換える）と
H-2（仕様書未改訂）はいずれも**構造的に**解消されている。フェーズ遷移を許可する。
Medium 6 件は合格基準どおり orchestrator へ対応方針の承認を求める（うち 4 件は新規指摘）。

### 重大度別 件数

| 重大度 | 件数 | 内訳 | 合格基準 | 判定 |
|--------|------|------|----------|------|
| Critical | 0 | — | 0 必須 | OK |
| High | **0** | 前回 2 件はいずれも解消 | 0 必須 | **OK** |
| Medium | 6 | 継続 1（M-4 一部）／新規 4（M-5〜M-8）＋前回 M-1/M-2/M-3 は解消 | 件数報告・承認 | 報告 |
| Low | 10 | 継続 6（L-1/L-3/L-4/L-5/L-6/L-9）／新規 4（L-10〜L-13） | 記録のみ | 記録済み |

### 品質ゲート実測値（本レビューで実行）

| ゲート | コマンド | 結果 | 前回 |
|--------|----------|------|------|
| 型チェック | `npx tsc --noEmit` | **0 エラー** | 0 |
| Lint | `npx eslint src tests` | **0 違反（exit 0）** | 0 |
| 単体・結合 | `npx vitest run` | **876 / 876 PASS（80 ファイル・0 fail・2.92s）** | 816 pass / 78 files |
| 仕様 | `strictdoc export docs/spec` | **成功（21 文書 publish・エラー 0・11.17s）** | 未実行 |
| E2E a11y | `npm run test:e2e` | **未実行**（vitest は `tests/e2e/**` を exclude。TEST-SYS-004 は本ゲートで未検証） | 未実行 |

新設 6 ファイルのテストのみで 110 ケースが緑（`actual-side-drag` / `def011-svg-export-plan-actual` /
`item-label-z-order` / `cr013-separate-row-growth` / `cr014-palette-icons` / `cr016-project-title`）。
`it.skip` / `it.only` / `todo` は tests 配下に 0 件。

---

## 焦点回答

### 1. H-1 は真に閉じたか → **閉じている（構造的に）**

- **型で塞がれている。** `ItemHit` は `PlanSideItemHit`（`side:'plan'`、region は
  `EdgeRegion|'label'|'fade-in'|'fade-out'`）と `ActualSideItemHit`（`side:'actual'`、region は
  `EdgeRegion` のみ）の判別可能合併になり、ラベル/フェード領域が `side:'actual'` を持つことが
  **表現不能**（`hit-tester.ts:61-82`）。
- **`side:'actual'` の生成点は 1 か所だけ。** `src` 全体で `side: 'actual'` を書く箇所は
  `hit-tester.ts:253` のみで、その値は `HitCandidate.side ← grab.isPlanSide` から来る。
  `region` は `pickItemHit` 由来なので `EdgeRegion` に限定される。`as ItemHit` 等の
  安全性未確認キャストは `src` に 0 件（grep 済み）。
- **ルーティングが全ての予定側分岐より前。** `beginItemGesture` の先頭
  （`editing-controller.ts:1331`）で `hit.side === 'actual'` を早期リターンしており、
  CR-007 の multi-move（同 1362）・label・fade・resize・move はいずれもその後ろ。
  `moveItemCommand` / `resizeItemCommand` / `bulkShiftItemsCommand` へ到達する経路は存在しない。
- **コマンド側も予定日に触れない。** `moveActualSpanCommand` / `resizeActualSpanCommand`
  （`commands.ts:404-476`）は `actualStart` / `actualEnd` のみを書き、`itemKind !== 'task'` の
  リサイズと `actualStart === undefined` を no-op で弾く。同値時は同一参照を返し履歴を汚さない。
- **hit → gesture 以外の経路も安全。** link モード（`editing-controller.ts:1176`）・
  Ctrl クリック（同 1128）・ダブルクリック（同 407）は `hit.itemId` しか読まない。
  Escape 中断は `'baseline' in gesture` の総称処理で新 2 モードにも効く。
- **テストが非空虚。** `tests/actual-side-drag.test.ts` は press→move→release を**実物の
  HitTester + 実物の ScheduleStore** で駆動し、掴み点ごとに `hit.side === 'actual'` を
  先に assert してから `startDate`/`endDate` 不変を確認しており、「実績に当たっていないから
  変化しない」という空虚な合格が起きない。multi-selection からの実績掴みも固定済み。

### 2. 仕様と実装の一致（H-2） → **主要点は一致。ただし 1 点だけ仕様が実装より広い（M-5）**

| 仕様 | 実装 | 判定 |
|---|---|---|
| `TOOL-L1-008` 並び順（ブランディング→タイトル→Fit→P→SS→…） | `HEADER_ELEMENT_ROLES`（`header-model.ts`）と完全一致。VERIFICATION も同順へ改訂 | 一致 |
| `TOOL-L2-006` の「第 4 要素」参照 | UID 実在（`19-…sdoc:37`）。旧記述の TOOL-L1-001 誤参照も是正 | 一致 |
| `DATA-MSPDI-001`（Name+Title 出力、Title 優先 Import、Project スカラ領域限定） | `mspdi-codec.ts` と一致。EXAMPLE も `<Name>` 込みへ更新 | 一致 |
| `PLAN-L1-005` 行高規則（バー高不変・レーン単位伸長・単一定義） | `layout-engine` + `separateActualBarOffsetPx` と一致（M-3 解消） | 一致 |
| `PLAN-L2-002` 適用範囲（both では矩形タスクのみ実績側掴み／パス形状・フェード・マイルストーンは無し／actual-only では字形によらず実績） | `ownsActualGrabRect`（`planShown ? drawsActualBar(item) : true`）と**ケースごとに一致**。`drawsActualBar` は task かつ actualStart ありかつ非パス形状かつ非フェード | 一致 |
| `PLAN-L2-002` 規則 (6)（12px の新規実績バーは body を持たない） | `edgeRegionAt` の `zone = min(9, width/2)` から厳密に導かれる | 一致 |
| `PLAN-L2-002` 規則 (4) 操作 (3)「本体ドラッグ = 実績スパン平行移動」 | **overlap かつ both では成立しない**（下記 M-5） | **仕様が広い** |

- `ownsActualGrabRect`（安価な field テスト）と `itemGrabRects`（実矩形構築）の**ケース対応**を
  4 分岐すべて追跡し、乖離が無いことを確認した。とくに `actual-only` かつ `actualStart` 未設定の
  場合は `actualSideLaneRect` が null を返し、安価経路の「予定矩形のみ」と同一結果になる。
- L-2 の是正（`actualBarDrawnWidthPx`）は仕様 `PLAN-L2-002` 規則 (2) と文言レベルで一致。
  真の超過は無クランプ、記録済み右端より手前へは引き戻さない、actual-only は無クランプ——
  3 条件ともテストで固定（`tests/plan-actual-geometry.test.ts`）。

### 3. 単一定義の主張（CR-014 / DEF-011） → **本物。ただし対象範囲は「予実の矩形決定」に限る**

- **パレット↔キャンバス（CR-014）**: 前回検証どおり、`tests/cr014-palette-icons.test.ts` は
  `taskGlyphPath(...)` / `milestonePath(...)` の**実行結果**とパレットの `<path d>` を突合。
  ハードコード期待値なし。今回変更なし。
- **キャンバス↔SVG エクスポート（DEF-011）**: `tests/def011-svg-export-plan-actual.test.ts` の
  「ARCH-C-022」ブロックは、**実物の `ItemLayer` を fake SVG DOM 上で `render()` して読み出した
  矩形**と、**実物の `exportScheduleSvg()` 出力文字列をパースした矩形**を、style 2 × display 3 の
  6 組合せ × アイテム 3 種で `toBeCloseTo` 比較している。コピーの比較ではない。
  マージン分の原点差だけを戻して比較しており、アサーションを弱めてはいない。
- **`ItemLayer` のリファクタは「ほぼ」挙動保存**。共有ヘルパ `computeItemPlanActualPaint` への
  委譲は正しいが、厳密には 2 点の挙動が変わっている（L-10）。いずれも**改善方向**で、
  1 点目は描画と当たり判定の一致を回復するもの。ただし「テスト変更なし＝挙動不変」という
  主張は正確ではないため記録する。
- **単一定義の射程は「どの矩形を描くか」まで**。字形そのものはエクスポータが独自実装のままで、
  マイルストーンは形状によらず菱形、パス形状タスク（矢印/シェブロン/スパン）は矩形として
  出力される（L-11）。今回追加したマイルストーン実績マーカーもこの制約を継承する。

### 4. 前回の Medium / Low の現況

| ID | 前回 | 現況 | 根拠 |
|----|------|------|------|
| H-1 | High | **解消** | 上記 1 |
| H-2 | High | **解消** | 上記 2（TOOL-L1-008・DATA-MSPDI-001 とも改訂、strictdoc 緑） |
| M-1 | Medium | **解消（実装で充足）** | `moveActualSpanCommand` / `resizeActualSpanCommand` + `PLAN-L2-002` 規則 (4) として要求化 |
| M-2 | Medium | **解消** | レーン帯スカラ棄却 → 配置 AABB → 生存者のみ `itemGrabRects`。`ownsActualGrabRect` は日付パース無し。差分テストが 16 組合せ × 密グリッドで naive 参照と完全一致を固定（20.3× の実測値そのものは本レビューでは再現していない） |
| M-3 | Medium | **解消** | `PLAN-L1-005` に規則 (1)〜(4) と VERIFICATION (a)〜(e) を追記 |
| M-4 | Medium | **一部解消・継続** | DEF-010 → Fixed、DEF-011 → Fixed。**DEF-012 が Open のまま**（実装は完了している）。CR-013〜016 §6 のチェックボックスは 31 件すべて未チェック（change-manager 作業中のため本判定では不問） |
| L-1（MSPDI スコープが `<Calendars>` を跨ぐ） | Low | **継続**（`projectScalarScope` 不変）。加えて当該スコープ規則が仕様 `DATA-MSPDI-001` へ明文化されたため、修正時は仕様も同時改訂が必要 |
| L-2（12px フロアが予定超過に見える） | Low | **解消** | `actualBarDrawnWidthPx` + 仕様 + テスト |
| L-3（選択装飾がラベル層より前面） | Low | **継続** | `item-layer.ts:772/806/841` は依然 `group.appendChild` |
| L-4（`stacksActualBars` の JSDoc が実消費者と不一致） | Low | **継続** | 「左ペイン・エクスポータ・テストが読む」と記すが、エクスポータは参照していない |
| L-5（毎フレームの不要な分割代入） | Low | **継続** | `computeItemPaint` 内で `epochDate` の有無に関わらず実行 |
| L-6（unsubscribe を破棄） | Low | **継続** | `wireScheduleTitle` が `bindHeaderTitleText` の返り値を保持しない |
| L-7（エクスポータが実績バーを描かない） | Low | **解消** | DEF-011 |
| L-8（タイトルに role 無し） | Low | **解消** | DEF-012（`role="button"`、編集中は返上、アクセシブル名「名前 - ヒント」） |
| L-9（トレーサビリティ表に途中経過の 776 pass が残る） | Low | **継続** | `traceability-matrix.md:342` が依然 `vitest 776 pass`（同文書 390 行は 816、実測は 876） |

---

## 新規指摘

### Medium

#### M-5: `PLAN-L2-002` 規則 (4) 操作 (3) が overlap 表示で成立せず、仕様が実装より広い

- **箇所**: `docs/spec/18-plan-actual.sdoc` `PLAN-L2-002` 規則 (4) 操作 (3) および VERIFICATION (f)、
  実装は `edge-hit.ts:109-134`（安定ソートで plan 先勝ち）＋ `hit-tester.ts:232-248`（plan を先に push）
- **問題**: `overlap` かつ `both` では実績バーが予定バーの**真上**に描かれ、両矩形が同じ点を含む。
  `pickItemHit` は辺 → 本体の順に解決し、本体タイは入力順（plan 先）で決まるため、
  実績バー本体を掴んだドラッグは**予定の移動**になる。実績側の本体移動が成立するのは
  予定矩形の外へはみ出した部分（真の超過分・前倒し着手分）と `separate` / `actual-only` のみ。
  仕様の適用範囲は「both では独立した実績バーを描くアイテム」としか書いておらず、
  overlap での本体タイの帰結を除外していないため、VERIFICATION (f) を overlap で検証すると FAIL する。
  `TEST-INT-014` の STATEMENT も「表示スタイル overlap/separate、可視フィルタ both/actual-only …
  の組合せで確認する」と読めるが、実テストの組合せは `separate×both` と `overlap×actual-only` の
  2 通りのみ（`overlap×both` は意図的に外されている）。
- **影響**: R2（SSOT）。H-2 と同種の「仕様が実装と一致しない」欠陥だが、方向が**過大記述**で
  あり、かつ残る挙動（overlap で実績本体を掴むと予定が動く）は画面上で予定バーが動くため
  H-1 のような無反応の破壊ではない。設計判断としては妥当。
- **修正案**: (a) `PLAN-L2-002` 規則 (4) に「overlap では実績バーが予定バーに重なるため、
  重なり部分の本体掴みは予定側に解決する（操作 (3) が成立するのは separate / actual-only、
  および予定矩形外の実績部分）」旨の一文を追加、(b) `TEST-INT-014` の STATEMENT を実カバレッジ
  （2 組合せ）へ合わせる、(c) 併せて `overlap×both` の本体タイが plan に解決することを
  明示的に固定するテストを 1 件追加（現在は「無いこと」で担保されており回帰検出できない）。

#### M-6: `actual-only` で選択アウトライン・フォーカスリング・フェードハンドルが「描かれていない予定位置」に出る

- **箇所**: `src/adapters/render/layers/item-layer.ts:524-526`（いずれも `placement` を渡す）、
  `updateSelectionOutline`（同 809-813）・`updateFocusRing`（同 844-848）・
  `updateFadeHandles`（同 752）。字形自体は `glyphPlacement`（実績位置）で描かれる
- **問題**: `actual-only` では字形が実績スパンへ移動するのに、選択の破線枠・キーボード
  フォーカスリング・フェード掴み代は**予定スパン**の座標に描かれる。H-1 の修正で
  「実績を掴む → その場で選択される」が正式な操作になったため、この不一致に到達しやすくなった。
  フォーカスリングが対象から離れた空白に描かれるのは WCAG 2.4.7（Focus Visible）上も望ましくない。
- **影響**: R2（POLA）＋ a11y。データ破壊なし・モード限定。
- **修正案**: 3 つの装飾も `paint.primaryGlyphRect`（= `glyphPlacement`）から描く。
  フェードハンドルは当たり判定（`hitTestFadeHandle`）も同じ矩形へ揃える必要がある
  （現状は描画・判定とも `placement` で**一致**しているため、片方だけ直すと新たな乖離を生む）。

#### M-7: 新設要求 `ITEM-L2-005` / `TOOL-L2-009` に Verifies トレースが無い

- **箇所**: `docs/spec/50-test-spec.sdoc`（`PLAN-L2-002` → TEST-UNIT-018 / TEST-INT-014、
  `TOOL-L2-010` → TEST-INT-015 / TEST-SYS-004 は追加済み。`ITEM-L2-005` と `TOOL-L2-009` は 0 件）
- **問題**: 実テスト（`tests/item-label-z-order.test.ts`、`tests/cr014-palette-icons.test.ts`）は
  存在するのに、StrictDoc 上の `Verifies` リレーションが張られておらず、
  DEEP TRACE / MATRIX 上は未検証要求として残る。CLAUDE.md「トレーサビリティ: 要求→設計→テストの
  対応を StrictDoc のリレーションで表現」に対する欠落。
- **影響**: R1.3 相当（トレース欠落）。`strictdoc export` はこれを検出しない（エラーにならない）。
- **修正案**: `[TEST]` 要素を 2 件追加（例: ラベル最前面不変条件 → `ITEM-L2-005`、
  パレット形状 SSOT → `TOOL-L2-009`）し、`ROLE: Verifies` を付与する。

#### M-8: `actual-only` のフェード付きタスクは「描画＝掴み」が成立しない

- **箇所**: `item-layer.ts:453-461`（`taskFadePoints(item, glyphPlacement, zoomX)` は
  **x/y/height だけ**を矩形から取り、幅は `item.startDate`〜`item.endDate` から再計算する）、
  一方の掴み矩形は `actualSideLaneRect`（幅＝実績スパン、12px フロア）
- **問題**: `actual-only` でフェード字形は「実績開始位置に、**予定の長さで**」描かれ、
  掴める矩形は「実績の長さ」になる。実績スパンが予定より短ければ見えている台形の右側が
  掴めず、長ければ何も無い場所が掴める。`PLAN-L2-002` 規則 (2) の
  「描画する矩形と当たり判定の矩形は同一の定義から導き、見えている図形と掴める領域が一致すること」
  に反する。なお SVG エクスポータも同じ式なので**画面と出力は一致**しており、DEF-011 の
  ドリフト主張自体は崩れない（両者が同じ形で仕様から外れている）。
  パス形状（矢印/シェブロン/スパン）は `glyphPlacement` の幅を使うため本件の対象外。
- **影響**: R2 / 仕様不適合。フェード付きタスク × `actual-only` に限定され、発生頻度は低い。
- **修正案**: `actual-only` のフェード字形を実績スパン幅の台形として描く（矩形をそのまま
  台形化する経路を設ける）か、`PLAN-L2-002` 規則 (2) の適用範囲でフェード字形を明示的に除外する。

### Low（記録のみ）

| ID | 箇所 | 内容 | 提案 |
|----|------|------|------|
| L-10 | `item-layer.computeItemPaint` / `actualSideLaneRect` | 「テスト変更なしの挙動保存リファクタ」との主張は厳密には不正確。(1) `actual-only` の**タスク単独字形の幅**が旧 `Math.max(0, end-start)`（フロア無し）から `actualBarRenderWidthPx`（12px フロア付き）へ変わった＝**当たり判定と描画の乖離を解消する改善**だが、これを固定するテストは無い。(2) `epochDate` 未設定の防御経路が「幅 0 の矩形」から「レーン全体の矩形」へ変わった | (1) を明示的に固定するテストを 1 件追加し、変更点を DEF-011 票へ記録する |
| L-11 | `svg-exporter.renderMilestone` / `renderTaskBar` | エクスポータはマイルストーンを形状によらず菱形で、パス形状タスク（矢印/シェブロン/スパン）を矩形で出力する。字形の単一定義はキャンバス内に閉じており、エクスポートには及んでいない（今回追加のマイルストーン実績マーカーも同様） | 別 CR として「エクスポータの字形共有」を起票するか、`DATA-SVG-*` に既知の制限として明記 |
| L-12 | `main.ts` `wireScheduleTitle` の keydown | `role="button"` を付与したが活性化キーは Enter / F2 のみで、`role=button` の慣行である Space が無反応。WCAG 2.1.1 は Enter で満たすが ARIA APG とは不一致 | Space を Enter と同じ分岐へ加える |
| L-13 | `editing-controller.ts:1332` | 実績バーを掴むと `setSelection` で複数選択が単一へ**畳まれる**。H-1 対策として意図的だが、CR-007 の「複数選択を保ったまま操作する」体系との差異が仕様にもコメントにも無い | `PLAN-L2-002` 規則 (4) に一文追加、またはコメントで意図を明記 |

---

## 観点別所見（差分のみ）

- **R2**: 判別可能合併による「表現不能化」は、コメントや規約ではなく**型で不変条件を守る**
  正しい手当てであり、本バッチで最も質の高い設計判断。`plan-actual-paint.ts` を UseCase 層に
  置き、Adapter（`item-layer`）と UseCase（`svg-exporter`）の双方から呼ぶ向きも DIP 適合。
  残る SSOT 破れは仕様側の 1 点（M-5）と装飾座標の 1 点（M-6）。
  なお `hit-tester.itemGrabRects` は `plan-actual-paint` を**使わず**同じ素材から独自に組み立てて
  おり、モード判定が実質 3 か所（paint / grab / 差分テストの参照実装）にある。現時点では
  ケース単位で一致していることを確認したが、将来の統合候補として記録する。
- **R3**: tsc / eslint とも 0。新規 `as` キャスト無し。例外の握り潰し無し。命名は言霊規約に適合
  （`ownsActualGrabRect` / `moveActualSpanCommand` / `primaryGlyphSide` / `paintedRightEdge`）。
  コメント・ログは英語 ASCII。既存テストの変更は `side` フィールド追加のみで弱体化なし。
- **R4**: `setViewState` の `layoutDirty` 条件に `planActualStyle` / `planActualDisplay` が
  加わっており、`[Ao]/[As]`・`[P]/[A]` の切替で行高が古いまま描かれる状態遷移の穴は塞がれている。
  タイトル編集は `settled` フラグで二重確定を防止。新設 2 ジェスチャも Escape 中断の総称処理に乗る。
- **R5**: M-2 の劣化は解消。安価な棄却順（レーン帯スカラ → 配置 AABB → field テスト →
  矩形構築）は妥当で、ポインタ移動あたりの日付パースは「実績を持ち、かつカーソルが帯内に入った
  アイテム」だけに限定される。レンダー・レイアウトの計算量悪化なし。

---

## 実機ライブ検証が必要な残項目（CDP 不通のため本セッション未実施）

テスト証拠だけでは担保しきれず、サインオフ前に目視を推奨する項目:

1. **実績側ドラッグの体感（最優先）** — `[As]` で実績バーの右辺を掴んで引き、`actualEnd` が
   記録されること。とくに**新規実績（12px 幅）は本体領域が無く左右が即リサイズ**になる
   （`PLAN-L2-002` 規則 (6)）ため、実機で「掴めるが動かせない」と誤解されないかを確認したい。
   カーソルは `col-resize` に変わるが、予定側か実績側かの区別は付かない。
2. **`actual-only` での選択表示（M-6）** — 実績字形をクリックしたとき、破線の選択枠が
   字形から離れた位置に出ることを確認し、M-6 の優先度判断の材料とする。
3. **DEF-011 の SVG エクスポート** — `[As]` で出力した SVG をブラウザ等で開き、
   実績バーが積まれていること、および**マイルストーンが菱形固定**（L-11）で出ることを確認。
4. **DEF-012 の a11y** — `npm run test:e2e`（Playwright + axe）が本ゲートで未実行のため、
   TEST-SYS-004 の証拠が無い。ビルド後に E2E を回すこと。スクリーンリーダーでの読み上げ
   （「名前 - 変更ヒント」）も併せて確認すると良い。
5. **overlap での実績辺リサイズ（M-5 の裏面）** — 予定バーの内側に実績バーの辺が入るため、
   予定バー中央付近に `col-resize` の帯ができる。誤操作しやすくないかの体感確認。

---

## 再レビュー指摘対応テーブル

| ID | 重大度 | 観点 | 対応 | 対応者 | 状態 |
|----|--------|------|------|--------|------|
| H-1 | High | R2 / 機能 | 修正済み（判別可能合併＋先頭ルーティング＋実績専用コマンド） | implementer | **検証済み・完了** |
| H-2 | High | R2（SSOT） | 修正済み（TOOL-L1-008 / DATA-MSPDI-001 ほか改訂、strictdoc 緑） | architect | **検証済み・完了** |
| M-1 | Medium | 要求充足 | 実装で充足し `PLAN-L2-002` として要求化 | implementer | **完了** |
| M-2 | Medium | R5 | 早期棄却の復活＋差分テスト | implementer | **完了** |
| M-3 | Medium | 文書 | `PLAN-L1-005` 改訂 | architect | **完了** |
| M-4 | Medium | プロセス | DEF-012 を Fixed 化、CR-013〜016 §6/§8 更新 | orchestrator / change-manager | 一部未対応（作業中） |
| M-5 | Medium | R2（SSOT） | `PLAN-L2-002` 規則 (4) に overlap の除外を明記＋`TEST-INT-014` の記述是正＋回帰テスト 1 件 | architect / implementer | 未対応 |
| M-6 | Medium | R2 / a11y | 選択枠・フォーカスリング・フェード掴み代を字形矩形へ揃える（描画と判定を同時に） | implementer | 未対応 |
| M-7 | Medium | トレーサビリティ | `ITEM-L2-005` / `TOOL-L2-009` に `[TEST]` を追加 | architect / test-engineer | 未対応 |
| M-8 | Medium | R2 / 仕様不適合 | `actual-only` のフェード字形の幅を実績スパンへ揃える、または仕様で除外 | implementer / architect | 未対応 |
| L-1, L-3〜L-6, L-9〜L-13 | Low | R2/R3/R5/a11y/文書 | 記録のみ（対応方針は orchestrator 判断） | — | 記録済み |

## 結論（再レビュー）

前回 FAIL の 2 件は、いずれも**その場しのぎではなく構造的に**解消されている。H-1 は
「実績側ヒットが予定日書き換えコマンドへ到達しうる」という状態そのものを型で表現不能にし、
さらに CR-013 Part 2 の受入基準であった実績側 3 操作（右辺・左辺・本体）を Undo 可能な
コマンドとして実装したため、M-1 も同時に解消した。H-2 は 7 つの `.sdoc` にわたって改訂され、
新設 4 要求（`PLAN-L2-002` / `ITEM-L2-005` / `TOOL-L2-009` / `TOOL-L2-010`）と
新設 4 テスト要素まで含む、実装より詳細な水準の記述になっている。品質ゲートは 4 種すべて緑
（tsc 0 / eslint 0 / vitest 876 pass 0 fail / strictdoc export 成功）。

**判定: PASS（Critical 0・High 0）。** delivery 反映・コミットを許可する。
Medium 6 件は合格基準に従い orchestrator の対応方針承認を求める。優先度の推奨は
M-5（仕様の過大記述、H-2 と同種の再発防止）＞ M-7（トレース欠落）＞ M-6（a11y）＞
M-4（記録更新）＞ M-8（限定的な仕様不適合）。いずれもコミットをブロックしない。
E2E a11y（TEST-SYS-004）が未実行である点と、上記「実機ライブ検証が必要な残項目」5 件は、
サインオフ前に消化することを強く推奨する。
