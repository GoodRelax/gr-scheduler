# BGQA11 の 2 回目の当て直しの台本（CR-857）

`JDG-3901`〜`JDG-3908` の名と語を、仕様・原稿・試験へ当てる台本。合流で仕様の向こう側を取ったときは、手で混ぜずに `bash studies/82-anms-ndd-apply-plan/bgqa11-sweeps/run_all.sh` を走らせ直し、`npm run gen` と試験を回す（BOSS 2026-11-27）。何度走らせても、古い語が残る所だけを書き換える。

| 台本 | 当てるもの |
|:---|:---|
| `reapply_cr855_renames.py` | 名の辞書の BGQA11 の改名を未適用に戻す。続けて `tools/apply_glossary_renames.py apply` |
| `sweep_retract_ja.py`・`sweep_retract_ja_requirements.py` | Retract の日本語は格納（`JDG-3907`）。後者は表 T-015・表 T-051 の文 |
| `sweep_schedule_filter_ja.py` | チェックで描くタスクを選ぶ働きの日本語は日程抽出（`JDG-3908`） |
| `hand_requirements.py`・`hand_tests.py` | 台本が届かない決まった書き換え（`U-10` の `Cursor`、絞るの文、試験の引用、道具の誤りの 1 つ） |
| `once_*.py` | 原稿への 1 回だけの手直し（2026-11-27 に当てた。走らせ直さない） |
