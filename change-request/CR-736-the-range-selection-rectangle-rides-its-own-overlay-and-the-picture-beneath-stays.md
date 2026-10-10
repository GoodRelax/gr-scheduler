# CR-736 —— 範囲選択の矩形（`ZO-6`）を小さな重ねの SVG に描き、下の絵は文字列が同じなら載せ直さない

> 起草の状態: 起草のみ（2026-10-11、作業木を `2bb7d3ce` へ早送りして起草した）。未着地。本書を書いた体は `docs/spec/`・`src/`・`tests/` と台帳に 1 字も書いていない。
> ID の帯: 番号 `CR-736` だけを調整役から受けた（`git grep CR-736 2bb7d3ce` は 0 件）。台帳の行（`JDG`・`DFC`・`PND`）は書かない。仕様の新しい行 ID は取らない（2 節）。新しい名は 表 T-064 のメンバ 1 つと 表 T-065 の口 1 つ（`git grep "marqueeOverlaySvg\|showMarqueeOverlaySvg" 2bb7d3ce` は 0 件）。
> 覆すもの: 無い。
> 直すもの: `DFC-2302` の ①（`docs/review/perf-profile-2026-10-10.md` の 3 節の順 4、`(c)`）。② は本書では当てない（決定 X-2 と 11 節の問い 1）。
> ⚠️ 並行: `CR-733`（表のウィンドウの前後）が `src/framework/single-html-shell/frame-loop.ts` を変えている。本書のコードの波は `CR-733` の着地の後に切る（8 節）。`CR-735` とは触れる所が重ならない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`2bb7d3ce`）

| 主張（どこが言うか） | 見たもの | 本書での扱い |
|---|---|---|
| 範囲選択のあいだ動くのは枠だけで、ほかは組み直さなくてよい（`DFC-2302` の期待） | 下の絵は、枠のほかにポインタからも 3 か所で変わる: ① ガイドカーソル（`S-66` が `'none'` でないとき、`ZO-8`。`schedule-overlays.ts` の `guideCursorMode` の枝）② 実績のダミーの濃さ（指の下に入ったときだけ 1、`ZO-2`。`schedule-task-figures.ts` の `handInside`）③ 進捗マーカーの濃さ（指が掴み代に載ったときだけ 1、`ZO-3`。同じ所の `handOn`）。ほかに 2 連カーソルの追従（`ZO-8`）。⭐ ② ③ は真偽が変わったフレームだけ文字列を変える。① は既定（`S-66` の `'none'`）では描かない | 重ねに出すのは `ZO-6` だけ（X-1）。下の絵が変わったフレームは今までどおり載せ直す —— ① を点けた人の範囲選択は速くならない（10.1 節の対照 S2g） |
| 下の絵は入力が同じなら組み直さない（`DFC-2302` の ②） | `svgFromSchedule` は指の位置（`pointer`）を引数に取り、範囲選択のあいだ毎フレーム違う。指の位置をそのまま鍵にした覚え置きは S2 で 1 度も当たらない。指の位置を「描く絵が読むもの」に絞った鍵は、`SvgRenderer` に新しい公開名と 表 T-071 の `CA-1` に持ち越しを 1 つ要る（`R2.20`） | 当てない（X-2）。文字列は毎フレーム組むが、`DomSvgSurface` が前と同じ文字列なら書き換えない（今の `dom-svg-surface.ts` の `if (svg === last) return`） |
| 見込みは S2 で約 18 ms → 数 ms（プロファイルの 3 節の順 4） | 内訳のうち、差し替え 4・構文解析 4・スタイル 3・ペイント 2 ms は ① で消え、文字列 2 ms は X-2 で残る。直した後の S2 は Chromium 19 ms・Edge 22 ms（同書の付録 C） | 見込みは Chromium 19 → 約 7 ms・Edge 22 → 約 9 ms（7 節）。測り方は 10.1 節 |
| 呼び出しは `frame-loop.ts` の 2471 行、枠の層は `svg-renderer.ts` の 855 行（同書の 3 節） | `2bb7d3ce` では 2786 行（`svgFromSchedule(` の 1 つ目）と 846 行（`zoLayer('ZO-6', …)`）。書き出し（3077 行）は `marquee` に `null` を渡している | 行番号は書かず、関数名で指す |
| `ZO-6` は 表 T-020 の最前面なので、同じ切り抜きの重ねにすれば絵は同じ（同書） | `ZO-6` は今 `groundClipped` の中の最後の層で、`Task Group Area` の帯（`area.x`・`area.y`・幅は `area.width + canvasPadding`・高さは `area.height`）で切られる。その後に描くのは目盛（自分の帯）だけ —— 帯と目盛は重ならない | 重ねの絵も同じ箱で切る（X-3）。`JDG-365`（目盛の帯まで引いた所は目盛の下に隠れてよい）も、今と同じく切って満たす |
| `IF-1` は「作った SVG 文字列を画面に載せる」1 つの口（表 T-065） | `svg-surface.ts` の `SvgSurface` は `showSvg(svg)` だけ。試験の 132 ファイルが `{ showSvg: … } as never` で口を差し替えている | 口を 1 つ足す（E-01）。シェルは重ねの絵の文字列が前と変わったときだけ新しい口を呼ぶ（X-5）—— 範囲選択を握って動かさない試験の差し替えは触らずに済む |
| 層の並びは 1 枚の SVG の中で決まる（表 T-075 の `UF-32`「1 枚の SVG を、表 T-020 の順に層を重ねて組み立てる」） | 本書の後は 2 枚になる | `UF-32` の升を直す（E-02） |
| `LM-19` は、描き直しの 9.2 ms が「絵の受け渡しが文字列であること（`IF-1`）」から来て、直すなら継ぎ目を変える別の判断だと言う | 本書は継ぎ目に口を 1 つ足すが、受け渡しは文字列のまま。下の絵の受け渡しも変えない | `LM-19` は変えない（段 0 の測りの記録であり、本書の後も文字列の受け渡しは残る） |
| 1 フレームの記録（`interaction-record.ts` の `recordFrame`）は描いた絵の要素を数える | 渡すのは `svgFromSchedule` の文字列だけ。重ねに出すと矩形が記録から消える | 下の絵と重ねの絵をつないだ文字列を数える（X-6）。表 T-263 は要素の数を定めていない |

### 0.2 裁定の鎖（`rulings.md` を「範囲選択」「`ZO-6`」「`IF-1`」「`SvgSurface`」「`innerHTML`」「重ね」「作り置き」「性能」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-365` | 範囲選択の矩形は目盛の帯まで引いた所が目盛の下に隠れてよい。`ZO-6` の「最前面」は 表 T-020 の行の中での順 | 重ねの絵も `Task Group Area` の帯で切る（X-3）—— 絵は今と同じ |
| `JDG-726` | 絵は今のまま。性能は同じ量の絵で段 0 と比べる | 10.1 節の手順 5 の合否は `JDG-726` の比べ方のまま |
| `JDG-11`・`JDG-50` | 性能は、ほかの不具合が無くなるまで今を是とし、段 0 より悪くしない | 本書は悪くしない向き。いつ当てるかは調整役が決める —— プロファイルの順 1〜3・5・6 は利用者の 2026-10-10 の「それでやれ」で当たった（`DFC-2314`）。順 4 の本書はその続き |

覆す行は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-003`（ぬるサク）** —— 範囲選択（`MK-6`）は、枠 1 つが動くたびに約 33 万字の SVG を差し替えている。差し替え・構文解析・スタイル・ペイントの約 13 ms を消し、`NFR-002`・`NFR-003` の間隔へ近づける。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R5.4`（不要な再レンダリング無し）** —— 枠が動くたびに下の絵の全体を差し替えるのは、まさに不要な再レンダリングである。⇒ 枠を別の小さな SVG に出す。
- **`R1.3`（唯一の正）** —— どの層を重ねに出すかの正は 表 T-065 の `IF-1` の 1 か所。層の並びを組むのは `UF-32` だけのまま（E-02）。表 T-020 に写さない。
- **`R2.20`（キャッシュ方針）** —— 覚え置き（`DFC-2302` の ②）は 表 T-071 の `CA-1` に持ち越しを足す。本書は足さない（X-2）ので `NA`。`DomSvgSurface` の「前と同じ文字列なら書き換えない」は今からある比べであり、答えを古くしない（全文を比べる）。
- **`R4.3`（中間のグリッチ無し）** —— 下の絵と重ねの絵は同じフレームの同じ呼び出しの中で続けて書く。間にペイントは入らない（X-5）。
- **`R2.1`・`R2.22`（名は指すものを言う、公開の入口の索引）** —— 新しい名は 2 つとも、運ぶものの名（範囲選択の矩形 = コードの `marquee`）を言う（X-4）。`marqueeOverlaySvg` は 表 T-064 の `PI-19` に載せる（E-03）。
- **`R2.5`（ISP）** —— `SvgSurface` を実装するのは `DomSvgSurface` だけで、2 つの口をどちらも使う。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 重ねの絵が持つのは 表 T-020 の `ZO-6`（範囲選択の矩形）だけ | ① `ZO-6` は最前面なので、下の絵の手前に重ねても前後が変わらない。② 基準日線（`ZO-8`）は層の途中（順 9）にあり、線を引くあいだイナズマ線（`ZO-16`）と進捗マーカー（`ZO-3`）も基準日で変わる —— 線だけを出すと名称ラベル（`ZO-5`）より手前に出て絵が変わり、全部を出すと順 9〜17 の 9 行が重ねに移り、下の絵より重ねの絵の方が大きくなる（S1 は速くならない）。③ 仮の依存線（`ZO-11`）も指だけで動くが、`ZO-12`（透かし）を挟むので、出すなら透かしも出す —— 測った場面が無いので出さない | S1（基準日の線の引き）と S4（ズーム）は本書で速くならない。仮の依存線を引く身振りも今のまま |
| X-2 | `svgFromSchedule` を入力で覚えない（`DFC-2302` の ② は当てない）。下の絵の文字列は毎フレーム組み、`DomSvgSurface` が前と同じなら書き換えない | 0.1 の 2 行目。指の位置を鍵から外すには、絵が指から読むもの（ガイドカーソル・ダミーの濃さ・マーカーの濃さ）を `SvgRenderer` が公開し、表 T-071 に持ち越しを足す（`R2.20`）。その鍵が 1 つ漏れると古い絵が残る（`DFC-567`・`DFC-2301` の経緯）。得は S2 で約 2 ms | 文字列づくり 1〜2 ms/フレームが残る。11 節の問い 1 |
| X-3 | 重ねの絵は、下の絵と同じ幅・高さ・`viewBox` を持ち、同じ箱（`Task Group Area` の帯 —— 幅に `canvasPadding` を足す）で切る。切り抜きの `id` は下の絵と別の接頭辞（例 `grs-marquee-clip-`）にする | 今の `ZO-6` は `groundClipped` の中にある。同じ `id` を 2 枚に置くと 1 つの文書に `id` が 2 つ立つ | 無い |
| X-4 | 名: 描く側は `marqueeOverlaySvg`（`SvgRenderer` の公開名）、口は `showMarqueeOverlaySvg`（`SvgSurface` のメソッド）。`svgFromSchedule` の引数 `marquee` は消す | 運ぶのは範囲選択の矩形だけ（X-1）なので、名がそれを言う（`JDG-820`）。コードは矩形を既に `marquee` と呼ぶ（`marqueeRect`、図形の鍵 `marquee`）。引数を消すと、書き出しが矩形を描く道が形の上で無くなる（今の TRAP「`marquee` は書き出しが `null` を渡すことに頼る」が要らなくなる） | `svgFromSchedule` の後ろの 2 つの引数（`watermark`・`tentativeLink`）の位置が 1 つ前へ動く —— 呼ぶ所は `src` の 2 つと試験 3 ファイル（9.1 節） |
| X-5 | シェルは重ねの絵の文字列を覚え、前と違うときだけ `showMarqueeOverlaySvg` を呼ぶ。初めは空の文字列。下の絵の `showSvg` の後、同じ呼び出しの中で呼ぶ | 範囲選択をしないフレームは新しい口に触れない —— 口を差し替えた 132 の試験のうち、新しい口を要るのは範囲選択を握って動かすものだけ（`t-023c-sl-3-…` ほか。`PTD-5` を名指す試験は 28 ファイル —— どれが口の差し替えで範囲選択を回すかは、当てる体が全体の vitest で数える） | シェルが文字列を 1 つ持つ |
| X-6 | 1 フレームの記録（`recordFrame`）は、下の絵と重ねの絵をつないだ文字列を数える | `FR-102` は記録に「描かれた絵の形」を書けと言う。重ねに出した矩形を数えないと、範囲選択の記録から矩形が消える | `svgBytes` と `svg`・`clipPath`・`g` の数が、範囲選択のあいだだけ今と違う（記録の書式は 表 T-263 が定めていない） |
| X-7 | 重ねの絵は点を受けない（`pointer-events: none`）。`Schedule Canvas` の箱の左上に、下の絵の手前に重ねる | `DomScreenSurface` の `readScreenPartAt`（`IF-9`）は `elementFromPoint` で点の下の要素を引く。重ねが点を受けると、答えが下の絵から重ねの `<svg>` へ変わる | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 継ぎ目の口と、重ねに出す層 | `docs/spec/05-07-design.md` の 表 T-065 の `IF-1` | E-01 |
| 層を組むユニット | 同じファイルの 表 T-075 の `UF-32` | E-02 |
| 公開名 | `docs/spec/_source/published-entries.json` の `PI-19` に `marqueeOverlaySvg`（生成物 `_assets/tbl-published-entries.md` ほか） | E-03 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行（版は当てるときの最大の次） | E-04 |
| 測り待ち | `docs/development-records/perf-pending.md` に 1 行（10 節） | E-05 |

