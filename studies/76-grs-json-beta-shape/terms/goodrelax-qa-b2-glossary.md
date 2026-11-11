# 名の辞書（用語集）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA2 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

2026-10-28 に作り、2026-11-05 に書き直した。② の辞書の初版ができ、③ のレビューを始めた。この紙で、名の辞書のスキーマ → 辞書 → 辞書のレビューまでを進める（`JDG-3424` の ①〜③）。スキーマの案は `glossary-draft/glossary.schema.json`（`CR-857` が `docs/development-rules/` へ移すまでの下書き）。

残 10（❓ で検索）

2026-11-08、あなたの指示で、この紙を今回の答えで止めました（`JDG-3555`）。ホワイトボード（GRWB）での議論を先にします。残りの問いは、GRWB の議論の後で続きを出します。決まった答えは `JDG-3547`〜`JDG-3555` に書き、決定事項へ移しました。

2026-11-11、あなたの指示で、問 12（「行」を「実体」に直す語の before / after）と問 13（`uid` の「一意」の範囲）だけを出します（`JDG-3560`）。ほかの問いは保留のままです。ボードで決まった答え（`JDG-3556`〜`JDG-3560`）を決定事項へ移し、問 11 を回答済みにしました。同じ日、あなたは問 12 と問 13 に a と答えました（`JDG-3561`・`JDG-3562`）。私は 2 つの答えを辞書の下書きに当て、決定事項へ移しました。ほかの問いは、GRWB の議論の後で続きを出します。

問いは分野ごとにまとめて並べます（`JDG-3517`）。外との約束に出る語を先に確定します（`JDG-3525`）。今回は 7 つの分野です: 全体の書き方（MSPDI の Type の呼び方）→ 色（色の形を決め直す。透け具合は `JDG-3526` で決まった）→ カレンダー → プロジェクト → タスクと依存 → 担当と割当 → タスクグループ。色が決まると Part 6 が閉じます。案の比べ方には 07 の設計原則の観点と、W3C や業界の慣例の名を使います。易しい語は分野ごとに推奨の表でまとめ、争点のある語だけを 1 問ずつ立てます。

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
| 準純粋-可変の「このような関数」 | 準純粋-可変の関数そのもの。主語を書いてはっきりさせる | `JDG-3488`・`JDG-3596` |
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
| 「名は体を表す」の略語（問 9） | **NEIM**（Name Explaining Its Meaning、ねいむ）。07 の設計原則の索引と辞書の Part 1 に足す。gr-sw-maker のレビュー基準には NEIM と NDD を足す（BOSS が立てる SUB が当てる） | `JDG-3546` |

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
| 線の先が消えた時（問 10） | 線の先は `fallback` を持たない。タスクやハイライトボックスを消す命令の中で、GRS が線の先を自由な点に書き換える。開いたファイルで先が無ければ、GRS は線の先を描かずに知らせる。どの参照も「先が消えたら」を 1 つの決まりで扱う | `JDG-3547` |
| MSPDI の Type を写すキー（問 6-7-3） | `recurrenceType`・`linkType`・`resourceType` の 3 つを `…Type` にそろえ、意味の欄に MSPDI の名と違う理由を 1 文で書く | `JDG-3548` |
| この紙の進め方（2026-11-08） | 今回の答えでこの紙を止め、GRWB の議論を先にする。色の 4 問は GRWB で決める | `JDG-3555` |
| ボードの提案 A〜E（問 11） | A〜E を採る。見た目は、どの物でも入れ子の `style` にまとめ、タスクの見た目だけは `scheduleData.taskStyles[]`（`{ taskUid, style }`）に置く。fade は日程のデータなので `Task` に残す。B の順、C の名 3 つ、D の説明 3 つ、E（不透明度を色の外に）も採る | `JDG-3556` |
| `uid` と `id` の使い分け | MSPDI 由来の実体は `uid`（MSPDI の UID と同じ値）、GRS 固有の実体は `id`（GRS が作る UUID）。Project の `id` を `uid` に改める | `JDG-3557` |
| 使い分けを書く所 | 名の辞書の `uid` と `id` の意味の文が持つ。仕様の 5.4 節は辞書の 2 語を引く | `JDG-3558` |
| 実体の呼び方 | 辞書の意味の文では、`uid` や `id` が見分ける物を「実体」（entity）と呼び、「行」（row）と呼ばない | `JDG-3559` |
| `uid` と `id` の定義文 | `uid`: The unique identifier of an MSPDI-derived entity. ／ MSPDI 由来の実体の一意な識別子。`id`: The unique identifier of a GRS-specific entity. ／ GRS 固有の実体の一意な識別子。 | `JDG-3560` |
| 「行」を「実体」に直す 13 語（問 12） | 辞書の意味の文で実体を「行」（row）と呼んでいた 13 語を「実体」（entity）に直す: `ordinal`・`name`・`siblingOrder`・`taskUid`・`taskGroupId`・`hyperlinkAddress`・`hyperlink`・`fillColor`・`strokeColor`・`strokeWidthPx`・`duplicateKey`・`danglingReference`・`notFound`。画面や仕様書の表の行を指す「行」は今のまま | `JDG-3561` |
| `uid` の「一意」の範囲（問 13） | `uid` の定義文に「Unique among entities of the same kind.」／「同じ種類の実体の中で一意。」を足す。どの実体が `uid` / `id` を持つかと値の出どころは、仕様の 5.4 節の表が持ち、5.4 節は辞書の 2 語を引く。仕様の `AT-24` を「同じ種類の実体の中で一意」に直す | `JDG-3562` |
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
| 塗りと線の透け具合（問 6-6-4-9） | キーは `opacityPercent`（0〜100。100 が透けない。省くと 100。0 のとき GRS はその塗りや線を描かない）。W3C の CSS `opacity`・SVG `fill-opacity` と同じ向き。画面の語も「塗りの透過率（%）」から「不透明度」の向きにそろえる | `JDG-3526` |

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
| 「暦」（問 6-7-1） | 辞書の「暦」をすべて「カレンダー」にする。「暦日」はそのまま。仕様書と画面の語も `CR-857` でそろえる | `JDG-3549` |
| カレンダーの 17 語（問 6-7-5） | 問 6-7-5 の表のとおり | `JDG-3550` |

