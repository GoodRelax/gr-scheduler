# レビュー報告: CR-008 実装（依存線ルータ 引出/引入スタブ・視認方向・折れ上限緩和・DEF-005 再解決）

- 対象: `src/domain/usecase/dependency-connector.ts`（`routeConnector`）+ `tests/dependency-connector.test.ts`
- CR: `project-records/change-requests/change-request-008-20260721-070348.md`
- 適用観点: R2（設計原則）/ R3（コーディング品質）/ R4（並行性・状態遷移＝ここでは幾何不変条件）/ R5（性能）
- レビュー日: 2026-07-21
- レビュア: review-agent
- スコープ: 単一モジュール。レンダラ/ヒットテスタは `route.points` を汎用消費のため無改修（確認済み）。スキーマ変更なし。

## 総合判定: **PASS**

Critical / High がともに 0 件のため、CR-008 実装は品質ゲートを通過する。Medium 2 件・Low 3 件は
記録し、対応方針を orchestrator に諮る（いずれもフェーズ遷移をブロックしない）。

### 重大度別件数

| 重大度 | 件数 |
|--------|------|
| Critical | 0 |
| High | 0 |
| Medium | 2 |
| Low | 3 |

### 品質ゲート数値

| ゲート | 結果 | 判定 |
|--------|------|------|
| `npx tsc --noEmit` | エラー 0 | PASS |
| `npx vitest run`（全体） | 71 files / **671 passed** | PASS（結合 100%） |
| 　うち `dependency-connector.test.ts` | **17 passed** | PASS |
| `npx eslint src tests` | 違反 0 | PASS |
| レビュー Critical/High | 0 / 0 | PASS |

## DEF-005 再解決の検証: **再解決済み（元の折れパリティ超過を再導入していない）**

DEF-005 は「後方＋垂直重複ケースで折れ点が 0〜3 上限を超える」パリティ超過であった。CR-008 は
上限を 4 へ緩和し、実装は全分岐で折れ点を上限内に収める:

- CLEAR FORWARD（整列）= 0 / （上下オフセット）= 2
- STACKED/OVERLAPPING backward = 生ポイント最大 6 → 正規化後 ≤ 4
- CONTIGUOUS flush 同一行 = 生ポイント 5 → ≤ 3

いずれも 4 を超えず、かつ矢印は水平入線（+x）で終端する。IM8 の「上下端縦入線（水平スタブ無し）」は
排除され、垂直突入は再導入されていない。DEF-005 記録も `再オープン（CR-008, 2026-07-21）` として
更新済み（`project-records/defects/DEF-005-dep-elbow-parity.md`）。よって **真に再解決**。

## flush-contiguous「水平出口スタブ例外」の可否判定: **健全・境界も正しい（許容）**

- **発火条件**: `contiguousRoute` は `gap < stub` **かつ** `sameRow`（`targetIsBelow/Above` いずれも偽）
  のときのみ到達する（`dependency-connector.ts:255-261`）。すなわち「水平方向に 1 スタブ分の余地が
  無い同一レーン後続」に限定され、**フル水平出口スタブが幾何的に不可能なケースだけ**に発火する。
  「near-flush-with-gap で本来フル水平出口が可能なのに誤発火」する状況は存在しない（`gap < stub` は
  定義上フルスタブ未満の余地しか無いため）。
- **truly flush（gap==0）**: 共有境界 `x = boundaryX = exit.x = toRect.x` を垂直に落とす。`crossesRect`
  は strict-interior 判定（`a.x > left && a.x < right`）のため、先行右辺・後続左辺の双方を「なぞる」
  だけで内部貫通と判定されない（`tests/...:59`, 実装 `:183,194`）。非交差不変条件は保たれる。
- **0 < gap < stub（部分ギャップ）**: 落とし込み列 `x = exit.x` は後続左辺より `gap` だけ左にあり、
  後続外側で明確にクリア。結果も前進読み・水平入線・非交差を満たす。利用可能な短い出口スタブを
  使わない点は美観上の割り切りであり、正しさの欠陥ではない。
- **CR 文言との関係**: CR Part 1 の「出口/入口に必ず水平スタブ（regardless）」の文言に対し、flush 時は
  出口スタブを落とす。ただし CR の一次意図は「**入口の水平終端＋正方向読み**」であり（Part 1 末尾は
  入口の水平終端のみを必須とし上下端入線を許容、Part 2 は正方向）、その両者は全 flush サブケースで
  保持される。実装ヘッダ（`:36-42`）が幾何的必然性を明文化しており、**重要な意味での違反には当たらない**。

推奨（Low, 後述 L2）: 仕様 `docs/spec/16-dependencies.sdoc` に flush ケースの出口スタブ免除を明記し、
コードと仕様の文言を一致させること。

## 指摘一覧

### M1 [Medium][R2/R3] 前進・target BELOW ケースの入口スタブ長が CONNECTOR_STUB_PX を保証しない

- 箇所: `src/domain/usecase/dependency-connector.ts:235-243`（CLEAR FORWARD, `targetIsBelow`）
- 問題: 下降エルボを `elbowX = sourceRightX + stub`（出口側）に置くため、**入口の水平スタブ長 =
  `targetLeftX - elbowX = gap - stub`** となり、`stub ≤ gap < 2*stub` では入口スタブがフルスタブ未満、
  さらに **`gap == stub` ちょうどで入口水平セグメントが 0 長に退化し、矢印が垂直入線になる**
  （この分岐は `normalizePolyline` を通さず生ポイントを返すため退化点も除去されない）。CR-008 の
  受入基準「入口直前に `CONNECTOR_STUB_PX` の水平スタブ」を、下方前進・小ギャップで満たさない。
  target ABOVE 側（`:245-252`）は `elbowX = targetLeftX - stub` のため入口スタブが常にフルスタブで、
  **上下で非対称**。
- 影響: 実データ 4 テンプレは全て contiguous/backward で本パスを踏まないため live-verify を通過して
  いるが、下方サブレーン前進で小ギャップが生じ得る（CR-004 ボトムアップ副レーン）。`gap == stub`
  厳密一致は測度 0 だが、CR が禁じた「垂直入線」を境界で再現し得る。
- 修正案（具体）: BELOW を ABOVE と対称化し、下降エルボを `elbowX = targetLeftX - stub` に置く
  （出口で 1 スタブ右へ走ってから下降 → 入口フル水平スタブを常に保証）。出口・入口の**両端**フル
  スタブを `stub ≤ gap < 2*stub` でも保証したい場合は 2 折れでは不可能なため、中央縦棒を持つ 3 折れ
  Z ルート（前進予算 0..3 内）へ拡張する。最小修正は前者（入口優先）。

### M2 [Medium][R6→本CR範囲のテスト品質] stacked ルートの非交差検証が端点 2 バーに限定・折れ数下限未検証

- 箇所: `tests/dependency-connector.test.ts:243-288`（overlapping/backward stacked）
- 問題: stacked ルートの `crossesRect` 検証は source/target の 2 矩形に対してのみ。`LANE_HUG_FRACTION`
  が跨ぐレーン間ギャップに他レーンのバーが存在しても衝突しないこと（安全余裕 `0.05*barHeight <
  0.111*barHeight`）は実装コメント（`:67-75`）の散文でのみ論証され、**中間/隣接レーンのバー矩形を
  置いた交差アサーションが無い**。また stacked/contiguous は `bends <= 4` の上限のみで、期待折れ数の
  下限・完全一致を検証していない（前進ケースは `toBe(2)`/`toBe(0)` で検証済み）。
- 影響: hug 余裕やレーン跨ぎ経路が将来リグレッションで崩れても端点 2 バー検証は素通りし得る。
  vacuous ではない（水平性・長さ・向き・端点 2 バー非交差は実質検証）が、CR-008 の核心である
  「跨ぎギャップの安全性」がテストで固定されていない。
- 修正案: sys3→swe1 相当ケースに中間レーン（lane1）バーと同一レーンの隣接バーを追加し、
  `crossesRect(route.points, neighbourRect)).toBe(false)` を追加。stacked/contiguous に期待折れ数の
  `toBe(...)` を追加して budget を上下から固定する。

### L3 [Low][R2] 幾何的必然の flush 例外を仕様に未反映（コード/仕様の文言不一致）

- 箇所: 仕様 `docs/spec/16-dependencies.sdoc`（DEP-L1-003 / DEP-L2-001）と CR-008 Part 1 の
  「出口/入口の水平スタブ必須（regardless）」文言。
