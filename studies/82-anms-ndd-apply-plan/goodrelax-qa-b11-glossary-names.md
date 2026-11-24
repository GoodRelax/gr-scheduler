BGQA11

# 名の辞書（glossary.json）に残った名の食い違い —— 持ち主の裁定

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA11 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

作った日: 2026-11-25（SUB「CR-857 用語集の JSON（後任）」。BOSS（5 代目）の指示で BGQA11 を作った）
残 3（❓ で検索）

- 名の辞書: `docs/spec/_source/glossary.json`。GRS が画面・ファイル・Agent API に書く名を、1 語 1 行で持つ 1 本の JSON です（`CR-857`）。英語が正、日本語が副です。
- 下の語は、辞書がまだ古い名を持ち、持ち主が後の裁定で別の名を選んでいる語です。席は名を勝手に変えていません。ここで決まった名を辞書へ当て、仕様・画面・コードへは改名の手順（`CR-855`）が当てます。
- 書くのは本 GQA の SUB だけです。

***

## 決定事項

### [names] 名の食い違い

| 事 | 決めた事 | 拠り所 |
|:---|:---|:---|
| 遅延診断レポートの窓とアイコンの英語の名 | 辞書を `Delay Diagnosis Report Window`・`Delay Diagnosis`（キー `delayDiagnosisReportWindow`・`delayDiagnosisIcon`）にそろえた。日本語「遅延診断」は変わらない。窓の 9 つの列、`DelayDiagnosisReport`・`delayDiagnosisReportRows` も同じ綴りにそろえた | `JDG-3512`・`JDG-3698`（持ち主が派生の名もそろえると決めた。凍結した GRS JSON のβも `delayDiagnosisReportWindow`） |
| 前の名 `Refusal` を別の物に使い回している件（α の `Refusal` → `CommandRefusal`、前の `AgentRefusal` → `Refusal`。規則 07 の付録 A.2 に反する） | 本 GQA では問わない。Agent API の名の席が BGQA7 の問 26 で問う（`AgentRefusalReason` → `RefusalReason` は同じ BGQA7 の問 25） | Agent API の名 2 の席との取り決め（2026-11-25） |

***

## QA

### [names] 名の食い違い（❓ 2）

#### ❓ 問 1. 後の裁定が選んだ名へ、辞書の 37 語をそろえるか

場面: 辞書を作り直したとき、画面の語 800 について「持ち主がその名を選んだ裁定」を探しました。そのうち 40 語は、辞書の名と、持ち主が後の裁定で選んだ名が食い違っていました。2 語（遅延診断）は上の決定事項でそろえ、1 語（スケジュールフィルタの帯）は問 2 で問います。残る 37 語を下に並べます。「そろえる名」は、右の裁定の文から席が写した名です。裁定が窓やアイコンの名だけを決め、同じ物の別の語（ボタン・設定のキー）に及ぶ行は、そのことを「拠り所」に書きました。

キーは辞書の中の ID で、画面には出ません。キーも、そろえる名に合わせて改めます（古いキーは辞書の改名の履歴 `renames[]` に残します）。

| # | 辞書のキー（今） | 今の名（英 ／ 日） | そろえる名（英 ／ 日） | 拠り所 |
|:---|:---|:---|:---|:---|
| 1 | `baselineOutline` | Baseline Outline ／ 変更前予定輪郭 | Baseline Outline ／ 前回予定輪郭 | `JDG-3706` |
| 2 | `progressMark`（`U-5`） | Progress Mark ／ 進捗マーク | Progress Status Mark ／ 進捗ステータスマーク | `JDG-3742` |
| 3 | `groupGridLines`（`U-18`） | Group Grid Lines ／ グループ罫線 | Task Group Grid Lines ／ タスクグループ罫線 | `JDG-3745` |
| 4 | `collapseButton`（帯の ∧ のボタン） | Collapse Button ／ 折りたたむボタン | Retract Into Parent Button ／ 親へしまうボタン | `JDG-3658`・`JDG-3659`（∧ の札を Retract Into Parent ／ 親へしまうと決めた。ボタンの語はその札に「ボタン」を付けた） |
| 5 | `cursors`（`U-10`） | Cursors ／ カーソル | Cursor ／ カーソル | `JDG-3375`（名は単数にする） |
| 6 | `canvasOverlays`（`U-33`） | Canvas Overlays | 辞書から消す | `JDG-3362`（使われていない名なので消す） |
| 7 | `singleHtmlFormat`（`IO-7`） | Single HTML ／ 単一 HTML | GRS HTML ／ GRS HTML | `JDG-3353` |
| 8 | `baselineIcon`（`IC-4`） | Baseline ／ 変更前の予定 | Baseline ／ 前回予定 | `JDG-3434`・`JDG-3706` |
| 9 | `zoomToFitIcon`（`IC-10`） | Zoom to Fit ／ 全体を収める | Zoom to Fit ／ 全体表示 | `JDG-3376` |
| 10 | `documentSettingsIcon`（`IC-17`） | Document Settings ／ 文書の設定 | Document Settings ／ 文書設定 | `JDG-3365` |
| 11 | `endpointSpanIcon`（`IC-26`） | Endpoint Span ／ 端点スパン | Dumbbell ／ ダンベル | `JDG-3696`・`JDG-3711`（タスクの形の値 `dumbbell`。凍結した GRS JSON のβも `dumbbell`） |
| 12 | `shapeHeightOfEndpointSpan`（`K-16`） | `shapeHeightOf.endpointSpan` ／ 端点スパン | `shapeHeightOf.dumbbell` ／ ダンベル | `JDG-3696`（形の値の改名が、形ごとの縦幅の設定のキーに及ぶ） |
| 13 | `milestoneCircleIcon`（`IC-27`） | Milestone (Circle) ／ マイルストーン（〇） | Milestone (Circle) ／ マイルストーン（円） | `JDG-3703` |
| 14 | `milestoneDiamondIcon`（`IC-30`） | Milestone (Diamond) ／ マイルストーン（◇） | Milestone (Diamond) ／ マイルストーン（ひし形） | `JDG-3703` |
| 15 | `milestoneSquareIcon`（`IC-31`） | Milestone (Square) ／ マイルストーン（□） | Milestone (Square) ／ マイルストーン（正方形） | `JDG-3703` |
| 16 | `milestoneStarIcon`（`IC-32`） | Milestone (Star) ／ マイルストーン（☆） | Milestone (Star) ／ マイルストーン（星） | `JDG-3703` |
| 17 | `milestoneTriangleUpIcon`（`IC-33`） | Milestone (Triangle Up) ／ マイルストーン（△） | Milestone (Triangle Up) ／ マイルストーン（上向き三角） | `JDG-3703` |
| 18 | `milestoneTriangleDownIcon`（`IC-34`） | Milestone (Triangle Down) ／ マイルストーン（▽） | Milestone (Triangle Down) ／ マイルストーン（下向き三角） | `JDG-3703` |
| 19 | `milestoneBoxIcon`（`IC-84`） | Milestone (Box) ／ マイルストーン（ボックス） | Milestone (Box) ／ マイルストーン（箱） | `JDG-3703` |
| 20 | `milestoneFloppyDiskIcon`（`IC-85`） | Milestone (Floppy Disk) ／ マイルストーン（フロッピー） | Milestone (Floppy Disk) ／ マイルストーン（フロッピーディスク） | `JDG-3703` |
| 21 | `milestoneSmilingFaceIcon`（`IC-88`） | Milestone (Smiling Face) ／ マイルストーン（嬉しい顔） | Milestone (Smiling Face) ／ マイルストーン（笑顔） | `JDG-3703` |
| 22 | `calloutIcon`（`IC-35`。コメントボックスを構える） | Callout ／ コメントボックス | Comment Box ／ コメントボックス | `JDG-2250`・`JDG-3371`（英語はどこでも Comment Box） |
| 23 | `calloutsIcon`（`IC-119`。コメントボックスの表を出す） | Callouts ／ コメントボックス | Comment Box ／ コメントボックス | `JDG-2250`・`JDG-3371` |
| 24 | `armModeStateMachineCommentBoxArmed`（`AR-5`。コメントボックスを構えた状態） | Callout ／ コメントボックス | Comment Box ／ コメントボックス | `JDG-3371` |
| 25 | `progressMarkerIcon`（`IC-40`） | Progress Marker ／ 進捗マーカー | Progress Status Mark ／ 進捗ステータスマーク | `JDG-3742` |
| 26 | `watermarkIcon`（`IC-41`） | Watermark… ／ 透かしを非表示（パスワードが必要） | Hide the Watermark (Password Required) ／ 透かしを非表示（パスワードが必要） | `JDG-80`・`JDG-1865`（日本語は今のまま、英語を日本語に合わせる） |
| 27 | `groupGridLinesIcon`（`IC-43`） | Group Grid Lines ／ グループ罫線 | Task Group Grid Lines ／ タスクグループ罫線 | `JDG-3745` |
| 28 | `expandBelowIcon`（`IC-58`。帯の ∨∨） | Expand Below ／ 配下をすべて展開する | Expand Below ／ 配下を展開する | `JDG-3659`・`JDG-3687` |
| 29 | `collapseIcon`（`IC-59`。帯の ∧） | Collapse ／ 折りたたむ | Retract Into Parent ／ 親へしまう | `JDG-3658`・`JDG-3659` |
| 30 | `collapseBelowIcon`（`IC-77`。帯の ∧∧） | Collapse Below ／ 配下をすべて折りたたむ | Collapse Below ／ 配下を折りたたむ | `JDG-3659`・`JDG-3687` |
| 31 | `expandOneLevelIcon`（`IC-90`。帯の ∨） | Expand One Level ／ 1 階層だけ展開する | Expand One Level ／ 1 階層展開する | `JDG-3659`・`JDG-3687` |
| 32 | `expandAllIcon`（`IC-74`。パネルの頭の ∨∨） | Expand All ／ すべて展開する | Expand Below ／ 配下を展開する | `JDG-3688`（頭のボタンは帯のボタンを根で押したもの。根だけの札は付けない） |
| 33 | `collapseAllIcon`（`IC-78`。パネルの頭の ∧∧） | Collapse All ／ すべて折りたたむ | Collapse Below ／ 配下を折りたたむ | `JDG-3688` |
| 34 | `showTopLevelOnlyIcon`（`IC-92`。パネルの頭の ∨） | Show Top Level Only ／ 最も浅い段を 1 階層展開する | Expand One Level ／ 1 階層展開する | `JDG-3688` |
| 35 | `scheduleFilterIcon`（`IC-143`） | Schedule Filter ／ スケジュールフィルタ | Filter Schedule by Checks ／ チェックで日程表を絞る | `JDG-3728` |
| 36 | `commentBoxFillTransparencyPercentField`（`PR-27`。プロパティパネルの欄） | Fill Transparency (%) ／ 塗りの透過率（%） | Fill Opacity (%) ／ 塗りの不透明度（%） | `JDG-3526`（キーは `opacityPercent`、画面の語は「不透明度」。100 が透けない向きに変わる） |
| 37 | `highlightBoxFillTransparencyPercentField`（`PR-24`） | Fill Transparency (%) ／ 塗りの透過率（%） | Fill Opacity (%) ／ 塗りの不透明度（%） | `JDG-3526` |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | **37 語を「そろえる名」へそろえる。** 理由: どの行も持ち主が後の裁定で選んだ名を写しただけで、席が作った名は 4・12・36・37 の 4 行の派生（札に「ボタン」を付けた、値の改名をキーに写した、「透過率」を「不透明度」に替えた）だけです。辞書が古い名を持つままだと、仕様と画面を辞書から作る段で、古い名が画面へ戻ります |
| b | 表のうち、そろえたくない行の # を書く（その行は今の名のまま残し、席が理由を問い直す）。ほかの行は a と同じ |

回答:

#### ❓ 問 2. 「スケジュールフィルタの帯」の新しい名

場面: 担当リストで「佐藤」の行にチェックを入れ、表の上の「チェックで日程表を絞る」（`IC-143`、問 1 の 35 行目）を押すと、日程表は佐藤さんのタスクだけを描きます。そのあいだ、日程表の上に帯が出て、「担当リストで絞っています（3 件）」のように、絞っている表の名と件数を告げ、すべての絞りを解く語の入口「解除」を持ちます。この帯の名が今は `Schedule Filter Bar` ／ スケジュールフィルタバー（`U-67`）です。

持ち主は `JDG-3728` で、ボタンの名を「スケジュールフィルタ」から `Filter Schedule by Checks` ／ チェックで日程表を絞る に改めました。帯の名は決めていません。帯だけが古い語「スケジュールフィルタ」を持ち続けると、画面に 1 つの働きの名が 2 つ残ります。

| 案 | 英語の名 ／ 日本語の名 | 中身 |
|:---|:---|:---|
| **a（推奨）** | **`Filtered by Checks Bar` ／ チェックで絞り中バー** | 帯が告げる状態（チェックで絞っているあいだ）を名で言う。ボタンと同じ語「Checks ／ チェック」を使うので、ボタンと帯が 1 つの働きだと読める |
| b | `Filter Schedule by Checks Bar` ／ チェックで日程表を絞るバー | ボタンの名に「バー」を足す。働きの名とそろうが、動詞の句に「バー」が付いて長く、帯がボタンに見える |
| c | `Schedule Filter Bar` ／ スケジュールフィルタバー（今のまま） | 直す所が無い。`JDG-3728` が退けた語「スケジュールフィルタ」が帯にだけ残る |

回答:

***

## ❓ 自由

回答:
