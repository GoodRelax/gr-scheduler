# CR-792 —— 裁定した 14 件の名を、識別子まるごとで改める（段 1: 改名表と下見）

> 状態: ⏸ **下見まで（段 1）** —— 2026-10-17、改名の席が `79feea99`（`integ/coord-1017` の `f1a0ec6d` を取り込んだ先端）の上で書いた。⛔ **まだ 1 つも当てていない。** 調整役が利用者に下見を見せてから、段 2 で当てる。変更履歴は 5.05（予約済み）。
> 当てる裁定: `JDG-2680`〜`JDG-2690`（名の調べ N-1〜N-11）・`editGroup` → `editPermission`（利用者の選択、2026-10-17）・`JDG-2723`・`JDG-2724`。覆す裁定: 無し。覆す規則: 無し。
> 出どころ: 名の調べ `previous-project-result/67-naming-audit/README.md`。前の段（段 0）は `_source` の関係図と検査 83・84（`585b29cc`・`46f2e5a2`、`previous-project-result/69-source-erd/README.md`）。
> 台帳: 新しい行 ID は無い。消す行 ID は無い。辞書の語は足さない・消さない（画面の語は変えない —— 変えるのは鍵と命令と API の名だけ）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-001`（アルファの公開前に、見える不具合と揺れを残さない）。GRS JSON の鍵・文書の命令・Agent API の名は、公開した後は変えにくい（`JDG-2241`「公開前がラストチャンス」）。AI が読み違える名（`hasMovedSchedule`・`scrollDayOffset` ほか）を、公開の前に指す物の名へそろえる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R2`**（名は指す物を言う）。出たこと: ① 名の調べの 12 件と、検査 84 が並びの `column` を対にして見つけた 2 件（`isApplied`・`hiddenKeys`）。② 古い語を含む別の識別子が 13 あり、12 を同じ語へそろえ、1（`thinFontScale`）は本当の倍率なので残す。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 改名の表に無い識別子のうち、古い名を部品の並びとして含むもの（`fontScaleSizes`・`FONT_SCALE_STEPS` ほか 12）は、同じ語へそろえる（2 節）。`fontScaleSizes` は `JDG-2682` が名指している。
2. ⭐ `PlanActualPlacement` の値の語（`JDG-2684` は「最終の語は CR が示す」）は、画面の語（表 T-019 の行の語 `PS-1`〜`PS-5`）に寄せた案を推す（3.1 節）—— ⚠️ 調整役が利用者に見せる。
3. ⭐ `beginTaskActual` の `grabbed` の値の語は、表 T-266 の行の説明から作る（3.1 節）。
4. ⭐ 作る命令（`CM-46` コメントボックスを作る・`CM-52` ハイライトボックスを作る）の `id` も、`JDG-2685` の列挙どおり `commentBoxId`・`highlightBoxId` にする。書く列の名（`id`）と違うので、検査 84 の許可リストに `JDG-2685` を引く 2 行を足す（5 節）。

---

## 1. 改名表 —— 識別子まるごと（`how = whole`）

`tools/rename/cr792_rename.py --survey` が `docs/review/cr-792-rename-map.tsv` を読んで数えた（2026-10-17、`79feea99` の上、手で直すファイルだけ。生成物は `npm run gen` で作り直すので別に数えた）。**比べるのは字句のまるごと** —— `assignTask` は `task` の改名に触れない。部分文字列は決して替えない。

| 旧 | 新 | 裁定 | 件数（手） | ファイル | 生成物の件数 |
| --- | --- | --- | ---: | ---: | ---: |
| `hasMovedSchedule` | `hasUpdatedSchedule` | `JDG-2680` | 92 | 21 | 2 |
| `scrollDayOffset` | `scrollDateFraction` | `JDG-2681` | 203 | 88 | 15 |
| `scrollGroupOffset` | `scrollTaskGroupFraction` | `JDG-2681` | 213 | 96 | 15 |
| `fontScale` | `fontSizeStep` | `JDG-2682` | 115 | 37 | 21 |
| `setFontScale` | `setFontSizeStep` | `JDG-2682` | 18 | 10 | 2 |
| `sourceProjectUid` | `sourceProjectId` | `JDG-2683` | 13 | 6 | 4 |
| `parentProgressToleranceDays` | `parentTaskProgressToleranceDays` | `JDG-2688` | 65 | 34 | 13 |
| `setParentProgressToleranceDays` | `setParentTaskProgressToleranceDays` | `JDG-2688` | 12 | 7 | 2 |
| `targetTaskGroupId` | `parentId` | `JDG-2689` | 19 | 11 | 3 |
| `deleteResource` | `deleteResources` | `JDG-2690` | 14 | 8 | 2 |
| `editGroup` | `editPermission` | 利用者の選択（2026-10-17） | 440 | 93 | 12 |
| `setTaskGroupEditGroup` | `setTaskGroupEditPermission` | 同上 | 14 | 6 | 1 |
| `setElementVisible` | `setVisibilitySetting` | `JDG-2686` | 16 | 11 | 2 |
| `isApplied` | `isScheduleFilterApplied` | `JDG-2723` | 99 | 20 | 3 |
| **計** | | | **1,333** | | **95** |

