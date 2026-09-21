# CR-440 — 通知を状態機械へ移す（段 7 の第 2 領域）

> ⭐ **状態: 波 A を当てた（2026-09-21、`d3b6425b` の上。ブランチ `sm-notices-a`）。波 B1 と波 B2 は当てていない。**
> 当てたのは 第 3.1 節の表のうち、契約試験 `tests/contract/state-machine-notices.contract.test.ts` を除くすべてである —— 契約試験は `RA-6` のとおり、仕様だけを読む別の体が書く。当てた体が決めたこと・起草と違えたことは末尾の「改訂の記録 —— 波 A を当てた」に並べた。
> ⭐ **台帳の 2 行（第 8 節の候補 1 ・ 2）は、前に立つ者の依頼で当てた体が `DFC-679` ・ `DFC-680` として書いた**（第 8 節の「本書は書かない」を覆した。改訂の記録の 9）。
> 読んだ木: `d3b6425b`（ブランチ `refactor`）。**本書の行番号と数は、断りが無いかぎりこの木で 2026-09-21 に自分で測ったものである。**
> 型板は `CR-436`（波の分け方・付録の形・継ぎ目・改訂の記録の教訓）。
>
> **閉じるもの**:
> - 計画の記録 4 の移す順の 2 番目「通知。UseCase の配布中の旗を、ここで状態へ移す（DFC-562 と重なる）」（`docs/development-records/refactor-plan-report-2026-09-13.md:249`）。
> - `CR-379` の決定 7 のうち通知の側（`deliveringNotices` を通知の領域へ。`change-request/CR-379-unsaved-state-is-held-by-one-state-machine.md:54`）と、同書 2b-B の表の「5.5 の散文（通知の配布中の窓）と `WS-2`」の行（同 `:178`）。
> - 第 2 領域「通知」の原稿の行（`SM` / `EV` / `TN`）と、その領域のユニット・契約試験・根への合成。
>
> **当てる直前に測り直した識別子**（規則 02 の 2.5。⭐ どれも 2026-09-21 に `d3b6425b` で測った値であり、当てたので、いまは履歴である）:
> - 番号の帯（本巡の依頼が配った）: **本書は 表 `T-286` 以降、図 `F-029` だけ（`F-030` 以降は別のセッション）、`UF-87` 以降。** `T-283` は `CR-436` の波 B2 が予約しているので取らない。
> - 当てる直前、木が見出しで定義していた表の番号は `T-285` まで、図の番号は `F-028` までだった（2026-09-21 に `d3b6425b` で実測。`docs/spec` の `**表 T-nnn —` ・ `**図 F-nnn —` を grep。検査 62 も同じ値を刷った）。`T-286` ・ `T-287` ・ `T-288` ・ `F-029` は、当てる直前には `docs` ・ `change-request` ・ `src` ・ `tests` ・ `tools` ・ `.claude` の `d3b6425b` を `git grep -w` して 0 件だった（同日）。⭐ いまは本書が 表 T-286 〜 表 T-288 と 図 F-029 を定義している。
> - `UF-87`: 当てる直前、表 T-075 の行 ID は `UF-86` までだった（欠番 `UF-43` ・ `UF-44` ・ `UF-52` ・ `UF-72` 〜 `UF-80`。`UF-81` 〜 `UF-83` は本線の段 4 の波 1 が置いた）。`UF-87` の字面は `CR-432` と `CR-436` の改訂の記録（捨てた旧案）にだけ在り、予約ではなかった（2026-09-21 に `d3b6425b` を `git grep -w` して 4 件、すべてその 2 書）。⭐ いまは本書が 表 T-075 の `UF-87` を置いている。
> - 当てる直前、原稿の行 ID は `SM-33` ・ `EV-30` ・ `TN-53` までだった（2026-09-21 に `docs` ・ `src` ・ `tests` ・ `tools` ・ `change-request` ・ `.claude` を grep）。⇒ **本書は `SM-34` 〜 `SM-38`、`EV-31` 〜 `EV-35`、`TN-54` 〜 `TN-63` を置いた。** ⚠️ 依頼は「`SM-35` から」と書いたが、`EV-31` ・ `TN-54` と同じ「いちばん大きい番号の次」の数え方では `SM-34` が次である（`SM-0` から始まるので 34 行の上端は `SM-33`）。当てる直前、`SM-34` ・ `SM-38` ・ `EV-31` ・ `EV-35` ・ `TN-54` ・ `TN-63` は `d3b6425b` を `git grep -w` して 0 件だった。
> - 行 ID の接頭辞の登録簿は 163 件（2026-09-21 実測、`"prefix"` を数えた）。`SM` ・ `EV` ・ `TN` は登録済み。**本書は新しい接頭辞を登録しない。**
> - 本書の番号 `CR-440` は 0 件（同日）。要求 ID は 1 つも立てない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **波 A と波 B1 は、どの `CH-` も直接には前へ進めない —— 基盤の作業である。** 利用者に見える振る舞いを 1 つも変えない。
⭐ **波 B2 も振る舞いを変えない**（配りの窓の持ち主が `UseCase` のモジュールからシェルの 1 つの現在値へ移るだけ）。`DFC-562`（発話の配りが窓を立てない）を直すのは、移して一致を確かめた直後の別のコミットである（`JDG-57`、`rulings.md:134`）。

守るもの:
- **`GL-003`（ぬるサク）** —— 何も変わらない出来事では同じ参照を返す（表 T-249 の `SF-3`）。性能は `LM-19` の手順（表 T-285 の `RA-8`）。**測る前に利用者を呼ぶ**（`RISK-001` の門）。
- **`NT-8` の「消すものが 1 つも無いときに消費してはならない（MUST NOT）」**（`docs/spec/01-04-requirements.md:6389`）—— 状態機械では「`notices.onScreen.none` に `EV-32` の行が無い」ことと、優先順の表（`SD-4`）の段が `notices.onScreen.standing` のときだけ在ることの 2 つで守る（2.2）。
- **5.5 の「通知を配っているあいだの書き込みは拒否すること（MUST）」**（`docs/spec/05-07-design.md:663`）—— 窓を移しても、配りの中から書き戻す購読者は拒まれ続けること（第 5 節）。

### ② レビュー観点のどの条項を当て、何が出たか

（`docs/development-rules/07-review-standards.md`）

- **`R2` 命名** —— ⛔ **`notices.ts` は既に在る**（`src/adapter/screen-renderer/notices.ts`、表 T-075 の `UF-67`、`05-07-design.md:439`）。表 T-075 はユニットをファイルの名だけで持ち、`audit-ch5.py:201` は `purity_of[f]` をファイルの名で引くので、2 つ目の `notices.ts` は `UF-67` の行を上書きする。⇒ 領域のファイルは `notice-values.ts`、型の幹は `NoticeValues`（決定 3）。出来事は過去形（`SF-1`）—— 付録の `EV` 5 行はすべて過去分詞で終わることを確かめた。
- **`R2.2`（SRP）／表 T-276** —— 新しいユニットは 1 つ（`notice-values.ts`）。変更の理由は通知の領域の行だけ（`UD-1`）。既存のファイルを割らない（`UD-4` の範囲外 —— `CR-436` の 3.1a と同じ読み）。
- **`R4` グリッジ／レースコンディション** —— 通知の積み・消しは `step` が丸ごと返す。配りの窓は、副作用の実行（`WS-7`）の始まりと終わりを出来事で戻す（`SF-6`）。
- **`R7.1` / `R7.2` / `R7.9`** —— 遷移は `pure`、配る・通知を上げる副作用の実行はシェル。
- **`SF-7`（`05-07-design.md:992`）** —— `UseCase` のモジュールスコープの可変状態 `deliveringNotices` を消す。検査 61 の基準線の `HELD` 行（`.claude/skills/spec-graph-check/module-state-baseline.txt` の 2 行のうち 1 行）を同じコミットで消す（基準線は利用者に数を見せてから前に立つ者が書く）。

### ③ 利用者に問うたこと・**問わずに決めた**こと

