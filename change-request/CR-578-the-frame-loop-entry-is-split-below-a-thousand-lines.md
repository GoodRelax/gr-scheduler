# CR-578 — `frame-loop.ts` の入口を、1,000 行以下になるまで変更の理由で割る

> 状態: **起草（2026-09-26）。⛔ draft: unit table waits for the duplicate survey; not yet shown to the user.**
> ⛔ **ユニットの表（4 節）は仮である。** 利用者の依頼で、`src/` 全体の重複した関数の調査が別のセッションで走っている（調整役の通知、2026-09-26）。その調査が本ファイルに属する重複の組を返すまで、表は確定させず、利用者にも了承を求めない。重複の組は、2 つの写しのまま移さず、本書の中で 1 つにまとめる。
> ⛔ **調整役の指示（2026-09-26）で、本書は起草の途中で止めた。** 計画は後で練り直す。止めた時点の測りの材料は 12 節にある。
> 読んだ木: `d65097b9`（ブランチ `refactor` の先端）。行番号・数・参照は、すべてこの木で測った。
> ID の帯: 調整役から `CR-578`、`JDG-680`〜`JDG-689`、`DFC-1030`〜`DFC-1039` を受けた。`CR-579` は `input-command-translator.ts` の分割の CR であり、本書は使わない。`CR-580` は `mspdi-codec.ts` の分割に予定されている。
> 本書が使う裁定: `JDG-680`（`JDG-440` を覆す）・`JDG-695`（ファイルの大きさの上限。調整役が本書に持たせた番号）。
>
> ⛔ **本書は起草だけである。** `src/`・`tests/`・`docs/spec/`・基準線は、本書を当てる波が書き換える。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⚠️ **直に前へ進めるものは無い。利用者が画面で気づく変化は 0 である**（`CR-554` の 0 節 ① と同じ答え）。
表 T-054 の `CH-1` 〜 `CH-6` のどれにも、`GL-001` 〜 `GL-008` のどれにも直には結ばない。作り方の側の手入れである。
間接の結びは利用者の目的「目的はとにかく変更に強くすること。」（`CR-432` の 4.1 に逐語）と、`JDG-695`（1,000 行を超える手書きのファイルは割る）である。

### ② レビュー観点のどの条項を当て、何が出たか

- `R2.1`（命名・品詞）—— 依頼の例の名のうち、`InputHandler`（曖昧な動詞 `handle`）・`FileFlowManager`（役割だけの `Manager`）・`DocumentCommander`（何を命じるかを言わない）は、07 の R2 の「品詞の規約」と「レイヤー別のコンポーネント・クラス名」の表が退ける形である。`Framework` の層は名詞句で、中身を言う名にする（4 節の仮の名）。
- `R2.2`・`R2.2a`・`R2.2b` —— 表 T-075 の `UF-48` の欄は、自らの ⚠️ の文で「セッションを 1 段進めることとフレームを計算して配ることが 1 つの周期に残る」と `R2.2a`・`R2.2b` を満たさないと書く。本書はその借りを返す。
- ⚠️ 共変（`CR-432` の 4.1 の S2）—— 残る塊どうしは 0.62〜0.75 で共に変わってきた（3 節）。`JDG-548` は「名が体を表すことを、縁の共変の数より先に置く」と定め、`JDG-695` は大きさで割ることを求める。⇒ 本書は S2 の拒みを、継ぎ目を捨てる理由ではなく、**継ぎ目の置き場を選ぶ物差し**として使う（共変の低い所で切る）。この読みは利用者に確かめる（11 節の問い 2）。

### ③ 利用者に問わずに決めたこと

- `JDG-440` の扱い —— 利用者に問うた（`JDG-680`）。
- 着手の順 —— 調整役の割り当てを測りで確かめた（9 節）。

---

## 1. 開いた経緯

- `JDG-440`（2026-09-23）: 「推奨は A（入れない。割ったあとで入口を開く頻度を測り、多ければ別の変更要求にする<br>とせよ。」 —— `frameLoop` の残り（約 1,460 行）は段 7.5 で作り変えない、とした。
- `CR-554` の分割（`d69cb288`、2026-09-25）のあと、`frame-loop.ts` を開いたコミットは 5 件（`git log --format=%h d69cb288.. -- src/framework/single-html-shell/frame-loop.ts`）: `CR-568` の W1〜W3（3 件、`JDG-549` の予定の持ち出し）・`CR-565` の wave 1c（`a59062b8`、通知の理由の台帳に 1 項）・`CR-570` の waves 2-3（`879e9ff2`、`treeState`）。
- 控えている変更要求 16 本のうち 12 本が、本文で `frame-loop.ts` を名指す（`grep -c frame-loop change-request/CR-5xx-*.md`、2026-09-26）。
- ⭐ **`JDG-680`（利用者 2026-09-26、逐語）**: 「裁定を覆して、仕切り直そうか。 他のセッションでも分割を進めているので。」 —— `JDG-440` は覆された。本書は `frameLoop` の閉包を割ること（`CR-554` の 10 節の案 B・案 C に当たるもの）を計画に入れてよい。
- ⭐ **`JDG-695`（利用者 2026-09-26、調整役の案 B への答え、逐語）**: 「提案通りでOK。」 —— 案 B の中身（調整役の中継）:
  - 手書きの行が 1,000 を超える `src` のファイル（`<generated>` の区画を除く）は、割らねばならない（MUST）。
  - 501〜1,000 行のファイルは、レビューが責務を 2 つ以上見つけたときだけ割る。
  - 新しい検査が、どのファイルも再び 1,000 を超えないように止める（5 節の検査 FS）。

## 2. 読んで確かめた事実（`d65097b9`）

### 2.1 大きさ

| 項目 | 値 | 測り方 |
| --- | --- | --- |
| `frame-loop.ts` | 全 2,767 行 ／ 手書き 2,735 ／ 生成 32（`:2736-2767`、表 T-206） | `awk` で `<generated>` の区画を除いて数えた |
| 冒頭のコメント・取り込み・出し直し | `:1-202` | 最後の出し直しの行 |
| 閉包の外の頂上の宣言 | `:204-1303`、165 文（`const` 79・`function` 56・`type` 12・`interface` 11・出し直し 7） | babel の AST |
| 閉包 `frameLoop` | `:1305-2734`、**1,430 行・分岐 4**。`let` 20・関数でない `const` 19・内側の関数 44・返す面の項 15 | babel の AST。検査 60 の `function-size.mjs` も 1,430/4 |
| 手書きで 1,000 行を超える `src` のファイル | `frame-loop.ts` 2,735 ／ `input-command-translator.ts` 1,338（`CR-579`）／ `mspdi-codec.ts` 1,324（`CR-580`）の **3 本だけ** | `git ls-files 'src/*.ts'` の全ファイルを同じ `awk` で数えた |
| 1,000 の手前 | `dom-screen-surface.ts` 991 ・ `item-hit-area.ts` 963 ・ `import-document.ts` 922 ・ `document-file-flow.ts` 852 | 同上 |

⇒ **本書の出口の条件**: 入口 `frame-loop.ts` の手書きが 1,000 以下（後の変更要求の余地に 850 前後を目指す）、かつ兄弟のどれも 1,000 を超えない（`document-file-flow.ts` は既に 852）。

### 2.2 残っている責務（閉包の塊）

測り方: 閉包の項・`let`・参照を節とする図に Louvain（50 種、`session`・`values`・`held`・`environment`・`sendToSession`・`ask`・`raiseNotice` の拠点を除く）を掛け、最頻の分け方（50 中 28、モジュラリティ 0.52）を採った。行は閉包の項の行 ＋ その塊に属する頂上の宣言の行（コメントと空行は含まない）。

| 符号 | 責務 | 閉包 ＋ 頂上 | 自分だけの `let` | 表・要求 |
| --- | --- | --- | --- | --- |
| IN | 入力の受け取りと段の消費（`receiveInput` 149・`answerSettledEntry` 84・`owesFrame` 27、通知の段、`Esc` の段） | 320 ＋ 170 | 無し | `FT-1`・表 T-283・表 T-109・`NFR-010` |
| ACT | 命令の実行と押しの状態（`carryOutAction` 176・`collectInputContext` 41・押しの終わり・押し続け） | 272 ＋ 37 | 無し | 表 T-036・表 T-289 |
| DOC | 文書の書き込み・差し替え・履歴の門（`writeDocument`・`replaceHeldDocument`） | 117 ＋ 24 | 無し | `WS-2`・`WS-6`・`WS-7`・表 T-230 |
| FRAME | フレームの走行と読み（`runFrame` 122・`ask`・寸法） | 152 ＋ 153 | `stackSafetyCapToldFor` | 表 T-078・`NFR-002` |
| SEAM | 渡す継ぎ目 —— `holder`/`audience`、書き出しの絵（`exportScene` 84）、`Agent API` の `snapshotSource`・`dialogueSeams` | 182 ＋ 19 | `watermarkStampedAt` | `FR-080`・表 T-296 |
| PANEL | プロパティパネルの追従 | 41 ＋ 34 | 無し | `FR-072`・`FR-052` |
| AGEN | `Agent API` の有効の記憶 | 11 ＋ 3 | `agentApiEnablingWatch` | `FR-065`・`S-99b` |
| FILE | ファイルの流れの手と語彙 | 20 ＋ 61 | 無し | 表 T-290・`FR-100` |
| FULL | 全画面表示 | 17 ＋ 6 | 無し | `FR-071` |
| NOTE | 通知の理由の台帳（表 T-233）と通知を上げること | 7 ＋ 208 | 無し | 表 T-233・`NT-3` |
| KERN | `sendToSession`・`effectRunners`・手の束・兄弟の工場の生成 | 84 ＋ 167 | 無し | `SF-6`・`SF-7`・`UF-123` |

⚠️ **20 の `let` のうち 1 つの塊だけに属するのは 3 つ**。ポインタの `let`（`pointerAt`・`partUnderPointer`・`grabUnderPointer` —— IN が書き FRAME が読む）、押しの `let`（`pressed` —— IN と ACT が書き FRAME が読む）、パレットの `let`（ACT と KERN が書く）が、IN・ACT・FRAME を結ぶ。

### 2.3 依頼の例の 5 つが、いまどこにあるか

| 例 | いま | 判定 |
| --- | --- | --- |
| ① InputHandler（入力の翻訳と身振り） | IN ＋ ACT で約 800 行が入口に残る。翻訳そのもの（`commandFromInput` ほか）は `src/adapter/input-command-translator/` にある。身振りの一部は兄弟（`pointer-shape.ts` 372・`held-press-preview.ts` 186・`field-entry.ts` 183・`frame-clock-wakes.ts` 124・`copy-and-paste.ts` 120） | **入口に残る最大の塊** |
| ② DocumentCommander（文書の変更・履歴・差し替え） | DOC ＋ `holder`/`audience` ＋ 取り消しの 2 腕で約 185 行。規則は `src/use-case/apply-document-change/` にある | **薄い門として残る** |
| ③ FileFlowManager（ファイルの入出力） | `document-file-flow.ts`（852 行、`UF-165`）へほぼ出た。残りは手と語彙と振り分けの腕で約 146 行 | **ほぼ出た** |
| ④ AgentApiAdapter（外への面） | 継ぎ目の実装 62 行だけ。端点は `src/adapter/agent-api-endpoint/`（3 ファイル・851 行）。⚠️ `MCP` のコードは `src` に 0 件（`grep -ril mcp src`） | **継ぎ目の宣言だけ** |
| ⑤ FrameRenderer（描く流れと計算） | FRAME ＋ `exportScene` ＋ `watermarkNow` で約 394 行。計算は `Entity`/`Adapter`（`layoutFromSchedule`・`svgFromSchedule` ほか）にある | **入口に残る** |

## 3. 共変（`CR-432` の 4.1 の物差し）

測り方: 各コミットの `git diff -U0` のコードの行（コメントだけの変更 22 件と誕生 3 件を除く）を、その版の構文木で持ち主の項へ写し、今の名で塊へ写した。数 ＝ 両方に触れたコミット ÷ 小さい側のコミット。直近のコードを変えたコミット 80 件で数えた。

| 組 | 数 | S2 |
| --- | --- | --- |
| IN 〜 FRAME | **0.75（28 中 21）** | 拒む |
| ACT 〜 DOC | 0.67 | 拒む |
| FRAME 〜 SEAM | 0.65 | 拒む |
| IN 〜 ACT | 0.62 | 拒む |
| DOC 〜 SEAM | 0.62 | 拒む |
| PANEL 〜 IN ／ PANEL 〜 ACT | 1.00（7 中 7） | 拒む |
| 書き出しの絵（`exportScene`・`watermarkNow`）〜 FRAME | 0.85（13 中 11） | 拒む |
| `Agent API` の継ぎ目 〜 DOC | 0.75（12 中 9） | 拒む |
| NOTE 〜 5 件以上のどの塊 | 0.14〜0.38 | 立つ |
| FILE 〜 ACT ／ FILE 〜 DOC | 0.40 ／ 0.47 | 立つ |

⇒ **S2 だけで割れるのは NOTE（約 215 行）と FILE の残り（約 80〜146 行）だけ**で、入口は約 2,400 行残る —— `JDG-695` を満たせない。
⇒ 本書は、拒まれる継ぎ目でも割る。置き場は、共変の低い順に切る（書き出しの絵は FRAME と、パネルの追従は入口と、`Agent API` の継ぎ目は入口と共に置く）。

## 4. 仮の割り方（⛔ 重複の調査を待つ。利用者にまだ見せていない）

⭐ 形は `CR-554` の 4.1 の 2 つだけ: **(F)** 閉包の値を手の束で受ける頂上の関数、**(M)** 自分の `let` だけを持つ小さな工場。
⭐ `let` は、それを書くユニットが (M) で持つ。ほかのユニットは手の束の読み手で読み、書くときは持ち主の命令の関数を呼ぶ。
⛔ 1 つの可変の状態の記録へ 20 の `let` をまとめる形と、閉包の関数を丸ごと抱える大きな工場は採らない（`CR-554` の 4.1）。ある `let` がこの形で置けないときは、割る体は止まって報告する。

| ユニット（仮の名） | 中身 | 手書きの行（試作） | 名の審査（未了） |
| --- | --- | --- | --- |
| `frame-loop.ts`（`UF-48`、入口） | 継ぎ目の型（`FrameEnvironment`・`FrameLoop`・`ScreenWiring`・`FrameLoopHands` ほか、試験 70〜90 本が取り込む）、`frameLoop` の結線（手の束・工場の生成・`effectRunners`）、`sendToSession`、返す面、`Agent API` の継ぎ目の実装、全画面表示、パネルの追従 | 826 | 責務文は「表 T-078 の契機を受けてセッションを 1 段進め、フレームの 1 周期の部品を 1 度だけ結ぶ」。`R2.2b` の要約になるかを審査する |
| `input-reception.ts`（新） | IN の塊 —— `receiveInput`・`owesFrame`・`answerSettledEntry`・通知の段と確認の答え・`Esc` の段・押しの始まり | 855 | `InputHandler` の代わり。501〜1,000 の帯なので、責務が 1 つであることを `R2.2a` の 5 段で示す要がある |
| `action-carrying.ts`（新） | ACT の塊 —— `carryOutAction`・`collectInputContext`・押しの終わり・押し続け・`isBrowserDefaultStopped` の中身 | 325 | `DocumentCommander` の代わり。「運ぶ」は `carryOutAction` の動詞 |
| `document-write-gate.ts`（新） | DOC の塊 ＋ `holder`/`audience` | 252 | 「門」は `CR-554` の 4.1 の「書き込みの門（`WS-2`・`WS-6`・`WS-7`）」の語 |
| `frame-drawing.ts`（新） | FRAME の塊 ＋ `exportScene`・`watermarkNow` | 546 | `FrameRenderer` の代わり。描くのは `svg-renderer` なので `Renderer` は偽になる。`-drawing` は `dom-screen-surface/*-drawing.ts` と同じ語法。`screen-frame.ts`（`Adapter`）との紛れを審査する |
| `notice-reasons.ts`（新） | NOTE の塊 —— 表 T-233 の台帳と `raiseNotice` | 310 | 名詞句 |
| `command-palette-place.ts`（新、試作の体の案） | パレットの位置の `let` の持ち主 | 34 | 要るかを審査する（`CR-575` がパレットの位置を変える） |
| `document-file-flow.ts`（`UF-165`、既存） | FILE の語彙を受ける | 927 | 501〜1,000 の帯。受けてよいかを審査する |

⚠️ 「試作」の数は、計画の体が止められる前にスクラッチパッドで組んだ試作の木を、同じ `awk` で数えたものである。**型検査・試験・照合器は通していない。** 検査のうち通ったのは `check_layer_rules.py`・`check-component-edges.py`（59）・`check-module-state.py`（61）・`check-repeated-expressions.py`（45、83 → 81）で、赤は検査 55（コメントの密度、`document-write-gate.ts` ほか 2 件増）と検査 60（下の 5.2）だった。⇒ 練り直しで測り直すこと。

### 4.1 `CR-579` との継ぎ目（調整役の中継、逐語 —— 両方の CR に同じ名で書く）

```
Relay from the CR-579 (input-command-translator split) session, the seam with CR-578:
- The single-html-shell folder imports these from the translator entry today:
  - frame-loop.ts {commandFromInput, isCombo, pressRowOf, screenEventFromInput, selectionFromInput, NOT_STORED_ZOOM_STEP, HumanInput, InputAction, InputContext, PointerInput, PointerPress, SpentEntranceSituation}
  - held-press-preview.ts {commandFromInput, InputContext, PointerInput, PointerPress}
  - pointer-shape.ts {PointerPress}
  - row-band-ceiling-cache.ts {rowBandCeilingOf, InputContext}
  - view-place.ts {NOT_STORED_ZOOM_STEP}
  - interaction-record.ts {HumanInput}
  - field-entry.ts {commandFromFieldCommit, HumanInput, InputAction}
- CR-579 keeps every one of these importable from input-command-translator.ts with the same signature (re-exporting if moved). So CR-578 may move those import lines between frame-loop siblings freely.
- CR-579 touches nothing outside src/adapter/input-command-translator/ except its own tools/generate_entity_types.py TARGETS rows.
- Their one ask: CR-578 must not pull translator helpers into frame-loop siblings, and must not copy them.
```

⛔ 本書は、翻訳器の補助を `frame-loop` の兄弟へ引き込まず、写しもしない。

## 5. 検査と基準線

### 5.1 新しい検査 FS（ファイルの大きさのラチェット、`JDG-695`）

> ⚠️ **番号は仮**: 「check FS, number given at merge」。`CR-573` の wave 3b も検査を 1 つ足すので、調整役が併合の順に番号を振って知らせる。

- 数えるもの: `src/` の各 `.ts` の手書きの行（`// <generated -- do not edit by hand>` 〜 `// </generated>` の区画を除く）。
- 規則: 1,000 を超えるファイルは、基準線の行に保たれていなければ赤。保たれたファイルが基準線の数より増えたら赤。減ったら基準線を下げよと告げる（検査 60 と同じラチェット）。
- 基準線の初め: 今日 1,000 を超える 3 本 —— `frame-loop.ts` 2,735・`input-command-translator.ts` 1,338・`mspdi-codec.ts` 1,324。`CR-578`・`CR-579`・`CR-580` が下げ、行を消す。
- 置き場: `.claude/skills/spec-graph-check/` に、検査 60 の `function-size-baseline.txt` と同じ形の基準線ファイルを 1 つ。⛔ 基準線を上げるのは利用者の了承を経る（`JDG-520`）。

### 5.2 検査 60（関数の大きさ）

試作で見えた動き（数は試作の木）:
- `HELD` の鍵が付け替わる 5 行: `carryOutAction`（→ `action-carrying.ts`）・`exportScene`・`runFrame`（→ `frame-drawing.ts`）・`answerSettledEntry`・`receiveInput`（→ `input-reception.ts`）。許容数は変わらない（移すだけ）。
- `frameLoop` 1,440/4 は大きく下がる（練り直しで測る）。
- ⚠️ `CR-554` の学び: (M) の工場はそれぞれ新しい `HELD` の行になりうる。新しい `HELD` の行と許容数の上げは、調整役を通して利用者に問う（`JDG-520`・`JDG-547` の範囲の外）。

### 5.3 ほかの検査

- 検査 59（`components.json`）: `SingleHtmlShell` の外への辺は変わらない（割るのはフォルダの中だけ）。試作で緑。
- 検査 61（モジュールの可変状態）: `src/entity`・`src/use-case`・`src/adapter` だけを読むので、本書の行は 0。
- 検査 55（コメントの密度）: 各兄弟が 10% の内に収まるよう、移すコメントを波ごとに掃除する。
- 検査 45（繰り返しの式）: 手の束の `hands.` の接頭辞が重複を床の上へ押し上げうる（`CR-554` の学び ④）。

## 6. 確かめ方（波ごと）

`CR-554` の 4.1 と `handoff.md` の段 7.5 の「やり方」と同じにする。

1. **照合器（MUST）**: 分割前の木だけを読む**別の体**が照合器を作り、最初の波より先に併合する。比べるのは、宿主への呼び出しの列、フレームの列、送った出来事の列である。ブリーフには「感度を 10 件で測れ（わざと壊して赤になる数）、照合器自身の分岐網羅を報告せよ」を最初から書く。
2. **波ごと**: 照合器でバイト一致（設計どおりの差は入口の公開名が増えることだけ）・`vitest`・`check.sh`・`gen:check`・`tsc` を前に立つ者が回し直してからコミットする。1 波 1 コミット。割る体は同時に 1 体だけ。
3. **宿主への呼び出しの順を変えない（MUST）**: 工場は作る時に宿主に触らない（`CR-554` の 4.1 の順を守る）。評価の順（TDZ）: 兄弟の頂上の `const` の初期化が入口の名を読まないこと。
4. **出口**: dist を作り直し、Playwright・`file://`・1920×1080 で起動、コンソールのエラー 0、描いた図形の数が分割前の dist と同じ。e2e は `GRS_PERF` を付けずに回す。
5. **字で読む試験**: `tests/unit/uf-48-one-input-one-step.test.ts` と `tests/unit/cr-389-fr-071-full-screen-is-asked-of-the-browser.test.ts` は `UF-48` の欄の文を字で読む。`CR-573` は毎フレームの試験の道の一覧に `frame-loop.ts` を持つ —— 移した先の名へ書き換える。

## 7. 仕様への書き換え（練り直しで確定する）

- 表 T-075: `UF-48` の欄を書き直し、新しい兄弟の行を足す（`UF-` の番号は調整役に問う）。
- 表 T-063 の `UT-6`: ファイルの一覧と、変更の理由の文を書き直す。
- `UF-48` の ⚠️ の文（`R2.2a`・`R2.2b` を満たさない）を消す —— 割ったことで借りが返る。

## 8. 台帳へ起こす候補

- `DFC-1030`〜`DFC-1039` の帯は未使用。重複の調査が本ファイルの組を返したら、組ごとに起こす。

## 9. 着手の順

⭐ 調整役の割り当て（仮）: `CR-573`（走行中）と `CR-572` の後、`CR-574`/`575`/`577` と `CR-555`〜`CR-563` の前。`CR-579` はその直後（入口が重なるので並べない）。
測りで確かめた理由: 控えている変更要求が本書の動かす塊に触れる数（各 CR の本文を読んだ体の読み）—— FRAME 5 本（`CR-562`・`571`・`573`・`575`・`576`）、IN 5 本（`CR-561`?・`562`・`574`・`575`・`576`）、ACT 4 本（`CR-560`・`571`・`574`・`575`）、NOTE 2 本（`CR-562`・`571`）。`CR-555`・`CR-557` は `frame-loop.ts` を変えず、`CR-558`・`CR-559` は兄弟の `pointer-shape.ts` だけ。`CR-572` は 0 件。⇒ 先に割れば、多くが割った木に着地する（`CR-554` のときと同じ）。

## 10. ⛔ この変更でやらないこと

- 振る舞いを変えない。利用者が画面で気づく変化は 0。
- 翻訳器（`src/adapter/input-command-translator/`）に触らない（`CR-579` の持ち物）。
- 基準線を体に書き換えさせない。

## 11. 利用者に問うた問い・問う問い

### 問い 1 —— `JDG-440` をどう扱うか（答えた）

⭐ 答え（利用者、2026-09-26、逐語）: 「裁定を覆して、仕切り直そうか。 他のセッションでも分割を進めているので。」 ⇒ `JDG-680`。

### 問い 2 —— 共変が拒む継ぎ目でも割るか（未だ問うていない）

3 節のとおり、S2 だけでは `JDG-695` を満たせない。`JDG-548`（名を共変より先に置く）と `JDG-695` に従い、拒まれる継ぎ目でも割り、共変は置き場を選ぶ物差しとする —— と読んだ。重複の調査の後、最終の表と共に確かめる。

### 問い 3 —— `input-reception.ts` が 855 行（501〜1,000 の帯）になること（未だ問うていない）

`JDG-695` の 2 つ目の文により、レビューが責務を 2 つ見つければさらに割る。`R2.2a` の 5 段の結果と共に示す。

## 12. 止めた時点の材料（練り直す者へ）

- 棚卸し（`frame-loop.ts` の頂上と閉包のすべての項・`let` の読み書き・塊・共変の行列・検査 60/61/59・控えの CR の写像）と、計画の体の試作の木は、本書を起草したセッションのスクラッチパッドにある。⚠️ 木には無い —— 練り直す者は測り直すこと。
- 棚卸しの方法: babel の AST（項の範囲）、`networkx` 3.4.2 の Louvain（50 種）、`git diff -U0` を各版の構文木で持ち主へ写す共変。
