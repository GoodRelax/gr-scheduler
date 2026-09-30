# CR-618 — `sample-schedule/` の MSPDI の見本を「ふつうに管理されたプロジェクト」にし、同じ日の FS を矛盾にしない

> 起草の状態: 当てた —— W0 〜 W4（2026-10-01、枝 `samples-cr618`、`refactor` `84eb19e5` から切った。調整役の割り当て）。4 節の旧 4 つは当てる木で各 1 回だけ現れた。⚠️ **W5（生成器が出荷する見本の写しを `sample-schedule/` に書く）は当てていない** —— `CR-611`・`CR-612` の後に当てる（8 節）。それまで `Three-Year Product Plan.json` は古い写しのまま残る。表 S は当てるときに測った数へ書き直した（`JDG-1040`、9.2 節）。起草は 2026-10-01 の `842f3082`（枝 `sample-and-folders`）。
> 当てた体の ID の帯: `JDG-1040`〜`JDG-1044`・`DFC-1620`〜`DFC-1624`・`PND-625`〜`PND-626`（使ったのは `JDG-1040`・`JDG-1041`・`DFC-1620`）。
> 読んだ木: `refactor` `842f3082`（枝 `sample-and-folders` の作業木）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-618`・`JDG-998`・`JDG-1001`〜`JDG-1005`・`JDG-1015`〜`JDG-1017`・`JDG-1021`〜`JDG-1025`・`DFC-1490` を受けた（`JDG-1021`・`JDG-1022` は `CR-619` が、`JDG-1023` は本書が使う）。本書は表・接頭辞・設定の行を足さない（2 節）。
> 当てる順: `CR-611`（見本の題）・`CR-612`（見本の容れ物と `MC-10`）とは、仕様の旧も触るファイルも重ならない（8 節）。⭐ 本書は出荷する見本（`FR-027`・表 T-226・`startup-template.json`）を触らない（`JDG-1001`）。
> **閉じるもの**: `DFC-1490`（`VC-15`・`VS-4`・`BD-2` の FS の同じ日）。`JDG-998` の前半（見本の日程を良くする）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-998` | 「sample-schedule サンプル日程を改善したい。 …」（先頭の `sample-schedule` は利用者が書いた絶対パスを置き換えたもの） | 見本の日程を良くする | 本書 |
| `JDG-1001` | 「今の出荷時の見本はまだ触らない。 パフォーマンス評価が必要。タイトルだけ変える。」／「修正したいのはこっち。<br>sample-schedule<br>案件ごとに量が違うって。」／「MSPDIの方を直すの。 再考して。 具体的には 遅延診断で？ が多すぎる。 いくつか遅れがあっても、普通にまともに管理されている。プロジェクトにしてくれ。」 | 出荷する見本は変えない（題は `CR-611` の決定 9）。直すのは `sample-schedule/` の MSPDI の見本。小・中・大の 3 つの大きさは保つ | 決定 1・決定 2 |
| `JDG-1005` | 「矛盾にしない (Recommended)」／「!! の経路（DG-3）」／「広がりも含めて 5% (Recommended)」／「語を中立に、ProjectLibre.xml は消す (Recommended)」 | ① FS の同じ日は `VC-15` の矛盾にしない ② 目標の量 ③ `ProjectLibre.xml` を消す（語の半分は `JDG-1015` が覆した） | E-01・9 節の表 S・E-03・E-04 |
| `JDG-1002` | 「全タスク数に対してボトルネックは5%。 紫の矛盾も5% ボトルネック依存は15%」（状態は覆された —— 量は `JDG-1005` の ② が引き継ぐ） | 目標の量の元 | 9 節の表 S |
| `JDG-1015` | 「ちょい待ち。業界用語は残して！  イメージしやすくしたいの」 | 見本の業界の語は残す。⚠️ 見本と例示を業種に寄せない常設の指示を、`sample-schedule/` の MSPDI の見本に限って覆す | 決定 4 |
| `JDG-1016` | 「木が許す上限まで (Recommended)」 | `DG-3` の 15% は、行の木が許す上限（小 約 4%・中と大 約 10%）で止める | 9 節の表 S |
| `JDG-1017` | 「揃える（同じ日に始めてよい） (Recommended)」 | `BD-2` の FS の流しも同じ日に始めてよい | E-02 |
| `JDG-1023` | 「写しを最新に保つ・No Name は消す (Recommended)」 | 生成器が出荷する見本のバイト同一の写しを `sample-schedule/` に書く。`No Name.json` を消す | 決定 8・9.4 節 |

### 0.2 調べた結果（`842f3082`）

1. **「？」の出どころ。** 体が `documentFromMspdi`（`src/adapter/document-codec/mspdi-codec.ts:308`）と `diagnoseDelay`（`src/entity/document-model/schedule/delay-diagnostics.ts:873`）を scratch に束ね、`frame-loop.ts:429` と同じ呼び方で 7 本を読んだ。en と ja は同じ数である。

   | 見本 | タスク | 基準日 | `DG-1`（?） | `DG-2`/`DG-3`/`DG-4` | 指摘 | 壁 |
   |---|---:|---|---:|---|---|---|
   | 小 `sample-small-website-renewal` | 45 | 2026-08-26 | **34** | 0/0/0 | `VC-15` 6（5 タスク）・`VS-4` 2 | `DW-1` 5 |
   | 中 `sample-medium-sfa-webapp` | 134 | 2026-08-26 | **113** | 0/0/0 | `VC-15` 13（12）・`VS-4` 3・`VS-5` 3 | `DW-1` 12 |
   | 大 `sample-large-erp-program` | 256 | 2026-08-26 | **200** | 0/0/0 | `VC-15` 40（38）・`VS-4` 18・`VS-5` 5 | `DW-1` 38 |
   | `ProjectLibre.xml` | 2 | 無し | — | — | 診断しない（`DX-1`） | — |

   ⇒ `VC-15` 以外の `VC-` は 0。**「？」はすべて `VC-15` と、それを依存の下流へ広げる `DW-1` から来る。**
2. **`VC-15` の 59 件はどれも同じ形。** FS・遅れ 0 で、後続が先行の終わった **同じ日** に始まる —— 節目を先行の終了の時刻に置く（小 uid 7「Requirements Approved」は先行 uid 6 と同じ 2026-06-24）、12:00 に終わり 13:00 に始める（大 uid 76 と先行 uid 68・75、2026-07-03）。MS Project が FS で組むとこの形になる。
3. **仕様とコードの食い違い（`DFC-1490`）。** 表 T-310 の `VC-15`（`01-04-requirements.md:3418`）は「FS: 後続の `start` ≥ 先行の `finish` ＋ `lag`」で同じ日を許す。コードの `linkHolds`（`delay-diagnostics.ts:392-398`）は FS に `least = 1`（コメント「`ND-3` により FS は翌日」）を求め、SF は `least = -1` で式より 1 日緩い。同じ `linkHolds` を `VS-4`（`:589`）が使う。前向きの流し（表 T-313 の `BD-2`）の FS は `:744` で `nextWorkingDay(flow.projectedFinish)` を取る。⇒ 利用者は仕様の側（同じ日を許す）と裁定した（`JDG-1005` の ①・`JDG-1017`）。
4. **直した写し。** `least` を FS 0 にした scratch の写しでは、3 本とも `DG-1` 0・`VC-` 0。残るのは `VS-5`（中 3・大 5。要約タスクの `Stop` が基準日より後 —— データの誤り）だけで、`DG-2`・`DG-3`・`DG-4` も 0 ⇒ **診断しても何も出ない。** 「遅れはあるがふつうに管理された」見本にするには、データに遅れを入れる（9 節）。
5. **行の木の形（`OutlineLevel` を数えた）。** 小: 深さ 2（段 1 が 6・段 2 が 39、要約 6）。中: 深さ 3（11・83・40、要約 16）。大: 深さ 3（12・116・128、要約 37）。`DG-3` は `DG-2` の WBS の祖先にしか付かない（表 T-315）ので、上限は 小 2（4%）・中 14（10%）・大 26（10%）⇒ `JDG-1016`。
6. **出どころ。** 7 本は 1 回のコミット `2e2b0957`（2026-09-12「Publish sample-schedule …」）で追跡に入った。作った道具は木に無い。en と ja は行数が同じで、名と費用の欄だけが違う。
7. **見本を読む試験。** `tests/usecase/uc-harness.ts:73`（`readSample`、uc-002/006/007/009/010/014 が大を読む。uc-006 は遅れの 2 件を見る）、`tests/unit/cr-567-…test.ts:358`（大 ja: 257 の `Task`、37 行、最上位 12、1 行に最大 19）、`tests/unit/cr-569-…test.ts:331`（大 ja: 12 行、先頭の名 `1. プログラム管理`）、`tests/contract/cr-577-…test.ts:284`、`tests/system/cr-570-tree-state-stage.ts:17`、`tests/nfr/nfr-002-003-…test.ts:456`（小 en。`:453`・`:1710` の「`sample-schedule/` is untracked」は古い）。⇒ **行の木・タスクの数・名・ファイル名を保てば、どれも壊れない**（決定 3）。
8. **`ProjectLibre.xml` を指す仕様。** `FR-021` の注（`01-04-requirements.md:5861`・`:5863`）が「見本ファイル 7 つを読んだ」「見本の 7 つはどれも起点が 1」と数える。試験は読まない（`tests/unit/fr-021-…test.ts` は行を自前で持つ）。⚠️ ファイルの `<Manager>` 欄に人の呼び名らしい値がある。
9. **業界の語。** 題（`Core ERP Replacement Program`・`SFA System Development Project`・`Corporate Website Renewal`）、会社名、`Bank Payment Interface` など。⇒ `JDG-1015` で残す。`FR-027` の中立の規則はテンプレートと画面の例示に掛かり、`sample-schedule/` は仕様のどこにも出てこない（`grep` で 0 件）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-7`（遅延診断）／ `GL-009`** —— MS Project が組んだ計画で「？」が出なくなり、本物の矛盾・遅れ・ボトルネックだけが残る。見本を開けば、3 つの印（紫・炎・!!）と黄の遅れが全部見える。
- ⭐ **`CH-4`（すぐわか）** —— 案件ごとに量の違う 3 つの見本が、業界の語で「どんな案件か」を思い描かせる（`JDG-1015`）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— `VC-15` の式と `linkHolds`、`BD-2` と `:744` が食い違う（0.2 節の 3）→ E-01・E-02。
- **`R1.2`（検証できる表現）** —— 「同じ日は反しない」を式の横に書き、`ND-3` の読みとの関係を 1 文で言う → E-01・E-02。
- **数の主張（規則「数には測り方」）** —— `FR-021` の「7 つ」は `ProjectLibre.xml` を消すと偽になる → E-03・E-04。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 出荷する見本の中身（`startup-template.json` のバイト・表 T-226）は本書で触らない。生成器には、同じバイトの写しを書く出力を 1 つ足すだけ（決定 8） | `JDG-1001`「今の出荷時の見本はまだ触らない」 | — |
| 決定 2 | 見本の目標は仕様に書かず、見本を直す道具の原稿と、それを確かめる契約の試験に書く | 仕様は `sample-schedule/` を持たない（0.2 節の 9）。見本はアプリの振る舞いではなく、出荷物にも入らない。試験の置き場は 表 T-218 の `TS-2`（`tests/contract/`） | 仕様だけを読む者には見本の目標が見えない（9 節の表 S が本書に残る） |
| 決定 3 | 行の木・タスクの数・名・ファイル名・`UID` は変えない。変えるのは日付・実績・基準日・依存の遅れの値だけ | 0.2 節の 7。見本を読む試験がそのまま通る | 見本の骨組みは今のまま |
| 決定 4 | 業界の語は残す（題・会社名・タスク名） | `JDG-1015` | — |
| 決定 5 | en と ja は同じ手当てを当て、診断の数を同じにする | 0.2 節の 6（対の作り） | — |
| 決定 6 | SF の `least` も 0（式のとおり）にする | `JDG-1005` の ①「仕様の式のとおり」。SF の `-1` は式より緩い（0.2 節の 3） | SF で後続が先行の開始の前日に終わる形が、新しく `VC-15` になる。3 本の見本に SF は無い（体の測り） |
| 決定 8 | 生成器が出荷する見本と同じ回に、そのバイト同一の写しを `sample-schedule/<見本の題>.json` に書き、`--check`（`npm run gen:check`）で写しが同じかを見る。古い `Three-Year Product Plan.json` は、題が同じなら上書きされ、違えば（`CR-611` の後）消す。`No Name.json` は消す | `JDG-1023`。写しを手で置くと、今のように出荷する見本より古くなる | 生成器の出力が 1 つ増える |
| 決定 7 | `ProjectLibre.xml` は `git rm` で消し、`FR-021` の 2 つの注を「測った日」と「その後 1 つを消した」に書き直す | `JDG-1005` の ③ の後半。測りは歴史として真のまま残し、今の木の数を偽にしない | 起点 0 を書かないファイルの実物が木から消える（`2e2b0957` には残る） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所（`842f3082`） | 編集 |
|---|---|---|
| `VC-15` の同じ日 | 表 T-310 の `VC-15`（`01-04-requirements.md:3418`） | E-01 |
| `BD-2` の FS の同じ日 | 表 T-313 の `BD-2`（`:3495`） | E-02 |
| 「見本ファイル 7 つ」 | `FR-021` の注（`:5861`・`:5863`） | E-03・E-04 |
| 変えない | `ND-3`・`VS-4`（式は `VC-15` を指すだけ）・`DW-1`・`FR-027`・表 T-226・`MC-7` | — |

**数**: 仕様の文の編集 4（どれも `01-04-requirements.md`）。原稿 JSON の編集 0。`（MUST）` は増えない（7 節）。

## 2. 新しい識別子

無し。表・接頭辞・設定の行・状態機械・出来事は足さない。コードの側で足すファイルは、見本を直す道具 `tools/tune_mspdi_samples.py`（名は仮）と契約の試験 `tests/contract/cr-618-the-mspdi-samples-read-as-managed-projects.contract.test.ts`（名は仮）である（9 節）。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`842f3082`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `VC-15` の式だけ（同じ日の扱いを言わない） | `01-04:3418` | 式 ＋「同じ日は反しない」の 1 文 | E-01 |
| `BD-2` の FS の流し（翌日か同じ日かを言わない） | `01-04:3495` | 「FS の最早開始は先行の見込み終了と同じ日」の 1 文 | E-02 |
| 「見本ファイル 7 つを読んだ」 | `01-04:5861` | 測った日と、その後 1 つを消したこと | E-03 |
| 「見本の 7 つはどれも起点が 1」 | `01-04:5863` | 「測った 7 つはどれも起点が 1」 | E-04 |
| コード: `linkHolds` の FS `least = 1`・SF `least = -1` とそのコメント | `delay-diagnostics.ts:390-398` | FS・SS・FF・SF とも `least = 0` | 9 節 |
| コード: `BD-2` の FS の `nextWorkingDay(flow.projectedFinish)` | `delay-diagnostics.ts:744` | `flow.projectedFinish`（同じ日） | 9 節 |
| ファイル: `sample-schedule/ProjectLibre.xml` | — | 無し | 9 節 |
| 試験のコメント: 「`sample-schedule/` is untracked」 | `tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts:453`・`:1710` | 追跡している（`2e2b0957` から） | 9 節 |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 旧を新で置き換える。置き換える前に、旧がそのファイルに 1 回だけ現れることを数える（13 節。改行は正規化して比べる —— この木の `01-04-requirements.md` は CRLF と LF が混じる）。行の末の 2 つの空白も旧と新の一部である。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
表 T-310 の `VC-15`。旧
```text
| VC-15 | 5 | 予定の日付が依存の向きに反する（FS: 後続の `start` ≥ 先行の `finish` ＋ `lag`、SS: 後続の `start` ≥ 先行の `start` ＋ `lag`、FF: 後続の `finish` ≥ 先行の `finish` ＋ `lag`、SF: 後続の `finish` ≥ 先行の `start` ＋ `lag`） | 依存 ・ `start` ・ `finish` |
```
新
```text
| VC-15 | 5 | 予定の日付が依存の向きに反する（FS: 後続の `start` ≥ 先行の `finish` ＋ `lag`、SS: 後続の `start` ≥ 先行の `start` ＋ `lag`、FF: 後続の `finish` ≥ 先行の `finish` ＋ `lag`、SF: 後続の `finish` ≥ 先行の `start` ＋ `lag`）。<br>⭐ 日は日として比べ、4 つとも **同じ日は反しない** —— FS で先行の終わった日に後続が始まるのは、MS Project が FS で組んだ計画の形である（節目を先行の終了の時刻に置く、昼に終わり午後に始める）。<br>⛔ `ND-3` の「終了日はその日を含む」を、FS の 1 日の差に数えてはならない（MUST NOT） —— 矛盾は「必ずどちらかが誤り」の階級であり、正しく組んだ計画に付けると、`DW-1` が下流すべてを紫にする | 依存 ・ `start` ・ `finish` |
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
表 T-313 の `BD-2`。旧
```text
| BD-2 | 前向きに流す | 依存の `linkType` ・ `lag` と暦をそのままに、日付だけを実績と見込みへ差し替えて前向きに流し、各 `Task` の最早開始（`DQ-1` の基）を求める。<br>⭐ 最早開始は `start` を下回らない —— 依存だけから決めた最早開始が `start` より早いと、予定どおりに始めて予定どおりに終えたタスクに、自分で生んだ遅れが立ってしまう。<br>未着手の `Task` の最早開始は、さらに基準日を下回らない。<br>WBS の親（子を持つ `Task`）は自分で遅れを生まず（`DQ-3` は 0）、子の最も遅い見込み終了を自分の見込み終了とする —— 親を発生源に数えると、子の遅れを二重に数える |
```
新
```text
| BD-2 | 前向きに流す | 依存の `linkType` ・ `lag` と暦をそのままに、日付だけを実績と見込みへ差し替えて前向きに流し、各 `Task` の最早開始（`DQ-1` の基）を求める。<br>⭐ 依存が課す最早の日は 表 T-310 の `VC-15` の式と同じ読みとする —— FS の後続の最早開始は、先行の見込み終了と **同じ日** ＋ `lag` であり、翌稼働日ではない。<br>`VC-15` が同じ日を許すのに流しが翌日を求めると、FS で組んだ計画が、鎖を辿るごとに 1 日ずつ持ち込まれた遅れを持つ。<br>⭐ 最早開始は `start` を下回らない —— 依存だけから決めた最早開始が `start` より早いと、予定どおりに始めて予定どおりに終えたタスクに、自分で生んだ遅れが立ってしまう。<br>未着手の `Task` の最早開始は、さらに基準日を下回らない。<br>WBS の親（子を持つ `Task`）は自分で遅れを生まず（`DQ-3` は 0）、子の最も遅い見込み終了を自分の見込み終了とする —— 親を発生源に数えると、子の遅れを二重に数える |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`FR-021` の注。旧
```text
⭐ 実測（見本ファイル 7 つを読んだ）: MS Project は `OutlineLevel` 0 の行をちょうど 1 つ書き（`UID` 0・`ID` 0・`OutlineNumber` 0 —— プロジェクトの要約タスクである）、ProjectLibre は 1 つも書かない（`UID` は 1 から）。  
```
新
```text
⭐ 実測（2026-09 に見本ファイル 7 つを読んだ —— そのうち ProjectLibre の書いた 1 つは 2026-10-01 に `sample-schedule/` から外し、実物はコミット `2e2b0957` に残る）: MS Project は `OutlineLevel` 0 の行をちょうど 1 つ書き（`UID` 0・`ID` 0・`OutlineNumber` 0 —— プロジェクトの要約タスクである）、ProjectLibre は 1 つも書かない（`UID` は 1 から）。  
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`FR-021` の注。旧
```text
⇒ 要約タスクを起点に数えないので、見本の 7 つはどれも起点が 1 になる。  
```
新
```text
⇒ 要約タスクを起点に数えないので、測った 7 つはどれも起点が 1 になる。  
```

## 5. 継ぎ目 —— 仕様だけを読む試験の体に渡す

⭐ 体どうしの継ぎ目の名は、両方の依頼文にこのまま書く。

| 継ぎ目 | 名（逐語） | 何 |
|---|---|---|
| SEAM-1 | `diagnoseDelay(document, calendar)`（`delay-diagnostics.ts:873`、今の名のまま） | 診断の入口。試験は見本を `documentFromMspdi` で読み、これに渡す |
| SEAM-2 | `sample-schedule/sample-{small-website-renewal,medium-sfa-webapp,large-erp-program}.{en,ja}.xml` | 見本の 6 本。名は変えない |

仕様だけを読む試験の体が書く試験（どれも仕様の行を名指す）:

| # | 試験 | 読む仕様 | 期待 |
|---|---|---|---|
| T1 | FS・遅れ 0、後続の `start` が先行の `finish` と同じ日 | `VC-15`（E-01） | 指摘 0、`DG-1` 0 |
| T2 | 同じ形で、後続の `start` が先行の `finish` の前日 | `VC-15` | `VC-15` 1、後続と下流が `DG-1`（`DW-1`） |
| T3 | SS・FF・SF で、比べる 2 つの日が同じ日 | `VC-15` | 指摘 0 |
| T4 | SF で、後続の `finish` が先行の `start` の前日 | `VC-15`（決定 6） | `VC-15` 1 |
| T5 | 実績の列で T1・T2 と同じ形 | `VS-4` | T1 の形は 0、T2 の形は `VS-4` 1（`DG-1` は付けない —— 疑義） |
| T6 | FS・遅れ 0 の 3 段の鎖（予定どおり、同じ日に続く）を、基準日を最後の終了の後にして診断 | `BD-2`（E-02）・表 T-314 | どの `Task` も `DQ-2` 0、終端の遅れ 0、`DG-2` 0 |
| T7 | T6 の 1 段目だけ 3 稼働日遅れて終わる | `BD-2`・`BD-4` | 1 段目が `DQ-3` 3・`DG-2`、下流は `DQ-2` 3 の巻き添え |
| T8 | 6 本の見本それぞれ | 9 節の表 S（本書） | 表 S の数に、許す幅の中で合う。en と ja は同じ数 |
| T9 | `sample-schedule/` のファイルの一覧 | 決定 7・決定 8 | `ProjectLibre.xml` と `No Name.json` が無い |
| T10 | `sample-schedule/` の JSON | 決定 8 | ちょうど 1 つで、名は出荷する見本の `Project.title` ＋ `.json`、バイトは `src/framework/single-html-shell/startup-template.json` と同じ |
| T11 | 生成器の `--check` | 決定 8 | 写しが古いと 0 でない値で終わる |

⚠️ T8 は仕様ではなく本書の表 S を読む（決定 2）。試験の名に `CR-618` を入れる。

## 6. グラフ（`842f3082`）

`python .claude/skills/spec-graph-check/impact.py VC-15 BD-2 VS-4`:

| 種 | 指されている数 | 読み |
|---|---|---|
| `VC-15`（表 T-310、`01-04:3418`） | 要求 1 ／ 参照 1（`FR-131` の表 T-311 `VS-4` の行 `:3430`） | `VS-4` の式は `VC-15` を指すだけなので、E-01 がそのまま掛かる —— `VS-4` の文は変えない |
| `BD-2`（表 T-313、`01-04:3495`） | 0 ／ 0 | 表の中だけで読まれる |
| `VS-4`（表 T-311、`01-04:3430`） | 0 ／ 0 | — |

`FR-021` の 2 つの注（E-03・E-04）は、どの行 ID も指さない散文である。⇒ 本書の編集は 4 つとも、ほかの行の真偽を変えない。

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 | 後 |
|---|---:|---:|
| `01-04-requirements.md` の `（MUST）` | 当てる日に測る | 変わらない |
| `（MUST NOT）` | 当てる日に測る | ＋1（E-01） |
| 表 T-310 の行 | 15 | 15 |
| `sample-schedule/` のファイル | 9 | 7（`ProjectLibre.xml` と `No Name.json` を消す。JSON の写しは 1 つのまま） |

⭐ **当てた後の実測**（`samples-cr618`、`grep -c` と `ls`）: `01-04-requirements.md` の `（MUST NOT）` は 731 → 732（＋1）。`sample-schedule/` のファイルは 9 → 7。

## 8. 波 —— 持ち場で割る

| 波 | 持ち場（ファイル） | 毎フレーム | 中身 |
|---|---|---|---|
| W0 | ― | ― | 当てる木で 4 節の旧をもう 1 度数える（4 件とも 1 回）。`CR-611`・`CR-612` が当たったかを見る —— どちらも本書の旧と触るファイルに重ならない |
| W1 | `docs/spec/01-04-requirements.md` | ― | E-01 〜 E-04 |
| W2 | `src/entity/document-model/schedule/delay-diagnostics.ts` | いいえ（診断を押したときと、診断中の文書の変化） | `linkHolds` と `:744`（9 節）。仕様だけを読む試験の体 T1 〜 T7 を横に置く |
| W3 | `sample-schedule/*.xml`・`tools/tune_mspdi_samples.py`（新） | いいえ | 見本を直す（9 節の表 S）。W2 の後（直した診断で数える） |
| W4 | `tests/contract/cr-618-…`（新）・`tests/nfr/nfr-002-003-…`（コメント 2 か所） | いいえ | T8〜T11、古いコメント |
| W5 | `tools/generate_startup_template.py`・`sample-schedule/*.json` | いいえ | 写しを書く出力（9.4 節）。⚠️ 生成器は `CR-611`（題）・`CR-612`（`MC-10` の測る文書）も触る —— **W5 だけは両方の後に当てる**（題が決まってから写しの名が決まる） |

⭐ **`CR-611`・`CR-612` との順**: 仕様の旧は重ならない（`CR-611` は `FR-095`・表 T-036 ・`FR-086`・`QN-5`・`RD-7`、`CR-612` は `IO-7`・`OP-1`・`FR-027`・表 T-226 の注・`FR-067`・`MC-10`）。⇒ W0〜W4 は **順を問わない**。⚠️ W5 だけは生成器 `tools/generate_startup_template.py` を `CR-611`・`CR-612` と共にするので、**2 つの後** に当てる（`startup-template.json` のバイトは本書では変わらない）。
⚠️ **遅延診断の他の変更要求との順**: セッション「Specify delay-diagnostics marker colours and a report」が同じ `delay-diagnostics.ts` の周りを起草している（2026-10-01）。W2 はその変更要求と同じ持ち場なので、調整役が順を決める。

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`842f3082` の行番号）

### 9.1 コード（`DFC-1490`）

- `src/entity/document-model/schedule/delay-diagnostics.ts:390-398` —— `linkHolds` の `least` を 4 つとも `0` にし、コメント「`ND-3` により FS は翌日、SF は前日を許す」を「`VC-15` の式のとおり、同じ日は反しない（E-01）」に替える。`VS-4`（`:589`）は同じ関数なので同時に直る。
- 同じファイル `:744` —— `case FINISH_TO_START: return nextWorkingDay(facts.calendar, flow.projectedFinish)` を、同じ日（`flow.projectedFinish`）に替える（E-02）。⚠️ `lag` の足し方と、ほかの 3 つの型の境（`:740-750`）は、E-02 の「`VC-15` の式と同じ読み」に合わせて読み直す。
- 当てる体は `grep -n "nextWorkingDay\|least" delay-diagnostics.ts` で、同じ読みの箇所がほかに無いかを数える。
- ⭐ **当てた変更**（`84eb19e5` の行番号。`CR-616`・`CR-617` が後で同じファイルを触るので、ここに全部を書く）: ① `:389` のコメント（`ND-3` の読み）を「日は日として比べ、同じ日は反しない（`VC-15`）。`ND-3` は見せ方だけ」に替えた ② `:393` FS の `least` 1 → 0 ③ `:396` SF の `least` -1 → 0 ④ `:744` FS の `nextWorkingDay(facts.calendar, flow.projectedFinish)` → `flow.projectedFinish` ⑤ `:746` SF の `startFor(dateFromWorkingDays(facts.calendar, began, -1))` → `startFor(began)`（決定 6 と E-02 の「`VC-15` と同じ読み」に揃えた）⑥ `:15` 使わなくなった `nextWorkingDay` の import を外した。`grep` で数えた同じ読みの箇所は、この 5 つのほかに 0。`lag` は今も読まない（`:334` の STOP のまま —— 本書の外）。

### 9.2 見本（表 S）

⭐ **表 S — 見本が診断で出すもの**（基準日は各ファイルの `StatusDate`。数は `diagnoseDelay` の `DG-` ごとの `Task` の数。9.1 を当てた後に数える）

⚠️ **当てたときに書き直した（`JDG-1040`、2026-10-01）。** 起草の表は `DG-2` を 5%（小 2・中 7・大 13）、`DG-3` の上限を「ボトルネックの数 × 祖先の段の数」（小 2・中 14・大 26）としていた。当てる体が測ると、どちらもこの計画の形では届かない:

- **`DG-3` の木の上限**は、ボトルネックが互いに違う祖先を持つときの、違う祖先の数である。中は段 2 の要約が 5 つ（どれも「5 Iterative Development」の下）しかないので、ボトルネック 7 つでも 5 ＋ 段 1 の 3（5 と、ほかの 2 つ）＝ **8**。大は段 2 の要約 25 のうち 13 を、段 1 の親 6 つにまたがって選んで 13 ＋ 6 ＝ **19**。小は段 1 の要約 2 つで **2**。
- **`DG-2` が立つ所**は、着手済みで予定の終了が基準日より前の葉から、押し出しが終端（後続の無い `Task` とマイルストーン）まで届く所だけである（表 T-313 の `BD-1`・`BD-4`）。見本の計画はフロートが多く（大）、作業がほぼ直列で（中・小）、数日の遅れが終端へ届く独立した鎖は、どの基準日でも 小 2・中 2 〜 3・大 11 しか無かった（測り方は 13 節）。
- 利用者は「データが許す量で止める」と裁定した（`JDG-1040`）—— 遅れは数日のまま、「ふつうに管理された」見た目を優先し、計画の日付は変えない。下の表は、その量を当てた木で測った数である。

| 見本（en と ja は同じ数） | タスク | 基準日 | `DG-2` ボトルネック | `DG-3` 経路（木の上限） | `DG-1` 紫（広がりを含む） | `DG-4` 遅れ | 指摘（表 T-310〜T-312） |
|---|---:|---|---:|---:|---:|---:|---|
| 小 `sample-small-website-renewal` | 45 | 2026-10-09 | 2（4.4%） | 1（上限 2） | 2（4.4%） | 1 | `VC-5` 1（紫の種）だけ |
| 中 `sample-medium-sfa-webapp` | 134 | 2026-09-09 | 2（1.5%） | 3（上限 8） | 7（5.2%） | 2 | `VC-5` 1（紫の種）だけ |
| 大 `sample-large-erp-program` | 256 | 2026-12-09 | 11（4.3%） | 14（上限 19） | 13（5.1%） | 9 | `VC-5` 1（紫の種）だけ |

- **許す幅**: `DG-2` と `DG-1` は表の数 ±1。`DG-3` は表の数 −2 から木の上限まで。`DG-4` は 1 以上。指摘は `VC-5` がちょうど 1 で、ほかの行（`VS-5` を含む）は 0。T8 はこの幅で見る。
- **小の `DG-3` が上限 2 に届かない理由**: 小の計画は 1 本の鎖（中身 → 構築 → 試験 → 公開）であり、同じ基準日に別々の段 1 の下で 2 つを遅らせると、上流の遅れが下流の着手を止める（下流は遅れて待つ `DG-4` になり、ボトルネックにならない）。
- **置いたもの**（`tools/tune_mspdi_samples.py` の `TREATMENTS`。en と ja に同じ表）:
  - 小: 基準日 2026-10-09。遅れて走る「Performance Tuning」（uid 34）と「Defect Fixing」（uid 35）—— どちらも押し出し 1 稼働日。紫の種は「Operations Handover」（uid 44、未着手なのに進捗 10%）→ 下流 1 と合わせて 2。
  - 中: 基準日 2026-09-09。遅れて走る「Monitoring and Log Collection Setup」（uid 35、押し出し 5）と「Code Review and Refactoring - Account and Contact」（uid 43、押し出し 1）。紫の種は「Cutover Rehearsal」（uid 128）→ 下流 6 と合わせて 7。
  - 大: 基準日 2026-12-09。遅れて走る「Steering Committee #5」（uid 11、押し出し 17）、4 つの「Playback Session」（uid 87・98・109・120、押し出し 5・10・10・10）、6 つの「Interface Connection Test」（uid 128・132・136・140・144・148、押し出し各 2）。紫の種は「Production Data Migration - Wave 2」（uid 243）→ 下流 12 と合わせて 13。
- **紫の作り方**: 元の矛盾（表 T-310）は 1 〜 3 件にとどめ、依存の鎖の末の方に置いて、`DW-1` の広がりを含めて表 S の数にする。⭐ ボトルネックの鎖とは別の鎖に置く —— `DW-1` は下流の前向きの計算を止めるので、ボトルネックの下流に置くと押し出しが消える。矛盾の種は、ふつうの管理で起こる入力の誤りから選ぶ（例: `VC-13` 先行が未完了なのに後続が完了、`VC-6` 終了の実績だけがある）。
- **ボトルネックの作り方**: 着手済みで未完了の `Task` の予定の終了を基準日より前にする（`BD-1` の `max(finish, 基準日)`、表 T-313）か、終わった実績を予定より後ろにし、後続の鎖で終端を押させる（`S-397` = 1 稼働日以上）。⭐ `DG-3` を上限まで出すため、ボトルネックを **別々の要約タスクの下** に散らす。
- **ふつうの管理**: 残りの `Task` は、基準日より前は予定どおりに終わった実績、基準日をまたぐものは着手済みで予定の範囲、後ろは未着手とする。`VS-5`（中 3・大 5、要約タスクの `Stop` が基準日より後）は直して 0 にする。
- **道具**: `tools/tune_mspdi_samples.py`（名は仮）が、今の 6 本を読み、手当てを **`UID` ごとの表として原稿に持ち**、決まった順で書き戻す（同じ入力から同じバイト）。`--check` で書き戻しが今のファイルと同じかを見る。行の木・タスクの数・名・`UID`・ファイル名は変えない（決定 3）。en と ja に同じ表を当てる（決定 5）。⛔ 数（表 S）を道具の中で決め打ちに数えさせない —— 数えるのは T8（実際の `diagnoseDelay`）である。
  - ⭐ 当てた道具の読み（2026-10-01）: 表は 基準日・遅れて走る葉・紫の種 の 3 つだけを持つ。表が名指さない葉は、基準日まで **予定どおり** に進める（終了が基準日までなら完了、開始が基準日までなら着手、ほかは未着手）。着手していない・終わっていない葉が後続を止める形は、道具がリンクを不動点まで辿って導く（FS の先行が未完了なら着手しない、SS・FF の先行が未着手なら着手しない、どの型でも先行が未完了なら完了しない —— `VS-3`・`VC-13` を生まない）。変えるのは実績の欄と、`StatusDate`・`CurrentDate`・`LastSaved` の日付だけで、計画の日付・リンク・行は変えない。
  - ⭐ 当てた前の 6 本は、基準日 2026-08-26 に対して、この「予定どおり」とバイトまで一致していた（処置を空にして走らせると、変わるのは下の `VS-5` の要約の実績期間だけだった）。
  - `VS-5`（中 3・大 5）は、要約タスクの `ActualDuration` から取り込み側が導く `stop` が基準日を越えていたもの。道具は要約の実績期間を基準日までに切る（取り込み側と同じ日の丸めで比べる）。
- **消すファイル**: `sample-schedule/ProjectLibre.xml`（決定 7）。

### 9.4 出荷する見本の写し（決定 8、`JDG-1023`）

- `tools/generate_startup_template.py` の出力（`OUT`、`:106-107`）に、`sample-schedule/<PROJECT_TITLE>.json` を 1 つ足す。中身は `OUT` と **バイト同一**（同じ文字列を 2 か所へ書く）。`--check` は 2 つとも比べる。
- 名は `PROJECT_TITLE`（`:900`）＋ `.json`。`CR-611` の後は `Sample Project - Press N to start a new one.json` になる（`CR-611` の 0.2 節の 12 が言う保存の名の案と同じ形）。
- `sample-schedule/Three-Year Product Plan.json` と `sample-schedule/No Name.json` を消す（写しは生成器が書き直す）。

### 9.3 試験

- 新: `tests/contract/cr-618-the-mspdi-samples-read-as-managed-projects.contract.test.ts`（T8・T9）。
- 直す: `tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts:453`・`:1710` の「`sample-schedule/` is untracked」（`2e2b0957` から追跡している）。
- 見る: `tests/usecase/uc-006` は大の見本の遅れの 2 件（遅れて走る 1・遅れて待つ 1）を見る。表 S の手当てで数が変わるなら、uc-006 の期待を表 S に合わせる（`DG-4` は「1 件以上」なので、2 件を保つ手当てを先に探す）。
- ⭐ **当てた試験**（2026-10-01、仕様と本書だけを読む体 3 つ。当てた体は書いていない）:
  - 新 `tests/unit/cr-618-same-day-links-hold.test.ts`（T1 〜 T7、49 件緑）。壊し試験（合流した木で）: `linkHolds` の FS の `least` を 1 に戻すと 19 件が赤、`BD-2` の FS を `nextWorkingDay` に戻すと 2 件が赤、戻すと 49 件緑。
  - 新 `tests/contract/cr-618-the-mspdi-samples-read-as-managed-projects.contract.test.ts`（T8・T9、42 件緑。T8 は書き直した表 S を見る）。T10・T11 は W5 と共に書く。
  - 直した `tests/contract/cr-561-the-delay-diagnostics-report.contract.test.ts` の 4 件 —— 翌稼働日に始まる FS の後続を持つ組で、旧い `BD-2`（翌稼働日）の読みの数（押し出し 5・確定した押し出し 2）を持っていた。新しい `BD-2` では 4・1 になる（`DFC-1620` の副作用）。体は期待値を変えず、後続の開始を先行の終了日へ移して、同じ日の FS の組にした（64 件緑）。
  - `tests/usecase/uc-006` は走らせていない（e2e）。uc-006 が数えるのは遅れの「件」ではなく印の形の種類なので、`DG-4` が 9 件になっても期待は変わらない（読んだだけ）。

## 10. ⛔ この変更でやらないこと

- ⛔ 出荷する見本（`FR-027`・表 T-226・`startup-template.json`・生成器）を触らない（`JDG-1001`）。題は `CR-611` の決定 9 が変える。
- ⛔ 業界の語を中立の語に替えない（`JDG-1015`）。
- ⛔ 行の木を深くしない（`JDG-1016`）。
- ⛔ `ND-3`（画面が見せる日）を変えない —— 変えるのは診断の比べ方だけ。

## 11. 前に立つ者へ返す問い

| 問い | 案 | 推し |
|---|---|---|
| ~~問い 1 —— `sample-schedule/` の JSON の写し 2 つ~~ | 答えを得た（`JDG-1023`）: 写しを最新に保ち、`No Name.json` を消す | 決定 8・9.4 節 |
| **問い 2 —— `DG-4`（黄の遅れ）の量** | 利用者は `DG-2`・`DG-3`・`DG-1` の量だけを言った。表 S は「1 件以上」とした | 当てる体が表 S を満たしたときの数を報告し、利用者に見せる。⭐ 当てた数: 小 1・中 2・大 9（en/ja 同数。遅れて走る葉に止められて、予定の開始を過ぎても待っている後続） |
| 問い 3 —— `BD-2` の同じ日の副作用 | 答えを得た（`JDG-1041`）: 裁定どおり当て、副作用は `DFC-1620` に残す | MS Project のふつうの FS（17:00 に終わり翌朝に始める）では、押し出しが 1 リンクごとに 1 稼働日ずつ減る。時刻で比べる形への変更は別の変更要求で決める |

## 12. 台帳（前に立つ者が起こす。本書は番号を取らない —— 下は起草のセッションが既に起こした行）

| 行 | 何 | 状態 |
|---|---|---|
| `DFC-1490` | `VC-15`・`VS-4`・`BD-2` の FS の同じ日 | `仕様待ち`（本書で閉じる） |
| `JDG-998`・`JDG-1001`〜`JDG-1005`・`JDG-1015`〜`JDG-1017`・`JDG-1023` | 0.1 節 | 指示 —— 調整役が投入時期を決める（`JDG-1002` は覆された、`JDG-1004` は適用済） |
| `JDG-1040`・`JDG-1041` | 当てる体が問うた 2 問（表 S の量、`BD-2` の副作用） | 適用済（本書が当てた） |
| `DFC-1620` | `BD-2` の同じ日の FS が、翌朝に始まる FS の鎖で押し出しを 1 リンクごとに 1 日減らす | `仕様待ち`（別の変更要求） |

## 13. 測り方の再現

```text
# the tree: refactor 842f3082 (worktree of branch sample-and-folders)
# old blocks of section 4 appear once each (CRLF normalised to LF on both sides; str.count)
#   E-01..E-04: blocks=4 once=4
# graph
python .claude/skills/spec-graph-check/impact.py VC-15 BD-2 VS-4
# outline shape of the samples (section 0.2 item 5)
#   count <OutlineLevel> per <Task> (UID 0 dropped) and <Summary>1</Summary> in each .en.xml
# diagnosis counts (section 0.2 items 1 and 4)
#   a scratch entry, bundled with ../../../node_modules/rolldown/bin/cli.mjs outside the repository,
#   calls documentFromMspdi(xml, startupTemplate) then diagnoseDelay(doc, workingCalendarOf(schedule))
#   the same way frame-loop.ts:429 does; a second copy sets linkHolds' FS least to 0
# references
git grep -n "sample-schedule" -- tests
git grep -n "ProjectLibre" -- tests src tools docs/spec
```

⭐ 当てたときの測り方（`samples-cr618`）:

```text
# the samples
python tools/tune_mspdi_samples.py            # writes the six files from TREATMENTS
python tools/tune_mspdi_samples.py --check    # 0: the files are what the table writes
# table S counts
#   a scratch entry, bundled with ../../../node_modules/rolldown/bin/cli.mjs outside the repository,
#   calls documentFromMspdi(xml, startupTemplate) then diagnoseDelay(doc, workingCalendarOf(schedule))
#   and counts markerStates per row and findings per row, for each of the six files
#   the same numbers came from the built app: vite build into a scratch folder, a Playwright probe
#   drops each file on the page and reads the markers (section 9.2)
# where DG-2 can stand (section 9.2)
#   for each candidate status date, each leaf due within about three weeks before it is made late
#   on its own copy (the rest progressed on plan), and the copy is diagnosed; a leaf counts when it
#   becomes DG-2. small: 2026-09-08 .. 2026-10-28, medium: 2026-09-09 .. 2027-03-10,
#   large: 2026-08-26 .. 2027-01-13
# DG-3 tree ceiling: distinct WBS ancestors when every bottleneck takes a different level-2 summary
#   count <Summary>1</Summary> per <OutlineLevel> and their parents
```
