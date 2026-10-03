# CR-649 —— 暦の編集が例外日の時刻を揃え、`Duration` は終わりの日を数え、開く面は「ファイルを開く」と言う

> 起草の状態: 当てた（2026-10-04、`eac80d83` の上）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-649` と台帳の帯 `DFC-1945`〜`DFC-1949` は調整役から受けた。帯の行は `DFC-1945` を 1 つ使った（12 節）。仕様の新しい識別子（表・行 ID・接頭辞・設定の行・要求）は取らない（2 節）。
> 閉じるもの: `DFC-1836`（`JDG-1220` ／ `JDG-1221`）、`DFC-1837`（`JDG-1222`）、`DFC-1324` の語（`JDG-1164` ／ `JDG-1223`）。利用者の実測で `DFC-1722` と `DFC-1799` を `実測済` にした（12 節）。
> ⛔ 触れないもの: `DFC-1870`〜`DFC-1873`・`JDG-1240` ／ `JDG-1241` ／ `JDG-367`（年をまたぐ文書の日付の書き方。利用者が保留にした）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md`。全文は同書を見よ）

| 裁定 | 逐語（抜粋） | 本書での扱い |
|---|---|---|
| `JDG-1221` | 「editCalendar が揃える (推奨)」（`JDG-1220` で規則 07 に照らして問い直した答え） | `FR-057` の 表 T-350 の前文に 3 文、`CM-39`（表 T-108）に指す 1 文（E-01）。`UF-16` に 1 文（E-05）。コードは 5 節 |
| `JDG-1222` | 「終わりの日を含める (推奨)」 | `DV-8`（表 T-059、原稿は `erd.json`）を書き直す（E-02）。`EX-12` に理由の 1 文（E-03）。`UF-128` に 1 文（E-05） |
| `JDG-1164` | 「案Aでいい」 —— 見出し「ファイルを開く」、3 つの説明を替える | 辞書の `surfaces` の `Open Chooser` の ja と、`IC-71`〜`IC-73` の `hint`（E-04） |
| `JDG-1223` | 「Open File (推奨)」 | 同じ見出しの en（E-04） |

### 0.2 ⛔ 当てる前に確かめた 3 つ

**問い 1 —— 例外日の「動いた」は行で見るか、列で見るか。⇒ 列で見る。**

- `JDG-1221` は「足した行と日の動いた行だけを揃え、日で比べて同じ取り込みの行は元の字面を保つ」と言う。`WT-10` は値（列）について「取り込んだまま編集していない値は元の字面」と言う。
- 終わりの日だけを動かした取り込みの行で、行ごと揃えると、動いていない `fromDate` の取り込んだ時刻（例 `T08:00:00`）を `00:00:00` へ書き換える —— `WT-10` に反する。⇒ 列ごとに比べた（決定 1）。行で揃えても列で揃えても、足した行と、両方の日が動いた行では答えが同じである。
- 元の行は同じ `ordinal`（`AT-77`）の行とした。`isSameException`（`edit-calendar.ts`）が既に `ordinal` で行を突き合わせている。

**問い 2 —— `DV-8` を数える所をどこに 1 つ置くか。⇒ `Entity` の `working-calendar.ts`（`UF-128`）。**

- 数えていた所は 2 つ —— `mspdi-codec.ts` の `writtenConstraintOfGrs`（`GRS` の文書の書き出し、`Adapter`）と `task-plan-actual.ts` の `datedPlanOf`（取り込んだ文書の日付の編集、`UseCase`）。どちらも `workingDaysBetween(within, start, finish)`（半開）× 1 日の分数で、1 日の分数の空の扱い（`S-128`）も 2 つに写してあった。
- 両方が既に読む `Entity` に、実績の長さ `actualLengthOf`（`DV-11`）が在る。同じ並びに `plannedDurationMinutesOf` を足し、2 つの呼び口がそれを呼ぶ（`R2.21`）。1 日の分数は既存の `minutesPerWorkingDayOf` を使う（`task-plan-actual.ts` の私的な写し `minutesPerDayOf` は消した）。
- 公開名を 表 T-064 の `Schedule` の項に足した（`published-entries.json`）。辺は増えない —— 2 つの呼び口はもとから `Schedule` を読む。

**問い 3 —— `OP-16` を直すか。⇒ 直さない。**

- `OP-16` は見出しの語を名指さず「見出しの語を左に」と言い、説明は「`EZ-2` が出すのと同じ語」と辞書を指す。語を持つのは辞書だけである（`FR-038`）。仕様の中で「ファイルの開き方」と綴っていたのは辞書の 1 か所だけだった（`grep`）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-1` の `GL-004`**（成果物が構造化データである）。書き出した `Duration` が `Start` ／ `Finish` と同じ長さを言い、例外日の時刻が交換相手の例と同じになる —— 交換相手が読んで食い違わない。開く面の語は、利用者が実物で使って求めた語である。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R2.21`（1 つの仕事は 1 か所）** —— `DV-8` の数え方は 2 か所 → 1 か所。例外日の時刻を揃える所は `editCalendar` の 1 か所（発行する者ごとに書かない）。⚠️ 同じ調べで、`EX-9` の綴り（`durationOfMinutes` と `durationText`）が 2 か所に残ることを見つけた —— 本書の範囲の外なので `DFC-1945` に起こした。
- **`R3.4`（境界）** —— `DV-8` は閉区間の数えである。終わりの日の次の日を `finishExclusive` と名づけ、半開の `workingDaysBetween` へ渡した（名で閉と半開を分けた）。
- **`R2.10` ／ `R2.16`（SoC ／ CA）** —— 保存の字の形（時刻）を画面と取次へ漏らさない（`JDG-1221` の理由）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 例外日は列ごとに比べて揃える | 問い 1 | — |
| 決定 2 | 日の読めない字はそのまま持つ（時刻を付けない） | 日を発明しない | 揃わない字が残りうる —— いまそれを作る道は無い |
| 決定 3 | 数える所は `Entity` の `plannedDurationMinutesOf` | 問い 2 | 公開名が 1 つ増えた |
| 決定 4 | 3 つの説明の英語 | 日本語の語（`JDG-1164`）の訳。「what was read」を「the file being opened」へ | 英語は利用者の逐語ではない |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 要求と命令 | `docs/spec/01-04-requirements.md` の `FR-057`（表 T-350 の前文）、`docs/spec/_assets/tbl-glossary.md` の 表 T-108 の `CM-39` | E-01 |
| 書き出す値 | `docs/spec/_source/erd.json` の `Task.duration`（生成: `_assets/fig-erd-detail.md` の 表 T-059 の `DV-8`） | E-02 |
| 書き出しの規約 | `docs/spec/01-04-requirements.md` の 表 T-033 の `EX-12` | E-03 |
| 語 | `docs/spec/_source/display-words.json` の `surfaces`（`Open Chooser`）と `IC-71`〜`IC-73` の `hint` | E-04 |
| ユニット・公開名 | `docs/spec/05-07-design.md` の 表 T-075 の `UF-16`・`UF-128`、`docs/spec/_source/published-entries.json`（`plannedDurationMinutesOf`） | E-05 |
| コード | `src/entity/document-model/schedule/working-calendar.ts`・`schedule.ts`、`src/use-case/edit-document/edit-calendar.ts`・`task-plan-actual.ts`、`src/adapter/document-codec/mspdi-codec.ts` | 5 節 |

**数**: `FR-057` に `（MUST）` 2、文 3。`CM-39` に文 1（規則は持たない）。`DV-8` の升 1（文 4）。`EX-12` に文 1。辞書の語 8（見出し 2、説明 6）。`UF-16`・`UF-128` に文 1 ずつ。表の行 0、設定の行 0、要求 0。

---

## 2. 新しい識別子

仕様の行 ID は 1 つも取らない。表 T-064 の `Schedule` の項に公開名 `plannedDurationMinutesOf` を足した。コードに私的な関数 `stampedExceptions` ／ `writtenDayText`（`edit-calendar.ts`）を足した。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`eac80d83`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `DV-8` の「`finish` − `start` と暦」 | `erd.json` | 両端の日を含めた稼働日の数 × 1 日の分数、マイルストーンは `PT0H0M0S` | E-02 |
| 見出し「ファイルの開き方」／「How to Open the File」 | `display-words.json` | 「ファイルを開く」／「Open File」 | E-04 |
| `IC-71`〜`IC-73` の説明「読んだ内容で現在の文書を置き換える」「読んだ内容を現在の文書へ追加する」「読んだ内容を変更前の予定として重ねる」と英語 3 つ | `display-words.json` | `JDG-1164` の 3 文と英語 3 つ | E-04 |
| `workingDaysBetween(…, start, finish)` × 1 日の分数（2 か所） | `mspdi-codec.ts` の `writtenConstraintOfGrs`、`task-plan-actual.ts` の `datedPlanOf` | `plannedDurationMinutesOf` | 5 節 |
| 私的な `minutesPerDayOf` | `task-plan-actual.ts` | `minutesPerWorkingDayOf`（既存） | 5 節 |
| 受けた例外日の行をそのまま持つこと | `edit-calendar.ts` の `withExceptions` | `stampedExceptions` | 5 節 |
| `it.todo` 2 つ（`STOP DFC-1836` ／ `STOP DFC-1837`） | `tests/unit/cr-646-edits-write-side-times.test.ts` | `tests/unit/cr-649-…` | 9 節 |

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（`FR-057` と `CM-39`）—— `FR-057` の 表 T-350 の前文に: 例外日の `fromDate` ／ `toDate` は、`CM-39` を受けて文書へ書く側が、足した行と日の動いた列だけを `WT-6` ／ `WT-7` の時刻で書く（MUST）。元の行（同じ `ordinal`）と日で比べて同じ列は元の字面を保つ（MUST、`WT-10`）。書く側の 1 か所にする理由（命令を出す側が時刻を知らずに済む）。`CM-39` には、時刻を揃えるのは書く側であり規則は `FR-057` が持つ、と指す 1 文だけを置いた。⚠️ はじめ `CM-39` の升に MUST を書いたら、検査 12（名の表に規則を置かない）が赤くなった —— 規則は要求に置いた。
- **E-02**（`DV-8`）—— 数え方、マイルストーン、終わりの日を含める理由（交換相手の公式の例: 水曜〜木曜 = `PT16H0M0S`）、`FR-054` と矛盾しない理由。「人が編集していないタスクは受け取った値をそのまま返す」は残した。
- **E-03**（`EX-12`）—— 「⚠️ `DV-8` は終わりの日も数えに入れる」—— 日の差で数えると、書き出した `Start` ／ `Finish` から交換相手が読む長さより 1 日短くなる理由。
- **E-04**（辞書）—— 3 節の表のとおり。
- **E-05**（設計）—— `UF-128` に「予定の長さ（`DV-8`）を数えるのも本ユニットだけである」。`UF-16` に「例外日の日付の時刻を揃えるのは本ユニットだけである（`CM-39`）」。`plannedDurationMinutesOf` の公開名の注。

当てた後に打ったもの: `npm run gen` → `python docs/spec/_source/build.py` → `npm run gen:check` → `npm run typecheck` → `vitest`（機械の錠の下） → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。

---

## 5. 継ぎ目

```
SEAM (CR-649)
- Entity (UF-128, working-calendar.ts, published by schedule.ts as a Schedule member of T-064):
    plannedDurationMinutesOf(within, task, project): number | null
      null when either date has no day; 0 for a milestone; otherwise the working days of
      [start, finish] (both ends) x minutesPerWorkingDayOf(project).
- Adapter (UF-36, mspdi-codec.ts): writtenConstraintOfGrs writes Duration from it (grs documents).
- Use case (UF-74, task-plan-actual.ts): datedPlanOf carries Duration / ManualDuration from it (EX-12).
- Use case (UF-16, edit-calendar.ts): withExceptions -> stampedExceptions(held, incoming):
    a column whose day equals the held row's (same ordinal) keeps the held text (WT-10);
    otherwise textOfDayStart / textOfDayEnd of its day (WT-6 / WT-7); an unreadable day keeps its text.
```

---

## 6. グラフ（`eac80d83`）

- `impact.py CM-39`: 要求 1 件（`FR-088`）・参照 6 箇所 —— `FR-088` は例外日を足し・直し・消せることと下書き（`WC-6`）を言い、時刻を言わない。本書の文と食い違わない。
- `impact.py DV-8`: 要求 1 件（`FR-057`）・参照 3 箇所 —— `EX-12`（E-03）と `UF-128`（E-05）と公開名の注。
- `impact.py EX-12`: 要求 1 件・参照 2 箇所。
- `impact.py IC-71`: 要求 2 件・参照 6 箇所 —— どれも行を名指すだけで、語を写していない。

---

## 7. 数の予測と測った数

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| 書き出す `Duration`（`MinutesPerDay` 空、`S-128` = 480） | 同じ日の 08:00〜17:00: `PT0H0M0S` → `PT8H0M0S`。月〜金: `PT32H0M0S` → `PT40H0M0S`。水〜木: `PT8H0M0S` → `PT16H0M0S`。マイルストーン: `PT0H0M0S` のまま | 新しい試験（9 節）。前の値は壊した写しで測った |
| 見本 6 本の `Duration`（葉で、マイルストーンでないタスク） | 大 198 のうち 177 が両端を含む数と、12 が半開の数と、9 がどちらとも合わない ／ 中 107 のうち 103 ／ 1 ／ 3 ／ 小 34 のうち 34 ／ 0 ／ 0（en と ja は同じ数） | 13 節の台本。見本は取り込む文書なので、`Duration` は編集しない限り受け取った値のまま戻る（`DV-8` の後半）—— 見本の数は変わらない |
| `tests/contract/cr-618-…`（見本がふつうに管理された日程に見える） | 緑 → 緑 | `vitest` |
| `npm run typecheck` の誤り | 0 → 0 | 同 |
| 新しい試験 | 21 件（`tests/unit/cr-649-…`）。壊した写し 4 つで、半開の数え 6 件、マイルストーンを外して 1 件、例外日を揃えないで 5 件、辞書の英語を戻して 1 件が赤くなった | 13 節 |
| 古い振る舞いを留めていた試験 | 2 ファイル —— `cr-605-cm-39-carries-exceptions-and-makes-a-calendar`（足す行の `toDate` を `T00:00:00` で送り、そのまま返ると読んでいた —— 行の終わりの日を `T23:59:00` にした）、`cr-429-ex-11-ex-12-a-dated-task-is-pinned`（`DV-8` の旧い文「`finish` − `start` と暦。」を引いていた —— 新しい文に） | 同 |
| 自動試験の失敗（`vitest` フル） | base 19（30535 件）→ 6（30554 件）。新しい失敗は上の `cr-429` の 1 件だけで、直した。残る 5 件は base にも在る（`cr-430` の表 PK 1、`cr-586` 2、`display-words.contract` 1、`cr-605-the-non-working-day-shade` 1） | 13 節 |
| 検査 37（表の行と辞書の語の指紋） | `IC-71`〜`IC-73` の 3 つが動いた —— 表 T-109 の「読んだ内容で…」と新しい説明を読み合わせ、同じことを言うので `--write-baseline` で書き直した（`dictionary-table-pairing.txt` の 3 行） | `check.sh` |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | 仕様 ＋ 生成物 ＋ コード ＋ 試験 ＋ 台帳 | E-01〜E-05、5 節 | 本書の体 |

⚠️ **毎フレームの経路**: `src/adapter/screen-renderer/display-words.json`（生成。見出し 2 と説明 6 の字面）が規則 04 の 5 節の `src/adapter/screen-renderer/**` に入るので、`perf-pending.md` に 1 行足した。手で直したコードに毎フレームの経路は無い（書き出し、日付の編集、暦の編集）。

---

## 9. 仕様の外で直すもの

- `tests/unit/cr-605-…`（7 節）。
- `tests/unit/cr-646-edits-write-side-times.test.ts` の `it.todo` 2 つを消した —— 本書の試験が同じ 2 つを持つ。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 年をまたぐ文書の日付の書き方（`DFC-1871` ほか）には触れない —— 利用者の保留。
- `FR-012` の予定の長さ（完了率の分母、半開）は変えない —— 別の数である。`plannedDurationMinutesOf` の `WHY:` に書いた。
- 休日の面の下書き（`WC-6`）を作らない —— `src` にまだ無い（`DFC-1836` の記述）。
- `EX-9` の綴りの 2 つの写しは寄せない（`DFC-1945`）。

---

## 11. 利用者に問うこと

本書からは問わない。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1221` ／ `JDG-1222` ／ `JDG-1223` ／ `JDG-1164` | 本書の裁定 | 「適用済」。着地先に `CM-39`・`DV-8`・`EX-12`・辞書の `surfaces` と `IC-71`〜`IC-73` |
| `DFC-1836` ／ `DFC-1837` | 例外日の時刻 ／ `Duration` | `仕様待ち` → `実測待ち` |
| `DFC-1324` | 開く面 | `実装待ち` → `実測待ち`（並び `OP-16` は `a5c9ee11` が描いた。語は本書） |
| `DFC-1722` | 保存の種類が `*.html` だけ | `実装待ち` → `実測済`（利用者の実測、根の dist `6d5c17f9`、直しは `70cfadb8`） |
| `DFC-1799` | 3 年の見本 | `実測待ち` → `実測済`（利用者の実測: 誤り 0 で開いて描けた。スキーマの照合を測り直した: 0 件） |
| `DFC-1945` | `EX-9` の綴りが 2 か所 | 起こした（`実装待ち`） |
| `DFC-1946`〜`DFC-1949` | 帯 | 使わなかった |
| `perf-pending.md` | 生成された辞書 | 1 行足した |
| `docs/development-records/changelog.md` | 本書 | 1 行足した |

---

## 13. 測り方の再現

```
# tree: eac80d83 + this CR.
npm run gen && python docs/spec/_source/build.py && npm run gen:check   # 0 drift
npm run typecheck                                                        # 0 errors before and after
node tools/gate/gate-queue.mjs run -- node ../../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<after.json>

# break tests: copy src/ tests/ docs/spec/ and the configs into the scratchpad, break one piece, run
#   tests/unit/cr-649-exception-times-duration-and-the-open-chooser-words.test.ts there:
#   halfopen (finishInclusive in place of finishExclusive) 6 red; nomilestone 1; nostamp 5; words 1.

# the samples: for each sample-schedule/*.xml, leaf non-milestone tasks, compare Duration with
#   (working days of [Start, Finish]) x MinutesPerDay and with (working days of [Start, Finish)) x MinutesPerDay,
#   on the project calendar's WeekDays and non-recurring Exceptions.

# DFC-1799: Draft202012Validator(docs/spec/_source/grs-document.schema.json) over
#   "sample-schedule/Three-Year Product Plan.json" (jsonschema 4.26.0)    # 0 errors

PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py CM-39 DV-8 EX-12 IC-71
```
