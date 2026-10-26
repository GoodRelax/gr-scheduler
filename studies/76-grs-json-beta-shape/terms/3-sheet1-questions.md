# 用語の裁定 —— 1 枚目 木のいちばん上と、2 枚目 区分の中の部品

2026-10-26 に作り、2026-10-27 に閉じた版です。用語は上から順に決めます（`JDG-3350`）。

*1 枚目の問いは全部決まりました（下の表と木）。*区分の中の部品も、このファイルの後ろに続けて書きます（利用者の指示）。木の日本語の名は、利用者が直接直したものを入れました。

- 🔄 *が付いた所が、この版で変わった所です。* 前の版の 🔄 は消してあります。木の中は、変わった行の頭に 🔄 を付けています。
- 前の版は `old/` にあります（ファイル名の末尾が日時）。
- 木の日本語のうち、今の用語集に無いもの（ブランド表示・ファイルの状態・ヘッダーのコマンド・スケジュールキャンバス・タスクグループレーンズ・派生出力など）は、席の仮の訳です。2 枚目以降で直す所があれば、そこで言ってください。

---

## 決まったこと

| 問 | 決め | 裁定 |
|---|---|---|
| 1 | 製品は文の中で `GRS` とだけ呼ぶ。正式名は定めの所だけ。`U-45` は用語集の頭の新しい段「0. 製品と文書」へ | `JDG-3351` |
| 2 | 語の定めは用語集の 1 か所だけ。本文の 表 T-005 の行は用語集へ移す | `JDG-3352` |
| 3 | `Schedule Document`（スケジュール文書）を立てる。データは `Schedule Data`（スケジュールデータ）。ファイルはいつも形式の名を付けて言い、単一 HTML は `GRS HTML`。`Picture` の日本語は「画像」 | `JDG-3353` |
| 3-4 | スケジュールデータを `MSPDI part`（MSPDI 由来の部分）と `GRS part`（GRS 独自の部分）に分けて呼ぶ。MSPDI のファイルは MSPDI part だけを持つ | `JDG-3354` |
| 4 | ヘッダーは `Project Title`（プロジェクトのタイトル）。[三] → プロパティパネルの「文書の基本情報」に `Project Name`（プロジェクト名）とほかの欄（ふるまいは `CR-856`） | `JDG-3355` |
| 5・6 | 窓のたぐいは Windows の用語に合わせ、名の末尾を `Window`・`Dialog` でそろえる。Holiday Settings は Tool Window にする（ふるまいは `CR-856`） | `JDG-3356` |
| 8 | 「日程表」「chart」は使わない | `JDG-3357` |
| 9 | 単独の「schedule」は書かない。「日程データ」は「スケジュールデータ」に直す | `JDG-3358` |
| 3（木の ★） | `Schema`（スキーマ）は派生出力ではない。ファイルの形式の木で、派生出力と並ぶ親に上げる | `JDG-3359` |
| 7 | 2 つのパネル（Task Group Panel・Properties Panel）は Schedule Canvas の外。Schedule Canvas は 2 つのパネルのあいだ | `JDG-3360` |
| 7-3 | タスクを描く区分は `Task Group Lanes`（タスクグループレーンズ）、その 1 行は `Task Group Lane`（タスクグループレーン）。データの `TaskGroup` の名はそのまま | `JDG-3361` |
| 7-4 | `Canvas Overlays` は用語集から消す。代わりに、マウスで操作する点と操作子の名を決める（2 枚目の最初の問い） | `JDG-3362` |
| 木の名 | 木の日本語の名を利用者が直した —— タスクグループタイトルツリー・タスク図形・マイルストーンマーク・ファイル保存ダイアログ・ファイルオープンダイアログ・差分確認ダイアログ・読込報告ダイアログ・確認メッセージ・通知領域。英語の Schema は `GRS JSON Schema`（GRS JSON スキーマ） | `JDG-3363` |
| 5-5 | `Save As Dialog` の日本語は「別名保存ダイアログ」。確認は `Confirmation Message`（確認メッセージ）。名の途中に助詞を挟まない | `JDG-3364` |
| 5-6 | 名の途中に「の」も挟まない。1 枚目の名は★の書き換えのとおり。★の無かったブラウザーウィンドウ・プロジェクトタイトル・ファイル状態は案の欄のとおりにした。回答欄の「A」は、問 5-5（`JDG-3364` で決まり済み）でなく問 5-6 への答えと読みました。違っていたら、ここに書いてください | `JDG-3365` |
| 10・10-2・11 | 掴む所は `Grab Point`（掴み点。点・角）と `Grab Area`（掴み領域。面・線）。印は `Handle`（ハンドル。選んでいるあいだだけ）と `Grip`（グリップ。いつも描く）。押せば掴める幅は `Grab Margin`（掴み代）。Copilot の案を採った | `JDG-3366` |
| 🔄 *12・12-2* | 🔄 *`Scrollbars` は `Scroll Track`（スクロール溝）と `Scroll Thumb`（スクロールつまみ）でできる* | 🔄 *`JDG-3367`* |
| 🔄 *13・13-2* | 🔄 *押すものは `Task Group Buttons`（5 つのボタン）。「操作子」と `Buttons` は使わない（問 13 の欄は空でしたが、13-2 の A から A と読みました）* | 🔄 *`JDG-3368`* |
| 🔄 *14・14-2* | 🔄 *`Interaction Cues`（操作合図）の 7 つと、`Jump Landing Marks`（ジャンプ先マーク）の 3 つ* | 🔄 *`JDG-3369`* |
| 🔄 *15* | 🔄 *ラベルだけ。総称 `Task Labels`（タスクラベル）。「札」は使わない* | 🔄 *`JDG-3370`* |
| 🔄 *16* | 🔄 *英語はどこでも `Comment Box`* | 🔄 *`JDG-3371`* |
| 🔄 *17* | 🔄 *小さな印は全部 `Mark` —— `Progress Mark`（進捗マーク）も。「マーカー」は使わない* | 🔄 *`JDG-3372`* |
| 🔄 *18* | 🔄 *行の無い絵の部品に行を足す。積み段と続きマークの名は問 18-3・18-4* | 🔄 *`JDG-3373`* |
| 🔄 *18-2* | 🔄 *置き場（レーン）と描く物（`Graphics`、図形）を分ける* | 🔄 *`JDG-3374`* |
| 🔄 *19* | 🔄 *a 伸ばす形 / b 名は単数 / c デュアルカーソル / d 実績ダミー* | 🔄 *`JDG-3375`* |
| 🔄 *20* | 🔄 *`Zoom to Fit`（全体表示）、`Fit Span`（全体表示期間）* | 🔄 *`JDG-3376`* |

---

## 全体の木（1 枚目の結論）

左から、英語の名・日本語の名・中身です。

**画面の木**

```text
   Browser Window                            ブラウザーウィンドウ          GRS の外。「ウィンドウ」だけでは呼ばない
   +- GRS                                    GRS                           ブラウザーの 1 つのタブ
      +- App Header                          アプリヘッダー                上の固定の帯
      |  +- Branding                         ブランド表示                  左端の「GRS」の字
      |  +- Project Title                    プロジェクトタイトル          project.title。押して直せる
      |  +- File Status                      ファイル状態
      |  |  +- Opened File Name              開いているファイル名
      |  |  +- File Saved At                 ファイル保存時刻
      |  +- Header Commands                  ヘッダーコマンド              [三] など
🔄    +- Schedule Filter Bar                 スケジュールフィルターバー    絞っているあいだだけ出る帯
      +- Task Group Panel                    タスクグループパネル          Panel。左。Schedule Canvas の外
      |  +- Task Group Title Tree            タスクグループタイトルツリー  ← タスクグループ見出しツリー
      +- Panel Divider                       パネル境界                    パネルと Schedule Canvas の境目。幅を変える
      +- Schedule Canvas                     スケジュールキャンバス        2 つのパネルのあいだ
      |  +- Time Ruler                       タイムルーラー                上の目盛の帯
      |  +- Task Group Lanes                 タスクグループレーンズ        タスクを描く区分（← Task Group Area）
      |  |  +- Task Group Lane               タスクグループレーン          タスクグループ 1 つで横 1 行（← Task Groups）
🔄    |  |  |  +- Stack Row                  積み段                        レーンの中の横の段（名は問 18-3）
🔄    |  |  +- Graphics                      図形                          Task Group Lanes に描く物の全部（2 枚目の木 B）
      |  |     +- Task Graphic               タスク図形                    そのタスクグループのタスク
      |  |        +- Plan Bar                予定バー
      |  |        +- Actual Bar              実績バー
      |  |        +- Milestone Mark          マイルストーンマーク
      |  +- Scrollbars                       スクロールバー
🔄    |  |  +- Scroll Track                  スクロール溝
🔄    |  |  +- Scroll Thumb                  スクロールつまみ
      |  +- Watermark                        透かし
      +- Properties Panel                    プロパティパネル              Panel。右。Schedule Canvas の外。[三] から文書の基本情報も
      +- Command Palette                     コマンドパレット              Palette。浮いて動かせる道具の帯
      +- Tool Window                         ツールウィンドウ              動かせて、開いたままほかを操作できる
      |  +- Help Window                      ヘルプウィンドウ              ← Help Modal
      |  +- Search Window                    検索ウィンドウ                ← Search Panel
      |  +- Resource List Window             担当リストウィンドウ          ← Resource List
      |  +- Delay Diagnostics Report Window  遅延診断レポートウィンドウ    ← Delay Diagnostics Report
      |  +- Holiday Settings Window          休日設定ウィンドウ            ← Holiday Settings
      +- Dialog                              ダイアログ                    閉じるまでほかを操作できない
      |  +- Save As Dialog                   別名保存ダイアログ            ← Export Chooser
      |  +- Open File Dialog                 ファイルオープンダイアログ    ← Open Chooser
      |  +- Watermark Unlock Dialog          透かし解除ダイアログ          ← Watermark Unlock
      |  +- Difference Review Dialog         差分確認ダイアログ            ← Difference Review
      |  +- Import Report Dialog             読込報告ダイアログ            ← Import Report
      |  +- Message Box                      メッセージボックス            短い問いと答えのボタンだけのダイアログ
      |     +- Confirmation Message          確認メッセージ
      +- Notification                        通知                          端に出て、しばらくして消える知らせ
      |  +- Notification Area                通知領域                      通知が立つ所
      +- Tooltip                             ツールチップ                  ポインターを乗せたときの説明
```

**スケジュール文書の木**

```text
   Schedule Document     スケジュール文書    GRS が開いて直す日程の文書
   +- Schedule Data      スケジュールデータ  GRS JSON の schedule
   |  +- MSPDI part      MSPDI 由来部分      Project・Calendar・Task・Resource・Assignment と Carried の値
   |  +- GRS part        GRS 独自部分        TaskGroup・TaskVisual・CommentBox・HighlightBox など
   +- Document Settings  文書設定            開くときの描き方（documentSettings）
   +- Document Stamp     文書スタンプ        最後の変更・保存・書いた人（documentStamp）
   +- Change Log         変更記録            changeLogEntries
```

**ファイルの形式**

```text
   Schedule Document Format  スケジュール文書形式    スケジュール文書を入れるファイルの形式
   +- GRS JSON               GRS JSON                全部を入れる（正の形式）
   +- GRS HTML               GRS HTML                GRS の本体 ＋ 全部（今の「単一 HTML」）
   +- MSPDI                  MSPDI                   スケジュールデータの MSPDI part だけ
   Derived Output            派生出力                スケジュール文書から作るだけの物（スケジュール文書ではない）
   +- Picture                画像                    SVG・PNG・クリップボード
   +- Report                 レポート                Markdown（遅延診断レポート）・TSV（修正の記録）
   GRS JSON Schema           GRS JSON スキーマ       スケジュール文書の形を定める（派生出力ではない）
```

---

## 区分の中の部品（2 枚目の部）

🔄 *2 枚目は、問 18-3・18-4 のほかは決まりました（決まったことの表と下の木）。木の名を直に書き換えてかまいません（★を付けてください）。*

- 数と場所の下調べは `4-sheet2-survey.md` にあります（用語集・画面の語・仕様書の文・GRS JSON の案・コードの 5 層）。ここでは数の大きい所だけを書きます。
- 問 5-6 の答え（`JDG-3365`）に合わせて、2 枚目の案の名からも「の」を抜きました（変わった行に印を付けています）。場面を説明する文の中の「の」はそのままです。
- 2 つの族に分けました。**A** はマウスで操作するもの（`JDG-3362` の「操作点と操作子」）、**B** はいつも描いてある絵の部品です。
- 回答: の後に A・B などの字か自由な文を書き、保存してから席に一声ください。
- 木の英語・日本語は、どれも席の案です。名を変えても、ふるまいは変えません（ふるまいが変わるものは `CR-856` へ回します）。

### 2 枚目の案の木

**A. マウスで操作するもの**

```text
   Grab Point                    掴み点                  点・角として掴める場所（バーの端・フェードの点・ボックスの角）
   +- Handle                     ハンドル                選んでいるあいだだけ描く、掴み点の印
      +- Fade Handle             フェードハンドル        ← フェードの掴み点
      +- Resize Handle           サイズ変更ハンドル      ハイライトボックスの角と辺の 8 つ
      +- Leader Anchor Handle    線先ハンドル            ← 線先の印
   Grab Area                     掴み領域                面・線として掴める場所（バーの本体・依存線・帯）
   +- Grip                       グリップ                いつも描いてある、掴み領域の掴み部分（← 掴み帯）
      +- Palette Grip            パレットグリップ        コマンドパレットの上端の帯
      +- Task Group Grip         タスクグループグリップ  タスクグループ名のすぐ前
   Grab Margin                   掴み代                  掴み点・掴み領域のまわりの、押せば掴める幅（表 T-266）
🔄 Scrollbars                    スクロールバー          （1 枚目で決めた）
🔄 +- Scroll Track               スクロール溝            ← 帯・コードの lane
🔄 +- Scroll Thumb               スクロールつまみ        ← つまみ
   Task Group Buttons            タスクグループボタン    タスクグループパネルの各行の押すもの（← 操作子）
   +- Collapse Button            折りたたむボタン        ← 隠す操作子
   +- Expand One Level Button    1 階層展開ボタン
   +- Collapse Below Button      配下折りたたみボタン
   +- Expand Below Button        配下展開ボタン
   +- Pin Button                 ピン止めボタン          ← Task Group Pin
🔄 Interaction Cues              操作合図                操作や選択のあいだだけ描き、押せない印
   +- Selection Frame            選択枠                  選んだ物を囲む枠
   +- Marquee Rectangle          範囲選択矩形            範囲選択で引いている矩形
   +- Tentative Dependency Line  仮依存線                構えて引いているあいだの依存線
   +- Dependency End Outline     依存線端囲み            選んだ依存線の両端のタスクの囲み
   +- Drop Line                  差し込み線              ← Task Group Drop Line
   +- Drag Copy                  ドラッグ中コピー        ← Task Group Grab Copy・写し
   +- Drop Cue                   ドロップ案内            今の U-68（「面」をやめる）
🔄 Jump Landing Marks            ジャンプ先マーク        飛んだあと、次に押すまで残る印
   +- Jump Landing Ring          ジャンプ先囲み          ← 飛んだ先の印の囲み
   +- Jump Related Ring          関係タスク囲み          ← Jump Landing Related Ring
   +- Jump Ripple                波紋                    ← Jump Landing Ripple
```

**B. いつも描いてある絵の部品**

```text
   Task Group Lanes                 タスクグループレーンズ  置き場（1 枚目で決めた）
🔄 +- Task Group Lane               タスクグループレーン    ← タスクグループの帯
🔄    +- Stack Row                  積み段                  1 つのレーンの中の横の段（名は問 18-3）
🔄 Graphics                         図形                    Task Group Lanes に GRS が描く物の全部
   +- Task Graphic                  タスク図形              1 つのレーンの 1 つの積み段に置く
   |  +- Plan Bar                   予定バー
   |  |  +- Fade Ramp               フェード斜面            ← フェードの台形
   |  +- Actual Bar                 実績バー
   |  +- Actual Dummy               実績ダミー              ← Actual Operation Dummy・実績操作のダミー
🔄 |  +- Milestone Mark             マイルストーンマーク
   |  +- Baseline Outline           変更前予定輪郭          ← 輪郭
   |  +- Plan-Actual Guide Line     予実補助線
🔄 |  +- Progress Mark              進捗マーク              ← Progress Marker・進捗マーカー
   |  +- Resume Mark                再開マーク              ← Resume Icon・再開アイコン
   |  |  +- Resume Dash Line        再開破線                停止日から再開マークへ
   |  +- Deadline Mark              期限マーク              ← 期限の印
   |  +- Task Labels                タスクラベル            ← 札・担当と進捗の札
   |     +- Name Label              名称ラベル
   |     +- Assignee Label          担当ラベル
   |     +- Percent Complete Label  完了率ラベル
   +- Dependency Line               依存線                  レーンをまたぐ（← Dependency Lines）
   |  +- Arrowhead                  矢じり
🔄 |  +- Continuation Mark          続きマーク              ← 続きの印（名は問 18-4）
   +- Annotation                    注記                    レーンをまたぐ（← Annotations）
   |  +- Comment Box                コメントボックス        ← 画面の en「Callout」
🔄 |  |  +- Leader Line             引出し線
🔄 |  |  +- Leader Anchor           線先
   |  +- Highlight Box              ハイライトボックス
   +- Progress Line                 イナズマ線
   +- Status Line                   基準日線
   +- Date Grid Lines               日付罫線
   +- Group Grid Lines              グループ罫線
```

---

## 🔄 *問 18-3. 積み段の英語 —— Row・Step・Line・Tier*

🔄 *★へのお答えです。積み段は、1 つのタスクグループレーンの中で、期間が重なるタスクを上下にずらして置く横の段です（仕様書の「段目」44）。罫線は引きません。*

| 🔄 *候補* | 🔄 *ぶつかる所* |
|---|---|
| 🔄 *Row* | 🔄 *表の「行」と同じ語。罫線の無い段には合わない（ご指摘のとおり）* |
| 🔄 *Step* | 🔄 *仕様書がもう 24 回使う（ズームの刻みなど）。階段・手順の意味が先に来る* |
| 🔄 *Line* | 🔄 *用語集で Line は描く線の名（Dependency Line・Progress Line・Status Line・Leader Line・Grid Lines）。描かない段に付けると、線と読まれる* |
| 🔄 *Tier* | 🔄 *仕様書とコードに 0 回。「上下に重ねた段の 1 つ」の意味で、ぶつかる語が無い* |

| 案 | 中身 |
|---|---|
| 🔄 ***A（推奨）*** | 🔄 *`Stack Tier`（積み段）* |
| 🔄 *B* | 🔄 *`Stack Step`（積み段）* |
| 🔄 *C* | 🔄 *`Stack Line`（積み段）* |

🔄 *推奨の理由: Tier は「重ねた段」をそのまま言い、ほかの名と取り違えません。日本語の「積み段」はどの案でも同じです。*

回答:

---

## 🔄 *問 18-4. 続きマークとは何か、その名*

🔄 *★へのお答えです。依存線の片方の端が今の見えている範囲の外にあるとき（たたんだタスクグループの中など）、GRS は見えている端から短い線を少しだけ引き、その先に点を 3 つ「…」と並べます（`EL-8`・`EL-9`）。この 3 つの点が続きマークです。押すと、線の先の端へ飛びます（`EL-10`〜`EL-12`）。依存線の一部です。*

| 案 | 中身 |
|---|---|
| 🔄 ***A（推奨）*** | 🔄 *`Continuation Mark`（続きマーク）—— 「線がこの先へ続く」という意味で名付ける* |
| 🔄 *B* | 🔄 *`Ellipsis Mark`（省略マーク）—— 形（…）と「途中を省いた」ことで名付ける。ご提案の omission mark に近い* |

🔄 *推奨の理由: ほかの印（期限マーク・再開マーク）は、形ではなく意味で名付けています。押すと続きへ飛ぶので、「続き」のほうが押したあとに起きることと合います。省略は「描かずに捨てた」と読まれるおそれがあります。*

回答:

---

## 自由欄

この紙が聞き漏らしたことがあれば、ここに書いてください。

回答:
