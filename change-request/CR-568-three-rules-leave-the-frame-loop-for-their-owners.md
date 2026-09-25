# CR-568 — `frame-loop.ts` の入口に残る 3 つの規則を、持ち主のユニットへ移す

> 状態: **起草（2026-09-25）。仕様にもコードにもまだ当てていない。**
> 読んだ木: `566bf187`（ブランチ `refactor` の先端、段 7.5 の分割が着地した木）。行番号・数・参照は、すべてこの木で測った。
> ID の帯: 調整役から `CR-568`、`JDG-566`〜`JDG-579`、`DFC-990`〜`DFC-999`、`UF-172`〜`UF-176`（新しいユニットが本当に要るときだけ）を受けた。
> 2026-09-25 に木を測った上端: `JDG-565`・`DFC-989`・`UF-171`（`UF-172` は `handoff.md` の「使っていない」の文にだけ現れる）。本書が使うのは `DFC-990`〜`DFC-992` だけである。
>
> **開くもの**: `JDG-549`（利用者 2026-09-25「CR-554 の直後に別の CR」）—— `CR-554` の 15.6.12 の D1・D2・D3 と、`DFC-968`（`LY-5` と `pure` の `Framework` のユニットの食い違い）。
> 段 8 の前に置く（`JDG-549`）。
>
> ⛔ **本書は起草だけである。** `src/`・`tests/`・`docs/spec/`・基準線は、本書を当てる波（6 節）が書き換える。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⚠️ **直に前へ進めるものは無い。利用者が画面で気づく変化は 0 である**（`CR-554` の 0 節 ① と同じ答え）。
表 T-054 の `CH-1` 〜 `CH-6` のどれにも、`GL-001` 〜 `GL-008` のどれにも直には結ばない。作り方の側の手入れである。
間接の結びは利用者の目的「目的はとにかく変更に強くすること。」（`CR-432` の 4.1 に逐語）である —— 表 T-023c・`GR-21`・表 T-050 が変わったとき、最初に開くユニットがその規則を持ち、`frame-loop.ts`（`UF-48`）を開かずに済むようにする。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` を当てた。

- `R2.2`・`R2.2a`（SRP・責務文の試験）—— `UF-48` の責務の欄は、自らの ⚠️ の文で 2 つの出どころの別な中身（表 T-023c の選択の刈り込み、`GR-21`・`SC-1` のスクロールの全体）を名指し、`R2.2a` を満たさないと書く。本書はその 2 つと、削除の問いの規則（`UF-162`）を持ち主へ移す。**残る FAIL は「セッションを 1 段進める」と「フレームを計算して配る」の 1 組だけになる**（`JDG-440` の借り、本書は触れない）。
- `R2.1`（命名・品詞）—— 公開名は変えない（1 節の「動かす名」）。新しく名を 2 つ立てる: 型 `DeletionQuestion`（名詞）と、`WBS` の子孫の歩きの 1 本の名（問い Q2）。
- `R7.6`（真の札）と 表 T-060 の `LY-5` —— `deletion-confirmations.ts` は `pure` の札のまま `UseCase` へ移り、`DFC-968` の食い違いが消える。
- 表 T-061 の `LR-1`〜`LR-3` —— 足す辺 5 本はどれも内向きか同じ層で、輪を作らない（3.2 で測った）。退けた置き場 4 つは、どれも輪を作る。
- 表 T-276 の `UD-1`・`UD-5` —— 置き場は、その規則の行を「負う」ユニット（表 T-075）で決めた（2 節）。
- 1.9（写さない）—— 表 T-050 の読みの写し（`rowsLostWith`・`tasksLostWith` と `editTaskGroup` の横の同じ歩き）を 1 つにする。
- `R2.9`（要らないうちは作らない）—— 新しいユニット・表・接頭辞は 0。`UF-172` 以降は使わない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 文書に無くなった対象の刈り込み（`scheduleHolds`・`selectionWithinSchedule`）は `Entity` の `Selection`（`UF-55`）へ置く。依頼文の「use-case の側（`selection-values.ts`）」ではない | 表 T-075 で `FR-081`（表 T-023c を持つ要求）を `OW-1` で負うのは `UF-55` である。表 T-060 の `LY-1` は `documentModel` に「選択 …… その不変条件」を置く。`selection-values.ts` へ置くと `AdvanceScreenSession` → `Schedule` の辺が要り、状態機械は文書を持たない | 辺 `Selection` → `Schedule` を 1 本足す。**問い Q1 で利用者に確かめる** |
| 決定 2 | `selectionWithinDrawnRows` は `drawn-selection.ts`（`UF-169`）へ置く（`CR-554` の D1 のとおり） | `UF-169` の責務は「選択を、描いているタスクだけに絞る（表 T-023c）」で、その後半である | `ItemHitArea` から 4 本の辺（`Selection`・`Schedule`・`ScheduleLayout`・`DocumentSettings`）。どれも型だけの取り込みで、輪は 0 |
| 決定 3 | スクロールの全体（`GR-21`）は `ScreenRenderer` の `screen-frame.ts`（`UF-61`）へ置く | `UF-61` は `Scrollbars` の割り付け（`FR-051`）を負い、つまみの長さ（`GR-21` の前半）を既に `scrollbarIn` で測る。全体は同じ `GR-21` の行の後半である。`ScreenRegions` は輪を作る（3.2） | 新しい辺は 0。`PI-37` のメンバが 5 増える |
| 決定 4 | 押した時点の全体を覚える側（`HeldWholes`・`heldWholeOf`・`measuredAtPress`）はシェルに残す | `GR-21` の「押しているあいだは押した時点の全体を保つ」の「保つ」は現在値の保持であり、`LY-5` が `Framework` だけに許す。移すと `ScreenRenderer` → `InputCommandTranslator` の辺が要り、輪になる（3.2） | — |
| 決定 5 | 削除の問いの告げ方 `NT-7`（`CONFIRMATION_MANNER`）は `EditDocument` へ移さない。`EditDocument` は問いの行 ID と挙げる名だけを返し（`DeletionQuestion`）、シェルが `manner` を添える | 表 T-234 は「`NT-7` の問いだけ」を持ち、告げ方は表示の側である。`EditDocument` から `AdvanceScreenSession`（`FileFlowQuestion`）・`ScreenRenderer`（`ConfirmationItem`）・シェル（`CONFIRMATION_MANNER`）は読めない（`LR-1`・`LR-3`） | 戻り値の型が `FileFlowQuestion` から `DeletionQuestion` に変わる（名前付きの継ぎ目）。値のバイト列は同じ（5 節） |
| 決定 6 | `UF-162` は行 ID を変えずに `EditDocument` の群へ移す。`UF-172` を起こさない | ユニットの中身と責務は変わらず、フォルダ（コンポーネント）だけが変わる。`CR-554` でも改名した `UF-162` は ID を保った | 表 T-063 の `UT-2`・`UT-6` の欄を書き換える（行は増えない） |
| 決定 7 | `drawn-selection.ts:15` の WHY（「`components.json` に `ItemHitArea` → `Selection` の辺が無い」）は W1 で消す。構造の型 `DrawnChoice`・`ChosenItem` は残す | 辺を宣言した瞬間に偽になる。型を `Selection` に畳むと公開した `selectionWithinDrawn` の署名が変わり、動かすだけの波に乗らない | 1 つの概念に 2 つの綴りが残る ⇒ `DFC-992` |
| 決定 8 | `UF-48` の欄は最後の波（W3）で 1 度だけ書き換える | 02 の手順 5「オブジェクトごとに 1 回」 | W1・W2 のあいだ、`UF-48` の ⚠️ の文は移し終えた名を言い続ける（同じ巡の中だけ） |
| 決定 9 | `drawnRowBoxesOf`（`SC-1`）は動かさない | `JDG-549` が名指すのは 3 つだけである。台帳に起こす | `DFC-991` |

---

## 1. 読んで確かめた事実（`566bf187` で測った）

### 1.1 D1 —— 表 T-023c の選択の刈り込み

| 名 | 置き場（`src/framework/single-html-shell/frame-loop.ts`） | 呼ぶ所 | 読む状態 |
|---|---|---|---|
| `scheduleHolds` | `:318-335`（`pure`） | `selectionWithinSchedule` だけ | 引数だけ（`Schedule`、`ItemRef`）。`taskByUid` を `Schedule` から読む |
| `selectionWithinSchedule` | `:337-345`（`pure`） | `holder.replace`（`:1497`、閉包 `frameLoop` の中） | 引数だけ。呼ぶ側が `selectedObjectsIn(session)` と `held.document.schedule` を渡す |
| `selectionWithinDrawnRows` | `:347-378`（`pure`） | `runFrame`（`:1676`） | 引数だけ。呼ぶ側が閉包の `previewDocument !== null` を渡す |
| `pruneChoiceTo` | `:2103-2110`（閉包、`non-pure`） | 上の 2 か所 | `session` を読み、`selectionPruned` を `sendToSession` で送り、`noteChoiceMoved(hands, null)` を呼ぶ |

- `selectionOfAll` と `ItemRef` をシェルが読むのは `scheduleHolds`・`selectionWithinSchedule` だけである。どちらも `InputCommandTranslator` も読むので、検査 26b の `crossing-names-baseline.txt` の行（`Selection | ItemRef`・`Selection | selectionOfAll`）は動かない。
- `selectionWithinDrawn`（`PI-7`）をシェルが読むのは `selectionWithinDrawnRows` の中（`:360`）だけである。移したあとシェルは読まなくなるが、試験 `tests/unit/h2-undrawn-task-is-not-selectable.test.ts` が公開エントリから読むので、公開は残す。

### 1.2 D2 —— `GR-21` のスクロールの全体

| 名 | 置き場（`frame-loop.ts`） | 呼ぶ所 |
|---|---|---|
| `type HorizontalWhole`・`type VerticalWhole` | `:826-827`（`PointerPress` の欄から導く） | 下の関数と `HeldWholes` |
| `interface HeldWholes` | `:829-832` | `screenViewReadingsOf`・`heldWholeOf` |
| `horizontalWholeOf` | `:834-843` | `screenViewReadingsOf`（`:818`）・`measuredAtPress`（`:871`） |
| `verticalWholeOf` | `:845-854` | `:819`・`:872` |
| `visibleHeightOf` | `:856-862` | `verticalWholeOf`（`:852`）・`scrollExtentOf`（`:900`） |
| `measuredAtPress` | `:864-874` | `collectPress`（`:2073`） |
| `heldWholeOf` | `:876-885` | `runFrame`（`:1735`） |
| `scrollExtentOf` | `:887-904` | `screenViewReadingsOf`（`:817`） |

- どれも `pure` で、引数だけを読む。`screenViewReadingsOf`（`:797-824`）は `runFrame`（`:1735`）と `exportScene`（`:1960`、全体は `null`）から呼ばれる。
- 描き手の側: `src/adapter/screen-renderer/screen-frame.ts:120-136` が `readings.scrollExtent` からつまみを組む（`scrollbarIn`）。型 `ScrollExtent` は `screen-renderer.ts:77`。
- 読み手のもう 1 つ: `src/adapter/input-command-translator/frame-drags.ts:42-87` が `PointerPress` の `horizontalWholeAtPress`・`verticalWholeAtPress` を読む。その欄は `input-command-translator.ts:140`・`:144` に型を行内に綴る。

### 1.3 D3 —— 表 T-050 の削除の問いの規則

- `src/framework/single-html-shell/deletion-confirmations.ts`（123 行、`UF-162`、関数はすべて `pure`）。
  - 取り込み: `Document`・`Task`・`TaskGroup`（`Entity`）、`DocumentCommand`（`ApplyDocumentChange`、定義は `EditDocument` の `edit-document.ts:118`）、`FileFlowQuestion`（`AdvanceScreenSession`）、`ConfirmationItem`（`ScreenRenderer`）、`CONFIRMATION_MANNER`・`ConfirmationQuestion`（入口 `frame-loop.ts:486`・`:495`）。
  - `rowsLostWith`（`:15-31`）の上の `TRAP: a second reading of table T-050 beside editTaskGroup; change both together.` —— 写しの相手は `src/use-case/edit-document/edit-task-group.ts:102` の `subtreeOf`（行の部分木）である。
  - `tasksLostWith`（`:34-48`）の本体は、`edit-task-group.ts:121-135` の非公開 `withWbsDescendants` と字句が同じである（`editTaskGroup` の削除 `:165` と行の写し `:268` が呼ぶ）。
- 呼ぶ所: `frame-loop.ts:2307`（`answerSettledEntry`、担当者の削除 `QN-3`）・`:2339`（`carryOutAction`、`QN-1`・`QN-2`・`QN-10`）、`document-file-flow.ts:44`・`:465`（`tasksLostWith`、取り込みで落とすタスクの名）。
- 読む状態: 引数の文書だけ。セッションは読まない。
- `ConfirmationItem` を `ScreenRenderer` の外で読むのは `deletion-confirmations.ts` だけである ⇒ 移すと `crossing-names-baseline.txt` の `ScreenRenderer | ConfirmationItem` が指す先を失う。
- `asked` に渡る値は `InputAction` の `question?: 'QN-10'`（`input-command-translator.ts:221`）だけである。

### 1.4 検査と基準線（`566bf187`、`npm run check` は exit 0）

- 検査 60: `frame-loop.ts` の HELD は `answerSettledEntry` 84/21・`carryOutAction` 182/47・`frameLoop` 1440/4・`runFrame` 123/10 ほか。`edit-task-group.ts::editTaskGroup` 238/55。動かす関数はどれも帯の外である。
- 検査 61: 動かす宣言に可変のモジュール状態は無い（`UNASSIGNMENT_QUESTION` は文字の定数）。
- 検査 45: `src/` 83 群（基準線どおり）。
- `components.json`: 節 37・辺 143。

---

## 2. 判定 —— 項目ごと

| 項目 | 判定 | 行き先 | 証拠 |
|---|---|---|---|
| D1a `scheduleHolds`・`selectionWithinSchedule` | **動かす** | `src/entity/document-model/selection/selection.ts`（`UF-55`）。`selectionWithinSchedule` を `PI-32` で公開、`scheduleHolds` は非公開 | 決定 1 |
| D1b `selectionWithinDrawnRows` | **動かす** | `src/entity/layout-engine/item-hit-area/drawn-selection.ts`（`UF-169`）。`PI-7` で公開 | 決定 2 |
| D1c `pruneChoiceTo` | **動かさない** | 入口に残る | 1 本の送り口（`SF-6`・`SF-7`）で出来事を送り、`session` を読む。`LY-5` |
| D2a `HorizontalWhole`・`VerticalWhole`・`horizontalWholeOf`・`verticalWholeOf`・`visibleHeightOf`・`scrollExtentOf` | **動かす** | `src/adapter/screen-renderer/screen-frame.ts`（`UF-61`）。`visibleHeightOf` だけ非公開、ほかは `PI-37` | 決定 3 |
| D2b `HeldWholes`・`heldWholeOf`・`measuredAtPress`・`screenViewReadingsOf` | **動かさない** | 入口に残る | 決定 4。`screenViewReadingsOf` は `ScreenViewReadings` の組み立て（`SF-5`・`SF-10`）で、全体はその 1 欄にすぎない |
| D3a `deletion-confirmations.ts` のファイルごと | **名前付きの継ぎ目で動かす** | `src/use-case/edit-document/deletion-confirmations.ts`（`UF-162` を `EditDocument` へ）。継ぎ目は `DeletionQuestion` | 決定 5・6 |
| D3b 表 T-050 の写しの一本化 | **動かす（写しを消す）** | `rowsLostWith` は `subtreeOf` を、`tasksLostWith` は `edit-task-group.ts` の歩きを使う。歩きの名は問い Q2 | `CR-554` の D3 が一本化まで求める。1.9 |
| D3c `CONFIRMATION_MANNER`・`ConfirmationQuestion`・`discardQuestionOf`（`QN-5`）・`OVERWRITE_QUESTION`（`QN-4`） | **動かさない** | 入口と `document-file-flow.ts` | 削除の問いではない（表 T-050 の外）。告げ方は表示の側 |

---

## 3. 継ぎ目と層

### 3.1 継ぎ目 —— 当てる体の依頼文にこのまま写すこと

| 継ぎ目 | 形 |
|---|---|
| D1a | `export function selectionWithinSchedule(selection: Selection, schedule: Schedule): Selection`（`selection.ts`）。本体・コメント（`see T-023c`、`TRAP: the shell compares selections by identity …`）は字句のまま。`import { taskByUid, type Schedule } from '../schedule/schedule'` |
| D1b | `export function selectionWithinDrawnRows(selection: Selection, geometry: ScheduleGeometry, layout: ScheduleLayout, schedule: Schedule, settings: DocumentSettings, isPreviewed: boolean): Selection`（`drawn-selection.ts`、入口 `item-hit-area.ts:25` の出し直しに足す）。本体は字句のまま |
| D2a | `screen-frame.ts` が `export interface HorizontalWhole { readonly fromContentX0: number; readonly width: number }`・`export interface VerticalWhole { readonly fromContentY0: number; readonly height: number }` と 3 つの関数を持つ。署名は今のまま（`scrollExtentOf` の戻り値は `ScreenViewReadings['scrollExtent']`）。入口 `screen-renderer.ts` が名を出し直す。⭐ `input-command-translator.ts:140`・`:144` の行内の型を、この 2 つの名に置き換える（型だけ。実行時の差は 0） |
| D3a | `export interface DeletionQuestion { readonly question: 'QN-1' \| 'QN-2' \| 'QN-3' \| 'QN-10'; readonly items: readonly { readonly name: string \| null; readonly isShownOnAnotherRow: boolean }[] }`。`confirmationOwedBy(commands, held, asked: DeletionQuestion['question'] \| undefined): DeletionQuestion \| null`、`confirmationOwedByResourceDeletion(uids, held): DeletionQuestion \| null` —— `return { question, items }`（`manner` を持たない）。シェルの 2 か所は同じ行の中で `question: { manner: CONFIRMATION_MANNER, ...owedQuestion }` と書く（キーの順は `manner`・`question`・`items` で、今の値と同じ）。⛔ 行を増やさない（検査 60 の `carryOutAction`・`answerSettledEntry`） |
| D3b | 歩きは `edit-task-group.ts` に 1 本だけ置いて公開し、`deletion-confirmations.ts` は `subtreeOf` とその歩きを `./edit-task-group` から取り込む（向きは 1 つ、兄弟の輪は 0）。`rowsLostWith` と `tasksLostWith` の本体と、その上の `TRAP` は消える |

### 3.2 足す辺と、退けた置き場（`components.json` の 143 辺に輪の探索を掛けた）

| 辺 | 判定 | 輪 |
|---|---|---|
| `Selection` → `Schedule` | 足す（W1） | 無し |
| `ItemHitArea` → `Selection` | 足す（W1、型だけ） | 無し |
| `ItemHitArea` → `Schedule` | 足す（W1、型だけ） | 無し |
| `ItemHitArea` → `ScheduleLayout` | 足す（W1、型だけ） | 無し |
| `ItemHitArea` → `DocumentSettings` | 足す（W1、型だけ） | 無し |
| `ScreenRenderer` → `ScheduleLayout`・`ScreenRegions` | 既に在る（W2 は説明の字だけ直す） | — |
| `EditDocument` → `Document`・`Schedule` | 既に在る（W3） | — |
| `ScreenRegions` → `ScheduleLayout`（D2 を `ScreenRegions` へ置く案） | 退ける | **在る**（`ScheduleLayout` → `ScreenRegions`） |
| `ScreenRenderer` → `InputCommandTranslator`（決定 4 を覆す案） | 退ける | **在る** |
| `EditDocument` → `AdvanceScreenSession`（`FileFlowQuestion` をそのまま返す案） | 退ける | **在る** |
| `Selection` → `ScheduleGeometry`（D1b を `Selection` へ置く案） | 退ける | **在る** |
| `AdvanceScreenSession` → `Schedule`（D1a を `selection-values.ts` へ置く案） | 退ける（輪は無いが持ち主でない。決定 1） | 無し |

測り方: `docs/spec/_source/components.json` の `edges` から有向グラフを作り、足す辺ごとに「行き先から出どころへ届くか」を深さ優先で調べた（スクリプトはセッションの一時フォルダ、木には無い）。

---

## 4. 書き直す所（仕様。当てる体がそのまま使う文）

⛔ すべて `docs/spec/05-07-design.md` と `docs/spec/_source/components.json`。各オブジェクトを 1 度だけ書く。行番号は `566bf187`。

| E | 波 | 対象 | 旧 → 新 |
|---|---|---|---|
| E-01 | W1 | `components.json` の `edges` | 5 本を足す（3.2）。`label`/`description`: `Selection`→`Schedule` = "schedule data" / "asks whether the schedule still holds a selected object"・`ItemHitArea`→`Selection` = "selection type" / "narrows the selection to what is drawn"・`ItemHitArea`→`Schedule` = "row members" / "reads which row each task sits on"・`ItemHitArea`→`ScheduleLayout` = "laid-out rows" / "reads which rows the layout left out"・`ItemHitArea`→`DocumentSettings` = "pinned rows" / "reads the pinned rows"。⭐ `npm run gen:components`（draw.io の CLI が要る）で図を刷り直す |
| E-02 | W1 | 表 T-062 の `CP-32`（`:137`） | 事項の欄の「選ばれている対象の集合と、選んだ順序。<br>文書に保存しない」の後に「。<br>文書に無くなった対象を指さない（`FR-081` の結び）」を足し、正の欄の末に「 / 表 T-023c の結び」を足す |
| E-03 | W1 | 表 T-064 の `PI-32`（`:618`） | 末に「 ／ `selectionWithinSchedule`（文書に無くなった対象を外した選択を答える —— `FR-081` の結びの「文書に実在する対象だけを指すこと」。<br>選んだ順序（`SL-7b`）は保ち、外すものが無ければ同じ値を返す。<br>⭐ `SingleHtmlShell` が、書き込みが着地するたびに 1 か所で刈るために公開した —— 消える入口ごとに落とさないことは同じ結びが定める）」 |
| E-04 | W1 | 表 T-064 の `PI-7`（`:595`） | 末に「 ／ `selectionWithinDrawnRows`（`selectionWithinDrawn` の答えに、表 T-023c が名指さない行 —— ピン止めの帯に入りきらない行（`FR-098`）と、段数の安全弁（表 T-014 の `ST-7`）が置かなかった行 —— のタスクを戻した選択を答える。<br>掴んで動かす間の下書きの絵では絞らない。<br>⭐ `SingleHtmlShell` が、フレームごとに組んだ配置と幾何から 1 度だけ刈るために公開した）」 |
| E-05 | W1 | 表 T-075 の `UF-169`（`:418`） | 責務の末に「<br>フレームで使う絞り込み（`selectionWithinDrawnRows`）は、表 T-023c が名指さない行のタスクを残し、掴んで動かす間の下書きの絵では絞らない」 |
| E-06 | W2 | `components.json` の `ScreenRenderer` → `ScheduleLayout` | `label` "label units" → "label units + content extent"、`description` の末に ", and reads the laid-out content the scrollbars span" |
| E-07 | W2 | 表 T-064 の `PI-37`（`:623`） | 末に「 ／ `horizontalWholeOf` ／ `verticalWholeOf`（つまみが表す全体を配置と各部の矩形から測る —— `GR-21` の「内容の範囲といま見えている範囲の和」。<br>⭐ `SingleHtmlShell` が押した時点の全体を覚えるために公開した。<br>覚えた値を読むのは `InputCommandTranslator` である（`FR-051`）） ／ `HorizontalWhole` ／ `VerticalWhole`（型。<br>その全体） ／ `scrollExtentOf`（配置と各部の矩形と全体から `ScreenViewReadings` のスクロールの範囲を答える。<br>縦の見えている高さはピン止めの帯の下の残り（`FR-098`））」 |
| E-08 | W2 | 表 T-075 の `UF-61`（`:512`） | 「割り付け（`FR-051` / `FR-052`）」の後に「、つまみが表す全体の測り（`GR-21` —— 内容の範囲といま見えている範囲の和。<br>押した時点の全体を保つのは値を持つ `SingleHtmlShell` である）」を挟む |
| E-09 | W3 | 表 T-064 の `PI-9`（`:597`） | 末に「 ／ `confirmationOwedBy`（削除の書き込みの束が 表 T-234 の問い（`QN-1`・`QN-2`・`QN-10`）を負うかを決め、負うなら消える `Task` の名を挙げた問いを返す —— 連鎖は 表 T-050 の `CD-1`・`CD-2`・`CD-6`） ／ `confirmationOwedByResourceDeletion`（担当者の削除が解く割当があるときの `QN-3` の問い —— `CD-5`） ／ `DeletionQuestion`（型。<br>その問いの行 ID と挙げる名。<br>告げ方（表 T-037 の `NT-7`）は持たず、問いを立てる `SingleHtmlShell` が添える） ／ `<歩きの名>`（`Task` の集合に、`WBS` の子孫をすべて足した集合 —— `CD-1`。<br>⭐ `SingleHtmlShell` が取り込みで一緒に落ちるタスクの名を挙げるために公開した）」。`<歩きの名>` は問い Q2（仮に `wbsSubtreesOf`） |
| E-10 | W3 | 表 T-075 の `UF-162`（`:493`） | 行を `EditDocument` の群の末（`UF-18`、`:438` の後）へ移し、コンポーネントの欄を `SingleHtmlShell` → `EditDocument`、責務の末に「<br>告げ方（表 T-037 の `NT-7`）は持たない」を足す。行 ID は変えない |
| E-11 | W3 | 表 T-075 の `UF-10`（`:421`） | 「集約ごとの 8 ファイルを束ねて公開する」→「集約ごとの 8 ファイルと `deletion-confirmations.ts` を束ねて公開する」 |
| E-12 | W3 | 表 T-075 の `UF-48`（`:487`） | ① 「削除が負う問いの数え方は `deletion-confirmations.ts` に、」を消し、「…`copy-and-paste.ts` に問う。」の後に「<br>削除が負う問いを立てるかは `EditDocument`（`PI-9`）に問い、告げ方（`NT-7`）だけを添える。」を足す。② ⚠️ の文「—— セッションを 1 段進めることとフレームを計算して配ることが 1 つの周期に残り、出どころの別な 2 つ（表 T-023c の選択の刈り込み、`GR-21`・`SC-1` のスクロールの全体）も持つ。<br>内側の層へ移すまでの借りである」→「—— セッションを 1 段進めることとフレームを計算して配ることが 1 つの周期に残る。<br>2 つは多くの変更で共に書き換わってきたので、いまは 1 つの周期に置く」。⛔ 試験が字で読む 3 つの文（`tests/unit/uf-48-one-input-one-step.test.ts:25-29`）は触らない |
| E-13 | W3 | 表 T-063 の `UT-6`（`:335`） | ファイルの列から「`deletion-confirmations.ts` ／ 」を消す。「表 T-075 のとおり `deletion-confirmations.ts` は `pure`、`held-press-preview.ts` は」→「表 T-075 のとおり `held-press-preview.ts` は」。「削除が負う問いは 表 T-050 と 表 T-234 の削除の行が、」を消す |
| E-14 | W3 | 表 T-063 の `UT-2`（`:331`） | 「`edit-document.ts` と、集約ごとの 8 ファイル」→「`edit-document.ts` と、集約ごとの 8 ファイル ／ `deletion-confirmations.ts`」。「9 つとも同じである」→「10 とも同じである」。末に「<br>`deletion-confirmations.ts` は、削除が負う問い（表 T-050 と 表 T-234 の削除の行）が変わったときに書き直す —— 集約をまたいで数えるので、どの集約のファイルにも置かない」 |
| E-15 | W3 | 5.3 節の本文（`:253`） | 「`InputCommandTranslator` と `SingleHtmlShell` が同じ数でそれに次ぎ、`ScheduleLayout` がその次に来るが」→「`InputCommandTranslator`・`SingleHtmlShell`・`ScheduleLayout` の順にそれに次ぐが」（表 T-075 の数: `EditDocument` 18 → 19、`SingleHtmlShell` 15 → 14、`InputCommandTranslator` 15、`ScheduleLayout` 13。`grep` で表 T-075 の行をコンポーネントごとに数えた） |

**数の予測**（02 の 2 節）: `tables=4`（T-062・T-063・T-064・T-075）＋ 本文 1 か所 ／ `rows=12`（`CP-32`・`UT-2`・`UT-6`・`PI-7`・`PI-9`・`PI-32`・`PI-37`・`UF-10`・`UF-48`・`UF-61`・`UF-162`・`UF-169`）／ `uids=0` ／ `figures=3`（生成物 `fig-components`・`view-write`・`view-read`。原稿は `components.json` だけ）。
`impact.py`（`566bf187`）: 指す要求があるのは `UF-48`（1）・`PI-7`（`FR-009`）・`PI-37`（1）だけで、どれもメンバが増えても偽にならない。`UT-2` を指す 6 か所は「集約ごと」の形を指すだけで、数を写していない。
`induced.py`（上の 12 行 ＋ `T-023c`・`GR-21`・`T-050`・`T-234`）: 種 16、辺 12、閉路 0 ⇒ 1 つずつ書いてよい。

---

## 5. 照合器（W0 —— どの波より先に、分割前の木から作る）

⛔ 振る舞いを保つ証明は 3 段とする（`CR-554` の 15.6.13 の形）。照合器はセッションの一時フォルダに置き、木には入れない。

1. **字句の一致**: 動かす宣言ごとに、`566bf187` の本体と移した後の本体を、コメントと空白を除いた字句列で比べる（`comment-cleanup-identity-check` の方法）。許す違いは `export` の語、取り込みの文、D3a の `manner` の 2 行と型の名、D3b の本体だけ。
2. **値のバイト一致**: 分割前の木を `git archive 566bf187 src` で一時フォルダへ出し、非公開の関数にだけ `export` を足した写しを「前」とする。見本（`sample-schedule/*.json`・`startup-template.json`）ごとに、D1a は選べる対象の部分集合と文書に無い対象を混ぜた選択 × 削除の後の文書、D1b は 2 つの画面寸法 × 行の軸の倍率 × 畳み × ピン止め（溢れを含む）× 下書きの有無、D2 は同じ配置 × 押した全体（無し・横・縦）× スクロール位置、D3 は各タスク・行・担当者の削除（1 つと 2 つ）× `asked`（無し・`QN-10`）と、乱数の森（重複 ID と輪を含む）での `rowsLostWith` 対 `subtreeOf`・歩き同士を、JSON の行で比べる。D3a の「後」は、シェルと同じく `{ manner: CONFIRMATION_MANNER, ...owed }` を組んでから比べる。
3. **シェルの走行**: `frameLoop` を公開のメンバで動かし（選ぶ・畳む・隠す・倍率・つまみを引く・行を消す・担当者を消す）、`ScreenView` の JSON を比べる。

感度: 動かした関数ごとに 1 か所わざと壊し（`scheduleHolds` の `statusLine`・`selectionWithinDrawnRows` の戻すタスク・`horizontalWholeOf` の `min`・`visibleHeightOf`・`confirmationOwedBy` の問いの選び・行の部分木の歩き）、6 件すべてが赤になることを確かめてから使う。

---

## 6. 波 —— 1 波 1 コミット、順に（並べない）

⛔ 3 つの波はどれも `frame-loop.ts` と `05-07-design.md` に触れるので、並行させない（`parallel-bodies-collide`）。各波の出口は、照合器のバイト一致・`npm run typecheck`・`npm run test`・`npm run gen:check`・`rm -rf output && npm run check` を前に立つ者が回し直すこと。

| 波 | 書き換えるファイル | 仕様 |
|---|---|---|
| W0 | （木には書かない）照合器 | — |
| W1（D1） | `src/entity/document-model/selection/selection.ts`・`src/entity/layout-engine/item-hit-area/drawn-selection.ts`・`item-hit-area.ts`・`src/framework/single-html-shell/frame-loop.ts` | E-01〜E-05 と生成の図 |
| W2（D2） | `src/adapter/screen-renderer/screen-frame.ts`・`screen-renderer.ts`・`src/adapter/input-command-translator/input-command-translator.ts`（型だけ）・`frame-loop.ts` | E-06〜E-08 と生成の図 |
| W3（D3） | `git mv src/framework/single-html-shell/deletion-confirmations.ts src/use-case/edit-document/deletion-confirmations.ts`・`edit-document.ts`・`edit-task-group.ts`・`frame-loop.ts`・`document-file-flow.ts` | E-09〜E-15 |

⭐ W3 の中は 2 段で照合する: 移しただけの段（字句の一致）→ 写しを消した段（値のバイト一致）。コミットは 1 つ（`PI-9` と `UF-162` を 1 度だけ書くため）。
⭐ 動かした関数を指すほかのファイルのコメント（「`frame-loop.ts` にある」の類）は、各波で `grep` して直す（`CR-554` の学び ②）。`566bf187` で測った限り、`src/`・`tests/` のコメントで名指すのは `tests/unit/t-050-a-document-always-holds-one-row.test.ts:28`（`confirmationOwedBy` の名だけで、置き場は言わない）の 1 か所だけである。

---

## 7. 基準線への効き（予測。波ごとに測り直す）

| 検査 | W1 | W2 | W3 | 根拠 |
|---|---|---|---|---|
| 26b 表 T-064 のメンバ | +2 | +5 | +4 | 同じコミットで表と `export` を足すので、`published-members-baseline.txt` は動かない |
| 26b `crossing-names-baseline.txt` | 0 | 0 | **−1**（`ScreenRenderer \| ConfirmationItem`） | 1.3。残すと指す先の無い行で赤になる ⇒ 同じコミットで消す（下げる向き） |
| 59 図の辺 | +5 辺（143 → 148） | 0 | 0 | 3.2。基準線は無い |
| 19 層 | 緑 | 緑 | 緑 | 3.2 |
| 18 ユニットの木 | 0 | 0 | 緑（`UF-162` の道が変わる。E-10 と同じコミット） | — |
| 60 関数の大きさ | 0 | 0 | 0 | 動かす関数は帯の外。`carryOutAction`・`answerSettledEntry`・`editTaskGroup` の行数は変えない（3.1） |
| 61 モジュールの状態 | 0 | 0 | 0 | 1.4 |
| 45 繰り返しの式 | 0 | 0 | **83 → 82 の見込み** | 字句の同じ歩き 2 本が 1 本になる。数は波で測る。下がれば `JDG-520` で下げる |
| 55 コメント | 0 | 0 | 0 | コメントは宣言と共に動く。W3 で `TRAP` が 1 つ消える |
| `gen:check`（`gen:components:check`） | 図を刷り直す | 図を刷り直す | 0 | E-01・E-06 |

⛔ 上げる向きの基準線の書き換えは予測していない。出たら、`JDG-565`（利用者が戻るまで）でも理由を書いてから上げ、報告で名指す。

---

## 8. 利用者に問うこと（⏳ 利用者は夕方まで不在。戻せる方を仮に選んで進めてよい）

### 問い Q1 —— 文書に無くなった対象の刈り込みの置き場

`selectionWithinSchedule`（選んでいたタスクや注記が削除・取り消しで文書から消えたとき、それを選択から外す）をどこに置くか。

| 案 | 置き場 | 得 | 失 |
|---|---|---|---|
| A（推奨・仮に採る） | `Entity` の `Selection`（`selection.ts`、`UF-55`） | 表 T-075 で `FR-081` を負う持ち主。`LY-1` が「選択の不変条件」を置く層。辺 1 本 | 依頼文の読み（use-case の側）と違う |
| B | `UseCase` の `selection-values.ts`（`UF-122`、状態機械の選択の領域） | 状態機械の近くに見える | 持ち主でない。`AdvanceScreenSession` → `Schedule` の辺が要る。状態機械は文書を持たないので、結局シェルが文書を渡して呼ぶ |

### 問い Q2 —— 1 本にした「`WBS` の子孫をたどる歩き」の名

削除で一緒に消えるタスクを数える歩きと、`editTaskGroup` の削除・行の写しが使う歩きは、字句が同じ 2 本である（1.3）。1 本にしたときの公開名を選ぶ。

| 案 | 名 | 読み |
|---|---|---|
| a | `tasksLostWith`（今の公開名を保つ） | 行を写す所（`edit-task-group.ts:268`）で「失う」と読めて偽になる |
| b | `withWbsDescendants`（今の非公開名） | 前置詞句で、`R2` の「`pure` のクエリは名詞句」に合わない |
| c（推奨・仮に採る） | `wbsSubtreesOf` | 名詞句。既にある `wbsSubtreeOf`（`edit-task.ts:197`、1 つの根）と同じ語の族。3 本目の写しを畳むとき（`DFC-990`）にも名が変わらない |

---

## 9. 台帳

| 台帳 | 行 |
|---|---|
| `docs/development-records/defects.md` | `DFC-968`（`対応方針` の欄の `CR-568` を「起草済み、波 W3」へ。状態は `実装待ち` のまま）・`DFC-990`（3 本目の `WBS` の歩き）・`DFC-991`（`drawnRowBoxesOf` もシェルの `pure`）・`DFC-992`（`DrawnChoice`・`ChosenItem` の 2 つ目の綴り） |
| `docs/development-records/rulings.md` | 書かない（本書は利用者の言葉を受けていない。Q1・Q2 の答えが来たら `JDG-566` から起こす） |

---

## 10. ⛔ この変更でやらないこと

- 公開名の改名（Q2 の 1 本を除く）、`CR-554` の D7（品詞に合わない名）・D4〜D6・D8〜D12。
- `frameLoop` の閉包を縮めること（`JDG-440`）。
- 状態機械の升・出来事（`selectionPruned` の源の行は変えない）。
- 画面の振る舞い、`dist/index.html`。
- `drawnRowBoxesOf`（`DFC-991`）と `wbsSubtreeOf`（`DFC-990`）の移し替え。
