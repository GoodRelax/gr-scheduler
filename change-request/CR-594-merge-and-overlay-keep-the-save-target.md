# CR-594 — 合流と重ねの後も、上書きする先は変わらない

> 起草の状態: 当てた（2026-09-27、枝 `refactor`、`aeeb04c6` の上の作業木。調整役の割り当て）。4 節の旧は `aeeb04c6` の `docs/spec/01-04-requirements.md` に 1 回だけ現れ、そのまま当てた。コード（9 節）も同じ作業木で直した。
> 読んだ木: `refactor` `aeeb04c6`。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-594` と `DFC-1224` を受けた。⭐ 本書は仕様の新しい識別子を 1 つも取らない（2 節）。
> 当てる順: 本書の旧に触れるほかの変更要求は無い —— `change-request/` を `FR-060` の段の旧の文で引くと、当たるのは本書だけである（13 節）。
> **閉じるもの**: `DFC-1224`（合流・重ねで読んだ `.json` を、次の `SK-11` がいまの文書で上書きする。データを失う欠陥）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

⭐ **利用者の裁定は無い。** 本書は仕様の穴を 1 文で塞ぐ。書く規則は、仕様の 2 か所がすでに言っていることの帰結である:

| 既に在る所 | 言っていること | 本書の文との関係 |
|---|---|---|
| 表 T-290 の `fileFlow/documentOpenLanded` の升（`_assets/tbl-state-machines.md:839`） | 「合流・重ねは、ファイルに無い文書を作る」「置き換えは、開いたファイルと同じ文書にする」 | 合流・重ねの後の文書を持つファイルは無い ⇒ 読んだファイルはこの文書のファイルではない |
| 表 T-227 の `DI-5` | 「開いたファイルは、定義によりこの文書のファイルである」ので `FR-060` の経路では問わない | 読んだファイルを上書きする先にすると、この文書のファイルでないものへ問わずに書く（`DI-4` を素通りする） |

⇒ 選び方は 1 つしか無い。問いは要らない。

### 0.2 調べた結果（`aeeb04c6`）

依頼文が挙げた連鎖を、1 つずつ反証しにいった。どれも偽にならなかった。

1. **読んだときに取っ手を上書きする先にしていた。** `src/framework/file-system-access-file-store/file-system-access-file-store.ts:298` の `readChosenFile` が、読めた直後に `openedHandle = handle` とする。`OP-3`（`U-56`）を問う前である（`document-file-flow.ts:479` で読み、`:551` で問う）。
2. **合流（`:592-598` の `RD-3`）も、閉じた（`:552` の `choice === null`）も、取っ手を戻さない。** 取っ手を持つのは店（`FileStore`）だけで、流れの側から戻す手が無かった。
3. **次の `SK-11` がその取っ手へ書く。** `saveHeldDocumentToFile`（`:680` で上書きする先を読み、`:684` で `openedFile` へ）→ `file-gateway.ts:250` の `overwriteOpenedFile` → 店の `:403`（取っ手を読む）・`:419`（書く）。
4. **MSPDI だけは免れる。** `isOverwritableOpenedFile`（`:664`）が拡張子 `.xml` の取っ手を上書きする先と見なさない。
5. ⚠️ **依頼文に無かった同じ形が 2 つある。**
   - ドロップの道: `readDroppedFile`（`:339`）も読んだときに取っ手を上書きする先にしていた。
   - `U-56` より前に断った読み: 形式の判別（`OP-12`、`:490`）・復号（`:495`）・検証（`OP-5`、`:540`）・稼働日の無い暦（`:546`）で断ったファイルも、取っ手だけは上書きする先に残った ⇒ 壊れたファイルを開こうとして断られた後の `SK-11` が、その壊れたファイルへ書いた。
6. **再現した**（`tests/contract/dfc-1224-merge-and-overlay-keep-the-save-target.test.ts`。直す前の木で、合流・重ね・閉じた・上書きする先の無い合流の 4 件が赤、置き換えと MSPDI の 2 件が緑。断った読みの 1 件と条文を読む 1 件は後から足した —— 直した後に店を読んだときに採る形へ戻すと 8 件中 5 件が赤）。本物の店（`fileSystemAccessFileStore`）を、書いた取っ手を数える代役のブラウザの上に置き、`frameLoop` から `SK-11` → `SK-10` → `U-56` の入口 → `SK-11` と押した。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`GL-004` ／ `CH-1`** —— 日程を情報を落とさずに往復させる目標である。合流に使った相手のファイルを黙って上書きすると、そのファイルが持っていた日程が失われる。
- ⭐ **`CH-4`（すぐわか）** —— 合流しただけのファイルが `Ctrl` ＋ `S` で書き換わるのは、説明を読まない人を驚かせる。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— 表 T-290 の升の注と `DI-5` の前提（開いたファイルはこの文書のファイル）が、上書きする先の規則を持つ `FR-060` に書かれていなかった → E-01。
- **`R1.2`（検証できる表現）** —— 「上書きする先はそれまでのまま」は、`SK-11` がどのファイルへ書いたかで確かめられる（9 節の試験）。
- **`R2.14`（POLA）** —— コードの `readFileToOpen` は、読むだけの名なのに上書きする先を変えていた（隠れた副作用）→ 9 節で、読むことと上書きする先にすることを 2 つの行いに分けた。
- **`R2.13`（CQS）** —— 新しい行い `adoptFileReadToOpen` は値を返さない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 文を `FR-060` に置く | 上書きする先を定める要求は `FR-060` である。表 T-290 は状態機械の表で、`_source/state-machines.json` から刷られる（手で書けない）。表 T-024a の `OP-3` は選ばせることを持ち、保存の先を持たない | 表 T-290 の升の注は、今のまま理由の出どころとして指される |
| 決定 2 | 閉じた場合と、`U-56` より前に断った場合を文に挙げない | 「置き換えだけが」の句で両方が決まる（選ばれていない読みは置き換えではない） | 閉じた場合を名指す行は無い |
| 決定 3 | MSPDI の扱い（`FR-096` の「最初の `SK-11` は上書きする先を持たない」）を変えない | 本書は置き換えのときの規則に触れない | — |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所（`aeeb04c6`） | 編集 |
|---|---|---|
| 合流・重ねの後の上書きする先 | `FR-060` の本文（`01-04-requirements.md:6467` の次） | E-01 |
| 表 T-290・表 T-024a・表 T-227 | — | 変えない |

**数**: 仕様の文の編集 1（1 文を足す）。原稿 JSON の編集 0。`（MUST）` が 1 つ増える（7 節）。

## 2. 新しい識別子

⭐ **無い。** 表・行・接頭辞・設定値・辞書の項を 1 つも取らない。台帳の `DFC-1224` は調整役から受けた（12 節）。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

⭐ **仕様から消すものは無い**（文を 1 つ足すだけ）。コードで消えるもの:

| 消すもの | 所（`aeeb04c6`） | 置き換わる先 |
|---|---|---|
| 読んだときに取っ手を上書きする先にする 2 行（`openedHandle = handle`） | `file-system-access-file-store.ts:298`・`:339` | 読んだ取っ手を候補として持つだけにし、`adoptFileReadToOpen` が上書きする先にする |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 旧を新で置き換える。置き換える前に、旧がそのファイルに 1 回だけ現れることを数える（13 節）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-060` の ⚠️ の段の末。旧
```text
⚠️ **問わない根拠は 表 T-227 の `DI-5`** であり、書く形式は `FR-096` が `GRS JSON` に定めている。
```
新
```text
⚠️ **問わない根拠は 表 T-227 の `DI-5`** であり、書く形式は `FR-096` が `GRS JSON` に定めている。  
⭐ 合流と重ね（表 T-024a の `OP-3`）で開いた後も、上書きする先はそれまでのままとすること（MUST） —— 合流と重ねが作るのはどのファイルにも無い文書であり（表 T-290）、読んだファイルを上書きする先にするのは置き換えだけである。
```

⚠️ 旧の行の末に 2 つの空白（段落の中の改行）を足し、新の 1 文を次の行に置く。新の文は 1 行で終わる（検査 46）。

## 5. 継ぎ目 —— 仕様だけを読む試験の体に渡す

⭐ 試験の体は `docs/spec` だけを読み、次の継ぎ目を通して確かめる。

- `FileStore`（`IF-3`、`src/adapter/file-gateway/file-store.ts`）の行い:
  - `readFileToOpen(route)` —— 読むだけ。上書きする先（`readOpenedFileState()` の答え）を変えない。
  - `adoptFileReadToOpen(): void` —— 直前に成功した `readFileToOpen` が読んだファイルを上書きする先にする。直前の読みが失敗していれば何もしない。
- 実装: `fileSystemAccessFileStore(environment)`（`UF-51`）。`environment` は `openFilePicker`・`saveFilePicker`・`dropSurface` を持つ代役でよい（取っ手の `createWritable` が書いたものを数える）。
- 流れ: `frameLoop(surface, document, screen, wiring, store)`（`UF-48`）に上の店を渡し、`SK-10`（表 T-036）で開き、`U-56` の入口 `IC-71` ／ `IC-72` ／ `IC-73`（表 T-109）か `IC-52` で答え、`SK-11` で保存する。

## 6. グラフ（`aeeb04c6`）

`python .claude/skills/spec-graph-check/impact.py FR-060` —— この要求を指す所は要求 4 件・参照 18 か所。本書は `FR-060` から 表 T-024a（`OP-3`）と 表 T-290 への辺を 2 つ足す。どちらも既に在る節点である。

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 | 後 | 数え方 |
|---|---|---|---|
| `（MUST）` の印（9 つの原稿） | N | N + 1 | 検査 39 |
| 試験が逐語で持たない MUST（検査 39 の unheld） | 基準線のまま | 基準線のまま | 新しい MUST は `tests/contract/dfc-1224-merge-and-overlay-keep-the-save-target.test.ts` が逐語で持つ |

## 8. 波 —— 持ち場で割る

1 波。仕様の 1 文、店と流れのコード、試験を同じ作業木で当てた（持ち場は `refactor` の作業木の 1 本だけ）。

## 9. 仕様の外で直すもの（本書と同じ作業木で直した）

| ファイル | 直したこと |
|---|---|
| `src/adapter/file-gateway/file-store.ts` | `FileStore` に `adoptFileReadToOpen(): void` を足した |
| `src/framework/file-system-access-file-store/file-system-access-file-store.ts` | 選んだ読み・落とした読みは取っ手を候補（`handleReadToOpen`）に置くだけにし、`readFileToOpen` の頭で候補を消す。`adoptFileReadToOpen` が候補を上書きする先にする。`readChosenFile` を作り手（`fileSystemAccessFileStore`）の外へ出し、候補を置く手（`proposeHandle`）を引数で受ける —— 作り手の行数を検査 60 の基準線の内に保つため |
| `src/framework/single-html-shell/document-file-flow.ts` | 置き換え（`RD-4`）が着地したときだけ、`landReplacedDocument` が `store?.adoptFileReadToOpen()` を呼ぶ（`openDocumentIntoHold` の行数は検査 60 の基準線のまま） |
| `tests/contract/dfc-1224-merge-and-overlay-keep-the-save-target.test.ts` | 新しい試験（再現と、置き換え・MSPDI の据え置き） |
| `tests/unit/uf-51.test.ts` | 読んだ後に上書きする先を読む試験へ `adoptFileReadToOpen` を挟み、候補と採用を分ける 3 件を足した |
| `tests/contract/if-3-file-store.test.ts`・`tests/contract/dfc-355-the-four-rulings-of-2026-09-07.test.ts` | 同じく、読んだ後に `adoptFileReadToOpen` を挟んだ |
| `FileStore` の代役を持つ試験 10 本 | 型を満たすため `adoptFileReadToOpen: () => undefined` を足した |

## 10. ⛔ この変更でやらないこと

- 置き換えの後に見出しへ出すファイル名（`documentOpenLanded` は `openedFileName: null` を運び、前の名を残す）には触れない。
- MSPDI から開いた文書の最初の `SK-11`（`FR-096`）は変えない。

## 11. 前に立つ者へ返す問い

無い。

## 12. 台帳

- `docs/development-records/defects.md` の `DFC-1224` を開いた（この木に行が無かった）。状態は `実測待ち` —— 出荷ビルドでまだ押していない。
- `docs/development-records/changelog.md` に 1 行足した。

## 13. 測り方の再現

```
# the tree: refactor aeeb04c6
git grep -n "openedHandle = handle" aeeb04c6 -- src/framework/file-system-access-file-store/
#   -> :298 (readChosenFile), :339 (readDroppedFile), :356 (saveToFile, a write)
# the old sentence of E-01, counted once
grep -c "問わない根拠は 表 T-227 の \`DI-5\`" docs/spec/01-04-requirements.md   # -> 1
# the other change requests touching the old sentence
grep -l "問わない根拠は 表 T-227" change-request/*.md                          # -> this one only
# reproduction (before the fix): 4 red, 2 green of the first 6 cases
npx vitest run tests/contract/dfc-1224-merge-and-overlay-keep-the-save-target.test.ts
# break tests (after the fix, each reverted by copying the file back)
#   proposeHandle also sets openedHandle (adopt on read)   -> dfc-1224 5 of 8 red, uf-51 2 of 90 red
#   the flow adopts right after openDocumentFile           -> dfc-1224 5 of 8 red
#   the flow never adopts                                  -> dfc-1224 2 of 8 red (IC-71, IC-71 from MSPDI)
# graph
python .claude/skills/spec-graph-check/impact.py FR-060
```
