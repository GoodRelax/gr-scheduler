# 名の辞書（用語集）

> **/grsmd-qa の使い方**
> - 「回答:」の後ろに、選択肢の文字（a, b …）か自由な文を書き、保存してから、チャットで「更新した」と伝えてください。
> - 回る矢印の絵文字と斜体の字は、前回から変わった所です（`f` でその絵文字を検索すると順に飛べます）。初版には付きません。
> - 強調したい所には ★ を付けてかまいません。

2026-10-28 に作り、同じ日に書き直した。② の辞書の初版ができ、③ のレビューを始めた。この紙で、名の辞書のスキーマ → 辞書 → 辞書のレビューまでを進める（`JDG-3424` の ①〜③）。スキーマの案は `glossary-draft/glossary.schema.json`（`CR-857` が `docs/development-rules/` へ移すまでの下書き）。

---

## 決まったこと

| 何 | 決め | 裁定 |
|---|---|---|
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
| 🔄 *Part 1〜5* | 🔄 *決まり・価値・日程の考えの 112 語を確定。確定した表は `13-glossary-settled.md` に移した* | 🔄 *`JDG-3513`* |

### 決まった形 —— 遅延診断の語

| キー | 日本語の名 | 英語の名 | Agent API の名（β） | 決め |
|---|---|---|---|---|
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

### 決まった形 —— 群と順

前に出た語だけで後の語の意味を書ける順（公理から組み上げる）。

| 順 | 群 | 英語 | 子 | 約束の強さ |
|---|---|---|---|---|
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

### 決まった形 —— GRS JSON の中の順と、階層の扱い

辞書は木そのものを持ちません —— 木は `erd.json`（とそこから生まれるスキーマ）だけが持ちます。辞書は、その木を**葉から根へ**組み上げる順（後順）に語を並べます。

1. まず、どこにでも入る小さな型と値の形（`ColorSide`・`ColumnSort`・日時の書き方・ID の形など）。
2. 次に、葉の型からその親の型へ。1 つの型は「そのキー → その型」の順で置く（キーを先に定め、型はそのキーの集まりとして定める）。
3. 最後に、包み（`scheduleData`・`documentSettings`）と、文書の根。

| 階層の種類 | 例（β。`doc-shape-map.tsv` の `element_new` から） | 辞書での扱い |
|---|---|---|
| 入れ子 | `WorkingTime` → `WeekDay`・`Exception` → `Calendar` | 中の型を先に定め、外の型はそれを使って定める。`WorkingTime` は 2 か所に入るが、先に 1 回だけ定める |
| 包み（自分の ID を持たない入れ物） | `documentSettings.tableViews`・`documentSettings`・`scheduleData` | 中身を定めた後に、包みを「何をまとめる入れ物か」として定める |
| 参照の木（ファイルの上では平ら） | `Task.parentTaskUid`・`TaskGroup.parentId`・`Calendar.baseCalendarUid` | 親を指すキーはその型と同じ所で定める（自分の型を指すので、型の定義の中で閉じる）。木の考え（WBS の木など）はその型の子の語 |
| どこにでも入る共通の型・キー | `passthroughValues`（8 か所）・`ColorSide`・`ColumnSort` | 最初（1.）に定める。持ち主で意味が変わるときだけ `owner` で分ける |

③ のレビュー表では、各語の横に、木の中の道（`scheduleData.calendars[].weekDays[]` など）を生成した情報として並べます（`JDG-3424`）。

### 決まった形 —— 外との約束の決まり（GRS JSON・文書の命令・Agent API）

| 決まり | 中身 |
|---|---|
| 意味を変えない | β で出した後、名も意味も変えない。変えたいときは新しい名を足し、古い名は版を上げて退ける |
| 生まれた版を持つ | 初めて出た `schemaVersion`（Agent API は `agentApiVersion`）を `since` の欄に書く |
| 外の人が読める意味 | `definition.en` は仕様書を読まない人にも通じる文で書き、仕様書の行の番号を書かない（番号は `rowId` だけ） |
| 顔をまたいでも 1 つの意味 | GRS JSON のキーが Agent API や命令の欄にも出るときは同じ語を指す。後の群は、そこで初めて出る名だけを持つ |
| 他者の約束の名 | MSPDI から来た名の対応は `erd.json` の `origin` だけが持つ |

### 決まった形 —— 開発の名の線

辞書に入れるのは**境界を越える名だけ**（2 か所以上から呼ばれる名）。1 つの部品の中だけの名は、命名の決まり（07 の `Naming`）と検査に任せる。

| 名 | 今の数（数え方） | 辞書に入れるか |
|---|---|---|
| 層 | 4（`src` の下のフォルダ） | 入れる |
| 部品 | 28（各層の下のフォルダ） | 入れる |
| 層をまたぐ口 | 未計測（作るときに数える） | 入れる |
| 部品の中だけの関数・変数・型 | 書き出している関数だけで 932（check.sh の数） | 入れない |
| 決まりのことば | 07 の「設計原則の索引」と、設計原則の観点・コーディング品質の観点。今、仕様書と src は 07 の項目の番号で引いている（番号の引用が仕様書 32・src 6、`SRP` などの名は 0） | 入れる。名と短い意味を辞書に、確かめ方の詳しさは 07 に |

仕様書とコメントの「なぜ」は、番号でなく語（`OMPV`）で引く。文の中の語が辞書にあるかは、`JDG-3418` の検査をコードのコメントにも広げて確かめる。

---

## まだ開いている問い

### 🔄 *問 6. Part 6〜13 —— GRS JSON（311 語）*

🔄 *GRS JSON の群を 1 回で出します（`JDG-3437`）。各パートの頭に迷う語だけを問いにし、残りは各 Part の最後の問 6-N-0 の表に置きました。*

- 🔄 *各問いの「回答」欄は、問いの見出しのすぐ下にあります。場面・案の表・語の表は、「回答」欄の後ろに置きました。*
- 🔄 *問 6-N-0 は、Part N の残りの表に直す所が無いかを聞きます。直す所が無ければ ok と書き、直す所は表のセルに ★ で書いてください。*
- 🔄 *青い字は、前に裁定した名です。キーの欄が青ければキーの名を、日本語の名の欄が青ければ日本語の名を、裁定が決めました。裁定の言葉か決めの欄が、その名を挙げた所だけを青くしました。裁定の番号は意味の欄の最後にあります。*
- 🔄 *問いで聞く語は、表から外しました（表の # が飛んでいる所）。外した語は、その問いの表にあります。*
- 🔄 *「（→ 問 …）」の付いた語は、表に残したまま、その問いの答えで字が変わる語です。*
- 🔄 *MSPDI の名の欄の「無し」は、GRS が自分で付けた名です（MSPDI に同じ要素が無い）。*
- 🔄 *問 6-13-1 は、Part をまたいで名や数え方が被る語の問いです。Part 13 では、問 6-13-0 の前に置きました。*
- 🔄 *数え方は、それぞれの所に書きました。「裁定の行」は `docs/development-records/rulings.md` の JDG の行で、キーを前後が英数字でない形で含む行を数えたものです。*

🔄 *---*

#### 🔄 *Part 6 / 43 —— GRS JSON / 共通の型とキー（39 語）*

##### 🔄 *問 6-6-1. GRS JSON のキーに、日本語の名を付けるか*

回答:

🔄 *場面: この群の表の「日本語の名」の欄は、ほとんど空です。*

- 🔄 *GRS JSON の群の 311 語のうち、日本語の名があるのは 33 語だけです。33 語とも、設定の欄の名（`docs/spec/_source/display-words.json` の `settings` の K 行）を写したものです（数え方: 群の語のうち `label.ja` のある語）。*
- 🔄 *辞書のスキーマ（`glossary-draft/glossary.schema.json` の `label`）は、人がキーそのものを見る語（GRS JSON のキー・API のメンバ）の `label` を省く、と定めます。*
- 🔄 *裁定で日本語の名が決まったキーが 4 つあります。今の下書きは、4 つとも名を持ちません。*
  - 🔄 *`name`（持ち主 `Project`）: プロジェクト名（`JDG-3355`）*
  - 🔄 *`title`: プロジェクトタイトル（`JDG-3355`・`JDG-3365`）*
  - 🔄 *`scheduleData`: スケジュールデータ、`ScheduleDocument`: スケジュール文書（`JDG-3353`）*
- 🔄 *「タスク」「マイルストーン」「前回予定」のように人が呼ぶ名は、日程の考えの群（Part 3〜5）と画面の群が持ちます。*

| 案 | 中身 |
|---|---|
| **a（推奨）** | 🔄 *画面か裁定で日本語の名が決まった語だけに付ける（今の 33 語と、上の 4 語）。ほかは空のまま。下の表では、4 語を青い字で入れた* |
| b | 🔄 *スキーマを読む人が、型の名を日本語でも引ける。型（大文字で始まる 35 語）にも付ける（`Task` はタスク、`Calendar` はカレンダー など）。日程の考えの語と同じ名が、2 つの語に付く* |
| 🔄 *c* | 🔄 *311 語すべてに付ける* |

##### 🔄 *問 6-6-2. 前の席が付けた名 —— 5 組（8 語）*

回答:a

🔄 *場面: 前の席が、時差の型・パレットの色・表の列のフィルタに名を付けました。この名は外との約束になり、GRS は β の後にこの名を変えません。*

- 🔄 *下の名は、`docs/spec/_source/erd.json`（今の α の形）にありません。名を言った裁定の行も 0 です。*
- 🔄 *前の席が `studies/76-grs-json-beta-shape/doc-shape-choices.md` の §3「私が選んだところ（覆してよい）」に書いた名か、所見（`Fnn`）から前の席が付けた名です。*
- 🔄 *同じ紙の §5 の `O5` が、`ColumnKey` に入る列の名の一覧を、未決として持っています。*

| 🔄 *#* | 🔄 *キー* | 🔄 *前の名* | 🔄 *意味（日本語）* | 🔄 *決めた所* | 🔄 *MSPDI の名* |
|---|---|---|---|---|---|
| 🔄 *5* | 🔄 *`UtcOffset`* | 🔄 *（無し。新しい型）* | 🔄 *UTC からの固定の時差。UTC+09:00 のように書く。GRS はこの時差を 1 年中そのまま使う。* | 🔄 *所見 F13（3 か所で同じ型を使う）* | 🔄 *無し* |
| 🔄 *18* | 🔄 *&emsp;+- `dimGray`（持ち主 `Color`）* | 🔄 *`dimgray`* | 🔄 *パレット色の暗い灰色。* | 🔄 *CHOICE N18（lowerCamelCase にそろえた）* | 🔄 *無し* |
| 🔄 *19* | 🔄 *&emsp;+- `lightGray`（持ち主 `Color`）* | 🔄 *`lightgray`* | 🔄 *パレット色の明るい灰色。* | 🔄 *CHOICE N18* | 🔄 *無し* |
| 🔄 *30* | 🔄 *`ColumnKey`* | 🔄 *（無し）* | 🔄 *表の列の、固定の英語の名前。各表は、その表の列の名前だけを取る。* | 🔄 *所見 F50・`JDG-3285`（外へ出す値は変わらない名）* | 🔄 *無し* |
| 🔄 *34* | 🔄 *`kind`（持ち主 `ColumnFilter`）* | 🔄 *（無し。前は平らに持った）* | 🔄 *values: 行を、見えている値で隠す。dateRange: 日付が firstDay..lastDay の外にある行を隠す。* | 🔄 *所見 F52* | 🔄 *無し* |
| 🔄 *35* | 🔄 *&emsp;+- `values`（持ち主 `ColumnFilter`）* | 🔄 *（無し）* | 🔄 *行を、見えている値で隠す。* | 🔄 *所見 F52* | 🔄 *無し* |
| 🔄 *36* | 🔄 *&emsp;+- `dateRange`（持ち主 `ColumnFilter`）* | 🔄 *（無し）* | 🔄 *日付が firstDay..lastDay の外にある行を隠す。* | 🔄 *所見 F52* | 🔄 *無し* |
| 🔄 *38* | 🔄 *`isBlankHidden`* | 🔄 *（無し）* | 🔄 *この列のセルが空の行を、フィルタが隠すかどうか。* | 🔄 *CHOICE N16（受けた名 `hideBlank` を、真偽は is… の決まり `JDG-3281` に直した）* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *`UtcOffset`・`dimGray`・`lightGray`・`ColumnKey`・`ColumnFilter` の `kind`・`values`・`dateRange`・`isBlankHidden` の 8 語を、表の意味のとおり採る* |
| 🔄 *b* | 🔄 *直す所を、キーと意味で書く* |

##### 🔄 *問 6-6-0. Part 6 の残りの 31 語 —— 表のとおりでよいか*

回答:

🔄 *直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|---|
| 🔄 *1* | 🔄 *`Day`* |  | 🔄 *日付だけの値。YYYY-MM-DD と書く。日の範囲（firstDay と lastDay）は両端の日を含む。Day を使う各プロパティが、その日がどのタイムゾーンの日かを述べる。* | 🔄 *無し* |
| 🔄 *2* | 🔄 *`DateTime`* |  | 🔄 *project.scheduleDataTimeZone での壁時計の日時。MSPDI が日時を書くのと同じく、オフセットを省いて YYYY-MM-DDTHH:MM:SS と書く。GRS は分までを読み、秒を無視する。* | 🔄 *無し* |
| 🔄 *3* | 🔄 *`Time`* |  | 🔄 *MSPDI が時刻を書くのと同じ書き方の、1 日の中の時刻。* | 🔄 *無し* |
| 🔄 *4* | 🔄 *`UtcInstant`* |  | 🔄 *UTC での時点。YYYY-MM-DDTHH:MM:SSZ と書く。* | 🔄 *無し* |
| 🔄 *6* | 🔄 *<span style="color: #0550AE">`value`</span>* |  | 🔄 *このテーマでの色の値。（`JDG-3260`）* | 🔄 *無し* |
| 🔄 *7* | 🔄 *<span style="color: #0550AE">`source`</span>（持ち主 `ColorSide`）* |  | 🔄 *chosen: 人がこの値を選んだ。derived: 文書を読むときに、GRS がもう一方の側からこの値を作った。（`JDG-3260`）* | 🔄 *無し* |
| 🔄 *8* | 🔄 *&emsp;+- <span style="color: #0550AE">`chosen`</span>（持ち主 `source`）* |  | 🔄 *人がこの値を選んだ。（`JDG-3260`）* | 🔄 *無し* |
| 🔄 *9* | 🔄 *&emsp;+- <span style="color: #0550AE">`derived`</span>（持ち主 `source`）* |  | 🔄 *スケジュール文書を読むときに、GRS がもう一方の側からこの値を作った。（`JDG-3260`）* | 🔄 *無し* |
| 🔄 *10* | 🔄 *`ColorSide`* |  | 🔄 *カスタムの色の片側: 値と、その値を人が選んだか GRS が作ったか。片側を省いてよい。省いた側は、GRS が文書を開くときにもう一方の側から作る。* | 🔄 *無し* |
| 🔄 *11* | 🔄 *<span style="color: #0550AE">`kind`</span>（持ち主 `Color`）* |  | 🔄 *theme: テーマがこのプロパティに決める色。palette: 名前の付いたパレットの色。custom: 明るいテーマと暗いテーマのための自前の値。（`JDG-3260`）* | 🔄 *無し* |
| 🔄 *12* | 🔄 *&emsp;+- <span style="color: #0550AE">`theme`</span>（持ち主 `Color`）* |  | 🔄 *テーマがこのプロパティに決める色。（`JDG-3310`）* | 🔄 *無し* |
| 🔄 *13* | 🔄 *&emsp;+- <span style="color: #0550AE">`palette`</span>（持ち主 `Color`）* |  | 🔄 *名前の付いたパレットの色。（`JDG-3260`）* | 🔄 *無し* |
| 🔄 *14* | 🔄 *&emsp;+- <span style="color: #0550AE">`custom`</span>（持ち主 `Color`）* |  | 🔄 *明るいテーマと暗いテーマのための自前の値。（`JDG-3260`）* | 🔄 *無し* |
| 🔄 *15* | 🔄 *<span style="color: #0550AE">`name`</span>（持ち主 `Color`）* |  | 🔄 *保存する名前で示すパレットの色。（`JDG-3260`）* | 🔄 *無し* |
| 🔄 *16* | 🔄 *&emsp;+- <span style="color: #0550AE">`paper`</span>（持ち主 `Color`）* |  | 🔄 *紙の色のパレット色。明るいテーマでは白。（`JDG-3275`）* | 🔄 *無し* |
| 🔄 *17* | 🔄 *&emsp;+- <span style="color: #0550AE">`ink`</span>（持ち主 `Color`）* |  | 🔄 *インクの色のパレット色。明るいテーマでは黒。（`JDG-3275`）* | 🔄 *無し* |
| 🔄 *20* | 🔄 *&emsp;+- `red`（持ち主 `Color`）* |  | 🔄 *パレット色の赤。* | 🔄 *無し* |
| 🔄 *21* | 🔄 *&emsp;+- `blue`（持ち主 `Color`）* |  | 🔄 *パレット色の青。* | 🔄 *無し* |
| 🔄 *22* | 🔄 *&emsp;+- `yellow`（持ち主 `Color`）* |  | 🔄 *パレット色の黄。* | 🔄 *無し* |
| 🔄 *23* | 🔄 *&emsp;+- `green`（持ち主 `Color`）* |  | 🔄 *パレット色の緑。* | 🔄 *無し* |
| 🔄 *24* | 🔄 *&emsp;+- `orange`（持ち主 `Color`）* |  | 🔄 *パレット色の橙。* | 🔄 *無し* |
| 🔄 *25* | 🔄 *&emsp;+- `purple`（持ち主 `Color`）* |  | 🔄 *パレット色の紫。* | 🔄 *無し* |
| 🔄 *26* | 🔄 *<span style="color: #0550AE">`light`</span>* |  | 🔄 *明るいテーマのための色。light と dark の少なくとも一方がある。（`JDG-3260`）* | 🔄 *無し* |
| 🔄 *27* | 🔄 *<span style="color: #0550AE">`dark`</span>* |  | 🔄 *暗いテーマのための色。light と dark の少なくとも一方がある。（`JDG-3260`）* | 🔄 *無し* |
| 🔄 *28* | 🔄 *`Color`* |  | 🔄 *kind で選ぶ 3 種のうちの 1 つの色。色を省いてよい所で色を省くと、GRS はその塗りや線の描画を省く。* | 🔄 *無し* |
| 🔄 *29* | 🔄 *<span style="color: #0550AE">`LaneColor`</span>* |  | 🔄 *タスクグループレーンの色。Color と同じ。ただしパレットの色 ink を除く。（`JDG-3381`）* | 🔄 *無し* |
| 🔄 *31* | 🔄 *`column`* |  | 🔄 *フィルタや並べ替えが掛かる列。この列を、列の固定の名前で示す。* | 🔄 *無し* |
| 🔄 *32* | 🔄 *<span style="color: #0550AE">`firstDay`</span>* |  | 🔄 *日の範囲の最初の日（その日を含む）。範囲を持つ側が、その日がどのタイムゾーンの日かを述べる。（`JDG-3275`）* | 🔄 *無し* |
| 🔄 *33* | 🔄 *<span style="color: #0550AE">`lastDay`</span>* |  | 🔄 *日の範囲の最後の日（その日を含む）。（`JDG-3275`）* | 🔄 *無し* |
| 🔄 *37* | 🔄 *`hiddenValues`* |  | 🔄 *フィルタが行を隠す値。状態や種別は固定の名前で、ほかの値は見えている文字で書く。* | 🔄 *無し* |
| 🔄 *39* | 🔄 *`ColumnFilter`* |  | 🔄 *表の 1 つの列に掛けるフィルタ。values は見えている値で行を隠し、dateRange は日付が日の範囲の外にある行を隠す。* | 🔄 *無し* |

🔄 *---*

#### 🔄 *Part 7 / 43 —— GRS JSON / 共通の型とキー・暦（40 語）*

##### 🔄 *問 6-7-1. 「暦」を「カレンダー」にそろえるか*

回答:

🔄 *場面: 意味の文と群の見出しに、「暦」の字があります。*

- 🔄 *`JDG-3464` で、GRS がすべての稼働日を数える 1 つの暦の名を `projectCalendar`（プロジェクトカレンダー）にしました。そのとき、型 `Calendar` の日本語も「カレンダー」にそろえる案を、この群で出すことにしました。*
- 🔄 *今の辞書で「暦」を使う語:*
  - 🔄 *GRS JSON の群: `calendarUid`・`baseCalendarUid`・`calendarUid`（持ち主 `Project`）・`highestIssuedUid` と、見出し「暦」。*
  - 🔄 *辞書のほかの群: 文書の命令の見出し「暦」と、日程の考えの `projectCalendar` の意味の「1 つの暦」。*
  - 🔄 *「暦」は calendar、「暦日」は calendar day を指す。別の語なので、「暦日」は対象外。*
- 🔄 *仕様書と画面の語（`display-words.json`）にも、「暦」の字があります。*

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *辞書の「暦」をすべて「カレンダー」にする。「暦日」はそのまま。仕様書と画面の語も、`CR-857` で「カレンダー」にそろえる* |
| 🔄 *b* | 🔄 *GRS JSON の群だけ「カレンダー」にする* |
| 🔄 *c* | 🔄 *「暦」のまま。暦は日本語として定着し、暦日とも対になる（プロジェクトカレンダーだけが片仮名になる）* |

🔄 *型 `Calendar`（Part 8 の #5）の意味は、次の問 6-7-2 の表にあります。*

##### 🔄 *問 6-7-2. 意味が「MSPDI の X と同じ。」だけの語*

回答:

🔄 *場面: 型や配列の語を読んでも、何の入れ物かが分かりません。*

- 🔄 *GRS JSON の群の 26 語は、意味が「MSPDI の X と同じ。」の 1 文だけです（数え方: `definition.ja` が「MSPDI の 英字 と同じ。」だけの語）。うち 11 語が型か配列、15 語がプロパティです。*
- 🔄 *スキーマの頭は「Same as MSPDI X」を「MSPDI の X と同じ意味」と定めます（`JDG-3330`）。だから英語の文は正しいのですが、MSPDI を読まない人には、型が何かが分かりません。*
- 🔄 *`erd.json` の entities は、型ごとに 1 文の説明（`description`）を持ちます。下の案はそこから取りました。*

| 🔄 *#* | 🔄 *キー* | 🔄 *足す文の案（今の文の後ろに足す）* | 🔄 *MSPDI の名* |
|---|---|---|---|
| 🔄 *7-35* | 🔄 *`WeekDay`* | 🔄 *1 つの曜日が稼働日かどうかと、その日の時間帯。* | 🔄 *WeekDay* |
| 🔄 *7-40* | 🔄 *`Exception`* | 🔄 *カレンダーの曜日の決まりに対する、例外の日。繰り返すこともある。* | 🔄 *Exception* |
| 🔄 *8-1* | 🔄 *`weekDays`* | 🔄 *このカレンダーの、曜日ごとの決まり。* | 🔄 *WeekDays* |
| 🔄 *8-2* | 🔄 *`exceptions`* | 🔄 *このカレンダーの例外の日。* | 🔄 *Exceptions* |
| 🔄 *8-5* | 🔄 *`Calendar`* | 🔄 *どの日が稼働日かを決める、1 つのカレンダー。* | 🔄 *Calendar* |
| 🔄 *8-37* | 🔄 *`linkType`* | 🔄 *依存の種類（終了-開始・開始-開始・終了-終了・開始-終了）。* | 🔄 *Type* |
| 🔄 *8-40* | 🔄 *`Dependency`* | 🔄 *1 つの依存。後続のタスクが、自分の下にこの依存を持つ（MSPDI と同じ入れ方）。* | 🔄 *PredecessorLink* |
| 🔄 *9-12* | 🔄 *`dependencies`* | 🔄 *このタスクが後続になる依存の並び。* | 🔄 *PredecessorLink* |
| 🔄 *13-22* | 🔄 *`calendars`* | 🔄 *スケジュール文書のカレンダーの並び。* | 🔄 *Calendars* |
| 🔄 *13-24* | 🔄 *`resources`* | 🔄 *スケジュール文書の担当の並び。* | 🔄 *Resources* |
| 🔄 *13-25* | 🔄 *`assignments`* | 🔄 *どの担当がどのタスクに就くかの並び。* | 🔄 *Assignments* |
| 🔄 *13-33* | 🔄 *`project`* | 🔄 *スケジュール文書が表す 1 件のプロジェクト。* | 🔄 *Project* |

🔄 *（# は「パート - パートの中の番号」。「カレンダー」の字は、問 6-7-1 の a のときの形です。`linkType` の 4 つの名は `JDG-3463`。）*

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *表の語（`WeekDay`・`Exception`・`Calendar`・`Dependency` など）に、何の入れ物か、何を表す語かを示す 1 文を足す（英語にも同じ 1 文を足す）。表にないプロパティ（`subject`・`notes` など）の意味は今のまま* |
| 🔄 *b* | 🔄 *意味が「MSPDI の X と同じ。」だけの語すべてに、何を表す語かを示す 1 文を足す* |
| 🔄 *c* | 🔄 *意味は「MSPDI の X と同じ。」の 1 文のまま* |

##### 🔄 *問 6-7-3. MSPDI の Type を、GRS は 2 つの言い方で呼んでいる*

回答:

🔄 *場面: MSPDI の名と GRS JSON のキーが違う語を、この表に並べました。*

| 🔄 *#* | 🔄 *キー* | 🔄 *MSPDI の名* | 🔄 *中身* |
|---|---|---|---|
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
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *`recurrenceKind` → `recurrenceType`、`resourceKind` → `resourceType` にして、3 つを `…Type` にそろえる。意味の欄に、MSPDI の名と違う理由を 1 文で書く* |
| 🔄 *b* | 🔄 *名は今のまま。意味の欄に、MSPDI の名と違う理由を 1 文で書く* |
| 🔄 *c* | 🔄 *名も意味の欄も今のまま* |

##### 🔄 *問 6-7-4. 前の席が付けた名 —— `siblingOrder`*

回答:

🔄 *場面: タスクとタスクグループが、兄弟の中での順を持ちます。*

- 🔄 *前の名は `Task.wbsOrder` と `TaskGroup.order` です。前の席が、略語 wbs を使わず、2 つを 1 つの名にそろえました（`doc-shape-choices.md` の CHOICE N11）。*
- 🔄 *名を言った裁定の行は 0 です。`erd.json`・src・仕様書にも、この名はありません（数え方は「裁定の行」と同じ）。*

| 🔄 *#* | 🔄 *キー* | 🔄 *前の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|---|
| 🔄 *17* | 🔄 *`siblingOrder`* | 🔄 *`wbsOrder`・`order`* | 🔄 *同じ親の下にある行のあいだでの、この行の順番。* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *`siblingOrder`（同じ親の下での行の順番）を採る* |
| 🔄 *b* | 🔄 *`siblingOrder` の名を直す（新しい名を書く）* |

##### 🔄 *問 6-7-0. Part 7 の残りの 35 語 —— 表のとおりでよいか*

回答:

🔄 *直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|---|
| 🔄 *1* | 🔄 *`direction`（持ち主 `ColumnSort`）* |  | 🔄 *並べ替えの向き。* | 🔄 *無し* |
| 🔄 *2* | 🔄 *&emsp;+- `ascending`（持ち主 `direction`）* |  | 🔄 *小さいものから大きいものへ。* | 🔄 *無し* |
| 🔄 *3* | 🔄 *&emsp;+- `descending`（持ち主 `direction`）* |  | 🔄 *大きいものから小さいものへ。* | 🔄 *無し* |
| 🔄 *4* | 🔄 *`ColumnSort`* |  | 🔄 *GRS が表を並べる方法。1 つの列で、1 つの向きに並べる。* | 🔄 *無し* |
| 🔄 *5* | 🔄 *<span style="color: #0550AE">`PassthroughValues`</span>* |  | 🔄 *持ち越した MSPDI の値。MSPDI の名前をキーにして持つ。（`JDG-3343`）* | 🔄 *無し* |
| 🔄 *6* | 🔄 *`ordinal`* |  | 🔄 *MSPDI のファイルでの、持ち主の中でのこの行の順番。GRS はその順に書き戻す。* | 🔄 *無し* |
| 🔄 *7* | 🔄 *`name`（持ち主 `PassthroughElement`）* |  | 🔄 *MSPDI のファイルのとおりに綴った要素の名前。* | 🔄 *無し* |
| 🔄 *8* | 🔄 *`fields`* |  | 🔄 *この要素の子のうち、文字だけを持つ子要素の値を、要素の名前ごとに持つ。ほかの要素を含む子要素は children に入る。* | 🔄 *無し* |
| 🔄 *9* | 🔄 *`children`* |  | 🔄 *この要素の中に入れ子になった子要素。* | 🔄 *無し* |
| 🔄 *10* | 🔄 *<span style="color: #0550AE">`PassthroughElement`</span>* |  | 🔄 *持ち越した 1 つの MSPDI の要素。GRS はまるごと持ち、同じ所へ書き戻す。（`JDG-3343`）* | 🔄 *無し* |
| 🔄 *11* | 🔄 *<span style="color: #0550AE">`passthroughValues`</span>* |  | 🔄 *この要素の、持ち越した MSPDI の値。MSPDI の名前のまま持つ。（`JDG-3343`）* | 🔄 *無し* |
| 🔄 *12* | 🔄 *<span style="color: #0550AE">`passthroughElements`</span>* |  | 🔄 *この要素の下にある、持ち越した MSPDI の要素。GRS はそれぞれを同じ所へ書き戻す。（`JDG-3343`）* | 🔄 *無し* |
| 🔄 *13* | 🔄 *`uid`* |  | 🔄 *この行の、配列の中で一意な番号。MSPDI の UID と同じ。GRS は各 uid を 1 度だけ発行する。* | 🔄 *UID* |
| 🔄 *14* | 🔄 *`id`* |  | 🔄 *この行の id。UUID である。* | 🔄 *無し* |
| 🔄 *15* | 🔄 *`name`* |  | 🔄 *この行の名前。MSPDI に Name があるものは、それと同じ。* | 🔄 *Name（MSPDI に名のある行だけ）* |
| 🔄 *16* | 🔄 *`calendarUid`* |  | 🔄 *このタスクや担当だけの暦。MSPDI の CalendarUID と同じ。GRS は値を持ち続けて書き戻す。GRS は稼働日を project.calendarUid だけで数える。（→ 問 6-7-1）* | 🔄 *CalendarUID* |
| 🔄 *18* | 🔄 *`taskUid`* |  | 🔄 *この行が扱うタスクの uid。* | 🔄 *TaskUID（割当だけ）* |
| 🔄 *19* | 🔄 *`taskGroupId`* |  | 🔄 *この行が扱うタスクグループの id。* | 🔄 *無し* |
| 🔄 *20* | 🔄 *`start`* |  | 🔄 *タスクの予定の開始（MSPDI の Start）。GRS は、すべてのタスクが開始を持つスケジュール文書だけを開く。* | 🔄 *Start* |
| 🔄 *21* | 🔄 *`finish`* |  | 🔄 *タスクの予定の終了（MSPDI の Finish）。GRS は、すべてのタスクが終了を持つスケジュール文書だけを開く。* | 🔄 *Finish* |
| 🔄 *22* | 🔄 *`milestone`* |  | 🔄 *MSPDI の Task/Milestone と同じ。この値を省くと GRS は偽と読む。真のとき TaskGraphicStyle は milestoneShape を持ち、偽のとき taskShape を持つ。* | 🔄 *Milestone* |
| 🔄 *23* | 🔄 *<span style="color: #0550AE">`hyperlinkAddress`</span>* |  | 🔄 *この行のリンク先の URL（タスクでは MSPDI の HyperlinkAddress）。リンクを持つのは、URL を書いた行だけである。（`JDG-3314`）* | 🔄 *HyperlinkAddress（タスクだけ）* |
| 🔄 *24* | 🔄 *<span style="color: #0550AE">`hyperlink`</span>* |  | 🔄 *この行のリンクのタイトル。リンク先の URL とは役目が違う（タスクでは MSPDI の Hyperlink）。タイトルを持つのは、タイトルを書いた行だけである。（`JDG-3314`）* | 🔄 *Hyperlink（タスクだけ）* |
| 🔄 *25* | 🔄 *`fillColor`* |  | 🔄 *この行が描くものの塗りの色。タスクでは予定バー（実績バーの塗りもこれから作る）、コメントボックスでは本文の箱、ハイライトボックスではその箱。色を省いてよい所で色を省くと、GRS は塗りの描画を省く。* | 🔄 *無し* |
| 🔄 *26* | 🔄 *`fillTransparencyPercent`* |  | 🔄 *塗りの透過率（パーセント）。0 は不透明、100 のとき GRS は塗りの描画を省く。* | 🔄 *無し* |
| 🔄 *27* | 🔄 *<span style="color: #0550AE">`strokeColor`</span>* |  | 🔄 *この行が描くものの線の色。タスクではバーの輪郭、コメントボックスでは枠と引出し線、ハイライトボックスでは枠。色を省いてよい所で色を省くと、GRS は線の描画を省く。（`JDG-2691`）* | 🔄 *無し* |
| 🔄 *28* | 🔄 *<span style="color: #0550AE">`strokeWidthPx`</span>* |  | 🔄 *この行が描くものの線の太さ。値は displayScalePercent が 100 のときの CSS ピクセルで表す。displayScalePercent に従って拡大縮小し、ズームの倍率とは別に決まる。新しい行には 1 を書く。（`JDG-2691`）* | 🔄 *無し* |
| 🔄 *29* | 🔄 *`fromTime`* |  | 🔄 *MSPDI の WorkingTime/FromTime と同じ。* | 🔄 *FromTime* |
| 🔄 *30* | 🔄 *`toTime`* |  | 🔄 *MSPDI の WorkingTime/ToTime と同じ。00:00:00 は 24:00、つまりその日の終わりを表す。* | 🔄 *ToTime* |
| 🔄 *31* | 🔄 *`WorkingTime`* |  | 🔄 *MSPDI の WorkingTime と同じ。GRS は、1 日の中で重なる時間帯と、開始が終了以降の時間帯を断る。12:00 に終わる時間帯と 12:00 に始まる時間帯のように接するだけの組は受け入れる。* | 🔄 *WorkingTime* |
| 🔄 *32* | 🔄 *`workingTimes`* |  | 🔄 *この日の稼働の時間帯（MSPDI の WorkingTimes）。稼働日でこの値を省くと、GRS は既定の 08:00:00-12:00:00 と 13:00:00-17:00:00 の時間帯を使う。* | 🔄 *WorkingTimes* |
| 🔄 *33* | 🔄 *`dayWorking`* |  | 🔄 *この日が稼働日かどうか（MSPDI の DayWorking）。この値を省くと GRS は非稼働日と読む。* | 🔄 *DayWorking* |
| 🔄 *34* | 🔄 *`dayType`* |  | 🔄 *MSPDI の WeekDay/DayType と同じで、1 が日曜日。ただし値は 1〜7 で、例外の日は Exception が持つ。* | 🔄 *DayType* |
| 🔄 *36* | 🔄 *`fromDate`* |  | 🔄 *MSPDI の Exception/TimePeriod/FromDate と同じ。例外の最初の日。GRS は日付だけを読み、日時を足したり変えたりするときは T00:00:00 を書く。* | 🔄 *FromDate* |
| 🔄 *37* | 🔄 *`toDate`* |  | 🔄 *MSPDI の Exception/TimePeriod/ToDate と同じ。例外の最後の日（その日を含む）。GRS は日付だけを読み、日時を足したり変えたりするときは T23:59:00 を書く。* | 🔄 *ToDate* |

🔄 *---*

#### 🔄 *Part 8 / 43 —— GRS JSON / 暦・プロジェクト・タスクと依存（40 語）*

##### 🔄 *問 6-8-1. 前の席が付けた名 —— プロジェクトの 5 つ*

回答:

🔄 *場面: プロジェクトが、GRS だけの値を持ちます。*

- 🔄 *5 つとも α の名を改めた名です。名を言った裁定の行は 0 です。*
- 🔄 *前の席が、名付けの決まり（`JDG-3281`: 単位を末尾に、意味の名で）に合わせて選びました（`doc-shape-choices.md` の CHOICE N6〜N9、所見 F16）。*

| 🔄 *#* | 🔄 *キー* | 🔄 *前の名* | 🔄 *日本語の名（画面）* | 🔄 *意味（日本語）* | 🔄 *決めた所* | 🔄 *MSPDI の名* |
|---|---|---|---|---|---|---|
| 🔄 *26* | 🔄 *`themeHueDegrees`* | 🔄 *`themeHue`* | 🔄 *テーマ色* | 🔄 *テーマの色相（度）。{"kind":"theme"} と書いた色はすべてこの色相を使う。新しいスケジュール文書は 214 で始まる。* | 🔄 *CHOICE N6* | 🔄 *無し* |
| 🔄 *27* | 🔄 *`parentTaskProgressToleranceWorkingDays`* | 🔄 *`parentTaskProgressToleranceDays`* | 🔄 *遅延診断時に\|親タスクの\|進捗の\|疑義を\|許す\|日数* | 🔄 *親タスクのタスク進捗点が、その下のタスクのタスク進捗点の外にどれだけ（稼働日で）はみ出してよいか。それを超えると、遅延診断が更新の漏れを疑う。新しいスケジュール文書は 1 で始まる。* | 🔄 *所見 F16（Days が暦日か稼働日か分からなかった）* | 🔄 *無し* |
| 🔄 *28* | 🔄 *`highestIssuedUid`* | 🔄 *`uidHighWaterMark`* | 🔄 *（無し）* | 🔄 *タスク・担当・割当・暦の uid のための 1 つの数え手。GRS は各 uid を 1 度だけ発行するので、新しい uid はいつもこの値より大きい。（→ 問 6-7-1）* | 🔄 *CHOICE N7* | 🔄 *無し* |
| 🔄 *29* | 🔄 *`lastImportNumber`* | 🔄 *`importSequence`* | 🔄 *取り込みの連番* | 🔄 *GRS がこのスケジュール文書へ MSPDI のファイルを取り込んだ回数。0 は取り込む前を表す。GRS は TaskOrigin.lastSeenImportNumber とこの数を比べる。（→ 問 6-12-1）* | 🔄 *CHOICE N8* | 🔄 *無し* |
| 🔄 *30* | 🔄 *`firstOutlineLevel`* | 🔄 *`outlineBase`* | 🔄 *（無し）* | 🔄 *取り込んだ MSPDI のファイルのタスクが始まる OutlineLevel（プロジェクトのまとめのタスクを除いて数える）。GRS は書き出しをこの数から始める。新しいスケジュール文書は 1 で始まる。* | 🔄 *CHOICE N9* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *`themeHueDegrees`（テーマの色相の度）・`parentTaskProgressToleranceWorkingDays`（親タスクの進捗のはみ出しを許す稼働日数）・`highestIssuedUid`（発行した uid の最大値）・`lastImportNumber`（取り込みの連番）・`firstOutlineLevel`（取り込んだタスクが始まる OutlineLevel）を、表の意味のとおり採る。`parentTaskProgressToleranceWorkingDays` は、`parentTaskUid` と同じ `parentTask…` で始まる。`parentProgress…` だけでは、タスクグループの `parentId` とも読める* |
| 🔄 *b* | 🔄 *`parentTaskProgressToleranceWorkingDays` の代わりに `parentProgressToleranceWorkingDays`（短い名で、親の進捗の許す日数という意味を保つ）を使い、ほかの 4 つは a と同じにする* |
| 🔄 *c* | 🔄 *直す所を、キーと意味で書く* |

##### 🔄 *問 6-8-2. 日本語の名の中の「|」*

回答:

🔄 *場面: 表の「日本語の名」に、「表示の|倍率」のような「|」が入っています。*

- 🔄 *GRS JSON の群の日本語の名 33 のうち、22 が「|」を含みます（数え方: `label.ja` に「|」を含む語）。最初はこのパートの #27 です。*
- 🔄 *これは設定の欄の名（`display-words.json` の K 行）を写したもので、「|」は欄の中で折り返す所の印です（例: `K-67`「横の|ズーム|倍率」）。*
- 🔄 *辞書のスキーマは、`label` を「人が見る名」と言います。*

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *辞書の名からは「\|」を除く。折り返す所は `display-words.json` だけが持つ* |
| 🔄 *b* | 🔄 *「\|」も写す（画面の字と 1 字も違えない）* |

##### 🔄 *問 6-8-0. Part 8 の残りの 30 語 —— 表のとおりでよいか*

回答:

🔄 *直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|---|
| 🔄 *3* | 🔄 *`baseCalendarUid`* |  | 🔄 *MSPDI の Calendar/BaseCalendarUID と同じ。この暦が受け継ぐ元の暦。GRS は値を持つだけで、数えるのはこの暦が自分で並べる日だけである。（→ 問 6-7-1）* | 🔄 *BaseCalendarUID* |
| 🔄 *4* | 🔄 *`isBaseCalendar`* |  | 🔄 *MSPDI の Calendar/IsBaseCalendar と同じ。この値を省くと GRS は偽と読む。* | 🔄 *IsBaseCalendar* |
| 🔄 *6* | 🔄 *`id`（持ち主 `Project`）* |  | 🔄 *MSPDI の Project/UID と同じ。スケジュール文書を開いた元とは別の既存のファイルへ上書きする前に、GRS はこの値と project.name とファイル名がすべて一致するときだけ、そのファイルを同じスケジュール文書と見なす。値を省くと不一致になる。不一致なら、GRS は上書きの前に人へ確かめる。* | 🔄 *UID* |
| 🔄 *7* | 🔄 *`calendarUid`（持ち主 `Project`）* |  | 🔄 *MSPDI の Project/CalendarUID と同じ。GRS はすべての稼働日をこの 1 つの暦（プロジェクトカレンダー）で数える。値を省くか、指す先の暦が欠けているときは、GRS は isBaseCalendar が真で ordinal が最小の暦を使い、それも欠けていれば組み込みの既定を使う。（→ 問 6-7-1）* | 🔄 *CalendarUID* |
| 🔄 *8* | 🔄 *`name`（持ち主 `Project`）* | 🔄 *<span style="color: #0550AE">プロジェクト名</span>* | 🔄 *MSPDI の Project/Name と同じ。GRS はこの値をプロジェクト名として表示し編集する。アプリヘッダーは title をプロジェクトタイトルとして出す。上書きしようとしている既存のファイルが同じスケジュール文書かを見分けるときにも、GRS は id とファイル名に合わせてこの値を使う。（`JDG-3355`）* | 🔄 *Name* |
| 🔄 *9* | 🔄 *`title`* | 🔄 *<span style="color: #0550AE">プロジェクトタイトル</span>* | 🔄 *MSPDI の Project/Title と同じ。GRS はこの値をプロジェクトタイトルとしてアプリヘッダーに出し、別名保存ダイアログの既定のファイル名もこの値から作る。この値を省くと、GRS はブラウザーのタブに Untitled と出す。（`JDG-3355`・`JDG-3365`）* | 🔄 *Title* |
| 🔄 *10* | 🔄 *`subject`* |  | 🔄 *MSPDI の Project/Subject と同じ。* | 🔄 *Subject* |
| 🔄 *11* | 🔄 *`category`* |  | 🔄 *MSPDI の Project/Category と同じ。* | 🔄 *Category* |
| 🔄 *12* | 🔄 *`company`* |  | 🔄 *MSPDI の Project/Company と同じ。* | 🔄 *Company* |
| 🔄 *13* | 🔄 *`manager`* |  | 🔄 *MSPDI の Project/Manager と同じ。* | 🔄 *Manager* |
| 🔄 *14* | 🔄 *`author`* |  | 🔄 *MSPDI の Project/Author と同じ。作成者を指し、スケジュール文書を最後に書いた者（documentStamp.lastEditedBy）とは役目が違う。* | 🔄 *Author* |
| 🔄 *15* | 🔄 *`revision`* |  | 🔄 *MSPDI の Project/Revision と同じ。MSPDI のファイルを作った道具がプロジェクトを保存した回数。documentStamp のどの時刻とも別の値である。* | 🔄 *Revision* |
| 🔄 *16* | 🔄 *`creationDate`* |  | 🔄 *MSPDI の Project/CreationDate と同じ。GRS は新しいスケジュール文書を作るときにこの値を書く。* | 🔄 *CreationDate* |
| 🔄 *17* | 🔄 *`startDate`* |  | 🔄 *MSPDI の Project/StartDate と同じ。* | 🔄 *StartDate* |
| 🔄 *18* | 🔄 *`statusDate`* |  | 🔄 *MSPDI の Project/StatusDate と同じ。GRS はこの日に基準日線を引く。この値を省くと、GRS は基準日線の描画と遅延診断の実行を省く。* | 🔄 *StatusDate* |
| 🔄 *19* | 🔄 *`scheduleDataTimeZone`* |  | 🔄 *スケジュールデータの日時の時計の、固定の UTC オフセット。例えば UTC+09:00。標準時であり、GRS は 1 年中このオフセットをそのまま使う。GRS は MSPDI の書き出しからこのオフセットを除く。* | 🔄 *無し* |
| 🔄 *20* | 🔄 *`minutesPerDay`* |  | 🔄 *MSPDI の Project/MinutesPerDay と同じ。稼働日 1 日（1d）の長さを分で表し、この値を省くと 480（8 時間）。どれかの稼働日の時間帯の合計がこの値と違えば、スケジュール文書を開くときに GRS は注意を出す。* | 🔄 *MinutesPerDay* |
| 🔄 *21* | 🔄 *`minutesPerWeek`* |  | 🔄 *MSPDI の Project/MinutesPerWeek と同じ。* | 🔄 *MinutesPerWeek* |
| 🔄 *22* | 🔄 *`daysPerMonth`* |  | 🔄 *MSPDI の Project/DaysPerMonth と同じ。* | 🔄 *DaysPerMonth* |
| 🔄 *23* | 🔄 *`weekStartDay`* |  | 🔄 *MSPDI の Project/WeekStartDay と同じで、0 が日曜日。WeekDay.dayType は曜日を 1 から数える点が違う。この値を省くと月曜日（1）。* | 🔄 *WeekStartDay* |
| 🔄 *24* | 🔄 *`defaultStartTime`* |  | 🔄 *MSPDI の Project/DefaultStartTime と同じ。日付だけで時刻を省いた開始（Task や BaselineTask の start、actualStart、resume、project.startDate）に GRS が与える時刻で、この値を省くと 08:00:00。マイルストーンの開始には defaultFinishTime を与える。* | 🔄 *DefaultStartTime* |
| 🔄 *25* | 🔄 *`defaultFinishTime`* |  | 🔄 *MSPDI の Project/DefaultFinishTime と同じ。日付だけで時刻を省いた終了（Task や BaselineTask の finish、actualFinish、stop、deadline、project.statusDate）に GRS が与える時刻で、この値を省くと 17:00:00。マイルストーンの開始にもこの時刻を与える。* | 🔄 *DefaultFinishTime* |
| 🔄 *31* | 🔄 *`sourceFormat`* |  | 🔄 *スケジュール文書の元の形式。GRS で作った文書は grs、MSPDI のファイルから読んだ文書は pj12 か pj15（pj15 だけの要素を 1 つでも持てば pj15）。GRS は MSPDI の書き出しからこの値を除く。* | 🔄 *無し* |
| 🔄 *32* | 🔄 *&emsp;+- `grs`（持ち主 `sourceFormat`）* |  | 🔄 *GRS で作ったスケジュール文書。* | 🔄 *無し* |
| 🔄 *33* | 🔄 *&emsp;+- `pj12`（持ち主 `sourceFormat`）* |  | 🔄 *2012 年版のスキーマの MSPDI のファイルから読んだスケジュール文書。* | 🔄 *無し* |
| 🔄 *34* | 🔄 *&emsp;+- `pj15`（持ち主 `sourceFormat`）* |  | 🔄 *2015 年版のスキーマだけが持つ要素を含む MSPDI のファイルから読んだスケジュール文書。* | 🔄 *無し* |
| 🔄 *35* | 🔄 *`Project`* |  | 🔄 *MSPDI の Project と同じ。文書が表す 1 件のプロジェクト。* | 🔄 *Project* |
| 🔄 *36* | 🔄 *`predecessorUid`* |  | 🔄 *MSPDI の PredecessorLink/PredecessorUID と同じ。* | 🔄 *PredecessorUID* |
| 🔄 *38* | 🔄 *`linkLag`* |  | 🔄 *MSPDI の PredecessorLink/LinkLag と同じ。lagFormat がどの単位でも、ラグを 0.1 分単位で持つ。この値を省くとラグは 0。1 稼働日のラグは project.minutesPerDay の 10 倍（project.minutesPerDay を省いたときは 480（8 時間）の 10 倍）。* | 🔄 *LinkLag* |
| 🔄 *39* | 🔄 *`lagFormat`* |  | 🔄 *MSPDI の PredecessorLink/LagFormat と同じ。GRS がラグを解するのは値が 7（稼働日）、5（時間）、3（分）のときだけで、ほかの単位ではラグを表示するだけで値はそのまま持つ。GRS は、利用者がラグを打ち込んだ単位を書く。* | 🔄 *LagFormat* |

🔄 *---*

#### 🔄 *Part 9 / 43 —— GRS JSON / タスクと依存・担当と割当・タスクグループ・タスクの描き方・取り込み元・変更前の予定（36 語）*

🔄 *（見出しの「変更前の予定」は、問 6-10-3 で直します。）*

##### 🔄 *問 6-9-1. 両端に点のある細い線の名 —— `endpointSpan`（端点スパン）*

回答:

🔄 *場面: マイルストーンでないタスクの 4 つの形（`taskShape` の値）。画面では、タスクの形のパレットで選ぶ（仕様書の表 T-012 の `SH-1`〜`SH-4`）。`chevron` の日本語の名は矢羽根に決まりました（`JDG-3494`）。残るのは、両端に点のある細い線（画面の絵 `*----*`）の名です。*

| 🔄 *#* | 🔄 *キー* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|:---|:---|:---|:---|
| 🔄 *36* | 🔄 *&emsp;+- `endpointSpan`（持ち主 `taskShape`）* | 🔄 *端点スパン: 両端に点のある細い線。* | 🔄 *無し* |

🔄 *意味の根拠:*

- 🔄 *兄弟の 3 つの値は、描く物の形の名です: 矩形 `rectangle`・矢羽根 `chevron`・矢印 `arrow`。`endpointSpan`（端の点と幅）だけが、形の名でなく、形の説明です。*
- 🔄 *2 つの点を線で結んだ形には、データの図の世界で定まった名があります: dumbbell（ダンベル）。2 つの値を点で示し、その間を線で結ぶ図を、dumbbell chart（ダンベルチャート）と呼びます。GRS の形も、始まりと終わりの 2 点を線で結びます。*
- 🔄 *日本語の「ダンベル」は、多くの人が形を思い浮かべられる言葉です。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 ***`dumbbell`（ダンベル / Dumbbell）。** 両端に点のある細い線の形の名。兄弟と同じく形の名で、データの図の定まった名と同じ* |
| 🔄 *b* | 🔄 *`endpointSpan`（端点スパン）のまま。端点と幅という中身を、名が直接言う* |
| 🔄 *c* | 🔄 *`dotLine`（点付き線 / Dot Line）。字のとおりの、短い形の説明* |

##### 🔄 *問 6-9-2. 前の席が付けた名 —— `representedTaskUid`*

回答:

🔄 *場面: タスクグループが、WBS のどのタスクを表すかを持ちます。*

- 🔄 *前の名は `derivedFromTaskUid` です。所見 F27（残る役目は「このタスクグループが WBS でどのタスクを表すか」だけ。仕様書の `HM-9`・`HM-12`）から、前の席が名を付けました。*
- 🔄 *名を言った裁定の行は 0 です。`erd.json`・src・仕様書にもありません。*

| 🔄 *#* | 🔄 *キー* | 🔄 *前の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|---|
| 🔄 *20* | 🔄 *`representedTaskUid`* | 🔄 *`derivedFromTaskUid`* | 🔄 *このタスクグループが WBS で表すタスク。値を書いたタスクグループだけが、タスクを表す。タスクグループの名前は name が持ち、このプロパティが指すタスクの名前から独立している。* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *`representedTaskUid`（このタスクグループが WBS で表すタスクの uid）を採る* |
| 🔄 *b* | 🔄 *`representedTaskUid` の名を直す（新しい名を書く）* |

##### 🔄 *問 6-9-0. Part 9 の残りの 32 語 —— 表のとおりでよいか*

回答:

🔄 *直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|---|
| 🔄 *1* | 🔄 *`parentTaskUid`* |  | 🔄 *WBS での親タスク。この値を省くと最上位のタスク。* | 🔄 *無し* |
| 🔄 *2* | 🔄 *`notes`* |  | 🔄 *MSPDI の Task/Notes と同じ。* | 🔄 *Notes* |
| 🔄 *3* | 🔄 *`deadline`* |  | 🔄 *MSPDI の Task/Deadline と同じ。* | 🔄 *Deadline* |
| 🔄 *4* | 🔄 *`actualStart`* |  | 🔄 *MSPDI の Task/ActualStart と同じ。この値を省くとタスクは未着手である。* | 🔄 *ActualStart* |
| 🔄 *5* | 🔄 *`stop`* |  | 🔄 *MSPDI の Task/Stop と同じ。進行中か中断のタスクで、ここまでの実際の作業の終わり。完了したタスクでは actualFinish がその終わりを持ち、GRS はタスクを完了させるときに stop を空にする。* | 🔄 *Stop* |
| 🔄 *6* | 🔄 *`actualFinish`* |  | 🔄 *MSPDI の Task/ActualFinish と同じ。この値を持つのは、完了したタスクだけである。percentComplete が 100 でも、完了を決めるのは actualFinish である。* | 🔄 *ActualFinish* |
| 🔄 *7* | 🔄 *`resume`* |  | 🔄 *MSPDI の Task/Resume と同じ。中断したタスクで、残りの作業を再開する予定の時。* | 🔄 *Resume* |
| 🔄 *8* | 🔄 *`resumeValid`* |  | 🔄 *MSPDI の Task/ResumeValid と同じ。actualStart を持ち actualFinish を省いたタスクで、偽は再開日未定の中断を表し、GRS は resume の日時を無視する。* | 🔄 *ResumeValid* |
| 🔄 *9* | 🔄 *`percentComplete`* |  | 🔄 *MSPDI の Task/PercentComplete と同じ。ただし GRS はこの値を、実績の稼働時間（actualStart から actualFinish まで、または stop まで）を予定の稼働時間（start から finish まで）で割り、100 を掛けて丸めた数として計算し直す。100 を超える計算結果も、そのまま値にする。予定の稼働時間が 0 のとき（マイルストーンなど）は、actualFinish を持つタスクが 100、それ以外が 0。* | 🔄 *PercentComplete* |
| 🔄 *10* | 🔄 *<span style="color: #0550AE">`fadeInCalendarDays`</span>* |  | 🔄 *開始が未確定であることを示すために、予定バーの始まりにフェード斜面を描く暦日の数。矩形では始まりの辺が斜めになる。矢羽根では始まりの切り欠きの深さになる。ほかの形ではこの値を無視する。この値を省くとフェードの描画を省く（矢羽根は既定の深さを保つ）。0 は平らな始まり。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`）* | 🔄 *ExtendedAttribute* |
| 🔄 *11* | 🔄 *<span style="color: #0550AE">`fadeOutCalendarDays`</span>* |  | 🔄 *fadeInCalendarDays と同じことを終わりの側に対して行う（矢羽根では先の深さ）。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`）* | 🔄 *ExtendedAttribute* |
| 🔄 *13* | 🔄 *`Task`* |  | 🔄 *MSPDI の Task と同じ。GRS は進捗ステータスを次の順に調べ、最初に当たったものを取る: actualStart を省いていれば未着手、actualFinish があれば完了、resumeValid が偽なら中断・再開日未定、resume があれば中断・再開予定あり、それ以外は進行中。* | 🔄 *Task* |
| 🔄 *15* | 🔄 *`isCostResource`* |  | 🔄 *MSPDI の Resource/IsCostResource と同じ。この値を省くと GRS は偽と読む。* | 🔄 *IsCostResource* |
| 🔄 *16* | 🔄 *`Resource`* |  | 🔄 *MSPDI の Resource と同じ。タスクに就く担当。* | 🔄 *Resource* |
| 🔄 *17* | 🔄 *`resourceUid`* |  | 🔄 *MSPDI の Assignment/ResourceUID と同じ。* | 🔄 *ResourceUID* |
| 🔄 *18* | 🔄 *`Assignment`* |  | 🔄 *MSPDI の Assignment と同じ。どの担当がどのタスクに就くか。* | 🔄 *Assignment* |
| 🔄 *19* | 🔄 *`parentId`* |  | 🔄 *親のタスクグループ。この値を省くと最上位のタスクグループ（深さ 1）。* | 🔄 *無し* |
| 🔄 *21* | 🔄 *`treeState`* |  | 🔄 *タスクグループパネルで、タスクグループが開いているか、閉じているか、隠れているか。auto は documentSettings.taskGroupAutoExpandDepth に従う。temporarilyExpanded は次の全体表示か縦の縮小まで開いたままで、そのあと auto になる。* | 🔄 *無し* |
| 🔄 *22* | 🔄 *&emsp;+- `auto`（持ち主 `treeState`）* |  | 🔄 *人が決める前の値。開くかどうかは documentSettings.taskGroupAutoExpandDepth に従う。* | 🔄 *無し* |
| 🔄 *23* | 🔄 *&emsp;+- `collapsed`（持ち主 `treeState`）* |  | 🔄 *閉じている。GRS は配下のタスクグループの描画を省く。* | 🔄 *無し* |
| 🔄 *24* | 🔄 *&emsp;+- `expanded`（持ち主 `treeState`）* |  | 🔄 *人が選んで開いている。* | 🔄 *無し* |
| 🔄 *25* | 🔄 *&emsp;+- `temporarilyExpanded`（持ち主 `treeState`）* |  | 🔄 *次の全体表示か縦の縮小まで開いていて、そのあと auto になる。* | 🔄 *無し* |
| 🔄 *26* | 🔄 *&emsp;+- `hidden`（持ち主 `treeState`）* |  | 🔄 *GRS はこのタスクグループをタスクグループパネルから隠す。* | 🔄 *無し* |
| 🔄 *27* | 🔄 *`editGroup`* |  | 🔄 *このタスクグループを編集してよいグループの名前。書いてあれば、GRS はこのタスクグループのタスクへの編集を断る。この値を省くと誰でも編集してよい。* | 🔄 *無し* |
| 🔄 *28* | 🔄 *`color`* |  | 🔄 *このタスクグループのタスクグループレーンの色。この値を省くと、GRS はレーンの塗りの描画を省く。{"kind":"theme"} はテーマの色を塗る。* | 🔄 *無し* |
| 🔄 *29* | 🔄 *`minHeightPx`* |  | 🔄 *このタスクグループのタスクグループレーンの最も低い高さ。値は displayScalePercent が 100 のときの CSS ピクセルで表す。この値を省くと最も低い高さは未指定になる。verticalZoomRatio を変えても、この高さは同じ値を保つ。* | 🔄 *無し* |
| 🔄 *30* | 🔄 *<span style="color: #0550AE">`TaskGroup`</span>* |  | 🔄 *タスクグループ。タスクグループパネルの 1 行と、1 つのタスクグループレーン。タスクグループは WBS（Task.parentTaskUid）とは別の自分の木を作る。GRS は MSPDI の書き出しからタスクグループを除く。（`JDG-3361`）* | 🔄 *無し* |
| 🔄 *31* | 🔄 *`TaskGroupMember`* |  | 🔄 *GRS がタスクをどのタスクグループに描くか。どのタスクもちょうど 1 つのタスクグループに入る。GRS は、documentSettings.stackDirection の向きに、タスクグループのタスクを自分で積む。* | 🔄 *無し* |
| 🔄 *32* | 🔄 *<span style="color: #0550AE">`taskShape`</span>* |  | 🔄 *マイルストーン以外のタスクのタスク図形の形。Task.milestone が偽のタスクすべてが持ち、そのタスクだけが持つ。マイルストーンは代わりに milestoneShape を持つ。（`JDG-3311`）* | 🔄 *無し* |
| 🔄 *33* | 🔄 *&emsp;+- `rectangle`（持ち主 `taskShape`）* |  | 🔄 *矩形: ふつうのバー。* | 🔄 *無し* |
| 🔄 *34* | 🔄 *&emsp;+- `chevron`（持ち主 `taskShape`）* | 🔄 *<span style="color: #0550AE">矢羽根</span>* | 🔄 *矢羽根: 始まりに切り欠きがあり、終わりが尖ったバー。（`JDG-3494`）* | 🔄 *無し* |
| 🔄 *35* | 🔄 *&emsp;+- `arrow`（持ち主 `taskShape`）* |  | 🔄 *矢印: 終わりに矢じりのある細い線。* | 🔄 *無し* |

🔄 *---*

#### 🔄 *Part 10 / 43 —— GRS JSON / タスクの描き方・取り込み元・変更前の予定・注記（40 語）*

##### 🔄 *問 6-10-1. 線先が吸着する部分の値 —— 画面の名にそろえるか*

回答:

🔄 *場面: 利用者がコメントボックスの線先をタスクに吸着させたとき、この値が、タスク図形のどの部分に付いたかを言います。*

- 🔄 *`graphicPart` の値は `plannedBar`・`actualBar`・`milestone` です。*
- 🔄 *画面の群の語のキーは `planBar`（予定バー）・`actualBar`（実績バー）・`milestoneMark`（マイルストーンマーク。`JDG-3372`）です。表示のキーも `isPlanBarVisible` です（`JDG-3382`）。*
- 🔄 *`plannedBar` だけが planned と綴ります。`milestone` は、タスクの真偽のキー `milestone`（Part 7 の #22）と同じ綴りで、別の物を指します（`OMPV`）。*

| 🔄 *#* | 🔄 *キー* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|
| 🔄 *29* | 🔄 *&emsp;+- `plannedBar`（持ち主 `graphicPart`）* | 🔄 *タスクの予定バー。* | 🔄 *無し* |
| 🔄 *30* | 🔄 *&emsp;+- `actualBar`（持ち主 `graphicPart`）* | 🔄 *タスクの実績バー。* | 🔄 *無し* |
| 🔄 *31* | 🔄 *&emsp;+- `milestone`（持ち主 `graphicPart`）* | 🔄 *タスクのマイルストーンマーク。* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *`planBar`・`actualBar`・`milestoneMark` にする。画面の群の語のキーと同じ名になる* |
| 🔄 *b* | 🔄 *今のまま* |

##### 🔄 *問 6-10-2. マイルストーンの 15 の形の名 —— 値・アイコン・日本語の名を 1 つに*

回答:

🔄 *場面: マイルストーンの 15 の形（`milestoneShape` の値）。画面では、マイルストーンの形のパレットのアイコンで選ぶ（仕様書の表 T-012 の `SH-5`）。1 つの形が、3 つの所に名を持ちます: GRS JSON の値、パレットのアイコンの名（`milestone…Icon`）、仕様書が並べる日本語の名。*

🔄 *数え方: 値は src の `grs-json-schema.ts` の列挙、アイコンの名は辞書の下書き `glossary.json`、日本語の名は仕様書の `SH-5` の行から取った。*

| 🔄 *#* | 🔄 *値（GRS JSON）* | 🔄 *アイコンの名* | 🔄 *今の日本語の名* | 🔄 *席の案（英語 / 日本語）* |
|:---|:---|:---|:---|:---|
| 🔄 *2* | 🔄 *`circle`* | 🔄 *`milestoneCircleIcon`* | 🔄 *〇* | 🔄 *`circle` / 円* |
| 🔄 *3* | 🔄 *`hexagon`* | 🔄 *`milestoneHexagonIcon`* | 🔄 *六角形* | 🔄 *`hexagon` / 六角形* |
| 🔄 *4* | 🔄 *`pentagon`* | 🔄 *`milestonePentagonIcon`* | 🔄 *五角形* | 🔄 *`pentagon` / 五角形* |
| 🔄 *5* | 🔄 *`diamond`* | 🔄 *`milestoneDiamondIcon`* | 🔄 *◇* | 🔄 *`diamond` / ひし形* |
| 🔄 *6* | 🔄 *`square`* | 🔄 *`milestoneSquareIcon`* | 🔄 *□* | 🔄 *`square` / 正方形* |
| 🔄 *7* | 🔄 *`star`* | 🔄 *`milestoneStarIcon`* | 🔄 *☆* | 🔄 *`star` / 星* |
| 🔄 *8* | 🔄 *`triangleUp`* | 🔄 *`milestoneTriangleUpIcon`* | 🔄 *△* | 🔄 *`triangleUp` / 上向き三角* |
| 🔄 *9* | 🔄 *`triangleDown`* | 🔄 *`milestoneTriangleDownIcon`* | 🔄 *▽* | 🔄 *`triangleDown` / 下向き三角* |
| 🔄 *10* | 🔄 *`file`* | 🔄 *`milestoneFileIcon`* | 🔄 *ファイル* | 🔄 *`file` / ファイル* |
| 🔄 *11* | 🔄 *`box`* | 🔄 *`milestoneBoxIcon`* | 🔄 *ボックス* | 🔄 *`box` / 箱* |
| 🔄 *12* | 🔄 *`floppyDisk`* | 🔄 *`milestoneFloppyDiskIcon`* | 🔄 *フロッピー* | 🔄 *`floppyDisk` / フロッピーディスク* |
| 🔄 *13* | 🔄 *`cylinder`* | 🔄 *`milestoneCylinderIcon`* | 🔄 *円筒* | 🔄 *`cylinder` / 円筒* |
| 🔄 *14* | 🔄 *`person`* | 🔄 *`milestoneMeetingPeopleIcon`* | 🔄 *会議の人* | 🔄 *`meetingPeople` / 会議の人* |
| 🔄 *15* | 🔄 *`smile`* | 🔄 *`milestoneSmilingFaceIcon`* | 🔄 *嬉しい顔* | 🔄 *`smilingFace` / 笑顔* |
| 🔄 *16* | 🔄 *`beerMug`* | 🔄 *`milestoneBeerMugIcon`* | 🔄 *ビールジョッキ* | 🔄 *`beerMug` / ビールジョッキ* |

🔄 *意味の根拠:*

- 🔄 *1 つの形に 1 つの名を当てます。値・アイコン・日本語の名が同じ物を同じ名で呼べば、読む人は 3 つを結び付けて覚える必要がありません。*
- 🔄 *名は、描く物の名詞にします。`smile`（笑う、笑い）は動きの語で、描く物は笑った顔なので `smilingFace` にします。`person`（1 人の人）は、画面の名「会議の人」とアイコンの名が示す絵（会議をする人たち）より狭いので、`meetingPeople` にします。*
- 🔄 *日本語の名は記号でなく言葉にします。〇・◇・□・☆・△・▽ は字として読めず、辞書の名にも検索にも使いにくいからです。*
- 🔄 *「嬉しい顔」は、ふつう「笑顔」と呼びます（絵文字の名 smiling face の訳も笑顔）。「ボックス」と「フロッピー」は、ほかの名と同じく和語か正式な名（箱・フロッピーディスク）にそろえます。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 ***表の「席の案」の名にそろえる。** 15 の形それぞれで、値・アイコン・日本語の名を、描く物の名 1 つにそろえる（例: `circle` 円、`smilingFace` 笑顔）* |
| 🔄 *b* | 🔄 *英語は表の案、日本語の名は今のまま（記号を残す）。〇・◇ は画面のアイコンの形そのままで、利用者がすぐ照らし合わせられる* |
| 🔄 *c* | 🔄 *今のまま* |
| 🔄 *d* | 🔄 *直す所を書く（表のセルに ★）* |

##### 🔄 *問 6-10-3. 「前の予定」「変更前予定輪郭」を「前回予定」に*

回答:

🔄 *場面: 前回予定のタスクを、型と配列が持ちます。*

- 🔄 *`JDG-3434` で、`baseline` の日本語は「前回予定」にしました。「変更前の予定」「前回の予定」は使いません。*
- 🔄 *「前の予定」は前回予定（`JDG-3434`）を指すが、名がそれを言い切らない。*
- 🔄 *この群に残っている字: 「前の予定」4 か所（`uid`（持ち主 `BaselineTask`）・`BaselineTask`・`isBaselineOutlineVisible`・`baselineTasks`）、「前のタスク」1 か所、「変更前予定輪郭」2 か所、見出し「変更前の予定」（Part 9・10 の題）。*
- 🔄 *「変更前予定輪郭」は、画面の群の語 `baselineOutline` の名です（`JDG-3373`。`JDG-3434` より前の裁定）。*

| 🔄 *#* | 🔄 *キー* | 🔄 *直した意味の案* | 🔄 *MSPDI の名* |
|---|---|---|---|
| 🔄 *23* | 🔄 *`uid`（持ち主 `BaselineTask`）* | 🔄 *前回予定でのタスクの uid。GRS は同じ uid を持つ今のタスクと突き合わせる。* | 🔄 *無し* |
| 🔄 *24* | 🔄 *`BaselineTask`* | 🔄 *前回予定の 1 つのタスク。GRS は uid で今のタスクと突き合わせ、今のタスクの上に前回予定輪郭としてだけ描く。* | 🔄 *無し* |
| 🔄 *13-30* | 🔄 *`baselineTasks`* | 🔄 *前回予定。前回予定のタスクの日時を保存した写し。GRS は uid で写しを今のタスクと突き合わせ、比べるために今のタスクの上に前回予定輪郭として描く。* | 🔄 *無し* |
| 🔄 *12-33* | 🔄 *`isBaselineOutlineVisible`* | 🔄 *GRS が前回予定（baselineTasks）を今のタスクに重ねて描くかどうか。新しいスケジュール文書は偽で始まる。（表に残し、字だけ変わる）* | 🔄 *無し* |

🔄 *見出しは「タスクの描き方・取り込み元・前回予定」になります。*

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *「前回予定」と「前回予定輪郭」にする。画面の群の `baselineOutline` の名も、画面のパートで「前回予定輪郭」にする案を出す* |
| 🔄 *b* | 🔄 *「前回予定」だけ直す。「変更前予定輪郭」は画面のパートで問う* |
| 🔄 *c* | 🔄 *今のまま* |

##### 🔄 *問 6-10-4. 前の席が付けた名 —— 取り込みと線先の 3 つ*

回答:

🔄 *場面: 取り込みの数とコメントボックスの線先を、3 つの名が表します。*

- 🔄 *3 つとも α の名を改めた名です。名を言った裁定の行は 0 です（`dateTime`・`point` の字を含む行はあるが、日時の書き方 `xsd:dateTime` と、ファイルの名の中の字で、このキーの名ではない）。*

| 🔄 *#* | 🔄 *キー* | 🔄 *前の名* | 🔄 *意味（日本語）* | 🔄 *決めた所* | 🔄 *案* | 🔄 *MSPDI の名* |
|---|---|---|---|---|---|---|
| 🔄 *21* | 🔄 *`lastSeenImportNumber`* | 🔄 *`lastSeenImportSequence`* | 🔄 *取り込んだ MSPDI のファイルの中にこのタスクを見つけた、最後の取り込みの project.lastImportNumber。* | 🔄 *CHOICE N8（`lastImportNumber` と対）* | 🔄 *採る* | 🔄 *無し* |
| 🔄 *27* | 🔄 *`dateTime`* | 🔄 *`anchorDate`* | 🔄 *時間軸の上で線先が立つ時点。* | 🔄 *CHOICE N12* | 🔄 *採る（型 `DateTime` と同じ綴りだが、値はその型）* | 🔄 *無し* |
| 🔄 *32* | 🔄 *`point`* | 🔄 *`anchorSnapPoint`* | 🔄 *線先が吸着する、対象の 8 つの点のどれか。4 つの角と、4 つの辺の中点。* | 🔄 *所見 F30* | 🔄 *`snapPoint` にする（point だけでは何の点か分からない）* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *表の案のとおり（2 つは採り、`point` は `snapPoint`）* |
| 🔄 *b* | 🔄 *3 つとも今のまま* |
| 🔄 *c* | 🔄 *直す所を書く* |

##### 🔄 *問 6-10-0. Part 10 の残りの 17 語 —— 表のとおりでよいか*

回答:

🔄 *直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|---|
| 🔄 *1* | 🔄 *<span style="color: #0550AE">`milestoneShape`</span>* |  | 🔄 *マイルストーンマークの形。Task.milestone が真のタスクすべてが持ち、そのタスクだけが持つ。（`JDG-3311`）* | 🔄 *無し* |
| 🔄 *17* | 🔄 *<span style="color: #0550AE">`TaskGraphicStyle`</span>* |  | 🔄 *GRS がタスクのタスク図形をどう描くか。形、色、バーの輪郭の太さ。どのタスクもちょうど 1 つの TaskGraphicStyle を持つ。（`JDG-3384`）* | 🔄 *無し* |
| 🔄 *18* | 🔄 *<span style="color: #0550AE">`sourceProjectId`</span>* |  | 🔄 *GRS がこのタスクを取り込んだ元の MSPDI のファイルの Project/UID。GRS はこの値を、元のファイルが Project/UID を持つときだけ書く。（`JDG-2683`）* | 🔄 *無し* |
| 🔄 *19* | 🔄 *`sourceUid`* |  | 🔄 *GRS がタスクを取り込んだ元の MSPDI のファイルでの、そのタスクの UID。* | 🔄 *無し* |
| 🔄 *20* | 🔄 *`importSessionId`* |  | 🔄 *タスクを持ち込んだ取り込みの id。GRS はこの id を取り込みのたびに新しく作る。MSPDI のファイルが Project/UID を省いたときは、この id が sourceProjectId の代わりを務める。* | 🔄 *無し* |
| 🔄 *22* | 🔄 *`TaskOrigin`* |  | 🔄 *取り込んだタスクがどこから来たか。GRS が同じ MSPDI のファイルを再び取り込んだとき、写しを足す代わりにそのタスクを更新するために、GRS はこの記録を持つ。* | 🔄 *無し* |
| 🔄 *25* | 🔄 *<span style="color: #0550AE">`laneFraction`</span>* |  | 🔄 *そのタスクグループのタスクグループレーンの中での、線先の高さ。0 は上の縁、1 は下の縁。（`JDG-3381`）* | 🔄 *無し* |
| 🔄 *26* | 🔄 *<span style="color: #0550AE">`LeaderAnchorFallback`</span>* |  | 🔄 *線先の対象が消えたときに、線先が移る所。タスクグループと、そのタスクグループレーンの中での高さ。（`JDG-3381`）* | 🔄 *無し* |
| 🔄 *28* | 🔄 *<span style="color: #0550AE">`graphicPart`</span>* |  | 🔄 *線先が吸着するタスク図形の部分。予定バー、実績バー、マイルストーンマークのどれか。（`JDG-3381`）* | 🔄 *無し* |
| 🔄 *33* | 🔄 *&emsp;+- `topLeftCorner`（持ち主 `point`）* |  | 🔄 *左上の角。* | 🔄 *無し* |
| 🔄 *34* | 🔄 *&emsp;+- `topMiddle`（持ち主 `point`）* |  | 🔄 *上の辺の中点。* | 🔄 *無し* |
| 🔄 *35* | 🔄 *&emsp;+- `topRightCorner`（持ち主 `point`）* |  | 🔄 *右上の角。* | 🔄 *無し* |
| 🔄 *36* | 🔄 *&emsp;+- `rightMiddle`（持ち主 `point`）* |  | 🔄 *右の辺の中点。* | 🔄 *無し* |
| 🔄 *37* | 🔄 *&emsp;+- `bottomRightCorner`（持ち主 `point`）* |  | 🔄 *右下の角。* | 🔄 *無し* |
| 🔄 *38* | 🔄 *&emsp;+- `bottomMiddle`（持ち主 `point`）* |  | 🔄 *下の辺の中点。* | 🔄 *無し* |
| 🔄 *39* | 🔄 *&emsp;+- `bottomLeftCorner`（持ち主 `point`）* |  | 🔄 *左下の角。* | 🔄 *無し* |
| 🔄 *40* | 🔄 *&emsp;+- `leftMiddle`（持ち主 `point`）* |  | 🔄 *左の辺の中点。* | 🔄 *無し* |

🔄 *---*

#### 🔄 *Part 11 / 43 —— GRS JSON / 注記・文書の刻印と変更ログ・文書の設定（38 語）*

🔄 *（見出しの「刻印」「変更ログ」「文書の設定」は、問 6-11-1・6-11-2 で直します。）*

##### 🔄 *問 6-11-1. 「文書スタンプ」か「刻印」か*

回答:

🔄 *場面: 文書が最後に変わった時・最後に保存した時・最後に書いた者の 3 つをまとめた物。Agent API の書き込みで照らす stamp と同じ物です（`JDG-3333`）。*

- 🔄 *`JDG-3365`: 「`Document Stamp` の日本語は「文書スタンプ」」。*
- 🔄 *確定した Part 2 の `stamp`（`JDG-3430`）の日本語は「刻印」です。*
- 🔄 *仕様書と辞書は「刻印」と書く。「刻印」は、最後の変更・保存・書いた者をまとめた値を指す。*
- 🔄 *この群では、`documentStamp` の意味「文書の刻印。」、見出し「文書の刻印と変更ログ」、`ScheduleDocument` の意味の「文書の刻印」の 3 か所に、この字があります。*

| 🔄 *#* | 🔄 *キー* | 🔄 *a のときの意味の案* | 🔄 *MSPDI の名* |
|---|---|---|---|
| 🔄 *13-37* | 🔄 *<span style="color: #0550AE">`documentStamp`</span>* | 🔄 *文書スタンプ。最後に変わった時刻と最後に保存した時刻、スケジュール文書を最後に書いた者。（`JDG-3333`）* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *「文書スタンプ」にそろえる。確定した `stamp` の日本語も「スタンプ」に改める。仕様書と辞書の「刻印」も、`CR-857` で「スタンプ」にそろえる。スタンプ: 日時と書いた者を押した印* |
| 🔄 *b* | 🔄 *「刻印」にそろえる（`JDG-3365` を改める）。名は「文書刻印」（名に「の」を挟まない `JDG-3365`）。刻印は、いつ・誰がを消えない印として残す語で、stamp が指す値に合う* |

##### 🔄 *問 6-11-2. 「変更履歴」と「文書設定」*

回答:

🔄 *場面: スケジュール文書の 2 つの部分が、日本語の名を持ちます。*

| 🔄 *#* | 🔄 *キー* | 🔄 *今の字* | 🔄 *案* | 🔄 *根拠* |
|---|---|---|---|---|
| 🔄 *13-38* | 🔄 *<span style="color: #0550AE">`changeLogEntries`</span>* | 🔄 *変更ログ* | 🔄 *変更履歴* | 🔄 *`JDG-3332` で、画面の入口は「変更履歴」のボタンと「変更履歴ウインドウ」（利用者の言葉）。`JDG-3353` の「変更の記録」は、名に「の」を挟まない `JDG-3365` に合わない* |
| 🔄 *13-21* | 🔄 *`documentSettings`* | 🔄 *文書の設定* | 🔄 *文書設定* | 🔄 *`JDG-3353` は「文書の設定」と呼んだが、その後の `JDG-3365` が、名に「の」を挟まないと決めた* |

🔄 *a のときの意味の案:*

| 🔄 *#* | 🔄 *キー* | 🔄 *意味の案* | 🔄 *MSPDI の名* |
|---|---|---|---|
| 🔄 *13-38* | 🔄 *<span style="color: #0550AE">`changeLogEntries`</span>* | 🔄 *変更履歴。人や AI がスケジュール文書への変更について書いた記録で、古いものが先。新しい記録は末尾に足す。（`JDG-3332`・`JDG-3333`）* | 🔄 *無し* |
| 🔄 *13-21* | 🔄 *`documentSettings`* | 🔄 *文書設定。スケジュール文書を開いたとき、GRS がそれをどう描くか。GRS は値を持つキーを、既定の値であってもすべて書く。* | 🔄 *無し* |

🔄 *見出しは、問 6-11-1 が a なら「文書スタンプと変更履歴」「文書設定」になります。*

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *2 つとも案のとおり* |
| 🔄 *b* | 🔄 *「変更ログ」「文書の設定」のまま* |
| 🔄 *c* | 🔄 *直す所を書く* |

##### 🔄 *問 6-11-3. 前の席が付けた名 —— 注記と文書の 6 つ*

回答:

🔄 *場面: 線先の型の中身と、文書スタンプ・変更履歴の型を、6 つの名が表します。*

- 🔄 *6 つとも、名を言った裁定の行は 0 です（`DocumentStamp`・`ChangeLogEntry` の字を含む行は 1 つずつあるが、利用者の問いの中の字と、着地の欄の字で、名を決めた行ではない）。*

| 🔄 *#* | 🔄 *キー* | 🔄 *前の名* | 🔄 *意味（日本語）* | 🔄 *決めた所* | 🔄 *MSPDI の名* |
|---|---|---|---|---|---|
| 🔄 *1* | 🔄 *`fallback`* | 🔄 *（無し）* | 🔄 *線先の対象（タスクかハイライトボックス）が消えたときに、線先が移る所。* | 🔄 *所見 F30* | 🔄 *無し* |
| 🔄 *4* | 🔄 *&emsp;+- `freePoint`（持ち主 `LeaderAnchor`）* | 🔄 *（無し。前は 7 つの列を平らに持った）* | 🔄 *タスクグループレーンの中の自由点（タスクにもハイライトボックスにも属さない点）。* | 🔄 *所見 F30* | 🔄 *無し* |
| 🔄 *21* | 🔄 *`documentUpdatedAt`* | 🔄 *`settingsUpdatedAt`* | 🔄 *スケジュール文書が、スケジュールデータか documentSettings で最後に変わった時。* | 🔄 *所見 F48（どちらの部分が変わっても進む）* | 🔄 *無し* |
| 🔄 *28* | 🔄 *`Writer`* | 🔄 *（無し。前は文字列）* | 🔄 *書いた者。GRS の画面で操作する人、同梱の起動時のテンプレート、Agent API の呼び手のどれか。（直した。前は「GRS の中の人」）* | 🔄 *所見 F49* | 🔄 *無し* |
| 🔄 *30* | 🔄 *`DocumentStamp`* | 🔄 *`documentStamp`（`$defs`）* | 🔄 *スケジュール文書が最後に変わった時、GRS が最後に保存した時、最後に書いた者。（→ 問 6-11-1）* | 🔄 *CHOICE N14（`$defs` の名を PascalCase に。文書の中のキー `documentStamp` は残る `JDG-3333`）* | 🔄 *無し* |
| 🔄 *37* | 🔄 *`ChangeLogEntry`* | 🔄 *`changeLog`（`$defs`）* | 🔄 *スケジュール文書への 1 つの変更についての記録。いつ、誰が、どの部分を、何を、なぜ、そのほか。* | 🔄 *`JDG-3332` の 1 件を表す型（型の名は前の席）* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *`fallback`（線先の対象が消えたときの移り先）・`freePoint`（タスクグループレーンの中の自由点）・`documentUpdatedAt`（スケジュール文書が最後に変わった時）・`Writer`（書いた者）・`DocumentStamp`（最後の変更・保存・書いた者をまとめた値）・`ChangeLogEntry`（変更履歴の 1 件）を、表の意味のとおり採る* |
| 🔄 *b* | 🔄 *直す所を、キーと意味で書く* |

##### 🔄 *問 6-11-0. Part 11 の残りの 32 語 —— 表のとおりでよいか*

回答:

🔄 *直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|---|
| 🔄 *2* | 🔄 *<span style="color: #0550AE">`highlightBoxId`</span>* |  | 🔄 *線先が吸着するハイライトボックスの id。（`JDG-2685`）* | 🔄 *無し* |
| 🔄 *3* | 🔄 *`kind`（持ち主 `LeaderAnchor`）* |  | 🔄 *freePoint: タスクグループレーンの中の自由点（タスクにもハイライトボックスにも属さない点）。task: タスクの予定バー・実績バー・マイルストーンマークの 8 つの点のどれか。highlightBox: ハイライトボックスの 8 つの点のどれか。* | 🔄 *無し* |
| 🔄 *5* | 🔄 *&emsp;+- `task`（持ち主 `LeaderAnchor`）* |  | 🔄 *タスクの予定バー・実績バー・マイルストーンマークの 8 つの点のどれか。* | 🔄 *無し* |
| 🔄 *6* | 🔄 *&emsp;+- `highlightBox`（持ち主 `LeaderAnchor`）* |  | 🔄 *ハイライトボックスの 8 つの点のどれか。* | 🔄 *無し* |
| 🔄 *7* | 🔄 *<span style="color: #0550AE">`LeaderAnchor`</span>* |  | 🔄 *コメントボックスの引出し線が指す所。kind で、自由点、タスク、ハイライトボックスのどれかを選ぶ。（`JDG-3381`）* | 🔄 *無し* |
| 🔄 *8* | 🔄 *`dx`* |  | 🔄 *bodyOffsetPx の横の成分。正の値は箱を右へ動かす。* | 🔄 *無し* |
| 🔄 *9* | 🔄 *`dy`* |  | 🔄 *bodyOffsetPx の縦の成分。GRS と同じく、正の値は箱を下へ動かす。* | 🔄 *無し* |
| 🔄 *10* | 🔄 *`bodyOffsetPx`* |  | 🔄 *線先から、コメントボックスの本文の箱の左下の角までのずれ。値は displayScalePercent が 100 のときの CSS ピクセルで表す。displayScalePercent に従って拡大縮小し、ズームの倍率とは別に決まる。* | 🔄 *無し* |
| 🔄 *11* | 🔄 *<span style="color: #0550AE">`leaderAnchor`</span>* |  | 🔄 *コメントボックスの引出し線が指す所。タスクグループレーンの中の自由点か、引出し線が吸着したタスクやハイライトボックスの点。吸着した線先は、対象が消えたときの移り先も持つ。（`JDG-3381`）* | 🔄 *無し* |
| 🔄 *12* | 🔄 *`text`（持ち主 `CommentBox`）* |  | 🔄 *コメントボックスの文。この値を省くと本文は空。* | 🔄 *無し* |
| 🔄 *13* | 🔄 *`textColor`* |  | 🔄 *コメントボックスの文字の色。* | 🔄 *無し* |
| 🔄 *14* | 🔄 *`fontSizePx`* |  | 🔄 *コメントボックスの文字の大きさ。値は displayScalePercent が 100 のときの CSS ピクセルで表す。displayScalePercent に従って拡大縮小し、ズームの倍率とは別に決まる。箱を置くときは 10 を書く。* | 🔄 *無し* |
| 🔄 *15* | 🔄 *<span style="color: #0550AE">`CommentBox`</span>* |  | 🔄 *1 つのコメントボックス。線先は、自由点（時点・タスクグループ・そのタスクグループレーンの中の高さ）か、吸着したタスクやハイライトボックスの 8 つの点のどれかに立つ。（`JDG-3371`）* | 🔄 *無し* |
| 🔄 *16* | 🔄 *`topTaskGroupId`* |  | 🔄 *箱の上の縁にあるタスクグループ。* | 🔄 *無し* |
| 🔄 *17* | 🔄 *`bottomTaskGroupId`* |  | 🔄 *箱の下の縁にあるタスクグループ。* | 🔄 *無し* |
| 🔄 *18* | 🔄 *`cornerRadiusPx`* |  | 🔄 *ハイライトボックスの角の丸みの半径。値は displayScalePercent が 100 のときの CSS ピクセルで表し、0 は四角い角。displayScalePercent に従って拡大縮小し、ズームの倍率とは別に決まる。箱を置くときは 4 を書く。* | 🔄 *無し* |
| 🔄 *19* | 🔄 *`HighlightBox`* |  | 🔄 *1 つのハイライトボックス。日付の範囲とタスクグループの範囲を囲む。* | 🔄 *無し* |
| 🔄 *20* | 🔄 *<span style="color: #0550AE">`scheduleDataUpdatedAt`</span>* |  | 🔄 *スケジュールデータが最後に変わった時。watchChanges はこの時刻だけを見る。（`JDG-3380`）* | 🔄 *無し* |
| 🔄 *22* | 🔄 *`fileSavedAt`* |  | 🔄 *GRS がスケジュール文書を最後に保存した時（UTC）。GRS は初めて保存したときに、この値を初めて書く。* | 🔄 *無し* |
| 🔄 *23* | 🔄 *<span style="color: #0550AE">`kind`</span>（持ち主 `Writer`）* |  | 🔄 *user: GRS の画面で操作する人。template: 同梱の起動時のテンプレート。agent: Agent API の呼び手。（`JDG-3275`）* | 🔄 *無し* |
| 🔄 *24* | 🔄 *&emsp;+- <span style="color: #0550AE">`user`</span>（持ち主 `Writer`）* |  | 🔄 *GRS の画面で操作する人。（`JDG-3275`）* | 🔄 *無し* |
| 🔄 *25* | 🔄 *&emsp;+- `template`（持ち主 `Writer`）* |  | 🔄 *同梱の起動時のテンプレート。* | 🔄 *無し* |
| 🔄 *26* | 🔄 *&emsp;+- `agent`（持ち主 `Writer`）* |  | 🔄 *Agent API の呼び手。* | 🔄 *無し* |
| 🔄 *27* | 🔄 *`name`（持ち主 `Writer`）* |  | 🔄 *Agent API の呼び手が自分に付けた名前。* | 🔄 *無し* |
| 🔄 *29* | 🔄 *`lastEditedBy`* |  | 🔄 *スケジュール文書を最後に書いた者。GRS の画面で操作する人は {"kind":"user"}、同梱の起動時のテンプレートは {"kind":"template"}、Agent API の呼び手は {"kind":"agent","name":...}。* | 🔄 *無し* |
| 🔄 *31* | 🔄 *<span style="color: #0550AE">`changedAt`</span>* |  | 🔄 *変更が起きた時（UTC）。GRS は記録を足した時刻を入れ、人はその時刻を変えてよい。（`JDG-3332`）* | 🔄 *無し* |
| 🔄 *32* | 🔄 *<span style="color: #0550AE">`changedBy`</span>* |  | 🔄 *変更をした者。人が打った名前か、AI が自分に付けた名前。（`JDG-3332`）* | 🔄 *無し* |
| 🔄 *33* | 🔄 *<span style="color: #0550AE">`affectedArea`</span>* |  | 🔄 *変更がスケジュール文書のどの部分に及んだか。（`JDG-3332`）* | 🔄 *無し* |
| 🔄 *34* | 🔄 *<span style="color: #0550AE">`changeDescription`</span>* |  | 🔄 *何が変わったか。（`JDG-3332`）* | 🔄 *無し* |
| 🔄 *35* | 🔄 *<span style="color: #0550AE">`reason`</span>（持ち主 `ChangeLogEntry`）* |  | 🔄 *変更の理由。（`JDG-3332`）* | 🔄 *無し* |
| 🔄 *36* | 🔄 *<span style="color: #0550AE">`note`</span>* |  | 🔄 *変更についてのそのほかのこと。（`JDG-3332`）* | 🔄 *無し* |
| 🔄 *38* | 🔄 *<span style="color: #0550AE">`displayScalePercent`</span>* | 🔄 *表示の\|倍率* | 🔄 *スケジュールキャンバスの描画の表示の倍率（パーセント）。100 では、名前が Px で終わるプロパティの値をすべてその数の CSS ピクセルで描き、50 ではそれを半分の大きさで描く。形と文字を一緒に拡大縮小する。アプリヘッダー・コマンドパレット・ブラウザーのズームは、この値を変えても同じ大きさを保つ。（`JDG-3292`）* | 🔄 *無し* |

🔄 *---*

#### 🔄 *Part 12 / 43 —— GRS JSON / 文書の設定（39 語）*

##### 🔄 *問 6-12-1. 設定の欄の名が、後の裁定に追いついていない*

回答:

🔄 *場面: 設定の欄に出る名（画面の語）を、辞書の日本語の名が写しています。*

- 🔄 *`display-words.json` の注は、「どの語も利用者が書く。エージェントは語を作らない」と言います。だから、直すかどうかを 1 行ずつ見てください。*
- 🔄 *下の名は、その後の裁定と食い違います。*

