# CR-635 — ヘルプは常識の図形を載せず、どの塊にも題を刷り、入口の語を直す

> 起草の状態: 当てた（2026-10-03、枝 `coord` から切った作業木、`0c215684` の上）。起草と当てを同じコミットで行った。4 節の旧 7 件は当てる木で、どれも 1 回だった（13 節）。
> ID の帯: 番号 `CR-635` は調整役から受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。台帳の行は調整役の帯 `DFC-1710`〜`DFC-1719` から `DFC-1710` を 1 つ使う（12 節）。
> 当てる順: `CR-636` と独立である（触る行が重ならない。4.1 節）。
> 閉じるもの: `JDG-1154`・`JDG-1155`・`JDG-1157` の仕様の側。`JDG-1086` の状態を「覆された」にした（12 節）。コードの側は `DFC-1710` が持つ（9 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（`docs/development-records/rulings.md` の行。長いものは要るところだけを写した）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1154` | 「キャプチャの部分は無用。  ユーザーがほかのツールでも知っているような常識すぎるアイコンの説明は、本来覚えてもらうべきこのツールの説明を理解する上での邪魔になる。」 | ① ヘルプから外す（E-01・E-03・E-04・E-05）。外すのは、読みの欄が名指す画像の部分 —— 遅延診断レポート・プロパティパネル・担当者名簿・暦の編集の塊、パレットの `IC-53`・`IC-75` |
| `JDG-1154` | 「ショートカットキーの部分は右詰めとせよ。」 | ② 変えない —— `CR-622` の決定 6 が既に書く形（`FR-036` の「割当は、その項目の行の右端…へ寄せて置くこと（MUST）」）。⇒ コードの側だけ |
| `JDG-1154` | 「新しく始める → 新規作成 / 予定バー → 予定の表示切替 / 実績バー → 実績の表示切替 / 積む向き → 日程が重複するタスクを積む向き / [三] 文字サイズ → [Aa] 文字サイズ / 名簿　→ 担当者名簿 / 暦 → 休日の設定 / 操作の記録 → デバッグ用ログ取得の開始/停止」（逐語の改行を「/」で示した） | ③ 語を直す（E-08）。読みの欄のとおり、面の題 `Resource Roster`・`Calendar Editor` も直す。④「[Aa] 文字サイズ」は `CR-627` が既に当てている（`IC-99` の図形は「Aa」） —— 変えない |
| `JDG-1155` | 「正式の語に合わせる (Recommended)」 ／ 「塗ごと消す」 | ① どの塊にも題を刷る —— 基本操作 ／ ブラウザの機能（GRS の機能ではない）／ ヘッダー ／ コマンドパレット ／ 行見出しパネル。`U-31` に日本語名「ヘッダー」（E-02・E-03・E-07・E-08）。⇒ `JDG-1086` を覆す。② 検索パネルの塊も外す ⇒ 3 列目は行見出しパネルの塊だけ（E-04） |
| `JDG-1157` | 「足す → 追加 / 消す→削除 / 当てる→適用 他にも  Add, Delete, Apply の和訳が上記ルールになっていない部分が無いか水平確認しろ。」 ／ 「名前と説明の文の両方 (Recommended)」 | 規則: Add ＝ 追加、Delete ＝ 削除、Apply ＝ 適用。読みの欄が名指す名前 6 つ（`IC-91`・`IC-93`・`IC-135`・`IC-136`・`IC-138`・`IC-66`）と、説明と理由の文（同じ 6 つと `IC-72` の hint、`RS-46` の nextStep）を直す（E-08）。⚠️ 水平確認でほかに当たったものは 11 節の問い 2 |
| `JDG-1086` | 「Q7: 推奨通り」（見出しを刷るのは今の 2 つの塊だけ） | 覆された（`JDG-1155` ①）。状態を書き換えた（12 節） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— ヘルプは「どこにどの入口が在り、どのキーが同じことをするかを 1 画面で見渡す道」（`FR-036` の RATIONALE）である。ほかの道具でも知られた図形（閉じる・最小化・最大化・並べ替え・絞り込み・追加・削除）を並べると、このツールで覚えるべき入口が埋もれる（`JDG-1154`）。外した入口の説明は、触れれば `FR-092` の 表 T-040 の `EZ-2` が出す。塊ごとの題は、どこからどこまでが 1 つの面の入口かを語でも示す。入口の名は、押す前に何が起きるかを言う語にする（「予定バー」は物の名であり、押して何が起きるかを言わない）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— ① `FR-036` の「ヘルプは、…表 T-109 の全行と…を示すこと（MUST）」は、外す裁定と食い違う。⇒「表 T-109 の行」とし、載せない行は本段の終わりの MUST NOT が持つ（E-01・E-03）。② `NFR-004` の RATIONALE も「同要求がヘルプに示すのは 表 T-109 の全行」と写していた（E-06）。③ `U-32` の「（同上）」は `U-31` の「日本語を当てない」を継いでいた —— `U-31` に名を当てると、`U-32`〜`U-35` が「ヘッダー」を継いで読める（規則 02 の 4 節の「同・」の罠）。⇒ `U-32` を書き下す（E-07）。
- **`R1.4`（境界・空の場合）** —— ① `IC-52` は `Open Chooser` にも載るので、塊を外しただけでは `IC-1` の下（開いた後に立つ面）に移って残る。⇒ `IC-52` を名指して外す（E-03）。② 表 T-036 の `SK-8`（`Esc`）は `入口` が `IC-52` であり、「入口の項目の割当の場所に置くこと（MUST）」によって `IC-52` と一緒にヘルプから消える。⇒ その帰結を文に書き（E-03）、残すかを問う（11 節の問い 1）。③ パレットの掴み帯の 2 つ（`IC-53`・`IC-75`）を外すと、群を持たない行が 0 になる —— 生成器の帯の扱いが空で動くことを確かめた（9 節）。
- **`R1.6`（否定要求は代わりを示す）** —— 足す MUST NOT（常識の図形を段に載せない）の代わりは `EZ-2` の説明である（E-03 の ⚠️）。
- **`R2.9`（YAGNI）** —— 見出しの語を新しい規則で作らない。塊の面の見出しは用語集の日本語名（`U-22` 行見出しパネル・`U-26` コマンドパレット・`U-31` ヘッダー）と同じ語である（`JDG-1155` の「正式の語に合わせる」）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **外す行を、面の名と行 ID で書く。** `面` が `Search Panel`・`Delay Diagnostics Report`・`Properties Panel`・`Resource Roster`・`Calendar Editor`・`Dialogue Field` の面だけ（`Help Modal` を併せて持つものを含む）である行と、`IC-52`・`IC-53`・`IC-75` | `JDG-1154` の読みが名指す塊と行。`Dialogue Field` を入れるのは、窓の題の行の入口（`IC-129`〜`IC-131`）がヘルプ・検索パネル・遅延診断レポート・対話欄に載り、検索パネルの塊に入っていたからである | 新しい面を足す日は、本文の MUST NOT の列挙に入れるかを決める。⚠️ 決めないまま面を足すと、生成器が「どの項目もその行を運ばない」で止まる（9 節）—— 黙っては落ちない |
| 決定 2 | **`IC-52` を `IC-1` の下にも並べない** | `JDG-1154` の画像の部分（名簿の塊）に `IC-52` が載っていた。閉じる入口はどの面でも同じ図形である | `Open Chooser` の項目は `IC-71`〜`IC-73` だけになる |
| 決定 3 | **`SK-8`（`Esc`）はヘルプから消えるままにする**（今の「入口の項目の割当の場所に置く」の帰結）。残すかは問う（11 節の問い 1） | 裁定は `Esc` に触れていない。新しい規則（入口の無い塊へ移す）を作らずに済む読みを選んだ | 問い 1 の答えが「残す」なら、`FR-036` に 1 文が要る |
| 決定 4 | **見出しの英語は用語集の英語名とする**（`App Header`・`Row Title Panel`・`Command Palette`） | 利用者が書いたのは日本語だけ。`display-words.json` は語を作らせない —— 用語集（表 T-103）の名は既に在る語である | 英語の題は構造名のままになる（`Header` などに縮めない） |
| 決定 5 | **見出しの辞書の鍵は、ヘルプの名簿が塊に付ける名と同じ**（`App Header`・`Row Title Panel`・`Command Palette`） | `basics`・`browser` と同じく、塊の名で引く。画面の側（`open-modals.ts` の `helpText`）は塊の名で引いており、直さずに済む | 鍵が語と同じ綴りに見える（⚠️ 鍵であって語ではない） |
| 決定 6 | **英語の語は変えない**（`IC-62` の `Resource Roster`、`IC-132` と面の題の `Working calendar` ほか） | `JDG-1154`・`JDG-1157` は日本語の語を直す裁定である | `Working calendar` と「休日の設定」の意味が少しずれる（11 節の問い 3） |
| 決定 7 | **動詞の形は「追加する」「削除する」「適用する」とする**（説明の文の中） | 裁定は名詞（追加・削除・適用）で書かれている。説明の文は「〜する」で終わる今の形を保つ | 無い |
| 決定 8 | **表 T-109 の `何の入口か` の欄（仕様の文）は変えない** | `JDG-1157` は画面の語（名前と説明の文）の規則である。表 T-109 の欄は画面に出ない | 仕様の文と画面の語で動詞が違う（「足す」と「追加」） |
| 決定 9 | **用語集の `U-49`（名簿）・`U-65`（暦の編集面）は変えない** | `JDG-1154` は入口の名と面の題を名指し、用語集を名指していない | 仕様の文の「名簿」と画面の「担当者名簿」が違う語になる（11 節の問い 3） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| ヘルプに載せる 表 T-109 の行 | `FR-036` の 1 段落目の MUST と、同じ段の終わり | E-01・E-03 |
| どの塊にも見出し | `FR-036` の見出しの MUST | E-02・E-03 |
| 3 列目の塊 | 表 T-256 の `HC-4` と、その下の 2 つの注 | E-04・E-05 |
| `NFR-004` の写し | `NFR-004` の RATIONALE | E-06 |
| `App Header` の日本語名 | `_assets/tbl-glossary.md` の 表 T-103 の `U-31`（と `U-32` の書き下し） | E-07 |
| 画面の語 | `docs/spec/_source/display-words.json`（`icons` の 15 項・`surfaces` の 2 項・`reasons` の 1 項・`helpHeadings` に 3 項） | E-08 |

**数**: 要求の文 7 か所。表の行の増減 0。図 0。辞書の語 18、辞書の項 ＋3。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・要求のどれも足さない。⚠️ 辞書の `helpHeadings` に足す 3 つの鍵（`App Header`・`Row Title Panel`・`Command Palette`）は行 ID ではなく、ヘルプの名簿の塊の名である（決定 5）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`0c215684`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「表 T-109 の全行」 | `FR-036` の 1 段落目 | 「表 T-109 の行」＋ 載せない行は本段の終わりの文が持つ | E-01 |
| 「この 2 つの塊にだけ見出しを刷ること（MUST）」 | `FR-036` | 「どの塊にも見出しを刷ること（MUST）」 | E-02 |
| `HC-4` の 5 つの塊（`Search Panel` → `Delay Diagnostics Report` → `Properties Panel` → `Resource Roster` → `Calendar Editor`） | 表 T-256 | 無し（`Row Title Panel` だけが残る） | E-04 |
| 「画面の中の小さな面」の注と、小さな面の段の中の順の注 | 表 T-256 の下 | 「`Row Title Panel`」に置き換え、順の注は消す | E-05 |
| 「表 T-109 の全行」 | `NFR-004` の RATIONALE | 「表 T-109 の行（同要求が除くものを除く）」 | E-06 |
| `U-31` の「（画面に出ない構造名。日本語を当てない）」 | 表 T-103 | 「ヘッダー」。`U-32` が同じ文を書き下して持つ | E-07 |
| 画面の語 18 と、見出しが 2 つだけの `helpHeadings` | `display-words.json` | 4 節の E-08 の表 | E-08 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（`0c215684` で、どれも 1 回）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧
```text
ヘルプは、`_assets/tbl-glossary.md` の 表 T-109 の全行と、表 T-036 のうち `入口` が `—` で `割当` が `—` でない行と、表 T-023 の `MK-2` / `MK-5` / `MK-7` / `MK-15` と、下の 表 T-255 の行を示すこと（MUST） —— 表 T-255 の行のうち載せてはならないものは、同表の後の段が持つ。
```
新
```text
ヘルプは、`_assets/tbl-glossary.md` の 表 T-109 の行と、表 T-036 のうち `入口` が `—` で `割当` が `—` でない行と、表 T-023 の `MK-2` / `MK-5` / `MK-7` / `MK-15` と、下の 表 T-255 の行を示すこと（MUST） —— 表 T-109 の行のうち載せてはならないものは本段の終わりの文が、表 T-255 の行のうち載せてはならないものは同表の後の段が持つ。
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧
```text
入口を持たない割当は 1 つの塊に、表 T-255 の行はもう 1 つの塊にまとめ、この 2 つの塊にだけ見出しを刷ること（MUST） —— 見出しの語は `FR-038` の辞書が持つ。
```
新
```text
入口を持たない割当は 1 つの塊に、表 T-255 の行はもう 1 つの塊にまとめ、どの塊にも見出しを刷ること（MUST） —— 見出しの語は `FR-038` の辞書が持つ。
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
旧（段の終わりの行。行末の空白 2 つは無い）
```text
⭐ 表 T-109 のうち `面` が `Help Modal` だけの行は、段に載せないこと（MUST） —— 凡例と題の行に在り、ヘルプを読む人の目の前にある。
```
新（段の終わりに 5 行を足す。⚠️ 規則 02 の 4 節 —— 文のあいだに挟まない）
```text
⭐ 表 T-109 のうち `面` が `Help Modal` だけの行は、段に載せないこと（MUST） —— 凡例と題の行に在り、ヘルプを読む人の目の前にある。
⭐ どの塊にも見出しを刷るのは、利用者が塊ごとに題を付けると定めたからである —— 塊の面の見出しはその面の名（`App Header` の塊は「ヘッダー」、`_assets/tbl-glossary.md` の `U-31`）とする。
⛔ 表 T-109 のうち、`面` が `Search Panel`・`Delay Diagnostics Report`・`Properties Panel`・`Resource Roster`・`Calendar Editor`・`Dialogue Field` の面だけ（`Help Modal` を併せて持つものを含む）である行と、`IC-52`・`IC-53`・`IC-75` を、段に載せてはならない（MUST NOT） —— 利用者が、ほかの道具でも知られた常識の図形の説明は、このツールで覚えてもらう説明を読む邪魔になると定めた。
⚠️ 外れるのは、それらの面の入口と、ウインドウの題の行の入口（`IC-52`・`IC-127`・`IC-129` 〜 `IC-131`）と、パレットの掴み帯の 2 つ（`IC-53`・`IC-75`）である —— どれも、触れれば `FR-092` の 表 T-040 の `EZ-2` が説明を出す。
⚠️ `IC-52` は `Open Chooser` にも載るが、`IC-1` の下にも並べない —— 閉じる入口はどの面でも同じ図形であり、常識の図形である。
⚠️ 表 T-036 の `SK-8`（`Esc`）は `入口` が `IC-52` なので、上の「入口の項目の割当の場所に置く」によりヘルプに出ない。
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧
```text
| HC-4 | 左から 3 つ目の段 | `Row Title Panel` → `Search Panel` → `Delay Diagnostics Report` → `Properties Panel` → `Resource Roster` → `Calendar Editor` |
```
新
```text
| HC-4 | 左から 3 つ目の段 | `Row Title Panel` |
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
旧
```text
⚠️ 塊の割り付けは、1 つの段に置く塊の種類を 1 つに絞るように選んだものである —— キーだけの操作（入口を持たない割当とブラウザの機能）・`App Header`・画面の中の小さな面・`Command Palette` の 4 つであり、種類の違う塊を 1 つの段に積むと、どこからが別の面の入口かが読みにくい。
⚠️ 小さな面の段の中は、常に画面に在る `Row Title Panel` を頭に、`App Header` の入口が開く面（`IC-117` の `Search Panel`、`IC-107` の `Delay Diagnostics Report`、`IC-17` の `Properties Panel`）、`Command Palette` の入口が開く面（`IC-62` の `Resource Roster`、`IC-132` の `Calendar Editor`）の順である —— 開く入口が左の段に在る面ほど上に置く。
```
新（段の終わりになるので、行末の空白 2 つを落とす）
```text
⚠️ 塊の割り付けは、1 つの段に置く塊の種類を 1 つに絞るように選んだものである —— キーだけの操作（入口を持たない割当とブラウザの機能）・`App Header`・`Row Title Panel`・`Command Palette` の 4 つであり、種類の違う塊を 1 つの段に積むと、どこからが別の面の入口かが読みにくい。
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
旧（1 行の中の一部）
```text
同要求がヘルプに示すのは 表 T-109 の全行と、
```
新
```text
同要求がヘルプに示すのは 表 T-109 の行（同要求が除くものを除く）と、
```

<!-- EDIT id=E-07 file=docs/spec/_assets/tbl-glossary.md -->
旧
```text
| U-31 | `App Header` | （画面に出ない構造名。<br>日本語を当てない） |
| U-32 | `Schedule Canvas` | （同上） |
```
新
```text
| U-31 | `App Header` | ヘッダー |
| U-32 | `Schedule Canvas` | （画面に出ない構造名。<br>日本語を当てない） |
```

⚠️ `U-33`〜`U-35` の「（同上）」は `U-32` を継ぐので、今までと同じ文を継ぐ。

<!-- EDIT id=E-08 file=docs/spec/_source/display-words.json -->
E-08 は JSON の `ja` の値だけを置き換える（英語は変えない、決定 6）。旧はどれも、その項の中で 1 回だった。

| 区 | 鍵 | 欄 | 旧（ja） | 新（ja） | 裁定 |
|---|---|---|---|---|---|
| `icons` | `IC-98` | `label` | 新しく始める | 新規作成 | `JDG-1154` ③ |
| `icons` | `IC-8` | `label` | 予定バー | 予定の表示切替 | 同 |
| `icons` | `IC-9` | `label` | 実績バー | 実績の表示切替 | 同 |
| `icons` | `IC-101` | `label` | 積む向き | 日程が重複するタスクを積む向き | 同 |
| `icons` | `IC-62` | `label` | 名簿 | 担当者名簿 | 同 |
| `surfaces` | `Resource Roster` | `heading` | 名簿 | 担当者名簿 | 同 |
| `icons` | `IC-132` | `label` | 暦 | 休日の設定 | 同 |
| `surfaces` | `Calendar Editor` | `heading` | 暦 | 休日の設定 | 同 |
| `icons` | `IC-76` | `label` | 操作の記録 | デバッグ用ログ取得の開始/停止 | 同 |
| `icons` | `IC-91` | `label` | 配下に足す | 配下に追加 | `JDG-1157` |
| `icons` | `IC-93` | `label` | 最も浅い段に足す | 最も浅い段に追加 | 同 |
| `icons` | `IC-135` | `label` | 足す | 追加 | 同 |
| `icons` | `IC-136` | `label` | 消す | 削除 | 同 |
| `icons` | `IC-138` | `label` | 当てる | 適用 | 同 |
| `icons` | `IC-66` | `label` | 消す | 削除 | 同 |
| `icons` | `IC-91` | `hint` | この行の配下に行を 1 つ足す。名前はその場で打つ | この行の配下に行を 1 つ追加する。名前はその場で打つ | 同 |
| `icons` | `IC-93` | `hint` | 最も浅い段に行を 1 つ足す。名前はその場で打つ | 最も浅い段に行を 1 つ追加する。名前はその場で打つ | 同 |
| `icons` | `IC-135` | `hint` | 例外日の行を足す | 例外日の行を追加する | 同 |
| `icons` | `IC-136` | `hint` | この例外日の行を消す（当てるまで文書は変わらない） | この例外日の行を削除する（適用するまで文書は変わらない） | 同 |
| `icons` | `IC-138` | `hint` | 下書きを文書へ当てる。取り消せる | 下書きを文書へ適用する。取り消せる | 同 |
| `icons` | `IC-66` | `hint` | 選んだ担当者を消す。割当が解かれるタスクの名前を問いが示す | 選んだ担当者を削除する。割当が解かれるタスクの名前を問いが示す | 同 |
| `icons` | `IC-72` | `hint` | 読んだ内容を現在の文書へ足す | 読んだ内容を現在の文書へ追加する | 同 |
| `reasons` | `RS-46` | `nextStep` | もっと浅い行に足してください | もっと浅い行に追加してください | 同 |

`helpHeadings` の末に 3 項を足す（`basics`・`browser` はそのまま。決定 4・決定 5）:

```text
  {
   "block": "App Header",
   "text": {
    "ja": "ヘッダー",
    "en": "App Header"
   }
  },
  {
   "block": "Row Title Panel",
   "text": {
    "ja": "行見出しパネル",
    "en": "Row Title Panel"
   }
  },
  {
   "block": "Command Palette",
   "text": {
    "ja": "コマンドパレット",
    "en": "Command Palette"
   }
  }
```

当てた後に打つもの: `npm run gen`（`src/adapter/screen-renderer/display-words.json` と `help-roster.json` を刷る）→ `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

### 4.1 重なり

`change-request/CR-62*.md`・`CR-63*.md` のうち、本書の旧を含むものは `CR-622`（E-02・E-04・E-05 の旧を書いた。着地済み —— ⛔ 追記しない）と `CR-605`・`CR-607`・`CR-617`・`CR-571`（`HC-4` に塊を足した。着地済み）。`CR-636` は 表 T-337 の `UZ-6` だけを書き、本書の旧のどれも含まない。`CR-631`（起草、別の枝）は 表 T-109 にパレットの行を足しうる —— 足した行の `面` が `Command Palette` なら本書の MUST NOT に当たらず、ヘルプに載る（生成器が止まらない）。

---

## 5. 継ぎ目

```
SEAM (CR-635)
- help-roster.json is generated (tools/generate_help_roster.py) and now holds
  5 blocks: basics, browser (HC-1), App Header (HC-2), Row Title Panel (HC-4),
  Command Palette (HC-3). Every block opens with an entry of kind 'heading'
  whose row is the block name; its word is displayWords.helpHeadings[block].
- Left off the help: rows of T-109 whose surfaces are only Search Panel /
  Delay Diagnostics Report / Properties Panel / Resource Roster / Calendar
  Editor / Dialogue Field (Help Modal beside them or not), and IC-52, IC-53,
  IC-75. SK-8 (Esc) leaves with IC-52. 118 items -> 89 items; 2 headings -> 5.
- The Command Palette block has no grab-band segment any more (IC-53 / IC-75
  gone); its first segment is the first group's first row.
- Display words: only ja values change (section 4, E-08); en is unchanged.
```

---

## 6. グラフ（`0c215684`。E-03 の後の `induced.py` だけは当てた木）

- `impact.py FR-036`: 指している要求 11 件・参照 50 箇所（`FR-099`・`FR-016`・`FR-053`・`FR-151`・`FR-070`・`FR-066`・`FR-092`・`FR-038`・`FR-040`・`NFR-004` ほか）。そのうち「表 T-109 の全行」を写していたのは `NFR-004` だけ（E-06）。`FR-092` の `EZ-2` の「表 T-109 の全行」は説明（ツールチップ）の話であり、ヘルプではない —— 変えない。
- `impact.py T-256`: 指す要求 1 件（`FR-036`）、2 次 10 件。`HC-4`: `FR-036` の 1 か所。
- `impact.py U-31`: `FR-152`・`FR-080`・5.3 節。どれも `App Header` を構造名で書くだけ。`U-32`: 5 件、同じく構造名。
- `impact.py SK-8`: 指す箇所 0。`IC-52`: 13 要求・22 箇所 —— 閉じる入口の振舞いであり、ヘルプの載せ方を写したものは無い。
- `induced.py FR-036 T-256 HC-4 U-31 U-32 NFR-004 SK-8 IC-52`: 種 8/8、辺 8、閉路 1（`FR-036` `IC-52` `SK-8`）—— 3 つとも E-03 の 1 回の計画で書いた（E-03 の ⚠️ の 2 文）。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables / figures / rows / uids | 差 0 | 表・図・行・要求を足しも消しもしない |
| `（MUST）` の印（`01-04-requirements.md`） | 差 0 | E-01 1→1、E-02 1→1、E-03 1→1 |
| `（MUST NOT）` の印（同） | ＋1 | E-03 の常識の図形を載せない文 |
| ヘルプの項目（`help-roster.json` の `item`） | 118 → 89 | 外す 29 行（検索パネル 11・遅延診断レポート 2・プロパティパネル 1・名簿 7・暦 6・`IC-53`・`IC-75`） |
| ヘルプの見出し（`heading`） | 2 → 5 | E-02・E-08 |
| 辞書の語（`display-words.json` の `ja`） | 書き換え 23、足す 3 | E-08 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（どれも 1 回） | 当てる体 |
| 1 | `docs/spec/01-04-requirements.md`・`_assets/tbl-glossary.md`・`_source/display-words.json`・`tools/generate_help_roster.py`・`tools/generate_display_words.py` ＋ 生成物 ＋ `changelog.md` の 1 行 ＋ `tests/unit/cr-405-the-help-scrolls-down-in-three-columns.test.ts` の逐語 1 つ | E-01〜E-08、`npm run gen`、`gen:check`、check.sh | 仕様の波（本書） |
| 2 | `src/`・`tests/` | 9 節 | コードの波（調整役が配る、`DFC-1710`） |

- ⭐ **毎フレームの経路: いいえ。** ヘルプの中身と語だけが変わる。⚠️ ただし生成物 `src/adapter/screen-renderer/display-words.json` は規則 04 の 5 節の毎フレームの経路の表に載るので、検査 66 のために `docs/development-records/perf-pending.md` に行 55 を足した（`CR-622` の行 47 と同じ形）。

---

## 9. 仕様の外で直すもの

⭐ 本書（仕様の波）が直したもの:

- `tools/generate_help_roster.py` —— 塊の並び（`BLOCKS`）を 5 つにし、外す行（`LEFT_OUT_SURFACES`・`LEFT_OUT_ROWS`）を持たせ、どの塊の頭にも見出しの項を置いた。どの項目も運ばない行は、今までどおり止まる（外す行と `Help Modal` だけの行を除く）。⚠️ 直さないと `npm run gen` が「表 T-256 が置く塊と、この生成器が作る塊が違う」で止まる。
- `tools/generate_display_words.py` —— `HELP_HEADINGS` に 3 つの鍵を足した。
- `tests/unit/cr-405-the-help-scrolls-down-in-three-columns.test.ts:39` —— 消えた逐語「この 2 つの塊にだけ見出しを刷ること（MUST）」を新しい逐語に替えた（検査 42 のため）。
- `.claude/skills/spec-graph-check/dictionary-table-pairing.txt` —— 検査 37 が、語を直した 表 T-109 の 13 行の指紋の変化で止まった。行と語を並べて読み（行の `何の入口か` は変わらず、語は裁定の語）、`--write-baseline` で指紋を取り直した。⚠️ 負債の基準線ではなく、読み合わせの記録である。
- `tests/contract/t-233-reason-words-tell-the-row.contract.test.ts` の `RS-46` の指紋 —— 同じ読み合わせの留め金（`DFC-166`）。次の一手の ja だけが変わり、場面「これ以上深い段には行を足せない」の開く道（浅い行）を言うままであることを読んで、指紋を取り直した（`1dc2be62612383ad` → `bac76585cce3368a`、試験と同じ式を scratchpad で再現して旧の値が一致することを確かめてから）。

⛔ 本書が直さないもの（コードの波、`DFC-1710`）:

- `tests/unit/cr-405-the-help-scrolls-down-in-three-columns.test.ts` の前提（`HC-1`〜`HC-3` の 3 段と、`HC-1` に 7 つの塊）—— 本書の前から古い（`CR-622` で 4 段になった）。
- ヘルプの名簿・見出し・塊を数える試験（`tests/` の `help-roster`・`HelpModal` の試料を読むもの）—— 塊が 5 つになり、項目が 89 になった。
- `src/framework/dom-screen-surface/open-modals-drawing.ts` —— 見出しの項が `basics`・`browser` の 2 つしか無い前提が残っていないか（見出しの描き方・枠の頭）。`src/adapter/screen-renderer/open-modals.ts` の `helpText` は塊の名で引くので、直さずに語が出るはず。
- パレットの塊に掴み帯の区切り（`segment` が帯の頭）を前提にした描き方。
- 語を逐語で比べる試験（「名簿」「暦」「積む向き」「予定バー」「実績バー」「新しく始める」「操作の記録」「足す」「消す」「当てる」）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 割当の右寄せ（`JDG-1154` ②）は `CR-622` の決定 6 のまま —— 仕様は変えない。
- `IC-99` の図形（「Aa」）は `CR-627` のまま。
- 表 T-109 の `何の入口か` の欄・用語集の `U-49`・`U-65`・英語の語は変えない（決定 6・8・9）。
- `CR-622`・`CR-605`・`CR-607`・`CR-617` には追記しない（規則 02 の 2.5 節）。

---

## 11. 利用者に問うこと

### 問い 1: `Esc`（`SK-8`）をヘルプに残すか

`SK-8` は `入口` が `IC-52`（閉じる）なので、`IC-52` を外すとヘルプから `Esc` が消える。`Esc` は閉じるだけでなく、ドラッグの中断・構えを解く・選択を解く（表 T-028 の `IN-4`）にも効く。

| 案 | 中身 | 良い所 | 悪い所 |
|---|---|---|---|
| A（本書の今） | 消えるまま | 規則が増えない。`Esc` で閉じる・やめるは常識 | 構え・選択を `Esc` で解けることが、ヘルプから読めない |
| **B（推奨）** | `SK-8` を基本操作の塊に置く（入口の項目が段に載らない割当は、入口を持たない割当と同じ塊に置く、を `FR-036` に 1 文） | `Esc` の段の広さ（構え・選択）は、このツールで覚えることである | `FR-036` に 1 文、生成器に 1 か所 |

### 問い 2: Add／Delete／Apply の水平確認で、ほかに当たった語

`display-words.json` の `ja` を、足す・消す・当てる・加える・除くの活用で洗った（13 節）。`JDG-1157` の読みの欄に無く、本書が直していないもの:

| 区 | 鍵 | 欄 | 今の語 | 推奨 |
|---|---|---|---|---|
| `icons` | `IC-133` | `hint` | …（当てるまで文書は変わらない） | 直す —— `IC-136` と同じ句（「適用するまで」） |
| `reasons` | `RS-46` | `text` | これ以上深い段には行を足せません | 直す —— 同じ理由の nextStep は直した（「これ以上深い段には行を追加できません」） |
| `assignments` | `MK-6` | `text` | 範囲選択する（Shift を併せると選択に足す） | 直す —— 「選択に追加する」 |
| `icons` | `IC-96` | `hint` | …足した側は取込元へ戻せなくなる | 直す —— 「追加した側」 |
| `icons` | `IC-44` | `hint` | 基準日を置く・動かす・消す | 問う —— 線を消す（Delete か Hide か） |
| `icons` | `IC-41` | `label` | 透かしを消す（パスワードが必要） | 問う —— 透かしを外す（Remove） |
| `reasons` | `RS-54` | `text` | 構えている形状は、選んでいるものには当てられません | 変えない —— Apply ではなく「（形状を）あてがう」 |

⚠️ 取り消す（Undo）・カーソルを消す（Hide）・値を消す（Clear）は当てていない。

### 問い 3: 用語集と英語の語

「名簿」（`U-49`）・「暦の編集面」（`U-65`）は仕様の文の語のまま、画面は「担当者名簿」「休日の設定」になった。英語は `Resource Roster`・`Working calendar` のまま。用語集の日本語名と英語の面の題も揃えるか。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1086` | 見出しを刷るのは今の 2 つの塊だけ | 状態を「覆された（`JDG-1154`・`JDG-1155`、2026-10-02、`CR-635`）」にした。旧の状態を後ろに残した |
| `JDG-1154`・`JDG-1155`・`JDG-1157` | 本書の裁定 | 状態は書き換えていない（依頼文の範囲は `JDG-1086` だけ）—— 調整役が「適用済」にする |
| `DFC-1710` | コードの波（9 節の後半） | 足した（`実装待ち`） |

---

## 13. 測り方の再現

```
# the tree: worktree cut from coord, fast-forwarded to 0c215684; every file this
# CR edits is LF-only (CRLF 0, counted by a script that reads bytes)

# the old blocks: each counted once, by a script in the session scratchpad
# (cr635_edits.py --count: E-01..E-07 old=1 new=0; cr635_words.py: every old ja
#  found once inside its own entry)

# graph (section 6) -- impact.py on 0c215684; induced.py after E-03
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-036
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-256
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py U-31
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py SK-8
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py IC-52
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-036 T-256 HC-4 U-31 U-32 NFR-004 SK-8 IC-52

# the help roster before and after (section 7): group help-roster.json entries
# by (column, block) and count kind 'item' / 'heading'  -> 118 / 2 before, 89 / 5 after

# the horizontal check (section 11, question 2): every ja value of
# display-words.json matching 足[すさしせそ]|消[すさしせそ]|当て|加え|除[くかきけこ]

# tests that quote the sentences this CR rewrites
grep -rn "この 2 つの塊にだけ見出しを刷る" tests src   # -> cr-405 :39 only (rewritten)
```
