# CR-667 —— 完了率は予定も実績も両端の日を数える ・ パネル境界の線は今の色のまま仕様を直す

> 起草の状態: 当てた（2026-10-04 夜、調整役の統合点 `8a02e43d` から早送りした作業木）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-667`、裁定の帯 `JDG-1430`〜`JDG-1434`、台帳の帯 `DFC-2081`〜`DFC-2082` は調整役から受けた（13 節で、木のどこにも在らないことを測った）。使ったのは `JDG-1430`〜`JDG-1432` の 3 つ。`DFC` は新しく取らない —— 既にある `DFC-2067`・`DFC-2068`・`DFC-2070` だけを動かす。仕様の新しい識別子は取らない（2 節）。
> 閉じるもの: 台帳 `DFC-2067`（完了率が 100 を超える —— 予定どおりに終えた 2 日のタスクが 200%）、`DFC-2068`（`EP-9` が「`Group Grid Lines` と同じ線」と言うのに色が違う）。`DFC-2070`（最大化したレポートをパレットが覆う）は「変えない」と裁定されたので取下げにする（12 節）。
> 覆すもの: `FR-012` の「期間は開始日と終了日の差とし、端を含む日数と取り違えないこと（MUST NOT）」（裁定の行は無い。仕様の字だけ）。`EP-9` の「同じ線とは太さも同じ」の「同じ線」の読み。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（全文は `docs/development-records/rulings.md` の該当行）

| 出どころ | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1430`（2026-10-04 夜、`DFC-2067` への答え） | 「両方とも両端を数える (Recommended)」 | 完了率の分母（予定の期間）も分子（実績の長さ）も、開始の日と終了の日の両方を数える。予定どおりに終えたタスクは 100、1 日のタスクは 1 日（E-01〜E-04） |
| `JDG-1431`（同、`DFC-2068` への答え） | 「いまの色のまま、仕様を直す (Recommended)」 | コードは変えない。`EP-9` を「`Group Grid Lines` と同じ太さ、色は `S-149`」に書き直す（E-06）。同じ読みを `EP-9` に帰していた `FR-042` の括弧を外す（E-05） |
| `JDG-1432`（同、`DFC-2070` への答え） | 「いまのまま」 | 何も変えない（パレットは掴んで動かせる —— `FR-053`）。`DFC-2070` を取下げにする |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-008`**（`FR-012` が満たす目標） —— 予定と実績の工数の差を完了率から直に読む。予定どおりに終えたタスクが 200 と読めると、差が無いのに差が在るように読める。分子と分母を同じ規則で数えれば、100 からの外れがそのまま工数の差になる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（同じことを 2 か所で言わない）** —— 日数の数え方を持つのは `FR-011` の 1 か所（「実績の期間を数える規則を持つのは本要求 1 か所である」）。`FR-012` は予定の期間を「`FR-011` の規則で数えた日数」と指すだけにし、規則を写さない（E-01）。コードも同じメンバ `actualLengthOf` を呼ぶ（`05-07-design.md` の「数え方を 3 か所に書いてはならない（MUST NOT）」）。
- **`R1.4`（境界）** —— ① 開始日 ＝ 終了日のタスク: 1 日（E-01・E-03・E-04）。② マイルストーン: 0（長さを持たない点 —— `FR-011` の「マイルストーンにはこの読みを当てない」と同じ）。③ 予定の端が非稼働日: `FR-011` の規則はその日も 1 日と数える。交換相手へ書く `Duration`（`DV-8`）は数えない —— この場合に限り、書き出す `PercentComplete` は `ActualDuration ÷ Duration` と一致しない（E-02 の ⚠️ 行、11 節の問い 1）。④ `finish` が `start` より前: `IV-10` が拒む。数え直しは負の値を告げない（`recountedPercentComplete` の注、変えない）。
- **数の主張** —— `FR-012` の RATIONALE「予定 100 日のタスクを 80 日で終えれば 80、120 日かかれば 120」は、分子と分母を同じ規則で数えてはじめて真になる。今までは予定どおりでも 100 にならなかった（`DFC-2067` の実測）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 予定の期間を `FR-011` の規則（両端の日は非稼働日でも 1 日、間の非稼働日は数えない）で数える。`DV-8` の数え方（両端を含む稼働日だけ）ではない | 「両方とも両端を数える」—— 同じ規則を両側に当てれば、予定どおりに終えたタスクは端が非稼働日でも必ず 100 になる | 予定の端を非稼働日に置いたタスクだけ、書き出す `PercentComplete` が `ActualDuration ÷ Duration` とずれる（11 節の問い 1） |
| 決定 2 | 起動時の見本（`src/framework/single-html-shell/startup-template.json`）を作り直す。`tools/generate_startup_template.py` の予定の期間を同じく両端を含める数え方にし、「予定どおりの速さ」の作業が予定の終了日に終わるようにした | 作り手は「実績の長さ ＝ 予定の期間 × 速さ」で実績を置いていた。予定の期間が終わりの日を落としていたので、予定どおりの作業が 1 日早く終わっていた —— 数え方だけ直すと、それらが 50%・67% と読める | 1000 件のうち 155 件の `actualFinish`、51 件の `stop`、6 件の `resumeValid`、157 件の完了率が動く（7 節）。全試験は緑のまま（13 節） |
| 決定 3 | 見本 `sample-schedule/Three-Year Product Plan.json` の格納済みの完了率 221 件を、新しい数え方の値に書き換える。日付は動かさない | `GRS JSON` を読むと数え直す（`FR-012`、`CR-645`）ので、書き換えないと開くたびに「221 件を数え直した」（`RS-52`）が出る | 無い（読んだ結果は書き換えの前後で同じ） |
| 決定 4 | `EP-9` の色の理由を「境目は `TaskGroup` の境ではなく 2 つのパネルの境なので、区切りの線の色で描く」と書く | `S-149` の名は「罫の色」、用途は「区切りの線」（表 T-236）。`S-165` は「行の帯の縁の色」 | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 完了率の式の分母 | `docs/spec/01-04-requirements.md` の `FR-012` の STATEMENT | E-01 |
| 分子と分母を同じ規則で数える理由・`Duration` とのずれ | 同 `FR-012` の RATIONALE | E-02 |
| 予定の期間が 0 になるもの | 同 `FR-012` の終わりの段 | E-03 |
| 開始日 ＝ 終了日のタスク | 同 `FR-001` の RATIONALE | E-04 |
| 行見出しパネルの線の読みを `EP-9` に帰さない | 同 `FR-042` の RATIONALE | E-05 |
| パネル境界の線 | 同 `FR-080` の 表 T-076 の `EP-9` | E-06 |
| `actualLengthOf` の注 | `docs/spec/_source/published-entries.json`（生成物 `_assets/tbl-published-entries.md` の `PI-1`） | E-07 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行 | E-08 |

**数**: 表の行 ±0。要求の増減 0。図 0。設定値 ±0。辞書 ±0。

---

## 2. 新しい識別子

取らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消す文 | 代わり |
|---|---|---|
| `FR-012` の STATEMENT | 式の分母「`(finish − start)`」 | 「予定の期間」と、その数え方の 3 行（E-01） |
| `FR-012` の終わりの段 | 「対象はマイルストーンに限らない —— `UC-001` 拡張 2a が作る「開始日 ＝ 終了日のタスク」も期間 0 である。」「期間は開始日と終了日の差とし、端を含む日数と取り違えないこと（MUST NOT） —— 含めると期間 0 が存在しなくなり、この規定が空振りする。」 | 「予定の期間が 0 になるのはマイルストーンだけである …」（E-03） |
| `FR-001` | 「`FR-012` の「予定の期間が 0 の …」は、そのまま語る相手を持ち続ける。」 | 「開始日と終了日が同じタスクの予定の期間は 1 日である …」（E-04） |
| `FR-042` | 「（`FR-080` の 表 T-076 の `EP-9` と同じ読み）」 | 無し（E-05） |
| `EP-9` | 「`Group Grid Lines`（`U-18`）と同じ線を 1 本引くこと（MUST）」「同じ線とは太さも同じであるということである（MUST）」 | 「同じ太さの線を 1 本、`S-149` で引くこと（MUST）」「色は `S-165` ではない」「太さが同じであること（MUST）」（E-06） |

⭐ 消さないもの: `FR-012` の「予定の期間が 0 の `Task` では割り算を行ってはならない（MUST NOT）」と 0 / 100 の規則、RATIONALE の「予定 100 日 …80、120」、`FR-090` の「期間 0 のタスクでは 0 か 100 のどちらかだけを出す」（マイルストーンについて真のまま）、`VC-5` の注（同じ）、`EP-9` の「太さを 0 で描いてはならない」以下の 4 文、`FR-042` の「太さ・色・縦の位置が同じ」（行見出しパネルの線は `S-165` で、真のまま）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧が 1 回だけ現れることを数えた。改行は LF（ファイルの全数）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-012` の STATEMENT の 1 行目の式を `round(actualDuration ÷ 予定の期間 × 100)`（いずれも稼働日）に替え、その直後（「⭐ 式の `actualDuration` は …」の行の前 —— その行から続く字を引く試験の窓を割らないため）に次の 3 行を足す:

```text
⭐ **予定の期間は、`start` の日から `finish` の日までを、`FR-011` が実績の長さを数える規則で数えた日数とすること（MUST）** —— 両端の日を数え、間の非稼働日は数えない。  
マイルストーンの予定の期間は 0 とする —— 長さを持たない点である（`FR-011` と同じ扱い）。  
⇒ 予定どおりの日に始めて予定どおりの日に終えたタスクは 100 であり、開始日と終了日が同じタスクの予定の期間は 1 日である。  
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`FR-012` の RATIONALE の「`actualStart` が `start` より後でも分母は変わらない。」の後に 2 行足す:

```text
**分子と分母を同じ規則で数えるのは、予定どおりに終えたタスクを 100 と読ませるためである** —— 片方だけが終わりの日を数えると、予定どおりに終えた 2 日のタスクが 200 と読める。  
⚠️ 交換相手へ書く `Duration`（`_assets/fig-erd-detail.md` の `DV-8`）は、端の日が非稼働日のときその日を数えない —— 予定の端を非稼働日に置いたタスクに限り、書き出す `PercentComplete` は `ActualDuration ÷ Duration` と一致しない（`LM-7`）。  
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`FR-012` の終わりの段の 3 行目と 4 行目（3 節の旧）を、次の 1 行に替える: 「予定の期間が 0 になるのはマイルストーンだけである —— `UC-001` 拡張 2a が作る「開始日 ＝ 終了日のタスク」は、両端の日を数えるので 1 日である。」

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`FR-001`。旧（3 節）を「⭐ 開始日と終了日が同じタスクの予定の期間は 1 日である（`FR-012`） —— `FR-012` の「予定の期間が 0 の `Task` では割り算を行ってはならない（MUST NOT）」が語る相手はマイルストーンである。」に替える。

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
`FR-042` の RATIONALE の 2 行目の末の括弧「（`FR-080` の 表 T-076 の `EP-9` と同じ読み）」を外す —— 行見出しパネルの線は `S-165` で、`EP-9` の線（`S-149`）とは色が違う。

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
表 T-076 の `EP-9` の理由と扱いの欄。旧「`Group Grid Lines`（`U-18`）と同じ線を 1 本引くこと（MUST） —— 新しい確定名も新しい設定値のキーも作らない。<br>⭐ **同じ線とは太さも同じであるということである（MUST）**—— ⛔ **太さを 0 で描いてはならない（MUST NOT）。<br>**」 新「`Group Grid Lines`（`U-18`）と同じ太さの線を 1 本、表 T-236 の `S-149`（罫の色）で引くこと（MUST） —— 新しい確定名も新しい設定値のキーも作らない。<br>⚠️ 色はグループ罫線の `S-165` ではない —— 境目は `TaskGroup` の境ではなく 2 つのパネルの境なので、区切りの線の色で描く。<br>⭐ **太さが同じであること（MUST）**—— ⛔ **太さを 0 で描いてはならない（MUST NOT）。<br>**」。後の 4 文はそのまま。

<!-- EDIT id=E-07 file=docs/spec/_source/published-entries.json -->
`actualLengthOf` の `note.ja` の 2 行目の末に句点を足し、3 行目「`FR-012` は予定の期間もこの数え方で数える」を足す（1 行 1 文 —— 検査の文末の改行）。

<!-- EDIT id=E-08 file=docs/development-records/changelog.md -->
変更履歴の表の終わりに次の版の 1 行を足す（版はコミットの直前に木の最大を測って決める）。

### 4.1 生成物

- `npm run gen` が `docs/spec/_assets/tbl-published-entries.md`・`src/framework/single-html-shell/startup-template.json`・`tests/fixtures/measuring-document.json`・`docs/development-records/test-inventory.md` を刷る。手で直さない。

---

## 5. 継ぎ目

```
SEAM (CR-667)
- src/use-case/edit-document/percent-complete.ts: planSpanOf -> plannedLengthOf(within, task):
  null without start or finish; 0 for a milestone; otherwise actualLengthOf(within, start, finish)
  -- the member FR-011 counts the actual with (05-07-design.md: one member, never three countings).
  percentCompleteOf, heldActualLength, repriced and recountedPercentComplete keep their shape.
- No new published member; table T-064 and PI-1's list do not change (only actualLengthOf's note).
- working-calendar.ts: workingDaysBetween and plannedDurationMinutesOf unchanged; the WHY note
  of plannedDurationMinutesOf no longer says FR-012's span is half-open.
- tools/generate_startup_template.py: planned_days_of(task) = 0 for a milestone, else
  finishAt - startAt + 1 (WORKDAYS indices); every percent and every "pace x span" reads it.
```

---

## 6. グラフ（`8a02e43d`）

- `impact.py FR-012`: 要求 14 件 / 参照 30 か所。読みが変わるのは `FR-001`（E-04）だけ。`FR-011`（数え方の持ち主 —— 変えない）、`FR-090` の「期間 0 のタスクでは 0 か 100」（マイルストーンについて真）、`VC-5` の注（同じ）、`FR-047`・`FR-054`（稼働日を単位とする —— 真）、`05-07-design.md:942`（同じメンバを呼ぶ —— 本書で `EditDocument` も `actualLengthOf` を呼ぶので、より真になる）、`OP-6`・`RS-52`（数え直す —— 変えない）。
- `impact.py EP-9`: `tbl-published-entries.md` の `PI-19`（`GROUP_GRID_LINE_WIDTH_PX` を `ImageExporter` が読む —— 太さの 1 か所、真のまま）。
- `FR-012` の読みを使うコード（`workingDaysBetween`・`actualLengthOf` の呼び手）を読んだ:
  - 変わる: `percent-complete.ts`（分母）。
  - 変わらない: `delay-diagnostics.ts` の `VS-6`（親子の進捗の疑義 —— イナズマ線の頂点 `progressPointDayOf` の日付で比べ、完了率を読まない）、`VC-5`・`VC-7`（0 より大きいか / 0 か —— 分子が 0 なら 0 のまま）、`flowOf`・`remainingWorkingDaysOf`（もとから `actualLengthOf` で予定の長さを数えている）、`task-delay.ts`、`schedule-grid.ts`（網掛け）。
  - 表示（`percent-label.ts`・`tooltips.ts`・`search-panel.ts`・`delay-diagnostics-report.ts`）は格納した値をそのまま出す（`FR-090`）—— コードは変わらず、出る値が変わる。
  - `MSPDI`: 書き出しの `PercentComplete` は格納した値（`mspdi-codec.ts:1175`）、`ActualDuration` は `actualLengthOf`、`Duration` は `plannedDurationMinutesOf`（`DV-8`）—— どれも変えない。読みは数え直さない（`FR-012` の MUST NOT、`FR-021`）ので、往復は値を保つ。
  - `GRS JSON` の読み（`json-codec.ts` の `settledReading`、`CR-645`）と暦の編集（`edit-calendar.ts`）は `recountedPercentComplete` を通るので、新しい数え方がそのまま当たる。
- 届いた行で `rulings.md` を引いた（`FR-012`・完了率・`EP-9`・境界の線）: 食い違う裁定は無い。`FR-012` の半開の数え方を決めた裁定の行は無い（仕様の字だけ）。

---

## 7. 数の予測と実測（当てた後に同じ数え方で突き合わせた）

| 数 | 前 → 後 | 方法 |
|---|---|---|
| 見本 `Three-Year Product Plan.json` を読んだときの数え直し | 0 件 → 221 件（書き換えの前）→ 0 件（決定 3 の後） | `recountedPercentComplete` を scratch で束ねて走らせた（13 節） |
| 同、100 を超える `Task` | 91 → 15、最大 200 → 143 | 同 |
| 同、`uid` 21・88・66 | 200・200・114 → 100・100・100 | 同。3 つとも予定の開始日に始め、予定の終了日に終えた |
| 起動時の見本の数え直し | 0 → 0（作り直した見本で） | 同 |
| 起動時の見本、100 を超える / ちょうど 100 | 19 / 100 → 24 / 86 | 同 |
| 起動時の見本の動いた列 | `percentComplete` 157・`actualFinish` 155・`stop` 51・`resumeValid` 6 | 作り直す前と後の JSON を比べた |
| `previous-project-result/38-project-progress/gr-scheduler-progress-2026-10-04.json` | 開くと 12 件を数え直す（100 を超える 4 → 0） | 同。別の席の成果物なので書き換えない（報告の 1 行） |
| 検査 39 の拾えていない条項 | 2227 → 2222 | `check-must-clause-coverage.py` |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec/01-04-requirements.md` ・ `_source/published-entries.json` ・ 生成物 | E-01〜E-07、`npm run gen` | 本書の体 |
| 2 | `src/use-case/edit-document/percent-complete.ts` ・ `working-calendar.ts` の注 ・ `tools/generate_startup_template.py` ・ 見本 | 5 節 | 本書の体 |
| 3 | `tests/` | 9 節 | 古い数え方を固めた試験は本書の体が直した。新しい試験は仕様だけを読む別の体 |

- ⭐ **毎フレームの経路: いいえ。** 検査 66 が読む毎フレームの経路（`src/entity/layout-engine/**`・`src/adapter/svg-renderer/**`・`src/adapter/screen-renderer/**`・`frame-loop.ts`）に触れない。完了率は編集・暦の編集・読みのときに数え、描き手は格納した値を読む。`perf-pending.md` に行は足さない。

---

## 9. 仕様の外で直すもの

- コード: 5 節。
- 古い数え方を固めた試験（同じ変更で退け、新しい条項を指す）:
  - `tests/unit/cr-645-a-grs-json-read-recounts-the-percent-complete.test.ts` —— 5 稼働日 → 6、40 → 33。開始日 ＝ 終了日のタスクを「期間 0」から「1 日」へ。
  - `tests/unit/edit-calendar.test.ts` —— 月〜金で 60 → 50、土曜を足して 50 → 43（`DFC-353` の台帳の数がそのまま正しくなった）、月〜金の 5 日の予定は 75 → 60。古い `FR-012` の文を引いた注を直した。
  - `tests/unit/t-023d-gr-5-relays-the-actual-duration.test.ts` —— 試験の中の予定の期間の数え方を両端を含めるものに。
  - `tests/contract/dfc-377-fr-016-zoom-ceilings-and-ep-9-thickness.test.ts`・`tests/contract/cr-657-group-grid-lines-across-the-row-title-panel.test.ts` —— 原稿の字を引く窓を E-05・E-06 の字に切り直した。
- 新しい試験（仕様だけを読む体）: E-01（予定どおりの終了 ＝ 100、1 日のタスク、端が非稼働日の予定）、E-03（マイルストーンだけが 0 / 100）、E-06（境界の線の色が `S-149`、太さが `U-18` と同じ —— 画面と書き出し）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- `DV-8`（交換相手へ書く `Duration`）の数え方は変えない（決定 1、11 節の問い 1）。
- パネル境界の線のコード（`dom-screen-surface.ts` の `PAINT_ROW.rule`、`image-exporter.ts` の `dividerLinesSvg`）は変えない（`JDG-1431`）。
- `DFC-2070` の重なり（表 T-337）は変えない（`JDG-1432`）。

---

## 11. 利用者に問うこと

1. 予定の端（開始日か終了日）を非稼働日に置いたタスクだけ、書き出す `PercentComplete` が `ActualDuration ÷ Duration` と一致しない（E-02 の ⚠️）。推奨: このまま（予定どおりなら必ず 100 を優先する）。もう 1 つの道は `DV-8` を `FR-011` の数え方に寄せること（交換相手の例は平日の端だけなので、例とは矛盾しない）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1430` | `DFC-2067` への答え | 適用済、着地先 `FR-012` |
| `JDG-1431` | `DFC-2068` への答え | 適用済、着地先 `EP-9` |
| `JDG-1432` | `DFC-2070` への答え | 適用済、着地先 `docs/development-records/fixed-defects.md` の `DFC-2070` |
| `DFC-2067` | 本書が閉じる | `裁定待ち` → `実測待ち`（自動試験は緑。利用者が出荷ビルドで見るのはまだ） |
| `DFC-2068` | 本書が閉じる | `裁定待ち` → `実測待ち`（仕様だけを直した。コードは裁定のとおり変えない。仕様だけを直した `DFC-1225` と同じ扱い） |
| `DFC-2070` | 「変えない」の裁定 | `裁定待ち` → `取下げ`（`fixed-defects.md` へ移す。`DFC-1878` と同じ扱い） |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 8a02e43d

# the numbers are unused
git grep -l "CR-667"            # nothing before this CR
git grep -l "JDG-143[0-4]\b"   # nothing before this CR
git grep -l "DFC-208[12]\b"    # nothing

# each old text of section 4 appears exactly once before editing
#   (the edit script asserts count == 1 for every edit, then writes)

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-012 EP-9
grep -rn "workingDaysBetween\|actualLengthOf\|percentComplete" src --include=*.ts

# section 7: a scratch script bundled with rolldown imports
# src/use-case/edit-document/percent-complete.ts and runs recountedPercentComplete on
# the schedule of each GRS JSON file; the old figures come from the same script built
# against `git show HEAD:src/use-case/edit-document/percent-complete.ts`.

# check 39
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-must-clause-coverage.py
```
