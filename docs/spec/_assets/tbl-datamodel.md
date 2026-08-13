# データモデル — エンティティと列の全数

**UID**: DOC-TBL-DATAMODEL
**Version**: 0.1

**本書が構造と列名の正である。** 本書と食い違う列名を他所で見たら、本書が勝つ。

**画面に出る語の正は `tbl-glossary.md`（`DOC-TBL-GLOSSARY`）、設定値の正は `tbl-settings.md`（`DOC-TBL-SETTINGS`）、規則と理由の正は `01-04-requirements.md` である。** 本書が持つのは**文書が保持する構造**、すなわちエンティティ・列・型・必須の別・由来・制約である。

由来は前プロジェクトのデータモデル確定版（`previous-project-result/02-data-model/grs-native-erd-ja.md`）であり、**予実と進捗の領域はその上に `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` を重ねた後の形**を引き継いだ（由来の文書は自身が旧版であることを明記している）。**構造は 1 つも落とさずに引き継いだ。** 一方、**綴りは本仕様書の記法に合わせて裁いた** —— 全数を表 T-301 に示す。

> ⚠️ **数値（既定値・範囲）は本書に無い。** 本書が持つのは**列**である。
> 値は `tbl-settings.md` が持つ。**列と値を 2 か所で管理しない。**

> **この文書はまだ器である。** 未記入の節は引用で始まる行を持つ。

## 1. 本書の読み方

**Type**: SECTION

**列名の記法は `01-04-requirements.md` の表 T-006a に従う。** 本書が扱うのは **JSON プロパティの面**なので `W-2`（camelCase）が既定であり、snake_case を許すのは `W-8` が名指しする 3 語だけである。**`W-8` を増やしてはならない（MUST NOT）** —— 同表がそう定めている。

**由来の文書と綴りが違っても、語幹が一致していれば矛盾ではない**（表 T-006a の注）。**語幹まで違えたもの、および列そのものを持たないと決めたものは、理由とともに表 T-301 に残すこと（MUST）。** 由来を読んだ者が突き合わせられなくなるためである。

**由来の欄の読み方。** `Own` は MSPDI の要素をそのままの形で持つもの、`Consume` は MSPDI の要素を別の構造に組み替えて持つもの、`GRS` は MSPDI に対応が無い本製品の新設である。**`Reconstruct`（保存せず書き出しのときに算出するもの）は列ではないので本書に列として載せない。** 対応の全数は `tbl-mspdi.md`（`DOC-TBL-MSPDI`）が持つ。

**表 T-301 — 由来から綴りまたは扱いを変えたもの**

| 行 ID | 由来の綴り | 本仕様 | 理由 |
| --- | --- | --- | --- |
| NR-1 | `milestone`（真偽値） | **列として持たない** | 表 T-005 の `G-1` が名指しで禁じている ——「バーもマイルストーンも `Task` であり、`Task.shapeKind` の値で区別する」。**1 つの概念に 2 つの表し方を与えない。** MSPDI の `Milestone` は書き出しのときに `shapeKind` から算出する |
| NR-2 | `wbs_parent_uid` | `wbs_parent_uid` | **変えない。** 表 T-006a の `W-8` が名指しする 3 語のひとつ |
| NR-3 | `link_type` | `link_type` | **変えない。** 同上 |
| NR-4 | `status_date` | `status_date` | **変えない。** 同上（`Project.status_date`） |
| NR-5 | `stack_order` | `stackOrder` | `W-2`。**表 T-101 の `N-4` が確定名として `stackOrder` を持つ**ので、語幹も記法も既存と一致する |
| NR-6 | `wbs_order` | `wbsOrder` | `W-2`。`wbs_parent_uid` と対に見えるが、こちらは MSPDI に対応が無い本製品の新設なので `W-8` の適用外である |
| NR-7 | `calendar_id` | `calendarId` | `W-2` |
| NR-8 | `predecessor_uid` | `predecessorUid` | `W-2` |
| NR-9 | `successor_uid` | `successorUid` | `W-2` |
| NR-10 | `lag_format` | `lagFormat` | `W-2` |
| NR-11 | `parent_id` | `parentId` | `W-2` |
| NR-12 | `group_id` | `groupId` | `W-2` |
| NR-13 | `task_uid` | `taskUid` | `W-2` |
| NR-14 | `derived_from_task_uid` | `derivedFromTaskUid` | `W-2` |
| NR-15 | `carry_elements` | `carryElements` | `W-2` |
| NR-16 | `TaskGroup.order` | `TaskGroup.siblingOrder` | **語幹を変えた。** `order` だけでは何の順序か読めず、`Task.wbsOrder` と並んだときにどちらの木の順序か判別できない。**どちらも「兄弟のあいだの順序」という同じ概念なので、木の名前で分ける** |
| NR-17 | `TaskGroup.color` | `TaskGroup.fillColor` | **語幹を変えた。** 塗り色は 1 つの概念なので、`TaskVisual.fillColor` と同じ語を使う（表 T-006a の注 ——「1 つの概念には 1 つの語しか与えない」）。`color` 単独は無意味な汎用語に近い |
| NR-18 | `TaskGroup.height` | `TaskGroup.rowHeight` | **語幹を変えた。** 何の高さか読めないため。`tbl-settings.md` に同名の鍵は無いので衝突しない |

⚠️ **本表は塊ごとに増える。** エンティティの残り（表 T-302 で「未記入」と記した行）を書くときに、その塊の裁定を追記すること（MUST）。

## 2. エンティティ

**Type**: SECTION

**層の意味。** **コア**は、それが無いと本製品のデータ構造が成立しないものである。**付随**は、外しても構造は壊れないが機能が減るものである。

**`export` の欄は MSPDI へ書き出すかどうかを表す。** **書き出さないものは、本製品の JSON にだけ存在する。**

**表 T-302 — エンティティ**

| 行 ID | エンティティ | 層 | 由来 | export | 責務 | 列 |
| --- | --- | --- | --- | :-: | --- | --- |
| EN-1 | `Task` | コア | Own | ● | 日程要素の本体。予定・実績・中断の日付、WBS の親、暦の参照を持つ | 表 T-303 |
| EN-2 | `TaskGroup` | コア | GRS | — | **行の器**と見出しの階層、および行ごとの書式 | 表 T-304 |
| EN-3 | `TaskGroupMember` | コア | GRS | — | どの `Task` がどの行に載るかと、その行の中での縦の積み順 | 表 T-305 |
| EN-4 | `Dependency` | コア | Consume | ● | タスク間の依存。先行・後続・種別・ずらし量。**線の経路は保存しない** | 表 T-306 |
| EN-5 | `Project` | 付随 | Own | ● | 文書の根。文書の基本情報と、換算の基準と、既定の暦の参照 | 未記入 |
| EN-6 | `Calendar` | 付随 | Own | ● | 稼働日と非稼働日の暦 | 未記入 |
| EN-7 | `WeekDay` | 付随 | Own | ● | 曜日ごとの稼働の可否 | 未記入 |
| EN-8 | `Exception` | 付随 | Own | ● | 特定の日の稼働の可否 | 未記入 |
| EN-9 | `Resource` | 付随 | Own | ● | 担当者などの資源。**担当ラベルに出す名前の出どころ** | 未記入 |
| EN-10 | `Assignment` | 付随 | Consume | ● | `Task` と `Resource` の割当 | 未記入 |
| EN-11 | `TaskVisual` | 付随 | GRS | — | `Task` の見た目。形状・色・線の太さ・名称ラベルの位置 | 未記入 |
| EN-12 | `TaskOrigin` | 付随 | GRS | — | その `Task` がどの外部マスタから来たか。**合流の既定の判定に使う** | 未記入 |
| EN-13 | `Comment` | 付随 | GRS | — | 位置を指す注記 | 未記入 |
| EN-14 | `HighlightBox` | 付随 | GRS | — | 範囲を囲む注記 | 未記入 |

**`TaskVisual` と `TaskOrigin` を `Task` から分けてある理由は、`Task` を「MSPDI の `Own` だけを持つ器」に保つためである。** そうしておくと書き出しが「`Task` の全列をそのまま書く」で済み、**除外する列の一覧を作らなくてよい** —— 一覧を作れば、そこから漏れる誤りが必ず生まれる。

## 3. コアのエンティティ

**Type**: SECTION

**必須の欄。** `PK` は主キー、`FK` は他のエンティティを指す列、`必須` はその列が無いと構造が成立しないもの、`任意` は `null` を取りうるものである。

⚠️ **`null` は「元のファイルにその要素が無かった」を表し、`0` や `false` とは区別する（MUST）。** 本製品の JSON は `null` の列も鍵ごと書き出し、**鍵を省略してはならない（MUST NOT）** —— 「定義していない」と「`null` と定義した」が区別できないと、書き忘れなのか値が無いという意図なのかが読めなくなる。**MSPDI へ書き出すときだけ省略する。**

**表 T-303 — `Task` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-1 | `uid` | 整数 | PK | Own | 文書の中で一意な識別子。**値から意味を読み取ってはならない（MUST NOT）** —— 大小も連続性も意味を持たない |
| DM-2 | `wbs_parent_uid` | 整数 | 任意・FK | Consume | WBS の親。`null` は根。**深さの上限を設けない** |
| DM-3 | `wbsOrder` | 整数 | 必須 | GRS | WBS の同じ親を持つもののあいだの順序 |
| DM-4 | `name` | 文字列 | 任意 | Own | 名称 |
| DM-5 | `start` | 日付 | 任意 | Own | 予定の開始 |
| DM-6 | `finish` | 日付 | 任意 | Own | 予定の終了 |
| DM-7 | `actualStart` | 日付 | 任意 | Own | 実績の開始 |
| DM-8 | `actualDuration` | 整数 | 任意 | Own | 実績の長さ。**稼働日数で持つ。実績バーの長さそのものである** |
| DM-9 | `actualFinish` | 日付 | 任意 | Own | 実際に終わった日。**完了したときだけ値が入る** |
| DM-10 | `percentComplete` | 整数 | 任意 | Own | 完了率。**日付から算出して格納する。下限も上限も課さない** |
| DM-11 | `deadline` | 日付 | 任意 | Own | 期限 |
| DM-12 | `resume` | 日付 | 任意 | Own | 残りを再開する予定の日。**中断しているときだけ値が入る** |
| DM-13 | `resumeValid` | 真偽 | 任意 | Own | 再開できるか。`false` は再開日が定まらない中断を表す |
| DM-14 | `notes` | 文字列 | 任意 | Own | 備考 |
| DM-15 | `fadeInDays` | 整数 | 任意 | Consume | 始まりの日付の曖昧さを表すぼかしの日数 |
| DM-16 | `fadeOutDays` | 整数 | 任意 | Consume | 終わりの日付の曖昧さを表すぼかしの日数 |
| DM-17 | `calendarId` | 整数 | 任意・FK | Consume | この `Task` が使う暦。`null` は文書の既定の暦 |
| DM-18 | `carry` | 対応表 | 任意 | GRS | 本製品が意味を使わない MSPDI の列を、解釈せずそのまま保持する場所 |
| DM-19 | `carryElements` | 配列 | 任意 | GRS | 本製品が行を作らない MSPDI の要素を、丸ごと保持する場所 |

⚠️ **`carry` と `carryElements` は往復で情報を失わないための器であり、意味を解釈してはならない（MUST NOT）。** 中身は XML の文字列ではなく構造として持つので、読むことも差分を取ることもできる。**解釈しないだけである。**

**表 T-304 — `TaskGroup` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-20 | `id` | 文字列 | PK | GRS | 行の器の識別子。**`Task` の識別子とは番号空間が別である** |
| DM-21 | `parentId` | 文字列 | 任意・FK | GRS | 行の入れ子の親。`null` は根 |
| DM-22 | `label` | 文字列 | 任意 | GRS | 行の名前。`null` のときは `derivedFromTaskUid` が指す `Task` の名称から導く |
| DM-23 | `derivedFromTaskUid` | 整数 | 任意・FK | GRS | `label` が `null` のときに名前を導く元の `Task` |
| DM-24 | `siblingOrder` | 整数 | 必須 | GRS | 同じ親を持つ行のあいだの順序 |
| DM-25 | `collapsed` | 真偽 | 必須 | GRS | 畳んでいるか。**見た目の一部なので文書が持つ** |
| DM-26 | `fillColor` | 文字列 | 任意 | GRS | 行の塗り色。`null` は文書のテーマ色から解く |
| DM-27 | `rowHeight` | 整数 | 任意 | GRS | 行の高さ。`null` は自動 |

**表 T-305 — `TaskGroupMember` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-28 | `groupId` | 文字列 | PK・FK | GRS | どの行に載せるか |
| DM-29 | `taskUid` | 整数 | PK・FK | GRS | どの `Task` を載せるか。**1 つの `Task` は高々 1 つの行にしか載らない** |
| DM-30 | `stackOrder` | 整数 | 任意 | GRS | 行の中での縦の積み順。`null` は自動、値が入っているのは人が指定したものである |

**表 T-306 — `Dependency` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-31 | `successorUid` | 整数 | PK・FK | Consume | 後続の `Task` |
| DM-32 | `predecessorUid` | 整数 | PK・FK | Consume | 先行の `Task` |
| DM-33 | `link_type` | 整数 | PK | Consume | 依存の種別 |
| DM-34 | `lag` | 整数 | 任意 | Consume | ずらし量 |
| DM-35 | `lagFormat` | 整数 | 任意 | Consume | ずらし量の単位 |

⚠️ **`Dependency` は主キーを 3 つの列で作る。** MSPDI が依存に識別子を振らないためであり、**代理キーを足してはならない（MUST NOT）。**

⚠️ **依存線の経路を列として持たない。** 経路は毎回算出する。

## 4. 付随のエンティティ

**Type**: SECTION

> 未記入。表 T-302 の `EN-5` 〜 `EN-14` の列を書く。順序は、根と出自（`Project` / `TaskOrigin`）→ 暦（`Calendar` / `WeekDay` / `Exception`）→ 資源（`Resource` / `Assignment`）→ 見た目と注記（`TaskVisual` / `Comment` / `HighlightBox`）とする。

## 5. 識別子

**Type**: SECTION

> 未記入。主キーの取り方と、識別子を新しく作るときの規則を書く。**代理キーを持たない**方針と、その方針が成立する理由（合流のときに識別子の衝突を解消するので、文書の中では常に一意になる）を書く。

## 6. 削除の連鎖

**Type**: SECTION

> 未記入。あるエンティティを消したときに、どのエンティティが一緒に消えるかを書く。

## 7. 合流

**Type**: SECTION

> 未記入。複数の文書を合流させるときの照合の規則を書く。判断の入口は `01-04-requirements.md` の表 T-032a が持つので、本節は**何と何を同じものとみなすか**だけを持つ。
