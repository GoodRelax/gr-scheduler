# データモデル — エンティティと列の全数

**UID**: DOC-TBL-DATAMODEL
**Version**: 0.1

**本書が構造と列名の正である。** 本書と食い違う列名を他所で見たら、本書が勝つ。

**画面に出る語の正は `tbl-glossary.md`（`DOC-TBL-GLOSSARY`）、設定値の正は `tbl-settings.md`（`DOC-TBL-SETTINGS`）、規則と理由の正は `01-04-requirements.md` である。** 本書が持つのは**文書が保持する構造**、すなわちエンティティ・列・型・必須の別・由来・制約である。

由来は前プロジェクトのデータモデル確定版（`previous-project-result/02-data-model/grs-native-erd-ja.md`）であり、**予実と進捗の領域はその上に `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` を重ねた後の形**を引き継いだ（由来の文書は自身が旧版であることを明記している）。**構造は 1 つも落とさずに引き継いだ。** 一方、**綴りは本仕様書の記法に合わせて裁いた** —— 全数を表 T-301 に示す。

> ⚠️ **数値（既定値・範囲）は本書に無い。** 本書が持つのは**列**である。
> 値は `tbl-settings.md` が持つ。**列と値を 2 か所で管理しない。**

> **本書は全数を記入し終えている。** 未記入の節は無い。

## 1. 本書の読み方

**Type**: SECTION

**列名の記法は `01-04-requirements.md` の表 T-006a に従う。** 本書が扱うのは **JSON プロパティの面**なので `W-2`（camelCase）が既定であり、snake_case を許すのは `W-8` が名指しする 3 語だけである。**`W-8` を増やしてはならない（MUST NOT）** —— 同表がそう定めている。

**由来の文書と綴りが違っても、語幹が一致していれば矛盾ではない**（表 T-006a の注）。**語幹まで違えたもの、および列そのものを持たないと決めたものは、理由とともに表 T-301 に残すこと（MUST）。** 由来を読んだ者が突き合わせられなくなるためである。

**由来の欄の読み方。** `Own` は MSPDI の要素をそのままの形で持つもの、`Consume` は MSPDI の要素を別の構造に組み替えて持つもの、`GRS` は MSPDI に対応が無い本製品の新設である。**`Reconstruct`（保存せず書き出しのときに算出するもの）は列ではないので本書に列として載せない。** 対応の全数は `tbl-mspdi.md`（`DOC-TBL-MSPDI`）が持つ。

**表 T-301 — 由来から綴りまたは扱いを変えたもの**

| 行 ID | 由来の綴り | 本仕様 | 理由 |
| --- | --- | --- | --- |
| NR-1 | `milestone`（真偽値） | **列として持たない** | 表 T-005 の `G-1` が名指しで禁じている ——「バーもマイルストーンも `Task` であり、`shapeKind` の値で区別する」。**1 つの概念に 2 つの表し方を与えない。** MSPDI の `Milestone` は書き出しのときに `shapeKind` から算出する。⚠️ **由来の予実の文書はこれと逆に定めていた** ——「不変条件: `shapeKind = 'milestone'` ⇔ `Task.milestone = true`。権威は `Task.milestone` 側」であり、理由は「そちらが export される側だから、食い違ったときに往復で失われる」であった。**本仕様は列を 1 つにしたので、食い違いうる 2 つ目が存在しない。** そのぶん `shapeKind` が必ず定まる必要があり、`DM-96` が `null` の意味を定めている |
| NR-2 | `wbs_parent_uid` | `wbs_parent_uid` | **変えない。** 表 T-006a の `W-8` が名指しする 3 語のひとつ |
| NR-3 | `link_type` | `link_type` | **変えない。** 同上 |
| NR-4 | `status_date` | `status_date` | **変えない。** 同上（`Project.status_date`） |
| NR-5 | `stack_order` | `stackOrder` | `W-2`。**表 T-101 の `N-4` が確定名として `stackOrder` を持つ**ので、語幹も記法も既存と一致する |
| NR-6 | `wbs_order` | `wbsOrder` | `W-2`。**`W-8` の例外は綴りを名指しした 3 語だけなので、`Consume` であってもこの語は含まれない** |
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
| NR-19 | `schema_version` | `schemaVersion` | `W-2` |
| NR-20 | `uid_high_water_mark` | `uidHighWaterMark` | `W-2` |
| NR-21 | `start_date` | `startDate` | `W-2` |
| NR-22 | `minutes_per_day` | `minutesPerDay` | `W-2`。`minutesPerWeek` / `daysPerMonth` も同じ |
| NR-23 | `week_start_day` | `weekStartDay` | `W-2` |
| NR-24 | `created` | `creationDate` | **語幹を変えた。** `Own` の列は MSPDI の要素名に語幹を合わせる —— そうしておくと対応表が字面で読め、写し違いが起きない。`name` / `title` / `revision` は既にそうなっており、この 1 語だけが外れていた |
| NR-25 | `last_saved` | `lastSaved` | `W-2` |
| NR-26 | `meta_own` | **展開する** | 由来の図が「他の `Own` メタをまとめて 1 行で示す」ために置いた省略記法であって、列ではない。`subject` / `category` / `company` / `manager` / `author` / `creationDate` / `lastSaved` / `minutesPerWeek` / `daysPerMonth` へ展開した |
| NR-27 | `source_project_uid` | `sourceProjectUid` | `W-2` |
| NR-28 | `source_uid` | `sourceUid` | `W-2` |
| NR-29 | `last_seen_import_seq` | `lastSeenImportSeq` | `W-2` |
| NR-30 | `import_session_id` | `importSessionId` | `W-2` |
| NR-31 | **（由来に無い）** | `Project.lastWriter` ／ `Project.lastWrittenAt` | **列を 2 つ足した。** `FR-063` が「最後に書いた者と時刻」を文書に持たせることを求めているのに、由来のデータモデルに受け皿が無かった。**MSPDI にも対応する要素が無い** —— `docs/reference/mspdi/mspdi_pj12.xsd`（239,895 バイト）を検索し、`Author` と `LastSaved` はあるが**最後に書いた者を表す要素が存在しない**ことを確認した。時刻を `lastSaved` で兼ねないのは、あちらが**保存**の時刻だからである。⚠️ **透かしに出す名前（`tbl-settings.md` の `S-99a`）とも別物である** —— あちらは読む人の環境に属し文書に保存しない |
| NR-32 | `is_base` | `isBase` | `W-2` |
| NR-33 | `base_calendar_id` | `baseCalendarId` | `W-2` |
| NR-34 | `day_type` | `dayOfWeek` | **語幹を変えた。** `type` は表 T-006a が名指しで禁じる無意味な汎用語である。値が表すのは曜日そのものなので、それを名前にした。⚠️ `link_type` が残るのは `W-8` が綴りごと例外に挙げているためであり、矛盾ではない |
| NR-35 | `day_working` | `isWorkingDay` | **語幹を変えた。** `WeekDay` と `Exception` の両方に載る列で、「稼働か」を問う真偽値であることが `day_working` では読めない |
| NR-36 | `from_date` / `to_date` | `fromDate` / `toDate` | `W-2` |
| NR-37 | **（由来の図に無い）** | `Exception.recurrenceKind` | **列を足した。** 由来の ERD の図はこの列を描いていないが、**同じ文書の §5.5b が「Consume・必須」と定めている** —— 繰り返しの種別を読まないと、`fromDate` / `toDate` を実日付の範囲と誤って解釈し、**何年ぶんもが非稼働になる。** `type` を避けた理由は `NR-34` と同じ |
| NR-38 | `Resource.type` | `Resource.kind` | **語幹を変えた。** 同上、`type` は使えない |
| NR-39 | `is_cost_resource` | `isCostResource` | `W-2` |
| NR-40 | `resource_uid` | `resourceUid` | `W-2` |
| NR-41 | `Task.wbs_order` の由来 | **`GRS` ではなく `Consume`** | **由来の取り違えを正した。** 由来の文書は 3 か所で `Consume`（`OutlineLevel` ＋ 順序）と記しており、対になる `wbs_parent_uid` と同じ仕分けである |
| NR-42 | `Own` / `Consume` の列を `必須` としたもの | **すべて `任意` に戻した** | **由来の文書が「`Own` / `Consume` 列は `null` を取れること」を、往復で情報を失わないための前提として挙げている。** 該当は `revision` / `dayOfWeek` / `recurrenceKind` の 3 つで、いずれも元のファイルが要素を持たないことがある。**書き出しで必ず出す必要があるものは、`null` のまま出さずに既定を焼く** |
| NR-43 | **（由来の図に無い）** | `Dependency.carry` ／ `Dependency.carryElements` ／ `Dependency.ordinal` | **列を足した。** 依存には解釈しない要素（別プロジェクトを指す 2 つ）があるのに、預ける器が無かった。**由来の文書は、識別子を持たない要素を「親のキーと出現順」で識別すると定め、先行の一覧をその一覧に挙げている** |
| NR-44 | **（由来の図に無い）** | `WeekDay.carryElements` ／ `Exception.carryElements` | **列を足した。** 暦の稼働時間帯は解釈せず丸ごと預けると定めているのに、預ける器が親の側に無かった |
| NR-45 | **（由来に無い）** | `Project.importSeq` | **列を足した。** `TaskOrigin.lastSeenImportSeq` は「最後に届いた取り込みの通し番号」だが、**比べる相手の通し番号がどこにも無かった。** 由来の文書は文書全体の設定として持っていたが、**設定値ではなく文書の構造なので本書が持つ** |

