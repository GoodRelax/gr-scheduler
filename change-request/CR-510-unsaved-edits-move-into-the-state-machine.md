# CR-510 — 未保存の編集を状態機械へ移す（ファイル操作と問いの領域に `unsavedEditsStateMachine` を足す）

> ⭐ **状態: 波 A を当てた（2026-09-22、`39c15ff4` の上の作業木 —— ブランチ `claude/lucid-hodgkin-40a9a7`、コミットは前に立つ者が打つ）。波 B ・ 波 C は当てていない。**
> ⭐ 当てた体が草案から変えたところは、末尾の改訂の記録の 2 に並べた。第 0 〜 10 節と付録は草案の文のまま残し、行番号と数だけを測り直した —— 当てた形の全数は 表 T-290 が持つ。
> 起草は `9b8a22b7`（2026-09-21）を読んだ。**本書の行番号と数は、断りが無いかぎり、当てる直前の `39c15ff4`（`CR-436` の波 B2 の着地）で 2026-09-22 に測り直したものである。** 草案の後に `CR-436` の波 B1 ・ B2、`CR-439` の段 6 の分割などが入り、`frame-loop.ts` の行は約 150 行ずれた。
> 型板は `CR-500`（新しい表・図・ユニットを取らず、既存の領域の表と図を刷り直す形）・`CR-490`（第 11 節がこの話の出どころ —— 11.1 の 1 ・ 2、11.3、11.7 の 1）・`CR-460`（同じ領域を立てた変更要求。決定 9 ・ 12 がこの話をわざと外した）・`CR-470`（「機械を立てない」と結ぶ形）。名前の規則は `docs/development-rules/07-review-standards.md` の「状態機械（State Machine）」の節（`:296`〜`:341`）と R4.4（`:605`）。
>
> **結論（先に書く）**:
> - **機械を 1 つ立てる。置き場は既存の領域 `fileFlow`「ファイル操作と問い」**（新しい領域は立てない）。機械 `unsavedEditsStateMachine`（今の状態 `unsavedEditsState`）、状態 2（`nothingUnsaved`（初期）／ `editsUnsaved`）、運ぶ値 0、升 6、副作用 0、ガード 1（既存の `isReplaceChoice` を使い回す）。既存の 2 つの機械（`fileOperationStateMachine` ・ `confirmationStateMachine`）と**直交**する —— `{in: …}` を 1 つも持たず、相手も持たない。
> - **出来事は既存の 2 つを使い回し、3 つを足す**: 既存の `documentFileSaved`（そのまま）・ `documentOpenLanded`（運ぶ値 `openChoice` を 1 つ足す）。新しい `documentEditLanded` ・ `newDocumentLanded` ・ `startupDocumentHeld`。
> - **`fileSavedAt` は機械にも運ぶ値にもしない** —— `FR-101` が保管を文書の `AT-140`（`documentStamp.fileSavedUtc`）と定め、それを書く造りは既存の `DFC-459`（`実装待ち`）の持ち物である（`SF-10`）。`CR-460` の決定 9 のうち `fileSavedAt` の側はそのまま保つ。
> - **`CR-460` の決定 9 のうち `hasUnsavedEdits` の側（「文書と現在値の芯の値だから外」）を覆す**（第 0 節 ③ の決定 1 と第 5 節）。
> - ⭐ **升はどこも今日のコードを写す**（`JDG-57`）。取り消しで保存した時点へ戻っても立ったまま・値の動かない書き込みでも立つ・`Agent API` の書き込みでは立たない —— どれも今日の振る舞いであり、仕様（`FR-100`）との食い違いは第 8 節の台帳の候補に置く（どちらが正かを選ばない）。
> - **利用者に問うこと: 0 件**（候補 8 に 3 つの反証を打った —— 第 7 節）。
>
> **識別子**（規則 02 の 2.5。2026-09-21 に `9b8a22b7` で測り、2026-09-22 に `39c15ff4` で測り直した —— `git grep -lw <名> -- docs change-request src tests tools .claude`）:
> - 依頼が配った番号: **変更要求 `CR-510`**。`change-request/` の上端は `CR-500`（2026-09-22、`ls change-request`）。帯は `docs/development-records/handoff.md:50` の登録簿が状態機械の側に `CR-510・520・530` と置く（同日に確かめた）。
> - **新しい表・図・ユニット・行 ID の接頭辞・要求 ID は取らない。** 依頼が使ってよいとした 表 `T-294` ・ 図 `F-040` ・ `UF-123` は**使わずに返す**（決定 9。`UF-123` はその後 `CR-436` の波 B2 が `session-effects.ts` に取った）。表 `T-290` と図 `F-036` を刷り直し、ユニット `UF-89`（`file-flow-values.ts`）を書き換えるだけである（`CR-500` と同じ形）。
> - 新しい名の重なり（同じ 6 か所を `git grep -lw`、2026-09-21 と、当てる直前の 2026-09-22 に `39c15ff4` で）: `unsavedEditsStateMachine` ・ `unsavedEditsState` ・ `UnsavedEditsState` ・ `nothingUnsaved` ・ `editsUnsaved` ・ `documentEditLanded` ・ `newDocumentLanded` ・ `startupDocumentHeld` はどれも 0 件。⚠️ `hasUnsavedEdits` は `frame-loop.ts` の `let`（`:2029`）と公開の口（`:212` ・ `:4478`）の字面 —— 機械の名にも状態の名にも使わない。
> - 台帳の上端（`docs/development-records/` の全ファイル）: 起草時（2026-09-21）は `DFC-702`、`JDG-290`、`PND-500`。当てる直前（2026-09-22、`39c15ff4`）は `DFC-770`、`JDG-366`、`PND-530`。⇒ 第 8 節の候補は仮の名（候補 1 〜 5）で呼び、番号は当てる体が書く直前に引く（ほかのセッションが並行して取る —— `CR-490:23`）。
> - 状態・出来事・遷移に通し番号を振らない（`JDG-286`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **波 A はどの `CH-` も直接には前へ進めない —— 基盤の作業である。** 波 A は原稿（`state-machines.json`）と、画面がまだ出来事を送らない領域（起草時は `file-flow-values.ts` を画面が呼ばなかった —— `CR-460:28`。`CR-436` の波 B2 の後は、画面は `advanceScreenSession` を呼ぶが `fileFlow` の出来事を 1 つも作らない —— `git grep -n "documentOpenLanded\|documentFileSaved" -- src` は `file-flow-values.ts` と `advance-screen-session.ts` だけ、2026-09-22）だけを変える。波 B（結線）も振る舞いを変えない（`JDG-57`、`rulings.md:134`）。

守るもの:
- **`FR-100`（req:5652〜5653）** 「未保存の編集を持ったまま作成者がページを離れようとしたとき … 離れる前に宿主の警告が出るようにすること（MUST）」「未保存の編集が無いときに出させてはならない（MUST NOT）」—— 今日は `frame-loop.ts:2029` の `let hasUnsavedEdits` を公開の口 `hasUnsavedEdits()`（`:4478`〜`:4480`）が返し、`single-html-shell.ts:484`〜`:488` の `beforeunload` だけが読む。移した後は根の `fileFlow.unsavedEditsState` が `editsUnsaved` かを読む。
- **`ZE-4`（req:3217）** 「書き換えないときは、未保存の編集を立ててはならない（MUST NOT）」—— 呼び手が書き込みそのものを作らないことで守っている（`wheel-input.ts:108`、`row-grab.ts:347` の WHY）。機械は書き込みが着地したときだけ動くので、この守りはそのまま残る。
- **表 T-024a の `OP-4`（req:5567）と `QN-5`（req:6491）** —— 置き換えの確認は**未保存の編集の有無を読まずに必ず問う**（`askToDiscardCurrentDocument` `frame-loop.ts:3335`〜`:3350` は `hasUnsavedEdits` を読まない）。これは台帳が確かめた仕様どおりの形である（`DFC-279` は `取下げ` —— `fixed-defects.md:378`「置き換えは常に問う」）。⇒ **本書の機械を確認の条件に使ってはならない**（第 10 節）。
- **`GL-003`** —— この機械を動かす出来事は、書き込み・取り消し・保存・開く・新しく始める・起動の着地だけで、ポインタの移動では 1 つも作らない（表 T-249 の `SF-5`、des:1043）。`editsUnsaved` の上の `documentEditLanded` は升が空で同じ参照を返す（`SF-3`）—— ホイールのズームのように着地が続く入力でも、2 度目からは根も同じ参照である。性能は `LM-19`。⛔ **測る前に利用者を呼ぶ**（`RISK-001` の門）。

### ② レビュー観点のどの条項を当て、何が出たか

- **R4 「状態機械」の節 ／ R4.4**（`07-review-standards.md:296`〜、`:605`）—— 機械は名詞句 ＋ `StateMachine`（`unsavedEditsStateMachine` ——「未保存の編集」を追う）、今の状態は `unsavedEditsState` ／ 型 `UnsavedEditsState`。状態は〈何が〉＋ 形容詞（`nothingUnsaved` ・ `editsUnsaved`。前例 `selectionStateMachine.nothingSelected` ・ `objectsSelected`）。出来事は主語 ＋ 過去形（`documentEditLanded` ・ `newDocumentLanded` ・ `startupDocumentHeld`）。ガードは既存の `isReplaceChoice`。既存の 74 のキーと重なり 0（スクラッチの `u-try-gen.py` で生成器の `load()` に通して問題 0 —— 第 1 節）。
- **5.5 の原稿の規則**（des:754「原稿に載せるのは、要求が名指す状態・出来事・遷移だけとする（MUST）」）—— `FR-100` が 2 つの状態を名指す: 「未保存の編集を持った」（→ `editsUnsaved`）と「未保存の編集が無い」（→ `nothingUnsaved`）。`ZE-4` も「未保存の編集を立て」と同じ状態を名指す。
- **`SF-5`（des:1043）** —— 連続する値ではなく、フレームの値とほかの機械の今の状態からも導けない（決定 2）。⇒ フレームの値ではない。
- **`SF-10`（des:1048）** —— 未保存の編集の印は文書（`Document`）にも、取り消しの履歴（`HeldDocument`）にも入っていない（`let` は `held` と別 —— `frame-loop.ts:1978` と `:2029`）。文書を変える道（書き込みの唯一の経路）は 1 つも増えない。機械が受けるのは書き込みの**着地という副作用の結果**だけで、前例は `selection/selectionPruned`（`CR-490` の決定 9）。⇒ `SF-10` は機械を立てることを妨げない（決定 1）。
- **`SF-8`（des:1046）と生成器の規則**（`state_machines_json_to_md.py:45`〜`:46` ・ `:51`〜`:54`）—— 1 つの出来事のキーは 1 つの領域にしか置けない。保存と開くの着地（`documentFileSaved` ・ `documentOpenLanded`）は既に `fileFlow` に在る ⇒ 同じ領域に置けば使い回せる（決定 3）。
- **`R4.2`（await 跨ぎ）** —— 保存の道は `await` の前に文書を読み（`frame-loop.ts:3570`〜`:3571`）、成功したら印を下ろす（`:3590`）。そのあいだに着地した書き込みも下ろされる疑いがある ⇒ 第 8 節の候補 4（`JDG-78` の後へ）。機械は今日の形を写す。

### ③ 利用者に問うこと・**問わずに決めた**こと

**問うこと**: ⭐ **なし（0 件）。** 候補 8 に打った 3 つの反証は第 7 節に残した。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | **未保存の編集は状態機械で持つ。`CR-460` の決定 9 の `hasUnsavedEdits` の側（「外 —— 文書と現在値の芯」）と、同じ節 10 の「⛔ `hasUnsavedEdits` を集約へ入れない」を覆す** | `FR-100` が 2 つの状態を名指す（5.5 の規則 des:754）。`CR-460` の理由は「受け付けた書き込みのたびに動く」（`CR-460:63`）だったが、それは**何が出来事を作るか**の話であって、状態の置き場の話ではない —— 印は `held`（文書と履歴）の外の別の `let` であり（`frame-loop.ts:1978` と `:2029`）、保存されない画面とセッションの値である（ADR-002、des:1018）。書き込みの着地を出来事として受ける形は `CR-490` が `selectionPruned` で認めた。`CR-490` の 11.1 の 1 と 11.7 の 1 も新しい機械と判じた |
| 決定 2 | **導ける値にしない（`SF-5` の 2 文目に当たらない）** | 比べた 3 つの導き方はどれも成り立たない（第 2.3 節）: ① 取り消しの履歴（`held.history.done` の長さ）は保存で空にならない。② 文書の刻印の比べは「保存した時の刻印」の覚えを要する —— それ自体が状態であり、しかも取り消し（`RD-1` は刻印ごと戻す ——des:718）で保存した時点へ戻ると印が下り、今日の振る舞いを変える（`JDG-57` に反する）。③ `DFC-459` が着地した後の `fileSavedUtc` と `updatedUtc` の比べは、秒までの精度で同じ秒の編集を落とし（`FR-100` の MUST を破る）、`fileSavedUtc` を持たない MSPDI の文書と起動の雛形で「未保存」と答える（`FR-100` の MUST NOT を破る） |
| 決定 3 | **置き場は既存の領域 `fileFlow`。新しい領域を立てない** | 印を下ろす 5 つの着地のうち 2 つ（保存 `documentFileSaved`・開く `documentOpenLanded`）の出来事が既に `fileFlow` に在り、生成器は同じキーを 2 つの領域に置かせない（第 0 節 ②）。別の領域にすると、同じ着地から呼び手が 2 つの出来事を作る形（`CR-490` の決定 6）が 2 組増える。新しく始める（`FR-095`）の問いも `fileFlow` に在る（`newDocumentEntryPressed`）。⭐ 置き場を同じ領域にしても `{in: …}` は 0 本 —— 直交は崩れない。依頼の「`fileFlow` に置くなら 表 T-290 ・ 図 F-036 を広げよ」にも合う |
| 決定 4 | **状態は 2 つ（`nothingUnsaved`（初期）／ `editsUnsaved`）。運ぶ値は持たない** | `FR-100` の 2 つの語。何件の編集か・いつからかを読む要求は無い（`docs/spec` を「未保存」で引いて 15 行、どれも有無か、未保存のファイルの名乗り ——第 1 節）。初期が `nothingUnsaved` なのは、今日の `let` の初期値 `false`（`:2029`）と、起動した直後に何も触っていない文書で警告を出さない（`FR-100` の MUST NOT、`tests/unit/fr-100-op-13-the-unsaved-edit-gate.test.ts:429`〜`:435`）ため |
| 決定 5 | **印を立てる出来事は 1 つにまとめる: `documentEditLanded` ＝ 画面からの書き込み（表 T-067 の 1 巡）か、取り消し・やり直し（表 T-230 の `RD-1` ・ `RD-2`）が受け入れられ、現在値が差し替わった** | 今日の書き手 `writeDocument`（`:3245`）と `replaceHeldDocument` の `RD-1` ・ `RD-2`（`:3270`）で升が同じ（→ `editsUnsaved`）。確定か取り消しかを分けない `CR-500` の決定 4 と同じ筋 —— 升が要るようになったら、そのとき割る。⚠️ 合流・重ね（`RD-3`）は `documentOpenLanded` が運ぶので、呼び手は `RD-3` の着地で `documentEditLanded` を**送らない**（二重に送らない —— 第 6 節） |
| 決定 6 | **`documentOpenLanded` に運ぶ値 `openChoice` を足し、升は既存のガード `isReplaceChoice` で割る**: 置き換え（`RD-4`）→ `nothingUnsaved`、合流・重ね（`RD-3`）→ `editsUnsaved` | 今日の `:3270` は `RD-4` で下ろし `RD-3` で立てる。着地の時点の `fileOperationStateMachine` は `importingDocument` で、どちらの選び方かを運ばない（`CR-460` の付録 C.1 —— 選び方は `openChoiceAnswered` の運ぶ値で、状態に残らない）⇒ 出来事が運ぶしかない。`openChoice` の型は既に在る（`FileFlowOpenChoice` ——`file-flow-values.ts:13`、`openChoiceAnswered` が同じ名で運ぶ）。ガードの名も既に在る（`isReplaceChoice`、同じ意味 ——`event.openChoice === 'replace'`）。⭐ 読み直し（`OP-13`）は置き換えに定まる（`OP-13` req:5577）ので `openChoice: 'replace'`。`Agent API` が渡した文書は今日は合流に決め打つ（`frame-loop.ts:3560`、`DFC-614`）ので `openChoice: 'merge'` |
| 決定 7 | **印を下ろす出来事は、保存・置き換え・新しく始める・起動の文書の 4 つの着地。後の 2 つは新しい出来事 `newDocumentLanded`（`RD-7`）・`startupDocumentHeld`（`RD-6`）** | 今日の `:3270`（`RD-4` ・ `RD-6` ・ `RD-7` で `false`）と `:3590`（保存が書けたら `false`）。`RD-7` の着地はいまどの出来事にもならない —— 副作用 `carryOutOwedAction`（新しく始めること）の結果が戻っていない（`CR-460` の付録 C.2）。`RD-6` は公開の口 `holdDocument`（`frame-loop.ts:213` ・ `:4482`）だけが通る道で、`src/` に呼び手は無く試験が呼ぶ（`git grep -l holdDocument` ——`op-10` ・ `t-023c` ・ `uf-47-48` の 3 つ）。⚠️ 起動の直後は初期の状態がもう `nothingUnsaved` なので、この出来事が状態を動かすのは口が後から呼ばれたときだけである。それでも今日の書き手を 1 つ残らず出来事へ写す（`JDG-57`） |
| 決定 8 | **`fileSavedAt` は機械にも根の運ぶ値にもしない。波 B でもシェルの `let` のまま残し、`DFC-459` の直し（波 C）が文書の `AT-140` へ移す** | `FR-101`（req:5680）「保管は UTC のままとすること（MUST）—— 保管の綴りは 表 T-058 の `AT-140`（`documentStamp.fileSavedUtc`）が持ち」。原稿に運ぶ値として書くと、仕様が文書に置くと定めた値の 2 つ目の置き場を仕様（原稿）に書くことになる（`SF-10`、des:1048）。`DFC-459`（`defects.md:87`、`実装待ち`）が「保存したときに本列へ刻を置く造りはまだ無く、いまは常に空である」と持っている。`CR-460` の決定 9 のこの側は正しいので保つ。⚠️ `CR-490` の 11.1 の 2 は「運ぶ値（1 と同じ領域の根）」と書いたが、`FR-101` の保管の MUST を読んでいない —— 本書はそちらを退ける |
| 決定 9 | **表 `T-294` ・ 図 `F-040` ・ `UF-123` を取らない。表 T-290 ・ 図 F-036 を刷り直し、`UF-89` を書き換える** | 同じ領域に機械を足すので、刷る節は 表 T-290 の中に 1 つ増えるだけ（生成器は領域ごとに表 1 つ・図 1 つ —— 原稿の `table` ・ `figure`）。前例 `CR-500`（表 T-292 ・ 図 F-038 を刷り直した）。取らない番号を依頼の帯の持ち主へ返す（規則 02 の 2.5 —— `CR-470` の決定 7 と同じ） |
| 決定 10 | **表 T-075 の `UF-89` の「負う要求」は `—` のまま** | `CR-460` の決定 13 と同じ。波 A では画面がこのユニットを呼ばない |
| 決定 11 | **`05-07-design.md` の本文は 1 字も変えない** | 5.5 の第 4 領域の文（des:771）、`CP-39`（:144）、`UT-11`（:338）、`PI-39`（:570）、`SS-6`（:1148）、図 F-028 はどれも領域と表の名だけを書き、機械の数を書かない（`grep -n "confirmationStateMachine\|fileOperationStateMachine" docs/spec/*.md` は 0 件 —— 生成物の外に機械の名が無い。2026-09-22 にも 0 件）。`CR-500` の 2.5 の「変えないもの」と同じ |

---

## 1. 測った事実（`39c15ff4`、2026-09-22 に測り直した。起草時の値は `9b8a22b7`、2026-09-21）

| 数 | 値 | 測り方 |
|---|---|---|
| `frameLoop` の範囲 | 1964〜4562 行（ファイルは 4640 行）。起草時は 1799〜4414 行 ／ 4492 行 | `grep -nE "^(export )?(async )?function frameLoop"` と、その後の最初の `^}` |
| `frameLoop` が直に持つ `let` | 57（うちこの話 2: `fileSavedAt` `:2028` ・ `hasUnsavedEdits` `:2029`）。起草時は 66 | `sed -n '1964,4562p' … \| grep -c "^  let "` |
| `hasUnsavedEdits` の書き手 | 3: `writeDocument` の `:3245`（`outcome.accepted` のとき `true`）、`replaceHeldDocument` の `:3270`（`RD-4` ・ `RD-6` ・ `RD-7` なら `false`、それ以外 ——`RD-1` ・ `RD-2` ・ `RD-3` —— なら `true`）、`saveHeldDocumentToFile` の `:3590`（書けたら `false`） | `grep -n "hasUnsavedEdits" src/framework/single-html-shell/frame-loop.ts`。起草時の `:3093` ・ `:3118` ・ `:3438`（`CR-490` の 11.1 と一致していた）と同じ 3 つ |
| `hasUnsavedEdits` の読み手 | 1: 公開の口 `hasUnsavedEdits()`（`:4478`〜`:4480`）→ `single-html-shell.ts:484`〜`:488` の `beforeunload`。⚠️ タブの見出し（`nameBrowserTab` `single-html-shell.ts:346`〜`:351`）に印は無い。置き換え・新しく始めるの確認（`askToDiscardCurrentDocument` `:3335`）も読まない | `grep -rn "hasUnsavedEdits" src` |
| `fileSavedAt` の書き手 ／ 読み手 | 書き 1: `saveHeldDocumentToFile` の `:3589`。読み 1: `runFrame` の `:2410` → `app-header-items.ts:172` → `app-header-drawing.ts:75`〜`:79`（`U-59`。`CR-439` の段 6 が `dom-screen-surface.ts` から分けた）。⚠️ 開く・新しく始める・起動の道は書かない | `grep -rn "fileSavedAt" src` |
| `Agent API` の書き込み | `agent-api-members.ts:319` の `applyDocumentChange` が `holder`（`frame-loop.ts:2081`〜`:2097`、`:4538` で渡す）の `replace` だけを通る。`hasUnsavedEdits` を書く道を通らない | 読んだ |
| 保存のあいだの書き込み | `saveDocumentFile` の `await` のあいだ、画面の書き込み（`carryOutAction` の `changeDocument` `:3933`〜`:3934`）は問いが立っているときしか止まらない（`isFileOperationWaiting` を読まない） | 読んだ |
| 原稿の今 | 6 領域 ・ 機械 21 ・ 状態 60 ・ 出来事 74 ・ 升 150 ＋ 根の升 10（`fileFlow`: 出来事 16 ・ 機械 2 ・ 状態 9 ・ 升 38 ＋ 根 3） | スクラッチの `u2-apply.py`（升は機械 × 出来事 × 状態の組の数）。起草時と同じ数 |
| 当てた原稿 | `load()` の問題 0（`npm run gen` が通った）。後: 6 領域 ・ 機械 22 ・ 状態 62 ・ 出来事 77 ・ 升 156 ＋ 根 10（`fileFlow`: 出来事 19 ・ 機械 3 ・ 状態 11 ・ 升 44 ＋ 根 3）。刷った `tbl-state-machines.md` の差は `fileFlow` の節（`:600`〜）の中だけ —— 出来事の表の 5 行と、節「状態機械 `unsavedEditsStateMachine`」（`:743`〜）。型の生成区画は `FileFlowValues` に `unsavedEditsState: UnsavedEditsState` を、`FILE_FLOW_VALUES_INITIAL_AXES` に `{ kind: 'nothingUnsaved' }` を刷った | `u2-apply.py` の前後の数、`git diff -U0 docs/spec/_assets/tbl-state-machines.md` |
| 仕様の「未保存」 | `docs/spec` で 15 行: `01-04-requirements.md` の 12 行（req:966 ・ 3208 ・ 3217 ・ 4044 ・ 5553 ・ 5567 ・ 5577 ・ 5647 ・ 5652 ・ 5653 ・ 5948 ・ 6491）、`tbl-settings.md:494`、原稿の `display-words.json:3179` と `settings.json:5213`。要求の行はどれも有無だけを言い、残り 3 行はまだ保存していないファイルの名乗り（「ファイル未保存」）で、未保存の編集の印ではない。「beforeunload」「離脱」は 0 件。起草時の 13 行は原稿の 2 行を数えていない | `grep -rn "未保存\|beforeunload\|離脱" docs/spec` |
| md-checks の最終行 | `tables=182  figures=25  rows=2256  uids=162`（当てる前も後も同じ） | 第 9 節 |
| 表 T-075 | 本書は動かさない | —— |

---

## 2. 棚卸しと分類

### 2.1 覚えの分類

分類は `SF-5`（des:1043）、`SF-6`（des:1044）、`SF-10`（des:1048）と 5.5 の原稿の規則（des:754 ・ 755）を当てた。

| # | 覚え | 所在 | 書き手 ／ 読み手 | 分類 | 名指す仕様の行 |
|---|---|---|---|---|---|
| 1 | `hasUnsavedEdits` | `frame-loop.ts:2029` | 第 1 節 | **状態** `unsavedEditsStateMachine.nothingUnsaved` ／ `editsUnsaved` | `FR-100` req:5652〜5653、`ZE-4` req:3217、`LM-11` req:209 |
| 2 | `fileSavedAt` | `:2028` | 第 1 節 | **外** —— 文書の `AT-140`（`FR-101` req:5680、`SF-10`）。移すのは `DFC-459` の直し（決定 8） | `FR-101`、`U-59` |
| 3 | 「警告を出すか」 | `single-html-shell.ts:485` の式 | `beforeunload` | **フレームの値**（導ける）—— 根の `unsavedEditsState` から毎回導く（`SF-5` の 2 文目） | `FR-100` |
| 4 | 公開の口 `hasUnsavedEdits()` | `frame-loop.ts:212` ・ `:4478` | `single-html-shell.ts:485`、試験 | **外** —— 口の名と型（真偽）は保つ。中身が根を読む（波 B） | `FR-100` |

⇒ **状態 1 組（機械 1）、運ぶ値 0、導ける値 1、外 2。**

### 2.2 印を動かす道（今日の書き手を出来事へ写す）

| 今日の書き手（`frame-loop.ts`） | 道 | 今日の値 | 出来事 | 升 |
|---|---|---|---|---|
| `writeDocument` `:3245` | 画面の書き込み（表 T-067 の 1 巡）が受け入れられた。呼ぶ所 8: `:2129` ・ `:2361` ・ `:3787` ・ `:3795` ・ `:3892` ・ `:3944` ・ `:3950` ・ `:4294` | `true` | `fileFlow/documentEditLanded` | → `editsUnsaved` |
| `replaceHeldDocument` `:3270`（`RD-1` ・ `RD-2`） | 取り消し・やり直し（`:3959` ・ `:3966`） | `true` | `fileFlow/documentEditLanded` | → `editsUnsaved` |
| `replaceHeldDocument` `:3270`（`RD-3`） | 合流・重ね（`:3513`） | `true` | `fileFlow/documentOpenLanded{openChoice: merge ／ baseline}` | → `editsUnsaved` [not `isReplaceChoice`] |
| `replaceHeldDocument` `:3270`（`RD-4`） | 置き換え・読み直し（`:3489`） | `false` | `fileFlow/documentOpenLanded{openChoice: replace}` | → `nothingUnsaved` [`isReplaceChoice`] |
| `replaceHeldDocument` `:3270`（`RD-7`） | 新しく始める（`startNewDocument` `:3357`） | `false` | `fileFlow/newDocumentLanded`（新） | → `nothingUnsaved` |
| `replaceHeldDocument` `:3270`（`RD-6`） | 公開の口 `holdDocument`（`:4482`〜`:4484`） | `false` | `fileFlow/startupDocumentHeld`（新） | → `nothingUnsaved` |
| `saveHeldDocumentToFile` `:3590` | 保存が書けた | `false` | `fileFlow/documentFileSaved`（既存） | → `nothingUnsaved` |
| （書かない）`agent-api-members.ts:319` | `Agent API` の書き込み | 変えない | 送らない | —— ⚠️ 第 8 節の候補 3 |
| （書かない）書き出し（`FR-096`）・保存の失敗 | `documentFileWriteEnded` | 変えない | 既存の出来事だが、この機械の升は空 | —— |

⭐ 拒まれた書き込み・拒まれた差し替えは、今日どれも印を変えない（`outcome.accepted` の枝の中だけで書く）⇒ 呼び手は受け入れられたときだけ送る。

### 2.3 導ける値にならない理由（決定 2 の中身）

| 導き方 | 何を読むか | 成り立たない理由 |
|---|---|---|
| ① 取り消しの履歴 | `held.history.done.length > 0` | 保存で履歴は空にならない（`FR-031` ・ `LM-9` —— 履歴は開き直すまで残る）。保存した直後に「未保存」と答え、`FR-100` の MUST NOT を破る |
| ② 保存した時の刻印との比べ | 今の `documentStamp` と、保存・開いた時の `documentStamp` | 「保存した時の刻印」の覚えが要る —— それ自体が保存しない状態である。しかも取り消しは刻印ごと戻す（表 T-230 の `RD-1` の刻印の欄「入ってきたまま」、des:718）ので、保存した時点まで戻すと印が下りる —— 今日は立ったまま（`tests/unit/fr-020-both-ways-ic-41.test.ts:362`〜`:364` の注「書いて取り消すと文書は等しく、印は立ったまま」）。`JDG-57` に反する |
| ③ 文書の中の 2 つの刻の比べ（`DFC-459` の後） | `fileSavedUtc`（`AT-140`）と `updatedUtc` | 精度は秒まで（`FR-101` req:5680 の ⭐）—— 保存と同じ秒の編集を落とし `FR-100` の MUST を破る。MSPDI の文書と起動の雛形は `fileSavedUtc` を持たない（`ET-16` は書き出さない）ので、開いた直後に「未保存」と答え MUST NOT を破る。しかも `DFC-459` は着地していない |

⇒ **導けない。状態として持つ。**

### 2.4 申し送り

| # | 相手 | 中身 |
|---|---|---|
| 1 | `CR-436` の波 B2 ・ `CR-460` の波 B（結線） | 印の読み手は `beforeunload` 1 つ。口 `hasUnsavedEdits()` の名と型を保ち、中身を「根の `fileFlow.unsavedEditsState.kind === 'editsUnsaved'`」にする。`frame-loop.ts:2029` の `let` は消える（57 → 56。⛔ 波 B の入口で測り直す） |
| 2 | `CR-490` の波 B（選択） | 1 つの書き込みの着地から、`selection/selectionPruned`（`CR-490` の 2.1）と本書の `fileFlow/documentEditLanded` の 2 つを呼び手が作る（1 つの入力 → 2 つの出来事。前例 `CR-490` の決定 6） |
| 3 | `DFC-459` の直し | 保存で `fileSavedUtc` を文書へ書くとき、その書き込みは**文書を変える**。ファイルに書く文書にもその刻が入らねばならない（`FR-101` の「保存のたびに文書のバイト列が変わる」）ので、刻を置いた文書を書いてから `documentFileSaved` を送る順になる。⛔ その刻の書き込みで `documentEditLanded` を送ると、保存した直後に印が立つ —— 送らないこと。順と扱いは `DFC-459` の直しが決める（本書は決めない） |
| 4 | `handoff-state-machine.md:117` | 「未保存の編集（FR-100）」を `CR-510` に済みとする注（前に立つ者の持ち物） |

---

## 3. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A** | なし（いま当ててよい）。段 5・段 6 と並行してよい。⚠️ `CR-510` を宣言してから | `docs/spec/_source/state-machines.json` の領域 `fileFlow` だけ（付録 D: 出来事 3 つを足す、`documentOpenLanded` に運ぶ値 1 つ、機械 1 つ。**ほかの 5 領域と、`fileFlow` の既存の 2 機械・根は 1 字も変えない**）。生成物 `docs/spec/_assets/tbl-state-machines.md`（表 T-290 ・ 図 F-036 の節）と `file-flow-values.ts` の生成区画（`npm run gen`）。`file-flow-values.ts` の手書きの側（3.1）。`advance-screen-session.ts` の `IS_FILE_FLOW_EVENT`（`:107`〜）に 3 つ。契約試験 `tests/contract/state-machine-file-flow.contract.test.ts` の書き直し（**仕様だけを読む別の体** ——`RA-6`）。`tests/unit/uf-89-the-file-flow-transition-table-is-printed-from-the-manuscript.test.ts` は変えない見込み（3.1） | `CR-500` の 6 節と同じ組（18 ・ 19 ・ 21 ・ 26b ・ 27 ・ 30 ・ 33 ・ 59 ・ 60 ・ 61 ・ 62 ＋ vitest）。⚠️ 検査 11 ・ 12 ・ 33 は `FAIL` の行を出さずに赤くなる —— 出力の全体を当てる前の走りと比べる |
| **B** | 段 5 と段 6 が済み、`CR-436` の波 B2 と `CR-460` の波 B が当たっている（根がシェルに結線されている） | `frame-loop.ts`: `let hasUnsavedEdits`（`:2029`）を消し、2.2 の表の 7 つの書き手を出来事へ（`writeDocument` の着地 → `documentEditLanded`、`replaceHeldDocument` の `RD-1` ・ `RD-2` → `documentEditLanded`、`RD-3` ・ `RD-4` → `documentOpenLanded{openChoice}`（`CR-460` の波 B の送り先に `openChoice` を詰める）、`RD-7` → `newDocumentLanded`、`RD-6` → `startupDocumentHeld`、保存 → `documentFileSaved`（`CR-460` の波 B と同じ送り先））。口 `hasUnsavedEdits()` は根を読む。**今日の振る舞いを写す** —— `Agent API` の書き込みでは送らない、値が動かなくても受け入れられれば送る、保存が書けたら保存のあいだの書き込みも含めて下ろす（第 8 節の候補 1 〜 4）。`fileSavedAt` は `let` のまま（決定 8） | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部（`tests/system/rows-fixed-with-nothing-holding-them.test.ts:469` の `wouldWarn` を含む）、`tests/unit/fr-100-op-13-the-unsaved-edit-gate.test.ts`、`cr-423`（`ZE-4`）、`cr-424`、`fr-020-both-ways-ic-41`、`LM-19`（⛔ **利用者を呼んでから**） |
| **C**（B の直後の別のコミット） | 波 B で今日との一致を確かめた後（`JDG-57`） | 第 8 節の候補と `DFC-638` ・ `DFC-459` のうち、台帳で直すと決まったもの | 同上 |

⭐ **性能** —— この機械の出来事は着地のたびに 1 つで、`editsUnsaved` の上では同じ参照（`SF-3`）。1 フレームの仕事は変わらない見込み。測るのは波 B、`LM-19` の手順。⛔ **測る前に利用者を呼ぶ。**

### 3.1 波 A の中身

| 対象 | いま | 案 |
|---|---|---|
| **原稿** | `fileFlow`: 出来事 16 ・ 機械 2 ・ 状態 9 | 出来事 19 ・ 機械 3 ・ 状態 11（付録 D）。`documentOpenLanded` の運ぶ値に `openChoice` |
| **生成物** | 表 T-290 ・ 図 F-036 の節（`tbl-state-machines.md:600`〜） | ＋ 出来事の表に 3 行、`documentOpenLanded` ・ `documentFileSaved` の「動かすもの」に `unsavedEditsStateMachine`、節「状態機械 `unsavedEditsStateMachine`」（付録 C の形）。`npm run gen` |
| `file-flow-values.ts`（`UF-89`） | 生成区画、`emptyFileFlowValues`（`:602`〜）、ハンドラ 16 | 生成区画は刷り直す（定数名 `FILE_FLOW_VALUES_INITIAL_AXES` ・ `FILE_FLOW_VALUES_TRANSITIONS` は変わらない —— `03-implementation.md:49` ・ `:50` も変わらない）。`emptyFileFlowValues` は `...FILE_FLOW_VALUES_INITIAL_AXES` で `unsavedEditsState` を自ずから持つ。手書き: `onDocumentOpenLanded`（`:773`）と `onDocumentFileSaved`（`:782`）に `unsavedEditsState` の移りを足し、`onDocumentEditLanded` ・ `onNewDocumentLanded` ・ `onStartupDocumentHeld` を足して `HANDLERS`（`:813`〜）へ。⛔ 同じ状態へ移るときは同じ参照を返す —— `combined`（`:631`）が既にそうする。⛔ モジュールスコープの可変状態を置かない（検査 61） |
| `advance-screen-session.ts` | `IS_FILE_FLOW_EVENT`（`:107`〜）に 16 | ＋ `documentEditLanded` ・ `newDocumentLanded` ・ `startupDocumentHeld`（型が漏れを止める） |
| 契約試験 `state-machine-file-flow.contract.test.ts` | `EVENT_VARIANTS`（`:159`〜`:181`）に 16、`crossedSessions` は 2 機械の積、`OPERATION` ・ `CONFIRMATION` の 2 つを名で引く（`:124`〜`:125`） | ⚠️ **当てた瞬間に赤くなる** —— 原稿の出来事ごとに見本を引き（`flowEvents` `:183`〜`:189`）、見本の無い出来事で投げる。**仕様だけを読む別の体が書き直す**（`RA-6`）: (1) 新しい 3 つの出来事の見本、`documentOpenLanded` の見本に `openChoice` の 3 値、(2) `crossedSessions` を 3 機械の積に（7 × 2 × 2 の組）、(3) 直交 —— この機械の出来事がほかの 2 機械と根を同じ参照に残し、ほかの出来事がこの機械を同じ参照に残すこと、(4) `SS-5`（ほかの 5 領域を同じ参照に）。ガードの神託（`guardHolds` `:203`〜）の `isReplaceChoice` は `event.openChoice === 'replace'` のままで足りる |
| ほかの契約試験 | `state-machine-field-entry.contract.test.ts:264` ・ `state-machine-selection.contract.test.ts:292` は見本に `openChoice: 'merge'` を既に持つ | 変えない見込み（新しい 3 つの出来事は運ぶ値 0） |
| `uf-89` の単体試験 | `:112`〜`:130` は `documentOpenAsked` ・ `documentFileWriteAsked` の行を行頭の字面で探す | 変えない見込み。⚠️ `documentOpenLanded` の行が 2 つの表に出る（`fileOperationStateMachine` と本書の機械）ので、行頭で探す試験を足すなら表を区切ってから探すこと |
| `05-07-design.md` ・ 表 T-075 ・ `SU-3` ・ `units.contract.test.ts` ・ `changelog.md` の「`AdvanceScreenSession`（n）」 | —— | 変えない（決定 11。ユニットの数は変わらない） |

---

## 4. この結論を覆すもの

- **`Agent API` の書き込みも未保存の編集に数えると台帳で決まったとき**（候補 3）—— 升は変わらない。`documentEditLanded` の源の注から「`Agent API` の書き込みでは送らない」を消し、`Agent API` の着地から呼び手が送る。
- **「値が動かない書き込み」「保存した時点へ戻す取り消し」で印を立てないと決まったとき**（`DFC-638`、候補 1）—— 決定 2 の ② の形（保存・開いた時の刻印を運ぶ値として `nothingUnsaved` に持たせ、着地で比べる）が要る。状態は 2 つのまま、運ぶ値とガード（例 `isDocumentAtSavedPoint`）が増える。
- **保存のあいだの書き込みを残すと決まったとき**（候補 4）—— `documentFileSaved` の升に「保存を始めた後に着地した編集があるか」のガードが要る。それには `writingDocumentFile` のあいだの `documentEditLanded` を覚える値が要る（`{in: fileOperationStateMachine.writingDocumentFile}` を使える —— 同じ領域に置いた利点）。
- **`OP-4` の確認を「未保存の編集が有るときだけ」に改める裁定が出たとき**（`DFC-279` は反対に閉じている）—— 確認の升に `{in: unsavedEditsStateMachine.editsUnsaved}` のガードが立つ。これも同じ領域に置いたから書ける。

---

## 5. `CR-460` の決定 9 ・ 12 を読み直す

