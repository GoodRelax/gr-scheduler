# MSPDI 要素の順の持ち方 —— `ordinal` の調査報告

調べた木: 作業木 `sad-leavitt-8584b4`（`d660fae7d`）。読むだけで、リポジトリのファイルは変えていない。
行番号は `src/adapter/document-codec/mspdi-codec.ts` を `codec`、`mspdi-child-placement.ts` を `placement` と略す。

## 結論（先に）

- `ordinal` は 1 つの名前で 4 つの意味を持つ。ファイル内の位置、行の鍵、配列の添字、変更履歴の通し番号である。NEIM と OMPV に反する。
- 書き出しが `ordinal` を読む所は 3 か所だけである。持ち回る子の並べ（`placement:74`）、一覧に戻す行の差し込み（`codec:1111`）、WorkingTime の並べ（`codec:1410`）である。
- Calendar・WeekDay・Exception の `ordinal` を書き出しは読まない。配列の順で書く（`codec:989`・`:1356-1361`）。DFC-3585 のとおりである。
- 持ち回る子の位置は、いまも実際には XSD の順位が決める（`placement:116`）。`ordinal` が効くのは、同じ名前の兄弟の順と、どちらのスキーマにも無い子の置き場だけである。
- 提案（XSD の順＋繰り返しは配列の順）は、子の位置と Calendar 系の `ordinal` を置き換えられる。提案が自力で置けないのは、一覧の中の持ち回り行（MR-4 の要約タスクほか）と、どちらのスキーマにも無い子の 2 つである。

## 1. `ordinal` があるところ

| # | 場所（GRS JSON の鍵 / 内部） | 仕様の行 | 入れる所 | 使い道 | 書き出しが読むか |
|---|---|---|---|---|---|
| 1 | `CarryElement.ordinal`（Task などの子） | AT-123・ET-15 | `codec:197` 親の全部の子の中の添字。葉も数える | 葉との組み合わせと、同じ順位の中の順（`placement:74-88`・`:116-117`） | 読む。ただし XSD の順位が先に効く |
| 2 | `CarryElement.ordinal`（`project.carryElements` の一覧行） | AT-123・DF-3・MR-4・EX-5 | `codec:566`・`:742`・`:783`・`:822` 一覧（`Tasks` など）の中の添字 | 書いた行の列へ差し込む位置（`codec:1105-1118`） | 読む |
| 3 | `CarryElement.ordinal`（入れ子の子） | AT-123・AT-126 | `codec:213` | #1 と同じ | 読む |
| 4 | フェードの印（`ExtendedAttribute`、値なし） | EX-16 | `mspdi-fade-frames.ts:95` 元の `ordinal` を写す | 列の値を書き戻す位置 | 読む（#1 の経路） |
| 5 | 新しいフェード定義 | EX-16 | `mspdi-fade-frames.ts:234` 最大＋1 | 末尾に足す | 読む |
| 6 | `Calendar.ordinal` | AT-67 | `codec:839` `Calendars` の中の添字（UID 無しの行と同じ数え方） | 基準暦の選択（`working-calendar.ts:141-145`: `calendarUid` が空のとき最小の基準暦）。合流で最大＋1（`import-document.ts:667-679`）。新しい暦で最大＋1（`edit-calendar.ts:233`） | **読まない**（DFC-3585） |
| 7 | `WeekDay.ordinal` | AT-72（PK） | `codec:859` | 足す曜日に最大＋1（`edit-calendar.ts:159`） | 読まない |
| 8 | `Exception.ordinal` | AT-77（PK）・CM-39・WT-10 | `codec:904` | **行の鍵**: setCalendar の字面保持（`edit-calendar.ts:203-205`）、同じかの判定（`:178`）、足した行の判定（`:135-137`）、下書きの編集（`calendar-draft.ts:243-285`）、断り（`:337-343`）、時間帯の索引（`working-calendar.ts:594`・`:609`） | 読まない |
| 9 | `WorkingTime.ordinal` | AT-160（PK） | `codec:880`。下書きは範囲の添字で振り直す（`calendar-draft.ts:369-370`） | 書き出しの並べ | **読む**（`codec:1410`） |
| 10 | `changeLog.ordinal` | AT-130 | GRS だけの列 | 通し番号 | MSPDI と無関係 |
| 11 | 選択の `dependency.ordinal` | — | `selection.ts:20`・`selection-input.ts:59` | `dependencies` の添字 | MSPDI と無関係。永続しない |

補足:
- #2 は Project の子の添字（#1）と一覧の添字を、同じ配列 `project.carryElements` に混ぜる（`codec:463`）。AT-123 は「所有者とこれで一意」と書くが、この配列では 2 つの数え方が重なりうる。書き出しは名前で分けるので（`codec:1111`・`:1009`）位置は崩れない。IV-1（`schedule-invariants.ts:323-343`）がこの配列で重なりを咎める。IV-1 が実行時に走る経路は 未確認（取り込みの検査は IV-23・IV-24 だけを渡す。`validate-imported-document.ts:341`）。
- 葉は `ordinal` を持たない（AT-125、`placement:77`）。同じ名前の葉は最初だけを採る（MR-3、`codec:222-224`）。

## 2. XSD が子の順を決めない所

| 種類 | 親 | 子 | pj15 の行 | GRS がいま書く順 |
|---|---|---|---|---|
| `xsd:all` | `Project/OutlineCodes/OutlineCode/Values/Value` | ValueID・FieldGUID・Type・IsCollapsed・ParentValueID・Value・Description（すべて葉） | 796-845 | 取り込んだ順（`placement:64`）。葉は辞書の鍵の順で並ぶ |
| `xsd:all` | `Project/ExtendedAttributes/ExtendedAttribute/ValueList/Value` | ID・Value・Description・Phonetic（すべて葉） | 1193-1214 | 同上 |
| `xsd:choice` | `.../WeekDays/WeekDay/WorkingTimes` | WorkingTime（0〜5） | 1330-1350 | `WorkingTime.ordinal` の順（`codec:1410`） |
| `xsd:choice` | `.../Exceptions/Exception/WorkingTimes` | WorkingTime（0〜5） | 1509-1529 | 同上 |

- 2 つの `xsd:choice` は選択肢が 1 つだけである。実質は WorkingTime の繰り返しで、順は配列の問題になる。
- PARENT_ORDERS（`mspdi-child-order.json`）は 53 の親を持つ。XSD の複合要素 48 と `TimephasedDataType` の 5 か所で、XSD が宣言する親は全部そろう（スクリプトで XSD を歩いて照合した）。
- 表に無い親は、どちらのスキーマにも無い要素だけである。GRS はその中身を取り込んだ順で書く（`placement:64`）。その要素自身は、宣言のある隣にぶら下げる（`placement:166-186`、EX-10）。
- 一覧の親（`Tasks`・`Calendars` など）は子が 1 種類なので、表は順を決められない。3 節で扱う。

## 3. 一覧の中の持ち回り行

**いまの仕組み**: 取り込みは、行にしない `Task`／`Resource`／`Assignment`／`Calendar`（MR-4 の要約タスク、`IsNull`、UID 無し、要約タスクへの割当）を `project.carryElements` に積む。`ordinal` は一覧の中の添字である（`codec:566-578`・`:742-753`・`:783-797`・`:822-830`）。
書き出しは、GRS の行を先に並べる（Task は WBS の順、`codec:1050-1062`。Calendar・Resource・Assignment は配列の順）。次に持ち回り行を `ordinal` の小さい順に、その添字へ差し込む（`codec:1111-1117`）。添字が長さを超えれば末尾に付ける。
- 未編集なら元の位置に戻る（EX-5 を満たす）。
- 編集で前の行の数が変わると、持ち回り行は**絶対の添字**に残る。隣の行との関係はずれる。
- 一覧の下の行でない子（`<Foo>`）は黙って落ちる（DFC-667、`実装待ち`）。

