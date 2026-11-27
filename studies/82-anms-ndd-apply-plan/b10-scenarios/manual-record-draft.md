---
type: Study
title: @manual のテスト記録の下書き（B10）
description: 持ち主のチェックリスト 2 枚（2026-10-16・10-17）から写した @manual のシナリオ 18 本の結果を、ANMS 6.2 の書式（シナリオ / Result / Remark）で持つ記録の下書き。B9 の後に docs/development-records/test-records/manual-scenarios.md として当てる。
tags: [anms, manual, test-record, b10]
phase: plan
status: draft
---

# `@manual` のテスト記録の下書き（B10）

- 作った日: 2026-11-27。基は `develop` の `e053fb30a`。
- 当てる所: `docs/development-records/test-records/manual-scenarios.md`（2 節から下を写す）。
- ⚠️ 当てるときに検査 95（`tools/gate/test-record.mjs --check`）を直す。今の検査は、フォルダーの `README.md` のほかのファイルをすべて GT-2 の記録の形で読むので、本書の形のファイルを置くと赤になる。`manual-scenarios.md` だけを別の形（下の 2 節）で読み、Result が Cucumber の 6 つの値のどれかであること、passed のほかは Remark が空でないこと、シナリオの ID が仕様の 6.2 に在ることを確かめる（README の 4 節）。
- 結果の値: 持ち主がチェックリストに結果を書いた跡は無い（2 枚とも表の行は ☐ のまま。2026-11-27 に `grep -n '✅\|❌'` で当たるのは、2 枚とも使い方を書いた 1 行だけ）。⇒ Result はどれも `pending` にし、Remark に AI の確認（チェックリストの「確認」の欄）の結果を写した。持ち主が押したら、持ち主が Result と Remark を書き替える（ANMS「テストの進め方」）。
- 次のチェックリスト（計画の 225「利用者のチェックリスト 1 枚」、226「オーナー: チェックリストを実物で触る」、2026-11-28）は、行を `@manual` のシナリオとして 6.2 に書き、結果を本記録に足す形にするのを勧める（README の問 1）。

## 2. 当てる本文

```markdown
# Manual test record: the @manual scenarios of chapter 6.2

- Scenarios: the @manual scenarios of the use case tests (chapter 6.2 of the specification).
- Result: a Cucumber result value (passed, failed, skipped, pending, undefined, ambiguous). A value other than passed has a Remark.
- The person who checked writes Result and Remark (ANMS v0.36, the test procedure).

| Scenario | Result | Remark |
| ----------- | --------- | --------- |
| SCN-64 | pending | 持ち主の結果は未記録（`user-checklist-2026-10-17.md` の `CR-783`）。AI の確認は OK（2026-10-17） |
| SCN-65 | pending | 持ち主の結果は未記録（`user-checklist-2026-10-16.md` の `CR-774`・`DFC-2909`） |
| SCN-66 | pending | 持ち主の結果は未記録（`-10-17` の `CR-789`）。AI の確認は OK（2026-10-17） |
| SCN-67 | pending | 持ち主の結果は未記録（`-10-17` の `CR-787`）。AI の確認は OK（2026-10-17） |
| SCN-68 | pending | 持ち主の結果は未記録（`-10-17` の `CR-788`）。AI の確認は NG: 絞り込みの欄で一部の字が入らない（`DFC-3100`、2026-11-27 に台帳で `実測待ち`） |
| SCN-69 | pending | 持ち主の結果は未記録（`-10-16` の `CR-775`） |
| SCN-70 | pending | 持ち主の結果は未記録（`-10-16` と `-10-17` の `DFC-2870`）。AI の確認は OK（2026-10-17） |
| SCN-71 | pending | 持ち主の結果は未記録（`-10-17` の `DFC-2980`）。AI の確認は OK（2026-10-17） |
| SCN-72 | pending | 持ち主の結果は未記録（`-10-17` の `CR-784`）。AI の確認は OK（2026-10-17） |
| SCN-73 | pending | 持ち主の結果は未記録（`-10-16` の `CR-777`・`DFC-2911`） |
| SCN-74 | pending | 持ち主の結果は未記録（`-10-17` の `CR-782`）。AI の確認は OK（2026-10-17） |
| SCN-75 | pending | 持ち主の結果は未記録（`-10-17` の `CR-786`）。AI の確認は OK（2026-10-17） |
| SCN-76 | pending | 持ち主の結果は未記録（`-10-16` の `DFC-557`）。読めない見本が台帳の行に無い |
| SCN-77 | pending | 持ち主の結果は未記録（`-10-16` の `CR-780`） |
| SCN-78 | pending | 持ち主の結果は未記録（`-10-16` の `DFC-2856`）。画面では押せず、AI のアプリから送る |
| SCN-79 | pending | 持ち主の結果は未記録（`-10-16` の `CR-781`） |
| SCN-80 | pending | 持ち主の結果は未記録（`-10-16` の `CR-781`） |
| SCN-81 | pending | 持ち主の結果は未記録（`-10-16` の `DFC-2912`）。元の報告は押しても再現しなかった |
```

## 3. シナリオにしなかった行（当てない）

ユースケースの印を持たない行である。シナリオは印を 1 つ持つ決まり（ANMS 6.2）なので、6.2 に書けない。README の問 2 で扱いを問う。

| チェックリスト | 行 ID | 何を確かめる行か | 印を持たない理由 |
|:---|:---|:---|:---|
| `-10-16` | `DFC-2891` | 紹介頁（`/about/`）の見本の釦のリンク先 | 紹介頁は製品の外（Pages の頁） |
| `-10-16` | 紹介頁 05・04 | 紹介頁のタブが 1 画面に収まり、スキーマが開く | 同上 |
| `-10-16` | `CR-776` | 命令の値の名が列の名に替わる | 手順の無い行（チェックリストでも `—`） |
| `-10-17` | `CR-785` | ヘルプの左上のリンクと行の並び | ヘルプはユースケースにしない操作（ANMS 第 2 章の決まり 9） |
| `-10-17` | `DFC-3007` | ダウンロード頁の文と釦 | ダウンロード頁は製品の外 |
| `-10-17` | `DFC-3008` | 紹介頁の表紙の釦 | 紹介頁は製品の外 |

## 4. 写さなかったチェックリスト

| チェックリスト | 行 | 写さなかった理由 |
|:---|---:|:---|
| `docs/review/user-checklist-2026-10-15.md` | 405（台帳の `実測待ち` の行を画面ごとに並べた物） | 不具合の台帳の行を出荷ビルドで押す一覧で、持ち主が使い勝手を見る 1 枚ではない。後の 2 枚（10-16・10-17）が「1 枚」として出し直した。行は台帳（`defects.md`）が持ち続ける |
