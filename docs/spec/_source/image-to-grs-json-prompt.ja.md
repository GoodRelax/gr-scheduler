<!-- SINGLE SOURCE OF TRUTH -- EDIT THIS FILE. The Japanese prompt of FR-068 (turn a schedule image into GRS JSON); this first line is not part of the prompt. Generated from it: src/adapter/screen-renderer/image-to-grs-json-prompt.json and the prompt block of docs/guides/schedule-to-grs-json/prompt-ja.md. Rebuild: npm run gen -->
あなたは日程表の読み取りと変換の専門家です。添付した日程（画像・スライド・表）を読み、GRS というガントチャートのツールで開ける「GRS JSON」を 1 つ作ってください。日付だけでなく、色・グラデーション・形状・フェード・横並びも、できるだけ元の日程に合わせてください。

# 添付
- 日程の原本: ［ファイル名。複数なら全部］
- 形の正（JSON Schema 2020-12）と土台の文書: 本文の後ろの 2 つの `json` の囲み（前がスキーマ、後が土台）。スキーマに厳密に従う

# 前提
- 基準の年: ［原本に年が書かれていないときの年。例 2026］
- 休日: ［土日休み など。書かなければ土台の文書の暦（月〜金が稼働）のまま］
- 行の分け方の希望: ［例 原本の左端の見出しを行にする／担当ごとに行にする。無ければ原本の見た目どおり］
- 色の合わせ方: ［パレット／自由。書かなければパレット］
  - パレット: 色は "white" "black" "dimgray"（濃い灰色）"lightgray"（薄い灰色）"red" "blue" "yellow" "green" "orange" "purple" "transparent"（透明）の 11 語から、原本に最も近いものを選ぶ。GRS の中で後から色を選び直せる
  - 自由: 上の 11 語に加えて "#rrggbb/" の形の色も使ってよい（明るいテーマの色だけを書き、/ の後ろは空ける）。原本に近くなるが、GRS の色の選び肢には無い色になる

# 作り方
1. 土台の文書を丸ごと写し、次の所だけを書き換える。それ以外の値（documentSettings・calendars・schemaVersion など）は変えない。
   - schedule.project の name / title / startDate / statusDate / themeHue / uidHighWaterMark
   - schedule.tasks / taskGroups / taskGroupMembers / taskVisuals
   - 担当者が読み取れたときだけ schedule.resources / assignments
   - documentStamp の lastEditedBy（"ai-conversion" のままでよい）
2. スキーマの決まり
   - どのオブジェクトも、スキーマの required の鍵をすべて持ち、スキーマに無い鍵を持たない（additionalProperties は false）。値が無いときは null にする（型が null を許す鍵だけ）。
   - carry は {}、carryElements は [] にする（tasks・dependencies・resources・assignments・calendars・project すべて）。
   - 日付と日時は "YYYY-MM-DDTHH:MM:SS" の形の文字列にする（帯は書かない）。時刻は列の側で決まる: 開始の側（start・actualStart・resume・project.startDate）は project.defaultStartTime（null なら {{S-482}}）、終了の側（finish・actualFinish・stop・deadline・project.statusDate）は project.defaultFinishTime（null なら {{S-483}}）。マイルストーンは start も finish も開始の側の時刻。暦の例外の fromDate は 00:00:00、toDate は 23:59:00。documentStamp だけは "YYYY-MM-DDTHH:MM:SSZ"。
   - 日付は 1970-01-01 から 2200-12-31 の間にする。
3. 行（taskGroups）
   - 原本の見出しの 1 行を 1 つの TaskGroup にする。id は小文字の UUID（例 "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01"）で、文書の中で重ならないようにする。
   - label に見出しの文字を入れる。derivedFromTaskUid は null。
   - 入れ子の見出しは parentId に親の id を入れる。
   - order は同じ親の下での上からの並び（0 から）。treeState は "auto" にする —— 静止画では、行が GRS の中で畳まれていたか・1 階層だけ開かれていたか・隠されていたかを読み取れないので、ここは常に "auto" にする（他の 4 つの値 —— 配下をすべて描かせない "collapsed"、子を 1 階層だけ開いたままにする "expanded"、縮小するまで配下をすべて開いたままにする "temporarilyExpanded"、行自身を描かせない "hidden" —— は人が GRS の中で行った操作の結果であり、静止画からは読み取れない）。editGroup は null（誰でも編集できる行）、minHeight は null。
   - color は原本の行の帯（背景）の色。「色の合わせ方」に従って選ぶ。ただし行の色に "black" は使えない。帯に色が無ければ null。
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
   - 依存（矢印でタスクどうしがつながっている）は、後のタスクの dependencies に {"predecessorUid": 前のタスクの uid, "linkType": 1, "lag": 0, "lagFormat": 7, "carry": {}, "carryElements": []} を入れる。linkType は 0 = 終了→終了、1 = 終了→開始、2 = 開始→終了、3 = 開始→開始。lag の単位は、lagFormat が何であっても 0.1 分である（lagFormat 7 は、日で表示することだけを言う）。1 日は project.minutesPerDay 分で、null なら {{S-128}} 分 —— ラグが無ければ 0、2 日のラグは 2 × 1 日の分数 × 10（project.minutesPerDay が null なら 2 × {{S-128}} × 10）。矢印が無ければ []。
6. フェードと、薄れていくグラデーション（fadeInDays / fadeOutDays）
   - GRS のフェードは、予定のバーの端を斜めにする印である（日付がまだ確かでないことを表す）。開始側だけなら左の辺が斜めの台形、終了側だけなら右の辺が斜めの台形、両方なら平行四辺形になる。
   - 原本のバーの端が斜め、先細り、または色のグラデーションで背景の色や透明へ薄れていくときは、開始側の斜め（薄れ）の横の長さを暦日で fadeInDays に、終了側を fadeOutDays に入れる。無い側は null。
   - フェードを付けてよいのは、形状が四角いバー（"rectangle"）か矢羽根（"chevron"）のタスクだけ。矢印・両端に点がある線・マイルストーンには付けない（null）。
   - fadeInDays と fadeOutDays は 0 以上、足して finish − start の暦日の日数を超えない。フェードを付けるタスクは finish を持つ。GRS はこれに反する文書を開かない。
   - 実績のバーにはフェードが無い。実績の斜めや薄れは読み取らない。
7. どの行に載せるか（taskGroupMembers）
   - どのタスクも、ちょうど 1 つの {"taskUid": uid, "groupId": 行の id} から指されるようにする。行の中で積む段は書かない（GRS が自動で積む）。原本でそのバーが描かれている行（4. で作った子の行を含む）を選ぶ。
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
   - strokeWidthPx は輪郭の太さを、原本の中で比べて 1 〜 10 の整数（px）で選ぶ。細い・中くらい・太いの 3 つに見えるなら 1 ・ 2 ・ 3。違いが見えなければ null。
   - 1 件の形: {"taskUid": uid, "shapeKind": 上の値, "milestoneGlyph": 上の値か null, "fillColor": 色か null, "strokeColor": 色か null, "strokeWidthPx": 太さか null}
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
