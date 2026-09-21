# CR-436 — 画面の値を状態機械へ移す（リファクタ段 2b-B と、段 7 の第 1 領域）

> ⭐ **状態: 波 A を当てた（2026-09-21、`1616d28d` の上。ブランチ `sm-wave-a`）。波 B1 を当てた（2026-09-22、`5413bea5`）。波 B2 は第 1 段（仕様）を当て、コードと試験はまだ（2026-09-22 —— 末尾の「波 B2 —— シェルへ結線する設計」の B.16）。**
> ⭐ **波 A2 を当てた（2026-09-21、`JDG-286`）** —— 原稿と印字を状態機械ごとに組み替え、`SM` ・ `EV` ・ `TN` の番号をやめて名で指すようにした。付録 A.1 〜 A.3 の番号は当てた日の履歴であり、いまの名は末尾の「波 A2」の節で引く。
> 当てたのは 第 3.1 節の表のすべてである。当てた体が決めたこと・原稿と付録を合わせ直したことは末尾の「改訂の記録 —— 波 A を当てた」に並べた。
> 読んだ木: `2112d0c9`（ブランチ `refactor`）。**本書の行番号と数は、断りが無いかぎりこの木で 2026-09-21 に自分で測ったものである。**
> ⭐ **波 A を `1616d28d` で測り直した（2026-09-21）** —— その間に `CR-432`（表 T-276 と接頭辞 `UD`、`56de8f06`）が当たった。直したところは本書の末尾の「改訂の記録」に並べた。
>
> **閉じるもの**:
> - `CR-379` の第 3 節「2b-B」の表（段 7 の最初の領域の変更要求がコードと同じ波で当てる、と同書の決定 2・3 が延ばした分）。
> - 第 1 領域「画面の値」の原稿の行（`SM` / `EV` / `TN`）と、その生成器・契約試験・遷移の関数。
> - ⭐ **利用者の裁定 `JDG-283`**（2026-09-21、逐語「**推奨の Cとせよ**」）—— `PND-451`（出していないプロパティパネルの境界を押したら何が起きるか）。着地先として本書が名指されている（`docs/development-records/rulings.md:480`）。
>
> **当てる直前に測り直した識別子**（規則 02 の 2.5。⭐ どれも 2026-09-21 に `1616d28d` で測った値であり、当てたので、いまは履歴である）:
> - 番号の帯（2026-09-21 に 2 つのセッションが取り決めた。`docs/development-records/handoff.md` の「次のセッションに貼る 1 通目」の 3「衝突の約束」）: **本書（状態機械）は `UF-84` 以降・`UT-11` 以降・`T-280` 以降・`F-026` 以降・`CP-39`・`PI-39`**。本線（`CR-432` ほか）は `UF-72` 〜 `UF-83`・`UT-8` 〜 `UT-10`・`T-276` 〜 `T-279`・`F-030` 以降。
> - 当てる直前、木が見出しで定義していた表の番号は `T-277` までだった（2026-09-21 に `1616d28d` で実測。`docs/spec/*.md` と `docs/spec/_assets/*.md` の見出し `**表 T-nnn —` を数えた。検査 62 も同じ値を刷る）。
> - `T-280` `T-281` `T-282` `T-283` は、当てる直前にはどれも使われていなかった（2026-09-21 に `1616d28d` で実測。`docs/spec` ・ `change-request`（本書を除く）・ `src` ・ `tests` ・ `tools` を grep して 0 件）。本書の帯の内側である。⭐ いまは本書が 表 T-280 〜 表 T-282 を定義している（`T-283` は波 B2）。
> - 表 `T-276` と接頭辞 `UD` は `CR-432` が `56de8f06` で当てた（本書は取らない）。要求 ID は 1 つも立てない。
> - 行 ID の接頭辞の登録簿（`docs/spec/_source/row-id-prefixes.json`）の行は 161 件（2026-09-21 に `1616d28d` で実測。`CR-432` の `UD` で 160 から 1 増えた）。うち `SM` ・ `EV` ・ `TN` は `pending: true` で登録済みであり、波 A の当初の範囲では新しい接頭辞を登録しなかった。⭐ 波 A の追補で `SS`（表 T-284）と `RA`（表 T-285）を登録した —— 登録の直前（2026-09-21）に `docs` ・ `change-request` ・ `.claude/skills` ・ `src` ・ `tests` ・ `tools` を grep して、`SS-` ・ `RA-` に数字が続く字面は 0 件だった。
> - 波 A の追補（共通の状態機械そのもの）: `T-284` ・ `T-285` ・ `図 F-027` ・ `図 F-028` は、当てる直前にはどれも使われていなかった（2026-09-21 に `docs` ・ `change-request` ・ `src` ・ `tests` ・ `tools` ・ `.claude` を grep して 0 件）。⭐ いまは本書が定義している。`T-283` は波 B2 のまま。
- 図の番号: 木の最大は `図 F-025` である（2026-09-21 に `1616d28d` で実測）。`図 F-026` は本書の帯の先頭であり、当てる直前には使われていなかった（同日、同じ 5 か所を grep して 0 件）。⭐ いまは本書が定義している。
> - 表 T-075 の行 ID は、行の数（68）ではなく ID そのものから測る —— 最大は `UF-71`（欠番 `UF-43` `UF-44` `UF-52`。2026-09-21 に `1616d28d` で実測）。`CR-432` は `UF-72` 〜 `UF-83` を各波の分割のコミットで足す（同書 4.6 節と 10 節）。⇒ **本書は帯の先頭の `UF-84` 〜 `UF-86` を置く。** `UF-84` ・ `UF-86` ・ `UF-87` の字面は `CR-432` の改訂の記録（捨てた旧案の値）にだけ在り、予約ではない。`UF-85` は 0 件（2026-09-21 実測）。
> - 表 T-063 は `UT-1` 〜 `UT-7`。`UT-8` 〜 `UT-10` は本線の帯である。⇒ 本書は `UT-11` を置く（`CR-379` の第 3 節が書いた `UT-8` は使わない）。`UT-11` は 0 件、`CP-39` と `PI-39` は `CR-379` が名指しただけで木にも他の草案にも無い（2026-09-21 に `1616d28d` で実測）。
>
> ⭐ **波 A で仕様書・原稿・コード・試験を動かした。基準線は 1 文字も動かしていない**（検査 33 の除外は `JDG-285` が認めた `audit-ch5.py` の `NOT_YET_CALLED` であり、基準線のファイルではない）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **波 A と波 B2 は、どの `CH-` も直接には前へ進めない —— 基盤の作業である。** 利用者に見える振る舞いを 1 つも変えず、`frameLoop` の `let` 66 のうち 12 を 1 つの形に揃える。

⭐ **波 B1（`JDG-283`）だけが見える振る舞いを 1 つ変え、`CH-4`（すぐわか、`GL-006`）を前へ進める** —— プロパティパネルを出していないとき、画面の右端はスクロールバーのものになる。いまは右端へポインタを投げてスクロールバーを掴もうとした押下がパネルを開く（`JDG-283` の理由）。

守るもの:
- **`GL-003`（ぬるサク）** —— 何も変わらない出来事では同じ参照を返す（表 T-249 の `SF-3`）ので、`NFR-010` を割らない。性能の合否は `JDG-50`（段 0 の値より悪くしない）。⚠️ 波 B2 で `LM-19` の手順で測る。**測る前に利用者を呼ぶ**（`RISK-001` の門）。
- **全画面表示の求め** —— 表 T-075 の `UF-48` の MUST（入口の入力を受けたその呼び出しの中で、フレームを待たずに出す。`JDG-125` の由来）を、副作用の実行の置き場を変えても保つ（第 6 節）。

### ② レビュー観点のどの条項を当て、何が出たか

（`docs/development-rules/07-review-standards.md`）

- **`R2` 命名** —— ⛔ **1 つの名が 2 つの概念を指している**: `ScreenSession` は `CR-379` の決定 4 が `UseCase` の集約の名に選んだが、`src/adapter/screen-renderer/screen-renderer.ts:402` に描き手の入力の型として既に在る（決定 4 は `docs/spec` しか測らなかった）。⇒ 決定 2（第 4 節）。出来事は過去形（`SF-1`）—— 付録の `EV` 30 行はすべて過去分詞で終わることを確かめた。
- **`R2.2`（SRP）** —— 遷移は軸ごとの関数に分け、1 つの `switch` に集めない（`SF-8`）。⚠️ 出来事 30 種の `switch` は 30 分岐になり、検査 60 の帯（15 分岐）を越える ⇒ 決定 12。
- **表 T-276（ユニットを割る基準、`CR-432` が当てた）** —— 新しい 3 ユニットを `UD-1`（変更の理由が 1 つ）・`UD-3`（3 つとも `pure` であることは理由にしない）・`UD-4`・`UD-5`（迷いの試験）で 1 つずつ確かめた ⇒ 決定 14（第 3.1 節の後の表）。
- **`R2.19`（コンポーネント境界）** —— 新しいコンポーネントも公開エントリ 1 つだけを外へ見せる。試験も公開エントリを通す。
- **`R4` グリッジ** —— `step` は次の状態を丸ごと返し、シェルは参照 1 つを差し替える（`SF-2` ・ `SF-7`）。遷移表と関数は契約試験で結ぶ（表 T-250 の `SD-3`）。
- **`R4` レースコンディション** —— 副作用は値として返し、結果は出来事で戻す（`SF-6`）。
- **`R7.1` / `R7.2` / `R7.9`** —— 遷移（`pure`）と副作用の実行（`non-pure`、シェル）を別の層に置く。
- **`R6`** —— 契約試験は（状態, 出来事）の組を列挙する。仕様だけを読む別の体に書かせる（`spec-driven-tests-by-another-agent` の作法）。
- **`R2.18`** —— 表 T-070 の `MN-9` が既に状態機械を覆っている。新しい行は要らない。

### ③ 利用者に問うたこと・**問わずに決めた**こと

**問うて裁定を得た**: `JDG-283`（`PND-451`）。問う前に打った 3 つの反証は第 5 節に残した。
**当てる巡で問うて裁定を得た**: `JDG-285`（2026-09-21、逐語「推奨の Aとせよ」）—— 波 A の `AdvanceScreenSession` はまだ呼び手を持たない（入ってくる辺は波 B2）ので、検査 33（`audit-ch5.py` の「呼ばれないコンポーネント」）が赤になった。⭐ 波 A は `audit-ch5.py` の `NOT_YET_CALLED = {AdvanceScreenSession: 'CR-436 wave B2'}` を持って着地する。⛔ 波 B2 はその項を消す（呼ぶ辺が入ると検査が赤にする —— 第 6 節）。

**問うこと**: ⭐ **なし（0 件）。**

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | **3 つの波に割る**（第 3 節）: 波 A はいま当てる（`src/adapter` ・ `src/framework` に触らない）。波 B1（`JDG-283`）と波 B2（シェルへの結線）は段 5・段 6 の完了を待つ | 計画の状態表の段 7 の入口「段 2b・5・6」（`docs/development-records/refactor-plan-report-2026-09-13.md:98`）と `docs/development-records/handoff-state-machine.md` の §3（「①②③ は段 5・6 と並行してよい」「④ は並行できない」）。`CR-379` の決定 3（表 T-075 / T-064 の行はコードと同じ波。検査 18・26b） |
| 決定 2 | **`ScreenSession` は改名ではなく移行で片づける。** 名は `UseCase` の集約が持つ（`CR-379` の決定 4 を保つ）。`Adapter` の袋の型は波 B2 で消え、描き手は集約（読むだけ）と、シェルが並べて渡すフレームの値の入力を読む。どの欄がどちらへ行くかは第 4 節 | 計画の記録 12 の置き場の表「描き手はセッションを読む」（`refactor-plan-report-2026-09-13.md:474`）を `JDG-60` が了承している（`rulings.md:137`）。袋の 34 欄のうち 10 欄は第 1 領域の状態そのものである（第 4 節）。⇒ 同じ状態を 2 つの型が持つ形を残すほうが `R1.3`（唯一の正）に反する |
| 決定 3 | **波 A では、領域の状態の型を `UseCase` の新しいユニットに置き、`ScreenState`（`CP-36`）の欄を変えない。** 波 B2 で、`CR-379` の決定 8 のとおり `ScreenState` へ移す（生成器の出力先を 1 か所変えるだけにする） | `ScreenState` の欄を変えると、`screen-state.ts` を import する `src/` の 8 ファイル（うち `src/adapter` 6、`src/framework` 1。`grep -rlE "from .*screen-state/screen-state" src`）が動く。波 A は他セッションの持ち場に触らない |
| 決定 4 | **原稿の軸の読み方**: `SM` の行のキーから親のキーを除いた残りが 2 語（`armed.none`）なら「軸.種類」で、同じ親の下の別の軸は直交する（`SF-8` の合成）。1 語（`expanded`）なら親の単一の共用体の種類である | 表 T-250 の `SD-1` は「親（入れ子）」を持つが直交の親を持たない。第 1 領域は独立な軸を 12 持つ（付録）ので、1 つの共用体にすると組が掛け算で増える。キーだけで決まるので、生成器が機械で読める |
| 決定 5 | **ガードが他の領域や文書の値を読むとき、その値は出来事が運ぶ。** 詰めるのは公開エントリ `advanceScreenSession`（根の状態を持つ）と、波 B2 の入力の翻訳係である | `SF-2` の署名 `step(state, event)` を保つ。`agentApiEnabled`（Agent API の領域）、`hasDaysToPlace`（文書）、`noSurfaceNoConfirmation`（通知の領域）がこれに当たる |
| 決定 6 | **`TN` の 1 行は出来事を 1 つだけ持つ。** 元の状態は選択肢の列を許し、1 つの選択肢は ` & ` でつないだ軸の連言でよい | 表 T-250 の `SD-3` の欄「出来事」は単数。契約試験は（状態, 出来事）の組で数えるので、2 つの出来事を持つ行は組の数え方を曖昧にする。調査の下書きの 4 行（旧 TN-43・44・45・47）を割った |
| 決定 7 | **領域をまたぐ優先順の表（`SD-4`）と、その順を `IN-4` の本文と機械で突き合わせる方法は、波 B2 で置く。** 波 A の `escapePressed` は、消費する段の名（`IN-4` の段の語）を呼び手から受け取る | `CR-379` の決定 6 が「原稿を作る波で決める」と延ばした件。波 A では `Esc` を振り分ける呼び手がまだ無い（公開エントリを読むのは試験だけ）。⇒ 決めるのは、振り分けを最初に行う波 B2 である。そこで生成器の `--check` が `IN-4`（`docs/spec/01-04-requirements.md:6795`）の「消費する階層は … の順」を読んで原稿の段の並びと比べる（⭐ 決めておく中身）。行 ID の接頭辞はそのとき測って登録する |
| 決定 8 | **ツールチップの軸（`SM-32` ・ `SM-33` ・ `EV-30`）を第 1 領域に入れる。** 消したあと戻すのは「待ちが満ちた」という時間の出来事とする | `CR-379` の 2b-B の表が `CP-36` の広げ先に「出ている説明（`IN-3`）」を入れている（同書 :171）。いまのコードはポインタが 1 画素動けば戻す（`frame-loop.ts:4160`）が、`SF-5` は移動ごとの出来事を禁じる。出るかどうかは `EZ-2`（`01-04-requirements.md:6219`）の待ちで決まり、待ちは移動のたびに始め直す（`frame-loop.ts:4159`）ので、見え方は変わらない |
| 決定 9 | **生成器は 2 本**: `docs/spec/_source/state_machines_json_to_md.py`（表と図を `docs/spec/_assets/tbl-state-machines.md` へ）と `tools/generate_state_machine_types.py`（判別共用体と遷移表の定数を領域のユニットの生成区画へ）。どちらも `--check` を持ち、`gen` / `gen:check` に登録する | 前例の形そのまま —— 設定値は `_source/settings_json_to_md.py`（刊行物）と `tools/generate_entity_types.py`（`src/` の型の区画）の 2 本である（`package.json` の `gen:settings` と `types`） |
| 決定 10 | **波 A の 表 T-075 の新しい 3 行（`UF-84` 〜 `UF-86`）の「負う要求」は、3 つとも `—` とする。** 波 B2 で、結線した後に最初に開くユニットが変わる要求を、5.3 の規則（同じ要求を 2 つ以上の行に書かない、MUST NOT）どおり、いまの行から消して新しい行へ**移す**。候補といまの持ち主（2026-09-21 に `1616d28d` で実測）: `FR-072`（`UF-64` `properties-panel.ts`、`OW-1`）・`FR-053` と `FR-071`（`UF-59` `screen-state.ts`、`OW-2`）・`FR-066`（`UF-68` `dialogue-field.ts`、`OW-2`）。移すときの区分は 表 T-277 で決め直す（遷移の値を持つ最も内側のユニットは `screen-values.ts` なので、層を跨ぐものは `OW-2`） | ⭐ 欄に書くのは「その要求が動いたときに**最初に開く**ユニット」だけである（5.3、表 T-075 の前の段）。波 A では画面がこのユニットを 1 度も呼ばない（読むのは試験だけ）ので、要求が動いたときに最初に開くファイルはまだ変わらない —— いま `FR-072` を `screen-values.ts` に書けば、`properties-panel.ts` と 2 行に同じ要求が立つか、動いている画面のファイルから要求を外す嘘になる。`—` は 5.3 が「何も負わないユニット」に定める書き方であり、規則を持つユニットでも前例がある（`UF-8` ・ `UF-9` ・ `UF-62`）。<br>⭐ **ラチェットは上がらない** —— 基準線 `.claude/skills/spec-graph-check/requirement-owner-baseline.txt`（`unfilled=17`）と契約試験 `tests/contract/cr-435-every-requirement-names-a-unit.contract.test.ts` が数えるのは、欄に 1 度も名指されない**要求**の数であって行の数ではない。`—` の行を足しても名指しは 1 つも増減しない。波 B2 の「移す」も同じ要求を別の行へ動かすだけなので 17 のまま。⚠️ 例外は下がる向きだけ —— 付録の `EV-18` ・ `TN-33` が根拠にする `FR-091` は未記入の 17 件（「仕様が起点のユニットを決めていない」12 件）の 1 つであり、波 B2 がその起点を決めれば 16 に下がる（そのコミットで基準線を下げる —— 数を利用者に見せてから前に立つ者が書く） |
| 決定 11 | 行 ID: `CP-39` ・ `PI-39`（`CR-379` のとおり）、`UT-11`、`UF-84` 〜 `UF-86` | 上の識別子の段（本書の帯の先頭） |
| 決定 12 | **領域の `step` は出来事の種類から軸ごとの関数を引く表（`Record<出来事の kind, 関数>`）で振り分け、`switch` にしない** | 検査 60（帯 50 行 / 15 分岐）。`Record` の鍵の網羅は型が見るので、`SF-4`（`never` による網羅）と同じ強さを保つ。軸ごとの関数は帯の内側に収める |
| 決定 13 | **`CP-36` に `S-144` を足す直しは波 A で当てる**（`ScreenState` の広げは波 B2） | 文言だけの直しで、`PI-36`（`05-07-design.md:517`。起草時は :506）とコード（`screen-state.ts` の `watermarkVisible`）は既に持っている。`CR-379` の :68 が見つけ、いまも欠けている（`05-07-design.md:141` に `S-144` 0 件。2026-09-21 に `1616d28d` で実測） |
| 決定 15 | **`SM-21`（`properties.documentSettings`）は運ぶ値 `returnSubject` を持つ**（当てる体が決めた）。無いこともある | `FR-072` の「もう一度同じ入口を押したら直前の選択物へ戻す」（`TN-27`）は、設定を出しているあいだ戻す先を覚えていなければ書けない。⚠️ 戻す先が無いとき（`TN-25` で出していない所から設定を出したとき）に何を出すかは `FR-072` が決めていない ⇒ `DFC-677` |
| 決定 16 | **`emptyScreenSession` の `language` は `null` で始まる**（当てる体が決めた） | `S-99` は既定値を持たない（`_assets/tbl-settings.md` の 表 T-206 で既定値の欄が `—`）。起動時の言語は `localStorage` と環境から決まる（`frame-loop.ts` の `startupDisplayLanguage`）ので、その値は波 B2 で入力の翻訳係が出来事で運ぶ |
| 決定 14 | **`AdvanceScreenSession` を 3 ユニットに割る理由は変更の理由である（表 T-276 の `UD-1`）。純粋性ではない（`UD-3`）。** 各ユニットの出どころと迷いの試験は第 3.1 節の後の表 | `05-07-design.md:272`「ユニットは 表 T-276 の基準に従って割ること（MUST）」。表 T-249 の `SF-8` が「`step` は領域ごとのユニットに分ける」と既に定め、その理由を `R2.2` と `UT-2` の形に置いている |
| 決定 17 | **表 T-284 の行に `SS`（Shared Step）、表 T-285 の行に `RA`（Region Addition）を新しく登録する**（前に立つ者が決めた） | 1 つの接頭辞に 1 つの意味。既存の `SF`（形の条）・ `SD`（原稿が持つもの）・ `PI`（コンポーネントの公開メンバの組）・ `WS` ・ `BO`（別の手順）はどれも意味が合わない |
| 決定 18 | **`SS-5`（`advanceScreenSession`）は、出来事が触れない領域が 1 段の後も同じ参照のまま残ることを約束する（`SF-3` ・ `SF-8`）。領域の中の触れない軸も同じ参照のまま残る（遷移の表に無い組は `SD-3`）**（前に立つ者が決めた） | コードは `{ ...session, screen: step.state }` で既にそうしている。`SF-3` は状態全体が変わらないときしか言わないので、合成の側の約束を表に置いた。図 F-028 の下の段が同じことを描く |
| 決定 19 | **`RA-8`（性能）は `LM-19` の手順と「`LM-19` が記す 2026-09-14 の実測より悪くしない」だけを書く。「利用者を呼ぶ」は仕様に書かない**（前に立つ者が決めた） | 段 0 の基準線は `LM-19` が持つ。`JDG-50` は裁定であり仕様から引けないので、それを運ぶ行（`LM-19`）を引いた。利用者を呼ぶのは作り方であって製品の仕様ではない（波 B2 の「利用者を呼んでから」は本書に残る） |
| 決定 20 | **`UT-11` のユニットの欄を直す段は `RA-4` として独立に置く。検査の番号は仕様に書かない。図 F-027 の前文は「`CR-436` の波 B2」と書かず「移行の次の段で入る」と書く**（前に立つ者が決めた） | 規則 02 の 4 節「仕様書は機械検査の番号を 1 度も引いていない」。`UT-11` の欄と `src/` を突き合わせる機械検査は無い（`audit-ch5.py` は 表 T-063 の行数と、割ったコンポーネントが 表 T-075 で 2 行以上あることだけを見る）ので、`RA-4` の「止めるもの」はそう書いた。md-checks の検査 7 は仕様の中の `CR-436` を「定義の無い行 ID」として赤にする（2026-09-21 に実測） |

---

## 1. 測った事実（`2112d0c9`、2026-09-21）

| 数 | 値 | 測り方 |
|---|--:|---|
| `frameLoop` の範囲 | 1799〜4414 行 | `grep -nE "^(export )?(async )?function frameLoop"` と、その本体の閉じ |
| `frameLoop` が直に持つ `let` | **66** | `sed -n '/^export function frameLoop/,/^}/p' src/framework/single-html-shell/frame-loop.ts \| grep -c "^  let "`。調査の報告の値（構文木で数えた 66）と一致した |
| `Adapter` の `interface ScreenSession` の欄 | **34** | `src/adapter/screen-renderer/screen-renderer.ts:402` の本体の `^  readonly` を数えた |
| その名を持つファイル | `src/` 10（`screen-renderer/` の 9 ＋ `frame-loop.ts`）、`tests/` 43 | `grep -rl "ScreenSession" src tests` |
| `FrameValues` の名 | 既に在る | `src/framework/single-html-shell/frame-loop.ts:175`（シェルのフレームの値）。⇒ 描き手へ渡すフレームの値の入力に、この名を使えない |
| 同じ名の `export` の型が 2 コンポーネントに在る前例 | 1（`ImportRefusal`） | `grep -rhoE "^export (interface\|type) \w+" src \| sort \| uniq -d`。⇒ 同名を赤にする検査は無い（名の衝突を止めるのは `R2` の読みだけ） |
| `src/use-case/` のフォルダ | 9。`advance-screen-session/` は無い | `ls src/use-case` |
| `docs/spec/_source/state-machines.json` | 無い | `ls docs/spec/_source` |
| 表 T-062 ・ T-063 ・ T-064 ・ T-075 の行 | 36 ・ 7 ・ 36 ・ 68 | `grep -cE "^\| (CP\|UT\|PI\|UF)-[0-9]+ \|" docs/spec/05-07-design.md` |
| `components.json` | nodes 36、edges 138 | `python -c` で `len` |
| `frame-loop.ts` を import する試験 | **77** | `grep -rlE "from ['\"][./]*.*single-html-shell/frame-loop" tests \| wc -l`（計画の 56 は古い） |
| `CP-36` が名指す設定値 | `S-99e` ・ `S-99f` ・ `S-99g`（`S-144` は 0 件） | `sed -n 141p docs/spec/05-07-design.md` |
| `PND-451` の仮置き | `frame-loop.ts:4169`〜`:4178`（`@provisional PND-451`） | 読んだ |
| 出していないパネルの境界の帯を出す所 | `src/adapter/screen-renderer/screen-frame.ts:105`（`dividerAt('propertiesPanel', …)` を無条件に並べる） | 読んだ |
| `PND-451` を主張する試験 | 0 | `grep -rl "PND-451" tests` |
| `fitHeldForNoPlace` ・ `bandCeilingFrom` を台帳が知っている数 | 0 ・ 0 | `grep -c` を `defects.md` と `pending-decisions.md` に |

⭐ **調査の報告（`sm-inventory-2026-09-21`、前に立つ者の scratchpad）は仮説として受けた。** 本書が頼った事実はすべて上か付録で `file:line` を測り直した。付録の根拠の行は、定義の行（表なら第 1 セルがその ID の行、要求なら `**UID**:` の行）を `grep -nE "^\| <ID> \|"` で引き直し、要求の中の文を指すものは `sed -n <n>p` で中身を読んだ。

---

## 2. グラフ

### 2.1 `impact.py`（依頼された 5 つ）

`PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <行>`:

| 種 | 属する表 | 指している要求 / 参照 | 指している箇所 |
|---|---|---|---|
| `CP-18` | T-062（`05-07-design.md:125`） | 0 / 2 | 5.3 の `:388` ・ `:523` |
| `CP-25` | T-062（`:131`） | 0 / 9 | 5.2 の `:183`、5.3 の `:242` ・ `:281` ・ `:527` ・ `:528`、5.5 の `:849` ・ `:850` ・ `:851` ・ `:853` |
| `CP-36` | T-062（`:141`） | **2** / 5 | `FR-013`（`01-04-requirements.md:2964`）・ `FR-107`（`:3730`）、5.3 の `:414` ・ `:490`、5.6 の `:909` |
| `LY-3` | T-060（`:55`） | 0 / 2 | 5.3 の `:316` ・ `:318` |
| `UF-48` | T-075（`:404`） | **1** / 1 | `FR-071`（`01-04-requirements.md:4644`） |

