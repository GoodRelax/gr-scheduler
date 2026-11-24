BGQA9
# 新しい ANMS と NDD レビュー基準を GRS に当てる計画 —— 持ち主の裁定

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA9 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

🔄 *作った日: 2026-11-23（SUB「新しい ANMS と NDD レビュー基準の適用計画」。BOSS（4 代目）の指示で BGQA9 を作った）。2 回目・3 回目: 2026-11-24。4 回目: 2026-11-25*
🔄 *残 14（❓ で検索）*

- 計画の本文: `studies/82-anms-ndd-apply-plan/README.md`。2 節の表（B1〜B15）が、β の前に新基準に合わせる道、席の数、β の日付への影響を示します。
- 改定案: NDD レビュー基準書 版 `20261123T131438Z`、ANMS v0.36 ドラフト v53。まだ gr-sw-maker の `main` に入っていない。
- この GQA は、持ち主の裁定が要る物（日程、1 本のセッションで終わらない仕事の順番と席、外との約束の語、新しい依存、規則 06 の 0.1 節）だけを問う。基準書で答えが 1 つに決まる物は、下の決定事項に席が決めて書いた。覆したい物は「自由」の欄に書いてください。
- 書くのは本計画の SUB だけです。
- 🔄 *領域: `[apply]` 適用の計画、`[names]` 外に出る語の名（4 回目から）。*

***

## 決定事項

### [apply] 適用の計画

| 事 | 決めた事 | 拠り所 |
|:---|:---|:---|
| ✅ 問 1 始める時期 | 規則 07 と検査 92 を、β の前の最初の仕事にする。規則 07 は GRS が使うレビュー基準書の写し（原本は gr-sw-maker の基準書）、検査 92 は写しの見出しとチェックリストの行が原本と同じかを機械で比べる検査です | `JDG-3821` |
| ✅ 問 2 コメントの移し | β の前に移す（`JDG-3598` のまま） | `JDG-3822` |
| ✅ 問 3 仕様の組み替え | β の前に組み替えるように計画する。β の日付への影響は問 8 | `JDG-3823` |
| ✅ 問 4 1 章の目的と問い | 席が憲章の下書きから下書きを作り、持ち主が GQA で 1 回見て直す | `JDG-3824` |
| ✅ 問 5 英語を正にするか | 用語集と画面の文は英語を正にする。仕様の原稿の和文はチーム T の答えの後 | `JDG-3825` |
| ✅ 問 6 初めてのレビュー | 1 回レビューし、残る High を 1 枚の表で持ち主が 1 回で承認する | `JDG-3826` |
| ✅ 問 7 テストの記録 | GT-2 ごとの要約（sha と passed・failed・skipped の数）を `docs/development-records/test-records/` にコミットする | `JDG-3827` |
| ✅ 問 8 β の日付 | β は新基準の全部が入るまで待つ。見込み 11-30、遅くとも 12-02。11-24 の試しの後に PMO が置き直す | `JDG-3829` |
| ✅ 問 9 Gherkin の道具 | 新しい道具を足さない。今の e2e の試験の題にシナリオの ID とユースケースの印を付ける | `JDG-3830` |
| ✅ 問 10 要求の形 | StrictDoc の節点のまま保ち、GRS のテンプレートにそう書く | `JDG-3831` |
| ✅ 問 11 席の数 | 最も多い時に新基準の席を 10〜12 並べる | `JDG-3832` |
| ✅ 問 12 用語集 | 用語集の JSON を最優先で作る。席が命名の観点を示し、持ち主が OK したら、別のエージェントが観点で語をレビューし、持ち主が結果で判断する（問 13） | `JDG-3833` |
| 問 12 の問い返し「外に出る語はあるか」への答え | ある。用語集の下書き 1,511 語のうち、持ち主の裁定で覆われる語は 677（基本用語 72・GRS JSON と Agent API と文書の命令 605）。覆われない語は、画面に出る語 381、MCP の説明だけに出る語 3、仕様とコードの中だけの語 450。数え方は計画の本文の 7 節 | 下書きの各語の `uses` の欄 |
| 🔄 *✅ 問 13 命名の観点* | 🔄 *下の 11 の観点にした。各行の後ろに拠り所の原則の名を書き、NEIM・OKPN・OMPV を 1 行ずつに分けた* | 🔄 *`JDG-3834`* |
| 🔄 *✅ 問 13-2 レビューする語* | 🔄 *外に出る語は席が名を提案し、持ち主が先に確かめる（`[names]` の問 14）。外に出ない語は、席が観点に従って決める* | 🔄 *`JDG-3835`* |
| 持ち主のチャット | 「βの前に新ANMS/NDD基準に合致する方法を考えろ」。用語集の基本用語・GRS JSON・Agent API の名の方針を土台にする | `JDG-3828` |
| 未決の問いの ID と置き場 | 裁定待ちの一覧の `PND` を `OPQ` に替える。開いた 29 行を仕様の付録 A.3 に移し、済んだ 327 行は記録として今の場所に残す | NDD「仕様が決めていない振る舞い」（MUST） |
| コードの印 | `// @provisional PND-n` を `// Provisional: OPQ-n` に、作らずに止めた所を `// Unimplemented: OPQ-n` に、`DEVIATION:` を `Temporary: … Until: …` に替える | R3 のコメントの行（MUST） |
| プロジェクトのコメントの種類 | `Trap:`・`File:`・`Step:` と、ファイル頭の札（`@unit`・`@component`・`@publishes`・`@seam` ほか）を規則 03 に書く | `JDG-3597`、R3「ほかの種類は先にプロジェクトの規則に定める」 |
| レビュー指摘の記録 | レビューごとの報告に `RVF-xxx` の行を書き、重大度・対応・期限・承認した人を持つ。不具合の台帳 `defects.md` の形は変えない | 付録 A.1 |
| 変更履歴 | 切り替えの後の行から 4 列（版 / 変更 / 変えた ID / 拠り所）で書き、前の行は書いたまま残す | ANMS の変更履歴の決まり |
| 行 ID | 今の ID は変えない。新しい接頭辞だけ 3 桁にする。表の行（`S-`・`CM-` ほか）は今の行 ID を実装仕様の ID として保つ | 基準書「ID を振り直さない」（MUST）、ANMS「仕様の中で一意な名を ID に使ってよい」 |
| ユースケースと UseCase | ユースケースごとに同じ名の UseCase を 1 つ置く | R1c（MUST） |
| 文の決まりの残り | 組み替えで書き直さない行の指示語・受け身は、Medium の指摘として期限つきで据え置く | 重大度の表（Medium は据え置ける） |
| 11-08 の計画の段 4〜7 | 計画の 391〜396 を本計画に畳む。語の直し（`JDG-3601`）とコメントの種類（`JDG-3597`）は引き継ぐ | 中身が重なる |


🔄 *命名の観点（`JDG-3834`。はい = よい）:*

| 🔄 *#* | 🔄 *観点* | 🔄 *例: 悪い → 良い* |
|:---|:---|:---|
| 🔄 *V1* | 🔄 *名だけで、指す物の意味・働き・役目が読めるか。`data`・`info`・`manager`・`helper` のような何でも入る名を避けているか（NEIM）* | 🔄 *`TaskData` → `Task`* |
| 🔄 *V2* | 🔄 *1 つの名が、1 種類の値だけを取るか（OKPN）* | 🔄 *明るい色と暗い色を 1 つの文字列に詰める → 2 つの欄に分ける* |
| 🔄 *V3* | 🔄 *1 つの値が、1 つの意味だけを持つか（OMPV）* | 🔄 *`0` で「親なし」を表す → 欄を書かない* |
| 🔄 *V4* | 🔄 *1 つの物を、画面・仕様・コード・GRS JSON・Agent API で 1 つの名で呼んでいるか（用語集の決まり）* | 🔄 *画面「作業」・コード `job`・GRS JSON `task` → 3 つとも `task`* |
| 🔄 *V5* | 🔄 *違う物に違う名を付け、同じ物の言い換えを 1 つの名にまとめているか（用語集の決まり）* | 🔄 *「期限」と「締切」が同じ物 → 1 つ* |
| 🔄 *V6* | 🔄 *品詞が働きに合うか: 物は名詞、操作は動詞と目的語、真偽は `is`・`has`・`can` で始まる肯定の句、集まりは複数形、起きた事は過去形（R2 の命名）* | 🔄 *`hasNoParent` → `isTopLevel`* |
| 🔄 *V7* | 🔄 *単位の決まった量は名に単位を持つか。範囲の名は端を含むかが読めるか（R2 の命名、規則 03）* | 🔄 *`timeout` → `timeoutMs`* |
| 🔄 *V8* | 🔄 *英語の名が正で、日本語の名は日常の言葉か（`JDG-3825`）* | 🔄 *「旗」 → 「フラグ」* |
| 🔄 *V9* | 🔄 *略は許した 9 つと、外の規格が決めた名だけか（GRS JSON の名の決まり N-2）* | 🔄 *`dur` → `duration`* |
| 🔄 *V10* | 🔄 *業種の名と他社の製品の名を避けているか（業種に依らない書き方の決まり）* | 🔄 *特定の業界の語 → 一般の語* |
| 🔄 *V11* | 🔄 *名を、指す物に照らした適切さだけで選んだか（NDD の名の選び方）* | 🔄 *意味がずれた名を手間で残す → 意味に合う名へ改める* |

### [names] 🔄 *外に出る語の名*

| 🔄 *事* | 🔄 *決めた事* | 🔄 *拠り所* |
|:---|:---|:---|
| 🔄 *対象の語* | 🔄 *`docs/spec/_source/glossary.json` の 1,549 語のうち、画面か MCP の説明に出て、GRS JSON・Agent API・文書の命令に出ない 393 語（画面 389・MCP の説明 4）* | 🔄 *`JDG-3835`* |
| 🔄 *対象の外* | 🔄 *GRS JSON の名（凍結、`JDG-3807`）と Agent API の名（BGQA7）は持ち主が見た・見ているので外した* | 🔄 *BOSS の指示* |
| 🔄 *BGQA11 へ回した語* | 🔄 *名が裁定どうしで割れた 40 語と、CR-857 の後任が今 label を直している語（遅延診断の 11 語、「暦」「変更前の予定」を含む語）。表には「BGQA11 が扱う」と書いた* | 🔄 *CR-857 の後任の席との取り決め* |
| 🔄 *案の出し方* | 🔄 *観点 V1〜V11 のどれかに合わない語にだけ案を出した。持ち主が既に確かめた語（拠り所あり）を覆す案は、理由の欄に覆す裁定を書いた* | 🔄 *`JDG-3834`* |
| 🔄 *決まった改名の当て方* | 🔄 *改名の一覧を CR-857 の後任へ渡し、後任が `renames[]` に記録して仕様とコードへ当てる* | 🔄 *改名の手順（基準書の付録 A.2）* |

***

## QA

### [apply] 🔄 *適用の計画 ✅*

### [names] 🔄 *外に出る語の名（❓ 13）*

🔄 *393 語をグループに分け、グループごとに 1 問にしました。各表は、英語と日本語の名（案は太字で「今 → 案」）、どの機能のどこの話か、GRS JSON との関係（その語が見せる・書き換える GRS JSON の値のキー。保存しない語は「なし」）、案の理由と観点を並べます。案は 28 語、BGQA11 へ回した語は 47 語、残りの 318 語は今の名のままにする案です。*

#### 🔄 *❓ 問 14-1. プロパティパネルの欄（44 語。案 10、BGQA11 へ 2）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *コメントボックス* | 🔄 *Bring to Front* | 🔄 *最前面に配置* | 🔄 *プロパティパネルのボタン。選んだコメントボックスを並びの最後へ移し、ほかより前に描く。* | 🔄 *scheduleData.commentBoxes[] の並びの順* | 🔄 *—* |
| 🔄 *コメントボックス* | 🔄 *Fill Color* | 🔄 *塗潰し色* | 🔄 *プロパティパネルで、選んだコメントボックスの塗りの色を見せて選ぶ欄。* | 🔄 *scheduleData.commentBoxes[].style.fill.color* | 🔄 *—* |
| 🔄 *コメントボックス* | 🔄 *Fill Transparency (%)* | 🔄 *塗りの透過率（%）* | 🔄 *プロパティパネルで、選んだコメントボックスの塗りの透け具合を % で見せて編集する欄（今は 0 が不透明、100 が透明）。* | 🔄 *scheduleData.commentBoxes[].style.fill.opacityPercent（向きが逆: 不透明度）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コメントボックス* | 🔄 *Font Size* | 🔄 *フォントサイズ* | 🔄 *プロパティパネルで、選んだコメントボックスの本文の字の大きさを見せて編集する欄。* | 🔄 *scheduleData.commentBoxes[].style.font.sizePx* | 🔄 *—* |
| 🔄 *コメントボックス* | 🔄 *Outline Color → **Stroke Color*** | 🔄 *枠線色* | 🔄 *プロパティパネルで、選んだコメントボックスの枠と引出し線の色を見せて選ぶ欄。* | 🔄 *scheduleData.commentBoxes[].style.stroke.color* | 🔄 *案: GRS JSON は枠と引出し線をまとめて stroke と呼び、Outline は前回予定の輪郭という別の物にも使うので、英語を stroke にそろえる（和名は日常の語のまま）。（V4 V5）* |
| 🔄 *コメントボックス* | 🔄 *Outline Width → **Stroke Width*** | 🔄 *枠線幅* | 🔄 *プロパティパネルで、選んだコメントボックスの枠と引出し線の太さを見せて編集する欄。* | 🔄 *scheduleData.commentBoxes[].style.stroke.widthPx* | 🔄 *案: GRS JSON は枠と引出し線をまとめて stroke と呼び、Outline は前回予定の輪郭という別の物にも使うので、英語を stroke にそろえる（和名は日常の語のまま）。（V4 V5）* |
| 🔄 *コメントボックス* | 🔄 *Text* | 🔄 *本文* | 🔄 *プロパティパネルで、選んだコメントボックスの本文を見せて編集する欄。* | 🔄 *scheduleData.commentBoxes[].text* | 🔄 *—* |
| 🔄 *コメントボックス* | 🔄 *Text Color → **Font Color*** | 🔄 *文字色* | 🔄 *プロパティパネルで、選んだコメントボックスの本文の字の色を見せて選ぶ欄。* | 🔄 *scheduleData.commentBoxes[].style.font.color* | 🔄 *案: GRS JSON は字の大きさと色をともに font の下に持ち、隣の欄も Font Size なので、英語を Font Color にそろえる（和名は日常の語のまま）。（V4）* |
| 🔄 *依存線* | 🔄 *Lag* | 🔄 *ラグ* | 🔄 *プロパティパネルで、選んだ依存線のラグを見せて編集する欄。* | 🔄 *scheduleData.tasks[].predecessorLinks[].linkLag（単位は lagFormat）* | 🔄 *—* |
| 🔄 *依存線* | 🔄 *Predecessor* | 🔄 *先行* | 🔄 *プロパティパネルで、選んだ依存線の先行タスクを見せる欄。* | 🔄 *scheduleData.tasks[].predecessorLinks[].predecessorUid* | 🔄 *—* |
| 🔄 *依存線* | 🔄 *Successor* | 🔄 *後続* | 🔄 *プロパティパネルで、選んだ依存線の後続タスクを見せる欄。* | 🔄 *predecessorLinks[] を持つ側の scheduleData.tasks[].uid* | 🔄 *—* |
| 🔄 *依存線* | 🔄 *Type* | 🔄 *種別* | 🔄 *プロパティパネルで、選んだ依存線の種類（FS・SS・FF・SF）を見せて選ぶ欄。* | 🔄 *scheduleData.tasks[].predecessorLinks[].type* | 🔄 *—* |
| 🔄 *ハイライトボックス* | 🔄 *Bring to Front* | 🔄 *最前面に配置* | 🔄 *プロパティパネルのボタン。選んだハイライトボックスを並びの最後へ移し、ほかより前に描く。* | 🔄 *scheduleData.highlightBoxes[] の並びの順* | 🔄 *—* |
| 🔄 *ハイライトボックス* | 🔄 *Fill Color* | 🔄 *塗潰し色* | 🔄 *プロパティパネルで、選んだハイライトボックスの塗りの色を見せて選ぶ欄。* | 🔄 *scheduleData.highlightBoxes[].style.fill.color* | 🔄 *—* |
| 🔄 *ハイライトボックス* | 🔄 *Fill Transparency (%)* | 🔄 *塗りの透過率（%）* | 🔄 *プロパティパネルで、選んだハイライトボックスの塗りの透け具合を % で見せて編集する欄（今は 0 が不透明、100 が透明）。* | 🔄 *scheduleData.highlightBoxes[].style.fill.opacityPercent（向きが逆: 不透明度）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *ハイライトボックス* | 🔄 *Outline Color → **Stroke Color*** | 🔄 *枠線色* | 🔄 *プロパティパネルで、選んだハイライトボックスの枠の色を見せて選ぶ欄。* | 🔄 *scheduleData.highlightBoxes[].style.stroke.color* | 🔄 *案: GRS JSON は線を stroke と呼び、Outline は前回予定の輪郭という別の物にも使うので、英語を stroke にそろえる（和名は日常の語のまま）。（V4 V5）* |
| 🔄 *ハイライトボックス* | 🔄 *Outline Width → **Stroke Width*** | 🔄 *枠線幅* | 🔄 *プロパティパネルで、選んだハイライトボックスの枠の太さを見せて編集する欄。* | 🔄 *scheduleData.highlightBoxes[].style.stroke.widthPx* | 🔄 *案: GRS JSON は線を stroke と呼び、Outline は前回予定の輪郭という別の物にも使うので、英語を stroke にそろえる（和名は日常の語のまま）。（V4 V5）* |
| 🔄 *タスクの基本* | 🔄 *Assignee* | 🔄 *担当* | 🔄 *プロパティパネルで、選んだタスクの担当を見せて選ぶ欄。* | 🔄 *scheduleData.assignments[].resourceUid（名は resources[].name）* | 🔄 *—* |
| 🔄 *タスクの基本* | 🔄 *Notes* | 🔄 *備考* | 🔄 *プロパティパネルで、選んだタスクの備考を見せて編集する欄。* | 🔄 *scheduleData.tasks[].notes* | 🔄 *—* |
| 🔄 *タスクの基本* | 🔄 *Task Name* | 🔄 *タスク名* | 🔄 *プロパティパネルで、選んだタスクの名を見せて編集する欄（マイルストーンではマイルストーン名と読む）。* | 🔄 *scheduleData.tasks[].name* | 🔄 *—* |
| 🔄 *タスクの基本* | 🔄 *UID* | 🔄 *UID* | 🔄 *プロパティパネルで、選んだタスクの uid を見せる欄（編集できない）。* | 🔄 *scheduleData.tasks[].uid* | 🔄 *—* |
| 🔄 *タスクグループ* | 🔄 *Color* | 🔄 *色* | 🔄 *プロパティパネルで、選んだタスクグループの帯の色を見せて選ぶ欄。* | 🔄 *scheduleData.taskGroups[].style.color* | 🔄 *—* |
| 🔄 *タスクグループ* | 🔄 *Edit Permission → **Allowed Editor Group*** | 🔄 *編集権限 → **編集できるグループ*** | 🔄 *プロパティパネルで、選んだタスクグループを編集してよいグループの名を見せて編集する欄（人だけが入れられる）。* | 🔄 *scheduleData.taskGroups[].allowedEditorGroupName* | 🔄 *案: 欄の値は権限の種類でなく編集してよいグループの名で、GRS JSON のキーも allowedEditorGroupName なので、その語にそろえる（JDG-508・JDG-2643 の札を覆す）。（V1 V4）* |
| 🔄 *タスクグループ* | 🔄 *Min Height* | 🔄 *最小高さ* | 🔄 *プロパティパネルで、選んだタスクグループの帯の最も低い高さを見せて編集する欄。* | 🔄 *scheduleData.taskGroups[].minHeightPx* | 🔄 *—* |
| 🔄 *タスクグループ* | 🔄 *Task Group Name* | 🔄 *タスクグループ名* | 🔄 *プロパティパネルで、選んだタスクグループの名を見せて編集する欄。* | 🔄 *scheduleData.taskGroups[].name* | 🔄 *—* |
| 🔄 *タスクのつながり* | 🔄 *Parent Task* | 🔄 *親タスク* | 🔄 *プロパティパネルで、選んだタスクの WBS の親タスクを見せて選ぶ欄。* | 🔄 *scheduleData.tasks[].parentTaskUid* | 🔄 *—* |
| 🔄 *タスクのつながり* | 🔄 *Predecessor Tasks* | 🔄 *先行タスク* | 🔄 *プロパティパネルで、選んだタスクの先行タスクを見せて編集する欄。* | 🔄 *scheduleData.tasks[].predecessorLinks[].predecessorUid* | 🔄 *—* |
| 🔄 *タスクのつながり* | 🔄 *Successor Tasks* | 🔄 *後続タスク* | 🔄 *プロパティパネルで、選んだタスクの後続タスクを見せて編集する欄。* | 🔄 *なし（ほかのタスクの predecessorLinks[].predecessorUid から導く）* | 🔄 *—* |
| 🔄 *タスクの見た目* | 🔄 *Fade In/Out Days → **Start/Finish Slope (days)*** | 🔄 *フェード日数 前/後 → **開始/終了の傾き（日）*** | 🔄 *プロパティパネルで、選んだタスクのバーの開始・終了の端を斜めに落とす暦日の数を見せて編集する欄（確定していない日付を形で表す）。* | 🔄 *scheduleData.tasks[].grs.startSlopeCalendarDays・finishSlopeCalendarDays* | 🔄 *案: GRS JSON のキーは startSlope・finishSlope で、JDG-3732 が画面の札も Start Slope ／ 開始の傾き・Finish Slope ／ 終了の傾きにそろえると決めたので、その裁定を当てる（単位の暦日を添える）。（V4）* |
| 🔄 *タスクの見た目* | 🔄 *Fill Color* | 🔄 *塗潰し色* | 🔄 *プロパティパネルで、選んだタスクのバーの塗りの色を見せて選ぶ欄。* | 🔄 *scheduleData.tasks[].grs.style.fill.color* | 🔄 *—* |
| 🔄 *タスクの見た目* | 🔄 *Milestone Shape* | 🔄 *マイルストーン形状* | 🔄 *プロパティパネルで、選んだマイルストーンのマークの形を見せて選ぶ欄。* | 🔄 *scheduleData.tasks[].grs.style.milestoneShape* | 🔄 *—* |
| 🔄 *タスクの見た目* | 🔄 *Outline Color → **Stroke Color*** | 🔄 *枠線色* | 🔄 *プロパティパネルで、選んだタスクのバーの枠線の色を見せて選ぶ欄。* | 🔄 *scheduleData.tasks[].grs.style.stroke.color* | 🔄 *案: GRS JSON は線を stroke と呼び、Outline は前回予定の輪郭（Baseline Outline）という別の物にも使うので、英語を stroke にそろえる（和名は日常の語のまま）。（V4 V5）* |
| 🔄 *タスクの見た目* | 🔄 *Outline Width → **Stroke Width*** | 🔄 *枠線幅* | 🔄 *プロパティパネルで、選んだタスクのバーの枠線の太さを見せて編集する欄。* | 🔄 *scheduleData.tasks[].grs.style.stroke.widthPx* | 🔄 *案: GRS JSON は線を stroke と呼び、Outline は前回予定の輪郭（Baseline Outline）という別の物にも使うので、英語を stroke にそろえる（和名は日常の語のまま。JDG-1566 は行の順の裁定で名は覆さない）。（V4 V5）* |
| 🔄 *タスクの予定と実績* | 🔄 *Actual Date* | 🔄 *実績日* | 🔄 *プロパティパネルで、選んだマイルストーンの実績の日を見せて編集する欄。* | 🔄 *scheduleData.tasks[].actualStart（マイルストーンは actualFinish も同じ）* | 🔄 *—* |
| 🔄 *タスクの予定と実績* | 🔄 *Actual Duration* | 🔄 *実績期間* | 🔄 *プロパティパネルで、選んだタスクの実績の長さを実績の日時から数えて見せる欄。* | 🔄 *なし（tasks[].actualStart・actualFinish から導く）* | 🔄 *—* |
| 🔄 *タスクの予定と実績* | 🔄 *Actual Finish* | 🔄 *実績終了日* | 🔄 *プロパティパネルで、選んだタスクの実績の終了を見せて編集する欄。* | 🔄 *scheduleData.tasks[].actualFinish* | 🔄 *—* |
| 🔄 *タスクの予定と実績* | 🔄 *Actual Start* | 🔄 *実績開始日* | 🔄 *プロパティパネルで、選んだタスクの実績の開始を見せて編集する欄。* | 🔄 *scheduleData.tasks[].actualStart* | 🔄 *—* |
| 🔄 *タスクの予定と実績* | 🔄 *Planned Date* | 🔄 *予定日* | 🔄 *プロパティパネルで、選んだマイルストーンの予定の日を見せて編集する欄。* | 🔄 *scheduleData.tasks[].start（マイルストーンは finish も同じ）* | 🔄 *—* |
| 🔄 *タスクの予定と実績* | 🔄 *Planned Finish* | 🔄 *予定終了日* | 🔄 *プロパティパネルで、選んだタスクの予定の終了を見せて編集する欄。* | 🔄 *scheduleData.tasks[].finish* | 🔄 *—* |
| 🔄 *タスクの予定と実績* | 🔄 *Planned Start* | 🔄 *予定開始日* | 🔄 *プロパティパネルで、選んだタスクの予定の開始を見せて編集する欄。* | 🔄 *scheduleData.tasks[].start* | 🔄 *—* |
| 🔄 *タスクの進捗* | 🔄 *% Complete* | 🔄 *完了率* | 🔄 *プロパティパネルで、選んだタスクの完了率を見せて編集する欄。* | 🔄 *scheduleData.tasks[].percentComplete* | 🔄 *—* |
| 🔄 *タスクの進捗* | 🔄 *Deadline* | 🔄 *期限* | 🔄 *プロパティパネルで、選んだタスクの期限を見せて編集する欄。* | 🔄 *scheduleData.tasks[].deadline* | 🔄 *—* |
| 🔄 *タスクの進捗* | 🔄 *Resume → **Resume Date*** | 🔄 *再開予定日* | 🔄 *プロパティパネルで、中断したタスクの再開の予定日を見せて編集する欄。* | 🔄 *scheduleData.tasks[].resume* | 🔄 *案: 日付の欄なのに Resume だけでは「再開する」ボタンの動詞に読めるので、すぐ下の Resume Date Confirmed と同じく Date を付けた名詞にする（JDG-1651 の札の一部を覆す）。（V6 V1）* |
| 🔄 *タスクの進捗* | 🔄 *Resume Date Confirmed* | 🔄 *再開日確定* | 🔄 *プロパティパネルで、再開日が確定しているかを見せて切り替える欄。* | 🔄 *scheduleData.tasks[].resumeValid* | 🔄 *—* |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 🔄 *太字の案のとおりに改め、ほかの語は今の名のままにする* |
| b | 🔄 *直す。回答欄に、直す行の英語の名と、採る名（今の名・案・別の名）を書く* |

回答:

#### 🔄 *❓ 問 14-2. 表の列（37 語。案 6、BGQA11 へ 9）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *遅延診断レポートウィンドウ - タスクの表* | 🔄 *Actual Dates* | 🔄 *実績日* | 🔄 *遅延診断レポートウィンドウの表で、実績の開始〜終了を見せる列。* | 🔄 *documentSettings.tableWindows.delayDiagnosisReportWindow.columnFilters[].column の値 "actualDates"（tasks[].actualStart・actualFinish）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *遅延診断レポートウィンドウ - タスクの表* | 🔄 *Assignee* | 🔄 *担当* | 🔄 *遅延診断レポートウィンドウの表で、タスクの担当の名を見せる列（中身は検索ウィンドウの担当名の列と同じ）。* | 🔄 *documentSettings.tableWindows.delayDiagnosisReportWindow.columnFilters[].column の値 "resourceNames"（resources[].name）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *遅延診断レポートウィンドウ - タスクの表* | 🔄 *Planned Dates* | 🔄 *予定日* | 🔄 *遅延診断レポートウィンドウの表で、予定の開始〜終了を見せる列。* | 🔄 *documentSettings.tableWindows.delayDiagnosisReportWindow.columnFilters[].column の値 "planDates"（tasks[].start・finish）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *遅延診断レポートウィンドウ - タスクの表* | 🔄 *Progress* | 🔄 *進捗* | 🔄 *遅延診断レポートウィンドウの表で、タスクの完了率を見せる列。* | 🔄 *documentSettings.tableWindows.delayDiagnosisReportWindow.columnFilters[].column の値 "percentComplete"（tasks[].percentComplete）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *遅延診断レポートウィンドウ - タスクの表* | 🔄 *Reason* | 🔄 *理由* | 🔄 *遅延診断レポートウィンドウの表で、診断の結果の理由を見せる列。* | 🔄 *documentSettings.tableWindows.delayDiagnosisReportWindow.columnFilters[].column の値 "diagnosisReason"* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *遅延診断レポートウィンドウ - タスクの表* | 🔄 *Status* | 🔄 *ステータス* | 🔄 *遅延診断レポートウィンドウの表で、そのタスクの診断の結果（ボトルネック・疑義・記載漏れ・遅れなど）を見せる列。* | 🔄 *documentSettings.tableWindows.delayDiagnosisReportWindow.columnFilters[].column の値 "diagnosisStatus"* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *遅延診断レポートウィンドウ - タスクの表* | 🔄 *Task (Milestone)* | 🔄 *タスク（マイルストーン）* | 🔄 *遅延診断レポートウィンドウの表で、タスク（マイルストーン）の名を見せる列。* | 🔄 *documentSettings.tableWindows.delayDiagnosisReportWindow.columnFilters[].column の値 "taskName"（tasks[].name）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *遅延診断レポートウィンドウ - タスクの表* | 🔄 *Task Type* | 🔄 *タスク種別* | 🔄 *遅延診断レポートウィンドウの表で、タスクかマイルストーンかを見せる列。* | 🔄 *documentSettings.tableWindows.delayDiagnosisReportWindow.columnFilters[].column の値 "taskType"* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *遅延診断レポートウィンドウ - タスクの表* | 🔄 *Visibility* | 🔄 *表示* | 🔄 *遅延診断レポートウィンドウの表の左端のチェックボックスの列。チェックした行のタスクだけを日程表に描くスケジュールフィルタに使う。* | 🔄 *documentSettings.tableWindows.delayDiagnosisReportWindow.checkedTaskUids[]（列の名は持たない、JDG-3726）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *修正案と修正ログの表* | 🔄 *After* | 🔄 *修正後* | 🔄 *遅延診断レポートウィンドウの修正案と修正ログの表で、直した後の値を見せる列。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *修正案と修正ログの表* | 🔄 *Before* | 🔄 *修正前* | 🔄 *遅延診断レポートウィンドウの修正案と修正ログの表で、直す前の値を見せる列。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *修正案と修正ログの表* | 🔄 *Date and Time* | 🔄 *日時* | 🔄 *遅延診断レポートウィンドウの修正案と修正ログの表で、日時を見せる列。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *修正案と修正ログの表* | 🔄 *Finding* | 🔄 *指摘* | 🔄 *遅延診断レポートウィンドウの修正案と修正ログの表で、修正のもとになった指摘を見せる列。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *修正案と修正ログの表* | 🔄 *Fix* | 🔄 *修正* | 🔄 *遅延診断レポートウィンドウの修正案と修正ログの表で、修正を当てる入口（修正案）か当てた印（ログ）を見せる列。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *修正案と修正ログの表* | 🔄 *Fix Type* | 🔄 *修正のしかた* | 🔄 *遅延診断レポートウィンドウの修正案と修正ログの表で、修正のしかた（辞書の語）を見せる列。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *修正案と修正ログの表* | 🔄 *Property* | 🔄 *プロパティ* | 🔄 *遅延診断レポートウィンドウの修正案と修正ログの表で、直す値の欄の名（プロパティパネルの欄の名）を見せる列。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *修正案と修正ログの表* | 🔄 *Task* | 🔄 *タスク* | 🔄 *遅延診断レポートウィンドウの修正案と修正ログの表で、直すタスクの名を見せる列。* | 🔄 *なし（値のもとは tasks[].name）* | 🔄 *—* |
| 🔄 *修正案と修正ログの表* | 🔄 *Task Type* | 🔄 *タスク種別* | 🔄 *遅延診断レポートウィンドウの修正案と修正ログの表で、タスクかマイルストーンかを見せる列。* | 🔄 *なし（値のもとは tasks[].milestone）* | 🔄 *—* |
| 🔄 *担当リストウィンドウ* | 🔄 *Assigned Tasks* | 🔄 *担当タスク* | 🔄 *担当リストウィンドウの表で、その担当が受け持つタスクの名を見せる列。* | 🔄 *documentSettings.tableWindows.resourceListWindow.columnFilters[].column の値 "assignedTaskNames"* | 🔄 *—* |
| 🔄 *担当リストウィンドウ* | 🔄 *Resource* | 🔄 *担当名* | 🔄 *担当リストウィンドウの表で、担当の名を見せる列。* | 🔄 *documentSettings.tableWindows.resourceListWindow.columnFilters[].column の値 "resourceName"（resources[].name）* | 🔄 *—* |
| 🔄 *担当リストウィンドウ* | 🔄 *Selected → **Selection Status*** | 🔄 *選択 → **選択状態*** | 🔄 *担当リストウィンドウの表で、その担当を選んでいるかを印で見せ、押して選ぶ・外す列。* | 🔄 *documentSettings.tableWindows.resourceListWindow.columnFilters[].column の値 "resourceSelectionStatus"（隠す値 "selected"・"notSelected"）* | 🔄 *案: 列は選択の状態（selected・notSelected）を見せるのに見出しが値の 1 つの形容詞で、GRS JSON の列の名 resourceSelectionStatus と、ほかの表の Progress Status・Diagnosis Status の形にそろえる（JDG-1871 の見出しを覆す）。（V4 V6）* |
| 🔄 *担当リストウィンドウ* | 🔄 *Task Count → **Assigned Task Count*** | 🔄 *担当タスク数* | 🔄 *担当リストウィンドウの表で、その担当が受け持つタスクの数を見せる列。* | 🔄 *documentSettings.tableWindows.resourceListWindow.columnFilters[].column の値 "assignedTaskCount"* | 🔄 *案: 何のタスクの数かを英語の名が言わず、GRS JSON の列の名 assignedTaskCount と隣の Assigned Tasks に合わせる（Count が付くので数と読め、JDG-1871 が退けた語順の紛れは起きない。JDG-1871 の見出しを覆す）。（V1 V4）* |
| 🔄 *担当リストウィンドウ* | 🔄 *Visibility* | 🔄 *表示* | 🔄 *担当リストウィンドウの表の左端のチェックボックスの列。チェックした担当のタスクだけを日程表に描くスケジュールフィルタに使う。* | 🔄 *documentSettings.tableWindows.resourceListWindow.checkedResourceUids[]・isUnassignedChecked（列の名は持たない、JDG-3726）* | 🔄 *—* |
| 🔄 *検索ウィンドウ - コメントボックスの表* | 🔄 *Body → **Text*** | 🔄 *本文* | 🔄 *検索ウィンドウのコメントボックスの表で、コメントボックスの本文を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "text"（commentBoxes[].text）* | 🔄 *案: 同じ本文をプロパティパネルは Text と呼び GRS JSON も text なので、英語の見出しをそろえる（和名「本文」は JDG-631 のまま）。（V4）* |
| 🔄 *検索ウィンドウ - コメントボックスの表* | 🔄 *Date* | 🔄 *日付* | 🔄 *検索ウィンドウのコメントボックスの表で、引出し線の線先が立つ日時を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "leaderTargetDay"* | 🔄 *—* |
| 🔄 *検索ウィンドウ - コメントボックスの表* | 🔄 *Task Group Name* | 🔄 *タスクグループ名* | 🔄 *検索ウィンドウのコメントボックスの表で、コメントボックスが載るタスクグループの名を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "taskGroupName"* | 🔄 *—* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Actual Finish* | 🔄 *実績終了* | 🔄 *検索ウィンドウのタスクの表で、実績の終了を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "actualFinish"（tasks[].actualFinish）* | 🔄 *—* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Actual Start* | 🔄 *実績開始* | 🔄 *検索ウィンドウのタスクの表で、実績の開始を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "actualStart"（tasks[].actualStart）* | 🔄 *—* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Assignees* | 🔄 *担当名* | 🔄 *検索ウィンドウのタスクの表で、タスクの担当の名を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "resourceNames"（resources[].name）* | 🔄 *—* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Path from Top → **Task Group Path*** | 🔄 *最上位までの階層 → **タスクグループの階層*** | 🔄 *検索ウィンドウのタスクの表で、タスクが載るタスクグループから最上位までのタスクグループ名を「 → 」でつないで見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "taskGroupPath"* | 🔄 *案: 何の道かを名が言わず、GRS JSON の列の名 taskGroupPath とも違うので、タスクグループの道であることを言う名にそろえる（JDG-3726 の見出しを覆す）。（V1 V4）* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Planned Finish* | 🔄 *予定終了* | 🔄 *検索ウィンドウのタスクの表で、予定の終了を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "finish"（tasks[].finish）* | 🔄 *—* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Planned Start* | 🔄 *予定開始* | 🔄 *検索ウィンドウのタスクの表で、予定の開始を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "start"（tasks[].start）* | 🔄 *—* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Progress → **% Complete*** | 🔄 *進捗 → **完了率*** | 🔄 *検索ウィンドウのタスクの表で、タスクの完了率を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "percentComplete"（tasks[].percentComplete）* | 🔄 *案: 同じ完了率をプロパティパネルは % Complete と呼び GRS JSON も percentComplete なので、列の見出しもそろえる（JDG-3726 の見出しを覆す）。（V4）* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Status → **Progress Status*** | 🔄 *ステータス → **進捗ステータス*** | 🔄 *検索ウィンドウのタスクの表で、タスクの進捗ステータス（と遅れ・診断中の印）を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "progressStatus"* | 🔄 *案: 遅延診断レポートの「Status」と同じ名で別の値を見せており、GRS JSON の列の名 progressStatus と基本用語 Progress Status に合わせて分ける（JDG-3726 の見出しを覆す）。（V5 V4）* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Task (Milestone)* | 🔄 *タスク（マイルストーン）* | 🔄 *検索ウィンドウのタスクの表で、タスク（マイルストーン）の名を見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "taskName"（tasks[].name）* | 🔄 *—* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Task Type* | 🔄 *タスク種別* | 🔄 *検索ウィンドウのタスクの表で、タスクかマイルストーンかを見せる列。* | 🔄 *documentSettings.tableWindows.searchWindow.columnFilters[].column の値 "taskType"（tasks[].milestone から）* | 🔄 *—* |
| 🔄 *検索ウィンドウ - タスクの表* | 🔄 *Visibility* | 🔄 *表示* | 🔄 *検索ウィンドウの表の左端のチェックボックスの列。チェックした行のタスクだけを日程表に描くスケジュールフィルタに使う。* | 🔄 *documentSettings.tableWindows.searchWindow.checkedTaskUids[]（列の名は持たない、JDG-3726）* | 🔄 *—* |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 🔄 *太字の案のとおりに改め、ほかの語は今の名のままにする* |
| b | 🔄 *直す。回答欄に、直す行の英語の名と、採る名（今の名・案・別の名）を書く* |

回答:

#### 🔄 *❓ 問 14-3. 画面の大きな区分（39 語。案 0、BGQA11 へ 2）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *アプリヘッダー* | 🔄 *App Header* | 🔄 *アプリヘッダー* | 🔄 *GRS の上端に固定した帯。ブランド表示・プロジェクトタイトル・ファイル状態・ヘッダーコマンドを載せる。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *アプリヘッダー* | 🔄 *Branding* | 🔄 *ブランド表示* | 🔄 *アプリヘッダーの左端の字「GRS」。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *アプリヘッダー* | 🔄 *File Saved At* | 🔄 *ファイル保存時刻* | 🔄 *アプリヘッダーのファイル状態の下段に出す、最後に書いた時刻と中身の大きさ。* | 🔄 *documentStamp.fileSavedAt* | 🔄 *—* |
| 🔄 *アプリヘッダー* | 🔄 *File Status* | 🔄 *ファイル状態* | 🔄 *アプリヘッダーで、開いているファイルについて告げる部分（ファイル名と保存時刻）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *アプリヘッダー* | 🔄 *Header Commands* | 🔄 *ヘッダーコマンド* | 🔄 *アプリヘッダーに並ぶアイコン（メニューボタンなど）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *アプリヘッダー* | 🔄 *Opened File Name* | 🔄 *開いているファイル名* | 🔄 *アプリヘッダーのファイル状態に出す、開いているファイルの名。* | 🔄 *なし（ファイルの名で、文書の中の値ではない）* | 🔄 *—* |
| 🔄 *アプリヘッダー* | 🔄 *Project Title* | 🔄 *プロジェクトタイトル* | 🔄 *アプリヘッダーに出す文書のタイトル。押すとその場で編集できる。* | 🔄 *scheduleData.project.title* | 🔄 *—* |
| 🔄 *ブラウザーとアプリ* | 🔄 *Browser Window* | 🔄 *ブラウザーウィンドウ* | 🔄 *GRS の外側にあるブラウザーの窓。仕様と説明文で、GRS の中の窓と分けて呼ぶ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ブラウザーとアプリ* | 🔄 *GRS* | 🔄 *GRS* | 🔄 *アプリそのもの（ブラウザーの 1 つのタブ）。アプリヘッダーの左端の字と、説明文で出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット* | 🔄 *Command Palette* | 🔄 *コマンドパレット* | 🔄 *画面の上に浮かぶ、動かせる道具の帯。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット* | 🔄 *Palette Groups* | 🔄 *パレットグループ* | 🔄 *コマンドパレットの中で道具を並べる区切りのかたまり。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ダイアログ* | 🔄 *Confirmation Message* | 🔄 *確認メッセージ* | 🔄 *続けるかを 2 つの答えで問うメッセージボックス（削除の前などに出る）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ダイアログ* | 🔄 *Dialog* | 🔄 *ダイアログ* | 🔄 *閉じるまでほかを操作できない窓のたぐいの総称。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ダイアログ* | 🔄 *Difference Review Dialog* | 🔄 *差分確認ダイアログ* | 🔄 *マージで同じかもしれないタスクを並べ、どちらのファイルから採るかを選ばせるダイアログ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ダイアログ* | 🔄 *Import Report Dialog* | 🔄 *読込報告ダイアログ* | 🔄 *1 回の読み込みの結果を理由ごとに告げるダイアログ（OK だけを持つ）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ダイアログ* | 🔄 *Message Box* | 🔄 *メッセージボックス* | 🔄 *短い問いと答えのボタンだけを持つダイアログ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ダイアログ* | 🔄 *Open File Dialog* | 🔄 *ファイルオープンダイアログ* | 🔄 *読んだ中身を置き換え・マージ・前回予定として重ねるのどれに使うかを選ぶダイアログ。* | 🔄 *なし（重ねたときの行き先は scheduleData.baselineTasks[]）* | 🔄 *—* |
| 🔄 *ダイアログ* | 🔄 *Save As Dialog* | 🔄 *別名保存ダイアログ* | 🔄 *書き出して保存する形式を選ぶダイアログ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ダイアログ* | 🔄 *Watermark Unlock Dialog* | 🔄 *透かし解除ダイアログ* | 🔄 *透かしを隠す前に透かし解除パスワードを打たせるダイアログ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *通知とツールチップ* | 🔄 *Notification* | 🔄 *通知* | 🔄 *画面の端に出て、しばらくして消える短い知らせ。何も問わない。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *通知とツールチップ* | 🔄 *Notification Area* | 🔄 *通知領域* | 🔄 *通知が立つ画面の場所。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *通知とツールチップ* | 🔄 *Tooltip* | 🔄 *ツールチップ* | 🔄 *ポインターを物の上に置いているあいだ出る説明。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *パネルと帯* | 🔄 *Panel Divider* | 🔄 *パネル境界* | 🔄 *パネルとスケジュールキャンバスの境。ドラッグしてパネルの幅を変える。* | 🔄 *documentSettings.taskGroupPanelWidthPx（タスクグループパネルの側）* | 🔄 *—* |
| 🔄 *パネルと帯* | 🔄 *Properties Panel* | 🔄 *プロパティパネル* | 🔄 *画面の右にあり、選んだ物を見せて編集するパネル。メニューからは文書の基本の情報もここに出る。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *パネルと帯* | 🔄 *Schedule Filter Bar* | 🔄 *スケジュールフィルタバー* | 🔄 *3 つの表のどれかのスケジュールフィルタで描くタスクを絞っているあいだ、アプリヘッダーの下に出る帯。表の名・件数・解除の入口を持つ。* | 🔄 *documentSettings.tableWindows.<表>.isScheduleFilteredByChecks* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *パネルと帯* | 🔄 *Task Group Panel* | 🔄 *タスクグループパネル* | 🔄 *画面の左にあり、タスクグループを木で並べるパネル。* | 🔄 *なし（幅は documentSettings.taskGroupPanelWidthPx・isTaskGroupPanelWidthFixed）* | 🔄 *—* |
| 🔄 *パネルと帯* | 🔄 *Task Group Title Tree* | 🔄 *タスクグループタイトルツリー* | 🔄 *タスクグループパネルの中に描くタスクグループ名の木。* | 🔄 *scheduleData.taskGroups[]（name・parentTaskGroupId・siblingOrder）* | 🔄 *—* |
| 🔄 *スケジュールキャンバス* | 🔄 *Schedule Canvas* | 🔄 *スケジュールキャンバス* | 🔄 *2 つのパネルのあいだで日程を描く領域。* | 🔄 *なし（描く物は documentSettings.scheduleCanvasElements）* | 🔄 *—* |
| 🔄 *スケジュールキャンバス* | 🔄 *Scroll Thumb* | 🔄 *スクロールつまみ* | 🔄 *スクロールバーの中で、人がドラッグするつまみ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *スケジュールキャンバス* | 🔄 *Scroll Track* | 🔄 *スクロールトラック* | 🔄 *スクロールバーの中で、つまみが動く溝。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *スケジュールキャンバス* | 🔄 *Scrollbars* | 🔄 *スクロールバー* | 🔄 *スケジュールキャンバスのスクロールバー。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *スケジュールキャンバス* | 🔄 *Time Ruler* | 🔄 *タイムルーラー* | 🔄 *スケジュールキャンバスの上端の時間の目盛りの帯。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *スケジュールキャンバス* | 🔄 *Watermark* | 🔄 *透かし* | 🔄 *日程の上に重ねて描く、誰がいつ画面に出したかの字。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ツールウィンドウ* | 🔄 *Delay Diagnostics Report Window* | 🔄 *遅延診断レポートウィンドウ* | 🔄 *遅延診断の要約とタスクの表を出し、行を押すとそのタスクへ飛ぶツールウィンドウ。* | 🔄 *documentSettings.tableWindows.delayDiagnosisReportWindow* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *ツールウィンドウ* | 🔄 *Help Window* | 🔄 *ヘルプウィンドウ* | 🔄 *ショートカットキーとアイコンの一覧を出すツールウィンドウ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ツールウィンドウ* | 🔄 *Holiday Settings Window* | 🔄 *休日設定ウィンドウ* | 🔄 *文書のカレンダー（稼働する曜日と例外日）と週の始まりを編集するツールウィンドウ。* | 🔄 *scheduleData.calendars[]（weekDays[]・exceptions[]）・project.weekStartDay* | 🔄 *—* |
| 🔄 *ツールウィンドウ* | 🔄 *Resource List Window* | 🔄 *担当リストウィンドウ* | 🔄 *文書が持つ担当を表に並べるツールウィンドウ。* | 🔄 *documentSettings.tableWindows.resourceListWindow* | 🔄 *—* |
| 🔄 *ツールウィンドウ* | 🔄 *Search Window* | 🔄 *検索ウィンドウ* | 🔄 *語でタスクとコメントボックスを探して表に並べ、押すとそこへ飛ぶツールウィンドウ。* | 🔄 *documentSettings.tableWindows.searchWindow* | 🔄 *—* |
| 🔄 *ツールウィンドウ* | 🔄 *Tool Window* | 🔄 *ツールウィンドウ* | 🔄 *動かせて、開いたままほかを操作できる窓のたぐいの総称。* | 🔄 *なし* | 🔄 *—* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *このグループの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名を書く* |

回答:

#### 🔄 *❓ 問 14-4. 日程の考え（20 語。案 1、BGQA11 へ 0）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *前回予定* | 🔄 *Baseline* | 🔄 *前回予定* | 🔄 *今の予定と比べるために残した前の予定。キャンバスの前回予定の輪郭と、ファイルを開くダイアログの重ね読みで出会う。* | 🔄 *scheduleData.baselineTasks[]* | 🔄 *—* |
| 🔄 *カレンダー* | 🔄 *Exception Day* | 🔄 *例外日* | 🔄 *いつもの曜日の決まりから外れる日（休みにも稼働日にもなる）。休日設定ウィンドウで編集する。* | 🔄 *scheduleData.calendars[].exceptions[]* | 🔄 *—* |
| 🔄 *遅延診断* | 🔄 *Finished Delay Contribution* | 🔄 *完了済みの遅延寄与* | 🔄 *遅延診断で、もう終わったタスクが生んだ遅れの寄与。遅延診断レポートウィンドウの状態の列と一覧だけで出会う。* | 🔄 *delayDiagnosisReportWindow.columnFilters[].hiddenValues の値 "finishedDelayContribution"* | 🔄 *—* |
| 🔄 *遅延診断* | 🔄 *Late → **Delayed*** | 🔄 *遅れ* | 🔄 *基準日に照らして予定より遅れている未完了のタスクの状態。キャンバスの進捗ステータスマークと、検索ウィンドウ・遅延診断レポートの状態の列で出会う。* | 🔄 *columnFilters[].hiddenValues の値 "delay"（progressStatus と diagnosisStatus の列）* | 🔄 *案: GRS JSON の値とこの用語のキーは delay で、遅延診断（Delay Diagnosis）とも同じ語なので、画面も同じ語の Delayed にそろえる（JDG-3513 で確かめた札 Late を覆す）。（V4 V5）* |
| 🔄 *遅延診断* | 🔄 *Omission* | 🔄 *記載漏れ* | 🔄 *遅延診断の結果の 1 つ（入るはずの実績の日時や親が空）。遅延診断レポートウィンドウの状態の列で出会う。* | 🔄 *delayDiagnosisReportWindow.columnFilters[].hiddenValues の値 "omission"* | 🔄 *—* |
| 🔄 *遅延診断* | 🔄 *Suspicion* | 🔄 *疑義* | 🔄 *遅延診断の結果の 1 つ（値はそろうがありそうにない）。遅延診断レポートウィンドウの状態の列で出会う。* | 🔄 *delayDiagnosisReportWindow.columnFilters[].hiddenValues の値 "suspicion"* | 🔄 *—* |
| 🔄 *依存* | 🔄 *Predecessor* | 🔄 *先行* | 🔄 *依存線の根元のタスク。キャンバスの依存線と、プロパティパネルの「先行タスク」「先行」の欄で出会う。* | 🔄 *scheduleData.tasks[].predecessorLinks[].predecessorUid* | 🔄 *—* |
| 🔄 *依存* | 🔄 *Successor* | 🔄 *後続* | 🔄 *依存線の矢先のタスク。キャンバスの依存線と、プロパティパネルの「後続タスク」「後続」の欄で出会う。* | 🔄 *predecessorLinks[] を持つ側の scheduleData.tasks[]* | 🔄 *—* |
| 🔄 *予定と実績* | 🔄 *Actual* | 🔄 *実績* | 🔄 *タスクが実際に始まり・止まり・再開し・終わった日時。キャンバスの実績バーとプロパティパネルの実績の欄で出会う。* | 🔄 *scheduleData.tasks[].actualStart・actualFinish・stop・resume* | 🔄 *—* |
| 🔄 *予定と実績* | 🔄 *Plan* | 🔄 *予定* | 🔄 *タスクの予定の開始・終了の日時。キャンバスの予定バーとプロパティパネルの予定の欄で出会う。* | 🔄 *scheduleData.tasks[].start・tasks[].finish* | 🔄 *—* |
| 🔄 *進捗ステータス* | 🔄 *Finished* | 🔄 *完了* | 🔄 *進捗ステータスの値の 1 つ（実績の終了がある）。進捗ステータスマークと検索ウィンドウの状態の列で出会う。* | 🔄 *searchWindow.columnFilters[].hiddenValues の値 "finished"* | 🔄 *—* |
| 🔄 *進捗ステータス* | 🔄 *In progress* | 🔄 *進行中* | 🔄 *進捗ステータスの値の 1 つ（始まって続いている）。進捗ステータスマークと検索ウィンドウの状態の列で出会う。* | 🔄 *searchWindow.columnFilters[].hiddenValues の値 "inProgress"* | 🔄 *—* |
| 🔄 *進捗ステータス* | 🔄 *Not started* | 🔄 *未着手* | 🔄 *進捗ステータスの値の 1 つ（実績の開始が空）。進捗ステータスマークと検索ウィンドウの状態の列で出会う。* | 🔄 *searchWindow.columnFilters[].hiddenValues の値 "notStarted"* | 🔄 *—* |
| 🔄 *進捗ステータス* | 🔄 *Progress Status* | 🔄 *進捗ステータス* | 🔄 *タスクがどこまで進んだかを実績の日時から判じた状態。キャンバスの進捗ステータスマークと検索ウィンドウの状態の列で出会う。* | 🔄 *なし（実績から導く値。表の列の名 columnFilters[].column の "progressStatus"）* | 🔄 *—* |
| 🔄 *進捗ステータス* | 🔄 *Suspended, no resume date* | 🔄 *中断・再開日未定* | 🔄 *進捗ステータスの値の 1 つ（中断し、再開日が決まっていない）。進捗ステータスマークと検索ウィンドウの状態の列で出会う。* | 🔄 *searchWindow.columnFilters[].hiddenValues の値 "suspendedWithoutResumeDate"（判定は tasks[].resumeValid）* | 🔄 *—* |
| 🔄 *進捗ステータス* | 🔄 *Suspended, resume date set* | 🔄 *中断・再開予定あり* | 🔄 *進捗ステータスの値の 1 つ（中断し、再開の予定日がある）。進捗ステータスマークと検索ウィンドウの状態の列で出会う。* | 🔄 *searchWindow.columnFilters[].hiddenValues の値 "suspendedWithResumeDate"（判定は tasks[].resume）* | 🔄 *—* |
| 🔄 *タスクの種類* | 🔄 *Milestone* | 🔄 *マイルストーン* | 🔄 *期間でなく時点を示すタスク。キャンバスのマイルストーンマークと、表の「タスク種別」の列で出会う。* | 🔄 *scheduleData.tasks[].milestone* | 🔄 *—* |
| 🔄 *タスクの種類* | 🔄 *Task* | 🔄 *タスク* | 🔄 *日程の基本の単位。スケジュールキャンバスのバー、プロパティパネル、検索ウィンドウの表など画面のあらゆる所で出会う。* | 🔄 *scheduleData.tasks[]* | 🔄 *—* |
| 🔄 *WBS* | 🔄 *Child Task* | 🔄 *子タスク* | 🔄 *WBS で親タスクの下にあるタスク。キャンバスの親子の矢印とプロパティパネルの「親タスク」の欄で出会う。* | 🔄 *scheduleData.tasks[].parentTaskUid を持つタスク* | 🔄 *—* |
| 🔄 *WBS* | 🔄 *Parent Task* | 🔄 *親タスク* | 🔄 *WBS で子タスクをまとめるタスク。キャンバスの親子の矢印とプロパティパネルの「親タスク」の欄で出会う。* | 🔄 *scheduleData.tasks[].parentTaskUid（子の側が指す先）* | 🔄 *—* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *太字の案のとおりに改め、ほかの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名（今の名・案・別の名）を書く* |

回答:

#### 🔄 *❓ 問 14-5. そのほかの UI パーツ（18 語。案 1、BGQA11 へ 3）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *キャンバスの構造* | 🔄 *Canvas Overlays* | 🔄 *Canvas Overlays* | 🔄 *キャンバスの上に重ねて描く物をまとめた構造の名。画面には出ない。* | 🔄 *なし* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *カーソル* | 🔄 *Cursors* | 🔄 *カーソル* | 🔄 *キャンバスで日付を指す線のたぐいの総称。* | 🔄 *なし* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *カーソル* | 🔄 *Dual Cursor* | 🔄 *デュアルカーソル* | 🔄 *キャンバスに人が置く 2 本の縦線で、2 つの日のあいだの長さを読む。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *カーソル* | 🔄 *Guide Cursor* | 🔄 *ガイドカーソル* | 🔄 *キャンバスでポインターに付いて動く十字か縦 1 本の線。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *書き出しの形式* | 🔄 *GRS JSON* | 🔄 *GRS JSON* | 🔄 *GRS 自身の文書の形式。別名保存ダイアログとファイルを開くときに出会う。* | 🔄 *なし（形式そのもの。scheduleData.sourceFormat の値 "grs"）* | 🔄 *—* |
| 🔄 *書き出しの形式* | 🔄 *MSPDI XML* | 🔄 *MSPDI XML* | 🔄 *ほかの日程の道具とやり取りする形式。別名保存ダイアログとファイルを開くときに出会う。* | 🔄 *なし（形式そのもの。scheduleData.sourceFormat の値 "mspdi12"・"mspdi15"）* | 🔄 *—* |
| 🔄 *書き出しの形式* | 🔄 *PNG Image* | 🔄 *PNG画像* | 🔄 *日程の絵を PNG で書き出す形式。別名保存ダイアログで出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *書き出しの形式* | 🔄 *SVG Image* | 🔄 *SVG画像* | 🔄 *日程の絵を SVG で書き出す形式。別名保存ダイアログで出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *書き出しの形式* | 🔄 *Single HTML* | 🔄 *単一 HTML* | 🔄 *GRS と文書をまとめた 1 つの .html ファイル。別名保存ダイアログで出会う。* | 🔄 *なし* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *書き出しの形式* | 🔄 *exportFormats* | 🔄 *exportFormats* | 🔄 *別名保存ダイアログで選べる書き出しの形式の一覧。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *詳細度* | 🔄 *groupLevelOfDetail* | 🔄 *groupLevelOfDetail* | 🔄 *縦の大きさが小さいとき、深いタスクグループを描かない度合い（タスクグループパネルとキャンバス）。* | 🔄 *なし（縦の縮尺は documentSettings.verticalZoom）* | 🔄 *—* |
| 🔄 *詳細度* | 🔄 *timeAxisLevelOfDetail* | 🔄 *timeAxisLevelOfDetail* | 🔄 *横のズームに従って、タイムルーラーの目盛りを年から日・曜日まで細かくする度合い。* | 🔄 *なし（横の縮尺は documentSettings.dayWidthPx）* | 🔄 *—* |
| 🔄 *選択* | 🔄 *ArmedShape* | 🔄 *構え* | 🔄 *コマンドパレットで選んだ「次にドラッグしたら作る・結ぶ物」の状態。選択とは別の状態。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *選択* | 🔄 *Item → **Selectable Object*** | 🔄 *アイテム → **選択対象*** | 🔄 *キャンバスで当たり判定と選択の対象になる物の総称（タスク・依存線・ハイライトボックス・コメントボックス・基準日線）。仕様と説明文で出会う。* | 🔄 *なし* | 🔄 *案: Item は観点 V1 が名指しで避ける総称の語なので、選択の対象であることを言う名にする。（V1）* |
| 🔄 *選択* | 🔄 *Marquee* | 🔄 *範囲選択* | 🔄 *何にも当たらない所からドラッグして矩形で選ぶこと（キャンバス）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *選択* | 🔄 *Selection* | 🔄 *選択* | 🔄 *すでにある物を選ぶことと、選んだ物の集まり。キャンバスとタスクグループパネルで出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *タスクグループの表示* | 🔄 *Pinned Task Group* | 🔄 *ピン止めしたタスクグループ* | 🔄 *縦にスクロールしても画面に残るよう留めたタスクグループ（タスクグループパネル）。* | 🔄 *documentSettings.pinnedTaskGroupIds[]* | 🔄 *—* |
| 🔄 *透かし* | 🔄 *Watermark Unlock Password* | 🔄 *透かし解除パスワード* | 🔄 *透かしを隠す前に透かし解除ダイアログで打つパスワード。* | 🔄 *なし* | 🔄 *—* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *太字の案のとおりに改め、ほかの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名（今の名・案・別の名）を書く* |

