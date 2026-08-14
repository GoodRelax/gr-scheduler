# A10 — MSPDI 日本語要約（参考）の検証

**位置づけ**: `previous-project-result/01-mspdi/` の日本語要約 4 本は**正ではない**。
本書は 4 本を全文読み、その主張を **`docs/reference/mspdi/mspdi_pj12.xsd` に当てて反証を試みた結果**である。
**XSD が正**。要約を根拠に使った記述は本書に 1 行も無い。

## 読んだ文書と行数

| # | 文書 | 行数 | 読んだ範囲 |
|---|---|--:|---|
| 1 | `previous-project-result/01-mspdi/mspdi-core-tree.md` | 669 | **全文** |
| 2 | `previous-project-result/01-mspdi/mspdi-enums-ja.md` | 326 | **全文** |
| 3 | `previous-project-result/01-mspdi/mspdi-pitfalls-ja.md` | 331 | **全文** |
| 4 | `previous-project-result/01-mspdi/mspdi-tables.md` | 324 | **全文** |
| 5 | `previous-project-result/01-mspdi/mspdi/README.md` | 100 | **全文**（XSD の所在・正の定義） |
| 6 | `docs/reference/mspdi/mspdi_pj12.xsd` | 3906 | **全文を機械パース**（要素宣言 681・ユニーク要素名 499・enum 53 要素/535 値・必須 25 宣言・XML コメント 44 件を全数抽出。加えて lxml で 30 本の妥当性実験を実行） |
| 7 | `previous-project-result/temp/inventory/E05-calendar.md` | 250 | **全文**（在庫表との突合） |
| 8 | `previous-project-result/temp/inventory/E03-dependency-taskgroup.md` | 158 | **全文**（同上） |
| 9 | `previous-project-result/temp/inventory/E01,E02,E04,E06,E07,E09,E10,E11` | 2972 | **MSPDI に触れる行のみ**（機械検索。全文は読んでいない） |

**出典の書き方**: `ファイル名:行番号`。XSD は `mspdi_pj12.xsd:NNN`（実体は `docs/reference/mspdi/mspdi_pj12.xsd`）。

### 検証の方法（自分でやったこと）

| 手段 | 内容 |
|---|---|
| 機械パース | `xml.etree` で全 `xsd:element` を親パス付きで抽出（681 宣言）。`minOccurs` / `maxOccurs` / `type` / ファセット / `xsd:enumeration` を全数収集 |
| 妥当性実験 | `lxml.etree.XMLSchema` で 30 本の最小文書を実際に検証（下表の「妥当性実験」列） |
| ハッシュ照合 | `docs/reference/mspdi/mspdi_pj12.xsd` の SHA-256 = `a3e9138f…` / 239,895 バイト / 3,906 行 は `mspdi/README.md:79`–`:82` の記載と**一致**。要約が書かれた版と同一物である |

---

## 1. 要約が正しかった主張（XSD で裏が取れたもの）

| # | 要約の主張 | 出典（要約） | XSD 実測 | 出典（XSD） |
|---|---|---|---|---|
| V-1 | 総行数 3906 / ユニーク要素名 **499** | `mspdi-pitfalls-ja.md:30` | 3906 行 / 499 名 | `mspdi_pj12.xsd`（全文計数） |
| V-2 | named complexType は **`TimephasedDataType` の 1 つだけ** | `mspdi-pitfalls-ja.md:31` | 1 つ。named simpleType は 0 | `mspdi_pj12.xsd:26` |
| V-3 | `xsd:unique` / `key` / `keyref` が **0 件** | `mspdi-pitfalls-ja.md:28,46` | 0 件 | 全文 grep |
| V-4 | `elementFormDefault="qualified"` / 属性は 0 個 / トップレベル要素は `Project` だけ | `mspdi-core-tree.md:427`–`:430` | 一致。`xsd:schema` の直下は `TimephasedDataType` と `Project` の 2 つのみ | `mspdi_pj12.xsd:24` |
| V-5 | `Project` 直下 = スカラー **63** ＋ 容れ物 **7** = **70** | `mspdi-core-tree.md:43,63,447` / `mspdi-pitfalls-ja.md:31` | 70 子要素。64〜70 が容れ物 | `mspdi_pj12.xsd:232`–`:730` |
| V-6 | `Project` の宣言順 70 個（`SaveVersion`(1) … `Assignments`(70)） | `mspdi-core-tree.md:449`–`:467` | **全 70 名・全順序が一字一句一致** | 機械抽出 |
| V-7 | `Task` 96（91＋子 5）・必須は `UID`(1)・`PredecessorLink` は **85 番目**・`Stop`(18)/`Resume`(19)/`ResumeValid`(20) | `mspdi-core-tree.md:473`–`:500` / `mspdi-pitfalls-ja.md:32` | **全 96 名・全順序が一致** | 機械抽出 |
| V-8 | `Resource` 71（65＋子 6） | `mspdi-core-tree.md:502`–`:519` | **全 71 名・全順序が一致** | 機械抽出 |
| V-9 | `Assignment` 265（61＋201＋子 3）・`f404000`〜`f4040c8` が 64〜264・`TimephasedData` が 265 | `mspdi-core-tree.md:521`–`:541` / `mspdi-pitfalls-ja.md:34` | **全 265 名・全順序が一致**。f404 は 201 個 | `mspdi_pj12.xsd:3691`–`:3891` |
| V-10 | 4 つの容れ物は**すべて `xsd:sequence`**。省略可・並べ替え不可 | `mspdi-core-tree.md:439` / `mspdi-pitfalls-ja.md:155` | 一致。**妥当性実験**: `CurrencyCode` を `SaveVersion` より前に出すと非妥当 | 実験 |
| V-11 | **最小妥当文書**は `SaveVersion` ＋ `CurrencyCode` の 2 要素 | `mspdi-core-tree.md:543`–`:553` | **妥当性実験で valid=True を確認**。`CurrencyCode` を落とすと非妥当 | 実験 |
| V-12 | `Project/UID` は `xsd:string maxLength=16` かつ `minOccurs=0`（GUID を入れられない） | `mspdi-pitfalls-ja.md:62`–`:76` | XSD 238–246 行がそのとおり | `mspdi_pj12.xsd:238`–`:246` |
| V-13 | `TimephasedData.UID` は自己識別で**必須** | `mspdi-pitfalls-ja.md:84`–`:90` | `type="xsd:integer"`・`minOccurs` 属性なし。doc は "the timephased data **record**"。**実験**: `UID` 無しは非妥当 | `mspdi_pj12.xsd:187` |
| V-14 | `PredecessorLink` の子は **6 つだけ**で識別子が無い | `mspdi-pitfalls-ja.md:92`–`:96` | `PredecessorUID`/`Type`/`CrossProject`/`CrossProjectName`/`LinkLag`/`LagFormat`。**6 つとも `minOccurs=0`＝必須ゼロ** | `mspdi_pj12.xsd:2162`–`:2237` |
| V-15 | 同一ペア・同一 `Type` の `PredecessorLink` 重複が妥当 | `mspdi-pitfalls-ja.md:50`–`:58` | **実験で valid=True**（`maxOccurs="unbounded"`） | 実験 |
| V-16 | `Ltuid` は XSD 1075 行にある（`UID` の grep では取りこぼす） | `mspdi-pitfalls-ja.md:100` | `<xsd:element name="Ltuid" type="xsd:string" minOccurs="0">` | `mspdi_pj12.xsd:1075` |
| V-17 | `Calendars` を出すなら `Calendar` が 1 個以上（`minOccurs=1`） | `mspdi-pitfalls-ja.md:163`–`:169` | `minOccurs="1"`。**実験**: `<Calendars/>` は非妥当、`<Tasks/>` は妥当 | `mspdi_pj12.xsd:1204` |
| V-18 | `Assignment.TaskUID`/`ResourceUID` は `minOccurs=0`。**`-1`＝未割当は XSD に無い** | `mspdi-pitfalls-ja.md:135`–`:141` | 両方 `minOccurs="0"`。**XSD 全文に文字列 `-1` は 0 件**。doc も特別扱いを書かない | `mspdi_pj12.xsd:3201`,`:3207` |
| V-19 | `Exception.TimePeriod` は `Type` と組で読む（1〜8 は繰返し範囲） | `mspdi-pitfalls-ja.md:175`–`:191` | `TimePeriod` doc = "Defines a **contiguous set of exception days**"、`Occurrences` doc = "The number of **occurrences** for which the calendar exception is valid"、`Type` は 1〜9 の 9 値 | `mspdi_pj12.xsd:1342`,`:1363`,`:1378` |
| V-20 | 例外日には 2 系統ある（`WeekDay/DayType=0`＋`TimePeriod` と `Exceptions/Exception`） | `mspdi-pitfalls-ja.md:193`–`:206` | `WeekDay/TimePeriod` の doc も同じ "contiguous set of exception days" | `mspdi_pj12.xsd:1269`,`:1271` |
| V-21 | 階層に親ポインタが無い（`OutlineLevel`＋文書順） | `mspdi-pitfalls-ja.md:208`–`:214` | `Task` に親を指す要素は無い（96 名を全数確認）。`OutlineLevel` は `xsd:integer` | 機械抽出 |
| V-22 | マイルストーン専用要素は無い（`Milestone` bool のみ） | `mspdi-pitfalls-ja.md:216`–`:218` | `Milestone` は `xsd:boolean`・`minOccurs=0`。他に該当要素なし | `mspdi_pj12.xsd`（Task 96 名） |
| V-23 | コスト資源は `Resource/Type` に無く `IsCostResource`(bool) | `mspdi-pitfalls-ja.md:224`–`:228` | `Type` は 2 値（0=Material, 1=Work）。`IsCostResource` は別要素（65 番目） | `mspdi_pj12.xsd`（Resource 71 名） |
| V-24 | `Baseline/Number` は 3 か所で型も必須性も違う | `mspdi-pitfalls-ja.md:249`–`:259` | Task=`xsd:integer minOccurs=0` / Resource=`xsd:integer` 必須 / Assignment=**`xsd:string`** 必須。**実験**: Assignment で `Number>abc<` が valid、Resource で `Number` 欠落は非妥当 | `mspdi_pj12.xsd:2318`,`:2977`,`:3651` |
| V-25 | `ValueGUID` は名前に反して `xsd:integer`、`FieldGUID` は `xsd:string` | `mspdi-pitfalls-ja.md:261`–`:263` | 一致 | `mspdi_pj12.xsd:2264`,`:787` |
| V-26 | `WorkingTimes` は `WeekDay` と `Exception` の 2 箇所だけ。`WorkWeek/WeekDay` は `DayType`+`DayWorking` の 2 子のみ | `mspdi-pitfalls-ja.md:265`–`:269` | 一致（1288 / 1468）。`WorkWeek/WeekDay` の子は 2 つ | `mspdi_pj12.xsd:1288`,`:1468`,`:1553` |
| V-27 | enum を持つ要素 **53 個** / enumeration 値 **535 個** | `mspdi-enums-ja.md:16` | **53 / 535 で完全一致** | 機械抽出 |
| V-28 | `DurationFormat` 26 値 ／ `LagFormat` は `21=null` を除いた **25 値** | `mspdi-enums-ja.md:79`–`:105` | 差集合を計算: `DurationFormat − LagFormat = {21}`、逆は空集合。26 値の 8 要素は**値集合が完全に同一**（要約の 8 要素リストと一致） | 機械抽出 |
| V-29 | `Resource/StandardRateFormat` だけが `8=material rate` を持つ（7 値）。他 3 か所は 6 値 | `mspdi-enums-ja.md:160`–`:169` | 7 / 6 / 6 / 6 で一致 | 機械抽出 |
| V-30 | `Assignment/CostRateTable` は doc に値の意味が書かれていない | `mspdi-enums-ja.md:171`–`:176` | doc = "The cost rate table used for the assignment." のみ。値は 0〜4 | `mspdi_pj12.xsd`（Assignment 14 番目） |
| V-31 | `Resource/AccrueAt` の doc に `$New4=Invalid` という残骸表記がある | `mspdi-enums-ja.md:149`–`:153` | doc 原文がそのとおり。値は 1,2,3,4 | 機械抽出 |
| V-32 | `TimephasedData/Unit` は 0,1,2,3,**5**,**8**（4・6・7 は欠番） | `mspdi-enums-ja.md:217`–`:221` | 一致 | `mspdi_pj12.xsd:211` 付近 |
| V-33 | `TimephasedData/Type` は 1〜11 と 16〜76 の **72 値**（12〜15 欠番）。16〜75 は 6 個周期 | `mspdi-enums-ja.md:223`–`:300` / `mspdi-core-tree.md:332` | 72 値・欠番も周期も doc 原文と一致。**要約の 72 行対応表は全行が doc と一致**（自分で突合） | 機械抽出 |
| V-34 | `ExtendedAttribute/ElemType` に **22=Calendar** が入っている | `mspdi-enums-ja.md:206` | 値は 20,21,22,23。doc の散文は task/resource/assignment しか挙げないのに列挙に 22=Calendar がある | 機械抽出 |
| V-35 | `OutlineCode/Values/Value/Type` は値が飛ぶ（4,6,9,15,17,21,27） | `mspdi-enums-ja.md:202`,`:211` | 一致 | 機械抽出 |
| V-36 | `Exception/DaysOfWeek` は enum ではなくビットフラグ | `mspdi-enums-ja.md:72` | `xsd:integer`・列挙ファセット無し。doc に 1/2/4/8/16/32/64 | `mspdi_pj12.xsd:1399`–`:1403` |
| V-37 | `Month` は **0=January**、`FYStartDate` は **1=January**（起点が違う） | `mspdi-enums-ja.md:70`,`:188` | 一致（12 値ずつ・起点が異なる） | 機械抽出 |
| V-38 | `LinkLag` の単位は 1/10 分 | `mspdi-core-tree.md:291` | doc = "The amount of lag in **tenths of a minute**." | `mspdi_pj12.xsd:2198` |
| V-39 | `SaveVersion` の 12 = Project 2007 | `mspdi-core-tree.md:556` | doc = "Values are: 12=Project 2007." | `mspdi_pj12.xsd:234` |
| V-40 | `Rate` は 0..25、`WorkingTime` は 0..5、`Resource/MaxUnits` の既定は 1.0 | `mspdi-core-tree.md:130`,`:199`,`:205` | `maxOccurs="25"` / `maxOccurs="5"` / `default="1.0"` | `mspdi_pj12.xsd:3090`,`:1295` |
| V-41 | `mspdi-tables.md` A-2 の別名→実名対応 16 件と行番号 | `mspdi-tables.md:76`–`:93` | **16 件すべて行番号まで一致**（736/775/866/986/1157/1241/1331/1514/1553/2248/2307/2413/2912/2971/3005/3581/3640） | 機械抽出 |
| V-42 | `mspdi-tables.md` B-1 の Project 63 スカラーの分類（14+8+8+4+9+10+4+2+4 = 63） | `mspdi-tables.md:238`–`:298` | **63 名すべてが 9 グループに過不足なく入っている**（自分で照合）。○20 / ×43 も自分で数えて一致 | 機械抽出 |

---

## 2. ⚠️ 誤り・不正確（XSD で反証できたもの）

**優先度の高い順**。「誤り」= XSD と食い違う。「不正確」= 言い過ぎ／範囲不明で、そのまま実装すると事故る。

| # | 種別 | 何が書いてあるか | 出典（要約） | XSD が示す事実 | 出典（XSD） |
|---|---|---|---|---|---|
| **X-1** | **誤り** | `mspdi-core-tree.md` の Task の XML 実例が **XSD 非妥当**である。`ActualStart`(49) `ActualFinish`(50) `PercentComplete`(44) `Stop`(18) `Resume`(19) `ResumeValid`(20) の順で並べており、宣言順に反する（2 か所: `PercentComplete` が `ActualFinish` の後、`Stop`/`Resume`/`ResumeValid` が末尾） | `mspdi-core-tree.md:245`–`:261` | **lxml で valid=False を確認**。正しい順は `Start`(13) `Finish`(14) `Duration`(15) `Stop`(18) `Resume`(19) `ResumeValid`(20) `PercentComplete`(44) `ActualStart`(49) `ActualFinish`(50)。並べ替えると valid=True。**同じ文書が `:416`–`:418` で「書き出す順は下の節が正」と自ら警告しているのに、上の実例がその規則を破っている** | 妥当性実験 ／ `mspdi-core-tree.md:473`–`:495` |
| **X-2** | **誤り** | `f404000`〜`f4040c8` は「**enterprise** カスタムフィールドの予約」で「**すべて空**」 | `mspdi-pitfalls-ja.md:279` | ①XSD 自身のコメントは「**local** custom field data」。**enterprise** の方は別スキーマ `AssnEntCF.xsd` に定義され、この 201 枠ではない。②`type` 属性が無い＝**`xsd:anyType`**。**実験で `<f404000 x="1"><Sub>1</Sub></f404000>` が valid=True**。「空」ではなく**任意の子要素・属性・テキストを持ちうる** | `mspdi_pj12.xsd:3689`,`:3690`,`:3691` ／ 妥当性実験 |
| **X-3** | **誤り（言い過ぎ）** | 「**必須は 4 種だけ**（`Project/SaveVersion`・`Project/CurrencyCode`・4 つの `UID`・`WeekDay/DayType`）。**それ以外は全部 `minOccurs=0`**」 | `mspdi-core-tree.md:441`–`:445` | **XSD 全体の必須宣言は 25 個**（`minOccurs` 属性なし 22 ＋ `minOccurs="1"` 3）。列挙外の必須が **13 個**ある: `TimephasedData/UID`・`OutlineCode/Guid`・`OutlineCode/Values/Value`＋その `FieldGUID`/`Type`・`WBSMask/Level`/`Type`/`Length`/`Separator`・`ValueList/Value`＋その `ID`・`Resource/Baseline/Number`・`Rate/RatesFrom`/`RatesTo`・`Assignment/Baseline/Number`・`Calendars/Calendar`・`WorkWeek/WeekDay/DayType`。**同じ要約集の `mspdi-pitfalls-ja.md:86` は `TimephasedData/UID` が必須だと自分で書いており、内部矛盾している** | 機械抽出（必須 25 宣言） |
| **X-4** | **誤り（自己矛盾）** | `mspdi-tables.md` の Project スカラーの集計が本文内で 2 通りある: B-1 凡例「**○20 / ×43**」・まとめ「**○26 / ×37**」 | `mspdi-tables.md:227` ↔ `:323` | **自分で数えた結果は ○20 / ×43**（12+3+5=20 / 2+5+3+4+9+10+4+2+4=43、合計 63）。**`:227` が正・`:323` が古い**。`:229`–`:233` は 2026-08-04 に 6 件を ○→× へ直したと書いており、まとめ行がその修正に追随していない | `mspdi-tables.md:238`–`:298`（自分で計数） |
| **X-5** | **不正確** | `Assignment.ResourceUID` を「**-1 で未割当**」と、あたかも MSPDI の仕様であるかのように 3 か所で書く | `mspdi-core-tree.md:216`,`:368`,`:411` | **XSD 全文に `-1` は 1 件も無い**。`-1` は MS Project の慣行にすぎない（同じ要約集の `mspdi-pitfalls-ja.md:137` は正しく「スキーマのどこにも書かれていない」と書いており、**要約集の内部で食い違っている**）。**実験で `-1` は `xsd:integer` として単に valid** | 全文 grep ／ 妥当性実験 |
| **X-6** | **不正確** | 「書き出し順の**正**」を名乗る節が、順序を **`Project` / `Task` / `Resource` / `Assignment` の 4 つしか与えていない** | `mspdi-core-tree.md:416`–`:541` | 残す 8 テーブルのうち **`Calendar` / `WeekDay` / `Exception` / `PredecessorLink` の 4 つには順序表が無い**。`Exception` の宣言順は `EnteredByOccurrences` `TimePeriod` `Occurrences` `Name` `Type` `Period` `DaysOfWeek` `MonthItem` `MonthPosition` `Month` `MonthDay` `DayWorking` `WorkingTimes` の 13 個で、**`Name` は `TimePeriod` より後ろ**。**実験: `Name` を先に出すと非妥当** | 機械抽出 ／ 妥当性実験 |
| **X-7** | **不正確** | `Task/Priority` を「`int (0..1000)`」と制約のように書く | `mspdi-core-tree.md:160` | 型は `xsd:integer` のみ。**0..1000 は documentation の文言であってファセットではない**。**実験で `Priority>5000<` は valid=True** | `mspdi_pj12.xsd`（Task 12 番目）／ 実験 |
| **X-8** | **不正確** | 「`XSD は ISO 4217 かどうかを検査しない`」とだけ書き、XSD 自身が値を名指ししていることを落とす | `mspdi-core-tree.md:558` | 検査しないのは正しい（**実験: `XYZ` は valid、4 文字は非妥当**）。ただし XSD の doc は「as defined in **ISO 4217**. **Valid values are: USD.**」と書いており、要約の最小妥当文書が使う `JPY` は**doc の "Valid values" に無い**。要約はこの一文を引いていない | `mspdi_pj12.xsd:392` ／ 実験 |
| **X-9** | **不正確** | `TimephasedData` は「Task / Resource / Assignment のどれにもぶら下がる」 | `mspdi-core-tree.md:316`,`:62` | **宣言は 5 か所**。上記 3 つに加え **`Task/Baseline/TimephasedData`** と **`Assignment/Baseline/TimephasedData`** がある。しかも `Task/Baseline` では `TimephasedData` が**先頭（`Number` より前）**。**実験: `Number` を先に出すと非妥当** | `mspdi_pj12.xsd:2313`,`:2473`,`:3173`,`:3646`,`:3893` ／ 実験 |
| **X-10** | **不正確** | D-1 の「葉要素名が親を跨いで重複する」表が `Value` の出現を **2 か所**（775 / 1157）としている | `mspdi-pitfalls-ja.md:242` | `Value` の宣言は少なくとも **8 か所**（`TimephasedDataType/Value` 217、`OutlineCode/Values/Value` 775 とその子 `Value` 814、`ValueList/Value` 1157 とその子 `Value` 1168、`Task/Resource/Assignment` の `ExtendedAttribute/Value` 2259/2923/3592）。`TimePeriod` も **3 か所**（1269/1342/1520）で、表は場所を挙げていない。**主張の向きは正しいが表が過少で、これを「全数」として使うと漏れる** | 機械抽出 |
| **X-11** | **不正確** | D-3 が `ValueGUID` の出現を「2264 / 2928 / 3597」（`ExtendedAttribute` 配下）とする | `mspdi-pitfalls-ja.md:263` | `ValueGUID` は **5 か所**。挙げられていない **2429（`Task/OutlineCode`）と 3021（`Resource/OutlineCode`）** がある。5 つとも `xsd:integer` なので結論は変わらないが、行番号の列挙は全数ではない | `mspdi_pj12.xsd:2264`,`:2429`,`:2928`,`:3021`,`:3597` |
| **X-12** | **不正確** | `Resource/AccrueAt` を「enum{1=Start,2=End,3=Prorated}」と 3 値で書く（コアツリー側） | `mspdi-core-tree.md:201` | **4 値**（1,2,3,4）。`4` は doc で `$New4=Invalid`。`mspdi-enums-ja.md:149`–`:153` は正しく 4 値と書いており、**要約集の内部で食い違っている** | 機械抽出 |
| **X-13** | **不正確** | `Assignment/CostRateTable` を「enum{0=A,…,4=E}」と断定する（コアツリー側） | `mspdi-core-tree.md:224` | XSD の doc は値の意味を**書いていない**。`Rate/RateTable` と同じと**解釈するのが妥当**なだけで、XSD からは言えない。`mspdi-enums-ja.md:176` は正しく「解釈するのが妥当」と留保している | `mspdi_pj12.xsd`（Assignment 14 番目） |
| **X-14** | **不正確** | `CurrencyCode` を「XSD で **`minOccurs=1`** であり」と書く | `mspdi-tables.md:284` | 実際は **`minOccurs` 属性そのものが無い**（暗黙 1）。XSD 全体で明示 `minOccurs="1"` は **3 か所だけ**で、いずれも暦クラスタ。結論（必須である）は正しいが、根拠の書き方が誤り。`mspdi-pitfalls-ja.md:129` は正しく「`minOccurs` 指定が無い（＝必須）」と書く | `mspdi_pj12.xsd:390` |
| **X-15** | **不正確** | 4 本すべてが front-matter とヘッダで「ローカル複製は `mspdi/mspdi_pj12.xsd`」と書く | `mspdi-core-tree.md:5` / `mspdi-enums-ja.md:5,14` / `mspdi-pitfalls-ja.md:5,15` / `mspdi-tables.md:5,21` | **そのパスにファイルは無い**（`previous-project-result/01-mspdi/mspdi/` には `README.md` 1 本だけ）。実体は `docs/reference/mspdi/mspdi_pj12.xsd`。README 自身が `:26` でそう書いており、**4 本が自分たちの README と食い違う** | `mspdi/README.md:26`,`:28`–`:31` |

---

## 3. 落とし穴の裏取り（`mspdi-pitfalls-ja.md` 全 27 件を 1 件ずつ）

**「往復で壊れる型」が書かれている節なので全数を個別に当てた。** 判定は **確認**（XSD で裏が取れた）／**部分**（主張は正だが範囲・根拠に欠けがある）／**未検証**（XSD からは判定できない）。

| 罠 | 主張の要点 | 判定 | 裏取りの内容 | 出典（XSD） |
|---|---|:--:|---|---|
| A-1 | 一意性制約が 0 件 ⇒ 自然キー一意は成り立たない。重複 `PredecessorLink` も妥当 | **確認** | `unique`/`key`/`keyref` = 0 件。掲載の重複 XML を**実験にかけて valid=True** | 全文 grep ／ 実験 |
| A-2 | `Project.UID` は GUID 不可（`maxLength=16`）でしかも省略可 | **確認** | 238–246 行が原文どおり | `mspdi_pj12.xsd:238`–`:246` |
| A-3 | `ID`=表示行番号（可変）、`UID`=不変の参照キー | **確認** | `Task/ID` doc = "The **position identifier** of the task within the list of tasks." 参照側は全部 `*UID` | `mspdi_pj12.xsd`（Task 2 番目） |
| A-4 | `TimephasedData.UID` は自己識別（親の UID ではない）で必須 | **確認** | doc = "the timephased data **record**"。**実験: `UID` 無しは非妥当** | `mspdi_pj12.xsd:187` ／ 実験 |
| A-5 | `PredecessorLink` に ID が無い（弱エンティティ）。子は 6 つ | **確認** | 子 6 個・全部 `minOccurs=0`（＝**必須が 1 つも無い**） | `mspdi_pj12.xsd:2162`–`:2237` |
| A-6 | 参照は `UID` という名前とは限らない（`Ltuid` 等） | **確認** | `Ltuid`(1075) `AssnOwnerGuid` `ActiveDirectoryGUID` `FieldGUID` `ValueGUID` `SecondaryPID` `DefaultGuid` `ParentValueID` を全数確認 | 機械抽出 |
| B-1 | 断捨離後 8 テーブルの必須は `Task/Calendar/Resource/Assignment` の `UID`・`WeekDay/DayType`・Project の 2 つだけ。`null` と既定値を区別しないと往復差分が出る | **確認** | **8 テーブルの範囲では正確**（`PredecessorLink` と `Exception` に必須ゼロも確認）。`DayType` は明示 `minOccurs="1"`。**実験: `DayType` 無しの `WeekDay` は非妥当** | `mspdi_pj12.xsd:1247` ／ 実験 |
| B-2 | Project 直下の必須は `SaveVersion` と `CurrencyCode` の 2 つだけ | **確認** | 63 スカラーのうち `minOccurs` 属性なしはこの 2 つ。**実験で最小文書が valid** | `mspdi_pj12.xsd:232`,`:390` ／ 実験 |
| B-3 | `Assignment.TaskUID`/`ResourceUID` は省略可。`-1` は XSD に無い | **確認** | 両方 `minOccurs="0"`。`-1` は全文 0 件 | `mspdi_pj12.xsd:3201`,`:3207` |
| B-4 | `PredecessorUID` と `Type` も省略可 | **確認** | 両方 `minOccurs="0"` | `mspdi_pj12.xsd:2168`,`:2173` |
| B-5 | 省略はできるが並べ替えはできない | **確認** | 4 容れ物とも `xsd:sequence`。**実験で逆順が非妥当**。⚠️ ただし**この罠を書いた同じ要約集の Task 実例がこの罠を踏んでいる**（X-1） | 実験 |
| B-6 | `Calendars` を出すなら `Calendar` を 1 つ以上。容れ物 7 つで中身必須はこれだけ | **確認** | `Calendar` は `minOccurs="1"`。`Tasks`/`Resources`/`Assignments` の子は `minOccurs="0"`。**実験で `<Calendars/>` 非妥当・`<Tasks/>` 妥当** | `mspdi_pj12.xsd:1204` ／ 実験 |
| C-1 | `Exception.TimePeriod` は `Type` と組で読む | **確認** | doc 3 本（`TimePeriod` / `Occurrences` / `Type`）が要約の引用と一字一句一致 | `mspdi_pj12.xsd:1344`,`:1363`,`:1378` |
| C-2 | 例外日は 2 系統（2003 系 `WeekDay/DayType=0`＋`TimePeriod` と 2007 系 `Exception`） | **確認** | `WeekDay/TimePeriod`(1269) の doc も "contiguous set of exception days" | `mspdi_pj12.xsd:1269`,`:1271` |
| C-3 | 階層に親ポインタが無い | **確認** | `Task` 96 名に親ポインタ無し | 機械抽出 |
| C-4 | マイルストーンはフラグのみ。`Duration>0` でも `Milestone=1` にできる | **部分** | `Milestone` は `xsd:boolean` で `Duration` との相関制約は XSD に**無い**（＝両立は妥当）。ただし**「フラグが優先」で描画される**のは MS Project の挙動であって XSD からは言えない → **未検証** | 機械抽出 |
| C-5 | `Stop`/`Resume` は「中断/再開」。1 組で 1 回分しか表せない | **部分** | doc は "The date that the task was **stopped** / **resumed**" で「中断/再開」は確認。要素は各 1 個（`maxOccurs` なし）なので「1 回分」も確認。ただし**「連続中断の正確な形は `TimephasedData` の作業ゼロ区間が持つ」は XSD に書かれていない → 未検証** | `mspdi_pj12.xsd`（Task 18/19 番目） |
| C-6 | `Resource.Type` だけでは資源種別が分からない（`IsCostResource` が別にある） | **確認** | `Type` 2 値・`IsCostResource` は `xsd:boolean` の別要素 | 機械抽出 |
| D-1 | 葉要素名が親を跨いで重複する。親パスで識別せよ | **部分** | 主張は正しく、掲げた行番号は**全件一致**。ただし表が過少（X-10） | 機械抽出 |
| D-2 | `Baseline/Number` は 3 か所で型も必須性も違う | **確認** | integer/0・integer/必須・**string/必須**。実験で Assignment の `abc` が valid | `mspdi_pj12.xsd:2318`,`:2977`,`:3651` ／ 実験 |
| D-3 | `ValueGUID` は整数、`FieldGUID` は文字列で型が一致しない | **部分** | 型の主張は正しい。行番号の列挙が全数でない（X-11） | 機械抽出 |
| D-4 | `WorkingTimes` は 2 箇所だけ。`WorkWeek/WeekDay` は勤務時刻を持たない | **確認** | 1288 と 1468 の 2 箇所。`WorkWeek/WeekDay` の子は `DayType`+`DayWorking` | `mspdi_pj12.xsd:1288`,`:1468`,`:1553` |
| D-5 | enum は整数コード。`DurationFormat` 26 / `LagFormat` 25 | **確認** | 差集合まで一致（V-28）。要約の「要約の抜粋を信用するな」という助言自体は正しい | 機械抽出 |
| D-6 | `Assignment` に 201 個の空予約枠（enterprise 予約） | **誤り** | 201 個・行範囲 3691–3891・`minOccurs=0` は正しいが、**「enterprise」も「空」も誤り**（X-2） | `mspdi_pj12.xsd:3689`–`:3891` ／ 実験 |
| E-1 | 「読まない」と「捨てる」は別。弱エンティティは親＋出現順で識別するしかない | **確認** | `WeekDay`/`Exception`/`WorkingTime`/`PredecessorLink` に識別子要素が無いことを全数確認 | 機械抽出 |
| E-2 | 往復の同一性を主張するなら キー / 粒度 / 順序 / null と既定値 の 4 点を先に決めよ | **確認**（設計判断） | XSD 側の裏付け（一意制約 0・`minOccurs=0` 多用・`xsd:sequence`）はすべて確認済み | 上記 |
| E-3 | MSPDI に無いもの: 描画情報 / 1 行複数バー / 依存線の幾何 | **確認** | 全 499 要素名に色・行高・座標・Bar Style に相当する要素は**無い**（自分で全数走査）。依存は `PredecessorUID` 参照のみ | 機械抽出 |

---

## 4. 要約が落としている XSD の事実（新規に拾ったもの）

**「落とし穴の一覧」を名乗る文書に無く、XSD 自身が明示している往復リスク**である。

| # | 事実 | 出典（XSD） | 設計への効き |
|---|---|---|---|
| **N-1** | **XSD 自身が 2 つの出力不具合を注記している**: ①「`WorkWeeks` は正しく XML に保存されない。妥当な XML にするには空タグ集合 `<>` `</>` を `<WorkWeeks>` `</WorkWeeks>` に置換せよ」 ②「`WorkWeek/WeekDay` は正しく保存されない。開きタグごとに閉じタグ `</WeekDay>` を手で挿入せよ」 | `mspdi_pj12.xsd:1504`–`:1507`,`:1549`–`:1551` | **入力が XML として壊れていることがある**。Carry で原形保持する設計だと「壊れた原形を返すのか正した形を返すのか」を決めないと出口が非妥当になる。**4 本の要約に 1 行も無い** |
| **N-2** | **enterprise / local カスタムフィールド要素は「ここに書かれる」とコメントされているが、`Task` と `Resource` には受け皿の要素宣言が無い**（`Assignment` だけが 201 枠を持つ）。定義は別スキーマ（`ProjEntCF.xsd` / `TaskEntCF.xsd` / `ResEntCF.xsd` / `AssnEntCF.xsd`） | `mspdi_pj12.xsd:2470`–`:2472`,`:3171`–`:3172`,`:3689`–`:3690` | **実 MS Project 出力はこの XSD 単体では妥当にならない場合がある**。**実験: `Task` に未知要素を入れると非妥当**。「export はスキーマ検証を通してから完成」（`mspdi-pitfalls-ja.md:159`）という方針は、**取り込んだ未知要素を書き戻すと自分で破る**。取り込み側の未知要素の扱いを決める必要がある |
| **N-3** | `WorkingTimes` の散文は "**One of these must be present**, and there can be no more than five" だが、宣言は `WorkingTime minOccurs="0" maxOccurs="5"`（しかも `xsd:sequence` の中の `xsd:choice`）。**実験で空の `<WorkingTimes/>` は valid** | `mspdi_pj12.xsd:1290`,`:1294`–`:1295` | 散文を根拠に「必ず 1 個ある」と実装してはならない |
| **N-4** | `Project/StartDate` の doc = "**Required if `ScheduleFromStart` is true**"、`Project/FinishDate` の doc = "**Required if `ScheduleFromStart` is false**"。**スキーマは強制していない**（両方 `minOccurs=0`） | `mspdi_pj12.xsd`（Project 14/15 番目） | `mspdi-tables.md:260` は `ScheduleFromStart` を「意味を使わない（×）」、`:262` は `FinishDate` を「入力は読まず算出して出す」とする。**この 2 つを組み合わせると、doc が言う条件付き必須を満たさない文書を出しうる**。要約はこの条件を 1 度も書いていない |
| **N-5** | `Task/Baseline` の子の**先頭が `TimephasedData`**（`Number` はその次）。`Resource/Baseline` は `TimephasedData` を持たない | `mspdi_pj12.xsd:2313`,`:2318`,`:2971` | 3 つの `Baseline` は子の構成そのものが違う（Task 13 子 / Resource 5 子 / Assignment 8 子）。D-2 は `Number` の型差だけを挙げるが、**差は型だけではない** |
| **N-6** | 文字列長ファセットが要素ごとに違う: `Project/Name` = **255**、`Project/Title`/`Author`/`Manager`/`Company`/`Calendar/Name`/`Task/Name`/`Exception/Name`/`WorkWeek/Name` = **512**、`Project/UID` = **16**、`CurrencyCode` = **3** | `mspdi_pj12.xsd:250` 付近,`:1221`,`:244`,`:396` | `Project/Name` だけ 255 なのは事故りやすい。要約は `Task/Name (≤512)` しか書いていない（`mspdi-core-tree.md:143`） |
| **N-7** | `Project/CurrentDate` の doc = "The **system date that the XML was generated**" | `mspdi_pj12.xsd`（Project 54 番目） | `mspdi-tables.md:264` は「「現在日」参照」と書くが、実体は**生成時刻のスタンプ**である。来歴（`revisionStamp` 相当）を設計するときに効く |
| **N-8** | 来歴に使える MSPDI ネイティブ要素は `Author`(9, str≤512) / `CreationDate`(10, dateTime) / `Revision`(11, **integer**, doc="The number of times a project has been saved") / `LastSaved`(12, dateTime) の 4 つで、**`Project` の先頭 12 要素の中に固まっている** | `mspdi_pj12.xsd`（Project 9–12 番目） | 「最後に書いた者と時刻」は MSPDI 側に受け皿が**ある**（`Author` / `LastSaved` / `Revision`）。ただし **`Revision` は整数の保存回数**であって版番号文字列ではない |
| **N-9** | `Exception` の宣言順は 13 個で、**`TimePeriod`(2) が `Name`(4) より前**。`WeekDay` の宣言順は `DayType` `DayWorking` `TimePeriod` `WorkingTimes` の 4 個 | `mspdi_pj12.xsd:1337`–`:1497`,`:1247`–`:1317` | 残す 8 テーブルの書き出し順が要約に無い（X-6）。**この 2 つは自分で押さえる必要がある** |
| **N-10** | `PredecessorLink/LagFormat` の **documentation は `52=e%?` で終わり `53` を説明していない**が、enumeration には `53` が入っている。**実験: `LagFormat>53<` は valid、`21` は非妥当** | `mspdi_pj12.xsd:2203`–`:2232` ／ 実験 | `mspdi-enums-ja.md:100`–`:104` は値の**数**（25）と差集合（`21` を除く）を正しく書いているが、**doc と enumeration の食い違いには触れていない**。在庫表 `E03-dependency-taskgroup.md:157`（C-11）は独自に拾っている |

---

## 5. データモデルに効く決定（要約が述べていて、XSD で裏が取れたもの）

| # | 決定 | 出典（要約） | XSD の裏付け |
|---|---|---|---|
| DM-1 | **UID を PK にする（代理キーを作らない）**。参照は必ず UID で、`ID` は保存しない | `mspdi-core-tree.md:569` / `mspdi-pitfalls-ja.md:78`–`:82` | `Task`/`Calendar`/`Resource`/`Assignment` の `UID` のみ必須。`ID` は "position identifier" |
| DM-2 | **各フィールドを nullable にし、`null`=「元ファイルに要素が無かった」を保持する**。export は `null` なら要素を書かない | `mspdi-pitfalls-ja.md:125` | 8 テーブルのほぼ全フィールドが `minOccurs=0` |
| DM-3 | **XSD 必須要素だけは `null` でも既定値を焼いて必ず出す**（`SaveVersion=12` 等） | `mspdi-pitfalls-ja.md:133` | 最小妥当文書の実験で確認 |
| DM-4 | **弱エンティティ（`WeekDay`/`Exception`/`WorkingTime`/`PredecessorLink`）は「親＋出現順」で識別する**。独立 PK を作らない | `mspdi-pitfalls-ja.md:289` / `mspdi-tables.md:221` | 4 つとも識別子要素を持たない |
| DM-5 | **依存の重複を捨てずに退避する**（同一ペア・同一種別の重複が妥当だから） | `mspdi-pitfalls-ja.md:60` | 一意制約 0 件＋`maxOccurs="unbounded"`＋実験 |
| DM-6 | **`Type` 欠落は FS(=1) に正規化しつつ「欠落だった事実」を別に保持する** | `mspdi-pitfalls-ja.md:149` | `Type` は `minOccurs=0`・enum 4 値 |
| DM-7 | **`-1` は境界（パーサ/シリアライザ）で `null` に正規化し、内部にマジックナンバーを持ち込まない** | `mspdi-pitfalls-ja.md:141` | `-1` は XSD 非規定 |
| DM-8 | **階層は親ポインタに変換して保持し、export で `OutlineLevel` と順序を同時に再生成する** | `mspdi-pitfalls-ja.md:214` | 親ポインタが XSD に無い |
| DM-9 | **例外日は 2 系統を「非稼働日の集合」に正規化する。片方しか実装しないなら他方は原形保持** | `mspdi-pitfalls-ja.md:206` | 2 系統の存在を確認 |
| DM-10 | **`Exception.Type` を必ず読み、欠落 or `9` のときだけ `TimePeriod` を実日付として扱う** | `mspdi-pitfalls-ja.md:191` | doc 3 本で確認 |
| DM-11 | **`TimephasedData` を不透明保持するなら所有エンティティの下にぶら下げる**（グローバル索引を作らない） | `mspdi-pitfalls-ja.md:90` | `UID` は record 自己識別 |
| DM-12 | **型付き言語で共通 `Baseline` 型を作らない**（3 つは別物） | `mspdi-pitfalls-ja.md:259` | 型・必須性・子構成すべて違う（N-5） |
| DM-13 | **要素は必ず親パスで識別する。名前だけの表・マップを作らない** | `mspdi-pitfalls-ja.md:247` | `Value` 8 か所・`TimePeriod` 3 か所ほか |
| DM-14 | **断捨離後は 8 テーブル**（Project / Task / PredecessorLink / Calendar / WeekDay / Exception / Resource / Assignment） | `mspdi-tables.md:111` | 8 つとも XSD 実名（大小一致）を確認 |
| DM-15 | **`TimePeriod` は親に 0..1 の value-object なので親フィールドへ畳み込む** | `mspdi-tables.md:315` | 子は `FromDate`/`ToDate` の 2 つのみ（3 か所とも同構造） |
| DM-16 | **コンテナ（`Tasks` 等 15 名）はテーブルにせず配列に吸収する** | `mspdi-tables.md:300`–`:307` | 15 名すべてが「要素を並べるだけ」の wrapper であることを確認 |

---

## 6. アーキテクチャに効く決定

| # | 決定 | 出典（要約） | XSD の裏付け／注記 |
|---|---|---|---|
| AR-1 | **export は必ずスキーマ検証を通してから完成とする** | `mspdi-pitfalls-ja.md:159` | ⚠️ **N-2 と衝突する**。取り込んだ未知（enterprise/local CF）要素を書き戻すと自分で破る。**未決** |
| AR-2 | **`-1` などの製品慣行は Adapter 境界に閉じ込め、内部モデルへ持ち込まない** | `mspdi-pitfalls-ja.md:141` | `-1` は XSD 非規定 |
| AR-3 | **外部 MSPDI は信頼しない。XXE 対策で外部エンティティを無効化し DTD 解決を切ってからパースする** | `mspdi-core-tree.md:571` | XSD に DTD/外部エンティティの宣言は無い（＝これは実装側の方針。XSD からは裏が取れない＝**未検証**だが、方針として妥当） |
| AR-4 | **「読まない」と「捨てる」を分ける**。保持すると宣言するなら、キー・粒度・順序・null 規則を設計する（E-2 の 4 点） | `mspdi-pitfalls-ja.md:287`–`:296` | 一意制約 0・`minOccurs=0` 多用・`xsd:sequence` で裏が取れる |
| AR-5 | **描画情報・1 行複数バー・依存線の幾何は自前の形式で持つしかない**（MSPDI に書いても復元されない） | `mspdi-pitfalls-ja.md:298`–`:304` / `mspdi-core-tree.md:644`–`:665` | 499 要素名に描画語が 0 件（自分で全数走査） |
| AR-6 | **順序の正は「宣言順に並べる」の 1 文で足りる** | `mspdi-core-tree.md:435`–`:439` | 4 容れ物とも `xsd:sequence`。⚠️ ただし順序表が 4 つ分しか無い（X-6） |
| AR-7 | **名前空間はルートに既定名前空間を 1 つ宣言すれば足りる**（`elementFormDefault="qualified"`・属性 0） | `mspdi-core-tree.md:432`–`:434` | **実験: 名前空間無しの `Project` は「No matching global declaration」で非妥当** |

---

## 7. 廃棄・撤回された決定

| # | 何が廃棄・撤回されたか | 出典 | 注記 |
|---|---|---|---|
| DR-1 | **`mspdi-tables.md` の「採否」列**（2026-08-04 削除）。29 行すべてで「断捨離」列と一致していたため一本化。あわせて記号 `△` の定義も消えた | `mspdi-tables.md:34`–`:36` | 表本体に `△` は 0 件であることを自分で確認した |
| DR-2 | **「断捨離」列の判断根拠 `mspdi-declutter-erd-ja.md`（725 行）は `previous-project-result/` に無い**。結論だけが台帳に落ちているため「参考」として外された（`DISCARDED-ja.md`） | `mspdi-tables.md:30`–`:32` | **「この列を根拠に使わないこと」と明記されている**。要否の正は台帳 §7 の Own/Consume/Reconstruct/Carry/Drop |
| DR-3 | **`WorkingTime` と `Task_Baseline` は不採用に確定**（日粒度描画で時刻不要／インラインの計画スナップショットは日程表コア外） | `mspdi-tables.md:38` | 生きている決定 |
| DR-4 | **B-1 の 6 件が ○ → × に降格**（2026-08-04）: `ScheduleFromStart` / `CurrentDate` ＋ サーバ/管理 4（`MicrosoftProjectServerURL` / `ProjectExternallyEdited` / `ActualsInSync` / `AdminProject`） | `mspdi-tables.md:229`–`:233`,`:260`,`:264`,`:298` | **まとめ行 `:323` がこの降格に追随していない**（X-4） |
| DR-5 | **`TimephasedData` は MVP で削る**（29 テーブル中 #7） | `mspdi-tables.md:48` | ⚠️ ただし `mspdi-pitfalls-ja.md:222` と `mspdi-core-tree.md:268` は「連続スプリットの正確な形は `TimephasedData` が持つ」と言う。**削ると複数中断が復元できない**（下記 U-5） |

---

## 8. 未決のまま残っている件

| # | 未決 | 出典 | なぜ未決か |
|---|---|---|---|
| U-1 | **`CurrencyCode` に `JPY` を出して MS Project 実機が受けるか** | `mspdi-core-tree.md:558` | XSD 上は妥当（実験で確認）。doc は "Valid values are: **USD**." と書く。**実機挙動は未検証** |
| U-2 | **取り込んだ enterprise/local カスタムフィールド要素を書き戻すと出口検証が落ちる件**（AR-1 と N-2 の衝突） | `mspdi_pj12.xsd:2470`–`:2472`,`:3171`–`:3172` | 要約集に記述が無い。**未決** |
| U-3 | **XSD が注記する `WorkWeeks` / `WorkWeek/WeekDay` の壊れた出力を、Carry でそのまま返すのか正して返すのか** | `mspdi_pj12.xsd:1504`–`:1507`,`:1549`–`:1551` | 要約集に記述が無い（在庫表 `E05-calendar.md:230` B-6 が独自に拾っている）。**未決** |
| U-4 | **残す 8 テーブルのうち `Calendar` / `WeekDay` / `Exception` / `PredecessorLink` の書き出し順** | `mspdi-core-tree.md:416`（順序表が 4 つ分しか無い） | 本書 N-9 に `Exception` と `WeekDay` の順序を書いた。`Calendar`(7 子: `UID` `Name` `IsBaseCalendar` `BaseCalendarUID` `WeekDays` `Exceptions` `WorkWeeks`) と `PredecessorLink`(6 子・V-14 の順) も本書で確定できる |
| U-5 | **`TimephasedData` を削ると連続スプリットが復元できない** | `mspdi-tables.md:48` ↔ `mspdi-pitfalls-ja.md:222` / `mspdi-core-tree.md:268` | 「`Stop`/`Resume` は 1 回分だけ」という主張自体は XSD で確認できたが、**「連続中断の正確な形を `TimephasedData` が持つ」は XSD に書かれていない＝未検証** |
| U-6 | **`Milestone=1` が `Duration>0` でも「フラグ優先」で◆描画される** | `mspdi-core-tree.md:310` / `mspdi-pitfalls-ja.md:218` | XSD に相関制約が無いこと（両立が妥当）は確認できたが、**描画がどちらを優先するかは MS Project の挙動＝未検証** |
| U-7 | **`f404000`〜`f4040c8` の中身（`xsd:anyType`）をどう保持するか** | `mspdi-pitfalls-ja.md:279`（「空」と断定） | 実験で子要素・属性つきが妥当と確認済み。**文字列 1 個の器では表せない場合がある** |
| U-8 | **`Project/StartDate` / `FinishDate` の条件付き必須（`ScheduleFromStart` 依存）を満たすか** | 本書 N-4 | スキーマは強制しないので機械では落ちない。**相手ツールでの挙動は未検証** |
| U-9 | **`mspdi-tables.md` の「エンティティ総数 29（中核 6 ＋ 衛星 23）」** | `mspdi-pitfalls-ja.md:35` / `mspdi-tables.md:25` | 29 という数は**XSD から一意に決まらない**（`TimePeriod` を value-object 扱いにする、`WBSMasks` をテーブルに数える等の判断が入る）。掲げられた 29 件が全部 XSD に実在することは確認したが、**「29 が正しい」は機械では検証できない** |

---

## 在庫表との食い違い

**在庫表 11 枚のうち、MSPDI に触れる行を機械検索して突き合わせた。** ⚠️ E05 と E03 は全文、他は該当行のみ。

| # | 何が食い違うか | 在庫表の側 | 要約（A10 の担当文書）の側 | どちらが正か |
|---|---|---|---|---|
| **CX-1** | **`f404000`〜`f4040c8` の中身** | `E10-carry-roundtrip.md:74` / `:393`（U-8）「XSD 実測ではこの 201 個は型宣言が無く **`xsd:anyType`＝任意の子要素を持ちうる**。「全て空」は XSD からは言えない（未検証）」 | `mspdi-pitfalls-ja.md:279`「すべて空・`minOccurs=0`・個別の意味は無い（**enterprise** カスタムフィールドの予約）」 | **E10 が正。しかも「未検証」を超えて確定できる** — `<xsd:element name="f404000" minOccurs="0" />` に `type` が無い＝`xsd:anyType`。**実験で `<f404000 x="1"><Sub>1</Sub></f404000>` が valid**（`mspdi_pj12.xsd:3691`）。さらに **「enterprise」も誤り**で、XSD のコメントは「**local** custom field data」（`mspdi_pj12.xsd:3690`）、enterprise は別スキーマ `AssnEntCF.xsd`（`:3689`） |
| **CX-2** | **同じ 201 枠の説明が在庫表の中でも割れている** | `E06-resource-assignment.md:361`「**enterprise** カスタムフィールドの予約プレースホルダ。**全て空で個別の意味は無い**」 ↔ `E10-carry-roundtrip.md:74`（上記） | `mspdi-pitfalls-ja.md:279`（E06 と同じ主張） | **E10 が正**（CX-1 と同じ根拠）。**E06:361 は要約の誤りをそのまま引き継いでいる** |
| **CX-3** | **`Assignment/ResourceUID = -1`** | `E11-identity-and-notstored.md:159`「未割当は `null` に正規化（**MS Project 慣行の `-1` は XSD 非規定**なので Adapter 境界に閉じ込める）」 | `mspdi-core-tree.md:216`,`:368`,`:411`「ResourceUID（**-1 で未割当**）」— MSPDI の仕様のように書く | **E11 が正**。**XSD 全文に `-1` は 0 件**（自分で grep）。同じ要約集の `mspdi-pitfalls-ja.md:137` も E11 側に立つ |
| **CX-4** | **`LagFormat` の `53`** | `E03-dependency-taskgroup.md:157`（C-11）「enumeration は 25 値（`3..53`）だが documentation は `52=e%?` で終わり **`53` を説明していない**」 | `mspdi-enums-ja.md:100`–`:104`「`DurationFormat` から `21=null` を除いた 25 値」— **doc と enumeration の食い違いに触れていない** | **どちらも誤りではないが E03 の方が深い**。値集合は要約が正しい（差集合を計算して確認）。**doc が `53` を落としていることは E03 だけが拾っている**（`mspdi_pj12.xsd:2203`–`:2232`。**実験で `53` は valid・`21` は非妥当**） |
| **CX-5** | **`WeekDay/TimePeriod` の行き先** | `E05-calendar.md:142`「`DayType` が 1–7 の行でも `TimePeriod` は XSD 上つけられる（`minOccurs=0`・禁止されていない）ので、**ネイティブ行の側にフィールド単位 Carry が発生する**」＝ `WeekDay.carry` の器が要る | `mspdi-tables.md:315` は `TimePeriod` を「○＝**`Calendar_Exception` の from_date / to_date として親に畳込**」の 1 行だけで済ませ、`:192`–`:195` の残す 8 テーブル ERD の `WeekDay` は `DayType` と `DayWorking` の 2 列しか持たない | **E05 が正**。`TimePeriod` の宣言は **3 か所**（`WeekDay`1269 / `Exception`1342 / `WorkWeek`1520）で、`WeekDay/TimePeriod` は `minOccurs=0` の任意要素。**`mspdi-tables.md` の 8 テーブル ERD には受け皿が無い** |
| **CX-6** | **XSD 全体の必須要素の数え方** | `E05-calendar.md:24`–`:25`「明示 `minOccurs="1"` は **3**（3 つとも暦クラスタ）／`minOccurs` 属性なしは **22**」 | `mspdi-core-tree.md:441`–`:445`「**必須は 4 種だけ**…それ以外は全部 `minOccurs=0`」 | **E05 が正**。自分で数えた結果も **3 と 22（合計 25 宣言）** で一致。要約の「それ以外は全部 `minOccurs=0`」は**列挙外に 13 個の必須がある**ので誤り（X-3）。**なお `mspdi-tables.md:284` の「`CurrencyCode` は XSD で `minOccurs=1`」も、明示属性が無いので書き方が誤り**（X-14） |
| **CX-7** | **`CurrencyCode` に `JPY` を出す件の留保の強さ** | `E04-project.md:53` / `:174`（V-6）「XSD の documentation は "Valid values are: **USD**." と書きながら型制約は `maxLength=3` の文字列のみ。**XSD 上は妥当だが MS Project の挙動は未検証**」 | `mspdi-core-tree.md:558`「XSD は ISO 4217 かどうかを検査しない。実機が任意の 3 文字を受けるかは未検証」— **doc が USD を名指ししている事実を引いていない** | **E04 が正確**。XSD doc 原文は "The three letter currency character code as defined in ISO 4217. **Valid values are: USD.**"（`mspdi_pj12.xsd:392`）。**実験: `XYZ` は valid・4 文字は非妥当** |
| **CX-8** | **`Project` 直下スカラーの仕分け件数** | `E04-project.md:19`「Own 17 / Consume 1 / Reconstruct 3 / Carry 42 = 63（自分で列挙して検算）」／ `E10-carry-roundtrip.md:381`（U-1）も同じ結論 | `mspdi-tables.md:227`「○20 / ×43」↔ `:323`「○26 / ×37」— **同一文書内で 2 通り** | **`:227`（○20/×43）が正**。自分で 63 名を 9 グループに突き合わせて数えた。**`:323` は 2026-08-04 の降格（DR-4）に追随していない古い数**。なお在庫表の 17+1+3=21「残」と ○20 の差 1 は `CurrencyCode`（内容は使わないが出力する）で、**両者は矛盾しない** |
| **CX-9** | **XSD ローカル複製の所在** | `E01`〜`E11` の全在庫表が `docs/reference/mspdi/mspdi_pj12.xsd` を引く（例 `E05-calendar.md:13`・`E11-identity-and-notstored.md:11`） | 要約 4 本は front-matter とヘッダで `mspdi/mspdi_pj12.xsd` を指す（`mspdi-enums-ja.md:14` ほか） | **在庫表が正**。`previous-project-result/01-mspdi/mspdi/` には `README.md` しか無く、README 自身が `:26` で `docs/reference/mspdi/` を指している。**SHA-256 `a3e9138f…` / 239,895 バイト / 3,906 行が README:79–82 の記載と一致**することを自分で確認した |

**食い違わなかったもの（念のため）**: `E06-resource-assignment.md:39`,`:199`,`:295`（Assignment 265 = 61＋201＋3、Resource 71、必須は各 `UID` のみ）、`E10-carry-roundtrip.md:147`（Project 直下必須 2 つ）、`E11-identity-and-notstored.md:339`–`:340`,`:443`（`SaveVersion`=12 / `CurrencyCode`=`"JPY"` / 必須要素は焼く）、`E03-dependency-taskgroup.md:43`–`:46`（`PredecessorLink` の子の型・`minOccurs`・enum）、`E05-calendar.md:26`–`:28`,`:62`–`:66`,`:113`,`:166`,`:169`（一意制約 0 / `Exception` 子 13 / `Calendar` 子 7 / `Exception/Type` 訳 / `DaysOfWeek` ビット / `Month` 0 起点）— **すべて XSD と一致することを自分で確かめた**。