⚠️ **列を足すとき、名前を変えるとき、持たないと決めるときは、本表に 1 行足すこと（MUST）。** 由来の文書との突き合わせは、本表だけを読んで行えなければならない。

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
| EN-5 | `Project` | 付随 | Own | ● | 文書の根。文書の基本情報と、換算の基準と、既定の暦の参照 | 表 T-307 |
| EN-6 | `Calendar` | 付随 | Own | ● | 稼働日と非稼働日の暦 | 表 T-309 |
| EN-7 | `WeekDay` | 付随 | Own | ● | 曜日ごとの稼働の可否 | 表 T-310 |
| EN-8 | `Exception` | 付随 | Own | ● | 特定の日の稼働の可否 | 表 T-311 |
| EN-9 | `Resource` | 付随 | Own | ● | 担当者などの資源。**担当ラベルに出す名前の出どころ** | 表 T-312 |
| EN-10 | `Assignment` | 付随 | Consume | ● | `Task` と `Resource` の割当 | 表 T-313 |
| EN-11 | `TaskVisual` | 付随 | GRS | — | `Task` の見た目。形状・色・線の太さ・名称ラベルの位置 | 表 T-314 |
| EN-12 | `TaskOrigin` | 付随 | GRS | — | その `Task` がどの外部マスタから来たか。**合流の既定の判定に使う** | 表 T-308 |
| EN-13 | `Comment` | 付随 | GRS | — | 位置を指す注記 | 表 T-315 |
| EN-14 | `HighlightBox` | 付随 | GRS | — | 範囲を囲む注記 | 表 T-316 |

**`TaskVisual` と `TaskOrigin` を `Task` から分けてある理由は、`Task` を「MSPDI の `Own` だけを持つ器」に保つためである。** そうしておくと書き出しが「`Task` の全列をそのまま書く」で済み、**除外する列の一覧を作らなくてよい** —— 一覧を作れば、そこから漏れる誤りが必ず生まれる。

## 3. コアのエンティティ

**Type**: SECTION

**必須の欄。** `PK` は主キー、`FK` は他のエンティティを指す列、`必須` はその列が無いと構造が成立しないもの、`任意` は `null` を取りうるものである。

⚠️ **`任意` の列における `null` は「元のファイルにその要素が無かった」を表し、`0` や `false` とは別の状態である。** この区別が失われると、書き忘れなのか値が無いという意図なのかが読めなくなる。**書き出しの規則は `FR-024`（本製品の JSON）と `FR-057` / 表 T-033（MSPDI）が持つ。本書はそれを再掲しない。**

**表 T-303 — `Task` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-1 | `uid` | 整数 | PK | Own | 文書の中で一意な識別子。**値から意味を読み取ってはならない（MUST NOT）** —— 大小も連続性も意味を持たない |
| DM-2 | `wbs_parent_uid` | 整数 | 任意・FK | Consume | WBS の親。`null` は根。**深さの上限を設けない**。⚠️ **自分の子孫を自分の親にしてはならない（MUST NOT）** —— 親を付け替えられる以上、輪ができうる |
| DM-3 | `wbsOrder` | 整数 | 任意 | Consume | WBS の同じ親を持つもののあいだの順序 |
| DM-4 | `name` | 文字列 | 任意 | Own | 名称 |
| DM-5 | `start` | 日付 | 任意 | Own | 予定の開始 |
| DM-6 | `finish` | 日付 | 任意 | Own | 予定の終了 |
| DM-7 | `actualStart` | 日付 | 任意 | Own | 実績の開始 |
| DM-8 | `actualDuration` | 整数 | 任意 | Own | 実績の長さ。**稼働日数で持つ。実績バーの長さそのものである** |
| DM-9 | `actualFinish` | 日付 | 任意 | Own | 実際に終わった日。**完了したときだけ値が入る** |
| DM-10 | `percentComplete` | 整数 | 任意 | Own | 完了率。**日付から算出して格納する。下限は 0、上限は課さない**（`FR-012`） |
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
| DM-21 | `parentId` | 文字列 | 任意・FK | GRS | 行の入れ子の親。`null` は根。**深さの上限は `FR-004` が持つ**（⚠️ WBS の深さとは別物で、あちらは上限を持たない） |
| DM-22 | `label` | 文字列 | 任意 | GRS | 行の名前。`null` のときは `derivedFromTaskUid` が指す `Task` の名称から導く |
| DM-23 | `derivedFromTaskUid` | 整数 | 任意・FK | GRS | `label` が `null` のときに名前を導く元の `Task`。⚠️ **`label` と同時に `null` にしてはならない（MUST NOT）** —— 行の名前が決まらなくなる |
| DM-24 | `siblingOrder` | 整数 | 必須 | GRS | 同じ親を持つ行のあいだの順序 |
| DM-25 | `collapsed` | 真偽 | 必須 | GRS | 畳んでいるか。**見た目の一部なので文書が持つ** |
| DM-26 | `fillColor` | 文字列 | 任意 | GRS | 行の塗り色。`null` は文書のテーマ色から解く |
| DM-27 | `rowHeight` | 整数 | 任意 | GRS | 行の高さ。**倍率 1 のときの論理値で持ち、拡大縮小に比例する。画面上の長さで持ってはならない（MUST NOT）** —— 縦横を別々に拡大縮小するので、画面上の長さだと倍率を変えた瞬間にずれる。`null` は自動 |

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
| DM-116 | `ordinal` | 整数 | 必須 | GRS | 先行の一覧の中での出現の順番。**書き出しの並びを元に戻すために持つ** |
| DM-117 | `carry` | 対応表 | 任意 | GRS | 意味を使わない MSPDI の列を保持する場所 |
| DM-118 | `carryElements` | 配列 | 任意 | GRS | 行を作らない MSPDI の要素を保持する場所 |

⚠️ **`Dependency` は主キーを 3 つの列で作る。** MSPDI が依存に識別子を振らないためであり、**代理キーを足してはならない（MUST NOT）。**

⚠️ **依存線の経路を列として持たない。** 経路は毎回算出する。

## 4. 付随のエンティティ

**Type**: SECTION

**表 T-307 — `Project` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-36 | `id` | 文字列 | 任意・PK | Own | 文書の識別子。**16 文字以下の文字列であり、汎用一意識別子ではない。** 元のファイルが持たないことがある |
| DM-37 | `schemaVersion` | 文字列 | 必須 | GRS | 本製品の文書の形の版。**これが無いと、古い形で保存された文書を読めるかどうかを判定できない** |
| DM-38 | `uidHighWaterMark` | 整数 | 必須 | GRS | 削除したものを含めて、これまでに使った識別子の最大値。**新しく作るときはこれに 1 を足す** |
| DM-39 | `name` | 文字列 | 任意 | Own | 文書の名前 |
| DM-40 | `title` | 文字列 | 任意 | Own | 文書名。**入口は `FR-035` 1 つである** |
| DM-41 | `subject` | 文字列 | 任意 | Own | 件名 |
| DM-42 | `category` | 文字列 | 任意 | Own | 分類 |
| DM-43 | `company` | 文字列 | 任意 | Own | 組織 |
| DM-44 | `manager` | 文字列 | 任意 | Own | 責任者 |
| DM-45 | `author` | 文字列 | 任意 | Own | 作成者。⚠️ **最後に書いた者ではない** |
| DM-46 | `revision` | 整数 | 任意 | Own | 版数。**1 ずつ増える**（`FR-063`）。元のファイルが持たないことがあるので `null` を取りうる |
| DM-47 | `creationDate` | 日時 | 任意 | Own | 作成した日時 |
| DM-48 | `lastSaved` | 日時 | 任意 | Own | 最後に**保存した**日時。⚠️ **最後に書いた時刻ではない** |
| DM-49 | `lastWriter` | 文字列 | 任意 | GRS | **最後に書いた者**（`FR-063`）。人が書いたか `Agent API` が書いたかを区別できる値を入れる。⚠️ **透かしに出す名前とは別物である** —— あちらは読む人の環境に属し、文書に保存しない（`tbl-settings.md` の `S-99a`） |
| DM-119 | `lastWrittenAt` | 日時 | 任意 | GRS | **最後に書いた時刻**（`FR-063`）。`lastSaved` は保存の時刻なので別に持つ |
| DM-120 | `importSeq` | 整数 | 任意 | GRS | 取り込みのたびに 1 増える通し番号。**`TaskOrigin.lastSeenImportSeq` はこれと比べる** |
| DM-50 | `startDate` | 日付 | 任意 | Own | 全体の開始 |
| DM-51 | `status_date` | 日付 | 任意 | Own | **基準日。** `null` のときは基準日線を描かない（`FR-046`） |
| DM-52 | `minutesPerDay` | 整数 | 任意 | Own | 1 日の分数。**期間を解釈するのに要る** |
| DM-53 | `minutesPerWeek` | 整数 | 任意 | Own | 1 週の分数 |
| DM-54 | `daysPerMonth` | 整数 | 任意 | Own | 1 月の日数 |
| DM-55 | `weekStartDay` | 整数 | 任意 | Own | 週の始まりの曜日 |
| DM-56 | `calendarId` | 整数 | 任意・FK | Consume | 文書の既定の暦 |
| DM-57 | `carry` | 対応表 | 任意 | GRS | 意味を使わない MSPDI の列を、解釈せずそのまま保持する場所 |
| DM-58 | `carryElements` | 配列 | 任意 | GRS | 行を作らない MSPDI の要素を、丸ごと保持する場所 |

⚠️ **全体の終了は列として持たない。** すべての `Task` の最も遅い終わりから算出できるためである。**算出して書き出すものの全数は `tbl-mspdi.md` が持つ。**

**表 T-308 — `TaskOrigin` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-59 | `taskUid` | 整数 | PK・FK | GRS | どの `Task` の出自か |
| DM-60 | `sourceProjectUid` | 文字列 | 任意 | GRS | 取り込んだ元の文書の識別子。**合流のときに「同じ外部マスタか」を判定する** |
| DM-61 | `sourceUid` | 整数 | 任意 | GRS | 取り込んだ元での識別子。**再び取り込んだときに突き合わせるためだけに使う。書き出しで元の識別子を復元するものではない** |
| DM-62 | `lastSeenImportSeq` | 整数 | 任意 | GRS | 最後にその `Task` が届いた取り込みの通し番号。**外部マスタから消えた候補を導くのに使う** |
| DM-63 | `importSessionId` | 文字列 | 任意 | GRS | 元の文書が識別子を持たなかったときの、代わりの出自 |

⚠️ **`TaskOrigin` に行が無いことが「本製品の中で生まれた `Task`」を表す（MUST）。** 識別子の値から出自を判定してはならない（MUST NOT）—— 値に意味を持たせると、値を振り直した瞬間に出自が壊れる。

**表 T-309 — `Calendar` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-64 | `id` | 整数 | PK | Own | 暦の識別子 |
| DM-65 | `name` | 文字列 | 任意 | Own | 暦の名前 |
| DM-66 | `isBase` | 真偽 | 任意 | Own | 他の暦の土台になる暦か |
| DM-67 | `baseCalendarId` | 整数 | 任意・FK | Consume | 土台にしている暦。`null` は土台を持たない |
| DM-68 | `carry` | 対応表 | 任意 | GRS | 意味を使わない MSPDI の列を保持する場所 |
| DM-69 | `carryElements` | 配列 | 任意 | GRS | 行を作らない MSPDI の要素を保持する場所 |

**表 T-310 — `WeekDay` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-70 | `ordinal` | 整数 | PK | GRS | 親の暦の中での出現の順番。**この行は自分の識別子を持たないので、親と出現順で識別する** |
| DM-71 | `dayOfWeek` | 整数 | 任意 | Own | どの曜日か。**書き出しでは `null` でも既定を焼いて必ず出す** |
| DM-72 | `isWorkingDay` | 真偽 | 任意 | Own | その曜日が稼働か |
| DM-73 | `carry` | 対応表 | 任意 | GRS | 意味を使わない MSPDI の列を保持する場所 |
| DM-121 | `carryElements` | 配列 | 任意 | GRS | 行を作らない MSPDI の要素を保持する場所 |

⚠️ **本製品は非稼働日を `Exception` に一本化する。** MSPDI は非稼働日を 2 とおりに表せるが、**古い形式（`WeekDay` の側で日付の範囲を表すもの）は解釈しない。** 解釈しないだけで失いはしない —— 要素を丸ごと `carryElements` に残し、書き出しのときに元の形で戻す。**この判定の詳細は `tbl-mspdi.md` が持つ。**

**表 T-311 — `Exception` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-74 | `ordinal` | 整数 | PK | GRS | 親の暦の中での出現の順番。`WeekDay` と同じ理由で持つ |
| DM-75 | `name` | 文字列 | 任意 | Own | その日の名前 |
| DM-76 | `fromDate` | 日付 | 任意 | Own | 範囲の始まり |
| DM-77 | `toDate` | 日付 | 任意 | Own | 範囲の終わり |
| DM-78 | `isWorkingDay` | 真偽 | 任意 | Own | その範囲が稼働か |
| DM-79 | `recurrenceKind` | 整数 | 任意 | Consume | 繰り返しの種別。**`null` は繰り返しが無いことを表す。必ず読むこと（MUST）** |
| DM-80 | `carry` | 対応表 | 任意 | GRS | 意味を使わない MSPDI の列を保持する場所 |
| DM-122 | `carryElements` | 配列 | 任意 | GRS | 行を作らない MSPDI の要素を保持する場所 |

⚠️ **`recurrenceKind` を読まずに `fromDate` と `toDate` を実日付の範囲として扱ってはならない（MUST NOT）。** 繰り返しがあるとき、この 2 つは 1 回ぶんの日付ではなく**繰り返しを適用する範囲**を表す。読み違えると、たとえば毎年 1 日の祝日が**何年ぶんもまるごと非稼働**になる。**繰り返しの詳細を表す列は持たない**ので、繰り返しがある行は解釈せず `carryElements` に残し、読む人に知らせる。**判定の全数は `tbl-mspdi.md` が持つ。**

**`Resource` と `Assignment` は軽量に持つ。** 意味を使う列だけを構造として持ち、**工数・費用・出来高・割当率・平準化はすべて `carry` に預ける。** 表示も編集もしないものを構造に持つと、往復のたびに壊す機会が増えるためである。

**表 T-312 — `Resource` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-81 | `uid` | 整数 | PK | Own | 資源の識別子 |
| DM-82 | `name` | 文字列 | 任意 | Own | 名前。**担当ラベルに出すのはこれである** |
| DM-83 | `kind` | 整数 | 任意 | Own | 資源の種別。**担当ラベルに出すのは作業する資源だけである。値が無いときは作業する資源とみなす** |
| DM-84 | `isCostResource` | 真偽 | 任意 | Own | 費用の項目か。**`kind` だけでは判別できないので別に持つ** |
| DM-85 | `calendarId` | 整数 | 任意・FK | Consume | この資源が使う暦 |
| DM-86 | `carry` | 対応表 | 任意 | GRS | 意味を使わない MSPDI の列を保持する場所 |
| DM-87 | `carryElements` | 配列 | 任意 | GRS | 行を作らない MSPDI の要素を保持する場所 |

**表 T-313 — `Assignment` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-88 | `uid` | 整数 | PK | Own | 割当の識別子 |
| DM-89 | `taskUid` | 整数 | 任意・FK | Consume | どの `Task` への割当か |
| DM-90 | `resourceUid` | 整数 | 任意・FK | Consume | 誰の割当か。**`null` は割り当てられていないことを表す** |
| DM-91 | `carry` | 対応表 | 任意 | GRS | 意味を使わない MSPDI の列を保持する場所 |
| DM-92 | `carryElements` | 配列 | 任意 | GRS | 行を作らない MSPDI の要素を保持する場所 |

⚠️ **割当率を構造として持たないので、表示も編集もしない。** 値は `carry` に残るので往復では失われない。

**表 T-314 — `TaskVisual` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-93 | `taskUid` | 整数 | PK・FK | GRS | どの `Task` の見た目か |
| DM-94 | `nameAnchor` | 整数 | 任意 | GRS | 名称ラベルを置く位置。`null` は自動 |
| DM-95 | `nameAlign` | 文字列 | 任意 | GRS | 名称ラベルの揃え。`null` は自動 |
| DM-96 | `shapeKind` | 文字列 | 任意 | GRS | タスク形状。**値の正は `01-04-requirements.md` の表 T-012 である。`null` は既定の形状を指し、マイルストーンではない** —— 行が無い `Task` も同じに扱う。⚠️ **マイルストーンかどうかを表すのはこの列だけである**（表 T-005 の `G-1`） |
| DM-97 | `milestoneGlyph` | 文字列 | 任意 | GRS | マイルストーン形状。**`shapeKind` が `'milestone'` のときだけ見る** |
| DM-98 | `fillColor` | 文字列 | 任意 | GRS | 塗り色。`null` はテーマから解く。⚠️ **`null` と「人が選んだ透明」は別の状態である。塗りと輪郭を同時に透明にできない規則は `FR-030` が持つ** |
| DM-99 | `strokeColor` | 文字列 | 任意 | GRS | 線の色。`null` はテーマから解く。同上 |
| DM-100 | `lineWeight` | 文字列 | 任意 | GRS | 線の太さ。**色以外で見分けるための符号なので、テーマから導出しない**（`NFR-006`） |

⚠️ **実績の置き方は列として持たない。** `shapeKind` から導出する（`tbl-glossary.md` の `P-17`）。

**表 T-315 — `Comment` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-101 | `id` | 文字列 | PK | GRS | 注記の識別子。**`Task` の識別子とは番号空間が別なので、識別子を振り直しても壊れない** |
| DM-102 | `leaderShapeKind` | 文字列 | 必須 | GRS | 引き出し線の形 |
| DM-103 | `text` | 文字列 | 任意 | GRS | 本文 |
| DM-104 | `anchorDate` | 日付 | 必須 | GRS | 指す位置の日付。**日付で持つので拡大縮小と送りに追従する** |
| DM-105 | `anchorGroupId` | 文字列 | 必須・FK | GRS | 指す位置の行 |
| DM-106 | `anchorTaskUid` | 整数 | 任意・FK | GRS | 指す `Task`。値があるときはその形の縁から引き出す |
| DM-107 | `anchorPoint` | 整数 | 任意 | GRS | `Task` のどの位置から引き出すか |
| DM-108 | `bodyOffsetPx` | 座標 | 必須 | GRS | 引き出した先の箱を置く、指す位置からのずれ。⚠️ **画面上の長さで持つ** —— 箱は文字を含む独立した飾りで、文字の大きさが拡大縮小で変わらないため、画面上の距離を一定に保つのが正しい |

**表 T-316 — `HighlightBox` の列**

| 行 ID | 列 | 型 | 必須 | 由来 | 意味 |
| --- | --- | --- | --- | --- | --- |
| DM-109 | `id` | 文字列 | PK | GRS | 注記の識別子 |
| DM-110 | `startDate` | 日付 | 必須 | GRS | 囲む範囲の始まり |
| DM-111 | `endDate` | 日付 | 必須 | GRS | 囲む範囲の終わり |
| DM-112 | `topGroupId` | 文字列 | 必須・FK | GRS | 囲む範囲の上端の行 |
| DM-113 | `bottomGroupId` | 文字列 | 必須・FK | GRS | 囲む範囲の下端の行 |
| DM-114 | `strokeColor` | 文字列 | 任意 | GRS | 枠線の色。`null` は注記に定めた色。⚠️ **透明を選べない** —— 枠線がこの注記の唯一の描くものだからである |
| DM-115 | `cornerRadiusPx` | 整数 | 必須 | GRS | 角の丸み。⚠️ **画面上の長さで持つ** —— 拡大縮小しても同じ大きさに見えることが求めである |

⚠️ **注記が指す行は、行の並び順ではなく `TaskGroup` の識別子で持つ（MUST）。並び順で持ってはならない（MUST NOT）** —— 行を並べ替えた瞬間に別の行を指し、畳んでも隠しても同じ事故が起きる。**前プロジェクトはこれを並び順で持っていた。**

## 5. 識別子

**Type**: SECTION

**MSPDI の識別子をそのまま主キーに使う。本製品だけが持つ代理の識別子を足してはならない（MUST NOT）。** 合流のときに識別子の衝突を必ず解消するので、文書の中では常に一意である —— したがって代理の識別子も複合の識別子も要らない。

**表 T-317 — 主キー**

| 行 ID | エンティティ | 主キー | 発番 |
| --- | --- | --- | --- |
| ID-1 | `Task` | `uid` | MSPDI から受け継ぐ。新しく作るときは `Project.uidHighWaterMark` に 1 を足す |
| ID-2 | `Project` | `id` | MSPDI から受け継ぐ。元のファイルが持たないことがある |
| ID-3 | `Calendar` | `id` | MSPDI から受け継ぐ |
| ID-4 | `Resource` | `uid` | MSPDI から受け継ぐ |
| ID-5 | `Assignment` | `uid` | MSPDI から受け継ぐ |
| ID-6 | `Dependency` | `successorUid` ＋ `predecessorUid` ＋ `link_type` の 3 つ | **持たない。** MSPDI が依存に識別子を振らないので、値そのものが識別子になる |
| ID-7 | `WeekDay` / `Exception` | 親の暦 ＋ `ordinal` | **持たない。** 親の中での出現順で識別する |
| ID-8 | `TaskGroup` | `id` | **本製品が発番する。** MSPDI に対応が無いため |
| ID-9 | `TaskGroupMember` | `groupId` ＋ `taskUid` | **持たない。** 載せる先と載せるものの組が識別子になる |
| ID-10 | `TaskVisual` / `TaskOrigin` | `taskUid` | **持たない。** `Task` と 1 対 1 なので、その識別子を借りる |
| ID-11 | `Comment` / `HighlightBox` | `id` | **本製品が発番する。** `TaskGroup` と同じ番号空間の作り方にする |

