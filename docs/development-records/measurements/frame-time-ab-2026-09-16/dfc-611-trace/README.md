# DFC-611 のフレーム時間を trace で割る探り針

`DFC-611` —— 依存線を引き、**空き地の上で押さえている**あいだのフレーム時間が、先端 24.2 ms 対 段 0 12.0〜12.1 ms。
描き直しの呼び出しの中（6.8〜7.0 対 6.4〜6.6 ms）と同期ディスパッチ（0.5〜0.6 対 0.6〜0.7 ms）はほぼ同じなので、
増えた分は**呼び出しの外**にある。ここに置く 3 本は、その外側を Chrome の trace で
script / style / layout / paint / 合成 に割る。

生データ（trace の JSON）は 1 本 8〜12 MB あるので、**出力先はリポジトリの外**（scratchpad）に取ること。
本フォルダに置くのは探り針・要約器・回し方・本書だけである。

| ファイル | 役目 |
|---|---|
| `dfc-611-trace.mjs` | 木を 1 本受け取り、記録 17 追補の `dependency-drag.mjs` と同じ手順でドラッグを置き、区間ごとに CDP `Tracing` を掛けて trace を書き、要約する |
| `summarise-trace.mjs` | trace の JSON を読み、フレームごとの段階別の時間を出す（`dfc-611-trace.mjs` が取り込む／単体でも走る） |
| `run-trace-ab.py` | 2 本の木を交互に走らせ、走行ごとの中央値と最小〜最大の表を出す（記録 17 の比べ方） |

## 走らせ方

### 1. 木を 2 本用意する（記録 17 の手順そのまま）

```
git archive 5c1b915 | tar -x -C <scratch>/perf-a-5c1b915     # 段 0
git archive <先端>  | tar -x -C <scratch>/perf-b-<先端>       # 比べる側
# 各木で node_modules を親につなぎ（ジャンクション／シンボリックリンク）、npx vite build
# 段 0 の dist/index.html の sha256 が 2cf34431… であることを確かめる（⚠️ 旧記の 8460eaa9… は誤り。下の「⚠️ sha256 の訂正」を見ること）
```

### 2. 交互に測る（本番。前に立つ者が、ほかの重い走行を止めてから 1 回だけ）

```
python docs/development-records/measurements/frame-time-ab-2026-09-16/dfc-611-trace/run-trace-ab.py ^
  <scratch>/perf-a-5c1b915 stage0-5c1b915 ^
  <scratch>/perf-b-<先端>  tip-<先端> ^
  <scratch>/dfc611-trace-ab 3 5000
```

- **3** ＝ 交互の回数（記録 17 は各ビルド 3 回）。**5000** ＝ 区間ごとに trace を掛けたまま動かす ms
  （記録 17 の `dependency-drag` も各区間 5 秒以上）。1 回の走行で 2 区間を測るので、trace の時間は
  1 走行あたり 10 秒、6 走行で 60 秒。段取り（1000 件の起動・ドラッグの置き場探し）を入れて 1 走行 2〜4 分。
- 走行ごとに `<out>/run<N>-<label>.json`（結果と要約）と `<out>/run<N>-<label>-<区間>.trace.json`
  （DevTools の Performance に読ませられる生の trace）が出る。表は `<out>/summary.txt`。
- 1 本だけ走らせるなら:
  `node dfc-611-trace.mjs --tree <木> --out <出力先> --label <名前> --holdMs 5000`
- 既にある trace を読み直すだけなら: `node summarise-trace.mjs <out>/xxx.trace.json`

## 数の意味

**フレームの区切り**: 描き直しの呼び出し（`FireAnimationFrame`）が連続で走る塊を 1 フレームとし、
次のフレームの先頭までを 1 つの窓とする。窓の長さが `frame interval`。
⚠️ これは呼び出しに入った**実時間**であり、`NFR-002` / `NFR-003` と探り針が使う **rAF の刻みの間隔とは別の物差し**である
（同じ区間の in-page の値を `probe.frameTime` として並べてあるので、離れていないかを見ること）。
区間は、ページが出す `console.timeStamp('dfc611:<区間>:start' / ':end')` で囲った内側だけを採る。

