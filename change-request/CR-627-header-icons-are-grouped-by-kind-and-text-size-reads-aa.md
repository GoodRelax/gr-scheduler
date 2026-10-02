# CR-627 — ヘッダーの入口を似た機能で寄せて並べ直し、文字の大きさを変える入口の図形を「Aa」にする

> 起草の状態: 当てた（2026-10-01、枝 `spec-pass-1001`、仕様の通し。`CR-626` の後の木 `04a2c409`）。旧 16 件のうち E-12 だけが 0 回だった（`CR-613`・`CR-620` が `IC-20` の `hint` に `.mcpb` の括弧書きを足した）—— E-12 の旧と E-13 の新の `IC-20` の項を、いまの語に写し直した（E-12 の注）。残る 15 件は上から順に当てた各回で 1 回。新しい識別子は無い。生成は `npm run gen` だけ（名簿・辞書・ヘルプ・図形の 4 つ）。検査 37 の 3 行（`T-109 IC-117`・`T-109 IC-107`・`T-109 IC-17`）は対を読み直して刷り直した。`CR-628`（ヘッダーのロゴ）は本書の後に当たる。
> 起草の時の状態: 起草のみ（2026-10-01、枝 `l4-review-crs`）。4 節の旧 16 件は、読んだ木でどれも 1 回、上から順に当てた各回でも 1 回だった（13 節）。
> 読んだ木: `refactor` `bfbe7eb7`。行番号・数は、すべてこの木で測った（13 節）。
> ⚠️ 調整役の数え直し（2026-10-01、`refactor` `7a5b387b`）: 旧 16 件のうち E-12（辞書 `icons` の AI の 3 項）だけが 0 回 —— その間に `CR-613`・`CR-620` が着地して辞書を書き換えた（変わったのは `IC-20` の語と見込む。`JDG-1053`）。当てる体が `7a5b387b` 以降の 3 項を旧に写し直し、E-13 の新の `IC-20` の項もその語に合わせること。残る 15 件は 1 回。
> ID の帯: 調整役から `CR-627` を受けた。⭐ 本書は仕様の新しい識別子を 1 つも取らない（2 節）。
> ⛔ 当てる順: `CR-606` → `CR-607` → `CR-609` → **本書** → `CR-617`・`CR-620`・`CR-628`。E-07（`IC-17` の群）は、`CR-606`・`CR-609` が行ごと旧に持つ `IC-17` の行の頭だけを書き換えるので、両書の後に当てる。本書が動かす行と項（E-01〜E-06・E-08〜E-13）は語を 1 字も変えずに写すので、その中の語を書き換える草案は本書の後に当てれば旧が 1 回のまま当たる（4.1 節）。
> 閉じるもの: `DFC-1343`（`JDG-873`）・`DFC-1346`（`JDG-876`。11 節の問い 1 は推奨で書いた —— 2026-10-01 に推奨の A と答えを得た、`JDG-1096` の Q14）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-873` | 「#24 ヘッダーのアイコンの並び順を以下のように変えろ<br>パレット～変更までの予定: 今のまま →<br>予定 →実績 →Fix →(-) → (+) →全画面 →<br>上下左右拡大縮小 : 今のまま →<br>モノクロ →ダーク →Undo → Redo →<br>検索 → 遅延解析 →<br>AI 3連 : 今のまま<br>設定 → 言語 → ヘルプ<br>※抜けはないよね？<br>理由: 類似の機能を寄せた。ｐ」 | 本書の骨格（E-01〜E-13）。語の読みは 0.2 節、抜けと重なりの数は 13 節（28 のうち 28、各 1 回） |
| `JDG-876` | 「#27 コマンドパレットの文字の大きさで 三 は Aa に変えろ。 他にも文字サイズを変更するアイコンはAaに変えろ」 | E-14（`IC-99`）・E-15（`IC-127`）。表示の倍率の入口が「文字サイズを変更するアイコン」に入るかは問い 1 |
| `JDG-122` | 「…ヘッダーのダークモード切替の左に<br>[-]と[+]ボタンを追加しろ<br>意味は全体的に図形やフォントサイズを合わせての拡大縮小だ…」（置き場の段だけを写した） | ⚠️ 置き場（明暗テーマの左）を `JDG-873` が覆す —— `(-)`・`(+)` は `Fit` の右へ移る（E-03・E-04・E-16）。「図形やフォントサイズを合わせての拡大縮小」は変えない（問い 1 の推奨の根拠） |
| `JDG-610` | 「ヘッダーのFitの右に虫眼鏡アイコン(Ctrl + f) を追加する」 | ⚠️ 置き場（`Fit` の右）を `JDG-873` が覆す —— 検索は `Redo` の右へ移る（E-02・E-06）。入口と鍵は変えない |
| `JDG-646` | 「10. フォントサイズ  ヘッダーに A でフォントマーク を追加 サイズは 12, 14, 16, 20px デフォルトは16px」 | ⚠️ 字形「A」を `JDG-876` が覆す —— 「Aa」にする（E-15）。段と既定は変えない |
| `JDG-647` | 「推奨どおりでよい」（入口の札「文字の大きさ / Text size」を含む） | 変えない。札と説明の語は 1 字も動かない |
| `JDG-154` | 「…GRSの拡大縮小<br>   - ヘッダーの (+) / (-)<br>   - Ctrl + Shift + [+/-]…」（該当の段だけを写した） | 逐語の「(-) → (+)」を `IC-104`・`IC-105`（表示の倍率）と読む根拠 |
| `JDG-373` | 「モノクロモードのアイコンはパレットからヘッダーのダークモードの左に動かせ」 | 変えない。本書の後も `IC-100` は `IC-16` の真左（`FR-041`） |
| `JDG-510` | 「…問 2. ヘッダーの AI の 3 つのアイコンの並び<br>→ A…」（該当の段だけを写した） | 変えない。AI の 3 つは `IC-115` → `IC-20` → `IC-18` のまま、群ごと `IC-17` の左へ動く |
| `JDG-30` | 「一旦提案通りでやれ。」（文字サイズの入口の置き場は `Command Palette`） | 変えない。`IC-99` は `Command Palette` のまま、図形だけが変わる |
| `JDG-506` | 「IC-18	 AI との対話欄を出す・隠す<br>IC-20 Agent API を有効・無効にする<br>IC-x 日程の画像をデータ化するプロンプト  <br>の3つではだめか？ 意見くれたし。」 | 変えない。AI の群は 3 つのまま（`IC-115`・`IC-20`・`IC-18`） |

### 0.2 逐語の語の読み（`bfbe7eb7` の 表 T-109 と 図 F-019 で確かめた）

| 逐語 | 行 | 確かめ方 |
|---|---|---|
| パレット～変更までの予定 | `IC-7`・`IC-98`・`IC-1`・`IC-2`・`IC-3`・`IC-4` | いまの並びの先頭 6 行。「変更までの予定」は `IC-4`（変更前の予定） |
| 予定 → 実績 | `IC-8` → `IC-9` | `何の入口か` が「予定を表示する」「実績を表示する」 |
| Fix | `IC-10` | 辞書の札が `Fit`（`display-words.json:124` の項）。`Fix` は打ち間違いと読んだ（`DFC-1343` の読みと同じ） |
| (-) → (+) | `IC-104` → `IC-105` | 図形が虫眼鏡に −／＋。`JDG-154` が「ヘッダーの (+) / (-)」を GRS の拡大縮小と呼ぶ |
| 全画面 | `IC-11` | |
| 上下左右拡大縮小（今のまま） | `IC-12` → `IC-13` → `IC-14` → `IC-15` | 時間軸と行軸のズーム。4 行の順は変えない |
| モノクロ → ダーク | `IC-100` → `IC-16` | `IC-16` は明暗テーマ |
| Undo → Redo | `IC-5` → `IC-6` | |
| 検索 → 遅延解析 | `IC-117` → `IC-107` | 「遅延解析」は遅延診断（`IC-107`）と読んだ。⛔ 遅延診断の振る舞いには触れない（置き場だけ） |
| AI 3連（今のまま） | `IC-115` → `IC-20` → `IC-18` | `JDG-510` の問 2 の A |
| 設定 → 言語 → ヘルプ | `IC-17` → `IC-21` → `IC-22` | `IC-17` は文書の設定（`JDG-855` で利用者が「三」と呼んだ入口） |

⭐ 「抜けはないよね？」への答え: 表 T-109 の `面` に `App Header` を持つ行は 28 行で、逐語は 28 行をちょうど 1 回ずつ名指す（抜け 0・重なり 0）。生成した名簿 `icon-roster.json` でも 28 行・28 種であり、本書を当てた写しでも同じだった（13 節）。

| 裁定 | 逐語（11 節の問いへの答え、2026-10-01。Q の番号は調整役がチャットで振った番号） | 本書での扱い |
|---|---|---|
| `JDG-1096` の Q14 | 「Q14: 推奨通りA」（11 節の問い 1 への答え。同じ行が Q15〜Q17 も持つ） | 問い 1 は A —— 表示の倍率 `IC-104`・`IC-105` は「Aa」に入れない。E-14・E-15 のまま |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— 利用者の理由は「類似の機能を寄せた」である。見せ方を切り替える入口（予定・実績・全体・倍率・全画面・ズーム・色）を 1 つの塊に、編集の履歴（Undo・Redo）と、日程を調べる入口（検索・遅延診断）をその後ろに寄せると、探す場所が 1 つに決まる。
⭐ 「Aa」は字の大きさを表す図形として広く読まれる。いまの `IC-99` の「三」（横線 3 本）は、`IC-17` の図形（つまみの付いた横線 3 本。利用者も `JDG-855` で「三」と呼んだ）と見分けにくく、違う 2 つの入口が似て見えていた。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— `FR-039`（`docs/spec/01-04-requirements.md:7720`）は「表示の倍率を 1 段ずつ縮める入口と拡げる入口を、`App Header` の明暗テーマの入口（`IC-16`）の左に…置くこと（MUST）」と言う。本書の後も字面は真（`IC-104` は `IC-16` より左）だが、置き場を決めた `JDG-122` の段を `JDG-873` が覆すので、要求が言う目印を新しい置き場（`IC-10` の右）へ書き換える（E-16）。`FR-041` の「`IC-100` を `IC-16` の左に置く」は、本書の後も真隣のまま真 ⇒ 書き換えない。
  ⚠️ 同じ条項で潜在の食い違いを 1 つ見つけた —— 表 T-109 の前文と `IC-7` の注は「並びを決めるのは本表の `群` の欄だけ」と言うが、生成器もヘッダーも行の順で並べ、`App Header` の群は何も決めていない（報告の潜在の不具合 1。本書は直さない）。
- **`R1.5`（MECE）** —— 逐語の 28 語と 表 T-109 の `App Header` の 28 行を 1 対 1 で突き合わせた（0.2 節）。抜け 0・重なり 0。
- **`R2.14`（POLA）** —— 同じ種類の入口を面ごとに同じ図形で描く先例が 図 F-019 に 9 組ある（`IC-21`／`IC-128` の言語ほか。13 節で数えた）。`IC-99`（文書の文字サイズ）と `IC-127`（検索パネルの字の大きさ）は別の値を動かす別の入口であり、`FR-038` が `IC-21`／`IC-128` について言う「別の値を動かす別の入口」と同じ形 ⇒ 同じ「Aa」を描いてよい。
- **`R2.1`（命名）** —— 新しい群の名は「調べる」とした（決定 2）。検索と遅延診断は、どちらも日程の中から見るべき所を探し出す入口である。群の名は画面に刷らない（表 T-109 の前文の MUST NOT）ので、辞書の語は増えない。
- **`R2.7`（DRY・マジックナンバー）** —— 図形の座標は 図 F-019 のものであり、設定値の行ではない（`FR-029` が図を図形の正とし、`CR-591` も図の座標を直に書き換えた）。新しい長さ・色・割合は 0。
- **`R2.9`（YAGNI）** —— 行・表・語・設定値・命令・出来事を 1 つも足さない。コードも手で書き換えない（ヘッダーは生成した名簿を行の順に写すだけ —— 9 節）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **行を動かすのではなく、周りを動かして `IC-17` の行と項に触れない** —— `IC-17` を AI の後ろへ送る代わりに、AI の 3 行（辞書の 3 項）を `IC-17` の前へ動かす（E-05・E-06・E-12・E-13）。`IC-17` の行で書き換えるのは群の欄を含む行の頭だけ（E-07） | `CR-606`・`CR-609` が `IC-17` の行と `hint` を書き換える。行ごと動かすと、どちらを先に当てても片方の旧が消える | E-07 の旧は行の頭の部分の文字列である（13 節で 1 回と数えた） |
| 決定 2 | **群は 7 つ: パレット／文書／表示／履歴／調べる／AI／補助**。`IC-117`・`IC-107` を新しい群「調べる」へ、`IC-17` を「補助」へ移す。ほかの行の群は変えない | 群は並びの中で連続していなければならない（`IC-7` の注「既存の群に入れたまま先頭へ動かすと群がとびとびになり」）。逐語の順では `IC-117`・`IC-107` が履歴の後ろ、`IC-17` が AI の後ろに来るので、`表示` のままでは群が 3 つに割れる。`IC-17` は逐語の最終行「設定 → 言語 → ヘルプ」で言語・ヘルプと 1 行に並ぶ | `App Header` の群の境目は画面に線を引かない（`FR-053` の線は `Command Palette` の群だけ、`FR-036` のヘルプの線も `Command Palette` の塊の中だけ）⇒ 目に見える差は無い。`CR-622` がヘルプの `App Header` を群で枠に分けるなら、本書の群を読む（5 節） |
| 決定 3 | **`FR-039` の目印を `IC-16` の左から `IC-10` の右へ書き換える**（E-16）。「縮める入口を左にして」は残す | 目印の入口が変わる（`JDG-873`）。字面が真のまま古い目印を残すと、並びを読み違える人が出る（`R1.3`） | 要求の 1 文が変わる。逐語で引く試験は無い（13 節） |
| 決定 4 | **「Aa」の線の形**: 大文字の A は 1 本の道（2 本の脚と横棒）、小文字の a は円 1 つと右の縦棒 1 本。3 つとも線の図形（`.s`、図の 1 つの太さ）で、`IC-99`・`IC-127` に同じ形を描く（E-14・E-15） | いまの `IC-127` の「A」と同じ描き方（線の A）。図の座標系は全図形で 1 つ（`FR-029`）なので、インクが今の枠 `0.8 1.5 22.7 21` の内に収まる大きさにした —— 生成器の写しで枠が変わらないことを確かめた（13 節） | 線の形は起草である。着地後に `dist/index.html` で見て、利用者が直させてよい（表 T-026 の `RC-13` に行は足さない —— 字形「Aa」そのものは利用者が決めた） |
| 決定 5 | **`CR-628` の GRS の文字のロゴは 表 T-109 の行にしない** | 表 T-109 は図形の入口の全数であり、全行が 図 F-019 に図形を持つ（前文、生成器が 1 対 1 で突き合わせる）。文字のロゴは図形ではなく、題の左の UI パーツ（表 T-103 の側）である | `CR-628` が行にすると決めるなら、本書の後に当てて行を足す（5 節） |
| 決定 6 | **ヘルプの `App Header` の塊の順は生成が書く**。`FR-036` の「塊の中は画面に並んでいる順」はそのまま真 | `tools/generate_help_roster.py` が 表 T-109 の行の順で `App Header` の塊を並べる（写しで確かめた。13 節） | 無い |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| ヘッダーの並び | `docs/spec/_assets/tbl-glossary.md` の 表 T-109 の `App Header` の行（手書き。原稿は無い） | E-01〜E-06 | 行の並び |
| 群 | 同表の `IC-117`・`IC-107`・`IC-17` の `群` の欄 | E-06・E-07 | 3 つの欄 |
| 辞書の並び | `docs/spec/_source/display-words.json` の `icons`（生成器が 表 T-109 の行の順と 1 対 1 で照らす） | E-08〜E-13 | 項の並び |
| 図形 | `docs/spec/_assets/fig-icons.svg`（図 F-019。原稿であり生成物ではない —— `tbl-glossary.md` の図の注） | E-14・E-15 | 2 つの図形 |
| 要求の目印 | `FR-039` の置き場の 1 文 | E-16 | その 1 文 |

⭐ 生成物 `src/adapter/screen-renderer/icon-roster.json`・`src/adapter/screen-renderer/display-words.json`・`src/adapter/screen-renderer/help-roster.json`・`src/framework/dom-screen-surface/icon-glyphs.json` は `npm run gen` だけが書く。⛔ 手で書かない。

## 2. 新しい識別子

無い。行・表・要求・接頭辞・設定値の行・語・命令・出来事を 1 つも足さず、消しもしない。群の名「調べる」は識別子の表に載る名ではない（表 T-109 の `群` の欄の値であり、画面に刷らない）。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bfbe7eb7`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `IC-5`・`IC-6` の行の置き場（`IC-4` の後ろ） | `tbl-glossary.md:533`〜`:534` | `IC-16` の後ろ | E-01 → E-06 |
| `IC-117`・`IC-107` の行の置き場（`IC-10` の後ろ）と群 `表示` | `tbl-glossary.md:538`〜`:539` | `IC-6` の後ろ、群 `調べる` | E-02 → E-06 |
| `IC-104`・`IC-105` の行の置き場（`IC-15` の後ろ） | `tbl-glossary.md:545`〜`:546` | `IC-10` の後ろ | E-03 → E-04 |
| AI の 3 行の置き場（`IC-17` の後ろ） | `tbl-glossary.md:550`〜`:552` | `IC-107` の後ろ（`IC-17` の前） | E-05 → E-06 |
| `IC-17` の群 `表示` | `tbl-glossary.md:549` の行の頭 | 群 `補助` | E-07 |
| 辞書の同じ 9 項の置き場 | `display-words.json:79`〜`:100`・`:134`〜`:155`・`:211`〜`:232`・`:266`〜`:298` | 表 T-109 と同じ並び | E-08〜E-13 |
| `IC-99` の図形「三」（横線 3 本） | `fig-icons.svg:540`〜`:544` | 「Aa」 | E-14 |
| `IC-127` の図形「A」 | `fig-icons.svg:649`〜`:652` | 「Aa」 | E-15 |
| `FR-039` の目印「明暗テーマの入口（…`IC-16`）の左に」 | `01-04-requirements.md:7720` | 「全体を 1 画面に収める入口（…`IC-10`）の右に」 | E-16 |
| 生成された名簿・辞書・ヘルプの並び・図形 | 1 節の生成物 4 つ | `npm run gen` | ― |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（改行は LF に揃えて数える。4 つのファイルは `bfbe7eb7` で CRLF が 0）。旧・新は行の全体（末の改行まで）である —— E-07 だけは `partial` で、行の頭の部分の文字列を置き換える。
⛔ **上から順に当てる。** 消す編集（E-01・E-02・E-03・E-05、E-08・E-09・E-10・E-12）を先に、置く編集（E-04・E-06、E-11・E-13）を後に当てる —— 逆にすると、置いた行と消す前の行が同時に在り、消す編集の旧が 2 回現れる。13 節で、この順に当てた各回で旧が 1 回であることを数えた。

<!-- EDIT id=E-01 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の `IC-5`・`IC-6` を行ごと消す（E-06 が `IC-16` の後ろへ置き直す）。旧
```text
| IC-5 | `App Header` | 履歴 | 編集を取り消す | `FR-031` | — | — |
| IC-6 | `App Header` | 履歴 | 取り消した編集をやり直す | `FR-031` | — | — |
```
新（空 —— 旧の行を消す）
```text

```

<!-- EDIT id=E-02 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の `IC-117`・`IC-107` を行ごと消す（E-06 が群を変えて置き直す）。旧
```text
| IC-117 | `App Header` | 表示 | 検索パネルを出す（`S-442`）。<br>出ていれば入力欄へ焦点を戻す | `FR-151` | — | — |
| IC-107 | `App Header` | 表示 | 遅延診断を行う・診断の表示を終える（`S-445`） | `FR-130` | — | — |
```
新（空 —— 旧の行を消す）
```text

```

<!-- EDIT id=E-03 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の `IC-104`・`IC-105` を行ごと消す（E-04 が `IC-10` の後ろへ置き直す）。旧
```text
| IC-104 | `App Header` | 表示 | 表示の倍率を下げる（`S-234`）| `FR-039` | — | — |
| IC-105 | `App Header` | 表示 | 表示の倍率を上げる（`S-234`）| `FR-039` | — | — |
```
新（空 —— 旧の行を消す）
```text

```

<!-- EDIT id=E-04 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の `IC-10` の後ろに `IC-104`・`IC-105` を置く。旧
```text
| IC-10 | `App Header` | 表示 | 全体を 1 画面に収める | `FR-055` | — | — |
```
新
```text
| IC-10 | `App Header` | 表示 | 全体を 1 画面に収める | `FR-055` | — | — |
| IC-104 | `App Header` | 表示 | 表示の倍率を下げる（`S-234`）| `FR-039` | — | — |
| IC-105 | `App Header` | 表示 | 表示の倍率を上げる（`S-234`）| `FR-039` | — | — |
```

<!-- EDIT id=E-05 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の AI の 3 行を行ごと消す（E-06 が `IC-17` の前へ置き直す）。旧
```text
| IC-115 | `App Header` | AI | 日程の画像をデータ化するプロンプトをクリップボードへ写す | `FR-068` | — | — |
| IC-20 | `App Header` | AI | `Agent API` を有効にする・無効にする | `FR-065` | — | — |
| IC-18 | `App Header` | AI | AI との対話欄を表示する・非表示にする | `FR-066` | — | — |
```
新（空 —— 旧の行を消す）
```text

```

<!-- EDIT id=E-06 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の `IC-16` の後ろに、履歴・調べる・AI の 7 行を置く（`IC-117`・`IC-107` の群だけが変わる）。旧
```text
| IC-16 | `App Header` | 表示 | 明暗テーマを選ぶ（`S-72`）| `FR-039` | — | — |
```
新
```text
| IC-16 | `App Header` | 表示 | 明暗テーマを選ぶ（`S-72`）| `FR-039` | — | — |
| IC-5 | `App Header` | 履歴 | 編集を取り消す | `FR-031` | — | — |
| IC-6 | `App Header` | 履歴 | 取り消した編集をやり直す | `FR-031` | — | — |
| IC-117 | `App Header` | 調べる | 検索パネルを出す（`S-442`）。<br>出ていれば入力欄へ焦点を戻す | `FR-151` | — | — |
| IC-107 | `App Header` | 調べる | 遅延診断を行う・診断の表示を終える（`S-445`） | `FR-130` | — | — |
| IC-115 | `App Header` | AI | 日程の画像をデータ化するプロンプトをクリップボードへ写す | `FR-068` | — | — |
| IC-20 | `App Header` | AI | `Agent API` を有効にする・無効にする | `FR-065` | — | — |
| IC-18 | `App Header` | AI | AI との対話欄を表示する・非表示にする | `FR-066` | — | — |
```

<!-- EDIT id=E-07 file=docs/spec/_assets/tbl-glossary.md partial -->
表 T-109 の `IC-17` の行の頭（群の升まで）だけ。行の残りは触らない。旧
```text
| IC-17 | `App Header` | 表示 |
```
新
```text
| IC-17 | `App Header` | 補助 |
```

<!-- EDIT id=E-08 file=docs/spec/_source/display-words.json -->
辞書 `icons` の `IC-5`・`IC-6` の項を消す（E-13 が置き直す）。旧
```text
  {
   "rowId": "IC-5",
   "label": {
    "ja": "取り消す",
    "en": "Undo"
   },
   "hint": {
    "ja": "直前の編集を取り消す",
    "en": "Undo the last edit"
   }
  },
  {
   "rowId": "IC-6",
   "label": {
    "ja": "やり直す",
    "en": "Redo"
   },
   "hint": {
    "ja": "取り消した編集をやり直す",
    "en": "Redo the edit that was undone"
   }
  },
```
新（空 —— 旧の行を消す）
```text

```

<!-- EDIT id=E-09 file=docs/spec/_source/display-words.json -->
辞書 `icons` の `IC-117`・`IC-107` の項を消す（E-13 が置き直す）。旧
```text
  {
   "rowId": "IC-117",
   "label": {
    "ja": "検索",
    "en": "Search"
   },
   "hint": {
    "ja": "検索パネルを出す。出ていれば入力欄へ戻る",
    "en": "Open the search panel; if it is open, return to its search box"
   }
  },
  {
   "rowId": "IC-107",
   "label": {
    "ja": "遅延診断",
    "en": "Delay Diagnostics"
   },
   "hint": {
    "ja": "遅延診断を行う。もう一度押すと診断の表示を終える",
    "en": "Run the Delay Diagnostics; press again to end its display"
   }
  },
```
新（空 —— 旧の行を消す）
```text

```

<!-- EDIT id=E-10 file=docs/spec/_source/display-words.json -->
辞書 `icons` の `IC-104`・`IC-105` の項を消す（E-11 が置き直す）。旧
```text
  {
   "rowId": "IC-104",
   "label": {
    "ja": "小さく表示",
    "en": "Smaller"
   },
   "hint": {
    "ja": "日程表の図形と字を 1 段小さくする",
    "en": "Make the chart's shapes and text one step smaller"
   }
  },
  {
   "rowId": "IC-105",
   "label": {
    "ja": "大きく表示",
    "en": "Larger"
   },
   "hint": {
    "ja": "日程表の図形と字を 1 段大きくする",
    "en": "Make the chart's shapes and text one step larger"
   }
  },
```
新（空 —— 旧の行を消す）
```text

```

<!-- EDIT id=E-11 file=docs/spec/_source/display-words.json -->
辞書 `icons` の `IC-10` の項の後ろに `IC-104`・`IC-105` を置く。旧
```text
  {
   "rowId": "IC-10",
   "label": {
    "ja": "全体を収める",
    "en": "Fit"
   },
   "hint": {
    "ja": "日程の全体が 1 画面に収まる倍率と位置にする",
    "en": "Set the zoom and position that fit the whole schedule on one screen"
   }
  },
```
新
```text
  {
   "rowId": "IC-10",
   "label": {
    "ja": "全体を収める",
    "en": "Fit"
   },
   "hint": {
    "ja": "日程の全体が 1 画面に収まる倍率と位置にする",
    "en": "Set the zoom and position that fit the whole schedule on one screen"
   }
  },
  {
   "rowId": "IC-104",
   "label": {
    "ja": "小さく表示",
    "en": "Smaller"
   },
   "hint": {
    "ja": "日程表の図形と字を 1 段小さくする",
    "en": "Make the chart's shapes and text one step smaller"
   }
  },
  {
   "rowId": "IC-105",
   "label": {
    "ja": "大きく表示",
    "en": "Larger"
   },
   "hint": {
    "ja": "日程表の図形と字を 1 段大きくする",
    "en": "Make the chart's shapes and text one step larger"
   }
  },
```

<!-- EDIT id=E-12 file=docs/spec/_source/display-words.json -->
辞書 `icons` の AI の 3 項を消す（E-13 が置き直す）。⚠️ 当てる体が写し直した（2026-10-01、枝 `spec-pass-1001`）: `IC-20` の `hint` は `CR-613`・`CR-620` の後の語（`.mcpb` の括弧書き）にした。E-13 の新の `IC-20` の項も同じ語。旧
```text
  {
   "rowId": "IC-115",
   "label": {
    "ja": "日程の画像をデータ化するプロンプト",
    "en": "Schedule Image-to-JSON Prompt"
   },
   "hint": {
    "ja": "AIにPPTやExcelなどで作った日程をGoodRelax Schedulerで処理できるJSONデータに変換させるプロンプトをクリップボードに出力する",
    "en": "Copy to the clipboard a prompt that has an AI convert a schedule made in PowerPoint, Excel, etc. into JSON data GoodRelax Scheduler can process"
   }
  },
  {
   "rowId": "IC-20",
   "label": {
    "ja": "Agent API",
    "en": "Agent API"
   },
   "hint": {
    "ja": "Agent API を有効にする。もう一度押すと無効にする (AI のアプリから使うときは、ヘルプに記載の .mcpb が必要)",
    "en": "Enable the Agent API; press again to disable it (to use it from an AI app, get the .mcpb named in Help)"
   }
  },
  {
   "rowId": "IC-18",
   "label": {
    "ja": "対話欄",
    "en": "Dialogue Field"
   },
   "hint": {
    "ja": "AI との対話欄を表示する（Agent API が無効なら有効にする）。もう一度押すと非表示にする",
    "en": "Show the Dialogue Field for talking with the AI (turns the Agent API on if it is off); press again to hide it"
   }
  },
```
新（空 —— 旧の行を消す）
```text

```

<!-- EDIT id=E-13 file=docs/spec/_source/display-words.json -->
辞書 `icons` の `IC-16` の項の後ろに 7 項を置く（語は 1 字も変えない）。旧
```text
  {
   "rowId": "IC-16",
   "label": {
    "ja": "明暗テーマ",
    "en": "Light / dark"
   },
   "hint": {
    "ja": "ライトモードかダークモードの選択",
    "en": "Choose the light or the dark theme"
   }
  },
```
新
```text
  {
   "rowId": "IC-16",
   "label": {
    "ja": "明暗テーマ",
    "en": "Light / dark"
   },
   "hint": {
    "ja": "ライトモードかダークモードの選択",
    "en": "Choose the light or the dark theme"
   }
  },
  {
   "rowId": "IC-5",
   "label": {
    "ja": "取り消す",
    "en": "Undo"
   },
   "hint": {
    "ja": "直前の編集を取り消す",
    "en": "Undo the last edit"
   }
  },
  {
   "rowId": "IC-6",
   "label": {
    "ja": "やり直す",
    "en": "Redo"
   },
   "hint": {
    "ja": "取り消した編集をやり直す",
    "en": "Redo the edit that was undone"
   }
  },
  {
   "rowId": "IC-117",
   "label": {
    "ja": "検索",
    "en": "Search"
   },
   "hint": {
    "ja": "検索パネルを出す。出ていれば入力欄へ戻る",
    "en": "Open the search panel; if it is open, return to its search box"
   }
  },
  {
   "rowId": "IC-107",
   "label": {
    "ja": "遅延診断",
    "en": "Delay Diagnostics"
   },
   "hint": {
    "ja": "遅延診断を行う。もう一度押すと診断の表示を終える",
    "en": "Run the Delay Diagnostics; press again to end its display"
   }
  },
  {
   "rowId": "IC-115",
   "label": {
    "ja": "日程の画像をデータ化するプロンプト",
    "en": "Schedule Image-to-JSON Prompt"
   },
   "hint": {
    "ja": "AIにPPTやExcelなどで作った日程をGoodRelax Schedulerで処理できるJSONデータに変換させるプロンプトをクリップボードに出力する",
    "en": "Copy to the clipboard a prompt that has an AI convert a schedule made in PowerPoint, Excel, etc. into JSON data GoodRelax Scheduler can process"
   }
  },
  {
   "rowId": "IC-20",
   "label": {
    "ja": "Agent API",
    "en": "Agent API"
   },
   "hint": {
    "ja": "Agent API を有効にする。もう一度押すと無効にする (AI のアプリから使うときは、ヘルプに記載の .mcpb が必要)",
    "en": "Enable the Agent API; press again to disable it (to use it from an AI app, get the .mcpb named in Help)"
   }
  },
  {
   "rowId": "IC-18",
   "label": {
    "ja": "対話欄",
    "en": "Dialogue Field"
   },
   "hint": {
    "ja": "AI との対話欄を表示する（Agent API が無効なら有効にする）。もう一度押すと非表示にする",
    "en": "Show the Dialogue Field for talking with the AI (turns the Agent API on if it is off); press again to hide it"
   }
  },
```

<!-- EDIT id=E-14 file=docs/spec/_assets/fig-icons.svg -->
図 F-019 の `IC-99` の図形（「三」→「Aa」）。旧
```text
  <g transform="translate(340 320)">
    <path class="s" d="M9.5 6.5 H14.5"/>
    <path class="s" d="M7 12 H17"/>
    <path class="s" d="M4.5 17.5 H19.5"/>
  </g>
```
新
```text
  <g transform="translate(340 320)">
    <path class="s" d="M2.5 20 L7 5 L11.5 20 M4 15 H10"/>
    <circle class="s" cx="18" cy="16.75" r="3.25"/>
    <path class="s" d="M21.25 12.5 V20"/>
  </g>
```

<!-- EDIT id=E-15 file=docs/spec/_assets/fig-icons.svg -->
図 F-019 の `IC-127` の図形（「A」→「Aa」）。旧
```text
  <g transform="translate(124 408)">
    <path class="s" d="M5.5 20 L12 4 L18.5 20"/>
    <path class="s" d="M8.2 14 H15.8"/>
  </g>
```
新
```text
  <g transform="translate(124 408)">
    <path class="s" d="M2.5 20 L7 5 L11.5 20 M4 15 H10"/>
    <circle class="s" cx="18" cy="16.75" r="3.25"/>
    <path class="s" d="M21.25 12.5 V20"/>
  </g>
```

<!-- EDIT id=E-16 file=docs/spec/01-04-requirements.md -->
`FR-039` の表示の倍率の入口の置き場。旧
```text
⭐ 表示の倍率を 1 段ずつ縮める入口と拡げる入口を、`App Header` の明暗テーマの入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-16`）の左に、縮める入口を左にして置くこと（MUST）。  
```
新
```text
⭐ 表示の倍率を 1 段ずつ縮める入口と拡げる入口を、`App Header` の全体を 1 画面に収める入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-10`）の右に、縮める入口を左にして置くこと（MUST）。  
```

⭐ 生成の後の 表 T-109 の `App Header` の並び（13 節の写しで生成器を回して確かめた）: `IC-7` │ `IC-98` `IC-1` `IC-2` `IC-3` `IC-4` │ `IC-8` `IC-9` `IC-10` `IC-104` `IC-105` `IC-11` `IC-12` `IC-13` `IC-14` `IC-15` `IC-100` `IC-16` │ `IC-5` `IC-6` │ `IC-117` `IC-107` │ `IC-115` `IC-20` `IC-18` │ `IC-17` `IC-21` `IC-22`（│ は群の変わり目。パレット／文書／表示／履歴／調べる／AI／補助）。

⭐ 検査 37（`check-dictionary-table-covariance.py`）の指紋は行の全体で取るので、群の欄が変わる `T-109 IC-117`・`T-109 IC-107`・`T-109 IC-17` の 3 行（`.claude/skills/spec-graph-check/dictionary-table-pairing.txt:214`・`:217`・`:237`）が動く。動かすだけの行（位置は指紋に入らない）と図形（図は指紋に入らない）は動かない。⇒ 対を読み直したうえで、調整役がその 3 行を刷り直す（`IC-17` は `CR-606`・`CR-609` も動かすので、4 本を当てた後に 1 度でよい）。

### 4.1 重なり

`change-request/CR-603`〜`CR-620` の 1〜10 行目を読み、本書の旧の行と語（表 T-109 の `IC-5`・`IC-6`・`IC-10`・`IC-16`・`IC-17`・`IC-104`・`IC-105`・`IC-107`・`IC-115`・`IC-117`・`IC-18`・`IC-20`、辞書の同じ項、図 F-019 の `IC-99`・`IC-127` の図形、`FR-039` の 1 文）で全文を引いた（13 節）。

| 変更要求 | 触れる所 | 先に当てる側 | 載せ直す側と差分 |
|---|---|---|---|
| `CR-606`（E-29） | 表 T-109 の `IC-17` の行（「テーマの色相は」→「テーマ色は」）・`IC-17` の `hint` | `CR-606` | 本書は `IC-17` の行と項を旧に持たない（決定 1）。E-07 の旧（`IC-17` の行の頭、群の欄まで）は `CR-606` の後も 1 回。⚠️ 本書を先に当てると `CR-606` の行ごとの旧が 0 回になる |
| `CR-609`（E-04・E-05） | 同じ `IC-17` の行（行ごとの旧）と `hint` | `CR-609` | 同上 |
| `CR-607`（E-07〜E-11） | 表 T-109 の前文の数・表の末（`IC-97` の後）に 1 行・図 F-019 の `aria-label` と末に図形 1 つ・辞書 `icons` の末に 1 項 | どちらが先でもよい | 旧は重ならない。⚠️ `CR-607` の 4 節の散文「`IC-99` は横線 3 本」は本書の後に偽になる（仕様の文ではないので当てる障りは無い。調整役が同書を当てるときに読み替える） |
| `CR-611`（E-07） | 表 T-109 の `IC-98` の行 | どちらが先でもよい | 本書は `IC-98` を動かさない |
| `CR-605`（E-08〜E-12・E-16〜E-18） | 表 T-109 の `IC-52` と新しい行 `IC-132`〜、辞書の `IC-62`・`IC-68` の後ろ | どちらが先でもよい | 旧は重ならない |
| `CR-617`（除外。遅延診断） | 表 T-109 に 2 行を「`IC-107` の直後」に足す・`IC-127` の `面` の欄に面を足す | **本書** | `CR-617` は `IC-107` の群が `調べる` になった行の後ろへ足す（行を旧に持つなら群の欄を読み直す）。辞書の 2 項も同じ位置。`IC-127` の行は本書が書かない（図形だけ）ので重ならない |
| `CR-620`（除外。MCP）の J-01 | `IC-20` の `hint` の 2 行 | **本書** | 本書は `IC-20` の項を 1 字も変えずに動かす（E-12・E-13）⇒ `CR-620` の旧は本書の後も 1 回。⚠️ `CR-620` を先に当てるなら、本書の E-12・E-13 の `IC-20` の項を同書の新の語で写し直す |
| `CR-616` | 遅延診断の色 | ― | 重ならない |

兄弟の草案（いま別の体が書いている。本書は読めない）:

| 兄弟 | 本書との継ぎ目 |
|---|---|
| `CR-621`（窓の枠・AI の対話欄を既定で隠す） | ⚠️ 表 T-109 の `IC-18` の行か辞書の `IC-18` の項を書き換えるなら、本書の後に当てる（本書は両方を語のまま動かす）。先に当てるなら本書の E-05・E-06・E-12・E-13 がその新で写し直す |
| `CR-622`（ヘルプの割り付け） | 表 T-109 の行と群を書かない前提。ヘルプの `App Header` の塊を群で枠に分けるなら、本書の後の群（7 つ）を読む。塊の中の順は生成が本書の並びで書く（決定 6） |
| `CR-628`（GRS の文字のロゴ・題の太字） | 本書の後に当てる。ロゴは 表 T-109 の行にしない（決定 5）。⚠️ 行にするなら `CR-628` が書き、`IC-7` の注「`App Header` の左端に置く」の真偽を読み直す |
| `CR-629`（検索パネル） | `IC-127` の行を書き換えても、本書は図形だけを変えるので重ならない |
| `CR-630`（`Esc` の段） | 重ならない |

⭐ `CR-606` → `CR-607` → `CR-609` の順は、その 3 本の起草が決めた順である（各書の頭）。本書はその後ろに入り、`CR-608` とは重ならない。

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- The App Header order is the row order of table T-109 (the rows whose 面
  names `App Header`), as CR-627 E-01..E-07 leave it -- 28 rows, each once:
    IC-7 | IC-98 IC-1 IC-2 IC-3 IC-4 | IC-8 IC-9 IC-10 IC-104 IC-105 IC-11
    IC-12 IC-13 IC-14 IC-15 IC-100 IC-16 | IC-5 IC-6 | IC-117 IC-107 |
    IC-115 IC-20 IC-18 | IC-17 IC-21 IC-22
  '|' marks where the 群 column changes: パレット / 文書 / 表示 / 履歴 /
  調べる / AI / 補助. Every group is one contiguous run.
- Nothing orders the header by hand: the App Header takes the generated
  icon-roster.json in its own order. `npm run gen` rewrites icon-roster.json,
  display-words.json (src), help-roster.json and icon-glyphs.json.
- The help's App Header block lists the same order (FR-036: the order the
  screen shows), generated; IC-71..IC-73 and IC-95..IC-97 stay indented
  under IC-1.
- FR-039: IC-104 stands immediately right of IC-10, IC-105 right of IC-104.
  FR-041: IC-100 stands immediately left of IC-16 (unchanged).
- Figure F-019: IC-99 and IC-127 draw the same shape "Aa", all class "s":
    path  d="M2.5 20 L7 5 L11.5 20 M4 15 H10"
    circle cx="18" cy="16.75" r="3.25"
    path  d="M21.25 12.5 V20"
  The one coordinate system of icon-glyphs.json stays viewBox
  "0.8 1.5 22.7 21" (FR-029). IC-104 / IC-105 keep their magnifier shapes.
- No new row, word, command, event, setting or constant; no word changes.
```

## 6. グラフ（`bfbe7eb7`）

- `impact.py T-109 IC-99 IC-127 IC-10 IC-104 IC-105 IC-16 F-019`:
  - 表 T-109（113 行）を指す要求 36 件、2 次 61 件。ヘッダーの入口の**位置**を言う文は、13 節の正規表現（表 T-109 の 28 行の ID と「左・右・隣・並べ・並び・先頭・末尾・端」を同じ行に持つ文）の当たり 4 つ —— `FR-041`:2086（`IC-100` を `IC-16` の左に）・`FR-036`:7519（`IC-1` の下に字下げ）・`FR-039`:7720（`IC-104`／`IC-105` を `IC-16` の左に）・表 T-109 の `IC-100` の注（`tbl-glossary.md:547`、`FR-041` の写し）—— と、行 ID を持たない `FR-036`:7505（ヘルプの塊の中は画面の順）である。書き換えるのは `FR-039`:7720 だけ（E-16）。ほかは本書の後も真。
  - `IC-99` を指す箇所 2（`FR-151`:4925 の「`IC-99` と同じ巡り方」と表の注）、`IC-127` を指す箇所 4（`FR-151`:4910・:4925、`tbl-published-entries.md:53`、`tbl-settings.md:496`）—— どれも図形を言わない ⇒ 真のまま。
  - `IC-10` を指す要求 4（`FR-009`:2830 の `EL-17`・`FR-070`:5001 の `SK-18`・`FR-018`:5221・`FR-087`:6445 の `OP-10`）、`IC-104`／`IC-105` を指す要求 3（`FR-009`・`FR-070` の `SK-22`／`SK-23`・`FR-039`:7722／:7731）、`IC-16` を指す要求 2（`FR-041`・`FR-039`:7720）—— どれも振る舞いを言い、位置は `FR-039`:7720 だけ ⇒ E-16 のほかは書き換えない。
  - `F-019` は表の行ではない（`impact.py` は「どの表にも無い行」と答える）⇒ 図の読み手は `git grep` で引いた: `tools/generate_icon_glyphs.py` と検査 `check-provenance.py` だけ。
- `induced.py T-109 IC-99 IC-127 IC-10 IC-104 IC-105 IC-16 F-019`: 種 7/8 が仕様の対象、種の中の辺 1、閉路 0。
- ⚠️ 書き換える所まで種を広げた `induced.py T-109 IC-99 IC-127 IC-10 IC-104 IC-105 IC-16 IC-17 IC-117 IC-107 FR-039 FR-041 FR-036 FR-053`: 種 14/14、辺 20、**閉路 2** —— 大きさ 6（`FR-039` `FR-041` `IC-104` `IC-105` `IC-16` `IC-17`）と大きさ 2（`FR-036` `FR-053`）。本書は前者のうち `FR-039`（E-16）・`IC-104`／`IC-105`（動かすだけ）・`IC-17`（群の欄）を書く ⇒ **E-01〜E-16 を 1 つの波で 1 度に当てる**（8 節の波 1）。後者は書かない。
- `rulings.md` を 表 T-109 の 28 行の ID・`T-109`・`F-019`・`IC-99`・`IC-127`・「ヘッダーの…並び／左／右／順」・「文字の大きさ」・`Aa` で引いた: 当たりは 0.1 節の 10 行と `JDG-450`（`IC-17` を「`IC-16` の右にある文書の設定の入口」と説明するだけ —— 置き場の裁定ではない）・`JDG-770`（推奨の理由「検索 `IC-117` の虫眼鏡と隣り合い」—— 本書の後も `IC-117` と `IC-107` は隣り合う）・`JDG-902`／`JDG-905`／`JDG-906`（着地の印。位置に触れない）。⇒ 導いた条項（決定 1〜6）と食い違う裁定は 0。覆す裁定は `JDG-122`（置き場の段）・`JDG-610`（置き場）・`JDG-646`（字形）の 3 つで、どれも `JDG-873`・`JDG-876` が新しい（12 節）。
- `pending-decisions.md` を同じ語で引いた: 当たりは 0。

## 7. 数の予測（`bfbe7eb7`。当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables | 差 0 | 表を足しも消しもしない |
| figures | 差 0 | 図 F-019 は 1 枚のまま。図形は 113 のまま（`npm run glyphs` の「113 shape(s)」—— 写しで確かめた） |
| rows | 差 0 | 表 T-109 は 113 行のまま（前文の「113 行ある」も真）。行を動かすだけ |
| uids | 差 0 | 要求を足しも消しもしない |
| `（MUST）` の印（`01-04-requirements.md`） | 差 0 | E-16 は MUST の文の目印だけを書き換える |
| 表 T-109 の `App Header` の行 | 28 → 28 | 位置の変わる行 20、群の変わる行 3（`IC-117`・`IC-107`・`IC-17`） |
| `App Header` の群 | 6 → 7 | 「調べる」が増える |
| `icon-glyphs.json` の項の変わる数 | 2 | `IC-99`・`IC-127`。座標系 `0.8 1.5 22.7 21` は変わらない |
| 検査 37 の指紋の変わる行 | 3 | `T-109 IC-117`・`T-109 IC-107`・`T-109 IC-17` |
| 同じ図形を持つ行の組（図 F-019） | 9 → 10 | `IC-99`／`IC-127` の組が増える |

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 | 毎フレーム |
|---|---|---|---|---|
| 0 | ― | `CR-606`・`CR-607`・`CR-609` を当てた木で、E-01〜E-16 の旧を上から順に数え直す（E-07 の旧は両書の後も 1 回の見込み。4.1 節） | 当てる体 | ― |
| 1 | L4（`docs/spec` と生成物 4 つ。`src/adapter/screen-renderer/app-header-items.ts` は名簿を写すだけで書き換えない） | E-01〜E-16 ＋ `npm run gen` ＋ 検査 37 の 3 行の刷り直し。閉路（6 節）のため 1 つの波で当てる | 当てる体（調整役） | いいえ —— ヘッダーの入口の数も描く手順も変わらず、並びは生成した名簿の順が運ぶ。図形は `icon-glyphs.json` のデータであり、`IC-127` の要素が 1 つ増える（2 → 3）だけで描く道は同じ |
| 2 | `tests/contract/cr-627-header-order-and-text-size-glyph.test.ts`（新しいファイルだけ） | 下の 8 件 | 仕様だけの試験の体（波 1 と並べてよい） | ― |

仕様だけの試験の体が書く場合（`docs/spec` だけを読む）:

1. 表 T-109 の `面` が `App Header` の行を行の順に並べると、5 節の 28 行の並びであり、各 ID は 1 回だけ現れる。
2. その 28 行の `群` の欄は 7 つの連続した並び（パレット／文書／表示／履歴／調べる／AI／補助）であり、同じ群が離れて 2 度現れない。
3. `FR-039` の新しい文「…`App Header` の全体を 1 画面に収める入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-10`）の右に、縮める入口を左にして置くこと（MUST）。」を逐語で引き、表 T-109 で `IC-104` が `IC-10` の次の行、`IC-105` がその次の行である。
4. `FR-041` の「モノクロを選ぶ入口を `App Header` の、明暗テーマの入口…の左に置くこと（MUST）」を逐語で引き、`IC-100` が `IC-16` の直前の行である。
5. 画面を描く側の公開の入口（表 T-064 の `PI-37`）が記述する `App Header` の入口の並びが、1. の並びと同じである。
6. ヘルプの `App Header` の塊（`FR-036`「塊の中は画面に並んでいる順」）が、字下げの項（`IC-1` の下の `IC-71`〜`IC-73`・`IC-95`〜`IC-97`）を除いて 1. の並びと同じである。
7. 図 F-019 の `IC-99` と `IC-127` の図形が同じであり、`IC-17` の図形とも `IC-104`・`IC-105` の図形とも違う（問い 1 の推奨）。
8. 図 F-019 の全図形が 1 つの座標系に収まる（`FR-029`）—— `IC-99`・`IC-127` のインクの外接枠が、ほかの図形の外接枠の和の内にある。

⭐ いまの試験で本書の旧の文を逐語で引くものは 0（13 節の `git grep`）。並びを読む試験（`tests/system/user-reported-fixes.test.ts` の `DFC-87`、`tests/unit/cr-551-header-roster-tooltips-and-scrollbars.test.ts` の `IC-100` の隣）と AI の群を読む試験（`tests/system/cr-562-the-image-to-grs-json-prompt-is-copied.test.ts`）は表をその場で読み、本書の後も緑の見込み ⇒ 同じ波で書き換える試験は無い。

## 9. 仕様の外で直すもの

無い。`src/adapter/screen-renderer/app-header-items.ts` の `headerCommands` は生成した名簿を `filter` して `map` するだけで、手で並べた所は無い（`commandStateOf` の `switch` は並びを持たない）。`src/adapter/screen-renderer/search-panel.ts` と `src/framework/single-html-shell/frame-loop.ts` は `IC-127` の ID を持つだけで、図形を持たない。⇒ 生成物 4 つのほかにコードは動かない。

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- `App Header` の群の境目に線を引かない（`FR-053` の線は `Command Palette` の群だけ）。
- `IC-104`・`IC-105` の図形を変えない（問い 1 の推奨）。
- 遅延診断の振る舞い（`FR-130` ほか、`CR-616`・`CR-617`）に触れない —— `IC-107` の置き場と群だけ。
- `IC-99` の置き場（`Command Palette`、`JDG-30`）と段の巡り方、`IC-127` の段（`S-429`・表 T-333）を変えない。
- 入口の札・説明の語、鍵の割当（表 T-036）を 1 字も変えない。
- 表 T-026 の `RC-13` に行を足さない（決定 4）。
- 表 T-109 の前文と `IC-7`・`IC-61`・`IC-103` の注の「並びを決めるのは群の欄だけ」を直さない（潜在の不具合 1。調整役が登録する）。

## 11. 利用者に問うこと

⭐ **2026-10-01 に答えを得た** —— `JDG-1096` の「Q14: 推奨通りA」。推奨で書いてあり、書き換えは無い。残る問いは無い。

**問い 1 —— 表示の倍率の入口（ヘッダーの虫眼鏡の −／＋、`IC-104`・`IC-105`）も「文字サイズを変更するアイコン」に入れて「Aa」にしますか？**

| 案 | 中身 | 代償 |
|---|---|---|
| **A（推奨）入れない** | 「Aa」にするのはパレットの文字サイズ（`IC-99`）と検索パネルの字の大きさ（`IC-127`）の 2 つだけ。ヘッダーの −／＋ は虫眼鏡のまま | 無い |
| B 入れる | `IC-104`・`IC-105` も「Aa」の小／大の図形に描き直す | 表示の倍率は字だけでなく日程表の図形（バーの太さ・マイルストーン）もまとめて縮める・拡げる（`FR-039`、表 T-252）ので、「Aa」は字だけが変わると読ませる。図形を 2 つ新しく起こす |

推奨の理由: 表示の倍率は、利用者自身が「意味は全体的に図形やフォントサイズを合わせての拡大縮小だ」（`JDG-122`）と定めた、図形と字をまとめて変える入口である。字だけを変える入口は 表 T-109 に 2 つしか無い（`IC-99`・`IC-127`。13 節で「文字」「字の大きさ」「倍率」を引いた）。台帳の読み（`DFC-1346` の「入らないと読む」）とも同じ。
⭐ 本書の E-14・E-15 は **問い 1 の推奨で書いた** —— 図形を変えるのは 2 つだけで、`IC-104`・`IC-105` の図形に触れない。B と答えられたら、本書を当てる前に 図 F-019 の編集を 2 つ足す。

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1343` | ヘッダーの入口の並びを似た機能で寄せる | 本書で閉じる（仕様と生成は波 1。コードは動かない） |
| `DFC-1346` | パレットの文字の大きさの入口が「三」 | 本書で閉じる（波 1）。問い 1 は推奨どおりの答えを得た（`JDG-1096` の Q14）—— 足す編集は無い。行は `仕様待ち` |
| `JDG-1096` | Q14〜Q17 への答え（状態「指示 —— 調整役が投入時期を決める」）。本書は Q14 だけ | 調整役へ: 本書の波が決まったら Q14 の部分を「指示 —— `CR-627` が当てる」 |
| `JDG-873` | 利用者の指示（状態「指示 —— 調整役が投入時期を決める」） | 調整役へ: 本書を当てる波が決まったら「指示 —— `CR-627` が当てる」に（検査 43）、着地したら 適用済 |
| `JDG-876` | 同上 | 同上 |
| `JDG-122` | 表示の倍率の入口の置き場「ヘッダーのダークモード切替の左に」 | 調整役へ: 着地したら「覆された（一部。`JDG-873`）—— 置き場の段だけ」を足す。倍率の意味・段の段は変わらない |
| `JDG-610` | 検索の入口の置き場「ヘッダーのFitの右に」 | 同上（置き場だけ。入口と鍵は変わらない） |
| `JDG-646` | 検索パネルの字の大きさの字形「A」 | 同上（`JDG-876` が字形を覆す。段・既定・保存しないことは変わらない） |
| `JDG-373`・`JDG-506`・`JDG-510`・`JDG-647`・`JDG-30` | モノクロの置き場・AI の 3 つ・AI の並び・札・`IC-99` の置き場 | 変えない |
| `PND-*` | ― | 触れない（当たり 0） |

## 13. 測り方の再現

```
# the tree: refactor bfbe7eb7 (branch l4-review-crs); the four files edited are LF-only (0 CRLF each)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-109 IC-99 IC-127 IC-10 IC-104 IC-105 IC-16 F-019
#   T-109: 113 rows, 36 requirements point at it, 61 at second hand; F-019 "not a row of any table"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py T-109 IC-99 IC-127 IC-10 IC-104 IC-105 IC-16 F-019
#   -> seeds 7 of 8, edges 1, cycles 0
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py T-109 IC-99 IC-127 IC-10 IC-104 IC-105 IC-16 IC-17 IC-117 IC-107 FR-039 FR-041 FR-036 FR-053
#   -> seeds 14 of 14, edges 20, cycles 2: {FR-039 FR-041 IC-104 IC-105 IC-16 IC-17} {FR-036 FR-053}

# 28 of 28: the App Header rows of table T-109 and of the generated roster
grep -c "^| IC-[0-9]* | \`App Header\`" docs/spec/_assets/tbl-glossary.md             # 28 (none of them names a second surface)
python -c "import json;d=json.load(open('src/adapter/screen-renderer/icon-roster.json',encoding='utf-8'));h=[r['rowId'] for r in d['icons'] if 'App Header' in r['surfaces']];print(len(h),len(set(h)))"   # 28 28

# the sentences that place a header entry (a python regex walk over docs/spec/*.md and _assets/*.md:
#   a backticked id of the 28 rows plus one of 左 右 隣 並べ 並び 先頭 末尾 端 on the same line)
#   -> 01-04-requirements.md :2086 (FR-041) :7519 (FR-036, IC-1 indent) :7720 (FR-039); tbl-glossary.md :547 (IC-100 note)

# who quotes the old wording, and who pins the header order
git grep -n "縮める入口を左にして\|IC-16\`）の左に、" -- tests .claude/skills     # 0
git grep -n "M9.5 6.5 H14.5\|M5.5 20 L12 4" -- tests src tools                   # only the generated icon-glyphs.json
#   a python walk over tests/**/*.ts for two or more adjacent pairs of the old order as string literals:
#   3 files hit (cr-601 contract, state-machine-gesture contract, uf-48-write-moment) -- all are SETS of zoom
#   entries (IC-12..IC-15, IC-104, IC-105), not the header order

# text-size entrances in table T-109 (rows whose 何の入口か says 文字 / 字の大きさ / 倍率 / 拡大 / 縮小)
#   -> IC-12..IC-15 (axis zoom), IC-104 / IC-105 (display scale), IC-99 (文字サイズ), IC-127 (字の大きさ)

# shapes of figure F-019 that are drawn identically (a python walk over the <g>..</g><text class="lbl"> pairs)
#   113 shapes; 9 identical sets: IC-21/IC-128, IC-35/IC-119, IC-75/IC-120/IC-129, IC-58/IC-74, IC-77/IC-78,
#   IC-82/IC-106, IC-90/IC-92, IC-91/IC-93, IC-121/IC-130

# the old blocks: counted by a script in the session scratchpad that reads the <!-- EDIT --> markers of
# this file, takes each 旧 block (whole lines, or a substring for `partial`), counts it in its file
# (LF-normalised), then applies the edits top to bottom to copies and counts each 旧 again at its turn
#   E-01..E-07 tbl-glossary.md 1/1 each ; E-08..E-13 display-words.json 1/1 each ;
#   E-14, E-15 fig-icons.svg 1/1 each ; E-16 01-04-requirements.md 1/1

# the generators, run on two copies in the session scratchpad (docs/spec + tools + src copied; one copy
# with the edited files laid over it): generate_icon_roster, generate_icon_glyphs,
# generate_display_words, generate_help_roster -- all four exit 0 on both copies
#   before copy == the repo's generated files (byte for byte); after copy:
#   App Header order = section 5; group runs パレット/文書/表示/履歴/調べる/AI/補助 (contiguous)
#   icon-glyphs.json: 113 shapes, viewBox "0.8 1.5 22.7 21" unchanged, entries changed: IC-99, IC-127 (equal)
#   display-words.json: 113 icons, the generator accepts the new order
#   help-roster.json: App Header block in the new order, IC-71..73 / IC-95..97 still under IC-1

# the ledger rows and rulings read whole
grep -n "^| DFC-1343 \|^| DFC-1346 " docs/development-records/defects.md
grep -n "^| DFC-87 \|^| DFC-404 " docs/development-records/fixed-defects.md
grep -n "^| JDG-30 \|^| JDG-122 \|^| JDG-154 \|^| JDG-373 \|^| JDG-506 \|^| JDG-510 \|^| JDG-610 \|^| JDG-646 \|^| JDG-647 \|^| JDG-873 \|^| JDG-876 " docs/development-records/rulings.md

# overlaps: lines 1-10 of change-request/CR-603..620, then the whole text grepped for the rows above
#   (a python walk; hits: CR-605, CR-606, CR-607, CR-609, CR-611, CR-617, CR-620 -- section 4.1)

# the pairing fingerprints of check 37
grep -n "T-109 IC-117 \|T-109 IC-107 \|T-109 IC-17 " .claude/skills/spec-graph-check/dictionary-table-pairing.txt   # :217 :214 :237
```
