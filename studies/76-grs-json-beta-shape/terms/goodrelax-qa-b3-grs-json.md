BGQA3
# GRS JSON の名（名の辞書 3）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA3 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

2026-11-15 に作った。BGQA2（名の辞書）が大きくなりすぎたので、あなたの指示で約束の面ごとに分けた（`JDG-3568`）。この紙は GRS JSON の名を受け持つ。文書の命令は BGQA4、Agent API は BGQA5 が受け持ち、GRS JSON の名が決まった後に出す。決まりと、これまでの決定事項は BGQA2（`goodrelax-qa-b2-glossary.md`）にある。

🔄 *残 7（❓ で検索）*

1 回目は、ほかの名に効く 10 問です: キーの付け方の決まり、根の並びと呼び名、順番の数、色の形、MSPDI と違う名を保つかの 2 問。残りの GRS JSON の問い（21）は、答えの後で 10 問前後ずつ出します。

2026-11-15 の 2 回目: 1 回目のあなたの答えで 4 問が決まりました（`JDG-3569`・`JDG-3602`〜`JDG-3604`）。説明と例を求めた問いは、JSON の例をコードブロックに入れて書き直しました。新しく、パレットの paper と ink（問 6-6-4-12）、タイムゾーンの置き場（問 6-8-19）、キーの付け方の決まり（問 6-8-6）、画面の欄の名（問 6-13-2）、MSPDI の名と違う語（問 6-9-5・6-7-7）を足しました。

2026-11-15 の 3 回目: あなたの求めに合わせ、GRS JSON の構造図と分け方の考え（問 6-13-3）を、問いの先頭に置きました。ほかの問いは 2 回目のままです。

2026-11-15 の 4 回目: 問 6-13-3 に、15 か所の GRS だけの値を 1 つずつ照らした根拠の表を足し、問 6-8-19 をそこへまとめました。ほかの問いは 2 回目のままです。

2026-11-15 の 5 回目: 問 6-13-3 が決まり（`JDG-3605`）、プロパティの名を併記した構造図に描き直しました。新しく、Project から移す 7 つの値の入れ物の名（問 6-13-4）を問います。

🔄 *2026-11-15 の 6 回目: あなたの指示「影響が大きいものだけ最初に問え」に従い、ほかの名や形に広く効く 6 問だけを、影響の大きい順に出します: 持ち越しの形（問 6-7-8）、`ordinal` の 4 つの役目（問 6-7-6）、キーに持ち主の名を繰り返さない決まり（問 6-8-6）、色の形の 3 問（問 6-6-4-10・6-6-4-11・6-6-4-8）。1 つの名だけに効く 7 問は、出す前の置き場へ戻しました。*

***

## 決定事項

### [proj] プロジェクト

| 何 | 決め | 裁定 |
|:---|:---|:---|
| プロジェクトの 23 語（問 6-8-5） | 表のとおり確定（8-6 `uid`・8-8 `name`・8-9 `title`・8-10〜8-18・8-20〜8-25・8-31〜8-35）。8-19 `scheduleDataTimeZone` は名だけ確定し、置き場を問 6-8-19 で問う | `JDG-3569` |

### [root] スケジュールデータと文書の根

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 似た字と根の並び（問 6-13-1） | `note` → `remarks`、`levelZeroTreeState` → `rootTreeState`（階層は「深さ」で数える）。根の並びは `$schema`・`schemaVersion`・`buildVersion`・`documentSettings`・`scheduleData`・`documentStamp`・`changeLogEntries` | `JDG-3602` |
| 根の 3 つの部分の呼び名（問 6-11-1） | 「文書刻印」「文書設定」「変更履歴」 | `JDG-3603` |
| GRS JSON の構造と分け方（問 6-13-3） | 1 文書 1 JSON。根を形の版・見せ方・中身・帳簿に分け、中身を MSPDI と往復する群と GRS だけの群に分ける。往復する群の実体に置くのは、その実体のことを言い、かつ MSPDI と往復する値だけ。Project の GRS だけの値 7 つを GRS の群の 1 つの物へ移す（名は問 6-13-4） | `JDG-3605` |

### [key] 共通のキー

この分野で決まった語は、答えの後でここに書きます。

### [color] 色

この分野で決まった語は、答えの後でここに書きます。

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

### [key] 🔄 *共通のキー（❓ 2）*

#### 🔄 *❓ 問 6-7-8. 持ち越しの形 —— MSPDI の構造とキーのまま持つか*

🔄 *場面: GRS が意味を読まない MSPDI の値を、GRS は今、2 つに分けて持ちます。`passthroughValues` は文字だけの子を「名 → 文字」の対で持ち、順を持ちません。同じ名の 2 つ目以降は消えます。`passthroughElements` は子を持つ子を `{ ordinal, name, fields, children }` で持ちます。あなたは「構造とキーは MSPDI のまま、そこに ordinal を付けるのはありか」と問いました。調べた結果は `studies/76-grs-json-beta-shape/terms/ordinal-survey-2026-11-15.md` にあります。*

🔄 *元の MSPDI（タスク 1 つ）:*

🔄 *下のコードブロックの 1・2・3・4・5・6・7 行目が変わった。*
```xml
<Task>
  <UID>5</UID>
  <Name>設計</Name>
  <Priority>500</Priority>
  <ExtendedAttribute><FieldID>188743731</FieldID><Value>A 案</Value></ExtendedAttribute>
  <ExtendedAttribute><FieldID>188743732</FieldID><Value>B 案</Value></ExtendedAttribute>
</Task>
```

🔄 *今の形:*

🔄 *下のコードブロックの 1・2・3・4・5 行目が変わった。*
```json
{ "uid": 5, "name": "設計",
  "passthroughValues": { "Priority": "500" },
  "passthroughElements": [
    { "ordinal": 3, "name": "ExtendedAttribute", "fields": { "FieldID": "188743731", "Value": "A 案" }, "children": [] },
    { "ordinal": 4, "name": "ExtendedAttribute", "fields": { "FieldID": "188743732", "Value": "B 案" }, "children": [] } ] }
```

🔄 *案 a の形:*

🔄 *下のコードブロックの 1・2・3・4・5・6 行目が変わった。*
```json
{ "uid": 5, "name": "設計",
  "passthrough": {
    "Priority": "500",
    "ExtendedAttribute": [
      { "FieldID": "188743731", "Value": "A 案" },
      { "FieldID": "188743732", "Value": "B 案" } ] } }
```

🔄 *案 b の形:*

🔄 *下のコードブロックの 1・2・3・4・5・6・7 行目が変わった。*
```json
{ "uid": 5, "name": "設計",
  "passthrough": [
    { "ordinal": 2, "name": "Priority", "text": "500" },
    { "ordinal": 3, "name": "ExtendedAttribute", "children": [
        { "ordinal": 0, "name": "FieldID", "text": "188743731" }, { "ordinal": 1, "name": "Value", "text": "A 案" } ] },
    { "ordinal": 4, "name": "ExtendedAttribute", "children": [
        { "ordinal": 0, "name": "FieldID", "text": "188743732" }, { "ordinal": 1, "name": "Value", "text": "B 案" } ] } ] }
```

🔄 *調べて分かった事実:*

- 🔄 *MSPDI の XSD は、子の並びを決めます（`xsd:sequence` が 47 か所）。並びを決めない `xsd:all` は、アウトラインコードの値の一覧とカスタム欄の値の一覧の 2 か所だけです。*
- 🔄 *GRS は今も、書き出しで子を XSD の順に並べます。`ordinal` は、同じ名の子どうしの順にしか効きません。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`passthrough` 1 つに、MSPDI の構造とキーのまま持つ。XSD で繰り返せる要素（`maxOccurs` が 2 以上）は、1 つでもいつも配列にする（1 つの名が 1 つの形を保つ。`OKPN`）。`ordinal` は持たない。書き出しは XSD の順、繰り返しは配列の順。例外の決め: `xsd:all` の 2 か所と、どちらの XSD にも無い要素は配列の順で書く。GRS が書く要素と持ち越した要素が同じ名で混ざる所（`ExtendedAttribute` など）は、GRS の物を先に書く。前の決め `passthroughValues`・`passthroughElements`（`JDG-3343`）を改める* |
| 🔄 *b* | 🔄 *`passthrough` 1 つの配列に、`{ ordinal, name, text }` か `{ ordinal, name, children }` の同じ形で持つ。順と数を落とさないが、MSPDI のキーは値の中に入り、引くには名で探す* |
| 🔄 *c* | 🔄 *今のまま 2 つに分けて持つ* |

回答:

#### 🔄 *❓ 問 6-7-6. `ordinal` —— 4 つの役目を、それぞれ何で持つか*

🔄 *場面: 前回、あなたは「ordinalを使った理由は？ 順序が飛ぶケースや逆転するケースは？」と問いました。調べると、1 つの名 `ordinal` が 4 つの役目を持っていました（`NEIM`・`OMPV` に外れる）。書き出しが `ordinal` を読むのは 3 か所だけで、暦・曜日・例外の `ordinal` は読みません（`DFC-3585`）。持ち越した一覧の行は、前の行を足し引きするとずれます（`DFC-3586`）。*

| 🔄 *#* | 🔄 *役目* | 🔄 *今* | 🔄 *推奨* |
|:---|:---|:---|:---|
| 🔄 *1* | 🔄 *持ち越した子の位置* | 🔄 *`passthroughElements[].ordinal`* | 🔄 *外す。問 6-7-8 の a で、XSD の順と配列の順が位置を決める* |
| 🔄 *2* | 🔄 *暦・曜日・例外・稼働時間の、ファイルでの順* | 🔄 *各行の `ordinal`* | 🔄 *外す。配列の順で持ち、書き出しも配列の順にする（`DFC-3585` も消える）* |
| 🔄 *3* | 🔄 *例外の行の鍵（暦を編集する前と後で、同じ行を見分ける）* | 🔄 *`Exception.ordinal`* | 🔄 *JSON から外し、GRS の中だけの鍵にする。文書には書かない* |
| 🔄 *4* | 🔄 *持ち越した一覧の行の位置（GRS が行にしない `Task` など。UID 0 の要約タスクを含む）* | 🔄 *一覧の中の添字* | 🔄 *GRS の群の 1 つの配列に移し、各行を「GRS の包み ＋ MSPDI の中身」で持つ: `{ "collection": "Tasks", "afterUid": 12, "element": { MSPDI のキーのまま } }`。`afterUid` は直前の、GRS が行にした要素の uid。UID 0 の要約タスクは一覧の先頭と決める（`MR-4`）。`DFC-3586` も消える* |

🔄 *推奨の形で、あなたの 3 つの例がどうなるか（暦の例外の行で）:*

| 🔄 *例* | 🔄 *書き出しの順* | 🔄 *失う物* |
|:---|:---|:---|
| 🔄 *1,2,3,4（そのまま往復）* | 🔄 *配列の順 = 元の順* | 🔄 *無い* |
| 🔄 *1,2,4,5（真ん中を消した）* | 🔄 *配列から消えるだけ。番号を持たないので、飛びも生まれない* | 🔄 *無い* |
| 🔄 *1,2,5,4（順が食い違う）* | 🔄 *配列の順。番号を持たないので、食い違いが生まれない* | 🔄 *無い* |

🔄 *持ち越した一覧の行は、`afterUid` が指す行の後に戻ります。その行が消えたときは、さらに前の行の後に戻します（その決めは仕様に書きます）。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *上の表のとおり、1 と 2 は外し、3 は GRS の中だけの鍵にし、4 は `afterUid` の包みに替える* |
| 🔄 *b* | 🔄 *4 つとも `ordinal` を残し、役目ごとに名を分ける（例: `mspdiPosition`・`exceptionKey`・`collectionIndex`）。順を 2 か所に書く所は残る（`SSOT`）* |
| 🔄 *c* | 🔄 *今のまま* |

回答:

### [proj] 🔄 *プロジェクト（❓ 1）*

#### 🔄 *✅ 問 6-8-5. プロジェクトの 24 語 —— 推奨の表のとおりでよいか*

🔄 *決まりました（`JDG-3569`）。答えは決定事項にあります。*

#### 🔄 *✅ 問 6-8-19. スケジュールデータのタイムゾーンの置き場 —— MSPDI に無い値を、MSPDI の実体の中に置くか、GRS の群へ移すか*

🔄 *問 6-13-3 にまとめました（15 か所の根拠の表と、移す範囲の案 a〜c）。*

#### 🔄 *❓ 問 6-8-6. キーに持ち主の名を繰り返さない決まり —— すべての物に当てるか*

🔄 *場面: 問 6-8-5 で、あなたは b を選び、8-19 だけに ★ を書きました。表の 23 語は確定しました（`JDG-3569`）。前回の案 a に入れた決まり「キーに持ち主の名を繰り返さない」は、まだ決まっていません。前々回、あなたは「Project.titleって形になるのか？ 他も同様。projectTitleにする必要はないよね？」と書きました。*

🔄 *下のコードブロックの 1・2 行目が変わった。*
```json
{ "project": { "title": "新製品の開発" } }
{ "project": { "projectTitle": "新製品の開発" } }
```

- 🔄 *上が決まりに従う形、下が持ち主の名を繰り返す形です。*
- 🔄 *参照のキーは、指す相手の名を持ちます（`taskUid`・`resourceUid`）。*
- 🔄 *今の GRS JSON で決まりから外れて見えるのは `resourceType` だけです。`xxxType` の前の語は「何を分ける型か」を言い（`JDG-3564`）、担当の所でだけ持ち主の名と重なります。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *すべての物に当てる。キーは持ち主の名を繰り返さず、参照のキーだけが相手の名を持つ。`xxxType` の前の語は「何を分けるか」を言うので、`resourceType` はこの決まりの外とする* |
| 🔄 *b* | 🔄 *当てない。物ごとに決める* |

回答:

### [color] 🔄 *色（❓ 3）*

#### 🔄 *❓ 問 6-6-4-10. 線の形 —— 線の太さを線の中に入れるか*

🔄 *場面: 今の形は、線の色 `strokeColor` と太さ `strokeWidthPx` を平らに持ち、太さを必ず書きます。線を描かないタスクにも、太さが残ります。問いは、太さを線の型の中に入れるかです。*

🔄 *前回、あなたは「jsonの具体例をコードブロックに出せ。」と答えました。下の例は、どれも 2 本のバーを描きます: タスク 7（赤で塗り、縁を描かない）と、タスク 8（赤で塗り、紫の縁を太さ 2 と不透明度 70% で描く）。*

🔄 *案 a（線の型が色・不透明度・太さを持つ）:*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12・13 行目が変わった。*
```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill": { "color": { "type": "palette", "name": "red" } }
    } },
  { "taskUid": 8,
    "style": {
      "taskShape": "rectangle",
      "fill":   { "color": { "type": "palette", "name": "red" } },
      "stroke": { "color": { "type": "palette", "name": "purple" }, "opacityPercent": 70, "widthPx": 2 }
    } }
]
```

🔄 *案 b（塗りも線も同じ型を取り、太さを外に置く）:*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12・13・14・15 行目が変わった。*
```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill": { "color": { "type": "palette", "name": "red" } },
      "strokeWidthPx": 1
    } },
  { "taskUid": 8,
    "style": {
      "taskShape": "rectangle",
      "fill":   { "color": { "type": "palette", "name": "red" } },
      "stroke": { "color": { "type": "palette", "name": "purple" }, "opacityPercent": 70 },
      "strokeWidthPx": 2
    } }
]
```

🔄 *案 c（線の中に塗りの型を入れ子にする）:*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12・13 行目が変わった。*
```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill": { "color": { "type": "palette", "name": "red" } }
    } },
  { "taskUid": 8,
    "style": {
      "taskShape": "rectangle",
      "fill":   { "color": { "type": "palette", "name": "red" } },
      "stroke": { "paint": { "color": { "type": "palette", "name": "purple" }, "opacityPercent": 70 }, "widthPx": 2 }
    } }
]
```

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *線の型 `Stroke { color, opacityPercent, widthPx }` を作る（2 段）。線を描かないタスクは `stroke` ごと省き、太さも書かずに済む（`NullTrap`・`OMPV`: 描かない線の太さという、意味を持たない値が消える）。塗りは `Paint { color, opacityPercent }`。W3C のデザイントークンの border 型も、色と太さを 1 つの型に入れる（`{ color, width, style }`）* |
| 🔄 *b* | 🔄 *塗りも線も `Paint` を取り、太さは外の `strokeWidthPx` に置く（今の置き方。SVG の `stroke-width` と同じ）。線を描かないタスク 7 も、太さ 1 を書く* |
| 🔄 *c* | 🔄 *`Stroke { paint, widthPx }`。色は `stroke.paint.color` と 3 段になる* |

回答:

#### 🔄 *❓ 問 6-6-4-11. 3 つの型で、塗りと線の形を共にするか*

🔄 *場面: タスク・コメントボックス・ハイライトボックスの `style` が、塗りと線を持ちます。必ず持つ欄は物ごとに違います: コメントボックスは塗り・枠・文字を必ず持ち、ハイライトボックスは塗りを必ず持ち、タスクは塗りも縁も省けます。案 a と案 b で、ファイルの中身は同じです。違いは、スキーマ（形の決まり）の書き方だけです。*

🔄 *前回、あなたは「jsonの具体例をコードブロックに出せ」と答えました。まず、どちらの案でも同じファイルの中身です（ほかのキーは省きました）。*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12・13・14・15・16・17 行目が変わった。*
```json
"taskStyles": [
  { "taskUid": 7,
    "style": { "taskShape": "rectangle", "fill": { "color": { "type": "theme" } } } }
],
"commentBoxes": [
  { "id": "3f2b8c1e-7a4d-4e9b-9c61-2d5a8e0f4b17",
    "text": "Confirm the date",
    "style": {
      "fill":   { "color": { "type": "palette", "name": "yellow" } },
      "stroke": { "color": { "type": "theme" }, "widthPx": 1 },
      "textColor": { "type": "palette", "name": "dimGray" }
    } }
],
"highlightBoxes": [
  { "id": "b81d0e52-6c3a-4f17-a2e9-5c04d7f13a68",
    "style": { "fill": { "color": { "type": "palette", "name": "yellow" }, "opacityPercent": 30 } } }
]
```

🔄 *案 a のスキーマ（`Paint`・`Stroke` だけを共にし、3 つの型が自分の欄を全部書く）:*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12・13・14・15・16・17・18 行目が変わった。*
```json
"$defs": {
  "TaskStyle": {
    "properties": {
      "taskShape": { "enum": ["rectangle", "chevron", "arrow", "endpointSpan"] },
      "fill":   { "$ref": "#/$defs/Paint" },
      "stroke": { "$ref": "#/$defs/Stroke" } } },
  "CommentBoxStyle": {
    "required": ["fill", "stroke", "textColor"],
    "properties": {
      "fill":   { "$ref": "#/$defs/Paint" },
      "stroke": { "$ref": "#/$defs/Stroke" },
      "textColor": { "$ref": "#/$defs/Color" } } },
  "HighlightBoxStyle": {
    "required": ["fill"],
    "properties": {
      "fill":   { "$ref": "#/$defs/Paint" },
      "stroke": { "$ref": "#/$defs/Stroke" } } }
}
```

🔄 *案 b のスキーマ（`ShapeStyle` を 3 つの型で共にし、違いを各型に足す）:*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12・13・14・15・16・17・18・19 行目が変わった。*
```json
"$defs": {
  "ShapeStyle": {
    "properties": {
      "fill":   { "$ref": "#/$defs/Paint" },
      "stroke": { "$ref": "#/$defs/Stroke" } } },
  "TaskStyle": {
    "allOf": [ { "$ref": "#/$defs/ShapeStyle" } ],
    "properties": { "taskShape": { "enum": ["rectangle", "chevron", "arrow", "endpointSpan"] } },
    "unevaluatedProperties": false },
  "CommentBoxStyle": {
    "allOf": [ { "$ref": "#/$defs/ShapeStyle" } ],
    "required": ["fill", "stroke", "textColor"],
    "properties": { "textColor": { "$ref": "#/$defs/Color" } },
    "unevaluatedProperties": false },
  "HighlightBoxStyle": {
    "allOf": [ { "$ref": "#/$defs/ShapeStyle" } ],
    "required": ["fill"],
    "unevaluatedProperties": false }
}
```

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *型 `Paint`・`Stroke` だけを共にし、どの欄を必ず持つかは型ごとに書く（`ISP`: 型ごとに要る欄だけを持つ）。1 つの型を読めば、その物の欄が全部わかる* |
| 🔄 *b* | 🔄 *`ShapeStyle { fill, stroke }` を 3 つの型で共にし、必ず持つ欄の違いは各型の足しの決まり（`allOf`）で書く（`DRY`）。型を読む人は `ShapeStyle` も読む。余分なキーを断るには `unevaluatedProperties` が要る* |

回答:

#### 🔄 *❓ 問 6-6-4-8. テーマの色の役割 —— 置き場で決めるか、値に書くか*

🔄 *場面: `{"type": "theme"}` の色は、テーマが置き場ごとに決める色です（要素 4）。例えば、テーマはタスクの塗りに予定バーの塗りの色（`S-155`）を、ハイライトボックスの枠に注記の色（`S-312`、橙）を決めます。別の AI の案は、どの役の色かを値に書きます。問いは、この「役」を GRS が置き場から読むか、ファイルの値に書くかです。*

🔄 *前回、あなたは「質問の意味がわからない。 具体例を求む。」と答えました。下の例は、どれもタスク 7 のバーとハイライトボックス 1 つを、テーマの色で描きます。*

🔄 *案 a（置き場が役を決める）:*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12・13・14・15 行目が変わった。*
```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill":   { "color": { "type": "theme" } },
      "stroke": { "color": { "type": "theme" }, "widthPx": 1 }
    } }
],
"highlightBoxes": [
  { "id": "b81d0e52-6c3a-4f17-a2e9-5c04d7f13a68",
    "style": {
      "fill":   { "color": { "type": "theme" }, "opacityPercent": 30 },
      "stroke": { "color": { "type": "theme" }, "widthPx": 1 }
    } }
]
```

🔄 *GRS は置き場を見ます。タスクの塗りは予定バーの塗りの色で、ハイライトボックスの枠は注記の色で描きます。ファイルは同じ `{"type": "theme"}` を書きます。*

🔄 *案 b（値に役を書く）:*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12・13・14・15 行目が変わった。*
```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill":   { "color": { "type": "theme", "role": "planBar" } },
      "stroke": { "color": { "type": "theme", "role": "annotation" }, "widthPx": 1 }
    } }
],
"highlightBoxes": [
  { "id": "b81d0e52-6c3a-4f17-a2e9-5c04d7f13a68",
    "style": {
      "fill":   { "color": { "type": "theme", "role": "planBar" }, "opacityPercent": 30 },
      "stroke": { "color": { "type": "theme", "role": "annotation" }, "widthPx": 1 }
    } }
]
```

🔄 *GRS は値の `role` を見ます。この例では、タスク 7 の縁を注記の橙で描きます。b は、置き場と別の役の色を選ぶ道を開きます。役の名 `planBar`・`annotation` は仮の名です。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *置き場が役を決める（今の形）。値には `{"type": "theme"}` だけを書く。1 つの値が 1 つの意味を持つ（`OMPV`）。ファイルは、置き場と役の食い違いを書けない* |
| 🔄 *b* | 🔄 *値に役を書く（`{"type": "theme", "role": "annotation"}`）。どの置き場でも、ほかの役のテーマの色を使える。役の名の一覧を、外との約束として持つ* |

回答:

### [root] 🔄 *スケジュールデータと文書の根 ✅*

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

### [task] 🔄 *タスクと依存 ✅*

#### ✅ 問 6-9-8. `dependencies` —— MSPDI の名 PredecessorLink と違う名を保つか

決まりました（`JDG-3604`）。答えは決定事項にあります。

### [tg] 🔄 *タスクグループ ✅*

***

## ❓ 自由

答えを読んで、ほかに聞きたいこと・違うと思う所があれば、ここに書いてください。

回答:
