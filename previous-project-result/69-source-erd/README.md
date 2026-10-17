# 69 — `_source` の JSON の関係図と、2 つの検査（改名の前の段 0）

作った日: 2026-10-17。基にした版: `e5d2b794`（`integ/coord-1017` の先端）。裁定: `JDG-2692`（関係は手で描かず参照から生成し、検査は参照の整合と許可リスト付きの名の整合の 2 層）、`JDG-2691`（許可リストの最初の 7 件）。

**利用者に見てほしいもの**: 下の図 1 枚と、2 節の表。改名（段 1〜2）は、この図を利用者が見て良しとしてから始める。

## 1. 図 —— `_source` の JSON が互いの何を指すか

![_source の JSON の関係](fig-source-relations.png)

- 正: `docs/spec/_source/fig-source-relations.drawio`（生成物）、仕様へ載せる絵は `docs/spec/_assets/fig-source-relations.svg`。上の PNG は見るための写し。
- 作り方: `npm run gen:relations`（`docs/spec/_source/source_relations.py`）。参照は手で書かず、各 JSON の値から読む。読み手は `.claude/skills/spec-graph-check/source_refs.py` の 1 つだけで、図と 2 つの検査が同じものを「参照」と呼ぶ。
- 読み方: 点線の枠 1 つが JSON 1 本。矢印は「指す欄の名 と 数」（例 `column 92, key 60` は、`document-commands.json` の値 92 個が `column` で、60 個が `key` で `erd.json` の列の行 `AT-` を指す）。上の橙の帯は手書きの Markdown（行 ID を持つ側）、下の灰色の帯は生成される JSON。
- 図に載せたのは **構造の参照**（値の全体が他のファイルの行・実体・列・部品を名指す欄）だけである。文中のコード区間の行 ID（散文の参照）は 68 本あり、図にすると全部の箱を覆ったので、3 節の表にした。

### 図に載る構造の参照（23 本、`source-relations.json` の `structured`）

| 指す側 | 欄 | 指される側 | 数 |
| --- | --- | --- | ---: |
| `document-commands.json` | `column`・`key` | `erd.json` の列の行 `AT-` | 152 |
| `document-commands.json` | `column`・`valuesOf` | `settings.json` の行 `S-` | 49 |
| `erd.json` | `defaultFrom`・`maxItemsFrom` | `settings.json` の行 `S-` | 4 |
| `property-items.json` | `columns`・`appliesTo` | `erd.json` の列名・実体名 | 62 |
| `display-words.json` | `rowId`・`firstRow` | `property-items.json`（`PR-`）・`notice-reasons.json`（`RS-`・`QN-`）・手書きの 3 本（`IC-`・`K-` ほか） | 602 |
| `state-machines.json` | `evidence` | `settings.json`・`notice-reasons.json`・`erd.json`・`document-commands.json`・`agent-api-members.json`・手書きの 3 本と UID | 1,079 |
| `published-entries.json` | `component` | `components.json` の部品名 | 39 |
| `settings.json` | `valuesFrom` | `01-04-requirements.md` の表 T-376 | 2 |
| 生成 | — | `erd.json`＋`settings.json` → `grs-document.schema.json`、`components.json` → `overview.json` | — |

⚠️ **図に出ない関係**（構造の欄が無いので、読み手が拾えない）:

- `agent-api-members.json` と `document-commands.json` は、型の名と命令の名でつながるが、互いを指す欄を持たない（散文の行 ID だけ）。Agent API の名と命令の名がそろっているかは、この検査の外である。
- `grs-document.schema.json` の鍵は `erd.json` と `settings.json` から生成されるので、鍵の名の正はその 2 本である（改名はそこを直し、生成し直す）。

## 2. 2 つの検査（`check.sh` の 83 と 84）

| 検査 | 赤にするもの | 今の数（`e5d2b794` ＋ 本変更） | 壊して確かめた |
| --- | --- | --- | --- |
| 83 参照の整合 `check-source-references.py` | どこにも解けない参照（構造の欄と、コード区間の行 ID）／もう何にも当たらない除外の行。あわせて `source_relations.py --check` が辺の表の古さを見る | 15 本の JSON から 6,738 の参照。除外 4（`property-items.json` の「文書の列ではない」項目 `PR-16`・`PR-37`・`PR-38`・`PR-44`、理由は `source-references-exempt.txt`）。退いた ID の散文の引用 2（`S-440`・`S-441`、刷るだけ） | `CM-87` の `column` を `AT-9999` にすると 1 件赤 |
| 84 名の整合 `check-source-names.py` | 名が指す先の名と合わない／もう何にも当たらない許可の行 | 354 の対（命令の値と書く列 116、値と行の鍵 60、保存の鍵と画面の語 178）。合わない 41 件はすべて `source-names-allow.txt` に理由つき | `CM-87` の値の名を変えると 1 件赤。`K-77` の許可の行を消すと 1 件赤 |

