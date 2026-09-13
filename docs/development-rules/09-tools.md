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

## 3. 数（2026-09-13 実測。第 4〜8 節の表の行を、置き場は git が追うファイルの名で数えた）

| 種別 | 本数 | 置き場の内訳 |
|---|---|---|
| 門 | **34** | `.claude/skills/spec-graph-check/` に 30、`tools/` に 2、`docs/review/` に 1、`tools/parity/` に 1 |
| 生成器 | **18** | `tools/` に 12、`docs/spec/_source/` に 6 |
| 修理 | **4** | `tools/` に 4 |
| 調査 | **18** | `.claude/skills/spec-graph-check/` に 8、`tools/probe/examples/` に 7、`tools/` に 1、`tools/probe/` に 1、`tools/parity/` に 1 |
| 部品・走者 | **5** | `.claude/skills/spec-graph-check/` に 4、`tools/` に 1 |
| **合計** | **79** | `.mjs` 10 ＋ `.py` 68 ＋ `.sh` 1 |

⛔ **目録は拡張子で数えるな。** 名指しではなく `import` で呼ばれる部品も、`.mjs` の走者も、道具である。

---

## 4. 門 —— 赤にする道具（34 本）

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
| 30 | `check-generated-constants.py` | src/ の `// <generated -- do not edit by hand>` 〜 `// </generated>` の中に在る `export const` の名前の集合と、docs/development-rules/03-implementation.md が行頭に並べる大文字の名前の集合が一致しないと赤（片側にだけ在る名前ごとに 1 行）。 | 比べるのは名前の集合だけなので、定数の値が原稿とずれていても、一覧の説明欄（LISTED は名前の後ろを `\S` で確認するだけ）が誤っていても緑。 | `check.sh` | — |
| 31 | `check-stale-blocked.py` | defects.md と fixed-defects.md で、対応方針・決定仕様 欄が（引用と 「⚠️ 実測（日付）」 の記録の外で）未定・利用者の裁定が要る・裁定を待つ・仕様に行が無い・裁定が要る と読め、かつ同じ行が 決着の語／ステータス 試験待ち・実測待ち・実測済／実物確認 が ✅ で始まる のどれかを持つ行の数が stale-blocked-baseline.txt を超えると赤。 | セル全体に対する部分一致なので、「先の問いは決着し、後から別の問いが開いた」正直な行と、消し忘れの古い文言を区別できない（docstring 自認。前者は基準線の中に含めて飲み込んでいる）。 | `check.sh` | `stale-blocked-baseline.txt` |
| 33 | `audit-ch5.py` | 05-07-design.md の 表 T-062／T-063／T-064／T-065／T-075 の行数・行 ID・層・純粋性と、_source/components.json の節点・辺・クラスタ、5.3 の木の葉フォルダ、散文が述べる数（「N のフォルダ」「層をまたぐ N 本」「N メンバ」）、tbl-glossary.md の T-107 行数、changelog.md の 2 文が互いに食い違うと赤。 | 開くのは 05-07-design.md・_assets/tbl-glossary.md・_source/components.json・changelog.md の 4 つだけで src/ を 1 バイトも読まないので、表 T-075 が名指すユニットのファイルが実在するか（検査 18 の領分）も、公開エントリがそのメンバを export しているか（検査 26b の領分）も見ない。 | `check.sh` | — |
| 37 | `check-dictionary-table-covariance.py` | _source/display-words.json の 12 節（icons/properties/settings/notices/questions/exportFormats/arms/pressOrder/selecting/grabAreas/shortcuts/assignments）の各項目と、対応する表 T-109/T-016/T-104/T-037/T-234/T-024/T-023b/T-023a/T-023c/T-023d/T-036/T-023 の同じ行 ID の行を読み合わせた sha256 指紋が dictionary-table-pairing.txt と 1 つでも変われば赤（新しい対・消えた対も赤）。 | 対にするのは GROUPS に直書きした 12 節だけなので、rowId を持たない 7 節（surfaces・confirmation・noticeDismiss・confirmationMarks・fileStatus・defaultNames・weekdays）と firstRow を持つ paletteGroups と、precedent 試験に任せた reasons／T-233 は、どれだけ動いても何も言わない。 | `check.sh` | `dictionary-table-pairing.txt` |
| 38 | `check-changelog-versions.py` | docs/development-records/changelog.md の `## A.3 Changelog` 節で、行頭セルの版番号が 2 行以上に現れるか、直前の行より小さい版番号が現れると赤。 | 日付欄を一切読まない（ROW は行頭の版番号セルしか取らない）ので、版番号が昇順でも日付が逆転している対（1.53 が 2026-08-30、1.54 が 2026-08-29）はそのまま通る。 | `check.sh` | — |
| 39 | `check-must-clause-coverage.py` | docs/spec の 8 原稿（A-appendix.md は丸ごと、01-04 の Chapter 1 は節ごと除外）の `（MUST）`／`（MUST NOT）` のうち、その印の直前 120／90／60／40／28 字のどれもが tests/ 全ファイルからコメント行を抜いた本文に逐語で見つからないものの数が must-clause-coverage-baseline.txt を超えると赤。 | 見るのは「その語がテストの本文に文字列として在るか」だけなので、その試験が条項について何かを確かめているかは見ない（条項の末尾 28 字をコードの文字列に貼るだけで held になる）。逆に直前 28 字より短い文脈しか持たない条項は、試験が押さえていても unheld と数える。 | `check.sh` | `must-clause-coverage-baseline.txt` |
| 40 | `check-ruled-elsewhere.py` | defects.md と fixed-defects.md で、ステータスが 未検討／裁定待ち か、対応方針欄が（引用と 「⚠️ 実測（日付）」 の記録の外で）未検討・裁定待ち・利用者の裁定が要る・裁定を待つ・未定・仕様に行が無い と読める行のうち、pending-decisions.md で 状態 が 裁定済 の `PND-nnn` を名指す行の数が ruled-elsewhere-baseline.txt を超えると赤。 | 結びつけに使えるのは「行が PND- を書いていること」だけなので、PD 行を持たない裁定（台帳のセルだけで決着したもの）と、変更要求にしか記録が無い裁定は見えない —— 後者は NOT GATED として数を印字するだけで赤にしない（38 行の雑音床があるため）。 | `check.sh` | `ruled-elsewhere-baseline.txt` |
| 41 | `precheck.py` | git が変更と報告したファイル(未追跡フォルダは中まで展開)を 1 秒で読み、docs/spec の中のバッククォート付き `CR-nnn` / `PND-nnn`、docs/spec の空行 2 連続、原稿が同じ差分に居ない生成物の手編集、ドライブレターや home / Users のホーム直下で始まる絶対パス、実行機のアカウント名 / メールアドレス / 資格情報らしき文字列、change-request の CH- と GL- の取り違えを赤にする。⭐ --unpushed を付けると、作業木だけでなく push 済みでない commit が触った全ファイルも読む（guard:publish が使う）。 | clean tree では 0 ファイルを見たまま緑を出す(設計どおりの『何も見ずに通る』)、禁じる利用者名は実行機の getpass.getuser() 由来なので他人の機械の名前は見えず 3 文字未満なら検査自体が無効、tools/precheck.py 自身・docs/reference/・dist/index.html は明示的に免除、そして生成物が原稿と一致するかは見ない(それは検査 16 の仕事)。 | `npm run precheck`／`check.sh` | — |
| 42 | `check-quoted-source.py` | src/ と tests/ の .ts/.mjs のコメント塊に在る 10 字以上・CJK を含む 「…」『…』 の引用で、記号と空白を落とした形が docs/spec/**.md と docs/development-records/changelog.md のどの 1 ファイルにも（省略記号で割った断片を順に）見つからないものの数が quoted-source-baseline.txt を超えると赤。 | 引用の直前 120 字に `D-nnn` `PND-nnn` `CR-nnn` 「規則 n」「利用者の」 などが在れば「別の本の引用」として免除するので、その語を 1 つ添えれば捏造した引用も数えられない。文字列リテラル中の引用も読まない（comment_blocks だけを見る）。 | `check.sh` | `quoted-source-baseline.txt` |
| 43 | `check-ruling-landed.py` | docs/development-records/rulings.md の行で、着地先 が空、状態 が 適用済 なのに 着地先 が docs/spec の定める ID（要求の UID・表の行・表と図の表題・JSON の `id`）も在るファイルも名指さず ruling-landed-baseline.txt の HELD 行も無い、HELD 行が在るのにもう miss でない、未着地 の数が基準線を超える、のいずれかで赤。⭐ 仕様書は利用者の言葉を持たないので、逐語の検索ではなく**着地先が名指すもの**で着地を示す。ID もファイルも名指さない着地先だけは、逐語を探す。 | 名指された ID が**在ること**しか見ないので、その要求や行が裁定の中身を実際に書いているかは見ない。4 欄の古い表（状態 欄が無い行）は 着地先 が空かどうかだけで判定する。 | `check.sh` | `ruling-landed-baseline.txt` |
| 44 | `check-spec-id-references.py` | src/ と tests/ の .ts/.tsx/.js/.mjs に現れる `XX-nnn` 形の語のうち、retired.py が退役と記す ID と、接頭辞は仕様のものなのに原稿・退役集合・台帳の行頭セル・change-request/ のファイル名のどれにも無い ID の総出現数が spec-id-references-baseline.txt を超えると赤。 | ID が生きているかだけを見て周りの文は読まないので、「IC-69 は 2026-09-02 までここに在った」という正しい歴史の記録も 1 件として数え、逆に ID が生きてさえいれば、その行の主張が現在形の嘘でも何も言わない（check.sh の NOT COVERED 欄も同じことを言う）。 | `check.sh` | `spec-id-references-baseline.txt` |
| 45 | `check-repeated-expressions.py` | src/ の .ts/.tsx を手書きの字句解析器で割り、20 字句以上の同一字句列が 2 か所以上に立つ組の数が repeated-expressions-baseline.txt を超えると赤。 | 字句を逐語で比べ識別子を正規化しないので、変数名を付け替えた複写は（食い違う名前の次の字句から始まる窓でしか）見えず、言い換えた同じ規則は完全に見えない。コメント・import/re-export・`// <generated>` ブロックも読まず、tests/ は数えるだけで門にしない。 | `check.sh` | `repeated-expressions-baseline.txt` |
| 46 | `check-line-breaks.py` | BOOKS の 7 原稿（01-04・05-07・08-10・A-appendix・tbl-settings・tbl-glossary・tbl-property-items）で、後ろに文字が続く `。` が、表の行なら直後に `<br>`、表の外なら行末（閉じる `**` は可）になっていない箇所の数が line-break-baseline.txt のそのファイルの数を超えると赤。 | BOOKS に _assets/fig-erd-detail.md と fig-erd-overview.md が無いので、生成された 2 つの ERD 原稿は 1 行に何文詰めても通る。加えて 「」『』 の中と、src//tests/ が逐語で引いている 8 字以上の run は免除される。 | `npm run linebreaks:check`／`check.sh` | `line-break-baseline.txt` |
| 47 | `check-marks.py` | BOOKS の 9 原稿（docs/spec の 4 本と _assets の 5 本）で、⛔⛔ ／ ⭐⭐ ／ ⚠️⚠️ の重ね印が 1 つでも在るか、`**…**` の太字の 1 走りが 「。」 を跨いで後続の文字を含むと赤。 | 対象は docs/spec の 9 ファイルだけなので、src//tests//docs/development-rules/change-request の重ね印は見ない（規則ファイルや道具の docstring は ⛔⛔ を書き放題）。印がその内容にふさわしいかも見ない。 | `npm run marks:check`／`check.sh` | — |
| 49 | `check-render.py` | scratch/spec-html-probe/html/spec/*.html に素の `**…**`（`<code>` の外）が残っている、または原稿の `**表 T-nnn —`／`**図 F-nnn —` の表題が HTML に届いていないと `RESULT: FAIL` と印字する。 | 比べるのは表題と太字だけで、列を失った表も、段が変わった見出しも、切れた link も素通りする。⛔ 表題の照合は 01-04-requirements と 05-07-design の 2 本だけで、08-10-test と A-appendix は素の ** しか見ず、_assets の 3 本はどちらの走査にも入らない。素の ** は 1〜80 字で改行を含まない走りだけを数える。⚠️ export が今の原稿のものかも見ない —— check.sh は直前に export し直すが、人が手で走らせるときは自分で確かめること。 | `npm run render:check`／`check.sh` | — |
| 50 | `check-press-row-ids.py` | 表 T-023a の行 ID の集合と、`input-command-translator.ts` の `export type PressRow` の値の集合が食い違うか。⛔ **仕様の行が型の値である**のに、実測 2026-09-13 で `grep -rn PressRow tools/ .claude/` が **0 件**だった —— 結ぶ機械が無く、しかもこの文字列は製品の外へ出ないので**押しても分からない**。⭐ CR-371 の改名（`PD-` → `PTD-`）の**前に、緑のまま入れた** —— 後から入れると「赤にならない改名」を 1 度通してしまう。⚠️ 比べるのは**集合だけ**で、順は原稿の持ち分（試験が見る）|
| 51 | `check-pd-prefix-gone.py` | git が追う全ファイルで、`PD-` のあとに数字が続く綴り（大文字小文字を問わない）が 1 つでも在ると赤。⭐⭐ **除外を毎回刷る** —— 木 2 つ・ファイル 7 つ・行 4 つを、それぞれの理由と一緒に名指しで出す —— **黙って腐るのは数ではなく、誰も読まない除外だからである**。⚠️ 初回の走行で**検査 50 の docstring を自分で捕まえた** | 素の `PD`（数字が続かない綴り）は見ない —— 英文の散文にも立ち、門にすると正しい文で赤になる。`PTD-` と `PND-` のどちらが正しいかも見ない（検査 50 と 25 の持ち分） | `check.sh` | — |
| 52 | `check-device-route-row-ids.py` | 表 T-007（機器）・表 T-008（経路）の行 ID と、`tests/` が**値として**持つ ID（`T_008_R9` の写し取りと、実行時に原稿を読む `specTable(...).id === ...`）が食い違うか。⭐ CR（`D-` `R-` の廃止）の**前に、緑のまま入れた** —— 検査 50 と同じ理由。⚠️ 初回の走行で**書いた者の誤りを先に捕まえた**（経路の `from` は自表でなく表 T-007 の機器である） | 値だけで、コメントは見ない（検査 42/44 の持ち分）。写し取った他の欄が行の言うことと合うかも見ない（検査 37 の軸） | `check.sh` | — |
| 53 | `check-dr-prefix-gone.py` | git が追う全ファイルで、`D-` または `R-` のあとに数字が続く綴り（大文字小文字を問わない）が 1 つでも在ると赤。⭐⭐ **除外を毎回刷る** —— 木 2・ファイル 5・**文書が自分の行を番号付けている名簿 24**・行 11 を理由と共に名指す。⛔ 名簿を**規則ではなく一つずつ書く** —— 「3 件以上なら免除」にすると**次に `D-1` から振り始める文書を黙って覆う**。⚠️ 初回の走行で**試験のファイル名 25 本**を見つけた（目録の走査が大文字だけだった） | 素の `D` `R`（数字が続かない綴り）は見ない。`DEV-` `CHN-` `DFC-` `JDG-` のどれが正しいかも見ない（検査 52 と 44 の持ち分） | `check.sh` | — |
| 54 | `check-spec-holds-no-history.py` | docs/spec（output/ と __pycache__/ を除く）の `.md` `.json` `.py` で、「利用者の裁定／指示／指摘／申し立て」の直後 4 字以内に `YYYY-MM-DD` が来る綴りか、`YYYY-MM-DD` の後に「まで」が来る綴りが 1 つでも在ると赤。⭐ 0 に届いてから入れたので、基準線も除外も持たない | 日付の無い「利用者の裁定」（誰が決めるかを言う生きた規則）は見ない。日付の無い引用も、「まで」を使わない履歴（「以前は…と定めていた」）も素通りする —— それは spec-writing-rules.md の規則が持つ | `check.sh` | — |
| — | `check.mjs` | サンプル(previous-project-result/11-row-controls/row-controls-sample.html)と dist/index.html の両方に同じ 75 手を打ち、1 手ごとに rows / counts / arming / pinned の 4 読みを比べて、KNOWN_DIVERGENCES(仕様が勝つ差)にも KNOWN_DEFECTS(開いている不具合)にも載っていない食い違い、押せなかった手、盤が組み上がらないこと、名前が省略されたまま比べられないこと、そして『もう落ちなくなった KNOWN_DEFECTS の行』を赤にする。 | 問えるのは行操作の 4 読みだけで、サンプルが持たないもの —— タスクバー、スケジュール画布、透かし —— は原理的に比べられず、S-127(pinnedRowMax=5)のピン上限も『読み単位でしか効かない除外では表せない』として意図的に問わない(最大 4 本まで)。さらに比べる相手は `file://` で開いた dist/index.html なので、ビルドし直していなければ古い成果物を測る。 | `npm run parity` | — |

---

## 5. 生成器 —— 書き出す道具（18 本）

⭐ **生成器の `--check` は、書き出し先を作り直して比べるだけである。**
⛔ **入力の表が間違っていても緑になる。** 表そのものを見るのは門の側の仕事である。

| 検査 | 道具 | 何を読んで何を書くか | ⛔ 何が見えないか | 呼ぶ人 |
|---|---|---|---|---|
| 16 | `erd_json_to_md.py` | docs/spec/_source/erd.json（entities/relations/derived/container/printed、erd.schema.jsonで検証）を読み、docs/spec/_assets/fig-erd-overview.md（図F-010）とfig-erd-detail.md（図F-011＋表T-056〜T-059）を書く。--checkは両ファイルの中身をビルド結果と比較する。 | container図がすべてのentityを一度だけ配置していること等の構造チェックはするが、mermaidが実際にどう描画されるか（視覚的なレイアウトの妥当性）そのものは見ておらず、文字数がmaxTextSize（50000）を超えないかだけを機械的に見ている。 | `npm run gen:md`／`check.sh` |
| 16 | `settings_json_to_md.py` | docs/spec/_source/settings.json（各テーブルブロックとweekdaysロスター、settings.schema.jsonで検証）を読み、docs/spec/_assets/tbl-settings.mdを書く。type_stated_twice()でerd.jsonと型が重複定義されている行の食い違いも検出する。--checkはディスク上のファイルとビルド結果を比較する。 | type_stated_twiceはsettings.jsonの行とerd.jsonの列で『キー名』が完全一致するものだけを突き合わせるため、同じ値を指す2つの列が違う名前で書かれていた場合は食い違いを検出できない。 | `npm run gen:settings`／`check.sh` |
| 17 | `erd_json_to_schema.py` | docs/spec/_source/erd.json（schedule群）とdocs/spec/_assets/tbl-settings.md（documentSettings群、印字済みの表として）を読み、docs/spec/_source/grs-document.schema.jsonを書く。--checkはディスク上のファイルとビルド結果を比較する。 | 型が読み取れない設定キーやスペルの分からないenumは『open』としてstringに緩めて素通りさせるだけで、それが未解決のまま溜まっていても--check自体はPROBLEMとして扱わず、件数は--reportでしか見えない。 | `npm run gen:schema`／`check.sh` |
| 18 | `generate_unit_tree.py` | docs/spec/05-07-design.mdの表T-062（component→layer）・表T-075（unit→component・ファイル名・purity）・表T-064（公開名）・表T-065（境界interface）を読み、Chapter 5.3の規則に従ったパスにsrc/以下の空のユニットファイルを作る（未作成のものだけ）。--checkはsrc/内の.tsファイルパス集合とテーブルが要求するパス集合を比較する。 | 既にあるファイルは絶対に上書きしないため、中身が空のまま長期間放置されていても、あるいは中身がテーブルの意図と食い違っていても検出できない。パスの集合だけを比較し、中身は一切比べない（ドキュメント冒頭にも明記）。 | `npm run tree`／`check.sh` |
| 20 | `generate_entity_types.py` | docs/spec/_source/erd.json（entities/columns）、docs/spec/_source/grs-document.schema.json（documentSettings）、docs/spec/_source/settings.jsonを読み、TARGETSが列挙する複数のsrc/配下ファイル（schedule.ts、document-settings.ts、document-stamp関連、frame-loop.ts、properties-panel.ts、edit-annotation.tsなど）の<generated>〜</generated>マーカー間だけを書き換える。--checkはTARGETS全部についてマーカー間の中身をビルド結果と比較する。 | マーカーの外側（人が書いた実装コード）は一切見ない設計なので、生成された型と実際にそれを使うロジックが整合しているか（コンパイルが通るか）はこのスクリプト自身では確認せず、別途npm run typecheckが要る。 | `npm run types`／`check.sh` |
| 27 | `generate_display_words.py` | docs/spec/_assets/tbl-glossary.mdの表T-109・T-103、docs/spec/01-04-requirements.mdの表T-037・T-023・T-023a〜d・T-036・T-024・T-233・T-234、docs/spec/_assets/tbl-property-items.mdの表T-016から必要な行IDのロスターを毎回組み立て、docs/spec/_source/display-words.jsonの実際のエントリと突き合わせて食い違えば書かずに止め、一致すればsrc/adapter/screen-renderer/display-words.jsonへ書き出す。--checkはこの出力ファイルの中身をビルド結果とバイト比較する。 | word_problems()はja/enの各エントリが文字列であることしか見ず、その語が実際に正しい訳語か・意味の通る語かは一切検査しない。空でも通る設計だが、誤訳や無関係な語を書いても型検査だけで通過する。 | `npm run words`／`check.sh` |
| 27 | `generate_exchange_formats.py` | docs/spec/01-04-requirements.mdの表T-024の全行を読み、書出方向を持つ行をsrc/adapter/document-codec/exchange-formats.jsonへ、そのうち拡張子を持つ行（ファイルとして出るもの）をsrc/adapter/screen-renderer/export-formats.jsonへ書き出す。--checkは両ファイルの中身をビルド結果と比較する。 | 行IDと拡張子・先頭文字を運ぶだけで、document-codec.ts側が実際にその行IDと正しい判定ロジック（ImportFormat/SaveFileForm）を結びつけているかまでは検査しない。 | `npm run formats`／`check.sh` |
| 27 | `generate_help_roster.py` | docs/spec/01-04-requirements.mdの表T-023a・T-023b・T-023c・T-023d・T-023・T-036と、既存のsrc/adapter/screen-renderer/icon-roster.json（表T-109由来）を読み、行ID・キー割当・アイコン・駆動先入口をsrc/adapter/screen-renderer/help-roster.jsonへ書き出す。--checkはそのファイルの中身をビルド結果と比較する。 | 印字される語そのもの（display-words.jsonの内容）はここでは一切運ばれず突き合わせもされないため、ヘルプ画面が実際にこの行IDを正しい語へ解決できているかはこのスクリプトの検査範囲外。 | `npm run helproster`／`check.sh` |
| 27 | `generate_icon_glyphs.py` | docs/spec/_assets/fig-icons.svg（図F-019）の各<g>要素と、docs/spec/_assets/tbl-glossary.mdの表T-109の行数を読み、パスやスタイルをcurrentColorへ正規化した図形と共有座標系をsrc/adapter/screen-renderer/icon-glyphs.jsonへ書き出す。--checkはディスク上のファイルとビルド結果をバイト比較する。 | 座標抽出とバウンディングボックス計算が正しく動いた結果を書き出すだけで、図形が実際に意図した見た目（絵柄）になっているかどうかは目視でしか分からず、このスクリプト自身は判定しない。 | `npm run glyphs`／`check.sh` |
| 27 | `generate_icon_roster.py` | docs/spec/_assets/tbl-glossary.mdの表T-109（アイコン）・表T-103（面）、docs/spec/01-04-requirements.mdの表T-012（形）、docs/spec/_source/erd.jsonのTaskVisual列挙値を読み、行ごとのsurfaces/group/entryTo/authority/arms/armsShapeをsrc/adapter/screen-renderer/icon-roster.jsonへ書き出す。--checkはディスク上のファイルと比較する。 | armsShapeの対応付け（AR-3の8個の刻印とmilestoneGlyphの8個の綴り）は印字順が同じであることだけを頼りに結び付けており、順序が意味的に正しく対応しているかどうかまでは検証できない。 | `npm run icons`／`check.sh` |
| 27 | `generate_json_schema_validator.py` | docs/spec/_source/grs-document.schema.jsonを読み、EXPRESSEDに列挙された10種のJSON Schemaキーワードだけをsrc/adapter/document-codec/json-codec.tsの<generated>〜</generated>マーカー間にTypeScriptのSchemaNode/GRS_DOCUMENT_SCHEMAとして書き出す。--checkはそのリージョンの中身をビルド結果と比較する。 | format:'uuid'を持つ10列はDROPPEDとして意図的に無検査のまま残り、UNCHECKEDとして毎回一覧表示されるだけで、--check自体はこれを合否判定に含めない（PND-189は未裁定のまま）。 | `npm run validator`／`check.sh` |
| 27 | `generate_licence.py` | リポジトリ直下のLICENSE・NOTICE・package.jsonを読み、ライセンス全文・NOTICEのCopyright行・（dependenciesが空である限り）空のattributionsをsrc/adapter/screen-renderer/licence.jsonへ書き出す。--checkはディスク上のファイルと比較する。 | package.jsonのdependenciesが空であることしか調べておらず、devDependencies由来のコードが実際にdist/index.htmlへ紛れ込んでいないかはビルド成果物（dist）を見て検証していない。 | `npm run licence`／`check.sh` |
| 27 | `generate_mspdi_custom_fields.py` | docs/spec/_source/mspdi-custom-fields.json（同フォルダのmspdi-custom-fields.schema.jsonでjsonschema検証）と、docs/spec/_assets/fig-erd-detail.md中の表T-058のfadeInDays/fadeOutDays列を読み、2つのMSPDIカスタムフィールド枠をsrc/adapter/document-codec/mspdi-custom-fields.jsonへ書き出す。--checkはディスク上のファイルと比較する。 | fig-erd-detail.mdはerd.jsonから生成された副産物であり、このスクリプト自身はerd.jsonを直接読まないため、fig-erd-detail.mdがerd.jsonからdriftしていた場合はそのdriftをそのまま読み込んでしまう（コード中のコメントも「二つが食い違えばcheck 16が先に言う」と認めている）。 | `npm run mspdi`／`check.sh` |
| 27 | `generate_property_items.py` | docs/spec/_source/property-items.jsonを読み、各項目のrowId・columns・inputKinds・isReadOnly・appliesTo（既定はTask）をsrc/adapter/screen-renderer/property-items.jsonへ書き出す。--checkはディスク上のファイルと比較する。 | 表示名（display-words.json由来）・候補値・上下限・日付列などはここでは一切運ばれず突き合わせもされないため、property-items.json自体の値がgrs-document.schema.jsonやDATE_COLUMNSと矛盾していてもこのスクリプトは検出しない。 | `npm run propitems`／`check.sh` |
| 27 | `generate_startup_template.py` | PHASES等の内蔵定数、src/entity/document-model配下から読むsettings既定値・カレンダー既定値、docs/spec/_source/settings.json（S-73のthemeHue）、docs/spec/_source/grs-document.schema.jsonを読み、多数のcheck_*関数（check_invariants/check_neutrality/check_schema等）で検証した3年分のサンプルGRS JSON文書をsrc/framework/single-html-shell/startup-template.jsonへ書き出す。--checkはディスク上のファイルとビルド結果をバイト比較する。 | check_neutralityは『生成器自身が書いたと自覚している語彙』に含まれるかどうかしか照合しない禁止語リストではなく既知語リストとの照合なので、その語彙表自体に業界特有語や不適切な単語が紛れ込んでいても、登録さえされていれば通ってしまう。 | `npm run startup`／`check.sh` |
| 27 | `property_items_json_to_md.py` | docs/spec/_source/property-items.jsonを読み、docs/spec/_assets/tbl-property-items.md（表T-016）を書く。--checkはディスク上のファイルとビルド結果を比較する。 | 各行のnote/mspdiセルの文分割（broken関数）は『。』の位置で機械的に改行するだけで、意味的に正しい文分割になっているか、日本語として自然かは一切検査しない。 | `npm run gen:items`／`check.sh` |
| 27 | `row_id_prefixes_json_to_md.py` | docs/spec/_source/row-id-prefixes.json（接頭辞の意味）を読み、docs/spec・docs/development-records・docs/development-rules の 3 つの木で表の行の最初のセルとその表題を毎回歩いて、接頭辞ごとの定義場所と行数を組み合わせ、docs/spec/_assets/tbl-row-id-prefixes.md を書く。登録の無い接頭辞・どの木も使わない登録・届け出の無い衝突・写しと称しながら持ち主の定義しない ID を持つ接頭辞は、どれも exit 1。--check は書き出し先を作り直して比べる。 | docs/spec/output/ は歩かない。行 ID と認めるのは表の行の最初のセルだけなので、散文や表の途中のセルで名乗られた ID は数えない。接頭辞の意味が正しいかは読まない —— JSON の `means` をそのまま刷る。 | `npm run gen:prefixes`／`npm run gen:check`／`check.sh` |
| 27 | `build.py` | docs/spec/_source/components.json を読み、辺をラベル付きのクラスタへ畳んで overview.json と docs/review/components/components.md（外部の drawio-uml スキルの table.py で）を書き、Graphviz と draw.io で fig-components と 4 つの view-* の図（.drawio と .svg）を書く。`--no-figures` は図を飛ばす。`--check` は overview.json と、table.py が在れば components.md を作り直して比べ、食い違えば exit 1。 | `--check` は図（.drawio 5 本と .svg 5 本）を作り直さないので、古い図は緑のまま通る —— 実行のたびに NOT CHECKED と刷る。components.md は利用者の環境に在る table.py が作るので、それが無い計算機では NOT CHECKED になり比べない。 | `npm run gen:components`／`npm run gen:components:check`／`check.sh` |

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

## 7. 調査 —— 人が読む道具（18 本）

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

---

## 8. 部品と走者（5 本）

⛔ **部品を「誰も呼んでいない」と読むな。** 名指しではなく `import` で呼ばれている。

| 道具 | 何を提供するか | ⛔ 何が見えないか | 呼ぶ人 |
|---|---|---|---|
| `check.sh` | 番号付き検査 51 本を 1 本ずつ束ねて走らせる —— 規則索引(検査 0)→ precheck(41)→ StrictDoc の JSON export と jq 4 問(1-4)→ md-checks(5-10, 15, 48)→ style-checks(12-14, 32)→ dup-check(11)→ 生成物 17 本の --check(16 / 17 / 18 / 20 / 27)→ check_layer_rules(19)→ 台帳系(24 の ledger_metrics --check / 25 / 28 / 29 / 31 / 40 / 43)→ 逐語系(39 / 42)→ 49（刊行された HTML）→ 23 / 21 / 22 / 26b / 30 / 33 / 37 / 38 / 44 / 45 / 46 / 47 / 50 / 51 / 52 / 53 / 54 —— 各行を `\|\| fail=1` で拾い、最後に ALL GREEN か FAILURES ABOVE を印字して同じ値で exit する。 | 終端に赤くなった検査の番号を刷り、`scratch/spec-check/last-run.txt` に終了符号とその番号を残すが、各検査の出力そのものは残さない（stdout だけ。ほかに残るのは scratch/spec-check/dup-report.txt と sd-out の export 木）。番号付き 51 本のうち検査 1（node 数）と 4（UID の欠番）は印字するだけで fail を立てない。 | `npm run check`／人が手で |
| `ledger_quotes.py` | 台帳の 1 セルから引用（「」『』とコードスパン）と「⚠️ 実測（日付）…」で始まる記録の文を取り除き、そのセルが今日について自分の声で言っていることだけを返す（outside_quotation / outside_record / spoken_now / asserts_any）。 | 引用かどうかの判断は区切り記号だけなので、括弧を閉じ忘れたセルは丸ごと素通りし、括弧を使わない引用は引用と見なされない。記録の印は「⚠️ 実測（YYYY-MM-DD」という 1 つの綴りに固定で、全角括弧の無い「実測 2026-09-07」も、⭐ や ⛔ で始まる記録も記録として扱わない。文の切れ目は 。と ⭐ ⛔ ⇒ ⚠️ の 4 つだけなので、1 文の中に記録と現在の主張が混ざっているとどちらか一方しか正しく扱えない。 | 2 本が import |
| `retired.py` | 意図して退役させた仕様 ID の集合 RETIRED（1 つの set リテラル）と、各エントリの「何が・いつ・誰の裁定で抜け、どの文書がまだ名指しているか」の理由を提供する。 | ただの set リテラルなので、中の ID が本当に退役済みかを検証するものは何も無い —— 席を 1 つ足せば、その ID への参照は検査 7 でも list-asserted-claims でも永久に黙る。表を booking しても表の中の行は booking しない（T-006 は在るが E-1..E-6 は意図的に不在）ので、退役した表の行への参照は「未定義」として出続ける。「まだ何かが名指している ID」だけを持つ設計なので、退役の全数ではない。 | 4 本が import |
| `spec_tables.py` | docs/spec下のMarkdown表を、キャプション（**表 T-nnn —**）から次のキャプション・章見出し・ファイル末尾までの範囲として解析し、行を見出し名でセルアクセスできるRow/Tableオブジェクトとして返す共有リーダーを提供する。generate_display_words.py・generate_exchange_formats.py・generate_help_roster.py・generate_icon_glyphs.py・generate_icon_roster.py・generate_unit_tree.pyの6本がimportしている。 | 見出し形状が最初のpipeブロックと異なる2番目以降のブロックは『aside』として数えるだけで、本来ロスターに含まれるべき行がasideに誤分類されても、このリーダー自身は『本当はロスターの一部だったのに漏れている』ことまでは判定しない（コード自身が『counted, not dropped in silence』とだけ述べ、正誤の判定はしないと認めている）。 | 6 本が import |
| `specindex.py` | docs/spec と docs/spec/_assets の .md を 1 度だけ読み、表 T-nnn とその行 ID、UID、行→所有者の対応（owner_at）、列数の食い違い、references_to(対象) の逆引き、そして known（行＋UID＋表＋RETIRED）を提供する。 | 索引に入る形は「`**表 T-nnn —` 見出し」「`**UID**:` 行」「`#` 見出し」「`\|` で始まる行」の 4 つだけ —— 図の見出し `**図 F-nnn —` は 1 つも索引されないので、known を通す道具にとって図は存在しない（実測 2026-09-11、F-019 が「未定義」の最頻トークン）。discover() は 2 階層しか走査しないので docs/spec/<下位>/<下位>.md は不可視、references_to は 1 行に閉じた文字列一致なので行をまたぐ参照は 0 件。 | 9 本が import |

---

## 9. ⛔ 目録の残る欠け（1 件）

| | 何が欠けているか | どこで確かめたか |
|---|---|---|
| 1 | ⛔ **部品図（fig-components と view-* の .drawio と .svg）を比べる検査が無い。** `build.py --check` は overview.json と components.md だけを比べるので、図が古くなっても検査は全部緑のままである | `build.py --check` が実行のたびに NOT CHECKED と刷る |

⛔ **直していない** —— `.drawio` は Graphviz、`.svg` は draw.io の実行ファイルが要り、どちらも検査を走らせる計算機に在るとは限らない。

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
