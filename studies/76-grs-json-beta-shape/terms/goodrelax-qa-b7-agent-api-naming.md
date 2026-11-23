
# Agent API と文書の命令の名 —— 方針の残りと、方針で決まらない名

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA7 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

🔄 *作った日: 2026-11-23（Agent API の名の席）。2〜5 巡目: 2026-11-23。5 巡目で方針の問いはすべて決まった。6 巡目: 方針を当てた名の確かめ（[apply]）を足した。7 巡目で [apply] も決まり、問いはすべて閉じた*

🔄 *残 1（❓ で検索）*

この紙の範囲: 方針の案 `agent-api-naming-policy-draft.md` のうち、持ち主が説明と比較を求めた 4 行（P-7・P-8・P-10・P-11、`JDG-3716`）と、方針で 1 つに決まらない名 4 つです。方針が決まったら、席が BGQA4（文書の命令 16 問）と BGQA5（Agent API 29 問）の名を方針でそろえ、結果を 1 枚にして持ち主に 1 度で確かめてもらいます（P-12 のレビューもそこで行います）。

| 分野 | 問い |
|:---|:---|
| [pol] 名の付け方の方針 | 無し（すべて決まった） |
| [name] 方針で決まらない名 | 無し（すべて決まった） |
| [apply] 方針を当てた名の確かめ | 🔄 *無し（すべて決まった）* |

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

| 🔄 *問い* | 🔄 *決まったこと* | 🔄 *裁定* |
|:---|:---|:---|
| 🔄 *45 問の名* | 🔄 *一覧 `agent-api-names-by-policy-draft.md` のとおり（変える名 134、今のままの名 182）。`setDependencyLag`・`TableRowsOutcome` ほか席が決めた 4 つ、`shiftScheduleByMinutes`・`deleteDependencyAt` も含む* | 🔄 *`JDG-3781`* |
| 🔄 *画面の表の型* | 🔄 *`TableRow`・`TableColumn`・`TableCell`* | 🔄 *`JDG-3782`* |
| 🔄 *変更の知らせの `mark`* | 🔄 *欄 `mark` と型 `WatcherMark` を無くす。時刻は `stamp.scheduleDataUpdatedAt` が言う* | 🔄 *`JDG-3783`* |

***

## QA

### [pol] 名の付け方の方針 ✅

すべて決まりました（上の決定事項）。

### [name] 方針で決まらない名 ✅

すべて決まりました（上の決定事項）。

### [apply] 🔄 *方針を当てた名の確かめ ✅*

🔄 *すべて決まりました（上の決定事項）。*

***

## ❓ 自由

回答:
