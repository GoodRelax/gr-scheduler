# CR-520 — 操作の記録を状態機械へ移す（段 7 の第 7 領域 `interactionRecord`）

> ⭐ **状態: 波 A を当てた（2026-09-22、`fe725d98` の上の作業木 —— ブランチ `claude/lucid-hodgkin-40a9a7`、コミットは前に立つ者が打つ）。波 B ・ 波 C は当てていない。**
> ⭐ 当てた体が草案から変えたところは、末尾の改訂の記録の 2 以降に並べた。第 0 〜 10 節と付録は草案の文のまま残し、行番号と数だけを測り直した —— 当てた形の全数は 表 T-295 が持つ。
> 起草は `9b8a22b7`（2026-09-21）を読んだ。**本書の行番号と数は、断りが無いかぎり、`fe725d98`（`CR-510` の波 A の着地）の上に本書の波 A を当てた作業木で 2026-09-22 に測り直したものである。** `src/framework/single-html-shell/frame-loop.ts` は本書が `effectRunnersOf` の `:1452` ・ `:1453` に 2 行（と空行 1）を足したので、`:1451` より後の行は `fe725d98` より 3 行下にある。草案の後に `CR-436` の波 B1 ・ B2、`CR-439` の段 6 の分割、`CR-510` などが入り、`frame-loop.ts` の行は約 170 行ずれた。
> 型板は `CR-490`（新しい小さな領域を立てた変更要求、第 11 節が本書の出どころ）・`CR-510`（草案を測り直して当てた形）・`CR-470`（「機械を立てない」と結ぶ判断の形 —— 本書はその形の問いを 3 つの覚えに当てた）。名前の規則は `docs/development-rules/07-review-standards.md` の「状態機械（State Machine）」の節（`:296`〜）と R4.4（`:605`）。
>
> **結論（先に書く）: 小さな領域 `interactionRecord`「操作の記録」を 1 つ立てる —— 状態機械 1 つ（`interactionRecordingStateMachine`）・状態 2（`notRecording` ／ `recordingInteractions`）・出来事 1（`interactionRecordToggled`）・升 2 ・根の升 0 ・副作用 2（`beginInteractionRecord` ・ `handInteractionRecordToClipboard`）・ガード 0 ・運ぶ値 0。**
> ⭐ **記録の中身（行の列・申し出た件数・捨てた件数・始めた時刻）は機械にも根にも入れない。** シェルが持つ「記録の溜め」—— 副作用の行き先 —— のまま残す（決定 3）。⚠️ **`CR-490` の 11.1 の 4 行目が「運ぶ値」と見立てたところを、本書は測り直して覆す**（行 1 つごとに出来事が要り、`SF-5` と `GL-003` に反する）。
> ⭐ **升はどこも今日のコードを写す**（`JDG-57`）。仕様とコードが食い違う所（最小化・非表示のあいだ記録しているかが読めない、クリップボードへ渡せなかったことを告げない）は原稿に入れず、台帳の候補とする（第 8 節）。
>
> **閉じるもの**:
> - 計画の記録 4 の移す順の 6 番目の 3 つ目「操作の記録」（`docs/development-records/refactor-plan-report-2026-09-13.md:253`、領域の例は `:244`）。
> - 棚卸しの「操作の記録 4 ／ 4 ／ 5」（`docs/development-records/refactor-stage1-state-inventory-2026-09-13.md:209`、行 `:56`〜`:59` ・ `:106`）の行き先。
> - `CR-490` の 11.1 の 3 行目 ・ 4 行目（`change-request/CR-490-selection-moves-into-the-state-machine.md:271` ・ `:272`）、11.3 の「記録している」（`:303`）、11.7 の 2 行目（`:416`）。
> - `docs/development-records/handoff-state-machine.md:122` の「次の領域」のうち操作の記録（起草時は `:115`。書き換えは前に立つ者 —— 第 9 節）。
>
> **識別子**（規則 02 の 2.5。起草時に `9b8a22b7` で測り、当てる直前の 2026-09-22 に `fe725d98` で測り直した —— `git grep -lw <名> -- docs change-request src tests tools .claude`）:
> - 依頼が配った番号: **変更要求 `CR-520`、表 `T-295`、図 `F-041`、ユニット `UF-124`**。当てる直前、`T-295` ・ `F-041` ・ `UF-124` の字面は木に 0 件、`CR-520` は `docs/development-records/rulings.md` と `handoff.md:50` の登録簿（状態機械の帯 `CR-510・520・530`）だけだった。`CR-510` が使わずに返した 表 `T-294` ・ 図 `F-040` は本書も取らない（`CR-530` ほかの並行する変更要求のために残す）。
> - 新しい名の重なり（同じ 6 か所、当てる直前）: `interactionRecordingStateMachine` ・ `interactionRecordingState` ・ `InteractionRecordingState` ・ `interactionRecordToggled` ・ `notRecording` ・ `recordingInteractions` ・ `beginInteractionRecord` ・ `handInteractionRecordToClipboard` ・ `InteractionRecordValues` ・ `interaction-record-values` ・ `emptyInteractionRecordValues` ・ `stepInteractionRecordValues` は 0 件だった。⚠️ **領域のキー `interactionRecord` は、コードの 2 つの字面と同じである** —— `frame-loop.ts:2014` の記録の溜め（`const interactionRecord: string[]`）と、`src/adapter/input-command-translator/input-command-translator.ts:704` の入口の表のキー（`interactionRecord: 'IC-76'`）。どちらも別の名前空間なので型は割れない（`npm run typecheck` は既知の 8 件だけ）が、波 B で根の `session.interactionRecord` と溜めが同じ閉包に並ぶ ⇒ 波 B で溜めを改名する（第 4.2 節の ⑤）。
> - 台帳の上端（`docs/development-records/` の全ファイル）: 起草時（2026-09-21）は `DFC-702`、`PND-500`、`JDG-290`。当てる直前（2026-09-22、`fe725d98`）は `DFC-784`、`PND-530`、`JDG-366`。⇒ 第 8 節の候補は仮の名（候補 1 ・ 2）で呼び、番号は台帳に書く者が書く直前に引く。
> - 行 ID の接頭辞と要求 ID は立てない。状態・出来事・遷移に通し番号を振らない（`JDG-286`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **波 A はどの `CH-` も直接には前へ進めない —— 基盤の作業である。** 利用者に見える振る舞いを 1 つも変えない —— 波 A ではシェルがこの領域の出来事を 1 つも作らない（`git grep -n interactionRecordToggled -- src` は `interaction-record-values.ts` と `advance-screen-session.ts` だけ、2026-09-22）。シェルの副作用の表（`effectRunnersOf`）は新しい 2 つの副作用を `unwiredEffect` に向けるだけである（`frame-loop.ts:1452` ・ `:1453`）。波 B（結線）も振る舞いを変えない（`JDG-57`、`rulings.md:134`）。

守るもの:
- **`FR-102`（req:4662〜）** —— 「同じ入口で止めること」（req:4665）、「いま記録しているかどうかが画面上で読めること（MUST）」（req:4666）、「止めたとき、その記録をクリップボードへ渡すこと（MUST）」（req:4667）、「記録を文書に保存してはならない（MUST NOT）」（req:4671）、「上限に達したときは古いほうから捨て、捨てた件数を記録の頭に書くこと（MUST）」（req:4672）。
- **`S-206`（set:393）** —— 既定 `false`、`Esc` では止まらない（`S-99g` の面ではない）。**`S-207`（set:394）** —— 上限 2000。
- **`GL-003`（`FR-102` の親）** —— この領域の出来事は `IC-76` を押して離したときの 1 つだけで、ポインタの移動でもフレームでも 1 つも作らない（表 T-249 の `SF-5`、des:1045）。記録の行は移動とフレームのたびに増えるので、行を機械に入れないことがこの上限を守る（決定 3）。性能は `LM-19`。⛔ **測る前に利用者を呼ぶ**（`RISK-001` の門）。

### ② レビュー観点のどの条項を当て、何が出たか

- **R4 「状態機械」の節 ／ R4.4** —— 機械は名詞句 ＋ `StateMachine`（`interactionRecordingStateMachine` ——「操作を記録していること」を追う）、今の状態は `interactionRecordingState` ／ 型 `InteractionRecordingState`。状態は `notRecording`（`not` ＋ 現在分詞 —— 既存の `notArmed` ・ `notPressed` ・ `notAsked` ・ `notGrabbed` と同じ形）と `recordingInteractions`（現在分詞 ＋ 目的語 —— 節の表の「進行中の活動」の形。`interactionsRecording` の語順は同じ表が禁じる）。出来事は主語 ＋ 過去形（`interactionRecordToggled` —— 同じ形の入口のトグルの前例は画面の値の `paletteMinimiseToggled`（`IC-75`）・`milestoneListToggled`（`IC-50`））。副作用は動詞 ＋ 目的語（`beginInteractionRecord` ・ `handInteractionRecordToClipboard`）。ガード 0。既存の 77 のキーと重なり 0（生成器の `load()` の問題 0 —— `npm run gen` が通った）。
- **5.5 の原稿の規則**（des:755「原稿に載せるのは、要求が名指す状態・出来事・遷移だけとする（MUST）」）—— `FR-102` が「いま記録しているかどうか」を、`S-206` が「操作と描画を記録しているか」を名指す。行の数・捨てた数・始めた時刻を名指す要求の状態は無い（棚卸しも「実装の都合」とした —— 棚卸し `:57`〜`:59`）。
- **`SF-5`（des:1045）** —— 始めた時刻は「時刻」でフレームの値。記録の行・申し出た件数・捨てた件数は、ポインタの移動（`recordHappening`、`receiveInput` の `frame-loop.ts:4306` から）とフレーム（`recordFrame`、`runFrame` の `:2400` ・ `:2442` から）のたびに変わる ⇒ 機械に入れると移動ごと・フレームごとに出来事が要る。`SF-5` の「出来事は、押す・掴む・問いに答える、および指しているパーツや当たりが変わったときだけ作る」に反する（決定 3）。
- **`SF-6`（des:1046）** —— 溜めを空にして時刻を取ること、記録をクリップボードへ渡すことは副作用として値で返し、シェルが実行する。
- **`SF-7`（des:1047）** —— 新しいモジュールスコープの可変状態を置かない（検査 61 —— 当てた後も「2 flagged」のまま、前と同じ）。
- **`SF-8`（des:1048）** —— 別の領域なので、ほかのすべての機械と自ずから直交する。
- **生成器の規則**（`docs/spec/_source/state_machines_json_to_md.py` —— 1 つの出来事のキーを 2 つの領域に置けない）⇒ キーに領域の語を入れた（`interactionRecordToggled`）。

### ③ 利用者に問うこと・**問わずに決めた**こと

**問うこと**: ⭐ **なし（0 件）。** 候補 7 つに打った 3 つの反証は第 7 節に残した。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | **状態機械を持つ。** 「記録していない ／ 記録している」は要求が名指す離散の状態であり、フレームの値にも文書にもならない | `FR-102` req:4666「いま記録しているかどうか」、`S-206` set:393「記録しているか」。`CR-470` の問い（連続値か・毎回導けるか・文書か）を当てた: 連続しない、前の値に依る（`IC-76` を押した回数の偶奇 —— 毎回は導けない）、文書に保存してはならない（req:4671）。同じ性質の `S-200`（最小化）と `S-142`（マイルストーンの一覧）は既に機械が持つ（`paletteDisplayStateMachine.shown.minimised`、`milestoneListDisplayStateMachine`）。`CR-490` の 11.3（`:303`）も「新しい機械」とした |
| 決定 2 | **新しい領域 `interactionRecord`「操作の記録」に置く。** 画面の値の領域に機械を足さない | 計画が別の領域に数え（`refactor-plan-report-2026-09-13.md:244`、移す順 `:253`）、`CR-490` の 11.7 の 2 行目（`:416`）と `handoff-state-machine.md:122` も新しい領域とする。この領域の副作用 2 つは記録の溜めとクリップボードだけに向き、変わる理由は `FR-102` ただ 1 つ —— 画面の値（表 T-280）の変わる理由と別である（`SF-8`、`R2.2`）。画面の値の原稿・表 T-280 ・ 図 F-026 と画面の値の契約試験に波が及ばない。⚠️ 代償は根の合成の手間（表 T-285 の 8 段）。比べた 3 案は下の表 |
| 決定 3 | **記録の中身 —— 行の列 `interactionRecord`・申し出た件数 `interactionRecordOffered`・捨てた件数 `interactionRecordDropped`・始めた時刻 `interactionRecordBeganAt` —— は機械にも根にも入れず、シェルの「記録の溜め」に残す（外 —— 副作用の行き先）** | 行はポインタの移動（`:4306` → `recordHappening` `:2194`〜）・フレーム（`:2400` ・ `:2442` → `recordFrame` `:2216`〜）のたびに足される ⇒ 運ぶ値にすると行ごとに出来事が要る（`SF-5`、`GL-003`）。どの升も中身を読まない（ガード 0）。始めた時刻は `SF-5` の「時刻」。捨てた件数は `FR-102`（req:4672）が名指すが、それは**記録の頭に書く中身**としてであり、状態としてではない。⚠️ `interactionRecordOffered` は「申し出た」状態ではなく、記録へ申し出た行の通し番号（`:2168` ・ `:2170`）である ⇒ 「申し出た」状態は立てない（要求も名指さない）。⚠️ **`CR-490` の 11.1 の 4 行目（`:272`「運ぶ値（3 の `recording` 状態か根）」）を覆す** —— 同書の 11.1 は行き先の見立てであって、書き手と読み手の頻度を測っていなかった |
| 決定 4 | **出来事は 1 つ（`interactionRecordToggled`）。開始と停止に分けない** | `FR-102` req:4665 ・ `IC-76`（glo:603）「同じ入口で止める」、理由の文（req:4679「入口を 1 つのトグルにする」）。今日のコードも 1 つの関数 `turnInteractionRecord`（`:2262`〜`:2281`）が今の状態で分かれる。前例 `paletteMinimiseToggled` ・ `milestoneListToggled` |
| 決定 5 | **初期の状態は `notRecording`。`S-206` から読み込まない（保存も復元もしない）** | `S-206` は表 T-206 の本体（`localStorage` に置く「別枠」ではない —— 別枠の行は理由の欄に「別枠」と書く。`S-99e` set:387 ほか）⇒ 保存も復元もしない。既定 `false` は表 T-250 の `SD-1` のとおり状態の根拠に `S-206` を指すだけで持つ |
| 決定 6 | **副作用 2 つ: 始めるとき `beginInteractionRecord`、止めるとき `handInteractionRecordToClipboard`** | `SF-6`。今日の本体 `:2264`〜`:2269`（溜めを空にし、時刻を取り、旗を立て、始めた行を書く）と `:2272`〜`:2280`（止めた行を書き、文を組み、旗を倒し、溜めを空にし、クリップボードへ渡す）。⚠️ 状態は副作用より先に変わるので、止めた行は旗の門（`recordLine` の `:2167`）を通さず溜めへ直に書くこと（第 4.2 節）—— 行の通し番号と中身が今日と一致する |
| 決定 7 | **クリップボードへの書き込みの結果を出来事にしない** | 今日のコードは結果を読まない（`:2280` の `void writeClipboard(...)`）。`JDG-57`。ほかの 2 つの書き込みは失敗で `RS-15` を立てる（`:3735`〜`:3736` ・ `:4010`〜`:4015`）—— 食い違いは第 8 節の候補 2。直すと決まったら、そのとき結果の出来事を足す |
| 決定 8 | **上限 `S-207` はシェルの生成した定数のまま**（`NOT_STORED_INTERACTION_RECORD_LIMITS`、`frame-loop.ts:4609`〜`:4613`） | 溜めと同じ所で読む。原稿は既定値と上下限を持たない（表 T-250 の `SD-1`） |
| 決定 9 | **表 T-075 の新しい行 `UF-124` の「負う要求」は `—`** | `CR-440` ・ `CR-450` ・ `CR-460` ・ `CR-480` ・ `CR-490` と同じ。波 A では画面がこのユニットを呼ばない。`FR-102` は今も `frame-loop.ts`（`UF-48`）が負う |
| 決定 10 | 識別子: 表 `T-295`、図 `F-041`、`UF-124`、ファイル `interaction-record-values.ts`、型の幹 `InteractionRecordValues` | 依頼の番号 |

**決定 1 ・ 2 で比べた 3 案**:

| 案 | 形 | 得るもの | 代償 | 判断 |
|---|---|---|---|---|
| 機械を立てない（`CR-470` の形） | 旗をシェルの `let` のまま残す | 手間 0 | 要求が名指す状態が原稿の外に残る（5.5 の規則の反対側）。`S-200` ・ `S-142` と扱いが割れる | 退けた |
| 画面の値に機械を足す | `screen` に `interactionRecordingStateMachine` を足す（`milestoneListDisplayStateMachine` の隣） | 領域を足す手間（表 T-285）が無い | 画面の値の原稿・表 T-280 ・ 図 F-026 ・ 契約試験を書き換える。変わる理由の違う機械が 1 つの領域に入る | 退けた（覆してよい） |
| **新しい領域** | `interactionRecord` に機械 1 | 計画と `CR-490` の 11.7 のとおり。ほかの領域の原稿を 1 字も変えない | 根の合成の手間（`RA-1`〜`RA-8`） | **採った** |

---

## 1. 測った事実（2026-09-22 に測り直した。起草時の値は `9b8a22b7`、2026-09-21）

| 数 | 値 | 測り方 |
|---|---|---|
| `frameLoop` の範囲 | 1967〜4565 行（ファイルは 4643 行 —— 本書の 3 行を含む）。起草時は 1799〜4414 行 ／ 4492 行 | `grep -nE "^(export )?(async )?function frameLoop"` と、その後の最初の `^}` |
| `frameLoop` が直に持つ `let` | 57（うちこの領域 4: `:2013` ・ `:2015` ・ `:2016` ・ `:2017`）。ほかに中身を書き換える `const` 1（`:2014`）。起草時は 66 | `sed -n '1967,4565p' … \| grep -c "^  let "` |
| 棚卸しとの差 | 棚卸しは 4 ＋ 書き換える `const` 1（`refactor-stage1-state-inventory-2026-09-13.md:209`、`:106`）。差 0 | 名前で照合 |
| 旗の書き手 | 2: `turnInteractionRecord` の `:2268`（立てる）・ `:2274`（倒す） | `grep -n "isRecordingInteractions" src/framework/single-html-shell/frame-loop.ts` |
| 旗の読み手 | シェル 6: `recordLine`:2167、`recordHappening`:2195、`recordFrame`:2217、`turnInteractionRecord`:2263、`runFrame` の写し:2425（→ `ScreenViewReadingsTaken.isRecordingInteractions`:1204）、`exportScene` の写し:2777（常に `false`）。描き手 1: `command-palette.ts:245`〜`:246`（→ `:275` ・ `:287` → `commandItemFor` の `isPressed`:131〜132）。型 1: `screen-renderer.ts:409`（`ScreenViewReadings.isRecordingInteractions?`）。⚠️ 起草時の `SessionHeld` の道は `CR-436` の波 B2 で読みの束（`ScreenViewReadingsTaken`）へ移った | `grep -rn "isRecordingInteractions" src` |
| 入口の道 | `IC-76` を離すと `entrySettledOnRelease`（`:1667`）→ `answerSettledEntry`（`:3722`〜、`INTERACTION_RECORD_ENTRY` の枝 `:3751`〜`:3754`）が `turnInteractionRecord` を呼んで `true` を返す。翻訳係の `toggleInteractionRecord`（`input-command-translator.ts:265` ・ `:1081`〜`:1082`）は、`frame-loop.ts` にその種類の `case` が無く、今日どこにも届かない | 読んだ。`grep -rn toggleInteractionRecord src` は 2 件 |
| 記録している印 | `IC-76` の入口を押されている形に描く（`command-palette.ts:131`〜`:132`）だけ。パレットを出していないとき（`:259`）と最小化しているとき（`:279` —— 入口の並びが空）は描かれない | 読んだ |
| 原稿の前 | 6 領域 ・ 機械 22 ・ 状態 62 ・ 出来事 77 ・ 升 156 ＋ 根の升 10（`CR-510` の波 A が機械 1 ・ 状態 2 ・ 出来事 3 ・ 升 6 を足した後） | スクラッチの `r2-apply.py`（升は機械 × 出来事 × 状態の組の数）。起草時は 6 ・ 21 ・ 60 ・ 74 ・ 150 ＋ 10 |
| 原稿の後 | `load()` の問題 0（`npm run gen` が通った）。7 領域 ・ 機械 23 ・ 状態 64 ・ 出来事 78 ・ 升 158 ＋ 根の升 10 —— 本書の差は 領域 +1 ・ 機械 +1 ・ 状態 +2 ・ 出来事 +1 ・ 升 +2 ・ 根 0（起草時の予測と同じ差） | 同上 |
| 刷った生成物 | `tbl-state-machines.md` の末尾に節「操作の記録（`interactionRecord`）」—— 表 T-295 ・ 図 F-041（51 行増えた。ほかの節の差 0）。型の生成区画は起草時に刷った `r-printed-types.ts` と同じ形 | `git diff --stat docs/spec/_assets/tbl-state-machines.md` |
| md-checks の最終行 | 前 `tables=182  figures=25  rows=2256  uids=162` → 後 `tables=183  figures=26  rows=2257  uids=162` | 第 6 節 |
| 表 T-075 | 112 行 → 113 行（上端の番号は `UF-123` → `UF-124`）。`SU-3` と `units.contract.test.ts` も 112 → 113 | `grep -c "^\| UF-" docs/spec/05-07-design.md` |

---

## 2. 棚卸しの測り直しと分類

分類は `SF-5`（des:1045）、`SF-6`（des:1046）、`SF-10` と 5.5 の原稿の規則（des:755）を当てた。
**状態** ＝ 原稿の機械の状態。**運ぶ値** ＝ 状態か根の運ぶ値。**フレームの値** ＝ シェルに残る座標・寸法・時刻と、そこから毎回導ける値。**外** ＝ この領域の状態ではない（行き先を書く）。

| # | 覚え | 所在 | 書き手 ／ 読み手 | 分類 | 名指す仕様の行 |
|---|---|---|---|---|---|
| 1 | `isRecordingInteractions` | `frame-loop.ts:2013` | 書き 2（`:2268` ・ `:2274`）。読み 6 ＋ 描き手 1（第 1 節） | **状態** `interactionRecordingStateMachine.notRecording` ／ `recordingInteractions` | `FR-102` req:4666、`S-206` set:393、`IC-76` glo:603 |
| 2 | `interactionRecord`（中身を書き換える `const`） | `:2014` | 書き: `recordLine`:2170（push）・ :2172（shift）、`turnInteractionRecord`:2264 ・ :2275（空に）。読み: `recordLine`:2171、`interactionRecordText`:2252 ・ :2257 | **外** —— 記録の溜め（副作用の行き先）。行はポインタの移動とフレームのたびに増える | `FR-102`（中身の規則: req:4668〜4672、表 T-263） |
| 3 | `interactionRecordOffered` | `:2017` | 書き: `recordLine`:2168、`turnInteractionRecord`:2266 ・ :2277。読み: `:2170`（行の通し番号）、`:2252`（頭） | **外**（2 と組。行ごとに変わる） | none（実装の都合 —— 棚卸し `:59`） |
| 4 | `interactionRecordDropped` | `:2015` | 書き: `recordLine`:2173、`turnInteractionRecord`:2265 ・ :2276。読み: `interactionRecordText`:2253 | **外**（2 と組。上限を超えた行ごとに変わる） | `FR-102` req:4672（頭に書く中身として） |
| 5 | `interactionRecordBeganAt` | `:2016` | 書き: `turnInteractionRecord`:2267。読み: `recordLine`:2169 | **外**（2 と組）。値は時刻 ⇒ `SF-5` のフレームの値でもある | none（棚卸し `:58`「連続（時刻）」） |
| 6 | 上限 | `NOT_STORED_INTERACTION_RECORD_LIMITS`（`:4609`〜`:4613`） | 読み: `:2171` ・ `:2254` | **外**（生成した定数。決定 8） | `S-207` set:394 |
| 7 | 記録している印 | `commandItemFor` の `isPressed`（`command-palette.ts:131`〜`:132`） | 描き手が 1 から導く | **フレームの値**（導ける） | `FR-102` req:4666、`FR-029` |

⇒ **覚え 5（`let` 4 ＋ `const` 1）: 状態 1 組（機械 1）、運ぶ値 0、外 4（記録の溜めの 4 つの名）。ほかに外の定数 1、導ける値 1。**
⭐ 波 B で `frameLoop` を離れるのは `isRecordingInteractions` の 1 つだけ（`let` 57 → 56。⛔ 波 B の入口で測り直す）。

### 2.1 領域をまたぐもの

| 読む側 ／ 書く側 | いま | 移した後 |
|---|---|---|
| 描き手が「記録しているか」を読む | `runFrame`:2425 → 読みの束 `ScreenViewReadingsTaken.isRecordingInteractions`（`:1204`）→ `ScreenViewReadings`（`screen-renderer.ts:409`）→ `command-palette.ts:245` | 呼び手が根の `interactionRecord.interactionRecordingState.kind === 'recordingInteractions'` から真偽を詰める。描き手の型の名は変えない |
| 書き出す絵 | `exportScene`:2777 は常に `false` | そのまま（絵に記録の印を載せない —— 今日の写し） |
| 記録の門 | `recordLine`:2167 ・ `recordHappening`:2195 ・ `recordFrame`:2217 が旗を読む | 根の今の状態を読む。⚠️ 読むのは各呼び出しの時点の状態 —— 同じ入力の中で始めた・止めたときの行の出入りが今日と同じになる（第 4.2 節） |
| `Esc` の段 | 触れない（`S-206` set:393「`Esc` では止まらない」） | 画面の値の `escapePressed` はこの領域を動かさない（`SS-5`）—— 契約試験が確かめる。優先順の表 T-283 にも段を足さない |
| 文書の置き換え | 触れない（記録は別の文書を開いても続く） | どの領域の出来事もこの領域を動かさない（今日の写し。仕様は名指さない） |
| フレームを負うか | `answerSettledEntry` が `true` を返し、`hasKeyActed`（`:4457`〜）でフレームを負う | 根の参照の比べに畳まれる（`CR-436` の波 B2 の形） |

### 2.2 申し送り

| # | 相手 | 中身 |
|---|---|---|
| 1 | 段 5（`CR-438`）の後の持ち主 | 翻訳係の `toggleInteractionRecord`（`input-command-translator.ts:265` ・ `:1081`〜`:1082`）は、シェルが `IC-76` を先に使い切るので今日どこにも届かない。波 B でこの領域の出来事を翻訳係が作るのか、シェルの `answerSettledEntry` の道のまま作るのかは波 B が決める。本書はどちらでも同じ出来事 1 つを受ける |
| 2 | 波 B | 描き手の `ScreenViewReadings.isRecordingInteractions` は根から詰める（2.1 の 1 行目） |
| 3 | `CR-530`（`Agent API` の領域） | `dialogueLog` を運ぶ値とするかは同書が決める。⚠️ 本書が記録の溜めを「外」とした理由（行がポインタの移動とフレームのたびに増える）は `dialogueLog` には当たらない —— 確定した発話ごとにしか増えないので、同じ結論を写さないこと。⚠️ 同書は本書と同じ所（第 9 節）を触るので、後に当たる方が序数と数を測り直す |

---

## 3. 立てる機械

### 3.1 状態と運ぶ値

| 状態 | 運ぶ値 | 要求 | 今日の持ち主 |
|---|---|---|---|
| `interactionRecordingStateMachine.notRecording`（初期） | — | `S-206`（既定 `false`）、`FR-102` | `isRecordingInteractions === false`（`:2013`） |
| `interactionRecordingStateMachine.recordingInteractions` | — | `FR-102` req:4666、`S-206`、`IC-76` | `isRecordingInteractions === true` |

根 `interactionRecord`: 運ぶ値 0、根の升 0。

### 3.2 出来事（領域に 1 度だけ定義する —— 1）

| 出来事 | どこから来るか | 運ぶ値 | 動かすもの |
|---|---|---|---|
| `interactionRecord/interactionRecordToggled` | 入力: `IC-76` を押して離した（`FR-102` の「同じ入口」） | — | `interactionRecordingStateMachine` |

### 3.3 状態遷移表（升 2）

升目の書き方: `→ 先 [ガード] / 副作用`。**`—` は変わらない ＝ 同じ参照**（`SD-3`）。

| 出来事 ＼ 状態 | `notRecording` | `recordingInteractions` |
|---|---|---|
| `interactionRecordToggled` | → `recordingInteractions` / `beginInteractionRecord`（`FR-102` ・ `IC-76`） | → `notRecording` / `handInteractionRecordToClipboard`（`FR-102` ・ `IC-76` ・ `CHN-9`） |

この機械を動かさない出来事: ほかの 6 領域の出来事すべて（`Esc` の `screen/escapePressed`、文書の置き換え `notices/documentReplaced` ・ `fileFlow/documentOpenLanded` を含む —— `S-206` と今日の写し）。
⭐ 空の升は無い（出来事 1 × 状態 2 の 2 升がどちらも遷移する）。

### 3.4 副作用（シェルが実行する —— `SF-6`）

| 副作用 | 今日の本体 | シェルがすること |
|---|---|---|
| `beginInteractionRecord` | `:2264`〜`:2269` | 溜めを空にし、申し出た件数と捨てた件数を 0 にし、始めた時刻を取り、`record started entrance=IC-76` の行を書く（状態は既に `recordingInteractions` なので門を通る） |
| `handInteractionRecordToClipboard` | `:2272`〜`:2280` | `record stopped entrance=IC-76` の行を**門を通さず**溜めへ書き（状態は既に `notRecording`）、記録の文を組み（`interactionRecordText`、`:2249`〜`:2258`）、溜めと 2 つの件数を空にし、クリップボードの継ぎ目があれば `{ kind: 'record', text }` を渡す（結果は読まない —— 決定 7）。継ぎ目が無くても溜めは空にする（今日の `:2275`〜`:2279` の順） |

---

## 4. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A**（当てた） | なし。⚠️ `CR-530` と同じ所を触る（第 9 節） | 4.1 の表 | `CR-490` の 3 節と同じ組（18 ・ 19 ・ 21 ・ 26b ・ 27 ・ 30 ・ 33 ・ 59 ・ 60 ・ 61 ・ 62 ・ 63 ＋ vitest）。⚠️ 検査 11 ・ 12 ・ 33 は `FAIL` の行を出さずに赤くなる —— 出力の全体を当てる前の走りと比べた（第 6 節） |
| **B** | `CR-436` の波 B2 が当たっている（当たった —— `39c15ff4`）。`JDG-291` により段 5 ・ 段 6 を待たない | `frame-loop.ts`: `let isRecordingInteractions` を根の `interactionRecord` へ。書き手 2（`:2268` ・ `:2274`）を出来事 `interactionRecordToggled` と副作用 2 つの実行（`effectRunnersOf` の `:1452` ・ `:1453` の `unwiredEffect` を置き換える）に替える。門の読み手 3（`:2167` ・ `:2195` ・ `:2217`）と写し（`:2425`）を根の今の状態へ。記録の溜めの 4 つの名はシェルに残す（決定 3 —— 4.2 の改名）。**今日の振る舞いを写す** | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部（`IC-76` で始めて止め、貼った記録の頭と行の通し番号が今日と一致すること）、`LM-19`（⛔ **利用者を呼んでから**） |
| **C**（B の直後の別のコミット） | 波 B で一致を確かめた後（`JDG-57`） | 第 8 節の候補のうち、台帳で直すと決まったもの | 同上 |

### 4.1 波 A の中身（当てた形）

| 対象 | 前 | 後 |
|---|---|---|
| 原稿 `docs/spec/_source/state-machines.json` | 6 領域 | 領域 `interactionRecord` を `regions` の末尾に足した（付録 D。ほかの領域と `priorities` は 1 字も変えていない） |
| 生成物 `docs/spec/_assets/tbl-state-machines.md` | 6 領域 | ＋ 節「操作の記録（`interactionRecord`）」: 表 T-295、図 F-041（付録 C の形） |
| 5.5 の散文（`05-07-design.md:775`） | 6 文 | 「第 7 領域（操作の記録）のそれらを同じファイルの 表 T-295 に、状態遷移を 図 F-041 に示す。」 |
| `CP-39`（`:144`） | 「… / 表 T-293」 | ＋「/ 表 T-295」 |
| `SU-3`（`:245`） | 112 | 113 |
| `UT-11`（`:338`） | 「… ／ `selection-values.ts`」、括弧「… 選択は 表 T-293」 | ＋「／ `interaction-record-values.ts`」、括弧に「、操作の記録は 表 T-295」（`RA-4`） |
| 表 T-075（`:488`） | 112 行 | `UF-124` ／ `AdvanceScreenSession` ／ `interaction-record-values.ts` ／ `pure` ／ 「操作の記録の領域の遷移（表 T-295）と、そこから生成した型と遷移表の定数の区画」／ `—`（決定 9）。`UF-122` の後 |
| `PI-39`（`:571`） | 「… ・選択の 6 領域」、出来事・副作用・初期の欄に「… ・ 表 T-293」 | 「… ・選択・操作の記録の 7 領域」、3 つの欄に「・ 表 T-295」（`RA-5`） |
| 図 F-028 | 6 領域の実線 | ＋ `RecordRegion["領域 interactionRecord<br>操作の記録（表 T-295）"]` と根からの実線、下の段に「前: 領域 interactionRecord」==>「同じ参照」==>「後: 領域 interactionRecord」 |
| `SS-6`（`:1153`） | 「… ・ 表 T-293 の状態の一覧の初期」 | ＋「・ 表 T-295」 |
| `src/use-case/advance-screen-session/interaction-record-values.ts`（新、`UF-124`） | 無い | 手書きの副作用の型（4.2）、生成区画、`emptyInteractionRecordValues`、`stepInteractionRecordValues`（出来事 1 つの `HANDLERS` を経る）。モジュールスコープの可変状態 0（`SF-7`） |
| `advance-screen-session.ts`（`UF-84`） | 6 領域 | ＋ `interactionRecord: InteractionRecordValues`。`SessionEvent` ・ `SessionEffect` を 7 領域の和に、`emptyScreenSession` を広げ、`IS_INTERACTION_RECORD_EVENT` と `isInteractionRecordEvent` を既存の形で足し、`advanceScreenSession` に振り分けを 1 つ足した（検査 60 の帯の外 —— 超えていない） |
| `frame-loop.ts`（`UF-48`） | —— | `effectRunnersOf` に `beginInteractionRecord: unwiredEffect` ・ `handInteractionRecordToClipboard: unwiredEffect`（`:1452` ・ `:1453`）。型が副作用の漏れを止めるので要る。ほかは触らない |
| `session-effects.ts`（`UF-123`） | `// see` に 表 T-293 まで | ＋ 表 T-295（注釈だけ） |
| `docs/development-rules/03-implementation.md` | —— | ＋ `INTERACTION_RECORD_VALUES_INITIAL_AXES` ・ `INTERACTION_RECORD_VALUES_TRANSITIONS`（検査 30） |
| `.claude/skills/spec-graph-check/check-provenance.py` | 6 領域のファイル | ＋ `interaction-record-values.ts`（検査 21 —— 28 → 29） |
| `tools/generate_state_machine_types.py` | 文書の文字列に 表 T-293 まで | ＋「table T-295 for `interactionRecord`」（文書の文字列だけ） |
| `tests/contract/units.contract.test.ts` | 112 | 113 |
| `docs/development-records/changelog.md`（版 0.29 の行） | 「`AdvanceScreenSession`（8）」 | 「（9）」（`audit-ch5.py` が 表 T-075 と突き合わせる） |
| 生成物 `docs/spec/_assets/tbl-row-id-prefixes.md` | `UF` 112 | 113（`npm run gen`） |
| 契約試験 | 無い | ⭐ 仕様だけを読む別の体が書く（`RA-6`）: 原稿の領域 `interactionRecord` を読み、(1) 2 つの升の先の種類と副作用の名が表と一致、(2) ほかの 6 領域の出来事すべてでこの領域が同じ参照のまま残ること（`SD-3` ・ `SS-5`。`screen/escapePressed` を必ず含む —— `S-206` の「`Esc` では止まらない」）、(3) この領域の出来事がほかの 6 領域を同じ参照のまま残すこと、(4) 2 度の `interactionRecordToggled` で初期と同じ種類に戻ること |

### 4.2 継ぎ目（体に渡すときは両方のブリーフに同じ字面で書く）

- 領域のキー `interactionRecord`、名「操作の記録」、型の幹 `InteractionRecordValues`、ファイル `interaction-record-values.ts`、公開は `emptyInteractionRecordValues` ・ `stepInteractionRecordValues` と生成した型・定数（`InteractionRecordingState`、`InteractionRecordValuesEvent`、`InteractionRecordValuesEffectName`、`INTERACTION_RECORD_VALUES_TRANSITIONS`）。
- 機械 `interactionRecordingStateMachine`（今の状態 `interactionRecordingState`、型 `InteractionRecordingState`）: `notRecording`（初期）・ `recordingInteractions`。運ぶ値 0。
- 出来事（1）: `interactionRecord/interactionRecordToggled`（運ぶ値なし）。
- ガード 0。`{in: …}` 0。副作用（2）: `beginInteractionRecord` ・ `handInteractionRecordToClipboard`（どちらも運ぶ値なし）。
- 根: `ScreenSession { …; readonly interactionRecord: InteractionRecordValues }`。根の運ぶ値 0。
- 副作用の型は手で書く: `export type InteractionRecordValuesEffect = { readonly type: InteractionRecordValuesEffectName }`（身振りの `GestureValuesEffect` と同じ形。名前付けと入力欄の写像型の形を写さない —— 写すと検査 11 ・ 45 の重なりに当たりうる）。
- 生成区画は `…StateCarried` ・ `…EventCarried` を参照しない（運ぶ値 0）⇒ 手書きの側にその 2 つの型を置かない（置くと読まれない型になる）。
- **波 B のシェル**: ① `IC-76` を離したら出来事を 1 つ送り、返った副作用を順に実行する。② `beginInteractionRecord` は状態が `recordingInteractions` になった後に走るので、始めた行は門（`recordLine`）を通してよい。③ `handInteractionRecordToClipboard` は状態が `notRecording` になった後に走るので、止めた行は**門を通さず**溜めへ直に書く —— 今日は旗を倒す前に書いている（`:2272` → `:2274`）。④ 門は各呼び出しの時点の根を読む —— 始めた押下そのものの入力の行は記録されず（`recordHappening` は `receiveInput` の頭 `:4306` で先に走る）、その押下の後の行は記録される。止めた押下はその逆。今日と同じ。⑤ 記録の溜めの `const interactionRecord`（`:2014`）は、根の `interactionRecord` と同じ閉包に並ぶので改名する（例 `recordedLines`）。

---

## 5. この結論を覆すもの

- **記録の中身を `Agent API` や画面の別の所が読むと決まったとき** —— 溜めを「外」から運ぶ値へ上げるかを測り直す。行がポインタの移動とフレームのたびに増える限り、`SF-5` と `GL-003` の理由は残る。
- **第 8 節の候補 1 が「最小化・非表示のあいだも読めるよう、パレットの外に印を出す」と裁定されたとき** —— 機械は変わらない（印は状態から導く値）。描き手と `FR-053` の文が動く。
- **第 8 節の候補 2 が「渡せなかったことを告げる」と裁定されたとき** —— 副作用の結果の出来事（例: 失敗の知らせ）を 1 つ足し、通知の領域へ理由を送る。升は `notRecording` の上に 1 つ増えるか、根の升になる。
- **利用者が「記録は画面の値の 1 つでよい」と言ったとき** —— 決定 2 の 2 つ目の案へ移す（機械の中身は同じ）。

---

## 6. 数の予測と測った数

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行（`check.sh` の出力の同じ行）。
**起草時（`9b8a22b7`、2026-09-21）: `tables=181  figures=25  rows=2241  uids=162`。当てる前（`fe725d98`、2026-09-22）: `tables=182  figures=25  rows=2256  uids=162`。当てた後（作業木）: `tables=183  figures=26  rows=2257  uids=162`。** ⭐ 本書の差だけを突き合わせる —— 予測どおりだった。

| | 波 A | 波 B | 内訳 |
|---|--:|--:|---|
| tables | +1 | 0 | 表 T-295 |
| figures | +1 | 0 | 図 F-041 |
| rows | +1 | 0 | `UF-124` |
| uids | 0 | 0 | 要求を足さない |

**そのほかの数**: 表 T-075 112 → 113、`SU-3` と `units.contract.test.ts` 112 → 113、`changelog.md` の「`AdvanceScreenSession`（n）」8 → 9、原稿は 7 領域 ・ 機械 23 ・ 状態 64 ・ 出来事 78 ・ 升 158 ＋ 根の升 10。`frameLoop` の `let` は波 B で 57 → 56。
**`check.sh` の最終行**: 当てる前 `red: 23`、当てた後 `red: 23`（出力の全体を当てる前の走りと比べ、差は数の行だけ —— 検査 11 ・ 12 ・ 33 に新しい赤は無い）。

---

## 7. 問いの候補に打った 3 つの反証（`handoff.md` §0.2）

方法（起草時、2026-09-21）: (1) `docs/development-records/rulings.md` を grep —— 「操作の記録」0、`FR-102` 2（どちらも `JDG-175` の行 —— 記録に焦点・パネル・通知の理由を足した話）、`S-206` 0、`S-207` 0、`IC-76` 0、「記録している」0、「最小化」0、`S-200` 0。(2) `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <行>`: `FR-102` 指される要求 2 ／ 参照 7、`S-206` 1 ／ 2、`S-207` 1 ／ 1、`IC-76` 1 ／ 1、`SF-5` 0 ／ 1、`FR-053` 7 ／ 30。(3) 導けるか。当てる直前（2026-09-22）に (1) を引き直した —— 起草の後に足された裁定（`JDG-291`〜`JDG-366`）に操作の記録を名指すものは無かった。

| 候補 | (1) | (2) | (3) 導けるか | 結果 |
|---|---|---|---|---|
| 機械を立てるか（`CR-470` の形で立てないか） | 0 件 | `FR-102` 2 ／ 7、`S-206` 1 ／ 2 | **導けた（立てる）** —— 要求が状態を名指し、連続値でも導ける値でも文書でもない。`S-200` ・ `S-142` の前例。`CR-490` の 11.3 | 決定 1 |
| 新しい領域か、画面の値に足すか | 「領域」7 件はどれも別の領域の話 | —— | **導けた（新しい領域）** —— 計画の記録 4（`:244` ・ `:253`）、`CR-490` の 11.7（`:416`）、`handoff-state-machine.md:122`、`SF-8` | 決定 2 |
| 記録の中身を運ぶ値にするか | 0 件 | `S-207` 1 ／ 1 | **導けた（しない）** —— 行ごとの出来事は `SF-5` と `GL-003` に反する。`CR-490` の 11.1 の見立ては頻度を測っていなかった | 決定 3 |
| 「申し出た」状態を立てるか | 0 件 | `FR-102` 2 ／ 7 | **導けた（立てない）** —— `interactionRecordOffered` は行の通し番号で、要求はその状態を名指さない | 決定 3 |
| 初期の状態を `S-206` から読むか | 0 件 | `S-206` 1 ／ 2 | **導けた（読まない）** —— `S-206` は表 T-206 の本体で `localStorage` の別枠ではない。`SD-1` は既定値を `S-` 行へ指すだけ | 決定 5 |
| 開始と停止を 2 つの出来事に分けるか | 0 件 | `IC-76` 1 ／ 1 | **導けた（分けない）** —— `FR-102` と `IC-76` の「同じ入口」、前例のトグル 2 つ | 決定 4 |
| クリップボードの結果を出来事にするか | 0 件 | `FR-102` 2 ／ 7 | **導けた（しない）** —— 今日のコードが読まない（`JDG-57`）。直すかは台帳（`JDG-78`） | 決定 7、第 8 節 |

⇒ **3 つとも空だった候補は 0 件。問いは無い。**
⚠️ 利用者に**知らせる**価値があるのは 1 つ: `CR-490` の 11.1 の 4 行目（記録の 4 つを運ぶ値とする見立て）を、本書が決定 3 で覆すこと。

---

## 8. 台帳の候補（⛔ 問いではない。どちらが正かを選ばない）

2026-09-13 の利用者の裁定（仕様とコードの食い違いは、どちらが正かを選ばずに台帳へ）に従い、台帳に書く者へ渡す。番号は書く直前に引き直す（2026-09-22 の上端 `DFC-784`）。⚠️ **どれも未検証（画面で押していない。コードと仕様を読んだだけ）。**

| 仮の名 | 食い違い | 片側 | もう片側 | 台帳の今 |
|---|---|---|---|---|
| **候補 1** | **パレットを最小化しているあいだ・出していないあいだ、記録しているかどうかが画面上で読めない** —— 記録している印は `IC-76` の入口の押されている形だけで（`command-palette.ts:131`〜`:132`）、最小化では入口の並びを出さず（`:279`）、非表示ではパレットそのものを出さない（`:259`）。⚠️ **仕様の中でも食い違う**: `FR-102`（req:4666）は例外を持たずに「読めること（MUST）」と書き、`FR-053`（req:4118）は「最小化しているあいだに出すのは掴み帯だけとし、ほかは何も出さないこと（MUST）」と書く。構えの表示には最小化が例外として明記されている（req:4081）が、記録にはその文が無い | `FR-102` req:4666（「止めたつもりで記録が続く」を理由とする MUST） | `FR-053` req:4118 と `S-99e`（set:387）の非表示。いまのコード | 起草時 0 件（`defects.md` ・ `fixed-defects.md` ・ `pending-decisions.md` を `FR-102` ・ `IC-76` ・ `S-206` で引いた）。決まっていないことなら `PND-` 向き —— 台帳で判じる |
| **候補 2** | **止めたとき、記録をクリップボードへ渡せなくても告げず、記録は捨てられる** —— `:2280` は `void writeClipboard(...)` で結果を読まず、その前に溜めを空にしている（`:2275`〜`:2277`）。継ぎ目が無いとき（`:2278`〜`:2279`）も同じ。同じ継ぎ目のほかの 2 つの書き込みは失敗で `RS-15` を立てる（`:3735`〜`:3736` ・ `:4010`〜`:4015`） | `FR-102` req:4667「止めたとき、その記録をクリップボードへ渡すこと（MUST）」、`NT-3a`（req:6392、失敗の通知は次の手段を添える） | いまのコード | 起草時 0 件。⛔ 異常系（`JDG-78`）—— リファクタの後 |

⚠️ 台帳に載せないもの: 翻訳係の `toggleInteractionRecord` がどこにも届かないこと（第 2.2 節の 1）—— 利用者に見える振る舞いは無い。

---

## 9. 影響 —— 本書の外で動くもの

| 所 | 何が動くか | いつ |
|---|---|---|
| ⚠️ **`CR-530`（`Agent API` の領域）** | **同じ所を触る**: `advance-screen-session.ts` の根の合成、`state-machines.json` の `regions` の末尾、5.5 の散文の序数（本書が「第 7 領域」を取った）、`CP-39` ・ `UT-11` ・ `PI-39`（本書が「7 領域」にした）・ `SS-6` ・ 図 F-028 ・ 表 T-075 と `SU-3` ・ `units.contract.test.ts` の数 ・ `changelog.md` の数 ・ `03-implementation.md` ・ `check-provenance.py` ・ `effectRunnersOf` ・ `uf-123-session-effects.test.ts` の副作用の一覧。**後に当たる方が序数と数を測り直す**。共有する出来事は無い | 両方の波 A |
| `handoff-state-machine.md:122` 付近 | 次の領域の並びから「操作の記録」を済みにし、図の帯の注に `F-041` を足す | 前に立つ者 |
| 波 B | 2.2 の 1 ・ 2、4.2 の ① 〜 ⑤ | 各入口 |
| `defects.md` | 第 8 節の候補 | 台帳に書く者 |

---

## 10. ⛔ この変更でやらないこと

- ⛔ 画面の値・通知・身振り・ファイル操作と問い・名前付けと入力欄・選択の原稿と、領域をまたぐ優先順（表 T-283）を変えない
- ⛔ 記録の中身（行・件数・時刻）と上限 `S-207` を原稿に入れない（決定 3 ・ 8）。記録に書く行の形（表 T-263、`IR-1`〜`IR-3`）を変えない
- ⛔ 第 8 節の候補を移す波で直さない（`JDG-57`）。異常系を設計しない（`JDG-78`）
- ⛔ 波 A で `frame-loop.ts` を結線しない（`effectRunnersOf` の 2 行は型が求める `unwiredEffect` だけ）。`src/framework/dom-screen-surface/` に触らない
- ⛔ 表 `T-294` ・ 図 `F-040` を取らない
- ⛔ 基準線を体に触らせない

---

## 付録 —— 第 7 領域「操作の記録」の原稿

**略記**: `req` ＝ `docs/spec/01-04-requirements.md`、`des` ＝ `docs/spec/05-07-design.md`、`set` ＝ `docs/spec/_assets/tbl-settings.md`、`glo` ＝ `docs/spec/_assets/tbl-glossary.md`。行番号は 2026-09-22 の作業木。
根拠の行: `FR-102` req:4662〜4672、`CHN-9` req:496、`S-206` set:393、`IC-76` glo:603。

### A. 出来事（1）

| 出来事 | どこから来るか | 運ぶ値 | 動かすもの |
|---|---|---|---|
| `interactionRecord/interactionRecordToggled` | 入力: `IC-76` を押して離した（`FR-102`） | — | 機械 |

### B. 根 `interactionRecord`

運ぶ値 0。根の升 0。根拠 `FR-102` ・ `S-206`。

### C. 刷った形（`npm run gen` が刷った 表 T-295 の升）

| 出来事 | `notRecording` | `recordingInteractions` |
| --- | --- | --- |
| `interactionRecord/interactionRecordToggled` | → `recordingInteractions` / `beginInteractionRecord`（記録の溜めを空にし、始めた時刻を取り、始めたことを 1 行目に書く） | → `notRecording` / `handInteractionRecordToClipboard`（止めたことを書き、記録の文を組んでクリップボードへ渡し、溜めを空にする） |

- `interactionRecordingStateMachine.notRecording` —— 初期。根拠 `S-206` ・ `FR-102`
- `interactionRecordingStateMachine.recordingInteractions` —— 根拠 `FR-102` ・ `S-206` ・ `IC-76`

図（mermaid）の矢印: `notRecording → recordingInteractions`、`recordingInteractions → notRecording`（どちらも `interactionRecordToggled`）。

### D. 原稿の JSON（`regions` の末尾に足した —— 当てた原稿と同じ中身）

```json
{
 "region": "interactionRecord",
 "name": {"ja": "操作の記録"},
 "unit": "src/use-case/advance-screen-session/interaction-record-values.ts",
 "typeStem": "InteractionRecordValues",
 "table": {"id": "T-295", "caption": {"ja": "操作の記録の状態機械"}},
 "figure": {"id": "F-041", "caption": {"ja": "操作の記録の状態遷移"}},
 "root": {
  "carries": [],
  "evidence": ["FR-102", "S-206"],
  "transitions": {}
 },
 "events": [
  {"key": "interactionRecordToggled", "source": {"kind": "input", "rows": ["IC-76", "FR-102"], "note": {"ja": "`IC-76` を押して離した。記録していないときは始め、記録しているときは止める —— 開始と停止は同じ 1 つの入口である"}}, "carries": []}
 ],
 "machines": [
  {
   "name": "interactionRecordingStateMachine",
   "states": [
    {"key": "notRecording", "parent": null, "initial": true, "carries": [], "evidence": ["S-206", "FR-102"]},
    {"key": "recordingInteractions", "parent": null, "initial": false, "carries": [], "evidence": ["FR-102", "S-206", "IC-76"]}
   ],
   "transitions": {
    "interactionRecordToggled": {
     "notRecording": {"to": "recordingInteractions", "effect": "beginInteractionRecord", "evidence": ["FR-102", "IC-76"], "note": {"ja": "記録の溜めを空にし、始めた時刻を取り、始めたことを 1 行目に書く"}},
     "recordingInteractions": {"to": "notRecording", "effect": "handInteractionRecordToClipboard", "evidence": ["FR-102", "IC-76", "CHN-9"], "note": {"ja": "止めたことを書き、記録の文を組んでクリップボードへ渡し、溜めを空にする"}}
    }
   }
  }
 ]
}
```

### E. 型（コードが決める。原稿は名前だけ —— 表 T-250 の `SD-1` ・ `SD-2`）

| 名 | 型 | 置き場 |
|---|---|---|
| `InteractionRecordingState` | `{ kind: 'notRecording' } \| { kind: 'recordingInteractions' }`（生成） | `interaction-record-values.ts` の生成区画 |
| `InteractionRecordValues` | `{ interactionRecordingState }`（生成） | 同上 |
| `InteractionRecordValuesEvent` | `{ type: 'interactionRecordToggled' }`（生成） | 同上 |
| `InteractionRecordValuesEffect` | `{ readonly type: InteractionRecordValuesEffectName }`（手書き —— 4.2） | 同じファイルの生成区画の上 |
| 記録の溜め | 今日の 4 つの名のまま（`string[]` ・ `number` × 3）。改名は波 B（4.2 の ⑤） | `frame-loop.ts`（`UF-48`） |

## 改訂の記録

| # | 日付 | 何を変えたか | 理由 |
|---|---|---|---|
| 1 | 2026-09-21 | 起草（`9b8a22b7`）—— 領域 `interactionRecord` と `interactionRecordingStateMachine` を立て、記録の中身を外に置く形 | `CR-490` の 11.7 の 2 行目 |
| 2 | 2026-09-22 | 波 A を当てた（`fe725d98` の上の作業木）。原稿に付録 D の領域を足し（ほかの 6 領域と `priorities` は 1 字も変えていない）、`npm run gen` で 表 T-295 ・ 図 F-041 の節と `interaction-record-values.ts` の生成区画を刷った。手書きの側は副作用の型、`emptyInteractionRecordValues`、`onInteractionRecordToggled` と 1 行の `HANDLERS`、`stepInteractionRecordValues`。根の合成と 5.3 ・ 5.5 ・ 5.6 の行は 4.1 の表のとおり。草案から変えたのは次の 3 つ: ① 行番号と数を `fe725d98` で測り直した（`frameLoop` の `let` は 66 → 57、旗の読み手の写しは `SessionHeld` から読みの束 `ScreenViewReadingsTaken` へ移っていた）。② 草案の 4.1 に無かった `frame-loop.ts` の `effectRunnersOf` の 2 行（`unwiredEffect`）と `session-effects.ts` の注釈を足した —— `CR-436` の波 B2 が副作用の表を型で閉じたため。③ 表 T-075 ・ `SU-3` ・ `units.contract.test.ts` の数は草案の 101 → 102 ではなく 112 → 113（草案の後にユニットが 11 増えた） | 数は予測の差どおりだった: 原稿 7 領域 ・ 機械 23 ・ 状態 64 ・ 出来事 78 ・ 升 158 ＋ 根 10、md-checks は `tables` +1 ・ `figures` +1 ・ `rows` +1。表 `T-294` ・ 図 `F-040` は使っていない |
| 3 | 2026-09-22 | 試験は 2 つだけ触った。① 既存の `tests/unit/uf-123-session-effects.test.ts` の「`SessionEffect` が原稿の副作用の種類をちょうど名指す」の表（`Record<SessionEffect['type'], true>`）に 2 つの名を足した —— 足さないと型が閉じて `npm run typecheck` が落ちる。② `tests/unit/uf-124-the-interaction-record-transition-table-is-printed-from-the-manuscript.test.ts` を `uf-122` の同じ試験の前半（生成した表が原稿の升を行ごとに写すこと）から写して足した —— 生成器は `…_TRANSITIONS` を常に `export` で刷り、検査 30（`JDG-139`）は他のファイルが読まない公開の写しを赤にするため。これは生成器の写しの試験であって、手で書いた `step` の試験ではない。ほかの領域の契約試験は見本の表を変えずに緑のまま（新しい出来事は運ぶ値を持たない） | 新しい機械の升・直交・`Esc` で止まらないことの主張は、仕様だけを読む別の体が書く（`RA-6`） |