### [proj] プロジェクト

| 何 | 決め | 裁定 |
|:---|:---|:---|
| `name`・`title`（持ち主 `Project`） | 日本語の名はプロジェクト名・プロジェクトタイトル | `JDG-3355`・`JDG-3518` |
| 前の席が付けた 5 つ（問 6-8-1） | `parentTaskProgressToleranceWorkingDays`・`firstOutlineLevel` を採る。ほかの 3 つは後の裁定に従う: `themeHue`（名の列挙。`JDG-3541`）、数え手は `JDG-3542` の名、取り込みの番号は問 11 の C を待つ | `JDG-3551` |

### [task] タスクと依存

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 依存の種類 | 終了-開始（直列作業）・開始-開始（並列開始）・終了-終了（後追終了）・開始-終了（引継必須）。英語は Finish-to-Start などのまま | `JDG-3463`・`JDG-3468`・`JDG-3486` |
| 兄弟の中での順（問 6-7-4） | タスクとタスクグループの順を、1 つの名 `siblingOrder`（同じ親の下での行の順番。0 が先頭）で呼ぶ | `JDG-3552` |
| MSPDI と同じ名の 17 語（問 6-9-5） | 問 6-9-5 の表のとおり（MSPDI の名と違う 3 語は問 6-9-5 に残した） | `JDG-3553` |

### [res] 担当と割当

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 担当と割当の 4 語（問 6-9-6） | `isCostResource`・`Resource`・`resourceUid`・`Assignment`。どれも MSPDI と同じ名 | `JDG-3553` |

### [tg] タスクグループ

| 何 | 決め | 裁定 |
|:---|:---|:---|
| `TaskGroup` | タスクグループ。WBS とは別の、自分の木を作る | `JDG-3361` |
| タスクグループの 11 語（問 6-9-7） | 問 6-9-7 の表のとおり（`hidden` は問 6-9-7 に残した） | `JDG-3554` |

***

## QA

残りの問いは、すべて保留です（`JDG-3555`）。GRWB の議論の後で、続きを出します。下の「回答:」には、あなたの答えを残しました。

🔄 *後で問うメモ（2026-11-12、あなたの指示「そこは問題だな。 GQAにメモしておけ。 あとで直す。 今はJSONに集中したい。」）:*

- 🔄 *Agent API の値の型 `AgentTableRows`・`AgentTableRow`・`AgentTableColumn`・`AgentTableCell` の名。頭の `Agent` は受け取る者（Agent API の呼び手）を言い、それが何か（画面の表）を言わない（`JDG-820`）。Agent API の分野（Part 30〜34）の問いで出す。*
- 🔄 *同じく `AgentTableColumn.id`。値は列を定める仕様書の行 ID（`SQ-1` など）。席は `rowId` に改める案を出したが、外の人には「データの表の行の識別子」に読めるので取り下げた。今のまま `id` でよいかを、上の名と一緒に問う。*

表の読み方:

- 青い字は、前に裁定した名です。キーの欄が青ければキーの名を、日本語の名の欄が青ければ日本語の名を、裁定が決めました。裁定の番号は意味の欄の最後にあります。
- 表の # は「パート - パートの中の番号」です。番号が飛んでいる所の語は、ほかの問いで聞くか、もう決まっています。
- MSPDI の名の欄の「無し」は、GRS が自分で付けた名です（MSPDI に同じ要素が無い）。
- 表を見る問いでは、直す所が無ければ ok と書き、直す所は表のセルに ★ で書いてください。

### [rule] 進め方と形 ✅

### [whole] 全体の書き方（❓ 1）

#### ✅ 問 11. ボードの提案 A〜E —— 提案通りでよいか

場面: 2026-11-05、ホワイトボードであなたが GRS JSON の例に付けたコメントに、前の席が A〜E の 5 つの提案で答えました（ボードの答え `HNI6iNyEQHqsLJQyr7umZ`。今は左の古い話の列にあります）。前の席は骨組みの図と形の図に A〜E を当てて描きましたが、あなたが A〜E を採るとは、まだどこにも書いてありません。あなたの後の「あとは、お前の提案通りにやってくれ」は、チャットの提案（骨組みを先に描く・推奨の表を分ける。`JDG-3543`）に答えたものと前の席は読みました。

| # | 提案 | 中身 | 07 の原則 |
|:---|:---|:---|:---|
| A | 見た目を入れ子の `style` に | 見た目を、どの物でも入れ子の `style` にまとめる。例: `commentBox { id, text, style { fill, stroke, textColor, fontSizePx }, … }`。`Task` は MSPDI の形のまま保つので、タスクの見た目だけは別の配列 `taskStyles[] { taskUid, style { … } }` に置く（今の名は `taskGraphicStyles`）。`taskGroups`・`commentBoxes`・`highlightBoxes` は本体そのもので、見た目だけの物ではない | `OKPN`（`style` は、どの物でも「見た目だけ」の 1 つの意味）・`SoC` |
| B | 順 | `documentSettings` をルートの一番上に置く。その物を決める値を `id` の次に置く（例: ハイライトボックスの範囲 `firstTaskGroupId`〜`lastDay`）。同じ群の中では 1 行の値を先、入れ子を後に置く（例: `bodyOffsetPx` を `leaderTarget` の前に）。`JDG-3540` の「大事な順」に足す決まり | `JDG-3540` の細かい決まり |
| C | 名 3 つ | ① `lastImportNumber` → `lastMspdiImportNumber`（`TaskOrigin` は `lastSeenMspdiImportNumber`）。取り込んだ物は MSPDI のファイル ② `leaderAnchor` → `leaderTarget`（吹き出し線の先が何に付くか。`kind` は `task`・`highlightBox`・`freePoint` のまま）③ `lanePositionPercent` → `laneTopOffsetPercent`（レーンの上端からの距離を、レーンの高さに対する % で持つ。CSS の `top` と同じ向き）。③ は `JDG-3529` の `lanePositionPercent` を一部改める | `NEIM`（`JDG-3546`）・`OMPV` |
| D | 説明 3 つ | ① `parentTaskProgressToleranceWorkingDays`: 遅延診断が「親タスクの進捗点が子の進捗点の外へはみ出した」と疑うまでの許し幅（稼働日。仕様の `VS-6`・`S-487`）② `siblingOrder`: 同じ親の下での並び順（0 が先頭。ファイルは木を平らに持つので、順を数で持つ）③ `scheduleData` は予定そのもの（人が作った中身）、`documentSettings` は開いた時の見え方。`taskGroupAutoExpandDepth` は「開いた時に何段まで開くか」なので `documentSettings` に置く | `SoC` |
| E | 不透明度を色の外に | `opacityPercent`（`JDG-3526`）を `Color` の中へ入れず、今のまま外に置く。`Color` は文字の色（`textColor`）と帯の色（`LaneColor`）にも使い、そこに不透明度は要らない。W3C のデザイントークン（DTCG）は中に置き、SVG は外（`fill-opacity`）に置く。GRS は SVG で描くので、外ならそのまま渡せる | `ISP` |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | A〜E を提案通り採る。私は裁定を記録し、GRS JSON の例と BGQA2 の色・タスクグループ・注記の問いに当てる |
| b | 直す行に ★ を書き、その行だけを改める |

回答:a  でいいと思うが、確定するために、変更するセクション毎に変化点のbefore/after一覧が欲しい。  afterが変化する部分には

2026-11-11、あなたはボードで節ごとの before / after の表と、提案のスキーマと具体例を見て、A〜E を採りました（`JDG-3556`）。

#### ❓ 問 6-7-3-2. `kind` が残る所と、`type` にそろえるか

場面: 問 6-7-3 で、あなたは a（MSPDI の Type を写す 3 つのキーを `…Type` にそろえる。`JDG-3548`）を選び、「色はkindが残るの？ 他にkindが残る部分は？ typeに統一しないの？ しないならその理由は？」と問いました。GRS JSON の `kind` は、今の決まりでは「形の組の印」（1 つの欄が、いくつかの形のどれかを持つとき、どの形かを示す欄）にだけ使います（`JDG-3348`・`JDG-3309`）。席は GRS JSON の `kind` をすべて数え、GRWB で形の図と並べて見せます（`JDG-3555`）。案は、その後でこの問いに書きます。

回答:

#### ✅ 問 12. 「行」を「実体」に直す 13 語 —— before / after のとおりでよいか

場面: あなたは `uid` と `id` の定義文を決め、辞書の意味の文で実体を「行」と呼ぶ残りを before / after で見せるよう指示しました（`JDG-3560`）。`JDG-3559` は、`uid` や `id` が見分ける物を「実体」（entity）と呼ぶと決めています。私は辞書の全 190 欄で「row」と「行」を探し、実体を指す 15 語（30 欄）を選びました。下の表の after の太字が、変わる所です。

- 1・2 の `uid` と `id` は、あなたの文を辞書の下書きへもう当てました（`JDG-3560`）。表は確かめのために載せます。
- 3〜12 は GRS JSON の共有の型、13〜15 は Agent API の断りの理由（`reason` の値）です。
- 残りの 160 欄は、画面や仕様書の表の行（検索ウィンドウの行、Agent API の `AgentTableRow`、仕様書の行 ID、ガントチャートの段など）か、「先行」「実行」「進行中」のように「行」の字を含む別の語です。私はこれらを今のままにします。

