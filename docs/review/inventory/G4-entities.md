# G4 — 16 エンティティの列を schedule / documentSettings に振り分ける

**担当**: `Z01-extracted-columns.md` が挙げる 16 エンティティのネイティブ列すべて。
**判定の単位は列である**（エンティティ単位ではない）。1 つのエンティティの中で群が割れる列があれば、それが指摘である。

## 判定に使った規則（利用者判断・2026-08-14 を写した）

> 版数（revision）を上げるのは、**日程のデータが変わったとき**だけ。**見せ方が変わっただけでは上げない**。

| 群 | 何が入るか | 版数 |
| --- | --- | --- |
| `schedule` | **個別の対象に付いた意味**。日程・タスク・依存・暦・資源・割当・行の器（TaskGroup）・**個別のタスクの色と形状**・注記・出自 | **上げる** |
| `documentSettings` | **全体の見せ方**。ズーム・スクロール・パネル幅・イナズマ線や担当の表示切替・寸法の既定・LOD のしきい値 | **上げない** |

例外 1 件: **`themeHue` は schedule 側**（プロジェクトの属性であって見る人の好みではない）。

## この規則を列に当てるときに使った 2 つの軸

規則の文面は 2 つの軸を 1 本に畳んでいる。**判定不能はほぼ全部この畳みが原因**なので、先に軸を開いておく。

| | **意味（何であるか）** | **見せ方（どう見えるか）** |
| --- | --- | --- |
| **個別の対象に付く** | 象限 1 — 明らかに `schedule`（`Task.start` など） | **象限 2 — 規則が割れる場所**（`TaskGroup.collapsed` / `height`、`TaskGroupMember.stackOrder`） |
| **文書全体に付く** | 象限 3 — 規則が名指ししていない（`Project.status_date`・`themeHue`） | 象限 4 — 明らかに `documentSettings`（`zoomX` など） |

- 規則が明示するのは象限 1（schedule）と象限 4（documentSettings）だけである。
- 規則は象限 2 のうち **「個別のタスクの色と形状」だけ**を名指しで schedule に引き入れた。**色と形状以外の個別の見せ方（畳み・行高・段）については何も言っていない。**
- 規則は象限 3 のうち **`themeHue` だけ**を名指しで schedule に引き入れた。**`status_date` については何も言っていない**（ただし原典が「設定値ではなく文書のデータである」と断定しているので判定できる）。

**⚠️ 出典の行番号について**: 本書の出典欄は、原則として **`previous-project-result/temp/inventory/E01〜E11` の該当行**（＝本作業で実読した位置）を `file:line` で書く。E ファイルがさらに引く原典（`grs-native-erd-ja.md` ほか）の行番号は、E ファイルの引用をそのまま添える。**自分で開いていない行を断定しない。**

---

## 1. `Task`（E01 ＋ E02）

**自分で数えた**: 本節で判定した `Task` のネイティブ列は **20**。
⚠️ `Z01-extracted-columns.md:14` は `Task` を **21** とするが、**`milestone` が E01 §1 と E02 §1 の両方に 1 行ずつ立っているための二重計上**である（`E01-task-plan.md:31` と `E02-task-actual.md:31` が同じ `Task.milestone` を書く）。**重複を除いた実数は 20。**

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `Task.uid` | G4-001 | schedule | 個別のタスクの同一性そのもの。MSPDI へ export される往復キー。値が変わる＝別のタスクになる | **上げる** | `E01-task-plan.md:25` |
| `Task.wbs_parent_uid` | G4-002 | schedule | 階層の唯一の真実。export で `OutlineLevel` に焼かれる＝日程データの構造 | **上げる** | `E01-task-plan.md:26` |
| `Task.wbs_order` | G4-003 | schedule | 兄弟内の並び順。**「ユーザーの意思なので算出不能＝保持する」**と原典が明記し、export のタスク出力順を決める（＝出力ファイルの中身が変わる） | **上げる** | `E01-task-plan.md:27` |
| `Task.name` | G4-004 | schedule | 個別のタスクに付いた意味。`Task/Name` として export | **上げる** | `E01-task-plan.md:28` |
| `Task.start` | G4-005 | schedule | 日程そのもの（予定バーの左端） | **上げる** | `E01-task-plan.md:29` |
| `Task.finish` | G4-006 | schedule | 日程そのもの（予定バーの右端）。`percentComplete` の分母 | **上げる** | `E01-task-plan.md:30` |
| `Task.milestone` | G4-007 | schedule | **形状の権威**でありながら export される側（`Task/Milestone`）。規則の「個別のタスクの形状」にも「日程のデータ」にも該当し、どちらから見ても schedule | **上げる** | `E01-task-plan.md:31`／`E02-task-actual.md:31` |
| `Task.deadline` | G4-008 | schedule | 期限マーカー。`finish` とは別の独立した日付データ | **上げる** | `E01-task-plan.md:32` |
| `Task.notes` | G4-009 | schedule | 個別のタスクに付いた意味（説明・備考） | **上げる** | `E01-task-plan.md:33` |
| `Task.calendar_id` | G4-010 | schedule | 暦への参照。規則が「暦」を schedule に挙げている | **上げる** | `E01-task-plan.md:34` |
| `Task.fadeInDays` | G4-011 | schedule | 見た目（バーの端のぼかし）だが、**個別のタスクに付き、かつ MSPDI 拡張領域 `Number1` へ export される**。出ていく以上「日程のデータ」の側であり、規則の「個別のタスクの色と形状」にも収まる | **上げる** | `E01-task-plan.md:35` |
| `Task.fadeOutDays` | G4-012 | schedule | 同上（`Number2`） | **上げる** | `E01-task-plan.md:36` |
| `Task.carry` | G4-013 | schedule（⚠️ 中身に見せ方が混じる） | 解釈しない MSPDI スカラーの器。往復無損失（Drop=0）の担い手なので schedule。**ただし中身に `HideBar` / `Rollup`（MS Project のビュー書式＝見せ方）が入る** → 破れ B-1 | **上げる**（GRS の編集で変わるのは取込時のみ） | `E01-task-plan.md:37`／中身は `E01-task-plan.md:75-76` |
| `Task.carry_elements` | G4-014 | schedule | 要素まるごと Carry の器。`ordinal` 順に原位置へ戻す＝出力ファイルの中身 | **上げる**（同上） | `E01-task-plan.md:38` |
| `Task.actualStart` | G4-015 | schedule | 実績の日付。人が置く | **上げる** | `E02-task-actual.md:25` |
| `Task.actualDuration` | G4-016 | schedule | 実績バーの長さそのもの | **上げる** | `E02-task-actual.md:26` |
| `Task.actualFinish` | G4-017 | schedule | 完了日。5 状態の判別に効く | **上げる** | `E02-task-actual.md:27` |
| `Task.resume` | G4-018 | schedule | 再開予定日。`Task/Resume` として export | **上げる** | `E02-task-actual.md:28` |
| `Task.resumeValid` | G4-019 | schedule | 中断の種別（再開日未定＝中止）。`Task/ResumeValid` として export | **上げる** | `E02-task-actual.md:29` |
| `Task.percentComplete` | G4-020 | schedule | 日付から算出して**格納する**値。`Task/PercentComplete` として export | **上げる** | `E02-task-actual.md:30` |

**`Task` は 20 列すべてが `schedule`。群が割れる列は無い。**
ただし `carry` の**中身**に見せ方が混じる（B-1）。

### `Task` の非保存列（判定の対象外だが、群を考えるうえで効く）

`ID` / `OutlineLevel` / `OutlineNumber` / `Summary` / `Duration`（`E01-task-plan.md:48-52`）、
`stop` / 実績バーの右端 / 状態（5 値）/ 遅れ / Progress Marker の記号（`E02-task-actual.md:43-47`）は
**保存しないので、そもそもどちらの群にも属さない**。版数の対象にもならない。
⚠️ このうち **Progress Marker の「表示トグル」は `documentSettings.progressMarkerVisible`** であり、
規則の「イナズマ線や担当の表示切替」と同類＝ documentSettings 側で正しい（`E02-task-actual.md:47`）。
**記号そのものは導出値、トグルは documentSettings** という分かれ方をしている。

---

## 2. `Dependency`（E03・7 列）

**自分で数えた**: 7 行（`Z01-extracted-columns.md:20` の 7 と一致）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `Dependency.successor_uid` | G4-021 | schedule | 依存の端点。規則が「依存」を schedule に挙げている。複合 PK の 1/3 | **上げる** | `E03-dependency-taskgroup.md:42` |
| `Dependency.predecessor_uid` | G4-022 | schedule | 同上（2/3） | **上げる** | `E03-dependency-taskgroup.md:43` |
| `Dependency.link_type` | G4-023 | schedule | 依存の種別（FF/FS/SF/SS）。複合 PK の 3/3・export される | **上げる** | `E03-dependency-taskgroup.md:44` |
| `Dependency.lag` | G4-024 | schedule | ラグの値。`PredecessorLink/LinkLag` として export | **上げる** | `E03-dependency-taskgroup.md:45` |
| `Dependency.lag_format` | G4-025 | schedule（⚠️ 見せ方の値だが schedule に属する） | **ラグの「表示単位」＝見せ方**であり、原典自身「GRS は表示に使わない」と書く。それでも **個別の依存に付き、`PredecessorLink/LagFormat` として export される**ので schedule 側。→ 破れ B-2 | **上げる** | `E03-dependency-taskgroup.md:46` |
| `Dependency.ordinal` | G4-026 | schedule | 原順序の復元に使う（出力ファイルの要素順が変わる）。⚠️ **列の存在自体が原典内で矛盾**（`C-2`） | **上げる**（列が在るなら） | `E03-dependency-taskgroup.md:47`／`E03-dependency-taskgroup.md:148` |
| `Dependency.carry` / `carryElements` | G4-027 | schedule | `CrossProject` / `CrossProjectName` の受け皿。⚠️ **器そのものが未新設**（`C-3`） | **上げる**（器が在るなら） | `E03-dependency-taskgroup.md:48`／`E03-dependency-taskgroup.md:149` |

**`Dependency` は 7 列すべてが `schedule`。群が割れる列は無い。**
`lag_format` だけが「見せ方の値なのに schedule」という形で境界を跨ぐ（B-2）。

---

## 3. `TaskGroup`（E03・8 列）— **ここで群が割れる**

**自分で数えた**: 8 行（`Z01-extracted-columns.md:16` の 8 と一致）。
**8 列のうち 5 列が schedule、3 列が判定不能。**

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `TaskGroup.id` | G4-028 | schedule | 器の同一性。規則が「行の器（TaskGroup）」を schedule に挙げている。注記（`Comment.anchorGroupId` ほか）の参照先でもある | **上げる** | `E03-dependency-taskgroup.md:67`／参照は `E03-dependency-taskgroup.md:84` |
| `TaskGroup.parent_id` | G4-029 | schedule | 器の入れ子＝構造。WBS の階層移動に追随する | **上げる** | `E03-dependency-taskgroup.md:68` |
| `TaskGroup.label` | G4-030 | schedule | 器に付いた名前＝個別の対象に付いた意味。`null` なら `derived_from_task_uid` のタスク名から導出 | **上げる** | `E03-dependency-taskgroup.md:69` |
| `TaskGroup.derived_from_task_uid` | G4-031 | schedule | どのタスクから生成された器かという**出自**。規則が「出自」を schedule に挙げている | **上げる** | `E03-dependency-taskgroup.md:70` |
| `TaskGroup.order` | G4-032 | schedule | 兄弟内の並び順。**「並び順はユーザーの意思であり算出不能」**（`Task.wbs_order` と同じ論法）。しかも**兄弟の並べ替えは WBS 側へも伝わる**（`HM-8` / `HM-9`）ので、日程データを確実に動かす | **上げる** | `E03-dependency-taskgroup.md:71` |
| `TaskGroup.collapsed` | G4-033 | **判定不能** | **象限 2**（個別 × 見せ方）。規則が名指しで schedule に引き入れたのは「個別のタスクの色と形状」だけで、**畳みは色でも形状でもない**。原典は「**見た目の一部なので保存し、共有で再現する**」と書き、見た目であることを認めたうえで保存を要求する。→ 破れ B-3 | **決められない** | `E03-dependency-taskgroup.md:72` |
| `TaskGroup.color` | G4-034 | schedule | **象限 2 だが、規則が名指しで拾った「色」に当たる。** ただし対象は「個別のタスクの色」であって行の器の色であり、規則の文言と 1 対 1 では無い。⚠️ **`themeHue` を変えると解き直される従属値**（解いた結果は保存しない）なので、`themeHue`（schedule）と同じ群に居ることには整合性がある | **上げる** | `E03-dependency-taskgroup.md:73` |
| `TaskGroup.height` | G4-035 | **判定不能** | **象限 2**。行高は色でも形状でもない。しかも**ズーム = 1 基準の論理高さ**で保存する＝ `documentSettings.zoomY`（見せ方）と一体で意味が決まる値である。→ 破れ B-4 | **決められない** | `E03-dependency-taskgroup.md:74`／`C-5` は `E03-dependency-taskgroup.md:151` |

---

## 4. `TaskGroupMember`（E03・3 列）

**自分で数えた**: 3 行（`Z01-extracted-columns.md:27` の 3 と一致）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `TaskGroupMember.group_id` | G4-036 | schedule | どのタスクがどの行に載るか＝器の構造。マージの「上書き」でも**保持**すると原典が定める（製品最大の差別化なので消してはならない） | **上げる** | `E03-dependency-taskgroup.md:94` |
| `TaskGroupMember.task_uid` | G4-037 | schedule | 同上。`UNIQUE`（1 タスクは高々 1 行） | **上げる** | `E03-dependency-taskgroup.md:95` |
| `TaskGroupMember.stack_order` | G4-038 | **判定不能** | **象限 2**（個別 × 見せ方）。縦積み段は色でも形状でもない。⚠️ さらに**列の要否そのものが原典と仕様書で逆**（原典＝疎な上書きで持つ／仕様書 `ST-6`＝人が段を指定する手段を設けない MUST NOT）。**列が無いなら群の議論も無い。** → 破れ B-5 | **決められない** | `E03-dependency-taskgroup.md:96`／`C-7` は `E03-dependency-taskgroup.md:153` |

---

## 5. `Project`（E04・25 列）— **ここでも群が割れる**

**自分で数えた**: 25 行（`Z01-extracted-columns.md:13` の 25 と一致。§1 の表の行を数えた）。
内訳は Own 17 / Consume 1 / Reconstruct 3 / Carry 2 器（`E04-project.md:19` の仕分けと `E04-project.md:29-53` の行数）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `Project.id`（= `Project/UID`） | G4-039 | schedule | マージの**出自判定**に使う（同一マスタの再取込か別マスタか）。規則が「出自」を schedule に挙げている。⚠️ 主キーではない | **上げる** | `E04-project.md:29`／`E04-project.md:77` |
| `Project.name` | G4-040 | schedule | 文書メタ＝文書という個別の対象に付いた意味。`Project/Name` として export | **上げる** | `E04-project.md:30` |
| `Project.title` | G4-041 | schedule | 文書名（`Schedule Title`）。`Project/Title` として export | **上げる** | `E04-project.md:31` |
| `Project.subject` | G4-042 | schedule | 文書メタ。export される | **上げる** | `E04-project.md:32` |
| `Project.category` | G4-043 | schedule | 同上 | **上げる** | `E04-project.md:33` |
| `Project.company` | G4-044 | schedule | 同上。`FR-074` が画面で編集させる | **上げる** | `E04-project.md:34` |
| `Project.manager` | G4-045 | schedule | 同上 | **上げる** | `E04-project.md:35` |
| `Project.author` | G4-046 | schedule | 作成者。export される | **上げる** | `E04-project.md:36` |
| `Project.created` | G4-047 | schedule | 来歴（`Project/CreationDate`）。export される | **上げる** | `E04-project.md:37` |
| `Project.revision` | G4-048 | **判定不能** | **版数そのものを分類しようとしている自己言及**。加えて `Project/Revision` の意味は MSPDI では "the number of times a project has been **saved**"（保存回数）であり、`FR-063` の「保存される値を変える更新すべてで +1」と**意味が一致しない**。**この列に版数を相乗りさせるかが未決定**なので、群も決まらない。→ 破れ B-6 | **決められない**（自分自身が版数） | `E04-project.md:38`／`U-4` は `E04-project.md:159` |
| `Project.last_saved` | G4-049 | schedule | 来歴（`Project/LastSaved`）。export される。⚠️ `FR-063` の「時刻」に充てるかは未決 | **上げる** | `E04-project.md:39`／`V-2` は `E04-project.md:170` |
| `Project.start_date` | G4-050 | schedule | 全体開始日＝日程のデータ | **上げる** | `E04-project.md:40` |
| `Project.status_date` | G4-051 | schedule | **象限 3 だが判定できる。** 基準日線の位置と描画有無を決める。原典が「**設定値ではなく文書のデータである**」「表示状態を別に持ってはならない（MUST NOT）」と断定しており、`documentSettings` へ置くことを明示的に禁じている。遅れ判定とイナズマ線の頂点計算の基準でもある | **上げる** | `E04-project.md:41` |
| `Project.minutes_per_day` | G4-052 | schedule | 期間の型変換に必須。**この変換を省くと Drop=0 が静かに壊れる** | **上げる** | `E04-project.md:42` |
| `Project.minutes_per_week` | G4-053 | schedule | 期間換算 | **上げる** | `E04-project.md:43` |
| `Project.days_per_month` | G4-054 | schedule | 期間換算 | **上げる** | `E04-project.md:44` |
| `Project.week_start_day` | G4-055 | schedule | 週開始曜日。`Project/WeekStartDay` として export される暦の属性 | **上げる** | `E04-project.md:45` |
| `Project.calendar_id` | G4-056 | schedule | 既定暦への参照。規則が「暦」を schedule に挙げている | **上げる** | `E04-project.md:46` |
| `Project.schema_version` | G4-057 | **判定不能** | **どちらの群にも属さない第 3 のもの**（＝ JSON という入れ物の形式の版）。日程のデータでもなければ全体の見せ方でもない。人の編集で変わらず、**移行のときだけ変わる**。⚠️ 置き場所も原典間で食い違う（ERD＝`Project` の列／JSON 実例＝ JSON 最上位）。→ 破れ B-7 | **決められない** | `E04-project.md:47`／`U-5` は `E04-project.md:160` |
| `Project.uid_high_water_mark` | G4-058 | schedule（⚠️ 意味を持たない台帳値） | 削除済みを含む最大 UID。**それ自体は「個別の対象に付いた意味」ではなく実装上の配慮**だが、値が動くのは必ずタスクを作ったとき＝日程データが変わったときなので、実害としては schedule と同じ挙動になる。⚠️ **Undo で巻き戻さない**と原典が定めており、**版数を巻き戻す設計とは噛み合わない**（→ 破れ B-8） | **上げる**（ただし単独では動かない） | `E04-project.md:48` |
| `Project.carry` | G4-059 | schedule（⚠️ 中身に見せ方が混じる） | 解釈しない `Project` 直下 42 要素の器。往復無損失の担い手。**ただし中身に「既定タスク・レート・書式 9」など MS Project の書式群が入る** → 破れ B-1 と同型 | **上げる**（GRS の編集で変わるのは取込時のみ） | `E04-project.md:49` |
| `Project.carry_elements` | G4-060 | schedule | 要素まるごと Carry の器 | **上げる**（同上） | `E04-project.md:50` |
| `Project.finish_date` | G4-061 | — （**保存しない**） | Reconstruct。export 時に全 Task 最遅のロールアップで焼き込む。**正規 JSON に持たないので、どちらの群にも属さない** | **上げない**（保存対象でない） | `E04-project.md:51` |
| `Project.SaveVersion` | G4-062 | — （**保存しない**） | Reconstruct。固定値 `12` を export で焼く（XSD 必須要素） | **上げない**（保存対象でない） | `E04-project.md:52` |
| `Project.CurrencyCode` | G4-063 | — （**保存しない**） | Reconstruct。既定 `"JPY"` を export で焼く（XSD 必須要素） | **上げない**（保存対象でない） | `E04-project.md:53` |

**⚠️ `themeHue` は `Project` の列に無い。** 利用者判断が唯一の例外として名指しした値なのに、
`E04-project.md:29-53` の 25 列のどこにも `themeHue` は現れない。→ **破れ B-9**（§7 で詳述）。

---

## 6. `Calendar`（E05・4 列）

**自分で数えた**: 4 行（`Z01-extracted-columns.md:26` の 4 と一致）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `Calendar.id` | G4-064 | schedule | 暦の同一性。規則が「暦」を schedule に挙げている。MSPDI `Calendar/UID` として export | **上げる** | `E05-calendar.md:55` |
| `Calendar.name` | G4-065 | schedule | 暦名。**取込時の内容一致判定（自動統合）の入力の 1 つ**なので、値が変わると統合結果が変わる＝データ | **上げる** | `E05-calendar.md:56` |
| `Calendar.is_base` | G4-066 | schedule | 基準暦かどうか。export される。⚠️ **この列を読む処理が原典に 1 つも無い**（`C-6`）が、export される以上 schedule | **上げる** | `E05-calendar.md:57`／`C-6` は `E05-calendar.md:241` |
| `Calendar.base_calendar_id` | G4-067 | schedule | 派生暦の親への参照。Consume（UID 参照を Carry に残さない不変条件） | **上げる** | `E05-calendar.md:58` |

## 7. `WeekDay`（E05・3 列）

**自分で数えた**: 3 行（`Z01-extracted-columns.md:28` の 3 と一致）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `WeekDay.ordinal` | G4-068 | schedule | 原順序の復元キー。export の要素順が変わる | **上げる** | `E05-calendar.md:77` |
| `WeekDay.day_type` | G4-069 | schedule | 曜日（1–7）。稼働判定の入力 | **上げる** | `E05-calendar.md:78` |
| `WeekDay.day_working` | G4-070 | schedule | **その曜日が稼働かどうか＝週末グレー表示の唯一の入力。** ⚠️ 「グレーに塗る」は見せ方に見えるが、**稼働日は日程計算（`actualStart + actualDuration` の稼働日加算）の入力**であり、意味の側 | **上げる** | `E05-calendar.md:79`／稼働日加算は `E02-task-actual.md:44` |

## 8. `Exception`（E05・6 列）

**自分で数えた**: 6 行（`Z01-extracted-columns.md:22` の 6 と一致）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `Exception.ordinal` | G4-071 | schedule | 原順序の復元キー | **上げる** | `E05-calendar.md:89` |
| `Exception.name` | G4-072 | schedule | 祝日名＝個別の対象に付いた意味 | **上げる** | `E05-calendar.md:90` |
| `Exception.from_date` | G4-073 | schedule | 例外日レンジの始まり | **上げる** | `E05-calendar.md:91` |
| `Exception.to_date` | G4-074 | schedule | 例外日レンジの終わり | **上げる** | `E05-calendar.md:92` |
| `Exception.day_working` | G4-075 | schedule | 例外日が稼働かどうか | **上げる** | `E05-calendar.md:93` |
| `Exception.recurrenceKind`（原典に列名が無い・新設） | G4-076 | schedule | 繰返し種別。**これを落とすと毎年 1 日の祝日が 11 年ぶんの非稼働に化ける**＝日程データが壊れる | **上げる** | `E05-calendar.md:94`／事故の例は `E05-calendar.md:116` |

## 9. 暦クラスタの新設列（E05 表 4・9 列）

**自分で数えた**: 9 行（`Z01-extracted-columns.md:15` の 9 と一致）。**原典にまだ存在せず、E05 が「新設が要る」と結論した列である。**

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `Calendar.ordinal` | G4-077 | schedule | `Calendars` の原順序の復元 | **上げる** | `E05-calendar.md:138` |
| `Calendar.carry` | G4-078 | schedule | Carry の器（未知要素の受け皿） | **上げる** | `E05-calendar.md:139` |
| `Calendar.carryElements` | G4-079 | schedule | `WorkWeek` / `DayType=0` の `WeekDay` / 繰返し `Exception` の退避先 | **上げる** | `E05-calendar.md:140` |
| `WeekDay.calendarUid` | G4-080 | schedule | 親への参照（関係モデルとして正規化する場合） | **上げる** | `E05-calendar.md:141` |
| `WeekDay.carry` | G4-081 | schedule | `TimePeriod` の受け皿 | **上げる** | `E05-calendar.md:142` |
| `WeekDay.carryElements` | G4-082 | schedule（⚠️ 中身は勤務時刻＝見せ方ではないが GRS 非使用） | `WorkingTime`（0..5）の退避先。**GRS は日粒度なので使わない**が、往復のために持つ | **上げる** | `E05-calendar.md:143` |
| `Exception.calendarUid` | G4-083 | schedule | 親への参照 | **上げる** | `E05-calendar.md:144` |
| `Exception.carry` | G4-084 | schedule | 繰返し詳細 8 個の受け皿。**器が無いとその 8 個が黙って消える** | **上げる** | `E05-calendar.md:145` |
| `Exception.carryElements` | G4-085 | schedule | `WorkingTime` の退避先 | **上げる** | `E05-calendar.md:146` |

**暦クラスタ 22 列（4 ＋ 3 ＋ 6 ＋ 9）すべてが `schedule`。群が割れる列は無い。**
規則が「暦」を名指しで schedule に入れているので、判定に迷う余地が無かった。

---

## 10. `TaskVisual`（E07・8 列）— **ここが最大の破れ**

**自分で数えた**: 8 行（`Z01-extracted-columns.md:18` の 8 と一致。`E07-visual-origin.md:42` も「自分で数えた: 8」と書く）。

