# CR-436 — 画面の値を状態機械へ移す（リファクタ段 2b-B と、段 7 の第 1 領域）

> ⭐ **状態: 起草（2026-09-21）。まだ当てていない。**
> 読んだ木: `2112d0c9`（ブランチ `refactor`）。**本書の行番号と数は、断りが無いかぎりこの木で 2026-09-21 に自分で測ったものである。**
>
> **閉じるもの**:
> - `CR-379` の第 3 節「2b-B」の表（段 7 の最初の領域の変更要求がコードと同じ波で当てる、と同書の決定 2・3 が延ばした分）。
> - 第 1 領域「画面の値」の原稿の行（`SM` / `EV` / `TN`）と、その生成器・契約試験・遷移の関数。
> - ⭐ **利用者の裁定 `JDG-283`**（2026-09-21、逐語「**推奨の Cとせよ**」）—— `PND-451`（出していないプロパティパネルの境界を押したら何が起きるか）。着地先として本書が名指されている（`docs/development-records/rulings.md:480`）。
>
> **識別子（規則 02 の 2.5。⛔ どれも当てる直前に測り直し、日付を書き換えること）**:
> - 木が定義する表の番号の最大は `T-277`（2026-09-21 実測。`docs/spec/*.md` と `docs/spec/_assets/*.md` の見出し `**表 T-nnn —` を数えた）。
> - `T-280` `T-281` `T-282` `T-283` はどれも空いている（2026-09-21 実測。`docs/spec` ・ `change-request` ・ `src` ・ `tests` ・ `tools` を grep して 0 件）。本書の帯（表は `T-280` 以降）の内側である。
> - ⛔ 表 `T-276` ・ 接頭辞 `UD` ・ 要求 ID `FR-112` は取らない —— 別セッションの `CR-432`（起草中）が予約している。要求 ID は 1 つも立てない（帯 `FR-120` 以降は使わない）。
> - 行 ID の接頭辞の登録簿（`docs/spec/_source/row-id-prefixes.json`）の行は 160 件（2026-09-21 実測）。うち `SM` ・ `EV` ・ `TN` は `pending: true` で登録済みであり、本書は新しい接頭辞を登録しない（波 A）。
> - 図の番号は帯が配られていない。木の最大は `図 F-025` である（2026-09-21 実測）。本書は `図 F-026` を仮に置き、**当てる直前に測り直す**。
> - ⛔ 表 T-063 の `UT-8` 〜 `UT-10` と 表 T-075 の `UF-72` 〜 `UF-87` は `CR-432` が予約している（同書 :263〜267・:432〜433）。⇒ 本書は `UT-11` と `UF-88` 〜 `UF-90` を仮に置く（`CR-379` の第 3 節が書いた `UT-8` は使わない）。`CP-39` と `PI-39` は `CR-379` が名指しただけで、木にも他の草案にも無い（2026-09-21 実測）。
>
> ⛔ **起草だけである。仕様書・コード・試験・台帳・基準線は 1 文字も動かしていない。**

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
- **`R2.19`（コンポーネント境界）** —— 新しいコンポーネントも公開エントリ 1 つだけを外へ見せる。試験も公開エントリを通す。
- **`R4` グリッジ** —— `step` は次の状態を丸ごと返し、シェルは参照 1 つを差し替える（`SF-2` ・ `SF-7`）。遷移表と関数は契約試験で結ぶ（表 T-250 の `SD-3`）。
- **`R4` レースコンディション** —— 副作用は値として返し、結果は出来事で戻す（`SF-6`）。
- **`R7.1` / `R7.2` / `R7.9`** —— 遷移（`pure`）と副作用の実行（`non-pure`、シェル）を別の層に置く。
- **`R6`** —— 契約試験は（状態, 出来事）の組を列挙する。仕様だけを読む別の体に書かせる（`spec-driven-tests-by-another-agent` の作法）。
- **`R2.18`** —— 表 T-070 の `MN-9` が既に状態機械を覆っている。新しい行は要らない。

### ③ 利用者に問うたこと・**問わずに決めた**こと

