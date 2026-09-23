# CR-560 — 選択を `Ctrl` で引けば写し、背景を `Ctrl` で引けば今のままパンする

> 起草の状態: 起草（2026-09-24 に 11 節の問い 5 つへ利用者が答えた）。答えは 11 節の「答え」の欄と 12 節（`JDG-468` ・ `JDG-469` ・ `JDG-521` 〜 `JDG-523`）。
> 読んだ木: `61bbd572`（`origin/refactor`。`CR-551` は `6f674198` 〜 `7dbd292d` で着地済み）。行番号・数・参照は、すべてこの木で測った（測り方は 13 節）。⚠️ 本書は（着地済みの `CR-551` の後）`CR-552` → `CR-553` → H2〜H10 → `CR-554` の**後に**当てる（8 節）。当てる者は、4 節の旧がその木で 1 回だけ現れることを数え直すこと。
>
> **閉じるもの**: 利用者の 2026-09-23 の指示 1 件（`JDG-467`。逐語は下の 0.1 節）と、11 節の問いへの 2026-09-24 の答え 5 件（`JDG-468` ・ `JDG-469` ・ `JDG-521` 〜 `JDG-523`）。⭐ 問い 3 の答えに添えた「※他に日程をコピペするのがあれば、実績を空にしろ。」により、**本書の射程は `Ctrl` ドラッグだけでなく、`Task` を写すすべての道（貼り付け `CM-8` ・ 行の写し `CM-28` ・ `Agent API` の `AM-7`）に広がった**（E-08）。
> ⛔ **覆すもの**: 表 T-023 の `MK-7` の「`Ctrl` だけを伴うドラッグはどこでも 表 T-023a の `PTD-1`（パン）」。狭めるだけであり、背景（と、選択に含まれないもの）の上の `Ctrl` ドラッグは今のままパンである。⚠️ `MK-7` を覆すことは、2026-09-23 の振り分けで利用者が受け入れたと前に立つ者が伝えている —— その逐語は `rulings.md` に行が無い（12 節）。⛔ **表 T-223 の `DU-1` が実績の列を黙って写す読み**（いまの貼り付けと行の写しは、`Task` の列をすべて写す —— `task-paste.ts:45-46` ・ `edit-task-group.ts:308-309` の `...one` ／ `...task`）。写しは未着手として作る（E-08）。⛔ 作図の合図のいまの形（コードの `copy`。仕様は綴りを持たなかった）—— `crosshair` にする（E-03、問い 4）。
> ⭐ **形の方針**: 写すもの・置き場・何も写さない離し方・断り方を、1 つの表（表 T-308）の行に置いた。裁定を戻すときは多くが 1 行の書き換えで済む（戻し方は 1 節の最右列）。⭐ 写しそのものは貼り付け（`FR-033` ・ 表 T-223 ・ 命令 `CM-8`）と同じ複製であり、新しい複製の規則を起こさない —— 違うのは置き場だけである。⭐ 実績を空にする規則は 1 行（表 T-223 の `DU-1`）に置き、写す道のすべてがその行を読む。戻すときは `DU-1` の ⛔ の 1 文を消す。

### 0.1 利用者の逐語（2026-09-23）

⚠️ 前に立つ者が体へ渡した写しのまま写した。

| 項目 | 逐語 |
|---|---|
| 1 | 「オブジェクトを選択している状態で、Ctrl+ドラッグでオブジェクトをコピーとしろ。ただし、背景をCtrl＋ドラッグでスクロールは現状のまま有効とせよ。」 |

前に立つ者が渡した事実（利用者の言葉ではない）: `MK-7`（`01-04-requirements.md:3346`）は `Ctrl` ドラッグをどこでも `PTD-1` のパンとしている。2026-09-23 の振り分けで利用者は `MK-7` を覆すことを受け入れた。本件はそれを狭め、選択したものの上は写し、背景の上は今のままとする。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— 同じ形の工程を横へ並べる（`FR-033` の RATIONALE）のに、`Ctrl+C` → 行を選ぶ → `Ctrl+V` → 引いて動かす、の 4 手が 1 回の引きになる。写しを置く所を、離す前に絵で確かめられる（表 T-023a の `PTD-7` の追従）。
⭐ **`CH-1` ／ `GL-001`**（作図より速く引ける）—— `FR-033` の RATIONALE「1 つずつ引き直させると、作図ソフトに対する利点が消える」をそのまま受ける。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・重複がない。唯一の正）** —— ① `MK-7` の「`Ctrl` だけを伴うドラッグ → `PTD-1`」と `PTD-1` の「構えと当たりによらず優先する」が、新しい行 `PTD-7` と両立しない → `MK-7` の操作の欄から `MK-15` の場所を除き、`PTD-1` に「上の `PTD-7` が先に立つ」を足した（E-01 ・ E-02）。⚠️ 「構えと当たりによらず優先する」の字は残した —— 3 本の試験がこの字を `toContain` で読む（9 節）。② `FR-033` の「複製した `Task` は、複製元と同じ行に載せること（MUST）」とその `editGroup` の例外が、`Ctrl` ドラッグの置き場（離した所）と両立しない → 表 T-308 の結びで「あれは貼り付けの置き場である」と分けた（E-05）。③ `IN-2` と `FR-106` は閉路（6.2）→ 同じ計画で書いた（E-03 ・ E-04）。
- **`R1.4`（異常系・境界値）** —— 動かさずに離す・0 日 0 行で離す・`Esc`・ポインタを失う（`CY-9`）、別の `editGroup` の行に載せる・段の安全弁（`CY-10`）、最初の行より上・最後の行より下（`CY-6`）、`Dual Cursor` モード（`PTD-7` の条件）、押しているあいだの `Ctrl` の押し離し（`CY-11`）。
- **`R1.2`（検証できる表現）** —— 「離した所」を、本体の移動と同じ日数と行数（`CY-5` ・ `CY-6`）で書いた。新しい値は起こさない（押しと引きを分ける距離は `S-208`）。
- **`R2.1`（命名）** —— 新しい接頭辞 `CY`（Copy drag）。`DU`（複製の連鎖）と分けたのは、あちらが「一緒に写るもの」の条で、こちらが「引いて写すときの置き場と離し方」の条だからである（1 つの接頭辞に 1 つの意味。登録簿 `row-id-prefixes.json` の `$comment`）。
- **`R4.4`（状態機械）** —— 新しい状態も出来事も要らない。`pointerPressed` が運ぶ押下の行に `PTD-7` を足すだけで、`isDocumentChangingPress` が `changingDocument` へ入れる（`PTD-7` は `VIEWING_PRESS_ROWS` に入らない）。写しを選ぶのは既存の `objectsPicked` である（J-02 ・ J-03）。
- ⭐ 「裁定が要る」と書く前に、`handoff.md` の §0.2 の 3 手を踏んだ: ① `rulings.md` を「コピー」「Ctrl」「MK-7」「複製」で引いた（当たるのは `JDG-306` ・ `JDG-307` ・ `JDG-300` の Q16 ②・`JDG-399` の「特別ルールを設けるな」） ② 6 節の `impact.py` で隣を引いた ③ 既存の規則で決まるものは 0 節 ③ に置き、決まらないものだけを 11 節に残した。

### ③ 利用者に問わずに決めたこと

⭐ 下は根拠を添えて問わずに決めた（あとから覆せる。戻し方は 1 節）。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 写しを始めるのは、選択に含まれるタスク（マイルストーンを含む）の**本体**（表 T-266 の `GA-9` ・ `GA-14` ・ `GA-15`）から始めた `Ctrl` だけの左ドラッグに限る。同じタスクの端・フェードの掴み点・進捗マーカー・ダミー・再開アイコンからの `Ctrl` ドラッグは今のままパン（`CY-1`） | 表 T-270 が「選択に含まれるものの本体を引けば、選択の全部が動く」とし、端などは選択を 1 つに絞る。コードの `BODY_GRAB_ROWS`（`selection-input.ts:42`）も同じ 3 つ | 端を掴んで写すことはできない |
| 決定 2 | 写すのは選択に含まれるタスクの**すべて**と、その WBS の子孫（`CY-3`） | `FR-033` の「`Task` が 2 つ以上選ばれているときは、選ばれた `Task` をすべて複製し」（`CR-541`、`JDG-300` の Q16 ②）。`pasteTaskSubtree` は既に複数を運ぶ（`task-paste.ts:26`） | — |
| 決定 3 | 一緒に写るもの（依存・割当・`TaskVisual`）は 表 T-223 の `DU-1` のまま。部分木の外へ出る依存は写さない | 逐語「コピー」＝ 既存のコピー。`FR-033` の「部分木の外へ出る依存を複製してはならない」 | — |
| 決定 4 | 置き場は、本体を引いて動かすときと同じ日数と行数（`CY-5` ・ `CY-6`）。行は描いた行で数え、端で全体を止める | 表 T-270 の「横は同じ日数、縦は同じ行数」「最初の行より上か最後の行より下へ出るものがあれば、全体をそこで止める」。コードの `bodyMoveWrites` ・ `clampedRowShift`（`item-grab.ts:297-369`） | — |
| 決定 5 | WBS の子孫の写しも、根と同じだけ動く（`CY-6` の ⚠️） | 本体の移動は選んでいない子孫を動かさないが、写しは新しい部分木なので、子孫だけを元の所に残すと写し元の上に重なる | 本体の移動とは 1 点だけ違う |
| 決定 6 | 取り消しは 1 回の引きで 1 段 | `FR-031` の「文書を変えるドラッグ 1 回を 1 段にまとめること（MUST）」。写しは 1 つの命令（`CM-8` に置き場を足す）で書く | — |
| 決定 7 | 押しているあいだの絵は、写しを置くことになる所に描き、写し元はそのまま描く。半透明にはしない | 本体の移動の先の描画（`isPreviewedPress` ・ `previewOfHeldPress`、`frame-loop.ts:635` ・ `:3091`）が、離したときの書き込みを保持中の文書に当てて描く。写しの書き込みは元を消さないので、元はそのまま残る | 写しと元が同じ色で並ぶ |
| 決定 8 | 修飾キーは押した時点で読む。押しているあいだに `Ctrl` を押し・離しても写しとパンは入れ替わらない（`CY-11`） | 表 T-023a は「ポインタを押したときの判定順序」である。`FR-040` の 表 T-028 の後の段が「押した時点の形を保つ」。コードの `gestureModifiers`（`input-command-translator.ts:383-386`）も押した時点の修飾キーを読む | 途中で `Ctrl` を足して写しに変えることはできない |
| 決定 9 | macOS の `Cmd` は `Ctrl` として読む（新しい規則を書かない） | `PND-10` の裁定（`JDG-300`）。コードの `isCtrlHeld`（`input-command-translator.ts:359-361`）が `ctrl ‖ meta`。仕様は macOS を 1 度も書かない（`CR-225` の決定 3） | macOS の慣れた `Option` ドラッグの写しは効かない（`Alt` ドラッグは `MK-12` のまま） |
| 決定 10 | `Dual Cursor` モードでは写さない（`PTD-7` の条件） | 表 T-029a の `DC-5`「このモード中はタスクの作成・移動・編集を受け付けない」。モードの中の `Ctrl` ドラッグは今のまま `PTD-1` のパン | — |
| 決定 11 | 構えがあっても写す（`PTD-7` は構えによらない） | `PTD-1` が「構えと当たりによらず優先する」—— `Ctrl` の引きは今も構えより先に立つ | 依存線を構えたまま選択を `Ctrl` で引くと、写しになる |
| 決定 12 | 離した後は、選択に含まれていた各タスクの写しを選択にする（写し元の選んだ順）。プロパティパネルは出さない（`CY-8`） | 表 T-239 の `TC-9`「作ったタスクを選択にすること」と、表 T-270 の「離した後も全部が選ばれたまま」（動いたのは写しである）。名付けの流れ（`FR-091`）は名前の無い新しいタスクのためのもの | 写し元は選択から外れる。続けて `Ctrl` で引くと、写しの写しになる |
| 決定 13 | `S-208` を越えずに離す、0 日 0 行で離す、`Esc`、ポインタを失う —— どれも何も写さない（`CY-9`） | 本体の移動は 0 日 0 行なら何も書かない（`bodyMoveWrites` が命令を 1 つも作らない）。`S-208` はコードが本体の引きにも使っている（`item-grab.ts:92` の `hasDraggedPastThreshold`）。`IN-4` ・ `IN-1a` | 元の真上に写しを置きたいときは `Ctrl+C` / `Ctrl+V` を使う |
| 決定 14 | 別の `editGroup` の行へ載せる写しは断る。別の `editGroup` の行から自分の行へ写すのは断らない（`CY-10`） | 表 T-015a の `HM-11`「持ってくる道はコピーだけである」と `JDG-306`「他人の行には挿入もできない」 | — |
| 決定 15 | 段の安全弁（`ST-7`）に達するなら断って `RS-24` で告げる（`CY-10`） | `FR-033` の「段が 表 T-014 の `ST-7` の安全弁に達したときは、貼り付けを受け付けずに通知すること（MUST） —— 貼り付けだけに逃げ道を作ると、安全弁が場所によって効いたり効かなかったりする」。同じ理由が `Ctrl` ドラッグにも立つ | — |
| 決定 16 | `Ctrl` ドラッグは貼り付けの置き場（`SK-4` で写したもの）を変えない | 選択の出来事 `copyTaken` の源は `SK-4` だけ（`state-machines.json` の `copyTaken`） | — |
| 決定 17 | 行見出しパネルの行（`TaskGroup`）の `Ctrl` ドラッグは本書の外（10 節） | 表 T-023a は日程の描画領域だけに適用する。表 T-023c の `SL-1` は行を対象に含めない。逐語は「オブジェクト」 | 行を写すのは今のまま `Ctrl+C` / `Ctrl+V` |
| 決定 18 | ヘルプに `MK-15` を載せる（E-06） | `FR-036`「同表に行を足した日は、本要求がその行を載せるかを決めること（MUST）」。`Ctrl` の引きは触っても分からない（`MK-7` と同じ扱い） | ヘルプの塊が 1 行増える |
| 決定 19 | 写しの間のポインタの形は、環境の `copy`（新しい行 `PK-16`）。押しているあいだだけ（`PTD-1` の握った手と同じ）。`Ctrl` を押して乗せただけでは形を変えない。作図の合図は環境の `crosshair` とする（`IN-2` に綴りを書く） | `IN-2`「`Ctrl` 併用と中ボタンのパン中は握った手」—— パンも押しているあいだだけ。問い 4 の答え (a)（`JDG-522`） | — |
| 決定 20 | 写しの `resumeValid` は `null` ではなく `false`、`percentComplete` は `null` ではなく 0（E-08） | 仕様で未着手へ置く値を持つのは 表 T-021a の `PV-4`（`resumeValid` ＝ `false`）だけである。作ったタスク（`task-create.ts:52-57`）はどちらも `null` を置くが、それはコードの値で仕様の行ではない。`FR-090` が「未着手の完了率は 0」と書く | 作ったタスクと写しで、未着手の 2 列の綴りが違う（どちらも 表 T-019a の `PS-1` で未着手と読む） |

---

## 1. 範囲 —— 項目ごとの行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 写しを始める押下 | 表 T-023a の `PTD-7`（新）・ `PTD-1`、表 T-023 の `MK-7` ・ `MK-15`（新） | E-01 ・ E-02 | `PTD-7` と `MK-15` を消し、`MK-7` ・ `PTD-1` を戻す |
| 押した所の範囲（本体だけ・選んだものだけ） | 表 T-308 の `CY-1` ・ `CY-2` | E-05 | `CY-1` ／ `CY-2` の 1 行（問い 1 が (b) なら `CY-2`） |
| 写すもの ／ 写さないもの | 表 T-308 の `CY-3` ・ `CY-4` | E-05 | `CY-4` の 1 行（問い 2 が (b) なら注記を `CY-3` へ移し、`CM-46` ・ `CM-52` で写す文を足す） |
| 置き場 | 表 T-308 の `CY-5` ・ `CY-6`、`CM-8` の説明 | E-05 ・ E-07 | `CY-5` ／ `CY-6` の 1 行 |
| 写しの実績（写す道のすべて） | 表 T-223 の `DU-1`（表 T-308 の `CY-7` はそこを指すだけ） | E-05 ・ E-08 | `DU-1` の ⛔「実績は複製してはならない」の 1 文を消す |
| 離した後の選択 | 表 T-308 の `CY-8`、状態機械の `objectsPicked` の源 | E-05 ・ J-03 | `CY-8` の 1 行 |
| 何も写さない離し方 ／ 断るとき | 表 T-308 の `CY-9` ・ `CY-10`、`S-208` の名 | E-05 ・ J-01 | 各 1 行 |
| 修飾キーを読む時点 | 表 T-308 の `CY-11` | E-05 | `CY-11` の 1 行 |
| ポインタの形 | 表 T-269 の `PK-16`（新）、`IN-2` | E-03 ・ E-04 | `PK-16` の形の欄（問い 4） |
| ヘルプ | `FR-036` の名指し、辞書の `MK-15` | E-06 ・ J-04 | `FR-036` の名指しから `MK-15` を外す |
| 押下の行の型 | 状態機械の `pointerPressed` の `pressRow` | J-02 | 1 語 |
| 接頭辞 | 登録簿の `CY` | J-05 | — |

**数**: 仕様の文の編集 8（E-01 〜 E-08）、原稿 JSON の編集 5（J-01 〜 J-05）。`frame-loop.ts` は ⚠️ 触る（9 節。`CR-554` の後は兄弟のファイル）。

### 1.1 `Task` を写す道の全数（問い 3 の添え書き「※他に日程をコピペするのがあれば、実績を空にしろ。」の当て先。`61bbd572` で測った）

| # | 道 | 要求の行 | 命令 | コードの所 | 実績を空にする所 |
|---|---|---|---|---|---|
| P-1 | `Ctrl+C` → `Ctrl+V` でタスクを写す | `FR-033`、表 T-036 の `SK-4` ／ `SK-5`、表 T-223 の `DU-1` | `CM-8` `pasteTaskSubtree` | `copyForPaste` in `frame-loop.ts:4102-4121` → `pasteWhatWasCopied` `:4123-4151` → `pasteCommandFor` `:4155-4162` → `editTask` `edit-task.ts:217` → `task-paste.ts:26-75`（写しは `:45-46` の `...one`） | `task-paste.ts:45-55`（S-9） |
| P-2 | 選んだ複数のタスクの貼り付け（`PND-449` ／ H4） | `FR-033` の「`Task` が 2 つ以上選ばれているときは、…すべて複製し」（`JDG-300` の Q16 ②） | `CM-8`（`sourceUids` に複数） | 命令と写しは P-1 と同じ `task-paste.ts`。殻の結線は H4 が `copyForPaste`（`:4103` の STOP）へ入れる | P-1 と同じ |
| P-3 | `Ctrl+C` → `Ctrl+V` で行（`TaskGroup`）を写す。行に載る `Task` と WBS の子孫が写る | `FR-033`、表 T-223 の `DU-2` → `DU-1` | `CM-28` `pasteTaskGroupSubtree` | `pasteCommandFor` `frame-loop.ts:4164-4186` → `edit-task-group.ts:225-357`（写しは `:308-309` の `...task`） | `edit-task-group.ts:308-321`（S-9） |
| P-4 | `Agent API` の一括の書き込み | 表 T-107 の `AM-7` `applyCommands`（`tbl-glossary.md:369`）。命令の全数は 表 T-108 | `CM-8` ・ `CM-28` をそのまま運ぶ | `applyCommands` in `agent-api-members.ts:408` → `writeThroughTheOnePath` `:263` → `editDocument` | P-1 ・ P-3 と同じ（命令の中で空にするので、道を分けない） |
| P-5 | 選択を `Ctrl` で引いて写す（本書） | 表 T-023a の `PTD-7`、表 T-308 | `CM-8`（`landing` を足す） | 9 節 | P-1 と同じ |

