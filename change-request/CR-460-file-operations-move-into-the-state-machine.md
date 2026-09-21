# CR-460 — ファイル操作と問いを状態機械へ移す（段 7 の第 4 領域）

> ⭐ **状態: 波 A を当てた（2026-09-21、ブランチ `sm-fileflow-a`、`d54f5ec1` の上）。波 B ・ 波 C は当てていない。**
> ⭐ 当てた体が草案から変えたところは、末尾の改訂の記録の 2 以降に並べた。第 0 〜 10 節と付録は草案の文のまま残した —— 当てた形の全数は 表 T-290 が持つ。
> 読んだ木: `d54f5ec1`（ブランチ `refactor`）。作業木の変更は `docs/development-records/measurements/stats.jsonl` の 1 つだけで、本書が引く `src/` と `docs/spec/` は動いていない（`git status --short`）。**本書の行番号と数は、断りが無いかぎりこの木で 2026-09-21 に自分で測ったものである。**
> 型板は `CR-450`（最新の形 —— 出来事は領域に 1 度、機械ごとの升目の遷移表、R4.4 の名前、通し番号なし）と `CR-440`。
> 名前の規則は `docs/development-rules/07-review-standards.md` の「状態機械（State Machine）」の節（`:296`〜`:343`）と R4.4（`:605`）に従う。原稿の形は `docs/spec/_source/state-machines.schema.json` と、生成器 `docs/spec/_source/state_machines_json_to_md.py` の `load()` が拒むもの（`:26`〜`:52`）に従う。
>
> **閉じるもの**:
> - 計画の記録 4 の移す順の 4 番目「ファイル操作と問いの待ち」（`docs/development-records/refactor-plan-report-2026-09-13.md:251`。領域の例 `asking` `openChoosing` `mergeChoosing` `isFileOperationWaiting` は `:236`）。
> - 棚卸しの記録 4 の「同じ 3 項のガードが 5 か所に写してある（`OP-8`）」（`refactor-stage1-state-inventory-2026-09-13.md:228` ・ `:259`）を、表の 1 つの列へ畳むこと。
> - 棚卸しの記録 4 の「ファイル側の関数が `screenState` を書く（領域をまたぐ書き込み）」（同 `:227`）を、副作用と出来事へ置き換えること。
>
> **識別子**（規則 02 の 2.5。起草時に `d54f5ec1` で測り、波 A を当てる直前の 2026-09-21 に同じ木で測り直した）:
> - 番号の帯（本巡の依頼が配った）: **表 `T-290`、図 `F-036`**（本セッションの帯は `F-035` 〜 `F-039`）、ユニット `UF-89`。`T-283` は `CR-436` の波 B2 の持ち物なので取らなかった。
> - 当てる直前、`docs/spec` が見出しで定義していた表の番号の上端は `T-289`、図は `F-035` だった（`grep -ohE "\*\*表 T-[0-9]+[a-z]? —"` ・ 図も同じ）。`T-290` ・ `F-036` を `docs` ・ `change-request` ・ `src` ・ `tests` ・ `tools` ・ `.claude` で `git grep -w` して当たったのは `CR-450:17` の起草時の記述 1 件だけ、`UF-89` は 0 件だった。⇒ 波 A がこの 3 つを取った。
> - 表 T-075 は当てる前 85 行（`grep -c "^| UF-" docs/spec/05-07-design.md`、`SU-3` も 85）、上端は `UF-88` だった。波 A の後は 86 行（`SU-3` も 86）。
> - 名の重なり（`git grep -nw`、`src` ・ `tests` ・ `docs` ・ `tools` ・ `.claude` ・ `change-request`）は当てる直前に 0 件だった: `file-flow-values`、`fileOperationStateMachine`、`confirmationStateMachine`、`flowSurfaceAnswered`。
> - 行 ID の接頭辞の登録簿は 160 件（`git grep -c '"prefix"' -- docs/spec/_source/row-id-prefixes.json`、当てた後も同じ）。**本書は新しい接頭辞を登録しない。** 要求 ID も立てない。状態・出来事・遷移に通し番号を振らない（`JDG-286`）。
> - 台帳の上端は当てる直前に `DFC-688`（`docs/development-records/` の全ファイルを `DFC-` で引いた）だった。波 A が `DFC-689` 〜 `DFC-691` を足した。`PND-500` ・ `JDG-288` は動かしていない。変更要求のファイルの上端は `CR-450` だった。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **波 A はどの `CH-` も直接には前へ進めない —— 基盤の作業である。** 利用者に見える振る舞いを 1 つも変えない（波 A では画面がこの領域を呼ばない）。
⭐ 波 B（結線）も振る舞いを変えない（`JDG-57`、`rulings.md:134`）。第 8 節の台帳の候補を直すのは、移して一致を確かめた後の別のコミットである。

守るもの:
- **`OP-8`（req:5575）「取込または別の開く操作が進行中のあいだは受け付けない」** —— いまは同じ 3 項のガード `isFileOperationWaiting || asking !== null || openChoosing !== null` が 5 か所に写してある（`frame-loop.ts:3398` ・ `:3684` ・ `:3825` ・ `:3870` ・ `:3881`）。移した後は、機械 `fileOperationStateMachine` の `idle` 以外の列と、`{in: confirmationStateMachine.questionAsked}` のガードが 1 か所で持つ。
- **`CS-4`（des:626）「人の応答を待つ 1 回のファイル操作は、操作を始めた時点の値で行う」** —— 待ちのあいだ集約が持つのは「いまどこで待っているか」だけで、始めた時点の文書（読んだ文書・捨てる文書）はシェルの操作の文脈に残す（`SF-10` des:1014）。
- **`NT-7`（req:6397）の「問いが立っているあいだ `y` / `n` をほかの何にも渡さない」** —— 立っているかは `confirmationStateMachine.questionAsked` が 1 つで持つ。順（`NT-8` の次、`IN-4` ・ `SK-19` より先）は `CR-436` の波 B2 の `T-283` の行へ申し送る（第 2.2 節）。
- **`GL-003`** —— この領域の出来事は人の操作と宿主の返事だけで、ポインタの移動では 1 つも作らない（`SF-5` des:1009）。性能は `LM-19`（表 T-285 の `RA-8` des:1121）。**測る前に利用者を呼ぶ**（`RISK-001` の門）。

### ② レビュー観点のどの条項を当て、何が出たか

（`docs/development-rules/07-review-standards.md`）

- **`R2` 命名 / R4.4** —— 領域のキー `fileFlow`、ファイル `file-flow-values.ts`、型の幹 `FileFlowValues`（決定 2）。機械 2 つは名詞句 ＋ `StateMachine`、全領域の 16 の機械名と重ならない（原稿を読んで照合、2026-09-21）。状態は形容詞（`idle`）・過去分詞（`notAsked` ・ `questionAsked`）・現在分詞 ＋ 目的語（`readingDocumentFile` ほか）。出来事 16 はすべて主語 ＋ 過去形で、既存 40 のキー（画面の値 30 ・通知 5 ・身振り 5）と重なり 0。
- **`R2.2`（SRP）** —— 新しいユニットは 1 つ。変更の理由はこの領域の升目だけ。
- **`R4` レースコンディション** —— いまは `await` をまたいで `let` を読み書きする（`openDocumentIntoHold` の `:3317` の `await askHowToOpen()`、`:3321` の `await askToDiscardCurrentDocument`、`:3345` の `await askWhichFileToTakeFrom`）。移した後は、待ちの結果が出来事として 1 段ずつ届き、機械の状態は原子的に進む（`SF-6` des:1010）。⭐ 古い結果（例: 面を閉じた後に届いた答え）は升目が空なので同じ参照が返る。
- **`R7.1` / `R7.2` / `R7.9`** —— 遷移は `pure`。読む・書く・取り込む・面を立てるのはシェルが副作用として実行する。
- **`SF-10`（des:1014）** —— 読んだ文書は集約に入れない（決定 5）。

### ③ 利用者に問うこと・**問わずに決めた**こと

**問うこと**: ⭐ **なし（0 件）。** 候補 8 つに打った 3 つの反証は第 5 節に残した。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | **3 つの波に割る**（第 3 節）: 波 A はいま当ててよい。波 B（シェルへの結線）は段 5・段 6 と `CR-436` の波 B2 を待つ。波 C は台帳の候補を直す別のコミット | `CR-450` の決定 1、`handoff-state-machine.md:100`「次の領域 表 T-285 の手順で足す（… ファイル操作 → ポインタ → …）」 |
| 決定 2 | **領域のキーは `fileFlow`、名は「ファイル操作と問い」、ファイルは `file-flow-values.ts`、型の幹は `FileFlowValues`** | 画面の値の原稿が既にこの領域を「Flow」と呼ぶ —— 出来事 `screen/surfaceRaisedByFlow`（原稿 `state-machines.json:150`、注「ファイルの領域が面を立てる」）と副作用 `tellFlowSurfaceClosed`（`:1161` ・ `:1175`）。`screen-values.ts` ／ `notice-values.ts` ／ `gesture-values.ts` と同じ形 |
| 決定 3 | **問い（`U-55` の `Confirmation`）をこの領域に入れ、機械 `confirmationStateMachine`（`notAsked` ／ `questionAsked`）とする。** 行の削除（`QN-1` ・ `QN-2`）・担当者の削除（`QN-3`）・新しく始める（`FR-095` の `QN-5`）の問いも同じ機械が持つ | 計画が `asking` をこの領域の例に挙げる（`refactor-plan-report-2026-09-13.md:236`）。`OP-8` の拒否は「問いが立っている」ことを読む（いまの 3 項のガードの 2 項目）—— ガードの `{in: …}` は同じ領域のほかの機械しか指せない（`state_machines_json_to_md.py:34`）。問いは 1 つしか立たない（`asking` は 1 つ、`frame-loop.ts:1894`） |
| 決定 4 | **ファイル操作は機械 `fileOperationStateMachine` の平らな 7 種類とする**（`idle` ・ `readingDocumentFile` ・ `awaitingOpenChoice` ・ `awaitingDiscardAnswer` ・ `importingDocument` ・ `awaitingMergeMapping` ・ `writingDocumentFile`）。⭐ **入れ子（`operating.*`）にしない** | 要求が名指す待ちは `OP-8` の「進行中」、`OP-3` の選ばせる面（`U-56`）、`OP-4` の確認、`FR-022` の差分の確認（`U-61`）、`CS-4` の書き出し。⚠️ 入れ子にすれば `OP-8` の拒否の升を親 1 つに畳めるが、親への自己遷移（拒否して「そのまま」）が子を初期へ戻すかを原稿が決めていない —— 前例 0 件（原稿の全升を走査、2026-09-21）。平らにして 6 列に同じ升を書く |
| 決定 5 | **読んだ文書・捨てる文書・答えを待つ継続（`settle` ・ `Promise` の解決子）は集約に入れず、シェルの操作の文脈に残す** | `SF-10`（des:1014）、`CS-4`（des:626）、`SF-6`（des:1010「結果は出来事として戻す」）。前例 `CR-450` の決定 8（取り消しの把手はシェル） |
| 決定 6 | **面を立てるのは副作用 `raiseFlowSurface`（引数 `U-56` ／ `U-61` ／ `U-62`）で、シェルが既存の `screen/surfaceRaisedByFlow` に変えて戻す。人が面を閉じたら、画面の値の副作用 `tellFlowSurfaceClosed` をシェルが `fileFlow/flowSurfaceClosed` に変えて戻す** | `SF-6`、`SF-8`（des:1012）、`SS-5`（des:1103、根は出来事を 1 つの領域にしか渡さない）。受け口は画面の値の原稿に既に在る（`state-machines.json:1143`〜`:1178`）—— いまの直の書き込み `frame-loop.ts:3158` ・ `:3176` ・ `:3213` を置き換える |
| 決定 7 | **面の上の答えの入口（`IC-71` 〜 `IC-73` ・ `IC-95` 〜 `IC-97`）を押したら、呼び手が 2 つの出来事を作る —— `fileFlow/openChoiceAnswered`（または `mergeMappingAnswered`）と、画面の値に足す新しい出来事 `screen/flowSurfaceAnswered`。** 後者は `openSurfaceStateMachine` の `open` → `closed` の 1 升（副作用なし —— `tellFlowSurfaceClosed` を返さないので、答えた後に「閉じた」が戻って来ない） | いまは `answerSettledEntry` が面を直に閉じる（`frame-loop.ts:3653` ・ `:3664`）。枝 1 つに副作用は 1 つしか置けない（`state-machines.schema.json` の `branch.effect` が 1 つの識別子）ので、答えの枝の副作用（`importIncomingDocument`）と面を閉じることを 1 升に並べられない。⭐ 1 つの入力が 2 つの領域の出来事を作る前例は `CR-450` の 2.1（通知を消す入口の上で離す）。⚠️ **画面の値の原稿に 1 出来事 ・ 1 升を足す** —— `CR-436` の持ち物に触るので第 9 節で申し送る。覆すなら、副作用 `lowerFlowSurface` を足し、答えの続きを別の出来事へ割る形になる（升が増える） |
| 決定 8 | **`OP-8` の拒否は、始める出来事（開く・書き出す）を `idle` 以外の全列で `→ 同じ種類 / raiseNotice(RS-27)` とし、`idle` でも問いが立っていれば同じ通知とする** | いまの 5 か所の枝は `raiseNotice(NOTHING_TO_DO_REASON, null)`（`frame-loop.ts:3826` ・ `:3871` ・ `:3882` ・ `:3685`）、`NOTHING_TO_DO_REASON` は `RS-27`（`:946`、req:6438「押した入口が、いま行えることを持たない」）。⚠️ Agent API の取り込みだけは通知を出さずに `false` を返す（`:3398`）—— 別の出来事 `agentDocumentHanded` とし、`idle` 以外の升を空（同じ参照）にして、呼び手が「変わらなかった」を拒否として返す |
| 決定 9 | **`openedFileName` と `droppedTaskNames` は領域の根が運ぶ値とする**（根の遷移で書き換える）。**`fileSavedAt` と `hasUnsavedEdits` はこの領域に入れない** | 根が運ぶ値と、値だけを書き換える根の升は原稿の形が認める（`state-machines.schema.json` の `root`、前例は画面の値の `language` ・ `rememberedActuals` —— 原稿 `:33`〜`:69`）。`fileSavedAt` は `FR-101` が文書の `AT-140`（`documentStamp.fileSavedUtc`、`fig-erd-detail.md:441`）に置くと定める（req:5681）ので文書の値（`SF-10`）。`hasUnsavedEdits` は受け付けた書き込みのたびに動く（`writeDocument` の `:3093`、`replaceHeldDocument` の `:3118`）ので「文書と現在値の芯」の値。保存の結果で下ろす（`:3438`）のは、副作用の実行（シェル）が行う |
| 決定 10 | **`U-61` の組（`mergeChoosing` ＋ `mergeCandidates`）は、状態 `awaitingMergeMapping` 1 つとその運ぶ値 `mergeCandidates` ・ `unreadColumns` とする。`FR-101` の組（`openedFileName` ＋ `fileSavedAt`）は、根の運ぶ値 `openedFileName` と文書の `AT-140` に割る** | 棚卸しの記録 5 の注（`refactor-stage1-state-inventory-2026-09-13.md:252`「状態 1 つに運ぶ値 2 つの形になる」）。`FR-101` の側は 2 つの置き場が要求の上で既に分かれている（決定 9） |
| 決定 11 | **原稿は仕様どおりに書き、波 A のユニットも原稿どおりに書く。いまの振る舞いとの差は、波 B でシェルが「何を出来事に詰めるか」で写し、直すのは波 C** | 波 A では画面がこのユニットを呼ばないので、ユニットを仕様どおりに書いても振る舞いは変わらない。差は表の升ではなく、シェルが詰める値と出来事にある（例: Agent API の取り込みはいま `OP-3` を問わず合流に決め打つ —— `frame-loop.ts:3408`。波 B ではシェルが `openChoiceAnswered{merge}` を自分で作って写す）。⚠️ `CR-450` はユニットで写し、契約試験に期待どおりの失敗を留めた —— あちらの差はガードの式（コードが持つ、`SD-3`）だったからである。本書の差は升の外に在る |
| 決定 12 | **`hasUnsavedEdits` ・ `fileSavedAt` の扱いと、書き出し形式を選んだ後の `U-54` の閉じ方（`PND-448`）には、波 A で触らない** | それぞれ別の領域・未裁定の行の持ち物（決定 9、`pending-decisions.md:311`） |
| 決定 13 | **表 T-075 の新しい行 `UF-89` の「負う要求」は `—`** | `CR-440` の決定 11 ・ `CR-450` の決定 11 と同じ理由。波 A では画面がこのユニットを呼ばない |
| 決定 14 | 識別子: 表 `T-290` 1 つ（この領域の出来事と 2 つの機械の遷移表）、図 `F-036` 1 つ（状態遷移）、`UF-89` | 前に立つ者の依頼（領域につき表 1 つ・図 1 つ） |

---

## 1. 測った事実（`d54f5ec1`、2026-09-21）

| 数 | 値 | 測り方 |
|---|---|---|
| `frameLoop` の範囲 | 1799〜4414 行 | `grep -nE "^(export )?(async )?function frameLoop"` と、その後の最初の `^}`（`awk 'NR>1799 && /^}/'`） |
| `frameLoop` が直に持つ `let` | 66（うちこの領域の候補 10） | `sed -n '1799,4414p' … \| grep -c "^  let "`。候補 10 は第 2 節の 1〜10 行 |
| 棚卸しとの差 | 棚卸しは `let` 10 ＋ モジュールの 1（`deliveredAppShellHtml`）＝ 11（`refactor-stage1-state-inventory-2026-09-13.md:201`）。**ファイル置き場の閉包の `let` 3 つ（`file-system-access-file-store.ts:232` ・ `:234` ・ `:241`）を棚卸しは数えていない** —— 棚卸しの C 節・D 節は `boot` と `domScreenSurface` の閉包だけを数えた（同 `:19`〜`:20`） | 名前で照合 |
| 同じ 3 項のガード | 5 か所（`:3398` ・ `:3684` ・ `:3825` ・ `:3870` ・ `:3881`）—— 棚卸しの 5 か所（`:259`）と数が一致 | `grep -n "isFileOperationWaiting \|\| asking"` |
| ファイル側が `screenState` を直に書く所 | 5（開く面を立てる `:3158`、差分の確認を立てる `:3176`、取り込みの報告を立てる `:3213`、答えて閉じる `:3653` ・ `:3664`）＋ 書き出しの面を閉じる `:3678`（`PND-448`） | `grep -n "screenStateWithSurface(screenState"` |
| 表 T-075 の行 | 85（`SU-3`、`05-07-design.md:245`） | `tests/contract/units.contract.test.ts:50`〜`:51` も 85 |
| `changelog.md` の版 0.29 の文 | 「`AdvanceScreenSession`（5）」 | `sed -n 47p … \| grep -oE "AdvanceScreenSession[^、。]{0,12}"` |
| 原稿の今 | 3 領域・機械 16・状態 44・出来事 40・升 88 ＋ 根の升 2 | スクラッチの `f-composite.py` で `state-machines.json` を数えた（画面の値 12 / 33 / 30 / 68、通知 2 / 4 / 5 / 6、身振り 2 / 7 / 5 / 14） |
| md-checks の最終行 | `tables=178  figures=22  rows=2224  uids=162` | 第 7 節 |

⭐ **棚卸しの行番号は古い仮説として受け、すべて測り直した**（棚卸しの `asking` は `:1543`、いまは `:1894`）。

---

## 2. 棚卸しの測り直しと分類

分類は `SF-5`（des:1009）、`SF-6`（des:1010）、`SF-10`（des:1014）と、5.5 の原稿の規則（des:724「原稿に載せるのは、要求が名指す状態・出来事・遷移だけとする（MUST）」、`:725`）を 1 つずつ当てた。
**状態** ＝ 原稿の機械の状態。**運ぶ値** ＝ 状態か根の運ぶ値。**フレームの値** ＝ シェルに残る座標・寸法・時刻。**外** ＝ この領域の状態ではない（行き先を書く）。
読み書きは `\bname\b` を `frameLoop` の範囲で行ごとに拾い、注釈の行と、同名の欄（`sessionOf` の `openedFileName: null` ほか `:2603`〜`:2628`、`decoded.unreadColumns` ほか）を除いた（スクラッチの `f-uses.py`）。

| # | 状態 | 所在（宣言） | 書き手 ／ 読み手 | 分類 | 名指す仕様の行 |
|---|---|---|---|---|---|
| 1 | `asking`（問いと `settle`） | `frame-loop.ts:1894` | 書き: `answerConfirmation`:2492、`askToWriteOverDestination`:3137、`askToDiscardCurrentDocument`:3185、`answerSettledEntry`:3638、`carryOutAction`:3787。読み: `runFrame`:2257、`answerConfirmation`:2489、`collectInputContext`:3048、`takeInHandedDocument`:3398、`answerSettledEntry`:3610 ・ 3623、`answerSettledFormat`:3684、`carryOutAction`:3782 ・ 3825 ・ 3870 ・ 3881 ・ 3893、`receiveInput`:4191 ・ 4204、公開の `isBrowserDefaultStopped`:4347 ・ 4352 | **割る**: 立っているか ⇒ **状態** `confirmationStateMachine.questionAsked`。問いの文と挙げる名前 ⇒ **運ぶ値** `question`。答えが「続ける」のときに行うこと（書き込みの束 `:3787`〜`:3796`・`:3638`〜`:3645`、新しく始める `:3202`〜`:3206`）⇒ **運ぶ値** `owedAction`。`settle` の継続（開く道・上書きの確認の `Promise`）⇒ **外**（決定 5） | `NT-7` req:6397、`U-55` glo:138、`QN-1` 〜 `QN-5` req:6488〜6492、`FR-032` req:2242、`FR-099` req:2319 |
| 2 | `openChoosing` | `frame-loop.ts:1899` | 書き: `askHowToOpen`:3152、`answerSettledEntry`:3652、`receiveInput`:4280。読み: `takeInHandedDocument`:3398、`answerSettledEntry`:3650、`answerSettledFormat`:3684、`carryOutAction`:3825 ・ 3870 ・ 3881、`receiveInput`:4278 ・ 4279 | **状態** `fileOperationStateMachine.awaitingOpenChoice`。`settle` ⇒ **外** | `OP-3` req:5567、`U-56` glo:139、`IC-71` 〜 `IC-73` glo:596〜598 |
| 3 | `mergeChoosing` | `frame-loop.ts:1904` | 書き: `askWhichFileToTakeFrom`:3169、`answerSettledEntry`:3661、`receiveInput`:4286。読み: `answerSettledEntry`:3659、`receiveInput`:4284 ・ 4285 | **状態** `fileOperationStateMachine.awaitingMergeMapping`。`settle` ⇒ **外** | `FR-022` req:5091、`U-61` glo:143、`IC-95` 〜 `IC-97` glo:604〜606、`MM-1` ・ `MM-2` ・ `MM-4` req:5133 ・ 5134 ・ 5136 |
| 4 | `mergeCandidates` | `frame-loop.ts:1908` | 書き: `askWhichFileToTakeFrom`:3175、`answerSettledEntry`:3662、`receiveInput`:4287。読み: `runFrame`:2258 | **運ぶ値** —— `awaitingMergeMapping` の `mergeCandidates` | `U-61` glo:143、`FR-022` req:5091 |
| 5 | `unreadColumns` | `frame-loop.ts:1909` | 書き: `openDocumentIntoHold`:3266、`answerSettledEntry`:3663、`receiveInput`:4288。読み: `runFrame`:2259（描き手は `U-61` の面の中でだけ読む ——`src/adapter/screen-renderer/open-modals.ts:307`〜`:314`） | **運ぶ値** —— `awaitingMergeMapping` の `unreadColumns`（いまの描き手が読む所に合わせた）。⚠️ 仕様との差は第 8 節の候補 5 | `FR-073` req:5709、`U-61` glo:143 |
| 6 | `droppedTaskNames` | `frame-loop.ts:1910` | 書き: `tellWhatTheImportDropped`:3212、`receiveInput`:4293。読み: `runFrame`:2260、`receiveInput`:4292 | **運ぶ値** —— 領域の根（決定 9） | `U-62` glo:144、`FR-023` req:5318、`RS-50` req:6459 |
| 7 | `isFileOperationWaiting` | `frame-loop.ts:1911` | 書き: `endFileOperationWait`:2322、`takeInHandedDocument`:3399、`answerSettledFormat`:3688、`carryOutAction`:3829 ・ 3874 ・ 3885。読み: 同じ 3 項のガード 5 か所 | **状態** —— `fileOperationStateMachine` が `idle` でないこと | `OP-8` req:5575、`CS-4` des:626 |
| 8 | `openedFileName` | `frame-loop.ts:1864` | 書き: `saveHeldDocumentToFile`:3435 だけ。読み: `runFrame`:2233 | **運ぶ値** —— 領域の根（決定 9）。⚠️ 開く道が書かない —— 既存の `DFC-574` | `U-58` glo:140、`FR-101` req:5675 |
| 9 | `fileSavedAt` | `frame-loop.ts:1865` | 書き: `saveHeldDocumentToFile`:3437。読み: `runFrame`:2234 | **外** —— 文書の値 `AT-140`（決定 9）。⚠️ いまは文書へ書かない —— 第 8 節の候補 2 | `FR-101` req:5681、`AT-140` fig-erd-detail.md:441、`U-59` glo:141 |
| 10 | `hasUnsavedEdits` | `frame-loop.ts:1866` | 書き: `writeDocument`:3093、`replaceHeldDocument`:3118、`saveHeldDocumentToFile`:3438。読み: 公開の `hasUnsavedEdits`:4330〜4332 → `single-html-shell.ts:484`〜`:485` の `beforeunload` | **外** —— 「文書と現在値の芯」（決定 9） | `FR-100` req:5651 |
| 11 | `deliveredAppShellHtml` | `single-html-shell.ts:65`（モジュールスコープ） | 棚卸し `:161` のとおり（起動時に 1 回） | **外** —— 起動時の定数。ファイル操作の待ちではない | 実装の都合（口は `IF-8` des:561） |
| 12 | `openedHandle` | `file-system-access-file-store.ts:232`（閉包） | 書き: `:302` ・ `:343` ・ `:360`。読み: `:312` ・ `:364` ・ `:366` ・ `:392` ・ `:397` ・ `:407` | **外** —— 宿主のファイルの把手。`openedFileName` はその写し | `IF-3` des:557、`PI-28` des:531、`OP-13` req:5578 |
| 13 | `droppedFile` | `file-system-access-file-store.ts:234`（閉包） | 書き: `:262` ・ `:328`。読み: `:327` | **外** —— 宿主のドロップの受け皿。⚠️ 読む道が `src/` に無い —— 既存の `DFC-569` | `OP-2` req:5566、`CHN-1` req:489 |
| 14 | `isBusy` | `file-system-access-file-store.ts:241`（閉包） | 書き: `:380` ・ `:386` ・ `:414` ・ `:425` ・ `:439` ・ `:481`。読み: `:379` ・ `:406` ・ `:438` | **外** —— 置き場自身の再入の止め（`:240` の TRAP）。`OP-8` を機械が守っても、置き場の契約として残す | 実装の都合 |

⇒ **見つけた覚え 14（`frameLoop` の `let` 10 ＋ モジュール 1 ＋ ファイル置き場の閉包 3）。** 状態 4（`asking` ・ `openChoosing` ・ `mergeChoosing` ・ `isFileOperationWaiting`）⇒ 機械 2 つ。運ぶ値 4（`mergeCandidates` ・ `unreadColumns` ・ `droppedTaskNames` ・ `openedFileName`）＋ `asking` から割った 2（`question` ・ `owedAction`）。フレームの値 0。外 6（`fileSavedAt` ・ `hasUnsavedEdits` ・ `deliveredAppShellHtml` ・ `openedHandle` ・ `droppedFile` ・ `isBusy`）と、`settle` の継続 3 つ。
⚠️ `openDocumentIntoHold`（`:3218`〜`:3384`）の局所の値（`current` ・ `incoming` ・ `droppedNames` ・ `importing` ほか）は `let` ではないが、`await` をまたいで生きる操作の文脈である —— 決定 5 のとおりシェルの副作用の実行に残す。

### 2.1 領域をまたぐもの（棚卸しの記録 4 を測り直した）

| 読む側 ／ 書く側 | いま | 移した後 |
|---|---|---|
| 書き込み（`carryOutAction['changeDocument']`）が問いを読む | `frame-loop.ts:3782` の `if (asking !== null) return` —— 問いが立っているあいだの書き込みを**黙って捨てる**。拒むのは `WS-2`（des:657）ではなくシェル | 呼び手が `confirmationStateMachine.questionAsked` から詰める（`CR-450` の `WS-2` と同じ筋）。⚠️ 仕様の行が無い —— 第 8 節の候補 6 |
| 担当者の削除（`IC-66`、`answerSettledEntry`）が問いを読む | `:3622`〜`:3626`、問いが立っていれば `RS-27` | 同上（選択の領域が来るまでシェルの関数のまま `questionAsked` を読む） |
| 新しく始める（`IC-98`）が問いを読む | `:3610`〜`:3613` | **この領域の升**になる（`newDocumentEntryPressed`） |
| 入力の文脈 `isSurfaceStanding` | `collectInputContext`:3048（`screenState.surface !== null \|\| asking !== null`） | `openSurfaceStateMachine.open` または `questionAsked` から詰める |
| `settleTextEntry`（`SK-19` の段） | `:3893` が `asking` を読む | 同上 |
| `Esc` の段 `'confirmation'`（`IN-4`） | `escapeTarget`（`src/entity/document-model/screen-state/screen-state.ts:131`）が面より先に答え、`receiveInput`:4219 が `answerConfirmation(false)` | 段 `'confirmation'` ⇒ 出来事 `fileFlow/confirmationAnswered{isProceeding: false}`。⇒ **`T-283` へ申し送る 1 行**（2.2） |
| `y` / `n` と `Yes` / `No` | `receiveInput`:4190〜4195、公開の `isBrowserDefaultStopped`:4352 | 出来事 `fileFlow/confirmationAnswered`。順は `NT-7` が決める ⇒ **`T-283` へ申し送る 1 行** |
| 面を立てる（領域をまたぐ書き込み） | `askHowToOpen`:3158、`askWhichFileToTakeFrom`:3176、`tellWhatTheImportDropped`:3213 | 副作用 `raiseFlowSurface` ⇒ シェルが `screen/surfaceRaisedByFlow`（決定 6） |
| 答えて面を閉じる（領域をまたぐ書き込み） | `answerSettledEntry`:3653 ・ 3664 | 呼び手が `screen/flowSurfaceAnswered`（新、決定 7） |
| 人が面を閉じたら待ちを捨てる | `receiveInput`:4278〜4294（`openChoosing` ・ `mergeChoosing` ・ `droppedTaskNames` を片付ける） | 画面の値の `tellFlowSurfaceClosed` ⇒ シェルが `fileFlow/flowSurfaceClosed` |
| 書き出しの形式を選んで `U-54` を閉じる | `answerSettledFormat`:3678（`PND-448` の STOP `:3674`〜`:3675`） | ⛔ 波 A では触らない（決定 12）。波 B でいまのとおり閉じる出来事を画面の値へ送る —— `PND-448` の裁定を待つ |
| 上書きの確認（`DI-4`）は書き出しの途中で立つ | `saveDocumentFile` の `confirmOverwrite`（`src/adapter/file-gateway/file-gateway.ts:217`）を `askToWriteOverDestination`（`frame-loop.ts:3561`）が受ける | 副作用の結果 `fileFlow/overwriteQuestionRaised`。答えは副作用 `answerOverwriteQuestion` が置き場の待ちを解く |
| ヘッダーの入口を待ちのあいだ薄くする | 掛かっていない —— 既存の `DFC-567` | 描き手が `fileOperationStateMachine` を読めるようになる（直すのは波 C） |

### 2.2 `CR-436` の波 B2 の `T-283` へ申し送る行（⛔ 本書は `T-283` を取らない）

| 奪い合う入力 | 段の状態のキー | この領域の出来事 | 順を決めた行 |
|---|---|---|---|
| `y` / `n` の打鍵 | `confirmationStateMachine.questionAsked` | `fileFlow/confirmationAnswered` | `NT-7` req:6397（`NT-8` の次、`IN-4` と `SK-19` より先） |
| `Esc`（段 `'confirmation'`） | `confirmationStateMachine.questionAsked` | `fileFlow/confirmationAnswered{isProceeding: false}` | `IN-4` req:6804（「開いている面」の段。いまのコードは面の段より 1 つ上に独立の段を置く ——`screen-state.ts:131`〜`:132`） |
| `Esc`（段 `'surface'`、面が `U-56` ／ `U-61` ／ `U-62`） | `openSurfaceStateMachine.open` | 画面の値の `escapePressed` → 副作用 `tellFlowSurfaceClosed` → `fileFlow/flowSurfaceClosed` | `IN-4` req:6804 |

---

## 3. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A** | なし（いま当ててよい）。⚠️ 画面の値の原稿に 1 出来事を足すので、同じ日に `CR-436` の波 B2 を当てる者がいれば順を合わせる | `docs/spec/_source/state-machines.json`（領域 `fileFlow` と、画面の値の `flowSurfaceAnswered` ＋ 1 升）、生成物 `docs/spec/_assets/tbl-state-machines.md`（表 T-290 ・図 F-036、表 T-280 の 1 行）、`src/use-case/advance-screen-session/file-flow-values.ts`（新）、`screen-values.ts`（生成区画と `flowSurfaceAnswered` の 1 関数）、`advance-screen-session.ts`（根への合成、`RA-5`）、`docs/spec/05-07-design.md`（5.5 の 1 文、`CP-39`、`UT-11`、`PI-39`、`SU-3`、`UF-89`、図 F-028、`SS-6`）、`tests/contract/state-machine-file-flow.contract.test.ts`（新。仕様だけを読む別の体 ——`RA-6`）、`tests/contract/state-machine-screen-values.contract.test.ts`（新しい出来事の行。同じ別の体）、`tests/unit/uf-89-the-file-flow-transition-table-is-printed-from-the-manuscript.test.ts`、`.claude/skills/spec-graph-check/check-provenance.py` の 1 行（`:51` の `gesture-values.ts` の次）、`tests/contract/units.contract.test.ts` の数、`changelog.md` の版 0.29 の数、`docs/development-rules/03-implementation.md` の生成定数の一覧 | 18 ・ 19 ・ 21 ・ 26b ・ 27 ・ 30 ・ 33 ・ 59 ・ 60 ・ 61 ・ 62 ＋ vitest（`CR-450` の 3 節と同じ組） |
| **B** | 段 5 と段 6 が済み、`CR-436` の波 B2 が当たっている（根がシェルに結線され、`T-283` が在る）。`CR-440` の波 B1 ・ `CR-450` の波 B と前後してよい（重なるのは `receiveInput` の `Esc` と答えの枝だけで、順は 2.2 の表） | `frame-loop.ts`: `let` 8 つ（第 2 節の 1〜8）を根の `fileFlow` へ置き換える、5 か所のガードを消して出来事にする、`askHowToOpen` ・ `askWhichFileToTakeFrom` ・ `askToDiscardCurrentDocument` ・ `askToWriteOverDestination` ・ `tellWhatTheImportDropped`（`:3135`〜`:3214`）と `openDocumentIntoHold`（`:3218`〜`:3384`）を副作用の実行と結果の出来事へ割る、`answerSettledEntry` の 4 枝（`:3609`〜`:3667`）と `receiveInput`:4190〜4195 ・ `:4219` ・ `:4278`〜`:4294` を出来事へ、`carryOutAction` の 3 枝（`:3822`〜`:3888`）と `takeInHandedDocument`（`:3397`〜`:3413`）と `answerSettledFormat`（`:3673`〜`:3690`）を出来事へ。**いまの振る舞いを写す詰め方**（決定 11）: Agent API の取り込みはシェルが `openChoiceAnswered{merge}` を自分で作る（`:3408`）、`documentOpenLanded` の `openedFileName` は `null` を詰める（`DFC-574`）、待ちの終わりの出来事は拒否でも `finally` で送る（いまの `.finally(endFileOperationWait)`、`PND-187` は決めない）。`T-283` の 3 行 | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部、`LM-19`（⛔ **利用者を呼んでから**） |
| **C**（B の直後の別のコミット） | 波 B で一致を確かめた後（`JDG-57`） | 第 8 節の候補のうち、台帳で直すと決まったもの（`DFC-574` ・ `DFC-614`/`JDG-130` ・ `DFC-569` ・ `DFC-567` ほか） | 同上 |

⭐ **波 A は段 5・段 6 と並行してよい** —— 触るのは `docs/spec/`、`src/use-case/advance-screen-session/`、新しい試験、規則と検査の名簿だけで、相手の持ち場（`src/adapter/` ・ `src/framework/`）と重ならない。
⭐ **波 B で `frameLoop` の `let` は 66 → 58 の見込み**（8 つが根へ移る。`fileSavedAt` と `hasUnsavedEdits` は残る —— 決定 9 ・ 12）。⛔ 波 B の入口で測り直す。
⚠️ **モジュールスコープの状態は動かさない** —— この領域の覚えのうちモジュールスコープは `deliveredAppShellHtml`（外）だけ。
⚠️ **性能** —— この領域の出来事は人の操作と宿主の返事だけで、1 フレームの仕事は変わらない見込み。測るのは波 B、`LM-19` の手順。⛔ **測る前に利用者を呼ぶ。**

### 3.1 波 A の中身

| 対象 | いま | 案 |
|---|---|---|
| **原稿** `state-machines.json` | 領域 `screen` ・ `notices` ・ `gesture` | 領域 `fileFlow` を足す: 名 `{ja: ファイル操作と問い}`、ユニット `src/use-case/advance-screen-session/file-flow-values.ts`、型の幹 `FileFlowValues`、表 `T-290`（ファイル操作と問いの状態機械）、図 `F-036`（ファイル操作と問いの状態遷移）。中身は付録（出来事 16、機械 2、状態 9、升 38、根の升 3）。＋ 画面の値の `events` に `flowSurfaceAnswered`、`openSurfaceStateMachine` に 1 升（付録 D） |
| **生成物** `_assets/tbl-state-machines.md` | 3 領域 | ＋ 節「ファイル操作と問い（`fileFlow`）」: **表 T-290**、**図 F-036**。表 T-280 に 1 行。`npm run gen` |
| **5.5 の散文**（`05-07-design.md:741` の次） | 第 1 〜 3 領域の 3 文 | 1 文を足す: 「第 4 領域（ファイル操作と問い）のそれらを同じファイルの 表 T-290 に、状態遷移を 図 F-036 に示す。」（⛔ 変更要求の番号を仕様に書かない —— 検査 7） |
| 表 T-062 `CP-39`（`:144`） | 正「… / 表 T-286 / 表 T-289」 | ＋「/ 表 T-290」 |
| 表 T-063 `UT-11`（`:337`） | 「（いまは `screen-values.ts` ／ `notice-values.ts` ／ `gesture-values.ts`）」 | ＋「／ `file-flow-values.ts`」と、表の番号の括弧に 表 T-290（`RA-4`） |
| 表 T-064 `PI-39`（`:541`） | 「いまは画面の値・通知・身振りの 3 領域」 | 「画面の値・通知・身振り・ファイル操作と問いの 4 領域」、出来事・副作用・初期の欄に 表 T-290（`RA-5`） |
| 表 T-284 `SS-6`（`:1104`） | 「表 T-280 ・ 表 T-286 ・ 表 T-289 の状態の一覧の初期」 | ＋「表 T-290」 |
| 図 F-028 と前文 | 3 領域 | 実線の「領域 fileFlow<br>ファイル操作と問い（表 T-290）」と「領域 fileFlow は同じ参照」の 1 本を足す（`CR-450` と同じ） |
| 表 T-075 に `UF-89` | 85 行（`UF-88` は `:458`） | `UF-89` ／ `AdvanceScreenSession` ／ `file-flow-values.ts` ／ `pure` ／ 「ファイル操作と問いの領域の遷移（表 T-290）と、そこから生成した型と遷移表の定数の区画」／ `—`（決定 13）。`UF-88` の後 |
| 表 T-074 `SU-3`（`:245`） | 85 | **当てる時の 表 T-075 の行の数**（いまなら 86） |
| `file-flow-values.ts` | 無い | 生成区画、`emptyFileFlowValues`、`stepFileFlowValues`（機械ごとの振り分けと根の升）。⛔ モジュールスコープの可変状態を置かない（検査 61、`SF-7`）。生成定数は `FILE_FLOW_VALUES_INITIAL_AXES` ・ `FILE_FLOW_VALUES_TRANSITIONS`（入れ子が無いので `_INITIAL_CHILDREN` は刷られない —— `CR-450` の決定 3 と同じ） |
| `advance-screen-session.ts` | `ScreenSession { screen; notices; gesture }`（`:33`〜`:37`） | `ScreenSession { screen; notices; gesture; fileFlow }`、`SessionEvent` ・ `SessionEffect` を 4 領域の和に、`emptyScreenSession` を広げ、`IS_FILE_FLOW_EVENT` を `IS_GESTURE_EVENT`（`:60`〜`:66`）と同じ形で足す。⚠️ 検査 60 の帯（50 行 / 15 分岐）に収める |
| **契約試験** `state-machine-file-flow.contract.test.ts` | 無い | 原稿の領域 `fileFlow` を読み、(1) 各機械の各升目で先の種類が表と一致（ガードの真偽の組を作る）、(2) 空の升目は同じ参照と共有の空の列（`SD-3`）、(3) 2 つの機械の直交（7 × 2 の組）と `{in: …}` のガードが相手の機械の今の状態を読むこと、(4) 根の 3 升が運ぶ値だけを書き換えること、(5) 根: この領域の出来事はほかの 3 領域を同じ参照のまま残す（`SS-5`）。⭐ 書くのは仕様だけを読む別の体（`RA-6`） |
| `changelog.md` の版 0.29 | 「`AdvanceScreenSession`（5）」 | 「（6）」（検査 33） |

### 3.2 波 A の直前の測り直し（⛔ 当てる体が打つ）

1. 表と図の番号の上端、`T-290` ・ `F-036` ・ `UF-89` がまだ使われていないこと。
2. 出来事のキー 16 と `flowSurfaceAnswered` がほかの領域に無いこと、機械名 2 つが無いこと（生成器も拒むが、先に数える）。
3. 表 T-075 の行の数（`SU-3` に書く数）と、`requirement-owner-baseline.txt` の `unfilled=` が前後で同じこと（決定 13）。
4. 付録の根拠の行番号（`01-04-requirements.md` は並行して動く。動いていたら ID で引き直す）。

---

## 4. 波 B —— シェルへ結線する（段 5・段 6 と `CR-436` の波 B2 の後）

| 対象 | 案 |
|---|---|
| 開く（`carryOutAction` の `openDocumentFile`:3822〜3832、`reopenDocumentFile`:3867〜3877） | 入力の翻訳係が `fileFlow/documentOpenAsked{openRoute}` を作る。副作用 `readDocumentFile` をシェルが実行し（いまの `openDocumentIntoHold` の `:3230`〜`:3310`: 読む・形式を判じる・検証する・落とす）、結果を `documentFileRead` ／ `documentOpenFailed` で戻す。読んだ文書はシェルの操作の文脈に残す（決定 5）。置き場が無い（`files === undefined`）ときは、いまのとおり出来事を作らない（`:3824`、`JDG-78` —— 新しい扱いを作らない） |
| ドロップ | `fileFlow/documentOpenAsked{openRoute: drop}` の受け口だけが在る。⛔ **ドロップから呼ぶ道を足すのは波 C**（`DFC-569`、`PND-446`） |
| Agent API（`takeInHandedDocument`:3397〜3413） | `fileFlow/agentDocumentHanded`。升が空（同じ参照）なら `false` を返す（いまの `:3398`）。⚠️ いまは `OP-3` を問わない（`:3408`）—— 波 B ではシェルが `documentFileRead` の直後に `openChoiceAnswered{merge}` を作って写す（決定 11）。直すのは `JDG-130` の着地（波 C） |
| 選ばせる面・差分の確認・取り込みの報告 | 副作用 `raiseFlowSurface` ⇒ `screen/surfaceRaisedByFlow`。答えの入口 ⇒ `fileFlow/openChoiceAnswered` ／ `mergeMappingAnswered` と `screen/flowSurfaceAnswered`。人が閉じた ⇒ `tellFlowSurfaceClosed` ⇒ `fileFlow/flowSurfaceClosed` |
| 取り込む（`:3324`〜`:3383`） | 副作用 `importIncomingDocument`（置き換え `RD-4` ／ 合流と重ね `RD-3`）。結果は `mergeMappingAsked` ／ `documentOpenLanded` ／ `documentOpenFailed`。`:3359` の TRAP（待ちの後の文書を読み直す）はそのまま副作用の中に残る |
| 保存・書き出し（`:3878`〜`:3888`、`answerSettledFormat`:3673〜3690） | `fileFlow/documentFileWriteAsked{writeForm}` ⇒ 副作用 `writeDocumentFile`。置き場の `confirmOverwrite` は `overwriteQuestionRaised` を戻し、答えは `answerOverwriteQuestion` が解く。結果は `documentFileSaved{openedFileName}` ／ `documentFileWriteEnded`。`fileSavedAt` と `hasUnsavedEdits` はいまのとおり副作用の実行が書く（決定 9 ・ 12） |
| 問い | 書き込みの束が問いを負う（`:3783`〜`:3787`）・`IC-66`（`:3633`）⇒ `fileFlow/changeQuestionRaised{question, owedAction}`。`IC-98`（`:3609`）⇒ `newDocumentEntryPressed`。答え ⇒ `confirmationAnswered`。`carryOutOwedAction` はいまの `settle` の中身（`:3790`〜`:3794` ・ `:3641`〜`:3644` ・ `startNewDocument` の `RD-7`） |
| 5 か所のガード | 消す。`OP-8` は表の列が持つ |
| `T-283` の 3 行 | 2.2 の表 |
| 性能 | `LM-19`。⛔ **測る前に利用者を呼ぶ** |

---

## 5. 問いの候補に打った 3 つの反証（`handoff.md` §0.2）

方法: (1) `docs/development-records/rulings.md`（527 行、2026-09-21）を grep、(2) `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <行>`、(3) 仕様・計画・前の裁定・台帳の `PND` から導けるか。

| 候補 | (1) `rulings.md` | (2) `impact.py` | (3) 導けるか | 結果 |
|---|---|---|---|---|
| 問い（`U-55`）をこの領域に入れるか、別の領域にするか | 「問いが」4 件（`JDG-33` ・ `JDG-37` ・ `JDG-139` ・ `JDG-143`、どれも無関係）、`U-55` 0 件、`Confirmation` 0 件 | `U-55` → 要求 5 件 ／ 参照 9 | **導けた** —— 計画 `:236` が `asking` をこの領域の例に挙げ、`OP-8` の拒否が問いを読み、`{in}` は同じ領域しか指せない（`state_machines_json_to_md.py:34`） | 決定 3 |
| `hasUnsavedEdits` ・ `fileSavedAt` をこの領域に入れるか | 「未保存」0 件、`FR-100` ・ `FR-101` 0 件、`DFC-459` 0 件（`DFC-459` の裁定は台帳の側に在る ——`defects.md:87`、2026-09-11「最後に保存した時刻を文書に持つ列を足せ」） | `FR-100` → `LM-11` ・ `U-55` ・ `OP-4` ・ `QN-5` を指す。`FR-101` → 要求 1 件 ／ 参照 7、`AT-140` を指す | **導けた** —— `FR-101` req:5681 が保管を `AT-140` と定め、`SF-10` が文書を集約に入れない。`hasUnsavedEdits` は書き込みのたびに動く（`:3093` ・ `:3118`） | 決定 9 |
| 答えて面を閉じることを、画面の値の新しい出来事にするか、副作用の往復にするか | `U-56` 0 件、`Open Chooser` 0 件、「Difference Review」1 件（`JDG-130`、取り込みの三択で無関係） | `SF-8` → 要求 0 ／ 参照 9、`SF-6` → 要求 0 ／ 参照 2 | **導けた** —— 枝の副作用は 1 つ（schema の `branch.effect`）、`SS-5` des:1103 は出来事を 1 領域にしか渡さない、1 入力 → 2 出来事の前例 `CR-450` 2.1 | 決定 7 |
| Agent API の取り込みで `OP-3` を問うか（いまは合流に決め打ち） | `JDG-130`（`rulings.md:231`）「案 1」—— 開く道と同じく三択を問う。状態は `未着地`。`PND-438` は `裁定済`（`pending-decisions.md:301`） | `AM-8` → 要求 1 件 ／ 参照 2 | **導けた** —— 原稿は仕様（`OP-3` req:5567 の「勝手に決めてはならない」）どおりに書き、いまの決め打ちは波 B でシェルが写し、`JDG-130` の着地で直す（`JDG-57`） | 決定 11 |
| 合流で `MG-4` ・ `MG-12` の衝突を問う面を状態に入れるか | `PND-423` 0 件 | —— | **導けた（入れない）** —— `PND-423` は `未裁定`（`pending-decisions.md:287`）で、面を仕様が定めていない（`frame-loop.ts:3339` の STOP）。原稿は要求が名指す状態だけ（des:724） | 状態にしない |
| 浮いた `Promise` の拒否（`PND-187`）を機械で扱うか | `PND-187` 0 件。`JDG-78`（`rulings.md:165`）「異常系・準正常系のケアはリファクタ一式の後」 | `CS-4` → 要求 0 ／ 参照 4 | **導けた** —— 待ちの終わりの出来事（`documentOpenFailed` ・ `documentFileWriteEnded`）は成否によらず要る。告げるかは副作用の中身であり、`JDG-78` で後へ回す | 決めない（`PND-187` のまま） |
| ドロップの契機（`PND-446`）を待つか | `PND-446` 0 件、「ドロップ」0 件 | `OP-2` → 要求 3 件 ／ 参照 4 | **導けた** —— 出来事の受け口は `OP-2` が名指すので置く。フレームを起こす契機（`FT-1` des:892）はシェルの話で、波 C の `DFC-569` と一緒に決まる | 決定 11 |
| 書き出しの形式を選んだ後に `U-54` を閉じるか（`PND-448`） | `PND-448` 0 件、`U-54` 0 件 | `U-54` → 要求 1 件 ／ 参照 3 | **導けた（本書では決めない）** —— 波 A に要らない。波 B はいまの実装（閉じる）を写す | 決定 12 |

⇒ **3 つとも空だった候補は 0 件。問いは無い。**

---

## 6. 継ぎ目（体に渡すときは両方のブリーフに同じ字面で書く）

- 領域のキー `fileFlow`、型の幹 `FileFlowValues`、ファイル `file-flow-values.ts`、公開は `emptyFileFlowValues` ・ `stepFileFlowValues` と生成した型・定数。
- 機械 `fileOperationStateMachine`（今の状態 `fileOperationState`）: `idle` ・ `readingDocumentFile` ・ `awaitingOpenChoice` ・ `awaitingDiscardAnswer` ・ `importingDocument` ・ `awaitingMergeMapping` ・ `writingDocumentFile`。
- 機械 `confirmationStateMachine`（今の状態 `confirmationState`）: `notAsked` ・ `questionAsked`。
- 出来事（16）: `fileFlow/documentOpenAsked` ・ `agentDocumentHanded` ・ `documentFileWriteAsked` ・ `openChoiceAnswered` ・ `mergeMappingAnswered` ・ `confirmationAnswered` ・ `changeQuestionRaised` ・ `newDocumentEntryPressed` ・ `flowSurfaceClosed` ・ `documentFileRead` ・ `documentOpenFailed` ・ `mergeMappingAsked` ・ `documentOpenLanded` ・ `overwriteQuestionRaised` ・ `documentFileSaved` ・ `documentFileWriteEnded`。画面の値に `screen/flowSurfaceAnswered`。
- 副作用（8）: `readDocumentFile` ・ `writeDocumentFile` ・ `importIncomingDocument` ・ `discardIncomingDocument` ・ `answerOverwriteQuestion` ・ `carryOutOwedAction` ・ `raiseFlowSurface`（引数 `U-56` ／ `U-61` ／ `U-62`）・ `raiseNotice`（引数 `RS-27`）。
- ガード: `isReopenRoute` ・ `isReplaceChoice` ・ `isProceeding` ・ `isOverwriteQuestion` ・ `isImportCancelled` ・ `isOpenChooserSurface` ・ `isDifferenceReviewSurface` ・ `isImportReportSurface` ・ `isFileOperationQuestion` ・ `hasStartupTemplate` ・ `hasDroppedTasks`、と `{in: …}` 3 つ。
- 運ぶ値の名: `openRoute` ・ `writeForm` ・ `openChoice` ・ `mergeMapping` ・ `mergeCandidates` ・ `unreadColumns` ・ `droppedTaskNames` ・ `openedFileName` ・ `question` ・ `owedAction` ・ `isProceeding` ・ `surfaceName`（型はコードが決める）。
- 根: `ScreenSession { readonly screen; readonly notices; readonly gesture; readonly fileFlow: FileFlowValues }`。
- ⭐ 当てた継ぎ目は草案から動いた —— 出来事 `newDocumentEntryPressed` が `hasStartupTemplate` と `question` を、`documentFileRead` と `openChoiceAnswered` が `question` を運ぶ。運ぶ値と副作用の型は `file-flow-values.ts` が決めた（改訂の記録の 2 〜 6）。

---

## 7. 数の予測

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行。
**起草時（`d54f5ec1`、2026-09-21）: `tables=178  figures=22  rows=2224  uids=162`。**
⭐ 本書の差だけを突き合わせる（「前」は並行する変更で動く）。

**波 A**:

| | 差 | 内訳 |
|---|--:|---|
| tables | +1 | 表 T-290（`CR-450` の改訂の記録 11 で、表 T-289 が +1 だった） |
| figures | +1 | 図 F-036 |
| rows | +1 | `UF-89`。機械の升目・出来事・画面の値の 1 出来事は行 ID の形に当たらない見込み（`CR-450` で `UF-88` の +1 だけだった） |
| uids | 0 | 要求を足さない |

**波 B**: tables 0 ・ figures 0 ・ rows 0（`T-283` の行は `CR-436` の波 B2 が数える）・ uids 0。
**そのほかの数**: 表 T-075 85 → 86、`units.contract.test.ts` 85 → 86、`changelog.md` の「（5）」→「（6）」、原稿は 4 領域 ・ 機械 18 ・ 状態 53 ・ 出来事 57 ・ 升 127 ＋ 根の升 5、`frameLoop` の `let` は波 B で 66 → 58 の見込み。

---

## 8. 台帳の候補（⛔ 問いではない。どちらが正かを選ばない）

利用者の裁定（2026-09-13: 仕様とコードの食い違いは、どちらが正かを選ばずに台帳へ）に従い、台帳の体へ渡す、と起草時は書いた。⇒ 波 A を当てた体が、新しい候補 5 〜 7 を `DFC-689` 〜 `DFC-691` として書いた（改訂の記録の 9）。

| # | 食い違い | 片側 | もう片側 | 台帳の今 |
|---|---|---|---|---|
| 1 | 開く道が `openedFileName` を書かない | `FR-101` req:5675 | `frame-loop.ts:3435`（書き手は保存の道だけ） | **既存 `DFC-574`**（`まだ押していない`） |
| 2 | 保存しても `documentStamp.fileSavedUtc`（`AT-140`）を書かず、時刻を保存しない画面の値 `fileSavedAt` に持つ | `FR-101` req:5681、`AT-140` fig-erd-detail.md:441 | `frame-loop.ts:3437`。`src/` で `fileSavedUtc` を読み書きするのは符号化と型だけ（`json-codec.ts:656` ・ `:668`、`document-stamp.ts:22` ・ `:49`） | **既存 `DFC-459` が持つ**（当てた体が読んで確かめた —— `DFC-459` は「保存したときに本列へ刻を置く造りはまだ無く、いまは常に空である」と書き、状態は `実装待ち`）。新しい行は足さなかった |
| 3 | Agent API の取り込みが `OP-3` を問わず合流に決め打つ | `OP-3` req:5567、`JDG-130`（`rulings.md:231`、`未着地`） | `frame-loop.ts:3408` | **既存 `DFC-614`** ／ `PND-438`（`裁定済`） |
| 4 | ドロップで開く道が無い | `OP-2` req:5566 | `readFileToOpen('drop')` を呼ぶ所が `src/` に無い（`OpenRoute` の `'drop'` は `file-store.ts:7`） | **既存 `DFC-569`** ／ `PND-446`（`未裁定`） |
| 5 | ⚠️ **未検証（画面で押していない）** —— `unreadColumns` は読めなかった列が 1 つ以上のときだけ上書きされ（`:3266`）、下ろすのは合流の道だけ（`:3663` ・ `:4288`）。置き換え・重ね・`U-56` を閉じた後も残り、後の合流の `U-61` に前のファイルの列が出る疑い。また `FR-073` は読み込むたびに「続けてよいかを問う」と定めるが、開く道は問わない | `FR-073` req:5709 | `frame-loop.ts:3266` ・ `:3663` ・ `:4288`、描き手 `open-modals.ts:51`〜`:55` | 0 件（`DFC-561` は起動時の埋め込み文書だけ ——`defects.md:134`。`DFC-464` は 表 T-234 の締めの話）。新しい行か `DFC-561` の広げかは台帳の体が決める。⇒ 波 A で新しい行 **`DFC-689`**（`未検討`）とした |
| 6 | 問いが立っているあいだの書き込みの扱いを仕様の行が持たない —— `changeDocument` は黙って捨て（`:3782`）、`IC-66` は `RS-27` を出し（`:3622`〜`:3626`）、Agent API の書き込みは `WS-2` を通って通る | 仕様に行が無い（`docs/spec` を「問いが立っている」で grep して 1 件、`NT-7` req:6397 の `y` / `n` の話だけ） | 3 つの道の 3 つの扱い | 0 件（`asking` ・「問いが立っ」を `defects.md` ・ `pending-decisions.md` で grep —— `PND-380` は確認の面の上のホイールで別）。⭐ 性質は `PND`（仕様の穴）。⇒ 波 A で **`DFC-690`**（`仕様待ち`）とした |
| 7 | ⚠️ **未検証・準正常系（`JDG-78` の後へ）** —— 問いが立っているところへ別の問いが立つと、前の問いの `settle` が捨てられる（`asking` を上書きする `:3137` ・ `:3185`）。書き出しの途中で削除の問いが立っていた場合、上書きの確認が削除の問いを消す | `NT-7` req:6397（問いは答えを求める） | `frame-loop.ts:3137` ・ `:3185` | 0 件。⭐ 原稿は今の振る舞いを写す（`questionAsked` × 問いを立てる出来事 → `questionAsked`）。`DFC-586` の束へ。⇒ 波 A で **`DFC-691`**（`未検討`）とした |

⚠️ 既に在る関係の行（本書は直さない）: `DFC-567`（待ちのあいだヘッダーの入口が薄くならない）、`DFC-538`（`await` をまたぐ読み ——`defects.md:112`）、`DFC-542`（問いと答えの書き込みの対を型が持たない ——`:116`。⭐ 移すと `owedAction` が対を持つので、波 C で閉じられる見込み）、`DFC-557`（MSPDI の告知を捨てる）、`DFC-582`（検証の拒否を告げない ——`frame-loop.ts:3302`〜`:3304`）、`PND-423`（`frame-loop.ts:3339`）、`PND-448`（`:3674`）、`PND-187`。

---

## 9. 影響 —— 本書の外で動くもの

| 所 | 何が動くか | いつ |
|---|---|---|
| `CR-436` | 画面の値の原稿に `flowSurfaceAnswered` と 1 升が足される（決定 7）。波 B2 の `T-283` に 2.2 の 3 行を申し送る。⛔ 本書は `CR-436` を書き換えない | 波 A ・ 波 A の後 |
| `docs/development-records/refactor-stage1-state-inventory-2026-09-13.md` | 領域の数（`:201`）にファイル置き場の閉包 3 が無い（第 1 節） | 前に立つ者が判じる |
| `docs/development-records/handoff-state-machine.md` | §3 の「次の領域」（`:100`）に第 4 領域 | 前に立つ者 |
| `docs/development-records/defects.md` ・ `pending-decisions.md` | 第 8 節の候補 5 〜 7（と 2 の範囲の確認） | 台帳の体 |
| `docs/review/components/components.md` と図 F-013 〜 F-017 | 見込み 0（`file-flow-values.ts` が読むのは `session-step.ts` だけの見込み）。当てる体は `EG-2` ・ `EG-3` で数える | 波 A |

---

## 10. ⛔ この変更でやらないこと

- ⛔ 波 A で `src/adapter` ・ `src/framework` に触らない
- ⛔ `T-283` を取らない。通知・身振りの原稿を変えない。画面の値の原稿は決定 7 の 1 出来事 ・ 1 升だけ
- ⛔ 新しい異常系・準正常系の扱いを設計しない（`JDG-78`）—— 失敗は今の副作用の中身のまま、待ちを終える出来事だけを置く
- ⛔ `hasUnsavedEdits` ・ `fileSavedAt` ・ 読んだ文書を集約へ入れない
- ⛔ 第 8 節の候補を移す波で直さない（`JDG-57`）
- ⛔ 基準線を体に触らせない

---

## 付録 —— 第 4 領域「ファイル操作と問い」の原稿（新しい形）

**略記**: `req` ＝ `docs/spec/01-04-requirements.md`、`des` ＝ `docs/spec/05-07-design.md`、`glo` ＝ `docs/spec/_assets/tbl-glossary.md`、`erd` ＝ `docs/spec/_assets/fig-erd-detail.md`。行番号は `d54f5ec1`。
根拠の行: `OP-2` req:5566、`OP-3` :5567、`OP-4` :5568、`OP-5` :5569、`OP-8` :5575、`OP-9` :5574、`OP-12` :5576、`OP-13` :5578、`FR-022` :5091、`FR-023` :5318、`FR-032` :2242、`FR-060` :5595、`FR-073` :5709、`FR-095` :5946、`FR-096` :5877、`FR-099` :2319、`FR-101` :5675、`DI-4` :5923、`NT-7` :6397、`NT-8` :6398、`QN-1` 〜 `QN-5` :6488〜6492、`RS-27` :6438、`RS-50` :6459、`MM-1` :5133、`MM-2` :5134、`MM-4` :5136、`MG-6` :5167、`CHN-1` :489、`SK-10` :4175、`SK-11` :4176、`SK-12` :4177、`SK-21` :4190、`IN-4` :6804 ／ `CS-4` des:626、`RD-3` des:691、`RD-4` des:692、`RD-7` des:694 ／ `U-54` glo:137、`U-55` :138、`U-56` :139、`U-58` :140、`U-61` :143、`U-62` :144、`IC-1` :513、`IC-2` :514、`IC-52` :577、`IC-66` :593、`IC-71` 〜 `IC-73` :596〜598、`IC-95` 〜 `IC-97` :604〜606、`IC-98` :512、`AM-8` :371。
升目の書き方: `→ 先 [ガード] / 副作用(引数)`。**`—` は変わらない ＝ 同じ参照**（`SD-3`）。ガードが全部の場合を覆わない升は「それ以外 → —」。1 つの升目に複数の行があるときは、ガードが互いに排他である。

### A. 出来事（領域に 1 度だけ定義する）

| 出来事 | どこから来るか | 運ぶ値 | 動かす機械 | 根拠 |
|---|---|---|---|---|
| `fileFlow/documentOpenAsked` | 入力: 開く入口・`Ctrl` ＋ `O`（`openRoute: chooser`）、ファイルを落とした（`drop`）、`Ctrl` ＋ `R`（`reopen`） | `openRoute`（`OP-2` ・ `OP-13`） | `fileOperation` | `IC-1`、`SK-10`、`OP-2`、`CHN-1`、`SK-21`、`OP-13` |
| `fileFlow/agentDocumentHanded` | 入力: `Agent API` が文書を渡した（`openRoute: handed`） | — | `fileOperation` | `AM-8`、`FR-022` |
| `fileFlow/documentFileWriteAsked` | 入力: `Ctrl` ＋ `S`（`writeForm: save`）、書き出しの形式を選んだ（`U-54`） | `writeForm` | `fileOperation` | `SK-11`、`FR-060`、`SK-12`、`FR-096`、`U-54` |
| `fileFlow/openChoiceAnswered` | 入力: `U-56` の 3 つの入口 | `openChoice`（置き換え ／ 合流 ／ 重ね） | `fileOperation` ・ `confirmation` | `IC-71`、`IC-72`、`IC-73`、`OP-3` |
| `fileFlow/mergeMappingAnswered` | 入力: `U-61` の 3 つの入口 | `mergeMapping`（`MM-1` ・ `MM-2` ・ `MM-4`） | `fileOperation` | `IC-95`、`IC-96`、`IC-97`、`FR-022` |
| `fileFlow/confirmationAnswered` | 入力: `Yes` / `No`、`y` / `n`、`Esc`（`IN-4` の段 `'confirmation'` —— `isProceeding: false`。段は呼び手が決める） | `isProceeding` | `fileOperation` ・ `confirmation` | `NT-7`、`IN-4` |
| `fileFlow/changeQuestionRaised` | 入力: 確認を要る書き込みの束（行の削除・WBS の子孫を持つ `Task` の削除）、担当者の削除 | `question`（`QN-1` 〜 `QN-3`）、`owedAction` | `confirmation` | `FR-032`、`FR-099`、`QN-1`、`QN-2`、`QN-3`、`IC-66` |
| `fileFlow/newDocumentEntryPressed` | 入力: 新しく始める入口 | — | `confirmation` | `IC-98`、`FR-095` |
| `fileFlow/flowSurfaceClosed` | ほかの領域: 画面の値の副作用 `tellFlowSurfaceClosed`（人が `×` か `Esc` で面を閉じた） | `surfaceName` | `fileOperation`、根 | `IC-52`、`IN-4` |
| `fileFlow/documentFileRead` | 副作用の結果: `readDocumentFile` が読み、形式を判じ、検証を通した | — | `fileOperation` ・ `confirmation` | `OP-5`、`OP-12`、`FR-023` |
| `fileFlow/documentOpenFailed` | 副作用の結果: 読めない・選ばなかった・検証が拒んだ・読み直す相手が無い・着地を拒まれた（告げるのは副作用の中身） | — | `fileOperation` | `OP-5`、`OP-13`、`FR-023` |
| `fileFlow/mergeMappingAsked` | 副作用の結果: `importIncomingDocument` が対応付けを問うことになった | `mergeCandidates`、`unreadColumns` | `fileOperation` | `FR-022`、`U-61`、`FR-073` |
| `fileFlow/documentOpenLanded` | 副作用の結果: 取り込みが着地した（`RD-3` ／ `RD-4`） | `droppedTaskNames`（`RS-50`）、`openedFileName`（無いこともある） | `fileOperation`、根 | `RD-3`、`RD-4`、`FR-023`、`FR-101` |
| `fileFlow/overwriteQuestionRaised` | 副作用の結果: `writeDocumentFile` の途中で、同じとみなせない相手を見つけた | `question`（`QN-4`） | `confirmation` | `DI-4`、`QN-4` |
| `fileFlow/documentFileSaved` | 副作用の結果: 保存が書けた | `openedFileName`（無いこともある） | `fileOperation`、根 | `FR-060`、`FR-101` |
| `fileFlow/documentFileWriteEnded` | 副作用の結果: 書き出しが終わった、または保存・書き出しが書けなかった（告げるのは副作用の中身） | — | `fileOperation` | `FR-096`、`CS-4` |

### B. 根 `fileFlow`

運ぶ値: `openedFileName`（`U-58`、`FR-101`）、`droppedTaskNames`（`U-62`、`RS-50`）。根拠: `OP-8`、`CS-4`。

| 出来事 | 升 |
|---|---|
| `fileFlow/documentFileSaved` | `openedFileName` を書き換える（名が運ばれたときだけ）（`FR-101`、`U-58`） |
| `fileFlow/documentOpenLanded` | [`hasDroppedTasks`] / `raiseFlowSurface(U-62)` —— `droppedTaskNames` と `openedFileName` を書き換える（`FR-023`、`U-62`、`RS-50`、`FR-101`）<br>[not `hasDroppedTasks`] —— `openedFileName` を書き換える（`FR-101`） |
| `fileFlow/flowSurfaceClosed` | [`isImportReportSurface`] —— `droppedTaskNames` を空にする（`U-62`、`IC-52`）<br>それ以外 → — |

### C.1 機械 `fileOperationStateMachine` —— いま進んでいる 1 回のファイル操作（`CS-4`）

| 状態 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|
| `fileOperationStateMachine.idle` | ○ | — | `OP-8`、`CS-4` |
| `fileOperationStateMachine.readingDocumentFile` | | `openRoute` | `OP-2`、`OP-5`、`OP-8`、`OP-12`、`OP-13`、`CS-4` |
| `fileOperationStateMachine.awaitingOpenChoice` | | — | `OP-3`、`U-56`、`OP-5`、`CS-4` |
| `fileOperationStateMachine.awaitingDiscardAnswer` | | — | `OP-4`、`QN-5`、`OP-13` |
| `fileOperationStateMachine.importingDocument` | | — | `RD-3`、`RD-4`、`OP-9`、`FR-022` |
| `fileOperationStateMachine.awaitingMergeMapping` | | `mergeCandidates`、`unreadColumns` | `FR-022`、`U-61`、`FR-073` |
| `fileOperationStateMachine.writingDocumentFile` | | — | `FR-060`、`FR-096`、`DI-4`、`CS-4` |

**遷移表**（行 ＝ 出来事、列 ＝ いまの状態。「同」は同じ種類へ戻る）:

| 出来事 ＼ 状態 | `idle` | `readingDocumentFile` | `awaitingOpenChoice` | `awaitingDiscardAnswer` | `importingDocument` | `awaitingMergeMapping` | `writingDocumentFile` |
|---|---|---|---|---|---|---|---|
| `documentOpenAsked` | → `readingDocumentFile` [in `confirmation.notAsked`] / `readDocumentFile`（`OP-2`、`OP-13`、`CS-4`）<br>→ `idle` [in `confirmation.questionAsked`] / `raiseNotice(RS-27)`（`OP-8`、`RS-27`） | → 同 / `raiseNotice(RS-27)`（`OP-8`） | → 同 / `raiseNotice(RS-27)` | → 同 / `raiseNotice(RS-27)` | → 同 / `raiseNotice(RS-27)` | → 同 / `raiseNotice(RS-27)` | → 同 / `raiseNotice(RS-27)` |
| `agentDocumentHanded` | → `readingDocumentFile` [in `confirmation.notAsked`] / `readDocumentFile`（`AM-8`、`OP-8`）<br>それ以外 → — | — | — | — | — | — | — |
| `documentFileWriteAsked` | → `writingDocumentFile` [in `confirmation.notAsked`] / `writeDocumentFile`（`FR-060`、`FR-096`、`CS-4`）<br>→ `idle` [in `confirmation.questionAsked`] / `raiseNotice(RS-27)`（`RS-27`） | → 同 / `raiseNotice(RS-27)`（`OP-8`） | → 同 / `raiseNotice(RS-27)` | → 同 / `raiseNotice(RS-27)` | → 同 / `raiseNotice(RS-27)` | → 同 / `raiseNotice(RS-27)` | → 同 / `raiseNotice(RS-27)` |
| `documentFileRead` | — | → `awaitingDiscardAnswer` [`isReopenRoute`]（`OP-13`、`OP-4`）<br>→ `awaitingOpenChoice` [not `isReopenRoute`] / `raiseFlowSurface(U-56)`（`OP-3`、`OP-5`） | — | — | — | — | — |
| `documentOpenFailed` | — | → `idle`（`OP-5`、`OP-13`） | — | — | → `idle`（`FR-023`） | — | — |
| `openChoiceAnswered` | — | — | → `awaitingDiscardAnswer` [`isReplaceChoice`]（`OP-3`、`OP-4`）<br>→ `importingDocument` [not `isReplaceChoice`] / `importIncomingDocument`（`OP-3`、`OP-9`、`RD-3`） | — | — | — | — |
| `confirmationAnswered` | — | — | — | → `importingDocument` [`isProceeding`] / `importIncomingDocument`（`OP-4`、`RD-4`）<br>→ `idle` [not `isProceeding`] / `discardIncomingDocument`（`OP-4`） | — | — | → 同 [`isOverwriteQuestion`] / `answerOverwriteQuestion`（`DI-4`、`QN-4`）<br>それ以外 → — |
| `mergeMappingAsked` | — | — | — | — | → `awaitingMergeMapping` / `raiseFlowSurface(U-61)`（`FR-022`、`U-61`） | — | — |
| `mergeMappingAnswered` | — | — | — | — | — | → `idle` [`isImportCancelled`] / `discardIncomingDocument`（`MM-4`、`MG-6`）<br>→ `importingDocument` [not `isImportCancelled`] / `importIncomingDocument`（`MM-1`、`MM-2`、`FR-022`） | — |
| `flowSurfaceClosed` | — | — | → `idle` [`isOpenChooserSurface`] / `discardIncomingDocument`（`IC-52`、`IN-4`、`OP-3`）<br>それ以外 → — | — | — | → `idle` [`isDifferenceReviewSurface`] / `discardIncomingDocument`（`IC-52`、`IN-4`、`MG-6`）<br>それ以外 → — | — |
| `documentOpenLanded` | — | — | — | — | → `idle`（`RD-3`、`RD-4`、`FR-023`） | — | — |
| `documentFileSaved` | — | — | — | — | — | — | → `idle`（`FR-060`） |
| `documentFileWriteEnded` | — | — | — | — | — | — | → `idle`（`FR-096`、`CS-4`） |

この機械を動かさない出来事: `changeQuestionRaised` ・ `newDocumentEntryPressed` ・ `overwriteQuestionRaised`（`confirmation` だけが動く）。升 28。
⭐ **`OP-8` はこの表の 2 行（`documentOpenAsked` ・ `documentFileWriteAsked`）と `agentDocumentHanded` の空の升である** —— いまの 5 か所の 3 項のガードがここへ畳まれる。
⭐ **古い結果は何もしない** —— 面を閉じた後に届いた答え（`awaitingOpenChoice` 以外の `openChoiceAnswered`）、待っていない所へ届いた副作用の結果は、升が空で同じ参照が返る（いまは `settle` が `null` のとき `answerSettledEntry` が `false` を返す ——`frame-loop.ts:3650`〜`:3651` ・ `:3659`〜`:3660`）。

### C.2 機械 `confirmationStateMachine` —— 続けてよいかを問う面（`U-55`）

| 状態 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|
| `confirmationStateMachine.notAsked` | ○ | — | `NT-7`、`U-55` |
| `confirmationStateMachine.questionAsked` | | `question`（`QN-1` 〜 `QN-5`）、`owedAction`（「続ける」で行う書き込みの束か、新しく始めること。ファイル操作の問いでは無い） | `NT-7`、`U-55`、`QN-1`、`QN-2`、`QN-3`、`QN-4`、`QN-5` |

**遷移表**:

| 出来事 ＼ 状態 | `notAsked` | `questionAsked` |
|---|---|---|
| `changeQuestionRaised` | → `questionAsked`（`NT-7`、`FR-032`、`FR-099`、`QN-1`、`QN-2`、`QN-3`） | — |
| `newDocumentEntryPressed` | → `questionAsked` [`hasStartupTemplate`]（`FR-095`、`QN-5`）<br>→ `notAsked` [not `hasStartupTemplate`] / `raiseNotice(RS-27)`（`RS-27`） | → 同 / `raiseNotice(RS-27)`（`RS-27`） |
| `openChoiceAnswered` | → `questionAsked` [`isReplaceChoice`, in `fileOperation.awaitingOpenChoice`]（`OP-4`、`QN-5`）<br>それ以外 → — | → 同 [`isReplaceChoice`, in `fileOperation.awaitingOpenChoice`]（`OP-4`、`QN-5`）<br>それ以外 → — |
| `documentFileRead` | → `questionAsked` [`isReopenRoute`]（`OP-13`、`QN-5`）<br>それ以外 → — | → 同 [`isReopenRoute`]（`OP-13`、`QN-5`）<br>それ以外 → — |
| `overwriteQuestionRaised` | → `questionAsked`（`DI-4`、`QN-4`） | → 同（`DI-4`、`QN-4`） |
| `confirmationAnswered` | — | → `notAsked` [`isProceeding`, not `isFileOperationQuestion`] / `carryOutOwedAction`（`NT-7`、`FR-032`、`FR-099`、`FR-095`）<br>→ `notAsked` [`isProceeding`, `isFileOperationQuestion`]（`NT-7`、`OP-4`、`DI-4`）<br>→ `notAsked` [not `isProceeding`]（`NT-7`） |

この機械を動かさない出来事: `documentOpenAsked` ・ `agentDocumentHanded` ・ `documentFileWriteAsked` ・ `mergeMappingAnswered` ・ `flowSurfaceClosed` ・ `documentOpenFailed` ・ `mergeMappingAsked` ・ `documentOpenLanded` ・ `documentFileSaved` ・ `documentFileWriteEnded`。升 10。
⭐ **`questionAsked` の列の「→ 同」は問いの上書きである** —— いまのコードが `asking` を上書きする（`:3137` ・ `:3185`）振る舞いを写した。それが正しいかは第 8 節の候補 7（`JDG-78` の後へ）。
⭐ **`changeQuestionRaised` × `questionAsked` が空なのは、いまの `:3782` が問いの立つあいだ書き込みを捨てるからである**（第 8 節の候補 6）。
⚠️ 2 つの機械は直交する（契約試験は 7 × 2 の組で数える）。ファイル操作の問いの答えは、`confirmation` が `notAsked` へ戻り、`fileOperation` の升が続きの副作用を持つ —— 1 つの出来事に 2 つの機械が答える。

### D. 画面の値の領域に足すもの（決定 7）

| 出来事 | どこから来るか | 運ぶ値 | 動かす機械 | 根拠 |
|---|---|---|---|---|
| `screen/flowSurfaceAnswered` | 入力: `U-56` ・ `U-61` の答えの入口（呼び手は同じ入力から `fileFlow` の答えの出来事も作る） | `surfaceName` | `openSurfaceStateMachine` | `IC-71`、`IC-72`、`IC-73`、`IC-95`、`IC-96`、`IC-97`、`OP-3`、`FR-022` |

`openSurfaceStateMachine` の升: `open` × `screen/flowSurfaceAnswered` → `closed`（`OP-3`、`FR-022`）。副作用なし（`tellFlowSurfaceClosed` を返さない）。`closed` の列は —。

### E. 運ぶ値と副作用の型（コードが決める。原稿は名前だけ —— 表 T-250 の `SD-1` ・ `SD-2`）

| 名 | 型の見込み | 置き場 |
|---|---|---|
| `openRoute` | `'chooser' \| 'drop' \| 'reopen' \| 'handed'`（いまの `OpenRoute` は `src/adapter/file-gateway/file-store.ts:7` の 3 つ） | `file-flow-values.ts`。⚠️ `UseCase` は `Adapter` の型を読めない（表 T-061）ので同じ形の型を領域に置く（`CR-450` の付録 C と同じ移行） |
| `openChoice` ・ `mergeMapping` | いまの `OpenChoice` ・ `MergeMapping`（`frame-loop.ts:1153`） | 同上 |
| `question` | いまの `RaisedConfirmation`（問いの行と挙げる名前） | 同上 |
| `owedAction` | 判別共用体: 書き込みの束（`DocumentCommand` の列と作ったもの）／ 新しく始める | 同上。⛔ `Document` を含めない（`SF-10`） |
| `mergeCandidates` ・ `unreadColumns` ・ `droppedTaskNames` ・ `openedFileName` | いまの `let` と同じ型（`frame-loop.ts:1864` ・ `:1908`〜`:1910`） | 同上 |
| 副作用 8 つ | `{ type: '…' }` と引数（`raiseNotice` は `RS-27`、`raiseFlowSurface` は `U-56` ／ `U-61` ／ `U-62`）。読んだ文書・継続はシェルの文脈が持つ | 同上 |

## 改訂の記録

| # | 日付 | 何を変えたか | 理由 |
|---|---|---|---|
| 1 | 2026-09-21 | 起草（`d54f5ec1`） | —— |
| 2 | 2026-09-21 | 波 A を当てた（`d54f5ec1` の上、ブランチ `sm-fileflow-a`）。原稿に領域 `fileFlow`（出来事 16、機械 2、状態 9、升 38、根の升 3）と、画面の値の出来事 `screen/flowSurfaceAnswered` ・ `openSurfaceStateMachine` の `open` × それ → `closed` の 1 升を足した。生成物に 表 T-290 ・ 図 F-036。`file-flow-values.ts`（`UF-89`）、根の合成、`screen-values.ts` の 1 関数 | 第 3.1 節 |
| 3 | 2026-09-21 | 出来事 `newDocumentEntryPressed` に運ぶ値 `hasStartupTemplate` と `question` を、`documentFileRead` と `openChoiceAnswered` に `question` を足した（付録 A は「—」「`openChoice`」だけだった） | ガード `hasStartupTemplate` の式はコードが持つが、読む値が要る。`questionAsked` は `question` を運ぶのに、`QN-5` の挙げる名前（操作を始めた時点の文書の名）はユニットが文書を読まずには作れない（`SF-10`、`CS-4`）—— 呼び手（`SF-8`）か副作用の実行が詰める |
| 4 | 2026-09-21 | `confirmationStateMachine` の `documentFileRead` の 2 升に `{in: fileOperationStateMachine.readingDocumentFile}` を足した | `openChoiceAnswered` の升が `{in: … awaitingOpenChoice}` を持つのと揃え、待っていない所へ届いた古い結果が問いを立てないことを表に書く（付録 C.1 の ⭐「古い結果は何もしない」） |
| 5 | 2026-09-21 | 根の升 `documentOpenLanded` の 2 枝とも、`openedFileName` は名が運ばれたときだけ書き換える（`null` なら今の名のまま）とした。`flowSurfaceClosed` で `droppedTaskNames` がもう空なら同じ参照を返す | 決定 11 の「`documentOpenLanded` の `openedFileName` は `null` を詰める（`DFC-574`）」を、名を消さずに今の振る舞いを写す形で読んだ。空を空へ書くのは変化なし（`SD-3`） |
| 6 | 2026-09-21 | 型は付録 E の見込みから次のように決めた: `openRoute` は `'chooser' \| 'drop' \| 'reopen' \| 'handed'`（出来事が運ぶのは `handed` 以外）。`openChoice` ・ `mergeMapping` ・ `mergeCandidates` ・ `question` は `ImportDocument` ・ `ScreenRenderer` の型と同じ形の写し（`FileFlowOpenChoice` ほか）。`owedAction` は `{kind: changeDocument; writes; created}` ／ `{kind: startNewDocument}` で、`writes` は `{ kind: string }` の束の列、`created` は `unknown` とした。面の名は `U-56` ・ `U-61` ・ `U-62`（画面の値が `U-60` を面の名に使うのと同じ） | `UseCase` は `Adapter` の型を読めない（表 T-061）。`EditDocument` の `DocumentCommand` を読むと、図に無い辺 `AdvanceScreenSession` → `EditDocument` ができる（検査 59）—— ユニットは束を読まずに返すだけなので、シェルが波 B で絞る。⚠️ いまのシェルは面を `Open Chooser` などの字で持つ —— 波 B で呼び手が写す |
| 7 | 2026-09-21 | 生成器 `state_machines_json_to_md.py` の `covers_every_case` が、同じ機械の `{in: …}` の項を「機械はちょうど 1 つの葉にいる」として読むようにした（あり得ない真偽の組を場合に数えない） | `idle` × `documentOpenAsked` ・ `documentFileWriteAsked` の 2 枝（`notAsked` にいる ／ `questionAsked` にいる）はすべての場合を覆うのに、前の形は「それ以外 → —」を偽って刷った。画面の値・通知・身振りの生成物は 1 行も変わらない（当てる前に `--check` で確かめた）。単体試験 `tests/unit/uf-89-the-file-flow-transition-table-is-printed-from-the-manuscript.test.ts` に 2 件 |
| 8 | 2026-09-21 | 仕様だけを読む契約試験 `tests/contract/state-machine-file-flow.contract.test.ts` と、画面の値の契約試験の新しい出来事の行は、当てた体が書かなかった。いまの画面の値の契約試験は新しい出来事を足した後も緑である | `RA-6`。当てた後に別の体が書く |
| 9 | 2026-09-21 | 第 8 節の候補 5 ・ 6 ・ 7 を `defects.md` に `DFC-689` ・ `DFC-690` ・ `DFC-691` として書いた（どちらが正かは選ばない。状態は `未検討` ・ `仕様待ち` ・ `未検討`）。候補 2 は `DFC-459` が持つと確かめ、行を足さなかった。候補 1 ・ 3 ・ 4 は既存の行のまま | 本巡の依頼が当てる体に書かせた。番号は当てる直前に `docs/development-records/` の全ファイルを引いて決めた（上端 `DFC-688`） |
| 10 | 2026-09-21 | 第 7 節の予測を測った: md-checks は `tables=178 figures=22 rows=2224 uids=162` → `tables=179 figures=23 rows=2225 uids=162`。原稿は 4 領域 ・ 機械 18 ・ 状態 53 ・ 出来事 57 ・ 升 127 ＋ 根の升 5。表 T-075 は 85 → 86、`units.contract.test.ts` も 86、`changelog.md` の版 0.29 は「（5）」→「（6）」 | 予測どおり |
| 11 | 2026-09-21 | 第 9 節の `handoff-state-machine.md` と `refactor-stage1-state-inventory-2026-09-13.md` は書かなかった。`CR-436` には改訂の記録を 1 行だけ足した（画面の値の出来事と升を足したこと） | どちらも前に立つ者の持ち物。`CR-436` の本文は書き換えない（第 9 節） |
