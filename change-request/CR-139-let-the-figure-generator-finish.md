# CR-139 — 図の生成器を最後まで通す

## 1. 変更概要

**`build.py` が図 F-015（`view-read`）で止まり、その先へ到達していなかった。**

```
draw.py model.json view-read.drawio --view read
  wrote view-read.drawio (9 nodes, 14 edges)
build: no clear position for edge label(s): coordinates     ← ここで sys.exit
```

**中断した先にあるもの** —— `view-read.svg` ／ `view-io` ／ `view-startup` ／ `docs/review/components/components.md`。**`model.json` を変えても、これらは再生成されない。**

| # | 直すもの | |
|---|---|--:|
| ① | ⭐ **`LABEL_FRACTIONS` に候補位置を 4 つ足す** | 1 行 |
| ② | **止まっていた 3 図を再生成** | 生成物 6 |

## 2. なぜいま出たか

**`model.json` は `03963b2` 以降変わっておらず、`build.py` は `5018e8f`（CR-133）と 1 文字も同じである。** つまり**同じ入力・同じコードで、CR-133 の時点から落ちていた。** 引継書の積み残し #1「図 F-015 の 3 本のラベルが重なる（`presentation values` / `coordinates` / `what is selected`）」がこれである。

⚠️ **CR-140（画面のモデル）は `model.json` にノード 4・辺 13 を足す。** 生成器が通らないままだと、**図と表が原稿と食い違ったまま残る。** 先に閉じる。

## 3. 何をしたか

`build.py:125`

```
いま   LABEL_FRACTIONS = (0.50, 0.60, 0.40, 0.68, 0.32, 0.76, 0.24, 0.84, 0.16)
新     LABEL_FRACTIONS = (0.50, 0.60, 0.40, 0.68, 0.32, 0.76, 0.24, 0.84, 0.16, 0.90, 0.10, 0.94, 0.06)
```

**辺の両端に近い 4 つを候補に足しただけである。** 判定の仕組み（箱に掛からず、既に置いた札にも掛からない最初の位置を採る）も、掛かったときに `sys.exit` する厳しさも変えていない。

## 4. 目で確かめた（draw.io CLI で PNG に落として比較）

| ラベル | コミット済み | 再生成後 |
|---|---|---|
| `presentation values` | ⛔ **`presentatio` で切れ、`what is selected` と重なる** | ✅ 全文が読める |
| `coordinates` | ⛔ **他の札に隠れて消えている** | ✅ 隣に並んで読める |
| `sizes + thresholds` | ⛔ `thresholds` だけ見えて上が欠ける | ✅ 全文が読める |
| `implements SvgSurface` ／ `layout once per frame` | ⛔ 重なる | ✅ 離れた |

**図 F-015 のラベルは全部読めるようになった。**

## 5. 残る不一致（積み残し #1 の後半）

⚠️ **`presentation values` が `ScheduleGeometry` の箱の右縁に 35px ほど掛かる。**

`build.py` は**折れ線の長さ比**で札の位置を測るが、draw.io は**直交経路の中間の線分**から決めるので、`build.py` が「箱に掛からない」と判定した位置に draw.io が置くとは限らない。**本 CR はこのずれを直していない。** 白背景で読めるので実害は無いが、**積み残しとして残す。**

## 6. 変更箇所

| # | ファイル | 何を |
|---|---|---|
| 1 | `docs/spec/_assets/source/build.py` | `LABEL_FRACTIONS` に 4 値 |
| 2 | `docs/spec/_assets/source/view-read.drawio` ／ `view-io.drawio` ／ `view-startup.drawio` | 再生成 |
| 3 | `docs/spec/_assets/view-read.svg` ／ `view-io.svg` ／ `view-startup.svg` | 再生成 |
| 4 | `docs/spec/A-appendix.md` | 版 0.33 |

⛔ **手で直したものは 1 つも無い。**`build.py` を直して回しただけである。
⚠️ **`docs/review/components/components.md` は内容が変わらなかった**（34 ノード 73 辺）—— 中断していたのに古くならずに済んでいたのは、`model.json` が中断より前から変わっていなかったためである。

## 7. 検証

| 検査 | 結果 |
|---|---|
| 16 ゲート | **ALL GREEN** |
| `audit-ch5.py` | **PASS** |
| `tables` / `rows` / `uids` | **112 / 1287 / 140**（不変。仕様書の本文を触っていない） |
| `build.py` | ⭐ **最後まで完走**（`components.md` まで到達） |
| 図の目視 | draw.io CLI で PNG に落として比較。上の表のとおり |

## 8. 残った作業

| # | 件 |
|---|---|
| 1 | `build.py` の札の位置の計算を draw.io の実配置に合わせる（積み残し #1 の後半） |
| 2 | 概要図（F-013）の 9 本の矢印が 1 本の通路に重なる（積み残し #2。本 CR の対象外） |
