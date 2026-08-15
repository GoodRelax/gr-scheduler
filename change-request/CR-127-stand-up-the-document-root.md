# CR-127 — 文書ルートを部品として立て、`Document` を 1 つの綴りに畳む

## 1. 変更概要

**`DR-1` は、持ち主の無い唯一の `DR-n` である。** 表 T-052 の 5 行のうち `DR-2` は `CP-1`、`DR-3` は `CP-2`、`DR-4` は `CP-3` が「正」として持つのに、**`DR-1`（ルートに 3 群だけを置く）だけはどの部品も持っていない。** 同時に、`Document` を名乗る 26 個の名前が、型としても部品としても存在しないものを指している。

| # | 直すもの | 置き場 |
|---|---|---|
| ① | ⭐ **`Document` を 34 個目の部品として立てる**（型 ＋ `documentViolations`）。`DR-1` に持ち主を与える | 表 T-062 ／ 表 T-064 |
| ② | **文書ぜんたいを扱う 3 部品の辺を `Document` へ畳む** —— `DocumentCodec` / `AgentApiEndpoint` の 3 群への各 3 本を 1 本に、`ApplyDocumentChange` に 1 本を足す | `model.json` |
| ③ | **図 F-010 のルートの箱を `documentRoot` から `Document` へ改める。**「文書ルート」／`Document`／`documentRoot` の 3 綴りが 2 つになる | `erd.json` |
| ④ | **5.4 に但し書きを足す** —— 「箱の名前はその鍵である」はルートの箱に当たらない（ルートは鍵を持たない） | `05-07-design.md` |
| ⑤ | **「33 部品」と数えている 2 箇所を 34 に直す** | `05-07-design.md` |

⭐ **要求の本文は 1 文字も変えない。** 表も要求 `UID` も新設しない。**`GRS JSON` の形も 1 文字も変わらない**（§2-5）。

⚠️ **本 CR は表 T-006a・1.9 に触れない。** 記法と接続語は CR-128 が持つ。

## 2. 変更の背景・目的

### 2-1. グラフで調べた —— **影響は Chapter 5 に閉じている**

```bash
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-062 T-064 DR-1
python .claude/skills/spec-graph-check/graph.py --cycles
```

| 測ったもの | 結果 |
|---|---|
| 表 T-062 を指している要求 | **0 件。** 参照は 5.2（1）・5.3（3）・A.3 変更履歴（1）だけ |
| 表 T-064 を指している要求 | **0 件。** 参照は 5.3（2）・A.3（1）だけ |
| `DR-1` を指している箇所 | **要求 0 件 / 参照 2 箇所** —— どちらも `tbl-glossary.md`（`AM-3` の「正」欄と、見せ方の群についての注記） |
| 全体グラフの閉路 | 6 個。**いずれも本 CR の編集対象を 1 つも含まない**（`AG-11 ↔ AG-6` ほか、既知の規約である 2-閉路） |

**要求の側から表 T-062 / T-064 を指すものが 1 つも無いので、部品を 1 つ足しても要求は動かない。**

### 2-2. `DR-1` に持ち主が無いことの実測

| 表 T-052 の行 | 規則 | 「正」として持つ部品 |
|---|---|---|
| `DR-1` | ルートに 3 群だけを置く。群に属する値をルート直下へ直に置かない | ⭐ **無し** |
| `DR-2` | 日程データの群。鍵は `schedule`、下に 12 鍵 | `CP-1` `Schedule` |
| `DR-3` | 見せ方の群。鍵は `documentSettings` | `CP-2` `DocumentSettings` |
| `DR-4` | 文書の刻印。ルート直下に 3 鍵 | `CP-3` `DocumentStamp` |
| `DR-5` | テーマの色相は `project` が持つ | `CP-1`（`schedule.project` の列） |

**`DR-1` は 3 群すべてに同時に掛かる規則であり、どの 1 群からも検査できない。** `Schedule` は `schedule` の中しか見ず、`DocumentSettings` は `documentSettings` の中しか見ない。**「ルートに 5 鍵しか無いこと」を言えるのは、5 鍵の全数を知っている者だけである。**

### 2-3. `Document` を名乗るものの全数（**機械で数えた**）

```bash
grep -o "`[A-Za-z]*[Dd]ocument[A-Za-z]*`" docs/spec/*.md docs/spec/_assets/*.md | sort | uniq -c
```