回答:

#### 🔄 *❓ 問 14-6. 問い（14 語。案 0、BGQA11 へ 0）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *削除* | 🔄 *deleteAllTaskGroupsQuestion* | 🔄 *deleteAllTaskGroupsQuestion* | 🔄 *タスクグループパネルで全部のタスクグループを消す前に問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *削除* | 🔄 *deleteResourcesQuestion* | 🔄 *deleteResourcesQuestion* | 🔄 *担当リストウィンドウで選んだ担当を消す前に、タスクからの割り当ても外れることを告げて問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *削除* | 🔄 *deleteTaskGroupQuestion* | 🔄 *deleteTaskGroupQuestion* | 🔄 *タスクグループを消す前に、載っているタスクごと消すかを問う確認メッセージ（タスクグループパネル）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *削除* | 🔄 *deleteTaskQuestion* | 🔄 *deleteTaskQuestion* | 🔄 *タスクを消す前に、配下のタスクごと消すかを問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ファイルと文書* | 🔄 *aiOpenFileQuestion* | 🔄 *aiOpenFileQuestion* | 🔄 *AI が Agent API の requestOpenFile でファイルを開くよう求めたとき、ファイルを選ぶ窓を開くかを人に問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ファイルと文書* | 🔄 *closeDocumentQuestion* | 🔄 *closeDocumentQuestion* | 🔄 *今の文書を閉じる前に、保存していない編集と元に戻す履歴が消えることを告げて問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ファイルと文書* | 🔄 *overwriteOtherDocumentQuestion* | 🔄 *overwriteOtherDocumentQuestion* | 🔄 *開いた文書と同じとみなせないファイルへ書き出そうとするときに、上書きするかを問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ファイルと文書* | 🔄 *resetGrsQuestion* | 🔄 *resetGrsQuestion* | 🔄 *GRS をリセットする前に、ブラウザーに残した設定が消えてページを読み直すことを告げて問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ほかの問い* | 🔄 *hideWatermarkQuestion* | 🔄 *hideWatermarkQuestion* | 🔄 *透かしを隠す前に、透かし解除パスワードが要ることを告げて問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ほかの問い* | 🔄 *irreversibleOperationQuestion* | 🔄 *irreversibleOperationQuestion* | 🔄 *元に戻せない操作の前に、続けるかを問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ほかの問い* | 🔄 *liftTooDeepTaskGroupsQuestion* | 🔄 *liftTooDeepTaskGroupsQuestion* | 🔄 *タスクグループパネルでタスクグループを運んで、配下が深さの上限を超えるときに、上限の段へ引き上げて移すかを問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ほかの問い* | 🔄 *tasksOrParentArrowsQuestion* | 🔄 *tasksOrParentArrowsQuestion* | 🔄 *キャンバスでタスクと親子の矢印を一緒に選んだとき、どちらを選ぶかを問うメッセージボックス。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *日程のシフト* | 🔄 *timeShiftQuestion* | 🔄 *timeShiftQuestion* | 🔄 *タイムシフトで日程のすべての日時を一度に動かす前に、書き換える物を示して問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *日程のシフト* | 🔄 *wholeScheduleShiftQuestion* | 🔄 *wholeScheduleShiftQuestion* | 🔄 *全体日程シフトで日程全体を新しい開始日へ移す前に、書き換える物を示して問う確認メッセージ。* | 🔄 *なし* | 🔄 *—* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *このグループの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名を書く* |

回答:

#### 🔄 *❓ 問 14-7. 通知の作法（10 語。案 1、BGQA11 へ 0）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *告げ方* | 🔄 *acceptedWithCaution* | 🔄 *acceptedWithCaution* | 🔄 *受け付けたうえで注意を伝えるときの告げ方の決まり（操作を止めない）。人は通知で出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *告げ方* | 🔄 *askWhetherToGoOn* | 🔄 *askWhetherToGoOn* | 🔄 *続けるかを問うときの告げ方の決まり。人は確認メッセージで出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *告げ方* | 🔄 *destructiveResult* | 🔄 *destructiveResult* | 🔄 *結果が取り返しのつかない操作の告げ方の決まり。人は確認メッセージで出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *告げ方* | 🔄 *dismissNotification → **notificationDismissed*** | 🔄 *dismissNotification → **notificationDismissed*** | 🔄 *告げた通知を人が消すときの決まり（Enter と Esc で新しいものから消える）。人は画面の端の通知で出会う。* | 🔄 *なし* | 🔄 *案: ほかの行（inputNotAccepted・limitReached）と同じく「起きたこと」を言う行なのに、命令の形でボタンの操作に読めるので、過去分詞の形にする。（V6）* |
| 🔄 *告げ方* | 🔄 *failureNotification* | 🔄 *failureNotification* | 🔄 *失敗を知らせる通知の告げ方の決まり。人は画面の端の通知で出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *告げ方* | 🔄 *inputNotAccepted* | 🔄 *inputNotAccepted* | 🔄 *入力を受け付けないときの告げ方の決まり（どの欄がなぜ誤りかを字で示す）。人はプロパティパネルなどの誤りの知らせで出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *告げ方* | 🔄 *limitReached* | 🔄 *limitReached* | 🔄 *資源の上限に達したときの告げ方の決まり（続けられないことと次の手を示す）。人は通知で出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *告げ方* | 🔄 *notificationWidth* | 🔄 *notificationWidth* | 🔄 *通知の箱の幅の決まり（中身に合わせて変える）。人は画面の端の通知で出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *告げ方* | 🔄 *pendingAtStartup* | 🔄 *pendingAtStartup* | 🔄 *起動時に保留中の用件（今は Agent API の有効化）を 1 枚にまとめて出す決まり。人は起動時の知らせで出会う。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *告げ方* | 🔄 *timedNotification* | 🔄 *timedNotification* | 🔄 *時が経つと消える通知の告げ方の決まり。人は画面の端の通知で出会う。* | 🔄 *なし* | 🔄 *—* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *太字の案のとおりに改め、ほかの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名（今の名・案・別の名）を書く* |

回答:

#### 🔄 *❓ 問 14-8. アイコン（138 語。案 3、BGQA11 へ 27）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *ヘッダー: AI* | 🔄 *Agent API* | 🔄 *Agent API* | 🔄 *ヘッダーの「AI」の群にあるアイコン（IC-20）。Agent API を有効にする。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: AI* | 🔄 *Schedule Image-to-JSON Prompt* | 🔄 *日程の画像をデータ化するプロンプト* | 🔄 *ヘッダーの「AI」の群にあるアイコン（IC-115）。日程の画像を GRS の JSON にさせるプロンプトをクリップボードへ出し、スキーマのファイルをダウンロードする。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Actual Bar* | 🔄 *実績の表示切替* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-9）。実績の表示切替。* | 🔄 *documentSettings.scheduleCanvasElements.isActualBarVisible* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Full Screen* | 🔄 *全画面表示* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-11）。全画面表示の切替。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Larger* | 🔄 *大きく表示* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-105）。日程表の図形と文字を拡大。* | 🔄 *documentSettings.displayScaleRatio* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Light / Dark* | 🔄 *明暗テーマ* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-16）。ライトモードかダークモードの選択。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Monochrome* | 🔄 *モノクロ* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-100）。モノクロで描く。* | 🔄 *documentSettings.isThemeMonochrome* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Plan Bar* | 🔄 *予定の表示切替* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-8）。予定の表示切替。* | 🔄 *documentSettings.scheduleCanvasElements.isPlanBarVisible* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Smaller* | 🔄 *小さく表示* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-104）。日程表の図形と文字を縮小。* | 🔄 *documentSettings.displayScaleRatio* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Zoom In Horizontally* | 🔄 *横に拡大* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-13）。時間軸（横）を拡大。* | 🔄 *documentSettings.dayWidthPx* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Zoom In Vertically* | 🔄 *縦に拡大* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-15）。縦軸を拡大。* | 🔄 *documentSettings.verticalZoom.ratio* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Zoom Out Horizontally* | 🔄 *横に縮小* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-12）。時間軸（横）を縮小。* | 🔄 *documentSettings.dayWidthPx* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Zoom Out Vertically* | 🔄 *縦に縮小* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-14）。縦軸を縮小。* | 🔄 *documentSettings.verticalZoom.ratio* | 🔄 *—* |
| 🔄 *ヘッダー: 表示* | 🔄 *Zoom to Fit* | 🔄 *全体を収める* | 🔄 *ヘッダーの「表示」の群にあるアイコン（IC-10）。日程の全体を表示。* | 🔄 *documentSettings.dayWidthPx・documentSettings.verticalZoom（範囲は documentSettings.fitDayRange）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *ヘッダー: 文書* | 🔄 *Baseline* | 🔄 *変更前の予定* | 🔄 *ヘッダーの「文書」の群にあるアイコン（IC-4）。変更前の予定の表示切替。* | 🔄 *documentSettings.scheduleCanvasElements.isBaselineOutlineVisible（前回予定が無いときは scheduleData.baselineTasks[] を読み込む）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *ヘッダー: 文書* | 🔄 *Copy Image* | 🔄 *画像をコピー* | 🔄 *ヘッダーの「文書」の群にあるアイコン（IC-3）。いまの画像をクリップボードへコピーする。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 文書* | 🔄 *New* | 🔄 *新規作成* | 🔄 *ヘッダーの「文書」の群にあるアイコン（IC-98）。現在の文書を破棄して、新規に文書を作成する。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 文書* | 🔄 *Open…* | 🔄 *開く* | 🔄 *ヘッダーの「文書」の群にあるアイコン（IC-1）。ファイルを開く。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 文書* | 🔄 *Save As…* | 🔄 *書き出して保存* | 🔄 *ヘッダーの「文書」の群にあるアイコン（IC-2）。書き出す形式を選んで保存する。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 履歴* | 🔄 *Redo* | 🔄 *やり直す* | 🔄 *ヘッダーの「履歴」の群にあるアイコン（IC-6）。取り消した編集をやり直す。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 履歴* | 🔄 *Undo* | 🔄 *取り消す* | 🔄 *ヘッダーの「履歴」の群にあるアイコン（IC-5）。直前の編集を取り消す。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 調べる* | 🔄 *Delay Diagnostics* | 🔄 *遅延診断* | 🔄 *ヘッダーの「調べる」の群にあるアイコン（IC-107）。遅延診断を行う。* | 🔄 *なし* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *ヘッダー: 調べる* | 🔄 *Search* | 🔄 *検索* | 🔄 *ヘッダーの「調べる」の群にあるアイコン（IC-117）。検索パネルを出す。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: パレット* | 🔄 *Command Palette* | 🔄 *コマンドパレット* | 🔄 *ヘッダーの「パレット」の群にあるアイコン（IC-7）。コマンドパレットの表示切替。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 補助* | 🔄 *Document Settings* | 🔄 *文書の設定* | 🔄 *ヘッダーの「補助」の群にあるアイコン（IC-17）。文書の描画設定をプロパティパネルに表示する。* | 🔄 *documentSettings* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *ヘッダー: 補助* | 🔄 *Help* | 🔄 *ヘルプ* | 🔄 *ヘッダーの「補助」の群にあるアイコン（IC-22）。ショートカットキーとアイコンの一覧を開く。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘッダー: 補助* | 🔄 *Screen Language* | 🔄 *画面の言語* | 🔄 *ヘッダーの「補助」の群にあるアイコン（IC-21）。画面の言語選択。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット: 揃える* | 🔄 *Align to Finish* | 🔄 *終了日で揃える* | 🔄 *コマンドパレットの「揃える」の群にあるアイコン（IC-38）。選んだものを終了日で揃える。* | 🔄 *scheduleData.tasks[].start・finish* | 🔄 *—* |
| 🔄 *コマンドパレット: 揃える* | 🔄 *Align to Start* | 🔄 *開始日で揃える* | 🔄 *コマンドパレットの「揃える」の群にあるアイコン（IC-37）。選んだものを開始日で揃える。* | 🔄 *scheduleData.tasks[].start・finish* | 🔄 *—* |
| 🔄 *コマンドパレット: 揃える* | 🔄 *Callout* | 🔄 *コメントボックス* | 🔄 *コマンドパレットの「揃える」の群にあるアイコン（IC-35）。コメントボックスを構える。* | 🔄 *scheduleData.commentBoxes[]* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 揃える* | 🔄 *Highlight Box* | 🔄 *ハイライトボックス* | 🔄 *コマンドパレットの「揃える」の群にあるアイコン（IC-36）。ハイライトボックスを構える。* | 🔄 *scheduleData.highlightBoxes[]* | 🔄 *—* |
| 🔄 *コマンドパレット: 揃える* | 🔄 *Link Tasks* | 🔄 *依存線を引く* | 🔄 *コマンドパレットの「揃える」の群にあるアイコン（IC-61）。依存線を構える。* | 🔄 *scheduleData.tasks[].predecessorLinks[]* | 🔄 *—* |
| 🔄 *コマンドパレット: 構え* | 🔄 *Current Tool* | 🔄 *構えている図形* | 🔄 *コマンドパレットの「構え」の群にあるアイコン（IC-54）。いま構えている図形。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット: カーソル* | 🔄 *Crosshair* | 🔄 *十字* | 🔄 *コマンドパレットの「カーソル」の群にあるアイコン（IC-47）。ガイドカーソルを十字にする。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット: カーソル* | 🔄 *Dual Cursor* | 🔄 *デュアルカーソル* | 🔄 *コマンドパレットの「カーソル」の群にあるアイコン（IC-45）。デュアルカーソルの 2 本を置く。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット: カーソル* | 🔄 *Planned Dates* | 🔄 *予定日* | 🔄 *コマンドパレットの「カーソル」の群にあるアイコン（IC-103）。タスクとマイルストーンの名前の右に予定日を表示する。* | 🔄 *documentSettings.scheduleCanvasElements.isPlanDatesVisible* | 🔄 *—* |
| 🔄 *コマンドパレット: カーソル* | 🔄 *Single Vertical → **Single Vertical Line*** | 🔄 *縦 1 本* | 🔄 *コマンドパレットの「カーソル」の群にあるアイコン（IC-48）。ガイドカーソルを縦 1 本にする。* | 🔄 *なし* | 🔄 *案: 「Single Vertical」は形容だけで名詞が無いので、隣の Crosshair のように物の名にする。（V6）* |
| 🔄 *コマンドパレット: カーソル* | 🔄 *Status Date* | 🔄 *基準日* | 🔄 *コマンドパレットの「カーソル」の群にあるアイコン（IC-44）。基準日を置く・動かす・消す。* | 🔄 *scheduleData.project.statusDate* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Assignee Label* | 🔄 *担当ラベル* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-79）。担当ラベルを表示する。* | 🔄 *documentSettings.scheduleCanvasElements.isAssigneeLabelVisible* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Date Grid Lines* | 🔄 *日付罫線* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-42）。日付罫線を表示する。* | 🔄 *documentSettings.scheduleCanvasElements.isDateGridLinesVisible* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Font Size* | 🔄 *文字サイズ* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-99）。文字サイズを 1 段大きくする。* | 🔄 *documentSettings.fontSizePreset* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Group Grid Lines* | 🔄 *グループ罫線* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-43）。グループ罫線を表示する。* | 🔄 *documentSettings.scheduleCanvasElements.isTaskGroupGridLinesVisible* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Interaction Log* | 🔄 *デバッグ用ログ取得の開始/停止* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-76）。マウス操作と画面描画の記録を始める。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Percent Complete Label* | 🔄 *完了率ラベル* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-80）。完了率ラベルを表示する。* | 🔄 *documentSettings.scheduleCanvasElements.isPercentCompleteLabelVisible* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Progress Line* | 🔄 *イナズマ線* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-39）。イナズマ線を表示する。* | 🔄 *documentSettings.scheduleCanvasElements.isProgressLineVisible* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Progress Marker* | 🔄 *進捗マーカー* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-40）。進捗マーカーと再開アイコンを表示する。* | 🔄 *documentSettings.scheduleCanvasElements.isProgressStatusMarkVisible* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Resource List* | 🔄 *担当リスト* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-62）。文書が持つ担当の一覧を表示する。* | 🔄 *scheduleData.resources[]* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Set Parent Task* | 🔄 *親タスク設定* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-142）。親タスクを結ぶ構え。* | 🔄 *scheduleData.tasks[].parentTaskUid* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Show Dependency Lines* | 🔄 *依存線の表示* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-81）。依存線を表示する。* | 🔄 *documentSettings.scheduleCanvasElements.isDependencyLineVisible* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Show Parent Tasks* | 🔄 *親タスク表示* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-141）。親タスクと子タスクを、子タスクから親タスクへの矢印で表示する。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Stack Direction → **Task Placement Direction*** | 🔄 *日程が重複するタスクを積む向き → **重なるタスクを置く向き*** | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-101）。バーを積む向きを、上向きと下向きで入れ替える。* | 🔄 *documentSettings.taskPlacementDirection* | 🔄 *案: 書き換える GRS JSON の鍵が taskPlacementDirection（JDG-3731 で stackDirection から改名）なので鍵の語に揃え、長い日本語を縮める（凍結済み K-73 の画面ラベルも同じ判断が要る）。（V4 V8）* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Watermark…* | 🔄 *透かしを非表示（パスワードが必要）* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-41）。透かしの表示切替。* | 🔄 *なし* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 表示* | 🔄 *Working Time…* | 🔄 *休日の設定* | 🔄 *コマンドパレットの「表示」の群にあるアイコン（IC-132）。稼働する曜日・休業日・週の始まりを直す面を開く。* | 🔄 *scheduleData.calendars[]・scheduleData.project.weekStartDay* | 🔄 *—* |
| 🔄 *コマンドパレット: 枠* | 🔄 *Drag to Move* | 🔄 *掴んで動かす* | 🔄 *コマンドパレットの掴み帯にあるアイコン（IC-53）。ここを掴むとコマンドパレットを動かせる。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット: 枠* | 🔄 *Minimize* | 🔄 *最小化* | 🔄 *コマンドパレットの掴み帯にあるアイコン（IC-75）。コマンドパレットを最小化する。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Arrow* | 🔄 *矢印* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-25）。矢印を構える。* | 🔄 *scheduleData.tasks[].grs.style.taskShape = arrow* | 🔄 *—* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Chevron* | 🔄 *矢羽根* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-24）。矢羽根を構える。* | 🔄 *scheduleData.tasks[].grs.style.taskShape = chevron* | 🔄 *—* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Endpoint Span* | 🔄 *端点スパン* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-26）。端点スパンを構える。* | 🔄 *scheduleData.tasks[].grs.style.taskShape = dumbbell* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone* | 🔄 *マイルストーン* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-50）。マイルストーン形状の一覧を展開する。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Beer Mug)* | 🔄 *マイルストーン（ビールジョッキ）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-89）。ビールジョッキ のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = beerMug* | 🔄 *—* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Box)* | 🔄 *マイルストーン（ボックス）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-84）。ボックス のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = box* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Circle)* | 🔄 *マイルストーン（〇）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-27）。〇 のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = circle* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Cylinder)* | 🔄 *マイルストーン（円筒）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-86）。円筒 のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = cylinder* | 🔄 *—* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Diamond)* | 🔄 *マイルストーン（◇）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-30）。◇ のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = diamond* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (File)* | 🔄 *マイルストーン（ファイル）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-83）。ファイル のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = file* | 🔄 *—* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Floppy Disk)* | 🔄 *マイルストーン（フロッピー）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-85）。フロッピー のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = floppyDisk* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Hexagon)* | 🔄 *マイルストーン（六角形）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-28）。六角形のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = hexagon* | 🔄 *—* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Meeting People)* | 🔄 *マイルストーン（会議の人）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-87）。会議の人 のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = meetingPeople* | 🔄 *—* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Pentagon)* | 🔄 *マイルストーン（五角形）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-29）。五角形のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = pentagon* | 🔄 *—* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Smiling Face)* | 🔄 *マイルストーン（嬉しい顔）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-88）。嬉しい顔 のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = smilingFace* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Square)* | 🔄 *マイルストーン（□）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-31）。□ のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = square* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Star)* | 🔄 *マイルストーン（☆）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-32）。☆ のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = star* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Triangle Down)* | 🔄 *マイルストーン（▽）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-34）。▽ のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = triangleDown* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Milestone (Triangle Up)* | 🔄 *マイルストーン（△）* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-33）。△ のマイルストーンを構える。* | 🔄 *scheduleData.tasks[].milestone = true・grs.style.milestoneShape = triangleUp* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *コマンドパレット: 置く* | 🔄 *Rectangle* | 🔄 *矩形* | 🔄 *コマンドパレットの「置く」の群にあるアイコン（IC-23）。矩形を構える。* | 🔄 *scheduleData.tasks[].grs.style.taskShape = rectangle* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Adopt All Recommended → **Check All Recommended*** | 🔄 *推奨案をすべて採用する → **推奨案をすべてチェック*** | 🔄 *遅延診断レポートにあるアイコン（IC-166）。修正のしかたが機械の行と、択が 1 つの選ぶの行に、まとめてチェックを入れる。* | 🔄 *なし* | 🔄 *案: 押しても修正は当てずチェックを入れるだけなので、「採用」ではなく隣の Check All と同じ「チェック」で呼ぶ。（V1）* |
| 🔄 *遅延診断レポート* | 🔄 *Back Up the Schedule Under Another Name and Fix* | 🔄 *スケジュールを別名でバックアップして修正* | 🔄 *遅延診断レポートにあるアイコン（IC-158）。修正する前のスケジュールを別名で保存してから、チェックした行を修正する。* | 🔄 *scheduleData.tasks[]（チェックした修正を当てる）* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Copy* | 🔄 *Copy* | 🔄 *遅延診断レポートにあるアイコン（IC-108）。遅延診断レポートを Markdown でクリップボードへコピーする。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Diagnose Again* | 🔄 *再診断* | 🔄 *遅延診断レポートにあるアイコン（IC-168）。いまの文書で遅延診断をやり直す。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Diagnosis* | 🔄 *診断結果* | 🔄 *遅延診断レポートにあるアイコン（IC-154）。診断の結果の表を出す。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Fix Log* | 🔄 *修正の記録* | 🔄 *遅延診断レポートにあるアイコン（IC-156）。修正の記録の表を出す。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Fix Proposals* | 🔄 *修正案* | 🔄 *遅延診断レポートにあるアイコン（IC-155）。修正案の表を出す（修正前と修正後）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Next* | 🔄 *次へ* | 🔄 *遅延診断レポートにあるアイコン（IC-160）。人が修正する次の指摘へ移る。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Overwrite and Fix* | 🔄 *上書きして修正* | 🔄 *遅延診断レポートにあるアイコン（IC-157）。今のファイルに上書きして保存してから、チェックした行を修正する。* | 🔄 *scheduleData.tasks[]（チェックした修正を当てる）* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Previous* | 🔄 *前へ* | 🔄 *遅延診断レポートにあるアイコン（IC-159）。人が修正する 1 つ前の指摘へ移る。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Save As .tsv* | 🔄 *.tsv で保存* | 🔄 *遅延診断レポートにあるアイコン（IC-169）。修正の記録の表を .tsv のファイルに書き出す。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *遅延診断レポート* | 🔄 *Save as Markdown…* | 🔄 *.md* | 🔄 *遅延診断レポートにあるアイコン（IC-140）。本レポートをMarkdownで出力する。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *差分の確認* | 🔄 *Cancel Import* | 🔄 *取り込みをやめる* | 🔄 *差分の確認にあるアイコン（IC-97）。取り込みをやめ、取り込み前と同じ状態へ戻す。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *差分の確認* | 🔄 *Keep Both* | 🔄 *両方とも残す* | 🔄 *差分の確認にあるアイコン（IC-96）。重複しているタスクを、別のものとして両方とも残す。* | 🔄 *scheduleData.tasks[]（grs.importOrigin）* | 🔄 *—* |
| 🔄 *差分の確認* | 🔄 *Use Opened File* | 🔄 *開いたファイルから取る* | 🔄 *差分の確認にあるアイコン（IC-95）。重複しているタスクを、開いたファイルの値で取り込む。* | 🔄 *scheduleData.tasks[]（grs.importOrigin）* | 🔄 *—* |
| 🔄 *ヘルプ* | 🔄 *Help Language* | 🔄 *ヘルプの言語* | 🔄 *ヘルプにあるアイコン（IC-128）。ヘルプの中の言語だけを選ぶ。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ヘルプ* | 🔄 *Wheel* | 🔄 *ホイール* | 🔄 *ヘルプにあるアイコン（IC-102）。ホイールを回す操作を示す印。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *休日の設定* | 🔄 *+* | 🔄 *＋* | 🔄 *休日の設定にあるアイコン（IC-163）。時間帯を 1 本足す。* | 🔄 *scheduleData.calendars[].weekDays[].workingTimes[]* | 🔄 *—* |
| 🔄 *休日の設定* | 🔄 *Add* | 🔄 *追加* | 🔄 *休日の設定にあるアイコン（IC-135）。例外日の行を追加する。* | 🔄 *scheduleData.calendars[].exceptions[]* | 🔄 *—* |
| 🔄 *休日の設定* | 🔄 *Apply* | 🔄 *適用* | 🔄 *休日の設定にあるアイコン（IC-138）。下書きを文書へ適用する。* | 🔄 *scheduleData.calendars[]・scheduleData.project.weekStartDay* | 🔄 *—* |
| 🔄 *休日の設定* | 🔄 *Day Off* | 🔄 *休み* | 🔄 *休日の設定にあるアイコン（IC-137）。この例外日を休みにするか稼働にするかを切り替える。* | 🔄 *scheduleData.calendars[].exceptions[].dayWorking* | 🔄 *—* |
| 🔄 *休日の設定* | 🔄 *Delete* | 🔄 *削除* | 🔄 *休日の設定にあるアイコン（IC-164）。この時間帯を消す（適用するまで文書は変わらない）。* | 🔄 *scheduleData.calendars[].weekDays[].workingTimes[]* | 🔄 *—* |
| 🔄 *休日の設定* | 🔄 *Delete* | 🔄 *削除* | 🔄 *休日の設定にあるアイコン（IC-136）。この例外日の行を削除する（適用するまで文書は変わらない）。* | 🔄 *scheduleData.calendars[].exceptions[]* | 🔄 *—* |
| 🔄 *休日の設定* | 🔄 *Time* | 🔄 *時刻* | 🔄 *休日の設定にあるアイコン（IC-165）。時刻を 1 分の単位で打つ（例 8:00、終わりの 0:00 は 24:00）。* | 🔄 *scheduleData.calendars[].weekDays[].workingTimes[].fromTime・toTime* | 🔄 *—* |
| 🔄 *休日の設定* | 🔄 *Week Starts On* | 🔄 *週の始まり* | 🔄 *休日の設定にあるアイコン（IC-134）。週の目盛が書く曜日を選ぶ。* | 🔄 *scheduleData.project.weekStartDay* | 🔄 *—* |
| 🔄 *休日の設定* | 🔄 *Weekday* | 🔄 *曜日* | 🔄 *休日の設定にあるアイコン（IC-133）。この曜日を稼働にするか休みにするかを切り替える（適用するまで文書は変わらない）。* | 🔄 *scheduleData.calendars[].weekDays[].dayWorking* | 🔄 *—* |
| 🔄 *開き方の選択* | 🔄 *Merge* | 🔄 *合流させる* | 🔄 *開き方の選択にあるアイコン（IC-72）。開くファイルの内容を現在の文書に追加する。* | 🔄 *scheduleData.tasks[] ほか（開いたファイルの中身を足す）* | 🔄 *—* |
| 🔄 *開き方の選択* | 🔄 *Overlay as Baseline* | 🔄 *重ねる* | 🔄 *開き方の選択にあるアイコン（IC-73）。開くファイルの内容を変更前の予定として重ねる。* | 🔄 *scheduleData.baselineTasks[]* | 🔄 *—* |
| 🔄 *開き方の選択* | 🔄 *Replace* | 🔄 *置き換える* | 🔄 *開き方の選択にあるアイコン（IC-71）。開くファイルで現在の文書を置き換える。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *プロパティパネル* | 🔄 *GRS Reset* | 🔄 *GRS リセット* | 🔄 *プロパティパネルにあるアイコン（IC-139）。GRS がこのブラウザに覚えた値を消して、ページを読み直す。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *プロパティパネル* | 🔄 *Time Shift* | 🔄 *タイムシフト* | 🔄 *プロパティパネルにあるアイコン（IC-162）。入れた量だけ、日程の日時を一斉にずらす。* | 🔄 *scheduleData.tasks[] の日時（start・finish・actualStart ほか）* | 🔄 *—* |
| 🔄 *担当リスト* | 🔄 *Delete* | 🔄 *削除* | 🔄 *担当リストにあるアイコン（IC-66）。選んだ担当を削除する。* | 🔄 *scheduleData.resources[]（解かれる assignments[] も）* | 🔄 *—* |
| 🔄 *担当リスト* | 🔄 *Deselect All* | 🔄 *選択をすべて解除* | 🔄 *担当リストにあるアイコン（IC-64）。リストの選択をすべて解除する。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *担当リスト* | 🔄 *Not Selected* | 🔄 *未選択* | 🔄 *担当リストにあるアイコン（IC-68）。この担当は選ばれていない。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *担当リスト* | 🔄 *Select All* | 🔄 *すべて選択* | 🔄 *担当リストにあるアイコン（IC-63）。リストのすべての担当を選択する。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *担当リスト* | 🔄 *Select Unreferenced* | 🔄 *未参照を選択* | 🔄 *担当リストにあるアイコン（IC-65）。どの割当からも参照されていない担当を選択する。* | 🔄 *scheduleData.assignments[].resourceUid（読むだけ）* | 🔄 *—* |
| 🔄 *担当リスト* | 🔄 *Selected* | 🔄 *選択中* | 🔄 *担当リストにあるアイコン（IC-67）。この担当は選ばれている。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *検索パネル* | 🔄 *Callouts* | 🔄 *コメントボックス* | 🔄 *検索パネルにあるアイコン（IC-119）。コメントボックスの表を出す。* | 🔄 *scheduleData.commentBoxes[]* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *検索パネル* | 🔄 *Tasks* | 🔄 *タスク* | 🔄 *検索パネルにあるアイコン（IC-118）。タスクとマイルストーンの表を出す。* | 🔄 *scheduleData.tasks[]* | 🔄 *—* |
| 🔄 *表のウィンドウ* | 🔄 *Check All* | 🔄 *すべてチェック* | 🔄 *表のウィンドウにあるアイコン（IC-125）。一覧に出ているすべての値にチェックを付ける。* | 🔄 *documentSettings.tableWindows.*.columnFilters[]（プロパティパネルでは scheduleData.assignments[]）* | 🔄 *—* |
| 🔄 *表のウィンドウ* | 🔄 *Clear Filters* | 🔄 *フィルタをクリア* | 🔄 *表のウィンドウにあるアイコン（IC-153）。この表のすべての列のフィルタをクリアし、並びを元の順に戻す。* | 🔄 *documentSettings.tableWindows.*.columnFilters[]・columnSort* | 🔄 *—* |
| 🔄 *表のウィンドウ* | 🔄 *Filter* | 🔄 *フィルタ* | 🔄 *表のウィンドウにあるアイコン（IC-122）。この列のフィルタと並べ替えを開く。* | 🔄 *documentSettings.tableWindows.*.columnFilters[]・columnSort* | 🔄 *—* |
| 🔄 *表のウィンドウ* | 🔄 *Font Size* | 🔄 *文字サイズ* | 🔄 *表のウィンドウにあるアイコン（IC-127）。タイトルバーと表と入力欄の文字サイズを変える（9・10・12 px を順に巡る）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *表のウィンドウ* | 🔄 *Schedule Filter* | 🔄 *スケジュールフィルタ* | 🔄 *表のウィンドウにあるアイコン（IC-143）。スケジュールフィルタの切替。* | 🔄 *documentSettings.tableWindows.*.isScheduleFilteredByChecks* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *表のウィンドウ* | 🔄 *Sort Ascending* | 🔄 *昇順* | 🔄 *表のウィンドウにあるアイコン（IC-123）。この列で昇順に並べる。* | 🔄 *documentSettings.tableWindows.*.columnSort* | 🔄 *—* |
| 🔄 *表のウィンドウ* | 🔄 *Sort Descending* | 🔄 *降順* | 🔄 *表のウィンドウにあるアイコン（IC-124）。この列で降順に並べる。* | 🔄 *documentSettings.tableWindows.*.columnSort* | 🔄 *—* |
| 🔄 *表のウィンドウ* | 🔄 *Uncheck All* | 🔄 *チェックをすべて外す* | 🔄 *表のウィンドウにあるアイコン（IC-126）。一覧に出ているすべての値のチェックを外す。* | 🔄 *documentSettings.tableWindows.*.columnFilters[]（プロパティパネルでは scheduleData.assignments[]）* | 🔄 *—* |
| 🔄 *タスクグループパネル* | 🔄 *Add Below* | 🔄 *配下に追加* | 🔄 *タスクグループパネルにあるアイコン（IC-91）。このタスクグループの配下にタスクグループを 1 つ追加する。* | 🔄 *scheduleData.taskGroups[]（parentTaskGroupId）* | 🔄 *—* |
| 🔄 *タスクグループパネル* | 🔄 *Add Top Task Group* | 🔄 *最も浅い段に追加* | 🔄 *タスクグループパネルにあるアイコン（IC-93）。最も浅い段にタスクグループを 1 つ追加する。* | 🔄 *scheduleData.taskGroups[]* | 🔄 *—* |
| 🔄 *タスクグループパネル* | 🔄 *Collapse* | 🔄 *折りたたむ* | 🔄 *タスクグループパネルにあるアイコン（IC-59）。このタスクグループ自身を折りたたむ。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *タスクグループパネル* | 🔄 *Collapse All* | 🔄 *すべて折りたたむ* | 🔄 *タスクグループパネルにあるアイコン（IC-78）。すべてのタスクグループを折りたたむ。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *タスクグループパネル* | 🔄 *Collapse Below* | 🔄 *配下をすべて折りたたむ* | 🔄 *タスクグループパネルにあるアイコン（IC-77）。このタスクグループの配下をすべて折りたたむ。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *タスクグループパネル* | 🔄 *Delete All Task Groups* | 🔄 *すべてのタスクグループを削除* | 🔄 *タスクグループパネルにあるアイコン（IC-106）。すべてのタスクグループと、載っているタスクを削除する。* | 🔄 *scheduleData.taskGroups[]（載っている tasks[] も）* | 🔄 *—* |
| 🔄 *タスクグループパネル* | 🔄 *Delete Task Group* | 🔄 *タスクグループを削除* | 🔄 *タスクグループパネルにあるアイコン（IC-82）。このタスクグループと、その配下のタスクグループと、載っているタスクを削除する。* | 🔄 *scheduleData.taskGroups[]（載っている tasks[] も）* | 🔄 *—* |
| 🔄 *タスクグループパネル* | 🔄 *Expand All* | 🔄 *すべて展開する* | 🔄 *タスクグループパネルにあるアイコン（IC-74）。折りたたんだタスクグループをすべて展開する。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *タスクグループパネル* | 🔄 *Expand Below* | 🔄 *配下をすべて展開する* | 🔄 *タスクグループパネルにあるアイコン（IC-58）。このタスクグループの配下をすべて展開する。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *タスクグループパネル* | 🔄 *Expand One Level* | 🔄 *1 階層だけ展開する* | 🔄 *タスクグループパネルにあるアイコン（IC-90）。このタスクグループの直下の子だけを展開する。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *タスクグループパネル* | 🔄 *Pin* | 🔄 *ピン止め* | 🔄 *タスクグループパネルにあるアイコン（IC-60）。タスクグループをピン止めして画面に残す。* | 🔄 *documentSettings.pinnedTaskGroupIds[]* | 🔄 *—* |
| 🔄 *タスクグループパネル* | 🔄 *Show Top Level Only* | 🔄 *最も浅い段を 1 階層展開する* | 🔄 *タスクグループパネルにあるアイコン（IC-92）。最も浅い段のタスクグループだけを戻す。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *ウィンドウ共通* | 🔄 *Close* | 🔄 *閉じる* | 🔄 *ウィンドウ共通にあるアイコン（IC-52）。開いている面を閉じる。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ウィンドウ共通* | 🔄 *Maximize* | 🔄 *最大化* | 🔄 *ウィンドウ共通にあるアイコン（IC-130）。ウィンドウを最大化する。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ウィンドウ共通* | 🔄 *Minimize* | 🔄 *最小化* | 🔄 *ウィンドウ共通にあるアイコン（IC-129）。ウィンドウを最小化する。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ウィンドウ共通* | 🔄 *Restore* | 🔄 *元のサイズに戻す* | 🔄 *ウィンドウ共通にあるアイコン（IC-131）。最大化したウィンドウを元のサイズに戻す。* | 🔄 *なし* | 🔄 *—* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *太字の案のとおりに改め、ほかの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名（今の名・案・別の名）を書く* |

