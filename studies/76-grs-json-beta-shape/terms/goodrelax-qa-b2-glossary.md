BGQA2

# 名の辞書（用語集）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA2 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

2026-10-28 に作り、2026-11-01 に書き直した。② の辞書の初版ができ、③ のレビューを始めた。この紙で、名の辞書のスキーマ → 辞書 → 辞書のレビューまでを進める（`JDG-3424` の ①〜③）。スキーマの案は `glossary-draft/glossary.schema.json`（`CR-857` が `docs/development-rules/` へ移すまでの下書き）。

🔄 *残 9（❓ で検索）*

🔄 *問いは分野ごとにまとめて並べます（`JDG-3517`）。外との約束に出る語を先に確定します（`JDG-3525`）。今回は 3 つの分野です: 全体の書き方（MSPDI の Type の呼び方）→ 色（色の要素を網羅して、形を決め直す）→ カレンダー。色が決まると Part 6 が閉じます。案の比べ方には 07 の設計原則の観点を使います。易しい語は推奨の表でまとめ、争点のある語だけを 1 問ずつ立てます。*

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

### [col] 表の列

| 何 | 決め | 裁定 |
|:---|:---|:---|
| `ColumnKey`・`ColumnFilter` の `kind`・`values`・`dateRange`・`isBlankHidden` | 表の列の固定の英語の名前と、列のフィルタの 2 つの形（値で隠す・日の範囲の外を隠す）、空のセルの行を隠すかの真偽 | `JDG-3514` |
| `hiddenValues` | 列のフィルタの値の一覧で、人がチェックを外した値の並び。この列のセルがこの値のどれかを持つ行を、フィルタが隠す。フィルタの形 `"kind": "values"` と同じ語で読む | `JDG-3522` |
| `column`・`ColumnFilter`・`direction`・`ascending`・`descending`・`ColumnSort` | 問 6-6-5 の表のとおり | `JDG-3522` |

### [cal] 🔄 *カレンダー*

| 🔄 *何* | 🔄 *決め* | 🔄 *裁定* |
|:---|:---|:---|
| 🔄 *意味を足した 5 語* | 🔄 *`WeekDay`・`Exception`・`weekDays`・`exceptions`・`Calendar` に、何を表す語かの 1 文を足す* | 🔄 *`JDG-3520`* |

***

## QA

表の読み方:

- 青い字は、前に裁定した名です。キーの欄が青ければキーの名を、日本語の名の欄が青ければ日本語の名を、裁定が決めました。裁定の番号は意味の欄の最後にあります。
- 表の # は「パート - パートの中の番号」です。番号が飛んでいる所の語は、ほかの問いで聞くか、もう決まっています。
- MSPDI の名の欄の「無し」は、GRS が自分で付けた名です（MSPDI に同じ要素が無い）。
- 表を見る問いでは、直す所が無ければ ok と書き、直す所は表のセルに ★ で書いてください。

### [rule] 進め方と形（❓ 0）

### [whole] 🔄 *全体の書き方（❓ 1）*

#### 🔄 *❓ 問 6-7-3. MSPDI の Type を、GRS は 2 つの言い方で呼んでいる*

🔄 *場面: MSPDI の名と GRS JSON のキーが違う語を、この表に並べました。*

| 🔄 *#* | 🔄 *キー* | 🔄 *MSPDI の名* | 🔄 *中身* |
|:---|:---|:---|:---|
| 🔄 *7-38* | 🔄 *`recurrenceKind`* | 🔄 *Exception/Type* | 🔄 *例外の繰り返し方の数（1〜9）* |
| 🔄 *7-39* | 🔄 *`recurrencePeriod`* | 🔄 *Exception/Period* | 🔄 *繰り返しの間隔* |
| 🔄 *8-37* | 🔄 *`linkType`* | 🔄 *PredecessorLink/Type* | 🔄 *依存の種類の数（0〜3）* |
| 🔄 *9-14* | 🔄 *`resourceKind`* | 🔄 *Resource/Type* | 🔄 *担当の種類の数* |
| 🔄 *8-40・9-12* | 🔄 *`Dependency`・`dependencies`* | 🔄 *PredecessorLink* | 🔄 *依存* |

- 🔄 *同じ MSPDI の名 `Type` を、GRS は `…Type`（1 つ）と `…Kind`（2 つ）の 2 つの語尾で呼びます。GRS は 1 つの考えに 2 つの名を付けています（`OKPN`）。*
- 🔄 *GRS JSON の `kind` は「形の組の印」だけに使う決まりです（`JDG-3348`・`JDG-3309`）。`recurrenceKind` と `resourceKind` は数の符号なので、`kind` と紛れます。*
- 🔄 *`Type` を残すと、3 つの要素の意味の違いが名から読めないので、GRS は名を変える（`OMPV`）。`Dependency` は、日程の考えの語「依存」（`dependency`。`JDG-3435` で確定）に合わせた名です。*
- 🔄 *意味の欄には、MSPDI の名と違う理由が書いてありません。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`recurrenceKind` → `recurrenceType`、`resourceKind` → `resourceType` にして、3 つを `…Type` にそろえる。意味の欄に、MSPDI の名と違う理由を 1 文で書く* |
| 🔄 *b* | 🔄 *名は今のまま。意味の欄に、MSPDI の名と違う理由を 1 文で書く* |
| 🔄 *c* | 🔄 *名も意味の欄も今のまま* |

回答:

### [time] 日時の型（❓ 0）

### [color] 🔄 *色（❓ 5）*

#### 🔄 *✅ 問 6-6-4-6. 塗りの型 `Paint` —— スキーマと実例*

🔄 *場面: 前の回で、塗りの型 `Paint` のスキーマと実例を出しました。あなたの答え（下）を受けて、色の要素を網羅し、形を決め直します。*

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

##### 🔄 *❓ 問 6-6-4-7. 色の要素の一覧 —— 抜けと誤りは無いか*

🔄 *場面: あなたは「ここ、大事なところだから、丁寧に考えよう。 そもそも色について必要な要素を網羅的に列挙しろ。テーマとかあるやろ？ ダーク・ライトも.... ちなみにCopilotに聞いたらこっちも中途半端な回答が来た。 まぁ、参考にしろ。」と書きました。*

🔄 *GRS の色の要素を、仕様書と β の形から 12 に数えました（数え方: `doc-shape-map.tsv` で `Color`・`LaneColor` を取るプロパティと、テーマ・色相・モノクロのプロパティ。仕様書の表 T-017b の `CV-1`〜`CV-10`、表 T-294、`FR-039`、`FR-007`。文書の外の色は `_assets/tbl-settings.md` の `S-` の行のうち、`#rrggbb` か `rgba(` の値を持つ行）。*

| 🔄 *#* | 🔄 *要素* | 🔄 *中身* | 🔄 *文書に保存するか* | 🔄 *決めた所* |
|:---|:---|:---|:---|:---|
| 🔄 *1* | 🔄 *明暗（表示のテーマ）* | 🔄 *light と dark。GRS は、起動したときにブラウザーが伝える明暗で描き、読めないときは light で描く。画面の切り替えは、そのページを閉じるまで効く* | 🔄 *しない（読む人ごとに違う）* | 🔄 *`FR-039`* |
| 🔄 *2* | 🔄 *モノクロ* | 🔄 *決まった色を無彩色にして描く* | 🔄 *する（`documentSettings.isThemeMonochrome`）* | 🔄 *`CV-7`* |
| 🔄 *3* | 🔄 *テーマの色相* | 🔄 *テーマの色を、この色相で描く。新しい文書は 214* | 🔄 *する（`project.themeHueDegrees`）* | 🔄 *`doc-shape-map.tsv`（問 6-8-1 で名を問う）* |
| 🔄 *4* | 🔄 *色の 3 つの源* | 🔄 *theme（テーマが、その置き場に決める色）・palette（名の付いた 10 色）・custom（人が決めた色）* | 🔄 *する（`Color.kind`）* | 🔄 *`JDG-3260`・`JDG-3310`* |
| 🔄 *5* | 🔄 *パレットの 10 色* | 🔄 *paper・ink・dimGray・lightGray・red・blue・yellow・green・orange・purple。1 つの名が、明暗ごとに 4 つの値を持つ: 塗り・縁・実績の塗り・タスクグループの帯（10 × 4 × 2 = 80 の値）* | 🔄 *名だけ保存する。値はアプリが持つ（表 T-294）* | 🔄 *`CV-1`・`CV-6`* |
| 🔄 *6* | 🔄 *カスタムの色* | 🔄 *明るい側と暗い側。各側は `hexColor` と `source`（chosen・derived）を持つ。片側を省くと、GRS は文書を開くときに、もう一方の側から作る（色相を保って明度を反転する）* | 🔄 *する* | 🔄 *`CV-2`〜`CV-4`・`JDG-3523`* |
| 🔄 *7* | 🔄 *置き場ごとに導く値* | 🔄 *1 つの色から、置き場に応じて描く値を導く。予定バーの塗りは塗りの値、実績バーの塗りは実績の塗りの値（カスタムの色は、選んだ値から HSL で導く）、縁は縁の値* | 🔄 *しない（描くときに導く）* | 🔄 *`CV-6`・`CV-10`* |
| 🔄 *8* | 🔄 *色を塗る 8 つの置き場* | 🔄 *タスクグループの帯（`LaneColor`。ink を取らない）・タスクの塗りと縁・コメントボックスの塗りと枠（引出し線を含む）と文字・ハイライトボックスの塗りと枠* | 🔄 *する* | 🔄 *`doc-shape-map.tsv`* |
| 🔄 *9* | 🔄 *透明* | 🔄 *塗りの透過率（コメントボックスとハイライトボックスの塗り）と、色を省く道（タスクの塗りと縁、ハイライトボックスの枠）* | 🔄 *する* | 🔄 *`JDG-3310`* |
| 🔄 *10* | 🔄 *透明の制約* | 🔄 *塗りと線の両方を透明にはできない（画面の通知「塗りと線の両方を透明にはできません」）* | 🔄 *しない（GRS が入力を断る）* | 🔄 *`FR-007`* |
| 🔄 *11* | 🔄 *コントラストの条件* | 🔄 *パレットの値は、白を除き、地に対して決まったコントラスト比を満たす* | 🔄 *しない（アプリの値の条件）* | 🔄 *`CV-8`* |
| 🔄 *12* | 🔄 *文書の外の色* | 🔄 *非稼働日の塗り・基準日線・マーカーなど、アプリが決める描画と画面の色。色の値を持つ設定の行が 42 行* | 🔄 *しない* | 🔄 *`_assets/tbl-settings.md`* |

🔄 *Copilot の案と、上の一覧を比べました。*

| 🔄 *Copilot の案* | 🔄 *GRS の今の形と決まり* | 🔄 *07 の観点* |
|:---|:---|:---|
| 🔄 *テーマの色の役割（task・milestone・criticalTask・summaryTask・comment・highlight）を、値に書く* | 🔄 *置き場が役割を決める。値には `{"kind": "theme"}` だけを書く* | 🔄 *`OMPV`: 値に書いた役割と置き場が食い違える（タスクの塗りに highlight）。criticalTask は GRS の範囲の外（`JDG-3510`）→ 問 6-6-4-8* |
| 🔄 *カスタムの色は、1 つの #hex* | 🔄 *明るい側と暗い側の 2 つ（要素 6）* | 🔄 *暗いテーマでも同じ値で描き、コントラストの条件（要素 11）を割りうる* |
| 🔄 *パレットが無い* | 🔄 *名の付いた 10 色（要素 5）* | 🔄 *名でテーマに追う道が無くなる* |
| 🔄 *`opacityPercent`（100 が不透明。既定 100）* | 🔄 *`fillTransparencyPercent`（0 が不透明。画面の語「塗りの透過率（%）」）* | 🔄 *→ 問 6-6-4-9* |
| 🔄 *`Stroke { paint, widthPx }`* | 🔄 *`strokeColor` と `strokeWidthPx` を平らに持つ* | 🔄 *→ 問 6-6-4-10* |
| 🔄 *`ShapeStyle` を 3 つの型で共にする* | 🔄 *型ごとに、必ず持つ欄が違う（コメントボックスは塗り・枠・文字を必ず持つ。タスクは塗りも縁も省ける）* | 🔄 *→ 問 6-6-4-11* |
| 🔄 *テーマの色の値（#3B82F6 など）を文書に書く* | 🔄 *テーマとパレットの値は、アプリの設定だけが持つ。文書は名だけを持つ* | 🔄 *`SSOT`: 文書がアプリの値を写すと、2 か所が食い違う* |
| 🔄 *書いていない要素* | 🔄 *モノクロ・色相・タスクグループの帯・文字の色・実績の塗りの導き方・明暗の片側の導き方・透明の制約（要素 2・3・6〜8・10）* | 🔄 *網羅の抜け* |

🔄 *問 6-6-4-8〜6-6-4-11 の推奨をすべて採ると、色の形は次のとおりです（β の案）。*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12・13・14・15・16・17・18・19・20・21・22・23・24・25・26・27・28・29・30・31・32・33・34・35・36・37・38・39・40・41・42・43・44・45・46・47・48・49 行目が変わった。*
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
        "transparencyPercent": { "type": "integer", "minimum": 0, "maximum": 100 }
      }
    },
    "Stroke": {
      "required": ["color", "widthPx"],
      "properties": {
        "color": { "$ref": "#/$defs/Color" },
        "transparencyPercent": { "type": "integer", "minimum": 0, "maximum": 100 },
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

🔄 *実例（同じ形で書いた 3 つ）:*

🔄 *下のコードブロックの 1・3・4・5・7・8 行目が変わった。*
```json
"fill": { "color": { "kind": "palette", "name": "red" } }

"fill":   { "color": { "kind": "theme" }, "transparencyPercent": 100 },
"stroke": { "color": { "kind": "theme" }, "widthPx": 1 },
"textColor": { "kind": "palette", "name": "ink" }

"fill":   { "color": { "kind": "custom", "light": { "hexColor": "#c0504d", "source": "chosen" } }, "transparencyPercent": 50 },
"stroke": { "color": { "kind": "palette", "name": "purple" }, "transparencyPercent": 30, "widthPx": 2 }
```

- 🔄 *上から、タスクのバー（赤で塗り、縁を描かない）・コメントボックス（塗りを見せず、テーマの色の枠と、ink の文字）・タスクのバー（自前の赤を半透明で塗り、紫の縁を 30% 透かす）です。*
- 🔄 *文書の外のもの（要素 1・7・11・12）と、透明の制約（要素 10）は、スキーマに書きません。GRS が描くときと入力を受けるときに守ります。*

🔄 *直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

回答:

##### 🔄 *❓ 問 6-6-4-8. テーマの色の役割 —— 置き場で決めるか、値に書くか*

🔄 *場面: `{"kind": "theme"}` の色は、テーマがその置き場に決める色です（要素 4）。Copilot の案は、役割（task・milestone など）を値に書きます。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *置き場が役割を決める（今の形）。値には `{"kind": "theme"}` だけを書く。1 つの値が 1 つの意味を持つ（`OMPV`）。置き場と役割が食い違う文書を書けない* |
| 🔄 *b* | 🔄 *値に役割を書く（`{"kind": "theme", "role": "milestone"}`）。どの置き場でも、ほかの役割のテーマの色を使える。役割の名の一覧を、外との約束として持つ* |

回答:

##### 🔄 *❓ 問 6-6-4-9. 透明の名と向き —— transparency か opacity か*

🔄 *場面: 今の形は `fillTransparencyPercent`（0 が不透明）で、画面の語は「塗りの透過率（%）」です。Copilot の案は `opacityPercent`（100 が不透明）です。*

- 🔄 *Microsoft Office（PowerPoint・Excel）の図形の塗りの「透明度」は、0% が不透明です。GRS は MSPDI を読み書きするので、Office の道具から来る人が多いと見込みます。*
- 🔄 *CSS・SVG・Figma の opacity は、1（100%）が不透明です。プログラムを書く人には、こちらがなじみます。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`transparencyPercent`（0 が不透明。省くと 0）。画面の語「透過率」と同じ向き（`POLA`: 画面とファイルが同じ向き）* |
| 🔄 *b* | 🔄 *`opacityPercent`（100 が不透明。省くと 100）。CSS・SVG と同じ向き。画面の語と向きも「不透明度」に変える（`CR-856`）* |

回答:

##### 🔄 *❓ 問 6-6-4-10. 線の形 —— 線の太さを線の中に入れるか*

🔄 *場面: 今の形は、線の色 `strokeColor` と太さ `strokeWidthPx` を平らに持ちます。線を描かないタスクにも、太さを必ず書きます。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *線の型 `Stroke { color, transparencyPercent, widthPx }` を作る（平ら、2 段）。線を描かないときは、太さも書かない（`NullTrap`・`OMPV`: 描かない線の太さという、意味の無い値を持たない）。塗りは `Paint { color, transparencyPercent }`* |
| 🔄 *b* | 🔄 *塗りも線も `Paint` を取り、太さは今のまま外に置く（`strokeWidthPx`。SVG の `stroke-width` と同じ置き方）* |
| 🔄 *c* | 🔄 *Copilot の形 `Stroke { paint, widthPx }`（`stroke.paint.color` と 3 段になる）* |

回答:

##### 🔄 *❓ 問 6-6-4-11. 3 つの型で、塗りと線の形を共にするか*

🔄 *場面: タスクの描き方・コメントボックス・ハイライトボックスの 3 つの型が、塗りと線を持ちます。必ず持つ欄は型ごとに違います（コメントボックスは塗り・枠・文字を必ず持ち、タスクは塗りも縁も省ける）。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *型 `Paint`・`Stroke` だけを共にし、どの欄を必ず持つかは型ごとに書く（`ISP`: 型ごとに要る欄だけを持つ）* |
| 🔄 *b* | 🔄 *Copilot の案のように `ShapeStyle { fill, stroke }` を 3 つの型で共にし、必ず持つ欄の違いは型ごとの足しの決まり（`allOf`）で書く（`DRY`）* |

回答:


### [col] 表の列（❓ 0）

### [cal] 🔄 *カレンダー（❓ 2）*

#### 🔄 *❓ 問 6-7-1. 「暦」を「カレンダー」にそろえるか*

🔄 *場面: 意味の文と群の見出しに、「暦」の字があります。*

- 🔄 *`JDG-3464` で、GRS がすべての稼働日を数える 1 つの暦の名を `projectCalendar`（プロジェクトカレンダー）にしました。そのとき、型 `Calendar` の日本語も「カレンダー」にそろえる案を、この群で出すことにしました。*
- 🔄 *今の辞書で「暦」を使う語:*
  - 🔄 *GRS JSON の群: `calendarUid`・`baseCalendarUid`・`calendarUid`（持ち主 `Project`）・`highestIssuedUid` と、見出し「暦」。*
  - 🔄 *辞書のほかの群: 文書の命令の見出し「暦」と、日程の考えの `projectCalendar` の意味の「1 つの暦」。*
  - 🔄 *「暦」は calendar、「暦日」は calendar day を指す。別の語なので、「暦日」は対象外。*
- 🔄 *仕様書と画面の語（`display-words.json`）にも、「暦」の字があります。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *辞書の「暦」をすべて「カレンダー」にする。「暦日」はそのまま。仕様書と画面の語も、`CR-857` で「カレンダー」にそろえる* |
| 🔄 *b* | 🔄 *GRS JSON の群だけ「カレンダー」にする* |
| 🔄 *c* | 🔄 *「暦」のまま。暦は日本語として定着し、暦日とも対になる（プロジェクトカレンダーだけが片仮名になる）* |

🔄 *型 `Calendar`（Part 8 の #5）の意味は、次の問 6-7-2 の表にあります。*

回答:

#### 🔄 *❓ 問 6-7-5. カレンダーの 17 語 —— 推奨の表のとおりでよいか*

🔄 *易しい語をまとめた推奨の表です。「暦」の字は、問 6-7-1 の答えに従って直します。繰り返しの 2 語（`recurrenceKind`・`recurrencePeriod`）は、問 6-7-3 で聞きます。*
🔄 *直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|:---|:---|:---|:---|:---|
| 🔄 *7-16* | 🔄 *`calendarUid`* |  | 🔄 *このタスクや担当だけの暦。MSPDI の CalendarUID と同じ。GRS は値を持ち続けて書き戻す。GRS は稼働日を project.calendarUid だけで数える。（→ 問 6-7-1）* | 🔄 *CalendarUID* |
| 🔄 *7-29* | 🔄 *`fromTime`* |  | 🔄 *MSPDI の WorkingTime/FromTime と同じ。* | 🔄 *FromTime* |
| 🔄 *7-30* | 🔄 *`toTime`* |  | 🔄 *MSPDI の WorkingTime/ToTime と同じ。00:00:00 は 24:00、つまりその日の終わりを表す。* | 🔄 *ToTime* |
| 🔄 *7-31* | 🔄 *`WorkingTime`* |  | 🔄 *MSPDI の WorkingTime と同じ。GRS は、1 日の中で重なる時間帯と、開始が終了以降の時間帯を断る。12:00 に終わる時間帯と 12:00 に始まる時間帯のように接するだけの組は受け入れる。* | 🔄 *WorkingTime* |
| 🔄 *7-32* | 🔄 *`workingTimes`* |  | 🔄 *この日の稼働の時間帯（MSPDI の WorkingTimes）。稼働日でこの値を省くと、GRS は既定の 08:00:00-12:00:00 と 13:00:00-17:00:00 の時間帯を使う。* | 🔄 *WorkingTimes* |
| 🔄 *7-33* | 🔄 *`dayWorking`* |  | 🔄 *この日が稼働日かどうか（MSPDI の DayWorking）。この値を省くと GRS は非稼働日と読む。* | 🔄 *DayWorking* |
| 🔄 *7-34* | 🔄 *`dayType`* |  | 🔄 *MSPDI の WeekDay/DayType と同じで、1 が日曜日。ただし値は 1〜7 で、例外の日は Exception が持つ。* | 🔄 *DayType* |
| 🔄 *7-36* | 🔄 *`fromDate`* |  | 🔄 *MSPDI の Exception/TimePeriod/FromDate と同じ。例外の最初の日。GRS は日付だけを読み、日時を足したり変えたりするときは T00:00:00 を書く。* | 🔄 *FromDate* |
| 🔄 *7-37* | 🔄 *`toDate`* |  | 🔄 *MSPDI の Exception/TimePeriod/ToDate と同じ。例外の最後の日（その日を含む）。GRS は日付だけを読み、日時を足したり変えたりするときは T23:59:00 を書く。* | 🔄 *ToDate* |
| 🔄 *8-3* | 🔄 *`baseCalendarUid`* |  | 🔄 *MSPDI の Calendar/BaseCalendarUID と同じ。この暦が受け継ぐ元の暦。GRS は値を持つだけで、数えるのはこの暦が自分で並べる日だけである。（→ 問 6-7-1）* | 🔄 *BaseCalendarUID* |
| 🔄 *8-4* | 🔄 *`isBaseCalendar`* |  | 🔄 *MSPDI の Calendar/IsBaseCalendar と同じ。この値を省くと GRS は偽と読む。* | 🔄 *IsBaseCalendar* |
| 🔄 *8-7* | 🔄 *`calendarUid`（持ち主 `Project`）* |  | 🔄 *MSPDI の Project/CalendarUID と同じ。GRS はすべての稼働日をこの 1 つの暦（プロジェクトカレンダー）で数える。値を省くか、指す先の暦が欠けているときは、GRS は isBaseCalendar が真で ordinal が最小の暦を使い、それも欠けていれば組み込みの既定を使う。（→ 問 6-7-1）* | 🔄 *CalendarUID* |
| 🔄 *7-35* | 🔄 *`WeekDay`* |  | 🔄 *MSPDI の WeekDay と同じ。1 つの曜日が稼働日かどうかと、その日の時間帯。（`JDG-3520`）* | 🔄 *WeekDay* |
| 🔄 *7-40* | 🔄 *`Exception`* |  | 🔄 *MSPDI の Exception と同じ。カレンダーの曜日の決まりに対する、例外の日。繰り返すこともある。（`JDG-3520`）* | 🔄 *Exception* |
| 🔄 *8-1* | 🔄 *`weekDays`* |  | 🔄 *MSPDI の WeekDays と同じ。このカレンダーの、曜日ごとの決まり。（`JDG-3520`）* | 🔄 *WeekDays* |
| 🔄 *8-2* | 🔄 *`exceptions`* |  | 🔄 *MSPDI の Exceptions と同じ。このカレンダーの例外の日。（`JDG-3520`）* | 🔄 *Exceptions* |
| 🔄 *8-5* | 🔄 *`Calendar`* |  | 🔄 *MSPDI の Calendar と同じ。どの日が稼働日かを決める、1 つのカレンダー。（`JDG-3520`）* | 🔄 *Calendar* |

回答:

***

## ❓ 自由

答えを読んで、ほかに聞きたいこと・違うと思う所があれば、ここに書いてください。

回答:
