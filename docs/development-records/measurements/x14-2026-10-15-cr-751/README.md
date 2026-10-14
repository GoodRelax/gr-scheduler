# X-14 —— `CR-751` を当てる前と後（2026-10-15）

スキーマだけの書き手の試験（`docs/development-rules/04-verification.md` の 3.10 節、`JDG-2040`）の初めの回である。手順と道具は `tools/schema-only-writer/README.md`。

| 回 | スキーマ | 開いた出荷物 | 日単位 | 分単位 | 迷い（`doubts.md`） |
|---|---|---|---|---|---|
| `before/` | `43b7315a` のスキーマ | `43b7315a` の `dist/index.html` | PASS | FAIL —— 知らせ 1（`RS-89`: 13:00〜24:00 の例外日の合計が `minutesPerDay` と違う） | 17 点 |
| `after/` | `CR-751` を当てたスキーマ | 作業木から作った出荷物（`vite build`） | PASS | PASS | 14 点 |

どちらの回も、違反 0・拒み 0・エラー 0・例外 0・数え直し 0。書き手は回ごとに別の新しい体で、スキーマと `writer-brief.md` だけを読んだ。

## 比べ

- ⭐ 当てる前の迷いのうち、`CR-751` の 13 点（`DFC-2493`〜`DFC-2505`）に当たるもの —— `viewTimeZone` の型、`scheduleDataTimeZone` の地名の一覧、24:00 の書き方、終わりの日を含むか、完了率を日で数えるか分で数えるか、`minutesPerDay` と例外日 —— は、後の回に出なかった。
- 後の回の書き手は `minutesPerDay` の説明を読んで、一部だけ稼働の例外日も合計を 480 分に保った（その結果、分単位の知らせが 0 になった）。
- 両方の回に残った迷いと後の回の新しい迷いは、`CR-751` の外の穴として `DFC-2560`〜`DFC-2569` に記録した（数え始め、`uid` の採り方、新しい文書の既定値、`milestoneGlyph`、ラグ 0 の単位、`stop` と `statusDate`、依存からの組み直し、`viewTimeZone` の `null`、週と月の換算の列、`displayTimeZones` の本数）。

測り方: `node tools/schema-only-writer/measure.mjs <schema> <day-level.json> <minute-level.json> --app <index.html> --out-dir <dir>`。`after/` の `.measure.json` の `app` の欄は、scratch のパスを伏せて書き換えた。
