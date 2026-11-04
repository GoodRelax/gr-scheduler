BGQA2

# 名の辞書（用語集）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA2 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

🔄 *2026-10-28 に作り、2026-11-05 に書き直した。② の辞書の初版ができ、③ のレビューを始めた。この紙で、名の辞書のスキーマ → 辞書 → 辞書のレビューまでを進める（`JDG-3424` の ①〜③）。スキーマの案は `glossary-draft/glossary.schema.json`（`CR-857` が `docs/development-rules/` へ移すまでの下書き）。*

🔄 *残 16（❓ で検索）*

🔄 *ホワイトボードで 2026-11-05 に決まった名（`JDG-3527`〜`JDG-3529`・`JDG-3540`〜`JDG-3545`）は、まだこの紙の問いに当てていません（次の巡で当てます）。ボードで残った問いを問 10 に移しました。略語（問 9）はチャットで NEIM に決まりました（`JDG-3546`）。*

🔄 *問いは分野ごとにまとめて並べます（`JDG-3517`）。外との約束に出る語を先に確定します（`JDG-3525`）。今回は 7 つの分野です: 全体の書き方（MSPDI の Type の呼び方）→ 色（色の形を決め直す。透け具合は `JDG-3526` で決まった）→ カレンダー → プロジェクト → タスクと依存 → 担当と割当 → タスクグループ。色が決まると Part 6 が閉じます。案の比べ方には 07 の設計原則の観点と、W3C や業界の慣例の名を使います。易しい語は分野ごとに推奨の表でまとめ、争点のある語だけを 1 問ずつ立てます。*

***

## 決定事項

### [rule] 進め方と形

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 進め方 | ① 辞書のスキーマ → ② 辞書 → ③ 辞書のレビュー表（.md、パートに分ける）→ ④ GRS JSON → ⑤ GRS JSON のレビュー表（SSOT から来た所と生成で足した所を分ける）。利用者が見るのは用語と意味など魂を込める所だけ。JSON の決まりなどの細かい所は AI が検査する | `JDG-3424` |
| 置き場 | 辞書は `docs/spec/_source/glossary.json`、そのスキーマは `docs/development-rules/` の下 | `JDG-3419`・`JDG-3420` |
| 形 | キーそのものが ID。持ち主で意味が変わるものだけ、持ち主ごとに別の語にし、持ち主は `owner` の欄に書く（`kind@Color` のように詰めない）。派生は子、関連はタグ（分類の木） | `JDG-3415`・`JDG-3425` |
| 欄 | `key`・`owner`・`definition { en, ja }`・`label { en, ja }`・`uses`・`children`・`tags`・`avoid`・`nonLiteral`・`rowId`。言語は言語ごとに別のプロパティで、1 つの文字列に 2 つの言語を入れない（`OKPN`・`OMPV`）。言語は後から足せる。利用者が読むのは `definition.ja` と `label.ja` | `JDG-3425` |
| 言葉 | 英語が主（正）、日本語が副（訳） | `JDG-3422` |
| 順 | 配列の並びだけ。順番号は入れない | `JDG-3423` |
| 命令の位置 | 「文書の命令」という考えは 1 群目「決まり」の設計の形（CA の層・entity と同じ段）に置き、1 つ 1 つの命令は主語（画面・設定・Agent API）の後ろに置く。主語が先、動詞が後 | `JDG-3426` |
| 分け方と順 | 10 群、組み上げの順。階層 4 種の扱い、外との約束の決まり、開発の名の線（下の表） | `JDG-3427` |
| 読む範囲 | まず土台と外との約束の 21 パート（1〜13・30〜37）、その後で残り全部。残りも出す前に私が原本と照らして直す | `JDG-3428` |
| Part 1 の直し | `NDD` を `Naming` の次に足す（あなたの言葉のまま）。原則の意味は本質だけを短く、詳しさはレビュー基準へ（`OKPN` はすべての識別子が対象）。`Traceability` を `SSOT` の次に足す | `JDG-3429` |
| Part 1・2 | 決まり（56 語）を確定 | `JDG-3430` |
| Part 3・4 の書き込み（決まった所） | 目標 `GL-001` のキーは `multipleTasksPerRow`（「multiplue」は打ち違いと読みました）。`wbs` の意味は「親タスクと子タスクの木」だけ。意味には要ることだけを書く | `JDG-3431` |
| 価値のことば | about のページの 8 つ（ペライチ・ぬるサク・すぐわか・直感操作・構造化データ・単一 HTML・遅延診断・AI 連携）。「直接操作」は「直感操作」と呼ぶ。透かしは入れない | `JDG-3432` |
| マイルストーンの意味 | キーの名を書く（案 a）。描く形は何の形かを書く | `JDG-3433` |
| `baseline` の日本語の名 | 前回予定（「変更前の予定」「前回の予定」は使わない） | `JDG-3434` |
| Part 4 の残り | 書き込んだ名をそのまま採る（`schedule` は「スケジュール」など）。書き込みの無い語は確定。次の回から、各語に MSPDI の名かどうかを出す | `JDG-3435` |
| この紙の進め方 | 1 群ずつ出す。各パートの頭に迷う語だけを問いの形で出し、残りは表で。前に裁定した名は<span style="color: #0550AE">青い字</span>で示す。辞書を全部確定してから CR-851 の行のレビューへ | `JDG-3436`〜`JDG-3439`・`JDG-3460` |
| 予実の状態の名 | `progressStatus`（進捗ステータス） | `JDG-3461` |
| マルチバーの名 | Multi-bar Gantt / マルチバーガント（何の名かは問 4-8-2） | `JDG-3462` |
| 依存の種類 | 終了-開始（直列作業）・開始-開始（並列開始）・終了-終了（後追終了。`JDG-3486`）・開始-終了（引継必須）。画面のヒント 4 つにも別名を書き、「完了」を「終了」にそろえる（英語は問 4-9-2） | `JDG-3463` |
| 1 つの暦の名 | `projectCalendar`（プロジェクトカレンダー） | `JDG-3464` |
| 進捗点の名 | `taskProgressPoint`（タスク進捗点） | `JDG-3465` |
| パート 5 の 7 語 | 押し出し・ボトルネック・ボトルネック経路・信用できない・要修正・疑義・記載漏れ・修正案・修正の記録は確定 | `JDG-3466` |
| 価値のことば 8 語 | ペライチ・ぬるサク・すぐわか（見つけやすさ）・直感操作（`intuitiveInteraction`。操作がすぐ絵に返る）・構造化データ・単一 HTML・遅延診断・AI 連携（`aiInteraction`）。目標の文は辞書に入れない | `JDG-3467` |
| 依存の種類の英語 | Finish-to-Start などのまま。英語に別名は付けない | `JDG-3468` |
| 見込み終了の名 | `estimatedFinish`（終了見込み / Estimated Finish） | `JDG-3469` |
| 価値のことばの当て方 | `CR-857` で仕様書（表 T-106 を 8 語、`CH-1`・`CH-5` に価値のことば、AI 連携の目標と課題）と about のページ（透かしを外し、直感操作・Intuitive Interaction・AI Interaction）を直す | `JDG-3470` |
| マルチバーガントの定義 | 表の種類の名:「1 本のタスクグループレーンに、複数のタスクのバーとマイルストーンを置けるガントチャート」。1 行の様子は「タスクが N 個載っている」。悪い用例は `avoid` に | `JDG-3471` |
| 用例の欄 | 辞書のスキーマに `usage { good, bad }` を足す。`avoid` は避ける語だけ | `JDG-3472` |
| 遅延診断の 4 語 | 末端タスク `endTask`・遅延寄与 `delayContribution`・完了済みの押し出し `finishedDelayContribution`・診断阻害 `diagnosisBlocker`。Agent API の名もそろえる | `JDG-3473` |
| 完了済みの遅延寄与 | `finishedDelayContribution` の日本語は「完了済みの遅延寄与」。「押し出し」は名に使わない | `JDG-3474` |
| 診断の印は保存しない | 今の仕様のまま（診断は文書を変えない。印は保存しない。保存するのは人が付けた表の見え方だけ）。スキーマへの書き方は問 4-13-9 | `JDG-3475` |
| 遅れの量の名 | キーは Agent API と src の名そのもの（`…Minutes`）。表示名には単位を付けない。単位の無い考えだけの名は作らない（下の「遅延診断の語」） | `JDG-3476` |
| 終了見込みを出す | Agent API の遅延診断の答えに出し、遅延診断レポートの表にも欄「終了見込み」を足す（Agent API は `CR-851`、表の欄は `CR-856`） | `JDG-3477` |
| 診断の結果は保存しない | 文書が変わるとすぐ古くなる（古新聞になる）から。その理由もスキーマに書く（問 4-13-9-2） | `JDG-3478` |
| 「出している」も保存しない | 遅延診断について文書に保存するものは無い（今のまま）。開いたら入口を 1 回押す | `JDG-3479` |
| スキーマに書く文 | 遅延診断について EARS の 3 文（結果を保存しない・その理由／始めたときに計算する／出しているあいだは計算し直さない）を Concepts の欄に | `JDG-3480` |
| `NDD` の句 | 無名 天地之始 有名 萬物之母 をピンインで書く（Wú míng tiāndì zhī shǐ, yǒu míng wànwù zhī mǔ）。漢字は括弧で添える | `JDG-3481` |
| 略語の正式名 | 決まりの群では、略語の意味の頭に英語の正式名を書く（07 の「設計原則の索引」の正式名称） | `JDG-3482` |
| 意味の文の書き方 | 否定形と受動態は原則として使わない。他動詞には目的語を書く。Part 1 に語を足す（キーは問 5-4）。07 へ足すのは `CR-857` | `JDG-3483` |
| 遅延診断（価値）の意味 | 頭の「（価値のことば）」を消す | `JDG-3484` |
| マルチバーガントの意味 | あなたの文のまま | `JDG-3485` |
| 終了-終了の別名 | 後追終了（画面のヒントも同じ） | `JDG-3486` |
| 文書の意味 | 短く、肯定形で書き直す（画面の値の保存の話は外す） | `JDG-3487` |
| 準純粋 B の「このような関数」 | 準純粋 B の関数そのもの。主語を書いてはっきりさせる | `JDG-3488` |
| `JSON` と `JSONSchema` | 一般の語は標準そのものだけを書き、GRS のものは必ず GRS の付く名で呼ぶ（`grsJsonFormat`・`grsDocumentSchema`・`grsCommandsSchema`） | `JDG-3489` |
| 新しい決まりの語のキー | `AffirmativeActiveWording`（否定形・受動態の排除） | `JDG-3490` |
| `rowId` の名 | `specTableRowId`（仕様書の表の行 ID）。StrictDoc の要求 ID とは別の、表の 1 行の番号を指す。src へは `CR-857` | `JDG-3491` |
| 日時の書き方 | 予定・実績などの時の値は「日付」でなく「日時」。辞書の全体で直す（席の数え: 11 語と境目の 6 語） | `JDG-3495` |
| WBS の親子 | 「下」でなく「配下」 | `JDG-3496` |
| マイルストーンの意味 | 形の話を外す（`OMPV`）。`chevron` は矢羽根。両端に点のある線の名と、マイルストーンの 15 の形の名は群 4 で問う | `JDG-3494` |
| 遅れの量の名 | 「（稼働の分）」を外し、単位は遅延診断の意味に 1 度だけ書く | `JDG-3501` |
| 修正の記録の「だれが」 | 今の仕様書に無い。足すのは新しい振る舞いなので BOSS（`CR-856`）へ回した | `JDG-3502` |
| 価値のことばの意味 | 「〜という、GRS の特長」と書く（英語は quality）。仕様書の目標の文（「…状態になること」）を直すかは `CR-857` で決める | `JDG-3507`・`JDG-3509` |
| `doubtfulOrMissing` | 2 語に分ける: 疑義 `suspicion`・記載漏れ `omission`（src の名と同じ） | `JDG-3503`・`JDG-3508` |
| クリティカルパス | 今のまま GRS の範囲の外。理由（日付は人が決める・暦は文書に 1 つ・工数を持たない）を仕様書の `SO-10`・`XO-5` に書く（`CR-856`） | `JDG-3510` |
| 遅延診断の英語の名 | 名は意味だけで選ぶ（`NDD`）。機能の名は `delayDiagnosis`（遅延診断 / Delay Diagnosis）。価値の `diagnosableDelay` はこの 1 語にまとめ、Part 3 にはその語を指すタグを置く。派生の名もそろえる: Delay Diagnosis Report（`delayDiagnosisReport`）・`readDelayDiagnosis`・`runDelayDiagnosis` | `JDG-3511`・`JDG-3512` |
| Part 1〜5 | 決まり・価値・日程の考えの 112 語を確定。確定した表は `13-glossary-settled.md` に移した | `JDG-3513` |
| 紙の出し方 | 問いを分野ごとにまとめて並べる。同じ分野の問いを続けて置き、分野を行き来しない（日程・色・日程の順は不可、日程・日程・色の順は可）。分野の順は席が優先度で決める | `JDG-3515`・`JDG-3517` |
| 分割統治 | Part 1 の `SoC` の前に `DivideAndConquer`（分割統治: 大きな問題を、互いに独立に解ける小さな問題に分け、1 つずつ解き、その答えを組み合わせて全体を解く）を足す。キーは綴った語（「D&C」は略語だけで通じる語でなく、「&」は識別子に入らない）。07 の設計原則の索引にも足す（`CR-857`） | `JDG-3516` |
| 略語の正式名の欄 | 辞書のスキーマに欄 `expansion { en, ja }` を足す（略語のキーだけが持つ。例: `SRP` は Single Responsibility Principle・単一責任の原則）。決まりの群の略語の形のキー 25 語の正式名を、意味の文の頭からこの欄へ移す。生成の道具は、正式名を意味の前に出す | `JDG-3524` |
| 🔄 *「名は体を表す」の略語（問 9）* | 🔄 ***NEIM**（Name Explaining Its Meaning、ねいむ）。07 の設計原則の索引と辞書の Part 1 に足す。gr-sw-maker のレビュー基準には NEIM と NDD を足す（BOSS が立てる SUB が当てる）* | 🔄 *`JDG-3546`* |

#### 決まった形 —— 遅延診断の語

| キー | 日本語の名 | 英語の名 | Agent API の名（β） | 決め |
|:---|:---|:---|:---|:---|
| `delayDiagnosis` | <span style="color: #0550AE">遅延診断</span> | Delay Diagnosis | `readDelayDiagnosis`・`runDelayDiagnosis`（今は `readDelayDiagnostics`・`runDelayDiagnostics`） | `JDG-473`・`JDG-3512` |
| `estimatedFinish` | <span style="color: #0550AE">終了見込み</span> | Estimated Finish | `estimatedFinish`（新しく出す） | `JDG-3469`・`JDG-3477` |
| `dependencyDelayMinutes` | <span style="color: #0550AE">依存関係遅延</span> | Dependency Delay | `dependencyDelayMinutes`（今は `inheritedDelayMinutes`） | `JDG-3476` |
| `internalDelayMinutes` | <span style="color: #0550AE">内部要因遅延</span> | Internal Delay | `internalDelayMinutes`（今は `selfDelayMinutes`） | `JDG-3476` |
| `endTask` | <span style="color: #0550AE">末端タスク</span> | End Task | `endTaskDelays`・`endTasksReached` | `JDG-3473` |
| `endTaskDelayMinutes` | <span style="color: #0550AE">末端タスクの遅れ</span> | End Task Delay | `endTaskDelayMinutes`（今は `terminalDelayMinutes`） | `JDG-3476` |
| `delayContributionMinutes` | <span style="color: #0550AE">遅延寄与</span> | Delay Contribution | `delayContributionMinutes`（今は `pushOutMinutes`） | `JDG-3473`・`JDG-3476` |
| `finishedDelayContribution` | <span style="color: #0550AE">完了済みの遅延寄与</span> | Finished Delay Contribution | `finishedDelayContributions` | `JDG-3473`・`JDG-3474` |
| `bottleneck` | <span style="color: #0550AE">ボトルネック</span> | Bottleneck | `bottlenecks` | `JDG-634` |
| `bottleneckPath` | <span style="color: #0550AE">ボトルネック経路</span> | Bottleneck path | （`markerStates` の値） | `JDG-3466` |
| `unreliable` | <span style="color: #0550AE">信用できない・要修正</span> | Unreliable, fix needed | `unreliableCount` | `JDG-1225` |
| `suspicion` | <span style="color: #0550AE">疑義</span> | Suspicion | （`FindingKind` の値） | `JDG-1225`・`JDG-3508` |
| `omission` | <span style="color: #0550AE">記載漏れ</span> | Omission | （`FindingKind` の値） | `JDG-1225`・`JDG-3508` |
| `diagnosisBlocker` | <span style="color: #0550AE">診断阻害</span> | Diagnosis Blocker | `diagnosisBlockers` | `JDG-3473` |
| `fixProposal` | <span style="color: #0550AE">修正案</span> | Fix Proposals | `fixProposals` | `JDG-2141` |
| `fixLog` | <span style="color: #0550AE">修正の記録</span> | Fix Log | `fixLog` | `JDG-3466` |

- 量の語のキーには、単位 `Minutes` が付きます（稼働の分）。画面は「時刻を表示する」の切り替えに従い、日か「1d 2h」の形で見せます。
- 英語の名の大文字の付け方（Bottleneck path・Fix Proposals など）は、画面の語のパートでそろえます。

#### 決まった形 —— 群と順

前に出た語だけで後の語の意味を書ける順（公理から組み上げる）。

| 順 | 群 | 英語 | 子 | 約束の強さ |
|:---|:---|:---|:---|:---|
| 1 | 決まり | Rules | 1-1 設計とレビューの原則 Design and review principles（SSOT・OKPN・OMPV・Null Trap・SRP・YAGNI …）／1-2 設計の形 Design shape（CA の層: entity・use-case・adapter・framework。文書の命令という考え）／1-3 行 ID Row ID（名簿は `row-id-prefixes.json`）／1-4 外の決まり External standards | 内（CR で変える） |
| 2 | 価値 | Values | ぬるサク・すぐわか・ペライチ・遅延診断 …（GRS の特長） | 内 |
| 3 | 日程の考え | Schedule concepts | 稼働日・予定と実績・遅れ・WBS … | 内 |
| 4 | GRS JSON | GRS JSON | 型・キー・値（2. の順） | **外との約束** |
| 5 | 画面 | Screen | 部品・アイコン・状態・通知・問い | 使う人 |
| 6 | 設定 | Settings not in GRS JSON | GRS JSON に出ないもの | 使う人 |
| 7 | Agent API | Agent API | メンバ・断りの理由 | **外との約束** |
| 8 | 文書の命令 | Document commands | 1 つ 1 つの命令とその欄（主語の後ろの動詞） | **外との約束** |
| 9 | 配るもの | Deliverables | `dist/index.html`・`grs-relay.mcpb` … | 使う人 |
| 10 | Component | Components | 10-1 Component 間の I/F（その I/F を出す Component の子） | 内 |

#### 決まった形 —— GRS JSON の中の順と、階層の扱い

辞書は木そのものを持ちません —— 木は `erd.json`（とそこから生まれるスキーマ）だけが持ちます。辞書は、その木を**葉から根へ**組み上げる順（後順）に語を並べます。

1. まず、どこにでも入る小さな型と値の形（`ColorSide`・`ColumnSort`・日時の書き方・ID の形など）。
2. 次に、葉の型からその親の型へ。1 つの型は「そのキー → その型」の順で置く（キーを先に定め、型はそのキーの集まりとして定める）。
3. 最後に、包み（`scheduleData`・`documentSettings`）と、文書の根。

| 階層の種類 | 例（β。`doc-shape-map.tsv` の `element_new` から） | 辞書での扱い |
|:---|:---|:---|
| 入れ子 | `WorkingTime` → `WeekDay`・`Exception` → `Calendar` | 中の型を先に定め、外の型はそれを使って定める。`WorkingTime` は 2 か所に入るが、先に 1 回だけ定める |
| 包み（自分の ID を持たない入れ物） | `documentSettings.tableViews`・`documentSettings`・`scheduleData` | 中身を定めた後に、包みを「何をまとめる入れ物か」として定める |
| 参照の木（ファイルの上では平ら） | `Task.parentTaskUid`・`TaskGroup.parentId`・`Calendar.baseCalendarUid` | 親を指すキーはその型と同じ所で定める（自分の型を指すので、型の定義の中で閉じる）。木の考え（WBS の木など）はその型の子の語 |
| どこにでも入る共通の型・キー | `passthroughValues`（8 か所）・`ColorSide`・`ColumnSort` | 最初（1.）に定める。持ち主で意味が変わるときだけ `owner` で分ける |

③ のレビュー表では、各語の横に、木の中の道（`scheduleData.calendars[].weekDays[]` など）を生成した情報として並べます（`JDG-3424`）。

#### 決まった形 —— 外との約束の決まり（GRS JSON・文書の命令・Agent API）

| 決まり | 中身 |
|:---|:---|
| 意味を変えない | β で出した後、名も意味も変えない。変えたいときは新しい名を足し、古い名は版を上げて退ける |
| 生まれた版を持つ | 初めて出た `schemaVersion`（Agent API は `agentApiVersion`）を `since` の欄に書く |
| 外の人が読める意味 | `definition.en` は仕様書を読まない人にも通じる文で書き、仕様書の行の番号を書かない（番号は `rowId` だけ） |
| 顔をまたいでも 1 つの意味 | GRS JSON のキーが Agent API や命令の欄にも出るときは同じ語を指す。後の群は、そこで初めて出る名だけを持つ |
| 他者の約束の名 | MSPDI から来た名の対応は `erd.json` の `origin` だけが持つ |

#### 決まった形 —— 開発の名の線

辞書に入れるのは**境界を越える名だけ**（2 か所以上から呼ばれる名）。1 つの部品の中だけの名は、命名の決まり（07 の `Naming`）と検査に任せる。

| 名 | 今の数（数え方） | 辞書に入れるか |
|:---|:---|:---|
| 層 | 4（`src` の下のフォルダ） | 入れる |
| 部品 | 28（各層の下のフォルダ） | 入れる |
| 層をまたぐ口 | 未計測（作るときに数える） | 入れる |
| 部品の中だけの関数・変数・型 | 書き出している関数だけで 932（check.sh の数） | 入れない |
| 決まりのことば | 07 の「設計原則の索引」と、設計原則の観点・コーディング品質の観点。今、仕様書と src は 07 の項目の番号で引いている（番号の引用が仕様書 32・src 6、`SRP` などの名は 0） | 入れる。名と短い意味を辞書に、確かめ方の詳しさは 07 に |

仕様書とコメントの「なぜ」は、番号でなく語（`OMPV`）で引く。文の中の語が辞書にあるかは、`JDG-3418` の検査をコードのコメントにも広げて確かめる。

### [whole] 全体の書き方

| 何 | 決め | 裁定 |
|:---|:---|:---|
| GRS JSON のキーの日本語の名 | 画面か裁定で日本語の名が決まった語だけに付ける（設定の欄の名を写した 33 語と、`name`（持ち主 `Project`）プロジェクト名・`title` プロジェクトタイトル・`scheduleData` スケジュールデータ・`ScheduleDocument` スケジュール文書）。ほかは空 | `JDG-3518` |
| 日本語の名の中の縦線 | 辞書の名からは、折り返しの印の縦線を除く。折り返す所は `display-words.json` だけが持つ | `JDG-3519` |
| 意味が「MSPDI の X と同じ。」だけの語 | 型と配列の 12 語（`WeekDay`・`Exception`・`weekDays`・`exceptions`・`Calendar`・`linkType`・`Dependency`・`dependencies`・`calendars`・`resources`・`assignments`・`project`）に、何の入れ物か・何を表す語かの 1 文を足す（英語にも）。ほかの 14 語は今のまま | `JDG-3520` |

### [time] 日時の型

| 何 | 決め | 裁定 |
|:---|:---|:---|
| `UtcOffset` | UTC からの固定の時差。UTC+09:00 のように書く。GRS は 1 年中そのまま使う | `JDG-3514` |
| `UtcInstant` | UTC で表した 1 つの時点（絶対時刻）。ものごとが起きた時刻（文書の刻印・変更ログ・ビルドの時刻）を記録する型。予定や実績の日時は `DateTime` | `JDG-3521` |
| `Day`・`DateTime`・`Time`・`firstDay`・`lastDay` | 問 6-6-3 の表のとおり | `JDG-3521` |

### [color] 色

| 何 | 決め | 裁定 |
|:---|:---|:---|
| `dimGray`・`lightGray`（持ち主 `Color`） | パレット色の暗い灰色・明るい灰色（lowerCamelCase） | `JDG-3514` |
| `hexColor`（持ち主 `ColorSide`。前の名 `value`） | このテーマで使う色を、# と小文字の 16 進の 6 桁（#rrggbb）で書いた値。CSS が #rrggbb の形を呼ぶ名（`<hex-color>`） | `JDG-3523` |
| 色の残りの 21 語 | 問 6-6-4 の表のとおり | `JDG-3523` |
| 🔄 *塗りと線の透け具合（問 6-6-4-9）* | 🔄 *キーは `opacityPercent`（0〜100。100 が透けない。省くと 100。0 のとき GRS はその塗りや線を描かない）。W3C の CSS `opacity`・SVG `fill-opacity` と同じ向き。画面の語も「塗りの透過率（%）」から「不透明度」の向きにそろえる* | 🔄 *`JDG-3526`* |

### [col] 表の列

| 何 | 決め | 裁定 |
|:---|:---|:---|
| `ColumnKey`・`ColumnFilter` の `kind`・`values`・`dateRange`・`isBlankHidden` | 表の列の固定の英語の名前と、列のフィルタの 2 つの形（値で隠す・日の範囲の外を隠す）、空のセルの行を隠すかの真偽 | `JDG-3514` |
| `hiddenValues` | 列のフィルタの値の一覧で、人がチェックを外した値の並び。この列のセルがこの値のどれかを持つ行を、フィルタが隠す。フィルタの形 `"kind": "values"` と同じ語で読む | `JDG-3522` |
| `column`・`ColumnFilter`・`direction`・`ascending`・`descending`・`ColumnSort` | 問 6-6-5 の表のとおり | `JDG-3522` |

### [cal] カレンダー

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 意味を足した 5 語 | `WeekDay`・`Exception`・`weekDays`・`exceptions`・`Calendar` に、何を表す語かの 1 文を足す | `JDG-3520` |

### [proj] 🔄 *プロジェクト*

| 🔄 *何* | 🔄 *決め* | 🔄 *裁定* |
|:---|:---|:---|
| 🔄 *`name`・`title`（持ち主 `Project`）* | 🔄 *日本語の名はプロジェクト名・プロジェクトタイトル* | 🔄 *`JDG-3355`・`JDG-3518`* |

### [task] 🔄 *タスクと依存*

| 🔄 *何* | 🔄 *決め* | 🔄 *裁定* |
|:---|:---|:---|
| 🔄 *依存の種類* | 🔄 *終了-開始（直列作業）・開始-開始（並列開始）・終了-終了（後追終了）・開始-終了（引継必須）。英語は Finish-to-Start などのまま* | 🔄 *`JDG-3463`・`JDG-3468`・`JDG-3486`* |

### [res] 🔄 *担当と割当*

🔄 *まだ決まった語はありません。*

### [tg] 🔄 *タスクグループ*

| 🔄 *何* | 🔄 *決め* | 🔄 *裁定* |
|:---|:---|:---|
| 🔄 *`TaskGroup`* | 🔄 *タスクグループ。WBS とは別の、自分の木を作る* | 🔄 *`JDG-3361`* |

***

## QA

表の読み方:

- 青い字は、前に裁定した名です。キーの欄が青ければキーの名を、日本語の名の欄が青ければ日本語の名を、裁定が決めました。裁定の番号は意味の欄の最後にあります。
- 表の # は「パート - パートの中の番号」です。番号が飛んでいる所の語は、ほかの問いで聞くか、もう決まっています。
- MSPDI の名の欄の「無し」は、GRS が自分で付けた名です（MSPDI に同じ要素が無い）。
- 表を見る問いでは、直す所が無ければ ok と書き、直す所は表のセルに ★ で書いてください。

### [rule] 進め方と形（❓ 0）

### [whole] 🔄 *全体の書き方（❓ 2）*

#### 🔄 *❓ 問 10. 線の先が消えた時の決まり —— `fallback` を持つか*

🔄 *場面: コメントボックスの吹き出し線の先（`leaderTarget`。種類は task・highlightBox・freePoint）のうち、task と highlightBox は `fallback { taskGroupId, laneFraction }` を持ちます。先のタスクやハイライトボックスが無くなった時に、線の先を置く場所です。あなたはボードで「fallbackはそのフォールが起こった時にどうするのかを示す名称にすべきでは？」「対称性の指摘回答の提案通り調査しろ」と書きました。*

- 🔄 *調べた所（仕様書と src。参照する欄 28 か所）:*
  - 🔄 *タスクが別のタスクグループへ移っても、GRS は `fallback.taskGroupId` を書き直しません。覚えた場所が古くなります。*
  - 🔄 *その古いタスクグループを消すと、線の先のタスクは生きているのに、コメントボックスごと消えます（`src/use-case/edit-document/edit-task-group.ts` の 364〜368 行、仕様書の `CD-2`）。不具合として台帳に書きます。*
  - 🔄 *ハイライトボックスを消すと、GRS は線の先をその場で自由な点に変えます。開いたファイルで線の先が無い時の決まりは、仕様書にありません。*
  - 🔄 *freePoint やハイライトボックスの範囲が指すタスクグループが消えた時の決まりも、参照ごとに違います。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 ***`fallback` を持たない。** タスクやハイライトボックスを消す時に、GRS がその場で線の先を自由な点に変える。開いた時に先が無ければ、線を描かずに知らせる。どの参照も「先が消えたら」を同じ 1 つの決まりで扱う（`SSOT`: 覚えた場所という、古くなる写しを持たない）。振る舞いの変更なので CR に回す* |
| 🔄 *b* | 🔄 *`fallback` を残し、落ちた時に何をするかを言う名に改める（例: `pointIfTargetMissing`）。タスクを動かすたびに GRS が書き直す決まりを足す* |
| 🔄 *c* | 🔄 *直す所を書く* |

回答:

#### ❓ 問 6-7-3. MSPDI の Type を、GRS は 2 つの言い方で呼んでいる

場面: MSPDI の名と GRS JSON のキーが違う語を、この表に並べました。

| # | キー | MSPDI の名 | 中身 |
|:---|:---|:---|:---|
| 7-38 | `recurrenceKind` | Exception/Type | 例外の繰り返し方の数（1〜9） |
| 7-39 | `recurrencePeriod` | Exception/Period | 繰り返しの間隔 |
| 8-37 | `linkType` | PredecessorLink/Type | 依存の種類の数（0〜3） |
| 9-14 | `resourceKind` | Resource/Type | 担当の種類の数 |
| 8-40・9-12 | `Dependency`・`dependencies` | PredecessorLink | 依存 |

- 同じ MSPDI の名 `Type` を、GRS は `…Type`（1 つ）と `…Kind`（2 つ）の 2 つの語尾で呼びます。GRS は 1 つの考えに 2 つの名を付けています（`OKPN`）。
- GRS JSON の `kind` は「形の組の印」だけに使う決まりです（`JDG-3348`・`JDG-3309`）。`recurrenceKind` と `resourceKind` は数の符号なので、`kind` と紛れます。
- `Type` を残すと、3 つの要素の意味の違いが名から読めないので、GRS は名を変える（`OMPV`）。`Dependency` は、日程の考えの語「依存」（`dependency`。`JDG-3435` で確定）に合わせた名です。
- 意味の欄には、MSPDI の名と違う理由が書いてありません。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `recurrenceKind` → `recurrenceType`、`resourceKind` → `resourceType` にして、3 つを `…Type` にそろえる。意味の欄に、MSPDI の名と違う理由を 1 文で書く |
| b | 名は今のまま。意味の欄に、MSPDI の名と違う理由を 1 文で書く |
| c | 名も意味の欄も今のまま |

回答:

### [time] 日時の型（❓ 0）

### [color] 🔄 *色（❓ 4）*

#### ✅ 問 6-6-4-6. 塗りの型 `Paint` —— スキーマと実例

場面: 前の回で、塗りの型 `Paint` のスキーマと実例を出しました。あなたの答え（下）を受けて、色の要素を網羅し、形を決め直します。

回答: ここ、大事なところだから、丁寧に考えよう。 そもそも色について必要な要素を網羅的に列挙しろ。テーマとかあるやろ？ ダーク・ライトも.... ちなみにCopilotに聞いたらこっちも中途半端な回答が来た。 まぁ、参考にしろ。

```json
{
  "$defs": {
    "ColorRef": {
      "description": "Either a theme-managed color or a custom color.",
      "type": "object",
      "oneOf": [
        {
          "required": ["themeRole"],
          "properties": {
            "themeRole": {
              "type": "string",
              "enum": [
                "task",
                "milestone",
                "criticalTask",
                "summaryTask",
                "comment",
                "highlight"
              ]
            }
          },
          "additionalProperties": false
        },
        {
          "required": ["customColor"],
          "properties": {
            "customColor": {
              "$ref": "#/$defs/Color"
            }
          },
          "additionalProperties": false
        }
      ]
    },

    "Paint": {
      "type": "object",
      "required": ["color"],
      "additionalProperties": false,
      "properties": {
        "color": {
          "$ref": "#/$defs/ColorRef"
        },
        "opacityPercent": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100,
          "default": 100
        }
      }
    },

    "Stroke": {
      "type": "object",
      "required": ["paint", "widthPx"],
      "additionalProperties": false,
      "properties": {
        "paint": {
          "$ref": "#/$defs/Paint"
        },
        "widthPx": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10
        }
      }
    },

    "ShapeStyle": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "fill": {
          "$ref": "#/$defs/Paint"
        },
        "stroke": {
          "$ref": "#/$defs/Stroke"
        }
      }
    },

    "TaskGraphicStyle": {
      "$ref": "#/$defs/ShapeStyle"
    },

    "CommentBoxStyle": {
      "$ref": "#/$defs/ShapeStyle"
    },

    "HighlightBoxStyle": {
      "$ref": "#/$defs/ShapeStyle"
    }
  },

  "theme": {
    "light": {
      "task": "#3B82F6",
      "milestone": "#7C3AED",
      "criticalTask": "#EF4444",
      "summaryTask": "#0EA5E9",
      "comment": "#3B82F6",
      "highlight": "#FACC15"
    },

    "dark": {
      "task": "#60A5FA",
      "milestone": "#A78BFA",
      "criticalTask": "#F87171",
      "summaryTask": "#38BDF8",
      "comment": "#60A5FA",
      "highlight": "#FDE047"
    }
  },

  "examples": {
    "normalTask": {
      "fill": {
        "color": {
          "themeRole": "task"
        }
      }
    },

    "importantTask": {
      "fill": {
        "color": {
          "customColor": "#FF8800"
        }
      }
    },

    "commentBox": {
      "fill": {
        "color": {
          "themeRole": "comment"
        },
        "opacityPercent": 30
      },
      "stroke": {
        "paint": {
          "color": {
            "themeRole": "comment"
          }
        },
        "widthPx": 1
      }
    }
  }
}
```

##### ❓ 問 6-6-4-7. 色の要素の一覧 —— 抜けと誤りは無いか

場面: あなたは「ここ、大事なところだから、丁寧に考えよう。 そもそも色について必要な要素を網羅的に列挙しろ。テーマとかあるやろ？ ダーク・ライトも.... ちなみにCopilotに聞いたらこっちも中途半端な回答が来た。 まぁ、参考にしろ。」と書きました。

GRS の色の要素を、仕様書と β の形から 12 に数えました（数え方: `doc-shape-map.tsv` で `Color`・`LaneColor` を取るプロパティと、テーマ・色相・モノクロのプロパティ。仕様書の表 T-017b の `CV-1`〜`CV-10`、表 T-294、`FR-039`、`FR-007`。文書の外の色は `_assets/tbl-settings.md` の `S-` の行のうち、`#rrggbb` か `rgba(` の値を持つ行）。

| # | 要素 | 中身 | 文書に保存するか | 決めた所 |
|:---|:---|:---|:---|:---|
| 1 | 明暗（表示のテーマ） | light と dark。GRS は、起動したときにブラウザーが伝える明暗で描き、読めないときは light で描く。画面の切り替えは、そのページを閉じるまで効く | しない（読む人ごとに違う） | `FR-039` |
| 2 | モノクロ | 決まった色を無彩色にして描く | する（`documentSettings.isThemeMonochrome`） | `CV-7` |
| 3 | テーマの色相 | テーマの色を、この色相で描く。新しい文書は 214 | する（`project.themeHueDegrees`） | `doc-shape-map.tsv`（問 6-8-1 で名を問う） |
| 4 | 色の 3 つの源 | theme（テーマが、その置き場に決める色）・palette（名の付いた 10 色）・custom（人が決めた色） | する（`Color.kind`） | `JDG-3260`・`JDG-3310` |
| 5 | パレットの 10 色 | paper・ink・dimGray・lightGray・red・blue・yellow・green・orange・purple。1 つの名が、明暗ごとに 4 つの値を持つ: 塗り・縁・実績の塗り・タスクグループの帯（10 × 4 × 2 = 80 の値） | 名だけ保存する。値はアプリが持つ（表 T-294） | `CV-1`・`CV-6` |
| 6 | カスタムの色 | 明るい側と暗い側。各側は `hexColor` と `source`（chosen・derived）を持つ。片側を省くと、GRS は文書を開くときに、もう一方の側から作る（色相を保って明度を反転する） | する | `CV-2`〜`CV-4`・`JDG-3523` |
| 7 | 置き場ごとに導く値 | 1 つの色から、置き場に応じて描く値を導く。予定バーの塗りは塗りの値、実績バーの塗りは実績の塗りの値（カスタムの色は、選んだ値から HSL で導く）、縁は縁の値 | しない（描くときに導く） | `CV-6`・`CV-10` |
| 8 | 色を塗る 8 つの置き場 | タスクグループの帯（`LaneColor`。ink を取らない）・タスクの塗りと縁・コメントボックスの塗りと枠（引出し線を含む）と文字・ハイライトボックスの塗りと枠 | する | `doc-shape-map.tsv` |
| 9 | 透明 | 🔄 *塗りと線の不透明度（`opacityPercent`。100 が透けない）と、色を省く道（タスクの塗りと縁、ハイライトボックスの枠）* | する | 🔄 *`JDG-3310`・`JDG-3526`* |
| 10 | 透明の制約 | 塗りと線の両方を透明にはできない（画面の通知「塗りと線の両方を透明にはできません」） | しない（GRS が入力を断る） | `FR-007` |
| 11 | コントラストの条件 | パレットの値は、白を除き、地に対して決まったコントラスト比を満たす | しない（アプリの値の条件） | `CV-8` |
| 12 | 文書の外の色 | 非稼働日の塗り・基準日線・マーカーなど、アプリが決める描画と画面の色。色の値を持つ設定の行が 42 行 | しない | `_assets/tbl-settings.md` |

Copilot の案と、上の一覧を比べました。

| Copilot の案 | GRS の今の形と決まり | 07 の観点 |
|:---|:---|:---|
| テーマの色の役割（task・milestone・criticalTask・summaryTask・comment・highlight）を、値に書く | 置き場が役割を決める。値には `{"kind": "theme"}` だけを書く | `OMPV`: 値に書いた役割と置き場が食い違える（タスクの塗りに highlight）。criticalTask は GRS の範囲の外（`JDG-3510`）→ 問 6-6-4-8 |
| カスタムの色は、1 つの #hex | 明るい側と暗い側の 2 つ（要素 6） | 暗いテーマでも同じ値で描き、コントラストの条件（要素 11）を割りうる |
| パレットが無い | 名の付いた 10 色（要素 5） | 名でテーマに追う道が無くなる |
| `opacityPercent`（100 が不透明。既定 100） | 🔄 *前は `fillTransparencyPercent`（0 が不透明）* | 🔄 *`JDG-3526` で `opacityPercent` に決まった（W3C と同じ向き）* |
| `Stroke { paint, widthPx }` | `strokeColor` と `strokeWidthPx` を平らに持つ | → 問 6-6-4-10 |
| `ShapeStyle` を 3 つの型で共にする | 型ごとに、必ず持つ欄が違う（コメントボックスは塗り・枠・文字を必ず持つ。タスクは塗りも縁も省ける） | → 問 6-6-4-11 |
| テーマの色の値（#3B82F6 など）を文書に書く | テーマとパレットの値は、アプリの設定だけが持つ。文書は名だけを持つ | `SSOT`: 文書がアプリの値を写すと、2 か所が食い違う |
| 書いていない要素 | モノクロ・色相・タスクグループの帯・文字の色・実績の塗りの導き方・明暗の片側の導き方・透明の制約（要素 2・3・6〜8・10） | 網羅の抜け |

🔄 *問 6-6-4-8・6-6-4-10・6-6-4-11 の推奨と `JDG-3526` をすべて採ると、色の形は次のとおりです（β の案）。同じ形を、ホワイトボードの UML のクラス図（x 10300・y 9720）にも描きました。*

🔄 *下のコードブロックの 27・34 行目が変わった。*
```json
{
  "$defs": {
    "Color": {
      "oneOf": [
        { "properties": { "kind": { "const": "theme" } } },
        { "properties": {
            "kind": { "const": "palette" },
            "name": { "enum": ["paper", "ink", "dimGray", "lightGray", "red", "blue", "yellow", "green", "orange", "purple"] } } },
        { "properties": {
            "kind":  { "const": "custom" },
            "light": { "$ref": "#/$defs/ColorSide" },
            "dark":  { "$ref": "#/$defs/ColorSide" } } }
      ]
    },
    "ColorSide": {
      "required": ["hexColor", "source"],
      "properties": {
        "hexColor": { "type": "string", "pattern": "^#[0-9a-f]{6}$" },
        "source":   { "enum": ["chosen", "derived"] }
      }
    },
    "LaneColor": { "description": "The same as Color, except that LaneColor offers no palette color ink." },
    "Paint": {
      "required": ["color"],
      "properties": {
        "color": { "$ref": "#/$defs/Color" },
        "opacityPercent": { "type": "integer", "minimum": 0, "maximum": 100, "default": 100 }
      }
    },
    "Stroke": {
      "required": ["color", "widthPx"],
      "properties": {
        "color": { "$ref": "#/$defs/Color" },
        "opacityPercent": { "type": "integer", "minimum": 0, "maximum": 100, "default": 100 },
        "widthPx": { "type": "integer", "minimum": 1, "maximum": 10 }
      }
    },
    "TaskGraphicStyle": { "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" } } },
    "CommentBox": {
      "required": ["fill", "stroke", "textColor"],
      "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" }, "textColor": { "$ref": "#/$defs/Color" } }
    },
    "HighlightBox": {
      "required": ["fill"],
      "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" } }
    },
    "TaskGroup": { "properties": { "color": { "$ref": "#/$defs/LaneColor" } } }
  }
}
```

実例（同じ形で書いた 3 つ）:

🔄 *下のコードブロックの 3・7・8 行目が変わった。*
```json
"fill": { "color": { "kind": "palette", "name": "red" } }

"fill":   { "color": { "kind": "theme" }, "opacityPercent": 0 },
"stroke": { "color": { "kind": "theme" }, "widthPx": 1 },
"textColor": { "kind": "palette", "name": "ink" }

"fill":   { "color": { "kind": "custom", "light": { "hexColor": "#c0504d", "source": "chosen" } }, "opacityPercent": 50 },
"stroke": { "color": { "kind": "palette", "name": "purple" }, "opacityPercent": 70, "widthPx": 2 }
```

- 🔄 *上から、タスクのバー（赤で塗り、縁を描かない）・コメントボックス（塗りを見せず、テーマの色の枠と、ink の文字）・タスクのバー（自前の赤を不透明度 50% で塗り、紫の縁を不透明度 70% で描く）です。*
- 文書の外のもの（要素 1・7・11・12）と、透明の制約（要素 10）は、スキーマに書きません。GRS が描くときと入力を受けるときに守ります。

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

回答:

##### ❓ 問 6-6-4-8. テーマの色の役割 —— 置き場で決めるか、値に書くか

場面: `{"kind": "theme"}` の色は、テーマがその置き場に決める色です（要素 4）。Copilot の案は、役割（task・milestone など）を値に書きます。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 置き場が役割を決める（今の形）。値には `{"kind": "theme"}` だけを書く。1 つの値が 1 つの意味を持つ（`OMPV`）。置き場と役割が食い違う文書を書けない |
| b | 値に役割を書く（`{"kind": "theme", "role": "milestone"}`）。どの置き場でも、ほかの役割のテーマの色を使える。役割の名の一覧を、外との約束として持つ |

回答:

##### ❓ 問 6-6-4-10. 線の形 —— 線の太さを線の中に入れるか

場面: 今の形は、線の色 `strokeColor` と太さ `strokeWidthPx` を平らに持ちます。線を描かないタスクにも、太さを必ず書きます。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 🔄 *線の型 `Stroke { color, opacityPercent, widthPx }` を作る（平ら、2 段）。線を描かないときは、太さも書かない（`NullTrap`・`OMPV`: 描かない線の太さという、意味の無い値を持たない）。塗りは `Paint { color, opacityPercent }`。W3C のデザイントークンの border 型も、色と太さを 1 つの型に入れる（`{ color, width, style }`）* |
| b | 塗りも線も `Paint` を取り、太さは今のまま外に置く（`strokeWidthPx`。SVG の `stroke-width` と同じ置き方） |
| c | Copilot の形 `Stroke { paint, widthPx }`（`stroke.paint.color` と 3 段になる） |

回答:

##### ❓ 問 6-6-4-11. 3 つの型で、塗りと線の形を共にするか

場面: タスクの描き方・コメントボックス・ハイライトボックスの 3 つの型が、塗りと線を持ちます。必ず持つ欄は型ごとに違います（コメントボックスは塗り・枠・文字を必ず持ち、タスクは塗りも縁も省ける）。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 型 `Paint`・`Stroke` だけを共にし、どの欄を必ず持つかは型ごとに書く（`ISP`: 型ごとに要る欄だけを持つ） |
| b | Copilot の案のように `ShapeStyle { fill, stroke }` を 3 つの型で共にし、必ず持つ欄の違いは型ごとの足しの決まり（`allOf`）で書く（`DRY`） |

回答:


### [col] 表の列（❓ 0）

### [cal] カレンダー（❓ 2）

#### ❓ 問 6-7-1. 「暦」を「カレンダー」にそろえるか

場面: 意味の文と群の見出しに、「暦」の字があります。

- `JDG-3464` で、GRS がすべての稼働日を数える 1 つの暦の名を `projectCalendar`（プロジェクトカレンダー）にしました。そのとき、型 `Calendar` の日本語も「カレンダー」にそろえる案を、この群で出すことにしました。
- 今の辞書で「暦」を使う語:
  - GRS JSON の群: `calendarUid`・`baseCalendarUid`・`calendarUid`（持ち主 `Project`）・`highestIssuedUid` と、見出し「暦」。
  - 辞書のほかの群: 文書の命令の見出し「暦」と、日程の考えの `projectCalendar` の意味の「1 つの暦」。
  - 「暦」は calendar、「暦日」は calendar day を指す。別の語なので、「暦日」は対象外。
- 仕様書と画面の語（`display-words.json`）にも、「暦」の字があります。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 辞書の「暦」をすべて「カレンダー」にする。「暦日」はそのまま。仕様書と画面の語も、`CR-857` で「カレンダー」にそろえる |
| b | GRS JSON の群だけ「カレンダー」にする |
| c | 「暦」のまま。暦は日本語として定着し、暦日とも対になる（プロジェクトカレンダーだけが片仮名になる） |

🔄 *型 `Calendar`（Part 8 の #5）の意味は、次の問 6-7-5 の表にあります。*

回答:

#### ❓ 問 6-7-5. カレンダーの 17 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。「暦」の字は、問 6-7-1 の答えに従って直します。繰り返しの 2 語（`recurrenceKind`・`recurrencePeriod`）は、問 6-7-3 で聞きます。
直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 7-16 | `calendarUid` |  | このタスクや担当だけの暦。MSPDI の CalendarUID と同じ。GRS は値を持ち続けて書き戻す。GRS は稼働日を project.calendarUid だけで数える。（→ 問 6-7-1） | CalendarUID |
| 7-29 | `fromTime` |  | MSPDI の WorkingTime/FromTime と同じ。 | FromTime |
| 7-30 | `toTime` |  | MSPDI の WorkingTime/ToTime と同じ。00:00:00 は 24:00、つまりその日の終わりを表す。 | ToTime |
| 7-31 | `WorkingTime` |  | MSPDI の WorkingTime と同じ。GRS は、1 日の中で重なる時間帯と、開始が終了以降の時間帯を断る。12:00 に終わる時間帯と 12:00 に始まる時間帯のように接するだけの組は受け入れる。 | WorkingTime |
| 7-32 | `workingTimes` |  | この日の稼働の時間帯（MSPDI の WorkingTimes）。稼働日でこの値を省くと、GRS は既定の 08:00:00-12:00:00 と 13:00:00-17:00:00 の時間帯を使う。 | WorkingTimes |
| 7-33 | `dayWorking` |  | この日が稼働日かどうか（MSPDI の DayWorking）。この値を省くと GRS は非稼働日と読む。 | DayWorking |
| 7-34 | `dayType` |  | MSPDI の WeekDay/DayType と同じで、1 が日曜日。ただし値は 1〜7 で、例外の日は Exception が持つ。 | DayType |
| 7-36 | `fromDate` |  | MSPDI の Exception/TimePeriod/FromDate と同じ。例外の最初の日。GRS は日付だけを読み、日時を足したり変えたりするときは T00:00:00 を書く。 | FromDate |
| 7-37 | `toDate` |  | MSPDI の Exception/TimePeriod/ToDate と同じ。例外の最後の日（その日を含む）。GRS は日付だけを読み、日時を足したり変えたりするときは T23:59:00 を書く。 | ToDate |
| 8-3 | `baseCalendarUid` |  | MSPDI の Calendar/BaseCalendarUID と同じ。この暦が受け継ぐ元の暦。GRS は値を持つだけで、数えるのはこの暦が自分で並べる日だけである。（→ 問 6-7-1） | BaseCalendarUID |
| 8-4 | `isBaseCalendar` |  | MSPDI の Calendar/IsBaseCalendar と同じ。この値を省くと GRS は偽と読む。 | IsBaseCalendar |
| 8-7 | `calendarUid`（持ち主 `Project`） |  | MSPDI の Project/CalendarUID と同じ。GRS はすべての稼働日をこの 1 つの暦（プロジェクトカレンダー）で数える。値を省くか、指す先の暦が欠けているときは、GRS は isBaseCalendar が真で ordinal が最小の暦を使い、それも欠けていれば組み込みの既定を使う。（→ 問 6-7-1） | CalendarUID |
| 7-35 | `WeekDay` |  | MSPDI の WeekDay と同じ。1 つの曜日が稼働日かどうかと、その日の時間帯。（`JDG-3520`） | WeekDay |
| 7-40 | `Exception` |  | MSPDI の Exception と同じ。カレンダーの曜日の決まりに対する、例外の日。繰り返すこともある。（`JDG-3520`） | Exception |
| 8-1 | `weekDays` |  | MSPDI の WeekDays と同じ。このカレンダーの、曜日ごとの決まり。（`JDG-3520`） | WeekDays |
| 8-2 | `exceptions` |  | MSPDI の Exceptions と同じ。このカレンダーの例外の日。（`JDG-3520`） | Exceptions |
| 8-5 | `Calendar` |  | MSPDI の Calendar と同じ。どの日が稼働日かを決める、1 つのカレンダー。（`JDG-3520`） | Calendar |

回答:

### [proj] 🔄 *プロジェクト（❓ 2）*

#### 🔄 *❓ 問 6-8-1. 前の席が付けた名 —— プロジェクトの 5 つ*

🔄 *場面: プロジェクトが、GRS だけの値を持ちます。*

- 🔄 *5 つとも α の名を改めた名です。名を言った裁定の行は 0 です（数え方: `rulings.md` で、キーの前後が英数字でない行を数えた）。*
- 🔄 *前の席が、名付けの決まり（`JDG-3281`: 単位を末尾に、意味の名で。07 の `Naming`）に合わせて選びました（`doc-shape-choices.md` の CHOICE N6〜N9、所見 F16）。*
- 🔄 *`themeHueDegrees` の単位の度は、W3C の CSS Color の色相（hue）の単位 `deg` と同じです。*

| 🔄 *#* | 🔄 *キー* | 🔄 *前の名* | 🔄 *日本語の名（画面）* | 🔄 *意味（日本語）* | 🔄 *決めた所* | 🔄 *MSPDI の名* |
|:---|:---|:---|:---|:---|:---|:---|
| 🔄 *8-26* | 🔄 *`themeHueDegrees`* | 🔄 *`themeHue`* | 🔄 *テーマ色* | 🔄 *テーマの色相（度）。{"kind":"theme"} と書いた色はすべてこの色相を使う。新しいスケジュール文書は 214 で始まる。* | 🔄 *CHOICE N6* | 🔄 *無し* |
| 🔄 *8-27* | 🔄 *`parentTaskProgressToleranceWorkingDays`* | 🔄 *`parentTaskProgressToleranceDays`* | 🔄 *遅延診断時に親タスクの進捗の疑義を許す日数* | 🔄 *親タスクのタスク進捗点が、その下のタスクのタスク進捗点の外にどれだけ（稼働日で）はみ出してよいか。それを超えると、遅延診断が更新の漏れを疑う。新しいスケジュール文書は 1 で始まる。* | 🔄 *所見 F16（Days が暦日か稼働日か分からなかった）* | 🔄 *無し* |
| 🔄 *8-28* | 🔄 *`highestIssuedUid`* | 🔄 *`uidHighWaterMark`* | 🔄 *（無し）* | 🔄 *タスク・担当・割当・暦の uid のための 1 つの数え手。GRS は各 uid を 1 度だけ発行するので、新しい uid はいつもこの値より大きい。（→ 問 6-7-1）* | 🔄 *CHOICE N7* | 🔄 *無し* |
| 🔄 *8-29* | 🔄 *`lastImportNumber`* | 🔄 *`importSequence`* | 🔄 *取り込みの連番* | 🔄 *GRS がこのスケジュール文書へ MSPDI のファイルを取り込んだ回数。0 は取り込む前を表す。GRS は TaskOrigin.lastSeenImportNumber とこの数を比べる。（日本語の名は、後の問 6-12-1 で直す）* | 🔄 *CHOICE N8* | 🔄 *無し* |
| 🔄 *8-30* | 🔄 *`firstOutlineLevel`* | 🔄 *`outlineBase`* | 🔄 *（無し）* | 🔄 *取り込んだ MSPDI のファイルのタスクが始まる OutlineLevel（プロジェクトのまとめのタスクを除いて数える）。GRS は書き出しをこの数から始める。新しいスケジュール文書は 1 で始まる。* | 🔄 *CHOICE N9* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *5 つを表の意味のとおり採る。`parentTaskProgressToleranceWorkingDays` は、`parentTaskUid` と同じ `parentTask…` で始まる（`OKPN`: 親タスクという 1 つの考えを 1 つの語で呼ぶ）。`parentProgress…` だけでは、タスクグループの `parentId` の親とも読める* |
| 🔄 *b* | 🔄 *`parentTaskProgressToleranceWorkingDays` の代わりに `parentProgressToleranceWorkingDays`（短い名で、親の進捗の許す日数という意味を保つ）を使い、ほかの 4 つは a と同じにする* |
| 🔄 *c* | 🔄 *直す所を、キーと意味で書く* |

回答:

#### 🔄 *❓ 問 6-8-5. プロジェクトの 24 語 —— 推奨の表のとおりでよいか*

