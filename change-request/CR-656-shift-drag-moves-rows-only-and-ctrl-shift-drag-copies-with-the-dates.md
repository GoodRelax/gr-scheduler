# CR-656 —— `Shift` で引けば行だけを移し、`Ctrl` ＋ `Shift` で引けば日付を変えずに写す

> 起草の状態: 当てた（2026-10-04、調整役の統合点 `bf263de3` から早送りした作業木）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-656`、台帳の帯 `DFC-2030`〜`DFC-2034` は調整役から受けた（13 節で、木のどこにも `CR-656` が無いことを測った）。裁定は `JDG-1330`〜`JDG-1333`（既に記録済み）。仕様の新しい識別子は行 `MK-16` の 1 つだけを取る（2 節）。
> 閉じるもの: 台帳 `DFC-1990`（タスクを別の行へ移す・写すとき、日付を動かさずに済ます手段が無い）。
> ⛔ **覆すもの: 表 T-023 の `MK-12` のうち「`Ctrl` ＋ `Shift` ＋ ドラッグに本ツールの割当を与えない」**（`CR-560` の 3 節が「`MK-12`（`Ctrl` ＋ `Shift` ＋ ドラッグは割当の無いまま）」と残した読み）。`JDG-1330` が覆す。`Alt` ＋ ドラッグは割当の無いまま残る。
> ⭐ 覆さないもの: `JDG-521`（写しはすべて未着手で作る —— 表 T-223 の `DU-1`、表 T-308 の `CY-7`）。`JDG-1331` が明示した。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `docs/development-records/rulings.md` の該当行）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1330` | 「タスクを他の行に移動したり、コピーするとき、日付をずらしたくないケースがある。 その場合はShift+タスクをドラッグで、日付(予定・実績の期間)を変えず移動、 Ctrl + Shift + タスクをドラッグで日付(予定・実績の期間)を変えずにコピーとしたい。 Shftを付けなければ、単なる移動やコピーの機能はそのままね。 質問や意見があれば述べよ。」 | `Shift` だけの本体のドラッグは行だけを移す（新しい `MK-16`、表 T-270 の頭の段、E-03・E-06・E-09）。`Ctrl` ＋ `Shift` の本体のドラッグは日数 0 で写す（`MK-15`・`PTD-7`・`CY-1`・`CY-5`、E-01・E-06・E-11・E-12）。前に立つ者の読み（端・マーカーなどは今のまま、修飾キーは押した時点で読む）を E-08・E-09・E-13 に書いた |
| `JDG-1331` | 「未着手で写す (Recommended)」 | 写しは未着手のまま。`CY-5` の足しは「予定を同じ日付に」だけを言い、実績は `CY-7` へ送る（E-12） |
| `JDG-1332` | 「選択に足して全部動かす (Recommended)」 | 選択に無いタスクから `Shift` で引けば、押したタスクを選択に足して全部を移し、離した後も全部が選ばれたまま（`SL-4`・表 T-270、E-08・E-09） |
| `JDG-1333` | 「Ctrl だけと同じくパン (Recommended)」 | `PTD-1` と `MK-7` の条件を「`Ctrl` だけか `Ctrl` ＋ `Shift` を伴う」に広げる（E-02・E-04）。写すのは選択に含まれるタスクの本体から始めたときだけ（`PTD-7` が先に立つ） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-008`**（直接操作で日程を組む） —— 本体を引くと横の成分がそのまま日数になる（表 T-270 の `PE-1`・`PE-6`、写しは `CY-5`）。真下へ引いたつもりでも横に数 px ぶれれば予定がずれる（`DFC-1990` の測り: `Shift` ＋ ドラッグも素のドラッグも、2 つの予定がともに 16 日ずれた）。行だけを移す・同じ日付で写す道を、修飾キー 1 つで開く。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない）** —— `MK-12` は `Ctrl` ＋ `Shift` ＋ ドラッグに割当を与えないと言い、`JDG-1330` は同じ組合せに写しを割り当てる。⇒ `MK-12` から外し、`MK-7`（パン）と `MK-15`（写し）へ入れる。`MK-12` の注「単位は修飾キーではなく組合せである」は真のまま残る。
- **`R1.3`（同じことを 2 か所で言わない）** —— 「`Shift` で引けば日付を変えない」の効果の正は 表 T-270 の頭の段に 1 度だけ置き、`MK-16`・`PTD-3`・`SL-4` はそこを指す。写しの日数 0 は `CY-5` に 1 度だけ置き、`MK-15` はそこを指す。
- **`R1.4`（境界）** —— ① `Shift` が押した時点と離した時点で違う: 押した時点で読む（表 T-270 の頭の段、`CY-11`）。② 端・フェードの掴み点・進捗マーカー・ダミー・再開アイコンからの `Shift` の引き: 今のまま（`SL-7a` で 1 つに絞る、`DFC-1991`）。③ 依存線・WBS の親を構えている: 本体を引いても動かさないので、表 T-270 は当たらない（`PTD-3` の注のまま）。④ `Alt` ＋ `Shift` の引き: `MK-16` は「`Shift` だけ」なので日付は動く（今のまま）。⑤ 選択に無いものの上や背景からの `Ctrl` ＋ `Shift` の引き: パン（`JDG-1333`）。⑥ `Shift` の引きで行が 0 行（横にだけ引いた）: 何も書かない（日数 0 ・ 行 0）—— 写しは `CY-9` の ② がそのまま答える。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `Shift` だけの本体のドラッグに 表 T-023a の新しい行を立てず、`PTD-3`（そのものへの操作）のままとし、効果を 表 T-270 の頭の段に書く | 表 T-023a は「押したとき何の操作になるか」を決める表で、`Shift` の引きも本体の移動である。違うのは移す量だけで、それは 表 T-270 が持つ（`PE-1` の「横に引く」）。新しい行を立てると、`gesture/pointerPressed` の `pressRow`（`state-machines.json`）と型 `PressRow` ・ `GesturePressRow` に 1 つ増え、ポインタの形・先の描画・取り消しの区切りのすべてが同じ答えを 2 つの名で持つ（`R1.3`）。⚠️ 台帳 `DFC-1990` の案（`PTD-3` の前に行を置く）からは外れる —— 行の代わりに `PTD-3` の注に 1 文を足した（E-03） | 無い |
| 決定 2 | 新しい 表 T-023 の行は `MK-16` の 1 つ。`Ctrl` ＋ `Shift` の写しは `MK-15` の条件を広げて入れる | 写しの押下は同じ `PTD-7` であり、行を分けると同じ行先を 2 行が指す | `MK-15` の字が変わり、辞書の語も変わる（E-06・J-01） |
| 決定 3 | ヘルプは `MK-16` を載せる（`FR-036` の名簿に足す） | `FR-036` は 表 T-023 に行を足した日に載せるかを決めよと言う（MUST）。`Shift` の引きは「触れば分かる操作」ではない —— `MK-15`（`Ctrl` の写し）を載せたのと同じ理由 | ヘルプの基本の塊が 1 項目増える。`tests/system/measured-sweep.test.ts:1587` の `helpMouseRows` が 1 つ足りなくなる（ほかの体の持ち場なので本書は直さない —— 9 節） |
| 決定 4 | `MK-15` の辞書の語は押し方（`press`）を変えず、働き（`text`）に「Shift を併せると日付を変えない」を足す | `MK-6` の語「（Shift を併せると選択に追加する）」と同じ形。押し方の欄を 2 つに割ると、ヘルプの 1 項目が 2 つの押し方を並べることになる | 無い |
| 決定 5 | 選択に混ざるハイライトボックス・コメントボックスも、`Shift` なら横 0 日で動く —— 表 T-270 の頭の段は「選択の全部を、横は 0 日」と書き、対象を数え上げない | `JDG-1330` の前に立つ者の読み。表 T-270 の頭の段が既に「選択の全部が動く —— 横は同じ日数、縦は同じ行数」と対象を数えずに言う形に揃える | ⚠️ コードは今、タスクの本体を引いても選択に混ざる注記を動かさない（`item-grab.ts` の `bodyMoveWrites` はタスクだけを書く）。本書の前からの食い違いなので、`DFC-2030` に記して直さない（10 節） |
| 決定 6 | `MK-12` の注に「`Ctrl` ＋ `Shift` ＋ ドラッグは割当を持つ（`MK-7` ・ `MK-15`）」を足す | 割当の単位は組合せである（`MK-12` の注）。外した組合せの行き先を同じ行に残さないと、読む者は「割当の無い組合せ」がもう 1 つあると探す | 無い |
| 決定 7 | `FR-105` の「修飾キーを付けた割当の無い引く操作も同じである —— 表 T-023 の `MK-12` …」は書き換えない | `Alt` ＋ ドラッグが残るので真のまま | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 写しの押下 | `docs/spec/01-04-requirements.md` の 表 T-023a の `PTD-7` | E-01 |
| パン | 同 `PTD-1` | E-02 |
| `Shift` の本体のドラッグ | 同 `PTD-3` の注 | E-03 |
| パンの割当 | 同 表 T-023 の `MK-7` | E-04 |
| 割当の無い組合せ | 同 `MK-12` | E-05 |
| 写しの割当・行だけの移動の割当 | 同 `MK-15`、新しい `MK-16` | E-06 |
| ヘルプが載せる行 | 同 `FR-036` | E-07 |
| 広げる | 同 表 T-023c の `SL-4` | E-08 |
| 掴んだものを引いたときの効果 | 同 表 T-270 の頭の段 | E-09 |
| `Ctrl` ドラッグの複製 | 同 `FR-033` の段（表 T-308 の前） | E-10 |
| 写しの押下・置き場・修飾キー | 同 表 T-308 の `CY-1`・`CY-5`・`CY-11` | E-11・E-12・E-13 |
| 語 | `docs/spec/_source/display-words.json` の `assignments` の `MK-15`・`MK-16` | J-01 |
| ヘルプの名簿 | `tools/generate_help_roster.py` の `SHOWN_ASSIGNMENTS` | G-01 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行 | E-14 |

**数**: 表の行 ＋1（`MK-16`）。要求の増減 0。図 0。辞書の項 ＋1（`assignments` の `MK-16`）。

---

## 2. 新しい識別子

| 種類 | 採ったもの | 測った最大（`bf263de3`） |
|---|---|---|
| 行（表 T-023） | `MK-16` | 表の行は `MK-15` まで。`MK-14` は `CR-301` の中の、生成器に止められて消えた名（仕様に行は無い）。`MK-16` は木のどこにも無かった（`git grep`、0 件） |

表・接頭辞・設定値・要求・入口・保留の行は取らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消す文 | 代わり |
|---|---|---|
| `MK-12` の操作の欄 | 「`Ctrl` ＋ `Shift` ＋ ドラッグ」 | `MK-7`（パン）と `MK-15`（写し）。`MK-12` には `Alt` ＋ ドラッグだけが残る |
| `PTD-7` ・ `PTD-1` ・ `MK-7` ・ `MK-15` の「**`Ctrl` だけを伴う**」 | 「`Ctrl` だけ」の読み | 「**`Ctrl` だけか `Ctrl` ＋ `Shift` を伴う**」 |
| `PTD-1` の注 | 「選択に含まれないものの上から始めた `Ctrl` ドラッグは本行である」 | 「… `Ctrl` ドラッグは、`Shift` を伴っても本行である」 |
| `CY-1` の注 | 「… から始めた `Ctrl` だけの左ドラッグは、`PTD-1` のパン」 | 「… `Ctrl` だけか `Ctrl` ＋ `Shift` の左ドラッグは …」 |
| `CY-11` | 「押しているあいだに `Ctrl` を押しても離しても」 | 「… `Ctrl` や `Shift` を押しても離しても」 |
| `FR-033` の段 | 「`Ctrl` だけを伴って引いたとき」 | 「`Ctrl` だけか `Ctrl` ＋ `Shift` を伴って引いたとき」 |
| 辞書 `MK-15` の `text` | 「選んでいるものを写して、離した所に置く」 | 「…（Shift を併せると日付を変えない）」 |
| コード | `input-command-translator.ts` の `isCopyDragPress` ・ `pressRowOf` の `isCombo(…, true, false, false)` 2 か所、`isAssignedPointerCombo` | 9 節 |

⭐ 消さないもの: `MK-12` の注（単位は組合せ・何が起きるかは 表 T-023a が決める・「何もしない」と書かない）、`FR-105` の `MK-12` の例外（決定 7）、`CY-2`（選択に無いものから始めた写しはパン —— `Shift` を伴っても `PTD-1` に落ちるので字は真のまま）、`CY-7`（未着手）、`SL-7a`、表 T-270 の行の升。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧が 1 回だけ現れることを数えること（13 節の道具が全部の旧で 1 回を確かめてから書く）。改行は各ファイルの多数派（作業木では CRLF）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`PTD-7` の条件の頭。旧「| PTD-7 | **`Ctrl` だけを伴う**左ドラッグで、」 新「| PTD-7 | **`Ctrl` だけか `Ctrl` ＋ `Shift` を伴う**左ドラッグで、」

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`PTD-1` の条件と注。
- 旧「| PTD-1 | 中ボタンドラッグ、または **`Ctrl` だけを伴う**左ドラッグ |」 新「| PTD-1 | 中ボタンドラッグ、または **`Ctrl` だけか `Ctrl` ＋ `Shift` を伴う**左ドラッグ |」
- 旧「⚠️ ただし上の `PTD-7`（選択に含まれるタスクの本体から始めた `Ctrl` だけの左ドラッグ）が先に立つ —— 背景と、選択に含まれないものの上から始めた `Ctrl` ドラッグは本行である。」 新「⚠️ ただし上の `PTD-7`（選択に含まれるタスクの本体から始めた `Ctrl` だけか `Ctrl` ＋ `Shift` の左ドラッグ）が先に立つ —— 背景と、選択に含まれないものの上から始めた `Ctrl` ドラッグは、`Shift` を伴っても本行である。」

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`PTD-3` の結果の欄、「⭐ 引いているあいだポインタに追従する仮の線も `FR-009` が持つ。<br>」の後に足す: 「⭐ `Shift` だけを伴ってタスクの本体から引いたときは、日付を変えずに行だけを移す（表 T-023 の `MK-16`、効果は `FR-107` の 表 T-270）。<br>」

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`MK-7` の操作の欄。旧「**`Ctrl` だけを伴う**ドラッグ（`MK-15` の場所から始めるものを除く）」 新「**`Ctrl` だけか `Ctrl` ＋ `Shift` を伴う**ドラッグ（`MK-15` の場所から始めるものを除く）」

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
`MK-12`。
- 旧「割当の無い修飾キー付きドラッグ（`Alt` ＋ ドラッグ、`Ctrl` ＋ `Shift` ＋ ドラッグ）」 新「割当の無い修飾キー付きドラッグ（`Alt` ＋ ドラッグ）」
- 動作の欄、「… `Ctrl` ＋ `Shift` ＋ ホイールは `MK-5` で割当を持つ。<br>」の後に足す: 「⚠️ `Ctrl` ＋ `Shift` ＋ ドラッグは割当を持つ（`MK-7` ・ `MK-15`）。<br>」

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
`MK-15` を替え、その下に `MK-16` を足す。
- 旧「| MK-15 | 選択に含まれるタスクの本体の上から始める、**`Ctrl` だけを伴う**左ドラッグ | 表 T-023a の `PTD-7`（写すものと置き場は `FR-033` の 表 T-308） | — |」
- 新「| MK-15 | 選択に含まれるタスクの本体の上から始める、**`Ctrl` だけか `Ctrl` ＋ `Shift` を伴う**左ドラッグ | 表 T-023a の `PTD-7`（写すものと置き場は `FR-033` の 表 T-308。<br>`Shift` を伴えば日付を変えずに写す —— 同表の `CY-5`） | — |」
- 足す「| MK-16 | タスクの本体の上から始める、**`Shift` だけを伴う**左ドラッグ | 表 T-023a の `PTD-3`。<br>日付を変えず、行だけを移す（効果は `FR-107` の 表 T-270）。<br>選択に含まれないタスクから始めれば、そのタスクを選択に足し、選択の全部を移す（表 T-023c の `SL-4`） | — |」

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
`FR-036`。旧「表 T-023 の `MK-2` / `MK-5` / `MK-7` / `MK-15` と、」 新「表 T-023 の `MK-2` / `MK-5` / `MK-7` / `MK-15` / `MK-16` と、」

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
`SL-4` の規則の欄、「クリックなら 1 つずつ増減し、範囲選択なら囲んだものを既存の選択に足す。<br>」の後に足す: 「タスクの本体を引けば、押したタスクを選択に足し（含まれていれば選択はそのまま）、選択の全部を動かす（表 T-023 の `MK-16`）。<br>⚠️ 引いたときは増減しない —— 離した後も全部が選ばれたままである（`FR-107` の 表 T-270）。<br>端・フェードの掴み点・進捗マーカー・ダミー・再開アイコンを `Shift` で引いたときは、`SL-7a` のとおり掴んだ 1 つに絞る。<br>」

<!-- EDIT id=E-09 file=docs/spec/01-04-requirements.md -->
表 T-270 の頭の段、「… —— 表 T-023c の `SL-7a` と同じ読みである。」の後に足す:

```text
⭐ `Shift` だけを伴って本体（`PE-1` ・ `PE-6`）を引いたときは、横の成分を当てず、縦だけを当てること（MUST） —— 選択の全部を、横は 0 日、縦は同じ行数だけ動かし、予定も実績も日付を変えない（表 T-023 の `MK-16`）。
押したタスクが選択に含まれないときは、それを選択に足してから全部を動かすこと（MUST）（表 T-023c の `SL-4`）。
`Shift` は押した時点で読み、押しているあいだに押しても離しても変えないこと（MUST） —— `FR-033` の 表 T-308 の `CY-11` と同じ読みである。
⚠️ 端・フェードの掴み点・進捗マーカー・ダミー・再開アイコンから始めたときは、`Shift` があっても本表の行のとおりである。
```

<!-- EDIT id=E-10 file=docs/spec/01-04-requirements.md -->
`FR-033` の段。旧「⭐ 選択に含まれるタスクの本体を `Ctrl` だけを伴って引いたとき（表 T-023a の `PTD-7`）も、」 新「⭐ 選択に含まれるタスクの本体を `Ctrl` だけか `Ctrl` ＋ `Shift` を伴って引いたとき（表 T-023a の `PTD-7`）も、」

<!-- EDIT id=E-11 file=docs/spec/01-04-requirements.md -->
`CY-1`。
- 旧「| CY-1 | 写しを始める押下 | 選択に含まれるタスク（マイルストーンを含む）の本体 —— 」 新「| CY-1 | 写しを始める押下 | `Ctrl` だけか `Ctrl` ＋ `Shift` を伴って押した、選択に含まれるタスク（マイルストーンを含む）の本体 —— 」
- 旧「… から始めた `Ctrl` だけの左ドラッグは、表 T-023a の `PTD-1` のパンである |」 新「… から始めた `Ctrl` だけか `Ctrl` ＋ `Shift` の左ドラッグは、表 T-023a の `PTD-1` のパンである |」

<!-- EDIT id=E-12 file=docs/spec/01-04-requirements.md -->
`CY-5`。旧「日数の数え方は、本体を引いて動かすとき（表 T-270 の `PE-1` ・ `PE-6`）と同じとする |」 新「日数の数え方は、本体を引いて動かすとき（表 T-270 の `PE-1` ・ `PE-6`）と同じとする。<br>⭐ `Shift` も伴って押したときは日数を 0 とし、写しの予定を写し元と同じ日付とすること（MUST） —— 写しの実績は `CY-7` のとおり持たない |」

<!-- EDIT id=E-13 file=docs/spec/01-04-requirements.md -->
`CY-11`。旧「押しているあいだに `Ctrl` を押しても離しても変えないこと（MUST）」 新「押しているあいだに `Ctrl` や `Shift` を押しても離しても変えないこと（MUST）」

<!-- EDIT id=J-01 file=docs/spec/_source/display-words.json -->
`assignments` の `MK-15` の `text` を「選んでいるものを写して、離した所に置く（Shift を併せると日付を変えない）」／「Copy the Selection and put the copy where you release; hold Shift too to keep the dates」にし、その後に `MK-16` を足す: `text` 「日付を変えずに行だけを移す（選択に無いタスクは選択に足す）」／「Move to another row only, keeping the dates; a task outside the Selection joins it」、`press` 「タスクの上で Shift ＋ ドラッグ」／「Shift + drag on a task」。

<!-- EDIT id=G-01 file=tools/generate_help_roster.py -->
`SHOWN_ASSIGNMENTS` に `'MK-16'` を足す（決定 3）。⛔ 足さないと、生成器が「表 T-023 の行が名簿のどれにも無い」で止まる（`CR-301` が同じ形で 1 度止められた）。

<!-- EDIT id=E-14 file=docs/development-records/changelog.md -->
変更履歴の表の終わりに次の版の 1 行を足す（版はコミットの直前に木の最大を測って決める —— 02 の 2.5 節）。

### 4.1 生成物と基準

- `npm run gen` が `src/adapter/screen-renderer/display-words.json` と `help-roster.json` を刷る。手で直さない。
- `.claude/skills/spec-graph-check/dictionary-table-pairing.txt` —— 字が変わった対（`T-023` の `MK-7` ・ `MK-12` ・ `MK-15`）と新しい対（`MK-16`）の 4 行だけを、表の行と辞書の語を並べて読み直してから刷り直す（検査 37 の見出しの作法。負債の数ではない）。

---

## 5. 継ぎ目

```
SEAM (CR-656)
- input-command-translator.ts: one predicate isCtrlDragCombo(modifiers) = Ctrl alone or
  Ctrl + Shift (Alt not held). isCopyDragPress and pressRowOf's PTD-1 line read it;
  isAssignedPointerCombo lists Ctrl + Shift beside the other three.
