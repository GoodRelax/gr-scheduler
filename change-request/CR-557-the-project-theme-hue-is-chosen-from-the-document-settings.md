# CR-557 — プロジェクトのテーマの色相を、文書の設定の入口（`IC-17`）から選ばせる

> 起草の状態: 起草（2026-09-24 に 11 節の問い 4 つへ利用者が答えた。4 節はすべて当てられる）。⭐ 答えは 4 つとも推奨どおり（問い 1 の A、問い 2 の (i)、問い 3 の (a)、問い 4 の英語の語）であり、4 節はその推奨で書いてある。
> 読んだ木: `61bbd572`（`claude/fervent-keller-e96fcc`。`origin/refactor` に揃えた木。`CR-551` は `6f674198` 〜 `7dbd292d` で仕様とコードに着地済み）。行番号・数・参照は、すべてこの木で測り直した（2026-09-24。測り方は 13 節）。⚠️ 初稿は `ebc71984` で測った。
> ⚠️ 本書は `CR-551` 〜 `CR-554` の後に当てる（`CR-551` は着地済み）。4 節の旧 9 塊は `61bbd572` の木でそれぞれ 1 回だけ現れ、写しに上から順に当てて問題 0、JSON 3 つは `json.loads` で読めた（13 節）。旧は `CR-552` 〜 `CR-554` の旧にも新にも 0 回しか現れない。
>
> **閉じるもの**: 利用者の 2026-09-23 の指示（`JDG-450`。逐語は下の 0.1 節）、`DFC-862`（`CM-5` に人の入口が無い）、`DFC-863`（文書の設定の面にテーマの色相が出ない）、`DFC-864`（原稿の注の古い数）。
> ⛔ **覆すもの**: `PND-434`（2026-09-07 の裁定。仕様には当たっていなかった）のうち、案①の置き場「基本情報と同じ面（`PND-433` の第 3 の中身）」。⭐ 同じ裁定の「`App Header` の明暗（`IC-16`）の隣に入口を立ててはならない（案②）」は保つ —— 本書は `App Header` に入口を 1 つも足さない。
> ⚠️ **狭めるもの**: `FR-072` の「文書の設定を出しているあいだ、その欄は読むだけ」—— 別の要求が本面に入口を置いた欄を除く形にする（E-03）。
> ⭐ **形の方針**: 利用者は使い勝手の試しのあとで裁定がまた動くと述べている。⇒ 選べる色相は 表 T-305 の行、並べ方は `S-368`、置き場は `FR-041` の 1 文に置いた。裁定を戻すときは、多くが 1 行の書き換えで済む（1 節の最右列）。

### 0.1 利用者の逐語（2026-09-23）

⚠️ 前に立つ者が体へ渡した写しのまま写した。`…` は写しの側の省略であり、利用者の字ではない。

| 項目 | 逐語 |
|---|---|
| 1 | 「カラーテーマってどうやって選ぶ？…ダークモードの〇の右にある 三 の設定アイコンからプロジェクトのカラーテーマを選択可能とせよ。…poc-integrated.html の色と縁取りタブで、設定の左にある色を選択するとプロジェクト全体の色味を変えられるだろ？これを参考にしろ。」 |

**逐語が指すものを測った**（2026-09-24、`61bbd572`）:

| 逐語の語 | 指すもの | 根拠 |
|---|---|---|
| ダークモードの〇 | `IC-16`（明暗テーマ、`S-72`） | 図 F-019 の `IC-16` は円と半分の塗り（`docs/spec/_assets/fig-icons.svg:106-109`） |
| その右の 三 の設定アイコン | `IC-17`（文書の設定。`FR-072`） | 同図の `IC-17` はつまみの付いた横線 3 本（`fig-icons.svg:111-121`）。表 T-109 で `IC-16` の次の行（`docs/spec/_assets/tbl-glossary.md:528-529`）。⚠️ `CR-551` が `IC-100`（モノクロ）を `IC-16` の左（`:527`）へ移したが、`IC-16` と `IC-17` の隣り合いは変わらない |
| プロジェクトのカラーテーマ | `Project.themeHue`（`AT-19`、`S-73`、既定 214） | `FR-041` の RATIONALE「色のテーマはプロジェクトのテーマカラーであり、作った人の決めごとである」。値は日程データの群の `project` が持つ（表 T-052 の `DR-5`、`docs/spec/_source/erd.json:745-760`） |
| 設定の左にある色 | 試作のヘッダの `<select id="selHue">`（`previous-project-result/08-poc/poc-integrated.html:940`）。「設定 ▸」の釦（`:941`）の左 | 選択肢は `HUES` の 10 行（`:700-711`、名と色相の組）。選ぶと `theme.themeHue` を書き、`applyPalette()` で全体を塗り直す（`:2777-2783`） |

⚠️ **試作の「色と縁取り」タブ（`:1033-`）そのものは色相を選ぶ所ではない** —— 10 色相 × 明暗でコントラストを測って並べる計測の頁であり、選ぶのはヘッダの `selHue` である。逐語の「色と縁取りタブで、設定の左にある色」は、そのタブを開いたまま `selHue` を触ると頁全体の色味が変わることを言っていると読んだ。

**試作が差し出していたもの**（読んで確かめた）:

| 事項 | 試作 | 本書 |
|---|---|---|
| 選び方 | 固定の 10 行の一覧（`<select>`、名だけを刷る）。連続の滑り子も色の入力も無い | 同じ 10 行（表 T-305）。見本の升を 5 つずつ 2 段（問い 2） |
| 値 | 色相の整数（214 / 190 / 140 / 95 / 50 / 28 / 6 / 330 / 285 / 250） | 同じ。`TH-1` は `S-73` の既定に同じ |
| 何が動くか | `--hue` を使う全ての色（予定・実績・罫・パネルの地・強調・行の帯）に加え、色相ごとに明度を寄せ（`:2750-2759`）、地の彩度を解く（`:2764-2772`） | 表 T-236 の色相追随の行（下の表）。⛔ **明度の寄せと地の彩度の解きは持たない**（`DFC-865`、問い 3） |
| 保存 | 文書の値（`:2708-2716` の注「Document settings, not viewer preferences」） | 同じ。`Project.themeHue`（`DR-5`） |

**色相を変えると動く行**（表 T-236 の `色相追随` の欄が ○ の行、`61bbd572` で 13 行。⭐ `ebc71984` では 14 行だった —— `CR-551` の J-03 が `S-195` を固定の色にした）:

| 行 | 何を塗るか |
|---|---|
| `S-146` | 地の色（⚠️ 暗いテーマの側だけ。明るいテーマは `#ffffff` の固定） |
| `S-149` ・ `S-150` ・ `S-231` | 罫、パネルの地（行見出しパネル・プロパティパネル・パレット）、掴み代の印 |
| `S-151` | 強調の色 —— 選択と現在位置。⭐ 留めた行の地（`FR-098`、`S-214` を掛ける）と押下状態 `EN-3` もこれを使う |
| `S-155` 〜 `S-158` | 色を指定していない `Task` の予定と実績の塗りと縁 |
| `S-164` 〜 `S-167` | 行の帯・帯の縁・最上位の行の地・交互の行の地（色を指定していない `TaskGroup`、`FR-042`） |
| ~~`S-195`~~ | カーソル —— ⛔ `CR-551` の J-03 で色相に追随しなくなった（`#c2188f` ／ `#f07ad0`） |
| 継ぐ行（間接） | `S-162`（進捗マーカーの地 ＝ `S-146`）、`S-169`（ラベルの縁取り ＝ `S-146`）、`S-311`（停止日から再開アイコンへの破線 ＝ `S-158`） |

