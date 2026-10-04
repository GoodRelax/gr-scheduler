# CR-660 —— 2 つの表の窓は ステータス・進捗・タスク から並び、絞り込みは Excel のように探して閉じる

> 起草の状態: 当てた（2026-10-04、調整役の統合点 `79d9eaf8` から早送りした作業木）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-660`、裁定の帯 `JDG-1370`〜`JDG-1374`、保留の帯 `PND-728`〜`PND-733`、台帳の帯 `DFC-2055`〜`DFC-2060`、設定の帯 `S-500`〜`S-509`、表の帯 `T-360`〜`T-363`、入口の帯 `IC-150`〜`IC-152` は調整役から受けた。使ったのは `JDG-1370`〜`JDG-1373` と `S-500`〜`S-503` だけ。表 T-331 の行は帯の外 —— 起こす直前に `SQ-` の最大を測って `SQ-9`（`CR-661` が仮に `SQ-10` を持つ）だったので、`SQ-11`〜`SQ-13` を取った（13 節）。
> 閉じるもの: `JDG-1351`〜`JDG-1358`（利用者の 1-1〜1-8）、`JDG-1370`〜`JDG-1373`（その後の答え）、`PND-710`（`JDG-1371`）、`DFC-1941`（窓のマーカーの絵）。狭めるもの: `PND-670`（レポートの既定の幅 —— 字の幅が決まる 4 列を測って決めた）、`DFC-1291`（値の一覧を絞る欄の半分）。
> 覆すもの: `JDG-1229` の「4 列」、`JDG-613` の検索の表の列の組と並び、`JDG-614` の「担当者名列…まで固定表示」（タスクの表）—— どれも `JDG-1356` が既に `覆された` の印を付けた（12 節）。
> ⛔ 触れないもの: `svg-renderer.ts` の重ね順（`CR-662`・`CR-664`）、`tooltips.ts`（`CR-663`）、プロパティパネル。`CR-661`（[表示] の列 `SQ-10`）は本書の後に当てる。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md`。全文は同書を見よ）

| 裁定 | 逐語（抜粋） | 本書での扱い |
|---|---|---|
| `JDG-1351` | 「フィルタ内での検索ができない。…検索によってチェック状態を変えるな。」 | `SV-7` に値の一覧を絞る欄の働きと MUST NOT（E-02）。⇒ 欄は仕様に在ったがコードに無かった（`search-panel-drawing.ts` の `searchFilterMenuElement` が描かない、`DFC-1291`） |
| `JDG-1352` | 「フィルタの操作子が一番下にあるのはダメ。一番上で固定。」 | `SV-7` の操作の段を一番上に固定（E-02） |
| `JDG-1353` | 「アイコン + ESC のみ  枠外では閉じない。」 | `SV-7` に「同じ列の `IC-122` をもう一度押すと閉じる」と枠外の MUST NOT（E-02）。`Esc` は `SV-14` のまま |
| `JDG-1354` | 「両方」（列の幅と窓の幅） | 仕様は両方を既に持つ（`SV-18`・`RW-9`・`SV-11`）。コードも在る（5 節）。⇒ 変える文は無い。実物で確かめる手順を 11 節に |
| `JDG-1355` | 「尻切れない最小幅にしろ。」 | 字の幅が決まる 11 列の既定を測って決めた（E-04・E-10・E-11、7 節） |
| `JDG-1356` | 「…\|ステータス\|進捗\|タスク\|担当\|予定\|実績\|理由\|とし、タスク名までの列は固定し」／「検索の表にも同じ列構成…理由の代わりに最上位までの階層」 | 表 T-347 の行の順（E-06）と `RW-10`（E-07）、表 T-331 の行の順と 3 列を足す（E-05）、`SV-6`（E-01） |
| `JDG-1357` | 「ステータスの先頭にはキャンバスと同じアイコンを付けろ。」 | `SQ-5`・`DT-1`・`RW-4` の書き方（E-05・E-06・E-09） |
| `JDG-1358` | 「タスクは下線青フォントにして…」 | `SQ-1`・`DT-4` の書き方、表 T-236 に `S-503`（E-05・E-06・E-12） |
| `JDG-1370` | （`CR-658` の並び）「このままでよい (Recommended)」 | 本書は変えない。裁定を写すだけ（`CR-658` が当てた 表 T-109 のまま） |
| `JDG-1371` | （`PND-710`）「それぞれの中身のまま (Recommended)」 | 検索の `SQ-5` は表 T-019a の状態 ＋ ボトルネックのまま、レポートの `DT-1` は診断の順のまま。揃えるのは列の名・位置・先頭の絵だけ（E-05） |
| `JDG-1372` | （検索の予定・実績）「2 列のまま」 | 検索の表は 予定開始・予定終了・実績開始・実績終了 の 4 列（E-05） |
| `JDG-1373` | （コメントボックスの表）「列の並びは変えない (Recommended)」 | `SQ-7`〜`SQ-9` の並びと固定（`SQ-7` まで）は変えない。絞り込みと幅の改善は当たる（`SQ-9` の既定の幅も測り直した） |

覆す連鎖は `JDG-1356` の読みの欄が数えた 3 行で、どれも状態の欄に `覆された（一部…CR-660 が当てる）` が既に在る。`rulings.md` を「列の並び」「固定」「絞り込み」「閉じ」「幅」「下線」で引いた —— ほかに食い違う行は 0 だった（`JDG-877` は枠の外を言わない、`JDG-1096` の Q16 は絞り込みの位置だけ）。

### 0.2 ⛔ 当てる前に確かめた 4 つ

**問い 1 —— 検索の表の「進捗」は何か。⇒ `Task.percentComplete`（レポートの `DT-3` と同じ）。** `JDG-613` の 6「状態は進捗じゃなくて進捗マーカーのステータスにせよ」は状態の列の中身を言い、進捗の列を退けていない。`JDG-1356` の答え「同じ列構成」はレポートの `DT-3`（完了率）を含む。

**問い 2 —— 値の一覧を絞る語を、面の外へ返すか。⇒ 返さない。面が自ら一覧を絞り、`IC-125`・`IC-126` の答えにだけ、いま一覧に出ている値を添える（E-13）。** `IF-9` は打ちかけの語を返してよい欄を `SV-2` の 1 つに限る。語を返して描き手が一覧を作り直すと、1 字ごとに絞り込みの箱が作り直され、日本語の変換中の字が切れる。

**問い 3 —— 検索の状態の列に、日程表のどの絵を描くか。⇒ その状態の 表 T-021 の印（未着手 `PM-1a`・進行中 `PM-1`・完了 `PM-2`・中断 `PM-3`）と、ボトルネックは `DG-2` の炎。** 遅れの `PM-4` は描かない —— 列は状態の名を出す列であり（`SQ-5`、`CR-571` の決定 22）、`PM-4` は状態ではなく導出である（表 T-021）。

**問い 4 —— 「青」をどの色で持つか。⇒ 表 T-236 に新しい行 `S-503` を起こし、強調の色 `S-151` の既定の色相 214 の値を写して、色相に追随させない。** `S-151` を継ぐと、利用者がテーマの色相を変えたときに青でなくなる。比は地（`S-146`）に対して 明 8.76 : 1 ／ 暗 7.02 : 1 以上（暗い地は色相で揺れるので 0〜359 の全色相で測った最小）。文字の色（`S-147`）との比は 明 2.03 ／ 暗 2.07 なので、リンクの見分けは下線が担う（`NFR-007`、色だけに頼らない）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-009`**（遅れのうち最優先で対処すべき行を見つける）—— ステータスと進捗を左に置き、日程表と同じ絵で読ませる。⭐ **`GL-006`**（横断）—— 絞り込みの中で値を探せ、閉じる手が見える。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（唯一の正）** —— 列の並びの正は 表 T-331 と 表 T-347 の行の順だけとする（両表の前文に 1 文）。コードの列の並びは 1 か所ずつ（`TASK_SEARCH_COLUMNS`・`DELAY_REPORT_COLUMNS`）。
- **`R2.21`（1 つの仕事は 1 か所）** —— マーカーの形は `schedule-task-figures.ts` の `markerSvg` だけが描く。表の絵は同じ関数を 1 字の箱で呼ぶ（`markerGlyphSvg`）—— 形を写さない（`DFC-1941` の対応案）。
- **`R2.14`（POLA）** —— 絞り込みの閉じ方は「開いた入口をもう一度押す」（入口の行き来）と `Esc`。枠の外では閉じない（利用者の裁定）。
- **`R5`（毎フレームの経路）** —— 表の描き直しは中身が変わったときだけ（`tableKeyOf`）。絞る語は面の中で行の表示を切り替えるだけで、フレームの記述を作り直さない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 値の一覧を絞る語の比べ方は `SV-4` と同じ（`NFKC`・大文字小文字を畳む・一部一致）。比べる相手は一覧に出す語（「（空白）」や状態の語を含む） | 同じ語を 2 か所で違う比べ方で絞らない（`AS-5` の先例） | ひらがなとカタカナは区別する |
| 決定 2 | `IC-125`・`IC-126` は、絞った一覧に出ている値の印だけを変える | Excel の「検索結果をすべて選択」と同じ。絞られて見えない値の印を変えない | 絞る前の全部を入れるには、語を消してから押す |
| 決定 3 | 絞る語は絞り込みを閉じると捨てる（`SV-14` の覚えるものに入れない） | 語は印を付け外しするあいだの道具であり、残すと次に開いたとき一覧が欠けて見える | 同じ列を開き直すと語を打ち直す |
| 決定 4 | 操作の段は上から、値の一覧を絞る欄 → 入口の行（`IC-125`・`IC-126`・`IC-123`・`IC-124`）。日付の列は入口の行だけで、その下に いつから・いつまで | `JDG-1352`「一番上で固定」 | 無い |
| 決定 5 | 同じ列の見出しの語を押したときも、`IC-122` と同じく開いた絞り込みを閉じる | `SV-7` が見出しの語の押下を `IC-122` の押下と同じものとする | 無い |
| 決定 6 | 字の幅が決まる列の既定の幅は、見出し（語 ＋ `IC-122`）と値の両方で切られない最小の幅 | 見出しの切れも尻切れである。⚠️ `SV-18` は見出しの語を切ってよいとするが、既定の幅では切らない | 見出しが長い英語の列（Planned Finish）は値より広い |
| 決定 7 | 疑義・記載漏れと確定（`DT-1`）は、マーカーを持たないので絵を描かず、絵の幅だけ空けて語の頭をそろえる | `RW-6` が同じ 2 つを語だけとする。日程表に絵が無いものに絵を作らない | 無い |
| 決定 8 | 表の絵の大きさは字の 1 字ぶん（`1em` の正方形）、線の太さは日程表のマーカーと同じ比（`markerStroke` ÷ `markerSize`） | 「表の字の大きさに合わせて」（`JDG-1357`） | 字の段 9px では線が 0.5px 程度になる |
| 決定 9 | `readSearchRows`（`AM-25`）の行に、新しい 3 列の値（`percentComplete`・`actualStart`・`actualFinish`）が載る | `AM-25`「検索パネルの 2 つの表と同じ行を返す」。ボトルネック（`PND-711`）は変えない | 返す形が 3 欄増える（減らない） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 横の固定 | `docs/spec/01-04-requirements.md` の 表 T-330 の `SV-6` | E-01 |
| 絞り込みの中身・閉じ方 | 同 `SV-7` | E-02 |
| 列の幅の既定 | 同 `SV-18` | E-04 |
| 検索の表の列 | 同 表 T-331（前文・行の順・`SQ-1`・`SQ-5`・新しい `SQ-11`〜`SQ-13`） | E-05 |
| レポートの表の欄 | 同 表 T-347（前文・行の順・`DT-1`・`DT-4`） | E-06 |
| レポートの固定・語・まとめ・幅 | 同 表 T-346 の `RW-10`・`RW-3`・`RW-4`・`RW-9` | E-07〜E-10 |
| 既定の幅の値 | `docs/spec/_source/settings.json`（表 T-206）の `S-468`〜`S-470`・`S-474`・`S-475`・`S-477`・`S-479`・`S-480`、新しい `S-500`〜`S-502` | E-11 |
| リンクの色 | 同（表 T-236）に新しい `S-503` | E-12 |
| 面の答え | `docs/spec/05-07-design.md` の 表 T-065 の `IF-9` に 1 文 | E-13 |
| 辞書 | `docs/spec/_source/display-words.json` の `searchColumns`（`SQ-5` の語、`SQ-11`〜`SQ-13`）と `searchPanel` の `filterSearch` | J-01 |
| 生成の群 | `tools/generate_entity_types.py` の `NOT_STORED_SEARCH_PANEL_SIZES`（`S-500`〜`S-502`）と `SCREEN_COLOURS`（`S-503` とマーカーの色 10 行） | G-01 |

**数**: 要求の文の `（MUST）` ／ `（MUST NOT）` は 表の升の中で ＋2（`SV-7` の印を変えない・枠の外で閉じない）＋1（操作の段を固定）。表の行 ＋3（`SQ-11`〜`SQ-13`）、設定の行 ＋4（`S-500`〜`S-503`）、辞書の語 ＋4。要求の増減 0。図 0。

---

## 2. 新しい識別子

| 種類 | ID | 測った最大（`79d9eaf8`） | 何 |
|---|---|---|---|
| 表 T-331 の行 | `SQ-11`・`SQ-12`・`SQ-13` | `SQ-9`（`CR-661` が仮に `SQ-10`） | 進捗・実績開始・実績終了 |
| 表 T-206 の行 | `S-500`・`S-501`・`S-502` | `S-493`（`CR-661` が仮に `S-494`・`S-495`） | `SQ-11`〜`SQ-13` の既定の幅 |
| 表 T-236 の行 | `S-503` | 同 | リンクの字の色 |
| 裁定 | `JDG-1370`〜`JDG-1373` | 帯 | 0.1 節 |

コードに: `markerGlyphSvg`（`schedule-task-figures.ts`）、`statusGlyphSvg`・`MARK_COLOUR_ROWS`・`markColourVariableOf`・`isFilterValueListed`（`table-window.ts`）、`TaskSearchRow` の `percentComplete`・`actualStart`・`actualFinish`、`SearchRowView.glyph`、`ScreenPart.searchFilterListed`。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`79d9eaf8`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `SV-6`「タスクの表は `SQ-2` まで」 | `01-04-requirements.md` | 「`SQ-1` まで」 | E-01 |
| `SV-7`「中身は、値の一覧を絞る入力欄・…・`IC-124`。」の並べ方と「絞り込みの中を縦に送る」 | 同 | 操作の段（上に固定）と値の一覧（送る）、絞る語の働き、閉じ方 | E-02 |
| `SV-7`「日付の 2 列は」 | 同 | 「日付の列は」（`SQ-12`・`SQ-13` が加わる） | E-02 |
| `SV-18`「既定は … `S-466` 〜 `S-474`（`SQ-1` 〜 `SQ-9` の順）」 | 同 | 列ごとの行を名指す文と、測った最小の幅の文 | E-04 |
| 表 T-331 の行の順 `SQ-1`〜`SQ-6`、`SQ-5` の見出し「状態」 | 同 | `SQ-5`・`SQ-11`・`SQ-1`・`SQ-2`・`SQ-3`・`SQ-4`・`SQ-12`・`SQ-13`・`SQ-6` の順、見出し「ステータス」 | E-05 |
| 表 T-347 の行の順 `DT-1`〜`DT-7` | 同 | `DT-1`・`DT-3`・`DT-4`・`DT-2`・`DT-5`・`DT-6`・`DT-7` | E-06 |
| `RW-10`「`DT-1` 〜 `DT-4`（ステータス・担当・進捗・タスク）」 | 同 | 「`DT-1`・`DT-3`・`DT-4`（ステータス・進捗・タスク）」 | E-07 |
| `RW-3`「表 T-347 の `DT-1` 〜 `DT-5` の値」 | 同 | 欄を名指して並べる（範囲の読み違いを避ける） | E-08 |
| `S-468` 110・`S-469` 110・`S-470` 150・`S-474` 110・`S-475` 150・`S-477` 110・`S-479` 220・`S-480` 220 と、それらの 🔎 | `settings.json` | 測った値（7 節）と測り方 | E-11 |
| `STATUS_SYMBOLS` の `DEVIATION`（窓に記号の字） | `delay-diagnostics-report.ts` | 窓は絵、記号は Markdown だけ | 5 節 |
| `FIRST_DEFAULT_WIDTH_ROW` の「行の順で数える」読み | `search-panel-drawing.ts` | 列ごとの行の表 | 5 節 |
| 絞り込みの入口の行を値の一覧の後に置く `box.replaceChildren(...choices, entries)` | 同 | 操作の段を先に | 5 節 |
| `tableWithFilterOpened` の「同じ列なら何もしない」 | `table-window.ts` | 同じ列なら閉じる | 5 節 |
| 試験の旧の並び・旧の幅・旧の見出し | `tests/**`（9 節） | 新しい並び・幅・見出し | 9 節 |

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（`SV-6`）—— 横は、タスクの表は `SQ-1`（タスク）まで —— 表 T-331 の並びで ステータス・進捗・タスク の 3 列 —— 、コメントボックスの表は `SQ-7` までを左に固定する。
- **E-02**（`SV-7`）—— 中身は上から 操作の段 と 値の一覧。操作の段は一番上に置き、値の一覧を縦に送っても動かさない（MUST）。操作の段は、値の一覧を絞る入力欄（日付の列には無い）と `IC-125`・`IC-126`・`IC-123`・`IC-124` の行。日付の列は操作の段の下に いつから・いつまで。絞る欄は打つたびに一覧に出す項目を絞る（比べ方は `SV-4`）。⛔ 打った語で印を変えてはならない（MUST NOT）。`IC-125`・`IC-126` は一覧に出ている値だけに効く。語は閉じると捨てる。閉じ方: 同じ列の `IC-122`（見出しの語を含む）をもう一度押すか `Esc`（`SV-14`）。⛔ 枠の外を押しても閉じてはならない（MUST NOT）—— 理由は `JDG-1353`。縦に入らない分は値の一覧を送る。
- **E-04**（`SV-18`）—— 既定は 表 T-331 の列ごとの 表 T-206 の行（`SQ-1`〜`SQ-9` は `S-466`〜`S-474`、`SQ-11`〜`SQ-13` は `S-500`〜`S-502`）。中身の字の幅が決まる列（ステータス・進捗・日付）の既定は、表 T-333 の 3 段と 2 つの言語で、値も見出し（語と `IC-122`）も省略記号で切られない最小の幅とする（測り方は各行の注）。
- **E-05**（表 T-331）—— 前文「列は本表の行の順に左から並べる」。行の順を並べ替え、`SQ-5` の見出しを「ステータス」、書き方に先頭の絵、`SQ-1` に下線と `S-503`、`SQ-11`（進捗、`AT-39`、整数の百分率、値の一覧、並べ替えは数の大小）・`SQ-12`（実績開始、`AT-34`）・`SQ-13`（実績終了、`AT-36`）。
- **E-06**（表 T-347）—— 前文「欄は本表の行の順に左から並べる」。行の順を並べ替え、`DT-1` の窓の書き方に絵の段（`DG-1` は `?`、`DG-2` は炎、`DG-3` は `!!`、`DG-4` は 表 T-021 の `PM-4`、疑義・記載漏れと確定は絵の幅だけ空ける）、`DT-4` に下線と `S-503`。
- **E-07**（`RW-10`）—— `DT-1`・`DT-3`・`DT-4` の 3 列。
- **E-08**（`RW-3`）—— 欄を名指して並べる。
- **E-09**（`RW-4`）—— マーカーの絵は `DT-1` の窓の絵と同じ（疑義・記載漏れと確定は語だけ）。
- **E-10**（`RW-9`）—— 既定の幅の測り方は `SV-18` と同じ。
- **E-11**（表 T-206）—— 7 節の値。注に測り方。
- **E-12**（表 T-236）—— `S-503` リンクの字の色: 明 `#214b82`（hsl(214 59% 32%)）／ 暗 `#7ba7e0`（hsl(214 62% 68%)）、色相に追随しない。
- **E-13**（`IF-9`）—— 列の絞り込みの値の一覧を絞る欄（`SV-7`）の語は返さない。面が自ら一覧を絞り、`IC-125`・`IC-126` の上の点にはいま一覧に出ている値を添えて答える。
- **J-01**（辞書）—— `SQ-5`「ステータス」/「Status」、`SQ-11`「進捗」/「Progress」、`SQ-12`「実績開始」/「Actual Start」、`SQ-13`「実績終了」/「Actual Finish」、`searchPanel` の `filterSearch`「検索」/「Search」（絞る欄の薄い字）。
- **G-01**（生成器）—— `NOT_STORED_SEARCH_PANEL_SIZES` に `S-500`〜`S-502`、`SCREEN_COLOURS` に `S-503` と `S-161`・`S-162`・`S-326`・`S-327`・`S-385`〜`S-390`。

---

## 5. 継ぎ目

```
SEAM (CR-660)
- Entity (UF-178, schedule-search.ts): TaskSearchRow gains percentComplete (AT-39), actualStart (AT-34),
    actualFinish (AT-36). readSearchRows (AM-25) returns them too; the bottleneck stays as it is (PND-711).
- Adapter (svg-renderer/schedule-task-figures.ts): markerGlyphSvg(symbol, themed) draws markerSvg in a
    1em square box (viewBox of markerSize, stroke markerStroke) -- the one drawing of a marker's shape.
- Adapter (UF-193, table-window.ts):
    statusGlyphSvg(symbol) = markerGlyphSvg with colours var(--gr-mark-<T-236 row>) (markColourVariableOf);
    MARK_COLOUR_ROWS lists the rows the surface must define; isFilterValueListed(label, typed) is SV-4's
    comparison; tableWithFilterOpened closes the open filter when the same column is pressed again;
    tableAfterFilterEntry(..., listed) applies IC-125 / IC-126 to the listed values only.
- Adapter (UF-180 search-panel.ts / UF-194 delay-diagnostics-report.ts):
    TASK_SEARCH_COLUMNS = SQ-5, SQ-11, SQ-1, SQ-2, SQ-3, SQ-4, SQ-12, SQ-13, SQ-6; fixed up to SQ-1;
    DELAY_REPORT_COLUMNS = DT-1, DT-3, DT-4, DT-2, DT-5, DT-6, DT-7; fixed up to DT-4;
    SearchRowView.glyph is the status cell's marker svg (null when none); jumpAt names the SQ-1 / DT-4 column.
- Adapter (screen-surface.ts): ScreenPart.searchFilterListed -- the values the open filter lists, on an
    IC-125 / IC-126 answer only.
- Framework (UF-182, search-panel-drawing.ts): the filter menu draws the control rows first (fixed) and the
    value list below (scrolled); the search field hides the lines isFilterValueListed rejects, kept across
    redraws while the same column stays open; a status cell draws the glyph before its word; the jump cell is
    underlined in PAINT.link; columnWidthPx reads a column -> T-206 row table.
- Framework (dom-screen-surface.ts): themeStyle also writes --gr-mark-<row> for MARK_COLOUR_ROWS; PAINT.link.
- Framework (frame-loop.ts): passes ScreenPart.searchFilterListed to both windows' entry handling.
```

⚠️ `JDG-1354`（幅）: 列の境目を握って幅を変えるコードは両方の表に在る（`frame-loop.ts` の `windowPlacesAfterColumnDrag`、`search-panel-drawing.ts` の `columnBorderAt`）。窓の縁（`GR-25`）も在る。利用者の画面で変えられなかった理由は、本書の作業木では測れない —— 11 節の手順で実物を確かめる。

---

## 6. グラフ（`79d9eaf8`）

- `impact.py SV-6`: 要求 2 件（`FR-134`・`FR-151`）・参照 2 —— `RW-10` が `SV-6` の形を借りるだけ。
- `impact.py SV-7`: 要求 3 件（`FR-008` の `AS-5`、`FR-151`、`FR-040` の `IN-5a`）・参照 8 —— `AS-5` は入口 `IC-123`／`IC-124` の同一性だけ、`IN-5a` は欄をキーの行き先で判じる（絞る欄も `SV-7` の欄なので当たる）、05-07 の 3 か所はユニットの名と `IF-9`（E-13）。
- `impact.py SV-14`: 要求 2 件（`FR-036`・`FR-040`）・参照 5 —— 文を変えない。
- `impact.py SV-18`・`RW-9`: 要求 3 件（`FR-134`・`FR-016` の `GR-28`・`FR-151`）・参照 8 —— `GR-28` は掴み代だけ。
- `impact.py SQ-5`: 要求 1 件（`FR-151`）・参照 2（`S-470`）—— E-11 で語を合わせる。
- `impact.py DT-1`: 要求 1 件（`FR-134`）・参照 7 —— `RW-3`・`RW-4`・`RW-6`・`RW-9`・`RW-10`。`RW-6` は変えない（Markdown は記号と語のまま、欄の順は T-347 の行の順に従う）。
- `impact.py DT-3`・`DT-6`: 参照 2 ずつ（`S-477`・`S-480`）。`DT-5`: 要求 2 件（`FR-002` の `ND-5` が日の書き方を指すだけ）。
- `impact.py RW-3`・`RW-10`: 参照 0。

---

## 7. 数の予測と測った数

**既定の幅（測った、`79d9eaf8` の手元の Windows 11 の Chromium、字は `S-246`）** —— 測り方: 表のセルの形（`search-panel-drawing.ts` の `cellStyle`: 左右の詰め 0.25em、罫 1px、折り返さない）と見出しの行（語 ＋ `IC-122` の入口、最小幅 (16 ＋ (4 ＋ 1) × 2) × 0.6667 px）を写した表を `table-layout:auto` で組み、字の段 9・10・12 px（表 T-333）と 2 つの言語で、列の候補の値をすべて入れた表の幅を読む。候補: 日付は 0〜9 の各数字を 8 つ並べた `dddd/dd/dd` の 10 個、進捗は `100%` と `dd%` の 10 個、ステータスは辞書の語すべて（絵 1em と間 0.25em を足す）、`DT-5`・`DT-6` は日付 2 つを `〜` で繋いだ 10 個（`DT-6` は「yyyy/mm/dd〜」の 10 個も）。最大を切り上げた。再現は 13 節。

| 列 | 行 | 前 | 後 | 何が最も長いか |
|---|---|---|---|---|
| `SQ-5` ステータス | `S-470` | 150 | 152 | 値: en 12px「Paused, resume date set」 |
| `SQ-11` 進捗 | `S-500` | — | 73 | 見出し: en 12px「Progress」＋ `IC-122` |
| `SQ-3` 予定開始 | `S-468` | 110 | 99 | 見出し: en 12px「Planned Start」 |
| `SQ-4` 予定終了 | `S-469` | 110 | 105 | 見出し: en 12px「Planned Finish」 |
| `SQ-12` 実績開始 | `S-501` | — | 89 | 見出し: en 12px「Actual Start」 |
| `SQ-13` 実績終了 | `S-502` | — | 95 | 見出し: en 12px「Actual Finish」 |
| `SQ-9` 日付 | `S-474` | 110 | 70 | 値: 12px の日付 |
| `DT-1` ステータス | `S-475` | 150 | 138 | 値: en 12px「Unreliable, fix needed」 |
| `DT-3` 進捗 | `S-477` | 110 | 73 | 見出し: en 12px「Progress」 |
| `DT-5` 予定日 | `S-479` | 220 | 143 | 値: 12px の日付 2 つ |
| `DT-6` 実績日 | `S-480` | 220 | 143 | 値: 同 |

⚠️ 字の形は宿主の書体で変わる（`S-246` の先頭 `Yu Gothic UI` が無い宿主は次の書体）—— 数は本書の機械のもの。どの値も `S-425`（64）を割らない。

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| `npm run typecheck` の誤り | 0 → 0 | 同 |
| 書き直した試験 | 9 節 | `vitest` |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | 仕様 ＋ 生成 | E-01〜E-13、J-01、G-01、`npm run gen` | 本書の体 |
| 2 | コード ＋ 試験の書き直し | 5 節 | 本書の体 |
| 3 | 台帳 | 12 節 | 本書の体 |

⚠️ **毎フレームの経路**: `search-panel-drawing.ts`・`table-window.ts`・`search-panel.ts`・`delay-diagnostics-report.ts`・`frame-loop.ts`・`dom-screen-surface.ts` に触れるので、`perf-pending.md` に 1 行足す。

---

## 9. 仕様の外で直すもの

- 旧の並び・幅・見出し・入口の位置を言う試験を書き直す（当てたときに名を数えて書く）。
- 仕様だけを読む試験の体への指示は報告に書く（実装者は自分の条項の試験を書かない）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- `RW-6`（写しと書き出し）の記号と語は変えない。欄の順は 表 T-347 に従うので変わる。
- コメントボックスの表の列の並びと固定は変えない（`JDG-1373`）。
- 検索の状態の列の中身と並べ替えの順は変えない（`JDG-1371`、`SV-8`）。
- `readSearchRows` のボトルネック（`PND-711`、`DFC-2025`）は変えない。
- `S-425`（幅の下限）・`S-465`（掴み代）・`S-466`・`S-467`・`S-471`〜`S-473`・`S-476`・`S-478`・`S-481`（長さの決まらない列）は変えない —— 🔎 のまま。
- ⚠️ `CR-661` は 表 T-331 の頭に `SQ-10` を、`SV-6` の固定に [表示] の列を足す。本書の後に当てる（`CR-661` の 13 節）。

---

## 11. 保留の行と、実物で見ること

- `PND-710` は `JDG-1371` で閉じる（`裁定済`）。
- `PND-670` は狭める —— 字の幅が決まる 4 列（`DT-1`・`DT-3`・`DT-5`・`DT-6`）は本書が測って決めた。残るのは `DT-2`・`DT-4`・`DT-7`（長さの決まらない列）。
- ⚠️ 実物で見ること（調整役へ。手順は報告に書く）: 2 つの表の列の並びと固定、絞り込みの上の段と絞る欄、同じアイコンで閉じること・枠の外で閉じないこと、ステータスの絵、タスクの名の下線と青、列の境目と窓の縁で幅が変わること。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1351`〜`JDG-1358` | 本書の裁定 | 「適用済」。着地先に行 ID |
| `JDG-1370`〜`JDG-1373` | 0.1 節の答え | 起こす。`JDG-1370` は `CR-658` の 表 T-109 で「適用済」、`JDG-1371`〜`JDG-1373` は本書が当てて「適用済」 |
| `JDG-613` ／ `JDG-614` ／ `JDG-1229` | 覆された行 | 状態の欄は `JDG-1356` が付けた印のまま（本書は変えない） |
| `PND-710` | 11 節 | `裁定済` |
| `PND-670` | 11 節 | 狭める（`未裁定` のまま） |
| `DFC-1941` | 窓のマーカーの絵 | `実装待ち` → `実測待ち` |
| `DFC-1291` | 値の一覧を絞る欄 | 欄の半分を本書が当てたと書き足す（日付の欄の語は残る） |
| `DFC-2025` | `readSearchRows` | 変えない。本書で返す行が 3 欄増えることを書き足す |
| `perf-pending.md` | 8 節 | 1 行 |
| `docs/development-records/changelog.md` | 本書 | 1 行 |

---

## 13. 測り方の再現

```
# tree: 79d9eaf8 + this CR.
# ids: git grep "SQ-1[0-9]" / "S-49[0-9]\|S-50[0-9]" / "JDG-137[0-4]" before taking them.
# widths: a scratch Playwright script (not in the tree) builds one-column tables with the cell style of
#   search-panel-drawing.ts and the IC-122 entry's minimum width, font S-246, sizes 9 / 10 / 12 px,
#   ja and en headings, every candidate value of the column; prints the widest table width per column.
# contrast: WCAG relative luminance of S-503 against S-146 (light #ffffff; dark hsl(H 12% 9%) for H = 0..359).
npm run gen && python docs/spec/_source/build.py
python tools/ledger_metrics.py && python docs/spec/_source/row_id_prefixes_json_to_md.py && npm run gen:check
npm run typecheck
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py SV-6 SV-7 SV-14 SV-18 SQ-5 RW-3 RW-9 RW-10 DT-1 DT-3 DT-5 DT-6
```