⚠️ `MCP`（`CR-563` の草稿）は、本書の木では `AM-7` も `CM-8` も名指さない（`grep` 0 件）。`MCP` の書き込みが `AM-7` を通るなら P-4 に含まれ、別の命令を立てるならその変更要求が `DU-1` を読むこと。
⭐ **写しでないので除いたもの**: ファイルの取り込みと合流（`FR-087`、表 T-032 の `MG-3`「別のものとして取り込む」を含む —— 交換相手の実績は交換相手の事実である）、取り消し ／ やり直し（戻す先の文書そのもの）、移動（表 T-270）、`UC-001` の拡張 3a（`FR-033` を指す利用の筋であり、道ではない）、`ScreenState` が覚える外した実績（`PV-4`。写しの `UID` には付かない）。
⭐ 5 つの道は、すべて `CM-8` か `CM-28` を通り、どちらも 表 T-223 の `DU-1` を読む（`CM-28` は `DU-2` から連鎖する）⇒ 規則は `DU-1` の 1 行に置いた（E-08）。

---

## 2. 新しい識別子

⭐ 番号は 2026-09-24 に前に立つ者が `b7a3b76f` で詰めた（`CR-555` 〜 `CR-560` を CR の順に、配られた帯の先頭から隙間なく。帯の外の接頭辞は木の最大 M の次から）。下の「空いている」はその木で測った主張である。⚠️ 規則 02 の 2.5 節: **当てる直前に測り直すこと。** 測り方は 13 節。
⭐ 表の中の順は番号ではなく行の位置で決まる（表 T-023a は上から評価する）。`PTD-7` は番号が小さくても、置く位置は 4.1 節のとおりである。

| 種類 | 採ったもの | 測った最大（`b7a3b76f`、`CR-555` 〜 `CR-560` の草案を除く） |
|---|---|---|
| 行（表 T-023a） | `PTD-7` | `PTD-6`（`fixed-defects.md` の `DFC-576` が引く。表の行は `PTD-5` まで、`PTD-4a` を含む） |
| 行（表 T-023） | `MK-15` | `MK-14`（`CR-301` の中の、生成器に止められて消えた名。仕様に行は無い） |
| 行（表 T-269） | `PK-16` | `PK-10`（`CR-551` が足した行）、`CR-558` の `PK-11` 〜 `PK-15` の次 |
| 表 | `T-308` | `T-306` は古い `CR-110` が、`T-307` は `docs/review/inventory/G2-settings-T202-T203.md:122`（退けた `Project` の表）が引くので飛ばした |
| 接頭辞 | `CY`（登録簿 163 件 —— `CR-551` の `RK` を含む。`CY-` の行は木のどこにも無い） | — |
| 行（表 T-308） | `CY-1` 〜 `CY-11` | — |
| 台帳 | `JDG-467` ・ `JDG-468` ・ `JDG-469`、`JDG-521` ・ `JDG-522` ・ `JDG-523`、`DFC-872` ・ `DFC-873` | 帯 `JDG-441` 〜 `JDG-469` は 6 本で 3 つ足りず、調整役が `JDG-521` 〜 `JDG-523` を足した（`JDG-470` 〜 `JDG-502` はほかの行が使う）。`DFC` は帯の中で `CR-559` の次 |
| 取らないもの | 設定値（新しい値は要らない —— `S-208` を使う）、保留の行、`FR-` ・ `IC-`（新しい要求も入口も要らない —— 本書は既存の `FR-016` ・ `FR-033` ・ `FR-036` ・ `FR-040` ・ `FR-106` に行と段を足すだけで、画面の入口を持たない）、`AM-` ・ `UC-` ・ `V-` ・ `GL-` ・ `CH-` | — |
| 名 | 命令 `pasteTaskSubtree` の欄 `landing`（`dayShift` ・ `groupIdOf`）、関数 `pastedUidsOf` は空いている | — |

- 6 本を詰めた後に返った帯: `S-377` 〜 `S-384`、`T-309`（`T-306` ・ `T-307` は古い文書が引くので飛ばした）、`DFC-874` 〜 `DFC-889`、`PND-561` 〜 `PND-580`（6 本とも保留の行を起こさない）、`PR-29` 〜 `PR-32`、`FR-137` 〜 `FR-148`、`IC-109` 〜 `IC-114`、`AM-20` 〜 `AM-24`（6 本とも使わない）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`61bbd572`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 表 T-223 の `DU-1` の、`Task` の列（実績を含む）を黙ってすべて写す読み | `01-04-requirements.md:2435`（コードは `task-paste.ts:45-46` の `...one`、`edit-task-group.ts:308-309` の `...task`） | 写しは未着手 —— 実績の 5 列を空、`resumeValid` ＝ `false`、`percentComplete` ＝ 0、持ち回りの `ActualDuration` を落とす | E-08 |
| `MK-7` の操作の欄の「**`Ctrl` だけを伴う**ドラッグ」のうち、選択に含まれるタスクの本体から始めるもの | `01-04-requirements.md:3346` | `MK-15` → `PTD-7` | E-02 |
| `PTD-1` の「構えと当たりによらず優先する」の、例外の無い読み（字は残す） | `:3286` | 上の `PTD-7` が先に立つ | E-01 |
| `FR-033` の「複製した `Task` は、複製元と同じ行に載せること（MUST）」と `editGroup` の例外の、`Ctrl` ドラッグへの効き（文は残す） | `:2402-2403` | 表 T-308 の `CY-5` ・ `CY-6` | E-05（結びで分ける） |
| `CM-8` の説明「部分木を複製する（複製元の `Task` を 1 つ以上運ぶ）」の、置き場を運ばない読み | `_assets/tbl-glossary.md:414` | 置き場も運べる | E-07 |
| `S-208` の名（2 つの読み手だけを挙げる） | `_source/settings.json:3845-3848` | 3 つ目の読み手 `CY-9` | J-01 |
| 状態機械の `pointerPressed` が運ぶ押下の行（6 つ） | `_source/state-machines.json:2662-2675` | 7 つ | J-02 |
| 状態機械の `objectsPicked` の源（5 つ）と注 | 同 `:5081-5093` | 6 つ（`CY-8`） | J-03 |
| コード（⛔ 本書は直さない。9 節） | `input-command-translator.ts:118`（`PressRow`）・ `:604-617`（`pressRowOf`）・ `:931`、`gesture-values.ts:10`（`GesturePressRow`）、`frame-loop.ts:3319` ・ `:3336`（ポインタの形）、`tools/generate_help_roster.py:115`（`SHOWN_ASSIGNMENTS`） | 各所 | 実装する者 |

⭐ **消さないもの**（読み直して真のまま）: `UC-007` の手順 5（`:796`「閲覧者が `Ctrl` ＋ ドラッグまたは中ボタンドラッグで、見たい位置まで等倍で動かす」—— 閲覧者は選択を写しに来ない。背景の上の読みは変わらない）、`FR-016` のタイムルーラーの欄「パン（`MK-7`）」（`:3308`）、表 T-023c の `SL-7`（素の左ドラッグの規則。`Ctrl` の引きは 表 T-023a の順で先に `PTD-7` に決まる —— 今の `PTD-1` も同じ形で `SL-7` と並んでいた）、表 T-270 の結びの「本体を引けば選択の全部が動く」（同じ理由）、`MK-12`（`Ctrl` ＋ `Shift` ＋ ドラッグは割当の無いまま）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**（`CR-551` と同じ）: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（13 節の道具が `61bbd572` で 13 の旧（E-02 は 2 つ）のうち J-05 を除く 12 で 1 回を確かめ（J-05 の錨 `DA` は `CR-556` が足す）、順に当てた写しの 4 つの JSON が読めることも確かめた。E-04 の旧は `CR-551` が足す行なので、その後の木で数えること）。旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊である。
⚠️ 生成物（`_assets/tbl-settings.md` ・ `tbl-row-id-prefixes.md` ・ `tbl-state-machines.md` と `src/` の生成物 —— `display-words.json` ・ `help-roster.json`）は手で直さない。原稿を直して `npm run gen` を打つ。

### 4.1 文の編集（`01-04-requirements.md` ・ `_assets/tbl-glossary.md`）

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
写しを始める押下（表 T-023a）。`PTD-7` を `PTD-1` の上に足し、`PTD-1` に例外を書く。旧
```text
| PTD-1 | 中ボタンドラッグ、または **`Ctrl` だけを伴う**左ドラッグ | **パン。<br>** 構えと当たりによらず優先する。<br>**握っているあいだ、縦横の両方向でポインタに追従させること（MUST）**—— ⛔ **離すまで動かないと、掴めていないのと見分けがつかない**（`FR-053` の掴み帯が同じ理由を持つ）。<br>⚠️ **距離は 表 T-023d の等倍の定めのままである** —— **追従は絵の話であって、距離の規則を変えるものではない** |
```
新
```text
| PTD-7 | **`Ctrl` だけを伴う**左ドラッグで、`Dual Cursor` モード中でなく、押した点が選択に含まれるタスクの本体（`FR-104` の 表 T-266 の `GA-9` ／ `GA-14` ／ `GA-15`）に当たった | **選択を写して、離した所に置く。<br>** 構えによらず優先する（`PTD-1` と同じ）。<br>写すもの・置き場・何も写さない離し方・断り方は `FR-033` の 表 T-308 に従うこと（MUST）。<br>⭐ 押しているあいだ、写しを置くことになる所に写しを描き、写し元はそのまま描くこと（MUST） —— 表 T-023d の閉じの規則と同じ作法である。<br>⛔ 押しているあいだ値を文書へ書いてはならない（MUST NOT）（`FR-031`）—— **追従は絵であって編集ではない** |
| PTD-1 | 中ボタンドラッグ、または **`Ctrl` だけを伴う**左ドラッグ | **パン。<br>** 構えと当たりによらず優先する。<br>⚠️ ただし上の `PTD-7`（選択に含まれるタスクの本体から始めた `Ctrl` だけの左ドラッグ）が先に立つ —— 背景と、選択に含まれないものの上から始めた `Ctrl` ドラッグは本行である。<br>**握っているあいだ、縦横の両方向でポインタに追従させること（MUST）**—— ⛔ **離すまで動かないと、掴めていないのと見分けがつかない**（`FR-053` の掴み帯が同じ理由を持つ）。<br>⚠️ **距離は 表 T-023d の等倍の定めのままである** —— **追従は絵の話であって、距離の規則を変えるものではない** |
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`MK-7` を狭め、`MK-15` を表 T-023 の末尾に足す。旧（`MK-7` の行）
```text
| MK-7 | **`Ctrl` だけを伴う**ドラッグ / 中ボタンドラッグ | 表 T-023a の `PTD-1` | — |
```
新
```text
| MK-7 | **`Ctrl` だけを伴う**ドラッグ（`MK-15` の場所から始めるものを除く） / 中ボタンドラッグ | 表 T-023a の `PTD-1` | — |
```
続けて旧（表 T-023 の最後の行 `MK-13` の末尾と、表の後の段の頭）
```text
| — |

`Confirmation`（`U-55`）または `ScreenState` が持つ面が立っているあいだ、
```
新
```text
| — |
| MK-15 | 選択に含まれるタスクの本体の上から始める、**`Ctrl` だけを伴う**左ドラッグ | 表 T-023a の `PTD-7`（写すものと置き場は `FR-033` の 表 T-308） | — |

`Confirmation`（`U-55`）または `ScreenState` が持つ面が立っているあいだ、
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
ポインタの形（表 T-028 の `IN-2`）。旧
```text
| IN-2 | ポインタの形が、その場所で何ができるかを示すこと（何にも当たらない場所は範囲選択の合図、`Ctrl` 併用と中ボタンのパン中は握った手、構えているときは作図の合図、
```
新
```text
| IN-2 | ポインタの形が、その場所で何ができるかを示すこと（何にも当たらない場所は範囲選択の合図、`Ctrl` 併用と中ボタンのパン中は握った手、`Ctrl` 併用で選択を写して引いているあいだ（表 T-023a の `PTD-7`）は `FR-106` の 表 T-269 の `PK-16`、構えているときは作図の合図（閲覧環境の `crosshair`）、
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
ポインタの形の表（`FR-106` の 表 T-269）。旧は `CR-551` の E-18 が足した行である（`61bbd572` で 1 回）。旧
```text
| PK-10 | 左右の境目 | 閲覧環境の、縦の境目を左右へ動かす形（`col-resize`） | — | — | 環境のまま | 環境のまま |
```
新
```text
| PK-10 | 左右の境目 | 閲覧環境の、縦の境目を左右へ動かす形（`col-resize`） | — | — | 環境のまま | 環境のまま |
| PK-16 | 写し | 閲覧環境の、写して置く形（`copy`） | — | — | 環境のまま | 環境のまま |
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
`FR-033` に `Ctrl` ドラッグの段と 表 T-308 を足す（表 T-223 の後の注記とピン止めの段の後、置き場の段の前）。旧
```text
⚠️ ピン止めを複製しないのは、`S-127` の上限を人の知らないうちに埋めるからである（上限に達したときの扱いは `FR-098`）。
```
新
```text
⚠️ ピン止めを複製しないのは、`S-127` の上限を人の知らないうちに埋めるからである（上限に達したときの扱いは `FR-098`）。

⭐ 選択に含まれるタスクの本体を `Ctrl` だけを伴って引いたとき（表 T-023a の `PTD-7`）も、本要求の複製を行い、写しを離した所に置くこと（MUST） —— 写すもの・置き場・何も写さない離し方・断り方は 表 T-308 に従うこと（MUST）。  
⚠️ 貼り付けと同じ複製であり、一緒に写るものは 表 T-223 のままである —— 違うのは置き場だけである。

**表 T-308 — `Ctrl` ドラッグで写すものと、写しの置き場**

| 行 ID | 事項 | 規則 |
| --- | --- | --- |
| CY-1 | 写しを始める押下 | 選択に含まれるタスク（マイルストーンを含む）の本体 —— `FR-104` の 表 T-266 の `GA-9` ／ `GA-14` ／ `GA-15`。<br>⭐ 表 T-270 で、引けば選択の全部を動かす掴み代と同じ 3 つである。<br>⚠️ 同じタスクの端・フェードの掴み点・進捗マーカー・ダミー・再開アイコンから始めた `Ctrl` だけの左ドラッグは、表 T-023a の `PTD-1` のパンである |
| CY-2 | 選択に含まれないものの上から始めたとき | 写さない。<br>表 T-023a の `PTD-1` のパンである —— 押したものを選び直して写すことはしない |
| CY-3 | 写すもの | 選択に含まれるタスクのすべてと、その WBS の子孫。<br>一緒に写るものは 表 T-223 の `DU-1` のとおりとする（部分木の内側で閉じた依存を含み、`TaskOrigin` を含まない）。<br>⭐ 押した 1 つだけでなく選択の全部を写すのは、本体を引けば選択の全部が動く 表 T-270 と同じ読みである |
| CY-4 | 写さないもの | ハイライトボックス・コメントボックス（本要求の「注記を複製しない」）、選んだ依存線そのもの（部分木の外へ出る依存は写さない）、基準日線（1 本しかない —— 表 T-023c の `SL-1`）。<br>⚠️ これらが選択に混ざっていても、写すのはタスクだけである |
| CY-5 | 写しの置き場（横） | すべての写しの予定を、引いた日数だけずらすこと（MUST）。<br>日数の数え方は、本体を引いて動かすとき（表 T-270 の `PE-1` ・ `PE-6`）と同じとする |
| CY-6 | 写しの置き場（縦） | すべての写しを、引いた行数だけ移した行に載せること（MUST）。<br>行数は画面に描いた行で数え、どれかの写しが最初の行より上か最後の行より下へ出るときは、全体をそこで止める（表 T-270 の本体の移動と同じ）。<br>写し元が描いた行に無いときは、写し元の行に載せる。<br>⚠️ WBS の子孫の写しも、根の写しと同じ日数と行数だけ動く —— 本体の移動では選んでいない子孫は動かないが、写しは新しい部分木なので、子孫だけを写し元の所に残すと写し元に重なる |
| CY-7 | 写しの実績 | 写しは実績を持たない —— 表 T-223 の `DU-1` のとおり未着手として作る（貼り付けと同じ）。<br>⛔ 本表に実績の規則を書き写してはならない（MUST NOT） —— 写す道のすべてが `DU-1` を読む |
| CY-8 | 離した後の選択 | 選択に含まれていた各タスクの写しを選択にし、写し元の選んだ順を保つこと（MUST）（表 T-023c の `SL-7b`）。<br>プロパティパネルは出さず、名称の欄に焦点を置かない —— 写しは名前を持っており、`FR-001` の 表 T-239 の `TC-9` の名付けの流れは、名前の無い作ったタスクのためのものである |
| CY-9 | 何も写さない離し方 | ① 押した点から `_assets/tbl-settings.md` の `S-208` を越えて動かさずに離した。<br>② 引いた日数と行数がともに 0 である。<br>③ `Esc`（表 T-028 の `IN-4` の進行中のドラッグの段）。<br>④ 離す前にポインタを失った（`IN-1a`）。<br>いずれも文書に書かず、選択も変えないこと（MUST） |
| CY-10 | 断るとき | 載せる行が別の `editGroup` の行であるとき（表 T-015a の `HM-11`。断り方は `FR-111`）、または段が 表 T-014 の `ST-7` の安全弁に達するとき（本要求の上の段と同じく、表 T-233 の `RS-24` で告げる）。<br>断ったときは何も写さない。<br>⭐ 別の `editGroup` の行から自分の行へ写すことは断らない —— 持ってくる道はコピーだけである（`HM-11`） |
| CY-11 | 修飾キーを読む時点 | 押した時点の修飾キーで決め、押しているあいだに `Ctrl` を押しても離しても変えないこと（MUST） —— 表 T-023a は押したときの判定順序である。<br>⚠️ ポインタの形も押した時点の形を保つ（`FR-040` の 表 T-028 の後の段） |

⭐ 上の「複製した `Task` は、複製元と同じ行に載せること（MUST）」とその `editGroup` の例外は、貼り付けの置き場である —— `Ctrl` ドラッグの置き場は本表の `CY-5` ・ `CY-6` が持つ。  
⛔ `Ctrl` ドラッグで写したことで、貼り付けの置き場（表 T-036 の `SK-4` で写したもの）を変えてはならない（MUST NOT） —— 置き場を満たす道は `SK-4` だけである。  
⚠️ 押した時点の `Ctrl` の読み方（macOS の扱い）は本表が定めない —— 表 T-023 と 表 T-036 の `Ctrl` と同じである。
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
ヘルプ（`FR-036`）に `MK-15` を載せる。旧
```text
ヘルプは、`_assets/tbl-glossary.md` の 表 T-109 の全行と、表 T-036 のうち `入口` が `—` で `割当` が `—` でない行と、表 T-023 の `MK-2` / `MK-5` / `MK-7` と、
```
新
```text
ヘルプは、`_assets/tbl-glossary.md` の 表 T-109 の全行と、表 T-036 のうち `入口` が `—` で `割当` が `—` でない行と、表 T-023 の `MK-2` / `MK-5` / `MK-7` / `MK-15` と、
```

<!-- EDIT id=E-07 file=docs/spec/_assets/tbl-glossary.md -->
命令 `CM-8` に置き場を運べることを書く。旧
```text
| CM-8 | `Task` | `pasteTaskSubtree` | ⭐ | 部分木を複製する（複製元の `Task` を 1 つ以上運ぶ） | `FR-033` |
```
新
```text
| CM-8 | `Task` | `pasteTaskSubtree` | ⭐ | 部分木を複製する（複製元の `Task` を 1 つ以上運ぶ）。<br>`Ctrl` ドラッグの写しは、ずらす日数と、写しを載せる行も運ぶ（`FR-033` の 表 T-308 の `CY-5` ・ `CY-6`） | `FR-033` |
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
写しの実績（表 T-223 の `DU-1`）。利用者の答え `JDG-521`「写しを横へずらしたとき、実績 → (c) 未着手として作る ※他に日程をコピペするのがあれば、実績を空にしろ。」。旧
```text
| DU-1 | `Task` | **その `Task` の WBS の子孫**、`TaskVisual`、`TaskGroupMember`、**部分木の内側で閉じた依存**、**その `Task` を指す割当**（`Assignment`）。<br>⛔ **`TaskOrigin` は複製してはならない（MUST NOT）** |
```
新
```text
| DU-1 | `Task` | **その `Task` の WBS の子孫**、`TaskVisual`、`TaskGroupMember`、**部分木の内側で閉じた依存**、**その `Task` を指す割当**（`Assignment`）。<br>⛔ **`TaskOrigin` は複製してはならない（MUST NOT）**。<br>⛔ **実績は複製してはならない（MUST NOT）** —— 写しは未着手（表 T-019 の `PA-1`）として作ること（MUST）。写しの `actualStart` ・ `stop` ・ `actualFinish` ・ `resume` は空、`resumeValid` は `false` とし（表 T-021a の `PV-4` が未着手へ戻すときに置く値と同じ）、持ち回りの `ActualDuration`（`G-13`）を落とし、`percentComplete` は 0 とする（`FR-012` の式の分子が 0 である。予定の日付を欠く写しも 0 —— `FR-090` の「未着手の完了率は 0」）。<br>⭐ 本段は、`Task` を写すすべての道に当たる —— `SK-4` ／ `SK-5` の貼り付け（`CM-8`、行の写し `CM-28` は `DU-2` から本行へ連鎖する）、`Agent API` の `AM-7` が運ぶ同じ 2 つの命令、`Ctrl` ドラッグ（表 T-308）。<br>⚠️ マイルストーンも同じである。写し元の実績を覚えて写しへ戻す道は無い（`PV-4` の覚えは写し元の `UID` に付く） |
```

### 4.2 原稿 JSON の編集（`_source/`）

<!-- EDIT id=J-01 file=docs/spec/_source/settings.json -->
`S-208` の名に 3 つ目の読み手を足す。旧
```text
      "ja": "掴んだ行の軸が決まる距離（表 T-051 の `HF-15`）と、図形を置くときに押しと引きを分ける距離（`FR-001` / `FR-019`）"
```
新
```text
      "ja": "掴んだ行の軸が決まる距離（表 T-051 の `HF-15`）と、図形を置くときに押しと引きを分ける距離（`FR-001` / `FR-019`）と、選択を `Ctrl` で引いて写すかを分ける距離（`FR-033` の 表 T-308 の `CY-9`）"
```

<!-- EDIT id=J-02 file=docs/spec/_source/state-machines.json -->
身振りの領域（表 T-289）の `pointerPressed` が運ぶ押下の行に `PTD-7` を足す。旧
```text
       "rows": [
        "PTD-1",
        "PTD-2",
        "PTD-3",
        "PTD-4",
        "PTD-4a",
        "PTD-5"
       ],
       "note": {
        "ja": "押下の行。呼び手が構えと `Dual Cursor` から詰める"
       }
```
新
```text
       "rows": [
        "PTD-7",
        "PTD-1",
        "PTD-2",
        "PTD-3",
        "PTD-4",
        "PTD-4a",
        "PTD-5"
       ],
       "note": {
        "ja": "押下の行。呼び手が構え・`Dual Cursor`・選択から詰める。`PTD-7`（選択を写す）は文書を変える押下である"
       }
```

<!-- EDIT id=J-03 file=docs/spec/_source/state-machines.json -->
選択の領域（表 T-293）の `objectsPicked` の源に `CY-8` を足す。旧
```text
       "SL-7a"
      ],
      "note": {
       "ja": "対象を選ぶ押下・範囲・`Shift` での増減・全選択・端のドラッグで絞ること。新しい選択は呼び手（入力の翻訳係）が組み、値が変わったときだけ送る"
      }
```
新
```text
       "SL-7a",
       "CY-8"
      ],
      "note": {
       "ja": "対象を選ぶ押下・範囲・`Shift` での増減・全選択・端のドラッグで絞ること。新しい選択は呼び手（入力の翻訳係）が組み、値が変わったときだけ送る。⭐ `Ctrl` ドラッグの写し（表 T-308 の `CY-8`）だけは、写しが着地したあとに殻が組んで送る —— 写しの `UID` は書き込みが払い出す"
      }
```

<!-- EDIT id=J-04 file=docs/spec/_source/display-words.json -->
辞書の `assignments` の末尾（`MK-13` の後）に `MK-15` を足す。語は 11 節の問い 5 で利用者が認めた（提案どおり）。旧
```text
    "en": "Double click"
   }
  }
 ],
 "weekdays": [
```
新
```text
    "en": "Double click"
   }
  },
  {
   "rowId": "MK-15",
   "text": {
    "ja": "選んでいるものを写して、離した所に置く",
    "en": "Copy the Selection and put the copy where you release"
   },
   "press": {
    "ja": "選んでいるものの上で Ctrl ＋ ドラッグ",
    "en": "Ctrl + drag on the Selection"
   }
  }
 ],
 "weekdays": [
```

<!-- EDIT id=J-05 file=docs/spec/_source/row-id-prefixes.json -->
接頭辞 `CY` を `CV` と `DA` のあいだに登録する（⚠️ `CR-556` が先に `DA` を `CV` と `DC` のあいだに足す。字の順 `CV` → `CY` → `DA` → `DC` を保つため、錨は `DA` の項である。`CR-556` を当てる前に本書を当てるなら、錨を `DC` に読み替える）。旧
```text
  {
   "prefix": "DA",
```
新
```text
  {
   "prefix": "CY",
   "words": "Copy drag",
   "owner": "spec",
   "means": {
    "ja": "選択を `Ctrl` で引いて写すときの、写すものと写しの置き場の条"
   }
  },
  {
   "prefix": "DA",
```

### 4.3 生成器と生成物（形で示す）

| 何 | 何をする |
|---|---|
| `npm run gen` | 上の原稿から `_assets/tbl-settings.md`（`S-208` の名）・ `tbl-row-id-prefixes.md`（`CY`）・ `tbl-state-machines.md`（2 つの源）と、`src/` の生成物（`display-words.json` の `MK-15`、`help-roster.json`）を刷る |
| `tools/generate_help_roster.py:115` | ⛔ **波 0 で同時に直すこと** —— `SHOWN_ASSIGNMENTS` に `MK-15` を足す。直さないと、生成器が「表 T-023 の行が 3 つの名簿のどれにも無い」で止まる（`:110-113` の注。`CR-301` が同じ形で 1 度止められた） |
| `.claude/skills/spec-graph-check/dictionary-table-pairing.txt` の 2 行 | ① `:40` の `T-023 MK-7 b9a7645e50f9ae49` —— `MK-7` の行の字が変わる（E-02）ので指紋を刷り直す。② 新しい行 `T-023 MK-15 <指紋>` —— 名の順で `:34`（`T-023 MK-13`）と `:35`（`T-023 MK-2`）のあいだに入る。⭐ 利用者が基準線の移動を許した（`JDG-546`、2026-09-24、「基準線は変更してよい。」）。⛔ 移すのは基準線を持つ調整役のセッションであり、`CR-560` を当てるとき、指紋を 2 組とも読み直してから書く（本書と当てる体は基準線のファイルを書かない） |

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

| # | 間 | 継ぎ目（逐語） |
|---|---|---|
| S-1 | 仕様 ↔ 入力の翻訳係（`input-command-translator.ts` の `pressRowOf`） | `PressRow` に `'PTD-7'` を足す。`pressRowOf` は、中ボタンの判定の後、`PTD-1` の判定の前に、「左 かつ `isCombo(modifiers, true, false, false)` かつ `dualCursorFollowing === null` かつ `hit` が `GA-9` ／ `GA-14` ／ `GA-15` で、その `item` が `kind: 'task'` で `context.selection` に含まれる」なら `'PTD-7'` を返す。`pressRowOf` の第 2 引数の型に `selection` を足す |
| S-2 | 翻訳係 ↔ 文書の編集（命令 `CM-8`） | 離したときの書き込みは、1 つの束に 1 つの命令 `{ kind: 'pasteTaskSubtree', sourceUids, landing: { dayShift, groupIdOf } }`。`sourceUids` は選択に含まれるタスクの `UID`（選んだ順）。`dayShift` は本体の移動の `dayShift(context, press.at.x, release.x)` と同じ整数の暦日。`groupIdOf` は写し元の `UID` → 載せる行の `groupId` で、行が変わる写し（部分木の子孫を含む）だけを持つ。`landing` の無い命令は今の貼り付けのまま |
| S-3 | 文書の編集（`task-paste.ts`） | 写しは、`landing` の有無によらず未着手として作る（S-9）。`landing` があるとき、写しの `start` ／ `finish` を `dayShift` だけずらし、`TaskGroupMember` の `groupId` を `groupIdOf` で置き換える。`UID` の払い出しは今のまま（`schedule.tasks` の順に `uidHighWaterMark + 1` から）。⭐ 写し元 → 写しの `UID` の対応を返す純粋な関数 `pastedUidsOf(schedule, sourceUids): ReadonlyMap<number, number>` を同じファイルから `export` し、`pasteTaskSubtree` 自身もそれを使う（払い出しの持ち主を 1 つにする） |
| S-4 | 殻 ↔ 選択（`objectsPicked`） | 殻は、`PTD-7` の束が着地したあと、書く前の文書に `pastedUidsOf` を当てて、選択に含まれていた各タスクの写しの `UID` を選んだ順に並べ、`{ type: 'objectsPicked', pickedObjects }` を 1 度送る。着地しなかった（断った）ときは送らない |
| S-5 | 殻 ↔ 段の安全弁 | `PTD-7` の束を書く前に、貼り付け（`pasteWhatWasCopied`）と同じく、書いた後の文書を並べて `stackSafetyCapReached` を確かめ、立てば書かずに `RS-24` を告げる。⭐ 同じ確かめを 1 つの関数にして両方から呼ぶ（`CR-554` の後は `copy-and-paste.ts`、`UF-168`） |
| S-6 | 仕様 ↔ 状態機械 | 新しい状態・出来事・効果は無い。`pointerPressed` の `pressRow` に `PTD-7` が来れば `isDocumentChangingPress` は真（`VIEWING_PRESS_ROWS` は `['PTD-1', 'PTD-5']` のまま）⇒ `changingDocument`。`GesturePressRow`（`gesture-values.ts:10`、翻訳係の型の手の写し）にも `'PTD-7'` を足す |
| S-7 | 殻 ↔ ポインタの形 | 押している押下の `pressRow` が `'PTD-7'` なら `'copy'`（`PK-16`）。`PTD-1` の `'grabbing'` と同じ所で、押した時点で決め、押しているあいだ選び直さない |
| S-8 | 殻 ↔ 先の描画 | 変えない。`isPreviewedPress` は `hit` の掴み代（`GA-9` ほか）で真になり、`previewOfHeldPress` は離したときの束（S-2）を保持中の文書に当てて描く ⇒ 写しが置き場に描かれ、元は残る。拒まれた束は描かない（`PND-253` のまま） |
| S-9 | 文書の編集（`task-paste.ts` ・ `edit-task-group.ts`） ↔ 仕様（表 T-223 の `DU-1`） | 写しの `Task` は 1 つの純粋な関数 `unstartedCopyOf(task, within): Task` を通して作る。中身は `task-plan-actual.ts` の `actualCleared`（`actualStart` ・ `actualFinish` ・ `stop` ・ `resume` を `null`、`resumeValid` を `false`、持ち回りの `ActualDuration` を落とす）に `percentComplete: 0` を足したもの。`pasteTaskSubtree`（`task-paste.ts:45-55`）と `pasteTaskGroupSubtree`（`edit-task-group.ts:308-321`）の両方が呼ぶ。`Agent API`（`AM-7`、`agent-api-members.ts:408`）は同じ 2 つの命令を通るので、別に直す所は無い |

---

## 6. グラフ（`ebc71984` で測り、`61bbd572` で ID の衝突だけを測り直した）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 要求 / 参照 | 指している要求と、偽になる所 |
|---|---|---|
| `MK-7` | 2 / 2 | `FR-016`（`:3308` タイムルーラーの欄「パン（`MK-7`）」—— 真のまま）・ `FR-036`（`:6603` ヘルプの名指し —— E-06 で `MK-15` を足す） |
| `PTD-1` | 1 / 2 | `FR-016`（`:3346` の `MK-7`）・ `tbl-state-machines.md:520`（身振りの出来事 —— J-02 が刷り直す） |
| `IN-2` | 2 / 3 | `FR-106`（`:3714` ・ `:3717`）・ `FR-101`（`:5738`）—— どれも `IN-2` の中身を引き写さない |
| 表 T-023a | 14 要求 | `UC-007`（`:807`「パンはしない（`PTD-5`）」）・ `FR-001` ・ `FR-005` ・ `FR-009` ・ `FR-108` ・ `FR-082`（`:4888` の `DC-5` —— 決定 10 で守る）・ `FR-049` ・ `FR-087` ・ `FR-036`（`:6604`「表 T-023a を載せてはならない」—— `PTD-7` も載せない。載せるのは `MK-15`）・ `FR-040` ・ `NFR-004`（`:7073` の操作の母数に `PTD-7` が入る —— 数え方の文は変わらない）。⭐ 偽になる所は無い |
| `FR-033` | 4 / 15 | `FR-085` ・ `FR-005` ・ `FR-081` ・ `FR-057`（`EX-12` —— 写しの日付の作り直しは貼り付けと同じ）。`05-07-design.md:130` ・ `:135` ・ `:390` ・ `:560`、`tbl-glossary.md:414` ・ `:434`、`tbl-state-machines.md:886-891` |
| `CM-8` | 1 / 1 | `FR-033` |
| `FR-036` | 5 / 16 | `FR-016` ・ `FR-053` ・ `FR-070` ・ `FR-092` ・ `NFR-004`。⚠️ `tbl-settings.md:366-368` と 表 T-109 の 3 か所はヘルプの面の話で、名指しの数を引かない |
| `SL-7` | 2 / 2 | `FR-081` ・ `FR-016`（書き直さない —— 3 節の「消さないもの」） |
| `S-208` | 3 / 7 | `FR-001` ・ `FR-004` ・ `FR-019`、`tbl-state-machines.md:523` ・ `:595` —— 名に 1 句足すだけで値は変えない |
| 表 T-269 | `FR-104` ・ `FR-106` ・ `FR-040` ほか 2 ホップ 7 | 行を足しても偽にならない（`CR-551` の `PK-10` と同じ） |
| 表 T-270 | 12 要求 | 書き直さない（`CY-5` ・ `CY-6` ・ `CY-7` が引くだけ） |
| `FR-106` | 1 / 5 | `(section) 1.10`（`:415`）・ `FR-040` |
| `MK-8` | 1 / 1 | `FR-036`（`:6605` の「触れば分かる操作」—— 書き直さない） |
| `DU-1` | 1 / 2 | `FR-033`（`:2431` ・ `:2433`）—— `CY-3` が引くだけ |

⭐ 導いた条項ごとに、届いた行を `rulings.md` で引いた（規則 02 の 1）: 当たるのは `JDG-306`（他人の行には挿入できない。`CY-10`）、`JDG-307`（写しの `UID` は新しい。S-3 のまま）、`JDG-300` の Q16 ②（選んだタスクを全部写す。`CY-3`）、`PND-10`（`Cmd` を `Ctrl` と読む。決定 9）。覆す行は `MK-7` の読みだけで、それを記した `JDG` 行は無い（12 節）。

### 6.2 `induced.py`（3 群、`cbf5ba1a` で測った。check.sh の書き出し）

| 種 | 解決 | 種の中の辺 | 閉路 | 扱い |
|---|---|---|---|---|
| `MK-7 PTD-1 T-023a MK-8 SL-7 FR-016 FR-036 T-270` | 8/8 | 11 | 0 | 1 つずつ書いてよい |
| `FR-033 CM-8 DU-1 T-223` | 4/4 | 4 | 1: `CM-8` `FR-033` | ⭐ 2 つを 1 つの計画で書いた（E-05 ・ E-07） |
| `IN-2 T-269 FR-106 FR-040 S-208` | 5/5 | 6 | 1: `FR-106` `IN-2` | ⭐ 2 つを 1 つの計画で書いた（E-03 ・ E-04） |

---

## 7. 数の予測（`61bbd572` で測った前。当てた後に同じ数え方で突き合わせる）

| 数 | 前（`61bbd572`） | 本書の差分 | 内訳 |
|---|--:|--:|---|
| tables | 187 | ＋1 | 表 T-308 |
| figures | 27 | 0 | — |
| rows | 2305 | ＋14 | `PTD-7` ・ `MK-15` ・ `PK-16` ・ `CY-1` 〜 `CY-11` |
| uids | 162 | 0 | — |
| 接頭辞 | 163 | ＋1 | `CY` |
| 辞書の項 | — | ＋1 | `assignments` の `MK-15` |

⚠️ 前の数は `CR-551` を当てた後、`CR-552` ・ `CR-553` を当てる前の木である。当てる者は、本書を当てる直前の木の数に上の差分を足して突き合わせること。

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

⛔ **当てる順**: `CR-551`（波 0〜3）→ `CR-552` → `CR-553` → H2〜H10（とくに H4 の複数のタスクの貼り付けの結線 —— `copyForPaste` ・ `pasteCommandFor`、`PND-449`）→ `CR-554`（段 7.5 の分割）→ **本書**。
理由: 本書のコードの所のうち 3 つ（ポインタの形・先の描画・写しと貼り付け）は、`CR-554` が `frame-loop.ts` から兄弟のファイルへ移す所である。先に当てると、`CR-554` の照合器の基準と範囲の行番号が動く。

**共有するファイル**（先の変更要求の着地の上で、旧を数え直すこと）:

| ファイル | 共有する相手 | 触る塊が重なるか |
|---|---|---|
| `docs/spec/01-04-requirements.md` | `CR-551`（35 件。表 T-269 に `PK-10` を足す E-18 ほか）、`CR-552`（表 T-023a の結び・`FR-108`）、`CR-553` | ⚠️ E-04 は `CR-551` の `PK-10` の行を旧に使う。ほかは重ならない（13 節で、`CR-551` 〜 `CR-554` の文に本書の旧の句が 0 回であることを確かめた） |
| `docs/spec/_assets/tbl-glossary.md` | `CR-551`（`IC-100` の移し・`IC-106` ・ `CM-25` ・ `P-20`） | 重ならない（`CM-8` の行） |
| `docs/spec/_source/settings.json` | `CR-551`（`S-63` ・ `S-163` ・ `S-194` ・ `S-195` ・ 新しい 14 行）、`CR-552`（`S-86` ・ `S-49`） | 重ならない（`S-208`） |
| `docs/spec/_source/state-machines.json` | `CR-551` の J-15（`dualCursorModeStateMachine`） | 重ならない（身振りと選択の領域） |
| `docs/spec/_source/display-words.json` | `CR-551` の J-11 〜 J-14、`CR-552` の J-03（`K-55`） | 重ならない（`assignments` の末尾） |
| `docs/spec/_source/row-id-prefixes.json` | `CR-551`（`RK`） | 重ならない（`CY` は `CV` の後） |
| `src/adapter/input-command-translator/input-command-translator.ts` | `CR-551` の波 2（着地済み） | 重ならない（`:118` ・ `:604-617` ・ `:931`）。`CR-554` は割らない（4.9） |
| `src/framework/single-html-shell/frame-loop.ts` | `CR-551` の波 2（着地済み）、`CR-553`（`:1642` の注）、H3 ・ H4 ・ H7 ・ H8 ・ H9、`CR-554`（分割） | ⚠️ 本書の所は `CR-554` の後に兄弟へ移る: `pointerShapeUnder`（`:3313-3337`）→ `pointer-shape.ts`（`UF-157`）、`isPreviewedPress`（`:635`）→ `held-press-preview.ts`（`UF-158`。本書は変えない）、`pasteWhatWasCopied` の安全弁の確かめ（`:4135-4151`）→ `copy-and-paste.ts`（`UF-168`）、`carryOutAction` の `changeDocument`（`:4192-4203`）→ 入口に残る |
| `src/use-case/edit-document/task-paste.ts` ・ `edit-task.ts` | H4（複数の貼り付けの結線は殻の側。`task-paste.ts` は `CR-543` で既に複数を運ぶ） | 重ならない見込み。H4 が `task-paste.ts` を触ったら数え直す |

```
wave 0  spec     all of section 4 (E-01..E-08, J-01..J-05) + tools/generate_help_roster.py:115 (MK-15)
                 + npm run gen + gen:check      (ONE body, one worktree, cut after CR-554 landed)
                 -> tests that read the spec verbatim or count table rows go red here, by design (section 9)
                 -> dictionary-table-pairing.txt :40 (MK-7) and a new MK-15 line: approved by the user (JDG-546);
                    the coordinator session that holds the baselines moves them when CR-560 is applied
wave 1  (parallel, disjoint folders; cut from wave 0's commit)
  1a use-case/edit-document   task-paste.ts (landing, pastedUidsOf -- S-3), edit-task.ts:79 (command type),
                              edit-document.ts:150 only if the kind list needs it
  1b adapter + gesture         input-command-translator.ts (:118 PressRow, :604-617 pressRowOf, :931 case),
                              item-grab.ts (copyDragWrites from bodyMoveWrites' pieces -- S-2),
                              use-case/advance-screen-session/gesture-values.ts:10 (GesturePressRow -- S-6)
wave 2  shell (ONE body): pointer-shape.ts (S-7), copy-and-paste.ts (S-5, shared cap check),
                              frame-loop.ts entry carryOutAction (S-4 objectsPicked after landing)
                              -- no function grows past its check-60 line; new branches go to new functions
wave 3  tests by a spec-only tester (never an implementer), on the MERGED tree; then check.sh + vitest;
        npm run build so the user can try dist/index.html by file://
```

- ⭐ **基準線の移動は許された**（`JDG-546`、2026-09-24、「基準線は変更してよい。」）—— `dictionary-table-pairing.txt` の `:40`（`T-023 MK-7 b9a7645e50f9ae49`、指紋の刷り直し）と、`:34` と `:35` のあいだの新しい行（`T-023 MK-15`）の 2 行。⛔ 移すのは基準線を持つ調整役のセッションで、波 0 の `npm run gen` の後に行う（波 0 の体は書かない）。
- ⚠️ 1a と 1b は命令の形（S-2）を分けて持つ。継ぎ目 S-2 ・ S-3 を両方の依頼文へ逐語で写すこと。
- ⚠️ 1b の `gesture-values.ts` は `use-case` のフォルダだが、`PressRow` の手の写し（`TRAP` の注）なので翻訳係と同じ波に置いた。
- ⚠️ 性能: 押しているあいだ、毎フレーム保持中の文書に貼り付けを当てて描く（S-8）。本体の移動と同じ道だが、写す部分木が大きいと重くなる。⛔ 性能の試し（`RISK-001` の門）を走らせる前に、前に立つ者が利用者に声をかける（記録 `perf-test-notify`）。
- ⚠️ `dist/` は利用者が `file://` で試す。着地の報告には枝・commit・sha を添えること。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

所は `61bbd572` の行番号。`frame-loop.ts` の所は「関数名 in ファイル（`CR-554` の前）」で書いた。

| 所 | 何をする | 試験（いま引いているもの） |
|---|---|---|
| `pressRowOf` in `src/adapter/input-command-translator/input-command-translator.ts:604-617`、`PressRow` `:118`、`commandFromInput` の振り分け `:931` | S-1。`case 'PTD-7'` で `item-grab.ts` の新しい関数へ | `tests/unit/cr-438-pointer-chart-presses-grabs-and-arms.test.ts:239-240`（`Ctrl` だけの押下が当たったタスクの上でもパン —— `BASE` の選択が空なら緑のまま。選んでいるなら書き直す）・ ほか `pressRowOf` を引く 15 本 |
| `bodyMoveWrites` ・ `clampedRowShift` in `src/adapter/input-command-translator/item-grab.ts:297-369` | 同じ関数（`dayShift` ・ `drawnRowsCrossed` ・ `clampedRowShift`）を使って `CM-8` に `landing` を付けた 1 命令を作る（S-2）。`clampedRowShift` の保持する行は写し（子孫を含む）の行で数える（`CY-6`） | `tests/unit/dfc-568-gr-14-corners-anchor-and-body.test.ts` ほか本体の移動の試験は緑のまま |
| `pasteTaskSubtree` in `src/use-case/edit-document/task-paste.ts:26-75`、命令の型 `edit-task.ts:79` | S-3（`landing` と `pastedUidsOf`） | `pasteTaskSubtree` を引く 6 本（`edit-task.test.ts` ・ `dfc-290-d-321-fr-033-copy-and-paste-reach-the-document.test.ts` ・ `cr-541-document-edits-rows-copies-and-alignment.test.ts` ・ `dfc-685-a-dateless-pasted-copy-drops-its-slack.test.ts` ・ `cr-429-ex-11-ex-12-a-dated-task-is-pinned.test.ts` ・ `fr-033-the-copy-store-is-inside-the-app.test.ts`）—— `landing` の無い形は変わらない。⚠️ 実績を空にする（S-9）ので、写しの実績を読む試験は赤になりうる —— 測った: 6 本のうち、写しの実績の列を主張するものは 0（`actualStart` ・ `actualFinish` ・ `stop` ・ `resume` ・ `percentComplete` を `grep` —— 当たるのは見本の文書の `null` の列だけ）。`cr-429-ex-11-ex-12-a-dated-task-is-pinned.test.ts` と `dfc-685-a-dateless-pasted-copy-drops-its-slack.test.ts` は MSPDI の見本（`pj12Fixture`）を写すので、見本の元のタスクが実績を持てば、写しの `carry` から `ActualDuration` が消える —— 2 本が主張するのは余裕日数と制約だけなので緑の見込み（走らせて測ること） |
| `pasteTaskGroupSubtree` in `src/use-case/edit-document/edit-task-group.ts:225-357`（写しは `:308-321`） | S-9 | `pasteTaskGroupSubtree` を引く 4 本（`edit-task-group.test.ts` ・ `cr-432-edit-task-group-branches-the-spec-decides.test.ts` ・ `cr-404-a-row-opened-by-hand-stays-open.test.ts` ・ `fr-033-the-copy-store-is-inside-the-app.test.ts`）—— 見本のタスクは実績が `null` なので緑のまま |
| `actualCleared` in `src/use-case/edit-document/task-plan-actual.ts:116-126`、`repriced` in `percent-complete.ts:45-47` | S-9 の `unstartedCopyOf` をここに置き、2 つの写しの所から呼ぶ | — |
| `GesturePressRow` in `src/use-case/advance-screen-session/gesture-values.ts:10` | S-6 | `tests/contract/state-machine-gesture.contract.test.ts:90-103`（押下の行ごとの `changingDocument` の表）—— `PTD-7` の行を足す |
| `pointerShapeUnder` in `frame-loop.ts:3313-3337`（`CR-554` の後は `pointer-shape.ts`） | S-7。⚠️ `:3336` の作図の合図 `'copy'` は問い 4 の答えで扱う | `tests/unit/in-2-pointer-shape.test.ts`（`:991-1015` 握った手 —— 緑のまま）・ `tests/unit/cr-430-table-pk-the-pointer-shapes.test.ts:253-254`（表 T-269 の行を 7 つと数える —— `CR-551` の `PK-10` で既に赤、本書の `PK-16` で数を直す） |
| `carryOutAction` の `changeDocument` in `frame-loop.ts:4192-4203`、`pasteWhatWasCopied` in `:4123-4151`（`CR-554` の後は入口と `copy-and-paste.ts`） | S-4 ・ S-5 | `tests/system/duplicate-paste-and-dual-cursor.test.ts`（貼り付けの安全弁 —— 共通の関数にしても緑のまま） |
| `tools/generate_help_roster.py:115` | 波 0（4.3） | `tests/unit/cr-377-help-lists-keys-and-icons.test.ts:76`（`BASIC_MOUSE_ROWS = ['MK-2', 'MK-5', 'MK-7']`）・ `tests/system/measured-sweep.test.ts:1519`（`helpMouseRows`）・ `tests/unit/cr-405-the-help-scrolls-down-in-three-columns.test.ts:112` —— ⛔ 3 つとも `MK-15` を足す |
| 仕様を逐語で引く試験 | — | `PTD-1` の「構えと当たりによらず優先する」を読む `tests/unit/t-023a-ptd-1-pan-follows-the-pointer.test.ts:629-632` ・ `:869-882`、`tests/unit/in-2-pointer-shape.test.ts:1015` —— 字を残したので緑のまま（E-01）。`MK-7` の行を読む `t-023a-ptd-1-pan-follows-the-pointer.test.ts:87` ・ `:611`（`MK-7` の 2 つの身振り —— 字が変わるので読み直す）・ `uf-30-31.test.ts:115`（`MK-1` 〜 `MK-8` の名簿 —— `MK-15` を足すかは試験の体が決める）・ `uf-48-input.test.ts:72` ・ `:983` |
| `MK-7` を引くほかの試験 | — | `tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts`（パンの計測。`Ctrl` の引きを選択の上で始めていなければ緑）・ `tests/system/nfr-004-file-scheme-sweep.sws.test.ts:923` ・ `tests/unit/uf-50.test.ts:155` |
| 新しく要るもの | — | ① 選んだタスクの本体を `Ctrl` で 3 日右・1 行下へ引くと、写しがそこに立ち、元は動かず、取り消し 1 回で写しが消える ② 選んでいないタスクの上と背景の上の `Ctrl` の引きはパンのまま ③ 端の上の `Ctrl` の引きはパン ④ `CY-9` の 4 つは何も書かない ⑤ 2 つ選んで引くと 2 つとも写り、選択が 2 つの写しになる ⑥ `Dual Cursor` モードでは写さない ⑦ 押しているあいだのポインタは `copy` ⑧ 別の `editGroup` の行に載せると断る ⑨ e2e: 実物で引いて、写しが追従して描かれる（Playwright。記録 `browser-pane-no-raf`） ⑩ 進行中・中断・完了のタスクとマイルストーンを P-1 〜 P-5 の各道で写すと、写しは未着手（`PS-1`）で、`resumeValid` ＝ `false`、`percentComplete` ＝ 0、`carry` に `ActualDuration` が無く、写し元の実績は変わらない ⑪ 作図の合図が `crosshair`（問い 4） |

⚠️ `frame-loop.ts` の関数を太らせないこと（検査 60 の基準線。`CR-551` の 9 節の注と同じ）。

---

## 10. ⛔ この変更でやらないこと

- **行見出しパネルの行（`TaskGroup`）の `Ctrl` ドラッグで行を写すこと**（決定 17）。行の写しは今のまま `Ctrl+C` / `Ctrl+V`（表 T-223 の `DU-2`）。求められたら別の変更要求にする。
- **注記（ハイライトボックス・コメントボックス）を写すこと**（`CY-4`）—— 問い 2 の答えは (a)（`JDG-469`）。
- **持ち回りの MSPDI の項目のうち `ActualDuration` 以外**（`carry` ・ `carryElements` に実績に由来する項目が残っていても、E-08 は落とさない）—— 本書の木で `src/` が名で持つ実績の持ち回りは `ActualDuration` だけである（13 節）。取り込んだ文書に別の実績の項目があると分かったら、`DU-1` の同じ文に足す。
- **本体の移動（表 T-270）が押すと引くを分ける距離を仕様に書くこと** —— コードは `S-208` を読むが、仕様に文が無い（`DFC-873`）。本書は写しの側だけを `S-208` に結ぶ。
- `FR-033` の `TaskOrigin` の食い違い（`DFC-731`）—— 写しは貼り付けと同じ規則に従うので、あちらが決まれば本書も従う。
- macOS の修飾キーの扱いを仕様に書くこと（`CR-225` の決定 3 のまま）。
- `docs/development-records/` の `pending-decisions.md` ・ `changelog.md`、`A-appendix.md` の変更履歴（当てる者が書く）。

---

## 11. 前に立つ者へ返す問い

| # | 問い | 推奨と理由 | 答え（2026-09-24） |
|---|---|---|---|
| 1 | **選んでいないタスクの上から `Ctrl` で引いたとき** —— 例: タスク A を選んだまま、選んでいないタスク B を `Ctrl` で引く。(a) パン（今のまま） (b) B を選び直してから B を写す | **(a)**。逐語は「オブジェクトを選択している状態で」であり、写すのは選んだものに限ると読める。(b) はファイルの一覧の慣れに近いが、パンを始めたつもりの引きが、たまたまタスクの上だっただけで写しになる。戻すときは `CY-2` の 1 行 | 「選んでいないタスクの上で Ctrl＋ドラッグを始めたら → 推奨の (a)」（`JDG-468`） |
| 2 | **選択にハイライトボックス・コメントボックスが混ざっているとき** —— 例: 3 つのタスクとそれを囲むハイライトボックスを範囲選択し、`Ctrl` で右へ引く。(a) 写すのはタスクだけ。箱は元の所に残る（`Ctrl+V` と同じ） (b) 箱も写し、同じ日数と行数だけずらす | **(a)**。逐語の「コピー」を今のコピー（`FR-033` は注記を写さない）と揃えた。⚠️ ただし `FR-033` が注記を写さない理由（同じ日付に二重に出る）は、ずらして置く `Ctrl` ドラッグには当たらない。「オブジェクト」が箱も指すなら (b) —— 写す列の全数を決める文が要り、本書が 1 節ぶん太る | 「選択にハイライトボックスやコメントボックスが → 推奨の (a)」（`JDG-469`） |
| 3 | **実績のあるタスクの写しを横へ引いたとき** —— 例: 進行中のタスクを `Ctrl` で 1 か月右へ写す。(a) 写しの予定だけが 1 か月ずれ、実績は元の日付のまま（本体の移動 `PE-1` と同じ） (b) 実績も同じ日数ずらす (c) 写しは実績を持たない（未着手で置く） | **(a)**。新しい規則を立てない（`JDG-399` の「特別ルールを設けるな。既存のルールに従え」に倣う）。代償: 写しの実績が予定から離れて見える。(c) は「同じ形の工程を並べる」には最も素直だが、貼り付けは実績を写すので、2 つの写しが違う物になる。戻すときは `CY-7` の 1 行 | ⛔ **推奨と違う答え**:「写しを横へずらしたとき、実績 → (c) 未着手として作る ※他に日程をコピペするのがあれば、実績を空にしろ。」（`JDG-521`）⇒ (c)。添え書きにより、貼り付け ・ 行の写し ・ `Agent API` の写しも実績を空にする（E-08、表 T-223 の `DU-1`） |
| 4 | **写しのあいだのポインタの形** —— いまのコードは、図形や注記を構えて何も無い所に乗せたとき（作図の合図）に、環境の `copy` の形を当てている（`frame-loop.ts:3336`。仕様は「作図の合図」の綴りを持たない）。(a) 写しに `copy` を当て、作図の合図を `crosshair` に移す (b) 写しにも作図にも `copy`（同じ形が 2 つの意味） (c) 写しは握った手のまま | **(a)**。`copy` は環境が「写して置く」に用意した形で、読む人が説明なしに分かる（`CH-4`）。作図の合図は線を引く道具の形の方が読める。(b) は形から何が起きるかが読めない。⚠️ (a) は作図の合図も変えるので、`IN-2` に綴りを 1 語足す（`DFC-872`） | 「写している間のポインタの形 → 推奨の (a)」（`JDG-522`）⇒ E-03 に `crosshair` を書いた |
| 5 | **ヘルプの語**（辞書 `assignments` の `MK-15`）—— ja「選んでいるものを写して、離した所に置く」／「選んでいるものの上で Ctrl ＋ ドラッグ」、en「Copy the Selection and put the copy where you release」／「Ctrl + drag on the Selection」 | 提案どおり。`MK-7` の語（「画面をパンする」／「Ctrl ＋ ドラッグ ／ 中ボタンドラッグ」）は変えない —— 並べて読めば、選んでいるものの上だけが写しと分かる | 「ヘルプの語 → 提案どおり」（`JDG-523`） |

---

## 12. 台帳

### 12.1 裁定（`docs/development-records/rulings.md`。前に立つ者が写す。写しは scratchpad の `CR-560-ledger.md`）

`JDG-467` —— 項目 1（`Ctrl` ドラッグの写しと、背景のパン）。
`JDG-468` —— 問い 1 の答え（(a) パン）。`JDG-469` —— 問い 2 の答え（(a) タスクだけ）。`JDG-521` —— 問い 3 の答え（(c) 未着手として作る、と添え書き「※他に日程をコピペするのがあれば、実績を空にしろ。」—— 写す道のすべて。E-08）。`JDG-522` —— 問い 4 の答え（(a) `copy` と `crosshair`）。`JDG-523` —— 問い 5 の答え（提案どおり）。番号は 2026-09-24 に前に立つ者が `b7a3b76f` で詰めた（帯の末 `JDG-467` 〜 `JDG-469` と、調整役が足した `JDG-521` 〜 `JDG-523`）。
状態はすべて「指示」（本書を当てたら「適用済」へ変える。当てる者の仕事）。
⭐ `JDG-546`（「基準線は変更してよい。」、2026-09-24）は本書の基準線の移動（8 節）への許しである —— 行は別の体が書く。
⚠️ `MK-7` を覆すことを利用者が受け入れた 2026-09-23 の振り分けの逐語は、`rulings.md` に行が無い（`MK-7` ・「コピー」・「Ctrl」で引いて 0 件）。
⛔ 当てる者が状態を変える古い行: 無い（`MK-7` を記した `JDG` 行が無い）。

### 12.2 欠陥（`docs/development-records/defects.md`。同上）

| ID | 何 | 状態 |
|---|---|---|
| `DFC-872` | 作図の合図（`IN-2`）の綴りが仕様に無く、コードが環境の `copy` を当てている（`frame-loop.ts:3336`）—— 本書の `PK-16` が `copy` を写しに当てると、同じ形が 2 つの意味を持つ | `仕様待ち` —— 本書の E-03 が `crosshair` を書く（問い 4 の答え (a)、`JDG-522`） |
| `DFC-873` | 本体の移動（表 T-270 の「押して離す（動かさない）」と「引く」）を分ける距離が仕様に無い。コードは `S-208` を読む（`item-grab.ts:92` の `hasDraggedPastThreshold`、`selection-input.ts:150`）が、`S-208` の名は行の軸と図形を置くときだけを挙げる | `仕様待ち` |

---

## 13. 測り方の再現

```
# totals (before)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py | grep "tables="
#   -> tables=187  figures=27  rows=2305  uids=162   (61bbd572, 2026-09-24; 186/27/2282/162 on ebc71984)

# free identifiers (ebc71984, re-measured on 61bbd572 -- same maxima): every prefix's maximum over docs/spec src tests tools change-request
for p in PTD MK PK SL PE UN DU CM IC FR T; do
  git grep -ohE "\b$p-[0-9]+[a-z]?\b" -- docs/spec src tests tools change-request | sed "s/$p-//;s/[a-z]$//" | sort -n | uniq | tail -1
done
#   -> PTD 5, MK 14, PK 10, SL 9 (a CR-300 name), PE 13, UN 18, DU 2, CM 75, IC 106, FR 112, T 319 (a range in CR-110)
git grep -nE "\bT-308\b|\bPTD-7\b|\bMK-15\b|\bPK-16\b|\bCY-[0-9]+|\bJDG-(46[7-9]|52[1-3])\b|\bDFC-87[23]\b" -- . ':!previous-project-result' ':!dist'
#   -> only CR-110:397 (the words "T-301 .. T-319", a range) and CR-300/301/437 (SL-9, MK-14 as retired names)
git grep -nE "\bCY-[0-9]+" -- . ':!dist'
#   -> nothing

# the old blocks of CR-551..CR-554 do not contain this CR's old phrases
for s in "構えと当たりによらず" "併用と中ボタン" "部分木を複製する（複製元" "| MK-7 |" "S-208"; do
  grep -l -- "$s" change-request/CR-55[1-4]*.md
done
#   -> nothing (the PK-10 line of E-04 is CR-551's own)

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <ID>     # each ID of 6.1
# induced.py, cbf5ba1a (check.sh's export, scratch/spec-check/sd-out/json/index.json):
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py MK-7 PTD-1 T-023a MK-8 SL-7 FR-016 FR-036 T-270   # -> 8/8, 11 edges, 0 cycles
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-033 CM-8 DU-1 T-223                             # -> 4/4, 4 edges, 1 cycle: CM-8/FR-033
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py IN-2 T-269 FR-106 FR-040 S-208                     # -> 5/5, 6 edges, 1 cycle: FR-106/IN-2

# every old block of section 4 occurs exactly once in its file (J-05 excepted: CR-556 writes its anchor "DA")
python <scratchpad>/check560.py        # parses the EDIT blocks of this file and counts each old in its file
#   -> on 61bbd572 (after the 2026-09-24 answers): 13 olds count 1 (E-08 added), J-05 count 0 (as expected), 4 edited JSON copies load

# tests that name what this CR touches
git grep -lE "MK-7" -- tests | wc -l                # -> 10
git grep -lE "PTD-1" -- tests | wc -l               # -> 11
git grep -lE "pressRowOf" -- tests | wc -l          # -> 15
git grep -lE "pasteTaskSubtree" -- tests | wc -l    # -> 6
git grep -lE "BASIC_MOUSE_ROWS|helpMouseRows" -- tests   # -> cr-377-help-lists-keys-and-icons, measured-sweep
```
