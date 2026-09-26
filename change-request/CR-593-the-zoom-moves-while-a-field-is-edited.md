# CR-593 — 欄を編集しているあいだも、人のズームとスクロールは書き込める

> 起草の状態: 当てた（2026-09-27、枝 `lane-l3`）。11 節の問いに利用者は A と答えた（`JDG-810`）。4 節の旧は 1 回だけ現れ、そのまま当てた。（起草の記: 起草のみ（2026-09-27、枝 `lane-l3`）。）
> 読んだ木: `lane-l3` の `b30364cb`（`refactor` の `9d6d59d9` を取り込んだ木）。行番号は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-593` を受けた（`DFC-1260` の仕様の側）。新しい識別子は取らない（2 節）。
> 閉じるもの: `DFC-1260`（表 T-338 の `MH-4` と 表 T-067 の `WS-2` の食い違い）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— 行の最小高さの欄に数を打ちかけたまま縦の倍率を変え、現在の高さを読みながら数を選ぶ（`MH-4` の理由）。いまは倍率が動かず、選ぶには一度確定して打ち直すしかない。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾がない）** —— 表 T-338 の `MH-4`（`docs/spec/01-04-requirements.md:2177`）は「欄を編集しているあいだも書き換えること（MUST）」とし、理由に「打ちかけの数が消えると、倍率を変えながら数を選べない」と書く。倍率が編集中に動くことが前提である。一方、表 T-067 の `WS-2`（`docs/spec/05-07-design.md:710`）は「編集入力の確定前…は拒否する」とし、縦の倍率 `zoomY` は文書の値なので、人の Alt ＋ ホイールも拒まれる。⇒ 2 文は同時に真になれない。
- **`R1.3`（出どころ）** —— `WS-2` の「編集入力の確定前」は、表 T-035 の `AG-9`（`01-04-requirements.md:6947`）の写しである。`AG-9` は `Agent API` の書き込みの規則であり、身振りについては「パンと範囲選択は文書を変えないので拒否しない」「対象は表 T-027 の取り消し対象行と一致させる」と線を引いている。⇒ 編集入力の確定前にも同じ線（表 T-027 の `UN-8` ＝ ズーム・スクロール・パンは取り消しの対象外）を引けば、2 文が揃う。
- **`R4.3`（原子性）** —— 拒む理由は「途中の状態へ書き込むと、確定の瞬間に人の操作が上書きする」（`AG-9`）。ズームとスクロールは確定される欄の値に触れず、取り消しの段も積まない（`UN-8`）ので、この理由に当たらない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 例外の線を 表 T-027 の `UN-8`（ズーム・スクロール・パン）に置く。表示の倍率（`S-234`）・表示の切り替え・パネルの幅は含めない | `AG-9` が身振りに引いた線と同じ表の同じ行。`MH-4` が編集中に動くことを求めるのは縦の倍率である | 編集中に表示の倍率を変える道（キー）は、今までどおり確定の後になる |
| 決定 2 | 例外は人の書き込みにも `Agent API` の書き込みにも同じに効く | `WS-2` は書き手を区別しない表であり、`AG-9` の「同格」 | `Agent API` も編集中にズームとスクロールを書ける |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 編集中の拒みの例外 | 表 T-067 の `WS-2` の 1 行 | E-01 | その行の 1 文 |

## 2. 新しい識別子

無い。行・表・要求・接頭辞を 1 つも足さない。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所 | 置き換わる先 | 編集 |
|---|---|---|---|
| `WS-2` の「編集入力の確定前は拒否する」の、例外を持たない読み | `docs/spec/05-07-design.md:710` | 文は残し、`UN-8` の書き込みを除く 1 文を足す | E-01 |
| コードの「編集中は書き込みをすべて拒む」 | `src/use-case/apply-document-change/document-change-plan.ts:203`（`refusalOfMoment`） | 束のすべての命令が `setZoom`・`setScrollPosition`・`fitScheduleToScreen`（`CM-71`。`01-04-requirements.md` の `FR-031` が「表 T-027 の `UN-8` により段を積まない」と書く）なら拒まない | 実装する者（9 節） |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える。

<!-- EDIT id=E-01 file=docs/spec/05-07-design.md -->
旧
```text
| WS-2 | 2 | 書ける時機かを見る。<br>**身振りの最中・編集入力の確定前・通知の配布中は拒否する** | `pure` | `AG-9` ／ 本節 |
```
新
```text
| WS-2 | 2 | 書ける時機かを見る。<br>**身振りの最中・編集入力の確定前・通知の配布中は拒否する**<br>⚠️ 編集入力の確定前でも、`01-04-requirements.md` の 表 T-027 の `UN-8`（ズーム・スクロール・パン）だけから成る書き込みは拒否しない —— 確定される欄の値にも取り消しの段にも触れず、同書の 表 T-338 の `MH-4` が欄を編集しながら倍率を変えることを求める | `pure` | `AG-9` ／ 本節 |
```

## 5. 継ぎ目 —— 依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- The rule is table T-067 row WS-2 as CR-593 E-01 leaves it: while an edit
  in place is unsettled, a write whose every command falls under table
  T-027 UN-8 (zoom, scroll, pan -- today the command kinds setZoom,
  setScrollPosition and fitScheduleToScreen, which is CM-71) is NOT refused; every other write still is (RS-8).
- A gesture in flight and notice delivery keep refusing everything, as now.
- Code: src/use-case/apply-document-change/document-change-plan.ts
  refusalOfMoment / planDocumentChange -- the editingInPlace refusal skips a
  batch made only of UN-8 commands. No new command, no new constant.
- The edited field keeps its typed text and focus (MH-4 MUST NOT).
```