確かめたこと:

- `targetTaskGroupId` は、どのファイルでも命令 `CM-28` の値としてだけ現れる（局所の変数は無い）—— `parentId` へ替えても、同じ場所に別の `parentId` がぶつからない。
- `isApplied` は、どのファイルでも形 `TableVisibility` のスケジュールフィルタの入切である（`table-window.ts`・`shown-tasks-hold.ts` ほか）。局所の変数 1 つ（`table-window.ts:527`）も同じ意味。
- `deleteResource` は命令 `CM-42` とその処理だけである。

## 2. 古い名を含む別の識別子 —— 1 つずつの扱い（`docs/review/cr-792-related.tsv`）

下見は、表の旧名を camelCase・`SNAKE`・`kebab` の部品の並びとして含む識別子を全部挙げる。決めていない識別子が 1 つでもあれば、段 2 の道具は書かずに止まる。**今は 0。**

| 識別子 | 含む旧名 | 件数 | ファイル | 扱い | 新 / 理由 |
| --- | --- | ---: | ---: | --- | --- |
| `hasMovedScheduleBetween` | `hasMovedSchedule` | 2 | 1 | 足す | `hasUpdatedScheduleBetween` —— 答えの欄を計算する関数 |
| `hasMovedScheduleGroup` | `hasMovedSchedule` | 4 | 1 | 足す | `hasUpdatedScheduleGroup` —— 同上 |
| `FONT_SCALE_FIELD` | `fontScale` | 3 | 1 | 足す | `FONT_SIZE_STEP_FIELD` —— `S-70` の欄の試験の引用 |
| `FONT_SCALE_SIZES` | `fontScale` | 11 | 3 | 足す | `FONT_SIZE_STEP_SIZES` —— 表 T-215 の試験の写し |
| `FONT_SCALE_STEPS` | `fontScale` | 11 | 4 | 足す | `FONT_SIZE_STEPS` —— `S-70` の S／M／L の段 |
| `FontScale` | `fontScale` | 6 | 2 | 足す | `FontSizeStep` —— `S-70` の値の型 |
| `fontScaleEdited` | `fontScale` | 2 | 1 | 足す | `fontSizeStepEdited` —— `CM-62` の処理 |
| `fontScaleSizes` | `fontScale` | 88 | 33 | 足す | `fontSizeStepSizes` —— 表 T-215 の鍵（`JDG-2682` が名指す） |
| `nextFontScale` | `fontScale` | 2 | 1 | 足す | `nextFontSizeStep` —— 次の段 |
| `thinFontScale` | `fontScale` | 9 | 7 | **残す** | `K-9`（`S-9`）は本当の倍率（細い行の文字の比）—— Scale が倍率を指すことこそ、`fontScale` を変えた理由（名の調べ N-3） |
| `EDIT_GROUP_LANDS_ON_CHOSEN_TASK_GROUP` | `editGroup` | 4 | 1 | 足す | `EDIT_PERMISSION_LANDS_ON_CHOSEN_TASK_GROUP` —— 試験の条項 |
| `EDIT_GROUP_NAME` | `editGroup` | 2 | 1 | 足す | `EDIT_PERMISSION_NAME` —— 試験の値 |
| `editGroupOnTaskGroupOne` | `editGroup` | 2 | 1 | 足す | `editPermissionOnTaskGroupOne` —— 試験の切り替え |

足す 12 の件数は計 119（手で直すファイル）。1 節と合わせて **1,452** か所を、識別子まるごとで替える。

## 3. 語が一般的な名 —— 原稿の場所でだけ替える（`how = sites`）

`uid`（11,700 字句）・`id`（9,307）・`row`（14,347）・`element`（1,624）・`visible`（497）・`tables`（547）は、文字で替えると別の意味の何千か所に触れる。**原稿の場所だけを替え、型を原稿から作り直し（`npm run gen` —— 命令の型は `tools/generate_document_commands.py` が `src/use-case/edit-document/*.ts` へ刷る）、`tsc` が赤にした使い道を 1 つずつ直す。**

| 旧 | 新 | 裁定 | 原稿の場所 |
| --- | --- | --- | --- |
| `uid`（タスク） | `taskUid` | `JDG-2685` | `CM-7`・`CM-9`〜`CM-24`（17 命令、鍵 `AT-24`） |
| `uid`（担当） | `resourceUid` | `JDG-2685` | `CM-41`（鍵 `AT-85`） |
| `uids` | `resourceUids` | `JDG-2685` | `CM-42`（鍵 `AT-85`） |
| `id`（コメントボックス） | `commentBoxId` | `JDG-2685` | `CM-46`〜`CM-51`・`CM-80`〜`CM-84`・`CM-100`（12 命令） |
| `id`（ハイライトボックス） | `highlightBoxId` | `JDG-2685` | `CM-52`〜`CM-55`・`CM-77`〜`CM-79`・`CM-101`（8 命令） |
| `row`（判別の鍵） | `state` | `JDG-2684` | 形 `PlanActualPlacement`（`CM-13`） |
| 値 `PA-1`〜`PA-5` | 語（3.1 節） | `JDG-2684` | 形 `PlanActualPlacement` の `tag` |
| 値 `GA-5`・`GA-6`・`GA-17`・`GA-21`・`GA-22` | 語（3.1 節） | `JDG-2684` | `CM-14` の `grabbed`（名は今のまま） |
| `element` ／ `visible` | `setting` ／ `isVisible` | `JDG-2686` | `CM-58` |
| `tables` | `filteringTables` | `JDG-2687` | 表 T-400 の `AV-8`（`AgentShownTasks`） |
| `hiddenKeys` | `hiddenTaskUids`（検索の表・遅延診断の表）／ `hiddenResourceUids`（担当リストの表だけ） | `JDG-2724` | 形 `TableVisibility`（`CM-92`）—— 1 つの値を 2 つに分ける。担当リストだけの値は、同じ形の `isUnassignedHidden` が先例 |

命令の数: タスク 17・担当 2（`CM-42` の `uids` を含む）・コメントボックス 12・ハイライトボックス 8 の計 39 命令 —— `JDG-2685` の数と同じ（`document-commands.json` の各行の `values` の名と `key` の列の実体で数えた）。

### 3.1 値の語の案（⚠️ 利用者に見せる）

`PlanActualPlacement`（予実を置く値）—— 推す案は画面の語（表 T-019 の行、辞書の `planActualStates`）に寄せる。`JDG-2684` が仮に示した語も並べる。

| 旧 | 画面の語 ja / en | ⭐ 推す語 | `JDG-2684` の仮の語 |
| --- | --- | --- | --- |
| `PA-1` | 未着手 / Not started | `notStarted` | `notStarted` |
| `PA-2` | 進行中 / In progress | `inProgress` | `inProgress` |
| `PA-3` | 中断・再開予定あり / Stopped, resume date set | `stoppedWithResumeDate` | `suspendedWithResume` |
| `PA-4` | 中断・再開日未定 / Stopped, no resume date | `stoppedWithoutResumeDate` | `suspendedResumeUnknown` |
| `PA-5` | 完了 / Finished | `finished` | `completed` |

推す理由: 画面の語と同じ語で読め（`JDG-820`）、保存の列 `stop`・`actualFinish`（MSPDI の名）とも語が合う。

`grabbed`（実績を始める掴み代、表 T-266）:

| 旧 | 表 T-266 の行 | 推す語 |
| --- | --- | --- |
| `GA-5` | 棒（`===`）のダミーの開始 | `barDummyStart` |
| `GA-6` | 棒のダミーの終了 | `barDummyFinish` |
| `GA-17` | マイルストーン（◆）のダミー | `milestoneDummy` |
| `GA-21` | 矢（`--->`、未着手）のダミーの開始 | `arrowDummyStart` |
| `GA-22` | 矢のダミーの終了 | `arrowDummyFinish` |

## 4. 図の外の在りか —— 手で直すファイルの群ごとの件数

段 0 の図は JSON の原稿どうしの関係だけを描く。改名は次の群にも及ぶ（1 節と 2 節の名の、群ごとの件数）。

| 群 | 件数 | 主な名 |
| --- | ---: | --- |
| `docs/spec/_source/*.schema.json`（手書きの契約） | 13 | `fontScale`（`settings.schema.json`）・`editGroup`・`scrollDayOffset` |
| `docs/spec/_source/image-to-grs-json-prompt.en.md`・`.ja.md` | 21 | `editGroup` 7・`fontScale`・`scrollDayOffset` |
| `docs/spec/_assets/tbl-glossary.md`（表 T-104 の鍵の写し） | 7 | `K-85`・`K-120`・`K-121`・`K-140` の鍵、`fontScaleSizes` |
| `tools/`（生成器ほか） | 10 | `generate_entity_types.py` の `fontScale`・`generate_startup_template.py` の `editGroup`・`parentProgressToleranceDays` |
| `sample-schedule/` | 104 | `editGroup` 100 —— 生成器のある見本は作り直し、ほかは道具が直す |
| `src/`（手） | 469 | |
| `tests/` | 730 | |
| `docs/spec/`（手、上の 3 群を除かない） | 112 | |
| 規則・ガイド・検査 | 27 | |

⚠️ 記録として古い名を引くファイルは替えない: 検査 84 の許可リストと検査 83・84・`source_refs.py` の説明（`cr792_rename.py` の `SKIP`）、`change-request/`・`docs/development-records/`・`previous-project-result/`。

## 5. 段 2 の手順（当てる —— 調整役が利用者に下見を見せた後）

1. `cr792_rename.py` に `--apply` を足す（下見と同じ字句の読みで、`whole` の 14 と 2 節の 12 だけを書く。決めていない識別子が 1 つでもあれば書かない。行末の CRLF を数えて前後で比べる）。
2. 原稿の場所（3 節）を手で直す —— `document-commands.json`・`agent-api-members.json`、値の語（3.1 節は利用者が見た語で）。
3. `npm run gen` → `tsc` の赤を、3 節の名の使い道として 1 つずつ直す。
4. 版を上げる: GRS JSON の形（`FR-073`、`schemaVersion` の刻、`grs-json-changes.json` に改名の行）—— 保存の鍵が変わる 6 件（`scrollDayOffset`・`scrollGroupOffset`・`fontScale`・`sourceProjectUid`・`parentProgressToleranceDays`・`editGroup`）。`AGENT_API_VERSION` 5 → 6（命令と API の名）。旧い形の読み替えは作らない（公開前、利用者の指示 2026-09-26）。見本とひな形は生成器で作り直す。
5. 検査 84 の許可リストの後始末: 古くなる 8 行を消す（`CM-28`・`CM-42`・`K-85`・`K-140`・`PR-33`・`isApplied`・`hiddenKeys` の 2）。`K-120`・`K-121` の 2 行は、新しい名でも画面の語と合わないので新しい名で書き直す（理由は `JDG-2681`）。`CM-46`・`CM-52` の 2 行（`commentBoxId`・`highlightBoxId` ↔ 列 `id`、`JDG-2685`）を足す。
6. 裁定の行の状態: `JDG-2680`〜`JDG-2690` の「調整役が組む改名の CR が当てる」を「適用済 —— `CR-792`」へ。`JDG-2723`・`JDG-2724` も同じ。
7. 数え直す: `--survey` の旧名の件数が 0（`thinFontScale` だけが残る）、新名の件数が下見の件数と同じ。検査 83・84、`tsc`、`check.sh`、単体と契約の試験。

## 6. 数

- 識別子まるごと: 14 の旧名 1,333 か所 ＋ 足す 12 の 119 か所 ＝ **1,452**（いちばん多いのは `editGroup` の 440 か所・93 ファイル）。生成物 95 か所は作り直しで追う。
- 判断が要った識別子: 古い名を含む 13 —— 足す 12・残す 1。語が一般的で原稿の場所に限る名: 9 行（3 節）。
- 測り方: `PYTHONIOENCODING=utf-8 python tools/rename/cr792_rename.py --survey`（終了コードは、決めていない識別子があれば 1）。群ごとの件数（4 節）は同じ読みを群で分けた。
