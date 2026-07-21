# DEF-008: 予実表示フィルタ [P]/[A] が予定/実績バーの描き分けに効いていない

- 起票: 2026-07-21（CR-012 サンプル移行後の実機検証で顕在化）
- 種別: defect（描画層の要求未充足。PLAN-L1-002 予実表示フィルタ）
- 重大度: **High**（ユーザーが直接操作する主要トグルが機能せず、予実の読み取りを誤らせる）
- 状態: **Fixed（2026-07-22、実機ライブ確認待ち）**
- 関連: PLAN-L1-002（予実表示フィルタ）, PLAN-L1-005（Overlap/Separate）, CR-006 Part 6,
  CR-012（サンプルを統一モデルへ移行したことで顕在化）

---

## 事象

パレットの `[P]`（予定表示）/ `[A]`（実績表示）トグルを操作しても、描画されるバーの予実の
**内訳が変わらない**。

実測（CR-012 移行後テンプレート = 26アイテム、実績日保持6件）:

| 操作 | items | 実績バー | 期待 |
|------|-------|---------|------|
| P=on, A=on（both） | 26 | 3 | 26 / 実績バーあり（正） |
| **A を off（plan-only）** | 26 | **3（消えない）** | 実績バーが**消える**べき |
| **P を off（actual-only）** | 6 | 3 | 6件は正だが**予定バーも描かれたまま**。実績のみになるべき |

## 原因

`src/adapters/render/layers/item-layer.ts` は `viewState.planActualDisplay` を
**165行の `filterByPlanActualDisplay`（＝どのアイテムを描くか）でしか参照していない**。
残ったアイテムのバー描画は

```
const bars = this.computeItemPlanActualBars(ctx, item, placement);
...
if (bars.actual !== null) { ... this.updateActualBar(...) }
```

のとおり **`bars.actual !== null`（＝そのアイテムが実績日を持つか）だけ**で決まり、
`planActualDisplay` を一切見ていない。したがって:

- `plan-only` でも実績バーが描かれ続ける。
- `actual-only` では対象アイテムこそ絞られるが、そのアイテムの**予定バー（`mounted.shape`）は常に描かれる**。

`filterByPlanActualDisplay` 自体は仕様どおり（アイテムの取捨のみを担う純関数）であり、
欠落しているのは**描画層でのバー単位のゲーティング**である。

## あるべき挙動（PLAN-L1-002）

| モード | 予定バー | 実績バー |
|--------|---------|---------|
| both | 描く | 描く（実績日があれば） |
| plan-only | 描く（レーン全高） | **描かない** |
| actual-only | **描かない** | 描く（実績日を持つアイテムのみ） |
| none | 描かない | 描かない |

`separate` スタイルでも同様に、抑止された側のサブレーンを描かない
（片側のみのときは実質1本として読めること）。

## 修正方針

`item-layer` のバー描画を `planActualDisplay` でゲートする:
- `plan-only`: 実績バーを描かない（`bars.actual` を null 相当に扱い、予定はレーン全高）。
- `actual-only`: 予定バーを描かず、実績バーのみを描く。
- `both` / 未指定: 現行どおり両方。

`computePlanActualBars` は純粋なジオメトリ計算のままとし、表示フィルタの適用は描画層または
その手前の純関数で行う（ドメイン純度を維持）。

## 検証

`[A]`off で実績バー数が 0 になること、`[P]`off で予定バーが描かれず実績バーのみになること、
`both` で両方描かれることを単体テストと実機DOMの両方で確認する。

## 修正内容（2026-07-22）

- 新設 `src/domain/usecase/plan-actual-display.ts`
  - `isPlanSideShown` / `isActualSideShown`（`main.ts` のローカル述語を移設・集約）
  - `planActualDisplayFromSides`（2トグル → 4モード）
  - `computeDisplayedPlanActualBars(input, display)`：純ジオメトリ
    `computePlanActualBars` の結果を表示フィルタでゲートする純関数。片側のみのときは
    overlap フレームで計算するため、抑止側のサブレーンを確保せず残る側がレーン全高になる。
- `item-layer.ts`：バー描画を上記ゲート経由に変更。`actual-only` ではプライマリグリフを
  実績スパンへ移動し濃色＋太線幅＋`data-plan-actual-side="actual"` を付与（別ノードを作らない、
  1アイテム＝1グリフの不変条件を維持）。マイルストーンは `plan-only` で実績マーカー／リーダー線を
  除去、`actual-only` で単一マーカーを `actualStart` に描画。
- `dependency-visibility.isItemVisibleUnderDisplay` と `progress-today-layer` を同述語へ集約。
- 単体テスト：`tests/plan-actual-display-gating.test.ts`（31 ケース）。
- ゲート：tsc 0 / vitest 746 pass・0 fail / eslint 0。
