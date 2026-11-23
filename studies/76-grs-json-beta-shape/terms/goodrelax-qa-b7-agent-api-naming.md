BGQA7

# Agent API と文書の命令の名 —— 方針の残りと、方針で決まらない名

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA7 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

🔄 *作った日: 2026-11-23（Agent API の名の席）。2〜5 巡目: 2026-11-23。5 巡目で方針の問いはすべて決まった。6 巡目: 方針を当てた名の確かめ（[apply]）を足した。7 巡目で [apply] も決まった。8 巡目: uid の上限の断りの名（[uid]）を足した。9 巡目で [uid] も決まり、問いはすべて閉じた。10 巡目（2026-11-24、Agent API の名 2 の席）: AI-C のレビューで見直す名（[rev]）を足した*

🔄 *残 14（❓ で検索）*

この紙の範囲: 方針の案 `agent-api-naming-policy-draft.md` のうち、持ち主が説明と比較を求めた 4 行（P-7・P-8・P-10・P-11、`JDG-3716`）と、方針で 1 つに決まらない名 4 つです。方針が決まったら、席が BGQA4（文書の命令 16 問）と BGQA5（Agent API 29 問）の名を方針でそろえ、結果を 1 枚にして持ち主に 1 度で確かめてもらいます（P-12 のレビューもそこで行います）。

| 分野 | 問い |
|:---|:---|
| [pol] 名の付け方の方針 | 無し（すべて決まった） |
| [name] 方針で決まらない名 | 無し（すべて決まった） |
| [apply] 方針を当てた名の確かめ | 無し（すべて決まった） |
| [uid] uid の上限の断り | 無し（すべて決まった） |
| 🔄 *[rev] AI-C のレビューで見直す名* | 🔄 *問 13〜25* |

***

## 決定事項

### [pol] 名の付け方の方針

| 問い | 決まったこと | 裁定 |
|:---|:---|:---|
| P-1 | 文書の命令と Agent API の名にも、GRS JSON の名の決まり N-1〜N-17 とその優先の順を当てる | `JDG-3716` |
| P-2 | 画面の 1 つの操作と同じ働きの命令の名は、イベント名から `Pressed`・`Requested` を除いた名（文書の命令だけ。Agent API の道具は P-3 の「動詞＋目的語」） | `JDG-3716` |
| P-3 | 名の頭の動詞は 1 語 1 意味: `read`・`set`・`edit<物>`・`create`・`delete`・`apply`・`export` | `JDG-3716` |
| P-4 | 1 つの物は、GRS JSON・文書の命令・Agent API で 1 つの語を持つ | `JDG-3410`・`JDG-3684` |
| P-5 | 代名詞・前置詞・たとえ・読みが 2 つの語・呼ぶ者の頭 `Agent`・過去分詞だけのキーを使わない | `JDG-3716` |
| P-6 | 許す略に `Url` を足す | `JDG-3716` |
| P-7 | ページが返す答えと値の真偽は `is…`（`isAccepted`・`isScheduleDataUpdated`）。AI が渡すフラグは動詞で始める（`includePassthrough`・`overwrite`・`returnWholeSchema`） | `JDG-3780` |
| P-8 | 単位の無い数は、何を数えるかで終える: 個数は `…Count`、木の深さは `…Depth`、何番目かは 0 から数えて `…Index`（`deleteDependencyAt.order` → `index`、GRS JSON の `siblingOrder` → `siblingIndex`）。ページ送りの `offset`・`nextOffset`・`limit` は通り名のまま | `JDG-3776`・`JDG-3777` |
| P-9 | 欄が入れる型は欄の名を PascalCase にした名。値か断りを返す答えの型は `…Outcome` | `JDG-3716` |
| P-10 | 直し方が同じ断りは、物によらず 1 つの名（無い物を名指したら `notFound`）。どの物かは `field`・`missingTaskUids`・`commandType`・`member` が言う。直し方が違えば名に物を入れる | `JDG-3778` |
| P-11 | 鍵から値への対応表は `<値>By<鍵>`（`taskGroupIdBySourceTaskUid`）。`By` は対応表と「誰が」（`changedBy`）、`To` は行き先だけ（`moveTaskToTaskGroup`）。`Of`・`Into` は使わない | `JDG-3772` |
| P-12 | 名が方針に合えば今の名を変えない（当てた結果をレビューする） | `JDG-3716` |
| `kind` | `kind` というキーはどこでも使わない。素の `type` は物の形を選ぶ判別子、`xxxType` は形を変えない分類 | `JDG-3564` |
| 問い方 | この紙で出す。難しい問いは個別に相談する | `JDG-3771` |

### [name] 方針で決まらない名

| 問い | 決まったこと | 裁定 |
|:---|:---|:---|
| 道具の分類の欄 | `kind` → `memberType`（原稿と src・tests は `CR-851` の実装で直す） | `JDG-3773` |
| 取り込みで出した問い | `asked` → `pendingQuestion` | `JDG-3774` |
| 文書の誤りの所 | `at` → `jsonPointer` | `JDG-3775` |
| 実績ダミーの命令の引数 | `grabbed` → `grabbedArea`、`released` → `releasedPlace` | `JDG-3779` |

### [apply] 方針を当てた名の確かめ

| 問い | 決まったこと | 裁定 |
|:---|:---|:---|
| 45 問の名 | 一覧 `agent-api-names-by-policy-draft.md` のとおり（変える名 134、今のままの名 182）。`setDependencyLag`・`TableRowsOutcome` ほか席が決めた 4 つ、`shiftScheduleByMinutes`・`deleteDependencyAt` も含む | `JDG-3781` |
| 画面の表の型 | `TableRow`・`TableColumn`・`TableCell` | `JDG-3782` |
| 変更の知らせの `mark` | 欄 `mark` と型 `WatcherMark` を無くす。時刻は `stamp.scheduleDataUpdatedAt` が言う | `JDG-3783` |

### [uid] uid の上限の断り

| 問い | 決まったこと | 裁定 |
|:---|:---|:---|
| uid が上限に届いた断りの理由 | `uidLimitReached`（`pinLimitReached` と同じ形） | `JDG-3784` |

### [rev] 🔄 *AI-C のレビューで見直す名*

🔄 *まだ無い（問 13〜25 の答えを待つ）。*

***

## QA

### [pol] 名の付け方の方針 ✅

すべて決まりました（上の決定事項）。

### [name] 方針で決まらない名 ✅

すべて決まりました（上の決定事項）。

### [apply] 方針を当てた名の確かめ ✅

すべて決まりました（上の決定事項）。

### [uid] uid の上限の断り ✅

すべて決まりました（上の決定事項）。

### [rev] 🔄 *AI-C のレビューで見直す名（❓ 13）*

🔄 *AI-C（席の結論を見せない別の AI）が、決まった一覧を GRS JSON・用語集・画面の札と照らしました（`JDG-3785`、結果は `agent-api-names-ai-c-review.md`）。所見は 26 件。席は 26 件を元の資料で確かめて仕分けました: 席が直す 8、席が方針で決める 8（問 25 にまとめた）、持ち主に問う 9 件（問 13〜24。遅延診断の答えの中の名は問 21〜24）、採らない 1（`releasedPlace`。持ち主が `JDG-3779` で選び、仕様書の型 `ReleasedPlace` と同じ語）。仕分けの表はレビューの末尾にあります。*

#### 🔄 *❓ 問 13. 実績ダミーをつかんだ所の名 `grabbedArea` —— 決め直し*

🔄 *場面: AI が `beginTaskActual`（実績ダミーをつかんで離し、実績を置き始める命令）を送ります。引数 `grabbedArea` の値は `barDummyStart`（バーのダミーの開始の端）・`barDummyFinish`（終了の端）・`milestoneDummy`（マイルストーンのダミー）・`arrowDummyStart`・`arrowDummyFinish` のどれかです。*

🔄 *食い違い: 用語集と画面の木は、Grab Area（掴み領域）を「面・線として掴める場所（バーの本体・依存線・帯）」、Grab Point（掴み点）を「点・角として掴める場所（バーの端・フェードの点・ボックスの角）」と分けます（`10-screen-term-tree.md` の 2 節、用語集の `grabPoint`・`grabArea`）。5 つの値はどれも端か 1 点で、用語集では Grab Point に当たります。`grabbedArea` のままだと、用語集を読んだ AI は「バーの本体をつかんだ」と読みます。`JDG-3779` は仕様書の型 `GrabArea`（掴み代の行の集合）に拠りましたが、その型は用語集の Grab Area と別の物でした。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`grabbedPoint`（型 `GrabbedPoint`）。用語集の Grab Point と同じ語。マイルストーンも 1 つの日時の点* |
| 🔄 *b* | 🔄 *`grabbedPart`（型 `GrabbedPart`）。用語集のどちらの語も使わない。方針の下書きの元の案* |
| 🔄 *c* | 🔄 *`grabbedArea` のまま。説明の文で「用語集の Grab Area とは別」と書く* |

回答:

#### 🔄 *❓ 問 14. 断りの理由 `mspdiImportCountAhead` —— 主語が逆*

🔄 *場面: MSPDI を取り込んだ文書で、あるタスクの `grs.importOrigin.mspdiImportCountWhenLastIncluded`（そのタスクを最後に取り込んだ回の番号）が、文書の `scheduleData.mspdiImportCount`（取り込んだ回の数）より大きいとき、ページは文書を断ります。*

🔄 *食い違い: 大きすぎるのはタスクの側の数です。今の名は文書の `mspdiImportCount` が「先へ行った」と読めます。AI は文書の数を直そうとし、その数は書けない値なので詰まります。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`importOriginCountAhead`。主語がタスクの `importOrigin`（取り込みの出どころ）。何が・どうなった（P-10）を言う* |
| 🔄 *b* | 🔄 *`lastIncludedCountAhead`。キー `mspdiImportCountWhenLastIncluded` の後ろの語* |
| 🔄 *c* | 🔄 *`mspdiImportCountAhead` のまま。説明の文で主語を言う* |

回答:

#### 🔄 *❓ 問 15. 断りの理由 `endBeforeStart` —— 3 つの日の前後を 1 つの名で*

🔄 *場面: AI が予定の終了を開始より前にする命令を送ります。ページは `"reason": "endBeforeStart"` と `"field": "set.finish"` で断ります。同じ名が、実績の終了と開始、ハイライトボックスの `lastDay` と `firstDay` の前後も受け持ちます（BGQA5 の問 32-5、P-10「直し方が同じ断りは 1 つの名」）。*

🔄 *食い違い: GRS JSON に end の語はありません（タスクは `start`・`finish`、箱は `firstDay`・`lastDay`）。兄弟の名は `slopeWithoutFinish`（finish）と `lastTaskGroupBeforeFirst`（first・last）で、1 つの断りの一族に 3 つの語が混ざります。AI は `end` というキーを探します。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`datesReversed`。どの日の組にも当たる。どの組かは `field` が言う（P-10）* |
| 🔄 *b* | 🔄 *`finishBeforeStart`。タスクと MSPDI の語。箱の日の逆さにも同じ名が来る* |
| 🔄 *c* | 🔄 *`endBeforeStart` のまま* |

回答:

#### 🔄 *❓ 問 16. 読む道具の引数 `filters` —— 値はフィルタそのものではない*

🔄 *場面: AI が `readSearchRows`（検索ウィンドウの行を読む）か `readTableRows`（表の窓の行を読む）を呼びます。引数 `filters` の値は `asShown`（人が表に掛けている列のフィルタと並べ替えを当てる。省けばこれ）か `none`（当てない）です。*

🔄 *食い違い: GRS JSON の `columnFilters[]` は、フィルタそのもの（`ColumnFilter` の並び）を持ちます。同じ語の引数 `filters` に、AI は `[{ "type": "values", "column": "progressStatus", … }]` を渡し、`malformedRequest` で断られます。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *AI が渡すフラグ `applyShownFiltersAndSort`（`true` が省いたとき）。P-7 の「AI が渡すフラグは動詞で始める」。値が 2 つだけなので真偽で足りる* |
| 🔄 *b* | 🔄 *`filterMode`（値 `asShown`・`none` のまま）。並べ替えも含むことは説明の文で言う* |
| 🔄 *c* | 🔄 *`filters` のまま* |