🔄 *易しい語をまとめた推奨の表です。「暦」の字は、問 6-7-1 の答えに従って直します。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|:---|:---|:---|:---|:---|
| 🔄 *8-6* | 🔄 *`id`（持ち主 `Project`）* |  | 🔄 *MSPDI の Project/UID と同じ。スケジュール文書を開いた元とは別の既存のファイルへ上書きする前に、GRS はこの値と project.name とファイル名がすべて一致するときだけ、そのファイルを同じスケジュール文書と見なす。値を省くと不一致になる。不一致なら、GRS は上書きの前に人へ確かめる。* | 🔄 *UID* |
| 🔄 *8-8* | 🔄 *`name`（持ち主 `Project`）* | 🔄 *<span style="color: #0550AE">プロジェクト名</span>* | 🔄 *MSPDI の Project/Name と同じ。GRS はこの値をプロジェクト名として表示し編集する。アプリヘッダーは title をプロジェクトタイトルとして出す。上書きしようとしている既存のファイルが同じスケジュール文書かを見分けるときにも、GRS は id とファイル名に合わせてこの値を使う。（`JDG-3355`）* | 🔄 *Name* |
| 🔄 *8-9* | 🔄 *`title`* | 🔄 *<span style="color: #0550AE">プロジェクトタイトル</span>* | 🔄 *MSPDI の Project/Title と同じ。GRS はこの値をプロジェクトタイトルとしてアプリヘッダーに出し、別名保存ダイアログの既定のファイル名もこの値から作る。この値を省くと、GRS はブラウザーのタブに Untitled と出す。（`JDG-3355`・`JDG-3365`）* | 🔄 *Title* |
| 🔄 *8-10* | 🔄 *`subject`* |  | 🔄 *MSPDI の Project/Subject と同じ。* | 🔄 *Subject* |
| 🔄 *8-11* | 🔄 *`category`* |  | 🔄 *MSPDI の Project/Category と同じ。* | 🔄 *Category* |
| 🔄 *8-12* | 🔄 *`company`* |  | 🔄 *MSPDI の Project/Company と同じ。* | 🔄 *Company* |
| 🔄 *8-13* | 🔄 *`manager`* |  | 🔄 *MSPDI の Project/Manager と同じ。* | 🔄 *Manager* |
| 🔄 *8-14* | 🔄 *`author`* |  | 🔄 *MSPDI の Project/Author と同じ。作成者を指し、スケジュール文書を最後に書いた者（documentStamp.lastEditedBy）とは役目が違う。* | 🔄 *Author* |
| 🔄 *8-15* | 🔄 *`revision`* |  | 🔄 *MSPDI の Project/Revision と同じ。MSPDI のファイルを作った道具がプロジェクトを保存した回数。documentStamp のどの時刻とも別の値である。* | 🔄 *Revision* |
| 🔄 *8-16* | 🔄 *`creationDate`* |  | 🔄 *MSPDI の Project/CreationDate と同じ。GRS は新しいスケジュール文書を作るときにこの値を書く。* | 🔄 *CreationDate* |
| 🔄 *8-17* | 🔄 *`startDate`* |  | 🔄 *MSPDI の Project/StartDate と同じ。* | 🔄 *StartDate* |
| 🔄 *8-18* | 🔄 *`statusDate`* |  | 🔄 *MSPDI の Project/StatusDate と同じ。GRS はこの日に基準日線を引く。この値を省くと、GRS は基準日線の描画と遅延診断の実行を省く。* | 🔄 *StatusDate* |
| 🔄 *8-19* | 🔄 *`scheduleDataTimeZone`* |  | 🔄 *スケジュールデータの日時の時計の、固定の UTC オフセット。例えば UTC+09:00。標準時であり、GRS は 1 年中このオフセットをそのまま使う。GRS は MSPDI の書き出しからこのオフセットを除く。* | 🔄 *無し* |
| 🔄 *8-20* | 🔄 *`minutesPerDay`* |  | 🔄 *MSPDI の Project/MinutesPerDay と同じ。稼働日 1 日（1d）の長さを分で表し、この値を省くと 480（8 時間）。どれかの稼働日の時間帯の合計がこの値と違えば、スケジュール文書を開くときに GRS は注意を出す。* | 🔄 *MinutesPerDay* |
| 🔄 *8-21* | 🔄 *`minutesPerWeek`* |  | 🔄 *MSPDI の Project/MinutesPerWeek と同じ。* | 🔄 *MinutesPerWeek* |
| 🔄 *8-22* | 🔄 *`daysPerMonth`* |  | 🔄 *MSPDI の Project/DaysPerMonth と同じ。* | 🔄 *DaysPerMonth* |
| 🔄 *8-23* | 🔄 *`weekStartDay`* |  | 🔄 *MSPDI の Project/WeekStartDay と同じで、0 が日曜日。WeekDay.dayType は曜日を 1 から数える点が違う。この値を省くと月曜日（1）。* | 🔄 *WeekStartDay* |
| 🔄 *8-24* | 🔄 *`defaultStartTime`* |  | 🔄 *MSPDI の Project/DefaultStartTime と同じ。日付だけで時刻を省いた開始（Task や BaselineTask の start、actualStart、resume、project.startDate）に GRS が与える時刻で、この値を省くと 08:00:00。マイルストーンの開始には defaultFinishTime を与える。* | 🔄 *DefaultStartTime* |
| 🔄 *8-25* | 🔄 *`defaultFinishTime`* |  | 🔄 *MSPDI の Project/DefaultFinishTime と同じ。日付だけで時刻を省いた終了（Task や BaselineTask の finish、actualFinish、stop、deadline、project.statusDate）に GRS が与える時刻で、この値を省くと 17:00:00。マイルストーンの開始にもこの時刻を与える。* | 🔄 *DefaultFinishTime* |
| 🔄 *8-31* | 🔄 *`sourceFormat`* |  | 🔄 *スケジュール文書の元の形式。GRS で作った文書は grs、MSPDI のファイルから読んだ文書は pj12 か pj15（pj15 だけの要素を 1 つでも持てば pj15）。GRS は MSPDI の書き出しからこの値を除く。* | 🔄 *無し* |
| 🔄 *8-32* | 🔄 *&emsp;+- `grs`（持ち主 `sourceFormat`）* |  | 🔄 *GRS で作ったスケジュール文書。* | 🔄 *無し* |
| 🔄 *8-33* | 🔄 *&emsp;+- `pj12`（持ち主 `sourceFormat`）* |  | 🔄 *2012 年版のスキーマの MSPDI のファイルから読んだスケジュール文書。* | 🔄 *無し* |
| 🔄 *8-34* | 🔄 *&emsp;+- `pj15`（持ち主 `sourceFormat`）* |  | 🔄 *2015 年版のスキーマだけが持つ要素を含む MSPDI のファイルから読んだスケジュール文書。* | 🔄 *無し* |
| 🔄 *8-35* | 🔄 *`Project`* |  | 🔄 *MSPDI の Project と同じ。文書が表す 1 件のプロジェクト。* | 🔄 *Project* |

回答:

### [task] 🔄 *タスクと依存（❓ 2）*

#### 🔄 *❓ 問 6-7-4. 前の席が付けた名 —— `siblingOrder`*

🔄 *場面: タスクとタスクグループが、兄弟の中での順を持ちます。*

- 🔄 *前の名は `Task.wbsOrder` と `TaskGroup.order` です。前の席が、略語 wbs を使わず、2 つを 1 つの名にそろえました（`doc-shape-choices.md` の CHOICE N11）。*
- 🔄 *名を言った裁定の行は 0 です。`erd.json`・src・仕様書にも、この名はありません（数え方は問 6-8-1 と同じ）。*
- 🔄 *木の語では、同じ親を持つ節を sibling（兄弟）と呼びます（W3C の DOM の `nextSibling`・`previousSibling` と同じ語）。*
- 🔄 *`ordinal`（Part 7 の #6）は、MSPDI のファイルでの行の順を指す、別の語です。*

| 🔄 *#* | 🔄 *キー* | 🔄 *前の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|:---|:---|:---|:---|:---|
| 🔄 *7-17* | 🔄 *`siblingOrder`* | 🔄 *`wbsOrder`・`order`* | 🔄 *同じ親の下にある行のあいだでの、この行の順番。* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`siblingOrder`（同じ親の下での行の順番）を採る。タスクとタスクグループの 2 つの順を 1 つの名で呼び（`OKPN`）、名が「兄弟の中での」順を指すと言う（`JDG-820`: 名は何を指すかを言う）* |
| 🔄 *b* | 🔄 *`order`。短いが、何の中での順かを名が言わず、`ordinal` とも紛れる* |
| 🔄 *c* | 🔄 *直す名を書く* |

回答:

#### 🔄 *❓ 問 6-9-5. タスクと依存の 20 語 —— 推奨の表のとおりでよいか*