⇒ 動かす 5 行を指す要求は 3 本（`FR-013` ・ `FR-107` ・ `FR-071`）。どれも本書で文言を変えない。`CP-36` の広げ（波 B2）は `FR-013` / `FR-107` の「覚えた実績」の文を読んで、その項目を残す。`UF-48` の書き換え（波 B2）は `FR-071` が指す全画面表示の文を残す。

**届いた行を `rulings.md` で引いた**: `CP-18` ・ `CP-25` ・ `CP-36` ・ `LY-3` は 0 件。`UF-48` は 1 件（`JDG-125`、全画面表示の不具合 —— 決定 1 の守るものに入れた）。`FR-013` 5 件・`FR-107` 5 件（`JDG-44` ・ `JDG-178` ・ `JDG-187` ・ `JDG-234` ・ `JDG-239` ・ `JDG-276` ほか。どれも進捗マーカーの押下の巡りと覚えた実績を戻すことであり、本書は `EV-29` で「覚えた実績を書き換える」遷移を名指すだけで巡りの中身に触れない）。`FR-071` 1 件（`JDG-125`）。⇒ **裁かれた行と導いた条項の衝突は 0。**

### 2.2 `induced.py`

種 23（`LY-3 CP-18 CP-25 CP-36 UF-48 UF-59 PI-18 PI-25 PI-36 T-062 T-063 T-064 T-075 T-074 SU-1 SU-3 MN-2 FR-052 GR-22 S-99h T-249 T-250 IN-4`）: **23 種すべて解決、種の間の辺 16、閉路 1（`FR-052` ⇄ `GR-22`）。**
⇒ ⛔ **波 B1 は `FR-052` と `GR-22` を 1 つの計画・1 度の編集で書く**（第 5 節）。ほかは 1 対象ずつ書いてよい。
⚠️ 新設の 表 T-280 〜 T-282、`CP-39` ・ `UT-11` ・ `PI-39` ・ `UF-84` 〜 `UF-86` はまだ無いので種にできない。当てた後にもう一度走らせる。
⚠️ 表 T-276（`UD-1` 〜 `UD-5`）は上の種を取ったあと（`56de8f06`）に入り、表 T-277（`OW-1` 〜 `OW-5`）は種に入れていない。波 A が触るのは表 T-063 と 表 T-075 の行を足すことと、`:272` の MUST に従うことだけで、両表の行は変えない —— 当てる体は、当てた後の `induced.py` の種に `UD-1` と `T-277` を足して走らせる。

---

## 3. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A** | なし（いま当ててよい） | `docs/spec/_source/state-machines.json`（新）と schema、生成器 2 本、`docs/spec/_assets/tbl-state-machines.md`（生成）、`docs/spec/05-07-design.md`（5.1 の `LY-3`、5.2 の `CP-36` の `S-144` と `CP-39`、5.3 の表と散文、5.5 の散文、追補で 5.6 の 図 F-027 ・ 図 F-028 ・ 表 T-284 ・ 表 T-285）、`docs/spec/_source/row-id-prefixes.json`（`pending` を外す。追補で `SS` ・ `RA` を登録）、`docs/spec/_source/components.json`、`src/use-case/advance-screen-session/`（新 3 ファイル）、`tests/contract/` と `tests/unit/` の新しい試験、`package.json` の 2 項目。<br>当てた巡で足したもの: 検査の道具（`check.sh` の 27、`check-provenance.py`、`.claude/hooks/check-after-edit.py`、`audit-ch5.py` の 表 T-063 の行数と `NOT_YET_CALLED`（`JDG-285`））、`tests/contract/spec-table.ts` の `FILES`、`tests/contract/units.contract.test.ts` の数、`docs/development-rules/03-implementation.md` の生成定数の一覧、`docs/development-records/changelog.md` の版 0.29 の「2 つより多いユニットを持つのは」の文（⭐ 過去の行を書き換えるのは、版 0.29 の同じ文を直した前例 `e33e4f3c` に倣った —— 検査 33 がその文を表 T-075 と突き合わせる） | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ 21（出どころ）・ 27（`gen:check`）・ 30（生成した定数）・ 33（5 章の自己監査）・ vitest |
| **B1** | 段 5 と段 6 が済み、`src/adapter` と `src/framework` が本セッションへ渡っている | `docs/spec/01-04-requirements.md` の `FR-052` と 表 T-023d の `GR-22`（1 度に）、`screen-frame.ts:105`、`frame-loop.ts:4169`〜`:4178` の削除、試験 1 本 | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e の境界とスクロールバー |
| **B2** | 段 5 と段 6 が済み、波 B1 が当たっている | ⛔ `audit-ch5.py` の `NOT_YET_CALLED` から `AdvanceScreenSession` を消す（`JDG-285`。呼ぶ辺が入ると検査 33 が赤にする）、シェルへの結線（handoff の ④）、`CP-18` ・ `CP-25` ・ `CP-36` の広げ ・ `UF-48` ・ `PI-18` ・ `PI-36` ・ `PI-39`、描き手の入力の移行（第 4 節）、`let` 12 の削除、優先順の表 `T-283`、`components.json` の辺 | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部、`LM-19` の性能（利用者を呼んでから） |

⭐ **波 A は段 5・段 6 と並行してよい** —— 触るのが `docs/spec/`（仕様の適用は 1 セッションだけで行う —— 規則 05）、`docs/spec/_source/` の新しい原稿、`src/use-case/` の新しいフォルダ、新しい試験だけで、他セッションの持ち場（`src/adapter` ・ `src/framework` ・段 4 の 4 ファイル）と重ならない。
⛔ **波 A は `Adapter` の `ScreenSession` に触らない**（決定 2。移行は波 B2）。
⚠️ 波 A の `CP-39` の辺は `UseCase` → `Entity` だけである（見込みは `ScreenState` の `DualCursorSide` と構えの型、`Selection` の型。当てる体は `EG-2` ・ `EG-3` で数えた辺だけを足す）。
⚠️ **パネルが運ぶ `subject` の型は、いま `Adapter` にある**（`PropertiesSubject`、`src/adapter/screen-renderer/screen-renderer.ts:397`。`selection` と `groupIds`）。`UseCase` は `Adapter` を読めない（表 T-061）ので、波 A は同じ形の型を `session-step.ts` ではなく `screen-values.ts` に置き、波 B2 で `Adapter` 側を消して集約の型を読ませる（第 4 節と同じ移行）。入ってくる辺（シェルと描き手から）は波 B2 で足す —— 検査 59 は「コード ⊆ 図」なので、先に図へ足しても赤にはならないが、呼ぶ者のいない辺を図に描くのは嘘になる。

### 3.1 波 A の中身

| 対象 | いま | 案 |
|---|---|---|
| **原稿** `docs/spec/_source/state-machines.json` と `state-machines.schema.json` | 無い | 付録の `SM` 34 ・ `EV` 30 ・ `TN` 53 を、領域 `screen` の下に置く。項目は表 T-250 の `SD-1` 〜 `SD-3` の「持つもの」だけ。`$comment` で役（原稿であること、何を生成し、何で作り直すか）を名乗る（検査 21） |
| **生成器** | 無い | 決定 9 の 2 本。`--check` は生成物が原稿と 1 バイトでも違えば落ちる。加えて、`SM` の各行の根拠の ID が `docs/spec` に定義されていること、`TN` の元と先のキーが `SM` に在ること、`TN` の出来事が `EV` に在ること、各共用体の初期がちょうど 1 つであることを見る |
| `package.json` | —— | `machines` / `machines:check`（md）、`machines:types` / `machines:types:check`（型）を足し、`gen` と `gen:check` の列に入れる |
| **生成する表と図**（`docs/spec/_assets/tbl-state-machines.md`） | 無い | **表 T-280 — 画面の値の状態**、**表 T-281 — 画面の値の出来事**、**表 T-282 — 画面の値の遷移**、**図 F-026 — 画面の値の状態遷移**（`stateDiagram-v2`、軸ごとの並行の区画）。⚠️ 見出しの番号は原稿が持ち、生成器が刷る |
| **5.5 の散文**（`05-07-design.md` の 表 T-250 の後） | 原稿の規則だけ | 1 段: 「第 1 領域（画面の値）の状態・出来事・遷移を `_assets/tbl-state-machines.md` の 表 T-280 ・ 表 T-281 ・ 表 T-282 に、状態遷移を 図 F-026 に示す。軸の読み方は …（決定 4 の 1 文）」 |
| **登録簿** | `SM` ・ `EV` ・ `TN` は `pending: true`、`words` が空 | `pending` を外し、`words` を `State Machine` ／ `EVent` ／ `TransitioN` とする（⛔ 行を持つ `pending` は生成器が落とすので、行と同じ波）。`npm run gen:prefixes` |
| 表 T-060 `LY-3` | 文書を変える操作と、確定までの手順。取り込みの検証。変更の通知 ／ 操作と検証は `pure`、確定と通知は `non-pure` | ＋「保存しない画面とセッションの流れの遷移（出来事から次の状態と副作用を決める）」／ 純粋性に「遷移は `pure`」 |
| 表 T-062 `CP-36` | 構え … `S-99e` / `S-99f` / `S-99g` と、覚えた実績 | `S-99g` の後に `S-144` を足すだけ（決定 13） |
| 表 T-062 に `CP-39` | —— | `UseCase` ／ `AdvanceScreenSession` ／ 「保存しない画面とセッションの流れを、出来事を受けて 1 段進め、次の状態と副作用の列を返す。副作用を実行しない」／ 正「5.6 の ADR-002 ／ 表 T-249 ／ 表 T-250 ／ 表 T-280 〜 表 T-282」。⚠️ 表 T-062 は `CP-n` の順なので `CP-38` の後、`UseCase` の行と離れる（`CP-32` 〜 `CP-38` と同じ扱い） |
| 表 T-063 に `UT-11` | —— | コンポーネント `AdvanceScreenSession` ／ ユニット `advance-screen-session.ts` ／ `session-step.ts` ／ 領域ごとのファイル（いまは `screen-values.ts`）／ 割った理由（下の文をそのまま入れる）:<br>「**変更の理由が 3 つある**（表 T-276 の `UD-1`）—— 公開エントリは領域の合成と、ほかの領域や文書の値を出来事へ詰めることを負い（表 T-249 の `SF-8`）、`session-step.ts` は全領域が共有する 1 段の形を負い（表 T-249 の `SF-2` ・ `SF-3` ・ `SF-4` と 表 T-250 の `SD-3`）、領域ごとのファイルはその領域の状態・出来事・遷移の表を負う（画面の値は 表 T-280 〜 表 T-282）。<br>**純粋性ではない** —— 表 T-075 のとおり 3 つとも `pure` である（`UD-3`）。<br>領域が増えるたびに領域のファイルが 1 つ増える（`UT-2` ・ `UT-7` と同じ形）—— 画面の値の遷移が変わっても 1 段の形は変わらない」<br>⚠️ 表 T-063 は `UT-n` の順なので、本線の `UT-8` 〜 `UT-10` が先に当たっていればその後、当たっていなくても `UT-7` の後に置く（欠番は本線が埋める） |
| 表 T-064 に `PI-39` | —— | `ScreenSession`（型。根の状態。領域の合成（`SF-8`）で、いまは画面の値の領域だけ）／ `SessionEvent`（型。全数は 表 T-281）／ `SessionEffect`（型。副作用の名の全数は 表 T-282 の副作用の欄）／ `emptyScreenSession`（初期の状態。表 T-280 の初期の欄）／ `advanceScreenSession`（1 段進める。何も変わらないときは受け取った参照を返す —— `SF-3`） |
| 表 T-075 に 3 行 | 68 行（最大 `UF-71`） | 欄は「行 ID ／ コンポーネント ／ ユニット ／ 純粋性 ／ 責務 ／ 負う要求」の 6 つ（`CR-435` が 6 つ目を足した）。<br>`UF-84` ／ `AdvanceScreenSession` ／ `advance-screen-session.ts` ／ `pure` ／ 「領域ごとのファイルを束ねて公開し、根の状態を持って 1 段進める。ほかの領域や文書の値を出来事へ詰める」／ `—`。<br>`UF-85` ／ 同 ／ `session-step.ts` ／ `pure` ／ 「全領域が共有する 1 段の形（`Step` ・ `unchanged` ・ 共有の空の副作用の列 ・ `assertNever`）」／ `—`。<br>`UF-86` ／ 同 ／ `screen-values.ts` ／ `pure` ／ 「画面の値の領域の遷移（表 T-280 〜 表 T-282）と、そこから生成した型と遷移表の定数の区画」／ `—`（決定 10）。<br>⛔ `UF-84` の責務を `CP-39` とだけ書かない —— 5.3 は「責務の欄が `CP-n` を指しているとき、そのユニットは 表 T-062 のその行の責務をそのまま負う」と読むので、1 段進める中身を `UF-86` が負う形と食い違う（前例は `UF-10` ・ `UF-60` の「束ねて公開する」）。<br>`CP-n` の順で `UF-71` の後（`CP-39` が最後のコンポーネントなので、本線の `UF-72` 〜 `UF-83` がどこへ入っても表の末尾） |
| 表 T-074 `SU-1` / `SU-3`、5.3 の散文（`:297` ・ `:318`）とディレクトリ木の `use-case/`（`:306` 〜 `:309`）、`MN-2`（`:915`）。行番号は 2026-09-21 に `1616d28d` で実測 | `SU-1` 36 ／ `SU-3` 68（同） | `SU-1` と `:297` ・ `:318` ・ `MN-2` は ＋1、`SU-3` は ＋3。⛔ **足す先の数は当てる時に測り直す** —— 本線も `SU-3` を動かす（`CR-432` は 68 → 80 を最後の波で書くと定める。handoff の 1 通目の 2 の ④）。⇒ `SU-3` は「当てる時の 表 T-075 の行の数 ＋ 3」、`SU-1` は「当てる時の 表 T-062 の行の数 ＋ 1」とし、どちらも本線の最後の波と同じ数え方にそろえる。木に `advance-screen-session/` |
| `components.json` | nodes 36 ／ edges 138 | node `AdvanceScreenSession` を `UseCase` の枠へ、辺 `AdvanceScreenSession → ScreenState` と `AdvanceScreenSession → Selection`（表 T-247 の `EG-2` ・ `EG-3` で数えたものだけ）。`build.py` で図と `docs/review/components/components.md` を作り直す（draw.io の CLI が要る） |
| `src/use-case/advance-screen-session/` | 無い | 3 ファイル。`session-step.ts` は `Step<S, E> = { state: S; effects: readonly E[] }`、共有の空の列、`unchanged(state)`、`assertNever`。`screen-values.ts` は軸ごとの関数と、決定 12 の振り分け表。公開エントリは根の状態を持ち、決定 5 の値を出来事へ詰めて領域へ渡す。⛔ モジュールスコープの可変状態を置かない（検査 61、`SF-7`） |
| **契約試験** `tests/contract/state-machine-screen-values.contract.test.ts` | 無い | 原稿を読み（生成物ではなく原稿 —— 2 つが一致することは `--check` が別に見る）、(1) 各軸の各種類 × 各出来事で、`TN` に行がある組は先の種類が表と一致すること（ガードは真偽の両側を出来事の値で作る）、(2) 行の無い組は受け取った状態と同じ参照と共有の空の列を返すこと（`SD-3`）、(3) 連言の元（`TN-19` ・ `TN-23`）はその組み合わせを作って確かめること。⭐ 書くのは仕様だけを読む別の体 |
| **追補: 5.6 の図 2 つ**（`05-07-design.md` の 表 T-249 の後） | 共通の状態機械は ADR-002 ・ 表 T-249 ・ 表 T-250 ・ `PI-39` の文だけで、図が無い | **図 F-027 — 1 つの出来事の 1 巡**（`sequenceDiagram`。担い手は 表 T-062 の `InputCommandTranslator` ・ `SingleHtmlShell` ・ `AdvanceScreenSession`）と **図 F-028 — 根の状態の組み立て**（`flowchart`。根 → 領域 → 軸 → 種類と、1 つの軸だけに触れた 1 段の前と後）。前文がそれぞれを指す。⚠️ F-027 の前文は、翻訳係が出来事を作ることとシェルが呼ぶことが「移行の次の段で入る」と書く（決定 20） |
| **追補: 表 T-284 — 全領域が共有する 1 段の形** | 無い | `SS-1` 〜 `SS-6`: `Step<S, E>` ・ `NO_EFFECTS` ・ `unchanged` ・ `assertNever`（`session-step.ts`、`UF-85`）と `advanceScreenSession` ・ `emptyScreenSession`（`advance-screen-session.ts`、`UF-84`）。欄は「名前 ／ ユニット ／ 約束すること ／ 正」。前文「本表の名前と約束に従うこと（MUST）」。`SS-5` の約束は決定 18 |
| **追補: 表 T-285 — 領域を 1 つ足す手順** | 無い | `RA-1` 原稿 ・ `RA-2` 生成 ・ `RA-3` 領域のユニットと 表 T-075 の `UF` 行（同じコミット）・ `RA-4` 表 T-063 の `UT-11` のユニットの欄 ・ `RA-5` 根への合成と `PI-39` ・ `RA-6` 仕様だけを読む別の者の契約試験 ・ `RA-7` シェルへの結線 ・ `RA-8` 性能（決定 19）。「止めるもの」の欄は検査を番号でなく中身で名指す（決定 20）。前文「本表の段の順に従うこと（MUST）」 |
| **追補: 登録簿** | 161 件 | `SS`（Shared Step）と `RA`（Region Addition）を足し 163 件（決定 17）。`npm run gen:prefixes` |

### 3.1a 3 つのユニットを 表 T-276 で確かめる（決定 14）

| ユニット | 変更の理由（`UD-1` の出どころ） | 迷いの試験（`UD-5`）—— この欠陥はこのファイル 1 つ | 割らなかったら |
|---|---|---|---|
| `advance-screen-session.ts`（`UF-84`、公開エントリ） | 領域の合成（表 T-249 の `SF-8`）と、ガードが読むほかの領域や文書の値を出来事へ詰めること（決定 5）。どの領域の行が変わっても動かず、領域が増えるか、領域をまたぐ値の出どころが変わったときだけ動く | 「`agentApiEnabled` が出来事に入らず、`TN-35` 〜 `TN-37` のガードが常に偽になる」「根の状態に画面の値の領域が合成されていない」 | 領域の遷移と同居すると、画面の値の遷移を直すたびに合成も開くことになり、2 つ目の領域が来た日に割り直しが要る |
| `session-step.ts`（`UF-85`） | 全領域が共有する 1 段の形 —— 表 T-249 の `SF-2`（次の状態と副作用を 1 つの値で返す）・`SF-3`（何も変わらなければ同じ参照、空の列は共有の定数）・`SF-4`（`never` による網羅）と 表 T-250 の `SD-3`（表に無い組は同じ参照）。どの領域の要求が変わっても動かない | 「表に無い組で新しい参照が返る」が `unchanged` の側なら本ファイル、`unchanged` を呼び忘れた側なら領域のファイル —— どちらかは 1 回の読みで決まる（`unchanged` の中身は 1 行） | 公開エントリに置くと、領域のファイルが公開エントリを import し、公開エントリが領域のファイルを import する循環になる。領域のファイルに置くと、2 つ目の領域が 1 つ目の領域のファイルを import する —— 画面の値の都合で開くファイルに、全領域の形が載る |
| `screen-values.ts`（`UF-86`） | 画面の値の領域の行 —— 原稿 `docs/spec/_source/state-machines.json` の `screen` の下と、そこから刷る 表 T-280 〜 表 T-282、その根拠の要求（付録の根拠の列）。生成した型と遷移表の定数の区画も同じ原稿から来るので、出どころは 1 つ | 「`TN-n` の先が表と違う」「`EV-n` を受けて何も変わらないはずの軸が動いた」 | —— （領域 1 つにつきファイル 1 つ。`SF-8`） |

⭐ **純粋性は割った理由ではない** —— 3 つとも `pure` であり、`UD-3` は「純粋性が等しいことを割らない理由にしない」と言う。割った理由は上の変更の理由だけである。⇒ 表 T-063 の `UT-11` の文（第 3.1 節）もそう書く。
⚠️ 公開エントリと `session-step.ts` の出どころは、どちらも 表 T-249 の行である（別の行 —— `SF-8` と `SF-2` ・ `SF-3` ・ `SF-4`）。`UD-1` は出どころを「要求 ID・表・裁定」と書くので、同じ表の別の行を「互いに素」と読むのは本書の読みである。裏づけは上の迷いの試験（欠陥が 2 つのファイルに分かれて答えられる）と、循環を作らないという構造の理由の 2 つ。⇒ 覆すなら `session-step.ts` を消して公開エントリへ戻すのではなく、`screen-values.ts` へ寄せる形しか残らない（循環のため）。

**`UD-4`（割り方はコードの位置で裏づける）を新しいファイルにどう当てるか**:
- `UD-4` が縛るのは「いま在るコードを割ることを定める変更要求」である。⭐ **波 A は既存のファイルを 1 つも割らない** —— 3 つとも新しいファイルであり、`frame-loop.ts` は 1 行も動かさない（第 3 節、第 10 節）。⇒ 波 A の 3 ユニットには、割られる元の `file:line` が無く、`UD-4` の範囲の要件はかからない。
- ⚠️ ただし `UD-4` の狙い（「割るはずの処理が思っていたファイルに無い」ことを防ぐ）は、波 A でも付録の根拠の列が果たす —— `SM` / `EV` / `TN` の各行は、仕様の定義の行を `file:line` で指している。
- ⭐ **`UD-4` が効くのは波 B2 である** —— `frame-loop.ts` から 12 の `let` とその書き換えを `screen-values.ts` へ移すのは、既存のコードを割ることにほかならない。⇒ 波 B2 の変更要求は、移す処理ごとに `frame-loop.ts` の範囲を書くこと。いまの宣言の位置（2026-09-21 に `1616d28d` で実測）: `screenState` :1816、`isLevelZeroFolded` :1843、`isMilestoneListOpen` :1845、`isPaletteMinimised` :1846、`propertiesShowing` :1879、`propertiesSubject` :1880、`isPropertiesPanelPutAway` :1883、`isDialogueFieldVisible` :1886、`language` :1887、`isTooltipDismissed` :1916、`scaleMessage` :1921、`dualCursorFollowing` :1923。⛔ 書き換えの範囲はここに書かない —— 段 5・段 6 が `frame-loop.ts` を動かしている最中であり、波 B2 の入口で測る。

### 3.2 波 A の直前の測り直し（⛔ 当てる体が打つ）

1. 木が定義する表の番号がいくつまで在るか。本書の新しい表 3 つ・`図 F-026` ・ `CP-39` ・ `PI-39` ・ `UT-11` ・ `UF-84` 〜 `UF-86` がまだ使われていないこと（本線の `UF-72` 〜 `UF-83` と `UT-8` 〜 `UT-10` が当たっていても、帯が分かれているので重ならない —— それを確かめる）。
1a. 表 T-075 の「負う要求」の未記入の数（`tests/contract/cr-435-every-requirement-names-a-unit.contract.test.ts` と基準線の `unfilled=`）が、当てる前と後で同じであること（決定 10）。
2. 登録簿の件数と `SM` ・ `EV` ・ `TN` の `pending`。
3. 付録の根拠の行番号（`docs/spec/01-04-requirements.md` は並行して動く。行番号が動いていたら ID で引き直す）。

---

## 4. ⭐ `ScreenSession` の名の衝突 —— 移行で片づける（決定 2）

**名の行き先**:

| 名 | いま | 波 A | 波 B2（段 6 の後） |
|---|---|---|---|
| `ScreenSession` | `Adapter` の袋（`screen-renderer.ts:402`、描き手の入力） | `UseCase` の集約として `PI-39` に置く。⚠️ 2 つが同名で並ぶが、両方を import するファイルは 0（波 A の集約を読むのは試験だけ） | ⛔ **`Adapter` の袋を消す。** 名は集約だけが持つ |
| `PropertiesSubject`（パネルが出す対象） | `Adapter`（`screen-renderer.ts:397`） | 同じ形の型を `screen-values.ts` に置く（`UseCase` は `Adapter` を読めない） | `Adapter` 側を消し、描き手は集約の型を読む |
| 描き手へ渡すフレームの値の入力 | 袋に混ざっている | —— | 新しい型（仮称 `RenderFrameInput`）。⛔ `FrameValues`（`frame-loop.ts:175`）・`ScreenSession` ・「ScreenFrame」を含む名は使わない（`screen-frame.ts` は `UF-61` の別物）。名は波 B2 の変更要求が `R2` で決める |

⚠️ **並んでいるあいだ（波 A から波 B2 まで）の代償**: `grep ScreenSession` が 2 つの概念を返す。⇒ 波 A の公開エントリの冒頭の注記に「`Adapter` の同名の型は波 B2（`CR-436`）で消える」と書く。⛔ 波 A で `Adapter` 側を改名しない —— 他セッションの持ち場であり、改名して波 B2 で消すのは 2 度手間である。

**袋の 34 欄の行き先**（`screen-renderer.ts:402` の本体。`frame-loop.ts:1196` の `sessionOf` が組み立てる）:

| 行き先 | 欄 | 数 | 根拠 |
|---|---|--:|---|
| **集約・画面の値の領域（本書の波 B2）** | `language` ・ `isDialogueFieldVisible` ・ `isMilestoneListOpen` ・ `isPaletteMinimised` ・ `isLevelZeroFolded` ・ `dualCursorFollowing` ・ `propertiesShowing` ・ `propertiesSubject` ・ `scaleMessage` ・ `isTooltipDismissed` | 10 | 付録の `SM` の行。描き手は種類から導く（例: `isPaletteMinimised` は `screen.palette.shown.minimised` か） |
| **集約・ほかの領域（その領域の変更要求が移す）** | `openedFileName` ・ `fileSavedAt` ・ `mergeCandidates` ・ `unreadColumns` ・ `droppedTaskNames`（ファイル操作と問いの待ち）／ `isAgentApiEnabled`（Agent API）／ `isRecordingInteractions`（操作の記録）／ `selectedGroupIds` ・ `selectedResourceUids`（選択。`PND-142` ・ `PND-143`）／ `notices` ・ `confirmation`（通知・問いの待ち）／ `rowGrabbedAt`（身振り。掴んでいるかは状態、`resistedPx` ・ `atY` はフレームの値） | 12 | 棚卸し（`docs/development-records/refactor-stage1-state-inventory-2026-09-13.md`）の領域の欄。⭐ 波 B2 のあいだはフレームの値の入力に置き、移す領域の変更要求が 1 つずつ集約へ移す。段 7 の出口に「フレームの値の入力はフレームの値と文書から導く値だけ」を足す |
| **フレームの値（ずっと入力に残る。`SF-5`）** | `pointer` ・ `pointerRestedMs` ・ `iconUnderPointer`（`PND-141`）・ `taskUnderPointer` ・ `commandPaletteAt` ・ `rowBoxes` ・ `scrollExtent` | 7 | 座標・時刻・寸法。`commandPaletteAt` は掴んでいるあいだポインタに追従する座標である（`FR-053`、`01-04-requirements.md:4085`〜`:4088`） |
| **文書から導く値（ずっと入力に残る。`SF-10`）** | `themePreference` ・ `themeHue` ・ `canUndo` ・ `canRedo` ・ `aiExportDocument` | 5 | `frame-loop.ts:1249` ・ `:1250` ・ `:2262` ・ `:2263` ・ `:1240` が持っている文書から毎フレーム導く。`aiExportDocument` を出すかどうかは集約の `surface`（`U-30` 系の面が開いているか）が決め、中身は文書から導く |

⇒ 10 ＋ 12 ＋ 7 ＋ 5 ＝ 34。

**導き**: 計画の記録 12 の置き場の表「`Adapter` … 描き手はセッションを読む」（`refactor-plan-report-2026-09-13.md:474`）を `JDG-60` が了承した。同じ表の `Framework` の行「`SingleHtmlShell` がセッションの現在値を 1 つ持ち」とあわせると、描き手が読む「セッション」は集約である。フレームの値を集約に入れないのは `SF-5`、文書を入れないのは `SF-10`。⇒ **利用者の裁定は要らない**（`CR-379` の決定 4 は「覆してよい」の範囲であり、名を覆さずに袋のほうを消す）。

---

## 5. 波 B1 —— `JDG-283`（`PND-451`）を当てる

### 5.1 裁定の前に打った 3 つの反証（記録）

| 反証 | 結果 |
|---|---|
| (1) `rulings.md` を grep | `PND-451` 0 件、「境界を押」0 件（裁定の前）。`FR-052` に 4 件（`JDG-133` ・ `JDG-173` ほか）はどれも出ているパネルの幅の話で、出していないパネルの境界の押下を述べない |
| (2) `impact.py` | `FR-052` → 要求 6 件・参照 17 箇所。`S-99h` → 要求 2 件・参照 5 箇所。`GR-22` → 要求 1 件・参照 2 箇所。`S-134` → 要求 1 件・参照 1 箇所。どの指す側も出していないパネルの境界の押下を述べない |
| (3) 導けるか | **導けなかった。** コードの `STOP`（`frame-loop.ts:4169`）が `FR-052` ・ `FR-072` ・ `S-99h` を見たと書き、`PND-451` の行（`pending-decisions.md:314`）も「どの行も述べていない」と記す。表 T-250 の `SD-3`（表に無い組は同じ参照を返す）と 5.5 の「要求が名指すものだけ」が重なるので、仕様の行が無いかぎり、いまの振る舞いはコードにも原稿にも置けない |

⇒ 前に立つ者が 4 案を挙げて問い、**`JDG-283`（案 C）** を得た。

### 5.2 裁定の中身と、状態機械への帰結

- プロパティパネルを出していないあいだ（`S-99h` が「出していない」）、その境界に `Panel Divider` の掴み帯を置かない。⇒ 画面の右端は縦の `Scrollbars` のものになり、そこを押すのはスクロールバーを押すことである。
- ⭐ **状態機械には遷移も運ぶ値も足さない。** 付録の `TN` に境界の押下の行は無く、`SM-19` は運ぶ値を持たない（調査の下書きが推した `lastShown` は要らない）。⇒ 契約試験は、この押下について何も求めない。
- 理由（`JDG-283` の記録の要約）: パネルを戻す道は他にある（`IC-17`、名前の直接編集、行やタスクを作る、行を選ぶ）。右端へポインタを投げて縦のスクロールバーを掴む道は右端しか無い。帯（`S-134` の 8px）が画面の右端に残ると、画面に出る 4px が縦のスクロールバーの右端 4px に重なって勝つ（表 T-023d の `GR-22`、`01-04-requirements.md:3329`「帯の下に何が描かれていても帯が勝つ」）。

### 5.3 波 B1 の変更

| 対象 | 案 |
|---|---|
| `FR-052`（`01-04-requirements.md:4026`〜）と 表 T-023d の `GR-22`（`:3329`）—— ⛔ **閉路なので 1 度に書く**（2.2） | `FR-052` に 1 文（MUST）: 「プロパティパネルを出していないあいだ（`S-99h`）、その境界に掴み帯を敷かないこと（MUST） —— 出していないパネルの境界は画面の右端にあり、そこは縦の `Scrollbars` を掴む唯一の場所である」。`GR-22` の敷く場所の欄に「プロパティパネルの側は、パネルを出しているあいだだけ（`FR-052`）」を足す。⛔ `GR-22` に `（MUST）` を書かない（規則は要求、値は表）。`S-134` は幅だけを持つので変えない |
| `src/adapter/screen-renderer/screen-frame.ts:105` | 出していないあいだ `propertiesPanel` の帯を並べない |
| `src/framework/single-html-shell/frame-loop.ts:4169`〜`:4178` | `@provisional PND-451` の塊を消す |
| 試験 | 出していないとき記述に `propertiesPanel` の帯が無いこと（`uf-61`）、右端の押下がスクロールバーに当たること（e2e）。⭐ 仕様だけを読む体が書く |
| 台帳 | `PND-451` を閉じ（着地先 `FR-052`）、`rulings.md` の `JDG-283` の着地の欄を埋める —— どちらも前に立つ者 |

⚠️ 波 B1 を B2 の前に置くのは、B2 で結線したとき原稿（行が無い）とコード（パネルを戻す）が食い違わないためである。

---

## 6. 波 B2 —— シェルへ結線する（段 5・段 6 の後）

| 対象 | 案 |
|---|---|
| `CP-18` `InputCommandTranslator` | 「画面の入力を操作へ変える」→「画面の入力を、どこで何が起きたかを運ぶ出来事へ変える」（`InputSource` の宣言は残す）。`PI-18` の `screenStateFromInput` ほかを出来事を作るメンバへ（名はその波で。段 5 で割った後の形に合わせる） |
| `CP-25` `SingleHtmlShell` | 「現在値を保持する」→「セッションの現在値を 1 つ保持し、出来事 → 遷移 → 差し替え → 副作用の実行を回す。副作用の結果を出来事で戻す」（残りは据え置き） |
| `CP-36` `ScreenState` | 決定 8（`CR-379`）の広げ先を持つ: 構え、`S-99e` ・ `S-99f` ・ `S-99g` ・ `S-144`、`Dual Cursor` の追従側（`DC-2`）、出ている説明（`IN-3`）、覚えた実績。⭐ 本書の決定 3 のとおり、生成器の出力先を `screen-state.ts` へ移し、`UseCase` の領域のユニットは型を `Entity` から読む。`PI-36` を合わせる |
| `UF-48` `frame-loop.ts` | 「現在値の保持」→「セッションの現在値 1 つの保持と、副作用の実行」。⛔ **全画面表示の MUST の文は残す** —— 副作用 `askBrowserForFullScreen`（`TN-7`）は、入力を受けたその呼び出しの中で実行する（フレームへ延ばさない）。⇒ シェルは入力の呼び出しの中で `advanceScreenSession` を呼び、返った副作用をその場で実行する |
| 描き手の入力 | 第 4 節の移行。`ScreenRenderer` は集約（読むだけ）と `RenderFrameInput`（仮称）を受ける。`PI-37` を合わせる |
| `let` | 12 を消し、`let session` 1 つにする —— `screenState` ・ `isLevelZeroFolded` ・ `isMilestoneListOpen` ・ `isPaletteMinimised` ・ `propertiesShowing` ・ `propertiesSubject` ・ `isPropertiesPanelPutAway` ・ `isDialogueFieldVisible` ・ `language` ・ `dualCursorFollowing` ・ `scaleMessage` ・ `isTooltipDismissed`。⇒ 66 − 12 ＋ 1 ＝ 55。残す: `watermarkStampedAt` ・ `commandPaletteDraggedTo`（フレームの値）、`callOffScaleMessage`（副作用の把手、`SF-6`）、`isTooltipStanding`（描いた結果から導く値） |
| 優先順の表 `T-283` | 決定 7。`IN-4` の 8 段と、段ごとの状態のキー（まだ移していない領域の段は「未移行」）。行 ID の接頭辞はそのとき測って登録する |
| `audit-ch5.py` の `NOT_YET_CALLED` | ⛔ `AdvanceScreenSession` の項を消す（`JDG-285`）。下の辺が入った時点で、残した項を検査 33 が赤にする |
| `components.json` の辺 | `SingleHtmlShell → AdvanceScreenSession`、`ScreenRenderer → AdvanceScreenSession`、`InputCommandTranslator → AdvanceScreenSession`（出来事の型）。`ScreenState` への辺の説明文を直す |
| 表 T-075 の「負う要求」 | 決定 10 |
| 台帳 | `PND-338`（閉じたことを保つのは状態機械 —— `SM-19`）・ `PND-144`（`FR-072` の「残す」が決めている —— 行が無いので同じ参照）・ `PND-419`（推奨どおりなら遷移が無い）を閉じる候補。閉じるのは台帳の体 |
| 性能 | `LM-19` の手順。⛔ **測る前に利用者を呼ぶ** |

⛔ 基準線（`function-size-baseline.txt` ほか）が動くときは、数を利用者に見せてから前に立つ者が書く。

---

## 7. 数の予測

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行。
**起草時（`2112d0c9`、2026-09-21）: `tables=171  figures=17  rows=2183  uids=161`**
**測り直し（`1616d28d`、2026-09-21）: `tables=172  figures=17  rows=2188  uids=161`** —— 差 ＋1 表 ・ ＋5 行は `CR-432` の 表 T-276（`UD-1` 〜 `UD-5`）である。

**波 A**（「前」は `1616d28d` の値）:

| | 前 | 後（予測） | 差 | 内訳 |
|---|--:|--:|--:|---|
| tables | 172 | 175 | +3 | 表 T-280 ・ T-281 ・ T-282（生成物。md-checks は `specindex.discover` で `docs/spec/_assets/*.md` を走査するので数える —— 2026-09-21 に確かめた） |
| figures | 17 | 18 | +1 | 図 F-026 |
| rows | 2188 | 2311 | +123 | `SM` 34 ＋ `EV` 30 ＋ `TN` 53 ＝ 117、`CP-39` ・ `UT-11` ・ `PI-39` ・ `UF-84` 〜 `UF-86` の 6 |
| uids | 161 | 161 | 0 | 要求を足さない |

⚠️ 本線の段 4 の波（表 T-075 に `UF-72` 〜 `UF-83` の 12 行、表 T-063 に `UT-8` 〜 `UT-10`）が先に当たると「前」が動く。⭐ **差だけを突き合わせる。** 外れたら、まず生成物の 117 行が行 ID として読まれているか（md-checks の行 ID の形は英大文字 1 〜 3 字 ＋ 数字）を疑う。

**波 A の追補**（共通の状態機械の図と表）。「前」は波 A を当てた後の値であり、図の数は 図 F-027 ・ 図 F-028 の 2 つの定義を除いて数えた:

| | 前 | 後（予測） | 差 | 内訳 |
|---|--:|--:|--:|---|
| tables | 175 | 177 | +2 | 表 T-284 ・ 表 T-285 |
| figures | 18 | 20 | +2 | 図 F-027 ・ 図 F-028 |
| rows | 2311 | 2325 | +14 | `SS-1` 〜 `SS-6` の 6 ＋ `RA-1` 〜 `RA-8` の 8 |
| uids | 162 | 162 | 0 | 要求を足さない |

**実測（2026-09-21、追補を当てた後）: `tables=177  figures=20  rows=2325  uids=162`** —— 予測どおり。⚠️ `uids` は波 A の予測の 161 ではなく 162 であり、追補の前から 162 だった（追補は要求を足していない）。

**波 B1**: 差 0（`FR-052` と `GR-22` のセルの編集だけ）。
**波 B2**（見込み）: tables +1（`T-283`）、rows +8（`IN-4` の 8 段）、figures 0、uids 0。

---

## 8. 台帳の候補（⛔ 問いではない。`defects.md` には本書は書かない）

利用者の裁定（2026-09-13: 仕様とコードの食い違いは、どちらが正かを選ばずに台帳へ）に従い、台帳の体へ渡す。

| # | 食い違い | 片側 | もう片側 | 台帳の今 |
|---|---|---|---|---|
| 1 | フレームをまたいで生きるキャッシュが 2 つある | 表 T-071 の `CA-1`（`05-07-design.md:935`）はキャッシュを `ScreenRegions` ・ `ScheduleLayout` ・ `ScheduleGeometry` に限り、`CA-2`（`:936`）は無効化の契機をフレームの先頭とし、`CA-4`（`:938`）は 1 つだけ古い状態を禁じる | `fitHeldForNoPlace`（`frame-loop.ts:1857`。`OP-10` の全体表示が選んだ位置を環境が同じあいだ持ち越す）と `bandCeilingFrom`（`:2951`。`FR-016` の行の軸の上限を、帯を組む材料が同じあいだ使い回す）は、自分の鍵で失効する | 0 件（新しい行） |
| 2 | プロパティパネルの `Esc` の段 | `S-99h` の注（`_assets/tbl-settings.md:390`）「`S-99g` の「面」ではない … 表 T-028 の `IN-4` が別の段を与えている」 | `IN-4` の本文（`01-04-requirements.md:6795`）「プロパティパネルは「開いている面」に当たり」 | ⭐ **既に `DFC-570`（`裁定待ち`）が持つ** —— 新しい行は要らない。⚠️ 付録の `TN-32` は `IN-4` の本文に従って書いた。`DFC-570` が逆に裁かれたら `TN-32` の出来事の段を直す |
| 3 | `CP-36` が `S-144` を落としている | `CP-36`（`05-07-design.md:141`）は `S-99e` / `S-99f` / `S-99g` だけ | `PI-36`（`:506`）と `screen-state.ts` の `watermarkVisible` は持つ | 0 件。⭐ 波 A が直す（決定 13）ので、台帳には「見つけて同じ波で直した」として残すか、残さないかは台帳の体が決める |

---

## 9. 影響 —— 本書の外で動くもの

| 所 | 何が動くか | いつ |
|---|---|---|
| `docs/development-records/rulings.md` | `JDG-45` ・ `JDG-59` ・ `JDG-60` の着地先に `CR-436`（表 T-280 〜 T-282、`CP-39`）、`JDG-283` の着地の欄 | 波 A ／ 波 B1 |
| `docs/development-records/pending-decisions.md` | `PND-451` を閉じる（B1）。`PND-338` ・ `PND-144` ・ `PND-419` を閉じる候補（B2） | B1 ／ B2 |
| `docs/development-records/refactor-plan-report-2026-09-13.md` | 段 2b の出口と段 7 の最初の領域。記録 5 の「56 本」を 77 に | 波 A |
| `docs/development-records/handoff-state-machine.md` | §3 の ①②③ が済んだこと、④ の入口 | 波 A |
| `docs/development-records/changelog.md` | A-appendix の 1 行。⭐ 波 A は版 0.29 の「2 つより多いユニットを持つのは」の文に `AdvanceScreenSession`（3）を足した —— 前例 `e33e4f3c`（同じ文を直した）に倣う | 各波 |
| `.claude/skills/spec-graph-check/audit-ch5.py` | 表 T-063 の行数 7 → 8、`NOT_YET_CALLED`（`JDG-285`。項は前に立つ者が書いた） | 波 A ／ 波 B2（項を消す） |
| 登録簿の生成物 `docs/spec/_assets/tbl-row-id-prefixes.md` | `SM` ・ `EV` ・ `TN` が「登録のみ」でなくなる | 波 A |
| `docs/review/components/components.md` と図 F-013 〜 F-017 | `build.py` が作り直す | 波 A ／ 波 B2 |
| 検査 30 の名簿 | 生成した遷移表の定数を足す | 波 A |
| `.claude/skills/spec-graph-check/requirement-owner-baseline.txt` | 波 A・B1 では動かない（決定 10）。波 B2 で `FR-091` の起点が決まれば 17 → 16 に下げる（数を利用者に見せてから前に立つ者） | 波 B2 |
| `.claude/skills/spec-graph-check/function-size-baseline.txt` | 波 A の 3 ファイルは新しく、決定 12 で帯の内側に収めるので行を足さない見込み。帯を越えれば検査 60 が赤になる（基準線は利用者に数を見せずに動かさない） | 波 A |

---

## 10. ⛔ この変更でやらないこと

- ⛔ 波 A で `src/adapter` ・ `src/framework` に触らない（`ScreenSession` の袋も、`frame-loop.ts` の `let` も）
- ⛔ ほかの 9 領域の行を書かない —— 領域ごとの変更要求が、名指す要求を読んで書く（`JDG-48`）
- ⛔ `fitHeldForNoPlace` ・ `bandCeilingFrom` を状態機械へ入れない（フレームの値、`SF-5`）。食い違いは台帳（第 8 節）
- ⛔ `IN-4` の文言、表 T-065、表 T-206 の値を変えない
- ⛔ 欠陥を直さない（`JDG-57`: 領域を移して一致を確かめた直後に、別のコミットで）
- ⛔ 基準線を体に触らせない

---

## 付録 —— 第 1 領域「画面の値」の原稿の行（再検証済み）

**略記**: `req` ＝ `docs/spec/01-04-requirements.md`、`des` ＝ `docs/spec/05-07-design.md`、`set` ＝ `docs/spec/_assets/tbl-settings.md`、`glo` ＝ `docs/spec/_assets/tbl-glossary.md`。
行番号は `2112d0c9` のもの。表の行は第 1 セルがその ID の行（`grep -nE "^\| <ID> \|"`）、要求は `**UID**:` の行か、要求の中の文を指すとき `sed -n` で読んだ行である。
キーの頭の `screen.` は `TN` では省く。`*` はその軸のどの種類でも。「自己」は同じ種類へ戻る遷移（運ぶ値の書き換えか副作用のため —— 契約試験は表に無い組で同じ参照を求めるので、行が要る）。

### A.1 `SM`（状態）34 行

| 行 | キー | 親 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|---|---|
| SM-0 | `screen` | —（領域の根） | ○ | `language`、`rememberedActuals` | `CP-36` des:141、`S-99` set:386、`PV-4` req:2964 |
| SM-1 | `screen.armed.none` | `screen` | ○ | — | `AR-1` req:3269 |
| SM-2 | `screen.armed.taskShape` | `screen` | | `shapeKind`（`SH-1` 〜 `SH-4`、req:1096 〜 :1099） | `AR-2` req:3270、`IC-23` glo:536 〜 `IC-26` glo:539 |
| SM-3 | `screen.armed.milestoneShape` | `screen` | | `glyph`（`SH-5` req:1100） | `AR-3` req:3271、`IC-27` glo:540 |
| SM-4 | `screen.armed.dependency` | `screen` | | — | `AR-4` req:3272、`IC-61` glo:555 |
| SM-5 | `screen.armed.commentBox` | `screen` | | — | `AR-5` req:3273、`IC-35` glo:556 |
| SM-6 | `screen.armed.highlightBox` | `screen` | | — | `AR-6` req:3274、`IC-36` glo:557 |
| SM-7 | `screen.palette.shown` | `screen` | ○ | — | `S-99e` set:387（既定「表示」） |
| SM-8 | `screen.palette.shown.expanded` | `screen.palette.shown` | ○ | — | `S-200` set:365（既定 最小化していない）、req:4114 |
| SM-9 | `screen.palette.shown.minimised` | `screen.palette.shown` | | — | `S-200` set:365、`IC-75` glo:579 |
| SM-10 | `screen.palette.hidden` | `screen` | | — | `S-99e` set:387 |
| SM-11 | `screen.milestoneList.closed` | `screen` | ○ | — | `S-142` set:363、req:4106 |
| SM-12 | `screen.milestoneList.open` | `screen` | | — | `S-142` set:363、`IC-50` glo:576 |
| SM-13 | `screen.fullScreen.normal` | `screen` | ○ | — | `S-99f` set:388 |
| SM-14 | `screen.fullScreen.full` | `screen` | | — | `S-99f` set:388、req:4641 |
| SM-15 | `screen.surface.none` | `screen` | ○ | — | `S-99g` set:389（既定「開いていない」） |
| SM-16 | `screen.surface.open` | `screen` | | `surfaceName`（`U-30` glo:113、`U-49` glo:132、`U-54` glo:137、`U-56` glo:139、`U-60` glo:142、`U-61` glo:143、`U-62` glo:144） | `S-99g` set:389、`IC-52` glo:577 |
| SM-17 | `screen.watermark.shown` | `screen` | ○ | — | `S-144` set:392（既定「出す」） |
| SM-18 | `screen.watermark.hidden` | `screen` | | — | `WM-8` req:4981 |
| SM-19 | `screen.properties.none` | `screen` | ○ | — ⭐（`JDG-283`: 運ぶ値を持たない） | `S-99h` set:390（既定「出していない」） |
| SM-20 | `screen.properties.selection` | `screen` | | `subject`（選択と行の集合） | `S-99h` set:390、`IR-2` req:4689、`FR-072` req:1873（:1876「直前に出していた中身を残す」） |
| SM-21 | `screen.properties.documentSettings` | `screen` | | `returnSubject`（同じ入口をもう一度押したときに戻す選択物。無いこともある —— 決定 15） | `S-99h` set:390、`FR-072` req:1877 〜 :1878、`IC-17` glo:530 |
| SM-22 | `screen.dialogueField.shown` | `screen` | ○ | — | `S-99i` set:391（既定「表示」） |
| SM-23 | `screen.dialogueField.hidden` | `screen` | | — | `S-99i` set:391、`FR-066` req:6102（:6105） |
| SM-24 | `screen.levelZero.unfolded` | `screen` | ○ | — | `S-211` set:401 |
| SM-25 | `screen.levelZero.folded` | `screen` | | — | `HR-2` req:1646、`S-211` set:401 |
| SM-26 | `screen.dualCursor.off` | `screen` | ○ | — | `DC-1` req:4834 |
| SM-27 | `screen.dualCursor.on` | `screen` | | — | `DC-1` req:4834、`PTD-2` req:3237 |
| SM-28 | `screen.dualCursor.on.date1Following` | `screen.dualCursor.on` | ○ | — | `DC-1` req:4834（既定では `date1` が追従） |
| SM-29 | `screen.dualCursor.on.date2Following` | `screen.dualCursor.on` | | — | `DC-2` req:4835、`DC-8` req:4841 |
| SM-30 | `screen.scaleMessage.none` | `screen` | ○ | — | `SE-1` req:6739 |
| SM-31 | `screen.scaleMessage.shown` | `screen` | | `percent`、`end`（`max` ・ `min` ・ なし） | `SE-2` req:6740、`ZE-5` req:3209、`S-244` set:412 |
| SM-32 | `screen.tooltip.allowed` | `screen` | ○ | — | `IN-3` req:6794 |
| SM-33 | `screen.tooltip.dismissed` | `screen` | | — | `IN-3` req:6794（消せること）、`IN-4` req:6795（最後の段「出ている説明」） |

⭐ `screen` の直下の軸は 12（`armed` ・ `palette` ・ `milestoneList` ・ `fullScreen` ・ `surface` ・ `watermark` ・ `properties` ・ `dialogueField` ・ `levelZero` ・ `dualCursor` ・ `scaleMessage` ・ `tooltip`）。ほかに入れ子の単一の共用体が 2 つ（`palette.shown` の子、`dualCursor.on` の子）。どちらも決定 4 の読みで生成器が数える —— 当てる体は生成器の数を正とすること。

### A.2 `EV`（出来事）30 行

⭐ 出来事の名はすべて過去形（`SF-1`）。ガードが他の領域や文書を読むときの値は、出来事が運ぶ（決定 5）。

| 行 | キー | どこから来るか | 運ぶ値 | 根拠 |
|---|---|---|---|---|
| EV-1 | `paletteToggled` | 入力: `IC-7` ／ `SK-14` | — | glo:511、req:4171 |
| EV-2 | `paletteMinimiseToggled` | 入力: `IC-75` | — | glo:579 |
| EV-3 | `milestoneListToggled` | 入力: `IC-50` | — | glo:576 |
| EV-4 | `fullScreenEntryPressed` | 入力: `IC-11` ／ `SK-15` | — | glo:522、req:4172 |
| EV-5 | `fullScreenChanged` | 副作用の結果（ブラウザの `fullscreenchange`） | `isFullScreen` | req:4641 ・ :4643 |
| EV-6 | `surfaceEntryPressed` | 入力: `IC-22` ／ `SK-13`、`IC-19`、`IC-62`、`IC-2` ／ `SK-12` | `surfaceName` | glo:535 ・ :532 ・ :589 ・ :514、req:4170 ・ :4169 |
| EV-7 | `surfaceRaisedByFlow` | 副作用の結果（ファイルの領域が面を立てる） | `surfaceName`（`U-56` ・ `U-61` ・ `U-62`） | `OP-3` req:5558、glo:139 ・ :143 ・ :144 |
| EV-8 | `surfaceCloseAsked` | 入力: `IC-52` | 閉じる対象（面かパネルか） | glo:577 |
| EV-9 | `escapePressed` | 入力: `Esc` | `rung`（消費する `IN-4` の段の語。呼び手が詰める —— 決定 7） | `IN-4` req:6795 |
| EV-10 | `armEntryPressed` | 入力: `IC-23` 〜 `IC-27`、`IC-61`、`IC-35`、`IC-36` | `armKind`、`shapeKind` ／ `glyph` | glo:536 〜 :540 ・ :555 〜 :557、req:3281 〜 :3283 |
| EV-11 | `watermarkEntryPressed` | 入力: `IC-41` | — | glo:562、`WM-10` req:4983 |
| EV-12 | `watermarkUnlockAnswered` | 入力: `U-60` の答え | `isProceeding` | `WM-6` req:4979、`WM-7` req:4980 |
| EV-13 | `watermarkUnlockMatched` | 副作用の結果（照合） | — | `WM-6` req:4979、`WM-8` req:4981 |
| EV-14 | `watermarkUnlockMismatched` | 副作用の結果 | — | `WM-8` req:4981 |
| EV-15 | `settingsEntryPressed` | 入力: `IC-17` | — | glo:530、`FR-072` req:1877 〜 :1878 |
| EV-16 | `propertiesOfChoiceAsked` | 入力: パネルを出すことを要求が名指した押下（員数は各要求が持つ） | `subject` | `FR-072` req:1885 〜 :1886 |
| EV-17 | `selectionMoved` | ほかの領域（選択）の結果 | `subject`（空もありうる） | `FR-072` req:1876 ・ :1888 |
| EV-18 | `createdNameSettled` | 入力: 作った直後の名前の `Enter` | — | `FR-091` req:1351 |
| EV-19 | `settleKeyPressed` | 入力: `SK-19` の 2 段目 | `noSurfaceNoConfirmation`、`noUnsettledEntry` | `SK-19` req:4158、req:4194 |
| EV-20 | `dialogueFieldEntryPressed` | 入力: `IC-18` | `agentApiEnabled` | glo:531、`FR-066` req:6105 |
| EV-21 | `foldAllPressed` | 入力: `HF-12` の操作子 | — | `HF-12` req:1673、`HR-2` req:1646 |
| EV-22 | `levelZeroOpened` | 入力: `HF-16` ／ `HF-10` ／ `HF-17` | — | req:1674 ・ :1668 ・ :1675、set:401 |
| EV-23 | `dualCursorEntryPressed` | 入力: `IC-45` | 置く日付、`hasDaysToPlace` | glo:575、`DC-1` req:4834、`DC-4` req:4837 |
| EV-24 | `dualCursorPlaced` | 入力: `Row Area` のクリック | 置く日付 | `DC-2` req:4835、`PTD-2` req:3237 |
| EV-25 | `displayScaleStepped` | 入力: `IC-104` ／ `IC-105` ／ `SK-22` ／ `SK-23` ／ `SK-17` | `percent`、`end` | `SE-1` req:6739、glo:527 ・ :528、req:4177 〜 :4179 |
| EV-26 | `rowZoomEndReached` | 副作用の結果（行の軸のズームが端に当たった） | `percent`、`end` | `ZE-5` req:3209 |
| EV-27 | `scaleMessageTimeElapsed` | 時間: `S-244` | — | `SE-3` req:6741、set:412 |
| EV-28 | `displayLanguageChosen` | 入力: `IC-21` | 言語 | glo:534、`FR-038` req:6648 |
| EV-29 | `progressMarkerPressed` | 入力: 進捗マーカーの押下（`GA-18` req:3518） | `taskUid`、覚える実績 | `FR-107` req:3680（表 T-270）、`PV-4` req:2964 |
| EV-30 | `pointerRestElapsed` | 時間: `EZ-2` の待ち | — | `EZ-2` req:6219（決定 8） |

