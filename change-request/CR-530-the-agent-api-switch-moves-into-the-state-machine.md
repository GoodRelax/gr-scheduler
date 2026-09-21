# CR-530 — `Agent API` の有効・無効を状態機械へ移す（段 7 の第 8 領域 `agentApi`）

> ⭐ **状態: 波 A を当てた（2026-09-22、`e9cefd60` の上の作業木 —— ブランチ `claude/lucid-hodgkin-40a9a7`、コミットは前に立つ者が打つ）。波 B ・ 波 C は当てていない。**
> ⭐ 当てた体が草案から変えたところは、末尾の改訂の記録の 2 以降に並べた。第 0 〜 10 節と付録は草案の筋のまま残し、行番号と数を測り直した —— 当てた形の全数は 表 T-296 が持つ。
> 起草は `9b8a22b7`（2026-09-21）を読んだ。**本書の行番号と数は、断りが無いかぎり、`e9cefd60`（`CR-520` の波 A の着地）の上に本書の波 A を当てた作業木で 2026-09-22 に測り直したものである。** `src/framework/single-html-shell/frame-loop.ts` は本書が `effectRunnersOf` に 2 行（空行 1 と `:1455`）を足したので、`:1453` より後の行は `e9cefd60` より 2 行下にある。草案の後に `CR-436` の波 B1 ・ B2、`CR-439` の段 6 の分割、`CR-510` ・ `CR-520` などが入り、`frame-loop.ts` の行は約 165 行ずれ、面の覚えは `dom-screen-surface.ts` から兄弟のファイルへ移った。
> 型板は `CR-490`（第 11 節がこの領域の出どころ —— 11.1 の 5 〜 7、11.2 の `settled` ・ `isFieldUp` ・ `isNoticeShowing`、11.7 の 3）、`CR-520`（草案を測り直して当てた形）、`CR-470`（「領域に入れない」を判じる形）。名前の規則は `docs/development-rules/07-review-standards.md` の「状態機械（State Machine）」の節と R4.4。
>
> **結論（先に書く）: 小さな領域 `agentApi`「`Agent API`」を 1 つ立てる —— 状態機械 1 つ（`agentApiEnablingStateMachine`: `disabled`（初期）／ `enabled`）・出来事 2 ・ 升 3 ＋ 根の升 1 ・ ガード 1 ・ 根の運ぶ値 0。**
> - 有効・無効は `FR-065` が「有効であるあいだ」と名指す離散の状態であり、入力（`IC-20`）とブラウザ（オリジン）の記憶（`S-99b`）という履歴で決まる ⇒ フレームの値ではない（`SF-5`）。
> - **「オリジンごとに記憶する」は、状態を集約の外へ出す理由にならない。** 記憶は状態の**書き出し先**であって持ち主ではない —— 書くのは副作用（`SF-6`）、起動のときに読んだ値は出来事として戻す（`SF-6` の 2 文目）。同じ形の前例が画面の値の `language`（`S-99`、同じく `localStorage` の別枠）と副作用 `storeLanguage` である。
> - ⭐ **`dialogueLog` は領域に入れない（外）。** ⚠️ `CR-490` の 11.1 の 6 は「運ぶ値」と見立てたが、本書はそれを覆す —— 対話の記録には自分の書き込みの経路（`PostDialogueMessage` ——`CP-16`）とコンポーネント（`CP-33`）が在り、文書と同じく保持者（holder）を通して書かれ、監視へ配られる。⇒ `SF-10` と同じ筋で外に置き、`SF-10` に 1 文を足した（決定 5）。⚠️ `CR-520` が記録の溜めを外とした理由（行がフレームごとに増える）はここには当たらない —— 理由は書き込みの経路である。
> - ⭐ **監視の登録 `REGISTRATIONS` も外。** 波 B でシェルの保持者へ出し、引数で渡す。⚠️ **`CR-379` の決定 7 の字面（「セッションの領域へ移し」）から外れる**（集約の中ではなく横に置く）。同決定の芯（シェルが持つ現在値の一部として引数で渡す・表 T-065 を増やさない）は守る（決定 6）。
> - ⭐ 面の覚え 3 つ（`settled` ・ `isFieldUp` ・ `isNoticeShowing`）は**外**（面が描いた値と受けた入力の書き置き —— 段 6 の持ち場）。⚠️ `isFieldUp` は `dialogueFieldDisplayStateMachine` の写しではなく、「有効 ∧ 表示」の描いた結果の覚えである（決定 7）。
> - ⭐ 升は、どこも今日のコードを写す（`JDG-57`）。仕様とコードの食い違いは第 8 節の候補に置き、どちらが正かを選ばない。
>
> **閉じるもの**:
> - 計画の記録 4 の移す順の 6 番目の最後「Agent API」（`docs/development-records/refactor-plan-report-2026-09-13.md:253`、領域の例 `isAgentApiEnabled` は `:245`）。
> - 棚卸しの「Agent API 2 ／ 3 ／ 6」（`docs/development-records/refactor-stage1-state-inventory-2026-09-13.md:210`、行 `:70` ・ `:71` ・ `:94` ・ `:137` ・ `:138` ・ `:160`）の行き先。
> - `CR-490` の 11.7 の 3（「`Agent API` の領域（有効の機械 ＋ `dialogueLog`、対話欄の写し 2 つの判定）」—— `change-request/CR-490-selection-moves-into-the-state-machine.md:417`）。
> - `CR-440` の決定 10（`REGISTRATIONS` は `Agent API` の領域へ —— `change-request/CR-440-notices-move-into-the-state-machine.md:63`）と `CR-379` の決定 7（`:54`）が本書に預けた「置き場と公開の署名」の問い（決定 6）。
> - `docs/development-records/handoff-state-machine.md:127` の「⬜ Agent API」（書き換えは前に立つ者 —— 第 9 節）。
>
> **識別子**（規則 02 の 2.5。起草時に `9b8a22b7` で測り、当てる直前の 2026-09-22 に `e9cefd60` で測り直した —— `git grep -lw <名> -- docs change-request src tests tools .claude`）:
> - 依頼が配った番号: **変更要求 `CR-530`、表 `T-296`、図 `F-042`、ユニット `UF-125`**。当てる直前、`T-296` ・ `F-042` ・ `UF-125` の字面は木に 0 件、`CR-530` は登録と予告の 4 か所（`docs/development-records/rulings.md`、`handoff-state-machine.md:127`、`CR-439:598`、`CR-520` の第 2.2 節 ・ 第 9 節）だけだった。見出しが定義する表の上端は `T-295`（検査の `COVERAGE` 行 ——「largest T-295」）。⛔ `T-294` ・ `F-040`（`CR-510` が使わずに返した帯）は本書も取らない。
> - 新しい名の重なり（同じ 6 か所、当てる直前）: `agentApiEnablingStateMachine` ・ `agentApiEnablingState` ・ `AgentApiEnablingState` ・ `agentApiEntryPressed` ・ `rememberedEnablingLoaded` ・ `isRememberedEnabled` ・ `storeAgentApiEnabling` ・ `AgentApiValues` ・ `agent-api-values` ・ `emptyAgentApiValues` ・ `stepAgentApiValues` ・ `IS_AGENT_API_EVENT` は 0 件だった。
> - ⚠️ 名の重なり: 領域のキー `agentApi` は、入力の翻訳係の入口の表の鍵 `ENTRY.agentApi`（`src/adapter/input-command-translator/input-command-translator.ts:678`、値は `'IC-20'`、読み手 `:1115`）と同じ字面である。置き場が違い（入口の鍵 ／ 根の欄 `ScreenSession.agentApi`）、意味も同じ `Agent API` を指すので、改名しない。`agentApiEnablingWatch`（`frame-loop.ts:2049`、把手）は `agentApiEnablingState` と語幹が同じだが、別の語である。
> - 台帳の上端（`docs/development-records/` の全ファイル）: 起草時（2026-09-21）は `DFC-702`、`PND-500`、`JDG-290`。当てる直前（2026-09-22）は `DFC-786`、`PND-530`、`JDG-366`。⇒ 第 8 節の候補は仮の名（候補 1 ・ 2）で呼び、番号は台帳に書く者が書く直前に引く。
> - 行 ID の接頭辞・要求 ID は立てない。状態・出来事・遷移に通し番号を振らない（`JDG-286`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **波 A はどの `CH-` も直接には前へ進めない —— 基盤の作業である。** 利用者に見える振る舞いを 1 つも変えない —— 波 A ではシェルがこの領域の出来事を 1 つも作らない（`git grep -n "agentApiEntryPressed\|rememberedEnablingLoaded" -- src` は `agent-api-values.ts` と `advance-screen-session.ts` だけ、2026-09-22）。シェルの副作用の表（`effectRunnersOf`）は新しい副作用 `storeAgentApiEnabling` を `unwiredEffect` に向けるだけである（`frame-loop.ts:1455`）。`raiseNotice` は既に結線された行（`:1419`）が受けるが、この領域の出来事が来ないので走らない。波 B（結線）も振る舞いを変えない（`JDG-57`、`docs/development-records/rulings.md:134`）。

守るもの:
- **`FR-065`（req:6081〜）** —— 有効であるあいだそれを画面に示す（`IC-20` の押された見た目 —— `src/adapter/screen-renderer/app-header-items.ts:125`）、オリジンごとに記憶する（MUST、req:6090）、文書ごとに記憶しない（MUST NOT、req:6092）、無効にしても渡した参照は取り消せないと示す（`RS-20`、req:6430）。
- **`FR-066`（req:6110〜）と `S-99i`（set:391）** —— 能力（本書の機械）と見え方（画面の値の `dialogueFieldDisplayStateMachine`）を 1 つの値で兼ねてはならない（MUST NOT、req:6114）。⇒ 別の領域に置けば、根の合成（`SF-8`）で自ずから直交する。
- **`GL-003`** —— この領域の出来事は `IC-20` の押下と起動の 1 回だけで、ポインタの移動では 1 つも作らない（`SF-5`、des:1047）。性能は `LM-19`。⛔ **測る前に利用者を呼ぶ**（`RISK-001` の門）。

### ② レビュー観点のどの条項を当て、何が出たか

- **R4 「状態機械」の節 ／ R4.4** —— 機械は名詞句 ＋ `StateMachine`（`agentApiEnablingStateMachine` ——「`Agent API` の有効化」を追う）、今の状態は `agentApiEnablingState` ／ 型 `AgentApiEnablingState`。状態は過去分詞（`disabled` ・ `enabled` ——「この状態機械は今 `enabled` である」と読める）。出来事は主語 ＋ 過去形（`agentApiEntryPressed` ——前例 `dialogueFieldEntryPressed` ・ `fullScreenEntryPressed`、`rememberedEnablingLoaded`）。ガード `isRememberedEnabled`（`is` ＋ …）。副作用は動詞 ＋ 目的語（`storeAgentApiEnabling`、既存の `raiseNotice`）。既存 78 の出来事のキーと重なり 0（`npm run gen` の `load()` の問題 0）。
- **5.5 の原稿の規則**（des:756「原稿に載せるのは、要求が名指す状態・出来事・遷移だけとする（MUST）」）—— `enabled` ・ `disabled` は `FR-065`「有効であるあいだ」、`FR-066`「`Agent API` が有効であるあいだ」、`RS-35`（req:6445「`Agent API` が入っていないので、対話欄を出せない」）が名指す。出来事は `IC-20`（押下）と `S-99b`（記憶）が名指す。
- **`SF-5`（des:1047）** —— 有効・無効は押下と記憶の履歴で決まり、フレームの値から導けない ⇒ 状態。
- **`SF-6`（des:1048）** —— 記憶へ書くことは副作用（値として返し、シェルが実行する）。起動のときに記憶を読んだ結果は出来事として `step` へ戻す。
- **`SF-10`（des:1052）** —— 文書を集約に入れない理由（書き込みの唯一の経路）は、対話の記録と監視の登録にもそのまま当たる（決定 5 ・ 6）。
- **`SF-8`（des:1050）** —— 画面の値の `dialogueFieldEntryPressed` が既に運ぶ値 `isAgentApiEnabled` をガードに使っている（原稿 `docs/spec/_source/state-machines.json:681`、機械 `:1903`〜、升 `:1926`〜。コード `src/use-case/advance-screen-session/screen-values.ts:229` ・ `:781`〜`:806`）。この値を詰めるのは公開エントリか呼び手の役目（`UT-11`、des:338）であり、詰める元が本書の領域になる。⇒ 画面の値の原稿は 1 字も変えない。
- **原稿の形（スキーマ）** —— 1 つの枝が持てる副作用は 1 つ（`docs/spec/_source/state-machines.schema.json` の `branch.effect` は識別子 1 つ）。1 つの出来事は根の升と機械の升の両方を持てる（前例: 名前付けと入力欄の `creationLanded` —— 根の副作用 `bringCreatedRowIntoSight` と機械の升）。⇒ 記憶へ書くのを根の升、無効にしたときの通知を機械の升に分けた（決定 3）。
- **`R4.2`（await 跨ぎ）** —— 書き手（`setAgentApiEnabled`、`frame-loop.ts:2912`〜`:2918`）は同期の関数。

### ③ 利用者に問うこと・**問わずに決めた**こと

