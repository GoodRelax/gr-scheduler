# CR-151 — 入れ子になるエンティティの形を 4 つとも揃える

> ⛔ **未適用である。** 触るのは `_assets/source/erd.json` の 4 箇所と `01-04-requirements.md` の 1 語。
> ⚠️ **生成物（`fig-erd-detail.md` / `fig-erd-overview.md` / `grs-document.schema.json`）は当てたあとに再生成する。** 検査 16 と 17 がそれを確かめる。
> ⭐ **規則を 1 つも変えない。** 既にある MUST に原稿の 2 列が追いついていなかっただけである。

**閉じるもの**: `WeekDay` と `Exception` が、入れ子になる他の 2 エンティティと違う形で原稿に載っていること。

## 1. 出どころ —— 生成器の誤報を追ったら原稿の不揃いに当たった

手順 3 で書いた `erd_json_to_schema.py` が「`WeekDay` と `Exception` はどの鍵からも辿り着けない」と報告した。
⛔ **これは生成器の盲点による誤報であった** —— 生成器は JSON の木を**包む列**（`Task.dependencies` / `CarryElement.children`）からしか導いておらず、関係（`RL-12` / `RL-13`）で親に付く子を辿れなかった。

**置き場は最初から決まっている。** 3 つとも実物で確かめた。

| 根拠 | |
|---|---|
| 表 T-053 の `DF-1`（`:2780`） | **交換相手の木の中で解釈する要素は、相手と同じ位置に置くこと（MUST）。平らな表へ移してはならない（MUST NOT）** |
| `docs/review/mspdi-vs-grs-erd-comparison-ja.md:58` / `:61` | `WEEKDAY`（`Calendar/WeekDays/WeekDay`）も `EXCEPTION`（`Calendar/Exceptions/Exception`）も **「同じ形で持つ」** |
| 公式 XSD（ローカル複製 `docs/reference/mspdi/mspdi_pj12.xsd:1235` / `:1325`） | 包み要素 `WeekDays` / `Exceptions` の下に繰り返す |

⭐ **前プロジェクトの ERD は鍵名まで書いていた** —— `previous-project-result/02-data-model/grs-native-erd-ja.md:236` の `Calendar ||--o{ WeekDay : "weekDays"`。識別は「親＋位置（弱エンティティ）」（`:709` / `:1486`）。

### 不揃いの実体

**入れ子になるエンティティは 4 つある。2 つだけ形が違う。**

| 子 | 親 | 親が持つ包む列 | 子が持つ親を指す列 | `key_note` |
|---|---|---|---|---|
| `Dependency` | `Task` | ⭐ **`dependencies`**（`Dependency[]`）| 無し | 「—（後続タスクの下での位置が表す）」 |
| `CarryElement` | 所有者 | ⭐ **`children`** ほか（`CarryElement[]`）| 無し | 「所有者 ＋ `ordinal`」 |
| **`WeekDay`** | `Calendar` | ⛔ **無い** | ⛔ **`calendarUid`（PK/FK・`GRS` 出自）** | ⛔ **空** |
| **`Exception`** | `Calendar` | ⛔ **無い** | ⛔ **`calendarUid`（PK/FK・`GRS` 出自）** | ⛔ **空** |

⛔ **`FR-024` は列を鍵ごと書き出す**ので、このままだと入れ子の中に `calendarUid` が出る。表 T-053 直後の

> **構造から決まるものを列にしないこと（MUST）** —— 列にすると、その列と構造のどちらが正かを決める規則が新しく要る

に触れる。**穴ではなく、既存の MUST に追いついていない 2 列である。**

## 2. 何をするか

**`erd.json` を 4 箇所、要求本文を 1 語。表も図も UID も増えない。**

| # | 場所 | 何を |
|---|---|---|
| **①** | `erd.json` の `Calendar` の `columns` 末尾 | **`weekDays`（`WeekDay[]`）と `exceptions`（`Exception[]`）を足す** —— `Task.dependencies` と同じ形 |
| **②** | 同 `WeekDay` | **`calendarUid` を落とし**、`key_note` に「親の暦 ＋ `ordinal`」を置く |
| **③** | 同 `Exception` | 同上 |
| **④** | `01-04-requirements.md:2442` | `AT-72` → **`AT-73`**（`WeekDay.dayType` の席が 1 つ繰り上がる）|

**新しい列の逐語**（`Task.dependencies` に合わせた）

```text
weekDays    型 `WeekDay[]`     可否 否（空可）  鍵 —  出自 Consume
            交換 Calendars/Calendar/WeekDays/WeekDay
            意味 **曜日ごとの稼働**（表 T-053 の `DF-1`）
exceptions  型 `Exception[]`   可否 否（空可）  鍵 —  出自 Consume
            交換 Calendars/Calendar/Exceptions/Exception
            意味 **例外日**（表 T-053 の `DF-1`）
```

⚠️ **出自を `Consume` にしたのは `Task.dependencies` と同じ理由である** —— 包む列は書き出すときに作り直す。`Own`（そのまま書き戻す）は器には当たらない。
⚠️ **末尾に足すのは `erd.json` 自身の作法である**（`$comment`「a new record goes at the END」）。

### ⭐ `ordinal` は残す

| | |
|---|---|
| **残す根拠** | `CarryElement` が入れ子でありながら `ordinal` を `PK` で持ち、「**これで元の位置に戻す**」と書いている。`Calendar` 自身も上位の配列でありながら `ordinal` を持つ |
| **落とさない根拠** | `Dependency` が `ordinal` を持たないのは、`DF-4` が**依存について名指しで**「出現順を表す列も持ってはならない（MUST NOT）」と禁じているからである。**その MUST NOT は依存の行にしか掛からない** |

⛔ **落とす根拠が無いものを落とさない。** 揃えるのは「親を指す列を持たない」ところまでである。

## 3. 生成器は 1 行も直さない

⭐ **包む列を足せば、既にある仕組みで木が繋がる。** `erd_json_to_schema.py` は列の `json.of.entity` を辿って到達性を広げるので、`Calendar` から `WeekDay` / `Exception` に届く。

⛔ **関係の側に入れ子の鍵名を足す案は採らない** —— 同じ構造を「列」と「関係の印」の 2 通りで表せることになり、**どちらが正かを決める規則が新しく要る。**これは §1 で引いた MUST が禁じている形そのものである。

## 4. 数の予測（当てたあとに実測して差し替えること）

| | 改定前 | 改定後 |
|---|---|---|
| `tables` / `figures` / `uids` | 115 / 10 / 140 | **不変** |
| `rows` | 1409 | **1409** —— 表 T-058 は **2 行落ちて 2 行増える** |
| `AT-` の席 | `Calendar` 63〜69 ／ `WeekDay` 70〜75 ／ `Exception` 76〜84 | **`Calendar` 63〜71 ／ `WeekDay` 72〜76 ／ `Exception` 77〜84。`Resource` は 85 のまま動かない** |
| 仕様本文の書き替え | — | **1 語のみ**（`AT-72` → `AT-73`）。`AT-70` と `AT-76` を指している箇所は `impact.py` で **0 件**と実測した |
| 検査 11 | `A=16 (new 0)` `groups=49` | ⚠️ **要実測** —— 新しい 2 行は文言が似ている |
| 検査 16 | OK | **再生成が要る**（図 F-011 と 表 T-056 / T-058 が動く）|
| 検査 17 | OK | **再生成が要る。** ⭐ **「置き場の無いエンティティ」が 2 → 0 になる** |

## 5. 席

**触るファイルは `docs/spec/_assets/source/erd.json` と `docs/spec/01-04-requirements.md` だけ**であり、他の CR とは重ならない。生成物 3 つは再生成で更新する。
⛔ **変更履歴は当て終えてから 1 回で書く。** 本 CR のぶんとして書く内容は次のとおりである。

> ⭐ **入れ子になるエンティティの形を 4 つとも揃えた**（CR-151）—— `GRS JSON` は交換相手の木をそのまま持つ（表 T-053 の `DF-1`）ので、`WeekDay` と `Exception` は `Calendar` の下に入れ子で載る。ところが原稿では、`Dependency` と `CarryElement` が**親の包む列**で繋がっているのに対し、**この 2 つだけが子の側に `calendarUid` を持つ関係の形**で載っていた。`FR-024` は列を鍵ごと書き出すので、そのままでは**構造から決まる値が鍵として出て**、表 T-053 直後の「構造から決まるものを列にしないこと（MUST）」に触れる。`Calendar` に `weekDays` と `exceptions` を足し、子から `calendarUid` を落とし、識別を `CarryElement` と同じ `key_note`（親 ＋ `ordinal`）に寄せた。⚠️ **`ordinal` は残す** —— 落としているのは `Dependency` だけで、それは `DF-4` が依存について名指しで禁じているからである。**規則は 1 つも変えていない。**表・図・`UID`・行数はいずれも動かない（表 T-058 は 2 行落ちて 2 行増える）。⭐ **出どころは JSON Schema の生成器である** —— 生成器が「どの鍵からも辿り着けない」と報告し、追ったところ原稿の不揃いに当たった。生成器の側は 1 行も直していない
