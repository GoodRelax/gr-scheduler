# Manual test record: the @manual scenarios

- Scenarios: the @manual scenarios of the use case tests (docs/spec/08-10-test.md section 8.1; ANMS v0.36 section 6.2).
- Result: a Cucumber result value (passed, failed, skipped, pending, undefined, ambiguous). A value other than passed has a Remark.
- The person who checked writes Result and Remark (ANMS v0.36, the test procedure).
- Checked by tools/gate/test-record.mjs --check (check 95): every @manual scenario has one row, and no other.

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
