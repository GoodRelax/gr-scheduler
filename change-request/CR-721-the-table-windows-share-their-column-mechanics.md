# CR-721 —— 表の窓の列の仕組みをそろえる —— 幅の下限と既定の幅を測り、外を押せばフィルタを閉じ、フィルタを掛けた列の見出しを緑にし、フィルタと並べ替えを一度に戻す入口を置く

> 起草の状態: 当てた（2026-10-10、作業木 `81f20d33` の上）。起草は `945a244f` の上。仕様・辞書・設定値・図・コード・既存の試験・台帳・規則 02 の表記の表と検査 32 を同じ作業木で当てた。仕様だけを読む試験は別の体が書く（9 節）。当てた記録は 14 節。
> ID の帯: 番号 `CR-721`、変更履歴 `4.27`、`perf-pending` の行 155 を調整役から受けた。`945a244f` の木で `CR-721` を名乗る所は 0 件だった（13 節）。起草の仮の名 `IC-NEW-A1`・`EP-NEW-A1` は、当てたとき（`81f20d33`）に `IC-153`・`EP-24` を取った —— `EP-` は表 T-076 の最大 `EP-23` の次。`IC-` は表 T-109 の最大が `IC-143` だが、`IC-144` は `CR-661` が別の意味（すべて表示に戻す）で下書きに書いて取らなかった名、`IC-150`〜`IC-152` は `CR-660` が受けて使わなかった帯なので、木のどこかが名乗る `IC-` の最大 `IC-152` の次を取った（一つの名に一つの意味）。`JDG`・`DFC`・`PND` の行は足さない。
> 当てる裁定: `JDG-1801`（列の幅を引いて変える —— 下限は `JDG-1820` が替えた）・`JDG-1802`・`JDG-1810`（既定の幅）・`JDG-1803`・`JDG-1808`（外を押して閉じる）・`JDG-1804`・`JDG-1817`（Visibility ／ Show ／ Hide の語と名）・`JDG-1805`・`JDG-1819`（クリアの入口）・`JDG-1806`・`JDG-1807`・`JDG-1822`（フィルタを掛けた列の見出しの緑）・`JDG-1820`（幅の下限はフィルタマークの幅）・`JDG-1823`・`JDG-1825` の後半（画像に帯を入れず、詰める）。
> 覆す裁定（既に 覆された と記録済み）: `JDG-1353`（`JDG-1808`）・`JDG-1383`（`JDG-1823`）・`JDG-1801` の 12px（`JDG-1820`）。
> 閉じるもの: `DFC-2321`（担当リストの分は `CR-722`）・`DFC-2322`・`DFC-2323`・`DFC-2324`（語と名。値の意味の変わりは `CR-722`）・`DFC-2325`（担当リストの分は `CR-722`）・`DFC-2326`・`DFC-2328`。
> 後に続くもの: `CR-722`（表ごとの Visibility と担当リストの窓）は本書の仕組みを担当リストへ広げる。`CR-723`（保存）は `CR-722` の後。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`945a244f`）

| 行の読み | 見たもの | 本書での扱い |
|---|---|---|
| `DFC-2321`: 列の幅を変えられるのは検索とレポートだけで、下限は 64px | 正しい。`SV-18` の「幅の下限は `S-425`」、`S-425` は 64px 🔎（見本の初めの値）。コードは `search-panel-drawing.ts:577-578` が `NOT_STORED_SEARCH_PANEL_SIZES['S-425']` を床に使う | 下限を「フィルタマークとセルの詰めが入る幅」の測る規則へ（X-1） |
| `DFC-2322`: 既定の幅は 3 段 × 2 言語の最大を固定で持つ | 正しい。`S-470`（`SQ-5`）は 152px で、測った最長は en 12px の「Paused, resume date set」（`CR-660` の 7 節）。ja 9px の「○進行中」には大きく余る | 窓を開いた・段を変えた・言語を変えたときに、そのときの言語と段で測る（X-2） |
| `DFC-2323`: 外を押しても閉じない | 正しい。`SV-7` の末尾「⛔ フィルタの外を押しても閉じてはならない（MUST NOT）」。閉じる道は `Esc`（`frame-loop.ts` の `windowPlacesAfterEscape`）と同じ列の `IC-122` だけ | ⛔ の段を替える。押下は飲み込まない（表 T-337 の「⛔ UI パーツは、自分の外の押下を止めてはならない」と同じ向き） |
| `DFC-2324`: 値の語「表示に入れた」「入れていない」、名 `SHOW_COLUMN` | 正しい。`display-words.json` の `searchPanel` の `shownValue`（ja「表示に入れた」/ en「Shown」）・`notShownValue`（「入れていない」/「Not shown」）。列の見出しは ja「表示」/ en「Show」。`SHOW_COLUMN` は 3 か所（`search-panel.ts:78`・`search-table-filters.ts:111`・`search-panel-drawing.ts:110`）と `shown-tasks-hold.ts:19` | 語と名をそろえる（E-05・E-06、5 節） |
| `DFC-2328`: 画像に「チェックしたタスクだけを表示（N 件中 M 件）」が入る | 正しい。`IX-11` の ⭐ の文、語は `showOnlyCheckedCaption`、コードは `image-exporter.ts:188` 付近が `S-498` の字で書き込む | 注を書かず、帯の高さも詰める（E-09・E-10） |

### 0.2 裁定の鎖（rulings.md を「フィルタ」「絞り込み」「列の幅」「境目」「尻切れ」「最小幅」「枠外」「表示に入れた」「Shown」「SHOW_COLUMN」「緑」「S-183」「絵の注」「帯」「IX-11」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1354` | 列の幅と窓の幅の両方を変えられる | 保つ。担当リストへ広げるのは `CR-722` |
| `JDG-1355` | 中身の字の幅が決まる列は切られない最小の幅 | 保つ。`JDG-1802`・`JDG-1810` がその都度測る形へ強めた |
| `JDG-1353` | 枠外では閉じない | 覆された（`JDG-1808`）—— 本書が文を替える |
| `JDG-1383` | 絞った絵 ＋ 1 行の注 | 覆された（`JDG-1823`）—— 本書が `IX-11` を替える |
| `JDG-1801` の 12px | 下限 12px | 覆された（`JDG-1820`）—— 下限はフィルタマークの幅 |
| `JDG-1819` | クリアは列のフィルタと並べ替えだけ。語・Visibility・目は変えない。戻すものが無いあいだは効かない | 本書の `IC-153` |
| `JDG-1822` | G1（`S-183` で塗り、字とマークを地の色で） | 本書の `SV-7` の追記 |
| `JDG-1807` | 並べ替えだけの列は緑にしない | 同上 |
| `JDG-1825` の後半 | 帯の高さを空けず、帯が無いものとして上から組む | 本書の `IX-11`・`EP-24` |

覆す裁定は、上の 3 つのほかに無い（3 つとも rulings.md の状態の欄は既に「覆された」）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-006`（横断の作法）—— 3 つの表の窓が同じ作法で列を扱い、どこでフィルタを掛けているかが見出しから読める。
- `GL-004`（渡す絵）—— 画像に画面だけの帯の語を焼き付けない。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 幅の下限と既定の幅の測り方は `SV-18` の 1 か所に書き、`RW-9` と（`CR-722` の）担当リストは「`SV-18` と同じ」と指す。設定値の行は値を持たず、規則を指す。
- `R1.4`（境界）—— 「外」とはフィルタのドロップダウンの箱の外であり、開いた列の見出しのセル（`IC-122`）は外に数えない（そこでの押下は今どおり閉じるだけ）。
- `R2.21`（判じは 1 か所）—— 既定の幅を選ぶ判じは `search-panel-drawing.ts` の `columnWidthPx` の 1 つに残し、測った値の入れ物をそこが読む。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 幅の下限（`S-425`）は、見出しのセルの `IC-122` の箱の幅 ＋ セルの左右の詰め（0.25em ずつ）＋ 罫 1px を、そのときの字の段で測った値とする。Visibility の列は今どおり固定の幅（`S-496`）で、境目を持たない | `JDG-1820`（下限はマークの幅）。`CR-660` の 7 節が `IC-122` の最小幅を (16 ＋ (4 ＋ 1) × 2) × 0.6667 px と測っており、9px の段で約 23px、12px の段で約 25px になる —— 利用者の「約 20px」と合う | 段ごとに下限が少し変わる（段を上げると下限が 2px ほど上がる）。下限を割った列は、段を変えたときに下限まで広げる |
| X-2 | 既定の幅を測る列は、今と同じ「中身の字の幅が決まる列」（検索: `SQ-5`・`SQ-11`・`SQ-3`・`SQ-4`・`SQ-12`・`SQ-13`・`SQ-9`、レポート: `DT-1`・`DT-3`・`DT-5`・`DT-6`）。測る相手は見出し（語 ＋ `IC-122`）と、その表がいま持つすべての行の値（一覧に出ていない行を含む）。状態の列は辞書の語のすべて（行に無い状態も） | `JDG-1810`（開いたとき・段を変えたとき・言語を変えたとき）。行の値で測るのは、日付の数字の幅が書体で違い、「切られない」を値そのもので確かめるため。状態の語をすべて測るのは、診断を出した・閉じたで幅が跳ねないため | 3 つの時のほかは測り直さない —— 窓を開いたまま行が増えて長い値が来れば、次に開くまで省略記号で切られうる |
| X-3 | 引いて変えた列は、測り直しても変えない（今の `columnWidths` に入っている列） | `JDG-1810` | 無い |
| X-4 | 外を押したときに閉じるのは、押下がフィルタの箱の外に落ちたとき。押下はそのまま、押した先（日程表・ほかの窓・ヘッダー・同じ窓の別の所）が受ける —— 別の列の `IC-122` なら、その列のフィルタに替わる（今の「開いているフィルタは一度に 1 つ」の答えと同じ） | `JDG-1808`（閉じて、押した先にも効かせる） | 打ちかけの検索欄の語は捨てる（今の「閉じると捨てる」のまま） |
| X-5 | クリアの入口（`IC-153`）の図形はフィルタマークに × を重ねたもの（見本 `previous-project-result/48-table-surfaces/` の `clear`）。戻すものとは、その表の列のフィルタ（値の印・いつから・いつまで）と並べ替え。開いているフィルタがあれば閉じる。列の幅は戻さない | `JDG-1805`・`JDG-1819` | 列の幅を既定へ戻す入口は無いまま（今も無い） |
| X-6 | 検索パネルではクリアの入口を `IC-143` のすぐ左に置く。遅延診断レポートでは、本書の時点では目が無いので、面の名の右に置く（`CR-722` が目をそのすぐ右に足す） | `JDG-1805`。本書を `CR-722` より先に当てられるように | 本書と `CR-722` のあいだ、レポートのクリアの入口の右には何も無い |
| X-7 | クリアは、検索パネルではタスクの表とコメントボックスの表の両方の列のフィルタと並べ替えを戻す（1 つの窓に 1 つの入口） | 見出しの行は 2 つの表で 1 つ（`SV-1`）。`S-420` も 2 つの表のフィルタを 1 つの値で持つ | 出していない方の表のフィルタも消える |
| X-8 | 緑（G1）にするのは、値の印を 1 つでも外した列と、「いつから」か「いつまで」を置いた列。並べ替えだけの列は塗らない。塗りは見出しのセルの全体で、字と `IC-122` の絵と縁は地の色（`S-146`）。Visibility の列の見出しも同じ規則（値の一覧で外した値があれば緑） | `JDG-1806`・`JDG-1807`・`JDG-1822` | 無い |
| X-9 | 値の語は ja「表示」／「非表示」、en「Show」／「Hide」。列の見出しは ja「表示」のまま、en を「Visibility」にする。並べ替えの昇順は 表示 → 非表示 | `JDG-1804`・`JDG-1817`。⚠️ 辞書は「利用者が書く」（`display-words.json` の `$comment`）—— en の見出しと値は `JDG-1817` の語そのもの | 無い |
| X-10 | 画像の書き出しでは帯の語を書かず、帯の高さも使わない —— 日程表を、帯が無いときと同じ位置から組む。絵は画面のとおりスケジュールフィルタを掛けたまま。帯は 表 T-076 に「描かない・場所を詰める」の行を持つ | `JDG-1823`・`JDG-1825`。表 T-076 の「⇒ 表 T-103 の `U-` 行は、本表に行を持つか…」に `U-67` が漏れていた | `IX-5` の理由（一部だけ載った絵は、載っていないことが読めないまま渡る）は、帯の語が無くても絵がスケジュールフィルタを掛けたままなので当たる —— 利用者が承知のうえで選んだ（`JDG-1823`） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| クリアの入口 | `docs/spec/01-04-requirements.md` の 表 T-330 の `SV-1`、表 T-346 の `RW-2` | E-01・E-02 |
| 外を押して閉じる・緑の見出し | 同 `SV-7` | E-03 |
| Visibility の値の並べ替えの語 | 同 `SV-8` | E-04 |
| 幅の下限と既定の幅を測る | 同 `SV-18`、表 T-346 の `RW-9` | E-07・E-08 |
| 画像に帯を描かない | 同 `FR-025` の 表 T-241 の `IX-11`、`FR-080` の 表 T-076（新しい行） | E-09・E-10（E-11 は欠番） |
| 新しい入口の行 | `docs/spec/_assets/tbl-glossary.md` の 表 T-109（`IC-153`）と図 F-019 | E-12 |
| 辞書の語 | `docs/spec/_source/display-words.json`（`searchPanel` の 2 項の改名と語、`searchColumns` の `SQ-10` の en、`showOnlyCheckedCaption` を消す、`IC-153` の札と説明） | E-05・E-06 |
| 設定値 | `docs/spec/_source/settings.json`（`S-425`・`S-468`〜`S-470`・`S-474`・`S-475`・`S-477`・`S-479`・`S-480`・`S-500`〜`S-502` の既定と注、`S-498` の注） | E-13・E-14 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行（版は当てる日の最後の次） | E-15 |

数（予測）: 要求 ±0。表 ±0。表 T-109 の行 +1（`IC-153`）。表 T-076 の行 +1（`EP-24`）。辞書の項 +1（`IC-153`）、−1（`showOnlyCheckedCaption`）。設定値の行 ±0（値の欄が 12 行で「測る」に替わる）。`（MUST）` +2（E-03 の外の押下・E-07 の測り直し）、`（MUST NOT）` ±0（E-03 の ⛔ を外し、E-09 で 1 つ足す）。
⚠️ 当てて測った数: `（MUST）` は +3（1754 → 1757）—— 予測は E-03 の緑の文の「描くこと（MUST）」を数え落としていた。`（MUST NOT）` は ±0（939）。ほかは予測のとおり。

---

## 2. 新しい識別子（仮の名。当てるときの番号に替える）

| 仮の名 | 表 | 何 |
|---|---|---|
| `IC-153` | 表 T-109 | 面 `Search Panel` / `Delay Diagnostics Report`、群 —、「その表のすべての列のフィルタをクリアし、並びを既定の並び（`SV-8`）へ戻す。語・表示の列の値・目は変えない。戻すものが無いあいだは効かない」、正 `FR-151` の 表 T-330 の `SV-1` |
| `EP-24` | 表 T-076 | `Show Only Checked Bar`（`U-67`）—— 描かない。⭐ 場所を詰める |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `SV-7` の「⭐ 開いているフィルタは、同じ列の `IC-122` をもう一度押すか、`Esc`（`SV-14`）で閉じる。<br>⛔ フィルタの外を押しても閉じてはならない（MUST NOT） —— 利用者は、検索や診断の結果を見ながら日程表のタスクを操作する（利用者が定めた）」 | E-03 の 3 文（同じ列の `IC-122`・`Esc`・外の押下で閉じ、外の押下は押した先にも効く） |
| `SV-8` の「[表示] の列（`SQ-10`）の昇順は 表示に入れた → 入れていない、降順はその逆」 | 「表示の列（`SQ-10`）の昇順は 表示 → 非表示、降順はその逆」 |
| `SQ-10` のフィルタの欄「値の一覧（「表示に入れた」「入れていない」）」 | 「値の一覧（「表示」「非表示」）」 |
| `SV-18` の「既定の幅 … 表 T-333 のどの段でも、どちらの言語でも、値も見出し（語と `IC-122`）も省略記号で切られない最小の幅とする（利用者が「尻切れない最小幅」と定めた）。<br>測り方は 表 T-206 の各行の注が持つ」 | E-07 の測る規則（そのときの言語と段で、開いたとき・段を変えたとき・言語を変えたときに測る） |
| `SV-18` の「幅の下限は `S-425`」 | 「幅の下限は `S-425`（見出しの `IC-122` とセルの詰めが入る幅を、そのときの段で測る）」 |
| `RW-9` の「中身の字の幅が決まる列（`DT-1`・`DT-3`・`DT-5`・`DT-6`）の既定は、`SV-18` と同じく測った最小の幅とする」 | 「…の既定は、`SV-18` と同じ規則で測る」 |
| `IX-11` の「⭐ 絵の上端に「チェックしたタスクだけを表示（N 件中 M 件）」… 書き込むこと（MUST） —— `IX-5` の理由 … がここにも当たる」 | E-09（帯の語を書かず、帯の高さを詰める） |
| `S-498` の「スケジュールフィルタの帯（`U-67`）と絵の注（`FR-025` の 表 T-241 の `IX-11`）の字の大きさ」 | 「スケジュールフィルタの帯（`U-67`）の字の大きさ」 |
| `S-425` の既定 `64px 🔎` と注「値は触れる見本 … の初めの値である」 | 既定「測る（`SV-18`）」、注は E-13 |
| `S-468`〜`S-470`・`S-474`・`S-500`〜`S-502`・`S-475`・`S-477`・`S-479`・`S-480` の既定（99・105・152・70・73・89・95・138・73・142・142 px） | 既定「測る（`SV-18`）」、注は E-14 |
| 辞書 `searchPanel` の `shownValue`（表示に入れた / Shown）・`notShownValue`（入れていない / Not shown） | `showValue`（表示 / Show）・`hideValue`（非表示 / Hide） |
| 辞書 `searchPanel` の `showOnlyCheckedCaption` | 消す（絵に注を書かない） |
| 辞書 `searchColumns` の `SQ-10` の en「Show」 | 「Visibility」 |
| コード `SHOW_COLUMN`（4 か所）・`SHOWN_SEARCH_VALUE`・`NOT_SHOWN_SEARCH_VALUE`（値 `'shown'`・`'notShown'`） | `VISIBILITY_COLUMN`・`SHOW_VALUE`（`'show'`）・`HIDE_VALUE`（`'hide'`） |

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
### E-01 —— 表 T-330 の `SV-1`

「左から、面の名（`FR-038` の辞書）・タスクの表の入口 `IC-118`・コメントボックスの表の入口 `IC-119`・スケジュールフィルタの入口 `IC-143`（…）。」を替える:

```text
左から、面の名（`FR-038` の辞書）・タスクの表の入口 `IC-118`・コメントボックスの表の入口 `IC-119`・列のフィルタと並べ替えを戻す入口 `IC-153`・スケジュールフィルタの入口 `IC-143`（表 T-353 —— タスクの表を出しているときだけ置き、スケジュールフィルタを掛けているあいだは押された状態を 表 T-237 の `EN-5` で示す）。<br>`IC-153` は、タスクの表とコメントボックスの表のすべての列のフィルタをクリアし、並びを既定の並び（`SV-8`）へ戻し、開いているフィルタを閉じる —— 語・表示の列の値・`IC-143` は変えない。<br>列のフィルタも並べ替えも掛かっていないあいだは、`IC-153` を効かなくする（`FR-092`）。
```

（右端の段・面の名の字・掴む帯・題の行の段の文は変えない。）

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
### E-02 —— 表 T-346 の `RW-2`

「左端は面の名（辞書）。」の後に足す:

```text
面の名の右に `IC-153`（`SV-1` と同じ入口・同じ振舞い —— 戻すのはレポートの表の列のフィルタと並べ替え）。
```

（「`SV-1` のタスクの表とコメントボックスの表の入口 … とスケジュールフィルタの入口（`IC-143`）は置かない」の文は本書では変えない —— `CR-722` が替える。）

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
### E-03 —— 表 T-330 の `SV-7`（末尾の 2 文を替え、緑の文を足す）

「⭐ 開いているフィルタは、…`Esc`（`SV-14`）で閉じる。<br>⛔ フィルタの外を押しても閉じてはならない（MUST NOT） —— …（利用者が定めた）」を替える:

```text
⭐ 開いているフィルタは、同じ列の `IC-122` をもう一度押すか、`Esc`（`SV-14`）か、フィルタの箱の外を押すと閉じる。<br>外を押して閉じたときは、その押下を押した先（日程表のタスク・ほかの窓・`App Header`・同じ窓のほかの所）にも渡すこと（MUST） —— 閉じるためだけに押下を飲み込むと、検索や診断の結果を見ながら日程表のタスクを操作する手が 1 回ずつ空振りする（利用者が定めた）。<br>⭐ 列のフィルタを掛けている列 —— 値の一覧の印を 1 つでも外した列か、「いつから」か「いつまで」を置いた列 —— の見出しのセルは、`_assets/tbl-settings.md` の 表 T-236 の `S-183` で塗り、語と `IC-122` の絵を `S-146`（地の色）で描くこと（MUST） —— どの列にフィルタを掛けているかを見出しから読める（利用者が定めた）。<br>並べ替えだけを掛けた列の見出しは塗らない —— 緑は列のフィルタだけの合図である（利用者が定めた）。
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
### E-04 —— 表 T-330 の `SV-8` と 表 T-331 の `SQ-10`

3 節の 2 行のとおり。

<!-- EDIT id=E-05 file=docs/spec/_source/display-words.json -->
### E-05 —— 辞書の Visibility の語（`JDG-1804`・`JDG-1817`）

| 項 | ja | en |
|---|---|---|
| `searchPanel` の `showValue`（旧 `shownValue`） | 表示 | Show |
| `searchPanel` の `hideValue`（旧 `notShownValue`） | 非表示 | Hide |
| `searchColumns` の `SQ-10` | 表示（変えない） | Visibility |
| `searchPanel` の `showOnlyCheckedCaption` | 消す | 消す |

<!-- EDIT id=E-06 file=docs/spec/_source/display-words.json -->
### E-06 —— `IC-153` の札と説明

`icons` に 1 項。語は利用者が決めた（`$comment` の「EVERY ENTRY IS WRITTEN BY THE USER」。11 節の問い 1、`JDG-1778`・`JDG-1854`）—— 札 ja「フィルタをクリア」／ en「Clear filters」、説明 ja「この表のすべての列のフィルタをクリアし、並びを元の順に戻す」／ en「Clear every column filter in this table and put the rows back in their original order」。

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
### E-07 —— 表 T-330 の `SV-18`

「⭐ 中身の字の幅が決まる列（…）の既定は、表 T-333 のどの段でも、どちらの言語でも、値も見出し（語と `IC-122`）も省略記号で切られない最小の幅とする（利用者が「尻切れない最小幅」と定めた）。<br>測り方は 表 T-206 の各行の注が持つ。」を替える:

```text
⭐ 中身の字の幅が決まる列（ステータス・進捗・日付 —— `SQ-5`・`SQ-11`・`SQ-3`・`SQ-4`・`SQ-12`・`SQ-13`・`SQ-9`）の既定は、そのときの言語（`FR-038`）と字の段（`SV-16`）で、見出し（語と `IC-122`）も値も省略記号で切られない最小の幅とすること（MUST）（利用者が「尻切れない最小幅」と定めた）。<br>測る相手は、見出しと、その表がいま持つすべての行の値（一覧に出ていない行を含む）とし、状態の列（`SQ-5`）は表 T-019a と 表 T-315 の `DG-2` の語のすべてとする。<br>測るのは、窓を開いたとき・`IC-127` で段を変えたとき・表示の言語を変えたときだけとし、ほかの時には測り直さない —— 行が変わるたびに列の幅が動くと、読んでいる所が横へ跳ねる。<br>引いて変えた列は測り直さず、変えた幅を保つ。<br>セルの形（左右の詰め・罫）は `SV-17` の描き方のままで測る。
```

「幅の下限は `S-425`。」を替える:

```text
幅の下限は `S-425` —— 見出しのセルに `IC-122` の箱と、セルの左右の詰めと罫が入る幅を、そのときの段で測った値である（利用者が「フィルタマークの幅」と定めた）。<br>段を変えて下限が列の幅を超えたときは、列を下限まで広げる。
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
### E-08 —— 表 T-346 の `RW-9`

3 節の行のとおり（「`SV-18` と同じ規則で測る」）。

<!-- EDIT id=E-09 file=docs/spec/01-04-requirements.md -->
### E-09 —— `FR-025` の 表 T-241 の `IX-11`

行の定めを替える:

```text
スケジュールフィルタ（`FR-151` の 表 T-353）を掛けているあいだの絵は、画面のとおりスケジュールフィルタを掛けた絵とする（`FR-080`）。<br>⛔ 絵にスケジュールフィルタの帯（`_assets/tbl-glossary.md` の `U-67`）の語を書き込んではならない（MUST NOT） —— 帯はパレットや窓と同じく画面だけのものである（利用者が定めた）。<br>⭐ 帯の高さも絵に残さず、帯が無いときと同じ位置から日程表を組むこと（MUST） —— 帯の分を空けると、日程の上に何も無い帯が残る（利用者が「詰めろ」と定めた —— `FR-080` の 表 T-076 の `EP-24`）。<br>⚠️ 表 T-024 の `IO-1`・`IO-2`・`IO-7`（交換形式）はスケジュールフィルタに依らず全部のタスクを出す
```

⚠️ `MUST` の数は ±0（旧の「書き込むこと（MUST）」を外し、「組むこと（MUST）」を足す）、`MUST NOT` は +1。

<!-- EDIT id=E-10 file=docs/spec/01-04-requirements.md -->
### E-10 —— `FR-080` の 表 T-076 に 1 行（`EP-23` の後）

```text
| EP-24 | `Show Only Checked Bar`（`U-67`） | 描かない | スケジュールフィルタを掛けているあいだだけ画面に出す帯であり、日程ではない（`FR-025` の 表 T-241 の `IX-11`）。<br>⭐ **場所を詰める** —— 帯は `Schedule Canvas` を下げて出る（`FR-151` の 表 T-353 の `TV-11`）ので、空けると日程の上に何も無い帯が残る。<br>帯が無いときと同じ位置から組む |
```

### E-11 —— （欠番）表 T-353 の `TV-11` は変えない

帯が画像に載らないことは `IX-11` と `EP-24` の 2 か所だけが持つ。⛔ `TV-11` から `IX-11` を指さない —— 今 `FR-151` は `FR-025` を指しておらず（`FR-025` → `FR-151` の片向き）、指すと 2 つの要求のあいだに新しい輪ができる（6 節）。

<!-- EDIT id=E-12 file=docs/spec/_assets/tbl-glossary.md -->
### E-12 —— 表 T-109 に `IC-153`、図 F-019 に図形

2 節の行。並びは `IC-143` の前。図形は見本 `previous-project-result/48-table-surfaces/table-marks-sample.html` の `clear`（`IC-122` のフィルタマークに × を重ねる）を `fig-icons.svg` と `icon-glyphs.json` に写す（図の生成の手順は `IC-143` を足した `CR-661` と同じ）。

<!-- EDIT id=E-13 file=docs/spec/_source/settings.json -->
### E-13 —— `S-425`

| 欄 | 新 |
|---|---|
| 意味 | 検索の表・遅延診断レポートの表・担当リストの表の列の幅の下限（`FR-151` の 表 T-330 の `SV-18`、`FR-134` の 表 T-346 の `RW-9`） |
| 既定 | 測る（`SV-18`） |
| 注 | 窓の見せ方であり、日程の内容ではないので保存しない。<br>⭐ 見出しのセルに `IC-122` の箱（`CR-660` の 7 節が測った最小幅）と、セルの左右の詰め（0.25em ずつ）と罫 1px が入る幅を、そのときの字の段（`S-429`）で測る —— 利用者が「フィルタマークの幅」と定めた（9px の段で約 23px）。<br>⛔ px の定数を置かない —— 詰めは字の段に従う |

（担当リストは `CR-722` が意味の欄に足す。本書の時点では「担当リストの表」を書かず、検索とレポートだけを書く。）

<!-- EDIT id=E-14 file=docs/spec/_source/settings.json -->
### E-14 —— 測る列の既定の幅 11 行

`S-468`・`S-469`・`S-470`・`S-474`・`S-500`・`S-501`・`S-502`・`S-475`・`S-477`・`S-479`・`S-480` の既定を「測る（`SV-18`）」に、注を「検索パネルの見せ方であり、日程の内容ではないので保存しない。<br>⭐ そのときの言語と字の段で、見出しも値も切られない最小の幅を測る（`SV-18` —— 利用者が「その時の言語と字の段で、その都度最小」と定めた）。<br>⚠️ 前の固定の値（`CR-660` の 7 節、3 段 × 2 言語の最大）は日本語の小さい段で広すぎた」に替える（レポートの 4 行は「遅延診断レポートの窓の見せ方…（`S-451`）」の頭のまま）。`S-466`・`S-467`・`S-471`〜`S-473`・`S-476`・`S-478`・`S-481`（長さの決まらない列）は変えない。

⚠️ `settings_json_to_md.py` と `tools/generate_entity_types.py` が「測る」を数でない既定として通すかを当てる体が確かめる —— 通らなければ、`S-427`（`未定 🔎`）の行が数でない既定を持つ前例に倣う。`NOT_STORED_SEARCH_PANEL_SIZES`（`dom-screen-surface.ts:1446`）は手書きの写しなので、当てる体がその 12 鍵を外す（5 節）。

<!-- EDIT id=E-15 file=docs/development-records/changelog.md -->
### E-15 —— 変更履歴に 1 行

版は当てる日の最後の次（ぶつかれば調整役が付け直す）。

### 4.1 生成物

`npm run gen` が `docs/spec/_assets/tbl-settings.md`・`src/adapter/screen-renderer/display-words.json`・アイコンの名簿（`icon-roster.json`）を刷る。手で直さない。

---

## 5. 継ぎ目（コード）—— `945a244f` の行

| ファイル | 変えるもの | 体 |
|---|---|---|
| `src/adapter/screen-renderer/search-panel.ts` | `SHOW_COLUMN` → `VISIBILITY_COLUMN`（78 行）、`SHOWN_VALUE_PARTS` の語の鍵を `showValue`・`hideValue` へ。題の行の入口に `IC-153` を足す（`IC-143` の前）。新しい関数 `searchPanelWithTableViewsCleared(panel)`（`filters.columns` を空、`filters.open` を `null`、`sort` を `null` に。ほかは変えない）。見出しのセルの見え方に `isFiltered`（X-8）を `SearchColumnView` で運ぶ | 体 A |
| `src/adapter/screen-renderer/search-table-filters.ts` | `SHOW_COLUMN` → `VISIBILITY_COLUMN`（111 行）、`SHOWN_SEARCH_VALUE`・`NOT_SHOWN_SEARCH_VALUE` → `SHOW_VALUE`（`'show'`）・`HIDE_VALUE`（`'hide'`） | 体 A |
| `src/adapter/screen-renderer/table-window.ts` | `SearchColumnView` に `isFiltered: boolean`（値の印を外した値が 1 つ以上、または `from`・`to` のどちらかが `null` でない）。`tableColumnsOf` が詰める。`windowTitleEntriesOf` に `IC-153` の入口（効くかは「フィルタか並べ替えがあるか」）。新しい `tableWithViewsCleared(panel)`（`searchPanelWithTableViewsCleared` と同じ中身の総称） | 体 A |
| `src/adapter/screen-renderer/delay-diagnostics-report.ts` | 題の行の入口に `IC-153`（面の名の右）。`delayDiagnosticsReportAfterEntry` が `IC-153` で `tableWithViewsCleared` を当てる | 体 A |
| `src/adapter/image-exporter/image-exporter.ts` | `filterCaptionSvg`（186 行）とその呼び出し（217 行）を消す。`NOT_STORED_SHOW_ONLY_CHECKED_BAR_SIZES` の写しから `S-498` の使い道が無くなれば外す | 体 A |
| `src/adapter/screen-renderer/screen-renderer.ts` | `showOnlyCheckedCaption`（585 行の型・787 行の値）を消す | 体 A |
| `src/framework/dom-screen-surface/search-panel-drawing.ts` | `SHOW_COLUMN` → `VISIBILITY_COLUMN`（110 行）。`columnWidthPx` は `column.width ?? measuredDefaultWidth(column)` を返し、測る列でない列は今どおり 表 T-206 の行。新しい `measureDefaultColumnWidths(host, table, language, fontPx)`（X-2 の相手を見えない箱で組んで測る。結果は (表・言語・段) を鍵に持つ）。幅の床（577〜578 行）は `S-425` の定数でなく `measuredWidthFloor(fontPx)`。見出しのセルを `isFiltered` で `S-183` に塗る（字と絵は `S-146`） | 体 B |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` | `NOT_STORED_SEARCH_PANEL_SIZES` から `S-425` と測る 11 列の鍵を外す（`SEARCH_COLUMN_WIDTH_ROWS` の当たる 11 行も）。手書きの写しの残りは変えない | 体 B |
| `src/framework/single-html-shell/frame-loop.ts` | 書き出しの絵の組み（`exportScene`、2747 行）の区画を、帯の高さを 0 として組む —— 画面の区画は `environmentForRegionsOf`（1124 行）が `topBandHeight` に `S-497` を入れて下げているので、書き出しの区画だけ 0 を渡す（X-10、`EP-24`）。押下の振り分けの入口で、開いているフィルタがあり、押下がその箱の外なら、`searchPanelWithFilterClosed` ／ `delayDiagnosticsReportWithFilterClosed` を当ててから、同じ押下を今どおり振り分ける（飲み込まない）。`IC-153` の押下を `searchPanelWithTableViewsCleared` ／ `delayDiagnosticsReportAfterEntry` へ渡す | 体 B |
| `src/framework/single-html-shell/shown-tasks-hold.ts` | `SHOW_COLUMN` → `VISIBILITY_COLUMN`（19 行） | 体 B |

⭐ 体 A と体 B の継ぎ目の名（2 つの指示に逐語で書く）: `VISIBILITY_COLUMN`・`SHOW_VALUE`・`HIDE_VALUE`・`SearchColumnView.isFiltered`・`tableWithViewsCleared`・`searchPanelWithTableViewsCleared`・`IC-153`（当てた番号）。

毎フレームの経路: **はい** —— `columnWidthPx` は窓を描くたびに呼ばれ、見出しのセルの塗りも描くたびに決まる。測るのは 3 つの時だけで、描くときは持っている値を読むだけにする。`perf-pending.md` に 1 行（検査 66）。

### 5.1 既存の試験で、古い振る舞いを主張しているもの（実装の体が付け替える）

`945a244f` で、本書が替える文・語・値を引く試験（`git grep` の当たり。中身は当てる体が読む）:

- 外を押しても閉じない（`SV-7` の ⛔）: `tests/contract/dfc-1362-search-column-filter.contract.test.ts`、`tests/system/cr-660-the-two-table-windows-on-the-shipped-build.test.ts`、`tests/contract/cr-660-the-two-tables-lead-with-status-and-filter-like-excel.contract.test.ts` —— 当たる場合を「閉じ、押した先も受ける」へ。
- 「表示に入れた」「入れていない」「Shown」: `tests/contract/display-words.contract.test.ts`、`tests/contract/cr-571-search-table-filters.contract.test.ts`、`tests/contract/cr-571-search-panel-view.test.ts`、`tests/system/cr-661-show-only-the-checked-tasks-on-the-shipped-build.test.ts`。
- 絵の注（`showOnlyCheckedCaption`・`IX-11`）: `tests/contract/cr-661-only-the-checked-tasks-are-laid-and-drawn.contract.test.ts`、`tests/system/cr-661-show-only-the-checked-tasks-on-the-shipped-build.test.ts`。
- `S-425` の 64・固定の既定の幅: `tests/contract/cr-660-the-two-tables-lead-with-status-and-filter-like-excel.contract.test.ts`、`tests/contract/dfc-1361-the-search-table-header-stays-on-top.contract.test.ts`。

---

## 6. グラフ（`945a244f` の上、`impact.py FR-151 FR-134 T-330 T-331 T-346 T-241 T-076 SV-7 SV-18 SQ-10 RW-2 RW-9 IX-11 TV-11 S-425 S-468 S-470 S-475 S-498 GR-28 IC-122 IC-143`）

- `SV-7` を指すのは要求 4 件・10 か所、`SV-18` は 3 件・10 か所、`SQ-10` は 2 件・10 か所、`GR-28` は 4 件・8 か所、`IC-122` は 2 件・7 か所、`S-425` は 1 件・4 か所、`IX-11` は 1 件・2 か所、`TV-11` は 1 件・4 か所、`RW-2` は 1 件・2 か所、`RW-9` は 1 件・4 か所。
- 仕様の中のどの指しも、E-03・E-07・E-09 で替える文を逐語で引かない（`GR-28` の「掴めば境目の左の列の幅を変える（`SV-18`、`RW-9`）」は形のまま当たる）。
- 新しく指す辺: `SV-7` → `S-183`・`S-146`（表 T-236。`FR-029` の 表 T-237 が既に指す向き）、`IX-11` → `EP-24`、`EP-24` → `TV-11`・`IX-11`、`SV-1` → `IC-153`。どれも 要求 → 表 → 設定値 の向きで、新しい輪を作らない —— `EP-24`（`FR-080`）→ `IX-11`（`FR-025`）は、`FR-080` ↔ `FR-025` が今すでに両向きに指し合う辺の中に入る。⛔ `TV-11`（`FR-151`）から `IX-11` を指さない（E-11）—— `FR-151` → `FR-025` の向きは今 0 本であり、足すと `FR-025` → `FR-151`（`IX-11` → 表 T-353）と輪になる。

---

## 7. 数（実測、`945a244f`）

- 表 T-330 の行 18、表 T-346 の行 10、表 T-241 の行 16、表 T-076 の行 23（最大 `EP-23`）、表 T-109 の最大 `IC-143`、設定値の最大 `S-542`。
- 既定の幅を固定の値で持つ測る列 11（検索 7・レポート 4）。長さの決まらない列 8。
- `SHOW_COLUMN` を名乗る所 4（`search-panel.ts:78`・`search-table-filters.ts:111`・`search-panel-drawing.ts:110`・`shown-tasks-hold.ts:19`）。
- 古い振る舞いを引く試験 9 ファイル（5.1）。

---

## 8. 波・持ち場・見積り

| 波 | 持ち場（重ならない） | 中身 | 体 | 見積り |
|---|---|---|---|---|
| W0 | 調整役 | 番号（`IC-153` ほか）と変更履歴の版を渡す（11 節の問い 1 の語は `JDG-1778`・`JDG-1854` で決まった） | — | — |
| W1 | `docs/spec/01-04-requirements.md`・`_assets/tbl-glossary.md`・`_assets/fig-icons.svg`・`_source/settings.json`・`_source/display-words.json`・`src/framework/dom-screen-surface/icon-glyphs.json`・`changelog.md`・生成物 | E-01〜E-15、`npm run gen`、`strictdoc export docs/spec && rm -rf output` | 仕様の体 1 つ | 1.5 時間 |
| W2a | 5 節の「体 A」の 6 ファイル（`src/adapter/`） | 5 節 | 実装の体 A | 2 時間 |
| W2b | 5 節の「体 B」の 4 ファイル（`src/framework/`）・`perf-pending.md` | 5 節 | 実装の体 B | 3 時間 |
| W2c | `tests/` の 5.1 の 9 ファイル | 古い主張の付け替え | 体 A か B のどちらか（調整役が決める） | 1 時間 |
| W3 | `tests/`（新しいファイルだけ） | 9 節の継ぎ目で仕様だけを読む試験 | 試験の体 | 2 時間 |

- W2a と W2b は継ぎ目の名（5 節の ⭐）を両方の指示に逐語で書けば同時に走れる。W3 は W1 の後、W2 と同時でよい。
- 合わせて約 9.5 時間（体の時間）。検査と統合は調整役の分を含めない。

---

## 9. 仕様だけを読む試験の継ぎ目（試験の体に名指す名）

1. 外の押下（`SV-7`）: 検索パネルで列のフィルタを開き、日程表のタスクの上を押す —— フィルタが閉じ、同じ押下でそのタスクが選ばれる（`frame-loop` の押下の振り分け、`searchPanelWithFilterClosed`）。別の列の `IC-122` を押すと、その列のフィルタに替わる。
2. 緑（`SV-7`）: 値の印を 1 つ外した列の見出しの塗りが `S-183`、字が `S-146`。並べ替えだけの列は塗らない（`SearchColumnView.isFiltered`、`search-panel-drawing.ts` の見出しのセル）。
3. クリア（`IC-153`）: 2 つの列にフィルタ、1 つの列に並べ替えを掛けて押す —— 列のフィルタと並べ替えが消え、語と表示の列の値は残る。何も掛かっていないときは効かない（`tableWithViewsCleared`）。
4. 幅（`SV-18`・`S-425`）: 段を変えると測る列の既定の幅が変わり、引いた列は変わらない。境目を左へ引き続けても `IC-122` が切られない幅で止まる（`measureDefaultColumnWidths`・`measuredWidthFloor`）。
5. 語（`SQ-10`・`SV-8`）: 表示の列の値の一覧が「表示」「非表示」（en「Show」「Hide」）、見出しの en が「Visibility」。
6. 絵（`IX-11`・`EP-24`）: スケジュールフィルタを掛けているあいだに書き出した SVG に帯の語が無く、日程表の上端がフィルタの無いときと同じ（`image-exporter.ts`）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 表ごとの Visibility・目・赤・担当リストの窓は `CR-722`。本書は表示の列を検索のタスクの表だけのまま扱う（`SQ-10` の意味は変えない —— 値の語だけを替える）。
- 保存（`GRS JSON`）は `CR-723`。本書の値はどれも今どおり画面だけである。
- 列の幅を既定へ戻す入口は足さない（`JDG-1819` が戻すものをフィルタと並べ替えに限った）。
- 帯の語そのもの（「チェックしたタスクだけを表示しています」）は `CR-722` が替える（`JDG-1829`）。
- `U-67` の確定名（`Show Only Checked Bar`）は本書では変えない（`CR-722` の 11 節で問う）。
- 表 T-076 に `Delay Diagnostics Report`（`U-66`）の行が無い（`EP-23` は `Search Panel` だけ）—— `CR-722` が窓の行を 3 つの窓にまとめるときに入れる。

---

## 11. 利用者に問うこと

### 問い 1 —— 新しい入口の札と説明の語 —— 答えた（`JDG-1778`・`JDG-1854`）

**使う場面**: 検索パネルの題の行で、目のアイコンのすぐ左にある、フィルタマークに × を重ねた入口にポインタを合わせたとき、説明（ツールチップ）に出る語。遅延診断レポートと（`CR-722` の後は）担当リストの窓にも同じ入口が出る。

利用者は起草の時の案 B の札を選び、「絞り込み」という語を画面でも仕様でも「フィルタ」にした（`JDG-1778`）。説明の語は、用語の洗い出し（`docs/review/filter-terms-2026-10-10.md`）の問い 5 の答え「並べ替え ／ 元の順」（`JDG-1854`）が、同書の案 A の文に決めた。語の家族の置き換えは `CR-724` が当てた。

| | ja | en |
|---|---|---|
| 札 | フィルタをクリア | Clear filters |
| 説明 | この表のすべての列のフィルタをクリアし、並びを元の順に戻す | Clear every column filter in this table and put the rows back in their original order |

起草の時に示した 3 案（案 A「絞り込みを戻す ／ Reset filters」（推奨）・案 B「フィルタをクリア ／ Clear filters」・案 C「列の絞り込みと並べ替えを解除 ／ Clear filters and sort」）は `docs/development-records/rulings.md` の `JDG-1778` の行が持つ。

⇒ この語を E-06 で辞書に書く。

---

## 12. 台帳（起草で動かしたもの・当てるときに動かすもの）

| 行 | 起草で（本コミット） | 当てたときの扱い |
|---|---|---|
| `DFC-2321` | 詳細状況の欄に「`CR-721`（検索とレポート）と `CR-722`（担当リスト）が当てる（起草）」を足した。状態は `仕様待ち` のまま | 両方を当てたら `実測待ち` |
| `DFC-2322`・`DFC-2323`・`DFC-2324`・`DFC-2325`・`DFC-2326`・`DFC-2328` | 詳細状況の欄に当てる CR の名を足した（`DFC-2324`・`DFC-2325` は `CR-722` も） | `実測待ち`（手順は下） |
| `JDG-1801`・`JDG-1802`・`JDG-1803`・`JDG-1804`・`JDG-1805`・`JDG-1806`・`JDG-1807`・`JDG-1808`・`JDG-1810`・`JDG-1817`・`JDG-1819`・`JDG-1820`・`JDG-1822`・`JDG-1823` | 変えていない（任の外 —— 調整役が「指示 —— `CR-721` が当てる」へ動かす） | `適用済`。着地先は 表 T-330 の `SV-1`・`SV-7`・`SV-8`・`SV-18`、表 T-241 の `IX-11`、`docs/spec/_source/display-words.json` |

利用者の実物での確かめ（当てた後、`JDG-1340` により調整役が頼む）: ① 検索パネルで「ステータス」のフィルタを開いたまま日程表のタスクを押す —— フィルタが閉じ、タスクが選ばれる。② その列で「完了」の印を外す —— 見出しが緑になる。並べ替えだけを掛けた列は緑にならない。③ 字の段を 3 度変える —— ステータスの列の幅が段ごとに変わり、「○進行中」が切られない。④ 列の境目を左へ引き切る —— フィルタマークが見える幅で止まる。⑤ × のフィルタマークを押す —— 緑が消え、並びが元に戻る。⑥ スケジュールフィルタを掛けているあいだに PNG を書き出す —— 帯の語が無く、上に空きが無い。

---

## 13. 測り方の再現

```
# the tree: worktree at 945a244f
git log --all --oneline | grep -E "CR-72[1-9]"          # 0
grep -rn "CR-72[1-9]" --include=*.md .                  # 0
grep -n "フィルタの外を押しても" docs/spec/01-04-requirements.md   # SV-7
grep -n "^| S-425 \|^| S-468 \|^| S-470 \|^| S-475 " docs/spec/_assets/tbl-settings.md
grep -rn "SHOW_COLUMN" src                              # 4 files
grep -n "showOnlyCheckedCaption\|shownValue\|notShownValue" docs/spec/_source/display-words.json
grep -rlE "表示に入れた|入れていない|showOnlyCheckedCaption|S-425|IX-11" tests
python <scratch>/maxids.py                              # T 369, IC 143, S 542, EP 23
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-151 FR-134 T-330 T-331 T-346 T-241 T-076 SV-7 SV-18 SQ-10 RW-2 RW-9 IX-11 TV-11 S-425 S-468 S-470 S-475 S-498 GR-28 IC-122 IC-143
```

---

## 14. 当てた記録（2026-10-10、`81f20d33` の上）

| 何 | 当てたもの |
|---|---|
| 仕様 | 4 節の E-01〜E-10・E-12〜E-15 を文のとおりに当てた。`EP-24`・`IC-153` は 2 節の行。`S-469`・`S-470`・`S-474`・`S-500`〜`S-502` の注は「`S-468` と同じ」、`S-477`・`S-479`・`S-480` の注は「`S-475` と同じ」のまま（指す先の `S-468`・`S-475` の注を E-14 の文にした）。`S-466`・`S-428` の注の「`S-425` と同じく見本の初めの値」は、`S-425` が値を持たなくなったので「触れる見本の初めの値」に直した |
| 図 | 図 F-019 に `IC-153`（見本 `48-table-surfaces` の `clear` の 2 本の線）を足し、`npm run gen` が `icon-glyphs.json` と名簿を刷った |
| 生成器 | `tools/generate_entity_types.py` の `NOT_STORED_SEARCH_PANEL_SIZES` から `S-425` と測る 11 列を外し、`image-exporter.ts` に `NOT_STORED_SHOW_ONLY_CHECKED_BAR_SIZES` を刷らないようにした。`tools/generate_display_words.py` の `SEARCH_PANEL_PARTS` を `showValue`・`hideValue` にし、`showOnlyCheckedCaption` を外した |
| 継ぎ目（5 節の名のとおり） | `VISIBILITY_COLUMN`・`SHOW_VALUE`・`HIDE_VALUE`・`SearchColumnView.isFiltered`・`tableWithViewsCleared`・`searchPanelWithTableViewsCleared`・`IC-153`。⭐ 足した名: `SearchColumnView.widthSamples`（測る列が測る相手の字。測らない列は `null`）・`WindowTable.widthSamplesOf`・`clearEntryOf`・`ColumnSizing`・`measuredWidthFloor`・`measureDefaultColumnWidths`・`ScreenPart.isInFilterMenu`（押下がフィルタの箱の中か） |
| 下限 | `measuredWidthFloor(fontPx)` は DOM を読まず、描き方の定数から組む: `IC-122` の箱（`entranceOuterWidthPx`）＋ セルの左右の詰め 0.25em × 2 ＋ 罫 1px（X-1）。表示の列（`SQ-10`）は `S-496` の固定のまま下限を掛けない |
| 書き出し | 5 節の `frame-loop.ts` の「帯の高さを 0 として組む」は、`81f20d33` で既に `screenExportViewOf` と `spanExportViewOf` が `environmentForRegionsOf(..., false)` を渡していた —— 変えたのは `image-exporter.ts` の注を消すことだけ |
| 規則と検査 | 規則 02 の 5 節の表記の表で「フィルター」「ヘッダ」「マーカ」を 止める にした（調整役が `JDG-1850`・`JDG-1855` を機械に載せた）。検査 32 は、書く綴りが書かない綴りの頭であるとき（「フィルタ」と「フィルター」）にも赤にするよう直し、自己試験に 3 行を足した |
| 台帳 | 12 節のとおり。`DFC-2321` は担当リストの分が残るので `仕様待ち` のまま、`DFC-2322`〜`DFC-2326`・`DFC-2328` は `実測待ち`。`JDG-1802`〜`JDG-1808`・`JDG-1810`・`JDG-1819`・`JDG-1820`・`JDG-1822`・`JDG-1823` は `適用済`、`JDG-1801`・`JDG-1805`・`JDG-1817`・`JDG-1825` は本書の分を `適用済` とし残りを `指示`。`CR-722`・`CR-723` だけが当てる行は「指示 —— `CR-7xx` が当てる」 |
| 検査が求めたもの | 表 T-064（`_source/published-entries.json`）に `searchPanelWithTableViewsCleared` の行を足し、`searchPanelWithFilterClosed`・`delayDiagnosticsReportWithFilterClosed` の注に外の押下を足した（検査 26b）。`RW-2`・`IX-11`・`EP-24` の 3 つの文の切れ目を「——」と `<br>` に直した（検査 46）。`S-425`・`S-468` の注から変更要求の名を外した（検査 7）。`FR-…` の本文の「表 T-109 の 124 行」を 125 にした（検査 9）。⚠️ 検査 39 は 2122 → 2124 で赤のまま —— `SV-7` の緑の「描くこと（MUST）」と `IX-11` の「組むこと（MUST）」を逐語で引く試験は、仕様だけを読む試験の体が書く（9 節の 2 と 6） |
