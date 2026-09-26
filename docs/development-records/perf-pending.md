# 性能の測り待ち —— 毎フレームの経路に触れて着地し、まだ測っていない変更要求

**規則は [`docs/development-rules/04-verification.md`](../development-rules/04-verification.md) の 5 節（表 `PW`、`JDG-605`）。本書は置き場と書式だけを定める。**

⭐ **1 行 1 変更要求。** 着地した変更要求の差分が、04 の 5 節の「毎フレームの経路」の表のファイルに触れたら、ここに 1 行足す（`PW-2`）。
⭐ **測って緑なら、その行を消す** —— 消すのは、`measurements/performance-runs.md` に走行の 1 行を足したのと同じ commit である（`PW-4`）。
⛔ **赤なら消さない。** 利用者を呼ぶ（`PW-4` の ①）。
⚠️ 行を求める機械検査は `CR-573` の 5 節が足す（波 3b）。それまでは、着地させる者が手で足す。

## 一覧

⛔ 行の先頭の欄に行 ID を置かない —— 変更要求の番号は欄の 2 つ目に書く（行 ID の登録簿が、先頭の欄を行 ID として数えるため）。

| # | 変更要求 | 着地の sha | 触れた毎フレームの経路のファイル |
|---|---|---|---|
| 1 | `CR-570`（行の木の treeState、描く行・全体表示の倍率） | `879e9ff2` | `src/entity/layout-engine/schedule-layout/drawn-rows.ts`・`fit-zoom.ts`・`group-level-of-detail.ts`・`schedule-layout.ts`／`src/adapter/screen-renderer/row-title-panel.ts`・`screen-renderer.ts`／`src/framework/single-html-shell/frame-loop.ts` —— 規則が始まる前の着地だが、段 8 の測り（`main` の早送りの前）で一緒に測る |
| 2 | `CR-573`（生成器の変更で、読まれない定数の `export` が外れた） | `e873bcc6` | `src/adapter/svg-renderer/svg-renderer.ts` —— 2 つの定数の `export` が外れただけで、描く手順は変わらない。規則どおり測り待ちに載せる |
| 3 | `CR-555`（端の見えない依存線を「…」で省く。仕様の波 W1 —— 生成器が `svg-renderer.ts` の生成の区画と表示語を書き換えた。描く手順はコードの持ち場 L1 で変わる） | `58fb54ae` | `src/adapter/screen-renderer/display-words.json`・`src/adapter/svg-renderer/svg-renderer.ts`・`src/entity/layout-engine/item-hit-area/item-hit-area.ts`・`src/entity/layout-engine/schedule-layout/label-placement.ts` |
| 4 | `CR-584`（目盛のしきい値・書き出しの既定。仕様の波 W1 —— 生成器が既定値と表示語を書き換えた） | `58fb54ae` | `src/adapter/screen-renderer/display-words.json`・`src/entity/document-model/document-settings/document-settings.ts` |
| 5 | `CR-587`（行見出しの頭の操作子を 1 行に。仕様の波 W1 —— 生成器が表示語を書き換えた。並びはコードの持ち場 L5 で変わる） | `58fb54ae` | `src/adapter/screen-renderer/display-words.json` |
| 6 | `CR-572`（設定を文書の中身と見る人の好みに分ける。仕様の波 W2 —— 生成器が `SETTINGS_CONSTANTS`・`DrawnSettings` と表示語を刷った。`drawnSettingsOf` は毎フレーム。読み先の直しはコードの持ち場 L3） | `34261746` | `src/adapter/screen-renderer/display-words.json`・`src/entity/document-model/document-settings/document-settings.ts`・`src/adapter/svg-renderer/svg-renderer.ts`・`src/use-case/advance-screen-session/screen-values.ts` |
| 7 | `CR-557`（テーマの色相を文書の設定から選ぶ。仕様の波 W2 —— 生成器が表示語と大きさの群を書き換えた） | `34261746` | `src/adapter/screen-renderer/display-words.json`・`src/framework/dom-screen-surface/dom-screen-surface.ts` |
| 8 | `CR-585`（白黒で画面の罫線・パネルの地・強調色も灰色。仕様の波 W2。画面の主題は `showScreenView` ごとに作る —— コードの持ち場 L3） | `34261746` | `src/adapter/screen-renderer/display-words.json` |
| 9 | `CR-576`（基準日線を朱色、アイコンの説明、フェード 0 の端。仕様の波 W2 —— 生成器が色と大きさを書き換えた） | `34261746` | `src/adapter/screen-renderer/display-words.json`・`src/adapter/svg-renderer/svg-renderer.ts` |