⚠️ **`TaskVisual` は定義からして「見た目の列」である**（`E07-visual-origin.md:1`）。
**8 列すべてが「個別の対象に付いた見せ方」＝象限 2 に落ちる。**
規則が名指しで拾ったのは **色と形状だけ**なので、**8 列のうち 5 列が schedule、3 列が判定不能**になる。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `TaskVisual.task_uid` | G4-086 | schedule | PK 兼 FK。どのタスクの見た目かという同一性。マージの「上書き」でも**保持**（置換すると再取込のたびに見た目が壊れる） | **上げる** | `E07-visual-origin.md:33` |
| `TaskVisual.shapeKind` | G4-087 | schedule | **規則が名指しで拾った「形状」そのもの。** かつ `Task.milestone`（export される）と不変条件で結ばれており、意味の側とも繋がっている | **上げる** | `E07-visual-origin.md:36` |
| `TaskVisual.milestoneGlyph` | G4-088 | schedule | 「形状」に当たる（マイルストーンの図形 8 値） | **上げる** | `E07-visual-origin.md:37` |
| `TaskVisual.fillColor` | G4-089 | schedule | **規則が名指しで拾った「色」そのもの。** `themeHue`（schedule 側の例外）から解く従属値なので、`themeHue` と同じ群に居ることは整合する | **上げる** | `E07-visual-origin.md:38` |
| `TaskVisual.strokeColor` | G4-090 | schedule | 同上 | **上げる** | `E07-visual-origin.md:39` |
| `TaskVisual.nameAnchor` | G4-091 | **判定不能** | **象限 2 だが、色でも形状でもない**（バー上の 9 点アンカー＝ラベルの置き場所）。規則の例外条項に当たらないので schedule に入る根拠が無い。一方で **`documentSettings` は文書に 1 つの器であり、タスクごとの値を置く場所が構造上無い**。→ 破れ B-10 | **決められない** | `E07-visual-origin.md:34` |
| `TaskVisual.nameAlign` | G4-092 | **判定不能** | 同上（ラベルの左詰め / 中央 / 右詰め）。→ 破れ B-10 | **決められない** | `E07-visual-origin.md:35` |
| `TaskVisual.lineWeight` | G4-093 | **判定不能** | **原典が「色ではない」と明言している**（「色に頼らない識別手段」・WCAG 1.4.1・テーマから導出しない）。形状は `shapeKind` が持つので形状でもない。**規則の「色と形状」から二重に外れる**。→ 破れ B-10 | **決められない** | `E07-visual-origin.md:40` |

**`TaskVisual` の 8 列は、群の観点では 1 つのまとまりである** — 全部が同じ非 export の見た目の器（`R-13`：`E07-visual-origin.md:105`）に載っている。
それを規則が「色と形状は上げる／それ以外は上げない」で割ると、**同じ 1 行の中で版数の振る舞いが分かれる**。

---

## 11. `TaskOrigin`（E07・5 列）

**自分で数えた**: 5 行（`Z01-extracted-columns.md:25` の 5 と一致。`E07-visual-origin.md:68` も「自分で数えた: 5」と書く）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `TaskOrigin.task_uid` | G4-094 | schedule | 出自メモの PK。**行の有無そのものが意味を持つ**（行が無い＝ GRS 生まれ＝マージの照合対象にしない） | **上げる** | `E07-visual-origin.md:62` |
| `TaskOrigin.source_project_uid` | G4-095 | schedule | 規則が「出自」を schedule に挙げている | **上げる** | `E07-visual-origin.md:63` |
| `TaskOrigin.source_uid` | G4-096 | schedule | 再取込の突合キー。**無いと再取込のたびにタスクがまるごと複製する** | **上げる** | `E07-visual-origin.md:64` |
| `TaskOrigin.last_seen_import_seq` | G4-097 | schedule | 「マスタから消えた候補」を導出する観測記録。値が変わる＝取り込みが起きた＝データが変わった | **上げる** | `E07-visual-origin.md:65` |
| `TaskOrigin.import_session_id` | G4-098 | schedule | `Project/UID` 省略時の代替出自 | **上げる** | `E07-visual-origin.md:66` |

**`TaskOrigin` は 5 列すべてが `schedule`。群が割れる列は無い。**
⚠️ ただし対になる **`documentSettings.importSeq` は documentSettings 側にある**（`E07-visual-origin.md:82`）。
**「消えた候補」の判定は `last_seen_import_seq < max(...)` という 2 つの値の比較**（`E07-visual-origin.md:104`）なので、
**判定の入力が群をまたぐ**。→ 破れ B-11

---

## 12. `Resource`（E06・8 列）

**自分で数えた**: 8 行（`Z01-extracted-columns.md:17` の 8 と一致。`E06-resource-assignment.md:50-57` の表の行を数えた）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `Resource.uid` | G4-099 | schedule | 資源の同一性。規則が「資源」を schedule に挙げている。`Resource/UID` として export | **上げる** | `E06-resource-assignment.md:50` |
| `Resource.name` | G4-100 | schedule | **担当ラベルの表示元**だが、値そのものは資源に付いた意味（人の名前）。**改名すると使用中の全タスクの表示が変わる**ので件数を人に知らせる＝データの変更として扱われている | **上げる** | `E06-resource-assignment.md:51`／`E06-resource-assignment.md:167` |
| `Resource.type` | G4-101 | schedule | 材料 / 作業の別。**担当者として表示するかの判定に使う**が、値は資源の属性であり export される | **上げる** | `E06-resource-assignment.md:52` |
| `Resource.is_cost_resource` | G4-102 | schedule | 費用項目かどうか。同上 | **上げる** | `E06-resource-assignment.md:53` |
| `Resource.calendar_id` | G4-103 | schedule | 個人暦への参照。規則が「暦」を schedule に挙げている | **上げる** | `E06-resource-assignment.md:54` |
| `Resource.ID` | G4-104 | — （**保存しない**） | Reconstruct。export で連番を振り直す。**正規 JSON に持たないのでどちらの群にも属さない** | **上げない**（保存対象でない） | `E06-resource-assignment.md:55` |
| `Resource.carry` | G4-105 | schedule | 解釈しない 59 スカラーの器 | **上げる** | `E06-resource-assignment.md:56` |
| `Resource.carry_elements` | G4-106 | schedule | 子要素 6 種の退避先 | **上げる** | `E06-resource-assignment.md:57` |

⚠️ **対になる「担当ラベルの表示切替 `assigneeVisible`（既定 `false`）」は `documentSettings` 側にある**
（`E06-resource-assignment.md:142`）。規則が「担当の表示切替」を明示的に documentSettings に置いており、**ここは規則どおりで矛盾しない**。
**「誰が担当か」は schedule、「担当を見せるか」は documentSettings** という分かれ方は、規則がうまく効いている例である。

## 13. `Assignment`（E06・5 列）

**自分で数えた**: 5 行（`Z01-extracted-columns.md:24` の 5 と一致）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `Assignment.uid` | G4-107 | schedule | 割当の同一性。規則が「割当」を schedule に挙げている | **上げる** | `E06-resource-assignment.md:63` |
| `Assignment.task_uid` | G4-108 | schedule | 担当者表示の経路の 1 本目。`Assignment/TaskUID` として export | **上げる** | `E06-resource-assignment.md:64` |
| `Assignment.resource_uid` | G4-109 | schedule | 担当者表示の経路の 2 本目。`Assignment/ResourceUID` として export | **上げる** | `E06-resource-assignment.md:65` |
| `Assignment.carry` | G4-110 | schedule | 解釈しない 58 スカラー ＋ enterprise 予約枠 201 の器。**割当率 `Units` もここに入る** | **上げる** | `E06-resource-assignment.md:66` |
| `Assignment.carry_elements` | G4-111 | schedule | 子要素 3 種の退避先 | **上げる** | `E06-resource-assignment.md:67` |

**`Resource` ＋ `Assignment` の 13 列に判定不能は無い。**（`Resource.ID` は保存しないので群の外）

---

## 14. `Comment`（E08・8 列）

**自分で数えた**: 8 行（`Z01-extracted-columns.md:19` の 8 と一致。`E08-comment-highlight.md:27` も「`Comment` **8**」と書く）。
規則が「注記」を schedule に挙げている。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `Comment.id` | G4-112 | schedule | 注記の同一性（UUID） | **上げる** | `E08-comment-highlight.md:38` |
| `Comment.leaderShapeKind` | G4-113 | schedule（⚠️ 形だが注記の形） | 引出し四角 / 折れ線の 2 値。**規則の「個別のタスクの色と形状」は「タスク」に限定されている**ので直接は当たらないが、**「注記」が丸ごと schedule に挙がっている**ので schedule。→ 破れ B-12 の一部 | **上げる** | `E08-comment-highlight.md:39` |
| `Comment.text` | G4-114 | schedule | 本文＝注記に付いた意味そのもの | **上げる** | `E08-comment-highlight.md:40` |
| `Comment.anchorDate` | G4-115 | schedule | **world 座標**（日付）。何を指しているかという意味 | **上げる** | `E08-comment-highlight.md:41` |
| `Comment.anchorGroupId` | G4-116 | schedule | どの行を指すか。**インデックスではなく `TaskGroup.id`** で参照する | **上げる** | `E08-comment-highlight.md:42` |
| `Comment.anchorTaskUid` | G4-117 | schedule | どの `Task` を指すか | **上げる** | `E08-comment-highlight.md:43` |
| `Comment.anchorPoint` | G4-118 | schedule | 9 点アンカー。**引き出す位置＝何を指しているかの一部** | **上げる** | `E08-comment-highlight.md:44` |
| `Comment.bodyOffsetPx` | G4-119 | schedule（⚠️ px の見た目の値） | **screen（px）座標**。吹き出しをアンカーからどれだけずらすか。純粋な見た目に見えるが、**注記が読める位置に置かれていること自体が注記の用をなす条件**なので、注記の一部として schedule。→ 破れ B-12 | **上げる** | `E08-comment-highlight.md:45`／空間の別は `E08-comment-highlight.md:110` |

⚠️ **`Comment` に色の列は無い**（`E08-comment-highlight.md:47`）。色の正が原典に無いので、色を変えたときの版数の議論はそもそも立たない。

## 15. `HighlightBox`（E08・7 列）

**自分で数えた**: 7 行（`Z01-extracted-columns.md:21` の 7 と一致。`E08-comment-highlight.md:27` も「`HighlightBox` **7**」と書く）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `HighlightBox.id` | G4-120 | schedule | 注記の同一性（UUID） | **上げる** | `E08-comment-highlight.md:56` |
| `HighlightBox.startDate` | G4-121 | schedule | **world**。囲む範囲の始め＝「何が重要か」という意味 | **上げる** | `E08-comment-highlight.md:57` |
| `HighlightBox.endDate` | G4-122 | schedule | **world**。囲む範囲の終わり | **上げる** | `E08-comment-highlight.md:58` |
| `HighlightBox.topGroupId` | G4-123 | schedule | 範囲の上端の行 | **上げる** | `E08-comment-highlight.md:59` |
| `HighlightBox.bottomGroupId` | G4-124 | schedule | 範囲の下端の行 | **上げる** | `E08-comment-highlight.md:60` |
| `HighlightBox.strokeColor` | G4-125 | schedule（⚠️ 色だがタスクの色ではない） | **枠線がこの注記の唯一の描画要素**なので、色を消すと注記が存在しないのと同じになる＝意味の側。規則の「個別のタスクの色」には当たらないが「注記」に当たる | **上げる** | `E08-comment-highlight.md:61` |
| `HighlightBox.cornerRadiusPx` | G4-126 | **判定不能** | **象限 2 で、しかも純粋に装飾である。** 角丸の R は「何を囲んでいるか」を 1 ミリも変えない。位置（`startDate` ほか）と違って意味を担わず、色（`strokeColor`）と違って可視性も担わない。**規則の「色と形状」にも「注記の内容」にも当たらない。** かつ **`documentSettings` 側には「寸法の既定」という群があり、そこに落とすのが素直に見える**が、注記ごとの値なので置けない。→ 破れ B-13 | **決められない** | `E08-comment-highlight.md:62`／空間の別は `E08-comment-highlight.md:82` |

## 16. `CarryElement`（E10・6 列）

**自分で数えた**: 6 行（`Z01-extracted-columns.md:23` の 6 と一致。`E10-carry-roundtrip.md:37` は「表 E10-1 — Carry の器（6 行）」と書く）。
**これはエンティティではなく「器の形」である**（`carry` / `carryElements` と、その配列要素の 4 鍵）。

| 鍵 / エンティティ | 行 ID | 群 | 判定の理由 | 版数を上げるか | 出典 |
| --- | --- | --- | --- | --- | --- |
| `carry` | G4-127 | schedule | 解釈しなかったスカラーの器。**中身は MSPDI の原テキスト＝出ていくファイルの中身** | **上げる** | `E10-carry-roundtrip.md:41` |
| `carry_elements` | G4-128 | schedule | ネイティブ行を作らない要素の器 | **上げる** | `E10-carry-roundtrip.md:42` |
| `carryElements[].name` | G4-129 | schedule | 当該要素の XSD 実名。原形復元に必須 | **上げる** | `E10-carry-roundtrip.md:43` |
| `carryElements[].ordinal` | G4-130 | schedule | 原順序の復元キー（ネイティブ行と同じ番号空間） | **上げる** | `E10-carry-roundtrip.md:44` |
| `carryElements[].fields` | G4-131 | schedule | 葉要素（名 → テキスト） | **上げる** | `E10-carry-roundtrip.md:45` |
| `carryElements[].children` | G4-132 | schedule | 入れ子の子要素（再帰） | **上げる** | `E10-carry-roundtrip.md:46` |

⚠️ **`carry` の中身は「見せ方」を大量に含む。** `Task` 側だけでも `HideBar` / `Rollup`（MS Project のビュー書式）、
`Project` 側では「既定タスク・レート・書式 9」が入る（`E01-task-plan.md:75-76`／`E04-project.md:49`）。
**GRS はこれらを解釈しないので GRS の画面上の「見せ方」ではない**が、**相手ツールの「見せ方」がここに詰まっている**。
→ 破れ B-1

⚠️ **`TaskGroup` / `TaskGroupMember` / `TaskVisual` / `TaskOrigin` / `Comment` / `HighlightBox` / `documentSettings` は器を持たない**
（`E10-carry-roundtrip.md:81-83`）。**器を持つ 8 エンティティ＝ MSPDI 由来＝ export される側**であり、
**器を持たない 6 エンティティ＝ GRS 新設＝非 export** である。この線は `schedule` の内側を走る第 2 の境界である。→ 破れ B-14

---

## 集計（自分で数えた）

**判定した列の総数 132。**（`Z01-extracted-columns.md:29` の 133 との差 1 は `Task.milestone` の二重計上。§1 参照）

| 群 | 列数 | 内訳 |
| --- | --: | --- |
| `schedule` | **119** | 下の 2 つ以外すべて |
| `documentSettings` | **0** | ⚠️ **16 エンティティのどの列も documentSettings に落ちなかった** |
| **判定不能** | **9** | G4-033 `TaskGroup.collapsed` / G4-035 `TaskGroup.height` / G4-038 `TaskGroupMember.stack_order` / G4-048 `Project.revision` / G4-057 `Project.schema_version` / G4-091 `TaskVisual.nameAnchor` / G4-092 `TaskVisual.nameAlign` / G4-093 `TaskVisual.lineWeight` / G4-126 `HighlightBox.cornerRadiusPx` |
| （保存しない＝群の外） | **4** | G4-061 `Project.finish_date` / G4-062 `Project.SaveVersion` / G4-063 `Project.CurrencyCode` / G4-104 `Resource.ID` |

**119 ＋ 0 ＋ 9 ＋ 4 = 132**（自分で足した）。

**エンティティごとの割れ方（自分で数えた）**

| エンティティ | 列数 | schedule | 判定不能 | 群の外 | 割れているか |
| --- | --: | --: | --: | --: | --- |
| `Task` | 20 | 20 | 0 | 0 | 割れない |
| `Dependency` | 7 | 7 | 0 | 0 | 割れない |
| **`TaskGroup`** | 8 | 5 | **3** | 0 | **割れる** |
| **`TaskGroupMember`** | 3 | 2 | **1** | 0 | **割れる** |
| **`Project`** | 25 | 20 | **2** | 3 | **割れる** |
| `Calendar` | 4 | 4 | 0 | 0 | 割れない |
| `WeekDay` | 3 | 3 | 0 | 0 | 割れない |
| `Exception` | 6 | 6 | 0 | 0 | 割れない |
| 暦クラスタ新設 | 9 | 9 | 0 | 0 | 割れない |
| **`TaskVisual`** | 8 | 5 | **3** | 0 | **割れる** |
| `TaskOrigin` | 5 | 5 | 0 | 0 | 割れない |
| `Resource` | 8 | 7 | 0 | 1 | 割れない |
| `Assignment` | 5 | 5 | 0 | 0 | 割れない |
| `Comment` | 8 | 8 | 0 | 0 | 割れない |
| **`HighlightBox`** | 7 | 6 | **1** | 0 | **割れる** |
| `CarryElement` | 6 | 6 | 0 | 0 | 割れない |
| **計** | **132** | **119** | **9** | **4** | **5 エンティティが割れる** |

**割れるのは 5 エンティティ**（`TaskGroup` / `TaskGroupMember` / `Project` / `TaskVisual` / `HighlightBox`）。
**割れる 9 列のうち 7 列は「個別の対象に付いた見せ方」（象限 2）である。**
残り 2 列（`Project.revision` / `Project.schema_version`）は**そもそもどちらの群でもない第 3 のもの**である。

---

# 判定不能と、境界が破れる場所

**この節が本作業の目的である。** 1 件ずつ、理由を `file:line` つきで書く。
**B-15 と B-16 が最重要**（規則そのものが既存の確定事項と正面衝突する）。

---

## B-15 ⚠️ 最重要 — 新しい規則は `FR-063` を反転させている

**`FR-063` は「ズーム・スクロール・パン・パネル幅の変更でも版数が上がる」と定めている。**

原文の要約（`E04-project.md:125`）:

> **文書の更新回数** … 1 ずつ増える整数。**文書に保存される値を変える更新すべて**で上がる
> （**ズーム・スクロール・パン・パネル幅・表 T-202 の表示切り替えも含む**。
> 上がらないのは選択・構えの変更・フォーカス移動と表 T-206 の値だけ）

**利用者判断（2026-08-14）はこれを反転させる** — ズーム・スクロール・パネル幅・表示切替は
すべて `documentSettings` 群であり「版数を上げない」。

- **`FR-063` の基準は「保存されるかどうか」**（保存されるなら上げる）。
- **新しい規則の基準は「意味か見せ方か」**（見せ方なら上げない）。
- **この 2 つは同じ値に対して逆の答えを出す。** ズームは保存されるが見せ方である。

**判定**: これは「判定不能」ではなく**明確な矛盾**である。
**`FR-063` を改訂しない限り、新しい規則は仕様書と両立しない。**
出典: `E04-project.md:125`／`FR-063` の原文位置は `E04-project.md:87`（`REQ:3111`）。

---

## B-16 ⚠️ 最重要 — 入れ物は 2 つではなく既に 3 つある（`revisionStamp` / `changeLog`）

**文書の根には `schedule` と `documentSettings` のほかに `revisionStamp`（3 列）と `changeLog[]`（4 列）がある。**

- `Z01-extracted-columns.md:29` が既に「⚠️ **`revisionStamp`(3) と `changeLog[]`(4) は A01 にあり E 側に無い**」と注意している。
- `revisionStamp` は **`revision` / `lastEditedBy` / `updatedAt`** の 3 列（`A01-agent-api-spec.md:69-71`）。
- **`RS-3`: 「`documentSettings` に入れてはならない」**（`A01-agent-api-spec.md:79`）。
  理由は「`documentSettings` は**同じ JSON から同じ絵を得るためのもの**であり、
  **`revisionStamp` は絵に影響しない**。混ぜると『全項目を常に書き出す』規約の対象が濁る」。
- **`RS-1`: `revision` は「あらゆる確定で 1 増える。減らない。飛ばさない。`undo` / `redo` でも前へ進む」**
  （`A01-agent-api-spec.md:69`）。

**破れ方**: 版数を持つ入れ物（`revisionStamp`）は**既に第 3 の群として独立している**。
「schedule を変えたら上げる／documentSettings を変えたら上げない」という規則は、
**`revisionStamp` 自身がどちらの群にも属さない**ことを前提に書かれていない。
また **`RS-1` の「あらゆる確定で 1 増える」は「見せ方では上げない」と両立しない** —
見せ方の変更を「確定」と呼ぶかどうかが未定義である。

**判定不能**: `revisionStamp.revision` を「上げる／上げない」で分類できない。**自分自身が版数だから**である（G4-048 も同型）。
出典: `A01-agent-api-spec.md:37`／`:69`／`:79`／`Z01-extracted-columns.md:29`

---

## B-9 ⚠️ 例外として名指しされた `themeHue` が、16 エンティティのどこにも無い

利用者判断は **`themeHue` を schedule 側の唯一の例外**とした。しかし——

- **`Project` の 25 列に `themeHue` は無い**（`E04-project.md:29-53` を全数確認した）。
- **`themeHue` は `documentSettings` の鍵である**（`E09-settings-blob.md:269`。設定値表の `S-73`、群「テーマ」）。
- つまり **例外を実現するには、`themeHue` を `documentSettings` から `Project`（または schedule の根）へ移す必要がある**。
  そう書いた記述はどの原典にも無い。

**さらに連鎖する**: `themeHue` に追随する保存値が **3 つ**ある。
`TaskVisual.fillColor`（G4-089）／`TaskVisual.strokeColor`（G4-090）／`TaskGroup.color`（G4-034）で、
いずれも **`null` のときテーマから解き、解いた結果は保存しない**（`E07-visual-origin.md:38`／`E03-dependency-taskgroup.md:73`）。
**この 3 列は schedule に居るのに、依存先の `themeHue` は今日 documentSettings に居る。**
`themeHue` を移さないまま規則を適用すると、**「版数を上げない値」を変えると「版数を上げる値」の見え方が全部変わる**という状態になる。

**判定**: 例外そのものは判定できる（schedule で正しい）。**破れているのは置き場所である。**
出典: `E09-settings-blob.md:269`／`E04-project.md:29-53`／`E07-visual-origin.md:38`／`E03-dependency-taskgroup.md:73`

---

## B-3 `TaskGroup.collapsed` — 原典自身が「見た目」と認めたうえで保存を要求する

原典の文言（`E03-dependency-taskgroup.md:72`）:

> 折り畳み。**見た目の一部なので保存し、共有で再現する**

- 規則の schedule 側は「**個別のタスクの色と形状**」しか象限 2 から拾っていない。**畳みは色でも形状でもない。**
- 規則の documentSettings 側は「**全体の見せ方**」であり、**畳みは個別の器に付く**ので「全体」ではない。
- **どちらの定義にも当てはまらない。**

**帰結の重さ**: 畳むと「配下の行と `Task` を描いてはならず、配下の `Task` を親の行へ載せ替えてもならない」
（`E03-dependency-taskgroup.md:72`）。**畳みは何が見えるかを丸ごと変える。**
「見せ方だから版数を上げない」とすると、**受け取った相手に見えている行数が違うのに版数が同じ文書**が成立する。

**判定不能**。出典: `E03-dependency-taskgroup.md:72`／`C-8`（既定値も未定）は `E03-dependency-taskgroup.md:154`

---

## B-4 `TaskGroup.height` — `documentSettings.zoomY` と一体でしか意味が決まらない

- 値は **「ズーム = 1 基準の論理高さ」で保存し、ズームに比例して伸縮する**（`E03-dependency-taskgroup.md:74`／`E07-visual-origin.md:79`）。
- つまり **画面上の実際の高さ ＝ `TaskGroup.height`（schedule 側） × `zoomY`（documentSettings 側）**。
- **1 つの見た目が 2 つの群にまたがって決まる。** 片方だけ版数を上げると、「絵は変わったが版数は同じ」が起こる。

さらに `C-5`（`E03-dependency-taskgroup.md:151`）が未解決として残っている:
**人の指定値と段数由来の高さの関係が原典にも仕様書にも書かれていない**
（仕様書は「行の帯高は段数で決まる。行高固定を前提にしてはならない MUST NOT」と定める）。

**判定不能**。出典: `E03-dependency-taskgroup.md:74`／`:151`／`E07-visual-origin.md:79`

---

## B-5 `TaskGroupMember.stack_order` — 列の要否そのものが原典と仕様書で逆

- 原典: 縦積み段の**疎な上書き**として持つ（`null`＝自動割当／値＝人が指定した段）。`E03-dependency-taskgroup.md:96`
- 仕様書 `ST-6`: **「積み順は自動割当のみとし、人が段を手で指定する手段を設けない（MUST NOT）」**。`E03-dependency-taskgroup.md:153`（`C-7`）
- 用語辞書 `N-4` は「人が指定できるかどうかは `ST-6` が定める」と仕様書へ委ねている。

**仕様書に従うなら列そのものが不要になる。** 列が無ければ群の議論も版数の議論も無い。
列が在るなら象限 2（個別 × 見せ方）で、`collapsed` / `height` と同じ理由で決められない。

**判定不能（二重に）**。出典: `E03-dependency-taskgroup.md:96`／`:153`

---

## B-10 `TaskVisual` の 3 列（`nameAnchor` / `nameAlign` / `lineWeight`）— documentSettings に構造上置けない

**`TaskVisual` は定義からして「見た目の列」である**（`E07-visual-origin.md:1`）。
規則が象限 2 から拾ったのは「色と形状」だけなので、**残る 3 列は行き場を失う**。

| 列 | なぜ「色と形状」に当たらないか | 出典 |
| --- | --- | --- |
| `nameAnchor` | バー上の 9 点アンカー＝**ラベルの置き場所**。バーの形は変わらない | `E07-visual-origin.md:34` |
| `nameAlign` | ラベルの左詰め / 中央 / 右詰め。同上 | `E07-visual-origin.md:35` |
| `lineWeight` | **原典が「色ではない」と明言している**（「色に頼らない識別手段」・WCAG 1.4.1・**テーマから導出しない**）。形状は `shapeKind` が別に持つ | `E07-visual-origin.md:40` |

**構造上の詰み**: `documentSettings` は**文書に 1 つの器**であり、**タスクごとの値を置く場所が無い**。
したがって「documentSettings 群だから版数を上げない」と決めても、**値の置き場は `TaskVisual`（schedule 側の表）のままになる**。
群と置き場が一致しない列が 3 つできる。

**判定不能**。出典: `E07-visual-origin.md:34`／`:35`／`:40`／`:1`

---

## B-13 `HighlightBox.cornerRadiusPx` — 「寸法の既定」は documentSettings なのに、個別値は置けない

- 値は **screen（px）**で、要求は「角丸の R は拡大縮小しても同じ大きさに見える」（`E08-comment-highlight.md:62`）。
- **意味を一切担わない** — 角丸を変えても「何を囲んでいるか」は変わらない。
  位置（`startDate` / `endDate` / `topGroupId` / `bottomGroupId`）と違い、色（`strokeColor`：**枠線がこの注記の唯一の描画要素**）とも違う。
- 規則の documentSettings 側は「**寸法の既定**」を名指しで含む。**角丸の R はまさに寸法である。**
  しかし**注記ごとの値**なので documentSettings には置けない（B-10 と同じ構造上の詰み）。

**判定不能**。出典: `E08-comment-highlight.md:62`／`:61`／`:82`

---

## B-6 `Project.revision` — 自己言及であり、かつ MSPDI の意味とずれる

- **自己言及**: 「版数を上げるか」を版数そのものに問うている。答えは定義上「上げない（自分が上がる側だから）」だが、
  それは分類ではない。
- **意味のずれ**（`U-4`・`E04-project.md:159`）: `Project/Revision` の XSD 定義文は
  **"The number of times a project has been saved"（保存回数）**であり、
  `FR-063` の「文書に保存される値を変える更新すべてで +1」と**意味が一致しない**。
- **Own 列である**（取り込んだ値をそのまま書き戻す列）。**GRS が編集のたびに加算すると、
  MSPDI の "number of times saved" とは違う数を相手ツールへ返すことになる**（`E04-project.md:131`）。
- 原典は「**どちらにするかを決めた記述は原典に無い（未検証）**」と明記する（`E04-project.md:131`）。

**判定不能**。出典: `E04-project.md:38`／`:131`／`:159`

---

## B-7 `Project.schema_version` — どちらの群でもない第 3 のもの

- **日程のデータでもなければ、全体の見せ方でもない。** JSON という入れ物の形式の版である。
- 人の編集では変わらない。**移行のときだけ変わる。**
- `FR-024` が **「`FR-063` の版数（更新回数）とは別物である」と明記**している（`E04-project.md:47`）。
- ⚠️ **置き場所も原典間で食い違う**（ERD ＝ `Project` の列／JSON 実例 ＝ **JSON 最上位の `schemaVersion`**）。`U-5`・`E04-project.md:160`
- ⚠️ `A01-agent-api-spec.md:36` も **「根の直下。`documentSettings` の中ではない」**と書く。

**判定不能**。出典: `E04-project.md:47`／`:160`／`A01-agent-api-spec.md:36`

---

## B-8 `Project.uid_high_water_mark` — 「Undo で巻き戻さない」が版数の設計と噛み合わない

- 原典は **「Undo で巻き戻さない」**と明記する。理由は「巻き戻すと Undo 後に作った Task の UID が
  Redo で戻る UID と衝突する」（`E04-project.md:48`）。
- 一方 `revisionStamp.revision` は **「`undo` / `redo` でも前へ進む」**（`A01-agent-api-spec.md:69`）。
- **この 2 つは同じ向きなので今日は矛盾しない。** ただし「版数を上げるのは日程のデータが変わったときだけ」という規則を
  素直に読むと、**Undo は日程のデータを元に戻すので「上げない」あるいは「戻す」と読める余地がある**。
  そう読むと `uid_high_water_mark` と衝突する。

**判定**: schedule に置いたが、**「Undo のとき版数をどうするか」が規則に書かれていない**ことを記録する。
出典: `E04-project.md:48`／`A01-agent-api-spec.md:69`／`:99`（`CL-4`「`undo` でも項目を消さない。取り消した事実を 1 件足す」）

---

## B-11 「消えた候補」の判定が群をまたぐ

- `TaskOrigin.last_seen_import_seq`（**schedule**・G4-097）と
  `documentSettings.importSeq`（**documentSettings**）の **2 つだけ**を記録し、
  判定は `last_seen_import_seq < max(同じマスタの last_seen_import_seq)` で**保存しない**（`E07-visual-origin.md:104`）。
- **`importSeq` は「取込のたびに +1 する文書内連番」であり、見せ方ではない。**
  それが `documentSettings`（＝全体の見せ方の器）に入っている（`E07-visual-origin.md:82`／`E04-project.md:59`）。
- 規則を適用すると、**「取り込みをした」という事実の一部（`importSeq`）が版数を上げない側に落ちる**。

**判定**: `importSeq` は 16 エンティティの列ではないので本書の判定対象外だが、
**`documentSettings` に「見せ方でないもの」が既に混ざっている**ことの実例として記録する。
出典: `E07-visual-origin.md:82`／`:104`／`E04-project.md:59`

---

## B-1 `carry` の中身に「相手ツールの見せ方」が詰まっている

- `Task.carry`（G4-013）には **`HideBar`（MS Project のビュー書式）と `Rollup`（同）**が入る
  （`E01-task-plan.md:75`／`:76`）。
- `Project.carry`（G4-059）には **「既定タスク・レート・書式 9」**が入る（`E04-project.md:49`）。
- **GRS はこれらを解釈しない**ので GRS の画面上の見せ方ではない。しかし**中身は紛れもなく見せ方である**。

**判定**: schedule に置いた（往復無損失＝ Drop=0 の担い手だから）。
**破れているのは「意味 vs 見せ方」という軸そのもの** — 同じ値が、GRS から見れば不透明なデータで、
相手ツールから見れば見せ方である。**どちらから見るかで群が変わる。**
出典: `E01-task-plan.md:37`／`:75`／`:76`／`E04-project.md:49`

---

## B-2 `Dependency.lag_format` — 「表示単位」なのに schedule

- **ラグの表示単位**であり、**原典自身が「GRS は表示に使わない」と書く**（`E03-dependency-taskgroup.md:46`）。
- それでも **`PredecessorLink/LagFormat` として export される**ので、schedule 側に置かざるを得ない。

**判定**: schedule。ただし **`Task.carry.DurationFormat` も同型**である
（Carry なのに **export で `xsd:duration` を整形するときだけ読む** ＝「Carry は書き戻すだけであって読まないではない」・`E01-task-plan.md:63`）。
**「表示のための値」が schedule に入る正当な理由が「export されるから」だとすると、
規則の実質的な基準は「意味か見せ方か」ではなく「export されるか否か」である。** → B-20 へ

---

## B-12 注記の見た目の列 — 規則の「色と形状」は**タスク限定**で書かれている

規則の文言は「**個別のタスクの色と形状**」である。**注記の色と形状には触れていない。**
一方で「注記」は丸ごと schedule 側に挙がっている。この 2 つの読みが競合する列が 3 つある。

| 列 | 何が競合するか | 出典 |
| --- | --- | --- |
| `Comment.leaderShapeKind`（G4-113） | 引出し四角 / 折れ線＝**注記の形状**。「タスクの形状」ではない | `E08-comment-highlight.md:39` |
| `Comment.bodyOffsetPx`（G4-119） | **screen（px）**で吹き出しをずらす量。位置だが world ではない | `E08-comment-highlight.md:45`／`:110` |
| `HighlightBox.strokeColor`（G4-125） | **注記の色**。「タスクの色」ではない | `E08-comment-highlight.md:61` |

**本書は 3 件とも schedule と判定した**（「注記」がエンティティ名で列挙されているほうを採った）。
**しかしこれは、`TaskGroup.collapsed` を判定不能にした判断と非対称である** —
`TaskGroup` も「行の器（TaskGroup）」としてエンティティ名で列挙されているのに、そちらは列単位で割った。
**規則がエンティティ名の列挙と列単位の基準を混ぜているために、一貫した適用ができない。** → B-17

---

## B-17 `TaskGroup.color` は拾われ、`TaskGroup.collapsed` は拾われない（非対称）

- **同じエンティティの、同じ象限 2（個別 × 見せ方）の、同じ「疎な上書き」の列**である
  （`E03-dependency-taskgroup.md:73`／`:72`）。
- 規則が名指しした「色」に **`color` は当たり、`collapsed` は当たらない**。それだけの違いで群が分かれる。
- **`color` を拾う理由が「`themeHue` と同じ群に居るべきだから」なら筋が通る**が、
  **`collapsed` を落とす理由は「規則が言及しなかったから」以上のものが無い。**

**判定**: `color` は schedule（G4-034）、`collapsed` は判定不能（G4-033）とした。
**この非対称は規則の文言に由来するもので、データモデル側に根拠が無い。**
出典: `E03-dependency-taskgroup.md:72`／`:73`

---

## B-14 `schedule` の内側を、もう 1 本の境界が走っている（export される / されない）

`E10-carry-roundtrip.md:81-83` が明示する:

| 群 | エンティティ | Carry の器 |
| --- | --- | --- |
| MSPDI 由来・**export される** | `Project` / `Task` / `Dependency` / `Calendar` / `WeekDay` / `Exception` / `Resource` / `Assignment` の **8** | **持つ** |
| GRS 新設・**非 export** | `TaskGroup` / `TaskGroupMember` / `TaskVisual` / `TaskOrigin` / `Comment` / `HighlightBox` の **6** | **持たない** |

**本書が schedule と判定した 119 列は、この 2 つにまたがっている。**
`TaskVisual` / `TaskGroup` / `Comment` / `HighlightBox` / `TaskOrigin` / `TaskGroupMember` は
**MSPDI へ 1 バイトも出ない**（`E07-visual-origin.md:105`「MSPDI は描画データを一切持たない」）。

**帰結**: 「版数を上げる＝日程のデータが変わった」を「出ていくファイルが変わった」と読むと、
**非 export の 6 エンティティは全部 documentSettings 側に落ちる**。
そう読まないなら、規則の「日程のデータ」は「出力ファイルの中身」より広い何かを指していることになるが、
**その定義が規則に無い。**
出典: `E10-carry-roundtrip.md:81-83`／`E07-visual-origin.md:105`

---

## B-18 「同じ JSON → 同じ絵」の保証と、版数を上げない群の関係

- `documentSettings` の存在理由は **「同じ JSON からは同じ絵が出る」**ことである
  （`E09-settings-blob.md:365`／`A01-agent-api-spec.md:79` の `RS-3` も同じ理由を引く）。
- **ズーム / スクロールを保存する決定**（2026-07-31・「保存しない」から覆した）の理由は
  **「人に重要なところを見せたい」**であり、**「文書が『どこを見せたいか』を持てないと、渡した相手に同じ絵が出ない」**
  （`E09-settings-blob.md:384`）。
- 仕様書 `WY-1` は **この 4 キーを保存対象から外すことを禁じている（MUST NOT）**（`E09-settings-blob.md:388`）。

**破れ**: ズーム / スクロールは**「どこを見せたいか」という作者の意思**として保存が決まった。
新しい規則はこれを「全体の見せ方」として版数の外に置く。
すると **「作者が見せたい場所を変えた」ことが版数に残らない** —
`AG-2` の楽観的排他制御（版数で「自分が書いたままか、人が直した後か」を判定する・`A01-agent-api-spec.md:77`）が
**その変更を検出できない**。

**判定**: `documentSettings` の列は本書の担当外（G9 相当）だが、**規則の帰結として記録する。**
出典: `E09-settings-blob.md:365`／`:384`／`:388`／`A01-agent-api-spec.md:77`／`:79`

---

## B-19 第 3 の枠が既にある — 「保存値は初期値で、読む人が上書きする」

- 仕様書の判定は **2 段 ＋ 第 3 の枠**である（`E09-settings-blob.md:363`）:
  第 1 段＝絵が変わるか／第 2 段＝**文書の内容か、読む人の環境か**／
  **第 3 の枠＝保存値を初期値として持ち、読む人の指定が上書きする（`fontScale` / `themePreference`）**。
- **`FR-039` はさらに踏み込む**: **読む人が文字サイズを変えると `rulerFont`（`S-3`）と `rulerHeight`（`S-2`）の保存値が
  書き換わり、それが「文書の編集」になる**（`E09-settings-blob.md:413`）。

**破れ**: **見せ方の変更が明示的に「文書の編集」と定義されている条文が既にある。**
新しい規則の「見せ方が変わっただけでは上げない」と正面から食い違う。
また **2 群では第 3 の枠（読む人が上書きする値）を表現できない。**
出典: `E09-settings-blob.md:363`／`:413`／`:412`

---

## B-20 規則の実質的な基準は「意味 vs 見せ方」ではなく「export されるか否か」ではないか

本書で「見せ方の値なのに schedule」と判定した列は、**すべて export されることを理由にしている**。

| 列 | 見せ方の度合い | schedule に置いた理由 | 出典 |
| --- | --- | --- | --- |
| `Task.fadeInDays` / `fadeOutDays`（G4-011 / G4-012） | バーの端のぼかし＝純粋な見た目 | MSPDI 拡張領域 `Number1` / `Number2` へ **export される** | `E01-task-plan.md:35`／`:36`／`E07-visual-origin.md:114` |
| `Dependency.lag_format`（G4-025） | ラグの表示単位。GRS は表示に使わない | `PredecessorLink/LagFormat` として **export される** | `E03-dependency-taskgroup.md:46` |
| `Task.carry.DurationFormat` | 期間の表示書式 | **export の整形で読む**（Carry の例外） | `E01-task-plan.md:63` |
| `Task.carry.HideBar` / `Rollup` | MS Project のビュー書式 | **原形のまま書き戻す** | `E01-task-plan.md:75`／`:76` |

**逆に、判定不能になった 7 列（`collapsed` / `height` / `stack_order` / `nameAnchor` / `nameAlign` / `lineWeight` / `cornerRadiusPx`）は
すべて非 export である**（`E10-carry-roundtrip.md:81-82`／`E07-visual-origin.md:105`）。

**⚠️ ただしこれを「基準は export だ」と断定してはならない。**
`TaskVisual.fillColor` / `strokeColor`（G4-089 / G4-090）と `TaskGroup.color`（G4-034）も**非 export**であり、
それでも規則は「個別のタスクの色」として schedule に引き入れている。
**`export される ⇒ schedule` は本書の 132 列で成り立つが、逆（`非 export ⇒ 判定不能`）は成り立たない。**

**判定**: 「基準は export か」は**判定不能**（規則が根拠を書いていない）。
**ただし、もし基準を `export されるか否か` に置き換えれば、判定不能は 9 件から 2 件
（`Project.revision` / `Project.schema_version`）へ減る** — これは次の設計で検討に値する。
出典: 上表の各行

---

## 判定不能の総数（自分で数えた）

| # | 列 | 行 ID | なぜ決められないか（1 語） | 破れ番号 |
| --: | --- | --- | --- | --- |
| 1 | `TaskGroup.collapsed` | G4-033 | 個別 × 見せ方で、色でも形状でもない | B-3 |
| 2 | `TaskGroup.height` | G4-035 | 同上。かつ `zoomY` と一体で意味が決まる | B-4 |
| 3 | `TaskGroupMember.stack_order` | G4-038 | 同上。かつ列の要否が原典と仕様書で逆 | B-5 |
| 4 | `Project.revision` | G4-048 | 自己言及。かつ MSPDI の意味とずれる | B-6 |
| 5 | `Project.schema_version` | G4-057 | どちらの群でもない第 3 のもの | B-7 |
| 6 | `TaskVisual.nameAnchor` | G4-091 | 個別 × 見せ方で、色でも形状でもない | B-10 |
| 7 | `TaskVisual.nameAlign` | G4-092 | 同上 | B-10 |
| 8 | `TaskVisual.lineWeight` | G4-093 | 同上。原典が「色ではない」と明言 | B-10 |
| 9 | `HighlightBox.cornerRadiusPx` | G4-126 | 同上。かつ「寸法の既定」は documentSettings 側の群名 | B-13 |

**判定不能 9 件**（表の行を数えた）。

**うち 7 件（#1・#2・#3・#6・#7・#8・#9）は同じ 1 つの穴に落ちている** —
**規則が「個別の対象に付いた見せ方」（象限 2）のうち、色と形状しか拾っていない。**
**この穴を塞ぐ 1 文を規則に足せば、7 件が同時に決まる。**

**残り 2 件（#4・#5）は別の穴** — **版数の入れ物と形式の版は、どちらの群にも属さない第 3 のものである**（B-16 と同根）。

---

## この作業の限界（断定していないこと）

| # | 確かめていないこと | 理由 |
| --: | --- | --- |
| 1 | `docs/spec/` の現行条文 | **編集も参照も指示範囲外**。`FR-063` / `FR-024` / `ST-6` / `WY-1` の文面は **E ファイルの引用を通してしか読んでいない** |
| 2 | `documentSettings` の 92 鍵の個別判定 | 本書の担当は 16 エンティティ。`E09-settings-blob.md` は `themeHue` の所在（`:269`）と判定の形（`:363`）と保存理由（`:384`）だけを引いた |
| 3 | `revisionStamp` / `changeLog` の全列判定 | 16 エンティティに含まれない。**B-16 で存在と `RS-3` を記録するにとどめた** |
| 4 | PoC・アイコン草案の実装 | 開いていない。**「PoC にある / ない」を本書は一切主張しない** |
| 5 | （限界ではなく**検証済み**）`Task` の 21 と 20 | `Z01-extracted-columns.json` を開いて機械的に数え直した: **E01 §1 が 14 行、E02 §1 が 7 行、合計 21。名前の重複を除くと 20**（重複は `milestone` 1 件）。**`Z01` の 21 は二重計上で、20 が正しい**（推測ではなく実測） |

---

## 数の機械再検査（本書自身を読み直して数えた）

本書の全表から `G4-nnn` の行 ID と群の欄を正規表現で抜き、集計し直した結果である。

| 検査 | 結果 |
| --- | --- |
| 行 ID を持つ表の行 | **141**（うち末尾の判定不能一覧が 9 件を再掲するので、実体は 132） |
| 一意な行 ID | **132** |
| `G4-001`〜`G4-132` の欠番 | **0** |
| 範囲外の行 ID | **0** |
| `schedule` | **119** |
| `documentSettings` | **0** |
| 判定不能 | **9** |
| 群の外（保存しない） | **4** |
| 合計 | **119 ＋ 0 ＋ 9 ＋ 4 = 132** ✔ |

**§集計の自己申告と機械再検査は一致した。**