| # | キー | 言語 | before | after |
|:---|:---|:---|:---|:---|
| 1 | `uid`（決定） | en | The identifier of a row that comes from MSPDI (Project, Calendar, Task, Resource, Assignment, BaselineTask), the same value as its MSPDI UID. A row that only GRS has uses id instead. GRS never reuses a uid within its array. | The unique identifier of an MSPDI-derived **entity**. |
|  |  | ja | MSPDI から来た行（Project・Calendar・Task・Resource・Assignment・BaselineTask）の識別子で、MSPDI の UID と同じ値。GRS だけが持つ行は、uid でなく id を使う。GRS は配列の中で uid を使い回さない。 | MSPDI 由来の**実体**の一意な識別子。 |
| 2 | `id`（決定） | en | The identifier of a row that only GRS has (TaskGroup, CommentBox, HighlightBox), a UUID that GRS makes. A row that comes from MSPDI uses uid instead. | The unique identifier of a GRS-specific **entity**. |
|  |  | ja | GRS だけが持つ行（TaskGroup・CommentBox・HighlightBox）の識別子で、GRS が作る UUID。MSPDI から来た行は、id でなく uid を使う。 | GRS 固有の**実体**の一意な識別子。 |
| 3 | `ordinal` | en | The order of this row within its owner as in the MSPDI file; GRS writes the rows back in that order. | The order of this **entity** within its owner as in the MSPDI file; GRS writes the **entities** back in that order. |
|  |  | ja | MSPDI のファイルでの、持ち主の中でのこの行の順番。GRS はその順に書き戻す。 | MSPDI のファイルでの、持ち主の中でのこの**実体**の順番。GRS はその順に書き戻す。 |
| 4 | `name` | en | The name of this row, the same as the MSPDI Name where MSPDI has one. | The name of this **entity**, the same as the MSPDI Name where MSPDI has one. |
|  |  | ja | この行の名前。MSPDI に Name があるものは、それと同じ。 | この**実体**の名前。MSPDI に Name があるものは、それと同じ。 |
| 5 | `siblingOrder` | en | The order of this row among the rows under the same parent. | The order of this **entity** among the **entities** under the same parent. |
|  |  | ja | 同じ親の下にある行のあいだでの、この行の順番。 | 同じ親の下にある**実体**のあいだでの、この**実体**の順番。 |
| 6 | `taskUid` | en | The uid of the task that this row is about. | The uid of the task that this **entity** is about. |
|  |  | ja | この行が扱うタスクの uid。 | この**実体**が扱うタスクの uid。 |
| 7 | `taskGroupId` | en | The id of the task group that this row is about. | The id of the task group that this **entity** is about. |
|  |  | ja | この行が扱うタスクグループの id。 | この**実体**が扱うタスクグループの id。 |
| 8 | `hyperlinkAddress` | en | The URL this row links to (MSPDI HyperlinkAddress for a task). Absent means no link. | The URL this **entity** links to (MSPDI HyperlinkAddress for a task). Absent means no link. |
|  |  | ja | この行のリンク先の URL（タスクでは MSPDI の HyperlinkAddress）。無ければリンクも無い。 | この**実体**のリンク先の URL（タスクでは MSPDI の HyperlinkAddress）。無ければリンクも無い。 |
| 9 | `hyperlink` | en | The title of the link of this row, not the address (MSPDI Hyperlink for a task). Absent means no title. | The title of the link of this **entity**, not the address (MSPDI Hyperlink for a task). Absent means no title. |
|  |  | ja | この行のリンクのタイトル。アドレスではない（タスクでは MSPDI の Hyperlink）。無ければタイトルも無い。 | この**実体**のリンクのタイトル。アドレスではない（タスクでは MSPDI の Hyperlink）。無ければタイトルも無い。 |
| 10 | `fillColor` | en | The fill color of what this row draws: the Plan Bar of a task (the Actual Bar takes its fill from it), the body of a Comment Box, or a Highlight Box. Where it may be absent, absent means no fill. | The fill color of what this **entity** draws: the Plan Bar of a task (the Actual Bar takes its fill from it), the body of a Comment Box, or a Highlight Box. Where it may be absent, absent means no fill. |
|  |  | ja | この行が描くものの塗りの色。タスクでは予定バー（実績バーの塗りもこれから作る）、コメントボックスでは本文の箱、ハイライトボックスではその箱。無くてよい所では、無ければ塗らない。 | この**実体**が描くものの塗りの色。タスクでは予定バー（実績バーの塗りもこれから作る）、コメントボックスでは本文の箱、ハイライトボックスではその箱。無くてよい所では、無ければ塗らない。 |
| 11 | `strokeColor` | en | The outline color of what this row draws: the bars of a task, the border and Leader Line of a Comment Box, or the frame of a Highlight Box. Where it may be absent, absent means no outline. | The outline color of what this **entity** draws: the bars of a task, the border and Leader Line of a Comment Box, or the frame of a Highlight Box. Where it may be absent, absent means no outline. |
|  |  | ja | この行が描くものの線の色。タスクではバーの輪郭、コメントボックスでは枠と引出し線、ハイライトボックスでは枠。無くてよい所では、無ければ線を描かない。 | この**実体**が描くものの線の色。タスクではバーの輪郭、コメントボックスでは枠と引出し線、ハイライトボックスでは枠。無くてよい所では、無ければ線を描かない。 |
| 12 | `strokeWidthPx` | en | The outline width of what this row draws, in CSS pixels at displayScalePercent 100; it scales with displayScalePercent, not with zoom. GRS writes 1 for a new row. | The outline width of what this **entity** draws, in CSS pixels at displayScalePercent 100; it scales with displayScalePercent, not with zoom. GRS writes 1 for a new **entity**. |
|  |  | ja | この行が描くものの線の太さ。displayScalePercent が 100 のときの CSS ピクセルで表す。displayScalePercent で拡大縮小し、ズームでは変わらない。新しい行には 1 を書く。 | この**実体**が描くものの線の太さ。displayScalePercent が 100 のときの CSS ピクセルで表す。displayScalePercent で拡大縮小し、ズームでは変わらない。新しい**実体**には 1 を書く。 |
| 13 | `duplicateKey` | en | Two rows in the same array would have the same key (such as id or uid), for example a new row whose id is already in use. | Two **entities** in the same array would have the same key (such as id or uid), for example a new **entity** whose id is already in use. |
|  |  | ja | 同じ配列の 2 つの行が同じ鍵（id や uid など）を持つことになる。例えば、新しい行の id が既に使われている。 | 同じ配列の 2 つの**実体**が同じ鍵（id や uid など）を持つことになる。例えば、新しい**実体**の id が既に使われている。 |
| 14 | `danglingReference` | en | A property that refers to another row (such as parentTaskUid) points to a row that is not in the document. | A property that refers to another **entity** (such as parentTaskUid) points to an **entity** that is not in the document. |
|  |  | ja | ほかの行を指すプロパティ（parentTaskUid など）が、文書に無い行を指している。 | ほかの**実体**を指すプロパティ（parentTaskUid など）が、文書に無い**実体**を指している。 |
| 15 | `notFound` | en | The named row (a task, task group, box, resource, assignment or dependency) does not exist. | The named **entity** (a task, task group, box, resource, assignment or dependency) does not exist. |
|  |  | ja | 名指した行（タスク、タスクグループ、ボックス、担当、割当、依存）が無い。 | 名指した**実体**（タスク、タスクグループ、ボックス、担当、割当、依存）が無い。 |

