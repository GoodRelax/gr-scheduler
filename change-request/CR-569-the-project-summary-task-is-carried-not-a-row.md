# CR-569 — MS Project のプロジェクトの要約タスクは行にならず、ファイルの最上位のタスクが最上位の行になる

> 起草の状態: 起草（2026-09-25）。未着地。本書を書いた体は `docs/spec/`・`src/`・`tests/` に 1 字も書いていない（書いたのは本書と台帳の 2 行だけ）。
> 問いの状態: 11 節の問い 2 つに答えが下りた（2026-09-25、`JDG-581`・`JDG-582`）—— どちらも案 ①（推奨）。問い 2 の案 ① が足す文は E-08、継ぎ目は 5 節の「問い 2」の 2 行である。
> 読んだ木: `7a106ad1`（`origin/refactor`）。行番号・数・参照は、すべてこの木で測った（測り方は 13 節）。
> ID の帯: 調整役から `CR-569`・`JDG-580` 〜 `JDG-589`・`DFC-982` 〜 `DFC-989` を受けた（`DFC-981` は使用済み）。測った: 帯の中の ID は `CR-567` と `CR-568` の「帯」の文に現れるだけで、台帳の行としては 0。本書が使うのは `JDG-580`・`DFC-982` と、表 T-265 の新しい行 `MR-4` だけである。問いの答えで `JDG-581`・`JDG-582` を足した。
> 当てる順: ⛔ 段 8 の性能の測定（RISK-001）の**前**。`sample-small-website-renewal.en.xml` を開く性能の試験（`tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts:456`）の行が 7 → 6 に変わるので、測ってから当てると測り直しになる。`CR-567`（着地済み）の後。
> ⛔ `src/adapter/document-codec/mspdi-codec.ts` を触るほかの CR と同じ波に入れない。当てる直前に `file:line` を測り直すこと。
>
> 閉じるもの: `DFC-982`（`MSPDI` を取り込むと、MS Project のプロジェクトの要約タスクが最上位のただ 1 つの行になり、ファイルの本当の最上位のタスクがすべてその下に入る）。利用者の裁定 `JDG-580`（逐語は 0.1 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語（2026-09-25）

- 裁定 `JDG-580`: 「1. 「1. プログラム管理」などを最上位に → (b) 推奨」
- 調整役が渡した読み（本書はこれを満たす）: 取り込みで、MS Project のプロジェクトの要約タスク（`UID` 0・`ID` 0・`OutlineLevel` 0）を行にしない。中身はそのまま保ち、`MSPDI` の書き出しで変えずに戻す（`FR-021` の往復を保つ）。ファイルの `OutlineLevel` 1 のタスクが最上位の行になる。プロジェクト名はすでにヘッダに出ている。

⭐ 調べた結果（`DFC-982` の詳細）:

- `src/adapter/document-codec/mspdi-codec.ts:465-472` の `outlineBaseOf` は、`OutlineLevel` 0 のタスクが 1 つでもあれば起点を 0 と判じる。
- 同 `:500-503` の `tasksFromRoot` は、その起点で深さを `level - outlineBase + 1` とするので、要約タスクは深さ 1 の `Task` になり、`OutlineLevel` 1 のタスクはすべてその子になる（`lastIndexShallowerThan`、`:503`）。
- 行は `src/adapter/document-codec/mspdi-imported-rows.ts` の `rowsFromTasks`（`CR-567`）が作る —— 親を持たない `Task` は要約タスクだけなので、最上位の行はどの見本でも 1 つになる。
- 実測（13 節）: `sample-schedule/` の `MSPDI` 7 つのうち MS Project の 6 つは、どれも要約タスクをちょうど 1 つ、`Tasks` の先頭に持つ（`UID` 0・`ID` 0・`OutlineLevel` 0・`OutlineNumber` 0・`Summary` 1）。ProjectLibre の 1 つ（`ProjectLibre.xml`）は持たない。
- ⚠️ 要約タスクの `Name` は、6 つのうち 4 つで `Project/Title`（ヘッダに出る文書名、`FR-035`）と違う（`sample-medium-sfa-webapp` と `sample-small-website-renewal` の ja・en）。本書の後、要約タスクの名前は画面のどこにも出ない —— 裁定の「プロジェクト名はすでにヘッダにある」は `Title` の側で成り立つ。
- `JDG-568`（`CR-567` の副作用 —— 最上位が 1 つだけの文書は全体表示で 1 行になる —— を「プロジェクトの問題」として仕様のままにした）との関係: MS Project のファイルでその「最上位の 1 つ」を作っていたのは、ファイルのタスクではなく要約タスクだった。本書の後、`sample-large-erp-program.ja.xml` の最上位は 12 行になる。`JDG-568` の規則（名前の幅を占有幅に数える）は変えない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-002`（`CH-2`、縮めても全体を 1 枚で俯瞰させる）—— MS Project のファイルを開いたとき、全体表示が要約タスクの 1 行だけになっていた（`DFC-980` の実物確認: 縦 1080px で 1 行）。本書の後は、ファイルの最上位のタスク（ERP の見本で 12）が最上位の行として並ぶ。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.1`（抜けが無い）—— 仕様はプロジェクトの要約タスクを 1 度も名指していない。`FR-021` が「MS Project は `OutlineLevel` 0 の行をちょうど 1 つ書く」と実測を書き、起点の保ち方だけを定めている。何として読むかの規則が無い。E-02 の `MR-4` で埋める。
- `R1.3`（矛盾が無い、唯一の正）—— 読み方の規則は 表 T-265 の `MR-4` の 1 か所に置き、書き戻し方は 表 T-033 の `EX-5`（中身のない行と同じ扱い）に置く。`FR-021`・`FR-058`・`DF-3`・`UF-36`・`AT-139` は、その 2 行を名指して写さない。
- `R1.2`（検証できる）—— `MR-4` の見分け方は `UID` と `OutlineLevel` の 2 つの値だけで決まり、試験の中で作った `MSPDI` で確かめられる。
- `R4.x`（状態機械）—— 升も出来事も変えない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 要約タスクは「`UID` が 0 **かつ** `OutlineLevel` が 0」で見分ける。`ID` は使わない | `ID` は書き出すたびに振り直す値（表 T-059 の `DV-4`）。`UID` 0 だけでは、`OutlineLevel` 1 以上に置かれた `UID` 0 のタスクまで消える。見本 6 つはどれも両方を満たす | `UID` が 0 でない `OutlineLevel` 0 のタスク（交換相手の見本には無い）は、今と同じく `Task` になり、起点 0 の文書になる |
| 決定 2 | 要約タスクは、中身のない行（`IsNull`、`EX-5`）と同じ器 —— `schedule.project.carryElements` の `Task` の行（表 T-053 の `DF-3`）—— に原形のまま置く | 新しい列もエンティティも要らない。書き出しは既にこの器を `ordinal` の位置へ戻す（`mspdi-codec.ts:992` の `splicedCarriedRows`）。`GRS JSON` のスキーマも変わらない | 要約タスクの `Start`・`Finish`・`Duration` などは、人がタスクを動かしても取り込んだときの値のまま書き戻る（裁定の「そのまま」。`EX-2` とも合う）。交換相手が開くときに計算し直すかは確かめていない |
| 決定 3 | `Project.outlineBase`（`AT-139`）は残し、要約タスクを数えない | 起点 0 のファイル（要約タスク以外に `OutlineLevel` 0 のタスクを持つもの）と、本書の前に保存した文書（要約タスクを `Task` として持ち、起点 0）の書き出しが今のまま正しい | 見本 7 つはどれも起点 1 になる。`AT-139` は、MS Project のファイルでは事実上いつも 1 を持つ |
| 決定 4 | すでに `.json` に保存した文書（要約タスクが `Task` と行になっている）は変えない | `CR-567` の 10 節と同じ —— 行は文書に保存され、本書が変えるのは取り込みで作るときだけである。`.xml` を開き直せば新しい形になる | 古い保存の文書では、要約タスクが最上位の行のまま残る |
| 決定 5 | 合流（`FR-056`）で読んだ側の要約タスクは捨て、開いている文書の側の器を保つ | 今の `mergedProject`（`src/use-case/import-document/import-document.ts:908-922`）は `project` を開いている側から始め、表 T-224 の欄だけを合わせる —— `carryElements` は開いている側のまま。仕様の文を変えずに成り立つ。合流の後は無損失を主張しない（`LM-5`） | 読んだ側の要約タスクは合流の後の書き出しに出ない。⭐ かわりに、`UID` 0 どうしの衝突（2 つの MS Project のファイルを合流すると必ず起きていた）が消える |
| 決定 6 | 基準線として読む取り込み（`uf-8-9` の `baseline`）で、要約タスクには基準線の行を作らない | 要約タスクは `Task` ではないので、対応する `Task` が無い | 本書の前に保存した文書（要約タスクが `Task`）に基準線を読むと、その `Task` だけ基準線を持たない |
| 決定 7 | 取り込みで要約タスクを控えたことを告げない | 中身のない行（`EX-5`）も告げていない。どの MS Project のファイルも持つ当たり前の行であり、告げても人が選べることが無い | — |

---

## 1. 範囲 —— 要求ごとの行き先

| 要求 | 仕様で変える所 | 編集 |
|---|---|---|
| R1 要約タスクの見分け方と読み方（`Task` にしない、器、直下は親を持たない） | 表 T-265 に `MR-4` を足す | E-02 |
| R2 書き戻し方（元の位置と形）と、`GRS` が作った文書には足さないこと | 表 T-033 の `EX-5` | E-04 |
| R3 往復の要求が要約タスクを名指し、起点の注の範囲を正す | `FR-021` の STATEMENT | E-01 |
| R4 器の置き場の例に要約タスクを足す | 表 T-053 の `DF-3` | E-03 |
| R5 行の要求が、要約タスクは行にならず直下が最上位になることを名指す | `FR-058` の RATIONALE | E-05 |
| R6 ユニットの責務の文が R1 を名指す | `05-07-design.md` の 表 T-075 の `UF-36` | E-06 |
| R7 起点の列の意味から要約タスクを外す | `_source/erd.json` の `AT-139`（`npm run gen` が `_assets/fig-erd-detail.md` を刷り直す） | E-07 |
| R8 要約タスクを指す割当と依存も原形のまま控える（問い 2 の答え `JDG-582`） | 表 T-265 の `MR-4`（E-02 が足した行） | E-08 |

数: 仕様の文の編集 7（E-01 〜 E-06、E-08）。原稿 JSON の編集 1（E-07）。生成し直すもの 2（`_assets/fig-erd-detail.md` の `AT-139` の行、`_assets/tbl-row-id-prefixes.md` の `MR` の行数 3 → 4）。

---

## 2. 新しい識別子

- 表 T-265 の行 `MR-4`（測った: 木のどこにも現れない。退いた ID の名簿 `retired.py` にも無い）。
- 表・要求・設定値・表示語は 0。
- 台帳の行 `JDG-580`・`DFC-982`（本書と同じコミットで書いた。12 節）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧（`7a106ad1`） | 新 | 理由 |
|---|---|---|
| `FR-021` の「（`UID` 0・`ID` 0・`OutlineNumber` 0、名前はプロジェクト名）」の「名前はプロジェクト名」 | 「プロジェクトの要約タスクである」 | 実測で 6 つのうち 4 つは `Title` と違う（0.1 節）。名前は本書の規則に関わらない |
| `FR-021` の「見本ファイル 4 つを読んだ」 | 「見本ファイル 7 つを読んだ」 | 今の `sample-schedule/` は 7 つ。本書の数（起点 1 の 7 つ）はこの 7 つで測った |
| 表 T-033 の `EX-5` の行全体 | 同じ文に「またはプロジェクトの要約タスク」を足した行（E-04） | 古い文を 1 字も落とさない上位集合 —— `FR-012` が引く「中身のない行」の語はそのまま残る |
| `AT-139` の意味「取り込んだファイルが`OutlineLevel` を数え始める数」 | 「取り込んだファイルのタスクが`OutlineLevel` を数え始める数（…要約タスクは数えない…）」 | 要約タスクを数えると、どの MS Project のファイルも起点 0 になる |
| `tests/unit/fr-021-the-outline-base-of-the-file-comes-back.test.ts:245-247` の場合「remembers 0 for a file that carries an OutlineLevel 0 row」 | 「reads the project summary task (UID 0, OutlineLevel 0) as no Task, keeps it in project.carryElements, and remembers 1」 | 要約タスクを数えないので、その固定具（`BASE_ZERO_ROWS`）の起点は 1 になる。⚠️ 試験は仕様だけを読む試験の体が書き直す（8 節の 2b） |
| 同 `:267-283` の場合「is not a vacuous case: rounding the base to 1 does shift the four columns」 | 空でないことを別の形で示す場合（9 節） | 起点がもともと 1 なので、1 に丸めても何も変わらず、この場合は赤になる（試作で実測） |
| `tests/unit/cr-567-an-imported-leaf-task-sits-on-its-parents-row.test.ts:364-366` の「reads the 257 tasks JDG-560 counted」の文書側の 257 | ファイルの `Task` 257、文書の `Task` 256 | 要約タスクは `Task` にならない |
| 同 `:369-372` の「makes 38 rows …」の 38 | 37 | 同上。行の親は要約タスクではなく「親なし」になる |

⭐ `FR-021` の「起点 0 の文書に人が根をもう 1 本足すと、`OutlineLevel` 0 が 2 つ並ぶ」の注は消さない —— 起点 0 の文書では今も真である。本書は、その範囲が MS Project のファイルには及ばなくなったことを、次の 1 文で足す（E-01）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⚠️ 下の 7 つの旧の塊は、`7a106ad1` の木でどれもちょうど 1 度現れ、写しの木に 7 つとも当たった（13 節）。
⚠️ 文の中に日付・利用者の名・裁定の番号を書かない（検査 `check-spec-holds-no-history.py`）。逐語は `rulings.md` の `JDG-580` だけが持つ。
⚠️ E-05 は段落の末尾に置く —— 検査 42 は、試験が隣り合う文を続けて引いているかを読む。`CR-567` の試験が引く 4 文の間には入れない。
⚠️ E-07 の後に `npm run gen` を走らせる（`_assets/fig-erd-detail.md` と `_assets/tbl-row-id-prefixes.md` を手で直さない。検査 16）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->

旧（FR-021 の STATEMENT、実測の文から起点 0 の注まで）
```text
⭐ 実測（見本ファイル 4 つを読んだ）: MS Project は `OutlineLevel` 0 の行をちょうど 1 つ書き（`UID` 0・`ID` 0・`OutlineNumber` 0、名前はプロジェクト名）、ProjectLibre は 1 つも書かない（`UID` は 1 から）。  
⇒ ⛔ 起点を 1 に丸めると、0 から始まるファイルの木が 1 段つぶれ、`Task/ID`・`Task/OutlineLevel`・`Task/OutlineNumber`・`Task/Summary` の 4 列が全タスクでずれる。  
⭐ 起点は 表 T-058 の `Project.outlineBase` が持ち、既定は 1 とする —— `GRS` が自分で作った文書は 1 から書き、ProjectLibre と同じ形になる。  
⚠️ 起点 0 の文書に人が根をもう 1 本足すと、`OutlineLevel` 0 が 2 つ並ぶ。  
```
新
```text
⭐ 実測（見本ファイル 7 つを読んだ）: MS Project は `OutlineLevel` 0 の行をちょうど 1 つ書き（`UID` 0・`ID` 0・`OutlineNumber` 0 —— プロジェクトの要約タスクである）、ProjectLibre は 1 つも書かない（`UID` は 1 から）。  
⭐ **プロジェクトの要約タスクは `Task` にせず、原形のまま持ち回る** —— 読み方は 表 T-265 の `MR-4`、書き戻し方は 表 T-033 の `EX-5` が持つ。  
⇒ 要約タスクを起点に数えないので、見本の 7 つはどれも起点が 1 になる。  
⇒ ⛔ 起点を 1 に丸めると、0 から始まるファイルの木が 1 段つぶれ、`Task/ID`・`Task/OutlineLevel`・`Task/OutlineNumber`・`Task/Summary` の 4 列が全タスクでずれる。  
⭐ 起点は 表 T-058 の `Project.outlineBase` が持ち、既定は 1 とする —— `GRS` が自分で作った文書は 1 から書き、ProjectLibre と同じ形になる。  
⭐ 要約タスクを数えずに読んだ MS Project のファイルは起点 1 になり、根を足しても `OutlineLevel` 1 に並ぶ —— 次の注が掛かるのは起点 0 の文書だけである。  
⚠️ 起点 0 の文書に人が根をもう 1 本足すと、`OutlineLevel` 0 が 2 つ並ぶ。  
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->

旧（表 T-265 の MR-3 の行（その後ろに MR-4 を足す））
```text
| MR-3 | 値だけを持つ子（葉）が同じ親の下に同じ名前で 2 つ以上あるときは、最初のものを採り、表 T-233 の `RS-60` で告げること（MUST）。<br>⛔ 黙って採ってはならない（MUST NOT）—— 交換相手のスキーマに、同じ名前で繰り返してよい葉は無い |
```
新
```text
| MR-3 | 値だけを持つ子（葉）が同じ親の下に同じ名前で 2 つ以上あるときは、最初のものを採り、表 T-233 の `RS-60` で告げること（MUST）。<br>⛔ 黙って採ってはならない（MUST NOT）—— 交換相手のスキーマに、同じ名前で繰り返してよい葉は無い |
| MR-4 | `UID` が 0 で `OutlineLevel` が 0 の `Task` は、プロジェクトの要約タスクとして読むこと（MUST）—— MS Project がファイルごとに 1 つ書く、文書の全体を束ねる行である。<br>⛔ `Task` にしてはならない（MUST NOT）—— `Task` にすると、ファイルの最上位のタスクがすべてその子になり、最上位の行が 1 つしか立たない（`FR-058`）。<br>⭐ 原形のまま 表 T-053 の `DF-3` の置き場へ置くこと（MUST）—— 書き戻し方は 表 T-033 の `EX-5` が持つ。<br>⭐ その直下のタスクは、親を持たない `Task` として読むこと（MUST）—— 最上位の行になる（`FR-058`）。<br>⚠️ `UID` と `OutlineLevel` の 2 つで見分ける —— `ID` は書き出すたびに振り直す値であり（表 T-059 の `DV-4`）、`UID` 0 だけで見分けると `OutlineLevel` が 1 以上の `UID` 0 のタスクまで `Task` にならなくなる |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->

旧（表 T-053 の DF-3 の規則の欄の一部）
```text
行にならなかったもの（値を持たない空の要素など）は
```
新
```text
行にならなかったもの（値を持たない空の要素や、表 T-265 の `MR-4` が定めるプロジェクトの要約タスクなど）は
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->

旧（表 T-033 の EX-5 の行）
```text
| EX-5 | 取り込んだ文書に**中身のない行**が含まれるとき、タスクとして画面に出さず、書き出しでは**元の位置と形のまま戻すこと** |
```
新
```text
| EX-5 | 取り込んだ文書に**中身のない行**、または**プロジェクトの要約タスク**（表 T-265 の `MR-4`）が含まれるとき、タスクとして画面に出さず、書き出しでは**元の位置と形のまま戻すこと** —— 要約タスクの名前と日付も、取り込んだときの値のまま戻す。<br>⛔ 取り込まずに作った文書に、要約タスクを作って書き足してはならない（MUST NOT）—— 公式スキーマは `Tasks` にも `Task` にも出現を求めず（`mspdi_pj12.xsd:1598`・`:1604`）、ProjectLibre も書かない（`FR-021`）。<br>⚠️ 人がタスクを動かしても要約タスクの日付は書き換えない —— 交換相手が開くときに計算し直すかは確かめていない |
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->

旧（FR-058 の RATIONALE、CR-567 の段落の末尾の文）
```text
⚠️ 1 つの行に載る `Task` が増えるので、名前の幅を占有幅に数える規則（表 T-038 の `OC-1`）により、行の段は日付の重なりだけで数えるより多くなる。
```
新
```text
⚠️ 1 つの行に載る `Task` が増えるので、名前の幅を占有幅に数える規則（表 T-038 の `OC-1`）により、行の段は日付の重なりだけで数えるより多くなる。  
⭐ プロジェクトの要約タスクは `Task` にならないので（表 T-265 の `MR-4`）、行も作らない —— その直下のタスクは親を持たない `Task` になり、自分の行を持って最上位に並ぶ。
```

<!-- EDIT id=E-06 file=docs/spec/05-07-design.md -->

旧（表 T-075 の UF-36 の責務の欄の一部）
```text
読まない子を `carry` に控えて書くとき元の位置へ戻し（`DF-3`・`MR-3`・`RS-60`）、
```
新
```text
読まない子を `carry` に控えて書くとき元の位置へ戻し（`DF-3`・`MR-3`・`RS-60`）、プロジェクトの要約タスクを `Task` にせず原形のまま控え（`MR-4`・`EX-5`）、
```

<!-- EDIT id=E-07 file=docs/spec/_source/erd.json -->

旧（AT-139（Project.outlineBase）の meaning.ja）
```text
"ja": "取り込んだファイルが`OutlineLevel` を数え始める数（`FR-021`）。書き出しはこの数から書く"
```
新
```text
"ja": "取り込んだファイルのタスクが`OutlineLevel` を数え始める数（`FR-021`。プロジェクトの要約タスクは数えない —— 表 T-265 の `MR-4`）。書き出しはこの数から書く"
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->

問い 2 の答え（`JDG-582`、案 ①）で足した。E-02 の後に当てる（旧は E-02 が書いた `MR-4` の行の中の 1 句）。

旧（表 T-265 の MR-4 の行の、⚠️ の文の直前）
```text
—— 最上位の行になる（`FR-058`）。<br>⚠️ `UID` と `OutlineLevel` の 2 つで見分ける
```
新
```text
—— 最上位の行になる（`FR-058`）。<br>⭐ 要約タスクを指す割当（`Assignment/TaskUID` が要約タスクの `UID`）と依存（`PredecessorLink/PredecessorUID` が要約タスクの `UID`）も、割当や依存にせず原形のまま控えること（MUST）—— 割当は `DF-3` の置き場へ、依存はその後続の `Task` の `carryElements` へ置き、書き出しで元の形のまま戻す（`EX-5`）。指す先の `Task` が無い割当や依存を文書に残すと、表 T-220 の `IV-2` に外れる。<br>⚠️ 後続がほかの依存も持つとき、控えた依存は書き出しでそれらより前に並ぶ —— `EX-10` の置き方では、同じ名前の子のうち持ち回るものが先に来る。<br>⚠️ `UID` と `OutlineLevel` の 2 つで見分ける
```

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

| 継ぎ目 | 形 |
|---|---|
| 直す所 | `src/adapter/document-codec/mspdi-codec.ts` の 2 関数だけ —— `outlineBaseOf(collection: XmlElement): number`（`:465-472`）と `tasksFromRoot(root: XmlElement, run: ImportRun): TasksReading`（`:476-511`）。⛔ 署名は変えない。書き出しの側（`writtenTasks`・`splicedCarriedRows`・`outlineNumbers`）と `mspdi-imported-rows.ts` の `rowsFromTasks` は変えない |
| 見分け方 | 新しい非公開の述語 `isProjectSummary(element: XmlElement): boolean` ＝ `integerColumn(element, 'UID') === 0 && integerColumn(element, 'OutlineLevel') === 0`。注は `// see MR-4` |
| 起点 | `outlineBaseOf` は、`IsNull` の行を飛ばす条件に足す —— `if (isTrue(element, 'IsNull') \|\| isProjectSummary(element)) continue` |
| 読み | `tasksFromRoot` の `forEach` の中、`IsNull` の行を控える分岐の条件に足す —— `if (isTrue(element, 'IsNull') \|\| isProjectSummary(element)) { carriedRows.push(carriedElement(element, ordinal)); return }`。`levels` と `uids` に積まない。⇒ `OutlineLevel` 1 のタスクは `lastIndexShallowerThan` が親を見つけず、`wbsParentUid` が `null` になる。⛔ 別の `if` に分けて同じ 2 文を書くと、検査 45 が 83 → 84 で赤になる（試作で実測） |
| 問い 2: 割当（`JDG-582`） | `assignmentsFromRoot` は、`TaskUID` がファイルの要約タスクの `UID` である `Assignment` を、`UID` の無い割当と同じく `carriedRows` へ原形で控える（告げない。決定 7）。要約タスクの有無は `Tasks` を 1 度見て決める（`isProjectSummary` を使う）。署名は変えない |
| 問い 2: 依存（`JDG-582`） | `PredecessorUID` がファイルの要約タスクの `UID` である `PredecessorLink` は、`Dependency` にせず、その `Task` の `carryElements` へ原形で控える（`ordinal` は `Task` の子の位置）。書き出しは `writtenChildren` がそのまま戻す |
| 書き出し（変えない） | `splicedCarriedRows`（`:992`、呼ぶのは `:949`）が `ordinal` 0 の位置へ要約タスクを原形のまま戻す。`ID` は `index + base`（`:1064`）なので、起点 1 で 1 から振られ、元のファイルと同じになる。`OutlineNumber` は起点 1 で道すじをそのまま書く（`:1028` の `outlineNumbers`） |
| 変えない値 | 行の `id`（`AT-51`）、`parentId`、`derivedFromTaskUid`、`order`、通知（告げない。決定 7） |
| 試作の結果（13 節） | 上の 3 か所（8 行を足し 2 行を替えた）を当てた写しの木で: ① 見本 7 つの往復で、ファイルのすべての `Task`（要約タスクを含む）の葉の値が 1 つも変わらない ② ERP の見本は `Task` 256・行 37・最上位の行 12、SFA は 134・16・11、Website は 45・6・6、ProjectLibre は 2・2・2 ③ 全単体試験で赤は 8 件 —— うち本書が原因は 6 件（9 節の 2 ファイル）、残る 2 件は写しの木の環境（`change-request/` の欠け、負荷による時間切れ）で、`7a106ad1` でも同じ環境なら同じく赤 ④ 公式スキーマを root から写すと `uf-36.test.ts` と `cr-429-*.test.ts` の 12 ファイル 337 件がすべて緑 |

---

## 6. グラフ（`7a106ad1` で測った）

- `impact.py FR-021`: 要求 13 件・参照 26 箇所。本書の後に偽になる文を探した —— `FR-004`（`:1715`、WBS の深さをクランプしない）は要約タスクを数えないことと両立する（要約タスクは深さを持つ `Task` ではなくなる）。`FR-012`（`:2953-2955`）は `EX-5` の「中身のない行」を名指し、E-04 はその語を残す。ほかは往復の保証を名指すだけで、要約タスクを写していない。⇒ 偽になる文は 0。
- `impact.py FR-058`: 要求 5 件・参照 11 箇所。`FR-085`（`:1573`）は「最上位の行を許している」側であり、本書で最上位の行が増えるのはその範囲の中である。⇒ 偽になる文は 0。
- `impact.py T-053`（2 次 18 件）・`T-265`（2 次 22 件）・`T-033`（2 次 21 件）: 2 次の要求はどれも、表の名や往復の保証を経て届くだけで、要約タスクも `OutlineLevel` 0 も写していない（`grep -n "OutlineLevel" docs/spec` の結果は `FR-021`・`A-3`・`AT-139`・`DV-5`・`PR-15` の 5 か所で、本書が直す `FR-021` と `AT-139` のほかは深さの導き方を言うだけ）。
- `impact.py DF-3`・`EX-5`・`MR-3`・`AT-139`: 参照はそれぞれ 2・2・2・1 箇所 —— `UF-36`（`05-07-design.md:474`、E-06 で直す）、`FR-012`（上）、`FR-076` の `RS-60`（`MR-3` だけを指す）、`FR-074`（`:5880`、「`outlineBase` は取り込んだファイルの段の起点であり、`FR-021` の往復無損失が持つ」—— 要約タスクを数えないことと両立する）。
- `induced.py`: 13 節の結果を見よ。
- ⚠️ `ST-7`（行に載る `Task` の数、安全弁 `S-89`）: 要約タスクの行は要約タスク 1 つだけを載せていたので、行が 1 つ減っても、ほかの行に載る数は変わらない（試作で 1 行の最大は 19 のまま）。
- ⚠️ `S-125`（深さの上限 5）: MS Project のファイルでは、行の木が 1 段浅くなる（ERP の見本で最も深い段 4 → 3）。上限を超えて最も深い祖先の行へ載せる場面（`FR-058`）は減る。

---

## 7. 数の予測（`7a106ad1` で測った。当てた後に同じ数え方で突き合わせる）

| 数 | 前 | 後 | 内訳 |
|---|--:|--:|---|
| tables | 187 | 187 | — |
| figures | 27 | 27 | — |
| rows | 2361 | 2362 | ＋1（表 T-265 の `MR-4`） |
| uids | 162 | 162 | — |

⚠️ 写しで赤くなる門が 1 つある（試験の側で閉じる。基準値は動かさない）:
- `check-must-clause-coverage.py`（検査 39）—— 試験が逐語で持たない MUST ／ MUST NOT が、E-01 〜 E-07 を当てた写しの木で 1305 → 1310（＋5: `MR-4` の MUST 3 と MUST NOT 1、`EX-5` の MUST NOT 1。13 節）。
  ⛔ **基準値は上げない。** 波 2b の試験の体が、新しい条項を逐語で引く試験を書き、波 1 と**同じコミット**に入れる。
  ⚠️ 同じコミットで閉じられないときは、基準値を上げる前に利用者の許しを取ること。

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | 仕様（前に立つ者） | E-01 〜 E-07、`npm run gen`（`fig-erd-detail.md`・`tbl-row-id-prefixes.md` が刷り直される） |
| 2a | 実装の体 | 5 節の継ぎ目。`mspdi-codec.ts` の 2 関数と述語 1 つ |
| 2b | 試験の体（⛔ 実装を読まない。`docs/spec` だけを読む） | 9 節の 2 ファイルの書き直しと、新しい試験 `tests/unit/cr-569-the-project-summary-task-is-carried-not-a-row.test.ts`: ① `UID` 0・`OutlineLevel` 0 の `Task` は `Task` にも行にもならず、`schedule.project.carryElements` に原形で在る ② その直下のタスクは `wbsParentUid` が `null` で、自分の行を最上位に持つ ③ 取り込んで編集せずに書き出すと、要約タスクが元の位置（先頭）に、元の葉の値のまま戻り、ほかのタスクの `ID`・`OutlineLevel`・`OutlineNumber`・`Summary` も元のまま ④ `UID` 0 でも `OutlineLevel` 1 のタスク、`OutlineLevel` 0 でも `UID` 0 でないタスクは `Task` になる ⑤ 取り込まずに作った文書の書き出しに `UID` 0 の `Task` が無い ⑥ 見本 6 つ（ERP 256 / 37、SFA 134 / 16、Website 45 / 6）。`MR-4` と `EX-5` の新しい条項を逐語で引く |
| 3 | 前に立つ者 | `dist/index.html` を刷り直し、9 節の実物確認。⛔ その後に段 8 の性能の測定 |

⭐ 2a と 2b は触るファイルが重ならない（`src/` と `tests/`）ので並行してよい。破る試験（break test）は合わせた木で走らせる。
⭐ 2b は、`uf-36.test.ts` と `cr-429-*.test.ts` が worktree では公式スキーマを読めずに落ちる（`docs/reference/mspdi/` は gitignore）ことを知っておく —— root の checkout で走らせること。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

- コード: 5 節の継ぎ目。
- 試験（試作の木で 5 節の継ぎ目を当てて、赤になった 6 件。全単体試験を走らせて数えた）:

| ファイル | 場合 | 直し方 |
|---|---|---|
| `tests/unit/fr-021-the-outline-base-of-the-file-comes-back.test.ts` | `:245` 「remembers 0 for a file that carries an OutlineLevel 0 row」 | 起点は 1。あわせて `UID` 0 が `schedule.tasks` に無く、`schedule.project.carryElements` に在ることを確かめる |
| 同 | `:267` 「is not a vacuous case: rounding the base to 1 does shift the four columns」 | 空でないことを別に示す —— 例: 取り込んだ文書の `outlineBase` を 0 に書き換えて書き出すと 4 列がずれる、または要約タスク以外に `OutlineLevel` 0 のタスクを持つ固定具で起点 0 を示す |
| `tests/unit/cr-567-an-imported-leaf-task-sits-on-its-parents-row.test.ts` | `:364` 「reads the 257 tasks JDG-560 counted」 | ファイルの `Task` は 257、文書の `Task` は 256 |
| 同 | `:369` 「makes 38 rows …」 | 37。期待の行を作る補助（`parentsInFile` ・ `expectedRows`）が、要約タスクを除き、その子を親なしとして数えるようにする |
| 同 | 「keeps every WBS parent and every date the file wrote (JDG-561)」 | 要約タスクを飛ばし、`OutlineLevel` 1 のタスクの親を `null` と期待する（同じ補助） |
| 同 | 「changes only the sibling order when a row is moved later (JDG-561)」 | 同じ補助を直せば、そのまま緑になるはず（期待の行の持ち主に要約タスクが入っていたのが赤の原因） |

- ⭐ 変えなくてよいもの（測った）: 「puts more than one Task on a row, up to the 19 CR-567 counted」は緑のまま。`uf-36.test.ts`・`cr-429-*.test.ts`（12 ファイル 337 件）は緑のまま。`tests/**` の固定具で `OutlineLevel` 0 を持つのは `fr-021-…test.ts` の `BASE_ZERO_ROWS` だけ（`grep` で測った）。
- 当てた後に、出荷ビルドで押して確かめる（Playwright、msedge、file://、`IC-1` → `IC-71`）: `sample-large-erp-program.ja.xml` を開き、縦 9000px で行 37・最上位の行 12（先頭は「1. プログラム管理」）、縦 1080px の全体表示で最上位の行が並ぶこと（`DFC-980` の実物確認では 1 行だけだった）。書き出した `.xml` を元と XML 正規化して比べ、要約タスクが先頭に元のまま在ること。
- 台帳: `DFC-982` の状態を `仕様待ち` → 当てたら `実測待ち` → 押して確かめたら `実測済`。`JDG-580` の状態を「指示」→「適用済み」（着地先は `MR-4`・`EX-5`）。

---

## 10. ⛔ この変更でやらないこと

- `GRS` が作った文書（`MSPDI` を取り込まずに作ったもの）に要約タスクを作って書き足さない（11 節の問い 1 の推奨。E-04 の MUST NOT）。
- 要約タスクの日付・名前・`Duration` を、配下のタスクから計算し直さない（裁定の「そのまま」）。
- すでに保存した `.json` の文書を読み替えない（決定 4）。
- `rowsFromTasks`（`FR-058` の行の作り方）、畳み（`HR-1a`）、`S-125`、段割当、占有幅（`JDG-568` の規則）は変えない。
- 取り込みで告げる文（表 T-233）を足さない（決定 7）。
- 合流の規則（`FR-056`・表 T-224）の文は変えない（決定 5）。

---

## 11. 前に立つ者へ返す問い

1. **`GRS` が作った文書を `MSPDI` へ書き出すとき、要約タスクを作って書き足すか。**
   - 案 ① 書き足さない（推奨）—— 公式スキーマ（`docs/reference/mspdi/pj12/mspdi_pj12.xsd:1598`・`:1604`）は `Tasks` にも `Task` にも出現を求めない。`learn-docs` の `tasks-element.md:68` が求めるのは「`Tasks` があればタスクが 1 つ以上」だけで、`UID` 0 は「プロジェクトの要約タスク」と呼ばれるだけである（`elemtype-element.md:94`・`formula-element.md:57`）。ProjectLibre のファイルも持たない。今の書き出しも書かない（振る舞いを変えない）。
   - 案 ② 書き足す —— `UID` 0・`ID` 0・`OutlineLevel` 0・名前は `Project.title`・日付は全タスクの最早と最遅。表 T-059 に行が要り、`FR-021` の「`GRS` が自分で作った文書は 1 から書き、ProjectLibre と同じ形になる」を変える別の変更になる。
   ⚠️ どちらでも、MS Project が開けるかは確かめていない（`FR-021` の「相手が読めるかは確かめていない」と同じ）。
   ⭐ **答え（`JDG-581`、2026-09-25、調整役が利用者に問うた）: 案 ①（書き足さない）。** 逐語は `rulings.md` の `JDG-581` が持つ。E-04 の MUST NOT がこれを書く。コードは変えない（今の書き出しも書かない）。
2. **ファイルが要約タスクを指しているとき（`Assignment/TaskUID` が 0、または `PredecessorLink/PredecessorUID` が 0）をどうするか。** 見本 6 つにはどちらも 0 件。
   - 実測（試作の木で、Website の見本の割当 1 つと依存 1 つを 0 へ書き換えて読んだ）: どちらも受け付けられ（拒まれない）、`Task` の無い `UID` 0 を指す割当・依存が文書に残る。書き出すとそのまま戻るので往復は保たれるが、不変条件 `IV-2`（`src/entity/document-model/schedule/schedule-invariants.ts:326-361`、外部キーの先が在ること）には外れる。
   - 案 ① 要約タスクを指すものも原形のまま持ち回る（推奨）—— 割当は `schedule.project.carryElements` の `Assignment` の行（`UID` の無い割当と同じ器）、依存はその後続の `Task` の `carryElements` へ。`IV-2` も往復も保たれる。`MR-4` に 1 文と、継ぎ目に 2 か所が増える。
   - 案 ② 今の試作のまま（指す先の無い割当・依存を残す）—— 追加の作業は 0。`IV-2` を読む道ができたとき（`DFC-922`）に、その文書が開けなくなるおそれがある。
   - 案 ③ 要約タスクを指すファイルは、要約タスクを `Task` として読む（今の振る舞いに戻す）—— 最上位が 1 行になるファイルが残る。
   ⭐ **答え（`JDG-582`、2026-09-25、調整役が利用者に問うた）: 案 ①（原形のまま持ち回る）。** 逐語は `rulings.md` の `JDG-582` が持つ。`MR-4` に足す文は E-08、継ぎ目は 5 節の「問い 2」の 2 行である。
   ⚠️ 当てる体が見つけた帰結: 表 T-265 の `MR-2` は `PredecessorLink` の並びに意味を認める。控えた依存は、書き出しで同じ後続のほかの依存より前に並ぶ（`EX-10` の置き方では、同じ名前の子のうち持ち回るものが先に来る）—— 後続がほかの依存を持ち、控えた依存がその先頭でなかったときだけ、並びが元と変わる。見本 6 つにはどれも 0 件。E-08 はこれを ⚠️ として書く。

---

## 12. 台帳

| 台帳 | 行 |
|---|---|
| `docs/development-records/defects.md` | `DFC-982`（状態 `仕様待ち`。本書と同じコミットで記入） |
| `docs/development-records/rulings.md` | `JDG-580`（状態「指示 —— 本書が当てる（起草のみ）」。本書と同じコミットで記入）。`JDG-581`（問い 1 の答え）・`JDG-582`（問い 2 の答え）—— 答えが下りたコミットで記入 |

---

## 13. 測り方の再現

```
# the tree
git merge --ff-only 7a106ad1 ; git log -1 --oneline        # -> 7a106ad1

# the six MS Project samples and ProjectLibre.xml (a scratch Python script with xml.etree):
#   for each sample-schedule/*.xml: the Task elements, the one with UID 0, its ID / OutlineLevel /
#   OutlineNumber / Summary, Project/Title against the UID 0 Name, TaskUID / PredecessorUID equal to 0,
#   and the rows CR-567 makes (a Task with children, or with no parent, at depth <= 5) with and without it
#   -> ERP ja/en 257 tasks, rows 38 -> 37, top 12 (all summaries), depth 4 -> 3
#   -> SFA ja/en 135 tasks, rows 17 -> 16, top 11 ; Website ja/en 46 tasks, rows 7 -> 6, top 6
#   -> ProjectLibre.xml 2 tasks, no UID 0, rows 2 -> 2
#   -> Title == UID 0 Name only for the two ERP files ; TaskUID 0 and PredecessorUID 0: none in any file

# totals and gates on the tree as it is
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .
#   -> tables=187  figures=27  rows=2361  uids=162 ; checks 5-10, 15, 48 all 0
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-must-clause-coverage.py
#   -> 2131 clauses, 826 held, 1305 not (the baseline)

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-021 FR-058 DF-3 EX-5 MR-3 AT-139 T-053 T-265 T-033
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-021 FR-058 DF-3 EX-5 MR-4 AT-139 FR-012 FR-004 UF-36
#   (on the edited COPY, after its check.sh) -> 9 of 9 seeds, 20 edges, 1 cycle of size 6:
#   DF-3 EX-5 FR-004 FR-021 FR-058 MR-4 -> wave 1 writes all its members in ONE pass (one commit)

# the prototype (a COPY of the tree in the session scratchpad, never committed)
#   copy src tests docs sample-schedule tools .claude change-request + configs, junction node_modules
#   add the seam of section 5 to src/adapter/document-codec/mspdi-codec.ts (+8 -2 lines)
npx vitest run                          # -> 8 failed: the 6 of section 9, plus h4 (no change-request/ in the
                                        #    first copy) and one cr-430 case timed out under load
#   copy docs/reference/mspdi from the root checkout (gitignored), then
npx vitest run tests/unit/uf-36.test.ts tests/unit/cr-429-*.test.ts tests/unit/cr-432-*.test.ts \
               tests/unit/dfc-685-*.test.ts tests/unit/h4-*.test.ts   # -> 12 files, 337 passed
#   a scratch probe test: documentFromMspdi -> mspdiFromDocument on the 7 samples, then every leaf of every
#   Task (UID 0 included) compared by UID -> differing 0 on all 7
#   a scratch probe test: TaskUID 0 / PredecessorUID 0 written into the Website sample -> ok=true (accepted)

# the edits of section 4 on the same COPY (a scratch script: every old block occurs exactly once)
#   -> E-01 .. E-07: old occurs 1 time(s) ; edits 7 problems 0
npm run gen                              # -> fig-erd-detail.md (AT-139) and tbl-row-id-prefixes.md (MR 3 -> 4)
bash .claude/skills/spec-graph-check/check.sh     # on the edited COPY (with the seam)
#   md-checks -> tables=187 figures=27 rows=2362 uids=162
#   red 39: 1305 -> 1310 (the five new clauses; wave 2b closes them in the same commit)
#   red 46 on the first draft: a sentence end inside the parentheses of E-01 ("`OutlineNumber` 0" then a
#     full stop) -> reworded with an em-dash pair ; check-line-breaks.py -> 2, the baseline
#   red 45 on the first seam (the summary in its own if-branch copied the IsNull branch): 83 -> 84
#     -> folded into the IsNull condition as section 5 says ; check-repeated-expressions.py -> 83
#   red 0, 43, 51, 53, 63: the COPY only (no .git, no previous-project-result/) -- green on the tree
```