⛔ **動かない行**: 文字（`S-147` ・ `S-148` ・ `S-168`）、良・注意・不良（`S-152` 〜 `S-154` ・ `S-183`）、依存線（`S-159`）、イナズマ線（`S-160`）、注記（`S-312`）、基準日線（`S-163`）、パレット色（表 T-294）とカスタムカラー、`CR-551` が足した遅れのマーカーの 2 行（`S-326` ・ `S-327`）と市松の 2 行（`S-336` ・ `S-337`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに主要な操作へ到達できる）—— `FR-041` は「作成者がテーマの色相…を選んだとき」と定めるのに、いまは画面から選ぶ道が 1 つも無い（`DFC-862`）。利用者の問い「カラーテーマってどうやって選ぶ？」がそのまま症状である。
⭐ **`CH-5` ／ `GL-005`** —— 入口を 1 つも増やさず、既にある `IC-17` の面に欄を 1 つ置くだけにした（面の数も入口の数も変わらない）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・重複がない。唯一の正）** ——
  ① `FR-041` の「作成者が…選んだとき」に対して、表 T-109 に入口が無い（`DFC-862`。`DFC-350` が 2026-09-06 に数えた 15 種の 1 つ）→ E-01。
  ② 表 T-104 の `K-60`（`themeHue`）は設定の名簿にあるのに、値が `documentSettings` の鍵ではないので `IC-17` の面に出ない（`DFC-863`。`PND-434` が既に指摘）→ E-01 が欄の名を `K-60` の語とする。
  ③ `FR-072` の「その欄は読むだけ」と、①の入口を本面に置くことがぶつかる → 数え上げない例外を 1 文足した（E-03）。
  ④ ⛔ **`FR-041` の「地の彩度・予定と実績と輪郭線の明度の寄せ幅…は、そこから規則で解いて求めること（MUST）」と、表 T-236 の固定の式が食い違う**（`docs/spec/01-04-requirements.md:2002`、`_assets/tbl-settings.md:211` の「解き方は「色相ごとに、コントラスト規則が壊れる寸前まで濃い地色」である」）。コードも `H` を入れるだけで解かない（`src/adapter/svg-renderer/svg-renderer.ts:139-146` の `colourOf`）。⇒ `DFC-865`。本書は解かない（問い 3）。
  ⑤ `NFR-007` の RATIONALE「テーマの色相を変えても満たすこと」（`:7164`）と `LM-18`（`:216`、承知のうえで割る）は既に食い違っており、本書で画面から 1 押しで届くようになる → `LM-18` に、表 T-305 のどの行が割るかを実測で書いた（E-04）。⚠️ `NFR-007` の文は書き直さない（`LM-18` が例外の持ち主）。
  ⑥ `_source/settings.schema.json:366` の注「writing 214 here would copy S-73's value into 20 rows」の 20 は偽（`61bbd572` で 13 行、`ebc71984` では 14 行）→ 数を持たない文に替えた（J-02、`DFC-864`）。
- **`R1.4`（異常系・境界値）** —— 文書の `themeHue` が 表 T-305 のどの行とも等しくないとき（`Agent API` かファイルが置いた値。範囲は 0 〜 359 で、`CM-5` が範囲の外を拒む —— `src/use-case/edit-document/edit-project.ts:87-92`）の欄の示し方を書いた（E-01）。いま持っている色相を押したとき、文書が動かないので取り消しの段を残さない（表 T-027 の後の段の既存の MUST、`edit-project.ts:91` が既に同じ文書を返す）。
- **`R1.2`（検証できる表現）** —— 「5 つずつ」を `S-368` に、選べる色相を表 T-305 の行に、見本の色を 表 T-236 の `S-151` に置いた。割る行の比は数で書き、測り方を添えた（E-04）。
- **`R2.1`（命名）** —— 新しい接頭辞 `TH`（Theme Hue）。辞書の節 `themeHues`。

### ③ 利用者に問わずに決めたこと

⭐ 下は根拠を添えて問わずに決めた（あとから覆せる。戻し方は 1 節）。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 「カラーテーマ」は色相（`themeHue`）だけとする。明暗（`IC-16`）とモノクロ（`IC-100`）はそれぞれの入口のまま | 逐語の「プロジェクトの」。明暗は読む人の値（表 T-203 の `S-72`）であり、プロジェクトの値は色相だけ（`DR-5`）。試作の `selHue` も色相だけを変える | — |
| 決定 2 | 欄は文書の設定の面の**先頭**に置く | 面はほかに読むだけの欄を 120 持つ（`SETTINGS_DEFAULTS` の鍵の数、13 節）。末尾では 120 行を送らないと届かない（`FR-006` の「最も頻繁に触る値のためにスクロールさせてはならない」と同じ理由）。`JDG-382`「色の設定はプロパティーの一番下」は選択を出すパネル（表 T-016）の並びであり、`CR-551` の決定 19 も本面を外している | `JDG-382` を本面にも当てると読むなら末尾へ移す（E-01 の 1 語） |
| 決定 3 | 見本は、その行の色相で解いた `S-151`（強調の色）で塗る | 本書の欄が載るパネルの地 `S-150` に対し、全 360 色相で明るいテーマ 3.86 以上・暗いテーマ 4.59 以上（13 節）。予定の塗り `S-155` ではパネルの地との比が明るいテーマで 1.24、暗いテーマで 1.30 まで下がり、見本が地に沈む | 見本の色は実績バーの色ではない（同じ色相の、より濃い色） |
| 決定 4 | 見本にモノクロを効かせない | モノクロでは 10 の見本が同じ灰になり選べない。モノクロでも保存値は変わらず、色に戻せば効く（`FR-041` の RATIONALE） | モノクロの画面に色の升が 10 並ぶ |
| 決定 5 | 欄の名は 表 T-104 の `K-60` の語（「テーマの色相」／ `themeHue`）、欄の値は選んでいる行の語 | `K-60` は既に辞書に在る（`docs/spec/_source/display-words.json:1679-1684`）。英語の側が鍵の綴りなのは設定の面のほかの欄と同じ（`W-2`） | 利用者の語「カラーテーマ」ではない。変えるなら辞書の `K-60` の 1 項 |
| 決定 6 | 等しい行が無い色相は、値を数で示し、どの見本も選んでいると示さない | 語を作ると、辞書に無い語を刷ることになる（`FR-038`） | 画面から元の値へは戻せない（取り消しでは戻る） |
| 決定 7 | 色相の語は、パレット色の辞書と同じ色の語を使う（青 ・ 緑 ・ 黄 ・ 赤 ・ 紫 ・ オレンジ）。残る 4 つは試作の語（青緑 ・ 黄緑 ・ 赤紫 ・ 藍） | 1 つの画面の中で同じ色を 2 つの語で呼ばない（試作の「橙」は辞書の `orange` の「オレンジ」と食い違う） | 試作と 1 語だけ違う |
| 決定 8 | `TH-1` の色相は数を書かず「`S-73` の既定に同じ」とする | 規則 03 は仕様が 1 度持つ値を写すことを禁じる。`214` を写すと既定を動かしたとき一覧が取り残される | 生成器が既定を引いて解く（4.3 節） |
| 決定 9 | 押したら `CM-5` を 1 回発行し、取り消しは `UN-13` の 1 段 | `UN-13` は既に「テーマ（`FR-041`）」を対象に持つ。色相は日程データの群なので、押すと日程データの刻が動き（`FR-063`、`DR-5`）、未保存の編集が立つ | — |
| 決定 10 | 表 T-305 に `CT-3` ／ `CT-4` を割る 4 行を残す（問い 3 の (a)） | 利用者が参考に名指した一覧そのもの。割り幅は 0.16 以内（13 節）。行を 1 つ消せば外せる | `FR-007` の MUST が 4 つの色相で満たされない（`LM-18` が持つ） |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | `frame-loop.ts` | 裁定を戻すとき |
|---|---|---|---|---|
| 入口の置き場（問い 1） | `FR-041` の 1 段、`FR-072` の例外の 2 文、表 T-109 の `IC-17` | E-01 ・ E-03 ・ E-05 ・ J-03（`IC-17` の hint） | 触らない（13 節） | `FR-041` の 1 文（置き場）。案 B ／ C に移るなら 11 節の表の行 |
| 選べる色相（問い 2 ・ 3） | 表 T-305（新）、辞書の `themeHues`（新）、接頭辞 `TH`（新） | E-02 ・ J-03 ・ J-04 | 触らない | 表 T-305 の行を足す・消す（1 行ずつ）。語は辞書の 1 項 |
| 並べ方 | `S-368`（新、表 T-206） | J-01 | 触らない | `S-368` の値 |
| 見本の色 | `FR-041` の 1 文（`S-151`） | E-01 | 触らない | その 1 文の行 ID |
| コントラストの限界 | `LM-18` | E-04 | 触らない | `LM-18` の 1 行 |
| 原稿の注の古い数 | `_source/settings.schema.json:366` | J-02 | 触らない | — |

**数**: 仕様の文の編集 5（E-01 〜 E-05）、原稿 JSON の編集 4（J-01 〜 J-04）。

---

## 2. 新しい識別子

⭐ 番号は 2026-09-24 に前に立つ者が `b7a3b76f` で詰めた（`CR-555` 〜 `CR-560` を CR の順に、配られた帯の先頭から隙間なく。帯の外の接頭辞は木の最大 M の次から）。下の「空いている」はその木で測った主張である。⚠️ 規則 02 の 2.5 節: **当てる直前に測り直すこと。** 測り方は 13 節。

| 種類 | 採ったもの | 測った最大（`b7a3b76f`、`CR-555` 〜 `CR-560` の草案を除く） |
|---|---|---|
| 表 | `T-305` | 仕様書（`docs/spec`）が定める表の最大は `T-297`（`05-07-design.md` の見出し）で、`T-3nn` は 1 つも無い。`change-request/` では `CR-561` の草案が `T-319` まで引き、`T-306` は古い `CR-110` が、`T-307` は `docs/review/inventory/G2-settings-T202-T203.md` が引く。`T-305` は木のどこにも現れない |
| 設定値 | `S-368` | `S-367`（`CR-556`）の次（`S-999` は試験の番兵） |
| 接頭辞 | `TH`（Theme Hue）。登録簿の `TC` と `TM` のあいだに足す | 登録簿は 163 件（`CR-551` の `RK` を含む）。`TH-` の行は本書のほかに木のどこにも無い |
| 行 | `TH-1` 〜 `TH-10` | — |
| 辞書の節 | `themeHues`（鍵は `rowId`） | 節は 27（`display-words.json` の最上位の鍵、`$comment` を含む） |
| 台帳 | `JDG-450`（利用者の指示）、`JDG-451` 〜 `JDG-454`（問い 1 〜 4 の答え）、`DFC-862` 〜 `DFC-865` | 帯の中で `CR-556` の次 |
| ほかの接頭辞（`GR` `IC` `CM` `AT` `PR` `EN` `CV` `FR` `AM` ほか） | 0 —— 入口・命令・列・要求を 1 つも足さない。⭐ 表 T-016 の行（`PR-`）も取らない —— 色相の欄は `FR-072` の文書の設定の面にあり、表 T-016 の外である（`CR-551` の決定 19） | ⭐ 入口（`IC-`）も足さない —— 問い 1 は A と答えられ、案 C（新しい入口）は採られなかった（2026-09-24、`JDG-451`）。`UC-` ・ `V-` ・ `GL-` ・ `CH-` は取らない |
| 生成物 | `src/adapter/screen-renderer/theme-hue-roster.json`（新）、`tools/generate_theme_hue_roster.py`（新） | どちらも木に無い |

- 本書が取らないもの: 保留の行（12 節）。
- 6 本を詰めた後に返った帯: `S-377` 〜 `S-384`、`T-309`（`T-306` ・ `T-307` は古い文書が引くので飛ばした）、`DFC-874` 〜 `DFC-889`、`PND-561` 〜 `PND-580`（6 本とも保留の行を起こさない）、`PR-29` 〜 `PR-32`、`FR-137` 〜 `FR-148`、`IC-109` 〜 `IC-114`、`AM-20` 〜 `AM-24`（6 本とも使わない）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`61bbd572`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `PND-434` の案①の置き場「基本情報と同じ面」（2026-09-07 の裁定。仕様には当たっていない） | `docs/development-records/pending-decisions.md:297` | 文書の設定の面の先頭の欄（`JDG-450`） | 台帳（12 節）。仕様の文は無い |
| `FR-072` の「その欄は読むだけ」の、例外を持たない読み | `docs/spec/01-04-requirements.md:1896-1898` | 文は残し、要求が本面に置いた欄を除く 2 文を足す | E-03 |
| `LM-18` の「見た目を試作に揃えることを優先し」の、試作も割っていたかのような読み | `:216` | 試作は寄せで通していた、を書き添える | E-04（文は残す） |
| 表 T-109 の `IC-17` の「文書の描画設定をプロパティパネルに表示する」だけの職務 | `docs/spec/_assets/tbl-glossary.md:529` | 色相を選ぶ欄を持つことを添える | E-05 |
| 辞書の `IC-17` の hint | `docs/spec/_source/display-words.json:239-242` | 色相を選べることを添える | J-03 |
| 注の数「into 20 rows」 | `docs/spec/_source/settings.schema.json:366` | 数を持たない文 | J-02 |
| コードの「設定の欄はすべて読むだけ」（⛔ 本書は直さない。9 節） | `src/adapter/screen-renderer/properties-panel.ts:714-726`（`settingsFields` の `isEditable: false` と `controls: []`） | 先頭に色相の欄（編集できる）を足す | 実装する者 |
| コードの「文書の列は `title` だけを書く」 | `src/adapter/input-command-translator/field-commit.ts:271-274`（`commandFromProjectColumn` の `if (column !== 'title') return []`） | `themeHue` も書く（`CM-5`） | 実装する者 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**（`CR-541` ・ `CR-551` と同じ）: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（13 節で 9 件すべて 1 回を確かめた）。旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊である。
⚠️ 生成物（`_assets/tbl-settings.md` ・ `tbl-row-id-prefixes.md` と `src/` の生成物）は手で直さない。原稿を直して `npm run gen` を打つ。

### 4.1 文の編集（`01-04-requirements.md` ・ `_assets/tbl-glossary.md`）

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
入口の置き場（`FR-041`）。⚠️ 旧の 2 行上の段（モノクロの入口）は `CR-551` の E-10 が書き換えた後の文であり、本書の旧はその段を含まない（`61bbd572` の `:2013`）。旧
```text
⚠️ **明暗テーマ（`themePreference`）とは別の値である**（`_assets/tbl-settings.md` の 表 T-203 の `S-72` と `S-74`）。
```
新
```text
⚠️ **明暗テーマ（`themePreference`）とは別の値である**（`_assets/tbl-settings.md` の 表 T-203 の `S-72` と `S-74`）。  
⭐ テーマの色相を選ぶ入口は、文書の設定の面（`FR-072`。面を出す入口は `_assets/tbl-glossary.md` の 表 T-109 の `IC-17`）の先頭の欄とすること（MUST） —— 色相は日程データの群の値であり（表 T-052 の `DR-5`）、`App Header` に読む人の明暗（`IC-16`）と並ぶ入口を別に立てると、2 つを同じ種類の選びと読ませる。  
その欄には 表 T-305 の行を同表の順に、1 段に `_assets/tbl-settings.md` の 表 T-206 の `S-368` 個ずつ並べ、押された行の色相で 表 T-108 の `CM-5` を 1 回発行すること（MUST）。  
取り消しの段は 表 T-027 の `UN-13` に従う。  
各行の見本は、その行の色相で解いた `_assets/tbl-settings.md` の 表 T-236 の `S-151` を、いま描いている明暗の値で塗ること（MUST） —— パネルの地（`S-150`）に対して、どの色相でも 3 : 1 を割らない。  
⛔ 見本にモノクロ（`S-74`）を効かせてはならない（MUST NOT） —— すべての見本が同じ灰になり選べなくなる。  
⚠️ モノクロのあいだに選んだ色相は、色に戻したときに効く（本要求の RATIONALE の「保存値は変わらない」）。  
欄の名は `FR-038` の辞書が 表 T-104 の `K-60` に持つ語とし、欄の値は文書の `themeHue` と等しい 表 T-305 の行の語とすること（MUST）。  
⚠️ 等しい行が無いとき（`Agent API` やファイルが置いた値）は、値を数で示し、どの行も選んでいるとは示さない。  
⛔ この欄に、カスタムカラーの入口・透明・テーマ追随へ戻す入口（表 T-017b の `CV-9` と `FR-007` の「戻す入口」）を並べてはならない（MUST NOT） —— 色相は 0 〜 359 の数であって色ではなく、透明にも追随にも意味が無い。
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
選べる色相（`FR-041` の RATIONALE の末に表を置く。`FR-007` が RATIONALE の後に 表 T-017 を置く形と同じ）。旧
```text
⭐ 人が指定した色は、明暗の値を選んでから無彩色にする（表 T-017b の `CV-7`）。
```
新
```text
⭐ 人が指定した色は、明暗の値を選んでから無彩色にする（表 T-017b の `CV-7`）。