**問うこと**: ⭐ **なし（0 件）。** 問いの候補 6 つに打った 3 つの反証は第 5a 節に残した。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | **3 つの波に割る**（第 3 節）: 波 A はいま当てる（`src/adapter` ・ `src/framework` に触らない）。波 B1（画面の通知の結線）と波 B2（配りの窓の移し）は段 5・段 6 の完了と `CR-436` の波 B2 を待つ | 計画の状態表の段 7 の入口（`refactor-plan-report-2026-09-13.md:98`）、`handoff-state-machine.md` §3「次の領域の原稿と遷移のユニットは、段 5・6 と並行してよい」「シェルへの結線は並行できない」、同 §6 の持ち場（相手 ＝ `src/adapter/` ・ `src/framework/` ・段 4 の 4 ファイル） |
| 決定 2 | **領域のキーは `notices`、軸は 2 つ** —— `onScreen`（人に告げて出ている通知。`none` ／ `standing`）と `delivery`（購読者へ配っている窓。`idle` ／ `delivering`）。直交する（`CR-436` の決定 4 の読み） | 計画の記録 4 の表が 1 つの領域「通知」に `raisedNotices` と「UseCase の配布中の旗」を入れ（`refactor-plan-report-2026-09-13.md:241`・`:249`）、`CR-379` の決定 7 が `deliveringNotices` を「通知」の領域へ置く（`CR-379`:54）。2 つは独立に変わる（配りの窓は `WS-7` の同期の呼び出しのあいだだけ、画面の通知は人が消すまで）ので、1 つの共用体にすると組が掛け算で増える |
| 決定 3 | **領域のファイルは `notice-values.ts`、型の幹は `NoticeValues`** | ② の `R2`。`screen-values.ts` ／ `ScreenValues` と同じ形。表 T-075 のファイル名の重なりは 2026-09-21 に 0 件（`uniq -d`） |
| 決定 4 | **通知を上げることは、ほかの領域とシェルの流れが返す副作用 `raiseNotice` とし、シェルはそれを `EV-31`（`noticeRaised`）として根へ戻して実行する** | `SF-6`（`05-07-design.md:991`「結果は出来事として `step` へ戻す」）。`CR-436` の原稿が既に副作用 `raiseNotice`（`TN-24` の `RS-41`、`TN-37` の `RS-35`）を返している。`NT-3` の束ね（同じ理由は 1 枚の件数を増やし、いちばん新しいものになる。`01-04-requirements.md:6383`）を 1 か所（`TN-55`）にだけ置くためでもある |
| 決定 5 | **`Esc` と `Enter` の通知の段は、`EV-9`（`escapePressed`）ではなく通知の領域の出来事 `EV-32`（`newestNoticeDismissAsked`）で受ける** | 原稿の遷移は自分の領域の出来事しか名指せない（`docs/spec/_source/state_machines_json_to_md.py:211`〜`:224` の `check_transitions` が `self.event_by_key` を引く）。`SK-19` の第 1 段（`Enter`）も同じ `NT-8` の消去であり（`01-04-requirements.md:4158`）、画面の値の領域に `Enter` の通知の段の出来事は無い。どの段が `Esc` ／ `Enter` を取るかは、`CR-436` の決定 7 と同じく呼び手が決める（優先順の表は `CR-436` の波 B2 の `T-283`） |
| 決定 6 | **`EV-32` は、同じ入力が運ぶほかの何よりも先に 1 段進める。** ⇒ `noticeReasonsOnArrival`（`frame-loop.ts:2944`）は要らなくなる | `NT-8`「この消去を、`Enter` と `Esc` のどの階層よりも先に行うこと（MUST）」（`01-04-requirements.md:6389`）。いまのコードが「届いた時点の通知」を印で覚えるのは、同じ入力の中で先に `spendFieldCommit` が通知を上げうるからである（`frame-loop.ts:4145` の TRAP）。遷移が原子的なら、先に進めた段の状態が届いた時点の状態である。⚠️ 覆すなら、`EV-32` に届いた時点の最新の理由を運ばせる形になる（`CR-436` の決定 5 と同じ筋） |
| 決定 7 | **配りの窓の出来事は `EV-34`（`documentReplaced`、`WS-6` の結果）と `EV-35`（`changeDelivered`、`WS-7` の結果）の 2 つ。** シェルが実装する `ChangeAudience.deliver`（`frame-loop.ts:1946`〜`:1951`）がその始まりと終わりで 1 段ずつ進め、`WriteMoment.deliveringNotices` は呼び手が `notices.delivery.delivering` から詰める | `CR-379` の決定 7「シェルが持つ 1 つの現在値の一部として引数で渡す。表 T-065 は増やさない」（`CR-379`:54）。表 T-067 の `WS-6` ／ `WS-7` の順（`05-07-design.md:649`〜`:650`）と 5.5 の「文書をまるごと差し替える道も、本表の 7 つの順を踏む」を変えない —— `applyDocumentChange` が `audience.deliver` を呼ぶ形は残し、窓の旗だけをモジュールから出す。⚠️ `WriteMoment` の欄 `deliveringNotices`（`src/use-case/apply-document-change/document-change-plan.ts:35`）は既に在る |
| 決定 8 | **`stackSafetyCapToldFor` はフレームの値としてシェルに残し、原稿に載せない** | `ST-7`（`01-04-requirements.md:1501`）が名指すのは「達したら人に通知すること」と「書き出しの後でも上げること」であり、「同じ `TaskGroup` を 2 度告げない」覚えを名指さない ⇒ 5.5 の規則（`05-07-design.md:713`〜`:714`）で原稿の外。値はフレーム先頭のレイアウトの結果（ADR-001）であり、前のフレームとの違いで出来事を作るのは `SF-5` の後段（`05-07-design.md:990`「当たりが変わったときだけ作る」）の形。⚠️ 覆すなら、根の運ぶ値として持ち `EV-31` のガードにする形になる |
| 決定 9 | **`stackSafetyCapOfLastExportScene` と `stackSafetyCapOwedByPictureExport` は状態にしない** —— 前者は `exportScene` の返す値に、後者は書き出しの副作用の結果の出来事の運ぶ値にする。書き出しの流れはファイル操作と問いの待ちの領域の持ち物である | 前者は関数の戻り値を閉包の変数で運んでいるだけである（書き手は `exportScene` の `:2566` ひとつ、読み手 `:3489` ・ `:3842` は同じ呼び出しの直後に写す。`readSnapshot` の `:2772` も `exportScene()` を呼んで上書きする）。後者は `await` をまたいで書き出しの結果を運ぶ値（`:3453` ・ `:3465`〜`:3467` ・ `:3489`）であり、`SF-6` の「結果は出来事として戻す」の運ぶ値である。どちらも要求は名指さない（`ST-7` が名指すのは「書き出しを終えたあとで同じ通知を画面に上げること」だけ） |
| 決定 10 | **`notify-change-watchers.ts` の `REGISTRATIONS` は本書の領域に入れない**（Agent API の領域） | `CR-379` の決定 7 が 2 つのモジュール状態を「通知・Agent API」へ振り分け、棚卸しの E 節が `REGISTRATIONS` の領域を「Agent API」、仕様の名を `AG-6` と書く（`refactor-stage1-state-inventory-2026-09-13.md:160`）。購読の登録簿は `watchChanges` ／ `unwatchChanges`（`PI-15`）で Agent API の口から変わる |
| 決定 11 | **表 T-075 の新しい行 `UF-87` の「負う要求」は `—`**（`CR-436` の決定 10 と同じ理由） | 波 A では画面がこのユニットを呼ばない。`FR-076` の起点はいま `UF-67`（`05-07-design.md:439`、`OW-2`）であり、`—` は名指しを増減しないのでラチェット（`requirement-owner-baseline.txt` の `unfilled=17`）は動かない。波 B1 で起点を移すかは、そのとき 5.3 の規則で決め直す |
| 決定 12 | **生成器に「同じ出来事のキーを 2 つの領域が持たない」の検査を足す**（波 A） | 表 T-284 の `SS-5`（`05-07-design.md:1078`）は「出来事が触れる領域の `step` を呼ぶ」。領域が 2 つになると、根は出来事の `type` で領域を引くので、同じキーが 2 領域に在ると引き先が決まらない。いまの生成器はキーの重なりを領域の中でしか見ない（`state_machines_json_to_md.py` の `load()` の `duplicates(e['key'] for e in region.events)`）。⚠️ 副作用の名（`raiseNotice`）は 2 領域に在ってよい —— シェルが実行するだけで引き先を持たない |
| 決定 13 | **5.5 の散文「窓は通知の領域の状態である」の 1 文と `PI-8` の文は、波 B2 で当てる**（波 A では書かない） | 波 A ではコードがまだモジュールの旗を持つ。仕様に先に書くと、動いているコードと仕様が食い違う嘘になる（`CR-436` の決定 10 ・決定 20 と同じ筋） |
| 決定 14 | 行 ID: `SM-34` 〜 `SM-38`、`EV-31` 〜 `EV-35`、`TN-54` 〜 `TN-63`、`UF-87`、表 `T-286` ・ `T-287` ・ `T-288`、図 `F-029` | 上の識別子の段 |

---

## 1. 測った事実（`d3b6425b`、2026-09-21）

| 数 | 値 | 測り方 |
|---|---|---|
| `frameLoop` の範囲 | 1799〜4414 行 | `grep -nE "^(export )?(async )?function frameLoop"` と、その後の最初の `^}`（`awk 'NR>1799 && /^}/'`） |
| `frameLoop` が直に持つ `let` | 66（うち通知の領域 5） | `sed -n '/^export function frameLoop/,/^}/p' … \| grep -c "^  let "` |
| `domScreenSurface` の範囲 | 2298〜3168 行（`src/framework/dom-screen-surface/dom-screen-surface.ts`） | 同じ測り方。通知に触れる `let` は `isNoticeShowing`:2749 の 1 つ |
| `UseCase` のモジュール状態 | 2（`deliveringNotices` ・ `REGISTRATIONS`） | `module-state-baseline.txt` の `HELD` 2 行と一致 |
| `raiseNotice(` の呼び出し | 45（定義を除く。すべて `frameLoop` の中） | `grep -c "raiseNotice(" frame-loop.ts` の 46 から定義 `:2449` を引いた |
| 窓を主張する `UseCase` 単体の試験 | 2 本 | `tests/unit/use-case.test.ts:591`（`WS-2 refuses a write made from inside the delivery`）、`tests/unit/uf-8-9-replace-document.test.ts:858`（再入する呼び手は `deliveringNotices: false` と言っても拒まれる）。Agent API を通す 1 本 `tests/unit/uf-27-28-29.test.ts:1040`〜`:1055` |
| 表 T-075 の行 | 74（`SU-3`、`05-07-design.md:245`） | `units.contract.test.ts:50`〜`:51` も 74 |
| `changelog.md` の版 0.29 の文 | 「`AdvanceScreenSession`（3）」 | `grep -o` で 1 件（検査 33 がこの文を 表 T-075 と突き合わせる —— `CR-436` 第 3 節） |
| md-checks の最終行 | `tables=177  figures=20  rows=2329  uids=162` | 第 7 節 |

⭐ **棚卸し（`refactor-stage1-state-inventory-2026-09-13.md`）の行番号は古い仮説として受け、すべて測り直した。**

---

## 2. 棚卸しの測り直しと分類

分類は `SF-5`（`05-07-design.md:990`）と 5.5 の原稿の規則（`:713`〜`:714`「原稿に載せるのは、要求が名指す状態・出来事・遷移だけ」「実装の都合の細部は … 状態が運ぶ値としてコードが持つ」）を 1 つずつ当てた。
**状態** ＝ 原稿の `SM` に載る。**運ぶ値** ＝ `SM` の行の `carries`。**フレームの値** ＝ シェルに残る。**外** ＝ この領域の状態ではない（行き先を書く）。

| 状態 | 所在（宣言） | 書き手 ／ 読み手 | 分類 | 名指す仕様の行 |
|---|---|---|---|---|
| `raisedNotices` | `frame-loop.ts:1888` | 書き: `raiseNotice`:2453・2461、`dismissNewestNotice`:2482、`receiveInput`:4184。読み: `recordFrame`:2052、`recordedNoticeReasons`:2062〜2063、画面の記述 `:2261`、`raiseNotice`:2450・2454・2462、`noticesWithout`:2471、`dismissNewestNotice`:2478・2482、`collectInputContext`:3023、`owesFrame`:4096、`receiveInput`:4146・4152 | **状態** `notices.onScreen.none` ／ `.standing`（`SM-35` ・ `SM-36`）と運ぶ値 `standing`（理由と件数の列、古い順） | `FR-076` req:6368、`NT-8` req:6389（「いちばん新しいものから消す」「消すものが 1 つも無いとき」）、`NT-3` req:6383（束ねと件数）、`IN-4` req:6795 と `SK-19` req:4158（「出ている通知」）、`IR-3` req:4690（記録に理由を書く） |
| `stackSafetyCapToldFor` | `frame-loop.ts:1889` | 書き: `:2165`・`:2168`。読み: `:2164` | **フレームの値**（決定 8） | `ST-7` req:1501 は通知だけを名指す |
| `stackSafetyCapOfLastExportScene` | `frame-loop.ts:1891` | 書き: `exportScene`:2566。読み: `:3489`・`:3842` | **外** —— `exportScene` の戻り値へ（決定 9）。書き出しはファイル操作と問いの待ちの領域 | 名指す行なし（`ST-7` は「書き出しの後に上げる」ことだけ） |
| `stackSafetyCapOwedByPictureExport` | `frame-loop.ts:1892` | 書き: `:3453`・`:3466`・`:3489`。読み: `:3465` | **外** —— 書き出しの副作用の結果の出来事が運ぶ値へ（決定 9） | 同上 |
| `noticeReasonsOnArrival` | `frame-loop.ts:2944` | 書き: `receiveInput`:4146。読み: `dismissNewestNotice`:2478、`receiveInput`:4199 | **外** —— 遷移の原子性が代わる（決定 6） | 名指す行なし（`NT-8` の順の規則が代わりを持つ） |
| `isNoticeShowing` | `dom-screen-surface.ts:2749` | 書き: `showScreenView`:2540（描いた記述の `notices` の写し）。読み: `isPressTakenByStandingNotice`:2753（`Esc` ／ `Enter` のリスナー `:2792`・`:2819`・`:2965`・`:2985`・`:3029`） | **外** —— 描いた記述の写し（`Framework` の面が持つ。棚卸し 3 節の「DOM へ書いた値の覚え」と同じ扱い）。段 6 の持ち場 | 規則は `NT-8`（写しそのものは名指さない） |
| `deliveringNotices` | `src/use-case/apply-document-change/apply-document-change.ts:69` | 書き: `replaceThenTell`:85・89。読み: `momentInsideTheWindow`:73 | **状態** `notices.delivery.idle` ／ `.delivering`（`SM-37` ・ `SM-38`） | `WS-2` des:645（「通知の配布中は拒否する」）、5.5 des:663（MUST）、`WS-7` des:650、`CA-3` des:962、`RS-9` req:6414 |
| `REGISTRATIONS` | `src/use-case/notify-change-watchers/notify-change-watchers.ts:37` | 書き: `:43`・`:49`・`:74`。読み: `:42`・`:56`・`:73` | **外** —— Agent API の領域（決定 10） | `AG-6` req:6056 |

⇒ **通知の領域の状態 7（棚卸しの 7 行と一致）＋ 判定した外の 1（`REGISTRATIONS`）。** 状態になるのは 2 つ（`raisedNotices` ・ `deliveringNotices`）、フレームの値 1、外 4。

### 2.1 領域をまたぐもの（棚卸しの記録 4 の 6 件を測り直した）

| 読む側 | いま | 移した後 |
|---|---|---|
| `owesFrame` が `raisedNotices` を読む | `frame-loop.ts:4096`（`noticesBefore` は `:4152` で写す） | ⭐ **消える** —— 根の参照の比較に吸われる（`SS-5`、`05-07-design.md:1078`: 触れた領域だけが新しい参照になる）。引数 `noticesBefore` は要らない |
| `collectWriteMoment` が `deliveringNotices` を読む（`WS-2`） | `frame-loop.ts:3066`〜`:3072` は `deliveringNotices: false` と書き、`UseCase` がモジュールの旗で上書きする（`apply-document-change.ts:73`） | 呼び手が `notices.delivery.delivering` から詰める（決定 7）。Agent API の道は `readSnapshot`（`frame-loop.ts:2765`〜）の写しに `isDeliveringNotices` を足し、`agent-api-members.ts:326` がそれを読む。⚠️ これは `SD-4`（出来事の奪い合い）ではなく、ほかの層がガードとして読む値であり、`CR-436` の決定 5 と同じ筋（値は呼び出しの引数が運ぶ） |
| `receiveInput` が `partUnderPointer.noticeDismissKey` で消す | `frame-loop.ts:4183`〜`:4187` | 入力の翻訳係が、ポインタを離した所の部位から `EV-33`（`noticeDismissPressed`、運ぶ値 `dismissKey`）を作る（`SF-5` の「押す」） |
| `raiseNotice` が `environment` を読む | `frame-loop.ts:2466` | ⭐ **消える** —— シェルは根の参照が変わった 1 段の後でフレームを求める。環境はシェルのフレームの値のまま |
| `readSnapshot` が `stackSafetyCapOfLastExportScene` を上書きする | `frame-loop.ts:2772`（`exportScene()` を呼ぶ） | ⭐ **消える** —— 決定 9 で値は戻り値になる |
| 面の `Esc` ／ `Enter` のリスナーが `isNoticeShowing` を読む | `dom-screen-surface.ts:2753` ほか 5 か所 | 残る（外）。⚠️ 第 8 節の候補 1 |
| `Esc` の段 `'notice'`（`IN-4`） | `receiveInput`:4199（届いた時点で通知が立っていたか）・`:4218`（`dismissNewestNotice`） | 優先順の表（`SD-4`）の第 1 段の状態のキーが `notices.onScreen.standing`。⇒ `CR-436` の波 B2 の `T-283` に 1 行（下の 2.2） |

