# CR-858 —— ドロップした `GRS JSON` を、`Open Chooser` を出さずに開く

> 起草の状態: 仕様とコードと試験を当てた（2026-10-31、枝 `claude/ecstatic-lederberg-41f060`、develop `d14c315a9` の上）。持ち主の頼みのホットフィックスであり、`CR-850` と一緒に main へ出す（BOSS の GQA の問 4）。
> ID の帯: 調整役から番号 `CR-858`、台帳 `DFC-3619`〜`DFC-3623`、裁定 `JDG-3580`〜`JDG-3589`、保留 `PND-979`〜`PND-980`、見本 `81` を受けた。仕様の新しい行 ID は 表 T-024a の `OP-19` の 1 つ。`d14c315a9` の木で `CR-858` を名乗る変更要求と `OP-19` を名乗る行は 0 件だった（9 節）。
> 当てるもの: `JDG-3580`（`DFC-3619`）。GQA `studies/81-dropped-json-opens-directly/drop-opens-gqa.md` の問 1〜問 4 は推奨案 a で当てた —— 持ち主が別の案を選んだら、その問いの行だけを当て直す（3 節の X-a〜X-d）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`d14c315a9`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| ドロップしたファイルは、形式によらず `Open Chooser` を出す | `file-flow-values.ts` の `onDocumentFileRead` は、経路が `reopen` か `baseline` でなければ `awaitingOpenChoice` へ進み `U-56` を出す。`drop` は `chooser` と同じ枝を通る | X-1 でガードを `isReplaceWithoutChooser` に広げる |
| 状態機械は読んだ形式を知らない | `FileFlowIncomingFile` は名前・バイト数・文書名だけを運ぶ。形式は殻（`document-file-flow.ts`）の `readIn.format` に在り、単一の `.html` は `importedFormatOf` で `grsJson` になる | X-2 で `incomingFile` に `format` を足す |
| 読み直し（`OP-13`）は 3 択を問わずに置き換え、`OP-4` の確認を掛ける | `isReopenRoute` → `discardAskedWhenUnsaved`（`QN-5` は保存していない編集が在るときだけ問う） | ドロップも同じ道に乗せる |

### 0.2 裁定の鎖（`rulings.md` を「ドロップ」「D&D」「置き換え」「Open Chooser」「OP-3」で引いた）

- `JDG-1890`（2026-10-10）は「GRS の JSON や MSPDI の XML を画面に D&D したら開く」を頼み、その席は既に在る `OP-2` の道（3 択の面が出る）を確かめた。本書は 3 択を問うかどうかだけを変え、`JDG-1890` の「落として開く」を保つ。
- `JDG-2838`（2026-10-19）は紹介頁 05 の段 4 の文「AI が作った GRS JSON を、日程表へドラッグ＆ドロップして「置き換える」を選択。」を定めた。本書の後、その文は事実と合わない —— 紹介頁の語は持ち主が行ごとに見るので、GQA の次の問いで問う（`PND-979`）。`docs/about/index.html` の 450 行目（「…ドラッグ＆ドロップして「置き換える」を押すと開く」）も同じ。
- 覆す裁定は無い。`OP-3` の「どちらになるかを `GRS` が勝手に決めてはならない（MUST NOT）」は、`OP-13` と `OP-15` と同じく「人が経路を選んだ時点で扱いが決まる」例外として残す。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-2` —— 新しく開く最も多い場面で、面を 1 つ減らす。ドロップの案内（`OP-17`）が言う「ドロップすれば開く」が、その言葉どおりになる。

### ② レビュー観点のどの条項を当て、何が出たか

- `R2.1`（名は指すものを言う）—— `isReopenRoute` は読み直しだけを指す名なので、ドロップを含めた後の名を `isReplaceWithoutChooser`（3 択を出さずに置き換える）に改めた。
- `R1.3`（同じことを 2 か所で言わない）—— 3 択を問わない経路は `OP-3` の 1 文が 3 行（`OP-13`・`OP-15`・`OP-19`）を名指すだけにし、各行の規則を写さない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 「選ばせずに開く」は「置き換える」と同じ。保存していない編集が在るときだけ `QN-5` を 1 度問う（GQA 問 1 の推奨） | `OP-4`「黙って捨ててはならない（MUST NOT）」と `OP-13` の形 | 編集の途中で落とすと問いが 1 つ出る |
| X-b | MSPDI XML のドロップは今どおり 3 択を出す（GQA 問 2 の推奨） | 持ち主は `GRS JSON` だけを名指した。MSPDI は外部 WBS マスタとの合流（`UC-010`）に使う | MSPDI を新しく開く人は「置き換える」を 1 回押す |
| X-c | 単一の `.html` のドロップは `GRS JSON` と同じ（GQA 問 3 の推奨） | `IO-7` は埋め込まれた `GRS JSON` を読み、読んだ後の扱いは `IO-2` と同じ。コードも同じ形式（`grsJson`）で運ぶ | 無い |
| X-d | 2 つ以上のファイルのドロップは、`OP-11` が受け入れた先頭の 1 つの形式で決める（GQA 問 4 の推奨） | `OP-11` が既に先頭の 1 つを受け入れる | 無い |
| X-e | ドロップで合流させる・重ねる道は `GRS JSON` には無くなり、ファイル選択（`IC-1`）に残る | 持ち主「ファイルを選択した場合はこれまで通り、3択で開く」 | 合流させる人は `IC-1` から開く |

---

## 1. 範囲 —— 行き先

| 場面 | 今 | 本書の後 |
|---|---|---|
| `GRS JSON` ／ 単一の `.html` をドロップ、保存していない編集が無い | `Open Chooser`（3 択） | 置き換えて開く。面も問いも出ない |
| 同、保存していない編集が在る | `Open Chooser` → 「置き換える」→ `QN-5` | `QN-5` を 1 度問う。進めば置き換え、取りやめれば何も変えない |
| MSPDI XML をドロップ | `Open Chooser` | 変わらない |
| ファイル選択（`IC-1`・`Ctrl` ＋ `O`）で開く | `Open Chooser` | 変わらない |
| 読み直し（`Ctrl` ＋ `R`）・重ねの入口（`IC-4`）・`Agent API` が渡す文書 | 3 択を問わない ／ 問わない ／ 3 択 | 変わらない |

---

## 2. 新しい識別子

表 T-024a の `OP-19`。ガードの名 `isReplaceWithoutChooser`（`isReopenRoute` を改めた）。台帳の行 `DFC-3619`（本件）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| 表 T-290 のガード `isReopenRoute`（`openRoute == 'reopen'`） | `isReplaceWithoutChooser`（`openRoute == 'reopen' \|\| openRoute == 'drop' && event.incomingFile.format == 'grsJson'`） |
| `tests/use-case/uc-harness.ts` の `dropFile` が必ず `Open Chooser` を待つこと | `.xml` だけ待つ（`opensWithoutChooser`）。3 択を選ぶ道は `openThroughIc1` |

---

## 4. 書き直す所

### X-1 —— 仕様（`docs/spec/01-04-requirements.md` の 表 T-024a）

- `OP-19` を `OP-15` の後に足す。EARS: 「人が `GRS JSON` か単一の `.html` をウィンドウへドロップしたとき、`GRS` は、`Open Chooser` を出さずに、`OP-3` の 3 択を置き換えに定めて開くこと（MUST）」。`OP-4` の確認（MUST）・形式の判じ方（`OP-12`）・MSPDI とファイル選択は 3 択のまま・2 つ以上は `OP-11`・後の扱いは置き換えと同じ、を同じ行に置く。
- `OP-2` に「ドロップした `GRS JSON` は、選ばせずに置き換えで開く（`OP-19`）」を足す（`OP-17` を名指す文を最後に保つ）。
- `OP-3` に、3 択を問わない 3 つの経路（`OP-13`・`OP-15`・`OP-19`）を名指す 1 文を足す。
- `docs/spec/_source/state-machines.json`: ガードの改名と条件、`documentFileRead` の 4 つの遷移の根拠に `OP-19`、`incomingFile` の運ぶ値に形式。生成物（`tbl-state-machines.md`・2 枚の図）は `npm run machines` が書く。

### X-2 —— コード

- `src/use-case/advance-screen-session/file-flow-values.ts`: `FileFlowIncomingFile` に `format`（`FileFlowIncomingFormat`）。`onDocumentFileRead` は `isReplaceWithoutChooser(values, event)` で `discardAskedWhenUnsaved` へ。ガードの判定は生成器が書く。
- `src/framework/single-html-shell/document-file-flow.ts`: `incomingFileOf` が `readIn.format` を運ぶ。

### X-3 —— 紹介頁（持ち主の行ごとの確認の後）

- `docs/about/index.html` の 450 行目と 793 行目。語は GQA で問う（`PND-979`）。本書では変えない。

---

## 5. 継ぎ目（コード）と試験

- 継ぎ目は `isReplaceWithoutChooser` の 1 つ。殻は `askHowToOpen` の約束を、読み直しと同じ `importIncomingDocument`（置き換え）か `discardIncomingDocument` で受ける —— 殻の流れは変えない。
- 仕様だけを読む試験（副エージェント、`src` を読まない）: `tests/contract/cr-858-op-19-a-dropped-grs-json-opens-without-the-chooser.contract.test.ts` の 7 件 —— 逐語 1、`GRS JSON` のドロップ（編集なし ／ 編集あり・進む ／ 編集あり・取りやめる）、`.html` のドロップ、MSPDI のドロップ、ファイル選択。
- 本物のドロップ（CDP の `Input.dispatchDragEvent`、開発サーバー）: `tests/system/cr-858-a-real-drop-opens-a-grs-json-without-the-chooser.test.ts` の 5 件 —— 逐語 1、編集なし、編集あり・進む、編集あり・取りやめる、MSPDI は 3 択。
- 前提を直した既存の試験: 契約 7 ファイル（ドロップで 3 択を待つ所をファイル選択か MSPDI へ、総当たりに 2 つの形式、生成判定の場面を足した）、単体 1、e2e 7 ファイルと `uc-harness.ts`。
- e2e の残り（`dist` を開くもの）は、調整役が `dist` を組み直した後に GT-2 で回る。本席は一時的に組んだ `dist` で 11 ファイルを回し、`dist` を元へ戻した（7 節）。

---

## 6. グラフ（`impact.py`）

- `impact.py OP-19`: 行は 表 T-024a（塊「開くと合流」）に属し、要求 1 件（`FR-087`）・参照 4 箇所（`OP-2`・`OP-3`、`tbl-state-machines.md` の出来事 `documentFileRead` とガード `isReplaceWithoutChooser`）から指される。
- 塊「開くと合流」に触れる —— `OP-2`・`OP-3` に名指しを足しただけで、`OP-4`〜`OP-18` の規則は変えない。

---

## 7. 数（予測 → 実測）

- 予測: 要求 ±0、表の行 +1（`OP-19`）、`（MUST）` +2（`OP-19` の 2 文）、`（MUST NOT）` ±0。
- 実測（`d14c315a9` → 作業木、`01-04-requirements.md` を数えた）: `（MUST）` +2（1905 → 1907）、`（MUST NOT）` ±0（972）、表 T-024a の行 +1（19 → 20）。予測どおり。
- `check.sh`: 赤は 85 だけ —— `src` が変わったので `grsRelay` の版が動いていない。版は調整役が合流の後に 1 回だけ上げる（本書では上げない）。
- e2e: `dist` を開く 11 ファイル 47 件を一時的に組んだ `dist` で回して緑、`git restore dist` で戻した。MSPDI をドロップする 2 ファイル 9 件はコミット済みの `dist` のままでも緑。

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `defects.md` | `DFC-3619` を起こす |
| `rulings.md` | `JDG-3580`（持ち主の頼み） |
| `changelog.md` | 本書の 1 行 |

---

## 9. 測り方の再現

```
git grep -c "CR-858" d14c315a9 -- change-request docs src tests     # 0 件
git grep -n "OP-19" d14c315a9 -- docs/spec                          # 0 件
npx vitest run tests/contract/cr-858-op-19-a-dropped-grs-json-opens-without-the-chooser.contract.test.ts
npx playwright test tests/system/cr-858-a-real-drop-opens-a-grs-json-without-the-chooser.test.ts
bash .claude/skills/spec-graph-check/check.sh
```

---

## 10. 実物の確かめの手順（調整役が 1 枚にまとめる）

1. 何も編集していない文書に、`GRS JSON` のファイルを日程表へドラッグ＆ドロップする。「ファイルを開く」の面が出ずに、落としたファイルが開くか。
2. タスクの名前を 1 つ変えてから、別の `GRS JSON` を落とす。「いまの文書を閉じますか？…」の問いが 1 度だけ出るか。「キャンセル」で今の文書（変えた名前のまま）が残り、もう一度落として「OK」で落としたファイルが開くか。
3. GRS が書き出した 1 つの `.html` を落とす。面が出ずに、埋め込まれた文書が開くか。
4. MSPDI の `.xml` を落とす。今どおり「ファイルを開く」の面に 3 つの入口（置き換える・合流させる・重ねる）が並ぶか。
5. ヘッダーの「開く」（`Ctrl` ＋ `O`）で `GRS JSON` を選ぶ。今どおり 3 択の面が出るか。