🔄 *易しい語をまとめた推奨の表です。依存の種類 `linkType` と `Dependency`・`dependencies` は、問 6-7-3 で聞きます。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|:---|:---|:---|:---|:---|
| 🔄 *7-20* | 🔄 *`start`* |  | 🔄 *タスクの予定の開始（MSPDI の Start）。GRS は、すべてのタスクが開始を持つスケジュール文書だけを開く。* | 🔄 *Start* |
| 🔄 *7-21* | 🔄 *`finish`* |  | 🔄 *タスクの予定の終了（MSPDI の Finish）。GRS は、すべてのタスクが終了を持つスケジュール文書だけを開く。* | 🔄 *Finish* |
| 🔄 *7-22* | 🔄 *`milestone`* |  | 🔄 *MSPDI の Task/Milestone と同じ。この値を省くと GRS は偽と読む。真のとき TaskGraphicStyle は milestoneShape を持ち、偽のとき taskShape を持つ。* | 🔄 *Milestone* |
| 🔄 *7-23* | 🔄 *<span style="color: #0550AE">`hyperlinkAddress`</span>* |  | 🔄 *この行のリンク先の URL（タスクでは MSPDI の HyperlinkAddress）。リンクを持つのは、URL を書いた行だけである。（`JDG-3314`）* | 🔄 *HyperlinkAddress（タスクだけ）* |
| 🔄 *7-24* | 🔄 *<span style="color: #0550AE">`hyperlink`</span>* |  | 🔄 *この行のリンクのタイトル。リンク先の URL とは役目が違う（タスクでは MSPDI の Hyperlink）。タイトルを持つのは、タイトルを書いた行だけである。（`JDG-3314`）* | 🔄 *Hyperlink（タスクだけ）* |
| 🔄 *9-1* | 🔄 *`parentTaskUid`* |  | 🔄 *WBS での親タスク。この値を省くと最上位のタスク。* | 🔄 *無し* |
| 🔄 *9-2* | 🔄 *`notes`* |  | 🔄 *MSPDI の Task/Notes と同じ。* | 🔄 *Notes* |
| 🔄 *9-3* | 🔄 *`deadline`* |  | 🔄 *MSPDI の Task/Deadline と同じ。* | 🔄 *Deadline* |
| 🔄 *9-4* | 🔄 *`actualStart`* |  | 🔄 *MSPDI の Task/ActualStart と同じ。この値を省くとタスクは未着手である。* | 🔄 *ActualStart* |
| 🔄 *9-5* | 🔄 *`stop`* |  | 🔄 *MSPDI の Task/Stop と同じ。進行中か中断のタスクで、ここまでの実際の作業の終わり。完了したタスクでは actualFinish がその終わりを持ち、GRS はタスクを完了させるときに stop を空にする。* | 🔄 *Stop* |
| 🔄 *9-6* | 🔄 *`actualFinish`* |  | 🔄 *MSPDI の Task/ActualFinish と同じ。この値を持つのは、完了したタスクだけである。percentComplete が 100 でも、完了を決めるのは actualFinish である。* | 🔄 *ActualFinish* |
| 🔄 *9-7* | 🔄 *`resume`* |  | 🔄 *MSPDI の Task/Resume と同じ。中断したタスクで、残りの作業を再開する予定の時。* | 🔄 *Resume* |
| 🔄 *9-8* | 🔄 *`resumeValid`* |  | 🔄 *MSPDI の Task/ResumeValid と同じ。actualStart を持ち actualFinish を省いたタスクで、偽は再開日未定の中断を表し、GRS は resume の日時を無視する。* | 🔄 *ResumeValid* |
| 🔄 *9-9* | 🔄 *`percentComplete`* |  | 🔄 *MSPDI の Task/PercentComplete と同じ。ただし GRS はこの値を、実績の稼働時間（actualStart から actualFinish まで、または stop まで）を予定の稼働時間（start から finish まで）で割り、100 を掛けて丸めた数として計算し直す。100 を超える計算結果も、そのまま値にする。予定の稼働時間が 0 のとき（マイルストーンなど）は、actualFinish を持つタスクが 100、それ以外が 0。* | 🔄 *PercentComplete* |
| 🔄 *9-10* | 🔄 *<span style="color: #0550AE">`fadeInCalendarDays`</span>* |  | 🔄 *開始が未確定であることを示すために、予定バーの始まりにフェード斜面を描く暦日の数。矩形では始まりの辺が斜めになる。矢羽根では始まりの切り欠きの深さになる。ほかの形ではこの値を無視する。この値を省くとフェードの描画を省く（矢羽根は既定の深さを保つ）。0 は平らな始まり。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`）* | 🔄 *ExtendedAttribute* |
| 🔄 *9-11* | 🔄 *<span style="color: #0550AE">`fadeOutCalendarDays`</span>* |  | 🔄 *fadeInCalendarDays と同じことを終わりの側に対して行う（矢羽根では先の深さ）。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`）* | 🔄 *ExtendedAttribute* |
| 🔄 *9-13* | 🔄 *`Task`* |  | 🔄 *MSPDI の Task と同じ。GRS は進捗ステータスを次の順に調べ、最初に当たったものを取る: actualStart を省いていれば未着手、actualFinish があれば完了、resumeValid が偽なら中断・再開日未定、resume があれば中断・再開予定あり、それ以外は進行中。* | 🔄 *Task* |
| 🔄 *8-36* | 🔄 *`predecessorUid`* |  | 🔄 *MSPDI の PredecessorLink/PredecessorUID と同じ。* | 🔄 *PredecessorUID* |
| 🔄 *8-38* | 🔄 *`linkLag`* |  | 🔄 *MSPDI の PredecessorLink/LinkLag と同じ。lagFormat がどの単位でも、ラグを 0.1 分単位で持つ。この値を省くとラグは 0。1 稼働日のラグは project.minutesPerDay の 10 倍（project.minutesPerDay を省いたときは 480（8 時間）の 10 倍）。* | 🔄 *LinkLag* |
| 🔄 *8-39* | 🔄 *`lagFormat`* |  | 🔄 *MSPDI の PredecessorLink/LagFormat と同じ。GRS がラグを解するのは値が 7（稼働日）、5（時間）、3（分）のときだけで、ほかの単位ではラグを表示するだけで値はそのまま持つ。GRS は、利用者がラグを打ち込んだ単位を書く。* | 🔄 *LagFormat* |

回答:

### [res] 🔄 *担当と割当（❓ 1）*

#### 🔄 *❓ 問 6-9-6. 担当と割当の 4 語 —— 推奨の表のとおりでよいか*

🔄 *易しい語をまとめた推奨の表です。担当の種類 `resourceKind` は、問 6-7-3 で聞きます。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|:---|:---|:---|:---|:---|
| 🔄 *9-15* | 🔄 *`isCostResource`* |  | 🔄 *MSPDI の Resource/IsCostResource と同じ。この値を省くと GRS は偽と読む。* | 🔄 *IsCostResource* |
| 🔄 *9-16* | 🔄 *`Resource`* |  | 🔄 *MSPDI の Resource と同じ。タスクに就く担当。* | 🔄 *Resource* |
| 🔄 *9-17* | 🔄 *`resourceUid`* |  | 🔄 *MSPDI の Assignment/ResourceUID と同じ。* | 🔄 *ResourceUID* |
| 🔄 *9-18* | 🔄 *`Assignment`* |  | 🔄 *MSPDI の Assignment と同じ。どの担当がどのタスクに就くか。* | 🔄 *Assignment* |

回答:

### [tg] 🔄 *タスクグループ（❓ 2）*

#### 🔄 *❓ 問 6-9-2. 前の席が付けた名 —— `representedTaskUid`*

🔄 *場面: タスクグループが、WBS のどのタスクを表すかを持ちます。*

- 🔄 *前の名は `derivedFromTaskUid` です。所見 F27（残る役目は「このタスクグループが WBS でどのタスクを表すか」だけ。仕様書の `HM-9`・`HM-12`）から、前の席が名を付けました。*
- 🔄 *名を言った裁定の行は 0 です。`erd.json`・src・仕様書にもありません（数え方は問 6-8-1 と同じ）。*
- 🔄 *タスクグループの名前は、このタスクの名前と別に、タスクグループ自身の `name` が持ちます。*

| 🔄 *#* | 🔄 *キー* | 🔄 *前の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|:---|:---|:---|:---|:---|
| 🔄 *9-20* | 🔄 *`representedTaskUid`* | 🔄 *`derivedFromTaskUid`* | 🔄 *このタスクグループが WBS で表すタスク。値を書いたタスクグループだけが、タスクを表す。タスクグループの名前は name が持ち、このプロパティが指すタスクの名前から独立している。* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`representedTaskUid`（このタスクグループが WBS で表すタスクの uid）を採る。名が今の役目「表す」を言う（`JDG-820`）。前の名の「derived from（〜から作った）」は、作った後に名前が離れても続く今の関係を言い当てない（`OMPV`）* |
| 🔄 *b* | 🔄 *`wbsTaskUid`。WBS の側のタスクを指すと読めるが、「表す」という関係を名が言わない* |
| 🔄 *c* | 🔄 *直す名を書く* |

回答:

#### 🔄 *❓ 問 6-9-7. タスクグループの 12 語 —— 推奨の表のとおりでよいか*

🔄 *易しい語をまとめた推奨の表です。兄弟の中での順 `siblingOrder` は、問 6-7-4 で聞きます。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|:---|:---|:---|:---|:---|
| 🔄 *9-19* | 🔄 *`parentId`* |  | 🔄 *親のタスクグループ。この値を省くと最上位のタスクグループ（深さ 1）。* | 🔄 *無し* |
| 🔄 *9-21* | 🔄 *`treeState`* |  | 🔄 *タスクグループパネルで、タスクグループが開いているか、閉じているか、隠れているか。auto は documentSettings.taskGroupAutoExpandDepth に従う。temporarilyExpanded は次の全体表示か縦の縮小まで開いたままで、そのあと auto になる。* | 🔄 *無し* |
| 🔄 *9-22* | 🔄 *&emsp;+- `auto`（持ち主 `treeState`）* |  | 🔄 *人が決める前の値。開くかどうかは documentSettings.taskGroupAutoExpandDepth に従う。* | 🔄 *無し* |
| 🔄 *9-23* | 🔄 *&emsp;+- `collapsed`（持ち主 `treeState`）* |  | 🔄 *閉じている。GRS は配下のタスクグループの描画を省く。* | 🔄 *無し* |
| 🔄 *9-24* | 🔄 *&emsp;+- `expanded`（持ち主 `treeState`）* |  | 🔄 *人が選んで開いている。* | 🔄 *無し* |
| 🔄 *9-25* | 🔄 *&emsp;+- `temporarilyExpanded`（持ち主 `treeState`）* |  | 🔄 *次の全体表示か縦の縮小まで開いていて、そのあと auto になる。* | 🔄 *無し* |
| 🔄 *9-26* | 🔄 *&emsp;+- `hidden`（持ち主 `treeState`）* |  | 🔄 *GRS はこのタスクグループをタスクグループパネルから隠す。* | 🔄 *無し* |
| 🔄 *9-27* | 🔄 *`editGroup`* |  | 🔄 *このタスクグループを編集してよいグループの名前。書いてあれば、GRS はこのタスクグループのタスクへの編集を断る。この値を省くと誰でも編集してよい。* | 🔄 *無し* |
| 🔄 *9-28* | 🔄 *`color`* |  | 🔄 *このタスクグループのタスクグループレーンの色。この値を省くと、GRS はレーンの塗りの描画を省く。{"kind":"theme"} はテーマの色を塗る。* | 🔄 *無し* |
| 🔄 *9-29* | 🔄 *`minHeightPx`* |  | 🔄 *このタスクグループのタスクグループレーンの最も低い高さ。値は displayScalePercent が 100 のときの CSS ピクセルで表す。この値を省くと最も低い高さは未指定になる。verticalZoomRatio を変えても、この高さは同じ値を保つ。* | 🔄 *無し* |
| 🔄 *9-30* | 🔄 *<span style="color: #0550AE">`TaskGroup`</span>* |  | 🔄 *タスクグループ。タスクグループパネルの 1 行と、1 つのタスクグループレーン。タスクグループは WBS（Task.parentTaskUid）とは別の自分の木を作る。GRS は MSPDI の書き出しからタスクグループを除く。（`JDG-3361`）* | 🔄 *無し* |
| 🔄 *9-31* | 🔄 *`TaskGroupMember`* |  | 🔄 *GRS がタスクをどのタスクグループに描くか。どのタスクもちょうど 1 つのタスクグループに入る。GRS は、documentSettings.stackDirection の向きに、タスクグループのタスクを自分で積む。* | 🔄 *無し* |

回答:

***

## ❓ 自由

答えを読んで、ほかに聞きたいこと・違うと思う所があれば、ここに書いてください。

回答:
