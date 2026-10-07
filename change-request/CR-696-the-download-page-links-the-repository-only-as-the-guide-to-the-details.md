# CR-696 —— 入手の頁（`S-350` の頁）は、詳しい説明の案内としてだけリポジトリの頁（`S-459` の所）へのリンクを持つ —— 入手する所にはしない

> 起草の状態: 当てた（2026-10-07、作業木 `7bb3d432` の上。頁の原稿 `docs/download/index.html` は同じ作業木で別の席が書いた未コミットの変更であり、本書は触らない）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-696` は調整役から受けた（13 節で、当てる前の木で `CR-696` を名乗るのが `rulings.md` だけであることを測った。2026-10-07、`7bb3d432`）。仕様の新しい識別子（行 ID・表・図・設定値の行・接頭辞）は取らない。
> 当てる裁定: `JDG-1590`（`docs/development-records/rulings.md` の「2026-10-07 —— 入手の頁の冒頭の文案・GitHub への案内・取次のアドレスを保つ（JDG-1589〜JDG-1591）」）。`JDG-426` は `JDG-1590` が一部覆した（印は既に付いている）。
> 閉じるもの: `S-350` の注の「リポジトリの頁を案内先にしない」と、`S-459` の注の「この所を語やコードや試験に写して持たない」が、頁の原稿の「Learn more on GitHub」／「詳しくは GitHub へ」のリンクとぶつかること。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `rulings.md` の該当行）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1590` | 「詳細は https://github.com/GoodRelax/gr-scheduler を参照させればいいだろ？」 | 入手の頁は、詳しい説明の案内としてだけリポジトリの頁へのリンクを持つ（E-01・E-03）。入手する所にはしない —— `GRS.html` と束は頁のボタンとリンクで落とす。`S-459` の注の「写して持たない」に、頁の原稿 1 つだけの例外を足す（E-02） |
| `JDG-426` | 「…https://github.com/GoodRelax/gr-scheduler<br>は画面が難しいからダウンロード用のサイトは後ほど .io 向けに設定する。…」 | 一部覆された（印は `rulings.md` に既に在る）。「画面が難しいので入手の案内先にしない」は残し、入手する所にしないことの理由として書く（E-01） |
| `JDG-1589` | 「…[GRS.html をダウンロード]   詳しくは GitHub へ →…」（2 通目） | 頁の冒頭の文案は頁の原稿だけが持つ。仕様は文案を持たない（10 節） |

⭐ 同じ・似た主題の裁定を `rulings.md` で引いた（「リポジトリ」「GitHub」「github.com」「S-459」「S-350」「入手」「download」）。`JDG-426`（上）・`JDG-427`（押せるリンク）・`JDG-881`（Copyright を押すとリポジトリ）・`JDG-882`（`Branding` を押すとリポジトリ、`S-459`）・`JDG-1027`・`JDG-1047`（束の置き場）・`JDG-1459`〜`JDG-1461`（頁が手順を自分で持つ、`CR-675`）。`JDG-1459` の「他のマニュアルの閲覧は禁止」とは食い違わない —— 案内のリンクは手順の 1 段ではなく、手順はリポジトリの頁を開かずに済む（`design-mcp-relay.md` の 6 節の末の段はそのまま正しい）。本書が覆す裁定は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`GL-006`**（マニュアルを読まずに使える） —— 入手と手順は頁が持ったまま、詳しく知りたい人だけが説明へ進める道を足す。入手の道は 1 つ（頁のボタン）に保つ。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（唯一の正）** —— リポジトリの所の正は `S-459` の 1 行である。頁の原稿は表を読めない手書きの静的な頁なので、所を書き写すほかない。⇒ 写しを黙って増やさず、`S-459` の注に「例外はこの 1 つ、所を変えたら 2 つ目の直す場所」と書く（E-02）。`design-mcp-relay.md` にも `S-350` の注にも所の字は書かない。
- **`R2.14`（POLA）** —— 入手のボタンの隣に GitHub へのリンクがあると、そこでも落とせると読める。⇒ リンクは詳しい説明の案内としてだけ持ち、入手する所にしないことを `S-350` の注と 6 節に書く（E-01・E-03）。
- **`R2.21`（1 つの仕事は 1 か所）** —— 入手は頁、詳しい説明はリポジトリ、と仕事を分けたまま、頁から片方へ案内するだけにする。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | `S-350` の旧の理由「利用者が、その画面は難しいとした」を「リポジトリの頁の画面はコードを扱う人のためのもので、ファイルを落とすだけの利用者には入手の道が見えにくい」と理由の文に直す | 仕様は理由を持ち、出どころを持たない（`docs/development-rules/08-spec-template/spec-writing-rules.md` の「仕様書は理由を持ち、履歴を持たない」）。アプリの利用者はファイルを落とすだけで git も GitHub も使わない | 利用者の言葉（「画面が難しい」）は `rulings.md` だけが持つ |
| X-2 | `S-459` の「直す場所を本行の 1 か所に限る」を「本行に限る」とし、例外 1 つを名指す | 例外を足したまま「1 か所に限る」を残すと、同じ注の中で自分を割る | 無い |
| X-3 | 頁が持つものの目録（6 節）に、詳しい説明への案内を 1 項足す | `S-350` の注は「頁が持つものは 6 節が持つ」と言う（`CR-675`）。目録に無いリンクを頁が持つと、目録が偽になる。項は箇条の末に足す（6 節の段落の終わり。試験が引く文を割らない） | 無い |
| X-4 | 頁の冒頭の文案（題・惹句・特徴 6 つ、`JDG-1589`）は仕様に書かない | 文案は頁の原稿が持つ手書きの文であり、規則ではない。6 節は「字は変えない」（`JDG-1589` の着地先の欄） | 仕様だけを読む人には文案が見えない |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| リポジトリの頁を入手する所にしない（理由つき）、頁は詳しい説明の案内としてだけリンクを持つ | `docs/spec/_source/settings.json` の `S-350` の `note`（表 T-206 は `settings_json_to_md.py` で刷る） | E-01 |
| 所を写して持たない規則に、頁の原稿 1 つだけの例外を足す。「`S-350` と兼ねてはならない」の理由の文を新しい `S-350` の注に合わせる | 同じファイルの `S-459` の `note` | E-02 |
| 頁が持つものに、詳しい説明への案内を 1 項 | `docs/spec/_assets/design-mcp-relay.md` の 6 節の箇条の末 | E-03 |
| 変更履歴 | `docs/development-records/changelog.md` に版 3.88 の 1 行 | E-04 |
| 裁定の状態 | `docs/development-records/rulings.md` の `JDG-1590` の 状態 の欄だけ | E-05 |
| `FR-073`・`FR-036`・`FR-051`（表 T-349 の `BR-4`）・`FR-069`・辞書の語・`S-350` と `S-459` の値 | 変えない | — |

**数**: 表の増減 0。表の行の増減 0（`S-350`・`S-459` は注のセルだけ）。要求 ID の増減 0。図 0。`（MUST）`・`（MUST NOT）` の印の増減 0（値の表の注と設計書の目録には置かない）。`design-mcp-relay.md` の行が 3 増える（項 1 つ、3 行）。

---

## 2. 新しい識別子

取らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| # | 消すもの（`7bb3d432`） | 置き換わる先 |
|---|---|---|
| 1 | `S-350` の注「⚠️ リポジトリの頁を案内先にしない —— 利用者が、その画面は難しいとした。」 | 「⛔ リポジトリの頁（`S-459` の所）を入手する所にしない —— …見えにくい。⭐ この頁は、詳しい説明の案内としてだけ、リポジトリの頁へのリンクを持つ（…）。」 |
| 2 | `S-459` の注「…直す場所を本行の 1 か所に限る。」の「の 1 か所」 | 「…直す場所を本行に限る。⚠️ 例外は、…その頁が 2 つ目の直す場所である。」 |
| 3 | `S-459` の注「…リポジトリの頁を入手の案内先にしないと同行の注が言う。」の「入手の案内先に」 | 「…リポジトリの頁を入手する所にしないと同行の注が言う。」 |

`S-350` と `S-459` の注のほかの文は 1 字も変えない。`design-mcp-relay.md` から消す文は無い。

---

## 4. 書き直す所

⛔ **作法**: 置き換える前に、旧がそのファイルに 1 回だけ現れることを数える（13 節。どれも 1 回）。3 つのファイルとも `7bb3d432` で LF（CRLF は 0）。

<!-- EDIT id=E-01 file=docs/spec/_source/settings.json -->
`S-350` の `note` の `ja` の中の句（`partial`）を置き換える。 旧
```text
⚠️ リポジトリの頁を案内先にしない —— 利用者が、その画面は難しいとした。
```
新
```text
⛔ リポジトリの頁（`S-459` の所）を入手する所にしない —— `GRS.html` と束は、この頁のボタンとリンクで落とす。リポジトリの頁の画面はコードを扱う人のためのもので、ファイルを落とすだけの利用者には入手の道が見えにくい。⭐ この頁は、詳しい説明の案内としてだけ、リポジトリの頁へのリンクを持つ（`_assets/design-mcp-relay.md` の 6 節。所を書き写す例外は `S-459` の注）。
```

<!-- EDIT id=E-02 file=docs/spec/_source/settings.json -->
`S-459` の `note` の `ja` の中の句（`partial`）を置き換える。 旧
```text
⛔ この所を語やコードや試験に写して持たない —— 所が変わったときに直す場所を本行の 1 か所に限る。⛔ **`S-350` と兼ねてはならない** —— あちらは最新版を入手する頁であり、リポジトリの頁を入手の案内先にしないと同行の注が言う。
```
新
```text
⛔ この所を語やコードや試験に写して持たない —— 所が変わったときに直す場所を本行に限る。⚠️ 例外は、`S-350` の頁の原稿 `docs/download/index.html` の 1 つだけである —— 本表を読めない手書きの静的な頁なので、詳しい説明の案内のリンクにこの所を書く（`_assets/design-mcp-relay.md` の 6 節）。所を変えたら、その頁が 2 つ目の直す場所である。⛔ **`S-350` と兼ねてはならない** —— あちらは最新版を入手する頁であり、リポジトリの頁を入手する所にしないと同行の注が言う。
```
E-01 と E-02 を当てたら `json.loads` で読めることを確かめ、`python docs/spec/_source/settings_json_to_md.py` で 表 T-206 を刷る（生成物を手で直さない）。

<!-- EDIT id=E-03 file=docs/spec/_assets/design-mcp-relay.md -->
6 節の「頁が持つものは次のとおりである。」の箇条の末（「進んだ人向けに、…確かめる手。」の項）の後ろに、次の項を足す。行末の半角空白 2 つ（`  `）は新の一部である（項の中で次の行へ続く行の末）。
```text
- 詳しい説明への案内 —— リポジトリの頁（`_assets/tbl-settings.md` の 表 T-206 の `S-459` の所）へのリンク。  
  ⛔ 入手する所にも手順の 1 段にもしない —— `GRS.html` と束は上のボタンとリンクで落とし、手順はリポジトリの頁を開かずに済む（下の段）。  
  頁は表を読めないので所を書き写す —— 所を変えたときに直す 2 つ目の場所であることは `S-459` の注が持つ。
```

<!-- EDIT id=E-04 file=docs/development-records/changelog.md -->
表の末尾に版 3.88 の 1 行を足す（当てる前の末の行は 3.87。並行する組と重なれば、統合のときに調整役が振り直す）。

<!-- EDIT id=E-05 file=docs/development-records/rulings.md -->
`JDG-1590` の 状態 の欄だけを「適用済 —— `change-request/CR-696-the-download-page-links-the-repository-only-as-the-guide-to-the-details.md` が当てた（2026-10-07）。⚠️ 旧の状態: 指示 —— `CR-696` が当てる」にする。逐語・読み・着地先は変えない（着地先は `.json`・`.md` の道と、在るファイル `docs/download/index.html` を名指すので、検査 43 が読める）。

---

## 5. 継ぎ目

コードの継ぎ目は無い —— `src/` は `S-350` と `S-459` の値（所）だけを読み、注を読まない。頁の原稿 `docs/download/index.html` は、同じ作業木で別の席が書いた（本書の外、9 節）。

```
SEAM (CR-696)
- docs/download/index.html (hand-written, outside docs/spec): beside the top download button,
  one <a> per language block points at the repository page (the value of S-459), opened in a
  new tab with rel="noreferrer noopener". Its label is the page's own text ("Learn more on
  GitHub" / "詳しくは GitHub へ"). It downloads nothing; GRS.html and the bundle stay on the
  page's own buttons and links.
- The page cannot read table T-206, so the address is written there by hand: when S-459
  changes, docs/download/index.html is the second place to fix (S-459's note).
- Nothing in src/ moves: FR-051 (BR-4) and FR-069 keep pointing at S-459's value.
```

---

## 6. グラフ（`7bb3d432`）

| 対象 | 届く先 | 読んだ結果 |
|---|---|---|
| `S-350` | 指される: 要求 2 件 / 参照 7 か所（`FR-073` の 3 か所・`FR-036` の備考 ※1・`design-mcp-relay.md` の 6 節の 2 か所・表 T-206 の `S-459` の注） | `FR-073` は「押すと新しいタブで頁を開く」、`FR-036` は「備考 ※1 で束と所を示す」だけを言い、頁の中のリンクを読まない ⇒ 変えない |
| `S-459` | 指される: 要求 2 件 / 参照 2 か所（`FR-051` の 表 T-349 の `BR-4`・`FR-069`） | どちらも「押すと新しいタブでリポジトリの頁を開く」だけを言い、写しの規則を読まない ⇒ 変えない |
| 閉路 | `induced.py S-350 S-459 FR-073 FR-036 FR-051 FR-069`: 閉路 1（`FR-036`・`FR-069`・`FR-073`・`S-350`・`S-459`、大きさ 5） | 本書が触るのは閉路のうち `S-350` と `S-459` の 2 つで、本書 1 本で 1 度に書く（02 の 1 の 3）。要求の 3 つは触らない |
| `design-mcp-relay.md` の 6 節 ⇄ `S-350`・`S-459` | 6 節が `S-350` を指し、E-03 で `S-459` も指す。`S-350` の注は 6 節を指し、E-02 で `S-459` の注も 6 節を指す | 値の行と、その頁の組み方を持つ設計書の小さな閉路。1 本の変更要求で 3 つとも書く |

- 注の文を引く試験を数えた: `grep -rln "案内先にしない\|写して持たない\|入手の案内先" tests src tools` は 0 件。`tests/system/cr-675-the-download-page.test.ts` が引く `S-350` の注の文（「頁を開いただけでは何も落とさせない」「この頁には、AI のアプリが入れる MCP の束…」）と 6 節の文は 1 字も変えない。
- `S-459` の値を持つのは、生成された定数（`src/framework/dom-screen-surface/dom-screen-surface.ts` の `'S-459'`、表から刷る）と頁の原稿だけ。

---

## 7. 数の予測と実測

| 数 | 予測 | 実測（当てた後） |
|---|---|---|
| 表 | 0 | 0 |
| 表の行 | 0 | 0 |
| 要求 ID・図・設定値の行 | 0 | 0 |
| `（MUST）`・`（MUST NOT）` の印 | 0 | 0 |
| `design-mcp-relay.md` の行 | +3 | +3 |
| `settings.json` の行 | 0（1 行の中の句） | 0 |
| 表 T-206 の行（`tbl-settings.md`） | 0（`S-350`・`S-459` のセルだけ） | 0 |

---

## 8. 波

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | `docs/spec/_source/settings.json`・`docs/spec/_assets/tbl-settings.md`（生成）・`docs/spec/_assets/design-mcp-relay.md`・台帳 | E-01〜E-05 |

- ⭐ **毎フレームの経路: いいえ。** コードは動かない。

---

## 9. 仕様の外で直すもの

- 頁の原稿 `docs/download/index.html` —— 同じ作業木で別の席が既に直した（5 節の継ぎ目）。本書は 1 字も変えない。
- 試験: 仕様だけを読む体が、頁の原稿を 6 節の新しい項に照らす試験（リンクが `S-459` の値を指す・新しいタブで開く・何も落とさない）を書くかは調整役が決める。

---

## 10. ⛔ この変更でやらないこと

- `S-350`・`S-459` の値（所）を変えない。所を `design-mcp-relay.md` にも `S-350` の注にも書き写さない。
- `FR-073`・`FR-036`・`FR-051`（`BR-4`）・`FR-069`・辞書の語を変えない —— どれも頁の中のリンクを読まない（6 節）。
- 頁の冒頭の文案（`JDG-1589`）を仕様に書かない（X-4）。
- 6 節の末の段「利用者はほかの説明書・README・リポジトリの頁を開かず、頁の案内に従うだけで使い始められる」を変えない —— 案内のリンクがあっても、手順はリポジトリの頁を開かずに済む。
- 頁の原稿を直さない（9 節）。

---

## 11. 利用者に問うこと

無い。

---

## 12. 台帳

| 行 | 本書での扱い |
|---|---|
| `JDG-1590` | 「指示 —— `CR-696` が当てる」→「適用済 —— 本書が当てた」（E-05） |
| `JDG-426` | `JDG-1590` が一部覆した印は既に付いている。本書は書き換えない |
| 欠陥・保留の行 | 起こさない |

---

## 13. 測り方の再現

```
# the tree: 7bb3d432 plus the uncommitted page and rulings rows of the same worktree
git rev-parse --short HEAD                                   # -> 7bb3d432

# the number is unused except by the rulings that name it (measured 2026-10-07, 7bb3d432)
git grep -l "CR-696"                                         # -> docs/development-records/rulings.md only

# each old text occurs once (E-01, E-02, E-03)
python -c "import io;s=io.open('docs/spec/_source/settings.json',encoding='utf-8').read();print(s.count('⚠️ リポジトリの頁を案内先にしない —— 利用者が、その画面は難しいとした。'),s.count('所が変わったときに直す場所を本行の 1 か所に限る。'))"   # -> 1 1
python -c "import io;s=io.open('docs/spec/_assets/design-mcp-relay.md',encoding='utf-8').read();print(s.count('で落としたものを確かめる手。'))"   # -> 1

# the last changelog row before this one (E-04)
tail -1 docs/development-records/changelog.md | cut -c1-8   # -> | 3.87 |

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-350
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-459
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py S-350 S-459 FR-073 FR-036 FR-051 FR-069
grep -rln "案内先にしない\|写して持たない\|入手の案内先" tests src tools   # -> 0 files
```