| `CR-460` の文 | 本書の読み | 扱い |
|---|---|---|
| 決定 9「`fileSavedAt` は `FR-101` が文書の `AT-140` に置くと定める（req:5680）ので文書の値（`SF-10`）」 | 正しい。`DFC-459` の裁定（2026-09-11、`defects.md:87`）とも合う | **保つ**（決定 8） |
| 決定 9「`hasUnsavedEdits` は受け付けた書き込みのたびに動くので『文書と現在値の芯』の値。保存の結果で下ろすのは副作用の実行（シェル）が行う」 | 動く契機が書き込みの着地であることは、状態の置き場を決めない —— 書き込みの着地を出来事にする形は `CR-490` が `selectionPruned` で使った。印は `held` の外の値で、`FR-100` が名指す状態である | **覆す**（決定 1） |
| 決定 12「波 A で触らない —— 別の領域・未裁定の行の持ち物」 | 「別の領域」はまだ無かった。`CR-490` の 11.7 の 1 が同じ領域を置き場に挙げた | 本書が引き取る |
| 節 10「⛔ `hasUnsavedEdits` ・ `fileSavedAt` ・ 読んだ文書を集約へ入れない」 | `hasUnsavedEdits` の項だけを外す。`fileSavedAt` と読んだ文書は保つ | 本書の改訂の記録に残す。`CR-460` の本文は書き換えない（変更要求は当てた時の文のまま —— `CR-500:141`） |

---

## 6. 継ぎ目（体に渡すときは両方のブリーフに同じ字面で書く）

- 領域のキー `fileFlow`、型の幹 `FileFlowValues`、ファイル `file-flow-values.ts`、公開は `emptyFileFlowValues` ・ `stepFileFlowValues` と生成した型・定数（変えない）。
- 機械 `unsavedEditsStateMachine`（今の状態 `unsavedEditsState`、型 `UnsavedEditsState`）: `nothingUnsaved`（初期）・ `editsUnsaved`。運ぶ値 0。
- 出来事（この機械を動かす 5）: `fileFlow/documentEditLanded`（新、運ぶ値 0）・ `fileFlow/newDocumentLanded`（新、0）・ `fileFlow/startupDocumentHeld`（新、0）・ `fileFlow/documentOpenLanded`（既存に運ぶ値 `openChoice` を足す —— 型は `FileFlowOpenChoice`、`'replace' | 'merge' | 'baseline'`）・ `fileFlow/documentFileSaved`（既存のまま）。
- ガード（1）: `isReplaceChoice`（`documentOpenLanded` の `openChoice === 'replace'`）。副作用 0。`{in: …}` 0。
- ⛔ 合流・重ね（`RD-3`）の着地で呼び手は `documentEditLanded` を送らない —— `documentOpenLanded` だけ。
- 同じ種類へ移る升（`editsUnsaved` の上の `documentEditLanded` ほか、表に無い組）は同じ参照を返す（`SF-3`）。

---

## 7. 問いの候補に打った 3 つの反証（`handoff.md` §0.2）

方法: (1) `docs/development-records/rulings.md`（`9b8a22b7`、543 行。2026-09-22 に `39c15ff4` の 561 行で同じ語を引き直して同じく 0 件）を grep —— 「未保存」0、`FR-100` 0、`beforeunload` 0、`hasUnsavedEdits` 0、`fileSavedAt` 0、`FR-101` 0、`AT-140` 0、「保存した時刻」0（`DFC-459` の裁定は台帳の側 `defects.md:87` に在る）。(2) `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <行>`（2026-09-21）: `FR-100` 要求 1 ／ 参照 4（指す先 `LM-11` ・ `U-55` ・ `OP-4` ・ `QN-5`）、`ZE-4` 0 ／ 0、`FR-101` 1 ／ 10（指す先 `AT-140` ほか）、`AT-140` 2 ／ 2、`RD-1` 0 ／ 0、`OP-4` 5 ／ 13、`SF-10` 0 ／ 0、`FR-095` 2 ／ 8。当てた後（2026-09-22、作業木）に同じ行を引き直すと、`FR-100` 1 ／ 7（指す先は同じ 4）、`ZE-4` ・ `RD-1` ・ `SF-10` 各 0 ／ 1、`FR-101` 1 ／ 11、`AT-140` 2 ／ 2、`OP-4` 5 ／ 13、`FR-095` 2 ／ 9 —— 増えた参照は刷り直した 表 T-290 の節（`ZE-4` ・ `RD-1` は本書の機械の根拠）と、起草時の数え方の違いで、どの候補の答えも変えない。(3) 導けるか。

| 候補 | (1) | (2) | (3) 導けるか | 結果 |
|---|---|---|---|---|
| 機械を立てるか（`CR-460` の決定 9 を覆すか） | 0 件 | `FR-100` 1 ／ 4、`SF-10` 0 ／ 0 | **導けた（立てる）** —— `FR-100` が 2 つの状態を名指す（des:754 の規則）。導ける値ではない（2.3）。`SF-10` は文書の話で、印は文書の外（`:1978` と `:2029`）。前例 `CR-490` の `selectionPruned` | 決定 1 ・ 2 |
| 置き場（`fileFlow` か新しい領域か） | 0 件 | —— | **導けた（`fileFlow`）** —— 生成器のキーの規則と、既存の 2 出来事の使い回し。`CR-490` の 11.7 の 1 | 決定 3 |
| `fileSavedAt` を運ぶ値にするか | 0 件（裁定は `DFC-459` の側、2026-09-11「最後に保存した時刻を文書に持つ列を足せ」） | `FR-101` 1 ／ 10、`AT-140` 2 ／ 2 | **導けた（しない）** —— `FR-101` の保管の MUST と `SF-10`。`CR-460` の決定 9 | 決定 8 |
| 取り消しで保存した時点へ戻ったら印を下ろすか | 0 件 | `RD-1` 0 ／ 0、`FR-100` 1 ／ 4 | **導けた（今日のまま立てる）** —— `JDG-57`。仕様との食い違いかは台帳が判じる（2026-09-13 の裁定） | 候補 1 |
| 取り消し・やり直しを書き込みと同じ出来事にするか | 0 件 | —— | **導けた（同じ）** —— 升が同じ。前例 `CR-500` の決定 4 | 決定 5 |
| 合流・重ねと置き換えを 1 つの着地で割るか、出来事を分けるか | 0 件 | `OP-4` 5 ／ 13 | **導けた（運ぶ値で割る）** —— 着地は `CR-460` が 1 つの出来事にした。選び方は状態に残らない（`CR-460` の付録 C.1）。型とガードの名が既に在る | 決定 6 |
| 置き換えの確認（`OP-4`）をこの機械で条件づけるか | `DFC-279`（`fixed-defects.md:378`、`取下げ`「置き換えは常に問う」） | `OP-4` 5 ／ 13 | **導けた（しない）** —— 台帳が既に閉じた | 第 10 節 |
| 起動の文書（`RD-6`）の着地を出来事にするか | 0 件 | —— | **導けた（する）** —— 今日の書き手を 1 つ残らず写す（`JDG-57`）。口 `holdDocument` は `FrameLoop` の公開の型（`:213`） | 決定 7 |

⇒ **3 つとも空だった候補は 0 件。問いは無い。**
⚠️ 利用者に**知らせる**価値があるのは 1 つ: 本書は `CR-460` の決定 9 の半分（`hasUnsavedEdits` を外とした読み）を覆す（決定 1 ・ 第 5 節）。

---

## 8. 台帳の候補（⛔ 問いではない。どちらが正かを選ばない）

2026-09-13 の利用者の裁定（仕様とコードの食い違いは、どちらが正かを選ばずに台帳へ）に従う。番号は書く直前に `defects.md` と `fixed-defects.md` を引いて決める（2026-09-22 の上端 `DFC-770`）。⚠️ **どれも未検証（画面で押していない。コードを読んだだけ）。**

| 仮の名 | 食い違い | 片側 | もう片側 | 台帳の今 |
|---|---|---|---|---|
| **候補 1** | **取り消し・やり直しで保存した時点の文書へ戻っても、未保存の編集の印が立ったまま** —— `RD-1` ・ `RD-2` の着地はいつも `true`（`frame-loop.ts:3270`）。既存の試験がこの形を前提に読んでいる（`tests/unit/fr-020-both-ways-ic-41.test.ts:362`〜`:364` の注） | `FR-100`（req:5653）「未保存の編集が無いときに出させてはならない（MUST NOT）」 | `frame-loop.ts:3270` | 0 件。⭐ `DFC-638`（`defects.md:172`、値の動かない書き込みで印が立つ、`未検討`）と同じ形（印が内容ではなく出来事を数える）—— `DFC-638` への追記か別の行かは台帳の体が決める |
| **候補 2** | **`DFC-638` の範囲の確認** —— 本書の機械は `DFC-638` の今日の側（受け入れられれば値が動かなくても立てる）を `documentEditLanded` の源の注に写す。直すと決まれば、源の注と呼び手を変える（升は変わらない） | `FR-100` の MUST NOT | `frame-loop.ts:3244`〜`:3245` | **既存 `DFC-638`**（`未検討`）。新しい行は足さない。台帳の体へ「`CR-510` の後の直し場所は `documentEditLanded` の呼び手」と 1 文の追記を頼む |
| **候補 3** | **`Agent API` の書き込みが未保存の編集にならない** —— `agent-api-members.ts:319` の書き込みは `holder.replace`（`frame-loop.ts:2087`〜`:2097`）だけを通り、印を書かない。AI に編集させた後にタブを閉じても宿主の警告が出ない疑い | `FR-100`（req:5652）「未保存の編集を持ったまま … 離れる前に宿主の警告が出るようにすること（MUST）」、`LM-11`（req:209）「タブを閉じる側は `FR-100` が塞ぐ」 | `frame-loop.ts:3245`（書き手は画面の道だけ）。⚠️ `FR-100` の RATIONALE（req:5658）は「書き込みが人の操作だけになったので」と書く —— `Agent API` の書き込みを数えるかは仕様が言い切っていない（仕様の空白かもしれない） | 0 件（`defects.md` ・ `pending-decisions.md` を「未保存」「Agent API の書き込み」で引いた）。性質が `PND` か `DFC` かは台帳の体が判じる |
| **候補 4** | ⚠️ **準正常系（`JDG-78` の後へ）** —— 保存の `await` のあいだに着地した画面の書き込み（`changeDocument` は問いが立っているときしか止まらない —— `:3933`〜`:3934`）も、保存が書けた時点で「保存した」として印が下りる。ファイルに書いたのは始めた時点の文書（`CS-4`、`:3570`〜`:3571`）なので、後の編集は失われうる | `FR-100` の MUST、`CS-4`（des:655）「始めた時点の値で行う」 | `frame-loop.ts:3589`〜`:3590`、`:3933`〜`:3934` | 0 件。`DFC-538`（`await` をまたぐ読み）・`DFC-586` の束の近く。⭐ 原稿は今日を写す（`documentFileSaved` × `editsUnsaved` → `nothingUnsaved`、ガード無し） |
| **候補 5** | **開く・新しく始めるの後も、前の文書の保存の時刻が画面に残る** —— `fileSavedAt` の書き手は保存の道だけ（`:3589`）。別のファイルを開いても、新しく始めても、前に保存した時刻を `U-59` が出し続ける | `FR-101`（req:5676〜5678）「そのファイルへ最後に書いた時刻 … まだ 1 度もファイルへ書いていないときは、時刻の代わりにその旨を示すこと（MUST）」 | `frame-loop.ts:3589`（唯一の書き手）、`:2410` | **`DFC-459`（`実装待ち`）の直しで閉じる見込み**（時刻が文書から来るので、開いた文書の刻が出る）。名前の側は既存 `DFC-574`。⇒ 新しい行ではなく `DFC-459` への追記候補 —— 台帳の体が判じる |

⚠️ 既に在る関係の行（本書は直さない）: `DFC-459`（`fileSavedUtc` を書く造りが無い）、`DFC-574`（開く道が `openedFileName` を書かない）、`DFC-614`（`Agent API` の取り込みが合流に決め打ち）、`DFC-638`、`DFC-279`（`取下げ` —— 置き換えは常に問う）、`DFC-538`、`DFC-586`。

---

## 9. 数の予測

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行。
**起草時（`9b8a22b7`、2026-09-21）: `tables=181  figures=25  rows=2241  uids=162`。当てる前（`39c15ff4` を `git archive` で展開、2026-09-22）と当てた後（作業木）はどちらも `tables=182  figures=25  rows=2256  uids=162`** —— 本書の差は 0。⭐ 本書の差だけを突き合わせる。

| | 波 A | 波 B | 内訳 |
|---|--:|--:|---|
| tables | 0 | 0 | 表 T-290 を刷り直すだけ |
| figures | 0 | 0 | 図 F-036 を刷り直すだけ（機械ごとの mermaid が 1 つ増えるが、図の番号は領域に 1 つ） |
| rows | 0 | 0 | 行 ID を足さない |
| uids | 0 | 0 | 要求を足さない |

**そのほかの数**: 原稿は 6 領域 ・ 機械 21 → 22 ・ 状態 60 → 62 ・ 出来事 74 → 77 ・ 升 150 → 156 ＋ 根の升 10（`u-try-gen.py` で測った）。`fileFlow` は出来事 16 → 19 ・ 機械 2 → 3 ・ 状態 9 → 11 ・ 升 38 → 44 ＋ 根 3。表 T-075 は動かない（`UF-89` を書き換えるだけ）。`units.contract.test.ts` と `changelog.md` の「`AdvanceScreenSession`（n）」は動かない。`frameLoop` の `let` は波 B で本書の分 −1（`hasUnsavedEdits`。`fileSavedAt` は残る —— 決定 8）。

---

## 10. ⛔ この変更でやらないこと

- ⛔ 画面の値・通知・身振り・名前付けと入力欄・選択の原稿を変えない。`fileFlow` の既存の 2 機械と根の升を変えない（変えるのは `documentOpenLanded` の運ぶ値 1 つだけ）
- ⛔ `fileSavedAt` を原稿に入れない（決定 8）。`DFC-459` を直さない
- ⛔ 置き換え・新しく始めるの確認（`OP-4` ・ `QN-5`）をこの機械で条件づけない —— `DFC-279` が閉じた（「置き換えは常に問う」）
- ⛔ タブの見出しに未保存の印を足さない —— 要求が無い（`FR-100` は宿主の警告だけを求め、「辞書に語を持たせてはならない（MUST NOT）」req:5663）
- ⛔ 第 8 節の候補を移す波で直さない（`JDG-57`）。新しい異常系・準正常系の扱いを設計しない（`JDG-78`）
- ⛔ 波 A で `src/adapter` ・ `src/framework` に触らない（段 5・段 6 の持ち場）
- ⛔ 表 `T-294` ・ 図 `F-040` ・ `UF-123` を取らない（決定 9）
- ⛔ 基準線を体に触らせない

---

## 付録 —— 領域 `fileFlow` に足すもの

**略記**: `req` ＝ `docs/spec/01-04-requirements.md`、`des` ＝ `docs/spec/05-07-design.md`。行番号は `39c15ff4`（2026-09-22）。
根拠の行: `FR-100` req:5650〜5653、`ZE-4` :3217、`LM-11` :209、`OP-3` ・ `OP-4` :5566 ・ 5567、`OP-13` :5577、`FR-060` :5594、`FR-062` :5621、`FR-095` :5945、`FR-101` :5676 ／ `WS-6` des:690、`RD-1` 〜 `RD-7` des:718〜723（表 T-230）。
升目の書き方: `→ 先 [ガード]`。**`—` は変わらない ＝ 同じ参照**（`SD-3`）。

### A. 出来事（足す 3 ・ 運ぶ値を足す 1）

| 出来事 | どこから来るか | 運ぶ値 | 動かすもの |
|---|---|---|---|
| `fileFlow/documentEditLanded`（新） | 副作用の結果: 画面からの書き込み（表 T-067 の 1 巡）か、取り消し・やり直し（`RD-1` ・ `RD-2`）が受け入れられた。`Agent API` の書き込みと合流・重ね（`RD-3`）では送らない。受け入れられたかだけで送り、値が動いたかを問わない | — | `unsavedEditsStateMachine` |
| `fileFlow/newDocumentLanded`（新） | 副作用の結果: `carryOutOwedAction`（新しく始めること）の差し替え（`RD-7`）が受け入れられた | — | `unsavedEditsStateMachine` |
| `fileFlow/startupDocumentHeld`（新） | 副作用の結果: 起動時の文書の差し替え（`RD-6`）が受け入れられた | — | `unsavedEditsStateMachine` |
| `fileFlow/documentOpenLanded`（既存） | 変えない | ＋ `openChoice`（`OP-3` ・ `RD-3` ・ `RD-4`。置き換えか、合流・重ねか） | 根 ・ `fileOperationStateMachine` ・ ＋ `unsavedEditsStateMachine` |
| `fileFlow/documentFileSaved`（既存） | 変えない | 変えない | 根 ・ `fileOperationStateMachine` ・ ＋ `unsavedEditsStateMachine` |

### B. 機械 `unsavedEditsStateMachine` —— 未保存の編集を持っているか（`FR-100`）

| 状態 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|
| `unsavedEditsStateMachine.nothingUnsaved` | ○ | — | `FR-100`、`ZE-4` |
| `unsavedEditsStateMachine.editsUnsaved` | | — | `FR-100`、`LM-11` |

### C. 刷った形（`u-try-gen.py` が生成器の `build()` で刷った節 —— スクラッチの `u-printed-fileflow.md`）

| 出来事 | `nothingUnsaved` | `editsUnsaved` |
| --- | --- | --- |
| `fileFlow/documentEditLanded` | → `editsUnsaved` | — |
| `fileFlow/documentOpenLanded` | → `editsUnsaved` [not `isReplaceChoice`]（合流・重ねは、ファイルに無い文書を作る）<br>それ以外 → — | → `nothingUnsaved` [`isReplaceChoice`]（置き換えは、開いたファイルと同じ文書にする）<br>それ以外 → — |
| `fileFlow/documentFileSaved` | — | → `nothingUnsaved` |
| `fileFlow/newDocumentLanded` | — | → `nothingUnsaved` |
| `fileFlow/startupDocumentHeld` | — | → `nothingUnsaved` |

表に無い出来事（`fileFlow` のほかの 14）はこの機械を変えない（同じ参照）。升 6。
図（mermaid）の矢印: `nothingUnsaved → editsUnsaved`（`documentEditLanded`, `documentOpenLanded`）、`editsUnsaved → nothingUnsaved`（`documentOpenLanded`, `documentFileSaved`, `newDocumentLanded`, `startupDocumentHeld`）。

### D. 原稿の JSON の差（`regions` の `fileFlow` の中。スクラッチの `u-addition.json` が同じもの、`u-state-machines-copy.json` が当てた後の原稿の全体）

① `events` の `documentOpenLanded` の `carries` の末尾（`openedFileName` の後）に足す:

```json
{"name": "openChoice", "rows": ["OP-3", "RD-3", "RD-4"], "note": {"ja": "置き換え（`RD-4`）か、合流・重ね（`RD-3`）か"}}
```

② `events` の末尾（`documentFileWriteEnded` の後）に足す:

```json
{"key": "documentEditLanded", "source": {"kind": "effectResult", "rows": ["WS-6", "RD-1", "RD-2", "FR-100"], "note": {"ja": "画面からの書き込み（表 T-067 の 1 巡）か、取り消し・やり直しの差し替えが受け入れられた。`Agent API` の書き込みと合流・重ね（`RD-3`）では送らない。受け入れられたかだけで送り、値が動いたかを問わない"}}, "carries": []},
{"key": "newDocumentLanded", "source": {"kind": "effectResult", "rows": ["FR-095", "RD-7"], "note": {"ja": "`carryOutOwedAction`（新しく始めること）の差し替えが受け入れられた"}}, "carries": []},
{"key": "startupDocumentHeld", "source": {"kind": "effectResult", "rows": ["FR-062", "RD-6"], "note": {"ja": "起動時の文書の差し替えが受け入れられた"}}, "carries": []}
```

③ `machines` の末尾（`confirmationStateMachine` の後）に足す:

```json
{
 "name": "unsavedEditsStateMachine",
 "states": [
  {"key": "nothingUnsaved", "parent": null, "initial": true, "carries": [], "evidence": ["FR-100", "ZE-4"]},
  {"key": "editsUnsaved", "parent": null, "initial": false, "carries": [], "evidence": ["FR-100", "LM-11"]}
 ],
 "transitions": {
  "documentEditLanded": {
   "nothingUnsaved": {"to": "editsUnsaved", "evidence": ["FR-100", "WS-6", "RD-1", "RD-2"]}
  },
  "documentOpenLanded": {
   "nothingUnsaved": {"to": "editsUnsaved", "guard": [{"name": "isReplaceChoice", "not": true}], "evidence": ["FR-100", "RD-3"], "note": {"ja": "合流・重ねは、ファイルに無い文書を作る"}},
   "editsUnsaved": {"to": "nothingUnsaved", "guard": [{"name": "isReplaceChoice"}], "evidence": ["FR-100", "OP-4", "RD-4"], "note": {"ja": "置き換えは、開いたファイルと同じ文書にする"}}
  },
  "documentFileSaved": {
   "editsUnsaved": {"to": "nothingUnsaved", "evidence": ["FR-100", "FR-060"]}
  },
  "newDocumentLanded": {
   "editsUnsaved": {"to": "nothingUnsaved", "evidence": ["FR-100", "FR-095", "RD-7"]}
  },
  "startupDocumentHeld": {
   "editsUnsaved": {"to": "nothingUnsaved", "evidence": ["FR-100", "FR-062", "RD-6"]}
  }
 }
}
```

⭐ 上の ① 〜 ③ をそのまま原稿の写しに足して `load()` に通し、問題 0（`u-try-gen.py`、2026-09-21）。当てた原稿は ② の `newDocumentLanded` の注だけが違う（改訂の記録 2）。

### E. 運ぶ値の型（コードが決める。原稿は名前だけ —— 表 T-250 の `SD-1` ・ `SD-2`）

| 名 | 型の見込み | 置き場 |
|---|---|---|
| `openChoice`（`documentOpenLanded`） | `FileFlowOpenChoice`（`'replace' \| 'merge' \| 'baseline'`、`file-flow-values.ts:13`）。生成区画は `FileFlowValuesEventCarried['openChoice']` を刷る —— `openChoiceAnswered` と同じ名なので型の行を足さない | `file-flow-values.ts` |
| `UnsavedEditsState` | 生成区画が刷る `{ kind: 'nothingUnsaved' } \| { kind: 'editsUnsaved' }` | 同上 |

## 改訂の記録

| # | 日付 | 何を変えたか | 理由 |
|---|---|---|---|
| 1 | 2026-09-21 | 起草（`9b8a22b7`） | `CR-490` の 11.1 の 1 ・ 2 と 11.7 の 1 |
| 2 | 2026-09-22 | 波 A を当てた（`39c15ff4` の上の作業木）。原稿の領域 `fileFlow` に付録 D の ① 〜 ③ を足し（ほかの 5 領域と、`fileFlow` の既存の 2 機械・根は 1 字も変えていない）、`npm run gen` で 表 T-290 ・ 図 F-036 の節と `file-flow-values.ts` の生成区画を刷り直した。`file-flow-values.ts` の手書きの側: `onDocumentOpenLanded` ・ `onDocumentFileSaved` に `unsavedEditsState` の移りを足し、`onDocumentEditLanded` と、`newDocumentLanded` ・ `startupDocumentHeld` の 2 つが共に使う `onDocumentHeldAfresh`（升が同じ —— どちらも `nothingUnsaved` へ）を `HANDLERS` に足した。ガードは小さな関数 `isReplaceChoice`、同じ種類へ移るときに同じ参照を返すのは `unsavedEditsMoved`。`advance-screen-session.ts` の `IS_FILE_FLOW_EVENT` に 3 つを足した。草案から変えたのは 1 つ: 付録 D の ② の `newDocumentLanded` の注から頭の「副作用 」を除いた —— 刷った出来事の表が「副作用の結果（副作用 …）」と重ねて読めたため | 数は予測どおりだった: 原稿 6 領域 ・ 機械 22 ・ 状態 62 ・ 出来事 77 ・ 升 156 ＋ 根 10、md-checks は本書の差 0（`tables=182  figures=25  rows=2256  uids=162`）。表 `T-294` ・ 図 `F-040` ・ `UF-123` は使っていない |
| 3 | 2026-09-22 | 試験は契約試験 `state-machine-file-flow.contract.test.ts` の見本の表（`EVENT_VARIANTS`）だけを触った: 新しい 3 つの出来事に運ぶ値の無い見本を 1 つずつ置き、`documentOpenLanded` の 4 つの見本に `openChoice`（`replace` ・ `merge` ・ `baseline` ・ `replace`）を足した。3.1 の予測どおり、足さないと原稿の出来事ごとに見本を引く所（`flowEvents`）が「no sample for fileFlow/documentEditLanded」で投げる | 新しい機械の状態を交えた積（`crossedSessions` の 3 機械化）、直交、`editsUnsaved` の上の升の主張は、仕様だけを読む別の体が書く（`RA-6`）。いまの積はこの機械を初期の `nothingUnsaved` にだけ置く |