**26 個ある**（部品名・型名 11 ／ メンバ名 15）。主なものは `DocumentCodec` / `ApplyDocumentChange` / `EditDocument` / `ImportDocument` / `ValidateImportedDocument` / `ChooseStartupDocument` / `DocumentCommand` / `DocumentStore` / `documentFromJson` / `jsonFromDocument` / `documentFromMspdi` / `mspdiFromDocument` / `readDocument` / `applyDocumentChange` である。

⚠️ **`documentModel`（層の名。16 箇所）と `documentSettings`（鍵の名。9 箇所）は別概念なので数に入れない。**

**26 個が名乗っている当のものが、表 T-064 の 9 つの型のどれでもない。** 表 T-064 が宣言する型は `Schedule` / `DocumentSettings` / `DocumentStamp` / `EditHistory` / `ScheduleLayout` / `ScheduleGeometry` / `DocumentCommand` / `Selection` / `DialogueLog` の 9 つであり、**`Document` は無い。**

### 2-4. 立てないなら 26 個を改名するしかない

**「立てないが名前は残す」は選択肢ではない。** それが現状であり、負債そのものである。立てない場合に起きることを実測した。

| 立てない場合 | 立てる場合 |
|---|---|
| `documentFromJson` の戻り値が **5 つ組**（`Schedule` / `DocumentSettings` / `schemaVersion` / `revisionStamp` / `changeLog`）になる | `Result<Document>` |
| `applyDocumentChange` が 5 つ組を受け 5 つ組を返す。**呼ぶ側が 1 つ落としても型が通り、`AG-3`「全か無か」を型で守れない** | `(Document, DocumentCommand) → Result<Document>` |
| `AM-3 readDocument`「ルートの 3 群すべてを含む凍結された複製」の戻り値の型が書けない | `Readonly<Document>` |
| `DR-1` の検査関数に置き場が無い | `documentViolations` |
| **26 個の改名。うち 11 は部品名なので 表 T-062・T-064・5.3 の木・`model.json` まで動く** | **改名 0 件** |

### 2-5. ⭐ `GRS JSON` の形は 1 文字も変わらない

**本 CR はファイル形式に触れない。** `Document` は既にある 5 鍵に名前を与えるだけであり、入れ子を 1 段も増やさない。

```jsonc
{
  "schemaVersion": "1.0",            // ┐ DR-4  ← CP-3 DocumentStamp
  "revisionStamp": { … },            // ├
  "changeLog": [ … ],                // ┘
  "schedule": { … },                 //   DR-2  ← CP-1 Schedule
  "documentSettings": { … }          //   DR-3  ← CP-2 DocumentSettings
}                                    // ← この一番外側の { } が CP-34 Document である
```

⛔ **器を 1 段増やすこと（`{ "document": { … } }`）はしない。** `FR-021`（往復）と `FR-024`（常に全項目）が壊れ、`DR-1` の「ルートに 3 群だけ」も崩れる。

### 2-6. 決定② 辺の付け替えの規則は 1 つに決まる

**文書ぜんたいを扱う者は `Document` に依存し、1 群だけを扱う者はその群に依存する**（LoD ／ ISP）。**ルート 3 群へ入る辺は現在 15 本ある。**

| いまの辺 | 判定 | 根拠 |
|---|---|---|
| `DocumentCodec →` `Schedule` / `DocumentSettings` / `DocumentStamp` | **畳む（−3 ＋1）** | `FR-024` が「常に全項目を書き出す」と定めており、扱うのは文書ぜんたいである |
| `AgentApiEndpoint →` `Schedule` / `DocumentSettings` / `DocumentStamp` | **畳む（−3 ＋1）** | `AM-3 readDocument` は「ルートの 3 群すべてを含む」（表 T-107）／ `AG-4`「凍結された複製」 |
| `ApplyDocumentChange → Document` | ⭐ **足す（＋1）** | `AG-3`「全か無か」で文書ぜんたいを組み立て直す。既存の `→ DocumentStamp` は `advancedStamp` を名指しで呼ぶので**残す** |
| `Document →` `Schedule` / `DocumentSettings` / `DocumentStamp` | **足す（＋3）** | 5 鍵の合成 |
| 残り **9 本** —— `ScheduleLayout → Schedule` / `→ DocumentSettings` ／ `SvgRenderer → DocumentSettings` ／ `EditDocument → Schedule` / `→ DocumentSettings` ／ `ImportDocument → Schedule` ／ `ScheduleGeometry → Schedule` ／ `ApplyDocumentChange → DocumentStamp` ／ `ChooseStartupDocument → DocumentStamp` | **残す** | いずれも 1 群しか要らない |

```
現状             33 節点 / 71 辺
Document 追加後  34 節点 / 71 辺    （−6 畳む  ＋3 新規  ＋3 Document→3 群）
```

⚠️ **節点は 1 つ増えるが、辺は増減しない。**

### 2-7. 決定③ 図 F-010 のルートの箱 —— **いま 1 概念に 3 綴りある**

| 綴り | どこ | 数 |
|---|---|--:|
| 「文書ルート」 | 要求・設計・変更履歴（散文） | 5 |
| `Document` | 部品名・メンバ名 | 26 |
| ⚠️ `documentRoot` | **図 F-010 の箱**（`erd.json` の `container.boxes[0].id` と 4 本の辺の `from`） | 5 |

**箱を `Document` に改めると 3 綴りが 2 つになる。** 散文の「文書ルート」は日本語であり、表 T-006b（単独で使ってはならない日本語・16 語）に「文書」は無いので、そのまま残す。

### 2-8. 決定④ 5.4 の但し書き —— **改名で新しい不整合が 1 つ生まれる**

5.4 は **「図 F-010 の箱は JSON のオブジェクトであり、箱の名前はその鍵である」** と書いている。ところが F-010 の 5 つの箱のうち、**ルートの箱だけは鍵を持たない**（`schedule` / `documentSettings` / `revisionStamp` / `changeLog` は鍵だが、ルートは文書そのものである）。

**この不整合は `documentRoot` のときから在ったが、`Document`（PascalCase の型名）に改めると目に見えるようになる。** 但し書きを足して閉じる。

## 3. 変更箇所

| # | ファイル | 何を |
|---|---|--:|
| 1 | `docs/spec/05-07-design.md` | 表 T-062 に 1 行／表 T-064 に 1 行／ディレクトリ木に 1 フォルダ／「33」→「34」2 箇所／5.4 に但し書き 1 文 |
| 2 | `docs/spec/_assets/source/model.json` | 節点 ＋1／辺 −6 ＋6／`layout` の `documentModel` に 1 節点／`views` 3 つに 1 節点 |
| 3 | `docs/spec/_assets/source/erd.json` | `container.boxes[0].id` と 4 本の辺の `from` |
| 4 | `docs/spec/_assets/fig-erd-overview.md` | ⚠️ **手で直さない。**`erd_json_to_md.py` が書き出す |
| 5 | `docs/spec/_assets/fig-components.svg` ほか 4 枚 | ⚠️ **手で直さない。**`build.py` が書き出す |
| 6 | `docs/spec/A-appendix.md` | 版 0.22 の行 1 本 |

⛔ **触らないもの** —— 要求の本文、表 T-052（`DR-1`〜`DR-5`）、表 T-063、表 T-065、表 T-107、`A-appendix.md` の版 0.21 以前の記録。

## 4. 変更前の仕様

- 表 T-062 は 33 行（`CP-1` 〜 `CP-33`）。`documentModel` は `Schedule` / `DocumentSettings` / `DocumentStamp` / `EditHistory` / `Selection` / `DialogueLog` の 6 部品
- 表 T-064 は 33 行。宣言する型は 9 つで、`Document` は無い
- `model.json` は 33 節点 / 71 辺。ルート 3 群へ入る辺は 15 本
- `erd.json` の `container.boxes[0].id` は `documentRoot`
- 5.3 は「33 のフォルダは 表 T-062 の 33 部品と 1 対 1 である」「33 部品の公開インターフェースを 表 T-064 に」
- 5.4 は「図 F-010 の箱は JSON のオブジェクトであり、箱の名前はその鍵である」（ルートの箱についての但し書きは無い）

## 5. 変更後の仕様

### 5-1. 表 T-062 に足す 1 行（**末尾に置く。`CP-n` は席番号である**）

| 行 ID | 層 | 部品 | 責務 | 正 |
| --- | --- | --- | --- | --- |
| CP-34 | `documentModel` | `Document` | **文書ルートの合成と、`DR-1` の不変条件**（ルートに 3 群だけを置く／群に属する値をルート直下へ直に置かない） | 表 T-052 の `DR-1` |

### 5-2. 表 T-064 に足す 1 行

| 行 ID | 層 | 部品 | 公開するメンバ |
| --- | --- | --- | --- |
| PI-34 | `documentModel` | `Document` | `Document`（型。5 つの鍵は 表 T-052 の `DR-1` 〜 `DR-4`）／ `documentViolations`（`DR-1` に反する箇所） |

⚠️ **`PI-n` は `CP-n` と 1 対 1 である**（5.3 が明言）。**末尾に足す。**

### 5-3. ディレクトリ木に足す 1 フォルダ

```text
    document-model/   document/ · schedule/ · document-settings/ · document-stamp/
                      edit-history/ · selection/ · dialogue-log/
```

### 5-4. 5.4 に足す但し書き 1 文

> ⚠️ **ルートの箱だけは鍵を持たない** —— 文書そのものであり、どの鍵の下にも無いためである。**この箱には型の名（`Document`。表 T-062 の `CP-34`）を置いた。**

### 5-5. `model.json` の辺（−6 ＋6）

**畳んで消す 6 本**

```
DocumentCodec    → Schedule / DocumentSettings / DocumentStamp
AgentApiEndpoint → Schedule / DocumentSettings / DocumentStamp
```

**足す 6 本**

| from | to | label | description |
|---|---|---|---|
| `DocumentCodec` | `Document` | `whole document` | reads and writes the document root as a whole (FR-024) |
| `AgentApiEndpoint` | `Document` | `frozen snapshot` | AM-3 readDocument returns a frozen copy of the whole root (AG-4) |
| `ApplyDocumentChange` | `Document` | `all or nothing` | rebuilds the whole root in one step (AG-3) |
| `Document` | `Schedule` | `schedule data` | DR-2 |
| `Document` | `DocumentSettings` | `presentation values` | DR-3 |
| `Document` | `DocumentStamp` | `stamp` | DR-4 |

**`layout`** —— `clusters[entity][documentModel].nodes` の先頭に `"Document"` を足す（`build.py` が「どのラベル付きクラスタにも属さない節点」で落ちるため必須）。同クラスタの `description` が「the three root groups … plus the undo history」のままなので、`Document` と、文書に保存しない 3 つを含む記述に改める。

**`views`** —— `write` / `io` / `startup` の 3 つに `"Document"` を足す。`read` には**足さない**（`read` の節点の中に `Document` を端点とする辺が 1 本も無い）。

### 5-6. `erd.json`（5 箇所）

```
container.boxes[0].id            "documentRoot" → "Document"
container.edges[0..3].from       "documentRoot" → "Document"   （4 本）
```

⚠️ **`erd_json_to_md.py` に `documentRoot` のハードコードは無い**（機械で確認）。箱の名前は完全にデータ側である。

## 6. 影響反映と影響分析結果

### 6-1. 席番号

**`CP-34` / `PI-34` を末尾に足す。既存の番号は 1 つも動かさない。** `T-062` と `T-064` の行 ID は席番号であり、`CP-n` と `PI-n` の 1 対 1 は 5.3 が明言している。

### 6-2. `LR-1` / `LR-3` / `LR-4` の検算

| 規則 | 検算 |
|---|---|
| `LR-1`（層をまたぐ依存は内向きだけ） | `DocumentCodec`（`Adapter`）→ `Document`（`Entity`）は内向き ✅ ／ `AgentApiEndpoint`（`Adapter`）→ 内向き ✅ ／ `ApplyDocumentChange`（`UseCase`）→ 内向き ✅ ／ `Document` からの 3 本は `documentModel` 内 ✅ ／ ⭐ **`Document` から外へ出る辺は 0 本** |
| `LR-3`（層の中の呼び出しを非巡回に） | `Document` → 3 群の一方向のみ。3 群から `Document` へ戻る辺は 0 本 ✅ |
| `LR-4`（`documentModel` が `layoutEngine` を知らない） | `Document` は `layoutEngine` の 3 部品のどれにも辺を持たない ✅ |

**Tarjan で反映後の `model.json` を測り直し、`documentModel` に閉路が無いことを確認すること。**

### 6-3. `build.py` が落ちないこと

`build.py` は 3 つで落ちる。それぞれ回避を確認した。

| 落ちる条件 | 回避 |
|---|---|
| `node(s) outside every labelled cluster` | `layout` の `documentModel` に `"Document"` を足す（§5-5） |
| `label(s) with no backing edge in model.json` | 層間ラベルは `Adapter → Entity` / `UseCase → Entity` とも既存の辺で裏づけが残る（`SvgRenderer → DocumentSettings` ほか 9 本）✅ |
| `model.json must hold node-level edges only` | 足す 6 本はすべて節点どうしである ✅ |

### 6-4. 着地の検算（**両方向。CR-126 §6-4 と同じ手順**）

- **辺 → メンバ** —— 足す 6 本のうち `→ Document` の 3 本は `PI-34` の 2 メンバに着地する。`Document →` の 3 本は `PI-1` / `PI-2` / `PI-3` に着地する
- **メンバ → 辺** —— `PI-34` の `documentViolations` を呼ぶ辺が要る。**`ApplyDocumentChange → Document` がそれである**（確定の前に `DR-1` を検査する）。⚠️ **`Framework` の 7 部品を除く**という CR-126 の例外は `Document` に掛からない

### 6-5. 図はどれが変わるか（**`views` を 1 つずつ当てた**）

| 図 | 変わるか | 理由 |
|---|---|---|
| F-013 コンポーネントと層 | **変わる** | `documentModel` の箱が 6 → 7 |
| F-014 書き込みの経路（`write`） | **変わる** | `ApplyDocumentChange → Document → DocumentStamp` |
| F-015 読み取りの経路（`read`） | ⭐ **変わらない** | `read` の節点に `Document` を端点とする辺が無い |
| F-016 出し入れの経路（`io`） | **変わる** | `DocumentCodec → DocumentStamp` が `→ Document → DocumentStamp` になる |
| F-017 起動の経路（`startup`） | **変わる** | `AgentApiEndpoint → DocumentStamp` が `→ Document → DocumentStamp` になる |
| F-010 文書の全体像 | **変わる** | ルートの箱の名前 |
| F-011 データモデル詳細 | **変わらない** | エンティティも列も触らない |

### 6-6. 機械検査（**予測**）

| 検査 | 予測 |
|---|---|
| `tables` | **100 のまま**（表を新設しない） |
| `figures` | **9 のまま** |
| `rows` | **1163 → 1165**（`CP-34` と `PI-34` の 2 行） |
| `uids` | **140 のまま**（要求 `UID` を新設しない） |
| 検査 16（生成物の照合） | `erd.json` を直したあと `erd_json_to_md.py` を走らせれば緑。**走らせ忘れると落ちる** |
| ゲート 14 本 | すべて緑を維持 |
| 助言 13 / 14 | 13=4 / 14=18 のまま（値も所有者も足さない） |

## 7. 最終判断日時

**2026-08-15。** 利用者が 4 段階の対話を経て決定した。

| 決定 | 結論 | 却下した案と理由 |
|---|---|---|
| **A** 部品を立てるか | ⭐ **立てる。名前は `Document`** | `DocumentRoot`（型名と `documentFromJson` の語幹が割れる）／ `GrsDocument`（自分の名を自分に冠する理由が無い。`R2.9`）／ `ExtendedProjectData`（**`R2.1` が `data` を汎用名として名指しで禁じている**。かつ「何に対する拡張か」の基準線が 2 つある）／ 立てない（26 名の改名） |
| **B** 図 F-010 の箱 | **`Document` にする** ＋ 5.4 に但し書き | `documentRoot` 据え置き（3 綴りが残る） |

⭐ **判断の決め手は「26 名が名乗っている」ことではなく、`DR-1` が持ち主の無い唯一の `DR-n` であることだった。**

## 8. 反映記録（2026-08-15）

### 8-1. §6-6 の予測と実測 —— **外した予測は 0 件**

| 検査 | 予測 | 実測 | |
|---|---|---|:-:|
| `tables` | 100 | **100** | ✅ |
| `figures` | 9 | **9** | ✅ |
| `rows` | 1163 → 1165 | **1165** | ✅ |
| `uids` | 140 | **140** | ✅ |
| ゲート 14 本 | すべて緑 | **すべて緑** | ✅ |
| 検査 16 | 再生成すれば緑 | **`fig-erd-overview.md` / `fig-erd-detail.md` とも一致** | ✅ |
| 助言 13 / 14 | 4 / 18 | **4 / 18** | ✅ |
| 検査 11（重複） | — | `A=17 (new 0)` groups=49 pairs=130。**新規の重複 0** | ✅ |

### 8-2. コンポーネントグラフの検算（**反映後の `model.json` から直に読んだ**）

```
nodes: 34   edges: 71
  documentModel   7  DialogueLog Document DocumentSettings DocumentStamp EditHistory Schedule Selection
  layoutEngine    3     UseCase   9     Adapter   8     Framework   7

LR-1 outward edges: 0        ← 外向きの辺は 1 本も無い
LR-4 documentModel -> layoutEngine: 0
LR-3 SCCs with 2+ members: 0   self-loops: 0     ← 非巡回のまま
```

**`Document` の出入りは予測どおり 3 本ずつだった。**

```
DocumentCodec       -> Document   whole document
AgentApiEndpoint    -> Document   frozen snapshot
ApplyDocumentChange -> Document   all or nothing
Document -> Schedule / DocumentSettings / DocumentStamp
```

**3 群に残った辺も §2-6 で数えた 9 本と完全に一致した** —— `SvgRenderer → DocumentSettings` ／ `ApplyDocumentChange → DocumentStamp` ／ `ChooseStartupDocument → DocumentStamp` ／ `EditDocument → Schedule` ／ `EditDocument → DocumentSettings` ／ `ImportDocument → Schedule` ／ `ScheduleLayout → Schedule` ／ `ScheduleLayout → DocumentSettings` ／ `ScheduleGeometry → Schedule`。

### 8-3. `build.py` は落ちなかった。図はどれが変わったか

```
fig-components.drawio   34 nodes,  8 edges     ← 33 → 34
view-write.drawio       13 nodes, 20 edges     ← 変わった
view-read.drawio         8 nodes, 11 edges     ← ⭐ 変わらなかった（§6-5 の予測どおり）
view-io.drawio          15 nodes, 17 edges     ← 変わった
view-startup.drawio     12 nodes, 20 edges     ← 変わった
components.md           34 nodes, 71 edges
```

⭐ **`read` だけが動かなかったことが、辺の付け替えの規則（1 群しか要らない者はその群に依存する）が効いている証拠である** —— 描画は文書ぜんたいを要らないので、`Document` を経由しない。

### 8-4. 実物を見た（`strictdoc export`）

`strictdoc export docs/spec --formats=html` が 12.69 秒で完走。書き出した HTML を数えた。

| 見たもの | 実測 |
|---|---|
| `CP-34` | **2 箇所**（表 T-062 の行 ／ 5.4 の但し書き） |
| `PI-34` | **1 箇所**（表 T-064 の行） |
| 「34 部品」 | **2 箇所**（5.3 の 2 文） |
| 「34 のフォルダ」 | **1 箇所** |
| ディレクトリ木 | `document/ · schedule/` ✅ |
| 図 F-010 のルートの箱 | ⭐ **`Document {`**（`documentRoot` は 0 件） |

### 8-5. ⭐ 畳んだ 6 本は、原稿自身が「畳め」と書いていた

差分を読んで気づいたこと —— **消した 6 本の `description` が、既に文書ぜんたいを指していた。**

```
DocumentCodec    -> Schedule          "converts the whole document"   ┐ 3 本とも
DocumentCodec    -> DocumentSettings  "converts the whole document"   ├ 同一の文
DocumentCodec    -> DocumentStamp     "converts the whole document"   ┘
AgentApiEndpoint -> Schedule          "reads the schedule data for readDocument"      ┐ 3 本とも
AgentApiEndpoint -> DocumentSettings  "reads the presentation values for readDocument"├ readDocument
AgentApiEndpoint -> DocumentStamp     "reads the stamp for readStamp"                 ┘ のため
```

**1 つの依存を 3 本に割って書いていたので、説明文が 3 回繰り返されていた。** 畳むべき根拠は外から持ち込んだ判断ではなく、**原稿が既に 3 回言っていたことである。**

### 8-6. 編集の安全策（`SKILL.md` の罠を踏まなかった）

- **`model.json` と `erd.json` はスクリプトをファイルに書いてから実行した**（バッククォートをヒアドキュメントに入れない）
- **`model.json` は書き込み前に往復検査した** —— `json.dumps(indent=1)` が現在のファイルを**バイト単位で再現する**ことを確かめてから編集した。整形の差分は 0
- **`erd.json` は生テキストのリテラル置換にし、出現回数が 5 であることを表明してから実行した**（正規表現の文字クラスを使わない）
- **生成物（`fig-erd-*.md`・`.svg`・`.drawio`）は 1 つも手で直していない**
- **席番号を振り直していない。**`CP-34` / `PI-34` は末尾に足しただけである

### 8-7. 残った作業

| # | 件 | どこで |
|---|---|---|
| 1 | 記法（`W-2` の射程）と接続語（`Of` / `From` / `By`）の明文化 | **CR-128** |
| 2 | `Document` の 5 鍵と `documentViolations` の引数・戻り値・境界値 | **Chapter 6.1**（未記入。表 T-064 が「全数は Chapter 6.1 が持つ」と送っている） |
| 3 | `applyDocumentChange` が `DR-1` をいつ検査するか（確定の前） | **Chapter 5.5**（未記入） |
