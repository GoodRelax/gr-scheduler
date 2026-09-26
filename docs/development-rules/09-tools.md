# 09 道具の目録と呼び出し口

⛔ **本書は毎回読む文書ではない。** 毎回読むのは**第 1 節の表 1 つだけ**でよい。
第 4 節から第 8 節は、赤が出たときに**引く**ための目録である。

⚠️ **目録が要る理由は実測である。** 検査が揃っていながら
表 T-037 の幽霊行を 1 本も捕まえられなかった。
**揃っていることは、何かを見ていることの保証にならない。**
だから本書の各行には「**何が見えないか**」の欄が在り、⛔ **そこが空の行は目録に入れない。**

---

## 1. ⭐ 用途ごとの呼び出し口 —— これだけ覚える

⭐ **`npm run` が正である。** 束は 6 つで、中身は既にある script を並べただけである。

| 用途 | いつ | 打つもの | 実測 | Explorer から |
|---|---|---|---|---|
| **巡の頭** | セッションを始めたとき | `npm run guard:start` | **2 秒** | `tools/guard/guard-start.bat` |
| **仕様書を触った** | `docs/spec/*.md` を編集したあと | `npm run guard:spec` | **47 秒** | `tools/guard/guard-spec.bat` |
| **生成元を触った** | `docs/spec/_source/*.json` を編集したあと | `npm run guard:gen` | **62 秒** | `tools/guard/guard-gen.bat` |
| **コミット前** | 毎回 | `npm run guard:commit` | **56 秒** | `tools/guard/guard-commit.bat` |
| **公開前（push）** | ⛔ PUBLIC なので毎回 | `npm run guard:publish` | **56 秒 ＋ 1 秒** | `tools/guard/guard-publish.bat` |
| **掃除の巡** | 掃除に入るとき | `npm run guard:cleanup` | **6 秒** | `tools/guard/guard-cleanup.bat` |

⚠️ **時間を書いてあるのは、書いていない手順が忙しいときに飛ばされるからである。**
⭐ **どれも 1 分に満たない。** ⛔ **「重いから後で」は、この 6 本については通らない。**

### ⭐ 束の中身（`package.json` が持つ。本書は写しを持たない）

| 束 | 並んでいるもの |
|---|---|
| `guard:start` | `sweep` → `stats` → `precheck` |
| `guard:spec` | `precheck` → `test` → `check`（＝`check.sh`）|
| `guard:gen` | `gen` → `gen:check` → `test` → `check` |
| `guard:commit` | `precheck` → `typecheck` → `gen:check` → `test` → `check` |
| `guard:publish` | `precheck --unpushed` → `guard:commit` |
| `guard:cleanup` | `list-asserted-claims` → `list-withdrawn-cited` → `list-prose-tallies` → `list-inverted-authority` → `list-lying-edges` |

⚠️ **`gen:check` は、生成器ごとの `*:check` を `&&` で並べたものである。**`dev` ／ `preview` ／ `e2e` ／ `test` ／ `test:watch` は開発用の口であって、門ではない。

⛔ **連鎖は `&&` である。最初の赤で止まる。** 落ちた検査の名前は `check.sh` が節ごとに刷るので画面に残るが、
⚠️ **その後ろの束は走っていない。** 直したら**束ごと打ち直せ**。

⚠️ **`guard:start` は `.claude/settings.json` の SessionStart hook と重なる。**
hook は `sweep` と `stats` を自動で走らせるので、Claude のセッションの中では `precheck` だけが新しい。
⛔ **hook はセッションの外では走らない。** Explorer や素の端末から始めるときは、束のほうを打つこと。

⭐ **書いた直後の hook（JDG-59）:** `.claude/hooks/check-after-edit.py` は PostToolUse（Edit・Write・MultiEdit）で、書いたファイル 1 つだけを検査する —— `src/` と `tests/` の `.ts` は `check-comment-rules.py --file`、`docs/spec/_source/` の原稿は対応する生成器の `--check`。
違反は exit 2 でモデルに知らせるだけで、編集は止めない。
⚠️ Bash での書き換えには掛からないので、コミット前の門（`guard:commit`）が拾う。

### ⭐ `.bat` は皮である

⛔ **`.bat` に手順を書くな。** 6 本とも、動く行は `cd` と `npm run` と `pause` の 3 行だけで、
残りは役目を述べる `REM` である。**何を走らせるかは `package.json`、何が見えないかは本書**が持つ。
⚠️ **`pause` が要るのは、Explorer から叩いた窓が結果を見せる前に消えるからである。**

---

## 2. 欄の読み方

| 欄 | 何が書いてあるか |
|---|---|
| **種別** | **門**（赤にする）／**生成器**（書き出す）／**修理**（書き換える）／**調査**（人が読む）／**部品**（ほかの道具が import する）／**走者**（束ねて走らせる）|
| **何を赤にするか** | ⛔ **対象を名指した 1 文。**「整合性を守る」のような抽象語は目録に書かない |
| **何が見えないか** | ⛔ **この欄が本書の主題である。** 走査の単位・読まないフォルダ・棚上げした基準線・前提にしている形 |
| **呼ぶ人** | `check.sh` ／ `npm run …` ／ SessionStart hook ／ 人が手で ／ ⛔ **誰も** |
| **基準** | 棚上げを持つファイル。⚠️ **基準に載っている欠けは赤にならない。払った債務はファイルから出すこと** |

---

## 3. 数（2026-09-26 実測。第 4〜8 節の表の行を、置き場は git が追うファイルの名で数えた）

| 種別 | 本数 | 置き場の内訳 |
|---|---|---|
| 門 | **44** | `.claude/skills/spec-graph-check/` に 38、`tools/` に 4、`docs/review/` に 1、`tools/parity/` に 1 |
| 生成器 | **27** | `tools/` に 17、`docs/spec/_source/` に 9、`tools/probe/` に 1 |
| 修理 | **4** | `tools/` に 4 |
| 調査 | **21** | `.claude/skills/spec-graph-check/` に 8、`tools/probe/examples/` に 8、`tools/` に 3、`tools/probe/` に 1、`tools/parity/` に 1 |
| 部品・走者 | **8** | `.claude/skills/spec-graph-check/` に 6、`tools/` に 2 |
| **合計** | **104** | `.mjs` 14 ＋ `.py` 89 ＋ `.sh` 1 |

⚠️ 2026-09-26 に門 3 本（検査 64〜66）と部品 1 本（`purity-calls.mjs`）を足して数え直した（`CR-573` の波 3b）。同じ 2026-09-26 のうちに、CR-581 の並行の道具（第 12〜14 節）と `CR-581` の検査 67〜73 を本節へ合流し、次の 17 本を新たに数えた —— 門 6（`merge_driver.py`・`renumber_ids.py`・`check-literal-restatement.py`・`check-twin-comments.py`・`check-handoff-holds-state.py`・`check-rules-name-real-things.py`、検査 67/68/69/70/72/73）、生成器 6（`published_entries_json_to_md.py`・`generate_public_entry_index.py`・`generate_state_machine_types.py`・`state_machines_json_to_md.py`・`generate_test_inventory.py`・`grab-figures.mjs`）、調査 3（`body_brief.py`・`privacy_count.py`・`lm-19-frame-time-baseline.mjs`）、部品 2（`function-size.mjs`・`merge_branch.py`）。⛔ **この 104 本にはまだ入っていない門が 7 本ある** —— 検査 56・57・59・60・61・62・63（`check-grab-table-parents.py`・`check-decision-tables.py`・`check-component-edges.py`・`check-function-size.py`・`check-module-state.py`・`check-identifier-reservation.py`・`check-sm-ev-tn-prefix-gone.py`）は check.sh に既に在るが、第 4 節の表にまだ行を持たない（第 9 節に載せた）。それ以外の行は 2026-09-13 の実測のままである。

⛔ **目録は拡張子で数えるな。** 名指しではなく `import` で呼ばれる部品も、`.mjs` の走者も、道具である。

---

## 4. 門 —— 赤にする道具（44 本）

| 検査 | 道具 | 何を赤にするか | ⛔ 何が見えないか | 呼ぶ人 | 基準 |
|---|---|---|---|---|---|
| 0 | `check-rules-index.py` | docs/development-rules/ の `NN-…`（.md かフォルダ）が README.md からリンクされていない、README.md にその 2 桁番号が無い、または README.md と各規則ファイルの中の相対リンクが実在しないパスを指すと赤。 | 番号付きフォルダ（08- の仕様執筆キット）の中のリンクは丸ごと飛ばす（os.path.isdir で continue）ので、その中の壊れたリンクは見えない。規則が何を言っているかも一切読まない（docstring 自認）。 | `check.sh` | — |
| 5 | `md-checks.py` | 未定義の表参照(5)、行 ID と表番号の二重定義(6)、存在しない行 ID へのバッククォート参照(7)、その表に無い行を「表 T-nnn の X-n」と書いた参照(8)、散文の件数と表の行数の食い違い(9)、ヘッダと列数の合わない行(10)、未定義または二重定義の図 F-nnn(15)、表の行の直下に空行なしで置かれて表に飲まれる散文(48) を赤にする。 | 検査 7 はバッククォートで囲んだトークンしか見ないので、裸で書かれた S-93 も、src/ と tests/ のコメントも 1 行も読まない。走査対象は specindex.discover の 2 階層（docs/spec と docs/spec/_assets）だけで、change-request/ も docs/review/ も docs/development-rules/ も対象外。 | `check.sh` | — |
| 11 | `dup-check.py` | 01-04-requirements.md と _assets/tbl-glossary.md と _assets/tbl-settings.md の 3 ファイルを文単位に割り、4-gram の Jaccard が 0.45 以上で結ばれた組（A 類＝規則か理由の二重書き）を報告し、基準線に無い組が 1 つでも出れば赤にする。 | 読むのは冒頭に手で書いた 3 ファイルだけで、05-07-design.md も他の _assets も 1 行も読まない。似た語しか見ないので言い換えは素通りする（1 回の掃除の本物 20 件のうち 5 件がしきい値の下だった）。⛔ COMMON_GRAM=60 があり 61 単位以上に出る 4-gram を捨てるので、別の場所を消した副作用で触っていない 2 行が赤くなる（DFC-467 の実測、0.4286→0.4571）。 | `check.sh` | `duplication-baseline.txt` |
| 12 | `style-checks.py` | tbl-settings.md / tbl-glossary.md に置かれた MUST・MUST NOT(12) と、禁止語 部品 を「禁止語である」と名指さずに使った docs/spec の行(32) を赤にする。検査 13（譲り残し）と 14（値の二重書き）は印字するだけで赤にしない。 | 検査 12 と 13 が読むのは tbl-settings.md / tbl-glossary.md / 01-04-requirements.md の 3 ファイルだけで、05-07-design.md に置かれた規則も、他の _assets の表も見ない。検査 14 は設定値表の 3・4 列目の数字を要求文書に grep するだけで単位も文脈も見ない。検査 32 だけは docs/spec を再帰で歩く（output/ と __pycache__ を除く）ので、同じ 1 本の中で 3 者の走査範囲が食い違っている。 | `check.sh` | — |
| 19 | `check_layer_rules.py` | src/ の .ts が持つ相対 import のうち、層を外向きにまたぐ辺(LR-1 / Entity 内の 2 段なら LR-4)、他コンポーネントの公開入口 `<component>.ts` 以外へ着地する辺(LR-2 / LR-5)、同一層内の循環(LR-3)、実在しない相対先、そして『読めた指定子 < 実在する指定子』という被覆不足を赤にする。 | LR-6(Entity / UseCase が DOM 型に触れないこと)は一切読まず tsconfig.entity.json のコンパイラ任せ、bare specifier(パッケージ)は層の外として素通り、除去するのは行コメント `^\s*//` だけなのでブロックコメント `/* … */` の中の import も辺として数え、走査対象が `.ts` のみなので .mjs / .tsx の依存は最初から存在しない扱いになる。 | `npm run layers`／`check.sh` | — |
| 21 | `check-provenance.py` | ARTIFACTS に直書きした 21 個の生成物の先頭 1400 字に「生成物/generated」「手で直さない/do not edit by hand」「原稿のパス（settings.json・erd.json など）」「npm run gen か build.py」の 4 つが揃わないと赤。docs/spec/_source/ の各ファイルが SSOT とも生成物とも名乗らないときも赤。 | 見るのは先頭 1400 字に語が在るかだけなので、銘板さえ付いていれば中身が原稿と何巡ずれていても緑（一致は検査 16/17/20/27 の仕事）。ARTIFACTS は手書きの一覧なので、載せ忘れた生成器は最初から検査対象に入らない。 | `check.sh` | — |
| 22 | `check-cr-discipline.py` | change-request/ の CR-175 以降の .md が、①CH-1〜CH-5 か GL-001〜GL-007 の語、②`review-standards` か `R1`〜`R7` の語、③「問わずに決めた」という文字列、のどれかを欠くと赤。 | 語が在るかを正規表現で見るだけなので答えの中身は読まない（`CH-1` と一度書けば、その挑戦と無関係な変更要求でも緑になる。docstring も「make the ANSWER good はできない」と自認）。 | `check.sh` | — |
| 23 | `check-language-dictionary.py` | docs/spec/_source/ の「SINGLE SOURCE OF TRUTH」と名乗る *.json で、キーが ja でも en でもない位置に日本語を含む文字列が在り、その JSON パスが EXEMPT に無い／EXEMPT の数と実測が違う／EXEMPT に在るのに実測 0 件 のいずれかで赤。 | 見るのは「その文字列の直近のキーが ja か en か」だけなので、ja と en の中身が対訳になっているか、en 側が空か、ja と同文かは一切見ない。対象も _source/*.json に限られ、Markdown 原稿の散文は読まない。 | `check.sh` | — |
| 24 | `check-development-record.py` | docs/development-records/ の巡記録（README.md・pending-decisions.md・defects.md・handoff.md・fixed-defects.md・rulings.md・changelog.md を除く *.md）が **対象**: `src/…` を宣言しない、表 T-075 のユニットと行が一対一でない、同じファイルを 2 行持つ、⬜ なのにファイルが雛形と 1 バイト違う、⬜ 以外なのに雛形と完全一致、のいずれかで赤。 | 段階を機械で決められるのは「generate_unit_tree.py が書く雛形と 1 バイト一致か」だけなので、🔧 と 🧪 と ✅ の区別は付かない（雛形から 1 文字変えれば ✅ を名乗れる）。 | `check.sh` | — |
| 25 | `check-pending-decisions.py` | src/ tests/ tools/ の .ts/.py/.js に在る `@provisional PND-nnn` と pending-decisions.md の行が食い違う（行の無い印／区分 A〜C の 未裁定 なのに印が無い／区分 D〜H なのに印が在る／裁定済 なのに印が残る／PD を名乗るのに 8 セル揃わない行／閉じた巡に D〜H の未裁定が残る）と赤。 | 行の 区分 欄（A〜H）が真実かを見ないので、本当は待つべき値でも `A` と書いてあれば暫定実装が通る（docstring 自認）。印を探す範囲も .ts/.py/.js に限られ、.json や .md に置いた暫定値は印を持ちようがない。 | `check.sh` | — |
| 26b | `check-published-members.py` | 表 T-064 のメンバ欄が公開する名前を、表 T-075 が与える公開エントリの .ts が export していない（かつ published-members-baseline.txt に無い）とき、src/ でコンポーネントのフォルダ境界を越える名前が 表 T-064 に無い（かつ crossing-names-baseline.txt に無い）とき、基準線の行が実在の穴と対応しなくなったときに赤。 | メンバ欄の piece は 「`名前`」 か 「`名前`（…」 の形でなければ member と認めず skip として数えるだけなので、実装するインターフェース名しか書かない Framework の行は 1 つも突き合わされない。署名（引数と戻り値）も見ない（tsc の領分）。 | `check.sh` | `published-members-baseline.txt`、`crossing-names-baseline.txt` |
| 28 | `check-live-verification.py` | defects.md と fixed-defects.md で、ステータスが 未検討／裁定待ち／仕様待ち／実装待ち なのに 実物確認 欄が YYYY-MM-DD の行が 1 つでも在れば即赤。さらに 実測済 なのに 実物確認 が 「⛔ 未」 の行数が live-verification-baseline.txt を超えると赤。 | 実物確認 欄については「YYYY-MM-DD の形をしているか」しか見ないので、その日で本当に実物を押したかは見ない（自己申告の日付を書けば緑になる）。実測待ち の行数は印字するだけで門にしない。 | `check.sh` | `live-verification-baseline.txt` |
| 29 | `check-decided-spec.py` | defects.md と fixed-defects.md で、ステータスが 実装待ち／試験待ち／実測待ち／実測済 なのに 対応方針・決定仕様 欄が「表 T-nnn」「図 F-nnn」「Chapter n」「docs/….md」「D/PD/CR 以外の接頭辞を持つ `XX-nnn`」のどれも名指さない行の数が、decided-spec-baseline.txt の数を超えると赤。 | 欄が「場所らしき形の文字列」を含むかだけを見るので、名指した先が実在するか、そこに本当にその決定が書いてあるかは見ない（`FR-999` や存在しない 表 T-999 でも通る）。 | `check.sh` | `decided-spec-baseline.txt` |
| 30 | `check-generated-constants.py` | src/ の `// <generated -- do not edit by hand>` 〜 `// </generated>` の中の行頭の `const`（`export` の有無を問わない）の名前の集合と、docs/development-rules/03-implementation.md が行頭に並べる大文字の名前の集合が一致しないと赤（片側にだけ在る名前ごとに 1 行）。<br>JDG-139 を写し（ファイルと名前の組）ごとに見て、`export` の付いた写しをほかのファイル（src/ か tests/）が 1 つも import していないとき、ほかのファイルが読む写しに `export` が無いとき、tools/generate_entity_types.py の `PUBLISHED_READ_BY_SRC` / `PUBLISHED_READ_BY_TESTS_ONLY` が木と食い違うか群を取り違えたときも赤。<br>`--self-test` はメモリに持った木を 6 通りに破り、どれかが赤にならないか、破る前の木が緑でないと赤。 | 比べるのは名前の集合だけなので、定数の値が原稿とずれていても、一覧の説明欄（LISTED は名前の後ろを `\S` で確認するだけ）が誤っていても緑。<br>読み手として数えるのは相対指定子の import・再輸出・名前空間の `ns.NAME` / `ns['NAME']`・動的 import だけで、試験がソースを文字列として読み `export const NAME` を探す形は数えない。<br>`Object.keys(ns)` のような列挙も、どの名前の読み手にも数えない。 | `check.sh` | — |
| 31 | `check-stale-blocked.py` | defects.md と fixed-defects.md で、対応方針・決定仕様 欄が（引用と 「⚠️ 実測（日付）」 の記録の外で）未定・利用者の裁定が要る・裁定を待つ・仕様に行が無い・裁定が要る と読め、かつ同じ行が 決着の語／ステータス 試験待ち・実測待ち・実測済／実物確認 が ✅ で始まる のどれかを持つ行の数が stale-blocked-baseline.txt を超えると赤。 | セル全体に対する部分一致なので、「先の問いは決着し、後から別の問いが開いた」正直な行と、消し忘れの古い文言を区別できない（docstring 自認。前者は基準線の中に含めて飲み込んでいる）。 | `check.sh` | `stale-blocked-baseline.txt` |
| 33 | `audit-ch5.py` | 05-07-design.md の 表 T-062／T-063／T-064／T-065／T-075 の行数・行 ID・層・純粋性と、_source/components.json の節点・辺・クラスタ、5.3 の木の葉フォルダ、散文が述べる数（「N のフォルダ」「層をまたぐ N 本」「N メンバ」）、tbl-glossary.md の T-107 行数、changelog.md の 2 文が互いに食い違うと赤。 | 開くのは 05-07-design.md・_assets/tbl-glossary.md・_source/components.json・changelog.md の 4 つだけで src/ を 1 バイトも読まないので、表 T-075 が名指すユニットのファイルが実在するか（検査 18 の領分）も、公開エントリがそのメンバを export しているか（検査 26b の領分）も見ない。 | `check.sh` | — |
| 37 | `check-dictionary-table-covariance.py` | _source/display-words.json の 12 節（icons/properties/settings/notices/questions/exportFormats/arms/pressOrder/selecting/grabAreas/shortcuts/assignments）の各項目と、対応する表 T-109/T-016/T-104/T-037/T-234/T-024/T-023b/T-023a/T-023c/T-023d/T-036/T-023 の同じ行 ID の行を読み合わせた sha256 指紋が dictionary-table-pairing.txt と 1 つでも変われば赤（新しい対・消えた対も赤）。 | 対にするのは GROUPS に直書きした 12 節だけなので、rowId を持たない 7 節（surfaces・confirmation・noticeDismiss・confirmationMarks・fileStatus・defaultNames・weekdays）と firstRow を持つ paletteGroups と、precedent 試験に任せた reasons／T-233 は、どれだけ動いても何も言わない。 | `check.sh` | `dictionary-table-pairing.txt` |
| 38 | `check-changelog-versions.py` | docs/development-records/changelog.md の `## A.3 Changelog` 節で、行頭セルの版番号が 2 行以上に現れるか、直前の行より小さい版番号が現れると赤。 | 日付欄を一切読まない（ROW は行頭の版番号セルしか取らない）ので、版番号が昇順でも日付が逆転している対（1.53 が 2026-08-30、1.54 が 2026-08-29）はそのまま通る。 | `check.sh` | — |
| 39 | `check-must-clause-coverage.py` | docs/spec の 8 原稿（A-appendix.md は丸ごと、01-04 の Chapter 1 は節ごと除外）の `（MUST）`／`（MUST NOT）` のうち、その印の直前 120／90／60／40／28 字のどれもが tests/contract・tests/system・tests/usecase のファイル（`CR-573`、`JDG-637`。tests/unit・tests/integration・tests/nfr は読まない）からコメント行を抜いた本文に逐語で見つからないものの数が must-clause-coverage-baseline.txt を超えると赤。 | 見るのは「その語がテストの本文に文字列として在るか」だけなので、その試験が条項について何かを確かめているかは見ない（条項の末尾 28 字をコードの文字列に貼るだけで held になる）。逆に直前 28 字より短い文脈しか持たない条項は、試験が押さえていても unheld と数える。 | `check.sh` | `must-clause-coverage-baseline.txt` |
| 40 | `check-ruled-elsewhere.py` | defects.md と fixed-defects.md で、ステータスが 未検討／裁定待ち か、対応方針欄が（引用と 「⚠️ 実測（日付）」 の記録の外で）未検討・裁定待ち・利用者の裁定が要る・裁定を待つ・未定・仕様に行が無い と読める行のうち、pending-decisions.md で 状態 が 裁定済 の `PND-nnn` を名指す行の数が ruled-elsewhere-baseline.txt を超えると赤。 | 結びつけに使えるのは「行が PND- を書いていること」だけなので、PD 行を持たない裁定（台帳のセルだけで決着したもの）と、変更要求にしか記録が無い裁定は見えない —— 後者は NOT GATED として数を印字するだけで赤にしない（38 行の雑音床があるため）。 | `check.sh` | `ruled-elsewhere-baseline.txt` |
| 41 | `precheck.py` | git が変更と報告したファイル(未追跡フォルダは中まで展開)を 1 秒で読み、docs/spec の中のバッククォート付き `CR-nnn` / `PND-nnn`、docs/spec の空行 2 連続、原稿が同じ差分に居ない生成物の手編集、ドライブレターや home / Users のホーム直下で始まる絶対パス、実行機のアカウント名 / メールアドレス / 資格情報らしき文字列、change-request の CH- と GL- の取り違えを赤にする。⭐ --unpushed を付けると、作業木だけでなく push 済みでない commit が触った全ファイルも読む（guard:publish が使う）。 | clean tree では 0 ファイルを見たまま緑を出す(設計どおりの『何も見ずに通る』)、禁じる利用者名は実行機の getpass.getuser() 由来なので他人の機械の名前は見えず 3 文字未満なら検査自体が無効、tools/precheck.py 自身・docs/reference/・dist/index.html は明示的に免除、そして生成物が原稿と一致するかは見ない(それは検査 16 の仕事)。 | `npm run precheck`／`check.sh` | — |
| 42 | `check-quoted-source.py` | src/ と tests/contract・tests/system・tests/usecase（`CR-573`、`JDG-637`）の .ts/.mjs のコメント塊に在る 10 字以上・CJK を含む 「…」『…』 の引用で、記号と空白を落とした形が docs/spec/**.md と docs/development-records/changelog.md のどの 1 ファイルにも（省略記号で割った断片を順に）見つからないものの数が quoted-source-baseline.txt を超えると赤。 | 引用の直前 120 字に `D-nnn` `PND-nnn` `CR-nnn` 「規則 n」「利用者の」 などが在れば「別の本の引用」として免除するので、その語を 1 つ添えれば捏造した引用も数えられない。文字列リテラル中の引用も読まない（comment_blocks だけを見る）。 | `check.sh` | `quoted-source-baseline.txt` |
| 43 | `check-ruling-landed.py` | docs/development-records/rulings.md の行で、着地先 が空、状態 が 適用済 なのに 着地先 が docs/spec の定める ID（要求の UID・表の行・表と図の表題・JSON の `id`）も在るファイルも名指さず ruling-landed-baseline.txt の HELD 行も無い、HELD 行が在るのにもう miss でない、未着地 の数が基準線を超える、のいずれかで赤。⭐ 仕様書は利用者の言葉を持たないので、逐語の検索ではなく**着地先が名指すもの**で着地を示す。ID もファイルも名指さない着地先だけは、逐語を探す。 | 名指された ID が**在ること**しか見ないので、その要求や行が裁定の中身を実際に書いているかは見ない。4 欄の古い表（状態 欄が無い行）は 着地先 が空かどうかだけで判定する。 | `check.sh` | `ruling-landed-baseline.txt` |
| 44 | `check-spec-id-references.py` | src/ と tests/ の .ts/.tsx/.js/.mjs に現れる `XX-nnn` 形の語のうち、retired.py が退役と記す ID と、接頭辞は仕様のものなのに原稿・退役集合・台帳の行頭セル・change-request/ のファイル名のどれにも無い ID の総出現数が spec-id-references-baseline.txt を超えると赤。 | ID が生きているかだけを見て周りの文は読まないので、「IC-69 は 2026-09-02 までここに在った」という正しい歴史の記録も 1 件として数え、逆に ID が生きてさえいれば、その行の主張が現在形の嘘でも何も言わない（check.sh の NOT COVERED 欄も同じことを言う）。 | `check.sh` | `spec-id-references-baseline.txt` |
| 45 | `check-repeated-expressions.py` | src/ の .ts/.tsx を手書きの字句解析器で割り、20 字句以上の同一字句列が 2 か所以上に立つ組の数が repeated-expressions-baseline.txt を超えると赤。 | 字句を逐語で比べ識別子を正規化しないので、変数名を付け替えた複写は（食い違う名前の次の字句から始まる窓でしか）見えず、言い換えた同じ規則は完全に見えない。コメント・import/re-export・`// <generated>` ブロックも読まず、tests/ は数えるだけで門にしない。 | `check.sh` | `repeated-expressions-baseline.txt` |
| 46 | `check-line-breaks.py` | BOOKS の 7 原稿（01-04・05-07・08-10・A-appendix・tbl-settings・tbl-glossary・tbl-property-items）で、後ろに文字が続く `。` が、表の行なら直後に `<br>`、表の外なら行末（閉じる `**` は可）になっていない箇所の数が line-break-baseline.txt のそのファイルの数を超えると赤。 | BOOKS に _assets/fig-erd-detail.md と fig-erd-overview.md が無いので、生成された 2 つの ERD 原稿は 1 行に何文詰めても通る。加えて 「」『』 の中と、src//tests/ が逐語で引いている 8 字以上の run は免除される。 | `npm run linebreaks:check`／`check.sh` | `line-break-baseline.txt` |
| 47 | `check-marks.py` | BOOKS の 9 原稿（docs/spec の 4 本と _assets の 5 本）で、⛔⛔ ／ ⭐⭐ ／ ⚠️⚠️ の重ね印が 1 つでも在るか、`**…**` の太字の 1 走りが 「。」 を跨いで後続の文字を含むと赤。 | 対象は docs/spec の 9 ファイルだけなので、src//tests//docs/development-rules/change-request の重ね印は見ない（規則ファイルや道具の docstring は ⛔⛔ を書き放題）。印がその内容にふさわしいかも見ない。 | `npm run marks:check`／`check.sh` | — |
| 49 | `check-render.py` | scratch/spec-html-probe/html/spec/*.html に素の `**…**`（`<code>` の外）が残っている、または原稿の `**表 T-nnn —`／`**図 F-nnn —` の表題が HTML に届いていないと `RESULT: FAIL` と印字する。 | 比べるのは表題と太字だけで、列を失った表も、段が変わった見出しも、切れた link も素通りする。⛔ 表題の照合は 01-04-requirements と 05-07-design の 2 本だけで、08-10-test と A-appendix は素の ** しか見ず、_assets の 3 本はどちらの走査にも入らない。素の ** は 1〜80 字で改行を含まない走りだけを数える。⚠️ export が今の原稿のものかも見ない —— check.sh は直前に export し直すが、人が手で走らせるときは自分で確かめること。 | `npm run render:check`／`check.sh` | — |
| 50 | `check-press-row-ids.py` | 表 T-023a の行 ID の集合と、`input-command-translator.ts` の `export type PressRow` の値の集合が食い違うか。⛔ **仕様の行が型の値である**のに、実測 2026-09-13 で `grep -rn PressRow tools/ .claude/` が **0 件**だった —— 結ぶ機械が無く、しかもこの文字列は製品の外へ出ないので**押しても分からない**。⭐ CR-371 の改名（`PD-` → `PTD-`）の**前に、緑のまま入れた** —— 後から入れると「赤にならない改名」を 1 度通してしまう。⚠️ 比べるのは**集合だけ**で、順は原稿の持ち分（試験が見る）|
| 51 | `check-pd-prefix-gone.py` | git が追う全ファイルで、`PD-` のあとに数字が続く綴り（大文字小文字を問わない）が 1 つでも在ると赤。⭐⭐ **除外を毎回刷る** —— 木 2 つ・ファイル 7 つ・行 4 つを、それぞれの理由と一緒に名指しで出す —— **黙って腐るのは数ではなく、誰も読まない除外だからである**。⚠️ 初回の走行で**検査 50 の docstring を自分で捕まえた** | 素の `PD`（数字が続かない綴り）は見ない —— 英文の散文にも立ち、門にすると正しい文で赤になる。`PTD-` と `PND-` のどちらが正しいかも見ない（検査 50 と 25 の持ち分） | `check.sh` | — |
| 52 | `check-device-route-row-ids.py` | 表 T-007（機器）・表 T-008（経路）の行 ID と、`tests/` が**値として**持つ ID（`T_008_R9` の写し取りと、実行時に原稿を読む `specTable(...).id === ...`）が食い違うか。⭐ CR（`D-` `R-` の廃止）の**前に、緑のまま入れた** —— 検査 50 と同じ理由。⚠️ 初回の走行で**書いた者の誤りを先に捕まえた**（経路の `from` は自表でなく表 T-007 の機器である） | 値だけで、コメントは見ない（検査 42/44 の持ち分）。写し取った他の欄が行の言うことと合うかも見ない（検査 37 の軸） | `check.sh` | — |
| 53 | `check-dr-prefix-gone.py` | git が追う全ファイルで、`D-` または `R-` のあとに数字が続く綴り（大文字小文字を問わない）が 1 つでも在ると赤。⭐⭐ **除外を毎回刷る** —— 木 2・ファイル 5・**文書が自分の行を番号付けている名簿 24**・行 11 を理由と共に名指す。⛔ 名簿を**規則ではなく一つずつ書く** —— 「3 件以上なら免除」にすると**次に `D-1` から振り始める文書を黙って覆う**。⚠️ 初回の走行で**試験のファイル名 25 本**を見つけた（目録の走査が大文字だけだった） | git が追っていないファイルは読まない —— `git add` の前に走らせると、足したばかりのファイルを見ずに緑になる（04 の 6）。素の `D` `R`（数字が続かない綴り）は見ない。`DEV-` `CHN-` `DFC-` `JDG-` のどれが正しいかも見ない（検査 52 と 44 の持ち分） | `check.sh` | — |
| 54 | `check-spec-holds-no-history.py` | docs/spec（output/ と __pycache__/ を除く）の `.md` `.json` `.py` で、「利用者の裁定／指示／指摘／申し立て」の直後 4 字以内に `YYYY-MM-DD` が来る綴りか、`YYYY-MM-DD` の後に「まで」が来る綴りが 1 つでも在ると赤。⭐ 0 に届いてから入れたので、基準線も除外も持たない | 日付の無い「利用者の裁定」（誰が決めるかを言う生きた規則）は見ない。日付の無い引用も、「まで」を使わない履歴（「以前は…と定めていた」）も素通りする —— それは spec-writing-rules.md の規則が持つ | `check.sh` | — |
| 55 | `check-comment-rules.py` | ⭐ **tests/ へも広げた（JDG-62）**: tests/ の .ts を同じ字句解析器と同じ形で割り、ファイルごとの「印字可能 ASCII 以外のコメント行 ＋ 形に入らない行」が comment-rules-tests-baseline.txt のそのファイルの行を超えるか（載っていないファイルは 0）、木全体のコメント密度（万分率）が基準線を超えると赤。試験に限り `// STEP:` を 1 行の形として認め、1 つの `it`／`test` の本体に 3 行を超えた行と、どの本体にも入らない行を形の外と数える。10% の上限は当てない。⭐ **わざと壊す試験**: `--self-test` が記憶の中の試験ファイルに日本語コメント 1 行（2 行増えて赤）・同じ `it` に 4 行目の STEP（1 行で赤）・`it` の外の STEP（1 行で赤）を入れ、戻すと緑になることを確かめる。`check.sh` が門の前に走らせ、壊れて赤にならなければ赤。手順と実測は docstring の BROKEN ON PURPOSE。`--file <path>` は src/ か tests/ の 1 ファイルだけを読む（実測 0.06〜0.10 秒）。src/ の側: src/ の .ts を字句解析器（文字列・`${}` を入れ子にするテンプレート・正規表現リテラル・行コメントとブロックコメント）で割り、裁定 17（docs/review/comment-rules-src.md）に照らした 4 つの数の和が comment-rules-baseline.txt を超えると赤。4 つは、①印字可能 ASCII 以外を含むコメント行、②第 3 節の形（`// see` 1 行・`// TRAP:` 2 行・`// WHY:` 2 行・`// STOP:` 3 行〔裁定 18: `@provisional PND-n` を伴い pending-decisions.md の行が `A`〜`C` か、印なしで `(PND-n)` で閉じ行が `D`〜`H` か。行が無い・分類が合わない・どちらでもない `STOP` は形の外〕・`// DEVIATION:` 2 行・`/** @purity */` 1 行・`@provisional` と `@seam` のタグ・ファイル頭 5 行〔生成領域を持ち、出どころの段落が在れば 9 行〕）に入らない行と、形の行数を超えた行、③コード 100 行以上の各ファイルで floor(コード行/9) を超えたコメント行、④木全体で同じく超えた行。 | 置き場所を見ない（`see` が定義の直上か、TRAP が壊れる行の直上か）。中身も見ない（`see` がその定義の実装する行か、TRAP が型や試験で本当に止まらないか、DEVIATION に台帳の行が在るか）。第 4 節の「書かないもの」も読まない。見出しは語だけを見るので、STOP と DEVIATION の文の型は問わない（STOP は PND の結びだけを読み、台帳の分類が正しいかは見ない）。1 行が複数の規則を破れば規則ごとに数える。tools/ は読まない。tests/ では、STEP が何を言うかも、`it(`／`test(` と綴った呼び出しが本当に試験かも見ない。「条文の文言を書かない」は ASCII に限ることでしか守らない。減っても緑のまま（ほかの基準線と同じ形）なので、締めるのはそのコミットの人である。 | `check.sh` | `comment-rules-baseline.txt`、`comment-rules-tests-baseline.txt` |
| 64 | `check-purity-honesty.py`（＋ `purity-calls.mjs`） | src/（生成ブロックを除く）で `@purity pure`／`semi-pure-a` の札を持つ関数が、① `semi-pure-b`／`non-pure` の札を持つ関数を呼ぶ（TypeScript 7 の型検査器 `typescript/unstable/sync` で import と再 export を解き、呼び先の宣言の札を読む）、② ブラウザと言語の `document`・`window`・`Date.now`・`Math.random` に触れる（`document` という名の局所変数は数えない）、③ `await`・`for await`・`async` を持つ —— そういう関数の数が purity-honesty-baseline.txt を超えると赤（`CR-573` の 5 節。表 UO の `UO-1` が単体試験を省かせる根拠は札なので、札の嘘は試験の無い関数である）。 | 引数で渡された関数の呼び出し（宣言が引数なので札が無い）、`new Date()`・`performance.now()`（裁定が名指していない）、引数の書き換え（`R7.1`）、札の無い型のメソッドの呼び出しは見ない —— 毎回 NOT COVERED と刷る。入れ子の関数が自分の札を持てば、その中身は外の関数に数えない。型検査器の API は包み自身が「unstable」と名乗るもので、形が変われば PROBLEM で赤になる。 | `check.sh` | `purity-honesty-baseline.txt` |
| 65 | `check-unit-test-or-omission.py` | src/ の export された関数（`export function`・`export const f = () =>`・`export { … }` が名指す局所の関数）のうち、表 UO の省略の行（`UO-1` の札・`UO-2` の生成ブロック・`UO-3` の枝 0・`UO-4` の網羅・`UO-8` の生成物を引き `??` 以外の枝が無いこと・札 `@unit-test-omitted UO-n`）のどれにも当たらず、tests/unit のどのファイルも import で名指さないものと、`@external-contract` を持つのに tests/unit にも tests/contract にも import が無いものの数が、unit-test-or-omission-baseline.txt を超えると赤。表 UO に無い `UO-n` を名乗る札も数える（`CR-573` の 5 節）。 | `coverage/coverage-final.json` が無いと `UO-4` を測らず、行頭が OK ではなく UNMEASURED になる（数は上限である）。その網羅を何の試験で取ったかは見ない。export されたクラスのメソッドとオブジェクトの項は読まない。import せずに上位の関数から届く試験・`vi.mock` 越しの呼び出しは見えない。単体試験がその関数について何かを確かめているかは見ない。枝の数は検査 60 の function-size.mjs の定義を TypeScript の構文木で数え直したもの。 | `check.sh` | `unit-test-or-omission-baseline.txt` |
| 66 | `check-perf-gate.py` | ① playwright.config.ts の `testIgnore` が `<旗> ? [] : <一覧>` の形でない、旗が `process.env['GRS_PERF'] === '1'` でない、tests/nfr で `performance.now(` を読むファイルが一覧に無い、一覧が在りもしないファイルを名指す。② `docs/development-records/perf-pending.md` を足した commit より後で、件名が CR を名指し、差分が規則 04 の 5 節の毎フレームの経路（表の `src/…` を毎回そこから読む）に触れた commit の CR が、`perf-pending.md` にも `measurements/performance-runs.md` にも表の行として無い —— どれか 1 つで赤（`CR-573` の 5 節・6 節、`PW-2`）。 | 時間を `performance.now` 以外（`Date.now`・フレームの数）で測るファイルは性能の試験と見なさない。`test.setTimeout` を伸ばすだけで時計を読まないファイル（nfr-004）は NOTE で刷るだけで門にしない。件名に CR の無い commit は門にしない。表に無い経路の変更は見えない。`--since <sha>` で起点を替えられる（壊して確かめた手）。 | `check.sh` | —（0 で持つ） |
| 67 | `merge_driver.py`（--check） | .gitattributes がパスごとに名指す 2 つの合流ドライバ（`grs-generated`／`grs-ledger`）が git config に入っているかを赤にする —— 入っていないパスは、何も言わずに素の text 合流へ落ちる。⭐ 壊して確かめた実測: `defects.md` に `merge=grs-ledgr` と誤記すると 2 件、`tbl-row-id-prefixes.md` の行を改名しても 2 件を報告した。 | 見えないのは、両方の枝が同じ新しい ID を取った衝突だけである —— それは検査 68（`renumber_ids.py`）の持ち分。ドライバ自身は生成物を作り直さない（作り直すと、git がまだ書き終えていない作業木を読むことになる）ので、直した後の再生成は検査 24 と 27 に任せる。 | `check.sh` | — |
| 68 | `renumber_ids.py`（--check） | 追跡ファイルが暫定 ID（本物の接頭辞＋9 から始まる 5 桁、例 `DFC-9NNNN`）を 1 つでも持てば赤。⭐ 壊して確かめた実測: 足した台帳ファイルに `DFC-9NNNN` の行を 1 つ置くと 1 件を報告した。 | 1 つの接頭辞で書いた範囲（`JDG-600..609` の形）は直さず、場所を刷るだけで赤にしない。`dist/` とバイナリファイル、そして自分自身（docstring の例が暫定番号を持つ）は読まない。 | `check.sh` | — |
| 69 | `check-literal-restatement.py` | `src/` のモジュールの頂に手で書いた値の集合が、生成された集合を言い直していること（Jaccard 0.7 以上・共通 3 以上）が `literal-restatement-baseline.txt` を超えると赤。`Record` や写像型が生成の和で守るものは外す。⭐ `CR-581`。実測 2026-09-26（`0ad572f6`）: 手書き集合 181 対生成集合 869、J≥0.7 が 35（19 件 held：言い直し 14・偶然 5、16 件は機械的に除外〔`Record`／写像型 14、型の構築 2〕）。壊して確かめた実測: `LINE_WEIGHTS = ['thin','medium','thick']` を植えると新規 1、`NoticeReason` を別ファイルへ移しても緑のまま、`ShapeKind` をその集合と切り離さずに残すと払った債務を報告した。 | 関数の中の集合、複数ファイルに散った 1 語ずつの語彙、言い換えた集合は見ない。 | `check.sh` | `literal-restatement-baseline.txt` |
| 70 | `check-twin-comments.py` | 「写しである」と述べる新しいコメントと、登録が残っているのにその主張のコメントが消えたことを赤にする（鍵は宣言の名と主張の頭 10 語）。⭐ `CR-581`。実測 2026-09-26（`0ad572f6`）: 50 件の主張が held（コピー 36・表の手書き写し 2・結合 12）、うち 5 件は写し先が移ったか消えていた。検査 55（`check-comment-rules.py`）の字句解析器を読み込む。 | 誰もコメントしなかった写しは見ない。 | `check.sh` | `twin-comments-baseline.txt` |
| 72 | `check-handoff-holds-state.py` | `docs/development-records/handoff.md` の中で、最新の日付節（`> 🆕` で始まる区切り）より外にある学びの行（『**学び**』『学び:』『学び：』を持つ行）と、『規則へ下ろす』『規則へまだ下りていない』『下ろす前の控え』を述べる見出しを赤にする。実測 2026-09-26（`0ad572f6`）: 15 件（学び行 8・見出し 7、最古は 2026-09-14、当時 1,087 行の handoff）。`--self-test` は記憶の中の handoff に古い節の学びと待ちの見出しを 1 つずつ残し、両方を報告し、それらを外した handoff は緑になることを確かめる。 | 通した文が本当に状態であって語の無い規則でないかは見ない。学びが正しく下ろされたか、それとも単に消されただけかは見ない。handoff.md 以外のファイルは読まない。 | `check.sh` | — |
| 73 | `check-rules-name-real-things.py` | `docs/development-rules/` 直下の各 .md（08 フォルダは検査 0 と同じく対象外）で、バッククォート付きの相対パスが実在のファイル/フォルダに当たらない、`npm run <script>` の script が package.json に無い、「検査 N」の N が check.sh の節番号でない、のいずれかを赤にする。『⚠️ 実測（YYYY-MM-DD）』を持つ行は履歴の記録として飛ばす。⚠️ 実測（2026-09-26、`0ad572f6`）: 3 ファイルに 5 個の名指しが、当時、実在しない先を指していた（README.md と 07 が検査 0 の仕事を存在しない番号に帰していた、規則 03 と 07 がそれぞれ実在しないファイル名を名指していた——いずれも同じコミットで直した）。`--self-test` は死んだパス・死んだ npm script・死んだ検査番号を 1 つずつ持つ規則を与え、3 つとも報告しなければ赤。 | 名指した物が今も規則の言う通りに動くかは見ない。git が無視するツリーの中の綴り違いは実在すると数える。ワイルドカードや `<name>` を含むパス、バッククォートの無い名、裸の拡張子（`.html`）、08 フォルダは見ない。 | `check.sh` | — |
| — | `check.mjs` | サンプル(previous-project-result/11-row-controls/row-controls-sample.html)と dist/index.html の両方に同じ 75 手を打ち、1 手ごとに rows / counts / arming / pinned の 4 読みを比べて、KNOWN_DIVERGENCES(仕様が勝つ差)にも KNOWN_DEFECTS(開いている不具合)にも載っていない食い違い、押せなかった手、盤が組み上がらないこと、名前が省略されたまま比べられないこと、そして『もう落ちなくなった KNOWN_DEFECTS の行』を赤にする。 | 問えるのは行操作の 4 読みだけで、サンプルが持たないもの —— タスクバー、スケジュール画布、透かし —— は原理的に比べられず、S-127(pinnedRowMax=5)のピン上限も『読み単位でしか効かない除外では表せない』として意図的に問わない(最大 4 本まで)。さらに比べる相手は `file://` で開いた dist/index.html なので、ビルドし直していなければ古い成果物を測る。 | `npm run parity` | — |

---

## 5. 生成器 —— 書き出す道具（27 本）

⭐ **生成器の `--check` は、書き出し先を作り直して比べるだけである。**
⛔ **入力の表が間違っていても緑になる。** 表そのものを見るのは門の側の仕事である。

| 検査 | 道具 | 何を読んで何を書くか | ⛔ 何が見えないか | 呼ぶ人 |
|---|---|---|---|---|
| 16 | `erd_json_to_md.py` | docs/spec/_source/erd.json（entities/relations/derived/container/printed、erd.schema.jsonで検証）を読み、docs/spec/_assets/fig-erd-overview.md（図F-010）とfig-erd-detail.md（図F-011＋表T-056〜T-059）を書く。--checkは両ファイルの中身をビルド結果と比較する。 | container図がすべてのentityを一度だけ配置していること等の構造チェックはするが、mermaidが実際にどう描画されるか（視覚的なレイアウトの妥当性）そのものは見ておらず、文字数がmaxTextSize（50000）を超えないかだけを機械的に見ている。 | `npm run gen:md`／`check.sh` |
| 16 | `settings_json_to_md.py` | docs/spec/_source/settings.json（各テーブルブロックとweekdaysロスター、settings.schema.jsonで検証）を読み、docs/spec/_assets/tbl-settings.mdを書く。type_stated_twice()でerd.jsonと型が重複定義されている行の食い違いも検出する。--checkはディスク上のファイルとビルド結果を比較する。 | type_stated_twiceはsettings.jsonの行とerd.jsonの列で『キー名』が完全一致するものだけを突き合わせるため、同じ値を指す2つの列が違う名前で書かれていた場合は食い違いを検出できない。 | `npm run gen:settings`／`check.sh` |
| 17 | `erd_json_to_schema.py` | docs/spec/_source/erd.json（schedule群）とdocs/spec/_assets/tbl-settings.md（documentSettings群、印字済みの表として）を読み、docs/spec/_source/grs-document.schema.jsonを書く。--checkはディスク上のファイルとビルド結果を比較する。 | 型が読み取れない設定キーやスペルの分からないenumは『open』としてstringに緩めて素通りさせるだけで、それが未解決のまま溜まっていても--check自体はPROBLEMとして扱わず、件数は--reportでしか見えない。 | `npm run gen:schema`／`check.sh` |
| 18 | `generate_unit_tree.py` | docs/spec/05-07-design.mdの表T-062（component→layer）・表T-075（unit→component・ファイル名・purity）・表T-064（公開名）・表T-065（境界interface）を読み、Chapter 5.3の規則に従ったパスにsrc/以下の空のユニットファイルを作る（未作成のものだけ）。--checkはsrc/内の.tsファイルパス集合とテーブルが要求するパス集合を比較する。 | 既にあるファイルは絶対に上書きしないため、中身が空のまま長期間放置されていても、あるいは中身がテーブルの意図と食い違っていても検出できない。パスの集合だけを比較し、中身は一切比べない（ドキュメント冒頭にも明記）。 | `npm run tree`／`check.sh` |
| 20 | `generate_entity_types.py` | docs/spec/_source/erd.json（entities/columns）、docs/spec/_source/grs-document.schema.json（documentSettings）、docs/spec/_source/settings.jsonを読み、TARGETSが列挙する複数のsrc/配下ファイル（schedule-entities.ts、document-settings.ts、document-stamp関連、frame-loop.ts、properties-panel.ts、edit-annotation.tsなど）の<generated>〜</generated>マーカー間だけを書き換える。--checkはTARGETS全部についてマーカー間の中身をビルド結果と比較する。 | マーカーの外側（人が書いた実装コード）は一切見ない設計なので、生成された型と実際にそれを使うロジックが整合しているか（コンパイルが通るか）はこのスクリプト自身では確認せず、別途npm run typecheckが要る。 | `npm run types`／`check.sh` |
| 27 | `generate_display_words.py` | docs/spec/_assets/tbl-glossary.mdの表T-109・T-103、docs/spec/01-04-requirements.mdの表T-037・T-023・T-023a〜d・T-036・T-024・T-233・T-234、docs/spec/_assets/tbl-property-items.mdの表T-016から必要な行IDのロスターを毎回組み立て、docs/spec/_source/display-words.jsonの実際のエントリと突き合わせて食い違えば書かずに止め、一致すればsrc/adapter/screen-renderer/display-words.jsonへ書き出す。--checkはこの出力ファイルの中身をビルド結果とバイト比較する。 | word_problems()はja/enの各エントリが文字列であることしか見ず、その語が実際に正しい訳語か・意味の通る語かは一切検査しない。空でも通る設計だが、誤訳や無関係な語を書いても型検査だけで通過する。 | `npm run words`／`check.sh` |
| 27 | `generate_exchange_formats.py` | docs/spec/01-04-requirements.mdの表T-024の全行を読み、書出方向を持つ行をsrc/adapter/document-codec/exchange-formats.jsonへ、そのうち拡張子を持つ行（ファイルとして出るもの）をsrc/adapter/screen-renderer/export-formats.jsonへ書き出す。--checkは両ファイルの中身をビルド結果と比較する。 | 行IDと拡張子・先頭文字を運ぶだけで、document-codec.ts側が実際にその行IDと正しい判定ロジック（ImportFormat/SaveFileForm）を結びつけているかまでは検査しない。 | `npm run formats`／`check.sh` |
| 27 | `generate_help_roster.py` | docs/spec/01-04-requirements.mdの表T-023a・T-023b・T-023c・T-023d・T-023・T-036と、既存のsrc/adapter/screen-renderer/icon-roster.json（表T-109由来）を読み、行ID・キー割当・アイコン・駆動先入口をsrc/adapter/screen-renderer/help-roster.jsonへ書き出す。--checkはそのファイルの中身をビルド結果と比較する。 | 印字される語そのもの（display-words.jsonの内容）はここでは一切運ばれず突き合わせもされないため、ヘルプ画面が実際にこの行IDを正しい語へ解決できているかはこのスクリプトの検査範囲外。 | `npm run helproster`／`check.sh` |
| 27 | `generate_icon_glyphs.py` | docs/spec/_assets/fig-icons.svg（図F-019）の各<g>要素と、docs/spec/_assets/tbl-glossary.mdの表T-109の行数を読み、パスやスタイルをcurrentColorへ正規化した図形と共有座標系をsrc/adapter/screen-renderer/icon-glyphs.jsonへ書き出す。--checkはディスク上のファイルとビルド結果をバイト比較する。 | 座標抽出とバウンディングボックス計算が正しく動いた結果を書き出すだけで、図形が実際に意図した見た目（絵柄）になっているかどうかは目視でしか分からず、このスクリプト自身は判定しない。 | `npm run glyphs`／`check.sh` |
| 27 | `generate_icon_roster.py` | docs/spec/_assets/tbl-glossary.mdの表T-109（アイコン）・表T-103（面）、docs/spec/01-04-requirements.mdの表T-012（形）、docs/spec/_source/erd.jsonのTaskVisual列挙値を読み、行ごとのsurfaces/group/entryTo/authority/arms/armsShapeをsrc/adapter/screen-renderer/icon-roster.jsonへ書き出す。--checkはディスク上のファイルと比較する。 | armsShapeの対応付け（AR-3の8個の刻印とmilestoneGlyphの8個の綴り）は印字順が同じであることだけを頼りに結び付けており、順序が意味的に正しく対応しているかどうかまでは検証できない。 | `npm run icons`／`check.sh` |
| 27 | `generate_json_schema_validator.py` | docs/spec/_source/grs-document.schema.jsonを読み、EXPRESSEDに列挙された10種のJSON Schemaキーワードだけをsrc/adapter/document-codec/grs-json-schema.tsの<generated>〜</generated>マーカー間にTypeScriptのSchemaNode/GRS_DOCUMENT_SCHEMAとして書き出す。--checkはそのリージョンの中身をビルド結果と比較する。 | format:'uuid'を持つ10列はDROPPEDとして意図的に無検査のまま残り、UNCHECKEDとして毎回一覧表示されるだけで、--check自体はこれを合否判定に含めない（PND-189は未裁定のまま）。 | `npm run validator`／`check.sh` |
| 27 | `generate_licence.py` | リポジトリ直下のLICENSE・NOTICE・package.jsonを読み、ライセンス全文・NOTICEのCopyright行・（dependenciesが空である限り）空のattributionsをsrc/adapter/screen-renderer/licence.jsonへ書き出す。--checkはディスク上のファイルと比較する。 | package.jsonのdependenciesが空であることしか調べておらず、devDependencies由来のコードが実際にdist/index.htmlへ紛れ込んでいないかはビルド成果物（dist）を見て検証していない。 | `npm run licence`／`check.sh` |
| 27 | `generate_mspdi_custom_fields.py` | docs/spec/_source/mspdi-custom-fields.json（同フォルダのmspdi-custom-fields.schema.jsonでjsonschema検証）と、docs/spec/_assets/fig-erd-detail.md中の表T-058のfadeInDays/fadeOutDays列を読み、2つのMSPDIカスタムフィールド枠をsrc/adapter/document-codec/mspdi-custom-fields.jsonへ書き出す。--checkはディスク上のファイルと比較する。 | fig-erd-detail.mdはerd.jsonから生成された副産物であり、このスクリプト自身はerd.jsonを直接読まないため、fig-erd-detail.mdがerd.jsonからdriftしていた場合はそのdriftをそのまま読み込んでしまう（コード中のコメントも「二つが食い違えばcheck 16が先に言う」と認めている）。 | `npm run mspdi`／`check.sh` |
| 27 | `generate_mspdi_child_order.py` | docs/reference/mspdi/pj15/mspdi_pj15.xsd を読み、要素の道筋ごとの子の名と順と xsd:all の印を、docs/reference/mspdi/pj12/mspdi_pj12.xsd に無い子の印（pj15Only）とともに src/adapter/document-codec/mspdi-child-order.json へ書き出す（表 T-033 の EX-10、CN-7 の例外）。元の 2 つの XSD の SHA-256 と、自分の中身の SHA-256（bodySha256、JDG-251）を頭に書く。pj12 の順が pj15 の順の部分列でない・要素が消えた・xsd:all が片方だけ・同じ名の子が 2 つ宣言された、のどれかで止まる。--check は XSD の有無によらず bodySha256 を計り直し、XSD が在ればそのうえで作り直して全体を比べ、2 つの SHA-256 を今の複製に照らす。 | XSD は git 管理外なので、作業木と CI では表が XSD に合っているかを見られない（SKIPPED と言う）。bodySha256 まで書き直した手の改変は、XSD の無い木では通る。SHA-256 を付録 A.1 の値とは照らさない（複製が A.1 と違えば、違う複製から作った表が緑になる）。型・出現回数・列挙値は読まない。 | `npm run mspdi:order`／`check.sh` |
| 27 | `generate_property_items.py` | docs/spec/_source/property-items.jsonを読み、各項目のrowId・columns・inputKinds・isReadOnly・appliesTo（既定はTask）をsrc/adapter/screen-renderer/property-items.jsonへ書き出す。--checkはディスク上のファイルと比較する。 | 表示名（display-words.json由来）・候補値・上下限・日付列などはここでは一切運ばれず突き合わせもされないため、property-items.json自体の値がgrs-document.schema.jsonやDATE_COLUMNSと矛盾していてもこのスクリプトは検出しない。 | `npm run propitems`／`check.sh` |
| 27 | `generate_startup_template.py` | PHASES等の内蔵定数、src/entity/document-model配下から読むsettings既定値・カレンダー既定値、docs/spec/_source/settings.json（S-73のthemeHue）、docs/spec/_source/grs-document.schema.jsonを読み、多数のcheck_*関数（check_invariants/check_neutrality/check_schema等）で検証した3年分のサンプルGRS JSON文書をsrc/framework/single-html-shell/startup-template.jsonへ書き出す。--checkはディスク上のファイルとビルド結果をバイト比較する。 | check_neutralityは『生成器自身が書いたと自覚している語彙』に含まれるかどうかしか照合しない禁止語リストではなく既知語リストとの照合なので、その語彙表自体に業界特有語や不適切な単語が紛れ込んでいても、登録さえされていれば通ってしまう。 | `npm run startup`／`check.sh` |
| 27 | `property_items_json_to_md.py` | docs/spec/_source/property-items.jsonを読み、docs/spec/_assets/tbl-property-items.md（表T-016）を書く。--checkはディスク上のファイルとビルド結果を比較する。 | 各行のnote/mspdiセルの文分割（broken関数）は『。』の位置で機械的に改行するだけで、意味的に正しい文分割になっているか、日本語として自然かは一切検査しない。 | `npm run gen:items`／`check.sh` |
| 27 | `verification_json_to_md.py` | docs/spec/_source/verification.json（同フォルダの verification.schema.json で jsonschema 検証）を読み、docs/spec/_assets/tbl-verification.md（表 T-334 と表 T-218）を書く。表 T-218 の「確かめるもの」の欄は、表 T-334 の各行の verifiedBy から毎回引く。表 T-218 に無い TS を名指す T-334 の行と、2 度書かれた行 ID を拒んで何も書かない。--check はディスク上のファイルとビルド結果を比較する。 | 表の中身が正しいか（`VT-1` の全数が本当に Chapter 3.2 の UC のすべてか、`TS-*` の置き場が実在するフォルダか）は見ない —— 見るのは 2 つの表が互いを指せることだけである。jsonschema が入っていない機では形の検証を飛ばす（NOTE を出す）。 | `npm run gen`／`gen:check`／`check.sh` の 27 |
| 27 | `row_id_prefixes_json_to_md.py` | docs/spec/_source/row-id-prefixes.json（接頭辞の意味）を読み、docs/spec・docs/development-records・docs/development-rules の 3 つの木で表の行の最初のセルとその表題を毎回歩いて、接頭辞ごとの定義場所と行数を組み合わせ、docs/spec/_assets/tbl-row-id-prefixes.md を書く。登録の無い接頭辞・どの木も使わない登録・届け出の無い衝突・写しと称しながら持ち主の定義しない ID を持つ接頭辞は、どれも exit 1。--check は書き出し先を作り直して比べる。 | docs/spec/output/ は歩かない。行 ID と認めるのは表の行の最初のセルだけなので、散文や表の途中のセルで名乗られた ID は数えない。接頭辞の意味が正しいかは読まない —— JSON の `means` をそのまま刷る。⛔ 台帳（docs/development-records）に `JDG` などの行を足すと検査 27 が赤くなるので、同じ変更でこれを走らせ直せ。⚠️ 実測（2026-09-14）: 体はその赤を「前からあるずれ」と誤診した。⚠️ `--help` を無視して生成物を書き直す。 | `npm run gen:prefixes`／`npm run gen:check`／`check.sh` |
| 27 | `generate_comment_rules_card.py` | docs/review/comment-rules-src.md（裁定 17・18 と JDG-62 の `STEP`）を読み、体への指示に貼る 30 行以下の規則カード docs/review/comment-rules-card.md を書く（JDG-59）。前書きは ⛔ の行だけ、各節は表の外の行をすべて、4 列以上の表は 1 行 1 行、それより狭い表は 1 行に繋ぐ。30 行を超えると書かずに exit 1。--check は作り直して比べる。 | 語は照合せず形だけで縮めるので、カードが原典と同じ意味を保つかは見ない。前書きの ⛔ でない散文と、繋いだ表の列見出しは落ちる。カードだけで書けるかは誰も確かめない。 | `npm run gen:card`／`npm run gen:check`／`check.sh` |
| 27 | `build.py` | docs/spec/_source/components.json を読み、辺をラベル付きのクラスタへ畳んで overview.json と docs/review/components/components.md（外部の drawio-uml スキルの table.py で）を書き、Graphviz と draw.io で fig-components と 4 つの view-* の図（.drawio と .svg）を書く。`--no-figures` は図を飛ばす。`--check` は overview.json と、table.py が在れば components.md を作り直して比べ、食い違えば exit 1。 | `--check` は図（.drawio 5 本と .svg 5 本）を作り直さないので、古い図は緑のまま通る —— 実行のたびに NOT CHECKED と刷る。components.md は利用者の環境に在る table.py が作るので、それが無い計算機では NOT CHECKED になり比べない。 | `npm run gen:components`／`npm run gen:components:check`／`check.sh` |
| 27 | `state_machines_json_to_md.py` | docs/spec/_source/state-machines.json（未保存の状態機械、表 T-250・ADR-002）を読み、先頭の表 T-283（`priorities` が与える領域順、SD-4）に続けて、領域ごとの事象定義・ルートの既定値・機械ごとの状態図/状態遷移表/状態一覧を docs/spec/_assets/tbl-state-machines.md へ書く。`--check` はディスク上のファイルとビルド結果を比較する。 | 原稿の唯一の読み手でもある —— `generate_state_machine_types.py` はここの `load()` を import するので 2 つの生成物は同じ検証済みモデルから刷られ食い違いようがないが、その外で原稿の意味を確かめるものは無い。 | `npm run machines`／`npm run machines:check`／`check.sh` |
| 27 | `generate_state_machine_types.py` | docs/spec/_source/state-machines.json を（`state_machines_json_to_md.py` の `load()` 経由で）読み、領域ごとに名指された src/ 配下のユニットの `<generated>`〜`</generated>` マーカー間へ、キー・状態の判別共用体・ルート型・事象型などを書く。`--check` は対象ユニット全部でマーカー間の中身をビルド結果と比較する。 | マーカーの外側（人が書いた実装）は一切見ないので、生成した型を実装が正しく使っているか（コンパイルが通るか）は別途 `npm run typecheck` が要る。 | `npm run machines:types`／`npm run machines:types:check`／`check.sh` |
| 27 | `published_entries_json_to_md.py`（`docs/spec/_source`） | `_source/published-entries.json` から表 T-064 を `_assets/tbl-published-entries.md` へ刷る。原稿の破れ（行・コンポーネントの二重、名の二重、全角の括弧で始まらない注記、名に読める散文の片）は 1 バイトも書かずに拒む。`--check` は刷った表の手の編集を赤にする。 | 名が入口から本当に出ているか（検査 26b が見る）。 | `npm run gen:entries`／`npm run gen:entries:check`／`check.sh` |
| 27 | `generate_public_entry_index.py`（`tools`） | `src/` と原稿から `docs/review/public-entry-index.md` を刷る。入口が出す名（表 T-064 の行か `--`）と、ファイルは出すが入口が出さない名（`file only`）を、`ファイル#名前` と目的か宣言の頭で並べる。 | 非公開の関数。言い換えた名。 | `npm run gen:index`／`npm run gen:index:check`／`check.sh` |
| 71 | `generate_test_inventory.py` | 試験ファイル 1 つにつき 1 行、置き場（表 T-218）・名指す仕様の行/UC/表・表 T-334 の行・既知の赤（`tests/known-red.txt`）・赤で固定した印（`it.fails`／`test.fail`／`specMismatch`）とその台帳の行・MSPDI の XSD が要るかを `docs/development-records/test-inventory.md` へ書く。`--check` は書き出し先を作り直して比べる。⭐ 詳しくは第 12 節。 | ID を読むのはコメント・`describe`／`test`／`it`／`step` の題・`specTable(...)` の表の 3 か所だけで、コードの中の ID（`press(page, 'IC-93')`）は押すものとして読まない。`it.each` が走らせてから作る題は文字どおりにしか読めず、単体試験の相手は import だけで読むので `vi.mock` 越しの呼び出しは見えない。 | `npm run gen:tests`／`npm run gen:tests:check`／`check.sh`（71） |
| — | `grab-figures.mjs` | CR-430 4.4 節が言う 6 図を previous-project-result/16-grab-area-sizing/grab-area-sizing-sample.html から描き、docs/spec/_assets/ へ単体の SVG として書く。描く前に settings.json の該当行がサンプルの既定値と一致するかを確かめ、1 つでも違う（または行が無い）と何も書かずに拒む。 | `--check` を持たないので、書いた後に原稿とずれても検査は気づかない（第 9 節と同種の欠け）。playwright を repo 直下の node_modules から解決するので、リポジトリの外では動かない。 | 人が手で（`node tools/probe/grab-figures.mjs`） |

---

## 6. 修理 —— 書き換える道具（4 本）

⛔ **直す道具には oracle が要る。** 何を直したかを、直した本人以外の何かが確かめること。
⚠️ **oracle が 1 本しか無い道具は、その 1 本が見ていない場所を壊す。**

| 道具 | 何を書き換えるか | ⛔ 何が見えないか（oracle を含む） | 呼ぶ人 |
|---|---|---|---|
| `ledger_metrics.py` | docs/development-records/defects.md の `<!-- ledger-metrics: begin/end -->` に挟まれた件数ブロックを刷り直す —— defects.md と fixed-defects.md 両方の `\| D-` 行を合算し、8 状態の梯子表・5 束表・残件/総件数・セッション開始時との差分・『道具・試験の借り』を書き換える(`--start` は基準行を取り、`--check` は刷らずに数の不一致だけを赤にする)。 | oracle は台帳の表そのもの —— ステータス欄の文字列を数え直すだけで、その行の主張が本当かは一切見ない。`\| D-` で始まらない行は存在しない扱い、セル数が 11 でない行に当たると数える前に SystemExit、『道具・試験の借り』は行の散文にある `tools/` / `tests/` / `src/` らしき語を拾う目安であって実際の依存ではなく、`--check` は時刻を比べないので刻印が古いままでも緑になる。 | `check.sh`／人が手で |
| `fix_line_breaks.py` | docs/spec の 5 冊を、原稿自身の soft wrap を段落ごとに 1 行へ繋ぎ直したうえで文末の `。` で割る —— 表の行なら `<br>`、それ以外は末尾 2 スペース —— ただし 「…」 の中の `。`、行末や閉じ `**` の直前の `。`、表の直下の行、`--protect` が名指す src/tests の逐語は割らない。 | oracle は check 42(check-quoted-source.py)だけ —— 割って壊れた逐語を check 42 に訊き、壊した行を諦め、baseline に戻るまで最大 12 周するが、試験が実行時に読み返す原稿は check 42 の管轄外なので見えず、直した当の check 46(check-line-breaks.py)すら走らせない —— だから走らせたあと `npx vitest run`(と `npm run linebreaks:check`)が要る。 | `npm run linebreaks` |
| `follow_the_manuscript.py` | tests/ の .ts / .tsx にある日本語入りの文字列リテラルのうち、どの原稿にも現れなくなったものを、`**` を外した本文で 8 冊の原稿を引き直し、ちょうど 1 箇所に当たったときだけ現在の原稿の字面へ読み戻して書き換える —— まだ見つかるもの、0 箇所または 2 箇所以上に当たるもの、置換後に引用符 / 改行 / バックスラッシュを含むものには触れず赤のまま残す。 | oracle は『その文字列が原稿のどこかに在るか』という存在判定だけで、書き戻した逐語がその試験の主張として正しいかは誰も見ない —— 原稿 8 冊は import 時に一度読んで固定され、`LITERAL` はバッククォートを跨ぐので先行するバッククォートで走査がずれたファイルを黙って飛ばし、src/ のコメントは対象外(TREES=('tests',))。だから後で `npx vitest run`。 | `npm run follow` |
| `sweep_strictdoc_output.py` | docs/spec/output/(StrictDoc ランチャの生成木。2026-09-11 実測で 790 MB / 2,050 ファイル)を rmtree で丸ごと消す —— ただし 127.0.0.1 の 5111..5131 のどれかが繋がるか、コマンドラインに `strictdoc` を含むプロセス(自分と自分の祖先は除外)が居れば、何も消さずに拒んで exit 0 する。 | oracle は『21 本のポートと OS のプロセス一覧』だけで、削除してよい根拠である『この repo の誰もこの木を読んでいない』は 一度の実測を引き写した前提であって毎回は測り直さない —— プロセス一覧が読めなければポート走査だけで進み、再生成を止める server.config.json は repo の外なので触れず、消してもランチャを開けば同じ木が戻る。 | `npm run sweep`／`check.sh`／SessionStart hook |

---

## 7. 調査 —— 人が読む道具（21 本）

⭐ **門にしないことが決まっている道具が 2 本ある。**
`list-asserted-claims.py` は 30 件の標本で 19 件が本物（精度 63%）、
`list-lying-edges.py` は 8 件のうち 3 件（37.5%）——
⛔ **3 回に 1 回は何も無いのに巡を止める門になる。**

| 道具 | 何を人に見せるか | ⛔ 何が見えないか | 呼ぶ人 |
|---|---|---|---|
| `collect_stats.py` | docs/development-records/measurements/stats.jsonl に 1 日 1 sha あたり 1 行を積み、src/ と tests/ の行数内訳(空行・コメント・実行行)と 1 ファイル行数の中央値/平均/最大、`it(` / `test(` の出現数、docs/spec(output/ を除く)の .md 数・文字数・行数、3 台帳の行数、`*-baseline.txt` の 1 行目を人に見せる。 | どの比率も目標も持たない(数がどちらへ動くべきかを言わない)、コメント判定は『行頭が // か * か /*』の 1 行規則なので継続行や文字列内の // を取り違えるがそれを直さない(系列を保つため)、`it(` は `wait(` / `submit(` も数える部分文字列カウント、vitest / playwright / check.sh を走らせないので gate の所要時間は原理的に入らず、例外は全部飲んで exit 0 なので失敗した日は静かに行が増えないだけになる。 | `npm run stats`／SessionStart hook |
| `graph.py` | --cycles で仕様全体の強連結成分（DAG でないこと）を、--depth で種から何ホップ先に何対象が影響を受けるかを人に見せる。 | --units は関数 units() として在るだけで main() の分岐に無く、CLI からは呼べない（SKILL.md は機能として挙げる）。辺は 1 行の中に同時に現れた既知トークンだけで張るので、行をまたぐ参照は辺にならず、idx.known に無い図 F-nnn は端点にすらならない。 | ほかの道具が import／人が手で |
| `harness.mjs` | live probe が毎回書き直していた 30 行を 1 か所に集めて人に渡す —— Chromium を 1 度だけ起こして dist/index.html を開き最初の 1 フレームを待つ open()、本物のポインタで押す press / hold / doublePressAt、条件が真になるまで待つ until、そして census / roles / rows / rowBands / shapes / cursorAt / partAt / styleSignature / treeOrder / ancestry / sweep といった読み。各関数の docstring が『この読み方で誤った回』を名指しで持つ。 | 何一つ判定しない —— 期待値も baseline も持たず、読みを生やすだけなので、probe が誤った問いを立てれば静かに誤った数を返す。測る相手は `file://` で開いた dist/index.html に固定されており、`npm run build` をしていなければ古い成果物を、dev サーバの木は決して測らない。 | ほかの道具が import |
| `impact.py` | 表番号・行 ID・UID を 1 つ与えると、それを指している要求の一覧と、その要求を指す 2 次の要求と、CLUSTERS の 6 塊のどれに属するかを Markdown で人に見せる。 | 塊は CLUSTERS に手で書いた 6 組が全部で、表を足しても自動では入らない。参照は docs/spec と docs/spec/_assets の 2 階層の .md の 1 行に閉じた文字列一致だけなので、src/ や tests/ や change-request/ からの参照も、行をまたぐ参照も、図 F-nnn も 1 件も数えない。 | 人が手で |
| `induced.py` | これから触る対象を全部並べると、その誘導部分グラフの中の閉路（＝1 つの計画・1 パスで書かねばならない組）を人に見せる。 | 辺は graph.build_graph が張るので、種が specindex.known（行 ID・UID・表番号・RETIRED）に無ければ live から落ちて黙って無視され、図 F-nnn も src/ の識別子も台帳の D-nnn も種にすらならない。閉路の有無は scratch/spec-check/sd-out/json/index.json の Parent 関係に依るので、その export が古ければ古いグラフの閉路を何も言わずに答える。 | 人が手で |
| `list-asserted-claims.py` | src/ と tests/ の .ts/.tsx/.js/.mjs のコメントのうち、現在形で言い切っていて、しかも退役済みまたは未定義の仕様 ID を名指している文を（既定 40 件まで）人に見せる。 | ⭐ **丸ごと捨てる接頭辞は 0 である** —— 台帳の ID は仕様書と別の接頭辞を持つので、「仕様書が定義しない接頭辞」の経路で落ちる。宙に浮いた仕様の行 ID は**見えるようになった。**記録か主張かの判定は 1 文の中の正規表現だけで、日付が前の文にあると記録だと気づけず、逆に日付さえ在れば嘘でも記録として黙る。走査は src/ と tests/ だけで、docs/ のコメントも .py も 1 行も読まない。 | `npm run guard:cleanup` |
| `list-inverted-authority.py` | docs/spec の 1 文が、原稿の他の場所に 1 度も出てこない src/ の識別子に権威を委ねている箇所（「`groupDepthThresholdOf` の注が自ら禁じている」の形）を挙げる。 | 委譲の動詞の手前 60 文字にバッククォート付きの識別子が要るので、行をまたぐ委譲も、動詞が識別子より先に来る文も、6 文字未満の識別子も全部落ちる。識別子が原稿の他行に 1 回でも出れば無条件に除外するので、ERD や設定値表が定める名に権威を委ねた逆転は原理的に見えない。 | `npm run guard:cleanup` |
| `list-lying-edges.py` | 「…」で引いて「と定めている」と現在形で言い、その文が名指した席（行 ID・表・UID）の本文には入っていない引用を挙げる（検査 42 が構造上通してしまう形）。 | 引用の直前 60 文字に席が綴られていないと拾わず、SAYS は現在形 9 語の閉じた一覧なので「〜としている」「〜が示す」は落ちる。席の本文は specindex が知る範囲＝docs/spec と _assets の 2 階層だけで、src/ や台帳を名指した引用は席が None になって黙って飛ばされる。引用の前 120 文字に D- / CR- / PND- / 台帳 等が在るとその 1 件を丸ごと除外する。 | `npm run guard:cleanup` |
| `list-prose-tallies.py` | 散文が自分で数を抱えている完全性の主張（「拡張領域を使う 2 つはこれだけである」）を挙げ、表を名指しているものは specindex の行数と突き合わせて一致するかを併記する。 | 完全性の語は「全数／これだけである／これで全部／他に無い／他にない／以外に無い／以外にない」の閉じた一覧で、言い換えた完全性の主張は 1 件も出ない。走査の単位は 。｜改行 で切った断片なので、数と主張が別の文に分かれていると「数を持っていない」と判定する。「本表／同表／本節／同節」を含むと表との突き合わせを自分で止める（数だけ出して比べない）。 | `npm run guard:cleanup` |
| `list-withdrawn-cited.py` | 撤回記録（「X」と定めていた）から撤回済みの文を収穫し、それを docs/spec・src/・tests/ のどこかが履歴の印なしに引いている箇所を挙げる。⚠️ **CR-375 で仕様書から撤回記録が消えたので、いまは 0 件を返す。**撤回記録が仕様書へ戻ったときにだけ意味を持つ。 | 収穫元は docs/spec だけである。change-request/ や docs/development-records/ では「…と定めていた」が「既にそう定まっていた」の意味でも使われるので、そこへ向けても撤回と確認を区別できない。言い換えて撤回された規則は、原理的に見えない。 | `npm run guard:cleanup` |
| `sample-and-app.mjs` | サンプル HTML と dist/index.html を 1400x2000 の Playwright ページで開き、両側に同じ形の読み(rows / counts / faint / pinned)と押し(pressRow / pressHead)を生やして人と check.mjs に渡す —— 併せてサンプルの act と表 T-109 の入口の対応表 SAME_ENTRANCE、サンプルの木 SAMPLE_TREE、FR-085 で切られた名前を FR-052 のドラッグで広げて全文にする showWholeNames を持つ。 | 両側の DOM の約束(サンプルの `.row` / `.nm` / `.cnt` / `.pinnedTop` と GRS の `data-depth` / `data-icon` / `data-pinned` / `data-truncated` / `data-role`)を直に綴っているので、どちらかのマークアップが変われば例外ではなく空配列を返し、盤が一致しないという別の顔で出る。読むのは常に `file://` の dist/index.html で、dev サーバの木は測れない。 | `npm run parity`／ほかの道具が import |
| `cycle15.mjs` | 図形の入口 15 個（`IC-27`〜`IC-34`、`IC-83`〜`IC-89`）を順に押し、画布に描かれた図形の輪郭（多角形の頂点数・パスの部分路数）を読んで人に見せる。 | 期待値を持たない。読むのは押した位置から 30px 以内で幅 20px を超える最初の図形だけなので、重なった図形や小さい図形は取り違える。 ⚠️ 測る相手は `harness.mjs` が `file://` で開く dist/index.html であり、`npm run build` をしていなければ古い成果物を測る。 | 人が手で |
| `frame-attribution.mjs` | 1 フレームのミリ秒が、スタイル再計算・レイアウト・描画・HTML の解析・スクリプトのどの段へ行ったかを、アプリの自己申告ではなくブラウザ自身の計器（CDP）で人に見せる。 | 合否を持たない（表 T-043 の門は別）。数は測る機械とその時の負荷に左右され、基準機の条件はこの道具では揃えない。 ⚠️ 測る相手は `harness.mjs` が `file://` で開く dist/index.html であり、`npm run build` をしていなければ古い成果物を測る。 | 人が手で |
| `gestures3.mjs` | 背景での 2 つの操作を、動かない基準（目盛が刷る最も左の日付と、選択枠の数）で読んで人に見せる。空いた場所は、`PTD-5` の既定の矢印が出る位置として探す。 | 期待値を持たない。空いた場所の判定はポインタの形だけに頼るので、形の規則が変われば別の場所を押す。 ⚠️ 測る相手は `harness.mjs` が `file://` で開く dist/index.html であり、`npm run build` をしていなければ古い成果物を測る。 | 人が手で |
| `marquee-options.mjs` | 範囲選択の矩形を 3 通りの描き方で実際のページに描いて画像に残し、見た目を言葉でなく画素で比べられるようにする。 | 判定しない —— どれを採るかは人が決める。描く色と線は道具の中に直に書いてあり、設定値の表とは結ばれていない。 ⚠️ 測る相手は `harness.mjs` が `file://` で開く dist/index.html であり、`npm run build` をしていなければ古い成果物を測る。 | 人が手で |
| `pan-vertical-sweep.mjs` | 縦のパンが等倍で動くか、行の境目にだけ止まるかを、図形の上端の位置を読みながら人に見せる。 | 期待値を持たない。読むのは幅 20px・高さ 4px を超える多角形の最も上だけなので、それに合う図形が無い画面では何も返さない。 ⚠️ 測る相手は `harness.mjs` が `file://` で開く dist/index.html であり、`npm run build` をしていなければ古い成果物を測る。 | 人が手で |
| `row-controls-press-all.mjs` | 行見出しパネルの入口を 1 つずつ、毎回新しいページで押し、何も動かさなかった入口を人に見せる。 | 期待値を持たない。1 入口につき 1 ページを開くので、畳みや隠しを重ねた後にしか効かない入口は、効かないものとして出る。 ⚠️ 測る相手は `harness.mjs` が `file://` で開く dist/index.html であり、`npm run build` をしていなければ古い成果物を測る。 | 人が手で |
| `selection-after-delete.mjs` | すべて選んで削除し確定した後に図形の入口を構え、消えたタスクを指したままの選択から告げが出ないかを人に見せる。 | 期待値を持たない。告げは `data-role` に `Notification` を含む要素の文字だけで読むので、別の形で出る告げは見えない。 ⚠️ 測る相手は `harness.mjs` が `file://` で開く dist/index.html であり、`npm run build` をしていなければ古い成果物を測る。 | 人が手で |
| `body_brief.py` | 体（subagent）に渡す 10 行のブリーフを、基準の sha・持ち場・ほかの体の持ち場・禁止事項（作業木・junction・stash・commit・push・dist/・npx）・壊す試験・報告の上限で埋めて刷る。持ち場が重なれば刷らずに exit 1 で止める。 | 持ち場が正しいか、課題の 1 行が明確かは見ない。決まった行を書き忘れられなくするだけである。体は走っている間に届いたメッセージを指示として読まない（実測 2026-09-26）ので、この一枚に無いものは無い扱いになる。 | 人が手で（体を出す前） |
| `privacy_count.py` | commit や合流が公開してしまう物を 1 行で数える —— 利用者名・絶対パス・メール・秘密の件数、私的な置き場（`MUST_BE_IGNORED`）を `.gitignore` が覆っているか、`MUST_NOT_BE_TRACKED` の下で追跡されている禁止ファイル数。件数が 1 つでも非 0 なら exit 1 になる。 | 検出の型は `precheck.py` から import しているので両者は食い違わないが、綴りの違う名前・precheck の型に無い秘密・ここに挙げていない私的な置き場は見えない。check.sh にも package.json にも組み込まれておらず、`merge_branch.py` と人の手が呼ぶだけである。 | `merge_branch.py`／人が手で（`--staged`／`--range A..B`） |
| `lm-19-frame-time-baseline.mjs` | 本番条件（msedge・1920x1080・Task 1000・240 区間）で dist/index.html のフレーム時間を測り、1 つの JSON を stdout に刷る。測る定義は tests/nfr の `FRAME_PROBE` を実行時に読むので、試験と同じコードで数える。 | 期待値を持たない —— 判定はせず数を人に見せるだけである。測る相手は `npm run build` 済みの dist/index.html に固定され、dev サーバの木は測れない。 | 人が手で |

---

## 8. 部品と走者（8 本）

⛔ **部品を「誰も呼んでいない」と読むな。** 名指しではなく `import` で呼ばれている。

| 道具 | 何を提供するか | ⛔ 何が見えないか | 呼ぶ人 |
|---|---|---|---|
| `check.sh` | 番号付き検査 70 本を 1 本ずつ束ねて走らせる —— 規則索引(検査 0)→ precheck(41)→ StrictDoc の JSON export と jq 4 問(1-4)→ md-checks(5-10, 15, 48)→ style-checks(12-14, 32)→ dup-check(11)→ 生成物 17 本の --check(16 / 17 / 18 / 20 / 27)→ check_layer_rules(19)→ 台帳系(24 の ledger_metrics --check / 25 / 28 / 29 / 31 / 40 / 43)→ 逐語系(39 / 42)→ 49（刊行された HTML）→ 23 / 21 / 22 / 26b / 30 / 33 / 37 / 38 / 44 / 45 / 46 / 47 / 50 / 51 / 52 / 53 / 54 / 55 → 56 / 57 / 58（tests/system の掃引、Playwright）/ 59 / 60 / 61 / 62 / 63 → 64 / 65 / 66（純度・網羅・性能）→ 67 / 68（合流ドライバ・仮番号の --check）→ 69 / 70（`CR-581`）→ 71（試験目録）→ 72 / 73（体制の点検） —— 各行を `\|\| fail=1` で拾い、最後に ALL GREEN か FAILURES ABOVE を印字して同じ値で exit する。 | 終端に赤くなった検査の番号を刷り、`scratch/spec-check/last-run.txt` に終了符号とその番号を残すが、各検査の出力そのものは残さない（stdout だけ。ほかに残るのは scratch/spec-check/dup-report.txt と sd-out の export 木）。番号付き 52 本のうち検査 1（node 数）と 4（UID の欠番）は印字するだけで fail を立てない。 | `npm run check`／人が手で |
| `ledger_quotes.py` | 台帳の 1 セルから引用（「」『』とコードスパン）と「⚠️ 実測（日付）…」で始まる記録の文を取り除き、そのセルが今日について自分の声で言っていることだけを返す（outside_quotation / outside_record / spoken_now / asserts_any）。 | 引用かどうかの判断は区切り記号だけなので、括弧を閉じ忘れたセルは丸ごと素通りし、括弧を使わない引用は引用と見なされない。記録の印は「⚠️ 実測（YYYY-MM-DD」という 1 つの綴りに固定で、全角括弧の無い「実測 2026-09-07」も、⭐ や ⛔ で始まる記録も記録として扱わない。文の切れ目は 。と ⭐ ⛔ ⇒ ⚠️ の 4 つだけなので、1 文の中に記録と現在の主張が混ざっているとどちらか一方しか正しく扱えない。 | 2 本が import |
| `purity-calls.mjs` | 検査 64・65 のために、TypeScript 7 の型検査器（`typescript/unstable/sync`）で src/ を読み、`honesty`（札が嘘をつく関数）と `inventory`（export された関数の札・注記・枝の数と、tests/unit・tests/contract の import が名指す関数）を JSON で刷る。判断も基準線も持たない。 | 枝の数は function-size.mjs（検査 60）の定義を TypeScript の構文木の上で数え直したもので、oxc の数と食い違っても気づかない。`--root DIR` は別の木（壊して確かめる写し）を読む。 | 検査 64・65 |
| `retired.py` | 意図して退役させた仕様 ID の集合 RETIRED（1 つの set リテラル）と、各エントリの「何が・いつ・誰の裁定で抜け、どの文書がまだ名指しているか」の理由を提供する。 | ただの set リテラルなので、中の ID が本当に退役済みかを検証するものは何も無い —— 席を 1 つ足せば、その ID への参照は検査 7 でも list-asserted-claims でも永久に黙る。表を booking しても表の中の行は booking しない（T-006 は在るが E-1..E-6 は意図的に不在）ので、退役した表の行への参照は「未定義」として出続ける。「まだ何かが名指している ID」だけを持つ設計なので、退役の全数ではない。 | 4 本が import |
| `spec_tables.py` | docs/spec下のMarkdown表を、キャプション（**表 T-nnn —**）から次のキャプション・章見出し・ファイル末尾までの範囲として解析し、行を見出し名でセルアクセスできるRow/Tableオブジェクトとして返す共有リーダーを提供する。generate_display_words.py・generate_exchange_formats.py・generate_help_roster.py・generate_icon_glyphs.py・generate_icon_roster.py・generate_unit_tree.pyの6本がimportしている。 | 見出し形状が最初のpipeブロックと異なる2番目以降のブロックは『aside』として数えるだけで、本来ロスターに含まれるべき行がasideに誤分類されても、このリーダー自身は『本当はロスターの一部だったのに漏れている』ことまでは判定しない（コード自身が『counted, not dropped in silence』とだけ述べ、正誤の判定はしないと認めている）。 | 6 本が import |
| `specindex.py` | docs/spec と docs/spec/_assets の .md を 1 度だけ読み、表 T-nnn とその行 ID、UID、行→所有者の対応（owner_at）、列数の食い違い、references_to(対象) の逆引き、そして known（行＋UID＋表＋RETIRED）を提供する。 | 索引に入る形は「`**表 T-nnn —` 見出し」「`**UID**:` 行」「`#` 見出し」「`\|` で始まる行」の 4 つだけ —— 図の見出し `**図 F-nnn —` は 1 つも索引されないので、known を通す道具にとって図は存在しない（実測 2026-09-11、F-019 が「未定義」の最頻トークン）。discover() は 2 階層しか走査しないので docs/spec/<下位>/<下位>.md は不可視、references_to は 1 行に閉じた文字列一致なので行をまたぐ参照は 0 件。 | 9 本が import |
| `function-size.mjs` | 検査 60（`check-function-size.py`）のために、rolldown/parseAst で src/ の TypeScript を構文木に解析し、関数ごとの行数・枝の数・開始/終了行と、名前の衝突・構文エラーを JSON で刷る。判断も基準線も持たない。 | 関数と数えるのは本体を持つ FunctionDeclaration／FunctionExpression／ArrowFunctionExpression だけで、オーバーロード宣言（本体 null）は数えない。1 ファイルの構文エラーは `errors` に記録して落とすだけで、その回全体は止めない。 | 検査 60 |
| `merge_branch.py` | 受け取る枝のチェックアウトで、指定の枝を合流する —— 合流ドライバを入れ直す → 両側が同じ新 ID を取っていれば入ってくる側を付け替えた写しを合流する → 衝突したファイルは、塊ごとに「こちら側」と「向こう側」で解いた版をそれぞれ再生成し、同じバイトになれば生成物として解く → 再生成・仮番号の詰め・`--band` → `check.sh` と `gen:check` → `privacy_count.py --staged` → すべて緑のときだけコミットし、関門（既定は GT-2）を列に積む。 | 両側が**同じことを言っているか**は見ない —— 手書きの文書どうしが衝突なく合流しても、食い違いは検査と読み手が拾う。手書きの衝突は解かずに、ファイルの一覧を出して合流を途中のまま残す。⛔ push はしない。 | `npm run merge:branch -- <枝>`（調整役） |

---

## 9. ⛔ 目録の残る欠け（2 件）

| | 何が欠けているか | どこで確かめたか |
|---|---|---|
| 1 | ⛔ **部品図（fig-components と view-* の .drawio と .svg）を比べる検査が無い。** `build.py --check` は overview.json と components.md だけを比べるので、図が古くなっても検査は全部緑のままである | `build.py --check` が実行のたびに NOT CHECKED と刷る |
| 2 | ⛔ **検査 56・57・59・60・61・62・63（`check-grab-table-parents.py`・`check-decision-tables.py`・`check-component-edges.py`・`check-function-size.py`・`check-module-state.py`・`check-identifier-reservation.py`・`check-sm-ev-tn-prefix-gone.py`）が check.sh に在るのに、第 4 節の表に行を持たず、第 3 節の門の本数（44）にも入っていない。** 2026-09-26 の合流（`CR-581` の後始末）で手が回らなかった | `grep -n 'section "5[6-9]\|section "6[0-3]' check.sh` と第 4 節を突き合わせると 7 本が抜けている |

⛔ **直していない** —— `.drawio` は Graphviz、`.svg` は draw.io の実行ファイルが要り、どちらも検査を走らせる計算機に在るとは限らない。項目 2 は次の合流で第 4 節に行を足すこと。

---

## 10. ⚠️ 呼ばれ方の弱い道具（2 本）

⭐ **退役させない。** ⛔ **代わりに役目を書く。それが本書である。**

⛔ **`impact.py` と `induced.py` は `02-changing-the-spec.md` が手順として名指すだけである** —— ⚠️ **それが「人が手で」の意味である。**

| 道具 | 置き場 | 役目 | ⛔ いま誰が走らせるか |
|---|---|---|---|
| `impact.py` | `.claude/skills/spec-graph-check` | 表番号・行 ID・UID を 1 つ与えると、それを指している要求の一覧と、その要求を指す 2 次の要求と、CLUSTERS の 6 塊のどれに属するかを Markdown で人に見せる。 | 人が手で。report_node は specindex.RETIRED を読むが、その名は specindex が retired.py から import したもので、specindex.py 自身はもう集合を持たない。 |
| `induced.py` | `.claude/skills/spec-graph-check` | これから触る対象を全部並べると、その誘導部分グラフの中の閉路（＝1 つの計画・1 パスで書かねばならない組）を人に見せる。 | 人が手で。SKILL.md は「編集の前に必ず走らせる、走らせないのがこの道具を作った原因の失敗」と書くが、check.sh は呼ばない —— 走らせ忘れても赤にならない。種が 1 つも解決しないときは 2 を返して拒む（空グラフの閉路 0 件を合格に見せないため）。 |

⛔ **「人が手で」は呼び口として弱い。** 覚えていなければ走らない道具は、走らない道具である
（`04-verification.md` 3 節が同じことを言っている）。

---

## 11. 本書と隣の文書

| 文書 | 何を持つか |
|---|---|
| [`04-verification.md`](04-verification.md) | ⭐ **何をもって確かめたと言えるか**（規則）。本書は**道具の側**だけを持つ |
| `package.json` | ⭐ **束が何を走らせるか**（唯一の写し）|
| `.claude/skills/spec-graph-check/SKILL.md` | 検査の散文。⚠️ **数は古い。コードを正とせよ** |
| `check.sh` の `NOT COVERED` 節 | ⭐ **走行のたびに「この巡が見なかったもの」を刷る。** 本書の「何が見えないか」の、検査一式ぶんの版 |

---

## 12. 試験の目録 —— `tools/generate_test_inventory.py`（P4、2026-09-26）

⭐ **試験ファイル 1 つにつき 1 行。** 置き場（表 T-218）、名指す仕様の行・UC・表、表 T-334 の行、既知の赤（`tests/known-red.txt`）、赤で固定した印（`it.fails` ／ `test.fail` ／ `specMismatch`）とその台帳の行、MSPDI の XSD が要るか（`tests/fixtures/mspdi-xsd.json`）を並べる。

| 呼び口 | 何をするか |
|---|---|
| `npm run gen:tests` | `docs/development-records/test-inventory.md` を書く（`npm run gen` にも入っている） |
| `npm run gen:tests:check` | 古ければ赤（`npm run gen:check` と検査 71 が呼ぶ） |

- ⛔ **試験ファイル・`known-red.txt`・試験が名指す仕様の行のどれかを変えたら、目録は古くなる。** `npm run gen:tests` を走らせ、目録も同じコミットに入れよ。日付も時刻も書かないので、中身が同じなら差分は出ない。
- ⭐ **ID を読むのは 3 か所だけ** —— コメント、`describe` ／ `test` ／ `it` ／ `step` ／ `specMismatch` の題、`specTable(...)` の表。そのうえで、仕様が定義している ID だけを結ぶ。コードの中の ID（`press(page, 'IC-93')`）は、試験が押すものであって、確かめると名乗るものではないので読まない。
- ⚠️ **見えないもの**: 走らせてから作る題（表の行を回す `it.each`）はリテラルの部分しか読めない。だから「case sites」は書かれた呼び出しの数であり、走る件数ではない。単体試験の相手は `src/` からの名前つき import で読み、札は宣言の真上の doc コメントだけから読む。呼び手を通して届く関数や `vi.mock` は見えない。試験が名指したものを本当に確かめているかも読まない。
- ⭐ 6 節の「UO-1 would omit」は、import した関数がすべて `pure` ／ `semi-pure-a` の単体ファイルの印である（規則 04 の表 `UO`）。**一覧を出すだけで、振り分け直しは CR の整理の後に行う。**
- ⭐ 2026-09-26 に本書 5 節の表へ本道具の行（検査 71）を足し、第 3・5 節の数はこの 1 本を数えている。

## 13. 重複の予防の道具（`CR-581` の前半、チップ P3、2026-09-26）

⭐ 2026-09-26 に本書第 4 節の表へ下 2 本（検査 69・70）の行を足し、第 3〜5 節の数は本節の 4 本（合流で検査の番号は 69・70 に詰まっている）をすべて数えている。

| 番号 | 道具 | 何を赤にするか ／ 何を書くか | ⛔ 何が見えないか |
|---|---|---|---|
| 27 | `published_entries_json_to_md.py`（`docs/spec/_source`） | `_source/published-entries.json` から表 T-064 を `_assets/tbl-published-entries.md` へ刷る。原稿の破れ（行・コンポーネントの二重、名の二重、全角の括弧で始まらない注記、名に読める散文の片）は 1 バイトも書かずに拒む。`--check` は刷った表の手の編集を赤にする | 名が入口から本当に出ているか（検査 26b が見る） |
| 27 | `generate_public_entry_index.py`（`tools`） | `src/` と原稿から `docs/review/public-entry-index.md` を刷る。入口が出す名（表 T-064 の行か `--`）と、ファイルは出すが入口が出さない名（`file only`）を、`ファイル#名前` と目的か宣言の頭で並べる | 非公開の関数。言い換えた名 |
| 69 | `check-literal-restatement.py`（`.claude/skills/spec-graph-check`） | `src/` のモジュールの頂に手で書いた値の集合が、生成された集合を言い直していること（Jaccard 0.7 以上・共通 3 以上）。`Record` や写像型が生成の和で守るものは外す。`literal-restatement-baseline.txt` に対して、鍵は名前 | 関数の中の集合。複数のファイルに散った 1 語ずつの語彙。言い換えた集合 |
| 70 | `check-twin-comments.py`（同） | 写しだと述べる新しいコメント。登録が残っているのにコメントが消えたこと。`twin-comments-baseline.txt` に対して、鍵は宣言の名と主張の頭 10 語 | 誰もコメントしなかった写し |

⛔ **69 と 70 の基準線は、利用者の OK なしには増やさない**（`JDG-520` の上げ）。
⭐ 赤になったら、登録ではなく**元を公開して import する** —— 下の手順である。

### ⭐ 補助関数を書く前に

1. `docs/review/public-entry-index.md` を、仕事の語と型で探す（Ctrl-F で足りる）。
2. 在れば import する。`file only` なら、そのコンポーネントの公開エントリから出し直す。非公開なら `export` して出し直す。
3. `docs/spec/_source/published-entries.json` の、そのコンポーネントの行に 1 項足す（名と、全角の括弧で始まる 1 文の注記）。
4. `npm run gen`。検査 26b が、表が名指す名が入口から出ていることを確かめる。

⚠️ 索引に載らない元もある —— 既知の写し 8 組の元のうち 4 つは非公開の関数だった（`CR-581` の 14 節）。見つからなければ、同じフォルダを grep してから書け。

## 14. 並行の道具 —— 合流・生成物・仮番号・関門の列・体へのブリーフ（2026-09-26）

⭐ **並行で動くセッションと体が、互いの仕事を壊さずに 1 本の枝へ合流するための道具である。**
⚠️ **作った理由は実測である** —— 2026-09-26 の巡は、合流のたびに生成された数の表がぶつかり、2 つのセッションが同じ新しい ID を取り、関門が重なって時間の赤を出した。
⭐ 同じ 2026-09-26 のうちに、`merge_driver.py`／`renumber_ids.py`（検査 67・68）は本書第 4 節へ、`merge_branch.py` は第 8 節へ、`privacy_count.py`／`body_brief.py` は第 7 節へも行を持たせ、第 3 節の数へ合流した。本節は道具どうしの並びと呼び口をまとめる場として残す。

| 道具 | 何をするか | 何が見えないか | 呼ぶ人 |
|---|---|---|---|
| `tools/merge_branch.py` | 受け取る枝のチェックアウトで、指定の枝を合流する。合流ドライバを入れ直す → 両側が同じ新 ID を取っていれば入ってくる側を付け替えた写しを合流する → 衝突したファイルは、塊ごとに「こちら側」と「向こう側」で解いた版をそれぞれ再生成し、同じバイトになれば生成物として解く → 再生成・仮番号の詰め・`--band` → `check.sh` と `gen:check` → 個人情報の数 → すべて緑のときだけコミットし、関門（既定は GT-2）を列に積む。出力は 5 行、残りは `scratch/merge-branch/last-run.log` | 両側が**同じことを言っているか**は見ない —— 手書きの文書どうしが衝突なく合流しても、食い違いは検査と読み手が拾う。手書きの衝突は解かずに、ファイルの一覧を出して合流を途中のまま残す。⛔ push はしない | `npm run merge:branch -- <枝>`（調整役） |
| `tools/merge_driver.py` | git の合流ドライバ 2 つ。`grs-generated` は再生成されるファイルをきれいな合流か「こちら側」で残し、`grs-ledger` は台帳の中の生成ブロックを「こちら側」で残し、両側が**表の行を足しただけ**で ID が重ならない塊を両方の行でつなぐ。`install` が `git config` に書き、`--check` が検査 67 | ドライバは合流の**あとの**再生成を前提にする —— ドライバの中で再生成すると、git が書き終えていない作業木を読むからである。⚠️ `git config` は追跡されないので、入れていないクローンでは普通の合流に戻る（衝突が出るだけで、誤ったファイルにはならない）。同じ新 ID を両側が取った衝突は解かない | git（`.gitattributes`）／ `merge_branch.py` ／ `check.sh`（67） |
| `tools/renumber_ids.py` | `compact` は作業木の仮番号を接頭辞ごとに「最大＋1」から詰め、CR のファイル名も付け替える。`band` は帯（例 `DFC=1100-1109`）を同じく詰める。`clashes` は合流の基点からの新 ID を両側で比べ、重なれば入ってくる側を付け替えたコミットを、作業木にも索引にも触れずに作る。`--check` が検査 68。どれも 2 相（先に一意の印へ、次に新しい番号へ）で置き換える | 「最大」は**定義**（表の行の先頭セル・`**表 T-nnn` の見出し・CR のファイル名）の最大と、その 50 以内で**触れられた**番号である。それより遠い言及は例か偶然として数えず、数えなかった件数を刷る。1 つの接頭辞で書いた範囲（`JDG-600..609` の形）は直さず、場所を警告に出す。`dist/` と自分自身は読まない | 人が手で ／ `merge_branch.py` ／ `check.sh`（68） |
| `tools/gate/gate-queue.mjs` | 機械全体で関門を 1 本ずつ走らせる錠と列。git の共通ディレクトリ（`.git/grs-gate/`）に置くので、根と全部の作業木が同じ錠を見る。`enqueue` は HEAD の sha で関門を積み（別の短い錠なので、走っている関門を待たない）、`drain` は根でだけ列を回して HEAD が動いた項目を捨て、`run --` は臨時の vitest ／ e2e ／ parity を錠の下で走らせる。`run-gate.mjs` は走るあいだ錠を持つ | 錠を**取らずに**走る命令（素の `npx vitest` など）は止められない —— 規則とブリーフが `run --` を名指すだけである。持ち主が生きているかは pid で見るので、別の機械の錠は見えない。使い捨てのクローンは自分の `.git` を持ち、錠を共有しない | `npm run gate:enqueue` ／ `gate:drain` ／ `gate:list` ／ `gate:run` ／ `run-gate.mjs` |
| `tools/gate/run-gate.mjs` の `PERF` | `vite build` のあと、`tests/nfr` の時計を読む 2 ファイルを `GRS_PERF=1` で走らせる（`JDG-605`） | **名指し**と、呼ぶ側の `GRS_PERF=1` の両方が無ければ何もせずに止まる。GT-1 と GT-2 は `GRS_PERF` を外すので、決して測らない。静かな機械かどうか（ListAgents の busy 0）は見ない | `GRS_PERF=1 npm run gate:perf`（利用者の居るセッションだけ） |
| `tools/privacy_count.py` | 公開の前に数える 1 行: 利用者名・絶対パス・メール・秘密の件数、私的な置き場 8 つを `.gitignore` が覆う数、MSPDI の置き場で追跡されている README 以外のファイル数。型は `tools/precheck.py` のものを import する | 綴りの違う名前、`precheck.py` の型に無い秘密、ここに挙げていない私的な置き場は見えない | `merge_branch.py` ／ 人が手で（`--staged` ／ `--range A..B`） |
| `tools/body_brief.py` | 体に渡す 10 行のブリーフを、基準の sha・持ち場・ほかの体の持ち場・禁止事項（作業木・junction・stash・commit・push・`dist/`・npx）・壊す試験・報告の上限で埋めて刷る。持ち場が重なれば刷らずに止まる | 持ち場が正しいか、課題の 1 行が明確かは見ない。決まった行を書き忘れられなくするだけである | 人が手で（体を出す前） |

### 14.1 ⭐ 仮番号の作法

- 下書きの**新しい** ID は、本物の接頭辞と 9 から始まる 5 桁で書く —— `DFC-9NNNN` ／ `JDG-9NNNN` ／ 表 `T-9NNNN` ／ `change-request/CR-9NNNN-<slug>.md`。
  ⭐ 接頭辞は本物のままなので、見まがう新しい接頭辞は生まれない。⚠️ 実測（2026-09-26）: 定義された番号の最大は `DFC` の 1086 で、9 万台に届く接頭辞は無い。
- コミットの前に `python tools/renumber_ids.py compact` を打つ。⛔ 仮番号を持つ追跡ファイルは検査 68 が赤にする。
- 2 つのセッションが同時に詰めれば、同じ番号を取る。⭐ それは合流で `merge_branch.py` が入ってくる側を付け替える —— 詰めた番号は「その枝の上での最大＋1」でしかない。
- ⚠️ 調整役が本物に見える帯を配っている間は、`--band` で詰める。帯は最大の上に置くので、最大が帯に追いつくと帯の番号が本物と区別できなくなる —— 仮番号の形に移る理由である。

### 14.2 ⭐ 合流ドライバを入れる・外す

- 入れる: `python tools/merge_driver.py install`（`merge_branch.py` は毎回これを打つ）。
- ⛔ 外すときは節ごと消す（`git config --remove-section merge.grs-generated`）。`driver` の行だけを消すと `name` が残り、git は「lacks command line」で合流そのものを止める（2026-09-26 実測）。
- 素の `git merge` で合流したら、生成物は古いままである。`npm run gen` と `python tools/ledger_metrics.py` を打つ —— 打たなければ検査 24 と 27 が赤で知らせる。
