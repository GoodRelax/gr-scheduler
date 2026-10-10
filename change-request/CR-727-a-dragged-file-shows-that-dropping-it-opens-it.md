# CR-727 —— ファイルをドラッグしているあいだ、落とせば開くことを日程表に示す —— 開き方は変えず、案内と入口の説明だけを足す

> 起草の状態: 下書き（2026-10-10、作業木 `6f0abdb2` の上）。⛔ 仕様・コード・試験は変えていない。当てる時期と体は調整役が決める。
> ID の帯: 番号 `CR-727`、裁定 `JDG-1890`〜`JDG-1899`（本書は `JDG-1890`・`JDG-1892` を使う）、台帳 `DFC-2316`〜`DFC-2319`（本書は `DFC-2316`）、問い `PND-870`〜`PND-874`（本書は使わない）を調整役から受けた。`6f0abdb2` の木で `CR-727` を名乗る所は 0 件、`JDG-1890`〜`JDG-1894`・`DFC-2316`・`DFC-2317` も 0 件だった（13 節）。
> 新しい行は仮の名（`OP-NEW-1`・`U-NEW-1`・`S-NEW-A1`）で書き、当てるときに番号を振る —— `6f0abdb2` で 表 T-024a の最大は `OP-16`、表 T-103 の最大は `U-67`、設定値の最大は `S-542`。並んで走る CR が同じ番号を取りうるので、当てる体が当てる時点の最大を測り直す。
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
- `R2.7`（マジックナンバーを置かない）—— 枠の太さを設定値 `S-NEW-A1` にし、地の濃さは既存の `S-214` を読む。
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
| 枠の太さは新しい設定値 `S-NEW-A1`（3px 🔎）、地は強調の色 `S-151` を `S-214`（9%）で薄く | 魔法の数を置かない。`S-214` は「状態を地で薄く示すときの濃さ」で、`FR-029`・`FR-098` が既に読む —— 3 つ目の読み手になる。3px は見本 49 の飛んだ先の囲みと同じ値で、測っていない（🔎） |

---

## 1. 範囲 —— 行き先

| 何 | 今 | 当てた後 |
|---|---|---|
| ファイルをドラッグして日程表の上に来たとき | 何も変わらない | 日程表（`Schedule Canvas`）を強調の色で薄く塗って枠で囲み、中央に「ここに落とすと開きます ／ Drop the file to open it」 |
| ドラッグが窓の外へ出た・落とした | — | 案内を消す |
| 落としたとき | 「ファイルを開く ／ Open File」の 3 択 | 変えない |
| 開く入口（`IC-1`）の説明 | 「ファイルを開く。読んだ内容の扱いは開いたあとで選ぶ」 | 「ファイルを開く。日程表にファイルを落としても開ける。読んだ内容の扱いは開いたあとで選ぶ」 |

---

## 2. 新しい識別子（仮の名。当てるときの番号に替える）

| 仮の名 | 行き先 | 中身 |
|---|---|---|
| `OP-NEW-1` | 表 T-024a（`FR-087`） | ドラッグ中の案内 |
| `U-NEW-1` | 表 T-103（`_assets/tbl-glossary.md`） | `Drop Cue` —— ドロップの案内 |
| `S-NEW-A1` | 表 T-206（`_source/settings.json`、保存しない） | 案内の枠の太さ 3px 🔎 |
| 状態機械 `dropCueDisplayStateMachine` | 表 T-280（`_source/state-machines.json`） | `hidden` ／ `shown`。出来事 `screen/fileDragEntered`・`screen/fileDragLeft` |
| 辞書の語 `openChooser.dropCue` | `_source/display-words.json` の `openChooser` | ja「ここに落とすと開きます」・en「Drop the file to open it」 |

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
新（末尾に足す）: 「<br>⭐ ファイルをドラッグしているあいだ、落とせば開くことを `OP-NEW-1` の案内で示す」

### E-02 —— 表 T-024a に `OP-NEW-1`（`OP-2` の次）

| 行 ID | 段 | 定め |
|---|---|---|
| `OP-NEW-1` | ドラッグ中の案内 | ファイルを持つドラッグ（閲覧環境の `dataTransfer.types` に `Files` が在る）が窓の上に来たら、ドロップの案内（`_assets/tbl-glossary.md` の `U-NEW-1`）を出すこと（MUST）。<br>案内は `Schedule Canvas`（`U-32`）を覆い、表 T-236 の `S-151` を 表 T-206 の `S-214` の濃さで敷き、内側の縁を `S-151` の太さ `S-NEW-A1` の線で囲み、中央に案内の語（`FR-038` の辞書）を置く。字は通知（`Notification Area`、`U-57`）の字と同じとする。<br>ドラッグが窓の外へ出たとき・落としたときは消すこと（MUST）。<br>⚠️ 落としても受け付けないあいだ —— ファイルの操作が走っている、または問いが開いている（`_assets/tbl-state-machines.md` の 表 T-290 の `fileFlow/documentOpenAsked` が `RS-27` で断る状態）—— は出してはならない（MUST NOT） —— 出しておいて断ると、案内が嘘になる。<br>⚠️ ドラッグのあいだはファイルの形式を判じない —— 閲覧環境はドラッグのあいだファイルの名前を見せない。形式は落とした後に `OP-12` が判じる。<br>⚠️ 2 つ以上のファイルでも案内は 1 つとする（落とした後は `OP-11`）。<br>⛔ 案内を文書に保存してはならず、取り消しの対象にしてはならない（MUST NOT） —— 画面の値である（表 T-280 の `dropCueDisplayStateMachine`）。<br>⚠️ 書き出す絵（`FR-080`）には描かない |

### E-03 —— 表 T-103 に `U-NEW-1`（`U-67` の次）

| 行 ID | 確定名 | 中身 |
|---|---|---|
| `U-NEW-1` | `Drop Cue` | ドロップの案内。ファイルを持つドラッグが窓の上に在るあいだ、`Schedule Canvas` を薄く塗って囲み、落とせば開くことを告げる面。<br>出す規則・形・消す時は `01-04-requirements.md` の 表 T-024a の `OP-NEW-1` が持つ。<br>押せるものを持たない |

### E-04 —— 辞書の `IC-1` の `hint`

3 節の表のとおり。

### E-05 —— 辞書の `openChooser` に 1 つ

`{ "part": "dropCue", "text": { "ja": "ここに落とすと開きます", "en": "Drop the file to open it" } }` —— `openChooser` の `cancel` の後。

### E-06 —— 設定値 `S-NEW-A1`（表 T-206、保存しない）

| 行 | 名 | 値 | 備考 |
|---|---|---|---|
| `S-NEW-A1` | ドロップの案内の枠の太さ（表 T-024a の `OP-NEW-1`） | 3px 🔎 | 見せ方の値であり保存しない。⛔ 測って決めた値ではない —— 見本 49（`previous-project-result/49-jump-placement-and-highlight/index.html`）の飛んだ先の囲みと同じ太さを当てた |

`S-214` の備考に読み手を 1 つ足す: 「`OP-NEW-1` のドロップの案内の地も読む」。

### E-07 —— 状態機械 `dropCueDisplayStateMachine`（表 T-280）と出来事 2 つ

- 状態 `hidden`（初期。根拠 `OP-NEW-1`）・`shown`（運ぶ値なし。根拠 `OP-NEW-1`）。
- `screen/fileDragEntered`: 入力（ファイルを持つドラッグが窓に入った）。`hidden` → `shown`。ただし 表 T-290 が開く求めを断る状態のあいだは変えない。
- `screen/fileDragLeft`: 入力（ドラッグが窓の外へ出た・落とした）。`shown` → `hidden`。
- 表に無い出来事は変えない（同じ参照）。

### E-08 —— 設計書 表 T-078 の `FT-1`

旧: 「人の入力（ポインタとキー）と、ファイルのドロップ（01-04 の 表 T-024a の `OP-2`）。」
新: 「人の入力（ポインタとキー）と、ファイルのドロップ（01-04 の 表 T-024a の `OP-2`）と、ファイルを持つドラッグが窓に入る・出ること（同表の `OP-NEW-1`）。」

### E-09 —— 変更履歴に 1 行

版は調整役が渡す。

### 4.1 生成物

`npm run gen`（辞書・設定値・状態機械の表）。`strictdoc export docs/spec` の後 `rm -rf output`。

---

## 5. 継ぎ目（コード）—— `6f0abdb2` の行

| ファイル | 変えるもの |
|---|---|
| `src/framework/file-system-access-file-store/file-system-access-file-store.ts` | `dragover` の聞き手（`allowFileDrag`、`:311`）はそのまま。`dragenter`・`dragleave` は聞かない（ファイルの置き場はファイルを読むだけであり、案内は画面の値） |
| `src/framework/single-html-shell/single-html-shell.ts` | 窓の `dragenter`・`dragleave`・`drop` を聞き、`Files` を持つドラッグの出入りをフレームを起こす入力として渡す（`:382`〜`:387` の `drop` の聞き手の隣）。⚠️ TRAP: `dragleave` は子の要素へ移るたびにも来る —— 入った数と出た数を数えるか、`relatedTarget === null`（窓の外へ出た）だけを「出た」に読む |
| `src/use-case/advance-screen-session/screen-values.ts` | `dropCueDisplayState`（`hidden` ／ `shown`）と出来事 `fileDragEntered`・`fileDragLeft`。`fileFlow` が開く求めを断る状態では `fileDragEntered` を無視する |
| `src/adapter/screen-renderer/`（案内の面を組む所。当てる体が既存の面の並びに合わせて置く） | `dropCueDisplayState.kind === 'shown'` のとき、`Schedule Canvas` を覆う面を 1 つ組む（地 `S-151` × `S-214`、縁 `S-NEW-A1`、中央に `openChooser.dropCue`） |
| `src/framework/dom-screen-surface/`（面を DOM に描く所） | 上の面を描く。押下を受けない（`pointer-events: none`） —— 落とす先は今どおり窓全体 |

⭐ 継ぎ目の名（実装の体と試験の体の指示に逐語で書く）: `dropCueDisplayState`・`fileDragEntered`・`fileDragLeft`・`openChooser.dropCue`・`U-NEW-1`（当てた番号）・`data-role="Drop Cue"`。

毎フレームの経路: **いいえ** —— 状態が変わるのは入るとき・出るときの 2 回で、動きは無い。`perf-pending.md` に行は要らない。

### 5.1 既存の試験で、古い振る舞いを主張しているもの

- `IC-1` の説明の語: `tests/contract/display-words.contract.test.ts` ほか、`IC-1` の `hint` を逐語で引く試験（当てる体が `git grep "読んだ内容の扱いは開いたあとで選ぶ"` で数える）。
- ドロップがフレームを起こす: `tests/unit/h3-a-file-drop-wakes-a-frame.test.ts` —— 主張は変わらない（足すのは出入り）。

---

## 6. グラフ（`6f0abdb2` の上、`impact.py OP-2 OP-11 OP-12 IC-1 S-214 U-56`）

- `OP-2` を指すのは要求 4 件・9 か所、`OP-11` は 1 件・2 か所、`OP-12` は 3 件・11 か所、`IC-1` は 1 件・4 か所、`S-214` は 2 件・3 か所（`FR-029`・`FR-098`）、`U-56` は 6 件・15 か所。
- 指しの多い順に `FR-087`（6）・表 T-290 の出来事（5）・`fileOperationStateMachine`（4）・`openSurfaceStateMachine`（3）。どれも E-01〜E-08 が替える文を逐語で引かない —— `OP-2` は文を足すだけ、`IC-1` は語の差し替えで、仕様の中で `IC-1` の説明を逐語で引く所は無い。
- `induced.py OP-2 OP-11 OP-12 OP-16 IC-1 S-214 U-56 FR-087 FR-029 FR-098`: 辺 14、輪 1（大きさ 5: `FR-029` `FR-098` `OP-16` `S-214` `U-56`）。本書が書くのは輪のうち `S-214`（備考に読み手を足す）だけで、ほかの 4 つは書かない —— 1 回で書ける。
- 新しく指す辺: `OP-NEW-1` → `U-NEW-1`・`U-32`・`S-151`・`S-214`・`S-NEW-A1`・`OP-11`・`OP-12`・表 T-290、`U-NEW-1` → `OP-NEW-1`、`S-214` → `OP-NEW-1`。`OP-NEW-1` ↔ `U-NEW-1` と `OP-NEW-1` ↔ `S-214` は「値の行が規則を持つ要求を指す」決まりの 2 つの輪で、直すものではない。

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

1. 出す（`OP-NEW-1`）: 出荷ビルドを開き、`Files` を持つ `dragenter` を窓に送る —— `[data-role="Drop Cue"]` が出て、字が `openChooser.dropCue` の今の言語の語。
2. 消す: 続けて窓の外への `dragleave`（`relatedTarget` が `null`）を送る —— 消える。`drop` でも消える。
3. 子へ移っても消えない: 窓の中の別の要素への `dragleave` → `dragenter` の組では消えない。
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
