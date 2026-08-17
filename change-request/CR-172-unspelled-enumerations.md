# CR-172 — 綴られていない列挙 4 件と、型を読めない設定値 3 件

> ⛔ **未適用。利用者の裁定を待っている。**
> **閉じるもの**: `erd_json_to_schema.py --report` が挙げる「メンバの綴られていない列挙 4 件」と
> 「型を読めない設定値 3 件」。
> ⚠️ **どれも「仕様書が決めていないから機械が読めない」のではない。メンバは 4 件とも決まっている。**
> **決まっていないのは、格納する英語の綴りである —— それは調べ物ではなく命名の裁定である。**

## 1. 出どころ

`PYTHONIOENCODING=utf-8 python docs/spec/_assets/source/erd_json_to_schema.py --report` の全文:

```
settings keys      : 97
entity definitions : 18

-- enumerations with no spelled-out members (4)
   TaskVisual.nameAlign
   TaskVisual.milestoneGlyph
   TaskVisual.lineWeight
   CommentBox.leaderShapeKind
-- settings keys with no readable type (3)
   dualCursor.date1 (`null`)
   dualCursor.date2 (`null`)
   planActualGuidePattern (`2,2`)
-- entities no property points at (0)
-- settings rows that are not a stored key (6)
   S-53   `zoomStep`                         marked not stored
   S-54   `zoomMin`                          marked not stored
   S-55   `zoomMax`                          marked not stored
   S-118  ラグの単位                              not a named key
   S-111  掴み点を出す条件                           not a named key
   S-105  `planActualGuideColor`             its own row says it is not stored
-- problems (0)
```

Chapter 6.1 が既にこれを命じている —— 「⭐ **足りないものは原稿の側を直し、スキーマに強制させること（MUST）。**」
**埋めることは既存の MUST への追従であって、新しい機能ではない。**

### ⭐ 在ったので本 CR が触らないもの

| | 仕様書のどこが持っているか | 数 |
|---|---|:-:|
| `milestoneGlyph` の**メンバと順序** | 表 T-012 の `SH-5` の表記欄（〇 六角形 五角形 ◇ □ ☆ △ ▽）。`FR-078` が「表 T-012 の `SH-5` が挙げる図形」から選べることを求め、`S-48` が「☆ の面積を決め、`milestoneGlyph` の面積順に影響する」と書く —— **順序が面積順であることまで決まっている** | 8 |
| `nameAlign` の**メンバ** | `FR-002` の MUST「位置の指定は 9 点アンカーと左詰め / 中央 / 右詰めで持つこと」。⭐ **自動配置は 4 つ目のメンバではない** —— 列が `null` を許すことが担っている | 3 |
| `lineWeight` の**メンバ** | 表 T-017 の `CL-2`（細 / 中 / 太）。`FR-007` が太さを色に頼らない識別手段として必須と書く（`FR-030`）| 3 |
| `leaderShapeKind` の**メンバ** | `FR-019` の MUST「コメントボックスは引出し四角と折れ線の 2 種から選べること」。入口は `CM-49`（`setCommentBoxLeaderShapeKind`）| 2 |
| `dualCursor` が**日付を 2 つ持つこと** | 表 T-029 の `CU-2`（持たないと測った日数が再現しない）と 表 T-029a の `DC-1` | —— |
| `planActualGuidePattern` が**刻みの対（描く長さ・空ける長さ）であること** | `S-104` の備考自身と、表 T-020a の `GD-6` | —— |
| **「格納しない 6 行」** | ⭐ **どれも意図どおりである。** `S-53` / `S-54` / `S-55` は ⛔ の印を持ち、`S-118` / `S-111` は方針の行で名前付きの鍵ではない | 6 |
| **スキーマが `values` を受け入れる形** | `erd.schema.json` が既に配列・`minItems 1`・`uniqueItems`・文字列と定めている。**スキーマ側の変更は要らない** | —— |

### ⛔ 本当に無いもの

| | 無いもの | 測った事実 |
|---|---|---|
| (a) | **13 の綴りのうち 11 が `docs/spec` のどこにも無い** | 綴られているのは `'left'` と `'thin'` だけで、どちらも自分の型欄の中に在る。**残り 11 は仕様書に 1 度も現れない** |
| (b) | **綴りの流儀を仕様書が言っていない** | `erd.json` の `shapeKind` は lowerCamelCase（`rectangle` / `chevron` / `arrow` / `endpointSpan` / `milestone`。**多語のものが camelCase である**）。⚠️ **kebab-case は `tbl-settings.md` の 表 T-202 にしか無い**（`'plan-only'` / `'single-vertical'`）。**2 つの文書が違う流儀を使っており、どちらに従うかを書いた文が無い** |
| (c) | **`AT-99` / `AT-104` の型欄の員数が 2 通りに読める** | 「列挙（`'left'` ほか 3 値）」は、普通の日本語の言い回し（「…ほか 3 名」）では **4**、「`'left'` ほか」＋「3 値」では **3** と読める。⭐ **3 が正しい** —— 同じ言い回しの `lineWeight` の散文（`CL-2`）も 3 つであり、他の列挙は素の総数（`shapeKind` 5・`milestoneGlyph` 8・`leaderShapeKind` 2）を書き、4 つ目の揃えは `docs/spec` のどこにも無い。**メンバが足りないのではなく、員数の文が曖昧である** |
| (d) | **綴りの置き場が決まっていない** | 表 T-012 は `shapeKind` の値を持つ `値` の列を既に持ち、`erd.json` はそれを写している。`milestoneGlyph` が同じ先例に従うなら**専用の表が要る**（`SH-1` 〜 `SH-5` は `shapeKind` の席であり、別の列挙を混ぜられない）。⚠️ **表を足せば `tables` と `rows` の総数が動く** |
| (e) | **`S-65` の型欄が機械の読める形でない** | `erd_json_to_schema.py` の `settings_type()` は `^`\{ ([\w, ]+) \}`` で当てており、**文字クラスが単語文字と読点しか許さない。** `{ date1: 日付, date2: 日付 }` は当たらず、既定欄の `null` に落ちる。⛔ **`erd.json` を直しても解けない** —— これは `tbl-settings.md` の行であり、生成器側の変更が要る |
| (f) | **`S-104` を読む欄がそもそも無い** | 表 T-208 は `型` の列を持たない。生成器は `値` 欄の `2,2` を読み、単一のリテラルでないので開いた型に落ちる |
| (g) | **`S-105` に ⛔ の印が無い** | 備考が「格納しない」と書くのに、`S-53` 〜 `S-55` が持つ印を持たない。**版 0.42 の変更履歴が既にこの食い違いを記録している。** 列挙とは無関係の 1 文字の直しである |

## 2. 何をするか —— ⛔ **未適用**

**利用者の裁定が 5 件ある。裁定が出るまで `erd.json` も `tbl-settings.md` も触らない。**

### 裁定 1 —— 11 の綴り（`'left'` と `'thin'` 以外すべて）

`shapeKind` の流儀（lowerCamelCase）に従えば、13 のうち 11 は機械的に決まる。**残る 2 つは仕様書が決められない。**

| 列 | 提案する綴り | 発明の度合い |
|---|---|---|
| `milestoneGlyph` | `circle` / `hexagon` / `pentagon` / `diamond` / `square` / `star` / `triangleUp` / `triangleDown` | ⚠️ **`triangleUp` と `triangleDown` は発明である** —— 仕様書は △ と ▽ という図形しか書かず、「上」「下」と一度も書いていない。**順序は `SH-5` の順（`S-48` が面積順と定める）** |
| `nameAlign` | `left` / `center` / `right` | `'left'` は既に在る |
| `lineWeight` | `thin` / `medium` / `thick` | `'thin'` は既に在る |
| `leaderShapeKind` | `calloutBox` / `polyline` | ⚠️ **`calloutBox` は発明である** —— 引出し四角に英語が 1 つも無い。⛔ **前プロジェクトの `'callout-box'` を反射で採らないこと** —— kebab は `tbl-settings.md` の流儀であって `erd.json` のものではない |

### 裁定 2 —— 綴りの置き場

| 案 | 代価 |
|---|---|
| **`erd.json` だけに置く** | 6.2（日程データの群は `erd.json` が原稿）に沿う。`nameAlign` / `lineWeight` / `leaderShapeKind` は散文と表の欄しか持たないので、**どのみちこの形になる** |
| **表 T-012 の先例に倣って値の表を新設する** | 1.9（細目は表に置き、要求は 1 文で指す）に沿う。⚠️ **`tables` と `rows` の総数が動く** ので、**編集の前に決める必要がある** |

### 裁定 3 —— `AT-99` / `AT-104` の員数の文

「3 値。`'left'` / `'thin'` はそのうちの 1 つ」で確定してよいか。よければ型欄を素の総数へ:
「列挙（`'left'` ほか 3 値）」→「列挙（3 値）」、「列挙（`'thin'` ほか 3 値）」→「列挙（3 値）」。
⚠️ **これは化粧ではない** —— 生成物である 表 T-058 の `AT-99` / `AT-104` と 図 F-011 の 2 行が書き換わる。

### 裁定 4 —— `dualCursor.date1` / `date2`（`S-65`）

型は仕様書が決めている（`CU-2` / `DC-1`）。⛔ **`erd.json` ではなく `tbl-settings.md` の行である。**
`S-77`（`scrollDate`）が「日付 / `null`」と書く先例に倣うか、**生成器の正規表現を欄ごとの型が書ける形へ広げるか。**
今の落とし前: `document-settings.ts:48` と `:50` が `unknown` を持ち、`schedule-geometry.ts` がカーソル未実装の理由としてこれを挙げている。

### 裁定 5 —— `planActualGuidePattern`（`S-104`）

表 T-208 に `型` の列を足すか、生成器に `値` 欄から対を読ませるか。**これも `tbl-settings.md` の行である。**

## 3. ⚠️ 書かないと決めたもの

| | |
|---|---|
| **`S-105` の ⛔ 印** | ⛔ **本 CR に含めない。** 列挙とは無関係であり、版 0.42 の変更履歴が既に記録している。**1 つの CR に無関係な直しを混ぜない** |
| **既定のマイルストーン図形** | ⚠️ **仕様書はどこにも定めていない**（`P-15` の「マイルストーン（◇ ほか）」は辞書の例示であり、表 T-202 に既定の図形の鍵は無い）。⛔ **本 CR で決めない** —— 綴りの裁定と一緒に上げる別の問いである |
| **`schedule-geometry.ts:29-33` の注記** | ⚠️ **8 つの綴りが存在しないことを事実として書き、だから全マイルストーンを ◇ で描くと書いている。** 埋めた瞬間に古くなり、**どの検査も知らせない。** さらにその注記は「表 T-012 の `SH-5` が最初に挙げる ◇」と書くが、⛔ **`SH-5` が最初に挙げるのは 〇 である** |

## 4. 数の予測

⛔ **未適用のため、本 CR による変化は無い。**

| | 改定前 | 改定後 |
|---|---|---|
| `tables` / `rows` / `uids` / `figures` | —— | **すべて不変** |

**裁定が出たときに動くもの**（見積り。裁定 2 で「表を新設する」を選ぶと `tables` と `rows` がさらに動く）:

| 検査 | 走らせるもの | 何が書き換わるか |
|:-:|---|---|
| 16 | `erd_json_to_md.py` | ⚠️ **`values` を埋めるだけなら 1 バイトも動かない** —— 生成器が描くのは散文の `type` 欄であって `json.values` ではない。**裁定 3 を同じ回で入れるなら**、表 T-058 の `AT-99` / `AT-104` と 図 F-011 の 2 行が動く |
| 17 | `erd_json_to_schema.py` | **4 件とも動く。** 各プロパティが `["string","null"]` から `enum` へ狭まり、4 つの `$comment` が消え、先頭の `$comment` から 4 つの名が落ちる |
| 20 | `tools/generate_entity_types.py` | **4 件とも動く。** `schedule.ts` の `nameAlign` / `milestoneGlyph` / `lineWeight` / `leaderShapeKind` が `string \| null` から直和へ。`shapeKind` が既にそう読める |
