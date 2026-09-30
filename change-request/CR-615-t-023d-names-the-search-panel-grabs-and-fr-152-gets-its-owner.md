# CR-615 — 表 T-023d の結びが `GR-24`・`GR-25` を名指し、`FR-152` の持ち主を書く

> 起草の状態: 当てた（2026-10-01、枝 `cr-615-small-spec`、調整役の割り当て）。4 節の旧 6 つは当てる木で各 1 回だけ現れた。コードの変更は 0。`tests/unit/t-023d-follows-the-pointer.test.ts` は緑（69 件）、cr-435 の未記入の数は 21 から 20 へ下がった（基準線 17 は本書が書かない）。起草は 2026-10-01 の `dfa36886`。
> 読んだ木: `refactor` `dfa36886`。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-615`・`DFC-1478` 〜 `DFC-1479`・`JDG-996` 〜 `JDG-997` を受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。
> 当てる順: ⚠️ 当てていない `CR-613`（枝 `b3-export-shell-crs`）が、E-04 〜 E-06 と同じ 3 行（`05-07-design.md:558`・`:571`・`:575`）を自分の E-17・E-18 の旧に持つ（`FR-150` を埋める）。後に当てる方は、その旧を先に当たった方の新に合わせて直すこと —— 2 つとも当てた後の数は 107・19・14 である。ほかに旧を持つのは当てずみの `CR-561`・`CR-563` だけである（13 節）。
> 閉じるもの: `DFC-1285`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

利用者の裁定は無い。調整役の割り当て（2026-10-01）が範囲を 2 つに決めた —— ① `DFC-1285`（表 T-023d の結びが `GR-24`・`GR-25` を名指さない）② 表 T-075 の `FR-152` の「負う要求」を埋める（ほかの 3 件 `FR-130`・`FR-133`・`FR-150` は別の変更要求が埋める）。

### 0.2 調べた結果（dfa36886）

1. **試験が赤である。** `tests/unit/t-023d-follows-the-pointer.test.ts` の「leaves no row of table T-023d unaccounted for」は、表 T-023d の全行を「結びの規則が名指す行」「残る行（理由つき）」「`⚠️` の後で他所が求める行」「`FR-052` へ送る行」の 4 つに振り分け、`GR-24`・`GR-25` が残る（期待 `[]`、実測 `['GR-24', 'GR-25']`）。
2. **2 行はどちらも「動かす」「変える」行である。** `GR-24` の操作は「掴めばパネルを動かす」、`GR-25` は「掴めば大きさを変える」。結びは「本表と 表 T-270 の 操作 の欄が「動かす」「変える」「ずらす」と述べる行は、上の規則のいずれかで必ず追従する」と言う ⇒ 2 行とも追従する行であり、どこかが名指さなければならない。
3. **`GR-24` の追従は `SV-10` が既に MUST で持つ。** 「`GR-24` を握っているあいだ、パネルをポインタに追従させること（MUST）」。⇒ 兄弟の `GR-20`（「表 T-051 の `HF-15` が追従を同じ MUST で既に求めている」）と同じ形で名指せる。
4. **`GR-25` の追従は、どこも MUST で書いていない。** `SV-11` は「縁と角（`GR-25`）を握って大きさを変える」と下限・外に出さない、だけである。結びの「⛔ 本表で繰り返してはならない（MUST NOT）」があるので、表 T-023d の結びに MUST を書くのではなく、`SV-11` に書く（決定 1）。
5. **コードはすでに追従している。** `DFC-1285` の記録（「実装は `SV-10`・`SV-11` に従って握っているあいだ追従させている」）と、`search-panel.ts` の `searchPanelBoxAfterGrab`（縁は `spanAfterEdge`）⇒ コードの変更は 0 と見込む。
6. **`FR-152` の起点は、仕様自身が名指している。** 表 T-075 の `UF-71`（`dom-screen-surface.ts`）の責務は「UI パーツを 表 T-337 の重ね順に重ね、…画面の点がどの UI パーツのどの入口の上かを答える（`IF-9`）」であり、`FR-152` の 2 つの MUST（前後を 1 つの表で決める／押下は最も手前の UI パーツが受ける）の両方を 1 つのユニットが負う。`UF-71` の「負う要求」は `—` である。
7. **試験の引用は動かない。** `tests/system/cr-597-the-search-panel-word-jump-and-grab.test.ts` は `SV-11` の 1 文目（`SV_11_EDGE`）と末の文（`SV_11_INSIDE`）を引く —— E-02 はその 2 つを変えず、あいだに 2 文を足す。`tests/unit/t-051-hf-15-grabbing-a-row.test.ts` の `GR-20` の文の引用も、E-01 がその行を変えないので動かない。`cr-435` の試験は 5.3 の結びの数を仕様から読むので、E-04 〜 E-06 と同じコミットで緑の側に動く（基準線は動かさない —— 8 節）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— E-01・E-02。縁を握って引いても大きさが離すまで変わらなければ、壊れた操作子と見分けがつかない（表 T-023d の結びの「追従するものとしないものが混ざっていると、動かないほうが壊れて見える」）。
- E-03 〜 E-06 は、どの `CH-` も前へ進めない —— 要求からまず開くファイルを引く道（表 T-075 の欄）を埋める、仕様の保守の仕事である。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— 追従の MUST を `SV-10`・`SV-11` の 1 か所に置き、表 T-023d の結びは指すだけとする（結びの「同じ MUST が 2 か所に載ると、必ず離れていく」）。
- **`R1.5`（MECE）** —— 表 T-023d の行が結びの 4 つの振り分けのどれかに必ず入る。本書の後、漏れは 0 である（t-023d の試験）。
- **`R2.21`（1 つの仕事は 1 か所）** —— `FR-152` の起点を `UF-71` の 1 行にだけ書く（表 T-075 の「同じ要求を 2 つ以上の行に書いてはならない」）。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` を `DFC-1285`・`SV-11`・`FR-152` で引いた。当たる裁定は無い。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `GR-25` の追従の MUST は `SV-11` に書き、表 T-023d の結びは `GR-20` と同じ形で指すだけにする | 結びの「⛔ 本表で繰り返してはならない（MUST NOT）」。`GR-24` の MUST が `SV-10` に在るのと対にする | `SV-11` が 2 文ふえる |
| 決定 2 | `SV-11` の足す文は `SV-10` の 2 文と同じ形にする（握っているあいだ追従、離した時点で決まり、中断では元へ戻す） | 表 T-028 の `IN-1` がすでに求めることを、`SV-10` と同じく名指す。新しい振る舞いではない | 無い |
| 決定 3 | `FR-152` の区分は `OW-1`（単独） | 表 T-337 を読み、重ね、押下の宛先を答えるのは `UF-71` 1 つであり、兄弟はその結果を描くだけである（0.2 節の 6） | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 表 T-023d の結びが `GR-24`・`GR-25` を名指す | `01-04-requirements.md:4068` の後 | E-01 |
| `GR-25` を握っているあいだの追従 | 表 T-330 の `SV-11`（`01-04-requirements.md:4919`） | E-02 |
| `FR-152` の起点 | 表 T-075 の `UF-71` の「負う要求」（`05-07-design.md:528`） | E-03 |
| 5.3 の「負う要求」の欄の結びの数と一覧 | `05-07-design.md:558`・`:571`・`:575` | E-04 〜 E-06 |

**数**: 散文の編集 2（E-01・E-02 は表の行 1 と結びの 1 文）、表の行の編集 1（E-03）、数の編集 3（E-04 〜 E-06）。原稿 JSON の編集 0。図の編集 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・関数の名のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（dfa36886） | 置き換わる先 | 編集 |
|---|---|---|---|
| `UF-71` の「負う要求」の `—` | `05-07-design.md:528` | `` `FR-152`（`OW-1`） `` | E-03 |
| 「105 件」 | `05-07-design.md:558` | 「106 件」 | E-04 |
| 「21 件」 | `05-07-design.md:571` | 「20 件」 | E-05 |
| 「（16 件）」と一覧の `` ・ `FR-152` `` | `05-07-design.md:575` | 「（15 件）」、一覧から外す | E-06 |

E-01・E-02 は文を足すだけで、何も消さない。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（dfa36886 でどれも 1 回）。旧・新は行の全体（末の改行まで）である。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧
```text
⚠️ `GR-20` は、表 T-051 の `HF-15` が追従を同じ MUST で既に求めている。  
```
新
```text
⚠️ `GR-20` は、表 T-051 の `HF-15` が追従を同じ MUST で既に求めている。  
⚠️ `GR-24` / `GR-25` は、`FR-151` の 表 T-330 の `SV-10` / `SV-11` が追従を同じ MUST で既に求めている。  
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧
```text
| SV-11 | 大きさを変える | 縁と角（`GR-25`）を握って大きさを変える。<br>幅と高さの下限は `S-423`・`S-424`。<br>パネルを `Schedule Canvas` の外へ出してはならない（MUST NOT） |
```
新
```text
| SV-11 | 大きさを変える | 縁と角（`GR-25`）を握って大きさを変える。<br>握っているあいだ、パネルの大きさをポインタに追従させること（MUST）。<br>大きさが決まるのは離した時点、中断では元の大きさへ戻す（表 T-028 の `IN-1`、`SV-10` と同じ）。<br>幅と高さの下限は `S-423`・`S-424`。<br>パネルを `Schedule Canvas` の外へ出してはならない（MUST NOT） |
```

<!-- EDIT id=E-03 file=docs/spec/05-07-design.md -->
旧
```text
| UF-71 | `DomScreenSurface` | `dom-screen-surface.ts` | `non-pure` | `CP-38` の残り —— UI パーツを 表 T-337 の重ね順に重ね、記述の変わった UI パーツだけを兄弟に描かせ、画面の点がどの UI パーツのどの入口の上かを答える（`IF-9`）。<br>ヘッダの高さを測って知らせ、パネルと通知の置き場を決める（`FR-051`）。<br>表示の倍率の告げ（`SE-4`・`SE-5`）を描く。<br>兄弟が共有する語彙 —— 色（表 T-236・`FR-041`）・入口の寸法と見た目（`FR-029`・表 T-237）・見た目の表・UI パーツの名 —— を持つ。<br>⭐ **`FR-101` の「名前を時刻の上に置く」を満たすのは兄弟の `UF-104` である** —— `Opened File Name` を `File Saved At` の上に置く。<br>⛔ **記述の側に順序の欄を作って満たしてはならない** —— 作ると同じ配置が 2 か所で決まり、`UF-62` と `UF-104` のどちらが正かが読めなくなる | — |
```
新
```text
| UF-71 | `DomScreenSurface` | `dom-screen-surface.ts` | `non-pure` | `CP-38` の残り —— UI パーツを 表 T-337 の重ね順に重ね、記述の変わった UI パーツだけを兄弟に描かせ、画面の点がどの UI パーツのどの入口の上かを答える（`IF-9`）。<br>ヘッダの高さを測って知らせ、パネルと通知の置き場を決める（`FR-051`）。<br>表示の倍率の告げ（`SE-4`・`SE-5`）を描く。<br>兄弟が共有する語彙 —— 色（表 T-236・`FR-041`）・入口の寸法と見た目（`FR-029`・表 T-237）・見た目の表・UI パーツの名 —— を持つ。<br>⭐ **`FR-101` の「名前を時刻の上に置く」を満たすのは兄弟の `UF-104` である** —— `Opened File Name` を `File Saved At` の上に置く。<br>⛔ **記述の側に順序の欄を作って満たしてはならない** —— 作ると同じ配置が 2 か所で決まり、`UF-62` と `UF-104` のどちらが正かが読めなくなる | `FR-152`（`OW-1`） |
```

<!-- EDIT id=E-04 file=docs/spec/05-07-design.md -->
旧
```text
そのうち 105 件は、上の欄が起点のユニットを名指している。
```
新
```text
そのうち 106 件は、上の欄が起点のユニットを名指している。
```

<!-- EDIT id=E-05 file=docs/spec/05-07-design.md -->
旧
```text
⚠️ **起点をまだ書いていない要求が 21 件ある。**  
```
新
```text
⚠️ **起点をまだ書いていない要求が 20 件ある。**  
```

<!-- EDIT id=E-06 file=docs/spec/05-07-design.md -->
旧
```text
- **仕様が起点のユニットを決めていない（16 件）** —— `FR-027` ・ `FR-032` ・ `FR-034` ・ `FR-044` ・ `FR-048` ・ `FR-051` ・ `FR-091` ・ `FR-095` ・ `FR-097` ・ `FR-105` ・ `FR-106` ・ `FR-110` ・ `FR-130` ・ `FR-133` ・ `FR-150` ・ `FR-152`。
```
新
```text
- **仕様が起点のユニットを決めていない（15 件）** —— `FR-027` ・ `FR-032` ・ `FR-034` ・ `FR-044` ・ `FR-048` ・ `FR-051` ・ `FR-091` ・ `FR-095` ・ `FR-097` ・ `FR-105` ・ `FR-106` ・ `FR-110` ・ `FR-130` ・ `FR-133` ・ `FR-150`。
```

当てた後に打つもの: `npm run gen` → `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh`。`docs/development-records/changelog.md` に 1 行足す。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- Table T-023d closing paragraph: GR-24 / GR-25 (Search Panel heading band
  and edge) now sit in the "already required elsewhere" sentence, beside
  GR-20: SV-10 / SV-11 of table T-330 require the following.
- Table T-330 row SV-11: while GR-25 is held, the panel's size follows the
  pointer (MUST); the size settles on release, and an interrupt restores the
  size held before (T-028 IN-1, same as SV-10).
- Table T-075 row UF-71 (dom-screen-surface.ts): owner column now reads
  FR-152 (OW-1). The 5.3 closing counts: 106 named, 20 unwritten, 15 of them
  "the specification does not determine the owner".
- Expected code change: none (searchPanelBoxAfterGrab already resizes on
  every move while held).
- No new settings row, no new constant, no new identifier.
```

---

## 6. グラフ（dfa36886）

`PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py GR-24 GR-25 SV-11 FR-152 UF-71`:

- `GR-24`: 要求 2 件（`FR-151`・`FR-152`）／ 参照 6 箇所。`GR-25`: 要求 2 件 ／ 参照 6 箇所。どちらも塊「ポインタ操作」に属する —— 塊の中で変えるのは表 T-023d の結びの 1 文だけで、行も優先順も変えない。
- `SV-11`: 要求 2 件（`FR-016` の節に在る表 T-023d の `GR-25` の行・`FR-151`）／ 参照 5 箇所。足す 2 文は、どの参照先の読みも変えない（参照は行 ID を指すだけ）。
- `FR-152`: 指される要求 3 件（`FR-110`・`FR-053`・`FR-036`）／ 参照 5 箇所。E-06 はそのうち `05-07-design.md:575` の 1 箇所を消す。
- `UF-71`: 指す箇所 0。
- ⇒ ほかの文の書き換えは 0。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | dfa36886 | 本書を当てた後 | 差 |
|---|---|---|---|
| t-023d の「unaccounted」で残る行 | 2（`GR-24`・`GR-25`） | 0 | −2 |
| 表 T-075 の欄が名指す要求（5.3 の結び） | 105 | 106 | ＋1 |
| 起点をまだ書いていない要求（cr-435 の未記入の数） | 21 | 20 | −1 |
| そのうち「仕様が起点のユニットを決めていない」 | 16 | 15 | −1 |
| cr-435 の基準線（`requirement-owner-baseline.txt`） | 17 | 17（本書は書かない） | 0 |
| 表の行・uids（`md-checks.py`） | 変わらない | 変わらない | 0 |

⚠️ cr-435 の歯止めの試験は、20 ＞ 17 なので当てた後も赤のままである。残る 3 件（`FR-130`・`FR-133`・`FR-150`）は `CR-590` と `CR-563` ／ `CR-613` が埋める。

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（どれも 1 回） | 当てる体 |
| 1 | `docs/spec/01-04-requirements.md`（結びの 1 文・`SV-11` の 1 行）＋ `docs/spec/05-07-design.md`（`UF-71` の 1 行・結びの 3 行）＋ `changelog.md` の 1 行 ＋ `defects.md` の `DFC-1285` | E-01 〜 E-06、`gen`・`gen:check`、check.sh | 本書を起草した体（調整役の割り当て） |

- ⭐ **毎フレームの経路: いいえ。** コードは変わらない見込みである（0.2 節の 5）。`perf-pending.md` の行は要らない。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない（cr-435 の基準線は、前に立つ者が利用者に見せてから下げる）。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `docs/development-records/defects.md` | `DFC-1285` を `実測待ち` へ | いいえ |
| `.claude/skills/spec-graph-check/requirement-owner-baseline.txt` | ⛔ 本書は書かない。当てた後の未記入の数（20）を前に立つ者へ返す | いいえ |

---

## 10. ⛔ この変更でやらないこと

- 表 T-023d の行・優先順・`GR-24`・`GR-25` の欄を変えない。
- 結びの「残る行」の一覧（`GR-10` / `GR-11` / `GR-19`）を変えない —— 2 行は追従する行であり、残る行ではない。
- `FR-130`・`FR-133`・`FR-150` の「負う要求」を埋めない（0.1 節）。
- cr-435 の基準線を動かさない。

---

## 11. 前に立つ者へ返す問い

無い。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1285` | 0.2 節の 1 | `仕様待ち`。当てたら `実測待ち` |

---

## 13. 測り方の再現

```
# the tree: refactor dfa36886

# each old line appears once (section 4)
grep -c '`GR-20` は、表 T-051 の `HF-15` が追従を同じ MUST で既に求めている' docs/spec/01-04-requirements.md   # -> 1
grep -c '^| SV-11 | ' docs/spec/01-04-requirements.md   # -> 1
grep -c '^| UF-71 | ' docs/spec/05-07-design.md   # -> 1
grep -c 'そのうち 105 件は' docs/spec/05-07-design.md   # -> 1
grep -c '起点をまだ書いていない要求が 21 件ある' docs/spec/05-07-design.md   # -> 1
grep -c '仕様が起点のユニットを決めていない（16 件）' docs/spec/05-07-design.md   # -> 1

# the red before (0.2 item 1) and the count before (section 7)
node ../../../node_modules/vitest/vitest.mjs run tests/unit/t-023d-follows-the-pointer.test.ts
node ../../../node_modules/vitest/vitest.mjs run tests/contract/cr-435-every-requirement-names-a-unit.contract.test.ts

# SV-10 holds GR-24's following, SV-11 does not hold GR-25's (0.2 items 3-4)
grep -n '^| SV-10 \|^| SV-11 ' docs/spec/01-04-requirements.md

# the tests that quote the lines E-01 and E-02 touch (0.2 item 7)
grep -rn 'SV_11_\|同じ MUST で既に求めている' tests

# the change requests that hold the old text of E-04 .. E-06
grep -rl 'そのうち 105 件は\|（16 件）' change-request/   # -> CR-561, CR-563 (landed), CR-613 (in flight), and this file

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py GR-24 GR-25 SV-11 FR-152 UF-71
```

### 13.1 ⚠️ 測りが見られなかったもの

- **実物で縁を引いてはいない。** 追従しているという記述は `DFC-1285` の記録とコードの読みによる。
