BGQA3
# GRS JSON の名（名の辞書 3）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA3 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

2026-11-15 に作った。BGQA2（名の辞書）が大きくなりすぎたので、あなたの指示で約束の面ごとに分けた（`JDG-3568`）。この紙は GRS JSON の名を受け持つ。文書の命令は BGQA4、Agent API は BGQA5 が受け持ち、GRS JSON の名が決まった後に出す。決まりと、これまでの決定事項は BGQA2（`goodrelax-qa-b2-glossary.md`）にある。

残 3（❓ で検索）

1 回目は、ほかの名に効く 10 問です: キーの付け方の決まり、根の並びと呼び名、順番の数、色の形、MSPDI と違う名を保つかの 2 問。残りの GRS JSON の問い（21）は、答えの後で 10 問前後ずつ出します。

2026-11-15 の 2 回目: 1 回目のあなたの答えで 4 問が決まりました（`JDG-3569`・`JDG-3602`〜`JDG-3604`）。説明と例を求めた問いは、JSON の例をコードブロックに入れて書き直しました。新しく、パレットの paper と ink（問 6-6-4-12）、タイムゾーンの置き場（問 6-8-19）、キーの付け方の決まり（問 6-8-6）、画面の欄の名（問 6-13-2）、MSPDI の名と違う語（問 6-9-5・6-7-7）を足しました。

2026-11-15 の 3 回目: あなたの求めに合わせ、GRS JSON の構造図と分け方の考え（問 6-13-3）を、問いの先頭に置きました。ほかの問いは 2 回目のままです。

2026-11-15 の 4 回目: 問 6-13-3 に、15 か所の GRS だけの値を 1 つずつ照らした根拠の表を足し、問 6-8-19 をそこへまとめました。ほかの問いは 2 回目のままです。

2026-11-15 の 5 回目: 問 6-13-3 が決まり（`JDG-3605`）、プロパティの名を併記した構造図に描き直しました。新しく、Project から移す 7 つの値の入れ物の名（問 6-13-4）を問います。

2026-11-15 の 6 回目: あなたの指示「影響が大きいものだけ最初に問え」に従い、ほかの名や形に広く効く 6 問だけを、影響の大きい順に出します: 持ち越しの形（問 6-7-8）、`ordinal` の 4 つの役目（問 6-7-6）、キーに持ち主の名を繰り返さない決まり（問 6-8-6）、色の形の 3 問（問 6-6-4-10・6-6-4-11・6-6-4-8）。1 つの名だけに効く 7 問は、出す前の置き場へ戻しました。

2026-11-17 の 7 回目: 3 問が決まりました（`JDG-3606`〜`JDG-3608`）。続きを求めた 3 問に答えました: `ordinal` は JSON から無くせること（問 6-7-6）、命名の決まりと例外（問 6-8-6）、`allOf` の意味と JSON のデータ（問 6-6-4-11。推奨を b に改めた）。構造図は、残りの 3 問が決まった後に、まとめて描き直します。

2026-11-17 の 8 回目: 3 問の方向が決まりました（`JDG-3609`〜`JDG-3611`）。あなたの求めに合わせて、続きの 3 問を出します: 持ち越した一覧の要素の置き場（問 6-7-9）、MSPDI の `Type` を写す 3 つの名（問 6-8-7。前回の E-6 の一覧の誤りも直した）、コメントボックスの文字の見た目の名（問 6-6-4-13）。

2026-11-17 の 9 回目: 文字の見た目が決まりました（`JDG-3612`）。問 6-7-9 は他の AI への質問状の答えを待ちます。MSPDI の `Type` を写す 3 つは、MSPDI の名を最大限に尊重する案を足して問い直します（問 6-8-8）。

🔄 *2026-11-17 の 9 回目（追記）: 問 6-7-9 に、他の AI 3 つの答えと、それを受けた私の案を足しました。あなたの確認（違う種類の実体を指さないか、OKPN）を受けて、一覧ごとに配列とキーを分ける形を推奨にしました。*

***

## 決定事項

### [proj] プロジェクト

| 何 | 決め | 裁定 |
|:---|:---|:---|
| プロジェクトの 23 語（問 6-8-5） | 表のとおり確定（8-6 `uid`・8-8 `name`・8-9 `title`・8-10〜8-18・8-20〜8-25・8-31〜8-35）。8-19 `scheduleDataTimeZone` は名だけ確定し、置き場を問 6-8-19 で問う | `JDG-3569` |
| GRS JSON の命名の決まり（問 6-8-6） | 決まり N-1〜N-12 と例外の決まり X-1〜X-4 を採る。例外 E-1・E-2・E-4・E-5 を採る。E-3・E-6 は問 6-8-7 | `JDG-3609` |

### [root] スケジュールデータと文書の根

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 似た字と根の並び（問 6-13-1） | `note` → `remarks`、`levelZeroTreeState` → `rootTreeState`（階層は「深さ」で数える）。根の並びは `$schema`・`schemaVersion`・`buildVersion`・`documentSettings`・`scheduleData`・`documentStamp`・`changeLogEntries` | `JDG-3602` |
| 根の 3 つの部分の呼び名（問 6-11-1） | 「文書刻印」「文書設定」「変更履歴」 | `JDG-3603` |
| GRS JSON の構造と分け方（問 6-13-3） | 1 文書 1 JSON。根を形の版・見せ方・中身・帳簿に分け、中身を MSPDI と往復する群と GRS だけの群に分ける。往復する群の実体に置くのは、その実体のことを言い、かつ MSPDI と往復する値だけ。Project の GRS だけの値 7 つを GRS の群の 1 つの物へ移す（名は問 6-13-4） | `JDG-3605` |

### [key] 共通のキー

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 持ち越しの形（問 6-7-8） | 各実体の `passthrough` 1 つに、MSPDI の構造と要素の名のまま持つ。繰り返せる要素はいつも配列。`ordinal` は持たず、書き出しは XSD の順と配列の順 | `JDG-3606` |
| `ordinal`（問 6-7-6） | JSON から `ordinal` を無くす方向。順は配列で持ち、例外の行の鍵は GRS の中だけで持つ。持ち越した一覧の要素の位置のキーは問 6-7-9 | `JDG-3611` |

### [color] 色

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 線と塗りの形（問 6-6-4-10） | 塗りは `fill`（`Paint { color, opacityPercent }`）、線は `stroke`（`Stroke { color, opacityPercent, widthPx }`）。線を描かないときは太さも書かない | `JDG-3607` |
| テーマの色の役割（問 6-6-4-8） | 置き場が役割を決め、値には `{"type": "theme"}` だけを書く | `JDG-3608` |
| 見た目の型（問 6-6-4-11） | `ShapeStyle { fill, stroke }` を 3 つの見た目で共にし、型ごとの足しを `allOf` で書く。文字の見た目は `style` の中の 1 つの物にまとめる（名は問 6-6-4-13） | `JDG-3610` |
| 文字の見た目（問 6-6-4-13） | コメントボックスの文字の見た目は `style.font { color, sizePx }`。書体が要るときは `family` を足す | `JDG-3612` |

### [task] タスクと依存

| 何 | 決め | 裁定 |
|:---|:---|:---|
| `dependencies`（問 6-9-8） | `predecessorLinks`、型は `PredecessorLink`。日程の考えの語「依存」は今のまま | `JDG-3604` |

### [tg] タスクグループ

この分野で決まった語は、答えの後でここに書きます。

***

## QA

表の読み方:

- 青い字は、前に裁定した名です。キーの欄が青ければキーの名を、日本語の名の欄が青ければ日本語の名を、裁定が決めました。裁定の番号は意味の欄の最後にあります。
- 表の # は「パート - パートの中の番号」です。番号が飛んでいる所の語は、ほかの問いで聞くか、もう決まっています。
- MSPDI の名の欄の「無し」は、GRS が自分で付けた名です（MSPDI に同じ要素が無い）。
- 表を見る問いでは、直す所が無ければ ok と書き、直す所は表のセルに ★ で書いてください。

### [key] 共通のキー（❓ 1）

#### ✅ 問 6-7-8. 持ち越しの形 —— MSPDI の構造とキーのまま持つか

決まりました（`JDG-3606`）。答えは決定事項にあります。

#### ✅ 問 6-7-6. `ordinal` —— JSON から無くしてよいか

決まりました（`JDG-3611`）。JSON から `ordinal` を無くす方向が決まりました。位置を言うキーの名と、指す先が消えたときの決まりは、すぐ下の問 6-7-9 で問います。

#### 🔄 *❓ 問 6-7-9. 持ち越した一覧の要素の置き場 —— 位置のキーの名と意味、消えたときと動かしたときの決まり*

🔄 *場面: 他の AI 3 つ（Gemini 2 つ・Copilot）の答えが集まりました。名と決まりの穴を、次のように指摘しています。*

| 🔄 *指摘* | 🔄 *出した AI* |
|:---|:---|
| 🔄 *名は `precedingEntityUid`（「実体」を名に入れる）。`element` は `mspdiElement` か `rawElement` がよい* | 🔄 *Gemini 2・Copilot* |
| 🔄 *`preceding` は XPath で「前にあるもの全部」の意味で、「直前の 1 つ」なら `previousEntityUid` が正確* | 🔄 *Copilot* |
| 🔄 *預かる要素が続くと、参照の鎖になる。同じ先を指す要素が 2 つ、自分を指す、輪になる、の決まりが要る* | 🔄 *Copilot・Gemini 2* |
| 🔄 *タスクを動かしたとき、預かる要素が元の席に残るのか、指す先に付いて行くのかを先に決めよ* | 🔄 *Copilot* |
| 🔄 *WBS の枝ごと動かしたとき、中の預かる要素が枝の外へはじき出されないようにせよ* | 🔄 *Gemini 1* |
| 🔄 *指す先は同じ一覧の中に限ると書け。uid の型（数か文字か）をそろえよ* | 🔄 *Gemini 1・Copilot* |
| 🔄 *UID 0 の要約タスクを先頭に置くのは、MSPDI 全体の決まりでなく GRS の決まりとして書け* | 🔄 *Copilot* |

🔄 ***一覧ごとに分ける理由（あなたの確認「precedingEntityUidの対象は違う種類の実体を指さないよね？ … そうしないとOKPN 違反だろ？」を受けて）:** 1 つの配列に `collection` を添える形では、同じ名 `precedingEntityUid` が、`collection` の値によってタスクの uid にも担当の uid にもなります（`OKPN` に触れる）。一覧ごとに配列とキーを分ければ、キーが指す種類を名で言えます（N-5）。MSPDI の一覧は種類ごとに分かれているので、タスクの前に担当が並ぶこともありません。*

🔄 ***私の見立て:** 指摘の大半は、指す先を「直前の要素（預かる要素も含む）」と決めたことから生まれます。指す先を「GRS が自分の配列に持つ実体」に限れば、鎖も輪も自分を指すことも起きません。*

🔄 *例（MSPDI の `<Tasks>` の並び）:*

```text
🔄 タスク 12 → 空タスク 13 → 空タスク 15 → タスク 14 → UID の無い要素
```

🔄 *下のコードブロックの 1・2・3・4・5・6 行目が変わった。*
```json
"tasks": [ { "uid": 12, "name": "設計" }, { "uid": 14, "name": "実装" } ],
"passthroughTasks": [
  { "precedingTaskUid": 12, "mspdiElement": { "UID": "13", "IsNull": "1" } },
  { "precedingTaskUid": 12, "mspdiElement": { "UID": "15", "IsNull": "1" } },
  { "precedingTaskUid": 14, "mspdiElement": { "Name": "…" } }
]
```

- 🔄 *空タスク 13 と 15 は、どちらもタスク 12 を指します。同じ先を指す要素どうしは、配列の順（13 → 15）で戻します。鎖が無いので、輪も自分を指すことも起きません。*
- 🔄 *UID の無い要素も、前のタスク 14 を指せます（直前の要素を指す形では、UID の無い要素を指せません）。*
- 🔄 *`precedingTaskUid` は GRS の数の uid（N-6）で、`tasks[].uid` と同じ型です。`mspdiElement` の中は MSPDI の文字のまま（`JDG-3606`）で、比べる相手になりません。*

🔄 ***動かしたとき:** 預かる要素は、指す先のタスクに付いて行きます。MS Project の空タスクは、見た目の区切りとして、前のタスクと組で置かれることが多いからです。WBS の枝ごと動かしても、中の要素は枝の中のタスクを指したまま、一緒に動きます（Gemini 1 の指摘が自然に解ける）。席に残す形（Copilot の解釈 A）は、動かすたびに書き換えが要り、枝ごと動かすときにはじき出しが起きます。*

🔄 ***決まりの案:***

| 🔄 *#* | 🔄 *場面* | 🔄 *決まり* |
|:---|:---|:---|
| 🔄 *1* | 🔄 *指す先* | 🔄 *同じ一覧の中で、この要素より前にある、GRS が自分の配列に持つ実体のうち、いちばん近いものの uid（タスクの一覧ならタスクの uid だけ）。前に何も無ければ、キーを書かない（先頭に戻す）* |
| 🔄 *2* | 🔄 *同じ先を指す要素が 2 つ以上* | 🔄 *配列の順で戻す* |
| 🔄 *3* | 🔄 *GRS でタスクを動かす* | 🔄 *書き換えない。指す先に付いて行く* |
| 🔄 *4* | 🔄 *GRS でタスクを消す* | 🔄 *同じ命令の中で、そのタスクを指す要素の `precedingTaskUid` を、消したタスクの指す先（さらに前の、GRS が持つ実体）に書き換える。無ければキーを消す。1 回の取り消しで戻る* |
| 🔄 *5* | 🔄 *開いたファイルで指す先が無い* | 🔄 *文書は開く。その要素を一覧の末尾に置き、知らせる* |
| 🔄 *6* | 🔄 *Tasks の UID 0 の要約タスク* | 🔄 *GRS の決まりとして、いつも一覧の先頭に戻す（`MR-4`）。MSPDI 全体の決まりとは書かない* |

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *一覧ごとに配列とキーを分ける: `passthroughTasks[] { precedingTaskUid, mspdiElement }`・`passthroughResources[] { precedingResourceUid, … }`・`passthroughAssignments[] { precedingAssignmentUid, … }`・`passthroughCalendars[] { precedingCalendarUid, … }`。置き場はスケジュールデータの GRS だけの群。決まりは上の表 1〜6。キーが指す種類を名で言い（N-5・`OKPN`）、`collection` の欄が要らない。各実体の `passthrough`（`JDG-3606`）とは名で分かれる* |
| 🔄 *b* | 🔄 *1 つの配列 `passthroughEntities[] { collection, precedingEntityUid, mspdiElement }`。決まりは同じ。配列は 1 つで済むが、`precedingEntityUid` が `collection` の値によって違う種類の uid になる* |
| 🔄 *c* | 🔄 *位置のキーを `previousEntityUid`（直前の 1 つ。預かる要素も含む）にする。鎖・同じ先・輪・自分を指す、の決まりを足す。UID の無い要素は指せない* |
| 🔄 *d* | 🔄 *a の形のまま、動かしたときは元の席に残す（動かすたびに、前のタスクを指すよう書き換える）* |

回答:

### [proj] プロジェクト（❓ 1）

#### ✅ 問 6-8-5. プロジェクトの 24 語 —— 推奨の表のとおりでよいか

決まりました（`JDG-3569`）。答えは決定事項にあります。

#### ✅ 問 6-8-19. スケジュールデータのタイムゾーンの置き場 —— MSPDI に無い値を、MSPDI の実体の中に置くか、GRS の群へ移すか

問 6-13-3 にまとめました（15 か所の根拠の表と、移す範囲の案 a〜c）。

#### ✅ 問 6-8-6. GRS JSON の命名の決まり —— この決まりと例外でよいか

決まりました（`JDG-3609`）。決まり N-1〜N-12 と例外の決まり X-1〜X-4 を採りました。E-3 と E-6 は、すぐ下の問 6-8-7 で問い直します。

#### ✅ 問 6-8-7. MSPDI と名が違う、MSPDI 由来のキー —— 1 つずつ比べて選ぶ

あなたの問い「MSPDIの名称を最大限に尊重したらどうなる？」に、すぐ下の問 6-8-8 で答えます。

#### ❓ 問 6-8-8. MSPDI の `Type` を写す 3 つ —— MSPDI の名を最大限に尊重したらどうなるか

場面: 前回、あなたは「全体構造がわからんが、 xxx.exception.type やxxx.exceptionType のようにMSPDIの名称を最大限に尊重したらどうなる？ linkType より PredecessorLink Type の方が分かりやすいぞ。」と書きました。

**3 つのキーの居場所**（GRS JSON と MSPDI を並べた構造図。`→` の右が MSPDI の元の場所）:

```text
scheduleData
├─ tasks[]                    Task                  → Project/Tasks/Task
│   └─ predecessorLinks[]     PredecessorLink       → Task/PredecessorLink
│       ├─ predecessorUid                           → PredecessorLink/PredecessorUID
│       ├─ ？Type                依存の種類（FF・FS・SF・SS） → PredecessorLink/Type
│       ├─ linkLag                                  → PredecessorLink/LinkLag
│       └─ lagFormat                                → PredecessorLink/LagFormat
├─ calendars[]                Calendar              → Project/Calendars/Calendar
│   ├─ weekDays[]             WeekDay               → Calendar/WeekDays/WeekDay
│   │   └─ dayType                                  → WeekDay/DayType（MSPDI と同じ名）
│   └─ exceptions[]           Exception             → Calendar/Exceptions/Exception
│       └─ ？Type                繰り返し方（毎日・毎週など） → Exception/Type
└─ resources[]                Resource              → Project/Resources/Resource
    └─ ？Type                    資材か作業か            → Resource/Type
```

**あなたの案を広げた決まり:** 「MSPDI の `Type` を写すキーは、MSPDI の親要素の名 ＋ `Type` とする」。MSPDI の XSD の説明も、それぞれを "The exception type"・"The link type"・"The type of resource" と、親の名で呼びます。

| 案 | 3 つの名 | 中身 |
|:---|:---|:---|
| **a（推奨）** | `exceptionType`・`predecessorLinkType`・`resourceType` | 親要素の名 ＋ `Type`。MSPDI を知る人は、名から `Exception/Type` などの元の場所がすぐ分かる。3 つが 1 つの決まりで名付けられ、`resourceType` だけの例外（E-3）が消える。素の `type` は判別子だけに残る（N-7）。代わりに、キーが持ち主の名を繰り返す（N-4）。これを例外の決まり X-5「MSPDI の `Type` を写すキーは、親要素の名 ＋ `Type`（N-4 より強い）」として書く |
| b | 3 つとも `type`（`exception.type` のように、置き場で読む） | MSPDI の名そのもの。ただし `Color.type`（どの形かを選ぶ判別子）と `Exception.type`（繰り返し方）が、同じ名で別の役目を持つ（`OKPN`・`OMPV`）。判別子の決まり N-7 を崩す |
| c | `recurrenceType`・`linkType`・`resourceType`（今のまま） | 何を分けるかを言う名。MSPDI の名からは離れ、`resourceType` だけが例外になる |

回答:

### [color] 色 ✅

#### ✅ 問 6-6-4-10. 線の形 —— 線の太さを線の中に入れるか

決まりました（`JDG-3607`）。答えは決定事項にあります。

