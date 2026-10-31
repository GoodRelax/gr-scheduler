# CR-858 —— ドロップしたファイルを、`Open Chooser` を出さずに開く

> 起草の状態: 仕様とコードと試験を当てた（2026-10-31、枝 `claude/ecstatic-lederberg-41f060`、develop `d14c315a9` の上）。同じ日に持ち主が GQA の問 1〜問 4 に答え、問 2 と問 4 が推奨案を覆したので、develop `e9cbfcea7` の上で当て直した。持ち主の頼みのホットフィックスであり、`CR-850` と一緒に main へ出す（BOSS の GQA の問 4）。
> ID の帯: 調整役から番号 `CR-858`、台帳 `DFC-3619`〜`DFC-3623`、裁定 `JDG-3580`〜`JDG-3589`、保留 `PND-979`〜`PND-980`、見本 `81` を受けた。仕様の新しい行 ID は 表 T-024a の `OP-19` の 1 つ。`d14c315a9` の木で `CR-858` を名乗る変更要求と `OP-19` を名乗る行は 0 件だった（9 節）。
> 当てるもの: `JDG-3580`〜`JDG-3586`（`DFC-3619`）。GQA `studies/81-dropped-json-opens-directly/drop-opens-gqa.md` は問 1〜問 6 のすべてに答えを得て閉じた。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`d14c315a9`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| ドロップしたファイルは、形式によらず `Open Chooser` を出す | `file-flow-values.ts` の `onDocumentFileRead` は、経路が `reopen` か `baseline` でなければ `awaitingOpenChoice` へ進み `U-56` を出す。`drop` は `chooser` と同じ枝を通る | X-1 でガードを `isReplaceWithoutChooser` に広げる |
| 2 つ以上のファイルのドロップは、先頭の 1 つを開く | 殻（`document-file-flow.ts`）は `ignoredFileCount` が 0 より大きいとき `RS-14`（`NT-5`、`U-62` に並べる）を上げ、先頭を読み続ける | X-2 で、`RS-14` を上げて何も開かずに戻る |
| 読み直し（`OP-13`）は 3 択を問わずに置き換え、`OP-4` の確認を掛ける | `isReopenRoute` → `discardAskedWhenUnsaved`（`QN-5` は保存していない編集が在るときだけ問う） | ドロップも同じ道に乗せる |

### 0.2 裁定の鎖（`rulings.md` を「ドロップ」「D&D」「置き換え」「Open Chooser」「OP-3」で引いた）

- `JDG-1890`（2026-10-10）は「GRS の JSON や MSPDI の XML を画面に D&D したら開く」を頼み、その席は既に在る `OP-2` の道（3 択の面が出る）を確かめた。本書は 3 択を問うかどうかだけを変え、`JDG-1890` の「落として開く」を保つ。
- `JDG-2838`（2026-10-19）は紹介頁 05 の段 4 の文「AI が作った GRS JSON を、日程表へドラッグ＆ドロップして「置き換える」を選択。」を定めた。本書の後、その文は事実と合わない —— 紹介頁の語は持ち主が行ごとに見るので、GQA の問 6 で問い（`PND-979`）、持ち主は a を選んだ（`JDG-3586`。450 行目の注も同じく書き直す）。`JDG-3586` が `JDG-2838` の文を覆す。
- `JDG-3584`（問 4「エラー」）が `OP-11` の「先頭の 1 つだけを受け入れ、残りを無視したことを告げる」を覆す。`OP-3` の「どちらになるかを `GRS` が勝手に決めてはならない（MUST NOT）」は、`OP-13` と `OP-15` と同じく「人が経路を選んだ時点で扱いが決まる」例外として残す。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-2` —— 新しく開く最も多い場面で、面を 1 つ減らす。ドロップの案内（`OP-17`）が言う「ドロップすれば開く」が、その言葉どおりになる。

### ② レビュー観点のどの条項を当て、何が出たか

- 07 の R2 の Naming（名は指すものを言う）—— `isReopenRoute` は読み直しだけを指す名なので、ドロップを含めた後の名を `isReplaceWithoutChooser`（3 択を出さずに置き換える）に改めた。
- 07 の R1 の「仕様の重複・競合の排除」（同じことを 2 か所で言わない）—— 3 択を問わない経路は `OP-3` の 1 文が 3 行（`OP-13`・`OP-15`・`OP-19`）を名指すだけにし、各行の規則を写さない。
- 07 の R2 の YAGNI —— 一度は `incomingFile` に読んだ形式を足したが、問 2 の答え（形式によらない）で読む所が無くなったので取り除いた。

### ③ 持ち主の答えと、問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 「選ばせずに開く」は「置き換える」と同じ。保存していない編集が在るときだけ `QN-5` を 1 度問う（問 1 は a、`JDG-3581`） | `OP-4`「黙って捨ててはならない（MUST NOT）」と `OP-13` の形 | 編集の途中で落とすと問いが 1 つ出る |
| X-b | MSPDI XML のドロップも置き換えで開く（問 2「MSPDIの場合もGRS JSONと同じ動作」、`JDG-3582`） | 持ち主の答え。ドロップは形式によらない | MSPDI を合流させる人は `IC-1` から開く（`UC-010`） |
| X-c | 単一の `.html` のドロップも同じ（問 3「同じ動作」、`JDG-3583`） | `IO-7` は埋め込まれた `GRS JSON` を読み、読んだ後の扱いは `IO-2` と同じ | 無い |
| X-d | 2 つ以上のファイルのドロップは、どれも開かずに断る（問 4「エラー」、`JDG-3584`）。作法は `NT-1`、理由は `RS-14`（表示を「`U-62` に並べる」から「出す」へ）。語は問 5 の答え b（`JDG-3585`） | 持ち主の答え | 2 つを続けて開く人は 1 つずつ落とす |
| X-e | ドロップで合流させる・重ねる道は無くなり、ファイル選択（`IC-1`）に残る | 持ち主「ファイルを選択した場合はこれまで通り、3択で開く」 | 合流させる人は `IC-1` から開く |

---

## 1. 範囲 —— 行き先

| 場面 | 今 | 本書の後 |
|---|---|---|
| ファイルを 1 つドロップ（`GRS JSON` ／ MSPDI XML ／ 単一の `.html`）、保存していない編集が無い | `Open Chooser`（3 択） | 置き換えて開く。面も問いも出ない |
| 同、保存していない編集が在る | `Open Chooser` → 「置き換える」→ `QN-5` | `QN-5` を 1 度問う。進めば置き換え、取りやめれば何も変えない |
| 2 つ以上のファイルを同時にドロップ | 先頭を開き、`RS-14` を `U-62` に並べる | どれも開かず、`RS-14` の通知を出す |
| ファイル選択（`IC-1`・`Ctrl` ＋ `O`）で開く | `Open Chooser` | 変わらない |
| 読み直し（`Ctrl` ＋ `R`）・重ねの入口（`IC-4`）・`Agent API` が渡す文書 | 3 択を問わない ／ 問わない ／ 3 択 | 変わらない |

---

## 2. 新しい識別子

表 T-024a の `OP-19`。ガードの名 `isReplaceWithoutChooser`（`isReopenRoute` を改めた）。台帳の行 `DFC-3619`（本件）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| 表 T-290 のガード `isReopenRoute`（`openRoute == 'reopen'`） | `isReplaceWithoutChooser`（`openRoute == 'reopen' \|\| openRoute == 'drop'`） |
| 表 T-024a の `OP-11`「先頭の 1 つだけを受け入れ、残りを無視したことを告げる（`NT-5`）」 | 「どのファイルも開かずに断る（`NT-1`）」 |
| 表 T-233 の `RS-14`「一度に複数のファイルが渡され、先頭だけを受け付けた」（`NT-5`、`U-62` に並べる）と、その語 | 「2 つ以上のファイルを同時にドロップされ、どれも開かなかった」（`NT-1`、出す）と、問 5 の答え b の語（`JDG-3585`） |
| `tests/use-case/uc-harness.ts` の `dropFile` が `Open Chooser` を待つこと、`openByDrop` の選び方の引数 | 待たない。`openByDrop` は置き換えだけ。3 択を選ぶ道は `openThroughIc1` |

---

## 4. 書き直す所

### X-1 —— 仕様（`docs/spec/01-04-requirements.md` の 表 T-024a）

- `OP-19` を `OP-15` の後に足す。EARS: 「人がファイルを 1 つウィンドウへドロップしたとき、`GRS` は、`Open Chooser` を出さずに、`OP-3` の 3 択を置き換えに定めて開くこと（MUST）」。形式によらないこと・`OP-4` の確認（MUST）・ファイル選択は 3 択のまま・2 つ以上は `OP-11`・後の扱いは置き換えと同じ、を同じ行に置く。
- `OP-11` を書き直す。EARS: 「人が 2 つ以上のファイルを同時にウィンドウへドロップしたとき、`GRS` は、どのファイルも開かずに断り、現在の文書を変えないこと（MUST）」。作法は `NT-1`、理由は `RS-14`。
- `docs/spec/_source/notice-reasons.json` の `RS-14`（場面・`NT-1`・出す）と `docs/spec/_source/display-words.json` の `RS-14` の語（問 5 の答え b、`JDG-3585`）。
- `OP-2` に「ドロップしたファイルは、選ばせずに置き換えで開く（`OP-19`）」を足す（`OP-17` を名指す文を最後に保つ）。
- `OP-3` に、3 択を問わない 3 つの経路（`OP-13`・`OP-15`・`OP-19`）を名指す 1 文を足す。
- `docs/spec/_source/state-machines.json`: ガードの改名と条件、`documentFileRead` の 4 つの遷移の根拠に `OP-19`。生成物（`tbl-state-machines.md`・2 枚の図・`tbl-notice-reasons.md` ほか）は `npm run gen` が書く。

### X-2 —— コード

- `src/use-case/advance-screen-session/file-flow-values.ts`: `onDocumentFileRead` は `isReplaceWithoutChooser(values)` で `discardAskedWhenUnsaved` へ。ガードの判定は生成器が書く。
- `src/framework/single-html-shell/document-file-flow.ts`: `ignoredFileCount` が 0 より大きいとき、`RS-14`（`SEVERAL_FILES_DROPPED_REASON`）を上げて何も開かずに戻る。

### X-3 —— 紹介頁（`JDG-3586`）

- `docs/about/index.html` の 450 行目（サンプルの下の注）を「日程表へドラッグ＆ドロップすると開く。」、793 行目（試す手順の段 4）を「AI が作った GRS JSON を、日程表へドラッグ＆ドロップする。」にする。英語の対訳（`EN_TEXT`）も書き直し、書き換えた台本の CSP の指紋（`script-src` の `sha256-`）を計り直す —— 指紋が合わないと閲覧環境は台本を止め、英語に切り替わらない（`tests/system/dfc-3007-dfc-3008-the-download-and-overview-pages-point-at-each-other.test.ts` の英語の 4 件で確かめた）。

---

## 5. 継ぎ目（コード）と試験

- 継ぎ目は `isReplaceWithoutChooser` の 1 つ。殻は `askHowToOpen` の約束を、読み直しと同じ `importIncomingDocument`（置き換え）か `discardIncomingDocument` で受ける —— 殻の流れは変えない。
- 仕様だけを読む試験（副エージェント、`src` を読まない）: `tests/contract/cr-858-op-19-a-dropped-grs-json-opens-without-the-chooser.contract.test.ts` の 7 件 —— 逐語 1（`OP-19`・`OP-4`・`OP-11`）、`GRS JSON` のドロップ（編集なし ／ 編集あり・進む ／ 編集あり・取りやめる）、`.html` のドロップ、MSPDI のドロップ、ファイル選択は 3 択。契約の舞台は 2 つのファイルを同時に落とせないので、2 つ以上は e2e が押さえる。
- 本物のドロップ（CDP の `Input.dispatchDragEvent`、開発サーバー）: `tests/system/cr-858-a-real-drop-opens-a-grs-json-without-the-chooser.test.ts` の 15 件 —— 逐語 1、`GRS JSON`（編集なし ／ 編集あり・進む ／ 編集あり・取りやめる）、MSPDI（編集なし ／ 編集あり・進む ／ 編集あり・取りやめる）、単一の `.html`（編集なし ／ 編集あり・進む ／ 編集あり・取りやめる）、2 つを同時に落とす（`GRS JSON` が先 ／ MSPDI が先 ／ 編集あり。どれも開かず、問わず、`RS-14` の 2 行を告げる）、ファイル選択は 3 択（`GRS JSON` ／ MSPDI）。
- 前提を直した既存の試験: 契約 9 ファイル（ドロップで 3 択を待つ所をファイル選択へ、生成判定の場面を足した、`RS-14` の表示と語の指紋）、単体 2（`h3`・`uf-47-48` の `RS-14`）、e2e 11 ファイルと `uc-harness.ts`（合流・重ね・`UC-010` の手順はファイル選択へ）。
- e2e の残り（`dist` を開くもの）は、調整役が `dist` を組み直した後に GT-2 で回る。本席は一時的に組んだ `dist` で回し、`dist` を元へ戻した（7 節）。

---

## 6. グラフ（`impact.py`）

- `impact.py OP-19`: 行は 表 T-024a（塊「開くと合流」）に属し、要求 1 件（`FR-087`）・参照 4 箇所（`OP-2`・`OP-3`、`tbl-state-machines.md` の出来事 `documentFileRead` とガード `isReplaceWithoutChooser`）から指される。
- 塊「開くと合流」に触れる —— `OP-2`・`OP-3` に名指しを足し、`OP-11` を書き直した。`OP-4`〜`OP-10a`・`OP-12`〜`OP-18` の規則は変えない。

---

## 7. 数（予測 → 実測）

- 予測: 要求 ±0、表の行 +1（`OP-19`）、`（MUST）` +2（`OP-19` の 2 文。`OP-11` は 1 文が 1 文に替わる）、`（MUST NOT）` −1（`OP-11` の「受け付けなかったことにしてはならない」）。
- 実測（`d14c315a9` → 作業木、`01-04-requirements.md` を数えた）: `（MUST）` +2（1905 → 1907）、`（MUST NOT）` −1（972 → 971）、表 T-024a の行 +1（19 → 20）。予測どおり。
- `check.sh`: 赤は 85 だけ —— `src` が変わったので `grsRelay` の版が動いていない。版は調整役が合流の後に 1 回だけ上げる（本書では上げない）。
- e2e: ROUND2_E2E

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `defects.md` | `DFC-3619` を起こす |
| `rulings.md` | `JDG-3580`（持ち主の頼み）、`JDG-3581`〜`JDG-3586`（GQA の問 1〜問 6） |
| `pending-decisions.md` | `PND-979`（紹介頁の語、裁定済）、`PND-980`（問 1〜問 4、裁定済） |
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
4. MSPDI の `.xml` を落とす。面が出ずに、落としたファイルが開くか。
5. 2 つのファイルを同時に選んで落とす。どちらも開かず、通知の欄に「一度に開けるファイルは 1 つです」が出て、今の文書が残るか。
6. ヘッダーの「開く」（`Ctrl` ＋ `O`）で `GRS JSON` か `.xml` を選ぶ。今どおり 3 択の面が出るか。