回答:

#### 🔄 *❓ 問 17. 日程表を絞っていないときの `drawnTaskUids`*

🔄 *場面: AI が `readDrawnTasks`（席が方針で改めた名。問 25）を呼び、日程表がいま描くタスクを読みます。どの表の窓もチェックで日程表を絞っていないとき、一覧は「`drawnTaskUids` のキーを書かない」としました（N-12）。*

🔄 *食い違い: キーが無いことが「全部描いている」を言います。持ち主は `JDG-3740` で、無いことに意味を持たせる形（Null Trap）を退けました。AI は「キーが無い ＝ 何も描いていない」と読みえます。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *いつも書く真偽 `isScheduleFiltered` を足す。`drawnTaskUids` は真のときだけ書く。名は GRS JSON の `isScheduleFilteredByChecks` と同じ語* |
| 🔄 *b* | 🔄 *`drawnTaskUids` をいつも書く。絞っていなければ描いているタスクの全部を並べる（数千のタスクでは答えが大きい）* |
| 🔄 *c* | 🔄 *今のまま（キーを書かない）。説明の文で言う* |

回答:

#### 🔄 *❓ 問 18. 命令 `setTaskProgressStatus` の引数の形*

🔄 *場面: AI がタスクを「完了」にする命令を送ります。今の形は次です。*

🔄 *下のコードブロックの 1・2 行目が変わった。*
```json
{ "type": "setTaskProgressStatus", "taskUid": 12,
  "progressStatus": { "state": "finished", "actualStart": "...", "actualFinish": "..." } }
```

🔄 *食い違い: 表の列の値 `progressStatus`（`JDG-3742`）は状態の名 1 つ（`"finished"`）です。命令の `progressStatus` は状態と日時を持つ物で、1 つの語が 2 つの形を持ちます（P-4 の後半「値の形が違えば名も変える」）。AI は `"progressStatus": "finished"` と文字列で送り、断られます。また `progressStatus.state` は status と state を重ねます。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *平らにする: `"progressStatus": "finished", "actualStart": "...", "actualFinish": "..."`。`progressStatus` は列と同じ状態の名、日時は GRS JSON のキーの名（P-4「引数は書くキーの名」）。どの日時が要るかは状態の名で決まる* |
| 🔄 *b* | 🔄 *中の物の名を変える: `"progressStatusChange": { "progressStatus": "finished", ... }`* |
| 🔄 *c* | 🔄 *今のまま。説明の文で言う* |

回答:

#### 🔄 *❓ 問 19. データの時差 `scheduleDataTimeZone` を書く命令*

🔄 *場面: 人がデータの時差を UTC+09:00 から UTC+08:00 に変えます。AI も同じことをします。GRS JSON β は、この値を `project` の外の `scheduleData.scheduleDataTimeZone`（`{ "utcOffset": "+09:00" }`）に置きます（`JDG-3618`・`JDG-3644`）。*

🔄 *食い違い: CR-851 の対応表は、この値を `editProject` の `set` に置きます。対応表は `JDG-3618` より前の形で書きました。`editProject` は `project` の欄を書く命令（P-3 の `edit<物>`）なので、`project` の外のキーを書くと名と働きが合いません。α の原稿には名つきの命令 `setScheduleDataTimeZone` がありました。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *名つきの命令 `setScheduleDataTimeZone`（引数 `scheduleDataTimeZone`）。P-3「`set` は値を 1 つ置く」。`scheduleData` で命令が書ける欄はこれだけ（ほかは取り込みだけが書く）* |
| 🔄 *b* | 🔄 *`editScheduleData`（`set.scheduleDataTimeZone`）。`edit<物>` の形。書ける欄は 1 つだけ* |
| 🔄 *c* | 🔄 *`editProject.set.scheduleDataTimeZone`（対応表のまま）* |

回答:

#### 🔄 *❓ 問 20. 命令の断りの、誤りの所の欄 `field`*

🔄 *場面: AI の命令がページに断られると、答えは `"commandRefusals": [ { "commandIndex": 2, "reason": "endBeforeStart", "field": "set.finish" } ]` を返します。文書の検査の断りは、同じ「誤りの所」を `documentFaults[].jsonPointer`（`"/tasks/3/finish"` の形、`JDG-3775`）で返します。*

🔄 *食い違い: 1 つの物（誤りの所）が 2 つの名と 2 つの書き方（点でつなぐ道と JSON Pointer）を持ちます。`set` の中が入れ子のとき（`set.scheduleCanvasElements.isPlanBarVisible`）、点の道の読み方は決まっていません。AI は `field` をキーの名 1 つと読みます。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`jsonPointer`（命令の中の JSON Pointer。例 `"/set/finish"`）。文書の断りと 1 つの名・1 つの書き方（P-4）* |
| 🔄 *b* | 🔄 *`fieldPath`（点の道のまま）。名だけが道と言う* |
| 🔄 *c* | 🔄 *`field` のまま* |

回答:

#### 🔄 *❓ 問 21. 遅延診断の答えの欄 `outcome` —— 診断したか*

🔄 *場面: AI が `readDelayDiagnosis`（遅延診断の結果を読む）を呼びます。答えの頭の欄 `outcome` は `"diagnosed"`（診断した）か `"notDiagnosed"`（基準日が無いので診断しなかった）の 2 つの値だけを持ちます。*

🔄 *食い違い: この API では、語 Outcome は「値か断りを返す答えの型」の語尾です（P-9。`WriteOutcome`・`ImportOutcome`）。答えの中の欄 `outcome` は別の物（診断したか）を言います。AI は `outcome` に断りが入ると読みます。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *真偽 `isDiagnosed`。P-7「答えの真偽は `is…`」。値が 2 つだけなので真偽で足りる* |
| 🔄 *b* | 🔄 *`diagnosisResult`（値は今の 2 つ）。形を変えない。「結果」を診断の中身と読み違えうる* |
| 🔄 *c* | 🔄 *欄を無くす。基準日が無いときは `statusDate` を書かないので、それで分かる（無いことに意味を持たせる形で、`JDG-3740` に近い）* |

回答:

#### 🔄 *❓ 問 22. 遅延診断の答えの欄 `terminalsReached` —— 2 つの裁定が食い違う*

🔄 *場面: ボトルネックの行ごとに、そのタスクの遅れが届く末端タスク（マイルストーンと後続の無いタスク）の数を返す欄です。*

🔄 *食い違い: `JDG-3473`（2026-10-30）がこの欄を `endTasksReached` と決めました。後の方針 P-8（`JDG-3716`・`JDG-3776`）は「個数は `…Count` で終える」と決めました。後の方針は前の名を覆すと書いていません。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`reachedEndTaskCount`。後の方針 P-8 に合う。`taskRowCount`・`rowCount` と同じ形* |
| 🔄 *b* | 🔄 *`endTasksReached`（`JDG-3473` のまま）* |
| 🔄 *c* | 🔄 *`endTaskCount`。短いが「届いた」が名から落ちる* |

回答:

#### 🔄 *❓ 問 23. 遅延診断の答えの欄 `markerStates` —— 禁じた語 Marker*

🔄 *場面: 答えはタスクごとに、遅延診断がそのタスクに付けた印を返します。値は `unreliable`（信用できない、紫）・`bottleneck`・`bottleneckPath`・`delay` の 4 つです。*

🔄 *食い違い: `JDG-3372` は語 Marker を禁じました（進捗の印は `progressStatusMark`、`JDG-3742`）。欄の中の `row` も仕様書の行 ID（`DG-1`〜`DG-4`）を返し、`JDG-3285` に反します。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *`diagnosisMarks`（中は `taskUid`・`diagnosisMark`）。GRS JSON β の説明が同じ値を「the diagnosis marks」と呼ぶ（P-4）。値 `delay` は診断の前から付く印も入る* |
| 🔄 *b* | 🔄 *`progressStatusMarks`（中は `progressStatusMark`）。進捗ステータスマークの語。ただし 5 つの進捗ステータスは入らない* |
| 🔄 *c* | 🔄 *`diagnosisStatuses`（中は `diagnosisStatus`）。表の列 `diagnosisStatus` の語。ただし列の値の組（`suspicion`・`omission` を含む）と違う* |

回答:

#### 🔄 *❓ 問 24. 遅延診断の答えの、新しい英語の名の表*

🔄 *場面: 遅延診断の答えは、指摘の観点（どの検査に当たったか）を、今は仕様書の行 ID（`VC-1` など）で返します。`JDG-3285` は外に出す値の行 ID を禁じ、意味の英語の名にすると決めました。どの裁定も名をまだ付けていません。席は、前置詞を避け（P-5）、GRS JSON β の語（`percentCompleteNoActualStart` の `percentComplete` など）と用語集の語を使って、名を選びました。答えの中の名の全部（265 名）と、規則で決まった名は `agent-api-names-delay-diagnosis-draft.md` にあります。*

🔄 ***24-1 観点のキー**: 指摘の行で観点を言う欄（今は `row`）を `reason`（修正案の行では `findingReason`）にします。表の列「理由」の名 `diagnosisReason`（`JDG-3726`）の語です。もう 1 つの案は `check`。*

🔄 ***24-2 観点の名（26）と、診断が止まった訳の名（2）***

| 🔄 *行* | 🔄 *中身* | 🔄 *推しの名* |
|:---|:---|:---|
| 🔄 *VC-1* | 🔄 *依存に輪がある* | 🔄 *`dependencyCycle`* |
| 🔄 *VC-2* | 🔄 *自分への依存* | 🔄 *`selfDependency`* |
| 🔄 *VC-3* | 🔄 *同じ向きの依存が 2 本以上* | 🔄 *`duplicateDependency`* |
| 🔄 *VC-4* | 🔄 *マイルストーンなのに開始と終了が違う* | 🔄 *`milestoneDatesDiffer`* |
| 🔄 *VC-5* | 🔄 *完了率が 0 より大きいのに実績開始が無い* | 🔄 *`percentCompleteNoActualStart`* |
| 🔄 *VC-6* | 🔄 *実績終了があるのに実績開始が無い* | 🔄 *`actualFinishNoActualStart`* |
| 🔄 *VC-7* | 🔄 *未着手なのに中断・再開の日を持つ* | 🔄 *`notStartedSuspended`* |
| 🔄 *VC-8* | 🔄 *実績終了があるのに再開日が有効* | 🔄 *`finishedResumeConfirmed`* |
| 🔄 *VC-9* | 🔄 *親が完了なのに子に未完了* | 🔄 *`parentFinishedChildUnfinished`* |
| 🔄 *VC-10* | 🔄 *子が全部完了なのに親が未完了* | 🔄 *`childrenFinishedParentUnfinished`* |
| 🔄 *VC-11* | 🔄 *親の予定の両端が子と違う* | 🔄 *`parentPlanSpanMismatch`* |
| 🔄 *VC-12* | 🔄 *親の実績の両端が子と違う* | 🔄 *`parentActualSpanMismatch`* |
| 🔄 *VC-13* | 🔄 *後続が完了なのに、縛る先行の端が起きていない* | 🔄 *`bindingPredecessorEndMissing`* |
| 🔄 *VC-14* | 🔄 *手で完了にしたマイルストーンの先行に未完了* | 🔄 *`milestoneFinishedPredecessorUnfinished`* |
| 🔄 *VC-15* | 🔄 *予定の日付が依存の向きに反する* | 🔄 *`planDatesViolateDependency`* |
| 🔄 *VS-1* | 🔄 *親と子の間に依存がある* | 🔄 *`parentChildDependency`* |
| 🔄 *VS-2* | 🔄 *子を持つマイルストーン* | 🔄 *`milestoneHasChildren`* |
| 🔄 *VS-3* | 🔄 *先行が未着手なのに後続が着手済み* | 🔄 *`successorStartedPredecessorNotStarted`* |
| 🔄 *VS-4* | 🔄 *実績の日付が依存の向きに反する* | 🔄 *`actualDatesViolateDependency`* |
| 🔄 *VS-5* | 🔄 *実績の日付が基準日より後* | 🔄 *`futureActualDate`* |
| 🔄 *VS-6* | 🔄 *親の進捗の点が子孫の点の範囲を外れる* | 🔄 *`parentProgressPointMismatch`* |
| 🔄 *VO-1* | 🔄 *実績開始が無い* | 🔄 *`actualStartMissing`* |
| 🔄 *VO-2* | 🔄 *実績終了も中断も無い* | 🔄 *`actualFinishMissing`* |
| 🔄 *VO-3* | 🔄 *FS の後続が着手済みなのに、先行に実績終了が無い* | 🔄 *`predecessorActualFinishMissing`* |
| 🔄 *VO-4* | 🔄 *親が 1 つに決まらない（診断が止まった訳 `DW-2` も同じ名）* | 🔄 *`parentTaskUndecided`* |
| 🔄 *VO-5* | 🔄 *達成しているのに手の実績終了が無い* | 🔄 *`milestoneAchievedNotFinished`* |
| 🔄 *DW-3* | 🔄 *先行の無いマイルストーン（診断が止まった訳）* | 🔄 *`milestonePredecessorMissing`* |

🔄 ***24-3 そのほかのキーと、修正案の択の語***

| 🔄 *今の名* | 🔄 *推しの名* | 🔄 *もう 1 つの案* | 🔄 *訳* |
|:---|:---|:---|:---|
| 🔄 *`taskGroupAboveWithoutSpanBar`* | 🔄 *`spanlessParentTaskGroupName`* | 🔄 *`parentTaskGroupName`* | 🔄 *前置詞を避ける（P-5）。値は名だけにする* |
| 🔄 *`openField`* | 🔄 *`focusTarget`* | 🔄 *`focusedField`* | 🔄 *open は読みが 2 つ（P-5）* |
| 🔄 *`depth`* | 🔄 *`parentTaskDepth`* | 🔄 *`taskTreeDepth`* | 🔄 *用語集の Depth（タスクグループの木）と分ける（P-4）* |
| 🔄 *`deleteLinkBetween`* | 🔄 *`deleteNamedDependency`* | 🔄 *`deleteDependencyLine`* | 🔄 *Between は前置詞。Link は命令の語 Dependency にそろえる* |
| 🔄 *`keepThisLink`* | 🔄 *`keepDependency`* | 🔄 *`keepOneDependency`* | 🔄 *This は指す語（P-5）* |
| 🔄 *`finishChildrenOnParentFinish`* | 🔄 *`finishChildrenParentFinishDay`* | 🔄 *`finishOpenChildren`* | 🔄 *On は前置詞* |
| 🔄 *`finishPredecessorsOnMilestoneDate`* | 🔄 *`finishPredecessorsMilestoneDay`* | 🔄 *`finishOpenPredecessors`* | 🔄 *同上* |
| 🔄 *`makeParentTaskFromTaskGroup`* | 🔄 *`makeTaskGroupParentTask`* | 🔄 *`createParentTaskForTaskGroup`* | 🔄 *From は前置詞* |
| 🔄 *`markAsStarted`・`markAsFinished`・`markAsStillInProgress`* | 🔄 *`markStarted`・`markFinished`・`markStillInProgress`* | 🔄 *今のまま* | 🔄 *As は前置詞* |

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *表のとおり（推しの名）* |
| 🔄 *b* | 🔄 *直す行がある（行に ★ を付けるか、回答に行と名を書く）* |

回答:

#### 🔄 *❓ 問 25. 席が方針で決めた名 —— このとおりでよいか*

🔄 *AI-C の所見と、一覧に出てこなかった名のうち、方針か前の裁定で名が 1 つに決まる物を、席が決めました（`JDG-3686`）。持ち主が決めた名（`JDG-3781`）を改める行もあるので、まとめて見せます。*

| 🔄 *今の名* | 🔄 *席が決めた名* | 🔄 *決めた規則* |
|:---|:---|:---|
| 🔄 *型 `AgentDelayDiagnostics` と、それが広げる型 `DelayDiagnosticsReport`* | 🔄 *1 つの型 `DelayDiagnosisReport` に畳む* | 🔄 *仕様書の表 T-317 が修正案と修正の記録も持つ。1 つの物に 1 つの型（P-4・`JDG-3512`）。2 つが同じ名になるぶつかりも消える* |
| 🔄 *`readShownTasks`・型 `ShownTasks`* | 🔄 *`readDrawnTasks`・`DrawnTasks`* | 🔄 *欄 `drawnTaskUids` と 1 語（P-4）。`shown` は GRS JSON の `showMode` の値で別の意味* |
| 🔄 *`SavedFile.savedTo`・`SavedFile.backedUpTo`* | 🔄 *`savedFilePath`・`backupFilePath`* | 🔄 *同じ種類の値 `existingFilePath` と同じ語（P-4）。前置詞で終えない（P-5）* |
| 🔄 *断りの訳 `canceled`* | 🔄 *`canceledByUser`* | 🔄 *何が・どうなった（P-10）。過去分詞＋By は、した者（P-11）* |
| 🔄 *断りの理由 `confirmationInProgress`* | 🔄 *`questionInProgress`* | 🔄 *人に出した問いは `pendingQuestion`（`JDG-3774`）と同じ物（P-4）* |
| 🔄 *断りの理由 `noFixProposalToApply`* | 🔄 *`fixProposalsEmpty`* | 🔄 *兄弟 `historyEmpty` と同じ形（P-10）。否定の形を避ける（`JDG-3740`）* |
| 🔄 *`closeWindow.window`* | 🔄 *`closeWindow.tableWindow`（型 `TableWindowName`）* | 🔄 *窓の名を受ける引数は 1 つの語（P-4）。プロパティパネルは道具 `closePropertiesPanel` へ移った。人が閉じられる表の窓は AI も閉じられる（`JDG-3671`）* |
| 🔄 *型 `Document`* | 🔄 *`ScheduleDocument`* | 🔄 *GRS JSON β の根の物の名（P-4）。部分だけを返す答えは説明の文で言う* |
| 🔄 *型 `AgentRefusalReason`* | 🔄 *`RefusalReason`* | 🔄 *頭の `Agent` を外す（P-5）* |
| 🔄 *断りの欄 `target`* | 🔄 *`member`* | 🔄 *CR-851 の対応表と一覧の `member`（`JDG-3781`）* |
| 🔄 *表の列の欄 `kind`* | 🔄 *`valueType`* | 🔄 *`JDG-3564`* |
| 🔄 *命令の中の `carriedActualDuration`* | 🔄 *`passthroughActualDuration`* | 🔄 *carry を passthrough に替える（`JDG-3766`・P-4）* |
| 🔄 *暦の例外の `recurrenceKind`* | 🔄 *`type`* | 🔄 *GRS JSON の `exceptions[].type`（`JDG-3628`・P-4）* |
| 🔄 *`editTableWindow.set` の `shownTaskUids`・`shownResourceUids`・`isUnassignedShown`・`sort`* | 🔄 *`checkedTaskUids`・`checkedResourceUids`・`isUnassignedChecked`・`columnSort`* | 🔄 *GRS JSON β の窓のキー（`JDG-3713`・`JDG-3708`・P-4）* |
| 🔄 *型 `InvariantRow`・`CodecRefusalReason`、暦の例外の `carryElements`・`carry`・`ordinal`、引出し線の形 `calloutBox`・`polyline`* | 🔄 *無くす* | 🔄 *行 ID を外に出さない（`JDG-3285`）。持ち越しは `grs.passthrough` 1 つ（`JDG-3606`・`JDG-3748`）。引出し線の形は CR-851 の対応表が退ける* |

🔄 *席が直す（新しい名を作らない）: 方針 P-4 に「`set` は物の中の道から `grs` の段だけを除いて書く」、P-9 に「欄の名の名詞を含み、物の語を頭に足してよい（`TableRow`、`JDG-3782`）」、P-11 に「画面の札から来た名の前置詞は札のまま（`zoomToFit`）」と「過去分詞＋By＋手段（`isScheduleFilteredByChecks`、`JDG-3728`）」を足した。一覧に `editTableWindow.set` の行、表の値と窓の名の対応、数え方の直し、`watcher` の説明を足した。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *このとおり* |
| 🔄 *b* | 🔄 *直す行がある（行に ★ を付けるか、回答に行と名を書く）* |

回答:

***

## ❓ 自由

回答:
