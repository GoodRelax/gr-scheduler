# CR-682 —— 面の差し替え・問いの間の書き込み・未保存の印・記録の印を、画面のとおりに仕様へ書く

> 起草の状態: 当てた（2026-10-04、調整役の統合点 `16ca854f` から早送りした作業木。持ち場 `W0-S3`）。起草と当てを同じ作業木で行った。src は書かない（コードは `W2-D1` が持つ）。
> ID の帯: 番号 `CR-682`、裁定の帯 `JDG-1504`〜`JDG-1505`、台帳の帯 `DFC-2115`〜`DFC-2116`、`PND-763` は調整役から受けた（14 節で、木のどこにも `CR-682` と帯の番号が無いことを測った）。どれも使っていない。仕様の新しい行 ID も取らない（2 節）。
> 利用者の答え: `JDG-1480`〜`JDG-1485`（問い Q1〜Q6、2026-10-04 夜）。⛔ 本書は裁定の行を書かない —— 台帳の体が同じ番号で記す。本書はその番号を引くだけである。
> 覆すもの: 無い。`rulings.md` を「差し替」「未保存」「最小化」「記録」「問いが立っ」で引き、答えと食い違う裁定の行は 0 件だった（14 節）。`JDG-57`（波 B2 は今日の振る舞いを写す）は、写した振る舞いを仕様の側で決めたことになるだけで、覆されない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（全文は台帳の体が `docs/development-records/rulings.md` に記す）

| 裁定 | 答え（調整役の要約） | 本書での扱い |
|---|---|---|
| `JDG-1480`（Q1、`DFC-705`） | 面が開いているときに別の面の入口を押すと、開いている面を差し替える。ただし答えを待っている面（ファイルを開く途中の開き方を選ぶ面など）は残す | E-12（表 T-280 の `openSurfaceStateMachine`）・E-14（`S-99g`） |
| `JDG-1481`（Q2、`DFC-706`） | 文書の設定をパネルに出しているときに選択が動けば、パネルは選んだタスクのプロパティに替わる（いまの動き） | E-06（`FR-072`）・E-12（`propertiesPanelContentStateMachine`） |
| `JDG-1482`（Q3、`DFC-780`） | 取り消しで保存した時点の中身へ戻したら、未保存の印を下ろす（離れるときの警告を出さない） | E-07（`FR-100`）・E-13（表 T-290） |
| `JDG-1483`（Q4、`DFC-781`） | AI（`Agent API`・対話欄）の編集も、人の編集と同じく未保存に数える | E-07・E-13 |
| `JDG-1484`（Q5、`DFC-784`） | 比較のために重ねて開いただけでも未保存に数える（いまの動き） | E-07・E-08（`OP-9`）・E-13 |
| `JDG-1485`（Q6、`DFC-785`） | パレットを最小化しているあいだは掴み帯に記録中の印を出す。非表示のときは出さない | E-09（`FR-053`）・E-10（`FR-102`）・E-11（`IC-76`） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` / `GL-006`**（読まずに使える） —— 押した入口がすぐ開く、選んだものがパネルに出る、元に戻したら警告が消える、記録していることが帯で読める。どれも「押す前に結果が読める」ことを、仕様の表が画面と同じに言うようにする。残りの 8 行（`DFC-690` ほか）は、仕様の中の穴と食い違いを塞ぎ、同じ問いを 2 度読ませない。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（唯一の正）** —— 遷移の正は 表 T-280・表 T-290 の升である。⇒ 差し替えの規則・未保存の印の規則は升に書き、`S-99g`・`FR-100`・`FR-072` は升を指す。問いの間の書き込みの規則は 表 T-037 の `NT-7` 1 か所に置き、`AG-9`・`WS-2`・`FR-154` は同行を指す。
- **`R2.14`（POLA）** —— 取り消しで戻した文書に警告が出る、AI の編集にだけ警告が出ない、の 2 つは利用者の予想と逆だった（`JDG-1482`・`JDG-1483`）。
- **`R4.4`（名前）** —— 新しいガードの 3 つの名を `is` で始め、指すものを言う名にした（`isAnotherSurface`・`isFlowAwaitingAnswer`・`isBackToSavedDocument`）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 「答えを待つ面」は、開く道の答えの出来事 `flowSurfaceAnswered` で答える面（`U-56`・`U-61`）とする。`U-62`（取り込みの報告、答えを求めない）と `U-60`（透かし解除）は差し替える | 利用者の例は「ファイルを開く途中の面」。開く道が止まって待つのはこの 2 つだけで、ほかの面を閉じても流れは宙に浮かない（`U-60` を閉じることは `WM-9` の「答えないことは消さないこと」である） | 透かし解除のパスワードを打ちかけで別の入口を押すと、打った字は消える |
| 決定 2 | 答えを待つ面が開いているあいだに別の面の入口を押したら、`RS-27`（押した入口が、いま行えることを持たない）で告げる | 黙って何も起きないと、押せていないのと見分けがつかない。`RS-27` は同じ意味の既存の理由で、担当者の削除が問いの間に使っている | 通知が 1 つ増える |
| 決定 3 | 開く道が面を立てる（`surfaceRaisedByFlow`）ときも、開いている面を差し替える | いまのコード（`withSurfaceReplaced` が 3 つの出来事を同じに扱う）と同じ。差し替えないと、開く道が立てた面が出ず、流れが止まる | 無い |
| 決定 4 | 取り消しで戻ったかは、文書そのもの（参照）で判じ、中身を比べ直さない | 取り消しは履歴の文書をそのまま据える（`05-07-design.md` の 表 T-230 の `RD-1`）。刻印の等値（`FR-063`）は秒までなので、同じ秒の 2 つの書き込みを見分けない | 手で同じ値に打ち直した文書は未保存のまま（`FR-100` に代償として書いた） |
| 決定 5 | 確認の問いが立っているあいだは、画面からの書き込みも `Agent API` の書き込みも受けない。画面からのものは `RS-27` で告げる。ズーム・スクロール・パン（`UN-8`）だけは通す | `FR-154` の問いが既に持つ理由（離したときに組んだ束を古くしない）は、どの問いの束にも当たる。担当者の削除の道が既に `RS-27` で告げている。`UN-8` の例外は `WS-2` の編集入力の確定前と同じ理由 | 問いを開いたまま取り消し（`Ctrl`＋`Z`）を押すと、`RS-27` の通知が出る |
| 決定 6 | 進捗マーカーの出来事（`progressMarkerPressed`）は押下が離れた後に送り、副作用 `writeProgressStep` が書く（`DFC-708` の対応案 ①） | 副作用を残すので、生成される型（`ScreenValuesEffectName`）が変わらず、W0 の持ち場が src を書かずに済む。押下の最中は `WS-2` が書き込みを拒むので、離れた後でなければ書けない | 見え方は変わらない |
| 決定 7 | 倍率の出来事（`displayScaleStepped`）の出どころを「副作用の結果（書いた後にシェルが送る）」に替える（`DFC-710` の対応案 ①） | 運ぶ `percent` は書いた後の値で、入力の翻訳係は知らない。コードは既にそうしている | 無い |
| 決定 8 | `QN-10` を足すとき、同じ穴の `QN-13`（`FR-154`）も同じ升に足す | 同じ出来事で運ばれ、同じ状態に載る（コードは両方を立てる） | 無い |
| 決定 9 | 最小化した帯の記録の印は `IC-76` そのもの（押下状態）とし、`IC-53` の左に置く。押せば記録を止める | 新しい図形も辞書の語も要らない。`FR-102` の「同じ入口で止める」が帯の上でも成り立つ。`IC-75` が帯に載る入口の先例 | 記録しているあいだ、最小化した帯が 1 つ分広い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| `IN-4` の注（選ぶとパネルが立つ、の読み） | `01-04-requirements.md` の 表 T-028 の `IN-4` | E-01 |
| `WM-9`・`U-60` の段の名 | `01-04-requirements.md` の `WM-9`、`_assets/tbl-glossary.md` の 表 T-103 の `U-60` | E-02・E-15 |
| 問いの間の書き込み | `01-04-requirements.md` の 表 T-037 の `NT-7`・表 T-035 の `AG-9`・`FR-154`、`05-07-design.md` の 表 T-067 の `WS-2` | E-03・E-04・E-05・E-16 |
| 設定を出しているときの選択 | `01-04-requirements.md` の `FR-072` | E-06 |
| 未保存の編集の数え方 | `01-04-requirements.md` の `FR-100`・表 T-024a の `OP-9` | E-07・E-08 |
| 最小化した帯の記録の印 | `01-04-requirements.md` の `FR-053`・`FR-102`、`_assets/tbl-glossary.md` の 表 T-109 の `IC-76` | E-09・E-10・E-11 |
| 状態機械（面・パネル・倍率・進捗・閉じる対象・問い・未保存） | `_source/state-machines.json`（表 T-280・表 T-290 を刷る） | E-12・E-13 |
| 面の定義 | `_source/settings.json` の `S-99g`（表 T-206 を刷る） | E-14 |
| 焦点の継ぎ目の答え | `05-07-design.md` の 表 T-065 の `IF-9` | E-17 |
| 入力の翻訳係が作る出来事 | `_source/published-entries.json` の `PI-18` の `screenEventFromInput`（表 T-064 を刷る） | E-18 |
| 台帳 | `docs/development-records/defects.md` の 14 行、`changelog.md` に版 3.80 の 1 行 | E-19・E-20 |

**数**: 表の行の増減 0。要求の増減 0。図 0。状態機械の升 +5（`openSurfaceStateMachine` 3・`propertiesPanelContentStateMachine` 1・`unsavedEditsStateMachine` 1）、新しいガード 3、新しい MUST / MUST NOT 4（`NT-7` 2・`FR-053` 1・`IF-9` 1 —— 15 節）。

---

## 2. 新しい識別子

行 ID・表番号・設定の行は取らない。状態機械のガードの名を 3 つ足す（`isAnotherSurface`・`isFlowAwaitingAnswer`・`isBackToSavedDocument` —— `src` に 0 件、14 節）。ガードの式はコードが持つ（表 T-250 の `SD-3`）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消す文 | 代わり |
|---|---|---|
| `IN-4` の ⚠️ の段 | 「タスクを選ぶと `FR-006` によりパネルが立つので、選択が無いと」 | 「パネルを出しているあいだにタスクを選ぶと、パネルは出たまま中身がそのタスクへ移る（`FR-072` —— 選ぶことだけではパネルは立たない）ので、選択の段が無いと」 |
| `WM-9` | 「`Esc` の第 1 階層で閉じる」 | 「`Esc` の「開いている面」の段で閉じる」 |
| `U-60` | 「`Esc` の第 1 階層で閉じる」 | 「`Esc` の段（表 T-028 の `IN-4`）の「開いている面」で閉じる」 |
| 表 T-280 の `surfaceCloseAsked` の `target` の注 | 「閉じる対象。面かパネルかヘルプか」 | 3 つの語 `surface`・`panel`・`helpModal` を名指す |
| 表 T-280 の `displayScaleStepped` の出どころ | 「入力」 | 「副作用の結果（倍率を書いた後にシェルが送る）」 |
| 表 T-280 の `progressMarkerPressed` の出どころの注と根の升の注 | 「進捗マーカーの押下」／「`rememberedActuals` を書き換える」 | 「押下が離れた（`GA-18`）。押下の最中には送らない」／「`rememberedActuals` を書き換え、運ぶ `writes` を文書に書く」 |
| 表 T-290 の `documentEditLanded` の注 | 「`Agent API` の書き込みと合流・重ね（`RD-3`）では送らない」 | 「画面か `Agent API` からの書き込み …。合流・重ね（`RD-3`）では送らない」 |
| `PI-18` の `screenEventFromInput` の注 | 「出来事の全数は 表 T-280。」 | 「出来事の全数は 表 T-280 —— 作るのは、出どころが入力の出来事だけである。」 |

⭐ 消さないもの: `FR-154` の「問いが立っているあいだは … `Agent API` の書き込みを拒む」（試験 `tests/system/cr-668-a-plan-end-released-on-a-saturday.test.ts` が引く。同じ向きの文なので残し、`NT-7` を指す 1 文を足す）、`WS-2` の太字の文と `UN-8` の文（試験 `cr-593` の 2 本が引く。問いは別の 1 文で足す）、`FR-053` の「最小化しているあいだに出すのは掴み帯だけ」（帯に載せるので真のまま）。

---

## 4. 書き直す所

⚠️ 当てた文はすべて木の上に在る。ここには行ごとの要点だけを置く —— 逐語は `git diff` が正である。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`IN-4` の ⚠️ の段を 3 節の表のとおり書き換える（`DFC-700`）。

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`WM-9` の段の名を 3 節の表のとおり書き換える（`DFC-1652`）。

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`NT-7` の「この 2 つのキーをほかの何にも渡してはならない」の段の後に 3 文を足す: 問いが立っているあいだ文書への書き込みを受けない（MUST NOT）、画面からのものは `RS-27` で告げて捨て `Agent API` のものは `AG-9` で拒む（MUST）、`UN-8` だけの書き込みは拒まない（決定 5、`DFC-690`）。

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`AG-9` の末に「確認の問い（表 T-037 の `NT-7`）が立っている間も同じく拒否する —— 理由は同行が持つ」を足す。

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
`FR-154` の ⚠️ の文の後に「どの問いでも同じであり、画面からの書き込みも含めて 表 T-037 の `NT-7` が持つ。」を足す。

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
`FR-072` の「出しているあいだは、選択が動けば中身がそれに移る」の次に、文書の設定を出しているときも同じであり、戻す道は `IC-17` をもう一度押すこと、を足す（`JDG-1481`）。

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
`FR-100` の MUST NOT の次に 5 文を足す: 書き手を問わない（`JDG-1483`）／取り消し・やり直しで印を下ろした時点の文書そのものへ戻ったら未保存は無い（`JDG-1482`、決定 4）／代償（打ち直しは数える）／重ねて開いたことも数える（`JDG-1484`）／印の遷移は 表 T-290 が持つ。

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
`OP-9` に「上の「置き換えも合流もしない」は文書の中身の話であり、重ねたことは `FR-100` の未保存の編集に数える」を足す（`DFC-784`）。

<!-- EDIT id=E-09 file=docs/spec/01-04-requirements.md -->
`FR-053` の最小化の段に、記録しているあいだ（`S-206`）は `IC-76` を押下状態のまま帯の `IC-53` の左に載せる（MUST）、押せば記録を止める、を足す（`JDG-1485`、決定 9）。

<!-- EDIT id=E-10 file=docs/spec/01-04-requirements.md -->
`FR-102` の「いま記録しているかどうかが画面上で読めること（MUST）」の次に、最小化のあいだは帯の `IC-76` で読ませる、非表示（`S-99e`）のあいだは例外とする、を足す（`JDG-1485`）。

<!-- EDIT id=E-11 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の `IC-76` の `何の入口か` に「⭐ パレットを最小化しているあいだも、記録していれば掴み帯に押下状態で載る（`FR-053`）」を足す。

<!-- EDIT id=E-12 file=docs/spec/_source/state-machines.json -->
領域 `screen`（表 T-280）:
- `openSurfaceStateMachine` の `open` に 3 つの升を足す —— `surfaceEntryPressed` と `watermarkEntryPressed`（後者は `watermarkDisplayStateMachine.shown` にいるときだけ）は、[`isAnotherSurface` & not `isFlowAwaitingAnswer`] で自己へ移り `tellFlowSurfaceClosed`（差し替え）、[`isAnotherSurface` & `isFlowAwaitingAnswer`] で自己へ移り `raiseNotice`（`RS-27`）。`surfaceRaisedByFlow` は前者だけ（決定 1〜3、`JDG-1480`）。
- `propertiesPanelContentStateMachine` の `documentSettingsDisplayed` × `selectionMoved` → `selectionDisplayed` [`hasChoice`]（`JDG-1481`）。
- `surfaceCloseAsked` の `target` の注・`displayScaleStepped` の出どころ・`progressMarkerPressed` の出どころと根の升を 3 節の表のとおり（`DFC-1280`・`DFC-710`・`DFC-708`、決定 6・7）。

<!-- EDIT id=E-13 file=docs/spec/_source/state-machines.json -->
領域 `fileFlow`（表 T-290）:
- `changeQuestionRaised` の出どころに `FR-154`・`QN-10`・`QN-13`・`IC-106`・`HF-20`、運ぶ `question` と状態 `questionAsked` の運ぶ値・根拠に `QN-10`・`QN-13`（`DFC-1410`、決定 8）。
- `documentEditLanded` の注を 3 節の表のとおり（`JDG-1483`）。`unsavedEditsStateMachine` の `editsUnsaved` × `documentEditLanded` → `nothingUnsaved` [`isBackToSavedDocument`]（`JDG-1482`）。`documentOpenLanded` の升の注と根拠に、重ねも数えること（`OP-9`、`JDG-1484`）。

<!-- EDIT id=E-14 file=docs/spec/_source/settings.json -->
`S-99g` の注の末に「⭐ 面は一度に 1 つだけ開いている。面が開いているときに別の面の入口を押すと、開いている面を閉じて差し替える —— 差し替えない面（開く道の答えを待つ面）と、そのときの告げ方は 表 T-280 の `openSurfaceStateMachine` が持つ」を足す。

<!-- EDIT id=E-15 file=docs/spec/_assets/tbl-glossary.md -->
`U-60` の段の名を 3 節の表のとおり書き換える（`DFC-1652`）。

<!-- EDIT id=E-16 file=docs/spec/05-07-design.md -->
表 T-067 の `WS-2` の末に「⭐ 確認の問い（`NT-7`）が立っている間も拒否する —— 上の `UN-8` だけから成る書き込みは、問いが立っている間も拒否しない」を足し、正の欄に `NT-7` を足す。

<!-- EDIT id=E-17 file=docs/spec/05-07-design.md -->
表 T-065 の `IF-9` の「欄に焦点を置く求め … `WS-2` はこれを読まない」の後に、面の 2 つの答え（欄が描かれているのに入らなかったときは偽、入ったとき・描いたパネルに欄が無いときは真）を MUST で書き、偽だけが `IN-5b` の置き直しを促し、欄が無いという答えが `IN-5a` の取り下げに当たる、を足す（`DFC-805` の対応案 ①）。

<!-- EDIT id=E-18 file=docs/spec/_source/published-entries.json -->
`PI-18` の `screenEventFromInput` の注を 3 節の表のとおり（`DFC-710`）。

<!-- EDIT id=E-19 file=docs/development-records/defects.md -->
14 行の `対応方針・決定仕様` に本書の決定仕様を書き足し（追記のみ）、状態を 8 節のとおりに替える。

<!-- EDIT id=E-20 file=docs/development-records/changelog.md -->
表の末尾に版 3.80 の 1 行を足す（当てた木の最大は 3.79。並行した CR と版が重なれば調整役が振り直す）。

---

## 5. グラフ（`16ca854f`）

- `induced.py`（変える 17 の対象: `IN-4` `FR-072` `FR-100` `FR-102` `FR-053` `WM-9` `U-60` `OP-9` `NT-7` `AG-9` `WS-2` `IF-9` `FR-154` `S-99g` `IC-76` `T-280` `T-290`）: 中の辺 20、閉路 3 —— `IN-4`↔`S-99g`、`FR-102`↔`IC-76`、`FR-154`↔`NT-7`。どれも値の行・下位の行が規則を持つ要求を指す慣行の 2 閉路であり、本書は各組の両方を 1 回で書いた（E-01 と E-14、E-10 と E-11、E-03 と E-05）。
- `impact.py`: 表 T-280 は要求 3 件（2 次 28 件）、表 T-290 は要求 3 件（2 次 23 件）。行では `IN-4` が要求 12 件 / 参照 67 か所、`NT-7` が 12 件 / 34 か所、`S-99g` が 8 件 / 24 か所、`AG-9` が 2 件 / 16 か所、`IF-9` が 3 件 / 13 か所、`WS-2` が 2 件 / 10 か所、`IC-76` が 1 件 / 3 か所、`WM-9` が 0 件。⇒ どの参照も行 ID で指すだけで、本書が書き換えた語を写していない（`grep` で 3 節の旧文を引いて、仕様の中は 0 件）。

---

## 6. 数の予測

| 数 | 前 → 後 |
|---|---|
| 表 T-280 の `openSurfaceStateMachine` の升 | 9 → 12 |
| 表 T-280 の `propertiesPanelContentStateMachine` の升 | 16 → 17 |
| 表 T-290 の `unsavedEditsStateMachine` の升 | 6 → 7 |
| 表の行・要求・図 | 増減 0 |

---

## 7. 波

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1（本書、`W0-S3`） | 仕様の原稿 6 つ ＋ 生成物（`tbl-state-machines.md`・`tbl-settings.md`・`tbl-published-entries.md`・`tbl-row-id-prefixes.md`・`icon-roster.json`・`screen-values.ts` の生成の区間）＋ 台帳 | E-01〜E-20、`npm run gen` |
| 2（`W2-D1`） | `frame-loop.ts` ほか | 9 節のコードの直し |
| 3（試験の波） | 仕様だけを読む体 | 10 節 |

- ⭐ **毎フレームの経路: いいえ**（本書は src を書かない）。`W2-D1` が帯の描画（`command-palette.ts`）に触れるときは perf-pending に行を足す。

---

## 8. 台帳 —— 14 行の行き先

| 行 | 本書の決定 | 状態 | 残る仕事 |
|---|---|---|---|
| `DFC-690` | 決定 5（`NT-7`・`AG-9`・`WS-2`） | `実装待ち` | 書き込みの束の道は黙って捨てる（`frame-loop.ts` の `changeDocument`）→ `RS-27`、`Agent API` は `FR-154` の問いだけ拒む（`isWriteHeldBackIn`）→ どの問いでも、`UN-8` だけの書き込みは通す |
| `DFC-700` | E-01 | `試験待ち` | コードは `FR-072` の側で既に合う |
| `DFC-1410` | E-13 | `試験待ち` | コードは `QN-10` を既に立てる（`row-tree-entrances.ts`） |
| `DFC-1652` | E-02・E-15 | `試験待ち` | 文だけの直し |
| `DFC-1280` | E-12 | `試験待ち` | コードの語は既に `surface`・`panel`・`helpModal`（`screen-values.ts` の `WHY: DFC-1280` の注は退けてよい） |
| `DFC-805` | E-17 | `試験待ち` | コードの答えは既に合う（`field-editing.ts` の `focusPropertyField`） |
| `DFC-710` | E-12・E-18 | `試験待ち` | コードは既に書いた後に送る |
| `DFC-708` | E-12（決定 6） | `実装待ち` | `writeProgressStep` の手を書き、`progressMarkerPressed` を押下が離れた後に送り、`GA-18` の動作の書き込みを退ける |
| `DFC-705` | E-12・E-14（`JDG-1480`） | `実装待ち` | `withSurfaceReplaced` を退け、機械の升で差し替える。答えを待つ面では `RS-27` |
| `DFC-706` | E-06・E-12（`JDG-1481`） | `実装待ち` | `choiceFollowedOf` の DEVIATION を退け、`selectionMoved` を送る（見え方は変わらない） |
| `DFC-780` | E-07・E-13（`JDG-1482`） | `実装待ち` | `isBackToSavedDocument` を書く（印を下ろした時点の文書を持つ） |
| `DFC-781` | E-07・E-13（`JDG-1483`） | `実装待ち` | `Agent API` の書き込みの着地でも `documentEditLanded` を送る |
| `DFC-784` | E-07・E-08・E-13（`JDG-1484`） | `試験待ち` | コードは既に重ねを数える |
| `DFC-785` | E-09〜E-11（`JDG-1485`） | `実装待ち` | 最小化した帯に `IC-76` を押下状態で描き、押下を受ける |

---

## 9. 仕様の外で直すもの（`W2-D1` へ）

- `src/framework/single-html-shell/frame-loop.ts`: `withSurfaceReplaced`（`DFC-705`）・`choiceFollowedOf`（`DFC-706`）・`writeProgressStep: () => undefined`（`DFC-708`）の 3 つの DEVIATION を退ける。`changeDocument` の問いの間の `return` を `RS-27` へ、`isWriteHeldBackIn` を問い全般へ（`DFC-690`）。`holder.replace` の道で `documentEditLanded` を送る（`DFC-781`）。`isBackToSavedDocument` の値（`DFC-780`）。
- `src/use-case/advance-screen-session/screen-values.ts`: 新しい升（3 つのガード）と `documentSettingsDisplayed` × `selectionMoved`。
- `src/adapter/input-command-translator/item-grab.ts`: `GA-18` の書き込みを出来事へ移す（`DFC-708`）。
- `src/adapter/screen-renderer/command-palette.ts`（`D1` の持つファイルの外 —— 調整役が割り当てる）: 最小化した帯の `IC-76`（`DFC-785`）。
- 検査 37 の対の指紋（`.claude/skills/spec-graph-check/dictionary-table-pairing.txt`）の `T-037 NT-7` と `T-109 IC-76` の 2 行を、行と辞書の語を読み直したうえで替えた —— `NT-7` の語（`manner`「続けてよいかを問うとき」）も `IC-76` の語（「デバッグ用ログ取得の開始/停止」とその説明）も、足した文と食い違わない。本書の外の行は動いていない。
- ⚠️ それまで、表の升を読む契約試験（`tests/contract/state-machine-screen-values.contract.test.ts`・`state-machine-file-flow.contract.test.ts`）は新しい升の分だけ赤い —— 11 節。

---

## 10. 試験の体への要約（仕様だけを読む体）

1. 表 T-280 の `openSurfaceStateMachine` の新しい 3 升（差し替え・答えを待つ面で `RS-27`・`surfaceRaisedByFlow`）と、`propertiesPanelContentStateMachine` の `documentSettingsDisplayed` × `selectionMoved`。
2. 表 T-290 の `editsUnsaved` × `documentEditLanded` [`isBackToSavedDocument`] と、`Agent API` の書き込みが印を立てること（`FR-100`）。
3. `NT-7` の問いの間の書き込み: 画面は `RS-27`、`Agent API` は `AG-9` の拒否、`UN-8` だけの書き込みは通る。
4. `FR-053` / `FR-102`: 最小化した帯に記録中だけ `IC-76`（押下状態、`IC-53` の左）。非表示では無い。
5. `IF-9` の焦点の答え（偽だけが置き直し）、`QN-10`・`QN-13` が `changeQuestionRaised` で運ばれること。

---

## 11. 測ったこと

- `npm run gen` 0、`npm run gen:check` 0、`strictdoc export docs/spec` 0（`output` は消した）。
- 新しい升は表を読む契約試験を赤くする（`W2-D1` が閉じる）。数は本書を当てた体の報告にある。

---

## 12. ⛔ この変更でやらないこと

- src を書かない（W0 の持ち場の決まり）。
- 異常系（`JDG-78`）の行に触れない。`RS-27` は既存の理由をそのまま使う。
- 辞書の語、図形、`S-` の値を変えない。
- `DFC-638`（値の動かない書き込みで印が立つ、`W1-C1`）は本書の外 —— `isBackToSavedDocument` はそれと両立する（値の動かない書き込みを送らなければ印は立たない）。

---

## 13. 利用者に問うこと

無い（6 つの問いは答えを受けた）。決定 1〜9 は覆せる —— 覆すときは升とその指し先（3 節）を同じ回に書き直す。

---

## 14. 測り方の再現

```
git grep -n -e "CR-682" -e "JDG-150[45]" -e "DFC-211[56]" -e "PND-763"     # 0 before drafting
git grep -n -e isAnotherSurface -e isFlowAwaitingAnswer -e isBackToSavedDocument -- src   # 0
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py IN-4 FR-072 FR-100 FR-102 FR-053 WM-9 U-60 OP-9 NT-7 AG-9 WS-2 IF-9 FR-154 S-99g IC-76 T-280 T-290
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-280 T-290 IN-4 NT-7 AG-9 WS-2 IF-9 OP-9 S-99g U-60 WM-9 IC-76
grep -n "差し替\|未保存\|最小化\|記録\|問いが立っ" docs/development-records/rulings.md
```

---

## 15. 新しい MUST の数（検査 39）

`NT-7` に MUST NOT 1・MUST 1、`FR-053` に MUST 1、`IF-9` に MUST 1。`AG-9`・`WS-2`・`FR-072`・`FR-100`・`FR-102`・`OP-9`・`S-99g` への書き足しは MUST を持たない（升か既存の MUST を指す）。⇒ 検査 39 は試験の波まで、この 4 つの分だけ赤い。