- 問題: 実装は flush contiguous で出口スタブを意図的に落とすが（正当・上記の通り健全）、仕様/CR 文言は
  「regardless」のまま。トレーサビリティ上、コードの正当な例外が仕様に記述されていない。
- 修正案: DEP-L1-003 に「後続が同一レーンで先行右辺に密着（flush）する場合に限り、出口水平スタブは
  幾何的に不可能なため免除し、入口水平スタブ＋正方向読みで代替する」旨を追記。

### L4 [Low][R3] contiguous の riserX クランプが極小幅後続（< CONNECTOR_STUB_PX）で後退読みになる

- 箇所: `src/domain/usecase/dependency-connector.ts:189`
- 問題: `riserX = Math.min(toRect.x + stub, targetRightX - stub)`。後続幅 `< stub`（=12 world px）だと
  `targetRightX - stub < toRect.x = boundaryX` となり riserX が境界より左に来る。前進の下走り
  （`:195`）が一瞬 -x へ向かい `minX < exit.x` となって「出口より左へ出ない」不変条件を局所的に破る。
- 影響: 極端なズームアウト時のみ（通常 LOD がアイテムを併合するため実運用では回避される）。幅
  `>= stub` では健全（境界で確認済み）。
- 修正案: `const riserX = Math.max(boundaryX, Math.min(toRect.x + stub, targetRightX - stub));` として
  下限を境界にクランプする。または LOD による最小描画幅保証をコメントに明記。

### L5 [Low][プロセス] DEF-005 記録が「再オープン」状態のまま

- 箇所: `project-records/defects/DEF-005-dep-elbow-parity.md`
- 問題: 本実装で再解決されたが、記録の状態は `再オープン（CR-008）` のまま。
- 修正案: 本レビュー PASS を受け、状態を「CR-008 実装により再解決」へ更新（orchestrator/change-manager
  の締め処理）。

## 良好な点（記録）

- 命名（item60）が強い: `LANE_HUG_FRACTION` / `CONNECTOR_STUB_PX` / `targetIsBelow` / `boundaryX` /
  `riserX` / `entryRiserX` / `nearY`。無意味な汎用語（type/data/info/value）無し。
- 全識別子・コメント英語 ASCII。デッドコード無し（`connectorExit/EntryPoint` はテストで使用）。純粋
  関数・副作用なし・決定的（ヘッダ明記通り）。R5 性能: 定数点数の直交ポリライン生成のみで割当最小、
  ホットパス上でも問題なし。
- strict-interior 交差判定と端点グレージング設計が整合し、左辺/下辺着地を合法化しつつ内部貫通を排除。
- `SAME_ROW_EPSILON_PX` による浮動小数ドリフト対策、`LANE_HUG_FRACTION`(0.05) < レーン間ギャップ
  (0.111·barHeight, STACKED_BAR_HEIGHT_RATIO=0.9 起源) の安全余裕は妥当。

## Detail Block: 指摘対応テーブル

| ID | 重大度 | 箇所 | 指摘 | 推奨対応 | 状態 |
|----|--------|------|------|----------|------|
| M1 | Medium | dependency-connector.ts:235-243 | 下方前進の入口スタブ長 = gap-stub、gap==stub で垂直入線退化 | BELOW を ABOVE と対称化（elbowX=targetLeftX-stub） | 未対応 |
| M2 | Medium | dependency-connector.test.ts:243-288 | stacked 非交差を端点2バーのみ検証・折れ数下限未固定 | 中間/隣接レーン矩形を追加、期待折れ数を toBe で固定 | 未対応 |
| L3 | Low | 16-dependencies.sdoc | flush 出口スタブ免除が仕様未反映 | DEP-L1-003 に免除条件を追記 | 未対応 |
| L4 | Low | dependency-connector.ts:189 | 極小幅後続で riserX が境界左→後退読み | Math.max(boundaryX, ...) で下限クランプ | 未対応 |
| L5 | Low | DEF-005-dep-elbow-parity.md | 記録が再オープンのまま | 「CR-008 実装により再解決」へ更新 | 未対応 |

## 推奨戻り先

PASS のため戻し不要。M1/L4 はコード修正（implementation 相当・任意タイミング）、M2 はテスト補強
（testing 相当）、L3/L5 は仕様/記録同期（design/プロセス相当）として、orchestrator が Medium 対応
方針を承認のうえフォロー CR もしくは同フェーズ内改善として処理することを推奨する。
