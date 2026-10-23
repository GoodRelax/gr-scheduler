# CR-831 —— 受け入れる日付の範囲を、MS Project の扱える年（1984〜2149）に合わせる

> 起草の状態: 当てた（2026-10-24、枝 `bug-date-range`、`265dfcb86` の上）。計画 uid 206（日付の範囲）の子セッションが、起草・仕様・`src`・台帳を同じ作業木で行い、試験は仕様だけを読む別のサブエージェントが書いた。
> ID の帯: 調整役から `CR-831`・`DFC-3488`〜`DFC-3492`・`JDG-3139`〜`JDG-3143`・`PND-942`〜`PND-943`・性能の測り待ち `270` を受けた。使ったのは `CR-831`・`DFC-3488`〜`DFC-3491`・`JDG-3139`・`270`。新しい行 ID は無い。変更履歴の版は書いた時刻（`10-versions.md` の 1 節）。`265dfcb86` の木で `CR-831` を名乗る変更要求は 0 件だった（9 節）。
> 当てるもの: `JDG-3139`（`DFC-3490`）。同じ枝で、仕様が既に求めていてコードが守っていなかった 4 つ（`DFC-3488`・`DFC-3489`・`DFC-3491`・`DFC-1056`）も直した —— 仕様は変えない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`265dfcb86`）

引継書の「日付の範囲」（2026-10-18 の読むだけの調べ）を、試験で入口ごとに確かめた。

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| 範囲 `S-119`／`S-120`（1970-01-01〜2200-12-31）が MS Project の範囲より広い | Microsoft Learn「Year object (Project)」（`https://learn.microsoft.com/en-us/office/vba/api/project.year`）の Remarks が、Project の年は 1984 年に始まり 2149 年に終わると言う（以前の版は 1984〜2049） | 正しい。範囲を 1984-01-01〜2149-12-31 に狭めた（`JDG-3139`、X-1） |
| `mspdi-codec.ts` に範囲の確かめが無く、範囲の外の日付が出力に出る | `mspdiFromDocument` に `Task.start` 1975-03-03・`finish` 2160-01-05・`statusDate` 1971-01-01 の文書を渡すと、`<StartDate>`・`<Start>`・`<ConstraintDate>` に 1975、`<Finish>`・`<FinishDate>` に 2160、`<StatusDate>` に 1971 をそのまま書き、知らせは 0 件 | 正しい。MS Project が実際に開けないかは未検証（手元に無い）。範囲を狭めたので、文書に範囲の外の日付が入らなくなる |
| `calendar-day.ts` の `Date.UTC` が年 0〜99 を 1900 年代に写す（範囲の確かめを通らない道があれば危ない） | 行番号は `:149` ではなく `serial`（`:166`）と `dayOf`（`:23`）。入口ごと: GRS JSON・MSPDI を開く道は年を字のまま比べて拒む（`compareDays`）。Agent API の `setTaskPlanDates`・`setTaskDeadline`・`shiftScheduleToStartDate` も拒む。⚠️ **画面の日付の欄に時刻つきで `0075-03-03 10:00` と打つと、`field-commit.ts` の `settledDay` が `instantOf` → `textOfInstant` で書き直し、`1975-03-03T10:00:00` として入る** | 道があった（`DFC-3489`）。`serial` と `dayOf` が年を書いたとおりに読むよう直した（X-3） |
| 2038 年型の溢れは無い | 時刻を 32 ビットに詰める所は見つからない（日は日の通し番号と分で `number`） | そのまま |
| （新しく見つけた）範囲の外を受ける命令 | `setStatusDate`（`CM-3`）が範囲を見ない（`DFC-3488`）。注記の 4 命令も見ない（`DFC-1056`、既知） | 直した（X-4・X-5） |
| （試験が見つけた）GRS JSON を開く道は範囲の外を必ず `IV-14` で断る | 仕様だけを読む試験が赤: start `0075-03-03`・finish 2026-04-10 の `Task` で、`json-codec.ts` の数え直しが検証の前に `DaySpanTooWide` を投げる（`DFC-3491`）。1500 年のような日では `265dfcb86` でも投げた。X-3 と範囲を狭めたことが、投げる日を増やした | 直した（X-6） |

### 0.2 裁定の鎖（`rulings.md`・`pending-decisions.md`・`defects.md` を「日付の範囲」「importMinDate」「importMaxDate」「S-119」「S-120」「1984」「2149」で引いた）

範囲の値について覆す裁定は 0 件。`DFC-1056` は「仕様が決めている、① を推奨」の `実装待ち` だったので当てた。`DFC-1061`（翻訳器の `compareDay` の 0〜99 年）は `CR-579` の写しの整理に残る —— どの入口も 1984 年より前を文書に入れないので、そこへ 0〜99 年は届かない。`JDG-78`（異常系の後回し）に当たるものは本書で扱っていない —— 本書の直しは、壊れた入力の扱い（告げ方・自動の直し）ではなく、`IV-14` が既に拒むと言っている日付を拒むことと、日付の読み違いである。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-1` ／ `GL-004`（描いた日程表を構造化データとして出し入れし、外部 WBS マスタとの間を情報を落とさずに往復できる）と、それを受ける `FR-021` の前提 —— 書き出したファイルを交換相手が読めること。GRS が受ける日付と、相手に渡せる日付を同じ範囲にすれば、書き出しで困る日付が文書に入る道が無くなる。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 注記と基準日の範囲の確かめは、新しい関数を作らず、同じ部品の `edit-project.ts` が既に公開する `isAcceptedDay` を呼ぶ。
- `R2.1`（名は指すものを言う）—— 新しい名 `utcMillisecondsOf`（`calendar-day.ts` の中だけ）は「その日の UTC のミリ秒」を返す。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 書き出しで範囲を確かめ直さない（`S-119` の注に書いた） | `JDG-3139` の A は「入口で止める」案。入口のすべて（画面の入力・開く・`Agent API`）が範囲で拒むことを試験で押さえた | 入口に漏れがあれば書き出しに出る —— 本書が見つけた 2 つの漏れ（`DFC-3488`・`DFC-1056`）を閉じた |
| X-b | 年 0〜99 の読みだけ直し、`Date.UTC` の写し 3 つ（`DFC-1061`）は触らない | 写しの整理は `CR-579` の仕事。写しはどれも文書に入った日（範囲の中）しか受けない | 無い |
| X-c | `serial` の遅い道（`setUTCFullYear`）は年 0〜99 のときだけ通る | `serial` は毎フレームの配置から呼ばれる。範囲の中の年は前と同じ 1 回の `Date.UTC` | 比べ 2 つが増えるだけ |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| 受け入れる日付 | 1970-01-01〜2200-12-31 | 1984-01-01〜2149-12-31（範囲の外は今の断り方のまま: 開く道は `IV-14` で行を落とすか文書ごと拒む、画面は `RS-87`、命令は `IV-14` の拒否） |
| 書き出した MSPDI の日付 | 範囲の外も書けた | 文書に範囲の外の日付が無いので、出ない |
| 基準日・注記の日付の命令 | 範囲の外を受けた | `IV-14` で拒む |
| 画面で打った `0075-03-03 10:00` | `1975-03-03T10:00:00` として入った | 0075 のまま読まれ、範囲の外として拒まれる |

---

## 2. 新しい識別子

無い（行 ID は取らない）。表 T-064 のメンバも増えない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `S-119` の値 `1970-01-01` と 🔎（由来の記録が無い） | `1984-01-01`。由来と出典を注に書いたので 🔎 を外す |
| `S-120` の値 `2200-12-31` と 🔎、注の「231 年ぶん」 | `2149-12-31`。注は「166 年ぶん」 |
| 絵から GRS JSON を作る AI への指示の「1970-01-01 から 2200-12-31」 | 「1984-01-01 から 2149-12-31」 |
| `calendar-day.ts` の TRAP（`Date.UTC` は年 0〜99 を写す、直すなら両方） | 直した。WHY の注に置き換えた |

---

## 4. 書き直す所

### X-1 —— 表 T-214（`docs/spec/_source/settings.json`）

`S-119` の注:

```
これより前の日付を持つ入力を受け付けない。⭐ 本行と `S-120` の範囲は、MSPDI の交換相手 MS Project が扱える年（1984 年から 2149 年まで。Microsoft Learn「Year object (Project)」、`https://learn.microsoft.com/en-us/office/vba/api/project.year`）に合わせた —— 範囲を広くとると、書き出した MSPDI に相手の扱えない日付が載る。⭐ 書き出しは範囲を確かめ直さない —— どの入口（画面の入力・ファイルを開く・`Agent API`）も範囲の外の日付を文書に入れないので、書き出す日付は範囲に収まっている
```

`S-120` の注: 「これより後を受け付けない（範囲の由来は `S-119`）。**166 年ぶんの期間でも稼働日の数え上げが計算量に効く** （件数の上限とは別の経路）」

### X-2 —— 絵から GRS JSON を作る指示（`docs/spec/_source/image-to-grs-json-prompt.ja.md`／`.en.md`）

日付の範囲の 1 行を新しい値にした。

### X-3 —— 年 0〜99 の読み（`src/entity/document-model/schedule/calendar-day.ts`）

`utcMillisecondsOf(year, monthIndex, day)` を足し、`serial` と `dayOf` の確かめがそれを呼ぶ。年 0〜99 のときだけ `setUTCFullYear` で年を書いたとおりに置く。

### X-4 —— 基準日（`src/use-case/edit-document/edit-project.ts`）

`setStatusDate` は、日付であることに続けて `isAcceptedDay` で範囲を見て、外なら `IV-14` で拒む。

### X-5 —— 注記の日付（`src/use-case/edit-document/edit-annotation.ts`）

`anchorRefusals`（コメントボックスの日）と `rangeRefusals`（ハイライトボックスの左右の端）は、日付であることに続けて `isAcceptedDay` で範囲を見て、外なら `IV-14` で拒む（`DFC-1056` の ①）。

### X-6 —— 開くときの数え直し（`src/use-case/edit-document/percent-complete.ts`）

`recountedPercentComplete` は、`Task` ごとの数え直しが `DaySpanTooWide` を投げたら、その `Task` の値を持ったまま返す（`recountedOrHeld`）。その `Task` は続く取り込みの検証が `IV-14` で落として告げる（`FR-023`）。MSPDI のコーデックは前から捕まえている。

### 4.1 生成物

`npm run gen` が `docs/spec/_assets/tbl-settings.md`・`src/entity/document-model/document-settings/document-settings.ts`（`SETTINGS_CONSTANTS` の 2 値）・`src/adapter/screen-renderer/image-to-grs-json-prompt.json` を書いた（手で直していない）。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えたもの |
|---|---|
| `src/entity/document-model/schedule/calendar-day.ts` | `utcMillisecondsOf`（新、非公開）。`serial`・`dayOf` が呼ぶ |
| `src/use-case/edit-document/edit-project.ts` | `setStatusDate` の範囲の拒否 |
| `src/use-case/edit-document/edit-annotation.ts` | 注記の 4 命令の範囲の拒否 |
| `src/use-case/edit-document/percent-complete.ts` | 開くときの数え直しが範囲の外の期間で投げない（`recountedOrHeld`） |

試験: `tests/unit/cr-831-the-accepted-days-match-ms-project.test.ts` は、仕様だけを読む別のサブエージェントが書いた（47 件。初めは 1 件が赤 —— `DFC-3491` —— で、X-6 を当てて 47 件とも緑）。既存の試験のうち、古い境の日を名指していた 4 ファイル（`tests/unit/document-model.test.ts`・`tests/unit/fr-103-t-245-what-a-released-end-puts.test.ts`・`tests/contract/cr-757-cm-99-one-write-moves-every-date-but-the-calendar.test.ts`・`tests/contract/cr-757-fo-17-the-settings-row-asks-then-moves.test.ts`）の日を新しい境へ移した —— 確かめる中身は同じ（境の内で通る・外で拒む）。

毎フレームの経路（規則 04 の 5 節）: 生成物 `src/adapter/screen-renderer/image-to-grs-json-prompt.json` が描画の置き場に在るので `perf-pending` の 270 を足した。毎フレームの仕事は変わらない見込み（X-c）。

---

## 6. グラフ（`impact.py`）

- `S-119`・`S-120` を指すのは要求 0 件、参照は同じ表の中の互いの 1 箇所だけ（本書が足した）。表 T-214 を範囲として指す行（`IV-14`・`BS-4`・`WH-10`・`RS-87` ほか）は値を名指さないので、字は変わらない。

---

## 7. 数（実測）

- 要求 ±0、表 ±0、表の行 ±0、`（MUST）` ±0、`（MUST NOT）` ±0。
- `tbl-settings.md` の 🔎: 181 → 179（`S-119`・`S-120`）。

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `rulings.md` | `JDG-3139`（逐語） |
| `defects.md` | `DFC-3488`・`DFC-3489`・`DFC-3490`・`DFC-3491` を足した（どれも `実測待ち`）。`DFC-1056` を `実装待ち` → `実測待ち` |
| `perf-pending.md` | `270` |
| `.claude/skills/spec-graph-check/twin-comments-baseline.txt` | `serial` と `dayOf` の「`Date.UTC` の 0〜99 年の写しを分け持つ」記録 1 件を外した —— X-3 で払った負債（検査 70 が外すことを求める）。基準線は下がる向きだけ |
| `changelog.md` | 本書の 1 行（書いた時刻の版） |

---

## 9. 測り方の再現

```
git grep -c "CR-831" 265dfcb86 -- change-request docs src tests                    # 0 件
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-119
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-120
git show HEAD:docs/spec/_assets/tbl-settings.md | grep -c "🔎"                      # 前
grep -c "🔎" docs/spec/_assets/tbl-settings.md                                       # 後
```

入口ごとの確かめは、使い捨ての試験（コミットしていない）で `documentFromJson`・`documentFromMspdi`・`validateImportedDocument`・`editDocument`・`commandFromFieldCommit`・`mspdiFromDocument` を直に呼んだ。

---

## 10. 利用者の実物の手順

1. 予定の開始に `1983-12-31` を打つ → 断られる。`1984-01-02` は入る。
2. プロパティパネルの予定の開始に `0075-03-03 10:00` と打つ → 断られる（1975 年にならない）。
3. 基準日の欄に `2150-01-01` を打つ → 断られる。
4. 1984 年より前の日付を持つ GRS JSON か MSPDI を開く → その行が落ちるか、文書が断られる。1500 年の日付を持つ GRS JSON でも止まらずに同じ扱いになる（`DFC-3491`）。
5. （MS Project が手元にあれば）2149 年 12 月の日付を持つ文書を MSPDI に書き出し、MS Project で開けるか。
