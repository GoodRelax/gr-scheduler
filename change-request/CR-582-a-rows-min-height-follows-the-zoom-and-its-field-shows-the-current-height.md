# CR-582 — 行の最小高さは倍率に従い、画面上の px（縦のズーム 100% 時）で持つ —— 欄に単位と現在の高さを添える

> 起草の状態: 起草した（2026-09-26）。利用者の裁定 `JDG-710`・`JDG-712` 〜 `JDG-717`（逐語は 0.1 節）を当てる本文の案である。⛔ 仕様・コード・試験・見本はまだ 1 文字も変えていない。
> 読んだ木: 起草は `refactor` の先端 `1781a77e` のワークツリー（`DFC-1086` の書きかけを含む）で測った。土台は `origin/refactor` の `39955062` —— `DFC-1086`（`JDG-711`）と `JDG-710` 〜 `JDG-715` の行が着地した木である。`1781a77e` から `39955062` までに `src`・`tools`・`tests`・`docs/spec` で動いたのは `DFC-1086` の 4 ファイルだけで、本書が引く行番号はどれも `39955062` で同じであることを確かめた。仮の番号と裁定の逐語は `39955062` で測り直した（2 節・0.1 節）。⛔ 当てる前に、その時点の `refactor` の先端で測り直すこと。
> ID の帯: 調整役から `CR-582`・`JDG-710` 〜 `JDG-717` を受けた。台帳（`DFC`）の帯は受けていない —— 本書は既存の `DFC-1003` を閉じ、新しい `DFC` を起こさない。新しい番号・名はどれも仮である（2 節）。
> ⭐ 11 節の問い 2 つは答えを受けた（2026-09-26）。問い 1 は説明を付けない（`JDG-716`）—— 最小高さの欄に説明（ツールチップ）の行を置かず、`IN-3` にも `CR-575`・`CR-576` の説明の対象にも触れない。`JDG-715` の説明の文は使わない。問い 2 は案 B を簡素な語で（`JDG-717`）—— 選んだ行が描かれていないときは、読み出しを丸ごと「現在非表示」／ "currently hidden" に置き換える（表 T-338 の `MH-6`）。本書の本文はこの 2 つを計画として書く。
> ⛔ 当てる順（調整役が決める。本書の推奨）: ① `DFC-1086` の後 —— `39955062` に着地した（同じ生成器と同じ system 試験を触る）。② `CR-572`（パーク中）とは見本・起動テンプレート・案内の骨組みを共に触る —— 後に当たる方が測り直す（5 節・9 節）。③ `CR-578`（`frame-loop.ts` の入口を割る）と `CR-580`（`MSPDI` の codec を割る）は、本書が触る関数（`screenViewReadingsOf`・`drawnRowBoxesOf`、`mspdi-imported-rows.ts` の行の組み立て）の在り処を動かしうる —— 後に当たる方が、先に当たった方の後の在り処で旧の塊を測る。⭐ 説明を付けない（`JDG-716`）ので、`CR-575`・`CR-576` の後に回す理由は無くなった。⛔ `src/framework/single-html-shell/frame-loop.ts` を触るほかの変更要求と同じ波に入れない。
>
> 閉じるもの: `DFC-1003`（`TaskGroup.height` が倍率に従わない）。利用者の裁定 `JDG-710`・`JDG-712` 〜 `JDG-717`。`JDG-711` は `DFC-1086` が別に当てた（起動テンプレートの既定の高さを外した）—— 本書は引くだけで、やり直さない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`rulings.md` の逐語と一字ずつ突き合わせた —— 表の下） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-710` | 「提案通り。 ただし単位はどうする？  xx px at zoom 100% とか？」 | `DFC-1003` は案 A —— 指定した行の高さは、ほかの描く寸法と同じく表示の倍率と縦のズームに従って伸び縮みする | 決定 2。4.4 節・4.5 節（`DS-13`、仮） |
| `JDG-711` | 「それと、デフォルトで行の高さを設定するな。」 | 起動テンプレートはどの行にも高さを持たせない | `DFC-1086` が当てた（別のコミット）。本書は生成器が書く鍵の名だけを変える（3.4 節） |
| `JDG-712` | 「基本はそれでよいが、 プロパティーパネルにどう単位を出す？  意見くれたし  zoom % があった方が親切かどうか？」 | 値の基準は、縦のズーム 100%・表示の倍率 100 のときの画面の px。パネルにはズームの百分率ではなく、行のいまの描いた高さを px で示す | 決定 2・6。⚠️ 基準が「画面の px」なので、描くときに `S-236` を掛けない（0.2 節の 2） |
| `JDG-713` | 「高さ指定 [ 60 ] px \| 現倍率での高さ 45px という表現でどうか？ 英語も含めて文言を検討しろ」 | 欄を 2 部にする —— 指定の値と、行のいまの高さ | 表 T-338（仮）の `MH-1`・`MH-3`。文言は `JDG-714`・`JDG-715` が練り直した |
| `JDG-714` | 「最小高さの方がいいかも。」 | 指定は下限（`FR-042`）なので名を「最小高さ」に。読み出しは「現在の高さ」／ "current:"。空は「なし」／ "none"。列 `TaskGroup.height` を `minHeight` へ改名する。古い形式は読み替えない（`JDG-601`）。`MSPDI` へは書かない | 決定 1・4。3.1 節・4.1 節 〜 4.3 節 |
| `JDG-715` | 「zoom倍率の話が無くなって混乱するぞ？ ズーム倍率100%時の最小高さ の方が正確では？」「提案通りでOK!」 | 名は「最小高さ（ズーム 100% 時）」／ "min height (at 100% zoom)"、単位は px。読み出しは「現在の高さ 45px」／ "current: 45 px" を常に示す（行の実際の描いた高さ ＝ 伸び縮みした最小と中身の大きいほう）。空の欄は「なし」／ "none"。区切りは描いた罫であり辞書の語ではない。「ズーム」は縦のズーム。説明（ツールチップ）の文（日・英）も示した —— ⚠️ その文は `JDG-716` が覆した | 決定 6 〜 9。4.3 節（辞書の語）・表 T-338。説明の文は使わない（`JDG-716`） |
| `JDG-716` | 「問1: ツールチップは不要。 必要になったらその時考える。」 | 11 節の問い 1 への答え —— 最小高さの欄に説明（ツールチップ）を付けない。必要になったら、そのとき改めて決める。`JDG-715` の説明の文だけを覆す | 表 T-338 に説明の行を置かない。`IN-3` と `CR-575`・`CR-576` の説明の対象に触れない（10 節） |
| `JDG-717` | 「問2: ただし、現在非表示  とシンプルな文言とせよ」 | 11 節の問い 2 への答え —— 案 B を簡素な語で: 選んだ行が今の倍率で描かれていない（グループ LOD、`FR-018`）とき、読み出し「現在の高さ 45px」を丸ごと「現在非表示」／ "currently hidden" に置き換える。英語と、その状態で「現在の高さ」の語を外すこと（「現在」を重ねないため）はトリアージセッションが選んだ | 決定 13。表 T-338 の `MH-6`・4.3 節の部品 `currentlyHidden` |

⭐ 2026-09-26、`39955062` の `rulings.md` の `JDG-710` 〜 `JDG-715` と、本書とともに足した `JDG-716`・`JDG-717` の逐語の欄を、上の字と一字ずつ突き合わせた —— 8 つの逐語がどれも一致した（`JDG-713` の `\|` は表の中で `|` を逃がした字。`JDG-717` の「現在非表示」と「と」のあいだの空白 2 つは逐語のまま）。

### 0.2 調べた結果

1. **コード** —— `src/entity/layout-engine/schedule-layout/schedule-layout.ts:523` `Math.max(packed, emptyLane, row.height ?? 0, bandFloorOf(row.depth, settings))`。`row` は `drawnGroups`（`drawn-rows.ts:11`〜`:31`）が返す `TaskGroup` に深さを足したものであり、`row.height` は文書の値そのもの。
   - `packed` と `emptyLane`（`:384`、`:522`）は形が縦に取る高さで、`planHeightOf`（`shape-cross-sections.ts:84`〜`:87`）が `basePlanHeight × zoomY` を採る。`basePlanHeight` は `drawnSettingsOf`（`screen-regions.ts:121`〜`:138`、名簿 `SCALED_BY_THE_DISPLAY` `:70`〜`:80`）で描く比が掛かっている ⇒ 描く比 × `zoomY`。
   - `bandFloorOf`（`:317`〜`:319`）は描く比を掛けた行名の字の大きさであり、`zoomY` は掛からない。⚠️ `DFC-1003` の「ほかの項はどれも表示倍率と `zoomY` で縮尺」は、この項については言い過ぎである（結論は変わらない）。
   - 描く比は `displayRatioOf`（`screen-regions.ts:60`〜`:67`）＝ `S-234` ÷ 100 × `S-236`（`docs/spec/_assets/tbl-settings.md:175`・`:403`、`S-236` は 0.625）。
   - ⇒ いまの `row.height` は、倍率がどちらも 100 のとき、打った数がそのまま画面の px になる。**つまり今の値の意味は `JDG-712` の基準と同じであり、足りないのは伸び縮みだけである。** 保存済みの値は、既定の倍率では今と同じ高さで描かれる。
2. **基準の違い（`JDG-712`）** —— 描く高さ ＝ `minHeight` ×（`S-234` ÷ 100）× `zoomY`。ほかの縦の寸法（表 T-201 の行）は描く比（`S-236` を含む）で画面の px へ直すが、本行の値は人が画面で読んで打つ px なので、`S-236` を掛けると 60 → 37.5px になり、欄の横の「現在の高さ」と打った数が、倍率がどちらも 100 のときでさえ食い違う。⇒ 規則は表 T-252 の新しい行（`DS-13`、仮）に書き、この違いの理由をその行が持つ（4.5 節）。
3. **仕様の今の姿** —— `AT-59`（`docs/spec/_assets/fig-erd-detail.md:364`、原稿 `docs/spec/_source/erd.json:1513`〜`:1527`）と `PR-20`（`_assets/tbl-property-items.md:47`、原稿 `_source/property-items.json:264`〜`:278`）は「倍率 1 のときの論理の高さ」。`FR-042` の RATIONALE（`01-04-requirements.md:2050`）は「ズーム等倍を基準とした論理的な値として持ち、ズームに比例して伸縮させること（MUST）」—— ズームには従うと言い、表示の倍率には触れない。表 T-252（`:6866`〜`:6878`）に `AT-59` の行は無い。⇒ 仕様は「伸び縮みする」を既に求めており、コードが従っていない。「論理の」は `S-236` を掛けるとも読めるので、`JDG-712` の基準で言い直す。
4. **試験** —— `DFC-1003` が挙げた `tests/unit/layout-engine.test.ts:810`〜`:812` と `tests/unit/lf-3-hf-19-a-row-is-never-shorter-than-its-controls.test.ts:199`〜`:202` は、**どちらももう木に無い**（`e873bcc6`、`CR-573` の波 2 〜 3 が消した）。`DFC-1003` の証拠の欄は古い。残るのは:
   - `tests/system/rows-fixed-with-nothing-holding-them.test.ts:73`（`propertyRowOf('TaskGroup', 'height')`）と `:542`〜`:566` の `DFC-133` の高さの場合 —— `DFC-1086`（`39955062`）の後の形で、空の欄から始め「描いた高さ ＝ 打った値」を見る。本書の後は、打った値 ×（`S-234` ÷ 100）× `zoomY` と中身の大きいほうになる。
   - `tests/unit/cr-551-row-fields-keys-and-colour-field-settles.test.ts:266`〜`:268`（`t016RowOf('TaskGroup', 'height')`）。
   - `TaskGroup` の値を組む試験の断片: 77 ファイル・83 行が鍵 `height` を持つ（13 節の数え方）。
5. **パネル** —— 行の欄は `src/adapter/screen-renderer/properties-panel.ts:680`〜`:693` の `groupFields` が `objectFields`（`:646`〜`:662`）で作る。欄の形 `PropertyField`（`screen-renderer.ts:137`〜`:143`）は名・字・操作子だけで、単位も読み出しも空の語も持たない。
   - 描いた高さの出どころ: 読み物 `ScreenViewReadings`（`screen-renderer.ts:464`〜`:501`）の `rowBoxes` は見えている範囲で切った箱（`frame-loop.ts:1032`〜`:1050` の `drawnRowBoxesOf`）なので、スクロールで半分隠れた行の高さを答えない。切らない帯高は `ScheduleLayout.rows` の `RowPlacement.height`（`schedule-layout.ts:128`〜`:136`、`:571`〜`:578` で `rowGap` を含めずに積む）。読み物を詰める所は `frame-loop.ts:747`〜`:769` の `screenViewReadingsOf` で、そこに `layout` が在る（`:762` は既に毎フレーム `layout.rows.map(...)` を作っている）。`row-tree-entrances.ts:181` も同じ `layout.rows` を `placedRows` と呼んでいる。
   - 描く側: `src/framework/dom-screen-surface/dom-screen-surface.ts:795`〜`:808` —— パネルの記述が変わるたびに `fillPropertiesPanel`（`properties-panel-drawing.ts:736`〜`:758`）がパネル全体を `replaceChildren` で作り直し、**欄を編集しているあいだは作り直さない**（`fieldEditing.isFieldHeld()`）。⇒ 読み出しを欄の字として持つと、① `Alt` ＋ ホイールの 1 刻みごとにパネル全体を作り直し（R5）、② 欄を編集しているあいだ読み出しが古いまま残る。
   - 説明（ツールチップ）: パネルの中の説明は、色の欄のテーマに戻す入口が閲覧環境の `title` 属性で出している（`properties-panel-drawing.ts:583`）だけで、仕様にその出し方の行は無い。`IN-3`（`01-04-requirements.md:6912`）は説明の引き金を `EZ-2`・`EZ-6`・`FR-037` に限る ⇒ 11 節の問い 1。答えは説明を付けない（`JDG-716`）—— 本書は `IN-3` に触れない。
6. **取り込みと書き出し** —— `MSPDI` は行の高さを運ばない: 取り込みは `src/adapter/document-codec/mspdi-imported-rows.ts:41` で `height: null` を置き、`src/adapter/document-codec/` のほかに行の高さを書く所は無い（`height` を引いてこの 1 件）。`PR-20` の交換相手の欄「無い（`GRS JSON` のみ）」、`AT-59` の交換の欄は空 —— どちらも真のまま。`GRS JSON` のスキーマ `src/adapter/document-codec/grs-json-schema.ts:253`〜`:255` は生成物（`required` に `height`、`closed`）。古いファイルの `height` は、`CR-565` の読む路で「知らない鍵」として捨てられ、欠けた `minHeight` は既定の `null` になる —— 読み替えは作らない（`JDG-601`）。
7. **起動テンプレート** —— `DFC-1086`（`39955062` に着地）が `Phase Gates` の `height = 40` と監査 `A12` の高さの項を外した。生成器はなお鍵 `'height': height`（`tools/generate_startup_template.py:2557`、値はいつも `None`）を書く ⇒ 本書は鍵の名だけを変える。⚠️ 同じ生成器の `row['height']`（`:1294`・`:1354`・`:1593`・`:1619`）は木の高さであり、行の高さとは無関係 —— 触れない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-2`（ペライチ、`GL-001` / `GL-002`）—— 最小高さを持つ行も絵と一緒に縮む。今は縮めてもその行だけが同じ px のまま残り、全体表示（`FR-055`）と行の軸の上限（`FR-016` の 表 T-253）が、その 1 行に引きずられる。
- `CH-4`（すぐわか、`GL-006`）—— 欄が単位・基準のズーム・いまの高さを示すので、説明を読まずに「いくつを打てば行がどれだけ高くなるか」が分かる。
- `CH-3`（ぬるサク、`GL-003`）—— 守る側: 読み出しの書き換えでパネル全体を毎フレーム作り直さない（決定 7）。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.2`（検証できる）: 「論理の高さ」は `S-236` を掛けるのか掛けないのかを言っていない ⇒ `DS-13` で言い切る。
- `R1.3`（唯一の正）: 掛ける比は表 T-252 の 1 行だけが持ち、`FR-042`・`AT-59`・`PR-20`・`05-07-design.md` の注は指すだけにする。欄の規則は表 T-338（仮）の 1 か所。
- `R2.1`（命名 —— 名は体を表す、単位が固定の量は名に単位）: 列は `minHeight`（下限であることを名が言う —— `JDG-714`）。命令 `setTaskGroupHeight` は `setTaskGroupMinHeight` へ（動詞 ＋ 目的語。置くものが最小の高さになる）。読み物の欄 `placedRows`（複数形の名詞。`row-tree-entrances.ts:181` が同じ値を同じ名で呼んでいる）。辞書の節 `rowMinHeightField`（`colourField` と同じ形の名詞句）。新しい純粋な問いは名詞句（例 `drawnMinHeightPxOf` —— 単位を名に持つ）。
- `R2`（DRY・マジックナンバー）: 罫の太さと両脇の隔たりを表 T-206 の行（`S-440`・`S-441`、仮）に置き、色は既存の `S-149`（罫の色）を読む。数を `src` に打たない。
- `R2.2` / `R2.2a`（単一責任）: `UF-64`（`properties-panel.ts`）の責務文「`Properties Panel`（`FR-006` / `FR-072`）」は範囲の列挙であり、欄に読み出しが 1 つ増えても責務は 1 つのまま（(b) 範囲）。`UF-106`（`properties-panel-drawing.ts`）も同じ。新しいファイルを作らない。
- `R5`（性能）: 読み出しの元は、毎フレーム既に作っている `layout.rows` を参照で渡す（新しい配列を作らない）。DOM は読み出しの字だけを書き換える（決定 7）。
- `R7`（純粋性）: 帯高を読むのは純粋な `ScreenRenderer` の側（`properties-panel.ts`、`pure`）、画面へ書くのは非純粋な `DomScreenSurface`。境は動かさない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 列は `AT-59` の番号と座席（59）を保ったまま、名を `height` → `minHeight`、`null` の意味を「自動」→「下限なし」に替える。型（整数）は変えない。古い文書は読み替えない | `JDG-714`・`JDG-715`「空なら下限なし」・`JDG-601`。番号を保つと、`/** AT-59 */` の注と台帳の引きが生きたまま残る | 保存済みの `GRS JSON` の行の高さは、開くと捨てられる（`CR-565` の読む路） |
| 決定 2 | 描く最小の帯高 ＝ `minHeight` ×（`S-234` ÷ 100）× `zoomY`。`S-236` は掛けない。規則は表 T-252 の新しい行 `DS-13`（仮）が持ち、`FR-042` の RATIONALE と `AT-59` と `05-07-design.md` の注は指すだけ | `JDG-710`・`JDG-712`。0.2 節の 1・2 | 表 T-252 の中で 1 行だけ、描く比ではなく `S-234` ÷ 100 を掛ける —— その理由を行が持つ |
| 決定 3 | 値の範囲（下限・上限）を足さない。負の数や 0 の扱いも今のまま | 裁定が範囲を言っていない。異常系は `JDG-78`（`DFC-586` 待ち） | 負の数を打つと、下限の無い行と同じに描かれる（今と同じ） |
| 決定 4 | 命令 `CM-32` を `setTaskGroupMinHeight` へ改名し、運ぶ欄も `minHeight`、表 T-108 の説明を「行の最小の高さを置く」に。行 ID は保つ | `R2.1`。列の名と命令の名がずれると、命令の名が置くものを言わない | 表 T-108 の 1 行の 2 セル |
| 決定 5 | 欄の規則は `FR-042` に新しい表 T-338（仮）「行の最小の高さの欄」を置き、行 `MH-1` 〜 `MH-6`（仮、接頭辞 `MH` を登録）で持つ | 要求は表を指す（規則「Spec: table-first writing」）。一行の規則を 5 つ以上並べるなら表 | 表 1 つ、接頭辞 1 つ |
| 決定 6 | 「現在の高さ」は、その行の帯高（`05-07-design.md` 表 T-221 の `LF-2`・`LF-3`、`rowGap` を含めない）を px の整数へ四捨五入した値。欄が空のときも、中身が指定より高いときも示す | `JDG-715`「常に示す」「行の実際の描いた高さ ＝ 伸び縮みした最小と中身の大きいほう」。打つ値が整数なので、読む値も整数にそろえる | 21.6px の帯は「22px」と読める |
| 決定 7 | 読み出しは描く絵ごとに書き換え、欄を編集しているあいだも書き換える。編集中の入力の字と焦点は動かさない。DOM は読み出しの字だけをその場で書き換え、パネル全体を作り直さない | `JDG-715`「常に示す」、`FR-006`（編集中の欄を元の字へ戻さない）、`R5` | 描く側（`dom-screen-surface.ts`）に、作り直しと別の小さな書き換えの道が 1 つ増える |
| 決定 8 | 語は辞書（`FR-038`）が持つ: `PR-20` の名を替え、新しい節 `rowMinHeightField`（仮）に 4 つの部品 `unit`・`current`・`none`・`currentlyHidden` を置く。部品の鍵は生成器が持つ（`COLOUR_FIELD_PARTS` と同じ手）。部品の名は語の役を言う名詞句・形容の句にそろえる（`R2.1`。`currentlyHidden` は「いま描かれていない」ことを言い、`current` と頭をそろえる） | `JDG-715`・`JDG-717` の文言。辞書は利用者の語だけを持つ（`display-words.json` の `$comment`） | 辞書の節が 1 つ増える |
| 決定 9 | 区切りは縦の罫 1 本 —— 太さ `S-440`（仮）1px 🔎、両脇の隔たり `S-441`（仮）6px 🔎、色 `S-149`。どちらも既存の行（`S-190`・`S-241`・`S-242`）と兼ねない | `JDG-715`「区切りは描いた罫」、マジックナンバーを置かない。兼ねない理由は `S-241` と `S-242` が互いに述べているのと同じ | 表 T-206 に 2 行。値は利用者が選んだものでも測ったものでもない（🔎） |
| 決定 10 | 空の欄の語は、入力の中に閲覧環境の `placeholder` として薄く示す。色の行は足さない（宿主の既定） | `JDG-715`「空の欄は『なし』」。値ではないので、値として書かない | 薄さは閲覧環境しだい |
| 決定 11 | 読み物の継ぎ目は `ScreenViewReadings.placedRows`（仮）—— `layout.rows` を参照のまま渡す。パネルは行が 1 つ選ばれて行の欄を出すときだけ、その行を `groupId` で探す | `R5`。0.2 節の 5（`rowBoxes` は切った箱なので使えない） | 行の数に比例する探索が、行の欄を出しているフレームだけ走る |
| 決定 12 | `FR-016` の `:3245`「帯の高さを作る縦の寸法には描く比が掛かる（表 T-252 の `DS-1` / `DS-8`）」を、`DS-13` を含む形に直す | その文の括弧は、帯の高さに掛かるものの全部を名指しているので、行を足すと偽になる（6 節） | 1 文 |
| 決定 13 | 「描かれていない」は、選んだ行の `groupId` が `placedRows` に無いこと（グループ LOD、`FR-018` で絵から外れた）と読む。その間は読み出しを部品 `currentlyHidden` の語だけにし、部品 `current` の語（「現在の高さ」と数）を出さない。欄の形と位置は変えず、行がまた描かれたら次の絵で数に戻す | `JDG-717`「現在非表示 とシンプルな文言」。`layout.rows` は描いた行だけを積む（`drawnGroups`、0.2 節の 1）ので、同じ継ぎ目（決定 11）で見分けられる | 行を探して見つからないことが、そのまま「描かれていない」になる —— ほかの理由で見つからない行（消した行）は、パネルが行の欄を出さないので起きない |

---

## 1. 範囲 —— 要求ごとの行き先

| 要求 | 仕様で変える所 | 4 節 |
|---|---|---|
| R1 最小高さの伸び縮み | 表 T-252 に `DS-13`（仮）、`FR-042` の RATIONALE（`:2050`）、`FR-016` の `:3245`、`05-07-design.md:1360` の注 | 4.4・4.5・4.6・4.9 |
| R2 改名（`height` → `minHeight`） | `erd.json` の `AT-59`、`property-items.json` の `PR-20` と生成器の前書き（`property_items_json_to_md.py:230`）、`FR-006` の `:1824`、`FR-042` の STATEMENT、表 T-108 の `CM-32`、表 T-075 の `UF-78` | 4.1・4.2・4.4・4.8・4.9 |
| R3 欄の出し方 | `FR-042` に表 T-338（仮）、`display-words.json` の `PR-20` の名と新しい節、表 T-206 に `S-440`・`S-441`（仮）、`row-id-prefixes.json` に `MH`（仮） | 4.3・4.4・4.7・4.10 |

⚠️ 本書の 4 節は「案の文」である —— 当てる体は、当てる日の `refactor` の先端で旧の塊を測り、旧・新の塊と「旧がちょうど 1 度現れる」ことの数えへ起こしてから当てる（規則 02 の 4 節）。

---

## 2. 新しい識別子（どれも仮 —— 調整役がコミットの前に詰める）

| 種類 | 仮の番号・名 | 何か | 測った（2026-09-26、`origin/refactor` の `39955062` と `change-request/CR-571` 〜 `CR-580`） |
|---|---|---|---|
| 表 | `T-338` | `FR-042` の「行の最小の高さの欄」 | `docs/spec` の表の最大は `T-334`。草案が `T-335`・`T-336`（`CR-574`）、`T-337`（`CR-575`）を取る ⇒ その次。⛔ 当てる日に測り直す（規則 02 の 2.5 節） |
| 行 ID の接頭辞 | `MH`（Min Height） | 表 T-338 の行 `MH-1` 〜 `MH-6` | `docs/spec`・`change-request/`・`retired.py`・`git grep` の全体で `MH-` は 0 件。草案が名乗る新しい接頭辞（`SJ`・`SQ`・`SV`・`VT`・`HN`・`WB`・`LY`・`ZO`）とも違う。`row-id-prefixes.json` の登録は 167 件（当てる日に測り直す） |
| 行 | `DS-13` | 表 T-252「`AT-59`（行の最小の高さ）」 | `docs/spec` の `DS-` は `DS-1`・`DS-3` 〜 `DS-10`（`DS-2` は `retired.py:264`〜`:267` で退いた）。⚠️ `DS-11`・`DS-12` は使わない —— `docs/review/inventory/A04-decided-discarded.md:282`〜`:283` がその字を自分の行に使っている（同書は `DS-01` 〜 `DS-12`）。`DS-13` は `git grep` で 0 件 |
| 行 | `S-440` | 表 T-206「最小高さの欄の罫の太さ」1px | `docs/spec` の最大は `S-418`。草案が `S-419` 〜 `S-439` を名乗る（`CR-571`・`CR-574`・`CR-576`）⇒ その次 |
| 行 | `S-441` | 表 T-206「同じ罫の両脇の隔たり」6px | `S-440` の次。`git grep` で 0 件 |
| 列の名 | `minHeight`（`AT-59`） | 旧 `height` | 列の名としては 0 件（`git grep -w minHeight` の 3 件は、`tests/unit/cr-408-*.test.ts:528`・`tools/probe/harness.mjs:390` の局所の変数と `rulings.md`） |
| 命令の名 | `setTaskGroupMinHeight`（`CM-32`） | 旧 `setTaskGroupHeight` | 0 件 |
| 辞書の節 | `rowMinHeightField` と部品 `unit`・`current`・`none`・`currentlyHidden` | 4.3 節 | どちらの名も `git grep` で 0 件 |
| 読み物の欄 | `ScreenViewReadings.placedRows` | `layout.rows` の参照 | 読み物の欄としては 0 件（`row-tree-entrances.ts:181` の局所の変数が同じ値を同じ名で呼ぶ） |

⚠️ 退く名: 列 `height`（`AT-59` の名）と命令 `setTaskGroupHeight`。どちらも行 ID ではないので `retired.py` には載せない。
⚠️ 新しい図・命令・列は無い（列と命令は改名）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

### 3.1 原稿と刷り物（`docs/spec/_source/`、生成物は `npm run gen` が刷る）

| 旧 | 新 | 理由 |
|---|---|---|
| `erd.json:1513`〜`:1527` の座席 59: `"name": "height"`、`"nullable": "可（\`null\` = 自動）"`、意味「倍率 1 のときの論理の高さ」 | `"name": "minHeight"`、`"nullable": "可（\`null\` = 下限なし）"`、意味は 4.1 節 | 決定 1・2 |
| 刷り物: `fig-erd-detail.md:364`、`grs-document.schema.json`、ERD の生成文書（検査 16・17）、`src/entity/document-model/schedule/schedule-entities.ts:145`〜`:146`、`src/adapter/document-codec/grs-json-schema.ts:255` とその `properties`、`COLUMN_SHAPES` | `npm run gen` が刷る。⛔ 手で直さない | 検査 16・27 |
| `property-items.json:264`〜`:278` の `PR-20`: `"columns": ["height"]`、備考「倍率 1 のときの論理の高さ。`null` ＝ 自動」 | `["minHeight"]`、備考は 4.2 節。入力の型・対象・交換相手は変えない | 決定 1 |
| `property_items_json_to_md.py:230` の前書き「対象を持たないと `TaskGroup` の `height` が」と、`:207` の注 | `minHeight` へ | 改名 |
| `display-words.json:1195`〜`:1200` の `PR-20` の名「高さ」／ "height" | 「最小高さ（ズーム 100% 時）」／ "min height (at 100% zoom)" | `JDG-715` |
| 無し | `display-words.json` に節 `rowMinHeightField`（4.3 節）。`$comment` の 2 つ目の段の「何を持つか」の列挙に 1 句 | 決定 8 |
| 無し | `settings.json` の表 T-206 に `S-440`・`S-441`（4.7 節） | 決定 9 |
| 無し | `row-id-prefixes.json` に `MH`（4.10 節） | 決定 5 |

### 3.2 要求と設計の文（行番号は `1781a77e` —— `39955062` でも同じ）

| 旧 | 新 | 理由 |
|---|---|---|
| `FR-042` の STATEMENT（`01-04-requirements.md:2036`）「その行の色と高さをプロパティパネルに出して」 | 「その行の色と最小の高さを…」 | 改名 |
| 同 `:2037`「指定した高さは下限として扱うこと（MUST）。」 | 「指定した最小の高さは下限として扱うこと（MUST）。」。続く 2 文（広げる・段を落とさない）は変えない。その後に「欄は 表 T-338 に従って出すこと（MUST）。」 | 改名・決定 5 |
| 同 `:2044`「**高さ**の指定が無い行は、段数から自動で決めること（`FR-003` の ST-9）。」 | 「**最小の高さ**の指定が無い行は、…」 | 改名 |
| 同 RATIONALE `:2050`「指定した高さは、ズーム等倍を基準とした論理的な値として持ち、ズームに比例して伸縮させること（MUST） —— 画面上の画素で持つと、ズームした瞬間に指定の意味が変わる。」 | 4.4 節の 2 文 | `JDG-712`・決定 2 |
| 無し | `FR-042` の RATIONALE の末（**Relations** の前）に表 T-338 | 決定 5 |
| `FR-006`（`:1824`）「対象を見ないと `TaskGroup` の `height` が `Task` のパネルにも出る」 | `minHeight` へ | 改名 |
| `FR-016`（`:3245`）「帯の高さを作る縦の寸法には描く比が掛かる（表 T-252 の `DS-1` / `DS-8`）」 | 「帯の高さを作る縦の寸法には表示の倍率が掛かる（表 T-252 の `DS-1` / `DS-8` / `DS-13`）」 | 決定 12 |
| 無し | 表 T-252 に `DS-13`（`DS-10` の後。4.5 節） | 決定 2 |
| `tbl-glossary.md:436` の `CM-32`「`setTaskGroupHeight` ｜ 行の高さを置く」 | 「`setTaskGroupMinHeight` ｜ 行の最小の高さを置く」 | 決定 4 |
| `05-07-design.md:430` の `UF-78` の責務「行の色と高さを書き換える」 | 「行の色と最小の高さを書き換える」 | 改名（責務の数は変わらない） |
| `05-07-design.md:1360`「⚠️ `TaskGroup.height` の指定があるときは `FR-042` が優先する —— 指定は下限であり、…」 | 4.9 節 | 改名・決定 2 |

⭐ 消さないもの: `FR-042` の「段数がそれより高い帯を要するときは、指定を超えて広げること（MUST）」「段を落として指定に収めてはならない（MUST NOT）」と下限の理由の段、`ST-9`、`LF-2`・`LF-3`（最小の高さは 05-07 の注が持つ —— `LF-3` に書き写さない）、`FR-004` の `:1671`（「行の高さは `FR-042` で行ごとに違い」—— 真のまま）と `:1679`（「`FR-042` の高さも…数で読める」—— 真のまま）、`FR-039` の描く比の文（`:6838`）と「保存する値を描く比で書き換えてはならない」（`:6841` —— `minHeight` にも当たり、真のまま）。

### 3.3 コード（行番号は `1781a77e` —— `39955062` でも同じ）

| 旧 | 新 | 持ち場 |
|---|---|---|
| `schedule-layout.ts:523` の `row.height ?? 0` | `DS-13` の値 ——`minHeight` ×（`S-234` ÷ 100）× `zoomY`（`null` は 0）。純粋な問いは名詞句で単位を名に（例 `drawnMinHeightPxOf`）。`S-234` ÷ 100 は `screen-regions.ts:60` の `displayRatioOf` の隣に並べる（例 `displayScaleFractionOf` —— `S-236` を掛けないことを注に書く）。⛔ `drawnSettingsOf` の名簿 `SCALED_BY_THE_DISPLAY` に入れない（`TaskGroup` は設定ではない） | 波 2a |
| `task-group-look.ts:1`（見出しの注「a row's colour and height」）・`:46`〜`:63` `setTaskGroupHeight`（`command.height`、`row.height`、拒みの `AT-59`） | `setTaskGroupMinHeight`、`command.minHeight`、`row.minHeight` | 波 2a |
| `edit-task-group.ts:19`・`:44`・`:366`〜`:367`、`edit-document.ts:181` | 命令の種類 `setTaskGroupMinHeight`、欄 `minHeight` | 波 2a |
| `document-change-plan.ts:186`・`task-create.ts:85`・`task-group-naming.ts:68` の `height: null` | `minHeight: null` | 波 2a |
| `field-commit.ts:246`〜`:248` の `case 'height'` → `setTaskGroupHeight` | `case 'minHeight'` → `setTaskGroupMinHeight`。空は `null`（`settledNumber`、`:34`〜`:39` —— 今のまま） | 波 2b |
| `mspdi-imported-rows.ts:41` の `height: null` | `minHeight: null` | 波 2b |
| `screen-renderer.ts:137`〜`:143` `PropertyField`・`:464`〜`:501` `ScreenViewReadings` | `PropertyField` に任意の欄（例 `unit?`・`readout?`・`placeholder?` —— 名と形は実装の体が決める）。`ScreenViewReadings` に `placedRows: readonly RowPlacement[]` | 波 2b |
| `properties-panel.ts:680`〜`:693` `groupFields` | `PR-20` の欄に、単位の語・`placedRows` から引いた帯高の読み出し（決定 6。行が `placedRows` に無ければ部品 `currentlyHidden` の語だけ —— 決定 13）・空の語を添える。語は `rowMinHeightField` から | 波 2b |
| `frame-loop.ts:747`〜`:769` `screenViewReadingsOf` | `placedRows: layout.rows`（参照。新しい配列を作らない） | 波 2c |
| `properties-panel-drawing.ts:685` `fieldElement` | 単位・罫（`S-440`・`S-441`・`S-149`）・読み出し・`placeholder`。⛔ 説明（`title` 属性を含む）を付けない（`JDG-716`） | 波 2c |
| `dom-screen-surface.ts:795`〜`:808`（記述が変われば作り直す、編集中は作り直さない） | 読み出しの字だけが変わったフレームは、読み出しの要素の字をその場で書き換える —— 編集中も（決定 7）。パネルの「変わったか」の鍵から読み出しの字を外す | 波 2c |
| `tools/generate_entity_types.py:1393`〜`:1398` `NOT_STORED_PROPERTY_FIELD_SIZES` | `S-440`・`S-441` を足す。⛔ 足さないと行が `src` に届かず、`gen:check` は緑のまま（`CR-551`）。`:170` の注「a row's colour and height」は「min height」へ | 波 1 |
| `tools/generate_display_words.py:234`〜`:241`（部品の鍵）・`:424`〜`:426`（名簿）・`:481`（形） | `ROW_MIN_HEIGHT_FIELD_PARTS = ('unit', 'current', 'none', 'currentlyHidden')` と、名簿と `SHAPE` に 1 行ずつ | 波 1 |
| 生成物 `src/adapter/screen-renderer/display-words.json`・`property-items.json` | `npm run gen` | 波 1 |
| `tools/generate_startup_template.py`（`:2530`〜`:2557`: 注・`height = None`・`'height': height`） | 鍵 `'minHeight'`、注の「stated height」を「min height」へ。`startup-template.json` の 100 行を刷り直す | 波 2d |

### 3.4 見本・案内・試験（⛔ 新しい `tests/unit` のファイルは作らない —— `JDG-635` 〜 `JDG-645`、`CR-573`）

| 旧 | 新 | 持ち場 |
|---|---|---|
| `sample-schedule/Three-Year Product Plan.json`（100 行）・`sample-schedule/No Name.json`（1 行）・`docs/guides/schedule-to-grs-json/grs-skeleton.json`（1 行）・`prompt-ja.md`・`prompt-en.md`（2 行ずつ）の鍵 `"height"` | `"minHeight"`（値は `null` のまま） | 波 2d |
| 試験の `TaskGroup` の断片の鍵 `height`（77 ファイル・83 行。13 節の数え方。既存の `tests/unit` のファイルを含む） | `minHeight` | 波 2d |
| `tests/unit/cr-551-row-fields-keys-and-colour-field-settles.test.ts:266`〜`:268` の `t016RowOf('TaskGroup', 'height')`・`rowOf('height')` | `'minHeight'` | 波 2d |
| `tests/system/rows-fixed-with-nothing-holding-them.test.ts:73` の `propertyRowOf('TaskGroup', 'height')` | `'minHeight'` | 波 2d |
| 同 `:542`〜`:566` の `DFC-133` の高さの場合（`DFC-1086` の後の形 —— `39955062`: 空の欄から始め、描いた高さ ＝ 打った値） | 描いた高さ ＝ max（中身の帯高、打った値 ×（`S-234` ÷ 100）× `zoomY`）。打つ値は、倍率を掛けても中身より高くなる数を選ぶ（文書の `S-234`・`zoomY` から求め、試験に数を打たない） | 波 3 |
| `DFC-1003` が挙げた 2 つの単体試験 | もう無い（`e873bcc6`）—— 何もしない | — |
| 無し | 仕様だけの試験（契約・system。8 節の主張） | 波 3 |

⚠️ 検査 42（仕様に無い文を引く注）は、`FR-042` の旧の文・`AT-59` の旧の意味を引く注の数だけ上がる。検査 39（逐語の無い MUST）は表 T-338 と `DS-13` の MUST の数だけ上がる —— 波 3 が同じ日に閉じる。検査 37（辞書と表の組の指紋）は `T-016 PR-20` の 1 行が動く —— 調整役が読み直してから 1 行だけ書き換える。⛔ 基準線は上げない（上げは利用者に問う。`JDG-520`）。

---

## 4. 書き直す所（案の文 —— 当てる体が旧・新の塊へ起こす）

⚠️ 文の中に日付・利用者の名・裁定の番号を書かない（検査 `check-spec-holds-no-history.py`）。逐語は `rulings.md` だけが持つ。
⚠️ 原稿（`erd.json`・`property-items.json`・`display-words.json`・`settings.json`・`row-id-prefixes.json`）を直した後に `npm run gen` を走らせる。生成物を手で直さない。
⚠️ 書き換える文字列が 1 度しか現れないことを数えてから書き換える（規則 02 の 4 節）—— 「指定した高さは」は `:2037` と `:2050` の 2 か所に現れる。

### 4.1 `erd.json` の座席 59（`AT-59`）

```json
{
 "seat": 59,
 "name": "minHeight",
 "type": "整数",
 "nullable": "可（`null` = 下限なし）",
 "json": {
  "kind": "integer",
  "null": true
 },
 "key": "",
 "origin": "GRS",
 "exchange": "",
 "meaning": {
  "ja": "行の最小の高さ。縦のズーム 100%・表示の倍率 100 のときの画面の px。描くときに掛ける比は `FR-039` の 表 T-252 の `DS-13`、欄の出し方は `FR-042` の 表 T-338 が持つ"
 }
}
```

### 4.2 `property-items.json` の `PR-20`

`"columns": ["minHeight"]`。備考: 「行の最小の高さ（縦のズーム 100% のときの画面の px）。`null` ＝ 下限なし。欄の出し方は `FR-042` の 表 T-338 が持つ」。入力の型（数値）・対象（`TaskGroup`）・交換相手（無い（`GRS JSON` のみ））は変えない。

### 4.3 `display-words.json`（語はすべて `JDG-715`・`JDG-717` の字。⛔ 体は語を作らない）

`properties` の `PR-20`:

```json
{ "rowId": "PR-20", "label": { "ja": "最小高さ（ズーム 100% 時）", "en": "min height (at 100% zoom)" } }
```

新しい節（`colourField` の後）:

```json
"rowMinHeightField": [
 { "part": "unit",    "text": { "ja": "px", "en": "px" } },
 { "part": "current", "text": { "ja": "現在の高さ {px}px", "en": "current: {px} px" } },
 { "part": "none",    "text": { "ja": "なし", "en": "none" } },
 { "part": "currentlyHidden", "text": { "ja": "現在非表示", "en": "currently hidden" } }
]
```

⚠️ `{px}` は決定 6 の整数が入る所（`dualCursorReadout` の `{date}` と同じ手）。日本語は「高さ」と数のあいだに空白 1 つ、数と `px` のあいだに空白なし。英語は `current:` の後と `px` の前に空白 1 つ —— `JDG-715` の例「現在の高さ 45px」／ "current: 45 px" のとおり。
⚠️ 部品 `currentlyHidden` は、選んだ行が描かれていないとき（表 T-338 の `MH-6`）に部品 `current` の代わりに丸ごと出す語である —— 前に「現在の高さ」を付けず、数も添えない（`JDG-717`）。
⛔ 説明（ツールチップ）の部品を置かない —— 最小高さの欄に説明を付けない（`JDG-716`）。

### 4.4 `FR-042`

STATEMENT（3.2 節の 3 か所のほか、`:2039`「段を落として…」の後、`:2040`「⭐ 行の名前」の前に 1 文）:

- 「欄は 表 T-338 に従って出すこと（MUST）。」

RATIONALE の `:2050`（旧 → 新）:

- 旧: 「指定した高さは、ズーム等倍を基準とした論理的な値として持ち、ズームに比例して伸縮させること（MUST） —— 画面上の画素で持つと、ズームした瞬間に指定の意味が変わる。」
- 新: 「指定した最小の高さは、縦のズームが 100%（`_assets/tbl-settings.md` の 表 T-203 の `S-76` が 1）で表示の倍率（表 T-202 の `S-234`）が 100 のときの画面の px として持ち、描くときは `FR-039` の 表 T-252 の `DS-13` のとおり、縦のズームと表示の倍率に比例して伸縮させること（MUST） —— 伸縮させないと、絵を縮めてもその行だけが縮まず、ズームした瞬間に指定の意味が変わる。  
  基準を画面の px に置くのは、作成者が欄の横の現在の高さ（表 T-338 の `MH-3`）で読んだ数と同じ単位で打てるようにするためである。」

RATIONALE の末（**Relations** の前）に:

**表 T-338 — 行の最小の高さの欄**

| 行 ID | 何について | 規則 |
| --- | --- | --- |
| MH-1 | 値と単位 | 欄の値は、縦のズームが 100% で表示の倍率が 100 のときの画面の px の整数とすること（MUST）。<br>値の入力の右に単位の語を置き、欄の名に基準のズームを含めること（MUST） —— 数だけでは、いまの倍率で描かれた px か基準の px かが読めない。<br>描くときに掛ける比は `FR-039` の 表 T-252 の `DS-13` が持つ |
| MH-2 | 空の欄 | 値が `null` のときは入力を空にし、下限の無いことを示す語を入力の中に薄く示すこと（MUST）。<br>⛔ `0` と示してはならない（MUST NOT） —— `0` は人が打った値に見え、下限の無いことと見分けられない。<br>空にして確定したら `null` を書くこと（MUST） |
| MH-3 | 現在の高さ | 単位の右に、その行のいまの帯高を単位を添えて示すこと（MUST）。<br>帯高は `05-07-design.md` の 表 T-221 の `LF-2` と `LF-3` が決める値であり、行と行のあいだ（`rowGap`）を含めない。<br>px の整数へ四捨五入して示すこと（MUST）。<br>欄が空のときも、帯高が指定より高いときも示すこと（MUST） —— いまの帯高が読めないと、いくつを打てば行が高くなるかが分からない。<br>⭐ ズームの百分率ではなく高さを示す —— 作成者が比べるのは、打つ数と描かれた高さである |
| MH-4 | 追随 | 縦のズーム・表示の倍率・行の中身のどれかで帯高が変わったら、次に描く絵で現在の高さを書き換えること（MUST）。<br>欄を編集しているあいだも書き換えること（MUST）。<br>⛔ 編集している入力の字と焦点を動かしてはならない（MUST NOT） —— 打ちかけの数が消えると、倍率を変えながら数を選べない |
| MH-5 | 区切り | 単位と現在の高さのあいだを縦の罫 1 本で隔てること（MUST）。<br>罫の太さは `_assets/tbl-settings.md` の 表 T-206 の `S-440`、罫の両脇の隔たりは同表の `S-441`、色は 表 T-236 の `S-149` とする。<br>⛔ 区切りを字（`\|` など）で書いてはならない（MUST NOT） —— 字は辞書の語になり、言語ごとに選び直すものが増える |
| MH-6 | 行が描かれていないとき | 選んだ行が、いまの倍率で描かれていないとき（`FR-018` のグループ LOD で絵から外れたとき）は、現在の高さの語と数の代わりに、描かれていないことを示す語だけを示すこと（MUST）。<br>⛔ 数を示してはならない（MUST NOT） —— 描いた帯が無く、読める帯高が無い。<br>欄の形と位置は変えず、行がまた描かれたら、次に描く絵で現在の高さに戻すこと（MUST） —— 倍率を戻すと同じ場所に数が戻るので、どこを読めばよいかが変わらない |

表の下に: 「欄の名・単位・現在の高さ・空の欄・行が描かれていないときの語は `FR-038` の辞書が持つ。」

### 4.5 表 T-252 の `DS-13`（`DS-10` の後）

| 行 ID | 何に | 掛けるか | 理由 |
| --- | --- | --- | --- |
| DS-13 | `_assets/fig-erd-detail.md` の `AT-59`（行の最小の高さ。`FR-042`） | `S-234` を 100 で割った値と、縦のズーム（同書の 表 T-203 の `S-76`）を掛ける。<br>⛔ 同書の 表 T-206 の `S-236` を掛けてはならない（MUST NOT） | 値は、表示の倍率 100・縦のズーム 100% のときの画面の px として人が打つ（`FR-042` の 表 T-338 の `MH-1`）—— 欄の横の現在の高さ（同表の `MH-3`）と同じ単位で読み書きするためである。<br>本表のほかの行の寸法は `S-236` を含む描く比で画面の px へ直すが、本行の値は既に画面の px なので、`S-236` を掛けると、倍率がどちらも 100 のときに打った数と描かれる帯高が食い違う（60 を打って 37.5px）。<br>表示の倍率と縦のズームを掛けるのは、ほかの寸法と一緒に縮め・拡げるためである —— 掛けないと、絵を縮めてもその行だけが縮まない |

### 4.6 `FR-016` の `:3245`

- 旧: 「帯の高さを作る縦の寸法には描く比が掛かる（表 T-252 の `DS-1` / `DS-8`）が、」
- 新: 「帯の高さを作る縦の寸法には表示の倍率が掛かる（表 T-252 の `DS-1` / `DS-8` / `DS-13`）が、」（文の後半は変えない）

### 4.7 表 T-206 の `S-440`・`S-441`（`S-199` の辺り、パネルの行の群に）

| 行 ID | 値 | 既定 | 保存しない理由 |
| --- | --- | --- | --- |
| S-440 | プロパティパネルの最小の高さの欄で、単位と現在の高さを隔てる罫の太さ（`FR-042` の 表 T-338 の `MH-5`） | 1px 🔎 | ⭐ 画面の px である —— 表示の倍率（表 T-202 の `S-234`）も `S-235` も掛けない（プロパティパネルは日程表の絵ではない）。<br>⛔ `S-241`・`S-242` と兼ねてはならない —— 数が同じだけで、あちらは担当者の一覧の欄の罫と、確認の見出しの境目である。<br>⛔ 利用者が選んだ値ではなく、測って決めた値でもない —— 同じ 1px の罫に揃えた。<br>`S-138` と同じ理由で保存しない |
| S-441 | 同じ罫の両脇に空ける隔たり（`FR-042` の 表 T-338 の `MH-5`） | 6px 🔎 | ⭐ 画面の px である（`S-440` と同じ）。<br>⛔ `S-190` と兼ねてはならない —— 数が同じだけで、あちらは項目名と入力欄のあいだである。<br>⛔ 利用者が選んだ値ではなく、測って決めた値でもない —— `S-190` に揃えた。<br>`S-138` と同じ理由で保存しない |

### 4.8 表 T-108 の `CM-32`

| CM-32 | `TaskGroup` | `setTaskGroupMinHeight` | — | 行の最小の高さを置く | `FR-042` |

### 4.9 `05-07-design.md`

- `:430` `UF-78` の責務: 「行の色と高さを書き換える」→「行の色と最小の高さを書き換える」。
- `:1360`: 「⚠️ `TaskGroup.minHeight` の指定があるときは `FR-042` が優先する —— 指定は下限であり、段数がそれより高い帯を要するときは超えて広げる。  
  描くときに指定へ掛ける比は `01-04-requirements.md` の `FR-039` の 表 T-252 の `DS-13` が持つ（表示の倍率の段と縦のズーム。`S-236` は掛けない）。」

### 4.10 `row-id-prefixes.json`

```json
{ "prefix": "MH", "words": "Min Height", "owner": "spec", "means": { "ja": "行の最小の高さの欄の規則（表 T-338）" } }
```

---

## 5. 継ぎ目 —— 依頼文にこのまま写すこと

```
SEAM (verbatim in every brief of waves 1, 2a, 2b, 2c, 2d and 3)
- Column: TaskGroup.height is renamed TaskGroup.minHeight (AT-59 keeps its id
  and seat 59; integer | null; null = no minimum). No reading conversion of
  old GRS JSON (JDG-601): an old "height" key is dropped by the CR-565 read
  path and minHeight defaults to null. MSPDI neither writes nor reads it;
  import puts minHeight: null.
- Command: CM-32 setTaskGroupHeight is renamed setTaskGroupMinHeight and
  carries { groupId, minHeight: number | null }. Refusals unchanged.
- Drawing (table T-252 row DS-13, provisional): the drawn floor of a row's
  band is minHeight * (S-234 / 100) * zoomY. NEVER multiply by S-236 (0.625):
  the value is screen px at display scale 100 and zoomY 1. The band height
  stays max(packed lanes, empty lane, drawn floor of minHeight, row-name
  floor) -- only the minHeight term changes. Do not add minHeight to
  SCALED_BY_THE_DISPLAY (it is not a setting).
- Readout (table T-338 MH-3 / MH-4): the property panel's PR-20 field shows
  "current height" = RowPlacement.height of that row (band height, no
  rowGap), rounded half up to an integer px, always (empty field too, taller
  content too) -- except a row that is not drawn (MH-6, below). Source: ScreenViewReadings.placedRows = layout.rows, passed by
  reference from screenViewReadingsOf (frame-loop.ts) -- never rowBoxes (they
  are clipped to the visible area). The panel looks the row up by groupId
  only when it shows the row's fields.
- DOM (MH-4, R5): when only the readout text changes, rewrite that text node
  in place; never rebuild the whole panel for it, and do it while a field is
  held too. Never touch the held input's text or focus.
- Words (display-words.json, FR-038): PR-20 label; section rowMinHeightField
  with parts unit, current ("{px}" placeholder), none, currentlyHidden. Keys
  held in tools/generate_display_words.py like COLOUR_FIELD_PARTS. Never type
  a word.
- Separator (MH-5): one vertical rule, width S-440 (1 px), gaps S-441 (6 px)
  on both sides, colour S-149. Both rows go to NOT_STORED_PROPERTY_FIELD_SIZES
  in tools/generate_entity_types.py. Never a character.
- Empty field (MH-2): the input is empty and shows the "none" word as the
  host placeholder; never "0". Confirming empty writes null (field-commit.ts
  already does).
- No tooltip (JDG-716): the field carries no explanation -- no hint word, no
  title attribute, no tooltip target. IN-3 and the CR-575 / CR-576 tooltip
  targets are not touched.
- Not drawn (MH-6, JDG-717): when the selected row's groupId is not in
  placedRows (group LOD, FR-018, took it out of the picture), the readout is
  the currentlyHidden word alone (ja "現在非表示" / en "currently hidden" --
  read from the dictionary, never typed): no number, no "current" word. Same
  place, same field shape; the number returns on the next frame the row is
  drawn again.
- No new file (unit), no new row in table T-075. No new tests/unit file.
```

⚠️ `CR-572`（パーク中）との重なり: `CR-572` の波 2d は `startup-template.json`（`tools/generate_startup_template.py`）・`sample-schedule/*.json`・`docs/guides/schedule-to-grs-json/grs-skeleton.json` を書き直す —— 本書の波 2d と同じファイルである。後に当たる方が、先に当たった方の鍵（`minHeight`、`CR-572` の `documentSettings` の仕分け）で書く。`CR-572` は `displayScale`（`S-234`）と `zoomY`（`S-76`）を「内容」として文書に残す（`CR-572` の `:368`・`:453`）ので、`DS-13` の読み先は変わらない。
⚠️ `DFC-1086` との重なり: 同じ生成器と `tests/system/rows-fixed-with-nothing-holding-them.test.ts` を書き換えた —— `39955062` に着地しており、3 節の行番号はその後の木のものである。
⚠️ `CR-578`・`CR-580` との重なり: `CR-578` は `frame-loop.ts` の入口を割り、`CR-580` は `MSPDI` の codec を割る。どちらかが先に当たれば、`screenViewReadingsOf`・`mspdi-imported-rows.ts:41` の在り処が変わりうる —— 継ぎ目の中身（`placedRows: layout.rows`、`minHeight: null`）は変わらず、当てる体が在り処を測り直す。

---

## 6. グラフ（`1781a77e` のワークツリーで測った。`scratch/spec-check/sd-out` は同じ日 12:49 に刷られていた）

| 対象 | 1 次（要求 ／ 参照） | 備考 |
|---|---|---|
| `AT-59` ／ `PR-20` ／ `CM-32` | 0 ／ 0 ずつ（浮いている） | 改名は、指している要求の文を偽にしない |
| `FR-042` | 4 ／ 16（`FR-085` `:1582`・`:1587`、`FR-004` `:1671`・`:1679`、`FR-031` `:2154`、`FR-089` `:4439`、`05-07-design.md:430`・`:914`・`:1360`、`tbl-glossary.md:434`・`:436`・`:562`、`tbl-settings.md:172`・`:215`・`:478`、`tbl-state-machines.md:862`） | 偽になるのは `:430`（`UF-78`）・`:1360`・`:436`（`CM-32`）の 3 つ —— 3.2 節で直す。ほかは色・縞・罫・選んだ行の話で真のまま |
| 表 T-252 | 要求 7（`FR-094`・`FR-085`・`FR-016`・`FR-104`・`FR-052`・`FR-017`・`FR-039`）、2 次 32 | 偽になるのは `FR-016` の `:3245`（括弧が帯の高さに掛かるものを列挙している）—— 決定 12。ほかは `DS-1`・`DS-4`・`DS-7`・`DS-9` を名指す文で、`DS-13` を足しても真のまま |
| `LF-3` | 5 ／ 10 | 変えない（最小の高さは `:1360` の注が持つ） |
| `ST-9` | 2 ／ 5（`FR-094`、`FR-042` `:2044`・`:2053`） | 変えない |

`induced.py`（種 30: `AT-59` `PR-20` `CM-32` `FR-042` `FR-006` `T-016` `T-252` `DS-1` `DS-8` `FR-039` `S-234` `S-236` `S-76` `ST-9` `LF-2` `LF-3` `T-221` `FR-003` `FR-038` `IN-3` `EZ-2` `FR-092` `UF-78` `UF-64` `UF-106` `FR-016` `BC-2` `FR-055` `FR-004` `FR-085`）: **30 のうち 30 が仕様に在り、種のあいだの辺 51、閉路 2 つ**。

- 大きさ 9: `FR-003` `FR-016` `FR-039` `FR-042` `FR-055` `FR-085` `LF-3` `S-234` `S-236` —— 書くのは `FR-042`（STATEMENT・RATIONALE・表 T-338）、`FR-039`（表 T-252 の `DS-13`）、`FR-016`（`:3245`）の 3 つで、1 手で書く。`FR-003`・`FR-055`・`FR-085`・`LF-3`・`S-234`・`S-236` は読み直すだけ（値の行と規則を持つ要求の小さな閉路は作法 —— 規則 02）。
- 大きさ 2: `EZ-2` `IN-3` —— 書かない。最小高さの欄に説明を付けない（`JDG-716`）ので、`IN-3` の引き金の列挙は真のまま残る。種に残したのは、書かないことを確かめるためである。
- 書くのは大きさ 9 の閉路だけ ⇒ 波 1 の 1 手（1 つのコミット）。

⚠️ 振る舞いが変わる所（文は偽にならないが、絵は変わる）: 最小の高さを持つ行の多い文書で、全体表示（`FR-055`）が選ぶ縦の倍率と、行の軸の上限（`FR-016` の 表 T-253 の `BC-2`「いちばん高い行の帯の高さ」）が変わる —— 今は最小の高さが縮まないので、大きな値の行 1 つで上限が低く張り付く。表示の倍率を変えたときの留め（`FR-039` `:6885`〜`:6886`）は `rowPlacesAtZoomY` に問うので、式を書き足さずに従う。
⛔ 当てる前に、導いた条項（決定 3・6・7・9・10・12）で `impact.py` を打ち、届いた行ごとに `rulings.md` を引く（規則 02 の 1 節）。起草の時点で引いたもの: `AT-59`・`PR-20`・`CM-32`・`TaskGroup.height` を名指す裁定は `JDG-710` 〜 `JDG-715` のほかに無い。`JDG-87`・`JDG-238`（中身で決まる行の高さ）は最小の高さに触れない。`PND-142`（選んだ行の置き場）は決定 11 と両立する。

---

## 7. 数の予測（`1781a77e` のワークツリーで測り、`DFC-1086` の着地した `39955062` で起点を測り直した —— 同じ数）

| 数 | 前 | 後 | 内訳 |
|---|--:|--:|---|
| tables（`md-checks.py`） | 189 | 190 | ＋`T-338` |
| figures | 28 | 28 | — |
| rows | 2364 | 2373 | ＋1（`DS-13`）＋2（`S-440`・`S-441`）＋6（`MH-1` 〜 `MH-6`） |
| uids | 163 | 163 | — |
| `erd.json` の列 ／ `AT-` の行 | 189 座席 ／ 139 | ±0 ／ ±0 | 改名だけ |
| 表 T-108 の命令 ／ 表 T-016 の行 | 71 ／ 20 | ±0 ／ ±0 | 改名だけ |
| 表 T-252 の行 ／ 表 T-206 の行 | 9 ／ — | 10 ／ ＋2 | |
| `row-id-prefixes.json` の接頭辞 | 167 | 168 | ＋`MH` |
| `display-words.json` の節 ／ 新しい節の部品 | 27 ／ — | 28 ／ 4 | `unit`・`current`・`none`・`currentlyHidden` |
| 鍵 `height`（`TaskGroup`）の出現（見本・テンプレート・案内） | 206 | 0 | `startup-template.json` 100・`Three-Year Product Plan.json` 100・`No Name.json` 1・`grs-skeleton.json` 1・`prompt-ja.md` 2・`prompt-en.md` 2 |
| 同（`src` の手書きの字） | 5 ＋ 読み書き | 0 | 断片 5（`mspdi-imported-rows.ts:41`・`document-change-plan.ts:186`・`task-create.ts:85`・`task-group-naming.ts:68`・`edit-task-group.ts:44`）と、読み書き（`schedule-layout.ts:523`・`task-group-look.ts:57`〜`:62`・`field-commit.ts:246`〜`:248`）。生成物（`schedule-entities.ts`・`grs-json-schema.ts`）は `npm run gen` が運ぶ |
| 鍵 `height`（`TaskGroup`）の出現（試験） | 83 行 ／ 77 ファイル | 0 | 13 節の数え方（窓で拾うので、当てる体は 0 になったことを同じ窓と `git grep -n "height: null"` の両方で数える） |
| `setTaskGroupHeight` の出現（`src` の行） | 8 | 0 | `setTaskGroupMinHeight` へ |
| 表 T-075 の行 ／ `SU-3` のユニットの数 | — | ±0 ／ ±0 | 新しいファイルを作らない |
| 生成器の群 `NOT_STORED_PROPERTY_FIELD_SIZES` の行 | 12 | 14 | ＋`S-440`・`S-441` |

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

| 波 | 持ち場（このファイルだけを書く） | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる日の `refactor` の先端で 3 節の旧の塊と 7 節の起点を測り直し、仮の番号（`T-338`・`MH`・`DS-13`・`S-440`・`S-441`）を詰める（規則 02 の 2.5 節、検査 62）。`CR-578`・`CR-580` が先に当たっていれば、`frame-loop.ts`・`MSPDI` の codec の在り処を測り直す | 調整役 |
| 1 | `docs/spec/**`（原稿 5 つと `01-04-requirements.md`・`05-07-design.md`・`_assets/tbl-glossary.md`、`_source/property_items_json_to_md.py`）、`tools/generate_display_words.py`・`tools/generate_entity_types.py`、`npm run gen` の出力 | 4 節のすべて。6 節の閉路は 1 手ずつ。`npm run gen` の後、生成された `NOT_STORED_PROPERTY_FIELD_SIZES` に `S-440`・`S-441` が 1 度ずつ、生成された `display-words.json` に `rowMinHeightField` が 1 度現れることを数える。⭐ 生成された `schedule-entities.ts` の型が変わるので tsc は波 2 まで赤い ⇒ ⛔ 波 1 と 2 は同じコミットに入れる | 仕様の体（Opus） |
| 2a | `src/entity/**`・`src/use-case/**`（生成物を除く） | `schedule-layout.ts:523` と新しい純粋な問い（`screen-regions.ts` に比の問い）、命令の改名（決定 2・4） | 実装の体（Opus） |
| 2b | `src/adapter/**`（生成物を除く） | `field-commit.ts`・`mspdi-imported-rows.ts`、`screen-renderer.ts` の型と `placedRows`、`properties-panel.ts` の欄（決定 6・8・10・13） | 実装の体（Opus） |
| 2c | `src/framework/**`（`startup-template.json` を除く） | `frame-loop.ts` の `placedRows`、`properties-panel-drawing.ts` の単位・罫・読み出し・`placeholder`、`dom-screen-surface.ts` のその場の書き換え（決定 7）。⛔ 新しいファイルを作らない。⛔ 説明を付けない（`JDG-716`） | 実装の体（Opus） |
| 2d | `tools/generate_startup_template.py` と `startup-template.json`、`sample-schedule/*.json`、`docs/guides/schedule-to-grs-json/`（骨組みと依頼文 2 つ）、3.4 節の「鍵の改名だけ」の試験ファイル | 鍵 `height` → `minHeight` の機械の書き換え（値は変えない）。0 になったことを 7 節の数え方で数える | 機械の体（Sonnet —— 規則「Mechanical work goes to a body」） |
| 3 | `tests/contract/**`・`tests/system/**` の新しいファイル、`tests/system/rows-fixed-with-nothing-holding-them.test.ts` の `DFC-133` の高さの場合 | ⭐ 仕様だけの試験の体。実装の体と別。`docs/spec` だけを読み、コードを読まない。⛔ 新しい `tests/unit` のファイルを作らない（`JDG-635` 〜 `JDG-645`）。主張は下の 11 | 試験の体（Opus） |
| 4 | 基準線・`dist` | 合わせた木で vitest・`check.sh`・`gen:check`・tsc。破る試験は合わせた木の写しで走らせる。`dist/index.html` を刷り直し、9 節の実物確認。検査 37 の `T-016 PR-20` の 1 行を読み直して書き換える。基準線は調整役（下げ・改名は問わず、上げは利用者に問う） | 調整役 |

⭐ 2a・2b・2c・2d は触るファイルが重ならないので並行してよい。継ぎ目（5 節）は 5 つの依頼文に同じ字で写す。
⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。`frame-loop.ts` を触るほかの変更要求と同じ波に入れない。

波 3 の主張（どれも `docs/spec` の逐語を引く。契約か system）:

1. 縦のズーム 100%・表示の倍率 100 で、中身が打った値より低い行は、打った値の px ちょうどの帯で描かれる（system）。
2. 縦のズーム `z`・表示の倍率 `s` で、帯高 ＝ max（中身の帯高、打った値 × `s` ÷ 100 × `z`）。`S-236` を掛けた値ではない（契約: 配置の関数を倍率の組の表で回す。破る試験は `S-236` を掛けて赤を見る）。
3. 保存済みの値は開き直しても同じで、文書の値は倍率を変えても書き換わらない（`FR-039` の MUST NOT）（契約）。
4. 現在の高さは帯高を整数へ四捨五入した値で、欄が空のときも、中身が高いときも出る（system）。
5. `Alt` ＋ ホイールで縦の倍率を変えると、パネルを開き直さずに現在の高さが変わる。欄に数を打ちかけたまま倍率を変えても、打ちかけの字は残り、現在の高さは変わる（system。`MH-4`）。
6. 空の欄は「なし」／ "none" を薄く示し、`0` を示さない。空で確定すると `minHeight` が `null` になり、書き出した `GRS JSON` に鍵 `height` が無い（契約・system）。
7. 名・単位・現在の高さ・空の語・行が描かれていないときの語が、表示言語ごとに辞書の字で出る（契約: `display-words.json` と表 T-338 を突き合わせる）。
8. 区切りは字ではなく、太さ `S-440`・色 `S-149` の罫である（system: DOM の中に区切りの字が無い）。
9. `MSPDI` へ書き出しても最小の高さは出ず、`MSPDI` から取り込んだ行は `null`（契約。XSD が無いときは明示してスキップ —— `JDG-644`）。
10. 大きな最小の高さを持つ行が 1 つある文書で、全体表示の後に縦を縮めると、その行も縮む（system。`CH-2`）。
11. 行を選んだまま縦を縮めて、その行がグループ LOD（`FR-018`）で絵から外れると、読み出しは辞書の「描かれていない」の語だけになり、数も「現在の高さ」の語も出ない。欄は同じ場所に残り、縦を拡げて行が戻ると、次の絵で数に戻る（system。`MH-6`）。

破る試験（規則 04 の 2 節）: 合わせた木の写しで、`DS-13` に `S-236` を掛ける／`zoomY` を外す／読み出しを `rowBoxes` の切った高さにする／読み出しを欄の編集中に止める／区切りを字にする／描かれていない行で数を出す —— それぞれで対応する主張が赤くなることを見る。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

- コード: 3.3 節と 5 節。見本と案内: 3.4 節。
- 当てた後に出荷ビルドで押して確かめる（Playwright、msedge、file://、1920 × 1080）:
  - 起動テンプレートの段 0 の行を選び、欄が「なし」を薄く示し、現在の高さが帯高を示すこと。60 を打つと、縦のズーム 100%・表示の倍率 100 なら帯が 60px になり、現在の高さが 60px になること。
  - `sample-large-erp-program.ja.xml` を開いて（全体表示 —— `DFC-1009` の実測で縦 0.291）「1.5 ステアリングコミッティ」に 60 を打つと、現在の高さは中身の帯高のまま（60 × 0.291 ≈ 17px は中身より低い）であること。縦のズーム 100% へ拡げると 60px、そこから `Alt` ＋ ホイールで 3 刻み縮める（`S-53` の 1.1 で約 75.1%）と 45px を読むこと。
  - 表示の倍率を 200 にすると、縦 100% で 120px になること。
  - 欄に数を打ちかけたまま `Alt` ＋ ホイールを回し、打ちかけの字が残り、現在の高さだけが変わること。
  - 同じ見本で「1.5 ステアリングコミッティ」（段 2）を選んだまま縦を縮め、行が絵から消えたら読み出しが「現在非表示」（英語の表示では "currently hidden"）だけになり、拡げ戻すと数に戻ること。欄の名にポインタを置いても説明が出ないこと。
- 台帳: 12 節。
- ⚠️ 観察（閉じない）: 色の欄のテーマに戻す入口の説明（`properties-panel-drawing.ts:583` の `title`）は、仕様に出し方の行が無く、`IN-3` の「ポインタを乗せられる」「消せる」を閲覧環境まかせにしている。問い 1 の答え（説明を付けない、`JDG-716`）で、本書はそちらに同じ形の問いを立てない。仕様に行が無いことは残る —— 調整役が台帳に起こすかを決める（本書は `DFC` の帯を持たない）。

---

## 10. ⛔ この変更でやらないこと

- `S-236`（0.625）・`S-234` の段・`S-76` の範囲を変えない。表 T-252 のほかの行を変えない。
- 最小の高さに範囲（下限・上限）を足さない。負の数・0 の扱いを変えない（`JDG-78`）。
- 古い `GRS JSON` の `height` を `minHeight` へ読み替えない（`JDG-601`）。`MSPDI` の書き方と読み方を変えない。
- 起動テンプレートにもう一度高さを持たせない（`JDG-711`、`DFC-1086`）。生成器の監査 `A12` を戻さない。
- 読み出しにズームの百分率を出さない（`JDG-712`）。区切りに字を使わない（`JDG-715`）。
- 最小高さの欄に説明（ツールチップ）を付けない。`IN-3` の引き金の列挙と、`CR-575`・`CR-576` の説明の対象を変えない（`JDG-716`）。
- 行の中身の帯高の規則（`LF-2`・`LF-3`・`ST-9`・`FR-042` の下限の扱い）を変えない。
- `tests/unit` に新しいファイルを作らない。コードに新しいファイル（ユニット）を作らない。

---

## 11. 前に立つ者へ返す問い —— 答えを受けた（2026-09-26）

| 問い | 答え | 裁定 |
|---|---|---|
| 問い 1（最小高さの欄の説明をどう出すか） | 出さない —— 説明（ツールチップ）は要らない。必要になったら、そのとき改めて決める | `JDG-716` |
| 問い 2（選んだ行が描かれていないとき、現在の高さに何を出すか） | 案 B を簡素な語で —— 読み出しを丸ごと「現在非表示」／ "currently hidden" に置き換える | `JDG-717` |

⚠️ 下の 2 つは問うたときの記録であり、書き換えない。本書の本文は上の答えで書いた。記録の中の `MH-6`（説明）・`MH-7`（描かれていないとき）・4.11 節は問うたときの番号である —— 今の本書では説明の行と 4.11 節を消し、描かれていないときの行が `MH-6` である。

### 問い 1 —— 最小高さの欄の説明（ツールチップ）を、どう出すか

**何の話か**: `JDG-715` は説明の文を決めたが、出し方は決めていない。いまの仕様で説明（ツールチップ）の引き金はアイコン（`EZ-2`）・タスク（`EZ-6`）・スクロールバー（`FR-037`）の 3 つだけで（`IN-3`）、プロパティパネルの欄には無い。パネルの中で説明を出している唯一の所（色の欄のテーマに戻す入口）は、閲覧環境の `title` 属性に任せている（`properties-panel-drawing.ts:583`）。

**場面**: 「1. プログラム管理」を選び、パネルの「最小高さ（ズーム 100% 時）」の上にポインタを置く ——

| | 案 A: アプリの説明（アイコンと同じ出し方）（推奨） | 案 B: 閲覧環境の `title`（色の欄と同じ） | 案 C: 説明を欄の下に常に書く |
|---|---|---|---|
| いつ出るか | 欄の名に入って `S-124`（`CR-576` の後は 300 ms）で出る。名の中で動かしても消えず、説明の上へ運べる。`Esc` で消せる | 閲覧環境が決める待ちで出る（アプリからは選べない）。消し方と乗せ方は閲覧環境しだい | 常に出ている |
| 字の大きさ・言語・テーマ | アプリの説明の字（`EZ-2` と同じ）。表示言語に従う | 閲覧環境の既定の字。表示言語には従う | パネルの字 |
| 仕様の手間 | `MH-6` と `IN-3` の列挙に 1 項（4.11 節）。`CR-576` の「説明の対象」に欄の名を 1 つ足す | `MH-6` に「`title` で出す」と 1 文。`IN-3` の 3 つの条件をこの説明には当てないと書く | `MH-6` に 1 文、パネルに 4 文ぶんの高さ |
| 当てる順 | `CR-575`・`CR-576` の後 | 順を選ばない | 順を選ばない |

**推奨: 案 A**。理由: ① 利用者は説明の待ちを「細かく調整する」と言った（`JDG-658`）—— 案 B はその値が効かない説明を 1 つ増やす。② `IN-3`（消せる・乗せられる・引き金が外れるまで出る）は、説明の作法として全体に掛かる MUST であり、案 B はそれを閲覧環境に預ける。③ 案 C は 4 文がパネルの高さを常に食い、`FR-006` の「最も頻繁に触る値のためにスクロールさせない」とぶつかる。代償: 本書が `CR-575`・`CR-576` の後に回り、説明の対象が 1 種ふえる。⚠️ 案 A を採るなら、色の欄の `title`（9 節の観察）も同じ出し方へ揃えるかを、別に問うことになる。

### 問い 2 —— 選んだ行が描かれていないとき、「現在の高さ」に何を出すか

**何の話か**: `JDG-715` は現在の高さを「常に示す」とした。しかし行を選んだまま縦に縮めると、グループ LOD（`FR-018`）がその行を描かなくなることがある。行の選択は描かれなくなっても外れない（`frame-loop.ts:1623` の `chosenRows` をそのまま渡す）ので、パネルは行の欄を出し続けるが、描いた帯が無いので帯高が無い。

**場面**: `sample-large-erp-program.ja.xml` で縦のズーム 100% のまま「1.5 ステアリングコミッティ」（段 2）を選び、`Alt` ＋ ホイールで縮めていくと、どこかで段 2 の行が絵から消える。パネルにはまだ「最小高さ（ズーム 100% 時）」の欄が在る ——

| | 案 A: 数の代わりに線（`—`） | 案 B: 描いていないことを語で言う（推奨） | 案 C: 読み出しを消す |
|---|---|---|---|
| 見え方 | 「現在の高さ —」／ "current: —" | 「現在の高さ 描いていない」／ "current: not drawn"（語の案。字は利用者が決める） | 欄だけが残る |
| 読む人 | 「高さが無い」のか「測れない」のか分からない | なぜ数が無いかが分かり、拡げれば出ると読める | 「常に示す」が崩れ、欄の形が倍率で変わる |
| 仕様の手間 | `MH-7` に 1 文。記号を辞書に置くかを決める | `MH-7` に 1 文、辞書の部品を 1 つ（`notDrawn`） | `MH-7` に 1 文 |

**推奨: 案 B**。理由: `JDG-715` の「常に示す」を保ちつつ、数が無い理由を言う。欄は同じ形のまま残るので、倍率を戻すと同じ場所に数が戻る。⚠️ 語は体が作れない（`display-words.json` の `$comment`）ので、日本語と英語の字を答えに添えてほしい。

---

## 12. 台帳

| 台帳 | 行 |
|---|---|
| `docs/development-records/rulings.md` | `JDG-710`・`JDG-712` 〜 `JDG-714`・`JDG-716`・`JDG-717` は「指示 —— `change-request/CR-582-*` が当てる」のまま（規則「Ruling state for a drafted CR」）。`JDG-715` は「覆された（一部。`JDG-716`、2026-09-26）」—— 覆したのは説明（ツールチップ）の文だけで、旧の状態は「指示 —— `change-request/CR-582-*` が当てる」。本書とともに `JDG-716`・`JDG-717` の行を足した。`JDG-711` は `DFC-1086` で「適用済」 |
| `docs/development-records/defects.md` | `DFC-1003` —— 本書で `仕様待ち` のまま（調整役が書いた）→ 当てて `実測待ち` → 9 節を押して `実測済`。⚠️ 証拠の欄が引く 2 つの単体試験はもう無い（`e873bcc6`）—— 閉じるときに書き添える。`DFC-1086` は触れない |
| `docs/development-records/pending-decisions.md` | `PND-142`（選んだ行の置き場）は変えない |

---

## 13. 測り方の再現

```
# the tree read: drafted on a worktree at refactor 1781a77e (with DFC-1086 half
# written), re-measured on origin/refactor 39955062 (DFC-1086 landed)
git diff --stat 1781a77e 39955062 -- src tools tests docs/spec   # the 4 DFC-1086 files only
grep -n "^| JDG-71[0-7] " docs/development-records/rulings.md    # 0.1 quotes, one character at a time

# graph (scratch/spec-check/sd-out was printed 2026-09-26 12:49)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py AT-59 PR-20 CM-32
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-042 T-252 LF-3 ST-9
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py AT-59 PR-20 CM-32 FR-042 FR-006 T-016 T-252 DS-1 DS-8 FR-039 S-234 S-236 S-76 ST-9 LF-2 LF-3 T-221 FR-003 FR-038 IN-3 EZ-2 FR-092 UF-78 UF-64 UF-106 FR-016 BC-2 FR-055 FR-004 FR-085
#   -> 30 of 30 seeds, 51 edges, cycles of size 9 and 2

# counts
python .claude/skills/spec-graph-check/md-checks.py .     # tables=189 figures=28 rows=2364 uids=163
grep -c '"seat"' docs/spec/_source/erd.json               # 189
grep -c "^| AT-" docs/spec/_assets/fig-erd-detail.md       # 139
grep -c "^| CM-" docs/spec/_assets/tbl-glossary.md         # 71

# TaskGroup-shaped `height` keys: a `height` key within 6 lines of treeState /
# editGroup / derivedFromTaskUid / parentId, over `git ls-files` (ts json md py mjs js xml),
# excluding dist/ node_modules/ scratch/ previous-project-result/
#   -> 91 files, 298 lines; tests/: 77 files, 83 lines
#   (script kept in the drafting session's scratchpad as scan_height.py; a window
#    count, so re-count to 0 with the same window AND with git grep after the rename)

# the two unit tests DFC-1003 names are gone
git log --oneline -1 --diff-filter=D -- tests/unit/layout-engine.test.ts     # e873bcc6

# provisional ids (2026-09-26)
grep -rhoE "表 T-3[0-9]{2}" docs/spec | sort -u | tail -1                     # 表 T-334
grep -hoE "\bT-3[3-9][0-9]\b" change-request/CR-5[78][0-9]*.md | sort -u        # ... T-335 T-336 T-337
grep -rhoE "\bS-4[0-9]{2}\b" docs/spec | sort -u | tail -1                      # S-418
grep -hoE "\bS-4[0-9]{2}\b" change-request/CR-5[78][0-9]*.md | sort -u | tail -1  # S-439
git grep -n -E "\bDS-1[1-9]\b"          # docs/review/inventory/A04-decided-discarded.md:282-283 only
git grep -n -E "\bMH-[0-9]+\b|\bT-338\b|\bS-44[01]\b|setTaskGroupMinHeight|rowMinHeightField|currentlyHidden"   # nothing (before this file)

# the code facts of section 0.2
sed -n 515,525p src/entity/layout-engine/schedule-layout/schedule-layout.ts
sed -n 60,67p src/entity/layout-engine/screen-regions/screen-regions.ts
sed -n 84,87p src/entity/layout-engine/schedule-layout/shape-cross-sections.ts
sed -n 747,769p src/framework/single-html-shell/frame-loop.ts
sed -n 1032,1050p src/framework/single-html-shell/frame-loop.ts
sed -n 795,808p src/framework/dom-screen-surface/dom-screen-surface.ts
grep -rn "height" src/adapter/document-codec/*.ts | grep -v grs-json-schema        # mspdi-imported-rows.ts:41 only
```