### 許可リストの 41 件の内訳（`source-names-allow.txt`）

| 群 | 件数 | 例 |
| --- | ---: | --- |
| 利用者が名を残した（`JDG-2691`） | 10 | `isDependencyVisible` ↔ Dependency Lines、`strokeColor` ↔ Outline Color（3 実体）、`milestoneGlyph`、`viewTimeZone`、`levelZeroTreeState` |
| 改名が決まっている（`CR-792` が着地すると行が古くなり、同じ変更で消す） | 7 | `targetTaskGroupId` ↔ `parentId`（`JDG-2689`）、`uids` ↔ `uid`（`JDG-2685`）、`fontScale` ↔ Font Size、`parentProgressToleranceDays`、`editGroup` ↔ Edit Permission、`scrollDayOffset`・`scrollGroupOffset` |
| 値の形の都合 | 21 | 注記の錨の形 `AnnotationAnchor` の 7 欄（`date` ↔ `anchorDate` ほか）、`dx`・`dy` ↔ `bodyOffsetPx`、予定・実績の日付の対の欄、MSPDI の名 `resumeValid` |
| 1 組ずつ問うて残した（`JDG-2720`〜`JDG-2722`、2026-10-17） | 3 | `themeHue` ↔ Theme Color（`JDG-966` で据え置き済みだった）、`scrollDate` ↔ Left Edge Date、`scrollTaskGroupId` ↔ Top Task Group |

⭐ 改名の後で検査 84 が言うこと: `scrollDateFraction` ↔ Left Edge Time と `scrollTaskGroupFraction` ↔ Top Task Group Position は、新しい名でも画面の語と合わない —— `CR-792` が新しい行（理由は `JDG-2681`）を書く。`fontSizeStep`・`parentTaskProgressToleranceDays`・`editPermission`・`resourceUids`・`parentId` は合うようになり、許可の行は要らなくなる。

## 3. 散文の参照の数（ファイルからファイルへ、`python docs/spec/_source/source_relations.py --matrix`）

行 = 引く側、列 = 行 ID を定める側。

| cites / defines | spec UIDs | 01-04-requirements.md | 05-07-design.md | tbl-glossary.md | agent-api-members.json | document-commands.json | erd.json | notice-reasons.json | property-items.json | published-entries.json | settings.json | state-machines.json |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| agent-api-members.json | 35 | 128 | 2 | 1 |  | 3 |  | 3 |  | 21 |  |  |
| display-words.json |  |  |  |  |  |  |  |  |  |  | 2 |  |
| document-commands.json | 102 | 41 |  |  | 2 |  | 10 |  |  | 2 | 13 | 3 |
| erd.json | 57 | 73 | 19 | 2 |  | 5 |  |  | 1 |  | 43 | 1 |
| notice-reasons.json | 64 | 98 | 35 | 4 |  |  |  |  |  |  | 14 |  |
| property-items.json | 28 | 50 |  | 1 |  | 12 | 13 |  |  |  | 22 |  |
| published-entries.json | 198 | 666 | 82 | 42 | 10 | 29 | 22 | 22 | 2 |  | 108 | 53 |
| row-id-prefixes.json |  | 16 |  |  | 1 |  |  |  |  |  |  |  |
| settings.json | 488 | 912 | 17 | 32 |  | 2 | 13 | 6 | 9 |  |  | 2 |
| state-machines.json | 16 | 59 | 15 | 31 | 1 | 9 | 6 | 17 | 3 |  | 20 |  |
| verification.json |  | 1 | 6 |  |  |  |  |  |  |  |  |  |

## 4. 測り方

- 参照の数: `python .claude/skills/spec-graph-check/check-source-references.py`（OK の行）。名の対の数: `python .claude/skills/spec-graph-check/check-source-names.py`（OK の行）、合わない対の一覧は `--list`。
- 行 ID の持ち主: `specindex.build()` が仕様の表の行を読み、生成された Markdown（`tbl-settings.md` ほか 11 本）の行は、その見出しが名指す JSON の原稿へ帰す。
- 図の箱の数と辺の数: `npm run gen:relations` の出力（19 の箱、26 の辺）。