## 6. グラフ（`b30364cb`）

- `impact.py WS-2 MH-4 T-067 AG-9`: `WS-2` を指す要求 2 件・参照 10 か所（`FR-076` の `RS-7`〜`RS-9`、`FR-040`、5.3・5.5・5.6 節、状態機械 `changeDeliveryStateMachine`・`pointerPressStateMachine`）。`MH-4` は指す箇所 0。
- ⭐ 届いた先のうち「編集入力の確定前」を引くのは `RS-8`（理由の語）だけであり、例外の後も `RS-8` はズームとスクロール以外の拒みで使われる —— 偽にならない。`IN-6` は「`WS-2` が `Agent API` の書き込みを拒み続け」と書く —— ズームとスクロールを除けば今も真。
- `rulings.md` を `MH-4`・`WS-2`・`T-067`・「確定前」で引いた: 当たりは `JDG-710`〜`JDG-717`（`CR-582`）だけで、編集中の拒みを決めた裁定は無い。

## 7. 数の予測

tables / figures / rows / uids は 0 の差（1 行の中に 1 文を足すだけ）。

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 11 節の答えを受ける。旧をもう 1 度数える | L3 |
| 1 | `docs/spec/05-07-design.md`（`WS-2` の 1 行） | E-01 | L3 |
| 2 | `src/use-case/apply-document-change/document-change-plan.ts` とその試験 | 5 節の継ぎ目 | 実装の体 |
| 3 | `tests/contract/cr-593-*.test.ts`（新しいファイルだけ） | 編集中に Alt ＋ ホイールで `zoomY` が動く／打ちかけの字と焦点が残る／編集中のそれ以外の書き込み（例: パレットの命令、`Agent API` の `setTaskName`）は `RS-8` で拒まれる／身振りの最中と通知の配布中は今のまま | 仕様だけの試験の体 |

⭐ `tests/known-red.txt` の `DFC-1260` の行（`cr-582` の `MH-4` の編集中の場合）は、波 2 で緑になる ⇒ その行を外す。

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 関数 | 何を | 毎フレーム |
|---|---|---|---|
| `src/use-case/apply-document-change/document-change-plan.ts` | `refusalOfMoment`（`:200`〜`:206`）と、それを呼ぶ `planDocumentChange` | 束のすべての命令が `UN-8` の種類なら `editingInPlace` で拒まない | いいえ（書き込みのときだけ） |

## 10. ⛔ この変更でやらないこと

- 身振りの最中（`AG-9` の前段）と通知の配布中の拒みを変えない。
- 表示の倍率（`S-234`）・表示の切り替え・パネルの幅を例外に入れない（決定 1）。
- `IN-5a`（単文字キーと `Delete` を編集中に効かせない）を変えない。

## 11. 利用者に問うこと

| 問い | 案 | 推し |
|---|---|---|
| 行の名前や最小高さの欄に打ちかけている最中に、Alt ＋ ホイールで縦の倍率を変えたら、倍率は動くべきか | **A**: 動く。編集中でも、ズームとスクロール（取り消しの対象外）だけは書き込める（本書の E-01）。打ちかけの字と焦点は残る ／ **B**: 動かない。`MH-4` の「編集しているあいだも」を、表示の倍率と行の中身の変化に限り、縦の倍率は確定の後とする（`MH-4` の文を直す） | ⭐ **A** —— `MH-4` の理由「倍率を変えながら数を選べない」をそのまま満たす。線は `AG-9` が身振りに引いた線（取り消しの対象かどうか）と同じなので、新しい規則を作らない。代償: `Agent API` も編集中にズームとスクロールを書ける（見る位置だけで、人の打ちかけの字には触れない） |

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1260` | `MH-4` と `WS-2` の食い違い | 本書で閉じる（仕様とコード） |

## 13. 測り方の再現

```
# the tree: lane-l3 b30364cb
git grep -n "| WS-2 |" -- docs/spec/05-07-design.md          # :710, 1 hit
git grep -n "| MH-4 |" -- docs/spec/01-04-requirements.md     # :2177
git grep -n "| AG-9 |\|| UN-8 |" -- docs/spec/01-04-requirements.md
python .claude/skills/spec-graph-check/impact.py WS-2 MH-4 T-067 AG-9
grep -n "MH-4\|WS-2\|T-067\|確定前" docs/development-records/rulings.md
# the refusal: src/use-case/apply-document-change/document-change-plan.ts refusalOfMoment
# the red: tests/contract/cr-582-the-min-height-field-reads-the-current-height.test.ts (MH-4, while a field is held)
```