**問うて裁定を得た**: `JDG-283`（`PND-451`）。問う前に打った 3 つの反証は第 5 節に残した。

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
| 決定 10 | **波 A の 表 T-075 の新しい 3 行の「負う要求」は `—` とする。** 波 B2 で、結線した後に最初に開くユニットが変わる要求（候補: `FR-072` ・ `FR-053` ・ `FR-071` ・ `FR-066`）を、`CR-435` の規則（1 要求 1 行）で移す | 波 A では画面がこのユニットを 1 度も呼ばないので、要求が動いたときに最初に開くファイルはまだ変わらない。`—` は「何も負わない」と読まれ、未記入のラチェット（`CR-435` の 6.2、17 件）を動かさない |
| 決定 11 | 行 ID: `CP-39` ・ `PI-39`（`CR-379` のとおり）、`UT-11`、`UF-88` 〜 `UF-90` | 上の識別子の段 |
| 決定 12 | **領域の `step` は出来事の種類から軸ごとの関数を引く表（`Record<出来事の kind, 関数>`）で振り分け、`switch` にしない** | 検査 60（帯 50 行 / 15 分岐）。`Record` の鍵の網羅は型が見るので、`SF-4`（`never` による網羅）と同じ強さを保つ。軸ごとの関数は帯の内側に収める |
| 決定 13 | **`CP-36` に `S-144` を足す直しは波 A で当てる**（`ScreenState` の広げは波 B2） | 文言だけの直しで、`PI-36`（`05-07-design.md:506`）とコード（`screen-state.ts` の `watermarkVisible`）は既に持っている。`CR-379` の :68 が見つけ、いまも欠けている（`05-07-design.md:141` に `S-144` 0 件） |

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
⚠️ 新設の 表 T-280 〜 T-282、`CP-39` ・ `UT-11` ・ `PI-39` ・ `UF-88` 〜 `UF-90` はまだ無いので種にできない。当てた後にもう一度走らせる。

---

## 3. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A** | なし（いま当ててよい） | `docs/spec/_source/state-machines.json`（新）と schema、生成器 2 本、`docs/spec/_assets/tbl-state-machines.md`（生成）、`docs/spec/05-07-design.md`（5.1 の `LY-3`、5.2 の `CP-36` の `S-144` と `CP-39`、5.3 の表と散文、5.5 の散文）、`docs/spec/_source/row-id-prefixes.json`（`pending` を外す）、`docs/spec/_source/components.json`、`src/use-case/advance-screen-session/`（新 3 ファイル）、`tests/contract/` と `tests/unit/` の新しい試験、`package.json` の 2 項目 | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ 21（出どころ）・ 27（`gen:check`）・ 30（生成した定数）・ 33（5 章の自己監査）・ vitest |
| **B1** | 段 5 と段 6 が済み、`src/adapter` と `src/framework` が本セッションへ渡っている | `docs/spec/01-04-requirements.md` の `FR-052` と 表 T-023d の `GR-22`（1 度に）、`screen-frame.ts:105`、`frame-loop.ts:4169`〜`:4178` の削除、試験 1 本 | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e の境界とスクロールバー |
| **B2** | 段 5 と段 6 が済み、波 B1 が当たっている | シェルへの結線（handoff の ④）、`CP-18` ・ `CP-25` ・ `CP-36` の広げ ・ `UF-48` ・ `PI-18` ・ `PI-36` ・ `PI-39`、描き手の入力の移行（第 4 節）、`let` 12 の削除、優先順の表 `T-283`、`components.json` の辺 | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部、`LM-19` の性能（利用者を呼んでから） |

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
| 表 T-063 に `UT-11` | —— | `AdvanceScreenSession` ／ `advance-screen-session.ts` ／ `session-step.ts` ／ 領域ごとの遷移のユニット（いまは `screen-values.ts`）／ 「**純粋性ではない** —— 3 つとも `pure`。**領域ごとに縛る要求が別なので割った**（`UT-2` ・ `UT-7` と同じ形、表 T-249 の `SF-8`）」。⚠️ `CR-432` が先に当たり 表 T-276（割る基準）が在るなら、その行 ID を名指して書く |
| 表 T-064 に `PI-39` | —— | `ScreenSession`（型。根の状態。領域の合成（`SF-8`）で、いまは画面の値の領域だけ）／ `SessionEvent`（型。全数は 表 T-281）／ `SessionEffect`（型。副作用の名の全数は 表 T-282 の副作用の欄）／ `emptyScreenSession`（初期の状態。表 T-280 の初期の欄）／ `advanceScreenSession`（1 段進める。何も変わらないときは受け取った参照を返す —— `SF-3`） |
| 表 T-075 に 3 行 | 68 行 | `UF-88` `AdvanceScreenSession` ／ `advance-screen-session.ts` ／ `pure` ／ `CP-39` ／ `—`。`UF-89` 同 ／ `session-step.ts` ／ `pure` ／ 領域の遷移が共有する型と定数（`Step` ・ `unchanged` ・ 空の副作用の列 ・ `assertNever`）／ `—`。`UF-90` 同 ／ `screen-values.ts` ／ `pure` ／ 画面の値の領域の遷移（表 T-280 〜 表 T-282）と、生成した型と遷移表の定数の区画 ／ `—`（決定 10）。`CP-n` の順で `UF-71` の後 |
| 表 T-074 `SU-1` / `SU-3`、5.3 の散文（`:286` ・ `:307`）とディレクトリ木の `use-case/`、`MN-2`（`:904`） | 36 ／ 68 | 37 ／ 当てる時のユニット数 ＋ 3（`CR-432` が先に当たれば 84 ＋ 3）。木に `advance-screen-session/` |
| `components.json` | nodes 36 ／ edges 138 | node `AdvanceScreenSession` を `UseCase` の枠へ、辺 `AdvanceScreenSession → ScreenState` と `AdvanceScreenSession → Selection`（表 T-247 の `EG-2` ・ `EG-3` で数えたものだけ）。`build.py` で図と `docs/review/components/components.md` を作り直す（draw.io の CLI が要る） |
| `src/use-case/advance-screen-session/` | 無い | 3 ファイル。`session-step.ts` は `Step<S, E> = { state: S; effects: readonly E[] }`、共有の空の列、`unchanged(state)`、`assertNever`。`screen-values.ts` は軸ごとの関数と、決定 12 の振り分け表。公開エントリは根の状態を持ち、決定 5 の値を出来事へ詰めて領域へ渡す。⛔ モジュールスコープの可変状態を置かない（検査 61、`SF-7`） |
| **契約試験** `tests/contract/state-machine-screen-values.contract.test.ts` | 無い | 原稿を読み（生成物ではなく原稿 —— 2 つが一致することは `--check` が別に見る）、(1) 各軸の各種類 × 各出来事で、`TN` に行がある組は先の種類が表と一致すること（ガードは真偽の両側を出来事の値で作る）、(2) 行の無い組は受け取った状態と同じ参照と共有の空の列を返すこと（`SD-3`）、(3) 連言の元（`TN-19` ・ `TN-23`）はその組み合わせを作って確かめること。⭐ 書くのは仕様だけを読む別の体 |

### 3.2 波 A の直前の測り直し（⛔ 当てる体が打つ）

1. 木が定義する表の番号がいくつまで在るか。本書の新しい表 3 つ・`図 F-026` ・ `CP-39` ・ `PI-39` ・ `UT-11` ・ `UF-88` 〜 `UF-90` の空き（`CR-432` が当たっていれば `UF-` の最大が動く）。
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
| `components.json` の辺 | `SingleHtmlShell → AdvanceScreenSession`、`ScreenRenderer → AdvanceScreenSession`、`InputCommandTranslator → AdvanceScreenSession`（出来事の型）。`ScreenState` への辺の説明文を直す |
| 表 T-075 の「負う要求」 | 決定 10 |
| 台帳 | `PND-338`（閉じたことを保つのは状態機械 —— `SM-19`）・ `PND-144`（`FR-072` の「残す」が決めている —— 行が無いので同じ参照）・ `PND-419`（推奨どおりなら遷移が無い）を閉じる候補。閉じるのは台帳の体 |
| 性能 | `LM-19` の手順。⛔ **測る前に利用者を呼ぶ** |

⛔ 基準線（`function-size-baseline.txt` ほか）が動くときは、数を利用者に見せてから前に立つ者が書く。

---

## 7. 数の予測

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行。
**起草時（`2112d0c9`、2026-09-21）: `tables=171  figures=17  rows=2183  uids=161`**

**波 A**:

| | 前 | 後（予測） | 差 | 内訳 |
|---|--:|--:|--:|---|
| tables | 171 | 174 | +3 | 表 T-280 ・ T-281 ・ T-282（生成物。`_assets/*.md` も数えられる見込み） |
| figures | 17 | 18 | +1 | 図 F-026 |
| rows | 2183 | 2306 | +123 | `SM` 34 ＋ `EV` 30 ＋ `TN` 53 ＝ 117、`CP-39` ・ `UT-11` ・ `PI-39` ・ `UF-88` 〜 `UF-90` の 6 |
| uids | 161 | 161 | 0 | 要求を足さない |

⚠️ `CR-432` など他の変更要求が先に当たると「前」が動く。⭐ **差だけを突き合わせる。** 生成物の行が rows に入るかは md-checks が `_assets/` の表をどう読むかで決まる —— 外れたら「生成物の 117 行を数えていない」を最初に疑う。

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
| `docs/development-records/changelog.md` | A-appendix の 1 行 | 各波 |
| 登録簿の生成物 `docs/spec/_assets/tbl-row-id-prefixes.md` | `SM` ・ `EV` ・ `TN` が「登録のみ」でなくなる | 波 A |
| `docs/review/components/components.md` と図 F-013 〜 F-017 | `build.py` が作り直す | 波 A ／ 波 B2 |
| 検査 30 の名簿 | 生成した遷移表の定数を足す | 波 A |

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
| SM-21 | `screen.properties.documentSettings` | `screen` | | — | `S-99h` set:390、`FR-072` req:1877 〜 :1878、`IC-17` glo:530 |
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
| TN-26 | `properties.selection` | EV-15 | — | `properties.documentSettings` | — | `FR-072` req:1877、`IC-17` glo:530 |
| TN-27 | `properties.documentSettings` | EV-15 | — | `properties.selection` | — | `FR-072` req:1877 |
| TN-28 | `properties.none`、`properties.documentSettings` | EV-16 | — | `properties.selection` | — | `FR-072` req:1885 〜 :1886 |
| TN-29 | `properties.selection` | EV-16 | — | 自己（`subject` を書き換え） | — | `FR-072` req:1873 |
| TN-30 | `properties.selection` | EV-17 | `hasChoice` | 自己（`subject` を書き換え） | — | `FR-072` req:1888 |
| TN-31 | `properties.selection`、`properties.documentSettings` | EV-8 | `isPanelTarget` | `properties.none` | — | `IC-52` glo:577、`FR-072` req:1889 |
| TN-32 | `properties.selection`、`properties.documentSettings` | EV-9 | `rungIsSurface & isPanelTopmost` | `properties.none` | — | `IN-4` req:6795、req:4194（⚠️ `DFC-570` 裁定待ち —— 第 8 節の 2） |
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

**調査の下書き（`SM` 34 ・ `EV` 30 ・ `TN` 47）から変えたもの**:
- 任意だった `SM-32` ・ `SM-33` ・ `EV-30` とその 2 遷移を本行に入れた（決定 8）。
- 出来事を 2 つ持つ 4 行を割った（決定 6）—— 旧 TN-43（`EV-23` ／ `EV-9`）→ `TN-43` ・ `TN-44`、旧 TN-44 → `TN-45` ・ `TN-46`、旧 TN-45 → `TN-47` ・ `TN-48`、旧 TN-47（`EV-28` ／ `EV-29`）→ `TN-50` ・ `TN-51`。
- 軸の葉の親を軸の名（行が無い）から `screen`（`SM-0`）へ直した（決定 4）。
- `TN-51` に副作用 `writeProgressStep` を足した —— 押下の巡りは文書を書く（表 T-270）ので、`SF-6` により副作用として返す。
- `TN-21` 〜 `TN-24` の「`surface.open`（`U-60`）」を、ガード `isWatermarkUnlockSurface` に書き直した（`surfaceName` は運ぶ値であり種類ではない —— `SM-16`）。
- `TN-32` のガードに `isPanelTopmost` を足した —— req:4194 が「面が立っているあいだ閉じる手は面へ向かい、面の後ろのパネルではない」と、同じ段の中の順を定める。
- ⭐ **`JDG-283` により、出していないパネルの境界の押下の行は 0、`SM-19` の運ぶ値は 0。**