**段階**: 各イベントの**自己時間**（自分の `dur` − 直下の子の `dur`）を名前で段階に振り、窓ごとに合計する。
表に出るのはその**窓ごとの中央値と平均**である。

| 行 | 中身 |
|---|---|
| `main.script` | `FunctionCall`・`EvaluateScript`・`EventDispatch`・`FireAnimationFrame` の自己時間・GC など |
| `main.parseHTML` | `ParseHTML`（`innerHTML` で払う分） |
| `main.style` | `UpdateLayoutTree`（スタイルの再計算） |
| `main.layout` | `Layout` |
| `main.hitTest` | `HitTest`（ポインタが何の上かを問う費用） |
| `main.paint` | `PrePaint`・`Paint`・`RasterTask` |
| `main.composite` | `Layerize`・`UpdateLayerTree`・`Commit`・`DrawFrame` |
| `main.other` | どれにも入らなかった自己時間（`RunTask` の自己時間など） |
| `main.busy` | その窓のあいだ、レンダラの主スレッドが走っていた合計（最上位のイベントの和） |
| `main.idle` | 窓の長さ − `main.busy`。**主スレッドが待っていた時間** |
| `off.*` | 主スレッド以外（ラスタ、合成、GPU プロセス、ブラウザプロセス）の自己時間 |
| `count.*` | 窓あたりの `BeginFrame` / `DrawFrame` / `DroppedFrame` / `Commit` / `HitTest` / `EventDispatch` の数 |

⭐ **平均は足し合わせられる。中央値は足し合わせられない**（別々の窓の中央値なので、段階の中央値の和は
`frame interval` の中央値にならない）。⇒ 「どこが増えたか」は平均で、「ふつうの 1 フレーム」は中央値で読む。

## 限界（⛔ これを書かずに数だけ持ち出さない）

- **trace 自身が重い。** `disabled-by-default-devtools.timeline` を掛けたままの測定なので、フレーム時間は
  trace 無しの値と一致しない。⭐ だから **A と B を同じ trace の条件で交互に測り、差だけを読む**。
- **窓の割り当ては開始時刻で決める。** 窓の境目をまたぐイベントの自己時間は、始まった側の窓に全部入る。
- `off.other` は他プロセスの `RunTask` の自己時間で、**trace の収集そのものの仕事も入る**。
  アプリの費用として読んではならない。⭐ 他プロセスで意味を持つのは `off.gpu`・`off.paint` と `count.DrawFrame` / `count.DroppedFrame` である。
- **headless の Edge 1 台・同じ日の数回**の値であり、表 T-043 の門の値ではない（`LM-19` の実測を置き換えない）。
- ドラッグの置き場（どのタスクを掴み、どのタスクを相手にするか）は走行ごとに探し直すので、
  **2 つのビルドで同じタスクが選ばれるとは限らない**。⚠️ `dependency-drag.mjs` も同じ性質である。
- 区間は 2 つだけ（空き地の上、他のタスクの上）。記録 17 の 3 つ目（往復）は測らない。

## SMOKE —— 配管が数を出すことの確認だけ（2026-09-16、⛔ 結果ではない）

各ビルド **1 回・区間ごとに 2 秒**だけ走らせた値。本番は上の 3 回 × 5 秒で測り直すこと。
木は `perf-a-5c1b915`（⚠️ **当時 sha256 `8460eaa9…` と記したが、その値は誤りである。正しくは `2cf34431…` —— 下の「⚠️ sha256 の訂正」を見ること**）と `perf-b-f45e9cd7`（`30de7724…`）、Edge 153.0.4234.32 headless、1920×1080、`Task` 1000 件。

