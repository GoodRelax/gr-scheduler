# CR-587 — 行見出しパネルの頭の操作子を 1 行に並べ、UC-003 の項目名を表示言語に揃える

> 起草の状態: 当てた（2026-09-26、枝 `cr-organise`、波 W1。`JDG-740`）。当てた木は `87d98a47` に `CR-555` と `CR-584` を当てた作業木（未コミット）。4 節の E-01 〜 E-04 を書いたとおりに当てた —— どの旧も当てる直前に 1 回だけ現れた（旧を今の文へ合わせた塊は無い）。
> 当てるときに新の文を 1 か所直した: E-03 の括弧の中の「対として読ませる。表 T-026 の `RC-13`」を「対として読ませる、表 T-026 の `RC-13`」にした（文の終わりは行の終わり。検査 46 が赤にした）。
> 11 節の問い 1 は調整役が A と決めた（2026-09-26。`JDG-321` の ②: 仕様の自己矛盾を直すのに問いは要らない。`JDG-673` が表示言語の側を既に選んでいる）。⇒ 11 節の案の 3 文を 4.3 節の E-05 〜 E-07 の旧・新の塊にし、どの旧も 1 回だけ現れることを数えてから当てた。`tests/system/measured-sweep.test.ts` の注が E-05 の旧の逐語を引く —— コードの波が直す（本書は試験を変えていない）。
> 起草したときの状態: 起草だけ（2026-09-26、枝 `cr-organise`、`87d98a47` の上）。コード（9 節）と試験はまだ変えていない。
> 読んだ木: `87d98a47`（`cr-organise`）。行番号・数・参照は、どれもこの木の blob で測った（13 節）。
> ⚠️ 起草のあいだに、この作業木へ他者の未コミットの変更が 17 ファイル現れた（`docs/spec/01-04-requirements.md` の 13 塊を含む。本書の旧はどれにも掛からない）。⇒ 旧の数は `87d98a47` の blob と、その時点の作業木の両方で数えた（13 節）。本書はそれらのファイルに触れていない。
> ID の帯: `CR-587` と仮番号の帯 `90700`〜`90799` を調整役から受けた。本書は新しい識別子を 1 つも取らない（2 節）。
> 当てる順: 波 W1。本書の旧に触れるほかの変更要求は無い —— `change-request/CR-55*`・`CR-56*`・`CR-57*`・`CR-58*` を `HF-10`・`HF-12`・`HF-16`・`HF-17`・`HF-20`・`UC-003` で引くと、当たるのは `CR-551`・`CR-553`・`CR-556`・`CR-570` だけで、4 本とも着地済み（`HF-20` と `S-418` が仕様に在る）か、`UC-003` を ORIGIN として名指すだけ（`CR-556`）である（13 節）。
> **閉じるもの**: `DFC-1141`（行見出しパネルの頭の [+] が隠れる倍率がある。利用者の裁定 `JDG-721`）と `DFC-1022`（`UC-003` 手順 2 と `FR-038` ／ 表 T-016 の食い違い。利用者の裁定 `JDG-673`）。2 つは互いに独立した直しである（第 1 部・第 2 部）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

⚠️ 逐語は `docs/development-records/rulings.md` から 1 文字も変えずに写した。

