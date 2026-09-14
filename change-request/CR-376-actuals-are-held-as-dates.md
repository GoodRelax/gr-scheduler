# CR-376 — 実績を日付で持つ（非稼働日の終了日を置けるようにする）

> **閉じるもの**: ⛔ **利用者の裁定 `JDG-67`（2026-09-14）と `JDG-69`（2026-09-14）** —— 逐語は `docs/development-records/rulings.md` の各行。
> - `JDG-67`: 「非稼働日で話したら、その非稼働日を終了点としろ。 休日出勤することもあるだろ？」
> - `JDG-69`: 「選択: 日付を正にする (Recommended)」
>
> ⛔ **起草だけである。仕様書・コード・試験・台帳は 1 文字も動かしていない。**
> ⭐ 置く位置はリファクタ計画（`docs/development-records/refactor-plan-report-2026-09-13.md` の 現在地 4）に従う —— **段 2a・2b とは別の 1 本**（理由は文書のデータの持ち方であり、辺の規則や保存しない状態の置き場とは違う）、**段 2a の前**（書き直す `edit-task.ts` は段 4、`input-command-translator.ts` は段 5 で割るので、記録 7 節の a により割る前に直す）。仕様への適用は段 2a・2b と同じ仕様のセッションでまとめてよい（規則 05 の 6）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-008`「描いたものを直接掴んで日程を変えられる」**。
表 T-023d の `GR-6`（実績の終了点）と `GR-17`（未着手のダミーの右半分）は、いまは「`actualStart` ＋ 稼働日の長さ」で実績を持つので、**土日などの非稼働日で離しても、その日を終了日として置けない**（`JDG-64` の行の ⚠️ が「書いていない」とした所）。
休日出勤した事実を、掴んで置けるようにする。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・重複がない。唯一の正がある）** —— 実績の終了日を「長さ（`actualDuration`）」と「日付（`actualFinish`、書き出す `Stop`）」の 2 通りで持っており、完了すると両方が文書に並ぶ。第 1 節で数えた。⇒ 日付を唯一の正にし、長さは求める値にする（第 5 節）
- **`R1.4`（境界値）** —— 非稼働日に始まる・終わる実績、開始日 ＝ 最後の日、最後の日が開始日より前、の 3 つの境界を第 5 節の各行に置いた
- **`R3.4`（境界とインデックス）** —— 実績の帯を「開始日から最後の日まで（両端を含む）」と名で示し、位置は「最後の日の翌暦日の列の左端」と別の名で持つ。いまの `FR-011` が「右端（位置）」と「終了日」の読み違いを 2 度起こした（`JDG-04` の注記）ので、2 つの名を分けたまま残す
- **`R4.3`（複数フィールド更新の原子化）** —— `PV-2` と `PV-3` は日付を 1 つの列から別の列へ移すので、移す前と後の間に「日付を持たない実績」が見えてはならない。第 5 節の `PV-2` / `PV-3` を 1 回の置き換えとした

### ③ 利用者に問うたこと・**問わずに決めた**こと

**問うて裁定を得た**（本書を起こす前）:

1. 非稼働日で離したときの終了日 ⇒ **その非稼働日**（`JDG-67`。前に立つ者の推奨「前の稼働日」は退けられた）
2. 持ち方 ⇒ **日付を正にする**（`JDG-69`。実績の開始は `ActualStart`、進行中の進んだ所は `Stop`、完了は `ActualFinish` の日付。長さは日付から数える）

**問うこと**: なし。

⭐ 起草した体は下の「問 1」を利用者に問う案として書いたが、前に立つ者が 2026-09-14 に反証し、決定 12 として導いた（理由は 決定 12 の行）。問いの本文は、導いた経緯として残す。

> **問 1（問わずに 決定 12 で決めた） —— 非稼働日に働いた日を、実績の長さに数えるか**
>
> 例: 月〜金が稼働日の文書で、金曜に始めたタスクを土曜に出勤して土曜で終えた（実績の終了点を土曜の列で離した。`JDG-67` によりその土曜が終了日になる）。
> 画面の実績の帯は 金・土 の 2 日ぶん描かれる。このとき**長さ**を何日とするか。
> 長さを使う所は 2 つある —— 完了率の分子（`FR-012`）と、MS Project へ書き出す `ActualDuration`（`FR-054`）。
> 土曜だけ出勤して土曜で始めて土曜で終えた実績（開始日 ＝ 終了日 ＝ 土曜）も同じ問いに入る。
>
> | 案 | 金〜土 の長さ | 土〜土 の長さ | 代償 |
> |---|--:|--:|---|
> | **甲（推奨）: 文書の暦の稼働日だけを数える** | 1 日 | 0 日 | 土曜だけの実績は、帯は 1 日ぶん描かれるのに、完了率の分子が 0、書き出す `ActualDuration` が 0 時間になる。⭐ 数え方はいまの `FR-011` ／ `FR-012`（分子も分母も稼働日）／ `FR-054`（暦は文書に 1 つ）のままで、数える所も `Schedule` の 1 か所のまま（表 T-069 の直後の MUST NOT「数え方を 3 か所に書いてはならない」を割らない） |
> | 乙: 実績の帯が覆う非稼働日も、働いた日として数える | 2 日 | 1 日 | 実績の長さだけが暦と違う数え方になる。完了率の分母（予定の期間）は暦の稼働日のままなので、分子と分母で数え方が割れ、完了率が 100 を超えうる。`Schedule` に 2 つ目の数え方が立つ |
>
> 推奨は甲。代償は上の「土曜だけの実績の長さが 0」である。
>
> **打った 3 手と、返ったもの**:
> (1) `rulings.md` を「非稼働日」で引いた ⇒ `JDG-64` ／ `JDG-67` ／ `JDG-69` の 3 行だけで、どれも長さの数え方に触れない。`pending-decisions.md` を「非稼働日」で引いた ⇒ `PND-200` の 1 行だけで、これはフェードの期間の数え方であり実績ではない。
> (2) `impact.py FR-012 FR-054` の近傍 ⇒ `FR-012` の STATEMENT は「いずれも稼働日」、`FR-054` は稼働日を時間の量へ換算する規則（`01-04-requirements.md:3705`）だけで、働いた非稼働日の扱いはどちらにも無い。
> (3) 別の道があるか ⇒ **無い**。暦の編集（`FR-088`）が変えられるのは「稼働する曜日」と「例外日（休業日）」だけで、ある土曜 1 日だけを稼働日にする例外が無い（`fig-erd-detail.md` の `ET-8` も休業日の例外日である）。曜日ごと稼働日にすると文書の全タスクの日数が変わる。⇒ どちらの側にも別の道が無いので、3 手で決まらなかった。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | `Task` に列 `stop`（日時、空を許す、`Own`、交換 `Task/Stop`）を足し、**進行中と中断のあいだの実績の最後の日**を持つ。行 ID は `AT-141`（表 T-058 の最大が `AT-140`。`erd.json` の `seat` と行番号が一致するので、番号を振り直さず次の空きを使う） | `JDG-69`「進行中の進んだ所は `Stop`」。⚠️ **`FR-006` の MUST NOT「`stop`（中断日）をモデルの列として持ってはならない」（`01-04-requirements.md:1766`）と正面から衝突する** —— その文は `rulings.md` に 1 件も引かれていない（`` `FR-006` `` の出現 0 件、`stop` の出現 0 件）⇒ 裁定の行が勝つので、その MUST NOT を退ける |
| 決定 2 | `actualDuration` を**文書の列から外す**（`AT-35` を退役、欠番のまま）。長さは `FR-011` が日付から数える値とし、書き出すときに表 T-059 の新しい行 `DV-11`（`Task/ActualDuration`）で作る | `JDG-69`「長さ（`ActualDuration`）は日付から数える」＋ 表 T-069 の直後の MUST NOT「これらを文書に持ってはならない —— 持つと、元になった列と食い違ったときにどちらが正かを決める規則が要る」。表 T-059 の直後も同じ理由を述べる。⚠️ `FR-006` の「`GRS JSON` の列名は変えない」は名の付け替えを禁じる文であり、列を外すことは禁じていない（同じ段が辞書の名の話をしている） |
| 決定 3 | 実績の**最後の日** ＝ 完了なら `actualFinish`、進行中・中断なら `stop`。実績バーの右端（`RV-1`）＝ **最後の日の翌暦日**の列の左端。帯は開始日から最後の日まで両端を含む | `JDG-04` と `FR-011` の「開始日と終了日が同じ日の実績は 1 日」。翌**稼働日**ではなく翌**暦日**にするのは、`JDG-67` の土曜の終了日を帯が土曜の列の右で閉じるためである |
| 決定 4 | 書き出す `Stop` の日 ＝ **最後の日そのもの**（翌日の位置ではない） | MSPDI の上流の解説 `docs/reference/mspdi/learn-docs/project-xml-data-interchange/stop-element.md` が Task の `Stop` を "the end of the actual portion of a task" と書く。⚠️ いまの `FR-011` の「`DV-9` は位置を求める行であり、終了日へ書き換えると書き出す日が 1 日ずれる（MUST NOT）」（`01-04-requirements.md:2558-2559`）はこの読みと逆であり、`rulings.md` に引かれていない（`JDG-04` の注記は「1 日」を着地させた記録で、`Stop` の日の読みは裁いていない）⇒ 本書で退ける。⛔ **MS Project が書く時刻の部分（17:00 など）は確かめていない** —— `previous-project-result/OPEN-ITEMS-ja.md` の 3 が同じ実測を未了のまま持つ |
| 決定 5 | `S-129`（または `S-130`）の長さを置くときの最後の日 ＝ **`actualStart` の後に来る稼働日を `S-129` − 1 個数えた日**（`S-129` ＝ 1 なら `actualStart` そのもの。マイルストーンは常に `actualStart`） | `JDG-15`「ダミーの実績は1日だ」と `JDG-44`（1 押しは 1 稼働日）。⛔ 退けた読み「数えた稼働日が `S-129` に届く最初の日」は、土曜にダミーを落とすと最後の日が月曜まで伸び、`JDG-15` の 1 日に反する |
| 決定 6 | 床: **最後の日を 決定 5 の日より前に置かない**（`FR-011`）。⭐ 数えた長さが 0 の置き方（最後の日が開始日より前だが、間に稼働日が無い）は床へ持ち上げ、0 を下回る置き方は `IV-21` が拒む | いまの床（`FR-011`）と `FR-043` の「それより左に離したときは `FR-011` の床が受け持つ」（`01-04-requirements.md:2688`）を日付の言葉に移しただけ。拒みは `JDG-66`「拒んで告げる」。⭐ 土曜始まり・土曜終わりの実績は 決定 5 の日そのものなので床に掛からず、`JDG-67` と衝突しない |
| 決定 7 | 完了にしたら `stop` を空にし、完了を解いたら `stop` ＝ それまでの `actualFinish` とする（`PV-2` / `PV-3`） | `FR-011`「人が置いていない限り両端を動かさない」。⚠️ いまの `PV-3` は `actualFinish` を空にするだけで、長さが列に残るから右端が消えなかった。長さを列から外すと、`stop` へ移さない限り最後の日が消える |
| 決定 8 | 取り込み: `ActualFinish` → `actualFinish`、`Stop` → `stop`。**完了していないのに `Stop` が無い**タスクは、`ActualDuration` を 1 日単位に丸め（`PND-164` の裁定のまま）、決定 5 と同じ読みで `stop` を立てる。**以前の版の `GRS JSON`**（`actualDuration` を持ち `stop` を持たない）も同じ読みで開く | `FR-073`「読めない版とは、この造りが知る最大の版より新しいことである（MUST）」⇒ 古い版は読めなければならない。立てる読みは 決定 5 のほかに無い |
| 決定 9 | 書き出す `ActualDuration`（`DV-11`）＝ `FR-011` が数えた長さ × `Project.minutesPerDay`（空なら `S-128`）。**人がそのタスクの実績を編集していないあいだは、取り込んだ原値をそのまま書き戻す** | 表 T-019 の注記（`01-04-requirements.md:2524-2527`）がいま `Stop` に当てている規則と、`DV-8`（`Duration`）の「人が編集していないタスクは受け取った値をそのまま返す」。⇒ Carry で原値を保つ対象（表 T-005 の `G-13`）を `Stop` から `ActualDuration` へ移す。⚠️ `PND-164` の注「`ActualDuration` は `TASK_CONSUMED` にあり `carryElements` に残らない」はこの変更で偽になるので、台帳の側で追記が要る |
| 決定 10 | プロパティパネルの `PR-5`（実績期間）は残す。数を入れたら 決定 5 の読みで最後の日（`stop` か `actualFinish`）を置く。`stop` のための新しいプロパティの行は足さない | 非稼働日の最後の日は `GR-6` を離して置ける（別の道がある）。`FR-043` が長さを直す道として `PR-5` を名指している（`01-04-requirements.md:2686`） |
| 決定 11 | `schemaVersion` を、この変更が着地する日の版へ上げる | `FR-024` ／ `FR-073`（列の組が変わる。上げないと古い文書と新しい文書の区別がつかない） |
| 決定 12 | 実績の長さ ＝ `actualStart` から最後の日までの、文書の暦の稼働日の数。**ただし両端の日（`actualStart` と最後の日）は、非稼働日であっても 1 日として数える**（丙）。間にある非稼働日は数えない。例: 月〜金が稼働日の文書で、金〜土 は 2 日、土〜土 は 1 日、金〜月 は 2 日、土〜月 は 2 日。数える所は `FR-011` の 1 か所のまま | ⭐ **甲（稼働日だけ）は退けた** —— 土〜土 が 0 日になり、`FR-011` の「実績の開始日と終了日が同じ日であるとき、その実績は 1 日とすること（MUST）。0 日としてはならない（MUST NOT）」（`01-04-requirements.md` の `FR-011`、`JDG-04` の着地先）を割る。裁かれた行が導いた案に勝つ。⭐ **両端を数える根拠** —— 両端は人が置いた日であり、`JDG-67` の理由「休日出勤することもあるだろ？」は、非稼働日の終了点を働いた日と見ている。⭐ **間の非稼働日を数えない根拠** —— 働いた証拠が無く、稼働日は文書に 1 つの暦に従う（`FR-054`）。乙（帯が覆う非稼働日をすべて数える）は、金〜月 の間の土日まで働いた日にするので退けた。⚠️ 問 1 の表が乙の代償に挙げた「完了率が 100 を超えうる」は代償ではない —— `FR-012` の RATIONALE が「0 〜 100 に丸めてはならない（MUST NOT）…120 日かかれば 120 である」と定めている。⚠️ **代償**: ① 間の土曜に出勤した実績は、その土曜を長さに数えられない（暦に 1 日だけの稼働の例外が無い。問 1 の 3 手の (3)）② 書き出す `ActualDuration`（決定 9）は、MS Project が同じ暦で数える長さと、非稼働日の端の分だけ食い違いうる（未実測） |

---

## 1. 測った —— 実績の持ち方を名指す場所の全数

**方法**: `docs/spec/` のうち `docs/spec/output/` を除く `*.md` を、正規表現 `actualStart|actualDuration|actualFinish|ActualDuration|ActualFinish|ActualStart|\bStop\b|\bresume\b|\bResume\b` で `grep -rn` した ⇒ **69 行**。
各行を、その行を囲む `**UID**:` または `**表 T-…**` の見出しで持ち主に割り当て、本書の案で文が変わるかを 1 行ずつ判じた。

| ファイル | 行数 | 変える | 変えない |
|---|--:|--:|--:|
| `01-04-requirements.md` | 47 | 24 | 23 |
| `05-07-design.md` | 3 | 2 | 1 |
| `_assets/fig-erd-detail.md`（生成物。原稿は `_source/erd.json`） | 9 | 3 | 6 |
| `_assets/tbl-glossary.md` | 5 | 1 | 4 |
| `_assets/tbl-property-items.md`（生成物。原稿は `_source/property-items.json`） | 4 | 1 | 3 |
| `_assets/tbl-settings.md` | 1 | 0 | 1 |
| **計** | **69** | **31** | **38** |

**変える 31 行**（行番号は HEAD `013c38e`）:

| 持ち主 | 行 | 何が変わるか |
|---|---|---|
| 表 T-005 `G-13` | 01-04:249 | Carry で原値を保つ項目を `Stop` から `ActualDuration` へ（決定 9） |
| `FR-006` | 01-04:1768（と、同じ段の 1766） | `stop` の MUST NOT と「取り込んだ `Stop` は Carry」を退け、`stop` を列として持つ文へ（決定 1） |
| 表 T-019 | 01-04:2491（見出し行。`PA-1`〜`PA-5` の 5 行と注記 2524-2527 を含む） | 列 `actualDuration` を「最後の日」の列へ、`Stop`（書き出し）の列を `stop` の値の列へ（`PA-2`・`PA-3`・`PA-4` は日付、`PA-1`・`PA-5` は空）。注記の対象を `ActualDuration` へ（決定 9） |
| `FR-011` | 01-04:2539, 2541, 2550, 2554, 2555, 2556, 2558 | STATEMENT の右端の定義（決定 3）、床（決定 6）、`RV-1` / `DV-9` の段（決定 4）、数える規則の持ち主はそのまま本要求 1 か所 |
| `FR-043` | 01-04:2655 | 置く値を「`actualDuration` ＝ `S-129`」から「`stop` ＝ 決定 5 の日」へ |
| `FR-012` | 01-04:2747 | 式の `actualDuration` が「`FR-011` が日付から数えた長さ」であることを指す（式は変えない） |
| 表 T-021a `PV-1` / `PV-2` / `PV-3` | 01-04:2834, 2835, 2836 | `PV-1`: `actualFinish` ＝ 決定 5 の日。`PV-2`: `actualFinish` ＝ `stop`、`stop` を空に。`PV-3`: `stop` ＝ それまでの `actualFinish`（決定 7） |
| 表 T-022 `PL-5` | 01-04:2967 | 括弧の算式「`actualStart` ＋ `actualDuration`」を `RV-1` への指しへ |
| 表 T-023d `GR-5` / `GR-6` / `GR-17` / `GR-9` / `GR-18` | 01-04:3151, 3152, 3153, 3154, 3159 | `GR-5`: `actualStart` だけを変え、最後の日は据え置く（「本表でただ 1 行、2 つの列を変える行」の ⚠️ が消える）。`GR-6` / `GR-17`: 置くのは最後の日。`GR-9` / `GR-18`: 語だけ |
| 表 T-245 `GO-3` / `GO-4` | 01-04:3369, 3370 | `GO-3`: 離した日 ＝ 最後の日（完了なら `actualFinish`、それ以外は `stop`）。`actualFinish` を別に読み直す段が消える。`GO-4`: 持っているほうの最後の日 ＝ 置き直した `actualStart` |
| `FR-021` | 01-04:4342 | 端数が往復しない理由を `AT-35`（稼働日の整数）から、決定 9 の「編集したタスクは日付から作り直す」へ |
| 表 T-069 `RV-1` | 05-07:705 | 求め方を「最後の日の翌暦日の列の左端」へ（決定 3） |
| 表 T-220 `IV-21` | 05-07:922 | 「`actualDuration` が 0 を下回らない」を「`FR-011` が日付から数えた長さが 0 を下回らない」へ |
| 図 `Task` の列（生成物） | erd-detail:61 | `actualDuration` の列が図から消え、`stop` が入る |
| 表 T-058 `AT-35` | erd-detail:340 | 退役（決定 2）。⭐ 代わりに `AT-141`（`stop`）が立つ（決定 1） |
| 表 T-059 `DV-9` | erd-detail:462 | 退役（`stop` は列になり、書き出すときに作る値ではなくなる）。⭐ 代わりに `DV-11`（`ActualDuration`）が立つ（決定 2・決定 9） |
| 表 T-006 系の語 `P-4` | glossary:55 | `stop`（実績の最後の日。進行中・中断のあいだ）を同じ行に足す |
| 表 T-016 `PR-5` | property-items:35 | 意味の欄を「実績バーの長さそのもの（稼働日数）」から「`FR-011` が日付から数えた長さ。入れると最後の日を置く」へ（決定 10） |

**変えない 38 行**の内訳: `A-12`（語の明示）／ `OR-2` と 1505（再開アイコンの並び）／ `FR-010` の 2483（交換相手が残す組の説明。取り込みで `stop` に入るだけ）／ 表 T-019a の `PS-1`〜`PS-4` と注記 2518・2521（判別は `actualStart` ／ `actualFinish` ／ `resume` ／ `resumeValid` だけで決まり、`stop` を要らない）／ `FR-043` の 2642（掴みシロを出す条件。⚠️ 適用時に STATEMENT 全文を読み直す）と 2693 ／ `FR-012` の 2757・2759・2778 ／ `PV-4` ／ `DL-3` ／ `PL-3` ／ `GR-8` ／ `GR-15`（`FR-103` を指すだけ）／ 3263（`GR-9` の日で確定）／ 3373（`IV-21` を引くだけ）／ `EP-5` ／ `OP-10` ／ `LF-11`（05-07:943）／ 図の `actualStart` ・ `actualFinish` ・ `resume` ／ `AT-34` ・ `AT-36` ・ `AT-37` ／ 語 `P-5` ・ `P-6` ・ `U-6` ・ `K-108` ／ `PR-4` ・ `PR-6` ・ `PR-7` ／ `S-130`。

**原稿（`_source/`）で動くもの**:

| 原稿 | 動くもの | 生成物 |
|---|---|---|
| `erd.json` | `seat` 35（`actualDuration`）を退役、`seat` 141（`stop`）を足す、表 T-059 の `seat` 9（`stop`）を退役、`seat` 11（`ActualDuration`）を足す | `_assets/fig-erd-detail.md`、`grs-document.schema.json`（検査 16・17 が再生成を見張る） |
| `property-items.json` | `actualDuration` の行の意味 | `_assets/tbl-property-items.md` |
| `display-words.json` | 動かない（`actualDuration` の表示語は `PR-5` が残るので残す。`stop` はパネルに出さない） | —— |
| `settings.json` | 動かない（`resume*` の 6 件は再開アイコンの寸法で、実績の持ち方ではない） | —— |

⚠️ `05-07-design.md:394` の `PI-1` は `DATE_COLUMNS` を「表 T-058 の型の欄が日付とする列の全数」と定めるので、`stop` は文の変更なしにそこへ入る。

### 数え方の同じ形の文

「`actualStart` に `actualDuration` を稼働日で加えた日」の形を `grep` で数えた（`稼働日で加え|稼働日を加え|1 稼働日前`）⇒ **5 行**。うち実績の数え方の文は **4 行**（01-04:2539, 2554, 2835、05-07:705）で、残る 05-07:394（`PI-1`）は無関係の一致である。本書はこの 4 行をすべて上の表で変える。`DV-9` の「`actualStart` ＋ `actualDuration`」と `PL-5` の同形 2 行も上の表にある。

---

## 2. グラフ

**`impact.py FR-011 GO-3 GR-17 GR-6 PV-2 RV-1 DV-9`**（指されている箇所）:

| 種 | 指している要求 / 参照 |
|---|---|
| `FR-011` | 10 件 / 25 箇所（`FR-084` `FR-043` `FR-013` `FR-046` `FR-047` `FR-016` `FR-103` `FR-054` `FR-019` `FR-029` と Chapter 5.5 / 6.1 / 6.2、`tbl-settings.md:432`） |
| `GO-3` | 1 件 / 1 箇所（`FR-043`） |
| `GR-17` | 4 件 / 20 箇所（`FR-003` `FR-043` `FR-016` `FR-040`） |
| `GR-6` | 3 件 / 14 箇所（`FR-013` `FR-016` `FR-103`） |
| `PV-2` | 2 件 / 3 箇所（`FR-013` `FR-103`、Chapter 5.5 の状態図） |
| `RV-1` | 1 件 / 5 箇所（`FR-011`、Chapter 5.5 / 6.2） |
| `DV-9` | 1 件 / 2 箇所（`FR-011`、Chapter 6.2） |

**導いた条項が届く行**（`impact.py FR-006 T-019 G-13 PL-5 FR-012 GR-18 PV-3 DV-8 FR-073 PR-5 IV-21 S-129 AT-35`）: `FR-006` 4 件 / 23、`PL-5` 3 / 3、`FR-012` 10 / 21、`GR-18` 3 / 10、`PV-3` 0 / 1、`DV-8` 0 / 0、`FR-073` 3 / 4、`PR-5` 1 / 1、`IV-21` 1 / 1、`S-129` 6 / 13、`AT-35` 1 / 1、`G-13` 1 / 1。

**それぞれを `rulings.md` で引いた**（`` `ID` `` の出現数）: `FR-011` 4、`GR-17` 7、`FR-043` 7、`GO-3` 3、`GR-18` 3、`GR-6` 2、`S-129` 2、`PV-1` 1、`PV-2` 1、`RV-1` 1、`DV-9` 1、`IV-21` 1、ほかは 0。
該当する裁定（`JDG-04` `JDG-15` `JDG-29` `JDG-37` `JDG-39` `JDG-41` `JDG-44` `JDG-64` `JDG-66` `JDG-67` `JDG-69`）を読み、決定 1〜決定 11 と衝突しないことを確かめた。衝突したのは**裁定のない仕様の文** 2 つ（決定 1 の `FR-006` の MUST NOT、決定 4 の `FR-011` の `DV-9` の段）で、どちらも裁定の側を採った。

**`induced.py`**（本書が触る 39 対象: `FR-011 FR-103 T-245 GO-3 GO-4 T-023d GR-5 GR-6 GR-17 GR-9 GR-18 FR-043 FR-013 T-021a PV-1 PV-2 PV-3 T-069 RV-1 T-059 DV-8 DV-9 AT-35 AT-36 PR-5 IV-21 S-129 FR-054 FR-021 FR-006 T-019 PA-2 PA-5 T-022 PL-5 FR-012 G-13 FR-073 FR-010`）:
39 種すべて解決、種の間の辺 82、**閉路 1（大きさ 17）**: `AT-35 FR-011 FR-012 FR-013 FR-021 FR-043 FR-054 FR-103 GO-3 GR-17 GR-6 GR-9 IV-21 PV-1 PV-2 RV-1 S-129`。
⇒ ⛔ **この 17 は 1 つの計画で 1 度に書く。** 本書が書き換えるのはそのうち `AT-35`（退役）`FR-011` `FR-012` `FR-021` `FR-043` `GO-3` `GR-17` `GR-6` `GR-9` `IV-21` `PV-1` `PV-2` `RV-1` の 13 で、`FR-013` `FR-054` `FR-103` `S-129` は書き換えない。
⚠️ まだ無い `AT-141` と `DV-11` は種にできない。適用の後にもう一度走らせる。

---

## 3. いまのコードと試験（編集しない。一覧だけ）

**実績の右端・終了日を「開始日 ＋ 稼働日の長さ」から求めている関数**（`grep -rn "actualDuration" src --include=*.ts` の 53 行、7 ファイルから、長さで日付を求める箇所を拾った）:

| ファイル:行 | 関数・枝 | 何をしているか | 割る段 |
|---|---|---|---|
| `src/use-case/edit-document/edit-task.ts:244` | `actualFinishDayOf` | 右端 ＝ 開始 ＋ 長さ、終了日 ＝ その 1 稼働日前 | 段 4（`editTask`） |
| `src/use-case/edit-document/edit-task.ts:255` | `actualDurationEndingOn` | 離した日の翌日まで稼働日を数えて長さにする（`GR-17`） | 段 4 |
| `src/use-case/edit-document/edit-task.ts:266-279` | `CARRIED_STOP` と原値の `Stop` を落とす関数 | 表 T-019 の注記（`Stop` の Carry） | 段 4 |
| `src/use-case/edit-document/edit-task.ts:584-595, 628-645, 667-681` | `CM-13` / `CM-14`（`beginTaskActual`）/ 状態を巡らせる枝 | 長さを置き、`actualFinishDayOf` で終了日を作る | 段 4 |
| `src/adapter/input-command-translator/input-command-translator.ts:2927-2937` | `GR-5` / `GR-6` / `GR-15` を離したときの値 | `dateFromWorkingDays` で右端を作り、`workingDaysBetween` で長さを数える | 段 5 |
| `src/adapter/input-command-translator/input-command-translator.ts:920-957` | プロパティパネルの `actualDuration` の欄 | 長さを列として置く | 段 5 |
| `src/entity/layout-engine/schedule-layout/schedule-layout.ts:508` | `actualSpanOf` | `reader.walk(from, actualDuration)` で帯の幅（`RV-1`） | 割らない |
| `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts:690` | ダミーの位置 | `dateFromWorkingDays(from, actualInitialDuration)`（`GR-17` の描く位置。**本書では変えない**） | 割らない |
| `src/adapter/document-codec/mspdi-codec.ts:1693-1708` | `writtenStop`（`DV-9`） | `Stop` ＝ 開始 ＋ 長さ（位置） | 割らない |
| `src/adapter/document-codec/mspdi-codec.ts:937, 983, 1689-1690`、同 81・125（Carry する項目の一覧に `Stop`） | 取り込み・書き出しの `ActualDuration` | 列として読み書き | 割らない |
| `src/adapter/document-codec/json-codec.ts:156, 192` | `GRS JSON` のスキーマ（`required` に `actualDuration`） | 列の組 | 割らない |
| `src/entity/document-model/schedule/schedule.ts:95, 418, 1670-1674` | `Task` の型、列の型、`IV-21` | 長さを列として持つ | 割らない |
| `src/use-case/validate-imported-document/validate-imported-document.ts:258` | 取り込みの `IV-21` | 同上 | 割らない |
| `src/entity/document-model/schedule/schedule.ts:872, 887` | `workingDaysBetween` / `dateFromWorkingDays` | 数え上げの 1 か所（表 T-069 の直後の MUST）。**残す** | 割らない |

⚠️ `src/framework/single-html-shell/frame-loop.ts` は実績の長さを直に読まない（`actualStart` の 1 か所 1033 行だけ）⇒ 段 7 とはぶつからない。

⭐ 記録 7 節の a に従い、`edit-task.ts` の直しは段 4 の前、`input-command-translator.ts` の直しは段 5 の前に当てる。

**試験**: `tests/` で `GR-6|GR-17|GO-3|RV-1|DV-9|PV-2|actualDuration` を持つファイルは 100 本（うち `actualDuration` を名指すもの 97 本）。行 ID を名指す 39 本のうち、いまの持ち方を逐語で主張し、書き直しが確実に要るもの:
`tests/unit/fr-011-a-the-started-actual-keeps-one-worked-day.test.ts`、`tests/unit/go-3-the-released-day-is-the-actual-finish-date.test.ts`、`tests/unit/gr-17-the-released-day-is-the-actual-finish-date.test.ts`、`tests/unit/fr-103-t-245-what-a-released-end-puts.test.ts`、`tests/unit/dfc-507-go-3-go-4-a-finished-actual-finish-follows-the-grab.test.ts`、`tests/unit/dfc-554-gr-17-released-at-or-left-of-the-dummy-keeps-s-129.test.ts`、`tests/unit/dfc-572-pv-1-pv-2-actual-finish-is-the-finish-day.test.ts`、`tests/unit/dfc-294-t-019-the-carried-original-is-dropped-only-by-an-actual-edit.test.ts`、`tests/unit/t-023d-gr-5-relays-the-actual-duration.test.ts`、`tests/unit/uf-36.test.ts`、`tests/unit/edit-task.test.ts`、`tests/unit/layout-engine.test.ts`。
⚠️ 残りは実装の波で測る（本書では 1 本ずつ読んでいない）。⚠️ `uf-36` は `docs/reference/mspdi/` を読むので、作業木では読み込めない（その資料は gitignore の対象）。

**段 1 と段 2b への影響**: 段 1 の棚卸し（`refactor-stage1-state-inventory-2026-09-13.md`）と段 2b の状態のモデルは保存しない状態だけを扱う（記録 12 節）。本書が動かすのは文書の列だけである。`grep -c "actualDuration\|actualFinish\|\bstop\b" docs/development-records/refactor-stage1-state-inventory-2026-09-13.md` ⇒ **0 行**。⇒ 棚卸しの一覧と段 2b の変更要求に、本書が数えさせる行は無い。

---

## 4. MSPDI の事実（`docs/reference/mspdi/mspdi_pj12.xsd`、この作業木に在った）

| 要素 | 型 | 行 | xsd の説明 |
|---|---|--:|---|
| `ActualStart` | `xsd:dateTime` | 1919 | "The actual start date of the task." |
| `ActualFinish` | `xsd:dateTime` | 1924 | "The actual finish date of the task." |
| `ActualDuration` | `xsd:duration` | 1929 | "The actual duration of the task." |
| `Stop` | `xsd:dateTime` | 1747 | "The date that the task was stopped." |
| `Resume` | `xsd:dateTime` | 1752 | "The date that the task resumed." |

いずれも `minOccurs="0"` で、`Task` 要素（1604 行）の中に在る。
上流の解説 `docs/reference/mspdi/learn-docs/project-xml-data-interchange/stop-element.md` は Task の `Stop` を "the end of the actual portion of a task" と書く（決定 4 の根拠）。
⛔ 曜日の番号・時刻の部分には本書は触れない。

---

## 5. 案 —— 各対象に書く中身

| 対象 | いま | 案 |
|---|---|---|
| `Task` の列 | `actualStart` ／ `actualDuration`（`Consume`、稼働日の整数）／ `actualFinish` ／ `resume` ／ `resumeValid` | `actualStart` ／ **`stop`（新設 `AT-141`）** ／ `actualFinish` ／ `resume` ／ `resumeValid`。`AT-35` は退役 |
| `FR-011` STATEMENT | 左端 `actualStart`、右端 ＝ `actualStart` ＋ `actualDuration`（稼働日） | 左端 `actualStart`、**最後の日 ＝ 完了なら `actualFinish`、それ以外は `stop`**、右端 ＝ 最後の日の翌暦日の列の左端。人が置いていない限り動かさない（MUST NOT は残す） |
| `FR-011` 長さ | `actualDuration` そのもの | **長さ ＝ `actualStart` から最後の日までの稼働日の数。両端の日は非稼働日でも 1 日と数える**（決定 12。数え方は本要求 1 か所のまま）。`FR-012` の分子はこの長さを読む |
| `FR-011` 床 | `actualDuration` ≥ `S-129` | 最後の日を 決定 5 の日より前にしない。長さが 0 の置き方は床へ、0 を下回る置き方は `IV-21` |
| `FR-011` の `RV-1` / `DV-9` の段 | 「どちらも位置を求める行。終了日へ書き換えてはならない」 | `RV-1` は位置、書き出す `Stop` は最後の日そのもの（決定 4）。「位置と終了日を同じ語で呼ばない」の趣旨は残す |
| 表 T-019 | `actualDuration` の列 ／ `Stop`（書き出し）の列 | 「最後の日」の列（`PA-2`〜`PA-4` は `stop`、`PA-5` は `actualFinish`）／ `stop` の列（`PA-2`〜`PA-4` 日付、`PA-1`・`PA-5` 空） |
| 表 T-019 の注記 | 原値の `Stop` を Carry | 原値の `ActualDuration` を Carry（決定 9） |
| 表 T-021a `PV-1` | `actualDuration` ＝ `S-129`、`actualFinish` ＝ 終了日 | `actualFinish` ＝ 決定 5 の日 |
| 表 T-021a `PV-2` | `actualFinish` ＝ 右端の 1 稼働日前 | `actualFinish` ＝ `stop`、`stop` ＝ 空（1 回の置き換え） |
| 表 T-021a `PV-3` | `actualFinish` と `resume` を空 | `stop` ＝ それまでの `actualFinish`、`actualFinish` と `resume` を空（1 回の置き換え） |
| `FR-043` の値の段 | `actualDuration` ＝ `S-129` | `stop` ＝ 決定 5 の日 |
| 表 T-023d `GR-5` | `actualStart` を変え、`actualDuration` を置き直す（2 列） | `actualStart` だけを変える。最後の日は据え置き |
| 表 T-023d `GR-6` / `GR-17` | 長さを置く | 最後の日を置く（置く値は `FR-103`）。離した日を稼働日へ寄せない規則（結び 3298）はそのまま |
| 表 T-245 `GO-3` | `actualDuration` ＝ 離した日までの稼働日、`actualFinish` を持てば読み直す | **離した日 ＝ 最後の日**（完了なら `actualFinish`、それ以外は `stop`）。据え置くのは `actualStart` |
| 表 T-245 `GO-4` | `actualStart` ＝ 離した日、`actualFinish` を持てば同じ日 | `actualStart` ＝ 離した日、持っているほうの最後の日も同じ日 |
| 表 T-069 `RV-1` | `actualStart` ＋ `actualDuration`（稼働日） | 最後の日の翌暦日の列の左端 |
| 表 T-059 | `DV-9`（`Stop` を作る） | `DV-9` 退役。`DV-11`（`ActualDuration` ＝ 長さ × `minutesPerDay`。編集していないタスクは原値） |
| 表 T-220 `IV-21` | `actualDuration` < 0 を拒む | `FR-011` が数えた長さ < 0 を拒む |
| 表 T-022 `PL-5` | `actualStart` ＋ `actualDuration` に打つ | `RV-1` に打つ |
| `FR-006` の段 | `stop` を列に持たない（MUST NOT）、原値の `Stop` を Carry | `stop` を列に持つ（決定 1） |
| 取り込み（`FR-054` の近く。置き場は適用時に `FR-054` の本文を読んで決める） | `ActualDuration` を稼働日へ | 決定 8 |

⛔ **新しい拒み方は立てない**（`IV-21` の言い換えだけ）。⛔ **ダミーを描く位置（`GR-9` / `GR-17` / `GR-18` の「場所」の欄）は変えない。**

---

## 6. 数の予測

方法: `python .claude/skills/spec-graph-check/md-checks.py .` の最終行。起草時（HEAD `013c38e`）は `tables=145  figures=11  rows=1901  uids=153`。

| | 前 | 後（予測） | 差 | 内訳 |
|---|--:|--:|--:|---|
| tables | 145 | 145 | 0 | |
| figures | 11 | 11 | 0 | 図 `Task` の列は動くが図の数は同じ |
| rows | 1901 | 1901 | 0 | `AT-35` −1、`AT-141` +1、`DV-9` −1、`DV-11` +1。語 `P-4` はセルの編集で行を足さない |
| uids | 153 | 153 | 0 | |

⚠️ 退役した行を表から消すか欠番の行として残すかで rows が ±2 ずれる。適用時に、既存の退役の形（規則 02 の 4「番号を振り直さない。欠番はそのまま残す」）に合わせ、この表を実測で直す。

---

## 7. 影響 —— 本書の外で動くもの

| 所 | 何が動くか |
|---|---|
| `docs/development-records/rulings.md` | `JDG-67` と `JDG-69` の着地先の欄と状態を、適用した日に書く |
| `ruling-landed-baseline.txt` | この変更要求が着地したコミットで数を下げる（計画の現在地 4） |
| `docs/development-records/pending-decisions.md` の `PND-164` | 注の「`ActualDuration` は `carryElements` に残らない」が偽になる（決定 9）。丸めの裁定は取り込みで使い続ける |
| `docs/development-records/defects.md` / `fixed-defects.md` | `DFC-507` `DFC-554` `DFC-572` `DFC-575` の試験が主張する値が変わる（閉じた行を開き直すのではなく、試験の書き直しとして扱う） |
| 検査 16・17 | `erd.json` を直し、`_assets/fig-erd-detail.md` と `grs-document.schema.json` を生成し直す。⛔ 生成物を手で直さない |
| 検査 37 の `dictionary-table-pairing.txt` | `GR-5` ／ `GR-6` ／ `GR-17` ／ `GR-9` ／ `GR-18` の指紋が変わる見込み |
| 検査 42 の `quoted-source-baseline.txt` | 試験のコメントが引く仕様の文が変わる。上げずに済む置き方を先に探す（`CR-374` の前例） |
| 規則 02 の 3.5 | `_source/` の原稿の行（`AT-141` `DV-11`）と、それを読むコード（`schedule.ts` の列の型、`json-codec.ts`、`mspdi-codec.ts`）を**同じ波で**着地させる |
| `docs/development-records/changelog.md` | A-appendix の 1 行（適用時） |

---

## 8. ⛔ この変更でやらないこと

- ⛔ **長さの数え方は 決定 12 の丙のとおりにし、`FR-011` の 1 か所の外に 2 つ目の数え方を立てない** —— 利用者が 決定 12 を覆したときは、`FR-011` の長さの段と `FR-012` の分子の段だけを差し替える
- ⛔ **予定（`start` / `finish`）の持ち方は変えない**
- ⛔ **`resume` ／ `resumeValid` と表 T-019a の判別の順は変えない**
- ⛔ **ダミーを描く位置と、掴み代の規則（表 T-244 と表 T-023d の結び）は変えない**
- ⛔ **MS Project が `Stop` に書く時刻の部分は決めない**（`previous-project-result/OPEN-ITEMS-ja.md` の 3 の実測を待つ）
- ⛔ **`src/` と `tests/` には触らない**（起草の段）
