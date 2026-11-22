# GRS JSON の最終レビュー —— レビューの観点（案 1 版、2026-11-22）

持ち主の裁定 `JDG-3717` の 1.「GRS JSON のレビュー観点を整理する」の 1 枚。持ち主がこの表を決め、席は決まった観点でツリー（2.）と質問状（3.）を作る。

## 1. 何をレビューするか

- 物: GRS JSON β の構造の木 `grs-json-beta-tree.md` と見本 `grs-json-beta-sample.json`（`JDG-3713` で持ち主が ok、`JDG-3714`・`JDG-3715` で並べ替えた物）。
- 要（持ち主の言葉）: **一発で誤解なく意味が分かるか**。
- 読み手: GRS JSON を初めて開く外の開発者と AI。英語の名だけを見る人を基準にする。

## 2. 観点

| # | 観点 | 問うこと | 例（今の木から） | 誰が見る |
|:---|:---|:---|:---|:---|
| V-1 | 一発で分かる（NEIM） | 名だけを読んで、読み手が意図どおりの意味を 1 つに決めるか | `highestIssuedUid` を「最大の uid」と読むか「uid の数え手」と読むか | 外の AI（1 段目で説明を書かせる）・持ち主 |
| V-2 | 親と合わせて読める | 親のキーと続けて読んで意味が通るか。親の名を子で繰り返していないか（N-4） | `verticalZoom.automaticallyShownDepth`、`delayDiagnosisSettings.toleranceWorkingDays` | 外の AI・持ち主 |
| V-3 | 列挙の値が値だけで読める | 各値の名だけで、何を選ぶ値か分かるか。値の組がそろうか（品詞・粒度・対） | `selfShowMode` の `hiddenUntilZoomIn`、`snapPoint` の 8 点、`Color.type` の `theme`・`palette`・`custom` | 外の AI・持ち主 |
| V-4 | 1 つの語に 1 つの意味（OMPV・OKPN） | 同じ語が木のどこでも同じ意味か。同じ物を別の語で言っていないか | `type`（判別子と MSPDI の `Type` の 2 つ）、`firstDay`・`lastDay`、書き手の種類を `lastEditedBy.type` と `changedBy.editorType` の 2 つの名で言う | 外の AI（2 段目）・席 |
| V-5 | 決まりに合う | 名の決まり N-1〜N-17（略・単位・日時の語尾・`is…`・複数形・判別子 `type`・`null` を使わない）に合うか | `minHeightPx`、`changeLogEntries[].changedAt` | 席（機械で数える）・外の AI（2 段目） |
| V-6 | 置き場と形 | 値の置き場が意味に合うか（見せ方は `documentSettings`、中身は `scheduleData`、GRS の値は `grs`）。似た物が同じ形か | `TaskTableWindow` と `ResourceTableWindow`、`scheduleData` の GRS のスカラー 5 つ | 外の AI（2 段目）・持ち主 |
| V-7 | 並び | 書く順が O-1〜O-6（`JDG-3714`・`JDG-3715`）に合い、読み手が先に全体をつかむか | 未決: GRS のスカラー 5 つを `commentBoxes[]` の後に置くか、O-4 に合わせて配列の前へ動かすか | 席・持ち主 |
| V-8 | 英語として自然 | 英語を母語とする読み手が、語の選び方と語順を自然と読むか | `isPlanDatesVisible`（複数の主語と `is`）、`isDateGridLinesVisible` | 外の AI |
| V-9 | 長く持つ | 機能が増えたときに名が嘘にならないか（外との約束は β で凍る） | `displayTimeZones[]` の「4 つまで」、`sourceFormat` の `mspdi12`・`mspdi15` | 外の AI（2 段目）・持ち主 |

## 3. 範囲の外

- **MSPDI から来た名（木の `[M]`）の改名。** 席と AI は改名を出さず、迷う所はスキーマの説明（`description`）に書く文で補う（`JDG-3713` までの既決）。迷った事実は記録する。
- **振る舞いの細部。** 名の問いだけを持ち主に問う（`JDG-3686`）。
- **Agent API と文書の命令の名。** Agent API の席が持つ（`JDG-3717` の③）。
- **既決の名の蒸し返し。** 席は退けた名を出し直さない。AI が新しい理由を出したら、理由と一緒に持ち主へ出す。

## 4. 進め方（観点が決まった後）

1. 席が、列挙の各値まで出したツリーを作る（2.）。
2. 席が、外の AI への 2 段の質問状を作る（3.）。1 段目は名だけを見せ、AI が項目ごとに説明を書き、迷った所と迷い方を書く（V-1〜V-3）。2 段目は意図を明かし、AI がずれを自己診断し、V-4〜V-9 で審査し、最後に改善点を挙げる。持ち主が AI ごとに新しい会話で出す。
3. 持ち主の目視のレビューの形は、別の問いで持ち主に決めてもらう。
4. 席が答えを確かめ、直す点を 1 つずつ持ち主に問い、JDG に記録し、ツリーと見本に当てる。
