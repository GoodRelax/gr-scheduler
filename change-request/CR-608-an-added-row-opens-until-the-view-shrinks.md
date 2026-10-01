# CR-608 — 足した行は暫定で開き、縦を縮めるまで倍率によらず見える

> 起草の状態: 当てた —— 8 節の**波 1 の仕様と生成だけ**（2026-10-01、枝 `spec-pass-1001`、仕様の通し。`628bdbf6` の上）。E-01 〜 E-10 を当て、`npm run gen` を打った（`task-group-folding.ts` の `TreeStateEvent` と `TREE_STATE_TRANSITIONS` が刷られた）。新しい名は出来事 `rowTree/everyRowDeletePressed` だけ（`628bdbf6` で本書の外 0 件）。旧 10 件は `CR-606`・`CR-607`・`CR-609` の後の木でもどれも 1 回で、載せ直しは無い。⚠️ 本書の中の食い違いを直した: 5 節の継ぎ目の「`CM-26` を通らない行」の列挙と 8 節の波 2 の試験 7 が、表 T-050 が作る 1 行を `auto` と書き残していた —— 裁定 1（`JDG-969`）・E-08・継ぎ目の最後の項のとおり `temporarilyExpanded` に揃えた。検査のために新の文を 3 か所直した（意図は同じ）: E-04 の太字の閉じを句点の前へ（検査 49、`<br>**その` が刷り物に `**` を残す）、E-07 の括弧の中の「。」を「——」に（検査 46）、E-08 を「その行の `treeState` も `temporarilyExpanded` とすること（MUST） —— `CM-26` で作る行と同じ値であり（`AT-153`）…」に（検査 46 と検査 11 の新しい重なり）。⛔ 波 1 の手書きのコード（9 節: `task-group-naming.ts` の `createTaskGroup`、`document-change-plan.ts` の `documentHoldingOneRow`、`row-tree-entrances.ts` の `rowStoodUp` と `everyRowDeleted`）と波 2 は当てていない —— 生成の升はもう「押した親は `temporarilyExpanded`」だが、作る行は `auto` のまま・倍率も書くので、コードの巡が閉じるまで食い違う。
> 起草の状態（元）: 起草のみ（2026-10-01、枝 `b2-panel-crs`）。`JDG-967` の「CR-608 はその形で書き直せ」で書き直した（前の版の、行の集合が変わるたびに全体表示を解き直す一般則と、全体表示で解き直しを再び有効にする問いは捨てた）。`JDG-969` で全消しの段 0 と、表 T-050 が作る 1 行を足した（E-07〜E-10）。
> 読んだ木: `b2-panel-crs` の `bf7e96dc`（`refactor`。`docs/spec` と `src` は `0590ad03` と同じ —— `git diff --stat 0590ad03 bf7e96dc -- docs/spec src` が空）。`docs/development-records/rulings.md` の `JDG-967`・`JDG-969` は調整役の未コミットの行を読んだ。行番号と数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から受けた（B2: CR-606..609）。本書は `CR-608` を使う。行 ID は取らない。状態機械の出来事の名を 1 つ足す（2 節）。
> 当てる順: `CR-606` → `CR-607` → `CR-609` → **本書**（最後）。
> 閉じるもの: `DFC-1323`（12 節）。`DFC-1322`（新しく始める）と組むが、あちらは閉じない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定の逐語（`docs/development-records/rulings.md` から写した）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-853` | 「これらのロジックは新規作成専用のロジックにするな。通常動作でもこのようにうまく動くよう工夫しろ」 | 行を作る命令（`CM-26`）の 1 か所で、どの書き手が足しても同じ値で立てる（決定 1）。全消し・新規のための倍率と表示位置の規則は足さない（0.2）。全消しの後の 1 行も同じ値で立てる（裁定 1） |
| `JDG-922` | 「他は、全部推奨どおり」（#4: 全消しと新規は `fitPressed` と同じ動き。一般則として、人がズームかスクロールするまで行の集合が変わるたびに合わせ直す） | ⚠️ `JDG-967` が #4 の形を置き換えた —— 一般則は作らない |
| `JDG-967` | 「これって、面倒な特別な仕様になってないか？ 新規に足した行は暫定でOpenに(正式名称忘れた)にするだけでは？  一度落ち着いて整理しろ。」／「CR-608 はその形で書き直せ」 | 本書の骨格。「暫定で Open」は `temporarilyExpanded`（表 T-328。縦を縮める最初の入力で `auto` へ戻る） |
| `JDG-969` | 「段 0 を開き、その行も暫定で開く (Recommended)」（問い「全消し（行見出しの頭の [x]）のあと、段 0 が畳まれていると自動で作られた 1 行が見えません。どうしますか？」への答え） | 裁定 1（③）。E-07〜E-10 |

### 0.2 全消しと新規は、もう全体表示の一番上に着く（表示の規則を足さない）

- **全消し**（`HF-20`、`IC-106`）: 表 T-050 の `CD-6`（`docs/spec/01-04-requirements.md:2434`）は深さ `L1` のすべての行に `CD-2` を当てる。`CD-2`（`:2433`）は「その行を指す表示位置（同 `S-78`）は消さず `null` へ戻す」。⇒ 表 T-024a の `OP-10`（`:6444`）の「表示位置が `null`、または指す行が存在しないとき … `FR-055` の全体表示が選ぶ倍率と表示位置にすること（MUST）」に当たる。コードも同じ: `src/framework/single-html-shell/view-place.ts:28` の `storedNamesAPlace` が偽になり、`viewSettings`（`:48`）が `fitZoom` を解き、上端を行の木の先頭（`firstRow`）に置く。
- **新しく始める**（`FR-095`、`:6831`「表 T-034 の `BT-4` と同じ状態に戻す」）: `OP-10` の文が「同梱のテンプレートは … 必ず表示位置を持たず」と書き、`src/framework/single-html-shell/startup-template.json` も `scrollGroupId: null`・`scrollDate: null` である。`DFC-1322`（`JDG-852`）の後は `Task` が 0 件になり、`OP-10` の「`Task` を 1 件も持たない文書には … `BT-4` の除外を働かせないこと（MUST）」により全体表示に着く。
- ⚠️ 表示の外に 1 つ残っていた: 段 0 を畳んでいた（`S-418` が `'collapsed'`）文書で全消しすると、表 T-050 が作る 1 行は 表 T-329 の `TD-1` で描かれない（`HF-12`（`:1741`）が頭に畳み込んだ行数を示すだけ）。⇒ `JDG-969` で裁かれた（③ の裁定 1）。倍率と表示位置の規則は足さない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（すぐわか —— 説明を読まずに操作できる） —— いまは [+] で足した行が、いまの縦の倍率の詳しさの段（表 T-005a の `L-3`）で落ちると見えず、名づけのパネルだけが開く（`DFC-1323`）。本書の後は、足した行は押した瞬間に倍率を変えずに見え、縦を縮めればいつもの絵へ戻る。
間接に **`CH-2` ／ `GL-002`**（ペライチ）: 行を 1 つ足すたびに倍率が跳ぶと、全体を 1 枚で見ていた絵が崩れる —— 本書は倍率を書かない。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（唯一の正・矛盾）** —— 「足した行は見える」の正は今 2 つの仕組みに割れている: 表 T-051 の `HF-14`（`01-04-requirements.md:1739`）の「詳しさの段を開くこと（MUST）」はコードでは縦の倍率を書く（`src/adapter/input-command-translator/row-tree-entrances.ts:218` の `rowStoodUp` の `setZoom`）、一方 `AT-153`（`_assets/fig-erd-detail.md:369`、原稿 `docs/spec/_source/erd.json:1477`）は「新しく作る行は `auto`」。⇒ 見せるのを木の状態の 1 つ（`temporarilyExpanded`）に寄せ、倍率の書き込みを消す（E-01〜E-04）。
- **`R1.3`（壊れた判じ）** —— `rowStoodUp` は保存された `zoomY` で段を判じる（`:224` の `drawnSettingsOf(settings)`）。`OP-10` の全体表示の絵は保存された倍率を使わないので、全消しの直後など、`OP-10` の絵のあいだは判じが絵と食い違う。倍率を書かない形にすれば、判じそのものが要らなくなる。
- **`R1.4`（書き手と境界）** —— `Agent API` の `createTaskGroup`、貼り付け・複製（表 T-223 の `DU-2`）、MSPDI の取り込み、`createTask` が行とともに作る行、表 T-050 が全消しの後に作る行、`FR-085` の深さの上限 —— どれが新しい値で立つかを 0 節 ③ で決め、`AT-153` に書く（E-01）。
- **`R4.3`・`R4.4`（状態遷移）** —— 状態機械 `treeStateMachine` の初期の状態を `auto` から `temporarilyExpanded` へ移し（E-02）、`childRowAddPressed` の升を `auto`・`collapsed` → `temporarilyExpanded` にする（E-03）。押した親の書き込みと `CM-26` は同じ束・同じ取り消しの段である（表 T-027 の `UN-14`、`CR-570`・`JDG-595` の保存して取り消せる木の状態）。初期の状態は各状態機械にちょうど 1 つ（`docs/spec/_source/state_machines_json_to_md.py` の `check_initials`）—— 移すので 1 つのまま。
- **`R2.14`（POLA）** —— 行を 1 つ足しただけで縦の倍率が変わるのは、名前から予想できない副作用である（E-04 の ⛔）。
- **`R2.9`（YAGNI）** —— 前の版の一般則（行の集合を鍵にした全体表示の持ち越し、毎フレームの比べ）は、`JDG-967` の形で要らなくなった。全消しと新規は 0.2 のとおり既存の規則で着く。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **新しい値で立つのは `createTaskGroup`（`CM-26`）で作る行だけ** —— 行見出しパネルの [+]（`IC-91`・`IC-93`）、`Agent API`、ほかに `CM-26` を出す入口のどれでも同じ | `JDG-967` の「行を足すどの道でも同じ値で立てる」と `JDG-853`。値を命令の側に置けば、入口ごとの規則が要らない | 行の木の頭から足した深さ 1 の行（`IC-93`）は、値によらず描かれる（`FR-055` の下限）ので、値は見た目を変えない —— それでも同じ値にし、分けない |
| 決定 2 | **取り込み・写し・付随の行は `auto` のまま** —— MSPDI の取り込み（`src/adapter/document-codec/mspdi-imported-rows.ts:38`）、貼り付けと複製（`DU-2` は `expanded`・`temporarilyExpanded` を `auto` にする。今のまま）、`createTask`（`CM-6`）が行とともに作る行（`src/use-case/edit-document/task-create.ts:81`）。⚠️ 表 T-050 が作る 1 行は裁定 1 で `temporarilyExpanded` | どれも人が「行を足した」のではない。取り込みを開くと、取り込んだ全行が倍率によらず描かれ、全体表示の段（`FR-055`）が意味を失う。`DU-2` の理由（「開いた印は人がその場所で決めたこと」）は写しにもそのまま当たる。`createTask` の行は深さ 1 で、値によらず描かれる | 列の既定（`erd.json` の `"default": "auto"`）と状態機械の初期（`temporarilyExpanded`）が別の値になる —— `AT-153` の文がその分け方を言う（E-01） |
| 決定 3 | **押した親は、`auto` か `collapsed` なら `temporarilyExpanded` になる。`expanded`・`temporarilyExpanded` は変えない** | 今の升は `collapsed` → `auto`（`docs/spec/_source/state-machines.json:7180`）。`auto` へ開くだけでは、親の子の段が倍率で落ちるとき、足した行だけが兄弟のいない子として描かれる（`TD-7` が足した行と祖先だけを描く）—— どこに足したかが読めない。`temporarilyExpanded` なら兄弟も描かれる（`TD-6` の注「その行と、その祖先のすべてと、その直下の子」） | 押した親の兄弟の行（倍率で落ちていた行）も縮めるまで描かれ、行見出しパネルが長くなる |
| 決定 4 | **先祖は書き換えない** | 押した親が描かれていたので、先祖はどれも `collapsed` でも `hidden` でもない（`TD-3` —— 描かれている行の先祖は必ずそうである）。先祖を描き続けるのは `TD-7`（子孫が `temporarilyExpanded` を持つ）。`HF-14` の「先祖まで開いてはならない（MUST NOT）」はそのまま真 | ― |
| 決定 5 | **暫定の終わり方は `temporarilyExpanded` のものをそのまま使う** —— 縦を縮める最初の入力（表 T-328 の `rowZoomShrinkPressed`）、全体表示（`fitPressed`）、1 階層開く（→ `expanded`）、畳む・隠す | `JDG-967` の「暫定で」。新しい終わり方を作らない | ― |
| 裁定 1（`JDG-969`） | **全消しは段 0 を開き、表 T-050 が作る 1 行も `temporarilyExpanded` で立てる。取り消しは全消しと合わせて 1 段** —— 段 0 は新しい出来事 `rowTree/everyRowDeletePressed`（入口 `IC-106`・`HF-20`）の根の升 `writeLevelZeroAuto` が開く（E-07・E-09・E-10）。表 T-050 の 1 行は、行を 0 にしたのがどの操作でも同じ値で立てる（E-08。取り込み・置き換え・やり直しも同じ） | 利用者の答え。表 T-050 の行を操作ごとに分けないのは `JDG-853`（専用のロジックにしない）。出来事を新しくするのは、`FR-018` の「同表に無い操作で値を書き換えてはならない（MUST NOT）」（`01-04-requirements.md:5242`）が段 0 の書き込みを 表 T-328 に置かせるからであり、既存の出来事（`fitPressed` は行を `auto` へ戻す、`topLevelOpenPressed` は `hidden` の最上位を動かす）では升が合わない | 表 T-328 の出来事が 11 から 12 になる。深さ 1 の 1 行は値によらず描かれるので、その行の値は見た目を変えない（配下が無い）—— 値を揃えるための書き込みである |
| 決定 6 | **`HF-14` の「詳しさの段を開く」は、縦の倍率を書かない形に置き換える** —— 見せるのは木の状態だけ。画面の外なら `HF-17` のとおり送る | 裁定の形（「`HF-14` の倍率の書き込みをそれに置き換え」）。倍率は人が選んだ見る量 | 深い行を続けて足すと、行見出しパネルが縮めるまで伸び続ける |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 作る行の値 | `AT-153` の意味（原稿 `docs/spec/_source/erd.json`） | E-01 | その 2 文 |
| 状態機械の初期 | 表 T-328 の `treeStateMachine` の状態（原稿 `docs/spec/_source/state-machines.json`） | E-02 | `initial` の 2 か所と根拠 |
| 押した親の升 | 表 T-328 の `childRowAddPressed`（同原稿） | E-03 | 升 2 つ |
| 足した行が見える約束 | 表 T-051 の `HF-14` | E-04 | 置き換えた段 |
| 倍率より優先する行 | 表 T-051 の `HF-7` | E-05 | 1 句 |
| 暫定の値の説明 | `FR-018` の本文（表 T-329 の前） | E-06 | 足した 1 行 |
| 全消しは段 0 を開く | 表 T-051 の `HF-20` | E-07 | 足した 1 文 |
| 表 T-050 が作る 1 行の値 | `FR-032` の本文（表 T-050 の後の段） | E-08 | 足した 1 行 |
| 全消しの出来事 | 表 T-328 の出来事の定義（原稿） | E-09 | 足した 1 項 |
| 全消しの段 0 の升 | 表 T-328 の根 `rowTree` の升（原稿） | E-10 | 足した 1 項 |

## 2. 新しい識別子

行・表・要求・接頭辞・設定値の行・状態は 1 つも足さない。

⭐ 足すのは状態機械の出来事の名 1 つ: `rowTree/everyRowDeletePressed`（E-09・E-10）。出来事の名は行 ID の登録簿に載らないが、`docs/development-rules/02-changing-the-spec.md` の 2.5 節に従い、当てる時に `git grep -n everyRowDeletePressed` で他の変更要求・原稿・`src` と重ならないことを測り直す（2026-10-01、`bf7e96dc` での測りは 13 節）。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所 | 置き換わる先 | 編集 |
|---|---|---|---|
| `AT-153` の「新しく作る行は `auto`」 | `docs/spec/_source/erd.json:1477`（刊行物 `_assets/fig-erd-detail.md:369`） | `CM-26` で作る行は `temporarilyExpanded`、既定の `auto` を取る行の列挙 | E-01 |
| `treeStateMachine` の初期 `auto` | `docs/spec/_source/state-machines.json:6664` 〜 | 初期は `temporarilyExpanded` | E-02 |
| `childRowAddPressed` の `collapsed` → `auto` | `docs/spec/_source/state-machines.json:7180` | `auto`・`collapsed` → `temporarilyExpanded` | E-03 |
| `HF-14` の「その行が描かれるまで詳しさの段を開くこと（MUST）」 | `docs/spec/01-04-requirements.md:1739` | 木の状態で見せ、倍率を書かない（MUST NOT） | E-04 |
| コードの「足した行が落ちる深さなら縦の倍率を書く」 | `src/adapter/input-command-translator/row-tree-entrances.ts:218` の `rowStoodUp`（`opensTier` と `setZoom` の束） | 消す | 実装する者（9 節） |
| コードの「作る行は列の既定」 | `src/use-case/edit-document/task-group-naming.ts:65`（`createTaskGroup`） | `temporarilyExpanded` | 実装する者（9 節） |
| コードの「表 T-050 の 1 行は列の既定」 | `src/use-case/apply-document-change/document-change-plan.ts:165` の `documentHoldingOneRow`（`:177`） | `temporarilyExpanded` | 実装する者（9 節） |
| コードの「全消しは行だけを消す」 | `src/adapter/input-command-translator/row-tree-entrances.ts:132` の `everyRowDeleted` | 同じ束に段 0 の書き込み（`levelZeroWritesFor(…, { type: 'everyRowDeletePressed' })`） | 実装する者（9 節） |
| 前の版の本書の編集 11 件（`FR-055` の解き直しの段、`OP-10`・`HF-8`・`HF-20`・`CA-1`・`UF-161`・`CM-71`・`FR-051`、`fitPressed` の出どころ） | 前の版の本書 | 無い（`JDG-967`） | ― |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（`bf7e96dc` で 10 件とも 1 回。13 節）。ファイルの改行は 3 つとも LF（CRLF 0）。どの塊も、行の末の改行を旧にも新にも含めない。
⭐ 当てた後に打つもの: `npm run gen`（`_assets/fig-erd-detail.md` の `AT-153`、`_assets/tbl-state-machines.md` の 表 T-328 の升・図 F-043・状態の一覧、`src/use-case/edit-document/task-group-folding.ts` の生成の区画 `TREE_STATE_TRANSITIONS` が変わる）→ `npm run gen:check` → `rm -rf output && npm run check` → `npm run guard:spec`。
⛔ 刊行物（`_assets/fig-erd-detail.md`・`_assets/tbl-state-machines.md`）と生成の区画を手で直さない。

<!-- EDIT id=E-01 file=docs/spec/_source/erd.json -->
旧
```text
      "ja": "行の木の状態。`auto` ／ `collapsed` ／ `expanded` ／ `temporarilyExpanded` ／ `hidden`。値が描かせる行は `FR-018` の 表 T-329、値を書き換える入口と先の値は `_assets/tbl-state-machines.md` の 表 T-328 が持つ。新しく作る行は `auto`。貼り付けた写しは `01-04-requirements.md` の 表 T-223 の `DU-2` に従う"
```
新
```text
      "ja": "行の木の状態。`auto` ／ `collapsed` ／ `expanded` ／ `temporarilyExpanded` ／ `hidden`。値が描かせる行は `FR-018` の 表 T-329、値を書き換える入口と先の値は `_assets/tbl-state-machines.md` の 表 T-328 が持つ。`createTaskGroup`（`_assets/tbl-glossary.md` の 表 T-108 の `CM-26`）で作る行と、行が 0 になったときに `01-04-requirements.md` の 表 T-050 の後の段が作る行は `temporarilyExpanded`（同書の 表 T-051 の `HF-14` —— 足した行を倍率によらず見せ、縦を縮めたら `auto` へ戻す）。既定の `auto` は、この値を持たずに読んだ行と、`CM-26` を通らずにできる行（MSPDI から取り込んだ行、`createTask` が行とともに作る行）が取る。貼り付けた写しは `01-04-requirements.md` の 表 T-223 の `DU-2` に従う"
```

⚠️ 同じ列の `"default": "auto"` は変えない —— 値を持たずに読んだ行の既定であり、`src` の `COLUMN_DEFAULTS.TaskGroup.treeState` もそこから生成される（決定 2）。

<!-- EDIT id=E-02 file=docs/spec/_source/state-machines.json -->
旧
```text
     "name": "treeStateMachine",
     "states": [
      {
       "key": "auto",
       "parent": null,
       "initial": true,
       "carries": [],
       "evidence": [
        "AT-153",
        "FR-018"
       ]
      },
      {
       "key": "collapsed",
       "parent": null,
       "initial": false,
       "carries": [],
       "evidence": [
        "HR-4",
        "HR-1a"
       ]
      },
      {
       "key": "expanded",
       "parent": null,
       "initial": false,
       "carries": [],
       "evidence": [
        "HR-7",
        "FR-018"
       ]
      },
      {
       "key": "temporarilyExpanded",
       "parent": null,
       "initial": false,
       "carries": [],
       "evidence": [
        "HR-3",
        "HR-1",
        "FR-018"
       ]
```
新
```text
     "name": "treeStateMachine",
     "states": [
      {
       "key": "auto",
       "parent": null,
       "initial": false,
       "carries": [],
       "evidence": [
        "AT-153",
        "FR-018"
       ]
      },
      {
       "key": "collapsed",
       "parent": null,
       "initial": false,
       "carries": [],
       "evidence": [
        "HR-4",
        "HR-1a"
       ]
      },
      {
       "key": "expanded",
       "parent": null,
       "initial": false,
       "carries": [],
       "evidence": [
        "HR-7",
        "FR-018"
       ]
      },
      {
       "key": "temporarilyExpanded",
       "parent": null,
       "initial": true,
       "carries": [],
       "evidence": [
        "HR-3",
        "HR-1",
        "FR-018",
        "AT-153",
        "HF-14"
       ]
```

<!-- EDIT id=E-03 file=docs/spec/_source/state-machines.json -->
旧
```text
      "childRowAddPressed": {
       "collapsed": {
        "to": "auto",
        "guard": [
         {
          "name": "isPressedRow"
         }
        ],
        "evidence": [
         "HF-14",
         "HR-8"
        ]
       }
      },
```
新
```text
      "childRowAddPressed": {
       "auto": {
        "to": "temporarilyExpanded",
        "guard": [
         {
          "name": "isPressedRow"
         }
        ],
        "evidence": [
         "HF-14",
         "HR-8"
        ]
       },
       "collapsed": {
        "to": "temporarilyExpanded",
        "guard": [
         {
          "name": "isPressedRow"
         }
        ],
        "evidence": [
         "HF-14",
         "HR-8"
        ]
       }
      },
```

⚠️ 根の升の `childRowAddPressed`（`:6401`、段 0 を 1 階層だけ開く `writeLevelZeroAuto`）は変えない。E-03 の旧は 6 字下げの `"childRowAddPressed": {` で始まる 1 か所だけである。

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧
```text
| HF-14 | **配下に行を足す操作子を、行ごとに 1 つ置くこと（MUST）** —— 表 T-015 の `HR-8` である。<br>⭐ **足した行は末子とすること（MUST）** —— ⛔ **長子にすると既存の並びが押し下がる。<br>**⚠️ **位置は足したあとに動かせる**（`HF-15`）ので、**並びを毎回ずらす害のほうが大きい。<br>**⭐ 押された瞬間に、既定の名前で行を立てること（MUST）。<br>その行のプロパティパネルを出し、名前の欄で名づけさせること（MUST） —— ⛔ 改名と別の道を作ってはならない（MUST NOT）。<br>道は `FR-085` が改名について定めるものと同じものとすること（MUST）。<br>⛔ **その作法をここに書き写してはならない（MUST NOT）** —— **同じ MUST が 2 か所に載ると必ず離れていく。<br>**⭐ 既定の名前は表示語として持つこと（MUST）。<br>仕様書が規則として綴りを刷ってはならない（MUST NOT） —— 置き場は `FR-038` の辞書である。<br>⛔ 綴りを規則として書くこと、すなわち「既定の名前は 〜 とする」の形で書くことを禁じる。<br>⭐ 行を空の名前で立てず、既定の名前で立てる理由は `FR-004` の RATIONALE が持つ。<br>⛔ 立てた行が、現に描かれている詳しさの段（`FR-018`）で落ちる深さになるときは、その行が描かれるまで詳しさの段を開くこと（MUST） —— ⛔ **表示位置を送るだけで済ませてはならない（MUST NOT）。<br>**⭐ これは `HF-17` の「行が見える位置まで送ること（MUST）」と同じ 1 つの約束である —— **送っても、詳しさが落とした行は現れない。<br>**⛔ **立てた行が、人が畳んだ親の下に入るときは、その親を開くこと（MUST）** —— ⛔ 開いてよいのは押した親 1 つだけである。<br>その先祖まで開いてはならない（MUST NOT）。<br>⭐ **上の詳しさの段と合わせて、約束は 1 つである** —— **立てた行は見える。<br>**⚠️ `HF-7` の畳みは人が自分でしたことなので、製品が動かすのはこの 1 つの場合に限る。<br>⛔ その行の深さが `FR-085` の上限に達しているときは、`FR-029` に従って薄く描くこと（MUST） —— ⭐ `HF-13` が「開ける直下の子が 1 つも無いとき」に採るのと同じ形である。<br>⛔ 薄いまま押されたときは、行を立てずに理由を告げること（MUST）。<br>理由は 表 T-233 の `RS-46` とすること（MUST） —— ⛔ **行を立ててからパネルを開き、そこで拒んではならない（MUST NOT）** —— **押した人には、名づけを求められたうえで捨てられたようにしか見えない。<br>**⭐ **入口は 表 T-109 の `IC-91` である** —— **図形は枠つきの `＋` とした**（表 T-026 の `RC-13`）。<br>⛔ **素の `＋` にしない** —— **`IC-74` がその図形である。<br>**⭐ **枠の有無で分ける先例は `IC-52` と `IC-82` が既に持っている**|
```
新
```text
| HF-14 | **配下に行を足す操作子を、行ごとに 1 つ置くこと（MUST）** —— 表 T-015 の `HR-8` である。<br>⭐ **足した行は末子とすること（MUST）** —— ⛔ **長子にすると既存の並びが押し下がる。<br>**⚠️ **位置は足したあとに動かせる**（`HF-15`）ので、**並びを毎回ずらす害のほうが大きい。<br>**⭐ 押された瞬間に、既定の名前で行を立てること（MUST）。<br>その行のプロパティパネルを出し、名前の欄で名づけさせること（MUST） —— ⛔ 改名と別の道を作ってはならない（MUST NOT）。<br>道は `FR-085` が改名について定めるものと同じものとすること（MUST）。<br>⛔ **その作法をここに書き写してはならない（MUST NOT）** —— **同じ MUST が 2 か所に載ると必ず離れていく。<br>**⭐ 既定の名前は表示語として持つこと（MUST）。<br>仕様書が規則として綴りを刷ってはならない（MUST NOT） —— 置き場は `FR-038` の辞書である。<br>⛔ 綴りを規則として書くこと、すなわち「既定の名前は 〜 とする」の形で書くことを禁じる。<br>⭐ 行を空の名前で立てず、既定の名前で立てる理由は `FR-004` の RATIONALE が持つ。<br>⭐ **立てた行は見える（MUST）** —— 立てた行は `_assets/fig-erd-detail.md` の `AT-153` のとおり `temporarilyExpanded` で立ち、押した親は `_assets/tbl-state-machines.md` の 表 T-328 の `childRowAddPressed` の行のとおり、`auto` か `collapsed` なら `temporarilyExpanded` になる。<br>⇒ `FR-018` の 表 T-329 の `TD-6`・`TD-7` が、いまの倍率のまま、立てた行とその兄弟とその祖先を描く。<br>⛔ **そのために縦の倍率を書き換えてはならない（MUST NOT）** —— 倍率は人が選んだ見る量であり、行を 1 つ足しただけで絵の詳しさが変わると、足す前に見ていたものが読めなくなる。<br>⚠️ **開くのは暫定である** —— 縦を縮める最初の入力で、立てた行も押した親も `auto` へ戻る（同表の `rowZoomShrinkPressed`）。<br>⛔ **表示位置を送るだけで済ませてはならない（MUST NOT）** —— **送っても、詳しさが落とした行は現れない。<br>**⭐ これは `HF-17` の「行が見える位置まで送ること（MUST）」と同じ 1 つの約束である —— 木の状態で描かせ、描いた行が画面の外なら送る。<br>⛔ **開いてよいのは押した親 1 つだけである**。<br>その先祖を書き換えてはならない（MUST NOT） —— 押した親が描かれていたので、先祖はどれも `collapsed` でも `hidden` でもない（表 T-329 の `TD-3`）。<br>先祖を描き続けるのは `TD-7` である。<br>⚠️ `HF-7` の畳みは人が自分でしたことなので、製品が動かすのは押した親の畳みを開くこの 1 つの場合に限る。<br>⛔ その行の深さが `FR-085` の上限に達しているときは、`FR-029` に従って薄く描くこと（MUST） —— ⭐ `HF-13` が「開ける直下の子が 1 つも無いとき」に採るのと同じ形である。<br>⛔ 薄いまま押されたときは、行を立てずに理由を告げること（MUST）。<br>理由は 表 T-233 の `RS-46` とすること（MUST） —— ⛔ **行を立ててからパネルを開き、そこで拒んではならない（MUST NOT）** —— **押した人には、名づけを求められたうえで捨てられたようにしか見えない。<br>**⭐ **入口は 表 T-109 の `IC-91` である** —— **図形は枠つきの `＋` とした**（表 T-026 の `RC-13`）。<br>⛔ **素の `＋` にしない** —— **`IC-74` がその図形である。<br>**⭐ **枠の有無で分ける先例は `IC-52` と `IC-82` が既に持っている**|
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
旧
```text
| HF-7 | **人が畳んだ状態は、表示量の増減（`FR-018`）より優先する。<br>** 人の指定を倍率が上書きしてはならない（MUST NOT）。<br>⭐ 人が開いた行も表示量の増減より優先する（`FR-018` の 表 T-329 の `TD-6`・`TD-7` に従う）。 |
```
新
```text
| HF-7 | **人が畳んだ状態は、表示量の増減（`FR-018`）より優先する。<br>** 人の指定を倍率が上書きしてはならない（MUST NOT）。<br>⭐ 人が開いた行と、人が足した行（`HF-14`）も、表示量の増減より優先する（`FR-018` の 表 T-329 の `TD-6`・`TD-7` に従う）。 |
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
旧
```text
⚠️ 配下をすべて開いた行は、縦を縮める最初の入力で `auto` へ戻る（同表） —— すべて開くのはいまの倍率で中を見るためであり、縮めたら倍率の絵へ戻す。  
```
新
```text
⚠️ 配下をすべて開いた行は、縦を縮める最初の入力で `auto` へ戻る（同表） —— すべて開くのはいまの倍率で中を見るためであり、縮めたら倍率の絵へ戻す。  
⚠️ 足した行と、足した先の親も同じ値で立つ（`AT-153`、同表の `childRowAddPressed`、表 T-051 の `HF-14`） —— 足した場所をいまの倍率で見せるためであり、縮めたら倍率の絵へ戻す。  
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
旧
```text
| HF-20 | `HF-10` の操作子の並びに、すべての行を消す操作子を 1 つ置くこと（MUST） —— 行ごとの削除（表 T-109 の `IC-82`）を段 0 で押すものであり、入口は同表の `IC-106` である。<br>⭐ 置き場の規則は `HF-10` の並びが持つ —— 並びの最後、`HF-17`（最も浅い段へ足す）の右隣である。<br>足すと消すを隣り合わせ、あいだにほかの操作子を挟まないのは、`HF-4` が行について定める対と同じ読み方である（枠つきの `＋` と `×` は対として読ませる、表 T-026 の `RC-13`）。<br>⚠️ 行と違い、頭では消すが並びのいちばん外に立つ —— 段 0 は留められないので（`FR-098`）、行が消すの外に置くピン止めの操作子（`HF-4`）を頭は持たない。<br>右から流し込んだポインタが最初に触るのは消すになるが、押しても消す前に問う（次の文の `NT-7`）。<br>⭐ 消える範囲は 表 T-050 の `CD-6`、問い方は 表 T-037 の `NT-7` と `FR-032` に従うこと（MUST）（示す文は 表 T-234 の `QN-10`） |
```
新
```text
| HF-20 | `HF-10` の操作子の並びに、すべての行を消す操作子を 1 つ置くこと（MUST） —— 行ごとの削除（表 T-109 の `IC-82`）を段 0 で押すものであり、入口は同表の `IC-106` である。<br>⭐ 置き場の規則は `HF-10` の並びが持つ —— 並びの最後、`HF-17`（最も浅い段へ足す）の右隣である。<br>足すと消すを隣り合わせ、あいだにほかの操作子を挟まないのは、`HF-4` が行について定める対と同じ読み方である（枠つきの `＋` と `×` は対として読ませる、表 T-026 の `RC-13`）。<br>⚠️ 行と違い、頭では消すが並びのいちばん外に立つ —— 段 0 は留められないので（`FR-098`）、行が消すの外に置くピン止めの操作子（`HF-4`）を頭は持たない。<br>右から流し込んだポインタが最初に触るのは消すになるが、押しても消す前に問う（次の文の `NT-7`）。<br>⭐ 消える範囲は 表 T-050 の `CD-6`、問い方は 表 T-037 の `NT-7` と `FR-032` に従うこと（MUST）（示す文は 表 T-234 の `QN-10`）<br>⭐ 消すときは、段 0 の畳み（`_assets/tbl-settings.md` の `S-418`）を開くこと（MUST） —— `_assets/tbl-state-machines.md` の 表 T-328 の `everyRowDeletePressed` の根の升に従い、消す書き込みと同じ段に入れる（取り消し 1 回で、消す前の行と畳みへ戻る —— 表 T-027 の `UN-14`）。<br>⛔ 開かないと、表 T-050 の後の段が作る 1 行が `FR-018` の 表 T-329 の `TD-1` で描かれず、何が残ったか読めない。<br>⚠️ 倍率と表示位置は書かない —— 表示位置の指す行が消える（表 T-050 の `CD-2`）ので、表 T-024a の `OP-10` が全体表示の絵にする |
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
旧
```text
⭐ その行の id は、表 T-108 の `CM-26` が行を作るときと同じく、新しく採ること（MUST）。  
```
新
```text
⭐ その行の id は、表 T-108 の `CM-26` が行を作るときと同じく、新しく採ること（MUST）。  
⭐ その行の `treeState` も `temporarilyExpanded` とすること（MUST） —— `CM-26` で作る行と同じ値であり（`AT-153`）、行を 0 にしたのがどの操作でも同じ値で立てる。  
```

<!-- EDIT id=E-09 file=docs/spec/_source/state-machines.json -->
旧
```text
     "key": "fitPressed",
     "source": {
      "kind": "input",
      "rows": [
       "IC-10",
       "SK-18",
       "FR-055",
       "HF-8"
      ],
      "note": {
       "ja": "全体表示を求めた"
      }
     },
     "carries": []
    },
```
新
```text
     "key": "fitPressed",
     "source": {
      "kind": "input",
      "rows": [
       "IC-10",
       "SK-18",
       "FR-055",
       "HF-8"
      ],
      "note": {
       "ja": "全体表示を求めた"
      }
     },
     "carries": []
    },
    {
     "key": "everyRowDeletePressed",
     "source": {
      "kind": "input",
      "rows": [
       "IC-106",
       "HF-20"
      ],
      "note": {
       "ja": "頭のすべての行を消す操作子を押し、問い（`QN-10`）に消すと答えた"
      }
     },
     "carries": []
    },
```

<!-- EDIT id=E-10 file=docs/spec/_source/state-machines.json -->
旧
```text
     "fitPressed": {
      "guard": [
       {
        "name": "isLevelZeroCollapsed"
       }
      ],
      "effect": "writeLevelZeroAuto",
      "evidence": [
       "FR-055",
       "HF-8",
       "S-418"
      ],
      "note": {
       "ja": "同上"
      }
     },
```
新
```text
     "fitPressed": {
      "guard": [
       {
        "name": "isLevelZeroCollapsed"
       }
      ],
      "effect": "writeLevelZeroAuto",
      "evidence": [
       "FR-055",
       "HF-8",
       "S-418"
      ],
      "note": {
       "ja": "同上"
      }
     },
     "everyRowDeletePressed": {
      "guard": [
       {
        "name": "isLevelZeroCollapsed"
       }
      ],
      "effect": "writeLevelZeroAuto",
      "evidence": [
       "HF-20",
       "S-418"
      ],
      "note": {
       "ja": "同上。消す書き込みと同じ束に入れる（`HF-20`）"
      }
     },
```

⚠️ E-09・E-10 は、根の升（5 字下げの `"fitPressed": {`）と出来事の定義（`"key": "fitPressed",`）の直後に 1 項ずつ足す。E-03 の `treeStateMachine` の升（6 字下げ）には足さない —— 全消しの後に残るのは表 T-050 の 1 行だけで、その値は E-08 が決める（表に無い出来事は `treeStateMachine` を変えない）。

## 5. 継ぎ目 —— 依頼文にこのまま写すこと

```
SEAM (verbatim in the implementers' and the tester's briefs)
- A row made by createTaskGroup (CM-26) -- from any writer: the row title
  panel's add entrances (IC-91, IC-93), the Agent API -- is created with
  treeState 'temporarilyExpanded' (AT-153 as CR-608 E-01 leaves it).
  Rows NOT made by CM-26 keep the column default 'auto': MSPDI import,
  paste / duplicate (DU-2, unchanged), and the row createTask (CM-6) makes
  with a task. (The row table T-050 makes when rows reach 0 is NOT one of
  them: it is 'temporarilyExpanded', see the last item.)
- The pressed parent: T-328 childRowAddPressed now sends auto -> temporarilyExpanded
  and collapsed -> temporarilyExpanded (isPressedRow). expanded and
  temporarilyExpanded are unchanged. Ancestors are never written.
  The root cell (level zero, writeLevelZeroAuto) is unchanged.
  This arrives by npm run gen in task-group-folding.ts TREE_STATE_TRANSITIONS.
- One bundle, one undo step: the parent's setTaskGroupTreeState (CM-85) and
  createTaskGroup stay in the row's bundle, as rowStoodUp already does.
- No zoom write when a row is added: rowStoodUp drops the opensTier branch
  (setZoom with groupDepthThresholdOf). The zoom does not change.
- Temporary: the first row-axis shrink (rowZoomShrinkPressed) returns every
  temporarilyExpanded row, the new row and its parent included, to 'auto'.
- If the new row is drawn but off screen, HF-17's scroll still applies.
- Delete-all (IC-106, HF-20, row-tree-entrances.ts everyRowDeleted): the one
  bundle = the deleteTaskGroup writes, then
  levelZeroWritesFor(levelZeroTreeState, { type: 'everyRowDeletePressed' })
  (root cell: collapsed -> writeLevelZeroAuto). One undo step (UN-14).
  The new event arrives by npm run gen in the generated TreeStateEvent union.
- The row table T-050 makes when rows reach 0 (document-change-plan.ts
  documentHoldingOneRow) is created 'temporarilyExpanded', whatever operation
  emptied the rows. No zoom or place write: CD-2 already nulls S-78 (OP-10).
```

## 6. グラフ（`bf7e96dc`）

- `impact.py AT-153 HF-14 HF-7 CM-26 TD-6`:
  - `AT-153`（表 T-058）要求 3 件・参照 7 か所（`FR-004:1755` の `hidden`・`collapsed`、`FR-111:1843` の受け付ける列、`FR-018:5241`）—— どれも値の意味を言うだけで、作る行の値を引かない。偽にならない。
  - `HF-14`（表 T-051）要求 4 件・参照 13 か所（`FR-083:1232`・`FR-004:1703`・`:1743`（`HF-17`）・`:1767`・`FR-008:2218`・`FR-040:7789`）—— 引くのは名づけの道・パネル・焦点・深さの上限であり、本書が変える段（詳しさの段）を引く所は無い。`HF-17` の「`HF-14`（配下に足す）も同じとすること（MUST）」は「見える位置まで送る」のことで、E-04 の後も真。
  - `HF-7` 要求 2 件・参照 9 か所（`FR-004`・`FR-018:5228`・`:5239`・`:5262`）—— 「人が畳んだ行は優先」の側を引く。E-05 は開く側に 1 句足すだけ。
  - `CM-26` 要求 1 件（`FR-032:2449` —— 表 T-050 の行の id を `CM-26` と同じく新しく採る。id だけの話で、その行は `CM-26` を通らない ⇒ 決定 2 と両立）。
  - `TD-6` 要求 5 件・参照 10 か所（`FR-004:1733`・`:1773`、`FR-009:2834`、`FR-016:3798`、`FR-018`、`FR-055:5410`・`:5431`）—— `FR-055` は全体表示が `expanded`・`temporarilyExpanded` を `auto` へ戻す理由と下限の免除を言う。本書の後も真（決定 5）。
- `induced.py AT-153 HF-14 HF-7 FR-018 T-328 CM-26 TD-6 TD-7 DU-2 CD-2 OP-10`: 種 11 のうち 11 が解け、辺 17、閉路 1 —— {`AT-153` `DU-2` `FR-018` `HF-7`}。本書は `AT-153`・`FR-018`・`HF-7` の 3 つを書く ⇒ 1 つの波・1 度に当てる（`DU-2` は書かない）。
- `rulings.md` を `AT-153`・`DU-2`・`HF-14`・`HF-7`・`childRowAddPressed`・`temporarilyExpanded`・「一時開放」で引いた: 当たりは `JDG-145`（[v] で開いた行は縮めても開いたまま —— 変えない）、`JDG-521`（写しは未着手 —— 行の値には触れない）、`JDG-590`〜`JDG-601`（`CR-570`。すべて開く・一時開放・`temporarilyExpanded` は縮めたら戻る・保存して取り消せる —— 本書はこの値の終わり方をそのまま使う。`JDG-590` の「文書に保存せず」は `CR-570` の `JDG-595`〜`JDG-599` で保存する値に変わった後の形に従う）、`JDG-967`。食い違う行は無い。

## 7. 数の予測

tables 0 / figures 0 / rows 0 / uids 0 の差（行・列・表を足さない）。
刊行物: `_assets/fig-erd-detail.md` の `AT-153` の 1 行、`_assets/tbl-state-machines.md` の 表 T-328 の `childRowAddPressed` の升の行・図 F-043 の辺と `[*]`・状態の一覧の 2 行が変わる。状態 5 は変わらない。出来事は 11 → 12（`rowTree/everyRowDeletePressed`。出来事の表に 1 行、根の升の表に 1 行）。

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 毎フレーム | 体 |
|---|---|---|---|---|
| 0 | ― | 旧 10 件をもう 1 度数え、`everyRowDeletePressed` の名を測り直す（`CR-606`・`CR-607`・`CR-609` の後の木で。`CR-609` も `state-machines.json` を書く） | ― | 当てる体 |
| 1 | `docs/spec/_source/erd.json`（`AT-153`）・`docs/spec/_source/state-machines.json`（`treeStateMachine`）・`docs/spec/01-04-requirements.md`（`HF-14`・`HF-7`・`HF-20`・`FR-018` の 1 行・`FR-032` の 1 行）＋ `npm run gen` ＋ `src/use-case/edit-document/task-group-naming.ts` ＋ `src/use-case/apply-document-change/document-change-plan.ts` ＋ `src/adapter/input-command-translator/row-tree-entrances.ts` | E-01〜E-10 と 9 節の 4 か所。⛔ 1 つの波にする —— `npm run gen` が `task-group-folding.ts` の升を書き換えるので、原稿だけを先に着地させると親は開くのに行は `auto` で立ち、倍率も書く（`docs/development-rules/02-changing-the-spec.md` の 3.5 節）。変更履歴の行は調整役が足す | いいえ（行を足す入力のときだけ。描き手・レイアウト・`frame-loop.ts` に触れない） | 当てる体 ＋ 実装の体 |
| 2 | `tests/contract/cr-608-*.test.ts`（新しいファイルだけ）と、下の赤くなる試験の直し | 仕様だけの試験（下の 9 つ） | ― | 仕様だけの試験の体 |

⭐ 毎フレームの経路（`docs/development-rules/04-verification.md` の 5 節の表）のファイルに触れない ⇒ `docs/development-records/perf-pending.md` の行は要らない。L4 の持ち場（`frame-loop.ts`・`input-command-translator.ts`・`screen-values.ts` ほか）にも触れない ⇒ L4 の合流を待たない。
⚠️ 赤くなると見込む試験（波 2 の体が仕様から直す）: `tests/contract/tree-state-machine.contract.test.ts:182`（初期の状態を `['auto']` と読む）と `:183` 〜（出来事の名の並びを 11 と読む）、`childRowAddPressed` と `HF-14` を読む `tests/unit/t-051-hf-14-a-raised-row-is-visible.test.ts`・`tests/unit/t-015-t-051-the-four-folding-controls.test.ts`・`tests/unit/t-051-hf-17-unfolds-segment-zero-by-one-level.test.ts` ほか（13 節の `git grep` で 15 ファイル）。

波 2 の試験（仕様だけを読む体が書く。`DFC-1323` の再現が先）:
1. 子の段が倍率で落ちる行で [+]（`IC-91`）→ 足した行とその兄弟が描かれ、縦の倍率は変わらない。足した行と押した親は `temporarilyExpanded`。
2. 押した親が `collapsed` → `temporarilyExpanded`。先祖の `treeState` は 1 つも変わらない。
3. 押した親が `expanded` → `expanded` のまま。
4. 縦を 1 段縮める → 足した行も押した親も `auto` へ戻り、倍率の絵へ戻る。
5. 取り消し 1 回 → 足した行が消え、押した親の値が押す前へ戻る（段は 1 つ）。
6. `Agent API` の `createTaskGroup` で深い行を作る → `temporarilyExpanded` で立ち、先祖に `collapsed` が無ければ倍率によらず描かれる。
7. `temporarilyExpanded` の行を複製・貼り付け → 写しは `auto`（`DU-2`）。MSPDI の取り込みの行と `createTask` が作る行は `auto`（全消しの後の行は `temporarilyExpanded` —— 試験 10・11）。
8. 行を足して保存し、開き直す → `temporarilyExpanded` のまま（保存する値。`CR-570`）。
9. 全消しの後と、新しく始めた後 → 表示は全体表示の絵で、上端は行の木の先頭（0.2。回帰の試験）。
10. 段 0 を畳んだ文書で全消し → 段 0 は開き（`S-418` が `'auto'`）、表 T-050 の 1 行が `temporarilyExpanded` で描かれる。取り消し 1 回で、消す前の行と段 0 の畳みへ戻る（段は 1 つ）。
11. 行を 0 にする取り込み・置き換え・やり直しの後の 1 行も `temporarilyExpanded`（`FR-032` の後の段）。

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 関数 | 何を | 毎フレーム |
|---|---|---|---|
| `src/use-case/edit-document/task-group-naming.ts` | `createTaskGroup`（`:65` の `treeState: COLUMN_DEFAULTS.TaskGroup.treeState`） | `'temporarilyExpanded'` で作る。値の名は `erd.json` の列挙の 1 つであり、新しい定数を足さない | いいえ |
| `src/adapter/input-command-translator/row-tree-entrances.ts` | `rowStoodUp`（`:218`。`:224` の `drawn`、`:225` の `opensTier`、`:230` からの `setZoom` の束） | 倍率の束を消す。`treeWritesOf(context, { type: 'childRowAddPressed', … })` と `createTaskGroup` は同じ束のまま。`groupDepthThresholdOf`・`drawnSettingsOf` の import が要らなくなれば外す | いいえ |
| `src/use-case/edit-document/task-group-folding.ts` | 生成の区画 `TREE_STATE_TRANSITIONS` と出来事の型（`:205`〜`:629`） | 手で直さない —— `npm run gen` が E-03・E-09・E-10 から刷る | いいえ |
| `src/use-case/apply-document-change/document-change-plan.ts` | `documentHoldingOneRow`（`:165`。`:177` の `treeState: COLUMN_DEFAULTS.TaskGroup.treeState`） | `'temporarilyExpanded'` で作る | いいえ |
| `src/adapter/input-command-translator/row-tree-entrances.ts` | `everyRowDeleted`（`:132`） | 消す束の末に `levelZeroWritesFor(context.document.documentSettings.levelZeroTreeState, { type: 'everyRowDeletePressed' })` を足す（同じ束 ＝ 1 段） | いいえ |

`src/adapter/document-codec/mspdi-imported-rows.ts`・`src/use-case/edit-document/task-create.ts`・複製と貼り付けの道は変えない（決定 2）。

## 10. ⛔ この変更でやらないこと

- 全体表示を解き直す一般則を作らない。`FR-055`・`OP-10`・`HF-8`・`HF-20`・`CA-1`・`CM-71`・`FR-051` を書かない（`JDG-967`）。
- 全消しと新規に倍率と表示位置の規則を足さない（0.2）。全消しが書くのは段 0 と 表 T-050 の 1 行の値だけ（裁定 1）。
- `src/adapter/input-command-translator/item-grab.ts:314` の、描かれていない深さの行へ掴んで運ぶときの縦の倍率の書き込み（同じ `groupDepthThresholdOf` の形）を変えない —— 本書の入口（行を足す）ではない。
- `DU-2`（写しの値）を変えない（決定 2）。
- 列の既定（`erd.json` の `"default": "auto"`）を変えない（E-01 の ⚠️）。
- 表 T-068 の回 1 と `OP-10` の食い違いを直さない（12 節の候補）。

## 重なり

| 変更要求 | 同じファイル | 同じ行・同じ欄 | 扱い |
|---|---|---|---|
| `CR-609`（`IC-17` をもう 1 度押すと閉じる。`FR-072`・表 T-280） | `docs/spec/_source/state-machines.json`（あちらは 表 T-280 の区画、本書は 表 T-328 の区画 `:6339` 〜）・`docs/spec/01-04-requirements.md` | 無い | 本書は最後に当てる。旧は中身で引くので、あちらが行を足しても 1 回のまま（波 0 で数え直す）。本書は `FR-072`・表 T-280・設定の面に触れない |
| `CR-606`（プロパティパネルの行を種類ごとに） | `docs/spec/01-04-requirements.md` ほか | 本書の 3 行（`HF-7`・`HF-14`・`FR-018` の 1 行）と同じ行を書くかは、波 0 で数えて確かめる | 本書は `FR-072`・表 T-280・設定の面に触れない |
| `CR-607`（設定の面の GRS リセット） | ― | 本書は設定の面に触れない | ― |
| `DFC-1322` の変更要求（まだ無い） | `FR-095`・`IC-98`・表 T-036 | 本書は書かない | 新しい文書に表示位置を持たせず、`Task` を残さなければ、0.2 の着き方のまま |

## 11. 利用者に問うこと

無い。分類 `D`（文書に保存される値 —— 足した行と 表 T-050 の 1 行の `treeState` が `temporarilyExpanded` で、全消しの後の `S-418` が `'auto'` で保存される）は `JDG-967` と `JDG-969` が答えている。取り込み・写し・付随の行を `auto` のままにする決定 2 は、保存の形を増やさず、今の値のままである。

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1323` | 全消し・新規の後、足した行が見えない | 本書で閉じる（仕様とコード）。全消し・新規の表示は 0.2 のとおり既存の規則で着く。新規の側は `DFC-1322` の着地で確かめる |
| `DFC-1322` | 新しく始める（`N`） | 閉じない（組むだけ） |
| （候補） | 表 T-068 の回 1（`docs/spec/05-07-design.md:889`「人が畳んだ状態をすべて捨て」）と、表 T-024a の `OP-10`（`01-04-requirements.md:6444`「このとき `HF-8` を働かせてはならない」）の食い違い。コードは `OP-10` の側（`src/framework/single-html-shell/view-place.ts` は捨てずに測り、`src/adapter/input-command-translator/zoom-and-fit.ts:544` の `TRAP` が同じことを言う） | 台帳に起こす候補。本書は起こさない |

## 13. 測り方の再現

```
# the tree: b2-panel-crs bf7e96dc (docs/spec and src identical to 0590ad03)
git diff --stat 0590ad03 bf7e96dc -- docs/spec src          # empty
# old blocks are quoted by a scratchpad build script, never by hand; counted after CRLF normalisation
#   E-01 docs/spec/_source/erd.json          line starting '      "ja": "行の木の状態。`auto` ／ `collapsed`'  (:1477)  count 1
#   E-02 docs/spec/_source/state-machines.json  from '     "name": "treeStateMachine",' (:6664) to the evidence of temporarilyExpanded  count 1
#   E-03 docs/spec/_source/state-machines.json  14 lines from '      "childRowAddPressed": {' (:7180)  count 1
#   E-04 docs/spec/01-04-requirements.md     row "| HF-14 |"  (:1739)  count 1
#   E-05 docs/spec/01-04-requirements.md     row "| HF-7 |"   (:1733)  count 1
#   E-06 docs/spec/01-04-requirements.md     line starting "⚠️ 配下をすべて開いた行は、縦を縮める最初の入力で" (:5243)  count 1
#   E-07 docs/spec/01-04-requirements.md     row "| HF-20 |"  (:1744)  count 1
#   E-08 docs/spec/01-04-requirements.md     line starting "⭐ その行の id は、表 T-108 の `CM-26` が行を作るときと同じく" (:2449)  count 1
#   E-09 docs/spec/_source/state-machines.json  15 lines from '     "key": "fitPressed",' (:6607)  count 1
#   E-10 docs/spec/_source/state-machines.json  16 lines from '     "fitPressed": {' (:6416, the root cell)  count 1
#   CRLF in the three files: 0
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py AT-153 HF-14 HF-7 CM-26 TD-6
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py AT-153 HF-14 HF-7 FR-018 T-328 CM-26 TD-6 TD-7 DU-2 CD-2 OP-10
grep -n "AT-153\|DU-2\|HF-14\|HF-7\b\|childRowAddPressed\|temporarilyExpanded\|一時開放" docs/development-records/rulings.md
git grep -n "groupDepthThresholdOf\|COLUMN_DEFAULTS.TaskGroup.treeState\|treeState: 'auto'" -- src
git grep -ln "HF-14\|rowStoodUp\|childRowAddPressed" -- tests          # 15 files
grep -n '"initial"' docs/spec/_source/state-machines.json              # one per union (check_initials)
git grep -n everyRowDeletePressed                                      # 0 hits at bf7e96dc
grep -n "^| JDG-969 " docs/development-records/rulings.md
grep -o '"scroll[A-Za-z]*": *[^,]*' src/framework/single-html-shell/startup-template.json   # scrollGroupId null
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-cr-discipline.py
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-identifier-reservation.py
```