**問うこと**: ⭐ **なし（0 件）。** 候補 9 つに打った 3 つの反証は第 5 節に残した。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | **状態機械を立てる。置き場は新しい領域 `agentApi`（名「`Agent API`」、型の幹 `AgentApiValues`、ファイル `agent-api-values.ts`）** | 状態: `FR-065` が「有効であるあいだ」を名指し（5.5 の規則）、値は押下と記憶の履歴で決まる（`SF-5` に当たらない）。`CR-470` の「作らない」の判断は、名指される状態が既に別の機械に在ったから成り立った（`CR-470` の決定 1）—— ここでは持ち主が無い。置き場: 計画の記録 4 の 6 番目（`refactor-plan-report-2026-09-13.md:253`）と `CR-490` の 11.7 の 3 が新しい領域と数える。画面の値に入れると `{in: …}` でガードを書けるが、`FR-066` ・ `S-99i` が「能力と見え方を兼ねない」と MUST NOT で分けたものを同じ領域に寄せることになり、画面の値の原稿（`dialogueFieldEntryPressed` の運ぶ値とガード）を書き換えることにもなる ⇒ 退けた |
| 決定 2 | **状態は `disabled`（初期）と `enabled` の 2 つ。運ぶ値は無い** | 初期が `disabled` なのは、`FR-065` の RATIONALE（「既定で公開しない」、req:6087）と `CP-17`（des:124）と、いまのコード（`startupAgentApiEnabled` は記憶が文字列 `true` のときだけ真 —— `frame-loop.ts:1964`〜`:1965`）。`S-99b` の既定の欄は `—`（set:385）で、既定値は機械の初期が持つ |
| 決定 3 | **押下 `agentApiEntryPressed`（`IC-20`）は両向きに移す。記憶へ書くのは根の升の副作用 `storeAgentApiEnabling`（押した後の値を書く）、無効にしたときの `RS-20` は機械の升の副作用 `raiseNotice`** | いまのコード: `carryOutAction` の `toggleAgentApi`（`frame-loop.ts:4160`〜`:4163`）が `setAgentApiEnabled(!isAgentApiEnabled)` で記憶へ書き（`:2916` の `writeBrowserStored('S-99b', …)`）、無効になったときだけ `RS-20` を上げる（`:4162`）。枝の副作用は 1 つなので 2 か所に分けた（第 0 節 ②）。書く値は押した後の状態から導ける（中身はコードが持つ —— `SD-3`）。前例 `storeLanguage`（画面の値の根の升）。⭐ 副作用の列は根の升が先（`[storeAgentApiEnabling, raiseNotice]`）—— いまの「書く → 知らせる → 通知」の順と、生成した表の並び（根が先）に合わせた |
| 決定 4 | **起動のときの記憶は出来事 `rememberedEnablingLoaded{isRememberedEnabled}`（源は副作用の結果）で機械へ戻す。`disabled` の上で `isRememberedEnabled` が真なら `enabled`。記憶へ書かない・通知しない** | `emptyScreenSession` は定数（`SS-6`、des:1158）なので、記憶の値を初期に差し込めない。`SF-6` の「結果は出来事として `step` へ戻す」。いまのコードは起動で記憶を読むだけで書かず、通知も上げない（`frame-loop.ts:2048`）。前例: `fullScreenChanged`（ブラウザの状態を写す副作用の結果）。⚠️ `CR-436` の決定 16 は `language` の起動の値を原稿に入れず波 B2 に回したが、`language` は「値」で `null` を許せる。有効・無効は機械の状態なので、起動の出来事が無いと `enabled` に着けない |
| 決定 5 | **`dialogueLog` は領域に入れない（外）。シェルが持ち、`PostDialogueMessage` の保持者（`DialogueLogHolder`）を通して書く、いまの形のまま。`SF-10` に 1 文を足してこの判断を行へ上げた**（第 3.1 節） | 対話の記録はコンポーネント `CP-33`（`DialogueLog`、des:138）であり、書き込みの経路 `CP-16`（`PostDialogueMessage`、des:123 ——`src/use-case/post-dialogue-message/post-dialogue-message.ts:30`〜）を持つ。書き手は `Agent API` の口（`src/adapter/agent-api-endpoint/agent-api-members.ts:683`〜`:690`）と、`DFC-558` の直しの後は対話欄の確定。書いたものは文書と一緒に監視へ配られる（`frame-loop.ts:2108`、`AG-6` の刻印と別の順序 ——`AG-11`）。⇒ 文書を集約に入れない理由（`SF-10`「文書を変えるのは書き込みの唯一の経路で、セッションは読むだけ」）がそのまま当たる。集約の運ぶ値にすると、`CP-16` と根の升の 2 つの書き込みの経路ができる。⚠️ **`CR-490` の 11.1 の 6 の「運ぶ値」を覆す。** 棚卸しも、計画が芯（文書と現在値）に数えたものを書き手で Agent API へ移しただけである（`refactor-stage1-state-inventory-2026-09-13.md:205`） |
| 決定 6 | **監視の登録 `REGISTRATIONS`（`src/use-case/notify-change-watchers/notify-change-watchers.ts:37`）も集約に入れない（外）。波 B でシェルへ出し、`NotifyChangeWatchers` の 3 つの口（`watchChanges` `:41` ・ `unwatchChanges` `:48` ・ `notifyChangeWatchers` `:54`）へ保持者として引数で渡す** | 登録が持つのは購読者の受け口（`deliver` —— 呼ぶ側のコードが渡す関数、`agent-api-members.ts:660`〜`:678`）と購読ごとの印（`AG-6` の選び方の覚え）である。受け口は答えを待つ継続と同じ種類で、`CR-460` の決定 5（継続は集約に入れず、シェルに残す）と `CR-450` の決定 8（把手はシェル）が当たる。登録を名指す状態の要求は無い（`AG-6` ・ `AM-17` は配り方の規約）。`CR-379` の決定 7 の芯 —— 「シェルが持つ現在値の一部として引数で渡す」「表 T-065 は増やさない」（`CR-379:54`）—— は守る。⚠️ **同じ決定 7 の字面「セッションの領域へ移し」とはずれる**（集約の中ではなく横に置く）。公開の署名（`PI-15`）の割り方は波 B が決める（`CR-379` の決定 7 の ⛔） |
| 決定 7 | **面の覚え 3 つは外（段 6 の持ち場）。原稿にも集約にも入れない** | `settled`（`src/framework/dom-screen-surface/dialogue-field-drawing.ts:67`）: 対話欄で `Enter` を押した行の書き置き 1 つ（`:75`）。描くたびに捨て（`forgetSettled` `:95`〜`:97`、呼ぶのは `dom-screen-surface.ts:852`）、`readDialogueInput`（`:83`〜`:88`、`IF-9`）が渡す —— **呼び手は 0**（型の宣言 `src/adapter/screen-renderer/screen-surface.ts:49` だけ。`DFC-558`）。入力の書き置きは `CR-480` が外とした確定した値の書き置きと同じ種類。`DFC-558` の直しは読んで `PostDialogueMessage` を呼ぶだけで、この領域の機械を動かさない ⇒ 出来事にしない（`SF-5` の 3 文目）。`isFieldUp`（`:68`）: 面が描いた対話欄の有無の覚え（`markFieldUp`、呼ぶのは `dom-screen-surface.ts:832` の `field !== null`）。描く値は `readings.isAgentApiEnabled` と `dialogueFieldDisplayState` の積（`src/adapter/screen-renderer/dialogue-field.ts:19` ・ `:20`）⇒ **本書の `enabled` と画面の値の `dialogueFieldDisplayStateMachine.shown` の積から導ける描いた結果**であり、`CR-490` の 11.2 が書いた「`dialogueFieldDisplayStateMachine` の写し」ではない。`isNoticeShowing`（`src/framework/dom-screen-surface/field-editing.ts:103`、書き `:443` ——呼ぶのは `dom-screen-surface.ts:731`）: 描いた通知の有無の覚えで、面の中の `Enter` ・ `Esc` の行き先（`NT-8`、`isPressTakenByStandingNotice` `:106`〜`:109`）だけが読む。正は通知の `noticeDisplayStateMachine`。3 つとも `CR-470` の決定 4 ・ `CR-490` の 11.2 の「DOM へ書いた値・描いた結果の覚え」に当たる |
| 決定 8 | **宿主への公開点の設置と撤去（`window` の `grSchedulerAgentApi`）は副作用の列に入れない。シェルが `agentApiEnablingState` の種類を宿主へ映す（描くのと同じ筋）** | いまのコードは値の**見張り**である —— `agentApiEnablingWatch` は値が変わるたびに呼ばれ（`frame-loop.ts:2917`）、登録の場で今の値を 1 度知らせる（`:4551`〜`:4554`）。設置と撤去は `src/framework/single-html-shell/single-html-shell.ts:460`〜`:470`（名は `:140`）。`FR-065` の「有効であるあいだ」は状態の間ずっと成り立つ条件で、升 1 つの出来事ではない。枝の副作用が 1 つなので、無効にする升には `RS-20` と撤去の 2 つが入らない。⚠️ `setAgentApiEnabled` の TRAP（`:2913`「変わらない値を知らせると、渡した参照を設置し直して上書きする」）は `SF-3`（変わらない出来事は同じ参照）が守る —— 種類が変わったときだけ映す。`DFC-535` の ①（登録の場で今の値を知らせる約束が 1 行の実装に頼る）は、映す側が今の状態を読むので形で閉じる（直すのは波 B） |
| 決定 9 | **`isRememberedEnabled` は起動で読んだ記憶が文字列 `true` と等しいか（いまの `startupAgentApiEnabled` と同じ）。壊れた記憶・読めない宿主は偽** | `frame-loop.ts:1964`〜`:1965` と `readBrowserStored` の `try`（`:1901`〜`:1908`）。`JDG-78` —— 異常系を足さない |
| 決定 10 | **表 T-075 の新しい行 `UF-125` の「負う要求」は `—`** | `CR-440` ・ `CR-450` ・ `CR-460` ・ `CR-480` ・ `CR-490` ・ `CR-520` と同じ。波 A では画面がこのユニットを呼ばない。`FR-065` は今も `frame-loop.ts`（`UF-48`）が負う |
| 決定 11 | 識別子: 表 `T-296`、図 `F-042`、`UF-125`、ファイル `agent-api-values.ts` | 依頼の帯 |

**決定 1 で比べた 3 案**:

| 案 | 形 | 得るもの | 代償 | 判断 |
|---|---|---|---|---|
| 機械にしない（外） | 記憶 `S-99b` を持ち主とし、シェルが起動で読んで持ち続ける（いまの `let`） | 原稿が増えない | `FR-065` が名指す状態が図にも表にも無い。画面の値の `dialogueFieldEntryPressed` のガードの値の出どころが原稿の外に残る。`let` が集約の外に残り、ADR-002 の Context（`frameLoop` の `let` が散る）を閉じない。`SF-10` の外は「書き込みの唯一の経路」を持つもののためで、`S-99b` はそれを持たない | 退けた |
| **新しい領域** | `agentApi` に機械 1 つ | 能力（`FR-065`）と見え方（`FR-066` ・ `S-99i`）が別の領域に分かれ、根の合成で直交する。画面の値の原稿を 1 字も変えない | 領域の枠（ファイル・合成・契約試験）が 1 つ増える。画面の値のガードの値は公開エントリか呼び手が詰める（`SF-8`） | **採った** |
| 画面の値に機械を足す | `screen` に `agentApiEnablingStateMachine` | `dialogueFieldDisplayStateMachine` のガードを `{in: agentApiEnablingStateMachine.enabled}` で書ける | 画面の値の原稿（出来事の運ぶ値とガード 4 枝）を書き換える。能力と見え方を同じ領域に寄せる | 退けた |

---

## 1. 測った事実（2026-09-22 に測り直した。起草時の値は `9b8a22b7`、2026-09-21）

| 数 | 値 | 測り方 |
|---|---|---|
| `frameLoop` の範囲 | 1969〜4567 行（ファイルは 4645 行 —— 本書の 2 行を含む）。起草時は 1799〜4414 行 ／ 4492 行 | `grep -nE "^(export )?function frameLoop"` と、その後の最初の `^}` |
| `frameLoop` が直に持つ `let` | 57（うちこの領域 3: `isAgentApiEnabled`:2048 ・ `agentApiEnablingWatch`:2049 ・ `dialogueLog`:2084）。起草時は 66 | `sed -n '1969,4567p' … \| grep -c "^  let "` |
| 棚卸しとの差 | 棚卸しは Agent API の行 6（`refactor-stage1-state-inventory-2026-09-13.md:210` —— 上の 3 と、面の `settled` ・ `isFieldUp`、`REGISTRATIONS`）。本書は面の `isNoticeShowing`（`CR-490` の 11.2 が挙げた）を足して 7 | 名前で照合 |
| `isAgentApiEnabled` の書き手 ／ 読み手 | 書き 1: `setAgentApiEnabled` の `:2915`（呼ぶのは `carryOutAction` の `toggleAgentApi`:4161）。読み 7: `runFrame` の読みの束 `:2416`、`setAgentApiEnabled`:2914、`answerSettledEntry` の `IC-18` の枝 `:3758` ・ `:3759`、`carryOutAction` の `toggleAgentApi`:4161 ・ `:4162` と `toggleDialogueFieldVisible`:4167、`watchAgentApiEnabling`:4553。⚠️ 起草時の `answerSettledEntry` の `RS-35` の直書きは、`CR-436` の波 B2 で画面の値の `dialogueFieldEntryPressed` へ移っていた | `grep -n "isAgentApiEnabled" src/framework/single-html-shell/frame-loop.ts` |
| 原稿が既に持つ受け口 | 画面の値の出来事 `dialogueFieldEntryPressed`（源 `IC-18` ・ `FR-066`、運ぶ値 `isAgentApiEnabled`）と、`dialogueFieldDisplayStateMachine`（`shown` ／ `hidden`、4 枝のガード `isAgentApiEnabled`、偽の枝は `raiseNotice` `RS-35`） | `state-machines.json:681`、`:1903`〜。コードは `screen-values.ts:229` ・ `:781`〜`:806` |
| 原稿の前 | 7 領域 ・ 機械 23 ・ 状態 64 ・ 出来事 78 ・ 升 158 ＋ 根の升 10（`CR-510` ・ `CR-520` の波 A の後）。起草時は 6 ・ 21 ・ 60 ・ 74 ・ 150 ＋ 10 | スクラッチの `a2-apply.py`（升は機械 × 出来事 × 状態の組の数） |
| 原稿の後 | `load()` の問題 0（`npm run gen` が通った）。8 領域 ・ 機械 24 ・ 状態 66 ・ 出来事 80 ・ 升 161 ＋ 根の升 11 —— 本書の差は 領域 +1 ・ 機械 +1 ・ 状態 +2 ・ 出来事 +2 ・ 升 +3 ・ 根 +1（起草時の予測と同じ差） | 同上 |
| 刷った生成物 | `tbl-state-machines.md` の末尾に節「`Agent API`（`agentApi`）」—— 表 T-296 ・ 図 F-042（55 行増えた。ほかの節の差 0）。型の生成区画は起草時に刷った `a-printed-types.ts` と同じ形 | `git diff --stat docs/spec/_assets/tbl-state-machines.md` |
| md-checks の最終行 | 前 `tables=183  figures=26  rows=2257  uids=162` → 後 `tables=184  figures=27  rows=2258  uids=162` | 第 7 節 |
| 表 T-075 | 113 行 → 114 行（上端の番号は `UF-124` → `UF-125`）。`SU-3` と `units.contract.test.ts` も 113 → 114 | `grep -c "^\| UF-" docs/spec/05-07-design.md` |

---

## 2. 棚卸しの測り直しと分類

分類は `SF-5`（des:1047）、`SF-6`（des:1048）、`SF-10`（des:1052）と 5.5 の原稿の規則（des:756）を当てた。
**状態** ＝ 原稿の機械の状態。**フレームの値** ＝ シェルに残る値と、それらから毎回導ける値。**外** ＝ この領域の状態ではない（行き先を書く）。

| # | 覚え | 所在 | 書き手 ／ 読み手 | 分類 | 名指す仕様の行 |
|---|---|---|---|---|---|
| 1 | `isAgentApiEnabled` | `frame-loop.ts:2048`（初期 `startupAgentApiEnabled()` —— `:1964`〜`:1965`） | 第 1 節の表 | **状態** `agentApiEnablingStateMachine.disabled` ／ `enabled` | `FR-065` req:6081、`S-99b` set:385、`IC-20` glo:533、`RS-20` req:6430、`FR-066` req:6110 ・ `RS-35` req:6445 |
| 2 | `agentApiEnablingWatch` | `:2049` | 書き: `watchAgentApiEnabling`:4552。読み: `setAgentApiEnabled`:2917 | **外**（把手 —— 決定 8。映す相手の宿主の公開点を持つ） | —— |
| 3 | `dialogueLog` | `:2084`（`DEVIATION` の注 `:2083` —— `DFC-558`） | 書き: `dialogueSeams.dialogueHolder.replace`（`:2941`〜）。読み: `audience.deliver`:2108、`runFrame`（`screenViewFromRegions` の引数）、`exportScene`、`readSnapshot`、`dialogueHolder.read` | **外**（`CP-33` ・ `CP-16` の保持者 —— 決定 5） | `AG-11` req:6065、`FR-066`、`CP-16` des:123、`CP-33` des:138 |
| 4 | `REGISTRATIONS` | `notify-change-watchers.ts:37`（モジュール。検査 61 の基準線の `HELD` 1 行 ——`.claude/skills/spec-graph-check/module-state-baseline.txt`） | 書き: `:43` ・ `:49` ・ `:74`。読み: `:42` ・ `:56` ・ `:73` | **外**（シェルの保持者 —— 決定 6）。⚠️ いまは `UseCase` のモジュールの可変状態（`DFC-583` の ②） | `AG-6` req:6064、`AM-17`、`CP-15` des:122、`LY-5`、`SF-7` |
| 5 | `settled` | `dialogue-field-drawing.ts:67` | 書き: `onEntryKeyDown`:75、`forgetSettled`:96。読み: `readDialogueInput`:85（呼び手 0） | **外**（入力の書き置き —— 決定 7） | `AG-11`、`IF-9`、`PND-150` |
| 6 | `isFieldUp` | `:68` | 書き: `markFieldUp`:93（`dom-screen-surface.ts:832`）。読み: `onEntryKeyDown`:74、`readDialogueInput`:84 | **外**（描いた結果の覚え。値は `enabled` ∧ `dialogueFieldDisplayStateMachine.shown` から導ける —— 決定 7） | `FR-066`、`S-99i` |
| 7 | `isNoticeShowing` | `field-editing.ts:103` | 書き: `holdNoticeShowing`:443（`dom-screen-surface.ts:731`）。読み: `isPressTakenByStandingNotice`:107 | **外**（描いた結果の覚え。正は `noticeDisplayStateMachine` —— 決定 7） | `NT-8` |
| 8 | 「有効かどうか」を書き出しの絵で偽にすること | `exportScene` の読みの束 `isAgentApiEnabled: false`（`frame-loop.ts:2771`） | —— | **外**（書き出しの絵を組む値。状態を読まない） | `FR-080` |

⇒ **覚え 7（＋書き出しの定数 1）: 状態 1 組（機械 1）、外 6。運ぶ値 0。**

### 2.1 領域をまたぐもの

| 読む側 ／ 書く側 | いま | 移した後 |
|---|---|---|
| 対話欄の入口 `IC-18` のガード | `answerSettledEntry`:3757〜3760 と `carryOutAction` の `toggleDialogueFieldVisible`:4164〜4167 が、画面の値へ `dialogueFieldEntryPressed{isAgentApiEnabled}` を送る（`CR-436` の波 B2 が済ませた） | `isAgentApiEnabled` を根の `agentApi.agentApiEnablingState.kind === 'enabled'` から詰める（`SF-8`、`UT-11` の公開エントリか呼び手の役目）。⭐ 画面の値の原稿は変えない |
| ヘッダの `IC-20` ・ `IC-18` の見た目と対話欄 | `runFrame` の読みの束 `:2416` → `app-header-items.ts:120` ・ `:121` ・ `:125`、`dialogue-field.ts:19` | 描き手へ渡す `isAgentApiEnabled` を根から導く（フレームの値）。描き手の型の名は変えない |
| 宿主の公開点 | `agentApiEnablingWatch` と `single-html-shell.ts:460`〜`:470` | 1 段の後に `agentApiEnablingState` の参照が変わったら、シェルが種類を宿主へ映す（決定 8） |
| 書き出しの絵 | `exportScene` の `:2771`（偽の定数） | 変えない |
| 対話の記録と監視 | `dialogueLog`（`:2084`）・ `REGISTRATIONS` | シェルが持つ（決定 5 ・ 6）。集約の外 |

### 2.2 申し送り

| # | 相手 | 中身 |
|---|---|---|
| 1 | 波 B | `dialogueFieldEntryPressed.isAgentApiEnabled` は根の `agentApi` から詰める。`toggleDialogueFieldVisible` の `PND-419`（`frame-loop.ts:4165`〜`:4166`）は画面の値の持ち物のまま |
| 2 | 段 6（面） | 決定 7 の 3 つは面に残す。⚠️ `isFieldUp` の正は「有効 ∧ 表示」であって `S-99i` だけではない —— `refactor-stage1-state-inventory-2026-09-13.md:138` の「`S-99i` の写し」は正しくない（記録は書き換えず、本書が正す） |
| 3 | `DFC-558` の直し | 対話欄の確定は `readDialogueInput` を読んで `PostDialogueMessage` を呼ぶ。本書の領域には出来事を足さない（決定 5 ・ 7） |
| 4 | `DFC-583` の直し | 決定 6 の波 B がその ② を閉じる。① `deliveringNotices` は通知の領域（`CR-440`）の持ち物 |
| 5 | `DFC-535` | 決定 8 の映し方で ① が形で閉じる。② （`agentApiSeams` の工場）は本書の外 |

---

## 3. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A**（当てた） | なし | 3.1 の表 | `CR-490` の 3 節と同じ組（18 ・ 19 ・ 21 ・ 26b ・ 27 ・ 30 ・ 33 ・ 59 ・ 60 ・ 61 ・ 62 ・ 63 ＋ vitest）。⚠️ 検査 11 ・ 12 ・ 33 は `FAIL` の行を出さずに赤くなる —— 出力の全体を当てる前の走りと比べた（第 7 節） |
| **B** | `CR-436` の波 B2 が当たっている（当たった —— `39c15ff4`）。`JDG-291` により段 5 ・ 段 6 を待たない | `frame-loop.ts`: `let isAgentApiEnabled` を根の `agentApi` へ。起動で `rememberedEnablingLoaded{isRememberedEnabled: readBrowserStored('S-99b') === String(true)}` を**最初の 1 枚より前に**送る（いまは構築の時点で値が在り、最初の 1 枚の `IC-20` が押された見た目で出る）。`toggleAgentApi` → `agentApiEntryPressed`。副作用 `storeAgentApiEnabling` → `writeBrowserStored('S-99b', …)`（`:1455` の `unwiredEffect` を置き換える）、`raiseNotice` `RS-20` はいまの `raiseNotice` の行が受ける。副作用の順は根の升が先（決定 3）。決定 8 の映し（`agentApiEnablingWatch` は把手のまま残す）。決定 6: `REGISTRATIONS` をシェルの保持者へ出し、`watchChanges` ・ `unwatchChanges` ・ `notifyChangeWatchers` へ引数で渡す（`agent-api-members.ts:660`〜`:678`、`frame-loop.ts:2108`）。⚠️ 検査 61 の基準線の `HELD` 1 行を消す（見つけるものが無くなった行は赤になる）—— ⛔ **基準線を動かすのは利用者の了承の後**（体に触らせない） | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部（`IC-20` の往復、再読み込みで有効が残ること、`RS-20`、`IC-18` の `RS-35`、`watchChanges` の配り）、`LM-19`（⛔ **利用者を呼んでから**） |
| **C**（B の直後の別のコミット） | 波 B で今日との一致を確かめた後（`JDG-57`） | 第 8 節の候補のうち、台帳で直すと決まったもの | 同上 |

⭐ `frameLoop` の `let` は波 B で本書の分 57 → 56（`isAgentApiEnabled` だけ。`agentApiEnablingWatch` は把手、`dialogueLog` は外 —— ⛔ 波 B の入口で測り直す）。

### 3.1 波 A の中身（当てた形）

| 対象 | 前 | 後 |
|---|---|---|
| 原稿 `docs/spec/_source/state-machines.json` | 7 領域 | 領域 `agentApi` を `regions` の末尾に足した（付録 D。ほかの領域と `priorities` は 1 字も変えていない） |
| 生成物 `docs/spec/_assets/tbl-state-machines.md` | 7 領域 | ＋ 節「`Agent API`（`agentApi`）」: 表 T-296、図 F-042（付録 C の形） |
| 生成器 `docs/spec/_source/state_machines_json_to_md.py` | 出来事の節の見出しを「名 ＋ の出来事」と刷る | 名がコードの字面で終わるとき（`` `Agent API` ``）だけ間に空白を 1 つ入れる ——「`Agent API` の出来事」。ほかの 7 領域の出力の差 0 |
| 5.5 の散文（`05-07-design.md:777`） | 7 文 | 「第 8 領域（`Agent API`）のそれらを同じファイルの 表 T-296 に、状態遷移を 図 F-042 に示す。」 |
| `CP-39`（`:144`） | 「… / 表 T-295」 | ＋「/ 表 T-296」 |
| `SU-3`（`:245`） | 113 | 114 |
| `UT-11`（`:338`） | 「… ／ `interaction-record-values.ts`」、括弧「… 操作の記録は 表 T-295」 | ＋「／ `agent-api-values.ts`」、括弧に「、`Agent API` は 表 T-296」（`RA-4`） |
| 表 T-075（`:489`） | 113 行 | `UF-125` ／ `AdvanceScreenSession` ／ `agent-api-values.ts` ／ `pure` ／ 「`Agent API` の領域の遷移（表 T-296）と、そこから生成した型と遷移表の定数の区画」／ `—`（決定 10）。`UF-124` の後 |
| `PI-39`（`:572`） | 「… ・選択・操作の記録の 7 領域」、出来事・副作用・初期の欄に「… ・ 表 T-295」 | 「… ・選択・操作の記録・`Agent API` の 8 領域」、3 つの欄に「・ 表 T-296」（`RA-5`） |
| `SF-10`（`:1052`） | 「文書は集約に入れない。<br>文書を変えるのは書き込みの唯一の経路で、セッションは読むだけ」／ 根拠「表 T-042 の `MS-1`」 | 本文に足した:「。<br>対話の記録（`CP-33`）と変更の監視の登録も集約に入れない —— 書くのはそれぞれ `PostDialogueMessage`（`CP-16`）と `NotifyChangeWatchers`（`CP-15`）の経路だけであり、シェルが持って引数で渡す」。根拠に「`CP-16`、`CP-15`、`AG-6`」を足した。⚠️ 監視の登録はいま `UseCase` のモジュールに在る（`DFC-583` の ② —— 仕様が先に着地し、コードは波 B で追う。`CR-500` の `IF-9` と同じ形） |
| 図 F-028 | 7 領域の実線 | ＋ `AgentApiRegion["領域 agentApi<br>Agent API（表 T-296）"]` と根からの実線（`:1103` ・ `:1117`）、下の段に「前: 領域 agentApi」==>「同じ参照」==>「後: 領域 agentApi」（`:1138`）。⚠️ mermaid のラベルにはバッククォートを入れない |
| `SS-6`（`:1158`） | 「… ・ 表 T-295 の状態の一覧の初期」 | ＋「・ 表 T-296」 |
| `src/use-case/advance-screen-session/agent-api-values.ts`（新、`UF-125`） | 無い | 手書きの運ぶ値の型 `AgentApiValuesEventCarried { isRememberedEnabled: boolean }` と副作用の型（3.2）、生成区画、`emptyAgentApiValues`、`onAgentApiEntryPressed` ・ ガード `isRememberedEnabled` ・ `onRememberedEnablingLoaded` と 2 行の `HANDLERS`、`stepAgentApiValues`。モジュールスコープの可変状態 0（`SF-7`） |
| `advance-screen-session.ts`（`UF-84`） | 7 領域 | ＋ `agentApi: AgentApiValues`。`SessionEvent` ・ `SessionEffect` を 8 領域の和に、`emptyScreenSession` を広げ、`IS_AGENT_API_EVENT`（2 つ）と `isAgentApiEvent` を既存の形で足し、`advanceScreenSession` に振り分けを 1 行足した |
| `frame-loop.ts`（`UF-48`） | —— | `effectRunnersOf` に `storeAgentApiEnabling: unwiredEffect`（`:1455`）。型が副作用の漏れを止めるので要る。`raiseNotice` は既にある行（`:1419`）が `RS-20` も受ける（`NoticeReason` は `RS-20` を含む —— `:775`）。ほかは触らない |
| `session-effects.ts`（`UF-123`） | `// see` に 表 T-295 まで | ＋ 表 T-296（注釈だけ） |
| `docs/development-rules/03-implementation.md` | —— | ＋ `AGENT_API_VALUES_INITIAL_AXES` ・ `AGENT_API_VALUES_TRANSITIONS`（検査 30） |
| `.claude/skills/spec-graph-check/check-provenance.py` | 7 領域のファイル | ＋ `agent-api-values.ts`（検査 21） |
| `tools/generate_state_machine_types.py` | 文書の文字列に 表 T-295 まで | ＋「table T-296 for `agentApi`」（文書の文字列だけ） |
| `tests/contract/units.contract.test.ts` | 113 | 114 |
| `tests/unit/uf-123-session-effects.test.ts` | 副作用の種類の表に 28 の名 | ＋ `storeAgentApiEnabling`（無いと型が閉じて `npm run typecheck` が落ちる） |
| `tests/unit/uf-125-the-agent-api-transition-table-is-printed-from-the-manuscript.test.ts`（新） | 無い | `uf-124` の同じ試験を写した —— 生成した表が原稿の升を行ごとに写すこと。生成器は `…_TRANSITIONS` を常に `export` で刷り、検査 30（`JDG-139`）は他のファイルが読まない公開の写しを赤にするため |
| `docs/development-records/changelog.md`（版 0.29 の行） | 「`AdvanceScreenSession`（9）」 | 「（10）」（`audit-ch5.py` が 表 T-075 と突き合わせる） |
| 生成物 `docs/spec/_assets/tbl-row-id-prefixes.md` | `UF` 113 | 114（`npm run gen`） |
| 契約試験 | 無い | ⭐ 仕様だけを読む別の体が書く（`RA-6`）: 原稿の領域 `agentApi` を読み、(1) 各升の先の種類と副作用の名・引数が表と一致（`isRememberedEnabled` の真偽を両方作る）、(2) 空の升（`rememberedEnablingLoaded` × `enabled`、ガードが偽のとき）は同じ参照と共有の空の列（`SD-3`）、(3) 根の升: `agentApiEntryPressed` はどちらの状態でも `storeAgentApiEnabling` を出し、`enabled` からのときだけ `raiseNotice`（`RS-20`）も出す、(4) この領域の出来事がほかの 7 領域を同じ参照のまま残し、ほかの領域の出来事がこの領域を同じ参照のまま残すこと（`SS-5`）、(5) 画面の値の `dialogueFieldDisplayStateMachine` との直交 —— 有効 2 × 表示 2 の 4 つの組で、一方の出来事が他方を同じ参照に残すこと |