注: 10〜12 の 3 語は、`JDG-3556` の A で入れ子の `style` の中へ移ります。そのとき「この実体」は、その `style` を持つ実体を指します。私は `style` の形を辞書に入れる時に、この 3 語の文をもう一度見せます。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 3〜15 を表の after のとおりに直す。私は辞書の下書きに当て、裁定を記録する |
| b | 直す行に ★ を書き、その行だけを改める |

回答:a

#### ✅ 問 13. `uid` の「一意」の範囲を、どこに書くか

場面: あなたの定義文（`JDG-3560`）は「一意」と言い、どの範囲で一意かを言いません。私は仕様を読み、次のことを確かめました。

- GRS は MSPDI のファイルを開く時、`uid` を振り直しません。振り直すのは、取り込んだ文書を今の文書へ合流する時のタスクだけです（`docs/spec/01-04-requirements.md` の 6570 行）。
- MSPDI は種類ごとに UID を数えます。このため 1 つの文書に、Task の `uid` 1 と Resource の `uid` 1 が共に入ります。
- GRS が新しく作る `uid` は、1 つの数え口 `Project.uidHighWaterMark` から採るので、種類をまたいでもぶつかりません（`TC-2`）。けれども、開いたファイルの `uid` はぶつかり得ます。
- `id` は GRS が作る UUID なので、文書全体で一意です。
- 仕様の `AT-24` は「文書内で一意」とだけ書き、範囲を読み分けられません。

つまり `uid` は「同じ種類の実体の中で一意」です。外の道具の作り手がこれを知らないと、`uid` を文書全体の鍵として使い、Task と Resource を取り違えます。

前の定義文が言っていた次の 2 つも、あなたの定義文から外れました: ① どの実体が `uid` を持ち、どの実体が `id` を持つか、② 値の出どころ（`uid` は MSPDI の UID と同じ値、`id` は GRS が作る UUID）。`JDG-3558` は、この考え方を辞書の 2 語の意味の文が持つと決めています。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `uid` の定義文に、範囲を 1 文足す。英語「Unique among entities of the same kind.」、日本語「同じ種類の実体の中で一意。」。`id` は今のまま。① と ② は仕様の 5.4 節に表で書き、5.4 節は辞書の 2 語を引く（`JDG-3558` の置き場を、意味の文は辞書、一覧は 5.4 節に分ける）。`AT-24` も「同じ種類の実体の中で一意」に直す。理由: 外の人は辞書の文をスキーマの説明として読むので、範囲は意味の文が持つのがいちばん確か |
| b | 定義文はあなたの文のまま。範囲と ① ② は、仕様の 5.4 節とスキーマの説明の頭に書く。`AT-24` も a と同じく直す |

回答:a

### [time] 日時の型 ✅

