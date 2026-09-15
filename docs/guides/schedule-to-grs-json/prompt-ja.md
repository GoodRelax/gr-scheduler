# 日程の画像・スライド・表を GRS JSON に変える AI プロンプト

作図ソフト（PowerPoint など）や表計算ソフト（Excel など）で描いた日程表、またはその画面の画像を AI に渡し、GRS で開ける `GRS JSON` を作らせるためのプロンプトです。

## 使い方

1. AI（画像とファイルを読めるもの）に、次の 3 つを添付します。
   - 変えたい日程（画像・スライドのファイル・表のファイル、どれでも可。複数でも可）
   - 本フォルダの `grs-skeleton.json`（空の GRS 文書。スキーマに照らして通ることを確かめてある）
   - `docs/spec/_source/grs-document.schema.json`（形の正。添付できるなら添える）
2. 下の「プロンプト」のブロックをそのまま貼ります。`［ ］` の所は書き換えます。
3. AI が返した JSON を `〜.json` として保存し、GRS の開く操作で開きます。
4. AI が挙げた「推定したこと」の表を見て、主な日付を原本と照らします。

⚠️ `sample-schedule/` の JSON を土台に使わないでください。いまのスキーマから外れています（2026-09-16 に照合）。土台は `grs-skeleton.json` です。

## プロンプト

````text
あなたは日程表の読み取りと変換の専門家です。添付した日程（画像・スライド・表）を読み、GRS というガントチャートのツールで開ける「GRS JSON」を 1 つ作ってください。

# 添付
- 日程の原本: ［ファイル名。複数なら全部］
- grs-skeleton.json: 空の GRS 文書。これを土台にする
- grs-document.schema.json: 形の正（JSON Schema 2020-12）。添付があればこれに厳密に従う

# 前提
- 基準の年: ［原本に年が書かれていないときの年。例 2026］
- 休日: ［土日休み など。書かなければ grs-skeleton.json の暦（月〜金が稼働）のまま］
- 行の分け方の希望: ［例 原本の左端の見出しを行にする／担当ごとに行にする。無ければ原本の見た目どおり］

# 作り方
1. grs-skeleton.json を丸ごと写し、次の所だけを書き換える。それ以外の値（documentSettings・calendars・schemaVersion など）は変えない。
   - schedule.project の name / title / startDate / statusDate
   - schedule.tasks / taskGroups / taskGroupMembers / taskVisuals
   - 担当者が読み取れたときだけ schedule.resources / assignments
   - schedule.project.uidHighWaterMark（使った uid の最大値）
   - documentStamp の lastEditedBy（"ai-conversion" のままでよい）
2. スキーマの決まり
   - どのオブジェクトも、スキーマの required の鍵をすべて持ち、スキーマに無い鍵を持たない（additionalProperties は false）。値が無いときは null にする（型が null を許す鍵だけ）。
   - carry は {}、carryElements は [] にする（tasks・dependencies・resources・assignments・calendars・project すべて）。
   - 日付と日時は "YYYY-MM-DDT00:00:00" の形の文字列にする（時刻は常に 00:00:00）。documentStamp だけは "YYYY-MM-DDTHH:MM:SSZ"。
   - 日付は 1970-01-01 から 2200-12-31 の間にする。
3. 行（taskGroups）
   - 原本の見出しの 1 行を 1 つの TaskGroup にする。id は小文字の UUID（例 "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01"）で、文書の中で重ならないようにする。
   - label に見出しの文字を入れる。derivedFromTaskUid は null。label と derivedFromTaskUid を両方 null にしない。
   - 入れ子の見出しは parentId に親の id を入れる。深さは 5 段まで。
   - order は同じ親の下での上からの並び（0 から）。isCollapsed と isHidden は false、color と height は null。
   - TaskGroup は必ず 1 つ以上置く。
4. タスク（tasks）
   - uid は 1 から振る整数で、重ならないようにする。
   - name は原本のバーや記号に付いた名前。読めないときは近い語を推定し、「推定したこと」に書く。
   - start と finish は予定の開始日と終了日。finish を start より前にしない。
   - マイルストーン（◇ ▼ ★ など 1 日の印）は milestone を true にし、start と finish を同じ日にする。それ以外は false。
   - wbsParentUid は、原本に親子（まとめのバーと子のバー）がはっきり描かれているときだけ親の uid を入れる。無ければ null。wbsOrder は同じ親の下での並び（0 から）。親子に輪を作らない。
   - 実績が描かれているとき（予定と別のバー、塗りつぶし、完了の印など）:
     - 完了: actualStart と actualFinish に日付、stop は null、percentComplete は 100。
     - 進行中: actualStart と stop（いま実績が届いている最後の日）に日付、actualFinish は null、percentComplete は読み取れた値（読めなければ null）。
     - 未着手・実績が描かれていない: actualStart・stop・actualFinish は null、percentComplete は null。
     - 実績の最後の日を actualStart より前にしない。
   - resume は null、resumeValid は null。deadline・notes・calendarUid・fadeInDays・fadeOutDays は null。
   - 依存（矢印でタスクどうしがつながっている）は、後のタスクの dependencies に {"predecessorUid": 前のタスクの uid, "linkType": 1, "lag": 0, "lagFormat": 7, "carry": {}, "carryElements": []} を入れる。linkType は 0 = 終了→終了、1 = 終了→開始、2 = 開始→終了、3 = 開始→開始。lagFormat 7 は日で、lag はその日数。矢印が無ければ []。
5. どの行に載せるか（taskGroupMembers）
   - どのタスクも、ちょうど 1 つの {"taskUid": uid, "groupId": 行の id, "stackOrder": null} から指されるようにする。原本でそのバーが描かれている行を選ぶ。
6. 見た目（taskVisuals）
   - 原本の形が次のどれかにはっきり当たるタスクだけ 1 件ずつ置く。当たらなければ置かない（既定の形になる）。
     - 四角いバー: "rectangle"
     - 矢羽根の形（>===>）: "chevron"
     - 細い線の矢印（--->）: "arrow"
     - 両端に点がある線（*----*）: "endpointSpan"
     - 記号（マイルストーン）: "milestone"。milestoneGlyph を "circle" / "hexagon" / "pentagon" / "diamond" / "square" / "star" / "triangleUp" / "triangleDown" / "file" / "box" / "floppyDisk" / "cylinder" / "person" / "smile" / "beerMug" から最も近いものにする。記号以外の形では milestoneGlyph は null。
   - 1 件の形: {"taskUid": uid, "nameAnchor": null, "nameAlign": null, "shapeKind": 上の値, "milestoneGlyph": 上の値か null, "fillColor": null, "strokeColor": null, "lineWeight": null}
   - 色は null のままにする（GRS のテーマの色で描かれる）。
7. 担当者（読み取れたときだけ）
   - resources に {"uid": 整数, "name": 担当者名, "resourceKind": 1, "isCostResource": false, "calendarUid": null, "carry": {}, "carryElements": []}、assignments に {"uid": 整数, "taskUid": uid, "resourceUid": 担当者の uid, "carry": {}, "carryElements": []}。uid はタスクと別に 1 から振ってよい。
8. project
   - name と title に日程表の題名、startDate に最も早い予定の開始日、statusDate に原本の「今日」の線の日（無ければ null）を入れる。uidHighWaterMark は tasks・resources・assignments で使った uid の最大値。

# 画像を読むときの決まり
- 日付は時間の目盛りから読み、日の単位に丸める。目盛りが月や週だけのときは、バーの端の位置から日を比例で推定する。
- 読み取れない所を作り話で埋めない。推定したものは必ず「推定したこと」に書く。
- 原本に無い行・タスク・依存を足さない。

# 出力
1. 「推定したこと」の表（列: 対象 / 推定した値 / 根拠）。推定が無ければ「なし」と書く。
2. 「読み取れなかったこと」の箇条書き。無ければ「なし」。
3. 完成した GRS JSON を 1 つのコードブロックで出す。省略記号（...）を入れず、全体を出す。
4. 出す前に、次を自分で確かめ、確かめた結果を 1 行ずつ書く。
   - tasks・resources・assignments の uid と、taskGroups の id がそれぞれ重ならない
   - どのタスクも taskGroupMembers にちょうど 1 回出てくる
   - dependencies の predecessorUid と assignments の taskUid / resourceUid、taskGroupMembers の groupId、taskGroups の parentId がすべて実在する
   - finish が start より前のタスクが無い。マイルストーンは start と finish が同じ
   - スキーマに無い鍵を足していない
````

## 形の例

行 2 つ（入れ子）、タスク 2 つ（1 つは完了した矢印、1 つは依存を持つマイルストーン）のときの、`schedule` の書き換える部分です。これを `grs-skeleton.json` に差し込むと、スキーマに照らして通ります（2026-09-16 に照合）。

```json
{
  "tasks": [
    {
      "uid": 1, "wbsParentUid": null, "wbsOrder": 0, "name": "Draft the plan",
      "start": "2026-04-06T00:00:00", "finish": "2026-04-24T00:00:00", "milestone": false,
      "deadline": null, "notes": null, "calendarUid": null,
      "actualStart": "2026-04-06T00:00:00", "stop": null, "actualFinish": "2026-04-27T00:00:00",
      "resume": null, "resumeValid": null, "percentComplete": 100,
      "fadeInDays": null, "fadeOutDays": null, "dependencies": [], "carry": {}, "carryElements": []
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
    }
  ],
  "taskGroups": [
    {
      "id": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01", "parentId": null, "label": "Planning",
      "derivedFromTaskUid": null, "order": 0, "isCollapsed": false, "isHidden": false, "color": null, "height": null
    },
    {
      "id": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c02", "parentId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01", "label": "Approval",
      "derivedFromTaskUid": null, "order": 0, "isCollapsed": false, "isHidden": false, "color": null, "height": null
    }
  ],
  "taskGroupMembers": [
    { "taskUid": 1, "groupId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01", "stackOrder": null },
    { "taskUid": 2, "groupId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c02", "stackOrder": null }
  ],
  "taskVisuals": [
    {
      "taskUid": 1, "nameAnchor": null, "nameAlign": null, "shapeKind": "arrow",
      "milestoneGlyph": null, "fillColor": null, "strokeColor": null, "lineWeight": null
    },
    {
      "taskUid": 2, "nameAnchor": null, "nameAlign": null, "shapeKind": "milestone",
      "milestoneGlyph": "diamond", "fillColor": null, "strokeColor": null, "lineWeight": null
    }
  ]
}
```

このとき `schedule.project.uidHighWaterMark` は `2` にします。

## できた JSON を確かめる

GRS で開くのがいちばん確かです。開く前に形だけ確かめたいときは、Python の `jsonschema` で照らせます（リポジトリの根で）:

```bash
python -c "import json,sys,jsonschema; s=json.load(open('docs/spec/_source/grs-document.schema.json',encoding='utf-8')); d=json.load(open(sys.argv[1],encoding='utf-8')); e=list(jsonschema.Draft202012Validator(s).iter_errors(d)); print(len(e),'errors'); [print(list(x.absolute_path),x.message[:120]) for x in e[:20]]" out.json
```

⚠️ スキーマに通っても、文書の不変条件（行の深さ、どのタスクもちょうど 1 つの行に載ることなど）はスキーマの外にあります。全数は `docs/spec/05-07-design.md` の 6.1 の表（`IV-` の行）が持ちます。

## 仕様との関係

- 形の正は `docs/spec/_source/grs-document.schema.json`（`docs/spec/05-07-design.md` の 6.2）。本書の決まりはそこと、同じ 6.1 の `IV-` の行、`docs/spec/01-04-requirements.md` の 4.1 の表 T-052 から写した。仕様が変わったら本書と `grs-skeleton.json` も見直すこと。
- `grs-skeleton.json` は `src/framework/single-html-shell/startup-template.json` から、日程の中身を空にし行を 1 つだけ残して作った。⚠️ 生成物ではないので、`npm run gen:check` はずれを見ない。