#### ✅ 問 6-6-4-11. 3 つの型で、塗りと線の形を共にするか —— `allOf` の意味と、JSON のデータ

決まりました（`JDG-3610`）。`ShapeStyle { fill, stroke }` を 3 つの見た目で共にします。文字の見た目の名は、すぐ下の問 6-6-4-13 で問います。

#### ✅ 問 6-6-4-13. コメントボックスの文字の見た目 —— `style` の中の 1 つの物の名

決まりました（`JDG-3612`）。答えは決定事項にあります。

#### ✅ 問 6-6-4-8. テーマの色の役割 —— 置き場で決めるか、値に書くか

決まりました（`JDG-3608`）。答えは決定事項にあります。

### [root] スケジュールデータと文書の根 ✅

#### ✅ 問 6-13-3. GRS JSON の構造と、データの分け方 —— この考えでよいか

決まりました（`JDG-3605`）。あなたの答え「aで構造ツリーを更新しろ 各プロパティにはGRSのプロパティ名を併記しろ。」に従い、構造図を描き直しました。

構造図（β の形。プロパティの名を併記）:

印: `[M]` は MSPDI の要素を写すキー（括弧の中は、MSPDI の名が違う時の MSPDI の名）。`◆` は、MSPDI と往復する実体の中にある GRS 特有の値。GRS だけの群と根の部分のキーは印を持たない。`[]` は配列、`→` は下の共通の型を指す。

```text
ScheduleDocument                                    GRS JSON の 1 ファイル
├─ $schema                                          スキーマの所
├─ schemaVersion                                    スキーマの版
├─ buildVersion                                     書いたビルドの版
├─ documentSettings                                 文書設定
│   ├─ displayScalePercent                          表示の倍率（%）
│   ├─ fontSizeStep                                 文字の大きさの段
│   ├─ dayWidthPx                                   1 日の幅
│   ├─ verticalZoomRatio                            縦の大きさの比
│   ├─ taskGroupAutoExpandDepth                     自動で開く深さ
│   ├─ scrollPosition                               開いたときの位置
│   │   ├─ type                                     notDecided・placed
│   │   ├─ leftEdgeDay                              左の端の日
│   │   ├─ leftEdgeDayFraction （名は未定）         日の中の位置
│   │   ├─ topEdgeTaskGroupId                       上の端の帯
│   │   └─ topEdgeTaskGroupFraction （名は未定）    帯の中の位置
│   ├─ fitSpan                                      全体表示の期間
│   │   ├─ firstDay                                 最初の日
│   │   ├─ lastDay                                  最後の日
│   │   └─ isFixed                                  期間を固定するか
│   ├─ viewTimeZone                                 見せるタイムゾーン
│   │   ├─ type                                     sameAsScheduleData・fixed
│   │   └─ offset                                   UTC オフセット
│   ├─ displayTimeZones[]                           追加の時計（4 つまで）
│   │   ├─ offset                                   UTC オフセット
│   │   └─ season                                   標準時か夏時間か
│   ├─ is…Visible ×12                               見せるかの切り替え 12 個
│   ├─ stackDirection                               積む向き
│   ├─ isThemeMonochrome                            モノクロか
│   ├─ taskGroupPanelWidthPx                        パネルの幅
│   ├─ isTaskGroupPanelWidthFixed                   幅を固定するか
│   ├─ rootTreeState                                木の根の状態
│   ├─ pinnedTaskGroupIds                           ピン止めした帯
│   └─ tableWindows                                 3 つの表の見せ方
│       ├─ searchWindow                             検索ウィンドウ
│       ├─ delayDiagnosticsReportWindow             遅延診断レポート
│       ├─ resourceListWindow                       担当リスト
│       └─ （3 つの表は、どれも次の欄を持つ）
│           ├─ isScheduleFilterApplied              フィルターを掛けるか
│           ├─ shownTaskUids                        チェックしたタスク
│           ├─ shownResourceUids                    チェックした担当（担当リスト）
│           ├─ isUnassignedShown                    （担当なし）の行（担当リスト）
│           ├─ columnFilters[]                      列のフィルタ → ColumnFilter
│           └─ sort                                 並べ替え → ColumnSort
├─ scheduleData                                     スケジュールデータ
│   ├─ ［MSPDI と往復する群］
│   │   ├─ project [M]                              プロジェクト（1 件）
│   │   │   ├─ uid [M]                              一意な番号
│   │   │   ├─ name [M]                             プロジェクト名
│   │   │   ├─ title [M]                            タイトル
│   │   │   ├─ subject [M]                          件名
│   │   │   ├─ category [M]                         分類
│   │   │   ├─ company [M]                          会社
│   │   │   ├─ manager [M]                          管理者
│   │   │   ├─ author [M]                           作成者
│   │   │   ├─ revision [M]                         保存した回数
│   │   │   ├─ creationDate [M]                     作った日時
│   │   │   ├─ startDate [M]                        開始の日時
│   │   │   ├─ statusDate [M]                       基準日
│   │   │   ├─ minutesPerDay [M]                    1 日の稼働の分
│   │   │   ├─ minutesPerWeek [M]                   1 週の稼働の分
│   │   │   ├─ daysPerMonth [M]                     1 か月の稼働日
│   │   │   ├─ weekStartDay [M]                     週の始まりの曜日
│   │   │   ├─ defaultStartTime [M]                 既定の開始時刻
│   │   │   ├─ defaultFinishTime [M]                既定の終了時刻
│   │   │   ├─ calendarUid [M]                      稼働日を数える暦
│   │   │   ├─ ◆passthroughValues                   持ち越した MSPDI の値
│   │   │   └─ ◆passthroughElements                 持ち越した MSPDI の要素
│   │   ├─ tasks[] [M]                              タスク
│   │   │   ├─ uid [M]                              一意な番号
│   │   │   ├─ name [M]                             タスク名
│   │   │   ├─ notes [M]                            メモ
│   │   │   ├─ start [M]                            予定の開始
│   │   │   ├─ finish [M]                           予定の終了
│   │   │   ├─ milestone [M]                        マイルストーンか
│   │   │   ├─ deadline [M]                         期限
│   │   │   ├─ actualStart [M]                      実績の開始
│   │   │   ├─ stop [M]                             作業が止まった時
│   │   │   ├─ actualFinish [M]                     実績の終了
│   │   │   ├─ resume [M]                           再開の予定
│   │   │   ├─ resumeValid [M]                      再開日が有効か
│   │   │   ├─ percentComplete [M]                  完了率
│   │   │   ├─ ◆fadeInCalendarDays                  始まりのフェード暦日
│   │   │   ├─ ◆fadeOutCalendarDays                 終わりのフェード暦日
│   │   │   ├─ ◆parentTaskUid                       WBS の親タスク
│   │   │   ├─ ◆siblingOrder                        兄弟の中の順
│   │   │   ├─ calendarUid [M]                      タスクの暦
│   │   │   ├─ hyperlinkAddress [M]                 リンク先の URL
│   │   │   ├─ hyperlink [M]                        リンクのタイトル
│   │   │   ├─ predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
│   │   │   │   ├─ predecessorUid [M]               先行タスク
│   │   │   │   ├─ linkType [M] (Type)              結び付きの型
│   │   │   │   ├─ linkLag [M]                      ラグ
│   │   │   │   ├─ lagFormat [M]                    ラグの単位
│   │   │   │   ├─ ◆passthroughValues               持ち越した MSPDI の値
│   │   │   │   └─ ◆passthroughElements             持ち越した MSPDI の要素
│   │   │   ├─ ◆passthroughValues                   持ち越した MSPDI の値
│   │   │   └─ ◆passthroughElements                 持ち越した MSPDI の要素
│   │   ├─ calendars[] [M]                          暦
│   │   │   ├─ uid [M]                              一意な番号
│   │   │   ├─ name [M]                             暦の名
│   │   │   ├─ isBaseCalendar [M]                   基本の暦か
│   │   │   ├─ baseCalendarUid [M]                  受け継ぐ元の暦
│   │   │   ├─ ◆ordinal （問 6-7-6）                ファイルでの順
│   │   │   ├─ weekDays[] [M]                       曜日ごとの稼働
│   │   │   │   ├─ dayType [M]                      曜日（1 が日曜）
│   │   │   │   ├─ dayWorking [M]                   稼働日か
│   │   │   │   ├─ ◆ordinal （問 6-7-6）            ファイルでの順
│   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯
│   │   │   │   │   ├─ fromTime [M]                 始まりの時刻
│   │   │   │   │   ├─ toTime [M]                   終わりの時刻
│   │   │   │   │   └─ ◆ordinal （問 6-7-6）        ファイルでの順
│   │   │   │   ├─ ◆passthroughValues               持ち越した MSPDI の値
│   │   │   │   └─ ◆passthroughElements             持ち越した MSPDI の要素
│   │   │   ├─ exceptions[] [M]                     例外の日
│   │   │   │   ├─ name [M]                         例外の名
│   │   │   │   ├─ fromDate [M] (TimePeriod/FromDate)  最初の日
│   │   │   │   ├─ toDate [M] (TimePeriod/ToDate)   最後の日
│   │   │   │   ├─ dayWorking [M]                   稼働日か
│   │   │   │   ├─ recurrenceType [M] (Type)        繰り返しの型
│   │   │   │   ├─ recurrencePeriod [M] (Period) （問 6-7-7）  繰り返しの間隔
│   │   │   │   ├─ ◆ordinal （問 6-7-6）            ファイルでの順
│   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯（形は上と同じ）
│   │   │   │   ├─ ◆passthroughValues               持ち越した MSPDI の値
│   │   │   │   └─ ◆passthroughElements             持ち越した MSPDI の要素
│   │   │   ├─ ◆passthroughValues                   持ち越した MSPDI の値
│   │   │   └─ ◆passthroughElements                 持ち越した MSPDI の要素
│   │   ├─ resources[] [M]                          担当
│   │   │   ├─ uid [M]                              一意な番号
│   │   │   ├─ name [M]                             担当の名
│   │   │   ├─ resourceType [M] (Type)              担当の型
│   │   │   ├─ isCostResource [M]                   コストの担当か
│   │   │   ├─ calendarUid [M]                      担当の暦
│   │   │   ├─ ◆passthroughValues                   持ち越した MSPDI の値
│   │   │   └─ ◆passthroughElements                 持ち越した MSPDI の要素
│   │   └─ assignments[] [M]                        割当
│   │       ├─ uid [M]                              一意な番号
│   │       ├─ taskUid [M]                          就くタスク
│   │       ├─ resourceUid [M]                      就く担当
│   │       ├─ ◆passthroughValues                   持ち越した MSPDI の値
│   │       └─ ◆passthroughElements                 持ち越した MSPDI の要素
│   └─ ［GRS だけが持つ群］
│       ├─ （名は次の問いで決める）                 文書全体の GRS の値
│       │   ├─ scheduleDataTimeZone                 データの日時の時差
│       │   ├─ sourceFormat                         元の形式
│       │   ├─ firstOutlineLevel                    最初の OutlineLevel
│       │   ├─ themeHueDegrees                      テーマの色相（度）
│       │   ├─ parentTaskProgressToleranceWorkingDays  遅延診断の許し幅
│       │   ├─ highestIssuedUid                     uid の数え手
│       │   └─ lastMspdiImportNumber                MSPDI の取り込み回数
│       ├─ taskGroups[]                             タスクグループ
│       │   ├─ id                                   一意な UUID
│       │   ├─ name                                 タスクグループ名
│       │   ├─ style （問 6-6-4-11）                見た目
│       │   │   └─ color （問 6-6-4-11）            帯の色 → LaneColor
│       │   ├─ minHeightPx                          帯の最も低い高さ
│       │   ├─ parentId                             親のタスクグループ
│       │   ├─ siblingOrder                         兄弟の中の順
│       │   ├─ derivedFromTaskUid （問 6-9-2）      表す WBS のタスク
│       │   ├─ hyperlinkAddress                     リンク先の URL
│       │   ├─ hyperlink                            リンクのタイトル
│       │   ├─ treeState                            開閉の状態
│       │   └─ editGroup                            編集してよい組
│       ├─ taskGroupMembers[]                       どの帯に載るか
│       │   ├─ taskUid                              タスク
│       │   └─ taskGroupId                          載せるタスクグループ
│       ├─ taskStyles[]                             タスクの見た目
│       │   ├─ taskUid                              タスク
│       │   └─ style （問 6-6-4-11）                見た目
│       │       ├─ taskShape                        バーの形
│       │       ├─ milestoneShape                   マイルストーンの形
│       │       ├─ fillColor （問 6-6-4-11）        塗りの色 → Color
│       │       ├─ strokeColor （問 6-6-4-11）      縁の色 → Color
│       │       └─ strokeWidthPx （問 6-6-4-10）    縁の太さ
│       ├─ commentBoxes[]                           コメントボックス
│       │   ├─ id                                   一意な UUID
│       │   ├─ text                                 文
│       │   ├─ style （問 6-6-4-11）                見た目
│       │   │   ├─ fillColor （問 6-6-4-11）        箱の塗りの色 → Color
│       │   │   ├─ opacityPercent                   不透明度（%）
│       │   │   ├─ strokeColor （問 6-6-4-11）      枠と線の色 → Color
│       │   │   ├─ strokeWidthPx （問 6-6-4-10）    枠と線の太さ
│       │   │   ├─ textColor                        文字の色 → Color
│       │   │   └─ fontSizePx                       文字の大きさ
│       │   ├─ leaderTarget                         引出し線の先
│       │   │   ├─ type                             freePoint・task・highlightBox
│       │   │   ├─ dateTime                         時点（freePoint）
│       │   │   ├─ taskGroupId                      帯（freePoint）
│       │   │   ├─ laneTopOffsetPercent             帯の中の高さ（freePoint）
│       │   │   ├─ taskUid                          タスク（task）
│       │   │   ├─ graphicPart                      図形の部分（task）
│       │   │   ├─ highlightBoxId                   箱（highlightBox）
│       │   │   └─ point                            吸着する 8 点の 1 つ
│       │   ├─ bodyOffsetPx                         線先から箱へのずれ
│       │   │   ├─ dx                               横のずれ
│       │   │   └─ dy                               縦のずれ
│       │   ├─ hyperlinkAddress                     リンク先の URL
│       │   └─ hyperlink                            リンクのタイトル
│       ├─ highlightBoxes[]                         ハイライトボックス
│       │   ├─ id                                   一意な UUID
│       │   ├─ style （問 6-6-4-11）                見た目
│       │   │   ├─ cornerRadiusPx                   角の丸みの半径
│       │   │   ├─ fillColor （問 6-6-4-11）        塗りの色 → Color
│       │   │   ├─ opacityPercent                   不透明度（%）
│       │   │   ├─ strokeColor （問 6-6-4-11）      枠の色 → Color
│       │   │   └─ strokeWidthPx （問 6-6-4-10）    枠の太さ
│       │   ├─ firstDay                             最初の日
│       │   ├─ lastDay                              最後の日
│       │   ├─ topTaskGroupId                       上の縁の帯
│       │   └─ bottomTaskGroupId                    下の縁の帯
│       ├─ baselineTasks[]                          前回予定
│       │   ├─ uid                                  今のタスクの uid
│       │   ├─ name                                 タスク名
│       │   ├─ start                                前の予定の開始
│       │   ├─ finish                               前の予定の終了
│       │   └─ milestone                            マイルストーンか
│       └─ taskOrigins[]                            取り込み元の控え
│           ├─ taskUid                              タスク
│           ├─ sourceProjectId                      元のファイルの UID
│           ├─ sourceUid                            元のタスクの UID
│           ├─ importSessionId                      取り込みの id
│           └─ lastSeenMspdiImportNumber            最後に見た取り込み
├─ documentStamp                                    文書刻印
│   ├─ scheduleDataUpdatedAt                        データが変わった時
│   ├─ documentUpdatedAt                            文書が変わった時
│   ├─ fileSavedAt                                  保存した時
│   └─ lastEditedBy                                 最後に書いた者
│       ├─ type                                     user・template・agent
│       └─ name                                     AI が付けた名
└─ changeLogEntries[]                               変更履歴
    ├─ changedAt                                    変更の時
    ├─ changedBy                                    変更した者
    ├─ affectedArea                                 及んだ部分
    ├─ changeDescription                            何が変わったか
    ├─ reason                                       理由
    └─ remarks                                      そのほか

共通の型（→ で指す物）
├─ Color （問 6-6-4-7）                             色
│   ├─ type                                         theme・palette・custom
│   ├─ name                                         パレットの色の名
│   ├─ light                                        明るいテーマの側
│   │   ├─ hexColor                                 色の値（#rrggbb）
│   │   └─ derivedFrom                              GRS が作った元の側
│   └─ dark                                         暗いテーマの側（形は light）
├─ LaneColor                                        Color から ink を除く
├─ ColumnFilter                                     列のフィルタ
│   ├─ type                                         values・dateRange
│   ├─ column                                       列
│   ├─ hiddenValues                                 隠す値
│   ├─ isBlankHidden                                空の行を隠すか
│   ├─ firstDay                                     最初の日
│   └─ lastDay                                      最後の日
├─ ColumnSort                                       並べ替え
│   ├─ column                                       列
│   └─ direction                                    向き
└─ PassthroughElement                               持ち越した要素 1 つ
    ├─ ordinal （問 6-7-6）                         ファイルでの順
    ├─ name                                         MSPDI の要素の名
    ├─ fields                                       文字だけの子の値
    └─ children[]                                   入れ子の子要素
```

- 新しい物（名は次の問いで決める）を、席は GRS だけの群の先頭に置いた。`JDG-3545` の並びはこの物を持たない。中の 7 つは、席が `JDG-3540` の順（中身 → 見た目 → 設定 → 帳簿）で並べた。
- 色は、今の平らな名（`fillColor`・`strokeColor`・`strokeWidthPx`）で描いた。問 6-6-4-10・11 の推奨を採ると、`fill { color, opacityPercent }`・`stroke { color, opacityPercent, widthPx }` に変わる。今のタスクの `style` は `opacityPercent` を持たない。
- `JDG-3556` は「見た目」の範囲を決めていない。席は `fontSizePx`・`cornerRadiusPx` を `style` に入れ、`minHeightPx` を外に置いた。
- 席は `JDG-3540` を当て、`calendarUid`・`parentTaskUid`・`siblingOrder` などの参照を「置き場」として中身の後へ移した。`property-order.md` は、まだ `JDG-3322` の順を持つ。
- `[M]` は、大文字と小文字だけの違い（`uid` と UID）を同じと見た。fade は MSPDI の ExtendedAttribute に書くが、GRS 特有の値なので、席は `◆` を付けた。


#### ✅ 問 6-13-1. 似た字の 2 組と根の並び —— 名を分けるか、並びを確かめるか

決まりました（`JDG-3602`）。答えは決定事項にあります。

#### ✅ 問 6-11-1. 根の 3 つの部分の呼び名 —— 「刻印」「設定」「変更ログ」の字をどうそろえるか

決まりました（`JDG-3603`）。答えは決定事項にあります。

### [task] タスクと依存 ✅

#### ✅ 問 6-9-8. `dependencies` —— MSPDI の名 PredecessorLink と違う名を保つか

決まりました（`JDG-3604`）。答えは決定事項にあります。

### [tg] タスクグループ ✅

***

## ❓ 自由

答えを読んで、ほかに聞きたいこと・違うと思う所があれば、ここに書いてください。

回答:
