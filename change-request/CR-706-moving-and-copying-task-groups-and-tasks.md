# CR-706 —— 行を移したときの WBS の親と、行とタスクの写しで写すもの

> 起草の状態: 当てた（2026-10-08、作業木 `1321f031` の上）。起草・仕様・コード・既存の試験・台帳を同じ作業木で行った。仕様だけを読む試験は別の体が書く（9 節）。
> ID の帯: 番号 `CR-706` と、`DFC-2270`〜`DFC-2274` を調整役から受けた。使ったのは `CR-706`・`DFC-2270` の 2 つ。表 T-015a の新しい行 `HM-12` は表の最大 `HM-11` の次（13 節）。`1321f031` の木で `CR-706` を名乗る所は `rulings.md` の `JDG-1699` の予定の欄だけ、`HM-12`・`DFC-2270` は 0 件。`JDG`・`PND` の新しい行は使わない。
> 当てる裁定: `JDG-1617`・`JDG-1631`・`JDG-1699`（`docs/development-records/rulings.md` の 2026-10-08 の節）。覆す裁定は無い（`JDG-561` は並べ替えの語であり、親を替える移動を決めていない —— `PND-773` の読みのとおり）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `rulings.md` の該当行）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1617` | 「上なら根・手の行の下なら近い親」（問 18、`PND-773`） | 表 T-015a に `HM-12` を足し、`HM-1`・`HM-7` が指す（E-01〜E-03）。コードの STOP を外す |
| `JDG-1631` | 「案3でいいんじゃない？ ユーザーがコピーしたいのは親タスクだけでしょ？ 子タスクまでコピーしたいなら親タスクと子タスクを両方選択してコピーするよね？ …やりすぎ注意」（`DFC-1240`・`PND-495`） | 表 T-223 の `DU-2` —— 写す行に載らない `Task` は写さず、断らない（E-08）。コードの STOP と断りを外す |
| `JDG-1699` | （利用者には問うていない。調整役が `JDG-1696` の下で推奨を採った） | `JDG-1631` の規則をタスクのコピーにも当てる —— 表 T-223 の `DU-1` は選んだ `Task` だけを写し、写した子の親が写されないときは元の親を保つ（E-04〜E-07・E-09〜E-11） |

### 0.2 裁定の鎖（rulings.md を「WBS の親」「行を移」「写し」「複製」「部分木」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-314` | 移してきたバーは、移した後の行のバー | `JDG-1617` が向きの根拠に引く。`HM-12` の ⭐ の文に書いた |
| `JDG-561` | 並び順が変わっても階層や日程は変わらない | 保つ。並べ替え（`HM-8`）は親を変えないと `HM-12` に書いた。`cr-567` の試験の「いちばん上へ移しても親は変わらない」の段は、親を替える移動なので外した（9 節） |
| `JDG-521` | 写しは未着手 | 保つ。`DU-1` の実績の文は変えない |
| `JDG-1330`〜`JDG-1333` | `Ctrl` ＋ `Shift` の写し | 保つ。`CY-1`・`CY-5`・`CY-11` は変えない |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-1` / `GL-008`（作図ソフトと同じ操作感で描きながら、構造化した日程データを出す）—— 行を移した結果が WBS に素直に出る。写すものが人の選んだものと一致する。
- `GL-006`（説明を読まずに操作できる）—— 行の写しが黙って断られることが無くなる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- `R1.3`（唯一の正）—— 写すものの規則は 表 T-223 の `DU-1` の 1 か所に置き、`FR-033` の本文・`CY-3`・`CM-8`・`UF-73` は指すだけにした。`FR-033` の本文にあった「1 度だけ複製」「複製の根」の 2 文は `DU-1` へ移し、本文は 1 文で指す。
- `R1.2`（読みが 1 つ）—— 「近い導出元の親」を、移した先の親の行から行の木を根の側へたどり最初に出会う導出元を持つ行、と書いた（調整役の読み）。導出元の `Task` が文書に無い行は導出元を持たないと読む。
- `R1.4`（境界）—— いちばん上の段（親の行が無い）、手で作った行だけが続く祖先、決めた親が WBS の子孫になる輪（`HM-4`）、並べ替え（親が同じ）を `HM-12` に書いた。
- `R1.1`（検証できる）—— `DU-1` と 表 T-050 の `CD-1` の一致の文は、WBS の子孫が外れても「写してすぐ消せば元に戻る」が真であることを書き添えた（写しの子孫は写しだけ）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 「近い導出元の親」は、移した先の親の行から根の側へたどって最初に導出元を持つ行の `Task`。無ければ根 | 調整役が裁定の読みとして決めた（問うていない） | 無い |
| X-2 | 導出元の `Task` が文書に無い行は、導出元を持たない行として飛ばす | いまのコード（`wbsParentAfterTheMove`）が同じ扱いをしていた | 無い |
| X-3 | 命令の名 `pasteTaskSubtree`・`pasteTaskGroupSubtree` は変えない。`CM-8` の語義だけを「選んだ `Task` を複製する」にした | 調整役の指示（名の変更は後の CR が持つ）。名は部分木を言うが、中身はもう選んだ `Task` だけ | 名と中身が食い違う（後の改名の CR で揃える） |
| X-4 | `CY-6` の末尾の文（子孫の写しも同じだけ動く）は消した | 選んでいない子孫は写さないので、文の前提が無い。親と子を両方選べば「すべての写し」が同じだけ動く | 無い |
| X-5 | 写した行の `derivedFromTaskUid` は本書では直さず、`DFC-2270` に起こした | 表 T-223 の `DU-2` は導出元を言わない。仕様と食い違うときは台帳へ（`JDG` の決まり） | 写した行を移すと元の `Task` の WBS の親が変わる（`DFC-2270`） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| `HM-1` が `HM-12` を指す | `docs/spec/01-04-requirements.md` の `FR-005` の 表 T-015a の `HM-1` | E-01 |
| `HM-7` が `HM-12` を指す | 同 `HM-7` | E-02 |
| 移した行の `Task` の WBS の親 | 同 表 T-015a に `HM-12` | E-03 |
| 写すのは選んだ `Task` だけ | `FR-033` の STATEMENT | E-04 |
| 閉じた依存の範囲 | `FR-033` の依存の段 | E-05 |
| 本文の 2 文を `DU-1` へ移す | `FR-033` の ⭐ の 2 文 | E-06 |
| 選ばれていない子孫を写さない・写しの WBS の親 | `FR-033` の 表 T-223 の `DU-1` | E-07 |
| 行の写しは写す行に載る `Task` だけ | 同 `DU-2` | E-08 |
| `DU-1` と `CD-1` の一致 | `FR-033` の 表 T-223 の後の段 | E-09 |
| `Ctrl` ドラッグの写すもの | `FR-033` の 表 T-308 の `CY-3` | E-10 |
| 子孫の写しの文を消す | 同 `CY-6` | E-11 |
| `CM-8` の語義 | `docs/spec/_assets/tbl-glossary.md` の 表 T-108 の `CM-8` | E-12 |
| `UF-73` の文 | `docs/spec/05-07-design.md` の 表 T-075 の `UF-73` | E-13 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行（4.06） | E-14 |

数: 表の行 ＋1（`HM-12`）。要求 ±0。表 ±0。辞書 ±0。設定値 ±0。図 0。命令 ±0（名も変えない）。`01-04-requirements.md` の `（MUST）` の印 1696 → 1697（`HM-12` と `DU-1` の写しの親で ＋2、`FR-033` の本文の 2 文を 1 文にして −1）、`（MUST NOT）` の印 935 → 936（`DU-1`）。

---

## 2. 新しい識別子

| 識別子 | 何 | 測り方 |
|---|---|---|
| `HM-12` | 表 T-015a の行。導出元を持つ行を別の親の下かいちばん上へ移したときの、その `Task` の WBS の親 | 表 T-015a の最大は `HM-11`。木に `HM-12` は 0 件（13 節） |
| `DFC-2270` | 台帳の行。写した行の `derivedFromTaskUid` が元の `Task` を指したまま | 帯 `DFC-2270`〜`DFC-2274` の頭。木に 0 件 |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `FR-033` の STATEMENT「選ばれた `Task` とその WBS の子孫を部分木ごと複製すること」 | 「選ばれた `Task` だけを複製すること」 |
| `FR-033` の「⭐ 選ばれた `Task` のうち、ほかの選ばれた `Task` の WBS の子孫であるものは、その祖先の部分木として 1 度だけ複製すること（MUST）…」 | 消す（選んだものだけを写すので、2 度写す道が無い） |
| `FR-033` の「⭐ 複製の根（選ばれた `Task` の複製）は、複製元と同じ WBS の親の下に兄弟として置き…（MUST）…」 | `DU-1` の「写しの WBS の親」の文へ移す。本文は「選ばれていない `Task` を複製するかどうかと、写しの WBS の親は、表 T-223 の `DU-1` に従うこと（MUST）」の 1 文 |
| `DU-1` の「**その `Task` の WBS の子孫**、」 | 消す。代わりに「⛔ 選ばれていない WBS の子孫を複製してはならない（MUST NOT）」 |
| `DU-1`・`FR-033` の「部分木の内側で閉じた依存」 | 「複製する `Task` どうしで閉じた依存」 |
| `DU-1` と `CD-1` の一致の文「`DU-1` が複製するものは、表 T-050 の `CD-1` が消すものと、`TaskOrigin` を除いて一致すること」 | 「`DU-1` が 1 つの `Task` に連れて複製するものは、`CD-1` がその `Task` と一緒に消すもののうち、WBS の子孫と `TaskOrigin` を除いたものと一致すること」 |
| `CY-3` の「選択に含まれるタスクのすべてと、その WBS の子孫」 | 「選択に含まれるタスクのすべて。選択に含まれない WBS の子孫は写さず…」 |
| `CY-6` の「⚠️ WBS の子孫の写しも、根の写しと同じ日数と行数だけ動く —— …」 | 消す（X-4） |
| `CM-8` の「部分木を複製する」 | 「選んだ `Task` を複製する（…運ばない WBS の子孫は写さない —— 表 T-223 の `DU-1`）」 |
| `UF-73` の「選んだタスクを WBS の部分木ごと写す」 | 「選んだタスクだけを写し、選ばれていない WBS の子孫は写さない」 |
| コード `task-group-order.ts` の STOP（`PND-773`）、`edit-task-group.ts` の STOP（`PND-495`）と `DU-2` の断り | 消す |

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
```text
| HM-1 | 階層の変更を WBS へ反映する。<br>移した行の `Task` が WBS のどの親の下に入るかは `HM-12` に従う |
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
```text
| HM-7 | 人が手で作った器は WBS の移動に追随しない。<br>⚠️ 手で作った行は `Task` を持たないので、その行の下へ移した行の `Task` の親にはなれない —— そのときの親は `HM-12` が持つ |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`HM-11` の後に足す:

```text
| HM-12 | 導出元を持つ行（`derivedFromTaskUid` が文書の `Task` を指す行）を、別の親の行の下か、いちばん上の段へ移したときは、その行の `Task` の WBS の親を次のとおりとすること（MUST）。<br>移した先の親の行から行の木を根の側へたどり、最初に出会う導出元を持つ行の `Task` を親とする —— 移した先の親の行が導出元を持てば、その行の `Task` である。<br>たどっても導出元を持つ行が無いとき（いちばん上の段へ移したときを含む）は、根（親なし）とする。<br>⭐ 移した後の行のバーは、移した後の行のバーである —— WBS の親を、行の木の上で最も近い導出元に合わせる。<br>⚠️ 同じ親の下の並べ替え（`HM-8`）は WBS の親を変えない。<br>⚠️ 決めた親が、移した `Task` の WBS の子孫であるときは、`HM-4` により移動を受け付けない。<br>⚠️ 手で作った行そのものを移しても、WBS は変わらない（`HM-7`） |
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
```text
**STATEMENT**: 作成者がタスクを選んでコピーし貼り付けたとき、`GRS` は、**選ばれた `Task` だけを**複製すること。
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
```text
複製する `Task` どうしで閉じている依存だけを複製すること（MUST）。
複製する `Task` の外へ出る依存を複製してはならない（MUST NOT） —— 外へ出る依存を写すと、貼り付けるたびに同じ先行へ依存線が増える。
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
3 節の 2 行目・3 行目を 1 文にする:

```text
⭐ 選ばれていない `Task` を複製するかどうかと、写しの WBS の親は、表 T-223 の `DU-1` に従うこと（MUST）。
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
`DU-1` の頭（実績の文から後は変えない）:

```text
| DU-1 | `Task` | `TaskVisual`、`TaskGroupMember`、複製する `Task` どうしで閉じた依存、その `Task` を指す割当（`Assignment`）。<br>⛔ 選ばれていない WBS の子孫を複製してはならない（MUST NOT） —— 写すのは人が選んだ `Task` だけである。<br>子も写したいときは、人が親と子の両方を選ぶ —— 気を利かせて子孫を足すと、人が選んだものより多く写る。<br>⭐ 写しの WBS の親は、写し元の親も写すときはその写しとし、写さないときは写し元と同じ親とすること（MUST） —— 写し元と同じ親の下に兄弟として並び、親の集計から外れない（根にすると外れ、同じ形の工程を並べるという目的を満たさない）。<br>⛔ `TaskOrigin` は複製してはならない（MUST NOT）。…
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
`DU-2` の頭（「複製した `Task` は複製した行に載せる」から後は変えない）:

```text
| DU-2 | 行（`TaskGroup`） | 配下の行、その行に載っているすべての `Task`（`DU-1` が各 `Task` に連鎖する —— 複製する行に載る `Task` を、選ばれた `Task` として扱う）。<br>⭐ 複製する行に載っていない `Task` は複製しない —— 複製する行に載る `Task` の WBS の子孫でも、別の行に載るものは写さず、そのために貼り付けを断ることもしない。<br>別の行に載る子孫も写したいときは、人がそれを選んで写す（`DU-1`）。<br>⚠️ 複製した `Task` は複製した行に載せる。…
```

<!-- EDIT id=E-09 file=docs/spec/01-04-requirements.md -->
```text
`DU-1` が 1 つの `Task` に連れて複製するものは、表 T-050 の `CD-1` がその `Task` と一緒に消すもののうち、WBS の子孫と `TaskOrigin` を除いたものと一致すること（MUST） —— 複製してすぐ消したときに、元と違う文書が残ってはならない。
WBS の子孫が外れても、写しを消せば元の文書に戻る —— 写しの WBS の子孫は写しだけである（`DU-1` の写しの WBS の親）。
`TaskOrigin` が外れる理由は本要求が上で述べている。
```

<!-- EDIT id=E-10 file=docs/spec/01-04-requirements.md -->
```text
| CY-3 | 写すもの | 選択に含まれるタスクのすべて。<br>選択に含まれない WBS の子孫は写さず、一緒に写るものは 表 T-223 の `DU-1` のとおりとする（写すタスクどうしで閉じた依存を含み、`TaskOrigin` を含まない）。<br>…（後は変えない）
```

<!-- EDIT id=E-11 file=docs/spec/01-04-requirements.md -->
`CY-6` の末尾の「<br>⚠️ WBS の子孫の写しも、根の写しと同じ日数と行数だけ動く —— …写し元に重なる」を消す。

<!-- EDIT id=E-12 file=docs/spec/_assets/tbl-glossary.md -->
```text
| CM-8 | `Task` | `pasteTaskSubtree` | ⭐ | 選んだ `Task` を複製する（複製元の `Task` を 1 つ以上運び、運ばない WBS の子孫は写さない —— `01-04-requirements.md` の 表 T-223 の `DU-1`）。<br>…（後は変えない）
```

<!-- EDIT id=E-13 file=docs/spec/05-07-design.md -->
```text
| UF-73 | `EditDocument` | `task-paste.ts` | `pure` | 選んだタスクだけを写し、選ばれていない WBS の子孫は写さない | `FR-033`（`OW-2`） |
```

<!-- EDIT id=E-14 file=docs/development-records/changelog.md -->
変更履歴の表の終わりに次の版の 1 行を足す（4.06。版がぶつかれば調整役が付け直す）。

### 4.1 生成物

`npm run gen` が `_assets/tbl-row-id-prefixes.md`（頭字 `HM` の行数 11 → 12、`DFC` 1 行）と `docs/development-records/test-inventory.md` を刷る。`tools/ledger_metrics.py` が台帳の数の区画を刷る。手で直さない。

---

## 5. 継ぎ目（コード）

| ファイル | 変えるもの |
|---|---|
| `src/use-case/edit-document/task-group-order.ts` | `wbsParentAfterTheMove` の STOP を外し、`nearestDerivedTaskUid`（`HM-12`）で親を決める。根は `null`。輪の判じ（`HM-4`）は根を飛ばす |
| `src/use-case/edit-document/edit-task-group.ts` | `pasteTaskGroupSubtree` は写す行に載る `Task` だけを写す（`wbsSubtreesOf` を外す）。STOP と `DU-2` の断りを外した。写しの WBS の親は前と同じく、写したなら写し、写さないなら元の親 |
| `src/use-case/edit-document/task-paste.ts` | `pastedUidsOf`・`pasteTaskSubtree` は渡された `Task` だけを写す（`wbsSubtreesOf` を外す） |
| `src/adapter/input-command-translator/item-grab.ts` | `copyDragWrite` が写しの行を数えるのは選んだ `Task` だけ（`CY-3`・`CY-6`） |

新しい命令・新しい `Agent API` のメンバ・新しい辞書の語は無い。命令の名は変えない（X-3）。

---

## 6. グラフ（`1321f031` の上で当てた後）

- `impact.py DU-1 DU-2 HM-1 HM-7 FR-033`（当てる前）: `DU-1` を指すのは `FR-033` の 4 か所だけ、`DU-2` は `FR-033` の 2 か所と `05-07-design.md`:510（`UF-168`、文は変えない）と `fig-erd-detail.md`:372（`AT-153` の `treeState`、変えない）。`HM-1`・`HM-7` を指す所は 0。
- `impact.py HM-12 CY-3 CY-6 CM-8`（当てた後）: `HM-12` を指すのは `FR-005` の `HM-1`・`HM-7`。`CY-3` を指す所は 0。`CY-6` は `FR-033` と `CM-8`。`CM-8` は `FR-033` の 2 か所と `tbl-published-entries.md`:27（命令の名だけを引く）。
- `induced.py HM-1 HM-7 HM-12 FR-005 FR-033 DU-1 DU-2 CY-3 CY-6 CD-1 CM-8 UF-73`（当てた後）: 種 12 のうち 12、内側の辺 16、輪 2 つ —— `HM-12 ↔ HM-7`（2）と `CM-8 → DU-1 → DU-2 → FR-033`（4）。どちらも E-01〜E-13 を 1 つの台本で同時に書いた。
- 「部分木」「WBS の子孫」を `docs/spec` で引き直した: 写しに関わる文は本書の E-04〜E-13 で全部。`CD-1`・`QN-2`・`HM-10`・表 T-050 の後の段の「WBS の子孫」は消す側の文で、変えない。

---

## 7. 試験の測り（既存の試験）

当てた後、`vitest` の全体（錠の下）は 426 本のうち赤が `cr-586-iv-22` の 1 本 2 件だけで、これは `tests/known-red.txt` の `DFC-922` の行である。写し・移動に触れる 11 本（`cr-560`・`cr-567`・`cr-656`・`dfc-290`・`h4`・`e24`・`cr-608`・`cr-404`・`t-051-hf-15`・`dfc-685`・`cr-429`）は緑。`playwright` で `tests/system/duplicate-paste-and-dual-cursor.test.ts`・`tests/system/cr-570-tree-state-paste.test.ts`・`tests/usecase/uc-002-build-rows-as-a-hierarchy.test.ts` の 16 件が緑（作業木で `vite build` した dist）。古い振る舞いを主張していた段は 9 節のとおり直した。

---

## 8. 波

1 つの作業木で、仕様 → 生成 → コード → 既存の試験 → 台帳の順に当てた。

- 毎フレームの経路（規則 04 の 5 節の表）には触れない。`item-grab.ts` の `copyDragWrite` は押しているあいだの写しの絵でも呼ばれるが、表の道ではなく、仕事は減る（部分木を掃く代わりに選んだものだけ）—— `perf-pending.md` に行は足さない。

---

## 9. 仕様の外で直すもの

- コード: 5 節。
- 古い振る舞いを主張していた試験を直した（新しい条を指す）:
  - `tests/unit/cr-567-an-imported-leaf-task-sits-on-its-parents-row.test.ts` —— `rowMoves` から `moveTaskGroup`（入れ子の行をいちばん上へ）を外した（`HM-12` で親が根になる）。
  - `tests/unit/cr-560-ctrl-drag-copies-the-selection-unstarted.test.ts` —— 子の写しを見る段は親と子を両方選ぶ（`selectRootAndChild`・`PICKED_ROOT_AND_CHILD`）。根だけを選ぶ段は写しが 1 つ。
  - `tests/unit/cr-656-shift-drag-keeps-the-dates.test.ts` —— 写しは `Root` だけ。
  - `tests/contract/dfc-290-d-321-fr-033-copy-and-paste-reach-the-document.test.ts` —— STATEMENT の引用、写しの数 3、安全弁の 1 回目の数。
  - `tests/unit/h4-several-copied-tasks-paste-back.test.ts`・`tests/contract/e24-paste-refused-while-several-rows-are-chosen.test.ts` —— 引く文を `FR-033` の新しい 1 文と `DU-1` の写しの親の文に替えた。
- 仕様だけを読む試験（別の体）: `HM-12`（いちばん上 → 根、手で作った行の下 → 祖先の最も近い導出元、手で作った行だけ → 根、輪は `HM-4`、並べ替えは変えない）、`DU-1`（選ばれていない子孫は写さない・親を写さない子は元の親）、`DU-2`（別の行の子孫を写さず断らない）、`CY-3`。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 命令の名・行（タスクグループ）の名を変えない —— 改名の CR が後に持つ。
- 写した行の `derivedFromTaskUid` は直さない（`DFC-2270`）。
- 消すときの連鎖（表 T-050 の `CD-1`）は変えない —— 子孫ごと消す。
- 触れ合う: `properties-panel*`・`frame-loop.ts`・`field-commit.ts`・`schedule-layout.ts`・`row-title-panel.ts`・`input-command-translator.ts`・`screen-renderer.ts`・`svg-renderer.ts` は触れていない（`CR-689` の持ち場）。

---

## 11. 利用者に問うこと

- `DFC-2270`: 写した行の名前の導出元をどうするか（推奨は ① —— 導出元の `Task` も写すときはその写しへ付け替え、写さないときは名前を確定させて空にする）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1617` | 上なら根・手の行の下なら近い親 | 指示 → 適用済、着地先 表 T-015a の `HM-12` |
| `JDG-1631` | 行の写しは選んだ行のタスクだけ | 指示 → 適用済、着地先 表 T-223 の `DU-2` |
| `JDG-1699` | タスクの写しも選んだタスクだけ | 指示 → 適用済、着地先 表 T-223 の `DU-1`・表 T-308 の `CY-3` |
| `PND-773` | 行を移したときの WBS の親 | `裁定済` のまま、着地を書き足した |
| `PND-495` | 行の写しの子孫の行 | `裁定済` のまま、着地を書き足した |
| `DFC-1240` | 行の写しが断られる | `仕様待ち` → `実測待ち`（利用者の手順を書いた） |
| `DFC-2270` | 写した行の導出元が元のまま | 新しく起こした（`裁定待ち`） |

---

## 13. 測り方の再現

```
# the tree: worktree at 1321f031
git grep -nE "CR-706|HM-12\b|DFC-2270" 1321f031 -- .          # only rulings.md JDG-1699 names CR-706
grep -n "^| HM-" docs/spec/01-04-requirements.md                # max HM-11 before
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py DU-1 DU-2 HM-1 HM-7 FR-033
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py HM-12 CY-3 CY-6 CM-8
```
