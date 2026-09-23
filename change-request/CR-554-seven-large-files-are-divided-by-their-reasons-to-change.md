# CR-554 — 大きなファイルを調べ、7 本を変更の理由で割る計画（段 7.5）

> ⭐ **状態: 計画（未適用）。2026-09-23 起草。10 節の問い 1 は同じ日に利用者が答えた（案 A）。**
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
| `UF-6` `schedule-geometry.ts` | 10 | 5 | 残る 5 は、コードの無い `FR-020`・`FR-045`（9 節の `DFC-830`）と、継ぎ目を出さない `OW-4` の 3 つ（4.4） |
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
  新しく見つかった結合がある: `fieldCommit` はパネルと文書名が書く 1 つの升で、同じ押しで両方が確定すると後の書き手が勝つ（9 節の `DFC-832` の候補）。
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
`UD-4` により範囲を書けないので、2 つは入口の行に残す。食い違いは 9 節の `DFC-830` の候補とする（利用者の裁定 2026-09-13「食い違いは defects へ、どちらかを選ばない」）。

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
- 欠陥の台帳の候補には `DFC-830` 〜 `DFC-832` を当てる（9 節）。`DFC-833` 〜 `DFC-839` は使わない。
- 新しい表・図・接頭辞・裁定の行は 0 である。

---

## 6. 波 —— 順と、並行してよいもの

### 6.1 ⛔ 入口の条件（MUST）

1. `CR-551` の波 0〜3、`CR-552`（最小描画幅）、`CR-553`（行の縦幅）が、この順に `refactor` に着地していること。
   ⭐ 順は調整役が決めた（2026-09-23）: `CR-551` → `CR-552` → `CR-553` → H2〜H10 → 本書の分割。
   理由: 2 本とも小さな編集であり、先に入れれば分割の照合器の基準が 1 度で定まる。先に割ると、2 本の `file:line` を兄弟のファイル（`UF-132` 〜 `UF-143` ほか）へ引き直させることになる。
   ⚠️ 本書は起草のとき 2 本を知らなかった（`8552a4a7` は本書の木 `a912f4ea` の後に入った）。触る所は 8 節の表に足した。
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

## 9. 台帳へ起こす候補（⛔ 本書は台帳を書かない。当てる手番か前に立つ者が書く）

| 候補 | 何が食い違うか | 測り方 |
| --- | --- | --- |
| `DFC-830` | 表 T-075 の `UF-6`（`schedule-geometry.ts`）が `FR-020`（透かし、`OW-2`）と `FR-045`（期限の印、`OW-2`）を負うが、`src/entity/layout-engine` にそのコードが 0 行である | `git grep -n -i -E "watermark|deadline|FR-020|FR-045" -- src/entity/layout-engine` が 0 件（前に立つ者が測り直した） |
| `DFC-831` | 表 T-075 の `UF-107` の責務の文が古い —— 「入力中かを答え（`IN-5a`）」は改訂後の `IF-9`（知らせ）と合わず、日付の消去（`field-editing.ts:184-197`）の句が無い。その受け手には `// see` も無い | 体が読んだ（`fe-report`）。⚠️ 検査 55 の余裕は 0 行（コード 384 ／ コメント 42、上限 42）⇒ コメントを足すなら `:184-185` の `WHY` 2 行を置き換える形にする |
| `DFC-832` | `field-editing.ts` の `fieldCommit` は、プロパティパネルと文書名の 2 つの欄が書く 1 つの升である。同じ押しで両方が確定すると、後の書き手が勝つ | 体が読んだ（`fe-report`）。⚠️ 仮説である —— 起こす前に、同じ押しで 2 つが確定する道が実際に在るかを反証すること |

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
