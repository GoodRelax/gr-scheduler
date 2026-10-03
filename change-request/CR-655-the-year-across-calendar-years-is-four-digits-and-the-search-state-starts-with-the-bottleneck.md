# CR-655 —— 暦年をまたぐ文書の年は 4 桁、検索の状態の列の先頭はボトルネック

> 起草の状態: 当てた（2026-10-04、`bf263de3` の上）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-655`・`PND-710` と台帳の帯 `DFC-2025`〜`DFC-2029` は調整役から受けた。帯から `DFC-2025` を使った。⚠️ `PND-711` は帯の外 —— 起こした日に `PND-711` を引いて 0 件だった。調整役が併合のときに番号を見直す（12 節）。
> 閉じるもの: `DFC-1871`（`JDG-1241`・`JDG-1242`）、`DFC-1870`（`JDG-634`）。
> ⛔ 触れないもの: カーソルの札と読み出し・検索の表・レポートの表の日の書き方（0 を詰める `yyyy/mm/dd`）、`[6/3]` の日に曜日を付けないこと（`FR-002`）、レポートの `DT-1` の順。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md`。全文は同書を見よ）

| 裁定 | 逐語（抜粋） | 本書での扱い |
|---|---|---|
| `JDG-1241` | 「暦年をまたぐ文書だけ yyyy/m/d とせよ。」 | `ND-5` の年を 4 桁に（E-01）、`TL-10` の例（E-02） |
| `JDG-1242` | 「yyyy/m/d（JDG-1241）」 —— `JDG-1091` の `yy/m/d` を覆し、ほかの面の `yyyy/mm/dd` との違いは見たうえで残した | 月と日は 0 を詰めない、ほかの面との違いを残す注（E-01） |
| `JDG-634` | 「→ボトルネックを足せ。 後で入る 順番は ボトルネック → 未着手 → 進行中 → 完了 → 中断・再開予定あり → 中断・再開日未定  とせよ。」 | `SV-8` の昇順の先頭（E-03）、`SQ-5` の値（E-04）。文は `CR-571` の決定 22・23 のまま（`DFC-1870` の対応案） |

監査（`docs/review/user-raised-items-audit-2026-10-04.md`）の読みに乗った: 年の件の連鎖は `JDG-367` → `JDG-874` → `JDG-1091` → `JDG-1241` → `JDG-1242` で、`JDG-367`・`JDG-874`・`JDG-1091` の状態の欄は監査が「覆された」の印を付け済みである。7.1 節の表が年の件の範囲を名称ラベルと説明の 2 つに限り、カーソル・レポート・検索の `yyyy/mm/dd` を残すと読んだ（`JDG-1242`）。⇒ 年の件で、監査の後もなお食い違う裁定は 0 だった。

### 0.2 ⛔ 当てる前に確かめた 3 つ

**問い 1 —— 年の件の「同じ件」はどこまでか。⇒ `ND-5` と `TL-10` の 2 行、コードは 2 か所。**

- 監査の 7.1 節（日付の年）・7.2 節・7.4 節の CK 行が名指すのは、`ND-5`・`TL-10`・`name-label.ts` の `YEAR_DIGITS`・`tooltips.ts` の `HINT_YEAR_DIGITS` だけである。
- `docs/spec` と `src` を「下 2 桁」「26/6/3」「yy/m/d」「YEAR_DIGITS」で引いた: 仕様 2 行・コード 2 か所・試験 2 本（`cr-386`・`cr-551`）で、ほかに無かった。

**問い 2 —— 検索の状態の列の順を、レポートの `DT-1` の順と揃えなければならないか。⇒ 裁定は決めていない。`PND-710` に起こし、決まっている分だけ当てた。**

- `JDG-634` は検索の状態の列に答え、レポートに触れない。`JDG-1224`〜`JDG-1226` はレポートの「ステータスの欄」（`DT-1`）に答え、検索に触れない —— `JDG-1226` の読みは「画面のマーカー（炎）は変わらない」とだけ言う。
- 2 つの表は値の集合が違う（検索は表 T-019a の 5 つにボトルネック、レポートは `DG-1`〜`DG-4`・疑義・確定）。共通の値はボトルネックだけで、その位置が違う（検索は先頭、レポートは 3 番目）。
- ⇒ 決まっているのは `JDG-634` の並びと値である。揃えるか（検索に `DG-1` と疑義を足し、疑義のあるボトルネックをボトルネックと出さない）は決まっていない —— `PND-710`（分類 `C`、推奨は揃えない）。

**問い 3 —— ボトルネックの集合をどこから取るか。⇒ 表示している診断の `bottlenecks`（`DG-2` の条件）を、殻が文書ごとに 1 度だけ集合にする。**

- `diagnoseDelay` の `bottlenecks` は `DG-2` の条件（`DQ-4` が `S-397` 以上・完了していない・`VO-3` の指摘を持たない）を満たすタスクである。`markerStates` の `DG-2` は `DG-1` に負けたタスクを落とすので使わない（`CR-571` の決定 22「`DG-1` がマーカーで勝つタスクでも出す」）。
- 診断は殻が文書ごとに 1 度だけ作って持つ（`delayDiagnosticsOf`）。集合も同じ所で作るので、フレームごとの割り当ては増えない。
- 診断を出していないあいだは集合を渡さない —— 判じた結果が無い（`CR-571` の決定 22）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-009`**（遅れのうち最優先で対処すべき行を見つける）—— 検索の状態の列で、ボトルネックが並べ替えの先頭に立つ。年の件は読み違えを減らす（`FR-002` の名称ラベル）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R2.21`（1 つの仕事は 1 か所）** —— 年の綴りは `name-label.ts` と `tooltips.ts` の 2 か所に写しがある（`DFC-1785` が既に持つ）。本書は両方を同じに直し、写しは解かない。状態の語と順は `search-table-filters.ts` の `searchTaskStateOf` 1 か所で決め、`search-panel.ts` はそれを読む。
- **`R5`（毎フレームの経路）** —— ボトルネックの集合は診断と同じく文書ごとに 1 度。行ごとに `Set.has` が 1 つ増えるだけ。
- **`R1.3`（同じ語を 2 か所に持たない）** —— 「ボトルネック」の語は辞書の `delayReportStatuses` の `DG-2` を引き、新しく足さない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 4 桁は `String(year).padStart(4, '0')` —— 1000 年より前の年も 4 字 | カーソルの `cursorDateText` と同じ形 | なし |
| 決定 2 | `ND-5` の「4 桁で書かない」の理由の文を、4 桁で書く理由（ほかの面と同じ年の書き方）と 0 を詰めない注に替えた | 消した理由（幅）は `JDG-1241` が覆した | 名称ラベルが 2 字ぶん長くなる |
| 決定 3 | `SQ-5` の文は `CR-571` の決定 22・23 の文をそのまま使った（`DG-1` でも出す、診断を閉じると戻る） | `DFC-1870` の対応案 | `PND-710` が「揃える」と決まれば、この 1 文を覆す |
| 決定 4 | `TaskSearchRow` に `isBottleneck` を足し、`planActualState` は表 T-019a の判別のまま残した | `planActualState` の名がボトルネックを持つと名が体を表さない（規則 03 の 2 節） | 行の型の欄が 1 つ増えた |
| 決定 5 | `Agent API` の `readSearchRows` には渡さない（いまの形のまま）、`PND-711` に起こした | `AM-25` は画面の値を読まない、`AM-19` の先例と食い違う | 診断を出しているあいだ、パネルと API の `SQ-5` が違う |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 名称ラベルの年 | `docs/spec/01-04-requirements.md` の 表 T-251 の `ND-5` | E-01 |
| 説明の日の例 | 同書の 表 T-348 の `TL-10` | E-02 |
| 検索の並べ替え | 同書の 表 T-330 の `SV-8` | E-03 |
| 検索の状態の値 | 同書の 表 T-331 の `SQ-5` | E-04 |
| コード | `src/entity/layout-engine/schedule-layout/name-label.ts`・`src/adapter/screen-renderer/tooltips.ts`・`src/entity/document-model/schedule/schedule-search.ts`・`src/adapter/screen-renderer/search-table-filters.ts`・`search-panel.ts`・`screen-renderer.ts`・`src/framework/single-html-shell/frame-loop.ts`・`src/adapter/agent-api-endpoint/agent-api-members.ts`（`STOP` だけ） | 5 節 |

**数**: 要求の文の `（MUST）` ／ `（MUST NOT）` は増減 0。表の行 0、設定の行 0、辞書の語 0。

---

## 2. 新しい識別子

仕様の行 ID は無い。コードに `TaskSearchRow.isBottleneck`（`Schedule` の公開の型の欄）、`BOTTLENECK_STATE`・`SearchTaskState`・`searchTaskStateOf`（`search-table-filters.ts`、ファイルの中だけ）、`ScreenViewReadings.bottleneckUids`、`HeldDelayDiagnostics.bottleneckUids`。`searchRowsOf`・`searchPanelFromSession`・`searchPanelAfterFilterEntry` は引数を 1 つ足した（省けばボトルネック無し）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bf263de3`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `ND-5` の「年（西暦の下 2 桁、1 桁のときは 0 を詰めて 2 桁とする）」 | `01-04-requirements.md` | 「年（西暦の 4 桁）」 | E-01 |
| `ND-5` の「⚠️ 年を 4 桁で書かないのは、名称ラベルが日程の上で幅を取る場だからである」 | 同 | 4 桁で書く理由と、0 を詰めない形を残す注 | E-01 |
| `TL-10` の例 `26/6/3 (月)` | 同 | `2026/6/3 (月)` | E-02 |
| `SV-8` の昇順「未着手 → …」 | 同 | 「ボトルネック → 未着手 → …」と理由の 1 句 | E-03 |
| `YEAR_DIGITS = 2`・`HINT_YEAR_DIGITS = 2` と `% 10 ** n` | `name-label.ts`・`tooltips.ts` | `4` と `padStart` | 5 節 |
| 試験の旧の文と旧の値（`ND_5_TWO_DIGITS`、`26/4/6`、`05/12/29`、`SV-8` の旧の並び） | `tests/unit/cr-551-…`・`tests/unit/cr-386-…`・`tests/contract/cr-571-search-table-filters…`・`tests/contract/dfc-1362-…` | 新しい文と値 | 9 節 |

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（`ND-5`）—— 年は西暦の 4 桁。4 桁で書くのは、カーソルの札と読み出し・検索の表・レポートの表の日（`CU-3`・`DC-3`・`SQ-3`・`DT-5`）と同じ 4 桁の年で読ませるため。月と日は `ND-4` のとおり 0 で埋めず、それらの `yyyy/mm/dd` とは違う形のまま残す（利用者が見比べて残した）。`TL-10` への指しは残した。
- **E-02**（`TL-10`）—— 例だけ。
- **E-03**（`SV-8`）—— 昇順の先頭に「ボトルネック」、「ボトルネックが最優先で、残りは通常の作業の順」（`JDG-634` の理由）。
- **E-04**（`SQ-5`）—— 遅延診断を出しているあいだ（`S-445`）、`DG-2` の条件を満たすタスクは「ボトルネック」。`DG-1` がマーカーで勝つタスクでも出す。診断を出していないあいだは出さず、閉じると表 T-019a の状態へ戻る。語の欄に「表 T-315 の `DG-2` の語」。

当てた後に打ったもの: `npm run gen` → `python docs/spec/_source/build.py` → `python tools/ledger_metrics.py` → `python docs/spec/_source/row_id_prefixes_json_to_md.py` → `npm run gen:check` → `npm run typecheck` → `vitest`（機械の錠の下） → `rm -rf output` → `check.sh`（同） → `rm -rf output`。

---

## 5. 継ぎ目

```
SEAM (CR-655)
- Entity (UF-136, name-label.ts): planDateText writes the year as String(year).padStart(4, '0') (ND-5).
- Adapter (tooltips.ts): hintDayText does the same (TL-10; still a copy, DFC-1785).
- Entity (UF-178, schedule-search.ts):
    TaskSearchRow.isBottleneck: boolean
    searchRowsOf(schedule, word, bottleneckUids = none) marks the rows whose uid is in the set (SQ-5).
- Adapter (UF-181, search-table-filters.ts):
    BOTTLENECK_STATE = 'bottleneck' (T-315 DG-2's name); searchTaskStateOf(row) is the SQ-5 value;
    STATES_ASCENDING starts with it (SV-8).
- Adapter (UF-180, search-panel.ts): the SQ-5 cell and filter label read delayReportStatuses DG-2's word;
    searchPanelFromSession / searchPanelAfterFilterEntry take bottleneckUids and pass it on.
- Adapter (screen-renderer.ts): ScreenViewReadings.bottleneckUids reaches the search panel.
- Framework (frame-loop.ts): delayDiagnosticsOf holds bottleneckUids = report.bottlenecks' uids, once per
    document; the readings and the filter entries get it only while the diagnosis is shown (S-445).
- Adapter (agent-api-members.ts): readSearchRows passes nothing (PND-711, DFC-2025).
```

---

## 6. グラフ（`bf263de3`）

- `impact.py ND-5`: 要求 1 件（`FR-092`）・参照 3 —— `FR-092` は `TL-10` を介して指すだけ、05-07 の 2 か所は `ND-1`〜`ND-5` の範囲を言うだけで、どれも書き直しが要らない。
- `impact.py TL-10`: 要求 2 件（`FR-002`・`FR-092`）・参照 5 —— どれも「`TL-10` と同じ日の書き方」を指すだけ。
- `impact.py SV-8`: 要求 1 件（`FR-134`、レポートの並べ替えは `SV-8` と同じ「1 列、空は末尾」）・参照 5 —— `FR-134` は状態の順を `SV-8` から借りない（`DT-1` が持つ）。
- `impact.py SQ-5`: 要求 1 件（`FR-151`）・参照 2（`S-470` の列の幅）—— 変わらない。

---

## 7. 数の予測と測った数

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| `npm run typecheck` の誤り | 0 → 0 | 同 |
| 新しい試験 | 11 件（単体 1 本） | `vitest` |
| 書き直した試験 | 4 本（`cr-571-search-table-filters` は行の型の新しい欄も） | 3 節 |
| 壊した写しで赤くなった試験 | 11 件のうち 3 件（並びの先頭を末尾へ、年を 2 桁へ） | 13 節 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | 仕様 ＋ コード ＋ 試験 ＋ 台帳 | E-01〜E-04、5 節 | 本書の体 |

⚠️ **毎フレームの経路**: `tooltips.ts`・`name-label.ts`・`search-panel.ts`・`search-table-filters.ts`・`screen-renderer.ts`・`frame-loop.ts` に触れたので、`perf-pending.md` に 1 行足した。

---

## 9. 仕様の外で直すもの

- 新しい試験: `tests/unit/cr-655-nd-5-tl-10-sq-5-sv-8-the-four-digit-year-and-the-bottleneck-state.test.ts`（`ND-5`・`TL-10`・`SQ-5`・`SV-8` の文と、名称ラベル・期限の説明・検索の表の行と並びと絞り込み）。
- 書き直した試験 4 本（3 節）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- カーソル・検索の表・レポートの表の日の 0 埋めは変えない（`JDG-1242`）。
- `tooltips.ts` の年の写し（`DFC-1785`）は解かない。
- 検索の状態の列に `DG-1` と疑義・記載漏れを足さない（`PND-710`）。
- `Agent API` の `readSearchRows` は変えない（`PND-711`）。

---

## 11. 保留の行

- `PND-710`（分類 `C`） —— 検索の状態の列をレポートの `DT-1` の順と揃えるか。推奨は揃えない。本書は `JDG-634` と `CR-571` の決定 22 のとおりに当てた。
- `PND-711`（分類 `E`） —— `readSearchRows` がボトルネックを返すか。コードは返さない形のまま（`// STOP … (PND-711)`）。
- ⚠️ 実物で見ること（調整役へ）: 暦年をまたぐ文書で、名称ラベルの予定日（`IC-103`）とバーの説明の日が `2026/6/3` の形になること。遅延診断を出して検索パネルの状態の列を昇順に並べ替え、ボトルネックが先頭に「ボトルネック」と出て、診断を閉じると表 T-019a の状態へ戻ること。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-634` ／ `JDG-1241` ／ `JDG-1242` | 本書の裁定 | 「適用済」。着地先に `SQ-5`・`SV-8`・`ND-5`・`TL-10` |
| `DFC-1870` ／ `DFC-1871` | 本書が閉じる行 | `仕様待ち` → `実測待ち`（実物で見る） |
| `DFC-2025` | `readSearchRows` とボトルネック | 起こした（`仕様待ち`） |
| `PND-710` ／ `PND-711` | 11 節 | 起こした（`未裁定`） |
| `DFC-2026`〜`DFC-2029` | 帯 | 使わなかった |
| `perf-pending.md` | 8 節 | 1 行足した |
| `docs/development-records/changelog.md` | 本書 | 1 行足した |

---

## 13. 測り方の再現

```
# tree: bf263de3 + this CR.
npm run gen && python docs/spec/_source/build.py
python tools/ledger_metrics.py && python docs/spec/_source/row_id_prefixes_json_to_md.py && npm run gen:check
npm run typecheck                                                        # 0 errors before and after
node tools/gate/gate-queue.mjs run -- node ../../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<after.json>

# break test: copy src/ tests/ docs/spec/ and the configs into the worktree's ignored scratch/, move
#   BOTTLENECK_STATE to the tail of STATES_ASCENDING and put the year back to two digits in name-label.ts,
#   run the cr-655 file there: 3 of 11 red.

PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py ND-5 TL-10 SV-8 SQ-5
```
