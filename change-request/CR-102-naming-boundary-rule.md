# CR-102 — 命名の例外（`W-8`）を「3 語の一覧」から「境界の規則」に改める

## 1. 変更概要

表 T-006a の `W-8` を書き換え、`W-9` / `W-10` を新設する。
あわせて、`W-8` が名指ししていた 3 語の綴りを **lowerCamelCase に改める（16 か所）**。

| 行 ID | いま | これから |
|---|---|---|
| `W-8` | snake_case を許す **3 語の一覧** | **交換相手に由来する列 —— 語幹は相手のまま、記法は `W-2`** |
| `W-9` | （無い） | **`carry` / `carryElements` の中身 —— 相手の綴りをそのまま保つ** |
| `W-10` | （無い） | **真偽値 —— GRS 固有は `is` / `has` / `can`。交換相手由来は語幹を変えない** |

## 2. 変更の背景・目的

**`W-8` の理由づけが事実に反している。**

現行の注はこう書いている ——「**MSPDI 側の構造を直に写している属性**に限り、
綴りを変えると相手との対応が読めなくなるために許している」。

**しかし 3 語とも、MSPDI にその綴りは存在しない**（`docs/reference/mspdi/mspdi_pj12.xsd` を検索して確認）。

| `W-8` が挙げる綴り | MSPDI 側の実際 |
|---|---|
| `wbs_parent_uid` | **対応する要素が無い。** 親子関係は `Task/OutlineLevel` と出現順から導出する |
| `link_type` | `PredecessorLink/Type`（`mspdi_pj12.xsd:2173`） |
| `Project.status_date` | `Project/StatusDate` |

つまり 3 語とも **GRS が発明した名前**であり、例外を認める根拠が成り立っていない。

**実害が出ている。** 前プロジェクトの機械可読な JSON 実例はすべて lowerCamelCase で書かれており
（`wbsParentUid` 8 / `linkType` 4 / `statusDate` 4 に対し、snake_case は散文中の各 1）、
**仕様書と実物のどちらが正かで判定が割れた箇所が 6 件**ある。放置すると詳細 ERD の列名が
その都度どちらかに倒れる。

**利用者の判断（`Q9`）**: 「語幹を変えない」かつ「TypeScript に準拠する」ならよい。

**目的** —— 例外を**一覧から規則へ**変える。境界（`carry` の内か外か）で決まる形にすれば、
例外は増えようがなく、「なぜこの 3 語だけか」に答える必要も消える。

## 3. 変更箇所

| # | ファイル | 位置 | 対象 |
|---|---|---|---|
| 1 | `docs/spec/01-04-requirements.md` | `:292` | 表 T-006a の `W-8`（書き換え） |
| 2 | 同 | `:292` の直後 | `W-9` / `W-10`（新規行） |
| 3 | 同 | `:294` | `W-8` の注（書き換え） |
| 4 | 同 | `:195` `:1275` `:1347` ほか | `wbs_parent_uid` **4 か所** |
| 5 | 同 | `:1664` ほか | `link_type` **2 か所** |
| 6 | 同 | `:1945` `:2139` `:2261` `:2468` `:2824` ほか | `status_date` **6 か所** |
| 7 | `docs/spec/_assets/tbl-glossary.md` | `:60` `:80` ほか | **3 か所** |
| 8 | `docs/spec/_assets/tbl-settings.md` | 1 か所 | `status_date` |

**綴りの変更は計 16 か所。**

## 4. 変更前の仕様

**表 T-006a（`01-04-requirements.md:281`〜）の `W-8` 行**

> | W-8 | **例外** —— 交換相手の構造をそのまま指す属性 | snake_case を許す | `wbs_parent_uid` / `link_type` / `Project.status_date` |

**その注（`:294`）**

> **`W-8` を増やしてはならない（MUST NOT）。** 例外は上の 3 語だけである。**MSPDI 側の構造を直に写している属性**に限り、綴りを変えると相手との対応が読めなくなるために許している。

**`W-1` 〜 `W-7` と「大文字の略語を識別子に入れてはならない」は変更しない。**
既に TypeScript 界隈の標準そのものであり、利用者の求める準拠を満たしている。

## 5. 変更後の仕様

**表 T-006a に置く 3 行**

> | W-8 | **交換相手（MSPDI）に由来する列** | **語幹は相手のまま、記法は `W-2` に従う** | MSPDI `StatusDate` → `statusDate` |
> | W-9 | **`carry` / `carryElements` の中身** | **相手の綴りをそのまま保つ** | `Cost` / `SaveVersion` / `CurrencyCode` |
> | W-10 | **真偽値** | **GRS 固有は `is` / `has` / `can` で始める。交換相手由来は語幹を変えない** | `isCollapsed` ／ `milestone` |

**`W-8` に付ける注**

> **相手の名前が禁止語（`type` `data` `info` `value`）になるときは、意味を足した複合語にすること（MUST）。** MSPDI には `Type` が 4 か所ある（`Task/Type` / `PredecessorLink/Type` / `Resource/Type` / `Exception/Type`）。それぞれ `taskKind` / `linkType` / `resourceKind` / `recurrenceKind` とする。

**`W-9` に付ける注**

> **交換相手の綴りが現れてよいのは `carry` と `carryElements` の内側だけである（MUST）。本ソフトウェアが解釈する列に相手の綴りを混ぜてはならない（MUST NOT）。**

**綴りの変更**

| 現 | 新 | 根拠 |
|---|---|---|
| `wbs_parent_uid` | `wbsParentUid` | MSPDI に対応要素が無く純粋な GRS 名。`W-2` |
| `link_type` | `linkType` | MSPDI `PredecessorLink/Type`。裸の `type` は禁止語なので複合語（`W-8` の注） |
| `status_date` | `statusDate` | MSPDI `Project/StatusDate` の語幹を保ち、記法は `W-2` |

## 6. 影響反映と影響分析結果

```bash
python .claude/skills/spec-graph-check/impact.py T-006a
grep -c "wbs_parent_uid\|link_type\|status_date" docs/spec/01-04-requirements.md docs/spec/_assets/*.md
```

| 対象 | 到達 |
|---|---|
| 表 T-006a | **指している要求 0 件。** 参照は 1.9（2 箇所）と 3 章（1 箇所）の**計 3 箇所**のみ |
| 綴りの実出現 | 要求 **12**（`wbs_parent_uid` 4 / `link_type` 2 / `status_date` 6）＋ 辞書 **3** ＋ 設定値 **1** = **16** |

**追加で反映するもの ——**

1. **表 T-006a の直前の散文**（`:278`）が「`stackOrder` ↔ `stack_order` は正しく、`laneIndex` ↔ `stack_order` は禁止」と例示している。**この例は `W-2` ↔ `W-5`（i18n キー）の話であり、本変更の影響を受けない。** 変更不要
2. **`docs/review/datamodel-findings-2026-08-16.md`** の本文が旧綴りを引いている箇所がある。**同じ塊で直す**
3. **`previous-project-result/temp/inventory/` の在庫表 21 枚**は git 管理外の作業メモであり、**書き換えない**（履歴として旧綴りのまま残す方が、どちらが正かの判断過程を追える）

⚠️ **編集の罠**: 綴りの置換は**必ずリテラル置換**で行い、1 か所ずつ「1 回だけ一致する」ことを表明する。
**正規表現の文字クラスを使わないこと（MUST NOT）** —— 全角と半角の括弧が混在しており、
過去に `[^)]` が改行をまたいで 305 行を消した事故がある（`SKILL.md`）。

**機械検査**: 塊ごとに `bash .claude/skills/spec-graph-check/check.sh` を回す。
⚠️ **検査 7 は「バッククォート付きで行 ID に見える語」を見る。** `W-9` / `W-10` は
表 T-006a に定義行を持つので緑になるが、**追加直後に検査を回して確かめること。**

## 7. 最終判断日時

**2026-08-14**（利用者回答。`previous-project-result/temp/decisions-2026-08-13.md` の `Q9`）
