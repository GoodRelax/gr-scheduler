# 大きな見本の上の引き・範囲選択・パン・ズームのフレームの内訳（2026-10-10）

記録のみ（`PW-3` の ② の側の探り針）。段 0 との比べ（`PW-3` の ①）はしていないので、合否は言わない。
測ったのは `81f20d33`（`origin/main`）の木。コードは変えていない —— 直しの効き目は、描いた絵や台本を書き換えた写し（反実仮想）で見積もった。
利用者の裁定（2026-10-10、「それでやれ」）に従い、直すのは `CR-721` の着地の後である。

## 0. 要旨

⭐ **基準日の線の引き（`UC-006` の手順 1）・範囲選択（`MK-6`）・ズーム（`MK-2`）が 1 フレーム約 0.4 s かかる主因は、JS ではなく描画（raster）である。**
依存線のハロー 161 本が、それぞれ画面全体（1920×1080）を覆う 1 つのマスク（`grs-dependency-halo-mask-…`、黒い矩形 161 個）を参照している。
Playwright の Chromium（ソフトウェアの raster）では、raster が 4 本のスレッドで 1 フレーム合計約 1.5 s の CPU を使い、主スレッドはその終わりを `Commit` で約 0.3 s 待つ。
Edge（GPU の raster）では GPU プロセスの主スレッドが 1 フレーム約 0.12〜0.14 s 塞がり、間隔は 144 ms で止まる。

⭐ **主スレッドの JS の約 8 割は `nonWorkingDaysSvg` である** —— 見えている日ごと（約 1,250 日）に `workingDaysBetween` を呼び、そのたびに暦の索引（`indexOfCalendar`、例外 110 件の日付の読み直し）を作る（1 フレーム 61〜74 ms）。
`working-calendar.ts` の 59 行の TRAP（「索引は 1 回の歩みに 1 回」）に反している。

⭐ **2 つを併せて直す見込み（写しで測った、間隔の中央値）**: 基準日の線の引き 386 → 25 ms（Chromium）・144 → 24 ms（Edge）、範囲選択 400 → 18 ms・144 → 19 ms、ズーム 386 → 23 ms・79 → 26 ms。
⚠️ 片方だけでは足りない —— 暦の直しだけでは描画が律速のまま（Chromium の `(a)` だけの 1 回は 483 / 467 / 384 ms）。マスクの直しだけでは JS が律速になる（68〜87 ms）。

⚠️ 帯の上限の作り置き（`task-group-band-ceiling-cache.ts` の 82 行）の解き直しは、ズームでだけ 1 フレーム 1.0〜1.3 ms —— 他の 3 つでは 0。順位は低い。
⚠️ SVG の文字列づくりそのもの（帯を除く）は 1 フレーム 1〜2 ms、`innerHTML` の差し替えは 7〜8 ms（`showSvg` の自己時間＋構文解析）。重ねの層（`DFC-2302` の案）が効くのは、上の 2 つを直した後の残り（範囲選択で約 18 ms のうち約 12 ms）である。

## 1. 測り方

### 1.1 何を測ったか

| 行 | 場面 | 操作（CDP の `Input.dispatchMouseEvent` を 24 個ずつ束ねて送る。`tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts` と同じ送り方） |
|---|---|---|
| S1 | 基準日の線の引き（`UC-006` の手順 1、`GR-16`） | `data-figure="status-line"` の中ほどを押し、線の右 40 px を中心に横 ±192 px・縦 ±216 px の正弦の道で動かし続ける |
| S2 | 範囲選択（`MK-6`、`PTD-5`） | nfr の試験の `bareCanvasPoint` と同じ探し方で何にも当たらない地を押し、nfr の `sweepPath` の道で動かし続ける |
| S3 | パン（`MK-7`、`PTD-1`、対照） | 描画の中央で `Ctrl` を伴って押し、同じ道で動かし続ける |
| S4 | ズーム（`MK-2`、広い期間） | 描画の中央で `Ctrl` ＋ホイール ±80 を 4 刻みずつ行き来させる。開いた直後の全体表示は 2025-09〜2028-05 の約 1,250 日で、非稼働日の帯（例外 110 件）を描いている |

- 見本: `sample-schedule/sample-large-erp-program.ja.xml`（`Task` 257、依存線の図形 586、うちハロー 161 本）。開き方は `tests/usecase/uc-harness.ts` の `HOST_STUB` と `openByDrop`（`IC-71`）と同じ。窓は 1920×1080、画素比 1、`locale` は `en-US`。
- フレーム時間: nfr の試験の `FRAME_PROBE` と同じく `requestAnimationFrame` を包み、**続けて動かしているあいだのフレームの始まりの間隔**を測る（`NFR-002`／`NFR-003` の「間隔」）。素の窓 8 s の間隔を 3 回分まとめて中央値と p90 を取った。各回の前に 1.5 s の慣らし（捨てる）。
- 内訳: 同じ頁で続けて 8 s の計装した窓を取る —— CDP の Profiler（標本の間隔 200 µs）と Chrome の trace（`devtools.timeline`・`disabled-by-default-devtools.timeline`・`v8`）を同時に。ms/フレームは、その窓の合計をその窓のフレーム数で割った値。計装の重さで間隔は数 % 延びる（各表の「回ごとの中央値」は素の窓）。
- 関数の名を残すため、`dist/` ではなく `vite build --minify false` の写しを測った（出荷の `dist/index.html` と同じ源、圧縮だけが違う）。置き場（file:line）は、写しの関数名から `src/` の定義の行を引いた（`src/` からの相対）。
- ブラウザ 2 つ: ① Playwright 1.62.1 の Chromium 151.0.7922.34（headless shell。**raster は renderer のスレッドプールのソフトウェア**。GT-2 と `DFC-2313` の 0.38 s はこちら）② Edge 155.0.4283.45（`channel: 'msedge'`。**raster は GPU プロセス**。利用者の実物に近い）。
- 繰り返し: 4 場面を交互に 3 周（場面ごとに頁を開き直す）。直しの写しも同じ（`(a)` だけは 1 周）。

### 1.2 反実仮想（直しの見込み）

| 記号 | 写し | 作り方 | 絵 |
|---|---|---|---|
| (M) | ハローごとに小さなマスク | 描いた絵が載るたび（`MutationObserver`、同じフレームの中）に、ハロー 1 本ごとに、そのハローの箱（線の太さの半分＋2 px を含む）を領域とし、その箱にかかる黒い矩形だけを持つマスクを作って付け替える | Chromium の撮影で 2,073,600 画素中 0 画素の違い（バイト列まで一致）。Edge では 2 画素が 1 段だけ違う（GPU の縁の丸め） |
| (a) | 暦の索引を 1 フレーム 1 回 | 写しの `indexOfCalendar` を、暦の物ごとに答えを覚える `WeakMap` で包む（`nonWorkingDaysSvg` の 1 回の呼び出しの中では同じ物が渡るので、日ごとの作り直しが消える）。CSP の meta は外す（台本の hash が変わるため） | 同じ（純粋な関数の答えを覚えるだけ） |

⚠️ (M) の写しは書き換えに 1 フレーム約 2〜3 ms の JS を足している（本物の直しなら文字列を作るときに済む）。(M) の行の数はその分だけ悲観的である。

### 1.3 機械と混み

- i7-12650H（16 論理コア）・64 GB・NVIDIA GeForce RTX 4050 Laptop／Intel UHD・Windows 11（10.0.26200）・node v24.12.0。
- 各場面の前に 10 s の負荷を取った（`measurements/perf-2026-10-04/load.sh` と同じ取り方）: **全体の CPU は 5 標本の平均で 17〜48 %（多くは 20 % 前後）、OneDrive と同期サービスが 10 s に 17.6〜20.0 CPU 秒（約 2 コア）を常に使った**。もう 1 つの体が `CR-721` を当てていた（その間の上位 6 のプロセスに入ったのは 0.1〜3 CPU 秒）。
- 8 つの組はどれも `tools/gate/gate-queue.mjs run` の錠の下で走らせた。錠は 2 度、他のセッションの system の Playwright と `check.sh` が持っていて待った。
- 揺れ: 3 周の中央値どうしの開きは現状で ±4 %。(M) の Chromium の S1 の 1・2 周目（133 / 127 ms）と S2 の 1 周目（116 ms）は、残りの周（77 / 67 / 68 ms）より遅い —— 他のセッションの錠が外れた直後の周である。

## 2. 場面ごとの結果

表の見方: 「描画（raster）の CPU」は全スレッドの `RasterTask` の合計（CPU 時間なので、4 本で並ぶと 1 フレームの壁時計より大きい）。「GPU 主スレッド」は GPU プロセスの `CrGpuMain` が塞がっていた時間。内訳と上位 10 は**現状**（直す前）の計装した窓。内訳の「フレームの外の JS」は 2 つの計器の差なので ±3 ms の誤差を持ち、負にもなる。

### 2.1 S1 基準日の線の引き

| 条件 | 間隔の中央値 ms | p90 ms | 回ごとの中央値 ms | フレーム数（素の窓） | 描画（raster）の CPU ms/フレーム | GPU 主スレッド ms/フレーム |
|---|---|---|---|---|---|---|
| Chromium 現状 | 386 | 435 | 384 / 400 / 385 | 65 | 1583 | 0 |
| Edge 現状 | 144 | 148 | 144 / 144 / 144 | 175 | 13 | 120 |
| Chromium 直し (a) だけ（1 回） | 483 | 501 | 483 | 18 | 1776 | 0 |
| Edge 直し (a) だけ（1 回） | 145 | 147 | 145 | 58 | 26 | 140 |
| Chromium 直し (M) だけ | 87 | 137 | 133 / 127 / 77 | 239 | 34 | 0 |
| Edge 直し (M) だけ | 76 | 85 | 74 / 78 / 75 | 316 | 2 | 15 |
| Chromium (M)+(a) | 25 | 43 | 23 / 24 / 37 | 848 | 19 | 0 |
| Edge (M)+(a) | 24 | 32 | 23 / 23 / 28 | 930 | 2 | 14 |

| 内訳（計装した窓、ms/フレーム） | Chromium | Edge |
|---|---|---|
| 主スレッドの JS（trace の FunctionCall） | 82.0 | 95.0 |
| ├ 非稼働日の帯 `nonWorkingDaysSvg`（暦の索引を日ごとに作る） | 65.0 | 73.6 |
| ├ SVG 文字列づくり（`svgFromSchedule` から帯を除いた分） | 1.7 | 1.8 |
| ├ DOM の差し替え（`showSvg` の自己時間 = `innerHTML`） | 4.5 | 4.4 |
| ├ モデル（`drawnPictureOf` = 配置と幾何） | 4.0 | 6.1 |
| ├ 画面の面（`showScreenView`） | 0.3 | 0.2 |
| └ フレームの外の JS（入力の訳など = FunctionCall − `runAskedFrame`） | -0.6 | 2.7 |
| `innerHTML` の構文解析（trace の ParseHTML） | 3.5 | 3.3 |
| スタイル（UpdateLayoutTree） | 3.2 | 3.7 |
| レイアウト（Layout） | 1.6 | 1.7 |
| ペイント（PrePaint + Paint + Layerize） | 3.4 | 3.7 |
| Commit（主スレッドが前のフレームの描画を待つ） | 315.1 | 0.2 |

| 自己時間の上位 10 | 置き場 | Chromium ms/フレーム | Edge ms/フレーム |
|---|---|---|---|
| `indexOfCalendar` | `entity/document-model/schedule/working-calendar.ts:61` | 36.0 | 42.2 |
| `dayOf` | `entity/document-model/schedule/calendar-day.ts:17` | 30.5 | 34.7 |
| `showSvg` | `framework/dom-svg-surface/dom-svg-surface.ts:13` | 4.5 | 4.4 |
| `workingDaysBetween` | `entity/document-model/schedule/working-calendar.ts:174` | 1.0 | 1.1 |
| `layoutFromSchedule` | `entity/layout-engine/schedule-layout/schedule-layout.ts:438` | 1.0 | 1.2 |
| `elementFromPoint` | `-` | 0.8 | 2.2 |
| `actualSpanOf` | `entity/layout-engine/schedule-layout/schedule-layout.ts:299` | 0.4 | 0.1 |
| `assigneeLabelsOf` | `entity/layout-engine/schedule-layout/assignee-label.ts:49` | 0.3 | 0.4 |
| `drawnSettingsOf` | `entity/layout-engine/screen-regions/screen-regions.ts:130` | 0.3 | 0.5 |
| `spanWidthOf` | `entity/layout-engine/schedule-layout/schedule-layout.ts:271` | 0.3 | 0.4 |
| （参考）`(program)` —— 主スレッドの JS の外（Commit の待ちなど） | — | 326.5 | 16.8 |

| 合計時間の上位 10（フレームの入口 2 つを除く） | 置き場 | Chromium ms/フレーム | Edge ms/フレーム |
|---|---|---|---|
| `svgFromSchedule` | `adapter/svg-renderer/svg-renderer.ts:663` | 66.7 | 75.4 |
| `indexOfCalendar` | `entity/document-model/schedule/working-calendar.ts:61` | 65.7 | 75.8 |
| `gridParts` | `adapter/svg-renderer/schedule-grid.ts:353` | 65.0 | 73.6 |
| `nonWorkingDaysSvg` | `adapter/svg-renderer/schedule-grid.ts:286` | 65.0 | 73.6 |
| `workingDaysBetween` | `entity/document-model/schedule/working-calendar.ts:174` | 64.5 | 73.3 |
| `dayOf` | `entity/document-model/schedule/calendar-day.ts:17` | 30.5 | 34.7 |
| `layoutFromSchedule` | `entity/layout-engine/schedule-layout/schedule-layout.ts:438` | 7.3 | 6.8 |
| `zoomEntranceEndsOf` | `adapter/input-command-translator/zoom-and-fit.ts:223` | 6.9 | 6.0 |
| `fitZoom` | `entity/layout-engine/schedule-layout/fit-zoom.ts:165` | 5.1 | 4.4 |
| `fitOf` | `adapter/input-command-translator/zoom-and-fit.ts:598` | 5.1 | 4.4 |

⭐ 読み: Chromium では `Commit`（主スレッドが前のフレームの raster の終わりを待つ）が 315 ms、JS が 82 ms。Edge では JS が 95 ms・GPU が約 120 ms。JS の約 8 割が `nonWorkingDaysSvg`。
⚠️ 次に重いのは入力の訳での全体表示の解き直し（`zoomEntranceEndsOf` 6.9 ms → `fitZoom` 5.1 ms）—— 線を引くたびに文書（`statusDate`）が変わり、`frame-loop.ts` の 588 行の `zoomEntranceEndsHoldOf` の作り置きが外れる。2 つを直した後の残り約 24 ms のうち約 5 ms がこれである（残りは差し替え 4 ms・構文解析 4 ms・スタイル 4 ms・ペイント 3 ms・配置 2 ms）。

### 2.2 S2 範囲選択（`MK-6`）

| 条件 | 間隔の中央値 ms | p90 ms | 回ごとの中央値 ms | フレーム数（素の窓） | 描画（raster）の CPU ms/フレーム | GPU 主スレッド ms/フレーム |
|---|---|---|---|---|---|---|
| Chromium 現状 | 400 | 433 | 398 / 400 / 417 | 64 | 1508 | 0 |
| Edge 現状 | 144 | 147 | 144 / 145 / 145 | 172 | 8 | 137 |
| Chromium 直し (a) だけ（1 回） | 467 | 489 | 467 | 19 | 1707 | 0 |
| Edge 直し (a) だけ（1 回） | 146 | 192 | 146 | 59 | 134 | 135 |
| Chromium 直し (M) だけ | 69 | 118 | 116 / 67 / 68 | 295 | 34 | 0 |
| Edge 直し (M) だけ | 68 | 85 | 68 / 77 / 66 | 330 | 2 | 14 |
| Chromium (M)+(a) | 18 | 23 | 18 / 17 / 18 | 1275 | 19 | 0 |
| Edge (M)+(a) | 19 | 26 | 18 / 18 / 23 | 1184 | 2 | 15 |

| 内訳（計装した窓、ms/フレーム） | Chromium | Edge |
|---|---|---|
| 主スレッドの JS（trace の FunctionCall） | 68.7 | 70.6 |
| ├ 非稼働日の帯 `nonWorkingDaysSvg`（暦の索引を日ごとに作る） | 63.5 | 61.0 |
| ├ SVG 文字列づくり（`svgFromSchedule` から帯を除いた分） | 1.5 | 1.5 |
| ├ DOM の差し替え（`showSvg` の自己時間 = `innerHTML`） | 4.3 | 3.6 |
| ├ モデル（`drawnPictureOf` = 配置と幾何） | 0.0 | 0.0 |
| ├ 画面の面（`showScreenView`） | 0.3 | 0.3 |
| └ フレームの外の JS（入力の訳など = FunctionCall − `runAskedFrame`） | -1.3 | 3.9 |
| `innerHTML` の構文解析（trace の ParseHTML） | 3.3 | 2.8 |
| スタイル（UpdateLayoutTree） | 3.0 | 2.8 |
| レイアウト（Layout） | 1.5 | 1.4 |
| ペイント（PrePaint + Paint + Layerize） | 3.2 | 3.0 |
| Commit（主スレッドが前のフレームの描画を待つ） | 309.3 | 0.2 |

| 自己時間の上位 10 | 置き場 | Chromium ms/フレーム | Edge ms/フレーム |
|---|---|---|---|
| `indexOfCalendar` | `entity/document-model/schedule/working-calendar.ts:61` | 33.9 | 32.7 |
| `dayOf` | `entity/document-model/schedule/calendar-day.ts:17` | 28.2 | 26.9 |
| `showSvg` | `framework/dom-svg-surface/dom-svg-surface.ts:13` | 4.3 | 3.6 |
| `workingDaysBetween` | `entity/document-model/schedule/working-calendar.ts:174` | 1.1 | 1.1 |
| `elementFromPoint` | `-` | 0.8 | 3.7 |
| `svgFromSchedule` | `adapter/svg-renderer/svg-renderer.ts:663` | 0.2 | 0.2 |
| `rounded$1` | `adapter/image-exporter/image-exporter.ts:82 (+1)` | 0.2 | 0.2 |
| `nonWorkingDaysSvg` | `adapter/svg-renderer/schedule-grid.ts:286` | 0.2 | 0.1 |
| `barMaskRectSvg` | `adapter/svg-renderer/schedule-task-figures.ts:146` | 0.1 | 0.0 |
| `barSvg` | `adapter/svg-renderer/schedule-task-figures.ts:471` | 0.1 | 0.1 |
| （参考）`(program)` —— 主スレッドの JS の外（Commit の待ちなど） | — | 320.0 | 17.1 |

| 合計時間の上位 10（フレームの入口 2 つを除く） | 置き場 | Chromium ms/フレーム | Edge ms/フレーム |
|---|---|---|---|
| `svgFromSchedule` | `adapter/svg-renderer/svg-renderer.ts:663` | 65.1 | 62.5 |
| `gridParts` | `adapter/svg-renderer/schedule-grid.ts:353` | 63.5 | 61.1 |
| `nonWorkingDaysSvg` | `adapter/svg-renderer/schedule-grid.ts:286` | 63.5 | 61.0 |
| `workingDaysBetween` | `entity/document-model/schedule/working-calendar.ts:174` | 63.2 | 60.6 |
| `indexOfCalendar` | `entity/document-model/schedule/working-calendar.ts:61` | 62.1 | 59.5 |
| `dayOf` | `entity/document-model/schedule/calendar-day.ts:17` | 28.2 | 26.9 |
| `showSvg` | `framework/dom-svg-surface/dom-svg-surface.ts:13` | 4.3 | 3.6 |
| `onPointerMove` | `framework/dom-input-source/dom-input-source.ts:269` | 1.6 | 7.0 |
| `deliver` | `framework/dom-input-source/dom-input-source.ts:207 (+2)` | 1.6 | 6.9 |
| `isBrowserDefaultStopped` | `framework/dom-input-source/dom-input-source.ts:193 (+1)` | 1.0 | 4.3 |

⭐ 読み: 枠 1 つが動くだけで、SVG の全体（約 25 万字）を組み直して `innerHTML` で差し替え（`DFC-2302`）、さらに画面全体のマスクを 161 回描き直す。モデル（配置・幾何）は 0 ms —— 範囲選択では配置は作り置きが当たっている。

### 2.3 S3 パン（`MK-7`、対照）

| 条件 | 間隔の中央値 ms | p90 ms | 回ごとの中央値 ms | フレーム数（素の窓） | 描画（raster）の CPU ms/フレーム | GPU 主スレッド ms/フレーム |
|---|---|---|---|---|---|---|
| Chromium 現状 | 40 | 49 | 39 / 37 / 41 | 490 | 127 | 0 |
| Edge 現状 | 39 | 102 | 38 / 39 / 41 | 463 | 3 | 11 |
| Chromium 直し (a) だけ（1 回） | 367 | 432 | 367 | 24 | 117 | 0 |
| Edge 直し (a) だけ（1 回） | 11 | 17 | 11 | 581 | 0 | 1 |
| Chromium 直し (M) だけ | 44 | 59 | 50 / 44 / 40 | 508 | 8 | 0 |
| Edge 直し (M) だけ | 51 | 63 | 58 / 49 / 45 | 470 | 1 | 4 |
| Chromium (M)+(a) | 17 | 30 | 17 / 18 / 17 | 1201 | 7 | 0 |
| Edge (M)+(a) | 14 | 30 | 12 / 13 / 28 | 1410 | 0 | 3 |

| 内訳（計装した窓、ms/フレーム） | Chromium | Edge |
|---|---|---|
| 主スレッドの JS（trace の FunctionCall） | 36.5 | 38.7 |
| ├ 非稼働日の帯 `nonWorkingDaysSvg`（暦の索引を日ごとに作る） | 25.6 | 27.1 |
| ├ SVG 文字列づくり（`svgFromSchedule` から帯を除いた分） | 0.9 | 0.8 |
| ├ DOM の差し替え（`showSvg` の自己時間 = `innerHTML`） | 1.8 | 1.7 |
| ├ モデル（`drawnPictureOf` = 配置と幾何） | 5.2 | 5.3 |
| ├ 画面の面（`showScreenView`） | 11.8 | 13.2 |
| └ フレームの外の JS（入力の訳など = FunctionCall − `runAskedFrame`） | -3.2 | -3.2 |
| `innerHTML` の構文解析（trace の ParseHTML） | 1.4 | 1.4 |
| スタイル（UpdateLayoutTree） | 1.7 | 1.9 |
| レイアウト（Layout） | 1.5 | 1.6 |
| ペイント（PrePaint + Paint + Layerize） | 1.7 | 1.8 |
| Commit（主スレッドが前のフレームの描画を待つ） | 16.0 | 0.3 |

| 自己時間の上位 10 | 置き場 | Chromium ms/フレーム | Edge ms/フレーム |
|---|---|---|---|
| `indexOfCalendar` | `entity/document-model/schedule/working-calendar.ts:61` | 15.4 | 16.3 |
| `dayOf` | `entity/document-model/schedule/calendar-day.ts:17` | 12.5 | 13.2 |
| `getBoundingClientRect` | `-` | 3.3 | 3.5 |
| `showSvg` | `framework/dom-svg-surface/dom-svg-surface.ts:13` | 1.8 | 1.7 |
| `setAttribute` | `-` | 1.7 | 2.1 |
| `workingDaysBetween` | `entity/document-model/schedule/working-calendar.ts:174` | 0.4 | 0.5 |
| `elementFromPoint` | `-` | 0.2 | 0.3 |
| `replaceChildren` | `-` | 0.2 | 0.3 |
| `layoutFromSchedule` | `entity/layout-engine/schedule-layout/schedule-layout.ts:438` | 0.2 | 0.3 |
| `boxOfPath` | `entity/layout-engine/item-hit-area/item-hit-area.ts:132` | 0.2 | 0.2 |
| （参考）`(program)` —— 主スレッドの JS の外（Commit の待ちなど） | — | 19.3 | 4.1 |

| 合計時間の上位 10（フレームの入口 2 つを除く） | 置き場 | Chromium ms/フレーム | Edge ms/フレーム |
|---|---|---|---|
| `indexOfCalendar` | `entity/document-model/schedule/working-calendar.ts:61` | 27.7 | 29.3 |
| `svgFromSchedule` | `adapter/svg-renderer/svg-renderer.ts:663` | 26.5 | 27.9 |
| `gridParts` | `adapter/svg-renderer/schedule-grid.ts:353` | 25.6 | 27.1 |
| `nonWorkingDaysSvg` | `adapter/svg-renderer/schedule-grid.ts:286` | 25.6 | 27.1 |
| `workingDaysBetween` | `entity/document-model/schedule/working-calendar.ts:174` | 25.4 | 26.9 |
| `dayOf` | `entity/document-model/schedule/calendar-day.ts:17` | 12.5 | 13.2 |
| `showScreenView` | `framework/dom-screen-surface/dom-screen-surface.ts:1050 (+1)` | 5.9 | 13.2 |
| `showScreenView` | `framework/dom-screen-surface/dom-screen-surface.ts:1050 (+1)` | 5.9 | 13.2 |
| `drawnPictureOf` | `framework/single-html-shell/frame-loop.ts:539` | 5.2 | 5.3 |
| `geometryFromLayout` | `entity/layout-engine/schedule-geometry/schedule-geometry.ts:550` | 3.4 | 3.7 |

⚠️ **今の作りでは、`Ctrl` のドラッグのあいだ絵は動かない** —— `src/framework/single-html-shell/held-press-preview.ts` の 89 行の WHY のとおり `PTD-1` は先取りして描かず、離したときに動く（`panOnRelease`）。握ったまま動かして撮った SVG は、押す前と長さもマスクの数も同じだった。
⇒ この対照は「絵が変わらないフレームの重さ」を測っている: `showSvg` は同じ文字列を差し替えない（`dom-svg-surface.ts` の 14 行）ので raster はほぼ無いが、`svgFromSchedule` は毎フレーム走り、そのうち `nonWorkingDaysSvg` が 26 ms。残りは画面の面（`showScreenView` 12 ms。うち `reportPaletteBand` の `getBoundingClientRect` が 3.3 ms）。
⚠️ `(a)` だけの Chromium の 1 回（367 ms）は、素の窓だけが外れた（同じ回の計装した窓は 17 ms）—— 指の下の印が変わるときだけ差し替えが起き、その回の道がそこを通ったと読む。1 回だけなので数に使わない。

### 2.4 S4 ズーム（`MK-2`、広い期間）

| 条件 | 間隔の中央値 ms | p90 ms | 回ごとの中央値 ms | フレーム数（素の窓） | 描画（raster）の CPU ms/フレーム | GPU 主スレッド ms/フレーム |
|---|---|---|---|---|---|---|
| Chromium 現状 | 386 | 424 | 382 / 387 / 388 | 83 | 1438 | 0 |
| Edge 現状 | 79 | 150 | 79 / 77 / 81 | 259 | 6 | 80 |
| Chromium 直し (a) だけ（1 回） | 384 | 466 | 384 | 32 | 1522 | 0 |
| Edge 直し (a) だけ（1 回） | 139 | 167 | 139 | 77 | 13 | 106 |
| Chromium 直し (M) だけ | 76 | 88 | 76 / 75 / 76 | 331 | 13 | 0 |
| Edge 直し (M) だけ | 79 | 99 | 90 / 76 / 77 | 315 | 1 | 11 |
| Chromium (M)+(a) | 23 | 32 | 21 / 28 / 19 | 1086 | 10 | 0 |
| Edge (M)+(a) | 26 | 36 | 25 / 29 / 26 | 992 | 1 | 10 |

| 内訳（計装した窓、ms/フレーム） | Chromium | Edge |
|---|---|---|
| 主スレッドの JS（trace の FunctionCall） | 88.4 | 76.1 |
| ├ 非稼働日の帯 `nonWorkingDaysSvg`（暦の索引を日ごとに作る） | 71.3 | 61.3 |
| ├ SVG 文字列づくり（`svgFromSchedule` から帯を除いた分） | 2.0 | 1.4 |
| ├ DOM の差し替え（`showSvg` の自己時間 = `innerHTML`） | 3.8 | 2.7 |
| ├ モデル（`drawnPictureOf` = 配置と幾何） | 4.0 | 4.4 |
| ├ 画面の面（`showScreenView`） | 7.2 | 8.7 |
| └ フレームの外の JS（入力の訳など = FunctionCall − `runAskedFrame`） | 0.3 | -0.8 |
| `innerHTML` の構文解析（trace の ParseHTML） | 3.1 | 2.1 |
| スタイル（UpdateLayoutTree） | 3.2 | 2.8 |
| レイアウト（Layout） | 1.7 | 1.2 |
| ペイント（PrePaint + Paint + Layerize） | 3.2 | 2.4 |
| Commit（主スレッドが前のフレームの描画を待つ） | 267.3 | 0.1 |

| 自己時間の上位 10 | 置き場 | Chromium ms/フレーム | Edge ms/フレーム |
|---|---|---|---|
| `indexOfCalendar` | `entity/document-model/schedule/working-calendar.ts:61` | 39.6 | 34.7 |
| `dayOf` | `entity/document-model/schedule/calendar-day.ts:17` | 32.9 | 28.3 |
| `showSvg` | `framework/dom-svg-surface/dom-svg-surface.ts:13` | 3.8 | 2.7 |
| `getBoundingClientRect` | `-` | 2.4 | 3.2 |
| `workingDaysBetween` | `entity/document-model/schedule/working-calendar.ts:174` | 1.2 | 1.1 |
| `drawnSettingsOf` | `entity/layout-engine/screen-regions/screen-regions.ts:130` | 0.7 | 0.6 |
| `setAttribute` | `-` | 0.7 | 0.6 |
| `layoutFromSchedule` | `entity/layout-engine/schedule-layout/schedule-layout.ts:438` | 0.6 | 0.6 |
| `actualSpanOf` | `entity/layout-engine/schedule-layout/schedule-layout.ts:299` | 0.3 | 0.1 |
| `boxOfPoints` | `adapter/svg-renderer/svg-renderer.ts:93` | 0.3 | 0.0 |
| （参考）`(program)` —— 主スレッドの JS の外（Commit の待ちなど） | — | 267.5 | 5.3 |

| 合計時間の上位 10（フレームの入口 2 つを除く） | 置き場 | Chromium ms/フレーム | Edge ms/フレーム |
|---|---|---|---|
| `svgFromSchedule` | `adapter/svg-renderer/svg-renderer.ts:663` | 73.3 | 62.8 |
| `indexOfCalendar` | `entity/document-model/schedule/working-calendar.ts:61` | 71.9 | 62.3 |
| `gridParts` | `adapter/svg-renderer/schedule-grid.ts:353` | 71.3 | 61.4 |
| `nonWorkingDaysSvg` | `adapter/svg-renderer/schedule-grid.ts:286` | 71.3 | 61.3 |
| `workingDaysBetween` | `entity/document-model/schedule/working-calendar.ts:174` | 71.0 | 61.0 |
| `dayOf` | `entity/document-model/schedule/calendar-day.ts:17` | 32.9 | 28.3 |
| `layoutFromSchedule` | `entity/layout-engine/schedule-layout/schedule-layout.ts:438` | 4.6 | 4.4 |
| `drawnPictureOf` | `framework/single-html-shell/frame-loop.ts:539` | 4.0 | 4.4 |
| `taskGroupPlacesAtZoomY` | `entity/layout-engine/schedule-layout/schedule-layout.ts:711` | 3.9 | 3.6 |
| `showSvg` | `framework/dom-svg-surface/dom-svg-surface.ts:13` | 3.8 | 2.7 |

⭐ 読み: 帯の上限（`bandCeilingFor` → `taskGroupBandCeilingOf` → `bandCeilingUpTo`）の合計は Chromium 1.3 ms・Edge 1.0 ms/フレーム（非 idle の標本の 0.4 % と 1.2 %）。依頼の (b) の見立て（作り置きが毎回解き直す）は、この測りでは小さい。
⭐ Edge の現状が 79 ms と他の場面より速いのは、ズームのフレームの GPU の重さ（80 ms）と JS（76 ms）が釣り合っているため。`(a)` だけにすると GPU が律速になり、1 回の測りでは 139 ms に延びた —— 直す順は (M) が先か同時である。

## 3. 直しの順位

見込みは 2.1〜2.4 の表の「(M)+(a)」と「(M) だけ」の行から。CR の要否は、仕様（`docs/spec`）の行・表・継ぎ目（表 T-065 の `IF-1` など）を変えるかで判じた。

| 順 | 直し | 置き場 | 見込み（間隔の中央値、Chromium／Edge） | 危うさ | CR |
|---|---|---|---|---|---|
| 1 | **(M) 依存線のハローのマスクを、ハローごとの小さな領域にする**（領域＝そのハローの箱、中身＝その箱にかかるバーの切り抜きだけ）。画面全体のマスク 1 枚を 161 本が参照する今の形をやめる | `src/adapter/svg-renderer/schedule-task-figures.ts` の 800 行 `dependencyLinkParts`（808 行の `haloMask`）・137 行 `haloCutOf`／`svg-renderer.ts` の 761 行 `dependencyHaloMaskId` | 単独で S1 386→87／144→76、S2 400→69／144→68、S4 386→76／79→79。(a) と併せて 2 の行 | 中: 絵の一致は Chromium で 0 画素・Edge で 2 画素 1 段を確かめた（開いた直後の 1 つの状態だけ）。`DFC-1132` の恒等の撮り方（窓 2 つ×画素比 2 つ×状態 24）で確かめ直すこと。SVG は 239k → 320k 字に増え、構文解析が約 1 ms 増える。⚠️ `DFC-1132` の TRAP（切り抜きの群とマスクの重なり、`svg-renderer.ts` の 644 行）の形は変えないこと | 不要（`docs/spec` にマスクの記述は無い。`FR-009` の見え方・表 T-020 の順は変わらない）。毎フレームの経路なので `perf-pending.md` に行を足す |
| 2 | **(a) 非稼働日の帯で、暦の索引を 1 フレーム 1 回にする**（`nonWorkingDaysSvg` が索引を 1 度作り、日ごとには `isWorkingDayAt` だけを引く。または `indexOfCalendar` を暦の物ごとに覚える） | `src/adapter/svg-renderer/schedule-grid.ts` の 286〜316 行（309 行の日ごとの `workingDaysBetween`）／`src/entity/document-model/schedule/working-calendar.ts` の 61・86・174 行 | 1 フレームの JS を 61〜74 ms 減らす（パンでも 26 ms）。(M) と併せて S1 25／24、S2 18／19、S3 17／14、S4 23／26 ms | 低: 純粋な関数の呼び方を変えるだけ。⚠️ 単独では描画が律速のまま見えない（`(a)` だけの行）—— (M) と同じ波で当てる | 不要（`working-calendar.ts` の 59 行の TRAP と `NFR-013` が既に求めていること） |
| 3 | (d) 全体表示の端（`zoomEntranceEndsOf`）の作り置きを、文書の全体ではなく端が読むものだけで見分ける —— 基準日（`statusDate`）の書き込みで外れないようにする | `src/framework/single-html-shell/frame-loop.ts` の 588 行 `zoomEntranceEndsHoldOf`（`isSameZoomEndsInputs`） | S1 で 1 フレーム 5〜7 ms（2 つを直した後の残り約 24 ms の約 2 割） | 低〜中: 端が何を読むかを数え漏らすと古い端が残る（`DFC-567`・`DFC-2301` の経緯） | 不要 |
| 4 | (c) 動く重ね（範囲選択の枠 `ZO-6`）を別の小さな `<svg>` に描き、下の絵は入力が同じなら組み直さない（`DFC-2302` の ①＋②） | `frame-loop.ts` の 2471 行の `svgFromSchedule` の呼び出し・`src/framework/dom-svg-surface/dom-svg-surface.ts`・`svg-renderer.ts` の 855 行 | S2 で (M)+(a) の後の 18 ms → 数 ms（差し替え 4 ms・構文解析 4 ms・スタイル 3 ms・ペイント 2 ms・文字列 2 ms が消える）。(M) より前に当てても S2 の raster は消える（下の絵が変わらないため）が、S1・S4 には効かない | 中: `ZO-6` は表 T-020 の最前面なので、同じ切り抜きの重ねにすれば絵は同じ。⚠️ 基準日の線は `ZO-8`（層の途中、`schedule-overlays.ts` の 359 行）にあり、引くあいだイナズマ線（`ZO-16`）と進捗マーカー（`ZO-3`）も基準日で変わる —— 線だけを重ねに出すと絵が変わる | **要**: 継ぎ目 `IF-1`（`SvgSurface`、`docs/spec/05-07-design.md` の表 T-065）に重ねの口を足し、`svgFromSchedule` の引数（`marquee`）を分ける。基準日の線まで重ねに出すなら表 T-020 も |
| 5 | (b) 帯の上限の作り置きで、二分の答えを使い回す | `src/framework/single-html-shell/task-group-band-ceiling-cache.ts` の 82 行 | S4 で 1.0〜1.3 ms/フレーム。他の場面は 0 | 低 | 不要 |
| 6 | (e) 画面の面の `reportPaletteBand` が、パンとズームで毎フレーム `getBoundingClientRect` を引く（1165 行の `changed('frame')` が真になっている） | `src/framework/dom-screen-surface/dom-screen-surface.ts` の 984・1165 行 | S3・S4 で 2〜3 ms/フレーム | 低 | 不要。⚠️ `perf-pending.md` の一覧の 14 番（`CR-575`）は「パレットの帯の実測はパレットか枠が変わったときだけ」—— 枠が毎フレーム変わったと見なされる理由は調べていない |

⭐ 当てる順: (M) と (a) を 1 つの波で（片方では見えない）→ (d) → (c)（CR）→ (b)・(e)。
⭐ GT-2 への効き目: `DFC-2313` の「動き 1 回が約 0.38 s」はこの描画の詰まりそのもの（`uc-006` の手順 1 は S1 と同じ操作）。(M)+(a) なら動き 1 回は約 25 ms になる見込み。

## 4. 調整役への覚え（本書の外のこと、1 行ずつ）

- `MK-7`（パン）は握っているあいだ絵が動かないので、`performance-runs.md` の `MK-7` の数は、パンで絵を動かす重さを表していない（2.3）。
- headless の Chromium と Edge では律速が違う（ソフトウェアの raster と GPU）。GT-2 の時間は前者で決まる。
- `(a)` だけ・`(M)` だけの行が示すとおり、片方だけを当てて測ると「効かない」と読み違える。

## 付録 A. 再現の手順

作業木の根から打つ。測りの出力（profile・trace・写しのビルド）は**作業木の外**の一時フォルダ（以下 `$OUT`）に置く —— OneDrive が作業木を同期して時間を歪めるため（`DFC-2312`）。台本は付録 B の 7 つを一時フォルダ `$P` に置いたものとする。`open.mjs` は Playwright を作業木の根の `package.json` から引くので、打つ場所は作業木の根である。

```sh
# 1. names kept: an unminified copy of the shipped build, outside the worktree
node ../../../node_modules/vite/bin/vite.js build --minify false --outDir "$OUT/build" --emptyOutDir
# 2. counterfactual copy for fix (a)
node "$P/patch-calendar.mjs" "$OUT/build/index.html" "$OUT/build-a/index.html"
# 3. blocks under the gate lock: rounds x 4 scenarios each (CHANNEL "" = Playwright Chromium)
node ../../../tools/gate/gate-queue.mjs run -- pwsh -NoProfile -File "$P/run-block.ps1" "$OUT/build/index.html"   "$OUT/base-chromium"  ""       ""         3
node ../../../tools/gate/gate-queue.mjs run -- pwsh -NoProfile -File "$P/run-block.ps1" "$OUT/build/index.html"   "$OUT/base-edge"      "msedge" ""         3
node ../../../tools/gate/gate-queue.mjs run -- pwsh -NoProfile -File "$P/run-block.ps1" "$OUT/build/index.html"   "$OUT/bbox-chromium"  ""       "bboxmask" 3
node ../../../tools/gate/gate-queue.mjs run -- pwsh -NoProfile -File "$P/run-block.ps1" "$OUT/build/index.html"   "$OUT/bbox-edge"      "msedge" "bboxmask" 3
node ../../../tools/gate/gate-queue.mjs run -- pwsh -NoProfile -File "$P/run-block.ps1" "$OUT/build-a/index.html" "$OUT/amask-chromium" ""       "bboxmask" 3
node ../../../tools/gate/gate-queue.mjs run -- pwsh -NoProfile -File "$P/run-block.ps1" "$OUT/build-a/index.html" "$OUT/amask-edge"     "msedge" "bboxmask" 3
node ../../../tools/gate/gate-queue.mjs run -- pwsh -NoProfile -File "$P/run-block.ps1" "$OUT/build-a/index.html" "$OUT/aonly-chromium" ""       ""         1
node ../../../tools/gate/gate-queue.mjs run -- pwsh -NoProfile -File "$P/run-block.ps1" "$OUT/build-a/index.html" "$OUT/aonly-edge"     "msedge" ""         1
# 4. summaries per block and scenario (JSON_OUT feeds tables.mjs)
JSON_OUT="$OUT/base-chromium/status.json" node "$P/analyze.mjs" "$OUT/base-chromium" status
node "$P/tables.mjs" "$OUT" status
# 5. pixel identity of the (M) rewrite
node "$P/identity.mjs" "$OUT/build/index.html"
node "$P/identity.mjs" "$OUT/build/index.html" msedge
```

