# CR-620 — MCP の取次は 1 つの束で配ってヘルプから案内し、`Origin: null` と違う `Host` を断る

> 起草の状態: 起草（2026-10-01、枝 `mcp-no-install-study`）。まだ当てていない。2026-10-01 の同じ日に、利用者の続きの答え（`JDG-1026` 〜 `JDG-1028` ・ `JDG-1050` ・ `JDG-1051`）で、ヘルプの案内（E-04 ・ J-01 〜 J-04）を足した。
> 読んだ木: `refactor` `e724925d`。E-01 〜 E-03 の旧は、`CR-613` の E-01（新しいファイル `docs/spec/_assets/design-mcp-relay.md` の全文）の中にある —— いまの木に `design-mcp-relay.md` は無い。E-04 と J-01 〜 J-04 の旧は、いまの木にある（13 節）。
> ID の帯: 調整役から `CR-620` を受けた。仕様の新しい行 ID は取らない。台帳は `JDG-1010` 〜 `JDG-1014` ・ `JDG-1026` 〜 `JDG-1028` ・ `JDG-1050` ・ `JDG-1051` を使った（12 節）。
> ⛔ 当てる順: **`CR-613` の後**（E-01 〜 E-03 の旧は `CR-613` の E-01 の新である）。`CR-614` とは触る所が別（2 章）なので、`CR-614` との順は問わない。E-04 と J-01 〜 J-04 は `CR-613` に依らない。
> **閉じるもの**: `JDG-1010` の検討（何も入れていない人へ取次を渡す道）のうち、仕様に書く部分。調べの本体は docs/review/mcp-relay-no-install-2026-10-01.md。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-1010` | 「今AI連携ってどこまでできてる？  何もインスコしてない人にバッチファイを配布する検討を別セッションでやりたいので、提案チップを出せ」 | 何も入れていない人へ取次を渡す道を調べ、1 つ提案する | 調べは docs/review/mcp-relay-no-install-2026-10-01.md |
| `JDG-1011` | 「よい (推奨)」 | 渡す相手は AI のアプリとブラウザだけを入れた人 | E-01 の「束を入れる人は Node も何も入れなくてよい」 |
| `JDG-1012` | 「署名はあとでいいけど、どうやって署名を取るの？ 有料？」 | バッチファイルは配らず 1 つの束（`.mcpb`）で配る。署名は後 | E-01 |
| `JDG-1013` | 「両方足す (推奨)」 | 守りに `Origin: null` を断る文と `Host` を照らす文を足す | E-02 ・ E-03 |
| `JDG-1014` | 「下書きする・試作は後 (推奨)」 | 本書を下書きする。`AG-12` は変えない。試作は作らない | 本書 |
| `JDG-1026` | 「.mcpb の署名って GitHubのGoodRelaxの署名ってことでGitHubで何とかやってくれないの＿」「GRSで grs-relay.mcpb  を作成して保存できないかな？ 署名もつけて。」「ふーん。  じゃ、GRSがGitHubにアクセスしてダウンロードするってできる？ いや、そのリンクを張るだけでもいい。」 | 束は組み立てで作る（GRS の中では作らない）。GRS は取得せず、リンクを張る | E-01 の「`S-350` の頁に置く」、E-04 |
| `JDG-1027` | 「よい (推奨)」 | 束は `S-350` の頁に置き、GRS はその頁へリンクする。設定値の行は足さない | E-01 ・ E-04 ・ J-04 |
| `JDG-1028` | 「ヘルプの AI 連携の説明 (推奨)」 | リンクはヘルプに出す（前提の誤りを `JDG-1050` ・ `JDG-1051` で正した） | E-04 |
| `JDG-1050` | 「凡例の段に 1 行 (推奨)」 | （前提の誤り —— 凡例は題の行の中にある）⇒ 問い直した | — |
| `JDG-1051` | 「推奨通り。 アイコンの説明に(備考 ※1を参照)と書け。  また、AIアイコンのツールチップに、   ... (Helpに記載の .mcpd が必要) とアフォーダンスしろ」 | ① 題の行の規則は覆さず、本文の末に備考 ※1 を置く ② `IC-20` の項目に「(備考 ※1を参照)」を添える ③ `IC-20` のツールチップに束が要ることを足す（「.mcpd」は `.mcpb` の打ち違いと読む） | E-04 ・ J-01 ・ J-02 ・ J-03 |
| `JDG-503` | （`rulings.md` の `JDG-503`、`PND-603`） | 取次は 1 つのファイルで配る形を本筋に、同じ中身を `node` で動かす形も配る | ⛔ 決め直さない。E-01 は前者の形に名を与えるだけ |
| `JDG-426` | （`rulings.md` の `JDG-426`） | 最新版を入手する所は https://goodrelax.github.io/gr-scheduler/download。頁は利用者が後で用意する | ⛔ 決め直さない。J-04 はその頁に束も置くと足すだけ |

### 0.2 調べた結果（`e724925d`）

1. **`AG-12` の ① は、既に何も入れていない人の道を求めている** —— 「AI のアプリが MCP の相手として 1 つのファイルで入れる形」「実行の土台は…AI のアプリが持ち」。足りないのは、その形が何であるかの名だけである。
2. **その形は MCP の束（`.mcpb`）である。** 束は手元の MCP サーバーと `manifest.json` を入れた zip で、stdio で動く。AI のアプリの 1 つは Node を同梱し、束はダブルクリックで入る（review の 10 節の [C1] [C2]）。
3. **バッチファイル ・ PowerShell ・ 実行ファイルでは配れない。** インターネットから落とした署名の無いファイルを OS の保護が止め、既定の設定の機械ほど止まる（review の 3.1 節）。PowerShell で書けば取次が 2 つになり、`AG-12` の ① の「同じ中身」と `CR-613` の決定 1 に反する。
4. **file:// のページは `Origin: null` を名乗る**（review の 10 節の [B1]）。`AG-12` の ⑦ の「取次が配ったページの origin だけを受け」は `null` を断るが、文に書いていないので実装で見落としやすい。
5. **DNS の張り替え**（悪意の名前を `127.0.0.1` へ向ける）で、ページを配る道（`GET /`）は読まれうる。中身は公開の html で鍵を含まないので実害は無いが、`Host` を照らせば 1 行で断てる。MCP の仕様も origin を検めることを MUST とし、張り替えを名指す（review の 10 節の [M2]）。
6. **GRS は取得できないが、リンクは張れる。** 表 T-003 の `CN-6` は「外部から取得する資源を持たない」とし、注で「人が押したリンクで、閲覧環境が別の頁を新しいタブに開くこと」は通信に当たらないとする（`01-04-requirements.md:197`）。`FR-073` は既に `S-350` を押せるリンクとして示している（`:6598` 〜 `:6603`）⇒ 同じ所・同じ示し方を使い回す。
7. **`S-350` の頁はまだ無い**（`S-350` の備考「頁はまだ無い —— 利用者が後で用意する」、`.github/workflows/pages.yml` に download の頁は無い）。頁は開くと `GRS.html` を落とさせる（`S-350` の備考）⇒ 束は同じ頁にリンクで置く。
8. **ヘルプには説明の文の欄が無く、題の行には何も足せない。** ヘルプは 表 T-109 の入口とキーの一覧で（`FR-036`、表 T-040 の `EZ-3`「ヘルプ 1 画面はマニュアルではない」）、凡例は題の行の右寄せにあり、`FR-036` は「題の行に、ほかのものを置いてはならない（MUST NOT）」とする（`:7524` 〜 `:7527`）⇒ 備考は本文の末に置く（`JDG-1051` ①）。
9. **項目に語を添える前例がある。** `FR-036` の「`IC-54` の項目には、構えているあいだだけ画面に在ることを添えること（MUST） —— 添える語は `FR-038` の辞書が `IC-54` の行で持つ」（`:7523`）、辞書の `helpNotes` の `IC-54` の行 ⇒ `IC-20` も同じ持ち方にする（J-02）。
10. `impact.py FR-150 AG-12`: `FR-150` は 表 T-035 ・ 表 T-107 ・ `AG-12` ・ `IC-20` を指し、`FR-111`（`:1843`）・ `FR-064`（`:6957`）・ 5.3（`05-07-design.md:575`）から指される。`AG-12` は `FR-150`（`:6999`）から指される。本書はどれの文も変えない。
11. `impact.py FR-036 S-350 IC-20`: `FR-036` は 7 要求 ・ 27 か所から指される —— どれも一覧の中身（入口 ・ 割当 ・ 題の行）を読み、本文の末の備考を読むものは無い。`S-350` は `FR-073` の 3 か所だけから指される。`IC-20` は `FR-064` ・ `FR-150` ・ `FR-066` と状態機械の `Agent API` の出来事から指される —— どれもツールチップの語を読まない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-1` ／ `GL-004`** —— 構造化した日程データを AI に渡す道を、何も入れていない人にも開く（`FR-150` の RATIONALE と同じ位置）。
- ⭐ **`GL-006`** —— 束が要ることを、入口のツールチップとヘルプの 2 か所が示す（`JDG-1051` の「アフォーダンスしろ」）。
- `GL-005`（1 つのファイルだけで動く）は動かさない —— 取次を使わない人は今までどおり単一 `.html` を開くだけである。GRS は何も取得しない（`CN-6`）。

