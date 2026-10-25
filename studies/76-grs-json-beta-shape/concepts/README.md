# CR-851 の考え方の解説（2026-10-25）

行のレビューのページへのコメント（D007・D080・D093・D098・D105・D138・D139・D155 ほか）で、利用者が「1 枚の .md にまとめて」「そのエッセンスをスキーマの冒頭に」と求めた話題の解説である。
話題ごとに 1 枚。どれも頭に「スキーマの冒頭に入れる文言の案」と、行ごとの説明の案を置いた。事実は仕様書と CR-851 の表から取り、出典は各ファイルの最後にある。

| ファイル | 話題 | 答えるコメント |
|---|---|---|
| `task-groups-and-wbs.md` | WBS（タスクの親子）とタスクグループの 2 本の木 | D007・D010・D011 |
| `time-and-time-zones.md` | 時刻の 3 つの種類、タイムゾーン、既定の始業・終業、終わりの 00:00:00 を 24:00 と読む理由 | D097・D098・D138 |
| `calendar.md` | 文書の暦 1 つで数えること、既定の時間帯、1 日の分数と警告、例外日の種類 | D080・D093・D109・D121・D130・D132・D166・D172 |
| `carried-mspdi-values.md` | GRS が使わない MSPDI の値を持って書き戻すこと（carry） | D105・D106・D115・D116・D161・D162 ほか |
| `task-progress.md` | 進捗の状態（未着手・進行中・中断・完了）と percentComplete の数え方 | D139・D154・D155 |

## スキーマの冒頭に入れる文言 —— 席の案

5 枚の案をそのまま足すと 11 行・約 220 語になり、`JDG-3331`（「長い文は読む気を無くす」で冒頭を削った）に戻ってしまう。
席は、1 話題 1 行にまとめた次の 6 行を勧める（約 110 語）。「Terms:」の後、「The shape of GRS JSON:」の木の前に置く。

```text
Concepts:
WBS is the tree of parent and child tasks, as in MSPDI. Task groups are GRS's own rows of the task group panel; each task is drawn in exactly one.
Schedule date-times are wall-clock times with no offset, in project.scheduleDataTimeZone; GRS never converts them. Record times are UTC.
An end time of 00:00:00 means 24:00, the end of the day before.
GRS counts every working day with one calendar, the one that project.calendarUid names.
"Carried" means GRS does not use the value, but keeps it and writes it back to MSPDI unchanged.
A task is not started, in progress, suspended or finished, read from its actual dates; GRS recounts percentComplete from the dates.
```

- 細かい決まり（秒は読まない、日の範囲は両端を含む、暦の選び方の順、日付を編集すると作り直す持ち回りの値）は、効くプロパティの説明に置いたままにする（`JDG-3331` の「決まりは効く所に 1 回」）。
- 冒頭に足すことは `JDG-3331` の一部を覆すので、決まったら裁定の行を書く。
- 当てる前に、各行の英語はいつもの 4 段（Haiku → Sonnet → 席 → 利用者）で確かめる。

## 解説を書いて分かったこと（決めてほしいことを含む）

1. **D081 `Project.name`** —— 画面のヘッダーに「プロジェクト名」と出ているのは、実は `Project.title`（MSPDI の Title）である（`display-words.json` の `documentTitle`）。
   `Project.name`（MSPDI の Name）は画面に出ていない。ところが仕様書の `FR-074` は「文書の基本情報」の面で `Project.name` を直せると定めている（表 T-224 の `PF-1`）。その面は今の GRS にまだ無い（AI の命令 `setProjectProfile` だけがある）。
   なので「GRS does not show it」は今の GRS としては正しいが、仕様書とは食い違う。直す場所の案（ヘッダーの [三] の中）は、この `FR-074` の面をどこに置くかの話になる。
2. **D154 の語** —— 画面と命令はすでに「suspended」（中断）と「finished」（完了）を使っている（`JDG-2740`）。説明だけが「interrupted」「complete」だったので、「suspended」にそろえる。
3. **D138 の 24:00** —— `CR-710` の `X-19`（2026-10-11）で決めた。MS Project が真夜中に終わる時間帯を 00:00:00 と書くこと、XML の時刻の型が 24:00 を書けないことによる。理由は今も成り立つ。MSPDI との違いではないので、説明から「except that」を外す。
4. **既定の始業・終業（D098・D121）** —— 8:00〜12:00・13:00〜17:00、1 日 480 分、開始 8:00、終了 17:00 は MS Project の既定と合っている。合わないのは週の始まりだけ（GRS は月曜、MS Project は日曜）。
5. **(S-128) などの番号** —— 出荷するスキーマには入らない。行のレビューのページだけが、値の後ろに仕様書の行の番号を付けて見せていた。ページから外す。
6. 各ファイルの「食い違い」の節に、仕様書どうし、または仕様書と実装の食い違いを、どちらとも決めずに並べた。