| 🔄 *K 行* | 🔄 *キー* | 🔄 *今の名（日本語 / 英語）* | 🔄 *案* | 🔄 *根拠* |
|---|---|---|---|---|
| 🔄 *`K-78`* | 🔄 *`isProgressMarkVisible`* | 🔄 *進捗マーカー / Progress Marker* | 🔄 *進捗マーク / Progress Mark* | 🔄 *`JDG-3372`（「マーカー」と書かない）* |
| 🔄 *`K-84`* | 🔄 *`isBaselineOutlineVisible`* | 🔄 *変更前の予定を重ねるか / Baseline* | 🔄 *前回予定を重ねるか / Baseline* | 🔄 *`JDG-3434`* |
| 🔄 *`K-141`* | 🔄 *`fitSpan`* | 🔄 *全体表示時の期間 / Fit Span* | 🔄 *全体表示期間 / Fit Span* | 🔄 *`JDG-3376`（Fit Span は全体表示期間）* |
| 🔄 *`K-142`* | 🔄 *`isFixed`* | 🔄 *全体表示時の期間を固定する / Fix the fit span* | 🔄 *全体表示期間を固定する / Fix the fit span* | 🔄 *`JDG-3376`* |
| 🔄 *`K-122`* | 🔄 *`isPlanBarVisible`* | 🔄 *予定の表示 / Plan* | 🔄 *予定バー / Plan Bar* | 🔄 *キーは Plan Bar（`JDG-3382`）。画面の語 `planBar` は「予定バー」。ほかの欄（担当ラベル・依存線・イナズマ線）も描く物の名* |
| 🔄 *`K-123`* | 🔄 *`isActualBarVisible`* | 🔄 *実績の表示 / Actual* | 🔄 *実績バー / Actual Bar* | 🔄 *同じ* |
| 🔄 *`K-67`* | 🔄 *`dayWidthPx`* | 🔄 *横のズーム倍率 / Horizontal Zoom* | 🔄 *1 日の幅 / Day Width* | 🔄 *値は倍率でなく、1 日の幅の px（`JDG-3292`）。推奨: 1 日の幅。欄が倍率を見せるなら、別の行で問う* |
| 🔄 *`K-83`* | 🔄 *`isGroupGridLinesVisible`* | 🔄 *グループ罫線（TaskGroup 境界の横線）* | 🔄 *グループ罫線（タスクグループ境界の横線）* | 🔄 *日本語の名に、英語の型の名が入っている* |
| 🔄 *`K-110`* | 🔄 *`pinnedTaskGroupIds`* | 🔄 *ピン止めの対象 / Pinned Task Groups* | 🔄 *ピン止めしたタスクグループ / Pinned Task Groups* | 🔄 *画面の語 `pinnedTaskGroup`（`U-46`）と同じ名* |
| 🔄 *`K-144`* | 🔄 *`viewTimeZone`* | 🔄 *本プロジェクトの基準タイムゾーン / Project Base Time Zone* | 🔄 *表示の基準タイムゾーン / Display Base Time Zone* | 🔄 *キーは「見せる」時計（`S-574` の「見せる基準」）。スケジュールデータの時計は `scheduleDataTimeZone` で、別の物* |
| 🔄 *`K-86`* | 🔄 *`lastImportNumber`（Part 8）* | 🔄 *取り込みの連番 / importSequence* | 🔄 *取り込みの連番 / Last Import Number* | 🔄 *英語の名が、α のキーのまま（CHOICE N8 で改名した）* |

🔄 *（名の「|」は、問 6-8-2 のとおり除いて書きました。）*

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *表の案で直す。`display-words.json` の名と辞書の名を、同じ字にそろえる（`CR-857`）* |
| 🔄 *b* | 🔄 *行ごとに直す所を書く* |
| 🔄 *c* | 🔄 *今のまま（画面の語のパートで問い直す）* |

##### 🔄 *問 6-12-2. 前の席が付けた名 —— 開いた時の位置とタイムゾーンの 12 語*

回答:

🔄 *場面: スケジュール文書を開いたときにビューがどこから始まるかと、追加の時計に、12 語の名があります。*

- 🔄 *12 語とも、名を言った裁定の行は 0 です。*
- 🔄 *表示の位置の 4 つは、前の席が 1 つの入れ物 `scrollPosition` にまとめました（`doc-shape-choices.md` の CHOICE N4。値でない状態の語 `notDecided` は `JDG-3302`・`JDG-3309`）。*
- 🔄 *日本語の名（画面の欄の名 `K-69`・`K-70`・`K-120`・`K-121`）は、利用者が書いた今の名です。*

| 🔄 *#* | 🔄 *キー* | 🔄 *前の名* | 🔄 *日本語の名（画面）* | 🔄 *意味（日本語）* | 🔄 *決めた所* | 🔄 *MSPDI の名* |
|---|---|---|---|---|---|---|
| 🔄 *10* | 🔄 *&emsp;+- `placed`（持ち主 `scrollPosition`）* | 🔄 *（無し）* |  | 🔄 *ほかのキーが場所を与える。* | 🔄 *席が値の名を付けた* | 🔄 *無し* |
| 🔄 *11* | 🔄 *`leftEdgeDay`* | 🔄 *`scrollDate`* | 🔄 *表示の\|左端が\|指す\|日付* | 🔄 *ビューの左の端にある日。* | 🔄 *CHOICE N4* | 🔄 *無し* |
| 🔄 *12* | 🔄 *`leftEdgeDayFraction`* | 🔄 *`scrollDateFraction`* | 🔄 *表示の\|左端が\|指す\|日の\|どこに\|あるか* | 🔄 *左の端が leftEdgeDay の中のどこにあるか。その日の割合で表し、0 は日の始まり。* | 🔄 *CHOICE N4・`JDG-3297`（Fraction）* | 🔄 *無し* |
| 🔄 *13* | 🔄 *`topEdgeTaskGroupId`* | 🔄 *`scrollTaskGroupId`* | 🔄 *表示の\|上端が\|指す\|タスクグループ* | 🔄 *ビューの上の端にあるタスクグループ。そのタスクグループが消えたら、scrollPosition は notDecided になる。* | 🔄 *CHOICE N4* | 🔄 *無し* |
| 🔄 *14* | 🔄 *`topEdgeTaskGroupFraction`* | 🔄 *`scrollTaskGroupFraction`* | 🔄 *表示の\|上端が\|指す\|タスクグループの\|どこに\|あるか* | 🔄 *上の端がそのタスクグループの中のどこにあるか。タスクグループの 1 段分（タスクグループレーンの高さと下の隙間）に対する割合でこの位置を表し、0 はタスクグループレーンの上の端。* | 🔄 *CHOICE N4・`JDG-3297`* | 🔄 *無し* |
| 🔄 *15* | 🔄 *`scrollPosition`* | 🔄 *（無し。4 つを平らに持った）* |  | 🔄 *スケジュール文書を開いたときにビューがどこから始まるか。notDecided は GRS に選ばせ、placed は左の端の日と上の端のタスクグループを与える。* | 🔄 *CHOICE N4* | 🔄 *無し* |
| 🔄 *16* | 🔄 *`isFixed`* | 🔄 *`isFitSpanFixed`* | 🔄 *全体表示時の\|期間を\|固定する（→ 問 6-12-1）* | 🔄 *真なら、GRS は全体表示と PNG・SVG の書き出しで、描くものすべての代わりに全体表示期間を出す。スケジュール文書を開くとき、GRS はビューを全体表示期間へ動かす手順を省く。（直した。前は「全体表示時の期間」`JDG-3376`）* | 🔄 *所見 F54（`fitSpan` の中へ入れた）* | 🔄 *無し* |
| 🔄 *21* | 🔄 *`offset`（持ち主 `viewTimeZone`）* | 🔄 *（無し）* |  | 🔄 *GRS がスケジュールキャンバスを出す UTC オフセット。* | 🔄 *所見 F13* | 🔄 *無し* |
| 🔄 *23* | 🔄 *`offset`（持ち主 `displayTimeZones`）* | 🔄 *（無し）* |  | 🔄 *この追加の時計の UTC オフセット。* | 🔄 *所見 F13* | 🔄 *無し* |
| 🔄 *24* | 🔄 *`observance`* | 🔄 *（無し）* |  | 🔄 *この時計が、標準時のゾーン名か夏時間のゾーン名かを選ぶ。この値は GRS が出すゾーンの名前を選ぶだけで、GRS は 1 年中オフセットそのものを使う。* | 🔄 *所見 F13（略称の行を選ぶ）* | 🔄 *無し* |
| 🔄 *25* | 🔄 *&emsp;+- `standard`（持ち主 `observance`）* | 🔄 *（無し）* |  | 🔄 *そのオフセットの標準時のゾーン。* | 🔄 *所見 F13* | 🔄 *無し* |
| 🔄 *26* | 🔄 *&emsp;+- `daylight`（持ち主 `observance`）* | 🔄 *（無し）* |  | 🔄 *そのオフセットの夏時間のゾーン。* | 🔄 *所見 F13* | 🔄 *無し* |

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *`leftEdgeDay`（ビューの左端の日）・`leftEdgeDayFraction`・`topEdgeTaskGroupId`・`topEdgeTaskGroupFraction`・`scrollPosition`・`placed`・`isFixed`・`offset`・`observance`・`standard`・`daylight` を、表の意味のとおり採る。根拠: この値は標準時か夏時間かを選ぶもので、季節ではない。iCalendar（RFC 5545）は、この 2 つを observance と呼ぶ* |
| 🔄 *b* | 🔄 *`observance` の代わりに `season` を使い、ほかは a と同じにする。根拠: 日常の語で、標準時か夏時間かを思い浮かべやすい* |
| 🔄 *c* | 🔄 *直す所を、キーと意味で書く* |

##### 🔄 *問 6-12-0. Part 12 の残りの 27 語 —— 表のとおりでよいか*

回答:

🔄 *直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|---|
| 🔄 *1* | 🔄 *<span style="color: #0550AE">`fontSizeStep`</span>* | 🔄 *文字サイズ* | 🔄 *スケジュールキャンバスの文字の大きさの段。small・medium・large で、displayScalePercent が 100 のとき 7.5・8.75・10 CSS ピクセル。GRS はスケジュール文書をこの段で開く。段を変えた読み手は、スケジュール文書を編集したことになる。（`JDG-3295`）* | 🔄 *無し* |
| 🔄 *2* | 🔄 *&emsp;+- <span style="color: #0550AE">`small`</span>（持ち主 `fontSizeStep`）* |  | 🔄 *displayScalePercent が 100 のとき 7.5 CSS ピクセルの文字。（`JDG-3295`）* | 🔄 *無し* |
| 🔄 *3* | 🔄 *&emsp;+- <span style="color: #0550AE">`medium`</span>（持ち主 `fontSizeStep`）* |  | 🔄 *displayScalePercent が 100 のとき 8.75 CSS ピクセルの文字。（`JDG-3295`）* | 🔄 *無し* |
| 🔄 *4* | 🔄 *&emsp;+- <span style="color: #0550AE">`large`</span>（持ち主 `fontSizeStep`）* |  | 🔄 *displayScalePercent が 100 のとき 10 CSS ピクセルの文字。（`JDG-3295`）* | 🔄 *無し* |
| 🔄 *5* | 🔄 *<span style="color: #0550AE">`dayWidthPx`</span>* | 🔄 *横の\|ズーム\|倍率* | 🔄 *時間軸の上の暦日 1 日の幅。値は displayScalePercent が 100 のときの CSS ピクセルで表す。全体表示をすると、GRS は描くものすべて（または固定した全体表示期間）がタスクグループレーンの幅に収まるようにこの値を決める。（→ 問 6-12-1）（`JDG-3292`）* | 🔄 *無し* |
| 🔄 *6* | 🔄 *<span style="color: #0550AE">`verticalZoomRatio`</span>* | 🔄 *縦の\|ズーム\|倍率* | 🔄 *タスク図形の縦の大きさの、既定の大きさに対する比。1 が既定の大きさで、2 では予定バー・実績バー・名称ラベルを 2 倍の高さで描く。（`JDG-3296`）* | 🔄 *無し* |
| 🔄 *7* | 🔄 *<span style="color: #0550AE">`taskGroupAutoExpandDepth`</span>* |  | 🔄 *treeState が auto のタスクグループを、どの深さまで開くか。最上位のタスクグループが深さ 1。値が N のとき、GRS は深さ N までのタスクグループを開き、深さ N + 1 までの行を出す。0 のとき、GRS は最上位のタスクグループだけを閉じた形で出す。（`JDG-3296`）* | 🔄 *無し* |
| 🔄 *8* | 🔄 *`kind`（持ち主 `scrollPosition`）* |  | 🔄 *notDecided: GRS がスケジュール文書を開くときに場所を選ぶ。placed: ほかのキーが場所を与える。* | 🔄 *無し* |
| 🔄 *9* | 🔄 *&emsp;+- <span style="color: #0550AE">`notDecided`</span>（持ち主 `scrollPosition`）* |  | 🔄 *GRS がスケジュール文書を開くときに場所を選ぶ。（`JDG-3302`・`JDG-3309`）* | 🔄 *無し* |
| 🔄 *17* | 🔄 *<span style="color: #0550AE">`fitSpan`</span>* | 🔄 *全体表示時の\|期間* | 🔄 *全体表示期間。firstDay から lastDay まで（両端を含む）の日の範囲で、isFixed が真なら、GRS は全体表示と PNG・SVG の書き出しで、描くものすべての代わりにこれを出す。この値を省くと全体表示期間は未指定になる。（→ 問 6-12-1）（`JDG-3376`）* | 🔄 *無し* |
| 🔄 *18* | 🔄 *`kind`（持ち主 `viewTimeZone`）* |  | 🔄 *sameAsScheduleData: スケジュールデータのタイムゾーンを出し、それが変わればそれに従う。fixed: ここで与えたオフセットを出す。* | 🔄 *無し* |
| 🔄 *19* | 🔄 *&emsp;+- <span style="color: #0550AE">`sameAsScheduleData`</span>（持ち主 `viewTimeZone`）* |  | 🔄 *スケジュールデータのタイムゾーンを出し、それが変わればそれに従う。（`JDG-3302`）* | 🔄 *無し* |
| 🔄 *20* | 🔄 *&emsp;+- `fixed`（持ち主 `viewTimeZone`）* |  | 🔄 *ここで与えたオフセットを出す。* | 🔄 *無し* |
| 🔄 *22* | 🔄 *<span style="color: #0550AE">`viewTimeZone`</span>* | 🔄 *本プロジェクトの\|基準\|タイムゾーン* | 🔄 *タイムルーラーと、出す日時が使うタイムゾーン。sameAsScheduleData は project.scheduleDataTimeZone に従い、fixed はここで与えたオフセットを使う。（→ 問 6-12-1）（`JDG-2691`）* | 🔄 *無し* |
| 🔄 *27* | 🔄 *<span style="color: #0550AE">`displayTimeZones`</span>* | 🔄 *表示する\|タイムゾーン* | 🔄 *最大 4 つの追加の時計。GRS が時刻を出しているあいだ、追加の時計をそれぞれタイムルーラーの下の 1 行として出す。（`JDG-2691`）* | 🔄 *無し* |
| 🔄 *28* | 🔄 *`isTimeOfDayVisible`* | 🔄 *時刻を\|表示する* | 🔄 *GRS がスケジュールキャンバスに時刻を出すかどうか。保存した日時はどちらでも時刻を持ち続ける。新しいスケジュール文書は偽で始まる。* | 🔄 *無し* |
| 🔄 *29* | 🔄 *<span style="color: #0550AE">`isPlanBarVisible`</span>* | 🔄 *予定の表示* | 🔄 *GRS が予定バーを出すかどうか。isActualBarVisible とは別に決める。新しいスケジュール文書は真で始まる。（→ 問 6-12-1）（`JDG-3382`）* | 🔄 *無し* |
| 🔄 *30* | 🔄 *`isPlanDatesVisible`* | 🔄 *名称ラベルに\|添える\|予定日* | 🔄 *GRS が各名称ラベルの右に予定の日時を出すかどうか。新しいスケジュール文書は偽で始まる。* | 🔄 *無し* |
| 🔄 *31* | 🔄 *<span style="color: #0550AE">`isActualBarVisible`</span>* | 🔄 *実績の表示* | 🔄 *GRS が実績バーを出すかどうか。isPlanBarVisible とは別に決める。新しいスケジュール文書は真で始まる。（→ 問 6-12-1）（`JDG-3382`）* | 🔄 *無し* |
| 🔄 *32* | 🔄 *<span style="color: #0550AE">`isPercentCompleteLabelVisible`</span>* | 🔄 *完了率ラベル* | 🔄 *GRS が各タスクの完了率ラベルを出すかどうか。新しいスケジュール文書は偽で始まる。（`JDG-3382`）* | 🔄 *無し* |
| 🔄 *33* | 🔄 *<span style="color: #0550AE">`isBaselineOutlineVisible`</span>* | 🔄 *変更前の\|予定を\|重ねるか* | 🔄 *GRS が前の予定（baselineTasks）を今のタスクに重ねて描くかどうか。新しいスケジュール文書は偽で始まる。（→ 問 6-10-3・問 6-12-1）（`JDG-3382`）* | 🔄 *無し* |
| 🔄 *34* | 🔄 *`isProgressLineVisible`* | 🔄 *イナズマ線* | 🔄 *GRS がイナズマ線を描くかどうか。イナズマ線は、基準日から各タスクのタスク進捗点を通る線。新しいスケジュール文書は偽で始まる。* | 🔄 *無し* |
| 🔄 *35* | 🔄 *<span style="color: #0550AE">`isProgressMarkVisible`</span>* | 🔄 *進捗マーカー* | 🔄 *GRS が進捗マークと再開マークを描くかどうか。遅延診断を出しているあいだは、この値が偽でも進捗マークを描く。新しいスケジュール文書は真で始まる。（→ 問 6-12-1）（`JDG-3382`）* | 🔄 *無し* |
| 🔄 *36* | 🔄 *<span style="color: #0550AE">`isDependencyLineVisible`</span>* | 🔄 *依存線* | 🔄 *GRS が依存線を描くかどうか。新しいスケジュール文書は真で始まる。（`JDG-3382`）* | 🔄 *無し* |
| 🔄 *37* | 🔄 *<span style="color: #0550AE">`isAssigneeLabelVisible`</span>* | 🔄 *担当ラベル* | 🔄 *GRS が各タスクの担当ラベルを出すかどうか。新しいスケジュール文書は偽で始まる。（`JDG-3382`）* | 🔄 *無し* |
| 🔄 *38* | 🔄 *`isDateGridLinesVisible`* | 🔄 *日付罫線\|（日付ごとの\|縦線）* | 🔄 *GRS が縦の日付罫線を描くかどうか。新しいスケジュール文書は偽で始まる。* | 🔄 *無し* |
| 🔄 *39* | 🔄 *`isGroupGridLinesVisible`* | 🔄 *グループ罫線\|（TaskGroup 境界の\|横線）* | 🔄 *GRS が、タスクグループレーンとタスクグループパネルで、タスクグループのあいだにグループ罫線を描くかどうか。新しいスケジュール文書は真で始まる。（→ 問 6-12-1）* | 🔄 *無し* |

🔄 *---*

#### 🔄 *Part 13 / 43 —— GRS JSON / 文書の設定・スケジュールデータと文書の根（39 語）*

🔄 *このパートには、このパートだけの問いを置かない。パートの終わりに、Part をまたぐ名の被りを 1 つの問い（問 6-13-1）にしました。表から外した 8 語は、前のパートの問いで聞いています: #21・#38 は問 6-11-2、#22・#24・#25・#33 は問 6-7-2、#30 は問 6-10-3、#37 は問 6-11-1。*

##### 🔄 *問 6-13-1. 名や数え方が被る語 —— 4 組*

回答:

🔄 *場面: 別々のパートで、同じ字や似た字を使う語が 4 組あります。*

- 🔄 *4 組とも、意味の文が区別を書いています。*

| 🔄 *組* | 🔄 *語（Part の #）* | 🔄 *出る所* | 🔄 *被る点* | 🔄 *名で区別できるか* |
|:---|:---|:---|:---|:---|
| 🔄 *1* | 🔄 *`note`（Part 11 の #36）と `notes`（Part 9 の #2）* | 🔄 *`note` は変更履歴の 1 件の備考（`JDG-3332`）。`notes` はタスクの MSPDI の Notes* | 🔄 *1 字違い。どちらも自由な文字の欄* | 🔄 *区別しにくい。1 字違いで、名は備考かタスクの注かを言わない* |
| 🔄 *2* | 🔄 *`editGroup`（Part 9 の #27）の「group」と、タスクグループ（Part 9 の #30 `TaskGroup`）* | 🔄 *`editGroup` の group は、編集してよい人のグループ。同じ Part 9 の `TaskGroup` の Group は、タスクグループ* | 🔄 *「Group」の字が 2 つの意味を持ち、`editGroup` をタスクグループの名と読める* | 🔄 *区別できない。`editGroup` は、編集してよい人のグループではなく、タスクグループに読める* |
| 🔄 *3* | 🔄 *`levelZeroTreeState` の「段 0」（Part 13 の #7。`JDG-600`・`JDG-2691`）と、`taskGroupAutoExpandDepth` の「深さ」（Part 12 の #7。`JDG-3296`）と、積み段（`JDG-3377`）* | 🔄 *段 0 は最上位のタスクグループの上の頭。深さ 1 は最上位のタスクグループ。Part 12 の #14 は「1 段分」、Part 12 の #1 は「文字の大きさの段」と書く* | 🔄 *タスクグループの階層という 1 つの軸を、「段」と「深さ」の 2 語で数える。「段」は積み段・1 段分・文字の大きさの段にも出る* | 🔄 *区別しにくい。「段」と「深さ」は、同じ軸の別の数え方に見える* |
| 🔄 *4* | 🔄 *`id`（Part 7 の #14）と `id`（持ち主 `Project`、Part 8 の #6）* | 🔄 *前者は GRS の行の UUID。後者は MSPDI の Project/UID の字（`JDG-2683` が受けた形）* | 🔄 *同じキー `id` が 2 つの意味を持つ。持ち主で別の語に分けた* | 🔄 *名だけでは区別できない。持ち主（行か `Project` か）が区別を言う* |

| 🔄 *案* | 🔄 *中身* |
|---|---|
| 🔄 ***a（推奨）*** | 🔄 *今のまま。組 2 は名が曖昧なまま残り、ほかの組は意味の文か持ち主が区別を言う* |
| 🔄 *b* | 🔄 *直す組を書く（組の番号と、新しい名）。例: 組 2 の `editGroup` を `editorGroup`（編集者のグループ）にする。表の意味「編集してよいグループの名前」に合う* |

##### 🔄 *問 6-13-0. Part 13 の残りの 31 語 —— 表のとおりでよいか*

回答:

🔄 *直す所が無ければ ok、直す所は表のセルに ★ で書いてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *日本語の名* | 🔄 *意味（日本語）* | 🔄 *MSPDI の名* |
|---|---|---|---|---|
| 🔄 *1* | 🔄 *`stackDirection`* | 🔄 *積む向き* | 🔄 *up は、タスクが右上のゴールへ登るようにタスクグループのタスクを積む。down は、右下のゴールへ下るように積む。新しいスケジュール文書は up で始まる。* | 🔄 *無し* |
| 🔄 *2* | 🔄 *&emsp;+- `up`（持ち主 `stackDirection`）* |  | 🔄 *タスクが右上のゴールへ登るように積む。* | 🔄 *無し* |
| 🔄 *3* | 🔄 *&emsp;+- `down`（持ち主 `stackDirection`）* |  | 🔄 *タスクが右下のゴールへ下るように積む。* | 🔄 *無し* |
| 🔄 *4* | 🔄 *`isThemeMonochrome`* | 🔄 *モノクロに\|するか* | 🔄 *テーマがモノクロかどうか。新しいスケジュール文書は偽で始まる。* | 🔄 *無し* |
| 🔄 *5* | 🔄 *`taskGroupPanelWidthPx`* | 🔄 *タスク\|グループパネルの\|幅* | 🔄 *タスクグループパネルの幅。値は displayScalePercent が 100 のときの CSS ピクセルで表す。* | 🔄 *無し* |
| 🔄 *6* | 🔄 *`isTaskGroupPanelWidthFixed`* | 🔄 *タスクグループ\|パネルの\|幅を\|固定する* | 🔄 *taskGroupPanelWidthPx の数が、パネル境界のドラッグの代わりにタスクグループパネルの幅を決めるかどうか。新しいスケジュール文書は偽で始まる。* | 🔄 *無し* |
| 🔄 *7* | 🔄 *<span style="color: #0550AE">`levelZeroTreeState`</span>* | 🔄 *段 0 の\|木の\|状態* | 🔄 *タスクグループパネルの頭（段 0）、つまり最上位のすべてのタスクグループの上の状態。collapsed は GRS がすべてのタスクグループの描画を省く。新しいスケジュール文書は auto で始まる。（`JDG-600`・`JDG-2691`）* | 🔄 *無し* |
| 🔄 *8* | 🔄 *&emsp;+- `auto`（持ち主 `levelZeroTreeState`）* |  | 🔄 *最上位のタスクグループを描く。* | 🔄 *無し* |
| 🔄 *9* | 🔄 *&emsp;+- `collapsed`（持ち主 `levelZeroTreeState`）* |  | 🔄 *GRS はすべてのタスクグループの描画を省く。* | 🔄 *無し* |
| 🔄 *10* | 🔄 *`pinnedTaskGroupIds`* | 🔄 *ピン止めの\|対象* | 🔄 *ピン止めしたタスクグループ。遠くのタスクグループと比べるために、タスクグループレーンの上にまとまって残るタスクグループ。この値を省くとピン止めしたタスクグループは 0 件。（→ 問 6-12-1）* | 🔄 *無し* |
| 🔄 *11* | 🔄 *`isScheduleFilterApplied`* |  | 🔄 *この表のスケジュールフィルターが掛かっているかどうか。掛かっているあいだ、GRS はこの表のチェックの入った行が選ぶタスクだけを描く。新しいスケジュール文書は偽で始まる。* | 🔄 *無し* |
| 🔄 *12* | 🔄 *`shownTaskUids`* |  | 🔄 *この表の表示の列にチェックが入った行のタスク。この値を省くとチェックの入った行は 0 件。* | 🔄 *無し* |
| 🔄 *13* | 🔄 *`columnFilters`* |  | 🔄 *この表の列のフィルタ。フィルタを掛けた列ごとに 1 つ、この表の列の名前で持つ。この値を省くとフィルタを掛けた列は 0 件。* | 🔄 *無し* |
| 🔄 *14* | 🔄 *`sort`* |  | 🔄 *GRS がこの表をどう並べるか。この値を省くと既定の並び。* | 🔄 *無し* |
| 🔄 *15* | 🔄 *`shownResourceUids`* |  | 🔄 *この表の表示の列にチェックが入った行の担当。この値を省くとチェックの入った行は 0 件。* | 🔄 *無し* |
| 🔄 *16* | 🔄 *`isUnassignedShown`* |  | 🔄 *担当リストウィンドウの（担当なし）の行にチェックが入っているかどうか。新しいスケジュール文書は偽で始まる。* | 🔄 *無し* |
| 🔄 *17* | 🔄 *<span style="color: #0550AE">`searchWindow`</span>（持ち主 `tableViews`）* |  | 🔄 *検索ウィンドウの表をどう出すか。スケジュールフィルター、チェックした行、列のフィルタ、並べ替え。（`JDG-3383`）* | 🔄 *無し* |
| 🔄 *18* | 🔄 *<span style="color: #0550AE">`delayDiagnosisReportWindow`</span>（持ち主 `tableViews`）* |  | 🔄 *遅延診断レポートウィンドウの表をどう出すか。スケジュールフィルター、チェックした行、列のフィルタ、並べ替え。（`JDG-3383`）* | 🔄 *無し* |
| 🔄 *19* | 🔄 *<span style="color: #0550AE">`resourceListWindow`</span>（持ち主 `tableViews`）* |  | 🔄 *担当リストウィンドウの表をどう出すか。スケジュールフィルター、チェックした行、列のフィルタ、並べ替え。（`JDG-3383`）* | 🔄 *無し* |
| 🔄 *20* | 🔄 *`tableViews`* |  | 🔄 *GRS が 3 つの表をどう出すか。検索ウィンドウ、遅延診断レポートウィンドウ、担当リストウィンドウ。* | 🔄 *無し* |
| 🔄 *23* | 🔄 *`tasks`* |  | 🔄 *MSPDI の Tasks と同じ。ただし Task.parentTaskUid と Task.siblingOrder が WBS の木を与える。GRS は MSPDI を書くたびに、その木から ID・OutlineLevel・OutlineNumber・Summary を作る。* | 🔄 *Tasks* |
| 🔄 *26* | 🔄 *`taskGroups`* |  | 🔄 *タスクグループ。GRS はそれぞれをタスクグループパネルの 1 行と 1 つのタスクグループレーンとして出す。どのタスクグループがどのタスクを持つかは taskGroupMembers が言う。MSPDI のファイルを読むとき、GRS は WBS からタスクグループを作る。* | 🔄 *無し* |
| 🔄 *27* | 🔄 *`taskGroupMembers`* |  | 🔄 *各タスクがどのタスクグループに入るか。タスクごとに 1 つ、taskUid から taskGroupId への対応。* | 🔄 *無し* |
| 🔄 *28* | 🔄 *<span style="color: #0550AE">`taskGraphicStyles`</span>* |  | 🔄 *GRS が各タスクのタスク図形をどう描くか（形、色、バーの輪郭の太さ）。タスクごとにちょうど 1 つ。（`JDG-3384`）* | 🔄 *無し* |
| 🔄 *29* | 🔄 *`taskOrigins`* |  | 🔄 *取り込んだ MSPDI のファイルから来たタスクごとの 1 つの記録。どの MSPDI のファイルの、そのファイルのどのタスクか。GRS が後で同じ MSPDI のファイルを取り込んだとき、写しを足す代わりにそのタスクを更新するために、GRS はこの記録を持つ。記録を持つのは、取り込んだタスクだけである。* | 🔄 *無し* |
| 🔄 *31* | 🔄 *`commentBoxes`* |  | 🔄 *タスクグループレーンの中のコメントボックス。各コメントボックスは、タスク・ハイライトボックス・自由点のどれかを指す。* | 🔄 *無し* |
| 🔄 *32* | 🔄 *`highlightBoxes`* |  | 🔄 *ハイライトボックス。タスクグループレーンの中で、日の範囲とタスクグループの範囲を示す矩形。GRS は各ハイライトボックスを枠か塗りか両方で描く。* | 🔄 *無し* |
| 🔄 *34* | 🔄 *<span style="color: #0550AE">`scheduleData`</span>* | 🔄 *<span style="color: #0550AE">スケジュールデータ</span>* | 🔄 *スケジュールデータ。MSPDI 由来の部分（GRS が MSPDI へ書き出す）と、GRS 独自の部分（GRS だけが使う）。（`JDG-3380`・`JDG-3353`）* | 🔄 *無し* |
| 🔄 *35* | 🔄 *`schemaVersion`（持ち主 `ScheduleDocument`）* |  | 🔄 *この GRS JSON スキーマの形が最後に変わった UTC の時刻（YYYY-MM-DDTHH:MM:SSZ）。* | 🔄 *無し* |
| 🔄 *36* | 🔄 *<span style="color: #0550AE">`buildVersion`</span>* |  | 🔄 *この GRS JSON のファイルを書いた GRS のビルドの時刻（UTC、YYYY-MM-DDTHH:MM:SSZ）。この値は不具合を調べるためだけのもので、GRS JSON のファイルが読めるかを確かめるには schemaVersion を使う。（`JDG-3324`・`JDG-3335`）* | 🔄 *無し* |
| 🔄 *39* | 🔄 *`ScheduleDocument`* | 🔄 *<span style="color: #0550AE">スケジュール文書</span>* | 🔄 *スケジュール文書: 1 つの GRS JSON のファイル。根に、スキーマの所、スキーマの版、ビルドの版、スケジュールデータ、文書の設定、文書の刻印、変更ログを持つ。（→ 問 6-11-1・問 6-11-2）（`JDG-3353`）* | 🔄 *無し* |

## 自由欄

答えを読んで、ほかに聞きたいこと・違うと思う所があれば、ここに書いてください。

回答: 時間と色とか事らなる概念を一緒に出すな。 量が多くて混乱する。 分野別に順に裁定する。 優先度を考えてGQAを持ってこい。