**提案に要るもの**: 一覧の子はみな同じ名前なので、XSD は持ち回り行を置けない。提案は次のどれかを足す必要がある。
- (a) 隣の行に錨を下ろす: 「直前に来た、GRS が行にした要素の UID」（例 `afterUid`）。先頭なら錨なし。同じ錨の行どうしは配列の順。
- (b) 今の添字を残し、名前を意味に合わせる（例 `indexInCollection`）。
- (c) MR-4 の要約タスクだけは「一覧の先頭」と決める。MS Project は先頭に書く（MR-4 の本文）。

## 4. 3 つの場合

読み方: 数字は 1 つの親の下の行の `ordinal`（または元の位置）である。表の「いま」はいまのコード、「提案」は持ち主の案である。

### 4.1 「1,2,3,4」—— 未編集で往復

```xml
<Exceptions><Exception>A</Exception><Exception>B</Exception><Exception>C</Exception><Exception>D</Exception></Exceptions>
```

| 対象 | いま | 提案 | 失う／入れ替わる |
|---|---|---|---|
| Calendar | 配列の順 = 元の順 | 配列の順 = 元の順 | どちらも無い |
| Exception（行の鍵も） | 配列の順 = 元の順 | 同じ | 無い |
| WorkingTime | `ordinal` の順 = 元の順 | 配列の順 = 元の順 | 無い |
| Task の中の持ち回る子 | XSD の順位、同順位は `ordinal` の順 | XSD の順位、繰り返しは配列の順 | 無い（違う名前の兄弟の順は NR-6 が比べない） |
| 一覧の持ち回り Task 行 | 元の添字へ差し込む | 錨が無いと置けない（3 節） | 提案だけ要追加 |

### 4.2 「1,2,4,5」—— 真ん中を消した、またはファイルに隙間がある

```json
"exceptions": [ { "ordinal": 1 }, { "ordinal": 2 }, { "ordinal": 4 }, { "ordinal": 5 } ]
```

| 対象 | いま | 提案 | 失う／入れ替わる |
|---|---|---|---|
| Calendar | 配列の順。消す命令は無い（CM 表に deleteCalendar が無い） | 配列の順 | 無い |
| Exception | 配列の順。残りの `ordinal` は振り直さないので、行の鍵は保たれる（`calendar-draft.ts:255-256`） | 配列の順 | 無い |
| WorkingTime | `ordinal` の順。隙間は順を変えない。下書きを当てると 0 から振り直す | 配列の順 | 無い |
| Task の中の持ち回る子 | 並べは隙間に強い（`placement:74`・`:116`） | 配列から消えるだけ | 無い |
| 一覧の持ち回り Task 行 | 前の行を消すと、行は同じ添字に入り、**1 つ後ろの行の後へずれる**（例: `[T1, 空行(1), T2]` で T1 を消す → `[T2, 空行]`） | 錨 (a) なら T1 の行が消えても、錨の後継ぎの規則が要る | いまは並びが入れ替わる。消えるものは無い |

### 4.3 「1,2,5,4」—— 配列の順と `ordinal` が食い違う

```json
"calendars": [ { "uid": 1, "ordinal": 1 }, { "uid": 2, "ordinal": 2 }, { "uid": 5, "ordinal": 5 }, { "uid": 4, "ordinal": 4 } ]
```

| 対象 | いま | 提案 | 失う／入れ替わる |
|---|---|---|---|
| Calendar | 配列の順（1,2,5,4）。AT-67 は 1,2,4,5 を求める（DFC-3585）。基準暦の選択は `ordinal` 最小を使う | 配列の順（1,2,5,4）。基準暦は配列の最初 | いまは仕様と食い違う。提案は食い違いが生まれない |
| Exception | 配列の順（1,2,5,4）。setCalendar は渡された配列の順をそのまま置く（`edit-calendar.ts:200-207`） | 配列の順 | 無い |
| WorkingTime | `ordinal` の順（1,2,4,5）＝ 配列と違う順に書く | 配列の順 | いまは入れ替わる。計算は始まりで並べ直すので（`working-calendar.ts:539`）、意味は変わらない |
| Task の中の持ち回る子（同じ名前の `ExtendedAttribute`） | `ordinal` の順（4 が 5 の前）に書く | 配列の順（5 が 4 の前） | どちらも失わない。順が違う |
| 一覧の持ち回り Task 行 | `ordinal` の小さい順に差し込む（`codec:1111`）。配列の順は効かない | 錨の規則しだい | 無い |

### 4.4 GRS で行を足すとき

| 対象 | いまの `ordinal` | 提案の置き場 |
|---|---|---|
| Calendar（setCalendar で作る・合流で足す） | 最大＋1（`edit-calendar.ts:233`・`import-document.ts:678`）。配列の末尾 | 配列の末尾 |
| WeekDay（稼働する曜日を足す） | 最大＋1（`edit-calendar.ts:159`）。末尾 | 末尾 |
| Exception（休日の設定で足す） | 文書と下書きの最大＋1（`calendar-draft.ts:221-229`）。末尾 | 末尾 |
| WorkingTime | 下書きの範囲の添字（`calendar-draft.ts:369`）。AT-160 は「始まりの順」と書く | 配列の順（始まりの順に並べるかは提案で決める） |
| フェード定義 | 最大＋1（`mspdi-fade-frames.ts:234`） | 配列の末尾 |
| 依存（CM-36） | `ordinal` なし。`dependencies` の末尾 | 同じ |

## 5. 編集で順は変わるか、画面に出る順はどれか

| 要素 | 順を変える操作 | 画面に出る順 | MSPDI だけで効く順 |
|---|---|---|---|
| Calendar | 合流（MG-5: 同じ中身は 1 つ、違えば末尾）、setCalendar の新規作成 | 画面は使う暦 1 つだけを出す（`workingCalendarOf`）。暦の一覧の画面は見つからない（未確認） | `Calendars` の中の順 |
| WeekDay | CM-39 が末尾に足す | 曜日の番号の順（`calendar-draft.ts:134`） | 配列の順 |
| Exception | CM-39（休日の設定、Agent API）は配列を丸ごと置き換える。順は発行者が決める | **始まりの日の順**（`holiday-settings.ts:317`）。配列の順は見えない | 配列の順。重なる例外日は配列で先の行が勝つ（`working-calendar.ts:608-610`） |
| WorkingTime | CM-39 が組を丸ごと置き換える | 休日の設定の範囲の順（`calendar-draft.ts:123`） | 書き出しの順 |
| Task の中の持ち回る子 | 変える命令は無い | 出ない | すべて |
| 依存 | CM-36 が末尾に足す、CM-37／CM-93 が消す | プロパティの欄 | `PredecessorLink` の順。持ち回るリンクは同じ順位で先に書く（`codec:703-705`・`placement:115-117`） |
| 一覧の持ち回り行 | 変える命令は無い。周りの Task の作成・削除・WBS の移動（CM-6・CM-7・CM-18）で相対位置がずれる | 出ない（EX-5） | すべて |

- `document-commands.json` の 93 行で、暦に触れるのは CM-39 だけである。並べ替えの命令（CM-35・CM-73 など）はタスクグループだけを動かす。
- Task 行の順は WBS が決める（`codec:1050-1062`）。配列の順は書き出しに効かない。

## 6. 推奨

判定の軸: SSOT（1 つの事実を 1 か所に）、OKPN／OMPV（07 の R2）、NEIM（名が意味を言う。JDG-3546）、往復無損失（LM-5・FR-021、NR-6 は同じ名前の兄弟の順を比べる）。

| `ordinal` の種類 | 推奨 | 理由 |
|---|---|---|
| 持ち回る子の位置（#1・#3） | **落とす**。提案の形（XSD の順＋繰り返しは配列） | 順位が既に決めている（`placement:116`）。残る役目は同じ名前の兄弟の順で、配列が持てる。配列と `ordinal` の 2 か所に順があると SSOT に反し、4.3 の食い違いが生まれる |
| フェードの印（#4） | **落とす**。印を `ExtendedAttribute` の配列の中の 1 要素として残す | 配列の位置が EX-16 の「取り込んだ位置」になる |
| 一覧の持ち回り行の位置（#2） | **置き換える**。錨（直前の行の UID）か、意味を言う名の添字。MR-4 の要約タスクは「先頭」 | XSD が置けない。絶対の添字は編集でずれる（4.2）。Project の子の添字と同じ名前で同じ配列に混ざり、OMPV と AT-123 の一意に反する |
| `Calendar.ordinal`（#6） | **落とす**。配列の順で書く。基準暦は配列の最初 | 書き出しが読まない（DFC-3585）。配列と二重に順を持つ |
| `WeekDay.ordinal`（#7） | **落とす** | 書き出しも計算も読まない。PK の役は `dayType` と配列で足りる |
| `WorkingTime.ordinal`（#9） | **落とす**。配列の順（または始まりの順）で書く | 計算は始まりで並べ直す。書き出しだけが読み、配列と食い違う（4.3） |
| `Exception.ordinal` の行の鍵（#8） | **GRS JSON からは落とし、内部の鍵に置き換える** | 字面保持（WT-10）は「同じ日の元の行の字面」を探せば足りる（`writtenDayText` は日で比べる、`edit-calendar.ts:214-223`）。下書きと索引は配列の添字か、下書きだけの番号で足りる。Agent API が鍵を作らずに済む |

### 提案が扱うべき例外

1. **一覧の持ち回り行**（3 節）—— 錨の規則と、錨の行が消えたときの後継ぎを決める。
2. **どちらのスキーマにも無い子** —— EX-10 は「取り込んだとき直前にあった要素の直後」を求める。JSON のオブジェクトは順を約束しない（RFC 8259）ので、鍵の順に頼らない置き場（直前の兄弟の名前など）が要る。
3. **GRS が書く行と持ち回る行が同じ名前で混ざる繰り返し** —— `PredecessorLink`（持ち回るリンクと `dependencies`）、Task の `ExtendedAttribute`（持ち回りとフェードの値）。2 つの配列の間の前後の規則を決める。いまは持ち回りが先（`placement:115`）。
4. **`xsd:all` の 2 か所** —— 順は自由である。XSD の宣言順で書いてよい。違う名前の兄弟なので NR-6 は比べない。
5. **葉の重複（MR-3）** —— maxOccurs が 1 の葉は配列にしない。最初を採り RS-60 で告げる規則はそのまま残る。
6. **pj12 と pj15 の違い** —— maxOccurs は pj15 で決める。pj12 だけで繰り返す要素があるかは 未確認。
7. **空の要素**（例 空の `WorkingTimes`、`codec:885-888`）—— 提案の形で空の配列と空の要素を分ける書き方が要る。
8. **合流（LM-5 の外）** —— 合流で足した暦は末尾に付く。取り込み側の持ち回り行が合流で残るかは 未確認。

## 未確認

- IV-1 が `ordinal` の重複を実行時に咎める経路（`scheduleViolations` の呼び出しは IV-17・IV-23・IV-24 だけを渡す）。
- `project.carryElements` で 2 つの数え方が実際に重なる MS Project のファイル（例: 要約タスクへの割当と要約タスクが共に添字 0）。
- 暦の一覧を出す画面の有無。担当の一覧の順が配列の順か。
- 休日の設定の下書きが時間帯を始まりの順に並べ直すか（AT-160 は求める）。
- pj12 だけで maxOccurs が 1 を超える要素の有無（照合は pj15 だけで行った）。
- 合流で取り込み側の一覧の持ち回り行がどうなるか。
- 実際の往復は走らせていない。すべてコードと仕様を読んだ推論である。
