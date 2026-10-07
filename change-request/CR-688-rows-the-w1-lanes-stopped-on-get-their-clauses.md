# CR-688 —— 波 W1 の持ち場が止めた行に、仕様の置き場を与える

> 起草の状態: 当てた（2026-10-04 夜、調整役の統合点 `e5649ffe` から早送りした作業木。持ち場 W0b-C）。起草と当てを同じ作業木で行った。`src/` は生成物だけが動いた（4.1 節）。手で書くコードは後の持ち場へ渡す（5 節）。
> ID の帯: 番号 `CR-688`、裁定の帯 `JDG-1546`〜`JDG-1547`、台帳の帯 `DFC-2160`〜`DFC-2161`、`PND-784` は調整役から受けた（13 節で、木のどこにも無いことを測った）。使ったのは `DFC-2160`・`DFC-2161` の 2 つ（新しい台帳の行）。`JDG-1546`・`JDG-1547`・`PND-784` は使っていない —— 新しい利用者の言葉は無く、問いは 11 節に置いた。
> 仕様の新しい識別子（当てる直前に `e5649ffe` で測った）: 表 T-033 の `EX-16`（`EX-15` が最大だった）、表 T-032 の `MG-14`（`MG-13` が最大）、表 T-233 の `RS-71`〜`RS-73`（`RS-70` が最大）。表 T-064 のメンバ `arrowHeadOf`・`selectedLinksOf`（`PI-6`）・`drawnRowBoxesOf`（`PI-37`）。表 T-292 の状態 `createdNameEnded` とガード `isNameField`、表 T-290 の運ぶ値 `missingTaskNames` とガード `hasTasksToReport`（`hasDroppedTasks` を置き換える）。
> 持ち場の行: `DFC-563` の ②・`DFC-564`・`DFC-1021`・`DFC-640`・`DFC-701`・`DFC-991`・`DFC-558`（`docs/development-records/defects.md` の各行の、2026-10-04 の W1 の持ち場が止めた注）。新しい行: `DFC-2160`（`marquee.ts` と `dependency-end.ts` がピン止めの帯の切りを読まない）・`DFC-2161`（帯の規則 `isLineScrolling` と `isInTheBand` が 2 か所にある）。
> ⚠️ `CR-676`（W0b-A）と `CR-677`（W0b-B）が同じ時に `docs/spec` を当てる。本書は上の行が名指す所だけを書き換えた。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（全文は `docs/development-records/rulings.md` の該当行）

| 出どころ | 要旨 | 本書での扱い |
|---|---|---|
| `JDG-268`（2026-09-19） | 持ち回りの要素の中の子の順（`DFC-563`）は、書き出すときにスキーマの順に並べ直す（`EX-10`） | 保つ。`EX-10` は名前の違う兄弟を並べ直す。同じ名前の兄弟（`ExtendedAttribute` の列）の順はスキーマが決めないので、`EX-16` で取り込んだ位置を持つ（E-01、11 節の問い 1） |
| `JDG-922` の #31（2026-10-01、「他は、全部推奨どおり」） | `DFC-558`・`DFC-1019` を直す | E-07 の辺を足す |
| 2026-09-13 の裁定（`DFC-701` の行の期待値の欄） | `DFC-701` は「どちらが正か」を行の中では決めない | `FR-091` の文（「作った直後の名称を `Enter` で確定したとき」）を正に採り、表 T-292 に当てた（E-04）。11 節の問い 3 で利用者に確かめる |

### 0.2 裁定の鎖（rulings.md を同じ語と似た語で引いた）

| 引いた語 | 当たった行 | 本書との関係 |
|---|---|---|
| `DFC-563`・フェード・位置 | `JDG-255`〜`JDG-268` | `JDG-268` は名前の違う兄弟の順（`EX-10`）の答えであり、覆さない |
| `DFC-558`・`AG-11`・対話欄 | `JDG-922`・`JDG-300` | 直すことは決まっている。置き場（どの辺で呼ぶか）は決まっていなかった |
| `DFC-564`・`DFC-1021`・`DFC-640`・`DFC-701`・`DFC-991`・`MG-7`・`MG-11`・`FR-091`・`U-62` | 0 件 | —— |

⭐ 本書が新たに「覆された」と印す行は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-004`**（外部 WBS マスタとの往復） —— 編集していない MSPDI の往復でフェードの値が動かない（`DFC-563`）、一部だけ編集した書き出しで何が変わってよいかが決まる（`DFC-564`）、合流の後に上書き・残した・届かなかったものが告げられる（`DFC-1021`）。
⭐ **`GL-007`**（AI と話しながら作る） —— 対話欄で人が確定した発話が対話の記録に届く道が図に載る（`DFC-558`）。
ほかの 3 行（`DFC-640`・`DFC-701`・`DFC-991`）は、同じ規則を 2 か所に持つ・作った直後の `Enter` の範囲を正す掃除である。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R2.21`・`R2.22`（判じは 1 か所、写さずに公開する）** —— 依存線の矢じりと選んだ線の鍵（`DFC-640`）、行見出しの箱（`DFC-991`）を、表 T-064 に名を載せて 1 か所から読む（E-05・E-06）。新しい台帳の行 `DFC-2161`（帯の規則）も同じ形である。
- **`R1.3`（同じことを 2 か所で言わない）** —— 合流の後の告げ方は 表 T-032 の新しい行 `MG-14` の 1 か所に置き、`MG-7`・`MG-11` は指すだけにした（E-03）。
- **`R1.4`（境界）** —— `EX-16`: 列が `null` になったとき（印を書かない）と、印の無い `Task` に値を書くとき（後ろへ）。`MG-14`: 件数が 0 の理由（告げない）、重ねと置き換え（当たらない）。表 T-292: 名前の欄を `Esc` で終えたとき（確定と同じ扱い）。
- **`R2.1`（命名）** —— `createdNameEnded`（名前付けの中の「名前の編集が終わった」状態。隣の `namingCreatedTask` と同じ語の組み）、`isNameField`（真偽を返す問い）、`missingTaskNames`（`MG-11` の「届かなかった」、隣の `droppedTaskNames` と対）、`hasTasksToReport`（`U-62` に並べる名前が 1 つでもあるか）。表 T-064 の 3 つは `src/` に既に在る名のまま。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | フェード値の位置は、値を抜いた印を `carryElements` に残して持つ（`DFC-563` の推奨 A） | 保存する文書の形（`carryElements`、表 T-053）の中で持てる。値は列だけが持ち、2 か所に持たない | 印は `DF-2`（原形のまま）の例外になる。もう 1 つの道（往復の比べで `ExtendedAttribute` の順を比べない）は 11 節の問い 1 |
| X-2 | `EX-2` の「値」に、表 T-059 の `DV-4`〜`DV-7`（`ID`・`OutlineLevel`・`OutlineNumber`・`Summary`）を含めない | 4 つは 1 つのタスクの値ではなく、並びと木の値である。交換相手も `ID` を行の番号として書き出すたびに振り直す | 取込元が連番でない `ID` を書いていた文書は、編集しない往復でも `ID` が連番に変わる（`DFC-564` の注） |
| X-3 | 合流の後の告げは、件数で済むもの（上書き `RS-71`・残した `RS-72`）を通知の欄へ、名前が要るもの（届かなかった `RS-73`）を `Import Report`（`U-62`）へ | `MG-11` は「一覧で示す」、`MG-7` は「通知するだけ」。`NT-9` は通知を 1 行に限る。`U-62` は既に名前を並べる面である | `U-62` は 2 つの理由を持つ面になる |
| X-4 | 届かなかった `Task` を「選んで消す」は、日程表のいつもの選択と削除で行う。`U-62` に選ぶ入口を足さない | `FR-022` は消すことを禁じ、消すのは人である。入口を足すと面が答えを持つことになり、`U-62` の「答えを求めない」が崩れる | 名前の多い一覧から 1 つずつ探して消す。もう 1 つの道は 11 節の問い 2 |
| X-5 | 通知の件数を数えるのは合流（表 T-024a の `OP-3`）だけ。重ねと置き換えは告げない | 重ねは文書の `Task` を変えず（`FR-015`）、置き換えは対応付けを持たない | 無い |
| X-6 | 作った直後の `Enter` で閉じるのは、名前の欄（`PR-1`）の編集が終わった後の `Enter` だけ。名前の欄を `Esc` で終えた後の `Enter` も閉じる | `FR-091` の「名称を `Enter` で確定したとき」。`Esc` の後も名前の欄の値は着地しており、次の `Enter` はそれを確かめる押下と読める | 担当（`PR-16`）へ移って `Enter` を押しても、パネルは閉じず、選択も解けない（今のコードと変わる） |
| X-7 | 行の名前は 表 T-292 の升だけが読む（`IF-9` の MUST）ので、`Enter` の判じは状態 `createdNameEnded` に置き、`SingleHtmlShell` は状態を読むだけにする | `IF-9`「行 ID を読むのは 表 T-292 の升（ガードと運ぶ値の書き換え）だけ」 | 状態が 1 つ増える |
| X-8 | 対話欄の発話は `SingleHtmlShell` が `PostDialogueMessage` を呼んで積む（辺を足す）。`ScreenRenderer` の辺は型を読む辺として残し、言葉を直す | `SF-10`「シェルが持って引数で渡す」。`screen-renderer.ts`（`UF-60`）は `pure` | 図の辺が 1 本増える |
| X-9 | `drawnRowBoxesOf` の置き場は `ScreenRenderer`（`DFC-991` の案 ①） | `FR-098` を負うのは 表 T-075 の `UF-63`（`row-title-panel.ts`） | 無い |
| X-10 | 矢じりと選んだ線の鍵は、当たり判定（`ScheduleGeometry`、entity）の名を描く側（adapter）が読む（`DFC-640` の案 ①） | 依存の向き（entity ← adapter） | 描く側の矢じりは `marker` から `arrowHeadOf` の 3 点を読む形に変わる（W2 の後の持ち場） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 | 行 |
|---|---|---|---|
| フェード値の位置 | `docs/spec/01-04-requirements.md` の 表 T-033 に `EX-16` | E-01 | `DFC-563` ② |
| 編集していないタスクの `ID` と木の値 | 同 表 T-033 の `EX-2` | E-02 | `DFC-564` |
| 合流の後の告げ | 同 表 T-032 の `MG-7`・`MG-11`・新しい `MG-14`、表 T-233 の `RS-71`〜`RS-73`、`_source/display-words.json`、`_assets/tbl-glossary.md` の `U-62`、`_source/state-machines.json` の 表 T-290 | E-03 | `DFC-1021` |
| 作った直後の `Enter` | `_source/state-machines.json` の 表 T-292・表 T-280 の `createdNameSettled`・表 T-283 の `RG-10` | E-04 | `DFC-701` |
| 矢じりと選んだ線の鍵 | `_source/published-entries.json` の `PI-6` | E-05 | `DFC-640` |
| 行見出しの箱 | 同 `PI-37` | E-06 | `DFC-991` |
| 対話欄の発話 | `_source/components.json` の辺、`05-07-design.md` の 表 T-249 の `SF-10` | E-07 | `DFC-558` |
| 台帳・変更履歴 | `defects.md`（9 行）・`changelog.md` 3.91 | E-08 | —— |

**数**: 表の行 +5（`EX-16`・`MG-14`・`RS-71`〜`RS-73`）。要求の増減 0。図の辺 +1。設定値 0。辞書の項 +3。表 T-064 のメンバ +3。状態 +1（表 T-292）。

---

## 2. 新しい識別子

| 識別子 | 何 | 測り方（`e5649ffe`） |
|---|---|---|
| `EX-16` | 表 T-033 の行「取り込んだフェード値の位置」 | `grep -rhoE "EX-[0-9]+" docs/spec` の最大が `EX-15` |
| `MG-14` | 表 T-032 の行「合流が着地した」 | `MG-` の最大が `MG-13`（`MG-8a`・`MG-9a` を除く数の最大） |
| `RS-71`・`RS-72`・`RS-73` | 表 T-233 の行（上書き・残した・届かなかった） | `RS-` の最大が `RS-70`。`change-request/` にも `RS-71` 以上は無い |
| `createdNameEnded`・`isNameField`・`missingTaskNames`・`hasTasksToReport` | 状態・ガード・運ぶ値 | `grep -rn` が `docs` `src` `tests` `tools` で 0 件 |
| `arrowHeadOf`・`selectedLinksOf`・`drawnRowBoxesOf` | 表 T-064 のメンバ | `src/` に既に在る名（`dependency-route.ts`・`frame-loop.ts`）。表 T-064 には 0 件 |

⚠️ `CR-676` は 表 T-351 の `WL-`、`CR-677` は `S-517`・`S-518`・`K-141`・`CM-88`・`CM-89`・`IX-12`〜`IX-17`・`WY-4` を取る —— 本書の識別子と重ならない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消すもの | 代わり |
|---|---|---|
| 表 T-283 の `RG-10` | 段の状態 `createdTaskNamingStateMachine.namingCreatedTask` | `createdTaskNamingStateMachine.createdNameEnded`（E-04） |
| 表 T-280 の `createdNameSettled` の「どこから来るか」 | 「作った直後の名前の `Enter`」 | 「作った直後の名前の欄の編集が終わった後の `Enter`」（E-04） |
| 表 T-290 の根の升 | ガード `hasDroppedTasks`（2 か所） | `hasTasksToReport`（E-03） |
| `components.json` の辺 `ScreenRenderer → PostDialogueMessage` | 言葉「confirmed utterance」「hands over the utterance a person confirmed in the dialogue field」 | 「utterance shape」「shapes the input … as the utterance PostDialogueMessage takes」（E-07）。渡すのは新しい辺 `SingleHtmlShell → PostDialogueMessage` |

⭐ 消さないもの: `EX-10` と `JDG-268` の並べ直し。`FR-023` の `RS-50`（落とした名前）。`FR-091` の本文。`IF-9` の「行 ID を読むのは 表 T-292 の升だけ」。

---

## 4. 書き直す所（当てた文）

**E-01** 表 T-033 の `EX-15` の下に `EX-16`: 取り込んだフェード日数の値（`EX-6` の見分け方でフェードの枠と分かった `Task/ExtendedAttribute`）は、取り込んだときの位置へ書き戻す（MUST）。位置は、値（`Value`）を持たない同じ名前の印を `carryElements` に残して持つ（MUST、出現順 `AT-123` と `FieldID` だけ）。書き出すときは印の位置へ列（`AT-40`／`AT-41`）の値を書く（MUST）。列が `null` なら印を書かない（MUST NOT）。印の無い `Task` は持ち回る同じ名前の兄弟の後ろ。印は `DF-2` の例外（全文は表の行）。

**E-02** 表 T-033 の `EX-2` の後ろに: 表 T-059 の `DV-4`（`ID`）・`DV-5`（`OutlineLevel`）・`DV-6`（`OutlineNumber`）・`DV-7`（`Summary`）は本行の「値」に当たらない —— 文書の並びと木の値であり、行を足すか動かすか親を変えれば、編集していないタスクのこれらも変わる。取込元が並びと木のとおりに書いていれば、編集していない往復でも同じ値になる（`FR-021`）。

**E-03** 合流の後の告げ:

- 表 T-032 の `MG-14`（新）: 合流が着地したら、上書きした `Task`（`MG-8`／`MG-8a`）を `RS-71`、取込側に無く残した `Task`（`MG-7`）を `RS-72`、前回は届いていて今回届かなかった `Task`（`MG-11`）を `RS-73` で告げる（MUST）。前の 2 つは件数を添えて通知の欄（`U-57`）へ、`RS-73` は名前を並べて `U-62` へ。件数 0 は告げない（MUST NOT）。届かなかった `Task` を `GRS` が消さない（MUST NOT、`FR-022`）—— 人が日程表で選んで消す（`FR-032`）。重ねと置き換えは当たらない。
- `MG-7`・`MG-11` の末尾に「告げ方（一覧の示し方）は `MG-14` に従う」。
- 表 T-233 に `RS-71`（`NT-3`、件数）・`RS-72`（`NT-5`、件数）・`RS-73`（`NT-5`、通知の欄に立てない —— `U-62` が運ぶ）。正はどれも `MG-14`。
- 辞書（`_source/display-words.json`）に 3 つの項（語と次の一手、日英）。
- `_assets/tbl-glossary.md` の `U-62`: 落とした `Task` の名前と、合流で届かなかった `Task` の名前を理由ごとに並べる面。立てる規則は `FR-023` と `MG-14`、理由は `RS-50` と `RS-73`。
- 表 T-290（`fileFlow`）: 根と `documentOpenLanded` が `missingTaskNames`（`RS-73`・`MG-11`）を運ぶ。`U-62` を立てるガードを `hasTasksToReport`（`droppedTaskNames` か `missingTaskNames` の一方でも空でない）に替え、面を閉じたら両方を空にする。

**E-04** 作った直後の `Enter`（表 T-292・表 T-280・表 T-283）:

- `createdTaskNamingStateMachine` に状態 `createdNameEnded`（`createdTaskUid` を運ぶ）を足す。
- `fieldEditEnded`: `namingCreatedTask` → `createdNameEnded` [`isNameField`]（終わった欄が `PR-1`。確定でも取り消しでも同じ）。
- `fieldEditBegan`: `createdNameEnded` → `namingCreatedTask`（欄の編集がまた始まった）。
- `creationLanded`: `createdNameEnded` → `namingCreatedTask` [`isCreatedTask`]。`choiceMoved`: `createdNameEnded` → `idle`。
- 表 T-280 の `createdNameSettled` は、`createdNameEnded` に居るときの `Enter`。ほかの欄の編集を終えた `Enter` では送らない。表 T-283 の `RG-10` の段の状態を `createdNameEnded` にする。
- `fieldEditEnded` の根拠の行に `FR-091` を足す。

**E-05** 表 T-064 の `PI-6`（`ScheduleGeometry`）に `arrowHeadOf`（矢じりの 3 点 —— `S-19` の高さ、`S-300` の底辺）と `selectedLinksOf`（選んだ依存線 `SL-8` の鍵の集合）。どちらも「`SvgRenderer` と当たり判定が同じ 1 つを読む」ために公開する。

**E-06** 表 T-064 の `PI-37`（`ScreenRenderer`）に `drawnRowBoxesOf`（描いた行ごとの行見出しの矩形。`SC-1`・`FR-098`）。`FR-098` を負う `UF-63` が測り、`SingleHtmlShell` は運ぶだけ。

**E-07** `components.json` に辺 `SingleHtmlShell → PostDialogueMessage`（「confirmed utterance」）。辺 `ScreenRenderer → PostDialogueMessage` は型を読む辺として言葉を直す。表 T-249 の `SF-10` に「対話欄で人が確定した発話も同じ経路で積む —— シェルが `dialogueMessageFromInput`（`PI-37`）で発話の形にし、持っている対話の記録を引数にして `PostDialogueMessage` を呼ぶ（`AG-11`）。描き手（`UF-60`）は `pure` なので積まない」。

**E-08** 台帳（12 節）と変更履歴 3.91（合流で 3.88 から振り直した）（並行した CR と版が重なれば調整役が振り直す）。

### 4.1 生成物

`npm run gen` が `_assets/tbl-state-machines.md`・`_assets/tbl-published-entries.md`・`_assets/tbl-row-id-prefixes.md`・`docs/review/public-entry-index.md`・`src/adapter/screen-renderer/display-words.json`・`src/use-case/advance-screen-session/field-entry-values.ts` と `file-flow-values.ts` の生成の区画を作り直した。`python docs/spec/_source/build.py` が `overview.json`・`view-startup.drawio`・`_assets/view-startup.svg`・`docs/review/components/components.md` を作り直した。手では触れていない。

---

## 5. 継ぎ目（コードは本書の外 —— 後の持ち場へ渡す）

| 行 | コード | すること | 条項 |
|---|---|---|---|
| `DFC-563` ② | `src/adapter/document-codec/mspdi-codec.ts`（取り込み）・`mspdi-fade-frames.ts`（`writtenFadeValues` `:247`、`DEVIATION` `:245`）・`mspdi-child-placement.ts` | 取り込みでフェード値の要素の位置に印（`ExtendedAttribute`、`FieldID` だけ）を `carryElements` へ残し、書き出しで印の位置へ値を置く。`null` なら何も書かない。`DEVIATION` 注記を消す | `EX-16` |
| `DFC-564` | `src/adapter/document-codec/mspdi-codec.ts:1164` | `DEVIATION` 注記を消すだけ（振る舞いは `EX-2` と合う） | `EX-2` |
| `DFC-1021` | `src/use-case/import-document/import-document.ts`（`ImportReport` の `overwrittenTaskUids`・`taskUidsOnlyInCurrent`・`taskUidsMissingSinceLastImport`）・`src/framework/single-html-shell/document-file-flow.ts`・`src/use-case/advance-screen-session/file-flow-values.ts`・`src/framework/dom-screen-surface/open-modals-drawing.ts` | 合流の着地で `RS-71`・`RS-72` を件数付きで告げ、`missingTaskNames` を `documentOpenLanded` に載せて `U-62` に理由ごとに並べる。`hasDroppedTasks` を `hasTasksToReport` に替える | `MG-14`・表 T-290 |
| `DFC-701` | `src/use-case/advance-screen-session/field-entry-values.ts`・`src/framework/single-html-shell/field-entry.ts`・`frame-loop.ts`（`settleOnScreen` `:3251-3258`） | `createdNameEnded` の升を書き、殻は `createdNameEnded` に居るときだけ `createdNameSettled` を送る | 表 T-292・`RG-10` |
| `DFC-640` | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts`（入口）・`dependency-route.ts`・`src/adapter/svg-renderer/schedule-task-figures.ts`（`dependencyArrowSvg` `:498`・`selectedLinksOfMarks` `:874`） | 2 つを入口から出し、描く側の写しを消す | `PI-6` |
| `DFC-991` | `frame-loop.ts`（`drawnRowBoxesOf`）・`src/adapter/screen-renderer/row-title-panel.ts`・`screen-renderer.ts` | 描き手へ移し、入口から出す。呼び手 3 つは入口を読む | `PI-37` |
| `DFC-558` | `frame-loop.ts`・`src/framework/dom-screen-surface/dialogue-field-drawing.ts`（`readDialogueInput`） | 確定した入力を `dialogueMessageFromInput` で発話にし、`postDialogueMessage` を呼ぶ | `SF-10`・`AG-11` |

⚠️ 当てた時点で次が赤である（どれもコードを待つ。本書の外の持ち場の所有）:

- `tsc`: `file-flow-values.ts` の手書きの型（`FileFlowValuesStateCarried`・`FileFlowValuesEventCarried`・初期の値）に `missingTaskNames` が無い（3 件）、`document-file-flow.ts:548` が `missingTaskNames` を渡さない（1 件）。
- 検査 26b: 表 T-064 の 3 つの名（`arrowHeadOf`・`selectedLinksOf` は `dependency-route.ts` に在るが入口から出ていない、`drawnRowBoxesOf` は殻に在る）。
- `state-machine-file-flow`・`state-machine-field-entry` の契約試験（升が増えた）。

---

## 6. グラフ（`e5649ffe`、`impact.py`）

- `EX-2`: 要求 4 件 / 参照 7 箇所（`FR-010`・`FR-011`・`FR-054`・`FR-057`）—— どれも「編集していないタスクを書き換えない」の側で読み、`ID` と木の値を名指す所は無い。
- `EX-6`: 要求 0 件 / 参照 5 箇所。`EX-10`: 要求 2 件 / 参照 9 箇所。`FR-021`: 要求 15 件 / 参照 37 箇所 —— 往復の比べ方（表 T-228）は変えない。
- `MG-7`: 0 / 0。`MG-11`: 要求 2 件 / 参照 3 箇所（`FR-056`・`FR-076` の `NT-5`）。`FR-056`: 要求 2 件 / 参照 8 箇所。`U-62`: 要求 4 件 / 参照 11 箇所（`FR-152` の `UZ-13`・`FR-023`・`FR-080` の `EP-22`・`FR-076`、表 T-280・表 T-290）—— 面そのものは変わらず、並べる名前が増えるだけ。
- `FR-091`: 要求 3 件 / 参照 16 箇所。表 T-292 は 0 件の要求から指される（状態機械の表）。
- `FR-009`: 要求 18 件 / 参照 55 箇所。`FR-098`: 要求 13 件 / 参照 37 箇所。`SC-1`: 要求 1 件 / 参照 3 箇所 —— 表 T-064 の名は振る舞いを変えない。
- `AG-11`: 要求 3 件 / 参照 15 箇所。`FR-066`: 要求 4 件 / 参照 25 箇所。`SF-10`: 要求 0 件 / 参照 3 箇所。

---

## 7. 数（当てた後に測った）

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| 表 T-233 の行 | 65 → 68 | `impact.py T-233` |
| 表 T-064 のメンバ | 322 → 325 | `published_entries_json_to_md.py` の出力（325 member(s)） |
| 表 T-292 の状態 | 5 → 6 | `tbl-state-machines.md` の 表 T-292 の状態の一覧 |
| 図の辺（`components.json`） | 152 → 153 | `build.py` の `components.md`（153 edges） |

---

## 8. 波

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec` と生成物 | E-01〜E-08、`npm run gen`、`build.py`、`strictdoc export docs/spec` | 本書の体（W0b-C） |
| 2 | 5 節のコード | 5 節 | 調整役が割り当てる（`file-flow-values.ts`・`document-file-flow.ts` は W2-D4 の持ち場） |
| 3 | `tests/` | 9 節 | 仕様だけを読む別の体 |

- ⭐ **毎フレームの経路: いいえ（本書は）。** `DFC-640`（描く矢じり）と `DFC-991`（行見出しの箱）のコードは毎フレームの描画に触れるので、その持ち場が perf-pending に行を足す。

---

## 9. 仕様の外で直すもの

- コード: 5 節。
- 新しい試験（仕様だけを読む体）: `EX-16`（`ExtendedAttribute` を 3 つ持ち、フェードの値が真ん中にある見本を編集せずに書き出すと元と一致する。フェードを `null` にすると要素が消える。取り込まずに作った文書のフェードは後ろ）、`EX-2`（行を 1 つ足して書き出すと後ろの `ID` は 1 ずれ、`Name` などほかの値は変わらない）、`MG-14`（`MM-1` の合流で `RS-71`・`RS-72` の件数、前回届いて今回届かなかった `Task` の名前が `U-62` に `RS-73` の語の下に出る。0 件の理由は出ない。重ねでは出ない）、表 T-292（作った直後に担当の欄で `Enter` → パネルは閉じない。名前の欄で `Enter` → 閉じて選択が解ける。名前を `Esc` で取り消した後の `Enter` → 閉じる）、表 T-064 の 3 つ（描く側と当たり判定が同じ名を読む）、`SF-10`（対話欄で確定した発話を `Agent API` の `readDialogueMessages` で読める）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- `FR-066` の RATIONALE「本要求の実装は後の節目へ回す」は触れない（`DFC-558` の注にある食い違い。欄はもう描かれている）—— 別の CR で消す。
- `DFC-2160`・`DFC-2161` の直しは本書の外（12 節）。`DFC-2161` を 1 か所にするには 表 T-064 に名を足す CR が要る。
- 基準線は書かない。検査 26b の赤は 5 節のコードで消える。

---

## 11. 利用者に問うこと（調整役が問う。⭐ は推奨で、本書はそれを当てた）

1. **MS Project のファイルを編集せずに保存し直したとき、フェード（ぼかし）の日数を入れた拡張属性の並びをどう保つか。** 例: タスクが拡張属性を 3 つ（コスト用の文字列、フェード入の日数、メモ用の数値）この順に持つファイルを開いて、何もせずに書き出すと、いまはフェードの値が最後へ回る。⭐ 推奨: 取り込んだ位置を覚えて同じ位置へ書き戻す（`EX-16`、当てた）。もう 1 つの道は、往復の突き合わせで拡張属性どうしの順を比べないこと（MS Project は `FieldID` で読むので順に意味は無い。2026-09-19 の「順番が変わって何か問題あるの？」に沿う）—— 道具の比べ方を 1 か所変えるだけで済むが、往復が「元と同じ」でなくなる。
2. **合流で、前回は届いていて今回届かなかったタスクの名前を一覧で見せた後、どう消させるか。** 例: 外部の WBS マスタから 2 度目に取り込んだら「資料の準備」「最終確認」が来なかった。⭐ 推奨: 取り込みの報告の面に名前を並べるだけにし、消すのは日程表でいつもどおり選んで削除する（当てた）。もう 1 つの道は、面に「これらを選ぶ」の語の入口を置き、押すと面を閉じて並べたタスクを全部選ぶ（そのまま削除キーで消せる）。
3. **作った直後の名前付けで、名前ではない欄（担当など）で `Enter` を押したとき、パネルを閉じるか。** 例: タスクを置き、名前を打たずに担当の欄へ移って担当を打ち、`Enter` を押す。⭐ 推奨: 閉じない（担当を確定するだけ。名前の欄で `Enter` を押したときだけ閉じて選択を解く。`FR-091` の文のとおり、当てた）。いまのコードはどの欄でも閉じる。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `DFC-563` | ② フェード値の位置 | `実装待ち` のまま。決定仕様に `EX-16` を書いた |
| `DFC-564` | 編集していないタスクの `ID` と木の値 | `実装待ち` のまま（コードは `DEVIATION` 注記を消すだけ）。決定仕様に `EX-2` の後ろの段を書いた |
| `DFC-1021` | 合流の後の告げ | `実装待ち` のまま。決定仕様に `MG-14`・`RS-71`〜`RS-73`・表 T-290 を書いた |
| `DFC-640` | 矢じりと選んだ線の鍵 | `実装待ち` のまま。決定仕様に `PI-6` の 2 つを書いた |
| `DFC-701` | 作った直後の `Enter` | `未検討` → `実装待ち`。決定仕様に 表 T-292 の `createdNameEnded` を書いた |
| `DFC-991` | 行見出しの箱 | `未検討` → `実装待ち`。決定仕様に `PI-37` の `drawnRowBoxesOf` を書いた |
| `DFC-558` | 対話欄の発話 | `実装待ち` のまま。決定仕様に辺と `SF-10` を書いた |
| `DFC-2160`（新） | `marquee.ts`・`dependency-end.ts` がピン止めの帯の切りを読まない | `実装待ち`（仕様は `FR-098`・`EL-1` が既に決めている） |
| `DFC-2161`（新） | 帯の規則が 2 か所（`isLineScrolling`・`isInTheBand`）、選んだ線で食い違う疑い | `仕様待ち`（表 T-064 に名を足す CR が要る） |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to e5649ffe

# the numbers are unused
git grep -n "CR-688"                                   # nothing before this CR
grep -rhoE "EX-[0-9]+" docs/spec | sort -u | tail -1    # EX-15
grep -rhoE "RS-[0-9]+" docs/spec change-request | sort -t- -k2 -n -u | tail -1   # RS-70
grep -rhoE "MG-[0-9]+" docs/spec | sort -t- -k2 -n -u | tail -1                  # MG-13
grep -rn "DFC-2160\|DFC-2161\|JDG-1546\|JDG-1547\|PND-784" docs change-request   # nothing
grep -rn "createdNameEnded\|isNameField\|missingTaskNames\|hasTasksToReport" docs src tests tools   # nothing

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py EX-2 EX-6 EX-10 FR-021 MG-7 MG-11 FR-056 FR-023 FR-091 FR-009 SC-1 FR-098 AG-11 FR-066 SF-10 T-233 T-064 T-280 T-292 T-032 T-033 U-62

# generated
npm run gen
python docs/spec/_source/build.py
strictdoc export docs/spec && rm -rf output
```
