# CR-104 — `Task` が真偽値の `milestone` 列を持つことを認める

## 1. 変更概要

表 T-005 の `G-1` と用語辞書 表 T-101 の `N-1` から、
**「真偽値の `milestone` という列は持たない」という禁止を取り除く**。

`Task.milestone`（MSPDI 由来・書き出す）と `TaskVisual.shapeKind`（描画のみ・書き出さない）が
**別の役目を持つ 2 つの列である**ことを、両方の行に明記する。

## 2. 変更の背景・目的

**交換相手が真偽値で区別している。** XSD を引いた ——

```
mspdi_pj12.xsd:1782  <xsd:element name="Milestone" type="xsd:boolean" minOccurs="0">
                     → "Whether the task is a milestone."
mspdi_pj12.xsd:1787  <xsd:element name="Summary"   type="xsd:boolean" minOccurs="0">
                     → "Whether the task is a summary task."
```

期間 0 からの推測ではなく、**ファイルが真偽値を運んでいる。**
**そして MSPDI には図形の語彙が無い**（見た目に関する要素の走査で見つかったのは `HideBar` の 1 つだけ）。

**現行の禁止を守ると、書き出しが壊れる。** `Task.milestone` を持たないと、
MSPDI へ `Task/Milestone` を書くために**書き出さないはずの視覚層 `TaskVisual.shapeKind` を読む**
ことになる。これは「**`Task` は MSPDI の `Own` だけを持つ器**」という設計（＝書き出しに除外一覧が
要らない、という利点）を崩す。

**継承したデータモデルも、機械可読な実例も、列を持っている** ——
`previous-project-result/02-data-model/grs-native-erd-ja.md:260` / `:1511`（`Own` 列）、
`07-plan-actual/plan-actual-decisions-ja.md:356`（「書き出す側なのでこちらが正」）、
`10-agent-interface/samples/grs-document-with-revision-stamp.json:42` ほか（3 タスク全部に `"milestone"`）。

**利用者の判断（`Q8`）**: MSPDI に `Milestone` の真偽値があるのだから GRS もそれに合わせる。
`shapeKind` は図形を決めるだけである。

**目的** —— 1 つの概念に 2 つの表し方を与えないための禁止だったが、
**実際には 2 つの別の概念**（「マイルストーンという事実」と「どう描くか」）である。
禁止を外し、両者の役目を明記する。

## 3. 変更箇所

| # | ファイル | 位置 | 対象 |
|---|---|---|---|
| 1 | `docs/spec/01-04-requirements.md` | `:190` | 表 T-005 の `G-1` |
| 2 | `docs/spec/_assets/tbl-glossary.md` | `:25` | 表 T-101 の `N-1` |
| 3 | `docs/review/datamodel-findings-2026-08-16.md` | `D-4` | 指摘の決着を記録（仕様書ではない） |

## 4. 変更前の仕様

**表 T-005 の `G-1`（`01-04-requirements.md:190`）**

> | G-1 | `Task` | 日程要素。バーもマイルストーンも `Task` であり、**`Task.shapeKind` の値で区別する**（`'milestone'` のときマイルストーン）。⚠️ **真偽値の `milestone` という列は持たない** —— 1 つの概念に 2 つの表し方を与えない |

**表 T-101 の `N-1`（`tbl-glossary.md:25`）**

> | N-1 | `Task` | タスク（`shapeKind` が `'milestone'` のときは「マイルストーン」と表示する）。⚠️ **真偽値の `milestone` という列は持たない** |

⚠️ **`G-1` は `Task.shapeKind` と書いているが、列は `TaskVisual` に載る。**
**実在しない場所を指しており**（表記の規約 `W-7` は `Entity.field` の形を求める）、これも本 CR で直す。

## 5. 変更後の仕様

**表 T-005 の `G-1`**

> | G-1 | `Task` | 日程要素。バーもマイルストーンも `Task` である。**マイルストーンかどうかは `Task.milestone`（真偽値）が持ち、これを MSPDI へ書き出す。どう描くかは `TaskVisual.shapeKind` が持ち、書き出さない。** 2 つは別の概念であり、**形を変えても `Task.milestone` は変わらない** |

**表 T-101 の `N-1`**

> | N-1 | `Task` | タスク。**`milestone` が真のときマイルストーンである**（`Task.milestone`）。⚠️ **描画の形は `TaskVisual.shapeKind` が別に持つ。混同しない** |

**本 CR で確定する規則（データモデル側に反映する）**

| | |
|---|---|
| `Task.milestone` | **持つ。**MSPDI `Task/Milestone` の `Own`。**書き出しの正はこれ** |
| `TaskVisual.shapeKind` | **描画だけを決める。`Task.milestone` を変えない** |
| 取り込み | `Task/Milestone` → `Task.milestone`。`shapeKind` の既定は、真なら `'milestone'` |
| 書き出し | `Task.milestone` をそのまま書く。**視覚層を読まない** |

⚠️ **承知のうえで採る帰結**: 形だけを `'milestone'` に変えたタスクは、
**MSPDI では通常タスクのまま書き出される**（逆も同様）。
「図形は見た目、真偽値は事実」と切り分けた以上の正しい帰結である。

## 6. 影響反映と影響分析結果

```bash
python .claude/skills/spec-graph-check/impact.py G-1 N-1
```

| 対象 | 到達 |
|---|---|
| 行 `G-1`（表 T-005） | **指している箇所 0 件**（要求 0 / 参照 0） |
| 行 `N-1`（表 T-101） | **指している箇所 1 件**（要求 0 / 参照 1） |

**きわめて小さい。** どちらも読み手のための語の説明であり、要求から参照されていない。

**追加で反映するもの ——**

1. **`G-1` の `Task.shapeKind` という綴りを直す。** 列は `TaskVisual` に載るので `TaskVisual.shapeKind` とする
   （表記の規約 `W-7`）。**これは本 CR の副産物ではなく、`W-7` 違反の是正である**
2. **`docs/review/datamodel-findings-2026-08-16.md` の `D-4` を「対応済」にする** —— 同じ食い違いを扱っている
3. ⚠️ **`Task/Summary`（`mspdi_pj12.xsd:1787`）は本 CR の対象外。** 要約タスクかどうかは
   WBS の子の有無から導出できるので、保存するかどうかはデータモデル側で別途決める（**未決**）

**機械検査**: 2 行のリテラル置換のみ。置換後に
`bash .claude/skills/spec-graph-check/check.sh` を回す。
⚠️ **検査 12（値の表・名前の表に規則が入っていないか）に触れないよう、
`N-1` には規則（MUST / MUST NOT）を書かない。** 規則の正は要求である。

## 7. 最終判断日時

**2026-08-14**（利用者回答。`previous-project-result/temp/decisions-2026-08-13.md` の `Q8`）
