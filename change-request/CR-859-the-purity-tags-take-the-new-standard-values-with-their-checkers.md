# CR-859 —— 純粋性の札の値を新しいレビュー基準の名へ改め、札を読む検査を同じ変更で直す

> 起草の状態: 作業木に当てた（2026-11-08、枝 `claude/focused-goldberg-60f801`、develop `526d819f1` の上）。付録 A の 34 行（表 T-107 とその原稿）は、持ち主が 2026-11-08 に 1 度で OK した（BGQA の問 9 は a、`JDG-3594`。持ち主は BOSS のチャットで「OK」と答えた）。本書の全部を 1 つのコミットで入れる。
> ID の帯: BOSS から番号 `CR-859`、裁定 `JDG-3591`〜`JDG-3601`（初めの帯は `JDG-3599` まで。BOSS が 2026-11-08 に 2 つ広げた）、台帳 `DFC-3621`〜`DFC-3625`、保留 `PND-981`〜`PND-982`、検査の番号 `94` を受けた。`526d819f1` の木で `CR-859` を名乗る変更要求と、検査 94 を走らせる節は 0 件だった（9 節）。
> 当てるもの: `JDG-3591`（BGQA3 の問 23）、`JDG-3593`（BGQA の問 8）、`JDG-3594`（問 9）、`JDG-3596`（問 11）。同じ巡で記録だけする裁定は 8 節。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`526d819f1`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| 旧い値は 200 ファイル・951 行に在る（BOSS の計画） | `git grep` の 4 つの綴り（9 節）で 951 行・200 ファイル。計画と同じ | 直す 758 行と残す 193 行に分けた（1 節） |
| `docs/review/` は全部が記録である | `docs/review/public-entry-index.md` は `tools/generate_public_entry_index.py` が書き、`npm run gen:check` の `gen:index:check` が比べる。旧い値を 3 行持つ | 計画の「残す」から「直す」へ移した（+3 行）。検査 94 は名指しで数える |
| 札を読むコードは値の綴りを持たない | `purity-calls.mjs` の `TAG_RE` は値を 5 つ並べた正規表現で、新しい値に一致しない。`IMPURE_TAGS`・`HONEST_TAGS`・`EXCUSED_BY_TAG`（2 か所）・`PURITY` も綴りを持つ | 読み手を同じ変更で直した。直さないと検査 64 は新しい札を読めず、嘘の札を見逃す（5 節で壊して確かめた） |
| 紹介頁の文は台本の外に在る | `docs/about/index.html` の英語の対訳（`EN_HTML`）は 2 つ目の `<script>` の中に在り、CSP の指紋がその台本を固定する | 書き換えた台本の `sha256-` を計り直した（`CR-858` の X-3 と同じ作法） |

### 0.2 裁定の鎖（`rulings.md` を「purity」「純粋」「semi-pure」で引いた）

- `JDG-3488`（持ち主の言葉に旧い鍵 `semiPureB` が入る）は逐語なので書き換えない。BGQA の問 8 は a（`JDG-3593`）で、記録の旧い値を残すと決めた。
- 新しい値の名は原本 gr-sw-maker `0db4e95` の `process-rules/review-standards-ja.md` の R7「純粋性の分類」の表が持つ。和名は「準純粋-不変」と「準純粋-可変」、英名は Semi-pure-immutable と Semi-pure-mutable である。
- 用語集の鍵（`semiPureImmutable`・`semiPureMutable`）と `studies/76-grs-json-beta-shape/terms/` の 9 行は、用語集の SUB が持つ（BGQA の問 11 は a、`JDG-3596`）。本書は触れない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- 表 T-054 の課題（`CH-1`〜`CH-7`）も 1.3 の目標（`GL-001`〜`GL-009`）も、どれも前へ進めない —— 道具立ての変更である。製品の動きは変わらない（札はコメントであり、`dist` の差は 0）。本書は、プロジェクトの札を共有のレビュー基準に合わせ、2 つの値が名で区別できるようにする。

### ② レビュー観点のどの条項を当て、何が出たか

- 07 の R7「`@purity` タグ」—— 4 つの値はどれも他の値の前方一致にならない。`semi-pure-mutable` を引く grep は `semi-pure-immutable` を拾わない（原本の同じ節が言う）。検査 64 の `TAG_RE` は値を `\b` で閉じて並べるので、この性質に頼らない。
- 07 の R2 の Naming（名は指すものを言う）—— `a`・`b` は区別するだけで、何を読むかを言わない。新しい名は「不変の値を読む」「可変の値を読む」を言う。
- 07 の R2 の OKPN（1 つの名前に 1 種類の値）—— 原稿 `agent-api-members.json` の欄 `purity` は、改めた後も純粋性の 4 値の 1 種類だけを取る。列挙（`agent-api-members.schema.json`）の 4 値はどれも同じ種類である。
- 07 の R2 の OMPV（1 つの値に 1 つの意味）—— 旧い `semi-pure-a`・`semi-pure-b` も 1 つの意味しか持たなかった。改めた後の値は意味を名で言う（不変の値を読む ／ 可変の値を読む）。値を足しも分けもしない。
- 07 の R1 の「仕様の重複・競合の排除」—— 値の綴りは 4 か所の読み手（検査 33・64・65、試験目録）に写しがある。本書は写しを 1 つにまとめない（読み手ごとに言語が違う）。代わりに検査 94 が、旧い綴りが戻ることを止める。

### ③ 持ち主の答えと、問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 1 つの変更で全部を置き換え、読み手と検査を同じ変更で直す。その間ほかの仕事は止める（BGQA3 の問 23 は a、`JDG-3591`） | 持ち主の答え | 窓の間、ほかの SUB はコードを触れない |
| X-b | 記録の旧い値 193 行は残し、検査 94 の外に名指しで置く（問 8 は a、`JDG-3593`） | 持ち主の答え。記録を書き換えると嘘になる | 旧い値は記録の中に残る |
| X-c | 表 T-107 と原稿の 34 行は、付録 A の表 1 枚で持ち主が 1 度で OK する（問 9 は a、`JDG-3594`） | 持ち主の答え | OK が来るまでコミットを待つ |
| X-d | `public-entry-index.md` は生成物なので直す | `gen:index:check` が原稿との一致を比べる | 計画の数より 3 行多い |
| X-e | 規則 07 は値と和名だけを直し、定義の文（「可変・非決定」）は原本へ追いつかせない | 段 5 の SUB が 07 を原本へ追いつかせる | 段 5 までは 07 の定義の文が原本と違う |

---

## 1. 範囲 —— 行き先

| 区分 | 領域 | ファイル | 行 |
|---|---|---:|---:|
| 直す | `src/` | 33 | 196 |
| 直す | `tests/` | 88 | 322 |
| 直す | `tools/` | 24 | 134 |
| 直す | `.claude/skills/spec-graph-check/` | 6 | 20 |
| 直す | `docs/spec/`（付録 A の 34 行を含む） | 6 | 52 |
| 直す | `docs/development-rules/` | 3 | 18 |
| 直す | `docs/about/index.html`・`docs/development-records/test-inventory.md`・`docs/review/public-entry-index.md` | 3 | 16 |
| 計 | | 163 | 758 |
| 残す | `change-request/` | 16 | 59 |
| 残す | `docs/development-records/` の記録（rulings・defects・fixed-defects・changelog・history） | 6 | 14 |
| 残す | `docs/review/`（生成物を除く）・`studies/` | 15 | 120 |

- 置き換えは 6 つの綴り: `semi-pure-a` → `semi-pure-immutable`、`semi-pure-b` → `semi-pure-mutable`、`Semi-pure-a` → `Semi-pure-immutable`、`Semi-pure-b` → `Semi-pure-mutable`、`準純粋-a` → `準純粋-不変`、`準純粋-b` → `準純粋-可変`。バイト単位で置き換え、改行の形（CRLF ／ LF）を保った。
- 外部の契約は変わらない: `grs-document.schema.json`・`grs-commands.schema.json`・`dist/`・MCP の説明は旧い値を 0 回持つ。`agentApiVersion` と `schemaVersion` は動かない。

---

## 2. 新しい識別子

検査 94（`.claude/skills/spec-graph-check/check-retired-purity-values.py`）。仕様の行 ID は足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| 札の値 `semi-pure-a`（和名 準純粋-a） | `semi-pure-immutable`（準純粋-不変） |
| 札の値 `semi-pure-b`（和名 準純粋-b） | `semi-pure-mutable`（準純粋-可変） |
| `purity-calls.mjs` の `TAG_RE`・`IMPURE_TAGS`・`HONEST_TAGS` の旧い値 | 新しい値 |
| `check-unit-test-or-omission.py` と `tools/generate_test_inventory.py` の `EXCUSED_BY_TAG` の旧い値 | 新しい値 |
| `audit-ch5.py` の `PURITY` の旧い値 | 新しい値 |
| `agent-api-members.schema.json` の `purity` の列挙の旧い値 | 新しい値（付録 A の 33・34） |

---

## 4. 書き直す所

### X-1 —— 札と、札を読むコード

- `src/` の札 195 行とコメント 1 行、`tests/` の 322 行、`tools/` の 134 行。生成器の雛形の札（`tools/generate_*.py`）と、それが書いた `src/` の札は同じ値になる。
- 読み手 6 か所: `purity-calls.mjs` の 96・97・105 行目、`check-unit-test-or-omission.py` の 63 行目、`tools/generate_test_inventory.py` の 61・639 行目、`audit-ch5.py` の 191 行目。試験の値の期待は `tests/contract/cr-765-t-107-the-printed-call-shapes.contract.test.ts` の 151 行目と `tests/contract/spec-table-reads-the-whole-cell.contract.test.ts` の 105 行目。
- 説明の語だけ: `check-purity-honesty.py` の 9 行、`check.sh` の 2 行、`purity-honesty-baseline.txt` の注の 1 行。

### X-2 —— 仕様

- `docs/spec/05-07-design.md` の 12 行（表 T-060 の `LY-4`・`LY-5`、表 T-063 の `UT-6`・`UT-12`、表 T-075 の純粋性の列 6 行とその下の注 2 行）。
- 原稿 `docs/spec/_source/published-entries.json` の 3 行と、生成された表 T-064（`tbl-published-entries.md`）の 3 行。
- 付録 A の 34 行（表 T-107 の 16 行、原稿 `agent-api-members.json` の 16 行、原稿のスキーマの列挙 2 行）。持ち主の OK（`JDG-3594`）を受けて入れた。
- 変更履歴（`docs/development-records/changelog.md`）に 1 行。

### X-3 —— 規則と紹介頁

- 規則 07 の 15 行（品詞の規約・純粋性の分類の表の値と和名・計算ロジック・外部読取・`@purity` タグ・総合チェックリスト・観点の表）、規則 04 の表 `UO` の `UO-1`、規則 09 の検査 64 の行と 6 節の注。
- 規則 09 に検査 94 の行を 1 行足した。
- 紹介頁 `docs/about/index.html` の日本語の 1 行と英語の対訳の 1 行。2 つ目の台本の CSP の指紋を `sha256-jXSyj1U6wXIoS3krUrF03caP3rALwkI3o0OX6xm5ZDI=` に計り直した。

### X-4 —— 検査 94

- `check.sh` の 94 番。旧い綴り（`semi-pure-` の後に `a`・`b`、頭が大文字の同じ綴り、`準純粋-` の後に `a`・`b`、`準純粋` の後に `A`・`B`、`semiPure` の後に `A`・`B`）が、名指した記録の外に 1 つでも在れば赤。検査 63 と同じく、除外を 1 つずつ理由とともに刷る。基準線は無い。

---

## 5. 継ぎ目（コード）と試験

- 継ぎ目は無い。コードの動きは変わらない —— 変えたのはコメントの札、試験の題と期待の値、検査とツールの綴りである。
- 読み手が新しい値を読むことの確かめ（`src/` と `tsconfig` の scratch の写し、`check-purity-honesty.py --root`）: 嘘の札を 2 つ植えた —— `pure` の `clampedSettings` の札を `semi-pure-immutable` に替えて `void Date.now()` を足し、`file-gateway.ts` に `pure` の `breakProbe` を足して `semi-pure-mutable` の `openDocumentFile` を呼ばせた。検査 64 は 0 から 2 へ赤になり、2 つを名指した。⭐ 同じ写しを、`TAG_RE` だけを旧い値に戻した `purity-calls.mjs` の写しで読むと、植えた 2 つは消え（札を読めない）、代わりに `canvasRasterizer`（`src/framework/canvas-rasterizer/canvas-rasterizer.ts`）に偽りの嘘が 1 つ出た（中の `semi-pure-mutable` の札を読めず、外の `pure` を当てた）。読み手を直さない変更は、検査 64 を見逃しと誤りの両方に落とす。写しは確かめの後に消した。
- 検査 94 を壊して確かめた: `src/` の札 1 つを旧い値へ戻すと、検査 94 は 1 件を刷って赤になった（7 節）。

---

## 6. グラフ（`impact.py`）

- 行の文の中の値だけが変わり、行・要求・参照の辺は変わらない。表 T-107 の 16 行、表 T-064 の `PI-20`〜`PI-22`、表 T-075 の `UF-37`・`UF-39`・`UF-41`・`UF-51`・`UF-54`・`UF-158`、表 T-060 の `LY-4`・`LY-5`、表 T-063 の `UT-6`・`UT-12` に触れる。

---

## 7. 数（予測 → 実測）

- 予測: 要求 ±0、表 ±0、表の行 ±0、図 ±0、`（MUST）` ±0。
- 実測: 7 節の下の表。

| 確かめ | 前（`526d819f1`） | 後（作業木） |
|---|---|---|
| 旧い値の行（4 つの綴り、git が追う木の全部） | 951 行・200 ファイル | 195 行・37 ファイル（全部が記録。本書が足した裁定の 1 行と変更履歴の 1 行を含む。本書の付録は含まない） |
| 検査 94 が数える範囲の旧い値 | 758 行・163 ファイル | 0 |
| 検査 33（`audit-ch5.py`） | PASS、4 つの外の純粋性 0 | PASS、出力は前と 1 字も違わない |
| 検査 64 | 3029 の札のうち嘘 0 | 3029 の札のうち嘘 0 |
| 検査 65 | 932 の export のうち 42（基準線） | 同じ（出力は前と 1 字も違わない） |
| 試験目録の `UO-1` | 197 のうち 31 | 197 のうち 31 |
| `git diff dist` | — | 0（`vite build` で組み直した） |
| コメントを除いたコードの同一（字句解析で注釈と空白を除き、HEAD と比べた） | — | 変えたコードのファイル 150 のうち、同一 126（`src/` の 33 は全部）、値の綴りだけが違う 23（読み手 4・試験 5・生成器 14 の文字列と docstring）、ほか 1（`check.sh` の検査 94 の節） |
| `npm run gen:check` | 赤 1（`tbl-row-id-prefixes.md` の `JDG` の数が 2105、台帳は 2106 行。`JDG-3590` の後に作り直していなかった） | 緑（作り直して 2117） |
| `npm run gen:tests` | — | 試験目録の 11 行の値だけが変わる |
| vitest の全部 | — | 661 ファイルのうち 1 つが赤: 既知の赤 `cr-586-iv-22` の 2 件（`DFC-922`。本書はこのファイルにも、それが通るコードにも触れない） |
| `check.sh` | — | 赤は 85 だけ —— `src/` のコメントが変わったので `grsRelay` の版が動いていない。版は BOSS が上げる（本書では上げない） |

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `rulings.md` | `JDG-3591`（BGQA3 の問 23）、`JDG-3592`（BGQA の問 7）、`JDG-3593`〜`JDG-3601`（BGQA の問 8〜問 16） |
| `changelog.md` | 本書の 1 行 |

---

## 9. 測り方の再現

```
git grep -c "CR-859" 526d819f1 -- change-request docs src tests tools .claude   # 0 件
git grep -n 'section "94' 526d819f1 -- .claude                                   # 0 件
git grep -nIE 'semi-pure-[ab]\b|semiPure[AB]\b|Semi-pure[- ][abAB]\b|準純粋[- ]?[abAB]\b' 526d819f1 -- . | wc -l   # 951
python .claude/skills/spec-graph-check/check-retired-purity-values.py .
python .claude/skills/spec-graph-check/check-purity-honesty.py
bash .claude/skills/spec-graph-check/check.sh
```

---

## 10. 実物の確かめの手順

画面の動きは変わらないので、実物の確かめは無い。BOSS が GT-2 を回す。

---

## 付録 A —— 表 T-107 と原稿の 34 行（BGQA の問 9、持ち主が 1 度で OK する）

⭐ 34 行とも、純粋性の値の綴りだけが変わる。メンバーの名・呼び方・説明の文・行 ID は変わらない。`semi-pure-a` は `semi-pure-immutable` に、`semi-pure-b` は `semi-pure-mutable` になる。

| # | 場所（ファイル:行） | 行 | 前 | 後 |
|---:|---|---|---|---|
| 1 | `docs/spec/_assets/tbl-agent-api-members.md`:27 | 表 T-107 の `AM-1`（`agentApiVersion`） | プロパティ・`semi-pure-a` | プロパティ・`semi-pure-immutable` |
| 2 | `docs/spec/_assets/tbl-agent-api-members.md`:28 | 表 T-107 の `AM-2`（`schemaVersion`） | プロパティ・`semi-pure-a` | プロパティ・`semi-pure-immutable` |
| 3 | `docs/spec/_assets/tbl-agent-api-members.md`:29 | 表 T-107 の `AM-30`（`readSchema`） | 動詞＋目的語・`semi-pure-a` | 動詞＋目的語・`semi-pure-immutable` |
| 4 | `docs/spec/_assets/tbl-agent-api-members.md`:30 | 表 T-107 の `AM-3`（`readDocument`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 5 | `docs/spec/_assets/tbl-agent-api-members.md`:31 | 表 T-107 の `AM-4`（`readStamp`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 6 | `docs/spec/_assets/tbl-agent-api-members.md`:32 | 表 T-107 の `AM-5`（`readSelection`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 7 | `docs/spec/_assets/tbl-agent-api-members.md`:33 | 表 T-107 の `AM-25`（`readSearchRows`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 8 | `docs/spec/_assets/tbl-agent-api-members.md`:34 | 表 T-107 の `AM-28`（`readTableRows`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 9 | `docs/spec/_assets/tbl-agent-api-members.md`:35 | 表 T-107 の `AM-26`（`readShownTasks`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 10 | `docs/spec/_assets/tbl-agent-api-members.md`:36 | 表 T-107 の `AM-19`（`readDelayDiagnostics`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 11 | `docs/spec/_assets/tbl-agent-api-members.md`:43 | 表 T-107 の `AM-11`（`exportJson`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 12 | `docs/spec/_assets/tbl-agent-api-members.md`:44 | 表 T-107 の `AM-12`（`exportMspdi`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 13 | `docs/spec/_assets/tbl-agent-api-members.md`:45 | 表 T-107 の `AM-13`（`exportSvg`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 14 | `docs/spec/_assets/tbl-agent-api-members.md`:46 | 表 T-107 の `AM-14`（`exportPng`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 15 | `docs/spec/_assets/tbl-agent-api-members.md`:47 | 表 T-107 の `AM-15`（`exportEmbeddedHtml`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 16 | `docs/spec/_assets/tbl-agent-api-members.md`:48 | 表 T-107 の `AM-34`（`exportFixLogTsv`） | 動詞＋目的語・`semi-pure-b` | 動詞＋目的語・`semi-pure-mutable` |
| 17 | `docs/spec/_source/agent-api-members.json`:175 | 原稿の `AM-1`（`agentApiVersion`） | `"purity": "semi-pure-a"` | `"purity": "semi-pure-immutable"` |
| 18 | `docs/spec/_source/agent-api-members.json`:199 | 原稿の `AM-2`（`schemaVersion`） | `"purity": "semi-pure-a"` | `"purity": "semi-pure-immutable"` |
| 19 | `docs/spec/_source/agent-api-members.json`:223 | 原稿の `AM-30`（`readSchema`） | `"purity": "semi-pure-a"` | `"purity": "semi-pure-immutable"` |
| 20 | `docs/spec/_source/agent-api-members.json`:279 | 原稿の `AM-3`（`readDocument`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 21 | `docs/spec/_source/agent-api-members.json`:334 | 原稿の `AM-4`（`readStamp`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 22 | `docs/spec/_source/agent-api-members.json`:358 | 原稿の `AM-5`（`readSelection`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 23 | `docs/spec/_source/agent-api-members.json`:381 | 原稿の `AM-25`（`readSearchRows`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 24 | `docs/spec/_source/agent-api-members.json`:451 | 原稿の `AM-28`（`readTableRows`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 25 | `docs/spec/_source/agent-api-members.json`:526 | 原稿の `AM-26`（`readShownTasks`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 26 | `docs/spec/_source/agent-api-members.json`:550 | 原稿の `AM-19`（`readDelayDiagnostics`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 27 | `docs/spec/_source/agent-api-members.json`:820 | 原稿の `AM-11`（`exportJson`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 28 | `docs/spec/_source/agent-api-members.json`:862 | 原稿の `AM-12`（`exportMspdi`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 29 | `docs/spec/_source/agent-api-members.json`:904 | 原稿の `AM-13`（`exportSvg`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 30 | `docs/spec/_source/agent-api-members.json`:946 | 原稿の `AM-14`（`exportPng`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 31 | `docs/spec/_source/agent-api-members.json`:989 | 原稿の `AM-15`（`exportEmbeddedHtml`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 32 | `docs/spec/_source/agent-api-members.json`:1031 | 原稿の `AM-34`（`exportFixLogTsv`） | `"purity": "semi-pure-b"` | `"purity": "semi-pure-mutable"` |
| 33 | `docs/spec/_source/agent-api-members.schema.json`:97 | 原稿のスキーマの `purity` の列挙 | `"semi-pure-a"` | `"semi-pure-immutable"` |
| 34 | `docs/spec/_source/agent-api-members.schema.json`:98 | 原稿のスキーマの `purity` の列挙 | `"semi-pure-b"` | `"semi-pure-mutable"` |
