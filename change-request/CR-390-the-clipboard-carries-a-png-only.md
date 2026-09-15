# CR-390 — クリップボードは PNG の画像だけを運ぶ

> **閉じるもの**: 利用者の変更要求 2026-09-16 `JDG-122`「ヘッダーのクリップボードアイコンが動作していない。 SVGになってないか？ クリップボードはpngにしろ。」と、問いへの答え `JDG-123`「PNG を主にし、SVG の文字も一緒に載せる → 載せない。 PNGだけにする」—— 逐語は `docs/development-records/rulings.md` の同行。
>
> ⭐ **起草して、同じ波で `docs/spec` へ当てた。** 読んだ木は `ccdcfabc`。`src/` と `tests/` を手では書いていない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-004`**（`FR-080` と `FR-025` が指す、見えているものが成果物になる目標）。いまの入口は、SVG の文字をクリップボードへ載せるので、資料へ貼っても絵にならない。あわせて **`GL-006`**（マニュアルを読まずに使える）—— 押して何も貼れない入口は壊れた入口と見分けがつかない。

### ② レビュー観点のどの条項を当て、何が出たか

（`docs/development-rules/07-review-standards.md`）

- **`R1.1`（曖昧さがない）** —— 表 T-024 の `IO-6` は「現在の画面を画像として」とだけ述べ、画像の形式を定めていない。実装は `src/framework/browser-clipboard/browser-clipboard.ts:13` に STOP（`PND-120`）を置き、SVG の文字を `writeText` で載せている ⇒ 決定 1。
- **`R1.3`（唯一の正）** —— 画像の形式の規則を 2 か所に置かない。形式は `FR-025` の段が持ち、`IO-6` の行は用途だけを述べて `FR-025` を指す ⇒ 決定 2。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `IO-6` がクリップボードへ載せるのは `IO-4` と同じ PNG の画像 1 つだけとし（MUST）、SVG の文字を画像と一緒にであっても載せない（MUST NOT） | `JDG-123` の答えそのもの | 文字しか受けない貼り先には何も貼れない |
| 決定 2 | 規則は `FR-025` の `IC-3` の段の直後に置き、表 T-024 の `IO-6` の備考から `FR-025` を指す | 値の表に規則を置かない（1.9） | なし |

---

## 1. 原因 —— 読んで確かめた事実

| 事実 | 所 |
|---|---|
| クリップボードへ送る値は SVG の文字である | `src/framework/single-html-shell/frame-loop.ts:3241`（`{ kind: 'picture', svg: picture.svg }`） |
| 宿主へは `writeText` で渡している | `src/framework/browser-clipboard/browser-clipboard.ts:16`、`:40` |
| 仕様は形式を定めていなかった | 同 `:13` の STOP「spec does not decide whether a copied picture goes as an image or as SVG text」（`PND-120`） |
| 仕様に「クリップボード」と「SVG」を同じ条で述べる所 | 0（`grep -n クリップボード` の 21 件を読んだ） |

## 2. 測った

| 数 | 値 | 測り方 |
|---|--:|---|
| `FR-025` の `（MUST）` / `（MUST NOT）` の増分 | +2 | 足した段を数えた |
| 表 T-024 の行 | 変わらない | セルの編集だけ |

## 3. グラフ

**`impact.py IO-6 FR-025 CP-24 IF-5`**: `IO-6` は要求 4 件 / 参照 12 箇所（`FR-033`、`FR-021`、`FR-025` の 4 か所、`FR-096`、5.3 の 2 か所、表 T-109 の `IC-3` ほか）。どれも「画像」とだけ述べ、形式を名指さない ⇒ 形式を書き足しても偽になる参照は 0。

**`induced.py`**（`CR-391`〜`CR-395` と同じ種の束）: 本書の種（`FR-025` `IO-6`）は閉路に入らない。

**届いた行を `rulings.md` で引いた**: `JDG-122` / `JDG-123` だけ ⇒ 衝突 0。

## 4. 当てた中身

| ID | 置き場 | 中身 |
|---|---|---|
| `IO-6` | `01-04-requirements.md`（表 T-024） | 用途を「現在の画面を PNG の画像として他のアプリへ渡す」、備考に「載せるものの規則は `FR-025`」 |
| `FR-025` | 同（`IC-3` の段の直後） | 決定 1 の MUST と MUST NOT、その理由 |

## 5. 数の予測

tables 0 / figures 0 / rows 0 / uids 0。

## 6. 実装と試験で直す所（本書は直さない）

| 所 | 何が動くか |
|---|---|
| `src/framework/single-html-shell/frame-loop.ts:3241` | SVG の文字ではなく、`IO-4` と同じ道で作った PNG を送る |
| `src/framework/browser-clipboard/browser-clipboard.ts:13-17`、`:33-40` | `writeText` ではなく画像を書く口（`ClipboardItem` の `image/png`）で書く。STOP と `PND-120` を閉じる |
| `src/adapter/clipboard-gateway/clipboard.ts:32` の `ClipboardContent` | `picture` の中身を SVG の文字から PNG へ |

## 7. 試験が主張すべきこと

1. `IC-3` を押すと、クリップボードへ書かれるのは型 `image/png` の 1 項目だけであり、`text/plain` も `image/svg+xml` も無い（`FR-025`）。
2. 書かれた PNG を復号した画素が、同じ状態から `IO-4` で書き出した PNG と同じ（`FR-080` の画素の判定）。

## 9. ⛔ この変更でやらないこと

- ⛔ 宿主が画像の書き込みを拒んだときの告げ方を変えない（`PND-121` の射程）
- ⛔ `FR-102` の操作と描画の記録（文字）の経路を変えない —— あれは画像ではない
