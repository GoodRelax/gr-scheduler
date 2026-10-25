# タスクの進捗の持ち方と読み方（CR-851 の説明文の見直し用）

対象: GRS JSON スキーマの `/$defs/Task` と、その `actualStart`・`stop`・`actualFinish`・`resume`・`resumeValid`・`percentComplete`。
レビュー行 D139・D150〜D155（`doc-shape-map.tsv` の 140〜156 行目）。2026-10-25 時点の木で調べた。

## 1. スキーマの冒頭に入れる文言の案

ルートの説明の `Terms:` の後に、次の 2 行を `Concepts:` として足す案。

```text
Concepts:
Progress state: each task is not started, in progress, suspended (with or without a resume date) or finished, read from its actual dates.
percentComplete: actual working time as a percentage of planned working time; GRS recounts the value from the dates when opening a GRS JSON file.
```

（1 行目 22 語、2 行目 24 語）

上の 2 行がルートにある前提で、各プロパティの説明を次のように変える案。状態の語は画面・命令と同じ **suspended** と **finished** にそろえた（3 節の D154）。

| 行 | プロパティ | 案 |
| --- | --- | --- |
| D139 | `Task` | Same as MSPDI Task. GRS reads the progress state with these checks, first match wins: no actualStart, not started; actualFinish set, finished; resumeValid false, suspended with no resume date; resume set, suspended with a resume date; otherwise in progress. |
| D150 | `actualStart` | Same as MSPDI Task/ActualStart. Absent means the task is not started. |
| D151 | `stop` | Same as MSPDI Task/Stop: the end of the actual work so far on a task that is in progress or suspended. GRS omits stop once actualFinish is set. |
| D152 | `actualFinish` | Same as MSPDI Task/ActualFinish. Present only on a finished task; a percentComplete of 100 does not mean finished. |
| D153 | `resume` | Same as MSPDI Task/Resume: on a suspended task, when the remaining work is planned to restart. |
| D154 | `resumeValid` | Same as MSPDI Task/ResumeValid. On a task with actualStart and no actualFinish, false means suspended with no resume date decided, even if resume holds a date. |
| D155 | `percentComplete` | Same as MSPDI Task/PercentComplete, except that GRS recounts the value from the dates on opening a GRS JSON file: actual working minutes (actualStart to actualFinish, or to stop) over planned working minutes (start to finish), times 100, rounded, not capped at 100. With no planned working minutes, as on a milestone, the value is 100 once actualFinish is set and 0 before. |

メモ:
- D155 は 2 文・約 60 語で、基準 E3（約 40 語）を超える。2 文目は「マイルストーンで 0 で割る」誤りを防ぐので残した。削るなら 1 文目のかっこ書き 2 つを落とす（Concepts 行が「実績の稼働時間 ÷ 予定の稼働時間」を言っている）。
- MSPDI から読んだ値を数え直さないことは、D155 の「on opening a GRS JSON file」が言っている。はっきり言うなら 3 文目に「A value read from MSPDI is kept as it is.」を足す（E3 の「誤りを防ぐ 3 文目」に当たる）。
- D152 の後半（100 でも完了ではない）は `FR-012` の「`percentComplete` から完了を判じてはならない」（01-04-requirements.md 3625 行）を外の読み手にも伝えるため。要らなければ 1 文目だけにする。
- 「it」は使っていない。数を指すときは「the value」、タスクを指すときは「the task」と書いた。

## 2. やさしい説明

### 2.1 考え方

- タスクの「状態」は、どこにも列として保存されていない。実績の日付の列（`actualStart`・`actualFinish`・`stop`・`resume`）と `resumeValid` の組み合わせから、読むたびに決める（`FR-010` の RATIONALE: 拡張領域なしで MSPDI と往復できる）。
- 決め方は「上から順に調べて、最初に当たったもの」（表 T-019a）。どんな組み合わせでも必ずどれか 1 つに決まる（全域）。
- 完了率（`percentComplete`）は「予定した稼働時間のうち、実績でどれだけ使ったか」。完了したかどうかとは別物で、完了は `actualFinish` があるかどうかだけで決まる。

### 2.2 状態の表

| 順 | 状態（画面の日本語 / 英語） | 当たる条件 | GRS が置く値（表 T-019） | 日程表の見え方 |
| :-: | --- | --- | --- | --- |
| 1 | 未着手 / Not started（`PS-1`） | `actualStart` が無い | 実績はすべて空 | 実績バーなし。印は `( · )`。基準日が `start` より後ならイナズマ線は `start` に打つ（`PL-4`） |
| 2 | 完了 / Finished（`PS-2`） | `actualFinish` がある | `actualFinish` あり、`stop`・`resume` 空、`resumeValid` = false | 実績バーは `actualStart`〜`actualFinish`。印は `(✓)`。イナズマ線は打たない（`PL-1`） |
| 3 | 中断・再開日未定 / Suspended, no resume date（`PS-3`） | `resumeValid` が false | `stop` に日付、`resume` 空 | 実績バーは `stop` まで。印は `( − )`。再開アイコンは小さく実績の終わりに出る（`S-25`）。イナズマ線は打たない（`PL-2`） |
| 4 | 中断・再開予定あり / Suspended, resume date set（`PS-4`） | `resume` に日付がある | `stop` と `resume` に日付、`resumeValid` = true | 実績バーは `stop` まで。印は `( − )`。再開アイコンが `resume` の日に出る。`resume` が基準日より前ならそこに打つ（`PL-3`） |
| 5 | 進行中 / In progress（`PS-5`） | 上のどれでもない | `stop` に日付、`resumeValid` = true | 実績バーは `stop` まで。印は `(→)`。イナズマ線は実績バーの右端に打つ（`PL-5`） |

ポイント:
- 「完了」を「中断」より先に調べる。MS Project などは、途中で中断してから完了したタスクに `Resume`・`ResumeValid` を残すことがあり、後に調べると実在するファイルが読めなくなる（T-019a の注）。
- 「再開日未定（`resumeValid` = false）」を「再開予定あり（`resume` がある）」より先に調べる。「再開しない」と決めたことは、残っている日付より強い。だから GRS は再開日を置くと `resumeValid` を true にし、消すと false に戻す（`FR-044`、01-04-requirements.md 3299〜3301 行）。
- `resumeValid` が書かれていない（キーが無い）ときは false ではないので、3 番には当たらない。
- 「中止」は「中断・再開日未定」と同じもので、別の状態は作らない（表 T-019 の後、`UC-005` 拡張 3a）。「遅れ `(!)`」は状態ではなく、上の 5 つに重ねて出す導出である。
- マイルストーンも同じ 5 状態を通る。点なので実績の長さは 0 で、実績の終わりは `actualStart` と同じ日（`S-130`）。

### 2.3 完了率の数え方

式（`FR-012`）: `round(実績の稼働分 ÷ 予定の稼働分 × 100)`

- 実績の稼働分: `actualStart` から、完了なら `actualFinish`、それ以外は `stop` までの稼働時間（`FR-011`）。未着手は 0。
- 予定の稼働分: `start` から `finish` までを同じ規則で数える。端の日が休日でも、その日は働いた日として数える（`FR-011`・`LM-22`）。
- 0〜100 に切り詰めない。予定より長くかかれば 100 を超える。
- 予定の稼働分が 0（マイルストーンなど）のときは割り算をせず、`actualFinish` があれば 100、無ければ 0。

例（暦: 月〜金、08:00〜12:00 と 13:00〜17:00 = 1 日 480 分）:

| 場面 | 予定 | 実績 | 計算 | 完了率 |
| --- | --- | --- | --- | --- |
| 進行中 | 10/5（月）08:00〜10/9（金）17:00 = 5 日 = 2400 分 | `actualStart` 10/5 08:00、`stop` 10/7（水）17:00 = 3 日 = 1440 分 | 1440 ÷ 2400 × 100 | 60 |
| 早く完了 | 同上 | `actualFinish` 10/8（木）17:00 = 4 日 = 1920 分 | 1920 ÷ 2400 × 100 | 80（完了でも 100 ではない） |
| 遅れて完了 | 同上 | `actualFinish` 10/13（火）17:00 = 7 日 = 3360 分 | 3360 ÷ 2400 × 100 | 140 |
| マイルストーン | 長さ 0 | `actualFinish` あり | 割り算しない | 100 |

### 2.4 いつ数え直すか

| 場面 | 数え直す？ | 出典 |
| --- | --- | --- |
| GRS JSON を開く（単一 .html に埋め込んだもの、Agent API が受け取ったものも） | 数え直す。値が変わったタスクの数を知らせる | `FR-012`、`OP-6`、src/adapter/document-codec/json-codec.ts 437 行 |
| MSPDI を取り込む | 数え直さない。取り込んだ値をそのまま保つ | `FR-012`、`AT-39`、src/adapter/document-codec/mspdi-codec.ts 654 行 |
| 日付を編集する | そのタスクを数え直す | `FR-012`、src/use-case/edit-document/percent-complete.ts の `repriced` |
| 稼働日の暦を編集する | 全タスクを数え直す（暦の変更と同じ 1 回の書き込み） | `FR-012`、src/use-case/edit-document/edit-calendar.ts 91 行 |
| 人が完了率を直接入れる | できない | `FR-012` |

### 2.5 MS Project の PercentComplete との違い

以下のうち「一般知識」と書いたものは MS Project の一般的な振る舞いで、GRS の仕様書や実機では確かめていない。

- 一般知識: MS Project の % Complete は「実績期間 ÷ 期間」で、0〜100 に収まる。実績が予定を超えると、% を 100 より上げる代わりに期間のほうを延ばす。100% を入れると実績終了日が入る。
- 一般知識: MS Project では人が % Complete を入力でき、そこから実績期間・Stop・Resume を逆に計算する。GRS は向きが逆で、日付が正しい値であり、完了率は日付から計算する（人は入力できない）。
- GRS は 100 を超える値をそのまま書き出す。MS Project がその値をどう扱うかは未検証（`LM-7`）。
- 予定の端を休日に置いたタスクでは、書き出す `PercentComplete` が `ActualDuration ÷ Duration` と一致しない（`LM-22`）。
- MSPDI の xsd は `ResumeValid` を「Whether the task can be resumed.」と説明している（ローカルの参考資料 docs/reference/mspdi/pj12/mspdi_pj12.xsd 1759 行。gitignore 済み）。GRS はこれを「始めたが終わっていないタスクで false なら、再開日未定の中断」と読む。

## 3. 各コメントへの答え

### D139（Task）「わかりにくい。冒頭にコンセプトをまとめてほしい」

- 1 節の Concepts 1 行目で「5 つの状態があり、実績の日付から読む」とだけ先に言い、D139 は判定の順番だけを書く形にした。
- 今の文はかっこが無く、「no actualStart is not started」のように「条件 is 状態」がつながって読みにくい。案では「条件, 状態;」の形にし、冒頭に「first match wins」を置いた。
- 語は complete → finished、interrupted → suspended、restart day → resume date に替えた（画面の PS-2〜PS-4 と、命令の `state` の値に合わせる）。

### D154（resumeValid）「interruption かぁ。suspended して再開日未定って感じ。再考を要す」

- 使っている語を数えた:
  - suspended: 画面の状態の語 `PS-3`「Suspended, no resume date」・`PS-4`「Suspended, resume date set」（src/adapter/screen-renderer/display-words.json 6784・6791 行）。命令スキーマの `state` の値 `suspendedWithResumeDate`・`suspendedWithoutResumeDate`（src/adapter/document-codec/grs-json-schema.ts 1415・1434 行）。src の中の名前 `suspendedResumeUnknown`・`suspendedResumePlanned`（src/entity/document-model/schedule/plan-actual-state.ts 12・13 行）。
  - interruption: 画面ではヒント `resumeValidHint` の 1 か所だけ（display-words.json 5554 行「Clear it for an interruption with no resume date.」）。ほかはスキーマの説明（D139・D153 の旧文・D154）。
  - これは `JDG-2740`（2026-10-18）で「suspended… と finished の案でよい」と決まり、画面の語を Stopped から Suspended にそろえた。そのときヒントとスキーマの説明が残った。
- 案: **suspended** を全部の英語で使う。完了は **finished**、再開日は **resume date**（`PR-7` の見出しは「Resume」、`PR-8` は「Resume Date Confirmed」）。
- 1 節の D154 案は「false means suspended with no resume date decided」。さらに「even if resume holds a date」を足して、判定の順番（`PS-3` が `PS-4` より先）を外の読み手にも伝える。
- 同じ直しが要る所（今回は書き換えていない）: `resumeValidHint` の英語（src と docs/spec/_source の両方の display-words.json）。

### D155（percentComplete）「it がさすものがあいまい。レポートにまとめて。冒頭に書く…かな」

- 今の文の「It can exceed 100.」は、すぐ前の名詞が「planned working minutes」や「a GRS JSON file」なので、何を指すのか読みにくい。案では「the value」と書き、「not capped at 100」を式の後ろにつなげた。
- 冒頭（Concepts 2 行目）に「実績の稼働時間 ÷ 予定の稼働時間、GRS JSON を開くと日付から数え直す」を置いた。D155 には式の詳細と、マイルストーンのときの扱いだけを残した。
- 「whenever it reads a GRS JSON file」の「it」も GRS か schema か曖昧なので、「on opening a GRS JSON file」にした。

## 4. 食い違い

どちらが正しいかは決めていない。

1. 状態の英語の語: スキーマの説明（D139・D153 旧文・D154）は interrupted / interruption / complete / restart day を使い、画面（`PS-2`〜`PS-4`）と命令スキーマ（`JDG-2740`）は Finished / Suspended / resume date を使う。画面のヒント `resumeValidHint` も interruption のまま。
2. src の中の名前が 2 組ある: plan-actual-state.ts は `suspendedResumeUnknown`・`suspendedResumePlanned`、命令の形（src/use-case/edit-document/edit-task.ts 72・78 行、grs-json-schema.ts）は `suspendedWithoutResumeDate`・`suspendedWithResumeDate`。外には出ない名前だが、同じ状態に 2 つの名がある。
3. `AT-38`（docs/spec/_assets/fig-erd-detail.md 378 行）は「偽 = 再開日が未定の中断」と書くが、表 T-019 の `PA-5`（完了）も false を置き、未着手へ戻す `PV-4` とコピーの `DU-1` も false を置く。T-019a の順番で読めば矛盾はないが、`AT-38` だけを読むと「false なら必ず中断」と読める。
4. D155 案と今の文は「予定の稼働分が 0 = マイルストーン」と読めるが、`FR-012` は「マイルストーンと、`FR-011` の数えで稼働時間に 1 分も掛からないタスク」の両方としている。案は「as on a milestone」として例に下げた。
5. src/use-case/edit-document/percent-complete.ts 20 行は、`start` か `finish` が無いタスクでは保存値をそのまま残す。`FR-012` はそうしたタスクを受け付けない（`FR-023` が弾く）としており、読み込みの途中だけの扱いと見られる（20 行の直後の WHY コメント）。食い違いではないが、念のため書いておく。

## 5. 出典

- docs/spec/01-04-requirements.md: 表 T-019（`PA-1`〜`PA-5`、3058〜3064 行）、表 T-019a（`PS-1`〜`PS-5`、3079〜3088 行）、`FR-011`（実績の長さ、3110〜3145 行）、`FR-012`（完了率、3323〜3370 行）、`FR-044`（3299〜3301 行）、表 T-021（`PM-1`〜`PM-4`）、表 T-021a（`PV-1`〜`PV-4`、3434〜3437 行）、表 T-022（`PL-1`〜`PL-5`、4204〜4208 行）、`UC-005` 拡張 3a（771 行）、`DU-1`（2745 行）、`OP-6`（7541 行）、`LM-7`・`LM-22`（220・234 行）、3625・3639 行（完了率から完了を判じない）
- docs/spec/05-07-design.md: 表 T-069 の `RV-1`（937 行）
- docs/spec/_assets/fig-erd-detail.md: `AT-30`・`AT-34`・`AT-36`〜`AT-39`・`AT-141`（370〜379 行）
- docs/spec/_assets/tbl-settings.md: `S-130`（138 行）
- docs/development-records/rulings.md: `JDG-2684`（3031 行）、`JDG-2740`（3068 行）、`JDG-2470`（2819 行）
- src/entity/document-model/schedule/plan-actual-state.ts 9〜24 行、src/use-case/edit-document/percent-complete.ts 18〜75 行、src/adapter/document-codec/json-codec.ts 437 行、src/use-case/edit-document/edit-calendar.ts 91 行、src/adapter/document-codec/mspdi-codec.ts 654 行、src/entity/layout-engine/schedule-geometry/task-figures.ts 623〜630 行、src/adapter/screen-renderer/display-words.json 5554・6770〜6798・1600〜1618 行
- studies/76-grs-json-beta-shape/doc-shape-map.tsv 140・151〜156 行、spec-rows-map.tsv 397 行（今のルートの説明）、shipped-text-criteria.md（E1〜E7）
- change-request/CR-851-…md: 進捗の状態と完了率については書いていない（29 行で JDG-3302 の状態の語に触れるだけ）
- 一般知識: 2.5 節の「一般知識」と書いた 2 点（MS Project の % Complete の範囲と入力の向き）
