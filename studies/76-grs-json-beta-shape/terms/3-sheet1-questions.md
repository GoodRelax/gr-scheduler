# 用語の裁定 1 枚目 —— 木のいちばん上（製品・文書・窓のたぐい・画面の大きな区分）

2026-10-26 に作り、2026-10-27 に閉じた版です。用語は上から順に決めます（`JDG-3350`）。

🔄 ***この紙の問いは全部決まりました。*** *下の木が 1 枚目の結論です。次は 2 枚目（区分の中の部品。最初に、マウスで操作する点と操作子の名）です。*

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
| 🔄 *3（木の ★）* | 🔄 *`Schema`（スキーマ）は派生出力ではない。ファイルの形式の木で、派生出力と並ぶ親に上げる* | 🔄 *`JDG-3359`* |
| 🔄 *7* | 🔄 *2 つのパネル（Task Group Panel・Properties Panel）は Schedule Canvas の外。Schedule Canvas は 2 つのパネルのあいだ* | 🔄 *`JDG-3360`* |
| 🔄 *7-3* | 🔄 *タスクを描く区分は `Task Group Lanes`（タスクグループレーンズ）、その 1 行は `Task Group Lane`（タスクグループレーン）。データの `TaskGroup` の名はそのまま* | 🔄 *`JDG-3361`* |
| 🔄 *7-4* | 🔄 *`Canvas Overlays` は用語集から消す。代わりに、マウスで操作する点と操作子の名を決める（2 枚目の最初の問い）* | 🔄 *`JDG-3362`* |

---

## 全体の木（1 枚目の結論）

左から、英語の名・日本語の名・中身です。

**画面の木**

```text
   Browser Window                            ブラウザーのウィンドウ      GRS の外。「ウィンドウ」だけでは呼ばない
   +- GRS                                    GRS                         ブラウザーの 1 つのタブ
      +- App Header                          アプリヘッダー              上の固定の帯
      |  +- Branding                         ブランド表示                左端の「GRS」の字
      |  +- Project Title                    プロジェクトのタイトル      project.title。押して直せる
      |  +- File Status                      ファイルの状態
      |  |  +- Opened File Name              開いているファイル名
      |  |  +- File Saved At                 ファイル保存時刻
      |  +- Header Commands                  ヘッダーのコマンド          [三] など
      +- Schedule Filter Bar                 スケジュールフィルタバー    絞っているあいだだけ出る帯
🔄    +- Task Group Panel                    タスクグループパネル        Panel。左。Schedule Canvas の外
      |  +- Task Group Title Tree            タスクグループ見出しツリー
🔄    +- Panel Divider                       パネル境界                  パネルと Schedule Canvas の境目。幅を変える
🔄    +- Schedule Canvas                     スケジュールキャンバス      2 つのパネルのあいだ
      |  +- Time Ruler                       タイムルーラー              上の目盛の帯
🔄    |  +- Task Group Lanes                 タスクグループレーンズ      タスクを描く区分（← Task Group Area）
🔄    |  |  +- Task Group Lane               タスクグループレーン        タスクグループ 1 つで横 1 行（← Task Groups）
      |  |     +- Task Graphic               タスクの図形                そのタスクグループのタスク
      |  |        +- Plan Bar                予定バー
      |  |        +- Actual Bar              実績バー
      |  |        +- Milestone Mark          マイルストーンの印
      |  +- Scrollbars                       スクロールバー
      |  +- Watermark                        透かし
🔄    +- Properties Panel                    プロパティパネル            Panel。右。Schedule Canvas の外。[三] から文書の基本情報も
      +- Command Palette                     コマンドパレット            Palette。浮いて動かせる道具の帯
      +- Tool Window                         ツールウィンドウ            動かせて、開いたままほかを操作できる
      |  +- Help Window                      ヘルプウィンドウ            ← Help Modal
      |  +- Search Window                    検索ウィンドウ              ← Search Panel
      |  +- Resource List Window             担当リストウィンドウ        ← Resource List
      |  +- Delay Diagnostics Report Window  遅延診断レポートウィンドウ  ← Delay Diagnostics Report
      |  +- Holiday Settings Window          休日の設定ウィンドウ        ← Holiday Settings
      +- Dialog                              ダイアログ                  閉じるまでほかを操作できない
      |  +- Save As Dialog                   ファイルに保存ダイアログ    ← Export Chooser
      |  +- Open File Dialog                 ファイルを開くダイアログ    ← Open Chooser
      |  +- Watermark Unlock Dialog          透かし解除ダイアログ        ← Watermark Unlock
      |  +- Difference Review Dialog         差分の確認ダイアログ        ← Difference Review
      |  +- Import Report Dialog             読込の報告ダイアログ        ← Import Report
      |  +- Message Box                      メッセージボックス          短い問いと答えのボタンだけのダイアログ
      |     +- Confirmation                  確認
      +- Notification                        通知                        端に出て、しばらくして消える知らせ
      |  +- Notification Area                通知の場所                  通知が立つ所
      +- Tooltip                             ツールチップ                ポインターを乗せたときの説明
```

**スケジュール文書の木**

```text
   Schedule Document     スケジュール文書    GRS が開いて直す日程の文書
   +- Schedule Data      スケジュールデータ  GRS JSON の schedule
   |  +- MSPDI part      MSPDI 由来の部分    Project・Calendar・Task・Resource・Assignment と Carried の値
   |  +- GRS part        GRS 独自の部分      TaskGroup・TaskVisual・CommentBox・HighlightBox など
   +- Document Settings  文書の設定          開くときの描き方（documentSettings）
   +- Document Stamp     文書の刻印          最後の変更・保存・書いた人（documentStamp）
   +- Change Log         変更の記録          changeLogEntries
```

**ファイルの形式**

```text
   Schedule Document Format  スケジュール文書の形式  スケジュール文書を入れるファイルの形式
   +- GRS JSON               GRS JSON                全部を入れる（正の形式）
   +- GRS HTML               GRS HTML                GRS の本体 ＋ 全部（今の「単一 HTML」）
   +- MSPDI                  MSPDI                   スケジュールデータの MSPDI part だけ
   Derived Output            派生出力                スケジュール文書から作るだけの物（スケジュール文書ではない）
   +- Picture                画像                    SVG・PNG・クリップボード
   +- Report                 レポート                Markdown（遅延診断レポート）・TSV（修正の記録）
🔄 Schema                    スキーマ                GRS JSON のスキーマ。スケジュール文書の形を定める（派生出力ではない）
```