### A.3 `TN`（遷移）53 行

| 行 | 元 | 出来事 | ガード | 先 | 副作用 | 根拠 |
|---|---|---|---|---|---|---|
| TN-1 | `palette.shown` | EV-1 | — | `palette.hidden` | — | `S-99e` set:387、`IC-7` glo:511 |
| TN-2 | `palette.hidden` | EV-1 | — | `palette.shown`（子は初期の `expanded`） | — | 同上、req:4122 |
| TN-3 | `palette.shown.expanded` | EV-2 | — | `palette.shown.minimised` | — | req:4114 |
| TN-4 | `palette.shown.minimised` | EV-2 | — | `palette.shown.expanded` | — | req:4114、glo:579 |
| TN-5 | `milestoneList.closed` | EV-3 | — | `milestoneList.open` | — | req:4106 |
| TN-6 | `milestoneList.open` | EV-3 | — | `milestoneList.closed` | — | req:4106 |
| TN-7 | `fullScreen.*` | EV-4 | — | 自己 | `askBrowserForFullScreen`（入力の呼び出しの中で実行。`UF-48` des:404） | req:4642（求めただけで `S-99f` を変えない） |
| TN-8 | `fullScreen.normal` | EV-5 | `isFullScreen` | `fullScreen.full` | — | req:4641 |
| TN-9 | `fullScreen.full` | EV-5 | `not isFullScreen` | `fullScreen.normal` | — | req:4641 ・ :4643 |
| TN-10 | `surface.none` | EV-6 | — | `surface.open` | — | `S-99g` set:389 |
| TN-11 | `surface.none` | EV-7 | — | `surface.open` | — | `OP-3` req:5558、glo:143 ・ :144 |
| TN-12 | `surface.open` | EV-8 | `isSurfaceTarget` | `surface.none` | `tellFlowSurfaceClosed` | `IC-52` glo:577 |
| TN-13 | `surface.open` | EV-9 | `rungIsSurface` | `surface.none` | `tellFlowSurfaceClosed` | `IN-4` req:6795、`WM-9` req:4982 |
| TN-14 | `armed.none` | EV-10 | — | `armed.{armKind}` | — | req:3282、`AR-2` 〜 `AR-6` req:3270 〜 :3274 |
| TN-15 | `armed.*`（`none` を除く） | EV-10 | `isSameArm` | `armed.none` | — | req:3281 〜 :3282、`SP-4` req:1153 |
| TN-16 | `armed.*`（`none` を除く） | EV-10 | `not isSameArm` | `armed.{armKind}` | — | req:3282 〜 :3283 |
| TN-17 | `armed.*`（`none` を除く） | EV-9 | `rungIsArmed` | `armed.none` | — | req:3281、`IN-4` req:6795 |
| TN-18 | `armed.*`（`none` を除く） | EV-23 | `entersDualCursor` | `armed.none` | — | req:3284 |
| TN-19 | `watermark.shown & surface.none` | EV-11 | — | `surface.open`（`surfaceName` ＝ `U-60`） | — | `WM-6` req:4979、`WM-10` req:4983 |
| TN-20 | `watermark.hidden` | EV-11 | — | `watermark.shown` | — | `WM-10` req:4983、glo:562 |
| TN-21 | `surface.open` | EV-12 | `isWatermarkUnlockSurface & isProceeding` | 自己 | `matchWatermarkUnlock` | `WM-6` req:4979 |
| TN-22 | `surface.open` | EV-12 | `isWatermarkUnlockSurface & not isProceeding` | `surface.none` | — | `WM-9` req:4982 |
| TN-23 | `watermark.shown & surface.open` | EV-13 | `isWatermarkUnlockSurface` | `watermark.hidden & surface.none` | — | `WM-8` req:4981 |
| TN-24 | `surface.open` | EV-14 | `isWatermarkUnlockSurface` | 自己（面を閉じない） | `raiseNotice(RS-41)` | `WM-8` req:4981、`RS-41` req:6443 |
| TN-25 | `properties.none` | EV-15 | — | `properties.documentSettings` | — | `FR-072` req:1878 |
| TN-26 | `properties.selection` | EV-15 | — | `properties.documentSettings`（`subject` を `returnSubject` に移す） | — | `FR-072` req:1877、`IC-17` glo:530 |
| TN-27 | `properties.documentSettings` | EV-15 | — | `properties.selection`（`returnSubject` を `subject` に戻す） | — | `FR-072` req:1877 |
| TN-28 | `properties.none`、`properties.documentSettings` | EV-16 | — | `properties.selection` | — | `FR-072` req:1885 〜 :1886 |
| TN-29 | `properties.selection` | EV-16 | — | 自己（`subject` を書き換え） | — | `FR-072` req:1873 |
| TN-30 | `properties.selection` | EV-17 | `hasChoice` | 自己（`subject` を書き換え） | — | `FR-072` req:1888 |
| TN-31 | `properties.selection`、`properties.documentSettings` | EV-8 | `isPanelTarget` | `properties.none` | — | `IC-52` glo:577、`FR-072` req:1889 |
| TN-32 | `properties.selection`、`properties.documentSettings` | EV-9 | `rungIsSurface & isPanelTopmost` | `properties.none` | — | `IN-4` req:6795、req:4194 |
| TN-33 | `properties.*` | EV-18 | — | `properties.none` | `clearSelection` | `FR-091` req:1351 |
| TN-34 | `properties.selection`、`properties.documentSettings` | EV-19 | `noSurfaceNoConfirmation & noUnsettledEntry` | `properties.none` | — | `SK-19` req:4158、req:4194 |
| TN-35 | `dialogueField.shown` | EV-20 | `agentApiEnabled` | `dialogueField.hidden` | — | `S-99i` set:391、`IC-18` glo:531 |
| TN-36 | `dialogueField.hidden` | EV-20 | `agentApiEnabled` | `dialogueField.shown` | — | 同上 |
| TN-37 | `dialogueField.*` | EV-20 | `not agentApiEnabled` | 自己 | `raiseNotice(RS-35)` | `FR-066` req:6107、`RS-35` req:6437 |
| TN-38 | `levelZero.unfolded` | EV-21 | — | `levelZero.folded` | `writeFoldAll` | `HR-2` req:1646、`HF-12` req:1673 |
| TN-39 | `levelZero.folded` | EV-22 | — | `levelZero.unfolded` | `writeOpenLevel` | `HF-16` req:1674、`HF-10` req:1668、`HF-17` req:1675、set:401 |
| TN-40 | `dualCursor.off` | EV-23 | `hasDaysToPlace` | `dualCursor.on`（子は `date1Following`） | `writePlaceDualCursor` | `DC-1` req:4834 |
| TN-41 | `dualCursor.on.date1Following` | EV-24 | — | `dualCursor.on.date2Following` | `writeFixDate1` | `DC-2` req:4835、`DC-6` req:4839 |
| TN-42 | `dualCursor.on.date2Following` | EV-24 | — | `dualCursor.on.date1Following` | `writeFixDate2` | 同上 |
| TN-43 | `dualCursor.on` | EV-23 | — | `dualCursor.off` | `writeClearDualCursor` | `DC-4` req:4837 |
| TN-44 | `dualCursor.on` | EV-9 | `rungIsDualCursor` | `dualCursor.off` | `writeClearDualCursor` | `DC-7` req:4840、`IN-4` req:6795 |
| TN-45 | `scaleMessage.none` | EV-25 | — | `scaleMessage.shown` | `startScaleMessageTimer` | `SE-1` req:6739、`SE-2` req:6740 |
| TN-46 | `scaleMessage.none` | EV-26 | — | `scaleMessage.shown` | `startScaleMessageTimer` | `ZE-5` req:3209、`SE-2` req:6740 |
| TN-47 | `scaleMessage.shown` | EV-25 | — | 自己（中身を書き換え） | `restartScaleMessageTimer` | `SE-4` req:6742 |
| TN-48 | `scaleMessage.shown` | EV-26 | — | 自己（中身を書き換え） | `restartScaleMessageTimer` | `SE-4` req:6742、`ZE-5` req:3209 |
| TN-49 | `scaleMessage.shown` | EV-27 | — | `scaleMessage.none` | — | `SE-3` req:6741 |
| TN-50 | `screen` | EV-28 | — | 自己（`language` を書き換え） | `storeLanguage` | `S-99` set:386、`FR-038` req:6648 |
| TN-51 | `screen` | EV-29 | — | 自己（`rememberedActuals` を書き換え） | `writeProgressStep` | `FR-107` req:3680（表 T-270）、`PV-4` req:2964 |
| TN-52 | `tooltip.allowed` | EV-9 | `rungIsTooltip` | `tooltip.dismissed` | — | `IN-3` req:6794、`IN-4` req:6795 |
| TN-53 | `tooltip.dismissed` | EV-30 | — | `tooltip.allowed` | — | `IN-3` req:6794、`EZ-2` req:6219（決定 8） |

⚠️ `TN-32` の段は `IN-4` の本文に従う。`DFC-570`（`裁定待ち`）が逆に裁かれたら直す（第 8 節の 2）。⛔ `DFC-570` は台帳の行なので根拠の欄に置かない —— 生成器は根拠の ID が `docs/spec` に定義されていることを見る。

### A.4 運ぶ値の型（コードが決めた。原稿は名前だけを持つ —— 表 T-250 の `SD-1` ・ `SD-2`）

| 名 | 型 | 置き場 |
|---|---|---|
| `rung`（`EV-9`） | `EscapeTarget` —— `'notice' \| 'textEntry' \| 'confirmation' \| 'surface' \| 'gesture' \| 'propertiesPanel' \| 'armed' \| 'selection' \| 'dualCursorMode' \| 'tooltip'`。行が当たるのは `surface` ・ `armed` ・ `dualCursorMode` ・ `tooltip` | `src/entity/document-model/screen-state/screen-state.ts:99` |
| `target`（`EV-8`） | `'surface' \| 'panel'` | `src/use-case/advance-screen-session/screen-values.ts` の `ScreenValuesEventCarried` |
| `subject`（`SM-20` ・ `EV-16` ・ `EV-17`）、`returnSubject`（`SM-21`） | `PropertiesSubject` ＝ `{ selection: Selection; groupIds: readonly string[] }`（`returnSubject` は `\| null`）。`hasChoice` は `selection.items` か `groupIds` が空でないこと | 同ファイルの `PropertiesSubject`。⚠️ `Adapter` の同じ形の型（`screen-renderer.ts:397`）は波 B2 で消す（第 4 節） |
| `shapeKind` ・ `glyph`（`SM-2` ・ `SM-3` ・ `EV-10`） | 状態では `string`、出来事では `string \| null`（`armKind` が `taskShape` なら `shapeKind`、`milestoneShape` なら `glyph` が要る） | 同ファイル |
| `surfaceName`（`SM-16` ・ `EV-6` ・ `EV-7`） | `string`。`isWatermarkUnlockSurface` は `U-60` であること | 同ファイル |
| 副作用 `raiseNotice` | `{ type: 'raiseNotice'; reason: 'RS-41' \| 'RS-35' }`。遷移表の定数では `effectArgument` が同じ行 ID を持つ | 同ファイル |
| 根の運ぶ値（`SM-0`） | `language: 'ja' \| 'en' \| null`（初期は `null` —— 決定 16）、`rememberedActuals` | `ScreenValues` の欄 |

⭐ 生成した型の形: 軸ごとの判別共用体の `kind` はキーの最後の語、入れ子の単一の共用体は欄 `child`、遷移表の定数 `SCREEN_VALUES_TRANSITIONS` の `from` は選択肢の列（1 つの選択肢は軸の連言の列）、`to` は軸の連言の列か `'self'`（自己）、`screen.armed.{armKind}` は出来事の運ぶ値が決める先（初期の種類 `none` を除く）である。

**調査の下書き（`SM` 34 ・ `EV` 30 ・ `TN` 47）から変えたもの**:
- 任意だった `SM-32` ・ `SM-33` ・ `EV-30` とその 2 遷移を本行に入れた（決定 8）。
- 出来事を 2 つ持つ 4 行を割った（決定 6）—— 旧 TN-43（`EV-23` ／ `EV-9`）→ `TN-43` ・ `TN-44`、旧 TN-44 → `TN-45` ・ `TN-46`、旧 TN-45 → `TN-47` ・ `TN-48`、旧 TN-47（`EV-28` ／ `EV-29`）→ `TN-50` ・ `TN-51`。
- 軸の葉の親を軸の名（行が無い）から `screen`（`SM-0`）へ直した（決定 4）。
- `TN-51` に副作用 `writeProgressStep` を足した —— 押下の巡りは文書を書く（表 T-270）ので、`SF-6` により副作用として返す。
- `TN-21` 〜 `TN-24` の「`surface.open`（`U-60`）」を、ガード `isWatermarkUnlockSurface` に書き直した（`surfaceName` は運ぶ値であり種類ではない —— `SM-16`）。
- `TN-32` のガードに `isPanelTopmost` を足した —— req:4194 が「面が立っているあいだ閉じる手は面へ向かい、面の後ろのパネルではない」と、同じ段の中の順を定める。
- ⭐ **`JDG-283` により、出していないパネルの境界の押下の行は 0、`SM-19` の運ぶ値は 0。**

---

## 改訂の記録 —— 波 A を `1616d28d` で測り直した（2026-09-21）

`CR-432`（表 T-276・接頭辞 `UD`、`56de8f06`）が当たったあとに、波 A を今の仕様と突き合わせて直した。波 B1・B2 と付録の行は変えていない。

| # | 起草時の文 | 直した文 | 理由 |
|---|---|---|---|
| 1 | 識別子の段「`CR-432` が `UF-72` 〜 `UF-87` を予約」「`UF-88` 〜 `UF-90` を仮に置く」 | 帯は本線 `UF-72` 〜 `UF-83`、本書 `UF-84` 以降。⇒ `UF-84` 〜 `UF-86` | handoff の「衝突の約束」の帯。`CR-432` の 4.6 節と 10 節が `UF-72` 〜 `UF-83` に縮めた（`JDG-284` の ③） |
| 2 | 「表 `T-276` ・ 接頭辞 `UD` ・ 要求 ID `FR-112` は `CR-432`（起草中）が予約」 | `T-276` と `UD` は当たった。`FR-112` の予約は `CR-432` に無い | 2026-09-21 に `CR-432` を grep して `FR-112` 0 件 |
| 3 | 登録簿の行は 160（起草時の値） | 161（2026-09-21 に `1616d28d` で実測） | `UD` が足された。⚠️ この文の形（「行は N 件」）は検査 62 の読む形に当たらず、赤にならなかった |
| 4 | 決定 10 の理由の 1 文 | 5.3 の規則・既存の行の書き方・ラチェットが数えるもの（要求であって行ではない）・下がる向きの例外 `FR-091` を書いた | 依頼の 3 |
| 5 | —— | 決定 14 と 第 3.1a 節（表 T-276 の `UD-1` ・ `UD-3` ・ `UD-4` ・ `UD-5`） | `05-07-design.md:272` の MUST |
| 6 | `UT-11` の割った理由「領域ごとに縛る要求が別なので割った」 | 3 つの変更の理由を名指し、純粋性でないことを `UD-3` で言う | 起草時の文は 3 つのうち領域のファイルの理由しか言っておらず、公開エントリと `session-step.ts` を割った理由が無かった |
| 7 | `UF-88` の責務「`CP-39`」 | 「束ねて公開し、根の状態を持って 1 段進める …」 | 5.3 の「責務の欄が `CP-n` を指すときはその行の責務をそのまま負う」と食い違う |
| 8 | `SU-3`「`CR-432` が先に当たれば 84 ＋ 3」、散文 `:286` ・ `:307`、`MN-2` `:904` | 当てる時の行の数 ＋ 3 ／ ＋ 1、`:297` ・ `:318` ・ `:915` | `CR-432` は 68 → 80（12 ユニット）。本線も `SU-3` を最後の波で書く |
| 9 | `PI-36` `:506` | `:517` | 実測 |
| 10 | 数の予測の「前」`171 / 17 / 2183 / 161` | `172 / 17 / 2188 / 161`（差は変えない） | `CR-432` の ＋1 表 ・ ＋5 行 |

## 改訂の記録 —— 波 A を当てた（2026-09-21）

当てた体が、当てたものに合わせて本書を直した。波 B1・B2 の中身は `JDG-285` の 1 項を除いて変えていない。

| # | 起草時の文 | 直した文 | 理由 |
|---|---|---|---|
| 11 | 状態「起草。まだ当てていない」、識別子の段の現在形の「空いている」「最大は」 | 状態「波 A を当てた」、識別子の段を過去形の履歴へ | CR-435 ・ CR-432 の書き方。検査 62 は当てた後の現在形の主張を赤にする |
| 12 | `SM-21` の運ぶ値 `—` | `returnSubject`（決定 15）、`TN-26` ・ `TN-27` の先の注 | `FR-072` の「直前の選択物へ戻す」を書くために要った。戻す先が無いときは `DFC-677` |
| 13 | —— | 決定 16（`language` は `null` で始まる） | `S-99` に既定値が無い |
| 14 | `TN-32` の根拠に `DFC-570` | 根拠から外し、A.3 の後の注へ | 台帳の ID は `docs/spec` に無いので、生成器が根拠として拒む |
| 15 | —— | A.4（運ぶ値の型と、生成した型の形） | 契約試験を書く体が入力を組めるように、コードが受ける型を名指した |
| 16 | —— | `JDG-285`（第 0 節の ③、第 3 節の波 B2、第 6 節、第 9 節） | 検査 33 が呼び手の無い `AdvanceScreenSession` を赤にした。利用者が案 A（`NOT_YET_CALLED`）を選んだ |
| 17 | 波 A の触る所 | 検査の道具・試験の数・生成定数の一覧・版 0.29 の文（前例 `e33e4f3c`）を足した | 当てた巡で実際に動かしたもの |
| 18 | 第 3.1 節「図 F-026 —（`stateDiagram-v2`、軸ごとの並行の区画）」 | 図 F-026 は 1 つの番号のまま、軸ごとに 1 つの `stateDiagram-v2` の図（見出しつき）に分け、ラベルは行 ID だけ。3 つ以上の兄弟のどの 2 つの間も結ぶ遷移と、同じ 1 つの種類へ出る・から入る遷移は、兄弟を 1 つの箱に囲んで 1 本だけ描く（`armed` の `TN-14` ・ `TN-15` ・ `TN-16` ・ `TN-17` ・ `TN-18`）。畳み方は生成器の注と図の前の段が述べ、全数は 表 T-282 が持つ | 1 つの図に 12 軸を並べると幅がおよそ 1600px になり、ラベルが読めなかった（前に立つ者が mermaid 11 で描いて確かめた）。軸ごとに描いて 1600px の画面で読めることを確かめた |

## 改訂の記録 —— 波 A に共通の状態機械の図と表を足した（2026-09-21）

前に立つ者の決めたこと（決定 17 〜 20）に従い、状態機械の 1 つの領域ではなく、全領域に共通の形を 5.6 に書いた。波 B1・B2 と付録の行は変えていない。

| # | 起草時の文 | 直した文 | 理由 |
|---|---|---|---|
| 19 | 識別子の段「本書は新しい接頭辞を登録しない（波 A）」 | 当初の範囲では登録しなかったこと、追補で `SS` ・ `RA` を登録したこと、登録の直前の grep | 決定 17 |
| 20 | —— | 識別子の段に `T-284` ・ `T-285` ・ `図 F-027` ・ `図 F-028` の測り直し | 規則 02 の 2.5 |
| 21 | 第 3 節の波 A の触る所 | 5.6 の図 2 つと表 2 つ、登録簿の `SS` ・ `RA` | 追補で実際に動かしたもの |
| 22 | —— | 第 3.1 節に追補の 4 行、第 0 節の ③ に決定 17 〜 20 | 前に立つ者の決定 |
| 23 | 第 7 節の波 A の予測だけ | 追補の予測と、md-checks の最終行の実測 `tables=177  figures=20  rows=2325  uids=162` | 規則 02 の 2 |

---

## 波 A2 —— 原稿と印字を状態機械ごとに組み替え、番号をやめて名で指す（`JDG-286`）

⭐ **状態: 当てた（2026-09-21、`97868072` の上。ブランチ `sm-restructure`）。**
波 B1 ・ B2 の中身は変えていない。付録 A.1 〜 A.3 の番号は当てた日の履歴として残し、いまの名への対応は A2.5 に書いた。

### A2.1 裁定

- **利用者の裁定 `JDG-286`**（2026-09-21、逐語「**推奨の Dで進めろ**」）—— 原稿とその印字を**状態機械（＝波 A の軸）ごと**に組み替え、`SM` ・ `EV` ・ `TN` の通し番号をやめて名で指す。
- 同じ巡の追補（利用者、前に立つ者が伝えた）—— 状態機械の名と状態の名の規則を、レビュー観点 `docs/development-rules/07-review-standards.md` の R4 の節「状態機械（State Machine）」と R4.4 として書いた（`0a888ce5`、前に立つ者のコミット）。本波の命名はそれに従う。途中で 2 度出た案（軸の名のまま、名詞句 ＋ `Machine`）は、この節が置き換えた。
- 裁定の記録（`docs/development-records/rulings.md`）は前に立つ者が書く。本書は書かない。

### A2.2 前と後の形

| 項目 | 前（波 A） | 後（波 A2） |
|---|---|---|
| 原稿の単位 | 領域ごとに `states` ・ `events` ・ `transitions` の 3 つの行の列 | 領域ごとに `events`（1 度だけ定める）・ `root`（根が運ぶ値と、それだけを書き換える出来事）・ `machines`（状態機械ごとに `states` と `transitions`） |
| 遷移の持ち方 | 行 —— 元の状態の選言 × 出来事 × ガード → 先の状態の連言、または `self` | 升 —— `transitions[出来事][今の状態]` に `{to, guard?, effect?, effectArgument?, evidence, note?}`（ガードで分かれるときは 2 つ以上の枝の列）。**升の無い組は変化なし（同じ参照）** |
| ほかの状態機械にかかる条件 | 元の連言（`watermark.shown & surface.none`） | ガードの項 `{"in": "watermarkDisplayStateMachine.shown"}` |
| 2 つの軸を同時に動かす遷移 | 1 行に先を 2 つ | 2 つの状態機械の表に 1 升ずつ（出来事は 1 度だけ定める） |
| 名前 | `SM-n` ・ `EV-n` ・ `TN-n` | 状態機械 `armModeStateMachine`、状態 `armModeStateMachine.taskShapeArmed` ・ `paletteDisplayStateMachine.shown.expanded`、出来事 `screen/armEntryPressed`、遷移はその升（状態機械 × 今の状態 × 出来事） |
| 印字（`docs/spec/_assets/tbl-state-machines.md`） | 領域ごとに表 3 つ（状態・出来事・遷移）と図 1 つ（軸ごとの図） | 領域ごとに表 1 つ・図 1 つ。表の先頭に出来事の定義（動かすものの欄つき）と根の値、続けて状態機械ごとの節 —— 状態遷移図（軸ごとの畳み方はそのまま）、状態遷移表（行 ＝ その状態機械を動かす出来事、列 ＝ 葉の今の状態、升 ＝「→ 次 [ガード] / 処理」、何も変わらない升も空けず「—」＝ 変化なし（同じ参照））、状態の一覧と根拠、表に無い出来事は変えないという注 |
| 表と図の番号 | 表 `T-280` ・ `T-281` ・ `T-282`、表 `T-286` ・ `T-287` ・ `T-288`、図 `F-026` ・ `F-029` | 表 `T-280` ・ 表 `T-286`、図 `F-026` ・ 図 `F-029`。`T-281` ・ `T-282` ・ `T-287` ・ `T-288` は使われなくなった —— **ほかの表に配り直さない** |
| 今の状態の値と型 | 根の欄は軸の名（`armed`）、型は `<Stem><Axis>`（`ScreenValuesArmed`） | 根の欄は `〈名詞句〉State`（`armModeState`）、型は `〈名詞句〉State`（`ArmModeState`）、入れ子は `〈名詞句〉〈道〉State`（`PaletteDisplayShownState`）。生成器が `〜StateMachine` から `〜State` を名で導き、名が `StateMachine` で終わらないもの・根の運ぶ値と重なるものを拒む |
| 種類の字面（`kind`） | 状態のキーの末尾（`none` ・ `taskShape`） | 改めた状態の名（A2.3 の 2 つ目の表）。`ARMED_BY_KIND` のキーと `ArmKind` も同じ字面 |
| 遷移表の定数 | `{ id, from, event, guard, to, effect, effectArgument }` を行ごと | `{ state, event, guard, to, effect, effectArgument }` を升の枝ごと。根の升を先に、続けて状態機械ごとに原稿の順 |
| 升の書き切り | —— | ガードの付いた枝がすべての場合を覆わない升（`armModeStateMachine` × `screen/escapePressed` の「→ `notArmed` [`isRungArmed`]」など）には「それ以外 → —」（変化なし・同じ参照）を添える。ガードの無い枝があるか、ガードとその `not` の 2 枝があるときは添えない。判定は印字の生成器だけが行い、原稿は変えていない（R4.4 の「何も変わらない交点も空けずに書く」を升の中まで及ぼした） |
| 行 ID の接頭辞 | `SM` ・ `EV` ・ `TN` を登録 | 登録簿から外した。書き戻しは検査 63（`check-sm-ev-tn-prefix-gone.py`）が止める |

### A2.3 名の規則と、改めた名

規則（R4.4）: 状態機械（定義）は**追うものの名詞句 ＋ `StateMachine`**、全領域を通して 1 つ（生成器が重なりを拒む）。今の状態を持つ値と型は**同じ名詞句 ＋ `State`**。状態は「この状態機械は今〈状態〉である」と読める**過去分詞・形容詞**、進行中の活動は**現在分詞 ＋ 目的語**で、名詞だけは状態ではない。出来事は主語 ＋ 過去形。ガードは `is` / `has` / `can`、処理は動詞 ＋ 目的語。
`R2` の品詞の規約（型は名詞句、プロパティは名詞、イベントは過去形）とも突き合わせた —— 食い違いは無い。

**状態機械と今の状態**（14）:

| 領域 | 波 A の軸 | 状態機械 | 今の状態の値 ／ 型 |
|---|---|---|---|
| `screen` | `armed` | `armModeStateMachine` | `armModeState` ／ `ArmModeState` |
| `screen` | `palette` | `paletteDisplayStateMachine` | `paletteDisplayState` ／ `PaletteDisplayState`（入れ子 `PaletteDisplayShownState`） |
| `screen` | `milestoneList` | `milestoneListDisplayStateMachine` | `milestoneListDisplayState` ／ `MilestoneListDisplayState` |
| `screen` | `fullScreen` | `fullScreenModeStateMachine` | `fullScreenModeState` ／ `FullScreenModeState` |
| `screen` | `surface` | `openSurfaceStateMachine` | `openSurfaceState` ／ `OpenSurfaceState` |
| `screen` | `watermark` | `watermarkDisplayStateMachine` | `watermarkDisplayState` ／ `WatermarkDisplayState` |
| `screen` | `properties` | `propertiesPanelContentStateMachine` | `propertiesPanelContentState` ／ `PropertiesPanelContentState` |
| `screen` | `dialogueField` | `dialogueFieldDisplayStateMachine` | `dialogueFieldDisplayState` ／ `DialogueFieldDisplayState` |
| `screen` | `levelZero` | `levelZeroFoldStateMachine` | `levelZeroFoldState` ／ `LevelZeroFoldState` |
| `screen` | `dualCursor` | `dualCursorModeStateMachine` | `dualCursorModeState` ／ `DualCursorModeState`（入れ子 `DualCursorModeOnState`） |
| `screen` | `scaleMessage` | `scaleMessageDisplayStateMachine` | `scaleMessageDisplayState` ／ `ScaleMessageDisplayState` |
| `screen` | `tooltip` | `tooltipDisplayStateMachine` | `tooltipDisplayState` ／ `TooltipDisplayState` |
| `notices` | `onScreen` | `noticeDisplayStateMachine` | `noticeDisplayState` ／ `NoticeDisplayState` |
| `notices` | `delivery` | `changeDeliveryStateMachine` | `changeDeliveryState` ／ `ChangeDeliveryState` |

**状態の名を改めたもの**（14 の状態機械の 37 の状態を規則に当て、15 を改めた。残りの 22 は過去分詞・形容詞か現在分詞で、そのまま）:

| 状態機械 | 前 | 後 | 理由 |
|---|---|---|---|
| `armModeStateMachine` | `none` | `notArmed` | 名詞（「無い」）だけでは状態でない |
| `armModeStateMachine` | `taskShape` | `taskShapeArmed` | 物の名前 |
| `armModeStateMachine` | `milestoneShape` | `milestoneShapeArmed` | 物の名前 |
| `armModeStateMachine` | `dependency` | `dependencyArmed` | 物の名前 |
| `armModeStateMachine` | `commentBox` | `commentBoxArmed` | 物の名前 |
| `armModeStateMachine` | `highlightBox` | `highlightBoxArmed` | 物の名前 |
| `openSurfaceStateMachine` | `none` | `closed` | 名詞だけ。面が 1 つも開いていない |
| `propertiesPanelContentStateMachine` | `none` | `hidden` | 名詞だけ。パネルを出していない |
| `propertiesPanelContentStateMachine` | `selection` | `selectionDisplayed` | 物の名前 |
| `propertiesPanelContentStateMachine` | `documentSettings` | `documentSettingsDisplayed` | 物の名前 |
| `dualCursorModeStateMachine` | `on.date1Following` | `on.placingDate1` | 〈名詞〉＋現在分詞は主語と目的語が逆に読まれる（R4.4 の禁止）⇒ 現在分詞 ＋ 目的語 |
| `dualCursorModeStateMachine` | `on.date2Following` | `on.placingDate2` | 同上 |
| `scaleMessageDisplayStateMachine` | `none` | `hidden` | 名詞だけ |
| `noticeDisplayStateMachine` | `none` | `hidden` | 名詞だけ |
| `noticeDisplayStateMachine` | `standing` | `shown` | 目的語の無い現在分詞で、「今〈状態〉である」と読めない。運ぶ値の名 `standing`（出ている通知の列）は変えない |

**出来事**（35）: すべて主語 ＋ 過去形（`paletteToggled` ・ `surfaceCloseAsked` ・ `noticeRaised` など）で、**改めたものは無い**。
**処理**（15）: すべて動詞 ＋ 目的語（`askBrowserForFullScreen` ・ `writeFoldAll` ・ `raiseNotice` など）で、改めたものは無い。
**ガード**（22）: `is` / `has` / `can` で始まらない 10 を改めた（R4.4 は本変更が入れる規則なので、同じ変更で合わせる）。生成器は、`is` / `has` / `can` の後に大文字が続かないガードの名を拒む（壊して確かめた: `isRungTooltip` を `rungIsTooltip` に戻すと 1 件）。

| 前 | 後 | 何を確かめるか（契約試験の判定 `guardHolds` の中身） |
|---|---|---|
| `rungIsArmed` | `isRungArmed` | `IN-4` の段が `armed` |
| `rungIsSurface` | `isRungSurface` | 段が `surface` |
| `rungIsDualCursor` | `isRungDualCursor` | 段が `dualCursorMode` |
| `rungIsTooltip` | `isRungTooltip` | 段が `tooltip` |
| `noSurfaceNoConfirmation` | `hasNoSurfaceOrConfirmation` | 出来事の運ぶ値 `noSurfaceNoConfirmation` が真（面も確認も立っていない） |
| `noUnsettledEntry` | `hasNoUnsettledEntry` | 出来事の運ぶ値 `noUnsettledEntry` が真 |
| `agentApiEnabled` | `isAgentApiEnabled` | 出来事の運ぶ値 `agentApiEnabled` が真 |
| `entersDualCursor` | `canEnterDualCursor` | `dualCursorModeStateMachine.off` にいて、置ける日がある |
| `leavesNone` | `isLeavingNone` | 押された理由が立っていて、立っているのが 1 枚だけ |
| `leavesSome` | `isLeavingSome` | 押された理由が立っていて、2 枚以上 |

どの名も中身を言い違えていないので、依頼の名のまま当てた。
**真偽の運ぶ値**: `R2` の「Boolean は `is` / `has` / `can`」に合わせ、出来事の運ぶ値のうち 3 つを、同じ字面のガードと同じ名に改めた —— `noSurfaceNoConfirmation` → `hasNoSurfaceOrConfirmation`、`noUnsettledEntry` → `hasNoUnsettledEntry`、`agentApiEnabled` → `isAgentApiEnabled`（原稿・生成した型・`ScreenValuesEventCarried` と `onSettleKeyPressed` ・ `onDialogueFieldEntryPressed`・契約試験の入力の見本）。両方の領域のほかの真偽の値 —— 出来事の `isFullScreen` ・ `isProceeding` ・ `hasDaysToPlace` —— は規則どおりで、状態が運ぶ値と今の状態の欄に真偽は無い（`src/use-case/advance-screen-session/` の `boolean` を grep）。`frame-loop.ts` の保存のキー `agentApiEnabled`（`S-99b`）は別の名であり、変えていない。
⚠️ **真偽の運ぶ値の名を生成器では拒めない** —— 原稿の運ぶ値は名前しか持たず、型はコードが持つ（表 T-250 の `SD-1` ・ `SD-2`）。原稿に型の欄を足すことは本波ではしていない。
コードの遷移の関数はガードの名を持たない（生成した定数の `guard` の字面だけが変わった）。

⭐ 根の型 `ScreenValues` ・ `NoticeValues` の欄の名は今の状態の名である（継ぎ目）—— `session.screen.armModeState`。
改名が `src/use-case/advance-screen-session/` と 5 本の試験の外へ届かないことを grep で確かめた（型の名と欄の名を読むファイルは、その 3 ユニットと 5 本の試験だけ）。
⚠️ 古い `ScreenState`（`src/entity/document-model/screen-state/screen-state.ts`）と `InputCommandTranslator` は、いまも `taskShape` などの古い字面を持つ。**本波の型とは別の型**であり、`CR-436` の波 B2 がシェルを移すときに入れ替わる。

### A2.4 動かしたもの

| ファイル | 何を |
|---|---|
| `docs/spec/_source/state-machines.json` ・ `state-machines.schema.json` | A2.2 の形へ。変換は機械で行い、状態 39 ・ 出来事 35 ・ 遷移 63 の中身（キー・親・初期・運ぶ値・根拠・ガード・副作用・注）は 1 つも落としていない |
| `docs/spec/_source/state_machines_json_to_md.py` | 新しい形を読み、A2.2 の印字を刷る。拒むもの: 前からの 4 つ（根拠の ID が `docs/spec` に無い、升の状態・先・出来事が無い、共用体の初期が 1 つでない、出来事のキーが 2 つの領域にある）に加え、升の先が同じ状態機械の状態でない、表が使う出来事がその領域に無い、状態機械の名の重なり、名が `StateMachine` で終わらない、今の状態の名が根の運ぶ値と重なる、ガードの名が `is` / `has` / `can` で始まらない、`in` の項が同じ状態機械やありもしない状態を指す、1 つの出来事が状態とその祖先の両方に升を持つ、2 つ以上の枝のうちガードの無い枝がある、どの表も使わない出来事 |
| `tools/generate_state_machine_types.py` | A2.2 の型と定数を刷る。判別共用体の形（`kind` ・ 運ぶ値 ・ `child`）、出来事・処理の名、定数の名（`SCREEN_VALUES_INITIAL_AXES` など）は変えていない |
| `src/use-case/advance-screen-session/screen-values.ts` ・ `notice-values.ts` ・ `advance-screen-session.ts` | 型の名・根の欄の名・種類の字面だけ（A2.3）。振る舞いは変えていない。旧番号の `see` の行は、`see` の形に名を書けない（検査 55 が ID の形だけを許す）ので、その升を持つ表 `T-280` ／ `T-286` を指すように直した |
| `tests/contract/state-machine-screen-values.contract.test.ts` ・ `state-machine-notices.contract.test.ts` ・ `t-284-the-shared-step.contract.test.ts` | 原稿を読む部分（`regionOf` ・ `axisAndPath`）を新しい形へ。升を前と同じ行の形（元の連言・ガード・先）に読み戻すので、確かめることは変わらない。改名に引かれて、根の欄の名・種類の字面（`armEvent` の `taskShapeArmed`、見本の `dependencyArmed`、通知の `hidden` ・ `shown`）と試験の名も直した |
| `tests/unit/uf-86-…` ・ `uf-87-…` | 原稿を読む部分を升の枝ごとへ。定数と原稿が枝ごとに一致することを見る点は変わらない |
| `docs/spec/05-07-design.md` | 5.5 の散文と 表 T-250 の `SD-1` 〜 `SD-3`、名の読み方（R4.4 の形）、`CP-39` ・ `UT-11` ・ `UF-86` ・ `UF-87` ・ `PI-39` の表の番号、図 F-028 の軸の名、表 T-284 の `SS-3` ・ `SS-5` ・ `SS-6`、表 T-285 の `RA-1` |
| `docs/spec/_source/row-id-prefixes.json`（と生成物） | `SM` ・ `EV` ・ `TN` を外した（登録簿の行は 163 から 160 へ） |
| `.claude/skills/spec-graph-check/check-sm-ev-tn-prefix-gone.py` ・ `check.sh` | 検査 63。`PD-` を止める検査 51 と同じ形で、履歴として番号を持つファイル（本書・`CR-440` ・ `handoff-state-machine.md`）を名指しで除く |
| `docs/development-rules/03-implementation.md` | 生成定数の一覧の表の番号 |
| `docs/development-records/defects.md` | `DFC-677` ・ `DFC-680` の番号を名へ。`ledger_metrics.py` を走らせた |
| `change-request/CR-440-…` | 改訂の記録の 12 ・ 13 |

⚠️ 登録簿から外すことは、`PD-` と同じやり方にした —— 登録簿そのものには「二度と使わない接頭辞」を持つしくみが無く、登録したまま残すと、行を持たない接頭辞として登録簿の生成器が赤にする（`pending: true` はまだ書いていない行のための旗であり、退けた接頭辞に使えば意味が逆になる）。
⇒ 登録簿からは外し、書き戻しは検査 63 が止める。

### A2.5 番号から名への対応（付録 A.1 〜 A.3 の読み方）

- `SM-n`: 付録 A.1 のキー `screen.<軸>.<残り>` → `<状態機械>.<残り>`（軸から状態機械へは A2.3 の 1 つ目の表、残りの語を改めたものは 2 つ目の表）。根 `SM-0` ・ `SM-34` は各領域の `root`。
- `EV-n`: 付録 A.2 のキー → `<領域>/<キー>`。
- `TN-n`: 付録 A.3 の行の元の選言の 1 つずつが、先の状態機械の表の升 1 つになる。元の連言のうち先と違う状態機械の状態は、その升のガードの `in` の項になる。`self` は `to` ＝ いまの状態。根から出る行はその領域の `root` の升。先が 2 つの状態機械にある行（波 A の付録で 1 行）は、両方の表に 1 升ずつ。
- ⇒ 画面の値の 53 行は 78 の枝、通知の 10 行は 10 の枝になった（生成した遷移表の定数の要素の数）。

### A2.6 試験の数（前 → 後、2026-09-21 に同じ木で実測）

| 試験 | 前 | 後 | 違い |
|---|---|---|---|
| `tests/contract/state-machine-screen-values.contract.test.ts` | 1792 | 1792 | — |
| `tests/contract/state-machine-notices.contract.test.ts` | 445 | 445 | — |
| `tests/contract/t-284-the-shared-step.contract.test.ts` | 23 | 23 | — |
| `tests/unit/uf-86-the-transition-table-is-printed-from-the-manuscript.test.ts` | 54 | 79 | 1 ＋ 行 53 → 1 ＋ 枝 78。遷移表の定数の要素が行から升の枝へ変わった（A2.5） |
| `tests/unit/uf-87-the-notices-transition-table-is-printed-from-the-manuscript.test.ts` | 11 | 11 | 通知の 10 行は、どれも元が 1 つ・先が 1 つなので 10 枝のまま |

⭐ 壊して確かめた: 原稿の `milestoneListDisplayStateMachine.closed` の升の先を `closed` に変え、`changeDeliveryStateMachine` の `documentReplaced` の行を消すと、2 本の契約試験が 35 件赤になる。
生成器は、A2.4 の拒むもの 15 通りを 1 つずつ壊した原稿で、それぞれ 1 件だけを拒み、壊さない原稿は 0 件だった。

### A2.7 検査（前 → 後）

| 検査 | 前（`97868072`） | 後 |
|---|---|---|
| md-checks の最終行 | `tables=180  figures=21  rows=2360  uids=162` | `tables=177  figures=21  rows=2223  uids=162` |
| 同・検査 5 〜 10 ・ 15 ・ 48 | すべて 0 | すべて 0 |
| `check.sh` の最終行 | `FAILURES ABOVE -- red: 23 39` | `FAILURES ABOVE -- red: 23 39` |
| 検査 39 | `went 1369 -> 1382` | `went 1369 -> 1382`（動いていない） |
| 検査 63 | —— | 0 site(s)（1227 ファイル、除外は木 2 ・ ファイル 4） |
| 登録簿の生成器（`row_id_prefixes_json_to_md.py --check`） | 163 registered、spec 158/2360 | 160 registered、spec 155/2223 |
| `npm run gen:check` | 緑 | 緑 |

md-checks の数の読み方: 行は `SM` 39 ・ `EV` 35 ・ `TN` 63 の計 137 が減った（2360 − 137 ＝ 2223）。
表は番号の付いた表が 4 つ減り（`T-281` ・ `T-282` ・ `T-287` ・ `T-288`）、見出しの下の番号の無い表を md-checks が 1 つの「表」と数える分が 1 つ増えた（180 − 4 ＋ 1 ＝ 177）。
⭐ 番号の無い表は行 ID を持たない（先頭の欄は出来事の名）ので、md-checks の「番号の無い表の行 ID」の注には載らない。
⭐ 表の番号の飛び（`T-281` ・ `T-282` ・ `T-287` ・ `T-288`）を赤にする検査は無い —— md-checks は定義の重なりと参照の行き先だけを見、検査 62 は作りかけの変更要求の主張だけを読む。どちらも本波の後で緑である。

### A2.8 この波でやらないこと

- 過去の変更要求（`CR-379` ・ 本書 ・ `CR-440`）の番号は書き換えない。本書と `CR-440` には改訂の記録を足しただけである。
- `docs/development-records/handoff-state-machine.md` の番号は、その日の引き継ぎの履歴として残す（検査 63 が名指しで除く）。
- `docs/development-records/rulings.md` には書かない（前に立つ者が裁定を記す）。
- 波 B1 ・ B2 の中身。

## 改訂の記録 —— 波 A2 を当てた（2026-09-21）

| # | 起草時の文 | 直した文 | 理由 |
|---|---|---|---|
| 24 | 付録 A.1 〜 A.3 と本文の `SM-0` 〜 `SM-33` ・ `EV-1` 〜 `EV-30` ・ `TN-1` 〜 `TN-53` | 本書では直さない。番号は `JDG-286` で退き、いまの名は「波 A2」の節の A2.3 と A2.5 の読み方で引ける。全数は `docs/spec/_assets/tbl-state-machines.md` の 表 T-280 | `JDG-286`。当てた日の履歴を書き換えると、その日の測りと突き合わせられなくなる |
| 25 | 冒頭の状態「波 A を当てた」 | 波 A2 を当てたことを足した | 本書の読み手が、原稿の形が付録と違うことを冒頭で知るため |
| 26 | 画面の値の原稿の出来事 30、`openSurfaceStateMachine` の升 8 | `CR-460` の波 A（2026-09-21）が、出来事 `screen/flowSurfaceAnswered`（`U-56` ・ `U-61` の答えの入口。運ぶ値 `surfaceName`）と、`openSurfaceStateMachine` の `open` × それ → `closed` の 1 升（副作用なし）を足した。画面の値の出来事は 31、`openSurfaceStateMachine` の升は 9。`screen-values.ts` に `onFlowSurfaceAnswered` | `CR-460` の決定 7 —— 答えの枝は `fileFlow` 側で副作用を 1 つ持つので、面を閉じることを画面の値の出来事に割った。`tellFlowSurfaceClosed` を返さないので、答えた後に `fileFlow/flowSurfaceClosed` が戻らない。本書の波 B2 の 表 T-283 へ申し送る 3 行は `CR-460` の 2.2 |

## 改訂の記録 —— 波 B1 を当てた（2026-09-22）

第 5.3 節のとおり `JDG-283`（`PND-451`）を当てた。状態機械の原稿・生成物・試験・台帳には触れていない（試験は仕様だけを読む体、台帳は前に立つ者）。

| # | 対象 | 変えたこと |
|---|---|---|
| 27 | `docs/spec/01-04-requirements.md` の `FR-052` と 表 T-023d の `GR-22` | 閉路なので 1 度の編集で書いた。`FR-052` の `GR-22` を名指す文の直後に 1 文（MUST）を足した —— プロパティパネルを出していないあいだ（`S-99h`）その境界に掴み帯を敷かないこと。`GR-22` の場所の欄に「プロパティパネルの側は、パネルを出しているあいだだけ（`FR-052`）」を足した。`GR-22` に `（MUST）` は書いていない。`S-134` は変えていない |
| 28 | `src/adapter/screen-renderer/screen-frame.ts` | 帯の列を返す小さな関数 `dividersOf` を足し、パネルを出していないあいだ（描き手の入力の `propertiesShowing` が空）は行見出しパネルの帯だけを返す。`screenFrameFromRegions` はその呼び出しに替えた |
| 29 | `src/framework/single-html-shell/frame-loop.ts` | 押下の枝の `@provisional PND-451` の塊（境界の押下でパネルを戻す仮置き）を消した。ほかの行には触れていない |

検査 60 の数（`function-size.mjs` で同じ 2 ファイルを当てる前 `9b8a22b7` と後とで測った。行 / 分岐）:

| 関数 | 前 | 後 |
|---|--:|--:|
| `receiveInput` | 189 / 80 | 178 / 77 |
| `frameLoop` | 2616 / 4 | 2605 / 4 |
| `screenFrameFromRegions` | 55 / 2 | 48 / 2（帯の外へ出た） |
| `dividersOf`（新） | —— | 10 / 1 |

⇒ 全体の超過は `excess-lines` が 27、`excess-branches` が 3 下がる。`screenFrameFromRegions` の HELD の行は古くなるので、基準線の書き換えは前に立つ者が利用者に数を見せてから行う。

---

## 波 B2 —— シェルへ結線する設計（2026-09-22、`5413bea5` で測り直した）

⭐ **状態（2026-09-22）: 波 B2 の第 1 段（仕様・原稿・生成器・辺・表 T-283）を `5413bea5` の上で当てた（B.16）。第 2 段（コード）と第 3 段（仕様だけを読む試験）はまだである。**  
⭐ **波 B1 は当てた** —— 本書の末尾の「改訂の記録 —— 波 B1 を当てた（2026-09-22）」。本節の B.4.1 と B.5 は、B1 を B2 の直前に置いた理由の記録として残す。  
⭐ 本節は、読むだけの体が `9b8a22b7` で起草した設計（利用者に問うた候補はすべて反証済み —— B.13）を、当てる体が 1 か所ずつ突き合わせて本書へ移したものである。
⭐ 利用者の裁定（2026-09-21、前に立つ者が `rulings.md` に記す）—— 段 5・段 6 の完了を待たずに結線を始める。まず本書の波 B2（共通の 1 段の結線と `ScreenSession` の移行）を 1 つにまとめて入れ、その後にほかの領域の結線（`CR-440` ・ `CR-450` ・ `CR-460` ・ `CR-480` ・ `CR-490`）を別々の作業木で並べて進め、`frame-loop.ts` へ 1 つずつ合流する。性能はすべての結線の後に 1 度だけ測る（⇒ 各波は 1 コミットで、二分探索できること）。各波の合否は単体試験・`check.sh`・型検査で判じ、e2e と照合（parity）は段の出口だけで回す。`CR-500` の波 B（面の `focusin` ／ `focusout` の知らせ）は段 6 を待つ。
⛔ `src/framework/dom-screen-surface/` は段 6 のセッションの持ち場である。本節の変更はそこに 1 字も触れない（面の公開の名前と署名は変わらない）。

**本節の行番号と数は、断りが無いかぎり `9b8a22b7`（ブランチ `refactor` の先端）で 2026-09-22 に測った。** ⛔ 当てる体は入口で測り直すこと。  
⭐ **`5413bea5`（B1 を当てた木）で測り直した値は B.1a にある。** `frame-loop.ts` の行番号は、`9b8a22b7` の :1799〜:4168 が `5413bea5` では ＋4、:4180 以降が −7 ずれる（B1 の差し引き。`screenState` の宣言 :1816 → :1820、書き手 :4214 → :4207 で確かめた）。

---

### B.0 ⭐ 結論（前に立つ者へ）

1. **波 B1 は波 B2 の直前に、同じ作業木の別のコミットとして当てた**（`5413bea5`。B.5 の導き。利用者の順の指示から 1 点だけ外れる —— 問いではなく、導いた帰結として伝えた）。
2. **波 B2 は 1 コミット**。範囲は「シェルの `let session` と 1 本の送り口」「画面の値の領域の出来事と副作用の結線」「描き手の入力の移行（袋を消す）」「入力の翻訳係の入力文脈と出来事」「旧 `ScreenState` の形を消す」「表 T-283」。
3. **決定 3（生成器の出力先を `screen-state.ts` へ移す）は B2 に入れない**。段 7 の出口へ延ばす（B.8）。
4. **継ぎ目**（B.3）を B2 が敷くので、後の領域の波は `frame-loop.ts` の自分の塊だけを書き換え、仕様の数（`SU-3` ・ 表 T-063 の `UT-6` ・ 表 T-075）にも表 T-283 にも触れずに済む。
5. **振る舞いの同一は、B1 を当てた木と B2 を当てた木を同じ台本で回して、画面に渡したものをバイトで比べる照合器で示す**（B.9）。読んで見つけた食い違いの候補 8 件（B.7）は、すべて「今日を写す」詰め方で B2 に入れ、台帳に起こしてから別のコミットで直す（`JDG-57`）。

---

### B.1 測った事実（`9b8a22b7`、2026-09-22）

| 数 | 値 | 測り方 |
|---|--:|---|
| `frameLoop` の範囲 | 1799〜4414 行 | `function-size.mjs` が返す `startLine` ・ `endLine`（`^}` の grep は 4477 を拾う —— それは後ろの生成定数の閉じ括弧である） |
| `frameLoop` が直に持つ `let` | **66** | `sed -n '1799,4414p' src/framework/single-html-shell/frame-loop.ts \| grep -c "^  let "` |
| 移す 12 の `let` の宣言 | `screenState` :1816 ・ `isLevelZeroFolded` :1843 ・ `isMilestoneListOpen` :1845 ・ `isPaletteMinimised` :1846 ・ `propertiesShowing` :1879 ・ `propertiesSubject` :1880 ・ `isPropertiesPanelPutAway` :1883 ・ `isDialogueFieldVisible` :1886 ・ `language` :1887 ・ `isTooltipDismissed` :1916 ・ `scaleMessage` :1921 ・ `dualCursorFollowing` :1923 | `grep -n "^  let "`。`1616d28d` と同じ行（第 3.1a 節） |
| その 12 を書く所 | `screenState`: :2502 ・ :2520 ・ :3158 ・ :3176 ・ :3213 ・ :3653 ・ :3664 ・ :3678 ・ :4214 ・ :4410。`isLevelZeroFolded`: :4015 ・ :4074。`isMilestoneListOpen`: :3606。`isPaletteMinimised`: :3593 ・ :4215。`propertiesShowing`: :4006 ・ :4053。`propertiesSubject`: :4056。`isPropertiesPanelPutAway`: :3573 ・ :3897 ・ :3902 ・ :4003 ・ :4052 ・ :4173 ・ :4220。`isDialogueFieldVisible`: :4025。`language`: :3588。`isTooltipDismissed`: :4160 ・ :4208。`scaleMessage`: :2369 ・ :2373。`dualCursorFollowing`: :4011 ・ :4222 | `grep -nE "\b<名>\s*=[^=]"`（宣言の行を除く） |
| `@provisional PND-451` の塊 | :4169〜:4179 | 読んだ |
| 出していないパネルの境界の帯 | `src/adapter/screen-renderer/screen-frame.ts:105` | 読んだ |
| `FR-052` ・ `GR-22` の定義の行 | `docs/spec/01-04-requirements.md:4034`（`**UID**: FR-052`）・ `:3337` | `grep -n` |
| 旧 `ScreenState`（`Entity`）を読む `src/` のファイル | 15（`Adapter` 10、`Framework` 1、`UseCase` 4）。うち型 `ScreenState` を読むのは `Adapter` 7 と `frame-loop.ts`。`UseCase` の 4 つ（`screen-values.ts` ・ `selection-values.ts` ・ `edit-task.ts` ・ `task-plan-actual.ts`）は `RememberedActual` ・ `EscapeTarget` だけ | `grep -rlE "screen-state/screen-state" src` と名ごとの `grep -oE` |
| `Adapter` の袋 `ScreenSession` を読む `src/` のファイル | 11（`screen-renderer/` の 10 ＋ `frame-loop.ts`）。ほかに集約の `ScreenSession` を定義する `advance-screen-session.ts` | `grep -rlw ScreenSession src` |
| 袋か旧 `ScreenState` を読む試験 | **80 ファイル** | `grep -rlE "emptyScreenState\|ScreenState\b\|screenStateWith\|screenStateFromInput" tests` と、袋を読む（`advance-screen-session` を読まない）ファイルの和 |
| `frame-loop.ts` を import する試験 | 80。うち袋も旧 `ScreenState` も読まないもの **67** —— B2 で 1 字も変えずに緑であるべき試験（B.9） | `grep -rl "single-html-shell/frame-loop" tests` と上の差 |
| 検査 60 の基準線 | `excess-lines=7868 excess-branches=777`、HELD 87 行。検査は緑 | `python .claude/skills/spec-graph-check/check-function-size.py` |
| B2 が触る HELD の関数（いまの値） | `frameLoop` 2616 / 4 ・ `receiveInput` 189 / 80 ・ `carryOutAction` 254 / 68 ・ `runFrame` 135 / 14 ・ `sessionOf` 94 / 7 ・ `owesFrame` 30 / 17 ・ `answerSettledEntry` 103 / 23 ・ `screenStateFromInput` 45 / 25 ・ `openModalFromScreenState` 89 / 12 ・ `commandStateOf` 56 / 13 ・ `screenFrameFromRegions` 55 / 2 | 同上と `function-size.mjs` の直の出力 |
| 検査 61 の基準線 | HELD 2（`deliveringNotices` ・ `REGISTRATIONS`）。`Framework` は検査の外 | `module-state-baseline.txt` |
| `components.json` | nodes 37、edges 140 | `python -c` で `len` |
| `audit-ch5.py` の `NOT_YET_CALLED` | `{"AdvanceScreenSession": "CR-436 wave B2"}`（:163〜:166） | 読んだ |
| 表 T-075 の行と最大 | 101 行、最大 `UF-122`。`UF-123` は 0 件 | `grep -c "^\| UF-"`、`git grep -nE "UF-12[3-9]\b"` |
| `SU-1` ・ `SU-3` | 37 ・ 101 | `05-07-design.md:243` ・ `:245` |
| `T-283` | 定義 0。`docs/development-records/handoff.md:46` が「T-280 以降と T-283 は相手（状態機械のセッション）」と取り決めている | `git grep -n "T-283"` |
| 行 ID の接頭辞の登録簿 | 160 件。`RG` は 0 件（`docs` ・ `change-request` ・ `src` ・ `tests` ・ `tools` ・ `.claude` ・ `package.json` を `\bRG-[0-9]+` で grep） | `row-id-prefixes.json` の `prefixes` の `len` |
| md-checks の最終行 | `tables=181  figures=25  rows=2241  uids=162` | `python .claude/skills/spec-graph-check/md-checks.py .` |
| 台帳の上端 | `DFC-702` | `grep -oE "DFC-[0-9]+" docs/development-records/defects.md` |

⚠️ 本書の第 1 節の「`frameLoop` の範囲 1799〜4414」は `2112d0c9` の値であり、`9b8a22b7` でも同じだった（段 5 は `frameLoop` の外の翻訳係を割った）。

#### B.1a `5413bea5` で測り直した値（2026-09-22、仕様の体が当てる直前）

| 数 | 値 | 測り方 |
|---|--:|---|
| `frameLoop` の範囲 | 1803〜4407 行（2605 行） | 基準線 `function-size-baseline.txt` の `frameLoop lines=2605` と `grep -n "^export function frameLoop"` |
| `frameLoop` が直に持つ `let` | **66** | `sed -n '1803,4407p' src/framework/single-html-shell/frame-loop.ts \| grep -c "^  let "` |
| 移す 12 の `let` の宣言 | `screenState` :1820 ・ `isLevelZeroFolded` :1847 ・ `isMilestoneListOpen` :1849 ・ `isPaletteMinimised` :1850 ・ `propertiesShowing` :1883 ・ `propertiesSubject` :1884 ・ `isPropertiesPanelPutAway` :1887 ・ `isDialogueFieldVisible` :1890 ・ `language` :1891 ・ `isTooltipDismissed` :1920 ・ `scaleMessage` :1925 ・ `dualCursorFollowing` :1927 | `grep -nE "^  let <名>\b"` |
| その 12 を書く所 | **32 か所** —— `screenState` 10（:2506 ・ :2524 ・ :3162 ・ :3180 ・ :3217 ・ :3657 ・ :3668 ・ :3682 ・ :4207 ・ :4403）、`isLevelZeroFolded` 2（:4019 ・ :4078）、`isMilestoneListOpen` 1（:3610）、`isPaletteMinimised` 2（:3597 ・ :4208）、`propertiesShowing` 2（:4010 ・ :4057）、`propertiesSubject` 1（:4060）、`isPropertiesPanelPutAway` 6（:3577 ・ :3901 ・ :3906 ・ :4007 ・ :4056 ・ :4213 —— B1 が `:4173` を消した）、`isDialogueFieldVisible` 1（:4029）、`language` 1（:3592）、`isTooltipDismissed` 2（:4164 ・ :4201）、`scaleMessage` 2（:2373 ・ :2377）、`dualCursorFollowing` 2（:4015 ・ :4215） | `grep -nE "\b<名>\s*=[^=]"` から宣言の行を除いた |
| 関数の位置 | `SessionHeld` :1159 ・ `sessionOf` :1200 ・ `escapeLevelOf` :1426 ・ `showScaleMessage` :2372 ・ `answerWatermarkUnlock` :2503 ・ `collectInputContext` :3025 ・ `askHowToOpen` :3154 ・ `answerSettledEntry` :3571 ・ `carryOutAction` :3782 ・ `showPropertiesOfChoice` :4054 ・ `standOnWhatWasCreated` :4065 ・ `owesFrame` :4087 ・ `receiveInput` :4139 ・ 公開の `fullScreenChanged` :4401 | `grep -n "function <名>"` |
| 検査 60 | 実測 `excess-lines=7840 excess-branches=774`、HELD 86 行（基準線の見出しは B1 の後の 7841 / 774） | `check.sh` の検査 60 の行 |
| B2 が触る HELD の関数 | `frameLoop` 2605 / 4 ・ `receiveInput` 178 / 77 ・ `carryOutAction` 254 / 68 ・ `runFrame` 135 / 14 ・ `sessionOf` 94 / 7 ・ `owesFrame` 30 / 17 ・ `answerSettledEntry` 103 / 23 ・ `screenStateFromInput` 45 / 25（`screenFrameFromRegions` は B1 で帯の外へ出た） | `function-size-baseline.txt` |
| `components.json` | nodes 37、edges 140 | `python -c` で `len` |
| 表 T-075 | 101 行、`UF-123` は 0 件 | `impact.py T-075`、`git grep -nE "UF-12[3-9]\b" HEAD` |
| `T-283` | `docs/spec` に 0 件 | `git grep -c "T-283" HEAD -- docs/spec` |
| 行 ID の接頭辞の登録簿 | 160 件。`RG` は 0 件 | `row-id-prefixes.json` の `prefixes` の `len`、`git grep -nE "\bRG-[0-9]+"` を `docs` ・ `change-request` ・ `src` ・ `tests` ・ `tools` ・ `.claude` ・ `package.json` に |
| md-checks の最終行 | `tables=181  figures=25  rows=2231  uids=162`（`9b8a22b7` の 2241 との差 −10 は `CR-441` が退けた 10 行） | `python .claude/skills/spec-graph-check/md-checks.py .` |
| 台帳 | `DFC-703` 〜 `DFC-711` は 0 件（本波の予約。前に立つ者が起こす）。表の最大の行は `DFC-760`（別の帯）、その下は `DFC-702` | `git grep -nE "DFC-70[3-9]\b\|DFC-71[01]\b"` |


---

### B.2 名（`R2`）

| 名 | 何か | 選んだ理由 | 退けた名 |
|---|---|---|---|
| **`ScreenViewReadings`**（型、`ScreenRenderer`） | 描き手が集約のほかに読む値 —— フレームで取ったポインタの値・寸法、文書から導く値（`SF-10`）、まだ集約へ移していない領域の欄 | 出力の型 `ScreenView`（`PI-37`）と対になり、「`ScreenView` を作るために取った読み」と読める。`R2` の型は名詞句 | 仮称 `RenderFrameInput`（`Frame` が `FrameValues` と、`Input` がこの木の「人の入力」（`HumanInput` ・ `InputSource`）と紛れる）。`…Source`（`SnapshotSource` ・ `InputSource` と紛れる）。`…Extras`（汎用名） |
| **`screenViewReadingsOf`**（`frame-loop.ts` のモジュールの関数、`pure`） | いまの `sessionOf`（:1196）の後継。フレームの値と文書から `ScreenViewReadings` を組む | `pure` のクエリは名詞句（`R2` の品詞の規約） | `sessionOf`（集約と同じ語を持つ） |
| **`ScreenViewReadingsTaken`**（同、モジュールの `interface`） | いまの `SessionHeld`（:1155）の後継 | 同上 | `SessionHeld` |
| **`sendToSession`**（`frameLoop` の中の関数、`non-pure`） | 出来事を 1 つ集約へ渡し、現在値を差し替え、返った副作用をその場で実行する唯一の道 | コマンドは動詞 ＋ 目的語 | `dispatch`（曖昧な動詞）、`advance`（`UseCase` の名と重なる） |
| **`screenEventFromInput`**（`PI-18`、`screen-state-input.ts`） | いまの `screenStateFromInput` の後継。入力から画面の値の出来事（無ければ `null`）を返す | 同じユニットの同じ形の名（`commandFromInput` ・ `selectionFromInput`） | —— |
| **`session-effects.ts`**（新しいユニット、`SingleHtmlShell`） | 副作用の実行の形（型 `EffectRunners` と 1 本の実行 `runSessionEffects`、まだ結線していない領域の置き場 `unwiredEffect`） | ファイル名は中身の名（`R2`） | —— |

⛔ どの名も `FrameValues` ・ `ScreenSession` ・ `ScreenFrame` を含まない（第 4 節の禁止）。
⭐ `Adapter` の袋 `ScreenSession`（`screen-renderer.ts:402`）と `Adapter` の `PropertiesSubject`（`:397`）は B2 で消え、名 `ScreenSession` は集約だけが持つ（決定 2）。描き手は集約の `PropertiesSubject`（`screen-values.ts:15`）を公開エントリ経由で読む。

---

### B.3 ⭐ 継ぎ目 —— 後の領域の波が `frame-loop.ts` に最小の手で入り、1 つずつ合流できる形

**5 行で**:
1. シェルは `let session: ScreenSession` を 1 つ持ち、出来事は必ず `sendToSession(event, frame)` を通す —— `advanceScreenSession` を呼び、参照を差し替え、返った副作用を同じ呼び出しの中で順に実行する（`SF-6` ・ `SF-7`、`UF-48` の全画面表示の MUST はこれで保たれる）。
2. 副作用の実行は、効果の種類をキーにした 1 つの表 `effectRunners` で引く。表の型 `EffectRunners<SessionEffect>` は 6 領域の全種類を求めるので、B2 は画面の値の 14 種と共有の `raiseNotice` を書き、ほかの領域の 11 種を `unwiredEffect` で埋める。表は領域ごとの塊に分け、後の波は自分の塊の行だけを差し替える。
3. 描き手は B2 から根の `ScreenSession` 全体を受ける（`screenViewFromRegions` の署名は B2 で 1 度だけ変わる）。後の波は `ScreenViewReadings` の自分の欄を消し、部品が `session.<領域>` を読むように直すだけで、署名にも組み立ての他の行にも触れない。
4. `Esc` の段は `receiveInput` の中の 1 つの表（段 → 出来事、1 段 1 行）で送る。まだ結線していない段は今日の呼び出しのまま 1 行を占め、後の波はその行だけを差し替える。
5. 描き直しの義務は根の参照 1 つで判じる（`owesFrame` の `screenState` の比較を `session` の比較へ）。後の波で自分の値が根へ入ると、`owesFrame` の自分の比較の行（`selection` ・ `raisedNotices` ・ `pressed`）を消すだけでよい。

#### B.3.1 送り口（`frame-loop.ts`、`frameLoop` の中）

```ts
// see SF-6, SF-7, UF-48
/** @purity non-pure */
function sendToSession(event: SessionEvent, frame: FrameValues | null): void {
  const step = advanceScreenSession(session, event)
  session = step.state
  runSessionEffects(step.effects, effectRunners, frame)
}
```

- 分岐 0（検査 60 の帯の内側）。参照が同じなら差し替えても何も変わらない（`SS-5`）。
- `frame` を渡すのは、いまの書き込み `writeDocument(commands, frame)` がその入力の `frame` を使うからである。`requestAnimationFrame` の無い試験の環境では `ask()` がその場で `runFrame()` を回し、入力の途中で `values` が差し替わる（`:2328`〜`:2335`）—— `values` を読み直すと今日と違う `frame` で書く。
- 結果を出来事で戻す副作用（照合 `matchWatermarkUnlock`、時計）は、実行の中で `sendToSession` を呼び直す。同期の副作用はその場で、非同期の副作用は `Promise` と時計の後で。
- ⭐ **全画面表示**: `fullScreenEntryPressed` は入力の翻訳から `receiveInput` の中で送られ、`askBrowserForFullScreen` はその同じ呼び出しの中で実行される。フレームへ延ばす道が構造上ない。

#### B.3.2 副作用の実行（新しいユニット `src/framework/single-html-shell/session-effects.ts`）

```ts
export type EffectRunner<E> = (effect: E, frame: FrameValues | null) => void
export type EffectRunners<E extends { readonly type: string }> = {
  readonly [T in E['type']]: EffectRunner<Extract<E, { readonly type: T }>>
}
export function runSessionEffects(effects, runners: EffectRunners<SessionEffect>, frame): void // 1 つずつ順に
export function unwiredEffect(effect: { readonly type: string }): never // 投げる。届かない
```

- ⭐ **`raiseNotice` は 3 領域が持つ**（画面の値 `RS-41` ・ `RS-35`、通知 `RS-23`、ファイル操作と問い `RS-27`）。表の型は 3 つの和を 1 つの項目に求めるので、`raiseNotice` の項目は共有の塊に 1 つだけ置く（`raiseNotice(effect.reason, null)`）。
- `frameLoop` の中の表 `effectRunners` の形（B2 が敷く）:

```ts
const effectRunners: EffectRunners<SessionEffect> = {
  // shared
  raiseNotice: (effect) => raiseNotice(effect.reason, null),
  // screen (T-280) -- CR-436
  storeLanguage: …, writeProgressStep: …, askBrowserForFullScreen: …, …（14 行）
  // gesture (T-289) -- CR-450 wave B replaces these lines
  startEntryRepeat: unwiredEffect,
  restorePaletteCorner: unwiredEffect,
  repeatHeldEntry: unwiredEffect,
  // fileFlow (T-290) -- CR-460 wave B replaces these lines
  raiseFlowSurface: unwiredEffect, …（7 行）
  // fieldEntry (T-292) -- CR-480 wave B replaces this line
  bringCreatedRowIntoSight: unwiredEffect,
}
```

  ⭐ 塊と塊のあいだに注の行を 1 つ置く —— Git は隣り合う行の変更を衝突にするので、塊を隔てる変わらない行が要る。通知と選択は、共有の `raiseNotice` の外に副作用を持たない（`notice-values.ts` の副作用の名は `raiseNotice` だけ、`selection-values.ts` は `never`）。
- ⚠️ `unwiredEffect` は届かない —— まだ結線していない領域の出来事を、シェルは 1 つも送らない。`JDG-285` の `NOT_YET_CALLED` と同じ種類の「名指しで待たせる」置き場であり、各波が自分の行を消す。
- ⚠️ **ユニットを割る理由（表 T-276）**: `session-effects.ts` の変更の理由は「副作用の名の全数（表 T-280 ・ T-286 ・ T-289 ・ T-290 ・ T-292 の升）と、実行の順（`SF-6`）」であり、フレームの回し方（`frame-loop.ts`）とは互いに素（`UD-1`）。迷いの試験（`UD-5`）: 「副作用が 2 度実行された」「種類の漏れがコンパイルを通った」は本ファイル、「書き込みの中身が違う」は `frame-loop.ts` の実行の行。純粋性は理由にしない（`UD-3`）。
- ⛔ 実行の本体（閉包）は `frameLoop` の中に残す —— 書き込み・通知・時計はシェルの閉包の値を読む。本体を外へ出すには「手」の `interface` を 1 つ挟むことになり、行も辺も増えるだけである。

#### B.3.3 描き手の入力

```
screenViewFromRegions(regions, schedule, settings, selection, session: ScreenSession /* 集約の根 */, dialogueLog, readings: ScreenViewReadings)
```

- 5 番目の引数（いまは旧 `ScreenState`）と 7 番目の引数（いまは袋）の位置を変えない —— 呼び手と試験の書き換えが引数の中身だけで済む。
- 描き手は根の全体を受ける —— 後の波が `session.notices` ・ `session.selection` などを読むときに署名が動かない。`ScreenRenderer → AdvanceScreenSession` の辺は B2 で 1 本だけ足す（B.6.3）。
- `ScreenViewReadings` の欄（B2 の後）: フレームの値 7（`pointer` ・ `pointerRestedMs` ・ `iconUnderPointer` ・ `taskUnderPointer` ・ `commandPaletteAt` ・ `rowBoxes` ・ `scrollExtent`）、文書から導く値 5（`themePreference` ・ `themeHue` ・ `canUndo` ・ `canRedo` ・ `aiExportDocument`）、まだ移していない領域の値 12（第 4 節の表の 2 行目）。⭐ 画面の値の 10 欄はここから消える（描き手は `session.screen` から導く）。
- 第 4 節の「⭐ 段 7 の出口に『フレームの値の入力はフレームの値と文書から導く値だけ』を足す」は、この 12 欄が全部消えたときに成る。どの波がどの欄を消すか:

| 欄 | 消す波 |
|---|---|
| `notices` | `CR-440` の波 B1 |
| `confirmation` ・ `mergeCandidates` ・ `unreadColumns` ・ `droppedTaskNames` ・ `openedFileName` ・ `fileSavedAt` | `CR-460` の波 B |
| `rowGrabbedAt`（掴んでいるかだけ。`resistedPx` ・ `atY` は読みに残る） | `CR-450` の波 B |
| `selectedGroupIds` ・ `selectedResourceUids` | `CR-490` の波 B |
| `isAgentApiEnabled` ・ `isRecordingInteractions` | まだ変更要求が無い（`CR-490` の第 11 節が別の変更要求にすると挙げた） |

#### B.3.4 入力の翻訳係

- `InputContext.screenState: ScreenState` → **`InputContext.screen: ScreenValues`**（読むだけ）。
- ⭐ いま翻訳係が読む派生の値 `dualCursorFollowing` ・ `isLevelZeroFolded` ・ `isPropertiesPanelShowing` ・ `isSurfaceStanding` は、**名と型を保ち**、シェルが `session` から詰める —— 翻訳係の兄弟 13 と、その試験の入力の見本を動かさない（`CR-480` 2.2 の 3、`CR-490` 2.2 の 2 と同じ約束）。
- `screenEventFromInput(input, context): ScreenValuesEvent | null` —— 旧 `screenStateFromInput` が返していた「次の状態」の 1 つの変化ずつを、その変化を起こす出来事 1 つに写す（旧は 1 つの入力で 1 つしか変えない —— :114〜:158 と :48〜:83 を読んで確かめた）。
- ⭐ `Esc` の段は翻訳係ではなくシェルが決める（いまの `escapeLevelOf`、:1422）—— 段の判定は通知・問い・パネル・説明を見るが、翻訳係の `escapeContextOf` はそれを見ない（`screen-state-input.ts:135` の TRAP）。⇒ `screenEventFromInput` は `Esc` に `null` を返し、シェルの段の表（B.3.5）が送る。
- 翻訳係が `InputAction` として返している画面の値の 7 種（`togglePaletteMinimised` ・ `toggleMilestoneList` ・ `toggleDocumentSettingsProperties` ・ `toggleDialogueFieldVisible` ・ `toggleFullScreen` ・ `setLevelZeroFolded` ・ `setDualCursorFollowing`）は、**B2 では `InputAction` のまま**にし、シェルの `carryOutAction` のその `case` が出来事へ写して送る。⭐ 理由: 7 種を返すのは `commandFromEntry`（HELD 169 / 72）と兄弟 3 つであり、ほかの領域の波も同じ関数の別の枝を動かす。B2 で型を変えると、後の波の全部がそこで衝突する。
- 表示の言語の入口（`DISPLAY_LANGUAGE_ENTRY`）・パレットの最小化・マイルストーン一覧・対話欄の入口は、いま `answerSettledEntry`（:3567〜）がシェルで消費している。B2 はその枝の本体を `sendToSession` 1 行へ替える。

#### B.3.5 `Esc` の段の表（`receiveInput` の中）

いまの :4201〜:4224 の枝の並びを、段 → 送るもの の 1 段 1 行へ組み替える。

| 段（コードの `EscapeTarget`） | B2 が送るもの | 後で差し替える波 |
|---|---|---|
| `notice` | いまのまま `dismissNewestNotice()` | `CR-440` の波 B1（`notices/newestNoticeDismissAsked`） |
| `textEntry` | いまのまま（何もしない —— 面が消費する） | `CR-500` の波 B |
| `confirmation` | いまのまま `answerConfirmation(false, frame)` | `CR-460` の波 B（`fileFlow/confirmationAnswered`） |
| `surface` | `screen/escapePressed{rung: 'surface'}` | —— |
| `gesture` | いまのまま（`pressed = null` ほか、:4227〜:4239） | `CR-450` の波 B（`gesture/pressInterrupted`） |
| `propertiesPanel` | `screen/escapePressed{rung: 'surface'}` —— 画面の値の機械は、面が閉じているときの `surface` の段をパネルに当てる（`screen-values.ts:1030`〜`:1034`）。コードがパネルの段を身振りの下に置く食い違いは `DFC-570` のまま | —— |
| `armed` | `screen/escapePressed{rung: 'armed'}` | —— |
| `selection` | いまのまま（`selectionFromInput` が解く） | `CR-490` の波 B（`selection/selectionEscapePressed`） |
| `dualCursorMode` | `screen/escapePressed{rung: 'dualCursorMode'}`（書き込み `clearDualCursor` は副作用 `writeClearDualCursor` の実行が行う） | —— |
| `tooltip` | `screen/escapePressed{rung: 'tooltip'}` | —— |

⚠️ `isBrowserDefaultStopped`（:4338〜）は同じ段の判定を読むだけで、何も送らない（`FrameLoop` の宣言 :211 の TRAP「ここで状態を変えると `IN-4a` が動いた後の画面を読む」を保つ）。

#### B.3.6 後の波の手の数（見込み）

| 波 | `frame-loop.ts` で触るもの | 触らないもの |
|---|---|---|
| `CR-440` 波 B1 | `effectRunners` の塊 0 行（通知は `raiseNotice` だけ）、段の表の `notice` の 1 行、`raiseNotice` の本体、`receiveInput` の通知の枝、`owesFrame` の `raisedNotices` の比較の 1 行、`ScreenViewReadings` の `notices` の 1 行、`let` 4 | 送り口・表の型・描き手の署名・`SU-3` ・ `UT-6` ・ 表 T-283 |
| `CR-450` 波 B | 塊の 3 行、段の表の `gesture` の 1 行、押下の開始と終わり、`collectWriteMoment` の 1 行、`readSnapshot` の 1 行 | 同上 |
| `CR-460` 波 B | 塊の 7 行、段の表の `confirmation` の 1 行、`tellFlowSurfaceClosed` の 1 行（B.4.3）、開く・保存の枝、`receiveInput` の末尾の 3 つの片付け（:4278〜:4294） | 同上 |
| `CR-480` 波 B | 塊の 1 行、名前付けの 4 つの `let` の読み手 | 同上 |
| `CR-490` 波 B | 塊 0 行、段の表の `selection` の 1 行、`let` 4 の書き手 9 か所 | 同上 |

⚠️ 衝突が残る所: `collectWriteMoment`（:3066〜:3072）と `readSnapshot`（:2765〜:2777）は 3 つの波（通知・身振り・名前付け）が別々の行を動かす —— ⭐ **B2 はこの 2 つの関数の欄を 1 行 1 欄のまま保ち、欄の順を変えない**。隣り合う欄の変更は Git が衝突にするので、合流する側は 1 行ずつ足し合わせる（中身は互いに素）。

---

### B.4 変更の一覧

#### B.4.1 波 B1（`JDG-283`）—— B2 の直前の別のコミット（⭐ 当てた。本書の末尾の「改訂の記録 —— 波 B1 を当てた（2026-09-22）」。下の表は起草時の計画の記録）

| 対象 | 変更 |
|---|---|
| `docs/spec/01-04-requirements.md` の `FR-052`（`:4034`〜）と 表 T-023d の `GR-22`（`:3337`） | 第 5.3 節の文のまま、**1 度の編集で**（閉路 `FR-052` ⇄ `GR-22`） |
| `src/adapter/screen-renderer/screen-frame.ts:105` | 出していないあいだ `propertiesPanel` の帯を並べない。⚠️ `screenFrameFromRegions` は HELD 55 / 2 —— 条件を関数の中に足すと分岐が 3 になり検査 60 が赤。⇒ 帯の列を返す小さな関数を別に置き、`:105` の行はその呼び出しに替える |
| `src/framework/single-html-shell/frame-loop.ts:4169`〜`:4179` | `@provisional PND-451` の塊を消す（`receiveInput` は 11 行と分岐 2 が減る） |
| 試験 | 第 5.3 節のとおり（仕様だけを読む体） |
| 台帳 | `PND-451` を閉じ、`JDG-283` の着地の欄を埋める（前に立つ者） |

#### B.4.2 波 B2 —— コード

| ファイル | 変更 |
|---|---|
| `src/framework/single-html-shell/frame-loop.ts` | ① `let` 12 を消し `let session` を置く。初期値は `emptyScreenSession` の画面の値の `language` だけを起動の読み（`screen?.language ?? startupDisplayLanguage()`、:1887）で埋めた値（決定 21）。② `sendToSession`、`effectRunners`（B.3.2）。③ 書き手 31 か所（B.1）を出来事へ（B.4.3 の表）。④ `collectInputContext` の `screenState` を `screen: session.screen` に、派生の 4 つを `session` から詰める。⑤ `owesFrame` の `screenState` の比較 2 行を根の参照の比較へ（引数 `sessionBefore` を 1 つ足す）。⑥ `escapeLevelOf` と `isBrowserDefaultStopped` の読みを `session` へ。⑦ `runFrame` と `exportScene` の描き手の呼び出しを B.3.3 へ —— `exportScene` は「絵の根」（画面の値は初期の値に、言語と第 0 階層の畳みを写し、パレットと対話欄は `hidden` —— いまの `:2575` の `stateForExport` と `:2601`〜`:2629` の袋と同じ見え方。透かしは `:2590` の TRAP のとおり現在の根から読む）を組むモジュールの関数を 1 つ持つ。⑧ `sessionOf` ・ `SessionHeld` を `screenViewReadingsOf` ・ `ScreenViewReadingsTaken` へ（10 欄を消す）。⑨ `fullScreenChanged`（:4408〜:4412）を `sendToSession` へ。⑩ `propertiesShowingNow` ・ `isPropertiesPanelOnScreen` ・ `withPropertiesPanelShown` は `session.screen.propertiesPanelContentState` から読む |
| `src/framework/single-html-shell/session-effects.ts`（新） | B.3.2 |
| `src/adapter/input-command-translator/screen-state-input.ts` | `screenStateFromInput` → `screenEventFromInput`（B.3.4）。`screenStateFromEntry` ・ `screenStateAfterMarkerPress` も出来事を返す形へ |
| `src/adapter/input-command-translator/input-command-translator.ts` | `InputContext.screen`、旧 `Armed` を `ArmModeState` ・ `ArmKind` へ（種類の字面は波 A2 の改名 —— `taskShape` → `taskShapeArmed` ほか、本書 A2.3 の表）。`isSameArm` は機械のガードになったので、翻訳係からは消える見込み（読み手を測って決める） |
| `src/adapter/input-command-translator/armed-placement.ts` ・ `item-grab.ts` ・ `selection-input.ts` ・ `shortcut-keys.ts` | 構えの読み（新しい字面）、覚えた実績を `context.screen.rememberedActuals` から、`escapeTarget` の新しい署名 |
| `src/adapter/screen-renderer/screen-renderer.ts` | 袋 `ScreenSession` と `PropertiesSubject` を消し、`ScreenViewReadings` を置く。`screenViewFromRegions` の署名（B.3.3） |
| `src/adapter/screen-renderer/` の部品（`app-header-items.ts` ・ `command-palette.ts` ・ `dialogue-field.ts` ・ `notices.ts` ・ `open-modals.ts` ・ `properties-panel.ts` ・ `row-title-panel.ts` ・ `screen-frame.ts` ・ `tooltips.ts`） | 画面の値の 10 欄と旧 `ScreenState` の 6 欄を `session.screen` から導く（例: `isPaletteMinimised` ＝ `paletteDisplayState.kind === 'shown' && paletteDisplayState.child.kind === 'minimised'`）。`notices.ts` ・ `row-title-panel.ts` は型の import だけが変わる見込み |
| `src/entity/document-model/screen-state/screen-state.ts` | 型 `ScreenState` ・ `Armed` ・ `OpenSurface` と `emptyScreenState` ・ `screenStateWith…` 6 つ ・ `rememberedActualOf` を消す。`escapeTarget(state, context)` → `escapeTarget(context)`（`EscapeContext` に `isSurfaceOpen` ・ `isArmed` を足す）。残るもの: `RememberedActual` ・ `EscapeTarget` ・ `DualCursorSide` ・ `EscapeContext` ・ `escapeTarget` |
| `src/use-case/advance-screen-session/advance-screen-session.ts` | 外が読む型を公開する（見込み: `ScreenValues` ・ `PropertiesSubject` ・ `ArmKind` ・ `ScreenValuesEvent`。⛔ 数は当てる時に、外の import から測って `PI-39` と揃える）。冒頭の TRAP（`Adapter` の同名の型）を消す |
| `src/use-case/advance-screen-session/screen-values.ts`（手書きの区画） | 書き込みの副作用が翻訳係の作った命令を運ぶ形（決定 23）。生成の区画は原稿から刷り直す |
| `docs/spec/_source/state-machines.json` と schema、生成器 2 本 | ① 表 T-283 の原稿（最上位の `priorities`、決定 24）。② 決定 23 の運ぶ値を 5 つの出来事へ。③ `state_machines_json_to_md.py` が表 T-283 を刷り、`--check` が `IN-4` の「消費する階層は … の順」と `Esc` の行の段の並びを比べる（決定 7） |
| `.claude/skills/spec-graph-check/audit-ch5.py` | `NOT_YET_CALLED` の項を消す（辞書は空で残し、注の「各項は除く波を名指す」を保つ）。表 T-075 の数を読んでいれば 101 → 102 |
| 試験 | ① 袋か旧 `ScreenState` を組む **80 ファイル**の入力の見本を新しい形へ（機械的。⛔ 主張の行は変えない —— 差分が見本の行だけであることを前に立つ者が数えて確かめる）。② 新しい単体試験: `session-effects.ts` の実行の順と全種類、`screenEventFromInput` の出来事（仕様だけを読む別の体 —— `RA-6` と同じ作法。継ぎ目の名は両方のブリーフに同じ字面で書く）。③ `tests/contract/units.contract.test.ts` のユニットの数 |
| 生成物 | `npm run gen`（`tbl-state-machines.md` ・ 登録簿 ・ 生成定数）、`components.json` の `build.py`（`docs/review/components/components.md` と図） |

⛔ `src/framework/dom-screen-surface/` には触らない —— B.1 の grep で、袋も旧 `ScreenState` も読んでいない（`grep -rl "ScreenSession\|screen-state/screen-state" src/framework/dom-screen-surface` が 0 件）。

#### B.4.3 書き手 → 出来事（`R2.19`、第 3.1a 節の `UD-4` の求め —— 割る処理ごとに `frame-loop.ts` の範囲を書く）

| いまの書き手（`frame-loop.ts`） | B2 が送るもの | 副作用の実行（`effectRunners` の画面の値の塊） |
|---|---|---|
| `receiveInput` :4214 `screenStateFromInput` | `screenEventFromInput` が返した出来事 | —— |
| 同 :4215 パレットを出し直したら最小化を解く | —— （機械が子を初期の `expanded` に戻す） | —— |
| `answerSettledEntry` :3573 パネルの閉じる入口 | `screen/surfaceCloseAsked{target: 'panel'}` | —— |
| 同 :3588 表示の言語 | `screen/displayLanguageChosen{language: いまの逆}` | `storeLanguage` → `writeBrowserStored('S-99', …)`（いまの :3589） |
| 同 :3593 パレットの最小化 | `screen/paletteMinimiseToggled` | —— |
| 同 :3606 マイルストーン一覧 | `screen/milestoneListToggled` | —— |
| 同 :3653 ・ :3664 取り込みの答え | いまのまま（`CR-460` の波 B が `screen/flowSurfaceAnswered` へ）。⚠️ B2 では `screen/flowSurfaceAnswered{surfaceName}` を送る —— 面を閉じる書き手は `session` しか無い | —— |
| 同 :3678 書き出しの形式 | `screen/flowSurfaceAnswered{surfaceName: U-54}`（`PND-448` の仮置きを写す） | —— |
| `askHowToOpen` :3158 ・ `askWhichFileToTakeFrom` :3176 ・ `tellWhatTheImportDropped` :3213 | `screen/surfaceRaisedByFlow{surfaceName}` | —— |
| `answerWatermarkUnlock` :2502 / `matchWatermarkUnlock` :2520 | `screen/watermarkUnlockAnswered{isProceeding}` → 照合の結果で `watermarkUnlockMatched` ／ `watermarkUnlockMismatched` | `matchWatermarkUnlock` → いまの :2513〜:2524（面から答えを読み、SHA-256 を比べ、結果を出来事で戻す）。不一致の告げは副作用 `raiseNotice`（`RS-41`、共有の塊） |
| `carryOutAction` :4003〜:4006 `toggleDocumentSettingsProperties` | `screen/settingsEntryPressed`（⚠️ B.7 の D2） | —— |
| 同 :4011 `setDualCursorFollowing` | 入る・抜ける: `screen/dualCursorEntryPressed`、置く: `screen/dualCursorPlaced` | `writePlaceDualCursor` ・ `writeFixDate1` ・ `writeFixDate2` → 運んだ命令を `writeDocument`（null なら書かない —— D4）。`writeClearDualCursor` → `writeDocument([{ kind: 'clearDualCursor' }], frame)` |
| 同 :4015 `setLevelZeroFolded` | `screen/foldAllPressed` ／ `screen/levelZeroOpened` | `writeFoldAll` ・ `writeOpenLevel` → 運んだ命令を `writeDocument` |
| 同 :4025 `toggleDialogueFieldVisible` | `screen/dialogueFieldEntryPressed{isAgentApiEnabled}` | 無効のときの `raiseNotice`（`RS-35`）は共有の塊。⚠️ いま無効のときの告げは `answerSettledEntry` の `:3600`〜 の枝が出し、有効のときはその枝が `false` を返して `carryOutAction` の切り替えへ落ちる —— B2 はその枝で両方の場合に出来事を 1 つ送り、同じ入力で 2 度送らない（照合器が数える） |
| 同 `toggleFullScreen` | `screen/fullScreenEntryPressed` | `askBrowserForFullScreen` → いまの :4035〜:4046（`UF-48` の MUST —— 入力の呼び出しの中） |
| 公開の `fullScreenChanged` :4408〜:4412 | `screen/fullScreenChanged{isFullScreen}`（`values` を渡す） | —— |
| `showPropertiesOfChoice` :4052〜:4056 | `screen/propertiesOfChoiceAsked{subject}`（選択が空なら送らない —— いまの :4051） | —— |
| `receiveInput` :4274〜:4276 選択が動いた | `screen/selectionMoved{subject}`（⚠️ D7） | —— |
| `settleTextEntry` :3897 ・ :3902 | 作った直後の名前なら `screen/createdNameSettled`、ほかは `screen/settleKeyPressed{hasNoSurfaceOrConfirmation, hasNoUnsettledEntry}`（`CR-480` 2.2 の 2 の詰め方） | `clearSelection` → `selection = emptySelection()`（`let selection` は `CR-490` の波 B まで残る） |
| `standOnWhatWasCreated` :4074 行を作ったら第 0 階層を開く | `screen/levelZeroOpened`（運ぶ命令は空 —— D8） | `writeOpenLevel` → 何も書かない |
| `receiveInput` :4208 ・ :4220 ・ :4222 `Esc` | B.3.5 の表 | —— |
| 同 :4160 動いたら説明を戻す | 説明を消しているときだけ `screen/pointerRestElapsed`（D1） | —— |
| `showScaleMessage` :2369 ・ :2373 | `screen/displayScaleStepped{percent, end}` ／ `screen/rowZoomEndReached{percent, end}` —— 送る場所はいまの `showDisplayScaleMessage` ・ `showRowZoomEndMessage` の呼び出し（数は書き込みの後の値 —— :2351 の TRAP） | `startScaleMessageTimer` ・ `restartScaleMessageTimer` → 時計を張り直し、満ちたら `screen/scaleMessageTimeElapsed` を送って `ask()`（`callOffScaleMessage` は把手として残る —— 第 6 節） |
| （いまは無い）休止の時計が満ちた（:2342〜:2345） | B2 では送らない —— D1 の写しで、戻すのは移動である（`dismissed` のまま時計が満ちることは今日の振る舞いに無い） | —— |
| `tellFlowSurfaceClosed`（機械が面を閉じたとき） | —— | ⚠️ **B2 では何もしない**。いまの片付け（`receiveInput` の末尾 :4278〜:4294 —— 面が選ばせる面でなくなったら待ちを捨てる）が、入力のたびに `session.screen.openSurfaceState` を読んで同じことをする。`CR-460` の波 B がこの 1 行と末尾の片付けを `fileFlow/flowSurfaceClosed` へ替える |
| 進捗マーカーの押下（`screenStateAfterMarkerPress`、翻訳係 :87〜:101） | `screen/progressMarkerPressed{taskUid, rememberedActual, writes}` | `writeProgressStep` → 運んだ命令を `writeDocument`。⚠️ いまその書き込みは `commandFromInput`（`item-grab.ts:126`〜 の `GA-18`）が別の操作として返す —— 同じ押下で 2 度書かないよう、翻訳係は片方だけを返す（照合器が履歴の長さで数える） |

---

### B.5 波の順 —— B1 は B2 の直前（導いた帰結）

利用者の順の指示は B1 を「後で並べて進める波」に数えている。**B1 は B2 の直前に同じ作業木で当てる**のが、次の 3 つから導ける:

1. **`JDG-57`**（リファクタは見える振る舞いを変えない）—— B2 は今日を写さなければならない。
2. **`JDG-283`**（「状態機械には遷移も運ぶ値も足さない」、`rulings.md:480`）—— 出していないパネルの境界を押したとき、いまのコード（:4169〜:4179）は「直前に出していた中身」でパネルを戻すが、画面の値の機械の `hidden` は何も覚えない。⇒ B2 はこの振る舞いを機械でも「写す詰め方」（B.7）でも表せない。残すには閉じたときの中身を覚える `let` を 1 つ残すしかなく、それは `JDG-283` が捨てた `lastShown` そのものである。
3. **本書の第 5.3 節の末尾**「B1 を B2 の前に置くのは、B2 で結線したとき原稿とコードが食い違わないためである」。

⇒ B1 を B2 の後に回すと、B2 は `JDG-57` と `JDG-283` のどちらかを破る。B1 は 3 ファイルの小さな変更で、触るファイル（`screen-frame.ts` ・ `frame-loop.ts`）は B2 と重なるので、並べて進める利得も無い。⭐ 照合器の「前」は B1 を当てた木である（B1 は見える振る舞いを変える唯一の波 —— 仕様の変更）。

---

### B.6 仕様の変更

#### B.6.1 表の行（`05-07-design.md`）

| 行 | いま | 案 |
|---|---|---|
| `CP-18`（:125） | 画面の入力を操作へ変える。`InputSource` を宣言する | 画面の入力を、操作と、どこで何が起きたかを運ぶ出来事へ変える。`InputSource` を宣言する |
| `CP-25`（:131） | … **現在値を保持する。** … | 「現在値を保持する」を「セッションの現在値を 1 つ保持し、出来事を 1 段進めて差し替え、返った副作用を実行して結果を出来事で戻す」へ。残りは据え置き |
| `CP-36`（:141） | 文書に保存しない画面の値 —— 構え …、`S-99e` / `S-99f` / `S-99g` / `S-144`、覚えた実績 | 「画面の値が運ぶ型（覚えた実績 —— `FR-107` の 表 T-270、`Dual Cursor` の追従側 —— `DC-2`）と、`Esc` が次に消費する段の判定（表 T-028 の `IN-4`）」。⭐ 画面の値の状態そのものは 表 T-280 が持ち、型は `CP-39` のユニットにある（決定 3 を延ばしたことは本書だけが書く —— 仕様は変更要求を名指さない、決定 20） |
| `UF-48`（:445） | 現在値の保持、… | 「現在値の保持」→「セッションの現在値 1 つの保持と、1 段ごとの副作用の実行」。⛔ **全画面表示の MUST の文は 1 字も変えない**。「負う要求」は据え置き |
| `UF-59`（:455） | `CP-36` ／ `FR-053`（`OW-2`）・`FR-071`（`OW-2`）・`FR-107`（`OW-2`） | 責務 `CP-36` のまま ／ 負う要求 `—`（下の `UF-86` へ移す —— 決定 10） |
| `UF-86`（:470） | … ／ `—` | 負う要求 `FR-053`（`OW-2`）・`FR-071`（`OW-2`）・`FR-107`（`OW-2`）。⚠️ `FR-072`（いま `UF-64` の `OW-1`）と `FR-066`（`UF-68` の `OW-2`）は、当てる体が 表 T-277 の「最初に開くユニット」で決め直す（出す・隠すの規則は `screen-values.ts` に移るが、出す中身は部品のまま）。⭐ 未記入の数（基準線 `unfilled=17`）は動かない —— 移すだけ |
| `UF-102`（:426） | 入力から次の画面の状態を … 決める | 入力から画面の値の出来事を、表 T-028 の `IN-4` と 表 T-023b に従って作る（`Esc` の段はシェルが決める） |
| 表 T-075 に `UF-123` | —— | `SingleHtmlShell` ／ `session-effects.ts` ／ `non-pure` ／ 「状態機械が返した副作用を種類ごとの実行へ 1 つずつ渡す形と、その全種類の網羅」／ `—` |
| 表 T-063 `UT-6`（:333） | `single-html-shell.ts` ／ `frame-loop.ts` | ＋ `session-effects.ts`。理由の文に B.3.2 の「割る理由」を 1 段足す |
| `SU-3`（:245） | 101 | 102（⛔ 当てる時の 表 T-075 の行の数 ＋ 1 で書く） |
| 5.3 のディレクトリ木 | —— | `single-html-shell/` に `session-effects.ts` |
| `PI-18`（:539） | … `screenStateFromInput`（`Esc` の階層は …。置き場は `CP-36`）… | `screenEventFromInput`（画面の値の出来事。全数は 表 T-280。`Esc` の段は含まない） |
| `PI-36`（:555） | `ScreenState` ／ `DualCursorSide` ／ `emptyScreenState` ／ `screenStateWith…` 6 ／ `escapeTarget` ／ `RememberedActual` ／ … | `DualCursorSide` ／ `escapeTarget`（`EscapeContext` の真偽から段を答える）／ `EscapeTarget` ／ `RememberedActual`。消した名は書かない |
| `PI-37`（:556） | `ScreenSurface` ／ `ScreenView` ／ `screenViewFromRegions` ／ … | ＋ `ScreenViewReadings`（型。描き手が集約のほかに読む値 —— フレームの値と文書から導く値）。`screenViewFromRegions` の注に「根の状態（`PI-39` の `ScreenSession`）を読むだけ」 |
| `PI-39`（:558） | 5 つの名 | ＋ 外が読む型（B.4.2 の見込み。当てる時に import から測る） |
| 図 F-027 の前文（:1037） | ⚠️ … 移行の目標であり、いまの `src/` にはまだ無い（移行の次の段で入る） | 「⚠️ 出来事を作って `advanceScreenSession` を呼ぶ道が入っているのは、画面の値の領域である。ほかの領域は 表 T-285 の `RA-7` の段がまだ済んでいない」 |
| 5.5 の散文（:760 付近、表 T-250 の後） | —— | 「領域をまたぐ優先順（`SD-4`）を 同じファイルの 表 T-283 に示す。順そのものの正は `IN-4` ・ `SK-19` ・ `NT-7` の行である」 |

⚠️ 表 T-062 の `SU-1`（37）は動かない —— コンポーネントは増えない。

#### B.6.2 表 T-283 —— 領域をまたぐ優先順（決定 7 ・ 決定 24）

- 置き場: 原稿 `state-machines.json` の最上位 `priorities` から、`_assets/tbl-state-machines.md` の冒頭に刷る（5.5 の「原稿から … 優先順の表 … を生成し」、:738）。
- 行 ID の接頭辞: **`RG`**（`RunG`、「領域をまたぐ優先順の段」）。2026-09-22 に `docs` ・ `change-request` ・ `src` ・ `tests` ・ `tools` ・ `.claude` ・ `package.json` を `\bRG-[0-9]+` で grep して 0 件。登録簿は 160 → 161。⭐ 当てる直前（2026-09-22、`5413bea5`）に測り直して同じ値だった（B.1a）。
- 欄（`SD-4` の 3 つと注）: 行 ID ／ 奪い合う出来事 ／ 段（上ほど先に消費する）／ 段ごとの状態のキー ／ 順を決めた行 ／ 注。
- ⭐ **状態のキーは、いま原稿に在る名で全部埋める** —— 6 領域の原稿は波 A で揃っている（`9b8a22b7` で `regions` の 6 つの `machines` を読んだ）。「未移行」の段を置かないので、**後の領域の波は表 T-283 に触れない**（CR-440 ・ 450 ・ 460 が「申し送る」と書いた行は、ここで全部書く）。

| 行 | 出来事 | 段 | 状態のキー | 順を決めた行 | 注 |
|---|---|---|---|---|---|
| RG-1 | `Esc` | 出ている通知 | `noticeDisplayStateMachine.shown` | `IN-4`、`NT-8` | 消すものが無いとき消費しない（`NT-8`）—— `hidden` には升が無い |
| RG-2 | `Esc` | 確定していないその場の編集 | `fieldEditStateMachine.editingField` | `IN-4` | 面が消費する（`IF-9`） |
| RG-3 | `Esc` | 開いている面 | `confirmationStateMachine.questionAsked` ／ `openSurfaceStateMachine.open` ／ `propertiesPanelContentStateMachine`（`hidden` 以外） | `IN-4`、`FR-070`（表の注 `01-04-requirements.md:4202` —— 問いか面が立っているあいだ `SK-19` の 2 段目を当てない） | 同じ段の中は、問い → 面 → パネル |
| RG-4 | `Esc` | 進行中のドラッグ・引きかけの矢印 | `pointerPressStateMachine.changingDocument` ／ `viewingDocument` | `IN-4` | —— |
| RG-5 | `Esc` | 構え | `armModeStateMachine`（`notArmed` 以外） | `IN-4` | —— |
| RG-6 | `Esc` | 選択 | `selectionStateMachine.objectsSelected` | `IN-4` | 構えより前に置かない（`IN-4`） |
| RG-7 | `Esc` | `Dual Cursor` モード | `dualCursorModeStateMachine.on` | `IN-4` | —— |
| RG-8 | `Esc` | 出ている説明 | `tooltipDisplayStateMachine.allowed` と、フレームの値（描いた説明がある） | `IN-4`、`IN-3` | 状態だけでは決まらない段（`SF-5`） |
| RG-9 | `Enter` | 出ている通知 | `noticeDisplayStateMachine.shown` | `SK-19`、`NT-8` | —— |
| RG-10 | `Enter` | その場の編集の確定 | `fieldEditStateMachine.editingField` ／ `createdTaskNamingStateMachine.namingCreatedTask` | `SK-19`、`FR-091` | 面も問いも立っていないとき |
| RG-11 | `Enter` | プロパティパネルを出すのをやめる | `propertiesPanelContentStateMachine`（`hidden` 以外） | `SK-19` | 同上 |
| RG-12 | `Enter` | 選択を解く | `selectionStateMachine.objectsSelected` | `SK-19` | パネルも出していないとき |
| RG-13 | `y` ／ `n` | 問いに答える | `confirmationStateMachine.questionAsked` | `NT-7` | `NT-8` の消去の次、`IN-4` と `SK-19` の階層より先 |

⚠️ RG-3 の「順を決めた行」の 2 つ目は、本書の付録が `req:4194` と書いた文であり、`9b8a22b7` では `:4202`（その前の `**UID**:` の行は `:4151` の `FR-070`）。
⚠️ `DFC-570`（コードはパネルの段を身振りの下に置く）は表を変えない —— 表は `IN-4` に従う。コードの並びは台帳のまま（`JDG-57`）。
⭐ **機械の突き合わせ（決定 7）**: 生成器の `--check` は、`IN-4` の行（`01-04-requirements.md:6804`）から「消費する階層は」と「の順」のあいだを ` → ` で割った 8 語を取り、出来事 `Esc` の行の段の語と順に 1 対 1 で比べる。1 語でも違えば落ちる。`Enter` と `y` ／ `n` の順は要求の文が矢印で書いていないので比べない。
⇒ 予測: tables +1、rows +13、figures 0、uids 0（本書の第 7 節の「rows +8」は `Enter` と `y` ／ `n` の 5 行を数えていなかった）。

#### B.6.3 `components.json`

| 辺 | 変更 | ラベル（案） |
|---|---|---|
| `SingleHtmlShell → AdvanceScreenSession` | 足す | `one step per event` —— 出来事ごとに 1 段進め、返った副作用を実行する |
| `ScreenRenderer → AdvanceScreenSession` | 足す | `session read` —— 描く画面の値を根の状態から読む |
| `InputCommandTranslator → AdvanceScreenSession` | 足す | `events made` —— 入力から作る出来事の型 |
| `AdvanceScreenSession → EditDocument` | 足す（決定 23） | `carried writes` —— 書き込みの副作用が運ぶ命令の型 |
| `SingleHtmlShell → ScreenState` | 説明を直す | `Esc rung` —— いまの「screen state held」は偽になる |
| `InputCommandTranslator → ScreenState` | 説明を直す | `Esc rung + remembered actual` |
| `ScreenRenderer → ScreenState` | ⚠️ 移した描き手がまだ import するかを測る。0 なら消す（`list-lying-edges.py` が挙げる） | —— |

⇒ edges 140 → 144（最後の行で 143 もありうる）。⭐ `AdvanceScreenSession → EditDocument` は、`CR-460` の波 B が「後で実行する書き込み」の型を厳密にするときにも要る辺であり（handoff-state-machine.md の §3）、B2 が先に敷けばその波は辺を足さずに済む。

#### B.6.4 検査の道具

- `audit-ch5.py` の `NOT_YET_CALLED` から `AdvanceScreenSession` を消す（`JDG-285`）。
- 生成定数の名簿（検査 30）に表 T-283 の定数を足すかは、生成器が定数を刷るかで決める —— ⭐ 刷らない案を推す（表 T-283 は仕様の表であり、コードの段の判定は `escapeTarget` が持つ。両者の一致は `IN-4` との突き合わせで足りる）。

---

### B.7 読んで見つけた食い違いの候補（⚠️ 未検証 —— コードと原稿を読んだだけ）

B2 は今日を写す（`JDG-57`）。機械の升と今日のコードが違う所では、**シェルがどの出来事を送るかで今日の結果を作る**（`CR-480` の決定 10 の「写す詰め方」と同じ筋）。写した所には `DEVIATION` の注と台帳の行（当てる体が `DFC-703` 以降を測って取り、本線に宣言する）を置き、直すのは B2 の後の別のコミット（波 C）。照合器（B.9）がここに無い食い違いを出したら、⛔ 当てる体は止まって前に立つ者へ返す。

| # | 場面 | 今日のコード | 画面の値の機械 | 写し方 | 台帳 |
|---|---|---|---|---|---|
| D1 | 説明を `Esc` で消した後にポインタを動かす | 動いたら戻す（:4160） | 休止が満ちたら戻す | 説明を消しているあいだに動いたら `screen/pointerRestElapsed` を送る（移動のたびには送らない —— `SF-5`） | 既に `DFC-692` |
| D2 | 選択を出したパネルを閉じ、設定の入口を 2 度押す | 2 度目で、閉じる前の対象を出す（`propertiesSubject` が残る） | `hidden` は何も覚えず、戻す先の無い `selectionDisplayed` になる | シェルに「今日のコードが覚える対象」を 1 つ残し（決定 22）、`hidden` から設定を出すとき、先に `screen/propertiesOfChoiceAsked{残した対象}` を送る | 既に `DFC-677`（戻す先が無いとき）。今日の写しとして追記 |
| D3 | 軸に日の無い所で `Dual Cursor` の入口を押す（`PND-313`） | 構えを解く（`screen-state-input.ts:62`〜`:66` の WHY） | 置ける日が無ければ何も変えない | その場合だけ `screen/escapePressed{rung: 'armed'}` を送る | 新 |
| D4 | 文書が既に `Dual Cursor` を持ち、モードに入る | 書かずに入る（`dual-cursor-input.ts:31`〜`:33`） | 入るたびに `writePlaceDualCursor` | 副作用が運ぶ命令を `null` にする（決定 23 の形で自然に写る —— 台帳は要らない見込み） | —— |
| D5 | 面が開いているとき `F1` などで別の面を開く | 開いている面を差し替える（`screen-state-input.ts:147` ほか） | `open` の升が無く、何も変えない | `screen/surfaceCloseAsked{target: 'surface'}` の後に `screen/surfaceEntryPressed` を送る | 新 |
| D6 | 面が開いているとき透かしの入口を押す | 透かしの解除の面へ差し替える（`:69`〜`:72`） | 面が閉じているときだけ開く | D5 と同じ 2 つ | 新（D5 と 1 行にしてよい） |
| D7 | 設定を出しているとき選択が動く | 選択の中身へ替わる（:4274〜:4276 → `showPropertiesOfChoice`） | `documentSettingsDisplayed` に `selectionMoved` の升が無い | その場合（選択が空でないとき）は `screen/selectionMoved` の代わりに `screen/propertiesOfChoiceAsked` を送る | 新（`PND-144` の仮置きの範囲） |
| D8 | 畳んだ第 0 階層の直下に行を作る | 書かずに畳みを解く（:4074） | `levelZeroOpened` は `writeOpenLevel` を返す | 運ぶ命令を空にする（決定 23 —— 台帳は要らない見込み） | —— |

⚠️ D1 は `CR-470` の第 7 節の候補 1 が「写すか、期待どおりの失敗を留めるかは `CR-436` の波 B2 が決める」と申し送ったもの —— 本節は「写す」を選ぶ（`JDG-57`。留めるのは波 C の直しの側）。

---

### B.8 決定 3 を B2 に入れない

| 見るもの | 事実 | 帰結 |
|---|---|---|
| 決定 3 がすること | 生成器の出力先を `screen-state.ts`（`Entity`）へ移し、領域のユニットが型を `Entity` から読む | —— |
| 生成の区画の中身 | 状態の型・出来事・副作用の名・遷移表の定数・初期の値が 1 つの区画にある（`screen-values.ts:84`〜`:920`） | 移すなら生成器が区画を 2 つに割る —— 状態の型は `Entity` へ、出来事と副作用は `UseCase` に残す（決定 23 で副作用が `EditDocument` の命令の型を運ぶので、`Entity` に置くと層の規則 `LR-1` を破る） |
| B2 の読み手が要る型 | 描き手は根 `ScreenSession`（`UseCase`、どのみち `PI-39`）を受け、欄を構造で読む。翻訳係は出来事の型（`UseCase`）を返す | 決定 3 をしても、読み手は `AdvanceScreenSession` から根と出来事を読み続ける。延ばしたときの後の手戻りは、状態の型を名で import する数か所の import の行だけ |
| `Entity` に状態の型が要る読み手 | B2 の後は 0 —— `escapeTarget` は真偽を受け（B.4.2）、`edit-task.ts` ・ `task-plan-actual.ts` は `RememberedActual` しか読まない | 決定 3 を急ぐ理由が無い |
| `JDG-60` | 「`ScreenState` を広げる」置き場を了承した（`rulings.md:137`） | 延ばすのは時機であって置き場を覆さない ⇒ 裁定は要らない |

⇒ **決定 3 は段 7 の出口（全領域の結線の後）の 1 コミットへ延ばす。** そのとき、生成器の区画の割り方と `CP-36` の書き直しを決める。B2 は旧 `ScreenState` の形（`armed` ・ `paletteShown` ほか）を消すだけで、決定 3 を先取りも否定もしない。

---

### B.9 振る舞いが同じことの示し方

**照合器**（段 5 の 4,592 件・バイト一致の形。⛔ スクラッチに置き、コミットしない —— 次のセッションに残らないので、手順を本書に残す）:

1. **前と後の木** —— 前: B1 を当てたコミット。後: B2 を当てたコミット。2 つの作業木に置き、同じ照合器を `TREE` の環境変数で向けて 2 回走らせ、記録を比べる。
2. **駆動** —— `frameLoop` を偽の配線で組む: 面の偽物は `showSvg` の文字列と `showScreenView` の値（`JSON.stringify`）を記録し、`readScreenPartAt` は台本が名指す入口（パレット・最小化・ヘルプ・AI 書き出し・担当者一覧・書き出しの選択・透かし・閉じる（面／パネル）・設定・対話欄・マイルストーン一覧・言語・第 0 階層の畳みと開き・`Dual Cursor`）と日程の上の点（進捗マーカー、`Row Area`）を返す。全画面表示の宿主の偽物は求めと解除を記録する。`localStorage` の偽物は書き込みを記録する。時計は偽の時計（`S-244` ・ アイコンの説明の待ち ・ 押し続け）。`requestAnimationFrame` は置かない（1 入力ごとにフレームがその場で回る）。
3. **台本の語彙**（約 30）—— 打鍵（`Esc` ・ `Enter` ・ `P` ・ `F1` ・ `Ctrl+Shift+E` ・ `y` ・ `n` ・ 単文字）、上の入口の押下と離し、日程の上の押下と離し、`Ctrl` ＋ホイール（表示の倍率）、行の軸のズームの端、ポインタの移動（説明の休止）、時計を進める、`fullScreenChanged(true / false)`、`raiseStartupNotice`。
4. **件数** —— 開始の文書 4（起動の雛形・空・`Dual Cursor` を持つ文書・第 0 階層を畳んだ文書）× 長さ 2 の全組（約 900）＝ 約 3,600 件 ＋ 種を固定した長さ 6 の乱数の台本 2,000 件。
5. **1 段ごとに記録するもの** —— `isBrowserDefaultStopped(input)` の答え（宿主と同じく `receiveInput` の前に問う）、描いた `ScreenView` の JSON、SVG、文書の JSON と取り消し・やり直しの記録の長さ、`localStorage` の書き込み、全画面表示の求め、ポインタの形。
6. **合否** —— 前と後の記録がバイトで一致すること。⭐ B.7 の D1 〜 D8 は写すので、差は 0 件が期待値である。
7. **照合器が効くことの確かめ** —— 後の木を 10 通り壊す（パレットの出来事を取り違える、副作用の行を 1 つ `unwiredEffect` にする、`askBrowserForFullScreen` を時計の後へ延ばす、`owesFrame` の比較を落とす、D1 の写しを外す、ほか）。段 5 と同じく 10 のうち 8 以上を捕まえること。

**既に在る試験で、結線した道を通るもの**:
- `frame-loop.ts` を import する 80 ファイルのうち、袋も旧 `ScreenState` も組まない **67 ファイルは 1 字も変えずに緑**であること（例: `cr-389-fr-071-full-screen-is-asked-of-the-browser.test.ts`（`UF-48` の MUST）、`fr-020-both-ways-ic-41.test.ts`、`fr-020-the-surface-that-asks-for-the-watermark-password.test.ts`、`fr-053-re-showing-clears-the-minimise.test.ts`、`fr-072-a-moved-selection-does-not-open-the-panel.test.ts`、`in-4-escape-closes-the-panel.test.ts`、`cr-411-a-changed-display-scale-shows-its-percentage-for-a-moment.test.ts`、`t-015-t-051-the-four-folding-controls.test.ts`、`t-051-hf-17-unfolds-segment-zero-by-one-level.test.ts`、`dfc-578-a-press-on-the-dialogue-field-keeps-the-browser-default.test.ts`）。⭐ この 67 は、照合器の外にある第 2 の証拠である。
- 状態機械の契約試験 6 本と `t-284-the-shared-step.contract.test.ts` は変わらない（原稿の升を変えない —— 決定 23 の運ぶ値は升の先を動かさない）。
- 残り 13 と、袋か旧 `ScreenState` を組む単体試験は、見本の形だけを直す（B.4.2 の試験の ①）。

**段の出口でだけ回すもの**: e2e 全部と parity、`LM-19` の性能（⛔ 測る前に利用者を呼ぶ —— `RISK-001`）。

---

### B.10 基準線への影響（数だけ。⛔ 書くのは、数を利用者に見せてから前に立つ者）

| 基準線 | いま | B1 の後（見込み） | B2 の後（見込み） |
|---|---|---|---|
| 検査 60 の合計 | `excess-lines=7868 excess-branches=777` | 下がる（`receiveInput` が 11 行・分岐 2 減る —— 189 / 80 → 178 / 78） | 上げない。⭐ 下がる見込み |
| 検査 60 の HELD | 87 行 | `receiveInput` の値を下げる 1 行 | ① 消える名（`screenStateFromInput` 45 / 25、`sessionOf` 94 / 7）の行を消す。② 新しい名（`screenEventFromInput` ・ `screenViewReadingsOf`）は帯の内側に割って行を足さないのを推す —— 帯を出られなければ、消した行以下の値で足す。③ 名を変えずに縮む関数（`frameLoop` ・ `receiveInput` ・ `carryOutAction` ・ `runFrame` ・ `answerSettledEntry` ・ `owesFrame` ・ `openModalFromScreenState` ・ `commandStateOf` ・ `screenFrameFromRegions`）は値を下げる。⛔ `frameLoop` は 2616 を越えられない —— 12 の `let` と書き手の本体が減り、送り口（約 6 行）と `effectRunners`（約 30 行）が増える |
| 検査 61 | HELD 2 | 動かない | 動かない（`Framework` だけに現在値を置く。内側 3 層に可変状態を足さない） |
| 表 T-075 の負う要求（`unfilled=17`） | 17 | 17 | 17（移すだけ —— 決定 10） |
| 検査 39（MUST の条の網羅） | —— | 試験を 1 本足す分だけ動きうる | 見本を直すだけなら動かない見込み。当てる体が前後を比べる |

⚠️ 名を変えると HELD の古い行が「関数が無い」で赤くなり、新しい名が「名簿に無い」で赤くなる —— 同じコミットで名簿を書き直す（検査 60 の注）。⇒ B2 の基準線の書き換えは必ず起きる。

---

### B.11 `let` の数

| | 値 |
|---|--:|
| いま（`9b8a22b7`） | 66 |
| B2 が消す | 12（B.1 の表） |
| B2 が足す | `session` 1、今日の写しの覚え 1（決定 22 —— 旧 `propertiesSubject` の代わり。`DFC-677` の直しで消える） |
| B2 の後 | **56**（本書の第 6 節の「55」は写しの覚えを数えていなかった） |
| 残す（第 6 節のとおり） | `watermarkStampedAt` ・ `commandPaletteDraggedTo`（フレームの値）、`callOffScaleMessage`（副作用の把手）、`isTooltipStanding`（描いた結果から導く値） |

⚠️ `language` は `let` をやめて起動の読みを持つ `const` になる（決定 21）。

---

### B.12 決めたこと（覆してよい）

| # | 決めたこと | 導き |
|---|---|---|
| 決定 21 | **根の初期の値は、`emptyScreenSession` の画面の値の `language` だけを起動の読みで埋めたものとする。** 起動の読みを `screen/displayLanguageChosen` で送らない | 決定 16 は起動の値を「出来事で運ぶ」と延ばしたが、その出来事は副作用 `storeLanguage` を返し、起動のたびに `S-99` を書く —— 今日は書かない（:1887 は読むだけ）ので `JDG-57` に反する。`S-99` は既定値を持たない（表 T-206）ので、初期の値の欄を起動の読みで埋めるのは遷移ではなく初期の値の確定である |
| 決定 22 | **閉じたパネルが次に出す対象を、シェルに 1 つだけ残す**（B.7 の D2 の写し）。`DFC-677` の直しの波で消す | `JDG-57` と `JDG-283`（機械の `hidden` に運ぶ値を持たせない）の両方を守る道はこれだけである。前例は `CR-480` の波 B が残す `nameFieldWantedUnder` ・ `addedRowOwedSight`（今日の振る舞いを写すためのシェルの覚え） |
| 決定 23 | **文書に書く副作用（`writeFoldAll` ・ `writeOpenLevel` ・ `writePlaceDualCursor` ・ `writeFixDate1` ・ `writeFixDate2` ・ `writeProgressStep`）は、翻訳係が作った命令を運ぶ。** 出来事 `foldAllPressed` ・ `levelZeroOpened` ・ `dualCursorEntryPressed` ・ `dualCursorPlaced` ・ `progressMarkerPressed` の運ぶ値に `writes` を足す（原稿と生成した型）。`writeClearDualCursor` は命令が文書によらないので運ばない | 本書の決定 5（ガードや副作用が文書の値を要るとき、その値は出来事が運び、詰めるのは翻訳係）。命令を副作用の実行（シェル）で作り直すと、翻訳係と同じ規則が 2 か所に立つ（`R1.3`）。空の命令が D4 ・ D8 を自然に写す |
| 決定 24 | **表 T-283 は 1 つの表に `Esc` ・ `Enter` ・ `y` ／ `n` の 13 行を持ち、状態のキーは原稿に在る名で全部埋める** | `SD-4` の欄が「奪い合う出来事」を持つ ⇒ 1 つの表が複数の出来事を持つ形である（`CR-440` 2.2 が申し送った問い）。6 領域の原稿は揃っているので「未移行」の段は要らず、後の波が表に触れずに済む |
| 決定 25 | **画面の値の `InputAction` 7 種は B2 では型を変えず、シェルの `carryOutAction` で出来事へ写す** | B.3.4 の理由（`commandFromEntry` は後の波と共有の地面）。翻訳係が出来事を直に返す形へ寄せるのは、全領域の結線の後にまとめて行う（段 7 の出口） |
| 決定 26 | **`Esc` の段はシェルが決め、段の表（B.3.5）が 1 段 1 行で送る** | 段の判定は翻訳係が見ない値（通知・問い・パネル・描いた説明）を読む（`screen-state-input.ts:135` の TRAP、`CR-470` 2.2 の 1）。決定 5 の「詰めるのは翻訳係」は、翻訳係が見える値についての約束である |
| 決定 27 | **B1 は B2 の直前の別のコミット**（B.5） | `JDG-57` ・ `JDG-283` ・ 本書の第 5.3 節 |
| 決定 28 | **決定 3 を段 7 の出口へ延ばす**（B.8） | B.8 の表 |

---

### B.13 問うこと

⭐ **なし（0 件）。** 下の候補は、どれも `handoff.md` §0.2 の 3 手で反証できた。

| 候補 | (1) `rulings.md` を grep（2026-09-22） | (2) `impact.py` | (3) 導けるか | 結果 |
|---|---|---|---|---|
| B1 を利用者の順どおり B2 の後に回してよいか | 「波 B1」0 件。`JDG-283`（:480）は「状態機械には遷移も運ぶ値も足さない」「どちらも段 6 を待つ波」と言い、B1 と B2 の前後は言わない | `FR-052` → 要求 6 件 ／ 参照 17 箇所（本書 5.1）。どれも結線の順を述べない | **導けた** —— B.5（`JDG-57` ・ `JDG-283` ・ 第 5.3 節） | 決定 27。⚠️ 利用者の指示から外れるので、前に立つ者が伝える |
| 決定 3 を延ばしてよいか | 「ScreenState を広げ」0 件、「決定 3」2 件（`JDG-153` ・ `JDG-263`、どちらも別の変更要求の決定 3 で無関係）。`JDG-60`（:137）は置き場を了承 | `CP-36` → 要求 2 件 ／ 参照 5（本書 2.1）。どれも時機を述べない | **導けた** —— B.8。本書の決定 3 は「覆してよい」の表にある | 決定 28 |
| 閉じたパネルの対象の覚え（D2）を残すか、振る舞いを変えるか | 「PND-144」「DFC-677」0 件 | `PI-37` → 要求 1 ／ 参照 2 | **導けた** —— `JDG-57` が変えることを禁じ、`JDG-283` が機械に覚えを持たせることを禁じる ⇒ シェルに残す | 決定 22 |
| 表 T-283 を 1 つにするか、出来事ごとにするか | 「優先順」2 件（`JDG-34` ・ `JDG-203`、掴み代と描く順の話で無関係）、「SD-4」0 件 | `SD-4` → **浮いている**（要求 0 ／ 参照 0）。`IN-4` → 要求 9 ／ 参照 41 | **導けた** —— `SD-4` の欄 | 決定 24 |
| 起動の言語をどう根へ入れるか | 「S-99」0 件 | —— | **導けた** —— 決定 16 と `JDG-57` | 決定 21 |
| 描き手の入力の型の名 | 「RenderFrameInput」「描き手の入力」0 件 | —— | **導けた** —— 第 4 節の禁止と `R2` の品詞 | B.2 |

---

### B.14 危うい所

| # | 何が | 見立て | 手当て |
|---|---|---|---|
| 1 | B2 の大きさ | コード 約 25 ファイル ＋ 試験 約 80 ファイル（見本の形）＋ 仕様 ・ 原稿 ・ 生成器。1 コミットで二分探索の単位にはなるが、読むのは重い | 体を 3 つに割り、同じ作業木で順に積む（① 仕様・原稿・生成器と表 T-283、② コードと新しい試験、③ 既存試験の見本）。コミットは 1 つにまとめる。③ は軽い模型（機械的）、② は重い模型（判断） |
| 2 | 照合器が拾えない所 | 非同期（SHA-256 の照合、全画面表示の `Promise`）、時計の順、`rAF` の有る実ブラウザでのフレームの束ね | 偽の時計と `await` の段を台本の語彙に入れる。実ブラウザは段の出口の e2e に任せる |
| 3 | B.7 に無い食い違い | 機械は仕様から書いた（今日のコードからではない）ので、まだある見込みが高い | 照合器が出したら止まる（B.7 の冒頭）。写し方が無いものだけが利用者への問いになる |
| 4 | `frameLoop` の行の上限 2616 | 送り口と `effectRunners` で約 36 行増える。減る側（12 の `let`、`showPropertiesOfChoice` ・ `propertiesShowingNow` ・ `withPropertiesPanelShown` の分岐、`answerSettledEntry` の 4 つの枝、`receiveInput` の `Esc` の枝、`fullScreenChanged`）が上回る見込みだが測っていない | 当てる体が前後を `function-size.mjs` で数える。越えたら、`effectRunners` の画面の値の塊の本体を `frameLoop` の外のモジュールの関数へ出す（閉包を引数で受ける） |
| 5 | 並行の合流 | `collectWriteMoment` ・ `readSnapshot` ・ `owesFrame` ・ `receiveInput` の末尾は 3 波以上が触る | B.3.6 の注。合流は 1 つずつ、合流した木で単体試験・`check.sh` ・ 型検査を回す |
| 6 | `CR-500` の波 B との順 | RG-2 ・ RG-10 の状態のキーは `editingField` だが、コードは段 6 の後まで面の真偽（`hasUnsettledTextEntry`）で段を決める | 表は仕様の形を書く。コードとの差は `CR-500` 第 6 節が既に書いている（仕様が先に着地し、コードが実装の波で追う） |
| 7 | 番号の衝突 | `UF-123` ・ `RG` ・ `DFC-703` 以降は別のセッションも取りうる | 当てる直前に測り直し、本線へ宣言してから取る（handoff の「衝突の約束」） |

---

### B.15 数の予測（md-checks の最終行、「前」は `9b8a22b7` の `tables=181  figures=25  rows=2241  uids=162`）

| 波 | tables | figures | rows | uids | 内訳 |
|---|--:|--:|--:|--:|---|
| B1 | 0 | 0 | 0 | 0 | セルの編集だけ |
| B2 | +1 | 0 | +14 | 0 | 表 T-283 の 13 行、表 T-075 の `UF-123` の 1 行 |

⚠️ 本線の段 6 の波が先に当たれば「前」が動く。差だけを突き合わせる。

---

### B.16 第 1 段（仕様）で当てたもの —— 2026-09-22、`5413bea5` の上

⭐ 当てたのは仕様・原稿・生成器・辺・台帳の数だけである。`src/` の手書きの行と `tests/` の主張には触れていない（例外は生成物と数だけ —— 下の表の ⚙ の行）。

| 対象 | 当てたこと |
|---|---|
| `docs/spec/05-07-design.md` | B.6.1 の行を 1 行ずつ書いた: `CP-18` ・ `CP-25` ・ `CP-36` ・ `SU-3`（101 → 102）・ `UT-6` ・ `UF-48` ・ `UF-59` ・ `UF-86` ・ `UF-102` ・ `UF-123`（新）・ `PI-18` ・ `PI-36` ・ `PI-37` ・ `PI-39`、5.5 の散文（表 T-283 を名指す 2 文）、図 F-027 の前文。`UF-48` の全画面表示の MUST の文は 1 字も変えていない |
| `docs/spec/_source/state-machines.json` ・ `state-machines.schema.json` | 最上位の `priorities`（表 T-283 の 13 行）と、その形（`priorities` ・ `rung` ・ `rungState`）。決定 23 の運ぶ値 `writes` を 5 つの出来事（`foldAllPressed` ・ `levelZeroOpened` ・ `dualCursorEntryPressed` ・ `dualCursorPlaced` ・ `progressMarkerPressed`）に足した |
| `docs/spec/_source/state_machines_json_to_md.py` | 表 T-283 を `_assets/tbl-state-machines.md` の冒頭に刷る。`load_priorities()` が拒むもの: 行 ID の重なり、どの領域も定めない状態機械・状態、`docs/spec` が定めない根拠の行、`Esc` の段の語と並びが `IN-4` の「消費する階層は … の順」と 1 対 1 で一致しないこと。⭐ 壊して確かめた —— 段を 2 つ入れ替える・無い状態・無い根拠の行・無い最上位の状態の 4 通りが、どれも 1 件ずつ止まった。⭐ 生成定数は刷らない（B.6.4 の推し） |
| `docs/spec/_source/row-id-prefixes.json` | `RG` を登録した（160 → 161） |
| `docs/spec/_source/components.json` | B.6.3 の 4 辺を足し（140 → 144）、`SingleHtmlShell → ScreenState`（`Esc rung`）と `InputCommandTranslator → ScreenState`（`Esc rung + remembered actual`）の説明を直した。`ScreenRenderer → ScreenState` はコードの段で測る |
| `.claude/skills/spec-graph-check/audit-ch5.py` | ⚠️ `NOT_YET_CALLED` の項を**この段で**消した —— 検査 33 は `components.json` の辺から呼び手を数えるので、辺を足した時点で項が残っていると赤になる（辞書は空で残した） |
| `tests/contract/units.contract.test.ts` | ユニットの数 101 → 102 |
| `docs/development-records/changelog.md` | 版 2.67 の行と、版 0.29 の「2 つより多いユニットを持つのは」の文に `SingleHtmlShell`（3） |
| `docs/development-records/W5-framework.md` | `UF-123` の行（⬜ 未着手） |
| ⚙ 生成物 | `npm run gen`（`tbl-state-machines.md` ・ `tbl-row-id-prefixes.md` ・ `screen-values.ts` の生成の区画）と `build.py`（`components.md` ・ `overview.json` ・ 図 `view-read` ・ `view-write`）。`npm run tree` が `src/framework/single-html-shell/session-effects.ts` の空のユニットを作った |

**起草と変えたところ**（どれも 1 行の判断。覆してよい）:

| # | 起草 | 当てたもの | 理由 |
|---|---|---|---|
| 1 | `PI-36` に `DualCursorSide` ／ `escapeTarget` ／ `EscapeTarget` ／ `RememberedActual` | ＋ `EscapeContext`（型） | `escapeTarget(context)` の引数の型であり、段の判定を試す者が仕様だけから組めるように。⚠️ `EscapeTarget` と `EscapeContext` は `crossing-names-baseline.txt` に「行の無い越境」として載っている —— 行ができたので、その 2 行は基準線から消すことになる（前に立つ者） |
| 2 | `PI-39` に外が読む型（見込み） | `ScreenValues` ・ `ScreenValuesEvent` ・ `PropertiesSubject` ・ `ArmKind` の 4 つを書いた | 仕様だけを読む試験が名を要る。⛔ コードの段が外の import から測って違えば、`PI-39` を合わせる |
| 3 | `UF-86` の負う要求に `FR-072` ・ `FR-066` を移すかは 表 T-277 で決め直す | **移さない** | 状態機械が持つのは出す・隠すだけであり、`FR-072`（何を出すか、選択との関係）と `FR-066`（対話欄の中身と `AG-11` の順）の規則の値は部品（`UF-64` ・ `UF-68`）に残る。`OW-1` ・ `OW-2` の「規則の値を持つユニット」は動かない。未記入の数（`unfilled=17`）は動かない |
| 4 | 5.3 のディレクトリ木に `session-effects.ts` | 触らない | 木はフォルダだけを並べ、ファイルを書いていない（`05-07-design.md` の 5.3） |
| 5 | 表 T-283 の `RG-1` の注「`hidden` には升が無い」 | 「消すものが無いときは消費しない（`NT-8`）」 | 升の有無は 表 T-286 が持つ。注は順を読む者への一言に留めた |
| 6 | `RG-11` の注「同上」 | 「面も問いも立っておらず、確定していないその場の編集も無いとき」 | 規則 02 の 4「同・」で前の行を継がない。`SK-19` の文を写した |
| 7 | 決定 23 の原稿の変更を第 1 段に入れるか（起草は B.4.2 の原稿の行に入れていた） | 入れた | 仕様だけを読む試験が `screenEventFromInput` の返す出来事を組むには、運ぶ値 `writes` が 表 T-280 に要る。⚠️ その代わり、下の赤が第 2 段まで残る |
| 8 | 第 1 章の要求 `FR-013` ・ `FR-107` の「`ScreenState` が覚える／持つ（`CP-36` / `PI-36`）」 | 触らない | 起草の範囲の外。値を覚えるのは画面の値の根（表 T-280）になり、`ScreenState` は型を持つ。要求の MUST（開いているあいだ覚え、文書に保存しない）は偽にならない。⚠️ 言い回しを直すかは前に立つ者に渡す（決定 3 を段 7 の出口で当てれば、状態の型が `ScreenState` へ戻り、文はそのまま真になる） |

**数（md-checks の最終行）**: 前 `tables=181  figures=25  rows=2231  uids=162` → 後 `tables=182  figures=25  rows=2245  uids=162`。⭐ B.15 の予測（＋1 ・ 0 ・ ＋14 ・ 0）どおり。

**第 2 段（コード）が閉じる赤**（第 1 段の後に残るもの。どれもコードがまだ無いことだけが理由）:

| 検査 | 理由 | 閉じ方 |
|---|---|---|
| 型検査 | `screen-values.ts` の生成の区画が `ScreenValuesEventCarried['writes']` を読むが、手書きの区画にその欄が無い（5 件） | 決定 23 の `writes` の型（書き込みの命令の列）を手書きの区画に足し、`write…` の副作用がそれを運ぶ |
| 単体（契約） | `tests/contract/state-machine-screen-values.contract.test.ts` が「no sample for carried value writes」で読み込みの時点で止まる | その試験の見本の表に `writes` の見本を足す（主張の行は変えない） |
| 単体（契約） | `tests/contract/units.contract.test.ts` の `UF-123` の行 —— いまのファイルは空のユニットであり、公開する形がまだ無い | `session-effects.ts` に B.3.2 の形を書く（見出しの `@unit      UF-123 ` と `@purity    non-pure` は生成器が書いたものを保つ） |
| 26b | `PI-18` の `screenEventFromInput`、`PI-37` の `ScreenViewReadings`、`PI-39` の 4 つの型が公開エントリから出ていない。旧 `ScreenState` の名（`ScreenState` ・ `emptyScreenState` ・ `screenStateWith…` ・ `rememberedActualOf`）と `screenStateFromInput` が行を持たずに越境する。基準線が `EscapeContext` ・ `EscapeTarget` を「行の無い越境」として持ったまま | コードが名を出し、旧い名を消す。基準線の 2 行は前に立つ者が消す（起草と変えたところの 1） |
| 24 | `W5-framework.md` の `UF-123` は ⬜ —— ファイルを書いた時点で「未着手なのに空のユニットでない」と赤になる | 同じ変更で ⬜ を 🔧 へ |
| 55 | 生成器が書いた空のユニットの注記 7 行が、`src/` の注記の形（規則 17）に合わない | 中身を書くときに注記を規則 17 の形へ |

## 改訂の記録 —— 波 B2 の第 1 段（仕様）を当てた（2026-09-22）

| # | 対象 | 変えたこと |
|---|---|---|
| 30 | 本書 | 波 B2 の設計（B.0 〜 B.15）を、`9b8a22b7` で起草した形から移し、`5413bea5` で測り直した値（B.1a）と、第 1 段で当てたもの（B.16）を足した |
| 31 | 第 6 節の表の「描き手の入力」の仮称 `RenderFrameInput` | `ScreenViewReadings`（B.2）。第 6 節の本文は起草の日の記録として書き換えない |
| 32 | 第 6 節の表の `CP-36` の「生成器の出力先を `screen-state.ts` へ移し」（本書の決定 3） | 波 B2 では行わない（B.8、決定 28）。段 7 の出口へ延ばした |
| 33 | 第 7 節の「波 B2（見込み）: rows +8」 | ＋14（表 T-283 の 13 行 ＋ `UF-123`）。`Enter` と `y` ／ `n` の 5 行を数えていなかった（B.6.2） |
| 34 | 第 6 節の表の `let` の数「55」 | 56（B.11 —— 今日の写しの覚えを数えていなかった） |
