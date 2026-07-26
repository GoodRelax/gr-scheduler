# プロパティ × MSPDI 対応表と、MSPDI に無い項目の格納方式

- 日付: 2026-07-26
- 目的: `user-order.md` 項 20 のプロパティ**全項目**について、**MSPDI に対応要素があるか**を正本 XSD で確認し、
  無い項目を**どこにどう置くか**を複数案で比較して結論を出す。
- 正本: `../01-mspdi/mspdi/mspdi_pj12.xsd`（本書の「MSPDI 側」列はすべてこの XSD で実在を確認した）
- 位置づけ: `grs-native-erd-ja.md`（データ構造の正）と `grs-mspdi-field-ledger-ja.md`（全要素の棚卸し）の**プロパティ視点の要約 ＋ 未決だった格納方式の結論**。

---

## 1. 先に結論

| # | 結論 |
|:--:|---|
| 1 | **MSPDI の `Task` に「略称 / 正式名称 / 説明」の 3 点セットは無い**。あるのは **`Name` と `Notes` の 2 つだけ**。`Subject` / `Title` は **Project 要素**のもので Task にはない。`Description` は**拡張属性の値リストの説明**用で Task の説明ではない |
| 2 | よって **`fullName` / `description` / `remarks` の 3 語をやめ、`name` ＋ `notes` に寄せる**。テキスト列を 5 つ持つと往復で必ず溢れる |
| 3 | **`abbrev`（略称）は廃止する**（ユーザー確定 2026-07-26）。アイコンに描くラベルは **`Task.name`**。MSPDI に合わせて**テキスト列は `name` ＋ `notes` の 2 つだけ**にする。→ 拡張領域の枠を 1 つ節約できる（§4） |
| 4 | MSPDI に無い GRS 固有項目の格納は **案C「固定枠の `ExtendedAttribute` ＋ 衝突検出 ＋ 未使用枠への退避」**を採る（§4 で 3 案比較） |
| 5 | 進捗率は 3 種類あるが、**`PercentComplete`（期間ベース）だけを使う**（§3-1） |
| 6 | **`Duration`（期間）と `Work`（工数＝人日）は別フィールド**。`Duration` は人日ではない（`Work = Duration × Units`）。**最も多い誤読**（§3-1） |
| 7 | **派生量は編集したタスクだけ再計算**し、未編集タスクは受け取った値をそのまま返す。**工数側は常に温存＋通知**（§3-3 / §3-4） |
| 8 | **`Stop` / `Resume` は MSPDI へ写さず拡張領域に置く**（意味がずれるため。§3-4 #8） |

---

## 2. 全項目の対応表（XSD 実在確認済み）

「MSPDI 側」列の要素はすべて `Task` の子として XSD に実在する（`minOccurs="0"` ＝任意）。
「区分」は `grs-mspdi-field-ledger-ja.md` の 5 分類（Own / Consume / Reconstruct / Carry / Drop）。

### 2-1. MSPDI に対応がある項目（そのまま写す）

| GRS プロパティ | 型 | MSPDI 側 | XSD 型 | 区分 | 備考 |
|---|---|---|---|---|---|
| `name` | string | `Task/Name` | `xsd:string` | **Own** | 同名同形 |
| `notes` | string | `Task/Notes` | `xsd:string` | **Own** | **説明と備考をここに統合** |
| `start` | date-time | `Task/Start` | `xsd:dateTime` | **Own** | 予定開始 |
| `finish` | date-time | `Task/Finish` | `xsd:dateTime` | **Own** | 予定終了 |
| `actualStart` | date-time | `Task/ActualStart` | `xsd:dateTime` | **Own** | |
| `actualFinish` | date-time | `Task/ActualFinish` | `xsd:dateTime` | **Own** | |
| `progressRatio` | 0〜1 | `Task/PercentComplete` | `xsd:integer` | **Own** | ÷100 で保持・×100 で書く（§3） |
| `deadline` | date-time | `Task/Deadline` | `xsd:dateTime` | **Own** | 終了日とは別の独立マーカー |
| `stop` | date-time | — （**拡張領域へ**） | — | **Own** | `Task/Stop` とは**意味がずれる**ので写さない（§3-4 #8） |
| `resume` | date-time | — （**拡張領域へ**） | — | **Own** | 同上 |
| `milestone` | bool | `Task/Milestone` | `xsd:boolean` | **Own** | マイルストーン判定 |
| 担当者（表示のみ） | — | `Resource/Name` ← `Assignment` 経由 | `xsd:string` | **Consume** | GRS に自由入力欄は持たない |
| WBS 階層 | — | `Task/OutlineLevel` | `xsd:integer` | **Reconstruct** | `wbs_parent_uid` から算出して書く |