- input-command-translator.ts: isDateKeepingDrag(press) is true when the press held
  Shift alone or Ctrl + Shift (read from press.at.modifiers, so the held preview and the
  release agree -- CY-11). Exported for item-grab.ts and selection-input.ts.
- item-grab.ts bodyMoveWrites: the day count is 0 when isDateKeepingDrag(press); the
  moved set is the Selection's tasks plus the grabbed one when the grabbed task is not
  selected and the press held Shift (SL-4). copyDragWrite: the day count is 0 when
  isDateKeepingDrag(press). No new command: setTaskPlanDates is simply not written, and
  pasteTaskSubtree carries dayShift 0.
- selection-input.ts (PTD-3): a Shift-only body drag past S-208 from a task not in the
  Selection answers selectionWith(held, ref); from a selected one, the Selection as held
  (DFC-1991 already). Armed for a dependency or a WBS parent: unchanged.
- held-press-preview.ts: unchanged. previewOfHeldPress applies commandFromInput to a
  release built from press.at, so the held picture is the same write.
- No new PressRow, no new state, no new event, no new command.
```

---

## 6. グラフ（`bf263de3`）

- `impact.py MK-12`: 要求 2 件 / 参照 2 か所 —— `FR-105`（`:4406`、決定 7 で真のまま）、`FR-036`（`:7948`、`MK-12` を「内部の取り決め」に数える —— 真のまま）。
- `impact.py MK-7`・`MK-15`: `FR-016`・`FR-036` だけ。`FR-036` は E-07 で `MK-16` を足す。
- `impact.py PTD-7`: 要求 3 件 / 参照 5 か所 —— `FR-033`（E-10）、`FR-040` の `IN-2`（「`Ctrl` 併用で選択を写して引いているあいだ … `PK-16`」—— `Ctrl` ＋ `Shift` も `Ctrl` 併用なので真のまま）、`tbl-state-machines.md` の `pointerPressed`（行の集合は変わらない）。
- `impact.py PTD-1`: 要求 4 件 / 参照 7 か所 —— `SL-4`（E-08 で触る。「動かした `Ctrl` は今のまま `PTD-1` のパン」は真のまま）、`CY-1`・`CY-2`（E-11、`CY-2` は真のまま）、`FR-009`（`:2864`、パンを指すだけ）。
- `impact.py CY-5`: `FR-033`、`tbl-glossary.md` の `CM-8`（「ずらす日数」を運ぶ —— 0 日も日数なので真のまま）、`tbl-published-entries.md`。
- `impact.py SL-4`: `FR-135` の `WL-3`・`AR-7`（引かずに離す選び方 —— 変わらない）、`tbl-state-machines.md` の `objectsPicked`（「`Shift` での増減」—— 源の行の集合は変わらない）。
- `impact.py PE-1`・`PE-6`: 1.10 節・`FR-033`（`CY-5`、E-12）・`FR-107`。
- `induced.py MK-7 MK-12 MK-15 PTD-7 PTD-1 PTD-3 SL-4 CY-1 CY-5 CY-11 FR-036 FR-107`: 13 節の出力を見よ。
- 届いた行で `rulings.md` を引いた: `JDG-521`（写しは未着手 —— 残す）、`JDG-1331`（同）、`DFC-1991` の直し（引いたら増減しない —— 本書はその上に立つ）。食い違う裁定は無い。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables / figures / uids | 差 0 | 行と升の中身だけ |
| rows | ＋1 | `MK-16` |
| 辞書の `assignments` | ＋1 | `MK-16` |
| ヘルプの基本の塊の項目 | ＋1 | `MK-16`（決定 3） |
| 「`Ctrl` ＋ `Shift` ＋ ドラッグ」の出現（`docs/spec/01-04-requirements.md`） | 1 → 1 | `MK-12` の操作の欄から消え、同じ行の注に「割当を持つ」として 1 つ入る |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec/01-04-requirements.md` ・ `_source/display-words.json` ・ `tools/generate_help_roster.py` ・ 生成物 ・ `dictionary-table-pairing.txt` の 4 行 | E-01 〜 E-13、J-01、G-01、`npm run gen` | 本書の体 |
| 2 | `src/adapter/input-command-translator/input-command-translator.ts` ・ `item-grab.ts` ・ `selection-input.ts` | 5 節の継ぎ目 | 本書の体 |
| 3 | `tests/` | 9 節 | 新しい試験は仕様だけを読む別の体。動く試験の字の追随は本書の体 |

- ⭐ **毎フレームの経路: はい。** 押しているあいだの絵（`held-press-preview.ts`）が、離したときと同じ書き込み（`commandFromInput`）を毎フレーム作る。本書はその書き込みの中身（日数を 0 に、動かす集合に 1 つ足す）を変え、描く量は増やさない。`perf-pending.md` に行を足す。

---

## 9. 仕様の外で直すもの

- コード: 8 節の波 2。
- 新しい試験（仕様だけを読む体）: `tests/unit/cr-656-*.test.ts` —— 変えた条項ごとに 1 つ以上、名に行 ID を入れる。
- 動く試験（字の追随）:
  - `tests/unit/uf-50.test.ts` の「leaves an unassigned modifier drag to the browser (MK-12, MUST NOT)」—— `Ctrl` ＋ `Shift` の引きを外し、`Alt` だけにする。
  - `tests/unit/cr-560-ctrl-drag-copies-the-selection-unstarted.test.ts` —— `FR-036` の名簿の逐語に `MK-16` が足される。
  - `tests/unit/cr-405-the-help-scrolls-down-in-three-columns.test.ts` の `BASIC_ROWS` —— `MK-16` を足す。
  - `tests/system/nfr-004-file-scheme-sweep.sws.test.ts` —— 表 T-023 の全行を押す掃きに `MK-16` の場合を足す（`MK-15` の場合の隣、`Shift` を押して本体を引く）。
  - ⚠️ `tests/system/measured-sweep.test.ts:1587` の `helpMouseRows` —— `'MK-16'` を足す必要がある。ほかの体の持ち場なので本書は直さず、調整役へ渡す。
- 台帳: `defects.md` の `DFC-1990`（`仕様待ち` → `実測待ち`）と新しい `DFC-2030`（10 節）、`rulings.md` の `JDG-1330`〜`JDG-1333`（適用済）、`perf-pending.md` の 1 行。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 選択に混ざるハイライトボックス・コメントボックスを、タスクの本体の引きと一緒に動かすこと。表 T-270 と `SL-7` は「選択の全部が動く」と言うが、`item-grab.ts` の `bodyMoveWrites` はタスクだけを書き、注記は行の止めにだけ数える（`clampedRowShift`）。本書の前からの食い違いなので、`DFC-2030` に両側を記して直さない。
- ハイライトボックスの本体（`GR-14`）から始めた `Shift` の引き（`item-grab.ts` の `highlightBoxRangeWrite`）は変えない —— `MK-16` はタスクの本体から始めるものだけである。
- `Alt` ＋ `Shift` の引き、構えているときの引き、端・マーカーなどからの引きは変えない（0 節の ② の ③ ④）。
- 写しの実績（`CY-7`・`DU-1`）は変えない（`JDG-1331`）。
- `CR-560` には追補しない（02 の 2.5 節）。

---

## 11. 利用者に問うこと

無い。`JDG-1330`〜`JDG-1333` で決まっている。出荷ビルドでの手の確かめは調整役へ手順を渡す（`JDG-1340`）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1330`〜`JDG-1333` | 本書の裁定 | 状態を「適用済」にし、着地先に行 ID を書いた |
| `JDG-521` | 写しは未着手 | 覆さない（`JDG-1331`） |
| `DFC-1990` | 本書が閉じる | `仕様待ち` → `実測待ち`（自動試験は緑。出荷ビルドで利用者が引くのはまだ） |
| `DFC-2030` | 選択に混ざる注記が本体の引きで動かない（10 節） | 新しく起こす |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to bf263de3

# the numbers are unused
ls change-request | grep CR-656
git grep -l "CR-656"
git grep -l "MK-16\b"
git grep -c "DFC-203[0-4]\b"

# each old text of section 4 appears exactly once before editing
#   (the edit script asserts count == 1 for every edit, then writes)

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py MK-12 MK-7 MK-15 PTD-7 PTD-1 CY-1 CY-5 CY-11 SL-4 PE-1 PE-6
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py MK-7 MK-12 MK-15 PTD-7 PTD-1 PTD-3 SL-4 CY-1 CY-5 CY-11 FR-036 FR-107

# tests that quote the moved words
grep -rn "Ctrl\`＋\`Shift\`＋ドラッグ\|'MK-15'\|MK-2\` / \`MK-5" tests
```