| 区間 | 行 | 段 0 `5c1b915` | 先端 `f45e9cd7` |
|---|---|---:|---:|
| 空き地の上 | `frame interval` 中央値 | 8.24 | 23.33 |
| 空き地の上 | `probe.frameTime` 中央値（in-page、同じ区間） | 7.4 | 22.9 |
| 空き地の上 | `main.busy` | 8.22 | 17.21 |
| 空き地の上 | `main.idle` | 0.08 | 5.88 |
| 空き地の上 | `main.script` | 7.73 | 8.32 |
| 空き地の上 | `main.parseHTML` | 0 | 1.95 |
| 空き地の上 | `main.style` | 0 | 1.5 |
| 空き地の上 | `main.layout` | 0 | 1.38 |
| 空き地の上 | `main.paint` | 0.01 | 1.19 |
| 空き地の上 | `main.composite` | 0.04 | 0.72 |
| 空き地の上 | `main.hitTest` | 0.12 | 0.66 |
| 空き地の上 | `off.gpu` | 0 | 7.04 |
| 空き地の上 | `count.DrawFrame`／`count.BeginFrame` | 0／1 | 1／3 |
| 他のタスクの上（対照） | `frame interval` 中央値 | 8.53 | 8.0 |
| 他のタスクの上（対照） | `main.busy` | 8.64 | 5.88 |
| 他のタスクの上（対照） | `main.script` | 7.85 | 5.22 |
| 他のタスクの上（対照） | `main.parseHTML`／`style`／`layout`／`paint` | 0／0／0／0.01 | 0／0／0／0.01 |

⚠️ この 2 秒の走行では、段 0 の in-page のフレーム時間が 7.4 ms と出ており、記録 17 追補の 12.0〜12.1 ms と合わない
（trace の重さ・2 秒という短さ・選ばれたタスクの違いのいずれか）。⛔ **SMOKE の数で `DFC-611` を論じてはならない。**

## ⚠️ sha256 の訂正（2026-09-16）

**本書が 2 か所（上の「走らせ方」の検証条件と、SMOKE の木の素性）で段 0 `5c1b915` の
`dist/index.html` の sha256 を `8460eaa9…` と書いていたが、その値は誤りである。**

⭐ **実測**: リポジトリに commit されている `5c1b915:dist/index.html` の sha256 は
`2cf3443178138f31a4e53ee18be868e63c187a038c6b21823a5c78f5b19e949f`（1,181,937 バイト、blob `f381719c`）である。
測り方は `git show 5c1b915:dist/index.html | sha256sum`（`git cat-file -p` でも同じ値）。

⭐ **道具立てのビルドは再現する**: 今日 `git archive` で写して `npx vite build` した木も同じ `2cf34431…` になり、
同じ手順で先端 `7ca9524b` は `fe6cd9b4…` となって、commit 済みの `7ca9524b:dist/index.html` と 1 バイト違わなかった
（前半は配線の体の実測、後半の commit 済みの値は台帳の体が `git show 7ca9524b:dist/index.html | sha256sum` で確かめた）。

⛔ **旧記の `8460eaa9…` がどこから来たのかは分かっていない。**
⚠️ 同じ値は `docs/development-records/refactor-plan-report-2026-09-13.md:769` も主張しているが、
**そちらは過去の記録なので書き換えていない** —— 記録は当時書いたままに残し、訂正は本書が持つ。

## 本番（2026-09-16）

**条件**: `run-trace-ab.py` で段 0 `5c1b915` と比べる側 `f45e9cd7` を交互に 3 回ずつ、区間ごとに trace を掛けたまま 5000 ms。Edge 153.0.4234.32 headless、1920×1080、`Task` 1000 件。6 走行すべて `ok True`。

**木**:
- 段 0: `5c1b915` を `git archive` で写し、リポジトリの外の一時領域で `npx vite build`。dist の sha256 は `2cf34431…`（commit 済みの `5c1b915:dist/index.html` と 1 バイト違わない）。
- 比べる側: `f45e9cd7`（`DFC-611` を測った先端。表示の大きさの変更要求の波の前で、`S-234` は仕様にもコードにも 0 件）。同じ手順でビルドした dist の sha256 `30de7724ce8cdd5df9f1476dce46b5db049f99838e145d7237b7c6a71cac4fbe`。上の SMOKE が同じ木で記した `30de7724…` と一致する。
  ⚠️ commit 済みの `f45e9cd7:dist/index.html` は `c9cbc8d8…` で一致しない。理由: dist を最後に焼いた commit は `87ad0ff5`（2026-09-15 10:10）で、以後 `f45e9cd7` まで src/ が 3 ファイル変わっても dist は焼き直されていない（`git log -1 f45e9cd7 -- dist/index.html` は `87ad0ff5` を指し、`git diff --stat 87ad0ff5 f45e9cd7 -- src` は `input-command-translator.ts`・`item-hit-area.ts`・`frame-loop.ts` の 3 ファイルを挙げる —— 両方とも本節を書く体が実測）。⇒ **ソースから焼いた `30de7724…` が `f45e9cd7` の実際の出荷ビルドである。**

**なぜ今の先端ではなく `f45e9cd7` か**: 利用者の裁定（2026-09-16、問 5「原因は a で割る」）。今の先端は表示の倍率で既定 1/3 に縮めて描くため、画面に入るタスクが増え、「退行」と「描く量の増加」が混ざる。今の先端で走らせた 3 回は、探り針が掴み代を見つけられず 3 回とも準備で落ちた（`no ew-resize beside the finish edge`）。探り針の直しの書きかけはリポジトリの外に patch として保管してある。

### 空き地の上（`DFC-611` の場面）、3 走行の中央値

| 行 | 段 0 `5c1b915` | 先端 `f45e9cd7` |
|---|---:|---:|
| `probe.frameTime` 中央値（in-page） | 6.1 / 6.1 / 6.1 | 24.3 / 24.2 / 24.2 |
| 描き直しの呼び出しの中（`insideRedrawCallback`） | 6.4〜6.6 | 7.0〜7.9 |
| `main.script` | 7.35〜7.78 | 8.89〜9.14 |
| `main.parseHTML` | 0 | 1.83〜2.05 |
| `main.style` | 0 | 1.37〜1.51 |
| `main.layout` | 0 | 1.22〜1.41 |
| `main.paint` | 0.01 | 1.13〜1.82 |
| `main.composite` | 0.04 | 0.77〜1.11 |
| `main.hitTest` | 0.12〜0.14 | 0.72〜0.75 |
| `main.busy` | 7.74〜8.18 | 17.74〜19.63 |
| `main.idle` | 0.06〜0.1 | 5.85〜6.57 |
| `off.gpu`（主スレッドの外） | 0 | 6.86〜7.39 |
| `count.DrawFrame`（窓あたり） | 0 | 1 |
| `count.BeginFrame`（窓あたり） | 1 | 4 |

⭐ `probe.frameTime` の 24.2 ms は `DFC-611` の行が記す 24.2 ms を再現している。

### 他のタスクの上（対照）

| 行 | 段 0 `5c1b915` | 先端 `f45e9cd7` |
|---|---:|---:|
| `probe.frameTime` 中央値（in-page） | 6.1 | 6.1 |
| `frame interval` 中央値 | 15.75〜22.7 | 6.07〜6.08 |
| `main.script` | 14.77〜20.96 | 4.29〜4.35（先端のほうが速い） |

### 読み

⚠️ 下の 2 段は分けて読むこと —— 上は trace の実測、下は本書を書く体の見立て（コードは読んでいない）。

**trace が示すこと**: 空き地の上で増えた約 16 ms は JavaScript ではない（`main.script` の増分は中央値の範囲で見て 1.5 ms 前後）。段 0 は空き地の上でフレームを 1 枚も描き直していない（`count.DrawFrame` 0）のに対し、`f45e9cd7` は毎フレーム描き直しており、`main.parseHTML` → `main.style` → `main.layout` → `main.paint` → `main.composite` → `off.gpu`（ラスタ、約 7 ms）を毎フレーム払い、主スレッドは GPU を待って約 6.5 ms（`main.idle`）空いている。

**見立て（コードを読んで確かめてはいない）**: 段 0 には、依存線を引く間にポインタに追従する仮の線が無かった（`fixed-defects.md` の `DFC-591`、`JDG-84` で足した機能）。先端はその仮の線を毎フレーム HTML の文字列で描き直している疑いが濃い（`main.parseHTML` が毎フレーム約 1.9 ms）。⇒ `DFC-611` の行が既に挙げている対応案 ①「仮の線を別の要素にして属性だけを書き換える」と整合する。⛔ 原因の特定はまだ。直す体がコードで確かめること。

⚠️ 段 0 の in-page `probe.frameTime`（6.1 ms）は、記録 17 追補の 12.0〜12.1 ms と合わない。先端の 24.2 ms は一致している。理由は未確認（trace を掛けたまま測っていることなど、上の「限界」の条件が絡んでいる可能性がある）。同じ日に交互に測っているので、この走行の中の比べ方（段 0 対 先端）は有効である、と読む。
