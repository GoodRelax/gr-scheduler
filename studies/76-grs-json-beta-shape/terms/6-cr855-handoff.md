# CR-855 への引き渡し —— 決まった用語の木と、直す語の数

2026-10-27、`cr851-review-apply-4` の席が書いた。用語の監査（`JDG-3349`・`JDG-3350`）の段 1・2・2.5 が終わり、利用者が語の裁定の紙を 2 枚とも閉じた。
段 3（仕様書の文）と段 4（コードの識別子）は `CR-855` の席が当てる。本書はその入口である。

## 1. 決まった木

木は 1 か所だけに置く —— `3-sheet1-questions.md` の「全体の木（1 枚目の結論）」（画面・スケジュール文書・ファイルの形式）と「2 枚目の木」（A マウスで操作するもの・B いつも描いてある絵の部品）。
中の名は全部決まった（決まったことの表の `JDG-3351`〜`JDG-3379`）。

| 裁定 | 中身 |
|---|---|
| `JDG-3351`〜`3363` | 製品・文書・窓のたぐい・画面の大きな区分（1 枚目） |
| `JDG-3364`・`3365` | 別名保存ダイアログ・確認メッセージ、名の途中に助詞（「の」も）を挟まない |
| `JDG-3366` | 掴み点・掴み領域・ハンドル・グリップ・掴み代 |
| `JDG-3367`・`3379` | スクロールバー = スクロールトラック ＋ スクロールつまみ |
| `JDG-3368` | タスクグループボタン（5 つ）。操作子を使わない |
| `JDG-3369` | 操作合図（7）とジャンプ先マーク（3）、`data-role` の名 |
| `JDG-3370`・`3371` | ラベル（札を使わない）、Comment Box（Callout を使わない） |
| `JDG-3372`・`3378` | 小さな印は全部 Mark（進捗マーク・再開マーク・期限マーク・続きマーク） |
| `JDG-3373`・`3374`・`3377` | 行の無い絵の部品の行、置き場と図形（Graphics）を分ける、積み段（Stack Tier） |
| `JDG-3375` | 長音は伸ばす形、名は単数、デュアルカーソル、実績ダミー |
| `JDG-3376` | 全体表示（Zoom to Fit）、全体表示期間（Fit Span） |

## 2. 直す語の数（引退する語）

数え方: scratchpad の `rename_counts.py`。仕様書（`docs/spec/*.md` と `docs/spec/_assets/*.md`。用語集を含む）、画面の語（`src/adapter/screen-renderer/display-words.json`）、コード（`src/**/*.ts` の全文）で、古い語の字面を大文字小文字を区別して数えた（`|` は「どれか」、`(?!ー)` は伸ばさない形だけ）。
文の中の当たりを全部数えたので、別の意味の当たりも混ざる（「札」はボタンの名の意味を含む、「つまみ」「写し」は別の文脈を含む）。直すときは 1 つずつ読むこと。
コードは英語なので、日本語の語は 0 になる。コードの識別子の名（`lane`・`percentLabel`・`markerParts`・`GrabStrip` など）の数は `4-sheet2-survey.md` と `5-display-words-tree.md` が持つ。


