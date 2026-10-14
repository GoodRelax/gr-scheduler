# CR-749 —— 完了率の数え直しは暦の索引を 1 度だけ作り、配置は終了の側の日を覚えた日から数える

> 起草の状態: 当てた（2026-10-14、作業木 `e4d07fdb` の上）。調整役の波 9 の体 E が、起草・仕様・`src`・台帳を同じ作業木で行った。
> ID の帯: 調整役から番号 `CR-749`、台帳 `DFC-2513`〜`DFC-2514`、変更履歴 `4.58`、性能の測り待ち `198` を受けた。使ったのは `CR-749`・`4.58`・`198` だけ（新しい台帳の行は要らなかったので `DFC-2513`・`DFC-2514` は使わない）。新しい行 ID は無い。`e4d07fdb` の木で `CR-749` を名乗る変更要求は 0 件、`DFC-2513`・`DFC-2514` は 0 件、変更履歴の `4.58` の行は 0 件だった（9 節）。
> 当てるもの: `DFC-2472` の ①（完了率の数え直しがタスクごとに暦の索引を作り直す）と、`DFC-2471` の ④（終了の側の日を読み手が持つ日から数える公開の入口）。どちらも 表 T-064 の行を待っていた（検査 26b）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`e4d07fdb`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| 数え直しはタスクごとに暦の索引を作る | `src/use-case/edit-document/percent-complete.ts` の `percentCompleteOf` は 1 タスクにつき `plannedLengthMinutesOf`・`actualInstantsOf`・`actualMinutesOf` を呼ぶ。`working-calendar.ts` の `actualMinutesOf` は呼ぶたびに `timeIndexOf` を作り、`plannedInstantsOf`・`actualInstantsOf` は端ごとに `instantOnSide` で読み手を作る（時刻を書いていない日付の字に会うと、そのたびに索引を作る）。1 タスクで索引は最大 6 回 | 数え手を 1 つ持ち、索引は 1 度だけ作る（X-1） |
| 結果は変わらない | 索引は暦（`WorkingCalendar`）だけから作られ、数え直しの間は暦が変わらない。数え方の式（`edgeSpansOf`・`minutesOver`）は同じ関数をそのまま呼ぶ | 起動の見本と大きな見本で、数え直しの結果・すべての完了率を数え直させた結果・配置・`GRS JSON` の読みの指紋が前後で同じだった（7 節） |
| 配置の終了の側は日付の字を 2 度読む | `schedule-layout.ts` の `edgeOf` は `dayAt(text)`（読み手の覚え）で日があるかを見たあと、`finishSideDayOf(text)` が `dayOf` でもう 1 度読む | 覚えた日から数える入口 `finishSideDayFrom` を足す（X-2） |
| 新しい名前は 表 T-064 に要る | `percent-complete.ts` は `EditDocument`、`schedule-layout.ts` は `ScheduleLayout` で、どちらも `Schedule` の外。検査 26b は境を越える名前を 表 T-064 と照らす | `PI-1` に 3 つ足す（X-3） |

### 0.2 裁定の鎖（`rulings.md` を「`DFC-2472`」「`DFC-2471`」「暦の索引」「完了率」で引いた）

覆す裁定も、従う裁定も無い。完了率の決め方（`FR-012`）と実績の長さの数え方（`FR-011`）、日時の字の読み方（`FR-054`）は変えない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-3`（`GL-003`、軽快に動かす）—— 大きな文書を開くとき（`GRS JSON` の読み）と暦を直すときの数え直しの時間を、`CR-710` の前より短くする。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 数え手は今の関数の式をそのまま呼び、数え方を写さない。`plannedLengthMinutesOf` は数え手に任せる 1 行になった。
- `R2.1`・`R2.22`（名は指すものを言う、公開の入口）—— `workingTimeCounterOf` は「稼働時間を数えるもの」を返す。`finishSideDayFrom` は `finishSideDayOf` と同じ日を「から」数える（X-b）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 数え手は 2 つの数え方（予定の期間・実績の長さ）だけを持つ | 数え直しが要るのはこの 2 つだけ。ほかの呼び手（MSPDI の書き出し、プロパティの欄、遅延診断）は 1 タスクを 1 度数えるだけなので今の関数のまま | 無い |
| X-b | 名は遅い試験の体の下書きの名（`workingTimeCounterOf`・`finishSideDayFrom`）をそのまま使う | 調整役の指示。`DFC-2471`・`DFC-2472` の行もこの名で書いている | 無い |
| X-c | `plannedInstantsOf`・`actualInstantsOf` は 2 つの端で 1 つの読み手を持つ | 端ごとに作っていた読み手は同じ暦の同じ索引を作るだけで、1 つにしても答えは同じ | 無い |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| 完了率の数え直し（`GRS JSON` を読む・暦を直す） | タスクごとに暦の索引を作り直す | 1 回の数え直しで 1 度だけ作る。答えは同じ |
| 配置のバーの右の端（時刻を表示しないとき） | 日付の字を、読み手の覚えと `finishSideDayOf` で 2 度読む | 覚えた日から数える。答えは同じ |

画面・文書・書き出しの見た目と中身は変わらない。

---

## 2. 新しい識別子

無い（行 ID は取らない）。新しい名前は 表 T-064 のメンバ 3 つ（X-3）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

消すものは無い。表 T-064 の `PI-1` に 3 つ足すだけ。

---

## 4. 書き直す所

### X-1 —— 数え手（`src/entity/document-model/schedule/working-calendar.ts`）

`workingTimeCounterOf(within)` が数え手 `WorkingTimeCounter` を返す。数え手は暦の索引を初めて要るときに 1 度だけ作り、`plannedLengthMinutes(task)`（`plannedLengthMinutesOf` と同じ）と `actualLengthMinutes(task)`（`actualInstantsOf` の 2 つの瞬間を `actualMinutesOf` で数えたもの。端が読めなければ無い）を答える。数え直し（`recountedPercentComplete`）は数え手を 1 つ持ってすべてのタスクを数える。

### X-2 —— 終了の側の日（`src/entity/document-model/schedule/calendar-day.ts`）

`finishSideDayFrom(day, text)` は、`dayOf(text)` の答え `day` を受けて `finishSideDayOf(text)` と同じ日を返す。`finishSideDayOf` はこれを呼ぶ 1 行になる。配置の `edgeOf` は読み手の覚えの日を渡す。

### X-3 —— 表 T-064 の `PI-1`（`docs/spec/_source/published-entries.json`）

`finishSideDayOf` の後に 1 つ、`plannedLengthMinutesOf` の後に 2 つ足す:

```
／ `finishSideDayFrom`（`finishSideDayOf` と同じ日を、読み手が既に読んだその字の日（`dayOf` の答え）から数える。
配置が 1 タスクごとに日付の字を読み直さないために公開した（`FR-054`））
／ `workingTimeCounterOf`（予定の期間と実績の長さ（分）を、1 回の数え直しの間くり返して数える数え手（暦の索引は初めて要るときに 1 度だけ作る）。
数え方は `plannedLengthMinutesOf` ・ `actualInstantsOf` と `actualMinutesOf` と同じ（`FR-011`・`FR-012`）。
完了率の数え直しがタスクごとに暦の索引を作り直さないために公開した）
／ `WorkingTimeCounter`（型。
`workingTimeCounterOf` が返す数え手 —— `Task` から予定の期間と実績の長さ（分）。
実績の端が読めなければ実績の長さは無い）
```

### 4.1 生成物

`npm run gen` が `docs/spec/_assets/tbl-published-entries.md` と `docs/review/public-entry-index.md` を書いた（手で直していない）。`strictdoc export docs/spec` は通り、その後 `rm -rf output`。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えたもの |
|---|---|
| `src/entity/document-model/schedule/working-calendar.ts` | `workingTimeCounterOf`・`WorkingTimeCounter`（新）。読み手の中身を `instantOnSideOver` に、瞬間の組を `plannedInstantsBy`・`actualInstantsBy` に、長さの数えを `actualMinutesAt` に分け、今の公開の関数はそれを呼ぶ |
| `src/entity/document-model/schedule/calendar-day.ts` | `finishSideDayFrom`（新）。`finishSideDayOf` はそれを呼ぶ |
| `src/entity/document-model/schedule/schedule.ts` | 上の 3 つを公開した（表 T-064 の `PI-1`） |
| `src/use-case/edit-document/percent-complete.ts` | 数え直しは数え手を 1 つ持つ（`repricedBy`）。`repriced` は 1 タスクのために数え手を作る |
| `src/entity/layout-engine/schedule-layout/schedule-layout.ts` | `edgeOf` の終了の側は `finishSideDayFrom` で数える |

試験: 既存の完了率・実績の長さ・日時の読み・`GRS JSON` の読みの試験は変えずに通る（7 節）。新しい公開の名前の試験は、仕様だけを読む別の体が書く。

毎フレームの経路（規則 04 の 5 節）: `schedule-layout.ts`・`calendar-day.ts`・`working-calendar.ts` に触れたので `perf-pending` の 198 を足した。

---

## 6. グラフ（`impact.py`）

- `PI-1` を指すのは要求 0 件、参照 4 箇所（`05-07-design.md` の 5.3・5.5・6.1 と生成の表）。本書は辺を足さず、消さない。

---

## 7. 数（実測）

- 要求 ±0、表 ±0、表の行 ±0、`（MUST）` ±0、`（MUST NOT）` ±0。表 T-064 のメンバ 477 → 480（`PI-1` は 125 → 128。`published-entries.json` の `members` の `name` を数えた）。
- 時間（同じプロセスで 30 回の最小。前の木と後の木を `rolldown` で別々に束ね、交互に 3 回ずつ流した）:

| 測ったもの | 前（`e4d07fdb`） | 後 |
|---|---|---|
| 数え直し（起動の見本、1000 タスク） | 12.3〜13.0 ms | 5.7〜6.1 ms |
| 数え直し（`sample-large-erp-program.en.xml`、256 タスク） | 35.8〜39.4 ms | 3.8〜4.1 ms |
| 起動の見本の `GRS JSON` の読み（`documentFromJson`） | 22.0〜23.5 ms | 15.1〜15.7 ms |
| 起動の見本の `layoutFromSchedule` | 2.8〜3.1 ms | 2.7〜2.9 ms |

- 指紋（`sha256` の頭 16 字）は前後で同じ: 数え直しの結果、すべての完了率を `-7` にしてから数え直した結果、配置、`GRS JSON` の読みの結果 —— 2 つの見本の 7 つとも。

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `defects.md` | `DFC-2472` を `実測待ち`（数と実物の手順） |
| `perf-pending.md` | `198` |
| `changelog.md` | `4.58` |

`DFC-2471` の ④ は本書で当たったが、行は本書の帯に無いので動かしていない（調整役が直す）。

---

## 9. 測り方の再現

```
git grep -c "CR-749" e4d07fdb -- change-request docs src tests                 # 0 件
git grep -c "DFC-2513\|DFC-2514\|| 4.58 |" e4d07fdb -- docs change-request    # 0 件
python .claude/skills/spec-graph-check/check-published-members.py             # 480 member(s)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py PI-1
```

時間と指紋: 体の一時フォルダの `entry.ts` が `documentFromJson`・`documentFromMspdi`・`recountedPercentComplete`・`layoutFromSchedule` を呼び、`rolldown` で前の木と後の木から 1 つずつ束ねて交互に流した（束は木の外に置き、コミットしない）。

---

## 10. 利用者の実物の手順

起動の見本と大きな見本（`sample-large-erp-program`）を開き、完了率と実績の長さ（プロパティの欄）が前と同じか。休日の設定で 1 日を休みにして確定し、完了率が前と同じように数え直されるか。開くときと確定のときの引っかかりが前より増えていないか。
