# jq クエリ集 — AI 向け

**UID**: DOC-AI-QUERIES
**Version**: 1.0

本書は、 `00-ai-guide.md` の「3. 仕様書から必要な部分だけを取り出す」の詳細版である。
主要なクエリは `00-ai-guide.md` に載せてある。そちらで足りるなら本書は読まなくてよい。

以下はすべて `samples/md-basic-ja` を `strictdoc export --formats=json` した結果に対して
実行し、 出力を確認したものである。`<json>` は `<出力先>/json/index.json` を指す。

本書に出てくる `DOC-*` や `SW-*` はこの実例の名前である。
他のプロジェクトで使うときの読み替えは、 `00-ai-guide.md` の
「他のプロジェクトで使うときに置き換えるもの」に表でまとめてある。
クエリの形は読み替えなくてよい。 実例に依存する値は `--arg` で外から渡す作りにしてある。

この実例の中身: ユースケース `UC-001` / 上位要求 `SYS-001..003` /
下位要求 `SW-001..004` / テストケース `TC-001..004`。 レビューの結果は要求そのものの `REVIEW_STATUS` に入っている。
本書と `00-ai-guide.md` も文書である (`DOC-AI-QUERIES` / `DOC-AI-GUIDE`)。
記法を説明する文書は図やコードを大量に抱えるので、 **集計するクエリでは必ず除くこと**。
除く 6 書は `DOC-AI-GUIDE` `DOC-AI-QUERIES` `DOC-GUIDE` `DOC-REVIEW` `DOC-BROWSER`
`DOC-COWORK` である (G27 で測った)。
図・数式・コード・表がそろっているのは `DOC-LOWER` の末尾の章だけである
(G27 で測った)。

---

## A. 全体を掴む

**Type**: SECTION

### A1. 文書の一覧

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | (.UID // "-") + "  " + .TITLE' <json>
```

```text
DOC-AI-GUIDE  Markdown 形式の StrictDoc 仕様書 — AI 向け手引き
DOC-AI-QUERIES  jq クエリ集 — AI 向け
DOC-GUIDE  まずこれを読む
DOC-USECASES  ユースケース
DOC-UPPER  上位要求
DOC-ARCH  システム構成
DOC-LOWER  下位要求
DOC-TESTS  テストケース
DOC-REVIEW  レビューの進め方
DOC-BROWSER  ブラウザ操作の手引き
DOC-COWORK  Claude と組んで書く
DOC-FIG-STATE  大きい図 - 変換処理の状態遷移
DOC-NOTE  用語の対応表
```

13 件出る。 `DOC-AI-GUIDE` と `DOC-AI-QUERIES` は AI 向けの手引き、 `DOC-GUIDE` は
人間向けの解説書、 `DOC-ARCH` はシステム構成の見取り図、 `DOC-REVIEW` はレビューの
進め方、 `DOC-BROWSER` はブラウザ操作の手引き、 `DOC-COWORK` は AI と組んで書く方法、
`DOC-NOTE` は `_assets/note.md` の用語表、 `DOC-FIG-STATE` は `_assets/fig-state.md` の
大きい図で、 この 9 つはどれも要求を持たない。
StrictDoc が `.md` を置き場所に関係なく文書として解析するためである。

### A2. ノード型ごとの件数

**Type**: SECTION

```bash
jq -c '[.DOCUMENTS[] | recurse(.NODES[]?) | ._NODE_TYPE] | group_by(.) | map({(.[0]): length}) | add' <json>
```

```json
{
  "DOCUMENT": 13,
  "REQUIREMENT": 7,
  "SECTION": 150,
  "TEST_CASE": 4,
  "TEXT": 151,
  "USE_CASE": 1
}
```

### A3. 目次

**Type**: SECTION

`_TOC` は `2.1.1` のような階層番号である。

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="SECTION") | ._TOC + "  " + .TITLE' <json>
```

### A4. 型ごとに使えるフィールド名

**Type**: SECTION

既存プロジェクトのスキーマを JSON から知る。 新規に書き起こすときは JSON がまだ無いので、
このクエリは使えない。そのときは `basic.sgra` を直接読む。

```bash
jq -c '[.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE) | {t:._NODE_TYPE, k:keys}] | group_by(.t) | map({(.[0].t): (map(.k)|add|unique)}) | add' <json>
```

```json
{
  "DOCUMENT": [
    "GRAMMAR",
    "NODES",
    "TITLE",
    "UID",
    "VERSION",
    "_NODE_TYPE",
    "_OPTIONS"
  ],
  "REQUIREMENT": [
    "RATIONALE",
    "RELATIONS",
    "REVIEW_ACTION",
    "REVIEW_COMMENT",
    "REVIEW_STATUS",
    "STATEMENT",
    "STATUS",
    "TITLE",
    "UID",
    "_NODE_TYPE",
    "_TOC"
  ],
  "SECTION": ["NODES", "TITLE", "_NODE_TYPE", "_TOC"],
  "TEST_CASE": [
    "GIVEN",
    "ISSUE_KEY",
    "RELATIONS",
    "TEST_REMARK",
    "TEST_RESULT",
    "THEN",
    "TITLE",
    "UID",
    "WHEN",
    "_NODE_TYPE",
    "_TOC"
  ],
  "TEXT": ["STATEMENT", "_NODE_TYPE", "_TOC"],
  "USE_CASE": [
    "REVIEW_COMMENT",
    "REVIEW_STATUS",
    "STATEMENT",
    "TITLE",
    "UC_LEVEL",
    "UID",
    "_NODE_TYPE",
    "_TOC"
  ]
}
```

`-c` を付けたので jq は 1 行で出す。上は読みやすさのために折り返してある。
6 つのノード型が全部出る。`basic.sgra` が定義するのは `SECTION` `REQUIREMENT`
`USE_CASE` `TEST_CASE` の 4 つで、 `DOCUMENT` と `TEXT` は宣言しなくても使える。
`SECTION` は宣言が要る — 落とすと `Invalid node type: SECTION.` で止まる (実測)。

---

## B. 位置を特定する

**Type**: SECTION

### B5. UID で 1 件

**Type**: SECTION

```bash
jq -c 'first(.DOCUMENTS[] | recurse(.NODES[]?) | select(.UID? == "SW-002")) | del(.NODES)' <json>
```

`first(...)` は最初の 1 件で探索を打ち切る。`del(.NODES)` は章にも同じ式を使えるようにするため。

### B6. UID を正規表現で

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(.UID? and (.UID | test("^SW-"))) | .UID' <json>
```

```text
SW-001
SW-002
SW-003
SW-004
```

### B7. 語で探す

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="REQUIREMENT") | select(((.TITLE//"") + (.STATEMENT//"")) | contains("変換")) | .UID' <json>
```

全フィールドを対象にするなら `[.. | strings] | join(" ")` で潰してから `contains` する。

### B8. 正規表現で探す

**Type**: SECTION

`test()` は第 2 引数にフラグを取る。`"i"` で大文字小文字を無視する。日本語も使える。

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(.TITLE? and (.TITLE | test("変換|検査"; "i"))) | (.UID // "-") + "  " + .TITLE' <json>
```

```text
-  手順 1 — JSON に変換する
UC-001  入力ファイルを指定形式へ変換する
SYS-001  ファイルの変換
SW-001  変換の実行
SW-002  入力形式の検査
TC-001  変換が成功する
DOC-FIG-STATE  大きい図 - 変換処理の状態遷移
```

### B9. 特定の文書だけに絞る

**Type**: SECTION

**ファイル名では絞れない。JSON にファイルパスは入っていない。** 文書の `UID` を使う。

```bash
jq -r '.DOCUMENTS[] | select(.UID=="DOC-UPPER") | recurse(.NODES[]?) | select(._NODE_TYPE=="REQUIREMENT") | .UID + "  " + .TITLE' <json>
```

文書の UID が分からないときは A1 で調べる。

### B10. 特定の章だけに絞る

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(._TOC? and (._TOC | startswith("2."))) | ._TOC + "  " + (.TITLE // "")' <json>
```

`startswith("2.")` は `2.1` `2.2` に一致するが、 章そのもの (`2`) には一致しない。
章自身も含めるなら `(._TOC=="2" or (._TOC|startswith("2.")))` とする。

---

## C. 関係をたどる

**Type**: SECTION

### C11. 直接の親

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(.UID?=="TC-001") | (.RELATIONS // [])[] | select(.TYPE=="Parent") | .VALUE' <json>
```

### C12. 親を根までたどる (推移的)

**Type**: SECTION

```bash
jq -r '[.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE and .UID)] as $all
| def anc($u): ($all[] | select(.UID==$u) | .RELATIONS? // [] | .[] | select(.TYPE=="Parent") | .VALUE) as $p | [$p], anc($p);
  [anc("TC-001")] | flatten | unique | .[]' <json>
```

```text
SW-001
SYS-001
UC-001
```

根の `UC-001` まで届く。 `TC-001` は `SW-001` を検証すると同時に `UC-001` も
検証しているので、 `SW-001 -> SYS-001 -> UC-001` の経路と直接の辺の両方で繋がる。

### C13. 直接の子 (逆引き)

**Type**: SECTION

**JSON に子は記録されていない。** 全ノードを走査して「親が自分であるもの」を集める。

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select((.RELATIONS? // []) | any(.TYPE=="Parent" and .VALUE=="SYS-001")) | .UID' <json>
```

### C14. 子を葉までたどる (推移的)

**Type**: SECTION

```bash
jq -r '[.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE and .UID)] as $all
| def desc($u): ($all[] | select((.RELATIONS? // []) | any(.TYPE=="Parent" and .VALUE==$u)) | .UID) as $c | [$c], desc($c);
  [desc("SYS-001")] | flatten | unique | .[]' <json>
```

```text
SW-001
TC-001
```

### C15. ROLE で絞る

**Type**: SECTION

この一式では `Verifies` をテストケースだけが使う。
1 件のテストが 2 本持つ — 下位要求とユースケースの両方を検証している。

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(.UID?) as $n | ($n.RELATIONS // [])[] | select(.ROLE=="Verifies") | $n.UID + " -> " + .VALUE' <json>
```

```text
TC-001 -> SW-001
TC-001 -> UC-001
TC-002 -> SW-002
TC-002 -> UC-001
TC-003 -> SW-003
TC-003 -> UC-001
TC-004 -> SW-004
TC-004 -> UC-001
```

---

## D. 抜けを見つける

**Type**: SECTION

### D16. テストケースから「直接」指されていない要求

**Type**: SECTION

```bash
jq -r '[.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="TEST_CASE") | (.RELATIONS // [])[] | select(.TYPE=="Parent") | .VALUE] as $tested
| .DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="REQUIREMENT")
| select(.UID | IN($tested[]) | not) | .UID + "  " + .TITLE' <json>
```

```text
SYS-001  ファイルの変換
SYS-002  想定外の入力の拒否
SYS-003  既存ファイルの保護
```

この一式ではテストが下位要求 `SW-*` を覆っており、 上位要求 `SYS-*` は直接には覆われていない。
これは欠陥ではなく設計である — 上位は下位を通じて覆われる。

### D17. 親を持たない要求

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="REQUIREMENT") | select(((.RELATIONS // []) | map(select(.TYPE=="Parent")) | length) == 0) | .UID' <json>
```

このサンプルでは 0 件 — 要求 7 件はどれも親を持つ。 根は `03-usecases.md` の
`UC-001` だが、 あれはユースケースであって要求ではないので、 このクエリには出ない。

### D18. 誰からも指されていない要求

**Type**: SECTION

```bash
jq -r '[.DOCUMENTS[] | recurse(.NODES[]?) | (.RELATIONS // [])[] | select(.TYPE=="Parent") | .VALUE] as $parents
| .DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="REQUIREMENT")
| select(.UID | IN($parents[]) | not) | .UID' <json>
```

このサンプルでは 0 件 (どの要求も誰かが指している)。

**リンク切れと UID の重複にクエリは要らない。** どちらも StrictDoc が関係を解決する
段階で export を止め、 JSON を 1 バイトも書かないためである (実測)。 JSON が手元に
ある時点で、 その 2 つは無い。 かつて D19 と D20 として置いていたが、 発火し得ない
ので消した (番号は欠番のままにしてある)。

```text
error: [DocumentIndex.create] Requirement SW-001 references parent requirement which doesn't exist: SYS-999.
error: DocumentIndex: two nodes with the same UID exist in the same document: SW-002 in "下位要求".
error: DocumentIndex: two nodes with the same UID exist in two different documents: SW-002 in "下位要求" and "テストケース".
```

UID の重複は、 同じ文書の中でも文書をまたいでも止まる (メッセージだけが違う)。

---

## E. フィールドで絞る

**Type**: SECTION

### E21. STATUS で絞る

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="REQUIREMENT" and .STATUS=="Draft") | .UID' <json>
```

### E22. and / or / not

**Type**: SECTION

`select()` の中で普通の論理演算子が使える。

```bash
# and — 承認前なのに指摘が未対応の要求
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(.REVIEW_STATUS=="Open" and .STATUS=="Reviewed") | .UID' <json>

# or — テストか、直さないと決めた要求
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="TEST_CASE" or .REVIEW_STATUS=="WontFix") | .UID' <json>

# not — 要求以外で UID を持つもの
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(.UID? and (._NODE_TYPE=="REQUIREMENT" | not)) | ._NODE_TYPE + " " + .UID' <json>
```

`not` は後ろに置く。`select(not(...))` とは書けない。

### E23. フィールドが無いものを探す

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="REQUIREMENT") | select(has("RATIONALE") | not) | .UID' <json>
```

**値が空でも `has()` は真になる。** 空文字を除きたいなら `select((.RATIONALE // "") == "")` とする。

---

## F. 形を整えて出す

**Type**: SECTION

### F24. 表形式 (最も安い一覧)

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="REQUIREMENT") | [.UID, .STATUS, .TITLE] | @tsv' <json>
```

```text
SYS-001	Approved	ファイルの変換
SYS-002	Approved	想定外の入力の拒否
SYS-003	Reviewed	既存ファイルの保護
SW-001	Approved	変換の実行
SW-002	Approved	入力形式の検査
SW-003	Approved	出力先の確認
SW-004	Draft	書き込みの原子性
```

### F25. 件数だけ

**Type**: SECTION

```bash
jq -c '[.DOCUMENTS[] | recurse(.NODES[]?) | select(._NODE_TYPE=="REQUIREMENT")] | length' <json>
```

### F26. 必要な欄だけを JSON で

**Type**: SECTION

```bash
jq -c '[.DOCUMENTS[] | recurse(.NODES[]?) | select(.REVIEW_STATUS? and .REVIEW_STATUS != "NoFinding")] | map({UID, REVIEW_STATUS})' <json>
```

`-r` を付けない。 付けると文字列に潰れる。

---

## G. 図・数式・コードを扱う

**Type**: SECTION

図も数式もコードも、 `STATEMENT` に原文のまま入っている。 だから `jq` で取り出せるし、
中身を数えることもできる。この節のクエリはそれを前提にしている。

この節のクエリには 2 つの決まりがある。

- 正規表現に二重バックスラッシュを使わない。 `\\$` や `\\[` の代わりに `[$]` `[[]` の
  文字クラスを使い、 正規表現で足りるところも `contains()` / `split()` で書いてある。
  理由は G0 に書く
- コードフェンスを 4 個のバッククォートで囲んである。 クエリ本文に ` ``` ` が出るため、
  3 個だと囲みが途中で閉じる。StrictDoc も 4 個の囲みを正しく解釈する (実測)

### G0. なぜ二重バックスラッシュを避けるか

**Type**: SECTION

Git Bash に `bash -c "..."` の形でクエリを渡すと、 二重バックスラッシュが半分に減る。
strictdoc 0.27.1 / jq 1.8.1 / Windows 11 で実測した。

| 渡し方                                    | `scan("!\\[...")` の結果  |
| ----------------------------------------- | ------------------------- |
| `jq -f クエリ.jq`                         | 通る                      |
| シェルスクリプトに書いて `bash script.sh` | 通る                      |
| `bash -c 'jq -r ...'`                     | `Invalid escape` で落ちる |

AI がコマンドを実行するときはたいてい `bash -c` の形になる。だから二重バックスラッシュを
含むクエリは書かない。 同じ結果は文字列操作で書ける。

単独のバックスラッシュは無事である。 `split("\n")` は上のどの渡し方でも通る (実測)。
減るのは二重のときだけなので、 `\n` `\t` は普通に使ってよい。

どうしても複雑になるならファイルに書く。 シェルを通らないので何も壊れない。

```bash
jq -r -f <クエリを書いたファイル>.jq <json>
```

### G27. どこに何があるか

**Type**: SECTION

最初に打つのはこれである。 どの文書のどのノードに図・数式・コード・表・画像が
あるかを一覧にする。

````bash
jq -r '.DOCUMENTS[] | .UID as $doc | recurse(.NODES[]?) | select(.STATEMENT?) as $n | $n.STATEMENT as $s
| [$s | split("```") | to_entries[] | select(.key % 2 == 1) | .value | split("\n")[0] | rtrimstr("\r")] as $lang
| [ (if ($lang | index("mermaid")) then "図" else empty end),
    (if ($s | contains("$$")) then "数式" else empty end),
    (if ($lang | map(select(. != "mermaid" and . != "")) | length) > 0 then "コード" else empty end),
    (if ($s | test("(?m)^[|]")) then "表" else empty end),
    (if ($s | contains("![")) then "画像" else empty end) ] as $k
| select(($k | length) > 0) | $doc + "  " + ($n.UID // $n._TOC // "-") + "  " + ($k | join(","))' <json>
````

```text
DOC-AI-GUIDE  5.2.1  コード,表
DOC-GUIDE  3.2.1  図,画像
DOC-GUIDE  5.2.1  数式,コード,表
DOC-USECASES  1  表
DOC-USECASES  2.1  コード,表
DOC-USECASES  3.1  コード,表
DOC-UPPER  2.1  表
DOC-UPPER  2.2.1  コード,表
DOC-ARCH  2.1  図
DOC-ARCH  3.1  図
DOC-ARCH  4.1  表
DOC-LOWER  6.1  図,数式,コード,表
DOC-TESTS  1  コード,表
DOC-TESTS  2.1  コード,表
DOC-FIG-STATE  1  図
DOC-NOTE  1  表
```

(全 129 行のうち代表を 16 行抜いた。116 行を 6 つの解説文書が占める — 本書・
`00-ai-guide.md`・`02-guide-for-human.md`・`08-review.md`・`09-browser-guide.md`・
`10-cowork-with-claude.md`。記法を説明する文書は記法を大量に抱えるためである。
仕様書本体は 13 行しか出さない — `DOC-USECASES` 3 行、 `DOC-UPPER` 2 行、 `DOC-ARCH` 3 行、
`DOC-LOWER`、 `DOC-TESTS` 2 行、 `DOC-FIG-STATE`、 `DOC-NOTE` がそれで、
残る 3 行は解説文書から抜いた見本である)

2 列目は `UID` があればそれ、 無ければ `_TOC` の階層番号である。地の文には UID が
無いので、 位置を指すには `_TOC` を使う。

言語名はフェンス 1 個ずつ見ること。 ` ``` ` で切ると奇数番目が必ずフェンスの
中身になるので、 その 1 行目が言語名である。**ノード全体に対して
「`mermaid` を含むか」で判定してはならない。** 図とコードが同じノードに同居すると
コードを取りこぼす。`DOC-LOWER 6.1` がまさにその形 (図・数式・コード・表が同居) なので、
自分でこの種のクエリを書いたら必ずこの行で試すこと。

### G28. 図の定義を取り出す

**Type**: SECTION

````bash
jq -r '.DOCUMENTS[] | select(.UID == "DOC-FIG-STATE") | recurse(.NODES[]?) | (.STATEMENT? // "")
| select(contains("```mermaid")) | split("```")[] | select(startswith("mermaid")) | ltrimstr("mermaid")' <json>
````

```text
stateDiagram-v2
    [*] --> 待機
    待機 --> 引数解釈 : 変換を実行
    (以下 16 行)
```

`split("```")` でフェンスを境に切り、 `mermaid` で始まる断片だけを拾い、
先頭の `mermaid` の 7 文字を落としている。フェンスの中身はそのまま入っているので、
これで Mermaid の定義がそっくり手に入る。

言語を変えれば同じ形でコードも取れる (G31)。

### G29. 図の横に並ぶ数を測る (「大きい図は別文書にする」の目安)

**Type**: SECTION

このプロジェクトの目安は「シーケンス図はライフラインが 5 つ以上、 クラス図はクラスが
5 つ以上なら `_assets/fig-*.md` に独立した文書として出す」である。 フローチャートには
目安を置かない。 下のクエリは合否を判定せず、 数を報告するだけである。 どちらに置くかは
書き手が決める。

まず全部の図を測る:

````bash
jq -r '.DOCUMENTS[] | .UID as $doc | recurse(.NODES[]?) | (.STATEMENT? // "")
| select(contains("```mermaid")) | split("```")[] | select(startswith("mermaid"))
| ltrimstr("mermaid") | split("\n") | map(rtrimstr("\r")) | map(select(. != "")) as $lines
| ($lines[0] // "-") as $kind
| ([$lines[] | select(test("^ *(participant|actor) "))] | length) as $l
| ([$lines[] | select(test("^ *class "))] | length) as $c
| $doc + "  " + $kind + "  ライフライン " + ($l|tostring) + "  クラス " + ($c|tostring)' <json>
````

```text
DOC-AI-GUIDE   ` フェンス   | 通る               | `<pre class="mermaid">`                                       |  ライフライン 0  クラス 0
DOC-AI-GUIDE  stateDiagram-v2  ライフライン 0  クラス 0
DOC-AI-QUERIES  ")) | split("  ライフライン 0  クラス 0
DOC-AI-QUERIES  ")) | split("  ライフライン 0  クラス 0
DOC-AI-QUERIES  ")) | split("  ライフライン 0  クラス 0
DOC-GUIDE  flowchart LR  ライフライン 0  クラス 0
DOC-ARCH  flowchart LR  ライフライン 0  クラス 0
DOC-ARCH  sequenceDiagram  ライフライン 3  クラス 0
DOC-LOWER  flowchart LR  ライフライン 0  クラス 0
DOC-BROWSER   ` で囲んだ文字を打つだけである。  ライフライン 0  クラス 0
DOC-FIG-STATE  stateDiagram-v2  ライフライン 0  クラス 0
```

図の種類はフェンスの 1 行目をそのまま出している。 種類の欄が jq の断片になっている行は
図ではない。 解説文書はクエリの本文にフェンス記号と `mermaid` という言語名を並べて書いて
おり、 このクエリはそれを図の断片として拾う。 記法を説明する文書を測るときは、 この種の
自己参照が必ず混ざる。

`participant` も `actor` も宣言していないシーケンス図を、 このクエリは数えられない。
Mermaid は矢印だけからライフラインを起こせるが、 JSON の中の文字列を見るこのクエリは
その推論をしない。 数えたい図には `participant` を書くこと。

目安を超えたものだけを出す形。`DOC-FIG-` で始まる文書は既に外に出したものなので除く。
0 行が正常である。

````bash
jq -r --arg figprefix 'DOC-FIG-' '.DOCUMENTS[] | select(.UID | startswith($figprefix) | not) | .UID as $doc
| recurse(.NODES[]?) | select(.STATEMENT?) as $n | ($n.STATEMENT // "")
| select(contains("```mermaid")) | split("```")[] | select(startswith("mermaid"))
| ltrimstr("mermaid") | split("\n") | map(rtrimstr("\r")) | map(select(. != "")) as $lines
| ([$lines[] | select(test("^ *(participant|actor) "))] | length) as $l
| ([$lines[] | select(test("^ *class "))] | length) as $c
| select($l >= 5 or $c >= 5)
| $doc + "  " + ($n.UID // $n._TOC // "-") + "  ライフライン " + ($l|tostring) + "  クラス " + ($c|tostring)' <json>
````

このサンプルでは 0 件。 目安を超えた図はすべて `_assets/` に出してあるためである。

### G30. 数式を取り出す

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | select(.UID == "DOC-LOWER") | recurse(.NODES[]?) | (.STATEMENT? // "")
| [scan("[$][$]([^$]+)[$][$]")] | .[][] | gsub("^\n|\n$"; "")' <json>
```

```text
S_{need} = S_{out} + S_{tmp} = 2 \times S_{out}
```

`[$][$]` は `$$` を表す文字クラスである (G0)。`scan()` は取り出し組ごとに配列を返すので
`.[][]` で潰す。

文書を絞ること。 絞らずに全体へ当てると `02-guide-for-human.md` の記法の解説に
書いてある `$$` の説明文まで拾い、 何が本物の数式か分からなくなる。

インラインの `$...$` を機械的に取り出すのは諦めたほうがよい。 地の文に紛れた
`$` (金額や環境変数) と区別が付かず、 誤爆する。インラインの数式が要るときは
G27 で場所を突き止めてから、 そのノードの `STATEMENT` を丸ごと読む。

### G31. コードを言語別に

**Type**: SECTION

何の言語が何個あるか:

````bash
jq -c '[.DOCUMENTS[] | recurse(.NODES[]?) | (.STATEMENT? // "") | scan("(?m)^```([a-z]+)")]
| flatten | group_by(.) | map({(.[0]): length}) | add' <json>
````

```json
{ "bash": 55, "json": 5, "markdown": 3, "mermaid": 6, "python": 4, "text": 75 }
```

`mermaid` もここに出る。 図もコードフェンスだからである。

中身を取り出す (G28 と同じ形):

````bash
jq -r '.DOCUMENTS[] | select(.UID == "DOC-LOWER") | recurse(.NODES[]?) | (.STATEMENT? // "")
| split("```")[] | select(startswith("python")) | ltrimstr("python")' <json>
````

```text
def convert(src: str, dst: str) -> None:
    tmp = dst + ".part"          # dst と同じディレクトリに作る
    (以下 6 行)
```

**書き手が言語名を書かなかったフェンスは、 この形では拾えない。** だから書くときは必ず
言語名を付ける。

### G32. 画像の参照先

**Type**: SECTION

```bash
jq -r '.DOCUMENTS[] | .UID as $doc | recurse(.NODES[]?) | (.STATEMENT? // "")
| split("![") | .[1:][] | select(contains("](")) | split("](")[1] | split(")")[0]
| $doc + "  " + .' <json>
```

```text
DOC-AI-GUIDE  _assets/x.svg
DOC-AI-GUIDE  _assets/x.svg
DOC-AI-QUERIES  "
DOC-AI-QUERIES  path
DOC-AI-QUERIES  ...
DOC-AI-QUERIES  path
DOC-GUIDE  path
DOC-GUIDE  _assets/flow.svg
DOC-BROWSER  _assets/browser-00-map.png
DOC-BROWSER  _assets/browser-21-new-document-menu.png
DOC-BROWSER  _assets/browser-22-new-document-form.png
```

(先頭 11 行を出した。全 37 行である。 うち 28 行を `DOC-BROWSER` が占める —
`09-browser-guide.md` は画面写真 `_assets/browser-*.png` を 27 枚貼っており、
残る 1 行は書式の見本に書いた `_assets/図の名前.png` である。
ほかの 9 行は解説文書の書式説明と `02-guide-for-human.md` の `_assets/flow.svg` である)

`path` は解説書に書いてある `![alt](path)` という書式の説明そのものである。実在する
画像ではない。 `"` `...` `_assets/x.svg` も同じで、 書式を説明する文にクエリが当たっている。
記法を説明している文書を含む一式では、 こういう見かけの当たりが混ざる。

バックスラッシュを使わずに `![...](...)` を切り出すため、 `split()` を 3 回重ねている。

### G33. `$` の罠を含む行を探す

**Type**: SECTION

**`$` が段落や表のセルの最後の 1 文字になっていると、 HTML の export が
`error: string index out of range` だけを出して止まる。** ファイル名も行番号も出ない。

ところが JSON の export は成功する (実測)。だから JSON を出してからこのクエリを
当てれば、 HTML を作る前に場所が分かる。

```bash
jq -r '.DOCUMENTS[] | .UID as $doc | recurse(.NODES[]?) | (.STATEMENT? // "")
| split("\n") | map(rtrimstr("\r"))
| reduce .[] as $line ({open: 0, out: []};
    ([$line | scan("^`{3,}")] | (.[0] // "") | length) as $w
    | if $w > 0
      then (if .open == 0 then .open = $w elif $w >= .open then .open = 0 else . end)
      else (if .open == 0 then .out += [$line] else . end)
      end)
| .out[]
| select(test("[^$][$] *$") or test("[^$][$] *[|]"))
| $doc + "  " + .' <json>
```

このサンプルでは 0 件。0 件が正常である。 わざと壊した文書に当てると、 こう出る:

```text
DOC-LINT  CRASH  paragraph ending in math $T$
DOC-LINT  CRASH  bare trailing dollar 100 $
DOC-LINT  SAFE   escaped trailing dollar 100 \$
DOC-LINT  | CRASH cell ending in math | $T$ |
```

`reduce` の部分はコードフェンスの中身を捨てている。 `$` はフェンスの中では
無害なので、 捨てないと誤検出だらけになる。

開いたフェンスの記号の長さを覚えておき、 同じ長さ以上の記号でだけ閉じる。
`` ` `` 3 個で切って偶数番目を取る、 という簡単なやり方もあるが、 **それは
` ```` ` の中に ` ``` ` が入っている文書で破綻する。** 本書と `00-ai-guide.md` が
まさにその形である。簡単な版を当てると、 この 2 書ではフェンスの内と外が入れ替わり、
フェンスの中の行を「外」として拾う (実測)。
いまのサンプルはその拾った範囲に `$` で終わる行を持たないので誤検出は 0 件で済むが、
それは運である。行を 1 行足せば出る。

誤検出は 1 種類だけある — `\$` と書いて逃がしてある行も出る (上の 3 行目)。
逃がしてあるなら安全なので、 見て飛ばす。

### G34. 図を書き換えて `.md` に戻す

**Type**: SECTION

**JSON から `.md` へ機械的に書き戻すことはできない。** JSON にファイルパスが
入っていないためである (本書冒頭の注意)。手順は次のとおり。

1. 図を取り出す — G28。

2. どのファイルにあるかを突き止める。 UID の宣言を固定文字列で探す。
   `-F` を付けるのは `**` を正規表現と解釈させないためである。

```bash
grep -rlF '**UID**: DOC-FIG-STATE' <仕様書のフォルダ> --include=*.md
```

```text
samples/md-basic-ja/00-ai-guide.md
samples/md-basic-ja/01-ai-queries.md
samples/md-basic-ja/_assets/fig-state.md
```

本物の宣言は `_assets/fig-state.md` だけである。 上の 2 書はこの手引き自身で、
`**UID**: DOC-FIG-STATE` という文字列を見本として本文に載せているために当たる。
`grep` はフェンスの中と外を区別しないので、 記法を説明する一式では当たりを目で選ること。

UID を書いてあるだけのファイルは出ない。 上のクエリは `**UID**:` の宣言に
一致するので、 `[LINK: DOC-FIG-STATE]` で参照しているだけの `06-lower.md` は外れる。
`output/` を消してから当てること。消さないと export した控えも当たる。

3. その `.md` を直接編集する。 フェンスの中身を差し替える。

4. 横に並ぶ数を測り直す。 目安を超えたなら、 本文にあった図は
   `_assets/fig-*.md` へ移し、 元の場所には `[LINK:]` を残す (G29)。

5. 再度 export する。 StrictDoc は JSON を自動では更新しない。

```bash
strictdoc export <仕様書のフォルダ> --formats=json --output-dir <出力先>
```

6. HTML も通ることを確かめる。 `--formats=json` は `$` の罠を素通しする。
   図や数式を触ったときは `--formats=html` も必ず通す。

```bash
strictdoc export <仕様書のフォルダ> --formats=html --output-dir <出力先>
```

### G35. 添付ファイルが届いているか

**Type**: SECTION

参照先が無い場合と、 `_assets/` の外に置いた場合の両方を 1 本で捕まえる。
どちらも export のログには何も出ない。

`jq` が挙げた参照を、 export した HTML の側に実在するかで判定するので、
`--formats=html` を先に通しておくこと。

**フェンスと行内コードを先に落とすこと。** 記法を説明する文書は `![alt](path)` の
ような書き方そのものを本文に抱えており、 落とさずに走らせるとこの一式で 7 行の
偽の参照が出る (実測)。

```bash
jq -r '.DOCUMENTS[] | recurse(.NODES[]?) | ((.STATEMENT? // "") | gsub("\r"; ""))
| split("\n")
| reduce .[] as $line ({open: 0, out: []};
    ([$line | scan("^`{3,}")] | (.[0] // "") | length) as $w
    | if $w > 0
      then (if .open == 0 then .open = $w elif $w >= .open then .open = 0 else . end)
      else (if .open == 0 then .out += [$line] else . end)
      end)
| .out[] | gsub("`[^`]*`"; "")
| split("](") | .[1:][] | split(")")[0]
| select(startswith("http") or startswith("#") | not)' <json> \
  | tr -d '\r' | sort -u \
  | while read -r p; do [ -f "<出力先>/html/<仕様書のフォルダ名>/$p" ] || echo "NOT PUBLISHED  $p"; done
```

0 件が正常である。 この形なら解説文書を外さなくてよく、 この一式の 29 件の参照
(写真 27 枚・図 1 つ・資料 1 つ) を全部検査したうえで 0 件になる (実測)。

### G36. 表を丸ごと取り出す

**Type**: SECTION

要求なら `UID`、 地の文なら `_TOC` で場所を指す (G27 の 2 列目がその値である)。

```bash
jq -r --arg doc DOC-LOWER --arg at 6.1 '.DOCUMENTS[] | select(.UID == $doc) | recurse(.NODES[]?)
| select((.UID? // ._TOC? // "") == $at) | (.STATEMENT? // "")
| split("\n")[] | select(startswith("|"))' <json>
```

```text
| 記号              | 単位   | 意味                                      |
| ----------------- | ------ | ----------------------------------------- |
| $S_{need}$ バイト | バイト | 変換に必要な空き容量                      |
| $S_{out}$ バイト  | バイト | 出力ファイルの大きさ                      |
| $S_{tmp}$ バイト  | バイト | 一時ファイルの大きさ。 $S_{out}$ と等しい |
| 経路              | —      | `入力 \| 変換 \| 出力` の 3 段            |
```

`--arg` で場所を渡すので、 クエリの本体は書き換えずに使い回せる。
**両端にパイプを書いていない表はこれで拾えない。**

### G37. 崩れる表を探す

**Type**: SECTION

0 件が正常である。 表を書き足したら毎回これを通す。セルの数が見出し行と違う行は、
HTML にしたときに黙って欠ける。

```bash
jq -r '.DOCUMENTS[] | .UID as $doc | recurse(.NODES[]?) | select(.STATEMENT?) as $n
| ($n.UID // $n._TOC // "-") as $at
| $n.STATEMENT | split("\n")
| reduce .[] as $line ({open: 0, want: 0, bad: []};
    ([$line | scan("^`{3,}")] | (.[0] // "") | length) as $w
    | if $w > 0
      then (if .open == 0 then .open = $w elif $w >= .open then .open = 0 else . end)
      elif .open > 0 then .
      elif ($line | startswith("|"))
      then ([$line | scan("[^\\\\][|]")] | length) as $c
           | if .want == 0 then .want = $c elif $c != .want then .bad += [$line] else . end
      else .want = 0
      end)
| .bad[] | $doc + "  " + $at + "  " + .' <json>
```

わざと壊した文書に当てると、 こう出る。

```text
DOC-TBL  4.1  | コード印 | `a | b` |        <- コード印は | を守らない
DOC-TBL  4.1  | 逃がさない | a | b |        <- 逃がしていない
DOC-TBL  5.1  | 少ない | 行 |               <- セルが足りない
DOC-TBL  5.1  | 多い | 行 | です | よ |     <- 「よ」が HTML で消える
```

見出し行の区切りの数を覚えておき、 違う行を報告する。 `scan("[^\\\\][|]")` が
`\|` と逃がしたものを数えないので、 正しく逃がした行は出ない。
**このクエリだけは jq の文字列に \\\\ と 4 本書く** — jq が半分に畳むので、 正規表現に届くのは 2 本である。 2 本しか書かないと文字クラスが `[^\]` になり、 「パイプの直前」という条件が消えて全行が誤検出される (実測)。
落ちるなら `.jq` ファイルに書いて `-f` で渡すこと (G0)。
