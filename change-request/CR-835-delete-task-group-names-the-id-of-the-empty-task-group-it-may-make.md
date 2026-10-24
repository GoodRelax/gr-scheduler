# CR-835 —— タスクグループを消す命令の `newTaskGroupId` は、消して 1 つも残らないときに作る空のタスクグループの `id` だと書く

> 起草の状態: 起草だけ（2026-10-24、枝 `draft-crs-31`、起点 develop `d0ae3a9c8`）。当てていない —— `docs/spec`・`src`・`tests` に触れていない。当てるのは後の子セッション（計画 uid 35）。
> 当てる裁定: 無い —— 利用者に問う件ではない（`DFC-2855` の「対応方針」の欄の反証、2026-10-15）。コードが既に値を読んでおり、仕様の文だけが古い。
> 閉じる台帳: `DFC-2855`（`仕様待ち`）。
> 新しい ID: 無い —— 表 T-108 の `CM-27` の値の意味と、運ぶものの英語の文を書き直す。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定の鎖（`rulings.md` を「`CM-27`」「`deleteTaskGroup`」「`newTaskGroupId`」「タスクグループを消す」「1 つ以上」で引いた）

- `CM-27` と `newTaskGroupId` を名指す裁定は 0 件。
- 表 T-050 の結び「文書は、`TaskGroup` を必ず 1 つ以上持つこと（MUST）」（`docs/spec/01-04-requirements.md:2598`）は、要求の側で既に決まっている。本書はそれを変えない。
- 台帳: `defects.md` の `DFC-2855`（本書が閉じる）。行の「対応方針」の欄の反証（2026-10-15、`CR-765`〜`CR-768` の起草の席）が、値の役を示した。値は適用の段 `src/use-case/apply-document-change/document-change-plan.ts` の `freshRowIdOf`（164 行）が読み、`documentHoldingOneTaskGroup`（174 行、呼ぶ所は 262 行）が使う。消した結果タスクグループが 0 になったとき、代わりに作る空のタスクグループの `id` になる。
- `CR-766`（表 T-108 の運ぶ値の書き起こし）が、今のコードの形をそのまま書き起こして「⚠️ いまの編集はこの値を読まない」と書いた。本書はその一文を直す。`CR-766` は着地しているので追記はしない（追記すると検査 62 が赤くなる）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-006`（人と AI が同じ文書を触る）。この文は、取次の 2 つ目の資源 `grs-commands.schema.json`（表 T-035 の `AG-12` の ⑧）の説明として AI に届く。いまの英文「it has no effect」は誤りである。AI がこれを読むと、値を空や重複した `id` で埋めてもよいと読む。その結果、消して 0 になった文書に、他と重なる `id` のタスクグループが作られうる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R1.1`**（正しいこと —— 書いてあることが本当であること）と **`R2`**（規則の在り処が 1 つ）。

- `R1.1`: 「読まない」「効き目が無い」は、適用の段の実物（上の 164・174・262 行）と食い違う。
- `R2`: 0 になったときに 1 つ作る規則は表 T-050 の結びが持つ。`CM-27` の文はそれを指すだけにして、規則を言い直さない。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 値は命令から外さない —— 外すと、命令の道で 0 になった文書の空のタスクグループの `id` を、誰も渡せなくなる（`DFC-2855` の反証のとおり）。
2. ⭐ 消しても 1 つ以上残るときは、値を読まない（今のコードのまま）。そのことも文に書く —— AI が「毎回新しいタスクグループができる」と誤って読まないためである。

---

## 1. 対応

| # | 直すこと | 仕様の ID | 直す物 |
|---|---|---|---|
| 1 | `newTaskGroupId` の意味を、消して 1 つも残らないときに作る空のタスクグループの `id` にする | 表 T-108 の `CM-27` | `docs/spec/_source/document-commands.json` の `CM-27` の `values[1].meaning.ja` と `carries.en` |
| 2 | 生成物を作り直す | —— | `npm run gen`（`docs/spec/_assets/tbl-document-commands.md`・`docs/spec/_source/grs-commands.schema.json`） |

## 2. 影響

```
数の予測         tables 0 ・ rows 0（CM-27 の 2 つのセル） ・ uids 0 ・ figures 0 ・（MUST）±0
仕様の他の行     impact.py CM-27 —— 要求 0 件 / 参照 0 箇所（行を指す所は無い）
induced.py       CM-27 T-050 FR-032 T-108 —— 種 4 / 種の間の辺 3 / 輪 0
生成物           tools/generate_document_commands.py が書く 2 つ:
                 docs/spec/_assets/tbl-document-commands.md の 59 行、
                 docs/spec/_source/grs-commands.schema.json の 1254 行（description）。
                 ⚠️ grs-commands.schema.json は取次の資源なので、取次の成果物の版が動く（規則 10、CR-820）
コード           変わらない（値の型と読む所は今のまま）
試験             仕様だけを読む試験を 1 本足す（4 節）
毎フレームの仕事 変わらない
```

## 3. 書き直す所

### X-1 —— `docs/spec/_source/document-commands.json` の `CM-27` の `values[1].meaning.ja`（1438 行）

前: `"新しいタスクグループの \`id\`（⚠️ いまの編集はこの値を読まない）"`

後: `"消した結果タスクグループが 1 つも残らないとき、代わりに作る空のタスクグループの \`id\`（表 T-050 の結び） —— 1 つ以上残るときは読まない"`

### X-2 —— 同じ行の `carries.en`（1447〜1448 行）

前: `"Deletes the task group \`taskGroupId\`.",` / `"Warning: the current edit does not read \`newTaskGroupId\`; it has no effect."`

後: `"Deletes the task group \`taskGroupId\`.",` / `"When no task group is left, an empty task group with the id \`newTaskGroupId\` is made; otherwise \`newTaskGroupId\` is not read."`

消すもの: 「いまの編集はこの値を読まない」「it has no effect」の 2 つの文。

### X-3 —— 生成物

`npm run gen` で作り直し、`npm run gen:check` が緑であることを見る。

## 4. 継ぎ目（コード）と試験

- 継ぎ目: `src/use-case/apply-document-change/document-change-plan.ts` の `planDocumentChange`（`freshRowIdOf` → `documentHoldingOneTaskGroup`）。名も形も変えない。
- 仕様だけを読む試験（別のサブエージェント）が確かめること:
  1. タスクグループが 1 つだけの文書で、`deleteTaskGroup` に `newTaskGroupId` を `"fresh-1"` として送ると、書いた後の文書はタスクグループを 1 つ持ち、その `id` が `"fresh-1"` であること。名前は `FR-038` の辞書の `defaultNames` の `taskGroup` の語であること（表 T-050 の結び）。
  2. タスクグループが 2 つの文書で 1 つを消すと、残るのは消さなかった 1 つだけであること。`"fresh-1"` のタスクグループは作られないこと。
  3. 生成した `grs-commands.schema.json` の `deleteTaskGroup` の description が「has no effect」を含まないこと。

## 5. 台帳

- `defects.md` の `DFC-2855` —— 当てたら `実測待ち`。実物の確かめは要らない見込みである（画面の振る舞いは変わらない）。それでも、閉じるかどうかは調整役が決める。
- 変更履歴: `A-appendix.md` に 1 行（UTC の時刻、規則 10）。

## 6. 波

1 波で足りる。原稿（X-1・X-2）→ 生成（X-3）→ 仕様だけを読む試験（別のサブエージェント）。大きさ S。

## 11. 利用者に問うこと

無い —— 値の役はコードが既に持ち、表 T-050 の結びが既に定めている。直すのは古い 1 文だけである。

## 13. 測り方の再現

```bash
grep -n "newTaskGroupId" docs/spec/_source/document-commands.json docs/spec/_source/grs-commands.schema.json docs/spec/_assets/tbl-document-commands.md
grep -n "freshRowIdOf\|documentHoldingOneTaskGroup" src/use-case/apply-document-change/document-change-plan.ts
grep -n "必ず 1 つ以上" docs/spec/01-04-requirements.md
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py CM-27
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py CM-27 T-050 FR-032 T-108
```
