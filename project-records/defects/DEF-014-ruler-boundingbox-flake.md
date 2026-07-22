# DEF-014: 日付ルーラーの boundingBox が稀に null になる（E2E 間欠失敗）

- 起票: 2026-07-23（test-engineer, Playwright E2E の triage 中に発見）
- 種別: defect（描画タイミング競合の疑い。**未確定**）
- 重大度: **Low**（フルスイート 4 回連続で 117/117 緑。`--repeat-each` によるストレス時のみ
  30〜40% 程度で再現。通常利用での実害は未確認）
- 状態: **Open（原因未確定・要追調査）**
- 関連: `tests/e2e/interaction-hardening.spec.ts`（"a fixed date ruler shows year/month/day and
  stays at the top on vertical scroll"）, `RulerLayer`, ResizeObserver 経路

---

## 事象

`expect(ruler).toBeVisible()` が直前に成功しているにもかかわらず、その直後の
`ruler.boundingBox()` が `null` を返すことが、ストレス実行時に間欠的に発生する。
マーキー選択によるパネル寸法変化を伴うドラッグ直後に出やすい。

## 推定原因（未確定）

`RulerLayer.render()` の `if (totalHeight === 0) return;` ガードと、ResizeObserver の
整定前に読まれた一過性の 0 幅 `canvasSize` の組合せ。すなわち「一瞬だけルーラーが描かれない
フレーム」が存在し、そこに `boundingBox()` が当たると `null` になる、という筋。
**決定的な再現手順は確立できていない**ため、原因は推定にとどまる。

## 現時点の対応

E2E 側で geometry を読む前に `expect(ruler).toBeVisible()` を挟む形にハードニングした
（アサーションの弱体化ではなく、順序の明示）。フルスイートは 4 回連続で緑。

## 今後の調査方針

- `RulerLayer.render()` の 0 高さ早期リターンが、実際に「可視だが矩形なし」の状態を
  生み得るかを単体で確認する。
- ResizeObserver の初回コールバックで `canvasSize` が 0 になる窓があるか、
  `svg-renderer` の寸法確定順序を確認する（memory `live-verify-gotchas` の
  「プレビューpaneが 0×0 で cold-start する」事象と同根の可能性）。
- 本 CR バッチ（CR-004〜016）とは独立の既存事象と見られるが、確証はない。

## 備考

本件は「原因が特定できていない」ことを明示するために起票した。
緑になったから解決した、とはみなさない。
