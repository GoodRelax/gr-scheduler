# CR-777 —— コメントボックスの線先は、タスクかハイライトボックスの 8 点に吸着してついて行き、吸着しなければ離した点そのものに立つ

> 状態: ⭐ **当てた** —— 2026-10-16、作業木 `6c11e22a` の上に、起草と同じ席が当てた（変更履歴は 4.91、`perf-pending` は 228）。仕様だけを読む別の席が試験を書いた（`tests/contract/cr-777-*`）。
> 当てる裁定: `JDG-2401`（`JDG-252` を覆し、`JDG-72`・`JDG-249` を一部覆す。どの行も既に「覆された」と書いてある）。細かい問い 5 つと、それに付く 1 つは、利用者の不在のあいだに推しを採った（`JDG-2440` 〜 `JDG-2445`）。
> 台帳: `DFC-2911`。新しい列 ID: `AT-163` 〜 `AT-167`。
> 任務の外: 本体・引出し線の引き（`CR-773` が当てた `JDG-2400`）は変えない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-001`（アルファの公開前に、見える不具合と揺れを残さない）と `CH-3`（仕様が自分と整合していること）。線先が離した点から最大で約 50px ずれて描かれること（`DFC-2911` の実測）と、指す先のタスクを動かすと線先が別の所を指すことを、利用者が選んだ E 混成で直す。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R2`**（規則の在り処が 1 つ）と **`R1.2`**。
出たこと: ① 吸着の 8 点を、描く側（`ScheduleGeometry`）と離した点を読む側（`InputCommandTranslator`）の 2 か所に書かない —— 8 点の並びは `anchorSnapsOf` 1 つが持ち、吸着の当たりは同じ 1 つを読む。② 吸着の掴み代は線先の掴み代 `S-292` と同じ 1 値とした（線先が応える所と、線先が吸い付く所が同じ正方形になる）。新しい設定の行は立てない。③ 「留めた点は日付とタスクグループの識別子で持つ」と言う文が `FR-019`・表 T-023b の `AR-5`・表 T-221 の `LF-15` と `LF-17` の 4 か所に在った —— 置き場の読みは `LF-15` 1 つに寄せ、ほかは `LF-15` を指す。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 予定と実績が描かれたタスクでは、離した点にいちばん近い点を持つほうの図形に吸着し、どちらの図形かを `anchorTaskFigure` に持つ（`JDG-2440`）。
2. ⭐ マイルストーンの 8 点は、図形の外接矩形の 4 辺の中点（菱形なら 4 頂点）と、隣り合う 2 つの中点のあいだの点（菱形なら 4 辺の中点）とする —— 8 点がどれも描いた形の上に立つ（`JDG-2441`）。
3. ⭐ 吸着の掴み代は `S-292`（線先の掴み代、6px）の正方形とし、引いているあいだは、今の引きの見せ方（線先の印 `ZO-10` と引出し線）を吸着した点に描く —— 新しい印は足さない（`JDG-2442`）。
4. ⭐ 吸着した対象が文書に在るのに描かれていない（畳んだ・実績を隠した）あいだは、コメントボックスを描かない —— `NG-7` と同じ扱い。対象の列の組が揃わない箱は自由点に描き、名指した対象が文書に無い文書はほかの参照と同じく `IV-2` が拒む（参照 `RL-33`・`RL-34`。`JDG-2443`）。
5. ⭐ GRS JSON の列名は `anchorBandFraction`・`anchorTaskUid`・`anchorTaskFigure`・`anchorHighlightBoxId`・`anchorSnapPoint`（値は `topLeftCorner`・`topMiddle`・`topRightCorner`・`rightMiddle`・`bottomRightCorner`・`bottomMiddle`・`bottomLeftCorner`・`leftMiddle` —— 窓の縁の名 `topLeft` などと別の名にした。検査 69 が偶然の一致を書き写しと読むため）。自由点の横は `anchorDate` の時刻（分）で持ち、新しい列を立てない（`JDG-2444`）。
6. ⭐ 置くとき（表 T-023b の `AR-5`）も同じ吸着を当てる。対象を消したときに書く自由点は、文書が知る対象の位置（日時とタスクグループ）から求め、帯の中の高さは吸着したときの値を保つ（`JDG-2445`）。

---

## 1. 対応

| # | 直すこと | 仕様の ID | 直す物 |
|---|---|---|---|
| 1 | 線先の持ち方 —— 自由点（日時 × タスクグループ × 帯の中の高さ）か、対象（タスクの `UID` と図形 ／ ハイライトボックスの ID）× 8 点 | `FR-019`・`AT-113`・`AT-163` 〜 `AT-167`・表 T-108 の `CM-46`・`CM-50` の値の形 `AnnotationAnchor` | `docs/spec/_source/erd.json`・`document-commands.json`、`npm run gen` |
| 2 | 線先を描く点 | 表 T-221 の `LF-15`・`LF-17` | `comment-box.ts` の `commentAnchorPointOf`・`anchorSnapsOf`・`commentGeometry` |
| 3 | 線先を引いて離したとき・置いたときの吸着 | 表 T-023d の結びの `GR-14` の段・表 T-023b の `AR-5` | `item-hit-area.ts` の `anchorSnapAt`、`input-command-translator.ts` の `commentAnchorAt`（吸着した点か離した点と、描く点を返す）、`item-grab.ts`（引いた線先・選んだものの平行移動は吸着を保つ）・`armed-placement.ts` |
| 4 | 対象を消したときに自由点へ書き換える | `FR-019` | `edit-annotation.ts` の `commentBoxesReleasedFrom`（`CM-53`）を `edit-task.ts`（`CM-7`。`deleteTask` を `editTask` から切り出した —— 規則 07 の `R2`）と `edit-task-group.ts` が読む |
| 5 | 合流（取り込み）で名指しを保つ | `FR-019` | `import-document.ts`（タスクの `UID` を `mergedUidOf` で写す。写せなければ自由点） |
| 6 | 1 つの日の時刻の表から線先の日時を外す | 表 T-350 の `WT-8` | `01-04-requirements.md` の 1 行（コードは `commentAnchorAt` が既に分まで書く） |

## 2. 影響

```
仕様の他の行     FR-019・GR-14 の段・AR-5・LF-15・LF-17・AT-113・AT-163..167・AnnotationAnchor・PI-6 の commentAnchorPointOf / anchorSnapsOf
生成物           fig-erd-detail.md・tbl-document-commands.md・tbl-published-entries.md、schedule-entities.ts、GRS JSON スキーマ、
                 命令の型（edit-annotation.ts）、MCP の道具の説明、画像から GRS JSON への指示文
試験             既存の線先の位置（日の列の中央 × 帯の中央）を見る試験の期待が変わる。新しい試験は別の席が仕様だけから書く
毎フレームの仕事 コメントボックス 1 つにつき、対象の図形を 1 つ探す（タスクの図形の並びを 1 度だけ索く）
```
