# DEF-007: 図形ボキャブラリの仕様↔コード drift（milestoneShape / taskShape）

- 起票: 2026-07-21（CR-004 実装フェーズ着手時に発見）
- 種別: documentation-defect（仕様プローズとコード/スキーマの図形キー不一致）
- 重大度: **Low**（品質ゲート非ブロック。`document-schema-conformance.test.ts` はコード出力↔
  `schema.json` のみを突合し、`.sdoc` プローズは突合しないため緑は保たれる）
- 状態: **Open（CR-004 スコープ外・将来の是正パス/CR で解消）**

---

## 事象

`docs/spec/11-items-icons.sdoc` の `ITEM-L1-004`（既定図形セット）が列挙する図形キーが、実コード
（`src/domain/model/schedule-model.ts`）および SSOT スキーマ（`docs/api/gr-scheduler.schema.json`）
の enum と一致しない。CR-004 以前から存在する drift。

| 区分 | `.sdoc` ITEM-L1-004 のプローズ | コード/スキーマの実 enum |
|------|------------------------------|--------------------------|
| milestoneShape 基本 | circle, triangle_up, triangle_down, square, star, pentagon, hexagon（7） | circle, triangle, square, diamond, star（5） |
| taskShape | line, arrow, double_arrow, segmented_bar, chevron（5） | bar, arrow, chevron, span（4） |

## CR-004 実装での扱い（決定 D-1, 2026-07-21・自律判断）

CR-004 Part 6c は「特殊マイルストーン7種の追加」、Part 6b は「star の輪郭化」のみを求め、基本図形
キーの改名や taskShape の変更は求めていない。したがって CR-004 実装では:

- `milestoneShape` enum = 既存コード基本5（circle, triangle, square, diamond, star）
  **＋ 特殊7種（file, box3d, floppy, cylinder, person, smiley, beer）= 計12**。
- `taskShape` は変更しない（bar, arrow, chevron, span）。
- `iconShapeKind` = milestoneShape ∪ taskShape。

この結果、CR-004 実装後も上表の drift（基本図形の命名 triangle_up/down・pentagon・hexagon、
task の line/double_arrow/segmented_bar）は残存する。**基本図形ボキャブラリの正典化は CR-004 の
意図ではないため本 DEF に切り出し、別途是正する。**

## 是正方針（将来）

以下いずれかを別パス/CR で決定・実施:
1. `.sdoc` プローズをコードの実 enum に合わせて正典化（推奨: 実装が動いている側を正とする）。
   milestoneShape 基本 = circle/triangle/square/diamond/star、taskShape = bar/arrow/chevron/span。
2. あるいは、不足図形（triangle_up/down/pentagon/hexagon 等）を意図的に実装して `.sdoc` 側に
   合わせる（図形描画の追加実装を伴う設計判断）。

推奨は 1（コードを正典とする最小是正）。ユーザー確認事項として自律セッション報告書に記載。