| 古い語 | 新しい語 | 裁定 | 仕様書 | 画面 | コード |
|---|---|---|---:|---:|---:|
| 本ソフトウェア・本ツール・本製品 | GRS | `JDG-3351` | 46 | 0 | 0 |
| 単一 HTML | GRS HTML | `JDG-3353` | 8 | 1 | 0 |
| 日程データ | スケジュールデータ | `JDG-3358` | 87 | 0 | 0 |
| 日程表 | （使わない。Schedule Canvas か Task Group Lanes） | `JDG-3357` | 131 | 11 | 0 |
| \b[Cc]hart\b | （使わない） | `JDG-3357` | 0 | 2 | 9 |
| Document Title | Project Title | `JDG-3355` | 43 | 0 | 4 |
| Help Modal | Help Window | `JDG-3356` | 13 | 1 | 7 |
| Search Panel | Search Window | `JDG-3356` | 29 | 2 | 9 |
| Export Chooser | Save As Dialog（別名保存ダイアログ） | `JDG-3356・3364` | 6 | 1 | 2 |
| Open Chooser | Open File Dialog | `JDG-3356` | 13 | 1 | 2 |
| Task Group Area | Task Group Lanes | `JDG-3361` | 107 | 0 | 8 |
| Canvas Overlays | （消す） | `JDG-3362` | 3 | 0 | 0 |
| タスクグループ見出しツリー | タスクグループタイトルツリー | `JDG-3363` | 1 | 0 | 0 |
| 掴み帯 | Grip（グリップ） | `JDG-3366` | 29 | 0 | 0 |
| 操作点 | Grab Point（掴み点） | `JDG-3366` | 0 | 0 | 0 |
| Grab Region | Grab Area（掴み領域） | `JDG-3366` | 2 | 0 | 0 |
| つまみ | Scroll Thumb（スクロールつまみ） | `JDG-3367` | 14 | 0 | 0 |
| 操作子 | Task Group Buttons（各ボタンの名） | `JDG-3368` | 166 | 0 | 0 |
| Task Group Expander | Collapse / Expand ... Button | `JDG-3368` | 3 | 0 | 1 |
| Task Group Pin | Pin Button | `JDG-3368` | 5 | 0 | 1 |
| Task Group Drop Line | Drop Line | `JDG-3369` | 0 | 0 | 1 |
| Task Group Grab Copy | Drag Copy | `JDG-3369` | 0 | 0 | 1 |
| Task Group Grab Cues | （Interaction Cues の子に分ける） | `JDG-3369` | 0 | 0 | 1 |
| Jump Landing Related Ring | Jump Related Ring | `JDG-3369` | 0 | 0 | 1 |
| Jump Landing Ripple | Jump Ripple | `JDG-3369` | 0 | 0 | 1 |
| 写し | コピー | `JDG-3369` | 53 | 0 | 0 |
| 札 | ラベル（ボタンの名の意味なら「ボタンの名」） | `JDG-3370` | 128 | 1 | 0 |
| Callout | Comment Box | `JDG-3371` | 0 | 5 | 0 |
| 進捗マーカー | 進捗マーク | `JDG-3372` | 155 | 4 | 0 |
| Progress Marker | Progress Mark | `JDG-3372` | 6 | 3 | 0 |
| 再開アイコン | 再開マーク | `JDG-3372` | 68 | 6 | 0 |
| Resume Icon | Resume Mark | `JDG-3372` | 2 | 1 | 0 |
| 期限の印 | 期限マーク | `JDG-3372` | 25 | 0 | 0 |
| 続きの印 | 続きマーク | `JDG-3372・3378` | 49 | 0 | 0 |
| ポインタ(?!ー) | ポインター | `JDG-3375` | 263 | 1 | 0 |
| ブラウザ(?!ー) | ブラウザー | `JDG-3375` | 157 | 10 | 0 |
| フィルタ(?!ー) | フィルター | `JDG-3375` | 261 | 12 | 0 |
| 2 連カーソル | デュアルカーソル | `JDG-3375` | 2 | 0 | 0 |
| 実績操作のダミー・実績のダミー | 実績ダミー | `JDG-3375` | 16 | 0 | 0 |
| Actual Operation Dummy | Actual Dummy | `JDG-3375` | 2 | 0 | 0 |
| Comment Boxes | Comment Box（単数） | `JDG-3375` | 2 | 0 | 0 |
| Dependency Lines | Dependency Line（単数） | `JDG-3375` | 3 | 3 | 0 |
| 全体を収める | 全体表示 | `JDG-3376` | 10 | 1 | 0 |
| 積み順の段・段目 | 積み段（Stack Tier） | `JDG-3377` | 45 | 2 | 0 |
| ヘッダーのコマンド・休日の設定ウィンドウ・文書の設定・文書の刻印・変更の記録 | 「の」を抜いた名 | `JDG-3365` | 82 | 3 | 0 |
| **計** | | | 2035 | 71 | 48 |

## 3. 食い違いの数（段ごと）

| 段 | 本書 | 数 |
|---|---|---|
| 1 用語集の木 | `1-glossary-tree.md`・`1-glossary-terms.tsv` | 用語集の行 382 |
| 2 GRS JSON と MSPDI | `2-json-mspdi-tree.md`・`2-json-mspdi-map.tsv` | 526 行 |
| 2.5 画面の語 | `5-display-words-tree.md`・`5-display-words-map.tsv` | 語の行 660 —— match 294・alias 160・missing 103・clash 57・pending 46（pending は 2 枚目の答えで決まった） |
| 部品の下調べ | `4-sheet2-survey.md` | A・B の部品の 5 層の数 |

## 4. CR-855 で気をつけること

- 名の付け替えだけでふるまいは変えない。ふるまいが変わる裁定は `CR-856` に回した（`JDG-3355` プロジェクト名をプロパティパネルで直す、`JDG-3356` 休日設定をツールウィンドウにする）。2 枚目からは増えていない。
- GRS JSON と Agent API に出る語は `CR-851` が β の前に当てる（`JDG-3349`）。`CR-855` は画面の語・仕様書の文・コードの識別子を受け持つ。
- コードの `lane` は 3 つの物を指す —— 積み段（`Stack Tier`、`JDG-3377`）、スクロールトラック（`JDG-3367`）、依存線の通り道（`dependency-route.ts`、名は決めていない）。`Task Group Lane` とぶつけないこと。
- コードの依存線は `link`（`links.linkParts`）で、`overlays.linkParts` は別の層（基準日線・カーソル）を指す（`4-sheet2-survey.md` の B のほころび 7）。名は裁定していない —— 段 4 で利用者に問うこと。
- 仕様書の食い違い 2 つは台帳にある（`DFC-3582` は `CR-856`、`DFC-3583` は裁定待ち）。
