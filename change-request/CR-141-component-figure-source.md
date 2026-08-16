# CR-141 — コンポーネント図の原稿を整える

## 1. 変更概要

| # | 直すもの | |
|---|---|--:|
| ① | ⭐ **生成器の知らない `shape` を 2 つ潰す**（`"rectangle"` → `"component"`） | 2 語 |
| ② | **原稿を `model.json` → `components.json` に改名** | `git mv` ＋ 3 ファイル |

**要求・表・行 ID は 1 つも動かない。** 動くのは図の原稿と生成物、そして原稿の名を指す 1 文である。

## 2. なぜいま出たか

**CR-140 の §F-1 が「`ScreenState` の `shape` を `rectangle` に揃えるか」を利用者の判断として残していた。** 調べたところ**前提が逆だった。**

図を描く `draw.py`（`~\.claude\skills\drawio-uml\scripts`）は `shape` を辞書引きする。

```
component  package  box  usecase  actor  state  action  decision  initial  final  note
```

**`rectangle` はこの語彙に無い。** そして引けなかった値は黙って既定値へ落ちる。

```python
SHAPES.get(node.get("shape", "box"), SHAPES["box"])
```

`component` は 180×70・字を上寄せ、既定の `box` は 170×60・字を中央。**箱の大きさが違っていたのは、選ばれた記法ではなく、語彙外の値が既定値に落ちていたからである。** 警告は出ない。

⚠️ **どの機械検査も `shape` を読まない**（`audit-ch5.py` / `md-checks.py` / `style-checks.py` / `check.sh` / `check-render.py` のいずれにも無い）。**捕まえる仕組みが無かったので 2 版にわたって残った。**

## 3. 分類は 4 つあり、2 対 2 に割れていた

表 T-060 の `LY-1` が **文書に保存しない実行時の値**として名指しするのは 4 つである。

| `LY-1` の語 | コンポーネント | 改定前 | 改定後 |
|---|---|---|---|
| 取り消しの履歴 | `EditHistory`（`CP-4`） | `component` | `component` |
| 選択 | `Selection`（`CP-32`） | **`rectangle`** | **`component`** |
| 確定した発話 | `DialogueLog`（`CP-33`） | **`rectangle`** | **`component`** |
| 画面の使い方の値 | `ScreenState`（`CP-36`） | `component` | `component` |

**`EditHistory` が同じ分類で `component` である以上、「`rectangle` ＝ 保存しない値」という読みは成り立たない。** CR-140 §F-1 はこの 4 つ目を数えていなかった。

⚠️ **2 つは `4592615`（CR-121）で生まれた。同 commit の説明文はこう書いている** ——

> It adds Selection and DialogueLog as document-model types, **following the EditHistory precedent for values that are never saved**

**倣うと書いた相手が `component` である。** `shape` の理由は同 commit にも CR-120 / CR-121 にも変更履歴にも 1 文字も無い。

## 4. 改名の理由

**同じフォルダが既に内容で名を付けている。**

| 原稿 | 生成物 |
|---|---|
| `erd.json` | `fig-erd-detail.md` ／ `fig-erd-overview.md` |
| **`model.json`** ← 何のモデルか分からない | `fig-components.drawio` ／ `fig-components.svg` ／ `components.md` |

**生成物が揃って `components` と名乗るのに、原稿だけが `model` を名乗っていた。** `erd.json` に揃えて `components.json` とする。衝突は無い（`components.md` は別フォルダ・別拡張子）。

## 5. 触ったもの

| ファイル | |
|---|---|
| `docs/spec/_assets/source/components.json` | `git mv` ＋ `shape` 2 語 |
| `docs/spec/_assets/source/build.py` | パス定数 1 ＋ 説明文の言及 8 |
| `.claude/skills/spec-graph-check/audit-ch5.py` | パス定数 1 ＋ 見出しと注釈 3 |
| `docs/spec/05-07-design.md:137` | **原稿の名を指す 1 文**（本 CR で唯一の仕様本文の変更） |
| 生成物 | `overview.json` ／ `.drawio` 5 ／ `.svg` 5 ／ `components.md` |

## 6. 触らなかったもの

- ⚠️ **変更履歴と過去の CR、`docs/review/` の日付つき記録は書き換えない** —— **CR-123 が同じファイルを移動したときに決めた作法**「記録は書き換えない。移動した事実は変更履歴の次の行が引き受ける」に従う。
- `build.py` と `audit-ch5.py` の定数名 `MODEL` —— 指すファイル名を直しただけで、識別子は動かさない。
- 5.2 の `**箱はコンポーネントである。**`（`:139`）—— **38 箱が揃ったことで、この 1 文は書き換えずに真になる。**

## 7. 数の検算

| | 改定前 | 改定後 |
|---|---|---|
| `tables` / `figures` / `rows` / `uids` | 112 / 10 / 1314 / 140 | **すべて不変** |
| ノード / 辺 | 38 / 86 | **不変** |
| `shape` の内訳 | `component` 36・`rectangle` 2 | ⭐ **`component` 38** |
| 語彙外の `shape` | 2 | ⭐ **0** |
| `fig-components.svg` の箱 | 180×70 が 36・170×60 が 2 | ⭐ **180×70 が 38** |
| 図の座標が動いたノード | — | **8（すべて `documentModel` の 1 行の中）。他クラスタは 1px も動かない** |
| 検査 5-10・15・12 | 0 | **0** ／ 助言 13・14 は 4 / 18 で不変 |

**`components.md` は `shape` の列を持たないので内容は変わらない**（再生成しても差分 0）。
