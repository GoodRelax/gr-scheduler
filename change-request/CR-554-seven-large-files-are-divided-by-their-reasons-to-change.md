# CR-554 — 大きなファイルを調べ、7 本を変更の理由で割る計画（段 7.5）

> ⭐ **状態: 計画（未適用）。**
> 2026-09-23 起草。
> 10 節の問い 1 は同じ日に利用者が答えた（案 A）。
> ⭐ **2026-09-24、当てる前に `c48f9736` で測り直した。**
> ⛔ **測り直した値と前に立つ者の判断は 15 節にある。**
> ⛔ **15 節が 1〜9 節と食い違うところは、15 節が勝つ。**
> ⭐ **2026-09-25、確定した割り方を 15.6 に書いた（利用者の了承）。**
> ⛔ **15.6 が 4 節・15.4 と食い違うところは、15.6 が勝つ。**
> 1〜9 節は `a912f4ea` の値のまま、調べた時の記録として残す。
> **本書は調査と計画だけである。`src/` のファイルを 1 つも割らず、動かさない。**
> 読んだ木: `a912f4ea`（ブランチ `refactor` の先端）。
> **行数・範囲・共変の数・読み手の数は、すべてこの木で測った。** 他の変更要求や `handoff.md` の数を引いたときは「引いた」と書く。
>
> **開くもの**: 計画の段 7.5「大きなファイルの分割」（`docs/development-records/handoff.md` の冒頭の節の 4）。
> `JDG-48` により、`src/` に新しいファイルを置くには、先に 表 T-075 がその行を持たねばならない。
> 本書は、どのファイルを割り、どれを割らないかを証拠つきで決める。割るファイルについては継ぎ目・新しい行 ID・波の順・各波が書き換える検査と基準線を定める。
>
> ⛔ **割る作業の入口の条件（MUST）**: `CR-551`（波 0〜3）・`CR-552`（最小描画幅）・`CR-553`（行の縦幅）と、`handoff.md` の 1 通目の 2 の ① の後続 H2〜H10（とくに `frame-loop.ts` を触る H3・H4・H7・H8・H9）が着地してから始める。
> **始める時に、本書の数をすべて測り直すこと（MUST）**（6.1）。
> 本書の行番号は `a912f4ea` のものである。割る体は、範囲を束ねる**関数名**で引き直す。
>
> **⛔ 本書が絶対にしないこと**: `src/`・`tests/`・`docs/spec/`・`.claude/skills/spec-graph-check/function-size-baseline.txt`・`tools/` の編集。
> 表の行・基準線・生成器の名簿は、分割そのもののコミットが書き換える（7 節）。
>
> **型**: `CR-439`（1 ファイルの分割の型、とくに 4.3 の閉包の出し方と 8 節の波）、`CR-432` の 4.1（S1〜S5 と共変の数え方）、`CR-438` の 4.4 と 15 節。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⚠️ **直に前へ進めるものは無い。利用者が画面で気づく変化は 0 である。**
表 T-054 の `CH-1` 〜 `CH-6` のどれにも、`GL-001` 〜 `GL-008` のどれにも直には結ばない。
本書は作り方の側の手入れである（`CR-432`・`CR-439` の 0 節 ① と同じ答え）。

⭐ 間接の結びは 1 つある —— 利用者の目的（2026-09-21、`CR-432` の 4.1 に逐語）「目的はとにかく変更に強くすること。」である。
変更要求は要求 ID を名指して来る。
割ったあと、要求ごとに最初に開くユニット（表 T-075 の「負う要求」の欄）がその要求の規則を持ち、ほかの要求の規則をほとんど持たないこと —— これが本書の物差しである。
`JDG-284` の ②（「起点の共有」）で数えると、割る 7 ファイルの範囲で、起点を別の要求と共有する要求は **34 件 → 15 件**になる（継ぎ目を出さない `OW-4` を除くと 29 件 → 10 件。1.2）。
`CH-3`（ぬるサク）の速さは、段 8 で 1 度だけ測る（`JDG-291`）。本書はそれを動かさない。

### ② レビュー観点のどの条項を当て、何が出たか

- `R2.2`（設計 ・ **MUST** ・ 1 ユニットが単一の変更理由）—— `docs/development-rules/07-review-standards.md`。
  ⛔ **7 ファイルで違反している。**
  `schedule-layout.ts`（`UF-5`）は 1 行で 10 の要求を負い、`schedule-geometry.ts`（`UF-6`）も 10 を負う。
  `frame-loop.ts`（`UF-48`）の `// see` は FR/NFR を 33 名指し、そのうち 28 は起点が別の行である（4.1）。
- `R2.2b`（設計 ・ **MUST** ・ 上位の責務は要約であり総和ではない）—— ⛔ `frameLoop` は 2,525 行・分岐 4 の閉包で、直下の関数 125 と `let` 37 を抱える入れ物である（`handoff.md` の 1.1 と同じ読み）。
  ⇒ 閉包の中の塊を、表ごとの兄弟へ工場か関数として出す（4.1）。
  残る閉包はおよそ 1,460 行・`let` 20 で、フレームの 1 周期を持つ。まだ大きいので 10 節で問い、利用者は案 A（いまは縮めない）を選んだ。
  ⭐ `agentApiMembers`（345 行・分岐 0）は入れ物ではない —— 18 のメンバの本体の和が 305 行で、関数そのものは 40 行である（4.9）。
- `R2.2a`（設計 ・ **MUST** ・ 責務文の 5 段の試験）—— 割る 7 ファイルで提案するすべてのユニットに当て、畳んだ句と (a)(b)(c) を 4 節の各表に書いた。
- 表 T-276 の `UD-1`（変更の理由）—— ⭐ **本書の芯である。**
- 表 T-276 の `UD-3`（純粋性は割らない理由にならない）—— `Entity` の 3 ファイル（`schedule-layout.ts`・`schedule-geometry.ts`・`item-hit-area.ts`）と `schedule.ts` は `pure` だけのファイルだが、`UD-1` で割る。
- 表 T-276 の `UD-4`（割り方はコードの位置で裏づける）—— 割るファイルのすべての行が、ちょうど 1 つのユニットに落ちることをスクリプトで確かめた（重なり 0、漏れ 0。13 節）。
- 表 T-276 の `UD-5`（迷いの試験）—— 4 節の各ファイルで当てた。
- `R2.9`（要らないうちは作らない）—— 50 行未満の兄弟が 9 つ出る（`label-width.ts` 14・`plan-actual-state.ts` 17・`percent-label.ts` 20・`dual-cursor.ts` 20・`task-delay.ts` 34・`guides.ts` 39・`marquee.ts` 39・`assignee-label.ts` 41・`row-scroll.ts` 46）。
  ⭐ `JDG-284` の ①（「50 行未満の小さい兄弟もまとめない」）に従う。
- `R2`（名前を足すときは必ず引く）—— ⭐ **新しい接頭辞・新しい表・新しい図は 0 である。**
  足すのは 表 T-075 の行（`UF-126` 〜 `UF-168`）と 表 T-063 の行（5 行。番号は当てる直前に調整役から取る —— 5 節）だけである。

### ③ 利用者に問わずに決めたこと

⭐ 下の 12 個は、根拠を添えて利用者に問わずに決めた（あとから覆せる）。

1. **割らないファイルを 10 本とした**（4.2・4.9）。
   `field-editing.ts`・`import-document.ts`・`screen-values.ts`・`file-flow-values.ts`・`document-settings.ts`・`properties-panel.ts`・`input-command-translator.ts`・`dom-screen-surface.ts`・`svg-renderer.ts`・`agent-api-members.ts` の 10 本である。
   どれも、共変が継ぎ目を拒んだか、要求の持ち主が継ぎ目を出さなかったか、証拠が下限に遠い。
2. **`fieldEditingOf`（469 行）は割らない**（4.2）。
   `CR-439` の 12 節の前提「段 7 の状態機械が 14 の `let` を引き取る」は崩れていた。`CR-480` の 2 節が、その `let` をすべて「外 —— 段 6 の持ち場」と分類したからである。
   ⇒ `JDG-391` と `CR-551:1346` の「段 7.5 の分割を待つ」は、本書で「割らない」に閉じる。`HELD` の行は `JDG-54` の下で合法のまま残る。
3. **生成の区画は、類として出力先を変えない**（3 節）。
   例外は 2 つだけである —— `schedule.ts` と `json-codec.ts`。どちらも、手書きの側が割れて、区画を読む手が別のユニットへ移る場合である。
4. **`json-codec.ts` の形式上の拒み（生成 〜 古い版 0.60、5 件中 3 件）を当てない**（4.7）。
   生成の範囲は人が開かず `npm run gen` が書くので、割っても手で開くファイルの数は増えない。`CR-432` の 4.1 の閾値の理由「2 ファイルを開かねばならない変更が増える」が成り立たない。
5. **`frame-loop.ts` の継ぎ目は、表 T-075 の欄だけでなく、`// see` が名指す表でも立てた**（4.1）。
   欄だけで立つ継ぎ目は `FR-102` の 1 つしかない。前例は `CR-438` の 0 節 ③ の 1 である。
6. **`frame-loop.ts` の入口の 3 つの処理（入力の受け取り・命令の振り分け・フレームの走行）は割らない**（4.1）。
   互いの共変は 0.54〜0.59（小さい側 56〜57 件）で、S2 が拒む。
7. **`schedule-geometry.ts` のハイライトを `task-figures.ts` に入れた**（4.4）。
   拒みの 3 つは、レビューの一斉手直し `e1bb8c8f` に掛かっている。規則（コードを変え、誕生でないコミットは数える）どおりに数えて判じた。感度は 4.4 に書いた。
8. **`FR-057` は `OW-1` のまま `mspdi-codec.ts` に置く**（4.8）。
   往復の写しが「最初に開くユニット」である。`UF-36` の責務の欄に兄弟の名を書き、1 ホップで着けるようにする。
9. **`item-hit-area.ts` は兄弟 2 つだけを出す**（4.5）。
   表 T-075 の共有は 2 のまま減らないが、`UD-1` と `JDG-284` の ① に従う。得るのは `UD-5` の答えの明確さである。
10. **外から読まれる名は、入口がすべて出し直す**（`export { … } from './…'`）。フォルダの外の取り込みの文は 1 行も変えない。
    `export *` は使わない —— 検査 26b（`check-published-members.py`）が読めない。
11. **表 T-063 の `UT-6` は行を増やさず書き直す**（`frame-loop.ts` の兄弟は `SingleHtmlShell` の既存の行に加える）。
    ほかの 5 つのコンポーネントは行を 1 つずつ足す。
12. **割る作業の順は、ファイルごとの「着地を待つもの」で決めた**（6 節）。`Entity` と `Adapter` が先で、`frame-loop.ts` が最後である。

---

## 1. 読んで確かめた事実（`a912f4ea` で測った）

### 1.1 大きなファイルの上位と、生成の区画

測り方: `git ls-files src | grep '\.ts$' | xargs wc -l | sort -rn`。
「生成」は、`// <generated -- do not edit by hand>` から `// </generated>` までの行数である（2 つの印の行を含む）。
`src/` の `.ts` は **114** である（表 T-074 の `SU-3`、表 T-075 の行の数、`tests/contract/units.contract.test.ts:50-51` の数と一致）。

| # | ファイル | 全 | 手書き | 生成 | 行 ID | 判定 | 節 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `src/framework/single-html-shell/frame-loop.ts` | 4,760 | 4,683 | 77 | `UF-48` | ⭐ **割る**（入口 ＋ 兄弟 12） | 4.1 |
| 2 | `src/adapter/document-codec/mspdi-codec.ts` | 2,023 | 2,023 | 0 | `UF-36` | ⭐ **割る**（入口 ＋ 兄弟 4） | 4.8 |
| 3 | `src/entity/document-model/schedule/schedule.ts` | 1,847 | 1,174 | 673 | `UF-1` | ⭐ **割る**（入口 ＋ 手の兄弟 5 ＋ 生成の兄弟 1） | 4.6 |
| 4 | `src/adapter/document-codec/json-codec.ts` | 1,515 | 339 | 1,176 | `UF-35` | ⭐ **割る**（生成器の出力先を変え、兄弟 1） | 4.7 |
| 5 | `src/entity/layout-engine/schedule-layout/schedule-layout.ts` | 1,482 | 1,363 | 119 | `UF-5` | ⭐ **割る**（入口 ＋ 兄弟 12） | 4.3 |
| 6 | `src/adapter/input-command-translator/input-command-translator.ts` | 1,366 | 1,323 | 43 | `UF-30` | 割らない | 4.9 |
| 7 | `src/use-case/advance-screen-session/screen-values.ts` | 1,354 | 517 | 837 | `UF-86` | 割らない | 4.9 |
| 8 | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts` | 1,295 | 1,271 | 24 | `UF-6` | ⭐ **割る**（入口 ＋ 兄弟 6） | 4.4 |
| 9 | `src/entity/layout-engine/item-hit-area/item-hit-area.ts` | 1,150 | 1,049 | 101 | `UF-7` | ⭐ **割る**（入口 ＋ 兄弟 2） | 4.5 |
| 10 | `src/framework/dom-screen-surface/dom-screen-surface.ts` | 1,123 | 970 | 153 | `UF-71` | 割らない | 4.9 |
| 11 | `src/use-case/advance-screen-session/file-flow-values.ts` | 944 | 394 | 550 | `UF-89` | 割らない | 4.9 |
| 12 | `src/use-case/import-document/import-document.ts` | 919 | 919 | 0 | `UF-19` | 割らない | 4.9 |
| 13 | `src/adapter/screen-renderer/properties-panel.ts` | 863 | 852 | 11 | `UF-64` | 割らない | 4.9 |
| 14 | `src/adapter/agent-api-endpoint/agent-api-members.ts` | 724 | 724 | 0 | `UF-28` | 割らない | 4.9 |
| 15 | `src/adapter/svg-renderer/svg-renderer.ts` | 709 | 531 | 178 | `UF-32` | 割らない | 4.9 |
| —— | `src/entity/document-model/document-settings/document-settings.ts` | 536 | 113 | 423 | `UF-2` | 割らない（生成の区画の類として調べた） | 4.9 |
| —— | `src/framework/dom-screen-surface/field-editing.ts` | 508 | 508 | 0 | `UF-107` | 割らない（利用者の名指し） | 4.2 |

⭐ **生成の区画は手で割らない。** 3 節の規則で、出力先を変えるかどうかだけを決めた。

### 1.2 起点の共有（`JDG-284` の ② の物差し）—— 割る 7 ファイルの範囲

測り方: 表 T-075 の「負う要求」の欄で、1 つの行に 2 つ以上の要求が載っている行の要求の数を足した（区分を問わない）。

| 行 | 割る前 | 割ったあと | 注 |
| --- | --- | --- | --- |
| `UF-1` `schedule.ts` | 3 | 0 | 3 つとも兄弟へ（4.6） |
| `UF-5` `schedule-layout.ts` | 10 | 0 | 入口は `FR-003` の 1 つだけ（4.3） |
| `UF-6` `schedule-geometry.ts` | 10 | 5 | 残る 5 は、コードの無い `FR-020`・`FR-045`（9 節の `DFC-965`）と、継ぎ目を出さない `OW-4` の 3 つ（4.4） |
| `UF-7` `item-hit-area.ts` | 2 | 2 | 減らない（4.5） |
| `UF-35` `json-codec.ts` | 2 | 2 | 手書きの側は割らない（4.7） |
| `UF-36` `mspdi-codec.ts` | 2 | 2 | 往復の写しが 2 つとも持つ（4.8） |
| `UF-48` `frame-loop.ts` | 5 | 4 | `FR-102` が `interaction-record.ts` へ（4.1） |
| **合計** | **34** | **15** | |

⚠️ `OW-4` は継ぎ目を出さない（`CR-432` の 4.1 の S1）。`OW-4` を数えないと、割る前 **29**、割ったあと **10** になる。
7 つの行の `OW-4` は `UF-6` の 3（`FR-079`・`FR-094`・`NFR-013`）と `UF-48` の 2（`NFR-002`・`NFR-003`）だけである。
割る前は 34 − 5 ＝ 29。割ったあとは、`UF-6` に `FR-020`・`FR-045`、`UF-48` に `FR-100`・`NFR-010` が残り、`UF-7`・`UF-35`・`UF-36` の 2 ずつと合わせて 10 になる。どちらの数え方でも本書の割り方は減らす。

### 1.3 ⛔ 渡された主張のうち、この木で成り立たなかったもの

| 渡された主張 | 測った結果 |
| --- | --- |
| 「`frameLoop` の閉包は約 2,500 行」 | 成り立った —— `:2158-4682` の 2,525 行・分岐 4 |
| 「`frameLoop` の `let` は 39」（前に立つ者の最初の数え） | ⚠️ **37** である。2 字下げの `let` を `:2172`〜`:3300` で数えた |
| 「閉包の上の頂上の関数は約 145」（前に立つ者の最初の数え） | ⚠️ **101** である。宣言の総数なら 254（関数 101・`const` 115・`type` 25・`interface` 13） |
| 「`fieldEditingOf` は 469 行」 | 成り立った（`function-size-baseline.txt:73`、`JDG-391`） |
| 「段 7 の状態機械が `fieldEditingOf` の 14 の `let` を引き取る」（`CR-439` の 12 節） | ⛔ **引き取ったのは 0 である。** `CR-480` の 2 節の 9〜21（13 個）と `CR-530` の決定 7（`isNoticeShowing`）が「外 —— 段 6 の持ち場」と分類した。いまの `let` は 14、書き換える `const` は 2（`fieldEditNotices`・`typedControlsByRow`） |
| 「`schedule-layout.ts` は起点を共有する要求が 10 件」（`handoff.md:270`） | 成り立った |
| 「`import-document.ts` はコードを変えたコミットが 0 件」（`CR-432` の 4.0、`JDG-284` の ③） | ⚠️ いまは **1 件**（`e0f7d4ad`、`CR-543`）。ただしその 1 件は `builtMerge` に触れていない |
| 「`CR-438` の入口の台帳を兄弟へ出す案は、共変 0.62〜0.81 で拒まれた」（`CR-438` の 4.4） | 成り立った —— 分割前の木で 0.62・0.81・0.75・0.57 を再現した。分割後のコミットを足すと、どの拒みも強まる（4.9） |

---

## 2. 調べ方

### 2.1 3 つの証拠 —— `CR-432` の 4.1 のとおり

- **要求の所有が継ぎ目を提案する（S1）** —— 表 T-075 の「負う要求」の欄の `OW-1`・`OW-2` の要求。`OW-4` は継ぎ目を出さない。
  欄だけで足りないときは、関数の上の `// see` が名指す表でも立てる（`CR-438` の前例、0 節 ③ の 5）。
- **共変が継ぎ目を拒む（S2）** —— 閾値は **0.5 を超える**、小さい側の下限は **5 件**。下限に届かない組は「証拠なし」とし、拒まない。
  残る入口との組は判じない。
- **`R2.2a` の 5 段が確かめる（S5）**。S3（ループや分岐の本体を横切らない）と S4（どの要求の規則も持たない語彙は入口に残す）も `CR-432` の 4.1 のとおりである。

### 2.2 共変の数え方（本書のすべての数はこれで測った）

1 つのスクリプト（13 節の手 1）で、6 つの体が同じ数え方をした。

- 範囲を **1 つずつ** `git log --format=@@@%H -L <始>,<終>:<ファイル>` に掛ける（`CR-438` の 4.0 の癖）。
- **除くもの 1 —— コメントだけの変更**: 差分の `-` と `+` の行から、コメント行・空行・行末の `//` コメントを除いたコードの行の多重集合が等しいコミット。
- **除くもの 2 —— 誕生**: そのコミットが足したコードの行が、その時点のファイルのコードの行の半分以上であるもの。
- ユニットの集合は、その範囲ごとの集合の和である。組の数 ＝ 両方にあるコミット ÷ 小さい側のコミット。
- 分割で他のファイルから生まれたコード（`field-editing.ts`・`input-command-translator.ts` の入口ほか）は、分割前のファイルに、その時点の行番号で掛けた（`git log -L … <分割前のコミット>`）。

### 2.3 感度（決めには使わず、各節に書いた）

- **段 7 の波 B の結線 9 件**（`43496359`・`c8d05ab1`・`4b9687e8`・`f1dcda1d`・`aae9551d`・`81dca548`・`888185ef`・`96851652`・`fcc1e046`）を除いた数も測った。
  1 つの状態機械の移行が全体に触ったので、それに拠る拒みがあれば書く。
  ⭐ 拒みの結論を変えたものは 0 である（4.1・4.2 に内訳）。`Entity` の 3 ファイル・`schedule.ts`・`properties-panel.ts`・`input-command-translator.ts` には 1 件も触れていない。
- **`e1bb8c8f`**（2026-08-17、レビューの一斉手直し）は `schedule-geometry.ts` を 384 行動かした。geometry の拒みの 5 つのうち 3 つ、`item-hit-area.ts` の拒みの 3 つのうち 2 つがこの 1 件に掛かる（4.4・4.5）。
- ⚠️ `git log -L` の癖（`CR-432` の 4.1）: 範囲の隣にあってのちに消えた関数の差分を拾うことがある。範囲の区切り方で数が 1 件動いた組がある（4.1 の 3.3 の注）。判定には、素のスクリプトの数だけを使った。

---

## 3. 生成の区画 —— 類としての規則

⭐ **生成の区画は、それを読む手書きのコードと同じファイルに刷る**。これは生成器の作法（`tools/generate_json_schema_validator.py` の docstring「planted inside that unit」、`docs/development-rules/03-implementation.md`「使うユニットで分ける」）である。
⇒ **類としては、出力先を変えない。**

測った理由（`a912f4ea`）:
- 区画を変えたコミットの多くは、原稿か生成器も同じコミットで変えていた。
  `schedule.ts` 14/16、状態機械の 2 ファイル 35/35・3/3、`document-settings.ts` 1/1、`properties-panel.ts` 1/1。
  要求が変わるとき、人が開くのは原稿である。区画は `npm run gen` が書く。
- 状態機械の区画（`screen-values.ts`・`file-flow-values.ts`）には、そのユニットが負う要求そのものが落ちている。
  `FR-053`・`FR-071`・`FR-107` は原稿に 7・6・2 回現れ、手書きのコードには 0 回である。
- `.ts` を 1 つ足すたびにユニットが 1 つ増える（`SU-3`。表 T-248 の `JF-1` が免じるのは `.json` だけ）。
  残る得は大きさだけであり、`JDG-284` の ②（大きさは目的を測っていない）により理由にならない。
- 出力先を変える費用は、1 ファイルあたり 6〜9 か所ある（生成器の的、公開の名簿、検査 18・20・21・30、ファイルの字を読む道具、雛形を先に作る手順）。

⭐ **例外 —— 出力先を変えるのは、手書きの側が割れて、区画を読む手が別のユニットへ移るときだけである。**

| ファイル | 例外にした理由 | 新しいファイル |
| --- | --- | --- |
| `schedule.ts` | 割ると、兄弟 3 つが生成の定数をモジュールの頂上で読む（`:869` の `DEFAULT_CALENDAR_VALUES`、`:1090` の `COLUMN_SHAPES`、`:1281` の `ENTITY_ROWS` —— 前に立つ者が読んで確かめた）。<br>入口と兄弟が互いに取り込む輪にすると、読み込みの順によって TDZ の `ReferenceError` で落ちる（体が Node で再現した）。<br>生成の兄弟を間に挟めば輪が消える | `schedule-generated.ts` |
| `json-codec.ts` | 区画（節の表）を読むのは、それを歩く `collectFaults` ほか 121 行だけである。<br>その変更の理由は表 T-220 の前文のスキーマで、形式の版と古い版を埋める `documentFromJson` の理由（`FR-024`・`FR-073`）とは互いに素である（`UD-1`）。<br>生成器も「walker」を相方として名指す（`generate_json_schema_validator.py:127-133`） | `json-schema-validator.ts`（区画 ＋ 歩く関数） |

---

## 4. ファイルごとの判定

⛔ `UD-4`: 割るファイルでは、元のファイルのすべての行が、どこかのユニットに 1 度だけ落ちる（スクリプトで確かめた。13 節）。
⚠️ 行数は元の範囲の数である。兄弟は見出しのコメント（5 行）と取り込みの段を持つので、どれも長くなる（`CR-438` の 15 節の 2 の教訓）。

### 4.1 `frame-loop.ts`（`UF-48`）—— ⭐ 割る: 入口 1 ＋ 兄弟 12

#### 事実

| 項目 | 値 |
| --- | --- |
| 行 | 全 4,760 ／ 手書き 4,683 ／ 生成 77（`:4684-4760`） |
| 閉包 `frameLoop` | `:2158-4682`、2,525 行・分岐 4。直下の関数 125、2 字下げの `let` 37 |
| 閉包の上 `:1-2157` | 頂上の宣言 254（関数 101・`const` 115・`type` 25・`interface` 13） |
| `HELD`（`function-size-baseline.txt:79-87`） | `frameLoop` 2525/4 ・ `carryOutAction` 209/51 ・ `openDocumentIntoHold` 159/32 ・ `receiveInput` 149/62 ・ `runFrame` 124/11 ・ `exportScene` 85/2 ・ `answerSettledEntry` 84/21 ・ `tentativeDependencyOf` 64/19 ・ `viewSettings` 55/6 |
| 取り込むファイル | 82（`src` 2 ／ `tests` 80）＋ 動的な取り込み 2（`cr-430-*` が `pointerImageOf`・`pointerRowOf`） |
| 表 T-075 | `UF-48` ／ `non-pure` ／ `FR-100`（`OW-2`）・`FR-102`（`OW-2`）・`NFR-002`（`OW-4`）・`NFR-003`（`OW-4`）・`NFR-010`（`OW-1`） |
| `// see` | 異なる ID 162、うち FR/NFR 33。起点が別の行 28、起点が決まっていない 5（`FR-032`・`FR-048`・`FR-051`・`FR-091`・`FR-106` —— `05-07-design.md:517` の 12 件の中） |
| 証拠の量 | コードを変え、誕生でないコミット **142**（誕生 `1d0412b1`・`1389d515`・`d59c87e3`） |
| コメント密度（検査 55） | 10.0%（上限ちょうど） |

#### S1 —— 立てた案（14）

表 T-075 の欄だけで引くと、立つのは `FR-102`（操作の記録）の 1 つだけである。
⇒ `// see` の表で立てた（0 節 ③ の 5）: ポインタの形（表 T-269・T-266）、掴んだときの先の描画（表 T-023d）、通知の理由（表 T-233）、文書のファイルの流れ（表 T-290・T-024・T-024a）、ブラウザに残す値（表 T-206 の `S-99`〜`S-99c`）、操作の記録（`FR-102`）、表示の場所（`OP-10`・`FR-055`）、書き込みの問い（表 T-234）、写しと貼り付け（`FR-033`）、時間でフレームを起こす待ち（表 T-078 の `FT-4`）、`Agent API` の継ぎ目（表 T-296）、名前付けと入力欄（表 T-292）、パネルの追従（`FR-072`）、書き出しの絵（`FR-080`）。

#### S2 —— 拒んだ継ぎ目と、その行き先

| 組 | 数 | 処置 |
| --- | --- | --- |
| 通知の理由 〜 文書のファイルの流れ | **0.56（27 件中 15）** | 共に変えた 13 件のうち 11 件は `NoticeReason` と `NOTICE_MANNER_OF_REASON` —— 理由を足すたびに項が増える**台帳**である（`CR-439` の `STYLE` と同じ形）。⇒ 台帳は入口に残し、ファイルの失敗の写像だけを流れへ |
| 表示の場所 〜 書き出しの絵 | **0.62（8 件中 5）** | `exportScene` を入口へ戻した（`exportScene` 〜 `runFrame` は 0.94、31 件中 29 —— 同じフレームの計算の 2 度目である） |
| 開く 〜 書く（ファイルの流れを 2 つに割る案） | **0.53（19 件中 10）** | 1 つの `document-file-flow.ts` に戻した（表 T-290 は 1 つの機械） |
| ポインタの形 〜 パネルの追従 | **0.57（7 件中 4）** | パネルの追従を入口へ戻した |
| 命令の振り分け 〜 入力の受け取り ／ 〜 フレームの走行 ／ 走行 〜 受け取り | **0.59（56 件中 33）／ 0.55（56 件中 31）／ 0.54（57 件中 31）** | 入口の中を割る案を拒む（0 節 ③ の 6） |
| セッションを読む関数 〜 入力の受け取り | 0.90（20 件中 18） | 読み手は入口に残す（S4 とも一致） |

`Agent API` の継ぎ目は S5 で落とした —— `SnapshotSource` の実装は継ぎ目の宣言であり、入口の句へ (c) で畳まれる。

**最終の割り方で、証拠のある兄弟の組**: どれも 0.5 以下である。最大は `pointer-shape` 〜 `held-press-preview` の **0.50（16 件中 8）** で、縁ちょうどである。
共に変えた 8 件のうち 4 件は、`PREVIEWED_GRABS` と `POINTER_BY_GRAB` —— どちらも掴み代の行の全数の表 —— である。掴み代を 1 つ足すと両方が動く。
⚠️ 当てる手番で測り直して 0.5 を超えたら、2 つを 1 つの兄弟に戻すこと（MUST）。
入口との組（判じない）: 7 つの兄弟が 1.00、`document-file-flow` 0.97、`frame-clock-wakes` 0.88、`held-press-preview` 0.81、`pointer-shape` 0.75。

