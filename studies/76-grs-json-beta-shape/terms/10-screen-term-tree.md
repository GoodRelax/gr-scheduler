# GRS の画面の用語の木

2026-10-28 に、用語の裁定の紙（`3-sheet1-questions.md`。閉じた紙）の木から書き出した。裁定は `JDG-3351`〜`JDG-3379`（`docs/development-records/rulings.md`）。左から、英語の名・日本語の名・備考（`←` の右は今までの名）。

- 1 は画面の大きな区分（1 枚目）。2 と 3 は区分の中の部品（2 枚目）で、3 は `Task Group Lanes` に描く物。
- 名の途中に助詞を挟まない（`JDG-3364`・`JDG-3365`）。長音は伸ばす形（`JDG-3375`）。仕様書の文とコードの名への当て方は `6-cr855-handoff.md`。

## 1. 画面の大きな区分

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
   +- Schedule Filter Bar                 スケジュールフィルターバー    絞っているあいだだけ出る帯
   +- Task Group Panel                    タスクグループパネル          Panel。左。Schedule Canvas の外
   |  +- Task Group Title Tree            タスクグループタイトルツリー  ← タスクグループ見出しツリー
   +- Panel Divider                       パネル境界                    パネルと Schedule Canvas の境目。幅を変える
   +- Schedule Canvas                     スケジュールキャンバス        2 つのパネルのあいだ
   |  +- Time Ruler                       タイムルーラー                上の目盛の帯
   |  +- Task Group Lanes                 タスクグループレーンズ        タスクを描く区分（← Task Group Area）
   |  |  +- Task Group Lane               タスクグループレーン          タスクグループ 1 つで横 1 行（← Task Groups）
   |  |  |  +- Stack Tier                 積み段                        レーンの中の横の段（← 積み順の段・コードの lane）
   |  |  +- Graphics                      図形                          Task Group Lanes に描く物の全部（2 枚目の木 B）
   |  |     +- Task Graphic               タスク図形                    そのタスクグループのタスク
   |  |        +- Plan Bar                予定バー
   |  |        +- Actual Bar              実績バー
   |  |        +- Milestone Mark          マイルストーンマーク
   |  +- Scrollbars                       スクロールバー
   |  |  +- Scroll Track                  スクロールトラック
   |  |  +- Scroll Thumb                  スクロールつまみ
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

## 2. マウスで操作するもの

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
Scrollbars                    スクロールバー          （1 枚目で決めた）
+- Scroll Track               スクロールトラック      ← 帯・コードの lane
+- Scroll Thumb               スクロールつまみ        ← つまみ
Task Group Buttons            タスクグループボタン    タスクグループパネルの各行の押すもの（← 操作子）
+- Collapse Button            折りたたむボタン        ← 隠す操作子
+- Expand One Level Button    1 階層展開ボタン
+- Collapse Below Button      配下折りたたみボタン
+- Expand Below Button        配下展開ボタン
+- Pin Button                 ピン止めボタン          ← Task Group Pin
Interaction Cues              操作合図                操作や選択のあいだだけ描き、押せない印
+- Selection Frame            選択枠                  選んだ物を囲む枠
+- Marquee Rectangle          範囲選択矩形            範囲選択で引いている矩形
+- Tentative Dependency Line  仮依存線                構えて引いているあいだの依存線
+- Dependency End Outline     依存線端囲み            選んだ依存線の両端のタスクの囲み
+- Drop Line                  差し込み線              ← Task Group Drop Line
+- Drag Copy                  ドラッグ中コピー        ← Task Group Grab Copy・写し
+- Drop Cue                   ドロップ案内            今の U-68（「面」をやめる）
Jump Landing Marks            ジャンプ先マーク        飛んだあと、次に押すまで残る印
+- Jump Landing Ring          ジャンプ先囲み          ← 飛んだ先の印の囲み
+- Jump Related Ring          関係タスク囲み          ← Jump Landing Related Ring
+- Jump Ripple                波紋                    ← Jump Landing Ripple
```

## 3. いつも描いてある絵の部品（`Task Group Lanes` の中）

```text
Task Group Lanes                 タスクグループレーンズ  置き場（1 枚目で決めた）
+- Task Group Lane               タスクグループレーン    ← タスクグループの帯
   +- Stack Tier                 積み段                  1 つのレーンの中の横の段（← 積み順の段・コードの lane）
Graphics                         図形                    Task Group Lanes に GRS が描く物の全部
+- Task Graphic                  タスク図形              1 つのレーンの 1 つの積み段に置く
|  +- Plan Bar                   予定バー
|  |  +- Fade Ramp               フェード斜面            ← フェードの台形
|  +- Actual Bar                 実績バー
|  +- Actual Dummy               実績ダミー              ← Actual Operation Dummy・実績操作のダミー
|  +- Milestone Mark             マイルストーンマーク
|  +- Baseline Outline           変更前予定輪郭          ← 輪郭
|  +- Plan-Actual Guide Line     予実補助線
|  +- Progress Mark              進捗マーク              ← Progress Marker・進捗マーカー
|  +- Resume Mark                再開マーク              ← Resume Icon・再開アイコン
|  |  +- Resume Dash Line        再開破線                停止日から再開マークへ
|  +- Deadline Mark              期限マーク              ← 期限の印
|  +- Task Labels                タスクラベル            ← 札・担当と進捗の札
|     +- Name Label              名称ラベル
|     +- Assignee Label          担当ラベル
|     +- Percent Complete Label  完了率ラベル
+- Dependency Line               依存線                  レーンをまたぐ（← Dependency Lines）
|  +- Arrowhead                  矢じり
|  +- Continuation Mark          続きマーク              ← 続きの印
+- Annotation                    注記                    レーンをまたぐ（← Annotations）
|  +- Comment Box                コメントボックス        ← 画面の en「Callout」
|  |  +- Leader Line             引出し線
|  |  +- Leader Anchor           線先
|  +- Highlight Box              ハイライトボックス
+- Progress Line                 イナズマ線
+- Status Line                   基準日線
+- Date Grid Lines               日付罫線
+- Group Grid Lines              グループ罫線
```
