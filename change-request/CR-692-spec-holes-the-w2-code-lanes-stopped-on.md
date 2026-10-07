# CR-692 —— 波 W2 のコードの持ち場が止めた仕様の穴を埋める

> 起草の状態: 当てた（2026-10-07、調整役の統合点 `0ae4e4ce` から早送りした作業木。持ち場 W0b）。起草と当てを同じ作業木で行った。`src/` は生成物だけが動いた（4.1 節）。手で書くコードは後の持ち場へ渡す（5 節）。
> ID の帯: 番号 `CR-692`、裁定の帯 `JDG-1572`〜`JDG-1573`、台帳の帯 `DFC-2186`〜`DFC-2187`、`PND-797` は調整役から受けた（13 節で、木のどこにも無いことを測った）。使ったのは `DFC-2186` の 1 つ（新しい台帳の行）。`JDG-1572`・`JDG-1573`・`DFC-2187`・`PND-797` は使っていない —— 新しい利用者の言葉は無く、問いは 11 節に置いた。
> 仕様の新しい識別子（当てる直前に `0ae4e4ce` で測った）: 表 T-233 の `RS-74`（`RS-73` が最大だった）。表 T-290 の出来事 `documentEditLanded` の運ぶ値 `isBackToSavedDocument`（同じ名のガードは `CR-682` が置いた）。
> 持ち場の行: `DFC-780`・`DFC-690`・`DFC-1067`（`docs/development-records/defects.md` の各行の、2026-10-04 の W2 の持ち場が止めた注）と、古い文 4 つ（`FR-066`・`FR-006`・`S-503`・`PR-15`）。新しい行: `DFC-2186`（英語の項目名の 6 つが列の名のまま）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（全文は `docs/development-records/rulings.md` の該当行）

| 出どころ | 要旨 | 本書での扱い |
|---|---|---|
| `JDG-1482`（2026-10-04、`DFC-780`） | 取り消しで保存した時点の中身へ戻したら、未保存の印を下ろす（警告しない） | 保つ。`CR-682` はガードの名を置いたが、ガードが読む値を出来事が運んでいなかった。本書は値を運ばせるだけ（E-01） |
| `JDG-673`（2026-09-26） | プロパティパネルの項目名は表示言語に従う | 保つ。`PR-15` の英語の項目名を列の名から語にする（E-05）。同じ形の 6 行は `DFC-2186` に起こし、11 節の問い 2 |
| `JDG-1467`（2026-10-04） | `PR-15` の親の名は親へ飛ぶリンク | 保つ。`S-503` の名に `WL-15` を足すだけ（E-05） |

### 0.2 裁定の鎖（rulings.md を同じ語と似た語で引いた）

| 引いた語 | 当たった行 | 本書との関係 |
|---|---|---|
| `DFC-780`・`isBackToSavedDocument` | `JDG-1482` | 上のとおり |
| `DFC-690`・「問いが立っ」・`RS-27` | 0 件 | 問いの間の書き込みは `CR-682` の決定 5（本書の外の CR の決定、利用者の言葉ではない） |
| `WS-2` | `JDG-290`・`JDG-422`・`JDG-710`〜`JDG-717`・`JDG-810` | どれも身振り・行の高さ・単位の話で、時機の旗の数と判じの置き場を決めていない |
| `DFC-1067`・`TRANSPARENT`・「透明の綴り」 | 0 件（`JDG-702` は黒を拒む話で、本書の前半を既に決めた） | —— |
| `FR-066` | `JDG-507`・`JDG-850`・`JDG-896` | 欄の見え方の話。RATIONALE の「実装は後の節目」を保てとは言っていない |
| `PR-15`・`wbsParentUid`・「英語の項目名」 | `JDG-1058`・`JDG-1467`・`JDG-673` ほか `wbsParentUid` の 6 行（親の導き方） | 英語の項目名を列の名にせよとは言っていない |

⭐ 本書が新たに「覆された」と印す行は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` / `GL-006`**（読まずに使える） —— 取り消しで保存した時点へ戻せば離れるときの警告が出ない（`DFC-780`）、確認の問いが出ている間に押した書き込みは黙って消えずに告げられる（`DFC-690`）。
⭐ **`GL-007`**（AI と話しながら作る） —— 問いが立っている間の `Agent API` の書き込みが「身振りの最中」（`RS-7`）ではなく本当の理由（`RS-74`）で拒まれる（`DFC-690`）。
ほかの行（`DFC-1067` と古い文 4 つ）は、同じ綴りを 2 か所に持つ・文が実物と食い違う所の掃除である。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R2.21`（判じは 1 か所）** —— `UN-8` だけから成る書き込みかの判じを `WS-2` の 1 か所に置き、呼び手が前もって止めることを禁じた（E-02）。透明の綴りは `PI-1` の 1 つを、色の欄の記述が運ぶ（E-03）。
- **`R2.22`（写さずに公開する）** —— `DomScreenSurface` から `Schedule` への辺を足さず、既にある辺（`ScreenRenderer` → `DomScreenSurface` の記述）で運ぶ（E-03）。
- **`R1.3`（同じことを 2 か所で言わない）** —— 問いの間の画面の告げ方（`RS-27`）は `NT-7` に残し、`WS-2` と `RS-74` は指すだけにした。
- **`R1.4`（境界）** —— 理由が 2 つ以上当たるときは `WS-2` の順で最初のもの。`isBackToSavedDocument` は書き込み（取り消し・やり直しでない）では偽。
- **`R2.1`（命名）** —— 運ぶ値の名はガードと同じ `isBackToSavedDocument`（`isProceeding` が運ぶ値とガードを同じ名にしている前例に揃えた）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | `documentEditLanded` が真偽 `isBackToSavedDocument` を運び、殻（`SingleHtmlShell`）が判じて詰める（`DFC-780` の推奨） | 機械も根も文書を持たない（表 T-290）。印を下ろした時点の文書を持てるのは差し替えを行う殻だけである。`isProceeding` と同じ形 | 殻が「印を下ろした時点の文書」を 1 つ覚える |
| X-2 | 書ける時機は 4 つの真偽（身振りの最中・編集入力の確定前・確認の問いが立っている・通知の配布中）で見る。問いの旗を 4 つ目として足す（`DFC-690` の推奨） | 呼び手が問いの間だけ別の道で止めると、`UN-8` の例外の判じが `WS-2` と呼び手の 2 か所になる（`R2.21`） | 旗が 1 つ増える |
| X-3 | 問いのために拒んだときの理由に、新しい行 `RS-74` を置く。`Agent API` の拒否の値（`AG-9a`）はこれを運ぶ | いまのコードは問いを「身振りの最中」（`RS-7`）として返し、AI は「ドラッグを終えてから」と読む | 表 T-233 の行が 1 つ増える |
| X-4 | 画面からの書き込みが問いのために拒まれたときは、`NT-7` のとおり `RS-27` で告げる（`RS-74` を画面に出さない） | `CR-682` の決定 2（答えを待つ面が開いている間にほかの入口を押したら `RS-27`）と同じ場面の同じ語に揃う | 画面の通知は理由を名指さない。もう 1 つの道は 11 節の問い 1 |
| X-5 | 透明の名は、`ScreenRenderer` が作る色の欄の記述（`PI-37` の `ScreenView`）が運ぶ（`DFC-1067` の案 ①） | 新しい辺も公開口も要らない。`DomScreenSurface` は記述を読むだけの層である | 無い |
| X-6 | `FR-066` の RATIONALE と `UC-013` の注を、ともに「実装より先に仕様を書いた。欄はいま描かれている」に直す | 2 つは同じ古い主張（実装は後の節目）を持つ。片方だけ直すと食い違う | `UC-013` は持ち場の行に無かったが、同じ文なので直した |
| X-7 | `PR-15` の英語の項目名は `WBS parent`（調整役の推奨） | 日本語の「WBS の親」と同じ語。`FR-135` の辞書の語（`Set a WBS Parent`）とも合う | 同じ形の 6 行は残る（`DFC-2186`） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 | 行 |
|---|---|---|---|
| 保存した時点へ戻ったか | `_source/state-machines.json` の 表 T-290 の出来事 `documentEditLanded` の運ぶ値 | E-01 | `DFC-780` |
| 問いの間の書き込み | `05-07-design.md` の 表 T-067 の `WS-2`、`01-04-requirements.md` の 表 T-233 の `RS-74`、`_source/display-words.json` の 1 項 | E-02 | `DFC-690` |
| 透明の綴り | `_source/published-entries.json` の `PI-1` の `TRANSPARENT`・`PI-37` の `ScreenView` | E-03 | `DFC-1067` |
| 対話欄の古い文 | `01-04-requirements.md` の `FR-066` の RATIONALE・`UC-013` の注 | E-04 | —— |
| 古い数と名 | `01-04-requirements.md` の `FR-006`、`_source/settings.json` の `S-503`、`_source/display-words.json` の `PR-15` | E-05 | —— |
| 台帳・変更履歴 | `defects.md`（4 行）・`changelog.md` 3.92・`perf-pending.md` 112 | E-06 | —— |

**数**: 表の行 +1（`RS-74`）。要求の増減 0。図の辺 0。設定値 0（`S-503` は名だけ）。辞書の項 +1。運ぶ値 +1（表 T-290）。

---

## 2. 新しい識別子

| 識別子 | 何 | 測り方（`0ae4e4ce`） |
|---|---|---|
| `RS-74` | 表 T-233 の行「確認の問いが立っている」 | `grep -rhoE "RS-[0-9]+" docs/spec change-request` の最大が `RS-73` |
| `isBackToSavedDocument`（運ぶ値） | 表 T-290 の出来事 `documentEditLanded` が運ぶ真偽 | ガードとしては `CR-682` が置いた。運ぶ値としては 0 件 |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消すもの | 代わり |
|---|---|---|
| 表 T-290 の `documentEditLanded` | 運ぶ値「無し」（`carries: []`） | `isBackToSavedDocument`（E-01） |
| `FR-066` の RATIONALE | 「⚠️ 本要求の実装は後の節目へ回す」「仕様と設計を先に置くのは … ためである」 | 「仕様と設計を実装より先に置いたのは … ためであった。欄はいま描かれている（`U-44`）」（E-04） |
| `UC-013` の注 | 「本ユースケースは仕様と設計まで書き、実装は後の節目へ回す」 | 「実装より先に仕様と設計を書いた。対話欄（`U-44`）はいま描かれている」（E-04） |
| `FR-006` | 「色である列と複数行である列の 2 つだけ」 | 「… と押してほかの `Task` へ辿るだけの列（入力の型 `リンク`）の 3 つだけ」（E-05） |
| `PR-15` の英語の項目名 | `wbsParentUid` | `WBS parent`（E-05） |

⭐ 消さないもの: `WS-2` の太字の文と `UN-8` の文、問いの文（試験 `cr-593` の 2 本が引く —— 本書は升の末に文を足しただけ）。`NT-7` の本文（`RS-27` で告げる）。`FR-100` の本文（ガードは表 T-290 を指すまま）。

---

## 4. 書き直す所（当てた文）

**E-01** 表 T-290 の出来事 `documentEditLanded` が `isBackToSavedDocument` を運ぶ（根拠 `FR-100`・`RD-1`・`RD-2`）: 差し替えた後の文書が、未保存の印を下ろした時点（保存・置き換え・新しく始める・起動）に持っていた文書そのもの（同じ参照）なら真。中身を比べ直さない。機械も根も文書を持たないので、印を下ろした時点の文書を持つ `SingleHtmlShell` が判じて詰め、ガードはこの値を読むだけである。升（`editsUnsaved` × `documentEditLanded` → `nothingUnsaved` [`isBackToSavedDocument`]）は変えない。

**E-02** 表 T-067 の `WS-2` の升の末に 4 文:

- 時機は、呼び手（`Framework`）が集めて引数で渡す 4 つの真偽 —— 身振りの最中・編集入力の確定前・確認の問いが立っている・通知の配布中 —— で見ること（MUST）。
- 拒否の理由は、この順で最初に当たったものとし、表 T-233 の `RS-7`・`RS-8`・`RS-74`・`RS-9` とする。
- ⛔ 書き込みが `UN-8` だけから成るかの判じは本行だけが持ち、呼び手が前もって判じて書き込みを止めてはならない（MUST NOT）。
- 画面からの書き込み（取り消し・やり直しを含む）が問いのために拒まれたら、呼び手は `NT-7` のとおり `RS-27` で告げる。

表 T-233 に `RS-74`（確認の問いが立っている。拒否の値 `AG-9a` が運ぶ理由。画面は `NT-7` のとおり `RS-27`。作法 `NT-1`、正 `WS-2`）。辞書に 1 項（語と次の一手、日英）。

**E-03** 表 T-064: `PI-37` の `ScreenView` の注に「プロパティパネルの色の欄（`CV-9`）の記述は、透明の名（`PI-1` の `TRANSPARENT`）を運ぶ —— `DomScreenSurface` は透明の入口と透明の側をこの名で見分け、綴りを自分で書かない」。`PI-1` の `TRANSPARENT` の注に「`DomScreenSurface` は `Schedule` への辺を持たないので、色の欄の記述（`PI-37` の `ScreenView`）が運ぶ透明の名を読み、綴りを書かない」。

**E-04** `FR-066` の RATIONALE と `UC-013` の注を 3 節の表のとおり。

**E-05** `FR-006` の「本表が新たに持つのは …」を 3 つに、`S-503` の名の「押すと飛ぶ名前」の並びに `FR-135` の 表 T-351 の `WL-15` を足し、`PR-15` の英語の項目名を `WBS parent` に。

**E-06** 台帳（12 節）、変更履歴 3.92（並行した CR と版が重なれば調整役が振り直す）、`perf-pending.md` の 112（生成した辞書と生成の区画が動いた）。

### 4.1 生成物

`npm run gen` が `_assets/tbl-state-machines.md`・`_assets/tbl-published-entries.md`・`_assets/tbl-settings.md`・`_assets/tbl-row-id-prefixes.md`・`docs/review/public-entry-index.md`・`src/adapter/screen-renderer/display-words.json`・`src/use-case/advance-screen-session/file-flow-values.ts` の生成の区画を作り直した。手では触れていない。図（`components.json`）は変えていないので `build.py` は要らない。

---

## 5. 継ぎ目（コードは本書の外 —— 後の持ち場へ渡す）

| 行 | コード | すること | 条項 |
|---|---|---|---|
| `DFC-780` | `src/use-case/advance-screen-session/file-flow-values.ts`（手書きの `FileFlowValuesEventCarried` とガードの式）・`src/framework/single-html-shell/`（`documentEditLanded` を送る所） | 殻が印を下ろした時点の文書を 1 つ覚え、`documentEditLanded` に同じ参照かを詰める。ガードは値を読む | 表 T-290 |
| `DFC-690` | `src/use-case/apply-document-change/document-change-plan.ts`（`WriteMoment`・`MomentRefusal`・`refusalOfMoment`）・`src/framework/single-html-shell/frame-loop.ts`（`changeDocument` の問いの間の `return`、`isWriteHeldBackIn`、理由から `RS` への表）・`src/adapter/agent-api-endpoint/agent-api-members.ts`（理由の区分） | `WriteMoment` に問いの旗を足し、`refusalOfMoment` が問いの間は `UN-8` だけでない書き込みを拒んで `RS-74` の理由を返す。殻は前もって止めず、拒まれた画面の書き込み（取り消し・やり直しを含む）を `RS-27` で告げる。`isWriteHeldBackIn` から問いを外す | `WS-2`・`RS-74`・`NT-7` |
| `DFC-1067` | `src/adapter/screen-renderer/screen-renderer.ts`（`ColourField`）・`properties-panel.ts`・`src/framework/dom-screen-surface/properties-panel-drawing.ts`（`TRANSPARENT_NAME` と `DEVIATION` 注記 `:345`） | `ColourField` に透明の名を足して `TRANSPARENT` を詰め、描く側は記述から読む | `PI-37`・`PI-1` |

⚠️ 当てた時点で次が赤である（どれもコードを待つ）:

- `tsc`: `file-flow-values.ts` の生成の区画が `FileFlowValuesEventCarried['isBackToSavedDocument']` を読むが、手書きの型に無い。`documentEditLanded` を送る所が値を渡さない。
- 契約試験 `tests/contract/state-machine-unsaved-edits.contract.test.ts`（出来事の形が変わった）。
- 検査 39（新しい MUST 1・MUST NOT 1 を引く試験がまだ無い）。

---

## 6. グラフ（`0ae4e4ce`、`impact.py`）

- `WS-2`: 要求 2 件 / 参照 12 箇所。`NT-7`: 要求 13 件 / 参照 39 箇所。`AG-9`: 要求 3 件 / 参照 17 箇所。`AG-9a`: 要求 4 件 / 参照 11 箇所 —— どれも「問いの間は拒む」の側で読み、旗の数と判じの置き場を名指す所は無い。
- `FR-100`: 要求 12 件 / 参照 19 箇所。表 T-290: 要求 5 件（2 次 31 件）—— 升は変えず、出来事の運ぶ値だけが増える。
- 表 T-233: 要求 28 件（2 次 69 件）—— 行を足すだけ。
- `FR-066`: 要求 4 件 / 参照 25 箇所。`UC-013`: 要求 6 件 / 参照 13 箇所 —— RATIONALE と注だけで、`STATEMENT` は変えない。
- `FR-006`: 要求 7 件 / 参照 33 箇所。表 T-016: 要求 20 件（2 次 69 件）。`S-503`: 要求 4 件 / 参照 4 箇所。`PR-15`: 要求 1 件 / 参照 1 箇所（`FR-135`）。`CV-9`: 要求 4 件 / 参照 17 箇所 —— 色の欄の振る舞いは変えない。

---

## 7. 数（当てた後に測った）

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| 表 T-233 の行 | 68 → 69 | `tbl-row-id-prefixes.md` の `RS` の行 |
| 辞書の理由の項 | 68 → 69 | `display-words.json` の `reasons` の数 |
| 英語の項目名で列の名のまま（`[a-z][A-Z]`） | 7 → 6 | `display-words.json` の `properties` の `en` |

---

## 8. 波

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec` と生成物 | E-01〜E-06、`npm run gen`、`strictdoc export docs/spec` | 本書の体（W0b） |
| 2 | 5 節のコード | 5 節 | 調整役が割り当てる |
| 3 | `tests/` | 9 節 | 仕様だけを読む別の体 |

- ⭐ **毎フレームの経路: いいえ（本書は）。** 生成した辞書と生成の区画が動いたので `perf-pending.md` に 112 を足した。

---

## 9. 仕様の外で直すもの

- コード: 5 節。
- 新しい試験（仕様だけを読む体）: 表 T-290（保存 → 編集 → 取り消しで、`documentEditLanded` が `isBackToSavedDocument` 真を運び印が下りる。編集 → 保存 → 取り消しでは偽で印が立つ）、`WS-2`（問いが立っている間、`setZoom` だけの書き込みは通り、`UN-8` を含まない書き込みは `RS-74` で拒まれる。身振りの最中と問いが重なれば `RS-7`）、`RS-74`（`Agent API` の書き込みの拒否の値の理由が `RS-74`）、`NT-7`（問いの間の `Ctrl`＋`Z` は `RS-27` の通知を出し、文書は変わらない）、`PI-37`（色の欄の記述が透明の名を運ぶ）、`PR-15`（英語の表示で項目名が `WBS parent`）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 英語の項目名の残り 6 行（`DFC-2186`）は直さない —— 利用者の選択が要る（11 節の問い 2）。
- `NT-7` の「`RS-27` で告げる」は変えない（X-4）。`CR-682` の決定 2・決定 5 と同じ。
- `DFC-638`（値の動かない書き込みで印が立つ）は本書の外。`isBackToSavedDocument` はそれと両立する。
- 基準線は書かない。

---

## 11. 利用者に問うこと（調整役が問う。⭐ は推奨で、本書はそれを当てた）

1. **確認の問いが出ている間に、画面で書き込みを押したときの通知の文。** 例: 終了日を土曜へ引いて「非稼働日に置きますか？ Yes / No」が出ている間に、`Ctrl`＋`Z` を押す。⭐ 推奨: いまの「この操作は、いま行えることがありません」（`RS-27`）のまま（当てた）—— 答えを待つ面が開いている間にほかの入口を押したときと同じ文に揃う。もう 1 つの道は、AI に返す理由と同じ「確認の問いが答えを待っている最中なので、この変更は適用できません —— 画面の問いに答えが出てから、もう一度行ってください」（`RS-74`）を画面にも出す（理由を名指すが、ほかの入口を押したときの文と分かれる）。
2. **英語の表示で、プロパティパネルの項目名が `actualStart`・`actualDuration`・`actualFinish`・`resumeValid`・`percentComplete`・`milestoneGlyph` と列の名のまま出る。** 例: 英語に切り替えた閲覧者が実績の欄を見ると「actualStart」と出る（本書で `wbsParentUid` だけは `WBS parent` に直した）。⭐ 推奨: 語にする —— MS Project の英語の画面が出す列の名（`Actual Start`・`Actual Duration`・`Actual Finish`・`% Complete`）に揃え、`resumeValid`・`milestoneGlyph` は `Resume valid`・`Milestone shape` とする（当てていない。`DFC-2186` の裁定待ち）。もう 1 つの道は、MSPDI の列の名を知る人向けにそのまま残す。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `DFC-780` | 保存した時点へ戻ったかの値 | `仕様待ち` → `実装待ち`。決定仕様に 表 T-290 の運ぶ値を書いた |
| `DFC-690` | 問いの間の書き込み | `実装待ち` のまま。決定仕様に `WS-2` の 4 つの旗・`RS-74` を書いた |
| `DFC-1067` | 透明の綴り（最後の 1 か所） | `仕様待ち` → `実装待ち`。決定仕様に `PI-37`・`PI-1` の注を書いた |
| `DFC-2186`（新） | 英語の項目名の 6 つが列の名のまま | `裁定待ち`（11 節の問い 2） |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 0ae4e4ce

# the numbers are unused
git grep -n "CR-692"                                    # nothing before this CR
grep -rhoE "RS-[0-9]+" docs/spec change-request | sort -t- -k2 -n -u | tail -1    # RS-73
git grep -n -e JDG-1572 -e JDG-1573 -e DFC-2186 -e DFC-2187 -e PND-797           # nothing

# the rulings chain (section 0.2): grep rulings.md rows for each subject word

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py WS-2 NT-7 AG-9 AG-9a FR-100 T-290 T-233 FR-066 UC-013 FR-006 T-016 S-503 PR-15 CV-9

# labels still spelled as column names (section 7)
python -c "import json,re; d=json.load(open('docs/spec/_source/display-words.json',encoding='utf-8')); print([r['rowId'] for r in d['properties'] if re.search(r'[a-z][A-Z]', r['label']['en'])])"

# generated
npm run gen
strictdoc export docs/spec && rm -rf output
```