**感度（波 B の 9 件を除く）**: 拒みに変わる組は 0 である。
`pointer-shape` 〜 `held-press-preview` は除いても 0.50 である。
写しと貼り付けの 5 組は「立つ」から「証拠なし」に変わる（5 件のうち `888185ef` が波 B）。
拒んだ継ぎ目は、除いても 0.56・0.58・0.67 で、どれも波 B に拠らない。
写しと貼り付け 〜 パネルの追従の 0.60（5 件中 3）だけは結線に拠っていた。ただし処置（パネルの追従を入口へ）は、ポインタの形との 0.57 が単独で求める。

#### 最終の割り方

⭐ 表 T-075 の行は `UF-48` の直後、`UF-123`（`session-effects.ts`）の前に、下の順で置く。純粋性は各ファイルの `@purity` の札から実測して書く（`confirmation-questions.ts` は `pure` だけ、ほかは `pure` と `non-pure` の両方を持つ）。

| 行 ID | ユニット | 責務文（S5。畳んだ句と根拠） | 範囲（`a912f4ea`）と束ねる名 | 行 |
| --- | --- | --- | --- | --- |
| `UF-48`（残る。公開エントリ） | `frame-loop.ts` | 「表 T-078 の契機を受けてセッションの現在値を 1 段進め（`sendToSession`、`SF-6`・`SF-7`）、フレームを計算して描き手へ配る」。<br>「入力 1 つを出来事と命令へ振り分ける（`FT-1`、表 T-036・T-109）」「書き込みの門（`WS-2`・`WS-6`・`WS-7`）」「全画面表示をその呼び出しの中で求める（`FR-071`）」「パネルの主題を選択に従わせる（`FR-072`）」は 1 周期の段なので (a)。<br>「書き出しの絵を同じ計算で作る（`FR-080`）」は (b)。<br>「兄弟が共有する語彙と通知の理由の台帳（表 T-233）を持つ」「`SnapshotSource` と `FrameLoop` の実装」は継ぎ目の宣言なので (c)。<br>「未保存の門（`FR-100`）」「フレームを省く（`NFR-010`・`FR-048`）」は (c) | `:1-260` `:600-628` `:643-747` `:762-764` `:775-778` `:783-784` `:787-959` `:974-975` `:1002-1063` `:1066-1071` `:1198-1397` `:1404-1568` `:1659-1725` `:1747-1766` `:1773-1893` `:2052-2074` `:2157-2194` `:2214-2223` `:2229-2232` `:2238-2363` `:2525-2650` `:2695-2716` `:2730-2748` `:2761-2793` `:2817-2868` `:2891-3012` `:3110-3207` `:3295-3296` `:3369-3487` `:3568-3579` `:3922-4008` `:4112-4427` `:4440-4683` ＋ 生成 `:4684-4760` | 2,672 ＋ 77 |
| `UF-157` | `pointer-shape.ts` | 「指している掴み代に応じて、表 T-269 のポインタの形を描いて返す（`IN-2`・`FR-106`）」。<br>「形の選び方は表 T-266 の欄から読む」「押している間は押した点の形を保つ」「武装した依存線では形を出さない（`DFC-556`）」は (c) | `:261-553`（`PointerFallback` .. `pointerInkOf`）`:3208-3262`（`pointerShapeOfPress` .. `pointerShapeUnder`） | 348 |
| `UF-158` | `held-press-preview.ts` | 「掴んで動かす間、離したときの結果を先に描く文書と依存線を作る（表 T-023d・`PTD-3`・`PTD-5`・`FR-009`）」。<br>「先に描く掴みの列（`PND-250`）」「範囲選択の矩形」は (b)。<br>「保持中の文書から 1 度だけ当てる」は (a)。<br>「拒まれた引きは描かない（`PND-253`）」は (c) | `:554-599`（`PREVIEWED_GRABS` .. `marqueeRect`）`:629-642`（`isPreviewedPress`）`:3013-3109`（`previewOfHeldPress` .. `tentativeDependencyOf`） | 157 |
| `UF-159` | `browser-stored-values.ts` | 「ブラウザに残す値（表 T-206 の `S-99`〜`S-99c`）を読み書きする」。<br>「起動時の表示言語と `Agent API` の記憶を読む（`FR-038`・`FR-065`）」は (b)。<br>「鍵の接頭辞」「読めなければ無いとする」は (c) | `:1105-1117`（`WEB_STORAGE_KEY_PREFIX` .. `DISPLAY_LANGUAGES`）`:2035-2040`（`isDisplayLanguage`）`:2089-2106`（`readBrowserStored` .. `writeBrowserStored`）`:2143-2156`（`startupDisplayLanguage` .. `startupAgentApiEnabled`） | 51 |
| `UF-160` | `interaction-record.ts` | 「操作の記録（`FR-102`）の行を上限（`S-207`）の中に溜め、終わりにクリップボードへ渡す」。<br>「入力・フレーム・完了の行（`IR-1`〜`IR-3`）」は (b)。<br>「文書の中身は記録しない」「隠れたパレットの最小化を覚える（`DFC-707`）」は (c) | `:765-774`（`UNREAD_IN_RECORD` .. `FOCUS_ON_DOCUMENT_BODY`）`:1398-1403`（`paletteMinimisedForRecordOf`）`:1742-1746`（`isRecordingInteractionsIn`）`:2195-2200`（`paletteMinimisedWhileHidden` .. `interactionRecordOffered`）`:2364-2487`（`recordLine` .. `handInteractionRecordToClipboard`） | 151 |
| `UF-161` | `view-place.ts` | 「表示の場所（`OP-10`）を決める —— 保存された場所があればそれを使い、無ければ全体表示（`FR-055`）を 1 度だけ解いて保つ」。<br>「起動見本か」「寸法が変われば解き直す」「別の文書が来たら忘れる」は (c) | `:1569-1658`（`ViewSettings` .. `viewSettings`）`:2201-2212`（`fromStartupTemplate` .. `fitHeldForNoPlace`）`:2488-2524`（`viewSettingsOnce`） | 139 |
| `UF-162` | `confirmation-questions.ts` | 「書き込みが消すものを数え、表 T-234 の問いを立てるかを決める（`FR-032`・`FR-099` の `QN-3`）」。<br>「行と共に消えるタスク（`CD-1`・`CD-2`）」は (a)。<br>「担当の外し（`CD-5`）」は (b) | `:779-780`（`ConfirmationQuestion`）`:785-786`（`UNASSIGNMENT_QUESTION`）`:1894-1929`（`rowsLostWith` .. `tasksLostWith`）`:1962-2034`（`confirmationOwedBy` .. `confirmationOwedByResourceDeletion`） | 113 |
| `UF-163` | `frame-clock-wakes.ts` | 「時間が来たことでフレームを起こす待ちを計る（表 T-078 の `FT-4`）」。<br>「説明の待ち（`EZ-2`）・倍率の告げの期限（`SE-3`）・押し続けの繰り返し（`FR-018`）」は (b)。<br>「1 回ごとに次を仕掛ける」は (c) | `:2075-2088`（`RepeatTimes` .. `repeatTimesOfHeldEntry`）`:2233-2237`（`pointerRestingSince` .. `callOffScaleMessage`）`:2717-2729`（`beginPointerRest`）`:2749-2760`（`startScaleMessageTimer`）`:2794-2816`（`beginEntryRepeat` .. `endEntryRepeat`） | 67 |
| `UF-164` | `field-focus.ts` | 「名前付けと入力欄の領域（表 T-292）の出来事を、面と機械の間で運ぶ」。<br>「焦点の求めと再試行（`MK-13`・`IN-5a`・`IN-5b`）」「知らせの汲み出し（`IF-9`）」「確定の書き込み」は (b)。<br>「状態を読む前に知らせを汲む」「動いた選択も求めを取り下げる（`DFC-694`）」は (c) | `:748-761`（`TASK_NAME_FIELD_ROW` .. `FIELD_FOCUS_RETRY_FRAMES`）`:1726-1741`（`isNamingCreatedTaskIn` .. `isEditingFieldIn`）`:1767-1772`（`fieldEditEventOf`）`:2651-2694`（`focusWantedField` .. `isFieldFocusWanted`）`:3263-3294`（`drainFieldEditNotices` .. `noteChoiceMoved`）`:4428-4439`（`spendFieldCommit`） | 124 |
| `UF-165` | `document-file-flow.ts` | 「文書のファイルの流れ（表 T-290）—— 開く・保存する・書き出す・渡された文書を取り込む —— をファイルの門を通して運ぶ」。<br>4 つの列挙は 1 つの機械の範囲なので (b)（S2 が 2 つに割る案を 0.53 で拒んだ）。<br>「開く前に検証し、使えない日付のタスクを落とす（`FR-023`）」「問いの答えを待つ（`QN-4`・`QN-5`・`OP-3`・表 T-032a）」は (a)。<br>「失敗を表 T-233 の理由で告げる」は (c) | `:781-782` `:960-973` `:976-1001` `:1064-1065` `:1072-1104`（`OPEN_ROUTE_FROM_CHOOSER` .. `saveFormOfExportFormat`）`:1118-1197`（`defaultDocumentSettings` .. `decodedDocument`）`:1930-1961` `:2041-2051` `:2213` `:2224-2228` `:3488-3567`（`askToWriteOverDestination` .. `settleIncomingDocument`）`:3580-3921`（`openDocumentIntoHold` .. `chosenFileSave`）`:4009-4023`（`answerSettledFormat`） | 643 |
| `UF-166` | `watermark-unlock.ts` | 「透かしの解除の門（`FR-020`・`U-60`）—— 答えの SHA-256 を記憶の値（`S-99c`、無ければ `S-101`）と照らす」。<br>「照らせない環境は `RS-41`（`DFC-559`）」は (c) | `:2107-2142`（`HEX_DIGIT_BITS` .. `watermarkUnlockDigest`）`:2869-2890`（`answerWatermarkUnlock` .. `matchWatermarkUnlock`） | 58 |
| `UF-167` | `row-band-ceiling.ts` | 「行ズームの天井（`FR-016`、`rowBandCeilingOf`）を、帯を変えない入力のあいだ使い回す（`DFC-610`）」。<br>「帯を変えない設定の列」は (c) | `:3297-3368`（`bandCeilingFrom` .. `bandCeilingFor`） | 72 |
| `UF-168` | `copy-and-paste.ts` | 「選んだ行かタスクを写し、写したものを貼る命令を作る（`FR-033`・`SK-4`・`SK-5`・`DU-2`）」。<br>「重ねの上限を超える貼り付けは告げて止める」「複数を選んだときは貼らない（`PND-449`）」は (c) | `:4024-4111`（`copyForPaste` .. `pasteCommandFor`） | 88 |

合計 2,672 ＋ 77 ＋ 348 ＋ 157 ＋ 51 ＋ 151 ＋ 139 ＋ 113 ＋ 67 ＋ 124 ＋ 643 ＋ 58 ＋ 72 ＋ 88 ＝ 4,760。

**UD-5**: 「言語の選択が次の起動で戻らない」→ `browser-stored-values.ts`。「押し続けで繰り返さない」→ `frame-clock-wakes.ts`。「文書名の欄に焦点が来ない」→ `field-focus.ts`。「掴み代の上の形が違う」→ `pointer-shape.ts`。「引いている間のバーが二重に動く」→ `held-press-preview.ts`。「パネルが選択についてこない」→ 入口（`followChoiceOnPanel`）。どれも 1 ファイルで答える。

**兄弟どうしの取り込み（輪 0、測った）**: `held-press-preview` → `pointer-shape`（`GrabbedArea`、型だけ）／ `document-file-flow` → `confirmation-questions`（`tasksLostWith`・`ConfirmationQuestion`）／ `watermark-unlock` → `browser-stored-values`（`readBrowserStored`）。
入口と兄弟の間の輪はある（`CR-432` の 4.1 の「輸入の輪」。検査 19 の `LR-3` はコンポーネントの間だけを見る）。

⛔ **評価の順（TDZ）**: 兄弟の頂上の `const` の初期化が入口の名を読むと、初期化前の参照になる。
測った結果は 1 件だけだった —— `FIELD_FOCUS_WITHDRAWING_KEYS`（`:777`）が入口の `ESCAPE_KEY` を読む。⇒ `:775-778` を入口に残した。最終の案で該当は 0 である。

#### 閉包の塊の出し方（`CR-439` の 4.3 の形）

⭐ 形は 2 つだけ使う: **(F) 閉包の値を引数で受ける頂上の関数**、**(M) 自分の `let` だけを持つ小さな工場**。
⛔ 閉包の関数を丸ごと抱える大きな工場は作らない —— `R2.2b` の入れ物をもう 1 つ作ることになり、検査 60 の新しい `HELD` 行になる。
閉包の値は、入口が 1 度だけ作る手の束で渡す（既存の `ScreenEffectHands` と同じ形。兄弟ごとに `Pick<>` した型）。
⛔ **この形から外れるなら、割る体は止まって報告すること**（黙って形を変えない）。

| 塊 | 出す先 | 形 | 受け取るもの |
| --- | --- | --- | --- |
| `pointerShapeOfPress`・`pointerShapeAt`・`pointerShapeUnder` | `UF-157` | (M) `pointerShapeOfPress` を持つ工場。`pointerShapeUnder` は (F) | `pressed`・`session.screen.armModeState`・`dualCursorFollowingIn(session)` |
| `previewOfHeldPress`・`tentativeDependencyOf` | `UF-158` | (F)。`let` は無い | `held.document`・腕の状態・`settingsLimitsOf(values)` |
| 記録の 4 つの `let` と `paletteMinimisedWhileHidden`、`recordLine` .. `handInteractionRecordToClipboard` | `UF-160` | (M) 5 つの状態と、それを書く `append`・`begin`・`hand`・`notePaletteEvent` だけを持つ工場。綴る関数（`recordHappening`・`recordFrame` ほか）は (F) | `readMonotonicMs`・`clipboard`・`screen.readFocusPosition`・`environment`・`session` |
| `fromStartupTemplate`・`fitHeldForNoPlace`・`viewSettingsOnce` | `UF-161` | (M) | `environment` の読み手、`isSameEnvironment`（入口の頂上へ上げて輸出する）、`startedFromTemplate` |
| 4 つの時計の `let`、`beginPointerRest`・`startScaleMessageTimer`・`begin/tick/endEntryRepeat` | `UF-163` | (M)。`repeatHeldEntry`（`:2761-2775`）は入口に残し、時計の `tick` を呼ぶ | `ask`・`sendToSession`・`values`・`settled(environment)`・`iconHintDelayMs` の読み手・`screen` の有無 |
| `fieldFocusRetriesLeft` と焦点の関数 | `UF-164` | (M) `let` と、それを書く `want`・`focusWanted`・`resetRetries`。残り 6 つは (F) | `screen`・`session`・`sendToSession`・`values`・`ask`・借りのフレームを今描く手（`owed` と `runFrame`）・`isPropertiesPanelOnScreen`・`collectInputContext`・`writeDocument` |
| 3 つの `settle…` と `fileSavedAt`、問いと開く・保存・書き出し | `UF-165` | (M) 続きの 3 つと `fileSavedAt` を持つ工場。開く・保存・書き出しの本体は (F) | `files`・`rasterizer`・`appShell`、`held`・`session`・`values` の読み手、`sendToSession`・`sendFromFlow`・`endFileOperation`・`raiseNotice`・`raiseFileFault`・`replaceHeldDocument`・`settingsLimitsOf`・`exportScene` |
| `answerWatermarkUnlock`・`matchWatermarkUnlock` | `UF-166` | (F) | `session`・`sendToSession`・`values`・`ask` |
| `bandCeilingFrom`・`isSameBandSettings`・`bandCeilingFor` | `UF-167` | (M) | 無し |
| `copyForPaste`・`pasteWhatWasCopied`・`pasteCommandFor` | `UF-168` | (F) | `session`・`held`・`values`・`sendToSession`・`raiseNotice`・`writeDocument`・`settingsLimitsOf`・`environment.rowControlsHeightPx` |

⛔ **宿主への呼び出しの順を変えないこと（MUST）。**
いまの閉包の組み立ての段で宿主に触るのは、`:2174`（`S-99` を読む）→ `:2175`（時計）→ `:2176`（`S-99a`）→ `:2329`（`S-99b`、`rememberedEnablingLoaded`）→ `:4592`（最初の `runFrame`）の順である。
- 工場と手の束は、`:2176` の後、`effectRunnersOf`（`:2290`）の**前**に作ること。結線の表は `startScaleMessageTimer`・`beginEntryRepeat`・`beginReadingDocumentFile`・`beginWritingDocumentFile`・`settleIncomingDocument`・`beginInteractionRecord`・`handInteractionRecordToClipboard` を**値として**受け取る（いまは関数宣言の巻き上げで動いている）。
- 工場は、作る時に宿主に触らないこと（時計を仕掛けない。記憶を読まない）。

#### 残る入口 —— 割ったあとの `frameLoop`

- 閉包の行のうち入口に残るのは **1,428 行**（2,525 行から）。手の束と工場の生成がおよそ 30〜40 行足るので、**およそ 1,460 行**になる見込みである（各波で実測する）。
- 残る `let` は **20**（37 から 17 が工場へ移る）—— `held`・`environment`・`session`・`watermarkStampedAt`・`values`・`owed`・`pressed`・`previewDocument`・`commandPaletteDraggedTo`・`commandPaletteCornerAtPress`・`rowGrabbedAt`・`propertiesPanelKept`・`agentApiEnablingWatch`・`stackSafetyCapToldFor`・`pointerAt`・`partUnderPointer`・`grabUnderPointer`・`isTooltipStanding`・`dialogueLog`・`addedRowOwedSight`。
- 直下の関数は 125 → 72。帯の中は `receiveInput` 149・`carryOutAction` 209・`runFrame` 124・`exportScene` 85・`answerSettledEntry` 84 である。
- ⚠️ **入口は「結線だけ」にはならない。** フレームの 1 周期（`receiveInput` → `carryOutAction`／`answerSettledEntry` → `writeDocument`／`replaceHeldDocument` → `runFrame`／`exportScene`）が残る。
  3 つを互いに割る案は S2 が拒んだ（0.54〜0.59、小さい側 56〜57 件）。
  3 つをまとめて 1 つの兄弟へ出す道は S2 には拒まれない。しかしそれには、20 の `let` を 1 つの状態のオブジェクトへ移して読み書きをすべて書き換える必要がある。それは割ることではなく作り変えである（(F)・(M) のどちらの形にも当たらない）。
  ⇒ 本書では入口をこれ以上割らない。**10 節の問い 1 で利用者が案 A を選んだ（2026-09-23）** —— 割ったあとで入口を開く頻度を測り、多ければ別の変更要求にする。

#### 公開エントリ

- 表 T-064 で `SingleHtmlShell` は公開メンバを持たない ⇒ 検査 26b は動かない。
- ⛔ 兄弟へ移る名で外から読まれている 5 つを、入口から**出し直す（MUST）**: `PointerShape`（`single-html-shell.ts` と試験 3 本）、`pointerImageOf`・`pointerRowOf`（`cr-430-*` の動的な取り込み 2 本 —— 名が無いと「exports no …」で赤）、`FOCUS_ON_DOCUMENT_BODY`（`single-html-shell.ts` と試験 1 本）、`startupDisplayLanguage`（`single-html-shell.ts`）。
- 入口が兄弟のために新たに `export` する名は 31 と `isSameEnvironment`（閉包から頂上へ上げる）である（13 節の手 5 の出力）。⛔ フォルダの外からこれらを読んではならない（表 T-248 の `JF-3`）。
- ⛔ 表 T-075 の `UF-48` の欄の 3 つの文を**逐語で残すこと（MUST）** —— `tests/unit/uf-48-one-input-one-step.test.ts:25-29` と `tests/unit/cr-389-fr-071-full-screen-is-asked-of-the-browser.test.ts:41` が字で読む（`sendToSession` の 1 本の道、`Esc` の 1 段、全画面の求めを入力の呼び出しの中で）。3 つとも入口に残るので、真のままである。

#### ファイルの中の波（呼ばれる側が先。⛔ 割る体は同時に 1 体だけ）

| 波 | 出すユニット | 理由 |
| --- | --- | --- |
| F1 | `UF-159` `browser-stored-values.ts` ・ `UF-162` `confirmation-questions.ts` | 頂上の宣言だけ。ほかの兄弟に取り込まれる葉 |
| F2 | `UF-157` `pointer-shape.ts` ・ `UF-166` `watermark-unlock.ts` ・ `UF-167` `row-band-ceiling.ts` ・ `UF-161` `view-place.ts` | `pointer-shape` は F3 の `held-press-preview` に、`browser-stored-values` は `watermark-unlock` に呼ばれる |
| F3 | `UF-158` `held-press-preview.ts` ・ `UF-163` `frame-clock-wakes.ts` ・ `UF-160` `interaction-record.ts` ・ `UF-164` `field-focus.ts` ・ `UF-168` `copy-and-paste.ts` | 結線の表に値として渡る工場（時計・記録）をここで作る |
| F4 | `UF-165` `document-file-flow.ts` | 最大。`confirmation-questions` を取り込み、結線の表の 3 つの手と `answerSettledEntry`・`carryOutAction` の取り込みを書き換える |

⛔ **照合器（MUST）**: `CR-439` の 8.1 と 8.3 の MUST (c) と同じく、分割前の木だけを読む**別の体**が照合器を作り、F1 より先に併合する。
比べるのは、宿主への呼び出しの列、フレームの列、送った出来事の列である。
照合器の体のブリーフには「感度を 10 件で測れ（わざと壊して赤になる数）、照合器自身の分岐網羅を報告せよ」を最初から書く（`handoff.md` の 2.11 の ⑭）。

### 4.2 `field-editing.ts`（`UF-107`）—— 割らない（`fieldEditingOf` も割らない）

| 項目 | 値 |
| --- | --- |
| 行 | 508（生成 0）。工場 `fieldEditingOf` は 469 行・分岐 1（`HELD`、`function-size-baseline.txt:73`） |
| `let` | 14。書き換える `const` 2（`fieldEditNotices`・`typedControlsByRow`） |
| 証拠 | このファイルは誕生（`006aefbc`）の後、4 件だけである。分割前の履歴は `dom-screen-surface.ts` に `--rev 9b8a22b7` で掛けた |

**2 つの軸を試し、どちらも採らなかった。**

1. **懸念ごと**（焦点の保持 ／ `Esc` ／ `Enter` ／ 欄の外の押し ／ 知らせ ／ 日付の消去）—— ⛔ S2 が拒んだ。
   - 保持 〜 欄の外の押し: **0.86（7 件中 6）**。波 B を除いても 0.83（6 件中 5）で拒む。
   - 保持 〜 `Esc`: **0.62（8 件中 5）**。波 B を除くと 0.57（7 件中 4）。
   - `Esc` 〜 `Enter`: 0.60（5 件中 3）。`81dca548` を除くと「証拠なし」。
   - S3 にも当たる —— 波 B の知らせ（`noteFieldEdit`）が、すべての欄の保持と手放しの分岐の中にある。
2. **欄ごと**（プロパティパネル ／ 文書名 `U-27` ／ 透かし解除の答え `U-60`）—— 共変の証拠は無い（文書名 2 件、透かし 3 件）。
   - 決め手は `UD-1` と `UD-5` である。このファイルの変更の理由は、3 つの欄が共有する約束（`IN-4`・`IN-6`・`SK-19`・`IN-5a`／`IF-9`・`NT-8`）である。
     欄ごとに割ると、約束が変わるたびに 3 ファイルを開くことになる。
   - 約束の写しは 3 つの欄に合計 173 行あり、実際に食い違ってきた（`6b329710` の差分の注: パネルの写しで直した欠陥が、透かしの写しには別の欠陥として残っていた）。
   - 各欄の要求（`FR-035`・`FR-020`・`FR-006`）の持ち主は別のユニットである。欄ごとの兄弟は「負う要求 `—`」の、行数を減らすためだけの分割になる（`JDG-284` の ② が退けた物差し）。
- `CR-439` の 4.1 の S3 の論（`settleOnPressOutside` が 3 つの欄を順に確定させる）は、今のコードでは成り立たない —— 無条件に順に呼ぶだけで、ループや分岐の本体ではない。
  新しく見つかった結合がある: `fieldCommit` はパネルと文書名が書く 1 つの升で、同じ押しで両方が確定すると後の書き手が勝つ（9 節の `DFC-967` の候補）。
- 同じファイルの中で欄ごとの小さな工場に分ける案は、4 つとも帯（50 行）を超える（範囲からの見積もりで 155・116・86・112 行）。`HELD` が 1 行から 4 行に増えるので採らない。
- `R2.2a` は PASS する（知らせは (a)、日付の消去は (c)）。`R2.2b` でも入れ物ではない —— 1 文で要約でき、長さの源は約束の写しである。
- ⭐ **工場を本当に縮める道は、約束を 1 つの補助にまとめる書き直しである。** 振る舞いを保つ移動ではなく、`DFC-679`・`DFC-694`・`DFC-702`・`DFC-751` と `JDG-78`（異常系は後）も掛かるので、段 7.5 の外の別の変更要求とする（11 節）。
- 検査 60 の変化は **0**。`HELD fieldEditingOf lines=469 branches=1` は `JDG-54` の下で合法のまま残る（0 節 ③ の 2）。

### 4.3 `schedule-layout.ts`（`UF-5`）—— ⭐ 割る: 入口 1 ＋ 兄弟 12

| 項目 | 値 |
| --- | --- |
| 行 | 全 1,482 ／ 手書き 1,363 ／ 生成 119（`:1364-1482`） |
| 帯の外の関数（すべて `HELD`、`:65-68`） | `layoutFromSchedule` 271/23 ・ `layoutFromSchedule#9` 72/18 ・ `pinnedBandOf` 59/9 ・ `fitZoom` 70/12 |
| 表 T-075 | `UF-5`: `FR-002`・`FR-003`・`FR-017`・`FR-018`・`FR-055`・`FR-059`・`FR-077`・`FR-090`・`FR-093`・`FR-109`（10 件） |
| 取り込むファイル | `src` 15 ／ `tests` 102（名前空間の取り込み 3） |
| 証拠の量 | 52 件（誕生 `1d0412b1`・`ecf45f01`） |

**S1**: 表 T-068（レイアウトの計算順序）の `LC-1`〜`LC-9` が `layoutFromSchedule` の 1 回の通り道である。各段の「正」の欄が要求を名指す。⇒ 入口は T-068 の通り道を負い、正を別に持つ段で閉じたコードのまとまりがあるものを兄弟の案にした。
**S2**: 兄弟どうしで拒まれた組は **0** である（最大 0.43、7 件中 3、`shape-tiers` 〜 `label-placement`）。
⚠️ 証拠は薄い（兄弟の最大 11 件）。多くの組が証拠なしなので、継ぎ目は S1 と S5 で決めた（`CR-432` の `edit-task-group.ts` と同じ立場）。波 B と `e1bb8c8f` はこのファイルの判定を動かさない。
**S3**: `layoutFromSchedule` の行のループ（`:844-1040`）の本体に、段の割当（`FR-003`・表 T-014）・占有幅の合算（`LC-7`・表 T-038）・帯高（`LC-9`）が直に書かれている ⇒ ループと `#9` の閉包は入口に置く。兄弟へ出すのは、ループが呼ぶ関数だけである。

| 行 ID | ユニット | 責務文（S5） | 範囲（`a912f4ea`、束ねる名） | 行 |
| --- | --- | --- | --- | --- |
| `UF-5`（残る） | `schedule-layout.ts` | 「表 T-068 の順に 1 度だけ通して、タスクと行の置き場を決め、段を割り当てる（`FR-003`・表 T-014）」。<br>「各段の値を兄弟に問う（`LC-1`〜`LC-6`）」「占有幅を合算し（`LC-7`・表 T-038）、帯高と縦位置を決める（`LC-9`）」「タスクごとに形・予定の幅・実績とダミーの届き・フェードの切り詰めを測る」は (a)。<br>「置き場の型と生成の定数を持ち、兄弟の公開名を束ねて出す」「1 回の走行の暦の読み（`DayReader`）」は (c) | `:1-108` `:117-146`（`dayReaderFor`）`:163-164` `:447-465`（`clampedFade`）`:559-601`（`shapeKindOf` .. `shapeWidthOf`）`:614-664`（`actualSpanOf` .. `dummyReachOf`）`:788-1070`（`bandFloorOf`・`layoutFromSchedule`）`:1216-1220`（`taskPlacement`）`:1344-1363`（`rowPlacesAtZoomY`）＋ 生成 `:1364-1482` | 561 ＋ 119 |
| `UF-132` | `time-axis.ts` | 「日付と横の位置を対応づける時間軸を敷く（`FR-017`・`LC-3`）」。「ルーラーの粒度（表 T-252）」「目盛を間引く（`LF-1`）」「軸だけを答える（`timeAxisOf`、`DC-3`）」は (c) | `:109-116`（`serialOf`）`:387-446`（`rulerTierOf` .. `xFromDay`） | 68 |
| `UF-133` | `label-width.ts` | 「ラベルの幅を、全角 2・半角 1 の単位数 × 字の大きさ × `labelCoef` で概算する（`FR-093`・`LC-5`）」 | `:147-160`（`labelUnits`・`labelWidth`） | 14 |
| `UF-134` | `assignee-label.ts` | 「担当の札の字を、作業資源の名の昇順の先頭 1 名と残りの人数で書く（`FR-059`）」。「材料・費用・名の空の資源を出さない（`AT-87`・`AT-88`）」は (c) | `:161-162` `:165-166` `:169-205`（`assigneeLabelsOf`） | 41 |
| `UF-135` | `percent-label.ts` | 「完了率の札の字を整数と `%` で書き、担当の札と 1 枚に繋ぐ（`FR-090`・`OC-2`）」。「未着手は書かない」「繋ぎの字」は (c) | `:167-168` `:206-223`（`percentLabelOf`・`outsideLabelOf`） | 20 |
| `UF-136` | `name-label.ts` | 「名称ラベルの字を書く（`FR-002`・`LC-4`）」。「打ち切る」「予定日を添え、年を書くかを文書全体で決める（`ND-1`〜`ND-5`・`S-232`）」は (a) | `:224-287`（`truncate` .. `nameLabelOf`） | 64 |
| `UF-137` | `shape-tiers.ts` | 「形ごとの縦の断面を縦の倍率から決める（表 T-012・`XS-4`〜`XS-6`）」。部品の列挙は (b)。「字を可読の下限より小さくしない（`FR-077`）」「同じ式を逆に解く」は (c) | `:288-386`（`thinEndHalfHeightOf` .. `labelFontSize`）`:1334-1343`（`zoomYAtRectangleLabelFont`） | 109 |
| `UF-138` | `drawn-rows.ts` | 「描く行を選ぶ —— 畳んだ行と隠した行を落とす（`LC-1`・`HF-7`・`HR-2`）」。「木の順に並べる」は (a) | `:466-491`（`drawnGroups`）`:512-540`（`inTreeOrder`） | 55 |
| `UF-139` | `level-of-detail.ts` | 「表示の倍率に応じて描く行の深さとタスクを減らす（`FR-018`・`LC-2`・表 T-005a）」。「開いたままの印の行は残す（表 T-254）」「深さごとに要る倍率を 1 つの式で答える」は (c) | `:492-511` `:541-558` `:602-613`（`keptInViewByOpenMarks`・`groupDepthLimit`・`groupDepthThresholdOf`・`keptByLevelOfDetail`） | 50 |
| `UF-140` | `label-placement.ts` | 「札の基準を選び、名称・進捗マーカー・担当の札を形に隠れない所へ置く（`FR-109`・`LC-6`・表 T-272・T-273）」。「ダミーの帯を基準にする（`RF-1`）」は (b)。「未定の再開アイコンのぶん外へずらす（`GA-20`・`XS-10`）」は (c) | `:665-787`（`LabelReference` .. `assigneeAnchorOf`） | 123 |
| `UF-141` | `pinned-band.ts` | 「ピン止めした行を上の帯へ持ち上げ、入りきらない行を落とす（`FR-098`・`LF-14`）」。「残りの行とタスクを帯の下へずらす」は (a) | `:1071-1169`（`pinnedBandOf` .. `shiftedPlacements`） | 99 |
| `UF-142` | `row-scroll.ts` | 「縦の表示位置（`OP-10a`・`S-176`）から、ピン止めでない行とタスクをずらす」 | `:1170-1215`（`scrollOffsetOf` .. `scrolledPlacements`） | 46 |
| `UF-143` | `fit-zoom.ts` | 「全体が収まる縦横の倍率と表示位置を求める（`FR-055`）」。「深さを床の倍率で試して選ぶ」は (a)。「横の倍率を `S-75`／`S-76` に収める（`DFC-726` の逸脱を含む）」は (c) | `:1221-1333`（`FitToScreen` .. `fitZoom`） | 113 |

合計 1,482。重なり 0、漏れ 0（スクリプトで確かめた）。

- **負う要求の移し替え**: `FR-017` → `UF-132`、`FR-093` → `UF-133`、`FR-059` → `UF-134`、`FR-090` → `UF-135`、`FR-002` → `UF-136`、`FR-077` → `UF-137`、`FR-018` → `UF-139`、`FR-109` → `UF-140`、`FR-055` → `UF-143`。入口は `FR-003` だけを負う。`UF-138`・`UF-141`・`UF-142` は `—`（`FR-098` の起点は `UF-63`）。
- **兄弟どうし（輪 0）**: `label-placement` → `shape-tiers` ／ `fit-zoom` → `time-axis`・`drawn-rows`・`level-of-detail`・`shape-tiers`。兄弟の頂上で入口の名を読むものは 0（評価の順の問題は起きない）。閉包は切らない。
- **公開エントリ**: 表 T-064 の `PI-5` の名はすべて入口から読めるまま残す。兄弟へ動く名 17 と、試験が入口から取り込む 2 名（`rulerTierOf`・`TimeAxis`）の計 **19 名**を出し直す。
  ⛔ `tests/unit/cr-380-381-384-*.test.ts:1163-1174` は `input-command-translator.ts` の字を読み、`zoomYAtRectangleLabelFont` と `rowPlacesAtZoomY` が `schedule-layout/schedule-layout` から取り込まれていることを求める ⇒ 翻訳器の取り込み元を変えないこと（出し直しで満たす）。
- **ファイルの中の波**: L1 ＝ `label-placement` と `fit-zoom` 以外の 10 → L2 ＝ `label-placement`・`fit-zoom`。

### 4.4 `schedule-geometry.ts`（`UF-6`）—— ⭐ 割る: 入口 1 ＋ 兄弟 6

| 項目 | 値 |
| --- | --- |
| 行 | 全 1,295 ／ 手書き 1,271 ／ 生成 24（`:1272-1295`） |
| 帯の外の関数（すべて `HELD`、`:61-64`） | `routeOf` 68/11 ・ `taskGeometryOf` 58/13 ・ `progressLineOf` 40/16 ・ `geometryFromLayout` 62/9 |
| 表 T-075 | `UF-6`: 10 件（`FR-009`・`FR-014`・`FR-020`・`FR-043`・`FR-045`・`FR-079`・`FR-082`・`FR-084`・`FR-094`・`NFR-013`） |
| 証拠の量 | 47 件（誕生 `1d0412b1`・`b1560b0f`） |

⚠️ **`FR-020`（透かし）と `FR-045`（期限の印）のコードは、このファイルに 0 行である**（`git grep -i -E "watermark|deadline|FR-020|FR-045" -- src/entity/layout-engine` が 0 件。前に立つ者が測り直した）。
`UD-4` により範囲を書けないので、2 つは入口の行に残す。食い違いは 9 節の `DFC-965` の候補とする（利用者の裁定 2026-09-13「食い違いは defects へ、どちらかを選ばない」）。

**S2 が融かしたもの**: タスクの図の部品どうしである。

| 組 | 数 | `e1bb8c8f` を除くと |
| --- | --- | --- |
| 印と再開 〜 名札の箱 | **0.75（8 件中 6）** | 0.71（7 件中 5）—— 拒む |
| 印と再開 〜 ダミー | **0.62（8 件中 5）** | 0.57（7 件中 4）—— 証拠なし |
| バーの外形 〜 マイルストーンの形 | **0.60（5 件中 3）** | 0.50（4 件中 2）—— 証拠なし |
| バーの外形 〜 名札の箱 | **0.57（7 件中 4）** | 0.50（6 件中 3）—— 立つ |
| （融けた 5 つ ＋ `taskGeometryOf`）〜 ハイライト | **0.60（5 件中 3）** | 0.50（4 件中 2）—— 証拠なし |

⇒ 5 つの部品とハイライトを 1 つのユニット（`task-figures.ts`）へ戻す（0 節 ③ の 7）。
⚠️ 感度: `e1bb8c8f` を数えなければ、バーの外形（133 行）・マイルストーンの形（129 行）・ハイライト（43 行）は兄弟として立つ。
**最終の兄弟どうし**: `task-figures` 〜 `comment-box` 0.50（6 件中 3、⚠️ 縁 —— 当てる手番で 0.5 を超えたら戻す）、`task-figures` 〜 `dependency-route` 0.33。ほかは証拠なし。

| 行 ID | ユニット | 責務文（S5） | 範囲（束ねる名） | 行 |
| --- | --- | --- | --- | --- |
| `UF-6`（残る） | `schedule-geometry.ts` | 「配置から、日程表に描くものの頂点を 1 度に組み立てる（`CP-6`・`LC-10`・`LC-11`）」。「描く設定と選択を 1 回の入力にまとめる（`GeometryInputs`）」は (a)。「状態線を置く」は (b)。「頂点の型と生成の定数を持つ」は (c) | `:1-149` `:156-193`（`DualCursorGeometry` .. `GeometryInputs`）`:1207-1271`（`geometryFromLayout`）＋ 生成 `:1272-1295` | 252 ＋ 24 |
| `UF-144` | `task-figures.ts` | 「1 つのタスクの描く図形の頂点を作る —— 予定・実績・マイルストーンの形、名札と担当の札の箱、進捗マーカー、再開アイコン、ダミー、フェードの掴み点（表 T-012・T-021・T-240・`LF-6`〜`LF-13`）」。列挙は (b)。「部品を 1 つに組む（`taskGeometryOf`）」は (a)。「ハイライトボックスの枠（`FR-019`）」は (b) —— 同じ変更で動いてきたので同じユニットに置く（`UT-8` の依存線と同じ書き方） | `:194-561`（`fadedOutline` .. `resumeOf`）`:806-922`（`dummyFromOf` .. `outsideLabelBoxOf`）`:938-997`（`taskGeometryOf`）`:1065-1107`（`rightEdgeOfDay`・`highlightGeometry`） | 588 |
| `UF-145` | `dependency-route.ts` | 「依存線の経路と矢じりを引く（`FR-009`・表 T-018・T-018a・T-222）」。「選んだ線を太くする（`SL-8`・`S-178`）」「予定日の無いタスクを端にしない（`RT-4a`）」は (c) | `:562-766`（`exitsRight` .. `routedDependency`）`:923-937`（`hasPlanDates`・`plannedPlacementsOf`） | 220 |
| `UF-146` | `guides.ts` | 「予定と実績が離れたとき、実績から予定へ補助線を引く（`FR-084`・表 T-020a）」 | `:767-805`（`guidesOf`） | 39 |
| `UF-147` | `progress-line.ts` | 「基準日のイナズマ線の頂点を打つ（`FR-014`・表 T-022）」。「段で束ねて 2 乗にしない（`NFR-013`）」は (c) | `:998-1064`（`vertexXOf`・`progressLineOf`） | 67 |
| `UF-148` | `comment-box.ts` | 「コメントボックスの本文を折り返し、本文の箱と引出し線を置く（`FR-097`・`FR-019`・`S-182`）」。「引出し線を 1 本の経路として出す（`leaderOf`、`GR-14`）」は (c) | `:150-155`（`leaderOf`）`:1108-1186`（`charUnits` .. `commentGeometry`） | 85 |
| `UF-149` | `dual-cursor.ts` | 「`Dual Cursor` の 2 本の縦線を置く（`FR-082`・`CU-2`）」 | `:1187-1206`（`dualCursorGeometry`） | 20 |

合計 1,295。重なり 0、漏れ 0。

- **負う要求の移し替え**: `FR-009` → `UF-145`、`FR-014` → `UF-147`、`FR-043` → `UF-144`、`FR-082` → `UF-149`、`FR-084` → `UF-146`。`UF-148` は `—`（`FR-097` は `05-07-design.md:517` の「起点を決めていない 12 件」の 1 つ）。入口に `FR-020`・`FR-045`・`FR-079`・`FR-094`・`NFR-013` が残る。
- **兄弟どうし（輪 0）**: `task-figures` → `guides` ／ `dependency-route` → `task-figures`（`isThinShape`・`thinTierMiddle`）。頂上で入口の名を読むものは 0。
- **公開エントリ**: `PI-6` のうち動くのは `leaderOf` だけ ⇒ 入口が出し直す（`item-hit-area.ts` と `svg-renderer` が読む）。
- ⚠️ 名前: `task-figures.ts` は `svg-renderer/schedule-task-figures.ts` と別の名である（`audit-ch5.py:196` のファイル名の重なりは 0 —— `find` で確かめた）。
- **ファイルの中の波**: G1 ＝ `guides`・`progress-line`・`comment-box`・`dual-cursor` → G2 ＝ `task-figures` → G3 ＝ `dependency-route`。

### 4.5 `item-hit-area.ts`（`UF-7`）—— ⭐ 割る（小さく）: 入口 1 ＋ 兄弟 2

- 行: 全 1,150 ／ 手書き 1,049 ／ 生成 101（`:1050-1150`）。帯の外の関数は 0、`HELD` は 0。証拠 21 件。
- S2 が融かしたもの: 掴み代 〜 応える順 **0.85（13 件中 11）**、応える順 〜 形でないものの当たり **1.00（5 件中 5）**、掴み代 〜 形でないもの **0.80（5 件中 4）**。3 つは入口と 8 件中 8 で動くので、入口に置く。
  `e1bb8c8f` を除いても、掴み代 〜 応える順は 0.83 で拒む。
- 出す 2 つは、互いに素な出どころに縛られ、共変の証拠は無い（3 件・2 件）。

| 行 ID | ユニット | 責務文 | 範囲 | 行 |
| --- | --- | --- | --- | --- |
| `UF-7`（残る） | `item-hit-area.ts` | 「ポインタの下の対象と掴み代を 1 つに決める（表 T-023d・T-266・T-267・T-268、`FR-104`）」。「描いた形を掴みの側から読み直す（`shapeOf`）」は (a)。「掴み代の大きさを表 T-206 から 1 組で答える」「兄弟が使う図形の算」は (c) | `:1-957`（`Item` .. `itemAtPointer`）＋ 生成 `:1050-1150` | 957 ＋ 101 |
| `UF-150` | `dependency-end.ts` | 「構えが依存線のとき、予定の帯の左半分・右半分から依存線の端を答える（`FR-009`・`PTD-3`）」。「実績の帯へ落ちない（`FR-009` の MUST NOT、`DFC-658`）」「押したときの当たりから起点を答える」は (c) | `:958-1010`（`DependencyEnd` .. `dependencyStartOfHit`） | 53 |
| `UF-151` | `marquee.ts` | 「範囲選択の矩形に完全に囲まれた対象を返す（`SL-3`）」。「返す順（`SL-7b`）」は (c) | `:1011-1049`（`isEnclosedInclusive`・`itemsInMarquee`） | 39 |

- ⚠️ 表 T-075 の共有は **2 のまま**である（0 節 ③ の 9）。2 行とも負う要求は `—`。
- 公開エントリ: `PI-7` の `dependencyEndAtPointer`・`dependencyStartOfHit`・`itemsInMarquee` の 3 名を入口が出し直す（`cr-388` の名前空間の読みもこれで満たす）。兄弟どうしの取り込みは 0。波は 1 つ。

### 4.6 `schedule.ts`（`UF-1`）—— ⭐ 割る: 入口 1 ＋ 手の兄弟 5 ＋ 生成の兄弟 1

- 行: 全 1,847 ／ 手書き 1,174 ／ 生成 673（`:13-685`）。`HELD` 2（`nestingOf` 61/14、`find~16` 52/10）。
- 取り込むファイル: 213（`src` 48 ／ `tests` 165）。
- 表 T-075: `FR-010`（`OW-1`）・`FR-047`（`OW-1`）・`FR-054`（`OW-2`）。
- 証拠: 27 件（手 14・区画 16・両方 3。誕生 `1d0412b1`・`4586e0ac`・`fc77dc48`）。
- **S2**: 拒まれた継ぎ目は 0 である。下限に届く組は、暦 〜 不変条件の **0.17（6 件中 1）**だけで、較正の「本物の継ぎ目」（0.14〜0.29、`CR-432` の 4.1）の帯にある。波 B はどの集合にも無い。
- **S3**: 範囲どうしの読みは DAG である（輪 0）。

| 行 ID | ユニット | 責務文（S5） | 範囲 | 行 |
| --- | --- | --- | --- | --- |
| `UF-1`（残る） | `schedule.ts` | 「日程データの群を表 T-064 の `PI-1` のとおりに公開する」。兄弟の名の列挙は (b)。「`uid` でタスクを引く（`taskByUid`）」は `PI-1` の語彙の 1 項なので (b) | `:1-12` `:703-707` ＋ 出し直しの行 | 17 ＋ 出し直し |
| `UF-126` | `schedule-generated.ts` | 「`erd.json` と表 T-209 から生成した日程データの型と列の定数を持つ」。「手で直さない」「`npm run gen` が書く」は (c) | `:13-685`（生成器が書く） | 673 |
| `UF-127` | `plan-actual-state.ts` | 「`Task` の予実の状態を表 T-019a の手順で判別する（`FR-010`）」 | `:686-702` | 17 |
| `UF-128` | `working-calendar.ts` | 「文書の暦の日付の算術 —— 字面と日の往復・暦日の数え・稼働日の数えと進め・実績の長さ（`FR-054`・`DC-3`・`FD-6`・`FR-011`）」。列挙は (b)。「受け入れる日付の範囲（表 T-214）を越えたら投げる」「暦が無ければ既定の暦（`S-106`）」は (c) | `:708-1008`（`CalendarDay` .. `lastDayForLength`） | 301 |
| `UF-129` | `task-delay.ts` | 「`Task` が遅れているかと、遅れの稼働日数を表 T-021b の起点と終点から判ずる（`FR-047`）」。「稼働日で数える」は (c) | `:1009-1042`（`delayStart` .. `delayWorkingDays`） | 34 |
| `UF-130` | `custom-colour.ts` | 「選んだ色の保存の綴りを表 T-017b の `CV` 行に従って作り・読み・確かめる」は (b)。「パレット色の名は表 T-294 の綴り」は (c) | `:1077-1130`（`TRANSPARENT` .. `customColourChosen`） | 54 |
| `UF-131` | `schedule-invariants.ts` | 「文書の不変条件を表 T-220 の行ごとに判じ、違反の箇所を返す」。行の列挙は (b)。「表を駆動して回す（MUST）」「操作が終わった文書について判ずる」は (c) | `:1043-1076` `:1131-1847`（`InvariantKind` .. `Invariant`、`AcceptedDays` .. `scheduleViolations`） | 751 |

合計 1,847。重なり 0、漏れ 0。

- **負う要求の移し替え**: `FR-010` → `UF-127`、`FR-047` → `UF-129`、`FR-054` → `UF-128`。`UF-1` は `—`。
- **兄弟どうし（輪 0）**: `plan-actual-state` ← `working-calendar` ← `task-delay`、`working-calendar`・`custom-colour` ← `schedule-invariants`、全員 → `schedule-generated`。入口は兄弟を出し直すだけで、兄弟は入口を取り込まない。
- **公開エントリ**: `PI-1` の名は 1 つも動かない。入口は区画の 25 と手の 32 をそのまま出し直す（213 の取り込みの書き換えは 0）。
  ⛔ 出し直しは `export { … } from './x'` と `export type { … } from './x'` の 2 形で書く。`export *` は `check-published-members.py:111`・`:155` が「読めない export」として赤にし、波括弧の中の `type X` は `:147-153` が語 `type` を名前として拾う。
- **ファイルの中の波**: S1 ＝ `schedule-generated.ts`（⛔ **最初にしないと、S2 以降で TDZ の輪ができる**）→ S2 ＝ `plan-actual-state` → S3 ＝ `working-calendar` → S4 ＝ `task-delay` → S5 ＝ `custom-colour` → S6 ＝ `schedule-invariants`。
- **S1 の手順（生成器の出力先を変える）**: 表 T-075 に行を足す → `tools/generate_unit_tree.py` が空の雛形を作る → `npm run gen` が区画を足す → 旧 `schedule.ts` の区画は的でなくなるので、同じコミットで消す（`generate_entity_types.py:2652` は的のファイルが無いと `MISSING` で止まる）。
  書き換える所: `tools/generate_entity_types.py:2125-2127`（`TARGETS`）と docstring `:9`、`:2479-2484`（`PUBLISHED_READ_BY_SRC` の鍵を新しいパスへ。中身に `ENTITY_ROWS` を足す）、`tools/generate_startup_template.py:102-103`・`:1050`（ファイルの字を読む道具。直さないと検査 27 の `startup:check` が赤）、`.claude/skills/spec-graph-check/check-provenance.py:65`、`docs/development-rules/09-tools.md:141`。
  `UF-126` の見出しの純粋性は `@purity    n/a`（前例 `snapshot-source.ts:4`）、表 T-075 の純粋性は `—` とする。
- **他のファイルの `TRAP` の文（コメントだけ）**: `input-command-translator.ts:1241`・`document-settings.ts:467`・`task-group-order.ts:14` が `schedule.ts` を名指す ⇒ S6 のコミットで `schedule-invariants.ts` へ直す。

### 4.7 `json-codec.ts`（`UF-35`）—— ⭐ 割る: 生成器の出力先を変え、兄弟 1

- 行: 全 1,515 ／ 手書き 339 ／ 生成 1,176（`:39-1214`）。生成器は `tools/generate_json_schema_validator.py`（`TARGET` は `:68`）。
- `HELD`: `collectFaults` 55/22、`documentFromJson` 57/11。
- 証拠: 32 件（生成だけ 20・手書きだけ 9・両方 3 ⇒ 手で開いたのは 12 件）。波 B は 0 件。
- **S2**: 生成 〜 古い版 **0.60（5 件中 3）** —— 形式の上では拒むが、当てない（0 節 ③ の 4）。
  共に変えた 3 件（`3d342753`・`a422e16f`・`c6407388`）は、どれも「原稿 `erd.json` に列を足し、古い版の文書のためにその列を埋める」手番である。割ったあとも、手で開くのは「原稿 ＋ `json-codec.ts`」のままである。
  入口 〜 古い版は 5 件中 5 ⇒ 古い版を埋める関数は入口に残す。
- **手書きの 339 行は、これ以上割らない。**

| 行 ID | ユニット | 責務文（S5） | 範囲 | 行 |
| --- | --- | --- | --- | --- |
| `UF-35`（残る） | `json-codec.ts` | 「`GRS JSON` の文字列と文書を相互に変える（`FR-024`・`FR-073`）」。「形式の版を判じ、新しい版の知らない鍵を通す（`OP-7`）」「古い版の欠けた列を埋める（`AT-141`〜`AT-143`・`GP-1`）」「スキーマの外れで拒む（`RS-25`）」「設定値を範囲へ寄せて数える（`OP-6`・`PI-2`）」は (a) | `:1-38` `:1228-1238`（`columnOf`・`refusal`）`:1347-1515`（`formatVersionReading` .. `jsonFromDocument`） | 218 |
| `UF-152` | `json-schema-validator.ts` | 「`GRS JSON` の値を、表 T-220 の前文のスキーマ（`grs-document.schema.json`）に当て、外れを並べる」。「節の表は生成器が刷る」「11 の語だけを解す」「知らない鍵の外れを名乗らせる（`isUnknownKeyFault`）」は (c) | `:39-1227`（生成 `:39-1214` と `NOT_A_KEY_THIS_SHAPE_CARRIES`・`fault`・`isUnknownKeyFault`）`:1239-1346`（`pointer` .. `collectFaults`） | 1,297（生成 1,176 ＋ 手 121） |

- **取り込み（輪 0）**: `json-codec.ts` → validator（実行時）。validator → `json-codec.ts` は型 `JsonFault` だけ。validator → `mspdi-codec.ts` は `isObject`。
- ⚠️ **1 か所だけ形が変わる**: `documentFromJson`（`:1476`）が `GRS_DOCUMENT_SCHEMA` を直に渡している。validator がスキーマの根を閉じ込めた小さな関数（例 `collectSchemaFaults(value, out)`、5 行ほど）を `export` し、`:1476` の 1 行をその呼び出しに替える。
  ⇒ 生成の定数に `export` を足さないので、検査 30 は動かない。
- **生成器の書き換え**: `generate_json_schema_validator.py` の `:15`（docstring の出力先）・`:68`（`TARGET`）・`:131`・`:137`（「the walker in json-codec.ts」の文）。
  新しいファイルには手で見出しと 2 つの印を置き、そのあとで生成器を走らせる（印が無いと生成器は `:401-405` で止まる）。`json-codec.ts` からは、生成器を直したあとに印ごと消す。
- 公開エントリ: `PI-20` の名と型 3 つは `json-codec.ts` に残る ⇒ `document-codec.ts`・`embedded-html-codec.ts`・試験 10 本は変わらない。

### 4.8 `mspdi-codec.ts`（`UF-36`）—— ⭐ 割る: 入口 1 ＋ 兄弟 4

- 行: 2,023（生成 0）。`HELD`: `readXml` 105/27、`readStartTag` 49/27、`tasksInWbsOrder` 31/16、`writtenProjectChildren` 56/7。
- 表 T-075: `FR-021`（`OW-2`）・`FR-057`（`OW-1`）。
- **S2**: 最も強いのは読み 〜 書きの **0.83（6 件中 5）** —— 拒む。往復の写しは 1 つのユニットのまま `mspdi-codec.ts` に残す。
  感度: 改名の一斉 `7f9b4692` を除いても 0.80（5 件中 4）。初期の組み上げ `b41e412d` も除くと下限に届かない。ただし向きはどの取り方でも 0.75〜0.83 である。
- 出す 4 つは、写しとは別の出どころに縛られ、S2 はどれも「証拠なし」で拒まない。
- WBS の並び・制約・実績の長さは入口に残す —— 表 T-059 の値が `writtenTask` の並びの中に書かれており、出すと 1 つの表に 2 ファイルで答えることになる（S3）。版の判定も残す（列 `AT-143` の 1 つで、`json-codec` へ公開している）。

| 行 ID | ユニット | 責務文（S5） | 範囲（束ねる名） | 行 |
| --- | --- | --- | --- | --- |
| `UF-36`（残る） | `mspdi-codec.ts` | 「MSPDI の要素の木と文書を、列ごとに相互に写す（`FR-021`・`FR-057`）」。「読まない子を `carry` に控え、書くとき元の位置へ戻す（`DF-3`・`MR-3`・`RS-60`）」は (a)。「版を判じる（`EX-1`・`AT-143`）」「書き出すときに作る値（表 T-059）」「実績の長さを停止日に直す（`FR-011`・`AT-141`）」「制約の 2 列（`EX-11`・`EX-12`）」は (b)。「兄弟が使う語彙と、外へ見せる入口と型」は (c) | `:1-61` `:79-101` `:127-131` `:375-560`（`leafText` .. `isObject`）`:722-734` `:774-998`（`ImportRun` .. `tellRoundedActualDurations`）`:1024-1085` `:1117-1350` `:1423-1502` `:1651-2023`（`GRS_SAVE_VERSION` .. `writtenException`） | 1,262 |
| `UF-153` | `mspdi-xml.ts` | 「XML の文字列と要素の木を相互に変える」。「宣言に無い属性と、定義の無い実体参照を拒む（`FR-023`）」「明示のスタックで入れ子を読む」「UTF-8 の宣言と名前空間を置いて書く（`CN-5`）」は (c) | `:102-126`（`XmlElement` .. `fault`）`:132-374`（`NAMED_REFERENCES` .. `writtenXml`） | 268 |
| `UF-154` | `mspdi-child-placement.ts` | 「書き出す要素の子を、交換相手のスキーマの `xsd:sequence` の順に置く（`EX-10`）」。「順の名簿を `mspdi-child-order.json` から持つ」「`xsd:all` の親は届いた順」は (c)。「持ち回った子を届いた順で戻し、宣言の無い子を宣言された隣に付ける」は (a) | `:62-78`（`ParentOrder` .. `ParentPath`）`:561-721`（`writtenCarriedElement` .. `placesByNeighbour`） | 178 |
| `UF-155` | `mspdi-fade-frames.ts` | 「フェード日数を、MSPDI の拡張領域の枠と相互に写す（`EX-6`・`EX-8`）」。「名簿の順に使われていない枠を探し、取込元の枠を上書きせず、書けなければ告げる」「読むときは `Alias` で名乗った枠だけを取る」は (c)。「定義を 1 度だけ書く」は (a) | `:735-773` `:999-1023` `:1086-1116` `:1503-1650`（`ClaimedFrame` .. `writtenFadeValues`） | 243 |
| `UF-156` | `mspdi-imported-rows.ts` | 「取り込んだタスクの WBS の木から、行と所属を作る（`FR-058`）」。「`maxGroupDepth` で止め、深いタスクは最も深い祖先の行へ載せる」「行の ID をタスクの UID から作る（`AT-51`）」は (c) | `:1351-1422`（`ImportedRows` .. `rowIdOfTask`） | 72 |

合計 2,023。重なり 0、漏れ 0。

- 負う要求は 4 行とも `—`。`FR-058` の起点は `UF-77` である。`UF-36` の責務の欄には、`EX-10`・`EX-6`・`EX-8`・`FR-058` を満たす兄弟の名を書く（`CR-439` の 4.7 と同じく 1 ホップで着くため）。
- **取り込み**: 兄弟だけで閉じた実行時の輪は 0 である。入口と `mspdi-fade-frames.ts` の間に実行時の輪が 1 つある（前例 `CR-432` の 4.1。どちらも読み込み時に相手の束縛を読まない）。`fault` は `mspdi-xml.ts` へ移す（`readXml`・`readStartTag` が 10 回使う）。
- 公開エントリ: `PI-20` の名と、外から読まれる `MSPDI_NAMESPACE`・`MspdiDecoding` ほかはすべて入口に残る ⇒ `document-codec.ts`・試験 6 本・`json-codec.ts` の取り込みは変わらない。入口が兄弟へ新たに `export` する名は 8 つ。
- **ファイルの中の波**: M1 ＝ `mspdi-xml` → M2 ＝ `mspdi-child-placement` → M3 ＝ `mspdi-imported-rows` → M4 ＝ `mspdi-fade-frames`。

### 4.9 割らないファイル

| ファイル | 判定の理由（測った数） | もう一度調べる合図 |
| --- | --- | --- |
| `import-document.ts`（`UF-19`、919） | `JDG-284` の ③ の後、コードを変えたコミットは 1 件（`e0f7d4ad`）で、`builtMerge` に触れていない。`builtMerge`（279/56）は分けても丸ごと移るだけで、帯の超過は減らない。S3: `builtMerge` のループ（`:688-709`）の本体が `FR-022` の答えを読み、同じ本体で `FR-056` の UID を払い出す。⚠️ `UF-19` は 4 つの要求の起点を共有し続ける | コードを変えるコミットが 5 件に届いたとき、または `FR-022`／`FR-056` を名指す変更要求が来たとき |
| `screen-values.ts`（`UF-86`、手 517 ＋ 生成 837） ・ `file-flow-values.ts`（`UF-89`、手 394 ＋ 生成 550） | 表 1 つ（T-280 ／ T-290）の領域で、1 つの出来事の腕が複数の状態機械を動かす（S3）。証拠は 3 件と 2 件。生成の区画は 3 節の類の規則で動かさない | —— |
| `document-settings.ts`（`UF-2`、手 113 ＋ 生成 423） | 手の部分は `clampedSettings` の 1 族だけ（証拠 3 件） | —— |
| `properties-panel.ts`（`UF-64`、863） | `FR-072` 〜 `FR-006` の残りが **0.89（9 件中 8）** で拒まれ、`FR-006` の核（欄の型・タスクの欄・行グループ）も 0.60〜0.80 で 1 つに戻る。立つのは担当者の部分（0.40）だけだが、その要求 `FR-008` の持ち主は `edit-resource.ts` である | —— |
| `input-command-translator.ts`（`UF-30`、1,366） | `CR-438` の 4.4 の拒みを分割前の木で再現した（0.62・0.81・0.75・0.57）。分割後のコミットを足すと、どの拒みも強まる —— 入口の台帳（表 T-109）〜 打鍵 0.79（14 件中 11）、〜 枠の引き 0.75（8 件中 6）、〜 行の腕 0.67（9 件中 6）、〜 指の振り分け（表 T-023a）0.59（17 件中 10）ほか。2 つの表を 1 つの兄弟へまとめて出す案は 7 組で、547 行の共有の補助を出す案は 3 組で拒まれる。波 B はこのフォルダに触れていない | —— |
| `dom-screen-surface.ts`（`UF-71`、手 970 ＋ 生成 153） | `CR-439` の 4.4「段 6 の後で入口を開く頻度を測る」を測った: `006aefbc` の後、フォルダへの 13 件のうち 6 件が入口を開き、手のコードを変えたのは 4 件で、うち 3 件は層・取り込み・返す面の登録、1 件は入口の語彙。`STYLE` だけに触れた変更は 0 件 ⇒ `STYLE` を兄弟へ配り直しても、分割後に開く回数は 1 回も減らない（全履歴で 38 件中 5 件）。`STYLE` と入口の残りは 0.87（38 件中 33）で共に変わる | `CR-551` の項目 11（`:294` の `STYLE.dividerBand`）は `STYLE` だけに触れる最初の変更かもしれない —— その着地の後に数え直す |
| `svg-renderer.ts`（`UF-32`、手 531 ＋ 生成 178） | 表 T-075 の `FR-080` は継ぎ目を出さない。候補の色の塊（`:123-275`、153 行）は証拠 4 件で下限に届かず、その規則は `FR-007`・`FR-041`（別の行が起点）に属する | 色の塊を変えるコミットが 5 件に届いたとき（`CR-548`・`CR-551` の後） |
| `agent-api-members.ts`（`UF-28`、724） | 表 T-107 の群ごとにメンバを出す案は、T-107 の型との共変で拒まれる（書き出しの群 1.00、5 件中 5）。書き込みの群は 0.57（7 件中 4）で証拠なし。証拠は計 18 件と薄い。`agentApiMembers` の 345/0 は入れ子の和であり、`R2.2a` を PASS し、`R2.2b` の入れ物ではない（0 節 ②）。メンバの本体を同じファイルの頂上の関数へ出して縮めるのは割ることではない | —— |
| `field-editing.ts`（`UF-107`） | 4.2 | 約束を 1 つの補助にまとめる別の変更要求（11 節） |

---

## 5. 新しい識別子

- `UF-126` 〜 `UF-168` は `a912f4ea` で空いている（`grep -rhoE "\bUF-[0-9]+" docs change-request src tests tools .claude/skills` の最大は `UF-125`。2026-09-23 に測った）。
  帯は調整役（セッション「handoff.md リファクタと不具合修正」）から受けた。最初の帯 `UF-126` 〜 `UF-160` は 35 で足りず、2026-09-23 に `UF-168` まで延ばしてもらった。
  ⛔ 当てる直前に測り直すこと（`02-changing-the-spec.md` の 2.5、検査 62）。
- 割り当て（表 T-075 の並び順）:

| ファイル | 新しい行 ID | 数 |
| --- | --- | --- |
| `schedule.ts`（`UF-1` の直後） | `UF-126` 〜 `UF-131` | 6 |
| `schedule-layout.ts`（`UF-5` の直後） | `UF-132` 〜 `UF-143` | 12 |
| `schedule-geometry.ts`（`UF-6` の直後） | `UF-144` 〜 `UF-149` | 6 |
| `item-hit-area.ts`（`UF-7` の直後） | `UF-150` 〜 `UF-151` | 2 |
| `json-codec.ts`（`UF-35` の直後） | `UF-152` | 1 |
| `mspdi-codec.ts`（`UF-36` の直後） | `UF-153` 〜 `UF-156` | 4 |
| `frame-loop.ts`（`UF-48` の直後） | `UF-157` 〜 `UF-168` | 12 |
| **計** | | **43** |

- **表 T-063 の行は、本書では予約しない。** 足すのは 5 行である —— `Schedule`・`ScheduleLayout`・`ScheduleGeometry`・`ItemHitArea` に 1 行ずつと、`DocumentCodec` の第 2 段（`json-codec.ts` と `mspdi-codec.ts` をまとめて、`UT-9` の前例に倣う）。
  番号は、当てる直前に調整役から取る（いまの最大は `UT-12`）。
  `SingleHtmlShell` は `UT-6` の行を書き直す（0 節 ③ の 11）。
- 欠陥の台帳の候補には `DFC-965` 〜 `DFC-967` を当てる（9 節）。`DFC-833` 〜 `DFC-839` は使わない。
- 新しい表・図・接頭辞・裁定の行は 0 である。

---

## 6. 波 —— 順と、並行してよいもの

### 6.1 ⛔ 入口の条件（MUST）

1. `CR-551` の波 0〜3、`CR-552`（最小描画幅）、`CR-553`（行の縦幅）が、この順に `refactor` に着地していること。
   ⭐ 順は調整役が決めた（2026-09-23）: `CR-551` → `CR-552` → `CR-553` → H2〜H10 → 本書の分割。
   理由: 2 本とも小さな編集であり、先に入れれば分割の照合器の基準が 1 度で定まる。先に割ると、2 本の `file:line` を兄弟のファイル（`UF-132` 〜 `UF-143` ほか）へ引き直させることになる。
   ⚠️ 本書は起草のとき 2 本を知らなかった（`8552a4a7` は本書の木 `a912f4ea` の後に入った）。触る所は 8 節の表に足した。
   ⭐ **機能の変更要求 8 本（`CR-555` 〜 `CR-562`）と `CR-565` は、本書の分割の後に置く**（調整役が決めた、2026-09-24、`496dd95b` の上で）。
   8 本は割るファイルを触るが、分割はそれを待たない —— H2〜H10 の直後に割る。
   理由: (a) 利用者の常の指示は「リファクタを先に終える」であり、段 7.5 はリファクタ、8 本は機能の仕事である (b) 8 本はどれも `CR-551` 〜 `CR-553` の着地の前に起草されたので、当てる時にはどのみち `file:line` を測り直す —— 兄弟のファイルへ引き直す手間はほとんど増えない (c) 8 本は小さな単一目的のファイルへ入ることになり、それが割る目的である (d) `CR-552`・`CR-553` は小さく、既に当てる途中だったので先に置いた —— 8 本はそれと違う。
   ファイルの順（6.2）は変えない。8 本が触る所は 8 節の末の表にある。
   ⭐ 利用者はこの順を認めた（2026-09-24、調整役のセッションで、逐語）: 「順番は提案通りで進めろ。」
2. `handoff.md` の 1 通目の 2 の ① の後続 H2〜H10 が着地していること。とくに `frame-loop.ts` を触る H3（押し続けとドロップでフレームを起こす）・H4（複数のタスクの貼り付け）・H7（`PND-181` の STOP）・H8（`CR-549` の `@provisional`）・H9（倍率の端で `FR-029` の通知を出さない）。
3. **着手の時に、本書の数をすべて測り直す**: 行数、関数名で引き直した範囲、共変（13 節の手 1）、`HELD` の値、取り込みの数、`UF-126` 〜 `UF-168` と表 T-063 の番号が空いていること。
   測り直して、4 節の判定が変わる組（とくに縁の 3 組 —— `pointer-shape` 〜 `held-press-preview` 0.50、`task-figures` 〜 `comment-box` 0.50、`label-placement` の検査 55）が出たら、割る前に本書の 15 節（まだ無い）に書き、前に立つ者が判ずる。
4. 緑の基準: `vitest`・`check.sh`・`npm run gen:check` の赤の集合を、割る前に 1 度記録する（割ったあとに同じであることで判ずる）。

⭐ 割る作業は段 8（図・測り直し・性能）の**前**に置く —— 割ったあとの形で、図と性能を 1 度だけ測るためである（`handoff.md` の冒頭の節の 4、`JDG-291`）。

### 6.2 ファイルの順

| 順 | ファイル | 理由 |
| --- | --- | --- |
| 1 | `schedule.ts`（4.6、波 S1〜S6） | 生成器の出力先を変える。`CR-551` の波 0（`npm run gen`）と 1d がこのファイルの区画に触るので、その後に置く。`Entity` の中で最も読まれる（213 ファイル）ので、出し直しの形を最初に確かめる |
| 2 | `schedule-layout.ts`（4.3、波 L1・L2） | `CR-551` の 1a が `planDateText`・ラベルの測り・`fitZoom` に、`CR-552` が `keptByLevelOfDetail` とその呼び手に、`CR-553` が `bandFloorOf` とその呼び手に触るので、3 本の後に置く |
| 3 | `schedule-geometry.ts`（4.4、波 G1〜G3）・`item-hit-area.ts`（4.5） | `CR-551` の 1a が `chevronOutline` と `:448-451` に触る。`item-hit-area.ts` は誰も触らない |
| 4 | `json-codec.ts`（4.7）・`mspdi-codec.ts`（4.8、波 M1〜M4） | `CR-551` の 1d が `json-codec.ts` の区画と `documentFromJson` を変える。`json-codec.ts` の出力先の変更は、1d の後の別のコミットにする（1d が生成器を触るかもしれない —— `CR-551:1217`） |
| 5 | `frame-loop.ts`（4.1、波 F1〜F4） | `CR-551` の波 2 と H3・H4・H7・H8・H9 が触る。照合器が要る。最後に置く |

⭐ **並行してよいもの**: 5 つの順は `src/` の上では互いに素である（どの入口も名前を出し直すので、フォルダの外の取り込みの行は変わらない）。
⇒ 別々の作業木で、別々の体に並行して割らせてよい。
⛔ ただし、**1 つのファイルを割る体は同時に 1 体だけ**である（`CR-439` の 8.1）。
⛔ 共有の記録は取り合いになる —— 表 T-075 の行、`SU-3`、`units.contract.test.ts` の数、`function-size-baseline.txt`、`tools/generate_entity_types.py` の `PUBLISHED_READ_BY_SRC`、`audit-ch5.py:83`、表 T-063。
⇒ 割る体はこれらを書かない。**前に立つ者が 1 本ずつ併合し、併合した木で測り直して書く**（`CR-439` の 8.3 と同じ）。
⭐ 割る体が書いてよい共有のファイルは、生成器の出力先を変える波（S1・`json-codec.ts`）の生成器と、自分のファイルの `PUBLISHED_READ_BY_SRC` の行だけである。

⭐ 各コミットで確かめること: `vitest` が試験を 1 本も書き換えずに緑（`units.contract.test.ts` の数の 1 行を除く）、`npm run gen:check`、`check.sh` の赤の集合が割る前と同じ、`frame-loop.ts` は照合器が一致すること。
e2e と `parity` は段 7.5 の出口で 1 度だけ走らせる（`JDG-291` の「e2e と parity は段の出口でだけ」に倣う）。
⭐ 仕様だけを読む試験の体を割る体の横に置くかは、前に立つ者が決める（`CR-439` の 15.1 の (7) の前例では、その体が `DFC-750` を 1 つ見つけた）。

### 6.3 ⛔ 割る体の依頼文に逐語で書くこと（どのファイルにも共通）

**MUST**
1. 公開エントリの名前は、いまと同じ名前と署名で入口から読めること。兄弟へ移る名は `export { … } from './…'` で出し直す。`export *` は使わない。
2. 新しいファイルは、入口と同じ見出しのコメント（`@unit      UF-n `・`@component <名>, layer <層> (table T-062)`・`@purity    <純粋性>`）で始めること。`@publishes` は入口だけが持つ。
3. 生成された定数の塊を手で動かさないこと。動かすのは、4.6 の S1 と 4.7 の生成器の出力先の変更だけである。
4. 兄弟はモジュールの頂上（関数の外）で入口の名を読まないこと（評価の順）。
5. 閉包の塊は 4.1 の形で出し、宿主への呼び出しの順を変えないこと。
6. 振る舞いを変えないこと。割り方が本書の範囲と食い違ったら、止まって報告すること（黙って範囲を変えない）。
7. ⭐（逐語）「各波のあとに検査 45・55・26b を回し、終了コードと赤の集合を報告せよ。検査 55 でコメント密度 10% を超えたら comment-rules-src.md の 5 節どおり TRAP を消し、消した文を報告せよ。」
8. ⭐（逐語）「『前例がある』と言う前に、その前例が crossing-names-baseline.txt（借り）に載っていないかを grep せよ。」
9. ⭐（逐語。`CR-438` の 8.3 の 6 から引いた）「状態機械の出来事の名前（docs/spec/_source/state-machines.json の EV キー）と同じ語を新しい関数名・ファイル名に使うなら、意味を揃えること」。
   ⚠️ 本書の名で出来事の語と重なるのは `interaction-record.ts`（操作の記録の領域 表 T-295）・`field-focus.ts`（名前付けと入力欄 表 T-292）・`document-file-flow.ts`（ファイル操作 表 T-290）・`copy-and-paste.ts` である。どれも、その領域の出来事を運ぶ所なので意味は揃っている。当てる手番で `state-machines.json` を引いて確かめること。

**MUST NOT**
1. フォルダの外のファイルの取り込みの文を書き換えないこと。
2. 試験を書き換えないこと（`units.contract.test.ts` の数は前に立つ者が書く）。
3. `git stash` を打たないこと。`commit` と `push` は前に立つ者が行う。

---

## 7. 各波が書き換える検査と基準線

| 検査・基準線 | 書き換え（割る 7 ファイルの合計。内訳は 4 節） |
| --- | --- |
| 18（`generate_unit_tree.py --check`）と 表 T-075 | 行を 43 足す（5 節）。負う要求の移し替えは 4 節。検査 26b・18・44 は、表の行が入るまで赤である（`CR-439` の 15.1 の (2)）⇒ 表の行と `src/` を同じコミットで動かす |
| 表 T-063 と `audit-ch5.py:83` | 行を 5 足す（12 → 17）。`UT-6` を書き直す |
| 表 T-074 の `SU-3`（`05-07-design.md:247`）・`:253` の文・`tests/contract/units.contract.test.ts:50-51` | 114 → **157**（波ごとに、その時点のファイルの数を書く）。`:253` の並びは最後の波で書き直す —— 割ったあとは `EditDocument` 18、`InputCommandTranslator` と `SingleHtmlShell` 15、`ScheduleLayout` 13、`ScreenRenderer` と `DomScreenSurface` 11 ほか |
| 60（`function-size-baseline.txt`） | 鍵を書き直す行 13: `frame-loop.ts` の `openDocumentIntoHold`・`tentativeDependencyOf`・`viewSettings`、`schedule-layout.ts` の `pinnedBandOf`・`fitZoom`、`schedule-geometry.ts` の `routeOf`・`taskGeometryOf`・`progressLineOf`、`mspdi-codec.ts` の `readXml`・`readStartTag`、`json-codec.ts` の `collectFaults`、`schedule.ts` の `nestingOf`・`find~16`（丸ごと移る関数は同じ値 —— `schedule.ts` と geometry は切った字で確かめた）。<br>値を書き直す行: `frameLoop` 2525 → およそ 1,460、`runFrame`・`receiveInput`・`carryOutAction`・`exportScene`・`answerSettledEntry`（呼び出しの形が変わる数行）。<br>新しい行: 0〜2（`view-place` と `frame-clock-wakes` の工場が 50〜55 行で帯の縁）。<br>`excess-lines` はおよそ 1,050 下がる見込み（`frameLoop` の超過 2,475 → およそ 1,410）。<br>⛔ **実測だけを書く。基準線を動かす前に、前に立つ者がチャットで利用者の許しを得る**（`JDG-118` が書き換えを許しているが、`911e3d31`・`CR-438`・`CR-439` の前例どおり、動かすたびに数を見せる）。分類器が止めたら迂回しない（`handoff.md` の 2.11 の ⑮） |
| 30（`check-generated-constants.py`）と `tools/generate_entity_types.py` の名簿 | `frame-loop.ts`: `PUBLISHED_READ_BY_SRC`（`:2500`）に 4 つ足す（`NOT_STORED_END_POINTER_SIZES`・`NOT_STORED_INTERACTION_RECORD_LIMITS`・`NOT_STORED_REPEAT_TIMES`・`NOT_STORED_SCALE_MESSAGE_TIMES`）。`WATERMARK_UNLOCK_DIGEST` を `PUBLISHED_READ_BY_TESTS_ONLY`（`:2541`）から移す。<br>`schedule-layout.ts`: `NOT_STORED_SIZES` を TESTS_ONLY から SRC へ移す。<br>`schedule-geometry.ts`: `NOT_STORED_SELECTION_SIZES` を SRC に足し、`NOT_STORED_DUMMY_SIZES` を TESTS_ONLY から SRC へ移す。<br>`schedule.ts`: 鍵を新しいパスへ移し、`ENTITY_ROWS` を足す（4.6）。<br>`json-codec.ts`・`mspdi-codec.ts`・`item-hit-area.ts`: 変わらない |
| 55（コメント密度。`src/` の基準線の 1 行目は `0` なので、1 行の超過でも赤） | ⛔ 超える見込み: `pointer-shape.ts` 19.1%（超過 31）、`held-press-preview.ts` 14.1%（超過 7）、`view-place.ts` 14.0%（超過 6）、`dependency-route.ts`（超過 3〜4）、`label-placement.ts`（超過 1）、`mspdi-child-placement.ts`（超過 1）。<br>⇒ その波で `comment-rules-src.md` の 5 節の手当て（`TRAP` を消してコードで守るか、台帳へ起こす）が要る。<br>⚠️ 縁: `working-calendar.ts` は上限ちょうど（見出しの行を増やすと超える） |
| 45（同じ式の繰り返し） | 関数を丸ごと動かすだけなので、群の数は動かない見込みである。入口が新たに `export` を付けると別のコンポーネントの同じ字面に届くことがある（`handoff.md` の 2.11 の ⑱）⇒ 各波で回す |
| 26b（`check-published-members.py`） | 表 T-064 は 1 行も動かない。出し直しは `export {` で書くので読める |
| 19（層）・59（`components.json`）・61（モジュールの状態） | **変わらない。** 新しいユニットはどれも元のファイルと同じコンポーネントのフォルダに置き、兄弟が外から取り込むのは入口がいま取り込むコンポーネントだけである ⇒ `components.json` に新しい辺は要らない。検査 61 は `framework` を見ず（`check-module-state.py:103` の `LAYERS`）、`Entity`・`Adapter` の割るファイルにはモジュールの頂上の `let`/`var` も書き換える `const` も 0 である |
| 21（`check-provenance.py`）・27（`startup:check`）・20 | `schedule.ts` の出力先の変更だけが触る（4.6） |
| 62（識別子の予約） | 当てる直前に、5 節の「空いている」を測り直す |
| 行番号を引く記録 | `frame-loop.ts:NNN` の形の参照は 359 件ある。生きている台帳（`defects.md` の開いた行）と、着地していない変更要求の行番号だけを、割るコミットで書き直す（`CR-439` の 8.4 と同じ方針）。閉じた欠陥・着地した変更要求・裁定・測定の記録は書き換えない |

---

## 8. 衝突 —— 着地を待つ作業が、割ったあとどこに落ちるか

| 作業 | 触る所（`a912f4ea`） | 割ったあとの置き場 |
| --- | --- | --- |
| `CR-551` 波 2 項目 11（`:339` の `'GR-16'`、`PK-10`） | `POINTER_BY_GRAB` | `pointer-shape.ts`（`UF-157`）。「出したときに中央へ送る」は、殻の側なら入口の `carryOutAction` |
| `CR-551` 波 2 項目 12（`:1403-1418` 二重カーソル） | `dualCursorEventOf` | `frame-loop.ts` の入口 |
| `CR-551` 波 2 項目 10（`:1652` 全体表示） | `viewSettings` | `view-place.ts`（`UF-161`） |
| `CR-551` 項目 13（`QN-10`・`CD-6`・`IC-106`） | `confirmationOwedBy`／`answerSettledEntry` | 問いと連鎖の数え方なら `confirmation-questions.ts`（`UF-162`）、入口の割り振りなら入口 |
| `CR-551` 波 1a（`planDateText`・`planDatesOf`） | `schedule-layout.ts:265-278` | `name-label.ts`（`UF-136`） |
| `CR-551` 波 1a（ラベルの幅の測り） | `layoutFromSchedule#9`（`:871-876`）・`nameLabelOf`・`labelWidth` | 入口 ／ `UF-136` ／ `UF-133` |
| `CR-551` 波 1a（`fitZoom`、`DFC-791`〜`793`） | `schedule-layout.ts:1263-1332` | `fit-zoom.ts`（`UF-143`）。`dateAtX` を変えるなら `time-axis.ts`（`UF-132`） |
| `CR-551` 波 1a（山形の切り込み `:448-451`・`chevronOutline` `:223`） | `schedule-geometry.ts` | `task-figures.ts`（`UF-144`） |
| `CR-552`（最小描画幅。`keptByLevelOfDetail`、`schedule-layout.ts:599-612`） | 描く行とタスクを倍率で減らす所 | `level-of-detail.ts`（`UF-139`） |
| `CR-552`（`keptByLevelOfDetail` の呼び手、`schedule-layout.ts:855` 付近・`:911-913`・`:943-948`） | `layoutFromSchedule` と `#9` | `schedule-layout.ts` の入口 |
| `CR-553`（行の縦幅。`bandFloorOf`、`schedule-layout.ts:788-796`・`:971-984`） | 帯の床と帯高 | `schedule-layout.ts` の入口（`bandFloorOf` と `layoutFromSchedule`） |
| `CR-553`（`frame-loop.ts:1642` の注「omit the LF-3 floor」、コメントだけ） | `viewSettings` の中 | `view-place.ts`（`UF-161`） |
| `CR-552`・`CR-553`（`screen-regions.ts:70-104`・`row-title-panel-drawing.ts:98-106`・`:516` 付近・`dom-screen-surface.ts:452-456`・`:686` 付近） | —— | どれも本書が割らないファイルである（衝突なし） |
| `CR-551` 波 1d（2 つの列を落とす） | `json-codec.ts` の区画と `documentFromJson`、`schedule.ts` の区画 | `json-codec.ts` の手の側に残る（古い版と同じ種類）。区画は `npm run gen` が書く |
| `CR-551` 波 2（`input-command-translator.ts:694`・`:711`） | `ENTRY` の表と `commandFromEntry` | 割らない入口のまま |
| `CR-551` 項目 11（`dom-screen-surface.ts:294`） | `STYLE.dividerBand` | 割らない入口のまま（4.9 の合図） |
| H3 押し続け | `tickEntryRepeat`（と入口の `repeatHeldEntry`） | `frame-clock-wakes.ts`（`UF-163`） |
| H3 ファイルのドロップ（`PND-446` の STOP・`DFC-569` の DEVIATION） | `OPEN_ROUTE_FROM_CHOOSER` の見出し | `document-file-flow.ts`（`UF-165`）と `single-html-shell.ts` の受け口 |
| H4 複数のタスクの貼り付け（`PND-449` の STOP 2 つ） | `copyForPaste`・`pasteCommandFor` | `copy-and-paste.ts`（`UF-168`） |
| H7 `PND-181` の STOP | `watermarkUnlockDigest` | `watermark-unlock.ts`（`UF-166`） |
| H8 `@provisional`（`CR-549`、コメントだけ） | いまの印は `PND-250`・`PND-253`（→ `UF-158`）、`PND-142`・`PND-143`・`PND-338`・`PND-419`・`PND-144`（→ 入口） | `CR-549` が足す 5 つは未着地で、置き場を測れない |
| H9 倍率・行ズームの端の `FR-029` の通知 | `receiveInput`（`:4541-4546`）ほか | 入口 |
| `DEVIATION … (DFC-694)` の 3 か所 | `focusWantedField`・`noteChoiceMoved` ／ `carryOutAction` の `chooseRow` | `field-focus.ts`（`UF-164`）に 2 ／ 入口に 1。⚠️ 揃えるときは 2 ファイルを開く |
| `CR-551` の項目 14（`95f7c3ed`、既に着地） | `field-editing.ts:184-197`（日付の消去の受け手） | 割らない。⚠️ `CR-551:1342` は `field-commit.ts` しか名指していない ⇒ 波 3 の試験の体には `field-editing.ts:184-197` も渡すこと（前に立つ者への申し送り） |

---

### 8.1 本書の分割の後に当てる変更要求（`496dd95b` で起草の段階。調整役の決定 —— 6.1）

| 変更要求 | 何か | 触る、本書が割るファイル |
| --- | --- | --- |
| `CR-555` | 端が画面の外の依存線を省く | `frame-loop.ts`・`item-hit-area.ts`・`schedule-geometry.ts`・`schedule-layout.ts` |
| `CR-556` | 期限を緑の下向き矢印で描く | `item-hit-area.ts`・`schedule-geometry.ts`・`schedule-layout.ts` |
| `CR-557` | プロジェクトのテーマの色相を文書の設定から選ぶ | `frame-loop.ts` |
| `CR-558` | ハイライトボックスに 8 つの掴み点と線の太さ | `frame-loop.ts`・`item-hit-area.ts`・`json-codec.ts`・`schedule-geometry.ts` |
| `CR-559` | コメントボックスの引出し線の端に掴み | `frame-loop.ts`・`item-hit-area.ts`・`json-codec.ts`・`schedule-geometry.ts` |
| `CR-560` | 選択を `Ctrl` ＋ ドラッグで写す | `frame-loop.ts` |
| `CR-561` | 遅延診断 | `schedule-geometry.ts` |
| `CR-562` | 画像から `GRS JSON` へのプロンプトをアプリから写す | `frame-loop.ts`・`json-codec.ts` |
| `CR-563` | MCP が開いたページへ届く・読むだけの行 | 本書が割るファイルには触らない |

測り方: 各変更要求のファイルを `(frame-loop|schedule-layout|schedule-geometry|item-hit-area|mspdi-codec|json-codec|/schedule)\.ts` で `grep` した（`496dd95b` の 1 つ前の `ecdb8cec` で。`CR-564` は 0 件）。
`CR-565` は、調整役が既に本書の分割の後に並べている。

⛔ **`CR-555` 〜 `CR-563` は、それぞれ当てる時に、自分の `file:line` を分割した後の木で測り直すこと。**

## 9. 台帳へ起こす候補（⛔ 本書は台帳を書かない。当てる手番か前に立つ者が書く）

| 候補 | 何が食い違うか | 測り方 |
| --- | --- | --- |
| `DFC-965` | 表 T-075 の `UF-6`（`schedule-geometry.ts`）が `FR-020`（透かし、`OW-2`）と `FR-045`（期限の印、`OW-2`）を負うが、`src/entity/layout-engine` にそのコードが 0 行である | `git grep -n -i -E "watermark|deadline|FR-020|FR-045" -- src/entity/layout-engine` が 0 件（前に立つ者が測り直した） |
| `DFC-966` | 表 T-075 の `UF-107` の責務の文が古い —— 「入力中かを答え（`IN-5a`）」は改訂後の `IF-9`（知らせ）と合わず、日付の消去（`field-editing.ts:184-197`）の句が無い。その受け手には `// see` も無い | 体が読んだ（`fe-report`）。⚠️ 検査 55 の余裕は 0 行（コード 384 ／ コメント 42、上限 42）⇒ コメントを足すなら `:184-185` の `WHY` 2 行を置き換える形にする |
| `DFC-967` | `field-editing.ts` の `fieldCommit` は、プロパティパネルと文書名の 2 つの欄が書く 1 つの升である。同じ押しで両方が確定すると、後の書き手が勝つ | 体が読んだ（`fe-report`）。⚠️ 仮説である —— 起こす前に、同じ押しで 2 つが確定する道が実際に在るかを反証すること |

⚠️ ほかに、ほかの行の所在の行番号の古びがある: `DFC-651`・`DFC-679`・`DFC-694`・`DFC-702`・`DFC-751` の所在は `006aefbc` の版のままで、いまは +18 ずれている（例: `focusPropertyField` は `:64` → `:82`）。欠陥ではなく台帳の手入れである。

---

## 10. 利用者に問うた問い

### 問い 1 —— `frameLoop` を、割ったあとさらに縮めるか

⭐ **答え（利用者、2026-09-23、逐語）**:
> 「推奨は A（入れない。割ったあとで入口を開く頻度を測り、多ければ別の変更要求にする
> とせよ。」

⇒ **案 A に決まった。** 本書は `frameLoop` の作り変え（案 B）を計画に入れない。
段 7.5 で割ったあと、入口 `frame-loop.ts` を開いたコミットの数と理由を測り、多ければ別の変更要求にする（`CR-439` の 4.4 と同じ扱い）。
⚠️ 本書は裁定の行を持たない（本書の番号の帯に `JDG` は無い）。`rulings.md` の行は、`JDG` の帯を持つ調整役が書く。

**いま**: 本書の割り方で、閉包 `frameLoop` は 2,525 行 → **およそ 1,460 行**、`let` は 37 → 20、ファイル `frame-loop.ts` は手書き 4,683 行 → **2,672 行**になる。
残るのはフレームの 1 周期 —— 入力の受け取り（`receiveInput` 149 行）・命令の振り分け（`carryOutAction` 209 行・`answerSettledEntry` 84 行）・フレームの走行（`runFrame` 124 行・`exportScene` 85 行）—— と、その 3 つが共に読み書きする 20 の `let` である。
3 つを互いに別のファイルへ割る案は、共変 0.54〜0.59（小さい側 56〜57 件、波 B を除いても拒む）で証拠が拒んだ。

| 案 | すること | 得 | 費用 |
| --- | --- | --- | --- |
| **A（推奨）** | 本書のとおりに割り、入口はそのまま残す。割ったあとで入口を開く頻度と理由を測り、多ければ別の変更要求にする（`CR-439` の 4.4 と同じ） | 振る舞いを変えない移動だけで済む。照合器で確かめられる | `frameLoop` は約 1,460 行で `HELD` に残る |
| B | A に加えて、別の変更要求で「フレームの状態」を 1 つの記録へ移す —— 20 の `let` を 1 つのオブジェクトにまとめ、3 つの処理を頂上の関数にする | `frameLoop` が結線だけ（数百行の見込み、未測定）になる。関数の大きさの基準線が大きく下がる | 読み書きをすべて書き換える作り変えであり、割ることではない。3 つは共に変わるので、ファイルは 2,600 行ほどのまま残る。`JDG-78`（異常系は後）とぶつからないかを確かめる必要がある |
| C | 共変を無視して、3 つの処理を別々のファイルへ割る | ファイルが小さくなる | 1 つの変更で 2〜3 ファイルを開く回数が増える —— 利用者の目的「変更に強くすること」に反する（`CR-432` の 4.1 の閾値の理由） |

**推奨は A である。** 理由:
- 大きさは目的を測っていない（`JDG-284` の ②）。上限は段 8 の実測で決める（`JDG-54`）。
- B は、段 8 で性能を測る前に、フレームの走行そのものを書き換える。性能の比べ方（計画の記録 17）の基準が動く。
- A のあとでも B は選べる。先に割っておけば、B の書き換えの範囲は入口の 1 ファイルに閉じる。

**打った反証の 3 手**:
① `rulings.md` を `frameLoop`・`入れ物` で `grep` —— `frameLoop` を縮める形を決めた裁定は 0 件（`:563` は基準線の数の記録だけ）。`JDG-54`（`:131`）が大きさの上限を段 8 の実測まで置かない。
② `impact.py UF-48` —— 参照 1 箇所（`FR-071`、`01-04-requirements.md:4690`）で、形を決める行は無い。
③ 別の道 —— A は本書だけで閉じ、B は別の変更要求として後から選べる。
⇒ 規則では A に決まる。それでも問うのは、利用者が段 7.5 で `frameLoop` を名指したからであり、B を今から計画に入れるかどうかは利用者の目的の選び方だからである。

⭐ ほかの判断はすべて、3 手を打って問わずに決めた（0 節 ③）。

---

## 11. ⛔ この変更でやらないこと

| やらないこと | なぜ |
| --- | --- |
| 割ること | 本書は計画である。割るのは 6 節の波である |
| 振る舞いを変えること | 割るコミットは「試験が無変更で緑」と照合器で検証される。直しを混ぜると、ずれの出所を切り分けられない |
| `fieldEditingOf` の約束を 1 つの補助にまとめる書き直し | 移動ではなく書き直しであり、`DFC-679`・`694`・`702`・`751` と `JDG-78` が掛かる。段 7.5 の外の別の変更要求とする |
| `frameLoop` の状態を 1 つの記録へ移す作り変え | 10 節の問い 1 の案 B。利用者は案 A を選んだ（2026-09-23）—— 割ったあとで入口を開く頻度を測り、多ければ別の変更要求にする |
| 割らないファイルの入口の台帳（`STYLE`・表 T-109・表 T-023a）を配り直すこと | 共変が拒んだ（4.9） |
| 生成の区画を、例外の 2 つのほかに動かすこと | 3 節の類の規則 |
| `docs/spec/`・台帳・基準線・生成器の編集 | 分割のコミットが書く（6.2・7 節） |
| 起点が決まっていない 5 つの要求（`FR-032`・`FR-048`・`FR-051`・`FR-091`・`FR-106`）に、割ったユニットを起点として付けること | 付けると `05-07-design.md:517` の 12 件の列挙も動く。割ることとは別の手番である |

---

## 12. 書くときの作法（⛔ 当てる体はここを読んでから書く）

- **CJK の直後に `**` を開いて、その中を code span で始めない** —— docutils が壊れる。
- 「表 X の N 行」と書かない。行 ID を名指す。
- `python tools/fix_line_breaks.py` を、触ったファイルすべてに掛ける。
- 検査は**終了コード**で判ずる。⛔ `FAIL` を `grep` しない（検査 11・12・33 は `FAIL` の行を刷らずに赤になる）。
- 行番号は最初の編集で動く。⚠️ 範囲は関数名で切ること。
- `git log -L` は範囲を 1 つずつ掛ける。
- Windows の `python` は `PYTHONIOENCODING=utf-8`。スクリプトは Write でファイルに書いて走らせる（heredoc は `\` を壊す）。

---

## 13. 測り方の再現

本書の数は、次の手で `a912f4ea` から作った。
スクリプトはセッションの一時フォルダに置いたので木には無い。手順だけを書く（`CR-439` の 14 節と同じ扱い）。

1. **共変** —— 1 本のスクリプト（`cochange.py`）を 6 つの体が共に使った。
   入力はファイルと、ユニット名から `[始, 終]` の範囲の列への写像である。範囲ごとに `git log --format=@@@%H -L <始>,<終>:<ファイル> [<版>]` を 1 回ずつ走らせる。
   コミットごとに、差分の `-` と `+` の行から、コメント行（`//`・`/*`・`*` で始まる行）・空行・行末の ` //…` を除いたコードの行の多重集合を比べ、等しければその範囲について数えない。
   誕生は、`git show --unified=0 <sha> -- <file>` が足したコードの行 × 2 が、`git show <sha>:<file>` のコードの行以上であるものとした。
   組ごとに「両方 ÷ 小さい側」を出し、`--entry <入口>` の組は判じない。
2. **関数の大きさ** —— `.claude/skills/spec-graph-check/function-size.mjs` の標準入力に `{"files":[{"file":"<path>","text":"<本文>"}]}` を渡す。閉包の中の関数は、開始行が閉包の範囲の中のものを数えた。
3. **行の割り当て（`UD-4`）** —— 各ファイルで、範囲の JSON がファイルのすべての行をちょうど 1 度覆うこと（重なり 0、漏れ 0、合計 ＝ `wc -l`）を表明で確かめた。
4. **生成の区画** —— `// <generated -- do not edit by hand>` から `// </generated>` までを数えた（両端を含む）。
5. **読み手と名** —— `git ls-files src tests` の各ファイルの `import { … } from '…<ファイル>'` と動的な取り込みを読み、波括弧の中の名を数えた。兄弟の間の名は、各範囲のコードの語（コメントと文字列の中身を除く）を、別の範囲が頂上で宣言する名と突き合わせた。評価の順は、兄弟の頂上の `const` の初期化式に入口の名が現れるかで判じた。
6. **コメント密度** —— `.claude/skills/spec-graph-check/check-comment-rules.py` の `measure_text` を、各ユニットの範囲の行に 5 行の見出しを付けた字に掛けた（取り込みの行は足していないので、上限の見積もりである）。
7. **起点の共有** —— 表 T-075 の行を `grep` し、「負う要求」の欄の要求 ID と区分を数えた。
8. **識別子** —— `grep -rhoE "\b(UF|UT|DFC)-[0-9]+" docs change-request src tests tools .claude/skills | sort -t- -k2 -n -u | tail`。

---

## 15. 当てる時の測り直し（`c48f9736`、2026-09-24）と前に立つ者の判断

⭐ 6.1 の 3 のとおり、割る前に本書の数をすべて測り直した。  
測り直しが判定を 1 つ変えたので、前に立つ者が 15.3 で判じた。  
⛔ **15 節が 1〜9 節と食い違うところは、15 節が勝つ。**  
1〜9 節は `a912f4ea` の値のまま、調べた時の記録として残す（冒頭の状態の行）。

### 15.1 測り方

- 13 節と同じ手で測った（共変は 2.2 の数え方、関数の大きさは `function-size.mjs`、コメント密度は `check-comment-rules.py` の `measure_text`、生成の区画は 2 つの印の間、読み手は取り込みの文と名前空間の読み）。
- 4 つの読むだけの体が分けて測った —— `frame-loop.ts`（4.1）／ `schedule-layout.ts`・`schedule-geometry.ts`・`item-hit-area.ts`（4.3〜4.5）／ `schedule.ts`・`json-codec.ts`・`mspdi-codec.ts`（3 節・4.6〜4.8・道具の行番号）／ 横断（1.1・1.2・4.2・4.9・5・7・8・8.1 節）。
  スクリプトはセッションの一時フォルダに置いたので木には無い（13 節と同じ扱い）。
- どの体も、同じスクリプトを先に `a912f4ea` に掛けて本書の数を再現し（較正）、それから `c48f9736` を測った。
- 範囲は、本書の範囲を束ねる関数名で引き直した。
  `a912f4ea` の後に生まれた宣言の置き場は 15.3 の 3 に書いた。
- `UD-4` は 7 ファイルすべてでスクリプトが表明した —— 引き直した範囲がファイルのすべての行をちょうど 1 度覆う（重なり 0、漏れ 0、合計 ＝ `wc -l`）。
  `UF-162` の範囲は 4.1 のままである（15.3 の 1）。
- 6.1 の 1・2 の入口の条件は満たされていた: `CR-551` の波 0〜3（`6f674198`・`d4d87a08`・`f25fe735`・`14d34791`・`7c195c50`・`e122fd55`・`2753f20f`・`2a407232`）、`CR-552`（`989c7572`）、`CR-553`（`51827071`・`bfc27af9` ほか）、H2・H3・H4・H7・H10（`18db8646`・`0d446d12`・`bd83a718`・`338f39bf`・`121782d5`）と E-24（`a42c0cb4`）。
  H1・H6・H8・H9 は `a912f4ea` より前に着地していた（`b9e6b4e0` の申し送り）。

### 15.2 変わった数

#### `frame-loop.ts`（4.1）

| 項目 | `a912f4ea` | `c48f9736` |
| --- | --- | --- |
| 行（全 ／ 手書き ／ 生成） | 4,760 ／ 4,683 ／ 77（`:4684-4760`） | 4,879 ／ 4,802 ／ 77（`:4803-4879`） |
| 閉包 `frameLoop` | `:2158-4682`、2,525 行・分岐 4 | `:2316-4801`、2,486 行・分岐 4 |
| 閉包の直下の関数 | 125 | 127 —— `settled`・`isSameEnvironment` が頂上へ上がり、`runAskedFrame`・`pruneChoiceTo` と、返すオブジェクトの `pressContinued`・`fileDropped` が増えた |
| 2 字下げの `let` | 37（`:2172`〜`:3300`） | 37（`:2330`〜`:3449`）。<br>名も持ち主も同じで、新しい `let` は 0 |
| 閉包の上の頂上の宣言 | 254（関数 101・`const` 115・`type` 25・`interface` 13） | 272（関数 110・`const` 119・`type` 29・`interface` 14） |
| `HELD`（`function-size-baseline.txt`） | `:79-87` —— `frameLoop` 2525/4 ・ `carryOutAction` 209/51 ほか | `:81-89` —— `frameLoop` 2486/4 ・ `carryOutAction` 182/47。<br>ほかの 7 行は同じ値 |
| 取り込むファイル | 82（`src` 2 ／ `tests` 80）＋ 動的 2 | 93（`src` 2 ／ `tests` 91）＋ 動的 2（同じ `cr-430-*` の 2 本） |
| `// see` | 異なる ID 162、FR/NFR 33、起点が決まっていない 5 | 164（`DC-9`・`FR-086` が増えた）、FR/NFR 34、起点が決まっていない 6（`FR-086` は `05-07-design.md:526` の「いまは作らない」の 1 件） |
| 表 T-075 の `UF-48` | `FR-100`・`FR-102`・`NFR-002`・`NFR-003`・`NFR-010` | 行は字まで同じ（`05-07-design.md:448`） |
| 証拠の量 | 142 | 152 |
| コメント密度（検査 55） | 10.0%（上限ちょうど） | 10.0%（コメント 417 ／ コード 3,760、上限 417） |
| 外から読まれて兄弟へ移る名 | 5 | 7（15.3 の 5） |
| 入口が兄弟のために新たに `export` する名 | 31 ＋ `isSameEnvironment` | 31 ＋ `isSameEnvironment` ＋ `settled`（2 つとも既に頂上にある） |
| 残る閉包の行 | 1,428（手の束を足しておよそ 1,460） | 1,403（手の束を足しておよそ 1,435〜1,445） |
| 残る直下の関数 | 72 | 74 |
| 残る `let` | 20 | 20（同じ名） |
| 宿主への呼び出しの順 | `:2174` → `:2175` → `:2176` → `effectRunnersOf`（`:2290`）→ `:2329` → `:4592` | `:2332` → `:2333` → `:2334` → `:2443` → `:2481` → `:4701`。<br>順は同じで、工場と手の束は `:2334` の後、`:2443` の前に作る |
| 入口の中の 3 つの処理の組 | 0.59 ／ 0.55 ／ 0.54 | 関数だけの範囲で数え直して 0.54（48 件中 26）／ 0.53（58 件中 31）／ 0.54（48 件中 26）。<br>どれもまだ拒む（0 節 ③ の 6 は変わらない） |
| `pointer-shape` 〜 `held-press-preview` | 0.50（16 件中 8） | 0.50（16 件中 8）（15.3 の 2） |
| `confirmation-questions` 〜 `document-file-flow` | 4 件中 3、小さい側が下限に届かず証拠なし | 0.60（5 件中 3）（15.3 の 1） |
| ほかの兄弟どうしの組（小さい側 5 件以上） | どれも 0.5 以下 | どれも 0.38 以下 |
| 入口と兄弟の組（判じない） | 7 つが 1.00、`document-file-flow` 0.97、`frame-clock-wakes` 0.88、`held-press-preview` 0.81、`pointer-shape` 0.75 | 7 つが 1.00、`document-file-flow` 0.97、`held-press-preview` 0.81、`pointer-shape` 0.76、`copy-and-paste` 0.71、`row-band-ceiling` 0.67 |

#### `schedule-layout.ts`（4.3）

| 項目 | `a912f4ea` | `c48f9736` |
| --- | --- | --- |
| 行（全 ／ 手書き ／ 生成） | 1,482 ／ 1,363 ／ 119（`:1364-1482`） | 1,632 ／ 1,504 ／ 128（`:1505-1632`）。<br>生成の 9 行は `S-325` と `NOT_STORED_FIT_MARGIN`（`S-332`）で、どちらも `d4d87a08` |
| `HELD` | `:65-68` —— `layoutFromSchedule` 271/23 ・ `layoutFromSchedule#9` 72/18 ・ `pinnedBandOf` 59/9 ・ `fitZoom` 70/12 | `:68-70` —— `layoutFromSchedule` 268/23 ・ `layoutFromSchedule#8` 69/16 ・ `pinnedBandOf` 59/9。<br>`#9` → `#8` は `keptByLevelOfDetail` の `.filter` が消えたため（`JDG-424`）。<br>`fitZoom` は 43/6 で帯の中に入り、行が消えた |
| 取り込むファイル | `src` 15 ／ `tests` 102（名前空間 3） | `src` 15 ／ `tests` 107（名前空間 3） |
| 証拠の量 | 52 | 57 |
| 行のループ（S3） | `:844-1040`、閉包 `#9` | `:907-1099`、閉包 `#8`（`:929-997`）。<br>どちらも入口に残る |
| 外から読まれて兄弟へ移る名 | 19（`PI-5` の 17 ＋ `rulerTierOf` ＋ `TimeAxis`） | `PI-5` の 18（`labelledAssigneeUidOf` が `PI-5` に入り、`properties-panel.ts` が読む）＋ `rulerTierOf`。<br>`TimeAxis` は外の誰も取り込まない（`a912f4ea` でも 0）が、15.3 の 5 で出し直す |
| 兄弟どうしの取り込み | `label-placement` → `shape-tiers` ／ `fit-zoom` → `time-axis`・`drawn-rows`・`level-of-detail`・`shape-tiers` | 同じ ＋ `name-label` → `label-width`（`nameLabelWidthOf` が `labelWidth` を読む）。<br>輪 0、評価の順の問題 0 |
| 兄弟どうしの組 | 最大 0.43（7 件中 3、`shape-tiers` 〜 `label-placement`）、拒み 0 | 同じ最大で、拒み 0。<br>新たに証拠が立った組は `name-label` 〜 `time-axis` 0.40（5 件中 2）と `level-of-detail` 〜 `shape-tiers` 0.40（5 件中 2） |
| 検査 55 | `label-placement` 超過 1 | `label-placement` 超過 1、`fit-zoom` 超過 6（15.3 の 7） |

#### `schedule-geometry.ts`（4.4）

| 項目 | `a912f4ea` | `c48f9736` |
| --- | --- | --- |
| 行（全 ／ 手書き ／ 生成） | 1,295 ／ 1,271 ／ 24（`:1272-1295`） | 1,305 ／ 1,281 ／ 24（`:1282-1305`） |
| `HELD` | `:61-64` | `:64-67`、同じ値 |
| 取り込むファイル | （書いていない） | `src` 7 ／ `tests` 108 |
| 証拠の量 | 47 | 48（`d4d87a08` の 1 件、触ったのは `task-figures` の中のバーの外形だけ） |
| `task-figures` 〜 `comment-box` | 0.50（6 件中 3） | 0.50（6 件中 3）（15.3 の 2） |
| `task-figures` 〜 `dependency-route` | 0.33 | 0.33（6 件中 2） |
| 4.4 の融けた組 | 0.75・0.62・0.60・0.57・0.60 | 同じ（バーの外形はどちらの組でも大きい側） |
| `FR-020`・`FR-045` の `src/entity/layout-engine` のコード（4.4 と同じ `git grep`） | 0 行 | 0 行（9 節の `DFC-965`） |
| 入口のコメント密度 | （書いていない） | 上限ちょうど（22 ／ 22） |

#### `item-hit-area.ts`（4.5）

| 項目 | `a912f4ea` | `c48f9736` |
| --- | --- | --- |
| 行（全 ／ 手書き ／ 生成） | 1,150 ／ 1,049 ／ 101（`:1050-1150`） | 1,191 ／ 1,090 ／ 101（`:1091-1191`）。<br>増えた 41 行は H2（`18db8646`）の 4 つの宣言 |
| 取り込むファイル | （書いていない） | `src` 7 ／ `tests` 38（名前空間 1、`cr-388`） |
| 証拠の量 | 21 | 22 |
| 外から読まれて兄弟へ移る名 | 3 | 4（15.3 の 5） |
| `dependency-end` 〜 `marquee` | 3 件と 2 件、証拠なし | 3 件と 3 件、共に変えたのは 0 |
| 入口のコメント密度 | （書いていない） | 上限の下（85 まで 83、H2 が `TRAP` を 2 つ足した） |

#### `schedule.ts`（4.6）と 3 節

| 項目 | `a912f4ea` | `c48f9736` |
| --- | --- | --- |
| 行（全 ／ 手書き ／ 生成） | 1,847 ／ 1,174 ／ 673（`:13-685`） | 1,853 ／ 1,174 ／ 679（`:13-691`）。<br>後の 2 件（`6f674198`・`049a7ad1`）は区画だけを変えた ⇒ 手の範囲はすべて +6 ずれただけ |
| 取り込むファイル | 213（`src` 48 ／ `tests` 165） | 218（`src` 48 ／ `tests` 170） |
| 証拠の量 | 27（手 14・区画 16・両方 3） | 29（手 14・区画 18・両方 3） |
| 3 節「区画を変えたコミットのうち、原稿か生成器も変えたもの」 | 14/16 | 16/18 |
| 兄弟が頂上で読む生成の定数 | `:869`・`:1090`・`:1281` | `:875`・`:1096`・`:1287`（同じ 3 つで、ほかに頂上の読みは 0） |
| 暦 〜 不変条件 | 0.17（6 件中 1） | 同じ |
| 出し直す名 | 区画 25 ＋ 手 32 | 同じ。<br>うち `taskByUid` は入口が宣言するので、手の出し直しは 31 |
| 兄弟が新たに `export` を付ける名 | （書いていない） | `schedule-invariants` が関数の中で読む `serial`（`working-calendar`）と `TRANSPARENT`（`custom-colour`）。<br>今は `export` が無い。<br>評価の順の問題は無い |
| 他のファイルの `TRAP` の文 | `input-command-translator.ts:1241`・`document-settings.ts:467`・`task-group-order.ts:14` | `:1260`・`:464`・`:14`（3 つともまだ `schedule-invariants` の範囲のコードを指す） |
| `working-calendar` のコメント密度 | 上限ちょうど | 上限ちょうど（コード 224 ／ コメント 24 ／ 上限 24） |

#### `json-codec.ts`（4.7）

| 項目 | `a912f4ea` | `c48f9736` |
| --- | --- | --- |
| 行（全 ／ 手書き ／ 生成） | 1,515 ／ 339 ／ 1,176（`:39-1214`） | 1,548 ／ 383 ／ 1,165（`:39-1203`）。<br>`7c195c50`（`CR-551` の 1d）が手に 44 行を足し、`6f674198`・`989c7572` が区画を 11 行減らした |
| 取り込むファイル | `document-codec.ts`・`embedded-html-codec.ts`・試験 10 本 | 同じ 2 つ ＋ 試験 13 本 |
| 証拠の量 | 32（生成だけ 20・手だけ 9・両方 3） | 35（生成だけ 22・手だけ 10・両方 3） |
| 生成 〜 古い版 | 0.60（5 件中 3）—— 形式の上で拒むが当てない（0 節 ③ の 4） | 本書の古い版の組み方で 0.50（6 件中 3）—— もう拒まない。<br>退いた列を読む新しいコードを古い版に入れ、`formatVersionReading` を外すと 0.60（5 件中 3）。<br>どちらでも判定（validator を出し、古い版を埋める関数は入口）は変わらない |
| 入口 〜 古い版 | 5 件中 5 | 6 件中 6 |
| 生成の定数を直に読む手書きの所 | 1（`documentFromJson`、`:1476`） | 2（`documentFromJson` `:1509` と `collectionNamesOfEntity` `:1414`）（15.3 の 3） |
| 入口のコメント密度 | （書いていない） | 上限の下（コード 204 ／ コメント 21 ／ 上限 22） |

#### `mspdi-codec.ts`（4.8）

| 項目 | `a912f4ea` | `c48f9736` |
| --- | --- | --- |
| ファイル | 2,023 行 | 同じ blob（`a912f4ea` の後のコミットは 0）。<br>範囲・`HELD`・読み手・共変（読み 〜 書き 0.83）はすべて同じ |
| `fault` を使う回数 | 「`readXml`・`readStartTag` が 10 回」 | 20 回（`readXml` 14・`readStartTag` 6）。<br>入口も `documentFromMspdi`（`:788`）で 1 回呼ぶ ⇒ 入口は `mspdi-xml.ts` から `fault` を取り込む（`mspdi-xml.ts` → 入口は型 `MspdiFault` だけ） |
| 入口が兄弟のために新たに `export` する名 | 8 | 8（`ExportRun`・`PATHS`・`childOf`・`integerColumn`・`leaf`・`notice`・`textColumn`・`wholeNumberOf`） |
| `mspdi-child-placement` のコメント密度 | 超過 1 | 超過 1（見出しを 4 行と数えれば 2） |

#### 道具と記録の行番号（4.6・4.7・7 節）

| 所 | `a912f4ea` | `c48f9736` |
| --- | --- | --- |
| `tools/generate_entity_types.py` の `TARGETS`（`schedule.ts`） | `:2125-2127` | `:2170-2172`（並びの頭は `:2169`） |
| 同じファイルの docstring | `:9` | `:9` |
| 同じファイルの `PUBLISHED_READ_BY_SRC` | `:2500`（`frame-loop.ts`）・`:2479-2484`（`schedule.ts`） | 辞書の頭 `:2507`、`schedule.ts` の鍵 `:2531-2536`（`ENTITY_ROWS` はまだ無いので足す）、`frame-loop.ts` の鍵 `:2553-2555` |
| 同じファイルの `PUBLISHED_READ_BY_TESTS_ONLY` | `:2541` | 辞書の頭 `:2562`、`frame-loop.ts` の鍵 `:2595-2598`（`WATERMARK_UNLOCK_DIGEST` は `:2597`） |
| 同じファイルの `MISSING` で止まる所 | `:2652` | `:2706` |
| 同じファイルの `refuse_unknown_published_files` | （書いていない） | `:2631-2638`（15.3 の 3） |
| `tools/generate_startup_template.py` | `:102-103`・`:1050` | 同じ |
| `.claude/skills/spec-graph-check/check-provenance.py` | `:65` | 同じ |
| `docs/development-rules/09-tools.md` の `schedule.ts` の行 | `:141` | 同じ |
| `docs/development-rules/09-tools.md` の validator の出力先の行 | ⚠️ 4.7 が挙げていない | `:147` が出力先を `src/adapter/document-codec/json-codec.ts` と書く ⇒ `json-codec.ts` の出力先を変えるコミットで書き直す |
| `tools/generate_json_schema_validator.py` | `:15`・`:68`・`:127-133`・`:131`・`:137`・`:401-405` | 同じ（`7c195c50` が変えたのは `:262` の注だけ） |
| `.claude/skills/spec-graph-check/check-published-members.py` | `:111`・`:147-153`・`:155` | 同じ（ファイルは変わっていない） |
| 検査 30 の名簿（7 節） | `frame-loop.ts` は 4 つ足して 1 つ移す ／ `schedule-layout.ts` は 1 つ移す ／ `schedule-geometry.ts` は 1 つ足して 1 つ移す | 読み手は `a912f4ea` と同じで、名簿は 7 節のとおり。<br>`schedule-layout.ts` だけ `NOT_STORED_FIT_MARGIN` が 1 つ増える（15.3 の 3） |
| 検査 60 の 1 行目 | `excess-lines=7309 excess-branches=688` | `excess-lines=7189 excess-branches=674` |
| `fieldEditingOf`（4.2） | 469/1、`function-size-baseline.txt:73` | 462/1、`:75` |

#### 行番号を引く記録（7 節の最後の行）

`frame-loop.ts:NNN` の形の参照は、本書を除く `.md` の行で数えて `a912f4ea` の 359 から、`c48f9736` で 392 になった（追跡している 63 ファイルに 485 回）。  
割る 7 ファイルごとの内訳を下に置く。  
数えたのは `<file>.ts:NNN` の出現の回数で、ファイル名の後の裸の `:NNN` は数えていない（変更要求はこれより多く持つ）。

| ファイル | `defects.md` の開いた行（状態が 実測済・取下げ でない 208 行） | `pending-decisions.md` の開いた行 | 着地していない変更要求 |
| --- | --- | --- | --- |
| `frame-loop.ts` | 86 | 2（`PND-250`・`PND-423`） | 28 |
| `schedule-layout.ts` | 12 | 0 | 7 |
| `schedule-geometry.ts` | 6 | 0 | 8 |
| `item-hit-area.ts` | 2 | 0 | 10 |
| `mspdi-codec.ts` | 5 | 0 | 0 |
| `json-codec.ts` | 6 | 0 | 13 |
| `schedule.ts` | 1 | 0 | 0 |

`defects.md` の 実測済 の行（刈り取りを待つ 12 行）には、ほかに `frame-loop.ts` の参照が 4 回ある。

#### 1.1 の大きさ

| ファイル | `a912f4ea`（全 ／ 手書き ／ 生成） | `c48f9736`（全 ／ 手書き ／ 生成） |
| --- | --- | --- |
| `frame-loop.ts` | 4,760 ／ 4,683 ／ 77 | 4,879 ／ 4,802 ／ 77 |
| `mspdi-codec.ts` | 2,023 ／ 2,023 ／ 0 | 同じ |
| `schedule.ts` | 1,847 ／ 1,174 ／ 673 | 1,853 ／ 1,174 ／ 679 |
| `json-codec.ts` | 1,515 ／ 339 ／ 1,176 | 1,548 ／ 383 ／ 1,165（順位 5） |
| `schedule-layout.ts` | 1,482 ／ 1,363 ／ 119 | 1,632 ／ 1,504 ／ 128（順位 4） |
| `input-command-translator.ts` | 1,366 ／ 1,323 ／ 43 | 1,385 ／ 1,342 ／ 43 |
| `screen-values.ts` | 1,354 ／ 517 ／ 837 | 1,382 ／ 535 ／ 847 |
| `schedule-geometry.ts` | 1,295 ／ 1,271 ／ 24 | 1,305 ／ 1,281 ／ 24 |
| `item-hit-area.ts` | 1,150 ／ 1,049 ／ 101 | 1,191 ／ 1,090 ／ 101 |
| `dom-screen-surface.ts` | 1,123 ／ 970 ／ 153 | 1,155 ／ 990 ／ 165 |
| `file-flow-values.ts` | 944 ／ 394 ／ 550 | 同じ |
| `import-document.ts` | 919 ／ 919 ／ 0 | 同じ |
| `properties-panel.ts` | 863 ／ 852 ／ 11 | 900 ／ 889 ／ 11 |
| `agent-api-members.ts` | 724 ／ 724 ／ 0 | 762 ／ 762 ／ 0（順位 15） |
| `svg-renderer.ts` | 709 ／ 531 ／ 178 | 864 ／ 658 ／ 206（順位 14） |
| `document-settings.ts` | 536 ／ 113 ／ 423 | 533 ／ 113 ／ 420 |
| `field-editing.ts` | 508 ／ 508 ／ 0 | 545 ／ 545 ／ 0 |
| `src/framework/dom-screen-surface/properties-panel-drawing.ts`（`UF-106`） | 482（本書の表に無い） | 758（順位 16、`a912f4ea` の後のコミット 8 件）。<br>⚠️ 本書は調べていない（15.3 の 11） |

`src/` の `.ts` は 114 のままで、表 T-074 の `SU-3`（`05-07-design.md:247`）・`units.contract.test.ts:50-51` とも 114 である。

#### 横断の数

| 項目 | `a912f4ea` | `c48f9736` |
| --- | --- | --- |
| 1.2 の起点の共有 | 34（`OW-4` を除いて 29）→ 割ったあと 15（10） | 同じ。<br>7 つの行の要求は `a912f4ea` から 1 つも変わっていない（`05-07-design.md` の差分で動いた UF の行は `UF-105` だけ） |
| `UF` の最大 | `UF-125` | `change-request/` の外では `UF-125`。<br>`UF-126` 〜 `UF-168` は本書のほかに 7 本（`CR-555`・`CR-556`・`CR-558` 〜 `CR-561`・`CR-565`）が本書の割ったあとのユニットとして引く（別の意味で引くものは 0、`UF-162` を引くものは 0） |
| 表 T-063 | 12 行、最大 `UT-12` | 同じ（`05-07-design.md:330-341`、`audit-ch5.py:83`） |
| `field-editing.ts`（4.2・9 節の `DFC-966`） | `let` 14、日付の消去の受け手 `:184-197`、検査 55 の余裕 0（コード 384 ／ コメント 42） | `let` 15（`commitsHandedOut` が増えた）、受け手 `:218-231`（`WHY` は `:218-219`）、余裕 0（コード 409 ／ コメント 45）。<br>後の 3 件（`c5abb35c`・`121782d5`・`e01237a5`）はどれも 3 つの欄が共有する約束に触れた ⇒ 「割らない」を強める |
| 8.1 の `CR-559` | `frame-loop`・`item-hit-area`・`json-codec`・`schedule-geometry` | 同じ ＋ `schedule.ts`（`CommentBox` の型、8.1 の `grep` はパスの無い名を拾わなかった） |
| 8.1 の `CR-565` | （表に無い） | `frame-loop.ts`（6 回）・`json-codec.ts`（12 回）、ほかに `import-document.ts` |
| 10 節の答えの裁定の行 | 調整役が書く | `JDG-440`（`rulings.md:660`）が書いた |
| 基準線を動かす許し（7 節の検査 60 の行） | 動かすたびに利用者の許し | `JDG-520`（`rulings.md:661`、15.3 の 9） |

### 15.3 前に立つ者の判断

1. ⭐ `confirmation-questions.ts`（`UF-162`）は 4.1 のとおり割る。縁の組として前に立つ者が判じた（6.1 の 3）。
   測った数: `confirmation-questions` 〜 `document-file-flow` は 0.60（5 件中 3）である。
   `a912f4ea` では 4 件中 3 で、小さい側が下限に届かず証拠なしだった。
   `e122fd55`（`CR-551` の項目 13）が `confirmationOwedBy` に引数 `asked` を足し、小さい側をちょうど下限の 5 件にした。
   共に変えた 3 件は `1226da34`・`35bcaafe`・`4b9687e8`（波 B）である。
   形の上では 2.1 の S2 の規則（0.5 を超え、小さい側 5 件以上）に当たる。
   それでも割る理由:
   - 利用者の指示（2026-09-24、本書を当てるセッションで、逐語）「SRP / 命名規則 / 名は体を表す に気を付けて、そのまま進めろ」。
     戻すと `document-file-flow.ts` が、行の削除（`CD-1`・`CD-2`）と担当の外し（`CD-5`）の問いを持つ。
     この 2 つは入口の `carryOutAction`（`confirmationOwedBy`）と `answerSettledEntry`（`confirmationOwedByResourceDeletion`）が呼ぶ編集の問いであり、ファイルの流れではない ⇒ 名が体を表さなくなる。
     ファイルの流れが使うのは `tasksLostWith` だけである（取り込みで落とすタスクを数える、`c48f9736` の `frame-loop.ts:3791`）。
   - 変更の理由が別である（`UD-1`）—— 書き込みが消すものを数える規則（表 T-234 の `QN-3`・`CD-1`・`CD-2`・`CD-5`）と、開く・保存する・書き出す流れ（表 T-290）。
   - 証拠は下限ちょうどで、3 件のうち `4b9687e8` は全領域に触った状態機械の結線である。除くと 4 件中 2 で証拠なしになる（2.3 の感度。判定の決め手にはしないが、縁の判じの材料にした）。
   ⇒ 番号・範囲・兄弟どうしの取り込み（`document-file-flow` → `confirmation-questions`）は 4.1 のままである。`CR-551` の項目 13 の置き場は `UF-162` である。
   ⚠️ 割ったあとで 2 つが共に変わり続けたら（次の 2 件のうち 1 件でも両方に触れたら）、1 つに戻す別の変更要求を起こす。
   数: 表 T-075 に足す行は 43、`SU-3`・`units.contract.test.ts:50-51` は 114 → 157、`05-07-design.md:253` の並びと `changelog.md:47` の文（15.3 の 8）の `SingleHtmlShell` は 15（3 ＋ 兄弟 12）である。
   ⚠️ 本項は最初、規則どおり 2 つを 1 つに戻すと書いた（`bc34b969`）。利用者の上の指示を受けて覆した。
2. `pointer-shape` 〜 `held-press-preview`（0.50、16 件中 8）と `task-figures` 〜 `comment-box`（0.50、6 件中 3）は、測り直してもまだ 0.5 を超えない。
   `e122fd55` は `pointer-shape` だけに、`d4d87a08` は `task-figures` だけに触った。
   ⇒ どちらも割ったままにする（4.1・4.4 の MUST の条件に当たらない）。
3. `a912f4ea` の後に生まれた宣言と、その置き場（どれも継ぎ目の判定は変えない）:
   - `frame-loop.ts`
     - 入口: `selectionWithinDrawnRows`（H2、`runFrame` だけが呼ぶ）、閉包の `pruneChoiceTo`（H2、残る選択を決めるのが変更の理由で、`noteChoiceMoved` は `field-focus` から取り込む）、`FrameLoop` のメンバ `pressContinued`（H3）、`GUIDE_CURSOR_CLEARED`（`CR-551` の波 2、`effectRunnersOf` だけが読む）、`HorizontalWhole` ・ `VerticalWhole` ・ `HeldWholes` ・ `horizontalWholeOf` ・ `verticalWholeOf` ・ `visibleHeightOf` ・ `measuredAtPress` ・ `heldWholeOf`（`0d9e7424`、`GR-21` のスクロールの幅を読む入口の関数だけが使う、`scrolledPastOf` は消えた）、閉包の `runAskedFrame`（`83fe24da`、フレームの 1 周期）、頂上へ上がった `isSameEnvironment`・`settled`（兄弟のために `export` する）。
     - `copy-and-paste.ts`（`UF-168`）: `SelectionCopied`・`pasteRefusedFor`・`copiedForPasteOf`（H4 の `bd83a718`、E-24 の `a42c0cb4`）。
     - `document-file-flow.ts`（`UF-165`）: `OPEN_ROUTE_FROM_DROP` と `fileDropped` の本体（H3 の `0d446d12`）。
       `fileDropped` は `FrameLoop` の型のメンバなので、返すオブジェクトの項は入口に残り、兄弟の (F) の関数を呼ぶ。
     - `field-focus.ts`（`UF-164`）: `HIGHLIGHT_BOX_STROKE_FIELD_ROW`・`InPlaceKind`・`FIELD_ROW_OF_IN_PLACE_TARGET`（`DFC-806` の `032c2023`）。
       表の初期化は同じユニットの `*_FIELD_ROW` だけを読むので、評価の順の問題は無い。
       入口の `carryOutAction` がこれを取り込む。
     - ⚠️ 8 節は H3 の押し続けが `frame-clock-wakes.ts` に落ちると書いたが、H3 は `tickEntryRepeat` を変えず、入口に `pressContinued` を足した。
       `frame-clock-wakes` のコードは `a912f4ea` から変わっていない。
   - `item-hit-area.ts`: H2 の `isTaskDrawn`・`DrawnChoice`・`ChosenItem`・`selectionWithinDrawn` → 入口。
     `marquee.ts` と共に変えた証拠は無く、入口に置けば出し直しも増えない。
   - `schedule-layout.ts`
     - `name-label.ts`（`UF-136`）: `nameLabelWidthOf`・`YEAR_DIGITS`・`NameLabel`（`d4d87a08`）。
       `nameLabelWidthOf` は `NameLabel` を割って `S-325` を当てるので、名札の側に置く。
       `label-width.ts` に置くと、`label-width` → `name-label` の型の辺が要る。
     - 入口: `packedLanesOf`・`lastRowReserveOf`（`bfc27af9`）。
       どちらも `LC-9` の帯高で、呼び手は `layoutFromSchedule` だけである（S3）。
     - `fit-zoom.ts`（`UF-143`）: `e122fd55` の 11 の名 —— `FIT_MARGIN_SIDES` ・ `FIT_SOLVE_STEPS` ・ `FIT_WIDTH_TOLERANCE_PX` ・ `FitRun` ・ `fitsRowArea` ・ `deepestFittingDepth` ・ `nextFitZoomX` ・ `isWidthSettled` ・ `widthFittedRun` ・ `landedFit` ・ `fittedLeftEdge`。
       `NOT_STORED_FIT_MARGIN`（`S-332`）は `fit-zoom.ts` の `fitZoom` が読む。
       定数そのものは生成の区画にあるので入口の区画に残り（3 節）、新しいパスの読み手のために `tools/generate_entity_types.py` の `PUBLISHED_READ_BY_SRC` の `schedule-layout.ts` の鍵へ足す。
     - `assignee-label.ts`（`UF-134`）: H10 の `LabelledAssignee`・`labelledAssigneeOf`・`compareLabelled`・`labelledAssigneeUidOf`（`121782d5`）。
   - `schedule-geometry.ts`: `chevronBarOf`（`d4d87a08`、呼び手は `barOf` だけ）→ `task-figures.ts`（`UF-144`）。
   - `json-codec.ts`
     - `json-schema-validator.ts`（`UF-152`）: `collectionNamesOfEntity`。
       生成の `GRS_DOCUMENT_SCHEMA` を読むので validator に置き、そこから `export` する。
       入口に残すには `GRS_DOCUMENT_SCHEMA` に `export` が要るが、検査 30 が `PUBLISHED_READ_BY_*` への登録を求め、生成器の `refuse_unknown_published_files`（`:2631-2638`）が自分の書かないファイルを拒むので、通らない。
       ⇒ 4.7 の「1 か所だけ形が変わる」は 2 か所になる —— `documentFromJson`（`:1509`）と、入口から `collectionNamesOfEntity` を呼ぶ所である。
       3 節の例外の理由「区画を読むのは `collectFaults` ほか 121 行だけ」は、この置き方で再び真になる（手 130 行）。
     - 入口: `RETIRED_COLUMNS`・`withoutRetiredColumns`（`7c195c50`、表 T-297）。
       古い版の文書を読む理由（`FR-073`）で、ほかの古い版を埋める関数と同じである。
   - `schedule.ts`・`mspdi-codec.ts`: 新しい宣言は 0。
4. `keptByLevelOfDetail` は `CR-552`（`989c7572`）が関数ごと消した。
   ⇒ `UF-139`（`level-of-detail.ts`）の範囲は `keptInViewByOpenMarks`・`groupDepthLimit`・`groupDepthThresholdOf` の 38 行になり、責務文は行の深さだけを言う。
   新しい文は 15.4 にある。
   8 節の `CR-552` の 2 つの行（`keptByLevelOfDetail` と、その呼び手）は置く物が無い。
5. ⭐ 公開の面の不変条件（4.1・4.3・4.5 の数えた名簿に替える）: 各入口がいま `export` しているすべての名は、割ったあとも同じ意味で入口から `export` される。
   入口の `export` の集合は割る前の集合を含み、増えることはあっても減らない。
   測った帰結は次のとおり。
   - `frame-loop.ts`: 外から読まれて兄弟へ移る名は 7 である —— 4.1 の 5 つ（`PointerShape`・`pointerImageOf`・`pointerRowOf`・`FOCUS_ON_DOCUMENT_BODY`・`startupDisplayLanguage`）に、`OPEN_ROUTE_FROM_DROP`（`tests/unit/h3-a-file-drop-wakes-a-frame.test.ts:18`）と `copiedForPasteOf`（`tests/unit/h4-several-copied-tasks-paste-back.test.ts:8`）が加わる。
   - `item-hit-area.ts`: 4 である —— 4.5 の 3 つに型 `DependencyEnd` が加わる。
     `tests/unit/cr-388-dependency-start-of-hit.test.ts:27` が名前空間の取り込みを通して読み、無いと `tsc` が落ちる（`a912f4ea` でも読んでいて、4.5 が見落とした）。
   - `schedule-layout.ts`: `PI-5` の 18 の名 ＋ `rulerTierOf` ＋ `TimeAxis`。
     不変条件により、いま `export` していて誰も読まない名（`FitToScreen`・`NotStoredZoom`・`standsUndecidedResume`・`thinEndHalfHeightOf`）も出し直す。
   ⇒ 照合器の「exports」の鍵は、増えることだけが許される。
   これは設計した違いであり、`CR-439` の 5.5 と同じく、どの波を走らせる前にもここに書いておく（15.3 の 14）。
6. 工場が持つ 7 つの `let` を、入口が直に読むか書く —— `fileSavedAt`（`runFrame`・`exportScene`）、`settleOverwrite`（`effectRunnersOf` の `answerOverwriteQuestion` の矢印関数）、`fieldFocusRetriesLeft`（`standOnWhatWasCreated`）、`pointerRestingSince`（`runFrame`）、`paletteMinimisedWhileHidden`（`sendScreenEvent`）、`fitHeldForNoPlace`・`fromStartupTemplate`（`replaceHeldDocument`）。
   `a912f4ea` でも同じだったが、4.1 の表は書いていない。
   ⇒ その (M) の工場は、4.1 の表のメソッドに加えて、小さな読み手・書き手の関数を出す。
   形は (M) のままである（4.1 の「形から外れるなら止まる」には当たらない）。
7. 検査 55 のコメント密度は、次のユニットで上限を超える見込みである。
   超過の行数は 7 節と同じ数え方で、`frame-loop.ts` のユニットだけは見出しを 4 行と数えたので 1 行多めに出ている。
   - `pointer-shape` 超過 32（`TRAP` は `:305`・`:317`・`:381`・`:399`）
   - `held-press-preview` 超過 8（`:3167`・`:3183`）
   - `view-place` 超過 7（`:1701`・`:1742`・`:1764`・`:2362`・`:2658`）
   - `interaction-record` 超過 1（`:825`・`:831`・`:2545`、`a912f4ea` でも 1 で、7 節が見落とした）
   - `fit-zoom` 超過 6（新しい、`:1288`・`:1314`・`:1440`）
   - `dependency-route` 超過 4（`:585`・`:601`・`:615`・`:694`・`:712`）
   - `label-placement` 超過 1（`:806`）
   - `mspdi-child-placement` 超過 1
   `working-calendar` と `schedule-geometry.ts` の入口は上限ちょうどである（見出しの行を増やすと超える）。
   ⇒ そのユニットを作る波が、`comment-rules-src.md` の 5 節の手当てを当て、6.3 の MUST 7 のとおり消した文を報告する。
8. 検査 33（`audit-ch5.py:257-260`）は、`docs/development-records/changelog.md:47` の「2 つより多いユニットを持つのは …」の文を 表 T-075 と字で比べる。
   7 節はこれを挙げていなかった。
   ⇒ そのコンポーネントのユニットの数を変えるコミットが、同じコミットでこの文を書き直す。
   割ったあとは `Schedule` 7・`ScheduleLayout` 13・`ScheduleGeometry` 7・`ItemHitArea` 3・`DocumentCodec` 10・`SingleHtmlShell` 14 が加わるか変わる。
9. 検査 60 で鍵を書き直す行は、13 ではなく 12 である（`fitZoom` が帯の中に入り、行が消えた）。
   `frame-loop.ts` の `openDocumentIntoHold`・`tentativeDependencyOf`・`viewSettings`、`schedule-layout.ts` の `pinnedBandOf`、`schedule-geometry.ts` の `routeOf`・`taskGeometryOf`・`progressLineOf`、`mspdi-codec.ts` の `readXml`・`readStartTag`、`json-codec.ts` の `collectFaults`、`schedule.ts` の `nestingOf`・`find~16` の 12 である。
   いまの値は 15.2 のとおりで（`frameLoop` 2486/4、`carryOutAction` 182/47、`layoutFromSchedule` 268/23、`layoutFromSchedule#8` 69/16）、ほかは 7 節と同じ値である。
   ⛔ 7 節の「動かす前に利用者の許しを得る」は `JDG-520`（2026-09-24）に替わった —— 下げる・鍵の付け替え・古い行の除去は、調整役が問わずに当てる。
   新しい `HELD` の行（`view-place` と `frame-clock-wakes` の工場が帯の縁）や、許しを上げるものは、調整役を通して利用者に問う。
10. 行番号の参照（7 節の最後の行）: 割るコミットが `<file>:NNN` を書き直すのは、`defects.md` の開いた行と `pending-decisions.md` の開いた行だけである。
    数は 15.2 の表のとおりで、`frame-loop.ts` なら 86 と 2 である。
    着地していない変更要求（`CR-555` 〜 `CR-563`・`CR-565`、合わせて `frame-loop.ts` 28・`schedule-layout.ts` 7・`schedule-geometry.ts` 8・`item-hit-area.ts` 10・`json-codec.ts` 13）は、分割では書き直さない。
    8.1 が、それぞれに当てる時に自分の `file:line` を割ったあとの木で測り直させている。
    `CR-565` も 8.1 の表の下の注のとおり分割の後に並ぶので、同じく当てる時に測り直す。
    `CR-566` は状態が「当てた（2026-09-24）」なので、着地した変更要求として書き換えない（7 節の方針）。
11. 4.9 の割らないファイルを、合図に従って調べ直した。
    - `svg-renderer.ts`: 色の塊は名で引き直すと `:123-384`（262 行）で、変えたコミットが 6 件（`bfefe010`・`0cfd71fa`・`9beab1f3`・`911e3d31`・`02aa21e2`・`b8e041fe`）になり、合図に届いた。
      調べ直すと、要求の持ち主はやはり継ぎ目を出さない（色の規則は `FR-007`・`FR-041` に属し、その起点は別の行である）。
      残りとの組 0.67（6 件中 4）は入口との組なので判じない（2.1）。
      ⇒ 割らない。
    - `dom-screen-surface.ts`: `CR-551` の項目 11 は `STYLE` を変えなかった（`dividerBand` は既に `col-resize` で、`:294` → `:296` に動いただけ）。
      `STYLE` だけに触れたコミットはまだ 0 で、`STYLE` 〜 残りは 0.88（40 件中 35）である。
      ⇒ 変わらない。
    - `import-document.ts`: `a912f4ea` の後のコミットは 0 である。
      `CR-565` は `FR-022`（合図の要求）を名指すが、`builtMerge` には触れない。
      ⇒ `CR-565` を当てる時にもう一度調べる。
    - `field-editing.ts`: `let` 15、`fieldEditingOf` 462/1。
      ⇒ 変わらない（4.2）。
    - ⚠️ 未決: `properties-panel-drawing.ts`（`UF-106`）は 482 → 758 行になったが、本書は調べていない。
      段 7.5 の後に回し、ここでは決めない。
12. 台帳の候補の番号を、このセッションの帯へ付け替えた（調整役の指示、2026-09-24）: `DFC-830` → `DFC-965`、`DFC-831` → `DFC-966`、`DFC-832` → `DFC-967`。
    本書・`CR-556`・`defects.md` の `DFC-861` の行の中の言及を書き換え、どの候補も番号を 1 つだけ持つようにした。
    台帳の行は足していない（9 節のとおり、本書は台帳を書かない）。
    `DFC-965` の半分（`FR-045` にコードが無い）は、`CR-556` の起草者が既に `DFC-861` として台帳に起こしている。
    残る半分（`UF-6` の `FR-020`）は、まだ台帳に無い。
    `DFC-965` 〜 `DFC-967` は、`c48f9736` の木のどこにも現れていなかった（2026-09-24 に `git grep` で測った）。
13. 8 節の行のうち、次は既に無いので置く物が無い。
    - `DEVIATION … (DFC-694)` の 3 か所（`049a7ad1` が消し、`DFC-694` は閉じた）
    - `frame-loop.ts` の注「omit the LF-3 floor」（`bfc27af9` が消した）
    - H8 の `@provisional`（`7f4861ac` で `a912f4ea` より前に着地しており、「`CR-549` が足す 5 つは未着地」は古い）
    - H9（`2a68b95b` で `a912f4ea` より前に着地した）
14. 照合器の設計した違いは、15.3 の 5 の入口の `export` の集合が増えることだけである。
    それ以外の違いは、すべて失敗とする。

### 15.4 更新した割り方の表

各ファイルで、範囲の名か行数が変わったユニットだけを書く。  
行数は本書の数え方（4 節）に揃えた。  
どのファイルも、合計はファイルの行数に等しい。

#### `frame-loop.ts`（計 4,879）

| ユニット | 足した名 ／ 消えた名 | 行（`c48f9736`） |
| --- | --- | --- |
| `UF-48` `frame-loop.ts` | ＋ 15.3 の 3 の入口の名（`fileDropped` のメンバを含む） ／ − `scrolledPastOf`。<br>閉包の `settled`・`isSameEnvironment` は頂上へ上がった | 2,769 ＋ 生成 77 |
| `UF-157` `pointer-shape.ts` | 名は同じ（`CR-551` の項目 11 の `'GR-16'`・`PK-10` の項が入った） | 352 |
| `UF-162` `confirmation-questions.ts` | 名は同じ（`CR-551` の項目 13 の `asked` が入った）。割る（15.3 の 1） | 114 |
| `UF-163` `frame-clock-wakes.ts` | 名は同じ | 66 |
| `UF-164` `field-focus.ts` | ＋ `HIGHLIGHT_BOX_STROKE_FIELD_ROW`・`InPlaceKind`・`FIELD_ROW_OF_IN_PLACE_TARGET` | 137 |
| `UF-165` `document-file-flow.ts` | ＋ `OPEN_ROUTE_FROM_DROP`、`fileDropped` の本体 | 644 |
| `UF-166` `watermark-unlock.ts` | 名は同じ（`PND-181` の STOP の 3 行が `// see` の 1 行になった） | 56 |
| `UF-168` `copy-and-paste.ts` | ＋ `SelectionCopied`・`copiedForPasteOf`・`pasteRefusedFor` | 94 |

変わらないもの: `UF-158` 157、`UF-159` 51、`UF-160` 151、`UF-161` 139、`UF-167` 72。  
⚠️ 行の数は `fileDropped` を入口に数えている。  
本体を (F) で兄弟へ出すと、数行が入口から `UF-165` へ移る。

| 行 ID | ユニット | 責務文（S5、畳んだ句と根拠） |
| --- | --- | --- |
| `UF-165` | `document-file-flow.ts` | 「文書のファイルの流れ（表 T-290）—— 開く・保存する・書き出す・渡された文書を取り込む —— をファイルの門を通して運ぶ」。<br>4 つの列挙は 1 つの機械の範囲なので (b)。<br>「開く前に検証し、使えない日付のタスクを落とす（`FR-023`）」「問いの答えを待つ（`QN-4`・`QN-5`・`OP-3`・表 T-032a）」は (a)。<br>「ドロップで渡されたファイルを開く（H3 の `OPEN_ROUTE_FROM_DROP`）」は (b)。<br>「失敗を表 T-233 の理由で告げる」は (c)。<br>書き込みが消すものを数える問い（表 T-234 の `QN-3`・`CD-1`・`CD-2`・`CD-5`）は `UF-162` が持つ（15.3 の 1） |

#### `schedule-layout.ts`（計 1,632）

| ユニット | 足した名 ／ 消えた名 | 行（`c48f9736`） |
| --- | --- | --- |
| `UF-5` `schedule-layout.ts` | ＋ `packedLanesOf`・`lastRowReserveOf` | 582 ＋ 生成 128 |
| `UF-134` `assignee-label.ts` | ＋ `LabelledAssignee`・`labelledAssigneeOf`・`compareLabelled`・`labelledAssigneeUidOf` | 70 |
| `UF-136` `name-label.ts` | ＋ `YEAR_DIGITS`・`NameLabel`・`nameLabelWidthOf` | 86 |
| `UF-139` `level-of-detail.ts` | − `keptByLevelOfDetail` | 38 |
| `UF-143` `fit-zoom.ts` | ＋ 15.3 の 3 の 11 の名 | 194 |

変わらないもの: `UF-132` 68、`UF-133` 14、`UF-135` 20、`UF-137` 109、`UF-138` 55、`UF-140` 123、`UF-141` 99、`UF-142` 46。

| 行 ID | ユニット | 責務文（S5） |
| --- | --- | --- |
| `UF-139` | `level-of-detail.ts` | 「表示の倍率に応じて描く行の深さを減らす（`FR-018`・`LC-2`・表 T-005a）」。<br>「開いたままの印の行は残す（表 T-254）」「深さごとに要る倍率を 1 つの式で答える」は (c) |

#### `schedule-geometry.ts`（計 1,305）

| ユニット | 足した名 ／ 消えた名 | 行（`c48f9736`） |
| --- | --- | --- |
| `UF-144` `task-figures.ts` | ＋ `chevronBarOf` | 598 |

変わらないもの: `UF-6` 252 ＋ 生成 24、`UF-145` 220、`UF-146` 39、`UF-147` 67、`UF-148` 85、`UF-149` 20。

#### `item-hit-area.ts`（計 1,191）

| ユニット | 足した名 ／ 消えた名 | 行（`c48f9736`） |
| --- | --- | --- |
| `UF-7` `item-hit-area.ts` | ＋ `isTaskDrawn`・`DrawnChoice`・`ChosenItem`・`selectionWithinDrawn` | 998 ＋ 生成 101 |

変わらないもの: `UF-150` 53、`UF-151` 39。

#### `schedule.ts`（計 1,853）

| ユニット | 足した名 ／ 消えた名 | 行（`c48f9736`） |
| --- | --- | --- |
| `UF-126` `schedule-generated.ts` | 区画が 6 行増えた | 679 |

変わらないもの（範囲が +6 ずれただけ）: `UF-1` 17、`UF-127` 17、`UF-128` 301、`UF-129` 34、`UF-130` 54、`UF-131` 751。  
`UF-128` は `serial` に、`UF-130` は `TRANSPARENT` に `export` を付ける（15.2）。

#### `json-codec.ts`（計 1,548）

| ユニット | 足した名 ／ 消えた名 | 行（`c48f9736`） |
| --- | --- | --- |
| `UF-35` `json-codec.ts` | ＋ `RETIRED_COLUMNS`・`withoutRetiredColumns` | 253 |
| `UF-152` `json-schema-validator.ts` | ＋ `collectionNamesOfEntity`（`export`） | 1,295（生成 1,165 ＋ 手 130） |

#### `mspdi-codec.ts`（計 2,023）

変わらない（`UF-36` 1,262、`UF-153` 268、`UF-154` 178、`UF-155` 243、`UF-156` 72）。

### 15.5 波

| ファイル | ファイルの中の波 |
| --- | --- |
| `schedule.ts` | S1 〜 S6（4.6 のまま） |
| `schedule-layout.ts` | L1 ＝ `name-label`・`label-placement`・`fit-zoom` を除く 9 → L2 ＝ `name-label`・`label-placement`・`fit-zoom`（`name-label` → `label-width` の辺が増えたため） |
| `schedule-geometry.ts` | G1 〜 G3（4.4 のまま） |
| `item-hit-area.ts` | 1 つ（4.5 のまま） |
| `json-codec.ts` | 1 つ（生成器の出力先の変更と `collectionNamesOfEntity` の移しを同じ波で） |
| `mspdi-codec.ts` | M1 〜 M4（4.8 のまま） |
| `frame-loop.ts` | F1 〜 F4（4.1 のまま。`UF-162` は F1） |

ファイルの順（6.2）と、1 つのファイルを割る体は同時に 1 体だけという約束は変わらない。

### 15.6 確定した割り方（2026-09-25、利用者の了承）

⭐ 本節が確定した割り方である。  
4 節・15.4・15.5 と食い違うところは、本節が勝つ。  
4 節と 15.1〜15.5 は、調べた時と測り直した時の記録として残す。  
測った木は `28a44ac9` である（`git diff c48f9736 28a44ac9 -- src tools` は空なので、行番号は `c48f9736` と同じ）。

#### 15.6.1 なぜ本節があるか

⭐ 利用者の言葉（逐語、`JDG-548`）:

- 「了解、SRP / 命名規則 / 名は体を表す に気を付けて、そのまま進めろ」（2026-09-24、15.3 の 1 が引いた指示）
- 「おっとぉ？  Loopの方は大丈夫か？  ゴキブリ理論って知ってるよね？」
- 「今回の分割はリファクタの目玉だぞ？  SW工学に準拠して、丁寧にやれ。 もう手戻りしたくない。」

⇒ 割る前に、計画の 50 ユニット（入口 7 ＋ 兄弟 43）のすべてを `docs/development-rules/07-review-standards.md` の R2 に当て、名を先に問うた。  
1 つ見つかれば、ほかにもあると読んだ。  
縁の共変の数より、名が体を表すことを先に置く（15.3 の 1 と同じ判じ方）。

1. 見直し（1 体目）: R2 の命名（MUST、最重要）・層ごとの品詞の規約・R2.2a の 5 段・R2.2b・POLA・CQS・ADP を 50 ユニットに当てた。  
   あわせて `docs/development-rules/03-implementation.md` の 1（仕様の名を使う）と 2（「何であるか」を言い、「どう作ったか」を言わない）、表 T-276 の `UD-1`〜`UD-5`、表 T-061 の `LR-3`、表 T-060 の `LY-5`、表 T-071 の `CA-1`、表 T-063 の `UT-10`・`UT-12` を当てた。
2. 反証（2 体目）: 1 体目の指摘 44 を 1 つずつ反証にかけた。  
   結果は、成り立つ 22・反証された 11・狭めた 9・利用者へ 2（U-1・U-2）である。  
   共変は 2.2 の数え方をそのまま使い、15.2 の数（`task-figures` 〜 `comment-box` 0.50 ほか）を再現して較正した。

スクリプトと 2 つの報告はセッションの一時フォルダに置いたので、木には無い（13 節と同じ扱い）。

#### 15.6.2 利用者が決めた 2 つ（`JDG-550`）

| 問い | 選んだ案 | 帰結 |
| --- | --- | --- |
| U-1 ハイライトボックスを `task-figures.ts` に置くか、自分のユニットにするか | 案 B（「3 つに分ける」—— マイルストーンを含む `task-figures.ts`、`highlight-box.ts`、`comment-box.ts`） | 新しいユニット `UF-171` `highlight-box.ts` を立てる。<br>S2 の形の上の拒み（ハイライト 〜 残りのタスクの図 0.60、5 件中 3）を、15.3 の 1 と同じく覆す —— 共に変えた 3 件はどれも一斉の手直し（`7f9b4692` 36 ファイル・`e1bb8c8f` 11 ファイル・`b41e412d` 54 ファイル）で、着地を待つ `CR-558` はハイライトだけを書き換える。<br>⚠️ 15.3 の 1 の見張りを掛ける: 割ったあと、2 つのどちらかに触れる次の 2 件のコミットのうち 1 件でも `task-figures.ts` と `highlight-box.ts` の両方に触れたら、1 つに戻す変更要求を起こす。<br>コメントボックスと合わせる `annotations.ts` は採らない —— ハイライト 〜 コメントボックスは 0.20（5 件中 1、その 1 件は一斉の `7f9b4692`）で、較正の「本物の継ぎ目」の帯（0.14〜0.29）にある |
| U-2 `deletion-confirmations.ts`（`UF-162`）は `Framework` の中で関数がすべて `pure` である | 案 A | 見出しと表 T-075 に `pure` と書く（真の札、R7.6）。<br>表 T-060 の `LY-5` の欄（`Framework` には `semi-pure-b` と `non-pure`）との食い違いは置き場の合図であり、`DFC-968` に起こした。<br>削除の問いの規則を内側の `EditDocument` へ移す `CR-568` で閉じる（`JDG-549`、15.6.12 の D3） |

#### 15.6.3 確定した表

- 表 T-075 の並びで書く。
- 新しい行 ID は 3 つで、調整役が確かめた: `UF-169`（`drawn-selection.ts`、`ItemHitArea` の群で `UF-151` の後）・`UF-170`（`calendar-day.ts`、`Schedule` の群で `UF-128` の前）・`UF-171`（`highlight-box.ts`、`ScheduleGeometry` の群で `UF-144` の後）。
- 責務文は表 T-075 の書き方（`UF-103`・`UF-90` の形）に揃える。  
  (a)(b)(c) は R2.2a の段 3 の畳み方である。  
  「4.x のまま」は、その節の文を字を変えずに使うことを言う。
- `@purity` は、15.6.8 の P2 の後の、そのユニットの関数の札のうち最も強いものである（15.6.9 の MUST 11）。
- 「輪」は入口と兄弟の間の取り込みの輪で、15.6.6 のとおり許される。  
  兄弟は、モジュールの頂上で入口の名を 1 度も読まない。

##### `frame-loop.ts`（`UF-48` ＋ 兄弟 12）

| UF | ファイル | 責務文（R2.2a の畳み） | 持つ宣言（名で） | @purity | 取り込みと輪 |
| --- | --- | --- | --- | --- | --- |
| `UF-48` | `frame-loop.ts`（入口） | 表 T-075 の今の欄の 3 つの文を逐語で残す（試験が字で読む —— 15.6.5）。<br>要約は「表 T-078 の契機を受けてセッションの現在値を 1 段進め（`sendToSession`、`SF-6`・`SF-7`）、フレームを計算して描き手へ配る」。<br>入力の振り分け（`FT-1`、表 T-036・T-109）・書き込みの門（`WS-2`・`WS-6`・`WS-7`）・全画面の求め（`FR-071`）・パネルの追従（`FR-072`）は (a)。<br>書き出しの絵（`FR-080`）は (b)。<br>通知の理由の台帳（表 T-233）・兄弟が共有する語彙・`SnapshotSource` と `FrameLoop` の実装・未保存の門（`FR-100`）・フレームを省く（`NFR-010`）は (c)。<br>⚠️ R2.2a と R2.2b は FAIL で、受け入れた借りである（15.6.5） | 4.1 の範囲 ＋ 15.3 の 3 の入口の名（`selectionWithinDrawnRows`・`pruneChoiceTo`・`pressContinued`・`GUIDE_CURSOR_CLEARED`・`HorizontalWhole` 〜 `heldWholeOf`・`scrollExtentOf`・`runAskedFrame`・`isSameEnvironment`・`isSizeSettled`（旧 `settled`、15.6.8 の P1））。<br>＋ `ConfirmationQuestion`・`SEAM_ABSENT_REASON`・`HEIGHT_CEILING_REASON`・`NOTICE_REASON_OF_RASTER_FAULT`（と `RasterFaultReason` の取り込み）。<br>生成の区画から 15.6.7 の 5 群を除く | `non-pure` | 兄弟 12 の名を出し直す。<br>→ `document-file-flow`（`OPEN_ROUTE_*`、実行時） |
| `UF-157` | `pointer-shape.ts` | 「指している掴み代に応じて、表 T-269 のポインタの形を描いて返す（`IN-2`・`FR-106`）」。<br>形の選び方は表 T-266 の欄から読む・押している間は押した点の形を保つ・武装した依存線では出さない（`DFC-556`）は (c) | `PointerFallback` 〜 `pointerInkOf`、`pointerShapeOfPress` 〜 `pointerShapeUnder`、生成 `NOT_STORED_END_POINTER_SIZES` | `non-pure` | → 入口（型 `FrameValues`・`dualCursorFollowingIn`）: 輪 |
| `UF-158` | `held-press-preview.ts` | 4.1 のまま（表 T-023d・`PTD-3`・`PTD-5`・`FR-009`）。<br>掴みの列と範囲選択の矩形は (b)、1 度だけ当てるは (a)、拒まれた引きは (c) | `PREVIEWED_GRABS` 〜 `marqueeRect`、`isPreviewedPress`、`previewOfHeldPress` 〜 `tentativeDependencyOf` | `semi-pure-b` | → 入口（型だけ）: 型だけの輪。<br>→ `pointer-shape`（型） |
| `UF-159` | `browser-stored-values.ts` | 4.1 のまま（表 T-206 の `S-99`〜`S-99c`）。<br>起動時の読みは (b)、鍵の接頭辞と「読めなければ無い」は (c) | `WEB_STORAGE_KEY_PREFIX` 〜 `DISPLAY_LANGUAGES`、`isDisplayLanguage`、`readBrowserStored` 〜 `writeBrowserStored`、`startupDisplayLanguage` 〜 `startupAgentApiEnabled` | `non-pure` | 入口を取り込まない: 輪なし |
| `UF-160` | `interaction-record.ts` | 4.1 のまま（`FR-102`・`S-207`）。<br>`IR-1`〜`IR-3` は (b)、中身を記録しない・`DFC-707` は (c) | `UNREAD_IN_RECORD` 〜 `FOCUS_ON_DOCUMENT_BODY`、`paletteMinimisedForRecordOf`、`isRecordingInteractionsIn`、`paletteMinimisedWhileHidden` 〜 `interactionRecordOffered`、`recordLine` 〜 `handInteractionRecordToClipboard`、生成 `NOT_STORED_INTERACTION_RECORD_LIMITS` | `non-pure` | → 入口（セッションの読み手 4・`readMonotonicMs`・`dualCursorFollowingIn`）: 輪 |
| `UF-161` | `view-place.ts` | 4.1 のまま（`OP-10`・`FR-055`）。<br>起動見本・解き直し・忘れるは (c)。<br>保つ全体表示は表 T-071 の `CA-1` ① | `ViewSettings` 〜 `viewSettings`、`fromStartupTemplate` 〜 `fitHeldForNoPlace`、`viewSettingsOnce` | `non-pure`（P2 の後） | → 入口（`isSameEnvironment`・`readToday`）: 輪 |
| `UF-162` | `deletion-confirmations.ts`（旧 `confirmation-questions.ts`） | 「削除が消すもの・解くものを数え、表 T-234 の問い（`QN-1`・`QN-2`・`QN-3`・`QN-10`）を立てるかを決める（`FR-032`・`FR-099`）」。<br>行と共に消えるタスク（表 T-050 の `CD-1`・`CD-2`・`CD-6`）は (a)。<br>担当の外し（`CD-5`）は (b) | `UNASSIGNMENT_QUESTION`、`rowsLostWith` 〜 `tasksLostWith`、`confirmationOwedBy` 〜 `confirmationOwedByResourceDeletion`（型 `ConfirmationQuestion` は入口に残す） | `pure`（U-2 の案 A） | → 入口（`CONFIRMATION_MANNER` は実行時、`ConfirmationQuestion` は型）: 輪。<br>← `document-file-flow`（`tasksLostWith`） |
| `UF-163` | `frame-clock-wakes.ts` | 4.1 のまま（表 T-078 の `FT-4`）。<br>`EZ-2`・`SE-3`・`FR-018` は (b)、1 回ごとに次を仕掛けるは (c) | `RepeatTimes` 〜 `repeatTimesOfHeldEntry`、`pointerRestingSince` 〜 `callOffScaleMessage`、`beginPointerRest`、`startScaleMessageTimer`、`beginEntryRepeat` 〜 `endEntryRepeat`、生成 `NOT_STORED_REPEAT_TIMES`・`NOT_STORED_SCALE_MESSAGE_TIMES` | `non-pure` | → 入口（`ENTRY_REPEAT_TIME_ELAPSED`・`readMonotonicMs`・`isSizeSettled`）: 輪 |
| `UF-164` | `field-entry.ts`（旧 `field-focus.ts`） | 「名前付けと入力欄の領域（表 T-292）の出来事を、面と機械の間で運ぶ」。<br>焦点の求めと再試行（`MK-13`・`IN-5a`・`IN-5b`）・知らせの汲み出し（`IF-9`）・確定の書き込み（`SK-19`）は (b)。<br>状態を読む前に知らせを汲む・動いた選択も求めを取り下げる（`DFC-694`）は (c) | `TASK_NAME_FIELD_ROW` 〜 `FIELD_FOCUS_RETRY_FRAMES`（`HIGHLIGHT_BOX_STROKE_FIELD_ROW`・`InPlaceKind`・`FIELD_ROW_OF_IN_PLACE_TARGET` を含む）、`isNamingCreatedTaskIn` 〜 `isEditingFieldIn`、`fieldEditEventOf`、`focusWantedField` 〜 `isFieldFocusWanted`、`drainFieldEditNotices` 〜 `noteChoiceMoved`、`spendFieldCommit` | `non-pure` | → 入口（`CHOICE_MOVED`・`FIELD_FOCUS_WITHDRAWN`・`FIELD_FOCUS_WITHDRAWING_KEYS`・`isSizeSettled`・型）: 輪 |
| `UF-165` | `document-file-flow.ts` | 15.4 の文のまま。<br>ただし「失敗を表 T-233 の理由で告げる」(c) のうち、写しの面と共有する 3 つ（`RS-3`・`RS-43`・ラスタの失敗の写像）は入口の語彙を読む | 4.1・15.4 の範囲から `SEAM_ABSENT_REASON`・`HEIGHT_CEILING_REASON`・`NOTICE_REASON_OF_RASTER_FAULT` を除く。<br>`OVERWRITE_QUESTION`・`NOTICE_REASON_OF_EMBEDDED_HTML_FAULT`・`OPEN_ROUTE_FROM_DROP`・`fileDropped` の本体は持つ | `non-pure` | → 入口（19 ＋ 3 の名）: 輪。<br>→ `deletion-confirmations` |
| `UF-166` | `watermark-unlock.ts` | 4.1 のまま（`FR-020`・`U-60`・`S-99c`／`S-101`）。<br>`RS-41` は (c) | `HEX_DIGIT_BITS` 〜 `watermarkUnlockDigest`、`answerWatermarkUnlock` 〜 `matchWatermarkUnlock`、生成 `WATERMARK_UNLOCK_DIGEST`（入口が出し直す） | `non-pure` | → 入口（`WATERMARK_UNLOCK_ROW`・`openSurfaceNameIn`）: 輪。<br>→ `browser-stored-values` |
| `UF-167` | `row-band-ceiling-cache.ts`（旧 `row-band-ceiling.ts`） | 「行ズームの天井（`FR-016`、`rowBandCeilingOf`）を、帯を変えない入力のあいだ使い回す（表 T-071 の `CA-1` ②、`DFC-610`）」。<br>帯を変えない設定の列は (c) | `bandCeilingFrom` 〜 `bandCeilingFor` | `non-pure`（P2 の後） | 入口を取り込まない: 輪なし |
| `UF-168` | `copy-and-paste.ts` | 4.1 のまま（`FR-033`・`SK-4`・`SK-5`・`DU-2`）。<br>上限と `PND-449` は (c) | `SelectionCopied`・`copiedForPasteOf`・`pasteRefusedFor`、`copyForPaste` 〜 `pasteCommandFor` | `non-pure` | → 入口（`NOTHING_TO_DO_REASON`・`STACK_SAFETY_CAP_REASON`・読み手 2）: 輪 |

入口と兄弟の輪は、実行時 9・型だけ 1（`held-press-preview`）である。  
兄弟どうしの辺は 3 つで、輪は 0 である（`held-press-preview` → `pointer-shape`、`document-file-flow` → `deletion-confirmations`、`watermark-unlock` → `browser-stored-values`）。

##### `schedule-layout.ts`（`UF-5` ＋ 兄弟 12）

| UF | ファイル | 責務文（R2.2a の畳み） | 持つ宣言（名で） | @purity | 取り込みと輪 |
| --- | --- | --- | --- | --- | --- |
| `UF-5` | `schedule-layout.ts`（入口） | 4.3 の文。<br>帯高と縦位置（`LC-9`）の (a) に、段の間の隙間（`VG-2`、`verticalGapOf`）を含める。<br>見出しの 1 行目を書き直す（15.6.9 の MUST 10） | 4.3・15.4 の範囲 ＋ `packedLanesOf`・`lastRowReserveOf`・`verticalGapOf`。<br>生成の区画から `NOT_STORED_SIZES`・`NOT_STORED_FIT_MARGIN` を除く | `pure` | 兄弟 12 の名を出し直す |
| `UF-132` | `time-axis.ts` | 4.3 のまま（`FR-017`・`LC-3`）。<br>`L-1` の粒度・`LF-1`・`DC-3` は (c) | `serialOf`、`rulerTierOf` 〜 `xFromDay` | `pure` | → 入口（型だけ）: 型だけの輪 |
| `UF-133` | `label-width.ts` | 4.3 のまま | `labelUnits`・`labelWidth` | `pure` | 輪なし |
| `UF-134` | `assignee-label.ts` | 4.3 のまま。<br>担当ラベルが名を出す資源（`labelledAssigneeUidOf`、`AS-1`）は (c) | `assigneeLabelsOf`、`LabelledAssignee` 〜 `labelledAssigneeUidOf` | `pure` | 輪なし |
| `UF-135` | `percent-label.ts` | 4.3 のまま | `percentLabelOf`・`outsideLabelOf` | `pure` | 輪なし |
| `UF-136` | `name-label.ts` | 4.3 のまま。<br>予定日の字の幅（`S-325`）は (c) | `truncate` 〜 `nameLabelOf`、`YEAR_DIGITS`・`NameLabel`・`nameLabelWidthOf` | `pure` | → 入口（`NOT_STORED_LABEL_SIZES`・型 `DayReader`）: 輪。<br>→ `label-width` |
| `UF-137` | `shape-cross-sections.ts`（旧 `shape-tiers.ts`） | 「形ごとの縦の断面を、縦の倍率から決める（表 T-271・表 T-012）」。<br>形の列挙（`XS-1`〜`XS-9`）は (b)。<br>字を可読の下限より小さくしない（`FR-077`）・同じ式を逆に解く（`zoomYAtRectangleLabelFont`）は (c) | `thinEndHalfHeightOf` 〜 `labelFontSize`（`verticalGapOf` を除く）、`zoomYAtRectangleLabelFont` | `pure` | → 入口（`NOT_STORED_LABEL_SIZES`・`ShapeKind`）: 輪 |
| `UF-138` | `drawn-rows.ts` | 4.3 のまま | `drawnGroups`・`inTreeOrder` | `pure` | 輪なし |
| `UF-139` | `group-level-of-detail.ts`（旧 `level-of-detail.ts`） | 「縦の倍率に応じて描く行の深さを減らす（表 T-005a の `L-3`、`FR-018`・`LC-2`）」。<br>開いたままの印の行は残す（表 T-254）・深さごとの倍率を 1 つの式で答える（`S-87`・`S-88`）は (c) | `keptInViewByOpenMarks`・`groupDepthLimit`・`groupDepthThresholdOf` | `pure` | 輪なし |
| `UF-140` | `label-placement.ts` | 4.3 のまま | `LabelReference` 〜 `assigneeAnchorOf`、生成 `NOT_STORED_SIZES` | `pure` | → 入口（`dummyInkWidthOf`・`ShapeKind`）: 輪。<br>→ `shape-cross-sections` |
| `UF-141` | `pinned-band.ts` | 4.3 のまま | `pinnedBandOf` 〜 `shiftedPlacements` | `pure` | 型だけの輪 |
| `UF-142` | `row-scroll.ts` | 4.3 のまま | `scrollOffsetOf` 〜 `scrolledPlacements` | `pure` | 型だけの輪 |
| `UF-143` | `fit-zoom.ts` | 4.3 のまま | `FitToScreen` 〜 `fitZoom`、15.3 の 3 の 11 の名、生成 `NOT_STORED_FIT_MARGIN` | `pure` | → 入口（`layoutFromSchedule`）: 輪。<br>→ `time-axis`・`drawn-rows`・`group-level-of-detail`・`shape-cross-sections` |

##### `schedule-geometry.ts`（`UF-6` ＋ 兄弟 7）

| UF | ファイル | 責務文（R2.2a の畳み） | 持つ宣言（名で） | @purity | 取り込みと輪 |
| --- | --- | --- | --- | --- | --- |
| `UF-6` | `schedule-geometry.ts`（入口） | 4.4 のまま | 4.4 の範囲。<br>生成の区画から `NOT_STORED_DUMMY_SIZES`・`NOT_STORED_SELECTION_SIZES` を除く | `pure` | 兄弟 7 の名を出し直す |
| `UF-144` | `task-figures.ts` | 4.4 の文から、ハイライトボックスの枠（`FR-019`）を (b) とする句と、その理由の句（`UT-8` の書き方）を除く（U-1 の案 B）。<br>マイルストーンの形はこのユニットに残る（`JDG-550`） | `fadedOutline` 〜 `resumeOf`、`dummyFromOf` 〜 `outsideLabelBoxOf`、`taskGeometryOf`、`chevronBarOf`、生成 `NOT_STORED_DUMMY_SIZES` | `pure` | → 入口（`point`・型）: 輪。<br>→ `plan-actual-guides` |
| `UF-171` | `highlight-box.ts`（新） | 「ハイライトボックスの箱を、上下の行と両端の日から置く（`FR-019`）」。<br>終わりの日を含む・並びが逆でも min と max で囲む・角の丸みを既定で埋めない（`CM-52`）は (c) | `rightEdgeOfDay`・`highlightGeometry` | `pure` | → 入口（型 `HighlightGeometry` だけ）: 型だけの輪 |
| `UF-145` | `dependency-route.ts` | 4.4 のまま | 4.4 の範囲、生成 `NOT_STORED_SELECTION_SIZES` | `pure` | → 入口（`point`）: 輪。<br>→ `task-figures` |
| `UF-146` | `plan-actual-guides.ts`（旧 `guides.ts`） | 「予定と実績が離れたとき、実績から予定へ補助線を引く（`FR-084`・表 T-020a）」 | `guidesOf` | `pure` | → 入口（`point`）: 輪 |
| `UF-147` | `progress-line.ts` | 4.4 のまま | `vertexXOf`・`progressLineOf` | `pure` | → 入口（`point`）: 輪 |
| `UF-148` | `comment-box.ts` | 4.4 のまま（`labelUnits` の写しは D4 で消す） | `leaderOf`、`charUnits` 〜 `commentGeometry` | `pure` | → 入口（`point`）: 輪 |
| `UF-149` | `dual-cursor.ts` | 4.4 のまま | `dualCursorGeometry` | `pure` | 型だけの輪 |

##### `item-hit-area.ts`（`UF-7` ＋ 兄弟 3）

| UF | ファイル | 責務文（R2.2a の畳み） | 持つ宣言（名で） | @purity | 取り込みと輪 |
| --- | --- | --- | --- | --- | --- |
| `UF-7` | `item-hit-area.ts`（入口） | 4.5 のまま（見出しの 1 行目は真に戻る） | `Item` 〜 `itemAtPointer` ＋ 生成の区画 | `pure` | 兄弟 3 の名を出し直す |
| `UF-150` | `dependency-end.ts` | 4.5 のまま | `DependencyEnd` 〜 `dependencyStartOfHit` | `pure` | → 入口（形の模型）: 輪 |
| `UF-151` | `marquee.ts` | 4.5 のまま | `isEnclosedInclusive`・`itemsInMarquee` | `pure` | → 入口（形の模型）: 輪 |
| `UF-169` | `drawn-selection.ts`（新） | 「選択を、描いているタスクだけに絞る（表 T-023c、`FR-049`）」。<br>描いているかの判定（`isTaskDrawn`、表 T-240）は (a)。<br>何も外れないときは同じ物を返す・選んだ順を保つ（`SL-7b`）は (c) | `isTaskDrawn`・`DrawnChoice`・`ChosenItem`・`selectionWithinDrawn` | `pure` | `ScheduleGeometry` の型だけを取り込む（入口と同じ）: 輪なし |

⚠️ 15.3 の 3 は、H2 の 4 つの宣言を入口に置いた。  
本節はそれを覆す —— 出どころ（表 T-023c・`SL-7b`・`FR-049`・表 T-240）が入口の出どころ（表 T-023d・T-266〜T-268・`FR-104`）と互いに素であり（`UD-1`）、入口はこの 4 つを呼ばない。  
共変は 1 件（`18db8646`）で、拒むものは無い。  
15.3 の 3 の理由（`marquee.ts` と共に変えた証拠が無い、出し直しが増えない）は S1〜S5 のどれでもない。  
表 T-064 の `PI-7` が既にこの名を `ItemHitArea` に置くので、このユニットは終の置き場であり、2 度目の移しは無い。  
入口は 4 つの名を出し直す（読み手は `selection-input.ts` と `frame-loop.ts`）。

##### `schedule.ts`（`UF-1` ＋ 兄弟 7）

| UF | ファイル | 責務文（R2.2a の畳み） | 持つ宣言（名で） | @purity | 取り込みと輪 |
| --- | --- | --- | --- | --- | --- |
| `UF-1` | `schedule.ts`（入口） | 4.6 のまま。<br>見出しの 1 行目を書き直す（15.6.9 の MUST 10） | `:1-12`、`taskByUid`、出し直しの行 | `pure` | 出し直すだけ |
| `UF-126` | `schedule-entities.ts`（旧 `schedule-generated.ts`） | 「日程データの群のエンティティ（表 T-056）の型と、列（表 T-058）と既定の暦（表 T-209）の定数を持つ」。<br>手で直さない・`npm run gen` が書くは (c) | 生成の区画（`c48f9736` の `:13-691`） | `—`（見出しは `n/a`） | 葉 |
| `UF-127` | `plan-actual-state.ts` | 4.6 のまま | `planActualState` | `pure` | → `schedule-entities` |
| `UF-170` | `calendar-day.ts`（新） | 「暦の日付（`CalendarDay`）を字と相互に変え、比べ、日の番号で数える（`EX-2`・`EX-7`・`FD-6`）」。<br>年月日の隔たり（`DC-3`、`calendarSpanOf`）は (b)。<br>時差で日を動かさない・0〜99 年の扱いは (c) | `CalendarDay` 〜 `dayFromSerial`（`c48f9736` の `:714-813`）。<br>`serial` と `dayFromSerial` に `export` を付ける | `pure` | 葉 |
| `UF-128` | `working-calendar.ts` | 「文書の暦で稼働日を判じ、数え、進める（`FR-054`）」。<br>実績の長さ（両端を含む）とその逆算（`FR-011`・`IV-21`）は (b)。<br>受け入れる日付の範囲（表 T-214）を越えたら投げる・暦が無ければ既定の暦（`S-106`）は (c) | `WorkingCalendar` 〜 `lastDayForLength`（`c48f9736` の `:814-1014`） | `pure` | → `calendar-day`・`plan-actual-state`・`schedule-entities` |
| `UF-129` | `task-delay.ts` | 4.6 のまま | `delayStart` 〜 `delayWorkingDays` | `pure` | → `calendar-day`・`working-calendar`・`plan-actual-state` |
| `UF-130` | `stored-colour.ts`（旧 `custom-colour.ts`） | 「選んだ色の保存の綴り —— パレット色の名とカスタムカラーの明暗の 2 値 —— を表 T-017b の `CV-1`〜`CV-4` に従って作り・読み・確かめる」。<br>どちらの側で描くか（`CV-3`）・透明の名は (c) | `TRANSPARENT` 〜 `customColourChosen` | `pure` | → `schedule-entities` |
| `UF-131` | `schedule-invariants.ts` | 4.6 のまま | 4.6 の範囲 | `pure` | → `calendar-day`・`working-calendar`・`stored-colour`・`schedule-entities` |

取り込みは DAG で、輪は 0 である。  
入口は兄弟を出し直すだけで、兄弟は入口を取り込まない。  
`schedule-invariants` が関数の中で読む `serial` は `calendar-day` から、`TRANSPARENT` は `stored-colour` から取る（15.2 の「新たに `export` を付ける名」の置き場が変わる）。

##### `json-codec.ts`（`UF-35` ＋ 兄弟 1）と `mspdi-codec.ts`（`UF-36` ＋ 兄弟 4）

| UF | ファイル | 責務文（R2.2a の畳み） | 持つ宣言（名で） | @purity | 取り込みと輪 |
| --- | --- | --- | --- | --- | --- |
| `UF-35` | `json-codec.ts`（入口） | 4.7 のまま | 4.7・15.4 の範囲から `JsonFault` を除く（入口が出し直す） | `pure` | → `grs-json-schema`（実行時）: 輪なし |
| `UF-152` | `grs-json-schema.ts`（旧 `json-schema-validator.ts`） | 「`GRS JSON` のスキーマ（表 T-220 の前文、`grs-document.schema.json`）を持ち、それに照らして答える」。<br>値の外れを並べる（`FR-023` の検証器、`RS-25`）・実体を持つ集まりの名を答える（表 T-297 の読み手のため）は (b)。<br>節の表は生成器が刷る・11 の語だけを解す・知らない鍵の外れを名乗らせるは (c) | 生成の区画、`NOT_A_KEY_THIS_SHAPE_CARRIES`・`fault`・`isUnknownKeyFault`・`pointer` 〜 `collectFaults`・`collectionNamesOfEntity`・`JsonFault` | `pure` | → `mspdi-codec.ts`（`isObject`）。<br>`json-codec.ts` への辺は無い: 輪なし |
| `UF-36` | `mspdi-codec.ts`（入口） | 4.8 のまま | 4.8 の範囲から `MspdiFault` を除く（入口が出し直す） | `pure` | 兄弟 4 の名を出し直す |
| `UF-153` | `mspdi-xml.ts` | 4.8 のまま | `XmlElement` 〜 `fault`・`MspdiFault`、`NAMED_REFERENCES` 〜 `writtenXml` | `pure` | 葉: 輪なし |
| `UF-154` | `mspdi-child-placement.ts` | 4.8 のまま | 4.8 の範囲 | `pure` | → `mspdi-xml`（型） |
| `UF-155` | `mspdi-fade-frames.ts` | 4.8 のまま | 4.8 の範囲 | `pure` | → 入口（要素の木の語 9）: 実行時の輪（4.8 が受け入れた）。<br>→ `mspdi-xml`・`mspdi-child-placement` |
| `UF-156` | `mspdi-imported-rows.ts` | 4.8 のまま | `ImportedRows` 〜 `rowIdOfTask` | `pure` | 輪なし |

`UF-152` の名を変える費用: `tools/generate_json_schema_validator.py` の docstring と出力先（4.7 の行）、`docs/development-rules/09-tools.md:147`、`CR-565` の `S-7`（`CR-565` は割った後に測り直す —— 8.1）。

#### 15.6.4 名を変えるもの・移すもの・退けた案

**名を変えるもの**

どれも割る波の中で、新しいファイルを作る時に付ける。  
既にある名を変えるのは P1 の 1 つだけである。

| 旧 → 新 | 規則 | 証拠 |
| --- | --- | --- |
| `confirmation-questions.ts` → `deletion-confirmations.ts`（`UF-162`） | `UD-5`・R2 の命名 | 表 T-234 は `QN-1`〜`QN-5`・`QN-8`〜`QN-10` を持つが、このユニットが持つのは削除が負う `QN-1`・`QN-2`・`QN-3`・`QN-10` だけである（表 T-050 の `CD-1`・`CD-2`・`CD-5`・`CD-6`）。<br>`QN-4` は `document-file-flow`、`QN-5` は入口、`QN-9` は `watermark-unlock` にある |
| `field-focus.ts` → `field-entry.ts`（`UF-164`） | `UD-5`・`03-implementation.md` の 1 | 表 T-292 の領域をまるごと運び、確定の書き込み（`SK-19`）も持つ。<br>領域のコードの名は `fieldEntry`（`state-machines.json` の領域、`field-entry-values.ts`） |
| `row-band-ceiling.ts` → `row-band-ceiling-cache.ts`（`UF-167`） | POLA・`UD-5` | 覚えるだけで、天井そのものは `zoom-and-fit.ts:185` の `rowBandCeilingOf` が求める。<br>表 T-071 の名が「キャッシュ」で、`CA-1` ② がこの持ち越しを名指す |
| `shape-tiers.ts` → `shape-cross-sections.ts`（`UF-137`） | `03-implementation.md` の 1（仕様の名） | 中身は表 T-271「形ごとの縦の断面」で、行の頭は `XS`。<br>「tier」は `XS-4`〜`XS-6` だけの語で、同じフォルダの `rulerTierOf`・`RulerTier` とぶつかる |
| `level-of-detail.ts` → `group-level-of-detail.ts`（`UF-139`） | `UD-5` | 表 T-005a は `L-1`（時間軸）と `L-3`（行の群）を持ち、このユニットは `L-3` だけである。<br>設定の名も `groupLevelOfDetailBase`・`groupLevelOfDetailRatio`（`S-87`・`S-88`） |
| `guides.ts` → `plan-actual-guides.ts`（`UF-146`） | 6.3 の MUST 9 | 仕様の名は表 T-020a「予実の補助線」（設定 `planActualGuide*`）。<br>`guide` は `U-13` の `Guide Cursor` と出来事 `guideCursorEntryPressed` が別の意味で使う |
| `schedule-generated.ts` → `schedule-entities.ts`（`UF-126`） | `03-implementation.md:196`（「どう作ったか」を言わない） | 中身は表 T-056 のエンティティの型・表 T-058 の列・表 T-209 の既定の暦。<br>`src/` に出どころで名付けたファイルは 1 つも無い |
| `custom-colour.ts` → `stored-colour.ts`（`UF-130`） | `UD-5`・同じ概念に 1 つの名 | パレット色の綴り（`CV-1`）も持つ。<br>「chosen colour」は描く側の名として既に `svg-renderer.ts:159`・`:459` の `ChosenColour`・`chosenColourOf` が使う |
| `json-schema-validator.ts` → `grs-json-schema.ts`（`UF-152`） | R2.2a の畳み | `collectionNamesOfEntity` は何も検証しないので、「検証する」の主の句に畳めない。<br>持つもの（スキーマの根）で名付ければ、2 つの関数とも (b) に畳める |
| `settled` → `isSizeSettled`（P1） | R2 の品詞（Boolean は `is/has`） | 3 つの兄弟へ `export` される（15.3 の 3）ので、R2.2c により今そろえる。<br>仕様の語は `BO-1`「寸法を確定させ … 寸法が確定するまで 1 枚も描かない」（`05-07-design.md:912`） |

**移すもの**

- `verticalGapOf`（`VG-2`）は `shape-cross-sections.ts` ではなく `schedule-layout.ts` の入口に置く —— 設定だけを読み、形の性質ではない。  
  呼び手は入口の帯高の段だけで、`schedule-geometry.ts:601` の `TRAP` もそれを前提に書かれている。
- `SEAM_ABSENT_REASON`・`HEIGHT_CEILING_REASON`・`NOTICE_REASON_OF_RASTER_FAULT` は `frame-loop.ts` の入口に残す —— 入口の絵の写しの枝（`c48f9736` の `:4294`・`:4304`・`:4308`）と流れの両方が読む語彙であり、4.1 の S2 の処置（台帳は入口、ファイルの失敗の写像だけを流れへ）と同じである。
- 型 `ConfirmationQuestion` は入口に残す —— 表 T-234 のすべての問いに掛かる型で、入口（`QN-5`）と流れ（`QN-4`）が読む。
- `JsonFault` は `grs-json-schema.ts` へ、`MspdiFault` は `mspdi-xml.ts` へ移し、どちらも入口が出し直す（`PI-20`・15.3 の 5）—— 4.7・4.8 が既に `fault()` の作り手をそこへ移すので、型は作り手と共に変わる（`UD-1`）。  
  型だけの輪が 2 つ消える。
- H2 の 4 つの宣言は `item-hit-area.ts` の入口から `drawn-selection.ts` へ（15.6.3）。
- `working-calendar.ts` の日付の型と日の算術を `calendar-day.ts` へ（15.6.3）。

**退けた案**

| 案 | 退けた理由 |
| --- | --- |
| `browser-stored-values.ts` → `browser-storage.ts` | 中身は表 T-206 の「ブラウザに残す値」で、コードも `readBrowserStored` と書く。<br>`storage` は仕組みの名である |
| `frame-clock-wakes.ts` → `timed-wakes.ts` | 仕様の語が名を強いない（`FT-4` は「時間が来たこと」）。<br>いまの名は中身を言っている |
| `fit-zoom.ts` → `fit-to-screen.ts` | `PI-5` が公開する名が `fitZoom` である |
| ハイライトとコメントボックスを `annotations.ts` にまとめる | 共に変えたのは 5 件中 1（0.20）で、較正の「本物の継ぎ目」の帯にある |
| `mspdi-child-placement.ts` → `mspdi-child-order.ts` | 同じフォルダの `mspdi-child-order.json` と語幹が重なる。<br>宣言の無い子を隣に付けることもするので、順だけではない |
| `mspdi-fade-frames.ts` → `mspdi-fade-fields.ts` | 「frame」は `EX-6` の枠を言うコードとデータの語である（`CustomFieldFrame`・`CUSTOM_FIELD_FRAMES`・`claimedFrames`、`mspdi-custom-fields.json`）。<br>ファイルの名だけ変えると 1 つの概念が 2 つの名を持つ |
| `working-calendar.ts` から `actual-length.ts` を出す | `lastDayForLength` は暦の内側の `indexOfCalendar`・`isWorkingDayAt`・`ACCEPTED_DAY_SPAN`・`NoWorkingDayReached` で歩く。<br>出すと内側の 4 つを `export` し、表 T-214 の歩きの守りを 2 ファイルに置くことになる（`UD-5`） |
| 入口から `surviving-selection.ts`（表 T-023c の刈り込み）を出す | 関数がすべて `pure` で、`Framework` に置くと `LY-5` と食い違う。<br>終の置き場は内側（`Selection` と `drawn-selection.ts`）なので、いま出すと 2 度動かすことになる ⇒ D1 |
| 入口から `scrollbar-extent.ts`（`GR-21`・`SC-1`）を出す | 同じ形（すべて `pure`、置き場は描く側）⇒ D2 |
| 輪を断つための語彙のユニット（`mspdi-leaves.ts`・`shell-happenings.ts`・`vertices.ts`） | 要求の持たない語彙は入口に残す（`CR-432` の 4.1 の S4、`UT-10`・`UT-12`）。<br>共変の証拠も無く、`shell-happenings` は R2.2b の列挙になる |
| 閉包の読み手 8 つを `semi-pure-b` と呼ぶかを利用者に問う | R2 が機械的に決めている —— 「判定は R7 の @purity タグをそのまま使う」（`07-review-standards.md:80`）。<br>名を動詞にするのは D7 |
| 入口と兄弟の輪を利用者に問う | 既にある規則が決めている（15.6.6） |

#### 15.6.5 `frame-loop.ts` の入口 —— R2.2a と R2.2b の記録

- 表 T-075 の `UF-48` の欄の 3 つの文は逐語で残す（4.1 の MUST）。  
  `tests/unit/uf-48-one-input-one-step.test.ts:25-29` と `tests/unit/cr-389-fr-071-full-screen-is-asked-of-the-browser.test.ts:41` が字で読む。
- R2.2a の段 5 の Remark: ⛔ FAIL である。  
  畳んだあとに残る句と、片方だけを書き換えさせる出来事は次のとおり。

| 残る句 | 片方だけを書き換えさせる出来事 |
| --- | --- |
| 「セッションを進める」と「フレームを計算して配る」 | 送り口の約束（`SF-6`・`SF-7`）が変われば前者だけが、描き手へ配る値が 1 つ増えればフレームの段だけが書き変わる（R2.2a の FAIL の例と同じ形）。<br>S2 は、この 2 つを割る案を拒んだ（0.53〜0.54、15.2） |
| 表 T-023c の選択の刈り込み（`scheduleHolds`・`selectionWithinSchedule`・`selectionWithinDrawnRows`） | 表 T-023c が、畳んだときに残す選択を変える |
| `GR-21`・`SC-1` のスクロールの全体（`HorizontalWhole` 〜 `heldWholeOf`・`scrollExtentOf`） | スクロールの全体の取り方を変える |

- R2.2b も FAIL である（入れ物、0 節 ②）。
- どちらも受け入れた借りである —— 大きさは `JDG-440`（割ったあとで入口を開く頻度を測る）、出どころの別な 2 つと削除の問いの規則は `JDG-549`（本書の直後の `CR-568`）。  
  R2.2c（`07-review-standards.md:577`「是正の方法と時期を別途定めた上で」）の形である。
- 表 T-075 に Remark の欄は無い。  
  ⇒ 割るコミットは、`UF-48` の責務の欄の末に ⚠️ の文を 1 つ足す —— 残る句と出どころの別な 2 つを名指し、R2.2a と R2.2b を満たさないこと、内側の層へ移すまでの借りであることを書く。  
  ⛔ 裁定と変更要求の番号・日付は仕様に書かない（検査 54 —— 仕様は理由を持ち、経緯を持たない）。

#### 15.6.6 輪

- 入口と兄弟の輪は、既にある規則が許している。  
  表 T-063 の `UT-10`（`05-07-design.md:339`）と `UT-12`（`:341`）は、兄弟が共有する語彙を公開エントリに置き、公開エントリが兄弟を出し直す —— ファイルの取り込みの輪は、この形から必ず生まれる。  
  表 T-061 の `LR-3`（`05-07-design.md:65`）を見る検査 19 は、同じ層の**コンポーネント**のグラフだけを見る（`09-tools.md:96`、`tools/check_layer_rules.py:234`）。  
  `CR-432` の 4.1・`CR-438`・`CR-439` がこの形で着地した。  
  関数の水準では呼び出しは非巡回のままである（例: `fitZoom` → `layoutFromSchedule` で、逆は無い）。
- 兄弟どうしの輪: 0（15.6.3 の各表）。
- 評価の順: 兄弟はモジュールの頂上で入口の名を 1 度も読まない（6.3 の MUST 4、本節の案で測って 0）。  
  15.6.7 の 9 群は、それを読む兄弟に刷るので、頂上で入口の定数を読む兄弟は生まれない。
- 利用者に問うことではない（`LR-3` の言い方を「コンポーネントの間」と書き直すのは D12）。

#### 15.6.7 1 つの兄弟だけが読む生成の定数は、その兄弟に刷る

⭐ 下の 9 群は、読み手が兄弟 1 つだけである（反証の体が、読む行が兄弟の範囲の中にあることを群ごとに確かめた）。  
⇒ 生成器がその兄弟に刷る。  
入口が `export` を足して兄弟に読ませる形（7 節の検査 30 の行）は採らない。

| 群 | 刷る先 |
| --- | --- |
| `NOT_STORED_END_POINTER_SIZES` | `pointer-shape.ts` |
| `NOT_STORED_INTERACTION_RECORD_LIMITS` | `interaction-record.ts` |
| `NOT_STORED_REPEAT_TIMES`・`NOT_STORED_SCALE_MESSAGE_TIMES` | `frame-clock-wakes.ts` |
| `WATERMARK_UNLOCK_DIGEST` | `watermark-unlock.ts`（入口が出し直す、15.3 の 5） |
| `NOT_STORED_SIZES` | `label-placement.ts` |
| `NOT_STORED_FIT_MARGIN` | `fit-zoom.ts` |
| `NOT_STORED_DUMMY_SIZES` | `task-figures.ts` |
| `NOT_STORED_SELECTION_SIZES` | `dependency-route.ts` |

`NOT_STORED_LABEL_SIZES` は兄弟 2 つが読み、`PI-5` の名でもあるので `schedule-layout.ts` の入口に残す。

理由:
- `03-implementation.md:135`「表 T-206 の行は、値の種類ではなく使うユニットで分ける」と `:146`「1 つの名前は、それを使うユニットごとに刷られる」。
- 生成器の作法も、使うファイルごとに 1 つ刷る（`NOT_STORED_DUMMY_SIZES` は既に 3 ファイル、`NOT_STORED_CHROME_SCALE` は 5 ファイルに刷られている）。
- 3 節の原則「区画は、それを読む手書きのコードと同じファイルに刷る」の例外の条件（手書きの側が割れて、区画を読む手が別のユニットへ移る）に当たる。  
  3 節と 4 節はこの 9 群を見落としていた。
- `JDG-139` の問い（公開する者だけを公開にする）にも合う —— 入口の `export` を 9 つ足さずに済む。

費用と手順: 兄弟ごとに、`tools/generate_entity_types.py` の `TARGETS` の項・出力の式・2 つの印と、要るなら `PUBLISHED_READ_BY_*` の鍵を足す。  
⇒ 6.2 の「割る体が書いてよい共有のファイル」を広げる —— 各波の体は、自分の波の群の `generate_entity_types.py` の行を書いてよい。  
並行する体が同じ生成器を書くので、併合は 6.2 のとおり前に立つ者が 1 本ずつ行う。  
7 節の検査 30 の行（`PUBLISHED_READ_BY_SRC` へ 4 つ足す、`NOT_STORED_SIZES`・`NOT_STORED_DUMMY_SIZES` を移す ほか）は、この 9 群について各波が測り直して書く。

#### 15.6.8 最初の分割の波より前に置く 2 つのコミット

どちらも移動ではない。  
それぞれ `tsc`・`vitest`・照合器が緑であることを確かめて、単独でコミットする（分割の差分を純粋な移動に保つため）。

- **P1**: `settled` → `isSizeSettled`（`frame-loop.ts:1795`）。  
  名を変えるだけのコミットである（理由は 15.6.4 の表）。
- **P2**: 純粋性の札だけを直すコミット（コメントだけ）。  
  `UF-161`・`UF-167` の表 T-075 の純粋性を 1 度で書くためである。
  - `bandCeilingFor`（`frame-loop.ts:3480`）: `semi-pure-b` → `non-pure`（閉包の覚えを書く、R7.1）。
  - `viewSettingsOnce`（`frame-loop.ts:2643`）: `semi-pure-b` → `non-pure`（同じ）。
  - `carryOutAction`（`frame-loop.ts:4249`）: 札が無い ⇒ `non-pure` を付ける。
  - `milestoneOutline`（`schedule-geometry.ts:338`）: 札が無く、その札は `PICTORIAL` の上（`:279`）にある ⇒ 関数の上へ移す。
  - ⚠️ `collectFaults`・`stringFaults`（`json-codec.ts`）と `keepFirstLeaf`・`tellRoundedActualDurations`（`mspdi-codec.ts`）も引数を書くが、ここでは直さない（D8）—— 札を変えると `Adapter` の変換のユニットが `pure` でなくなり（`LY-4`「変換と直列化は pure」）、正しい直し方は値を返すコードである。

#### 15.6.9 6.3 に足す MUST

10. 各入口の見出しの 1 行目を、割ったあとも真であるように書き直すこと。  
    `schedule.ts:1`（「types, working-day arithmetic, and the document invariants」）と `schedule-layout.ts:1`（「the time axis, label widths, row placing, level of detail and the fit」）は、割ると偽になる。  
    `generate_unit_tree.py` は `@unit`・`@component`・`@purity` しか確かめないので、偽の 1 行目を機械は捕まえない（R2.15・POLA）。  
    `item-hit-area.ts:1` は `UF-169` を出すと真に戻る。
11. 新しいファイルの見出しの `@purity` と表 T-075 の純粋性は、その中の関数の札のうち最も強いものとすること（`UT-12` の前例 —— `UF-103`〜`UF-112` は `pure` の関数を持っても `non-pure`）。  
    4.1 の「`pure` と `non-pure` の両方を持つ」はこの形で書く。
- 6.3 の MUST 9 の名の並びは、`field-focus.ts` を `field-entry.ts` と読み替える。
- 6.3 の MUST 3（生成の定数を手で動かさない）は変わらない —— 15.6.7 の 9 群も、生成器の的を変えて動かす。

#### 15.6.10 数

測り方: 表 T-075 の今の行を「コンポーネント」の欄で数え（`grep -E '^\| UF-[0-9]+ \|' docs/spec/05-07-design.md`、114 行）、本節の表の新しい行を足した。

| 項目 | いま | 割ったあと |
| --- | --- | --- |
| 表 T-075 に足す行 | —— | 46（`UF-126`〜`UF-168` の 43 ＋ `UF-169`〜`UF-171` の 3） |
| 表 T-074 の `SU-3`（`05-07-design.md:247`）と `tests/contract/units.contract.test.ts:50-51` | 114 | 160 |
| コンポーネント（`SU-1`） | 37 | 37 |
| 表 T-063 の行 | 12 | 17（5 節のまま） |
| `Schedule` | 1 | 8（`UF-1`・`UF-126`・`UF-127`・`UF-170`・`UF-128`〜`UF-131`） |
| `ScheduleLayout` | 1 | 13（`UF-5`・`UF-132`〜`UF-143`） |
| `ScheduleGeometry` | 1 | 8（`UF-6`・`UF-144`・`UF-171`・`UF-145`〜`UF-149`） |
| `ItemHitArea` | 1 | 4（`UF-7`・`UF-150`・`UF-151`・`UF-169`） |
| `DocumentCodec` | 5 | 10（いまの 5 ＋ `UF-152`〜`UF-156`） |
| `SingleHtmlShell` | 3 | 15（いまの 3 ＋ `UF-157`〜`UF-168`） |

- `docs/development-records/changelog.md:47` の「2 つより多いユニットを持つのは …」の文（検査 33）: 割ったあとは `EditDocument` 18・`DocumentCodec` 10・`AgentApiEndpoint` 3・`InputCommandTranslator` 15・`ScreenRenderer` 11・`DomScreenSurface` 11・`SvgRenderer` 5・`SingleHtmlShell` 15・`AdvanceScreenSession` 10 に、`Schedule` 8・`ScheduleLayout` 13・`ScheduleGeometry` 8・`ItemHitArea` 4 が加わる。  
  15.3 の 8 のとおり、そのコンポーネントのユニットの数を変えるコミットが同じコミットで書き直す。
- `05-07-design.md:253` の並び: 割ったあとは `EditDocument` 18 ＞ `InputCommandTranslator` と `SingleHtmlShell` 15 ＞ `ScheduleLayout` 13 ＞ `ScreenRenderer` と `DomScreenSurface` 11 である。  
  最後の波で書き直す（7 節）。
- 15.3 の 1 の数（足す行 43、`SU-3` 157）は、本節の 46 と 160 に替わる。

#### 15.6.11 波

⭐ ファイルの順（6.2）と、1 つのファイルを割る体は同時に 1 体だけという約束は変わらない。

| 順 | 波 | 出すユニット |
| --- | --- | --- |
| 0 | P1 → P2 | 15.6.8（分割の前） |
| 1 | S1 → S2 → S3a → S3b → S4 → S5 → S6 | `schedule-entities` → `plan-actual-state` → `calendar-day` → `working-calendar` → `task-delay` → `stored-colour` → `schedule-invariants` |
| 2 | L1 → L2 | L1 ＝ `time-axis`・`label-width`・`assignee-label`・`percent-label`・`shape-cross-sections`・`drawn-rows`・`group-level-of-detail`・`pinned-band`・`row-scroll`（`verticalGapOf` は入口に残す）→ L2 ＝ `name-label`・`label-placement`・`fit-zoom` |
| 3 | G1 → G2 → G3 | G1 ＝ `plan-actual-guides`・`progress-line`・`comment-box`・`dual-cursor`・`highlight-box` → G2 ＝ `task-figures` → G3 ＝ `dependency-route` |
| 3 | H1 | `dependency-end`・`marquee`・`drawn-selection` |
| 4 | J1 | `grs-json-schema`（生成器の出力先の変更・`collectionNamesOfEntity`・`JsonFault` を同じ波で） |
| 4 | M1 → M2 → M3 → M4 | `mspdi-xml`（`MspdiFault` を含む）→ `mspdi-child-placement` → `mspdi-imported-rows` → `mspdi-fade-frames` |
| 5 | F1 → F2 → F3 → F4 | F1 ＝ `browser-stored-values`・`deletion-confirmations` → F2 ＝ `pointer-shape`・`watermark-unlock`・`row-band-ceiling-cache`・`view-place` → F3 ＝ `held-press-preview`・`frame-clock-wakes`・`interaction-record`・`field-entry`・`copy-and-paste` → F4 ＝ `document-file-flow` |

#### 15.6.12 後の変更要求へ送るもの

⛔ どれも振る舞いを保つ移動（11 節・6.3 の MUST 6）に乗せられない —— 呼び手や公開の名を変える、コードを消す、仕様を変える、層をまたいで動かす（表 T-064 が変わる）のどれかに当たる。

| ID | 何か | 後に置く理由 | 行き先 |
| --- | --- | --- | --- |
| D1 | 表 T-023c の選択の刈り込み（`scheduleHolds`・`selectionWithinSchedule` → `Selection`、`selectionWithinDrawnRows` → `drawn-selection.ts`） | コンポーネントをまたぐ。<br>表 T-064 の `PI` の行が変わる。<br>1 度で動かす | `CR-568`（`JDG-549`） |
| D2 | `GR-21`・`SC-1` のスクロールの全体を `Framework` の外へ | コンポーネントをまたぐ。<br>置き場（描く側）の選びが要る | `CR-568`（`JDG-549`） |
| D3 | 表 T-050 の削除の問いの規則を `EditDocument` へ（`editTaskGroup` の横の `TRAP` の写し（`frame-loop.ts:2054`）を消す） | 層をまたぐ移しと、写しの一本化。<br>`LY-5` との食い違い（`DFC-968`）を閉じる | `CR-568`（`JDG-549`） |
| D4 | `labelUnits` を 1 つに（写しが 3 つ） | コードを消し、コンポーネントをまたいで取り込む | 後の変更要求 |
| D5 | `isObject`・`withoutLeadingByteOrderMark` を `mspdi-codec.ts` の外へ | 新しい置き場の決め（R2.2c） | 後の変更要求 |
| D6 | `serial`・`serialOf` を 1 つの名に | コンポーネントをまたぐ改名 | 後の変更要求 |
| D7 | R2 の品詞に合わない名（閉包の読み手 8 つ、`pasteRefusedFor`・`owesFrame`・`isEditingField` の CQS ほか） | 名を変えると呼び手が変わる | 1 本の改名の変更要求 |
| D8 | 引数を書く変換の関数（15.6.8 の ⚠️） | 札を変えると `Adapter` の純粋性が動く。<br>直すのはコード | 後の変更要求 |
| D9 | `pointerShapeAt` の覚え（押した点で決める）が表 T-071 の `CA-1` に無い | 仕様とコードの食い違い ⇒ 台帳 | 台帳（2026-09-13 の裁定のとおり、どちらも選ばずに起こす） |
| D10 | `single-html-shell.ts:1`「the only unit that touches the host」が偽 | 割る前から偽で、別のユニットのコメント | コメントだけのコミット（分割の外） |
| D11 | ポインタの絵の SVG が `Framework` にある（`LY-4`「SVG の生成」） | 層をまたぐ移し | 後の変更要求 |
| D12 | `LR-3` を「コンポーネントの間」と書き、頂上で読まない MUST を足す（任意） | 仕様の言い方だけ | 後の変更要求 |
| D13 | `LY-5` の純粋性の欄と `pure` の `Framework` のユニット | 仕様。<br>D3 で内側へ移せば消える | `DFC-968`・`CR-568` |
| D14 | 入口の R2.2a・R2.2b の借り（15.6.5） | `JDG-440` —— 割ったあとで先に測る | 段 7.5 の後 |

⚠️ `CR-568` は起草前である（本書の着地の後に起こす）。  
段 8 の前に置く（`JDG-549`）。

#### 15.6.13 照合器の事実（どの波より前に書く、設計した違い）

- 照合器はセッションの一時フォルダにあり、木には無い（`CR-439` の照合器と同じ扱い）。
- 基準: `c48f9736` で 6,865 件。
- 感度: わざと壊して 18 件中 18 件が赤になった。
- 許す違いは、入口の `export` の名の並びが増えることだけである（15.3 の 5・14）。  
  ほかの違いはすべて失敗とする。
- ファイルごとの網羅（文・分岐・関数、%）:

| ファイル | 文 | 分岐 | 関数 |
| --- | --: | --: | --: |
| `schedule.ts` | 95.8 | 90.6 | 100 |
| `schedule-layout.ts` | 97.0 | 93.3 | 99.2 |
| `schedule-geometry.ts` | 97.2 | 94.0 | 100 |
| `item-hit-area.ts` | 97.7 | 95.7 | 100 |
| `json-codec.ts` | 97.3 | 95.2 | 100 |
| `mspdi-codec.ts` | 94.6 | 85.4 | 100 |
| `frame-loop.ts` | 92.7 | 86.0 | 100 |

`schedule-layout.ts` の関数が 100 に届かないのは `DayReader.walk` で、どこからも呼ばれない。

⭐ 照合器は、次の 2 つの投げを「保つべき振る舞い」として記録する（割る波はこれを直さない）。

- F-1: 見本 `sample-schedule/Three-Year Product Plan.json` を、その文書自身の設定で置いて `fitZoom` を呼ぶと `TypeError` が投げられる。  
  `contentWidth` が `NaN` になり、`widthFittedRun` の `pool.find(...)!`（`c48f9736` の `schedule-layout.ts:1396`）が `undefined` を返し、`:1462` の `landed.fitted.run` で落ちる。  
  ⇒ 台帳の `DFC-969`（仮説 —— 実物のアプリで反証してから直す）。
- F-2: 宿主が持ち主 `'resource'` を送ると `spendFieldCommit` が投げる。  
  `'resource'` は `PropertyFieldKey` の持ち主ではないので、型のある宿主は送れない。  
  ⇒ 本節に記録するだけで、台帳には起こさない。
