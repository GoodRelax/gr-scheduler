---
type: Study
title: ユースケースと src の UseCase の名の対応（B5）
description: 仕様 3.2 のユースケース 15 個の英語の名（見出しの括弧）と、src/use-case の UseCase 9 個の対応を表で示す。1 対 1 にする仕事は B12 が持ち、本表は src に触らない。
tags: [anms, use-case, b5, b12]
phase: plan
status: draft
---

# ユースケースと src の UseCase の名の対応（B5）

- 作った日: 2026-11-25。基は `develop` の `2c0ba9562`。
- 英語の名は B5 の案である。持ち主が BGQA10 の問 5 で決める（名は持ち主が決める）。
- ANMS v0.36 の第 2 章の決まり 1: 「4.2 の UseCase には、同じ英語の名前を付ける。UseCase の名には、接尾辞 `UseCase` か `Interactor` を付けてよい」。基準書 R1c も、ユースケースごとに同じ名の UseCase を 1 つ求める（study 82 の A12）。
- 今の 1 対 1 の組は 0 である（study 82 の 3 節 A12 の数と同じ）。

## 1. ユースケースから UseCase へ

「今の UseCase」は、ユースケースの振る舞いを今どこが受けているかを、`src/use-case/` のフォルダー名と主なファイル名で示した。B5 は src のコードを読まず、名と置き場だけで当てた —— B12 が関数の単位で確かめる。

| UC | 見出し | 英語の名（案） | 今の UseCase（`src/use-case/`） | 1 対 1 か |
|:---|:---|:---|:---|:---|
| UC-001 | タスクを置いて期間を決める | PlaceTask | `edit-document/`（`task-create.ts`・`task-appearance.ts`） | いいえ。`EditDocument` の一部 |
| UC-002 | タスクグループを階層で組み立てる | ArrangeTaskGroups | `edit-document/`（`edit-task-group.ts`・`task-group-order.ts`・`task-group-folding.ts`・`task-group-naming.ts`） | いいえ。`EditDocument` の一部 |
| UC-003 | タスクの属性を編集する | EditTaskProperties | `edit-document/`（`edit-task.ts`・`task-appearance.ts`・`edit-resource.ts`・`edit-document-settings.ts`） | いいえ。`EditDocument` の一部 |
| UC-004 | タスク間の依存を示す | LinkTasks | `edit-document/`（`edit-dependency.ts`） | いいえ。`EditDocument` の一部 |
| UC-005 | 実績を記録する | RecordActuals | `edit-document/`（`task-plan-actual.ts`・`percent-complete.ts`） | いいえ。`EditDocument` の一部 |
| UC-006 | 遅れを見つける | FindDelays | （UseCase の層に無い。描画と画面の値の側） | いいえ。受ける UseCase が無い |
| UC-007 | 見たい範囲を出す | ShowRange | `advance-screen-session/`（`screen-values.ts`・`gesture-values.ts`） | いいえ。`AdvanceScreenSession` の一部 |
| UC-008 | 注記で伝える | AnnotateSchedule | `edit-document/`（`edit-annotation.ts`） | いいえ。`EditDocument` の一部 |
| UC-009 | 秘密の日程を画面に出す | ShowConfidentialSchedule | （UseCase の層に無い。描画と画面の値の側） | いいえ。受ける UseCase が無い |
| UC-010 | 外部 WBS マスタとやりとりする | ExchangeWithWbsMaster | `import-document/`・`validate-imported-document/`（書き出しは UseCase の層に無い） | いいえ。2 つに分かれ、書き出しが無い |
| UC-011 | 文書を保存して配る | SaveAndShareDocument | `choose-startup-document/`（初めの文書だけ。保存と画像の書き出しは UseCase の層に無い） | いいえ |
| UC-012 | AI エージェントに編集させる | OperateThroughAgentApi | `apply-document-change/`・`notify-change-watchers/`・`advance-screen-session/agent-api-values.ts` | いいえ。3 つに分かれる |
| UC-013 | AI と相談しながら日程を直す | ConsultAiOnSchedule | `apply-document-change/`・`undo-edit/` | いいえ。2 つに分かれる |
| UC-014 | 複数の日程を 1 つにまとめる | MergeSchedules | `import-document/` | いいえ。取り込みと同じ UseCase |
| UC-015 | 遅れの発生源を見つける | RunDelayDiagnostics | （診断の計算は entity の層。UseCase の層に無い） | いいえ。受ける UseCase が無い |

## 2. UseCase からユースケースへ

| 今の UseCase | 受けるユースケース | B12 への注 |
|:---|:---|:---|
| `AdvanceScreenSession` | UC-007、UC-012 の一部 | 画面の 1 歩を進める器で、1 つのユースケースではない。ユースケースの UseCase から呼ばれる側になる |
| `ApplyDocumentChange` | UC-012、UC-013 | 文書の命令を当てる器。UC-012 の UseCase から呼ばれる側になる |
| `ChooseStartupDocument` | UC-011 の一部（初めの文書） | UC-011 の `PRECONDITION`（文書を開いている）を作る側 |
| `EditDocument` | UC-001〜UC-005、UC-008 | 6 つのユースケースを 1 つの UseCase が持つ。分けるのが B12 の主な仕事 |
| `ImportDocument` | UC-010、UC-014 | 取り込みと合流を 1 つが持つ |
| `NotifyChangeWatchers` | UC-012 の一部（監視） | 呼ばれる側 |
| `RedoEdit`・`UndoEdit` | 横断（`FR-031`） | ユースケースにしない操作（ANMS 第 2 章の決まり 9）。呼ばれる側のまま |
| `ValidateImportedDocument` | UC-010・UC-014 の一部 | 呼ばれる側 |
