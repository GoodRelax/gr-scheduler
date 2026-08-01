# 判断が要った 7 件 — **全件 決着**（2026-07-30）

- 全て `handover/` へ**反映済み**。**この文書はもう捨ててよい**（記録として残すだけ）。
- 反映先は各行に書いてある。

| # | 論点 | 決定 | 反映先 |
|:--:|---|---|---|
| **Q1** | `percentComplete` の型宣言 | **「整数・0 以上」**へ。「0〜100」と書かない（そう読むとクランプを書かれ、予定超過の事実が消える） | `07` §1-4／`erd` ×3／`entry` ×2／`property-mapping` ×3／`ui-parts`／`user-order` ×2 |
| **Q2** | MSPDI の不変条件 | **完了時の export は `RemainingDuration` 0 ＋ `ActualFinish` あり、`PercentComplete` は要素を書かない**。書かなければ 100 超との衝突が起きない | `07` §1-4 |
| **Q3** | 往復検査（CI） | **`PercentComplete` を検査から外す**。分母が `Duration` ではなく `finish − start` で、100 超も丸めないため等式が成立しない | `property-mapping` §3-4 |
| **Q4** | `OutlineLevel` は Own か | **Consume のまま**。台帳の定義では Own＝保存値を書く／Consume＝読む＋構造から再生成であり、`wbs_parent_uid` から再生成する本要素は Consume に当たる。Own にすると `wbs_parent_uid` と二重管理になりドリフトする | `07` §10-2（見出しを「GRS が値を決めて書き出す要素」に変更）／§11 の指示から除外 |
| **Q5** | Row Title Tree の 5 段上限 | **人が作るときだけ 5 段で止める。import は上限なし、export はクランプしない。** 外部マスタの階層を勝手に浅くして返さない | `ui-detail-spec` §6-1-1 |
| **Q6** | `shapeKind` の列挙形 | **5 値のまま ＋ `milestoneGlyph` を別列**。`shapeKind='milestone'` ⇔ `Task.milestone=true`、**権威は `Task.milestone`**（export される側だから） | `07` §2-2-2／`erd` TaskVisual／`entry` JSON 実例／`ui-parts` |
| **Q7** | 低ズームでのマーカー | **大きさを文字サイズから導く。** 基準 1920×1080／全画面／100%／ヘッダー 50px。最小フォント **12px**、実績バー＋α **16px**、マーク **16px**、段の間隔 **12px**。**下限を割るならレベルを 1 つ減らす** | `07` §2-4-1／`ui-detail-spec` §4-2／`user-order` |

---

## 併せて確定した 5 件（PoC の目視から）

| 内容 | 決定 | 反映先 |
|---|---|---|
| **実績の形状** | **予定と同じ形状で描く。** 予定が矢羽根なら実績も矢羽根。実績だけ四角にしない | `07` §2-2-1／`ui-parts`／`ui-detail-spec` §4-4／`user-order` 項 10 |
| **Resume 矢印の幾何** | 矢先の高さ = 実績バーの中心 = マークの中心／矢印の下端 = マークの下端 | `07` §2-5 |
| **イナズマ線** | **段ごとに頂点を分ける。** 同じ段では最も遅れた頂点が勝つ | `07` §4-2／`ui-detail-spec` §6-6 |
| **色の既定** | 予実は**同一色相**（予定＝中彩度でやや薄い／実績＝高彩度で濃い・原色不可）。**依存線は橙で固定**。実績÷予定は 3:1 以上 | `07` §2-6／`ui-detail-spec` §6-1-2 |
| **用語** | 日本語の「**字形**」をやめ「**形状**」に。`shapeKind`＝**タスク形状**、`milestoneGlyph`＝**マイルストーン形状**。※「フォントの字形」のように書体そのものを指す場合だけ「字形」を残す | 全 40 箇所（`06-background/` と歴史文書は原文のまま） |

---

## MSPDI の事実（正本 XSD ＋ 上流解説書で確認）

Q6 の前提確認で判明したこと。**次期が同じ間違いをしないように残す。**

| 要素 | 型 | 定義文（原文） |
|---|---|---|
| **`Task/Milestone`** | `xsd:boolean` | **"Whether the task is a milestone."** ← マイルストーン判定はこれ |
| `Task/Type` | 整数 0/1/2 | "The type of task. Values are: 0=Fixed Units, 1=Fixed Duration, 2=Fixed Work" |
| `PredecessorLink/Type` | 整数 0-3 | "The link type. Values are 0=FF, 1=FS, 2=SF and 3=SS" |

- **`Type` でマイルストーンを判定してはならない。** MSPDI には同名の `Type` が 3 つある。
- **形状・グリフに相当する要素は MSPDI に 1 つも無い**（全要素名を走査。近いのは `HideBar` だけ）。
  したがって `milestoneGlyph` は **GRS 専用・非 export**。

---

## まだ残っているもの

**`handover/OPEN-ITEMS-ja.md` の実機確認 3 件だけ。** Q1〜Q3 はその 2 番
（`PercentComplete` に 150 を書いたらどうなるか）の結果で見直す可能性がある。それまでは暫定。