⚠️ **識別子の値から意味を読み取ってはならない（MUST NOT）。** 大小にも連続性にも意味を持たせない。**特定の範囲を本製品専用に予約してはならない（MUST NOT）** —— 同じ規則で作られた別の文書とは結局ぶつかるうえ、値に意味を持たせるぶん壊れやすい。**識別子が乱数で振られていても構造が成立すること**を、この方針の判定条件とする。

⚠️ **`Project.uidHighWaterMark` は正しさの前提ではない。** 無駄な振り直しを減らすための配慮であり、**これが無くても壊れない** —— 出自による照合（表 T-319）が取り違えを本質的に防いでいる。**取り消しでも巻き戻さない。**

⚠️ **本製品が保証するのは、受け取った文書の中での一意性だけである。** 書き出した識別子が、その後で外部の側に採番された別のものとぶつかることは範囲外とする。

## 6. 削除の連鎖

**Type**: SECTION

**あるものを消したとき、それを指す行を残してはならない（MUST NOT）** —— 存在しないものを指したまま書き出すと、相手のツールが開けない文書になる。

**表 T-318 — 削除の連鎖**

| 行 ID | 消したもの | 一緒に消えるもの | 知らせ |
| --- | --- | --- | --- |
| CS-1 | `Task` | `TaskVisual` ／ `TaskOrigin` ／ `TaskGroupMember` ／ **その `Task` を端に持つ `Dependency`** ／ `taskUid` が一致する `Assignment` ／ **その `Task` を指す `Comment`** | 消えた件数を知らせる |
| CS-2 | `TaskGroup` | 配下の `TaskGroup` ／ 配下の `TaskGroupMember` ／ **その行を指す `Comment`** ／ **その行を上端または下端にしている `HighlightBox`** | 同上 |
| CS-3 | `Resource` | `resourceUid` が一致する `Assignment` | 同上 |
| CS-4 | `Calendar` | **何も消さない。** それを指していた `calendarId` を `null` に戻す | 同上 |

⚠️ **`TaskGroup` を消しても、そこに載っていた `Task` は消えない。** 器から出るだけである。

⚠️ **連鎖して消えたものが `carry` を持っていた場合、その中身も一緒に消える。** これは人が消した結果なので「編集していない往復では失わない」という前提を破らないが、**消えたことを知らせること（MUST）。**

⚠️ **由来の文書が連鎖の表に挙げていなかったものを挙げる。** `CS-1` の `TaskOrigin` と `Comment`／`CS-2` の**配下の `TaskGroup`** と注記 2 つ／`CS-4` の全体／および `CS-2` で件数を知らせること、の 6 つである。`TaskOrigin` は `Task` と 1 対 1 なので残せば必ず宙に浮き、**配下の `TaskGroup`** は残すと `parentId` が宙に浮く。注記の連鎖は由来の文書の別の節が定めていた。**`CS-4` は由来に記述が無く、本仕様書で定めた。**

## 7. 合流

**Type**: SECTION

**本節が持つのは「何と何を同じものとみなすか」だけである。** 食い違ったときに人へ何を尋ねるかは `01-04-requirements.md` の表 T-032a が持つ。**判別できないときに自動で確定してはならない（MUST NOT）。**

**表 T-319 — 照合の規則**

| 行 ID | 既存のもの | 照合するか | 理由 |
| --- | --- | --- | --- |
| MT-1 | **本製品の中で生まれた `Task`**（`TaskOrigin` に行が無い） | **しない。** 識別子が一致しても常に食い違いとして扱う | 本製品で手作りしたものが、外から来たものと同じであるはずがない |
| MT-2 | 外部マスタから来た `Task`（`TaskOrigin` に行がある） | **`sourceProjectUid` と `sourceUid` の組**が一致すれば同じものとみなす | 識別子を振り直した後でも突き合わせられる。これが無いと、同じ外部マスタを取り込むたびにまるごと複製される |

⚠️ **識別子が一致することだけを根拠に同じものとみなしてはならない（MUST NOT）。** 無関係な 2 つの文書で番号がたまたま一致するのは普通のことである。

**食い違ったときに動かすのは、外の識別を持たない側の識別子とする。** 本製品の中で生まれたものは動かしても失うものが無く、外部マスタから来たものは識別子を保つことで往復が守られる。

⚠️ **識別子を振り直したものは、元の外部マスタへの往復を諦める。** `TaskOrigin.sourceUid` は再び取り込むときの突き合わせに使うだけで、**書き出しで元の識別子を復元するものではない。この旨を人に示してから選ばせること（MUST）。**