⭐ 画面で選べる色相は 表 T-305 の行である（上の STATEMENT の後の段）。  
行と順は、試作の色相の選び（`previous-project-result/08-poc/poc-integrated.html` の `HUES`、`:700-711`。選ぶ入口は `selHue`、`:940` ・ `:2777-2783`）の 10 行である。  
語は `FR-038` の辞書（`_source/display-words.json` の節 `themeHues`）が同じ行 ID で持つ。  
⚠️ `TH-1` は `_assets/tbl-settings.md` の `S-73` の既定と同じ色相を指す —— 既定へ戻す入口を別に置かない（`TH-1` を押せば戻る）。  
⚠️ 表 T-017a の条件を割る行が在る —— どの行がどれだけ割るかは `LM-18` が持つ。

**表 T-305 — テーマの色相の選択肢**

| 行 ID | 色相 |
| --- | --: |
| TH-1 | `S-73` の既定に同じ |
| TH-2 | 190 |
| TH-3 | 140 |
| TH-4 | 95 |
| TH-5 | 50 |
| TH-6 | 28 |
| TH-7 | 6 |
| TH-8 | 330 |
| TH-9 | 285 |
| TH-10 | 250 |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`FR-072` の例外。旧
```text
⭐ パネルが文書の設定を出しているあいだ、その欄は読むだけとすること（MUST）。  
⛔ 編集できると示してはならない（MUST NOT） —— 設定を変える道は、それぞれの要求が置く入口（`Command Palette` ほか）だけであり、欄に書き換える手段が無い。  
⚠️ 代償: 入口を持たない設定の値は、画面からは変えられない。
```
新
```text
⭐ パネルが文書の設定を出しているあいだ、その欄は読むだけとすること（MUST）。  
⛔ 編集できると示してはならない（MUST NOT） —— 設定を変える道は、それぞれの要求が置く入口（`Command Palette` ほか）だけであり、欄に書き換える手段が無い。  
⭐ ただし、別の要求がその入口を本面の欄として置いたときは、その欄だけは、その要求に従って選ばせること（MUST） —— `FR-041` のテーマの色相の欄がこれである。  
⛔ 本要求がそうした欄を数え上げてはならない（MUST NOT） —— 置き場を決めるのは置く要求の側であり、上の `U-47` と同じく、員数を 2 か所に置かない。  
⚠️ 代償: 入口を持たない設定の値は、画面からは変えられない。
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`LM-18`。旧
```text
⛔ `themeHue` を動かすと、360 の色相のうち 96 で 表 T-017a の `CT-3` を割り（最悪 2.70:1）、129 で `CT-4` を割る。<br>
```
新
```text
⛔ `themeHue` を動かすと、360 の色相のうち 96 で 表 T-017a の `CT-3` を割り（最悪 2.70:1）、129 で `CT-4` を割る。<br>⭐ 画面で選べる 表 T-305 の 10 行のうち 4 行がこれに当たる（2026-09-24 に測った）: 明るいテーマで `TH-3` の `CT-4` が 2.97、`TH-4` の `CT-3` が 2.96 と `CT-4` が 2.84、`TH-5` の `CT-4` が 2.90、暗いテーマで `TH-10` の `CT-3` が 2.997。<br>測り方は、表 T-236 の式の `H` に色相を入れた HSL を sRGB へ換算し、WCAG 2.1 の相対輝度 L から (L1 + 0.05) ÷ (L2 + 0.05) を求めた。<br>⚠️ 試作は色相ごとに明度を寄せて、この 4 行も通していた（`previous-project-result/08-poc/poc-integrated.html` の `applyPalette`、`:2750-2759`）—— 表 T-236 は寄せを持たない。<br>
```

<!-- EDIT id=E-05 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の `IC-17`。旧
```text
| IC-17 | `App Header` | 表示 | 文書の描画設定をプロパティパネルに表示する | `FR-072` | — |
```
新
```text
| IC-17 | `App Header` | 表示 | 文書の描画設定をプロパティパネルに表示する。<br>⭐ テーマの色相は、その面の先頭の欄で選ぶ（`FR-041` の 表 T-305） | `FR-072` | — |
```

### 4.2 原稿 JSON の編集（`_source/`）

⛔ JSON も文として当てる（旧が 1 回だけ現れることを数えてから置き換える）。当てた後は `json.loads` で読み、`settings.json` は手で書いた検証の形（`settings.schema.json`）で確かめてから `npm run gen` を打つこと。

J-01 `settings.json` —— 表 T-206 の末の行の後ろに 1 行足す。⚠️ `61bbd572` では末の行は `S-341`（`S-338` はその 1 つ前）である。`CR-552` 〜 `CR-554` と、同じ日に起草された兄弟の変更要求が末に行を足していれば、その後ろに置く（並びは印刷順であり、意味を持たない）。
```json
{
 "id": "S-368",
 "value": {
  "ja": "文書の設定の面の、テーマの色相の欄の 1 段に並べる見本の数（`FR-041` の 表 T-305）"
 },
 "default": {
  "num": "5"
 },
 "note": {
  "ja": "欄の見せ方であり、日程の内容ではないので保存しない。⭐ 表 T-305 の 10 行が 2 段に並ぶ —— 色の欄（`S-338`）と同じ形である。⛔ **`S-338` を継がない** —— 並べる表が違う（あちらは 表 T-294）。片方を変えてももう一方は動かない。⛔ **測って決めた値ではない**"
 }
}
```

<!-- EDIT id=J-02 file=docs/spec/_source/settings.schema.json -->
注の古い数。旧
```text
writing 214 here would copy S-73's value into 20 rows, and rule 03 forbids
```
新
```text
writing 214 here would copy S-73's value into every row whose hue column says it follows, and rule 03 forbids
```

<!-- EDIT id=J-03 file=docs/spec/_source/display-words.json -->
辞書 2 か所。(1) 節 `icons` の `IC-17` の hint。旧
```text
    "ja": "文書の描画設定をプロパティパネルに表示する",
    "en": "Show the document's drawing settings in the Properties Panel"
```
新
```text
    "ja": "文書の描画設定をプロパティパネルに表示する。テーマの色相もここで選ぶ",
    "en": "Show the document's drawing settings in the Properties Panel, where the theme hue is chosen"
```
(2) 節 `colourField` の後ろ（`scaleEcho` の前）に節 `themeHues` を足す。旧
```text
 ],
 "scaleEcho": [
```
新
```text
 ],
 "themeHues": [
  {"rowId": "TH-1", "text": {"ja": "青", "en": "Blue"}},
  {"rowId": "TH-2", "text": {"ja": "青緑", "en": "Blue-green"}},
  {"rowId": "TH-3", "text": {"ja": "緑", "en": "Green"}},
  {"rowId": "TH-4", "text": {"ja": "黄緑", "en": "Yellow-green"}},
  {"rowId": "TH-5", "text": {"ja": "黄", "en": "Yellow"}},
  {"rowId": "TH-6", "text": {"ja": "オレンジ", "en": "Orange"}},
  {"rowId": "TH-7", "text": {"ja": "赤", "en": "Red"}},
  {"rowId": "TH-8", "text": {"ja": "赤紫", "en": "Red-purple"}},
  {"rowId": "TH-9", "text": {"ja": "紫", "en": "Purple"}},
  {"rowId": "TH-10", "text": {"ja": "藍", "en": "Indigo"}}
 ],
 "scaleEcho": [
```
⚠️ 字下げは原稿の形（1 項を複数行に開く）に合わせて開いてよい。中身は上のとおり。

<!-- EDIT id=J-04 file=docs/spec/_source/row-id-prefixes.json -->
接頭辞 `TH` を字の順の位置（`TC` の後、`TM` の前）に足す。旧
```text
    "ja": "タスクを作る手つきの規則の条"
   }
  },
  {
   "prefix": "TM",
```
新
```text
    "ja": "タスクを作る手つきの規則の条"
   }
  },
  {
   "prefix": "TH",
   "words": "Theme Hue",
   "owner": "spec",
   "means": {
    "ja": "画面で選べるテーマの色相"
   }
  },
  {
   "prefix": "TM",
```

### 4.3 生成器と生成物（形で示す）

| 何 | 何をする |
|---|---|
| `tools/generate_theme_hue_roster.py`（新）と `package.json` の `gen` | 表 T-305 を `01-04-requirements.md` から読み、`src/adapter/screen-renderer/theme-hue-roster.json` に `[{ "rowId": "TH-1", "hue": 214 }, …]` を表の順に刷る。「`S-73` の既定に同じ」は `settings.json` の `S-73` の既定を引いて数にする。`--check` を `gen:check`（検査 16）に入れる。⭐ 先例は `tools/generate_icon_roster.py`（表 T-109 → `icon-roster.json`） |
| `tools/generate_display_words.py` | 節 `themeHues` を足す: 行 ID の集合は 表 T-305 から読み（`:427-429` の `assignments` と同じ `table_rows` の形）、`:481` の鍵の表に `'themeHues': ('rowId', ('text',))`、`:567` の節の並びに `'themeHues'` |
| `npm run gen` | `tbl-settings.md`（`S-368`）・ `tbl-row-id-prefixes.md`（`TH`）・ `src/` の `display-words.json` ・ `icon-roster.json` ・ `help-roster.json`（`IC-17` の文）を刷る |

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

| # | 間 | 継ぎ目（逐語） |
|---|---|---|
| S-1 | 生成器 ↔ パネル | `src/adapter/screen-renderer/theme-hue-roster.json` は `[{ "rowId": "TH-n", "hue": <integer 0..359> }]` を表 T-305 の順に持つ。`TH-1` の `hue` は `S-73` の既定（214） |
| S-2 | 仕様 ↔ パネル（`properties-panel.ts`） | 文書の設定の面の欄の並びの**先頭**に 1 欄: `row: 'K-60'`、`name` ＝ 辞書の `K-60` の語、`text` ＝ `themeHue` と等しい `TH` 行の語（無ければ `String(themeHue)`）、`isEditable: true`、操作子 1 つ `{ key: { holder: 'project', column: 'themeHue' }, choiceValues: 名簿の hue を十進の文字列で、choices: 各行の語, 見本の塗り: colourOf('S-151', hue, dark, false) }`。カスタムと透明の入口は持たない。ほかの欄はいまのまま `isEditable: false` |
| S-3 | パネル ↔ 翻訳器（`field-commit.ts`） | `FieldCommit` の `key` が `{ holder: 'project', column: 'themeHue' }` のとき、`text` が 0 〜 359 の整数の十進なら `[{ kind: 'setThemeHue', hue: Number(text) }]`、それ以外は `[]` |
| S-4 | 仕様 ↔ 描き手（`properties-panel-drawing.ts`） | 見本の升は `CR-551` の色の欄と同じ箱（`:512-520` の格子、`:566-582` の欄）。1 段に `S-368` 個。押すと S-3 の `FieldCommit` を 1 つ出す（`text` は押した升の `choiceValues`） |

---

## 6. グラフ（6.1 は `61bbd572` で測り直した。6.2 は `ebc71984` のまま）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照。`61bbd572`、2026-09-24）

| 対象 | 要求 / 参照 | 指している要求と扱い |
|---|---|---|
| `FR-041` | 6 / 26（`ebc71984` では 7 / 27 —— `CR-551` の E-09 で `FR-003` がモノクロの置き場の約束を引かなくなった） | `FR-007` ・ `FR-031` ・ `FR-043` ・ `FR-013` ・ `FR-074` ・ `FR-039`。⭐ どれも色相の入口の場所を引かない（`FR-074` は「`themeHue` はテーマの色相（`FR-041`）」と除外の持ち主を指すだけ —— 偽にならない） |
| `FR-072` | 6 / 18 | `FR-091` ・ `FR-009` ・ `FR-016` ・ `FR-052` ・ `FR-029` ・ `FR-040`。⭐ どれも「読むだけ」を引かない（パネルを出す・閉じる・幅・押下状態の話）。状態機械 `propertiesPanelContentStateMachine` の出来事 `settingsEntryPressed` は変えない |
| `IC-17` | 0 / 2 | 状態機械の出来事の表だけ（`tbl-state-machines.md:71`） |
| `CM-5` ・ `K-60` ・ `LM-18` | 0 / 0 | 浮いている。⭐ 書き直しで偽になる所が無い |
| `S-73` | 0 / 1 | `fig-erd-detail.md:326` の列の意味だけ |
| `DR-5` | 0 / 2 | 書き直さない（本書は置き場を群から動かさない） |
| `UN-13` | 1 / 1 | `FR-088`。書き直さない（既に「テーマ（`FR-041`）」を持つ） |
| `S-151` | 4 / 7 | `FR-004` ・ `FR-081` ・ `FR-098` ・ `FR-029`。本書は値を変えず、見本の色として引くだけ |
| `IC-16` | 2 / 4（`ebc71984` では 1 / 3 —— `CR-551` の E-10 で `FR-041` がモノクロの入口の位置として `IC-16` を名指した） | `FR-039` ・ `FR-041`。書き直さない（本書の E-01 も `IC-16` を名指すが、置き場の比べとしてだけ） |

⭐ 導いた条項ごとに、届いた行を `rulings.md` と `pending-decisions.md` で引いた（handoff の 0.2 の 3 段: 台帳を grep → 隣を `impact.py` → ほかの道は無いか）: 当たるのは `PND-434`（本書が置き場を覆す）と `PND-433`（基本情報の面。本書は触らない —— 10 節）、`DFC-350`（入口の無い命令 15 種。本書で `setThemeHue` が 1 つ減る）、`JDG-382`（色の行を末尾へ —— 決定 2 で本面には当てない）、`JDG-383` ・ `JDG-397`（色の欄の並べ方と、宿主の色の入力は [任意] のときだけ —— 本書の欄は [任意] を持たないので宿主の色の入力も出ない）。`JDG-405`（`rulings.md:654`、2026-09-24。色の欄の 2 段目を [任意] [透明] [テーマ] とし、[テーマ] で追随へ戻す。`CV-9` に着地済み —— `01-04-requirements.md:1957`）—— 本書の欄は 3 つとも持たない（E-01 の MUST NOT。色相の欄に「追随へ戻す」先は無い —— 色相そのものがテーマである）。⚠️ 初稿は `ebc71984` で `JDG-405` を見つけられなかった（`CR-551` の着地より前だった）。「テーマの色相」「色相を選」「`themeHue`」を `rulings.md` で引くと 0 件 —— 利用者の裁定は `PND-434` の 1 つだけである。

### 6.2 `induced.py`（4 群）

⚠️ 6.2 は `ebc71984` で測ったまま走らせ直していない —— `induced.py` は `check.sh` の書き出す StrictDoc の JSON を要る。本書は `check.sh` を打たない約束なので、根の checkout の `scratch/spec-check/sd-out/json/index.json`（2026-09-24 01:57 の書き出し）を読むだけの包みで走らせた（13 節）。親子の関係は `ebc71984` と同じ見込みだが、当てる前に `check.sh` の後で走らせ直すこと。

| 種 | 解決 | 種の中の辺 | 閉路 | 扱い |
|---|---|---|---|---|
| `FR-041 FR-072 IC-17 CM-5 K-60 S-73 DR-5 UN-13` | 8/8 | 5 | 0 | — |
| `FR-041 FR-007 T-017a CT-3 CT-4 LM-18 NFR-007 S-151 T-236` | 9/9 | 10 | 0 | — |
| `FR-072 FR-006 T-016 T-104 K-60 FR-038` | 6/6 | 4 | 0 | — |
| `FR-041 FR-074 PF-1 T-224 FR-072` | 5/5 | 2 | 0 | — |

⭐ 閉路が無いので、E-01 〜 E-05 は上から順に 1 つずつ当ててよい。

---

## 7. 数の予測（`61bbd572` で測った。当てた後に同じ数え方で突き合わせる）

| 数 | 前（`61bbd572`） | 本書の差分 | 内訳 |
|---|--:|--:|---|
| tables | 187 | +1 | 表 T-305 |
| figures | 27 | 0 | — |
| rows | 2305 | +11 | `TH-1` 〜 `TH-10`、`S-368` |
| uids | 162 | 0 | 要求を足さない |
| 接頭辞 | 163 | +1 | `TH` |
| 辞書の節 | 27 | +1 | `themeHues`（10 項）。`IC-17` の hint は語を替えるだけ |

⚠️ 前は `CR-551` の着地後の木である。当てる木は `CR-552` 〜 `CR-554` の後なので、前はさらに動く（`CR-552` で rows −4、`CR-553` で +1、`CR-554` は 表 T-075 に行を足す）。⭐ **予測するのは本書の差分である。**

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

⛔ **仕様と生成器と名簿を読む側は同じ波にすること。** 辞書に節を足すと、節の員数を持つ試験（`tests/contract/display-words.contract.test.ts:360-361` の鍵の表）が落ちる。名簿を読む側（`properties-panel.ts`）が無いまま名簿だけを刷ると、足した色相が画面に出ないまま緑になる。

```
wave 0  spec + generators (ONE body, one worktree cut after CR-552..CR-554 landed; CR-551 already has)
          section 4 (E-01..E-05, J-01..J-04), count each old block == 1 on that tree first
          tools/generate_theme_hue_roster.py (new) + package.json gen / gen:check
          tools/generate_display_words.py (themeHues)
          npm run gen && npm run gen:check && npx tsc --noEmit
          -> tests that quote FR-072 verbatim or assert "no settings field is editable" go red here (section 9)
wave 1  (parallel, disjoint files; cut from wave 0's commit)
  1a screen-renderer + translator
          src/adapter/screen-renderer/properties-panel.ts (settingsFields: the K-60 field first, seam S-2),
          src/adapter/screen-renderer/screen-renderer.ts (types only, if the control needs a swatch list),
          src/adapter/input-command-translator/field-commit.ts (commandFromProjectColumn, seam S-3)
  1b dom surface
          src/framework/dom-screen-surface/properties-panel-drawing.ts (the swatch grid, seam S-4),
          src/framework/dom-screen-surface/field-editing.ts only if a swatch press does not already
          reach fieldCommit (measure first; CR-554 leaves this file whole)
wave 2  tests by a spec-only tester (never the implementer), on the MERGED tree; then check.sh + vitest;
          npm run build (dist/) for the user to try by file://
```

- ⚠️ `properties-panel-drawing.ts` には `CR-551` の色の欄（2 段 × `S-338` と [任意][透明][テーマ]、`:512-582`）が着地済み。本書の 1b は同じ見本の箱を使い、[任意][透明][テーマ] の段を描かないこと（S-4）。
- ⭐ `properties-panel.ts` と `field-commit.ts` の `CR-551` の直し（`PR-13` と `setTaskVisualNamePlacement` を消す）は着地済み。本書の塊（`settingsFields` ・ `commandFromProjectColumn`）は `61bbd572` の行番号で書いた。
- ⚠️ `CR-554` はこの 4 ファイルのどれも割らない（同書 1 節の表で `properties-panel.ts` ・ `field-editing.ts` は「割らない」、`field-commit.ts` ・ `properties-panel-drawing.ts` ・ `screen-renderer.ts` は対象外）。⇒ 本書のコードの所は `CR-554` の前後で名が変わらない。
- ⚠️ `frame-loop.ts` は触らない見込み（13 節: 色相は毎フレーム `held.schedule.project.themeHue` から読まれ、`frame-loop.ts:1267` ・ `:3067`、`single-html-shell.ts:316` が既に運ぶ）。⚠️ 波 1 の体が触る要を見つけたら、`CR-554` の割った後の名（`frame-loop.ts` の兄弟）で書き、関数を太らせないこと（検査 60）。
- ⚠️ `dist/` は利用者が `file://` で試す。着地の報告には枝・commit・sha を添えること。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| 所 | 何をする | 試験（いま引いているもの。何を主張しているか） |
|---|---|---|
| `src/adapter/screen-renderer/properties-panel.ts:714-726`（`settingsFields`）・ `:814-831`（`propertiesPanelFromSelection` の設定の腕。`schedule` と明暗を `settingsFields` へ渡す） | 先頭に `K-60` の欄（S-2） | `tests/unit/cr-541-panels-help-tooltip-and-dialogue.test.ts:105-129`（`FR-072` の Q07 ・ Q08 —— 「どの欄も編集できない」「どの欄も操作子を持たない」）→ ⛔ 赤。`K-60` だけを除く主張と、E-03 の新しい 2 文の逐語に直す。`tests/unit/uf-64.test.ts:1233-1246`（「1 鍵 1 欄」の数が `SETTINGS_KEYS.length`、すべて `isEditable: false`）→ 赤。数は +1、`K-60` を除いて読むだけに。`:101-106` の注（`themeHue` は欄を持たない 8 行の 1 つ）→ 注を直す |
| `src/adapter/input-command-translator/field-commit.ts:271-274`（`commandFromProjectColumn`） | `themeHue` の腕（S-3） | `tests/unit/dfc-322-sk-9-the-document-name-is-edited-in-place.test.ts:285`（`holder: 'project'` は `title` だけ）→ 緑のまま。`themeHue` の腕の試験を足す |
| `src/framework/dom-screen-surface/properties-panel-drawing.ts:512-582`（`CR-551` の色の欄の描き手） | 升の格子を `S-368` で（S-4）。[任意][透明] を描かない | `tests/unit/cr-439-properties-panel-fields.test.ts` ・ `fr-006-panel-typography.test.ts` ・ `uf-71.test.ts`（`isEditable: false` を持つ見本の欄）→ 走らせて測る |
| `src/adapter/screen-renderer/screen-renderer.ts:143-198`（`PropertyControl`） | 型だけ。升の塗りの並びを色相の欄でも運べるなら触らない | — |
| `src/use-case/edit-document/edit-project.ts:87-92` | 触らない（`CM-5` は既に範囲を拒み、動かない書き込みで同じ文書を返す） | `tests/unit/dfc-378-a-write-that-changed-nothing-answers-the-same-document.test.ts:198-202` ・ `tests/unit/use-case.test.ts:181-182` ・ `:362` ・ `tests/unit/uf-27-28-29.test.ts:1523` → 緑のまま |
| 生成物（`npm run gen`） | `display-words.json` に `themeHues`、`icon-roster.json` ・ `help-roster.json` の `IC-17` の文 | `tests/contract/display-words.contract.test.ts:360-361`（節ごとの鍵の表）→ 赤。`themeHues: 'rowId'` を足す。`IC-17` の hint を逐語で引く試験は 0（`文書の描画設定をプロパティパネルに表示する` を `tests/` で引くと 0 件） |
| 新しく要るもの | — | ① `IC-17` を押すと面の先頭に 10 の升が 5 つずつ 2 段に並ぶ（e2e）。② 升を押すと `themeHue` が変わり、表 T-236 の ○ の行の色が変わる（地・罫・パネル・予定と実績・帯）、依存線（`S-159`）・イナズマ線（`S-160`）・注記（`S-312`）は変わらない。③ 取り消し 1 回で戻る（`UN-13`）。④ いまの色相を押しても取り消しの段が増えない。⑤ `themeHue` = 200 の文書では欄の値が `200` で、どの升も選ばれていない。⑥ モノクロでも升は色で塗られる。⑦ 未保存の印が立つ |

⚠️ 仕様だけを読む試験の体に渡す行: `FR-041`（E-01 の段）、`FR-072`（E-03 の 2 文）、表 T-305、`S-368`、`UN-13`、`LM-18`（E-04 の 4 つの比 —— 表 T-236 から計算して確かめる試験にしてよい）。

---

## 10. ⛔ この変更でやらないこと

- **試作の明度の寄せと地の彩度の解き**（`poc-integrated.html` の `applyPalette`、`:2729-2774`）を仕様へ入れること —— `FR-041` が既に求めている（`:1999` の「明度の寄せ幅…を規則で解いて求めること（MUST）」）のに、表 T-236 もコードも持たない（`DFC-865`）。⭐ **申し送り**: 入れるなら別の変更要求で、① 寄せの刻み（試作は 2 ずつ、上限 44）と、予定・縁・実績・強調に掛ける比（0.4 ・ 1 ・ 0.6 ・ 1）、② 地の彩度の探し方（0 〜 70 の 2 分探索を 9 回、地の明度は明るいテーマ 97、暗いテーマ 10）、③ 明るいテーマの地 `S-146` を `#ffffff` から色相付きへ変えるか、を設定値の行として書く。⚠️ 当たれば `LM-18` の 4 行と `NFR-007` の食い違いが消える（問い 3）。
- **文書の基本情報の面**（`PND-433`、`FR-074` の表 T-224）の置き場 —— `PND-434` と同じ日に「プロパティパネルの第 3 の中身」と裁定されたが、仕様に面の名が無い（`src/adapter/screen-renderer/open-modals.ts:354` の `STOP`）。本書は色相だけを動かす。
- 明暗（`IC-16`）とモノクロ（`IC-100`、`CR-551` が `App Header` へ移した）の入口。
- 色相の語の英語（問い 4 で問う）。
- `docs/development-records/` の `pending-decisions.md` ・ `changelog.md`、`A-appendix.md` の変更履歴（当てる者が書く）。

---

## 11. 前に立つ者へ返す問い（2026-09-24 に答えを受けた）

| # | 問い | 推奨と理由 | 答え |
|---|---|---|---|
| 1 | **色相を選ぶ入口をどこに置くか**。使う場面: 作成者が文書を作ったあと、ヘッダの `IC-17`（三）を押し、プロパティパネルに出た文書の設定の面で色を選ぶ。<br>**A** 文書の設定の面（`FR-072`）の先頭に、編集できる欄を 1 つ置く。`FR-072` の「読むだけ」に、要求が置いた欄を除く 2 文を足す（E-03）。入口 0、面 0、状態機械 0 を足す。<br>**B** `IC-17` を押すと、試作の `selHue` のような小さな一覧が落ちてくる。設定の面を出す職務は別の所へ移す。`propertiesPanelContentStateMachine` の出来事 `settingsEntryPressed`（表 T-109 の `IC-17`）を作り変え、落ちてくる面を 表 T-103 に 1 行足す。<br>**C** `IC-17` の右に新しい入口（`IC-111`、調整役の帯）を立て、押すと一覧が落ちてくる。入口 1、面 1 を足す。`PND-434` の「明暗の隣に立てるな」を覆す。逐語「三 の設定アイコンから」とも外れる | **A**。逐語が名指した `IC-17` をそのまま使い、足す物が無い。`FR-072` の例外は 1 つの規則（置く要求が持つ）なので、あとで基本情報（`PND-433`）などを同じ面に置くときも数え直さずに済む。代償: 選ぶには 2 押し（`IC-17` → 升）要る。B は 1 押し少ないが、設定の面の入口が消えるので `FR-072` の組み直しになる | **「Q6. 入口の置き場 → 推奨どおり A」**（2026-09-24。`JDG-451`） |
| 2 | **選び方の形**。<br>**(i)** 試作の 10 行（表 T-305）を升で 5 つずつ 2 段に並べる。`CR-551` の色の欄と同じ箱・同じ並べ方で、[任意][透明][テーマ] は持たない。<br>**(ii)** `CR-551` の色の欄をそのまま使う（パレットの 10 色 ＋ [任意][透明][テーマ]、`JDG-383` ・ `JDG-405`）。選んだ色から色相を取り出す。<br>**(iii)** 0 〜 359 の滑り子か数の入力 | **(i)**。色相は色ではなく 1 つの数であり、透明・テーマ追随・カスタムには意味が無い（E-01 の MUST NOT）。(ii) はパレットの白・黒・灰の色相が決まらない（彩度 0）うえ、[テーマ]（追随へ戻す）は色相には戻す先が無い。(iii) は 360 のうち 143 の色相が明暗のどちらかで `CT-3` か `CT-4` を割る（13 節）のに、それを 1 つずつ避けさせることになる。(i) の 10 行は利用者が参考に名指した試作そのもの | **「Q7. 選び方の形 → 推奨どおり (i) 」**（2026-09-24。`JDG-452`） |
| 3 | **コントラストを割る 4 行をどうするか**。表 T-236 の式のまま 10 行を並べると、`TH-3` 緑・`TH-4` 黄緑・`TH-5` 黄（明るいテーマの `CT-4` ／ `CT-3`、最悪 2.84）と `TH-10` 藍（暗いテーマの `CT-3`、2.997）が `FR-007` の 表 T-017a の 3 : 1 を割る。試作は色相ごとに明度を寄せて通していた（`FR-041` もそれを求めているが、表 T-236 は持たない。`DFC-865`）。<br>**(a)** 10 行のまま当て、割る 4 行を `LM-18` に数で書く（E-04）。寄せは後の変更要求。<br>**(b)** 割らない 6 行（青・青緑・オレンジ・赤・赤紫・紫）だけを並べる。<br>**(c)** 本書の前に、試作の寄せと地の彩度の解きを仕様へ入れる（10 節の申し送り） | **(a)**、そのあと (c) を次の変更要求にする。割り幅は 0.16 以内で、見た目は試作の 10 行とほぼ同じになる。(b) は緑と黄の無い一覧になり、利用者の「プロジェクト全体の色味」の選びとしては狭い。(c) は `FR-041` の既存の MUST を満たす仕事なので正しいが、`S-146` の明るいテーマの地を白から色付きへ変えるかを含め、決めることが多い。(a) なら 1 行を消すだけで (b) に移れる | **「Q8. 読みやすさの基準をわずかに割る 4 色相 → 推奨の (a)」**（2026-09-24。`JDG-453`） |
| 4 | **英語の語**: `TH-1` 〜 `TH-10` の `Blue` ・ `Blue-green` ・ `Green` ・ `Yellow-green` ・ `Yellow` ・ `Orange` ・ `Red` ・ `Red-purple` ・ `Purple` ・ `Indigo`、`IC-17` の hint「Show the document's drawing settings in the Properties Panel, where the theme hue is chosen」 | 提案どおり。6 つはパレットの辞書（`colourNames`）と同じ語。辞書の `$comment` は体が語を決めることを禁じている（`CR-551` の問い 3 と同じ扱い） | **「Q9. 色相の英語の名前 → 推奨どおり」**（2026-09-24。`JDG-454`） |

---

## 12. 台帳

⚠️ 本書の体は台帳に書かない。貼る行は scratchpad の `CR-557-ledger.md` にある（前に立つ者が写す）。

### 12.1 裁定（`docs/development-records/rulings.md`）

`JDG-450` —— 0.1 節の逐語。`JDG-451` ・ `JDG-452` ・ `JDG-453` ・ `JDG-454` —— 11 節の問い 1 〜 4 の答え（2026-09-24、逐語は 11 節の最右列）。状態はすべて「指示」（本書を当てたら「適用済」へ変える。当てる者の仕事）。

⛔ 当てる者が変える古い行: `PND-434`（`docs/development-records/pending-decisions.md:297`）—— 案①の置き場を `JDG-450` ・ `JDG-451` が覆し、本書を当てた commit で色相の入口が仕様に着地した、に（2026-09-07 の裁定は仕様に当たらないまま残っていた）。

### 12.2 欠陥（`docs/development-records/defects.md`）

| ID | 何 | 状態 |
|---|---|---|
| `DFC-862` | `CM-5`（`setThemeHue`）に人の入口が無い —— `FR-041` は「作成者がテーマの色相…を選んだとき」と定めるのに、表 T-109 に入口が無い。`PND-434` は 2026-09-07 に裁定されたが仕様に当たらなかった | `仕様待ち`（本書の E-01） |
| `DFC-863` | 文書の設定の面にテーマの色相が出ない —— 表 T-104 の `K-60` は在るが、値が `Project.themeHue`（`DR-5`）なので `settingsFields` が拾わない | `仕様待ち`（本書の E-01） |
| `DFC-864` | `_source/settings.schema.json:366` の注「into 20 rows」が偽（色相に追随する行は `61bbd572` で 13、`ebc71984` では 14） | `仕様待ち`（本書の J-02） |
| `DFC-865` | `FR-041` が求める明度の寄せ幅と地の彩度の解き（`01-04-requirements.md:2002`、`tbl-settings.md:211`）を、表 T-236 もコード（`svg-renderer.ts:139-146`）も持たない —— 試作の 10 色相のうち 4 つが `CT-3` ／ `CT-4` を割る | `仕様待ち` —— 問い 3 の答え (a)（`JDG-453`）で、寄せは次の変更要求（10 節の申し送り） |

---

## 13. 測り方の再現

```
# totals (before), 2026-09-24, 61bbd572 (CR-551 landed)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py | grep "tables="
#   -> tables=187  figures=27  rows=2305  uids=162   (ebc71984 read 186 / 27 / 2282 / 162)

# free identifiers (2026-09-24, 61bbd572)
for p in S IC CM FR EN PR CV T; do
  git grep -ohE "\b$p-[0-9]+\b" -- docs/spec src tests tools change-request | sed "s/$p-//" | sort -n | uniq | tail -1
done
#   -> S 999 (sentinel; next 359), IC 107 (a sibling draft), CM 75, FR 112, EN 7, PR 21, CV 9, T 319
git grep -nE "JDG-45[0-4]\b|DFC-86[2-5]\b|\bS-368\b|T-305"      # -> nothing (b7a3b76f, after the compaction)
grep -c '"prefix"' docs/spec/_source/row-id-prefixes.json                          # -> 163
git grep -lE "\bTH-[0-9]+" -- .                                                     # -> nothing
git grep -n "JDG-405" -- docs/development-records/rulings.md                        # -> :654 (ebc71984: nothing)
git grep -nE "\bS-368\b|T-305\b|\bTH-[0-9]+|themeHues|DFC-86[2-5]\b|JDG-45[0-4]\b" -- . ':!change-request/CR-557-*'   # -> nothing

# the rows that follow the hue: settings.json rows whose hue cell is "○"
#   (scratchpad cr557/hue_rows.py: walks every S- row with light/dark/hue and prints the hue cell)
#   -> 61bbd572: S-146 S-149 S-150 S-231 S-151 S-155 S-156 S-157 S-158 S-164 S-165 S-166 S-167 = 13
#      (ebc71984 also had S-195 = 14; CR-551 J-03 made it a fixed colour)
grep -c "hsl(H" docs/spec/_source/settings.json                                      # -> 25 on 61bbd572 (27 on ebc71984; S-146 has H on the dark side only)

# contrast of table T-017a over table T-236's formulas (scratchpad cr557/contrast.py)
#   HSL -> sRGB with colorsys.hls_to_rgb; linearise c/12.92 or ((c+0.055)/1.055)^2.4;
#   L = 0.2126R + 0.7152G + 0.0722B; ratio = (L1+0.05)/(L2+0.05)
#   light: plan fill hsl(H 46% 80%), plan edge hsl(H 44% 46%), actual fill hsl(H 62% 34%), ground #ffffff
#   dark : plan fill hsl(H 32% 26%), plan edge hsl(H 46% 66%), actual fill hsl(H 62% 64%), ground hsl(H 12% 9%)
#   -> light over 360 hues: CT-3 fails 96 (worst 2.70), CT-4 fails 129 (worst 2.49) -- reproduces LM-18
#   -> dark  over 360 hues: CT-3 fails 14 (worst 2.90), CT-4 fails 0; union of the two themes: CT-3 110, CT-4 129
#   -> the ten PoC hues: 214 L3 4.811 L4 5.185 D3 3.741 | 190 3.352 3.347 4.569 | 140 3.001 2.965 4.801
#                        95 2.960 2.841 4.881 | 50 3.056 2.902 4.839 | 28 3.968 4.067 4.198 | 6 4.760 5.531 3.609
#                        330 4.734 5.652 3.564 | 285 5.025 5.976 3.463 | 250 6.232 7.746 2.997
#   -> hues failing CT-3 or CT-4 in either theme: 143 of 360 (question 2 (iii))
#   -> the swatch colour S-151 over the panel ground S-150, all 360 hues: light worst 3.86, dark worst 4.59
#   -> the plan fill S-155 over the panel ground S-150 (rejected swatch colour): light worst 1.24, dark worst 1.30
#   (CT-1 / CT-2 are left out: table T-017a's paragraph hands them to the label halo S-169)

# SETTINGS_DEFAULTS keys (the read-only fields of the document settings surface)
awk '/^export const SETTINGS_DEFAULTS/{f=1;next} f&&/^}/{exit} f&&/^  .[a-zA-Z]/{n++} END{print n}' \
  src/entity/document-model/document-settings/document-settings.ts                  # -> 120

# the hue already reaches every frame (no frame-loop change expected)
grep -n "themeHue" src/framework/single-html-shell/frame-loop.ts src/framework/single-html-shell/single-html-shell.ts
#   -> frame-loop.ts:1267, :3067; single-html-shell.ts:316

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <ID>        # each ID of 6.1
#   induced.py needs scratch/spec-check/sd-out/json/index.json, which only check.sh writes;
#   run through a read-only wrapper that points graph.SD_JSON at the root checkout's export
#   (scratchpad cr557/induced_wrap.py) -> the four rows of 6.2, 0 cycles each

# every old block of section 4 occurs exactly once in its file, and none occurs in CR-551..CR-554
for s in "明暗テーマ（\`themePreference\`）とは別の値" "人が指定した色は、明暗の値を選んでから" \
         "その欄は読むだけ" "入口を持たない設定の値は" "LM-18" "文書の描画設定をプロパティパネルに表示する" \
         "into 20 rows" "Show the document's drawing settings" '"prefix": "TC"'; do
  grep -cF "$s" change-request/CR-55[1-4]-*.md
done
#   -> 0 in each of the four files for every string
#   in docs/spec (61bbd572): each old block of E-01..E-05, J-02..J-04 counted 1, and all nine applied in order
#   to COPIES (scratchpad cr557/apply_copy.py) -> problems 0 edits 9; the three JSON copies load with json.loads;
#   J-01: the last row of table T-206 is S-341 (S-338 one before it)
```
