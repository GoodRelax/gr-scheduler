# CR-767 —— 状態機械は 1 つの原稿が唯一の正であり、状態遷移表はガードの条件まで、状態遷移図は UML で、どちらもそこから刷る

> 起草の状態: 起草だけ（2026-10-15、`4a907919` の上で起草した）。当てていない —— `docs/spec`・`src`・`tests`・生成器に触れていない。11 節に利用者へ問う 3 つ（Q1 ガードの条件の書き方、Q2 図を描く道具、Q3 兄弟の囲みの代わり）を残した。利用者は眠っており、問うていない。見本は `previous-project-result/57-uml-state-machine-style/`。
> ID の帯: 番号 `CR-765`〜`CR-768`、裁定 `JDG-2220`〜`JDG-2229`、台帳 `DFC-2720`〜`DFC-2729`、`PND-948`〜`PND-951`、見本の置き場 `57` を調整役から受けた（4 つの変更要求で共有）。本書が使うのは `CR-767`・見本 `57`・台帳 `DFC-2720`〜`DFC-2722`（0.1 で見つけた食い違い 3 つ）。`4a907919` の木で `CR-767` を名乗るもの、`previous-project-result/57-*` は 0 件だった（13 節）。
> 当てるもの: 裁定 `JDG-2161`（状態機械は `_source/state-machines.json` を唯一の正とし、表と図はそこから刷る。ガードの条件も JSON が持つ。表は列 ＝ 今の状態・行 ＝ 出来事・交点 ＝ 遷移先とガード条件、要るなら Entry ／ Exit も書く。図は UML に準拠する）。閉じるもの: 台帳 `DFC-2643`・`DFC-2644`。`DFC-2645` の `TASK_GROUP_GUARDS` は本書の後に `CR-768` の C 部が消す。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`4a907919`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| ガードは 65 で、どれも名だけ | 原稿の `guard` の配列の名（`in` の項を除く）を集めて 65。`in` の行き先は別に 8（24 回）。原稿にガードの定義は無い（名と `evidence` だけ）。原稿の `$comment` と契約（`state-machines.schema.json` の `guardTerm`）、5.5 節、表 T-250 の `SD-3`、規則 `07-review-standards.md` の R4.4 の 1 文が「条件はコードが持つ」と言う | 真。5 か所の文を替える（3 節）。規則の文は仕様の外（9 節） |
| 表の向きを変える | 今の刷りは既に行 ＝ 出来事・列 ＝ 葉の状態・升 ＝「→ 先 [ガード名] / 副作用」 | 向きは変えない。升にガードの条件を出し、Entry ／ Exit の行を足す |
| 今の図は UML でない | 31 の Mermaid の図（9 の図 F-026〜F-043 の中）。① 矢印のラベルが出来事のキーだけ ② 3 つ以上の兄弟を 1 つの箱に囲む独自の約束 —— 囲みは状態ではない（`armModeStateMachine` の「notArmed 以外」、`taskGroupGrabStateMachine` の「notGrabbed 以外」）③ 行き先が運ぶ値で決まる升（`→ {armKind}`） | 真。① ③ は刷り方で直る（X-c・X-h）。② は状態の形の問い（Q3） |
| 23 のガードの名は `src` に無い | 真（`DFC-2644`）。23 とも `src` の式の中で同じ判定をしている。9 つの契約試験の `guardHolds` が 65 すべてを試験の側に書き直している —— 65 を名で式として持つ所は試験だけ | コードにガードごとの名の判定を 1 つずつ置く（X-k） |
| ガードは条件を言える | 65 のうち 40 は名で言い切れ、24 はコードを読んで書き、1 は名と語が食い違う（`isRungSurface`）。9 は出来事が運ぶ真偽の値をそのまま読む（条件は呼び手が作る）。2 は今の `in` の項で書ける（`isPanelTopmost`・`canEnterDualCursor`）。2 は同じ 1 段で別の機械が出る次の状態を読む（`isLeavingDocumentSettings`・`isLeavingHolidaySettings`、19 升） | 付録 A に 65 の下書き（言葉と式）。書き方は Q1 |
| 式の形で書ける | 簡単な式の文法（出来事の運ぶ値・状態の運ぶ値・`in(...)`・比較・`&&`・`||`・`!`・`.length`）に 51 が入る。14 は名の付いた関数（`ancestors()`・`children()`、表 T-233 を引く、`WC-10` の断り、次の状態）が要る | Q1 の択 B の費用 |
| Entry ／ Exit は要る | 原稿に Entry ／ Exit の鍵は無い。ある状態へ入る（出る）遷移が 2 本以上あり、どれも同じ副作用を持つのは 31 の機械の 4 つの状態だけ（`dualCursorModeStateMachine.on` の出、`scaleMessageDisplayStateMachine.shown`・`fileOperationStateMachine.readingDocumentFile`・`importingDocument` の入）。⭐ `on` から出る `guideCursorEntryPressed` は、コードでは副作用を 2 つ起こすが（`storeClearedDualCursor` と `storeGuideCursorMode`、`screen-values.ts` の 898〜909 行の `onGuideCursorEntryPressed`）、原稿の升は 1 つしか持てない | 4 つを Entry ／ Exit にする（X-f）。2 つ目の副作用は `DFC-2721` |
| 名と語が合う | `isRungSurface` —— 表 T-283 は `RG-3`（開いている面）と `RG-14`（プロパティパネル）を別の段とし、`EscapeTarget` も 2 つの語を持つが、シェル（`frame-loop.ts` の 776・783 行、`ESCAPE_RUNG_EVENTS`）は両方に `surface` の語を送り、原稿のパネルの升は `isRungSurface & isPanelTopmost` と書く | 食い違い —— `DFC-2720` |
| 試験はガードの名に合う | `tests/contract/state-machine-file-flow.contract.test.ts` の 242 行が `hasStartupTemplate` を扱うが、その名は原稿にもコードにも無い | 古い試験の枝 —— `DFC-2722` |
| 図の道具は在る | drawio-uml の技能は利用者の技能の置き場に在り、`docs/spec/_source/build.py` が既に使う（部品の図）。draw.io は 30.0.4、Graphviz の `dot` は 13.1.2。⚠️ `build.py` の `--check` は図を作り直さない —— 古い図でも緑になる（「`.drawio` には Graphviz、`.svg` には draw.io が要る」） | 図と原稿の食い違いを、描かずに確かめる道が要る（X-m、Q2） |

### 0.2 裁定の鎖（`rulings.md` を「`state-machines.json`」「状態遷移図」「状態遷移表」「ガード」「Mermaid」「drawio」「`SD-3`」「Entry」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-286` | 状態機械ごとに図と表を組にする。行 ＝ 出来事、列 ＝ 今の状態、交点 ＝ 次の状態と処理、変化なしは「—」。通し番号を振らず名を識別子にする（規則 07 の R4.4 を書いた） | 守る。⚠️ R4.4 の「ガードと処理は、表には名前だけを書き、中身はコードが持つ」は `JDG-2161` が覆す（ガードの条件の部分） |
| `JDG-594`・`JDG-599` | タスクグループの木の状態遷移を網羅的に書く（`CR-570`） | 変えない |
| `JDG-2071` | 仕様書が唯一の正 | 本書の起こり |
| `JDG-2161` | 3 つの決め（JSON が唯一の正、表の向きと条件、UML の図）と、言葉か式かを当てる変更要求が案を示して問うこと | 本書そのもの。Q1 |
| `JDG-850`・`JDG-1612` ほか（「ガード」で引いた行） | 個々の振る舞い | 変えない —— 本書は升の行き先を 1 つも変えない（Q3 の択 A を除き、状態も変えない） |

覆す裁定: `JDG-286` の一部（R4.4 のガードの文）—— `JDG-2161` が既に覆した。本書はその着地である。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-4`（`GL-006`、説明を読まずに操作できるようにする）—— 状態機械は画面の振る舞いの正である。ガードが名だけだと、仕様だけを読む試験の体が「いつ動くか」をコードから取るしかなく、仕様と画面の振る舞いが黙ってずれる（`DFC-2644` の 23）。
- 画面は変わらない（Q3 の択 A でも、状態を 1 つ足すのは形の上だけで、振る舞いは同じ）。

### ② レビュー観点のどの条項を当て、何が出たか

- `R4.4`（状態機械 —— 図と表を組にし、1 つの原稿から生成する。交点に `—`）—— 守る。⚠️ 同じ条の「ガードは名前だけ」は `JDG-2161` が覆す（9 節）。
- `R1.3`（唯一の正）—— 図と表と型が 1 つの原稿から出る形は今も同じ。食い違いうるのは「描いた図」（0.1 の最後の行）—— 図の元の値の指紋で止める（X-m）。
- `R1.2`（検証できる表現）—— 9 つの出来事の運ぶ真偽の値は、条件を言わずに「真なら」と言う。条件は運ぶ値の注（`SD-2`）に書く（X-i）。
- `R2.21`（1 つの仕事は 1 か所）—— 65 の判定を、コードはガードごとに 1 つの名の判定に持つ（X-k）。試験の `guardHolds` は原稿を読む（X-l）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 原稿 `state-machines.json` に、領域ごとの「ガード」の区（名・条件・根拠の行）と、状態ごとの任意の `entry` ／ `exit`（副作用の名・引数・根拠の行）を足す。契約 `state-machines.schema.json` を先に替える（今は追加の鍵を許さない） | `JDG-2161` | 原稿を読む試験 25 ほどの型（`Guard` ほか）が動く |
| X-b | 表の升は「→ 先 [条件] / 副作用」。条件は Q1 の形で刷る。どのガードにも当たらないときの「それ以外 → —」、升の無い組の「—」は今のまま。Entry ／ Exit を持つ機械は、出来事の行の上に `entry` ／ `exit` の行を置く | `JDG-2161`・`JDG-286` | Q1 が式なら升が広くなる |
| X-c | 図は同じ 2 つの状態を結ぶ遷移を 1 本の矢印にまとめ、1 行に 1 つの遷移を「出来事 [ガード] / 副作用」と並べる | UML の遷移のラベルの形。1 本ずつ描くと木の機械で 43 本になる（見本 57 の 2 節は 19 本） | — |
| X-d | 図のラベルのガードは**名**で書き、条件は表と、領域ごとのガードの一覧で引く | UML のガードは真偽の式であり、名の付いた判定もその式である。見本 57 で 1 行の最長は名 67 字・言葉 88 字・式 108 字、長いほど配置がラベルを重ねる | 図だけでは条件が読めない（隣の表で読む） |
| X-e | ガードの一覧は、領域の節の中に表の番号を持たない表として刷る（名・条件・根拠） | R4.4「定義は表の近くに置く。巨大な一覧に分けてはならない」。表の番号を増やさない | — |
| X-f | Entry ／ Exit は、0.1 で測った 4 つの状態に当てる —— `dualCursorModeStateMachine.on` の `exit / storeClearedDualCursor`、`scaleMessageDisplayStateMachine.shown` の `entry / startScaleMessageTimer`、`fileOperationStateMachine.readingDocumentFile` の `entry / readDocumentFile`、`importingDocument` の `entry / importIncomingDocument`。自己への遷移（「→ 自己」）は内部の遷移とし、Entry ／ Exit を起こさない | 裁定の「必要なら」。⭐ `on` の出を exit にすると、`guideCursorEntryPressed` の升に 2 つ目の副作用 `storeGuideCursorMode` を書く場所が空く（`DFC-2721`） | コードの振る舞いは同じ（副作用を起こす順は UML の順 —— 出 → 遷移 → 入 —— と照らす。違えば `DFC-` の行） |
| X-g | 同じ 1 段で別の機械が出る次の状態を読む 2 つのガード（19 升）は、ガードのまま残し、条件を「この 1 段で `openSurfaceStateMachine` が `documentSettingsDisplayed` から出る」の形で書く | Exit にすると、別の機械の遷移の副作用を持ち主の違う状態へ移すことになり、`SD-3` の 1 段の形（`SF-2`）が変わる | 2 つのガードは名の付いた関数（次の状態）を要る |
| X-h | 行き先が運ぶ値で決まる升（`→ {armKind}`）は、図では選択の擬似状態 ◇ と、値ごとの枝「[armKind = …]」で描く。原稿の升は変えない | UML の選択の擬似状態。見本 57 の 5 節 | 刷り手が運ぶ値の取りうる状態を知る（`carries` の注から） |
| X-i | 出来事が運ぶ真偽の値をそのまま読む 9 つのガード（`hasDaysToPlace`・`hasNoSurfaceOrConfirmation`・`hasNoUnsettledEntry` ほか）は、条件を出来事の運ぶ値の注（`SD-2`）に書き、ガードの条件は「出来事の `x` が真」とする | 条件を作るのは呼び手（シェル・翻訳器）であり、升ではない | — |
| X-j | 今の `in` の項で書ける 2 つ（`isPanelTopmost` ＝ `openSurfaceStateMachine.closed` に居る、`canEnterDualCursor` ＝ `dualCursorModeStateMachine.off` に居る ＆ `hasDaysToPlace`）は、`in` の項に置き替えてガードを消す —— 当てる体が契約試験で等しいことを確かめてから | ガードの数を減らす。`canEnterDualCursor` は `src` に名が無い 23 の 1 つ | 65 → 63 |
| X-k | コードは、領域の単位（`screen-values.ts` ほか 8 と `task-group-folding.ts`）に、ガードごとに名の同じ判定を 1 つ置き、遷移の関数はそれを呼ぶ。生成器が領域ごとのガードの名の和の型を刷り、判定の表をその型で引く（名の足し・抜けを `tsc` が止める）。⭐ Q1 が択 B なら、判定の本体も式から生成する（波 3） | `DFC-2644` の対応案「コードの判定の名をガードの名にそろえるかは、条件の書き方が決まってから」—— どちらの書き方でも名はそろえる | 8 つの領域の遷移の関数が動く（振る舞いは同じ） |
| X-l | 9 つの契約試験の `guardHolds` は、原稿のガードの名の全数と等しいことを確かめる（名が合わなければ止まる）。Q1 が択 B なら、試験は式を評価して `guardHolds` を消す | 試験だけが 65 を式で持つ形をやめる | — |
| X-m | 図の置き場: 機械ごとに `docs/spec/_assets/fig-sm-<機械>.svg`（31）。刷り手は機械ごとの図の元（Q2 の道具が読む値）を作り、その指紋を SVG に書き込む。`--check` は描かずに、原稿から作った元の指紋と SVG の指紋を比べる | `build.py` の弱さ（古い図でも緑）を繰り返さない —— 利用者が嫌う「図と表のどちらが正か分からない」を機械で止める | 図を描き直すには Q2 の道具が要る（調整役の機械には在る） |
| X-n | 図 F-026〜F-043 の番号と表 T-280〜T-328 の番号は変えない。図の節の注（「矢印のラベルは出来事のキーだけ」「図は畳んである」）を UML の約束の注に替える | 番号を動かさない | — |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| ガード | 名だけ（条件はコードと試験） | 原稿が条件を持ち（Q1 の形）、表の升と領域ごとの一覧に刷る |
| 表 | 行 ＝ 出来事・列 ＝ 葉の状態・升 ＝「→ 先 [ガード名] / 副作用」 | 同じ向き。升はガードの条件。Entry ／ Exit の行（4 つの状態） |
| 図 | Mermaid、ラベルは出来事のキー、兄弟の囲み、`{armKind}` | UML（Q2 の道具）—— 「出来事 [ガード] / 副作用」、◇、Entry ／ Exit、複合状態（Q3） |
| 図と原稿の一致 | 生成の文字の一致（Mermaid は刷り手が書く） | 図の元の指紋の一致（X-m） |
| コードのガード | 42 は名の判定、23 は式の中 | 63 すべてが名の判定（X-j で 2 つ減る） |
| 画面 | — | 変わらない |

---

## 2. 新しい識別子

| 何か | 置き場 | 番号 |
|---|---|---|
| 状態（Q3 の択 A のとき） | `state-machines.json` の `armModeStateMachine` と `taskGroupGrabStateMachine` | 名 `armed`・`grabbed`（仮。R4.4 の名の規約 —— 過去分詞・形容詞） |
| 台帳の行 | `docs/development-records/defects.md` | `DFC-2720`（`isRungSurface`）・`DFC-2721`（2 つ目の副作用）・`DFC-2722`（古い試験の枝）—— 本書の起草と同じコミットで足した |

表・接頭辞・要求・図の番号は増えない。図の SVG のファイルが 31 増える。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `05-07-design.md` の 5.5 節「実装の都合の細部は状態の種類を増やさず、状態が運ぶ値としてコードが持つ。」 | X-1 |
| 同「原稿から、領域ごとの出来事の定義・優先順の表と、状態機械ごとの状態遷移図・状態遷移表・状態の一覧を生成し、」 | X-1 |
| 表 T-250 の `SD-3` の「持つもの」の「ガード（名前、またはほかの状態機械がいる状態）」と「持たないもの」の「ガードの条件式と副作用の中身（コードが持つ）。」 | X-2 |
| 表 T-250 の `SD-1` の「持つもの」（Entry ／ Exit が無い） | X-2 |
| `state-machines.json` の `$comment` 7 行目「Guard expressions and effect bodies are NOT here -- the code holds them (SD-3).」と契約の `guardTerm` の説明「its expression is the code's」 | X-3 |
| `tbl-state-machines.md` の 9 つの図の節の注「矢印のラベルは出来事のキーだけであり、ガード・副作用は同じ節の状態遷移表が持つ。」「⚠️ 図は畳んである —— …」と 31 の Mermaid の図 | X-4（刷り手が刷る —— 手で書かない） |
| 升の `isPanelTopmost`・`canEnterDualCursor`（X-j） | `in` の項 |

---

## 4. 書き直す所

### X-1 —— 5.5 節（`05-07-design.md`）

```
保存しない状態の状態機械（5.6 の ADR-002）の原稿は `_source/state-machines.json` であり、状態機械の唯一の正である。
原稿から、領域ごとの出来事の定義・優先順の表・ガードの一覧と、状態機械ごとの状態遷移図（UML）・状態遷移表・状態の一覧を生成し、TypeScript の判別共用体と初期値とガードの名を生成する。
⭐ 図と表を手で直してはならない（MUST NOT） —— 2 つが別々に直されると、どちらが正か分からなくなる（利用者が定めた）。
…（遷移表の定数の文は今のまま）…
手で書くのは各領域の遷移の関数と、ガードごとの判定の本体だけである（Q1 が式なら判定の本体も生成する）。
原稿に載せるのは、要求が名指す状態・出来事・遷移だけとする（MUST）。
ガードの条件は原稿が持ち、コードはガードの名の判定でそれに従う。実装の都合の細部は状態の種類を増やさず、状態が運ぶ値としてコードが持つ。
```

### X-2 —— 表 T-250

```
| SD-1 | 状態 | 状態機械の中のキー（名は `状態機械.キー`）、親（入れ子）、初期状態か、運ぶ値の名前、入るとき・出るときの副作用（entry ／ exit）、根拠の行 | 既定値と上下限（表 T-206 が持ち、`S-` 行を指すだけ） |
| SD-3 | 状態遷移表 | 状態機械ごとに、出来事 × いまの状態 の升。<br>升は先の状態（同じ状態機械の状態）、ガード（名前、またはほかの状態機械がいる状態）、副作用の名前と引数、根拠の行を持つ。<br>ガードの条件は領域のガードの一覧が持ち、升はその条件を刷る。<br>升の無い組は変化なし（同じ参照）である | 副作用の中身（コードが持つ）。<br>⭐ 表と関数のずれは、領域ごとの契約試験（すべての状態と出来事の組で先の状態の種類が表と一致し、表に無い組では同じ参照を返す）が止める |
```

### X-3 —— 原稿の `$comment` と契約

`$comment` の 7 行目を「Guard conditions are here (each region's guards); effect bodies are NOT -- the code holds them (SD-3).」に替える。契約に `guards`（領域）と `entry` ／ `exit`（状態）を足し、`guardTerm` の説明を「the name of a guard of this region's guard list」に替える。

### X-4 —— 刷り手 `state_machines_json_to_md.py`

- 升の条件（X-b）、Entry ／ Exit の行、領域ごとのガードの一覧（X-e）。
- 図: Mermaid をやめ、機械ごとに図の元（Q2 の道具が読む値）を作って指紋を取り、`fig-sm-<機械>.svg` を指す。図の節の注を次に替える:

```
状態機械ごとに 1 つの図に分け、その状態機械の節に置く。状態機械どうしは直交する。
図は UML の状態機械図である —— 矢印のラベルは「出来事 [ガード] / 副作用」、同じ 2 つの状態を結ぶ遷移は 1 本の矢印に 1 行ずつ並べる。ガードは名で書き、条件は同じ節のガードの一覧が持つ。
行き先が運ぶ値で決まる升は選択の擬似状態（◇）で分ける。
⭐ 遷移の全数は 表 T-nnn の状態遷移表が持つ。図と表はどちらも原稿から刷る。
```

### 4.1 生成物

当てる体が `npm run gen` で `docs/spec/_assets/tbl-state-machines.md`・31 の `docs/spec/_assets/fig-sm-*.svg`（Q2 の道具で描く）・9 つの領域の生成の領域（ガードの名の和の型）・`docs/development-records/test-inventory.md` を刷り直す。`strictdoc export docs/spec`（`rm -rf output`）。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えるもの |
|---|---|
| `docs/spec/_source/state-machines.json`・`.schema.json` | X-a・X-3・X-f・X-j、65（→ 63）のガードの条件（付録 A の下書きを、1 つずつ要求と照らして書く） |
| `docs/spec/_source/state_machines_json_to_md.py` | X-4。⚠️ 1047 行の刷り手。図の部分は別の小さな刷り手へ出してよい（07 R2） |
| `tools/generate_state_machine_types.py` | 領域ごとのガードの名の和の型（X-k） |
| 図の刷り手（Q2 の択 A なら drawio-uml を呼ぶ、名は当てる体） | 31 の図、指紋。見本 57 で要った 3 つの手当て（ラベルの改行・複合状態の実線・凡例を消す）を持つ |
| `src/use-case/advance-screen-session/` の 8 つの `*-values.ts` と `task-group-folding.ts` | ガードごとの名の判定（X-k）。23 の名が `src` に現れる |
| `src/framework/single-html-shell/frame-loop.ts` | `DFC-2720` の答えによる（`ESCAPE_RUNG_EVENTS`） |
| 9 つの契約試験と、原稿・刷った表を読む試験（30 ほど） | X-l。刷った表の文字を読む 16 の試験は、升の形が変わるので直す |
| `.claude/skills/spec-graph-check/check-provenance.py` | 図の SVG の元が原稿であることの組を足す |
| `docs/development-rules/07-review-standards.md` | R4.4 の「ガードと処理は、表には名前だけを書き、中身（条件式・処理の本体）はコードが持つ。」を 9 節の案の文に替える（調整役の答え、2026-10-15）。波 1 で、原稿の文（X-1〜X-3）と同じ巡に当てる |

試験（仕様だけを読む別の体が書く —— 規則 04）:

- 領域ごとに、原稿のガードの一覧の名の全数と、コードの判定の名の全数が等しいこと。ガードごとに、一覧の条件が真になる場面と偽になる場面を 1 つずつ組み、遷移の関数の先の状態が表の升と等しいこと（今の契約試験の網羅を、条件を読んで組む形にする）。
- Entry ／ Exit の 4 つの状態で、入る（出る）どの遷移でも副作用が 1 度だけ起きること。

毎フレームの経路（規則 04 の 5 節）: ガードの判定は 1 段ごとに呼ばれる —— 名の判定へ移すだけで数は変わらない見込み。Q1 が択 B で判定を式から生成するなら、`perf-pending` の行が要る（番号は調整役から）。

---

## 6. グラフ（`impact.py`・`induced.py`、`4a907919`）

- 誘導部分グラフ（21 対象: `T-250`・`SD-1`〜`SD-5`・`T-249`・`T-280`・`T-286`・`T-289`・`T-290`・`T-292`・`T-293`・`T-295`・`T-296`・`T-328`・`T-283`・`RG-3`・`RG-14`・`RG-7`・`IN-4`）: 21 の種がすべて解決、辺 7、閉路 0 ⇒ 1 つずつ書いてよい。
- 届く所: 表 T-250 を指す要求は 0（表が浮いている —— 5.2・5.3・5.5・5.6 の節と `tbl-verification.md` から 8 か所）。刷った 9 つの表（T-280 ほか）は、要求の行から升の行 ID（`HF-`・`HR-`・`IC-`）で指される —— 本書は行き先を変えないので届かない。表 T-283 は要求 2 件、`RG-14` は 1 か所から指される（`DFC-2720` の答えで動く見込み）。
- 足す辺: ガード → 根拠の行（原稿の `evidence` と同じ）。消す辺は無い。
- 並んで起草・適用している変更要求との重なり: `CR-755`・`CR-757`（枝 `claude/compassionate-goldberg-0bf1a8` の `6f7c3ac3`）が `state-machines.json` と `tbl-state-machines.md` を名指す —— 機械や升を足すなら、本書の前に当てる（8 節）。⭐ 統合の枝 `b492dfd7` で `CR-759`〜`CR-762` の 3 節〜5 節を測り直した（2026-10-15）: `CR-759` の A 部が語「直す案」→「修正案」（3 か所）と「控え」→「バックアップ」（2 か所）を `state-machines.json` の注で置き替える —— 同じ原稿 ⇒ **本書の波 1 は `CR-759` の後**（ガードの条件の下書きにその語が出れば、置き替えた語で書く）。`CR-760`・`CR-762` は `frame-loop.ts` に触れる（波 2 の `DFC-2720`）。`CR-761` は本書のファイルに触れない。`CR-763`・`CR-764` は `b492dfd7` にまだ無い —— 当てる前に「`state-machines`」で測り直す。

---

## 7. 数の予測

- 要求 ±0、表 ±0、`UID` ±0、図 ±0（図 F-026〜F-043 の中身が Mermaid から SVG へ替わるだけ）、表の行 ±0（状態遷移表とガードの一覧は行 ID を持たない）—— `4a907919` の `check.sh` は `tables=240  figures=30  rows=3269  uids=183`。
- ガード 65 → 63（X-j）。Q3 が択 A なら状態 94 → 96。
- `（MUST）`: ±0。`（MUST NOT）`: `05-07-design.md` で +1（X-1 の「図と表を手で直してはならない」）。

---

## 8. 波

### 8.1 幅（`05-working-method.md` の 11 節）

| 波 | 触る `src` のファイル | 進行中の変更要求と共有するファイル |
|---|---|---|
| 1 仕様と図 | 無い（原稿・契約・刷り手・生成器・図、規則 07 の R4.4） | `CR-755`・`CR-757`・`CR-759` が原稿に触れる |
| 2 ガードの名の判定 | `screen-values.ts`・`notice-values.ts`・`gesture-values.ts`・`file-flow-values.ts`・`field-entry-values.ts`・`selection-values.ts`・`interaction-record-values.ts`・`agent-api-values.ts`・`task-group-folding.ts`（と `frame-loop.ts` —— `DFC-2720`） | `screen-values.ts`（`CR-755`・`CR-757`）、`frame-loop.ts`（`CR-740`・`CR-754`・`CR-757`・`CR-760`・`CR-762`） |
| 3（Q1 が択 B のとき） | 同じ 9 ファイル（判定の本体を生成へ） | 同じ |

⇒ 波 1 は前に立つ者か体 1 つ（ガードの条件の書き起こしは 1 体、図の刷り手は 1 体 —— 原稿のファイルが同じなので順に）。波 2 は領域ごとにファイルが分かれるので 3 体まで並べられる（画面の値 1 ／ 通知・身振り・ファイル操作 1 ／ 残り 5 と木 1）。試験の体は領域ごとに 1 つ。

### 8.2 順

1. `CR-755`・`CR-757`・`CR-759` の後（原稿の機械と升、`CR-759` は原稿の注の語）。波 2 は `CR-760`・`CR-762` の合流の後（`frame-loop.ts`）。Q1〜Q3 の答えの後（Q1 は原稿の形を決める。答えが無いうちは波 1 を始めない）。
2. 波 1 → 波 2 → `CR-768` の C 部（`TASK_GROUP_GUARDS` を生成した名の型で引く）→ 波 3（Q1 が択 B のとき）。
3. 波 1 の頭で、付録 A の 24 の「読む必要」と 1 の「食い違う」を、要求の行と照らして正を決める —— 食い違えば `DFC-` の行にし、利用者の裁定が要るものは調整役へ（規則 01 の ⑤）。

---

## 9. 仕様の外で直すもの

- 規則 `docs/development-rules/07-review-standards.md` の R4.4 の「ガードと処理は、表には名前だけを書き、中身（条件式・処理の本体）はコードが持つ。」—— `JDG-2161` は「`JDG-2071` の ② を持つ席が直す」と言うが、その席の着地（`JDG-2127`）はこの文に触れていない。⭐ 調整役の答え（2026-10-15）: **本書を当てる波 1 が規則 07 も直す**（5 節の表の行）。文の案: 「ガードは、表には条件を、図には名を書き、条件は原稿のガードの一覧が持つ。処理の中身はコードが持つ。」
- 見本 `previous-project-result/57-uml-state-machine-style/`（本書と一緒に作った）。答えが出たら README の「決まったこと」に書く。
- `docs/spec/_source/build.py` の `--check` が図を作り直さない弱さ（部品の図）—— 本書の X-m と同じ指紋の手を当てられる。別の件として調整役へ。

---

## 10. ⛔ この変更でやらないこと

- 升の行き先・出来事・状態を変えること（Q3 の択 A の 2 つの複合状態を除く —— それも振る舞いは同じ）。
- 副作用の中身を原稿に書くこと（`SD-3` の「持たないもの」に残す）。
- 図 F-018（`05-07-design.md` の 845 行、文書のデータの状態を手で描いた図）—— 5.5 節が原稿に入れないと定める（`SD-5` の木を除く）。

---

## 11. 利用者に問うこと

3 つとも答えはまだ無い（利用者は眠っていた）。調整役が問う時期を決める。触れる見本: `previous-project-result/57-uml-state-machine-style/uml-state-machine-style-sample.html`（上の「名」「言葉」「式」のボタンで、図と表が一緒に替わる）。

### Q1 —— 状態遷移のガードの条件を、原稿にどう書きますか？（`DFC-2643`、`JDG-2161` の残り）

- 場面: タスクグループの木（日程表の左、タスクグループの行の ▶ ／ ▼）で、[v]（1 階層展開する）を押すと、押したタスクグループが「展開」になる。表 T-328 の升は今「→ `expanded` [`isPressedTaskGroup`]」と名だけを書き、何が「押したタスクグループ」かはコード（`task-group-folding.ts`）と試験にしか無い。JDG-2161 で、原稿が条件を持ち、表の升に条件を見せると決まった。その条件の書き方を選ぶ。
- 例（見本の 3 節・6 節）:

| 択 | 升の例（`allBelowOpenPressed` の `collapsed` の 2 つ目） |
|---|---|
| A 言葉 | → `temporarilyExpanded` [このタスクグループが、押したタスクグループの配下（子・孫…）である かつ 「このタスクグループが子のタスクグループを持たない」でない] |
| B 式 | → `temporarilyExpanded` [`event.pressedRowId in ancestors(taskGroup) && !(children(taskGroup) == [])`] |
| C 両方 | 升は言葉、原稿は言葉と式の 2 つを持ち、試験が式を評価する |

| 択 | 良い所 | 代償 |
|---|---|---|
| A 言葉 | 読める。65 のうち 40 は名からそのまま 1 文で書ける | 試験もコードも言葉を読めない —— 言葉とコードが黙ってずれる道が残る（`DFC-2645` と同じ形）。2 つの「次の状態」のガードは言葉でも書きにくい |
| **B 式（推奨）** | 試験が式を評価して表と関数の一致を確かめられ、コードの判定の本体も式から生成できる（波 3）—— 唯一の正が本当に 1 つになる。65 のうち 51 は簡単な式に入る | 式の文法と、14 のガードが使う名の付いた関数（`ancestors()`・`children()`・表 T-233 を引く・`WC-10` の断り・次の状態ほか）を仕様が言葉で定める。升が読みにくくなる |
| C 両方 | 読めて、確かめられる | 1 つのガードに 2 つの文 —— 言葉だけが確かめられずにずれうる（JDG-2161 の理由「どちらが正か分からなくなる」と同じ） |

推奨は B —— 理由: 利用者の裁定は「どちらが正か分からなくなる」形を退けた。式だけが試験とコードの両方から機械で読め、言葉と式の 2 つを持つ C は同じ問題を 1 段下で繰り返す。式は読みにくいが、図のラベルは名のまま（③ の X-d）なので、読む入口は図とガードの一覧の名で残る。14 の関数を言葉で定める仕事は増えるが、それは今コードと試験の 2 か所に書かれている判断を仕様の 1 か所へ移す仕事である。

### Q2 —— 状態遷移図を何で描きますか？（`JDG-2161` の「drawio-uml が使えるかも」）

- 場面: 仕様書の 9 つの図（図 F-026〜F-043）の 31 の状態機械図。原稿が変わるたびに描き直す。描くのは調整役のセッション（この機械）と、公開の頁を刷る GitHub の Actions（Pages）。
- 触れる見本: 見本の 2 節（drawio-uml で描いた UML の図）。

| 択 | 形 | 代償 |
|---|---|---|
| **A drawio-uml（推奨）** | Graphviz の dot が配置と線の道を決め、draw.io が UML の形（角丸の状態・実線の複合状態・黒丸の始まり・◇）で SVG に書き出す。SVG をリポジトリに置き、`--check` は図の元の指紋で一致を確かめる（③ の X-m）。前例 `build.py` | 描き直せるのは draw.io と Graphviz と技能の在る機械だけ（今は調整役の機械）。Actions は描かず、置かれた SVG を載せる。見本で 3 つの手当てが要った |
| B Mermaid のまま UML のラベルにする | 今の Mermaid の `stateDiagram-v2` に「出来事 [ガード] / 副作用」と複合状態・◇（`<<choice>>`）を書く。道具は要らず、刷り手の文字がそのまま図 | Mermaid の配置は線とラベルを重ねやすい（見本 57 の元になった不満）。UML の形への忠実さは道具任せ |
| C Graphviz だけで SVG | 刷り手が dot の文を書き、Graphviz が SVG に描く（draw.io を使わない） | UML の形（複合状態・擬似状態）を刷り手が自分で組む。Actions でも描けるが、道具を 1 つ作る |

推奨は A —— 理由: 利用者が名指した道具であり、部品の図に前例がある。描けない所（Actions）は指紋の確かめで止まるので、「古い図でも緑」の弱さは繰り返さない。

### Q3 —— 3 つ以上の兄弟の状態を 1 つの箱に囲む今の約束を、UML でどう描きますか？（③ の X-h とは別）

- 場面: 構え（画面の上のパレットで図形やリンクの入口を押して、置く形を選んだ状態 —— `armModeStateMachine`）と、タスクグループの掴み（`taskGroupGrabStateMachine`）。今の図は「notArmed 以外」「notGrabbed 以外」という箱で兄弟を囲み、箱から 1 本の矢印を描く。箱は状態ではないので UML の図ではない。構えでは、6 つの構えのどの 2 つの間も同じ出来事で結ぶ遷移が 36 本ある。
- 触れる見本: 見本の 5 節（択 A の形）。

| 択 | 形 | 代償 |
|---|---|---|
| **A 本物の複合状態を足す（推奨）** | 原稿に `armModeStateMachine.armed`・`taskGroupGrabStateMachine.grabbed`（名は仮）を足し、兄弟をその子にする。共有の遷移は複合状態から 1 本で描く（見本の 5 節） | 状態が 2 つ増え、2 つの機械の生成する型（複合状態は子を持つ形）とコードが動く。振る舞いは同じ |
| B すべての矢印を描く | 原稿は変えず、36 本（構え）ほかを描く | 図が読めない（6 つの状態の間に 36 本） |
| C 囲みを図だけの約束として残す | 原稿は変えず、今の囲みを UML の図の上に描く | 図が UML に準拠しない（裁定に反する） |

推奨は A —— 理由: UML で「どの構えからも」を言う正しい形は複合状態である。表の列（葉の状態）と行き先は変わらず、増えるのは状態の親だけ。

---

## 12. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `defects.md` | `DFC-2643` の対応方針の欄の頭に「指示 —— `CR-767` が当てる（条件の書き方は 11 節の Q1）」、`DFC-2644` に「指示 —— `CR-767` が当てる（③ の X-k —— どちらの書き方でも名をそろえる）」を書き、`DFC-2644` のステータスを `未検討` から `仕様待ち` にした。新しい行 `DFC-2720`〜`DFC-2722`（0.1）を足した（`未検討`）。`tools/ledger_metrics.py` と `npm run gen:prefixes` で件数を刷り直した |
| `rulings.md` | `JDG-2161` の状態の欄を「指示 —— `change-request/CR-767-state-machines-print-guard-conditions-and-uml-diagrams-from-one-manuscript.md` が当てる（Q1〜Q3 は未答）」にした |
| `changelog.md`・`perf-pending.md` | 当てる体が番号を受ける |

---

## 13. 測り方の再現

```
git grep -c "CR-767" 4a907919 -- change-request docs src tests previous-project-result tools   # 0 件
ls -d previous-project-result/57-* 2>/dev/null                                                  # 無い（4a907919）
grep -c '```mermaid' docs/spec/_assets/tbl-state-machines.md                                   # 31
PYTHONIOENCODING=utf-8 python <作業場>/sm_scan.py docs/spec/_source/state-machines.json         # 升 283、Entry ／ Exit の候補 4
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-250 SD-3 T-283 RG-3 RG-14
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py <6 節の 21 対象>
```

ガードの 65 は、原稿の各領域の機械と根の升の `guard` の配列から `in` を除いた名を集めて数えた。`src` に名が無い 23 は、65 の名を `src/**/*.ts` で語として引いた（生成の領域の外）。40 ／ 24 ／ 1 の分けは、ガードごとに遷移の関数と契約試験の `guardHolds` を読んで付けた（付録 A）。Entry ／ Exit の候補は、状態ごとに入る（出る）遷移（自己を除く）の副作用を集め、2 本以上ですべて同じものを数えた。

---

## 14. 利用者の実物の手順と見積り

- 実物の手順（調整役へ送る）: 画面は変わらない。波 2 の後に、タスクグループの [v] ／ [vv] ／ [^] ／ [^^]、構えの入口を 2 度押して外す、二重カーソルの入口と Esc、拡大の知らせが出て消えることを今と同じに確かめる（見本の機械の振る舞い）。
- 見積り（当てる側）: 原稿と契約と刷り手（ガードの一覧・条件・Entry ／ Exit）4 時間、65 のガードの条件の書き起こしと照らし 4 時間、図の刷り手と 31 の図と指紋 4 時間、Q3 の 2 つの複合状態 2 時間、コードの名の判定 3 時間、契約試験と表を読む試験 4 時間、`check.sh` と全試験 1 時間 —— 計 22 時間ほど（Q1 が式なら、判定の本体の生成と式の評価に ＋ 5 時間）。

---

## 付録 A —— 65 のガードの下書き（`4a907919`）

言葉と式は、今のコードの判定と契約試験の `guardHolds` から起こした下書きであり、決まった文ではない（波 1 の頭で 1 つずつ要求と照らす —— 8.2 の 3）。「種類」は、名で足りる（40）／ コードを読んで書いた（24）／ 名と語が食い違う（1）。「`src` に名」が「無い」の 23 は `DFC-2644` の 23。機械の名の `SM` は `StateMachine` を縮めた。

| # | ガード | 機械 | 升 | `src` に名 | 種類 | 言葉（択 A の下書き） | 式（択 B の下書き） |
|---|---|---|---|---|---|---|---|
| 1 | `canEnterDualCursor` | armModeSM | 6 | 無い | 読む必要 | Dual Cursor モードが切れていて、押下が置く日付を運んでいる（この押下でモードに入る） | `in(dualCursorModeStateMachine.off) && event.hasDaysToPlace` |
| 2 | `hasAnythingToReport` | fileFlow (root) | 1 | 在る | 読む必要 | 着地が、落としたタスク名・見つからないタスク名・報告する件数のどれか 1 つでも運んでいる | `event.droppedTaskNames.length > 0 \|\| event.missingTaskNames.length > 0 \|\| event.reportedCounts.length > 0` |
| 3 | `hasChoice` | propertiesPanelContentSM | 2 | 在る | 読む必要 | 動いた後の選択に、対象かタスクグループが 1 つ以上ある | `event.subject.selection.items.length > 0 \|\| event.subject.groupIds.length > 0` |
| 4 | `hasDaysToPlace` | dualCursorModeSM | 1 | 在る | 名で足りる | 押下が、置く日付を運んでいる（画面の中央に日付がある） | `event.hasDaysToPlace` |
| 5 | `hasNoCalendarDraftRefusal` | calendarDraftSM | 1 | 在る | 読む必要 | 休日の設定の下書きに、断り（期間の誤り・稼働曜日が 0・例外の誤り。WC-10）が 1 つも無い | `calendarDraftRefusalsOf(calendarDraftState.calendarDraft).length == 0` |
| 6 | `hasNoSurfaceOrConfirmation` | propertiesPanelContentSM | 2 | 在る | 名で足りる | Enter の時点で、開いている面も立っている問いも無い | `event.hasNoSurfaceOrConfirmation` |
| 7 | `hasNoUnsettledEntry` | propertiesPanelContentSM | 2 | 在る | 名で足りる | Enter の時点で、確定していないその場の編集が無い | `event.hasNoUnsettledEntry` |
| 8 | `hasPickedObjects` | selectionSM | 2 | 在る | 名で足りる | 選んだ対象が 1 つ以上ある | `event.pickedObjects.items.length > 0` |
| 9 | `hasRemainingObjects` | selectionSM | 1 | 在る | 名で足りる | 刈った後に残る対象が 1 つ以上ある | `event.remainingObjects.items.length > 0` |
| 10 | `hasSilentWatcher` | changeDeliverySM | 1 | 無い | 名で足りる | 変更を配った先に、答えを返さなかった監視が 1 つ以上ある（RS-23） | `event.silentWatchers > 0` |
| 11 | `isAgentApiEnabled` | dialogueFieldDisplaySM | 1 | 在る | 名で足りる | 押した時点で Agent API が有効である | `event.isAgentApiEnabled` |
| 12 | `isAnotherSurface` | openSurfaceSM | 3 | 在る | 読む必要 | 面が開いていて、その面が、いま開こうとする面（透かしの入口なら U-60）と違う | `in(openSurfaceStateMachine.open) && openSurfaceState.surfaceName != (event.surfaceName or 'U-60')` |
| 13 | `isBackToSavedDocument` | unsavedEditsSM | 1 | 在る | 名で足りる | 取り消し・やり直しの着地で、文書が印を下ろした時点の文書そのものに戻った | `event.isBackToSavedDocument` |
| 14 | `isBaselineRoute` | fileOperationSM | 1 | 在る | 名で足りる | 読んでいるファイルが、基準として開く道（OP-15）で来た | `fileOperationState.openRoute == 'baseline'` |
| 15 | `isBelowPressedTaskGroup` | treeSM | 9 | 在る | 名で足りる | このタスクグループが、押したタスクグループの配下（子・孫…）である | `event.pressedRowId in ancestors(taskGroup)` |
| 16 | `isChildOfPressedTaskGroup` | treeSM | 1 | 在る | 名で足りる | このタスクグループの親が、押したタスクグループである | `taskGroup.parentId == event.pressedRowId` |
| 17 | `isCreatedTask` | fieldEntry (root), createdTaskNamingSM | 4 | 在る | 名で足りる | 作ったものがタスクである（タスクグループではない） | `event.created.kind == 'task'` |
| 18 | `isDifferenceReviewSurface` | fileOperationSM | 1 | 無い | 読む必要 | 閉じた面が、合流の差分を確かめる面（U-61）である | `event.surfaceName == 'U-61'` |
| 19 | `isDocumentChangingPress` | pointerPressSM | 1 | 在る | 読む必要 | 押下が文書を変える押下である（スクロールバーのつまみ、見るだけの押下行 PTD-1・PTD-5、押し続けると繰り返す入口 IC-12〜IC-15 を除く） | `pressedOn in {null, grab} ? event.pressRow not in {PTD-1, PTD-5} : pressedOn.kind != 'scrollbarThumb' && !(pressedOn.kind == 'entry' && pressedOn.entry in {IC-12..IC-15})` |
| 20 | `isEditedField` | fieldEditSM | 2 | 在る | 名で足りる | 出来事の欄が、いま編集中の欄と同じである | `in(fieldEditStateMachine.editingField) && fieldEditState.fieldRow == event.fieldRow` |
| 21 | `isFileOperationQuestion` | confirmationSM | 1 | 無い | 読む必要 | 立っている問いが、ファイル操作が自ら立てた問い（答えた後に果たす操作を持たない問い）である | `confirmationState.owedAction == null` |
| 22 | `isFlowAwaitingAnswer` | openSurfaceSM | 3 | 在る | 読む必要 | 開いている面が、開く道の答えを待つ面（U-56・U-61）である | `in(openSurfaceStateMachine.open) && openSurfaceState.surfaceName in {'U-56','U-61'}` |
| 23 | `isFullScreen` | fullScreenModeSM | 2 | 在る | 名で足りる | ブラウザが全画面表示になっている | `event.isFullScreen` |
| 24 | `isHelpTarget` | helpDisplaySM | 1 | 無い | 名で足りる | 閉じる対象がヘルプである | `event.target == 'helpModal'` |
| 25 | `isHiddenReason` | noticeDisplaySM | 2 | 無い | 読む必要 | 通知の理由の出し方（表 T-233）が「出さない」である | `T-233.display(event.reason) == 'hide'` |
| 26 | `isImportCanceled` | fileOperationSM | 1 | 無い | 名で足りる | 合流の対応づけの答えが「取り込みをやめる」である | `event.mergeMapping.kind == 'cancelImport'` |
| 27 | `isImportReportSurface` | fileFlow (root) | 1 | 無い | 読む必要 | 閉じた面が、取り込みの報告の面（U-62）である | `event.surfaceName == 'U-62'` |
| 28 | `isLeafTaskGroup` | treeSM | 6 | 在る | 名で足りる | このタスクグループが子のタスクグループを持たない | `no taskGroup t with t.parentId == taskGroup.id` |
| 29 | `isLeavingDocumentSettings` | baseTimeZoneDraftSM, timeShiftDraftSM | 14 | 在る | 読む必要 | この出来事で、プロパティパネルが文書の設定を出さなくなる | `in(propertiesPanelContentStateMachine.documentSettingsDisplayed) && next(propertiesPanelContentStateMachine) != documentSettingsDisplayed` |
| 30 | `isLeavingHolidaySettings` | calendarDraftSM | 5 | 在る | 読む必要 | この出来事で、開いている面が休日の設定の面（U-65）でなくなる | `in(openSurfaceStateMachine.open) && openSurfaceState.surfaceName == 'U-65' && next(openSurfaceStateMachine) is not open U-65` |
| 31 | `isLeavingNone` | noticeDisplaySM | 1 | 無い | 読む必要 | 押された通知が立っていて、それを除くと 1 枚も残らない | `standing.some(n => n.reason == event.reason) && standing.length == 1` |
| 32 | `isLeavingSome` | noticeDisplaySM | 1 | 無い | 読む必要 | 押された通知が立っていて、それを除いても通知が残る | `standing.some(n => n.reason == event.reason) && standing.length > 1` |
| 33 | `isLevelZeroCollapsed` | taskGroupTree (root) | 6 | 在る | 名で足りる | 段 0 が折りたたまれている（S-418 が collapsed） | `documentSettings.levelZeroTreeState == 'collapsed'` |
| 34 | `isNameField` | createdTaskNamingSM | 1 | 在る | 読む必要 | 編集を終えた欄が、名前の欄（PR-1）である | `event.fieldRow == 'PR-1'` |
| 35 | `isOnPaletteBand` | pointerPressSM | 2 | 在る | 名で足りる | 中断された押下が、パレットの掴む帯の上で始まっていた | `pointerPressState.pressedOn.kind == 'paletteBand'` |
| 36 | `isOnRepeatingEntry` | pointerPressSM | 2 | 在る | 読む必要 | 押下が、押し続けると繰り返す入口（IC-12〜IC-15）の上にある | `pressedOn.kind == 'entry' && pressedOn.entry in {IC-12, IC-13, IC-14, IC-15}` |
| 37 | `isOnlyOneStanding` | noticeDisplaySM | 2 | 無い | 名で足りる | 立っている通知が 1 枚だけである | `noticeDisplayState.standing.length == 1` |
| 38 | `isOpenAccepted` | dropCueDisplaySM | 1 | 在る | 名で足りる | いまファイルを開ける（ファイル操作が idle で、問いが立っていない） | `event.isOpenAccepted  (= in(fileOperationStateMachine.idle) && in(confirmationStateMachine.notAsked) of region fileFlow)` |
| 39 | `isOpenChooserSurface` | fileOperationSM | 1 | 無い | 読む必要 | 閉じた面が、開き方を選ぶ面（U-56）である | `event.surfaceName == 'U-56'` |
| 40 | `isOverwriteQuestion` | fileOperationSM | 1 | 在る | 読む必要 | 立っている問いが上書きの問い（QN-4）である | `in(confirmationStateMachine.questionAsked) && confirmationState.question.question == 'QN-4'` |
| 41 | `isPanelTarget` | propertiesPanelContentSM | 2 | 無い | 名で足りる | 閉じる対象がプロパティパネルである | `event.target == 'panel'` |
| 42 | `isPanelTopmost` | propertiesPanelContentSM | 2 | 在る | 読む必要 | 開いている面が無い（パネルがいちばん上に立つ） | `in(openSurfaceStateMachine.closed)` |
| 43 | `isPositionAxis` | taskGroupGrabSM | 1 | 在る | 名で足りる | 決まった掴む向きが位置（並び）である | `event.axis == 'position'` |
| 44 | `isPressedTaskGroup` | treeSM | 14 | 在る | 名で足りる | このタスクグループが、押したタスクグループそのものである | `taskGroup.id == event.pressedRowId` |
| 45 | `isProceeding` | openSurfaceSM, fileOperationSM, confirmationSM | 3 | 在る | 名で足りる | 問いへの答えが「進める」である | `event.isProceeding` |
| 46 | `isRememberedEnabled` | agentApiEnablingSM | 1 | 在る | 名で足りる | 覚えていた Agent API の有効・無効が「有効」である | `event.isRememberedEnabled` |
| 47 | `isReopenRoute` | fileOperationSM, confirmationSM | 3 | 在る | 名で足りる | 読んでいるファイルが、開き直しの道で来た | `fileOperationState.openRoute == 'reopen'` |
| 48 | `isReplaceChoice` | fileOperationSM, confirmationSM, unsavedEditsSM | 5 | 在る | 名で足りる | 開き方の答えが「置き換える」である | `event.openChoice == 'replace'` |
| 49 | `isRevealedTaskGroupOrAncestor` | treeSM | 4 | 在る | 名で足りる | このタスクグループが、見せたいタスクグループそのものか、その祖先である | `taskGroup.id == event.revealedRowId \|\| taskGroup.id in ancestors(revealed)` |
| 50 | `isRungArmed` | armModeSM | 6 | 無い | 名で足りる | Esc が消費する段（IN-4）が「構え」（RG-5）である | `event.rung == 'armed'` |
| 51 | `isRungDialogueField` | dialogueFieldDisplaySM | 2 | 無い | 名で足りる | Esc が消費する段が「開いているウィンドウ」の対話欄（RG-16）である | `event.rung == 'dialogueField'` |
| 52 | `isRungDualCursor` | dualCursorModeSM | 1 | 無い | 名で足りる | Esc が消費する段が「Dual Cursor モード」（RG-7）である | `event.rung == 'dualCursorMode'` |
| 53 | `isRungHelp` | helpDisplaySM | 2 | 無い | 名で足りる | Esc が消費する段が「開いているウィンドウ」のヘルプ（RG-16）である | `event.rung == 'helpModal'` |
| 54 | `isRungSearchPanel` | searchPanelDisplaySM | 2 | 無い | 名で足りる | Esc が消費する段が「開いているウィンドウ」の検索パネル（RG-16）である | `event.rung == 'searchPanel'` |
| 55 | `isRungSelection` | selection (root), selectionSM | 2 | 在る | 名で足りる | Esc が消費する段が「選択」（RG-6）である | `event.rung == 'selection'` |
| 56 | `isRungSurface` | openSurfaceSM, propertiesPanelContentSM | 3 | 無い | 食い違う | Esc が消費する段が「開いている面」（RG-3）か「プロパティパネル」（RG-14）である | `event.rung == 'surface'  (shell sends it for EscapeTarget 'surface' and 'propertiesPanel')` |
| 57 | `isRungTooltip` | tooltipDisplaySM | 1 | 無い | 名で足りる | Esc が消費する段が「出ている説明」（RG-8）である | `event.rung == 'tooltip'` |
| 58 | `isSameArm` | armModeSM | 6 | 在る | 読む必要 | 押した構えの入口が、いまの構えと同じ種類で、運ぶ形（shapeKind）・記号（glyph）も同じである | `armModeState.kind == event.armKind && carried(armModeState) == carried(event)  (shapeKind for taskShapeArmed, glyph for milestoneShapeArmed)` |
| 59 | `isSameReasonStanding` | noticeDisplaySM | 1 | 無い | 読む必要 | 同じ理由の通知が既に立っている（表 T-233 で同じ言葉の行に相乗りする理由も同じと数える） | `standing.some(n => wordsRow(n.reason) == wordsRow(event.reason))` |
| 60 | `isShiftZero` | timeShiftDraftSM | 2 | 在る | 名で足りる | 確定したタイムシフトの量が 0 分である | `event.shiftMinutes == 0` |
| 61 | `isSurfaceTarget` | openSurfaceSM | 1 | 無い | 名で足りる | 閉じる対象が、開いている面である | `event.target == 'surface'` |
| 62 | `isTaskGroupGrabStrip` | taskGroupGrabSM | 1 | 在る | 名で足りる | 押下が、タスクグループの掴む帯の上にある | `event.pressedOn.kind == 'taskGroupGrabStrip'` |
| 63 | `isTimedCard` | noticeDisplaySM | 1 | 無い | 読む必要 | 時間が来た通知の理由の出し方（表 T-233）が「時間で消す」で、その通知が立っている | `T-233.display(event.reason) == 'autoDismiss' && standing.some(n => n.reason == event.reason)` |
| 64 | `isTopLevelTaskGroup` | treeSM | 1 | 在る | 名で足りる | このタスクグループが親を持たない（最上位） | `taskGroup.parentId == null` |
| 65 | `isWatermarkUnlockSurface` | openSurfaceSM, watermarkDisplaySM | 4 | 在る | 読む必要 | 開いている面が、透かしを外す面（U-60）である | `in(openSurfaceStateMachine.open) && openSurfaceState.surfaceName == 'U-60'` |
