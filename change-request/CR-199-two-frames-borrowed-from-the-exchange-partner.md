# CR-199 — 交換相手から 2 つの枠を借りる

> **閉じるもの**: 裁定 `D7`（`previous-project-result/temp/rulings-2026-08-21.md` の §2 と §7）。
> ⭐ **`fadeInDays` / `fadeOutDays` を MSPDI の拡張領域へ書き出す方式を確定する。**
> ⛔ **番号 2 つはマジックナンバーである。正は原稿ただ 1 つとし、仕様書もコードもそこを指す**（利用者の指示）。
> ⚠️ **`FR-021` と `PR-14` の食い違いも同時に直す** —— 同じ 2 列について 2 つの表が違うことを書いている。

## 0. ⛔ 立ちどまって答える 3 つ（**検査 22 が空欄を許さない**）

### ① これは `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-3`（構造を持つ日程データとして他のソフトへ渡す）を進める。受ける目標は `GL-003`。**
⛔ **フェードは `GRS` 固有の 2 列であり、それを渡す手段が決まっていなかった。**
`src/adapter/document-codec/mspdi-codec.ts:1247` が、その穴を自分で記録している:

```
⚠️ STOP -- AT-40 and AT-41 name `Task/ExtendedAttribute` as the place the
fade days ride in, and no row anywhere names WHICH extended attribute.
… so choosing one here would decide a value the document exchanges.
The extended attributes stay in `carryElements` untouched and both columns
read null. Reported.
```

⭐ **`CH-5`（人の手で作った日程表を、壊さずに読み書きできるようにする）も進める。受ける目標は `GL-005`。**
⛔ **相手の枠を奪わない規則（`EX-6`）は在るのに、「空き枠」が何を指すかが決まっていない。**

### ② `review-standards` のどの条項を当て、何が出たか

| 条項 | 当てた対象 | 結果 |
|---|---|---|
| **`R1.3`**（矛盾が無い。唯一の正がある）| `PR-14` と `AT-40` / `AT-41` | ⛔ **本物の違反。** `PR-14`（`:1395`）の MSPDI の欄は **「無い（拡張領域はこの 2 つだけ）」**、`AT-40` / `AT-41`（`fig-erd-detail.md:342-343`）は **`Task/ExtendedAttribute`**。⭐ **意図は同じだが、字面は「書き出さない」とも読める** |
| **`R1.2`**（曖昧・非検証な表現の排除）| `EX-6` の「空き枠」| ⛔ **本物の違反。** 何本あるのか、どの順に探すのかが無い。⭐ **仕様にも `docs/reference/mspdi/` にも `Number` 枠の本数は書かれていない**（数えた） |
| **`R4`**（DRY）| 番号 2 つの置き場 | ⭐ **原稿ただ 1 つとした。** ⛔ **仕様書に数を書かない。コードにも打たない**（規則 03 の 1.「名前を写すのではなく、値を生成する」）—— **仕様書は出どころを指し、コードは生成物から読む** |
| **`R1.3`**（同上）| `DF-5`（表 T-053）との緊張 | ⛔ **一度は違反に見えた。** `DF-5` は「交換相手の木に対応が無いものは、新しいまとまりとして足すこと（MUST）。相手の要素の位置を借りてはならない（MUST NOT）」と書く。⭐ **違反ではないと判断した** —— **`DF-5` が守っているのは `GRS` の文書の形であり、拡張領域は交換相手が「対応の無い値のために」自ら用意した位置である。** ⚠️ **`FR-075` の `:1104` が既に「書き出しで拡張領域を出さない」と書いており、出す前提が仕様に在る**（§0 ⑧ の 6） |
| **`R1.3`**（同上）| `SO-11`（範囲外）との緊張 | ⭐ **矛盾しない。** `SO-11` が範囲外とするのは「カスタムフィールドの**汎用機構**」であり、**固定した 2 枠を借りることはそれではない**（§0 ⑧ の 7） |
| **`R2.9`**（YAGNI）| 借りる枠の数 | ⭐ **2 本だけ。** ⛔ **枠の名簿を作らない** —— **引用できる番号が 2 つしか無いからである**（§0 ⑧ の 3） |
| **`R3.3`**（外部入力を検証する）| 取り込み側 | ⭐ **`FieldID` が名簿に在り、かつ定義の `Alias` が `GRS` のものであるときだけ読む。** ⛔ **`FieldID` だけで読むと、相手が `Number1` に入れた原価見積もりをフェード日数として取り込む** |
| **`CN-7`**（表 T-003。第三者著作物）| 引用する要素名と番号 | ⭐ **出典をファイル名と行番号で書いた。** ⚠️ **番号 2 つだけは手元の正典に無い** —— **外部の列挙表が唯一の出どころである。原稿にそう書かせた**（§0 ⑧ の 4）|

### ⑧ 利用者に問わずに決めたこと（**覆してよい**）

| | 決めたこと | 何に載せたか |
|---|---|---|
| 1 | 原稿を **`docs/spec/_source/mspdi-custom-fields.json`** として新設した | ⛔ **`erd.json` へは入れられない** —— `erd.schema.json` の `column` は `additionalProperties: false` で、必須 8 鍵が決まっている。**根も `additionalProperties: false` である。** ⭐ **`display-words.json`（`CR-194`）が「値だけを持つ小さな原稿」の直近の先例である** |
| 2 | 手書きの契約 **`mspdi-custom-fields.schema.json`** を添えた | ⭐ **`erd.json` も `settings.json` も「1 バイト書く前に検証する」形を持っている。** ⛔ **添えないと、原稿に機械検査が 1 つも掛からない** |
| 3 | 枠の名簿を **2 本に限った** | ⛔ **`Number3` 以降の番号を推測しない**（規則 02 の 3.「その場で値を決めない」）。⚠️ **`Number1..Number20` は MS Project の一般的な事実だが、`docs/reference/mspdi/` に 1 件も書かれていない**（`Number1` も `pjCustomTaskNumber` も 0 件。数えた）。⭐ **名簿を増やすには番号を 2 つ引くのと同じ作業が要る** |
| 4 | 原稿に **「これは `GRS` の決定ではなく引用である」と名乗らせた** | ⛔ **検査 21 が「`_source` の各ファイルは自分が何であるかを述べる」を要求している**（利用者の指示でもある）。⚠️ **番号の出どころは外部の `MicrosoftDocs/VBA-Docs` だけであり、手元の正典に無いこともそこに書いた** |
| 5 | 検算を原稿に**記録した** | ⭐ **`pjCustomTaskText1 = 188743731` が、手元の `custom-field-data-in-xml.md:52` と `fieldid-element.md:54` の実例と 1 桁も違わず一致する。** **独立した 2 つの出どころが同じ値を示したので、同じ表から採った 2 つを信じてよい** —— ⚠️ **その論拠ごと原稿に書いた。書かないと、次に読む者が番号だけを見て「どこから来たのか」を問う** |
| 6 | `DF-5` を**変えなかった** | ⭐ **拡張領域は「対応の無い値のために交換相手が用意した位置」である。** ⛔ **`DF-5` が禁じているのは、意味の違う相手の要素を流用することである。** ⚠️ **`FR-075` の `:1104` が既に「`null` のときは書き出しで拡張領域を出さない」と書いており、出す前提が仕様に在った** |
| 7 | `SO-11` を**変えなかった** | ⭐ **範囲外なのは「利用者が任意のカスタムフィールドを定義できる機構」である。** 本 CR が作るのは **`GRS` 自身の 2 列を運ぶ固定の経路**であり、利用者に何も見せない |
| 8 | 空き枠の探索順を **名簿の順**とした | ⭐ **`fadeInDays` は `Number1`、`fadeOutDays` は `Number2` を第 1 希望とし、塞がっていたらもう一方を試す。** ⛔ **両方塞がっていたら書かずに知らせる**（`EX-6` がそう定めている）|
| 9 | 「塞がっている」の判定を **`Alias`** とした | ⭐ **取込元が持ち込んだ定義は `Project.carryElements` に原形のまま在る**（`DF-2`）。**その `FieldID` の定義の `Alias` が `GRS` のものでなければ、相手が使っている。** ⚠️ **人が相手のツールで `Alias` を書き換えると、`GRS` は自分の枠を他人のものと見て隣へ移る** —— ⭐ **安全な側へ倒れる**（相手の値を壊さない）ので許容する |
| 10 | 取り込み側も **`Alias`** で見分けることにした | ⛔ **`FieldID` だけで読んではならない。** ⭐ **`Task/ExtendedAttribute` の子は `FieldID` / `Value` / `ValueGUID` / `DurationFormat` の 4 つだけで、`FieldName` が無い**（`mspdi_pj12.xsd:2254-2269`）。**値の側からは番号しか分からないので、定義の側を見る。** ⚠️ **合わなければ解釈せず `carryElements` に残す**（`DF-2`）|
| 11 | 定義を **書き出しのたびに作る**ことにした | ⭐ **文書は定義を持たない。** ⛔ **`Project/ExtendedAttributes` を空で書いてはならない** —— XSD の注記が「各 `ExtendedAttributes` には少なくとも 1 つの `ExtendedAttribute` が要る」と書いている（`mspdi_pj12.xsd:988`）。**フェードを持つタスクが 1 つも無ければ、まとまりごと書かない** |
| 12 | ⛔ **表 T-059 に行を足さなかった** | ⚠️ **一度は足そうとした。** ⭐ **同表の節の題は「列にせず、書き出すときに作るもの」であり、10 行とも 1 つの値である。** **定義のまとまりは値ではなく、列についてのメタデータである。** ⛔ **足すと、同表の「全数」の意味が 2 通りになる。** ⚠️ **代わりに規則を 表 T-033 に置いた**（規則は要求の側の表、値は原稿）|

⚠️ **決めていないこと**: ⛔ **`Alias` に入れる語そのものである。** XSD が 50 字に限っており（`mspdi_pj12.xsd:1055`）、
**相手のツールの列見出しに出る。** ⭐ **原稿に鍵だけを置き、語は空にした** —— `display-words.json` と同じ形である。
⚠️ **ただし `Alias` は画面に刷る語ではない**（`FR-038` の辞書には入れない）。**交換相手のファイルへ書く値であり、
`GRS` が自分の枠を見分ける鍵でもあるので、訳してはならない。**

---

## 1. 測った（⛔ 2 本とも走らせた）

```
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py PR-14 EX-6 AT-40 AT-41 T-016 T-033 T-058
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py PR-14 T-016 AT-40 AT-41 T-058 EX-6 \
    T-033 FR-057 FR-075 DF-1 DF-5 T-053 SO-11 T-002 CN-7 T-003 T-059 FR-021 FR-023 SWS-6
```

| | 実測 |
|---|---|
| 誘導部分グラフ（種 20 個）| 種 **20/20 が解決**。辺 10・**閉路 1 個（大きさ 2: `FR-021` ↔ `SWS-6`）** |
| ⛔ その閉路を触るか | ⭐ **触らない。** `SWS-6` は `CR-198` が置いたばかりであり、本 CR は要求も `SWS` も編集しない |
| `PR-14` を指している箇所 | 要求 1 件（`FR-075`）／ 参照 2 箇所 |
| `EX-6` / `AT-40` / `AT-41` を指している箇所 | ⛔ **どれも 0 件。** 3 行とも浮いている |
| 表 T-016 を指している要求 | 12 件。2 次で 19 件 —— ⚠️ **`PR-14` の 1 セルを直すだけなので、指している側は動かない** |
| 結論 | ⭐ **1 つずつ順に書いてよい** |

⚠️ **`induced.py` は種が 1 つも解決しないと拒んで止まる。** 本件は 20 個とも解決しているので、**閉路 1 個は本物である。**

---

## 2. 何が壊れていたか（**逐語**）

### #1 —— 同じ 2 列について、2 つの表が違うことを書いている

`docs/spec/01-04-requirements.md:1395`（表 T-016 の `PR-14`）:

```
| PR-14 | fadeInDays / fadeOutDays | フェードイン日数 / フェードアウト日数 | … | 無い（拡張領域はこの 2 つだけ）|
```

`docs/spec/_assets/fig-erd-detail.md:342-343`（表 T-058）:

```
| AT-40 | Task | fadeInDays  | 整数（日数）| 可 | — | Consume | Task/ExtendedAttribute | 左のぼかしの日数 … |
| AT-41 | Task | fadeOutDays | 整数（日数）| 可 | — | Consume | Task/ExtendedAttribute | 右のぼかしの日数。同上 |
```

⚠️ **隣の行と比べると、`PR-14` の欄が何を書く欄なのかが分かる** —— `PR-3` は `Task/Start` `Task/Finish` と書く。
⛔ **その欄に「無い」と書けば、「書き出さない」と読める。**

### #2 —— 「空き枠」が何を指すかが無い

`docs/spec/01-04-requirements.md:2945`（表 T-033 の `EX-6`）:

```
| EX-6 | フェード日数を書き出す拡張領域の枠を取込元が既に使っているとき、相手の値を上書きしてはならない（MUST NOT）。
空き枠へ移して知らせ、空き枠が無ければ書き出さずに知らせること |
```

⛔ **方式は決まっているのに、枠が何本あるのかも、どの順に探すのかも、
「取込元が使っている」をどう見分けるのかも無い。**

### #3 —— 値の側からは、番号しか分からない

`docs/reference/mspdi/mspdi_pj12.xsd:2253-2269`（`Task/ExtendedAttribute` の `xsd:sequence`）:

```
FieldID (xsd:string, minOccurs=0) / Value (xsd:string, 0) /
ValueGUID (xsd:integer, 0) / DurationFormat (列挙, 0)
```

⛔ **`FieldName` が無い。** `docs/reference/mspdi/learn-docs/project-xml-data-interchange/custom-field-data-in-xml.md:216`:

```
The custom field ID is used to link the custom field value to the custom field definition.
```

⚠️ **XSD は `FieldID` すら `minOccurs="0"` としているが、値と定義を結ぶのはそれだけである。**
⛔ **書かなければ、その値がどの列のものか誰にも分からない。**

---

## 3. 何を書くか（**オブジェクトごとに 1 回**）

| # | オブジェクト | 何をするか |
|---|---|---|
| 1 | `docs/spec/_source/mspdi-custom-fields.json` | **新設**（原稿。番号 2 つ・`CFType`・`ElemType`・`Alias` の枠）|
| 2 | `docs/spec/_source/mspdi-custom-fields.schema.json` | **新設**（手書きの契約）|
| 3 | `tools/generate_mspdi_custom_fields.py` | **新設**（原稿 → `src/adapter/document-codec/mspdi-custom-fields.json`）|
| 4 | `package.json` | `gen` と `gen:check` に繋ぐ |
| 5 | `docs/spec/_source/erd.json` の `fadeInDays` / `fadeOutDays` の `meaning` | **触らない**（下を見よ）|
| 6 | `docs/spec/01-04-requirements.md:1395`（`PR-14`）| MSPDI の欄を `AT-40` / `AT-41` と揃える |
| 7 | `docs/spec/01-04-requirements.md` 表 T-033 | `EX-6` を書き替え、`EX-8` を 1 行足す（定義の書き方）|
| 8 | `docs/spec/05-07-design.md` Chapter 6.2 | 新しい原稿を名指しする |
| 9 | `docs/spec/A-appendix.md` | 変更履歴に 1 行 |

⛔ **`erd.json` を触らない** —— `AT-40` / `AT-41` の `exchange` は既に `Task/ExtendedAttribute` で正しい。
⛔ **要求は 1 本も足さない。表も図も UID も足さない。**

### 数の予測

| | 前 | 後 |
|---|---|---|
| `tables` | 127 | **127** |
| `figures` | 11 | **11** |
| `rows` | 1569 | **1570**（`EX-8`）|
| `uids` | 146 | **146** |
| 表 T-033 の行 | 7 | **8** |
| `_source` の生成物を名乗るファイル | 12 | **13** |
| 重複検出 | `A=26 new 0` | **`A=26 new 0`** |

---

## 4. 原稿の中身（**書く前に置く**）

```
枠 1   pjCustomTaskNumber1 = 188743767   ← fadeInDays を第 1 希望とする
枠 2   pjCustomTaskNumber2 = 188743768   ← fadeOutDays を第 1 希望とする
型     CFType 5（Number）／ ElemType 20（Task）／ UserDef true
Alias  ⛔ 空。利用者が埋める。⚠️ 50 字まで（mspdi_pj12.xsd:1055）
出典   MicrosoftDocs/VBA-Docs の PjCustomField 列挙
       https://github.com/MicrosoftDocs/VBA-Docs/blob/main/api/Project.PjCustomField.md
検算   pjCustomTaskText1 = 188743731 が
       docs/reference/mspdi/learn-docs/.../fieldid-element.md:54 と
       同 custom-field-data-in-xml.md:52 の実例に一致する
```

---

## 5. 表 T-033 に書くもの（**書く前に置く**）

```
EX-6（書き替え）
  フェード日数を書き出す枠は _source/mspdi-custom-fields.json が持つ名簿とし、
  その順に空きを探すこと（MUST）。
  取込元が使っている枠を上書きしてはならない（MUST NOT）。
  空き枠が無ければ書き出さずに知らせること（MUST）。
  ⭐ 取込元が使っているかどうかは、Project/ExtendedAttributes の定義の Alias が
     名簿の Alias と一致するかで見分けること（MUST）。
     値の側は FieldID しか持たない（mspdi_pj12.xsd:2254）。

EX-8（新設）
  拡張領域へ値を書くときは、Project/ExtendedAttributes に定義を 1 度だけ書くこと（MUST）。
  子の順は XSD の xsd:sequence に従う（MUST）。
  ⛔ フェードを持つタスクが 1 つも無いときは、まとまりごと書かないこと（MUST NOT で空を禁じる）
     —— XSD が「各 ExtendedAttributes には少なくとも 1 つ要る」と定める。
```

---

## 6. `src/` で何を書くか（**仕様書ではない側**）

| ユニット | ファイル | 何をするか |
|---|---|---|
| `UF-36` | `adapter/document-codec/mspdi-codec.ts` | ⛔ **`:1247` の `STOP` を消す。** 生成物から番号を読み、`EX-6` / `EX-8` に従って書き、`Alias` で見分けて読む |

⛔ **数をコードに打たない**（規則 03 の 1.）。⭐ **生成された `mspdi-custom-fields.json` から読む。**
⚠️ **コメントには意味と出どころを書く** —— 「これは MS Project の `Number1` 枠である」「出どころは `PjCustomField` 列挙」。
⛔ **本文を写さない。行 ID とファイル名を書く。**

---

## 7. ⛔ 本 CR が閉じないもの

| | 件 | 状態 |
|---|---|---|
| `Alias` の語 | ⛔ **空のまま。** ⭐ 利用者が原稿を埋める。⚠️ **埋まるまで `GRS` は自分の枠を見分けられない**ので、実装は「`Alias` が空なら枠を使わない」に倒すこと |
| 枠を 3 本以上に増やすこと | ⛔ **しない。** ⭐ **番号を引ける先が外部の列挙表 1 つしか無い** |
| ⚠️ **番号 2 つが手元の正典に無いこと** | ⛔ **解消していない。** ⭐ **原稿にそう書かせた** —— 検算が効くのは `Text1` の 1 件だけである |
