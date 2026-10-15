# X-14 —— `CR-755` を当てた後（2026-10-15）

スキーマだけの書き手の試験（`docs/development-rules/04-verification.md` の 3.10 節、`JDG-2040`）を、`CR-755`（タイムゾーンを略称ごとの固定の時差の鍵にした）を当てた後に 1 度回した。手順と道具は `tools/schema-only-writer/README.md`。比べる相手は `CR-751` の後の回（`../x14-2026-10-15-cr-751/after/`）である。

| 回 | スキーマ | 開いた出荷物 | 日単位 | 分単位 | 迷い（`doubts.md`） |
|---|---|---|---|---|---|
| `CR-751` の後 | `CR-751` を当てたスキーマ（`enum` は 28 の地域名） | `CR-751` の作業木の出荷物 | PASS | PASS | 14 点 |
| 本回 | `CR-755` を当てたスキーマ（`enum` は鍵。基準の 2 つは標準時の 27 個、`displayTimeZones` は 39 個） | `CR-755` の作業木の出荷物（`vite build`） | PASS | PASS | 21 点 |

どちらの回も、違反 0・拒み 0・知らせ 0・エラー 0・例外 0・数え直し 0。書き手は新しい体で、スキーマと `writer-brief.md`（タイムゾーンを `UTC+09:00` と書いた版）だけを読んだ。

## 比べ

- ⭐ タイムゾーンの鍵そのものの迷いは 0 —— 書き手は `scheduleDataTimeZone` と `viewTimeZone` に `UTC+09:00` を選び、鍵の綴りも標準時と夏時間の分け方も問わなかった。タイムゾーンに触れた迷いは 2 点で、どちらも `CR-755` の外である: `viewTimeZone` の `null` が何を指すか（前の回にも出た、`DFC-2567`）と、日単位の文書でどの鍵を選んでもよいか。
- 迷いの数が 14 → 21 に増えたのは、書き手が細かい点まで書いたためであり、`CR-755` が変えた列には当たらない。前の回と重なるもの（数え始め・`uid`・新しい文書の既定値・`milestoneGlyph`・ラグの単位・マイルストーンの置き場・`weekStartDay`・`changeLog`）は `DFC-2560`〜`DFC-2569` が持つ。新しく出たもの（`wbsOrder` の数え始め・要約のタスク・`WeekDay` を 7 日とも書くか・24:00 で終わるタスクの書き方・リンクの後の開始が区間の終わりか次の始まりか・`statusDate` の時刻・完了率の 0.5 の丸め・`resume`・`shapeKind` の既定）は `DFC-2770` にまとめた。

測り方: `node tools/schema-only-writer/measure.mjs docs/spec/_source/grs-document.schema.json <day-level.json> <minute-level.json> --app dist/index.html --out-dir <dir>`。`.measure.json` の `app` の欄は、scratch のパスを伏せて書き換えた。
