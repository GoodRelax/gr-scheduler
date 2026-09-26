# 重複した責務の調査（2026-09-26）

機械で読める正本は `docs/review/duplicate-survey-2026-09-26/duplicated-responsibility-groups-d65097b9.json`（生成は同じフォルダの `build_duplicated_responsibility_groups.py`）。本書の数はすべて、そこから数え直したもの。

## 1. 目的と範囲

| 項目 | 値 |
|---|---|
| 調べた木 | refactor `d65097b9`（本調査の worktree） |
| 対象 | `src/` の `.ts` 160 本、関数に当たる単位 1872 |
| 手の出し方 | 読むだけ。`src/`・`tests/`・基準線・開発記録は変えていない |
| 成果 | 群 174 行（親の群 136）、写しの再現スクリプト（`repro/`） |

**なぜ CR-578 / 579 / 580 の前か。** 3 つの CR は、大きい 3 本を割る —— `src/framework/single-html-shell/frame-loop.ts`（2767 行、CR-578）、`src/adapter/input-command-translator/input-command-translator.ts`（1381 行、CR-579）、`src/adapter/document-codec/mspdi-codec.ts`（1324 行、CR-580）。割る前に「同じ責務をよそでもう一度書いている所」を数えておかないと、割った先へ写しをそのまま運ぶことになる。どちらを家にするかを、割る側がその場で決めることにもなる。家を先に決めておけば、割る CR は写しを消す側に回れる。

**言葉。** 「写し」は、同じ事実を二か所以上で計算しているものを指す。判定は 3 つ。

- `ACCIDENTAL` —— 書いた理由がどこにもない写し
- `INTENDED` —— 写す理由がコードの注記か裁定に書いてある
- `NOT-A-DUPLICATE` —— 似ているが、している仕事が違う

最終の判定は、反証役が覆した行は反証役の判定、ほかは判定役の判定である。

## 2. 方法と数（順番に）

方法は下の順に回した。「生の候補」は各方法の出力そのもの。「足した群」は判定の前の候補群の数（既知と重ならないもの）。右の 3 列は判定の後の数で、`duplicated-responsibility-groups-d65097b9.json` から親の群を単位に数え直した。

| 順 | 方法 | 生の候補 | 足した群（判定前） | 既知の割合 | 判定後: 最初に見つけた親群 | うち ACCIDENTAL | うち届く食い違いを持つ |
|---|---|---|---|---|---|---|---|
| 1 | a 名前 | 名前の組 82 | 31 | —（最初） | 31 | 25 | 6 |
| 2 | b 本文の似かた | 似た本文の組 161 | +10 | 50%（10 / 20） | 10 | 10 | 4 |
| 3 | b45 check 45 の字面 | ファイルをまたぐ群 356（床 10） | +7 | 70%（16 / 23） | 7 | 6 | 0 |
| 4 | c 同じ仕様 id | 2 本以上に引かれた仕様 id 206 | +9 | 31%（4 / 13） | 9 | 5 | 2 |
| 5 | d 同じ S 行 | 2 本以上で読まれる S 行 83 | +4 | 56%（5 / 9） | 4 | 3 | 0 |
| 6 | e 算術の grep | grep（数を残していない） | +2 | 60%（3 / 5） | 2 | 1 | 1 |
| 7 | s CR-579 の種 | 種 5 | +1 | 80%（4 / 5） | 1 | 1 | 0 |
| 8 | E 言い換えの読み | 開いた組 約 82 | +37（拡張込み 43） | 17%（7 / 42） | 35 | 35 | 10 |
| 9 | G 局所名をならした字面 | 情報量のある箇所 405（床 12） | +16 | 74%（45 / 61） | 16 | 15 | 4 |
| 10 | H 手書きの値の集合 | ファイルをまたぐ一致 242（集合 764） | +6 | 57%（8 / 14） | 6 | 4 | 0 |
| 11 | I 4 本の行単位の読み | 式 約 143、写し 81 組 | +14 | 80%（55 / 69） | 14 | 11 | 3 |

- `b45` は check 45 を床 10 で回したもの（619 群、ファイルをまたぐのは 356）。
- `E` の 43 は拡張 6 を含む。拡張 6 は E06・E15・E16・E19・E35・E41。判定の後、さらに E26 が G62x、E31 が G54x と同じ組だと分かった。E01・E14・E32 は判定役が G03・N2・N1 として先に見ていたが、どの方法の候補にも無かったので E の行として残した。
- `G` の既知の割合 27% は、情報量のある 405 箇所のうち既知か拡張だった 110 箇所の割合。群で数えると、既知 107 群（groups.md の 64 と E の 43）のうち 45 群を拾い直した（groups.md 29/64、E 16/43）。
- `I` は 4 本（計 6372 行）を 1 行ずつ読んだ。見つけた写し 81 組のうち 62 組（77%）が既知。新しい群の密度は 100 行あたり 0.22 で、ファイルごとに次のとおり。
  - `frame-loop.ts` 0.25
  - `input-command-translator.ts` 0.14
  - `mspdi-codec.ts` 0.00
  - `properties-panel.ts` 0.56

### 頭打ちか

**新しい群は減っている。** 機械で探す方法（a〜s）は、a の 31 の後、10・7・9・4・2・1 と細った。読む方法に替えると E で 37 と跳ねた。その後は G 16・H 6・I 14 と、再び細っている。

**既知の割合は上がっている。**

- **写しの単位で数えると。** G は情報量のある 405 箇所のうち 110 箇所（27%）が既知だった。I は 81 組のうち 62 組（77%）が既知だった。
- **親群の単位で数えると（上の表）。** 言い換えを探した E で一度 17% に下がり、G 74%・I 80% と高止まりしている。

どちらの数え方でも、後の方法ほど、前の方法が見つけたものを拾い直している。

**残りの見積もり。** 二つの方法を「捕獲」と「再捕獲」に見立てる（Lincoln-Petersen、N̂ = n1 × n2 / m）。

| 組 | n1 | n2 | m（重なり） | N̂ | これまでに見つけた数 | 残り |
|---|---|---|---|---|---|---|
| groups.md の外: E × G | E 43 | G が groups.md の外で当てた数 32（E の 16 + 新 16） | 16 | 43 × 32 / 16 = 86 | 79（E 43 + G 16 + H 6 + I 14） | 約 7 |
| 全体: (groups.md ∪ E) × G | 107 | 61（既知 45 + 新 16） | 45 | 107 × 61 / 45 ≈ 145 | 143（107 + 16 + 6 + 14） | 約 2 |
| 割る 4 本の中: 先の方法 × I | 53（I より前の親群で、4 本のどれかに写しを持つもの） | 66（そのうち I が拾い直した 52 + 新 14） | 52 | 53 × 66 / 52 ≈ 67 | 67（53 + 14） | ほぼ 0 |

**この見積もりが破る前提。** Lincoln-Petersen は、二つの捕獲が独立で、どの群も同じ確率で捕まることを前提にする。ここでは両方が破れている。

- a・b・b45・G はどれも字面で探す。捕まりやすい群（字面の写し）が重なるので、m が大きく出て N̂ は小さく出る。
- I は ±15 行以内の既知を最初から外した。しかも既知の厚い 4 本だけを読んだので、既知を拾い直す率が作りとして高い（52/53）。
- 言い換えの写し（名前も字面も違う）は、E と I にしか捕まらない。

したがって 3 つとも **下限** であり、「残りは一桁」を超えることはあっても下回ることはない。

**手の薄い所。** 率直に言えば、次の二つが最も手薄である。

- **`src/adapter/screen-renderer/properties-panel.ts` の規則。** I の密度が最も高く（100 行あたり 0.56）、新しい群 5 つ（I10〜I14）のうち 2 つに、届く食い違い（I12）か仕様の穴（I10）があった。同じ部品の `row-title-panel.ts`・`open-modals.ts`・`command-palette.ts`・`tooltips.ts` は行単位では読んでいない。
- **シェルのセッションの読み手。** `frame-loop.ts` の読み手の写し（G53x、I03〜I05）がそれに当たる。同じ部品の `document-file-flow.ts`・`copy-and-paste.ts`・`view-place.ts`・`held-press-preview.ts` は行単位では読んでいない。

次に回すなら、この二つの残りを I と同じやり方で読むのが最も得が大きい。

## 3. 群の表

**全体の数。**

| 項目 | 数 |
|---|---|
| 行 | 174（親の群 136） |
| ACCIDENTAL | 128 |
| INTENDED | 2 |
| NOT-A-DUPLICATE | 44 |
| 割る CR ごと | CR-578: 34 行（ACCIDENTAL 24）、CR-579: 30 行（ACCIDENTAL 24）、CR-580: 10 行（ACCIDENTAL 8）、none: 107 行（ACCIDENTAL 78） |

割る CR は、写しのどれかが割るファイルにある行に付けた。2 つの CR にまたがる行は両方の表に出る。

**表の読み方。**

- **判定の欄。** `（t064）` は、家が部品の外へ名前を出さねばならず、その名前がまだ表 T-064 に無いことを示す。そのまま `export` すると check 26b が赤くなる（`.claude/skills/spec-graph-check/check-published-members.py:386-394`）。`crossing-names-baseline.txt` に行を足して緑にすることは禁じられている。`（export）` は、同じ部品の中で `export` を足すだけで済むことを示す。
- **食い違いの欄。** 「違う」とある行は §4 に入力と答えを載せた。
- **ここに載せる行。** 下の表は ACCIDENTAL の行だけを載せる。INTENDED は表の後に、NOT-A-DUPLICATE は数だけを載せる。

### 3.1 CR-578（`frame-loop.ts`）

| id | 写し（file:line） | 判定 | 根拠 | 食い違い | 台帳 |
|---|---|---|---|---|---|
| G47 | `frame-loop.ts:1865`、`frame-loop.ts:1999`、`view-place.ts:83` | ACCIDENTAL | 同じ生成定数（edit-document.ts:298）を 3 か所で組み直す（反証で覆った） | 同じ | — |
| G48 | `input-command-translator.ts:1326`、`frame-loop.ts:1080` | ACCIDENTAL（t064） | screen-state.ts:29-30 の TRAP が正当化するのは持ち物の違いだけ。6 つの写像（input-command-translator.ts:1328-1335 == frame-loop.ts:1087-1092）は理由なし（反証で覆った） | 同じ | DFC-532、DFC-537 |
| G28 | `screen-renderer.ts:511`、`frame-loop.ts:845`、`screen-values.ts:23` | ACCIDENTAL（t064） | frame-loop.ts:843 の WHY は既定値の説明。型（screen-values.ts:23）も公開できる（反証で型の行も覆った） | 同じ | — |
| G29x | `open-modals.ts:41`、`field-editing.ts:312`、`frame-loop.ts:370`、`screen-values.ts:915` | ACCIDENTAL（t064） | 'U-60' が 4 か所。どこにも理由なし | 同じ | DFC-703 |
| G32a | `screen-renderer.ts:479`、`frame-loop.ts:723`、`row-title-panel.ts:143`、`input-command-translator.ts:124` ほか 2 | ACCIDENTAL | frame-loop.ts:709 は既に `ScreenViewReadings` を使う。型だけの写し | 同じ | — |
| G44 | `frame-loop.ts:1246`、`frame-loop.ts:1254`、`frame-loop.ts:1262`、`frame-loop.ts:1270` ほか 2 | ACCIDENTAL（t064） | frame-loop.ts:1245-1275 の 4 つの守りに注記なし | 同じ | — |
| G53a | `frame-loop.ts:1208`、`file-flow-values.ts:681` | ACCIDENTAL（t064） | file-flow-values.ts:681 は private。公開入口が出さない | 同じ | — |
| G53b | `frame-loop.ts:865`、`notice-values.ts:221`、`notify-change-watchers.ts:65`、`agent-api-members.ts:382` ほか 1 | ACCIDENTAL | 1 つの事実を 2 か所に持つ（AG-11 / WS-2）。agent-api-members.ts:382 と :404 が別の方を読む | 違う・今は届かない（§4） | DFC-537 |
| G53x | `frame-loop.ts:831`、`frame-loop.ts:837`、`frame-loop.ts:850`、`frame-loop.ts:858` ほか 17 | ACCIDENTAL（t064） | advance-screen-session.ts が読み手を 1 つも公開しない（:65-245） | 同じ | — |
| E03 | `frame-loop.ts:1295`、`dialogue-field-drawing.ts:16` | ACCIDENTAL（t064） | 01-04-requirements.md:5777 は AT-127 / AT-129 を同じ綴りで求める。写しの注記なし | 違う・今は届かない（§4） | — |
| E14 | `frame-loop.ts:1031`、`schedule-grid.ts:227` | ACCIDENTAL（t064） | 同じ切り取り。判定 A の N2 | 同じ | DFC-991、DFC-539 |
| E17 | `frame-loop.ts:1930`、`frame-loop.ts:1963`、`pointer-shape.ts:331` | ACCIDENTAL | PTD-2（01-04-requirements.md:3310）は Dual Cursor の間の当たり判定をしないと言う。写しの理由なし | 違う・届く（§4） | DFC-872、PND-391 |
| E18 | `input-command-translator.ts:884`、`frame-loop.ts:1953` | ACCIDENTAL | PE-0 が 2 層に割れている。JDG-277 / JDG-278（rulings.md:391-392） | 違う・今は届かない（§4） | — |
| E39 | `input-command-translator.ts:386`、`input-command-translator.ts:665`、`frame-loop.ts:329`、`frame-loop.ts:343` ほか 3 | ACCIDENTAL（t064） | KEY / ENTRY は translator の入口が export するが PI-18 に無い。ScreenRenderer は translator を読めない（LR-3） | 同じ | — |
| E43 | `frame-loop.ts:668`、`open-modals.ts:34`、`screen-state-input.ts:27`、`dom-screen-surface.ts:71` | ACCIDENTAL（t064） | JF-1 は .json を読ませないが、定数の export は合法。TRAP（frame-loop.ts:666 ほか）は「同じに綴る」だけ | 同じ | DFC-703 |
| H08 | `document-file-flow.ts:771`、`frame-loop.ts:2258` | ACCIDENTAL（export） | 同じ部品の中。frame-loop.ts:2256 の TRAP は PNG の道の説明 | 同じ | — |
| H20 | `import-document.ts:26`、`file-flow-values.ts:14`、`frame-loop.ts:674` | ACCIDENTAL（t064） | file-flow-values.ts:12 の WHY は宣言されていない辺を挙げるだけ | 同じ | — |
| H22 | `frame-loop.ts:440`、`display-words.json:2701` | ACCIDENTAL（t064） | NoticeReason が表の部分集合であることを誰も確かめない | 同じ | — |
| I01 | `frame-loop.ts:1629`、`frame-loop.ts:2222`、`frame-loop.ts:2229`、`edit-history.ts:31` ほか 1 | ACCIDENTAL（t064） | frame-loop が履歴の長さを自分で読む。`stepCount`（edit-history.ts:31）は呼び手 0 | 同じ | — |
| I02 | `frame-loop.ts:1523`、`frame-loop.ts:1777`、`copy-and-paste.ts:74` | ACCIDENTAL | TRAP（frame-loop.ts:1531、:1789）は入力の違いの説明で、写した流れの理由ではない | 未証明 | PND-254 |
| I03 | `frame-loop.ts:837`、`tooltips.ts:194` | ACCIDENTAL（t064） | adapter は placingDate2、シェルは placingDate1 を調べる（裏返し）。G53x と重なる | 同じ | — |
| I05 | `frame-loop.ts:949`、`properties-panel.ts:867` | ACCIDENTAL（t064） | 同じ述語。注記なし | 同じ | — |
| I06 | `screen-regions.ts:165`、`frame-loop.ts:1867`、`edit-document-settings.ts:109` | ACCIDENTAL | edit-document-settings.ts:101 の WHY「床を足すと写しを持つ」は誤り: `drawnSettingsOf` は PI-35 で辺もある | 違う・届く（§4） | PND-254 |
| I07 | `frame-loop.ts:2532`、`frame-loop.ts:2662`、`frame-loop.ts:2544`、`frame-loop.ts:2654` | ACCIDENTAL | frame-loop.ts:2652 の TRAP「歩調を合わせる」は認めるだけ | 同じ | — |

### 3.2 CR-579（`input-command-translator.ts`）

| id | 写し（file:line） | 判定 | 根拠 | 食い違い | 台帳 |
|---|---|---|---|---|---|
| G01 | `calendar-day.ts:45`、`calendar-day.ts:101`、`input-command-translator.ts:417`、`input-command-translator.ts:419` ほか 5 | ACCIDENTAL（t064） | 注記は 0-99 年の TRAP（calendar-day.ts:42-43）だけ。`serial`・`dayFromSerial` は schedule.ts:40-46 が公開しない | 同じ | — |
| G02 | `input-command-translator.ts:1293`、`input-command-translator.ts:1285`、`calendar-day.ts:36`、`calendar-day.ts:51` ほか 1 | ACCIDENTAL | input-command-translator.ts:1292-1295 に注記なし。`compareDays` は公開済み（schedule.ts:40-46） | 違う・届く（§4） | — |
| G04 | `input-command-translator.ts:1260`、`schedule-invariants.ts:132`、`task-group-order.ts:16`、`drawn-rows.ts:36` ほか 2 | ACCIDENTAL（t064） | TRAP（input-command-translator.ts:1257、task-group-order.ts:14）は「3 つ一緒に直す」だけで理由なし | 違う・届く（§4） | PND-420、DFC-262 |
| G05 | `input-command-translator.ts:1167`、`edit-task-group.ts:81`、`row-title-panel.ts:103`、`drawn-rows.ts:21` | ACCIDENTAL（t064） | input-command-translator.ts:1167-1177 と edit-task-group.ts:81-91 が字面まで同じ。注記なし | 違う・届く（§4） | DFC-922 |
| G06 | `input-command-translator.ts:1182`、`row-grab.ts:71`、`row-grab.ts:138` | ACCIDENTAL | `new Map(rows.map(...))` の同じ一行。意味の違いを誰も挙げない（反証で覆った） | 同じ | — |
| G09 | `input-command-translator.ts:448`、`input-command-translator.ts:557`、`zoom-and-fit.ts:333`、`row-scroll.ts:26` ほか 1 | ACCIDENTAL（t064） | TRAP 3 つ（row-scroll.ts:22-23、zoom-and-fit.ts:322、input-command-translator.ts:556）が写しを認めるが理由なし | 違う・届く（§4） | — |
| G11 | `input-command-translator.ts:436`、`row-grab.ts:257` | ACCIDENTAL | input-command-translator.ts:434 の TRAP は規則を述べるだけ。斜めの扱い（row-grab.ts:264）だけが意図 | 違う・今は届かない（§4） | DFC-688、DFC-873 |
| G37a | `input-command-translator.ts:660`、`edit-resource.ts:35`、`task-create.ts:41` | ACCIDENTAL（t064） | input-command-translator.ts:657 の TRAP は mark+1 の説明。edit-document.ts は公開しない | 同じ | — |
| G48 | `input-command-translator.ts:1326`、`frame-loop.ts:1080` | ACCIDENTAL（t064） | screen-state.ts:29-30 の TRAP が正当化するのは持ち物の違いだけ。6 つの写像（input-command-translator.ts:1328-1335 == frame-loop.ts:1087-1092）は理由なし（反証で覆った） | 同じ | DFC-532、DFC-537 |
| G65 | `input-command-translator.ts:618`、`input-command-translator.ts:627`、`input-command-translator.ts:633`、`input-command-translator.ts:652` ほか 4 | ACCIDENTAL | input-command-translator.ts:618-655 に注記なし。`COLUMN_SHAPES` は既に越境（基準線） | 同じ | — |
| G66 | `input-command-translator.ts:785`、`input-command-translator.ts:811`、`command-palette.ts:250` | ACCIDENTAL（t064） | input-command-translator.ts:784 の TRAP は綴り間違いの危険だけ。JF-1 が icon-roster.json を読ませない | 同じ | DFC-95 |
| G32a | `screen-renderer.ts:479`、`frame-loop.ts:723`、`row-title-panel.ts:143`、`input-command-translator.ts:124` ほか 2 | ACCIDENTAL | frame-loop.ts:709 は既に `ScreenViewReadings` を使う。型だけの写し | 同じ | — |
| E01 | `input-command-translator.ts:517`、`input-command-translator.ts:500`、`fit-zoom.ts:146` | ACCIDENTAL（t064） | どちらにも注記なし（判定 A が G03 の余りとして見ていた） | 違う・今は届かない（§4） | — |
| E18 | `input-command-translator.ts:884`、`frame-loop.ts:1953` | ACCIDENTAL | PE-0 が 2 層に割れている。JDG-277 / JDG-278（rulings.md:391-392） | 違う・今は届かない（§4） | — |
| E32 | `command-palette.ts:81`、`input-command-translator.ts:1210` | ACCIDENTAL（t064） | 同じ結合。入力はどちらも `drawnRowBoxesOf`（frame-loop.ts:761、:2011）。判定 A の N1 | 同じ | DFC-281 |
| E33 | `open-modals.ts:219`、`input-command-translator.ts:1156`、`deletion-confirmations.ts:64` | ACCIDENTAL（t064） | CD-5 の述語が 3 回。理由なし | 同じ | DFC-539、DFC-540 |
| E38 | `input-command-translator.ts:735`、`input-command-translator.ts:760`、`command-palette.ts:97`、`command-palette.ts:115` ほか 2 | ACCIDENTAL（t064） | command-palette.ts:94-95 の TRAP「合っているかを誰も確かめない」 | 同じ | DFC-128、DFC-147、DFC-100 |
| E39 | `input-command-translator.ts:386`、`input-command-translator.ts:665`、`frame-loop.ts:329`、`frame-loop.ts:343` ほか 3 | ACCIDENTAL（t064） | KEY / ENTRY は translator の入口が export するが PI-18 に無い。ScreenRenderer は translator を読めない（LR-3） | 同じ | — |
| E42 | `document-settings.ts:435`、`input-command-translator.ts:774`、`edit-calendar.ts:27`、`working-calendar.ts:80` ほか 3 | ACCIDENTAL | 生成器が和型しか出さない（document-settings.ts:42、:57）。値の列は内側から読めない schema の enum だけ | 同じ | JDG-152 |
| H11 | `input-command-translator.ts:1017`、`shortcut-keys.ts:93` | ACCIDENTAL | 同じ部品の中。行の側は既に `rowZoomAnswer` がある | 同じ | — |
| H13 | `input-command-translator.ts:994`、`row-grab.ts:335` | ACCIDENTAL | 同じ部品の中（些細） | 同じ | — |
| H19 | `input-command-translator.ts:120`、`gesture-values.ts:10` | ACCIDENTAL（t064） | gesture-values.ts:9 の WHY は use-case 側の写しを正当化する。adapter 側が偶然の写し | 同じ | — |
| I08 | `shortcut-keys.ts:44`、`dom-input-source.ts:116`、`screen-state-input.ts:126`、`input-command-translator.ts:412` | ACCIDENTAL（t064） | IN-5a（01-04-requirements.md:6916）が求めるのは 2 本の道で、キーの集合が 2 つあることではない | 違う・届く（§4） | — |
| I09 | `input-command-translator.ts:1236`、`item-grab.ts:309` | ACCIDENTAL | 字面の同じ塊。同じ部品の中 | 同じ | DFC-664 |

### 3.3 CR-580（`mspdi-codec.ts`）

| id | 写し（file:line） | 判定 | 根拠 | 食い違い | 台帳 |
|---|---|---|---|---|---|
| G02 | `input-command-translator.ts:1293`、`input-command-translator.ts:1285`、`calendar-day.ts:36`、`calendar-day.ts:51` ほか 1 | ACCIDENTAL | input-command-translator.ts:1292-1295 に注記なし。`compareDays` は公開済み（schedule.ts:40-46） | 違う・届く（§4） | — |
| G04 | `input-command-translator.ts:1260`、`schedule-invariants.ts:132`、`task-group-order.ts:16`、`drawn-rows.ts:36` ほか 2 | ACCIDENTAL（t064） | TRAP（input-command-translator.ts:1257、task-group-order.ts:14）は「3 つ一緒に直す」だけで理由なし | 違う・届く（§4） | PND-420、DFC-262 |
| G37b | `import-document.ts:504`、`mspdi-codec.ts:355` | ACCIDENTAL（t064） | import-document.ts:502 の WHY は両方に当てはまる。写しの理由なし | 違う・届く（§4） | — |
| G33 | `mspdi-codec.ts:163`、`mspdi-codec.ts:170`、`task-plan-actual.ts:277`、`task-plan-actual.ts:270` | ACCIDENTAL（t064） | mspdi-codec.ts:163-174 と task-plan-actual.ts:270-280 が文字単位で同じ。注記は EX-9 等の参照だけ | 同じ | PND-163、DFC-666 |
| G34 | `mspdi-codec.ts:1157`、`mspdi-codec.ts:1152`、`task-plan-actual.ts:223`、`task-plan-actual.ts:235` ほか 1 | ACCIDENTAL（t064） | export と編集の分担は意図（mspdi-codec.ts:1155、task-plan-actual.ts:232-233）。核（'2' と Duration の式）は理由なし | 違う・届く（§4） | DFC-666、DFC-665、DFC-553 |
| E04 | `percent-complete.ts:36`、`properties-panel.ts:259`、`mspdi-codec.ts:1190`、`schedule-invariants.ts:741` ほか 1 | ACCIDENTAL（t064） | 注記なし。例外を受けるのは mspdi-codec.ts:1197-1206 だけ | 違う・届く（§4） | DFC-682 |
| E07 | `mspdi-codec.ts:1060`、`mspdi-imported-rows.ts:24`、`mspdi-imported-rows.ts:60` | ACCIDENTAL（t064） | 注記なし。G36 の兄弟 | 違う・届く（§4） | DFC-922 |
| H07 | `json-codec.ts:284`、`mspdi-codec.ts:621`、`field-commit.ts:92` | ACCIDENTAL | GRS JSON を丸ごと拒む理由の注記なし。FR-011（01-04-requirements.md:2759）は MSPDI と同じ読みを求める | 違う・届く（§4） | PND-499 |

### 3.4 割る 3 本の外（none）

| id | 写し（file:line） | 判定 | 根拠 | 食い違い | 台帳 |
|---|---|---|---|---|---|
| G07 | `deletion-confirmations.ts:48`、`task-group-order.ts:57`、`edit-task-group.ts:267`、`item-grab.ts:542` ほか 1 | ACCIDENTAL（t064） | item-grab.ts:538-539 の TRAP は「レイアウトでなく文書を読む」理由で、写しの理由ではない | 違う・届く（§4） | DFC-922 |
| G08 | `row-tree-entrances.ts:150`、`row-tree-entrances.ts:155`、`row-tree-entrances.ts:161`、`row-title-panel.ts:200` ほか 2 | ACCIDENTAL（t064） | TRAP（row-tree-entrances.ts:159、row-title-panel.ts:206-207）は「一緒に直す」だけ | 違う・届く（§4） | DFC-1000、JDG-591 |
| G10c | `zoom-and-fit.ts:351`、`fit-zoom.ts:48`、`edit-document-settings.ts:151` | ACCIDENTAL（t064） | 「有限でない境は境なし」の規則を持つのは fit-zoom.ts:48 だけ（DFC-971） | 違う・今は届かない（§4） | DFC-971 |
| G37d | `task-paste.ts:39`、`edit-task-group.ts:288` | ACCIDENTAL | edit-task-group.ts:290 の TRAP「並べてから採番」を task-paste.ts:40 が守らない | 違う・届く（§4） | — |
| G43 | `shortcut-keys.ts:37`、`wheel-input.ts:66` | ACCIDENTAL | 同じ 5 つの組を同じ `isCombo` 引数で読む（反証で覆った） | 同じ | — |
| G12 | `row-title-panel.ts:40`、`row-title-panel.ts:45`、`row-title-panel.ts:52`、`comment-box.ts:20` ほか 4 | ACCIDENTAL | `labelUnits` は既に PI-5（05-07-design.md:593）。TRAP は「一緒に直す」だけ | 同じ | CR-554 |
| G13a | `image-exporter.ts:80`、`svg-renderer.ts:59` | ACCIDENTAL（t064） | svg-renderer.ts:59 は export 済みだが PI-19 に無い | 同じ | — |
| G14a | `image-exporter.ts:69`、`svg-renderer.ts:69` | ACCIDENTAL（t064） | image-exporter.ts:67 の TRAP は「svg-renderer.ts と同じく丸める」だけ | 同じ | — |
| G15 | `tooltips.ts:98`、`screen-regions.ts:52` | ACCIDENTAL（t064） | tooltips.ts:96 の TRAP は「元が private だから」だけ | 同じ | — |
| G15x | `schedule-overlays.ts:169`、`item-hit-area.ts:77`、`tooltips.ts:98` | ACCIDENTAL（t064） | schedule-overlays.ts:169-173 は閉区間 `<=`、元は半開区間。理由の注記なし | 違う・届く（§4） | — |
| G16 | `display-scale-steps.ts:64`、`item-hit-area.ts:97`、`schedule-task-figures.ts:413`、`zoom-and-fit.ts:311` ほか 1 | ACCIDENTAL（t064） | どちらにも注記なし（些細） | 同じ | — |
| G17 | `svg-renderer.ts:119`、`dependency-route.ts:205` | ACCIDENTAL | svg-renderer.ts:464 の TRAP は印の出し分けの理由で、太さを計算し直す理由ではない。PI-6 が太さを既に公開（反証で覆った） | 同じ | DFC-640 |
| G18a | `image-exporter.ts:117`、`dom-screen-surface.ts:137`、`app-header-drawing.ts:23` | ACCIDENTAL（t064） | image-exporter.ts:117-131 に理由なし。framework の写しは adapter から読めない（LR-1）ので内側へ移す | 同じ | — |
| G18c | `image-exporter.ts:110`、`svg-renderer.ts:396` | ACCIDENTAL（t064） | image-exporter.ts:110 の font-family 文字列が `typefaceAttribute` を打ち直す | 同じ | — |
| G19 | `schedule-grid.ts:253`、`svg-renderer.ts:641` | ACCIDENTAL | 同じ部品（SvgRenderer）の中。注記なし | 同じ | — |
| G20 | `screen-regions.ts:85`、`screen-regions.ts:90`、`screen-regions.ts:101`、`dom-screen-surface.ts:159` ほか 2 | ACCIDENTAL（t064） | TRAP（screen-regions.ts:83、dom-screen-surface.ts:139）は S-243 と S-141 の違いの説明で、写しの理由ではない | 同じ | — |
| G21 | `task-figures.ts:472`、`schedule-layout.ts:282`、`task-figures.ts:499`、`shape-cross-sections.ts:27` ほか 4 | ACCIDENTAL（t064） | task-figures.ts:471 の TRAP は「一緒に直す」だけ。repeated-expressions-baseline.txt が T-064 の行待ちと記録 | 同じ | DFC-602 |
| G22b | `screen-state-input.ts:112`、`schedule-layout.ts:220`、`edit-task.ts:170` | ACCIDENTAL（t064） | AT-100（fig-erd-detail.md:403）。shapeKind と milestone を結ぶ不変条件がない | 違う・今は届かない（§4） | — |
| G23 | `schedule-invariants.ts:555`、`task-plan-actual.ts:303`、`task-appearance.ts:43`、`schedule-layout.ts:201` ほか 3 | ACCIDENTAL（t064） | task-appearance.ts:41 の TRAP は暦日の説明。FD-6 の注（01-04-requirements.md:1326）は「つまみが許したものを IV-12 が拒まない」ためと言う | 違う・届く（§4） | PND-253、DFC-15 |
| G25 | `selection-input.ts:104`、`held-press-preview.ts:66` | ACCIDENTAL（t064） | どちらにも注記なし | 同じ | — |
| G42 | `properties-panel.ts:239`、`tooltips.ts:77` | ACCIDENTAL | 同じ部品（ScreenRenderer）の中。注記なし | 同じ | — |
| G62x | `svg-renderer.ts:139`、`dom-screen-surface.ts:411`、`dom-screen-surface.ts:417` | ACCIDENTAL（t064） | `ScreenTheme` に単色の入力がない（dom-screen-surface.ts:405-408）。FR-041（01-04-requirements.md:1996）は地の色も単色に従うと言う | 違う・届く（§4） | DFC-754、DFC-910、JDG-524 |
| G26a | `app-header-items.ts:47`、`command-palette.ts:49`、`open-modals.ts:96`、`properties-panel.ts:81` | ACCIDENTAL | 4 つとも注記なし。同じ部品の中 | 同じ | — |
| G26b | `notices.ts:126`、`open-modals.ts:178` | ACCIDENTAL（export） | 注記なし。同じ部品の中 | 違う・今は届かない（§4） | — |
| G52 | `field-entry-values.ts:240`、`file-flow-values.ts:714`、`gesture-values.ts:297`、`screen-values.ts:926` ほか 4 | ACCIDENTAL | WHY（field-entry-values.ts:238 ほか）は SD-3 / SF-3 を述べるだけ | 違う・今は届かない（§4） | — |
| G54x | `selection.ts:37`、`selection-values.ts:241`、`edit-task.ts:135` | ACCIDENTAL（t064） | `isSameItem` は PI-32 の要素でない。E31 も同じ組 | 違う・未確認（§4） | — |
| G56 | `schedule-geometry.ts:196`、`copy-and-paste.ts:29`、`drawn-selection.ts:78`、`svg-renderer.ts:470` ほか 1 | ACCIDENTAL（t064） | どこにも注記なし | 同じ | DFC-281 |
| G57a | `notices-drawing.ts:76`、`open-modals-drawing.ts:524`、`notices-drawing.ts:48`、`open-modals-drawing.ts:510` ほか 2 | ACCIDENTAL | open-modals-drawing.ts:510-514 が `nextStepElement` を手で書き直す（:435 で import 済み） | 同じ | — |
| G57b | `dom-screen-surface.ts:582`、`open-modals-drawing.ts:82`、`row-title-panel-drawing.ts:410`、`row-title-panel-drawing.ts:241` | ACCIDENTAL | 同じ部品（DomScreenSurface）の中。注記なし | 違う・届く（§4） | — |
| G57c | `tooltips.ts:57`、`open-modals-drawing.ts:134`、`open-modals.ts:152`、`tooltips.ts:59` | ACCIDENTAL | adapter が既に keys と press を渡す（screen-renderer.ts:283-284）のに描き手が繋ぎ直す | 同じ | — |
| G64d | `watermark-unlock.ts:47`、`screen-values.ts:1106`、`screen-values.ts:1111` | ACCIDENTAL | watermark-unlock.ts:48 の守りが screen-values.ts:1106 を導き直す。注記なし | 同じ | — |
| G64f | `agent-api-members.ts:585`、`agent-api-members.ts:628`、`agent-api-members.ts:600`、`agent-api-members.ts:643` | ACCIDENTAL | 絵の門が同じファイルに 2 回（agent-api-members.ts:585-598 と :628-641） | 同じ | — |
| G35a | `grs-json-schema.ts:1193`、`mspdi-xml.ts:32` | ACCIDENTAL | `JsonFault` と `MspdiFault` が同じ `{at, what}` で、組み立ても同じ（反証で一部覆った） | 同じ | — |
| G36 | `schedule-invariants.ts:67`、`schedule-invariants.ts:158`、`schedule-invariants.ts:394`、`schedule-invariants.ts:595` ほか 8 | ACCIDENTAL（t064） | どちらにも写しの理由なし。validate-imported-document.ts:224 は S-119 の拒みの説明 | 違う・届く（§4） | DFC-548、DFC-553 |
| G39 | `document-settings.ts:467`、`schedule-invariants.ts:272`、`schedule-invariants.ts:260` | ACCIDENTAL（t064） | document-settings.ts:465 の TRAP が写しを名指すが理由なし | 違う・今は届かない（§4） | — |
| G40a | `edit-annotation.ts:64`、`edit-resource.ts:26`、`edit-task-group.ts:69` | ACCIDENTAL | EditDocument の中で本体が同じ。公開版がある（edit-task-group.ts:69） | 同じ | — |
| G40c | `edit-dependency.ts:50`、`edit-task.ts:143` | ACCIDENTAL | edit-task.ts:145 の TRAP（参照の比較）を写しが守らない | 違う・今は届かない（§4） | — |
| G50b | `document-codec.ts:40`、`document-codec.ts:50`、`document-file-flow.ts:124`、`file-gateway.ts:94` | ACCIDENTAL（t064） | document-file-flow.ts:122-123 の TRAP が写しを名指すが理由なし | 同じ | DFC-536、DFC-720 |
| G51 | `edit-task-group.ts:120`、`edit-task.ts:197` | ACCIDENTAL | DFC-990 に記録済み・未決。edit-task.ts:196 の WHY は手順の違いだけ | 同じ | DFC-990、JDG-567 |
| G60a | `document-file-flow.ts:149`、`json-codec.ts:88` | ACCIDENTAL（t064） | 両方とも `SETTINGS_DEFAULTS` を展開し直す。注記なし | 違う・今は届かない（§4） | DFC-981 |
| E02 | `working-calendar.ts:117`、`working-calendar.ts:118`、`document-settings.ts:196`、`document-settings.ts:199` | ACCIDENTAL | working-calendar.ts:117-120 が生成された既定値を字で書き直し、`ACCEPTED_DAY_SPAN` をそこから作る | 違う・届く（§4） | DFC-553 |
| E05 | `row-tree-entrances.ts:276`、`task-group-folding.ts:78` | ACCIDENTAL（t064） | `isBelowRow` は private。task-group-folding.ts:71 の WHY は上限の説明 | 同じ | — |
| E08 | `row-title-panel.ts:73`、`schedule-layout.ts:317` | ACCIDENTAL（t064） | `bandFloorOf` は private。schedule-layout.ts:321-323 の TRAP は描く設定の説明 | 同じ | DFC-608 |
| E09 | `row-grab.ts:241`、`row-title-panel.ts:171`、`screen-regions.ts:108` | ACCIDENTAL | row-grab.ts:238 の TRAP は描く値と保存値の違いの説明。`drawnSettingsOf` は PI-35 | 違う・今は届かない（§4） | — |
| E10 | `edit-task-group.ts:171`、`edit-task.ts:237` | ACCIDENTAL | 01-04-requirements.md:5431 が削除の連鎖を 2 本にすることを禁じる（CD-1） | 同じ | DFC-990、DFC-999 |
| E11 | `task-create.ts:76`、`task-group-naming.ts:58`、`document-change-plan.ts:176`、`mspdi-imported-rows.ts:33` | ACCIDENTAL | mspdi-imported-rows.ts:33-43 が 'auto' を字で書く（生成は schedule-entities.ts:658） | 同じ | — |
| E12 | `row-tree-entrances.ts:205`、`task-create.ts:73` | ACCIDENTAL（t064） | row-tree-entrances.ts:206 の TRAP は max+1 の説明で、写しの理由ではない | 違う・届く（§4） | — |
| E13 | `schedule-layout.ts:399`、`task-group-order.ts:42` | ACCIDENTAL（t064） | localeCompare と符号単位の比較。注記なし | 違う・今は届かない（§4） | — |
| E20 | `zoom-and-fit.ts:282`、`view-place.ts:28` | ACCIDENTAL（t064） | TRAP（zoom-and-fit.ts:278-279、view-place.ts:24-25）は「一緒に直す」だけ | 同じ | CR-577 |
| E21 | `zoom-and-fit.ts:107`、`zoom-and-fit.ts:169`、`shape-cross-sections.ts:73`、`shape-cross-sections.ts:78` ほか 2 | ACCIDENTAL（t064） | shape-cross-sections.ts:71 の「この床の綴りは 1 つ」という TRAP に反する | 同じ | CR-577、JDG-608、DFC-1010、DFC-336 |
| E22 | `display-scale-steps.ts:70`、`screen-regions.ts:180` | ACCIDENTAL | 同じ関数（display-scale-steps.ts:79、:94）の中で 2 通りに求める | 違う・届く（§4） | DFC-697 |
| E23 | `frame-drags.ts:70`、`frame-drags.ts:80`、`screen-frame.ts:178`、`screen-frame.ts:184` | ACCIDENTAL（t064） | frame-drags.ts:67-68 の WHY は押した時の全体の説明。`visibleHeightOf` は private | 同じ | — |
| E24 | `zoom-and-fit.ts:456`、`zoom-and-fit.ts:469`、`task-group-folding.ts:181` | ACCIDENTAL | zoom-and-fit.ts:453 の TRAP は「一緒に直す」だけ。`treeStateWritesFor` は PI-9 で import 済み | 同じ | CR-577 |
| E25 | `dom-input-source.ts:139`、`open-modals-drawing.ts:241` | ACCIDENTAL（t064） | どちらにも WHY なし。PND-91 / JDG-300 は 1 行 = 40 px | 違う・届く（§4） | PND-91、JDG-300 |
| E27 | `row-title-panel.ts:79`、`name-label.ts:16` | ACCIDENTAL（t064） | `truncate` は private。唯一の呼び手は整数の単位数を渡す（name-label.ts:83） | 同じ | DFC-612 |
| E28 | `assignee-label.ts:31`、`properties-panel.ts:274`、`properties-panel.ts:282`、`assignee-label.ts:38` ほか 1 | ACCIDENTAL（t064） | 両方の WHY（assignee-label.ts:29、properties-panel.ts:272）は並べ方の理由で、写しの理由ではない | 同じ | — |
| E29 | `grs-json-schema.ts:1250`、`mspdi-fade-frames.ts:48` | ACCIDENTAL | mspdi-fade-frames.ts:47 は符号点の理由を書く。stringFaults（UTF-16 単位）には理由なし。原稿の schema は draft 2020-12（符号点で数える） | 違う・届く（§4） | — |
| E30 | `document-change-plan.ts:143`、`document-file-flow.ts:653` | ACCIDENTAL（t064） | LR-6 が TextEncoder を禁じるのは use-case の中だけ（反証で覆った） | 同じ | — |
| E34 | `task-paste.ts:43`、`edit-task-group.ts:313` | ACCIDENTAL | EX-12（01-04-requirements.md:5290）は貼った写しを日付を編集したものとして扱えと言う。task-paste.ts:43-52 は従い、edit-task-group.ts:313-330 は従わない | 違う・届く（§4） | JDG-264、DFC-685 |
| E36 | `file-system-access-file-store.ts:99`、`canvas-rasterizer.ts:14`、`browser-clipboard.ts:13` | ACCIDENTAL | 'image/png' が 3 回（反証で覆った。些細） | 同じ | — |
| E37 | `single-html-shell.ts:212`、`document-file-flow.ts:259` | ACCIDENTAL（export） | 同じ部品の中。DEVIATION（document-file-flow.ts:265-266）は `isUnreadAsked` だけの説明 | 同じ | DFC-855 |
| E40 | `edit-task.ts:180`、`edit-annotation.ts:97`、`edit-annotation.ts:109`、`edit-dependency.ts:42` ほか 2 | ACCIDENTAL（t064） | 注釈は T-214 の範囲を確かめない（edit-annotation.ts:97-126）。編集の後に不変条件を回す者がいない（frame-loop.ts:660 は IV-17 だけ） | 違う・届く（§4） | DFC-182、DFC-760、DFC-582 |
| E41 | `edit-dependency.ts:93`、`edit-task.ts:170` | ACCIDENTAL | edit-dependency.ts:93 は Task.milestone、isMilestone は描いた形を先に読む。反証 B と反証 E で読みが割れる（Q2） | 違う・届く（§4） | — |
| H01 | `task-create.ts:29`、`task-plan-actual.ts:292` | ACCIDENTAL | CM の id だけ違う字面の写し。注記なし | 同じ | — |
| H02 | `edit-task-group.ts:241`、`task-group-order.ts:149` | ACCIDENTAL | 同じ計算と文言（FR-033 と HM-3a）。注記なし | 同じ | — |
| H03 | `display-scale-steps.ts:91`、`zoom-and-fit.ts:371` | ACCIDENTAL | 同じ部品の中。違う入力は引数（zoom-and-fit.ts:383 の TRAP） | 同じ | DFC-697 |
| H04 | `svg-renderer.ts:478`、`dependency-route.ts:135` | ACCIDENTAL（t064） | `selectedLinksOf` を schedule-geometry.ts:31-32 が公開しない。判定 B が G17 の余りとして見ていた | 違う・届く（§4） | DFC-640、DFC-922 |
| H05 | `field-commit.ts:382`、`properties-panel.ts:582`、`shortcut-keys.ts:126`、`selection.ts:90` ほか 2 | ACCIDENTAL（t064） | 助け手がない。selection.ts が内側の家 | 違う・今は届かない（§4） | — |
| H06 | `armed-placement.ts:143`、`item-grab.ts:421`、`highlight-box.ts:26` | ACCIDENTAL（t064） | item-grab.ts:421 の TRAP は「同じであれ」で、写す理由ではない | 同じ | — |
| H09 | `image-exporter.ts:169`、`svg-renderer.ts:535` | ACCIDENTAL（t064） | 理由なし。両方とも ScreenRegions を既に読む | 同じ | — |
| H10 | `svg-renderer.ts:85`、`item-hit-area.ts:123`、`schedule-task-figures.ts:110`、`item-hit-area.ts:208` | ACCIDENTAL（t064） | 線の太さを数える・数えないの理由がどちらにもない（item-hit-area.ts:206 は端の印の説明） | 違う・届く（§4） | — |
| H12 | `schedule-task-figures.ts:349`、`task-figures.ts:524` | ACCIDENTAL（t064） | 間引きが `actualVisible` を無視する理由の注記なし | 違う・届く（§4） | — |
| H14 | `view-place.ts:89`、`zoom-and-fit.ts:534` | ACCIDENTAL（t064） | 1 つの Fit を 2 か所で保存する理由なし | 同じ | — |
| H15 | `agent-api-members.ts:271`、`single-html-shell.ts:186` | ACCIDENTAL（t064） | 些細。両方とも DocumentCodec を読む | 同じ | — |
| H18 | `schedule-geometry.ts:82`、`edit-task.ts:67` | ACCIDENTAL（t064） | EditDocument->ScheduleGeometry の辺が無いだけ（層の規則ではない） | 同じ | — |
| I11 | `properties-panel.ts:725`、`document-settings.ts:451` | ACCIDENTAL（t064） | properties-panel.ts:723 の TRAP が写しを認めるが理由なし | 同じ | — |
| I12 | `properties-panel.ts:759`、`edit-annotation.ts:51`、`task-appearance.ts:27`、`task-group-look.ts:24` ほか 3 | ACCIDENTAL（t064） | TRANSPARENT を stored-colour.ts:8 が公開しているのに 4 回打ち直す。S-315（tbl-settings.md:504）は「行には出さない」 | 違う・届く（§4） | — |
| I13 | `properties-panel.ts:253`、`field-commit.ts:74`、`property-items.json:53` | ACCIDENTAL（t064） | WHY の注記まで一字一句同じ。JF-1 は .json を読ませないだけ | 同じ | — |

### 3.5 INTENDED

| id | 写し（file:line） | 理由 | 台帳 |
|---|---|---|---|
| G29b | `frame-loop.ts:889`、`frame-loop.ts:897`、`screen-values.ts:981`、`screen-values.ts:1098` | frame-loop.ts:894 の DEVIATION と DFC-705。T-280 に該当の欄がなく、JDG-57 が今の振る舞いを写せと裁定（反証で INTENDED に） | DFC-705、JDG-57 |
| H17 | `document.ts:19`、`grs-json-schema.ts:684` | LR-1 が document.ts から adapter を読ませない。ただし生成器が entity へ出せば 1 本にできる | — |

判定役・反証役が意図と認めた「部分」もある。行そのものは ACCIDENTAL のまま残した。

- G48 —— 持ち物の違い（`screen-state.ts:29-30`）
- G34 —— export と編集の分担（`mspdi-codec.ts:1155`）
- G11 —— 斜めの扱い（`row-grab.ts:264`）

### 3.6 NOT-A-DUPLICATE

44 行。理由と `file:line` は `duplicated-responsibility-groups-d65097b9.json` の `evidence` にある。

**重複ではないが、ほかへ回すべきもの。**

- G46 —— `screen-frame.ts:56` が S-205（太さの床）を、つまみの長さの床として読んでいる。仕様とコードの食い違いであり、`defects.md` へ回す。
- I10 —— Properties Panel は Task の子孫も親の候補に出す（`properties-panel.ts:355-366`）。CM-18 はそれを拒む（`edit-task.ts:300-310`）。PR-15 には候補の規則が無い。仕様の穴である。
- 境界例 B1 —— `scrollAreaTopOf`（`input-command-translator.ts:453`）が公開されているのに、6 か所で書き直されている。どの箇所も既知の写しから ±15 行以内なので、数えていない。

## 4. 既に答えが食い違う写し

`differs` が真の行は 49。内訳は次のとおり。

| 区分 | 行数 |
|---|---|
| 届く（REACHABLE） | 33 |
| 今は届かない（UNREACHABLE-TODAY） | 15 |
| 未確認 | 1 |

**DFC-922 が効いている。** 開く道が見る不変条件は IV-17 だけである（`frame-loop.ts:660`）。そのため IV-1（主キー）・IV-5（行の深さ）・IV-6（1 Task 1 行）・IV-18（行の輪）に反するファイルが、そのまま開いてしまう。4.2 の多くはこれで届く。直し方は二つある。開く道で `scheduleViolations` を読むか、それぞれの写しを 1 本にするか。どちらでも閉じる。

### 4.1 有効な文書で、利用者の手順で届く

| id | 入力 | 答え（一方 / 他方） | 手順 |
|---|---|---|---|
| G23 | fadeOutDays 4、計画 10 日、フェードインのつまみ（GA-7）を 8 日へ | `item-grab.ts:500` は 8 に収めて setTaskFadeInDays 8 を出す / IV-12（`task-plan-actual.ts:303`）は 8 + 4 > 10 で拒む | どの文書でもよい。フェードアウト 4 日・計画 10 日の Task で、フェードインのつまみを 6 日より先へ引く（`item-grab.ts:149-153` は fadeIn だけを書く）→ 編集が拒まれる。FD-6 の注（`01-04-requirements.md:1326`）は、つまみが許したものを IV-12 が拒まないことを求めている |
| G62x | 色相 359、暗、単色 ON | SVG と書き出しは `hsl(0 0% 13%)` / 画面の地は `hsl(359 14% 13%)` | App Header で単色を ON にする（IC-100 / CM-64）→ 日程表の S-146 は灰色になる（`svg-renderer.ts:642`）が、画面の地は色付きのまま。書き出しのヘッダは S-150 を灰色にするが（`image-exporter.ts:52-55`）、画面はしない。S-146 の分は FR-041 に反する欠陥。残りは Q1 |
| G15x | rowArea {300,100,800,500}、点 (1100,300) | `tooltips.ts:98`・`screen-regions.ts:52` は外 / `schedule-overlays.ts:169`・`item-hit-area.ts:77` は内 | Row Area の右端か下端の 1 px にポインタを置く → ガイドカーソルは描かれるが（`schedule-overlays.ts:167`）、Dual Cursor の読み出しは null を返す（`tooltips.ts:214-217`） |
| E34 | slack を持つ Task の行を写して貼る | 行の貼り付け（`edit-task-group.ts:313-330`）は FreeSlack 0 / TotalSlack -33600 を残す / Task の貼り付け（`task-paste.ts:43-52`）は捨てる | `sample-schedule/sample-small-website-renewal.en.xml` を開き、最初の行を選んで Ctrl+C、Ctrl+V（`copy-and-paste.ts:115`）、MSPDI へ書き出す → 写し（uid 1967）の slack が書かれる。EX-12（`01-04-requirements.md:5290`）の MUST NOT に反する（`rf/e34.ts`、本物のコード） |
| E29 | Project UID = 絵文字 9 個（符号点 9、UTF-16 で 18） | `grs-json-schema.ts:1250` は 16 字を超えるとして拒む / 原稿の JSON Schema（draft 2020-12、符号点で数える）は通す | その MSPDI を開く（通る）→ GRS JSON で保存 → 開き直すと RS-25 で拒まれる。アプリが自分で保存したファイルを開けない（`rf/e29.ts`）。ASCII 20 字でも同じことが起きる（取り込みが AT-1 を縛らない） |
| E40 | 注釈の日付 2300-01-01（importMaxDate 2200-12-31 より後） | 注釈の編集（`edit-annotation.ts:97-126`）は通す / Task の編集（`edit-task.ts:180` checkDay）と IV-14 は拒む | Agent API を有効にする（IC-20）→ applyCommands で createHighlightBox 2300-01-01（`agent-api-members.ts:462`）→ 保存 → 開き直す → validateImportedDocument が S-120 で拒み、`document-file-flow.ts:546-548` は通知なしで false を返す。ファイルが黙って開かない（`rf/e40.ts`） |
| H07 | 稼働曜日のないカレンダーで、実績の長さ 3 と 1 | `json-codec.ts:335-343` はファイル全体を拒む / `mspdi-codec.ts:633-637` は通知して残りを読む | actualStart と actualDuration を持ち、stop を持たない旧版の GRS JSON を開く → 丸ごと拒まれる。FR-011（`01-04-requirements.md:2759`）は MSPDI と同じ読みを求めている（`repro-H07.ts`） |
| I06 | 画面 1920、保存した題の幅 100（床 200）、プロパティの幅 1750 | CM-67（`edit-document-settings.ts:109-115`）は受け入れる / 描画（`screen-regions.ts:165`）では Row Area が -48 | rowTitleIndent か maxGroupDepth を上げて、S-79 の床を保存幅より大きくする → Properties Panel の仕切りを左へ引く（`frame-drags.ts:136` に上限がない）→ Row Area が幅 0 以下で描かれる（画素は未観察、`repro-I.ts`） |
| I08 | Properties Panel の文字欄で Shift+Minus | `dom-input-source.ts:130-135` は文字として受ける / `shortcut-keys.ts:47-52` は受けず、SK-16（`shortcut-keys.ts:93`）へ落ちる | コードを辿った結果で、実機では未確認。文字欄で US 配列の `_` か `+`（JIS 配列なら `=`）を打つ → 時間軸が拡大され、`isBrowserDefaultStopped`（`frame-loop.ts:2673`）がその文字を飲むとみられる |
| E25 | 行単位のホイール（deltaMode 1）、3 行、字 16 px | 日程表（`dom-input-source.ts:139`）は 120 px / Resource Roster（`open-modals-drawing.ts:241`）は 48 px | 行単位で報告するホストで、Resource Roster の上で Ctrl+Shift+ホイール（`open-modals-drawing.ts:231-238`）。JDG-300（1 行 = 40 px）に反しているのは Roster の側。ただし今の Firefox は、deltaX を先に読むと画素で報告する。未測定 |

**届くが、見た目に出ない。**

| id | 入力 | 答え（一方 / 他方） | 手順・影響 |
|---|---|---|---|
| G57b | アイコン IC-5「Undo」 | `dom-screen-surface.ts:582` は aria-label "Undo" と状態の属性を付ける / 他の 3 つは aria-label "IC-5" で、状態を付けない | Resource Roster や角のボタンで届く。読み上げは対象外なので見えない（利用者裁定 2026-09-17） |
| E17 | Dual Cursor の追従中にバーを押す | `frame-loop.ts:1930` collectPress は当たりを返す / `:1963` grabAtPointer は null | 届く。ただし命令を読む側がすべて打ち消す（`input-command-translator.ts:609` で pressRowOf が先に PTD-2 を答える）。`frame-loop.ts:1710` が pressedOn grab を送る件は未測定 |
| E22 | 幅 800、スクロールバー 16.8、題 333、表示倍率 50 → 67 | 313.75625 / 313.75624999999997 | 1 ulp の差。画素未満で見えない |
| H10 | 線形のバー 10..100、y 50、線の太さ 4 | 覆いの箱（`schedule-task-figures.ts:110`）は高さ 0 / 当たりの帯（`item-hit-area.ts:208`）は高さ 4 | arrow か endpointSpan の Task を依存線が横切ると、光輪の覆い（`schedule-task-figures.ts:384-386`、`:548-553`）がそこで何も覆わない。画素は未観察 |
| H12 | 計画 300..400、実績 100..200、実績を隠す | 間引き（`schedule-task-figures.ts:349-354`）の左端は 100 / 描く左端（`task-figures.ts:524-526`）は 300 | 実績が計画より前に始まる Task で actualVisible を切り、隠した実績の日だけが見える位置へスクロールする → 何も描かれない Task が SVG に残る。画素の差は無い |

### 4.2 取り込んだファイル・手で直したファイルからだけ届く

| id | 入力 | 答え（一方 / 他方） | 手順 |
|---|---|---|---|
| G02 | {50,1,1} と {1950,1,1} | compareDays は -1900 / compareDay（`input-command-translator.ts:1293`）は 0 | importMinDate が "0001-01-01" の GRS JSON を開く（`import-document.ts:214` がその値を保つ）→ 0050 年の日付を入れる（checkDay が通す、`edit-task.ts:180-191`）→ バーを引く（`item-grab.ts:209`、`:289`、`:426`） |
| G04 | [c（親 r、order 0）, r（根、0）, s（根、1）] | 順位の写しは先頭を r とする / `view-place.ts:62` firstRow は c とする | taskGroups の配列で、子を同じ order の根より前に置いた GRS JSON を開く（配列の順を縛る不変条件がない） |
| G05 | 深さ 6 の鎖（上限 5） | rowGrabDepthOf 6 / rowDepth 5 / drawn-rows 6 | S-125 より深い行の鎖か、parentId の輪を持つ GRS JSON を開く（IV-5 / IV-18 は開く時に見ない） |
| G07 | 1 つの Task を 2 つの行の members に入れる | find は先の行 / Map は後の行 | そういう GRS JSON を開いて Task を掴む（IV-6 を開く時に見ない） |
| G08 | 深さ 6 の鎖、上限 5、g4 を問う | 翻訳側は開けると答える / パネルは開けないと答える（repro は模型） | S-125 より深い鎖を持つ GRS JSON を開く |
| G09 | scrollGroupOffset 1.5 | rowPointIn は 136 / scrollOffsetOf は 157 | scrollGroupOffset が 1 以上の GRS JSON を開く（S-176 は [0,1) だが、schema は number だけ、`grs-json-schema.ts:1105`） |
| G22d（G22b の ND-1 の読み手） | shapeKind 'milestone'、Task.milestone false | 描画はマイルストーン / ND-1 のラベル（`name-label.ts:66`）は「開始 - 終了」 | そういう GRS JSON を開く（アプリの中では CM-20 が切り替えを拒む、`task-appearance.ts:89-93`）。どちらが正しいかは Q2 |
| E41 | 同上 | 描画はマイルストーン / 新しい依存線の種別（`edit-dependency.ts:93`）は押した端の種別 | 同上。Q2 |
| G34 | 開始 1900-01-01、終了 2200-01-01 | 書き出しは制約だけを書いて通知する / 編集は DaySpanTooWide を投げる（`task-plan-actual.ts:227` に catch がない） | importMinDate が "1900-01-01" の GRS JSON を開く → Task を 231 年を超えて延ばす |
| E02 | importMaxDate 2400-12-31、PA-5 を 1970-01-02..2300-12-31 に | checkDay は通す / `ACCEPTED_DAY_SPAN`（`working-calendar.ts:117-120`）の歩みは投げる | そういう GRS JSON を開き、計画か実績を 330 年にわたって置く（`rf/e02.ts`）。DFC-553 の直し 1（既定値から作る）では閉じない |
| E04 | E02 と同じ | `mspdi-codec.ts:1197-1206` は例外を受ける / `percent-complete.ts:30-40` と Properties Panel は投げる | E02 と同じ |
| G36 | importMinDate "garbage"、task.start "nope" | entity は「日を名指さない」と報告する / use case は何も言わない | 日でない importMinDate を持つ手直しの GRS JSON を、今の文書にする → 読めない日付を持つファイルを開く → 拒みに IV-14 の行が載らない（`document-file-flow.ts:270`、`:291`） |
| E07 | Task UID の重複 | taskDepths は {1:4, 2:4} / 取り込みの行は {1:3, 2:2}。書き出すと OutlineLevel が [1,2] になる（取り込んだ時は [1,3]） | UID が重なる MSPDI を開く。documentFromMspdi も validateImportedDocument も通す（`rf/e07.ts`、`rf/e07b.ts`） |
| H04 | 2 つの Task が uid 2 を共有する | 描き手は "3>2" / geometry は "1>2 3>2" | 推定で、実行はしていない。E07 と同じ道で重複 UID のファイルが開くので、判定の根拠だった IV-1（`schedule-invariants.ts:303-304`）はこの道を守っていない |
| G37b | 約 20 万行 | `mspdi-codec.ts:355` の Math.max(...展開) は RangeError / ループは 200000 | 約 20 万行の MSPDI を開く。復号（`document-file-flow.ts:495`）が、大きさの上限（`validate-imported-document.ts:165`、`:181`）より先に走る |
| G37d | tasks の並び [5,3]、mark 10 | Task の貼り付けは 5→11、3→12 / 行の貼り付けは 3→11、5→12 | uid 順でない tasks を持つファイルで、同じ Task を「Task として」と「行として」の両方で貼る |
| E12 | 根の order [-5, -3] | 入口（`row-tree-entrances.ts:205`）は -2 / task-create は 0 | 負の order を持つ GRS JSON を開いて、根の行を足す。描く順は同じで、保存する数だけが違う |
| I12 | TaskGroup の色 'black' | CM-30（`task-group-look.ts:24`）は受ける / パネル（`properties-panel.ts:759-762`）は候補に出さない / 描き手（`svg-renderer.ts:802-803`）は帯の色を持たず、テーマの帯を描く | Agent API で setTaskGroupColor 'black' を送るか、color 'black' の GRS JSON を開く。受けるべきかは Q3 |

### 4.3 今は届かない

| id | 入力 | 答え（一方 / 他方） | 守り |
|---|---|---|---|
| G10c | 境が NaN、値 5 | zoomWithinBounds は NaN / clampedZoom は 5 | 境は生成された NOT_STORED_ZOOM_BOUNDS（`edit-document.ts:298-304`） |
| G11 | {x: NaN, y: 0} | hasDraggedPastThreshold は false / rowGrabAxisAt は 'position' | ブラウザのポインタ座標は有限（リポジトリの中に守りは無い。入口は `frame-loop.ts:1613`） |
| G22b | shapeKind 'milestone'、milestone false、geometry に無い Task | shapeKindOf は true / isDrawnAsMilestone の予備路は false | GA-18 の押下は geometry から来る（`screen-state-input.ts:92`） |
| G26b | QN-99、または空の QN-9 | notices は QN-8 の文 / open-modals は "" | `open-modals.ts:325` は、両言語で埋まった QN-9 だけを渡す |
| G39 | 式 [{key:'pinnedGroupIds'}] | expressionValueOf は null / boundValueOf は 2 | 生成された式は、列の鍵を名指さない（`document-settings.ts:288-400`） |
| G40c | 何も変えない Task | `edit-task.ts:143` は同じ文書を返す / `edit-dependency.ts:50` は新しい文書を返す | editDependency はいつも新しい配列を渡す（`edit-dependency.ts:108-111`、`:122`、`:145`） |
| G52 | 今と同じ言語を選ぶ | moved は新しい物を返す / combined は同じ参照を返す | 唯一の送り手は、言語を必ず反転させる（`frame-loop.ts:2139-2140`） |
| G53b | DOCUMENT_REPLACED の直後 | セッションは true / 監視の旗は false | `frame-loop.ts:1382` と旗を立てる所の間に、同期の読み手がいない |
| G60a | 鍵 'a.b.c' | {b:{c:1}} / {'b.c':1} | 生成された鍵は 2 段まで（`document-settings.ts:150-280`） |
| E01 | pxPerDay 1e-7 | 7.6e-6 / 0 | pxPerDay は 0.003125 以上（`document-settings.ts:364`、`edit-document.ts:302`） |
| E03 | 10000 年以降の時刻 | 秒を書く / 秒を書かない | 両方とも壁時計を読む（`dialogue-field-drawing.ts:73`） |
| E09 | displayScale 0 | 0 / 16 | displayScale は正の値だけの enum（`grs-json-schema.ts:847`） |
| E13 | start '' と null | 反対称でない / uid へ落ちる | '' は拒まれる（`validate-imported-document.ts:71`、`edit-task.ts:182`） |
| E18 | キャンバスの余白で左ボタンを押す | isOnTheChart は false / startsNoTextSelection は true | 唯一の読み手が両方の OR を取る（`frame-loop.ts:2672-2673`） |
| H05 | ordinal -1 か 1.5 | `selection.ts:91` は null / 他は undefined | ordinal は findIndex からだけ来る（`selection-input.ts:53-56`） |

### 4.4 未確認

| id | 入力 | 答え | 分からないこと |
|---|---|---|---|
| G54x | {kind:'task', uid:1, taskUid:1} | isSameItem は true / isSameObject は false | 余分な欄を持つ ItemRef を作る者が見つからない。届くかどうかを示せていない |

I02（`copy-and-paste.ts:74-80` の段の上限を、保存した倍率で測る）は、違いうることまでは言えたが、証明していない。そのため `differs` は null とした。

## 5. 統合の提案

**共通の縛り。** 3 つの CR すべてに次が効く。

- **内側へしか読めない（LR-1）。** framework 4 > adapter 3 > use-case 2 > layoutEngine 1 > documentModel 0。
  - adapter は framework を読めない。だから CR-578 が割った先の部品を、adapter から呼ぶことはできない。
  - documentModel は layoutEngine を読めない（LR-4）。だから不変条件が使う計算の家は documentModel になる。
- **同じ層の中で輪を作れない（LR-3）。** `InputCommandTranslator -> ScreenRenderer` の辺は既にある。逆向きに読めば輪になる。そのため、ScreenRenderer も使う表（ENTRY、IC と設定の対応、`armedByEntry`、SURFACE 名）の家は ScreenRenderer でなければならない。翻訳側は、それを読む側に回る。
- **他の部品へ名前を出すなら、表 T-064 に行を足す（check 26b）。** 判定に `（t064）` が付いた行がそれに当たる。T-064 の行を足すのは仕様の CR である。割る CR にこの行の編集を含めるか、その前に別の CR を置く。
- **部品のつながりは `docs/spec/_source/components.json` の辺に従う（EG-5）。**
  - 無い辺: `DocumentCodec -> EditDocument`、`EditDocument -> ScheduleGeometry`、`AdvanceScreenSession -> ImportDocument`、`DomScreenSurface -> SvgRenderer`。
  - このため、codec と編集が共に使う計算（G33・G34・E04）の家は Schedule になる。`task-plan-actual.ts` には置けない。

### 5.1 CR-578（`frame-loop.ts`）

| 写し | 家 | 出すもの | T-064 |
|---|---|---|---|
| セッションの読み手（G53x、G53a、I03、I05、G29x、G28 の型） | `src/use-case/advance-screen-session/advance-screen-session.ts` の公開する読み手の束 | `isQuestionAsked`・パネルの中身・Dual Cursor の追従・`WATERMARK_UNLOCK_SURFACE`・`DisplayLanguage` | 要（PI-39） |
| 押し離しの読み取り（G44） | `screen-state-input.ts`（翻訳側の入口から） | `pressedPartOnRelease` | 要（PI-18） |
| Escape の核（G48） | 翻訳側の `escapeContextOf` を frame-loop が広げて使う | `escapeContextOf` | 要（PI-18） |
| 表示言語（G28） | `screen-renderer.ts:511` | `displayLanguageOf` | 要（PI-37） |
| 描く行の切り取り（E14） | ScreenRenderer（DFC-991 のとおり） | `drawnRowBoxesOf` | 要（PI-37） |
| ENTRY・SURFACE 名・通知の理由（E39、E43、H22） | ScreenRenderer。翻訳側は ENTRY を再公開する | `ENTRY`・SURFACE 名・`ReasonRow` | 要（PI-37 / PI-18） |
| 取り消せるか（I01） | `edit-history.ts` | `canUndo` / `canRedo` | 要（PI-4） |
| 時刻の文字（E03） | `calendar-day.ts` | `instantTextOf` | 要（PI-1） |
| Row Area の幅（I06、届く欠陥） | 家は変えない。`edit-document-settings.ts:109-115` が `drawnSettingsOf`（既に PI-35）を読む | — | 不要 |
| 押下の下の物（E17）、倍率の範囲（G47）、同じ事実の二度計算（I07）、フレームの段取り（I02）、PNG の結末（H08） | SingleHtmlShell の中。割った後のファイルどうしで共有する | 部品の中の `export` だけ | 不要 |
| OpenChoice（H20） | 辺 `AdvanceScreenSession -> ImportDocument` を足してから別名にする | — | 辺と行 |
| G29b | 今のまま（DFC-705 を直すときに消す） | — | — |

### 5.2 CR-579（`input-command-translator.ts`）

| 写し | 家 | 出すもの | T-064 |
|---|---|---|---|
| 日の通し番号・比較（G01、G02、E01） | `calendar-day.ts`（documentModel）と `time-axis.ts` | `serial`・`dayFromSerial` / `dayAnchorAtX`。`compareDays` は公開済み | 要（PI-1 / PI-5） |
| 行の木（G04、G05、E05、G07） | Schedule（documentModel）。不変条件も同じ順位を使うので、layoutEngine は家にできない（LR-4） | `taskGroupRankById`・`rowDepthOf`・`isRowBelow`・`rowOfTask` | 要（PI-1） |
| 行の帯（G09） | `row-scroll.ts` | `rowSlabAt`・`rowPointOf` | 要（PI-5） |
| 採番（G37a） | EditDocument | `nextIssuedUid` | 要（PI-9） |
| 図形の選択肢（G65）、ND の名前（G22a） | 生成された `COLUMN_SHAPES` を読む。翻訳側の関数は `milestoneGlyphNamed` へ改名 | — | 不要 |
| 腕の表・IC と設定・ENTRY（G66、E38、E39） | ScreenRenderer（LR-3 のため） | `armedByEntry`・IC と設定の対応・`ENTRY` | 要（PI-37） |
| 描いた行の Task・参照された資源（E32、E33） | Schedule | `tasksOnRows`・`referencedResourceUids` | 要（PI-1） |
| 押下の行（H19） | AdvanceScreenSession | `GesturePressRow` | 要（PI-39） |
| 文字欄のキー（I08、届く欠陥） | 翻訳側。`dom-input-source.ts` の読み方に合わせる | `isTextEntryKey` | 要（PI-18） |
| 部品の中の写し（G06、G11、H11、H13、I09） | InputCommandTranslator の中。割った後のファイルどうしで共有する | 部品の中の `export` | 不要 |
| 倍率の段（E42 の `FONT_SCALE_STEPS`） | `tools/generate_entity_types.py` が値の列を出す | — | 不要 |

**CR-577 と衝突する。** G09（`zoom-and-fit.ts:333`）、G10、G16、H03、H14、それに E20・E21・E24 はすべて `zoom-and-fit.ts` に写しを持つ。起草中の CR-577 は、自分の波のために `zoom-and-fit.ts` を押さえている（`change-request/CR-577-a-row-zoom-in-below-the-floor-always-changes-the-picture.md:6`）。

- E21 —— CR-577 は `rowAxisReadingOf` と `deepestFloorZoomYOf` をそのまま使って、新しい関数を足す（同 `:119-121`）。先に写しを畳むと、CR-577 の前提が崩れる。
- E20・E24 —— 同じファイルの中にある。

したがって、この 8 つは CR-577 が着地した後に回す。

### 5.3 CR-580（`mspdi-codec.ts`）

| 写し | 家 | 出すもの | T-064 |
|---|---|---|---|
| 所要時間の文字・1 日の分（G33） | Schedule（`working-calendar.ts` の隣）。`DocumentCodec -> EditDocument` の辺が無いため、`task-plan-actual.ts` は家にできない | `durationTextOfMinutes`・`minutesPerWorkingDay` | 要（PI-1） |
| 開始の固定（G34） | Schedule | `startPinOf`・`MUST_START_ON` | 要（PI-1） |
| 実績の長さ（E04） | `working-calendar.ts` | `heldActualLengthOf` | 要（PI-1） |
| WBS の深さ（E07）・最大 uid（G37b） | Schedule | `wbsDepthOf`・`highWaterOf` | 要（PI-1） |
| 日の比較（G02 の `latestTaskFinish`）・WBS の順（G04 の `tasksInWbsOrder`） | 公開済みの `compareDays` と、G04 で公開する順位の歩み | — | G04 と共に |
| 長さから止め日（H07、届く欠陥） | DocumentCodec の中に 1 本。MSPDI の振る舞い（通知して残りを読む）へ揃える。FR-011 がそれを求める | 部品の中の `export` | 不要 |
| 故障の型（G35a） | DocumentCodec の中に `CodecFault` を 1 つ | — | 不要 |

### 5.4 割る 3 本の外

写しの多くは、Schedule・ScheduleLayout・ScreenRegions・Selection・SvgRenderer へ名前を出す（`duplicated-responsibility-groups-d65097b9.json` の `proposal`）。そのうち、届く欠陥を閉じるものは次のとおり。どれも割る CR を待たなくてよい。

| 写し | 直し |
|---|---|
| G23 | FD-6 の止め位置を span − fadeOut にする |
| G62x | 地の色を単色に従わせる |
| G15x | Row Area の端を半開区間に揃える |
| E34 | 貼り付けを 1 本にして planDatesEdited を通す |
| E29 | 符号点で数える |
| E40 | 注釈にも checkDay を当てる |

## 6. 台帳の候補

行は docs/development-records/defects.md の DFC-1051..DFC-1075 に置く（別の手で書く）

## 7. 利用者に聞くこと

証拠では決められないことだけを挙げる。

**Q1（G62x）。** themeMonochrome のとき、FR-041 が名指さない画面の飾りの行 —— S-149（罫）、S-150（パネルの地）、S-151（強調） —— も灰色にするか。

- **証拠が決めること。** FR-041（`01-04-requirements.md:1996`）は「地の色」を名指す。だから S-146 の地が色付きのまま残るのは、ただの欠陥である。また、書き出しのヘッダは既に S-150 を灰色にしている（`image-exporter.ts:52-55`）。画面と書き出しは今、食い違っている。
- **証拠が決めないこと。** 画面の飾りを灰色にするか、書き出しの灰色をやめるか。

**Q2（G22d / E41）。** ND-1 の「マイルストーン」は `Task.milestone` か、描いた形か。取り込んだ文書で二つが食い違ったときに問題になる。

- **証拠が決めること。**
  - G-1（`01-04-requirements.md:237`）は `Task.milestone` を「マイルストーンであるか」の真とする。
  - AT-100 は、形が空のとき `Task.milestone` から形を解く。
  - アプリの中では CM-20 が食い違いを作らせない（`task-appearance.ts:89-93`）。
  - 取り込みだけが食い違いを通す（`grs-json-schema.ts:489`）。
- **証拠が決めないこと。**
  - ND-1 のラベル（`name-label.ts:66`）と依存線の種別（`edit-dependency.ts:93`）が、どちらを読むべきか。反証役の二人も読みが割れた。
  - 取り込みで食い違いを拒むか、直すか。

**Q3（I12）。** Properties Panel が出さない TaskGroup の色 'black' を、CM-30 は拒むべきか。

- **証拠が決めること。**
  - S-315（`tbl-settings.md:504`）は「行には出さない」と言い、パネルはそれに従う（`properties-panel.ts:759-762`）。
  - 生成された選択肢には 'black' がある（`schedule-entities.ts:439`）。
  - CM-30 は受け入れる（`task-group-look.ts:24`）。
  - 描き手は 'black' の帯を持たず、テーマの帯を描く（`svg-renderer.ts:802-803`）。
- **証拠が決めないこと。** 「出さない」が「受け入れない」まで意味するか。それとも、受けて何かの色で描くべきか。

## 8. 再現

`docs/review/duplicate-survey-2026-09-26/repro/README.md` を見よ。§4 の入力と答えは、すべてそこのスクリプトで出せる。
