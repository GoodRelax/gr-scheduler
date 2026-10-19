# 見本 54 —— 読むだけの行の新しい語の英語（en）—— 確定（JDG-2234・JDG-2240）

`CR-754` の 11 節の問い 5（`DFC-2527`）の表。ja は見本 54 で利用者が認めた語（`JDG-2103`）。
en は辞書 `docs/spec/_source/display-words.json` の既存の語にそろえた案である。
2026-10-15 に答えの出た 3 語（表示する／表示しない・見えている範囲・非表示にした担当）は、答えのとおりに直してある（`JDG-2240`）。

⭐ **確定**（2026-10-15）: 利用者は「基本は表のとおりでOK」と答えた（`JDG-2234`）。下の表の「en 案」の列が en の語である。`CR-754` の X-12 が辞書に写す。

| 所 | ja | en（確定） | 根拠（そろえた既存の語） |
|---|---|---|---|
| 見出しの 1 行 | ここから下は読むだけ（このパネルでは変えられません） | Read-only from here down (cannot be changed in this panel) | `reasons` の "read-only"、`holidaySettings` の "cannot be edited here" |
| 群の名 1 | 表示の切り替え | Show or Hide | `icons` の hint "Show or hide …" |
| 群の名 2 | ラベル | Labels | `icons` の Assignee Label・Percent Complete Label |
| 群の名 3 | 見えている範囲 | View | 答え済み（2026-10-15）—— 位置・倍率・ピン止め・木の開閉をまとめて言う |
| 群の名 4 | 罫線と色 | Grid Lines and Color | `icons` の Date Grid Lines、`properties` の Color |
| 群の名 5 | 目盛と積む向き | Ruler and Stack Direction | `icons` の Stack Direction、設定の鍵 `rulerHeight` |
| 群の名 6 | 表の見え方 | Table Views | 設定の鍵 `tableViews` |
| 行の名（検索・担当・遅延 ×3） | スケジュールフィルタ | Schedule Filter | `icons` の Schedule Filter |
| 行の名（検索・遅延 ×2） | 非表示にしたタスク | Hidden Tasks | `searchPanel` の Hide、`rowMinHeightField` の "currently hidden" |
| 行の名（担当リスト） | 非表示にした担当 | Hidden Resources | 答え済み（2026-10-15）—— 担当リスト（Resource List）の語 |
| 行の名（担当リスト） | （担当なし）の行 | (Unassigned) Row | `resourceList` の (Unassigned) |
| 行の名（×3） | 列ごとのフィルタ | Column Filters | `icons` の hint "column filter"、Filter |
| 行の名（×3） | 並べ替え | Sort Order | `icons` の hint "filter and sort"、"original order" |
| 値（真偽） | 表示する | Shown | 答え済み（2026-10-15） |
| 値（真偽） | 表示しない | Hidden | 答え済み（2026-10-15） |
| 値（`baselineVisible`） | 重ねる | Overlaid | `icons` の Overlay as Baseline |
| 値（`baselineVisible`） | 重ねない | Not overlaid | `planActualStates` の "Not started" の形 |
| 値（`themeMonochrome`） | モノクロ | Monochrome | `icons` の Monochrome |
| 値（`themeMonochrome`） | カラー | Color | `properties` の Color |
| 値（スケジュールフィルタ） | 掛ける | On | `searchPanel` の "Schedule Filter on" |
| 値（スケジュールフィルタ） | 掛けない | Off | `icons` の hint "on or off" |
| 値（`stackDirection`） | 上へ積む | Stack up | `icons` の Stack Direction の hint |
| 値（`stackDirection`） | 下へ積む | Stack down | 同上 |
| 値（`levelZeroTreeState`） | 開く（自動） | Expanded (auto) | `icons` の Expand All、`reasons` の "already expanded" |
| 値（`levelZeroTreeState`） | 畳む | Collapsed | `icons` の Collapse |
| 値（日時が空） | 決めていない | Not set | 新しい語（Sentence case） |
| 値（`scrollGroupId` が空） | 決めていない（先頭から） | Not set (from the top) | `searchColumns` の "Path from Top" |
| 値（`scrollGroupOffset` が 0） | 先頭（0%） | Top (0%) | `searchColumns` の "Top" |
| 値（`scrollDayOffset`） | {time} ごろ（日の {percent}） | About {time} ({percent} of the day) | 新しい語 |
| 値（配列の件数） | {n} 件 | {n} | `timeZoneField`（en では件を書かない） |
| 値（`columnFilters` の数） | {n} 列 | {n} columns（1 のときは 1 column） | `dualCursorReadout` の単数と複数の形 |
| 値（`sort` が空） | 既定の並び | Default order | `icons` の hint "original order" |
| 値（`sort` 昇順） | {column} の昇順 | {column}, ascending | `icons` の "Sort by this column, ascending" |
| 値（`sort` 降順） | {column} の降順 | {column}, descending | `icons` の "Sort by this column, descending" |
| 単位（`FO-12` の欄の右） | 稼働日 | working days | `delayReportReasons` の "{days} working days late" |

表に入れていない語（既存のまま）: 小見出しの 検索パネル／担当リスト／遅延診断レポート、なし（None）、{n} px、名のある 23 行の名（設定の項目名）。

⚠️ 今の文書の設定の英語の項目名は、ほとんどが設定の鍵のまま（例 `planVisible`）。上の行の名を語にすると、英語の画面で「語の行」と「鍵のままの行」が混ざる。

## 表示の切り替えほかの真偽の行の名（`JDG-2241`）

利用者の答え「英語の慣習に従う。」（`JDG-2241`）: 鍵は `xxxVisible` のまま、画面の行の名は物の名とし、値と並べて「Plan: Shown」と読む。表示の切り替え（Show or Hide）の組と、同じく `xxxVisible` を持つラベル・罫線と色の組の行に、物の名を付ける（ja は替えない）。語は同じ物を指す入口の名（表 T-109）と目盛の行の語にそろえた。

| 組 | 鍵 | ja（今の辞書の語） | en（物の名） | 根拠（そろえた既存の語） |
|---|---|---|---|---|
| Show or Hide | `planVisible` | 予定の表示 | Plan | `hintLines` の `TL-5` |
| Show or Hide | `actualVisible` | 実績の表示 | Actual | `hintLines` の `TL-6` |
| Show or Hide | `progressMarkerVisible` | 進捗マーカー | Progress Marker | `icons` の `IC-40` |
| Show or Hide | `dependencyVisible` | 依存線 | Dependency Lines | `icons` の "Show Dependency Lines" |
| Show or Hide | `progressLineVisible` | イナズマ線 | Progress Line | `icons` の `IC-39` |
| Show or Hide | `baselineVisible` | 変更前の予定を重ねるか | Baseline | `icons` の `IC-4`（値は Overlaid ／ Not overlaid） |
| Labels | `assigneeVisible` | 担当ラベル | Assignee Label | `icons` の `IC-79` |
| Labels | `percentCompleteVisible` | 完了率ラベル | Percent Complete Label | `icons` の `IC-80` |
| Labels | `planDatesVisible` | 名称ラベルに添える予定日 | Planned Dates | `icons` の `IC-103` |
| Grid Lines and Color | `dateGridLinesVisible` | 日付罫線（日付ごとの縦線） | Date Grid Lines | `icons` の `IC-42` |
| Grid Lines and Color | `groupGridLinesVisible` | グループ罫線（TaskGroup 境界の横線） | Group Grid Lines | `icons` の `IC-43` |

ほかの鍵のままの行（`themeMonochrome`・`zoomX`・`rulerFont` など）を英語の慣習に合わせる見直しは、調整役が別の席に起こす（`JDG-2241`）。
