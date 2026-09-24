# CR-547 — 担当者の欄を 1 人ずつに分け、空の欄で 1 人を足す

> 起草の状態: **適用済み（2026-09-24）**。裁定 `JDG-300` の Q11 ②（`PND-461`）と、同じ日の `JDG-527` を受けて書いた。前に立つ者が受け入れ（11 節の読みは答え済み）、木 `032c2023` の上で当てた（計画の H10）: 4 節の E-01 〜 E-06 を `docs/spec/01-04-requirements.md` へ、5 節の継ぎ目 S-1 〜 S-6 をコードへ、12 節の台帳（`DFC-941` を起こし、`PND-461` を閉じ、`JDG-527` を適用済みに）。試験（9 節と S-7）は仕様だけを読む別の体が同じ巡で書く。
> 読んだ木: `57511ed9`（ブランチ `claude/loving-einstein-50a6c2`）。行番号・数・参照は、すべてこの木で測った（測り方は 13 節）。
> ID の帯: 前に立つ者から CR-547 ・ `JDG-527` ・ 設定値 `S-410` 〜 `S-414` ・ 表 `T-325` 〜 `T-327` を受けた。使うのは `JDG-527` と新しい行 ID `AS-12` だけである。設定値と表の帯は使わない（返す）。
>
> **閉じるもの**: `PND-461`（担当者が 2 人以上就いている `Task` で、1 つの割当を相手にする操作がどの割当に当たるか）と、`AS-7` が自ら認めている穴（`01-04-requirements.md:2096` の「2 人以上が就いているタスクでどれを解くかは、本表のどの行も定めていない」と「`AS-3` の解除も同じ穴を持っており」）。
> ⭐ **形の方針**: 担当者の欄（表 T-016 の `PR-16`）を「就いている担当者 1 人につき 1 つ ＋ 空の欄 1 つ」にする（`AS-5`）。欄が相手の 1 人を名指すので、解く（`AS-3`）・差し替える（`AS-7` と新しい `AS-12`）・足す（空の欄、`AS-12`）がどれも 1 つに決まる。
> ⚠️ **ほかの変更要求との関わり**: `CR-541` は Q11 を本書へ回した（同書 1 節）。`CR-548` 〜 `CR-564` のうち、表 T-225 ・ `FR-008` ・ `PR-16` を旧に持つものは無い（13 節で数えた）。

### 0.1 利用者の逐語

| # | 逐語 |
|---|---|
| `JDG-300` の Q11 | 「量が多いな... 下記以外は推奨通りでOK。問題があればその時直す。」（2026-09-22。Q11 はこの一通の「推奨通り」に入る。問いの推奨は ②「担当者の欄を 1 人ずつに分ける」。`rulings.md:547`） |
| `JDG-527` | 「空の行を常に 1 つ (推奨)」（2026-09-24。前に立つ者が選択肢で問い、利用者はこの選択肢を選んだ。⚠️ 引用符の中は前に立つ者が挙げた選択肢の文言であり、利用者が打った言葉ではない） |

⭐ `JDG-527` の問い: 「既に担当者がいるタスクに『もう 1 人足す』手段をどうしますか？」。選択肢は (a) 空の行を常に 1 つ（推奨）—— 就いている行の下に空の選び口を常に 1 つ置き、そこで選ぶか打つと 1 人が足される（`AS-10` が重複を断る）。新しいアイコンも語も要らない。就いている行で選び直すと、その人を替える（`AS-7`）。(b) [+] の入口。(c) パネルでは足さない。利用者は (a) を選んだ。
⭐ 仕様の文では「行」を「欄」と書く —— 仕様で「行」は表の行と日程表の行を指すので、パネルの中の選び口に同じ語を使うと読み違える。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— いまは担当者が 2 人以上のタスクで、欄は先頭の 1 人にしか立たず（`properties-panel.ts:418`）、`-` を確定しても名簿に無い名を打っても 2 人目以降には何も起きない（`field-commit.ts:326-327`）。欄を 1 人ずつにすると、見えている人を見えている欄で解き・替えられる。足す入口は空の欄であり、新しいアイコンも語も覚えさせない（`JDG-527`）。
⚠️ `CH-` の残りには直に効かない。正直にそう書く。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・重複がない。唯一の正）** —— ① `AS-7` の「就いている人を替える道は 2 つあり、どちらも既に在る（`AS-5` / `AS-9`）」に対し、いまのコードは名簿の人を選ぶと**足す**（`field-commit.ts:339-345`）。替えるのか足すのかを `AS-12` の 1 行に置き、`AS-7` はそこを指す。② 欄の並びは `FR-059` の順を指すだけにし、書き写さない。③ 表 T-016 には欄の数を書かない —— 同表の `PR-16` は既に「入口と選び方は `FR-008` の表 T-225 が持つ」と指しており、書くと正が 2 か所になる（決定 6）。
- **`R1.4`（異常系・境界値）** —— ① 就いている人が 0 人（空の欄だけ。`AS-1` の焦点も空の欄）。② 空の欄で `-` ／ `Del`（何も書かない。`AS-3`）。③ 就いている欄で、そのタスクに既に就いている別の人を選ぶ（`AS-10` により何も書かない。決定 4）。④ 自分の欄で自分を選ぶ（何も書かない）。⑤ 描いた後に欄の人が解かれていた（コードの側で何も書かない。5 節の TRAP）。⑥ 取り込んだ文書が同じ組の割当を 2 つ持つ（欄は 1 人につき 1 つ。5 節）。
- **`R1.6`（否定要求は代替を示す）** —— 新しい MUST NOT は 2 つ（`AS-3` の「ほかの欄の割当を解いてはならない」、`AS-12` の「空の欄では…ほかの欄の割当を解いてはならない」）。どちらも同じ文の中で、代わりに何をするか（その欄の人だけを解く ／ 就けるだけとする）を書いた。
- **`R2`（命名。名前を足すときは必ず引く）** —— 新しい行 ID は `AS-12` の 1 つ（`AS-11` は退けた番号。`retired.py:101-114`）。引くもの: `AS-7` の穴の 2 文と「1 人だけ就いていたときは」の 1 文（3 節）。新しい表・図・接頭辞・設定値・要求 ID は 0。

### ③ 利用者に問わずに決めたこと

⭐ 下は、既に在る行が決めていることを当てたもの（問わない）と、既に在る行からの類推で決めたもの（⚠️ 印。あとから覆せる）である。

| # | 決めたこと | 導き（条項と所） | 代償 |
|---|---|---|---|
| 決定 1 | 欄の並びは `FR-059` の担当ラベルの順（資源名の昇順、同名は `uid` の昇順）と同じ | `FR-059` の STATEMENT（`01-04-requirements.md:5334`）。いまのコードも同じ順（`properties-panel.ts:271-274` の `compareAssignees`） | — |
| 決定 2 | 欄に割当率（MSPDI の `Units`）を出さない。出すのは名だけ | `FR-008` の RATIONALE「資源の種類・費用資源かどうか・暦・割当率を編集してはならない（MUST NOT）」（`:2072`）。編集しない値を欄に出す理由が無い | 割当率を画面で読む道は無いまま（いまと同じ） |
| 決定 3 | 就いている欄で `Del` ／ `-` を確定したら、その欄の人の割当だけを解く。空の欄では何も書かない | `AS-3` の「その割当」は単数（`:2092`）。`PND-461` も「全員を解く案は `AS-3` の『その割当』（単数）と合わない」と書く。空の欄で何も書かず欄が元に戻るのは、`FR-006` の「空のまま確定したときは、`start` ／ `finish` の欄なら何も書かずに欄を元の値へ戻し」（`:1806`）と同じ形で、通知を出さない | — |
| 決定 4 | 就いている欄で、そのタスクに既に就いている**別の**人を受け取ったら、何も書かない（欄の人も解かない） | ⭐ 前に立つ者の答え（2026-09-24、11 節の読み 1）。`AS-10`（`:2099`）の「割当を増やさないこと」に当たる受け取りは、欄の人を解くことも含めて何もしない —— 選び直しが黙って 1 人を外すのは、利用者が驚く失い方である。⚠️ 起草では「就けないが欄の人は解く（1 人減る）」と読んでいたが、前に立つ者が覆した | 既に就いている人を選んでも欄は元に戻るだけで、通知は出ない（決定 3 と同じ形） |
| 決定 5 | 置き換えは `CM-44`（受け取った人を就ける）と `CM-45`（欄の人を解く）の 2 つを 1 回の呼び出しで走らせる。欄の人の割当に載っていた値（割当率・仕事量など `Assignment` の `carry`）は受け継がず、捨てる | `AS-7` の差し替えの前例（`CM-40` ＋ `CM-44` ＋ `CM-45`、`:2096`・`:2101-2104`）。`Assignment.resourceUid` を書き換える命令は表 T-108 に無い（`tbl-glossary.md:443-448` の `CM-40` 〜 `CM-45`）。`CM-44` が作る割当は新しい `uid` の新しい割当であり、`FR-008` の RATIONALE が割当率を編集させない以上、前の人の割当率を新しい人へ写す規則を立てる根拠が無い | 取り込んだ MSPDI の割当率・仕事量は、人を替えるとその割当ぶん失われる（`UN-15` で戻せる）。⭐ 人を替えない限り `carry` は残る（`OP-6` の往復のまま） |
| 決定 6 | 表 T-016 の `PR-16`（原稿 `_source/property-items.json`）は変えない | 同行の備考は既に「入口と選び方は `FR-008` の表 T-225 が持つ」と指している（`_assets/tbl-property-items.md:33`）。欄の数は `AS-5` に 1 か所だけ書く（`R1.3`）。`FR-006` の「名は行に 1 つ」（`:1817`）とも合う —— 行は 1 つのまま、行の中の欄が人の数だけある。⭐ 備考を変えると、検査 37 の組の指紋（`dictionary-table-pairing.txt:15` の `T-016 PR-16`）が動き、規則を 1 つも足さずに基準線の手当てが要る | 表 T-016 だけを読んだ人には、欄が 1 人ずつだと分からない（備考の指し先を読めば分かる）。`PND-461` の候補 ② の「表 T-016 の行の形が変わる」は、行でなく欄の形が変わると読んだ |
| 決定 7 | MSPDI の読み書きは変えない。欄 1 つが `Assignment` 1 つに当たる | 表 T-016 の `PR-16` の MSPDI の欄「`Assignment/ResourceUID`」。割当の持ち方は変えない | — |
| 決定 8 | 取り消しは、1 回の確定（1 回の呼び出し）を 1 段とする | 表 T-027 の `UN-15`（`:2149`、資源と割当の追加・解除が取り消しの対象）＋ `FR-031` ＋ 表 T-035 の `AG-3`（`:6138`）。`AS-12` の 1 文目が同じ「1 回の呼び出し」を持つ（E-05。理由は `AS-7` の下の段落、E-06） | — |
| 決定 9 ⚠️ | `AS-1`（担当ラベルのダブルクリック）で焦点を置く欄は、押した担当ラベルが名を出している人の欄。ラベルが `-`（`AS-2`）なら空の欄 | 類推: `AS-1` は「押した所の値を編集させる」入口であり（同行の先例 `HF-14` は、押した行の名前の欄に焦点を置く）、ラベルに見えている人は `FR-059` の先頭の 1 名である。状態機械が運ぶのは行 ID の `'PR-16'` だけであり（`tbl-state-machines.md:785` ・ `:859`）、どの欄かは画面の側が決める —— 状態機械の原稿は変えない | 材料資源が先に並ぶタスクでは、焦点の欄が欄の並びの先頭でないことがある（ラベルは作業資源だけを名指すので、`FR-059`） |
| 決定 10 ⚠️ | 欄に出す担当者は、資源の種類で絞らない（材料資源・費用資源の割当にも欄を出す） | `FR-059` の絞りは担当ラベルのための規則であり、その RATIONALE は「担当者でないものが担当者として画面に出る」ことを防ぐためである（`:5341-5342`）。パネルは割当を編集する面であり、絞ると、取り込んだ材料資源の割当を解く道が無くなる（いまのコードの WHY、`properties-panel.ts:277`） | 担当ラベルに出ない資源が欄には出る。⚠️ 名前の無い資源（`Resource.name` が `null`）の割当は、いまのコードと同じく欄を出さない —— 10 節 |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 欄を 1 人ずつ ＋ 空の欄 1 つ、並び、種類で絞らない、割当率を出さない | 表 T-225 の `AS-5` | E-03 |
| `AS-1` の焦点の欄 | 表 T-225 の `AS-1`（結び） | E-01 |
| 解くのはその欄の人だけ | 表 T-225 の `AS-3` | E-02 |
| 差し替えか足すかは欄が決める（穴を閉じる） | 表 T-225 の `AS-7` | E-04 |
| 欄で人を受け取ったときの規則（差し替え ／ 足す ／ 重複） | 表 T-225 の `AS-12`（新） | E-05 |
| 1 回の呼び出しで走らせる命令の数 | 表 T-225 の下の段落 | E-06 |

**数**: 文の編集 6（E-01 〜 E-06）。すべて `docs/spec/01-04-requirements.md` の中である。原稿 JSON の編集 0、生成物の変化 0（`npm run gen` は何も書き換えない見込み。13 節で確かめた）。

---

## 2. 新しい識別子

| ID | 置き場 | 何か |
|---|---|---|
| `AS-12` | `01-04-requirements.md` の 表 T-225（`AS-10` の次） | 担当者の欄で担当者を受け取ったとき、差し替えるか足すか |

- `AS-11` は退けた番号である（`.claude/skills/spec-graph-check/retired.py:101-114`。改名の入口として立てて取り下げた）。⛔ 振り直さず、次の `AS-12` を使う。
- 2026-09-24、手元とリモートの 89 のブランチの先端で `AS-12` 〜 `AS-19` ・ `JDG-527` ・ `CR-547-` を `git grep` で引いて 0 件（13 節）。**当てる直前に測り直すこと**（規則 02 の 2.5 節）。
- 新しい接頭辞・表・図・設定値は 0。受けた帯 `S-410` 〜 `S-414` と `T-325` 〜 `T-327` は使わない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧（`57511ed9`） | 所 | 新 | 編集 |
|---|---|---|---|
| `AS-7` の「⛔ そのタスクに担当者が既に就いていても、同じように振る舞うこと（MUST）」 | `01-04-requirements.md:2096` | 「⛔ 就いている担当者の欄で受け取っても、同じように振る舞うこと（MUST）」—— 意味は同じで、相手を欄で言う | E-04 |
| `AS-7` の「⭐ 就いている人を替える道は 2 つあり、どちらも既に在る —— プロパティパネルで名簿から選ぶ（`AS-5`）か、`uid` で選ぶ（`AS-9`）」 | 同上 | `AS-12`（名簿の人を就いている欄で受け取れば替える）| E-04 ・ E-05 |
| `AS-7` の「⭐ そのうえで、そのタスクに担当者が 1 人だけ就いていたときは、その割当を解くこと（MUST）（表 T-108 の `CM-45`。`AS-3` と同じ語である）」 | 同上 | 「差し替えるか足すかは、受け取った欄が決める（`AS-12`）—— 就いている担当者の欄ならその人の割当を解き、空の欄なら解かない」 | E-04 |
| `AS-7` の「⚠️ 2 人以上が就いているタスクでどれを解くかは、本表のどの行も定めていない（…）—— ⛔ 本行の解除はそこへ及ばない」 | 同上 | —（穴が閉じる。欄が相手を名指す） | E-04 |
| `AS-7` の「⭐ `AS-3` の解除も同じ穴を持っており、同じ形で止まっている」 | 同上 | `AS-3` の 2 文目「解くのは…その欄の担当者の割当だけであり」 | E-04 ・ E-02 |
| 表 T-225 の下の段落の「誰も就いていないタスクでは `CM-40` と `CM-44` の 2 つ、1 人が就いていたタスクではそれに `CM-45` が加わって 3 つである」 | `:2103` | 「空の欄で受け取れば … 2 つ、就いている担当者の欄で受け取れば … 3 つ」＋ 名簿の人の 1 つ ／ 2 つ | E-06 |
| 同じ段落の「⛔ 解除だけを次の呼び出しへ回すと、2 人が就いている状態が履歴に残る」 | `:2104` | 「… 替えたはずの 2 人が就いている状態が …」—— 意味は同じ | E-06 |

⭐ **消さないもの**: `AS-7` の「その名前の `Resource` を作ってから割り当てること（MUST）」「改名として扱ってはならない（MUST NOT）」「解いても担当者そのものは残る」、`AS-3` の場面の欄と「その割当を解くこと（MUST）」、`AS-5` の「編集できること（MUST）」「名簿から選ばせる形とし、ドロップダウンと部分一致の検索を添えること（MUST）」、表 T-225 の下の段落の 1 行目「`AS-7` は、本行が書くことになった命令を 1 回の呼び出しで走らせること（MUST）」と 2 行目 —— どれも逐語のまま残す（試験がこの逐語を引いている。9 節）。
⚠️ 「同・」の罠（規則 02 の 4 節）: 表 T-225 に「同・」「同上」は 0（数えた）。`AS-12` は `AS-10` の次に足すだけで、ほかの行を継がない。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**:
- 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（規則 02 の 4 節）。行を足す編集（E-05）は、旧に錨の行を置き、新は錨の行に足す行を続けたものである。
- 行末の空白 2 つ（強制改行）は旧にも新にもそのまま書いてある。消さないこと。
- 旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊である（13 節の照合の台本がこの形を読む）。
- 表の中の文の終わり（「。」の後に字が続く所）には `<br>` を置いた（検査 46）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧（`:2090`、`AS-1` の行の末尾）
```text
** 入口の割当は表 T-023 の `MK-13`、掴み領域は表 T-023d の `GR-11` が既に持つ |
```
新
```text
** 入口の割当は表 T-023 の `MK-13`、掴み領域は表 T-023d の `GR-11` が既に持つ。<br>⭐ 担当者の欄は、就いている担当者 1 人につき 1 つある（`AS-5`）。<br>焦点を置くのは、押した担当ラベルが名を出している担当者の欄（`FR-059`）とし、ラベルが `-` を出しているとき（`AS-2`）は空の欄とすること（MUST） —— 押したラベルに見えている人の欄へ行く。<br>そのまま名を打てば、その人を替えることになる（`AS-12`） |
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧（`:2092`、`AS-3` の行）
```text
| AS-3 | 担当者を選んだ状態で `Del` を押した、または `-` を確定した | **その割当を解くこと（MUST）**（表 T-108 の `CM-45`）。<br>⚠️ **担当者そのものは消えない** —— 消す入口は `FR-099` が持つ |
```
新
```text
| AS-3 | 担当者を選んだ状態で `Del` を押した、または `-` を確定した | **その割当を解くこと（MUST）**（表 T-108 の `CM-45`）。<br>⭐ 解くのは、押した・確定した担当者の欄（`AS-5`）の担当者の割当だけであり、ほかの欄の割当を解いてはならない（MUST NOT） —— 欄は担当者 1 人につき 1 つなので、欄が解く人を名指す。<br>空の欄では何も書かない —— 解く割当が無い。<br>⚠️ **担当者そのものは消えない** —— 消す入口は `FR-099` が持つ |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
旧（`:2094`、`AS-5` の行）
```text
| AS-5 | プロパティパネルの担当者（表 T-016 の `PR-16`） | **編集できること（MUST）。<br>** 名簿から選ばせる形とし、**ドロップダウンと部分一致の検索を添えること（MUST）** |
```
新
```text
| AS-5 | プロパティパネルの担当者（表 T-016 の `PR-16`） | **編集できること（MUST）。<br>** 名簿から選ばせる形とし、**ドロップダウンと部分一致の検索を添えること（MUST）**。<br>⭐ 担当者の欄は、そのタスクに就いている担当者 1 人につき 1 つ出し、その下に空の欄を常に 1 つ出すこと（MUST） —— どの欄も同じ形であり、空の欄で選ぶか打てば 1 人を足せる（`AS-12`）。<br>足すための印も語も置かない —— 空の欄がその入口である。<br>欄の並びは、`FR-059` が担当ラベルに定める順と同じとすること（MUST） —— 同じ人たちの並びを、画面の 2 か所で違えない。<br>⭐ 欄に出す担当者は、資源の種類で絞らない —— `FR-059` の種類の絞りは担当ラベルのものであり、ここで絞ると、取り込んだ材料資源や費用資源の割当を解く道が無くなる。<br>⭐ 欄が出すのは担当者の名だけであり、割当率は出さない —— 割当率は編集しない（本要求の RATIONALE） |
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧（`:2096`、`AS-7` の行）
```text
| AS-7 | 名簿に無い名前を受け取った | **その名前の `Resource` を作ってから割り当てること（MUST）**（表 T-108 の `CM-40` と `CM-44`）。<br>種類と採番は本要求の上の段落が持つ。<br>⛔ そのタスクに担当者が既に就いていても、同じように振る舞うこと（MUST）。<br>就いている担当者の改名として扱ってはならない（MUST NOT） —— 名簿に無い名前の入力は差し替えである。<br>⭐ **就いている人を替える道は 2 つあり、どちらも既に在る** —— プロパティパネルで名簿から選ぶ（`AS-5`）か、`uid` で選ぶ（`AS-9`）。<br>⭐ そのうえで、そのタスクに担当者が 1 人だけ就いていたときは、その割当を解くこと（MUST）（表 T-108 の `CM-45`。<br>`AS-3` と同じ語である）—— 作って割り当てるだけでは差し替えにならない。<br>⛔ **解いても担当者そのものは残る**（本要求の上の段落）—— **担当者そのものを消す道は、担当者一覧に既に在る。<br>**⚠️ **2 人以上が就いているタスクでどれを解くかは、本表のどの行も定めていない**（`AS-3` / `AS-5` / `AS-6` / `AS-8` / `AS-9` / `AS-10` と、本要求の本文と 表 T-016 を読んだ）—— ⛔ 本行の解除はそこへ及ばない。<br>⭐ **`AS-3` の解除も同じ穴を持っており、同じ形で止まっている。<br>** |
```
新
```text
| AS-7 | 名簿に無い名前を受け取った | **その名前の `Resource` を作ってから割り当てること（MUST）**（表 T-108 の `CM-40` と `CM-44`）。<br>種類と採番は本要求の上の段落が持つ。<br>⛔ 就いている担当者の欄で受け取っても、同じように振る舞うこと（MUST）。<br>就いている担当者の改名として扱ってはならない（MUST NOT） —— 名簿に無い名前の入力は差し替えである。<br>⭐ 差し替えるか足すかは、受け取った欄が決める（`AS-12`） —— 就いている担当者の欄ならその人の割当を解き（表 T-108 の `CM-45`、`AS-3` と同じ語）、空の欄なら解かない。<br>⛔ **解いても担当者そのものは残る**（本要求の上の段落）—— 担当者そのものを消す道は、担当者一覧に既に在る |
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
旧（`:2099`、`AS-10` の行。この行の直後に `AS-12` を足す）
```text
| AS-10 | 受け取った名前または `uid` が、そのタスクに既に就いている担当者を指した | **割当を増やさないこと（MUST）** —— 2 つ作る禁止は本要求の上の段落が持つ |
```
新
```text
| AS-10 | 受け取った名前または `uid` が、そのタスクに既に就いている担当者を指した | **割当を増やさないこと（MUST）** —— 2 つ作る禁止は本要求の上の段落が持つ |
| AS-12 | 担当者の欄（`AS-5`）で担当者を受け取った（名簿から選んだ人でも、`AS-7` で作った人でも） | 就いている担当者の欄で受け取ったときは、受け取った担当者を就け（表 T-108 の `CM-44`）、その欄の担当者の割当を解くことを、1 回の呼び出しで行うこと（MUST）（同表の `CM-45`。<br>1 回にする理由は本表の下の段落の `AS-7` と同じ） —— 欄の人を替える。<br>空の欄で受け取ったときは就けるだけとし、ほかの欄の割当を解いてはならない（MUST NOT） —— 空の欄は足す入口である。<br>⭐ 受け取った担当者がそのタスクに既に就いていれば、何も書かない（`AS-10`） —— 受け取った欄の担当者そのものでも、別の欄の担当者でも同じである。<br>別の欄の担当者のときに欄の人だけを解くと、選び直しが黙って 1 人を外すことになる |
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
旧（`:2101-2104`、表 T-225 の下の段落）
```text
`AS-7` は、本行が書くことになった命令を 1 回の呼び出しで走らせること（MUST） —— 表 T-035 の `AG-3` が一括の書き込みを原子的と定め、`FR-031` が呼び出し 1 回を取り消しの 1 段と定めている。  
**別々に走らせると、担当者だけができて割当ができていない状態が履歴に残る。**  
⭐ **命令は 2 つのことも 3 つのこともある** —— 誰も就いていないタスクでは `CM-40` と `CM-44` の 2 つ、1 人が就いていたタスクではそれに `CM-45` が加わって 3 つである。  
⛔ **解除だけを次の呼び出しへ回すと、2 人が就いている状態が履歴に残る。**
```
新
```text
`AS-7` は、本行が書くことになった命令を 1 回の呼び出しで走らせること（MUST） —— 表 T-035 の `AG-3` が一括の書き込みを原子的と定め、`FR-031` が呼び出し 1 回を取り消しの 1 段と定めている。  
**別々に走らせると、担当者だけができて割当ができていない状態が履歴に残る。**  
⭐ **命令は 1 つのことも 2 つのことも 3 つのこともある** —— 名簿に無い名前を空の欄で受け取れば `CM-40` と `CM-44` の 2 つ、就いている担当者の欄で受け取ればそれに `CM-45` が加わって 3 つである。  
名簿の人を空の欄で受け取れば `CM-44` の 1 つ、就いている担当者の欄で受け取れば `CM-44` と `CM-45` の 2 つである。  
⛔ **解除だけを次の呼び出しへ回すと、替えたはずの 2 人が就いている状態が履歴に残る。**
```

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

⭐ **欄の鍵は `Resource` の `uid` とする（`Assignment` の `uid` ではない）。** 理由: ① 欄が書く命令 `CM-45` の形が `{ kind: 'unassignResource', taskUid, resourceUid }` であり（`src/use-case/edit-document/edit-resource.ts:21`）、鍵がそのまま命令の組になる。② `FR-008` の MUST NOT（同じ組の割当を 2 つ作らない）と `MG-5` により、1 つのタスクの中で資源の `uid` は 1 人を 1 つに名指す。③ 選び口の値は既に資源の `uid` である（`AS-9`、`properties-panel.ts:424`）。④ `Assignment` の `uid` を鍵にすると、取り込んだ文書が同じ組の割当を 2 つ持つとき（`edit-resource.ts:147` の TRAP）欄が 2 つ出て「1 人につき 1 つ」（`AS-5`）を割る。資源の `uid` なら 1 つに畳める。

| # | 間 | 継ぎ目（逐語） |
|---|---|---|
| S-1 | 描く側 ↔ 確定する側（型） | `src/adapter/screen-renderer/screen-renderer.ts` の `PropertyFieldKey` に 1 つ足す: `\| { readonly holder: 'assignment'; readonly taskUid: number; readonly resourceUid: number \| null; readonly column: 'resourceUid' }`。`resourceUid` が `null` の鍵が空の欄である。⛔ 担当者の欄に `holder: 'task'` の鍵（いまの `{ holder: 'task', uid, column: 'uid' }`、`properties-panel.ts:420`）を使わない —— `field-commit.ts:378` の TRAP（`Task` の列へ落ちる）が要らなくなる |
| S-2 | 描く側（`src/adapter/screen-renderer/properties-panel.ts`） | `function assigneeControls(schedule: Schedule, taskUid: number, labelCoef: number): readonly PropertyControl[]` が `assigneeControl`（`:416`）に代わる。`controlsOfItem` の `item.heldBy === 'assignment'` の枝（`:444`）はこれを返す。並び: `assigneesOf`（`:279`、`compareAssignees` の順）を資源の `uid` で 1 人 1 つに畳んだ順の欄、その後に空の欄を 1 つ。欄の `text` は就いている欄で `String(resourceUid)`、空の欄で `''`。`choices` ・ `choiceValues` ・ `searchWords` はどの欄も同じ名簿（`assigneeChoices`、`:302`）。⛔ 資源の種類で絞らない（`AS-5`、いまの `:277` の WHY のまま） |
| S-3 | 描く側 ↔ 焦点（`AS-1`） | `PropertyControl` に `readonly isFocusTarget?: true` を足す。担当者の行では、ちょうど 1 つの欄に立てる: 担当ラベルが名を出す人の欄、その人がいなければ空の欄。ラベルの人は、配置の側の絞り（`src/entity/layout-engine/schedule-layout/schedule-layout.ts:174` の `assigneeLabelsOf` の中、`:181-190`）を 1 つの関数に出して両方が読む: `export function labelledAssigneeUidOf(schedule: Schedule, taskUid: number): number \| null`（`FR-059` の先頭の 1 名の資源の `uid`、いなければ `null`）。⛔ 絞りを `properties-panel.ts` に写さない（`FR-059` の規則が 2 か所になる）。DOM の側（`src/framework/dom-screen-surface/properties-panel-drawing.ts:283` と `:645`）は、`typedByRow` に「その行で最初の欄」でなく「`isFocusTarget` の欄、それが無い行では最初の欄」を入れる。状態機械（`fieldEditStateMachine`）が運ぶ値は `'PR-16'` のまま —— ⛔ `docs/spec/_source/state-machines.json` は触らない |
| S-4 | 確定する側（`src/adapter/input-command-translator/field-commit.ts`） | `function commandsFromAssigneeField(schedule: Schedule, taskUid: number, seatedUid: number \| null, text: string): readonly DocumentCommand[]` が `commandsFromAssignee`（`:335`）と `commandsFromUnassign`（`:320`）に代わる。`commandFromFieldCommit` の `switch (key.holder)` に `case 'assignment'` を足して呼ぶ（`key.taskUid` の `Task` が無ければ `[]`）。`:379` の `commit.row === ASSIGNEE_ROW` の先回りは消す。返す命令（順も含む）: `-` → `seatedUid` が `null` なら `[]`、そうでなければ `[unassignResource(taskUid, seatedUid)]`（`AS-3`）。名簿の人 `R`（`resourceUidOfChoice` ／ `resourceUidOfName` のまま、`AS-8` ・ `AS-9`）→ `R === seatedUid` なら `[]`。`R` が既に就いていれば、`seatedUid` が何であっても `[]`（`AS-10` ・ `AS-12`。決定 4）。それ以外は `[createAssignment(taskUid, R)]` に、`seatedUid` があれば `unassignResource(taskUid, seatedUid)` を続ける。名簿に無い名（`AS-7`）→ `[createResource, createAssignment(taskUid, nextIssuedUid(schedule))]` に、`seatedUid` があれば `unassignResource(taskUid, seatedUid)` を続ける |
| S-5 | 確定する側（古い鍵） | ⚠️ TRAP: `seatedUid` の人が確定の時にはもうそのタスクに就いていない（描いた後に取り消し等で外れた）ときは `[]` を返す —— `CM-45` は就いていない組を断り（`edit-resource.ts:151-158`）、`AG-3` により 1 回の呼び出しの全部が捨てられる。欄は次のフレームで今の割当から描き直される |
| S-6 | DOM の側（名簿の `datalist`） | ⚠️ TRAP: `rosterId(row)`（`properties-panel-drawing.ts:613`）は行 ID から `id` を作るので、欄が 2 つ以上あると同じ `id` の `datalist` が並ぶ。名簿はどの欄も同じなので、`datalist` を行に 1 つだけ出してどの欄の検索の箱もそれを指すか、欄ごとに別の `id` を作ること |
| S-7 | 試験する側（`docs/spec` だけを読む体） | 描いた欄の読み方: `propertiesPanelFromSelection(...)` の `row === 'PR-16'` の欄の `controls`。就いている人の数 ＋ 1 個、最後が `key.resourceUid === null`。確定の作り方: `{ row: 'PR-16', key: { holder: 'assignment', taskUid, resourceUid, column: 'resourceUid' }, text }` を `commandFromFieldCommit(commit, context)` に渡す |

---

## 6. グラフ（`57511ed9` で測った）

### 6.1 `impact.py PR-16 AS-1 AS-3 AS-5 AS-7 AS-9 AS-10 FR-008 FR-059` —— 触る行ごとの届く先

| 行 | 指している箇所 | 読み直した結果 |
|---|---|---|
| `PR-16` | `FR-008`（`:2084` ・ `:2090` ・ `:2094`）、`tbl-state-machines.md:785` ・ `:788` ・ `:789` ・ `:859` ・ `:860`（`fieldRow` の値） | 状態機械は行 ID を運ぶだけで、欄の数を持たない —— 変えない（決定 9、S-3） |
| `AS-1` | `FR-008`（`:2091`）、`FR-016` の 表 T-023 の `MK-13`（`:3367`「担当ラベル ＝ 表 T-225 の `AS-1` の宛先とすること」）、`FR-076` の 表 T-026 の `RS-49`（`:6536`） | `MK-13` は宛先を写さずに指すだけ、`RS-49` は改名の通知 —— どちらも真のまま |
| `AS-3` | `FR-008`（`:2093` ・ `:2096`） | `:2096` は E-04 で書き直す |
| `AS-5` | `FR-008`（`:2096`） | E-04 で書き直す |
| `AS-7` | `FR-008`（`:2101`） | E-06 で書き直す |
| `AS-9` | `FR-008`（`:2095` ・ `:2096`） | `:2095` は `AS-6` の「`AS-9`（MUST）が『同姓同名を見分ける経路はここだけである』」—— 真のまま。`:2096` は E-04 |
| `AS-10` | `FR-008`（`:2096`） | E-04 で書き直す（`AS-12` が新たに指す） |
| `FR-008` | `FR-031`（`:2149` の `UN-15`）、`FR-099`（`:2363` ・ `:2365`）、`FR-059`（`:5335`）、`FR-076`（`:6536`）、`05-07-design.md:401`（`UF-15`）、`tbl-glossary.md:443` ・ `:444` ・ `:447` ・ `:448`（`CM-40` ・ `CM-41` ・ `CM-44` ・ `CM-45`）、`tbl-property-items.md:33` | どれも `FR-008` の STATEMENT と RATIONALE を指し、本書は STATEMENT も RATIONALE も変えない —— 真のまま |
| `FR-059` | `FR-008`（`:2079` ・ `:2097`）、`FR-090`（`:5363` ・ `:5375`）、`05-07-design.md:382` | 本書は `FR-059` を変えず、`AS-1` ・ `AS-5` から指すだけ |

⭐ 届いた行ごとに `docs/development-records/rulings.md` を引いた（規則 02 の 1 の注）: `AS-7` と 表 T-225 → `JDG-07`「差し替えでOK。 担当を変える場合はすでにプロパティーパネルから切り替え可能。 …」（本書の `AS-12` はこれに沿う —— 欄で選び替えると替わる）、`JDG-03`（`AS-1` のパネルへ。変えない）、`FR-059` → `JDG-09`（ラベルの並べ方。変えない）、`PND-461` → `JDG-300`。`AS-1` ・ `AS-3` ・ `AS-5` ・ `AS-9` ・ `AS-10` ・ `PR-16` の行 ID を名指す裁定は 0。

### 6.2 `induced.py`（13 の種）

`PR-16 AS-1 AS-3 AS-5 AS-7 AS-9 AS-10 FR-008 FR-059 T-225 T-016 CM-44 CM-45`: 13 の種すべて解決、種どうしの辺 25、**閉路 1**（大きさ 8: `AS-3 AS-5 AS-7 CM-44 CM-45 FR-008 FR-059 PR-16`）。
⇒ 本書が触る `AS-3` ・ `AS-5` ・ `AS-7` はこの閉路に入るので、1 つの計画で 1 度に書く（本書の E-02 ・ E-03 ・ E-04 は同じ当て方の中で続けて当てる）。`FR-059` ・ `PR-16` ・ `CM-44` ・ `CM-45` は本書では変えない —— 値の行と規則の要求の間の閉路は作法である（規則 02 の 1 の注）。

---

## 7. 数の予測（`57511ed9` で測った。当てた後に同じ数え方で突き合わせる）

| 数 | 前 | 予測 | 理由 |
|---|---|---|---|
| `tables` | 187 | 187 | 表を足さない |
| `figures` | 27 | 27 | — |
| `rows` | 2303 | 2304 | `AS-12` |
| `uids` | 162 | 162 | 要求を足さない |
| 検査 12 〜 14（助言。`style-checks.py`） | — | 同じ（行番号が 2 ずれるだけ。13 節） | 設定値の数を文に写さない |
| 検査 42（引用の出どころ） | 354 | 356（仕様だけを当てたとき。13 節）。試験の書き直し（9 節）と同じ commit なら 354 に戻る | `t-225` の試験の注 2 か所が `AS-7` の消した穴の文を引いている |
| 検査 39（MUST の条文の網羅） | 1326（基準線 1329） | 1331（基準線を 2 越える） | 新しい MUST ／ MUST NOT が 5 つ増え、試験がまだ引かない。⛔ 試験の体が新しい条文を逐語で引けば下がる。上げるなら前に立つ者が利用者に問う |

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

⭐ 原稿 JSON と生成物は動かないので、仕様だけを先に当ててもコードは投げない。⚠️ ただし、試験の注が消した文を引くので、検査 42 を赤くしないには仕様と試験を同じ commit に入れる（または前に立つ者が基準線を扱う）。

| 持ち場 | 誰 | ファイル |
|---|---|---|
| 仕様 | 前に立つ者 | `docs/spec/01-04-requirements.md`（E-01 〜 E-06） |
| 実装 | 体（Opus。決定 9 の読みと S-4 の場合分けを写す判断がある） | `src/adapter/screen-renderer/screen-renderer.ts`、`properties-panel.ts`、`src/adapter/input-command-translator/field-commit.ts`、`src/entity/layout-engine/schedule-layout/schedule-layout.ts`（`labelledAssigneeUidOf` を出すだけ）、`src/framework/dom-screen-surface/properties-panel-drawing.ts` |
| 試験 | 別の体（`docs/spec` だけを読む。規則: 作った者に試させない） | `tests/unit/t-225-choosing-who-is-on-a-task.test.ts`（9 節の赤と注）、`tests/unit/mk-13-the-name-field-is-armed.test.ts`（鍵の形）、新しい試験 1 本（`AS-5` の欄の数と並び、`AS-12` の 4 通り、`AS-3` の空の欄、`AS-1` の焦点の欄） |

⭐ 試験の体に渡す観点（⛔ 期待値は仕様から自分で導かせる）: 0 人 ／ 1 人 ／ 2 人（名の昇順と逆に入れる）／ 同名 2 人（`uid` の昇順）／ 材料資源 1 人 ＋ 作業資源 1 人（欄は 2、焦点は作業資源の欄）／ 同じ組の割当を 2 つ持つ取り込み文書（欄は 1）。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| 所 | 何をする | 試験（いま引いているもの） |
|---|---|---|
| ⛔ **記録の無い欠陥**: `src/adapter/input-command-translator/field-commit.ts:339-345` —— 就いている人のいるタスクで名簿の人を選ぶと、その人を**足し**、欄の人を解かない（`createAssignment` だけを返す） | `AS-7` の「就いている人を替える道は 2 つあり … 名簿から選ぶ（`AS-5`）か、`uid` で選ぶ（`AS-9`）」（`01-04-requirements.md:2096`）と `JDG-07`「担当を変える場合はすでにプロパティーパネルから切り替え可能」に反する。`defects.md` に行が無い（`AS-5` ・ `AS-9` で引いて 0）。⭐ 前に立つ者が着地のときに `DFC-941` として起こす。本書の後は `AS-12` の 1 文目に反する | いま主張する試験は無い（引いて 0）。新しい試験が S-4 の「`[createAssignment, unassignResource]`」を主張する |
| `src/adapter/input-command-translator/field-commit.ts:326` の STOP、`src/adapter/screen-renderer/properties-panel.ts:413` の STOP | 消す（`PND-461` を名指す 2 つ）。`docs/development-records/pending-decisions.md:324` の `PND-461` を同じ commit で閉じる（検査 25） | — |
| `tests/unit/t-225-choosing-who-is-on-a-task.test.ts:871-883`（`MUST NOT release anybody where TWO are seated -- no row says which`） | ⛔ 赤になる。`AS-12` の「就いている欄なら解く」に書き直す（2 人のうちの**鍵の欄の**人が解かれる） | `:874` が `AS-7` の穴「2 人以上が就いているタスクでどれを解くかは、本表のどの行も定めて…」を逐語で引く |
| 同じ試験の注 `:411-412` ・ `:849` ・ `:860` ・ `:873-874` ・ `:886` | 消えた `AS-7` の文（「1 人だけ就いていたときは」「2 人以上が…」）を引く注を、`AS-12` の文へ直す | 検査 42 はこのうち 2 つ（「2 人以上が…」の 2 か所）を数える。「1 人だけ」の引用は `changelog.md` に同じ文があるので数えない（13 節で 354 → 356 を測った） |
| 同じ試験の `assigneeKeyFor`（`:571-575`）と `commandsForAssignee`（`:578-585`） | 鍵を S-1 の形で作る。いまの控えの鍵 `{ holder: 'assignment', taskUid, column: 'assignee' }` は S-1 と列の名が違う | `:868`（1 人のときに解く）・ `:885`（0 人のとき解かない）・ `:894`（`resourceUid` が `null` の割当を数えない）は、`controls[0]` が 1 人目の欄 ／ 空の欄なので緑のまま見込み |
| `tests/unit/mk-13-the-name-field-is-armed.test.ts:1043`（`{ holder: 'task', uid: 1, column: 'uid' }` の鍵） | 鍵の形を S-1 に直す | `PR-16` に焦点が行くことの主張（`:1062` ・ `:1074`）は変わらない |
| `src/adapter/screen-renderer/properties-panel.ts:420` と `field-commit.ts:378-383` | S-1 ・ S-2 ・ S-4 | — |

---

## 10. ⛔ この変更でやらないこと

- 表 T-016（`_source/property-items.json`）を変えない（決定 6）。変えるなら検査 37 の指紋 `T-016 PR-16` を読み直して記録し直す手当てが要る。
- `FR-059`（担当ラベルの絞りと並び）、`FR-090`（ラベルの繋ぎ方）、`AS-2` ・ `AS-4` ・ `AS-6` ・ `AS-8` ・ `AS-9` ・ `AS-10` の文は変えない。
- 状態機械の原稿（`docs/spec/_source/state-machines.json`）は変えない —— `fieldRow` は行 ID の `'PR-16'` のまま（決定 9）。
- 割当率の表示や編集は足さない（決定 2）。
- ⚠️ **名前の無い資源の割当**（`Resource.name` が `null`）: いまのコードは欄を出さない（`properties-panel.ts:285`）。そのような割当はパネルから解けず、`FR-099` の削除も「どの割当からも参照されていない」担当者に限るので、消す道も無い。本書の前から在る隙間であり、本書は決めない（`AS-5` の「種類で絞らない」は種類の話で、名の有無を言わない）。問うかは前に立つ者が決める。
- `docs/development-records/` の `pending-decisions.md`（`PND-461` を閉じる）・ `defects.md`（`DFC-941`）・ `changelog.md`、`A-appendix.md` の変更履歴 —— 当てる者が書く。

---

## 11. 前に立つ者へ返す問い

⭐ 利用者へ返す問いは無い。足す手段は `JDG-527` で決まり、ほかは 0 節の ③ のとおり既に在る行から決めた。
⭐ 起草のあと前に立つ者に確かめた読み 3 つと、その答え（2026-09-24。前に立つ者の判断であり、利用者の言葉ではないので `rulings.md` に行を起こさない）:

| # | 起草の読み | 前に立つ者の答え |
|---|---|---|
| 1 | 決定 4 —— 就いている欄で、既に就いている別の人を選ぶと、欄の人が解かれる（1 人減る） | ⛔ 覆した —— 何も書かない（`AS-10`: 増やさない。黙って 1 人を失うのは避ける驚きである）。E-05 の `AS-12`、決定 4、S-4 の場合分けをこの答えに直した |
| 2 | 決定 9 —— `AS-1` の焦点は、押したラベルが名を出す人の欄（欄の並びの先頭とは限らない） | 書いたとおり受けた |
| 3 | 決定 6 —— 表 T-016 を変えない | 書いたとおり受けた |

---

## 12. 台帳（本書を書いた者が同じ日に写した）

| 台帳 | 行 |
|---|---|
| `docs/development-records/rulings.md` | `JDG-527`（節「2026-09-24 —— 担当者の欄を 1 人ずつに分け、空の欄で足す（CR-547）」）。状態は「起草（CR-547 は未適用）」 |
| `docs/development-records/defects.md` | 本書は書かない。前に立つ者が着地のときに `DFC-941`（9 節の 1 行目）を起こす |
| `docs/development-records/pending-decisions.md` | 本書は書かない。着地の commit で `PND-461` を閉じる（検査 25） |

---

## 13. 測り方の再現

```
# totals (before), 2026-09-24, 57511ed9
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py . | grep "tables="
#   -> tables=187  figures=27  rows=2303  uids=162

# free identifiers: every local and remote branch tip (89 refs)
#   for r in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes | grep -v HEAD); do
#     git grep -ohE "\bAS-1[2-9]\b|\bJDG-527\b|\bCR-547-[a-z]" $r -- docs change-request src tests tools .claude; done
#   -> 0 hits on every ref (2026-09-24)
#   AS-11: 2 hits per ref, both in .claude/skills/spec-graph-check/retired.py (a retired seat) and
#   docs/development-records/fixed-defects.md:376 -- so the next free row is AS-12

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py PR-16 AS-1 AS-3 AS-5 AS-7 AS-9 AS-10 FR-008 FR-059
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py PR-16 AS-1 AS-3 AS-5 AS-7 AS-9 AS-10 FR-008 FR-059 T-225 T-016 CM-44 CM-45
#   -> 13 of 13 seeds, 25 edges, 1 cycle of size 8 (section 6.2)

# other change requests holding the same text (each old block of section 4, counted in every CR-5xx)
#   -> 0 of 6 (scratchpad cr547-build.py, first 60 characters of each old block)

# every old block of section 4 occurs exactly once in its file, and all apply in order to a COPY
#   scratchpad cr547-build.py: read each "<!-- EDIT id=... file=... -->", take the next two ```text
#   blocks as old/new, LF-normalise, assert count(old) == 1, replace, write the copy
#   -> base 57511ed9: edits parsed 6 (E-01..E-06), problems 0, applied 6 of 6 (01-04 is LF: 0 CRLF)

# the copy: docs/spec, .claude/skills/spec-graph-check, src, tests copied to the scratchpad
#   (git archive 57511ed9 docs src tests tools .claude/skills change-request package.json | tar -x,
#    once untouched = before, once with the 6 edits = after; each check run from the copy's root)
#   md-checks.py .                     before tables=187 figures=27 rows=2303 uids=162
#                                      after  tables=187 figures=27 rows=2304 uids=162   exit 0
#   style-checks.py .                  exit 0; the same findings, 14 check-13 lines moved down by 2
#   check-line-breaks.py (46)          exit 0
#   check-marks.py (47)                exit 0
#   check-spec-holds-no-history.py .   exit 0
#   check-spec-id-references.py        exit 0 (83 = baseline)
#   strictdoc export --formats=html + check-render.py (49)  -> RESULT: PASS, exit 0
#   tools/generate_{display_words,help_roster,icon_roster,exchange_formats,startup_template}.py --check
#                                      exit 0 each (the generators that read 01-04 write nothing new)
#   check-quoted-source.py (42)        before 354 (baseline) -> after 356, exit 1: both new hits are
#                                      tests/unit/t-225-choosing-who-is-on-a-task.test.ts quoting the
#                                      deleted AS-7 sentence; the tester's rewrite (section 9) removes them
#   check-must-clause-coverage.py (39) before 1326 bare (baseline 1329) -> after 1331, exit 1: five new
#                                      MUST / MUST NOT clauses (AS-1, AS-3, AS-5 x2, AS-12 x2, less AS-7's
#                                      "1 人だけ" clause) are not yet quoted by any test
#   vitest: not run on the copy (no node_modules there; a junction is forbidden). No test parses table
#   T-225 out of 01-04 (grep of tests/ for readers of the file), so the spec edit alone reddens 0 cases;
#   the reds of section 9 come with the code change
```