### 2.2 `SD-4`（領域をまたぐ優先順）の当て方

表 T-250 の `SD-4`（`05-07-design.md:725`）は「奪い合う出来事、順を決めた要求の行、段ごとの状態のキー」を持つ。通知の領域が持ち込むのは次の 2 つで、どちらも **`CR-436` が波 B2 に予約した `T-283` の行として置く**（本書は `T-283` を取らない）:

| 奪い合う出来事 | 段 | 状態のキー | 順を決めた行 |
|---|---|---|---|
| `Esc` | 第 1 段「出ている通知」 | `notices.onScreen.standing` | `IN-4` req:6795、`NT-8` req:6389 |
| `Enter` | 第 1 段「出ている通知」 | `notices.onScreen.standing` | `SK-19` req:4158、`NT-8` req:6389 |

⚠️ **`CR-436` の決定 7 は `T-283` を「`IN-4` の 8 段」と書いた**（`CR-436` 第 6 節）。`Enter` の段（`SK-19`）も同じ第 1 段を持ち、`NT-7` の `y` ／ `n` は「`NT-8` の消去の次、`IN-4` と `SK-19` の階層より先」（req:6388）と順を定める。⇒ `T-283` の波 B2 に、`Enter` と `y` ／ `n` の順をどう置くか（1 つの表か、出来事ごとの表か）を申し送る。⛔ 本書は決めない（`T-283` の持ち主は `CR-436`）。
⭐ `NT-8` の「消すものが 1 つも無いときに消費してはならない」は、この段が `notices.onScreen.standing` のときだけ在ることで表され、原稿の側では `notices.onScreen.none` に `EV-32` の行が無いこと（`SD-3` で同じ参照）で表される。

---

## 3. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A** | なし（いま当ててよい） | `docs/spec/_source/state-machines.json`（領域 `notices` を足す）、`state_machines_json_to_md.py`（決定 12 の検査 1 つ）、生成物 `docs/spec/_assets/tbl-state-machines.md`（表 T-286 〜 T-288 ・図 F-029 が足される）、`src/use-case/advance-screen-session/notice-values.ts`（新）と `advance-screen-session.ts`（根への合成、`RA-5`）、`docs/spec/05-07-design.md`（5.5 の 1 段、`CP-39` の正、表 T-063 の `UT-11`（`RA-4`）、表 T-064 の `PI-39`、表 T-074 の `SU-3`、表 T-075 の `UF-87`、図 F-028、表 T-284 の `SS-6`）、`tests/contract/state-machine-notices.contract.test.ts`（新）、`tests/contract/units.contract.test.ts` の数、`changelog.md` の版 0.29 の数、`docs/development-rules/03-implementation.md` の生成定数の一覧と検査 30 の名簿（`NOTICE_VALUES_TRANSITIONS`） | 18 ・ 19 ・ 21 ・ 26b ・ 27 ・ 30 ・ 33 ・ 59 ・ 60 ・ 61 ・ 62 ＋ vitest |
| **B1** | 段 5 と段 6 が済み、`CR-436` の波 B2 が当たっている（根がシェルに結線され、`T-283` が在る） | `frame-loop.ts` —— `raiseNotice` の 45 か所を副作用 ／ `EV-31` へ、`dismissNewestNotice` ・ `noticesWithout` ・ `receiveInput`:4146〜4218 の通知の段を `EV-32` ・ `EV-33` へ、`let` 4 つを消す（`raisedNotices` ・ `stackSafetyCapOfLastExportScene` ・ `stackSafetyCapOwedByPictureExport` ・ `noticeReasonsOnArrival`）、`exportScene` の戻り値に上限の値を足す。入力の翻訳係（段 5 で割った形）に `EV-32` ・ `EV-33` を作らせる。`T-283` の通知の段の行。`components.json` の辺は `CR-436` の波 B2 のものを使う（新しい辺は見込み 0） | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部、`LM-19`（利用者を呼んでから） |
| **B2** | 波 B1 が当たっている | `apply-document-change.ts` のモジュールの旗 `:68`〜`:74` ・ `:85`〜`:90` を消す、`frame-loop.ts` の `audience`（`:1946`〜`:1951`）で `EV-34` ・ `EV-35` を進める、`collectWriteMoment`（`:3066`〜）と `readSnapshot`（`:2765`〜）が窓を詰める、`src/adapter/agent-api-endpoint/agent-api-members.ts:326` が写しを読む、`module-state-baseline.txt` の `HELD …:deliveringNotices` の 1 行を消す（⛔ 数を利用者に見せてから前に立つ者が書く）、`UseCase` 単体の試験 2 本の書き直し（第 1 節）、5.5 の散文の 1 文と `PI-8` の文（決定 13）。⭐ `DFC-562` の直しはこの後の別のコミット（`JDG-57`） | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ **61** ・ 62 ＋ e2e 全部 |

⭐ **波 A は段 5・段 6 と並行してよい** —— 触るのは `docs/spec/` と `docs/spec/_source/`、`src/use-case/advance-screen-session/`、新しい試験だけで、相手の持ち場（`src/adapter/` ・ `src/framework/` ・段 4 の 4 ファイル。`handoff-state-machine.md` §6）と重ならない。
⭐ **`apply-document-change.ts` は段 4 の 4 ファイルに入っていない**（`CR-432` の 4 節: `edit-task.ts` ・ `edit-task-group.ts` ・ `svg-renderer.ts`。`import-document.ts` の `builtMerge` は外された）。⛔ それでも波 A では触らない —— 旗を消すと、窓を詰める呼び手（`frame-loop.ts` と `agent-api-members.ts`）が同じコミットで要り、そちらは相手の持ち場である。
⚠️ **B1 を B2 の前に置く理由** —— B2 の `EV-35` は `RS-23` を上げる副作用を返す（`TN-63`）。シェルがそれを `EV-31` として戻す道は B1 が作る。

### 3.1 波 A の中身

| 対象 | いま | 案 |
|---|---|---|
| **原稿** `state-machines.json` | 領域 `screen` だけ | 領域 `notices` を足す: `name` `{ja: 通知}`、`unit` `src/use-case/advance-screen-session/notice-values.ts`、`typeStem` `NoticeValues`、`tables` `T-286`（通知の状態）・ `T-287`（通知の出来事）・ `T-288`（通知の遷移）、`figure` `F-029`（通知の状態遷移）。行は付録（`SM` 5 ・ `EV` 5 ・ `TN` 10）。⭐ 表と図の番号は原稿が持ち、生成器が刷る（`state_machines_json_to_md.py` の `build()` は領域ごとに `## 名（キー）` の節と表 3 つ・図 1 つを刷る）。⇒ **領域 1 つにつき表 3 つ・図 1 つの新しい番号が要る** |
| **生成器** `state_machines_json_to_md.py` | 出来事のキーの重なりを領域の中でだけ見る | 決定 12: 2 つの領域が同じ出来事のキーを持てば落とす。`tools/generate_state_machine_types.py` は領域ごとに `unit` の生成区画へ書くので、変えない見込み（当てる体が 2 領域で走らせて確かめる） |
| **生成物** `_assets/tbl-state-machines.md` | 表 T-280 〜 T-282 ・図 F-026 | ＋ 節「通知（`notices`）」: **表 T-286 — 通知の状態**、**表 T-287 — 通知の出来事**、**表 T-288 — 通知の遷移**、**図 F-029 — 通知の状態遷移**。`npm run gen` |
| **5.5 の散文**（`05-07-design.md:727`〜） | 「第 1 領域（画面の値）の … 表 T-280 ・ … 図 F-026 に示す」 | 1 文を足す: 「第 2 領域（通知）の状態・出来事・遷移を同じファイルの 表 T-286 ・ 表 T-287 ・ 表 T-288 に、状態遷移を 図 F-029 に示す。」（⛔ `CR-440` の字面を仕様に書かない —— 検査 7。`CR-436` の決定 20） |
| 表 T-062 `CP-39`（`:144`） | 正「… / 表 T-280 〜 表 T-282」 | ＋「/ 表 T-286 〜 表 T-288」 |
| 表 T-063 `UT-11`（`:336`） | 「領域ごとのファイル（いまは `screen-values.ts`）」「（画面の値は 表 T-280 〜 表 T-282）」 | 「（いまは `screen-values.ts` ／ `notice-values.ts`）」「（画面の値は 表 T-280 〜 表 T-282、通知は 表 T-286 〜 表 T-288）」（`RA-4`） |
| 表 T-064 `PI-39`（`:529`） | 「いまは画面の値の領域だけ」「全数は 表 T-281」ほか | 「いまは画面の値と通知の 2 領域」、出来事の全数「表 T-281 ・ 表 T-287」、副作用の名「表 T-282 ・ 表 T-288 の副作用の欄」、初期「表 T-280 ・ 表 T-286 の初期の欄」（`RA-5`） |
| 表 T-284 `SS-6`（`:1079`） | 正「`PI-39`、表 T-280 の初期の欄」 | ＋「表 T-286 の初期の欄」 |
| 図 F-028（`:1031`〜）と前文 `:1026`〜`:1029` | 根 → 領域 `screen` と、破線の「次の領域」 | 実線の「領域 notices<br>通知（表 T-286）」を足し、破線の「次の領域」は残す（まだ 8 領域が無い）。前文の「軸と種類の全数は 表 T-280 が持つ」は例の軸の話なので変えない |
| 表 T-075 に `UF-87` | 74 行 | `UF-87` ／ `AdvanceScreenSession` ／ `notice-values.ts` ／ `pure` ／ 「通知の領域の遷移（表 T-286 〜 表 T-288）と、そこから生成した型と遷移表の定数の区画」／ `—`（決定 11）。`UF-86` の後 |
| 表 T-074 `SU-3`（`:245`） | 74 | **当てる時の 表 T-075 の行の数**（いまなら 75）。`SU-1` と `MN-2` は変わらない（コンポーネントを足さない） |
| `src/use-case/advance-screen-session/notice-values.ts` | 無い | 生成区画（判別共用体と `NOTICE_VALUES_TRANSITIONS`）、`emptyNoticeValues`、`stepNoticeValues`（`CR-436` の決定 12 の振り分け表）。⛔ モジュールスコープの可変状態を置かない（検査 61、`SF-7`） |
| `advance-screen-session.ts` | `ScreenSession { screen }`、`SessionEvent = ScreenValuesEvent` | `ScreenSession { screen; notices }`、`SessionEvent` ・ `SessionEffect` を 2 領域の和に、`emptyScreenSession` を広げ、出来事の `type` で領域を引く（`SS-5`: 触れない領域は同じ参照）。⚠️ 検査 60 の帯（50 行 / 15 分岐）に収める —— 引き先は `Record` で持つ（`CR-436` の決定 12 と同じ） |
| **契約試験** `tests/contract/state-machine-notices.contract.test.ts` | 無い | 原稿の領域 `notices` を読み、(1) 各軸の各種類 × 各出来事で `TN` の行がある組は先の種類が表と一致、(2) 行の無い組は同じ参照と共有の空の列（`SD-3`）、(3) 連言の元は組を作って確かめる（本書の行には無い見込み）、(4) 根: 通知の出来事は `screen` を同じ参照のまま残し、画面の値の出来事は `notices` を同じ参照のまま残す（`SS-5`）。⭐ 書くのは仕様だけを読む別の体（`RA-6`） |
| `audit-ch5.py` | `NOT_YET_CALLED = {AdvanceScreenSession: …}`、表 T-063 の行数 9 | 変えない（コンポーネントも 表 T-063 の行も増えない）。⚠️ `changelog.md` の版 0.29 の「`AdvanceScreenSession`（3）」を（4）にする —— 検査 33 がこの文を 表 T-075 と突き合わせる（`CR-436` 第 3 節、前例 `e33e4f3c`） |

### 3.2 波 A の直前の測り直し（⛔ 当てる体が打つ）

1. 表の番号と図の番号の上端、`T-286` 〜 `T-288` ・ `F-029` ・ `UF-87` ・ `SM-34` ・ `EV-31` ・ `TN-54` がまだ使われていないこと（相手の `F-030` 以降・`UF-72` 〜 `UF-83` とは帯が分かれているが、確かめる）。⭐ 当てた体が 2026-09-21 に `d3b6425b` で確かめた（冒頭の識別子の段）。
2. 表 T-075 の行の数（`SU-3` に書く数）と、`requirement-owner-baseline.txt` の `unfilled=` が前後で同じこと（決定 11）。⭐ 当てた後の 表 T-075 は 75 行（`npm run tree` が「75 units in 37 components」と刷った）。`unfilled=17` の試験は当てた後も緑。
3. 付録の根拠の行番号（`01-04-requirements.md` は並行して動く。動いていたら ID で引き直す）。⭐ 当てた体が ID で引き直し、付録の行番号はどれも `d3b6425b` のままだった。

---

## 4. 波 B1 —— 画面の通知をシェルへ結線する（段 5・段 6 と `CR-436` の波 B2 の後）

| 対象 | 案 |
|---|---|
| `raiseNotice` の 45 か所 | 移した領域の遷移の中なら副作用 `raiseNotice` を返す。まだシェルの流れ（ファイル操作・書き出しほか）に居る所は、シェルが `EV-31` で 1 段進める。⛔ `raiseNotice` の中の `if (settled(environment)) ask()`（`:2466`）は消す —— 根の参照が変わった段の後でフレームを求める 1 か所に吸われる |
| `dismissNewestNotice`（`:2476`〜`:2485`）・ `noticesWithout`（`:2470`〜`:2472`）・ `receiveInput` の `:4146` ・ `:4152` ・ `:4183`〜`:4187` ・ `:4199` ・ `:4218` | `EV-32` ・ `EV-33` へ。決定 6 の順（`EV-32` を先に進める）を `receiveInput` の頭に置く。⚠️ 呼び手の `collectInputContext(frame, noticeReasonsOnArrival.size > 0)` の第 2 引数は、先に進める前の根の状態から読む |
| `owesFrame`（`:4082`〜）の `noticesBefore` | 消す（2.1） |
| `recordFrame`（`:2052`）・ `recordedNoticeReasons`（`:2060`〜`:2064`）・ 画面の記述 `:2261` | 根の `notices.onScreen` から読む |
| `stackSafetyCapToldFor`（`:1889`） | 残す（フレームの値。決定 8）。変わったときに `EV-31`（`RS-24`）で 1 段進める |
| `exportScene`（`:2541`〜）と書き出しの 2 つの道（`:3441`〜`:3499`、`:3836`〜`:3866`） | 決定 9。`let` 2 つを消す。⚠️ `ST-7` の「書き出しを終えたあとで同じ通知を画面に上げること（MUST）」を保つ —— 保存が済んだ後（`:3464`〜`:3468`）とクリップボードへ書けた後（`:3863`）の 2 か所 |
| `T-283` の行 | 2.2 の 2 行（`CR-436` の波 B2 が「未移行」と書いた段を、状態のキー `notices.onScreen.standing` で埋める） |
| 表 T-075 の「負う要求」 | 決定 11 を 5.3 の規則で決め直す（`FR-076` の起点が `UF-67` のままか） |
| 性能 | `LM-19`。⛔ **測る前に利用者を呼ぶ** |

⇒ `frameLoop` の `let` は、`CR-436` の波 B2 の後の値から 4 減る（2026-09-21 の 66 で数えれば 66 − 12 ＋ 1 − 4 ＝ 51。⛔ 波 B1 の入口で測り直す）。

## 5. 波 B2 —— 配りの窓を移す

| 対象 | 案 |
|---|---|
| `apply-document-change.ts:68`〜`:74`、`:85`〜`:90` | モジュールの旗と `momentInsideTheWindow` を消す。`replaceThenTell` は `holder.replace` と `audience.deliver` を順に呼ぶだけになる（`WS-6` → `WS-7` の順は保つ） |
| `frame-loop.ts` の `audience`（`:1946`〜`:1951`） | 頭で `EV-34`、終わりで `EV-35`（運ぶ値 `silentWatchers`）。`RS-23` は `TN-63` の副作用として戻る。⛔ `try` ／ `finally` で `EV-35` を必ず進める（いまの `finally` の意味を保つ） |
| `collectWriteMoment`（`:3066`〜`:3072`）・ `readSnapshot`（`:2765`〜）・ `agent-api-members.ts:326` | `deliveringNotices` を根の `notices.delivery` から詰める |
| `module-state-baseline.txt` | `HELD src/use-case/apply-document-change/apply-document-change.ts:deliveringNotices` を消す（検査 61 は「どの発見も指さない `HELD` 行」を赤にするので、同じコミットで）。⛔ 数を利用者に見せてから前に立つ者が書く |
| 試験 | `use-case.test.ts:591` と `uf-8-9-replace-document.test.ts:858` は「`UseCase` が自分で窓を立てる」ことを主張している。移した後は、窓を詰めるのはシェルなので、`UseCase` 単体では成り立たない。⇒ シェルを通す形に書き直す（仕様だけを読む体）。`uf-27-28-29.test.ts:1040` は写しの `isDeliveringNotices` を通れば緑のまま |
| 5.5 の散文（`05-07-design.md:663` の段）と `PI-8`（`:500`） | 「配りの窓は、セッションの通知の領域の状態（表 T-286 の `SM-38`）である。書き込みの呼び手は、その状態から `WS-2` の時機を詰める」の 1 文（`CR-379`:178）。`PI-8` に「時機（`WS-2`）は呼び手が渡す」 |
| 台帳 | `DFC-583` の ① を閉じる候補（`deliveringNotices`）。`DFC-562` の直しは次の別のコミット（発話の配り `PostDialogueMessage` の道でもシェルが `EV-34` ／ `EV-35` を進める）。⚠️ `PND-456`（配りの中から発話したとき）は `G` のまま —— 窓の状態は変わらず、決めるのは発話を拒むかどうかのガードである |

---

## 5a. 問いの候補に打った 3 つの反証（`handoff.md` §0.2）

| 候補 | (1) `rulings.md` を grep | (2) `impact.py` | (3) 仕様・計画から導けるか | 結果 |
|---|---|---|---|---|
| 配りの窓（`AG-6` の購読者への配り）と画面の通知（`FR-076`）を 1 つの領域に入れてよいか | 「配布」1 件（`JDG-265`、無関係）、`deliveringNotices` ・ `REGISTRATIONS` 1 件（`JDG-280`、`components.json` の辺の話で無関係）、「通知の領域」0 件 | `WS-2` → 要求 2 件 ／ 参照 8 箇所（`FR-076` の `RS-7` 〜 `RS-9` ほか）。`WS-7` → 要求 0 ／ 参照 3 | **導けた** —— 計画の記録 4（`:241`・`:249`）と `CR-379` の決定 7（`CR-379`:54）が通知の領域と名指す | 決定 2 |
| `REGISTRATIONS` の置き場 | 同上 | —— | **導けた** —— `CR-379` の決定 7 と棚卸し E 節（`:160`） | 決定 10 |
| `Esc` ／ `Enter` が「届いた時点の最新」を消すか、同じ入力で上がったものを消すか | `NT-8` 0 件、`SK-19` 2 件（`JDG-153` の決定 1 = 倍率のメッセージは通知ではなく `SK-19` に数えない、ほか 1 件は語の一覧） | `NT-8` → 要求 5 件 ／ 参照 10（`FR-070` `:4158`、`FR-023` `:5332`、`FR-080` `:5463`、`FR-076` ほか）。どれも順を変えない | **導けた** —— `NT-8`「どの階層よりも先に行う（MUST）」 | 決定 6 |
| 通知が時間で消えるか（時間の出来事が要るか） | `JDG-153`（`rulings.md:265`）の決定 1「いまの通知（`NT-*`）は人が消すまで残る」 | `NT-3` → 要求 2 ／ 参照 5 | **導けた** —— `SE-5`（req:6743）が時間で消えるメッセージを通知から外す。`NT-2` の対象になる時間で消える通知は無い | 時間の出来事は置かない |
| 同じ `TaskGroup` の上限を 2 度告げない覚えを原稿に載せるか | `ST-7` 0 件 | `ST-7` → 要求 5 ／ 参照 6。覚えを名指す行は無い | **導けた** —— 5.5 の規則（`:713`〜`:714`） | 決定 8 |
| `RS-23`（配り先が答えない）をどの遷移が上げるか | `RS-23` 0 件 | **浮いている**（要求 0 ／ 参照 0） | **導けた** —— 行そのもの（req:6425、正 `AG-6`）が場面を名指し、`FR-076` の「本表に行を足す者は、その行へ振り分ける道が在ることまで確かめる」がいまの道（`frame-loop.ts:1950`）を裏づける | `TN-63` |

⇒ **3 つとも空だった候補は 0 件。問いは無い。**

---

## 6. 継ぎ目（体に渡すときは両方のブリーフに同じ字面で書く）

- 領域のキー `notices`、軸 `onScreen`（`none` ／ `standing`）・ `delivery`（`idle` ／ `delivering`）、型の幹 `NoticeValues`、ファイル `notice-values.ts`、公開は `emptyNoticeValues` ・ `stepNoticeValues` と生成した型、定数 `NOTICE_VALUES_TRANSITIONS`。
- 運ぶ値の名（原稿は名だけ。型はコードが決める —— 付録 A.4）。
- 根: `ScreenSession { readonly screen: ScreenValues; readonly notices: NoticeValues }`。出来事の `type` の重なり 0（決定 12）。

---

## 7. 数の予測

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行。
**起草時（`d3b6425b`、2026-09-21）: `tables=177  figures=20  rows=2329  uids=162`**（`CR-436` の追補の後の実測 `2325` から ＋4 は、本線の段 4 の波 1 の `UF-81` 〜 `UF-83` と `UT-8`）。

**波 A**:

| | 前 | 後（予測） | 差 | 内訳 |
|---|--:|--:|--:|---|
| tables | 177 | 180 | +3 | 表 T-286 ・ T-287 ・ T-288（生成物。md-checks は `_assets/*.md` を数える —— `CR-436` 第 7 節で確かめた） |
| figures | 20 | 21 | +1 | 図 F-029 |
| rows | 2329 | 2350 | +21 | `SM` 5 ＋ `EV` 5 ＋ `TN` 10 ＝ 20、`UF-87` の 1 |
| uids | 162 | 162 | 0 | 要求を足さない |

⚠️ 本線が先に当たると「前」が動く。⭐ **差だけを突き合わせる。**
**波 B1**: tables 0 ・ figures 0 ・ rows 0（`T-283` の行は `CR-436` の波 B2 が数える。本書はその段のセルを埋めるだけ）・ uids 0。
**波 B2**: 差 0（散文と `PI-8` のセル）。
**そのほかの数**: 表 T-075 74 → 75、`units.contract.test.ts` 74 → 75、`frameLoop` の `let` は波 B1 で −4、`UseCase` のモジュール状態 2 → 1（波 B2）、検査 61 の `HELD` 2 → 1（波 B2）。

---

## 8. 台帳の候補（⛔ 問いではない。⭐ 候補 1 ・ 2 は当てた体が `DFC-679` ・ `DFC-680` として書いた —— 改訂の記録の 9）

利用者の裁定（2026-09-13: 仕様とコードの食い違いは、どちらが正かを選ばずに台帳へ）に従い、台帳の体へ渡す。

| # | 食い違い | 片側 | もう片側 | 台帳の今 |
|---|---|---|---|---|
| 1 | ⚠️ **未検証（画面で押していない）** —— 通知が上がってから描かれるまでのあいだ、面の写し `isNoticeShowing` は古い（`dom-screen-surface.ts:2540` は描いたときだけ書く）。その間に入力欄の中で `Esc` を押すと、面は入力欄の取り消しに `Esc` を渡し（`:2792` の判定が偽）、シェルは届いた時点の通知を消す（`frame-loop.ts:4146` ・ `:4218`）—— 1 回の `Esc` が 2 つの段を使う疑い | `IN-4`（req:6795）「1 階層ぶん消費し」、`NT-8`（req:6389）「どの階層よりも先に」 | 窓はおよそ 1 フレーム | 0 件（新しい行の候補） |
| 2 | 記録に書く通知の理由の行 ID の範囲 | `IR-3`（req:4690）「理由の行 ID（表 T-233 の `RS-` の行）」 | `FR-076` の結び（req:6466）は取り込みの検証の拒否の通知に 表 T-220 の行 ID を運ばせる。コード `recordedNoticeReasons`（`frame-loop.ts:2063`）はどちらもそのまま書く | 0 件（仕様どうしの字面の差。`IR-3` は `impact.py` で浮いている —— 要求 0 ／ 参照 0） |
| 3 | `UseCase` のモジュール状態 `deliveringNotices` | `SF-7`（des:992）、5.3（des:271） | `apply-document-change.ts:69` | ⭐ **既に `DFC-583` が持つ**（新しい行は要らない。波 B2 で閉じる候補） |
| 4 | 発話の配りが窓を立てない | 5.5（des:663） | `frame-loop.ts:2783` の `dialogueSeams` | ⭐ **既に `DFC-562`（`実装待ち`）** |
| 5 | 束ねる `affectedCount` が無い（`null`）ときの足し方を `NT-3` が語らない | `NT-3`（req:6383）「同じ理由の通知が既に立っているときは、新しく積まずに、その 1 枚の件数を増やすこと（MUST）」 | `notice-values.ts:209` の `onNoticeRaised` は `(same.affectedCount ?? 1) + (event.affectedCount ?? 1)` —— 「無ければ 1 と数えて足す」を選ぶ | `DFC-681`（`仕様待ち`） |

⚠️ 移すと消える差（台帳は要らない見込み）: `noticesWithout`（`frame-loop.ts:2470`〜`:2472`）は、押された鍵がどの通知にも当たらないときも新しい配列を返し、`owesFrame`（`:4096`）がフレームを負う。遷移は `SD-3` で同じ参照を返すので、波 B1 で消える。

---

## 9. 影響 —— 本書の外で動くもの

| 所 | 何が動くか | いつ |
|---|---|---|
| `docs/development-records/refactor-plan-report-2026-09-13.md` | 記録 4 の移す順の 2 番目に着地先 | 波 A ／ B2 |
| `docs/development-records/handoff-state-machine.md` | §2 の表に第 2 領域、§3 の「次の領域」 | 波 A |
| `docs/development-records/changelog.md` | A-appendix の 1 行と、版 0.29 の「`AdvanceScreenSession`（3）」→（4） | 波 A |
| `CR-436` | 波 B2 の `T-283` に 2.2 の申し送り（`Enter` と `y` ／ `n` の順）。⛔ 本書は `CR-436` を書き換えない —— 前に立つ者が申し送る | 波 A の後 |
| `.claude/skills/spec-graph-check/module-state-baseline.txt` | `HELD` 1 行を消す（利用者に見せてから） | 波 B2 |
| `docs/development-records/defects.md` | `DFC-583` の ① を閉じる候補、第 8 節の候補 1 ・ 2 | 波 B2 ／ 台帳の体 |
| `docs/review/components/components.md` と図 F-013 〜 F-017 | 見込み 0（コンポーネントも辺も増えない —— `notice-values.ts` が読むのは `session-step.ts` だけの見込み。当てる体は `EG-2` ・ `EG-3` で数える） | 波 A |

---

## 10. ⛔ この変更でやらないこと

- ⛔ 波 A で `src/adapter` ・ `src/framework` ・ `apply-document-change.ts` に触らない
- ⛔ `T-283` を取らない、`CR-436` の原稿の行（`SM-0` 〜 `TN-53`）を変えない
- ⛔ `REGISTRATIONS`（Agent API）・ `asking`（`NT-7`、ファイル操作と問いの待ち）・ `NT-4` の起動時の用件（Agent API）・倍率のメッセージ（`SE-5`、画面の値）を入れない
- ⛔ `DFC-562` を移す波で直さない（`JDG-57`）
- ⛔ 基準線を体に触らせない

---

## 付録 —— 第 2 領域「通知」の原稿の行

**略記**: `req` ＝ `docs/spec/01-04-requirements.md`、`des` ＝ `docs/spec/05-07-design.md`。行番号は `d3b6425b`。表の行は第 1 セルがその ID の行（`grep -nE "^\| <ID> \|"`）、要求は `**UID**:` の行。
⚠️ 根拠に置けるのは行 ID と要求 ID だけである（生成器の `defined_ids()` は表の番号を定義として数えない —— `state_machines_json_to_md.py:79`〜`:101`）。⇒ 5.5 の散文（des:663）は根拠の列に置けず、`WS-2` と `RS-9` で代える。
キーの頭の `notices.` は `TN` では省く。「自己」は同じ種類へ戻る遷移（運ぶ値の書き換えか副作用のため）。

### A.1 `SM`（状態）5 行

| 行 | キー | 親 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|---|---|
| SM-34 | `notices` | —（領域の根） | ○ | — | `FR-076` req:6368 |
| SM-35 | `notices.onScreen.none` | `notices` | ○ | — | `NT-8` req:6389（「消すものが 1 つも無いとき」）、`IN-4` req:6795 |
| SM-36 | `notices.onScreen.standing` | `notices` | | `standing`（出ている通知の列。古い順。1 つは理由と件数） | `FR-076` req:6368、`NT-3` req:6383、`NT-8` req:6389、`IN-4` req:6795 と `SK-19` req:4158（「出ている通知」）、`IR-3` req:4690 |
| SM-37 | `notices.delivery.idle` | `notices` | ○ | — | `WS-7` des:650 |
| SM-38 | `notices.delivery.delivering` | `notices` | | — | `WS-2` des:645、`RS-9` req:6414、`CA-3` des:962 |

### A.2 `EV`（出来事）5 行

| 行 | キー | どこから来るか | 運ぶ値 | 根拠 |
|---|---|---|---|---|
| EV-31 | `noticeRaised` | 副作用の結果（副作用 `raiseNotice` の実行 —— ほかの領域の遷移とシェルの流れが返す。決定 4） | `reason`（表 T-233 の `RS-` の行、または 表 T-220 の行）、`affectedCount`（無いこともある） | `FR-076` req:6368、`NT-3` req:6383 |
| EV-32 | `newestNoticeDismissAsked` | 入力: `Esc`（`IN-4` の第 1 段）／ `Enter`（`SK-19` の第 1 段）。呼び手が段を決める（決定 5）。同じ入力のほかの何よりも先に進める（決定 6） | — | `NT-8` req:6389、`IN-4` req:6795、`SK-19` req:4158 |
| EV-33 | `noticeDismissPressed` | 入力: 1 つの通知の `OK` の入口を押して離した | `reason`（起草は `dismissKey`。改訂の記録の 2） | `NT-8` req:6389 |
| EV-34 | `documentReplaced` | 副作用の結果（`WS-6` の差し替えが済み、`WS-7` の配りが始まる） | — | `WS-6` des:649、`WS-7` des:650 |
| EV-35 | `changeDelivered` | 副作用の結果（`WS-7` の配りが終わった） | `silentWatchers`（答えを返さなかった配り先の数） | `WS-7` des:650、`AG-6` req:6056 |

### A.3 `TN`（遷移）10 行

| 行 | 元 | 出来事 | ガード | 先 | 副作用 | 根拠 |
|---|---|---|---|---|---|---|
| TN-54 | `onScreen.none` | EV-31 | — | `onScreen.standing`（1 枚） | — | `FR-076` req:6368、`NT-8` req:6389 |
| TN-55 | `onScreen.standing` | EV-31 | `isSameReasonStanding` | 自己（その 1 枚の件数を増やし、いちばん新しい位置へ動かす） | — | `NT-3` req:6383 |
| TN-56 | `onScreen.standing` | EV-31 | `not isSameReasonStanding` | 自己（いちばん新しいものとして足す。枚数に上限を置かない） | — | `NT-3` req:6383、`NT-8` req:6389 |
| TN-57 | `onScreen.standing` | EV-32 | `isOnlyOneStanding` | `onScreen.none` | — | `NT-8` req:6389 |
| TN-58 | `onScreen.standing` | EV-32 | `not isOnlyOneStanding` | 自己（いちばん新しいものを除く） | — | `NT-8` req:6389 |
| TN-59 | `onScreen.standing` | EV-33 | `leavesNone` | `onScreen.none` | — | `NT-8` req:6389 |
| TN-60 | `onScreen.standing` | EV-33 | `leavesSome` | 自己（押されたものを除く） | — | `NT-8` req:6389 |
| TN-61 | `delivery.idle` | EV-34 | — | `delivery.delivering` | — | `WS-2` des:645、`WS-7` des:650 |
| TN-62 | `delivery.delivering` | EV-35 | `not hasSilentWatcher` | `delivery.idle` | — | `WS-7` des:650 |
| TN-63 | `delivery.delivering` | EV-35 | `hasSilentWatcher` | `delivery.idle` | `raiseNotice(RS-23)` | `RS-23` req:6425、`AG-6` req:6056 |

⭐ **行の無い組**（`SD-3` で同じ参照）: `onScreen.none` × `EV-32` ・ `EV-33`（`NT-8` の「消すものが無いときに消費しない」—— 段は呼び手が作らないが、来ても何も変えない）、`onScreen.standing` × `EV-33` で押した鍵がどの通知にも当たらないとき（`leavesNone` も `leavesSome` も偽）、`delivery.delivering` × `EV-34`（配りの中の書き込みは `WS-2` で拒まれるので、入れ子の差し替えは起きない）、`delivery.idle` × `EV-35`。
⭐ 2 つの軸は直交するので、`onScreen` の行はどの `delivery` の種類の下でも当たり、逆も同じである（契約試験は 2 × 2 の組で数える）。

### A.4 運ぶ値の型（コードが決める。原稿は名前だけ —— 表 T-250 の `SD-1` ・ `SD-2`）

| 名 | 型の見込み | 置き場 |
|---|---|---|
| `standing`（`SM-36`） | `readonly { reason: string; affectedCount: number \| null }[]`（古い順。`manner` は理由から導くので持たない —— いまの `RaisedNotice`（`src/adapter/screen-renderer/screen-renderer.ts:321`）の `manner` は `NOTICE_MANNER_OF_REASON[reason]`（`frame-loop.ts:2463`）で導いている） | `notice-values.ts`。⚠️ `UseCase` は `Adapter` の `RaisedNotice` を読めない（表 T-061）ので、同じ形の型を領域に置き、波 B1 で描き手に集約の型を読ませる（`CR-436` 第 4 節の移行と同じ） |
| `reason` ・ `affectedCount`（`EV-31`） | `string` ・ `number \| null` | 同上 |
| `reason`（`EV-33`。起草は `dismissKey`） | `string` —— 押された通知の理由。⭐ 当てた形: 領域は `manner` を持たないので、`dismissKeyOf`（`src/adapter/screen-renderer/notices.ts:116`）の鍵を組めない。束ね（`NT-3`）により 1 つの理由につき 1 枚なので、理由そのものを鍵にした。鍵から理由へ戻すのは波 B1 の入力の翻訳係 | 同上 |
| `silentWatchers`（`EV-35`） | `number`（`NotifyOutcome.failures.length` —— `notify-change-watchers.ts:29`） | 同上 |
| 副作用 `raiseNotice` | `{ type: 'raiseNotice'; reason: 'RS-23' }` | 同上 |

---

## 改訂の記録 —— 波 A を当てた（2026-09-21）

当てた体が、当てたものに合わせて本書を直した。波 B1・B2 の中身は変えていない。
方法: `npm run gen:check`、`npx tsc -p . --noEmit`、`npx vitest run`、`bash .claude/skills/spec-graph-check/check.sh` を worktree で走らせた。md-checks の最終行の実測は `tables=180  figures=21  rows=2350  uids=162` —— 第 7 節の波 A の予測（差 +3 ・ +1 ・ +21 ・ 0）と一致した。

| # | 起草時の文 | 直した文 | 理由 |
|---|---|---|---|
| 1 | 状態「起草」、識別子の段と 3.2 の現在形の主張 | 状態「波 A を当てた」、識別子の段と 3.2 を過去形の履歴へ | `CR-436` の改訂の記録の 11 と同じ。検査 62 は当てた後の現在形の主張を赤にする（起草のままでも 3.2 の 1 が「`T-286` を表の上端」と読まれて赤だった） |
| 2 | `EV-33` の運ぶ値 `dismissKey`（A.2 ・ A.4） | `reason`（押された通知の理由。原稿の注に「理由が通知を 1 つに決める」） | 領域は `manner` を持たない（A.4）ので、`dismissKeyOf` の鍵を領域の中で組めない。仕様だけを読む試験の体が入力を組めるよう、鍵を理由そのものにした。`EV-31` の `reason` と同じ型（`string`） |
| 3 | 生成器は変えない見込み（3.1） | `tools/generate_state_machine_types.py` は、単一の共用体の入れ子を持たない領域には `<STEM>_INITIAL_CHILDREN` を刷らない | 通知の領域は入れ子を持たないので、空の定数が刷られ、`noUnusedLocals` が読まれない定数を拒む。⇒ 生成定数の一覧（`03-implementation.md`）に足したのは `NOTICE_VALUES_INITIAL_AXES` と `NOTICE_VALUES_TRANSITIONS` の 2 つ |
| 4 | 決定 12 の検査（生成器） | `state_machines_json_to_md.py` の `shared_event_keys` —— 同じ出来事のキーを 2 つ以上の領域が持てば `load()` が拒む | わざと壊して確かめた: 通知の領域に `escapePressed` を足すと「event escapePressed is held by more than one region (screen, notices)」の 1 件、壊さない原稿は 0 件 |
| 5 | 根の引き先は `Record`（3.1） | `advance-screen-session.ts` の `IS_NOTICE_EVENT`（通知の出来事の型をキーにした `Record`）。当たれば通知の領域、外れれば画面の値の領域 | 通知の出来事を原稿に足してここに書き漏らすとコンパイルが落ちる。画面の値の側の継ぎ目（`CR-436`）は変えていない |
| 6 | 図 F-028 に実線の「領域 notices」を足す | それに加え、下の段（1 段の前と後）に「領域 notices は同じ参照」の 1 本を足した | 軸 `palette` だけに触れた 1 段で、通知の領域が同じ参照のまま残ること（`SS-5`）を、まだ無い領域だけでなく実在の領域でも示すため |
| 7 | 波 A の触る所（3.1） | 生成器の単体試験 `tests/unit/uf-87-the-notices-transition-table-is-printed-from-the-manuscript.test.ts`（`UF-86` の試験と同じ形）と、出どころの検査 `check-provenance.py` の 1 行を足した | 生成した遷移表が原稿と行ごとに一致することを見る。`NOTICE_VALUES_TRANSITIONS` はこの試験が読むので、検査 30 の「読まれるものだけを公開する」にも合う |
| 8 | 付録 A.4 の型の見込み | 当てた型: 状態の運ぶ値 `standing: readonly StandingNotice[]`（`StandingNotice = { reason: string; affectedCount: number \| null }`、古い順、`standing` の種類では空でない）、出来事の運ぶ値 `reason: string` ・ `affectedCount: number \| null` ・ `silentWatchers: number`、副作用 `{ type: 'raiseNotice'; reason: 'RS-23' }` | 見込みのとおり。束ねた 1 枚の件数は、いまのコード（`frame-loop.ts` の `raiseNotice`）と同じく「立っている件数（無ければ 1）＋ 上がった件数（無ければ 1）」とした |
| 9 | 第 8 節「`defects.md` には本書は書かない」 | 候補 1 を `DFC-679`（`未検討`）、候補 2 を `DFC-680`（`裁定待ち`）として書いた。どちらが正かは選んでいない | 前に立つ者の依頼（波 A の依頼の 4）。`row_id_prefixes_json_to_md.py` と `ledger_metrics.py` を走らせた |
| 10 | 契約試験（3.1 の表の 1 行） | 当てた体は書いていない | `RA-6`: 書くのは仕様だけを読む別の体である |
| 11 | 第 3.1 節の契約試験のファイル名を `state-machine-notice-values.contract.test.ts` と書いた、第 8 節に `NT-3` の `affectedCount` が無いときの足し方の穴がなかった | ファイル名を実在の `tests/contract/state-machine-notices.contract.test.ts` へ全篇で直し、第 8 節に候補 5 を足して `DFC-681`（`仕様待ち`）として台帳へ渡した | 反証（2026-09-21）: 実在のファイルは `tests/contract/state-machine-notices.contract.test.ts`であり、`-values` 付きのファイルは存在しない。`NT-3`（req:6383）は件数が無い枚の足し方を述べず、実装（`notice-values.ts:209`）は「無ければ 1 と数えて足す」を選んでいるが、改訂の記録の 8 はその選び方を述べるだけで、`NT-3` 自体は直していない |
