# CR-651 —— 親の進み具合の点が配下の作業の点から外れたら、遅延診断が疑義として告げる

> 起草の状態: 当てた（2026-10-04、`197265d9` の上）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-651`、仕様の新しい行 `VS-6`・`S-487`・`AT-156`・`CM-87`・`K-140` は調整役から受けた（調整役が `197265d9` で最大を `AT-155`・`CM-86`・`K-139`・`VS-5` と測り、私もこの木の `docs`・`change-request`・`src`・`tests`・`tools` と手元の全枝で 5 つが 0 件であることを 2026-10-04 に測った —— 10 節）。台帳の帯 `JDG-1315`〜`JDG-1319`・`DFC-1975`〜`DFC-1979` も受けた。
> 当てる順: `CR-633`（遅延診断の 7 原則、`197265d9` に入っている）の後。`CR-648`（遅延診断レポートの窓の語）とは独立だが、レポートの語の節は `CR-648` が作るので、本書の告げる語を辞書へ入れるのは `CR-648` と合わせる側の仕事である（8 節）。
> 閉じるもの: 台帳 `DFC-1901`（`仕様待ち`）。裁定 `JDG-1253`・`JDG-1257`・`JDG-1258`・`JDG-1259` の 2 つ目（親子の進捗の疑義の分）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-1253` | 「イナズマ線は問題ないだろ？ 実績の日程に山が合っている(点は正しい)。  遅延診断ロジックに穴があるのでは？<br>つまり、疑義:  最も進捗が悪い子タスクと親タスクの進捗が合っていない。 更新漏れ or 子タスクに分割できていないタスクがある。  ってことじゃないかな？ 意見くれたし。」 | イナズマ線は直さない。穴は遅延診断にあり、親と子の進捗の食い違いを疑義として示す | E-03（`VS-6`） |
| `JDG-1257` | 「VC-12ってなに？ それが分からないので説明しろ。」 ／ 「推奨通りでよい 。 設定値の日数はどうする？  根拠を持って提案しろ。」 | 表 T-311（疑義）に新しい行を立てる。`VC-12` は広げない | E-03 |
| `JDG-1258` | 「デフォルトは1稼働日でOK。 ただし、設定のプロパティーパネルから値を変更可能とし、疑義の理由にもその向け書け。  理由: 進捗の刈り取り方法と精度はプロジェクトによる。  通常は毎週の定例会で進捗を刈り取ればよいので7日まで許容できるが、シビアなプロジェクトはDailyで進捗を刈り取る。 最初は厳しめに1日としておき、いやならユーザーの意思で精度を緩くできる。 この点は要求仕様のRATIONAL？ フィールドに書け。」 | 条件は範囲の外 ＋ 許す日数。既定 1 稼働日、プロパティパネル（文書の設定の面）で変えられる。告げる語に変えられると書く。理由を `FR-131` の RATIONALE に書く | E-01・E-02・E-03・E-06〜E-10 |
| `JDG-1259` の 2 つ目 | 「文書に保存する (Recommended)」 | 許す日数は文書に保存する（プロジェクトの刈り取り方なので、開く人が変わっても同じ判定になる） | E-07（`Project` の列）・E-11（版） |

### 0.2 調べた結果（`197265d9`）

1. **どの行にも当たらない。** 見本 `sample-schedule/sample-large-erp-program.ja.xml` の親「9. 組織変革・教育」（uid 208）は、イナズマ線の頂点が 2026-09-02（表 T-022 の `PL-5`、実績の最後の日の翌暦日）、子を持たない子孫の頂点の最も左が 2026-11-25（研修教材、未着手、`PL-4`）。55 稼働日左に外れているのに、`FR-131` の 3 つの表のどの行も当たらない。`VC-12`（表 T-310）が見るのは実績の両端だけである。
2. **矛盾ではない。** 親の完了率は子の完了率を子の期間で重み付けした平均である。子が親の期間を隙間なく埋めていれば、親の点は子孫の点の範囲に入る。外れるのは ① 進捗の更新漏れ、② 子に分けきれていない作業、③ 親の期間の空白（子と子のあいだのラグ）のどれかであり、③ は正しいデータでも起きる —— 「必ずどちらかが誤り」（表 T-310 の前文）と言えないので疑義（表 T-311）である。
3. **表 T-311 の後の「指摘にしない組」に、似た行がある。** 「親の `percentComplete` と子の平均の比べ —— 親の遅れはボトルネックの子で決まる」。本書の行は完了率の平均ではなく、イナズマ線の頂点の日を比べる。⇒ その行は残し、別であることを 1 文添える（E-05）。
4. **文書の設定の面で変えられる欄は、いまテーマ色の 1 つだけである**（`FR-072`「その欄は読むだけ … ただし、別の要求がその入口を本面の欄として置いたときは」、`FR-041` が置く）。本書が 2 つ目を置き、数を打つ欄としては初めてになる。置き方は `FR-041` の形に倣う（置く要求が置き場・命令・取り消しの段・欄の名を言う）。
5. **置き場は `Project` の列である。** 表 T-052 の `DR-5` がテーマ色を `project` に置く理由「そのプロジェクトの属性であって、読む人の好みではない」がそのまま当たる（`JDG-1259`）。値は表 T-216（日程データに属する値）に置く（`S-73` の隣）。見せ方の群（`documentSettings`）は絵の見え方の群であり（`DR-3`）、診断の許す日数は絵を変えない。
6. **`GRS JSON` の形が変わる。** `Project` に必須の鍵が 1 つ増える。`FR-073` の「形を変える変更は版を当てる日の日付へ 1 度だけ上げる」により、版を `2026-10-03` から `2026-10-04` へ上げる（調整役の確認: 今日ほかに版を上げる変更要求は無い）。旧い版の読み替えはしない（`JDG-1206`）。
7. **点の規則は 2 か所に在ってはならない。** イナズマ線の頂点は `src/entity/layout-engine/schedule-geometry/progress-line.ts` の `vertexXOf` が表 T-022 の状態ごとに打つ。診断は文書モデルの層にあり、配置の層を読めない（表 T-062）。⇒ 頂点の日を答える関数を文書モデルの `Schedule`（`plan-actual-state.ts`、`UF-127`）に 1 つ置き、両方がそれを読む（E-12・E-13）。

### 0.3 測った数 —— 許す日数で、見本が出す疑義の数

方法: `197265d9` の上で、`documentFromMspdi` で `sample-schedule/` の MSPDI の見本 6 つを開き（テンプレートは `startup-template.json`）、子を持ちマイルストーンでない `Task` ごとに、本書の `VS-6` の規則（頂点の日 ＝ 表 T-022、頂点の無い子孫は基準日、子を持たない子孫だけ、稼働日は `workingDaysBetween`）で数えた。台本は作業木の `scratch/`（追跡しない）に置いた 1 回限りのもの。⇒ 当てた後は試験（`VS-6` を名乗る `tests/unit/cr-651-*`）が同じ数を主張する。

| 見本 | 許す日数 1 | 許す日数 7 | 当たった親（左 L ／ 右 R、稼働日） |
|---|--:|--:|---|
| `sample-large-erp-program`（ja・en とも） | 9 | 4 | 208（L55）・200（L60）・182（L38）・181（L56、子を持たない子孫だけで数えたとき）と、許す日数 1 だけで 125・129・133・137・141・145（どれも L2） |
| `sample-small-website-renewal`（ja・en とも） | 1 | 1 | 38（L9） |
| `sample-medium-sfa-webapp`（ja・en とも） | 0 | 0 | —— |

- 9 件のうち 208 以外の 8 件も、親の期間に空白（子と子のあいだのラグ、または済んだ子とまだ来ない子のあいだ）がある形である。例: 親 125（07-01 〜 12-07、完了率 97%）の子は 33 稼働日ぶんしか期間を埋めず、親の点 12-03 は唯一の頂点 12-05（子 128）の 2 稼働日左になる。⇒ 告げる語が 3 つ目の原因（親の期間の空白）を並べる理由である。
- 子孫を「子を持たない子孫」に限る理由: すべての子孫で数えると、親 181（8. 統合テスト）は、子の親 200（8.3 受入テスト）自身の外れた点 09-09 に覆われて当たらない。中間の親の点が外れていると、その祖先の食い違いを隠す。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-7`（遅延診断）／ `GL-009`** —— イナズマ線で最も左に振れた頂点が、どの指摘にも当たらずに残ることが無くなる。見る人は、親の点を信じる前に、更新漏れ・分けきれていない作業・期間の空白を確かめられる。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— 頂点の日の規則を 2 か所に置かない（0.2 節の 7）。「指摘にしない組」の行と食い違わない（0.2 節の 3、E-05）。
- **`R1.2`（検証できる表現）** —— 「範囲から外れる」を、点の定義（表 T-022）・子孫の範囲（子を持たない子孫、`wbsParentUid`）・日数の数え方（稼働日、片側を含む）・判じない場合（親に頂点が無い）まで書いた。
- **`FR-131` の「⛔ 疑義と記載漏れを断定の語で告げてはならない」** —— 告げる語は原因を 3 つ並べて「かもしれない」とし、どれとも断定しない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 子孫は `wbsParentUid` を辿って集め、子を持たない子孫の点だけを数える | 0.3 節の 181 と 200 の例。`VC-9`〜`VC-12` も明記した `wbsParentUid` で子を読む | 中間の親の外れは、その親自身の `VS-6` として別に告げる |
| 決定 2 | 頂点を打たない子孫は基準日を点とする | 表 T-022 の結び「頂点のない段は基準日の位置を通す」—— イナズマ線と同じ規則。外すと、済んだ子とまだ来ない子しか持たない親（見本の 1）を、残る 1 つの遅れた子と比べて右に外れたと読む | 済んだ子とまだ来ない子の空白に親の点が落ちると、左に外れたと告げる（0.3 節の 182） —— 原因 ③ として告げる語が並べる |
| 決定 3 | 親が頂点を打たないとき（完了・中断で再開日未定・まだ来ていない・中断で再開日がまだ来ていない）は判じない | 比べる点が無い。完了の食い違いは `VC-9`・`VC-10` が持つ | —— |
| 決定 4 | 層は 4（表 T-310 の親子の行 `VC-9`〜`VC-12` と同じ） | 層は直す順の目安で、親子の集計は 4 | —— |
| 決定 5 | 日数は文書の暦の稼働日で、親の点から外れた側の端の点まで、片方の日を含みもう片方を含まずに数える。「超えて」なので、許す日数と等しい差は告げない | `VC-15` が `lag` を稼働日で数えるのと同じ暦。進行中の段は基準日の翌日に点を打つ（`RV-1`）ので、予定どおりの子と頂点の無い子の差は 1 稼働日 —— 既定の 1 がこれを許す | —— |
| 決定 6 | 許す日数の型は 0 以上の整数（稼働日）、上限は置かない | 点は日の単位で、日数は整数。大きい値は疑義を黙らせるだけで、図も文書も壊さない | —— |
| 決定 7 | 欄はテーマ色の欄の下に置き、確定した値で `CM-87` を 1 回発行する。範囲の外（0 未満・整数でない）の値は命令が拒む | `FR-041` の置き方と、注記の 4 命令が範囲の外を拒む形（`FR-019`「範囲へ寄せて書くと、置いた値と保存された値が食い違う」） | —— |
| 決定 8 | 許す日数は MSPDI へ書き出さず、MSPDI から読まない。MSPDI を開くときは `themeHue` と同じく開く先の文書の値を保つ（新しく開くならテンプレートの `S-487`） | `themeHue` と同じ（`GRS` の列、交換の欄が空。`mspdi-codec.ts` の `themeHue: current.schedule.project.themeHue`）。MS Project にこの値の置き場は無い | MSPDI を経ると、緩めた許す日数は開く先の文書の値になる |
| 決定 11 | `S-487` は `tools/generate_entity_types.py` の群に載せない | `src` が読む既定は無い —— 値は生成された起動の見本・空の文書・スキーマの `default` を通って入り、`GRS JSON` は鍵を必ず持つ（旧い版は読み替えない）。`generate_startup_template.py` が `manuscript_number('S-487')` で読む | —— |
| 決定 9 | 頂点の日を答える関数は `progressPointDayOf`（`plan-actual-state.ts`、表 T-064 の `PI-1` に公開） | 0.2 節の 7。状態（表 T-019a）から頂点の日を引くので、状態を判別するユニットの隣が置き場である。新しいファイルを足さない | `UF-127` の職務の文が 1 句増える |
| 決定 10 | 告げる語の値（親の点・範囲の両端・日数・許す日数）は指摘の値（表 T-347 の `DX-3`「判定に使った列のいまの値」）に載せる | `DX-3` が既に言う。語は値を差し込む文型にする（`CR-648` が `DT-7` で作る形） | —— |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所（`197265d9`） | 編集 |
|---|---|---|
| 許す日数の置き場と欄 | `FR-131` の STATEMENT の終わりに 1 段 | E-01 |
| 根拠と利用者の理由 | `FR-131` の RATIONALE の終わりに 1 段 | E-02 |
| 疑義の行 | 表 T-311 に `VS-6` | E-03 |
| 取り消しの段 | 表 T-027 の `UN-13` の列挙 | E-04 |
| 指摘にしない組 | 表 T-312 の後の「親の `percentComplete` と子の平均の比べ」の行 | E-05 |
| 命令 | `_assets/tbl-glossary.md` の 表 T-108 に `CM-87` | E-06 |
| 欄の名 | 同 表 T-104 に `K-140` | E-08 |
| 値 | `_source/settings.json` の 表 T-216 に `S-487` | E-09 |
| 列 | `_source/erd.json` の `Project` に `AT-156`（席 156） | E-07 |
| 辞書 | `_source/display-words.json` の設定の名の節に `K-140` の語 | E-10 |
| 版 | `tools/generate_startup_template.py` の `SCHEMA_VERSION` | E-11 |
| 頂点の日の関数 | `05-07-design.md` の 表 T-075 の `UF-127` の職務 | E-12 |
| 公開名 | `_source/published-entries.json` の `PI-1` に `progressPointDayOf` | E-13 |
| 変えない | `VC-12`・表 T-022・`FR-014`・表 T-315（疑義はマーカーを塗らない）・表 T-316・`BD-1`〜`BD-4`・`FR-072`・`FR-041` | —— |

**数**: 要求の文の段 5（`FR-131` の 2 段・表 T-311 の 1 行・`UN-13` のセル・指摘にしない組の 1 行）。表の行 +5（`VS-6`・`CM-87`・`K-140`・`S-487`・`AT-156`）。表 0、図 0、要求 0。

---

## 2. 新しい識別子

| ID | 置き場 | 中身 |
|---|---|---|
| `VS-6` | 表 T-311 | 親の点が子孫の点の範囲から許す日数を超えて外れる |
| `S-487` | 表 T-216 | `parentProgressToleranceDays`、既定 1、下限 0、上限なし |
| `AT-156` | 表 T-058（`erd.json` の `Project`、席 156） | `Project.parentProgressToleranceDays`、整数、空不可、`GRS` の列、既定は `S-487` |
| `CM-87` | 表 T-108 | `setParentProgressTolerance`、群 `Project`、正 `FR-131` |
| `K-140` | 表 T-104 | 群「遅延診断」、`parentProgressToleranceDays`、日本語「親子の進捗の疑義が許す日数」 |

接頭辞・表・要求は足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

消すものは無い。版の値 `2026-10-03` だけが `2026-10-04` に置き換わる（E-11）。

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（`FR-131` の STATEMENT の終わり）—— `VS-6` が許す日数は `Project.parentProgressToleranceDays`（`S-487`）とする（MUST）。欄を文書の設定の面のテーマ色の欄の下に置き、0 以上の整数を打たせ、確定した値で `CM-87` を 1 回発行する（MUST）。取り消しは `UN-13`、欄の名は `K-140`。`CM-87` は 0 未満と整数でない値を拒む（MUST）。
- **E-02**（`FR-131` の RATIONALE の終わり）—— `VS-6` の根拠（重み付き平均 ⇒ 範囲に入る、外れる 3 つの原因、機械では区別できない）と、許す日数を利用者が変えられる理由（利用者の言: 刈り取りの方法と精度はプロジェクトによる、週次の定例なら 7 日、厳しいプロジェクトは毎日、最初は厳しめに 1 稼働日、緩めるのは利用者の意思）、文書に保存する理由（`DR-5` と同じ）。
- **E-03**（表 T-311 の `VS-6`）—— 観点と告げる語。0.3 節の決定 1〜5 を観点の欄に書く。
- **E-04**（`UN-13`）—— 列挙に「親子の進捗の疑義が許す日数（`FR-131`）」。
- **E-05**（指摘にしない組）—— 「親の点と子孫の点の比べ（表 T-311 の `VS-6`）はこれと別である —— 完了率の平均ではなく、イナズマ線の頂点の日を比べる」。
- **E-06**〜**E-10** —— 2 節の行。
- **E-11** —— `SCHEMA_VERSION = '2026-10-04'`、`npm run gen` が刷る生成物（スキーマの `const`、起動の見本、空の文書、案内の骨組み）。
- **E-12**（`UF-127`）—— 職務に「表 T-022 の頂点を打つ日を答える（`FR-014`・`FR-131`）」。
- **E-13**（`PI-1`）—— `progressPointDayOf`「表 T-022 の頂点の日。`ScheduleGeometry` のイナズマ線と `diagnoseDelay` の `VS-6` が同じ日を読むために公開した」。

---

## 5. 継ぎ目

```
SEAM (CR-651)
- Schedule (plan-actual-state.ts, UF-127) exports
    progressPointDayOf(task: Task, statusDate: CalendarDay): CalendarDay | null
  T-022: finished -> null; suspendedResumeUnknown -> null;
  suspendedResumePlanned -> resume if resume < statusDate else null;
  notStarted -> start if start < statusDate else null;
  inProgress -> the calendar day after actualLastDay (RV-1), null if none.
  Published in PI-1 and re-exported from schedule.ts.
- progress-line.ts vertexXOf reads progressPointDayOf for null-or-day; the
  in-progress x stays placed.actualX + placed.actualWidth (RV-1's x of that day),
  every other state draws xFromDay(layout, day).
- Project.parentProgressToleranceDays: integer >= 0, not null, GRS origin, default
  S-487 (= 1). GRS JSON reads/writes it; an MSPDI open keeps the current document's
  value (as themeHue does); MSPDI export omits it.
- DocumentCommand CM-87 setParentProgressTolerance { workingDays: number }:
  refused unless an integer >= 0; one undo step (UN-13).
- diagnoseDelay: finding row 'VS-6', kind 'suspicion', layer 4, on the parent.
  Parents: tasks with explicit children (wbsParentUid), not milestones, with a
  non-null progressPointDayOf. Leaves: descendants by wbsParentUid with no child;
  a leaf's point = progressPointDayOf ?? statusDate.
  left = workingDaysBetween(calendar, parentPoint, leftmost);
  right = workingDaysBetween(calendar, rightmost, parentPoint);
  found when left > tolerance or right > tolerance.
  values: parentPoint, leftmostPoint, leftmostUid, rightmostPoint, rightmostUid,
  outsideWorkingDays, parentProgressToleranceDays.
- Properties panel, settings face: a number field under the theme-hue field,
  label K-140, commits CM-87.
- SCHEMA_VERSION 2026-10-04.
```

---

## 6. グラフ（`197265d9`）

- `impact.py T-311`: 指す要求 3 件（`FR-131`・`FR-134`・`FR-135`）、2 次 7 件（`UC-015`・`FR-130`・`FR-016`・`FR-152`・`FR-060`・`FR-036`・`FR-133`）。`FR-134` は観点の行 ID を一覧に出すだけ（`DX-3`）、`FR-135` は `VS-2` を名指すだけ、`FR-133` のマーカーは疑義で色を変えない（表 T-315 の `DG-1` は表 T-310 と `VO-3`・`VO-5` と表 T-316 だけ）⇒ 書き換え 0。
- `impact.py FR-131`・`induced.py FR-131 T-311 T-216 T-108 T-104 FR-072 FR-041`: 11 節の再現で測る。

---

## 7. 数の予測と測った数

| 数 | `197265d9` | 本書を当てた後 | 差 |
|---|---|---|---|
| 表 T-311 の行 | 5 | 6 | +1 |
| 表 T-108 の行 | 86 | 87 | +1 |
| 表 T-104 の行 | 139 | 140 | +1 |
| 表 T-216 の行 | 2 | 3 | +1 |
| `Project` の列 | 26 | 27 | +1 |
| tables / figures / uids | 変わらない | 変わらない | 0 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | 仕様の原稿と生成物、`changelog.md` の 1 行 | E-01〜E-13、`npm run gen`、`gen:check` |
| 2 | `src/`（遅延診断・頂点の日・命令・符号器・パネル） | 5 節の継ぎ目 |
| 3 | `tests/unit/cr-651-*`（仕様だけを読む別の体） | `VS-6`・`S-487`・`CM-87`・`AT-156`・`PL-*` の共有 |

- **毎フレームの経路: はい（1 か所）。** `progress-line.ts` は描くたびに走る。頂点の日を関数で引くだけで、手間は変わらない。`perf-pending.md` に行を足す。
- **辞書の告げる語**: `197265d9` の辞書には遅延診断の指摘の語の節が無い（レポートは観点の行 ID を刷る —— `DFC-1771`）。`CR-648` が `delayReportReasons` の節を作る。⇒ 合わせる側は、その節の `missingActual`・`milestoneAchieved` の隣に、表 T-311 の `VS-6` の告げる語を 1 つ足す（ja は表のまま、en は 11 節の案）。

---

## 9. 仕様の外で直すもの

- `src/` と `tests/`（8 節の波 2・3）。台帳: `defects.md` の `DFC-1901`、`rulings.md` の 4 行の状態、`perf-pending.md` の行、`changelog.md`。
- `GRS JSON` の見本と試験の備品（版と新しい鍵）。

---

## 10. 測り方の再現

```
# the tree: 197265d9

# the five ids are unused (2026-10-04)
for id in VS-6 S-487 AT-156 CM-87 K-140; do git grep -n -w "$id" -- docs change-request src tests tools; done
for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do git grep -q -w AT-156 "$b" -- docs src && echo "$b"; done

# the measurements of section 0.3: a one-off probe, bundled and run with node
#   rolldown scratch/probe-1901/probe2.ts --platform node --format esm -o scratch/probe-1901/probe2.mjs
#   node scratch/probe-1901/probe2.mjs
# after this change request lands, the same numbers are asserted by tests/unit/cr-651-*

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-311
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-131
```

---

## 11. 告げる語の英語の案（辞書へ入れる側のため）

- ja（表 T-311 の `VS-6` のまま）: 「親の進み具合（{親の点}）が、配下の作業の進み具合（{最も左} 〜 {最も右}）から {日数} 稼働日外れている。進捗の更新漏れ、子タスクに分けきれていない作業、親の期間の空白のどれかかもしれない。許す日数（いまは {許す日数} 稼働日）はプロパティパネルの文書の設定で変えられる」
- en（案、利用者はまだ書いていない）: "This parent's progress ({parent}) lies {days} working days outside its work's progress ({leftmost} to {rightmost}). An update may be missing, work may not be split into child tasks, or the parent's span may have empty gaps. The allowed days (now {tolerance}) can be changed in the document settings of the property panel."
