# CR-825 —— 「端の日」の規則を 1 か所へ寄せ、配置と変更前の予定の輪郭が同じ 1 本を読む

> 起草の状態: 当てた（2026-10-23、枝 `ruling-jobs-1023`、`e498dc9ff` の上）。裁定から出た実装の仕事の子セッションが、起草・仕様・`src`・台帳を同じ作業木で行い、試験は仕様だけを読む別のサブエージェントが書いた。
> ID の帯: 調整役から番号 `CR-825`、台帳 `DFC-3457`〜`DFC-3462`、性能の測り待ち `264` を受けた。使ったのは `CR-825`・`264` だけ（新しい台帳の行は要らなかったので `DFC-3457`〜`DFC-3462` は使わない）。新しい行 ID は無い。変更履歴の版は書いた時刻（`10-versions.md` の 1 節）。`e498dc9ff` の木で `CR-825` を名乗る変更要求は 0 件だった（9 節）。
> 当てるもの: `JDG-3113`（`DFC-3430`、棚卸し `docs/review/cleanup-inventory-2026-10-22.md` の C1、計画 uid 115）—— 端の日の規則を 1 か所へ寄せ、外へ出る新しい名は 表 T-064 に行を足して仕様が名指す。検査 26b の基準線は上げない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`e498dc9ff`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| 同じ規則が別名で 2 か所に在る | `schedule-layout.ts` の `edgeOf`（端を日の通し番号で）と `schedule-geometry.ts` の `baselineEdgeXOf`（端を位置で）。どちらも「時刻を表示するときは側で読んだ瞬間、しないときは開始の側はその日、終了の側は `finishSideDayFrom` の日の翌日」を、同じ 3 つの枝で書く | 規則を `calendar-day.ts` の `edgeInstantOf` 1 本にし、2 か所はそれを呼ぶ（X-1・X-2） |
| 寄せると検査 26b が赤になる | W2 の報告（123 → 126）。寄せた先が 1 つのコンポーネントの中の非公開の名で、もう一方がそれを越えて読んだため | 置き場を両方が既に読む `Schedule`（`finishSideDayFrom` と同じ `calendar-day.ts`）にし、名を 表 T-064 の `PI-1` に足す（X-3）。26b は 123 のまま、新 0（7 節） |
| 振る舞いは変わらない | 配置: 端は前と同じ数（瞬間 ÷ 1 日の分、整数の日は `serial × 1440 ÷ 1440` で同じ数に戻る）。輪郭: 時刻を表示するときと開始の側は前と同じ式。終了の側は前の「その日の位置 + 1 日の幅」から「翌日の始まりの位置」に変わる | 終了の側の右端は、予定バーと同じ式（`originX + (翌日 − 起点) × pxPerDay`）になった。違いは浮動小数の末尾の 1 桁までで、表 T-339 の `BL-2`（予定バーと同じ日付から位置への換算）にむしろ合う（X-c） |

### 0.2 裁定の鎖（`rulings.md` を「`DFC-3430`」「`edgeOf`」「`baselineEdgeXOf`」「端の日」で引いた）

`JDG-3113`（2026-10-23）に従う。覆す裁定は無い。`DFC-2766`・`DFC-2648` は本書と同じ所を名指すが、どちらも本書の外（決まれば `edgeInstantOf` の 1 か所を直せばよくなる）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-2` ／ `GL-001` —— 変更前の予定の輪郭は予定バーに重ねて「どれだけ動いたか」を 1 枚で読ませる（表 T-339 の `BL-2`）。端の規則が 2 か所にあると、片方だけ直ったときに輪郭と予定バーの端がずれ、動いていない予定が動いたように読める。1 本にすれば、ずれる道が無くなる。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`・`R2.7`（同じことを 2 か所で言わない、DRY）—— 規則は `edgeInstantOf` の 1 か所。`edgeOf` は消え、`baselineEdgeXOf` は位置への換算だけを持つ。
- `R2.22`（補助関数の前に公開の入口）—— `docs/review/public-entry-index.md` と `src/` を「edge」「finishSideDay」で引いた。端の規則を持つ公開の入口は無く、`finishSideDayFrom` が最も近い。だから同じ所に置き、`PI-1` に 1 つ足した（規則 02 の 1 の手）。
- `R2.1`（名は指すものを言う）—— `edgeInstantOf` は「端の瞬間」を返す。位置ではなく瞬間（分）を返すので、配置（日の通し番号）と輪郭（位置）がそれぞれの換算を当てる（X-b）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 置き場は `src/entity/document-model/schedule/calendar-day.ts` | `JDG-3113` の候補。両方の呼び手（`ScheduleLayout`・`ScheduleGeometry`）は `Schedule` を既に読み、`Schedule` は両方より下の層（`documentModel`）。`finishSideDayFrom` と隣り合い、増える名は 1 つ | 無い |
| X-b | 答えは瞬間（分）にする（日の通し番号でも位置でもない） | 瞬間なら、配置は `÷ MINUTES_PER_CALENDAR_DAY` で前と同じ数に戻り、輪郭は今ある `xOfInstant`（予定バーの時刻の換算）にそのまま渡せる。位置を返すと `Schedule` が配置の型を知ることになり、層が逆になる | 配置は 1 回の割り算が増える（端ごとの覚えの中なので回数は前と同じ） |
| X-c | 輪郭の終了の側の右端は、予定バーと同じ式にする | 0.1 の 3 行目。`BL-2` は予定バーと同じ換算を求める | 前の式と浮動小数の末尾の 1 桁だけ違いうる。見た目は変わらない |
| X-d | 端の側の型は `'start' \| 'finish'` の字で書く（`DateTimeSide` を読まない） | `DateTimeSide` は `working-calendar.ts` に在り、`calendar-day.ts` はそれより下（`working-calendar.ts` が `calendar-day.ts` を読む）。前の `edgeOf` も同じ字で書いていた | 無い |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| 予定バー・実績バー・期限の端（配置） | `schedule-layout.ts` の `edgeOf` が規則を持つ | `edgeInstantOf` を呼ぶ。答えは同じ |
| 変更前の予定の輪郭の端 | `schedule-geometry.ts` の `baselineEdgeXOf` が同じ規則を写して持つ | `edgeInstantOf` の答えを `xOfInstant` で位置にする。右端は予定バーと同じ式 |

画面・文書・書き出しの見た目と中身は変わらない。

---

## 2. 新しい識別子

無い（行 ID は取らない）。新しい名前は 表 T-064 のメンバ 1 つ（`PI-1` の `edgeInstantOf`）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `schedule-layout.ts` の非公開の `edgeOf` | 消す。`dayReaderFor` の `edge` が `edgeInstantOf` を呼ぶ |
| `schedule-geometry.ts` の `baselineEdgeXOf` の 3 つの枝 | 消す。`edgeInstantOf` と `xOfInstant` の 2 行になる |

---

## 4. 書き直す所

### X-1 —— 端の瞬間（`src/entity/document-model/schedule/calendar-day.ts`）

`edgeInstantOf(text, side, instantAt, isTimeOfDayVisible, dayAt)` は、時刻を表示するときは `instantAt()` を、表示しないときは開始の側で `serial(その日) × 1440`、終了の側で `(serial(finishSideDayFrom の日) + 1) × 1440` を返す。字が読めなければ無い。`schedule.ts` が公開する。

### X-2 —— 2 つの呼び手

- `schedule-layout.ts`: `dayReaderFor` の `edge` は `edgeInstantOf` の答えを `MINUTES_PER_CALENDAR_DAY` で割る（端ごとの覚えはそのまま）。
- `schedule-geometry.ts`: `baselineEdgeXOf` は `edgeInstantOf` の答えを `xOfInstant` で位置にする。

### X-3 —— 表 T-064 の `PI-1`（`docs/spec/_source/published-entries.json`）

`finishSideDayFrom` の後に 1 つ足す:

```
／ `edgeInstantOf`
日程表に描く端（予定バー・実績バーの左右の端、期限、変更前の予定の輪郭の左右の端）が時間軸に立つ瞬間（分）。
時刻を表示するときは、日時の字をその側で読んだ瞬間（`FR-158`）。
表示しないときは丸 1 日の列で、開始の側はその日の始まり、終了の側は `finishSideDayFrom` の日の翌暦日の始まり —— `00:00` の終わりは前の日を閉じる（`FR-054`、`05-07-design.md` の 表 T-069 の `RV-1`・`RV-6`）。
配置（`ScheduleLayout`）と変更前の予定の輪郭（`ScheduleGeometry`、表 T-339 の `BL-2`）が同じ 1 本を読むために公開した —— 端の規則を 2 か所に持たない。
呼び方: 日時の字（無いこともある）、端の側（開始か終了）、側で読んだ瞬間を返す読み手（時刻を表示するときだけ呼ぶ）、時刻を表示するか、字から日を返す読み手（`dayOf` と同じ答え）の順に渡す。
字が読めなければ無い
```

### 4.1 生成物

`npm run gen` が `docs/spec/_assets/tbl-published-entries.md`・`docs/review/public-entry-index.md`・`docs/spec/_source/source-relations.json` と、それを描く `view-read`・`view-write` の図を書いた（手で直していない）。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えたもの |
|---|---|
| `src/entity/document-model/schedule/calendar-day.ts` | `edgeInstantOf`（新） |
| `src/entity/document-model/schedule/schedule.ts` | `edgeInstantOf` を公開した（表 T-064 の `PI-1`） |
| `src/entity/layout-engine/schedule-layout/schedule-layout.ts` | `edgeOf` を消し、`edgeInstantOf` を呼ぶ |
| `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts` | `baselineEdgeXOf` は `edgeInstantOf` と `xOfInstant` を呼ぶ |

試験: 新しい公開の名の試験 `tests/unit/cr-825-one-edge-rule-for-the-layout-and-the-baseline-outline.test.ts` は、仕様だけを読む別のサブエージェントが書いた（21 件、緑）。終了の側の `+ 1` を外して壊すと、この試験と `tests/contract/dfc-2765-bl-2-the-outline-uses-the-plan-bars-conversion.contract.test.ts` の 2 ファイルで 9 件が赤になった（戻してバイトの一致を `md5sum` で確かめた）。既存の配置・幾何・日の試験（`schedule-layout`・`schedule-geometry`・`calendar-day` を読む 106 ファイル、`RV-1`・`RV-6`・`BL-2`・`FR-158` を名指す 29 ファイル）は変えずに通る。

毎フレームの経路（規則 04 の 5 節）: `src/entity/layout-engine/**` に触れたので `perf-pending` の 264 を足した。

---

## 6. グラフ（`impact.py`）

- `PI-1` を指すのは要求 0 件、参照 6 箇所（`05-07-design.md` の 5.3・5.5・6.1、`tbl-agent-api-members.md` の 2 箇所、生成の表）。本書は辺を足さず、消さない。

---

## 7. 数（実測）

- 要求 ±0、表 ±0、表の行 ±0、`（MUST）` ±0、`（MUST NOT）` ±0。表 T-064 のメンバ 528 → 529（`PI-1` は 141 → 142。`published-entries.json` の `members` の `name` を数えた）。
- 検査 26b: 529 のメンバが入口から出る。部品をまたぐ名 613 のうち 表 T-064 が名指さないのは 123（基準線のまま、新 0）。
- 検査 45（同じ式の繰り返し）: `src/` は 74 群のまま。

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `defects.md` | `DFC-3430` を `実測待ち`（当てた。実物の手順は 10 節） |
| `perf-pending.md` | `264` |
| `changelog.md` | 本書の 1 行（書いた時刻の版） |

---

## 9. 測り方の再現

```
git grep -c "CR-825" e498dc9ff -- change-request docs src tests                    # 0 件
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-published-members.py
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-repeated-expressions.py
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py PI-1
```

メンバの数は `published-entries.json` を読み、`members` の `name` を `HEAD` と作業木で数えた。

---

## 10. 利用者の実物の手順

変更前の予定を持つ文書を開き、変更前の予定の表示を入れる。時刻を表示しない・するの両方で、予定を動かしていないタスクの輪郭が予定バーにぴったり重なるか。`finish` が `00:00` のタスクで、輪郭も予定バーも前の日で閉じるか。
