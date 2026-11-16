BGQA3
# GRS JSON の名（名の辞書 3）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA3 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

2026-11-15 に作った。BGQA2（名の辞書）が大きくなりすぎたので、あなたの指示で約束の面ごとに分けた（`JDG-3568`）。この紙は GRS JSON の名を受け持つ。文書の命令は BGQA4、Agent API は BGQA5 が受け持ち、GRS JSON の名が決まった後に出す。決まりと、これまでの決定事項は BGQA2（`goodrelax-qa-b2-glossary.md`）にある。

🔄 *残 4（❓ で検索）*

1 回目は、ほかの名に効く 10 問です: キーの付け方の決まり、根の並びと呼び名、順番の数、色の形、MSPDI と違う名を保つかの 2 問。残りの GRS JSON の問い（21）は、答えの後で 10 問前後ずつ出します。

2026-11-15 の 2 回目: 1 回目のあなたの答えで 4 問が決まりました（`JDG-3569`・`JDG-3602`〜`JDG-3604`）。説明と例を求めた問いは、JSON の例をコードブロックに入れて書き直しました。新しく、パレットの paper と ink（問 6-6-4-12）、タイムゾーンの置き場（問 6-8-19）、キーの付け方の決まり（問 6-8-6）、画面の欄の名（問 6-13-2）、MSPDI の名と違う語（問 6-9-5・6-7-7）を足しました。

2026-11-15 の 3 回目: あなたの求めに合わせ、GRS JSON の構造図と分け方の考え（問 6-13-3）を、問いの先頭に置きました。ほかの問いは 2 回目のままです。

2026-11-15 の 4 回目: 問 6-13-3 に、15 か所の GRS だけの値を 1 つずつ照らした根拠の表を足し、問 6-8-19 をそこへまとめました。ほかの問いは 2 回目のままです。

2026-11-15 の 5 回目: 問 6-13-3 が決まり（`JDG-3605`）、プロパティの名を併記した構造図に描き直しました。新しく、Project から移す 7 つの値の入れ物の名（問 6-13-4）を問います。

2026-11-15 の 6 回目: あなたの指示「影響が大きいものだけ最初に問え」に従い、ほかの名や形に広く効く 6 問だけを、影響の大きい順に出します: 持ち越しの形（問 6-7-8）、`ordinal` の 4 つの役目（問 6-7-6）、キーに持ち主の名を繰り返さない決まり（問 6-8-6）、色の形の 3 問（問 6-6-4-10・6-6-4-11・6-6-4-8）。1 つの名だけに効く 7 問は、出す前の置き場へ戻しました。

🔄 *2026-11-17 の 7 回目: 3 問が決まりました（`JDG-3606`〜`JDG-3608`）。続きを求めた 3 問に答えました: `ordinal` は JSON から無くせること（問 6-7-6）、命名の決まりと例外（問 6-8-6）、`allOf` の意味と JSON のデータ（問 6-6-4-11。推奨を b に改めた）。構造図は、残りの 3 問が決まった後に、まとめて描き直します。*

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

| 🔄 *何* | 🔄 *決め* | 🔄 *裁定* |
|:---|:---|:---|
| 🔄 *持ち越しの形（問 6-7-8）* | 🔄 *各実体の `passthrough` 1 つに、MSPDI の構造と要素の名のまま持つ。繰り返せる要素はいつも配列。`ordinal` は持たず、書き出しは XSD の順と配列の順* | 🔄 *`JDG-3606`* |

### [color] 色

| 🔄 *何* | 🔄 *決め* | 🔄 *裁定* |
|:---|:---|:---|
| 🔄 *線と塗りの形（問 6-6-4-10）* | 🔄 *塗りは `fill`（`Paint { color, opacityPercent }`）、線は `stroke`（`Stroke { color, opacityPercent, widthPx }`）。線を描かないときは太さも書かない* | 🔄 *`JDG-3607`* |
| 🔄 *テーマの色の役割（問 6-6-4-8）* | 🔄 *置き場が役割を決め、値には `{"type": "theme"}` だけを書く* | 🔄 *`JDG-3608`* |

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

### [key] 🔄 *共通のキー（❓ 1）*

#### 🔄 *✅ 問 6-7-8. 持ち越しの形 —— MSPDI の構造とキーのまま持つか*

🔄 *決まりました（`JDG-3606`）。答えは決定事項にあります。*

#### 🔄 *❓ 問 6-7-6. `ordinal` —— JSON から無くしてよいか*

🔄 *場面: 前回、あなたは「ordinal 自体をなくせないか？ JSONの配列は順序をもつが、それで足りないものは何か？」と問いました。*

🔄 *答え: 無くせます。推奨の a を採れば、GRS JSON に `ordinal` は 1 つも残りません。配列の順で足りないのは、次の 2 つだけです。*

| 🔄 *#* | 🔄 *配列の順で足りない物* | 🔄 *理由* | 🔄 *代わりの持ち方* |
|:---|:---|:---|:---|
| 🔄 *1* | 🔄 *別の配列にある物との前後* | 🔄 *GRS が行にしない `Task`（UID 0 の要約タスクなど）は `tasks[]` に入らない。`tasks[]` の順だけでは、その行をどのタスクの後へ戻すか分からない* | 🔄 *`afterUid`（直前のタスクの uid）。順番の数ではなく、隣の行を指す参照* |
| 🔄 *2* | 🔄 *編集の前と後で、同じ行を見分ける鍵* | 🔄 *暦の例外は MSPDI で UID を持たない。編集で行を足し引きすると、配列の位置がずれる* | 🔄 *GRS の中だけの鍵。文書には書かない* |

🔄 *推奨の形（暦の例外と、持ち越した一覧の行）:*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8 行目が変わった。*
```json
"calendars": [
  { "uid": 1, "name": "標準",
    "exceptions": [
      { "fromDate": "2026-12-29", "toDate": "2027-01-03", "name": "年末年始" },
      { "fromDate": "2027-05-03", "toDate": "2027-05-05", "name": "大型連休" } ] } ],
"passthroughRows": [
  { "collection": "Tasks", "afterUid": 0, "element": { "UID": "0", "Name": "新製品の開発", "OutlineLevel": "0" } }
]
```

- 🔄 *例外の順は、配列の順そのものです。消せば配列から消えるだけで、番号の飛びも食い違いも生まれません。*
- 🔄 *`passthroughRows` の 1 行は、GRS の包み（`collection`・`afterUid`）と、MSPDI のままの中身（`element`）でできています。`afterUid` が 0 の行は一覧の先頭に戻します（`MR-4` の要約タスク）。包みの配列の名 `passthroughRows` は仮の名です。*

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 🔄 *JSON から `ordinal` を無くす。順は配列で持ち、別の配列との前後は `afterUid`、編集の前後の鍵は GRS の中だけで持つ* |
| b | 🔄 *持ち越した一覧の行を、`tasks[]` などの同じ配列に混ぜて置き、配列の順だけで位置を持つ。`afterUid` は要らないが、1 つの配列に 2 種の物が並ぶ（`OKPN` に外れる）* |
| c | 🔄 *今のまま `ordinal` を持つ* |

回答:

### [proj] プロジェクト（❓ 1）

#### ✅ 問 6-8-5. プロジェクトの 24 語 —— 推奨の表のとおりでよいか

決まりました（`JDG-3569`）。答えは決定事項にあります。

#### ✅ 問 6-8-19. スケジュールデータのタイムゾーンの置き場 —— MSPDI に無い値を、MSPDI の実体の中に置くか、GRS の群へ移すか

問 6-13-3 にまとめました（15 か所の根拠の表と、移す範囲の案 a〜c）。

#### 🔄 *❓ 問 6-8-6. GRS JSON の命名の決まり —— この決まりと例外でよいか*

🔄 *場面: 前回、あなたは「a が良さそうな気がするが、 JSONの命名ルールを明文化しろ。 その上で例外があれば列挙せよ。 例外を認めないといけない場合も列挙し、例外ルールも明文化しろ。 特にtype, kind, id uidの議論を踏まえてどうするべきか？」と書きました。今の GRS JSON のキーを数えて、決まりと例外を書きました。*

🔄 ***命名の決まり（N-1〜N-12）:***

| 🔄 *#* | 🔄 *決まり* | 🔄 *例* | 🔄 *根拠* |
|:---|:---|:---|:---|
| 🔄 *N-1* | 🔄 *キーは小文字で始まる camelCase、型の名は大文字で始まる PascalCase* | 🔄 *`startDate`・`Task`* | 🔄 *JSON と JavaScript の慣例* |
| 🔄 *N-2* | 🔄 *名は、指すものを言う。略さない* | 🔄 *`parentTaskProgressToleranceWorkingDays`* | 🔄 *`JDG-820`・`NEIM`* |
| 🔄 *N-3* | 🔄 *MSPDI から来た値は、MSPDI の名を camelCase にした名を使う* | 🔄 *`UID` → `uid`、`StartDate` → `startDate`* | 🔄 *`JDG-3563` の 1)・往復* |
| 🔄 *N-4* | 🔄 *キーに持ち主の名を繰り返さない* | 🔄 *`project.title`（`projectTitle` にしない）* | 🔄 *問 6-8-6 の a* |
| 🔄 *N-5* | 🔄 *別の実体を指す参照は「相手の名 ＋ `Uid` か `Id`」* | 🔄 *`taskUid`・`taskGroupId`・`parentTaskUid`* | 🔄 *指す先と、指す先の識別子の種類が名で分かる* |
| 🔄 *N-6* | 🔄 *識別子は 2 つだけ: MSPDI から来た実体は `uid`（整数 1〜2^31−1）、GRS 固有の実体は `id`（ランダムな UUID 版 4）* | 🔄 *`Task.uid`・`TaskGroup.id`* | 🔄 *`JDG-3557`・`JDG-3564`・`JDG-3565`* |
| 🔄 *N-7* | 🔄 *自分の欄の組を選ぶ判別子は `type`。形を変えない分類や、別の物の型は `xxxType`。`kind` は使わない* | 🔄 *`Color.type`・`linkType`・`Refusal.commandType`* | 🔄 *`JDG-3563`・`JDG-3564`* |
| 🔄 *N-8* | 🔄 *配列は複数形。参照の配列は `…Uids` か `…Ids`* | 🔄 *`tasks`・`predecessorLinks`・`shownTaskUids`* | 🔄 *1 つと多数を名で見分ける* |
| 🔄 *N-9* | 🔄 *真偽の値は `is…`（または `has…`）で始める* | 🔄 *`isFixed`・`isPlanBarVisible`* | 🔄 *値が真偽だと名で分かる* |
| 🔄 *N-10* | 🔄 *量は単位で終える* | 🔄 *`…Px`・`…Percent`・`…Degrees`・`…WorkingDays`・`…CalendarDays`* | 🔄 *単位の取り違えを防ぐ* |
| 🔄 *N-11* | 🔄 *GRS が決める時刻は `…At`（UTC の瞬間）で終える* | 🔄 *`changedAt`・`fileSavedAt`* | 🔄 *MSPDI の日付の名（N-3）と分ける* |
| 🔄 *N-12* | 🔄 *「無い」は、キーを書かないこと 1 つで言う。`null` は使わない* | 🔄 *—* | 🔄 *`NullTrap`・`JDG-3309`* |

🔄 ***決まりに外れるキー（今ある例外）:***

| 🔄 *#* | 🔄 *キー* | 🔄 *外れる決まり* | 🔄 *例外にする理由* |
|:---|:---|:---|:---|
| 🔄 *E-1* | 🔄 *`passthrough` の中のキー（`Priority`・`ExtendedAttribute` など）* | 🔄 *N-1・N-3* | 🔄 *MSPDI の要素の名を、そのまま預かる所だから（`JDG-3606`）* |
| 🔄 *E-2* | 🔄 *`$schema`* | 🔄 *N-1* | 🔄 *JSON Schema の決まった名だから* |
| 🔄 *E-3* | 🔄 *`resourceType`* | 🔄 *N-4* | 🔄 *`xxxType` の前の語は「何を分ける型か」を言い（N-7）、担当の所でだけ持ち主の名と重なる* |
| 🔄 *E-4* | 🔄 *`Project.uid` が文字列* | 🔄 *N-6* | 🔄 *MSPDI の Project/UID が文字列（16 字まで）だから* |
| 🔄 *E-5* | 🔄 *`startDate`・`statusDate`・`creationDate` が時刻も持つ* | 🔄 *N-11* | 🔄 *MSPDI の名だから（N-3 が N-11 より強い）* |
| 🔄 *E-6* | 🔄 *MSPDI と名が違う、MSPDI 由来のキー（`predecessorLinks`・`dayType`・`recurrenceType`・`linkType`・`resourceType`・`parentTaskUid`）* | 🔄 *N-3* | 🔄 *意味の文に、MSPDI の名と違う理由を 1 文で書く（`JDG-3548`）* |

🔄 ***例外の決まり（例外を認める場合を、この 4 つに限る）:***

| 🔄 *#* | 🔄 *例外を認める場合* | 🔄 *書き方* |
|:---|:---|:---|
| 🔄 *X-1* | 🔄 *外の決まりが名を決めている（MSPDI の要素の名、JSON Schema の名）* | 🔄 *外の名をそのまま使う。外の決まりが GRS の決まりより強い* |
| 🔄 *X-2* | 🔄 *MSPDI の名が、GRS の決まりと食い違う* | 🔄 *MSPDI の名を使い（N-3 が勝つ）、食い違いを意味の文に書く* |
| 🔄 *X-3* | 🔄 *2 つの GRS の決まりが同じキーでぶつかる* | 🔄 *何を言うかを優先する（N-2 が勝つ）。どちらを選んだかを裁定に書く* |
| 🔄 *X-4* | 🔄 *MSPDI の名では意味が分からない、または向きを言わない* | 🔄 *意味の名を使い、MSPDI の名を意味の文に書く（E-6）* |

- 🔄 *例外のキーは、辞書の意味の文に「どの例外か（E-n）と理由」を書きます。*
- 🔄 *この表に無い例外は、作りません。新しい例外が要るときは、裁定を取ってから表に足します。*

🔄 ***今の名で、決まりに照らして見直したい所（この答えの後で問います）:** `sourceProjectId`（MSPDI の Project を指すので N-5・N-6 では `…Uid`）、`importSessionId`（実体でなく取り込み 1 回の印）、`laneFraction` などの `…Fraction`（N-10 の単位で終わらない。`JDG-3529` で `…Percent` に直す予定）。*

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 🔄 *上の決まり N-1〜N-12、例外 E-1〜E-6、例外の決まり X-1〜X-4 を採る。名の辞書の「決まり」の群に入れ、スキーマの頭からも引く* |
| b | 🔄 *直す所に ★ を書く* |

回答:

### [color] 🔄 *色（❓ 1）*

#### 🔄 *✅ 問 6-6-4-10. 線の形 —— 線の太さを線の中に入れるか*

🔄 *決まりました（`JDG-3607`）。答えは決定事項にあります。*

#### 🔄 *❓ 問 6-6-4-11. 3 つの型で、塗りと線の形を共にするか —— `allOf` の意味と、JSON のデータ*

🔄 *場面: 前回、あなたは「allOf ってなに？ スキーマ専用？ JSONデータ自体は変わるの？ 色関係は1つに束ねた方が、処理を共通化しやすいのでは？」と問いました。*

🔄 ***`allOf` とは:** JSON Schema の言葉で、「並べたスキーマを、すべて満たせ」という意味です。スキーマの書き方だけに使い、JSON のデータには出てきません。*

🔄 ***JSON のデータは、案 a でも案 b でも同じです**（線と塗りは問 6-6-4-10 の a で決まった形）:*

🔄 *下のコードブロックの 1・2・4・5・6・7 行目が変わった。*
```json
"commentBoxes": [
  { "id": "6f1c…", "text": "要確認",
    "style": {
      "fill":   { "color": { "type": "theme" }, "opacityPercent": 0 },
      "stroke": { "color": { "type": "theme" }, "widthPx": 1 },
      "textColor": { "type": "palette", "name": "ink" },
      "fontSizePx": 12 } } ]
```

🔄 *違うのは、スキーマの書き方だけです。*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12 行目が変わった。*
```json
"案 a（型ごとに書く。部品の Paint と Stroke だけを共にする）": {
  "CommentBoxStyle": { "required": ["fill", "stroke", "textColor"],
    "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" },
                    "textColor": { "$ref": "#/$defs/Color" }, "fontSizePx": { "type": "integer" } } }
},
"案 b（形の型 ShapeStyle を共にし、型ごとの足しを allOf で書く）": {
  "ShapeStyle": { "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" } } },
  "CommentBoxStyle": { "allOf": [
    { "$ref": "#/$defs/ShapeStyle" },
    { "required": ["fill", "stroke", "textColor"],
      "properties": { "textColor": { "$ref": "#/$defs/Color" }, "fontSizePx": { "type": "integer" } } } ] }
}
```

🔄 ***色を 1 つに束ねる件:** どちらの案でも、色の値はもう束ねてあります。塗りはいつも `Paint`、線はいつも `Stroke`、色はいつも `Color` です。ですから、塗りと線を描く処理は、どちらの案でも 1 つの関数で共にできます。案 b は、その一段上の「形の見た目（塗り ＋ 線）」も 1 つの型 `ShapeStyle` にまとめます。処理の入口も 1 つになり、あなたの言う「処理を共通化しやすい」形にいちばん近くなります。*

| 案 | 中身 |
|:---|:---|
| 🔄 ***b（推奨）*** | 🔄 *前回の推奨 a から、b に改めます。`ShapeStyle { fill, stroke }` を 3 つの型（タスク・コメントボックス・ハイライトボックス）で共にし、型ごとの足し（タスクの形、コメントボックスの文字の色と大きさ、ハイライトボックスの角の丸み）と、必ず持つ欄を `allOf` で書く。JSON のデータは a と同じ* |
| 🔄 *a* | 🔄 *部品の `Paint`・`Stroke`・`Color` だけを共にし、3 つの見た目の型を別々に書く（`ISP`: 型ごとに要る欄だけを持つ）。JSON のデータは b と同じ* |

回答:

#### 🔄 *✅ 問 6-6-4-8. テーマの色の役割 —— 置き場で決めるか、値に書くか*

🔄 *決まりました（`JDG-3608`）。答えは決定事項にあります。*

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