### 2-2. MSPDI に対応が**無い**項目（GRS 固有）

**すべて視覚・運用の属性であり、MS Project 側に受け皿が存在しない。**

| GRS プロパティ | 何のためか | なぜ MSPDI に無いか |
|---|---|---|
| `nameAnchor` / `nameAlign` | 名称ラベルの位置（9 点アンカー＋整列） | MSPDI は**描画設定を持たない**（ビュー定義はファイル外） |
| `iconShapeKind` | 字形（矩形/矢羽根/矢印/細線スパン、菱形ほか） | 同上 |
| `strokeColor` / `fillColor` / `lineWeight` | 枠色 / 塗り色 / 線の太さ | 同上（Bar Styles は MSPDI に入らない） |
| `importance` | 縮小時に何を残すか（LOD） | GRS 固有の表示制御 |
| `progressStatus` | 進捗の自由文字列 | `PercentComplete` は数値のみ |
| `fadeInDays` / `fadeOutDays` | バー端のぼかし（日付の曖昧さ） | GRS 固有の表現 |
| `TaskGroup` / `TaskGroupMember` / `stackOrder` | **マルチバー（軸B）** | MSPDI は「1 行 = 1 タスク = 1 バー」。**概念が無い**（`mspdi-core-tree.md` の対比図） |

> **`TaskGroup` 系は export しない**（GRS 専用の視覚層）。以下 §4 の格納方式は
> **「1 つの `Task` に付随する GRS 固有属性」**についての議論である。

---

## 3. 進捗と実績（仕様）

**この節は仕様である。検討の経緯は含まない。** 式では略語を使わず要素名をそのまま書く。

---

### 3-1. MSPDI の仕様

**管理する要素**（すべて `Task` の子。`Units` のみ `Assignment`、`MinutesPerDay` / `StatusDate` は `Project`）

| 分類 | 要素 | XSD 型 | 意味 |
|---|---|---|---|
| 日付 | `Start` / `Finish` | `xsd:dateTime` | 予定の開始 / 終了 |
| 日付 | `ActualStart` / `ActualFinish` | `xsd:dateTime` | 実績の開始 / 終了 |
| 日付 | `Stop` / `Resume` | `xsd:dateTime` | 実績が入っている境界 / 残作業の再開日 |
| 日付 | `Deadline` | `xsd:dateTime` | 期限。終了日とは別 |
| 期間 | `Duration` | `xsd:duration` | 所要期間 |
| 期間 | `ActualDuration` / `RemainingDuration` | `xsd:duration` | 実績期間 / 残期間 |
| 工数 | `Work` | `xsd:duration` | 作業量（人日・人時） |
| 工数 | `ActualWork` / `RemainingWork` | `xsd:duration` | 実績工数 / 残工数 |
| 割合 | `PercentComplete` | `xsd:integer` | **期間**の完了率（0〜100） |
| 割合 | `PercentWorkComplete` | `xsd:integer` | **工数**の完了率（0〜100） |
| 割合 | `PhysicalPercentComplete` | `xsd:integer` | 手入力の完了率（EVM 用） |
| 割当 | `Units` | `xsd:float` | 割当率。1 人 100% = 1.0 |
| 制御 | `Type` | enum | 0=Fixed Units / 1=Fixed Duration / 2=Fixed Work |
| 制御 | `EffortDriven` | `xsd:boolean` | 工数固定でスケジュールするか |
| 換算 | `MinutesPerDay` | `xsd:integer` | 1 日の分数。既定 480（＝8 時間） |
| 基準 | `StatusDate` | `xsd:dateTime` | 予実の基準日 |

**不変条件**

```
PercentComplete = 0     ⇔  ActualStart なし
PercentComplete > 0     ⇒  ActualStart あり
PercentComplete = 100   ⇔  ActualFinish あり かつ RemainingDuration = 0
```

**単位**

```
Duration, ActualDuration, RemainingDuration, Work, ActualWork, RemainingWork
    … すべて「時間」で格納する（ISO 8601 duration。例 PT80H0M0S）
日数 = 時間 ÷ (MinutesPerDay ÷ 60)
```

**要点**

- **`PercentComplete` が標準の進捗率**（期間ベース）。`PercentWorkComplete` と `PhysicalPercentComplete` は別値で一致しない。
- **`Duration` は人日ではない。** 人日は `Work`。両者をつなぐのは `Units` のみ。
- ユーザーは `PercentComplete` / `ActualDuration` / `RemainingDuration` / `ActualStart` / `ActualFinish` の
  **どれか 1 つを入れればよい**。残りは MS Project が再計算する。

---

### 3-2. GRS の仕様

**管理する項目**

| 分類 | 項目 | 意味 |
|---|---|---|
| 日付 | `start` / `finish` | 予定の開始 / 終了 |
| 日付 | `actualStart` / `actualFinish` | 実績の開始 / 終了 |
| 日付 | `stop` / `resume` | 中断 / 再開 |
| 日付 | `deadline` | 期限 |
| 割合 | `progressRatio` | 進捗率（0〜1。画面では 0〜100 %） |
| 基準 | `Project.statusDate` | 予実の基準日。イナズマ線の縦線位置 |
| 表示 | 担当者名 | `Assignment` → `Resource.Name` から導出。**編集しない** |

**持たない項目**

```
Duration, ActualDuration, RemainingDuration,
Work, ActualWork, RemainingWork, Units, Type, EffortDriven
```

→ **GRS に工数の概念は存在しない。** 資源管理をしないため（`user-order.md`「やらないこと」）。

**不変条件（GRS が保証する）**

```
0 ≦ progressRatio ≦ 1
progressRatio = 0    ⇒  actualStart なし / actualFinish なし
progressRatio > 0    ⇒  actualStart あり
progressRatio = 1    ⇔  actualFinish あり
actualFinish あり     ⇒  progressRatio = 1
actualStart ≦ actualFinish
```

**入力規則（3 状態）**

| 状態 | `actualStart` | `actualFinish` | `progressRatio` | ユーザーが入力するもの |
|---|---|---|---|---|
| 未着手 | 空 | 空 | 0 | 何も入れない |
| **進行中** | **着手日（必須）** | 空 | 0 < r < 1 | **着手日 ＋ 進捗率** |
| 完了 | 着手日 | **完了日（必須）** | 1 | **完了日**（率は自動で 1） |

- **`actualFinish` は完了したときにだけ入れる。** 途中では入れない。
- `actualFinish` を入れたら `progressRatio` を **1 に自動設定**する。
- `progressRatio` を 1 にしたら `actualFinish` の入力を促す（初期値 `statusDate`。自動確定しない）。
- `progressRatio` を 0 より大きくしたら `actualStart` の入力を促す（初期値 `start`）。
- **運用**: 着手時に `actualStart`、以後は `progressRatio` だけ更新、完了時に `actualFinish`。
  **日常的に触るのは進捗率 1 つだけ。**

**イナズマ線の頂点**

```
マイルストーン                              → actualStart があれば actualStart、なければ start
actualFinish あり                           → actualFinish
actualStart あり / actualFinish なし        → actualStart + progressRatio × (finish − actualStart)
actualStart なし / progressRatio > 0        → start + progressRatio × (finish − start)
progressRatio = 0 かつ実績日なし            → 頂点を作らない

同じ行に複数の Task があるときは、最も進んだ頂点が勝つ
縦線は statusDate（無ければ今日）に引く
```

---

### 3-3. 計算式

**MSPDI 内部の関係**

```
Duration            = ActualDuration + RemainingDuration
PercentComplete     = ActualDuration / Duration × 100

Work                = ActualWork + RemainingWork
PercentWorkComplete = ActualWork / Work × 100

Work                = Duration          × Units
ActualWork          = ActualDuration    × Units
RemainingWork       = RemainingDuration × Units
```

**Import（MSPDI → GRS）**

```
start          = Start
finish         = Finish
actualStart    = ActualStart
actualFinish   = ActualFinish
progressRatio  = PercentComplete ÷ 100

Carry（解釈せず保管する）
  Duration, ActualDuration, RemainingDuration,
  Work, ActualWork, RemainingWork, PercentWorkComplete,
  PhysicalPercentComplete, Units, Type, EffortDriven
```

**Export（GRS → MSPDI）— 未編集タスク**

```
Start           = start
Finish          = finish
ActualStart     = actualStart
ActualFinish    = actualFinish
PercentComplete = round(progressRatio × 100)

Duration, ActualDuration, RemainingDuration, Work, ActualWork, RemainingWork, …
                = Carry の値をそのまま書き戻す
```

**Export（GRS → MSPDI）— 編集タスク。この順序で計算する**

```
1.  PercentComplete   = round(progressRatio × 100)
2.  Duration          = finish − start                          （稼働日・暦で算出）
3.  ActualDuration    = Duration × (PercentComplete ÷ 100)
4.  RemainingDuration = Duration − ActualDuration

Work, ActualWork, RemainingWork, PercentWorkComplete
                      = Carry の値をそのまま書き戻す（触らない）
```

**順序の理由**: `progressRatio` から直接 `ActualDuration` を出すと、書き出す整数 `PercentComplete` と
食い違う。**書き出す値そのものから算出**すれば、出力ファイル内で
`ActualDuration / Duration = PercentComplete` が厳密に成立する。

**「編集タスク」の定義**

```
start / finish / actualStart / actualFinish / progressRatio
のいずれかが変わったタスク
```

**端点**

```
progressRatio = 0   → ActualDuration = 0、RemainingDuration = Duration、ActualStart を書かない
progressRatio = 1   → ActualDuration = Duration、RemainingDuration = 0、ActualFinish は必須
マイルストーン       → Duration = 0。PercentComplete は 0 か 100 のみ（0 除算に注意）
DurationFormat       → 元の値の書式を踏襲する
```

---

### 3-4. 決定事項と根拠

| # | 決定 | 根拠 |
|:--:|---|---|
| 1 | 進捗率は **`PercentComplete` だけ**を使う | 期間ベースの標準フィールド。`PercentWorkComplete` は資源割当が前提、`PhysicalPercentComplete` は EVM 用。どちらも対象外 |
| 2 | `PercentComplete` は **Own**（読んで保持する） | 進行中タスクは `ActualFinish` が空で、日付だけからは到達率が出ない。読み捨てると **export で相手の進捗を全消去する** |
| 3 | **派生量は編集したタスクだけ再計算**し、未編集タスクは受け取った値をそのまま返す | 未編集タスクを再計算すると、暦の解釈が相手と 1 日ずれたときに**往復差分が出る**（項 56 違反） |
| 4 | `Duration` も #3 の原則に従う（**無条件 Reconstruct をやめる**） | 同じ理由。編集フラグはどちらにせよ必要なので追加コストは実質ゼロ |
| 5 | **工数側（`Work` 系）は再計算しない** | 正しく直すには `Type`（Fixed Units / Duration / Work）と `EffortDriven` の解釈が必要＝**スケジューラの仕事**で、「やらないこと」で除外済み。Fixed Work タスクに `Work = Duration × Units` を当てると**誤った値**になる |
| 6 | **工数側は削除もしない**。温存して**通知**する | 手入力された工数を失うおそれがある。**直せないものを黙って消すのは項 61「勝手に消さない・知らせる」に反する**。通知文: 「進捗を変更したタスクがあります。工数は更新していないため、相手側で更新が必要です」 |
| 7 | GRS 側で MSPDI と**同じ不変条件**を守る（§3-2 の入力規則） | 入力段階で矛盾を作らせなければ、export の計算式が常に成立する |
| 8 | `Stop` / `Resume` は **MSPDI へ写さず拡張領域に置く** | MSPDI の意味は「実績が入っている境界」で、GRS の「中断/再開」とずれる。写すと**相手の画面で違うものに見える**。拡張領域なら誤解が生じず、進捗編集時に `Stop` が古くなる問題も同時に消える |

**検査（CI に入れる）**

```
1. 未編集で往復 → ExtendedAttribute の原順序まで完全一致
2. 進捗を編集して往復 → 出力ファイル内で
     ActualDuration / Duration = PercentComplete       が成立
     Duration = ActualDuration + RemainingDuration     が成立
3. 進行中タスク（ActualFinish 空）を必須ケースに含める
4. 工数を持つファイルを編集 → 工数が変わっていない ＋ 通知が出る
5. マイルストーン（Duration = 0）で 0 除算しない
```

> **未検証**: 「MS Project が量と率のどちらを信じるか」は XSD に書かれておらず、実機で確認していない。
> **本仕様はその答えに依存しない**（GRS 側で整合させるので、相手がどちらを信じても同じ結果になる）。

---

## 4. MSPDI に無い項目をどこへ置くか

### 前提: MSPDI の拡張領域（`ExtendedAttribute`）は 2 層構造

XSD で確認した構造:

- **定義側**（`Project/ExtendedAttributes/ExtendedAttribute`）: `FieldID`（カスタムフィールドの PID）/ `FieldName` / `CFType`（0=Cost, 1=Date, 2=Duration, 3=Finish, 4=Flag, 5=Number, 6=Start, 7=Text）
- **値側**（`Task/ExtendedAttribute`）: `FieldID` ＋ `Value`（`xsd:string`）

XSD の注記に明示がある: 「子要素の数に上限はないが、**Project が理解するのは Flag1-Flag10 等に限る**」。
つまり **XSD 上は無制限だが、実際に相手ツールが解釈できる枠は有限**（`Text`/`Number`/`Date`/`Flag` 等の既定枠）である。

> ⚠️ **枠の正確な本数（`Text` が何番まで等）は XSD には書かれていない。** 上記の注記から「有限である」ことだけが
> 読み取れる。**次期は実機（MS Project）で使える枠の上限を確認してから割当表を作ること。**
> 本書はこの点を未検証として明示する。

### 格納方式の結論

| 案 | やり方 | 判定と根拠 |
|---|---|---|
| A | `Notes` に JSON を埋める | ❌ **却下**。`Notes` は人が読み書きする欄。人が編集すると壊れ、相手の画面に**ゴミが見える** |
| B | 空き枠を**動的に**確保する | ❌ **却下**。同じ属性が文書ごとに違う枠に入り、**差分が読めない**（非決定的） |
| **C** | **固定枠 ＋ 衝突検出 ＋ 未使用枠への退避** | ✅ **採用**。通常は**決定的**（同じ属性が常に同じ枠）で差分が読める。衝突しても相手を壊さない |

**案C の要点**

```
各属性に固定の枠を割り当てる（例: Text20 = progressStatus, Number18 = fadeInDays）
FieldName に GRS 由来を示す名前を書く
import 時にその枠が他ツールに使われているかを検出する
使われていたら未使用枠へ退避し、対応表を文書内に持つ
```

**衝突検出が必須な理由**: 主要な入力元は**外部マスタ等の第三者生成 MSPDI** であり、
**同じカスタムフィールド枠を既に使っている可能性が現実にある**。固定枠のみだと**他ツールのデータを黙って壊す**。

### 4-1. 案C の適用範囲（次期で確定させること）

| 属性 | 往復させるか | 理由 |
|---|---|---|
| `fadeInDays` / `fadeOutDays` | **させる**（前プロジェクトで実装済み） | 日付の曖昧さは業務上の情報 |
| `importance` / `progressStatus` | **させる** | GRS 同士の往復で失うと運用が崩れる |
| `iconShapeKind` / 色 / `lineWeight` / `nameAnchor` / `nameAlign` | **要判断** | **純粋な描画設定**。MSPDI の思想は「ビュー定義はファイル外」なので、往復に載せると枠を大量に消費する。**JSON 側だけで持つ**選択もある |
| `TaskGroup` / `TaskGroupMember` / `stackOrder` | **させない** | 軸B は GRS 専用（`grs-native-erd-ja.md`） |

> **推奨**: **業務情報は往復させ、純粋な見た目は JSON だけで持つ**。
> `user-order.md` 項 57「JSON を渡せば GRS 同士で同じ見た目が再現される」は JSON で満たせる。
> MSPDI 側に見た目を載せるのは**枠の消費に見合わない**。ただし「MSPDI だけで見た目も往復したい」という
> 要求が出たら枠数の上限を先に数えること。

---

## 4-2. 案C の詳細設計（**協議項目**）

案C を基本とする方針は決まった。以下は**その中で決めるべき 8 点**である。
各項に選択肢と推奨を置いた。**推奨は根拠つきの提案であって、確定ではない。**

### C-1. 何を何本の枠に載せるか

往復対象（§4-1）は `progressStatus`（文字列）/ `importance`（実数）/ `fadeInDays` / `fadeOutDays`（整数）。

| 案 | やり方 | 枠消費 | 評価 |
|---|---|:--:|---|
| a | 属性ごとに**型に合った枠**（`progressStatus`→Text、`importance`→Number、fade→Number×2） | **4** | 相手ツールでも数値として並べ替え・絞り込みができる。枠を最も食う |
| b | 全部 Text 枠に文字列化 | 4 | a と同じ本数で型の利点が無い。**選ぶ理由がない** |
| c | **1 つの Text 枠に JSON でまとめる** | **1** | 枠消費と衝突確率が最小。ただし相手の画面では**意味不明な文字列**に見え、人が編集できない |
| **d** | **ハイブリッド**: 人が読んで意味がある業務情報は個別枠、GRS の表示制御は 1 枠に JSON でまとめる | **2** | ✅ **推奨** |

**推奨 d の内訳**: `progressStatus` → **Text 枠 1 本**（人が読む業務情報。相手の画面で意味がある）／
`importance` ＋ `fadeInDays` ＋ `fadeOutDays` → **Text 枠 1 本に JSON**（GRS の表示制御。相手には意味がない）。

> ※ `fadeInDays`/`fadeOutDays` は前プロジェクトで**個別枠**に載せた。d に寄せるなら**方式変更**になる。
> 「相手ツールでフェード日数を見たい」なら a、「枠を節約したい」なら d。**ここは要判断。**

### C-2. 固定枠の番号をどちら側から取るか

| 案 | やり方 | 評価 |
|---|---|---|
| a | 小さい番号から（`Text1`, `Number1` …） | ❌ **人は `Text1` から使う**。衝突確率が最も高い |
| **b** | **大きい番号から**（`Text30`, `Number20` … 上限側） | ✅ **推奨**。実務上の衝突確率が最も低い |
| c | 中央付近から | 根拠が弱い |

> ⚠️ **前提の未検証**: 枠の実際の上限本数は XSD に書かれていない（§4 前提の警告）。
> **b を採るには実機で上限を確認する必要がある**。確認前は「上限が分かっている型だけ使う」で始めるのが安全。

### C-3. `FieldName` の命名規則

| 案 | 例 | 評価 |
|---|---|---|
| **a** | **`GRS:progressStatus`** | ✅ **推奨**。接頭辞で由来が一目で分かり、**機械照合のキーにもできる**。ASCII |
| b | `grs_progress_status` | 由来は分かるが、区切りが属性名と混ざる |
| c | 日本語の人間向け名 | 相手の画面で読みやすいが**機械照合に使えない**（i18n で揺れる） |

### C-4. 「その枠は使われている」の判定

| 案 | 判定 | 評価 |
|---|---|---|
| a | 定義側（`Project/ExtendedAttributes`）に `FieldID` があれば使用中 | 定義なしで値だけあるファイルを**見逃す** |
| b | 値側（`Task/ExtendedAttribute`）に値があれば使用中 | 定義だけ先に置かれた枠を見逃す |
| **c** | **a または b**（両方見る） | ✅ **推奨**。取りこぼしがない |

**重要な例外**: `FieldName` が **`GRS:` 接頭辞なら「自分が前回書いた枠」**であって衝突ではない。**再利用する。**
これを判定に入れないと、**往復ごとに退避が起きて枠が毎回変わる**（案B と同じ非決定性に落ちる）。

### C-5. 衝突したときの退避

| 案 | やり方 | 評価 |
|---|---|---|
| **a** | **未使用枠を（C-2 の向きで）探して最初の空きへ退避**する | ✅ **推奨** |
| b | 取込を中止して人に聞く | 「勝手に消さない・知らせる」（項 61）より重い。取込のたびに止まる |
| c | その属性だけ MSPDI へ出さない（JSON のみ） | 全枠満杯時の**フォールバック**として採用 |

**推奨**: **a を基本、全枠満杯なら c にフォールバックし、必ずユーザーへ通知する。**
黙って落とすのは項 61「勝手に消さない・知らせる」に反する。

### C-6. 割当（どの属性がどの枠か）の記録場所

| 案 | 記録場所 | 評価 |
|---|---|---|
| a | MSPDI の `ExtendedAttributes` 定義の `FieldName` に書く | **ファイルが自己記述**になる。他ツールと次回の GRS が読める |
| b | GRS JSON の `documentSettings` に持つ | JSON だけ渡された時に再現できる |
| **c** | **両方**（正は a） | ✅ **推奨**。MSPDI は自己完結スナップショットの思想なので**正は a**。JSON にも写して項 57 を満たす |

### C-7. 枠が全部埋まっていたとき

**C-5 の c にフォールバック**（JSON のみに保持し MSPDI へは出さない）＋**ユーザーへ通知**。
そのうえで、**`Drop = 0` の検査における例外として明示的に記録**する。
「Drop ゼロ」は GRS が**相手から受け取ったもの**を落とさない約束であり、
**GRS 固有の属性が枠不足で載らないことは別事象**である。混ぜて検査すると原因が読めなくなる。

### C-8. 往復同一性の検査（CI に入れる）

| # | 検査 | なぜ |
|:--:|---|---|
| 1 | 未編集往復で `ExtendedAttribute` が**原順序まで一致**する | 順序が変わると差分ツールで比較できない |
| 2 | **進行中タスク**（`ActualFinish` 空）のケースを必須に含める | 台帳 H-2。完了タスクだけの検証では進行中の欠落を見逃す |
| 3 | **衝突があるファイル**での往復（退避が起きる経路）を必須に含める | 例外パスは実装が薄くなりがち。ここが壊れると相手のデータを壊す |
| 4 | **全枠満杯**のファイルでの往復（フォールバック経路） | 通知が出ること・JSON 側に残ること |
| 5 | **進捗を編集した**タスクの往復（§3-3 の再計算が効くこと） | 意味の破壊を検出できる唯一の検査 |

---

## 5. 次期への申し送り

1. **項目を増やす前に「MSPDI に受け皿があるか」を必ず確認する**。無い項目は拡張領域の枠を消費し、枠は有限である。
2. **テキスト列を増やさない**。`name` ＋ `notes` の 2 つで止める（**確定**）。前プロジェクトは 5 つ持って溢れた。
   - **副作用に注意**: 略称を廃止したので、**アイコンには `name` がそのまま描かれる**。`name` は長くなりがちなので、
     **長い名称の表示規則**（省略・はみ出し許容・折返しのいずれか）を決めないとラベルが破綻する。→ `user-order.md` 項 17
3. **`Stop`/`Resume` は拡張領域に置く**（確定。§3-4 #8）。
4. **往復無損失の検査を CI に入れる**（入口で自己検証・出口で往復同一性・Drop=0）。後付けできない。
5. 本書の「MSPDI 側」列は XSD 実測だが、**MS Project の計算規則（§3-3）は製品挙動であって XSD には書かれていない**。
   実機で確かめてから依存すること。
