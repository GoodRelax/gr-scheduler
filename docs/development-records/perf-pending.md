# 性能の測り待ち —— 毎フレームの経路に触れて着地し、まだ測っていない変更要求

**規則は [`docs/development-rules/04-verification.md`](../development-rules/04-verification.md) の 5 節（表 `PW`、`JDG-605`）。本書は置き場と書式だけを定める。**

⭐ **1 行 1 変更要求。** 着地した変更要求の差分が、04 の 5 節の「毎フレームの経路」の表のファイルに触れたら、ここに 1 行足す（`PW-2`）。
⭐ **測って緑なら、その行を消す** —— 消すのは、`measurements/performance-runs.md` に走行の 1 行を足したのと同じ commit である（`PW-4`）。
⛔ **赤なら消さない。** 利用者を呼ぶ（`PW-4` の ①）。
⚠️ 行を求める機械検査は `CR-573` の 5 節が足す（波 3b）。それまでは、着地させる者が手で足す。
⭐ 合否は `JDG-726` の同じ量の絵での段 0 との比べである（04 の `PW-3` の ①）。`tests/nfr` の絶対値の門は記録であって合否ではない（`PND-443`）。

## 一覧

⛔ 行の先頭の欄に行 ID を置かない —— 変更要求の番号は欄の 2 つ目に書く（行 ID の登録簿が、先頭の欄を行 ID として数えるため）。

| # | 変更要求 | 着地の sha | 触れた毎フレームの経路のファイル |
|---|---|---|---|
| 1 | `CR-570`（行の木の treeState、描く行・全体表示の倍率） | `879e9ff2` | `src/entity/layout-engine/schedule-layout/drawn-rows.ts`・`fit-zoom.ts`・`group-level-of-detail.ts`・`schedule-layout.ts`／`src/adapter/screen-renderer/row-title-panel.ts`・`screen-renderer.ts`／`src/framework/single-html-shell/frame-loop.ts` —— 規則が始まる前の着地だが、段 8 の測り（`main` の早送りの前）で一緒に測る |
| 2 | `CR-573`（生成器の変更で、読まれない定数の `export` が外れた） | `e873bcc6` | `src/adapter/svg-renderer/svg-renderer.ts` —— 2 つの定数の `export` が外れただけで、描く手順は変わらない。規則どおり測り待ちに載せる |
| 3 | `CR-555`（端の見えない依存線を「…」で省く。仕様の波 W1 —— 生成器が `svg-renderer.ts` の生成の区画と表示語を書き換えた。描く手順はコードの持ち場 L1 で変わる） | `58fb54ae` | `src/adapter/screen-renderer/display-words.json`・`src/adapter/svg-renderer/svg-renderer.ts`・`src/entity/layout-engine/item-hit-area/item-hit-area.ts`・`src/entity/layout-engine/schedule-layout/label-placement.ts` |
| 4 | `CR-584`（目盛のしきい値・書き出しの既定。仕様の波 W1 —— 生成器が既定値と表示語を書き換えた） | `58fb54ae` | `src/adapter/screen-renderer/display-words.json`・`src/entity/document-model/document-settings/document-settings.ts` |
| 5 | `CR-587`（行見出しの頭の操作子を 1 行に。仕様の波 W1 —— 生成器が表示語を書き換えた。並びはコードの持ち場 L5 で変わる） | `58fb54ae`・L5 の `71cca017`・`1c5722a8` | `src/adapter/screen-renderer/display-words.json`／L5: `src/framework/dom-screen-surface/row-title-panel-drawing.ts`・`dom-screen-surface.ts`（`changed('rowTitlePanel')` の枝。頭の 5 つの `style` の書き込みは 5 つのまま、2 段目の `top` が消えただけ） |
| 6 | `CR-572`（設定を文書の中身と見る人の好みに分ける。仕様の波 W2 —— 生成器が `SETTINGS_CONSTANTS`・`DrawnSettings` と表示語を刷った。`drawnSettingsOf` は毎フレーム。読み先の直しはコードの持ち場 L3） | `34261746` | `src/adapter/screen-renderer/display-words.json`・`src/entity/document-model/document-settings/document-settings.ts`・`src/adapter/svg-renderer/svg-renderer.ts`・`src/use-case/advance-screen-session/screen-values.ts` |
| 7 | `CR-557`（テーマの色相を文書の設定から選ぶ。仕様の波 W2 —— 生成器が表示語と大きさの群を書き換えた。コードは枝 `lane-l3` —— 文書の設定の面を出しているフレームだけ、色相の升 10 個の塗りを解く） | `34261746`・`lane-l3` の `CR-557` のコミット | `src/adapter/screen-renderer/display-words.json`・`src/framework/dom-screen-surface/dom-screen-surface.ts`・`src/adapter/screen-renderer/properties-panel.ts`・`src/framework/dom-screen-surface/properties-panel-drawing.ts` |
| 8 | `CR-585`（白黒で画面の罫線・パネルの地・強調色も灰色。仕様の波 W2。画面の主題は `showScreenView` ごとに作る —— コードの持ち場 L3） | `34261746`・`lane-l3` の `CR-585` のコミット | `src/adapter/screen-renderer/display-words.json`・`src/framework/dom-screen-surface/dom-screen-surface.ts`（`themeStyle`・`pageGroundStyle` —— モノクロのときだけ ○ の行ごとに `achromatic` を 1 回）・`src/framework/single-html-shell/single-html-shell.ts`（`heldTheme`） |
| 9 | `CR-576`（基準日線を朱色、アイコンの説明、フェード 0 の端。仕様の波 W2 —— 生成器が色と大きさを書き換えた） | `34261746` | `src/adapter/screen-renderer/display-words.json`・`src/adapter/svg-renderer/svg-renderer.ts` |
| 10 | `CR-558`（ハイライトボックスの掴み点・線の太さ・塗り。仕様の波 W3 —— 生成器が表示語と大きさの群を書き換えた。描く手順はコードの持ち場 L2） | `e4011375` | `src/adapter/screen-renderer/display-words.json`・`src/adapter/svg-renderer/svg-renderer.ts`・`src/entity/layout-engine/item-hit-area/item-hit-area.ts` |
| 11 | `CR-556`（期限を緑の下向きの矢印で。仕様の波 W3 —— 生成器が色と期限の印の大きさの群を刷った。描く手順はコードの持ち場 L1） | `e4011375` | `src/adapter/screen-renderer/display-words.json`・`src/entity/layout-engine/schedule-geometry/task-figures.ts`・`src/entity/layout-engine/schedule-layout/schedule-layout.ts` |
| 12 | `CR-559`（コメントボックスの引き出し線の端と箱の書式。仕様の波 W3。描く手順はコードの持ち場 L2） | `e4011375` | `src/adapter/screen-renderer/display-words.json` |
| 13 | `CR-560`（`Ctrl` で引けば写す。仕様の波 W3。押しの振り分けはコードの持ち場 L2） | `e4011375` | `src/adapter/screen-renderer/display-words.json` |
| 14 | `CR-575`（画面の層の順の表、パレットは掴めるまま。仕様の波 W4a。層の順はコードの持ち場 L4） | `d2a4e6b0` | `src/adapter/screen-renderer/display-words.json` |
| 15 | `CR-588`（変更前の予定の輪郭。仕様の波 W4a —— 生成器が色と輪郭の大きさの群を刷った。描く手順はコードの持ち場 L1） | `d2a4e6b0` | `src/adapter/screen-renderer/display-words.json`・`src/adapter/svg-renderer/svg-renderer.ts` |
| 16 | `CR-571`（検索パネル。仕様の波 W4a —— 生成器がパネルの大きさの群とユニットの雛形を作った。描く手順はコードの持ち場 L4） | `d2a4e6b0` | `src/adapter/screen-renderer/display-words.json`・`src/framework/dom-screen-surface/dom-screen-surface.ts`・`src/framework/dom-screen-surface/search-panel-drawing.ts` |
| 17 | `CR-574`（ヘルプを普通の窓に。仕様の波 W4a。描く手順はコードの持ち場 L4） | `d2a4e6b0` | `src/adapter/screen-renderer/display-words.json`・`src/framework/dom-screen-surface/dom-screen-surface.ts` |
| 18 | `CR-562`（画像から GRS JSON を作るプロンプト。仕様の波 W4b —— 生成器が表示語とパレットの区画を書き換えた） | `c891b6ca` | `src/adapter/screen-renderer/command-palette.ts`・`src/adapter/screen-renderer/display-words.json` |
| 19 | `CR-561`（遅延診断。仕様の波 W4b —— 生成器が色と印の大きさの群とユニットの雛形を作った。描く手順はコードの持ち場 L1） | `c891b6ca` | `src/adapter/screen-renderer/command-palette.ts`・`src/adapter/svg-renderer/svg-renderer.ts`・`src/entity/layout-engine/schedule-geometry/task-figures.ts` |
| 20 | `CR-563`（MCP と読むだけの行の削除。仕様の波 W4b —— 生成器がパレットの区画を書き換えた） | `c891b6ca` | `src/adapter/screen-renderer/command-palette.ts` |
| 21 | `CR-589`（表 T-109 の切り替える設定値の列。仕様の波 W4b —— 生成器がパレットと頭の帯の区画を書き換えた） | `c891b6ca` | `src/adapter/screen-renderer/command-palette.ts`・`src/adapter/screen-renderer/app-header-items.ts` |
| 22 | `CR-577`（床より下の行の軸の拡大。仕様の波 W5。行ズームの入力だけ —— コードの持ち場 L3） | `99ac819c`・`lane-l3` の `CR-577` のコミット | `src/adapter/screen-renderer/display-words.json`・`src/adapter/input-command-translator/zoom-and-fit.ts`（押したときだけ。毎フレームではない） |
| 23 | `CR-582`（行の最小高さ。仕様の波 W5 —— 生成器が大きさの群と表示語を書き換えた。描く手順はコードの段 A と持ち場 L3） | `99ac819c` | `src/adapter/screen-renderer/display-words.json`・`src/framework/dom-screen-surface/dom-screen-surface.ts` |
| 24 | `CR-586`（取り込んだマイルストーンと行の色。仕様の波 W5） | `99ac819c` | `src/adapter/screen-renderer/display-words.json` |
| 25 | `CR-583`（マイルストーンの形。仕様の波 W5 —— 生成器が `milestone-shapes.json` を刷った。描く手順はコードの持ち場 L1） | `99ac819c` | `src/adapter/screen-renderer/display-words.json`・`src/entity/layout-engine/schedule-geometry/milestone-shapes.json` |
| 26 | `DFC-1130`（`IN-7` に合わせる、`JDG-728`。変更要求ではない） | ブランチ `dfc-1130-in7`（合流の sha は調整役が書く） | `src/framework/dom-screen-surface/dom-screen-surface.ts` —— 描き直しの呼び出しの中で、ツールチップの層を作り直す条件を狭めた（描画。調整役の読み）。次の束で `PW-3` の ① を測る |
| 27 | `CR-592`（モノクロで表 T-236 のすべての行を灰にする。仕様とコードは枝 `lane-l3` —— モノクロのあいだだけ、— の行も色 1 つごとに `achromatic` を 1 回） | `lane-l3` の `CR-592` のコミット | `src/adapter/svg-renderer/svg-renderer.ts`（`colourOf`）・`src/framework/dom-screen-surface/dom-screen-surface.ts`（`themeStyle`・`pageGroundStyle`） |