| 裁定 | 逐語 | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-721` | **「最上段の行の操作子は1行にしろ順序は ^^ →v →vv + → x でどうか？」**（2026-09-26。利用者の指摘）／**「問 1 — DFC-1141 の頭の並び  → A」** | 頭の操作子を 1 行に、左から すべて畳む（`^^`）・1 階層開く（`v`）・すべて開く（`vv`）・足す（`+`）・すべて消す（`x`）の順に並べる。`HF-10` の並びの文と `HF-20` の置き場（`HF-17` の上）を覆す。`HF-10` の MUST NOT（すべて開くをいちばん外に置かない）は保つ | 第 1 部（E-01 〜 E-03） |
| `JDG-673` | **「プロパティパネルの項目名は 提案通りA 日本人にも優しくしろ」** | 案 A: プロパティパネルの項目名は表示言語に従う（`FR-038`・表 T-016 の前文が正）。`UC-003` 手順 2 の「英語の項目名で」を「表示言語の項目名で」にする | 第 2 部（E-04） |

### 0.2 調べた結果（`87d98a47`）

1. **いまの頭は 2 段である。** `src/framework/dom-screen-surface/row-title-panel-drawing.ts` の `HEAD_PAIR_RANKS`（`:48-52`）が、消す（`IC-106`）を 1 段目、足す（`IC-93`）を 2 段目に積み、`panelCornerEntryStyle`（`:424-432`）がその段を `top` に写す。右端からの位置は、足すと消すが 0、すべて開く（`IC-74`）が 1、すべて畳む（`IC-78`）が 2、1 階層開く（`IC-92`）が 3、畳んだ数（`HF-12`）が 4 である —— 左から 1 階層開く・すべて畳む・すべて開く・［消す／足す］。⇒ 2 段目の足すは、パネルの頭の高さが 2 段に足りない倍率で隠れる（`DFC-1141` のトリアージの実測: 字 M・倍率 50 で 5.09px、字 S・倍率 50 で 7.91px が隠れる。本書は測り直していない）。
2. **いまの `HF-10` の理由の文は、新しい並びでは偽になる。** いまの並び（1 階層開く・すべて畳む・すべて開く）は、行の格子（`HF-1`、「左の列を上から 隠す・1 階層開く、次に右の列を上から 配下をすべて畳む・配下をすべて開く」）を**列から**読んだ順から隠すを除いたものであり、`HF-10` はそれを「行の並び（`HF-4`）と同じ読み方になる」と書く。新しい並び（すべて畳む・1 階層開く・すべて開く）は、同じ格子を**上の段から横に**読んだ順から隠すを除いたものである。⇒ 理由の文を書き換える（E-01。`DFC-1141` の修正案も「理由の文も直す」と言う）。
3. **`HF-12` の「`HF-10` の操作子の隣に」は、新しい並びでは偽になる。** すべて畳む（`HF-12`）とすべて開く（`HF-10`）のあいだに 1 階層開く（`HF-16`）が入る。⇒ `HF-16`・`HF-17`・`HF-20` と同じ「`HF-10` の操作子の並びに」へ揃える（E-02）。⚠️ `tests/unit/t-015-t-051-the-four-folding-controls.test.ts:150-155` は、頭の行を「`HF-10` の操作子」の字で見つける —— 新しい文もその字を持つ。
4. **`HF-16`・`HF-17` の文は位置を言わない**（「`HF-10` の操作子の並びに」だけ）ので、書き換えない。
5. **頭の消すが並びのいちばん外に立つ。** `HF-4` は行について「削除（`IC-82`）がいちばん外に在ると、右から流し込んだポインタが最初に触るのが削除になる」を理由にピン止めを外に置く。頭は段 0 であり留められない（`FR-004` の表 T-051 の後の段「行でないので留められない（`FR-098`）」）ので、消すの外に置く操作子が無い。利用者は 2 つの案（A: `^^` `v` `vv` `+` `x` ／ D: `v` `^^` `vv` `+` `x`）のどちらでも消すを最後に置く形から A を選んだ。⇒ 覆さず、`HF-20` に 1 文で書く —— 押しても消す前に問う（同じ行の `NT-7`・`QN-10`）。
6. **同じ形の所を数えた**（依頼文の 4）。頭の並び・置き場を言う所は、仕様に 3 つ（`HF-10` の並びの文、`HF-12` の「隣に」、`HF-20` の置き場）—— 3 つとも本書が書く。並びを**指す**だけの所が 2 つ: `FR-036` の「`Row Title Panel` の頭の入口は 表 T-051 の `HF-10` の順」（`01-04-requirements.md:6696`）は、`HF-10` が 5 つを並べるようになって真のまま（いまは `IC-106` がそこに無く、並びの外で `HF-20` が置き場を持っていた）。`FR-004` の段 0 の段「`HF-16` は `HF-13` を、`HF-12` は `HF-11` を、…」（`:1700`）は対応を言うだけで位置を言わない。仕様の外の写しが 3 群: 描く側（`row-title-panel-drawing.ts` と `dom-screen-surface.ts:786-789`）、ヘルプの並び（`tools/generate_help_roster.py:119-128` の `ROW_TITLE_PANEL_ORDER` と、それが刷る `src/adapter/screen-renderer/help-roster.json`）、試験の逐語と並び（9 節）。辞書（`display-words.json` の `IC-74`・`IC-78`・`IC-92`・`IC-93`・`IC-106`）に位置の語は無い。
7. **`UC-003` 手順 2 と同じ形の文が、ほかに 3 つある。** 表 T-006a の後の段（`01-04-requirements.md:324`・`:325`・`:328`）が「プロパティパネルの項目名は `W-2` に従うこと（MUST）」「項目名を英語のまま保つ理由は 表 T-016 の前文が持つ」「`FR-038` の辞書が 表 T-016 と同じ行 ID で持つ英語の綴りが、そのまま画面に出る」と書く。⚠️ 表 T-016 の前文は「画面に出す名は表示言語に従う（`FR-038`）」であり、英語のまま保つ理由はもう持たない（`8bf5e982`「Apply seven rulings and measure what they claimed」で取り下げた）。⇒ `JDG-673` の読みは「直すのは `UC-003` 手順 2 の 1 文だけ」なので、本書は 4 節に入れず、11 節で問う。
8. **いまの試験とコードは、仕様の正の側（表示言語）に既に従っている。** `tests/usecase/uc-003-edit-task-attributes.test.ts:5` は `locale: 'en-US'` で起動し、`:31-37` の手順 2 は項目名が ASCII であることだけを確かめる（`specMismatch` も `test.fail` も無い）。コードは `properties-panel.ts:87-92` の `itemName` が表示言語の辞書から項目名を引き、表示言語は `browser-stored-values.ts:47-51` の `startupDisplayLanguage` が `S-99` かブラウザの言語から決める —— `en-US` なら `en`。⇒ いまの試験は、仕様の 2 つの読みのどちらでも緑になる。⚠️ `DFC-1022` の「`test.fail` で固定」は、この木では偽である（`tests/known-red.txt` に `DFC-1022` の行が無く、`git log -S "DFC-1022" -- tests` も 0 件）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4`（すぐわか）／ `GL-006`**（第 1 部）—— 頭の 5 つがどの倍率でも見えて押せる。隠れた入口は、説明を読まずに操作する人には無いのと同じである。並びは行の格子（`HF-1`）を横に読んだ順になり、畳む・開く・足す・消すが左から続く。
- ⭐ **`CH-4`（すぐわか）／ `GL-006`**（第 2 部）—— 日本語の表示でパネルの項目名も日本語で並ぶ（`FR-038` の ORIGIN が `GL-006`）。`UC-003` は `GL-004` を満たす手順なので、手順の文が正の側と揃うことで `GL-004` の読み違いも無くなる。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— ① `HF-12` の「隣に」が新しい並びと食い違う（0.2 節の 3）→ E-02。② 並びの正を `HF-10` の 1 か所に置く: いままでは `HF-10` が 4 つを並べ、`HF-20` が 5 つ目の置き場を MUST で持っていた。`HF-10` が 5 つを並べるようになると、`HF-20` の置き場の MUST は同じことの 2 つ目になる → `HF-20` は「置き場の規則は `HF-10` の並びが持つ」と指すだけにした（E-03、決定 3）。③ `UC-003` 手順 2 と `FR-038`・表 T-016 の前文 → E-04。④ 表 T-006a の後の段の 3 文も同じ食い違いを持つ → 11 節の問い 1。
- **`R1.2`（検証できる表現）** —— 「1 行に」「左から … の順」は、描いた箱の `right` と `top` で確かめられる（9 節の試験）。
- **`R2.14`（POLA）** —— 頭では消すがいちばん外に立ち、行ではピン止めが外に立つ。行の `HF-4` の理由 ① と向きが逆になる → `HF-20` に理由を 1 文で書いた（0.2 節の 5、決定 4）。
- **`R2.7`（マジックナンバー無し）** —— いまのコードは頭の位置の段数（1・2・3・4）を 2 つのファイルに書き写している（`row-title-panel-drawing.ts:476-484`・`:444-446` と `dom-screen-surface.ts:786-788`）→ 9 節で、並びを 1 か所の定数から読む形を実装する体へ渡す。
- **`R6.2`（要求のトレース）** —— `UC-003` 手順 2 の試験は、いまの `en-US` だけでは表示言語に従うことを確かめない（0.2 節の 8）→ 9 節で試験の体に日本語の起動を 1 つ足す見立てを渡す。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `HF-10` の理由の文を「行の格子（`HF-1`）を上の段から横に読んだ順から、頭に無い隠すを除いたもの」とする | 0.2 節の 2。格子の上の段が畳む向き（∧・∧∧）、下の段が開く向き（∨・∨∨）なので、横に読むと畳むが先、開くは山 1 本から 2 本へ進む。`HF-1` の「上下に読めば動作、左右に読めば範囲」と同じ格子の読み | 行の格子を**列から**読む `HF-4` の読み（1 列目が山 1 本、2 列目が山 2 本）とは読む向きが違う。行は 2 段、頭は 1 行なので、向きを揃える手が無い |
| 決定 2 | 2 段に積まない理由を `HF-10` に 1 文で書く（「パネルの頭の高さが 2 段に足りない倍率で、下の段の操作子が隠れて押せなくなる」） | `DFC-1141` の症状。仕様は理由を持ち、履歴（裁定の日付・欠陥の番号）を持たない（検査 54 の規則）ので、番号と実測の数は書かない | 倍率ごとの隠れる量（`DFC-1141` のトリアージの実測）は仕様に入らない |
| 決定 3 | `HF-20` の置き場の MUST を消し、「置き場の規則は `HF-10` の並びが持つ —— 並びの最後、`HF-17` の右隣である」と指すだけにする | `R1.3`（唯一の正）。`HF-12`・`HF-16`・`HF-17` も置き場を `HF-10` に預けている（「`HF-10` の操作子の並びに」）。`DFC-1141` の修正案は「`HF-17` の右（並びの最後）へ」と MUST の形のまま書き換える案だったが、`HF-10` が 5 つを並べると 2 つ目の MUST になる | MUST が 1 つ減る。検査 39（MUST の条文の網羅）の数が動きうる（8 節） |
| 決定 4 | 頭で消すがいちばん外に立つことを `HF-20` に 1 文で書き、`HF-4` の理由 ①（削除が外だと右から来たポインタが先に触る）を頭に当てない理由を添える | 0.2 節の 5。頭は留められない（`FR-098`）ので外に置く操作子が無い。押しても `NT-7` で問う（`HF-20` の次の文が既に定める） | 右から流し込んだポインタが最初に触るのは、頭では消すである |
| 決定 5 | `HF-10` の MUST NOT の理由「頭も行も、折り畳みの外に立つのは行を増やす入口である」を「行を足す入口と消す入口である」にする | 新しい並びでは折り畳みの外に足すと消すの 2 つが立つ。MUST NOT の文そのもの（「本行の「すべて開く」を並びのいちばん外へ置いてはならない（MUST NOT）」）は 1 文字も変えない（`JDG-721`「`HF-10` の MUST NOT … は保つ」。`tests/unit/uf-72-screen-part.test.ts:5275` がその逐語を引く） | — |
| 決定 6 | `UC-003` 手順 2 の新しい文は `JDG-673` の読みの字のまま「表示言語の項目名で出す」とし、`FR-038` を名指さない | 同じ `SCENARIO` のほかの手順は要求の ID を持たない | — |
| 決定 7 | `FR-004` の段 0 の段の対応の並び（`HF-16`・`HF-12`・`HF-10`・`HF-17`・`HF-20` の順）と、`UF-105` の「パネルの角の入口（`HF-10`・`HF-12`・`HF-16`・`HF-17`）」は書かない | どちらも位置を言わない（0.2 節の 6）。`t-015-t-051-the-four-folding-controls.test.ts:683` が前者の逐語を引く | 対応の並びが画面の並びと違う順で書かれたまま残る。`UF-105` に `HF-20` が無いことも残る（10 節） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所（`87d98a47`） | 編集 |
|---|---|---|
| 頭の並び（5 つ、1 行、左から ^^・v・vv・+・x）と理由 | 表 T-051 の `HF-10`（`01-04-requirements.md:1669`） | E-01 |
| すべて畳むの置き場の言い方 | 表 T-051 の `HF-12`（`:1674`） | E-02 |
| すべて消すの置き場 | 表 T-051 の `HF-20`（`:1677`） | E-03 |
| `UC-003` 手順 2 の項目名 | `UC-003` の `SCENARIO` 手順 2（`:659`） | E-04 |
| 1 階層開く・最も浅い段へ足す | `HF-16`・`HF-17` | 変えない（0.2 節の 4） |
| 設定・辞書・名簿・状態機械・原稿 JSON | — | 変えない |

**数**: 仕様の文の編集 4（E-01 〜 E-04。どれも `docs/spec/01-04-requirements.md` の行の一部の置き換え）。原稿 JSON の編集 0。

## 2. 新しい識別子

⭐ **無い。** 表・行・接頭辞・設定値・辞書の項・台帳の行を 1 つも取らない。配られた仮番号の帯 `90700`〜`90799` は使わない（調整役へ返す）。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`87d98a47`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `HF-10` の並び「左から 1 階層開く・すべて畳む・すべて開く・足すの順」 | `01-04-requirements.md:1669` | 「左から すべて畳む・1 階層開く・すべて開く・足す・すべて消すの順に、1 行に」 | E-01 |
| `HF-10` の理由「行の並び（`HF-4`）と同じ読み方になる」「足すがその外である」 | 同 | 行の格子（`HF-1`）を上の段から横に読んだ順（決定 1）。「足すと消すがその外である」 | E-01 |
| `HF-10` の MUST NOT の理由の句「行を増やす入口である」 | 同 | 「行を足す入口と消す入口である」（MUST NOT の文は残す。決定 5） | E-01 |
| `HF-12` の「`HF-10` の操作子の隣に」 | `:1674` | 「`HF-10` の操作子の並びに」 | E-02 |
| `HF-20` の「置き場は `HF-17`（最も浅い段へ足す）の上とすること（MUST）」と、その理由「`HF-4` が行について定める「消すを上、足すを下」の縦の対と同じ読み方になる」 | `:1677` | 置き場は `HF-10` の並びが持つ（並びの最後、`HF-17` の右隣）。足すと消すの対の読みと、頭で消すが外に立つ理由（決定 3・4） | E-03 |
| `UC-003` 手順 2 の「英語の項目名で」 | `:659` | 「表示言語の項目名で」 | E-04 |
| コードの 2 段目（`HEAD_PAIR_RANKS`）と、右端からの位置の数 | `row-title-panel-drawing.ts:48-52`・`:443-446`・`:462-491`、`dom-screen-surface.ts:786-789` | 1 行の並び（⛔ 本書は直さない。9 節） | 波 W1 の実装の体 |
| ヘルプの並び `ROW_TITLE_PANEL_ORDER` の頭 5 つ（`IC-92`・`IC-78`・`IC-74`・`IC-106`・`IC-93`）とその注 | `tools/generate_help_roster.py:119-128` | `IC-78`・`IC-92`・`IC-74`・`IC-93`・`IC-106`（⛔ 本書は直さない。9 節） | 同 |

⭐ **消さないもの**: `HF-10` の最初の文（最上部の右寄せ、`HR-1`）、MUST NOT「本行の「すべて開く」を並びのいちばん外へ置いてはならない（MUST NOT）」、「⛔ 最上位の行が自分を畳むと …」以下の文すべて。`HF-12` の 2 文目以下。`HF-20` の 1 文目（`IC-82` を段 0 で、入口は `IC-106`）と最後の文（`CD-6`・`NT-7`・`FR-032`・`QN-10`）。`HF-4`（行の並び）と `HF-1`（行の格子）は 1 文字も変えない。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（13 節の道具が 4 件すべてで 1 回を確かめた）。旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊である。
⚠️ 4 件とも行の一部の置き換えであり、塊の末の改行を旧にも新にも含めない。
⚠️ 新の文はどれも 1 行の中に収まる（表の升の中は `<br>` で割る）。検査 39・42 が照らす逐語を 2 行に割らない。

### 4.1 第 1 部 —— 頭の並び（`DFC-1141`、`JDG-721`）

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
表 T-051 の `HF-10` の 2 文目から MUST NOT の理由まで。旧
```text
⭐ 頭の並びは、左から 1 階層開く・すべて畳む・すべて開く・足すの順とすること（MUST）—— ⭐ **行の並び（`HF-4`）と同じ読み方になる** —— **折り畳みが先で、足すがその外である。<br>**⛔ **本行の「すべて開く」を並びのいちばん外へ置いてはならない（MUST NOT）** —— **頭も行も、折り畳みの外に立つのは行を増やす入口である。<br>**
```
新
```text
⭐ 頭の並びは、左から すべて畳む・1 階層開く・すべて開く・足す・すべて消すの順に、1 行に並べること（MUST）—— ⭐ **折り畳みの 3 つは、行の格子（`HF-1`）を上の段から横に読んだ順から、頭に無い隠す（`HF-3`）を除いたものである** —— 畳む向きが先、開く向きが後で、開くは範囲の狭いほう（山 1 本）から広いほう（山 2 本）へ進む。<br>**折り畳みが先で、足すと消すがその外である。<br>**⭐ 2 段に積まないのは、パネルの頭の高さが 2 段に足りない倍率で、下の段の操作子が隠れて押せなくなるからである。<br>⛔ **本行の「すべて開く」を並びのいちばん外へ置いてはならない（MUST NOT）** —— **頭も行も、折り畳みの外に立つのは行を足す入口と消す入口である。<br>**
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
表 T-051 の `HF-12` の頭。旧
```text
| HF-12 | `HF-10` の操作子の隣に、すべての行を畳む操作子を 1 つ置くこと（MUST）
```
新
```text
| HF-12 | `HF-10` の操作子の並びに、すべての行を畳む操作子を 1 つ置くこと（MUST）
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
表 T-051 の `HF-20` の 2 文目。旧
```text
⭐ 置き場は `HF-17`（最も浅い段へ足す）の上とすること（MUST） —— `HF-4` が行について定める「消すを上、足すを下」の縦の対と同じ読み方になる。<br>
```
新
```text
⭐ 置き場の規則は `HF-10` の並びが持つ —— 並びの最後、`HF-17`（最も浅い段へ足す）の右隣である。<br>足すと消すを隣り合わせ、あいだにほかの操作子を挟まないのは、`HF-4` が行について定める対と同じ読み方である（枠つきの `＋` と `×` は対として読ませる。表 T-026 の `RC-13`）。<br>⚠️ 行と違い、頭では消すが並びのいちばん外に立つ —— 段 0 は留められないので（`FR-098`）、行が消すの外に置くピン止めの操作子（`HF-4`）を頭は持たない。<br>右から流し込んだポインタが最初に触るのは消すになるが、押しても消す前に問う（次の文の `NT-7`）。<br>
```

### 4.2 第 2 部 —— `UC-003` の項目名（`DFC-1022`、`JDG-673`）

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`UC-003` の `SCENARIO` 手順 2。旧
```text
2. `GRS` はプロパティパネルに、そのタスクの属性を英語の項目名で出す。
```
新
```text
2. `GRS` はプロパティパネルに、そのタスクの属性を表示言語の項目名で出す。
```

### 4.3 第 2 部の続き —— 表 T-006a の後の段の 3 文（11 節の問い 1 の答え A）

⭐ 調整役が 11 節の問い 1 を A と決めた（2026-09-26。`JDG-321` の ②: 仕様の自己矛盾を直すのに問いは要らない。`JDG-673` が表示言語の側を既に選んでいる）。下の 3 件は 11 節の案の文をそのまま旧・新の塊にしたものである。どれも行の一部の置き換えで、行の末の 2 つの空白（Markdown の改行）は旧にも新にも含めない。

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
表 T-006a の後の段の 1 文目（項目名の綴り）。旧
```text
⛔ **プロパティパネルの項目名は `W-2` に従うこと（MUST）**。
```
新
```text
⛔ **プロパティパネルの項目名の英語の綴りは `W-2` に従うこと（MUST）**。
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
同じ段の 2 文目（項目名の言語）。旧
```text
⭐ **項目名を英語のまま保つ理由は 表 T-016 の前文が持つ**。
```
新
```text
⭐ **項目名は表示言語に従う（`FR-038`、表 T-016 の前文）**。
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
同じ段の辞書の文。旧
```text
`FR-038` の辞書が 表 T-016 と同じ行 ID で持つ英語の綴りが、そのまま画面に出る。
```
新
```text
`FR-038` の辞書が 表 T-016 と同じ行 ID で持つ、表示言語の綴りが画面に出る。
```

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- Table T-051 row HF-10 is the one owner of the head run. Left to right, on ONE line:
    IC-78 (HF-12, collapse all)  IC-92 (HF-16, open one level)  IC-74 (HF-10, open all)
    IC-93 (HF-17, add a top row)  IC-106 (HF-20, delete every row)
  Every head entrance has the same top (no second line); IC-106 is the rightmost, at
  S-313 from the panel's right edge like every rightmost entrance (HF-4).
- The folded count of HF-12 stays immediately left of the run (one step left of IC-78).
- Code: src/framework/dom-screen-surface/row-title-panel-drawing.ts owns the steps.
  Remove HEAD_PAIR_RANKS and the rank parameter; hold the five steps in ONE place
  (e.g. an ordered list of the five icons whose index is the step from the right edge)
  and have headEntryElements, markHeadPair, headFoldedRowCountRight and
  src/framework/dom-screen-surface/dom-screen-surface.ts (the markPanelCornerEntry calls
  in the changed('rowTitlePanel') branch) read it -- no step number written twice.
- tools/generate_help_roster.py: ROW_TITLE_PANEL_ORDER head becomes
    'IC-78', 'IC-92', 'IC-74', 'IC-93', 'IC-106'  (rows unchanged after it)
  and its comment says HF-10 orders all five; then npm run gen (help-roster.json).
- UC-003 step 2: item names follow the display language (FR-038, table T-016 preface,
  display-words.json "properties"). No code change.
```

## 6. グラフ（`87d98a47` で測った）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 要求 / 参照 | 指している所 |
|---|---|---|
| `HF-10` | 3 / 14 | `FR-004`（`:1667`・`:1674`〜`:1677`・`:1681`・`:1684`・`:1700`・`:1702`）・ `FR-076`（`RS-31`、`:6548`）・ `FR-036`（`:6696`「頭の入口は 表 T-051 の `HF-10` の順」—— 真のまま、0.2 節の 6）・ `05-07-design.md:525`（`UF-105`）・ `tbl-glossary.md:597`（`IC-74`）・ `tbl-state-machines.md:1041`（`everyRowOpenPressed`） |
| `HF-12` | 3 / 8 | `FR-004`（`:1679`・`:1681`・`:1700`）・ `FR-031`（`:2154`、`UN-14`）・ `FR-076`（`RS-32`）・ `UF-105` ・ `IC-78` ・ `everyRowFoldPressed` |
| `HF-16` | 1 / 7 | `FR-004`（`:1652`・`:1662`・`:1681`・`:1700`）・ `UF-105` ・ `IC-92` ・ `topLevelOpenPressed` —— 本書は書かない |
| `HF-17` | 2 / 10 | `FR-001`（`TC-3`、`:1073`）・ `FR-004` ・ `UF-105` ・ `IC-93` ・ `S-418` ・ 表 T-328 の 3 か所 —— 本書は書かない |
| `HF-20` | 3 / 5 | `FR-004`（`:1699`・`:1700`）・ `FR-032`（`CD-6`、`:2311`）・ `FR-076`（`QN-10`、`:6602`）・ `IC-106` |
| `UC-003` | 16 / 34 | 表 T-052 の `V-3`（`:560`）と、ORIGIN ・ Relations で指す `FR-006` ・ `FR-007` ・ `FR-008` ・ `FR-031` ・ `FR-041` ・ `FR-045` ・ `FR-049` ・ `FR-059` ・ `FR-072` ・ `FR-075` ・ `FR-078` ・ `FR-081` ・ `FR-083` ・ `FR-090` ・ `FR-099` ・ `FR-109` —— どれも手順の番号を引くだけで、項目名の言語を引かない |

⭐ 位置・並びを言う文は `HF-10`・`HF-12`・`HF-20` の 3 つだけで、届いた先はどれも位置を言わない（`FR-036` は `HF-10` の順を指すだけ）。
⭐ 届いた行ごとに `rulings.md` を引いた（規則 02 の 1）: `HF-10`・`HF-20` は `JDG-721`（本書が当てる）。`UC-003`・`FR-038`・表 T-016 は `JDG-673`（本書が当てる）。ほかに頭の並びを裁いた行は無い（「頭の並び」「HF-20」「1 行」で引いた）。

### 6.2 `induced.py`

| 種 | 解決 | 種の中の辺 | 閉路 | 扱い |
|---|---|---|---|---|
| `HF-10 HF-12 HF-16 HF-17 HF-20 HF-1 HF-4 FR-004 FR-036 FR-032 FR-098 T-051 QN-10 IC-106` | 14/14 | 33 | 2: `HF-1` `HF-4` ／ `FR-004` `FR-032` `HF-20` `IC-106` `QN-10` | ⭐ `HF-1` ↔ `HF-4` は本書が書かない（どちらも行の並び）。⭐ 5 つの閉路のうち本書が書くのは `HF-20` の 1 文だけで、`FR-004`・`FR-032`・`IC-106`・`QN-10` の文は書かない。E-03 は `NT-7`（`QN-10` の問い方）を指すだけで、消える範囲・問い方を変えない —— 1 つの計画で E-03 だけを書けば閉じる |
| `UC-003 FR-038 FR-006 FR-072 T-016 T-006a W-2 GL-004` | 8/8 | 10 | 1: `FR-006` `FR-072` `GL-004` `UC-003` | 本書は `UC-003` の手順 2 の 1 文だけを書き、ORIGIN ・ Relations を変えない。`FR-006`・`FR-072` の文は項目名の言語を言わない —— 足す編集は無い |

---

## 7. 数の予測（`87d98a47` の写しで測った。当てた後に同じ数え方で突き合わせる）

| 数 | 前 | 後（本書だけ） | 内訳 |
|---|--:|--:|---|
| tables | 189 | 189 | — |
| figures | 28 | 28 | — |
| rows | 2364 | 2364 | 4 件とも升の中・手順の文の書き換え |
| uids | 164 | 164 | — |
| 設定値・辞書・接頭辞 | — | 0 | — |

⚠️ 上の数は `87d98a47` の `docs/spec` を写した所で `md-checks.py` が数えた（13 節）。作業木に現れた他者の変更（前書き）の後に当てるときは、その変更の後の数に本書の差（どれも 0）を足す。

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 仕様と、それを読む側は同じ波）

```
wave W1  (cut from the commit that holds this CR; the seam of section 5 goes verbatim
          into every brief)
  W1a spec      docs/spec/01-04-requirements.md: recount section 4's 4 old blocks
                (count == 1 each), then E-01..E-04. No gen needed (no manuscript JSON
                changes), but run npm run gen && npm run gen:check anyway (rule 02 step 5).
  W1b code      src/framework/dom-screen-surface/row-title-panel-drawing.ts,
                src/framework/dom-screen-surface/dom-screen-surface.ts (only the head
                lines in the changed('rowTitlePanel') branch),
                tools/generate_help_roster.py, then npm run gen (help-roster.json)
  W1c tests     a spec-only tester (never the W1b body), reading docs/spec only:
                tests/unit/cr-439-row-title-panel-controls-and-pins.test.ts,
                tests/unit/uf-72-screen-part.test.ts,
                tests/usecase/uc-003-edit-task-attributes.test.ts (section 9)
wave W2  coordinator: merge, check.sh + vitest + e2e on the merged tree; npm run build
         (dist/) for the user to try by file:// at zoom 50 with font size S and M
```

- ⚠️ W1a と W1c は同じ巡で着地させる —— `HF-10` の並びの逐語を引く試験（9 節の 2 本）は、仕様を書き換えた瞬間に赤くなる。
- ⚠️ 検査 39（MUST の条文の網羅）の数が動く見込み —— `HF-20` の置き場の MUST が 1 つ消える（決定 3）。`HF-10` の並びの MUST は 1 つのまま。⛔ **基準線を動かすときの扱いは記録 `baseline-moves-need-user-ok` に従う**（下げる向きは調整役が決めてよい）。
- ⚠️ 検査 42（仕様に無い文を引く注）: `uf-72-screen-part.test.ts:4717`（注）が `HF-10` の旧の並びの逐語を引く —— W1c がその注も直す。
- ⭐ 1 フレームの仕事（第 1 部 yes）: 頭の位置は `dom-screen-surface.ts` の `changed('rowTitlePanel')` の枝で 5 つの箱の `style` を書く。本書の後も 5 つの書き込みのまま（2 段目の `top` が消えるだけ）で、計算の量は増えない。⛔ 性能の試し（`GRS_PERF`）は走らせない（依頼文 7）—— 走らせるなら前に立つ者が利用者に声をかける（記録 `perf-test-notify`）。第 2 部は no（仕様の 1 文だけ）。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| 所（`87d98a47`） | 1 フレーム | 何をする |
|---|---|---|
| `src/framework/dom-screen-surface/row-title-panel-drawing.ts:48-52`（`HEAD_PAIR_RANKS`） | yes | 消す（2 段目が無くなる） |
| 同 `:424-432`（`panelCornerEntryStyle` の `rank`）・ `:409-421`（`panelCornerEntryElement` の `rank`）・ `:448-460`（`markPanelCornerEntry` の `rank`） | yes | `rank` の引数と `top` の書き込みを消す |
| 同 `:443-446`（`headFoldedRowCountRight`） | yes | 畳んだ数を右端から 4 段目 → 5 段目へ（並びの左隣。5 節） |
| 同 `:462-472`（`addTopRowElement`・`deleteEveryRowElement`）・ `:474-484`（`headEntryElements`）・ `:486-491`（`markHeadPair`） | yes | 右端からの位置: `IC-106` 0、`IC-93` 1、`IC-74` 2、`IC-92` 3、`IC-78` 4（5 節の並びを 1 か所から読む） |
| `src/framework/dom-screen-surface/dom-screen-surface.ts:786-789`（`changed('rowTitlePanel')` の枝の `markPanelCornerEntry` 3 つと `markHeadPair`） | yes | 位置の数（1・2・3）を書き写さず、`row-title-panel-drawing.ts` の 1 か所から読む（`R2.7`） |
| `tools/generate_help_roster.py:119-128`（`ROW_TITLE_PANEL_ORDER` と注） | no | 頭 5 つを `IC-78`・`IC-92`・`IC-74`・`IC-93`・`IC-106` へ。注の「HF-20 puts delete-all over that add」を消す。`npm run gen` で `src/adapter/screen-renderer/help-roster.json` を刷り直す。⚠️ この並びは手で書いた写しなので、`gen:check` は仕様との食い違いを見ない |
| `src/adapter/screen-renderer/help-roster.json` | no | 生成物（手で直さない） |

**試験**（いま引いているもの。仕様だけを読む試験の体が書き直す）:

| 試験 | いま主張していること | 本書の後 |
|---|---|---|
| `tests/unit/cr-439-row-title-panel-controls-and-pins.test.ts:45`（`HF_10_ORDER`）・ `:135` | `HF-10` が「頭の並びは、左から 1 階層開く・すべて畳む・すべて開く・足すの順とすること（MUST）」を含む | ⛔ 赤。E-01 の新の逐語へ |
| 同 `:149-161` | 左から `HF-16`・`HF-12`・`HF-10`・`HF-17` | ⛔ 赤。`HF-12`・`HF-16`・`HF-10`・`HF-17`・`HF-20`、5 つとも同じ `top`（`DFC-1141` の修正案の期待） |
| `tests/unit/uf-72-screen-part.test.ts:468-469`（`T_051_HF10_THE_HEAD_RUN`）・ `:4717`（注）・ `:4795-4801`（`HF10_LEFT_TO_RIGHT`）・ `:5290`（試験名） | 旧の並びの逐語と、4 つの並び | ⛔ 赤。新の逐語と 5 つの並び。`:5275` の MUST NOT の逐語は緑のまま（決定 5） |
| `tests/unit/t-015-t-051-the-four-folding-controls.test.ts:150-155` ・ `:620` ・ `:683` | 頭の行を「`HF-10` の操作子」で見つけ、5 つを得る ／ `FR-004` の対応の逐語 | 緑のまま（E-02 の新も「`HF-10` の操作子」を持つ。`FR-004` は書かない） |
| `tests/unit/cr-551-delete-all-rows-date-fields-and-colour-field.test.ts:217` | `HF-20` が「すべての行を消す操作子」を含む | 緑のまま |
| `tests/usecase/uc-003-edit-task-attributes.test.ts:31-37` | 手順 2 を「English item names」と名乗り、`en-US` で項目名が ASCII であることを確かめる | 緑のまま（コードは既に表示言語に従う）。⭐ 手順の名を「display-language item names」へ直し、`ja` で起動したときに項目名が表示言語の辞書（`display-words.json` の `properties` の `ja`）のものであることを 1 つ足す見立て —— 足すかは試験の体が表 T-334 の `VT-1` の 1 本の中で決める |
| 新しく要るもの | — | 頭の 5 つが 1 行（同じ `top`）で、左から `IC-78`・`IC-92`・`IC-74`・`IC-93`・`IC-106`。いちばん右が `S-313` だけ右端から離れる。畳んだ数がその左に在る |
| `tools/parity/check.mjs:492-496` | `head:IC-106` を「GRS だけが持つ入口」として許す（`arming` の読み） | 変えない —— パリティの読みは `rows`・`counts`・`arming`・`pinned` で、位置を読まない（`:586`） |

---

## 10. ⛔ この変更でやらないこと

- **行の並び（`HF-1` の格子、`HF-4` の 4 列）** —— 1 文字も変えない。頭だけが 1 行になる。
- **`FR-004` の段 0 の段の対応の並び**（`:1700`）と **`UF-105` の入口の名簿**（`05-07-design.md:525`。`HF-20` が抜けている）—— 位置を言わないので書かない（決定 7）。⚠️ `UF-105` の抜けは本書の話ではないので、台帳に起こすかは調整役が決める。
- **頭の高さそのもの（パネルの角の縦幅）** —— 本書は 2 段目を無くすだけで、角の高さを 1 段ぶん確保する規則を足さない。`DFC-1141` のトリアージの実測で、隠れる量は最大 7.91px（字 S・倍率 50）であり、角の縦幅は 2 段（約 2 × 14px）からその量を引いた値以上ある ⇒ 1 段は収まる、と読める（⚠️ 本書は測っていない。W2 の `file://` の確かめで見る）。
- **表 T-006a の後の段の 3 文**（`:324`・`:325`・`:328`）—— 11 節の問い 1 の答えを待つ。
- **ヘルプの図・辞書の語** —— 変えない（位置の語を持たない）。
- `docs/development-records/` の `rulings.md`・`defects.md`・`changelog.md`、`A-appendix.md` の変更履歴（当てる者が書く）。

---

## 11. 前に立つ者へ返す問い

| # | 問い | 案と比べ | 推奨と理由 |
|---|---|---|---|
| 1 | **表 T-006a の後の段の 3 文も、`UC-003` と同じく表示言語へ直すか**。場面: 日本語で開いた `GRS` のプロパティパネルは「名称 / 開始日 / 終了日 / 担当者」と出す（`JDG-673` の案 A）。ところが仕様の命名の段（`01-04-requirements.md:324`〜`:328`）は、⛔「プロパティパネルの項目名は `W-2` に従うこと（MUST）」（`W-2` は camelCase）、⭐「項目名を英語のまま保つ理由は 表 T-016 の前文が持つ」（表 T-016 の前文はもうその理由を持たず、「画面に出す名は表示言語に従う（`FR-038`）」と書く）、「`FR-038` の辞書が 表 T-016 と同じ行 ID で持つ英語の綴りが、そのまま画面に出る」と書いたままである | **A この CR に 3 文の直しを足す**（E-05 〜 E-07。下の案の文）: `:324` を「⛔ **プロパティパネルの項目名の英語の綴りは `W-2` に従うこと（MUST）**。」、`:325` を「⭐ **項目名は表示言語に従う（`FR-038`、表 T-016 の前文）**。」、`:328` を「`FR-038` の辞書が 表 T-016 と同じ行 ID で持つ、表示言語の綴りが画面に出る。」へ。`tests/system/measured-sweep.test.ts:3806` の注が `:324` の逐語を引くので、W1c がその注も直す。 **B 台帳に新しい欠陥の行として起こし、別の CR で直す**: 本書は `JDG-673` の読み（「直すのは `UC-003` 手順 2 の 1 文だけ」）のまま。 **C 直さない**: `:325` は存在しない理由を指したまま残る | **A**。① 3 文が食い違う相手は `JDG-673` が正とした側（`FR-038`・表 T-016 の前文）そのもので、どちらが正かを選び直す話ではない（利用者の裁定 2026-09-13 の「どちらが正かを選ばない」は当たらない —— 既に選ばれている）。② `:325` は指し先に無い理由を指す（`8bf5e982` で取り下げた文）—— 読んだ体が「英語のまま」を正と読む道が残る（`DFC-1022` を生んだのと同じ道）。③ `JDG-673` の「1 文だけ」は、利用者の逐語ではなく、裁定を記録したセッションの読みの欄である。代償: 本書の範囲が `DFC-1022` の修正案より 3 文広がり、`JDG-673` の読みの欄と字面が合わなくなる（台帳の読みの欄を直す手間が要る） |

⭐ 第 1 部の並びは `JDG-721` が決めており、問いは残っていない。

---

## 12. 台帳

⭐ 本書は台帳を書かない（当てる者が書く）。

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1141` | 行見出しパネルの頭の [+] が隠れる倍率がある（`defects.md:377`） | 本書を当てて閉じる（E-01 〜 E-03 と 9 節の直し） |
| `DFC-1022` | `UC-003` 手順 2 と `FR-038` ／ 表 T-016 の食い違い（`defects.md:348`） | 本書を当てて閉じる（E-04）。⚠️ 行の「`test.fail` で固定」は `87d98a47` で偽（0.2 節の 8）—— 閉じるときに直すこと |
| `JDG-721` | 0.1 節 | 「指示」のまま。着地先は本書の E-01 〜 E-03 |
| `JDG-673` | 0.1 節 | 「指示 —— 調整役の変更要求が当てる」のまま。着地先は本書の E-04（11 節の問い 1 が A なら E-05 〜 E-07 も） |

---

## 13. 測り方の再現

```
# the tree: cr-organise 87d98a47 (git log --oneline -1)
# every line number below is on the blob: git show 87d98a47:docs/spec/01-04-requirements.md
git show 87d98a47:docs/spec/01-04-requirements.md | grep -n "^| HF-10 \|^| HF-12 \|^| HF-20 \|英語の項目名で出す"
#   -> 659 (UC-003 step 2), 1669 (HF-10), 1674 (HF-12), 1677 (HF-20)

# old blocks: every EDIT block of section 4 is parsed out of THIS file and counted in the
# blob and in the working file (the working tree gained 17 files of someone else's
# uncommitted edits while this was drafted; none holds an old block), then applied in
# order to a copy of 87d98a47:docs/spec, which md-checks counts before and after
#   scratchpad draft/587-verify.py <repo> <scratch>/587-copy
#   -> E-01..E-04 parsed; blob 87d98a47: count 1,1,1,1; working file: count 1,1,1,1
#   -> applied 4 of 4; md-checks before: tables=189 figures=28 rows=2364 uids=164
#                       md-checks after:  tables=189 figures=28 rows=2364 uids=164

# graph (87d98a47)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py HF-10 HF-12 HF-16 HF-17 HF-20
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py UC-003
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py HF-10 HF-12 HF-16 HF-17 HF-20 HF-1 HF-4 FR-004 FR-036 FR-032 FR-098 T-051 QN-10 IC-106
#   -> 14/14, 33 edges, 2 cycles: HF-1 HF-4 ; FR-004 FR-032 HF-20 IC-106 QN-10
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py UC-003 FR-038 FR-006 FR-072 T-016 T-006a W-2 GL-004
#   -> 8/8, 10 edges, 1 cycle: FR-006 FR-072 GL-004 UC-003

# pending change requests that name these rows
grep -lE "HF-10|HF-12|HF-16|HF-17|HF-20|UC-003" change-request/CR-55* change-request/CR-56* change-request/CR-57* change-request/CR-58*
#   -> CR-551, CR-553, CR-556, CR-570 (landed, or UC-003 as an ORIGIN only)

# the same shape elsewhere (0.2 item 6 and 7)
grep -rn "HF-20\|頭の入口は 表 T-051" docs/spec
grep -rn "ROW_TITLE_PANEL_ORDER\|HEAD_PAIR_RANKS\|headFoldedRowCountRight\|markPanelCornerEntry" src tools
grep -rn "英語の項目名\|項目名を英語のまま\|英語の綴りが、そのまま\|項目名は \`W-2\` に従う" docs/spec tests src tools
grep -rn "1 階層開く・すべて畳む\|頭も行も、折り畳みの外\|HF10_LEFT_TO_RIGHT\|HF_10_ORDER" tests

# the UC-003 test and the code today
#   tests/usecase/uc-003-edit-task-attributes.test.ts:5 (locale en-US), :31-37 (ASCII names)
#   grep -n "DFC-1022" tests/known-red.txt -> nothing ; git log -S "DFC-1022" -- tests -> nothing
#   src/adapter/screen-renderer/properties-panel.ts:87-92 itemName ;
#   src/framework/single-html-shell/browser-stored-values.ts:47-51 startupDisplayLanguage

# rulings: grep -n "JDG-721\|JDG-673" docs/development-records/rulings.md -> :992, :914
# defects: grep -n "DFC-1141\|DFC-1022" docs/development-records/defects.md -> :377, :348
```