### ② レビュー観点のどの条項を当て、何が出たか

| 条項 | 当てたもの | 出たこと |
|---|---|---|
| `R1.3`（矛盾 ・ 唯一の正） | E-01 と `AG-12` の ①、E-04 と `FR-036` の題の行 | E-01 は ① の 2 つの形に名を与えるだけで、① の文を写さない。E-04 は題の行に何も足さない |
| `R2.21`（1 つの仕事は 1 か所） | 配らない形、入手する所 | PowerShell の取次を足さない（`CR-613` の決定 1）。所は `S-350` の 1 か所で、ヘルプも `{downloadUrl}` へ差し込む（`FR-073` と同じ） |
| `R2.9`（YAGNI） | 署名、設定値の行 | 署名は当面持たない（`JDG-1012`）。設定値の行を足さない（`JDG-1027`） |
| `R2.1`（命名） | ファイル名 `grs-relay.mcpb` ・ `grs-relay.mjs`、辞書の鍵 `helpFootnotes` | 何を運ぶかと形を言う。辞書の鍵は、既にある `helpNotes`（項目に添える語）と並ぶ「ヘルプの備考」 |

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 製品名を仕様に入れない。形の名（`.mcpb`）は入れる | 形の名は開かれた形式の名であり、`MSPDI` と同じ扱い。製品名は `AG-12` の「AI のアプリ」のまま | 読む人は、どのアプリが束を入れるかを review で読む |
| 決定 2 | `Host` の照合は、ページを配る道と WebSocket の両方に当てる | 張り替えの読みは `GET /` で起きる（0.2 節の 5） | — |
| 決定 3 | 束のファイル名を設計書に書く | 利用者の手順（review の 7 節）とアプリの利用者向けの文書が同じ名を使う | 名を変えるときは設計書も変える |
| 決定 4 | ツールチップの語は「AI のアプリから使うときは」を頭に置く | ページの中の `Agent API`（`FR-065`）は束なしで動く。逐語の「(Helpに記載の .mcpd が必要)」だけでは、いつも要るように読める | 逐語より語が長い。利用者が短い方を選べば J-01 の新を逐語の形に戻す |
| 決定 5 | 備考の辞書の鍵を新しく `helpFootnotes` とし、行 ID を振らない | 備考は 表 T-109 の行でも入口でもない。行 ID を振ると接頭辞が 1 つ増える（`HF-` は既に別の意味で使われている） | 語の生成（`tools/generate_display_words.py`）に鍵を 1 つ教える（9 節） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 配り方 | `_assets/design-mcp-relay.md` の 6 節（`CR-613` の E-01 が作る） | E-01 |
| 守り | 同書の 7 節 | E-02 ・ E-03 |
| ヘルプの備考と `IC-20` の項目 | `01-04-requirements.md` の `FR-036`（`:7523` の後ろ） | E-04 |
| `IC-20` のツールチップの語 | `_source/display-words.json` の `IC-20` の `hint` | J-01 |
| `IC-20` の項目に添える語 | 同 `helpNotes` | J-02 |
| 備考 ※1 の語 | 同 新しい鍵 `helpFootnotes` | J-03 |
| 入手する所の頁に束も置く | `_source/settings.json` の `S-350` の `note`（表 T-206 は `npm run gen` で刷る） | J-04 |
| `AG-12` ・ `FR-150` ・ `FR-073` ・ 2 章 | 変えない | — |

**数**: 文の編集 4（E-01 〜 E-04）。原稿 JSON の編集 4（J-01 〜 J-04）。`（MUST）` の印は 2 増える（E-04）。`（MUST NOT）` は 0 増える。

## 2. 新しい識別子

行 ID ・ 表 ・ 図 ・ 設定値の行 ・ 出来事のどれも足さない。辞書の鍵 `helpFootnotes` を 1 つ足す（決定 5）。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

仕様から消す文は無い。E-01 〜 E-04 と J-02 〜 J-04 は、旧をそのまま残して後ろに足す。
J-01 だけは語を書き換える —— `IC-20` の `hint` の ja ・ en の 2 行（旧の文は新の頭にそのまま残り、後ろに括弧書きが付く）。

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（E-01 〜 E-03 は `CR-613` の E-01 の新の中で、E-04 と J-01 〜 J-04 は `e724925d` で、7 件とも 1 回。13 節）。`01-04-requirements.md` ・ `display-words.json` ・ `settings.json` は `e724925d` で 3 つとも LF（CRLF は 0）。
⚠️ 行末の半角空白 2 つ（`  `）は新の一部である —— 新の塊の、次の行へ続く行の末に付く（E-01 は 1 〜 7 行目、E-02 は 2 行目、E-03 は 1 行目、E-04 は 1 〜 4 行目）。E-04 の旧（`:7523`）は行末に空白 2 つを持つ。E-01 〜 E-03 の旧は持たない。
⚠️ J-01 〜 J-04 を当てたら `json.loads` で読めることを確かめ、`npm run gen` で 表 T-206 を刷る（生成物を手で直さない）。J-04 の旧は `note` の 1 行の中の句である（`partial`）。

<!-- EDIT id=E-01 file=docs/spec/_assets/design-mcp-relay.md -->
6 節「配り方」の末（最後の行）に、形の名 ・ 中身 ・ 置き場所 ・ 配らない形 ・ 署名を足す。 旧
```text
取次を使わない人の `GRS` は、今までどおり単一 `.html` を開くだけで動く（`FR-150`）。
```
新
```text
取次を使わない人の `GRS` は、今までどおり単一 `.html` を開くだけで動く（`FR-150`）。  
⭐ 前者の形は MCP の束（`grs-relay.mcpb`）とする —— `manifest.json` と、取次を 1 つに束ねた JavaScript と、同じ版の単一 `.html` を入れた zip であり、`manifest.json` の実行の土台は `node` とする。  
束を入れる人は Node も何も入れなくてよい —— 実行の土台は AI のアプリが持つ（`AG-12` の ①）。  
後者の形は、同じ JavaScript のファイル 1 つ（`grs-relay.mjs`）である。  
どちらも公開する単一 `.html` と同じ組み立てで作り、最新版を入手する所（`_assets/tbl-settings.md` の 表 T-206 の `S-350`）の頁に置く —— `GRS` はその頁を、ヘルプの備考と `IC-20` のツールチップで案内するだけで、自分では取得しない（`FR-036`、表 T-003 の `CN-6`）。  
⛔ バッチファイル・シェルのスクリプト・実行ファイルでは配らない —— インターネットから落とした署名の無いこれらを OS の保護が止め、止まらない機械でも利用者に警告を越えさせる。  
取次を別の言語でもう 1 つ書くことにもなり、`AG-12` の ① の「同じ中身」を破る。  
束に署名は付けない —— 付けるときは束の形式の署名であり、OS の保護には関係しない。
```

<!-- EDIT id=E-02 file=docs/spec/_assets/design-mcp-relay.md -->
7 節「守り」の 1 つ目の項の後ろに、`Host` の照合を 1 項足す。 旧
```text
- 待ち受けるのは `127.0.0.1` だけであり、ほかの機器からは繋げない（`AG-12` の ①）。
```
新
```text
- 待ち受けるのは `127.0.0.1` だけであり、ほかの機器からは繋げない（`AG-12` の ①）。
- `Host` が `127.0.0.1:<口>` でない要求は、ページを配る道でも WebSocket でも断る。  
  別の名前を `127.0.0.1` へ向ける手（DNS の張り替え）で、別の origin のページに取次を読ませないためである。
```

<!-- EDIT id=E-03 file=docs/spec/_assets/design-mcp-relay.md -->
7 節「守り」の 2 つ目の項の末に、`Origin: null` を断ることを足す。 旧
```text
  origin を照らすので、別の名前を `127.0.0.1` へ向けたページからも繋げない。
```
新
```text
  origin を照らすので、別の名前を `127.0.0.1` へ向けたページからも繋げない。  
  ⛔ `Origin` が `null` の接続も断る —— 手元のファイルで開いたページやサンドボックスの枠は、どれも `null` を名乗るので、受ければどのページからでも繋げてしまう。
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`FR-036` の `IC-54` の文（`:7523`）の後ろに、本文の末の備考と `IC-20` の項目に添える語を足す。 旧
```text
⭐ `IC-54` の項目には、構えているあいだだけ画面に在ることを添えること（MUST） —— 添える語は `FR-038` の辞書が `IC-54` の行で持つ。  
```
新
```text
⭐ `IC-54` の項目には、構えているあいだだけ画面に在ることを添えること（MUST） —— 添える語は `FR-038` の辞書が `IC-54` の行で持つ。  
⭐ ヘルプの本文の末（段の下）に備考 ※1 を置き、AI のアプリから `Agent API` を使うための束（`FR-150`）と最新版を入手する所を示すこと（MUST） —— 語は `FR-038` の辞書が持ち、所は語の `{downloadUrl}` の場所へ `_assets/tbl-settings.md` の 表 T-206 の `S-350` を差し込み、`FR-073` と同じ押せるリンクとして示す。  
備考は段の外に置き、段の数と項目の数（`S-202`）に入れない。  
⚠️ 備考を題の行に置かないのは、題の行に置けるものが下の並びだけだからである。  
`IC-20` の項目には、備考 ※1 を参照することを添えること（MUST） —— 添える語は `FR-038` の辞書が `IC-20` の行で持つ。  
```

<!-- EDIT id=J-01 file=docs/spec/_source/display-words.json -->
`IC-20` の `hint`（ツールチップの語）の ja ・ en の 2 行。束が要ることを足す（`JDG-1051` ③、決定 4）。 旧
```text
    "ja": "Agent API を有効にする。もう一度押すと無効にする",
    "en": "Enable the Agent API; press again to disable it"
```
新
```text
    "ja": "Agent API を有効にする。もう一度押すと無効にする (AI のアプリから使うときは、ヘルプに記載の .mcpb が必要)",
    "en": "Enable the Agent API; press again to disable it (to use it from an AI app, get the .mcpb named in Help)"
```

<!-- EDIT id=J-02 file=docs/spec/_source/display-words.json -->
`helpNotes` に `IC-20` の行を足す（`JDG-1051` ②）。 旧
```text
    "ja": "構えている間だけ出る",
    "en": "Shown only while armed"
   }
  }
 ],
```
新
```text
    "ja": "構えている間だけ出る",
    "en": "Shown only while armed"
   }
  },
  {
   "rowId": "IC-20",
   "text": {
    "ja": "(備考 ※1を参照)",
    "en": "(see note *1)"
   }
  }
 ],
```

<!-- EDIT id=J-03 file=docs/spec/_source/display-words.json -->
`browserFunctions` の前に、新しい鍵 `helpFootnotes` を足す（E-04、決定 5）。 旧
```text
 "browserFunctions": [
```
新
```text
 "helpFootnotes": [
  {
   "footnote": 1,
   "text": {
    "ja": "※1 AI のアプリから Agent API を使うための束（.mcpb）と最新版は、{downloadUrl} から入手する",
    "en": "*1 Get the bundle (.mcpb) for using the Agent API from an AI app, and the latest version, from {downloadUrl}"
   }
  }
 ],
 "browserFunctions": [
```

<!-- EDIT id=J-04 file=docs/spec/_source/settings.json partial -->
`S-350` の `note` の中。頁に束も置くことと、ヘルプも本行を差し込むことを足す。 旧
```text
⚠️ 頁はまだ無い —— 利用者が後で用意する。
```
新
```text
⚠️ 頁はまだ無い —— 利用者が後で用意する。⭐ この頁には、AI のアプリが入れる MCP の束（`grs-relay.mcpb`、`FR-150`）もリンクで置く（利用者の指示）。⭐ ヘルプの備考 ※1（`FR-036`）も、語の `{downloadUrl}` の場所へ本行を差し込む。
```

当てた後に打つもの: `npm run gen`（表 T-206 を刷る）→ `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `npm run gen:check`。

## 5. 継ぎ目 —— 仕様だけを読む試験の体に渡す

`CR-613` の 5 節の SEAM-3 に次を足し、ヘルプの継ぎ目を 1 つ足す（同じ試験の体が読む）:

```
SEAM-3 additions (CR-620)
- a WebSocket whose Origin header is "null": closed, as for any other origin.
- an HTTP request or a WebSocket whose Host header is not 127.0.0.1:<port>: refused (403), GET / included.
- the build emits grs-relay.mcpb (a zip: manifest.json with server type node, the bundled relay JS,
  the same single .html bytes) and grs-relay.mjs (the same relay JS) for the page S-350 names.

SEAM-4 (help, FR-036 / FR-038 -- CR-620)
- the help body ends, below the columns, with note *1: the dictionary's helpFootnotes text with S-350
  put in place of {downloadUrl}, shown as a link that opens a new tab without opener or referrer (FR-073).
- the note is not an item: the item count S-202 is unchanged; nothing is added to the title row.
- the IC-20 item carries the helpNotes text of IC-20; the IC-20 tooltip is the hint of IC-20.
- the page fetches nothing (CN-6): opening the help makes no network request.
```

## 6. グラフ（`e724925d`）

| 対象 | 届く先 | 読んだ結果 |
|---|---|---|
| `FR-150` | 指す: 表 T-035 ・ 表 T-107、行 `AG-12` ・ `IC-20`。指される: 要求 2 件 / 参照 3 か所（`FR-111:1843` ・ `FR-064:6957` ・ 5.3 `:575`） | 本書は文を変えない |
| `AG-12` | 指される: 要求 1 件 / 参照 1 か所（`FR-150:6999`） | 変えない。E-01 ・ E-03 は ① ・ ⑦ を指すだけ |
| `FR-036` | 指す: 表 18 ・ 行 53。指される: 要求 7 件 / 参照 27 か所 | E-04 は文を足すだけ。指す先に `FR-150` ・ `FR-073` ・ `S-350` ・ `IC-20` が増える |
| `S-350` | 指される: 要求 1 件（`FR-073`）/ 参照 3 か所 | J-04 の後は `FR-036` からも指される |
| `IC-20` | 指される: 要求 3 件（`FR-064` ・ `FR-150` ・ `FR-066`）/ 参照 4 か所 | どれもツールチップの語を読まない |

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

`design-mcp-relay.md` の行が 10 増える（E-01 で 7、E-02 で 2、E-03 で 1）。`01-04-requirements.md` の行が 4 増える（E-04）。`（MUST）` は 2 増え、`（MUST NOT）` は 0 増える。表の行 ・ 図 ・ 行 ID は 0 増える。辞書の鍵は 1 増える（`helpFootnotes`）、`helpNotes` の行は 1 → 2。

## 8. 波 —— 持ち場で割る

仕様を 1 度に当てる回で、`CR-613` の直後に同じ体が当てる（E-04 と J-01 〜 J-04 は `CR-613` の前でも当てられるが、1 本の変更要求なので一緒に当てる）。コードは取次の実装の波（`CR-613` の 8 節）で、SEAM-3 の追加と SEAM-4 と一緒に書く。

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

- 組み立て: `npm run build` の後に束と `grs-relay.mjs` を作る段（名は実装の波が決める）と、Pages の Actions に 2 つのファイルと `S-350` の頁を載せる行（`pages-deploy` の手順）。⚠️ `S-350` の頁の中身（開くと `GRS.html` を落とさせる、束へのリンク）は利用者が用意する（`JDG-426`）。
- 語の生成: `tools/generate_display_words.py` の `HELP_NOTES` に `IC-20` を足し、新しい鍵 `helpFootnotes`（`footnote`, `text`）を教える。
- アプリの利用者向けの文書: 利用者の手順（review の 7 節）。
- 実装の波で確かめること: review の 9 節の未確認（AI のアプリが署名の無い束に何を示すか、など）。

## 10. ⛔ この変更でやらないこと

- `AG-12` ・ `FR-150` ・ `FR-073` ・ 2 章を変えない。`FR-036` の題の行の規則を変えない。
- 取次のコード ・ 試作を書かない（`JDG-1014`）。
- 束に署名を付けない（`JDG-1012`）。GRS の中で束を作らない（`JDG-1026` の読み）。
- 設定値の行を足さない（`JDG-1027`）。

## 11. 前に立つ者へ返す問い

| 問い | 案と代償 | 推奨 ／ 答え |
|---|---|---|
| 問い 1 —— Actions で、束と単一 `.html` に出自の証明（GitHub の artifact attestation）と SHA-256 を付けるか | **A** 付ける —— どのリポジトリのどのワークフローがどのコミットから作ったかを、開発者が `gh attestation verify` で確かめられる。無料 ・ 数行。代償: 利用者（ファイルを落とすだけ）には見えず、AI のアプリも OS も見ない ／ **B** 付けない | **A**（仕様は変わらない。9 節の組み立てに 1 行）。⚠️ 2026-10-01 に利用者へ示したが、答えは無い（`JDG-1026` の読み）—— 調整役が問う |

## 12. 台帳

- `JDG-1010`: 「指示 —— 調整役が投入時期を決める」（依頼のとおり）。
- `JDG-1011` 〜 `JDG-1014` ・ `JDG-1026` 〜 `JDG-1028` ・ `JDG-1050` ・ `JDG-1051`: 「指示 —— `CR-620` が当てる」。本書が当たったら「適用済」へ。
- 欠陥 ・ 保留の行は起こさない（`DFC-1601` 〜 `DFC-1605`、`PND-619` は使わなかった）。

## 13. 測り方の再現

```
# the tree: refactor e724925d (branch mcp-no-install-study)
git log --oneline -1 e724925d                            # -> e724925d Record JDG-1006, JDG-1007 ...

# the design document does not exist yet (CR-613 creates it)
ls docs/spec/_assets/design-mcp-relay.md                 # -> No such file

# E-01..E-03: each old block occurs once inside CR-613's E-01 new text (lines 151-311 of CR-613)
sed -n '151,311p' change-request/CR-613-the-local-mcp-relay-has-a-design-document.md > e01.md
grep -c "今までどおり単一" e01.md                            # -> 1  (E-01)
grep -c "ほかの機器からは繋げない" e01.md                    # -> 1  (E-02)
grep -c "へ向けたページからも繋げない" e01.md                # -> 1  (E-03)

# E-04, J-01..J-04: each old block occurs once in the tree
grep -c "の辞書が \`IC-54\` の行で持つ。" docs/spec/01-04-requirements.md          # -> 1  (E-04, :7523)
grep -c "もう一度押すと無効にする\"," docs/spec/_source/display-words.json        # -> 1  (J-01)
grep -c "Shown only while armed" docs/spec/_source/display-words.json            # -> 1  (J-02)
grep -c '"browserFunctions"' docs/spec/_source/display-words.json                # -> 1  (J-03)
grep -c "頁はまだ無い —— 利用者が後で用意する。" docs/spec/_source/settings.json   # -> 1  (J-04)

# the rules read
sed -n '197p' docs/spec/01-04-requirements.md                                   # CN-6 and its note on links
sed -n '6598,6603p;7523,7527p' docs/spec/01-04-requirements.md                  # FR-073 link, FR-036 title row

# impact
python .claude/skills/spec-graph-check/impact.py FR-150 AG-12
python .claude/skills/spec-graph-check/impact.py FR-036 S-350 IC-20
```
