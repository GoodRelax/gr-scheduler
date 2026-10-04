# CR-669 —— ヘルプの最大化は日程の領域まで ・ 項目に添える語を括弧で囲む ・ 開いた直後のパレットの重なりは問う

> 起草の状態: 当てた（2026-10-04 夜、調整役の統合点 `032c9ce4` から早送りした作業木）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-669`、裁定の帯 `JDG-1442`〜`JDG-1444`、裁定待ちの帯 `PND-745`〜`PND-746`、台帳の帯 `DFC-2087` は調整役から受けた（13 節で、木のどこにも在らないことを測った）。使ったのは `PND-745`・`PND-746` の 2 つ。`JDG` は取らない —— 本書が当てる利用者の言葉は既に `JDG-1244` の 8 に在り、ほかの 2 件には利用者の言葉が無い。`DFC` も新しく取らない —— 既にある `DFC-1880`・`DFC-2046`・`DFC-2047` だけを動かす。仕様の新しい識別子は取らない（2 節）。
> 閉じるもの: 台帳 `DFC-1880`（ヘルプの最大化がブラウザの窓いっぱい —— 利用者は「どちらも日程の領域」）、`DFC-2046`（パレットの塊の最後の項目が「構えている図形 構えている間だけ出る」と 1 つの句に読める）。`DFC-2047`（ヘルプを開いた直後、パレットが「基本操作」の塊を覆う）は変えず、利用者に問う（11 節、`PND-745`）。
> 覆すもの: `JDG-665`（「#6 →推奨通り」—— ヘルプの最大化は窓いっぱい）。⚠️ これは既に `JDG-1244` の 8 が覆していて、`JDG-665` の状態の欄は「覆された」である。本書はその読みを仕様へ運ぶだけである。ほかに、`FR-036` の「ヘルプを動かし大きさを変えられる範囲も、閲覧環境の窓の全体とする」（裁定の行は無い。起草者の文）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（全文は `docs/development-records/rulings.md` の該当行）

| 出どころ | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1244` の問い 8（2026-10-04、最大化の広さ） | 「どちらも日程の領域」 | ヘルプの最大化を、検索パネル・遅延診断レポートの窓・対話欄と同じ `Schedule Canvas` の全体にする（E-01・E-03） |
| `JDG-665`（2026-09-26） | 「#6 →推奨通り」 | 覆された（`JDG-1244` の 8）。本書で仕様から「窓いっぱい」を消す |
| `JDG-1432`（2026-10-04 夜、`DFC-2070` への答え） | 「いまのまま」 | 似た件の先例 —— 最大化したレポートをパレットが覆うことを、利用者は変えないと決めた（パレットは掴んで動かせる、`FR-053`）。`DFC-2047` の推奨はこれに揃える（11 節） |
| `JDG-1391`・`JDG-1392`（2026-10-04 夜） | 「ヘルプが1画面に収まっていない。 下記の通り収めろ。…」／「ヘルプだけ基準を足す (推奨)」 | 1 画面の MUST は崩さない —— E-04 の語を延ばしたあとも 1280 × 627 の余りを測った（7 節） |

⭐ 似た主題の連鎖を引いた（`rulings.md` で「最大化」を含む 15 行）: `JDG-81`・`JDG-612`・`JDG-617`・`JDG-633`・`JDG-651`・`JDG-665`・`JDG-997`・`JDG-1080`・`JDG-1163`・`JDG-1233`・`JDG-1244`・`JDG-1359`・`JDG-1391`・`JDG-1392`・`JDG-1432`。ヘルプの最大化の広さを言うのは `JDG-665`（窓いっぱい）と `JDG-1244` の 8（日程の領域）の 2 つだけで、後者が新しい。`JDG-1244` の後に、これを覆す行は無い。`docs/review/user-raised-items-audit-2026-10-04.md` の 7 節の表も同じ連鎖を挙げる。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-006`**（説明を読まずに操作できる）—— ヘルプは入口とキーを見渡す道であり、実物の横に置いて見比べて使う（`FR-036` の「ヘルプを実物の横へ寄せ、見比べられるようにする」）。最大化しても `App Header` が隠れないので、ヘルプが説明するヘッダーの入口が、読みながら見えたまま押せる。項目に添える語を括弧で囲めば、項目の名が辞書の名のとおりに読める（`FR-036` の「一覧の各項目は、入口の図形・その行の説明・その行の割当の 3 つ」）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（同じことを 2 か所で言わない）** —— 範囲を持つのは 表 T-335 の `WB-3` の括弧 1 か所。`FR-036` の 2 文は「`Schedule Canvas` の全体」と言い、理由だけを持つ。`WB-8`・`WB-9` の「ウインドウごとの範囲（`WB-3` と同じ）」は変えずに真になる —— ヘルプの移す範囲を窓いっぱいに残すと、この括弧がヘルプだけ偽になる（決定 2）。
- **`R1.4`（境界）** —— ① 最小化したヘルプ（`WB-2`）: 置き場は元の箱の右下の角で、範囲の下と右の縁から測る。範囲の下と右の縁は窓のときと同じ位置なので、最小化したヘルプの場所は変わらない。② 既定の置き場（`WB-1`）: もとから `App Header` を除いた領域の中で、範囲の中に在る。③ 閉じる前に窓いっぱいの範囲で `App Header` の上へ動かした箱: ヘルプの位置と大きさは閉じたら捨てる（`WB-6`）ので、残らない。開いているあいだに範囲が狭まった箱は、毎フレーム範囲の中へ寄せ直す（`windowPlaceInRange`、検索パネルと同じ）。
- **`R2`（名）** —— `HelpWindowArea` は 1 つの矩形だけを持つ。名 `belowAppHeader` は、その矩形が「閲覧環境の窓から `App Header` を除いた領域」（`FR-036` の既定の置き場の文の語）であることを言い、真のまま。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 最大化の範囲は `Schedule Canvas` の全体（行見出しパネルを含む） | 「どちらも日程の領域」—— 検索パネルの `SV-13` と同じ語、同じ矩形（`ScreenRegions.scheduleCanvas`）。`DFC-1880` の期待の欄も「行見出しを含む。`App Header` を覆わない」 | 無い |
| 決定 2 | ヘルプを動かし大きさを変えられる範囲も `Schedule Canvas` の全体にする（前は窓いっぱい） | `WB-8`・`WB-9` が「範囲は `WB-3` と同じ」と 4 つのウインドウに言う。ヘルプだけ分けると表に例外が 1 つ増える。`App Header` を隠さないので、見比べる目的（`FR-036` の理由）にもかなう | ヘルプを `App Header` の上へ動かせなくなる。⇒ 利用者に問う（11 節の 2、`PND-746`） |
| 決定 3 | 添える語の括弧は半角の丸括弧 `(` `)`、辞書の語の中に持つ | `IC-20` の語「(備考 ※1を参照)」／「(see note *1)」が既にこの形である。英語は文頭でないので小文字で始める（`IC-20` と同じ） | 無い |
| 決定 4 | `DFC-2047` は変えない（推奨 ③ 今のまま）として、利用者に問う | `JDG-1432` —— 同じ夜、同じ形（手前のパレットがウインドウの中身を覆う）に利用者は「いまのまま」と答えた。①（ヘルプを開くあいだパレットを最小化の形で描く）は、ヘルプが説明しているパレットの入口を隠し、見比べを妨げる。②（ヘルプの既定の置き場をパレットの右に寄せる）は `S-201` が 0.95 なので場所が無い | 開いた直後、1280 × 627 で「基本操作」の塊の 144 × 181px と `App Header` の塊の 40 × 181px がパレットの下に在る（7 節）。パレットを掴んで退ければ読める |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| ヘルプの最大化の範囲 | `docs/spec/01-04-requirements.md` の `FR-036`（「ヘルプの最小化・最大化…」の段落の 2 行目） | E-01 |
| ヘルプを動かし大きさを変えられる範囲 | 同じ段落の 3 行目 | E-02 |
| 表の範囲の括弧 | 同 表 T-335 の `WB-3` の「置き場と大きさ」の欄 | E-03 |
| 添える語を括弧で囲む | 同 `FR-036` の `IC-20` の項目の行の後に 2 行 | E-04 |
| `IC-54` の添える語 | `docs/spec/_source/display-words.json` の `helpNotes` の `IC-54` | E-05 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行 | E-06 |

**数**: 表の行 ±0。要求の増減 0。図 0。設定値 ±0。辞書の語の数 ±0（1 行の字を変える）。

---

## 2. 新しい識別子

取らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消す文 | 代わり |
|---|---|---|
| `FR-036` | 「ヘルプを最大化したときに占める範囲は、閲覧環境の窓の全体とする（MUST） —— 最大化は読むために広げる操作であり、ヘルプは自分の言語の入口と閉じる入口を持つので、`App Header` を覆ってよい。」 | E-01 |
| `FR-036` | 「ヘルプを動かし大きさを変えられる範囲も、閲覧環境の窓の全体とする（MUST） —— ヘルプを実物の横へ寄せ、見比べられるようにするためである。」 | E-02 |
| 表 T-335 の `WB-3` | 「（ヘルプは閲覧環境の窓の全体、検索パネル・遅延診断レポートの窓・対話欄は `Schedule Canvas`（`U-32`）の全体）」 | E-03 |
| 辞書 `helpNotes` の `IC-54` | 「構えている間だけ出る」／「Shown only while armed」 | E-05 |

⭐ 消さないもの: `FR-036` の「ヘルプは、閲覧環境の窓から `App Header` を除いた領域の中央に…`S-201` が定める割合で開くこと（MUST）」と「動かした後と最大化（表 T-335）の箱はこの文の外である」、表 T-337 の `UZ-7`（ヘルプは `App Header` より手前 —— 重ならなくなっても順は要る: 範囲が狭まる前のフレームや、ほかのウインドウとの順の理由は `UZ-13` と同じ）、`WB-8`・`WB-9` の「ウインドウごとの範囲（`WB-3` と同じ）」（決定 2 で真のまま）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧が 1 回だけ現れることを数えた。改行は LF（ファイルの全数）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
```text
ヘルプを最大化したときに占める範囲は、`Schedule Canvas`（`_assets/tbl-glossary.md` の `U-32`）の全体とする（MUST） —— 利用者が、ヘルプの最大化も検索パネルと同じく日程の領域に広げると定めた。  
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
```text
ヘルプを動かし大きさを変えられる範囲も、`Schedule Canvas` の全体とする（MUST） —— 表 T-335 の `WB-8`・`WB-9` が範囲を最大化の範囲と同じとするからであり、ヘルプを実物の横へ寄せて見比べるあいだも `App Header` の入口を隠さない。  
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`WB-3` の「置き場と大きさ」の欄: 「ウインドウごとに定める範囲いっぱい（ヘルプ・検索パネル・遅延診断レポートの窓・対話欄のどれも `Schedule Canvas`（`U-32`）の全体）」。

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`FR-036` の「`IC-20` の項目には、備考 ※1 を参照することを添えること（MUST）…」の行の直後に 2 行足す:

```text
⭐ `IC-54` と `IC-20` の項目に添える語は、丸括弧で囲むこと（MUST） —— 項目の説明は名の語と添える語を半角の空白 1 つで繋ぐので、囲まないと添えた語が名の続きに読める。  
括弧は辞書の語の中に持ち、描き手は足さない。  
```

<!-- EDIT id=E-05 file=docs/spec/_source/display-words.json -->
`helpNotes` の `IC-54`: ja「(構えている間だけ出る)」、en「(shown only while armed)」。

<!-- EDIT id=E-06 file=docs/development-records/changelog.md -->
変更履歴の表の終わりに次の版の 1 行を足す（版はコミットの直前に木の最大を測って決める。並行した CR と重なれば調整役が振り直す）。

### 4.1 生成物

- `npm run gen` が `src/adapter/screen-renderer/display-words.json` と `docs/development-records/test-inventory.md` を刷る。手で直さない。

---

## 5. 継ぎ目

```
SEAM (CR-669)
- src/adapter/screen-renderer/screen-renderer.ts: HelpWindowArea keeps one rect, belowAppHeader
  (= ScreenRegions.scheduleCanvas). The field browserWindow is removed; helpWindowAreaOf returns
  { belowAppHeader: regions.scheduleCanvas }.
- src/framework/dom-screen-surface/open-modals-drawing.ts: helpPlacedOf takes its range (move,
  resize, maximise, the minimised corner) from modal.area.belowAppHeader.
- No published member changes (HelpWindowArea is not in table T-064 / T-065).
- The help item text still joins the name and the helpNotes word with one space
  (open-modals.ts, HELP_NOTES_BY_ROW); the brackets come from the dictionary (E-04).
```

---

## 6. グラフ（`032c9ce4`）

- `impact.py WB-3`: 要求 2 件 / 参照 10 か所。`FR-151` の `SV-13`（検索パネル —— 変わらない）、`FR-036` の `WB-1`〜`WB-8` の行（`WB-8` の「範囲は `WB-3` と同じ」は決定 2 で真）、`tbl-published-entries.md` の `PI-37`（`ScreenView` —— 型の名だけ。変わらない）、状態機械 `helpDisplayStateMachine`・`dialogueFieldDisplayStateMachine`（根拠に `WB-3` を引くだけ。遷移は変わらない）。
- `impact.py IC-54`: 要求 2 件 / 参照 4 か所。`FR-053`（構えの読み —— パレットの中の札 `S-489` で、ヘルプの語ではない）、`FR-036`（E-04）、`tbl-settings.md` の 8 節（保存しないもの —— 変わらない）。
- 「閲覧環境の窓」を言う文を全部読んだ（`01-04-requirements.md` の 9 か所と `S-201` の注）。範囲を言うのは E-01・E-02・E-03 の 3 か所だけ。ほかは窓の縁の形（`PK-12`〜）・パレットの掴み帯（`FR-053`）・ウインドウの定義・1 画面の環境・ツールチップの幅・既定の置き場の基で、どれも変わらない。
- コード: `HelpWindowArea` の `browserWindow` を読むのは `open-modals-drawing.ts` の `helpPlacedOf` 1 か所だった。

---

## 7. 数の予測と実測（当てた後に同じ数え方で突き合わせた）

| 数 | 前 → 後 | 方法 |
|---|---|---|
| 最大化したヘルプの箱（1280 × 627） | `[0, 0, 1280, 627]` → `[0, 29, 1280, 627]`（`App Header` の下の縁 29px から。当てた出荷ビルドで測った） | 13 節の重なりの測り（`max`） |
| ヘルプの余り（1280 × 627、日 / 英） | 2px / 2px → 2px / 2px（最も高い段は `HC-3` の 490px のまま —— 括弧を足しても `IC-54` の項目は 1 行に収まる）。1920 × 1080 は 432px / 432px のまま | `previous-project-result/37-help-fits-one-screen/measure-help-slack.cjs` |
| 開いた直後にパレットの下に在る塊（1280 × 627） | 「基本操作」144 × 181px・`App Header` 40 × 181px（変えない） | 13 節の重なりの測り |
| 検査 39 の拾えていない条項 | 2226 → 2227（基線 2223。本書の差は +1 —— E-04 の新しい MUST。E-01 は `tests/system/cr-574-help-window.test.ts` が新しい字で引き、E-02 と「最小化したヘルプと…表 T-336 に従うこと（MUST）」は前から拾えていない窓が字を替えただけ） | `check-must-clause-coverage.py` と、窓の集合を前後で比べる scratch の写し |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec/01-04-requirements.md` ・ `_source/display-words.json` ・ 生成物 | E-01〜E-05、`npm run gen` | 本書の体 |
| 2 | `src/adapter/screen-renderer/screen-renderer.ts` ・ `src/framework/dom-screen-surface/open-modals-drawing.ts` | 5 節 | 本書の体 |
| 3 | `tests/` | 9 節 | 古い範囲を固めた試験は本書の体が直した。新しい試験は仕様だけを読む別の体 |

- ⭐ **毎フレームの経路: はい。** `src/adapter/screen-renderer/screen-renderer.ts`（`helpWindowAreaOf`）と生成物 `display-words.json` に触れる。矩形を 1 つ作るのをやめただけで、毎フレームの割り当ては 1 つ減る。`perf-pending.md` に行を足す。

---

## 9. 仕様の外で直すもの

- コード: 5 節。
- 古い範囲を固めた試験（同じ変更で退け、新しい条項を指す）:
  - `tests/system/cr-574-help-window.test.ts` の item 10 —— 最大化したヘルプの箱を、窓の全体から `App Header` の下の領域へ。引く文を E-01 の字に替えた。
  - `tests/contract/dfc-587-title-row-entries-are-drawn.test.ts`・`tests/unit/cr-405-the-help-scrolls-down-in-three-columns.test.ts`・`tests/unit/cr-439-open-modals-help-roster-report-export.test.ts`・`tests/unit/cr-541-panels-help-tooltip-and-dialogue.test.ts`・`tests/unit/fr-036-help-item-order-and-size.test.ts`・`tests/unit/uf-71.test.ts`・`tests/unit/uf-72-screen-part.test.ts` —— 試験の中の `HelpWindowArea` から、消えた `browserWindow` を外した（値は読まれていなかった）。
- 新しい試験（仕様だけを読む体）: E-01（最大化したヘルプの箱 ＝ `Schedule Canvas`、`App Header` の入口が押せる）、E-02（題の行を引いても `App Header` の上へ出ない）、E-04（`helpNotes` の語がどれも丸括弧で始まり丸括弧で終わる、日英とも）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 重なり順（表 T-337 の `UZ-5`・`UZ-7`）とパレットの既定の置き場は変えない（決定 4、`PND-745`）。
- `S-201`・`S-203` は変えない。1 画面の測りは 7 節。
- 検索パネル・遅延診断レポートの窓・対話欄の範囲は変えない（もとから `Schedule Canvas`）。

---

## 11. 利用者に問うこと

1. **`DFC-2047` —— ヘルプを開いた直後、手前のパレットが「基本操作」とヘッダーの塊の左上を覆う**（`PND-745`）。推奨: ③ 今のまま（パレットを掴んで退ける、`FR-053`）—— `JDG-1432` で最大化したレポートについて同じ答えを得ている。ほかの道: ① ヘルプを開いているあいだパレットを最小化の形で描く（ヘルプが説明するパレットの入口が隠れる）、② ヘルプの既定の置き場をパレットの右に寄せる（`S-201` が 0.95 なので場所が無く、`S-201` を下げることになる）。
2. **ヘルプを `App Header` の上へ動かせなくしてよいか**（`PND-746`、決定 2）。推奨: このまま（4 つのウインドウが同じ範囲。ヘッダーの入口が常に見える）。ほかの道: 移す範囲だけ窓いっぱいに戻す（`WB-8`・`WB-9` の括弧にヘルプの例外を書く）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1244` | 問い 8「どちらも日程の領域」 | 状態の欄の 8 を「`CR-669` が当てた」にする（5・6・7 の扱いは変えない） |
| `DFC-1880` | 本書が閉じる | `仕様待ち` → `実測待ち`（自動試験は緑。利用者が出荷ビルドで見るのはまだ） |
| `DFC-2046` | 本書が閉じる | `未検討` → `実測待ち`（同じ） |
| `DFC-2047` | 変えない（推奨）を問う | `未検討` → `裁定待ち`（`PND-745`） |
| `PND-745` | `DFC-2047` の問い | 新しい行、未裁定 |
| `PND-746` | 決定 2 の問い | 新しい行、未裁定 |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 032c9ce4

# the numbers are unused
git grep -l "CR-669"                      # nothing before this CR
git grep -l "PND-74[56]\b"                # nothing
git grep -l "JDG-144[234]\b"              # nothing
git grep -l "DFC-2087\b"                  # nothing

# the ruling chain (section 0.1)
grep -n "最大化" docs/development-records/rulings.md

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py WB-3 IC-54
grep -n "閲覧環境の窓" docs/spec/*.md docs/spec/_assets/*.md

# section 7: the shipped build (vite build), then
node previous-project-result/37-help-fits-one-screen/measure-help-slack.cjs <abs node_modules> <abs dist/index.html> 1280 627
node previous-project-result/37-help-fits-one-screen/measure-help-slack.cjs <abs node_modules> <abs dist/index.html> 1920 1080
# overlap probe (scratchpad, not committed): opens the help with F1 and prints the palette's rect,
# the help's rect and, per data-help-block, the area the palette covers; "max" presses IC-130 first.

# check 39
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-must-clause-coverage.py
```
