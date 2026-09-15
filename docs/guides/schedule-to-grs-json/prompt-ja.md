# 日程の画像・スライド・表を GRS JSON に変える AI プロンプト

作図ソフト（PowerPoint など）や表計算ソフト（Excel など）で描いた日程表、またはその画面の画像を AI に渡し、GRS で開ける `GRS JSON` を作らせるためのプロンプトです。
色・グラデーション・形状・フェード・横並びを、できるだけ元の日程に合わせます。
英語版は [prompt-en.md](prompt-en.md) です。

## 使い方

1. 次の 2 つのファイルをダウンロードします。リンクを開き、ファイルの画面にあるダウンロードのボタン（Download raw file）を押します。git は要りません。
   - [grs-skeleton.json](grs-skeleton.json)（空の GRS 文書。スキーマに照らして通ることを確かめてある）
   - [grs-document.schema.json](../../spec/_source/grs-document.schema.json)（GRS JSON の形の正）
2. AI（画像とファイルを読めるもの）に、変えたい日程（画像・スライドのファイル・表のファイル、どれでも可。複数でも可）と、1. の 2 つのファイルを添付します。
3. 下の「プロンプト」のブロックをそのまま貼ります。`［ ］` の所は書き換えます。
4. AI が返した JSON を `〜.json` として保存し、GRS の開く操作で開きます。
5. AI が挙げた「推定したこと」の表を見て、主な日付・色・行の分け方を原本と照らします。

⚠️ `sample-schedule/` の JSON を土台に使わないでください。いまのスキーマから外れています（2026-09-16 に照合）。土台は `grs-skeleton.json` です。

## プロンプト

````text
あなたは日程表の読み取りと変換の専門家です。添付した日程（画像・スライド・表）を読み、GRS というガントチャートのツールで開ける「GRS JSON」を 1 つ作ってください。日付だけでなく、色・グラデーション・形状・フェード・横並びも、できるだけ元の日程に合わせてください。

# 添付
- 日程の原本: ［ファイル名。複数なら全部］
- grs-skeleton.json: 空の GRS 文書。これを土台にする
- grs-document.schema.json: 形の正（JSON Schema 2020-12）。添付があればこれに厳密に従う

# 前提
- 基準の年: ［原本に年が書かれていないときの年。例 2026］
- 休日: ［土日休み など。書かなければ grs-skeleton.json の暦（月〜金が稼働）のまま］
- 行の分け方の希望: ［例 原本の左端の見出しを行にする／担当ごとに行にする。無ければ原本の見た目どおり］
- 色の合わせ方: ［パレット／自由。書かなければパレット］
  - パレット: 色は "white" "black" "dimgray"（濃い灰色）"lightgray"（薄い灰色）"red" "blue" "yellow" "green" "orange" "purple" "transparent"（透明）の 11 語から、原本に最も近いものを選ぶ。GRS の中で後から色を選び直せる
  - 自由: 上の 11 語に加えて "#RRGGBB" の形の色も使ってよい。原本に近くなるが、GRS の色の選び肢には無い色になる

# 作り方
1. grs-skeleton.json を丸ごと写し、次の所だけを書き換える。それ以外の値（documentSettings・calendars・schemaVersion など）は変えない。
   - schedule.project の name / title / startDate / statusDate / themeHue / uidHighWaterMark
   - schedule.tasks / taskGroups / taskGroupMembers / taskVisuals
   - 担当者が読み取れたときだけ schedule.resources / assignments
   - documentStamp の lastEditedBy（"ai-conversion" のままでよい）
2. スキーマの決まり
   - どのオブジェクトも、スキーマの required の鍵をすべて持ち、スキーマに無い鍵を持たない（additionalProperties は false）。値が無いときは null にする（型が null を許す鍵だけ）。
   - carry は {}、carryElements は [] にする（tasks・dependencies・resources・assignments・calendars・project すべて）。
   - 日付と日時は "YYYY-MM-DDT00:00:00" の形の文字列にする（時刻は常に 00:00:00）。documentStamp だけは "YYYY-MM-DDTHH:MM:SSZ"。
   - 日付は 1970-01-01 から 2200-12-31 の間にする。
3. 行（taskGroups）
   - 原本の見出しの 1 行を 1 つの TaskGroup にする。id は小文字の UUID（例 "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01"）で、文書の中で重ならないようにする。
   - label に見出しの文字を入れる。derivedFromTaskUid は null。
   - 入れ子の見出しは parentId に親の id を入れる。
   - order は同じ親の下での上からの並び（0 から）。isCollapsed と isHidden は false、height は null。
   - color は原本の行の帯（背景）の色。「色の合わせ方」に従って選ぶ。帯に色が無ければ null。
   - TaskGroup は必ず 1 つ以上置く。
4. 横並びを保つ（重要）
   - GRS は 1 つの行の中のタスクを、開始日の早い順に、重ならない一番上の段へ自動で積む。そのため原本で横一列に並んでいた物が、同じ行の別の物に押されて段が崩れることがある。これを防ぐため、次のようにする。
   - 原本の見出しの行の中で、タスクまたはマイルストーンが 2 つ以上、同じ高さに横一列に並んでいたら、それを 1 本の並びとする。形状が違ってもよい（バーと ◇ が同じ高さに並んでいれば、まとめて 1 本の並び）。
   - 並び 1 本ごとに、見出しの行の 1 段下に子の行（parentId が見出しの行の id の TaskGroup）を作り、並びの物をすべてその子の行に載せる。子の行には、その並びの物だけを載せる。
   - 子の行の order は、原本で上にある並びから 0, 1, 2 … と振る。
   - 子の行の label は、その並びに載る物を一言で要約した語にする。原本が日本語なら 2 語まで（例「承認」「設計レビュー」）、英語なら 3 語まで（例 "Approvals"、"Design reviews"）。derivedFromTaskUid は null。
   - 見出しの行にその並びしか無いときは、子の行を作らず、見出しの行にそのまま載せる。
   - 行の深さ（根の行を 1 と数える）は 3 までにする。深さ 4 以上の行は、既定の縦の倍率では GRS に描かれない。子の行が深さ 4 になるときは、子の行にせず、見出しの行のすぐ下に同じ深さの行として置き、そうしたことを「推定したこと」に書く。
5. タスク（tasks）
   - uid は 1 から振る整数で、重ならないようにする。
   - name は原本のバーや記号に付いた名前。読めないときは近い語を推定し、「推定したこと」に書く。
   - start と finish は予定の開始日と終了日。バーの端が斜めや薄れのときは、その部分も含めた外側の端の日にする。finish を start より前にしない。
   - マイルストーン（◇ ▼ ★ など 1 日の印）は milestone を true にし、start と finish を同じ日にする。それ以外は false。
   - wbsParentUid は、原本に親子（まとめのバーと子のバー）がはっきり描かれているときだけ親の uid を入れる。無ければ null。wbsOrder は同じ親の下での並び（0 から）。親子に輪を作らない。
   - 実績が描かれているとき（予定と別のバー、塗りつぶし、完了の印など）:
     - 完了: actualStart と actualFinish に日付、stop は null、percentComplete は 100。
     - 進行中: actualStart と stop（いま実績が届いている最後の日）に日付、actualFinish は null、percentComplete は読み取れた値（読めなければ null）。
     - 未着手・実績が描かれていない: actualStart・stop・actualFinish は null、percentComplete は null。
     - 実績の最後の日を actualStart より前にしない。
   - resume は null、resumeValid は null。deadline・notes・calendarUid は null。
   - 依存（矢印でタスクどうしがつながっている）は、後のタスクの dependencies に {"predecessorUid": 前のタスクの uid, "linkType": 1, "lag": 0, "lagFormat": 7, "carry": {}, "carryElements": []} を入れる。linkType は 0 = 終了→終了、1 = 終了→開始、2 = 開始→終了、3 = 開始→開始。lagFormat 7 は日で、lag はその日数。矢印が無ければ []。
6. フェードと、薄れていくグラデーション（fadeInDays / fadeOutDays）
   - GRS のフェードは、予定のバーの端を斜めにする印である（日付がまだ確かでないことを表す）。開始側だけなら左の辺が斜めの台形、終了側だけなら右の辺が斜めの台形、両方なら平行四辺形になる。
   - 原本のバーの端が斜め、先細り、または色のグラデーションで背景の色や透明へ薄れていくときは、開始側の斜め（薄れ）の横の長さを暦日で fadeInDays に、終了側を fadeOutDays に入れる。無い側は null。
   - フェードを付けてよいのは、形状が四角いバー（"rectangle"）か矢羽根（"chevron"）のタスクだけ。矢印・両端に点がある線・マイルストーンには付けない（null）。
   - fadeInDays と fadeOutDays は 0 以上、足して finish − start の暦日の日数を超えない。フェードを付けるタスクは finish を持つ。GRS はこれに反する文書を開かない。
   - 実績のバーにはフェードが無い。実績の斜めや薄れは読み取らない。
7. どの行に載せるか（taskGroupMembers）
   - どのタスクも、ちょうど 1 つの {"taskUid": uid, "groupId": 行の id, "stackOrder": null} から指されるようにする。原本でそのバーが描かれている行（4. で作った子の行を含む）を選ぶ。
8. 形状と色（taskVisuals）
   - どのタスクにも 1 件ずつ置く。
   - shapeKind:
     - 四角いバー（端が斜めや薄れのバーを含む）: "rectangle"
     - 矢羽根の形（>===>）: "chevron"
     - 細い線の矢印（--->）: "arrow"
     - 両端に点がある線（*----*）: "endpointSpan"
     - 記号（マイルストーン）: "milestone"。milestoneGlyph を "circle" / "hexagon" / "pentagon" / "diamond" / "square" / "star" / "triangleUp" / "triangleDown" / "file" / "box" / "floppyDisk" / "cylinder" / "person" / "smile" / "beerMug" から最も近いものにする。記号以外の形状では milestoneGlyph は null。
   - fillColor（塗り）と strokeColor（輪郭の線）は、原本の色から「色の合わせ方」に従って選ぶ。塗りが無い（輪郭だけの）バーは fillColor を "transparent"、輪郭が無いバーは strokeColor を "transparent" にする。fillColor と strokeColor を両方 "transparent" にしない。
   - 色のグラデーションは元の日程に合わせる:
     - 背景の色や透明へ薄れていくグラデーションは、濃い側の色を塗りにし、薄れる部分を 6. のフェードで表す。
     - 2 つの色のあいだのグラデーションは、バーの面積の広いほうの色（半々なら中央の色）を塗りにし、「合わせきれなかったこと」に書く。
   - 原本で最も多く使われているバーの色は null にし、代わりに project.themeHue をその色の色相（0〜359 の整数。赤 0、黄 60、緑 120、青 210 前後、紫 280 前後）にする。null の色は themeHue から作られる色になり、実績のバーや印の色もそれに揃う。原本がほぼ無彩色なら themeHue は 214 のままにする。
   - lineWeight は輪郭の太さを、原本の中で比べて "thin" / "medium" / "thick" から選ぶ。違いが見えなければ null。
   - nameAnchor と nameAlign は null（名前の置き場は GRS が決める）。
   - 1 件の形: {"taskUid": uid, "nameAnchor": null, "nameAlign": null, "shapeKind": 上の値, "milestoneGlyph": 上の値か null, "fillColor": 色か null, "strokeColor": 色か null, "lineWeight": 太さか null}
9. 担当者（読み取れたときだけ）
   - resources に {"uid": 整数, "name": 担当者名, "resourceKind": 1, "isCostResource": false, "calendarUid": null, "carry": {}, "carryElements": []}、assignments に {"uid": 整数, "taskUid": uid, "resourceUid": 担当者の uid, "carry": {}, "carryElements": []}。uid はタスクと別に 1 から振ってよい。
10. project
   - name と title に日程表の題名、startDate に最も早い予定の開始日、statusDate に原本の「今日」の線の日（無ければ null）を入れる。themeHue は 8. のとおり。uidHighWaterMark は tasks・resources・assignments で使った uid の最大値。

# 画像を読むときの決まり
- 日付は時間の目盛りから読み、日の単位に丸める。目盛りが月や週だけのときは、バーの端の位置から日を比例で推定する。
- 同じ高さに並んでいるかは、物の縦の中心の位置で判じる。わずかにずれて見えても、原本の意図が 1 列なら 1 列とする。
- 色は、影と光沢を除いた、その物の主な色で判じる。グラデーションは 6. と 8. のとおりに扱う。
- 読み取れない所を作り話で埋めない。推定したものは必ず「推定したこと」に書く。
- 原本に無い見出し・タスク・依存を足さない（4. で作る子の行は足してよい）。

# 出力
1. 「推定したこと」の表（列: 対象 / 推定した値 / 根拠）。推定が無ければ「なし」と書く。themeHue の値と、子の行を作った所（その label）は必ず書く。
2. 「読み取れなかったこと」と「合わせきれなかったこと」（GRS に無い色・形状・2 色のグラデーションなど）の箇条書き。無ければ「なし」。
3. 完成した GRS JSON を 1 つのコードブロックで出す。省略記号（...）を入れず、全体を出す。
4. 出す前に、次を自分で確かめ、確かめた結果を 1 行ずつ書く。
   - tasks・resources・assignments の uid と、taskGroups の id がそれぞれ重ならない
   - どのタスクも taskGroupMembers にちょうど 1 回、taskVisuals にちょうど 1 回出てくる
   - dependencies の predecessorUid、assignments の taskUid / resourceUid、taskGroupMembers の groupId、taskGroups の parentId がすべて実在する
   - どの TaskGroup も label を持つ
   - finish が start より前のタスクが無い。マイルストーンは start と finish が同じ
   - フェードを持つタスクは rectangle か chevron で、finish を持ち、fadeInDays と fadeOutDays の和が期間の暦日を超えない
   - 原本で同じ高さに横一列に並んでいた物（形状が違っても）は、その物だけが載る 1 つの行に入っている（その並びしか無い見出しの行を除く）。子の行の label は日本語 2 語まで・英語 3 語まで。行の深さは 3 まで
   - 色は「色の合わせ方」で許した値だけで、fillColor と strokeColor が両方 "transparent" のものが無い
   - スキーマに無い鍵を足していない
````

## 形の例

原本が英語の日程で、見出しの行 1 つと、その下の子の行 1 つ、タスク 4 つのときの、`schedule` の書き換える部分です。

- 「Draft the plan」: 終了側がグラデーションで薄れていくオレンジのバー（完了）。濃い側のオレンジを塗りにし、薄れる 5 日をフェードアウトにした
- 「Plan approved」・「Budget review」・「Budget approved」: 同じ高さに並んだ ◇・灰色のバー・◇。形状は混ざっているが 1 本の並びなので、3 つを 1 つの子の行に載せ、見出しを "Approvals" とした。見出しの行には「Draft the plan」もあるので、子の行を作った

これを `grs-skeleton.json` に差し込み、`schedule.project.uidHighWaterMark` を `4` にすると、スキーマに照らして通ります（2026-09-16 に照合）。原本で最も多い色が青なら、`schedule.project.themeHue` は `214` のままです。

```json
{
  "tasks": [
    {
      "uid": 1, "wbsParentUid": null, "wbsOrder": 0, "name": "Draft the plan",
      "start": "2026-04-06T00:00:00", "finish": "2026-04-24T00:00:00", "milestone": false,
      "deadline": null, "notes": null, "calendarUid": null,
      "actualStart": "2026-04-06T00:00:00", "stop": null, "actualFinish": "2026-04-27T00:00:00",
      "resume": null, "resumeValid": null, "percentComplete": 100,
      "fadeInDays": null, "fadeOutDays": 5, "dependencies": [], "carry": {}, "carryElements": []
    },
    {
      "uid": 2, "wbsParentUid": null, "wbsOrder": 1, "name": "Plan approved",
      "start": "2026-04-30T00:00:00", "finish": "2026-04-30T00:00:00", "milestone": true,
      "deadline": null, "notes": null, "calendarUid": null,
      "actualStart": null, "stop": null, "actualFinish": null,
      "resume": null, "resumeValid": null, "percentComplete": null,
      "fadeInDays": null, "fadeOutDays": null,
      "dependencies": [
        { "predecessorUid": 1, "linkType": 1, "lag": 0, "lagFormat": 7, "carry": {}, "carryElements": [] }
      ],
      "carry": {}, "carryElements": []
    },
    {
      "uid": 3, "wbsParentUid": null, "wbsOrder": 2, "name": "Budget review",
      "start": "2026-05-04T00:00:00", "finish": "2026-05-13T00:00:00", "milestone": false,
      "deadline": null, "notes": null, "calendarUid": null,
      "actualStart": null, "stop": null, "actualFinish": null,
      "resume": null, "resumeValid": null, "percentComplete": null,
      "fadeInDays": null, "fadeOutDays": null, "dependencies": [], "carry": {}, "carryElements": []
    },
    {
      "uid": 4, "wbsParentUid": null, "wbsOrder": 3, "name": "Budget approved",
      "start": "2026-05-15T00:00:00", "finish": "2026-05-15T00:00:00", "milestone": true,
      "deadline": null, "notes": null, "calendarUid": null,
      "actualStart": null, "stop": null, "actualFinish": null,
      "resume": null, "resumeValid": null, "percentComplete": null,
      "fadeInDays": null, "fadeOutDays": null,
      "dependencies": [
        { "predecessorUid": 3, "linkType": 1, "lag": 0, "lagFormat": 7, "carry": {}, "carryElements": [] }
      ],
      "carry": {}, "carryElements": []
    }
  ],
  "taskGroups": [
    {
      "id": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01", "parentId": null, "label": "Planning",
      "derivedFromTaskUid": null, "order": 0, "isCollapsed": false, "isHidden": false, "color": "lightgray", "height": null
    },
    {
      "id": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c02", "parentId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01", "label": "Approvals",
      "derivedFromTaskUid": null, "order": 0, "isCollapsed": false, "isHidden": false, "color": null, "height": null
    }
  ],
  "taskGroupMembers": [
    { "taskUid": 1, "groupId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01", "stackOrder": null },
    { "taskUid": 2, "groupId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c02", "stackOrder": null },
    { "taskUid": 3, "groupId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c02", "stackOrder": null },
    { "taskUid": 4, "groupId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c02", "stackOrder": null }
  ],
  "taskVisuals": [
    {
      "taskUid": 1, "nameAnchor": null, "nameAlign": null, "shapeKind": "rectangle",
      "milestoneGlyph": null, "fillColor": "orange", "strokeColor": "dimgray", "lineWeight": "medium"
    },
    {
      "taskUid": 2, "nameAnchor": null, "nameAlign": null, "shapeKind": "milestone",
      "milestoneGlyph": "diamond", "fillColor": "yellow", "strokeColor": "black", "lineWeight": null
    },
    {
      "taskUid": 3, "nameAnchor": null, "nameAlign": null, "shapeKind": "rectangle",
      "milestoneGlyph": null, "fillColor": "lightgray", "strokeColor": "dimgray", "lineWeight": "thin"
    },
    {
      "taskUid": 4, "nameAnchor": null, "nameAlign": null, "shapeKind": "milestone",
      "milestoneGlyph": "diamond", "fillColor": "yellow", "strokeColor": "black", "lineWeight": null
    }
  ]
}
```

## できた JSON を確かめる

GRS で開くのがいちばん確かです。形が合わない文書は、GRS が開きません。

Python が入っていれば、開く前に形だけを確かめることもできます（入っていなければ飛ばしてかまいません）。

1. ダウンロードした `grs-document.schema.json` を、AI が作った JSON（下では `out.json`）と同じフォルダに置きます。
2. Python の `jsonschema` を入れます: `python -m pip install jsonschema`
3. そのフォルダで次を打ちます。`0 errors` と出れば、形は合っています。

```bash
python -c "import json,sys,jsonschema; s=json.load(open('grs-document.schema.json',encoding='utf-8')); d=json.load(open(sys.argv[1],encoding='utf-8')); e=list(jsonschema.Draft202012Validator(s).iter_errors(d)); print(len(e),'errors'); [print(list(x.absolute_path),x.message[:120]) for x in e[:20]]" out.json
```

⚠️ スキーマに通っても、文書の不変条件（行の深さ、どのタスクもちょうど 1 つの行に載ること、フェードの長さなど）はスキーマの外にあります。全数は `docs/spec/05-07-design.md` の 6.1 の表（`IV-` の行）が持ちます。

## 合わせきれないこと

- **横並び**: 形状の外に出た名前のラベルも、行の中で場所を取る幅に数えられる（`docs/spec/01-04-requirements.md` の表 T-038 の `OC-1`）。並びの物どうしの間が狭く名前が長いと、子の行の中でも 2 段に分かれる。
- **深い行**: 行の深さ d（d ≥ 2）は、縦の倍率が `0.32 × 1.875^(d − 2)` 以上のときだけ描かれる（表 T-205 の `S-87` / `S-88`）。倍率 1 では深さ 3 まで、深さ 4 は 1.125 以上、深さ 5 は 2.11 以上で、倍率の上限に近い。だからプロンプトは深さを 3 までにしている。
- **グラデーション**: GRS は色のグラデーションを描けない。薄れていくグラデーションは、端を斜めにするフェードで近づける。フェードは本来「日付がまだ確かでない」という印なので、原本の飾りのグラデーションにも、その意味の印が付く。2 色のあいだのグラデーションは 1 色になる。
- **色**: パレットは 11 色で、影と光沢は描けない。
- **名前の置き場と文字の色**: 名前の置き場は GRS が決める。文字の色は文書に持てない。

## 開発者向けの注

アプリを使うだけなら、この節は読まなくてかまいません。

- 形の正は `docs/spec/_source/grs-document.schema.json`（`docs/spec/05-07-design.md` の 6.2）。本書の決まりはそこと、同じ 6.1 の `IV-` の行、`docs/spec/01-04-requirements.md` の表 T-052（4.1）、表 T-012a のフェード（`FD-`）、表 T-014 の積み方（`ST-`）、表 T-017 のパレット（`CL-`）から写した。仕様が変わったら本書・英語版・`grs-skeleton.json` を見直すこと。
- パレットの色の綴り（`dimgray` など）は仕様がまだ決めていない（`PND-494`）。本書は GRS の起動時の雛形 `src/framework/single-html-shell/startup-template.json` が使う綴りに合わせた。
- `grs-skeleton.json` は同じ雛形から、日程の中身を空にし行を 1 つだけ残して作った。⚠️ 生成物ではないので、`npm run gen:check` はずれを見ない。