**数**: 表の行の増減 0。要求の増減 0。図 0。升の書き換え 2（`IF-1`・`UF-32`）。表 T-064 のメンバ +1（`PI-19` は 12 → 13）。表 T-020 は変えない（X-1 —— 前後は変わらない）。

---

## 2. 新しい識別子

行 ID は取らない。新しい名は `marqueeOverlaySvg`（表 T-064）と `showMarqueeOverlaySvg`（`IF-1` の口）の 2 つ。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消す文 | 代わり |
|---|---|---|
| 表 T-065 の `IF-1` の `何を供給するか` | 「作った SVG 文字列を画面に載せる」 | E-01 の升 |
| 表 T-075 の `UF-32` の `何をするか` の頭 | 「`CP-19` の残り —— 1 枚の SVG を、表 T-020 の順に層を重ねて組み立てる。<br>層の並びを決めるのは本ユニットだけであり、兄弟は層ごとの文字列の列を返す」 | E-02 の升 |
| `src` の `svgFromSchedule` の引数 | `marquee: ScreenRect \| null = null` と `zoLayer('ZO-6', …)` | `marqueeOverlaySvg` が `ZO-6` を組む（5 節） |

ほかの文は消さない。

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/05-07-design.md -->
表 T-065 の `IF-1` の `何を供給するか` の升を次に替える（改行は CRLF —— このファイルの全行がそうである）。

```
作った SVG 文字列を画面に載せる。<br>⭐ 口は 2 つ —— 下の絵（表 T-020 の `ZO-6` を除く全行と目盛）と、重ねの絵（`ZO-6` の範囲選択の矩形だけ。握っていなければ空）。<br>重ねの絵は、下の絵と同じ幅・高さ・`viewBox` を持ち、`ZO-6` が下の絵の中で受けていたのと同じ切り抜き（`Task Group Area` の帯）で切り、`Schedule Canvas` の中で下の絵の手前に載せること（MUST） —— `ZO-6` は 表 T-020 の最前面なので、手前に重ねても前後は変わらない。<br>⭐ 分けるのは、範囲選択（表 T-023c の `SL-3`）のあいだ動くのが矩形だけだからである —— 矩形を下の絵に混ぜると、枠が動くたびに下の絵の全体を差し替える（`NFR-002`・`NFR-003`）。<br>⛔ 重ねの絵に `ZO-6` のほかの行を載せてはならない（MUST NOT） —— 基準日線（`ZO-8`）のように層の途中にある行を出すと、その手前の行（`ZO-3`・`ZO-5` ほか）との前後が変わる。<br>⭐ 実装は、渡された文字列が前に載せたものと同じなら画面を書き換えないこと（MUST） —— 範囲選択のあいだ下の絵の文字列は変わらないので、下の絵は載せ直されない。<br>⚠️ 重ねの絵は点を受けない —— 画面上の点がどの UI パーツの上かの答え（`IF-9`）は、重ねの有る無しで変わらない
```

<!-- EDIT id=E-02 file=docs/spec/05-07-design.md -->
表 T-075 の `UF-32` の `何をするか` の升の頭（3 節の旧の文）を次に替える。

```
`CP-19` の残り —— 下の絵の SVG を、表 T-020 の順に層を重ねて組み立てる。<br>`ZO-6` だけは下の絵に入れず、重ねの絵の SVG（表 T-065 の `IF-1`）に組み立てる。<br>層の並びと、どの層を重ねの絵に出すかを決めるのは本ユニットだけであり、兄弟は層ごとの文字列の列を返す
```

<!-- EDIT id=E-03 file=docs/spec/_source/published-entries.json -->
`PI-19`（`SvgRenderer`）の `members` の `svgFromSchedule` の後に 1 つ足し、`npm run gen` で `_assets/tbl-published-entries.md`・`docs/review/public-entry-index.md` を刷る。

```
{
 "name": "marqueeOverlaySvg",
 "note": {
  "ja": [
   "重ねの絵 —— 範囲選択の矩形（表 T-020 の `ZO-6`）だけを持つ SVG を返す。握っていなければ空の文字列。",
   "表 T-065 の `IF-1` が矩形を下の絵と別の口で載せると定めるので、`SingleHtmlShell` が下の絵（`svgFromSchedule`）と別に問う"
  ]
 }
}
```

<!-- EDIT id=E-04 file=docs/development-records/changelog.md -->
表の末尾に 1 行。版は当てるときの最大の次（調整役が振り直す）。

<!-- EDIT id=E-05 file=docs/development-records/perf-pending.md -->
10 節の行を、当てるときの最大の次の番号で足す。

---

## 5. 継ぎ目（コード）—— 当てる体への覚え

| ファイル | 変えるもの |
|---|---|
| `src/adapter/svg-renderer/svg-surface.ts` | `SvgSurface` に `showMarqueeOverlaySvg(svg: string): void` を足す |
| `src/adapter/svg-renderer/svg-renderer.ts` | `svgFromSchedule` から `marquee` を消し、`zoLayer('ZO-6', …)` を外す（`groundClipped` の中の層は `ZO-12` で終わる）。新しい純粋関数 `marqueeOverlaySvg(schedule, storedSettings, regions, viewer, marquee)` —— 同じ幅・高さ・`viewBox` の `<svg>`、X-3 の切り抜き、`zoLayer('ZO-6', [selectionFrameSvg(marquee, themed('S-151'), 'marquee')])`。色は `svgFromSchedule` と同じく `themedColors(themeHue, dark, monochrome)` から。`marquee` が `null` なら `''`。⚠️ 下の絵の `NO_TEXT_SELECTION_STYLE` と `role="img"` の扱いを重ねにも合わせるか、`aria-hidden` にするかを決めて揃える（下の絵と同じ属性で足りる） |
| `src/framework/dom-svg-surface/dom-svg-surface.ts` | `host` の子を 2 つ持つ: 下の絵と重ねの絵。下の絵を差し替えても重ねの絵を消さない（今の `host.innerHTML = svg` は子を全部消す）。重ねは `position:absolute; left:0; top:0; pointer-events:none`（`host` は `position:fixed`）。どちらも「前と同じ文字列なら書かない」。⚠️ TRAP の「`innerHTML` は `svgFromSchedule` のエスケープ済みの出力にだけ安全」に `marqueeOverlaySvg` を足す（数だけを書く）。⚠️ CSP の下で style が効くことを、試験ではなく開発ビルドの DOM で確かめる |
| `src/framework/single-html-shell/frame-loop.ts` | `runFrame` の `svgFromSchedule` の呼び出しから `marqueeRect(pressed, pointerAt)` を外し、その直後に重ねの絵を組んで、前と違うときだけ `showMarqueeOverlaySvg` を呼ぶ（X-5）。書き出し（`exportScene`）の `null` を 1 つ消す。⛔ `runFrame`・`frameLoop` は検査 60 の基準線の際にある —— 重ねの絵を組んで載せる所は、仕様の行（`IF-1`）を名乗る小さな関数に切り出し、どちらも伸ばさない（07 の `R2`） |
| `src/framework/single-html-shell/interaction-record.ts` | `recordFrame` が数える文字列を、下の絵と重ねの絵をつないだものにする（X-6）。呼ぶ側が渡す |
| `src/adapter/agent-api-endpoint/snapshot-source.ts` | 変えない —— `Parameters<typeof svgFromSchedule>[3]`・`[4]` を位置で読むが、消すのは 12 番目（0 から）なので位置は動かない。当てた後に `tsc` で確かめる |

⭐ 書き出し（`FR-080`、`IO-4`・`IO-6`・`IO-7`）は `svgFromSchedule` だけを呼ぶ —— 重ねの絵は書き出しに入らない。今と同じ（今も書き出しは `marquee` に `null` を渡す）。

---

## 6. グラフ（`impact.py IF-1 ZO-6 PI-19 PI-26`、`2bb7d3ce`）

- `IF-1`: 要求 0 件 / 参照 2 か所 —— `LM-19`（`01-04-requirements.md:230`、0.1 の 8 行目のとおり変えない）、表 T-075 の `UF-33`（`SvgSurface` の宣言、変えない）。
- `ZO-6`: 要求 2 件（`FR-081` の `SL-3`、`FR-110` の 表 T-020 の注）/ 参照 3 か所（ほかに 1.10 の `PP-7`）。どれも前後と握っているあいだだけ描くことを言い、どの SVG に描くかを言わない —— 変えない。
- `PI-19`・`PI-26`: 指す所 0。
- 「1 枚の SVG」と言う所を `grep` した: 仕様では `UF-32` の升だけ（E-02）。

---

## 7. 数の予測

| 数 | 前 → 後 |
|---|---|
| 表 T-064 の `PI-19` のメンバ | 12 → 13（検査 26b が読む全メンバは +1） |
| 表 T-065 の行 | 8 → 8 |
| `svgFromSchedule` の引数 | 15 → 14 |
| 範囲選択の 1 フレームで画面に書く字（大きな見本、`DFC-2314` の後の `svgFromSchedule` は 334,681 字） | 約 33 万字 → 重ねの絵の数百字（下の絵は書かない） |
| S2 の間隔の中央値（Chromium ／ Edge） | 19 ／ 22 ms → 約 7 ／ 約 9 ms（差し替え 4・構文解析 4・スタイル 3・ペイント 2 ms が消え、文字列 1〜2 ms が残る見込み —— プロファイルの 3 節の順 4 と付録 C） |
| S1・S3・S4 | 変わらない（対照） |

---

## 8. 波

| 波 | 持ち場 | 中身 |
|---|---|---|
| 0 | — | `CR-733` の着地を待つ（`frame-loop.ts` が重なる） |
| 1 | `05-07-design.md`・`published-entries.json` ＋ 生成物 ＋ 変更履歴 | E-01〜E-04、`npm run gen`、`strictdoc export docs/spec`、`rm -rf output` |
| 2 | `svg-surface.ts`・`svg-renderer.ts`・`dom-svg-surface.ts`・`frame-loop.ts`・`interaction-record.ts` ＋ 既存の試験の退かせ（9.1 節） ＋ `perf-pending.md`（E-05） | 5 節。検査 60 は基準線の内 |
| 3 | 仕様だけを読む試験の体（別の体） | 9.2 節 |
| 4 | 調整役 | `dist/index.html` を刷る（別のコミット）。9 節の測り |

---

## 9. 仕様の外で直すもの

### 9.1 旧のふるまいを言う既存の試験（当てる体が新しい行を指すように直す）

- `tests/contract/cr-430-t-020-the-order-things-are-drawn.test.ts`・`tests/unit/cr-430-cross-section-scene.ts`・`tests/contract/t-020-zo-layer-membership.test.ts` —— `ZO-6` を `svgFromSchedule` の 1 枚の中で `ZO-12` の後に探す。⇒ `ZO-6` は `marqueeOverlaySvg` の中に在り、下の絵には無いこと、重ねが下の絵の後（手前）に載ることを、`IF-1` を指して確かめる形にする。
- `tests/unit/cr-555-dependency-lines-are-elided.test.ts` —— 引数を位置で渡している（`watermark`・`tentativeLink`）。⇒ 1 つ前へ詰める。
- `tests/unit/t-023c-sl-3-marquee-drawn-while-held.test.ts` —— 口の差し替えが `showSvg` の文字列だけを `picture()` として読む。⇒ 下の絵と重ねの絵をつないだものを読む（`SL-3` の主張はそのまま）。
- `tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts` —— `[data-figure="marquee"]` を `Schedule Canvas` の子孫で探すので、重ねが `host` の中に在れば変えずに通る。

### 9.2 仕様だけを読む試験の体への 5 行

1. `IF-1`（表 T-065）だけを読み、`marqueeOverlaySvg` が `ZO-6` の層だけを持ち、握っていなければ空であること、下の絵（`svgFromSchedule`）が `ZO-6` を持たないことを確かめる。
2. 重ねの絵の幅・高さ・`viewBox` と切り抜きの箱が、同じ入力の下の絵と一致すること（`Task Group Area` の帯）。
3. シェル（`frameLoop` に 2 つの口を持つ差し替え）で範囲選択を握って動かすあいだ、`showSvg` に渡る文字列が変わらず、`showMarqueeOverlaySvg` だけが変わること。離すと重ねが空になること。
4. 開発ビルドの DOM: `Schedule Canvas` の中で重ねが下の絵の後に在り、点を受けない（`elementFromPoint` の答えが重ねの有る無しで同じ）。
5. 絵の恒等: 握ったままの状態の画面の撮影が、本書の前のビルドと 0 画素の違い（Chromium）。

---

## 10. 毎フレームの経路と測り待ちの行（E-05）

毎フレーム: はい —— `svg-renderer.ts`・`frame-loop.ts`（04 の 5 節の表）と `dom-svg-surface.ts`・`interaction-record.ts` に触れる。足す行（番号は当てるときの最大の次）:

```
| <次の番号> | `CR-736`（範囲選択の矩形 `ZO-6` を重ねの SVG へ（`IF-1` の口 `showMarqueeOverlaySvg`）。毎フレームの仕事: 下の絵の文字列は今までどおり毎フレーム組むが、前と同じなら画面を書き換えない。範囲選択のあいだは重ねの絵（矩形 1 つの小さな SVG）を、枠が動いたフレームだけ差し替える。範囲選択をしないフレームは文字列の比べが 1 回増えるだけ） | 合流の sha は調整役が書く | `src/adapter/svg-renderer/svg-renderer.ts` ／ `src/adapter/svg-renderer/svg-surface.ts` ／ `src/framework/dom-svg-surface/dom-svg-surface.ts` ／ `src/framework/single-html-shell/frame-loop.ts` ／ `src/framework/single-html-shell/interaction-record.ts` |
```

### 10.1 効き目を確かめる測り方（`PW-3`）

1. 前（本書の前の統合点）と後のビルドの写しを `vite build --minify false` で作業木の外に作る（プロファイルの付録 A の手順 1。外に置くのは `DFC-2312` のため）。
2. 錠の下で、付録 B の台本（`run-block.ps1`）で S1〜S4 を交互に 3 周、Chromium（Playwright）と Edge（`msedge`）の両方で測る。素の窓 8 s の間隔の中央値と p90、計装した窓の `showSvg`・構文解析・スタイル・ペイントの ms/フレーム。
3. 合格の読み: S2 の中央値が前より下がり（見込みは 7 節）、計装した窓で S2 の `showSvg` の自己時間と構文解析が 0 近く。S1・S3・S4 は前と揺れの幅（±4 %）の内。対照 S2g（S2 を、ガイドカーソルを `IC-47` で十字（`S-66` の `'crosshair'`）にして）は前と同じ —— X-1 の代償をそのまま測る。
4. 絵の恒等: `DFC-1132` の撮り方を `DFC-2314` で広げたもの（内蔵のテンプレートと大きな見本 × 窓 1920×1080・1280×720 × 画素比 1・2 × 状態 29、範囲選択を握ったままの状態を含む）で、画面の撮影が前と 0 画素の違い（Chromium）。Edge は前のビルドの撮り直しの揺れと比べる。⚠️ SVG を画像として描く比べは、下の絵だけでは矩形を持たないので、握ったままの状態は画面の撮影で比べる。
5. 記録: `GRS_PERF=1` の `tests/nfr` を 1 回（`PW-3` の ②）。合否は `PW-3` の ①（`tools/probe/examples/lm-19-frame-time-baseline.mjs`、段 0 と `JDG-726` の倍率で交互に 3 回ずつ）。緑なら `measurements/performance-runs.md` に 1 行と、本行を消す（`PW-4`）。

### 10.2 利用者が実物で確かめる手順（当てた後、調整役を通して —— `JDG-1340`）

1. 大きな見本を開き、何も無い所から範囲選択の枠を大きく引き回す。
2. 枠が指に遅れずに付いてくるか、離すと枠が消えて選択が残るかを見る。
3. 枠を目盛の帯まで引いたとき、目盛の上に枠が出ないこと（`JDG-365` のまま）を見る。
4. 記録すること: 手触り（前より軽いか）と、枠や絵のずれの有無。

---

## 11. 問い

利用者への問いは無い（絵も操作も変わらない）。調整役への問い 1 つ:

### 問い 1 —— 下の絵の覚え置き（`DFC-2302` の ②）を本書に入れるか

- 場面: 範囲選択（`Schedule Canvas` の何も無い所からドラッグ）のあいだ、本書の後も下の絵の文字列（約 33 万字）は毎フレーム組まれる。画面は書き換えない（文字列が同じなので）。残る仕事は 1〜2 ms/フレーム。
- (A) 入れない（**推奨**） —— 本書は ① だけ。当てて測り、S2 で文字列づくりが 2 ms を超えて残れば、別の CR で鍵を設計する。理由: 指の位置を鍵から外すには絵が指から読む 3 つを公開し、表 T-071 の `CA-1` に持ち越しを足す（`R2.20`）。漏れた鍵は古い絵を残す（`DFC-567`・`DFC-2301`）。得は約 2 ms。
- (B) 入れる —— `SvgRenderer` が「指から絵が読むもの」（ガイドカーソルの位置、指の下のダミーと掴み代の上のマーカー）を返す公開名を足し、シェルがそれと他の引数の同一性を鍵に `svgFromSchedule` を飛ばす。表 T-071 の `CA-1` に 1 行。見積もりは仕様 +1.5 時間・src +2 時間・試験 +2 時間。
- (C) 指の位置をそのまま鍵にして入れる —— 範囲選択のあいだ鍵が毎フレーム変わるので S2 には効かない。採らない。

---

## 12. 見積もり

| 持ち場 | 時間 | 中身 |
|---|---|---|
| 仕様 | 2 | E-01〜E-04、`npm run gen`、`strictdoc export`、`impact.py` の測り直し、`check.sh` |
| src | 5 | `svg-renderer.ts`（関数を 1 つ足して引数を 1 つ消す）1.5、`dom-svg-surface.ts`（子 2 つ、style と CSP、開発 DOM での確かめ）1.5、`frame-loop.ts`（切り出しで検査 60 の内、`CR-733` との合わせ）1.5、`interaction-record.ts` と `tsc`・試験の位置引数 0.5 |
| 試験 | 6 | 既存の 5 ファイルの退かせ 2（9.1 節）と、範囲選択を回す口の差し替えに `showMarqueeOverlaySvg` を足す 1（数は当てる体が数える）、仕様だけを読む試験 3（9.2 節。別の体） |
| 測り | 2 | 10.1 節（2 つのブラウザ × 4 場面 × 3 周 ＋ 恒等の撮影） |
| 計 | 15 | 問い 1 が (B) なら ＋ 5.5 |

---

## 13. ⛔ この変更でやらないこと

- 基準日線（`ZO-8`）・イナズマ線（`ZO-16`）・進捗マーカー（`ZO-3`）・仮の依存線（`ZO-11`）・透かし（`ZO-12`）を重ねに出さない（X-1）。
- 表 T-020 の行・順・注を変えない。`LM-19` を変えない。
- 下の絵の受け渡し（文字列）と、書き出しの道を変えない。
- `svgFromSchedule` を覚え置かない（X-2、問い 1）。

---

## 14. 測り方の再現

```
git grep -c "CR-736" 2bb7d3ce                                              # 0 件
git grep -n "marqueeOverlaySvg\|showMarqueeOverlaySvg" 2bb7d3ce            # 0 件
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py IF-1 ZO-6 PI-19 PI-26
grep -rl "showSvg" tests | wc -l                                           # 132
grep -rl "PTD-5" tests | wc -l                                            # 28
grep -n "zoLayer('ZO-6'\|marquee" src/adapter/svg-renderer/svg-renderer.ts
grep -n "svgFromSchedule(\|marqueeRect(pressed" src/framework/single-html-shell/frame-loop.ts
```
