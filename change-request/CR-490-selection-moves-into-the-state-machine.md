# CR-490 — 選択を状態機械へ移す（段 7 の第 7 領域）と、他に状態として持つべきもの

> ⭐ **状態: 波 A を当てた（2026-09-21、ブランチ `sm-selection-a`、`d978c130` の上）。波 B ・ 波 C は当てていない。** 第 1 稿（「状態機械を作らない」）は利用者の裁定 `JDG-289`（`docs/development-records/rulings.md` に記録した —— 決定 1）で退けた。
> ⭐ 当てた体が草案から変えたところは、末尾の改訂の記録の 3 以降に並べた。第 0 〜 11 節と付録は草案の文のまま残した —— 当てた形の全数は 表 T-293 が持つ。
> 読んだ木: `d978c130`（ブランチ `refactor`）。作業木の変更は `dist/index.html` ・ `docs/development-records/defects.md` ・ `docs/development-records/measurements/stats.jsonl` の 3 つで、本書が引く `src/` と `docs/spec/` は動いていない（`git status --short`）。**本書の行番号と数は、断りが無いかぎりこの木で 2026-09-21 に自分で測ったものである。**
> 型板は `CR-480`（最新の小さな領域）・`CR-470`（領域を立てない判断の形）・`CR-460`。名前の規則は `docs/development-rules/07-review-standards.md` の「状態機械（State Machine）」の節（`:296`〜）と R4.4（`:605`）。
>
> **結論（先に書く）: 小さな領域 `selection`「選択」を 1 つ立てる —— 状態機械 1 つ（`selectionStateMachine`）・状態 2・出来事 11（うち機械を動かす 7、根だけを書き換える 4）・升 9 ＋ 根の升 4。** 機械は画面の値の `armModeStateMachine` と**直交**する（別の領域なので根の合成 `SF-8` でそうなる）。
> 選んだ対象の集合は `objectsSelected` が運ぶ。行の集合・担当者の集合・写したものは根の運ぶ値とする（決定 3〜5）。
> ⭐ **この領域の升は、どこも今日のコードを写す**（決定 8 ・ 9）。仕様がコードと違う所（`CR-437` の刈り ——`DFC-683`、`Esc` の段が行を数えるか —— 第 8 節の候補 1）は原稿に入れず、台帳に残す。
> ⭐ 第 11 節「他に状態として持つべきもの」で、編集器全体を変数と編集の使い方の両方から洗った（利用者の追加の指示）。
>
> **閉じるもの**:
> - 計画の記録 4 の移す順の 6 番目の 2 つ目「選択」（`docs/development-records/refactor-plan-report-2026-09-13.md:253`、領域の例は `:243`）。
> - 棚卸しの「選択 4 ／ 4 ／ 4」（`docs/development-records/refactor-stage1-state-inventory-2026-09-13.md:208`、行 `:43` ・ `:64` ・ `:65` ・ `:66`）と、記録 4 の領域をまたぐ読み（同 `:223` ・ `:224` ・ `:231` ・ `:233` ・ `:234` ・ `:235` ・ `:240`）の行き先。
> - `CR-436` が先送りした袋の 2 欄 `selectedGroupIds` ・ `selectedResourceUids`（`change-request/CR-436-the-screen-values-move-into-the-state-machine.md:221`「移す領域の変更要求が 1 つずつ集約へ移す」）。
> - `PND-142` ・ `PND-143`（`docs/development-records/pending-decisions.md:74` ・ `:75`、`未裁定`）の「置き場」の問いに、集約の根の運ぶ値として答える（行の状態は前に立つ者が判じる）。
>
> **識別子**（規則 02 の 2.5。起草時に `d978c130` で測り、波 A を当てる直前の 2026-09-21 に同じ木で測り直した）:
> - 依頼が配った帯: **表 `T-293`、図 `F-039`、ユニット `UF-122`、変更要求 `CR-490`**。`docs` ・ `change-request` ・ `src` ・ `tests` ・ `tools` ・ `.claude` で `git grep -lw`: `T-293` ・ `UF-122` ・ `CR-490` は 0 件だった（当てる直前にも、本書を除いて 0 件）。`F-039` は帯の取り決めの記述だけ（`CR-450:16`、`CR-460:15`、`handoff-state-machine.md:108` ・ `:110`）で、図としての定義は 0 件だった。
> - 当てる前、見出しが定義する表の上端は `T-292`（`docs/spec/_assets/tbl-state-machines.md:717`）、図は `F-038` だった。表 T-075 は当てる前 87 行で上端 `UF-121`（`grep -c "^| UF-" docs/spec/05-07-design.md`、`SU-3` も 87 ——`:245`）、ファイル名 `selection-values.ts` は 表 T-075 に 0 件だった（`grep -n "selection-values" docs/spec/05-07-design.md`）。波 A の後は 88 行（`SU-3` も 88）。
> - ⚠️ **帯**: `docs/development-records/handoff.md:42` は「`CR-438` 以降のうち `CR-450` ・ `CR-460` ・ `CR-470` を除くもの」を本線の帯とし、`handoff-state-machine.md:109` は「CR の番号は本線のセッションに宣言してから取れ」と書く ⇒ **`CR-490` は本線の帯の中**。当てる前に前に立つ者が本線へ宣言すること（未確認）。`F-039` は状態機械の側の帯の最後の 1 つ。
> - 台帳の上端は当てる直前に（`docs/development-records/` の全ファイル、`fixed-defects.md` を含む）`DFC-694`、`PND-500`、`JDG-288` だった。波 A が本書の裁定を `JDG-289` として記録し、第 8 節の候補を `DFC-695` ・ `DFC-696` ・ `DFC-700` として書いた（`DFC-697`〜`DFC-699` はほかのセッションが取っているので飛ばした。3 つが `defects.md` と `fixed-defects.md` に無いことは書く直前に測った）。`PND-500` は動かしていない。
> - 名の重なり（同じ 6 か所を `git grep -lw`）: `selectionStateMachine` ・ `selectionState` ・ `objectsSelected` ・ `selectedObjects` ・ `pickedObjects` ・ `remainingObjects` ・ `objectsPicked` ・ `emptyAreaClicked` ・ `selectionEscapePressed` ・ `selectionSettleKeyPressed` ・ `selectionCleared` ・ `selectionPruned` ・ `createdTaskSelected` ・ `createdRowSelected` ・ `rowsPicked` ・ `resourcesPicked` ・ `copyTaken` ・ `chosenRows` ・ `chosenResources` ・ `hasPickedObjects` ・ `hasRemainingObjects` ・ `isRungSelection` ・ `SelectionValues` ・ `selection-values` は 0 件。⚠️ `nothingSelected` は `frame-loop.ts:2567` の局所の定数（`exportScene` の中）と同じ字面 —— 状態の名は `selectionStateMachine.nothingSelected` なので重ならない。⚠️ `choiceValues` は `src/adapter/screen-renderer/screen-renderer.ts:158` の欄と重なる ⇒ 型の幹に `Choice` を使わない。
> - 行 ID の接頭辞・要求 ID は立てない。状態・出来事・遷移に通し番号を振らない（`JDG-286`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **波 A はどの `CH-` も直接には前へ進めない —— 基盤の作業である。** 利用者に見える振る舞いを 1 つも変えない（波 A では画面がこの領域を呼ばない）。波 B（結線）も振る舞いを変えない（`JDG-57`、`rulings.md:134`）。

守るもの:
- **`SP-1` 〜 `SP-3`（req:1150 〜 1152）** —— パレットの形状を押した意味は「何も選んでいない ／ 選んでいる」で決まり、どの行でも構える（req:1155「選んでいるものが在ることを理由に、構えを拒んではならない」）。⇒ 構え 6 状態 × 選択 2 状態のすべての組が在りうる（決定 1）。
- **表 T-023c の結びの 2 つの不変条件**（`01-04-requirements.md:2211`〜`:2214` と `:2216`〜`:2222`）。⚠️ 後者（`CR-437` ・ `JDG-288` の「描かれている対象だけ」）はまだ実装されていない（`DFC-683`、`実装待ち`）—— ⛔ 本書は原稿化もしない（決定 9）。
- **`SL-7b` の順序**（req:2208）—— `Selection.ordered`（`src/entity/document-model/selection/selection.ts:22`〜`:25`）は `selectedObjects` の中に乗ったまま運ぶ。
- **`GL-003`** —— 選択の出来事は押下・離す・キー・書き込みの着地だけで作り、ポインタの移動では作らない（`selectionFromInput` は `phase !== 'up'` のポインタで持っている値をそのまま返す —— `input-command-translator.ts:4139`。CR-438 の後は `selection-input.ts`）。性能は `LM-19`。⛔ **測る前に利用者を呼ぶ**（`RISK-001` の門）。

### ② レビュー観点のどの条項を当て、何が出たか

- **R4 「状態機械」の節 ／ R4.4** —— 機械は名詞句 ＋ `StateMachine`（`selectionStateMachine`）、今の状態は `selectionState`。状態は過去分詞（`nothingSelected` ・ `objectsSelected`）。出来事 11 はすべて主語 ＋ 過去形（`objectsPicked` ・ `emptyAreaClicked` ・ `selectionEscapePressed` ほか）で、既存 62 のキーと重なり 0（原稿のキーを並べて照合、スクラッチの `s-sm.py`）。ガードは `is` ／ `has` で始まる 3 つ（`hasPickedObjects` ・ `hasRemainingObjects` ・ `isRungSelection`）。
- **5.5 の原稿の規則**（des:727 ・ 728）—— 要求が名指す状態は「何も選んでいない」（`SP-1`）と「選んでいる」（`SP-2` ・ `SP-3`、`IN-4` の段「選択」、`MK-11` の「選択を解除する」）の 2 つ。「1 つ ／ 複数」（`SP-2` ／ `SP-3`）は運ぶ値の数から導ける（`SF-5` の 2 文目）ので状態を割らない。
- **`SF-5`（des:1013）** —— 写したもの・行の集合・担当者の集合は入力の履歴で決まり、毎回は導けない ⇒ フレームの値ではなく運ぶ値（決定 3〜5）。
- **`SF-8`（des:1016）** —— 別の領域なので `armModeStateMachine` と自ずから直交する。
- **生成器の規則**（`docs/spec/_source/state_machines_json_to_md.py:46`〜`:50` の説明と `shared_event_keys` の `:388`〜`:396`）—— 1 つの出来事のキーを 2 つの領域に置けない。`CR-440` の改訂の記録が「通知の領域に `escapePressed` を足すと `load()` が拒む」とわざと壊して確かめている ⇒ 画面の値の `escapePressed` ・ `settleKeyPressed` を**そのままは使い回せない**（決定 6）。
- **`R4.2`（await 跨ぎ）** —— 4 つの覚えの書き手はどれも同期の関数（第 2 節）。

### ③ 利用者に問うこと・**問わずに決めた**こと

**問うこと: 選択の領域については 0 件**（`JDG-289` で決まった）。第 11 節の終わりに、**別の変更要求に分けるものを 4 つ**挙げた（うち「いま編集している欄」を状態にするかは利用者の判断が要る —— 11.6）。

**決めたこと（決定 1 は利用者の裁定、2 以降は覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | **⭐ 利用者の裁定（`JDG-289`、2026-09-21）: 選択は状態機械を持ち、`armModeStateMachine` と直交させる（2 つの機械）。** 比べた 3 案は次の表 | 利用者の理由: 仕様が 2 つの状態を名指す —— `SP-1`「何も選んでいない」と `SP-2` ・ `SP-3`「選んでいる」（req:1150〜1152）、`IN-4` の段「選択」（req:6804）、`MK-11`（req:3309）。`SP-2` ・ `SP-3` と `IN-4` は構えと選択がすべての組で同時に在ることを求める（6 × 2）—— 直交する機械の典型である。平らにしても入れ子にしても、構えの 6 状態を写すことになる |
| 決定 2 | **状態は `nothingSelected`（初期）と `objectsSelected{selectedObjects}` の 2 つ。** 「1 つ ／ 複数」で割らない | `SP-2` と `SP-3` は同じ押下の結果の範囲が違うだけで、升（どの出来事で何へ移るか）が同じ。数は `selectedObjects` から導ける（`SF-5`、5.5 の des:728） |
| 決定 3 | **`objectsSelected` が運ぶのは 表 T-023c の対象の集合だけ（`selectedObjects`、`Selection` —— 順序 `ordered` を含む）。「何も選んでいない」＝ この集合が空のこと。** 行の集合と担当者の集合は数えない | `SL-1`（req:2200）が行を対象から外し「行の選択は別の集合であり、規則は `FR-085` が持つ」と書く。`FR-085`（req:1582）も「別の集合である」。担当者の集合は `FR-099` の名簿の面の中の集合で、`SL-1` の対象に無い。`SP-1`〜`SP-3` が形状を変える相手はタスク（対象）。いまのコードも `Esc` の段の判定（`input-command-translator.ts:4186`）と `Enter` の解除（`:4128`〜`:4135`）で対象の集合だけを見る。⚠️ `IN-4` の「選択」が行を含むかは仕様の読み方で分かれる ⇒ 第 8 節の候補 1（どちらが正かを選ばない） |
| 決定 4 | **行の集合 `chosenRows` と担当者の集合 `chosenResources` は領域の根の運ぶ値とする**（根の升で書き換える）。機械にしない | `FR-085` は「選べる・複数・解除できる」と能力だけを定め、状態の名を持たない。`FR-099` も同じ。根の運ぶ値と値だけを書き換える根の升は原稿の形が認め、前例が 2 つある（画面の値の `language` ・ `rememberedActuals`、ファイル操作と問いの `openedFileName` ・ `droppedTaskNames` —— `s-sm.py`）。`CR-436:221` の予定どおり集約へ入る |
| 決定 5 | **写したもの `copiedForPaste` は領域の根の運ぶ値とする**（無いこともある）。外（シェル）にも、機械にもしない | 機械にしない: 「写したものを持っているあいだ」を名指す要求が無い（`docs/spec` を「コピーした」「コピーされ」「何もコピー」で引いて 0 件）。写していないときの貼り付けは `RS-27`（req:6438）で断り、値が空であることから導ける。フレームの値にしない: 前の `Ctrl` ＋ `C` の時の選択で決まり、今のフレームからは導けない（`SF-5` に当たらない）。外にしない: 保存しない状態は集約が持つ（ADR-002、des:988、`JDG-59` の「集約型」`rulings.md:136`）。置き場を選択の領域にするのは、計画がこの領域に数え（`refactor-plan-report-2026-09-13.md:243`）、`FR-033` が「選んでコピー」と選択から作るため |
| 決定 6 | **画面の値の出来事のキーを使い回さず、同じ入力から選択の領域の出来事を呼び手が作る**（1 つの入力 → 2 つの出来事） | 生成器が 2 つの領域に同じキーを置くことを拒む（第 0 節 ②）。前例: `CR-480` の決定 8（`fieldEntry/choiceMoved` と `screen/selectionMoved`）、`CR-450` の 2.1、`CR-460` の決定 7。⚠️ 依頼は「`screen/escapePressed` を使い回せ」と書いたが、上の規則で成り立たない —— 形（運ぶ値 `rung` と段のガード）だけを写した |
| 決定 7 | **`Esc` の段の順（構え → 選択）は呼び手が詰める `rung` のまま持つ。** 選択の領域の `selectionEscapePressed{rung}` は、ガード `isRungSelection` が真のときだけ `objectsSelected → nothingSelected` | 画面の値が既に同じ形である（`escapePressed{rung}` と `isRungArmed` ・ `isRungSurface` ・ `isRungDualCursor` ・ `isRungTooltip` —— 原稿 `:676` ・ `:1208` ・ `:1769` ・ `:1935`）。段の順の正は `IN-4`（req:6804）と表 T-283 の予定（`CR-436` の波 B2）が持つ（表 T-250 の `SD-4`） |
| 決定 8 | **`Enter` の解除（`SK-19` の最後の段）は `selectionSettleKeyPressed` とし、「通知も確定していない編集も無く、パネルも出していない」ときだけ呼び手が送る** | `SK-19`（req:4166）「プロパティパネルも出していないときは、選ばれているものがあればその選択を解くこと（MUST）」。いまのコード `selectionFromInput` の `:4128`〜`:4135`（CR-438 の後は `selection-input.ts`）。パネルの状態は画面の値の機械で、`{in: …}` は同じ領域の中しか書けない（生成器の説明 `:36`〜`:37`）⇒ 呼び手が詰める（`CR-480` の決定 7 と同じ筋） |
| 決定 9 | **刈る時機は今日のまま —— 書き込みが着地したときだけ（`selectionPruned`）。`CR-437` の「表示の切り替えで描かれなくなった対象を刈る」は原稿に書かない** | `JDG-57`（移してから直す）。いまのコードは `holder.replace`（`frame-loop.ts:1938`〜`:1939`）でしか刈らない。⚠️ `CR-480` は機械が仕様を写し、いまのコードと違った（`DFC-694`）—— 本書はそれを繰り返さない。表示の切り替えの入口は `DFC-683` の直し（波 C）が `selectionPruned` の出どころに足す |
| 決定 10 | **作ったタスクを選ぶこと（`FR-001`、`FR-091`）は `createdTaskSelected`、作った行を選ぶこと（`HF-14`）は根の `createdRowSelected`** | いまのコード `standOnWhatWasCreated`（`:4061`〜`:4079`）。名前付けと入力欄の `fieldEntry/creationLanded` と同じ着地から呼び手が作る（決定 6）。源の種類（副作用の結果）が選び方の押下（入力）と違うので、出来事を分けた（スキーマは源の種類を 1 つしか書けない ——`state-machines.schema.json:114`〜`:124`） |
| 決定 11 | **行と対象の混ぜ方（`PND-449`）と、写せる選び方を決めない。** 呼び手はいまの `copyForPaste`（`:3695`〜`:3709`）の条件のときだけ `copyTaken` を送る | `pending-decisions.md:312`、`未裁定`。`JDG-78` |
| 決定 12 | **表 T-075 の新しい行 `UF-122` の「負う要求」は `—`** | `CR-440` ・ `CR-450` ・ `CR-460` ・ `CR-480` の決定と同じ。波 A では画面がこのユニットを呼ばない |
| 決定 13 | 識別子: 表 `T-293`、図 `F-039`、`UF-122`、ファイル `selection-values.ts` | 依頼の帯 |

**決定 1 で比べた 3 案**（構えの機械は 6 状態 —— `notArmed` ・ `taskShapeArmed` ・ `milestoneShapeArmed` ・ `dependencyArmed` ・ `commentBoxArmed` ・ `highlightBoxArmed`、原稿を読んだ）:

| 案 | 形 | 状態の数 | 得るもの | 代償 | 裁定 |
|---|---|--:|---|---|---|
| 平ら | 構え × 選択の積を 1 つの機械に | 12 | 組が表に全部見える | 構えの升（`armEntryPressed` ・ `escapePressed` ほか）を 2 倍に写す。構えの原稿（`CR-436`）を書き換える。組は一つも禁じられていないので、積にする理由が無い | 退けた |
| **2 つの機械** | `armModeStateMachine`（6）と `selectionStateMachine`（2）を直交に | **8** | どちらの升も相手を知らない。構えの原稿を 1 字も変えない。`SP-1`〜`SP-4` の「どの行でも構える」がそのまま成り立つ | 組を 1 つの表で見られない —— 契約試験（3）が 6 × 2 の組で直交を確かめる | **採った（`JDG-289`）** |
| 入れ子 | 選択の各状態の下に構えの 6 状態（または逆） | 12 の葉 | 親の升で一方を一度に書ける | 構えの 6 状態を 2 度写す。入れ子は「親が無いと子が無い」依存のためのもので、ここに依存は無い | 退けた |

---

## 1. 測った事実（`d978c130`、2026-09-21）

| 数 | 値 | 測り方 |
|---|---|---|
| `frameLoop` の範囲 | 1799〜4414 行（ファイルは 4492 行） | `grep -nE "^(export )?(async )?function frameLoop"` と、その後の最初の `^}` |
| `frameLoop` が直に持つ `let` | 66（うちこの領域 4: `:1815` ・ `:1869` ・ `:1870` ・ `:1876`） | `sed -n '1799,4500p' … \| grep -c "^  let "` |
| 棚卸しとの差 | 棚卸しは 4（`refactor-stage1-state-inventory-2026-09-13.md:208`）。差 0 | 名前で照合 |
| 原稿の今 | 5 領域・機械 20・状態 57・出来事 62・升 136 ＋ 根の升 6 | スクラッチの `s-sm.py` |
| 原稿が既に持つ選択の受け口 | 画面の値: `screen/selectionMoved`（源「ほかの領域: 選択」、運ぶ値 `subject`）・`screen/propertiesOfChoiceAsked`（`subject`）、`propertiesPanelContentStateMachine.selectionDisplayed`（運ぶ値 `subject` ＝ 選択と行の集合）、副作用 `clearSelection`（`screen/createdNameSettled` の升 3 つ）。名前付けと入力欄: `fieldEntry/choiceMoved`（源「ほかの領域: 選択」） | `state-machines.json:327`〜`:360`、`:1369`〜`:1394`、`:1514`〜`:1556`、`:4165`〜`:4173` |
| 草案の原稿を生成器に通した | `load()` の問題 0。表 T-293 と図 F-039 を刷れた。6 領域・機械 21 | スクラッチの `s-try-gen.py`（原稿の写しに付録 D の領域を足し、`SRC` を写しへ向けて `load()` と `build()` を呼んだ。刷った節は `s-selection-printed.md`。木には何も書いていない） |
| md-checks の最終行 | `tables=180  figures=24  rows=2226  uids=162` | 第 7 節 |

---

## 2. 棚卸しの測り直しと分類

分類は `SF-5`（des:1013）、`SF-6`（des:1014）、`SF-10`（des:1018）と 5.5 の原稿の規則（des:727）を当てた。読み書きは `\bname\b` を `frameLoop` の範囲で行ごとに拾い、注釈の行（`:1877` ・ `:2826` ・ `:4004` ・ `:4054` ・ `:4272`）を除いた。

| # | 覚え | 所在 | 書き手 ／ 読み手 | 分類 | 名指す仕様の行 |
|---|---|---|---|---|---|
| 1 | `selection` | `frame-loop.ts:1815` | 書き（4）: `holder.replace`:1939（刈る）、`settleTextEntry`:3898（`FR-091`）、`standOnWhatWasCreated`:4066、`receiveInput`:4210（`selectionFromInput`）。読み（16）: `holder.replace`:1938、`runFrame`:2170 ・ 2206 ・ 2228、`focusWantedField`:2283、`nameFieldWantedUnder`:2921、`wantFieldFocused`:2928、`endCreatedNamingIfChosenMoved`:2938、`readSnapshot`:2769、`collectInputContext`:3032、`copyForPaste`:3701、`showPropertiesOfChoice`:4051 ・ 4056、`owesFrame`:4095 ・ 4106、`receiveInput`:4209 ・ 4274 ・ 4319 | **状態** `selectionStateMachine.nothingSelected` ／ `objectsSelected` ＋ **運ぶ値** `selectedObjects` | `SP-1`〜`SP-3` req:1150〜1152、表 T-023c req:2196〜2222、`MK-11` req:3309、`IN-4` req:6804、`UN-9` req:2127 |
| 2 | `selectedGroupIds` | `:1869`（`@provisional PND-142`） | 書き: `chooseRow`:3972 ・ 3974 ・ 3976、`standOnWhatWasCreated`:4075。読み: `runFrame`:2253、`focusWantedField`:2283、`nameFieldWantedUnder`:2921、`wantFieldFocused`:2929、`copyForPaste`:3697 ・ 3698 ・ 3704、`pasteCommandFor`:3760 ・ 3772、`chooseRow`:3970、`showPropertiesOfChoice`:4051 ・ 4056 | **運ぶ値**（根）`chosenRows` | `FR-085` req:1579〜1583、`FR-042` req:2002、`FR-033` req:2402 |
| 3 | `copiedForPaste` | `:1870`〜`:1873` | 書き: `copyForPaste`:3698 ・ 3705。読み: `pasteWhatWasCopied`:3714 | **運ぶ値**（根）`copiedForPaste` | `FR-033` req:2365、`SK-4` ・ `SK-5` req:4169 ・ 4170、`RS-27` req:6438 |
| 4 | `selectedResourceUids` | `:1876`（`@provisional PND-143`） | 書き: `chooseResources`:3986、`toggleChosenResource`:3992。読み: `runFrame`:2254、`answerSettledEntry` の `IC-66`:3627、`toggleChosenResource`:3991 | **運ぶ値**（根）`chosenResources` | `FR-099` req:2319、`AS-6` req:2067、`IC-66` glo:593 |
| 5 | 「何か選ばれているか」 | 式が 3 か所 | `showPropertiesOfChoice`:4051、`properties-panel.ts:753`、`screen-values.ts:1173`（`hasChoice`） | **フレームの値**（導ける） | `FR-072` req:1873〜 |
| 6 | 「1 つ ／ 複数」 | `properties-panel.ts:548`〜`:552`（`subjectOf`） | 描き手が導く | **フレームの値**（決定 2） | `SP-2` ・ `SP-3` |
| 7 | 「最後に選んだもの」 | `lastPicked`（`selection.ts:77`〜`:81`） | 整列が読む | **フレームの値** | `SL-7b`、`FR-034` req:2430 |
| 8 | `selectionWithinSchedule` | `frame-loop.ts:607`〜`:613` | `holder.replace`:1939 | **外** —— 刈る純粋関数。`selectionPruned` の運ぶ値を組む | 表 T-023c の結び req:2211〜2214 |
| 9 | `selectionFromInput` | `input-command-translator.ts:4113`〜`:4177`（CR-438 の後は `selection-input.ts`、公開名は同じ） | `receiveInput`:4210 | **外** —— 入力の翻訳係（段 5）。`objectsPicked` の運ぶ値と、`emptyAreaClicked` ・ `Esc` ・ `Enter` のどれに当たるかを組む | 表 T-023c、`SK-2`、`MK-11`、`IN-4`、`SK-19` |

⇒ **覚え 4: 状態 1 組（機械 1）、運ぶ値 4（`selectedObjects` と根の 3）、導ける値 3、外 2（関数）。**

### 2.1 領域をまたぐもの

| 読む側 ／ 書く側 | いま | 移した後 |
|---|---|---|
| 選択が文書に従う（刈る） | `holder.replace`:1933〜1944（棚卸し `:233`） | 呼び手が `selectionWithinSchedule` で刈った値を `selection/selectionPruned{remainingObjects}` で送る。変わったら `fieldEntry/choiceMoved` と `screen/selectionMoved{subject}` も同じ入力から作る（`CR-480` の 2.2 の 2）。⚠️ 行の集合は刈らない（いまのまま —— 第 8 節の候補 2） |
| 資源の削除が問いを読む（`IC-66`） | `answerSettledEntry`:3622〜3627（棚卸し `:234`） | `asking` はファイル操作と問いの `confirmationStateMachine` の今の状態（`questionAsked`）を呼び手が読む（`CR-460` の波 B）。消す相手は根の `selection.chosenResources` |
| 名前付けの場面 | `endCreatedNamingIfChosenMoved`:2937〜2939（棚卸し `:235`） | `fieldEntry/choiceMoved`（`CR-480`）。本書は足さない |
| パネルが選択を読む | `showPropertiesOfChoice`:4049〜4057、`receiveInput`:4274〜4276（棚卸し `:231`） | `screen/propertiesOfChoiceAsked` ・ `screen/selectionMoved` の `subject`（`{ selection; groupIds }` —— `screen-values.ts:14`〜`:17`）を、根の `selection.selectionState` の `selectedObjects`（空なら空）と `chosenRows` から呼び手が組む。⭐ 画面の値の原稿は変えない |
| `Esc` の段 | `escapeTarget`（`screen-state.ts:137`）が `isSelectionStanding`（`input-command-translator.ts:4186`）を読む | 段の判定は根の `selection.selectionState` が `objectsSelected` かで詰める（2.2 の 2） |
| フレームを負うか | `owesFrame`:4095 ・ 4106（棚卸し `:223`） | 根の参照の比べに畳まれる（`CR-436` の波 B2 の形） |
| 翻訳係の文脈 | `collectInputContext`:3032 → `InputContext.selection`（`input-command-translator.ts:141`）（棚卸し `:224`） | 根から詰める（2.2 の 2） |
| 描き手・書き出し・Agent API の写し | `runFrame`:2170 ・ 2206 ・ 2228 ・ 2253 ・ 2254、`readSnapshot`:2769（棚卸し `:240`） | 根から読む |

### 2.2 申し送り

| # | 相手 | 中身 |
|---|---|---|
| 1 | `CR-436` の波 B2 | 袋の 2 欄 `selectedGroupIds` ・ `selectedResourceUids` は根の `selection.chosenRows` ・ `chosenResources` から読む（`CR-436:221` の予定どおり）。`Esc` と `Enter` の 1 つの入力から、画面の値と選択の領域の 2 つの出来事を作る |
| 2 | 段 5（`CR-438`） | `InputContext.selection`（型 `Selection`）の名と型を保てば、波 B は詰め方だけを変える。`selectionFromInput` が「どの出来事か」（選び方・空の場所・`Esc`・`Enter`）を返せると呼び手が楽になる —— 割り方は段 5 が決める |
| 3 | `DFC-683` の直し | 表示の切り替えの刈る入口は `selectionPruned` の源に足す（決定 9） |

---

## 3. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A** | なし（いま当ててよい）。段 5・段 6 と並行してよい。⚠️ `CR-490` を本線に宣言してから | `docs/spec/_source/state-machines.json`（領域 `selection` を足す —— 付録 D。ほかの領域は 1 字も変えない）、生成物 `docs/spec/_assets/tbl-state-machines.md`（表 T-293 ・ 図 F-039）、`src/use-case/advance-screen-session/selection-values.ts`（新、`UF-122`）、`advance-screen-session.ts`（根への合成、`RA-5`）、`docs/spec/05-07-design.md`（5.5 の 1 文、`CP-39`、`UT-11`、`PI-39`、`SU-3` 87 → 88、`UF-122`、図 F-028、`SS-6`）、`tests/contract/state-machine-selection.contract.test.ts`（新。**仕様だけを読む別の体** ——`RA-6`）、`tests/unit/uf-122-the-selection-transition-table-is-printed-from-the-manuscript.test.ts`、`check-provenance.py` の 1 行、`units.contract.test.ts` の数、`changelog.md` の版の数、`03-implementation.md` の生成定数 | `CR-480` の 3 節と同じ組（18 ・ 19 ・ 21 ・ 26b ・ 27 ・ 30 ・ 33 ・ 59 ・ 60 ・ 61 ・ 62 ＋ vitest）。⚠️ 検査 11 ・ 12 ・ 33 は `FAIL` の行を出さずに赤くなる —— 出力の全体を当てる前の走りと比べる |
| **B** | 段 5 と段 6 が済み、`CR-436` の波 B2 が当たっている | `frame-loop.ts` の 4 つの `let` を根の `selection` へ。書き手 9 か所を出来事に（`holder.replace` → `selectionPruned`、`settleTextEntry` → 副作用 `clearSelection` の結果 `selectionCleared`、`standOnWhatWasCreated` → `createdTaskSelected` ／ `createdRowSelected`、`receiveInput` → `objectsPicked` ／ `emptyAreaClicked` ／ `selectionEscapePressed` ／ `selectionSettleKeyPressed`、`chooseRow` → `rowsPicked`、`chooseResources` ・ `toggleChosenResource` → `resourcesPicked`、`copyForPaste` → `copyTaken`）。**今日の振る舞いを写す**（決定 9 ・ 11） | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部、`LM-19`（⛔ **利用者を呼んでから**） |
| **C**（B の直後の別のコミット） | 波 B で一致を確かめた後（`JDG-57`） | 第 8 節の候補と `DFC-683` ・ `DFC-541` のうち、台帳で直すと決まったもの | 同上 |

⭐ `frameLoop` の `let` は波 B で本書の分 66 → 62（⛔ 波 B の入口で測り直す）。

### 3.1 波 A の中身

| 対象 | いま | 案 |
|---|---|---|
| 原稿 | 5 領域 | 領域 `selection` を足す（出来事 11、機械 1、状態 2、升 9、根の升 4） |
| 生成物 | 5 領域 | ＋ 節「選択（`selection`）」: 表 T-293、図 F-039（`s-selection-printed.md` が刷った形） |
| 5.5 の散文（`05-07-design.md` の第 5 領域の文の次） | 5 文 | 「第 6 領域（選択）のそれらを同じファイルの 表 T-293 に、状態遷移を 図 F-039 に示す。」（⛔ 変更要求の番号を仕様に書かない。「部品」を使わない） |
| `CP-39`（`:144`） | 「… / 表 T-292」 | ＋「/ 表 T-293」 |
| `UT-11`（`:337`） | 「… ／ `field-entry-values.ts`」 | ＋「／ `selection-values.ts`」、表の括弧に「選択は 表 T-293」 |
| `PI-39`（`:543`） | 「… ・名前付けと入力欄の 5 領域」 | 「… ・選択の 6 領域」、出来事・副作用・初期の欄に 表 T-293 |
| `SS-6`（`:1114`） | 「… ・ 表 T-292 の状態の一覧の初期」 | ＋「・ 表 T-293」 |
| 図 F-028 | 5 領域の実線 | ＋「領域 selection<br>選択（表 T-293）」の実線 |
| 表 T-075 | 87 行（上端 `UF-121`、`:460`） | `UF-122` ／ `AdvanceScreenSession` ／ `selection-values.ts` ／ `pure` ／ 「選択の領域の遷移（表 T-293）と、そこから生成した型と遷移表の定数の区画」／ `—`（決定 12）。`UF-121` の後 |
| `SU-3`（`:245`） | 87 | 当てる時の 表 T-075 の行の数（いまなら 88） |
| `selection-values.ts` | 無い | 生成区画、`emptySelectionValues`、`stepSelectionValues`。⛔ モジュールスコープの可変状態を置かない（`SF-7`、検査 61） |
| `advance-screen-session.ts` | `ScreenSession { screen; notices; gesture; fileFlow; fieldEntry }`（`:46`〜`:52`） | ＋ `selection: SelectionValues`。`SessionEvent` ・ `SessionEffect` を 6 領域の和に、`emptyScreenSession` を広げ、`IS_SELECTION_EVENT` を既存の形で足す。⚠️ 検査 60 の帯に収める |
| 契約試験 | 無い | 原稿の領域 `selection` を読み、(1) 各升目の先の種類が表と一致（ガード 3 つの真偽を両方作る）、(2) 空の升目は同じ参照と共有の空の列（`SD-3`）、(3) **`armModeStateMachine` との直交 —— 構え 6 × 選択 2 の 12 の組で、選択の出来事が構えを同じ参照に残し、構えの出来事が選択を同じ参照に残すこと**、(4) 根の升が運ぶ値だけを書き換え機械を同じ参照に残すこと、(5) この領域の出来事がほかの 5 領域を同じ参照のまま残すこと（`SS-5`）。⭐ 書くのは仕様だけを読む別の体 |

---

## 4. この結論を覆すもの

- **`IN-4` の「選択」が行の集合を含むと裁定されたとき**（第 8 節の候補 1）—— `chosenRows` を根から機械の運ぶ値へ上げ、「何も選んでいない」を 2 つの集合がともに空のことへ広げる。升は `rowsPicked` の分だけ増える。
- **`PND-449` が「行と対象を同時に選べない」と裁定したとき** —— 状態が「行を選んでいる」を持つ 3 状態になる。
- **表示の切り替えで刈る（`DFC-683`）を直すとき** —— `selectionPruned` の源の行に `FR-049` が加わる。升は変わらない。

---

## 5. 問いの候補に打った 3 つの反証（`handoff.md` §0.2）

方法: (1) `docs/development-records/rulings.md`（527 行）を grep、(2) `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <行>`、(3) 仕様・計画・前の裁定・前の変更要求から導けるか。

| 候補 | (1) | (2) | (3) | 結果 |
|---|---|---|---|---|
| 機械を持つか、どの形か | `JDG-289`（本巡の利用者の裁定。波 A で記録した） | `FR-081` → 要求 2 ／ 参照 3 | 裁定で決まった | 決定 1 |
| 「何も選んでいない」が行・担当者を含むか | `selectedGroupIds` ・ `selectedResourceUids` 0 件 | `FR-085` → 要求 15 ／ 参照 34、`FR-099` → 5 ／ 20、`IN-4` → 9 ／ 36 | **導けた（含まない）** —— `SL-1` と `FR-085` が「別の集合」と書き、いまのコードも対象だけを見る。⚠️ `IN-4` は限定しない ⇒ 台帳の候補 1（問いにはしない —— 2026-09-13 の裁定） | 決定 3 |
| 写したものの置き場 | `copiedForPaste` 0 件、`FR-033` 1 件（`JDG-273`、写しの日付の話） | `FR-033` → 要求 4 ／ 参照 12 | **導けた（根の運ぶ値）** —— ADR-002 ・ `JDG-59` が保存しない状態を集約に、5.5 が名指されない状態を運ぶ値に置く | 決定 5 |
| 画面の値のキーを使い回すか | `escapePressed` 0 件 | `IN-4` → 9 ／ 36 | **導けた（使い回せない）** —— 生成器の規則と `CR-440` の壊し試験 | 決定 6 |
| `CR-437` の刈りを入れるか | `JDG-288` 1 件（仕様の着地だけ） | `FR-081` → 2 ／ 3 | **導けた（入れない）** —— `JDG-57`、`DFC-694` の教訓 | 決定 9 |
| `SP-2` と `SP-3` を割るか | `SP-2` ・ `SP-3` 0 件 | —— | **導けた（割らない）** —— 升が同じ、数は導ける | 決定 2 |

⇒ **3 つとも空だった候補は 0 件。選択の領域について問いは無い。**

---

## 6. 継ぎ目（体に渡すときは両方のブリーフに同じ字面で書く）

- 領域のキー `selection`、名「選択」、型の幹 `SelectionValues`、ファイル `selection-values.ts`、公開は `emptySelectionValues` ・ `stepSelectionValues` と生成した型・定数。
- 機械 `selectionStateMachine`（今の状態 `selectionState`）: `nothingSelected`（初期）・ `objectsSelected`（運ぶ値 `selectedObjects`）。
- 根の運ぶ値（3）: `chosenRows` ・ `chosenResources` ・ `copiedForPaste`。
- 出来事（11）: 機械を動かす `selection/objectsPicked`（`pickedObjects`）・ `emptyAreaClicked` ・ `selectionEscapePressed`（`rung`）・ `selectionSettleKeyPressed` ・ `selectionCleared` ・ `selectionPruned`（`remainingObjects`）・ `createdTaskSelected`（`createdTaskUid`）。根だけの `rowsPicked`（`chosenRows`）・ `createdRowSelected`（`createdGroupId`）・ `resourcesPicked`（`chosenResources`）・ `copyTaken`（`copiedForPaste`）。
- ガード（3）: `hasPickedObjects` ・ `hasRemainingObjects` ・ `isRungSelection`。`{in: …}` 0。副作用 0。
- 根: `ScreenSession { …; readonly selection: SelectionValues }`。

---

## 7. 数の予測

**起草時（`d978c130`）: `tables=180  figures=24  rows=2226  uids=162`。** 本書の差だけを突き合わせる。

| | 波 A | 内訳 |
|---|--:|---|
| tables | +1 | 表 T-293 |
| figures | +1 | 図 F-039 |
| rows | +1 | `UF-122` |
| uids | 0 | 要求を足さない |

**波 B**: 0 ・ 0 ・ 0 ・ 0。**そのほか**: 表 T-075 87 → 88、`units.contract.test.ts` 87 → 88、原稿は 6 領域 ・ 機械 21 ・ 状態 59 ・ 出来事 73 ・ 升 145 ＋ 根の升 10（`s-try-gen.py` で確かめた機械の数 21）。

---

## 8. 台帳の候補（⛔ 問いではない。どちらが正かを選ばない）

2026-09-13 の利用者の裁定に従う。番号は書く直前に引き直す（2026-09-21 の上端 `DFC-694`）。⚠️ **どれも未検証（画面で押していない。コードを読んだだけ）。**

| # | 食い違い | 片側 | もう片側 | 台帳の今 |
|---|---|---|---|---|
| 1 | **`Esc` の段「選択」と `Enter` の解除が行の集合を数えず、解きもしない** —— 行だけを選んでいるとき、段の判定は選択が立っていないと答え（`input-command-translator.ts:4186`）、`Esc` ・ `Enter` で空にするのは対象の集合だけ（`selectionFromInput` の `:4121`〜`:4135`。CR-438 の後は `selection-input.ts`）。`selectedGroupIds` を空にする書き手は無い（`frame-loop.ts:3972` ・ `:3974` ・ `:3976` ・ `:4075` の置き換えと増減だけ）。本書の機械もこの形を写す（決定 3） | `IN-4` req:6804（段「選択」に限定なし）、`SK-19` req:4166（「選ばれているものがあれば」）、`FR-085` req:1580（「選択を解除できること」） | 同上 | 0 件 ⇒ **`DFC-695`** として書いた（決まっていないことなら `PND-` 向き —— 台帳で判じる） |
| 2 | **行が文書から消えても、選んだ行の集合から落ちない** —— `holder.replace` が刈るのは対象の集合だけ（`frame-loop.ts:1938`〜`:1939`）。消えた行を選んだまま貼ると、在らない行の ID を貼り付け先に渡す（`pasteCommandFor`:3772）。⚠️ 実在の不変条件（req:2211）は 表 T-023c の集合についての文 —— 仕様の空白かもしれない | `FR-033` req:2402、表 T-023c の結び req:2211（類推） | 同上 | `DFC-541` ①（担当者の集合の同じ形、`defects.md:115`）⇒ **`DFC-696`** として書いた（`DFC-541` への追記にはせず、行の集合の別行とした） |
| 3 | **仕様の中の食い違い: `IN-4` の理由の文が「タスクを選ぶと `FR-006` によりパネルが立つ」と書き（req:6804）、`FR-072` は「表 T-023c の選択が動いたことだけを理由に、パネルを出し始めてはならない（MUST NOT）」と書く（req:1885）** —— いまのコード（`receiveInput`:4274 は出しているときだけ中身を移す）と画面の値の原稿（`selectionMoved` の升は `selectionDisplayed` の上だけ、`state-machines.json:1514`〜`:1527`）は `FR-072` の側 | `IN-4` req:6804 の注 | `FR-072` req:1885 | 0 件 ⇒ **`DFC-700`** として書いた |

⚠️ 既に在る関係の行（本書は直さない）: `DFC-683`、`DFC-541`、`DFC-694`、`PND-142` ・ `PND-143` ・ `PND-144` ・ `PND-449` ・ `PND-492`（`未裁定`）。
⚠️ 台帳に載せないもの（仕様に片側が無い。`JDG-78`）: 写したものは別の文書を開いても消えない（書き手は `:3698` ・ `:3705` だけ）。貼るときに在るかを確かめる（`:3750` ・ `:3758`）ので、無ければ `RS-27` で断る。

---

## 9. 影響 —— 本書の外で動くもの

| 所 | 何が動くか | いつ |
|---|---|---|
| `docs/development-records/rulings.md` | `JDG-289`（決定 1 の裁定。利用者の語は前に立つ者が逐語で写す） | 当てる前 |
| `CR-436` の波 B2 ・ 段 5 | 2.2 の 1 ・ 2 | 各入口 |
| `handoff-state-machine.md:107` | 次の領域の並びから「選択」を済みにする | 前に立つ者 |
| `pending-decisions.md` の `PND-142` ・ `PND-143` | 置き場が集約の根の運ぶ値になったこと | 前に立つ者 |
| `defects.md` | 第 8 節の候補 | 台帳の体 |
| 本線のセッション | `CR-490` の番号の宣言 | 波 A の前 |
| 第 11 節の 4 つの変更要求 | 番号は前に立つ者が配る | 11.7 |

---

## 10. ⛔ この変更でやらないこと

- ⛔ 画面の値・通知・身振り・ファイル操作と問い・名前付けと入力欄の原稿を変えない（使い回しもしない —— 決定 6）
- ⛔ `CR-437` の刈り（`DFC-683`）を入れない（決定 9）。行と対象の混ぜ方（`PND-449`）、写したものの寿命を決めない（`JDG-78`）
- ⛔ 波 A で `src/adapter` ・ `src/framework` に触らない（段 5・段 6 の持ち場）
- ⛔ 第 11 節の候補を本書で原稿にしない（それぞれの変更要求の持ち物）
- ⛔ 基準線を体に触らせない

---

## 11. 他に状態として持つべきもの（編集器全体の洗い出し）

利用者の追加の指示（2026-09-21）: 選択に限らず、状態として持つべきなのにまだ持っていないものを洗う。**変数から（11.1〜11.3）と、編集の使い方から（11.4〜11.6）の 2 方向で洗った。**
判定の語: **新しい機械** ／ **既存の機械に状態を足す** ／ **運ぶ値** ／ **フレームの値**（`SF-5`）／ **外**（文書 `SF-10`、キャッシュ、把手、DOM へ書いた値の覚え）／ **済**（既に機械が持つ）。

### 11.1 `frameLoop` の `let` 66 の行き先

測り方: 66 の名を 6 つの変更要求（`CR-436` ・ `CR-440` ・ `CR-450` ・ `CR-460` ・ `CR-470` ・ `CR-480`）で `grep -lw` し、棚卸しの領域の欄と突き合わせた。
⇒ **既に 6 つの変更要求が行き先を決めたもの 46、本書の 4、残り 16。** 残り 16 は次の表。

| # | 名前 | 所在 | 名指す仕様の行 | 判定 | 領域 | 既存の機械との関係 |
|---|---|---|---|---|---|---|
| 1 | `hasUnsavedEdits` | `frame-loop.ts:1866`（書き `:3093` ・ `:3118` ・ `:3438`） | `FR-100` req:5651（「未保存の編集を持ったまま」「未保存の編集が無いときに出させてはならない」）、`ZE-4` req:3216 | **新しい機械**（「未保存の編集が無い ／ 有る」） | ファイル操作と問い（保存 `documentFileSaved`・開く `documentOpenLanded` の出来事がそこに在る）。`CR-460` の決定 9 ・ 12 が外した | `fileOperationStateMachine` ・ `confirmationStateMachine` と直交 |
| 2 | `fileSavedAt` | `:1865` | `FR-100` の周り（保存した時） | **運ぶ値**（1 と同じ領域の根） | 同上 | —— |
| 3 | `isRecordingInteractions` | `:1847`（書き `:2086` ・ `:2092`） | `FR-102` req:4667（「いま記録しているかどうかが画面上で読めること（MUST）」req:4671）、`S-206`（`tbl-settings.md:393`「記録しているか」） | **新しい機械**（「記録していない ／ 記録している」） | 操作の記録（計画の残り） | ほかのすべてと直交 |
| 4 | `interactionRecord`（中身を書き換える `const`）・`interactionRecordDropped` ・ `interactionRecordBeganAt` ・ `interactionRecordOffered` | `:1848`〜`:1851` | `S-207`（件数の上限）、`FR-102` | **運ぶ値**（3 の `recording` 状態か根） | 同上 | —— |
| 5 | `isAgentApiEnabled` | `:1884`（書き `:2758`） | `FR-065` req:6082（有効・無効。「ブラウザ（オリジン）ごとに記憶すること（MUST）」req:6091） | **新しい機械**（「無効 ／ 有効」） | Agent API（計画の残り） | ほかのすべてと直交 |
| 6 | `dialogueLog` | `:1925` | `AG-11`（確定した発話の記録）、`DFC-558` | **運ぶ値** | Agent API | —— |
| 7 | `agentApiEnablingWatch` | `:1885` | none | **外**（把手） | —— | —— |
| 8 | `held` | `:1813` | `CS-4`、表 T-230 | **外**（文書と取り消しの履歴 ——`SF-10`） | 文書と現在値の芯 | —— |
| 9 | `environment` | `:1814` | none | **フレームの値**（宿主の環境） | —— | —— |
| 10 | `values` | `:1830` | none | **フレームの値**（フレームごとの導出） | —— | —— |
| 11 | `owed` | `:1831` | none | **外**（フレームを求めるかのシェルの規則 ——`CR-470` の決定 5 と同じ筋） | —— | —— |
| 12 | `fromStartupTemplate` | `:1854` | none（req:966 は初期表示のテンプレートを言うが、状態を名指さない） | **外**（表示の当てはめの覚え。13 と組） | —— | —— |
| 13 | `fitHeldForNoPlace` ・ `bandCeilingFrom` | `:1857` ・ `:2951` | none | **外**（フレームをまたぐキャッシュ —— `CR-436` が表 T-071 の `CA-1` との食い違いとして挙げた） | —— | —— |

### 11.2 閉包の覚え（`single-html-shell.ts` ・ `dom-screen-surface.ts`）

| 所 | 覚え | 判定 |
|---|---|---|
| `single-html-shell.ts:65`（モジュール） | `deliveredAppShellHtml` | **外**（キャッシュ） |
| `single-html-shell.ts` の `boot` の閉包（`:299`〜`:409`、10） | `appHeaderHeightPx`:299 ・ `rowControlsHeightPx`:300（測った寸法 → **フレームの値**）、`loop`:301 ・ `focusPropertyFieldHeld`:355 ・ `readWatermarkUnlockAnswerHeld`:357（把手 → **外**）、`themeDocument`:309 ・ `pageGroundWritten`:320 ・ `documentLanguageWritten`:330 ・ `browserTabHeadingWritten`:342 ・ `pointerShapeShown`:409（DOM へ書いた値の覚え → **外**） | 状態 0 |
| `dom-screen-surface.ts` の `domScreenSurface` の閉包（`:2298`〜、字下げ 2 の `let` 23） | `CR-480` が決めた 13（焦点・確定した値の書き置き —— **外**）。残り 10: `lastKeys`:2361 ・ `langShown`:2362（書いた値の覚え → **外**）、`headerHeightPx`:2363 ・ `isHeaderHeightSettled`:2365 ・ `rowControlsHeightPx`:2366 ・ `rowControlsMeasuredAgainst`:2367 ・ `rowControlsPanelDrawnAtMs`:2368（測った寸法と時刻 → **フレームの値**）、`settled`:2369（対話欄の確定を待つ把手 → **外**。Agent API の変更要求が判じる）、`isFieldUp`:2370（対話欄を出しているかの写し。正は `dialogueFieldDisplayStateMachine` → **外**）、`isNoticeShowing`:2749（通知の写し。正は `noticeDisplayStateMachine` → **外**） | 状態 0。⚠️ 写し 2 つは正と離れうる（段 6 が判じる） |

### 11.3 仕様が名指す離散の状態（`docs/spec/01-04-requirements.md` を「モード」「構えている」「未保存」「記録している」「〜しているあいだ」「場面」「入力中」で引いた —— スクラッチの `s-modes.py`）

| 仕様が名指すもの | 行 | 今の持ち主 | 判定 |
|---|---|---|---|
| 構え | 表 T-023b、`SP-1`〜`SP-4` | `armModeStateMachine` | **済** |
| `Dual Cursor` モード | `DC-1`〜`DC-7`（req:4842〜） | `dualCursorModeStateMachine` | **済** |
| パレットを最小化しているあいだ | req:4086 | `paletteDisplayStateMachine` | **済** |
| 境界・掴みシロを掴んでいるあいだ | req:3388 ・ 4041 ・ 4053 | `pointerPressStateMachine` ・ `rowGrabStateMachine` | **済** |
| 外した実績を開いているあいだ覚える | `PV-4` req:2972 | 画面の値の根の `rememberedActuals` | **済** |
| 作った直後の名前付けの場面 | `FR-091` req:1347 | `createdTaskNamingStateMachine` | **済** |
| 選んでいる ／ 何も選んでいない | `SP-1`〜`SP-3` | **本書** `selectionStateMachine` | 本書 |
| **未保存の編集** | `FR-100` ・ `ZE-4` | 無い（シェルの `let`） | **新しい機械**（11.1 の 1） |
| **記録している** | `FR-102` ・ `S-206` | 無い | **新しい機械**（11.1 の 3） |
| **`Agent API` の有効 ／ 無効** | `FR-065` | 無い | **新しい機械**（11.1 の 5） |
| 入力中（確定していないその場の編集） | `AG-9` req:6071、`IN-5a` req:6807（「状態の呼び名は `AG-9` と同じ」）、`IN-4` の第 2 階層 | 無い —— 宿主が真偽で答える（`IF-9` des:564） | **フレームの値**（`CR-480` の決定 4）。⚠️ 11.5 で見直した |
| 人が文書を変えるドラッグをしている間 | `AG-9` | `pointerPressStateMachine.changingDocument` から導ける | **フレームの値**（導ける） |
| 依存線を隠しているあいだ・担当ラベルを出しているあいだ・欄を非表示にしているあいだ | req:3733 ・ 2063 ・ 6114 | 文書の設定 | **外**（文書 `SF-10`） |
| 中断しているあいだ | req:2854 | タスクのデータ | **外**（文書） |
| 一覧モード | `FU-5` req:7005 | —— | **外**（将来の行。要求ではない） |

⇒ **`IN-4` の 8 つの段は、本書の後にすべて持ち主が決まる**（通知・面・身振り・構え・選択・`Dual Cursor`・説明は機械、確定していない編集はフレームの値）。

### 11.4 編集の使い方を 1 歩ずつ歩く

略記: 画面 ＝ `screen`、パネル ＝ `propertiesPanelContentStateMachine`（`hidden` ／ `selectionDisplayed` ／ `documentSettingsDisplayed`）、名付け ＝ `createdTaskNamingStateMachine`、焦点 ＝ `fieldFocusWantStateMachine`、押下 ＝ `pointerPressStateMachine`、問い ＝ `confirmationStateMachine`、選択 ＝ 本書の `selectionStateMachine`。**⚠️ ＝ 何も持たない（隙間）。**

**UC-1 タスクを押す → 選ばれる → パネルは？**（`SL-2`、`FR-072` req:1873〜1885、`S-99h` set:390、`IC-17` glo:530、`JDG-283` `rulings.md:480`、`FR-042`）

| 歩 | 持ち主と遷移 |
|---|---|
| 1 押す | 押下 `notPressed → viewingDocument`（または `changingDocument`） |
| 2 離す | 押下 → `notPressed`。選択 `objectsPicked`: `nothingSelected → objectsSelected`（または書き換え） |
| 3 パネル | 画面 `selectionMoved{subject}`: パネルが `selectionDisplayed` なら中身を書き換える。`hidden` ・ `documentSettingsDisplayed` なら**変わらない** —— `FR-072` req:1885「選択が動いたことだけを理由に、パネルを出し始めてはならない（MUST NOT）」。閉じた（片づけた）パネルは `hidden`（`PND-338` の `isPropertiesPanelPutAway` は `hidden` に畳まれた）。戻す道は `IC-17`、名前の直接編集、作ること、**行を選ぶこと**（`JDG-283`、`FR-042` —— いまの `chooseRow`:3979 は無条件に `showPropertiesOfChoice`） |
| 4 名付け | 名付けが `namingCreatedTask` なら `choiceMoved` で `idle` |
| 隙間 | ⚠️ `IN-4` の注の「タスクを選ぶとパネルが立つ」と `FR-072` の MUST NOT が食い違う（第 8 節の候補 3）。⚠️ タスクを押すとパネルが出ず、行を押すと出る —— 仕様どおりだが非対称（`JDG-283` が行を戻す道に数える） |

**UC-2 図の上で名称をダブルクリック → 名称の欄を編集 → 確定・取り消し・よそを押す**（`MK-13` req:3311、`IN-5a` ・ `IN-5b` req:6807 ・ 6808、`IN-6` req:6809、`SK-19` req:4166、`IN-4`、`IF-9` des:564、`WS-2` des:659、`AG-9`）

| 歩 | 持ち主と遷移 |
|---|---|
| 1 1 度目の押し | UC-1 と同じ（選択 `objectsSelected`） |
| 2 2 度目の押し（ダブルクリック） | 画面 `propertiesOfChoiceAsked{subject}`: パネル `→ selectionDisplayed`。焦点 `fieldFocusAsked{PR-1}`: `idle → fieldFocusWanted` |
| 3 描いて焦点を置く | シェルが毎フレーム置き直し、入ったら `fieldFocusLanded`: `→ idle`。既にある文字の全選択（`MK-13`）は DOM ⇒ **外** |
| 4 打つ（`IME` の変換を含む） | ⚠️ **どの機械も持たない** —— 「入力中」は宿主が真偽で答える（`IF-9`、`dom-screen-surface.ts:3060`〜`:3062`、変換中は `isComposing` ——`:2816`）。翻訳係は単文字キーを渡さない（`input-command-translator.ts:1460`〜`:1463`）。`Agent API` の書き込みは `WS-2` が拒む（同じ答えを読む） |
| 5a `Enter` | 画面 `settleKeyPressed{hasNoSurfaceOrConfirmation, hasNoUnsettledEntry}`: 確定の値は `readFieldCommit`（`IF-9`）で読み、書き込みは `WS-2` の `editingInPlace`。パネル・選択は変わらない。2 度目の `Enter` でパネル `→ hidden`、3 度目で選択 `selectionSettleKeyPressed → nothingSelected`（`SK-19` の段） |
| 5b `Esc` | `IN-4` の段 `textEntry`: 戻すのは面（`dom-screen-surface.ts:2788`〜`:2810`）⇒ **外**。画面 `escapePressed{rung: textEntry}` はどの機械も動かさない。選択は残る |
| 5c よそを押す | `IN-6`: 面が確定する（`:2836`〜`:2875`）。焦点 `fieldFocusWithdrawn`（求めが残っていれば）。押した先によっては選択 `objectsPicked` ／ `emptyAreaClicked` |
| 後 | 選択は残る（`FR-091` の片づけは作った直後だけ —— `AS-1` req:2062 の注） |
| 隙間 | ⚠️ **「いまどの欄を編集しているか」を持つ機械が無い**（11.5）。⚠️ `PND-352`（同じパネルの別の欄を押したとき焦点を外すか） |

**UC-3 構えて作る → 作った直後の名前付け → `Enter`**（`SP-1`、表 T-023b、`FR-001`、`FR-091`、`TC-9`）

| 歩 | 持ち主と遷移 |
|---|---|
| 1 構える | 画面 `armEntryPressed`: 構え `notArmed → taskShapeArmed`。選択は変わらない（直交 —— `SP-1`〜`SP-3`） |
| 2 押して作る | 押下 `changingDocument`。書き込みの着地で: 名付け `creationLanded → namingCreatedTask{createdTaskUid}`、焦点 `→ fieldFocusWanted{PR-1}`、選択 `createdTaskSelected → objectsSelected{その 1 つ}`、画面 `propertiesOfChoiceAsked` でパネル `→ selectionDisplayed` |
| 3 打つ | UC-2 の 4 と同じ（⚠️ 機械が持たない） |
| 4 `Enter` | 画面 `createdNameSettled`: パネル `→ hidden` ／ 副作用 `clearSelection` → 選択 `selectionCleared → nothingSelected` → 名付け `choiceMoved → idle` |
| 隙間 | `DFC-694`（焦点の求めの取り下げの事由）。構えが作った後も残るかは構えの原稿の持ち物 |

**UC-4 複数を選んで共通の項目を編集する**（`SL-3` ・ `SL-4` ・ `SK-2`、`FR-006` req:1795、`SP-3`、`FR-099`）

| 歩 | 持ち主と遷移 |
|---|---|
| 1 範囲・`Shift`・全選択 | 選択 `objectsPicked → objectsSelected{selectedObjects}`（範囲と全選択は `ordered: false`） |
| 2 パネル | 描き手が 1 つを選ぶ: 1 つなら それ、複数なら `lastPicked`（`properties-panel.ts:548`〜`:552`）。範囲・全選択（順序なし）なら**何も出ない**（`lastPicked` が `null` ——`selection.ts:78`） |
| 3 編集 | 出た 1 つにだけ効く（未検証） |
| 担当者（`FR-099`） | 名簿で選ぶ `chosenResources` は**消す相手**であって、割り当ての編集ではない。タスクの担当は `PR-16` の欄（`AS-1`）で 1 つずつ |
| 隙間 | ⚠️ **複数の対象で共通の項目をどう出し、どれを編集させるかを定める要求が無い**（`FR-006` は「選択を出しているとき 表 T-016 の項目」とだけ言う）。形状だけは `SP-3` がまとめて変える。⇒ 仕様の空白（`PND-` の候補、設計しない ——`JDG-78`）。状態は増えない —— 出す項目は `selectedObjects` から導ける |

**UC-5 行名・文書名・付箋の本文**（`MK-13`、`FR-085` req:1585、`HF-14`、`FR-035` req:2452、`SK-9`（`F2`）、`U-27`、`FR-097` ・ `PR-21`）

| 対象 | 持ち主と遷移 |
|---|---|
| 行名 | 行見出しのダブルクリック: 根 `rowsPicked`、画面 `propertiesOfChoiceAsked`（パネル `→ selectionDisplayed`）、焦点 `fieldFocusAsked{AT-53}`。作った行は `createdRowSelected` ＋ 名付けは無い（`FR-091` はタスクだけ ——`CR-480` の決定 9） |
| 文書名 | `F2` か名の押し: 焦点 `fieldFocusAsked{U-27}`。**パネルと選択は動かない**（欄はヘッダに在る ——`IF-9` の括弧） |
| 付箋の本文 | 付箋を押す: 選択 `objectsPicked{commentBox}`。ダブルクリック: パネル `→ selectionDisplayed`、焦点 `fieldFocusAsked{PR-21}` |
| 隙間 | 打っているあいだは UC-2 の 4 と同じ（⚠️ 機械が持たない） |

**UC-6 通知・問いが出ているあいだの編集、打ちかけのあいだの取り消し**（`NT-8`、`SK-19`、`IN-4`、`AG-9`、`WS-2`、`IF-9`、`SK-6`）

| 場面 | 持ち主と遷移 |
|---|---|
| 通知が出ている | `noticeDisplayStateMachine.shown`。`Enter` ・ `Esc` はまず通知を 1 つ消す（`SK-19`、`IN-4` の第 1 階層）—— 選択にも編集にも届かない |
| 問いが出ている | `confirmationStateMachine.questionAsked`（と画面の面）。`settleTextEntry` は何もしない（`frame-loop.ts:3893`）—— 画面の `settleKeyPressed` のガード `hasNoSurfaceOrConfirmation` |
| 打ちかけのあいだの `Agent API` の書き込み | `WS-2` が宿主の答え（入力中）と押下の状態で拒む。自分の確定の書き込みだけは通す（`isSettlingFieldCommit`、`CR-480` の決定 5） |
| 打ちかけのあいだの `Ctrl` ＋ `Z` | 翻訳係は文書の取り消し `undoEdit` にする（`input-command-translator.ts:1491`）。`IN-5a` がブラウザへ渡す例外は `Ctrl` ＋ `C` ／ `V` だけ（`:1464`〜`:1466`） |
| 隙間 | ⚠️ **打ちかけのあいだの `Ctrl` ＋ `Z` を欄の取り消しにするか文書の取り消しにするかを定める要求が無い**（`PND-349` の `Ctrl` ＋ `A` と同じ形）⇒ `PND-` の候補（未検証 —— 押していない） |

### 11.5 「いまどの欄を編集しているか」は状態か

**仕様の言うこと**:
- 名指す: 「入力中」（`AG-9` req:6071）、「文字入力を確定していない間」（`IN-5a` req:6807 —— 自ら「状態の呼び名は `AG-9` と同じ」と書く）、`IN-4` の第 2 階層「確定していないその場の編集」、`IN-6`。⇒ **「何かが未確定である」は仕様が状態として名指す。**
- 禁じる: `IF-9`（des:564）「確定していない文字入力の有無は真偽 1 つとし、**どの欄が保持しているかを返してはならない（MUST NOT）**」。`JDG-68`（`rulings.md:152`）が `IF-9` を正とした。⇒ **「どの欄か」は、宿主の外へ出すことを仕様が禁じている。**
- 焦点は出来事なしに動く（ブラウザ・`Tab`・`IME`）—— `frame-loop.ts:2907`「asked, never cached」（`CR-480` の決定 4）。

**依存の形**: 編集できる欄は 3 か所に在る —— (a) パネルの中（`PR-*`、`AT-53`）はパネルが `selectionDisplayed` か `documentSettingsDisplayed` のあいだだけ在る（パネルに**依存**。選択には直接は依存しない —— 選択を解いてもパネルは `FR-072` で中身を残す）、(b) ヘッダの文書名 `U-27` はパネルにも選択にも**依存しない**、(c) 名簿の面の中の欄は開いた面（`openSurfaceStateMachine.open`）に依存する。⇒ 入れ子が合うのは (a) だけ。

| 案 | 形 | 得るもの | 代償 |
|---|---|---|---|
| **0（推奨）いまのまま** | 「入力中」は宿主の答え（フレームの値）。「どの欄か」は持たない | 仕様どおり（`IF-9` の MUST NOT）。焦点の移動ごとの出来事が要らない | 「いまどの欄か」を図と表で確かめられない。UC-2 ・ 3 ・ 5 の歩 4 が機械の外に残る |
| 平ら | パネルの中身 × 欄の積を 1 つの機械に | 1 つの表で見える | パネルの 3 状態 × 欄（表 T-016 の行の数）の積。`U-27` と面の欄は積に入らない。`IF-9` を変える |
| 2 つの機械 | 画面の値に `fieldEditStateMachine`（`noEntryHeld` ／ `entryHeld{fieldRow}`）を足し、パネルと直交。「パネルが閉じたら編集も終わる」はガード `{in: propertiesPanelContentStateMachine.hidden}` か呼び手の詰め方 | `U-27` も同じ機械で持てる。同じ領域なので `{in: …}` が書ける | 直交ではない組（パネル `hidden` × パネルの欄を編集中）を升で禁じる手間。`IF-9` を変え、面が `focusin` ・ `focusout` を欄の行 ID とともに出来事にする（段 6 の持ち場）。`DFC-545` と絡む |
| 入れ子 | パネルの `selectionDisplayed` ・ `documentSettingsDisplayed` の下に `editingField{fieldRow}` を置き、`U-27` は別の機械 | 依存がそのまま形になる（パネルが閉じれば子も消える）。**構え × 選択と違い、ここは入れ子が合う** | 同上の `IF-9` の変更と面の出来事。`CR-436` のパネルの機械を変える。`U-27` と面の欄のためにもう 1 つ機械が要る |

**推奨: 案 0（いまのまま）。** 理由: `IF-9` の MUST NOT と `JDG-68` がある限り、どの案も仕様の変更を先に要する。未確定の有無は仕様が宿主に答えさせており、それで `AG-9` ・ `IN-5a` ・ `IN-4` ・ `WS-2` の 4 つの読み手がすべて足りている（`CR-480` の 2.1）。
**⚠️ 利用者に問う価値があるのはここだけ** —— 「いまどの欄を編集しているか」を状態として持ちたいなら、**`IF-9` の MUST NOT を改める変更要求を先に立て**、形は**入れ子（パネルの欄）＋ 別の機械（`U-27` と面の欄）**を推す。代償は `IF-9` の改訂、面の出来事（段 6）、`CR-436` のパネルの機械の書き換え、契約試験 2 つ。

### 11.6 まとめ

| 判定 | 数 | 中身 |
|---|--:|---|
| 新しい機械 | 3 | 未保存の編集（`FR-100`）、記録している（`FR-102`）、`Agent API` の有効（`FR-065`） |
| 本書の機械 | 1 | 選択（`SP-1`〜`SP-3`） |
| 運ぶ値 | 6 | `fileSavedAt`、記録の 4（`interactionRecord` ・ `Dropped` ・ `BeganAt` ・ `Offered`）、`dialogueLog`（ほかに本書の根の 3） |
| フレームの値 | 11 | `environment`、`values`、`boot` の寸法 2、面の寸法と時刻 5、「入力中」、「文書を変えるドラッグをしている間」 |
| 外 | 25 | `held`、`owed`、`fromStartupTemplate`、キャッシュ 2、把手 1（11.1）、`boot` と面の閉包の覚え 14（11.2）、文書の設定・タスクのデータ・将来の行 5（11.3） |
| 済 | 6 | 構え、`Dual Cursor`、パレット、掴み、外した実績、作った直後の名前付け |
| 仕様の空白（`PND-` の候補） | 2 | 複数の対象を選んだときパネルに何を出し何を編集させるか（UC-4）、打ちかけのあいだの `Ctrl` ＋ `Z`（UC-6） |

### 11.7 別の変更要求にするもの

| # | 中身 | 領域 | 入口 |
|---|---|---|---|
| 1 | **未保存の編集**の機械（＋ `fileSavedAt`） | ファイル操作と問いに機械を 1 つ足す（`CR-460` の決定 12 が先送りした） | いつでも。書き込みの着地を出来事にする呼び手は `CR-436` の波 B2 の後 |
| 2 | **操作の記録**の領域（機械 1 ＋ 運ぶ値 4） | 新しい領域（計画の残り） | 計画の順（本書の次） |
| 3 | **`Agent API`** の領域（有効の機械 ＋ `dialogueLog`、対話欄の写し 2 つの判定） | 新しい領域（計画の残り） | 2 の次 |
| 4 | **いま編集している欄**（11.5）—— ⚠️ 利用者が持つと決めたときだけ。`IF-9` の改訂を先に | 画面の値（入れ子）＋ 1 機械 | 利用者の判断の後、段 6 の後 |

---

## 付録 —— 第 6 領域「選択」の原稿

**略記**: `req` ＝ `docs/spec/01-04-requirements.md`、`des` ＝ `docs/spec/05-07-design.md`。行番号は `d978c130`。
根拠の行: `FR-001`、`TC-9`、`FR-091` req:1347、`SP-1`〜`SP-3` req:1150〜1152、`FR-081` req:2187、`SL-1`〜`SL-7b` req:2200〜2208、`UN-9` req:2127、`MK-11` req:3309、`SK-2` ・ `SK-4` ・ `SK-19` req:4167 ・ 4169 ・ 4166、`FR-085` req:1565、`FR-042` req:2002、`FR-033` req:2363、`FR-099` req:2319、`AS-6` req:2067、`HF-14` req:1671、`IN-4` req:6804、`RS-27` req:6438。
升目の書き方: `→ 先 [ガード] / 副作用`。**`—` は変わらない ＝ 同じ参照**（`SD-3`）。

### A. 出来事（11）

| 出来事 | どこから来るか | 運ぶ値 | 動かすもの |
|---|---|---|---|
| `selection/objectsPicked` | 入力: 対象を選ぶ押下・範囲・`Shift` での増減・全選択・端のドラッグで絞ること（新しい選択は翻訳係が組み、値が変わったときだけ送る） | `pickedObjects` | 機械 |
| `selection/emptyAreaClicked` | 入力: 何にも当たらない場所での素の左クリック（`MK-11`、`SL-6`） | — | 機械 |
| `selection/selectionEscapePressed` | 入力: `Esc`（画面の値の `escapePressed` と同じ押下から呼び手が作る） | `rung` | 機械 |
| `selection/selectionSettleKeyPressed` | 入力: `Enter`（`SK-19` の最後の段のときだけ呼び手が送る） | — | 機械 |
| `selection/selectionCleared` | 副作用の結果: 画面の値の `clearSelection`（`FR-091`） | — | 機械 |
| `selection/selectionPruned` | 副作用の結果: 書き込みが着地し、文書に無くなった対象を刈った（表示の切り替えは書かない） | `remainingObjects` | 機械 |
| `selection/createdTaskSelected` | 副作用の結果: 作ったタスクが文書に在る（`FR-001`、`FR-091`、`TC-9`） | `createdTaskUid` | 機械 |
| `selection/rowsPicked` | 入力: 行見出しパネルで行を選ぶ・増減する（`FR-085`、`FR-042`） | `chosenRows` | 根 |
| `selection/createdRowSelected` | 副作用の結果: 足した行が文書に在る（`HF-14`） | `createdGroupId` | 根 |
| `selection/resourcesPicked` | 入力: 名簿で選ぶ・すべて選ぶ・すべて解く・増減する（`FR-099`、`AS-6`） | `chosenResources` | 根 |
| `selection/copyTaken` | 入力: `Ctrl` ＋ `C`（写せる選び方のときだけ。写せないときは `RS-27` で断り、出来事を作らない） | `copiedForPaste` | 根 |

### B. 根 `selection`

運ぶ値: `chosenRows`（`FR-085`）／ `chosenResources`（`FR-099` ・ `AS-6`）／ `copiedForPaste`（`FR-033`。無いこともある）。

| 出来事 | 升 |
|---|---|
| `rowsPicked` | → 自己（`chosenRows` を書き換える）（`FR-085`、`FR-042`） |
| `createdRowSelected` | → 自己（`chosenRows` を作った行 1 つにする）（`HF-14`、`FR-085`） |
| `resourcesPicked` | → 自己（`chosenResources` を書き換える）（`FR-099`） |
| `copyTaken` | → 自己（`copiedForPaste` を書き換える）（`FR-033`、`SK-4`） |

### C. 機械 `selectionStateMachine`

| 状態 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|
| `selectionStateMachine.nothingSelected` | ○ | — | `SP-1`、`MK-11`、`SL-6` |
| `selectionStateMachine.objectsSelected` | | `selectedObjects`（`SL-1`、`SL-7b`） | `SP-2`、`SP-3`、`SL-1`、`IN-4` |

| 出来事 ＼ 状態 | `nothingSelected` | `objectsSelected` |
|---|---|---|
| `objectsPicked` | → `objectsSelected` [`hasPickedObjects`]<br>それ以外 → — | → 同 [`hasPickedObjects`]（書き換える）<br>→ `nothingSelected` [not `hasPickedObjects`] |
| `emptyAreaClicked` | — | → `nothingSelected`（`MK-11`、`SL-6`） |
| `selectionEscapePressed` | — | → `nothingSelected` [`isRungSelection`]<br>それ以外 → —（`IN-4`） |
| `selectionSettleKeyPressed` | — | → `nothingSelected`（`SK-19`） |
| `selectionCleared` | — | → `nothingSelected`（`FR-091`） |
| `selectionPruned` | — | → 同 [`hasRemainingObjects`]（書き換える）<br>→ `nothingSelected` [not `hasRemainingObjects`]（`FR-081`、`UN-9`） |
| `createdTaskSelected` | → `objectsSelected`（作ったタスク 1 つ）（`FR-001`、`FR-091`） | → 同（作ったタスク 1 つに置き換える） |

升 9（空でない組）。この機械を動かさない出来事: 根の 4 つ。

### D. 原稿の JSON（`regions` の末尾に足す）

⭐ スクラッチの `s-selection-region.json` と同じもの。原稿の写しに足して生成器の `load()` に通し、**問題 0**。`build()` で表 T-293 と図 F-039 を刷れた（`s-selection-printed.md`）。⚠️ 型の生成器 `tools/generate_state_machine_types.py` には通していない（未検証）。

```json
{
 "region": "selection",
 "name": {"ja": "選択"},
 "unit": "src/use-case/advance-screen-session/selection-values.ts",
 "typeStem": "SelectionValues",
 "table": {"id": "T-293", "caption": {"ja": "選択の状態機械"}},
 "figure": {"id": "F-039", "caption": {"ja": "選択の状態遷移"}},
 "root": {
  "carries": [
   {"name": "chosenRows", "rows": ["FR-085"]},
   {"name": "chosenResources", "rows": ["FR-099", "AS-6"]},
   {"name": "copiedForPaste", "rows": ["FR-033"], "note": {"ja": "無いこともある"}}
  ],
  "evidence": ["FR-081", "FR-085", "FR-099", "FR-033", "UN-9"],
  "transitions": {
   "rowsPicked": {"evidence": ["FR-085", "FR-042"], "note": {"ja": "`chosenRows` を書き換える"}},
   "createdRowSelected": {"evidence": ["HF-14", "FR-085"], "note": {"ja": "`chosenRows` を作った行 1 つにする"}},
   "resourcesPicked": {"evidence": ["FR-099", "AS-6"], "note": {"ja": "`chosenResources` を書き換える"}},
   "copyTaken": {"evidence": ["FR-033", "SK-4"], "note": {"ja": "`copiedForPaste` を書き換える"}}
  }
 },
 "events": [
  {"key": "objectsPicked", "source": {"kind": "input", "rows": ["SL-2", "SL-3", "SL-4", "SK-2", "SL-7a"], "note": {"ja": "対象を選ぶ押下・範囲・`Shift` での増減・全選択・端のドラッグで絞ること。新しい選択は呼び手（入力の翻訳係）が組み、値が変わったときだけ送る"}}, "carries": [{"name": "pickedObjects", "rows": ["SL-1", "SL-7b"]}]},
  {"key": "emptyAreaClicked", "source": {"kind": "input", "rows": ["MK-11", "SL-6"], "note": {"ja": "何にも当たらない場所での素の左クリック（構えなし）"}}, "carries": []},
  {"key": "selectionEscapePressed", "source": {"kind": "input", "rows": ["IN-4"], "note": {"ja": "`Esc`。画面の値の `escapePressed` と同じ押下から呼び手が作る"}}, "carries": [{"name": "rung", "note": {"ja": "消費する `IN-4` の段の語。呼び手が詰める"}}]},
  {"key": "selectionSettleKeyPressed", "source": {"kind": "input", "rows": ["SK-19"], "note": {"ja": "`Enter`。通知も確定していないその場の編集も無く、プロパティパネルも出していないときだけ呼び手が送る"}}, "carries": []},
  {"key": "selectionCleared", "source": {"kind": "effectResult", "rows": ["FR-091"], "note": {"ja": "画面の値の副作用 `clearSelection` の結果"}}, "carries": []},
  {"key": "selectionPruned", "source": {"kind": "effectResult", "rows": ["FR-081", "UN-9"], "note": {"ja": "書き込みが着地し、文書に無くなった対象を刈った。表示の切り替えでの刈りは書かない"}}, "carries": [{"name": "remainingObjects"}]},
  {"key": "createdTaskSelected", "source": {"kind": "effectResult", "rows": ["FR-001", "FR-091", "TC-9"], "note": {"ja": "作る書き込みが着地し、作ったタスクが文書に在る"}}, "carries": [{"name": "createdTaskUid", "rows": ["TC-9"]}]},
  {"key": "rowsPicked", "source": {"kind": "input", "rows": ["FR-085", "FR-042"], "note": {"ja": "行見出しパネルで行を選ぶ・増減する"}}, "carries": [{"name": "chosenRows"}]},
  {"key": "createdRowSelected", "source": {"kind": "effectResult", "rows": ["HF-14"], "note": {"ja": "行を足す書き込みが着地し、足した行が文書に在る"}}, "carries": [{"name": "createdGroupId"}]},
  {"key": "resourcesPicked", "source": {"kind": "input", "rows": ["FR-099", "AS-6"], "note": {"ja": "担当者の一覧で選ぶ・すべて選ぶ・すべて解く・増減する"}}, "carries": [{"name": "chosenResources"}]},
  {"key": "copyTaken", "source": {"kind": "input", "rows": ["SK-4", "FR-033"], "note": {"ja": "写せる選び方のときだけ呼び手が送る。写せないときは `RS-27` で断り、出来事を作らない"}}, "carries": [{"name": "copiedForPaste"}]}
 ],
 "machines": [
  {
   "name": "selectionStateMachine",
   "states": [
    {"key": "nothingSelected", "parent": null, "initial": true, "carries": [], "evidence": ["SP-1", "MK-11", "SL-6"]},
    {"key": "objectsSelected", "parent": null, "initial": false, "carries": [{"name": "selectedObjects", "rows": ["SL-1", "SL-7b"]}], "evidence": ["SP-2", "SP-3", "SL-1", "IN-4"]}
   ],
   "transitions": {
    "objectsPicked": {
     "nothingSelected": {"to": "objectsSelected", "guard": [{"name": "hasPickedObjects"}], "evidence": ["SL-2", "SL-3", "SL-4", "SK-2"]},
     "objectsSelected": [
      {"to": "objectsSelected", "guard": [{"name": "hasPickedObjects"}], "evidence": ["SL-2", "SL-3", "SL-4", "SK-2", "SL-7a"], "note": {"ja": "`selectedObjects` を書き換える"}},
      {"to": "nothingSelected", "guard": [{"name": "hasPickedObjects", "not": true}], "evidence": ["SL-3", "SL-4"]}
     ]
    },
    "emptyAreaClicked": {
     "objectsSelected": {"to": "nothingSelected", "evidence": ["MK-11", "SL-6"]}
    },
    "selectionEscapePressed": {
     "objectsSelected": {"to": "nothingSelected", "guard": [{"name": "isRungSelection"}], "evidence": ["IN-4"]}
    },
    "selectionSettleKeyPressed": {
     "objectsSelected": {"to": "nothingSelected", "evidence": ["SK-19"]}
    },
    "selectionCleared": {
     "objectsSelected": {"to": "nothingSelected", "evidence": ["FR-091"]}
    },
    "selectionPruned": {
     "objectsSelected": [
      {"to": "objectsSelected", "guard": [{"name": "hasRemainingObjects"}], "evidence": ["FR-081", "UN-9"], "note": {"ja": "`selectedObjects` を書き換える"}},
      {"to": "nothingSelected", "guard": [{"name": "hasRemainingObjects", "not": true}], "evidence": ["FR-081", "UN-9"]}
     ]
    },
    "createdTaskSelected": {
     "nothingSelected": {"to": "objectsSelected", "evidence": ["FR-001", "FR-091"], "note": {"ja": "`selectedObjects` は作ったタスク 1 つ"}},
     "objectsSelected": {"to": "objectsSelected", "evidence": ["FR-001", "FR-091"], "note": {"ja": "`selectedObjects` を作ったタスク 1 つに置き換える"}}
    }
   }
  }
 ]
}
```

### E. 運ぶ値の型（コードが決める。原稿は名前だけ —— 表 T-250 の `SD-1` ・ `SD-2`）

| 名 | 型の見込み |
|---|---|
| `selectedObjects` ・ `pickedObjects` ・ `remainingObjects` | `Selection`（`src/entity/document-model/selection/selection.ts:22`。`Entity` なので `UseCase` から読める） |
| `chosenRows` | `readonly string[]`（いまの `selectedGroupIds`） |
| `chosenResources` | `readonly number[]`（いまの `selectedResourceUids`） |
| `copiedForPaste` | `{ kind: 'task'; uid: number } \| { kind: 'row'; groupId: string } \| null`（いまの `:1870`〜`:1873`）。⚠️ 検査 45（同じ式の重なり）に当たらないよう、名のある型 2 つの和で書く（`CR-480` の改訂の記録 3） |
| `createdTaskUid` ・ `createdGroupId` | `number` ・ `string` |
| `rung` | 画面の値の `rung` と同じ型 |

## 改訂の記録

| # | 日付 | 何を変えたか | 理由 |
|---|---|---|---|
| 1 | 2026-09-21 | 起草（`d978c130`）—— 状態機械を作らず、置き場を問う形 | —— |
| 2 | 2026-09-21 | 全面の書き直し: 利用者の裁定（`JDG-289`）で領域 `selection` と `selectionStateMachine` を立てた。第 11 節（他に状態として持つべきもの —— 変数と編集の使い方の両方から）を足した。第 1 稿の問い（置き場）と「スキーマを機械 0 に緩める」案は不要になった | 利用者の裁定と追加の指示 2 つ |
| 3 | 2026-09-21 | 波 A を当てた（`d978c130` の上、ブランチ `sm-selection-a`）。原稿に領域 `selection`（付録 D の JSON のまま。出来事 11、機械 1、状態 2、升 9、根の升 4）を足した。生成物に 表 T-293 ・ 図 F-039。`selection-values.ts`（`UF-122`）と根の合成（`advance-screen-session.ts`。ほかの 5 領域は同じ参照のまま）。`05-07-design.md` の 5.5 の 1 文 ・ `CP-39` ・ `UT-11` ・ `UF-122` ・ `SU-3` 87 → 88 ・ `PI-39` ・ 図 F-028 ・ `SS-6`、`03-implementation.md` の生成定数 2 つ、`check-provenance.py` の 1 行、`units.contract.test.ts` 87 → 88、`changelog.md` の版 0.29 の「（7）」→「（8）」 | 第 3 節の波 A |
| 4 | 2026-09-21 | 型の生成器 `tools/generate_state_machine_types.py` を 1 か所直した —— 副作用を 1 つも持たない領域では `<Stem>EffectName` が空の和（`export type SelectionValuesEffectName =` で終わる、型として壊れた文）になったので、`never` を刷るようにした。ほかの 5 領域の生成物は 1 字も変わらない（`--check` で確かめた）。`SelectionValuesEffect` は `never` と書いた | 付録 D の「⚠️ 型の生成器には通していない（未検証）」が当たった。副作用 0 は第 6 節のとおり |
| 5 | 2026-09-21 | 運ぶ値の型は付録 E どおり: `selectedObjects` ・ `pickedObjects` ・ `remainingObjects` は `Selection`（`Entity` の `selection.ts`）、`chosenRows` は `readonly string[]`、`chosenResources` は `readonly number[]`、`copiedForPaste` は根では `SelectionCopied \| null`、出来事 `copyTaken` では `SelectionCopied`（名のある型 2 つの和 `SelectionCopiedTask`（`kind: 'task'`、`uid: number`）\| `SelectionCopiedRow`（`kind: 'row'`、`groupId: string`））、`createdTaskUid` は `number`、`createdGroupId` は `string`、`rung` は画面の値と同じ `EscapeTarget`（`Entity` の `screen-state.ts`）。ガードは原稿の名のまま関数にした（`hasPickedObjects` ・ `hasRemainingObjects` ・ `isRungSelection`） | 付録 E と第 6 節 |
| 6 | 2026-09-21 | 「→ 自己（書き換える）」の升で、運ぶ値がいまの値と同じとき（同じ対象・同じ順序の旗の `objectsPicked` ・ `selectionPruned` ・ `createdTaskSelected`、同じ並びの `rowsPicked` ・ `createdRowSelected` ・ `resourcesPicked`、同じものの `copyTaken`）は、同じ参照のまま返す。対象の比べは 1 つずつの欄の一致で行い、`Entity` の `isSameItem` は使わなかった —— 表 T-064 が名指さない名で、使うと検査 26b が赤になる | `SF-3`。`CR-480` の改訂の記録 5 と同じ筋 |
| 7 | 2026-09-21 | 仕様だけを読む契約試験 `tests/contract/state-machine-selection.contract.test.ts` は書かなかった。生成器の単体試験 `tests/unit/uf-122-the-selection-transition-table-is-printed-from-the-manuscript.test.ts`（升の並びと、ガードの付いた升の「それ以外 → —」）を足した | `RA-6`。当てた後に別の体が書く |
| 8 | 2026-09-21 | 第 8 節の候補 3 つを `defects.md` に `DFC-695` ・ `DFC-696` ・ `DFC-700` として書いた（どちらが正かは選ばない。状態 `未検討`）。候補 3 の番号を `DFC-697` から `DFC-700` へ改めた。裁定 `JDG-289` を `rulings.md` に記録した（状態 `適用済`、検査 43 は緑） | `DFC-697`〜`DFC-699` はほかのセッションが取っている（依頼） |
| 9 | 2026-09-21 | 第 7 節の予測を測った: md-checks は `tables=180 figures=24 rows=2226 uids=162` → `tables=181 figures=25 rows=2227 uids=162`。表 T-075 は 87 → 88 | 予測どおり |
| 10 | 2026-09-21 | 第 9 節の `handoff-state-machine.md` の第 3 節に ✅ 選択の行（と注 3 行 —— 第 11 節が別の変更要求に分ける機械を含む）を足し、次の領域の順から「選択」を落とした。同じ節の図の帯の注を「F-039 まで使用 —— 使い切り」に直した。`pending-decisions.md` の `PND-142` ・ `PND-143` は書かなかった | 本巡の依頼 |
| 11 | 2026-09-21 | 名前付けと入力欄の契約試験 `tests/contract/state-machine-field-entry.contract.test.ts` の見本の値に `pickedObjects`（タスク 1 つ）と `remainingObjects`（空）を足した。この試験は原稿のほかの全領域の出来事を読むので、見本の無い運ぶ値に `true` を詰め、`selection/objectsPicked` が `true.items` を読んで落ちた。主張（名前付けと入力欄を同じ参照に残す）は変えていない | 試験の見本の不足。`SS-5` の主張はそのまま |
