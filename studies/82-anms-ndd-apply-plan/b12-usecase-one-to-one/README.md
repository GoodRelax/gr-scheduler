---
type: Study
title: ユースケースと UseCase の 1 対 1（B12）の設計
description: 仕様 3.2 のユースケース 15 個のうち 14 個に、同じ名の UseCase のコンポーネントを 1 つずつ置いた。外の層に在った純粋な判断を、振る舞いを変えずにその UseCase へ移した。名は B5 の仮の名（OPQ-25）。UC-013 は OPQ-26 を待つ。
tags: [anms, use-case, b12]
phase: plan
status: draft
---

# ユースケースと UseCase の 1 対 1（B12）の設計

- 作った日: 2026-11-27。基は `develop` の `e053fb30a`。
- 仕事: 仕様のユースケース 15 個のそれぞれに、同じ英語の名の UseCase のコンポーネントを 1 つ置く（ANMS v0.36 の 4.2、基準書 R1c、study 82 の A12）。振る舞いは変えない。
- 名は [`../b5-spec-trial/usecase-name-map.md`](../b5-spec-trial/usecase-name-map.md) の仮の名である。持ち主が BGQA10 の問 5 で決める。仕様の付録 A.3 の `OPQ-25` が仮の印を持つ。

## 1. 今の形と、割れない理由

`src/use-case/` には UseCase のコンポーネントが 9 個あった（表 T-062 の `CP-8`〜`CP-15`・`CP-39`）。ユースケースと同じ名のものは 0 であった。

ユースケースごとにフォルダを割り直す形（`edit-document/` の中のファイルを、ユースケースのフォルダへ移す形）は採らなかった。理由は 2 つある。

1. **コンポーネントの循環が生じる。** `edit-document/` の中のファイルは互いに読み合う。例えば、`edit-task.ts` は `edit-task-group.ts`・`task-paste.ts`・`task-plan-actual.ts`・`task-create.ts` を読む。`edit-task-group.ts` は `task-paste.ts`・`task-plan-actual.ts`・`edit-annotation.ts` を読む。分けるとフォルダの間に循環の辺ができ、表 T-061 を破る。循環を解くにはコードを書き換えることになり、振る舞いを変えないという条件を守れない。
2. **仕様が集約ごとの割りを定めている。** 表 T-063 の `UT-2` は、`EditDocument` を「集約ごとに変更の理由が別なので割った」と定める。ユースケースの軸は集約の軸と交わる。タスクの集約 1 つが、`UC-001`・`UC-003`・`UC-005` の 3 つに仕える。

## 2. 採った形

ユースケースごとに、同じ名の UseCase のコンポーネントを 1 つ足した。今の 9 個は、呼ばれる側の部品として残る。書き込みの経路が 1 つであること（表 T-042 の `MS-1`）も変わらない。

- **中身**: 外の層（`Adapter`・`Framework`）か今の部品に在った純粋な判断のうち、そのユースケースの手順か拒む場合だけに仕えるものを、関数ごと移した。呼ぶ側は、移した先を呼ぶ。
  - 公開の名を出し直すだけの入口は作らない。1 つの名に公開の入口が 2 つでき、規則 07 の SSOT と R2 の DRY（公開面）を破るからである（査読の F1）。
  - どのユースケースに属するかは、その名が実装する要求の親（`Parent`）のユースケースで決めた（査読の F0）。
- **振る舞い**: 移した式は字のとおりである。読み出しの順も変えない。例えば、透かし解除のハッシュが作れないときに記憶の値を読まない、という順も保った。
- **査読**: 規則 07 の R2 で読む査読を 1 回入れ、指摘のとおりに設計を直した（初めの案では、15 個のうち 14 個が「直す」だった）。

## 3. 14 個の UseCase

| UC | UseCase | 移した中身（元の所） | 呼ぶ側 |
|:---|:---|:---|:---|
| UC-001 | `PlaceTask` | `placedTaskSpanOf` —— 置くタスクの期間。細かい刻みのときと日のとき（`armed-placement.ts` の `createdSpanOnFineSnap` と日の端） | `armed-placement.ts` |
| UC-002 | `ArrangeTaskGroups` | `taskGroupTreeWrites`・`taskGroupStandUpWrites` —— 木の状態の書き込みと、親の下に立てる書き込み（`task-group-tree-entrances.ts`） | `task-group-tree-entrances.ts` |
| UC-003 | `EditTaskProperties` | `confirmationOwedByResourceDeletion` —— 担当の削除の問い `QN-3`（`EditDocument` の `deletion-confirmations.ts`） | `resource-list-window.ts` |
| UC-004 | `LinkTasks` | `tentativeDependencyLine` —— 仮の依存の線（`held-press-preview.ts`） | `held-press-preview.ts` |
| UC-005 | `RecordActuals` | `markerPullActualOf` —— 進捗マーカーを引いたときの実績の始まり（`item-grab.ts`） | `item-grab.ts` |
| UC-006 | `FindDelays` | `lateWorkingDaysOf` —— 遅れの稼働日数（`tooltips.ts` の判断） | `tooltips.ts` |
| UC-007 | `ShowRange` | `isPlaceNamed` —— 表示の場所の `OP-10` の条件。`zoom-and-fit.ts` と `view-place.ts` に同じ式が 2 つあり、両方に「片方を変えたら両方」の注があった。1 つに集めた | `zoom-and-fit.ts`・`item-grab.ts`・`view-place.ts` |
| UC-008 | `AnnotateSchedule` | `freeAnchorAt` —— コメントボックスの線先（`input-command-translator.ts`） | `input-command-translator.ts` |
| UC-009 | `ShowConfidentialSchedule` | `watermarkOpenedByOf`・`isWatermarkUnlockMatched` —— 「空の記憶の値は無いものと読む」決まりが `frame-loop.ts`（`S-99a`）と `watermark-unlock.ts`（`S-99c`）に 2 つあった。1 つに集めた | `frame-loop.ts`・`watermark-unlock.ts` |
| UC-010 | `ExchangeWithWbsMaster` | `taskUidsWithAnUnusableDate`・`holdsWorkValues`（`document-file-flow.ts`） | `document-file-flow.ts` |
| UC-011 | `SaveAndShareDocument` | `documentStampedAt` —— 保存の刻印（`document-file-flow.ts`） | `document-file-flow.ts`・`frame-loop.ts` |
| UC-012 | `OperateThroughAgentApi` | `reasonOfPlanRefusal`・`ruleOfPlanRefusal`・`reasonOfStepRefusal`・`stepRefusalWhat` —— 拒否を AI へ返す理由と規則へ写す（`agent-api-members.ts`） | `agent-api-members.ts` |
| UC-014 | `MergeSchedules` | `missingTaskNamesOf` —— 前回の取り込みから消えたタスクの名（`document-file-flow.ts`） | `document-file-flow.ts` |
| UC-015 | `RunDelayDiagnostics` | `delayDiagnosisOf` —— 同じ式 `diagnoseDelay(document, workingCalendarOf(document.schedule))` が 5 か所にあった。1 つに集めた。名は Agent API の `runDelayDiagnostics`（画面で走らせる）と分けた | `frame-loop.ts`・`agent-api-members.ts` |

## 4. UC-013 を置かない理由

`UC-013`（AI と相談しながら日程を直す）は、手順のすべてを `UC-012` の UseCase と呼ばれる側の部品で済ませている。このユースケースだけが持つのは結果の条件で、会話のうち変更の理由を `changeLog` に残すこと（表 T-052 の `DR-4`）である。しかし、それを積む経路が仕様に無い。この欠けは台帳の `DFC-1020` が既に持っている。

- 中身の無いコンポーネントは置かない（規則 07 の 425 行。公開面の無い宣言になる）。
- 付録 A.3 に `OPQ-26`（分類 `D`。`changeLog` は文書に保存する値）を足した。契約の試験では、`UC-013` の 2 件を `it.fails` にして、`// Unimplemented: OPQ-26` を付けた。

## 5. 仕様と道具への波及

- 表 T-062 に `CP-42`〜`CP-55`。表の後に、仮の印（`OPQ-25`）と、`UC-013` の欠け（`OPQ-26`）の文を置いた。
- 表 T-064（`_source/published-entries.json`）に `PI-42`〜`PI-55`。`PI-9` から `confirmationOwedByResourceDeletion` を外した。
- 表 T-075 に `UF-208`〜`UF-221`。`UF-162`（`QN-3` を `CP-44` へ）と `UF-166`（照合を `CP-50` へ）の責務の文を直した。
- 表 T-074 の数（`SU-1` 37 → 51、`SU-3` 185 → 199）、5.3 のディレクトリの図、「37」の数。
- `_source/components.json` に部品 14 個と、src の import から測った辺 47 本。図を作り直した（`build.py`）。
- 契約の試験 `tests/contract/usecase-one-to-one.contract.test.ts` を足した。3.2 のユースケースの見出しの英語の名、表 T-062 の `UseCase` の行、`src/use-case/` のフォルダの 3 つが 1 対 1 であることを確かめる。

## 6. 残したこと（査読の所見のうち、本件では直さなかったもの）

- `MergeChoices` という名の定義が 2 つある（`import-document.ts:51` と `frame-loop.ts`）。
- `InvariantRow` という名が、値の集合の違う定義を 2 つ持つ（`notice-values.ts` と `edit-document.ts`）。
- `agent-api-members.ts` の `exportFixLogTsv` は、遅延診断を 2 回求めている。
- 絵の高さの上限の判断（`image-exporter.ts` と `frame-loop.ts`）を `SaveAndShareDocument` へ集める道がある。
- `ExchangeWithWbsMaster` に置く手順（取り込みの検証・落とし・再検証）のうち、コーデックを呼ぶ所は UseCase へ移せない（表 T-061）。
