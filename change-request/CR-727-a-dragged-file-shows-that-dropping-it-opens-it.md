# CR-727 —— ファイルをドラッグしているあいだ、落とせば開くことを日程表に示す —— 開き方は変えず、案内と入口の説明だけを足す

> 起草の状態: 当てた（2026-10-10、作業木 `c354ebff` の上。起草は `6f0abdb2` の上）。仕様（W1）とコード（W2）を 1 つの体が当てた。仕様だけを読む試験（W3）は調整役が別の体に出す（9 節）。当てるときに起草から変えた所は 14 節。
> ID の帯: 番号 `CR-727`、裁定 `JDG-1890`〜`JDG-1899`（本書は `JDG-1890`・`JDG-1892` を使う）、台帳 `DFC-2316`〜`DFC-2319`（本書は `DFC-2316`）、問い `PND-870`〜`PND-874`（本書は使わない）を調整役から受けた。`6f0abdb2` の木で `CR-727` を名乗る所は 0 件、`JDG-1890`〜`JDG-1894`・`DFC-2316`・`DFC-2317` も 0 件だった（13 節）。
> 新しい行の番号は当てるときに振った —— `c354ebff` で測り直すと、表 T-024a の行は `OP-16` まで、表 T-103 は `U-67` まで、設定値は `S-552` まで（`CR-722` が `S-543`〜`S-552` を取った）だったので、`OP-17`・`U-68`・`S-553` とした（14 節）。
> 当てる裁定: `JDG-1890`（利用者の言葉）・`JDG-1892`（案 A —— 見せるだけ足す）。覆す裁定は無い。
> 閉じるもの: 台帳 `DFC-2316`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`6f0abdb2`）

| 読み | 見たもの | 本書での扱い |
|---|---|---|
| 「落として開く道が無い」（利用者の言葉 `JDG-1890` の前提） | **誤り**。表 T-024a の `OP-2` は「ファイル選択、およびドラッグ＆ドロップ（表 T-008 の CHN-1）」と定め、`src/framework/file-system-access-file-store/file-system-access-file-store.ts:337`〜`:338` が捕獲の段で `dragover`・`drop` を聞き、`frame-loop.ts` の `askToOpenDroppedFile`（`document-file-flow.ts`）が `documentOpenAsked { openRoute: 'drop' }` を送る。`dist/index.html`（`c571a926`）を Playwright で開き、CDP `Input.dispatchDragEvent` でブラウザの層のドロップを起こすと、「ファイルを開く ／ Open File」の窓（`U-56`）が 3 択で出た（13 節） | 開き方は変えない（`JDG-1892`） |
| 「落とせることが画面に出ていない」 | **正しい**。辞書（`docs/spec/_source/display-words.json`）に「落とす」「ドロップ」を含む語は 0 件。`IC-1` の説明は「ファイルを開く。読んだ内容の扱いは開いたあとで選ぶ」。ドラッグしているあいだの見た目を定める行は仕様に無い（`dragover` の聞き手は既定の動きを止めるだけ） | E-01〜E-05 で足す |
| 「頁の中で組んだ `DataTransfer` でも開ける」 | **誤り**。同じビルドに頁の中で組んだ `DataTransfer` を落とすと「ファイルを開く途中で、思いがけない理由で失敗しました」が出た —— `getAsFileSystemHandle()` が `undefined` を返し、`readDroppedFile` が `dropped.kind` を読んで落ちる。台帳 `DFC-946`（`仕様待ち`）が既に持つ | 本書の外（10 節）。試験は `tests/usecase/uc-harness.ts` の `HOST_STUB` が取っ手を差し替えて避けている |

### 0.2 裁定の鎖（rulings.md を「ドロップ」「D&D」「ドラッグ」「落とす」「開く」「取り込み」「合流」「ファイル選択」「フォルダ」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-130` | `Agent API` が渡す文書にも開く道の 3 択（`OP-3`）を問う | 守る —— 落としても 3 択のまま（`JDG-1892` の案 A の根拠） |
| `JDG-993` | GRS 自身の `index.html` を開く道（`Ctrl` ＋ `O` ・ドロップ）で選んだら同梱の見本を開く | 触れない |
| `JDG-998`・`JDG-1003`・`JDG-1021`・`JDG-1022` | 選ばせる面が最後に読み書きしたフォルダで開く（`FR-060`） | 触れない —— ドロップはフォルダを選ばない |
| `JDG-854`・`JDG-1164`・`JDG-1349` | 「ファイルを開く」の窓（`U-56`）の並びと題 | 触れない |
| `JDG-1862` | 英語の画面のボタンの名前・窓の題・項目名を Title Case にそろえる | 案内の語は文なので Sentence case（`Drop the file to open it`）。`IC-1` の説明（`hint`）も文 |
| `JDG-1890`・`JDG-1892` | 本件 | 当てる |

覆された行を引いていないことは、上の行の状態の欄で確かめた（`JDG-130`・`JDG-993`・`JDG-998` は 適用済）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-006`（`CH-4` 説明を読まずに操作できるようにする）—— 既に在る道（フォルダを選ばずに落として開ける）を、説明を読まない人にもドラッグのあいだに見せる。新しい開き方は足さない。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.4`（異常系・準正常系）—— 落としても受け付けないあいだ（ファイルの操作中・問いが開いている）は案内を出さない。形式が判じられないドラッグ、2 つ以上のファイルのドラッグも決めた（③）。
- `R2.7`（マジックナンバーを置かない）—— 枠の太さを設定値 `S-553` にし、地の濃さは既存の `S-214` を読む。
- `R4.4`（状態機械ごとに図と表）—— 案内の出入りを `dropCueDisplayStateMachine` として 表 T-280 に置く（E-07）。
- 一つの語には一つの意味（表 T-006b）: 「落とす」は ① ファイルのドロップ ② `FR-023` が取り込めないタスクを落とす（`RS-50`）の 2 つの意味で既に使われている。案内の語は画面の語であり、仕様の文では「ファイルを落とす（ドロップ）」と書いて ② と分ける。
- 毎フレームの経路: 案内は状態が変わるときだけ描き直す（入るとき・出るとき）。動きは無い。

### ③ 利用者に問わずに決めたこと

| 決めたこと | 理由 |
|---|---|
| 案内は、落とせば受け付けるときだけ出す —— ファイルの操作が走っている・問いが開いているあいだ（今は `RS-27` で断る）は出さない | `FR-029`（押しても何も変えられない入口は薄く描く）と同じ考え。出しておいて断ると、案内が嘘になる |
| ドラッグ中はファイルの形式を判じない —— `GRS JSON`・MSPDI 以外のファイルでも案内は出し、落とした後で `OP-12` が判じる | ブラウザはドラッグのあいだファイルの名前を見せない（`dragover` で読めるのは `types` に `Files` が在ることだけ）。判じられないものを判じる規則は書けない |
| 2 つ以上のファイルのドラッグでも案内は 1 つ | 落とした後の扱いは `OP-11`（1 つ目だけ、残りを告げる）が持つ |
| 案内は書き出す絵（`FR-080`）に描かない | ドラッグのあいだは書き出しの入口を押せない。表 T-076 に行を足すほどの場面が無い |
| 枠の太さは新しい設定値 `S-553`（3px 🔎）、地は強調の色 `S-151` を `S-214`（9%）で薄く | 魔法の数を置かない。`S-214` は「状態を地で薄く示すときの濃さ」で、`FR-029`・`FR-098` が既に読む —— 3 つ目の読み手になる。3px は見本 49 の飛んだ先の囲みと同じ値で、測っていない（🔎） |

---

## 1. 範囲 —— 行き先

| 何 | 今 | 当てた後 |
|---|---|---|
| ファイルをドラッグして日程表の上に来たとき | 何も変わらない | 日程表（`Schedule Canvas`）を強調の色で薄く塗って枠で囲み、中央に「ここに落とすと開きます ／ Drop the file to open it」 |
| ドラッグが窓の外へ出た・落とした | — | 案内を消す |
| 落としたとき | 「ファイルを開く ／ Open File」の 3 択 | 変えない |
| 開く入口（`IC-1`）の説明 | 「ファイルを開く。読んだ内容の扱いは開いたあとで選ぶ」 | 「ファイルを開く。日程表にファイルを落としても開ける。読んだ内容の扱いは開いたあとで選ぶ」 |

---

## 2. 新しい識別子（当てた番号。`c354ebff` で測り直した）

| 番号 | 行き先 | 中身 |
|---|---|---|
| `OP-17` | 表 T-024a（`FR-087`） | ドラッグ中の案内 |
| `U-68` | 表 T-103（`_assets/tbl-glossary.md`） | `Drop Cue` —— ドロップの案内 |
| `S-553` | 表 T-206（`_source/settings.json`、保存しない） | 案内の枠の太さ 3px 🔎 |
| 状態機械 `dropCueDisplayStateMachine` | 表 T-280（`_source/state-machines.json`） | `hidden` ／ `shown`。出来事 `screen/fileDragEntered`・`screen/fileDragLeft` |
| 辞書の節 `dropCue`（項 `dropToOpen`） | `_source/display-words.json`（新しい節。`openChooser` の後） | ja「ここに落とすと開きます」・en「Drop the file to open it」。⚠️ 起草は `openChooser` の項としたが、検査 32 が `openChooser.text` を Title Case の名前の欄として読むので、文の語は別の節に置いた（14 節の X-2） |
| 運ぶ値 `isOpenAccepted` | 出来事 `screen/fileDragEntered` が運ぶ。名のあるガード | ファイル操作と問いの領域（表 T-290）は別の領域なので、シェルが読んで渡す（14 節の X-4） |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

消す文は無い。`IC-1` の説明の語を 1 つ書き替える（E-04）。ほかは足すだけである。

| 旧 | 新 |
|---|---|
| `IC-1` の `hint` ja「ファイルを開く。読んだ内容の扱いは開いたあとで選ぶ」 | 「ファイルを開く。日程表にファイルを落としても開ける。読んだ内容の扱いは開いたあとで選ぶ」 |
| `IC-1` の `hint` en「Open a file; how its contents are used is chosen after reading」 | 「Open a file (or drop one onto the schedule); how its contents are used is chosen after reading」 |

---

## 4. 書き直す所

### E-01 —— 表 T-024a の `OP-2`（末尾に 1 文）

旧（末尾）: 「…アイコンの正（`FR-029`）が持つ「開く」も 1 つである」
新（末尾に足す）: 「。<br>⭐ ファイルをドラッグしているあいだ、ドロップすれば開くことを `OP-17` の案内で示す」

### E-02 —— 表 T-024a に `OP-17`（`OP-2` の次）

| 行 ID | 段 | 定め |
|---|---|---|
| `OP-17` | ドラッグ中の案内 | ファイルを持つドラッグ（閲覧環境が渡す `dataTransfer.types` に `Files` が在るもの）がウィンドウの上に来たら、ドロップの案内（`_assets/tbl-glossary.md` の `U-68`）を出すこと（MUST） —— ドロップすれば開けることを、説明を読まない人にもドラッグのあいだに見せる。<br>案内は `Schedule Canvas`（`U-32`）の範囲を覆い、`_assets/tbl-settings.md` の 表 T-236 の `S-151` を 表 T-206 の `S-214` の濃さで敷き、内側の縁を `S-151` の色、太さ `S-553` の線で囲み、中央に案内の語（`FR-038` の辞書）を置く。<br>字は `Notification Area`（`U-57`）の字と同じとする。<br>重ね順は `FR-152` の 表 T-337 の `UZ-1` とし、押下を受けない —— ドロップを受けるのは今どおりウィンドウ全体である（`OP-2`）。<br>ドラッグがウィンドウの外へ出たとき、とドロップしたときは消すこと（MUST）。<br>⚠️ ドラッグがウィンドウの中の別の UI パーツへ移るだけでは消さない。<br>⚠️ ドロップしても受け付けないあいだ —— ファイルの操作が進行中、または問いが開いている（`OP-8`、`_assets/tbl-state-machines.md` の 表 T-290 の `fileFlow/documentOpenAsked` が `RS-27` で断る状態） —— は出してはならない（MUST NOT） —— 出しておいて断ると、案内が嘘になる。<br>⚠️ ドラッグのあいだはファイルの形式を判じない —— 閲覧環境はドラッグのあいだファイルの名前を見せない。<br>形式はドロップした後に `OP-12` が判じる。<br>⚠️ 2 つ以上のファイルでも案内は 1 つとする（ドロップした後は `OP-11`）。<br>⛔ 案内を文書に保存してはならず、取り消しの対象にしてはならない（MUST NOT） —— 画面の値である（`_assets/tbl-state-machines.md` の 表 T-280 の `dropCueDisplayStateMachine`）。<br>⚠️ 書き出す絵（`FR-080`）には描かない |

### E-03 —— 表 T-103 に `U-68`（`U-67` の次）

| 行 ID | 確定名 | 中身 |
|---|---|---|
| `U-68` | `Drop Cue` | ドロップの案内。<br>ファイルを持つドラッグがウィンドウの上に在るあいだ、`Schedule Canvas`（`U-32`）を薄く塗って囲み、ドロップすれば開くことを告げる面。<br>出す規則・形・消す時は `01-04-requirements.md` の 表 T-024a の `OP-17` が持つ。<br>押せるものを持たない |

### E-04 —— 辞書の `IC-1` の `hint`

3 節の表のとおり。

### E-05 —— 辞書に節 `dropCue` を 1 つ

`"dropCue": [{ "part": "dropToOpen", "text": { "ja": "ここに落とすと開きます", "en": "Drop the file to open it" } }]` —— 節 `openChooser` の後。生成器 `tools/generate_display_words.py` に `DROP_CUE_PARTS` を足し、節の並びと形（`part` で引く `text`）に加えた（14 節の X-2）。

### E-06 —— 設定値 `S-553`（表 T-206、保存しない）

| 行 | 名 | 値 | 備考 |
|---|---|---|---|
| `S-553` | ドロップの案内（`Drop Cue`）の縁の線の太さ（`FR-087` の 表 T-024a の `OP-17`） | 3px 🔎 | 見せ方の値であり保存しない。⛔ 測って決めた値ではない（🔎） —— 見本 49（`previous-project-result/49-jump-placement-and-highlight/index.html`）の飛んだ先の囲みと同じ太さを当てた（見本の `stroke-width` 3 を読んだ）。⚠️ 地の濃さは本行ではなく `S-214` が持ち、色は 表 T-236 の `S-151` が持つ |

`S-553` は `S-552` の後に置いた。`S-214` の備考の「両方が読む」を「3 つが読む」にし、読み手に「表 T-024a の `OP-17` がドロップの案内に敷く地」を足した。生成器 `tools/generate_entity_types.py` に群 `NOT_STORED_DROP_CUE_SIZES`（`S-553`、`dom-screen-surface.ts` が描く）を足した。

### E-07 —— 状態機械 `dropCueDisplayStateMachine`（表 T-280）と出来事 2 つ

- 状態 `hidden`（初期。根拠 `OP-17`）・`shown`（運ぶ値なし。根拠 `OP-17`）。
- `screen/fileDragEntered`: 入力（ファイルを持つドラッグがウィンドウに入った。根拠 `OP-17`）。運ぶ値 `isOpenAccepted`。`hidden` → `shown` [`isOpenAccepted`]。`isOpenAccepted` は、表 T-290 の `fileOperationStateMachine` が `idle` で、`confirmationStateMachine` が `notAsked` のとき真 —— 偽なら `fileFlow/documentOpenAsked` が `RS-27` で断るので、案内を出さない。
- `screen/fileDragLeft`: 入力（ドラッグがウィンドウの外へ出た、またはドロップした。根拠 `OP-17`）。`shown` → `hidden`。
- 表に無い出来事は変えない（同じ参照）。

### E-08 —— 設計書 表 T-078 の `FT-1`

旧: 「人の入力（ポインタとキー）と、ファイルのドロップ（01-04 の 表 T-024a の `OP-2`）。」
新: 「人の入力（ポインタとキー）と、ファイルのドロップ（01-04 の 表 T-024a の `OP-2`）と、ファイルを持つドラッグがウィンドウに入る・出ること（同表の `OP-17`）。」

### E-10 —— 表 T-337 の `UZ-1` に案内を足す（起草に無かった。14 節の X-3）

旧（UI パーツの欄の末尾）: 「…・ガイドカーソルの日付の札（表 T-029 の `CU-3`）」
新: 「…・ガイドカーソルの日付の札（表 T-029 の `CU-3`）・ドロップの案内（`_assets/tbl-glossary.md` の `U-68`、`FR-087` の 表 T-024a の `OP-17`）」

### E-09 —— 変更履歴に 1 行

版 `4.30`（`docs/development-records/changelog.md`）。

### 4.1 生成物

`npm run gen`（辞書・設定値・状態機械の表）。`strictdoc export docs/spec` の後 `rm -rf output`。

---

## 5. 継ぎ目（コード）—— 起草（`6f0abdb2`）の見立て。当てたものは 14 節の表

| ファイル | 変えるもの |
|---|---|
| `src/framework/file-system-access-file-store/file-system-access-file-store.ts` | `dragover` の聞き手（`allowFileDrag`、`:311`）はそのまま。`dragenter`・`dragleave` は聞かない（ファイルの置き場はファイルを読むだけであり、案内は画面の値） |
| `src/framework/single-html-shell/single-html-shell.ts` | 窓の `dragenter`・`dragleave`・`drop` を聞き、`Files` を持つドラッグの出入りをフレームを起こす入力として渡す（`:382`〜`:387` の `drop` の聞き手の隣）。⚠️ TRAP: `dragleave` は子の要素へ移るたびにも来る —— 入った数と出た数を数えるか、`relatedTarget === null`（窓の外へ出た）だけを「出た」に読む |
| `src/use-case/advance-screen-session/screen-values.ts` | `dropCueDisplayState`（`hidden` ／ `shown`）と出来事 `fileDragEntered`・`fileDragLeft`。`fileFlow` が開く求めを断る状態では `fileDragEntered` を無視する |
| `src/adapter/screen-renderer/`（案内の面を組む所。当てる体が既存の面の並びに合わせて置く） | `dropCueDisplayState.kind === 'shown'` のとき、`Schedule Canvas` を覆う面を 1 つ組む（地 `S-151` × `S-214`、縁 `S-553`、中央に `openChooser.dropCue`） |
| `src/framework/dom-screen-surface/`（面を DOM に描く所） | 上の面を描く。押下を受けない（`pointer-events: none`） —— 落とす先は今どおり窓全体 |

⭐ 継ぎ目の名（実装の体と試験の体の指示に逐語で書く）: `dropCueDisplayState`・`fileDragEntered`（運ぶ値 `isOpenAccepted`）・`fileDragLeft`・辞書の `dropCue` の `dropToOpen`・`U-68`・`data-role="Drop Cue"`・`ScreenView.dropCue`（`text`・`area`）。

毎フレームの経路: 起草は「いいえ」としたが、当てると規則 04 の 5 節の表のファイル（`src/adapter/screen-renderer/**`・`frame-loop.ts`）に触れる —— `perf-pending.md` の行 167 に載せた（14 節の X-5）。状態が変わるのは入るとき・出るときの 2 回で、動きは無い。

### 5.1 既存の試験で、古い振る舞いを主張しているもの

- `IC-1` の説明の語: `tests/contract/display-words.contract.test.ts` ほか、`IC-1` の `hint` を逐語で引く試験（当てる体が `git grep "読んだ内容の扱いは開いたあとで選ぶ"` で数える）。
- ドロップがフレームを起こす: `tests/unit/h3-a-file-drop-wakes-a-frame.test.ts` —— 主張は変わらない（足すのは出入り）。

---

## 6. グラフ（`6f0abdb2` の上、`impact.py OP-2 OP-11 OP-12 IC-1 S-214 U-56`）

- `OP-2` を指すのは要求 4 件・9 か所、`OP-11` は 1 件・2 か所、`OP-12` は 3 件・11 か所、`IC-1` は 1 件・4 か所、`S-214` は 2 件・3 か所（`FR-029`・`FR-098`）、`U-56` は 6 件・15 か所。
- 指しの多い順に `FR-087`（6）・表 T-290 の出来事（5）・`fileOperationStateMachine`（4）・`openSurfaceStateMachine`（3）。どれも E-01〜E-08 が替える文を逐語で引かない —— `OP-2` は文を足すだけ、`IC-1` は語の差し替えで、仕様の中で `IC-1` の説明を逐語で引く所は無い。
- `induced.py OP-2 OP-11 OP-12 OP-16 IC-1 S-214 U-56 FR-087 FR-029 FR-098`: 辺 14、輪 1（大きさ 5: `FR-029` `FR-098` `OP-16` `S-214` `U-56`）。本書が書くのは輪のうち `S-214`（備考に読み手を足す）だけで、ほかの 4 つは書かない —— 1 回で書ける。
- 新しく指す辺: `OP-17` → `U-68`・`U-32`・`S-151`・`S-214`・`S-553`・`OP-11`・`OP-12`・表 T-290、`U-68` → `OP-17`、`S-214` → `OP-17`。`OP-17` ↔ `U-68` と `OP-17` ↔ `S-214` は「値の行が規則を持つ要求を指す」決まりの 2 つの輪で、直すものではない。

---

## 7. 数（実測、`6f0abdb2`）

- 表 T-024a の行 16（最大 `OP-16`）、表 T-103 の最大 `U-67`、設定値の最大 `S-542`。
- 辞書の語のうち「落と」「ドロップ」を含む語 0。`openChooser` の語 3（`file`・`documentTitle`・`cancel`）。
- `S-214` の読み手 2（`FR-029`・`FR-098`）。

---

## 8. 波・持ち場・見積り

| 波 | 持ち場（重ならない） | 中身 | 体 | 見積り |
|---|---|---|---|---|
| W0 | 調整役 | 番号（`OP-`・`U-`・`S-`）と変更履歴の版を渡す | — | — |
| W1 | `docs/spec/01-04-requirements.md`・`05-07-design.md`・`_assets/tbl-glossary.md`・`_source/settings.json`・`_source/display-words.json`・`_source/state-machines.json`・`changelog.md`・生成物 | E-01〜E-09、`npm run gen` | 仕様の体 1 つ（Sonnet でよい） | 1 時間 |
| W2 | 5 節の 5 か所（`src/`）と 5.1 の試験 | 5 節 | 実装の体 1 つ | 2 時間 |
| W3 | `tests/`（新しいファイルだけ） | 9 節の継ぎ目で仕様だけを読む試験 | 試験の体 | 1 時間 |

- W2 と W3 は W1 の後に同時に走れる（継ぎ目の名は 5 節の ⭐）。合わせて約 4 時間（体の時間）。
- `CR-728` と触るファイルが重ならない（`CR-728` は `search-jump.ts`・`frame-loop.ts` の飛ぶ所・`schedule-task-figures.ts`・`schedule-overlays.ts`・`agent-api-members.ts`）。⚠️ `screen-values.ts` と `state-machines.json` は両方が触る —— 同じ波に入れるなら 1 つの体に持たせるか、`CR-727` → `CR-728` の順に当てる。

---

## 9. 仕様だけを読む試験の継ぎ目（試験の体に名指す名）

1. 出す（`OP-17`）: 出荷ビルドを開き、`Files` を持つ `dragenter` をウィンドウに送る —— `[data-role="Drop Cue"]` が出て、字が辞書の `dropCue` の `dropToOpen` の今の言語の語。
2. 消す: 入った数と同じ数の `dragleave` を送る（ウィンドウの外へ出た）—— 消える。`drop` でも消える。
3. 子へ移っても消えない: ウィンドウの中の別の要素への `dragenter` → 前の要素の `dragleave` の組では消えない。
4. 出さない: 「ファイルを開く」の窓（`U-56`）が開いているあいだに `dragenter` を送る —— 出ない。
5. 落とせば今どおり: ブラウザの層のドロップ（CDP `Input.dispatchDragEvent`）で `GRS JSON` を落とす —— `U-56` が 3 択で出る（`OP-3` は変わらない）。
6. 語（`IC-1`）: 開く入口の説明（ツールチップ）が E-04 の語。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 開き方（`OP-2`・`OP-3` の 3 択、`OP-4` の破棄確認）は変えない（`JDG-1892`）。
- 頁の中で組んだ `DataTransfer` で開けない件は `DFC-946`（`仕様待ち`）が持つ。本書は直さない。
- 落としたファイルを置き場が持ち続ける件は `DFC-943`（`仕様待ち`）が持つ。
- ヘルプの窓に「ファイルを落としても開ける」を別に書く行は足さない —— ヘルプは入口の説明を並べるので、E-04 がそのまま届く（当てる体が確かめる）。

---

## 11. 利用者に問うこと

残りは無い。問うたこと:

### 問い 1 —— 落としたときの振る舞い —— 答えた（`JDG-1892`）

択: A 見せるだけ足す（推奨）／ B 落としたら置き換えて開く ／ C 手つかずのときだけ置き換え ／ D 今のまま。答え: 「A 見せるだけ足す (推奨)」。

---

## 12. 台帳（起草で動かしたもの・当てるときに動かすもの）

| 台帳 | 起草で | 当てるとき |
|---|---|---|
| `DFC-2316` | 足した（`仕様待ち`） | `実測待ち` へ |
| `JDG-1890`・`JDG-1892` | 足した（指示 —— CR-727 が当てる） | 適用済 —— 着地先に当てた `OP-` の番号を書く |

⭐ 当てたとき（2026-10-10）: `DFC-2316` は `実測待ち`（出荷ビルドで利用者がファイルを引くのを待つ）、`JDG-1890`・`JDG-1892` は 適用済（着地先に `OP-17`・`U-68`・`UZ-1` などを書いた）。

---

## 13. 測り方の再現

```
# the tree: worktree at 6f0abdb2
# ids: git grep -c "CR-727\|JDG-189[0-4]\|DFC-231[67]" -> 0 before this draft
# drop probe (scratchpad script, not in the tree):
#   playwright chromium, file:///<worktree>/dist/index.html, viewport 1600x900, wait 1.5 s
#   cdp = context.newCDPSession(page)
#   for type in dragEnter, dragOver, drop:
#     cdp.send('Input.dispatchDragEvent', { type, x: 800, y: 450,
#       data: { items: [], files: ['<worktree>/sample-schedule/sample-small-website-renewal.ja.xml'], dragOperationsMask: 1 } })
#   -> the Open File window lists Replace / Merge / Overlay as Baseline (screenshot kept in the session scratchpad)
#   a page-built DataTransfer dispatched as dragenter/dragover/drop instead
#   -> "unexpected reason" notice (DFC-946)
# words: python -c "json.load(display-words.json)" and count texts containing 落と or ドロップ -> 0
# graph: python .claude/skills/spec-graph-check/impact.py OP-2 OP-11 OP-12 IC-1 S-214 U-56
#        python .claude/skills/spec-graph-check/induced.py OP-2 OP-11 OP-12 OP-16 IC-1 S-214 U-56 FR-087 FR-029 FR-098
```

---

## 14. 当てた記録（2026-10-10、`c354ebff` の上）

### 14.1 測り直した数

起草（`6f0abdb2`）の後に `CR-722`（版 4.29）が着いたので、本書の数と行を `c354ebff` で測り直した。

| 何 | 起草（`6f0abdb2`） | 当てる前（`c354ebff`） |
|---|---|---|
| 表 T-024a の行 | 16 行、番号は `OP-16` まで | 同じ |
| 表 T-103 の番号 | `U-67` まで | 同じ |
| 設定値の番号 | `S-542` まで | `S-552` まで（`CR-722` が `S-543`〜`S-552` を足した） |
| `impact.py` の指し | `OP-2` 4 件・9 か所、`OP-11` 1・2、`OP-12` 3・11、`IC-1` 1・4、`S-214` 2・3、`U-56` 6・15 | 同じ。足した行の `UZ-1` は 1 件・1 か所、`FT-1` は 0 件・3 か所 |
| 辞書の語のうち「落と」「ドロップ」を含む語 | 0 | 0 |
| `IC-1` の説明を逐語で引く所（`git grep`） | — | 原稿と生成した辞書の 2 つだけ（試験は引いていない） |
| 番号 `CR-727`・`JDG-1890`・`JDG-1892`・`DFC-2316` を名乗る所 | 起草が足した行だけ | 同じ（`DFC-2318` は `CR-722` の行。本書は使わない） |

### 14.2 起草から変えたこと

| 印 | 起草 | 当てたもの | 理由 |
|---|---|---|---|
| X-1 | 仮の名 `OP-NEW-1`・`U-NEW-1`・`S-NEW-A1` | `OP-17`・`U-68`・`S-553` | 14.1 の数 |
| X-2 | 辞書の語を `openChooser` の項 `dropCue` に置く | 新しい節 `dropCue` の項 `dropToOpen` | 規則 02 の 5 節の表記の表は `openChooser.text` を「名前の欄」に挙げ、検査 32 がその en を Title Case で読む（`JDG-1862`）。案内の語は文なので Sentence case のままとし、別の節に置いた。生成器の名簿と、辞書の契約試験の節の名簿（`KEY_FIELD`）に 1 つ足した |
| X-3 | 表 T-337 に触れない | `UZ-1` の UI パーツの欄に案内を足した（E-10） | `FR-152` の結びが「本表に行の無い UI パーツを画面に重ねてはならない（MUST NOT）」と定める。押下を受けず、いま行った入力（ドラッグ）への答えである点で、表示の倍率のメッセージと同じ段に入る。新しい番号は取らない |
| X-4 | 出来事が「表 T-290 が断る状態のあいだは変えない」 | 出来事 `screen/fileDragEntered` が名のあるガード `isOpenAccepted` を運ぶ | 画面の値の領域は、ファイル操作と問いの領域の状態を `in` のガードで読めない（ガードの `in` は同じ領域だけ）。`settleKeyPressed` の `hasNoSurfaceOrConfirmation` と同じく、シェルが読んで渡す |
| X-5 | 毎フレームの経路ではない | `perf-pending.md` の行 167 | 規則 04 の 5 節の表が `src/adapter/screen-renderer/**` と `frame-loop.ts` を毎フレームの経路に数える |
| X-6 | 仕様の文で「窓」 | 「ウィンドウ」 | 調整役の指示 —— 新しく書く語は規則 02 の 5 節の表記の表と `CR-724`〜`CR-726` の語に従う |

### 14.3 当てたコード

| ファイル | 当てたもの |
|---|---|
| `src/framework/single-html-shell/single-html-shell.ts` | `watchFileDrags` —— ウィンドウの `dragenter`・`dragleave`・`drop` を聞き、`Files` を持つドラッグの深さを数える。深さが 0 から 1 になれば入った、1 から 0 になれば出た、`drop` は深さを 0 に戻して出た。`relatedTarget` は読まない（子へ移るたびにも来るうえ、閲覧環境によって `null` が来る） |
| `src/framework/single-html-shell/frame-loop.ts` | `FrameLoop.fileDragMoved(isOver)` |
| `src/framework/single-html-shell/document-file-flow.ts` | `tellFileDragMoved` —— 入ったときは `isOpenAccepted` を読んで `screen/fileDragEntered` を、出たときは `screen/fileDragLeft` を送り、状態が変わったときだけフレームを求める |
| `src/use-case/advance-screen-session/screen-values.ts` | `onFileDragEntered`・`onFileDragLeft`（表 T-280）。運ぶ値の型 `isOpenAccepted` |
| `src/adapter/screen-renderer/screen-renderer.ts` | `ScreenView.dropCue`（`text`・`area`）と `dropCueOf` —— `area` は `Schedule Canvas` |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` | `showDropCue` —— `UZ-1` の層に `data-role="Drop Cue"` の面を 1 つ。地は `stateGround(S-151, S-214)`、縁は `S-553`、字は通知の箱と同じ地と字。どの部分も `pointer-events:none` |

### 14.4 既存の試験で直したもの（古い振る舞いを主張していたのではなく、名簿が新しい名を知らなかった）

- `tests/contract/display-words.contract.test.ts` —— 節の名簿 `KEY_FIELD` に `dropCue` を足し、案内を出したフレームで `ScreenView.dropCue.text` を語と照らす置き場を 1 つ足した。
- `tests/contract/state-machine-screen-values.contract.test.ts` —— 運ぶ値の見本 `isOpenAccepted: [true, false]` と、ガードの読み方（運ぶ値が真なら成り立つ）を足した。原稿から作る神託が、新しい運ぶ値の見本を求めて止まっていた。
- `tests/contract/dfc-66-fr-101-a-save-names-the-file-it-wrote.test.ts` —— コメントが引いていた 表 T-078 の `FT-1` の前半は E-08 で変わるので、引用を変わらない後半の文（⭐ の文）だけにした（検査 42・検査 55）。
- 仕様だけを読む試験は、別の体が `tests/contract/cr-727-op-17-the-drop-cue.contract.test.ts` と `tests/contract/cr-727-stage.ts` に書いた（`OP-17` の 4 つの `（MUST）`・`（MUST NOT）` を逐語で持つ。19 件、緑）。実装の体は、型の検査で赤かった 1 か所（`it.each` の組の 3 つ目の要素）を外しただけで、主張は変えていない。DOM の面（`[data-role="Drop Cue"]`）は試験が無く、14.7 の見本だけが確かめている。

### 14.5 検査が求めた、仕様の外の付け足し

- `FR-086` の数え（「表 T-103 の 66 行 … いずれにも 0 件」）を 67 行にした —— 足した `U-68` は透かしの名前の入口ではないので、0 件は変わらない（検査 9）。
- 規則 03 の生成した定数の名簿に `NOT_STORED_DROP_CUE_SIZES` を足した（検査 30）。
- `.claude/skills/spec-graph-check/dictionary-table-pairing.txt` の `T-109 IC-1` の 1 行 —— 表 T-109 の `IC-1`（「文書を開く」、`FR-087` の `OP-2`）と新しい説明を読み合わせてから指紋を替えた（検査 37。数の基準線ではない）。

### 14.6 グラフ（`c354ebff` の上、当てた後）

- `induced.py OP-2 OP-17 OP-11 OP-12 OP-16 IC-1 S-214 S-553 U-56 U-68 UZ-1 FR-087 FR-029 FR-098 FR-152`: 辺 31、輪 1（大きさ 11: `FR-029` `FR-087` `FR-098` `OP-16` `OP-17` `OP-2` `S-214` `S-553` `U-56` `U-68` `UZ-1`）。本書が書いたのは輪のうち `OP-2`・`OP-17`・`S-214`・`S-553`・`U-68`・`UZ-1` で、1 回の変更で書いた。

### 14.7 出荷ビルドの見本（体が確かめた）

`c354ebff` に本書を当てたビルドの写しを Playwright で開き、CDP `Input.dispatchDragEvent` でファイルを引いた: `dragEnter` で `[data-role="Drop Cue"]` が `Schedule Canvas`（左 0・上 29・幅 1600・高さ 871）に出て、字は「ここに落とすと開きます」、`pointer-events` は `none`、縁は 3px。`drop` で消え、「ファイルを開く」のウィンドウが出た。そのウィンドウが出ているあいだの `dragEnter` では出なかった。