### [color] 色（❓ 4）

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
| 9 | 透明 | 塗りと線の不透明度（`opacityPercent`。100 が透けない）と、色を省く道（タスクの塗りと縁、ハイライトボックスの枠） | する | `JDG-3310`・`JDG-3526` |
| 10 | 透明の制約 | 塗りと線の両方を透明にはできない（画面の通知「塗りと線の両方を透明にはできません」） | しない（GRS が入力を断る） | `FR-007` |
| 11 | コントラストの条件 | パレットの値は、白を除き、地に対して決まったコントラスト比を満たす | しない（アプリの値の条件） | `CV-8` |
| 12 | 文書の外の色 | 非稼働日の塗り・基準日線・マーカーなど、アプリが決める描画と画面の色。色の値を持つ設定の行が 42 行 | しない | `_assets/tbl-settings.md` |

Copilot の案と、上の一覧を比べました。

| Copilot の案 | GRS の今の形と決まり | 07 の観点 |
|:---|:---|:---|
| テーマの色の役割（task・milestone・criticalTask・summaryTask・comment・highlight）を、値に書く | 置き場が役割を決める。値には `{"kind": "theme"}` だけを書く | `OMPV`: 値に書いた役割と置き場が食い違える（タスクの塗りに highlight）。criticalTask は GRS の範囲の外（`JDG-3510`）→ 問 6-6-4-8 |
| カスタムの色は、1 つの #hex | 明るい側と暗い側の 2 つ（要素 6） | 暗いテーマでも同じ値で描き、コントラストの条件（要素 11）を割りうる |
| パレットが無い | 名の付いた 10 色（要素 5） | 名でテーマに追う道が無くなる |
| `opacityPercent`（100 が不透明。既定 100） | 前は `fillTransparencyPercent`（0 が不透明） | `JDG-3526` で `opacityPercent` に決まった（W3C と同じ向き） |
| `Stroke { paint, widthPx }` | `strokeColor` と `strokeWidthPx` を平らに持つ | → 問 6-6-4-10 |
| `ShapeStyle` を 3 つの型で共にする | 型ごとに、必ず持つ欄が違う（コメントボックスは塗り・枠・文字を必ず持つ。タスクは塗りも縁も省ける） | → 問 6-6-4-11 |
| テーマの色の値（#3B82F6 など）を文書に書く | テーマとパレットの値は、アプリの設定だけが持つ。文書は名だけを持つ | `SSOT`: 文書がアプリの値を写すと、2 か所が食い違う |
| 書いていない要素 | モノクロ・色相・タスクグループの帯・文字の色・実績の塗りの導き方・明暗の片側の導き方・透明の制約（要素 2・3・6〜8・10） | 網羅の抜け |

問 6-6-4-8・6-6-4-10・6-6-4-11 の推奨と `JDG-3526` をすべて採ると、色の形は次のとおりです（β の案）。同じ形を、ホワイトボードの UML のクラス図（x 10300・y 9720）にも描きました。

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

```json
"fill": { "color": { "kind": "palette", "name": "red" } }

"fill":   { "color": { "kind": "theme" }, "opacityPercent": 0 },
"stroke": { "color": { "kind": "theme" }, "widthPx": 1 },
"textColor": { "kind": "palette", "name": "ink" }

"fill":   { "color": { "kind": "custom", "light": { "hexColor": "#c0504d", "source": "chosen" } }, "opacityPercent": 50 },
"stroke": { "color": { "kind": "palette", "name": "purple" }, "opacityPercent": 70, "widthPx": 2 }
```

- 上から、タスクのバー（赤で塗り、縁を描かない）・コメントボックス（塗りを見せず、テーマの色の枠と、ink の文字）・タスクのバー（自前の赤を不透明度 50% で塗り、紫の縁を不透明度 70% で描く）です。
- 文書の外のもの（要素 1・7・11・12）と、透明の制約（要素 10）は、スキーマに書きません。GRS が描くときと入力を受けるときに守ります。

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

回答:一旦保留。 GRWBで決めたい。

##### ❓ 問 6-6-4-8. テーマの色の役割 —— 置き場で決めるか、値に書くか

場面: `{"kind": "theme"}` の色は、テーマがその置き場に決める色です（要素 4）。Copilot の案は、役割（task・milestone など）を値に書きます。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 置き場が役割を決める（今の形）。値には `{"kind": "theme"}` だけを書く。1 つの値が 1 つの意味を持つ（`OMPV`）。置き場と役割が食い違う文書を書けない |
| b | 値に役割を書く（`{"kind": "theme", "role": "milestone"}`）。どの置き場でも、ほかの役割のテーマの色を使える。役割の名の一覧を、外との約束として持つ |

回答::一旦保留。 GRWBで決めたい。

##### ❓ 問 6-6-4-10. 線の形 —— 線の太さを線の中に入れるか

場面: 今の形は、線の色 `strokeColor` と太さ `strokeWidthPx` を平らに持ちます。線を描かないタスクにも、太さを必ず書きます。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 線の型 `Stroke { color, opacityPercent, widthPx }` を作る（平ら、2 段）。線を描かないときは、太さも書かない（`NullTrap`・`OMPV`: 描かない線の太さという、意味の無い値を持たない）。塗りは `Paint { color, opacityPercent }`。W3C のデザイントークンの border 型も、色と太さを 1 つの型に入れる（`{ color, width, style }`） |
| b | 塗りも線も `Paint` を取り、太さは今のまま外に置く（`strokeWidthPx`。SVG の `stroke-width` と同じ置き方） |
| c | Copilot の形 `Stroke { paint, widthPx }`（`stroke.paint.color` と 3 段になる） |

回答::一旦保留。 GRWBで決めたい。

##### ❓ 問 6-6-4-11. 3 つの型で、塗りと線の形を共にするか

場面: タスクの描き方・コメントボックス・ハイライトボックスの 3 つの型が、塗りと線を持ちます。必ず持つ欄は型ごとに違います（コメントボックスは塗り・枠・文字を必ず持ち、タスクは塗りも縁も省ける）。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 型 `Paint`・`Stroke` だけを共にし、どの欄を必ず持つかは型ごとに書く（`ISP`: 型ごとに要る欄だけを持つ） |
| b | Copilot の案のように `ShapeStyle { fill, stroke }` を 3 つの型で共にし、必ず持つ欄の違いは型ごとの足しの決まり（`allOf`）で書く（`DRY`） |

回答::一旦保留。 GRWBで決めたい。

### [col] 表の列 ✅

### [cal] カレンダー ✅

### [proj] プロジェクト（❓ 1）

#### ❓ 問 6-8-5. プロジェクトの 24 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。「暦」の字は、問 6-7-1 の答えに従って直します。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
| :-------- | :----------------------------------------------------------------------------------------- | :------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| 8-6 | `id`（持ち主 `Project`） MSPDIと同じくuidにしないのか？ またその理由は？ |  | MSPDI の Project/UID と同じ。スケジュール文書を開いた元とは別の既存のファイルへ上書きする前に、GRS はこの値と project.name とファイル名がすべて一致するときだけ、そのファイルを同じスケジュール文書と見なす。値を省くと不一致になる。不一致なら、GRS は上書きの前に人へ確かめる。 | UID |
| 8-8 | `name`（持ち主 `Project`） | <span style="color: #0550AE">プロジェクト名</span> | MSPDI の Project/Name と同じ。GRS はこの値をプロジェクト名として表示し編集する。アプリヘッダーは title をプロジェクトタイトルとして出す。上書きしようとしている既存のファイルが同じスケジュール文書かを見分けるときにも、GRS は id とファイル名に合わせてこの値を使う。（`JDG-3355`） | Name |
| 8-9 | `title ★ Project.titleって形になるのか？他も同様。projectTitleにする必要はないよね？` | <span style="color: #0550AE">プロジェクトタイトル</span> | MSPDI の Project/Title と同じ。GRS はこの値をプロジェクトタイトルとしてアプリヘッダーに出し、別名保存ダイアログの既定のファイル名もこの値から作る。この値を省くと、GRS はブラウザーのタブに Untitled と出す。（`JDG-3355`・`JDG-3365`） | Title |
| 8-10 | `subject` |  | MSPDI の Project/Subject と同じ。 | Subject |
| 8-11 | `category` |  | MSPDI の Project/Category と同じ。 | Category |
| 8-12 | `company` |  | MSPDI の Project/Company と同じ。 | Company |
| 8-13 | `manager` |  | MSPDI の Project/Manager と同じ。 | Manager |
| 8-14 | `author` |  | MSPDI の Project/Author と同じ。作成者を指し、スケジュール文書を最後に書いた者（documentStamp.lastEditedBy）とは役目が違う。 | Author |
| 8-15 | `revision` |  | MSPDI の Project/Revision と同じ。MSPDI のファイルを作った道具がプロジェクトを保存した回数。documentStamp のどの時刻とも別の値である。 | Revision |
| 8-16 | `creationDate` |  | MSPDI の Project/CreationDate と同じ。GRS は新しいスケジュール文書を作るときにこの値を書く。 | CreationDate |
| 8-17 | `startDate` |  | MSPDI の Project/StartDate と同じ。 | StartDate |
| 8-18 | `statusDate` |  | MSPDI の Project/StatusDate と同じ。GRS はこの日に基準日線を引く。この値を省くと、GRS は基準日線の描画と遅延診断の実行を省く。 | StatusDate |
| 8-19 | `scheduleDataTimeZone` |  | スケジュールデータの日時の時計の、固定の UTC オフセット。例えば UTC+09:00。標準時であり、GRS は 1 年中このオフセットをそのまま使う。GRS は MSPDI の書き出しからこのオフセットを除く。 | 無し |
| 8-20 | `minutesPerDay` |  | MSPDI の Project/MinutesPerDay と同じ。稼働日 1 日（1d）の長さを分で表し、この値を省くと 480（8 時間）。どれかの稼働日の時間帯の合計がこの値と違えば、スケジュール文書を開くときに GRS は注意を出す。 | MinutesPerDay |
| 8-21 | `minutesPerWeek` |  | MSPDI の Project/MinutesPerWeek と同じ。 | MinutesPerWeek |
| 8-22 | `daysPerMonth` |  | MSPDI の Project/DaysPerMonth と同じ。 | DaysPerMonth |
| 8-23 | `weekStartDay` |  | MSPDI の Project/WeekStartDay と同じで、0 が日曜日。WeekDay.dayType は曜日を 1 から数える点が違う。この値を省くと月曜日（1）。 | WeekStartDay |
| 8-24 | `defaultStartTime` |  | MSPDI の Project/DefaultStartTime と同じ。日付だけで時刻を省いた開始（Task や BaselineTask の start、actualStart、resume、project.startDate）に GRS が与える時刻で、この値を省くと 08:00:00。マイルストーンの開始には defaultFinishTime を与える。 | DefaultStartTime |
| 8-25 | `defaultFinishTime` |  | MSPDI の Project/DefaultFinishTime と同じ。日付だけで時刻を省いた終了（Task や BaselineTask の finish、actualFinish、stop、deadline、project.statusDate）に GRS が与える時刻で、この値を省くと 17:00:00。マイルストーンの開始にもこの時刻を与える。 | DefaultFinishTime |
| 8-31 | `sourceFormat` |  | スケジュール文書の元の形式。GRS で作った文書は grs、MSPDI のファイルから読んだ文書は pj12 か pj15（pj15 だけの要素を 1 つでも持てば pj15）。GRS は MSPDI の書き出しからこの値を除く。 | 無し |
| 8-32 | &emsp;+- `grs`（持ち主 `sourceFormat`） |  | GRS で作ったスケジュール文書。 | 無し |
| 8-33 | &emsp;+- `pj12`（持ち主 `sourceFormat`） |  | 2012 年版のスキーマの MSPDI のファイルから読んだスケジュール文書。 | 無し |
| 8-34 | &emsp;+- `pj15`（持ち主 `sourceFormat`） |  | 2015 年版のスキーマだけが持つ要素を含む MSPDI のファイルから読んだスケジュール文書。 | 無し |
| 8-35 | `Project` |  | MSPDI の Project と同じ。文書が表す 1 件のプロジェクト。 | Project |