⚠️ ほかの領域の契約試験は原稿の全領域の出来事を読み、見本の無い運ぶ値に既定の値を詰める（`CR-490` の改訂の記録 11）。本書の運ぶ値は真偽 1 つ（`isRememberedEnabled`）で、当てた後にほかの 7 領域の契約試験は見本の表を変えずに緑のままだった。

### 3.2 継ぎ目（体に渡すときは両方のブリーフに同じ字面で書く）

- 領域のキー `agentApi`、名「`Agent API`」、型の幹 `AgentApiValues`、ファイル `agent-api-values.ts`、公開は `emptyAgentApiValues` ・ `stepAgentApiValues` と生成した型・定数（`AgentApiEnablingState`、`AgentApiValuesEvent`、`AgentApiValuesEffectName`、`AGENT_API_VALUES_TRANSITIONS`）と手書きの `AgentApiValuesEventCarried` ・ `AgentApiValuesEffect`。
- 機械 `agentApiEnablingStateMachine`（今の状態 `agentApiEnablingState`、型 `AgentApiEnablingState`）: `disabled`（初期）・ `enabled`。運ぶ値は無い。
- 根の運ぶ値: 無い。根の升 1: `agentApiEntryPressed` → 副作用 `storeAgentApiEnabling`（引数なし。書く値は押した後の状態から導く）。
- 出来事（2）: `agentApi/agentApiEntryPressed`（運ぶ値なし）・ `agentApi/rememberedEnablingLoaded`（`isRememberedEnabled`: `boolean`）。
- ガード（1）: `isRememberedEnabled`（出来事の運ぶ値をそのまま読む）。副作用（2）: `storeAgentApiEnabling` ・ `raiseNotice`（引数 `RS-20`）。`{in: …}` 0。
- 副作用の型は手で書く: `{ readonly type: Exclude<AgentApiValuesEffectName, 'raiseNotice'> } | { readonly type: 'raiseNotice'; readonly reason: 'RS-20' }`（画面の値 ・ ファイル操作の `raiseNotice` と同じ形の引数）。
- 1 段の答え: `disabled` × `agentApiEntryPressed` → `enabled` ／ `[storeAgentApiEnabling]`。`enabled` × `agentApiEntryPressed` → `disabled` ／ `[storeAgentApiEnabling, raiseNotice(RS-20)]`（根の升が先）。`disabled` × `rememberedEnablingLoaded`（真）→ `enabled` ／ 副作用なし。それ以外の `rememberedEnablingLoaded` は同じ参照。
- 根: `ScreenSession { …; readonly agentApi: AgentApiValues }`。

---

## 4. この結論を覆すもの

- **`CR-434`（MCP の口、裁定待ち）が「接続が来たこと」を画面に見せると決めたとき**（`change-request/CR-434-mcp-is-a-carriage-over-the-agent-api.md:161`〜`:166`）—— `enabled` の下に「接続している ／ いない」を入れ子に置くか、直交する機械を 1 つ足す。同書の ① でサーバー案を採ると `FR-065` が権限の話に変わり、オリジンの記憶（`S-99b`）では足りない —— 本書の起動の出来事を見直す。
- **設置と撤去を副作用として表に書きたくなったとき**（決定 8）—— 原稿が 1 つの枝に複数の副作用を持てるように広げるか、`RS-20` を撤去の副作用の中へ畳む。どちらも本書の外。
- **`PND-419` が「無効にしたら `S-99i` を既定へ戻す」と裁定されたとき** —— 画面の値の `dialogueFieldDisplayStateMachine` に、本書の無効化から作る出来事が 1 つ要る（呼び手が 1 つの入力から 2 つの出来事を作る —— `CR-490` の決定 6 の形）。本書の升は変わらない。
- **第 8 節の候補 1（`NT-4`）が「起動で有効を告げる」と裁定されたとき** —— `rememberedEnablingLoaded` の `disabled` × [`isRememberedEnabled`] の升に `raiseNotice`（新しい理由の行）が付く。
- **決定 6 が `CR-379` の決定 7 の字面どおり「集約の中」と裁定されたとき** —— 根の運ぶ値 `changeWatchers` と、`watchChanges` ・ `unwatchChanges` ・ 配りの印の書き換えを根の升として足す。`SF-10` に足した 1 文から監視の登録を外す。

---

## 5. 問いの候補に打った 3 つの反証（`handoff.md` §0.2）

方法（起草時、2026-09-21）: (1) `docs/development-records/rulings.md` を grep —— 「`Agent API`」は `JDG-122`〜`JDG-131`（`JDG-130` の取り込みの合流ほか、どれも有効化の話ではない）、「有効化」は `JDG-119` ・ `JDG-120`（無関係）、「`S-99b`」「`localStorage`」「オリジン」「記憶」「監視」「購読」「`NT-4`」「`dialogueLog`」0 件、「対話」は `JDG-68` ・ `JDG-84` ・ `JDG-153` ・ `JDG-175` ・ `JDG-290`（有効化と記録の置き場ではない）、「`REGISTRATIONS`」は `JDG-124`（基準線の初期値）・ `JDG-280`（型の import）。(2) `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <行>`: `FR-065` 要求 3 ／ 参照 13、`FR-066` 2 ／ 13、`S-99b` 0 ／ 1、`IC-20` 0 ／ 0、`RS-20` 0 ／ 0、`NT-4` 1 ／ 3、`NT-5` 2 ／ 8、`AG-11` 2 ／ 12、`AG-6` 3 ／ 17、`CP-15` 0 ／ 0、`CP-16` 0 ／ 2、`CP-17` 0 ／ 1、`CP-33` 0 ／ 1、`SF-6` 0 ／ 2、`SF-10` 0 ／ 0、`SS-6` 0 ／ 1。(3) 導けるか。当てる直前（2026-09-22）に (1) を引き直した —— 起草の後に足された裁定（`JDG-291`〜`JDG-366`）に `Agent API` の有効化・対話の記録・監視の登録を名指すものは無かった（`JDG-291` は波 B を段 5 ・ 6 と切り離す裁定で、本書の波 B の入口に当たる）。

| 候補 | (1) | (2) | (3) 導けるか | 結果 |
|---|---|---|---|---|
| 機械を持つか | 0 件 | `FR-065` 3 ／ 13 | **導けた（持つ）** —— `FR-065` ・ `FR-066` が状態を名指し、値は履歴で決まる。`JDG-289` の筋（仕様が 2 つの状態を名指せば機械） | 決定 1 |
| 置き場（新しい領域か画面の値か） | 0 件 | `FR-066` 2 ／ 13 | **導けた（新しい領域）** —— `FR-066` ・ `S-99i` の MUST NOT、計画の記録 4、`CR-490` の 11.7 | 決定 1 |
| オリジンの記憶は集約の外の設定か | 0 件 | `S-99b` 0 ／ 1、`SF-10` 0 ／ 0 | **導けた（状態 ＋ 書く副作用 ＋ 起動の出来事）** —— `SF-6`、`SF-10` の外は書き込みの経路を持つものだけ、前例 `language` ・ `storeLanguage`（`CR-436`） | 決定 3 ・ 4 |
| 起動の値を初期に差すか出来事にするか | 0 件 | `SS-6` 0 ／ 1 | **導けた（出来事）** —— `emptyScreenSession` は定数、`SF-6` の 2 文目、前例 `fullScreenChanged` | 決定 4 |
| 設置と撤去を副作用にするか | 0 件 | `CP-17` 0 ／ 1 | **導けた（映す）** —— いまのコードが見張り、枝の副作用は 1 つ | 決定 8 |
| `dialogueLog` を運ぶ値にするか | 0 件 | `AG-11` 2 ／ 12、`CP-16` 0 ／ 2 | **導けた（外）** —— `CP-16` ・ `CP-33` の経路、`SF-10` の理由 | 決定 5 |
| `REGISTRATIONS` の置き場 | `JDG-124`（基準線の初期値だけ） | `AG-6` 3 ／ 17、`CP-15` 0 ／ 0 | **導けた（シェルの保持者、集約の外）** —— `CR-460` の決定 5 ・ `CR-450` の決定 8（継続と把手はシェル）、`CR-379` の決定 7 の芯（引数で渡す）。字面とのずれは第 4 節に置いた | 決定 6 |
| 面の覚え 3 つ | 0 件 | `IF-9`（`CR-500` で測った 1 ／ 2） | **導けた（外）** —— `CR-470` の決定 4、`CR-480` の書き置き、`CR-490` の 11.2 | 決定 7 |
| 起動で有効を告げるか（`NT-4`） | 0 件 | `NT-4` 1 ／ 3 | **導けた（今日のまま告げない）** —— `JDG-57`。仕様との食い違いは台帳へ（2026-09-13 の裁定） | 第 8 節の候補 1 |

⇒ **3 つとも空だった候補は 0 件。問いは無い。**
⚠️ 利用者に**知らせる**価値があるのは 2 つ: `CR-490` の 11.1 の 6（`dialogueLog` は運ぶ値）を覆すこと（決定 5）と、`CR-379` の決定 7 の字面（セッションの領域へ）から監視の登録を外すこと（決定 6）。

---

## 6. （欠番 —— 草案の「継ぎ目」は 3.2 へ移した）

---

## 7. 数の予測と測った数

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行（`check.sh` の出力の同じ行）。
**起草時（`9b8a22b7`、2026-09-21）: `tables=181  figures=25  rows=2241  uids=162`。当てる前（`e9cefd60`、2026-09-22）: `tables=183  figures=26  rows=2257  uids=162`。当てた後（作業木）: `tables=184  figures=27  rows=2258  uids=162`。** ⭐ 本書の差だけを突き合わせる —— 予測どおりだった。

| | 波 A | 波 B | 内訳 |
|---|--:|--:|---|
| tables | +1 | 0 | 表 T-296 |
| figures | +1 | 0 | 図 F-042 |
| rows | +1 | 0 | `UF-125`（`SF-10` は本文だけ） |
| uids | 0 | 0 | 要求を足さない |

**そのほかの数**: 表 T-075 113 → 114、`SU-3` と `units.contract.test.ts` 113 → 114、`changelog.md` の「`AdvanceScreenSession`（n）」9 → 10、原稿は 8 領域 ・ 機械 24 ・ 状態 66 ・ 出来事 80 ・ 升 161 ＋ 根の升 11。`frameLoop` の `let` は波 B で 57 → 56。検査 61 の基準線は波 B で 2 → 1 行。
**`check.sh` の最終行**: 当てる前 `red: 23`、当てた後 `red: 23`（出力の全体を当てる前の走りと比べた —— 第 8 節の後の改訂の記録 2）。

---

## 8. 台帳の候補（⛔ 問いではない。どちらが正かを選ばない）

2026-09-13 の利用者の裁定（仕様とコードの食い違いは、どちらが正かを選ばずに台帳へ）に従い、台帳に書く者へ渡す。番号は書く直前に引き直す（2026-09-22 の上端 `DFC-786`）。⚠️ **どれも未検証（画面で押していない。コードと仕様を読んだだけ）。**

| 仮の名 | 食い違い | 片側 | もう片側 | 台帳の今 |
|---|---|---|---|---|
| **候補 1** | **起動時の保留中の用件として `NT-4` が名指す「`Agent API` の有効化」を、告げる所が無い** —— 記憶が有効を指すとき、起動は公開点を黙って置く（`frame-loop.ts:2048`、`single-html-shell.ts:460`〜`:470`）。起動の通知の理由は `RS-15` ・ `RS-21` ・ `RS-25` ・ `RS-26` ・ `RS-48` ・ `RS-51` だけ（`StartupNoticeReason`、`frame-loop.ts:205`〜`:208`）。表 T-233 で様式が `NT-4` の理由は `RS-19` だけで、有効化を告げる理由の行も無い。本書の機械もこの形を写す（決定 4） | `NT-4` req:6393「いまの用件は `Agent API` の有効化 1 つであり」 | コード（上）と 表 T-233 に行が無いこと（仕様の中の食い違いかもしれない） | 起草時 0 件（`DFC-462` は `NT-4` の一覧から「復帰」「復旧」を外した行で、残る「有効化」は扱っていない）。⚠️ `FR-065` の「有効であるあいだ、そのことを画面上に示すこと」は `IC-20` の押された見た目が満たしている |
| **候補 2** | **仕様の中の食い違い: `S-99b` の項目の名が「`Agent API` を有効にした文書の記録」** —— 同じ行の説明は「オリジンごとに 1 つ」「文書の識別子と対にしては置けない」と書き、`FR-065` は「有効化を文書ごとに記憶する形にしてはならない（MUST NOT）」（req:6092）と書く。名だけが文書ごとの記録と読める。いまのコードはオリジンごとに真偽 1 つ（`frame-loop.ts:1084` の鍵） | `S-99b` の項目の名（set:385） | `S-99b` の説明、`FR-065`（req:6090 ・ `:6092`） | 起草時 0 件（`DFC-280` は文書ごとに覚えない不具合として `fixed-defects.md` に閉じた。名の字面は残った） |

⚠️ 既に在る関係の行（本書は直さない）: `DFC-558`（人の発話が記録に入らない）、`DFC-571`、`DFC-535`（決定 8 が ① を形で閉じる —— 波 B）、`DFC-583`（決定 6 の波 B が ② を閉じる）、`DFC-562`（配りのあいだの発話）、`PND-419`（無効化と `S-99i`）、`PND-150`（対話欄の確定の鍵）、`PND-110` ・ `PND-180`（`localStorage` の鍵の綴り）、`PND-455` ・ `PND-456`（発話の受け方）、`PND-62`（新しい購読に最初に何を知らせるか）。
⚠️ 台帳に載せないもの: 無効にしても対話の記録は消えない・`S-99i` は戻らない（仕様に片側が無い、`PND-419` が既に持つ。`JDG-78`）。

---

## 9. 影響 —— 本書の外で動くもの

| 所 | 何が動くか | いつ |
|---|---|---|
| `docs/development-records/handoff-state-machine.md:127` 付近 | 次の領域の並びから「Agent API」を済みにし、表 ・ 図の帯の注に `T-296` ・ `F-042` を足す | 前に立つ者 |
| 波 B | 2.2 の 1 〜 5、3.2 の 1 段の答え | 各入口 |
| `refactor-stage1-state-inventory-2026-09-13.md:138` | `isFieldUp` の「`S-99i` の写し」は「有効 ∧ 表示の描いた結果」 —— 記録は書き換えず、本書が正す（決定 7） | —— |
| `CR-490` の本文 | 11.1 の 6（`dialogueLog` は運ぶ値）と 11.2 の「`isFieldUp` は `dialogueFieldDisplayStateMachine` の写し」は本書が覆す。変更要求は当てた時の文のまま残す（`CR-480:4` の注と同じ） | —— |
| `defects.md` | 第 8 節の候補 2 つ。`DFC-583` の ② ・ `DFC-535` の ① に「本書の波 B が閉じる」を 1 文追記 | 台帳に書く者 |
| 検査 61 の基準線 | 波 B で `HELD … REGISTRATIONS` を消す | ⛔ 利用者の了承の後 |

---

## 10. ⛔ この変更でやらないこと

- ⛔ 画面の値・通知・身振り・ファイル操作と問い・名前付けと入力欄・選択・操作の記録の原稿と、領域をまたぐ優先順（表 T-283）を変えない（`dialogueFieldEntryPressed.isAgentApiEnabled` もそのまま）
- ⛔ `dialogueLog` ・ 監視の登録・面の覚えを原稿に入れない（決定 5 〜 7）
- ⛔ `DFC-558`（人の発話を記録へ）・`NT-4` の告げ方・`PND-419` を直さない・決めない（`JDG-57`、`JDG-78`）
- ⛔ `localStorage` の鍵の綴り（`PND-110` ・ `PND-180`）を仕様に載せない
- ⛔ 波 A で `frame-loop.ts` を結線しない（`effectRunnersOf` の 1 行は型が求める `unwiredEffect` だけ）。`src/adapter` ・ `src/framework/dom-screen-surface/` ・ `src/use-case/notify-change-watchers` に触らない
- ⛔ `CR-434`（MCP）の論点を先取りしない
- ⛔ 表 `T-294` ・ 図 `F-040` を取らない
- ⛔ 基準線を体に触らせない

---

## 付録 —— 第 8 領域「`Agent API`」の原稿

**略記**: `req` ＝ `docs/spec/01-04-requirements.md`、`des` ＝ `docs/spec/05-07-design.md`、`set` ＝ `docs/spec/_assets/tbl-settings.md`、`glo` ＝ `docs/spec/_assets/tbl-glossary.md`。行番号は 2026-09-22 の作業木。
根拠の行: `FR-065` req:6081（記憶の MUST は :6090、MUST NOT は :6092）、`FR-066` req:6110、`AG-11` req:6065、`NT-5` req:6395、`RS-20` req:6430、`RS-35` req:6445 ／ `S-99b` set:385 ／ `IC-20` glo:533 ／ `CP-17` des:124。
升目の書き方: `→ 先 [ガード] / 副作用`。**`—` は変わらない ＝ 同じ参照**（`SD-3`）。

### A. 出来事（2）

| 出来事 | どこから来るか | 運ぶ値 | 動かすもの |
|---|---|---|---|
| `agentApi/agentApiEntryPressed` | 入力: ヘッダの `IC-20`（`FR-065`）。無効のときは有効にし、有効のときは無効にする —— 同じ 1 つの入口 | — | 根 ・ 機械 |
| `agentApi/rememberedEnablingLoaded` | 副作用の結果: 起動のとき、シェルがブラウザ（オリジン）の記憶 `S-99b` を読んだ（`FR-065`）。1 度だけ、最初の 1 枚より前に送る | `isRememberedEnabled`（記憶が有効を指すか —— 決定 9） | 機械 |

### B. 根 `agentApi`

運ぶ値: 無い。根拠: `FR-065` ・ `S-99b`。

| 出来事 | 升 |
|---|---|
| `agentApiEntryPressed` | → 自己 / `storeAgentApiEnabling`（押した後の有効・無効をブラウザ（オリジン）の記憶に書く）（`FR-065`、`S-99b`） |

### C. 機械 `agentApiEnablingStateMachine`（`npm run gen` が刷った 表 T-296 の升）

| 出来事 | `disabled` | `enabled` |
| --- | --- | --- |
| `agentApi/agentApiEntryPressed` | → `enabled` | → `disabled` / `raiseNotice`（`RS-20`） |
| `agentApi/rememberedEnablingLoaded` | → `enabled` [`isRememberedEnabled`]<br>それ以外 → — | — |

- `agentApiEnablingStateMachine.disabled` —— 初期。根拠 `FR-065` ・ `CP-17` ・ `RS-35`
- `agentApiEnablingStateMachine.enabled` —— 根拠 `FR-065` ・ `FR-066` ・ `S-99b`

升 3（空でない組）＋ 根の升 1。升の根拠: `disabled` × `agentApiEntryPressed` は `FR-065` ・ `IC-20`、`enabled` × `agentApiEntryPressed` は `FR-065` ・ `RS-20` ・ `NT-5`、`disabled` × `rememberedEnablingLoaded` は `FR-065` ・ `S-99b`。

図（mermaid）の矢印: `disabled → enabled`（`agentApiEntryPressed`, `rememberedEnablingLoaded`）、`enabled → disabled`（`agentApiEntryPressed`）。

### D. 原稿の JSON（`regions` の末尾に足した —— 当てた原稿と同じ中身。原稿は 1 空白の字下げ）

```json
{
 "region": "agentApi",
 "name": {"ja": "`Agent API`"},
 "unit": "src/use-case/advance-screen-session/agent-api-values.ts",
 "typeStem": "AgentApiValues",
 "table": {"id": "T-296", "caption": {"ja": "`Agent API` の状態機械"}},
 "figure": {"id": "F-042", "caption": {"ja": "`Agent API` の状態遷移"}},
 "root": {
  "carries": [],
  "evidence": ["FR-065", "S-99b"],
  "transitions": {
   "agentApiEntryPressed": {"effect": "storeAgentApiEnabling", "evidence": ["FR-065", "S-99b"], "note": {"ja": "押した後の有効・無効をブラウザ（オリジン）の記憶に書く"}}
  }
 },
 "events": [
  {"key": "agentApiEntryPressed", "source": {"kind": "input", "rows": ["IC-20", "FR-065"], "note": {"ja": "`IC-20` を押した。無効のときは有効にし、有効のときは無効にする —— 有効にするのと無効にするのは同じ 1 つの入口である"}}, "carries": []},
  {"key": "rememberedEnablingLoaded", "source": {"kind": "effectResult", "rows": ["FR-065", "S-99b"], "note": {"ja": "起動のとき、シェルがブラウザ（オリジン）の記憶を読んだ結果"}}, "carries": [{"name": "isRememberedEnabled", "rows": ["S-99b"], "note": {"ja": "記憶が有効を指すか"}}]}
 ],
 "machines": [
  {
   "name": "agentApiEnablingStateMachine",
   "states": [
    {"key": "disabled", "parent": null, "initial": true, "carries": [], "evidence": ["FR-065", "CP-17", "RS-35"]},
    {"key": "enabled", "parent": null, "initial": false, "carries": [], "evidence": ["FR-065", "FR-066", "S-99b"]}
   ],
   "transitions": {
    "agentApiEntryPressed": {
     "disabled": {"to": "enabled", "evidence": ["FR-065", "IC-20"]},
     "enabled": {"to": "disabled", "effect": "raiseNotice", "effectArgument": "RS-20", "evidence": ["FR-065", "RS-20", "NT-5"]}
    },
    "rememberedEnablingLoaded": {
     "disabled": {"to": "enabled", "guard": [{"name": "isRememberedEnabled"}], "evidence": ["FR-065", "S-99b"]}
    }
   }
  }
 ]
}
```

### E. 運ぶ値と型（コードが決める。原稿は名前だけ —— 表 T-250 の `SD-1` ・ `SD-2`）

| 名 | 型 | 置き場 |
|---|---|---|
| `isRememberedEnabled` | `boolean` | `agent-api-values.ts` の手書きの `AgentApiValuesEventCarried` |
| `AgentApiEnablingState` | `{ kind: 'disabled' } \| { kind: 'enabled' }`（生成） | 同じファイルの生成区画 |
| `AgentApiValuesEffect` | `{ type: 'storeAgentApiEnabling' }`、`{ type: 'raiseNotice'; reason: 'RS-20' }`（手書き —— 3.2） | 同じファイルの生成区画の上 |

## 改訂の記録

| # | 日付 | 何を変えたか | 理由 |
|---|---|---|---|
| 1 | 2026-09-21 | 起草（`9b8a22b7`）—— 領域 `agentApi` と `agentApiEnablingStateMachine` を立て、`dialogueLog` ・ 監視の登録 ・ 面の覚えを外に置く形 | `CR-490` の 11.7 の 3 |
| 2 | 2026-09-22 | 波 A を当てた（`e9cefd60` の上の作業木）。原稿に付録 D の領域を足し（ほかの 7 領域と `priorities` は 1 字も変えていない）、`npm run gen` で 表 T-296 ・ 図 F-042 の節と `agent-api-values.ts` の生成区画を刷った。根の合成と 5.3 ・ 5.5 ・ 5.6 の行は 3.1 の表のとおり。草案から変えたのは次の 6 つ: ① 行番号と数を測り直した（`frameLoop` の `let` は 66 → 57、面の覚えは `dom-screen-surface.ts` から `dialogue-field-drawing.ts` ・ `field-editing.ts` へ、`IC-18` の `RS-35` は `answerSettledEntry` の直書きから画面の値の出来事へ移っていた）。② 5.5 の序数を「第 7 領域」から「第 8 領域」に、`PI-39` を「8 領域」に、表 T-075 ・ `SU-3` ・ `units.contract.test.ts` の数を草案の 101 → 102 ではなく 113 → 114 に、`changelog.md` の数を 9 → 10 にした（`CR-510` ・ `CR-520` が先に当たった）。③ 草案の 3.1 に無かった `frame-loop.ts` の `effectRunnersOf` の 1 行（`unwiredEffect`）と `session-effects.ts` の注釈と `uf-123-session-effects.test.ts` の 1 行を足した —— `CR-436` の波 B2 が副作用の表を型で閉じたため。④ 出来事 `agentApiEntryPressed` の源に注を足した（`CR-520` の `interactionRecordToggled` と同じ形。升と根拠は変えていない）。⑤ 生成器 `state_machines_json_to_md.py` が見出しを「`Agent API`の出来事」と刷るので、名がコードの字面で終わるときだけ空白を入れる 1 行を足した（ほかの 7 領域の出力の差 0）。⑥ 草案の第 6 節（継ぎ目）を 3.2 へ移し、1 段の答えと副作用の型を書き足した | 数は予測の差どおりだった: 原稿 8 領域 ・ 機械 24 ・ 状態 66 ・ 出来事 80 ・ 升 161 ＋ 根 11、md-checks は `tables` +1 ・ `figures` +1 ・ `rows` +1。表 `T-294` ・ 図 `F-040` は使っていない |
| 3 | 2026-09-22 | 試験は 3 つだけ触った。① `tests/unit/uf-123-session-effects.test.ts` の副作用の種類の表に `storeAgentApiEnabling` を足した。② `tests/contract/units.contract.test.ts` の数（113 → 114）。③ `tests/unit/uf-125-the-agent-api-transition-table-is-printed-from-the-manuscript.test.ts` を `uf-124` の同じ試験から写して足した —— 検査 30 は他のファイルが読まない公開の写しを赤にするため。これは生成器の写しの試験であって、手で書いた `step` の試験ではない。ほかの領域の契約試験は見本の表を変えずに緑のまま | 新しい機械の升・直交・根の升の主張は、仕様だけを読む別の体が書く（`RA-6`） |
