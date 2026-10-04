# CR-659 —— ヘッダーの「GRS」の左右の余白を、帯の左端の余白に揃える

> 起草の状態: 当てた（2026-10-04 夜、調整役の統合点 `032c9ce4` から早送りした作業木、レーン L1）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-659`、裁定の帯 `JDG-1440`〜`JDG-1441`、台帳の帯 `DFC-2086` は調整役から受けた（13 節で、木のどこにも在らないことを測った）。どれも使わなかった —— 新しい裁定も新しい不具合も無い。仕様の新しい識別子も取らない（2 節）。
> 閉じるもの: 台帳 `DFC-1900` の残り（`JDG-1350` の「スペースが空きすぎ」）。
> 覆すもの: 無し。`CR-650` が置いた `BR-7` の「縦線の左右に `S-491` × `S-235`」を、利用者の新しい指示（`JDG-1350`）で替える —— 前の値は見本の間隔であり、裁定ではない（`S-491` の注の 🔎）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（全文は `docs/development-records/rulings.md` の該当行）

| 出どころ | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1350`（2026-10-04 夜、`de7514df` の出荷ビルドを試した結果） | 「GRS の印が小さく、右に縦線が出るか。 → 出る。 ただし、スペースが空きすぎ。 赤ペンの例ぐらいに GRSの左右マージンは現行の左側に合わせて。」 | `GRS` の字の右（縦線まで）の余白を、いまの左の余白（帯の左端から字まで）に揃える（E-02・E-05）。縦線の右（題まで）も同じ隔たりにする（決定 2） |

⚠️ 「赤ペンの例」は利用者が添えた絵で、本書を書いた体は見ていない。逐語だけで読んだ。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ `FR-051` の `Branding` がアプリの印として題から分かれて見えること（`DFC-1900` の期待値）。印の右に字 1 つ半ほどの空きがあると、印・縦線・題がばらばらに浮いて見える。左右を揃えると印が 1 つの札として読める。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（同じことを 2 か所で言わない）** —— 「左の余白」と「縦線の両脇の隔たり」を 1 つの行 `S-226` で持つ。別の行に持てば、片方だけを直したときに左右が食い違う（`S-226` の注に ⛔ を足した）。
- **`R1.4`（境界）** —— 既定でない書体: 席は既定の書体（`Yu Gothic UI`）の字にちょうど足りる長さにしたので、ほかの書体では字が席から右へはみ出す。測った 4 書体で最大 5.4px、縦線の左の隔たり 8px の内に収まる（`S-462` の注）。帯が狭いとき: 席は縮めない（`BR-2` の MUST NOT、変えない）。
- **数の主張** —— 18.3px・12px・8.0px は出荷ビルドで測った（7 節）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 隔たりの値は新しい行を起こさず、帯の左端の余白 `S-226` をそのまま読む | 利用者の「現行の左側に合わせて」は値ではなく規則 —— 同じ行を読めば、左を直しても左右が揃ったまま | `S-226` の名と注が 2 つの役を持つ（名に書き足した） |
| 決定 2 | 縦線の右（題まで）も `S-226` にする | 調整役の指示（縦線の両脇を同じ隔たりで）。縦線の左右が違うと、縦線が題か印のどちらかに寄って見える | 題が 13.5px 左へ寄る。利用者の逐語は「GRS の左右」だけを言う —— 11 節の問い 1 |
| 決定 3 | 席の幅の比 `S-462` を 2.5 → 1.92（既定の書体の `GRS` の送りの幅 1.82 ＋ 両側の縁 0.10） | 席に余りを残すと、その分だけ字の右が左より広い（前は 6.4px の余り）。題の位置は字を測らずに式で決める（`BR-2`・`EP-1` の MUST NOT）ので、余りは比で詰めるしかない | 既定でない書体では字が席からはみ出す（② の `R1.4`） |
| 決定 4 | `S-491` は帯のほかの隔たり（題と 2 段の箱、2 段の箱と `Header Commands`、`HS-9`・`HS-10`）に残し、値 18 も変えない | 利用者は印の左右だけを言った | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 題の左端の式 | `docs/spec/01-04-requirements.md` の 表 T-349 の `BR-2` | E-01 |
| 縦線の両脇の隔たり | 同 表 T-349 の `BR-7` | E-02 |
| 書き出しの題の位置の出どころ | 同 表 T-076 の `EP-1` | E-03 |
| 帯の左端の余白が両脇も持つ | `docs/spec/_source/settings.json` の `S-226`（名と注） | E-04 |
| 席の幅の比 | 同 `S-462`（値と注） | E-05 |
| 帯の中身の隔たりから縦線の両脇を外す | 同 `S-491`（名と注） | E-06 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行 | E-07 |

**数**: 表の行 ±0。要求の増減 0。図 0。設定値 ±0（値が動くのは `S-462` だけ）。辞書 ±0。

---

## 2. 新しい識別子

取らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消す文 | 代わり |
|---|---|---|
| `BR-2` | 「`S-226` と席の幅と同表の `S-491` の 2 つ分を足して」 | 「`S-226` の 3 つ分（帯の左端から席まで、縦線の左、縦線の右）と席の幅を足して」（E-01） |
| `BR-7` | 「縦線の左右に同書の 表 T-206 の `S-491` に `S-235` を掛けた隔たりを空けること（MUST）。」 | 「縦線の左右に、帯の左端から席までと同じ隔たり —— `S-226` に `S-235` を掛けた長さ —— を空けること（MUST）」と理由、⚠️ 席の幅の注（E-02） |
| `EP-1` | 「隔たりは `S-491` から」 | 「隔たりは `S-226` から」（E-03） |
| `S-226` の注 | 「縦線の両脇の隔たり（`S-491` の 2 つ分）」 | 「縦線の両脇の隔たり（本行の 2 つ分）」と ⭐・⛔ の 2 文（E-04） |
| `S-462` | 値 2.5 🔎、注の「縦線の両脇の `S-491` が持つ」「本値はこの 4 つのどれでも字を席に収める」「字の右に 0.58 …の余りが残り」「余りの大きさは利用者が選んだ値ではない（🔎）」 | 値 1.92（🔎 を外す —— 由来を書いた）、注を書き直す（E-05） |
| `S-491` の名 | 「`Branding` の縦線の両脇（`FR-051` の 表 T-349 の `BR-7`）、」 | 無し（E-06） |

⭐ 消さないもの: `BR-2` の「字の実寸を測って題を置いてはならない（MUST NOT）」「帯が狭いときも、席を縮めてはならない（MUST NOT）」、`BR-7` の太さ `S-492`・色 `S-493`、`HS-9`・`HS-10` の `S-491`、`S-491` の値 18、`S-490` の 16.5（字の大きさは変えない）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧が 1 回だけ現れることを数えた（編集の手順が数を確かめてから書く）。改行は LF（ファイルの全数）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
表 T-349 の `BR-2` の 3 段目の「題の左の余白は、`S-226` と席の幅と同表の `S-491` の 2 つ分を足して `S-235` を掛け、」を「題の左の余白は、`S-226` の 3 つ分（帯の左端から席まで、縦線の左、縦線の右）と席の幅を足して `S-235` を掛け、」に替える。

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
表 T-349 の `BR-7` の 2 段目を次に替える:

```text
太さは同書の 表 T-206 の `S-492`、色は同書の 表 T-236 の `S-493` とし、縦線の左右に、帯の左端から席までと同じ隔たり —— 同書の 表 T-206 の `S-226` に `S-235` を掛けた長さ —— を空けること（MUST） —— 利用者が、`GRS` の字の左右の余白を、いまの左の余白に揃えよと定めた。<br>⚠️ 席の幅（`BR-2`）は既定の書体の字と両側の縁にちょうど足りる長さなので、字の右から縦線までの余白は、帯の左端から字までの余白と同じになる —— 書体による違いは同表の `S-462` の注が持つ。
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
表 T-076 の `EP-1` の「隔たりは `S-491` から」を「隔たりは `S-226` から」に替える。

<!-- EDIT id=E-04 file=docs/spec/_source/settings.json -->
`S-226` の名の末に「 —— `Branding` の縦線の両脇の隔たり（`FR-051` の 表 T-349 の `BR-7`）も本行である」を足す。注の「（`S-491` の 2 つ分）」を「（本行の 2 つ分）」に替え、「題はその分だけ右へ寄る。」の後に「⭐ **縦線の両脇の隔たりも本行である**（`BR-7`）—— 利用者が、`GRS` の字の左右の余白を、いまの左の余白に揃えよと定めた。⛔ 両脇の隔たりを別の行として持たない —— 持てば、本行を直したときに字の左と右の余白が食い違う。」を足す。

<!-- EDIT id=E-05 file=docs/spec/_source/settings.json -->
`S-462` の既定を `1.92`（印 🔎 を外す）にし、注の頭の「縦線の両脇の `S-491` が持つ」を「縦線の両脇の `S-226` が持つ」に、「⚠️ 実測（…）…保存しない理由は `S-461` と同じである」を次に替える:

```text
⭐ **値は既定の書体（`Yu Gothic UI`）の `GRS` の幅 1.82 に両側の縁（`S-461` × 2 ＝ 0.10）を足した長さである** —— 利用者が `GRS` の字の左右の余白をいまの左の余白に揃えよと定めたので、席に余りを残さない。余りを残すと、その分だけ字の右の余白が左より広く見える（以前の 2.5 では 0.58、既定で 6.4px）。⚠️ 実測（Chromium 151、字の大きさ 1 に対する `GRS` の送りの幅、太さ 400、canvas の `measureText`）: `Yu Gothic UI` 1.82、`Yu Gothic` 2.02、`Arial` 2.17、`BIZ UDPGothic` 2.31。⚠️ 既定でない書体では字が席から右へはみ出す —— 縁を足して最大 2.41 であり、はみ出しは既定で最大 5.4px、縦線の左の隔たり（`S-226` × `S-235` ＝ 8px）の内に収まるので、字は縦線に触れない。⛔ 書体ごとに席を測り直してはならない —— 題の位置は `BR-2` の式で決まり、書き出しは字を測れない（表 T-076 の `EP-1`）。⭐ 出荷ビルド（1920×1080 と 1280×627、明暗、日英）で、縁を含めた字の左の余白 8.0px に対し、字の右から縦線までが 8.5px、縦線から題までが 8px と測った。保存しない理由は `S-461` と同じである
```

<!-- EDIT id=E-06 file=docs/spec/_source/settings.json -->
`S-491` の名から「`Branding` の縦線の両脇（`FR-051` の 表 T-349 の `BR-7`）、」を外す。注の「⛔ `S-441` と兼ねてはならない」の前に「⚠️ `Branding` の縦線の両脇は本行ではなく `S-226` である（`FR-051` の 表 T-349 の `BR-7`）—— 利用者が、`GRS` の字の左右の余白を帯の左端の余白に揃えよと定め、本行の 12px は広すぎるとした。」を足す。

<!-- EDIT id=E-07 file=docs/development-records/changelog.md -->
変更履歴の表の終わりに次の版の 1 行を足す（版はコミットの直前に木の最大を測って決める）。

### 4.1 生成物

- `npm run gen` が `docs/spec/_assets/tbl-settings.md`、`src/framework/dom-screen-surface/dom-screen-surface.ts` と `src/adapter/image-exporter/image-exporter.ts` の生成された `NOT_STORED_DOCUMENT_TITLE_SIZES`（`S-462`）を刷る。手で直さない。

---

## 5. 継ぎ目

```
SEAM (CR-659)
- src/framework/dom-screen-surface/app-header-drawing.ts:
  appHeaderStyle(): padding-left S-226 x S-235, no column-gap (each gap names its own row).
  fillAppHeader(): the divider gets margin-inline S-226 x S-235 (BR-7);
  Header Commands get margin-left S-491 x S-235 (HS-9); the title ground keeps padding-right S-491 x S-235 (HS-10).
- dom-screen-surface.ts STYLE.brandingDivider: margin-block only (the inline sides come from the drawing).
- src/adapter/image-exporter/image-exporter.ts appHeaderSvg(): the divider gaps read S-226, not S-491;
  the title x is (3 x S-226 + S-490 x S-462) x S-235 + S-492, the same sum as the screen.
```

---

## 6. グラフ（`032c9ce4`）

- `impact.py BR-2 BR-7 S-491 S-462 S-226`: `BR-2` ← `FR-080`（`EP-1`、E-03 で合わせた）・`FR-101`（`HS-10` が「表 T-349 の `BR-2`」を指す —— 題の末尾を省く規則で、式に触れないので真のまま）。`BR-7` ← `FR-051` の頭の段（「縦線の両脇の隔たり（下の 表 T-349）」—— 真）・`FR-101` の `HS-9`（「`BR-7` の縦線の右から」—— 真）。`S-491` ← `HS-9`・`HS-10`（変えない）、`BR-2`・`BR-7`・`EP-1`（本書で外した）。`S-462` ← `BR-2`・`EP-1`（式の形は同じ）。`S-226` ← `FR-051` の頭の段（「左の余白（`S-226`）」—— 真）。
- `S-491` を読むコード: `app-header-drawing.ts`（帯の隙間 → `Header Commands` の左と題の地の右だけに）、`image-exporter.ts`（題の位置の式から外れ、生成された定数の項だけが残る —— 生成の群は画面と同じ並びのまま）。
- 届いた行で `rulings.md` を引いた（`GRS`・印・縦線・`S-491`・`S-462`・`BR-2`・`BR-7`）: `JDG-1250`・`JDG-1255`・`JDG-1259`・`JDG-1310`・`JDG-1311` は字の大きさ・縦線の有無・縁・書き出し・下段の字を決めたもので、隔たりの値を決めた裁定は無い。食い違う裁定は無い。

---

## 7. 数の予測と実測（当てる前と後に同じ方法で測った）

| 数 | 前 → 後 | 方法 |
|---|---|---|
| 縁を含めた `GRS` の字の左の余白（帯の左端から） | 8.0px → 8.0px | 13 節の測り。8 通り（1920×1080 と 1280×627 × 明暗 × 日英）で同じ値 |
| 字の右（縁を含めた墨の右端）から縦線まで | 18.3px → 8.4px | 同 |
| 縦線から題の箱まで | 12px → 8px | 同 |
| 題の左端 | 60.5px → 47px | 同。書き出しの式 `(3 × 12 + 16.5 × 1.92) × 0.6667 + 1` ＝ 47.1 と一致 |
| 長い題が保存時刻の行の手前で止まる | 止まる → 止まる | 同。題を 294 字にして、題の地の右端 ≤ 保存時刻の左端 |
| 検査 39 の拾えていない条項 | 測った値は 13 節 | `check-must-clause-coverage.py` |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec/01-04-requirements.md` ・ `_source/settings.json` ・ 生成物 | E-01〜E-06、`npm run gen` | 本書の体 |
| 2 | `app-header-drawing.ts` ・ `dom-screen-surface.ts` の `STYLE` ・ `image-exporter.ts` の 1 行 | 5 節 | 本書の体 |
| 3 | `tests/` | 9 節 | 古い式を固めた試験は本書の体が直した。新しい試験は仕様だけを読む体 |

- ⭐ **毎フレームの経路: はい（スタイルの文字列だけ）。** `fillAppHeader` は帯を描き直すたびに走る。要素の数も組み方も変わらない。`perf-pending.md` に 1 行足した。

---

## 9. 仕様の外で直すもの

- コード: 5 節。
- 古い式を固めた試験（同じ変更で退け、新しい条項を指す）:
  - `tests/unit/cr-628-the-branding-seat.test.ts` —— 題の左端を `(3 × S-226 + 席) × S-235 + S-492` で、帯に `column-gap` が無いことを確かめる。
  - `tests/contract/cr-650-the-branding-divider-and-the-shared-header-width.test.ts` —— `BR-2`・`EP-1` の字の並び、縦線の `margin-inline` が `S-226` × `S-235`、`Header Commands` の左が `S-491` × `S-235`（足した）、書き出しの題の x。
  - `tests/contract/dfc-355-the-four-rulings-of-2026-09-07.test.ts` —— 書き出しの題の x の式。
  - `tests/system/cr-650-the-title-and-the-file-name-share-the-header.test.ts` —— 縦線の右を `S-226` × `S-235` で。
- 新しい試験（仕様だけを読む体）: E-02（縦線の左右が帯の左端の余白と同じ —— 画面）、E-05（既定の書体で字の右の余白が左と ±1px —— 実物の画面）、E-01・E-03（画面の題の左端と書き出しの題の x が同じ式）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- `S-491` の値 18 は変えない（決定 4）。
- `GRS` の字の大きさ `S-490`、縁 `S-461`、縦線の太さと色は変えない。
- 書き出しは `Branding` も縦線も描かない（`BR-6`・`EP-1`、変えない）—— 空けておく分が 13.5px 減るだけ。

---

## 11. 利用者に問うこと

1. 縦線の右（縦線から題まで）も帯の左端の余白と同じ 8px にした（決定 2）。利用者の逐語は「GRS の左右」だけを言う。推奨: このまま（縦線が印と題のまん中に立つ）。もう 1 つの道は縦線の右だけ前の 12px（`S-491`）に戻すこと。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1350` | 「GRS の左右マージンは現行の左側に合わせて」 | 適用済、着地先 表 T-349 の `BR-2`・`BR-7`、表 T-206 の `S-226`・`S-462`・`S-491`、表 T-076 の `EP-1` |
| `DFC-1900` | 本書が残りを閉じる | `仕様待ち` → `実測待ち`（自動試験は緑。利用者が出荷ビルドで見るのはまだ） |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 032c9ce4

# the numbers are unused (CR-659 was already named by DFC-1900 and JDG-1350 as the CR to come)
git grep -l "JDG-144[01]\b"    # nothing
git grep -l "DFC-2086\b"       # nothing

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py BR-2 BR-7 S-491 S-462 S-226

# section 7: a Playwright probe in the session scratchpad opens dist/index.html by file://
# at 1920x1080 and 1280x627, colorScheme light and dark, then ja and en (IC-21), and reads:
#   the Branding text range rect, canvas measureText(actualBoundingBoxLeft/Right) of "GRS"
#   at the computed font, plus half the -webkit-text-stroke-width (the rim) on each side;
#   the Branding Divider rect; the Document Title rect; File Saved At rect.
# The long-title case sets the Document Title's text to 294 characters and compares the
# Document Title Ground's right edge with File Saved At's left edge.
# The font ratios of S-462 come from the same canvas measureText at 100px, weight 400.
# "before" is the dist/index.html of 032c9ce4; "after" is a build of this tree.

# check 39
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-must-clause-coverage.py
```
