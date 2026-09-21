# CR-500 — 焦点の求めの状態機械を「欄の編集」に広げる（`fieldEditStateMachine`）

> ⭐ **状態: 波 A を当てた（2026-09-21、ブランチ `sm-fieldedit-a`、`f626ae16` の上）。波 B ・ 波 C は当てていない。** 利用者の裁定は `JDG-290` として `docs/development-records/rulings.md` に記録した。
> ⭐ 当てた体が草案から変えたところは、末尾の改訂の記録の 2 以降に並べた。第 0 〜 10 節と付録は草案の文のまま残した —— 当てた形の全数は 表 T-292 が持つ。
> 読んだ木: **`f626ae16`（ブランチ `sm-selection-a`、`CR-490` の波 A）**。⚠️ 依頼は「`refactor` が `f626ae16` 以降」と書くが、2026-09-21 に測ると根の作業木の `refactor` は `d978c130` で、`f626ae16` はその子であり `refactor` にまだ入っていない（`git merge-base --is-ancestor f626ae16 HEAD` が偽、`git branch --contains f626ae16` は `sm-selection-a` だけ）。本書は `git archive f626ae16` をスクラッチへ展開して読んだ。**本書の行番号と数は、断りが無いかぎりこの木で 2026-09-21 に自分で測ったものである。** 当てる体は、`CR-490` が `refactor` に入ったことを確かめてから当てること。
> 型板は `CR-480`（同じ領域 `fieldEntry` を立てた変更要求）と `CR-490` の 11.5（「いまどの欄を編集しているか」の案と代償 —— `change-request/CR-490-selection-moves-into-the-state-machine.md:380`〜`:397`）。名前の規則は `docs/development-rules/07-review-standards.md` の「状態機械」の節（`:296`〜）と R4.4（`:605`）。
>
> **利用者の裁定（`JDG-290` として `docs/development-records/rulings.md` に記録した）**: 逐語「C: 焦点の求めの状態機械を「欄の編集」に広げる かな。 ただし、編集する対象は任意に変わるから、編集対象ごとに状態を設定するわけじゃないよね？ だったら賛成。」
> ⇒ **状態は欄ごとに増やさない。** 状態は `idle` ／ `fieldFocusWanted{fieldRow}` ／ `editingField{fieldRow}` の 3 つで、**欄は運ぶ値**（行 ID）である。編集する欄が替わるのは運ぶ値を書き換える自己遷移であり、編集できる欄を足しても、足すのは運ぶ値の取りうる値であって状態ではない。
>
> **結論（先に書く）**:
> - 機械 `fieldFocusWantStateMachine` を **`fieldEditStateMachine`**（今の状態 `fieldEditState`）へ改名して広げる。状態 2 → 3（`editingField{fieldRow}` を足す）、升 6 → 11。
> - 出来事は 5 → 6: **`fieldFocusLanded` を退け、`fieldEditBegan{fieldRow}` と `fieldEditEnded{fieldRow}` を足す**。`fieldFocusAsked` ・ `creationLanded` ・ `fieldFocusWithdrawn` ・ `choiceMoved` はキーも意味もそのまま使う。ガードを 1 つ足す（`isEditedField`）。
> - **表 T-065 の `IF-9` を改める**: 宿主は「まだ確定していない文字入力があるか」の真偽を答えるのをやめ、**文字入力の欄で編集が始まったこと・終わったことを、その欄が名乗る行 ID とともに知らせる**。確定していない**中身**を返さない決まり（`JDG-68` の読み）はそのまま残す。
> - `WS-2`（`AG-9`）・`IN-4` の段 `textEntry` ・ `IN-5a` ・ `SK-19` の段は、宿主に毎回問うのをやめ、**`fieldEditState` が `editingField` にいるか**を読む。真偽を残す読み手は無い（`IME` の変換中は真偽に入っていない —— 2 節）。
> - `CR-490` の 11.4 の 6 つの使い方を新しい表で歩き直した: 11.5 の隙間「いまどの欄を編集しているか」は閉じる。残るのは機械の外の 3 つ（仕様の空白 2 つと未検証 1 つ —— 5 節）。
> - **利用者に問うこと: 0 件**（候補 10 に 3 つの反証を打った —— 7 節）。台帳の候補 2 つ（波 A が `DFC-701` ・ `DFC-702` として書いた）と、`DFC-694` の扱いを 8 節に置いた。
>
> **識別子**（規則 02 の 2.5。起草時に測り、波 A を当てる直前の 2026-09-21 に `f626ae16` で測り直した —— `git grep -lw <名> HEAD -- docs change-request src tests tools .claude`）:
> - 依頼が配った番号: **変更要求 `CR-500`**。`f626ae16` の `docs` ・ `change-request` ・ `src` ・ `tests` ・ `tools` ・ `.claude` を `grep -rlw` して 0 件だった（2026-09-21。当てる直前にも本書を除いて 0 件）。`change-request/` の上端は `CR-490` だった（同日、`ls change-request`）。⚠️ `CR-500` が本線の帯（`docs/development-records/handoff.md:42`）か状態機械の側の帯かは本書では確かめていない —— 前に立つ者が宣言すること（`CR-480` ・ `CR-490` の冒頭と同じ注）。
> - **新しい表・図・ユニット・行 ID の接頭辞・要求 ID は取らない。** 表 `T-292` ・ 図 `F-038` を刷り直し、ユニット `UF-121`（`field-entry-values.ts`）を書き換えるだけである。
> - 新しい名の重なり（同じ 6 か所を `grep -rlw`、2026-09-21、`f626ae16`）: `fieldEditState` ・ `FieldEditState` ・ `fieldEditBegan` ・ `fieldEditEnded` ・ `isEditedField` ・ `readFieldEditChanges` ・ `FieldEditChange` は 0 件だった（当てる直前にも 0 件）。`fieldEditStateMachine` ・ `editingField` は `CR-490` の 11.5 の案の表（`CR-490:393`〜`:394`）にだけ在った —— 同じ意味の案の字面なので重なりではない。
> - 台帳の上端（2026-09-21）: `f626ae16` では `DFC-700`（`CR-490` の波 A が `DFC-695` ・ `DFC-696` ・ `DFC-700` を書いた —— `CR-490:23`）、根の作業木（`d978c130` ＋ 未コミットの `defects.md`）では `DFC-694`。`JDG-289`（`f626ae16` の `rulings.md:513`）、`PND-500`。⇒ 起草時は候補を仮の名で呼んだ。波 A は書く直前に `defects.md` と `fixed-defects.md` を引いて `DFC-701` ・ `DFC-702` が 0 件であることを測り、その 2 つとして書いた（`DFC-697`〜`DFC-699` はほかのセッションが取っているので使わない —— `CR-490:23`）。`JDG-290` も当てる直前に 0 件だった。`PND-500` は動かしていない。
> - 状態・出来事・遷移に通し番号を振らない（`JDG-286`、`rulings.md:497`）。⛔ 廃止した 3 つの接頭辞の番号の形を書かない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **波 A はどの `CH-` も直接には前へ進めない —— 基盤の作業である。** 波 A は仕様（`IF-9` ・ `IN-5a` の 1 文）と、画面がまだ呼ばない領域（`CR-480` の波 A と同じく、`field-entry-values.ts` を画面は呼ばない —— `CR-480:29`）だけを変える。波 B（面の知らせと結線）も振る舞いを変えない（`JDG-57`、`rulings.md:134`）。

守るもの:
- **`AG-9`（req:6071）「人が編集入力を確定していない間（プロパティパネルで入力中など）も同じく拒否すること（MUST）」と `WS-2`（des:660）** —— いまは `hasUnsettledTextEntry()`（`src/framework/single-html-shell/frame-loop.ts:2909`〜`:2911`）を書き込みの時機（`:3069`）と `Agent API` の写し（`:2774` → `src/adapter/agent-api-endpoint/agent-api-members.ts:325` ・ `:493` ・ `:536`）が読む。移した後は `fieldEditState` が `editingField` かを読む。
- **`IN-4`（req:6804）の第 2 階層「確定していないその場の編集」、`IN-5a`（req:6807）、`IN-5b`（req:6808）、`IN-6`（req:6809）、`SK-19`（req:4166）、`FR-091`（req:1347〜）** —— 升は今日の振る舞いを写す（`JDG-57`）。
- **`GL-003`** —— この領域の出来事は、押下・キー・書き込みの着地・宿主の知らせ（焦点が欄に入った／出た）・選択の変化だけで、ポインタの移動では 1 つも作らない（表 T-249 の `SF-5`、des:1015）。性能は `LM-19`。⛔ **測る前に利用者を呼ぶ**（`RISK-001` の門）。

### ② レビュー観点のどの条項を当て、何が出たか

- **R4 「状態機械」の節 ／ R4.4**（`07-review-standards.md:296`〜、`:605`）—— 機械は名詞句 ＋ `StateMachine`（`fieldEditStateMachine` ——「欄の編集」を追う）、今の状態は `fieldEditState` ／ 型 `FieldEditState`。状態は `idle`（形容詞）・`fieldFocusWanted`（過去分詞、既存）・`editingField`（現在分詞 ＋ 目的語 —— 節の表の「進行中の活動」の形。`fieldEditing` の語順は同じ表が禁じる形）。出来事は主語 ＋ 過去形（`fieldEditBegan` ・ `fieldEditEnded`）。ガード `isEditedField`（`is` ＋ …）。既存の 73 のキーと重なり 0（スクラッチの `e-try-gen.py` で生成器の `load()` に通して問題 0 —— 1 節）。
- **R4.3**（`:604`）「イベント通知タイミング（前/後）を定義」—— 知らせは焦点の出入りと**同期**に宿主の中へ溜まり、読む側は**状態を読む前に溜まった知らせをすべて機械へ渡す**（3 節の `IF-9` の文）。これで「焦点は出来事なしに動く」（`frame-loop.ts:2907` の WHY）への答えになる —— シェルからは出来事なしに動くが、面は `focusin` ・ `focusout` を見ている（`src/framework/dom-screen-surface/dom-screen-surface.ts:2771`〜`:2782` ・ `:2958` ・ `:3012`〜`:3020`）。
- **5.5 の原稿の規則**（「原稿に載せるのは、要求が名指す状態・出来事・遷移だけとする」）—— `editingField` は `AG-9`「入力中」・`IN-5a`「文字入力を確定していない間」（自ら「状態の呼び名は `AG-9` と同じ」と書く）・`IN-4` の第 2 階層・`IN-6` が名指す（`CR-490:383`）。
- **`SF-5`（des:1015）** —— 「宿主の答え」はこれまでフレームの値だった（`CR-480` の決定 4、`CR-480:56`）。本書の後は、宿主が**出来事として知らせ**、機械が状態として持つ。⚠️ `SF-5` の 3 文目「出来事は、押す・掴む・問いに答える、および指しているパーツや当たりが変わったときだけ作る」は字面では狭いが、`CR-480` も宿主の答え（`fieldFocusLanded`）を出来事にしており、ポインタの移動で出来事を作らないことの規則と読んだ。新しい 2 つは押下・キー・焦点の置き直しの後にだけ来る。⇒ `SF-5` は変えない。
- **`SF-7`** —— 新しいモジュールスコープの可変状態を置かない（検査 61）。

### ③ 利用者に問うこと・**問わずに決めた**こと

**問うこと**: ⭐ **なし（0 件）。** 候補 10 に打った 3 つの反証は第 7 節に残した。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | **機械の名は `fieldEditStateMachine`、今の状態は `fieldEditState`、型は `FieldEditState`。領域のキー `fieldEntry`、名「名前付けと入力欄」、ファイル `field-entry-values.ts`、型の幹 `FieldEntryValues` は変えない** | 裁定の語「欄の編集」。名は `CR-490` の 11.5 の案（`:393`）と同じ字面。領域の名は名前付けと入力欄の両方を今も言い当てるので、変えると `CP-39` ・ `UT-11` ・ `PI-39` ・ 5.5 の散文・図 F-028 まで波が及ぶ（`CR-480` の 3.1 がそれらに名を書いた —— `CR-480:151`〜`:156`） |
| 決定 2 | **状態は 3 つ（`idle` ／ `fieldFocusWanted{fieldRow}` ／ `editingField{fieldRow}`）。欄は運ぶ値 `fieldRow`（行 ID）であり、欄ごとに状態を立てない** | 裁定（冒頭）。`fieldFocusWanted` と `editingField` は同じ名の運ぶ値を持つので、焦点が求めた欄に入る升は運ぶ値をそのまま引き継ぐ |
| 決定 3 | **`fieldFocusLanded` を退け、`fieldEditBegan{fieldRow}` が「焦点が入った」を兼ねる** | `IN-5b` の「入ったことを確かめ」の答えは、焦点が欄に入ったという 1 つの事実である。面は焦点が入ったら編集が始まったと知らせる（面の「入力中」は中身ではなく焦点で持つ —— `dom-screen-surface.ts:2997` の WHY「held by focus, not by contents」）。同じ事実に 2 つのキーを置くと、1 つの `focusin` から 2 つの出来事を送ることになる。`JDG-175`（`rulings.md:294`）が了承した「焦点が入ったかを確かめ、入っていなければ置き直す」は変わらない —— 確かめの答えが `fieldEditBegan` になるだけである |
| 決定 4 | **終わりは 1 つの出来事 `fieldEditEnded{fieldRow}`。確定と取り消しに分けない** | 升が同じ（`editingField` → `idle`）。確定した値は `IF-9` の既存の答え（`readFieldCommit` —— `src/adapter/screen-renderer/screen-surface.ts:53`）が行 ID とともに別に運ぶ。前例は `CR-480` の決定 7（取り下げの 4 事由を 1 つの出来事にした —— `CR-480:59`）。確定か取り消しかを読む升が要るようになったら、そのとき分ける |
| 決定 5 | **`fieldEditEnded` と、編集中の `fieldFocusAsked` にガード `isEditedField`（出来事の `fieldRow` が今の `fieldRow` と同じ）を付ける** | 欄が替わるとき、宿主は前の欄の `focusout` と次の欄の `focusin` を別々に出す。前の欄の終わりが次の欄の始まりの後に届いても、次の欄の編集を消さないため。編集中の欄に焦点を求めたとき（例: 文書名を編集中の `F2` —— `SK-9` req:4174）は求めが既に満ちているので変えない（面は既に焦点の入った欄に `focus()` を呼んでも `focusin` を出さない —— `focusPropertyField` の `isFocusOn(entry)` の枝、`dom-screen-surface.ts:2714`） |
| 決定 6 | **運ぶ値 `fieldRow` の型を `string`（欄が名乗る行 ID）に広げる。`CR-480` の改訂の記録 3 の 5 行の和 `FieldEntryFieldRow` は、求める側の定数（`PR-1` ・ `AT-53`）に残す** | `editingField` の欄は `IF-9` の「編集できる欄」全体であり、表 T-016 の行・`AT-` の行・`U-27` ・ `U-60` にまたがる（2 節）。和で書くと表 T-016 を型に写すことになり、欄を足すたびに型が動く —— 裁定の「欄を足しても足すのは値」に反する |
| 決定 7 | **透かし解除の面の答えの欄は 表 T-103 の `U-60` を名乗る** | いまの「入力中」はこの欄を数える（`dom-screen-surface.ts:3061` の `isWatermarkUnlockHeld`）。欄が自分の行を持たないので、欄を持つ面の行を名乗る。前例は `IF-9` の文書名の欄（`U-27` —— des:565 の括弧）。対話欄（`U-44`）は数えない（`IN-5a` の 3 文目、des:565 の ⚠️） |
| 決定 8 | **パネルが隠れたときに編集が終わる扱いは、機械の升にも `{in: …}` にも書かない。宿主が欄の終わりを知らせる** | パネルは画面の値の領域（`propertiesPanelContentStateMachine`、原稿 `state-machines.json:1357`）で、領域をまたぐ `{in: …}` は書けない（`CR-480` の決定 8 の注 —— `docs/spec/_source/state_machines_json_to_md.py:34` —— ガードの `in` は同じ領域のほかの機械の状態しか名指せない）。仕様の道はどれも、パネルが隠れる前に編集を確定する: `SK-19` は確定の段がパネルの段より先（req:4166）、`IN-4` は編集の段が面の段より先（req:6804）、`IN-6` は欄の外の押しで確定する（req:6809）。⇒ **確定** が先に済み、宿主は焦点が欄を離れたときに `fieldEditEnded` を知らせる。ヘッダの `U-27` と面の中の欄（`U-60`）はパネルに依存しない。⚠️ 確定も取り消しも通らずに欄が消える道が本当に無いかは未検証（第 8 節の `DFC-702`） |
| 決定 9 | **`IF-9` の真偽の答え（`hasUnsettledTextEntry`）を退ける。読み手 4 つはすべて状態を読む** | 同じ事実を答える場所を 2 つ持たない（`IF-9` 自身が「答える場所も 1 つでよい」と書く —— des:565 の末尾）。`IME` の変換中は真偽に入っていない（`:3060`〜`:3062` は焦点だけを見る。変換中を見るのは面の中の `Enter` の扱いだけ —— `:1457` ・ `:2816` ・ `:2982`）ので、真偽を残す理由にならない。⚠️ `JDG-68`（`rulings.md:152`）の読みは「確定していない入力は『あるか』の真偽 1 つで答える」を含む。本書はその部分を `JDG-290` で置き換え、**中身を返さない**部分（`DFC-571` への答えの芯）は残す。後の裁定を優先する読みの前例は `JDG-113`（`rulings.md:207`） |
| 決定 10 | **編集中に `fieldFocusWithdrawn` ・ `choiceMoved` は機械を動かさない** | `IN-5a` の後の段の取り下げは焦点の**求め**の話である（req:6807 の末尾）。編集中の `Esc` ・欄の外の押しは面が扱い（`IN-4` ・ `IN-6`）、終わりを `fieldEditEnded` で知らせる。選択が動いても、欄を保持しているあいだパネルは描き直されない（`dom-screen-surface.ts:2604` の TRAP）ので、編集中の欄は画面に残る |

---

## 1. 測った事実（`f626ae16`、2026-09-21）

| 数 | 値 | 測り方 |
|---|---|---|
| 原稿の今 | 6 領域 ・ 機械 21 ・ 状態 59 ・ 出来事 73 ・ 升 145 ＋ 根の升 10 | `state-machines.json` を Python で数えた（升は機械 × 出来事 × 状態の組の数）。`CR-480` の改訂の記録 8 の「136 ＋ 6」に `CR-490` の 9 ＋ 4 を足した数と合う |
| 領域 `fieldEntry` の今 | 出来事 5・機械 2・状態 4・升 9 ＋ 根 1（原稿 `:4044`〜`:4359`、機械 `fieldFocusWantStateMachine` は `:4254`、`fieldFocusLanded` の定義 `:4137`、升 `:4338`） | 同上 |
| 刷った表 | 表 T-292 は `docs/spec/_assets/tbl-state-machines.md:715`〜`:797`（機械 `fieldFocusWantStateMachine` の節 `:774`〜`:797`） | `grep -n` |
| 草案の原稿を生成器に通した | `load()` の問題 0。表と図を刷れた（付録 C）。後: 6 領域 ・ 機械 21 ・ 状態 60 ・ 出来事 74 ・ 升 150 ＋ 根 10 | スクラッチの `e-try-gen.py`（原稿の写しの `fieldEntry` を付録 D に置き換え、`SRC` を写しへ向けて `load()` と `build()` を呼んだ。木には何も書いていない） |
| 「入力中」の真偽を読む所 | 4 つ: `Agent API` の写し `frame-loop.ts:2774`、入力の文脈 `:3041`（→ 翻訳係 `input-command-translator.ts:153` ・ `:1460` ・ `:1464` ・ `:1470` ・ `:4118` ・ `:4132` ・ `:4183` ・ `:4275`、`Esc` の段 `src/entity/document-model/screen-state/screen-state.ts:117` ・ `:130`）、書き込みの時機 `:3069`（→ `src/use-case/apply-document-change/document-change-plan.ts:200`）、`settleTextEntry` の枝 `:3901` | `grep -rn "isTextEntryUnsettled\|hasUnsettledTextEntry\|editingInPlace" src` |
| 宿主の「入力中」の中身 | `heldTextControl !== null \|\| isWatermarkUnlockHeld \|\| documentTitleEntry !== null`（`dom-screen-surface.ts:3060`〜`:3062`）。パネルの欄は `focusin` ・ `focusout` で持つ（`:2771`〜`:2782`）—— 文字を受けない欄（チェック箱など）は `isFieldHeld` だけが立ち「入力中」にならない | 読んだ |
| md-checks の最終行 | `tables=181  figures=25  rows=2227  uids=162` | 第 9 節 |

---

## 2. 広げた機械

### 2.1 状態と運ぶ値

| 状態 | 運ぶ値 | 要求 | 今日の持ち主 |
|---|---|---|---|
| `fieldEditStateMachine.idle`（初期） | — | `IN-5a` ・ `IN-5b` ・ `AG-9` | —— |
| `fieldEditStateMachine.fieldFocusWanted` | `fieldRow`（求めた欄: `PR-1` ・ `AT-53` ・ `PR-16` ・ `PR-21` ・ `U-27`） | `IN-5a` の後の段、`IN-5b`、`MK-13`、`HF-14`、`FR-091`、`FR-035` | `nameFieldWantedRow`（`frame-loop.ts:2915`）。`CR-480` の状態のまま |
| `fieldEditStateMachine.editingField` | `fieldRow`（編集している欄が名乗る行 ID: 表 T-016 の編集できる行、`AT-53` ほかの行の欄、`U-27`、`U-60`。開いた集合 —— `IF-9` が決める） | `AG-9`「入力中」、`IN-5a`、`IN-4` の第 2 階層、`IN-6`、`SK-19` の確定の段 | **無い**（宿主が毎回真偽で答える —— `frame-loop.ts:2907`〜`:2911`）。⇒ `CR-490` の 11.4 の UC-2 ・ 3 ・ 5 の歩 4 の隙間 |

⭐ **同じ行 ID が別の対象に在っても（タスク X の `PR-1` とタスク Y の `PR-1`）、運ぶ値は区別しない。** 裁定の語どおり欄は行 ID である。混ざらない理由: `fieldFocusAsked` の出どころは押下（`MK-13` のダブルクリック、`FR-097`）か `F2`（`SK-9`、文書名 1 つ）であり、押下は `IN-6` で先に編集を確定し（面の `settleOnPressOutside` は宿主の `pointerdown` で走る —— `dom-screen-surface.ts:2837` ・ `:2852`）、前の欄の終わりが先に届く。

### 2.2 出来事（領域に 1 度だけ定義する —— 6）

| 出来事 | どこから来るか | 運ぶ値 | 動かすもの | 扱い |
|---|---|---|---|---|
| `fieldEntry/fieldFocusAsked` | 入力（既存） | `fieldRow` | `fieldEditStateMachine` | 再利用。意味は変えない |
| `fieldEntry/creationLanded` | 副作用の結果（既存） | `created` | 根 ・ `createdTaskNamingStateMachine` ・ `fieldEditStateMachine` | 再利用 |
| `fieldEntry/fieldFocusWithdrawn` | 入力（既存。呼び手が事由を決める） | — | `fieldEditStateMachine` | 再利用。`fieldFocusWanted` だけを動かす |
| `fieldEntry/choiceMoved` | ほかの領域（既存） | — | `createdTaskNamingStateMachine` | 再利用。`fieldEditStateMachine` を動かさない |
| **`fieldEntry/fieldEditBegan`** | 入力 —— 宿主が知らせる: 文字入力の欄で編集が始まった（焦点が入った）。人の押下・キーで入っても、求めた焦点が入っても同じ | `fieldRow` | `fieldEditStateMachine` | **新**。`fieldFocusLanded` を兼ねる（決定 3） |
| **`fieldEntry/fieldEditEnded`** | 入力 —— 宿主が知らせる: その欄の編集が終わった（確定・取り消し・欄が消えた —— どれでも） | `fieldRow` | `fieldEditStateMachine` | **新**（決定 4） |
| ~~`fieldEntry/fieldFocusLanded`~~ | —— | —— | —— | **退く**（決定 3）。「欄が描かれていないので真」の答え（`dom-screen-surface.ts:2707`〜`:2708` の TRAP）は、波 B の呼び手が `fieldFocusWithdrawn` として送る（`CR-480` の 2.1 の最後の行のまま —— 第 8 節の `DFC-694`） |

⚠️ 出来事の種類: 新しい 2 つは `input` とした。焦点の出入りは人の押下・キー（`Tab`）が起こすのがほとんどで、`U-60` の答え（`watermarkUnlockAnswered`、`input`）と同じ扱い。求めた焦点が入った場合だけは副作用の結果でもある —— 升は同じなので 1 つの種類に寄せた。

### 2.3 状態遷移表（升 11）

升目の書き方: `→ 先 [ガード] / 副作用`。**`—` は変わらない ＝ 同じ参照**（`SD-3`）。

| 出来事 ＼ 状態 | `idle` | `fieldFocusWanted` | `editingField` |
|---|---|---|---|
| `fieldFocusAsked` | → `fieldFocusWanted`（`MK-13` ・ `FR-035` ・ `IN-5b`） | → 自己（`fieldRow` を書き換える） | → `fieldFocusWanted` [not `isEditedField`]<br>それ以外 → —（求めは既に満ちている —— 決定 5） |
| `creationLanded` | → `fieldFocusWanted`（タスクなら `PR-1`、行なら `AT-53`）（`FR-091` ・ `HF-14` ・ `IN-5b`） | → 自己（`fieldRow` を書き換える） | → `fieldFocusWanted`（同上。今日のシェルは編集中でも求めを立てる —— `wantFieldFocused` は無条件、`frame-loop.ts:2925`〜`:2932`） |
| `fieldEditBegan` | → `editingField`（`AG-9` ・ `IN-5a` ・ `IF-9`） | → `editingField`（求めた欄なら焦点が入った。別の欄なら人が焦点を動かした —— `IN-5b`「人が焦点を動かしたことは、求めの取り下げに数える」。どちらも求めは終わる） | → 自己（`fieldRow` を書き換える —— 編集する欄が替わった。同じ行なら同じ参照） |
| `fieldEditEnded` | — | — | → `idle` [`isEditedField`]（`SK-19` ・ `IN-4` ・ `IN-6` ・ `IF-9`）<br>それ以外 → — |
| `fieldFocusWithdrawn` | — | → `idle`（`IN-5a` ・ `IN-5b`） | —（決定 10） |

この機械を動かさない出来事: `choiceMoved`（⚠️ 今日のシェルは選択の変化で**求め**を消す —— `DFC-694` の ①。波 B の呼び手が `fieldFocusWithdrawn` で写す）。
⭐ 升の数は状態の数 × 出来事の数で決まり、**欄の数では決まらない**（裁定の条件）。
⭐ 順の独立: 欄 A から欄 B へ焦点が移るとき、宿主は `focusout`(A) → `focusin`(B) の順に出す。`fieldEditEnded{A}` → `fieldEditBegan{B}` なら `editingField{A}` → `idle` → `editingField{B}`。逆に届いても `editingField{B}` の上の `fieldEditEnded{A}` は `isEditedField` が偽で —。どちらの順でも `editingField{B}` に着く。

### 2.4 `createdTaskNamingStateMachine` と根

変えない（原稿 `:4044` 以降の升 3 と根の升 1）。`FR-091` の場面は編集の機械と直交のまま。

### 2.5 改名の波及（波 A で当てる体が全数を当てる）

| 所 | いま | 後 |
|---|---|---|
| 原稿 `docs/spec/_source/state-machines.json` | 機械 `fieldFocusWantStateMachine`（`:4254`）、出来事 `fieldFocusLanded`（`:4137`、升 `:4338`） | 付録 D の領域に置き換える。⛔ ほかの 5 領域は 1 字も変えない |
| 生成物 `docs/spec/_assets/tbl-state-machines.md:715`〜`:797` | 表 T-292 ・ 図 F-038（機械 2・状態 4） | `npm run gen` で刷り直す（付録 C の形） |
| `src/use-case/advance-screen-session/field-entry-values.ts` | 型 `FieldFocusWantState`（`:58`〜`:60`）、欄 `fieldFocusWantState`（`:64` ・ `:90` ・ `:201` ・ `:204`〜`:205` ・ `:234` ・ `:245`〜`:247` ・ `:255`）、生成区画のキー（`:51`〜`:52`）と出来事の型（`:69`〜`:74`）、`FieldEntryFieldRow` の 5 行の和（`:10`）、振り分け（`:258`〜`:266`） | `FieldEditState` ・ `fieldEditState`。生成区画は刷り直す（定数名 `FIELD_ENTRY_VALUES_INITIAL_AXES` ・ `FIELD_ENTRY_VALUES_TRANSITIONS` は変わらない）。運ぶ値の型は `string`（決定 6）。ハンドラ: `onFieldEditBegan` ・ `onFieldEditEnded` を足し、`onFieldFocusAsked` に `isEditedField` の枝を足す。⚠️ **`wantEnded`（`:244`〜`:248`）は「`idle` でなければ `idle` へ」なので、そのまま `fieldFocusWithdrawn` に使うと編集中まで消す** —— 「`fieldFocusWanted` のときだけ」に狭めること |
| `src/use-case/advance-screen-session/advance-screen-session.ts:125`〜`:129` | `IS_FIELD_ENTRY_EVENT` に `fieldFocusLanded` | 退けて `fieldEditBegan` ・ `fieldEditEnded` を足す（型が漏れを止める） |
| `tests/unit/uf-121-the-field-entry-transition-table-is-printed-from-the-manuscript.test.ts:128`〜`:130` | `fieldFocusAsked` の行に「それ以外」が無いと確かめる | ⚠️ **赤くなる** —— `editingField` の升に `isEditedField` の「それ以外 → —」が入る。ガードの無い行（`fieldEditBegan`）に替える |
| `tests/contract/state-machine-field-entry.contract.test.ts` | 標本 `FIELD_ROWS` 5 つ（`:85`）、`fieldFocusLanded` の標本（`:102`）、書き換えの推定（`:151`〜`:158`） | **仕様だけを読む別の体が書き直す**（`RA-6`）。`fieldOf()`（`:55`）は `fieldEditStateMachine` → `fieldEditState` をそのまま導く |
| 仕様 `docs/spec/05-07-design.md` の `IF-9`（`:565`） | 真偽を答える | 第 3 節 |
| 仕様 `docs/spec/01-04-requirements.md` の `IN-5a`（`:6807`） | 「表 T-065 の `IF-9` はこの状態を真偽 1 つで答え」 | 第 3 節 |
| 変えないもの | `CP-39` ・ `UT-11` ・ `PI-39` ・ `SU-3` ・ 表 T-075 の `UF-121` ・ 5.5 の散文 ・ 図 F-028 ・ `SS-6`（どれも表と領域の名だけを書く）、`docs/development-rules/03-implementation.md:47`〜`:48`、`.claude/skills/spec-graph-check/check-provenance.py:55`、`tests/contract/units.contract.test.ts` の数 | —— |
| 記録（当てる体は書き換えない） | `CR-480` ・ `CR-490` の本文、`defects.md:230` の `DFC-694` の本文 | 変更要求は当てた時の文のまま残す（`CR-480:4` の注と同じ）。`DFC-694` への追記は台帳の体（第 8 節） |

---

## 3. 表 T-065 の `IF-9` と `IN-5a` の文の変更

### 3.1 `IF-9`（`docs/spec/05-07-design.md:565`、最後の欄の本文）

**① 答えることの並びの中**

- いま: 「…編集できる欄で確定した値を、その欄が名乗る行 ID とともに返し（…）、**まだ確定していない文字入力があるかを答え**、画面上の点が…」
- 案: 「…編集できる欄で確定した値を、その欄が名乗る行 ID とともに返し（…）、**文字入力を受ける欄で編集が始まったことと終わったことを、その欄が名乗る行 ID とともに知らせ**（⭐ 行 ID は確定した値と同じ名乗りとする。<br>透かし解除の面の答えの欄は 表 T-103 の `U-60` を名乗る。<br>）、画面上の点が…」

**② ⭐ の文**

- いま: 「⭐ 確定していない文字入力の有無は真偽 1 つとし、どの欄が保持しているかを返してはならない（MUST NOT）—— これを問う 3 つの規則（`IN-4` の第 1 階層・`IN-5a`・表 T-035 の `AG-9` を受ける `WS-2`）は、どれも「入力中か」しか読まない。」
- 案: 「⭐ 知らせが運ぶのは欄の行 ID だけとし、確定していない中身（打ちかけの文字）を返してはならない（MUST NOT）—— 中身を返すのは確定した値だけである。<br>⭐ 始まりと終わりは 表 T-292 の `fieldEditStateMachine` が状態 `editingField` として持つ —— 「入力中か」を読む 3 つの規則（`IN-4` の第 2 階層・`IN-5a`・表 T-035 の `AG-9` を受ける `WS-2`）は、この状態を読み、宿主に問わない。<br>⛔ 読む側は、状態を読む前に届いている知らせをすべて状態機械へ渡すこと（MUST）—— 焦点はブラウザが動かすので、渡し残すと状態が古い。<br>⚠️ 終わりは、確定・取り消し・欄が画面から消えたことのどれでも 1 つの知らせとする —— 確定した値は上の答えが別に運ぶ。」
- ⚠️ 「第 1 階層」を「第 2 階層」に改めた —— `IN-4` の並びは「出ている通知 → 確定していないその場の編集 → …」（req:6804）で、編集は第 2 階層である（`CR-480` の 2.2 の 1 も「第 2 階層」と書く —— `CR-480:126`）。書き換える文の中の食い違いなので、台帳の行は立てない。

**③ 対話欄の ⚠️ の文**

- いま: 「⚠️ 対話欄（`U-44`）の打ちかけはこの真偽に数えない —— `IN-5a` は対話欄をキーの行き先で判じるので、この真偽を要しない。<br>数えると、`WS-2` の拒否が対話欄まで広がる。」
- 案: 「⚠️ 対話欄（`U-44`）は編集の始まりも終わりも知らせない —— `IN-5a` は対話欄をキーの行き先で判じるので、この状態を要しない。<br>数えると、`WS-2` の拒否が対話欄まで広がる。」

**④ ⛔ の文と末尾**

- いま: 「⛔ **欄を名指すと、読む側がそれを使い始めて継ぎ目が太る。<br>**⚠️ 状態の呼び名は `IN-5a` が自ら `AG-9` と同じであると書いており、答える場所も 1 つでよい」
- 案: 「⛔ **行 ID を読むのは 表 T-292 の升（ガードと運ぶ値の書き換え）だけとし、上の 3 つの規則は `editingField` に居るかしか読まない（MUST）—— 欄を名指す値を読む側が使い始めると、継ぎ目が太る。<br>**⚠️ 欄に焦点を置く求め（`fieldFocusWanted` —— `IN-5a` の後の段）は「入力中」ではない —— `WS-2` はこれを読まない。<br>⚠️ 状態の呼び名は `IN-5a` が自ら `AG-9` と同じであると書いており、持つ場所も 1 つ（`editingField`）でよい」

⭐ `JDG-68` の芯（打ちかけの**中身**を返さない —— `DFC-571` への答え、`rulings.md:152`）は ② の 1 文目がそのまま持つ。変えるのは「真偽 1 つで答える」と「どの欄かを返さない」の 2 つで、これは `JDG-290`（本書の裁定）が変える。
⛔ 仕様に変更要求と裁定の番号を書かない（検査 7）。「部品」を使わない。

### 3.2 `IN-5a`（`docs/spec/01-04-requirements.md:6807`）の 1 文

- いま: 「⚠️ 状態に数えないのは、`AG-9` の書き込みの拒否を広げないためである —— 表 T-065 の `IF-9` はこの状態を真偽 1 つで答え、`WS-2` もそれを読むので、数えると拒否が対話欄まで広がる。」
- 案: 「⚠️ 状態に数えないのは、`AG-9` の書き込みの拒否を広げないためである —— 表 T-065 の `IF-9` がこの状態の始まりと終わりを知らせ、`WS-2` もその状態を読むので、数えると拒否が対話欄まで広がる。」
- `impact.py IF-9` が `IF-9` を指す要求として `FR-040`（この行の塊、`01-04-requirements.md:6807`）を挙げる —— 直すのはこの 1 文だけ（2026-09-21）。

---

## 4. 真偽の答えに代わって `editingField` を読むもの（波 B）

| 読み手 | いま（`f626ae16`） | 後 | 要求 |
|---|---|---|---|
| 書き込みの時機 `WS-2` | `editingInPlace: !isSettlingFieldCommit && hasUnsettledTextEntry()`（`frame-loop.ts:3069`） | `editingInPlace` ＝ 知らせを渡し切った後の `fieldEditState.kind === 'editingField'`。自分の確定の書き込みは、書き込みの時機を引数で渡して通す（`CR-480` の決定 5 のまま —— 焦点が欄 B へ移った後に欄 A の確定を書くとき、状態は `editingField{B}` なので、除外は要る） | `AG-9` ・ `WS-2` |
| `Agent API` の写し | `isEditingInPlace: hasUnsettledTextEntry()`（`:2774` → `agent-api-members.ts:325`） | 同上 | `AG-9` |
| 入力の翻訳係 | `isTextEntryUnsettled`（`:3041`）・`isTextFieldFocusWanted`（`:3042`）→ `input-command-translator.ts:1460` ほか | 1 つの機械の 2 つの非初期状態から詰める: `isTextEntryUnsettled` ＝ `editingField`、`isTextFieldFocusWanted` ＝ `fieldFocusWanted`。名と型（真偽）は保つ（段 5 への申し送り）。⚠️ 翻訳係の TRAP（`:155`「this state is not AG-9's」）は保たれる —— `fieldFocusWanted` は `WS-2` に届かない | `IN-5a` |
| `Esc` の段 `textEntry` | `escapeTarget` が `isTextEntryUnsettled` を読む（`screen-state.ts:130`） | 呼び手が `editingField` から `screen/escapePressed{rung: textEntry}` を詰める | `IN-4` の第 2 階層 |
| `SK-19` の段 | `if (didSettleFieldEntry \|\| hasUnsettledTextEntry()) return`（`:3901`） | 画面の値の `settleKeyPressed.hasNoUnsettledEntry` ＝ この入力で確定を読まず（`didSettleFieldEntry` —— 入力ごとのフレームの値のまま、`CR-480` の決定 5）、かつ `editingField` に居ない | `SK-19` |

⇒ **真偽を残す読み手は 0。** `IME` の変換中は真偽に入っていない（1 節）。面の中の判定（`isComposing`、`heldTextControl` ほか 16 の覚え —— `CR-480` の 2 節の 9〜21）は面に残り、段 6 の持ち場である。
⭐ `frameLoop` の `hasUnsettledTextEntry()`（`:2909`〜`:2911`）と面の宣言 `hasUnsettledTextEntry(): boolean`（`screen-surface.ts:59`）は波 B で消える。

---

## 5. `CR-490` の 11.4 の 6 つの使い方を新しい表で歩く

略記: 編集 ＝ `fieldEditStateMachine`、パネル ＝ `propertiesPanelContentStateMachine`、名付け ＝ `createdTaskNamingStateMachine`、選択 ＝ `selectionStateMachine`。

| 使い方（`CR-490` の行） | 歩 | 編集の遷移 | 隙間 |
|---|---|---|---|
| **UC-1** タスクを押す（`:317`〜`:325`） | 押す → 選ぶ → パネル | 動かない | 編集の隙間は無い（`CR-490` の第 8 節の候補 3 は選択とパネルの話で本書の外） |
| **UC-2** 名称をダブルクリックして編集（`:327`〜`:339`） | ① 2 度目の押し | `fieldFocusAsked{PR-1}`: `idle → fieldFocusWanted{PR-1}` | —— |
| | ② 描いて焦点を置く | 面の `focusin` → `fieldEditBegan{PR-1}`: `→ editingField{PR-1}` | —— |
| | ③ 打つ（`IME` を含む） | `editingField{PR-1}` のまま。**`CR-490` の「⚠️ どの機械も持たない」（`:334`）は閉じる** | —— |
| | ④a `Enter` | 面が確定（`readFieldCommit` に `PR-1` の値）し、焦点を外す → `fieldEditEnded{PR-1}`: `→ idle`。同じ `Enter` はパネルを閉じない（`didSettleFieldEntry`） | —— |
| | ④b `Esc` | 1 度目: 段 `textEntry`（`editingField` から詰める）、面が値を戻す。離したとき面が手放す → `fieldEditEnded{PR-1}`: `→ idle` | —— |
| | ④c よそを押す | `IN-6`: 面が確定 → `fieldEditEnded{PR-1}`。押した先が別の文字入力の欄なら `fieldEditBegan{PR-16}` → `editingField{PR-16}`（運ぶ値の書き換え） | `PND-352`（同じパネルの別の欄を押したとき焦点を外すか）は面の中の未裁定のまま —— **機械はどちらでも同じ升を通る** |
| **UC-3** 構えて作る → 名前付け → `Enter`（`:341`〜`:349`） | 作る | `creationLanded`: 名付け `→ namingCreatedTask`、編集 `→ fieldFocusWanted{PR-1}` → `fieldEditBegan{PR-1}` → `editingField{PR-1}` | —— |
| | `Enter` | 面が確定 → `fieldEditEnded{PR-1}` → `idle`。画面 `createdNameSettled`: パネル `→ hidden` ／ `clearSelection` → `choiceMoved` → 名付け `idle` | ⚠️ 今日の枝は**どの欄を確定したかを見ない** —— 第 8 節の `DFC-701`。`DFC-694` |
| **UC-4** 複数を選んで編集（`:351`〜`:359`） | パネルに出た 1 つの欄を編集 | UC-2 と同じ（`editingField{PR-x}`） | 「複数の対象で何を出し何を編集させるか」は仕様の空白のまま（`CR-490:359`）。**状態は増えない**（裁定の条件どおり） |
| **UC-5** 行名・文書名・付箋（`:361`〜`:368`） | 行名 | `fieldFocusAsked{AT-53}` → `fieldEditBegan{AT-53}` → `editingField{AT-53}` | —— |
| | 文書名（`F2` か名の押し） | `fieldFocusAsked{U-27}` → 面が欄を開き焦点を置く（`dom-screen-surface.ts:2888`〜`:2906`）→ `fieldEditBegan{U-27}` → `editingField{U-27}`。パネルと選択は動かない。編集中の `F2` は `isEditedField` で — | —— |
| | 付箋の本文 | `fieldFocusAsked{PR-21}` → … → `editingField{PR-21}` | —— |
| **UC-6** 通知・問い・打ちかけ（`:370`〜`:378`） | 通知が出ている | 面が `Enter` ・ `Esc` を先に通知へ渡す（`isPressTakenByStandingNotice`、`:2752`〜`:2755`）ので終わりを知らせない ⇒ `editingField` のまま（正しい —— 編集は続いている） | —— |
| | 打ちかけのあいだの `Agent API` | `WS-2` が `editingField` を読んで拒む（4 節） | —— |
| | 打ちかけのあいだの `Ctrl` ＋ `Z` | 翻訳係は `editingField` で同じ判じ方（`input-command-translator.ts:1491`） | 仕様の空白のまま（`CR-490:378` の `PND-` 候補）—— 機械の隙間ではない |

**⇒ 11.5 の隙間「いまどの欄を編集しているか」（`CR-490:339` ・ `:380`〜`:397`）は閉じる。**
残るもの（どれも機械の升の隙間ではない）:
1. 仕様の空白 2 つ（UC-4 の複数選択、UC-6 の `Ctrl` ＋ `Z`）—— `CR-490` の 11.6 がすでに `PND-` の候補に数えた。
2. ⚠️ **未検証**: 確定も取り消しも通らずに編集中の欄が消える道（第 8 節の `DFC-702`）。

---

## 6. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A** | `CR-490` の波 A が `refactor` に入っていること（本書は `f626ae16` を読んだ）。段 5 ・ 段 6 と並行してよい | 仕様: `IF-9`（des:565、3.1）・`IN-5a` の 1 文（req:6807、3.2）。原稿 `state-machines.json` の `fieldEntry`（付録 D）と生成物（表 T-292 ・ 図 F-038、`npm run gen`）。`field-entry-values.ts` ・ `advance-screen-session.ts` の改名と升（2.5）。`uf-121` の 1 か所。契約試験 `state-machine-field-entry.contract.test.ts` の書き直し（**仕様だけを読む別の体** ——`RA-6`。継ぎ目は 6.1 を両方のブリーフに同じ字面で）。`rulings.md` に `JDG-290`。台帳の体に `DFC-701` ・ `DFC-702` ・ `DFC-694` の追記 | 18 ・ 19 ・ 21 ・ 26b ・ 27 ・ 30 ・ 33 ・ 59 ・ 60 ・ 61 ・ 62 ＋ vitest（`CR-480` の 3 節と同じ組 —— `CR-480:137`）。⚠️ 検査 11 ・ 12 ・ 33 は `FAIL` の行を出さずに赤くなる —— 出力の全体を当てる前の走りと比べる |
| **B** | 段 5 ・ 段 6 が済み、`CR-436` の波 B2 と `CR-480` の波 B が当たっている（根がシェルに結線されている） | **面（段 6 の持ち場 `dom-screen-surface.ts`）**: 文字入力の欄の `focusin` ・ `focusout`（パネル `:2771`〜`:2782`、文書名 `:2888`〜`:2906` ・ `:2958`、透かし解除 `:3012`〜`:3020`、面が欄を落とす所 `:2631`）で知らせを溜め、1 度読むと消える形で返す（`readFieldCommit` と同じ形 —— `screen-surface.ts:51`〜`:53`）。`hasUnsettledTextEntry` を宣言（`screen-surface.ts:59`）と実装（`:3060`）から消す。**シェル**: 入力ごと・フレームごと・書き込みの時機ごとに、先に知らせを読み切って `fieldEditBegan` ・ `fieldEditEnded` を作る。4 節の読み手を状態へ替える。`CR-480` の波 B の `fieldFocusLanded` の送り先を `fieldEditBegan`（面の知らせ）に替え、「欄が描かれていない」「継ぎ目が無い」の答えは `fieldFocusWithdrawn` として送る（`DFC-694` の ② ③、今日の写し）。`DFC-701` の今日の振る舞いを写し、`it.fails` で釘を打つ（`JDG-57`） | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部（名前・文書名・透かし解除の入力、`Enter` ・ `Esc` ・ 欄の外の押し、`Agent API` の拒否）、`LM-19`（⛔ **利用者を呼んでから**） |
| **C**（B の直後の別のコミット） | 波 B で今日との一致を確かめた後（`JDG-57`） | 台帳で直すと決まったもの（`DFC-701` ・ `DFC-702` ・ `DFC-694`） | 同上 |

⭐ **波 A は段 5 ・ 段 6 と並行してよい** —— 触るのは `docs/spec/`、`src/use-case/advance-screen-session/`、試験、記録だけで、`src/adapter/input-command-translator/`（段 5）と `src/framework/dom-screen-surface/`（段 6）に触らない。⚠️ 波 A の後、波 B までのあいだ、仕様（`IF-9` の知らせ）とコード（真偽の答え）は食い違う —— 仕様が先に着地しコードが実装の波で追う形（`JDG-175` の「適用済 —— 仕様へ着地した。コードと試験は実装の波」と同じ）。
⭐ 性能: 知らせは焦点の出入りのときだけ溜まり（押下・キーの後）、ポインタの移動では溜まらない。読み切りは溜まった数だけの仕事。⛔ 測るのは波 B、測る前に利用者を呼ぶ。

### 6.1 継ぎ目（体に渡すときは両方のブリーフに同じ字面で書く）

- 領域のキー `fieldEntry`、型の幹 `FieldEntryValues`、ファイル `field-entry-values.ts`、公開は `emptyFieldEntryValues` ・ `stepFieldEntryValues` と生成した型・定数。
- 機械 `createdTaskNamingStateMachine`（今の状態 `createdTaskNamingState`）: 変えない。
- 機械 `fieldEditStateMachine`（今の状態 `fieldEditState`、型 `FieldEditState`）: `idle` ・ `fieldFocusWanted`（運ぶ値 `fieldRow`）・ `editingField`（運ぶ値 `fieldRow`）。`fieldRow` の型は `string`。
- 出来事（6）: `fieldEntry/fieldFocusAsked`（`fieldRow`）・ `creationLanded`（`created`）・ `fieldFocusWithdrawn` ・ `fieldEditBegan`（`fieldRow`）・ `fieldEditEnded`（`fieldRow`）・ `choiceMoved`。**`fieldFocusLanded` は無い。**
- ガード（2）: `isCreatedTask` ・ `isEditedField`（出来事の `fieldRow` が今の状態の `fieldRow` と同じ）。副作用（1）: `bringCreatedRowIntoSight`。
- 運ぶ値を同じ値で書き換える升は同じ参照を返す（`CR-480` の改訂の記録 5）。

---

## 7. 問いの候補に打った 3 つの反証（`handoff.md` §0.2）

方法: (1) `docs/development-records/rulings.md`（`f626ae16`、535 行）を grep —— 「焦点」1 件（`JDG-175`）、「入力中」0、「打ちかけ」1（`JDG-68`）、`IN-5a` ・ `IN-5b` 各 1（`JDG-175`）、`AG-9` ・ `WS-2` ・ `IN-6` ・ `PND-352` ・ `U-27` ・「文書名の欄」0。(2) `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <行>`（2026-09-21）: `IF-9` 要求 1 ／ 参照 2、`AG-9` 1 ／ 12、`WS-2` 2 ／ 10、`IN-4` 9 ／ 38、`IN-5a` 2 ／ 7、`IN-5b` 0 ／ 5、`IN-6` 1 ／ 2、`SK-19` 5 ／ 11、`FR-091` 指される要求 4 ／ 参照 16、`FR-072` 6 ／ 17、`SF-5` 0 ／ 1。(3) 導けるか。

| 候補 | (1) | (2) | (3) 導けるか | 結果 |
|---|---|---|---|---|
| `IF-9` の MUST NOT（どの欄かを返さない）を改めてよいか | `JDG-68` は `DFC-571`（対話欄の中身）への答え | `IF-9` 1 ／ 2 | **導けた** —— `CR-490` の 11.5 が「どの案も `IF-9` の改訂を先に要する」と利用者に示し（`:396`〜`:397`、11.7 の 4 —— `:418`）、利用者が C を選んだ（`JDG-290`）。後の裁定を優先する読み（`JDG-113`） | 決定 9、3.1 |
| 真偽の答えを残して併走させるか | 同上 | `WS-2` 2 ／ 10 | **導けた（退ける）** —— 同じ事実の答え場所を 2 つ持たない（`IF-9` 末尾「答える場所も 1 つでよい」）。`IME` は真偽に入っていない（`dom-screen-surface.ts:3060`〜`:3062`） | 決定 9 |
| 終わりを確定と取り消しに分けるか | 0 件 | `SK-19` 5 ／ 11、`IN-4` 9 ／ 38 | **導けた（分けない）** —— 升が同じ、確定の値は `readFieldCommit` が運ぶ。前例 `CR-480` の決定 7 | 決定 4 |
| `fieldFocusLanded` を残すか | `JDG-175`（確かめて置き直す） | `IN-5b` 0 ／ 5 | **導けた（退ける）** —— 1 つの `focusin` に 2 つのキー。確かめの答えは `fieldEditBegan` が運ぶので `JDG-175` の中身は保たれる | 決定 3 |
| パネルが隠れたとき編集を確定するか取り消すか | 0 件 | `FR-072` 6 ／ 17 | **導けた（確定が先に済む）** —— `SK-19` ・ `IN-4` ・ `IN-6` の順（決定 8）。残る道は未検証 ⇒ 台帳 `DFC-702`（`JDG-78` —— 設計しない） | 決定 8、第 8 節 |
| 運ぶ値を「対象 × 行」にするか | 0 件 | `FR-091` 4 ／ 16 | **導けた（行だけ）** —— 裁定の逐語「編集する対象は任意に変わる」。混ざらない理由は 2.1 | 決定 2 |
| 透かし解除の欄を数えるか、何を名乗るか | 0 件 | `IF-9` 1 ／ 2 | **導けた** —— 今日数えている（`:3061`）ので写す（`JDG-57`）。名乗りは面の行 `U-60`（`IF-9` の `U-27` の前例） | 決定 7 |
| 編集中の `fieldFocusWithdrawn` を升にするか | `JDG-175` | `IN-5a` 2 ／ 7 | **導けた（しない）** —— 取り下げは求めの話（req:6807 末尾） | 決定 10 |
| 機械の名・領域の名 | 0 件 | —— | **導けた** —— 裁定の語と `CR-490:393` の案の字面、R4.4 | 決定 1 |
| `fieldRow` の型を和のまま保つか | 0 件 | —— | **導けた（広げる）** —— 裁定「欄を足しても足すのは値」 | 決定 6 |

⇒ **3 つとも空だった候補は 0 件。問いは無い。**
⚠️ 利用者に**知らせる**価値があるのは 1 つ: `JDG-68` の読みのうち「真偽 1 つで答える」の部分を、本書が `JDG-290` で置き換えること（決定 9）。中身を返さない部分は残る。

---

## 8. 台帳の候補（⛔ 問いではない。どちらが正かを選ばない）

2026-09-13 の利用者の裁定（仕様とコードの食い違いは、どちらが正かを選ばずに台帳へ）に従い、台帳の体へ渡す。波 A が `DFC-701` ・ `DFC-702` として書いた（起草時の上端: `f626ae16` で `DFC-700`、根の作業木で `DFC-694`）。

| 仮の名 | 食い違い | 片側 | もう片側 | 台帳の今 |
|---|---|---|---|---|
| **`DFC-701`** | ⚠️ **未検証（押していない。コードを読んだだけ）** —— 作った直後の名前付けの場面では、`Enter` を押すと**どの欄を確定したか（あるいは何も確定していないか）を見ずに**パネルを閉じて選択を解く。例: 作った直後に担当（`PR-16`）へ焦点を移して `Enter`、または `Esc` で名前の編集を取り消した後の `Enter` | `FR-091`（req:1349）「作った直後の名称を `Enter` で確定したときは、同じ 1 回の押下でプロパティパネルを閉じ、その選択を解くこと（MUST）」、`SK-19`（req:4166）の段の順 | `frame-loop.ts:3895`〜`:3899`（`namingCreatedTaskUid !== null` だけを見る。`:3901` の「確定していない編集」の判じより先） | 0 件（`defects.md` を `FR-091` ・ `namingCreatedTask` で引いた。`DFC-445` ・ `DFC-491` は `FR-001` の散文の形で別）。⭐ 本書の後は `editingField{PR-1}` と `fieldEditEnded{PR-1}` から判じられるようになる —— 直すかは波 C |
| **`DFC-702`** | ⚠️ **未検証** —— 確定（`IN-6` ・ `SK-19`）も取り消し（`IN-4`）も通らずに、焦点を持つ文字入力の欄がパネルごと隠れる・取り除かれる道があるか。あれば、宿主が `focusout` ・ `change` を出すかはブラウザ次第で、出なければ打ちかけが黙って消え、面の `heldTextControl` が残って「入力中」が解けない（`IN-6` が書く失敗の形 —— `WS-2` が拒み続ける） | `IN-6`（req:6809）、`IN-4`（req:6804）の「取り消したときは、編集を始める前の値へ戻す」 | パネルを描かない枝（`dom-screen-surface.ts:2601`〜`:2614` は `view.propertiesPanel !== null` のときだけ）。欄を保持しているあいだは描き直さない（`:2604`）。面が落とした欄（`:2631`） | 0 件。`DFC-545`（面の「入力中」が旗に頼る —— `defects.md:119`）と同じ持ち場（段 6）。⛔ 異常系は設計しない（`JDG-78`、`rulings.md:165`）—— リファクタの後 |

**`DFC-694`**（`defects.md:230`、焦点の求めを `IN-5a` の 4 事由に無い 3 つの場合にも消す）の扱い —— **明示のまま残す。本書は直さない**:
- 機械は取り下げを 1 つの出来事 `fieldFocusWithdrawn` のまま持ち、`fieldFocusWanted` だけを `idle` へ動かす。事由を選ぶのは呼び手（`CR-480` の決定 7・10）。
- ① 選択が変わった: 升に入れない（`choiceMoved` は `fieldEditStateMachine` を動かさない）。波 B の呼び手が `fieldFocusWithdrawn` を送って写す。
- ② 宿主が「欄が描かれていない」と真を返した: `CR-480` では `fieldFocusLanded` と同じ升に落ちていた。**本書で `fieldFocusLanded` を退けるので、波 B の呼び手はこれを `fieldFocusWithdrawn` として明示して送る**（`fieldEditBegan` は来ない —— 焦点が入っていないので）。
- ③ 焦点の継ぎ目が無い: ② と同じく `fieldFocusWithdrawn`。
- ⭐ 新しく読めること: 求めのあいだに人が焦点を別の欄へ動かすと、`fieldEditBegan{別の欄}` が `fieldFocusWanted → editingField` と運ぶ —— `IN-5b` の「人が焦点を動かしたことは、求めの取り下げに数える」が升になった。
- 台帳の体への依頼: `DFC-694` の本文の「`fieldFocusWantStateMachine`」「`fieldFocusLanded`」を読んだ者が迷わないよう、本書の後の名（`fieldEditStateMachine`、② ③ は `fieldFocusWithdrawn`）を 1 文追記する。

⚠️ 既に在る関係の行（本書は直さない）: `DFC-654`（再試行が尽きても求めが残る —— `defects.md:192`）、`DFC-651`（`:189`、状態が古い疑い —— `CR-480:240`）、`DFC-545`（`:119`）、`PND-352`（`pending-decisions.md:246`）、`PND-349`（`:243`）。

---

## 9. 数の予測

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行。
**起草時（`f626ae16` の展開、2026-09-21）: `tables=181  figures=25  rows=2227  uids=162`。**
⭐ 本書の差だけを突き合わせる（「前」は並行する変更で動く）。

| | 波 A | 波 B | 内訳 |
|---|--:|--:|---|
| tables | 0 | 0 | 表 T-292 を刷り直すだけ |
| figures | 0 | 0 | 図 F-038 を刷り直すだけ |
| rows | 0 | 0 | 行 ID を足さない・消さない（`IF-9` ・ `IN-5a` は本文だけ） |
| uids | 0 | 0 | 要求を足さない |

**そのほかの数**: 原稿は 6 領域 ・ 機械 21 ・ 状態 59 → 60 ・ 出来事 73 → 74 ・ 升 145 → 150 ・ 根の升 10（`e-try-gen.py` で測った）。表 T-075 は変わらない（`UF-121` を書き換えるだけ）。`units.contract.test.ts` と `changelog.md` の版 0.29 の「`AdvanceScreenSession`（n）」（`CR-480` が「（6）」→「（7）」とした —— `CR-480:162`）は、ユニットの数が変わらないので動かない。`frameLoop` の `let` は波 B で本書の分 0（`hasUnsettledTextEntry` は関数で `let` ではない）。

---

## 10. ⛔ この変更でやらないこと

- ⛔ 波 A で `src/adapter` ・ `src/framework` に触らない（`screen-surface.ts` の宣言も波 B —— 実装する `dom-screen-surface.ts` が段 6 の持ち場なので宣言だけ先に変えると型が割れる）
- ⛔ 欄ごとに状態を立てない（裁定の条件）
- ⛔ 画面の値・通知・身振り・ファイル操作と問い・選択の原稿を変えない。`{in: …}` で領域をまたがない
- ⛔ 打ちかけの**中身**・`IME` の変換中・DOM の焦点の覚えを原稿に入れない
- ⛔ 新しい異常系・準正常系の扱いを設計しない（`JDG-78`）—— `DFC-702` も決めない
- ⛔ `DFC-701` ・ `DFC-694` を移す波で直さない（`JDG-57`）
- ⛔ 基準線を体に触らせない

---

## 付録 —— 第 5 領域「名前付けと入力欄」の原稿（広げた形）

**略記**: `req` ＝ `docs/spec/01-04-requirements.md`、`des` ＝ `docs/spec/05-07-design.md`。行番号は `f626ae16`。
根拠の行: `FR-091` req:1347、`FR-072` :1873、`FR-035` :2452、`MK-13` :3311、`SK-19` :4166、`SK-9` :4174、`AG-9` :6071、`IN-4` :6804、`IN-5a` :6807、`IN-5b` :6808、`IN-6` :6809 ／ `IF-9` des:565、`WS-2` des:660、`SF-5` des:1015 ／ `U-60` `docs/spec/_assets/tbl-glossary.md:142`。

### C. 刷った形（`e-try-gen.py` が生成器の `build()` で刷った `fieldEditStateMachine` の節の表 —— スクラッチの `e-trial-out.md`）

| 出来事 | `idle` | `fieldFocusWanted` | `editingField` |
| --- | --- | --- | --- |
| `fieldEntry/fieldFocusAsked` | → `fieldFocusWanted` | → 自己（`fieldRow` を書き換える） | → `fieldFocusWanted` [not `isEditedField`]（求めた欄が編集中の欄なら求めは既に満ちている）<br>それ以外 → — |
| `fieldEntry/creationLanded` | → `fieldFocusWanted`（`fieldRow` はタスクなら `PR-1`、行なら `AT-53`） | → 自己（`fieldRow` を書き換える） | → `fieldFocusWanted`（`fieldRow` はタスクなら `PR-1`、行なら `AT-53`） |
| `fieldEntry/fieldEditBegan` | → `editingField` | → `editingField`（求めた欄なら焦点が入った。別の欄なら人が焦点を動かした —— どちらも求めは終わる） | → 自己（`fieldRow` を書き換える（編集する欄が替わった）） |
| `fieldEntry/fieldEditEnded` | — | — | → `idle` [`isEditedField`]<br>それ以外 → — |
| `fieldEntry/fieldFocusWithdrawn` | — | → `idle` | — |

図（mermaid）の矢印: `idle → fieldFocusWanted`（`fieldFocusAsked`, `creationLanded`）、`fieldFocusWanted → fieldFocusWanted`（同）、`editingField → fieldFocusWanted`（同）、`idle → editingField` ・ `fieldFocusWanted → editingField` ・ `editingField → editingField`（`fieldEditBegan`）、`editingField → idle`（`fieldEditEnded`）、`fieldFocusWanted → idle`（`fieldFocusWithdrawn`）。

### D. 原稿の JSON の差（`regions` の `fieldEntry` の中。スクラッチの `e-field-edit-region.json` が全体）

出来事: `fieldFocusLanded` を消し、`fieldFocusWithdrawn` の後に次の 2 つを足す。`fieldFocusAsked` ・ `creationLanded` ・ `fieldFocusWithdrawn` ・ `choiceMoved` の定義は変えない。

```json
{"key": "fieldEditBegan", "source": {"kind": "input", "rows": ["IF-9", "IN-5b", "AG-9"], "note": {"ja": "宿主が知らせる: 文字入力の欄で編集が始まった（焦点が入った）。人の押下・キーで入っても、求めた焦点が入っても同じ"}}, "carries": [{"name": "fieldRow", "rows": ["IF-9", "PR-1", "AT-53", "PR-16", "PR-21", "U-27", "U-60"], "note": {"ja": "編集が始まった欄が名乗る行 ID"}}]},
{"key": "fieldEditEnded", "source": {"kind": "input", "rows": ["IF-9", "SK-19", "IN-4", "IN-6"], "note": {"ja": "宿主が知らせる: その欄の編集が終わった（確定・取り消し・欄が消えた —— どれでも）"}}, "carries": [{"name": "fieldRow", "rows": ["IF-9", "PR-1", "AT-53", "PR-16", "PR-21", "U-27", "U-60"], "note": {"ja": "編集が終わった欄が名乗る行 ID"}}]}
```

機械 `fieldFocusWantStateMachine` を次に置き換える（`createdTaskNamingStateMachine` と根は変えない）。

```json
{
 "name": "fieldEditStateMachine",
 "states": [
  {"key": "idle", "parent": null, "initial": true, "carries": [], "evidence": ["IN-5a", "IN-5b", "AG-9"]},
  {"key": "fieldFocusWanted", "parent": null, "initial": false, "carries": [{"name": "fieldRow", "rows": ["PR-1", "AT-53", "PR-16", "PR-21", "U-27"]}], "evidence": ["IN-5a", "IN-5b", "MK-13", "HF-14", "FR-091", "FR-035"]},
  {"key": "editingField", "parent": null, "initial": false, "carries": [{"name": "fieldRow", "rows": ["IF-9", "PR-1", "AT-53", "PR-16", "PR-21", "U-27", "U-60"]}], "evidence": ["AG-9", "IN-5a", "IN-4", "IN-6", "SK-19", "IF-9"]}
 ],
 "transitions": {
  "fieldFocusAsked": {
   "idle": {"to": "fieldFocusWanted", "evidence": ["MK-13", "FR-035", "IN-5b"]},
   "fieldFocusWanted": {"to": "fieldFocusWanted", "evidence": ["MK-13", "FR-035", "IN-5b"], "note": {"ja": "`fieldRow` を書き換える"}},
   "editingField": {"to": "fieldFocusWanted", "guard": [{"name": "isEditedField", "not": true}], "evidence": ["MK-13", "FR-035", "IN-5b"], "note": {"ja": "求めた欄が編集中の欄なら求めは既に満ちている"}}
  },
  "creationLanded": {
   "idle": {"to": "fieldFocusWanted", "evidence": ["FR-091", "HF-14", "IN-5b"], "note": {"ja": "`fieldRow` はタスクなら `PR-1`、行なら `AT-53`"}},
   "fieldFocusWanted": {"to": "fieldFocusWanted", "evidence": ["FR-091", "HF-14", "IN-5b"], "note": {"ja": "`fieldRow` を書き換える"}},
   "editingField": {"to": "fieldFocusWanted", "evidence": ["FR-091", "HF-14", "IN-5b"], "note": {"ja": "`fieldRow` はタスクなら `PR-1`、行なら `AT-53`"}}
  },
  "fieldEditBegan": {
   "idle": {"to": "editingField", "evidence": ["AG-9", "IN-5a", "IF-9"]},
   "fieldFocusWanted": {"to": "editingField", "evidence": ["IN-5b"], "note": {"ja": "求めた欄なら焦点が入った。別の欄なら人が焦点を動かした —— どちらも求めは終わる"}},
   "editingField": {"to": "editingField", "evidence": ["IN-5a", "IF-9"], "note": {"ja": "`fieldRow` を書き換える（編集する欄が替わった）"}}
  },
  "fieldEditEnded": {
   "editingField": {"to": "idle", "guard": [{"name": "isEditedField"}], "evidence": ["SK-19", "IN-4", "IN-6", "IF-9"]}
  },
  "fieldFocusWithdrawn": {
   "fieldFocusWanted": {"to": "idle", "evidence": ["IN-5a", "IN-5b"]}
  }
 }
}
```

### E. 運ぶ値の型（コードが決める。原稿は名前だけ —— 表 T-250 の `SD-1` ・ `SD-2`）

| 名 | 型の見込み | 置き場 |
|---|---|---|
| `fieldRow` | `string`（欄が名乗る行 ID。`IF-9` の `FieldCommit.row` と同じ型 —— `screen-surface.ts:38`） | `field-entry-values.ts` |
| 求める側の定数 | `TASK_NAME_FIELD_ROW = 'PR-1'` ・ `ROW_NAME_FIELD_ROW = 'AT-53'`（`field-entry-values.ts:183` ・ `:185` のまま） | 同上 |
| 面の知らせ（波 B、段 6 と決める） | 例: `{ kind: 'began' \| 'ended'; row: string }` の列を 1 度読むと消える形で返す | `screen-surface.ts`（`UF-70`） |

## 改訂の記録

| # | 日付 | 何を変えたか | 理由 |
|---|---|---|---|
| 1 | 2026-09-21 | 起草（`f626ae16` の展開を読んだ） | 利用者の裁定（`JDG-290` として記録する予定だった） |
| 2 | 2026-09-21 | 波 A を当てた（`f626ae16` から切った作業木、ブランチ `sm-fieldedit-a`）。原稿の領域 `fieldEntry` を付録 D に置き換え、`npm run gen` の 2 つの生成器で表 T-292 ・ 図 F-038 と `field-entry-values.ts` の生成区画を刷り直した。`field-entry-values.ts` の手書きの側を改名し、`isEditedField` ・ `onFieldEditBegan` ・ `onFieldEditEnded` を足し、`wantEnded` を `onFieldFocusWithdrawn`（`fieldFocusWanted` のときだけ `idle` へ）に狭めた。`advance-screen-session.ts` の `IS_FIELD_ENTRY_EVENT` を改めた。`IF-9` ・ `IN-5a` を 3 節の文のとおりに改めた。`JDG-290` を記録し、`JDG-68` の状態を「覆された（一部）」にした。台帳に `DFC-701` ・ `DFC-702` を書き、`DFC-694` に新しい名を 1 文追記した | 利用者の裁定 `JDG-290`。数は予測どおりだった: 原稿 6 領域 ・ 機械 21 ・ 状態 60 ・ 出来事 74 ・ 升 150 ＋ 根 10、md-checks `tables=181  figures=25  rows=2227  uids=162` |
| 3 | 2026-09-21 | 試験は 2.5 の `uf-121` の 1 か所（ガードの無い行を `fieldEditBegan` の行に替えた）のほかに 3 つを触った: ① `IF-9` の退いた文を前提として引いていた `tests/unit/dfc-571-if-9-a-half-typed-line-is-no-utterance.test.ts` と `tests/unit/dfc-579-in-5a-dialogue-keys-go-to-the-field.test.ts` の前提の引用を、新しい文（知らせ・中身を返さない MUST NOT・対話欄を知らせない）に替えた —— 面の振る舞いの主張は変えていない ② `IF-9` の新しい MUST 2 つ（知らせを渡し切る・行 ID を読むのは升だけ）を、`uf-121` の 2 件で逐語に持たせた（`IF-9` の文と、生成した行で `isEditedField` が `editingField` の升にだけ立つこと）③ 契約試験 `state-machine-field-entry.contract.test.ts` は名だけを改めた（標本の機械名、`SS-5` の欄名、退いた `fieldFocusLanded` の標本を消した）。新しい出来事 2 つの標本は空の列で置いた | 2.5 は `IF-9` の文を引く試験を数えていなかった。検査 39 の「持たれていない」は 1363 のまま（新しい MUST 2 つと、置き換えた MUST NOT 1 つがどれも持たれた）。新しい升と `editingField` の標本の主張は、仕様だけを読む別の体が書く（`RA-6`） |