## 付録 B. 台本

<details><summary><code>open.mjs</code></summary>

````js
// Shared opener: launch Chromium on a built index.html (file://) with the uc-harness HOST_STUB and
// open a sample by drop (IC-71), the same steps as tests/usecase/uc-harness.ts openByDrop.
// Usage (from the checkout root): node <this dir>/open.mjs is not run directly; import it.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(resolve('package.json'))
export const { chromium } = require('playwright')

const harness = readFileSync(resolve('tests/usecase/uc-harness.ts'), 'utf8')
const HOST_STUB = harness.split('const HOST_STUB = `')[1].split('`\n')[0]

export const VIEWPORT = { width: 1920, height: 1080 }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function settle(page) {
  const read = () => page.evaluate(() => document.querySelectorAll('[data-figure]').length + ':' + document.body.innerText.length)
  let last = await read()
  for (let i = 0; i < 60; i++) {
    await sleep(150)
    const now = await read()
    if (now === last) return
    last = now
  }
}

export async function openApp(browser, builtHtml, sampleName, extraInit = null) {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'en-US' })
  const page = await context.newPage()
  await page.addInitScript(HOST_STUB)
  if (extraInit) await page.addInitScript(extraInit)
  await page.goto(pathToFileURL(resolve(builtHtml)).href)
  await page.waitForSelector('[data-role="Schedule Canvas"]')
  await settle(page)
  const text = readFileSync(resolve('sample-schedule', sampleName), 'utf8')
  await page.evaluate(({ name, text }) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([text], name))
    const target = document.querySelector('[data-role="Schedule Canvas"]')
    for (const type of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }))
  }, { name: sampleName, text })
  await page.waitForSelector('[data-role="Open Chooser"]')
  await page.click('[data-role="Open Chooser"] [data-icon="IC-71"]')
  await sleep(200)
  const proceed = page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]')
  if (await proceed.count()) { await proceed.click(); await settle(page) }
  await settle(page)
  return { context, page }
}

export const figureBox = (page, figure) =>
  page.evaluate((figure) => {
    const e = document.querySelector('[data-figure="' + figure + '"]')
    if (!e) return null
    const r = e.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  }, figure)
````

</details>

<details><summary><code>profile.mjs</code></summary>

````js
// One run of one scenario on the large sample: a plain timed window (frame intervals), then an
// instrumented window (CDP Profiler + Chrome trace) with the same gesture.
// Usage (from the checkout root): node <dir>/profile.mjs <built index.html> <scenario> <run> <outDir>
//   scenario: status | marquee | pan | zoom
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, openApp, figureBox } from './open.mjs'

const [built, scenario, run, outDir] = process.argv.slice(2)
const SAMPLE = 'sample-large-erp-program.ja.xml'
const PLAIN_MS = Number(process.env.PLAIN_MS ?? 8000)
const PROFILED_MS = Number(process.env.PROFILED_MS ?? 8000)
const PER_BURST = 24
const CTRL = 2

// Same probe as tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts FRAME_PROBE, plus the
// time the task after each frame starts (style/layout/paint of that frame are done by then).
const FRAME_PROBE = `(() => {
  const state = { samples: [], after: [], inputs: [] };
  const raw = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (callback) {
    return raw(function (stamp) {
      const enter = performance.now();
      try { callback(stamp); } finally {
        const leave = performance.now();
        state.samples.push([stamp, enter, leave]);
        setTimeout(() => state.after.push([stamp, performance.now()]), 0);
      }
    });
  };
  const note = function () { state.inputs.push(performance.now()); };
  window.addEventListener('pointermove', note, { capture: true, passive: true });
  window.addEventListener('wheel', note, { capture: true, passive: true });
  Object.defineProperty(window, '__probe', { value: state });
})();`

// CHANNEL=msedge runs the installed Edge (GPU raster) instead of Playwright's headless shell.
// VARIANT=nomask|nohalo injects a counterfactual style (picture changes; a bound, not a fix).
const VARIANTS = {
  nomask: '[data-role="Schedule Canvas"] svg [mask]{mask:none !important}',
  nohalo: '[data-role="Schedule Canvas"] svg [mask]{display:none !important}',
}
// VARIANT=bboxmask rewrites each drawn picture right after it lands: every halo gets its own
// mask whose region is the halo's box (stroke included) and which holds only the bar cuts that
// meet that box -- the same pixels as the shared full-canvas mask (a candidate internal fix).
const BBOX_MASK = `(() => {
  window.__bboxMaskMs = 0;
  const rewrite = (svg) => {
    const t0 = performance.now();
    const shared = svg.querySelector('mask[id^="grs-dependency-halo-mask"]');
    if (!shared) return;
    const cuts = [...shared.querySelectorAll('rect[fill="black"]')].map((r) => [+r.getAttribute('x'), +r.getAttribute('y'), +r.getAttribute('width'), +r.getAttribute('height')]);
    const ref = 'url(#' + shared.id + ')';
    let n = 0; let defs = '';
    const masked = [...svg.querySelectorAll('[mask]')].filter((e) => e.getAttribute('mask') === ref);
    for (const e of masked) {
      const pts = (e.getAttribute('points') || '').trim().split(/\\s+/).map((p) => p.split(',').map(Number));
      const half = (+e.getAttribute('stroke-width') || 0) / 2 + 2;
      const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
      const x0 = Math.min(...xs) - half, x1 = Math.max(...xs) + half, y0 = Math.min(...ys) - half, y1 = Math.max(...ys) + half;
      const id = shared.id + '-' + (n++);
      const inner = cuts.filter(([x, y, w, h]) => x < x1 && x + w > x0 && y < y1 && y + h > y0).map(([x, y, w, h]) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="black"/>').join('');
      defs += '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '"><rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="white"/>' + inner + '</mask>';
      e.setAttribute('mask', 'url(#' + id + ')');
    }
    const holder = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    holder.innerHTML = defs;
    svg.insertBefore(holder, svg.firstChild);
    window.__bboxMaskMs += performance.now() - t0;
  };
  window.__bboxRewrite = rewrite;
  new MutationObserver((records) => {
    for (const r of records) for (const node of r.addedNodes) if (node.nodeName === 'svg') rewrite(node);
  }).observe(document, { childList: true, subtree: true });
})();`
const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {})
const { context, page } = await openApp(browser, built, SAMPLE, FRAME_PROBE)
if (process.env.VARIANT === 'bboxmask') {
  await page.evaluate(BBOX_MASK)
  // force one redraw so the current picture is rewritten too
}
if (VARIANTS[process.env.VARIANT]) await page.addStyleTag({ content: VARIANTS[process.env.VARIANT] })
const cdp = await context.newCDPSession(page)
const burst = (events) => Promise.all(events.map((one) => cdp.send('Input.dispatchMouseEvent', one)))

const centre = await page.evaluate(() => {
  const r = document.querySelector('[data-role="Schedule Canvas"] svg').getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }
})

// Bare ground for MK-6, as bareCanvasPoint in the nfr test.
const bare = (near) => page.evaluate(([at]) => {
  const drawing = document.querySelector('[data-role="Schedule Canvas"] svg')
  const box = drawing.getBoundingClientRect()
  const palette = document.querySelector('[data-role="Command Palette"]')?.getBoundingClientRect() ?? null
  const isGround = (x, y) => {
    if (palette && x >= palette.left && x <= palette.right && y >= palette.top && y <= palette.bottom) return false
    const hit = document.elementFromPoint(x, y)
    if (!hit || !drawing.contains(hit) || hit === drawing) return false
    if (hit.closest('[data-role]')?.getAttribute('data-role') !== 'Schedule Canvas') return false
    const name = hit.closest('[data-figure]')?.getAttribute('data-figure') ?? ''
    return name.startsWith('task-group-') || name === 'non-working-days'
  }
  const around = [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]]
  const spots = []
  for (let y = box.top + 8; y <= box.bottom - 8; y += 12) for (let x = box.left + 8; x <= box.right - 8; x += 12) spots.push({ x, y, far: Math.hypot(x - at.x, y - at.y) })
  spots.sort((a, b) => a.far - b.far)
  return spots.find((s) => around.every(([dx, dy]) => isGround(s.x + dx, s.y + dy))) ?? null
}, [near])

let origin = centre
let held = 0
const path = (round, count) => Array.from({ length: count }, (_u, step) => {
  const phase = (round * count + step) / 7
  return { type: 'mouseMoved', x: origin.x + Math.sin(phase) * (centre.w / 5), y: origin.y + Math.cos(phase / 2) * (centre.h / 5), button: 'left', buttons: 1, modifiers: held }
})

let gesture
if (scenario === 'status') {
  const line = await figureBox(page, 'status-line')
  const at = { x: line.x, y: line.y + line.h / 2 }
  await burst([{ type: 'mouseMoved', x: at.x, y: at.y }, { type: 'mousePressed', x: at.x, y: at.y, button: 'left', buttons: 1, clickCount: 1 }])
  origin = { x: at.x + 40, y: at.y }
  gesture = (round) => burst(path(round, PER_BURST).map((e) => ({ ...e, x: origin.x + (e.x - origin.x) * 0.5 })))
} else if (scenario === 'marquee') {
  const from = await bare({ x: centre.x - centre.w / 3, y: centre.y - centre.h / 3 })
  if (!from) throw new Error('no bare ground')
  await burst([{ type: 'mouseMoved', x: from.x, y: from.y }, { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 }])
  gesture = (round) => burst(path(round, PER_BURST))
} else if (scenario === 'pan') {
  held = CTRL
  await burst([{ type: 'mouseMoved', x: centre.x, y: centre.y, modifiers: CTRL }, { type: 'mousePressed', x: centre.x, y: centre.y, button: 'left', buttons: 1, clickCount: 1, modifiers: CTRL }])
  gesture = (round) => burst(path(round, PER_BURST))
} else if (scenario === 'zoom') {
  await burst([{ type: 'mouseMoved', x: centre.x, y: centre.y }])
  gesture = (round) => burst(Array.from({ length: PER_BURST }, (_u, step) => ({ type: 'mouseWheel', x: centre.x, y: centre.y, deltaX: 0, deltaY: (round + step) % 8 < 4 ? 80 : -80, modifiers: CTRL })))
} else throw new Error('unknown scenario ' + scenario)

const now = () => page.evaluate(() => performance.now())
const drive = async (ms) => {
  const start = await now()
  const t0 = Date.now()
  let round = 0
  while (Date.now() - t0 < ms) await gesture(round++)
  const end = await now()
  return { start, end, rounds: round }
}

// warm-up, thrown away
await drive(1500)
await page.waitForTimeout(800)
const plain = await drive(PLAIN_MS)
await page.waitForTimeout(800)

await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
const traceFile = join(outDir, `${scenario}-${run}.trace.json`)
await browser.startTracing(page, { path: traceFile, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8', 'blink.user_timing'] })
await cdp.send('Profiler.start')
const profiled = await drive(PROFILED_MS)
const { profile } = await cdp.send('Profiler.stop')
await browser.stopTracing()
await page.waitForTimeout(600)

if (scenario !== 'zoom') await burst([{ type: 'mouseReleased', x: origin.x, y: origin.y, button: 'left', buttons: 0, clickCount: 1 }])
const probe = await page.evaluate(() => ({ samples: window.__probe.samples, after: window.__probe.after, inputs: window.__probe.inputs }))
const svgLen = await page.evaluate(() => document.querySelector('[data-role="Schedule Canvas"] svg')?.outerHTML.length ?? 0)
const bboxMaskMs = await page.evaluate(() => window.__bboxMaskMs ?? null)
if (bboxMaskMs !== null) console.log('bboxmask rewrite ms total', Math.round(bboxMaskMs))
writeFileSync(join(outDir, `${scenario}-${run}.cpuprofile`), JSON.stringify(profile))
writeFileSync(join(outDir, `${scenario}-${run}.probe.json`), JSON.stringify({ scenario, run, plain, profiled, probe, svgLen, browser: browser.version() }))
console.log(scenario, run, 'rounds', plain.rounds, profiled.rounds, 'svgLen', svgLen)
await browser.close()
````

</details>

<details><summary><code>run-block.ps1</code></summary>

````powershell
# One block: <runs> rounds of the four scenarios (interleaved), one browser, one variant.
# Usage (from the checkout root): pwsh run-block.ps1 <built index.html> <outDir> <channel|''> <variant|''> <runs>
param([string]$Built, [string]$Out, [string]$Channel, [string]$Variant, [int]$Runs = 3)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Item -ItemType Directory -Force $Out | Out-Null
$env:CHANNEL = $Channel; $env:VARIANT = $Variant; $env:PLAIN_MS = '8000'; $env:PROFILED_MS = '8000'
function Load([string]$tag) {
  $before = @{}; Get-Process | ForEach-Object { $before[$_.Id] = $_.CPU }
  $s = (Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 2 -MaxSamples 5).CounterSamples | ForEach-Object { [math]::Round($_.CookedValue, 1) }
  $d = Get-Process | ForEach-Object { [pscustomobject]@{ N = $_.Name; D = [math]::Round(($_.CPU - $before[$_.Id]), 2) } }
  $top = $d | Sort-Object D -Descending | Select-Object -First 6 | ForEach-Object { "{0} {1}s" -f $_.N, $_.D }
  "$(Get-Date -Format HH:mm:ss) $tag cpu% " + ($s -join ' ') + ' | top cpu-seconds in 10s: ' + ($top -join ', ') | Add-Content (Join-Path $Out 'load.txt')
}
for ($r = 1; $r -le $Runs; $r++) {
  foreach ($s in 'status', 'marquee', 'pan', 'zoom') {
    Load "$s-$r"
    node (Join-Path $here 'profile.mjs') $Built $s $r $Out 2>&1 | Add-Content (Join-Path $Out 'run.txt')
  }
}
````

</details>

<details><summary><code>analyze.mjs</code></summary>

````js
// Summarise the runs of one scenario: frame intervals (plain window), main-thread phases (trace)
// and per-function self/total time (CPU profile), all per frame.
// Usage (from the checkout root): node <dir>/analyze.mjs <outDir> <scenario> [top=12]
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const [outDir, scenario, topArg] = process.argv.slice(2)
const TOP = Number(topArg ?? 12)
const runs = readdirSync(outDir).filter((f) => f.startsWith(scenario + '-') && f.endsWith('.probe.json')).map((f) => f.split('-')[1].split('.')[0]).sort()

// --- source index: function name -> file:line
const srcIndex = new Map()
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) {
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        const m = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)\s*[<(]/) ||
          line.match(/^\s*(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*(?::[^=]*)?=>/) ||
          line.match(/^\s{2,}([A-Za-z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\{\s*$/) ||
          line.match(/^\s{2,}([A-Za-z0-9_$]+)\s*:\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*(?::[^=]*)?=>/)
        if (m) {
          const key = m[1]
          if (!srcIndex.has(key)) srcIndex.set(key, [])
          srcIndex.get(key).push(relative('.', p).replace(/\\/g, '/') + ':' + (i + 1))
        }
      })
    }
  }
}
walk('src')
const whereOf = (fn) => {
  const base = fn.replace(/\$\d+$/, '')
  const hits = srcIndex.get(base)
  if (!hits) return '-'
  return hits[0].replace(/^src\//, '') + (hits.length > 1 ? ` (+${hits.length - 1})` : '')
}

const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b)
  if (s.length === 0) return NaN
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]
}
const med = (xs) => pct(xs, 0.5)
const r1 = (x) => Math.round(x * 10) / 10

function framesIn(probe, win) {
  const byStamp = new Map()
  for (const [stamp, enter, leave] of probe.samples) {
    if (enter < win.start || enter > win.end) continue
    const f = byStamp.get(stamp) ?? { stamp, enter, inside: 0 }
    f.enter = Math.min(f.enter, enter)
    f.inside += leave - enter
    byStamp.set(stamp, f)
  }
  const after = new Map(probe.after.map(([s, t]) => [s, t]))
  const frames = [...byStamp.values()].sort((a, b) => a.enter - b.enter)
  for (const f of frames) f.done = after.get(f.stamp) ?? NaN
  const intervals = frames.slice(1).map((f, i) => f.enter - frames[i].enter)
  const inputs = probe.inputs.filter((t) => t >= win.start && t <= win.end).length
  return { frames, intervals, inputs }
}

// --- CPU profile
function profileTimes(prof) {
  const nodes = new Map(prof.nodes.map((n) => [n.id, n]))
  const parent = new Map()
  for (const n of prof.nodes) for (const c of n.children ?? []) parent.set(c, n.id)
  const keyOf = (n) => {
    const cf = n.callFrame
    const name = cf.functionName || '(anonymous)'
    if (name.startsWith('(')) return name
    return name + '@' + cf.lineNumber
  }
  const self = new Map()
  const total = new Map()
  let sum = 0
  for (let i = 0; i < prof.samples.length; i++) {
    const dt = (prof.timeDeltas[i + 1] ?? 0) / 1000
    sum += dt
    let id = prof.samples[i]
    const leaf = nodes.get(id)
    self.set(keyOf(leaf), (self.get(keyOf(leaf)) ?? 0) + dt)
    const seen = new Set()
    while (id !== undefined) {
      const k = keyOf(nodes.get(id))
      if (!seen.has(k)) { seen.add(k); total.set(k, (total.get(k) ?? 0) + dt) }
      id = parent.get(id)
    }
  }
  return { self, total, sum }
}

// --- trace: exclusive time per event name on the busiest renderer main thread
function tracePhases(trace) {
  const events = trace.traceEvents ?? trace
  const mains = new Set(events.filter((e) => e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain').map((e) => e.pid + ':' + e.tid))
  const count = new Map()
  for (const e of events) { const k = e.pid + ':' + e.tid; if (mains.has(k) && e.ph === 'X') count.set(k, (count.get(k) ?? 0) + 1) }
  const main = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const spans = []
  const open = []
  for (const e of events) {
    if (e.pid + ':' + e.tid !== main) continue
    if (e.ph === 'X' && typeof e.dur === 'number') spans.push({ name: e.name, ts: e.ts, end: e.ts + e.dur })
    else if (e.ph === 'B') open.push(e)
    else if (e.ph === 'E') { const b = open.pop(); if (b) spans.push({ name: b.name, ts: b.ts, end: e.ts }) }
  }
  spans.sort((a, b) => a.ts - b.ts || b.end - a.end)
  const excl = new Map()
  const stack = []
  const add = (name, us) => excl.set(name, (excl.get(name) ?? 0) + us)
  for (const s of spans) {
    while (stack.length && stack[stack.length - 1].end <= s.ts) stack.pop()
    if (stack.length) add(stack[stack.length - 1].name, -(Math.min(s.end, stack[stack.length - 1].end) - s.ts))
    add(s.name, s.end - s.ts)
    stack.push(s)
  }
  const first = spans.length ? spans[0].ts : 0
  const last = spans.length ? Math.max(...spans.map((s) => s.end)) : 0
  // Raster off the main thread: RasterTask on any thread (software raster in the renderer's pool,
  // or GPU-process tasks), summed over threads (CPU ms, not wall ms).
  let rasterUs = 0; let gpuUs = 0
  const tn = new Map(events.filter((e) => e.ph === 'M' && e.name === 'thread_name').map((e) => [e.pid + ':' + e.tid, e.args.name]))
  let reach = -Infinity
  const gpuSpans = []
  for (const e of events) {
    if (e.ph !== 'X' || typeof e.dur !== 'number') continue
    if (e.name === 'RasterTask') rasterUs += e.dur
    if (tn.get(e.pid + ':' + e.tid) === 'CrGpuMain') gpuSpans.push([e.ts, e.ts + e.dur])
  }
  gpuSpans.sort((a, b) => a[0] - b[0])
  for (const [s, t] of gpuSpans) {
    if (s >= reach) { gpuUs += t - s; reach = t } else if (t > reach) { gpuUs += t - reach; reach = t }
  }
  return { excl, wallMs: (last - first) / 1000, rasterMs: rasterUs / 1000, gpuMs: gpuUs / 1000 }
}

const GROUPS = {
  'JS (script)': ['FunctionCall', 'FireAnimationFrame', 'EventDispatch', 'EvaluateScript', 'TimerFire', 'RunMicrotasks', 'V8.Execute', 'v8.callFunction', 'v8.run', 'V8.RunMicrotasks', 'v8.compile', 'v8.compileModule', 'V8.CompileCode', 'v8.parseOnBackground', 'V8.ParseFunction', 'HandlePostMessage'],
  'Style (UpdateLayoutTree)': ['UpdateLayoutTree', 'ScheduleStyleRecalculation', 'RecalculateStyles', 'ParseAuthorStyleSheet'],
  'Layout': ['Layout', 'InvalidateLayout', 'UpdateLayout'],
  'Paint (PrePaint/Paint/Layerize/Commit)': ['PrePaint', 'Paint', 'PaintImage', 'Layerize', 'Commit', 'UpdateLayer', 'UpdateLayerTree', 'CompositeLayers', 'PaintSetup', 'RasterTask'],
  'GC': ['MinorGC', 'MajorGC', 'V8.GC_SCAVENGER', 'V8.GC_MARK_COMPACTOR', 'BlinkGC.AtomicPhase', 'V8.GCScavenger', 'V8.GCFinalizeMC', 'ThreadState::performIdleLazySweep', 'V8.GCIncrementalMarking', 'V8.GCCompactor', 'V8.GC_MC_BACKGROUND_MARKING', 'CppGC.AtomicMark'],
  'HitTest': ['HitTest'],
}
const groupOf = (name) => {
  for (const [g, names] of Object.entries(GROUPS)) if (names.includes(name)) return g
  if (/GC/i.test(name)) return 'GC'
  return 'other (' + name + ')'
}

const plainIntervals = []
const perRun = []
const selfAll = new Map(); const totalAll = new Map()
let framesAll = 0
const phaseAll = new Map(); const nameAll = new Map()
for (const run of runs) {
  const p = JSON.parse(readFileSync(join(outDir, `${scenario}-${run}.probe.json`), 'utf8'))
  const plain = framesIn(p.probe, p.plain)
  const prof = framesIn(p.probe, p.profiled)
  plainIntervals.push(...plain.intervals)
  const work = plain.frames.map((f) => f.done - f.enter).filter(Number.isFinite)
  perRun.push({ run, frames: plain.frames.length, median: med(plain.intervals), p90: pct(plain.intervals, 0.9), inputsPerFrame: plain.inputs / Math.max(1, plain.frames.length), inside: med(plain.frames.map((f) => f.inside)), work: med(work), profFrames: prof.frames.length, profMedian: med(prof.intervals), svgLen: p.svgLen, browser: p.browser })
  const cpu = profileTimes(JSON.parse(readFileSync(join(outDir, `${scenario}-${run}.cpuprofile`), 'utf8')))
  framesAll += prof.frames.length
  for (const [k, v] of cpu.self) selfAll.set(k, (selfAll.get(k) ?? 0) + v)
  for (const [k, v] of cpu.total) totalAll.set(k, (totalAll.get(k) ?? 0) + v)
  const tr = tracePhases(JSON.parse(readFileSync(join(outDir, `${scenario}-${run}.trace.json`), 'utf8')))
  perRun[perRun.length - 1].raster = tr.rasterMs / Math.max(1, prof.frames.length)
  perRun[perRun.length - 1].gpu = tr.gpuMs / Math.max(1, prof.frames.length)
  for (const [name, us] of tr.excl) {
    nameAll.set(name, (nameAll.get(name) ?? 0) + us / 1000)
    const g = groupOf(name)
    phaseAll.set(g, (phaseAll.get(g) ?? 0) + us / 1000)
  }
}

console.log(`## ${scenario}  runs=${runs.length}`)
for (const r of perRun) console.log(`run ${r.run}: frames ${r.frames}, interval median ${r1(r.median)} p90 ${r1(r.p90)} ms, rAF inside median ${r1(r.inside)}, rAF+render median ${r1(r.work)}, inputs/frame ${r1(r.inputsPerFrame)} | raster CPU ${r1(r.raster)} ms/frame, GPU main ${r1(r.gpu)} | profiled: frames ${r.profFrames} interval median ${r1(r.profMedian)} | svgLen ${r.svgLen} | ${r.browser}`)
console.log(`ALL plain: intervals n=${plainIntervals.length} median ${r1(med(plainIntervals))} p90 ${r1(pct(plainIntervals, 0.9))} ms`)
console.log(`profiled frames total ${framesAll}`)
const perFrame = (ms) => r1(ms / framesAll)
console.log('\n### trace phases (exclusive, ms per frame)')
const busy = [...phaseAll.entries()].filter(([g]) => !g.startsWith('other (ThreadControllerImpl::RunTask')).reduce((a, [, v]) => a + v, 0)
for (const [g, v] of [...phaseAll.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`${g}\t${perFrame(v)}\t${r1((100 * v) / busy)}%`)
console.log('\n### trace names top')
for (const [n, v] of [...nameAll.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(`${n}\t${perFrame(v)}`)
const sumSelf = [...selfAll.values()].reduce((a, b) => a + b, 0) - (selfAll.get('(idle)') ?? 0)
console.log(`\n### CPU self (ms per frame, % of non-idle samples ${r1(sumSelf / framesAll)} ms/frame)`)
for (const [k, v] of [...selfAll.entries()].filter(([k]) => k !== '(idle)').sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log(`${k}\t${whereOf(k.split('@')[0])}\t${perFrame(v)}\t${r1((100 * v) / sumSelf)}%`)
console.log('\n### CPU total (ms per frame)')
for (const [k, v] of [...totalAll.entries()].filter(([k]) => !k.startsWith('(')).sort((a, b) => b[1] - a[1]).slice(0, TOP * 3)) console.log(`${k}\t${whereOf(k.split('@')[0])}\t${perFrame(v)}\t${r1((100 * v) / sumSelf)}%`)
if (process.env.JSON_OUT) {
  const per = (m) => Object.fromEntries([...m.entries()].map(([k, v]) => [k, v / framesAll]))
  const { writeFileSync } = await import('node:fs')
  writeFileSync(process.env.JSON_OUT, JSON.stringify({
    scenario, perRun, frames: framesAll, median: med(plainIntervals), p90: pct(plainIntervals, 0.9),
    names: per(nameAll), self: per(selfAll), total: per(totalAll), sumSelf: sumSelf / framesAll,
    where: Object.fromEntries([...totalAll.keys(), ...selfAll.keys()].map((k) => [k, whereOf(k.split('@')[0])])),
  }))
}
const pick = (name) => [...totalAll.entries()].filter(([k]) => k.split('@')[0] === name).reduce((a, [, v]) => a + v, 0)
console.log('\n### named buckets (total ms per frame)')
for (const n of (process.env.BUCKETS ?? 'runFrame,drawnPictureOf,svgFromSchedule,showSvg,nonWorkingDaysSvg,workingDaysBetween,indexOfCalendar,bandCeilingFor,taskGroupBandCeilingOf,bandCeilingUpTo,commandFromPointer,showScreenView,layoutFromSchedule,geometryFromLayout').split(',')) console.log(`${n}\t${perFrame(pick(n))}\t${r1((100 * pick(n)) / sumSelf)}%`)
````

</details>

<details><summary><code>tables.mjs</code></summary>

````js
// Markdown tables for the report from the analyze.mjs JSON files (<block>/<scenario>.json).
// Usage: node tables.mjs <rootDir> <scenario>
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const [root, scenario] = process.argv.slice(2)
const load = (block) => { const f = join(root, block, scenario + '.json'); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null }
const f1 = (x) => (x === undefined || x === null || Number.isNaN(x) ? '—' : (Math.round(x * 10) / 10).toFixed(1))
const f0 = (x) => (x === undefined || x === null || Number.isNaN(x) ? '—' : String(Math.round(x)))
const blocks = [
  ['base-chromium', 'Chromium 現状'], ['base-edge', 'Edge 現状'],
  ['aonly-chromium', 'Chromium 直し (a) だけ（1 回）'], ['aonly-edge', 'Edge 直し (a) だけ（1 回）'],
  ['bbox-chromium', 'Chromium 直し (M) だけ'], ['bbox-edge', 'Edge 直し (M) だけ'],
  ['amask-chromium', 'Chromium (M)+(a)'], ['amask-edge', 'Edge (M)+(a)'],
]
console.log('| 条件 | 間隔の中央値 ms | p90 ms | 回ごとの中央値 ms | フレーム数（素の窓） | 描画（raster）の CPU ms/フレーム | GPU 主スレッド ms/フレーム |')
console.log('|---|---|---|---|---|---|---|')
for (const [b, label] of blocks) {
  const j = load(b); if (!j) continue
  const runs = j.perRun.map((r) => f0(r.median)).join(' / ')
  const frames = j.perRun.reduce((a, r) => a + r.frames, 0)
  const raster = j.perRun.reduce((a, r) => a + r.raster, 0) / j.perRun.length
  const gpu = j.perRun.reduce((a, r) => a + r.gpu, 0) / j.perRun.length
  console.log(`| ${label} | ${f0(j.median)} | ${f0(j.p90)} | ${runs} | ${frames} | ${f0(raster)} | ${f0(gpu)} |`)
}
const c = load('base-chromium'); const e = load('base-edge')
const tot = (j, name) => Object.entries(j.total).filter(([k]) => k.split('@')[0] === name).reduce((a, [, v]) => a + v, 0)
const slf = (j, name) => Object.entries(j.self).filter(([k]) => k.split('@')[0] === name).reduce((a, [, v]) => a + v, 0)
const nm = (j, name) => j.names[name] ?? 0
const rows = [
  ['主スレッドの JS（trace の FunctionCall）', (j) => nm(j, 'FunctionCall')],
  ['├ 非稼働日の帯 `nonWorkingDaysSvg`（暦の索引を日ごとに作る）', (j) => tot(j, 'nonWorkingDaysSvg')],
  ['├ SVG 文字列づくり（`svgFromSchedule` から帯を除いた分）', (j) => tot(j, 'svgFromSchedule') - tot(j, 'nonWorkingDaysSvg')],
  ['├ DOM の差し替え（`showSvg` の自己時間 = `innerHTML`）', (j) => slf(j, 'showSvg')],
  ['├ モデル（`drawnPictureOf` = 配置と幾何）', (j) => tot(j, 'drawnPictureOf')],
  ['├ 画面の面（`showScreenView`）', (j) => tot(j, 'showScreenView')],
  ['└ フレームの外の JS（入力の訳など = FunctionCall − `runAskedFrame`）', (j) => nm(j, 'FunctionCall') - tot(j, 'runAskedFrame')],
  ['`innerHTML` の構文解析（trace の ParseHTML）', (j) => nm(j, 'ParseHTML')],
  ['スタイル（UpdateLayoutTree）', (j) => nm(j, 'UpdateLayoutTree')],
  ['レイアウト（Layout）', (j) => nm(j, 'Layout')],
  ['ペイント（PrePaint + Paint + Layerize）', (j) => nm(j, 'PrePaint') + nm(j, 'Paint') + nm(j, 'Layerize')],
  ['Commit（主スレッドが前のフレームの描画を待つ）', (j) => nm(j, 'Commit')],
]
console.log('\n| 内訳（計装した窓、ms/フレーム） | Chromium | Edge |')
console.log('|---|---|---|')
for (const [label, fn] of rows) console.log(`| ${label} | ${c ? f1(fn(c)) : '—'} | ${e ? f1(fn(e)) : '—'} |`)
const skip = new Set(['(program)', '(idle)', '(garbage collector)', '(root)', '(anonymous)'])
const wrappers = new Set(['runAskedFrame', 'runFrame'])
const lineOf = (k) => k.includes('@') ? k.split('@')[0] : k
const top = (j, map, n, filter) => Object.entries(j[map]).filter(([k]) => filter(k)).sort((a, b) => b[1] - a[1]).slice(0, n)
const eOf = (map, k) => { if (!e) return '—'; const name = lineOf(k); return f1(Object.entries(e[map]).filter(([kk]) => lineOf(kk) === name).reduce((a, [, v]) => a + v, 0)) }
console.log('\n| 自己時間の上位 10 | 置き場 | Chromium ms/フレーム | Edge ms/フレーム |')
console.log('|---|---|---|---|')
for (const [k, v] of top(c, 'self', 10, (k) => !skip.has(k))) console.log(`| \`${lineOf(k)}\` | \`${c.where[k]}\` | ${f1(v)} | ${eOf('self', k)} |`)
console.log(`| （参考）\`(program)\` —— 主スレッドの JS の外（Commit の待ちなど） | — | ${f1(c.self['(program)'])} | ${f1(e?.self['(program)'])} |`)
console.log('\n| 合計時間の上位 10（フレームの入口 2 つを除く） | 置き場 | Chromium ms/フレーム | Edge ms/フレーム |')
console.log('|---|---|---|---|')
for (const [k, v] of top(c, 'total', 10, (k) => !k.startsWith('(') && !wrappers.has(lineOf(k)))) console.log(`| \`${lineOf(k)}\` | \`${c.where[k]}\` | ${f1(v)} | ${eOf('total', k)} |`)
````

</details>

<details><summary><code>patch-calendar.mjs</code></summary>

````js
// Counterfactual copy for fix (a): indexOfCalendar remembers its answer per calendar object
// (WeakMap), so nonWorkingDaysSvg's per-day workingDaysBetween reuses one index per frame.
// The CSP meta is stripped because the inline script's hash no longer matches.
// Usage: node patch-calendar.mjs <in index.html> <out index.html>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
const [from, to] = process.argv.slice(2)
let html = readFileSync(from, 'utf8')
const head = 'function indexOfCalendar(within) {'
if (html.split(head).length !== 2) throw new Error('indexOfCalendar not found exactly once')
html = html.replace(head, 'const __calendarIndexMemo = new WeakMap();\nfunction indexOfCalendar(within) {\n  const __held = __calendarIndexMemo.get(within);\n  if (__held !== undefined) return __held;\n  const __made = indexOfCalendarMade(within);\n  __calendarIndexMemo.set(within, __made);\n  return __made;\n}\nfunction indexOfCalendarMade(within) {')
const csp = html.match(/<meta[^>]*Content-Security-Policy[^>]*>/i)
if (!csp) throw new Error('no CSP meta')
html = html.replace(csp[0], '')
mkdirSync(dirname(to), { recursive: true })
writeFileSync(to, html)
console.log('patched', to)
````

</details>

<details><summary><code>identity.mjs</code></summary>

````js
// Pixel identity of the bbox-mask rewrite: screenshot the opened large sample, rewrite the
// picture in place, screenshot again, and count differing pixels in a canvas.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium, openApp } from './open.mjs'
const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, 'profile.mjs'), 'utf8')
const BBOX_MASK = new Function('return `' + src.split('const BBOX_MASK = `')[1].split('`\n')[0] + '`')()
const [built, channel] = process.argv.slice(2)
const browser = await chromium.launch(channel ? { channel } : {})
const { page } = await openApp(browser, built, 'sample-large-erp-program.ja.xml')
await page.mouse.move(5, 1075)
await page.waitForTimeout(500)
const before = await page.screenshot()
await page.evaluate(BBOX_MASK)
const masks = await page.evaluate(() => { window.__bboxRewrite(document.querySelector('[data-role="Schedule Canvas"] svg')); return document.querySelectorAll('mask').length })
await page.waitForTimeout(500)
const after = await page.screenshot()
const diff = await page.evaluate(async ([a, b]) => {
  const load = (b64) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b64 })
  const [ia, ib] = await Promise.all([load(a), load(b)])
  const px = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data }
  const da = px(ia); const db = px(ib)
  let n = 0; let max = 0
  for (let i = 0; i < da.length; i += 4) { const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])); if (d > 0) n++; if (d > max) max = d }
  return { n, max, total: da.length / 4 }
}, [before.toString('base64'), after.toString('base64')])
console.log(channel ?? 'chromium', 'masks', masks, 'bytes equal', before.equals(after), JSON.stringify(diff))
await browser.close()
````

</details>

## 付録 C. 直した後（2026-10-10、`DFC-2314`）

(M)・(a)・(d)・(b)・(e) を `d85d391b`（`4c836c55` の上）で当てた。(c) は CR が要るので当てていない。
測り方は付録 A・B と同じ台本・同じ機械で、直す前（`4c836c55`）と後（`d85d391b`）の `vite build --minify false` の写しを作業木の外に置き、錠の下で 4 場面を交互に 3 周ずつ測った。混み: 各場面の前の全体の CPU は 5 標本の平均で 18〜48 %、OneDrive と同期サービスが 10 s に 9.6〜24.0 CPU 秒（前と後で同じ程度）。直す前の数は本書の 2 節より Chromium の S1・S2・S4 で 3〜9 % 遅い（同じ日の別の時刻の混み）。

| 場面 | Chromium 前 → 後（中央値 ms） | 回ごとの中央値 前 / 後 | Chromium p90 前 → 後 | Edge 前 → 後（中央値 ms） | Edge p90 前 → 後 |
|---|---|---|---|---|---|
| S1 基準日の線の引き | 417 → 21 | 450 / 416 / 401 → 20 / 22 / 22 | 482 → 27 | 144 → 23 | 148 → 37 |
| S2 範囲選択 | 434 → 19 | 451 / 449 / 416 → 18 / 21 / 18 | 484 → 26 | 144 → 22 | 147 → 34 |
| S3 パン（対照） | 38 → 17 | 38 / 37 / 48 → 17 / 23 / 17 | 52 → 29 | 44 → 28 | 94 → 51 |
| S4 ズーム | 399 → 21 | 414 / 393 / 399 → 22 / 19 / 22 | 442 → 29 | 116 → 26 | 152 → 40 |

| 直しごとの関数（Chromium、計装した窓、ms/フレーム） | 前 | 後 |
|---|---|---|
| (M) `Commit`（主スレッドが描画を待つ。S1） | 342.6 | 0.2 |
| (M) 描画（raster）の CPU（全スレッドの合計。S1） | 1721 | 21 |
| (a) `nonWorkingDaysSvg`（S1） | 71.9 | 0.4 |
| (d) `zoomEntranceEndsOf`・`layoutFromSchedule`（S1） | 8.3・9.0 | 0・0 |
| (b) `bandCeilingFor`（S4） | 1.4 | 0.0 |
| (e) `reportPaletteBand`（S3・S4） | 2.8・2.6 | 0・0 |

- (b) の探り針（帯の上限の作り置きの問いを数える写し、5 s のズーム）: 解き直しは 534 回の問いのうち 169 回 → 701 回のうち 7 回。外れの理由は、1 刻みが問う 3〜4 個の `zoomX` が 1 つだけの作り置きを互いに追い出すこと（`zoomX` の違い 144 回・`enough` の不足 25 回）。
- 絵の恒等（`DFC-1132` の撮り方を広げた。内蔵のテンプレートと大きな見本 × 窓 2 つ × 画素比 2 つ × 状態 29、画面の撮影と SVG を画像として描いた絵）: Chromium の 464 枚のうち SVG の絵は 0 画素の違い。テンプレートの 1920×1080・画素比 1 の画面の撮影 6 枚だけが `App Header` のアイコンの角 231 画素で 1 段違うが、ヘッダーとパレットの `outerHTML` と矩形は全状態で一致し、(d)・(b)・(e) を 1 つずつ戻した写しでも同じ 6 枚が違う（直す前のビルドの撮り直しは 0）。壊した写し 2 つ（マスクの領域の張り出しを 0／例外の届く日を 1 日縮める）は 58 枚すべてが赤。Edge（大きな見本、1920×1080、画素比 1）は前と後で 58 枚中 17 枚が 1 段・高々 111 画素違うが、直す前の撮り直しでも 17 枚が同じ大きさで違う（GPU の揺れ。2 節の 2 画素と同じ種）。
- SVG の字は大きな見本で 238,881 → 334,681 字（マスクがハローごとになったため。1.4 倍）。
- 残り（S1 約 21 ms）の内訳: DOM の差し替え 5.6 ms・モデル 3.2 ms・SVG の文字列 2.2 ms・構文解析とスタイルとペイント。次は (c)（`DFC-2302`、CR が要る）。
