# CR-701 —— 非稼働日に端を置いたときの問い（`QN-13`）をやめる —— `CR-668` の問いを戻し、書き出す完了率のずれを制限事項に書く

> 起草の状態: 当てた（2026-10-08、作業木 `4e5547e8` の上）。起草・仕様・コード・既存の試験の直しを同じ作業木で行った。仕様だけを読む試験は別の体が書く（9 節）。
> ID の帯: 番号 `CR-701` は調整役から受けた（`4e5547e8` の木で `CR-701` を名乗るファイルは 0 件 —— 13 節）。台帳の帯 `DFC-2240`〜`DFC-2244` も受けたが、使わなかった。仕様の新しい識別子は制限事項の行 `LM-22` の 1 つだけ（表 T-004 の最大は `LM-21`、木のどこにも `LM-22` は 0 件 —— 13 節）。
> 当てる裁定: `JDG-1610`・`JDG-1611`（`docs/development-records/rulings.md` の 2026-10-08 の裁定の席の節）。`JDG-1437` は全部、`JDG-1436` は一部が覆された（どちらも状態の欄の印は既に在る —— 本書は確かめただけ）。
> 退役させるもの: 要求 `FR-154`、表 T-354（`HW-1`〜`HW-12`）、表 T-234 の `QN-13`、行の頭字 `HW`。番号は再び使わない（`.claude/skills/spec-graph-check/retired.py` に席を残す）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `rulings.md` の該当行）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1610` | 「非稼働日に置きますか？ の問いを出さない。   非稼働日にいつでもタスクやマイルストーンを置ける。 理由：置けないと面倒。 ただし、その場合の挙動を再確認させろ。」 | `QN-13` の問いを消す。端はいつでも非稼働日に置ける（`FR-103` の結びは元からそう言う）。`FR-154` と 表 T-354 を退役させる（E-01〜E-05） |
| `JDG-1611` | 「この動きでよい。 休日出勤を行うにあたり、休日を稼働日にするか否かはユーザーの判断による。」 | 端は非稼働日にそのまま置き、暦は変えない。休日を稼働日にするかは利用者が暦の編集面（`FR-088`）で決める。書き出す完了率のずれを 表 T-004 の `LM-22` に書く（E-06・E-07） |

### 0.2 裁定の鎖（rulings.md を「非稼働日」「休日」「稼働日へ寄せ」「QN-13」「FR-154」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-67` | 非稼働日で離したら、その非稼働日を終了点とする（寄せない） | 保つ。本書の後の振る舞いそのもの |
| `JDG-69` | 実績は日付が正。長さは日付から数える（`FR-011`） | 保つ |
| `JDG-478`・`JDG-479` | 予定・実績が非稼働日でも遅延診断の疑義にしない | 保つ |
| `JDG-1436` | 休日出勤したら休日を稼働日に変えろ | 一部覆された（`JDG-1611`）—— 状態の欄に印が在る |
| `JDG-1437` | 置いたときに問う | 覆された（`JDG-1610`・`JDG-1611`）—— 状態の欄に印が在る |
| `CR-682` の決定 5（`NT-7`） | どの問いが立っているあいだも書き込みを受けない | 保つ。`FR-154` が持っていた理由は `NT-7` が既に一般に持つ |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-003`（操作が引っかからない）—— 休日に端を置くたびに出ていた問いが消え、引いて離せば置き終わる。
- `GL-008`（予定と実績の工数の差を読む）—— 画面の完了率（`FR-012`）は変わらない。書き出す `PercentComplete` と `ActualDuration ÷ Duration` のずれは、隠さず `LM-22` に書く。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- `R1.3`（唯一の正）—— ずれの事実は `FR-012` の RATIONALE が既に 1 文持つ。制限事項としての許容の理由は `LM-22` の 1 行に置き、`FR-012` の文は `LM-22` を指すだけにする（E-07）。
- `R1.4`（境界）—— 既に稼働日の日、間の非稼働日、再開日、期限、取り込み、`Agent API`、写し —— どれも元から問わない。問いを消すと、すべての場面が同じ答え（問わない・寄せない・暦を変えない）になる。
- `R2.21`（1 つの仕事は 1 か所）—— 暦を稼働日にする道は 暦の編集面（`FR-088` の 表 T-344）1 つに戻る。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | `FR-031` の RATIONALE を `CR-668` の前の字に戻す（階級を広げた 2 行を元の 1 行へ） | `CR-668` の 3 節が「消す文」に挙げた元の文がそのまま在る。広げた理由は `FR-154` だけだった | 無い |
| X-2 | `isWorkingDay` の公開の行（`published-entries.json`）は残し、`FR-154` を名指す 2 行目だけを消す | 1 行目「その日が文書の暦の稼働日か（`FR-054`）。」は今も真。行を消すと公開の名簿が変わり、本書の範囲を越える | `EditDocument` は今はこれを読まない |
| X-3 | `FR-012` の RATIONALE の ⚠️ の文は、ずれの事実を言い直さず `LM-22` を指すだけにする（`LM-7` を指すのをやめる） | `LM-7` は 100 を超える完了率を相手がどう扱うかであり、ずれそのものではない。同じ文を 2 か所に置くと検査 11 が重なりとして挙げる（当てた後に測った） | 無い |
| X-4 | `QN-13` を問いの例に使っていた試験（`tests/system/w3-t1-a-standing-question-holds-the-document.test.ts`）は、問いを `QN-10`（すべての行の削除、`IC-106`）に替える | `NT-7` の「問いが立っているあいだは書き込みを受けない」は問いの種類によらない。`QN-10` は束を負う（`owedAction` が書き込み）ので同じ道を通る | 試験の前提の 1 つが変わる |
| X-5 | `CR-668` の画面の試験（`tests/system/cr-668-a-plan-end-released-on-a-saturday.test.ts`）は、まだ真の 2 つの場合（金曜で離すと何も問わない／土曜で離すと端は土曜、暦と塗りはそのまま）を残し、名を `cr-701-…` に改めて `FR-031` と `FR-103` の結びを指す。`QN-13` を立てる場合はすべて退役させる | 古い振る舞いを固めた試験は同じ変更で直す（`cr-body-brief` 7）。残す 2 つは本書の後も真である | 新しい条項（`LM-22`）を引く試験は本書では書かない |
| X-6 | `perf-pending.md` の 95 行（`CR-668`）は消さず、本書の行を足す | 測って緑のときだけ行を消す（`PW-4`）。本書は毎フレームの経路（`screen-renderer.ts`・`notices.ts`・`tooltips.ts`・`frame-loop.ts`）から仕事を減らすだけだが、規則どおり測り待ちに載せる | 測る行が 1 つ増える |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 要求と表を退役させる | `docs/spec/01-04-requirements.md` の `FR-154` の節（表 T-354 を含む） | E-01 |
| 確認を求めてよい場面の階級を元に戻す | 同 `FR-031` の RATIONALE | E-02 |
| `FR-103` の結びから `FR-154` を指す 1 行を消す | 同 `FR-103` | E-03 |
| `NT-7` の ⚠️ の 1 文を消す | 同 `FR-076` の 表 T-037 の `NT-7` | E-04 |
| 問いの行を消す | 同 表 T-234 の `QN-13`、`FR-086` の数の文（表 T-234 の 11 行 → 10 行） | E-05 |
| 書き出す完了率のずれを制限事項に書く | 同 表 T-004 に `LM-22` | E-06 |
| `FR-012` の ⚠️ の文が `LM-22` を指す | 同 `FR-012` の RATIONALE | E-07 |
| 問いの文の語 | `docs/spec/_source/display-words.json` の `QN-13` | E-08 |
| 状態機械 | `docs/spec/_source/state-machines.json` の 6 か所 | E-09 |
| 公開の入口の注 | `docs/spec/_source/published-entries.json` の 3 か所 | E-10 |
| 行の頭字 | `docs/spec/_source/row-id-prefixes.json` の `HW` | E-11 |
| 設計の単位と要求の数 | `docs/spec/05-07-design.md` の 表 T-075 の `UF-16` と「負う要求」の結びの数 | E-12 |
| 退役の席 | `.claude/skills/spec-graph-check/retired.py`・`dictionary-table-pairing.txt` の `QN-13` の 1 行 | E-13 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行 | E-14 |

数: 要求 −1（`FR-154`）。表 −1（表 T-354、12 行）。表の行 −1（`QN-13`）、＋1（`LM-22`）。辞書 −1（`QN-13`）。頭字 −1（`HW`）。設定値 ±0。図 0。命令（表 T-108）±0。`Agent API` のメンバ ±0。`（MUST）` の印 −3、`（MUST NOT）` の印 −2（どれも `FR-154` の RATIONALE と `FR-031` の広げた文）。

---

## 2. 新しい識別子

| 識別子 | 何 | 測り方 |
|---|---|---|
| `LM-22` | 表 T-004 の行。予定の端を非稼働日に置いたタスクの、書き出す完了率のずれ | 表 T-004 の最大は `LM-21`。木に `LM-22` は 0 件（13 節） |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| # | 場所（`4e5547e8`） | 消す文・行 | 代わり |
|---|---|---|---|
| 1 | `01-04-requirements.md` の `FR-154` の節（見出し「非稼働日に置いた端の日を、稼働日にするか問う」から Relations まで） | 要求のすべて —— STATEMENT・ORIGIN・RATIONALE（`MUST` 2 つ・`MUST NOT` 2 つ）・表 T-354 の 12 行（`HW-1`〜`HW-12`）・Relations | 無い（退役。席は `retired.py`） |
| 2 | `FR-031` の RATIONALE | 「例外は、取り消しで取り戻せないものを失う場面と、人の 1 つの所作が文書ぜんたいの設定（表 T-027 の `UN-13`）を変えうる場面に限る（MUST）。」と「⚠️ 後の場面の問いは、続けるか取りやめるかではなく、何を書くかを選ばせる —— 文書ぜんたいの設定は 1 つの値がすべてのタスクに効くので、人が選ばないまま変えてはならない（`FR-154`）。」 | `CR-668` の前の 1 行「例外は、取り消しで取り戻せないものを失う場面に限る（MUST）。」 |
| 3 | `FR-103` の結び | 「⭐ 置いた日が非稼働日のとき、その日を稼働日にするかは `FR-154` が問う —— 端は寄せず、暦の側を変える。」 | 無い |
| 4 | 表 T-037 の `NT-7` の終わり | 「<br>⚠️ `FR-154` の問いは、取りやめる代わりに文書の暦を変えずに続ける —— `No` でも端は置く。」 | 無い |
| 5 | 表 T-234 | `QN-13` の行 | 無い |
| 6 | `FR-086` の RATIONALE | 「表 T-234 の 11 行」 | 「表 T-234 の 10 行」 |
| 7 | `FR-012` の RATIONALE の ⚠️ の文の後半 | 「—— 予定の端を非稼働日に置いたタスクに限り、書き出す `PercentComplete` は `ActualDuration ÷ Duration` と一致しない（`LM-7`）。」 | 「—— 書き出す `PercentComplete` とのずれは 表 T-004 の `LM-22` が持つ。」（同じ事実を 2 か所で言わない —— 検査 11 が `LM-22` との重なりを見つけた） |
| 8 | `_source/display-words.json` の問いの文 | `QN-13`（ja「{days} は非稼働日です。稼働日にしますか？」／ en「Non-working day(s): {days}. Make them working days?」） | 無い |
| 9 | `_source/state-machines.json` の `changeQuestionRaised` の出どころ | 行 `FR-154`・`QN-13`、注の「・非稼働日に置いた端」 | 無い |
| 10 | 同 `changeQuestionRaised` の運ぶ値 `question` | `QN-13` | 無い |
| 11 | 同 `questionAsked` の運ぶ値 `question` と根拠 | `QN-13`（2 か所） | 無い |
| 12 | 同 `confirmationAnswered` の `questionAsked` の枝 | 「not `isProceeding` & `hasDeclinedWrites` / `carryOutOwedAction`（根拠 `NT-7`・`FR-154`）」と「not `isProceeding` & not `hasDeclinedWrites`」の 2 枝 | `CR-668` の前の 1 枝「not `isProceeding`」（根拠 `NT-7`） |
| 13 | `_source/published-entries.json` | `nonWorkingDayQuestionOwedBy` と `NonWorkingDayQuestion` の 2 行、`isWorkingDay` の注の 2 行目「`EditDocument` が、人の置いた端の日を問うかを決めるために読む（`FR-154`）」 | 無い（`isWorkingDay` の 1 行目は残す —— X-2） |
| 14 | `_source/row-id-prefixes.json` | 頭字 `HW`（Holiday Work） | 無い |
| 15 | `05-07-design.md` の 表 T-075 の `UF-16` | 「<br>人の置いた端の日が非稼働日かを判じ、稼働日にする `CM-39` を組むのも本ユニットである（`01-04-requirements.md` の `FR-154`）」と負う要求の「・`FR-154`（`OW-2`）」 | 無い |
| 16 | `05-07-design.md` の「負う要求」の結び | 「要求は 133 件である（`FR` が 120 件、`NFR` が 13 件）。」「そのうち 121 件」 | 「132 件（`FR` が 119 件）」「120 件」 |
| 17 | `.claude/skills/spec-graph-check/dictionary-table-pairing.txt` | 「T-234 QN-13 …」の 1 行 | 無い |

⭐ 消さないもの: `FR-103` の結び「⛔ 掴んだ端点を置いた日を、稼働日へ寄せてはならない（MUST NOT）」、`GO-3` の「離した日が非稼働日であっても、その日を最後の日とすること（MUST）」、`FR-011` の両端の数え方、`DV-8` の数え方、`FR-088` の暦の編集面のすべて、`NT-7` の「問いが立っているあいだは、文書への書き込みを受けてはならない（MUST NOT）」（`CR-682`）、`AG-9`、`isWorkingDay` の公開の 1 行目。

---

## 4. 書き直す所

⛔ 作法: 置き換える前に、旧がそのファイルに 1 回だけ現れることを数えた（13 節。どれも 1 回）。どのファイルも `4e5547e8` で LF。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-154` の節（「#### 非稼働日に置いた端の日を、稼働日にするか問う」から、次の「#### 縮小しても、どれも指せる」の前まで）を消す。

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`FR-031` の RATIONALE の 2 行（3 節の 2）を次の 1 行に戻す:

```text
例外は、取り消しで取り戻せないものを失う場面に限る（MUST）。  
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`FR-103` の結びの 1 行（3 節の 3）を消す。

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`NT-7` の終わりの「<br>⚠️ `FR-154` の問いは、取りやめる代わりに文書の暦を変えずに続ける —— `No` でも端は置く。」を消す（`CR-668` の前の終わり「…行を持たない。<br>** |」に戻る）。

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
表 T-234 の `QN-13` の行を消す。`FR-086` の RATIONALE の「表 T-234 の 11 行」を「表 T-234 の 10 行」にする（行を数えた —— `QN-1`〜`QN-5`・`QN-8`〜`QN-12`）。

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
表 T-004 の `LM-21` の行の後に足す:

```text
| LM-22 | 予定の端を文書の暦の非稼働日に置いたタスクに限り、書き出す `PercentComplete` は `ActualDuration ÷ Duration` と一致しない —— `FR-011` と `FR-012` は端の日を非稼働日でも 1 日と数え、交換相手へ書く `Duration`（`_assets/fig-erd-detail.md` の `DV-8`）は非稼働日を数えない | 利用者が、端を非稼働日に置いても `GRS` は問わず、文書の暦も変えないと定めた —— 置くたびに問うと手が止まる。<br>休日に働くとき、その日を稼働日にするかは利用者が決め、暦の編集面（`FR-088` の 表 T-344）で変える —— 変えればその日が `Duration` の数えに入り、ずれは消える。<br>⚠️ 端を稼働日へ寄せて揃えることはしない（`FR-103` の結び） |
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
`FR-012` の RATIONALE の ⚠️ の文の後半（3 節の 7）を「—— 書き出す `PercentComplete` とのずれは 表 T-004 の `LM-22` が持つ。」にする。

<!-- EDIT id=E-08 file=docs/spec/_source/display-words.json -->
問いの文の `QN-13` の項を消す。`npm run words` が `src/adapter/screen-renderer/display-words.json` を刷る。

<!-- EDIT id=E-09 file=docs/spec/_source/state-machines.json -->
3 節の 9〜12 のとおり。最後の枝は次の形に戻す:

```text
{ "to": "notAsked", "guard": [ { "name": "isProceeding", "not": true } ], "evidence": [ "NT-7" ] }
```

<!-- EDIT id=E-10 file=docs/spec/_source/published-entries.json -->
3 節の 13 のとおり。

<!-- EDIT id=E-11 file=docs/spec/_source/row-id-prefixes.json -->
頭字 `HW` の項を消す（使われない頭字の登録は生成器が拒む）。

<!-- EDIT id=E-12 file=docs/spec/05-07-design.md -->
3 節の 15・16 のとおり。

<!-- EDIT id=E-13 file=.claude/skills/spec-graph-check/retired.py -->
`FR-154`・`T-354`・`QN-13`・`HW-1`〜`HW-12` を、理由（本書・`JDG-1610`・`JDG-1611`、名指す文書は `CR-668`・`CR-682`・`CR-689`・変更履歴・`rulings.md`）を添えて足す。`dictionary-table-pairing.txt` から `T-234 QN-13` の 1 行を消す（対が無くなった）。

<!-- EDIT id=E-14 file=docs/development-records/changelog.md -->
変更履歴の表の終わりに次の版の 1 行を足す。

### 4.1 生成物

`npm run gen`・`npm run words`・`npm run gen:index`・`npm run gen:tests` が、`_assets/tbl-row-id-prefixes.md`・`_assets/tbl-state-machines.md`・`_assets/tbl-published-entries.md`・`src/adapter/screen-renderer/display-words.json`・`docs/review/public-entry-index.md`・`docs/development-records/test-inventory.md` を刷る。手で直さない。

---

## 5. 継ぎ目（コード）

`CR-668` が足したものを、後の変更（`CR-682` の問いの間の書き込み、`CR-692`）を残して取り除く。

| ファイル | 取り除くもの |
|---|---|
| `src/use-case/edit-document/edit-calendar.ts` | `NonWorkingDayQuestion`・`nonWorkingDayQuestionOwedBy` と、その下の `placedDaysOf`・`movedActualDays`・`movedDays`・`exceptionsWorkingOn`・`holidayWithout`・`workingRowOn`、使われなくなった import |
| `src/use-case/edit-document/edit-document.ts` | 上の 2 つの再公開 |
| `src/use-case/advance-screen-session/file-flow-values.ts` | `FileFlowQuestion` の `'QN-13'` と `days`、`FileFlowOwedAction` の `declinedWrites`、`declinedEffects`（`answeredQuestion` は `CR-668` の前の 2 行に戻す） |
| `src/framework/single-html-shell/frame-loop.ts` | `NON_WORKING_DAY_QUESTION`、`changeQuestionRaisedBy` の `QN-13` の枝（削除の問いの枝は残す） |
| `src/adapter/screen-renderer/screen-renderer.ts` | `RaisedConfirmation.days`、`confirmationFromSession` へ `schedule` を渡すこと |
| `src/adapter/screen-renderer/notices.ts` | `withDays`・`DAYS_SLOT`・`DAY_SEPARATOR_BY_LANGUAGE`、`confirmationFromSession` の引数 `schedule` |
| `src/adapter/screen-renderer/tooltips.ts` | `questionDayText` |

新しい命令・新しい `Agent API` のメンバは無い。

---

## 6. グラフ（`4e5547e8`、`impact.py`）

- `impact.py FR-154`: 指されているのは 要求 3 件 ／ 参照 8 か所 —— `FR-031`（:2319）・`FR-103`（:4363）・`FR-076`（:7992 の `NT-7`、:8104 の `QN-13`）・`05-07-design.md`:445（`UF-16`）・`tbl-published-entries.md`:19・:27・`tbl-state-machines.md`:754。どれも 3 節で消す。
- `impact.py QN-13`: 参照 3 か所（`tbl-published-entries.md`:27・`tbl-state-machines.md`:754・:876）—— どれも生成物で、元は E-09・E-10。
- `impact.py T-354`: 指す要求 2 件（`FR-154`・`FR-076`）—— どちらも 3 節で消す。2 次の 16 件は `FR-076` を経た参照であり、`T-354` を読まない。
- `HW-<n>` を指す仕様の文は `FR-154` と 表 T-354 の中だけ（`HW-1` を `HW-12` が指す）。仕様の外では `CR-668`・`CR-682`・`CR-689`（下書き）・試験が名指す。

---

## 7. 数の予測と実測

| 数 | 前 → 後 | 方法 |
|---|---|---|
| 要求 | 133 → 132（`FR` 120 → 119） | `**UID**: FR-` / `NFR-` の数 |
| 表 T-234 の行 | 11 → 10 | 表の行 |
| 表 T-004 の行 | 21 → 22 | 表の行 |
| 検査 39 の拾えていない条項 | 変わらない | `FR-031` の 2 つの条項は、残した画面の試験（X-5）が今も字のまま引く |

---

## 8. 波

1 つの作業木で、仕様 → 生成 → コード → 既存の試験の順に当てた。

- ⚠️ 毎フレームの経路に触れる（`src/adapter/screen-renderer/**`・`frame-loop.ts`）—— 仕事を減らすだけだが、`perf-pending.md` に行を足す（X-6）。

---

## 9. 仕様の外で直すもの

- コード: 5 節。
- 退役させる試験: `tests/contract/cr-668-a-non-working-end-day-asks-before-the-calendar-changes.contract.test.ts`（すべての場合が `nonWorkingDayQuestionOwedBy` と `FR-154` の文を引く）。
- 名を改めて残す試験: `tests/system/cr-668-a-plan-end-released-on-a-saturday.test.ts` → `tests/system/cr-701-a-plan-end-released-on-a-saturday-asks-nothing.test.ts`（X-5）。
- 前提を替える試験: `tests/system/w3-t1-a-standing-question-holds-the-document.test.ts`（X-4）。
- 「`No` で答える」段を外す試験（`CR-668` が足した段）: `tests/unit/cr-376-go-3-a-rest-day-release-stays.test.ts`・`cr-430-stage.ts`・`cr-646-stage.ts`・`fr-103-t-245-what-a-released-end-puts.test.ts`・`go-3-the-released-day-is-the-actual-finish-date.test.ts`・`t-023d-follows-the-pointer.test.ts`・`t-023d-gr-5-relays-the-actual-duration.test.ts`・`uf-48-input.test.ts`、`tests/usecase/uc-003-edit-task-attributes.test.ts`・`uc-005-record-actuals.test.ts`、`tests/contract/state-machine-file-flow.contract.test.ts`（神託の `hasDeclinedWrites`）、`tests/contract/w3-t3-nothing-is-written-while-a-grab-is-held.test.ts`（WHY の 1 行）。
- 仕様だけを読む試験（別の体）: `LM-22`、`FR-031` の戻した文、`FR-103` の結び（非稼働日で離しても問いは立たず、暦は変わらない）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 端を稼働日へ寄せない（`FR-103` の結び、`JDG-67`）。
- `DV-8` の数え方を変えない —— ずれは `LM-22` に書くだけ。
- 暦の編集面（`FR-088`）を変えない。
- 触れ合う: `CR-689`（下書き、当てていない）の E-08 は `HW-4` の「表 T-016 の `PR-3` ・ `PR-35` ・」を書き換える —— 本書の後は `HW-4` が無いので、`CR-689` の E-08 の `HW-4` の半分（決定 6 の `HW-4` と 1 節・6 節の `HW-4`・`FR-154` の言及を含む）を落とし、`FR-029` の半分だけを残すことになる。`CR-689` は本書では書き換えない（調整役が当てるときに直す）。

---

## 11. 利用者に問うこと

無い。`JDG-1611` が振る舞いを確かめた。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1610` | 問いを出さない | 指示 → 適用済、着地先 表 T-234・`FR-031`・`FR-103`・`NT-7` |
| `JDG-1611` | 暦は変えない・ずれは制限事項 | 指示 → 適用済、着地先 表 T-004 の `LM-22`・`FR-012` |
| `JDG-1436`・`JDG-1437` | 覆された印 | 既に在る（確かめただけ） |

---

## 13. 測り方の再現

```
# the tree: worktree at 4e5547e8
git grep -lE "CR-701|LM-22\b|DFC-224[0-4]\b"            # only handoff.md (the band announcement)
grep -n "^| LM-" docs/spec/01-04-requirements.md          # max LM-21
grep -n "^| QN-" docs/spec/01-04-requirements.md          # 11 rows: QN-1..5, 9..13, 8
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-154 QN-13 T-354
git grep -nE "\bFR-154\b|T-354|\bQN-13\b|\bHW-[0-9]+\b|nonWorkingDayQuestion|hasDeclinedWrites" -- docs/spec src tests
git show a2fef3f5 -- src tests docs/spec                   # what CR-668 added
```