回答:上記コメント参照

### [task] タスクと依存（❓ 1）

#### ❓ 問 6-9-5. タスクと依存の、MSPDI の名と違う 3 語

あなたの答え「MSPDI同じならOK。 違うならそこだけ抽出して、裁定に回せ。」に従い、MSPDI の名と同じ 17 語を確定しました（`JDG-3553`）。キーが MSPDI の名と違う 3 語を、ここに残しました。案は GRWB の議論の後でこの問いに書きます。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 9-1 | `parentTaskUid` |  | WBS での親タスク。この値を省くと最上位のタスク。 | 無し |
| 9-10 | <span style="color: #0550AE">`fadeInCalendarDays`</span> |  | 開始が未確定であることを示すために、予定バーの始まりにフェード斜面を描く暦日の数。矩形では始まりの辺が斜めになる。矢羽根では始まりの切り欠きの深さになる。ほかの形ではこの値を無視する。この値を省くとフェードの描画を省く（矢羽根は既定の深さを保つ）。0 は平らな始まり。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`） | ExtendedAttribute |
| 9-11 | <span style="color: #0550AE">`fadeOutCalendarDays`</span> |  | fadeInCalendarDays と同じことを終わりの側に対して行う（矢羽根では先の深さ）。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`） | ExtendedAttribute |

回答:

### [res] 担当と割当 ✅

### [tg] タスクグループ（❓ 2）

#### ❓ 問 6-9-2. 前の席が付けた名 —— `representedTaskUid`

場面: タスクグループが、WBS のどのタスクを表すかを持ちます。

- 前の名は `derivedFromTaskUid` です。所見 F27（残る役目は「このタスクグループが WBS でどのタスクを表すか」だけ。仕様書の `HM-9`・`HM-12`）から、前の席が名を付けました。
- 名を言った裁定の行は 0 です。`erd.json`・src・仕様書にもありません（数え方は問 6-8-1 と同じ）。
- タスクグループの名前は、このタスクの名前と別に、タスクグループ自身の `name` が持ちます。

| # | キー | 前の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 9-20 | `representedTaskUid` | `derivedFromTaskUid` | このタスクグループが WBS で表すタスク。値を書いたタスクグループだけが、タスクを表す。タスクグループの名前は name が持ち、このプロパティが指すタスクの名前から独立している。 | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `representedTaskUid`（このタスクグループが WBS で表すタスクの uid）を採る。名が今の役目「表す」を言う（`JDG-820`）。前の名の「derived from（〜から作った）」は、作った後に名前が離れても続く今の関係を言い当てない（`OMPV`） |
| b | `wbsTaskUid`。WBS の側のタスクを指すと読めるが、「表す」という関係を名が言わない |
| c | 直す名を書く |

回答:微妙。 他の案を出せ。 MSPDI由来ならその旨が分かるようにしろ。

#### ❓ 問 6-9-7. `hidden` とピン止め

ほかの 11 語は、あなたの答えで確定しました（`JDG-3554`）。表のあなたの問い（★）に答えます: ピン止めは `treeState` と別の値で、文書の設定がピン止めしたタスクグループの id の並びとして持ちます（仕様書の設定の表の `S-126`）。タスクグループを消すと、GRS はそのピン止めも消します（`CD-2`）。`hidden` とピン止めを両方持つタスクグループをどう見せるかは、GRWB の議論の後でこの問いに案を書きます。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
| :-------- | :-------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------- |
| 9-26 | &emsp;+- `hidden`（持ち主 `treeState`） |  | GRS はこのタスクグループをタスクグループパネルから隠す。 ★ピン止めはどう管理するの？ | 無し |

回答:

***

## ❓ 自由

答えを読んで、ほかに聞きたいこと・違うと思う所があれば、ここに書いてください。

回答:
