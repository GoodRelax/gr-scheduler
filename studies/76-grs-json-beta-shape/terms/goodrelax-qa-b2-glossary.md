
# 名の辞書（用語集）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA2 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

2026-10-28 に作り、2026-11-05 に書き直した。② の辞書の初版ができ、③ のレビューを始めた。この紙で、名の辞書のスキーマ → 辞書 → 辞書のレビューまでを進める（`JDG-3424` の ①〜③）。スキーマの案は `glossary-draft/glossary.schema.json`（`CR-857` が `docs/development-rules/` へ移すまでの下書き）。

残 0 ✅

2026-11-15、あなたの指示で、この紙を閉じて約束の面ごとの冊に分けました（`JDG-3568`）: GRS JSON は BGQA3（`goodrelax-qa-b3-grs-json.md`）、文書の命令は BGQA4、Agent API は BGQA5。この紙は、決まりと決定事項の記録として残します。

2026-11-08、あなたの指示で、この紙を今回の答えで止めました（`JDG-3555`）。ホワイトボード（GRWB）での議論を先にします。残りの問いは、GRWB の議論の後で続きを出します。決まった答えは `JDG-3547`〜`JDG-3555` に書き、決定事項へ移しました。

2026-11-13、あなたの答え「a まだ延ばさない。 優先度を上げる。 どんどん持ってこい。 ただし整理して濃い。」（`JDG-3566`）を受けて、次の巡を出します。前回までの残りに、外との約束に出る語の次の分を足しました: GRS JSON の Part 7・9〜13 の 168 語と、Agent API・文書の命令の Part 30〜37 の 287 語です。易しい語は分野ごとの推奨の表にまとめ、争点のある語だけを 1 問ずつ立てました。あなたの命令「GRWB が使えないので、GQA ベース」（`JDG-3567`）に従い、どの問いもこの紙だけで答えられる形にしました。

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
| `kind` と `type`（問 6-7-3-2） | キーに `kind` は使わない。値で自分の欄の組が変わる判別子は `type`（GRS JSON・文書の命令・Agent API のすべて）。形を変えない分類（MSPDI の Type を写す `dayType`・`recurrenceType`・`linkType`・`resourceType`）や別の物の型（`Refusal.commandType`・`AgentTableColumn.valueType`）は `xxxType`。`uid` の値は 1〜2^31−1 | `JDG-3563`・`JDG-3564` |
| GRS 固有の実体の `id` | 名は `id` のまま。値は版 4 のランダムな UUID で、テンプレートから始めるときも毎回作り直す。読むときは版を問わない。定義文の 2 文目「A random UUID, so that entities made apart do not share it.」／「ランダムな UUID で、別々に作った実体どうしが同じ値を持たないようにする。」 | `JDG-3565` |
| この紙の進め方（2026-11-13） | GRWB を待たず、GQA だけで進める。どの問いも、この紙だけで答えられる形にする | `JDG-3567` |
| 名の辞書の進め方（2026-11-13） | 日程はまだ延ばさない。名の辞書の優先度を上げ、問いを多く出す。ただし分野ごとに束ね、中身を濃くする | `JDG-3566` |
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

この紙の問いは、すべて閉じるか移しました（2026-11-15、`JDG-3568`）。答えた問いの言葉は `docs/development-records/rulings.md` の JDG の行に、結果は上の決定事項にあります。
開いていた問いは、GRS JSON を BGQA3（`goodrelax-qa-b3-grs-json.md`）へ、残りを出す前の置き場（`13-glossary-queue.md`）へ移しました。文書の命令は BGQA4、Agent API は BGQA5 として、GRS JSON の後に出します。

### [rule] 進め方と形 ✅

### [whole] 全体の書き方 ✅

### [time] 日時の型 ✅

### [color] 色 ✅

### [col] 表の列 ✅

### [cal] カレンダー ✅

### [proj] プロジェクト ✅

### [task] タスクと依存 ✅

### [res] 担当と割当 ✅

### [tg] タスクグループ ✅

***

## ✅ 自由

答えを読んで、ほかに聞きたいこと・違うと思う所があれば、ここに書いてください。

回答:
