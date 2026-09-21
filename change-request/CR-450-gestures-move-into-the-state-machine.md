# CR-450 — 身振りを状態機械へ移す（段 7 の第 3 領域）

> ⭐ **状態: 波 A を当てた（2026-09-21、ブランチ `sm-gesture-a`、`2a81bdb4` の上）。波 B は当てていない。**
> ⭐ 当てた名前は R4.4 に合わせて草案から変えた —— 対応は第 11 節、草案との差はすべて改訂の記録の 4 以降。付録と第 0 〜 10 節は草案の名前のまま残した（読む者は第 11 節で引き直す）。
> 読んだ木: `97868072` で読み始め、途中で `eafc2312`（ブランチ `refactor`）へ動いた。動いたのは `docs/development-records/` の 4 ファイルと `docs/spec/_assets/tbl-row-id-prefixes.md` の 2 行だけであり（`git diff --stat 97868072 eafc2312`）、本書が行番号を引く `src/` と `docs/spec/*.md` は動いていない。**本書の行番号と数は、断りが無いかぎりこの木で 2026-09-21 に自分で測ったものである。**
> 型板は `CR-440`（棚卸し・分類・付録・波の分け方・問いの 3 つの反証・改訂の記録）。
> ⚠️ **原稿の形は、前に立つ者が伝えた利用者の裁定（2026-09-21）に従う** —— 機械（＝軸）ごとの塊に「状態」と「出来事 × いまの状態 → 升目 {先・ガード・副作用・根拠}」の遷移表を持ち、出来事は領域ごとに 1 度だけ定義する。**`SM` ・ `EV` ・ `TN` の通し番号は使わない**（接頭辞は退役）。ID は名前である —— 機械 `gesture.<軸>`、状態 `gesture.<軸>.<種類>`、出来事 `gesture/<キー>`、遷移は升目（機械 × 状態 × 出来事）で名指す。表の番号と図の番号は、領域につき 1 つずつ。
> ⛔ **本書は、その新しい形の原稿と生成器が木に着地していることを前提にする**（第 3 節の波 A の入口）。
>
> **閉じるもの**:
> - 計画の記録 4 の移す順の 3 番目「身振り」（`docs/development-records/refactor-plan-report-2026-09-13.md:250`。領域の例 `pressed` `previewDocument` `rowGrabbedAt` は `:239`）。
> - 計画の記録 13 の「状態機械が動くのは、操作を始めたとき・やめたとき・指しているパーツが変わったときだけ」（同 `:505`）を、身振りの領域で形にすること。
> - 第 3 領域「身振り」の原稿（出来事の定義と 2 つの機械）、その領域のユニット・契約試験・根への合成。
>
> **起草時に測った識別子**（規則 02 の 2.5。⛔ **どれも 2026-09-21 に `eafc2312` で測った草案時の値であり、当てる直前に測り直すこと**）:
> - 番号の帯（本巡の依頼が配った）: **表は `T-289` 以降、図は `F-035` 〜 `F-039` だけ**（`F-030` 〜 `F-034` は別のセッション）、ユニットは `UF-88`。`T-283` は `CR-436` の波 B2 が予約しているので取らない。
> - 起草時、`docs/spec` が見出しで定義していた表の番号は `T-288` まで、図は `F-029` までだった（`git grep -ohE "\*\*表 T-[0-9]+[a-z]? —"` ・ 図も同じ。2026-09-21）。`T-289` ・ `T-290` ・ `T-291` ・ `F-035` ・ `F-036` は `docs` ・ `change-request` ・ `src` ・ `tests` ・ `tools` ・ `.claude` を `git grep -w` して 0 件だった（同日）。
> - `UF-88`: 表 T-075 は 84 行（`grep -c "^| UF-" docs/spec/05-07-design.md` ＝ 84、`SU-3` も 84 ——`05-07-design.md:245`）、行 ID の上端は `UF-87`（`:457`）。`UF-88` の字面は `CR-436` の改訂の記録の 2 行（`:532` ・ `:538`、捨てた旧案）にだけ在り、予約ではなかった（同日 `git grep -nw`）。
> - 状態・出来事・遷移の通し番号は `JDG-286` で廃止した（廃止の前の上端は、状態 38 ・出来事 35 ・遷移 63）。⭐ 本書は通し番号を 1 つも取らない。
> - 行 ID の接頭辞の登録簿は 160 件（当てる直前に `2a81bdb4` で `"prefix"` を数えた。起草時に `eafc2312` で数えた 163 から、`SM` ・ `EV` ・ `TN` の 3 つが `2a81bdb4` で退役して減った）。**本書は新しい接頭辞を登録しない。** 要求 ID も立てない。
> - 台帳の上端（同日）: `DFC-682` ・ `PND-500` ・ `JDG-285`。本書の番号 `CR-450` は予約中。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **波 A はどの `CH-` も直接には前へ進めない —— 基盤の作業である。** 利用者に見える振る舞いを 1 つも変えない。
⭐ 波 B（結線）も振る舞いを変えない。第 8 節の台帳の候補（押下が残る・`AG-9` の仕分け）を直すのは、移して一致を確かめた直後の別のコミットである（`JDG-57`、`rulings.md:134`）。

守るもの:
- **`GL-003`（ぬるサク）** —— 身振りはポインタの移動と一緒に来るので、計画の記録 13 が「最も多い」と見立てた出来事の源である（`refactor-plan-report-2026-09-13.md:505` ・ `:519`）。⇒ **移動 1 回ごとに出来事を作らない**（表 T-249 の `SF-5`、`05-07-design.md:1002`）。座標・追従・プレビューはフレームの値に残し、機械には押す・離す・中断・軸が決まる・繰り返しの刻みだけを入れる（第 2 節）。性能は `LM-19`（表 T-285 の `RA-8`）。**測る前に利用者を呼ぶ**（`RISK-001` の門）。
- **`AG-9` の「文書を変えるドラッグの間は書き込みを拒否する」「パンと範囲選択は拒否しない」**（`docs/spec/01-04-requirements.md:6062`）と、表 T-067 の `WS-2`（`05-07-design.md:656`）—— 機械 `gesture.press` の 2 つの種類 `changing` ／ `viewing` で表す（決定 3）。
- **`IN-1` の「離した時点で確定し、中断は `Esc`」と `IN-1a` の「失われたら中断として終わらせる」**（req:6791 ・ `:6792`）—— どの押下の状態からも、離す・中断で `none` へ戻る升目を必ず持つ。

### ② レビュー観点のどの条項を当て、何が出たか

（`docs/development-rules/07-review-standards.md`）

- **`R2` 命名** —— 領域のファイルは `gesture-values.ts`、型の幹は `GestureValues`（決定 2）。表 T-075 のファイル名の重なりは 0 件（`grep "^| UF-" … | awk -F'|' '{print $4}' | sort | uniq -d` が空、`gesture` を含むファイル名は `src` ・ `tests` に 0 件。2026-09-21）。出来事は過去形（`SF-1`、`05-07-design.md:998`）—— 付録の 5 つの出来事はすべて過去分詞で終わる。
- **`R2.2`（SRP）** —— 新しいユニットは 1 つ。変更の理由は身振りの領域の升目だけ。既存のファイルを割らない。
- **`R4` グリッジ／レースコンディション** —— 押下の開始・終わりは 1 段で丸ごと返す。繰り返しのタイマーは副作用の値で返し、結果は時間の出来事で戻す（`SF-6`、`:1003`）。⭐ 古いタイマーの刻みが押下の後に届いても、升目が空なので同じ参照が返る（付録 B.1）。
- **`R7.1` / `R7.2` / `R7.9`** —— 遷移は `pure`、タイマー・パレットを戻す・入口の命令の実行はシェル。
- **`SF-10`（`:1007`）** —— プレビューの文書は集約に入れない（決定 5）。

### ③ 利用者に問うたこと・**問わずに決めた**こと

**問うこと**: ⭐ **なし（0 件）。** 問いの候補 7 つに打った 3 つの反証は第 5 節に残した。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き |
|---|---|---|
| 決定 1 | **2 つの波に割る**（第 3 節）: 波 A はいま当ててよい（ただし新しい形の原稿と生成器の着地の後）。波 B（シェルへの結線）は段 5・段 6 と `CR-436` の波 B2 を待つ | `CR-440` の決定 1 と同じ。`handoff-state-machine.md` §3「次の領域の原稿と遷移のユニットは、段 5・6 と並行してよい」「シェルへの結線は並行できない」 |
| 決定 2 | **領域のキーは `gesture`、ファイルは `gesture-values.ts`、型の幹は `GestureValues`** | ② の `R2`。`screen-values.ts` ／ `notice-values.ts` と同じ形 |
| 決定 3 | **機械 `gesture.press` は `none` ／ `changing` ／ `viewing` の 3 種類の平らな共用体とする。** `changing` は「文書を変える身振り」、`viewing` は「文書を変えない身振り（パン・範囲選択・倍率の入口の押し続けほか）」 | `AG-9`（req:6062）が 2 つを名指して扱いを分け、`WS-2`（des:656）がそれを読む。表 T-250 の前の規則（des:724「要求が名指す状態だけ」）に合う。⭐ **入れ子（`held.changing`）にしない理由**: 入れ子の共用体には初期の子が 1 つ要り、生成器はそれを `<STEM>_INITIAL_CHILDREN` として刷るが（`tools/generate_state_machine_types.py:167`〜`:180`）、升目は子を必ず名指すので誰も読まず、`noUnusedLocals` が拒む（`CR-440` の改訂の記録の 3 と逆向きの同じ罠）。⚠️ 覆すなら、`held` の下に 2 つの子を置き、定数を試験から読む形になる |
| 決定 4 | **行を掴んだときの軸（`HF-15`）は、別の機械 `gesture.rowGrab`（`none` ／ `undecided` ／ `position` ／ `depth`）とする** | `HF-15`（req:1670）「掴んでから最初に閾値を超えた向きで軸が決まり、離すまで変わらない（MUST）」は状態の名指しそのものである。「離すまで変わらない」は、`position` ・ `depth` の列で `gesture/rowGrabAxisSettled` の升目が空であること（`SD-3`）として表に載り、契約試験が機械で守る。いまのコードは軸を押下の値へ書き戻している（`frame-loop.ts:3958`、理由は `:3957` の WHY）。⚠️ 覆すなら、`press` の種類の運ぶ値 `rowGrabAxis` にする形になる（その場合「変わらない」は表に現れない） |
| 決定 5 | **プレビューの文書 `previewDocument` はフレームの値である**（原稿に載せない） | `SF-10`（des:1007）「文書は集約に入れない」、`SF-5`（des:1002）「連続して変わる値 … はフレームの値」—— 移動のたびに作り直す（`frame-loop.ts:4304`）。名指す要求は「掴んでいるあいだ描いて示す」振る舞い（`FR-052` req:4033、`PTD-4` req:3239）であって、値ではない |
| 決定 6 | **押した点・追従の点・押した時点のパネル幅・押した時点のパレットの角・行の落ち先と抵抗は、フレームの値としてシェルに残す** | `SF-5`（座標・寸法）。前例 `CR-436:220`（「`rowGrabbedAt`（身振り。掴んでいるかは状態、`resistedPx` ・ `atY` はフレームの値）」）と `CR-436:271`（`commandPaletteDraggedTo` はフレームの値）。⚠️ 押下の「何を押したか」（当たりの対象と画面の場所）は座標ではない離散の値なので、運ぶ値 `pressedOn` にする —— `SF-5` の後段（des:1002「当たりが変わったときだけ作る」）が当たりを出来事の値として認めている |
| 決定 7 | **`Esc` の段と、ポインタが失われたことを、1 つの出来事 `gesture/pressInterrupted` で受ける** | `IN-1a`（req:6792）は失われたことを「ドラッグを中断として終わらせる」と定め、`IN-1`（req:6791）の `Esc` の中断と同じ語である。`FR-053` の「中断（`IN-1`）では元の角へ戻す」（req:4089）は両方に掛かる —— いまのコードも両方で戻す（`frame-loop.ts:4231`〜`:4235` の `isDragInterrupted`）。どの段が `Esc` を取るかは、`CR-440` の決定 5 と同じく呼び手が決める（優先順は `CR-436` の波 B2 の `T-283`） |
| 決定 8 | **押し続けの繰り返し（`FR-018`）は、副作用 `startEntryRepeat` ・ `repeatHeldEntry` と時間の出来事 `gesture/entryRepeatElapsed` で表す。取り消しの把手 `callOffEntryRepeat` はシェルに残す** | `SF-6`。前例は画面の値の `startScaleMessageTimer` ／ `screen/scaleMessageTimeElapsed`（原稿の画面の値の領域）と、`CR-436:271` の「`callOffScaleMessage`（副作用の把手、`SF-6`）」。副作用 `startEntryRepeat` は「前の待ちを捨てて張り直す」意味とする（いまの `beginEntryRepeat` が頭で `endEntryRepeat` を呼ぶ ——`frame-loop.ts:2406`） |
| 決定 9 | **押下が始まったときの `changing` ／ `viewing` の仕分けは、ガード `changesDocument` の式としてコードが持つ**（原稿は名前だけ） | 表 T-250 の `SD-3`（des:735）「ガードの条件式はコードが持つ」。いまの式は `isDocumentChangingPress`（`frame-loop.ts:1484`〜`:1496`）と `PRESS_CHANGES_DOCUMENT`（`:1473`〜`:1480`）。⚠️ その式と `AG-9` の食い違いの疑いは第 8 節の候補 2（台帳へ。どちらが正かを選ばない） |
| 決定 10 | **押下の行（`PTD-*`）は、呼び手が画面の値の領域（構え・`Dual Cursor`）から詰めて `gesture/pointerPressed` に運ばせる** | `CR-436` の決定 5 と同じ筋（値は出来事が運ぶ）。いまも `pressRowOf`（`src/adapter/input-command-translator/input-command-translator.ts:699`〜`:712`）が構えと `dualCursorFollowing` から決める |
| 決定 11 | **表 T-075 の新しい行 `UF-88` の「負う要求」は `—`** | `CR-440` の決定 11 と同じ理由。波 A では画面がこのユニットを呼ばない |
| 決定 12 | 識別子: 表 `T-289` 1 つ（身振りの出来事と 2 つの機械の遷移表）、図 `F-035` 1 つ（身振りの状態遷移）、`UF-88` | 前に立つ者が伝えた新しい形（領域につき表 1 つ・図 1 つ） |

---

## 1. 測った事実（`eafc2312`、2026-09-21）

| 数 | 値 | 測り方 |
|---|---|---|
| `frameLoop` の範囲 | 1799〜4414 行 | `grep -nE "^(export )?(async )?function frameLoop"` と、その後の最初の `^}`（`awk 'NR>1799 && /^}/'`） |
| `frameLoop` が直に持つ `let` | 66（うち身振り 6） | `sed -n '1799,4414p' … \| grep -c "^  let "`。身振りの 6 は第 2 節の 1〜6 行 |
| 棚卸しとの差 | 棚卸しの身振りは 5 行（`refactor-stage1-state-inventory-2026-09-13.md:204`）。**`pointerShapeOfPress`（`frame-loop.ts:2850`）が棚卸しの後に増えた**（`FR-106` の「押しているあいだ形を保つ」、`CR-427`） | 名前で照合 |
| `pressed` の読み書き | 書き 6 行・読み 22 行（宣言を除く。読んで書く行は書きに数えた） | 第 2 節の 1 行目。`\bpressed\b` を行ごとに拾った（注釈の行を除く） |
| 入力の源の身振りの覚え | 2（`src/framework/dom-input-source/dom-input-source.ts:207` ・ `:208`） | `grep -n "^\s*let "` |
| 表 T-075 の行 | 84（`SU-3`、`05-07-design.md:245`） | `units.contract.test.ts:50`〜`:51` も 84 |
| `changelog.md` の版 0.29 の文 | 「`AdvanceScreenSession`（4）」 | `sed -n 47p … \| grep -oE "AdvanceScreenSession[^、。]{0,12}"` で 1 件（検査 33 が 表 T-075 と突き合わせる） |
| md-checks の最終行 | `tables=180  figures=21  rows=2360  uids=162` | 第 7 節 |

⭐ **棚卸しの行番号は古い仮説として受け、すべて測り直した。** 棚卸しの記録 4 の「`grabAtPointer` が `pressed` を読む」（`:238`）は、いまは偽である —— `grabAtPointer`（`frame-loop.ts:2838`〜`:2848`）が読むのは `dualCursorFollowing` だけで、`pressed` は 0 件。

---

## 2. 棚卸しの測り直しと分類

分類は `SF-5`（des:1002）、`SF-6`（des:1003）、`SF-10`（des:1007）と、5.5 の原稿の規則（des:724〜`:725`）を 1 つずつ当てた。
**状態** ＝ 原稿の機械の状態。**運ぶ値** ＝ 状態の運ぶ値。**フレームの値** ＝ シェルに残る（座標・寸法・時刻と、そこから計算したもの）。**外** ＝ この領域の状態ではない（行き先を書く）。

| # | 状態 | 所在（宣言） | 書き手 ／ 読み手 | 分類 | 名指す仕様の行 |
|---|---|---|---|---|---|
| 1 | `pressed`（`PointerPress`、型は `input-command-translator.ts:120`〜`:132`） | `frame-loop.ts:1832` | 書き: `receiveInput`:4164・4177・4228・4269、`carryOutAction`:3949・3958。読み: `runFrame`:2214・2216、`pressHeldOnRepeatingEntry`:2382、`readSnapshot`:2773、`startsNoTextSelection`:2831、`pointerShapeAt`:2866・2870〜2872、`pointerShapeUnder`:2887、`collectInputContext`:3040、`collectWriteMoment`:3068、`carryOutAction`:3947・3948、`owesFrame`:4092・4102、`receiveInput`:4175・4263〜4266・4304 | **割る**: 押しているか・文書を変えるか ⇒ **状態** 機械 `gesture.press`。`pressRow` ・ `hit` ／ `on`（何を押したか）⇒ **運ぶ値** `pressRow` ・ `pressedOn`。`rowGrabAxis` ⇒ **状態** 機械 `gesture.rowGrab`（決定 4）。`at`（押した点・ボタン・修飾・回数）・ `followedTo`・ `propertyPanelWidthAtPress` ⇒ **フレームの値**（決定 6） | `CS-2` des:623（身振り 1 回、押した時点）、`IN-1` req:6791、`AG-9` req:6062、`PTD-1` 〜 `PTD-5` req:3236〜3241、`HF-15` req:1670 |
| 2 | `previewDocument` | `frame-loop.ts:1833` | 書き: `replaceHeldDocument`:3117、`receiveInput`:4304。読み: `runFrame`:2141 | **フレームの値**（決定 5） | `SF-10` des:1007、`SF-5` des:1002。振る舞いは `FR-052` req:4033、`PTD-4` req:3239 |
| 3 | `commandPaletteCornerAtPress` | `frame-loop.ts:1835` | 書き: `receiveInput`:4165・4236。読み: `receiveInput`:4233・4234 | **フレームの値**（座標）。副作用 `restorePaletteCorner` の実行がこれを読む | `FR-053` req:4089（「中断（`IN-1`）では元の角へ戻す」） |
| 4 | `rowGrabbedAt` | `frame-loop.ts:1836`〜`:1842` | 書き: `carryOutAction`:3959、`receiveInput`:4237。読み: `runFrame`:2247、`exportScene`:2614 | **割る**: `axis` ⇒ **状態** 機械 `gesture.rowGrab`。`groupId` ⇒ 運ぶ値 `pressedOn`（行の掴み代の場所が行を持つ ——`grabbedRowGroupId`、`input-command-translator.ts:2565`〜`:2571`）。`depth` ・ `atY` ・ `resistedPx` ⇒ **フレームの値**（ポインタから計算した落ち先と抵抗） | `HF-15` req:1670、`GR-20` req:3334。前例 `CR-436:220` |
| 5 | `callOffEntryRepeat` | `frame-loop.ts:1919` | 書き: `beginEntryRepeat` の `tickAfter`:2412・2418、`endEntryRepeat`:2426。読み: `endEntryRepeat`:2425 | **外** —— 副作用の把手としてシェルに残す（決定 8） | `FR-018` req:4398、`S-172` ・ `S-173`（`_assets/tbl-settings.md:372` ・ `:373`） |
| 6 | `pointerShapeOfPress` | `frame-loop.ts:2850` | 書き: `pointerShapeAt`:2867・2872。読み: `pointerShapeAt`:2870・2874 | **フレームの値**（押下から導く形の覚え。鍵は押した点 ——`:2856` の WHY） | `FR-106` req:3630（「押しているあいだは、掴んだときの形を保つ」）。規則は形を名指し、覚えを名指さない |
| 7 | `gesture`（入力の源） | `dom-input-source.ts:207` | 書き: `:275`・`:317`・`:329`・`:401`。読み: `:257`・`:283`・`:303`・`:327`・`:400` | **外** —— 宿主の装置の覚え（ポインタの番号・捕捉）。`Framework` の面が持つ | `IN-1a` req:6792 は失われたことを語り、番号と捕捉は名指さない（`IF-2` ・ `PI-27` の口の内側） |
| 8 | `previousPress`（入力の源） | `dom-input-source.ts:208` | 書き: `:243`・`:402`。読み: `:241` | **外** —— ダブルクリックの数え（時刻と座標）。`SF-5` | `MK-13` req:3303 はダブルクリックの結果を名指し、数え方を名指さない |

⇒ **身振りの覚え 8（`frameLoop` 6 ＋ 入力の源 2）。** 状態を含むものは 2（`pressed` ・ `rowGrabbedAt`）で、機械は 2 つ（`gesture.press` ・ `gesture.rowGrab`）。フレームの値 3（`previewDocument` ・ `commandPaletteCornerAtPress` ・ `pointerShapeOfPress`）と、割った残り（押した点ほか・落ち先ほか）。外 3（`callOffEntryRepeat` ・ 入力の源の 2）。
⚠️ `commandPaletteDraggedTo`（`frame-loop.ts:1834`）は身振りではない —— 画面の値のフレームの値（`CR-436:271`）。副作用 `restorePaletteCorner` がそれを書く。

### 2.1 領域をまたぐもの（棚卸しの記録 4 を測り直した）

| 読む側 | いま | 移した後 |
|---|---|---|
| `collectWriteMoment` が押下を読む（`WS-2`） | `frame-loop.ts:3066`〜`:3072` の `gestureInFlight: isDocumentChangingPress(pressed)`。拒むのは `src/use-case/apply-document-change/document-change-plan.ts:199` | 呼び手が `gesture.press.changing` から詰める。⚠️ `SD-4` ではない —— ほかの層がガードとして読む値であり、`CR-440` の決定 7 と同じ筋 |
| `readSnapshot` が押下を読む（Agent API の `AG-9`） | `frame-loop.ts:2773` の `isGestureInFlight`。読み手 `src/adapter/agent-api-endpoint/agent-api-members.ts:324`・`:492`・`:535` | 写しの `isGestureInFlight` を `gesture.press.changing` から詰める |
| `escapeTarget` の段 `'gesture'`（`IN-4`） | `src/entity/document-model/screen-state/screen-state.ts:135`（`gestureInFlight` は `frame-loop.ts:1433` の `context.pressed !== null`）。⚠️ 段の順の食い違いは既に `DFC-570`（`screen-state.ts:134` の DEVIATION） | 優先順の表（`SD-4`）の「進行中のドラッグ・引きかけの矢印」の段の状態のキーが `gesture.press.changing` ／ `gesture.press.viewing`、出来事は `gesture/pressInterrupted`。⇒ **`CR-436` の波 B2 の `T-283` に 1 行**（本書は `T-283` を取らない） |
| 構え（画面の値の `armed`）と `Dual Cursor` | `pressRowOf`（`input-command-translator.ts:699`〜`:712`）が押下の行を決める。`previewOfHeldPress`（`frame-loop.ts:2663`）と `tentativeDependencyOf`（`:2701`）も構えを読む | 押下の行は `gesture/pointerPressed` の運ぶ値（決定 10）。⭐ **構えている押下は構えを変えない** —— `PTD-4a` req:3240「構えは解かない」、構えの解除は `IN-4` の段か入口（画面の値の升目）。⇒ 画面の値の機械は `gesture/pointerPressed` で動かない。プレビューと仮の線はフレームの値のまま構えを読む |
| `pointerShapeAt` ・ `pointerShapeUnder` が押下を読む（`IN-2` ・ `FR-106`） | `frame-loop.ts:2866`〜`:2874`・`:2887` | ポインタとツールチップの領域（計画の順の 5 番目）が来るまでシェルの関数のまま。読むのは `gesture.press`（種類と `pressRow`）と押した点（フレームの値） |
| `owesFrame` が押下を読む | `frame-loop.ts:4092`・`:4102`（押している間は移動のたびにフレームを負う） | **残る** —— 押しているあいだの追従・プレビュー・範囲の枠はフレームの値であり、根の参照は動かない。⇒ 「押している間の移動はフレームを負う」はシェルの規則として残す（`SF-5`） |
| `startsNoTextSelection`（`PE-0`） | `frame-loop.ts:2831` が `pressed.at.button` を読む | 押した点（フレームの値）のボタンを読む |
| 通知を消す入口の上で離す（`NT-8`） | `frame-loop.ts:4183`〜`:4188` が `return` し、`:4228` の `pressed = null` に届かない | 同じ入力が `notices/noticeDismissPressed` と `gesture/pointerReleased` の両方を作る。⚠️ **いまは押下が残る疑い —— 第 8 節の候補 1** |
| 離したときの画面の値の出来事 | 進捗マーカーを押す（`screen/progressMarkerPressed`、`FR-107`）・ `Dual Cursor` を置く（`screen/dualCursorPlaced`、`PTD-2`）は、離した入力から作られる | 同じ入力が `gesture/pointerReleased` と画面の値の出来事を作る。奪い合いではない（どちらも消費する）ので `SD-4` の行は要らない |

---

## 3. 波の分け方

| 波 | 入口の条件 | 触る所 | 緑を保つ検査 |
|---|---|---|---|
| **A** | ① 新しい形の原稿（機械ごとの塊・升目の遷移表・名前の ID）と、その生成器が木に着地している。② それ以外は無い（いま当ててよい） | `docs/spec/_source/state-machines.json`（領域 `gesture`）、生成物 `docs/spec/_assets/tbl-state-machines.md`（表 T-289 ・図 F-035）、`src/use-case/advance-screen-session/gesture-values.ts`（新）と `advance-screen-session.ts`（根への合成、`RA-5`）、`docs/spec/05-07-design.md`（5.5 の 1 文、`CP-39` の正、表 T-063 の `UT-11`（`RA-4`）、表 T-064 の `PI-39`、表 T-074 の `SU-3`、表 T-075 の `UF-88`、図 F-028、表 T-284 の `SS-6`）、`tests/contract/state-machine-gesture.contract.test.ts`（新。仕様だけを読む別の体 ——`RA-6`）、生成器の単体試験 `tests/unit/uf-88-the-gesture-transition-table-is-printed-from-the-manuscript.test.ts`（`UF-87` の試験と同じ形）、`.claude/skills/spec-graph-check/check-provenance.py` の 1 行（`:49` の `notice-values.ts` の次）、`tests/contract/units.contract.test.ts` の数、`changelog.md` の版 0.29 の数、`docs/development-rules/03-implementation.md` の生成定数の一覧（`:86`〜`:92` の並び） | 18 ・ 19 ・ 21 ・ 26b ・ 27 ・ 30 ・ 33 ・ 59 ・ 60 ・ 61 ・ 62 ＋ vitest |
| **B** | 段 5 と段 6 が済み、`CR-436` の波 B2 が当たっている（根がシェルに結線され、`T-283` が在る）。`CR-440` の波 B1 と同時でも前後でもよい（触る関数が重ならない —— 重なるのは `receiveInput` の頭だけで、順は 2.1 の表のとおり） | `frame-loop.ts`: `pressed` を根の `gesture` と押した点のフレームの値（仮に `pressPoint` —— `at` ・ `followedTo` ・ `propertyPanelWidthAtPress`）へ置き換える、`rowGrabbedAt` から `axis` を外す、`beginEntryRepeat` ・ `repeatHeldEntry` ・ `endEntryRepeat`（`:2389`〜`:2427`）を副作用の実行と時間の出来事へ、`receiveInput` の `:4164`〜`:4181`・`:4228`〜`:4237`・`:4260`〜`:4270` を出来事へ、`collectWriteMoment`（`:3068`）・ `readSnapshot`（`:2773`）・ `collectInputContext`（`:3040`）を根から詰める。入力の翻訳係（段 5 で割った形）に `gesture/pointerPressed` ・ `gesture/rowGrabAxisSettled` を作らせる（軸はいま `rowGrabFollow` の中で決まる ——`input-command-translator.ts:2576`〜`:2600`）。`T-283` の身振りの段の行 | 18 ・ 19 ・ 26b ・ 59 ・ 60 ・ 61 ・ 62 ＋ e2e 全部、`LM-19`（⛔ **利用者を呼んでから**） |
| **B の直後の別のコミット** | 波 B で一致を確かめた後（`JDG-57`） | 第 8 節の候補のうち、台帳で直すと決まったもの | 同上 |

⭐ **波 A は段 5・段 6 と並行してよい** —— 触るのは `docs/spec/`、`docs/spec/_source/`、`src/use-case/advance-screen-session/`、新しい試験、規則と検査の名簿だけで、相手の持ち場（`src/adapter/` ・ `src/framework/` ・段 4 のファイル。`handoff-state-machine.md` §6）と重ならない。
⚠️ **波 B は `let` の数を減らさない見込み** —— `pressed` は座標の半分がフレームの値 `pressPoint` として残るので置き換えで ±0、`rowGrabbedAt` ・ `previewDocument` ・ `commandPaletteCornerAtPress` ・ `pointerShapeOfPress` ・ `callOffEntryRepeat` はフレームの値か把手として残る。⭐ 得るのは離散の半分（押しているか・文書を変えるか・軸）が機械の中で原子的に進むことである。⛔ 波 B の入口で測り直す。
⚠️ **性能** —— 計画の記録 13（`refactor-plan-report-2026-09-13.md:505`〜`:524`）の見立てどおり、ポインタの移動では出来事を作らない。移動 1 回の仕事（`previewOfHeldPress` の `editDocument`、`frame-loop.ts:2657`〜`:2684`）は変わらない。測るのは波 B で、`LM-19` の手順。⛔ **測る前に利用者を呼ぶ。**

### 3.1 波 A の中身

| 対象 | いま | 案 |
|---|---|---|
| **原稿** `state-machines.json` | 領域 `screen` ・ `notices` | 領域 `gesture` を足す: 名 `{ja: 身振り}`、ユニット `src/use-case/advance-screen-session/gesture-values.ts`、型の幹 `GestureValues`、表 `T-289`（身振りの出来事と遷移）、図 `F-035`（身振りの状態遷移）。中身は付録（出来事 5、機械 2、状態 8 ＋ 根、升目 14） |
| **生成物** `_assets/tbl-state-machines.md` | 画面の値と通知 | ＋ 節「身振り（`gesture`）」: **表 T-289**、**図 F-035**。`npm run gen` |
| **5.5 の散文**（`05-07-design.md:739` の次） | 第 1 領域・第 2 領域の 2 文 | 1 文を足す: 「第 3 領域（身振り）の出来事と遷移を同じファイルの 表 T-289 に、状態遷移を 図 F-035 に示す。」（⛔ `CR-450` の字面を仕様に書かない —— 検査 7） ⚠️ 新しい形が 2 つの既存の文をどう書き換えるかに合わせる |
| 表 T-062 `CP-39`（`:144`） | 正「… / 表 T-280 〜 表 T-282 / 表 T-286 〜 表 T-288」（新しい形で変わる見込み） | ＋「/ 表 T-289」 |
| 表 T-063 `UT-11`（`:337`） | 「（いまは `screen-values.ts` ／ `notice-values.ts`）」 | 「（いまは `screen-values.ts` ／ `notice-values.ts` ／ `gesture-values.ts`）」と、表の番号の括弧に「身振りは 表 T-289」（`RA-4`） |
| 表 T-064 `PI-39`（`:540`） | 「いまは画面の値と通知の 2 領域」ほか | 「画面の値・通知・身振りの 3 領域」、出来事・副作用・初期の欄に 表 T-289 を足す（`RA-5`） |
| 表 T-284 `SS-6`（`:1094`） | 「表 T-280 ・ 表 T-286 の初期の欄」 | ＋「表 T-289 の初期の欄」 |
| 図 F-028（`:1043`〜）と前文 | 領域 `screen` ・ `notices` と破線の「次の領域」、下の段に「領域 notices は同じ参照」 | 実線の「領域 gesture<br>身振り（表 T-289）」を足し、下の段に「領域 gesture は同じ参照」の 1 本を足す（`CR-440` の改訂の記録の 6 と同じ）。破線の「次の領域」は残す |
| 表 T-075 に `UF-88` | 84 行（`UF-87` は `:457`） | `UF-88` ／ `AdvanceScreenSession` ／ `gesture-values.ts` ／ `pure` ／ 「身振りの領域の遷移（表 T-289）と、そこから生成した型と遷移表の定数の区画」／ `—`（決定 11）。`UF-87` の後 |
| 表 T-074 `SU-3`（`:245`） | 84 | **当てる時の 表 T-075 の行の数**（いまなら 85）。`SU-1` と `MN-2` は変わらない |
| `gesture-values.ts` | 無い | 生成区画、`emptyGestureValues`、`stepGestureValues`（機械ごとの振り分け）。⛔ モジュールスコープの可変状態を置かない（検査 61、`SF-7`）。⚠️ 生成器が刷る定数の名は新しい形の生成器が決める（いまの形なら `GESTURE_VALUES_INITIAL_AXES` ・ `GESTURE_VALUES_TRANSITIONS`、入れ子が無いので `_INITIAL_CHILDREN` は刷られない ——`generate_state_machine_types.py:170`〜`:172`） |
| `advance-screen-session.ts` | `ScreenSession { screen; notices }`、通知の出来事を `IS_NOTICE_EVENT`（`:40`〜`:46`）で引き、残りは画面の値 | `ScreenSession { screen; notices; gesture }`、`SessionEvent` ・ `SessionEffect` を 3 領域の和に、`emptyScreenSession` を広げ、身振りの出来事を同じ形の `Record` で引く。⚠️ 検査 60 の帯（50 行 / 15 分岐）に収める。⚠️ 出来事の `type` の字面が `gesture/pointerPressed` になるか `pointerPressed` のままかは新しい形の生成器が決める —— どちらでも重なり 0 を生成器が守る（`state_machines_json_to_md.py:267` の `shared_event_keys`） |
| **契約試験** `tests/contract/state-machine-gesture.contract.test.ts` | 無い | 原稿の領域 `gesture` を読み、(1) 各機械の各升目で、先の種類が表と一致（ガードの真偽の組を作る）、(2) 空の升目は同じ参照と共有の空の列（`SD-3`）、(3) 2 つの機械の直交: `gesture.press` の升目はどの `gesture.rowGrab` の種類の下でも当たり、逆も同じ（4 × 3 の組）、(4) 根: 身振りの出来事は `screen` ・ `notices` を同じ参照のまま残し、ほかの領域の出来事は `gesture` を同じ参照のまま残す（`SS-5`）。⭐ 書くのは仕様だけを読む別の体（`RA-6`） |
| `audit-ch5.py` | 表 T-063 の行数 9 | 変えない（コンポーネントも 表 T-063 の行も増えない）。⚠️ `changelog.md` の版 0.29 の「`AdvanceScreenSession`（4）」を（5）にする（検査 33。前例 `CR-440` 3.1） |

### 3.2 波 A の直前の測り直し（⛔ 当てる体が打つ）

1. 表と図の番号の上端、`T-289` ・ `F-035` ・ `UF-88` がまだ使われていないこと（相手の `F-030` 〜 `F-034` と帯は分かれているが確かめる）。
2. 新しい形の原稿で、出来事のキー `pointerPressed` ・ `pointerReleased` ・ `pressInterrupted` ・ `rowGrabAxisSettled` ・ `entryRepeatElapsed` がほかの領域に無いこと（起草時、画面の値 30 ・通知 5 のキーと重なり 0 —— 2026-09-21 に原稿を読んで照合）。
3. 表 T-075 の行の数（`SU-3` に書く数）と、`requirement-owner-baseline.txt` の `unfilled=` が前後で同じこと（決定 11）。
4. 付録の根拠の行番号（`01-04-requirements.md` は並行して動く。動いていたら ID で引き直す）。

---

## 4. 波 B —— シェルへ結線する（段 5・段 6 と `CR-436` の波 B2 の後）

| 対象 | 案 |
|---|---|
| 押下の開始（`receiveInput`:4163〜:4181） | 入力の翻訳係が `gesture/pointerPressed`（`pressRow` ・ `pressedOn`）を作り、シェルは 1 段進め、押した点を `pressPoint` に取る。`startEntryRepeat` が返れば `S-172` の待ちを張る（前の待ちは捨てる）。⚠️ `PND-451`（出していないパネルの境界を押す、`:4170`〜`:4179`）は `JDG-283`（`rulings.md:480`）が帯そのものを置かない形で閉じる —— 本書の升目は増えない |
| 離す（`:4228`） | ⛔ **順を保つ**: 翻訳係は 1 段の**前**の状態が運ぶ押下を読んで離した命令を作り（`CS-2`）、書き込みは 1 段の**後**に行う（`WS-2` が `none` を見る）。いまの TRAP（`:4226`〜`:4227`）と同じ意味 |
| 中断（`:4228`〜`:4235`） | `Esc` の段が身振り、または `lost` ⇒ `gesture/pressInterrupted`。`restorePaletteCorner` が返れば、シェルが `commandPaletteDraggedTo` を押した時点の角へ戻す（`FR-053` req:4089） |
| 軸（`carryOutAction` の `followRowGrab`、`:3955`〜`:3965`） | 翻訳係が軸を初めて決めた移動で `gesture/rowGrabAxisSettled` を作る。落ち先と抵抗は `rowGrabbedAt`（フレームの値）へ |
| 繰り返し（`:2381`〜`:2427`） | 待ちが明けたら `gesture/entryRepeatElapsed`。`repeatHeldEntry` が返れば入口の命令を実行し、`S-173` の待ちを張る。⭐ 升目が空なら（離した・中断した・別の押下）何もしない ⇒ いまの「刻みごとに問い直す」TRAP（`:2413`）が表に移る |
| `WS-2` と Agent API | `collectWriteMoment`（`:3068`）と `readSnapshot`（`:2773`）は `gesture.press.changing` から詰める |
| `T-283` の行 | 2.1 の 1 行（`CR-436` の波 B2 が「未移行」と書いた段を、状態のキーで埋める） |
| 性能 | `LM-19`。⛔ **測る前に利用者を呼ぶ** |

---

## 5. 問いの候補に打った 3 つの反証（`handoff.md` §0.2）

方法: (1) `docs/development-records/rulings.md`（511 行、2026-09-21）を grep、(2) `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <行>`、(3) 仕様・計画・前の裁定から導けるか。

| 候補 | (1) `rulings.md` | (2) `impact.py` | (3) 導けるか | 結果 |
|---|---|---|---|---|
| 「文書を変える／変えない」を状態の種類にするか、押下の行を読むガードにするか | `AG-9` 0 件、「身振り」0 件 | `AG-9` → 要求 1 件 ／ 参照 9 箇所（`FR-040` の `:6792` ・ `:6798` ・ `:6800`、5.3 des:559 ほか） | **導けた** —— `AG-9` が 2 つを名指し、`WS-2` が読む。表 T-250 の前の規則（des:724） | 決定 3 |
| 押した点・追従・パネル幅・パレットの角・落ち先を機械に入れるか | 「座標」3 件（`JDG-209` ・ `JDG-215` ・ `JDG-226`、どれも掴み代の幾何で無関係）、「フレームの値」0 件 | `SF-5` → 要求 0 ／ 参照 1（des:1022） | **導けた** —— `SF-5` の逐語と `CR-436:220` ・ `:271` の前例 | 決定 6 |
| プレビューの文書を状態にするか | 「プレビュー」0 件、`previewDocument` 0 件 | `SF-10` → **浮いている**（要求 0 ／ 参照 0） | **導けた** —— `SF-10` と `SF-5`、計画の記録 12「文書は集約に入れない」（`refactor-plan-report-2026-09-13.md:482`） | 決定 5 |
| `Esc` の中断と、ポインタが失われたことを 1 つの出来事にするか | `IN-1a` 0 件。「中断」は多数あるが、すべて `Task` の状態「中断」（表 T-021a）の話で、身振りの中断は 0 件（`JDG-39` ・ `JDG-185` 〜 `JDG-240` の該当箇所を読んだ） | `IN-1a` → **浮いている**（要求 0 ／ 参照 0）。`IN-1` → 要求 4 件 ／ 参照 7（`FR-016` `:3386`、`FR-052` `:4044` ・ `:4045`、`FR-053` `:4088`） | **導けた** —— `IN-1a` の逐語「中断として終わらせる」、`FR-053` の「中断では元の角へ戻す」が両方に掛かる | 決定 7 |
| 行の軸を別の機械にするか、押下の運ぶ値にするか | `HF-15` 2 件（`JDG-94` ・ `JDG-109`、掴み代の印の濃さで無関係） | `HF-15` → 要求 4 件 ／ 参照 17（`FR-085` `:1595`、`FR-004` `:1650` ほか） | **導けた** —— `HF-15` が軸の決まり方と「離すまで変わらない」を状態として名指す | 決定 4 |
| 押し続けの繰り返しを状態にするか | `FR-018` 2 件（`JDG-145` ・ `JDG-160` の着地先の一覧で、行を開いた状態 `CR-404` の話。無関係）、「長押し」0 件 | `FR-018` → 要求 5 件 ／ 参照 39 | **導けた** —— `FR-018`（req:4398）は刻むことを名指し、待ちの把手を名指さない。前例は画面の値の `startScaleMessageTimer` と `CR-436:271` | 決定 8 |
| クリックとドラッグの分け（`JDG-187` の進捗マーカー、`S-208` の図形の押しと引き）を状態にするか | 「ドラッグ」9 件。`JDG-187`（`rulings.md:313`）は「クリックで状態、ドラッグで実績の終わり」を定めるが、分ける時機を名指さない | `S-208`（`tbl-settings.md:395`）は距離を持つ設定値 | **導けた** —— 分けるのは離した時点の移動量（座標）であり、`SF-5` のフレームの値。離した命令を作る翻訳係が判じる（いまと同じ） | 状態にしない |

⇒ **3 つとも空だった候補は 0 件。問いは無い。**

---

## 6. 継ぎ目（体に渡すときは両方のブリーフに同じ字面で書く）

- 領域のキー `gesture`、機械 `gesture.press`（`none` ／ `changing` ／ `viewing`）・ `gesture.rowGrab`（`none` ／ `undecided` ／ `position` ／ `depth`）、型の幹 `GestureValues`、ファイル `gesture-values.ts`、公開は `emptyGestureValues` ・ `stepGestureValues` と生成した型・定数。
- 出来事 `gesture/pointerPressed` ・ `gesture/pointerReleased` ・ `gesture/pressInterrupted` ・ `gesture/rowGrabAxisSettled` ・ `gesture/entryRepeatElapsed`。副作用 `startEntryRepeat` ・ `repeatHeldEntry` ・ `restorePaletteCorner`。ガード `changesDocument` ・ `isRowGrabStrip` ・ `isOnRepeatingEntry` ・ `isOnPaletteBand`。
- 運ぶ値の名 `pressRow` ・ `pressedOn` ・ `axis`（原稿は名だけ。型はコードが決める —— 付録 C）。
- 根: `ScreenSession { readonly screen; readonly notices; readonly gesture: GestureValues }`。

---

## 7. 数の予測

方法: `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .` の最終行。
**起草時（`eafc2312`、2026-09-21）: `tables=180  figures=21  rows=2360  uids=162`**（`97868072` でも同じ値だった）。

⚠️ **「前」は新しい形の原稿の着地で動く**（画面の値と通知の表が 3 つから 1 つずつになり、`SM` ・ `EV` ・ `TN` の行が数えられなくなる）。⭐ **本書の差だけを突き合わせる。**

**波 A**（本書の差）:

| | 差 | 内訳 |
|---|--:|---|
| tables | +1 | 表 T-289（生成物。md-checks は `_assets/*.md` を数え、番号の付いた表が 2 つ以上の塊にまたがっても 1 つと数える ——`md-checks.py:78`〜`:80`） |
| figures | +1 | 図 F-035 |
| rows | +1 | `UF-88`。⭐ 機械の升目と名前の ID は行 ID の形（`md-checks.py:118`〜`:120` の `ROW_ID`）に当たらないので数えない見込み。⚠️ 新しい形の生成器が出来事の表の第 1 セルに何を刷るかで変わる —— 当てる体が測る |
| uids | 0 | 要求を足さない |

**波 B**: tables 0 ・ figures 0 ・ rows 0（`T-283` の行は `CR-436` の波 B2 が数える）・ uids 0。
**そのほかの数**: 表 T-075 84 → 85、`units.contract.test.ts` 84 → 85、`changelog.md` の「（4）」→「（5）」、`frameLoop` の `let` は波 B で ±0 の見込み（第 3 節）。

---

## 8. 台帳の候補（⛔ 問いではない。どちらが正かを選ばない）

利用者の裁定（2026-09-13: 仕様とコードの食い違いは、どちらが正かを選ばずに台帳へ）に従い、台帳の体へ渡す。本書は `defects.md` を書かない。

| # | 食い違い | 片側 | もう片側 | 台帳の今 |
|---|---|---|---|---|
| 1 | ⚠️ **未検証（画面で押していない）** —— 通知を消す入口の上で離すと、`receiveInput` が `frame-loop.ts:4187` で返り、`:4228` の `pressed = null` に届かない。押下が次の押下まで残る疑い。残るあいだ ① その押下は面の上の押下で `entry` を持たないので `isDocumentChangingPress` が真を返し（`:1488`〜`:1493`）、`WS-2` と Agent API の書き込みが `gestureInFlight` で拒まれる ② `Esc` の段 `'gesture'` が立つ（`:1433`）③ 移動のたびにフレームを負う（`owesFrame`:4102） | `IN-1`（req:6791、離した時点で確定）、`AG-9`（req:6062、ドラッグの間だけ拒む）、`IN-4`（req:6795、閉じる対象があるときだけ消費）、`NFR-010` | `frame-loop.ts:4183`〜`:4188`。`endEntryRepeat` だけは先に呼ぶ（`:4154` の TRAP） | 0 件（`noticeDismiss` を `defects.md` で grep して `DFC-555` の 1 件だけ、別の話）。⭐ 波 B で押下は `gesture/pointerReleased` で必ず終わるので、移すと消える差である —— ⛔ ただし振る舞いが変わるので、移すコミットと混ぜない（`JDG-57`） |
| 2 | **押下の「文書を変えるか」の仕分けと、`AG-9` が指す 表 T-027 の食い違いの疑い** —— `PRESS_CHANGES_DOCUMENT` と `isDocumentChangingPress`（`frame-loop.ts:1473`〜`:1496`）は ① `PTD-2`（`Dual Cursor` のクリック）を真 ② パネルの境界の押下（`on` が在り `entry` が `null`）を真 ③ パレットの掴み帯（`IC-53`）の押下を真 ④ 繰り返さない入口の押下を真 ⑤ `PTD-4a`（何にも当たらず依存線を構えている押下）を真 とする（⑤ は当てた後、仕様だけを読む契約試験が見つけた）。⭐ 仕様だけを読む契約試験 `tests/contract/state-machine-gesture.contract.test.ts` は、これらの升を期待どおりの失敗として留めている（`JDG-57` —— 状態機械は波 B で領域を移すまで今の振る舞いを写し、直すのは移した後のコミット） | `AG-9`（req:6062）「対象は表 T-027 の取り消し対象行と一致させる」「ドラッグをしている間」。表 T-027 は `Dual Cursor` の位置を `UN-12`（req:2130）、パネル幅を `UN-16`（`:2131`）で対象外とし、パレットの位置は文書の値ではない（`FR-053`） | コードの 4 つの真 | 0 件（`DFC-533` の ① は `pressRow` の型の読み違いの話で、この 4 つを挙げていない ——`defects.md:107`） |
| 3 | ⚠️ **未検証（到達するかを確かめていない）** —— 行を掴んで最初に閾値を超えた向きで落ち先が無いと、`rowGrabFollow` は `UNASSIGNED` を返し（`input-command-translator.ts:2585`・`:2596`）、軸はどこにも書き戻されない（書き戻すのは `followRowGrab` を受けた `frame-loop.ts:3958` だけ）。次の移動で別の向きが勝てば軸が変わる | `HF-15`（req:1670）「最初に閾値を超えた向きで軸が決まり、離すまで変わらないこと（MUST）」 | `rowGrabAxisAt`（`input-command-translator.ts:2551`〜`:2561`）は書き戻された軸だけを固定として読む | 0 件。⭐ 波 A の升目（`gesture.rowGrab.undecided` → 軸）は落ち先の有無と独立に軸を決めるので、波 B の結線で呼び手がどちらの時機で `gesture/rowGrabAxisSettled` を作るかを決め直す |

⚠️ 既に在る行: `DFC-570`（`Esc` の段でパネルとドラッグの順）、`DFC-533`（押下の形の型）。本書はどちらも直さない。

---

## 9. 影響 —— 本書の外で動くもの

| 所 | 何が動くか | いつ |
|---|---|---|
| `docs/development-records/refactor-plan-report-2026-09-13.md` | 記録 4 の移す順の 3 番目に着地先 | 波 A ／ B |
| `docs/development-records/refactor-stage1-state-inventory-2026-09-13.md` | 記録 4 の「`grabAtPointer` が `pressed` を読む」（`:238`）はいま偽（第 1 節） | 前に立つ者が判じる |
| `docs/development-records/handoff-state-machine.md` | §3 の「次の領域」に第 3 領域 | 波 A |
| `docs/development-records/changelog.md` | A-appendix の 1 行と、版 0.29 の「（4）」→「（5）」 | 波 A |
| `CR-436` | 波 B2 の `T-283` に 2.1 の 1 行を申し送る。⛔ 本書は `CR-436` を書き換えない | 波 A の後 |
| `docs/development-records/defects.md` | 第 8 節の候補 1 〜 3 | 台帳の体 |
| `docs/review/components/components.md` と図 F-013 〜 F-017 | 見込み 0（コンポーネントも辺も増えない —— `gesture-values.ts` が読むのは `session-step.ts` だけの見込み。当てる体は `EG-2` ・ `EG-3` で数える） | 波 A |

---

## 10. ⛔ この変更でやらないこと

- ⛔ 波 A で `src/adapter` ・ `src/framework` に触らない
- ⛔ `T-283` を取らない。画面の値・通知の原稿を変えない
- ⛔ ポインタの座標・指している場所・ツールチップ（計画の 5 番目「ポインタとツールチップ」）を入れない。`commandPaletteDraggedTo`（画面の値のフレームの値）を入れない
- ⛔ 入力の源の覚え（`dom-input-source.ts:207` ・ `:208`）を入れない
- ⛔ 第 8 節の候補を移す波で直さない（`JDG-57`）
- ⛔ 基準線を体に触らせない

---

## 付録 —— 第 3 領域「身振り」の原稿（新しい形）

**略記**: `req` ＝ `docs/spec/01-04-requirements.md`、`des` ＝ `docs/spec/05-07-design.md`、`set` ＝ `docs/spec/_assets/tbl-settings.md`。行番号は `eafc2312`。表の行は第 1 セルがその ID の行、要求は `**UID**:` の行。
⚠️ 根拠に置けるのは行 ID と要求 ID だけである（表の番号は定義として数えない ——`state_machines_json_to_md.py` の `defined_ids()`）。
升目の書き方: `→ 先 [ガード] / 副作用 （根拠）`。**空の升目は「変わらない ＝ 同じ参照」**（`SD-3`）。`self` は同じ種類へ戻る（副作用のため）。1 つの升目に複数の行があるときは、ガードが互いに排他である。

### A. 出来事（領域に 1 度だけ定義する）

| 出来事 | どこから来るか | 運ぶ値 | 動かす機械 | 根拠 |
|---|---|---|---|---|
| `gesture/pointerPressed` | 入力: ポインタを押した（入力の源は、身振りを持っているあいだ次の押下を報告しない ——`dom-input-source.ts:257`） | `pressRow`（`PTD-1` 〜 `PTD-5`。呼び手が構えと `Dual Cursor` から詰める —— 決定 10）、`pressedOn`（押したもの: 当たった掴み（表 T-023d の行と対象）か、画面の場所（入口・掴み帯・パネルの境界・行の掴み代とその行・つまみ）。⛔ 座標は運ばない —— `SF-5`） | `press` ・ `rowGrab` | `CS-2` des:623、`IN-1` req:6791、`PTD-1` 〜 `PTD-5` req:3236〜3241 |
| `gesture/pointerReleased` | 入力: 押していたボタンを離した | — | `press` ・ `rowGrab` | `IN-1` req:6791、`CS-2` des:623 |
| `gesture/pressInterrupted` | 入力: `Esc`（`IN-4` の「進行中のドラッグ・引きかけの矢印」の段。段は呼び手が決める —— 決定 7）／ ボタンを離す前にポインタが失われた（`IN-1a`） | — | `press` ・ `rowGrab` | `IN-1` req:6791、`IN-1a` req:6792、`IN-4` req:6795 |
| `gesture/rowGrabAxisSettled` | 入力: 行を掴んだまま、押した点から `S-208` を超えて初めて動いた（どちらの向きが先かは翻訳係が判じる） | `axis`（`position` ／ `depth`） | `rowGrab` | `HF-15` req:1670、`S-208` set:395 |
| `gesture/entryRepeatElapsed` | 時間: `startEntryRepeat` の待ち（`S-172`）、または `repeatHeldEntry` の待ち（`S-173`）が明けた | — | `press` | `FR-018` req:4398、`S-172` set:372、`S-173` set:373 |

### B. 機械

#### 根 `gesture`

| 状態 | 親 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|---|
| `gesture` | —（領域の根） | ○ | — | `CS-2` des:623（身振り 1 回） |

#### B.1 機械 `gesture.press` —— 押しているか、それは文書を変えるか

| 状態 | 親 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|---|
| `gesture.press.none` | `gesture` | ○ | — | `IN-1` req:6791、`AG-9` req:6062 |
| `gesture.press.changing` | `gesture` | | `pressRow`、`pressedOn` | `AG-9` req:6062（文書を変えるドラッグ）、`WS-2` des:656、`CS-2` des:623、`IN-4` req:6795、`UN-4` req:2119（行を掴んで動かす） |
| `gesture.press.viewing` | `gesture` | | `pressRow`、`pressedOn` | `AG-9` req:6062（パンと範囲選択は拒否しない）、`UN-8` req:2126、`UN-9` req:2127、`IN-4` req:6795、`FR-018` req:4398（倍率の入口の押し続け） |

**遷移表**（行 ＝ 出来事、列 ＝ いまの状態）:

| 出来事 ＼ 状態 | `none` | `changing` | `viewing` |
|---|---|---|---|
| `gesture/pointerPressed` | → `changing` [`changesDocument`] （`AG-9` 、`CS-2` 、`UN-4`）<br>→ `viewing` [not `changesDocument`, `isOnRepeatingEntry`] / `startEntryRepeat` （`AG-9` 、`UN-8` 、`FR-018` 、`S-172`）<br>→ `viewing` [not `changesDocument`, not `isOnRepeatingEntry`] （`AG-9` 、`UN-8` 、`UN-9`） | | |
| `gesture/pointerReleased` | | → `none` （`IN-1` 、`CS-2`） | → `none` （`IN-1` 、`CS-2`） |
| `gesture/pressInterrupted` | | → `none` [`isOnPaletteBand`] / `restorePaletteCorner` （`FR-053` 、`GR-19` 、`IN-1` 、`IN-1a` 、`IN-4`）<br>→ `none` [not `isOnPaletteBand`] （`IN-1` 、`IN-1a` 、`IN-4`） | → `none` [`isOnPaletteBand`] / `restorePaletteCorner` （`FR-053` 、`GR-19` 、`IN-1` 、`IN-1a` 、`IN-4`）<br>→ `none` [not `isOnPaletteBand`] （`IN-1` 、`IN-1a` 、`IN-4`） |
| `gesture/entryRepeatElapsed` | | | → `self` [`isOnRepeatingEntry`] / `repeatHeldEntry` （`FR-018` 、`S-173`） |

⭐ **空の升目**（`SD-3` で同じ参照）:
- `changing` ・ `viewing` × `gesture/pointerPressed` —— 身振りを持つあいだ入力の源は次の押下を報告しない（`dom-input-source.ts:257`）。来ても何も変えない。
- `none` × `gesture/pointerReleased` ・ `gesture/pressInterrupted` —— 中断の後に届く離す（`IN-1`: 中断した操作は確定しない）、身振りの無い `Esc`（段は呼び手が作らない）。
- `none` ・ `changing` × `gesture/entryRepeatElapsed`、および `viewing` で `isOnRepeatingEntry` が偽 —— 離した・中断した・別の押下の後に届いた古い刻みは何もしない（いま `:2413` の TRAP が問い直している）。
⚠️ `pressInterrupted` の `isOnPaletteBand` は、いまのコードでは `changing` の側でしか真にならない（第 8 節の候補 2 の ③）。表は両方の列に置き、仕分けの式に依らない形にした。

#### B.2 機械 `gesture.rowGrab` —— 掴んだ行の軸（`HF-15`）

| 状態 | 親 | 初期 | 運ぶ値 | 根拠 |
|---|---|---|---|---|
| `gesture.rowGrab.none` | `gesture` | ○ | — | `HF-15` req:1670 |
| `gesture.rowGrab.undecided` | `gesture` | | — | `HF-15` req:1670（「掴んでから最初に閾値を超えた向きで軸が決まり」）、`GR-20` req:3334、`S-208` set:395 |
| `gesture.rowGrab.position` | `gesture` | | — | `HF-15` req:1670（「上下は位置を変え、段を変えてはならない」） |
| `gesture.rowGrab.depth` | `gesture` | | — | `HF-15` req:1670（「左右は段を変えること」） |

**遷移表**:

| 出来事 ＼ 状態 | `none` | `undecided` | `position` | `depth` |
|---|---|---|---|---|
| `gesture/pointerPressed` | → `undecided` [`isRowGrabStrip`] （`HF-15` 、`GR-20` 、`UN-4`） | | | |
| `gesture/pointerReleased` | | → `none` （`HF-15` 、`IN-1`） | → `none` （`HF-15` 、`IN-1`） | → `none` （`HF-15` 、`IN-1`） |
| `gesture/pressInterrupted` | | → `none` （`IN-1` 、`IN-1a` 、`IN-4`） | → `none` （`IN-1` 、`IN-1a` 、`IN-4`） | → `none` （`IN-1` 、`IN-1a` 、`IN-4`） |
| `gesture/rowGrabAxisSettled` | | → `{axis}` （`HF-15` 、`S-208`） | | |

⭐ **空の升目**（`SD-3`）:
- `position` ・ `depth` × `gesture/rowGrabAxisSettled` —— **これが `HF-15` の「離すまで変わらない（MUST）」である。** 契約試験がこの升目の同じ参照を確かめることで、要求を機械が守る。
- `none` × `gesture/rowGrabAxisSettled` —— 行を掴んでいない。
- `undecided` ・ `position` ・ `depth` × `gesture/pointerPressed` —— 身振りの最中は押下が来ない（B.1 と同じ）。
⚠️ 2 つの機械は直交する（契約試験は 3 × 4 の組で数える）。`rowGrab` が `none` 以外なのは `press` が `changing` のあいだだけ、という組の約束は升目の対（押す・離す・中断で両方が動く）と入力の源の約束（`dom-input-source.ts:257`）で保たれ、表の外の不変条件は置かない。

### C. 運ぶ値と副作用の型（コードが決める。原稿は名前だけ —— 表 T-250 の `SD-1` ・ `SD-2`）

| 名 | 型の見込み | 置き場 |
|---|---|---|
| `pressRow` | `PressRow`（`'PTD-1' \| 'PTD-2' \| 'PTD-3' \| 'PTD-4' \| 'PTD-4a' \| 'PTD-5'`。いまは `input-command-translator.ts:114`） | `gesture-values.ts`。⚠️ `UseCase` は `Adapter` の型を読めない（表 T-061）ので、同じ形の型を領域に置き、波 B で翻訳係に集約の型を読ませる（`CR-440` A.4 と同じ移行） |
| `pressedOn` | 当たった掴み（`Grabbed` の行と対象 —— いまの `PointerPress.hit`）か、画面の場所（いまの `PointerPress.on` の `ScreenPart`）の判別共用体。⛔ 座標を含めない | 同上 |
| `axis` | `'position' \| 'depth'`（いまの `RowGrabAxis`、`input-command-translator.ts:118`） | 同上 |
| 副作用 `startEntryRepeat` ・ `repeatHeldEntry` ・ `restorePaletteCorner` | `{ type: '…' }`（中身は持たない。待ちの長さは `S-172` ・ `S-173`、戻す角はシェルのフレームの値） | 同上 |

---

## 11. 当てた名前（R4.4、`docs/development-rules/07-review-standards.md` の「状態機械」の節）

草案の名前は、R4.4 が入る前（`b6b00941` より前）に書いた。当てるときにすべてを R4.4 に当て直した。

| 種類 | 草案の名 | 当てた名 | 理由（1 行） |
|---|---|---|---|
| 状態機械 | `gesture.press` | `pointerPressStateMachine`（今の状態は `pointerPressState` ／ 型 `PointerPressState`） | 追うもの（ポインタの押下）の名詞句 ＋ `StateMachine`。`press` だけではキーの押下と読み分けられない |
| 状態機械 | `gesture.rowGrab` | `rowGrabStateMachine`（`rowGrabState` ／ `RowGrabState`） | 追うもの（行の掴み）の名詞句 ＋ `StateMachine`。全領域で重なりは 0 |
| 状態 | `gesture.press.none` | `pointerPressStateMachine.notPressed` | `none` は状態を言わない。「押下はいま押されていない」と読める過去分詞 |
| 状態 | `gesture.press.changing` | `pointerPressStateMachine.changingDocument` | 進行中の活動は現在分詞 ＋ 目的語。`AG-9` の「文書を変えるドラッグ」 |
| 状態 | `gesture.press.viewing` | `pointerPressStateMachine.viewingDocument` | 同じ形。`AG-9` のパン・範囲選択は文書を見るだけで変えない |
| 状態 | `gesture.rowGrab.none` | `rowGrabStateMachine.notGrabbed` | `none` は状態を言わない。過去分詞 |
| 状態 | `gesture.rowGrab.undecided` | `rowGrabStateMachine.axisUndecided` | 〈何が〉＋ 形容詞。決まっていないのは軸である（`HF-15`） |
| 状態 | `gesture.rowGrab.position` | `rowGrabStateMachine.changingPosition` | 名詞だけは禁止。`HF-15` の「上下は位置を変え」を現在分詞 ＋ 目的語で |
| 状態 | `gesture.rowGrab.depth` | `rowGrabStateMachine.changingDepth` | 同じ。`HF-15` の「左右は段を変える」 |
| 出来事 | `gesture/pointerPressed` ・ `gesture/pointerReleased` ・ `gesture/pressInterrupted` ・ `gesture/rowGrabAxisSettled` | 同じ | 主語 ＋ 過去形。変えない |
| 出来事 | `gesture/entryRepeatElapsed` | `gesture/entryRepeatTimeElapsed` | 明けるのは待ち時間である。画面の値の `screen/scaleMessageTimeElapsed` と同じ形 |
| ガード | `changesDocument` | `isDocumentChangingPress` | ガードは `is` ／ `has` ／ `can`。名前はコードが既に使う字面（`frame-loop.ts:1484`）と同じにする |
| ガード | `isRowGrabStrip` ・ `isOnRepeatingEntry` ・ `isOnPaletteBand` | 同じ | 既に `is` で始まる |
| ガード | —（草案は先 `{axis}`） | `isPositionAxis` | 改訂の記録の 5 |
| 副作用 | `startEntryRepeat` ・ `repeatHeldEntry` ・ `restorePaletteCorner` | 同じ | 動詞 ＋ 目的語。変えない |
| 運ぶ値 | `pressRow` ・ `pressedOn` ・ `axis` | 同じ（コードの型は `GesturePressRow` ・ `PressedOn` ・ `GrabbedRowAxis`） | 型は `Adapter` の `PressRow` ・ `RowGrabAxis` と名を分けた —— `UseCase` は `Adapter` の型を読めない（表 T-061） |
| 領域 | `gesture` ／ `gesture-values.ts` ／ `GestureValues` | 同じ | 決定 2 |

## 改訂の記録

| # | 日付 | 何を変えたか | 理由 |
|---|---|---|---|
| 1 | 2026-09-21 | 起草 | —— |
| 2 | 2026-09-21 | 付録を `SM` ・ `EV` ・ `TN` の通し番号の 3 表から、出来事の定義表 ＋ 機械ごとの升目の遷移表へ書き直した。表の番号を 3 つ（`T-289` 〜 `T-291`）から 1 つ（`T-289`）へ、状態 39 ・出来事 36 ・遷移 64 から始める予定だった通し番号の割り当てを捨てた | 前に立つ者が伝えた利用者の裁定（原稿の形の組み替え、同日） |
| 3 | 2026-09-21 | 機械 `gesture.press` を入れ子（`held.changing` ／ `held.viewing`）から平らな 3 種類へ | 決定 3 の ⭐（生成器が刷る初期の子の定数を誰も読まない） |
| 4 | 2026-09-21 | 波 A を当てた（`2a81bdb4` の上）。状態機械・状態・出来事・ガードの名を R4.4 に当て直した（第 11 節）。当てる直前に測った: 表の番号の上端は `T-286`、図は `F-029`（`F-030` 〜 `F-034` は別のセッション）、`T-289` ・ `F-035` は `git grep -w` で 0 件、`UF-88` は `CR-436` の改訂の記録の 2 行だけ、表 T-075 は 84 行 | R4.4（`b6b00941`）が草案の後に入った |
| 5 | 2026-09-21 | `rowGrabStateMachine` の `axisUndecided` × `gesture/rowGrabAxisSettled` を、先 `{axis}` の 1 升から、ガード `isPositionAxis` の真偽で分けた 2 枝へ変えた | 生成器は `{name}` を「初期でないどの最上位の種類でもよい」と読む —— `axisUndecided` 自身も先に入り、運ぶ値の字面を状態のキーに揃える必要も出る。ガードなら先が表に 2 つだけ現れる |
| 6 | 2026-09-21 | 生成器 `state_machines_json_to_md.py` の `covers_every_case` を、升が名指すガードの項のすべての真偽の組で確かめる形にした | `notPressed` × `gesture/pointerPressed` の 3 枝は 4 通りをすべて覆うのに、単項のガードとその否定の対しか見ない前の形では「それ以外 → —」を偽って刷った。画面の値と通知の生成物は 1 行も変わらない（当てる前後で差を取った）。単体試験 `tests/unit/uf-88-the-gesture-transition-table-is-printed-from-the-manuscript.test.ts` に 2 件 |
| 7 | 2026-09-21 | 仕様だけを読む契約試験 `tests/contract/state-machine-gesture.contract.test.ts` は当てた体が書かなかった | `RA-6`。当てた後に別の体が書く |
| 8 | 2026-09-21 | 第 8 節の候補 1 〜 3 を `defects.md` に `DFC-686` ・ `DFC-687` ・ `DFC-688` として書いた（どちらが正かは選ばない）。状態は `未検討` ・ `裁定待ち` ・ `未検討` | 第 8 節は「台帳の体へ渡す」と書いたが、本巡の依頼が当てる体に書かせた。番号は当てる直前に、この木（上端 `DFC-682`）と別のセッションの未コミットの `DFC-683` 〜 `DFC-685` を読んで決めた |
| 9 | 2026-09-21 | `gesture-values.ts` に、シェルの `REPEATING_ENTRIES`（`frame-loop.ts:680`）の写しと、`PRESS_CHANGES_DOCUMENT`（`:1473`）の偽の行（`PTD-1` ・ `PTD-5`）を `VIEWING_PRESS_ROWS` として置いた（`TRAP` 注記付き。表をそのまま写すと検査 45 の重なりが 1 つ増えた）。`PressedOn` の形（`grab` ・ `entry` ・ `paletteBand` ・ `panelBorder` ・ `rowGrabStrip` ・ `scrollbarThumb` ・ `otherPart` の 7 種類）を決めた | ガードの式はコードが持つ（`SD-3`）が、`UseCase` はシェルの定数を読めない。⛔ 波 B でシェルがこちらを読む形にし、写しを 1 つに畳む |
| 10 | 2026-09-21 | 第 9 節の `handoff-state-machine.md` §3 と `changelog.md` の A-appendix の 1 行は書かなかった。`changelog.md` の版 0.29 の「（4）」→「（5）」だけを書いた | `CR-440` の波 A（`b429b674`）もその 2 つを書いていない。`handoff` は前に立つ者の持ち物 |
| 11 | 2026-09-21 | 第 7 節の予測を測った: md-checks は `tables=177 figures=21 rows=2223` → `tables=178 figures=22 rows=2224`（`uids=162` のまま）。表 T-075 は 84 → 85（`SU-3` も 85） | 予測どおり +1 ・ +1 ・ +1 ・ 0 |
| 12 | 2026-09-21 | 第 8 節の候補 2 と `DFC-687` に 5 つ目の真 `PTD-4a`（行は「何もしない」—— `01-04-requirements.md:3240`）を足し、契約試験 `tests/contract/state-machine-gesture.contract.test.ts` がその升を期待どおりの失敗として留めることを書いた。どちらが正かは選ばない。`src/` は変えない | 仕様だけを読む契約試験が見つけた。`JDG-57`（移すコミットと直すコミットを分ける） |
