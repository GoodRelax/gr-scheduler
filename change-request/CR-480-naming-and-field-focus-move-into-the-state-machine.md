# CR-480 — 名前付けと焦点の求めを状態機械へ移す（段 7 の第 6 領域）

> ⭐ **状態: 波 A を当てた（2026-09-21、ブランチ `sm-naming-a`、`c8329fbf` の上）。波 B ・ 波 C は当てていない。**
> ⭐ 当てた体が草案から変えたところは、末尾の改訂の記録の 2 以降に並べた。第 0 〜 10 節と付録は草案の文のまま残した —— 当てた形の全数は 表 T-292 が持つ。
> 読んだ木: `c8329fbf`（ブランチ `refactor`）。作業木の変更は `dist/index.html` ・ `docs/development-records/defects.md`（集計の 2 表の日付と数だけ）・ `docs/development-records/measurements/stats.jsonl` の 3 つで、本書が引く `src/` と `docs/spec/` は動いていない（`git status --short`、`git diff --stat`）。**本書の行番号と数は、断りが無いかぎりこの木で 2026-09-21 に自分で測ったものである。**
> 型板は `CR-460`（最新の全領域の形）・`CR-470`（領域を立てない判断の形）・`CR-450`。名前の規則は `docs/development-rules/07-review-standards.md` の「状態機械（State Machine）」の節（`:296`〜`:343`）と R4.4（`:605`）。原稿の形は `docs/spec/_source/state-machines.schema.json` と、生成器 `docs/spec/_source/state_machines_json_to_md.py` の `load()` が拒むもの（`:26`〜`:52`）に従う。
>
> **結論（先に書く）: 小さな領域を 1 つ立てる —— 状態機械 2 つ・状態 4・出来事 5。** 要求が名指す離散の状態は 2 つだけ残る:「作った直後の名前付けの場面」（`FR-091`）と「欄に焦点を置く求め」（`IN-5a` の後の段・`IN-5b`）。棚卸しが数えた 23（いまは 24）の覚えのうち、残りの 22 は、宿主が答える値（`IF-9` の「まだ確定していない文字入力があるか」）、入力ごとの値、副作用の持ち越し、DOM の焦点と書いた値の覚えであり、状態機械に入れない（第 2 節）。⭐ **`dom-screen-surface.ts` の 16 は 1 つも移らない。**
>
> **閉じるもの**:
> - 計画の記録 4 の移す順の 6 番目の先頭「名前付けと入力欄」（`docs/development-records/refactor-plan-report-2026-09-13.md:253`。領域の例 `namingCreatedTaskUid` ・ `isSettlingFieldCommit` は `:242`）。
> - 棚卸しの記録 3 の「名前付けと入力欄の流れ 5 ／ 5 ／ 23 —— 16 行は画面の面の入力欄の持ち方」（`refactor-stage1-state-inventory-2026-09-13.md:207`）の行き先を、1 行ずつ決めること。
> - 棚卸しの記録 4 の領域をまたぐ読み 3 つ（同 `:221` ・ `:229` ・ `:235`）と画面の面の `Esc` ・ `Enter` のリスナー（`:241`）を、出来事の運ぶ値・呼び手の詰め方・面に残るものへ割ること。
>
> **識別子**（規則 02 の 2.5。起草時に `c8329fbf` で測り、波 A を当てる直前の 2026-09-21 に同じ木で測り直した）:
> - 依頼が配った帯: **表 `T-292`、図 `F-038`、ユニット `UF-121`、変更要求 `CR-480`**。`docs` ・ `change-request` ・ `src` ・ `tests` ・ `tools` ・ `.claude` で `git grep -lw` して 4 つとも 0 件だった（当てる直前にも、本書を除いて 0 件）。当てる直前、見出しが定義する表の上端は `T-290`、図は `F-036` だった（`grep -ohE "\*\*表 T-[0-9]+[a-z]? —"` ・ 図も同じ）。`T-291` ・ `F-037` ・ `UF-120` は `CR-470` が使わずに返した番号で、`CR-450` ・ `CR-470` ・ `handoff-state-machine.md` の記述にだけ残る。
> - ⚠️ **帯の取り決めとの突き合わせ**: `docs/development-records/handoff.md:42`（本線のセッション）は「`CR-438` 以降のうち `CR-450` ・ `CR-460` ・ `CR-470` を除くもの」を本線の帯とし、`UF-120` 以降と図 `F-035` 〜 `F-039` を状態機械の側とする。`handoff-state-machine.md:106` は「それより先の番号と CR の番号は、本線のセッションに宣言してから取れ」と書く。⇒ `UF-121` ・ `F-038` ・ `T-292` は状態機械の側の帯の中だが、**`CR-480` は本線の帯の中に在る**。当てる前に本線へ宣言して了承を得ること（未確認 —— 本書は宣言していない）。⇒ 波 A は、前に立つ者が依頼で配った帯（`CR-480` を含む）のまま当てた。本線への宣言は前に立つ者の持ち物で、当てた体は確かめていない（改訂の記録の 2）。
> - 表 T-075 は当てる前 86 行（`grep -c "^| UF-" docs/spec/05-07-design.md`、`SU-3` も 86 —— `05-07-design.md:245`）で、上端は `UF-89` だった。波 A の後は 87 行（`SU-3` も 87）。`UF-90` 〜 `UF-119` は本線の帯（`handoff.md:42`）なので、`UF-121` を取って 表 T-075 の番号に穴ができた。穴は許される（`retired.py:200`〜`:204` は番号の再利用を禁じるだけ）。`tests/unit` の `uf-` の上端は当てる前 `uf-89` だった（`ls tests/unit`）。波 A が `uf-121-the-field-entry-transition-table-is-printed-from-the-manuscript.test.ts` を足した。
> - 名の重なり（`git grep -lw`、同じ 6 か所）は当てる直前にも 0 件だった（本書を除く）: `fieldEntry`、`field-entry-values`、`FieldEntryValues`、`createdTaskNamingStateMachine`、`fieldFocusWantStateMachine`、`createdTaskNamingState`、`fieldFocusWantState`、`namingCreatedTask`、`fieldFocusWanted`、`fieldFocusAsked`、`creationLanded`、`fieldFocusLanded`、`fieldFocusWithdrawn`、`choiceMoved`、`bringCreatedRowIntoSight`、`isCreatedTask`。状態のキー `idle` は既に 3 つの機械が使うが、状態の名は `機械.キー` なので重ならない（生成器は同じ機械の中の重なりだけを拒む —— `state_machines_json_to_md.py:428`〜`:430`）。
> - 台帳の上端は当てる直前に `DFC-693`（`docs/development-records/` の全ファイルを `DFC-` で引いた。`fixed-defects.md` を含む）だった。波 A が第 8 節の候補 1 を `DFC-694` として書いた。`PND-500` ・ `JDG-288` は動かしていない。
> - 行 ID の接頭辞・要求 ID は立てない。状態・出来事・遷移に通し番号を振らない（`JDG-286`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **波 A はどの `CH-` も直接には前へ進めない —— 基盤の作業である。** 利用者に見える振る舞いを 1 つも変えない（波 A では画面がこの領域を呼ばない）。波 B（結線）も振る舞いを変えない（`JDG-57`、`rulings.md:134`）。

守るもの:
- **`FR-091`（req:1347）「作った直後の名称を `Enter` で確定したときは、同じ 1 回の押下でプロパティパネルを閉じ、その選択を解くこと」と「これは作った直後の場面に限る」** —— いまは `namingCreatedTaskUid`（`frame-loop.ts:2934`）が「作った直後の場面」を持ち、`settleTextEntry` の枝（`:3895`〜`:3900`）が読む。移した後は `createdTaskNamingStateMachine.namingCreatedTask` が持ち、呼び手が画面の値の既存の出来事 `screen/createdNameSettled`（原稿 `state-machines.json` の画面の値の出来事、`CR-436` の `EV-18`）を選ぶ。
- **`IN-5a` の後の段と `IN-5b`（req:6807 ・ 6808）「焦点を置く求め」「置き直しは、焦点が入るか、求めが取り下げられるまで続けること」** —— いまは `nameFieldWantedRow` ・ `nameFieldWantedUnder`（`:2915` ・ `:2917`）が持つ。移した後は `fieldFocusWantStateMachine.fieldFocusWanted` が持つ。
- **`GL-003`** —— この領域の出来事は人の押下・書き込みの着地・宿主の答え・選択の変化だけで、ポインタの移動では 1 つも作らない（表 T-249 の `SF-5`、des:1011）。性能は `LM-19`（表 T-285 の `RA-8`、des:1126）。⛔ **測る前に利用者を呼ぶ**（`RISK-001` の門）。

### ② レビュー観点のどの条項を当て、何が出たか

- **R4 「状態機械」の節 ／ R4.4** —— 機械 2 つは名詞句 ＋ `StateMachine`（`createdTaskNamingStateMachine` ・ `fieldFocusWantStateMachine`）、今の状態は `createdTaskNamingState` ・ `fieldFocusWantState`。状態は形容詞（`idle`）・過去分詞（`fieldFocusWanted` —— コードの `isFieldFocusWanted` と同じ字面）・現在分詞 ＋ 目的語（`namingCreatedTask` —— コードの `namingCreatedTaskUid` と同じ字面）。出来事 5 はすべて主語 ＋ 過去形で、既存 57 のキーと重なり 0（原稿を読んで照合）。ガードは `isCreatedTask` 1 つ。副作用は `bringCreatedRowIntoSight` 1 つ（動詞 ＋ 目的語）。
- **5.5 の原稿の規則**（des:726「原稿に載せるのは、要求が名指す状態・出来事・遷移だけとする（MUST）」）—— 24 の覚えのうち、要求が状態として名指すのは 2 つ（第 2 節）。
- **`SF-5`（des:1011）** —— `CR-470` が足した 2 文目「フレームの値と、ほかの状態機械の今の状態から毎回導ける値 … も状態機械に入れず、導く関数で求める」を、宿主が答える値（`IF-9` の真偽、des:563）へ当てた。前例は `CR-470` の `partUnderPointer`（宿主が描いた面への問い合わせ）。
- **`SF-6`（des:1012）** —— 作った行を見える位置へ送ること（`HF-17`）は副作用であり、それを次のレイアウトまで持ち越す覚えはシェルに残す。
- **`SF-7`（des:1013）** —— 新しいユニットにモジュールスコープの可変状態を置かない。`dom-screen-surface.ts` のモジュールスコープの `CONTROL_KEYS` ・ `TYPED_CONTROLS`（`:1346` ・ `:1470`）は `Framework` の層で、`SF-7` の「内側の 3 層」の外である。
- **`R4.2`（await 跨ぎ）** —— この領域の覚えに `await` をまたぐものは無い（6 つの `let` の書き手はどれも同期の関数 —— 第 2 節）。

### ③ 利用者に問うこと・**問わずに決めた**こと

**問うこと**: ⭐ **なし（0 件）。** 候補 8 つに打った 3 つの反証は第 5 節に残した。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | **領域を 1 つ立てる。キーは `fieldEntry`、名は「名前付けと入力欄」、ファイルは `field-entry-values.ts`、型の幹は `FieldEntryValues`** | 計画が名前付けと入力欄を 1 つの領域に数える（`refactor-plan-report-2026-09-13.md:242` ・ `:253`）。キーはコードの語 ——「入力欄の確定」`FieldCommit`（`dom-screen-surface.ts:2683`）・`settleTextEntry`（`frame-loop.ts:3892`）・`wantFieldFocused`（`:2925`）。`screen-values.ts` ／ `file-flow-values.ts` と同じ形 |
| 決定 2 | **「作った直後の場面」を機械 `createdTaskNamingStateMachine`（`idle` ／ `namingCreatedTask{createdTaskUid}`）とする** | `FR-091` は「これは作った直後の場面に限る（MUST）」「あちらは人が選んだ選択を守り、こちらは道具が立てた選択を片づける」と場面を名指す（req:1347 の本文）。選択の今の値からは導けない —— 同じ選択を人が選んだのか道具が立てたのかは、立てた時を覚えなければ分からない |
| 決定 3 | **「欄に焦点を置く求め」を機械 `fieldFocusWantStateMachine`（`idle` ／ `fieldFocusWanted{fieldRow}`）とする** | `IN-5a` の後の段（req:6807）が求めを名指し、そのあいだ単文字キーをショートカットにしないことと、取り下げの 4 つの事由を定める。`IN-5b`（req:6808）が「焦点が入るか、求めが取り下げられるまで」続けることを定める。入力とフレームをまたいで残り、入力の翻訳係が読む（`input-command-translator.ts:1460`、`frame-loop.ts:3042`）。`JDG-175`（`rulings.md:294`）が問 8 でこの形を了承した |
| 決定 4 | **「まだ確定していないその場の編集」（`AG-9` の「入力中」）は状態にしない。** 宿主が答える値（フレームの値）として、読む出来事が運ぶ | `IF-9`（des:563）が、答える者を `ScreenSurface` と定め、真偽 1 つで答えると定める。いまのコードも覚えずに毎回問う（`frame-loop.ts:2907`「asked, never cached; focus moves without any happening」）。焦点は出来事なしに動く（ブラウザが動かす）ので、状態にすると焦点の移動ごとの出来事が要る。読む 4 か所はすべて出来事の運ぶ値か呼び手の詰め方で受けられる（2.1） |
| 決定 5 | **`isSettlingFieldCommit` ・ `didSettleFieldEntry` は領域に入れない。** 前者は 1 回の書き込みの呼び出しの中だけの窓で、波 B で書き込みの時機（`WS-2` の `editingInPlace`）を引数で渡す形に置き換える。後者は 1 つの入力の中だけの値（`readFieldCommit` の答え）で、画面の値の既存の運ぶ値 `settleKeyPressed.hasNoUnsettledEntry` が既に受ける | 棚卸しが両方を「実装の都合」とした（`refactor-stage1-state-inventory-2026-09-13.md:95` ・ `:100`）。書き手と読み手が同じ入力の中に閉じる（`spendFieldCommit` の `:4117`〜`:4129`、読み手 `:3069` ・ `:3901` ・ `:4307`）。画面の値の `settleKeyPressed` は運ぶ値 `hasNoSurfaceOrConfirmation` ・ `hasNoUnsettledEntry` を既に持つ（原稿、`CR-436` の `EV-19`） |
| 決定 6 | **作った行を見える位置へ送ること（`HF-17`）は、根の升の副作用 `bringCreatedRowIntoSight` とする。** 描かれているかを判じて送るのはシェル（次のレイアウトで）。持ち越しの覚え `addedRowOwedSight` はシェルに残す | 送るかは描いた行の箱（フレームの値）で決まる（`frame-loop.ts:2178`〜`:2181`）。`SF-6` の副作用の実行の中身である。前例 `CR-460` の決定 5（待ちの継続はシェルの文脈） |
| 決定 7 | **求めの取り下げは 1 つの出来事 `fieldFocusWithdrawn` とし、どの入力が取り下げかは呼び手が決める。** 原稿は `IN-5a` の 4 つの事由だけを出どころに書く | 事由は入力の種類（`Esc` ・ `Tab` ・ 押下）と画面の値の変化（パネルを閉じた）にまたがる。出来事を事由ごとに分けると、画面の値・身振りの既存のキー（`escapePressed` ・ `pointerPressed`）と重なる名を避けて 4 つ作ることになり、升はどれも同じ（`fieldFocusWanted` → `idle`）。⚠️ いまのコードは要求に無い事由でも求めを消す ⇒ 第 8 節の候補 1。波 B のシェルが写す（決定 10） |
| 決定 8 | **選択の変化はこの領域の出来事 `choiceMoved` として受け、`createdTaskNamingStateMachine` だけを動かす。** 作ったものを選んだ変化は `creationLanded` が運ぶので、呼び手は送らない | 画面の値の `selectionMoved`（原稿、`otherRegion`「選択」）と同じ入力から 2 つの出来事を作る —— 1 つのキーを 2 つの領域に置けない（`state_machines_json_to_md.py:48`〜`:51`、`CR-440` の決定 12）。1 入力 → 2 出来事の前例は `CR-450` の 2.1 と `CR-460` の決定 7。名はコードの `endCreatedNamingIfChosenMoved`（`frame-loop.ts:2937`）の字面 |
| 決定 9 | **`namingCreatedTask` で行を足しても名前付けの場面は終わらない（升は「それ以外 → —」）** | いまのコードを写した —— 行を足す道は `selection` を変えず `selectedGroupIds` だけを変え（`frame-loop.ts:4075`）、`endCreatedNamingIfChosenMoved` は `selection` だけを比べる（`:2938`）。要求はこの組を語らない。⛔ 新しい扱いを設計しない（`JDG-78`） |
| 決定 10 | **原稿は要求どおりに書き、いまの振る舞いとの差は波 B でシェルが「何を出来事に詰めるか」で写す。直すのは波 C** | `CR-460` の決定 11 と同じ筋。差は升ではなく、シェルが `fieldFocusWithdrawn` を送る事由に在る（第 8 節の候補 1） |
| 決定 11 | **表 T-075 の新しい行 `UF-121` の「負う要求」は `—`** | `CR-440` の決定 11 ・ `CR-450` の決定 11 ・ `CR-460` の決定 13 と同じ理由。波 A では画面がこのユニットを呼ばない |
| 決定 12 | 識別子: 表 `T-292` 1 つ（この領域の出来事・根・2 つの機械の遷移表）、図 `F-038` 1 つ、`UF-121` | 依頼の帯（領域につき表 1 つ・図 1 つ） |

---

## 1. 測った事実（`c8329fbf`、2026-09-21）

| 数 | 値 | 測り方 |
|---|---|---|
| `frameLoop` の範囲 | 1799〜4414 行 | `grep -nE "^(export )?(async )?function frameLoop"` と、その後の最初の `^}`（`awk 'NR>1799 && /^}/'`） |
| `frameLoop` が直に持つ `let` | 66（うちこの領域の候補 6: `:2913` ・ `:2915` ・ `:2917` ・ `:2934` ・ `:2941` ・ `:2946`） | 字下げ 2 の `let` を数えた |
| 棚卸しとの差 | 棚卸しは `frameLoop` 5 ＋ `boot` 2 ＋ 面の閉包 14 ＋ モジュール 2 ＝ 23（`refactor-stage1-state-inventory-2026-09-13.md:207`）。**`nameFieldWantedUnder`（`:2917`）は棚卸しの後に `2d7c0670`（`DFC-651` の直し、`CR-426` の `IN-5b`）が足した** —— 本書は 24 行 | `git log -S"nameFieldWantedUnder"` |
| `domScreenSurface` の範囲 | 2298〜3168 行 | 同じ測り方 |
| 原稿の今 | 4 領域・機械 18・状態 53・出来事 57・升 127 ＋ 根の升 5 | スクラッチの `n-sm.py` で `state-machines.json` を数えた |
| 画面の値の原稿が既に持つこの領域の受け口 | 出来事 `createdNameSettled`（入力「作った直後の名前の `Enter`」、`FR-091`）・`settleKeyPressed`（運ぶ値 `hasNoSurfaceOrConfirmation` ・ `hasNoUnsettledEntry`、`SK-19`）・`selectionMoved`（ほかの領域「選択」）・`propertiesOfChoiceAsked`、段 `escapePressed.rung` | 原稿を読んだ（`CR-436` の `EV-18` ・ `EV-19`、`CR-436:428`〜`:429`） |
| md-checks の最終行 | `tables=179  figures=23  rows=2225  uids=162` | 第 7 節 |
| 草案の原稿を生成器に通した | `load()` の問題 0。表と図を刷れた | スクラッチの `n-try-gen.py`（原稿の写しに付録の領域を足し、`SRC` を写しへ向けて `load()` と `build()` を呼んだ。木には何も書いていない ——`git status --short` が前後で同じ） |

⭐ **棚卸しの行番号は古い仮説として受け、すべて測り直した**（棚卸しの `namingCreatedTaskUid` は `:2316`、いまは `:2934`）。

---

## 2. 棚卸しの測り直しと分類

分類は `SF-5`（des:1011）、`SF-6`（des:1012）、`SF-10`（des:1016）と 5.5 の原稿の規則（des:726）を 1 つずつ当てた。
**状態** ＝ 原稿の機械の状態。**運ぶ値** ＝ 状態か根の運ぶ値。**フレームの値** ＝ シェルに残る座標・寸法・時刻、宿主が答える値、入力ごとの値と、それらから毎回導ける値。**外** ＝ この領域の状態ではない（行き先を書く）。
読み書きは `\bname\b` を `frameLoop` の範囲で行ごとに拾った（`awk 'NR>=1799 && NR<=4414' | grep -nw`）。

| # | 覚え | 所在（宣言） | 書き手 ／ 読み手 | 分類 | 名指す仕様の行 |
|---|---|---|---|---|---|
| 1 | `namingCreatedTaskUid` | `frame-loop.ts:2934` | 書き: `endCreatedNamingIfChosenMoved`:2938、`settleTextEntry`:3896、`standOnWhatWasCreated`:4069。読み: `settleTextEntry`:3895 | **状態** `createdTaskNamingStateMachine.namingCreatedTask` ＋ **運ぶ値** `createdTaskUid` | `FR-091` req:1347、`TC-9` req:1079、`FR-001` req:1047 |
| 2 | `nameFieldWantedRow` | `:2915` | 書き: `wantFieldFocused`:2926（呼び手 `editInPlace`:3916 ・ 3921 ・ 3925 ・ 3930 ・ 3935、`standOnWhatWasCreated`:4068 ・ 4077）、`focusWantedField`:2291、`tryWantedFieldBeforeInput`:2304。読み: `focusWantedField`:2280、`tryWantedFieldBeforeInput`:2299、`isFieldFocusWanted`:2317 → `collectInputContext`:3042 → `input-command-translator.ts:1460` | **状態** `fieldFocusWantStateMachine.fieldFocusWanted` ＋ **運ぶ値** `fieldRow` | `IN-5a` req:6807、`IN-5b` req:6808、`MK-13` req:3311、`HF-14` req:1671、`FR-035` req:2452、`FR-097` req:5848 |
| 3 | `nameFieldWantedUnder` | `:2917`〜`:2921` | 書き: `wantFieldFocused`:2927、`focusWantedField`:2287。読み: `focusWantedField`:2282 | **割る**: `selection` ・ `groupIds`（求めた時の選択の写し。`:2283` で選択が変わったら求めを消す）⇒ **外** —— 要求が名指さない事由（第 8 節の候補 1）。波 B は呼び手が `fieldFocusWithdrawn` を送って写す。`retriesLeft`（`FIELD_FOCUS_RETRY_FRAMES` = 10、`frame-loop.ts:694`〜`:696`）⇒ **外** —— フレームを求めるかのシェルの規則（`S-` の行が無い。`CR-470` の決定 5 と同じ筋） | `IN-5b` req:6808。`DFC-654`（`defects.md:192`） |
| 4 | `addedRowOwedSight` | `:2941` | 書き: `standOnWhatWasCreated`:4078、`runFrame`:2180。読み: `runFrame`:2178 ・ 2179 | **外** —— 副作用 `bringCreatedRowIntoSight`（根の升、決定 6）を次のレイアウトまで持ち越すシェルの覚え | `HF-17` req:1675、`SF-6` des:1012 |
| 5 | `isSettlingFieldCommit` | `:2913` | 書き: `spendFieldCommit`:4125 ・ 4129（`try` ／ `finally`）。読み: `collectWriteMoment`:3069 | **外** —— 1 回の書き込みの呼び出しの中だけの窓（決定 5）。波 B で書き込みの時機を引数で渡す | 棚卸し `:95`「実装の都合（`WS-2` の窓を自分の確定で閉じないため）」、`WS-2` des:658 |
| 6 | `didSettleFieldEntry` | `:2946` | 書き: `spendFieldCommit`:4117 ・ 4122。読み: `settleTextEntry`:3901、`receiveInput`:4307（`hasKeyActed`） | **フレームの値**（入力ごと）—— 面への問い `readFieldCommit`（`dom-screen-surface.ts:3065`）の答え。画面の値の `settleKeyPressed.hasNoUnsettledEntry` が運ぶ（決定 5） | `SK-19` req:4166、`IF-9` des:563 |
| 7 | `focusPropertyFieldHeld` | `single-html-shell.ts:355`（`boot` の閉包） | 書き: `:367`。読み: `:426` | **外** —— 配線の把手 | 実装の都合 |
| 8 | `readWatermarkUnlockAnswerHeld` | `single-html-shell.ts:357` | 書き: `:371`。読み: `:428` | **外** —— 配線の把手 | 実装の都合 |
| 9〜21 | `watermarkUnlockEntry`（`:2318`）・`fieldCommit`（`:2371`）・`isFieldHeld`（`:2748`）・`heldTextControl`（`:2756`）・`heldTextValueAtFocus`（`:2757`）・`isHeldTextTakenBack`（`:2758`）・`documentTitleEntry`（`:2877`）・`documentTitleBox`（`:2878`）・`documentTitleShown`（`:2879`）・`documentTitleValueAtFocus`（`:2880`）・`isDocumentTitleTakenBack`（`:2881`）・`isWatermarkUnlockHeld`（`:2999`）・`isWatermarkUnlockTakenBack`（`:3000`） | `dom-screen-surface.ts`（`domScreenSurface` の閉包） | 焦点の出入り（`focusin` ・ `focusout`）、`Esc` の 2 段（押して戻し、離して手放す ——`:2788`〜`:2810` ・ `:2962`〜`:2978` ・ `:3025`〜`:3045`）、`Enter` の確定（`:2812`〜`:2834` ・ `:2979`〜`:2990`）、欄の外の押し（`:2836`〜`:2837` ・ `:2852`〜`:2875`）。外へ出るのは `hasUnsettledTextEntry`（`:3060`〜`:3062`）と `readFieldCommit`（`:3065`〜`:3069`）の 2 つの答えだけ | **外** —— DOM の焦点の覚え・確定した値の書き置き・`IME` の変換中の判定（`isComposing`、`:2816` ・ `:2982`）。`IF-9` の答えの中身であり、段 6 の持ち場 | `IF-9` des:563（「真偽 1 つとし、どの欄が保持しているかを返してはならない」）、`DFC-545`（`defects.md:119`）、`PND-352` |
| 22 | `typedControlsByRow` | `dom-screen-surface.ts:2704`（中身を書き換える `const`） | `focusPropertyField`:2724 ほか | **外** —— 行 → 欄の要素の覚え | 実装の都合 |
| 23 ・ 24 | `CONTROL_KEYS` ・ `TYPED_CONTROLS` | `dom-screen-surface.ts:1346` ・ `:1470`（モジュールスコープ） | 欄を作るたびに書く。`fieldCommitOf`:2685 ・ `textEntryControlOf` が読む | **外** —— DOM の要素に付けた札 | 実装の都合 |

⇒ **見つけた覚え 24。状態 2（⇒ 機械 2 つ）、運ぶ値 2（`createdTaskUid` ・ `fieldRow`）、フレームの値 1（`didSettleFieldEntry`）、外 21（`nameFieldWantedUnder` を割った 2 つを 1 と数えた）。**
⚠️ 関数 `hasUnsettledTextEntry`（`frame-loop.ts:2909`〜`:2911`）は `let` ではないが、この領域の中心の値である ⇒ **フレームの値**（宿主の答え、決定 4）。
⚠️ 同じ閉包の `isFieldUp`（`:2370`、対話欄）・`settled`（`:2369`）は `AG-11` の対話欄で、この領域ではない（Agent API の領域の候補）。`isNoticeShowing`（`:2749`）は通知の写し。

### 2.1 領域をまたぐもの（棚卸しの記録 4 を測り直した）

| 読む側 ／ 書く側 | いま | 移した後 |
|---|---|---|
| `collectWriteMoment` が `isSettlingFieldCommit` と面の `hasUnsettledTextEntry` を読む（`WS-2` の `editingInPlace`） | `frame-loop.ts:3069`（棚卸し `:221`） | `editingInPlace` はフレームの値（宿主の答え）のまま。自分の確定の書き込みだけは、呼び手が時機を「確定の書き込み」として渡す（`isSettlingFieldCommit` を消す）。⛔ `WS-2` の升は本書に無い —— 書き込みの時機は「文書と現在値の芯」の持ち物 |
| `settleTextEntry` が `namingCreatedTaskUid` ・ `didSettleFieldEntry` ・ `hasUnsettledTextEntry` ・ `asking` ・ `screenState.surface` を読む（`SK-19` の段、`FR-091`） | `:3892`〜`:3903`（棚卸し `:229`） | 呼び手が、面も問いも無く（`hasNoSurfaceOrConfirmation`）`fieldEntry.createdTaskNamingState` が `namingCreatedTask` なら `screen/createdNameSettled` を、そうでなければ `screen/settleKeyPressed{hasNoSurfaceOrConfirmation, hasNoUnsettledEntry}` を作る。`hasNoUnsettledEntry` ＝ `readFieldCommit` がこの入力で確定を返さず、かつ宿主が「入力中でない」と答えたこと。⭐ 画面の値の原稿は変えない |
| `endCreatedNamingIfChosenMoved` が `selection` を読む | `:2937`〜`:2939`、呼び手 `holder.replace`:1938〜1940 と `receiveInput`:4209〜4211（棚卸し `:235`） | 選択が変わったら呼び手が `fieldEntry/choiceMoved` を作る（画面の値へは `screen/selectionMoved`）。作ったものを選んだ変化は `creationLanded` が運ぶので送らない（決定 8） |
| 求めが選択とパネルを読む | `focusWantedField`:2283（選択の同一性）・`:2284`（`isPropertiesPanelOnScreen` —— 画面の値の `propertiesPanelContentStateMachine`） | パネルを閉じたら呼び手が `fieldEntry/fieldFocusWithdrawn` を作る（`IN-5a` の事由）。選択の変化での取り下げは波 B の呼び手が写す（第 8 節の候補 1） |
| 入力の翻訳係が求めを読む（`IN-5a` の後の段） | `collectInputContext`:3042 → `InputContext.isTextFieldFocusWanted`（`input-command-translator.ts:155`、読み `:1460`） | 翻訳係の文脈を、根の `fieldEntry.fieldFocusWantState` が `fieldFocusWanted` かで詰める ⇒ 段 5 の割り方への申し送り（2.2 の 3） |
| `Esc` の段 `'textEntry'`（`IN-4` の第 2 階層） | `escapeTarget`（`src/entity/document-model/screen-state/screen-state.ts:130`）が `isTextEntryUnsettled` を読む。呼び手は `escapeLevelOf`（`frame-loop.ts:4201` ・ `:4343`） | 段の状態のキーは無い —— フレームの値（`IF-9` の答え）から呼び手が決め、`screen/escapePressed{rung: textEntry}` で運ぶ ⇒ 2.2 の 1 |
| 画面の面の `Esc` ・ `Enter` のリスナーが `isNoticeShowing` を読む（`NT-8` の消去を欄より先に通す） | `dom-screen-surface.ts:2752`〜`:2755`、`:2792` ・ `:2819` ・ `:2965` ・ `:2985` ・ `:3029`（棚卸し `:241`） | **面に残る** —— DOM のリスナーの順の話であり、機械の升ではない（段 6 の持ち場）。⚠️ リスナーはシェルより先に走る（`:2797`〜`:2798` ・ `:2970` の TRAP）ので、`Esc` 1 回が 2 段を使わない形を段 6 が保つこと（2.2 の 4） |
| 焦点を置く・置けたかの答え | `focusWantedField`（`frame-loop.ts:2279`〜`:2292`）が配線の `focusPropertyField`（`dom-screen-surface.ts:2710`〜`:2725`）を毎フレーム呼ぶ | 描いた後、`fieldFocusWantState` が `fieldFocusWanted` ならシェルが焦点を置く（フレームの描き直しの一部）。宿主が「入った」と答えたら `fieldEntry/fieldFocusLanded` を作る。⚠️ いまの `focusPropertyField` は「その行の欄が描かれていない」ときも真を返す（`:2707`〜`:2708` の TRAP、`:2724`）—— 波 B では呼び手が `fieldFocusWithdrawn` として写す（第 8 節の候補 1） |

### 2.2 申し送り（⛔ 本書は `CR-436` ・ 段 5 ・ 段 6 の持ち物を書き換えない）

| # | 相手 | 中身 |
|---|---|---|
| 1 | `CR-436` の波 B2 の 表 `T-283`（`SD-4`、des:738） | `IN-4` の第 2 階層「確定していないその場の編集」の行: 状態のキーは無い（フレームの値 —— `IF-9` の真偽、des:563）。呼び手が決め、`screen/escapePressed{rung: textEntry}` で運ぶ。⭐ `CR-470` の申し送り 1（段「出ている説明」）と同じ種類 —— 8 段のうち状態だけでは決まらない段はこの 2 つ |
| 2 | `CR-436` の波 B2（シェルへの結線） | 2.1 の 2 行目の詰め方: `screen/createdNameSettled` を作るかは `fieldEntry.createdTaskNamingState` で決める。選択が変わったら `screen/selectionMoved` と `fieldEntry/choiceMoved` を 1 つの入力から作る |
| 3 | 段 5（入力の翻訳係を割る） | `InputContext.isTextFieldFocusWanted`（`input-command-translator.ts:155`）の出どころが、波 B で根の `fieldEntry.fieldFocusWantState` になる。名と型（真偽 1 つ）を保てば波 B は詰め方だけを変える |
| 4 | 段 6（`dom-screen-surface.ts`） | 波 B が面から受け取るのは次の 3 つの答えだけ。⛔ 形を変えるなら波 B の入口で知らせること: ① `hasUnsettledTextEntry(): boolean`（`:3060`、`IF-9`）② `readFieldCommit(): FieldCommit \| null`（`:3065`、1 度読むと消える —— `IF-9`）③ 配線の `focusPropertyField(row): boolean`（`:2710`、「焦点が入った、または置く欄が無い」で真）。面の閉包の 16 の覚えは 1 つも移らない。`DFC-545` の直しは段 6 のまま |

---

## 3. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A** | なし（いま当ててよい）。段 5・段 6 と並行してよい。⚠️ `CR-480` の番号を本線に宣言してから（冒頭の識別子） | `docs/spec/_source/state-machines.json`（領域 `fieldEntry` を足す —— 付録。ほかの領域には触らない）、生成物 `docs/spec/_assets/tbl-state-machines.md`（表 T-292 ・図 F-038）、`src/use-case/advance-screen-session/field-entry-values.ts`（新）、`advance-screen-session.ts`（根への合成、`RA-5`）、`docs/spec/05-07-design.md`（5.5 の 1 文、`CP-39`、`UT-11`、`PI-39`、`SU-3`、`UF-121`、図 F-028、`SS-6`）、`tests/contract/state-machine-field-entry.contract.test.ts`（新。**仕様だけを読む別の体** ——`RA-6`）、`tests/unit/uf-121-the-field-entry-transition-table-is-printed-from-the-manuscript.test.ts`、`.claude/skills/spec-graph-check/check-provenance.py` の 1 行（`:53` の `file-flow-values.ts` の次）、`tests/contract/units.contract.test.ts` の数（`:50`〜`:51`）、`docs/development-records/changelog.md` の版 0.29 の数、`docs/development-rules/03-implementation.md` の生成定数の一覧（`:47`〜`:48` の次） | 18 ・ 19 ・ 21 ・ 26b ・ 27 ・ 30 ・ 33 ・ 59 ・ 60 ・ 61 ・ 62 ＋ vitest（`CR-460` の 3 節と同じ組）。⚠️ 検査 11 ・ 12 ・ 33 は `FAIL` の行を出さずに赤くなる —— 出力の全体を当てる前の走りと比べる |
| **B** | 段 5 と段 6 が済み、`CR-436` の波 B2 が当たっている（根がシェルに結線され、`T-283` が在る）。`CR-440` の波 B1 ・ `CR-450` の波 B ・ `CR-460` の波 B と前後してよい | `frame-loop.ts`: `namingCreatedTaskUid` ・ `nameFieldWantedRow` を根の `fieldEntry` へ置き換える。`wantFieldFocused` の 7 か所の呼び手を `fieldFocusAsked` ／ `creationLanded` に、`endCreatedNamingIfChosenMoved` の 2 か所を `choiceMoved` に、`tryWantedFieldBeforeInput`（`:2297`〜`:2310`）と `focusWantedField` の選択・パネルの比べ（`:2283`〜`:2284`）を `fieldFocusWithdrawn` に、焦点が入った答えを `fieldFocusLanded` に。`nameFieldWantedUnder` は再試行の数だけのシェルの覚えに縮める。`isSettlingFieldCommit` は書き込みの時機を引数で渡して消す。`didSettleFieldEntry` は `receiveInput` の中の値にする。`addedRowOwedSight` は副作用 `bringCreatedRowIntoSight` を受けて持ち越す覚えとして残す。`settleTextEntry` の枝は 2.2 の 2 のとおり画面の値の出来事へ。**いまの振る舞いを写す詰め方**（決定 10）: 選択の変化・欄が描かれていない答え・焦点の継ぎ目が無いときにも `fieldFocusWithdrawn` を送る（第 8 節の候補 1）。`dom-screen-surface.ts` からは 2.2 の 4 の 3 つの答えだけを受ける —— 面のコードは変えない | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部（名前の入力と `Enter` の道 —— `FR-091` ・ `IN-5a` ・ `IN-5b` の e2e）、`LM-19`（⛔ **利用者を呼んでから**） |
| **C**（B の直後の別のコミット） | 波 B で一致を確かめた後（`JDG-57`） | 第 8 節の候補のうち、台帳で直すと決まったもの（`DFC-694` 候補 ・ `DFC-654`） | 同上 |

⭐ **波 A は段 5・段 6 と並行してよい** —— 触るのは `docs/spec/`、`src/use-case/advance-screen-session/`、新しい試験、規則と検査の名簿だけで、段 5（`src/adapter/input-command-translator/`）と段 6（`src/framework/dom-screen-surface/`）の持ち場と重ならない。
⭐ **本書の分で `frameLoop` の `let` は波 B で 66 → 62 の見込み**（`namingCreatedTaskUid` ・ `nameFieldWantedRow` ・ `isSettlingFieldCommit` ・ `didSettleFieldEntry` の 4 つが消え、`nameFieldWantedUnder` は再試行の数に縮んで残り、`addedRowOwedSight` は残る）。`CR-436` の波 B2 の分（12 を消して `let session` 1 つ）は別に数える。⛔ 波 B の入口で測り直す。
⚠️ **性能** —— この領域の出来事は押下・書き込みの着地・宿主の答え・選択の変化だけで、1 フレームの仕事は変わらない見込み。⚠️ ただし焦点を置き直すあいだはフレームごとに宿主へ問う（いまと同じ、`FIELD_FOCUS_RETRY_FRAMES` 回まで）。測るのは波 B、`LM-19` の手順。⛔ **測る前に利用者を呼ぶ。**

### 3.1 波 A の中身

| 対象 | いま | 案 |
|---|---|---|
| **原稿** `state-machines.json` | 領域 `screen` ・ `notices` ・ `gesture` ・ `fileFlow` | 領域 `fieldEntry` を足す（付録の JSON。出来事 5、機械 2、状態 4、升 9、根の升 1）。⛔ ほかの 4 領域は 1 字も変えない |
| **生成物** `_assets/tbl-state-machines.md` | 4 領域 | ＋ 節「名前付けと入力欄（`fieldEntry`）」: **表 T-292**、**図 F-038**。`npm run gen`（刷った形は付録 C —— 草案を生成器に通した結果） |
| **5.5 の散文**（`05-07-design.md:743` の次） | 第 1 〜 4 領域の 4 文 | 1 文を足す: 「第 5 領域（名前付けと入力欄）のそれらを同じファイルの 表 T-292 に、状態遷移を 図 F-038 に示す。」（⛔ 変更要求の番号を仕様に書かない —— 検査 7。「部品」を使わない） |
| 表 T-062 `CP-39`（`:144`） | 「… / 表 T-289 / 表 T-290」 | ＋「/ 表 T-292」 |
| 表 T-063 `UT-11`（`:337`） | 「（いまは `screen-values.ts` ／ `notice-values.ts` ／ `gesture-values.ts` ／ `file-flow-values.ts`）」 | ＋「／ `field-entry-values.ts`」と、表の番号の括弧に 表 T-292（`RA-4`） |
| 表 T-064 `PI-39`（`:542`） | 「画面の値・通知・身振り・ファイル操作と問いの 4 領域」 | 「… ・名前付けと入力欄の 5 領域」、出来事・副作用・初期の欄に 表 T-292（`RA-5`） |
| 表 T-284 `SS-6`（`:1109`） | 「表 T-280 ・ 表 T-286 ・ 表 T-289 ・ 表 T-290 の状態の一覧の初期」 | ＋「・ 表 T-292」 |
| 図 F-028 と前文（`:1047`〜） | 4 領域の実線 ＋「次の領域」の破線 | 実線の「領域 fieldEntry<br>名前付けと入力欄（表 T-292）」と「領域の合成（SF-8）」の 1 本を足す（`CR-460` と同じ） |
| 表 T-075 に `UF-121` | 86 行（上端 `UF-89`、`:459`） | `UF-121` ／ `AdvanceScreenSession` ／ `field-entry-values.ts` ／ `pure` ／ 「名前付けと入力欄の領域の遷移（表 T-292）と、そこから生成した型と遷移表の定数の区画」／ `—`（決定 11）。`UF-89` の後 |
| 表 T-074 `SU-3`（`:245`） | 86 | **当てる時の 表 T-075 の行の数**（いまなら 87。⚠️ 本線も 表 T-075 を動かす —— `handoff.md:47`「後から入れる側が合流した木で数え直す」） |
| `field-entry-values.ts` | 無い | 生成区画、`emptyFieldEntryValues`、`stepFieldEntryValues`（機械ごとの振り分けと根の升）。⛔ モジュールスコープの可変状態を置かない（検査 61、`SF-7`）。生成定数は `FIELD_ENTRY_VALUES_INITIAL_AXES` ・ `FIELD_ENTRY_VALUES_TRANSITIONS`（入れ子が無いので `_INITIAL_CHILDREN` は刷られない ——`CR-460` と同じ） |
| `advance-screen-session.ts` | `ScreenSession { screen; notices; gesture; fileFlow }`（`:39`〜`:44`） | ＋ `fieldEntry: FieldEntryValues`。`SessionEvent` ・ `SessionEffect` を 5 領域の和に、`emptyScreenSession` を広げ、`IS_FIELD_ENTRY_EVENT` を既存の形で足す。⚠️ 検査 60 の帯（50 行 / 15 分岐）に収める |
| **契約試験** `state-machine-field-entry.contract.test.ts` | 無い | 原稿の領域 `fieldEntry` を読み、(1) 各機械の各升目で先の種類が表と一致（`isCreatedTask` の真偽を両方作る）、(2) 空の升目は同じ参照と共有の空の列（`SD-3`）、(3) 2 つの機械の直交（2 × 2 の組）、(4) 根の升が副作用だけを返し状態を同じ参照に残すこと、(5) 根: この領域の出来事はほかの 4 領域を同じ参照のまま残す（`SS-5`）。⭐ 書くのは仕様だけを読む別の体（`RA-6`）。⭐ 継ぎ目（第 6 節）を両方のブリーフに同じ字面で書く |
| `changelog.md` の版 0.29（`docs/development-records/changelog.md:47`） | 「`AdvanceScreenSession`（6）」 | 「（7）」（検査 33） |

### 3.2 波 A の直前の測り直し（⛔ 当てる体が打つ）

1. 表と図の番号の上端、`T-292` ・ `F-038` ・ `UF-121` ・ `CR-480` がまだ使われていないこと、`CR-480` を本線に宣言したこと。
2. 出来事のキー 5 がほかの領域に無いこと、機械名 2 つが無いこと（生成器も拒むが、先に数える）。
3. 表 T-075 の行の数（`SU-3` に書く数）と、`requirement-owner-baseline.txt` の `unfilled=` が前後で同じこと（決定 11）。
4. 付録の根拠の行番号（`01-04-requirements.md` は並行して動く。動いていたら ID で引き直す）。

---

## 4. この結論を覆すもの

- **`AG-9` の「入力中」を宿主以外が答えると決まったとき**（`IF-9` が答える者を変えたとき）—— 決定 4 が崩れ、「入力中」が状態になる。そのときは焦点の出入りを出来事にする必要があり、置き場は本書の領域の 3 つ目の機械である。
- **`PND-352`（同じパネルの別の欄を押したとき焦点を外すか）が「外す」と裁定されたとき** —— 面の中の話のまま（段 6）で、本書の升は変わらない。
- **`FR-091` の場面を行にも広げる、または行を足したら名前付けを終えると決まったとき** —— 決定 9 の「それ以外 → —」が升 1 つに変わる。

---

## 5. 問いの候補に打った 3 つの反証（`handoff.md` §0.2）

方法: (1) `docs/development-records/rulings.md`（527 行、2026-09-21）を grep、(2) `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <行>`、(3) 仕様・計画・前の裁定・前の変更要求から導けるか。

| 候補 | (1) `rulings.md` | (2) `impact.py` | (3) 導けるか | 結果 |
|---|---|---|---|---|
| 名前付けを新しい領域にするか、画面の値の領域に機械を足すか | 「名前付け」0 件、「入力欄」0 件、`FR-091` 0 件、「作った直後」0 件 | `FR-091` → 要求 4 件 ／ 参照 8 | **導けた** —— 計画が別の領域に数える（`:242` ・ `:253`）。画面の値の `createdNameSettled` は呼び手が判じる入力の出来事（`CR-436` の `EV-18`）なので `{in: …}` の読みが要らず、画面の値の原稿を 1 字も変えずに済む | 決定 1 |
| 「入力中」（`AG-9`）を状態にするか | `AG-9` 0 件、`IF-9` 1 件（`JDG-68` —— 対話欄の打ちかけ。`IF-9` を正とした） | `AG-9` → 要求 1 件 ／ 参照 12、`IF-9` → 要求 1 件 ／ 参照 2 | **導けた（しない）** —— `IF-9`（des:563）が宿主に答えさせ、`JDG-68` が `IF-9` を正とした。焦点は出来事なしに動く（`frame-loop.ts:2907`） | 決定 4 |
| 焦点の求めを状態にするか | `IN-5a` ・ `IN-5b` ・「焦点」各 1 件（`JDG-175`、問 8 を提案どおり） | `IN-5b` → 要求 0 件 ／ 参照 0、`IN-5a` → 要求 2 件 ／ 参照 4 | **導けた** —— `IN-5a` の後の段が求めと取り下げを名指し、`JDG-175` が了承した（`rulings.md:294`） | 決定 3 |
| 再試行の上限（10 フレーム）を原稿や設定の行に載せるか | 0 件 | `IN-5b` → 要求 0 件 ／ 参照 0 | **導けた（載せない）** —— `IN-5b` は「入るか取り下げられるまで」と言い、上限を名指さない。上限はフレームを求めるかのシェルの規則（`frame-loop.ts:694`〜`:695` の WHY）。尽きた後の扱いは既存の `DFC-654` | 決定 3、第 8 節 |
| 選択が変わったら焦点の求めを消すか（コードは消す、`IN-5a` の事由に無い） | 0 件 | `IN-5a` → 要求 2 件 ／ 参照 4、`FR-072` → 要求 6 件 ／ 参照 15 | **導けた（本書では決めない）** —— 2026-09-13 の裁定どおり台帳へ。写すかは `JDG-57` の手順で波 B | 決定 7 ・ 10、第 8 節の候補 1 |
| `HF-17` の送りを機械の状態にするか | `HF-17` ・ `HF-14` 0 件 | `HF-17` → 要求 1 件 ／ 参照 5 | **導けた（しない）** —— 送るかは描いた行の箱（フレームの値）で決まり、次の 1 フレームで尽きる（`frame-loop.ts:2178`〜`:2181`）。`SF-6` の副作用 | 決定 6 |
| 文書名の欄（`FR-035`、`U-27`）が開いていることを状態にするか | `FR-035` 0 件 | `IF-9` → 要求 1 件 ／ 参照 2 | **導けた（しない）** —— `IF-9` はヘッダの文書名の欄を「編集できる欄」の 1 つとし、開いていることは「入力中」の真偽に畳まれる（`dom-screen-surface.ts:3061`）。開くのは焦点の求めの副作用（`focusPropertyField` の `U-27` の枝、`:2711`〜`:2715`） | 外（第 2 節の 9〜21） |
| `SK-19` の段の判じ方を本書の升にするか | `SK-19` 2 件（`JDG-78` ・ `JDG-153` の行の語の中 —— どちらも段の話ではない） | `SK-19` → 要求 5 件 ／ 参照 10 | **導けた（しない）** —— 画面の値の原稿が `createdNameSettled` ・ `settleKeyPressed` として既に持つ（`CR-436`）。本書は呼び手が読む状態を足すだけ | 2.2 の 2 |

⇒ **3 つとも空だった候補は 0 件。問いは無い。**

---

## 6. 継ぎ目（体に渡すときは両方のブリーフに同じ字面で書く）

- 領域のキー `fieldEntry`、名「名前付けと入力欄」、型の幹 `FieldEntryValues`、ファイル `field-entry-values.ts`、公開は `emptyFieldEntryValues` ・ `stepFieldEntryValues` と生成した型・定数（`FIELD_ENTRY_VALUES_INITIAL_AXES` ・ `FIELD_ENTRY_VALUES_TRANSITIONS`）。
- 機械 `createdTaskNamingStateMachine`（今の状態 `createdTaskNamingState`）: `idle` ・ `namingCreatedTask`（運ぶ値 `createdTaskUid`）。
- 機械 `fieldFocusWantStateMachine`（今の状態 `fieldFocusWantState`）: `idle` ・ `fieldFocusWanted`（運ぶ値 `fieldRow`）。
- 出来事（5）: `fieldEntry/fieldFocusAsked`（`fieldRow`）・ `creationLanded`（`created`）・ `fieldFocusLanded` ・ `fieldFocusWithdrawn` ・ `choiceMoved`。
- 副作用（1）: `bringCreatedRowIntoSight`（根の升。引数の行 ID は無く、足した行は出来事の `created` から）。
- ガード（1）: `isCreatedTask`。`{in: …}` は無い。
- 根: `ScreenSession { readonly screen; readonly notices; readonly gesture; readonly fileFlow; readonly fieldEntry: FieldEntryValues }`。根の運ぶ値は無い。

---

## 7. 数の予測

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行。
**起草時（`c8329fbf`、2026-09-21）: `tables=179  figures=23  rows=2225  uids=162`。**
⭐ 本書の差だけを突き合わせる（「前」は並行する変更で動く）。

**波 A**:

| | 差 | 内訳 |
|---|--:|---|
| tables | +1 | 表 T-292（`CR-460` の改訂の記録 10 で、表 T-290 が +1 だった） |
| figures | +1 | 図 F-038 |
| rows | +1 | `UF-121`。機械の升目・出来事は行 ID の形に当たらない見込み（`CR-460` で `UF-89` の +1 だけだった） |
| uids | 0 | 要求を足さない |

**波 B**: tables 0 ・ figures 0 ・ rows 0 ・ uids 0。
**そのほかの数**: 表 T-075 86 → 87、`units.contract.test.ts` 86 → 87、`changelog.md` の「（6）」→「（7）」、原稿は 5 領域 ・ 機械 20 ・ 状態 57 ・ 出来事 62 ・ 升 136 ＋ 根の升 6、`frameLoop` の `let` は波 B で本書の分 −4 の見込み。

---

## 8. 台帳の候補（⛔ 問いではない。どちらが正かを選ばない）

2026-09-13 の利用者の裁定（仕様とコードの食い違いは、どちらが正かを選ばずに台帳へ）に従い、台帳の体へ渡す。番号は書く直前に `docs/development-records/` の全ファイルを引いて決める（2026-09-21 の上端 `DFC-693`）。

| # | 食い違い | 片側 | もう片側 | 台帳の今 |
|---|---|---|---|---|
| 1 | **焦点の求めを、`IN-5a` の取り下げの 4 事由に無い 3 つの場合にもコードが消す** —— ① 選択（`selection` か `selectedGroupIds`）の同一性が変わった（`frame-loop.ts:2283`、`:2291`）② 宿主が「その行の欄が描かれていない」と答えた（`dom-screen-surface.ts:2707`〜`:2708` の TRAP、`:2724` —— `focusPropertyField` が真を返し、`frame-loop.ts:2285` の条件が外れて `:2291` で消す）③ 焦点の継ぎ目が無い（`focus?.(wanted)` が `undefined`、`:2285`）。⚠️ **未検証（画面で押していない。コードを読んだだけ）**。①は「パネルを閉じたとき」の広い読みとも読めるので、食い違いかどうかも台帳で判じる | `IN-5a` req:6807 の後の段（取り下げは「`IN-4` の `Esc`、欄の外の押し、パネルを閉じたとき、人が焦点を別の所へ動かしたとき」）、`IN-5b` req:6808（「焦点が入るか、求めが取り下げられるまで続けること（MUST）」） | `frame-loop.ts:2279`〜`:2292`、`dom-screen-surface.ts:2710`〜`:2725` | 0 件（`defects.md` ・ `pending-decisions.md` を「取り下げ」・`isChoiceKept`・`nameFieldWantedUnder` で引いた。`DFC-654` は再試行が尽きても**消さない**逆向きの話で別）⇒ 新しい行 **`DFC-694`** の候補。波 B の入口で読むこと |

⚠️ 既に在る関係の行（本書は直さない）: `DFC-654`（再試行が尽きても求めが残る ——`defects.md:192`、`未検討`。原稿は `IN-5b` どおり求めを残すので、この行の答えは波 C で `fieldFocusWithdrawn` を送る事由に足すか否か）、`DFC-651`（名前の欄に焦点が入る前の 1 文字 ——`defects.md:189`。状態は `実装待ち` のままだが、`2d7c0670` が置き直しを入れている。⚠️ **行の状態が古い疑い —— 未検証**）、`DFC-545`（面の「入力中」の答えが旗に頼る ——`:119`、段 6）、`PND-352`（別の欄を押したとき）、`PND-349`（入力中の `Ctrl` ＋ `A`）、`PND-350`（対話欄の打ちかけ）、`DFC-445` ・ `DFC-491`（`FR-001` の散文が `FR-091` ・ `FR-083` を引く形）。

---

## 9. 影響 —— 本書の外で動くもの

| 所 | 何が動くか | いつ |
|---|---|---|
| `CR-436` の波 B2 | 2.2 の申し送り 1 ・ 2 を入口で読む。⛔ 本書は `CR-436` の原稿も本文も書き換えない | 波 B2 の入口 |
| 段 5 ・ 段 6 | 2.2 の申し送り 3 ・ 4 | それぞれの割り方を決める時 |
| `docs/development-records/handoff-state-machine.md:104` | 次の領域の並びの先頭「名前付けと入力欄」を済みにする | 前に立つ者 |
| `docs/development-records/refactor-stage1-state-inventory-2026-09-13.md:207` | 領域の数（23）に `nameFieldWantedUnder` が無い（第 1 節） | 前に立つ者が判じる |
| `docs/development-records/defects.md` | 第 8 節の候補 1、`DFC-651` の状態の確かめ | 台帳の体 |
| `docs/review/components/components.md` と図 F-013 〜 F-017 | 見込み 0（`field-entry-values.ts` が読むのは `session-step.ts` だけの見込み）。当てる体は `EG-2` ・ `EG-3` で数える | 波 A |
| 本線のセッション | `CR-480` の番号の宣言（冒頭の識別子） | 波 A の前 |

---

## 10. ⛔ この変更でやらないこと

- ⛔ 波 A で `src/adapter` ・ `src/framework` に触らない（`dom-screen-surface.ts` は段 6 の持ち場、翻訳係は段 5 の持ち場）
- ⛔ 画面の値・通知・身振り・ファイル操作と問いの原稿を変えない。`T-283` を取らない
- ⛔ 「入力中」・DOM の焦点・`IME` の変換中・確定した値の書き置きを原稿に入れない
- ⛔ 新しい異常系・準正常系の扱いを設計しない（`JDG-78`）—— 再試行が尽きた後（`DFC-654`）も決めない
- ⛔ 第 8 節の候補を移す波で直さない（`JDG-57`）
- ⛔ 基準線を体に触らせない

---

## 付録 —— 第 5 領域「名前付けと入力欄」の原稿（新しい形）

**略記**: `req` ＝ `docs/spec/01-04-requirements.md`、`des` ＝ `docs/spec/05-07-design.md`、`prop` ＝ `docs/spec/_assets/tbl-property-items.md`、`glo` ＝ `docs/spec/_assets/tbl-glossary.md`、`erd` ＝ `docs/spec/_assets/fig-erd-detail.md`。行番号は `c8329fbf`。
根拠の行: `FR-001` req:1047、`TC-9` :1079、`FR-091` :1347、`HF-14` :1671、`HF-17` :1675、`FR-072` :1873、`FR-035` :2452、`MK-13` :3311、`SK-19` :4166、`FR-097` :5848、`AG-9` :6071、`IN-4` :6804、`IN-5a` :6807、`IN-5b` :6808 ／ `IF-9` des:563、`WS-2` des:658 ／ `PR-1` prop:31、`PR-16` prop:33、`PR-21` prop:50、`U-27` glo:112、`AT-53` erd:362。
升目の書き方: `→ 先 [ガード] / 副作用`。**`—` は変わらない ＝ 同じ参照**（`SD-3`）。

### A. 出来事（領域に 1 度だけ定義する）

| 出来事 | どこから来るか | 運ぶ値 | 動かすもの | 根拠 |
|---|---|---|---|---|
| `fieldEntry/fieldFocusAsked` | 入力: 欄に焦点を置くことを要求が名指した押下（名称・行名・担当・注記の本文・文書名） | `fieldRow`（`PR-1` ・ `AT-53` ・ `PR-16` ・ `PR-21` ・ `U-27`） | `fieldFocusWant` | `MK-13`、`FR-035`、`FR-097` |
| `fieldEntry/creationLanded` | 副作用の結果: 作る書き込みが着地し、作ったものが文書に在る | `created`（作ったタスクの UID か、足した行の ID） | 根 ・ `createdTaskNaming` ・ `fieldFocusWant` | `TC-9`、`FR-091`、`HF-14`、`HF-17` |
| `fieldEntry/fieldFocusLanded` | 副作用の結果: 描いたあとに置いた焦点が、求めた欄に入った（宿主の答え） | — | `fieldFocusWant` | `IN-5b` |
| `fieldEntry/fieldFocusWithdrawn` | 入力: `Esc`、欄の外の押し、パネルを閉じたこと、人が焦点を別の所へ動かしたこと（呼び手が決める） | — | `fieldFocusWant` | `IN-5a`、`IN-5b`、`IN-4` |
| `fieldEntry/choiceMoved` | ほかの領域: 選択（作ったものを選んだ変化は `creationLanded` が運ぶので送らない） | — | `createdTaskNaming` | `FR-091`、`FR-072` |

### B. 根 `fieldEntry`

運ぶ値: 無い。根拠: `FR-091`、`IN-5b`。

| 出来事 | 升 |
|---|---|
| `fieldEntry/creationLanded` | [not `isCreatedTask`] / `bringCreatedRowIntoSight`（足した行が描かれていないときだけ送る。描かれているかはシェルが次のレイアウトで判じる）（`HF-17`）<br>それ以外 → — |

### C.1 機械 `createdTaskNamingStateMachine` —— 作った直後の名前付けの場面（`FR-091`）

| 状態 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|
| `createdTaskNamingStateMachine.idle` | ○ | — | `FR-091`、`FR-072` |
| `createdTaskNamingStateMachine.namingCreatedTask` | | `createdTaskUid`（`TC-9`） | `FR-091`、`TC-9`、`FR-001` |

| 出来事 ＼ 状態 | `idle` | `namingCreatedTask` |
|---|---|---|
| `creationLanded` | → `namingCreatedTask` [`isCreatedTask`]（`FR-091`、`TC-9`）<br>それ以外 → — | → 同 [`isCreatedTask`]（`createdTaskUid` を書き換える）（`FR-091`、`TC-9`）<br>それ以外 → —（決定 9） |
| `choiceMoved` | — | → `idle`（`FR-091`、`FR-072`） |

この機械を動かさない出来事: `fieldFocusAsked` ・ `fieldFocusLanded` ・ `fieldFocusWithdrawn`。升 3。
⭐ **場面を `Enter` で閉じる升は無い** —— `Enter` は画面の値の `createdNameSettled` が受け、副作用 `clearSelection` の結果の選択の変化が `choiceMoved` として戻って場面を閉じる（いまの `:3896` の直の書き込みの置き換え）。

### C.2 機械 `fieldFocusWantStateMachine` —— 欄に焦点を置く求め（`IN-5a` の後の段・`IN-5b`）

| 状態 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|
| `fieldFocusWantStateMachine.idle` | ○ | — | `IN-5a`、`IN-5b` |
| `fieldFocusWantStateMachine.fieldFocusWanted` | | `fieldRow`（`PR-1` ・ `AT-53` ・ `PR-16` ・ `PR-21` ・ `U-27`） | `IN-5a`、`IN-5b`、`MK-13`、`HF-14`、`FR-091`、`FR-035` |

| 出来事 ＼ 状態 | `idle` | `fieldFocusWanted` |
|---|---|---|
| `fieldFocusAsked` | → `fieldFocusWanted`（`MK-13`、`FR-035`、`IN-5b`） | → 同（`fieldRow` を書き換える）（`MK-13`、`FR-035`、`IN-5b`） |
| `creationLanded` | → `fieldFocusWanted`（`fieldRow` はタスクなら `PR-1`、行なら `AT-53`）（`FR-091`、`HF-14`、`IN-5b`） | → 同（`fieldRow` を書き換える）（`FR-091`、`HF-14`、`IN-5b`） |
| `fieldFocusLanded` | — | → `idle`（`IN-5b`） |
| `fieldFocusWithdrawn` | — | → `idle`（`IN-5a`、`IN-5b`） |

この機械を動かさない出来事: `choiceMoved`（⚠️ いまのコードは選択の変化で求めを消す —— 第 8 節の候補 1。波 B の呼び手が `fieldFocusWithdrawn` で写す）。升 6。
⭐ **焦点を置くこと自体は升の副作用にしない** —— `IN-5b` の「次に描くときに置き直す」は、`fieldFocusWanted` にいるあいだシェルがフレームを描くたびに行う（状態を読んで描くのと同じ扱い）。置き直しの回数はシェルの覚え（第 2 節の 3）。

### D. 原稿の JSON（`regions` の末尾に足す。スクラッチの `n-field-entry-region.json` を生成器の `load()` に通して問題 0）

```json
{
 "region": "fieldEntry",
 "name": {"ja": "名前付けと入力欄"},
 "unit": "src/use-case/advance-screen-session/field-entry-values.ts",
 "typeStem": "FieldEntryValues",
 "table": {"id": "T-292", "caption": {"ja": "名前付けと入力欄の状態機械"}},
 "figure": {"id": "F-038", "caption": {"ja": "名前付けと入力欄の状態遷移"}},
 "root": {
  "carries": [],
  "evidence": ["FR-091", "IN-5b"],
  "transitions": {
   "creationLanded": {"guard": [{"name": "isCreatedTask", "not": true}], "effect": "bringCreatedRowIntoSight", "evidence": ["HF-17"], "note": {"ja": "足した行が描かれていないときだけ送る。描かれているかはシェルが次のレイアウトで判じる"}}
  }
 },
 "events": [
  {"key": "fieldFocusAsked", "source": {"kind": "input", "rows": ["MK-13", "FR-035", "FR-097"], "note": {"ja": "欄に焦点を置くことを要求が名指した押下（名称・行名・担当・注記の本文・文書名）"}}, "carries": [{"name": "fieldRow", "rows": ["PR-1", "AT-53", "PR-16", "PR-21", "U-27"]}]},
  {"key": "creationLanded", "source": {"kind": "effectResult", "rows": ["TC-9", "FR-091", "HF-14", "HF-17"], "note": {"ja": "作る書き込みが着地し、作ったものが文書に在る"}}, "carries": [{"name": "created", "note": {"ja": "作ったタスクの UID か、足した行の ID"}}]},
  {"key": "fieldFocusLanded", "source": {"kind": "effectResult", "rows": ["IN-5b"], "note": {"ja": "描いたあとに置いた焦点が、求めた欄に入った（宿主の答え）"}}, "carries": []},
  {"key": "fieldFocusWithdrawn", "source": {"kind": "input", "rows": ["IN-5a", "IN-5b", "IN-4"], "note": {"ja": "`Esc`、欄の外の押し、パネルを閉じたこと、人が焦点を別の所へ動かしたこと。呼び手が決める"}}, "carries": []},
  {"key": "choiceMoved", "source": {"kind": "otherRegion", "rows": ["FR-091", "FR-072"], "note": {"ja": "選択。作ったものを選んだ変化は `creationLanded` が運ぶので送らない"}}, "carries": []}
 ],
 "machines": [
  {
   "name": "createdTaskNamingStateMachine",
   "states": [
    {"key": "idle", "parent": null, "initial": true, "carries": [], "evidence": ["FR-091", "FR-072"]},
    {"key": "namingCreatedTask", "parent": null, "initial": false, "carries": [{"name": "createdTaskUid", "rows": ["TC-9"]}], "evidence": ["FR-091", "TC-9", "FR-001"]}
   ],
   "transitions": {
    "creationLanded": {
     "idle": {"to": "namingCreatedTask", "guard": [{"name": "isCreatedTask"}], "evidence": ["FR-091", "TC-9"]},
     "namingCreatedTask": {"to": "namingCreatedTask", "guard": [{"name": "isCreatedTask"}], "evidence": ["FR-091", "TC-9"], "note": {"ja": "`createdTaskUid` を書き換える"}}
    },
    "choiceMoved": {
     "namingCreatedTask": {"to": "idle", "evidence": ["FR-091", "FR-072"]}
    }
   }
  },
  {
   "name": "fieldFocusWantStateMachine",
   "states": [
    {"key": "idle", "parent": null, "initial": true, "carries": [], "evidence": ["IN-5a", "IN-5b"]},
    {"key": "fieldFocusWanted", "parent": null, "initial": false, "carries": [{"name": "fieldRow", "rows": ["PR-1", "AT-53", "PR-16", "PR-21", "U-27"]}], "evidence": ["IN-5a", "IN-5b", "MK-13", "HF-14", "FR-091", "FR-035"]}
   ],
   "transitions": {
    "fieldFocusAsked": {
     "idle": {"to": "fieldFocusWanted", "evidence": ["MK-13", "FR-035", "IN-5b"]},
     "fieldFocusWanted": {"to": "fieldFocusWanted", "evidence": ["MK-13", "FR-035", "IN-5b"], "note": {"ja": "`fieldRow` を書き換える"}}
    },
    "creationLanded": {
     "idle": {"to": "fieldFocusWanted", "evidence": ["FR-091", "HF-14", "IN-5b"], "note": {"ja": "`fieldRow` はタスクなら `PR-1`、行なら `AT-53`"}},
     "fieldFocusWanted": {"to": "fieldFocusWanted", "evidence": ["FR-091", "HF-14", "IN-5b"], "note": {"ja": "`fieldRow` を書き換える"}}
    },
    "fieldFocusLanded": {
     "fieldFocusWanted": {"to": "idle", "evidence": ["IN-5b"]}
    },
    "fieldFocusWithdrawn": {
     "fieldFocusWanted": {"to": "idle", "evidence": ["IN-5a", "IN-5b"]}
    }
   }
  }
 ]
}
```

### E. 運ぶ値と副作用の型（コードが決める。原稿は名前だけ —— 表 T-250 の `SD-1` ・ `SD-2`）

| 名 | 型の見込み | 置き場 |
|---|---|---|
| `createdTaskUid` | `number`（いまの `namingCreatedTaskUid` と同じ） | `field-entry-values.ts` |
| `fieldRow` | `string`（いまの `nameFieldWantedRow` と同じ。値は `frame-loop.ts:684`〜`:692` の 5 つの定数） | 同上 |
| `created` | `{ kind: 'task'; uid: number } \| { kind: 'row'; groupId: string }`（いまの `InputAction` の `created` と同じ形の写し ——`frame-loop.ts:4061`〜`:4063`）。⚠️ `UseCase` は `Adapter` の型を読めない（表 T-061）ので同じ形の型を領域に置く（`CR-460` の付録 E と同じ移行） | 同上 |
| 副作用 `bringCreatedRowIntoSight` | `{ type: 'bringCreatedRowIntoSight'; groupId: string }` | 同上 |

## 改訂の記録

| # | 日付 | 何を変えたか | 理由 |
|---|---|---|---|
| 1 | 2026-09-21 | 起草（`c8329fbf`） | —— |
| 2 | 2026-09-21 | 波 A を当てた（`c8329fbf` の上、ブランチ `sm-naming-a`）。原稿に領域 `fieldEntry`（付録 D の JSON のまま。出来事 5、機械 2、状態 4、升 9、根の升 1）を足した。生成物に 表 T-292 ・ 図 F-038。`field-entry-values.ts`（`UF-121`）と根の合成（`advance-screen-session.ts`。ほかの 4 領域は同じ参照のまま）。`05-07-design.md` の `CP-39` ・ `SU-3`（86 → 87）・ `UT-11` ・ 表 T-075 の `UF-121` ・ `PI-39` ・ 5.5 の 1 文 ・ 図 F-028 ・ `SS-6`。`units.contract.test.ts` ・ `changelog.md` の版 0.29 ・ `check-provenance.py` ・ `03-implementation.md` の生成定数 2 つ ・ 生成器の説明文。⚠️ `CR-480` の番号は、前に立つ者の依頼が配った帯のまま使った —— 本線への宣言（冒頭の識別子）は当てた体の持ち物ではなく、確かめていない | 第 3.1 節 |
| 3 | 2026-09-21 | 運ぶ値 `fieldRow` の型を、付録 E の見込み `string` ではなく、原稿が挙げる 5 つの行の和 `FieldEntryFieldRow`（`'PR-1' \| 'AT-53' \| 'PR-16' \| 'PR-21' \| 'U-27'`）とした。`created` は付録 E と同じ形の `FieldEntryCreated` だが、2 つの名のある型の和 `FieldEntryCreatedTask`（`kind: 'task'`、`uid: number`）\| `FieldEntryCreatedRow`（`kind: 'row'`、`groupId: string`）として書いた —— 付録 E の字面のまま和を 1 行で書くと、翻訳係の同じ型（`input-command-translator.ts:199`）と同じ式になり、検査 45 が 86 → 88 と赤くなった（もう 1 つは `combined` の 1 行が `gesture-values.ts:303` と同じだったので書き換えた）。`createdTaskUid` は `number` | 原稿の `fieldRow` は 5 つの行を名指す（付録 D）。いまのシェルの 5 つの定数（`frame-loop.ts:684`〜`:692`）も同じ 5 つである。波 B で呼び手が `string` を渡すなら狭める |
| 4 | 2026-09-21 | 副作用 `bringCreatedRowIntoSight` は `{ groupId: string }` を運ぶ（付録 E どおり）。第 6 節の「引数の行 ID は無く」は、原稿の升に `effectArgument` が無いことと読んだ —— 行 ID は出来事の `created` から写す | 第 6 節と付録 E の書き方の差を、両方が成り立つ形で読んだ |
| 5 | 2026-09-21 | 「→ 自己（書き換える）」の升で、運ぶ値がいまの値と同じとき（同じ `fieldRow` の `fieldFocusAsked`、同じ UID の `creationLanded`、同じ行の `creationLanded` の `fieldFocusWantStateMachine`）は、その機械を同じ参照のまま返す | `SF-3`（何も変わらないときは受け取った参照を返す）。値の変わらない書き換えは変化ではない（`CR-460` の改訂の記録の 5 と同じ筋） |
| 6 | 2026-09-21 | 仕様だけを読む契約試験 `tests/contract/state-machine-field-entry.contract.test.ts` は書かなかった。生成器の単体試験 `tests/unit/uf-121-the-field-entry-transition-table-is-printed-from-the-manuscript.test.ts`（升の並びと、ガードの付いた升の「それ以外 → —」）を足した | `RA-6`。当てた後に別の体が書く |
| 7 | 2026-09-21 | 第 8 節の候補 1 を `defects.md` に `DFC-694` として書いた（どちらが正かは選ばない。状態 `未検討`） | 本巡の依頼が当てる体に書かせた。番号は当てる直前に `docs/development-records/` の全ファイル（`fixed-defects.md` を含む）を引いて決めた |
| 8 | 2026-09-21 | 第 7 節の予測を測った: md-checks は `tables=179 figures=23 rows=2225 uids=162` → `tables=180 figures=24 rows=2226 uids=162`。原稿は 5 領域 ・ 機械 20 ・ 状態 57 ・ 出来事 62 ・ 升 136 ＋ 根の升 6。表 T-075 は 86 → 87、`units.contract.test.ts` も 87、`changelog.md` の版 0.29 は「（6）」→「（7）」 | 予測どおり |
| 9 | 2026-09-21 | 第 9 節の `handoff-state-machine.md` の第 3 節に ✅ の 1 行（と注 1 行）を足し、次の領域の順から「名前付けと入力欄」を落とした。同じ節の図の帯の注「F-036 まで使用」を「F-038 まで使用。F-037 は CR-470 が返した」に直した。`refactor-stage1-state-inventory-2026-09-13.md` は書かなかった | 本巡の依頼が handoff の 1 行を当てる体に書かせた。棚卸しの記録は前に立つ者の持ち物（第 9 節） |
