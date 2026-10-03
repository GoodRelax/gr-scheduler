# CR-652 — コマンドパレットを 5 段に収める —— 1 段は 11 個まで均して折り、いつも出す図形は五角形まで、名称ラベルは 12px

> 起草の状態: 当てた（2026-10-04、枝 `claude/eager-wright-e85cb4`、`197265d9` の上）。起草・仕様・コード・試験を同じ枝で行った —— 調整役の指示（起草と当ての両方、push と合流は調整役）。
> 読んだ木: `197265d9`（`CR-631` の着地 `ab509020` と台帳 `0b6c1804` を含む）。行番号は、すべてこの木で測った。
> ID の帯: 調整役から `CR-652`、`S-488`・`S-489`（`S-487` は `CR-651` へ）、`JDG-1320`〜`JDG-1324`、`DFC-1980`〜`DFC-1984` を受けた。使ったのは `CR-652`・`S-488`・`S-489` だけである。⚠️ `S-488`・`S-489` が木でまだ使われていなかったことは `197265d9` で測った（2026-10-04。`settings.json` の S の最大は `S-486`）—— 並行する `CR-648` の体が最大の次を取れば、調整役が合流で付け替える。
> 閉じるもの: `JDG-1251`・`JDG-1256`（`DFC-1902`）。
> 見本: 修正点のセッションの作業木の `scratch/palette-5-rows-sample-2.html`（`.gitignore` が覆う所にあり、木には無い。参照のみ）。⚠️ 見本の名称ラベルは `JDG-1256` の前の 9px のまま —— 本書の数（5 段・190×178px など）は修正点のセッションが 12px で測った値を `DFC-1902` の行から写した。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-1251` | 「案A + マイルストーンは五画形まで表示して ◇以降は[...]で省略。 説明欄のフォントは9pxにする。」 | 案 A: 1 段 11 個まで、超える群は段の数を最小にして均して折る（E-01、`S-488`）。いつも出す図形は五角形まで（`S-216` を 6 → 3、E-04）。⚠️ 9px は `JDG-1256` が改めた |
| `JDG-1256` | 「下限の 12px にする」 | 名称ラベル（表 T-109 の `IC-54`）の字は `FR-077` の可読の下限 12px（表 T-201 の `S-8`）とする（E-02、`S-489`） |

⚠️ 2 つとも裁定済みであり、本書は問い直さない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-002`（狭い画面に最大の情報量）** —— `FR-053` の RATIONALE が「狭い画面に最大の情報量を出すための判断である」と言うとおり、浮遊するパレットは日程の上にかぶさる。今の 1 群 1 段は、表示の群（14 個、`CR-631` の後）が幅を決めて横に 322px、マイルストーンの一覧を開くと置くの群（20 個）が 1 段になって 453px を占める（`DFC-1902` の測り）。1 段 11 個で均して折ると閉じて 190×178px、開いて 6 段 234px になり、日程を隠す幅が 4 割ほど減る。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— `FR-053` の MUST NOT「大きさを設定値の表に持ってはならない」と、1 段の上限を表 T-206 に置くことが食い違って読める。⇒ MUST NOT のすぐ後に断りを足す: 禁じるのは幅と高さを値で持つことであり、1 段に並べる数は大きさではない（E-01）。幅と高さは今も中身が決める —— 先例は 表 T-017b の `CV-9` の `S-338`（1 段に並べる見本の数）。
- **`R1.3`（同じ数を 2 か所に持たない）** —— 名称ラベルの 12px は 表 T-201 の `S-8` の下限と同じ数である。`S-8` そのものを読ませると、文書の値（12〜40）を上げたときにパレットの字まで動き、`FR-053` の「`S-234` を掛けない」と同じ理由（パレットは読む人の倍率に従わない）に反する ⇒ 別の行 `S-489` に置き、注に「`S-8` の下限と同じ数」と導きを書く（決定 3）。
- **`R1.4`（境界・空の場合）** —— 群の入口がちょうど 11 個なら 1 段、12 個なら 6 ＋ 6。群が 0 個（最小化）は折らない（最小化のあいだ群は出ない —— `FR-053` の既存の MUST）。3 段になるのは 23 個から —— 今の最大は置くの群を開いた 20 個である（決定 1）。
- **`R2.9`（YAGNI）** —— 1 段の上限は群ごとに持たない。1 つの数を全部の群に当てる（決定 2）。
- **`FR-077`（可読の下限）** —— 名称ラベルに `S-235`（0.6667）を掛けると 12px が 8px になり下限を割る ⇒ 掛けないと明記する（E-02、決定 4）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **折り方は式で書く。** 段の数 ＝ ⌈群の入口の数 ÷ `S-488`⌉、1 段の数 ＝ ⌈群の入口の数 ÷ 段の数⌉ とし、前の段から詰めて最後の段だけが少なくなる | 裁定の 3 つの例（13 → 7 ＋ 6、14 → 7 ＋ 7、20 → 10 ＋ 10）と見本の `commands()` の式がこれである。⚠️ 2 段までは段の差が必ず 1 以下だが、3 段以上では最後の段が 2 以上少なくなることがある（25 個 → 9 ＋ 9 ＋ 7）。今の群は 3 段にならない（`R1.4`） | 3 段の群が生まれたとき、最後の段が細る |
| 決定 2 | **上限は 1 つの数（`S-488`）を全部の群に当てる。群ごとの数は持たない** | `JDG-1251` の案 A が「1 段 11 個まで」と 1 つの数で言う | 無い |
| 決定 3 | **名称ラベルの字の大きさは新しい行 `S-489`（12px、保存しない）に持つ。`S-8` は読まない** | ② の `R1.3` | 2 つの行が同じ 12 を持つ —— 注に導きを書き、試験が等しいことを主張する（10 節） |
| 決定 4 | **名称ラベルには `S-235` も表示の倍率（`S-234`）も掛けない** | `JDG-1256` は画面の 12px を言う。`S-235` を掛けると 8px | パレットの中でラベルだけが縮尺の外に立つ |
| 決定 5 | **群の境目の線（`S-143`）は群と群のあいだにだけ引き、折った段のあいだには引かない** | 線は群の境目を示す（`FR-053`）。折った段は同じ群である | 無い |
| 決定 6 | **1 段の上限は保存しない**（表 T-206 の 8 節「保存しないもの」） | `S-338` と同じ —— 見せ方であって日程の内容ではない | 無い |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 |
|---|---|---|
| 1 段の上限と均した折り方、MUST NOT の断り | `docs/spec/01-04-requirements.md` の `FR-053`（新しい段落 1 つ） | E-01 |
| 名称ラベルの字の大きさ | 同 `FR-053` の最後の段落の末尾に 1 文 | E-02 |
| 1 段の上限・ラベルの字の大きさの値 | `docs/spec/_source/settings.json` の 表 T-206 に 2 行（`S-488`・`S-489`）、`S-216` の隣 | E-03 |
| いつも出す図形の数 | 同 `S-216` の既定 6 → 3 と注（「〇 から ☆ まで」→「〇 から五角形まで」） | E-04 |

**数**: 表 0 増。表 T-206 の行 ＋2。要求の UID 0 増。図 0。要求の文: `FR-053` に 1 段落と 1 文。表の升: `S-216` の既定と注の 2 つ。

---

## 2. 新しい識別子

| 識別子 | 何 | 状態 |
|---|---|---|
| `S-488` | コマンドパレットの 1 つの群の、1 段に並べる入口の数の上限 | 調整役が配った。`197265d9` では未使用（2026-10-04） |
| `S-489` | いま構えているものの名称ラベルの字の大きさ | 同上 |

表・接頭辞・要求の新しい名は取らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`197265d9`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `S-216` の `default.num` の `"6"` | `_source/settings.json` | `"3"` | E-04 |
| `S-216` の注の「はじめの 6 つ、すなわち 〇 から ☆ までである」 | 同 | 「はじめの 3 つ、すなわち 〇 から五角形までである」 | E-04 |
| （生成物）`NOT_STORED_COMMAND_PALETTE_SIZES['S-216']` の `6` | `src/adapter/screen-renderer/command-palette.ts:348` | `3`（`npm run gen`） | E-04 |
| （生成物）ヘルプの項目 `IC-50` の図形の並び `IC-27`・`IC-32`・`IC-50` | `src/adapter/screen-renderer/help-roster.json:1025-1029` | `IC-27`・`IC-29`・`IC-50`（`FR-036` の「`S-216` が常に出す図形の最初と最後」、`npm run gen`） | E-04 |

消す要求の文・行は無い。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧が 1 回だけ現れることを数えること（`count == 1`）。⛔ 文は段落の終わりに足す（02 の 4 節）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-053` の「⭐ パレットの大きさは中身に合わせること（MUST）。」で始まる段落の直後（「⭐ `Command Palette` の中身は、表示の倍率…」の段落の前）に、新しい段落を 1 つ挿む。

旧（この段落の終わりの 1 行。1 回だけ現れる）
```text
パレット自身の中に置くと、**非表示にした瞬間に押す面が消えて戻せなくなる。**
```
新（旧の行の後に空行と次の段落）
```text
パレット自身の中に置くと、**非表示にした瞬間に押す面が消えて戻せなくなる。**

⭐ 1 つの群の入口は、1 段に `_assets/tbl-settings.md` の 表 T-206 の `S-488` の数までを並べること（MUST）。  
それを超える群は、段の数を最小にして均して折ること（MUST） —— 段の数は群の入口の数を `S-488` で割って切り上げた数とし、1 段の数は群の入口の数をその段の数で割って切り上げた数とし、前の段から詰めて最後の段だけを少なくする（13 個は 7 と 6、14 個は 7 と 7、20 個は 10 と 10）。  
⚠️ **1 段に並べる数の上限は大きさではない** —— 上の MUST NOT が禁じるのはパレットの幅と高さを値で持つことであり、幅と高さは今も中身（入口の数・語の長さ・画面の言語）が決める。  
⭐ 1 段に並べる数を表に持つ先例は 表 T-017b の `CV-9`（`S-338`）である。  
⛔ 群の境目の線（`S-143`）を、折った段のあいだに引いてはならない（MUST NOT） —— 折った段は同じ群であり、線は群と群のあいだだけに在る。
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`FR-053` の最後の段落（「⭐ `Command Palette` の中身は、表示の倍率…」で始まる 3 行。2 行目が `S-235` を掛けるもの —— 入口の箱と隙間・`S-135a`・`S-143` のまわり —— を数え上げ、名称ラベルの字はそこに無い）の末尾に 1 文を足す。

旧（段落の最後の行。行末に改行の印 `  ` を持たない。1 回だけ現れる）
```text
⚠️ 上の「パレットの大きさは中身に合わせること」は変わらない —— 中身が 2/3 で描かれるので、パレットも中身に合わせて小さくなる。
```
新（旧の行末に `  ` を足し、次の行に 1 文）
```text
⚠️ 上の「パレットの大きさは中身に合わせること」は変わらない —— 中身が 2/3 で描かれるので、パレットも中身に合わせて小さくなる。  
⛔ いま構えているものの名称ラベル（`_assets/tbl-glossary.md` の 表 T-109 の `IC-54`）の字は、同書の 表 T-206 の `S-489` の大きさで描き、`S-235` も `S-234` も掛けてはならない（MUST NOT） —— `S-235` を掛けると `FR-077` の可読の下限（表 T-201 の `S-8`）を割る。
```

<!-- EDIT id=E-03 file=docs/spec/_source/settings.json -->
表 T-206 の `S-216` の行の直後に 2 行を足す（`S-216` と同じ「同上。」の流儀は使わない —— 理由が違う）。

```json
{
 "id": "S-488",
 "value": {
  "ja": "`Command Palette` の 1 つの群の、1 段に並べる入口の数の上限（`FR-053`）"
 },
 "default": {
  "num": "11"
 },
 "note": {
  "ja": "パレットの見せ方であり、日程の内容ではないので保存しない（`S-338` と同じ）。⭐ 超える群は段の数を最小にして均して折る —— 規則は `FR-053` が持つ。⚠️ **大きさではない** —— `FR-053` が設定値の表に持つことを禁じるのはパレットの幅と高さであり、幅と高さは今も中身が決める"
 }
},
{
 "id": "S-489",
 "value": {
  "ja": "`Command Palette` の、いま構えているものの名称ラベル（表 T-109 の `IC-54`）の字の大きさ（`FR-053`）"
 },
 "default": {
  "num": "12",
  "suffix": "px"
 },
 "note": {
  "ja": "保存しない。⭐ 表 T-201 の `S-8` の下限と同じ数である —— `FR-077` の可読の下限であり、これより小さくすると読めない。⛔ **`S-235` も表示の倍率（`S-234`）も掛けない** —— `S-235` を掛けると 8px になり下限を割る（規則は `FR-053`）。⛔ **`S-8` そのものを読まない** —— `S-8` は文書の値で 12〜40 を動くが、パレットは読む人の倍率にも文書の字の大きさにも従わない"
 }
}
```

<!-- EDIT id=E-04 file=docs/spec/_source/settings.json -->
旧（`S-216` の中。2 つとも 1 回だけ現れる）
```text
      "num": "6"
```
（⚠️ `"num": "6"` は `settings.json` に複数ある —— `S-216` の `id` の行から数えて最初の `default` に当てる。置き換える範囲を `"id": "S-216"` から次の `"id"` までに限って `count == 1` を主張する）
```text
はじめの 6 つ、すなわち 〇 から ☆ までである
```
新
```text
      "num": "3"
```
```text
はじめの 3 つ、すなわち 〇 から五角形までである
```

当てた後に打つもの: `npm run gen`（`settings_json_to_md.py` が `_assets/tbl-settings.md` を、`tools/generate_entity_types.py` が `command-palette.ts` の `NOT_STORED_COMMAND_PALETTE_SIZES` と新しい定数（5 節）を、`tools/generate_help_roster.py` が `help-roster.json` を刷る）→ `npm run gen:check` → `rm -rf output` → `GRS_DEV_PORT=5991 bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

### 4.1 重なり

- `CR-631`（着地済み、`ab509020`）は 表 T-109 に `IC-141`（表示）・`IC-142`（揃える）を足した —— 本書の数（閉じて 5 段）はその後の木で測った。⛔ 編集は重ならない（`CR-631` は 表 T-109 と 図 F-019、本書は `FR-053` と 表 T-206 と描画）。
- `DFC-1903`（アイコンの説明）の変更要求は 表 T-028 の `IN-3` と `EZ-2` を書く —— パレットの入口の説明に触れるが、本書の文とは重ならない。
- `197265d9` の `change-request/` のうち、`S-216` または同じ 2 つの段落の文を持つのは `CR-377`・`CR-575` だけで、どちらも着地済みである（`grep -ln "S-216\|中身が 2/3 で描かれるので\|非表示にした瞬間に押す面が消えて" change-request/*.md`）。並行する `CR-653`（アイコンの説明）の草案は `FR-053` と `S-216` を名指さない（その作業木の草案を 2026-10-04 に grep して 0 件）。`CR-650`（ヘッダー）・`CR-651`（遅延診断の疑義）の草案はこの機から読めなかった —— 重なりは調整役が合流で見る。

---

## 5. 継ぎ目

```
SEAM (CR-652)
- settings.json (table T-206, not stored):
  * S-488 = 11: the most entrances one palette group lays in one row.
  * S-489 = 12 px: the font size of the armed-name label (IC-54).
  * S-216: 6 -> 3 (circle, hexagon, pentagon stay out of the fold).
- tools/generate_entity_types.py: two groups, both DRAWN_INSIDE_THE_COMMAND_PALETTE
  and printed into src/framework/dom-screen-surface/dom-screen-surface.ts
  (one constant per consuming subject; UF-65 in command-palette.ts reads
  neither). Both are published (PUBLISHED_READ_BY_SRC) because
  command-palette-drawing.ts reads them:
    NOT_STORED_PALETTE_ROW_CAP:    { 'S-488': 11 }
    NOT_STORED_ARMED_LABEL_SIZES:  { 'S-489': 12 }
  (docs/development-rules/02 section 3.5: a settings row reaches src only
  through a generator group -- gen:check stays green without it.)
- src/framework/dom-screen-surface/command-palette-drawing.ts, pure:
    paletteColumnsOf(entranceCount: number, perRowCap: number): number
      = ceil(entranceCount / ceil(entranceCount / perRowCap)); 0 for 0.
    paletteColumnsStyle(entranceCount: number): string
      = `grid-template-columns:repeat(<paletteColumnsOf(n, S-488)>,auto);`
    armedLabelStyle(): string = `font-size:<S-489>px;` (NOT chromeScaledPx)
  paletteElement appends paletteColumnsStyle(group.commands.length) to
  each group's commands element and armedLabelStyle() to the armed label.
  Rows fill left to right; the S-143 rule stays between groups only.
- src/framework/dom-screen-surface/dom-screen-surface.ts: STYLE.paletteCommands
  becomes `display:grid;justify-content:start;gap:0.25em;` (was flex-wrap
  with no width bound). STYLE.armedText is unchanged -- the font size is
  appended where the label is made, because STYLE is evaluated before the
  generated constants further down the file are initialised.
- src/adapter/screen-renderer/command-palette.ts:340-349 (generated):
  S-216 becomes 3; nothing hand-written changes there.
- src/adapter/screen-renderer/help-roster.json (generated): the IC-50
  help item's glyphs become IC-27, IC-29, IC-50.
```

---

## 6. グラフ（`197265d9`）

- `impact.py FR-053`: 指す先は表 10・行 24、指す側は要求 7 件・参照 31 箇所（`e82dfee4` で測った。当てる木で測り直す）。⭐ 本書は `FR-053` の文を足すだけで、指されている語（`S-143`・`S-216`・`IC-54`・`S-235`）を消さない —— 指す側の文は偽にならない。
- `impact.py S-216`: 指す側は `FR-053` と `FR-036`（「`S-216` が常に出す図形の最初と最後と、`IC-50` の図形を並べる」、`01-04-requirements.md:7951`）。⭐ `FR-036` の文は式だけを持ち、6 も ☆ も持たないので変わらない —— 生成物 `help-roster.json` の図形が ☆ から五角形に変わるだけである。
- 仕様の中で「〇 から ☆ まで」を持つのは `S-216` の注 1 か所だけ（`git grep "☆ まで" docs/spec` で 1 件 —— 刊行物 `tbl-settings.md` を除く）。
- `induced.py FR-053 S-216 S-488 S-489`（当てた木、check.sh の書き出しの後）: 種 4 のうち 4 が解決、辺 6、閉路 1（大きさ 4 —— 4 つ全部）。⭐ 値の行と規則を持つ要求のあいだの閉路であり作法である（02 の 1 節）—— 4 つは本書の 1 回の当てで一度に書いた。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables / figures / uids | 差 0 | |
| rows（表 T-206） | ＋2 | E-03 |
| 設定値の行（`settings.json` の `id`） | ＋2 | E-03 |
| `FR-053` の段落 | ＋1 | E-01（E-02 は既存の段落の末尾） |
| `NOT_STORED_COMMAND_PALETTE_SIZES['S-216']`（生成物） | 6 → 3 | E-04 |
| 閉じたパレットの入口の段（置く 8・揃える 6・表示 14・カーソル 5） | 4 → 5 | 表示 14 → 7 ＋ 7 |
| 開いたパレットの入口の段（置く 20） | 4 → 6 | 置く 20 → 10 ＋ 10 |
| 閉じたパレットの外形 | 322px 幅 → 190×178px | `DFC-1902` の測り（修正点のセッション、`CR-631` の後） |
| 開いたパレットの高さ | → 234px | 同上 |

---

## 8. 波 —— 持ち場で割る

⭐ 調整役の指示で、仕様・生成・コード・試験を 1 つの枝（`claude/eager-wright-e85cb4`、`197265d9` の上）で当てた。試験だけは、仕様だけを読む別の体が書いた（10 節）。

| 持ち場 | 中身 | 誰 |
|---|---|---|
| `docs/spec/01-04-requirements.md` の `FR-053`、`docs/spec/_source/settings.json`、`tools/generate_entity_types.py` の 2 つの群、`docs/development-rules/03-implementation.md` の生成定数の一覧、生成物、`changelog.md`、台帳 | E-01〜E-04、`npm run gen` | 本セッション |
| `src/framework/dom-screen-surface/command-palette-drawing.ts`・`dom-screen-surface.ts` | 5 節の継ぎ目 | 本セッション |
| `tests/unit/cr-652-palette-rows-and-armed-label.test.ts` | 10 節 | 仕様だけを読む別の体 |

- ⚠️ **毎フレームの経路**: `dom-screen-surface.ts` と `command-palette-drawing.ts`（パレットの DOM を作る）。⇒ `docs/development-records/perf-pending.md` に 1 行足した（`PW-2`、78 行目）。計算は群ごとの除算 2 つだけで、要素の数は変わらない（段の割り付けを CSS の grid に任せる）。

---

## 9. 動く試験（今ある試験）

`DFC-1902` の行が挙げたものを当てた木で走らせた —— ⭐ **期待値を書き換えた試験は 0 である。**

| 試験 | 結果 |
|---|---|
| `tests/contract/display-words.contract.test.ts` | 動かない。⚠️ 赤 2 件（`CR-194` の 5 節の 2 つ）は `197265d9` でも赤 —— 本書の前からの失敗 |
| `tests/unit/fr-053-palette-group-boundary.test.ts`・`tests/unit/fr-053-palette-group-rule-isotropic-gap.test.ts` | 緑のまま —— 線は群と群のあいだだけに在る |
| `tests/unit/cr-439-command-palette-armed-and-grab-band.test.ts` | 緑のまま —— 名称ラベルの字の大きさは主張していない（新しい試験が主張する） |
| `tests/contract/fr-053-where-the-band-carries-its-two-marks.test.ts` | 緑のまま |
| `tests/system/measured-sweep.test.ts` | 緑のまま —— Playwright で 27 件すべて緑（`GRS_DEV_PORT=5991`。`vitest` の全数の走行には入らない） |
| `tests/unit/uf-72-screen-part.test.ts`・`tests/contract/dfc-295-entering-the-dual-cursor-drops-the-arm.test.ts` | 緑のまま —— 構えは一覧の開閉によらない |
| ヘルプの名簿を読む試験 | `git grep -n "IC-32" tests` は `uf-72-screen-part.test.ts`（構えの表）だけ —— ヘルプの図形の並びを逐語で持つ試験は無い |

⭐ `vitest` の全数: `197265d9` で 30806 件中 7 件が赤、当てた木で 30823 件。当てた木で新しく赤になった 6 件（`cr-430-table-pe-press-and-drag-effects`・`cr-430-table-pk-the-pointer-shapes`・`cr-441-fr-016-the-marker-drag-shows-the-actual-end`・`uf-47-48-history-bytes`）は、その 4 ファイルだけを走らせると 177 件すべて緑 —— 全数の走行の重さで落ちる、本書に関わらない赤である（パレットに触れる試験は無い）。消えた赤 2 件（`cr-429-the-two-schemas`・`mspdi-xsd-local-only`）は、XSD を作業木へ写したことによる。

---

## 10. 新しい試験（仕様だけを読む別の体）

`tests/unit/cr-652-palette-rows-and-armed-label.test.ts` —— 17 件、すべて緑。体は `docs/spec` と 5 節の継ぎ目の名だけを受け取った。

- `paletteColumnsOf`: 0 → 0、1〜11 → n、12 → 6、13 → 7、14 → 7、20 → 10、22 → 11、23 → 8（3 段）。上限は 表 T-206 から読んだ `S-488` で、生成された定数と等しいことも主張する。
- `paletteElement`: 14・20・8 個の群が 7・10・8 列、群を隔てる線は 2 本だけ。23 個の群 1 つは 8 列で線 0。
- 名称ラベルの字はちょうど `S-489` px で、`S-489` × `S-235` ではない。`S-489` は 表 T-201 の `S-8` の下限と等しい（決定 3 の代償の見張り）。
- `S-216` は 3 で、生成された定数と等しい。

⭐ **壊して赤になることを確かめた**（体が `command-palette-drawing.ts` を一時的に書き換え、元のバイトへ戻した —— SHA-256 一致）: `paletteColumnsOf` が `entranceCount` を返す → 5 件が赤。`armedLabelStyle` が空を返す → 2 件が赤。`armedLabelStyle` が `S-235` を掛けた 8.0004px を返す → 同じ 2 件が赤。
⚠️ 「線は群の数 − 1」は、どの壊し方でも赤にならなかった —— 折った段のあいだに線を足す壊し方を作らなかったためである。

---

## 11. ⛔ この変更でやらないこと ・ 触れ合うもの

- ラベルを最後の段の右へ寄せる（見本の案 B）は採らない —— `JDG-1251` は案 A。
- 1 段 7 個（案 C）は採らない。
- `FR-077` の下限（`S-8`）そのものは変えない。
- 群の並び・群の分け方（表 T-109 の `群` の欄）は変えない。

---

## 12. 利用者に問うこと

無い（`JDG-1251`・`JDG-1256` で裁定済み）。

---

## 13. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1251`・`JDG-1256` | 本書の裁定 | 状態を「適用済 —— 本書が当てた」にし、着地先に `FR-053`・`S-216`・`S-488`・`S-489` を名指した |
| `DFC-1902` | パレットが横に長い | `仕様待ち` → `実測待ち`（仕様・コード・試験が着地し、自動試験は緑。出荷ビルドでの実測はまだ） |
| `perf-pending.md` の 78 | 毎フレームの経路 | 1 行足した |
| `comment-rules-tests-baseline.txt` | 試験の注の密度 | 1720 → 1711 bp に下げた（新しい試験ファイルが注の少ない 17 件を足したため。下げるのは `JDG-520` で調整役の許し無しに行える） |

新しい裁定は無い —— `JDG-1320`〜`JDG-1324`・`DFC-1980`〜`DFC-1984` の帯は使っていない。

---

## 14. 測り方の再現

```
# the tree: 197265d9.

# group sizes (section 7): count the rows of table T-109 whose 2nd column is
# `Command Palette`, by the 3rd column (group), excluding the group "—"
# (IC-53, IC-75, IC-54). On ab509020: 置く 20, 揃える 6, 表示 14, カーソル 5.
# Closed: 置く = 4 bar shapes + S-216 milestone shapes + IC-50.

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-053
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-216

# the outer sizes (190x178 px closed, 234 px open) are the triage session's
# measurement recorded in DFC-1902 (docs/development-records/defects.md),
# read directly, not re-measured here.
```