回答:

#### 🔄 *❓ 問 14-9. パレットグループ（5 語。案 0、BGQA11 へ 0）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *コマンドパレットの群* | 🔄 *Align* | 🔄 *揃える* | 🔄 *コマンドパレットの、依存線・注記を構える入口と、開始日・終了日で揃える入口の群の名。群の名は画面に刷らない（FR-053）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレットの群* | 🔄 *Current Tool* | 🔄 *構え* | 🔄 *コマンドパレットの、いま構えている道具を示す群の名。群の名は画面に刷らない（FR-053）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレットの群* | 🔄 *Cursors* | 🔄 *カーソル* | 🔄 *コマンドパレットの、予定日・基準日・ガイドカーソル・デュアルカーソルの入口の群の名。群の名は画面に刷らない（FR-053）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレットの群* | 🔄 *Display* | 🔄 *表示* | 🔄 *コマンドパレットの、描くものを表示・非表示にする入口の群の名。群の名は画面に刷らない（FR-053）。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *コマンドパレットの群* | 🔄 *Place* | 🔄 *置く* | 🔄 *コマンドパレットの、タスク形状とマイルストーン形状を構える入口の群の名。群の名は画面に刷らない（FR-053）。* | 🔄 *なし* | 🔄 *—* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *このグループの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名を書く* |

回答:

#### 🔄 *❓ 問 14-10. タスクグループレーンズに描く部品（33 語。案 2、BGQA11 へ 3）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *注記* | 🔄 *Annotation* | 🔄 *注記* | 🔄 *コメントボックスとハイライトボックスをまとめて呼ぶ語。レーンをまたいで描く。* | 🔄 *scheduleData.commentBoxes[]・highlightBoxes[]* | 🔄 *—* |
| 🔄 *注記* | 🔄 *Comment Box* | 🔄 *コメントボックス* | 🔄 *日程表に置く文字の箱。引出し線でタスク・ハイライトボックス・任意の点を指す。* | 🔄 *scheduleData.commentBoxes[]* | 🔄 *—* |
| 🔄 *注記* | 🔄 *Highlight Box* | 🔄 *ハイライトボックス* | 🔄 *日程表で、日の範囲とタスクグループの範囲を囲んで目立たせる矩形。* | 🔄 *scheduleData.highlightBoxes[]* | 🔄 *—* |
| 🔄 *注記* | 🔄 *Leader Anchor → **Leader Target*** | 🔄 *線先* | 🔄 *引出し線の端で、コメントボックスが指している所。* | 🔄 *scheduleData.commentBoxes[].leaderTarget* | 🔄 *案: 凍結した GRS JSON が同じ「引出し線の先」を leaderTarget と呼ぶので英語を揃える（JDG-3348・JDG-3373 を覆す）。（V4）* |
| 🔄 *注記* | 🔄 *Leader Line* | 🔄 *引出し線* | 🔄 *コメントボックスから、指している所へ引く線。* | 🔄 *scheduleData.commentBoxes[].leaderTarget* | 🔄 *—* |
| 🔄 *日程表全体の線* | 🔄 *Date Grid Lines* | 🔄 *日付罫線* | 🔄 *日程表で、日付ごとに引く縦の罫線。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *日程表全体の線* | 🔄 *Group Grid Lines* | 🔄 *グループ罫線* | 🔄 *日程表で、タスクグループの境に引く横の罫線。* | 🔄 *なし* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *日程表全体の線* | 🔄 *Progress Line* | 🔄 *イナズマ線* | 🔄 *日程表で、基準日から各タスクの進捗点を結ぶジグザグの線。遅れの広がりを示す。* | 🔄 *なし（scheduleData.project.statusDate と各タスクの進み具合から描く）* | 🔄 *—* |
| 🔄 *日程表全体の線* | 🔄 *Status Line* | 🔄 *基準日線* | 🔄 *日程表で、基準日の位置に引く縦線。今日とは限らない。* | 🔄 *scheduleData.project.statusDate* | 🔄 *—* |
| 🔄 *依存線* | 🔄 *Arrowhead* | 🔄 *矢じり* | 🔄 *依存線の後続側の端の矢じり。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *依存線* | 🔄 *Continuation Mark* | 🔄 *続きマーク* | 🔄 *依存線が見えている範囲の外へ続くことを示す印。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *依存線* | 🔄 *Dependency Line* | 🔄 *依存線* | 🔄 *日程表で、依存関係を示すためにレーンをまたいで引く線。* | 🔄 *scheduleData.tasks[].predecessorLinks[]* | 🔄 *—* |
| 🔄 *レーンと段* | 🔄 *Graphics* | 🔄 *図形* | 🔄 *タスクグループレーンズに描くものすべてをまとめて呼ぶ語。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *レーンと段* | 🔄 *Stack Tier* | 🔄 *積み段* | 🔄 *タスクグループレーンの中の横の段。日程が重なるタスクを自動で別の段に積む。* | 🔄 *なし（向きは documentSettings.taskPlacementDirection）* | 🔄 *—* |
| 🔄 *レーンと段* | 🔄 *Task Group Lane* | 🔄 *タスクグループレーン* | 🔄 *タスクグループレーンズの中の、タスクグループ 1 つぶんの横の帯。* | 🔄 *scheduleData.taskGroups[]* | 🔄 *—* |
| 🔄 *レーンと段* | 🔄 *Task Group Lanes* | 🔄 *タスクグループレーンズ* | 🔄 *スケジュールキャンバスの中で、タイムルーラーと余白を除いた、タスクを描く領域全体。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *タスク図形: バーと印* | 🔄 *Actual Bar* | 🔄 *実績バー* | 🔄 *日程表で、タスクの実績の期間を示すバー。* | 🔄 *scheduleData.tasks[].actualStart・actualFinish* | 🔄 *—* |
| 🔄 *タスク図形: バーと印* | 🔄 *Actual Dummy* | 🔄 *実績ダミー* | 🔄 *未着手のタスクに薄く出す、まだ始まっていない実績の掴み代。文書には保存しない。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *タスク図形: バーと印* | 🔄 *Baseline Outline* | 🔄 *変更前予定輪郭* | 🔄 *前回予定を重ねたとき、タスクの上に描く前の予定の輪郭。* | 🔄 *scheduleData.baselineTasks[]* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *タスク図形: バーと印* | 🔄 *Fade Ramp → **Slope*** | 🔄 *フェード斜面 → **傾き*** | 🔄 *予定バーの端を斜めに落とした部分で、日付が確定していないことを示す。* | 🔄 *scheduleData.tasks[].grs.startSlopeCalendarDays・finishSlopeCalendarDays* | 🔄 *案: 凍結した GRS JSON が JDG-3732 で fadeIn を startSlopeCalendarDays に改名し同じ斜めの端を Slope と呼ぶので揃える（JDG-3373 を覆す）。（V4 V11）* |
| 🔄 *タスク図形: バーと印* | 🔄 *Milestone Mark* | 🔄 *マイルストーンマーク* | 🔄 *日程表で、マイルストーンに描く印。* | 🔄 *scheduleData.tasks[].milestone・grs.style.milestoneShape* | 🔄 *—* |
| 🔄 *タスク図形: バーと印* | 🔄 *Plan Bar* | 🔄 *予定バー* | 🔄 *日程表で、タスクの予定の期間を示すバー。* | 🔄 *scheduleData.tasks[].start・finish* | 🔄 *—* |
| 🔄 *タスク図形: バーと印* | 🔄 *Plan-Actual Guide Line* | 🔄 *予実補助線* | 🔄 *日程表で、タスクの予定と実績のあいだに引く補助線。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *タスク図形: バーと印* | 🔄 *Task Bars* | 🔄 *タスクバー* | 🔄 *日程表のタスクに描く予定バーと実績バーをまとめて呼ぶ語。* | 🔄 *scheduleData.tasks[].start・finish・actualStart・actualFinish* | 🔄 *—* |
| 🔄 *タスク図形: バーと印* | 🔄 *Task Graphic* | 🔄 *タスク図形* | 🔄 *1 つのタスクのために描くものすべて（バー・印・ラベル）をまとめて呼ぶ語。* | 🔄 *scheduleData.tasks[]* | 🔄 *—* |
| 🔄 *タスク図形: ラベル* | 🔄 *Assignee Label* | 🔄 *担当ラベル* | 🔄 *日程表で、タスクの横に描く担当の名。* | 🔄 *scheduleData.assignments[]・resources[].name* | 🔄 *—* |
| 🔄 *タスク図形: ラベル* | 🔄 *Name Label* | 🔄 *名称ラベル* | 🔄 *日程表で、タスクの横に描くタスク名。* | 🔄 *scheduleData.tasks[].name* | 🔄 *—* |
| 🔄 *タスク図形: ラベル* | 🔄 *Percent Complete Label* | 🔄 *完了率ラベル* | 🔄 *日程表で、タスクの横に描く完了率。* | 🔄 *scheduleData.tasks[].percentComplete* | 🔄 *—* |
| 🔄 *タスク図形: ラベル* | 🔄 *Task Labels* | 🔄 *タスクラベル* | 🔄 *タスクの横に描く文字（名称・担当・完了率）をまとめて呼ぶ語。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *タスク図形: 状態の印* | 🔄 *Deadline Mark* | 🔄 *期限マーク* | 🔄 *日程表で、タスクの期限の位置に描く印。* | 🔄 *scheduleData.tasks[].deadline* | 🔄 *—* |
| 🔄 *タスク図形: 状態の印* | 🔄 *Progress Mark* | 🔄 *進捗マーク* | 🔄 *実績バーの端の外に出す印。形で進捗ステータスを示し、押すと状態が変わる。* | 🔄 *scheduleData.tasks[].actualStart・actualFinish・stop・resume から導く（表示は documentSettings.scheduleCanvasElements.isProgressStatusMarkVisible）* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *タスク図形: 状態の印* | 🔄 *Resume Dash Line* | 🔄 *再開破線* | 🔄 *作業が止まった所から再開マークまで引く破線。* | 🔄 *scheduleData.tasks[].stop・resume* | 🔄 *—* |
| 🔄 *タスク図形: 状態の印* | 🔄 *Resume Mark* | 🔄 *再開マーク* | 🔄 *中断したタスクの再開予定の位置に描く印。* | 🔄 *scheduleData.tasks[].resume* | 🔄 *—* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *太字の案のとおりに改め、ほかの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名（今の名・案・別の名）を書く* |

回答:

#### 🔄 *❓ 問 14-11. マウスで操作するもの（29 語。案 2、BGQA11 へ 1）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *掴む所* | 🔄 *Grab Area* | 🔄 *掴み領域* | 🔄 *バーの本体・依存線・帯のように、面や線として掴める所。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *掴む所* | 🔄 *Grab Margin* | 🔄 *掴み代* | 🔄 *掴み点や掴み領域のまわりで、押しても掴めたことにする幅。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *掴む所* | 🔄 *Grab Point* | 🔄 *掴み点* | 🔄 *バーの端・斜めの端・箱の角のように、点として掴める所。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *掴む所* | 🔄 *Pointer* | 🔄 *ポインター* | 🔄 *日程表などでマウスが指している点。カーソルとは呼ばない。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *グリップ* | 🔄 *Grip* | 🔄 *グリップ* | 🔄 *掴み領域のうち、いつも描いておく持ち手。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *グリップ* | 🔄 *Palette Grip* | 🔄 *パレットグリップ* | 🔄 *コマンドパレットの上端の帯。掴んでパレットを動かす。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *グリップ* | 🔄 *Task Group Grip* | 🔄 *タスクグループグリップ* | 🔄 *タスクグループパネルで、タスクグループ名のすぐ前に出る持ち手。掴んで並べ替える。* | 🔄 *scheduleData.taskGroups[].parentTaskGroupId・siblingIndex* | 🔄 *—* |
| 🔄 *ハンドル* | 🔄 *Fade Handle → **Slope Handle*** | 🔄 *フェードハンドル → **傾きハンドル*** | 🔄 *選んだ予定バーの斜めの端に出るハンドル。ドラッグで傾きを変える。* | 🔄 *scheduleData.tasks[].grs.startSlopeCalendarDays・finishSlopeCalendarDays* | 🔄 *案: このハンドルが書き換えるのは GRS JSON の startSlopeCalendarDays・finishSlopeCalendarDays なので、Fade ではなく Slope で呼ぶ。（V4）* |
| 🔄 *ハンドル* | 🔄 *Handle* | 🔄 *ハンドル* | 🔄 *選んでいるあいだだけ掴み点に描く印。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ハンドル* | 🔄 *Leader Anchor Handle → **Leader Target Handle*** | 🔄 *線先ハンドル* | 🔄 *選んだコメントボックスの引出し線の先に出るハンドル。* | 🔄 *scheduleData.commentBoxes[].leaderTarget* | 🔄 *案: ハンドルが動かすのは GRS JSON の commentBoxes[].leaderTarget なので、Leader Anchor ではなく Leader Target で呼ぶ。（V4）* |
| 🔄 *ハンドル* | 🔄 *Resize Handle* | 🔄 *サイズ変更ハンドル* | 🔄 *選んだハイライトボックスの角と辺に出る 8 つのハンドル。* | 🔄 *scheduleData.highlightBoxes[].firstDay・lastDay・firstTaskGroupId・lastTaskGroupId* | 🔄 *—* |
| 🔄 *操作合図* | 🔄 *Dependency End Outline* | 🔄 *依存線端囲み* | 🔄 *選んだ依存線の両端のタスクを囲む輪郭。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *操作合図* | 🔄 *Drag Copy* | 🔄 *ドラッグ中コピー* | 🔄 *タスクグループをドラッグしているあいだ、ポインターについてくる写し。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *操作合図* | 🔄 *Drop Cue* | 🔄 *ドロップ案内* | 🔄 *ファイルをウィンドウの上にドラッグしているあいだ、スケジュールキャンバスを薄く塗って囲む案内。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *操作合図* | 🔄 *Drop Line* | 🔄 *差し込み線* | 🔄 *タスクグループパネルでドラッグしているタスクグループの行き先を示す線。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *操作合図* | 🔄 *Interaction Cues* | 🔄 *操作合図* | 🔄 *操作中や選択中だけ描く、押せない印をまとめて呼ぶ語。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *操作合図* | 🔄 *Marquee Rectangle* | 🔄 *範囲選択矩形* | 🔄 *日程表で、範囲を選ぶためにドラッグしているあいだ描く矩形。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *操作合図* | 🔄 *Selection Frame* | 🔄 *選択枠* | 🔄 *日程表で、選んでいるものを囲む枠。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *操作合図* | 🔄 *Tentative Dependency Line* | 🔄 *仮依存線* | 🔄 *依存線を引いている途中に描く線。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ジャンプ先マーク* | 🔄 *Jump Landing Marks* | 🔄 *ジャンプ先マーク* | 🔄 *検索パネルなどから飛んだあと、次に押すまで残す印をまとめて呼ぶ語。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ジャンプ先マーク* | 🔄 *Jump Landing Ring* | 🔄 *ジャンプ先囲み* | 🔄 *飛んだ先のタスクを囲む輪。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ジャンプ先マーク* | 🔄 *Jump Related Ring* | 🔄 *関係タスク囲み* | 🔄 *飛んだ先のタスクに関係するタスクを囲む輪。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *ジャンプ先マーク* | 🔄 *Jump Ripple* | 🔄 *波紋* | 🔄 *飛んだ先に描く波紋。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *タスクグループパネルのボタン* | 🔄 *Collapse Below Button* | 🔄 *配下折りたたみボタン* | 🔄 *タスクグループパネルの行のボタンで、配下をすべて折りたたむ。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *—* |
| 🔄 *タスクグループパネルのボタン* | 🔄 *Collapse Button* | 🔄 *折りたたむボタン* | 🔄 *タスクグループパネルの行のボタンで、そのタスクグループ自身を折りたたむ。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *BGQA11 が扱う（CR-857 の後任の席）* |
| 🔄 *タスクグループパネルのボタン* | 🔄 *Expand Below Button* | 🔄 *配下展開ボタン* | 🔄 *タスクグループパネルの行のボタンで、配下をすべて展開する。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *—* |
| 🔄 *タスクグループパネルのボタン* | 🔄 *Expand One Level Button* | 🔄 *1 階層展開ボタン* | 🔄 *タスクグループパネルの行のボタンで、直下の子だけを展開する。* | 🔄 *scheduleData.taskGroups[].showMode* | 🔄 *—* |
| 🔄 *タスクグループパネルのボタン* | 🔄 *Pin Button* | 🔄 *ピン止めボタン* | 🔄 *タスクグループパネルの行のボタンで、タスクグループをピン止めして画面に残す・外す。* | 🔄 *documentSettings.pinnedTaskGroupIds[]* | 🔄 *—* |
| 🔄 *タスクグループパネルのボタン* | 🔄 *Task Group Buttons* | 🔄 *タスクグループボタン* | 🔄 *タスクグループパネルの各行に並ぶボタンをまとめて呼ぶ語。* | 🔄 *なし* | 🔄 *—* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *太字の案のとおりに改め、ほかの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名（今の名・案・別の名）を書く* |

回答:

#### 🔄 *❓ 問 14-12. タイムルーラー（2 語。案 2、BGQA11 へ 0）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *文書の設定: 読むだけの行* | 🔄 *Ruler Font Size → **Time Ruler Font Size*** | 🔄 *目盛の文字 → **タイムルーラーの文字サイズ*** | 🔄 *プロパティパネルの文書の設定の面の、読むだけの行「目盛と積む向き」（RN-5）に出る、タイムルーラーの文字の大きさ（ピクセル）。* | 🔄 *なし（documentSettings.fontSizePreset から導く値）* | 🔄 *案: 日本語「目盛の文字」は大きさだと読めず、帯も確認済みの名 Time Ruler で呼んでいない。（V1 V4）* |
| 🔄 *文書の設定: 読むだけの行* | 🔄 *Ruler Height → **Time Ruler Height*** | 🔄 *目盛の\|帯の\|高さ → **タイムルーラーの高さ*** | 🔄 *プロパティパネルの文書の設定の面の、読むだけの行「目盛と積む向き」（RN-5）に出る、タイムルーラーの帯の高さ（ピクセル）。* | 🔄 *なし（documentSettings.fontSizePreset から導く値）* | 🔄 *案: 同じ帯を確認済みの名 Time Ruler（タイムルーラー）で呼ばず、Ruler・目盛の帯と言い換えている。（V4 V5）* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *太字の案のとおりに改め、ほかの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名（今の名・案・別の名）を書く* |

回答:

#### 🔄 *❓ 問 14-13. MCP の説明に出る語（4 語。案 0、BGQA11 へ 0）*

| 🔄 *小分け* | 🔄 *英語の名* | 🔄 *日本語の名* | 🔄 *どの機能のどこ* | 🔄 *GRS JSON* | 🔄 *案の理由（観点）* |
|:---|:---|:---|:---|:---|:---|
| 🔄 *書き出しの道具* | 🔄 *SavedFile* | 🔄 *SavedFile* | 🔄 *MCP の中継で書き出しの道具を呼んだ AI に返る答えの型の名（ファイルを保存したことを告げる）。AI が道具の説明文と答えで読む。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *書き出しの道具* | 🔄 *fileName* | 🔄 *fileName* | 🔄 *MCP の中継の書き出しの道具の引数。人が中継で選んだ保存先フォルダーからの相対のファイル名で、AI が道具の説明文で読む。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *書き出しの道具* | 🔄 *overwrite* | 🔄 *overwrite* | 🔄 *MCP の中継の書き出しの道具の引数。同じ名のファイルを置き換えてよいか（古いファイルは .bak に残る）で、AI が道具の説明文で読む。* | 🔄 *なし* | 🔄 *—* |
| 🔄 *MCP* | 🔄 *MCP* | 🔄 *MCP* | 🔄 *AI が GRS を操作するときの通信のしくみの名。MCP の中継（relay）の道具の説明文で AI が読む。* | 🔄 *なし* | 🔄 *—* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *このグループの語は今の名のままにする* |
| 🔄 *b* | 🔄 *直す。回答欄に、直す行の英語の名と、採る名を書く* |

回答:

***

## ❓ 自由

回答:
