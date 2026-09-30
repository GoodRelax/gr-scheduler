# CR-613 — MCP のローカルの取次に、AI が読める短い設計書と構成図を持たせる

> 起草の状態: 起草（2026-10-01、枝 `b3-export-shell-crs`）。まだ当てていない。4 節の旧 22 件（E-02 〜 E-20 と E-13b、J-01 ・ J-02）は、読んだ木で各 1 回だった（13 節）。新しいファイル 1 つ（E-01）と図の 3 ファイルは、`previous-project-result/26-export-shell-crs/mcp-relay/` に下書きがある。11 節の 3 つの問いは 2026-10-01 に答えを得た（`JDG-974`、3 つとも推奨）—— 問い 1 は E-20 の `connect-src 'self'`、問い 3 は決定 6（口の番号は OS が選ぶ）のとおりであり、問い 2 の 2 章は別の変更要求が書く（`DFC-1428`、番号は調整役が振る）。
> 読んだ木: `refactor` `0590ad03`（枝 `b3-export-shell-crs` の切り口）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-613` を受けた。台帳の番号（`DFC-` ・ `JDG-` ・ `PND-`）は取らない（12 節）。
> 当てる順: 持ち場 L4 が合流した後の、仕様を 1 度に当てる回（8 節）。兄弟の `CR-610` ・ `CR-611` は、読んだ時点（同じ日）で本書の旧に触れない（`CR-611` は `05-07-design.md` の `RD-7` を書くが別の塊）。`CR-612` はまだ読めなかった。⚠️ E-18 の旧は `FR-095` も並べている —— 兄弟が `FR-095` に起点のユニットを与えるなら同じ塊を書くので、そちらを先に当て、本書は当てる木で旧を数え直す。E-07 ・ E-08（コンポーネントとユニットの全数）も、兄弟がユニットを足せば数が動く。後から当てる側が数え直す。
> **閉じるもの**: `DFC-1336`（MCP のローカルサーバーが無い —— のうち、仕様書と構成図の半分）・`JDG-866`。実装は後の波である（8 節・9 節）。`DFC-1428`（2 章が取次を知らない）は本書では閉じない —— 問い 2 の答えにより別の変更要求が閉じる。問いは 2026-10-01 に答えを得た（`JDG-974`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-866` | 「#17  MCPのローカルサーバーを実装しろ。<br>まずはAIが容易に意味を把握し使える程度の簡単な仕様書を書け。<br>仕様書には構成図を入れろ。<br>ローカルサーバーの仕様書は下記において、spec本文から参照可能とせよ。<br>docs\spec\_assets<br>仕様書は簡単でよいが、SSOT, 名称, CA, I/Fなど<br>07-review-standards.md<br>に定義するSW品質は確保しろ。」 | 短い設計書を `docs/spec/_assets` に置き、本文から引く。構成図を入れる。唯一の正・名・層・継ぎ目の品質を 07 の `R2` で保つ。実装はその後 | E-01（`_assets/design-mcp-relay.md`、図 F-045）・E-02（`FR-150` から引く）。品質は ② |
| `JDG-500` ・ `JDG-503` | （`rulings.md:682` ・ `:685`。逐語は `CR-563` の 0.1 と 11 節） | 文書の唯一の正はページ。取次は `127.0.0.1` でページを配り、同じ origin で繋ぐ。1 つのファイルで配り、同じ中身をコマンド行の JavaScript の実行環境でも動かす。読み取り専用の行の 4 つの細部 | ⛔ 決め直さない。設計書は `AG-12` ・ `FR-150` ・ 表 T-275 を指すだけ |
| `JDG-974` | 「問 7. 出荷する見本の大きさ →一旦保留。 落ち着いたらシンプル化する。 後でやる旨記録しておけ。<br><br>それ以外は、全部推奨で」（2026-10-01。枝 `b3-export-shell-crs` の起草のセッションがまとめて問うた問 1 〜 11 への 1 つの答えのうち、本書の問い 1 〜 3 に当たる「それ以外は、全部推奨で」の部分） | 本書の 3 つの問いは推奨: ① ページの CSP に `connect-src 'self'` を足す ② 第 2 章（表 T-007 ・ 表 T-008 の `CHN-5` ・ `CN-1` ・ `CN-6` ・ `XO-1`）が取次を知らない件は別の変更要求にする（番号は調整役から受ける）③ 取次の待ち受けの口の番号は OS に選ばせる | ① は E-20 の `PO-7`、③ は決定 6。② は本書では 2 章に触れず、台帳の `DFC-1428` が別の変更要求を待つ。11 節に答えを記した |

既に書いてある振る舞い（`0590ad03`）: 表 T-035 の `AG-12`（① 〜 ⑦ と結び）・`FR-150`（取次を配る要求と RATIONALE）・`FR-064` ・ `FR-065` ・ 表 T-109 の `IC-20` ・ 表 T-107（`Agent API` のメンバ）・ 表 T-275 の `GP-1` ・ `GP-7`。台帳の `PND-602` 〜 `PND-604` はどれも `裁定済`。

### 0.2 調べた結果（`0590ad03`）

1. **設計の側に取次が 1 行も無い。** `05-07-design.md` と `_assets/*.md` を「MCP」「取次」で引いて 0 件。`FR-150` は 5.3 の結びで「仕様が起点のユニットを決めていない」16 件の 1 つ（`:575`）。`CR-563` の 8 節が「波 ② の頭で設計の変更要求を書き、`FR-150` の起点のユニットを決める」と言い残した —— 本書がそれである。
2. **⛔ いまのページは取次へ繋げない。** 表 T-232 の `PO-1` が `default-src 'none'` で、`connect-src` の行が無い（`05-07-design.md:1424` 〜 `:1429`、組み立ては `vite.config.ts:140` 〜 `:149`）。WebSocket は `connect-src` に従い、無ければ `default-src` に落ちる ⇒ `AG-12` の ① は、方針を 1 行足さない限り成り立たない。`CR-563` の 8 節が「CSP が WebSocket を通すかもそこで決める」と置いていった問い → E-20（11 節の問い 1 の答え A、`JDG-974`）。
3. **取次の側のコンポーネントを `src/` に置けば、「取次はドメインを持たない」を検査が見張れる。** 表 T-247 の `EG-5` と検査 59（`check-component-edges.py`）は、`components.json` の `edges` に無い辺をコードに作ることを禁じる。取次の 2 つのコンポーネントの辺を「互いに 1 本」「`AgentApiEndpoint` の型だけを読む 1 本」に限れば、`UseCase` ・ `Entity` へ届く import は赤になる。別の包み（`CR-434` の 0 節 ③ の 1 案）にすると、この見張りも 表 T-061 の検査 19 も効かない → 決定 1。
4. **ページの側は継ぎ目を足さずに済む。** `SingleHtmlShell`（`Framework`）は既に `Agent API` を公開点に置いている（`single-html-shell.ts:536` 〜 `:547`、`installAgentApi` → `globalThis`）。WebSocket で届いた呼び出しを `Adapter` の関数へ渡すのは内向きの呼び出しであり（`LR-1`）、`Adapter` が外を呼ぶことは無いので、表 T-065 の層をまたぐインターフェースは要らない（`R2.9`）→ 決定 2。
5. **`watchChanges` の形は、ページでは受け手の関数である**（`agent-api-members.ts:150` 〜 `:151` の `watchChanges(receive)`）。`AG-12` の ⑤ は「待つ道具」を求める ⇒ 受け手を運ぶことはできず、どこかが待たねばならない → 決定 4。
6. **ページが無いときの拒否は、`AG-9a` の「現在の刻印」を持てない。** 拒否の値の型 `AgentRefusal` は `stamp: DocumentStamp` を必ず持つ（`agent-api-members.ts:51` 〜 `:58`）が、ページの無い取次には刻印が無い → 決定 5。
7. **⚠️ 本書の起こりではない食い違いを 1 つ見つけた。** `01-04-requirements.md` の 2 章は取次を知らない —— 表 T-007 に取次の載る所が無く、表 T-008 の `CHN-5` の方式は「単一 `.html` が公開する関数の呼び出し」だけで、表の後の注は「ネットワークを通る経路は 1 本も無い」と言う。表 T-003 の `CN-1` ・ `CN-6` と 2.4 の `XO-1` も「サーバーを必要としない」「外部へ通信しない」のまま。`FR-150` の RATIONALE は `GL-005` とぶつかることだけを認めている → 11 節の問い 2 の答え A: 別の変更要求が書く（`JDG-974`。台帳 `DFC-1428`、番号は調整役が振る）。
8. **`docs/spec/_assets` の名の付け方と役割の名乗り。** `_assets` の `.md` は `fig-*` と `tbl-*` だけで、どれも頭に `**UID**: DOC-…` と `**Version**` を持つ。生成物は検査 21（`check-provenance.py`）の一覧に載り、手書きの原稿（`tbl-glossary.md`）は「本書が用語の正である」と名乗る。StrictDoc は `_source/**` だけを除いて `docs/spec` の `.md` を全部読む（`strictdoc_config.py` の `exclude_doc_paths`）ので、`spec.sgra` にも設定にも足すものは無い。`_source` のファイルは 1 つずつ「唯一の正」か「生成物」かを頭の 1400 字で名乗る（検査 21 の `source_folder_problems`）→ 決定 11。
9. **図 F- の最大は `F-044`**（`md-checks.py` の数え方で `figures=29`、`F-001` 〜 `F-044` のうち使われているもの）。`change-request/` と台帳に `F-045` を名指す行は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-1` ／ `GL-004`** —— 構造化した日程データを、人と同格の `Agent API` で AI に出す道の、標準の口金の設計である（`FR-150` の RATIONALE と同じ位置）。
- ⚠️ **`GL-005`（1 つのファイルだけで動く）とは、`FR-150` がすでに認めたとおりぶつかる。** 本書はそれを広げない —— 取次を使わない人の成果物は、方針に `connect-src 'self'` が 1 行増えるだけで、繋ぐ先が無いので何も起きない（E-20、11 節の問い 1 の答え A、`JDG-974`）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の `R2`（と `R1.3`）を、足すコンポーネント ・ ユニットと設計書に当てた。

| 条項 | 当てたもの | 出たこと |
|---|---|---|
| `R2.1`（命名） | コンポーネント 2 つ、関数 6 つ、出来事 2 つ、引数 1 つ | `Adapter` は役割＋方式 —— `McpToolTranslator`（方式 `Mcp` ＋ 役割 `ToolTranslator`。既にある `InputCommandTranslator` と同じ形）。`Framework` は技術名の現れる名詞句 —— `McpRelayServer`。`Use Case` は足さない（取次は文書の操作を持たないので、動詞句にする相手が無い）。関数は、状態を変えるものが動詞＋目的語（`answerRelayedCall` ・ `startMcpRelay`）、`pure` のものが名詞句（`mcpToolList` ・ `relayedCallOf` ・ `mcpToolResultOf` ・ `pageNotConnectedResult`）。出来事は過去形（`relayKeyPresented` ・ `changeNoticed`）。単位の固定した量は名に単位（`waitMs`）。⚠️ 依頼が例に挙げたファイル名 `doc-mcp-relay.md` の `doc` は何のファイルかを言わない汎用の語なので、`design-mcp-relay.md`（UID は `DOC-DESIGN` に倣い `DOC-DESIGN-MCP-RELAY`）とした |
| `R2.2a`（責務文の試験） | `CP-40` ・ `CP-41` ・ `UF-185` 〜 `UF-188` の責務の欄 | 下の 0.3 に 5 段の跡を残した。6 つとも PASS |
| `R2.2b`（上位は要約） | `CP-41` | 「呼び出しを、自分が配ったページへ運ぶ」は、ユニット `UF-187` の「stdio で受け、ページへ送り、答えを返す」の要約であって列挙ではない |
| `R2.16`（CA） | 層の割り方 | 写すこと（値 → 値）は `Adapter` の `pure`（`LY-4`）、口 ・ 繋いだページ ・ 待っている呼び出し ・ 溜めた通知は現在値なので `Framework`（`LY-5`）。取次に `UseCase` ・ `Entity` を置かない —— 取次の規則は運び方だけで、文書の規則はページの `Agent API` が `AG-5` で当てる。`LY-5` の「単一 `.html` のシェル」に取次のプロセスが入っていなかった → E-03 |
| `R2.19`（コンポーネント境界） | 取次からページの側への依存 | `McpToolTranslator` が読むのは `AgentApiEndpoint` の公開エントリの型だけ（`AgentApi` ・ `RelayedCall` ・ `RelayedAnswer`）。新しい 2 つのコンポーネントの公開面は 表 T-064 の `PI-40` ・ `PI-41`（J-02）。`PI-17` に `answerRelayedCall` と 2 つの型（J-01） |
| `R2.6`（DIP） ・ `R2.9`（YAGNI） | ページの側の継ぎ目 | `Adapter` が宣言し `Framework` が実装する `RelayChannel` を一度考え、退けた —— `Adapter` の側から外を呼ぶ流れが無い（0.2 節の 4）。宣言だけの型を 1 つ足しても、依存の向きは何も変わらない |
| `R2.21`（1 つの仕事は 1 か所） | 呼び出しと答えの型、道具の名と説明 | 型は `relayed-call.ts` の 1 か所で宣言し、取次は型だけを import する（辺 1 本）。道具の名は `AgentApi` の鍵から取り、コンパイラが 1 対 1 を見張る（9 節）。説明は 表 T-107 の欄から刷る。設計書は 表 T-062 ・ 表 T-075 ・ 表 T-107 ・ `AG-12` を写さずに指す |
| `R2.10`（SoC） | 画像のバイト列 | base64 にするのはページの `Adapter`（`UF-185`）、MCP の画像にするのは取次の `Adapter`（`UF-186`）。`Framework` の 2 つは運ぶだけ |
| `R2.13`（CQS） | `answerRelayedCall` | 状態を変えうるメンバを呼び、答えを返す —— 5.2 の「意図して満たさない」の `ApplyDocumentChange` と同じ事情（答えそのものが `AG-9a` の求める値）。新しい例外ではなく、`AM-7` の形を運ぶだけなので 5.2 に足さない |
| `R2.18`（最小構成） | 表 T-070 | 取次のプロセスは `FR-150` 自身が求めるので、最小構成の側にある。増えたのはコンポーネントの数だけ → `MN-2` の 37 → 39（E-19）。⚠️ ADR-000 の Context の「最小の構成は 1 つのコンポーネントが…」は取次を言わない —— 11 節の問い 2 と同じ族なので、その答えの別の変更要求（`JDG-974`、`DFC-1428`）へ回した |
| `R1.3`（矛盾 ・ 唯一の正） | 表 T-232 ・ 表 T-062 の前文 ・ 2 章 | ① `PO-1` が WebSocket を拒む → E-20。② 「コンポーネントはすべて `DEV-1` に載る」が偽になる → E-04。③ 2 章が取次を知らない（0.2 節の 7）→ 問い 2 の答え: 別の変更要求（`DFC-1428`） |
| `R4`（並行性） | 同時の呼び出し | 呼び出しは JSON-RPC の `id` で答えと結ぶので、いくつ同時に在ってもよい。人のドラッグ中の拒否（`AG-9`）はページが当てる。ページは 1 つだけ（`AG-12` の ③） |

### 0.3 責務文の試験（`R2.2a` の 5 段の跡）

| 行 | 主の句 | 畳んだ句（どれで畳んだか） | 判定 |
|---|---|---|---|
| `CP-40` `McpToolTranslator` | 呼び出しと答えを相互に写す | 「取次のプロセスに載り、ページには載らない」(c) 制約 | PASS |
| `CP-41` `McpRelayServer` | 呼び出しを、自分が配ったページへ運ぶ | 「運ぶために持つ値を保持する」(c) 保持する値。「自分が配った」(c) 制約。「取次のプロセスに載り…」(c) | PASS |
| `UF-185` `relayed-call.ts` | 呼び出しを同じ確定名のメンバへ渡し、答えを運べる値にして返す | 「画像のバイト列は base64 に」(b) 範囲（答えの形の 1 つ）。「購読した変更と発話は送り口へ流す」(b) 範囲（`watchChanges` の答え方）。「型を宣言する」(c) 継ぎ目の宣言 | PASS |
| `UF-186` `mcp-tool-translator.ts` | 道具の一覧 ・ 呼び出し ・ 答えを相互に写す | 「一覧 ・ 呼び出し ・ 答え」(b) 範囲。「ページが無いときの答えも拒否の値として写す」(b) 範囲（答えの 1 つ） | PASS |
| `UF-187` `mcp-relay-server.ts` | 呼び出しをページへ運び、答えを返す | 「自分が `127.0.0.1` で配った」(c) 制約。「鍵 ・ 繋いだページ ・ 待っている呼び出し ・ 溜めた通知を持つ」(c) 保持する値 | PASS。⚠️ ページを配ること（HTTP）と、MCP の stdio と、WebSocket を 1 ファイルに持つ。片方だけを書き換えさせる出来事（MCP の運び方が変わる、など）を挙げられるので、実装の体が 1 ファイルで収まらないと見たら、表 T-276 の `UD-1` で割る変更要求を別に起こす（`UD-4` によりコードの行が要るので、いまは割らない） |
| `UF-188` `agent-api-relay-link.ts` | 有効なあいだ取次へ繋ぎ、届いた呼び出しを渡して答えを返す | 「URL の断片に鍵があるあいだだけ」(c) 条件。「無効になれば閉じる」(c) 条件 | PASS |

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` を「MCP」「取次」「connect-src」「127.0.0.1」「WebSocket」で引いた —— 当たるのは `JDG-500` ・ `JDG-503` ・ `JDG-866` だけで、どれも本書と食い違わない（13 節）。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 取次の 2 つのコンポーネントを `src/` の 表 T-062 のコンポーネントとして置く（`CP-40` `Adapter` ・ `CP-41` `Framework`）。取次は同じリポジトリから 2 つ目の入口として組み立てる | 0.2 節の 3 —— 検査 19 ・ 59 と単位の木の生成（`tools/generate_unit_tree.py`）がそのまま効き、「取次はドメインを持たない」（`AG-12` の結び）が辺の検査になる。`CR-434` の「別の包み」は裁定ではなく、`CR-563` が本文の書き直しを残していた | `Framework` の中に、ブラウザではなくコマンド行の実行環境で動くコンポーネントが 1 つ入る —— 型の設定を分ける（9 節）。「コンポーネントはすべて `DEV-1`」が偽になる（E-04） |
| 決定 2 | ページの側は新しいコンポーネントを作らず、`AgentApiEndpoint` に `relayed-call.ts`（`UF-185`）、`SingleHtmlShell` に `agent-api-relay-link.ts`（`UF-188`）を足す。層をまたぐインターフェースも足さない | 0.2 節の 4。名で呼ぶメンバを選ぶのはメンバを結線した `AgentApiEndpoint` の仕事、公開点を置くのは `SingleHtmlShell` の仕事（`CP-25` の「公開点を置く」） | `UT-4` ・ `UT-6` の欄が伸びる（E-12 ・ E-13）。`CP-25` は既に `R2.2a` の FAIL の例であり、ユニットを足すと重くなる（`R2.2c` により、足すユニットだけを試験した） |
| 決定 3 | 取次とページのあいだは JSON-RPC 2.0。鍵は最初の文で渡す（URL の問い合わせ部に載せない） | MCP と同じ形なので写しの規則が 1 つで済む。鍵を URL に載せると、記録や履歴に残る | 最初の文を待つ手順が 1 つ増える |
| 決定 4 | `watchChanges` は、最初に呼ばれたときに取次がページに 1 度だけ購読を求め、届いたものを取次が溜める。呼び出しは溜まったものをすべて返し、無ければ `waitMs` だけ待つ。`waitMs` が無ければ待たない | 0.2 節の 5。溜めるのを取次にすれば、客の往復が切れても通知を落とさない。既定の長さを持たないのは `CR-563` の決定 15 のとおり（数を持たない） | 購読した後の通知は、次の呼び出しまで取次に残る |
| 決定 5 | ページが無いときの拒否は、理由の区分 `pageNotConnected`、刻印の欄は空、開く URL を添える | 0.2 節の 6。AI が人に開き方を言える。`AG-9a` の「理由の区分を潰さない」を守る | 拒否の値の形が、ページの拒否と 1 か所（刻印）違う |
| 決定 6 | 待ち受ける口の番号は OS に選ばせ、数を持たない | `FR-150` の RATIONALE が「口の番号が変われば…`IC-20` も押し直す」を代償として既に認めている。数を持てば設定の行が要る | 起動のたびに `IC-20` を押し直す（`FR-065` の記憶は origin ごと）。11 節の問い 3 で利用者が推奨を採った（`JDG-974` の ③） |
| 決定 7 | 開く URL は標準エラーと決定 5 の拒否で知らせる。取次がブラウザを自分で開くことはしない | 取次が別のプログラムを起動する道を持たない（守り）。`AG-12` の ④ で道具は足せない | 人が URL を写して開く |
| 決定 8 | MCP の運び方は stdio だけにする | `AG-12` の ① は「AI のアプリが MCP の相手として入れる」形 —— アプリが取次を起動する。HTTP の運び方は相手が無い（`R2.9`） | — |
| 決定 9 | 道具の入力は、メンバの引数の名を鍵にした 1 つのオブジェクト。取次は中身を検めない。説明は 表 T-107 から刷る | 引数の型の正は `src/` の公開エントリ（5.3 の結び）。検めるのはページ（`AG-5`）。検めれば規則が 2 か所になる | 客は型を説明文と拒否の値から読む |
| 決定 10 | ページの側の接続の状態を状態機械（`_assets/tbl-state-machines.md`）にしない | 接続は画面にもセッションの流れにも出ない —— 見えるのは `IC-20` だけ（`AG-12` の ②）。ファイルの取っ手を `CP-28` が持つのと同じく `Framework` の現在値とする（`LY-5`） | 繋がっているかを画面が区別しない（`AG-12` の ② のとおり） |
| 決定 11 | 設計書は `_assets/design-mcp-relay.md`（手書きの原稿、UID `DOC-DESIGN-MCP-RELAY`）。図の原稿は `_source/fig-mcp-relay.json`（唯一の正）、`.drawio` はその生成物、`.svg` は `_assets` | 0.2 節の 8。`fig-components` と同じ置き方。原稿を JSON にしたのは、`components.json` と同じく drawio-uml で作り直せるから | 図を作り直すのに drawio-uml の技能が要る（`build.py` と同じ）|
| 決定 12 | `FR-150` の起点のユニットを `UF-186`（`OW-2`）とする | 道具とメンバの 1 対 1（`AG-12` の ④）の規則を持つ最も内側のユニット（表 T-277 の `OW-2`） | 5.3 の結びの数が動く（E-17 ・ E-18） |
| 決定 13 | `AG-12` の行は変えず、`FR-150` の RATIONALE から設計書を指す（E-02） | `AG-12` は規則の行であり、組み方を指すと規則と設計が混ざる。`FR-150` は取次の要求そのもの | — |
| 決定 14 | 図の字は英語（コンポーネント名と短いラベル） | `fig-components.svg` と揃える。コンポーネント名は英語の確定名 | — |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所（`0590ad03`） | 編集 |
|---|---|---|
| 設計書と図 | 新しい `_assets/design-mcp-relay.md`（図 F-045）・`_source/fig-mcp-relay.json` ・ `.drawio` ・ `_assets/fig-mcp-relay.svg` | E-01、図の 3 ファイル |
| 本文から引く | `FR-150` の RATIONALE の末（`01-04-requirements.md:7011`） | E-02 |
| 層 | 表 T-060 の `LY-5`（`05-07-design.md:57`） | E-03 |
| コンポーネント | 5.2 の前文（`:99` ・ `:102`）・ 表 T-062 に `CP-40` ・ `CP-41`（`:144` の後ろ） | E-04 ・ E-05 ・ E-06 |
| 数（コンポーネント ・ ユニット） | 表 T-074 の `SU-1` ・ `SU-3`、`:300`、`:321`、表 T-070 の `MN-2` | E-07 ・ E-08 ・ E-09 ・ E-11 ・ E-19 |
| フォルダの図 | 5.3 のディレクトリ構成（`:314` 〜 `:318`） | E-10 |
| ユニット | 表 T-063 の `UT-4` ・ `UT-6`、表 T-075 に `UF-185` 〜 `UF-188` | E-12 ・ E-13 ・ E-13b ・ E-14 ・ E-15 ・ E-16 |
| 起点のユニットの結び | 5.3 の結び（`:558` ・ `:571` 〜 `:575`） | E-17 ・ E-18 |
| 内容セキュリティ方針 | 表 T-232 に `PO-7`（`:1429` の後ろ） | E-20（問い 1 の答え A） |
| 公開インターフェース | 原稿 `_source/published-entries.json`（表 T-064 は `npm run gen` で刷る） | J-01 ・ J-02 |
| 図の原稿 | `_source/components.json`（ノード 2 ・ 辺 2 ・ 層の木） | 8 節の一覧（体が足す） |
| `AG-12` ・ 表 T-107 ・ 表 T-275 ・ 2 章 | 変えない（2 章は問い 2 の答えにより別の変更要求、`DFC-1428`） | — |

**数**: 新しいファイル 1（仕様）＋ 図の 3。文の編集 20（E-02 〜 E-20）。原稿 JSON の編集 2（J-01 ・ J-02）＋ `components.json`。`（MUST）` ／ `（MUST NOT）` の印は 0 増える（7 節）。

## 2. 新しい識別子

⚠️ どれも `0590ad03` で測った最大の次である。当てる日に測り直すこと（規則 02 の 2.5）。

| 識別子 | 何 | 測った最大 |
|---|---|---|
| `CP-40` ・ `CP-41` | 表 T-062 の `McpToolTranslator` ・ `McpRelayServer` | （0590ad03 で最大 CP-39、当てる日に測り直す） |
| `UF-185` 〜 `UF-188` | 表 T-075 の 4 ユニット | （0590ad03 で最大 UF-184、当てる日に測り直す） |
| `PI-40` ・ `PI-41` | 表 T-064 の 2 行（`CP-n` と同じ番号にする —— 5.3 の結び） | （0590ad03 で最大 PI-39、当てる日に測り直す） |
| `PO-7` | 表 T-232 の `connect-src` | （0590ad03 で最大 PO-6、当てる日に測り直す） |
| 図 F-045 | MCP の取次の置き場所 | （0590ad03 で最大 F-044、当てる日に測り直す） |
| UID `DOC-DESIGN-MCP-RELAY` | 設計書の UID | 同じ名の UID は無い（`grep -rn "DOC-DESIGN-MCP" docs` で 0 件） |

表 ・ 行の接頭辞 ・ 設定値の行 ・ 状態機械 ・ 出来事の行は足さない。コードの名（`answerRelayedCall` ・ `RelayedCall` ・ `RelayedAnswer` ・ `mcpToolList` ・ `relayedCallOf` ・ `mcpToolResultOf` ・ `pageNotConnectedResult` ・ `startMcpRelay`）は J-01 ・ J-02 で 表 T-064 に載る。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

仕様から消す行は無い。書き換えで偽になる文を先に並べる:

| 消える文（`0590ad03`） | 所 | 置き換わる先 | 編集 |
|---|---|---|---|
| 「コンポーネントはすべて機器 `DEV-1` に載る」 | `05-07-design.md:99` | 2 つを除いて `DEV-1`。2 つは取次のプロセス | E-04 |
| `LY-5` の「…と、単一 `.html` のシェル。」 | `:57` | …と、単一 `.html` のシェルと、取次のプロセス | E-03 |
| 数 37（コンポーネント）× 4 か所、167（ユニット） | `:245` ・ `:300` ・ `:321` ・ `:1015`、`:247` | 39、171 | E-07 ・ E-08 ・ E-09 ・ E-11 ・ E-19 |
| 「105 件」「21 件」「（16 件）…`FR-150`…」 | `:558` ・ `:571` ・ `:575` | 106 ・ 20 ・ 15（`FR-150` を外す） | E-17 ・ E-18 |
| `UT-4` の「どちらも同じである」 | `:333` | 3 つとも同じである | E-12 |
| `FR-150` の「仕様が起点のユニットを決めていない」 | `:575` | 起点は `UF-186` | E-18 ・ E-16 |

⭐ **消さないもの**（読み直して真のまま）: `AG-12` の全文。`FR-150` の STATEMENT と RATIONALE の既存の文。`Framework` の 7 コンポーネントの文（実装するインターフェースで分かれたものの数として真。E-05 は文を足すだけ）。表 T-065 の 8 本（足さない —— 決定 2）。`PO-1` 〜 `PO-6`。

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（`0590ad03` で 22 件とも 1 回。13 節）。`01-04-requirements.md` ・ `05-07-design.md` ・ `published-entries.json` は `0590ad03` で 3 つとも LF（CRLF は 0）。
⚠️ 見出しに `partial` と書いたものは行の一部の置き換えである。塊の末の改行を旧にも新にも含めない。行末の半角空白 2 つ（`  `）は旧 ・ 新の一部である（E-02 ・ E-04 ・ E-05 ・ E-18）。
⚠️ E-01 は新しいファイルの全文である（4 つの逆引用符の塊の中身）。
⚠️ J-01 ・ J-02 を当てたら `json.loads` で読めることを確かめ、`npm run gen` で `_assets/tbl-published-entries.md` を刷る（生成物を手で直さない）。

<!-- EDIT id=E-01 file=docs/spec/_assets/design-mcp-relay.md new -->
新しいファイル（旧は無い）。全文:
````markdown
# MCP の取次 — 設計

**UID**: DOC-DESIGN-MCP-RELAY
**Version**: 0.1

> ⭐ 本書は手で書く原稿であり、MCP の取次の組み方の正である。  
> 取次が何をしなければならないかは `01-04-requirements.md` の `FR-150` と 表 T-035 の `AG-12` が持つ。  
> 本書はそれをどう組むかだけを持ち、要求・表の行を写さずに指す。

## 1. 目的と置き場所

**Type**: SECTION

取次は、MCP の客（AI のアプリ）が呼んだ `Agent API` のメンバを、人がブラウザで開いている `GRS` のページへ運び、ページの答えを客へ返す別のプロセスである。  
文書の唯一の正は開いているページのままであり（`FR-150`）、取次は文書もドメインの規則も持たない（`AG-12` の結び）。  
取次は `GRS` のページを `127.0.0.1` で自分で配り、そのページと同じ origin の WebSocket で繋ぐ（`AG-12` の ①）。

置き場所を 図 F-045 に示す。  
箱はコンポーネント、枠はプロセスと層である。  
ページの側は既にあるコンポーネントにユニットを 1 つずつ足すだけで、`UseCase` と `Entity` は変えない。

**図 F-045 — MCP の取次の置き場所**

[![図 F-045 — MCP の取次の置き場所](fig-mcp-relay.svg)](fig-mcp-relay.svg)

図の原稿は `_source/fig-mcp-relay.json` である。  
`.drawio` と `.svg` はそこから生成したものであり、手で直さない —— 次の生成で消える。

## 2. コンポーネントと層

**Type**: SECTION

取次のプロセスに載るコンポーネントは `05-07-design.md` の 表 T-062 の `CP-40`（`McpToolTranslator`）と `CP-41`（`McpRelayServer`）である。  
ページの側は、同表の `CP-17`（`AgentApiEndpoint`）と `CP-25`（`SingleHtmlShell`）に、表 T-075 の `UF-185` と `UF-188` を足す。  
取次の側のユニットは同表の `UF-186` と `UF-187` である。  
層・責務・負う要求は 表 T-062 と 表 T-075 が持ち、公開する名前は `tbl-published-entries.md` の 表 T-064 の `PI-17` ・ `PI-40` ・ `PI-41` が持つ。  
本書はそれらを写さない。

層の割り方の理由は次のとおりである。

- 呼び出しと答えを MCP の形と `Agent API` の形のあいだで写すことは、値から値への変換なので `Adapter` の `pure` とする（表 T-060 の `LY-4`）。
- 待ち受ける口・繋いだページ・待っている呼び出し・溜めた変更の通知は現在値なので、`Framework` だけが持つ（`LY-5`）。
- 取次には `UseCase` と `Entity` のコンポーネントを置かない —— 取次が持つ規則は運び方だけであり、文書の規則はページの `Agent API` が 表 T-035 の `AG-5` のとおり当てる。
- ⭐ 取次のコンポーネントから出る辺は、`McpRelayServer` から `McpToolTranslator` への 1 本と、`McpToolTranslator` から `AgentApiEndpoint` の型だけを読む 1 本に限る（`_source/components.json` の `edges`。表 T-247 の `EG-5` が、ここに無い辺をコードに作ることを禁じる）。  
  型だけの辺は、呼び出しと答えの型を 2 か所で書かないためである（`R2.21`）。  
  これで「取次は文書もドメインの規則も持たない」（`AG-12` の結び）を検査が見張る。

## 3. インターフェース

**Type**: SECTION

### 3.1 MCP の客と取次のあいだ

取次は MCP の stdio の運び方で客と話す。  
標準出力は MCP の文だけに使い、取次の記録は標準エラーへ書く。

- **道具の一覧** —— 道具は `tbl-glossary.md` の 表 T-107 のメンバと 1 対 1 であり、名は同じ確定名である（`AG-12` の ④）。  
  道具の説明は同表の「何を担うか」の欄から刷り、手で書かない。
- **道具の入力** —— 1 つのオブジェクトとし、鍵はそのメンバの引数の名とする。  
  引数の名と型は `src/` の公開エントリが持つ `AgentApi` の署名である（表 T-064 の `PI-17`）。  
  引数を持たないメンバとプロパティ（`agentApiVersion` ・ `schemaVersion`）は空のオブジェクトを受ける。  
  ⚠️ `watchChanges` だけは受け手の代わりに待つ長さ `waitMs` を受ける（`AG-12` の ⑤）。  
  渡さなければ待たずに答える。  
  ⛔ 取次は入力の中身を検めない —— 検めるのはページの `Agent API` である（`AG-12` の結び、`AG-5`）。
- **道具の答え** —— メンバが返した値を、そのまま構造のある値として返す。  
  拒否も値のまま返し、MCP の誤りにしない（表 T-035 の `AG-9a`）。  
  画像（`exportPng`）は MCP の画像として返す。  
  MCP の誤りにするのは、ページがメンバを呼べずに例外で終わったときだけである。

### 3.2 取次とページのあいだ

- **ページを配る** —— `GET /` に、同じ版で作った単一 `.html` と同じバイト列を返す。  
  内容セキュリティ方針（`05-07-design.md` の 表 T-232）はページの中にあるので、取次は足しも削りもしない。  
  ほかの道は断る。
- **繋ぐ** —— ページは同じ origin の WebSocket で繋ぎ、最初の文で、URL の断片から読んだ鍵を渡す（`AG-12` の ⑦）。  
  WebSocket への接続は 表 T-232 の `PO-7` が許す。
- **運ぶ** —— 鍵を受けた後の文は JSON-RPC 2.0 とする。  
  取次が呼び、ページが答える。  
  `method` は 表 T-107 の確定名、`params` は 3.1 の道具の入力と同じオブジェクトである。  
  `result` はメンバの答えであり、画像のバイト列だけは base64 の文字列にする。  
  型は `relayed-call.ts` が持つ `RelayedCall` と `RelayedAnswer` である（表 T-064 の `PI-17`）。
- **知らせる** —— ページは、購読した変更と発話を `changeNoticed` の通知として取次へ送る（3.3）。

```text
page  -> relay   {"jsonrpc":"2.0","method":"relayKeyPresented","params":{"key":"<key from #fragment>"}}
relay -> page    {"jsonrpc":"2.0","id":7,"method":"readStamp","params":{}}
page  -> relay   {"jsonrpc":"2.0","id":7,"result":<the value readStamp returned>}
page  -> relay   {"jsonrpc":"2.0","method":"changeNoticed","params":<one change notice>}
```

### 3.3 待つ道具

`watchChanges` の購読は、ページが繋がってから最初に `watchChanges` が呼ばれたとき、取次がページに 1 度だけ求める。  
届いた変更と発話は取次が届いた順に溜め、`watchChanges` の呼び出しは、溜まっていればすぐに、無ければ `waitMs` だけ待って、溜まっていたものをすべて返す。  
待つあいだに何も届かなければ空の並びを返す —— これが `AG-12` の ⑤ の「まだ無い」である。  
ページが切れたら購読と溜めたものを捨て、次に繋いだページで購読し直す。  
何が届くかは `AG-6` がページの側で決める。

## 4. データの流れ

**Type**: SECTION

1. AI のアプリが取次を起動する。  
   取次は `127.0.0.1` の、OS が選んだ空いた口で待ち受け、起動ごとの鍵を暗号学的な乱数から作り、`http://127.0.0.1:<口>/#<鍵>` を標準エラーへ書く。
2. 人がその URL をブラウザで開き、文書を「開く」（`FR-087`）で開き、`IC-20` で `Agent API` を有効にする（`FR-065`）。
3. ページは、`Agent API` が有効であり、URL の断片に鍵があるあいだだけ、取次へ繋ぐ（`AG-12` の ②）。
4. 取次は origin と鍵を照らし、まだページが繋がっていなければ受ける（`AG-12` の ③ ⑦）。
5. 客が道具を呼ぶ。  
   取次は `McpToolTranslator` で呼び出しを写し、ページへ送る。
6. ページは `answerRelayedCall` で同じ名のメンバを呼び、答えを返す。  
   検証・拒否・刻印の照合は、画面からの書き込みと同じ道を通る（`AG-5`）。
7. 取次は答えを `McpToolTranslator` で MCP の答えに写し、客へ返す。

## 5. 断る道と異常

**Type**: SECTION

- **ページが繋がっていない**（開いていない・`Agent API` が無効・閉じられた） —— 取次は道具の呼び出しに拒否を値で返す（`AG-12` の ②）。  
  理由の区分は `pageNotConnected` とし、開く URL を添える —— AI が人に開き方を伝えられるようにするためである。  
  ⚠️ ページが無いので現在の刻印は無く、刻印の欄は空とする。
- **呼び出しの途中でページが切れた** —— 答えを待っていた呼び出しにも、同じ拒否を返す。  
  ページで既に確定した書き込みは戻さない。
- **2 つ目のページ・origin の違う接続・鍵の無い接続・鍵の違う接続** —— WebSocket を閉じて断る（`AG-12` の ③ ⑦）。  
  繋がっているページは変わらない。
- **ページの `Agent API` が断った** —— 刻印の食い違い・人のドラッグ中・読み取り専用の行（`FR-111` の 表 T-275 の `GP-1` ・ `GP-7`、理由は 表 T-233 の `RS-61` ・ `RS-62`）など、どの拒否も取次は写さずにそのまま運ぶ。
- **合流の 3 択** —— 人が `U-61` で答えるまで、呼び出しは答えを待ったままでいる（`AG-12` の ⑥、`FR-022`）。  
  取次は待つ長さを持たない。
- **客が呼び出しを取り消した** —— 取次は後から来た答えを捨てる。  
  ページで起きたことは戻さない。

## 6. 配り方

**Type**: SECTION

配り方は `AG-12` の ① が持つ —— AI のアプリが MCP の相手として入れる 1 つのファイルと、同じ中身をコマンド行の JavaScript の実行環境で動かす形である。  
どちらの形も、同じ版で作った単一 `.html` を中に持ち、3.2 のとおりそのまま配る。  
取次を使わない人の `GRS` は、今までどおり単一 `.html` を開くだけで動く（`FR-150`）。

## 7. 守り

**Type**: SECTION

- 待ち受けるのは `127.0.0.1` だけであり、ほかの機器からは繋げない（`AG-12` の ①）。
- 接続を受けるのは、取次が配ったページの origin で、起動ごとの鍵を渡したものだけである（`AG-12` の ⑦）。  
  origin を照らすので、別の名前を `127.0.0.1` へ向けたページからも繋げない。
- 名簿も認証も持たない（`FR-111` の RATIONALE）—— 鍵が守るのは「同じ機械の別のページ」からであり、人を見分けることではない。
- 取次は文書を保存しない。  
  書き込みはいつもページが確定する。

## 8. 本書が持たないもの

**Type**: SECTION

- 道具の一覧と、各メンバが何を担うか —— `tbl-glossary.md` の 表 T-107。
- 取次とページが従う規則 —— 表 T-035 の `AG-12`。
- 引数と戻り値の型 —— `src/` の公開エントリ（表 T-064 の `PI-17`）。
- コンポーネントとユニットの責務 —— 表 T-062 と 表 T-075。
- サーバーとの連携・名簿・認証 —— 範囲外である（`01-04-requirements.md` の 表 T-002 の `SO-12`）。
- MCP の HTTP の運び方・ブラウザを取次が自分で開くこと・道具を束ねること —— 持たない（束ねないことは `AG-12` の ④）。
````

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`FR-150` の RATIONALE の末（最後の行の後ろ）に、設計の文書と図を指す 1 文を足す。 旧
```text
待ち受ける口の番号が変われば origin も変わり、`FR-065` の有効化の記憶はその origin にしか効かないので、`IC-20` も押し直す。
```
新
```text
待ち受ける口の番号が変われば origin も変わり、`FR-065` の有効化の記憶はその origin にしか効かないので、`IC-20` も押し直す。  
⭐ 取次の組み方（コンポーネント・継ぎ目・データの流れ・断る道・配り方・守り）は `_assets/design-mcp-relay.md` が持ち、置き場所を同書の 図 F-045 に示す。
```

<!-- EDIT id=E-03 file=docs/spec/05-07-design.md partial -->
表 T-060 の `LY-5` の中。`Framework` が取次のプロセスも持つことを足す。 旧
```text
と、単一 `.html` のシェル。<br>**現在値を保持するのはこの層だけである**
```
新
```text
と、単一 `.html` のシェルと、ページに載らない MCP の取次のプロセス（`FR-150`、`_assets/design-mcp-relay.md`）。<br>**現在値を保持するのはこの層だけである**
```

<!-- EDIT id=E-04 file=docs/spec/05-07-design.md -->
5.2 の前文。取次の 2 つのコンポーネントは `DEV-1` に載らない。 旧
```text
**コンポーネントはすべて機器 `DEV-1` に載る**（表 T-007）。
```
新
```text
**コンポーネントは、`McpToolTranslator`（`CP-40`）と `McpRelayServer`（`CP-41`）を除いて、すべて機器 `DEV-1` に載る**（表 T-007）。  
⚠️ その 2 つは、ページの外にある MCP の取次のプロセスに載る（`FR-150`、`_assets/design-mcp-relay.md`）。
```

<!-- EDIT id=E-05 file=docs/spec/05-07-design.md partial -->
5.2 の分ける基準の段の末。`Framework` に 8 つ目が立つ理由を足す（`7` は実装するインターフェースで分かれたものの数のまま真である）。 旧
```text
逆に `Framework` の 7 コンポーネントが分かれているのは、実装するインターフェースが別だからである。
```
新
```text
逆に `Framework` の 7 コンポーネントが分かれているのは、実装するインターフェースが別だからである。  
`McpRelayServer`（`CP-41`）が分かれているのは、載るプロセスが別だからである。
```

<!-- EDIT id=E-06 file=docs/spec/05-07-design.md -->
表 T-062 の末（`CP-39` の行の後ろ）に 2 行を足す。 旧
```text
| CP-39 | `UseCase` | `AdvanceScreenSession` | 保存しない画面とセッションの流れを、出来事を受けて 1 段進め、次の状態と副作用の列を返す。<br>副作用を実行しない | 5.6 の ADR-002 / 表 T-249 / 表 T-250 / 表 T-280 / 表 T-286 / 表 T-289 / 表 T-290 / 表 T-292 / 表 T-293 / 表 T-295 / 表 T-296 |
```
新
```text
| CP-39 | `UseCase` | `AdvanceScreenSession` | 保存しない画面とセッションの流れを、出来事を受けて 1 段進め、次の状態と副作用の列を返す。<br>副作用を実行しない | 5.6 の ADR-002 / 表 T-249 / 表 T-250 / 表 T-280 / 表 T-286 / 表 T-289 / 表 T-290 / 表 T-292 / 表 T-293 / 表 T-295 / 表 T-296 |
| CP-40 | `Adapter` | `McpToolTranslator` | MCP の道具と `Agent API` のメンバのあいだで、呼び出しと答えを相互に写す。<br>取次のプロセスに載り、ページには載らない | `FR-150` / 表 T-035 の `AG-12` / 表 T-107 |
| CP-41 | `Framework` | `McpRelayServer` | MCP の客の呼び出しを、自分が配ったページへ運ぶ。<br>運ぶために持つ値（鍵・繋いだページ・待っている呼び出し・溜めた変更の通知）を保持する。<br>取次のプロセスに載り、ページには載らない | `FR-150` / 表 T-035 の `AG-12` |
```

<!-- EDIT id=E-07 file=docs/spec/05-07-design.md partial -->
表 T-074 の `SU-1` の全数。 旧
```text
| **37。<br>** 全数は 表 T-062、公開する名前は 表 T-064 |
```
新
```text
| **39。<br>** 全数は 表 T-062、公開する名前は 表 T-064 |
```

<!-- EDIT id=E-08 file=docs/spec/05-07-design.md partial -->
表 T-074 の `SU-3` の全数（E-14 〜 E-16 の 4 行）。 旧
```text
| **167。<br>** 全数は 表 T-075、割った理由は 表 T-063 |
```
新
```text
| **171。<br>** 全数は 表 T-075、割った理由は 表 T-063 |
```

<!-- EDIT id=E-09 file=docs/spec/05-07-design.md -->
5.3 のディレクトリ構成の前文。 旧
```text
37 のフォルダは 表 T-062 の 37 コンポーネントと 1 対 1 である。
```
新
```text
39 のフォルダは 表 T-062 の 39 コンポーネントと 1 対 1 である。
```

<!-- EDIT id=E-10 file=docs/spec/05-07-design.md -->
5.3 のディレクトリ構成の図。`adapter/` と `framework/` の末に 1 つずつ足す。 旧
```text
                      clipboard-gateway/ · screen-renderer/
  framework/          single-html-shell/ · dom-svg-surface/ · dom-input-source/
                      file-system-access-file-store/ · browser-clipboard/
                      canvas-rasterizer/ · dom-screen-surface/
```
新
```text
                      clipboard-gateway/ · screen-renderer/ · mcp-tool-translator/
  framework/          single-html-shell/ · dom-svg-surface/ · dom-input-source/
                      file-system-access-file-store/ · browser-clipboard/
                      canvas-rasterizer/ · dom-screen-surface/ · mcp-relay-server/
```

<!-- EDIT id=E-11 file=docs/spec/05-07-design.md partial -->
5.3 の表の案内の文。 旧
```text
37 コンポーネントの公開インターフェースを 表 T-064 に
```
新
```text
39 コンポーネントの公開インターフェースを 表 T-064 に
```

<!-- EDIT id=E-12 file=docs/spec/05-07-design.md -->
表 T-063 の `UT-4`。 旧
```text
| UT-4 | `AgentApiEndpoint` | `agent-api-endpoint.ts` ／ `agent-api-members.ts` | **純粋性ではない** —— 表 T-075 のとおり どちらも同じである。<br>設置は `FR-065`（既定で公開しない）が、20 メンバは 表 T-107 が縛るので、変更の理由が別である |
```
新
```text
| UT-4 | `AgentApiEndpoint` | `agent-api-endpoint.ts` ／ `agent-api-members.ts` ／ `relayed-call.ts` | **純粋性ではない** —— 表 T-075 のとおり 3 つとも同じである。<br>設置は `FR-065`（既定で公開しない）が、20 メンバは 表 T-107 が、取次が運んだ呼び出しの受け方は 表 T-035 の `AG-12` が縛るので、変更の理由が別である |
```

<!-- EDIT id=E-13 file=docs/spec/05-07-design.md partial -->
表 T-063 の `UT-6` のユニットの欄の末。 旧
```text
／ `copy-and-paste.ts` | **純粋性ではない**
```
新
```text
／ `copy-and-paste.ts` ／ `agent-api-relay-link.ts` | **純粋性ではない**
```

<!-- EDIT id=E-13b file=docs/spec/05-07-design.md partial -->
表 T-063 の `UT-6` の変更の理由の列挙の末。 旧
```text
写しと貼り付けは `FR-033` が変わったときに書き直す。
```
新
```text
写しと貼り付けは `FR-033` が、取次へ繋ぐ口は 表 T-035 の `AG-12` が変わったときに書き直す。
```

<!-- EDIT id=E-14 file=docs/spec/05-07-design.md -->
表 T-075 の `AgentApiEndpoint` の群。`UF-28` の後ろ（宣言だけの `UF-29` の前）に 1 行。 旧
```text
| UF-28 | `AgentApiEndpoint` | `agent-api-members.ts` | `non-pure` | 表 T-107 の 20 メンバの結線 | `FR-028`（`OW-2`） |
```
新
```text
| UF-28 | `AgentApiEndpoint` | `agent-api-members.ts` | `non-pure` | 表 T-107 の 20 メンバの結線 | `FR-028`（`OW-2`） |
| UF-185 | `AgentApiEndpoint` | `relayed-call.ts` | `non-pure` | 取次が運んだ呼び出しを 1 つずつ、表 T-107 の同じ確定名のメンバへ渡し、答えを運べる値にして返す（`answerRelayedCall`） —— 画像のバイト列は base64 の文字列にし、購読した変更と発話は渡された送り口へ流す（`_assets/design-mcp-relay.md` の 3.2 ・ 3.3）。<br>呼び出しと答えの型（`RelayedCall` ・ `RelayedAnswer`）を宣言する | — |
```

<!-- EDIT id=E-15 file=docs/spec/05-07-design.md partial -->
表 T-075 の `SingleHtmlShell` の群の末（`UF-123` の後ろ）に 1 行。 旧
```text
シェルはその領域の出来事を送らないので届かない） | — |
```
新
```text
シェルはその領域の出来事を送らないので届かない） | — |
| UF-188 | `SingleHtmlShell` | `agent-api-relay-link.ts` | `non-pure` | 取次が配ったページで、`Agent API` が有効であり URL の断片に鍵があるあいだだけ、同じ origin の WebSocket で取次へ繋ぎ、届いた呼び出しを `answerRelayedCall` へ渡して答えを返す（表 T-035 の `AG-12` の ② ⑦、`_assets/design-mcp-relay.md` の 3.2） —— 無効になれば閉じる | — |
```

<!-- EDIT id=E-16 file=docs/spec/05-07-design.md -->
表 T-075 の末（`UF-125` の後ろ）に、`CP-40` と `CP-41` の 2 行。 旧
```text
| UF-125 | `AdvanceScreenSession` | `agent-api-values.ts` | `pure` | `Agent API` の領域の遷移（表 T-296）と、そこから生成した型と初期値の区画 | — |
```
新
```text
| UF-125 | `AdvanceScreenSession` | `agent-api-values.ts` | `pure` | `Agent API` の領域の遷移（表 T-296）と、そこから生成した型と初期値の区画 | — |
| UF-186 | `McpToolTranslator` | `mcp-tool-translator.ts` | `pure` | MCP の道具の一覧・呼び出し・答えを、`Agent API` のメンバの中継の呼び出しと答えへ相互に写す（表 T-035 の `AG-12` の ④ ⑤、`_assets/design-mcp-relay.md` の 3.1） —— ページが繋がっていないときの答えも、理由の区分 `pageNotConnected` の拒否の値として写す | `FR-150`（`OW-2`） |
| UF-187 | `McpRelayServer` | `mcp-relay-server.ts` | `non-pure` | MCP の客の呼び出しを、自分が `127.0.0.1` で配ったページへ運び、答えを返す（表 T-035 の `AG-12` の ① 〜 ③ ⑤ ⑦、`_assets/design-mcp-relay.md` の 3 〜 5） —— 起動ごとの鍵・繋いだページ・待っている呼び出し・溜めた変更の通知を現在値として持つ | — |
```

<!-- EDIT id=E-17 file=docs/spec/05-07-design.md -->
「負う要求」の欄の結び。`FR-150` が起点のユニット（`UF-186`）を持つ。 旧
```text
そのうち 105 件は、上の欄が起点のユニットを名指している。
```
新
```text
そのうち 106 件は、上の欄が起点のユニットを名指している。
```

<!-- EDIT id=E-18 file=docs/spec/05-07-design.md -->
同じ結びの「起点をまだ書いていない要求」から `FR-150` を外す。 旧
```text
⚠️ **起点をまだ書いていない要求が 21 件ある。**  
⛔ これは「持ち主が無い」ではなく「まだ決めていない」である。  
理由は 3 つに分かれる。

- **仕様が起点のユニットを決めていない（16 件）** —— `FR-027` ・ `FR-032` ・ `FR-034` ・ `FR-044` ・ `FR-048` ・ `FR-051` ・ `FR-091` ・ `FR-095` ・ `FR-097` ・ `FR-105` ・ `FR-106` ・ `FR-110` ・ `FR-130` ・ `FR-133` ・ `FR-150` ・ `FR-152`。
```
新
```text
⚠️ **起点をまだ書いていない要求が 20 件ある。**  
⛔ これは「持ち主が無い」ではなく「まだ決めていない」である。  
理由は 3 つに分かれる。

- **仕様が起点のユニットを決めていない（15 件）** —— `FR-027` ・ `FR-032` ・ `FR-034` ・ `FR-044` ・ `FR-048` ・ `FR-051` ・ `FR-091` ・ `FR-095` ・ `FR-097` ・ `FR-105` ・ `FR-106` ・ `FR-110` ・ `FR-130` ・ `FR-133` ・ `FR-152`。
```

<!-- EDIT id=E-19 file=docs/spec/05-07-design.md partial -->
表 T-070 の `MN-2`。 旧
```text
| MN-2 | コンポーネントを 37 に分けた（表 T-062） |
```
新
```text
| MN-2 | コンポーネントを 39 に分けた（表 T-062） |
```

<!-- EDIT id=E-20 file=docs/spec/05-07-design.md -->
表 T-232 の末（`PO-6` の後ろ）に `PO-7`。⭐ 11 節の問い 1 の答え A（`JDG-974` の ①）。 旧
```text
| PO-6 | `form-action` | `'none'`。<br>⚠️ **`PO-1` は本指令にも及ばない** |
```
新
```text
| PO-6 | `form-action` | `'none'`。<br>⚠️ **`PO-1` は本指令にも及ばない** |
| PO-7 | `connect-src` | `'self'`。<br>取次が配ったページは、同じ origin の取次へ WebSocket で繋ぐ（`FR-150`、表 T-035 の `AG-12` の ①）。<br>⛔ ほかの取得元を足さない —— 本行が無ければ、`PO-1` がその接続も拒む |
```

<!-- EDIT id=J-01 file=docs/spec/_source/published-entries.json -->
表 T-064 の `PI-17` に、取次が運んだ呼び出しを受ける入口を足す（`installAgentApi` の後ろ）。 旧
```text
    {
     "name": "installAgentApi",
     "note": {
      "ja": [
       "`non-pure`。",
       "既定で公開しない。",
       "`FR-065`"
      ]
     }
    },
```
新
```text
    {
     "name": "installAgentApi",
     "note": {
      "ja": [
       "`non-pure`。",
       "既定で公開しない。",
       "`FR-065`"
      ]
     }
    },
    {
     "name": "answerRelayedCall",
     "note": {
      "ja": [
       "`non-pure`。",
       "取次が運んだ呼び出しを、表 T-107 の同じ確定名のメンバへ渡して答える。",
       "型 `RelayedCall` ・ `RelayedAnswer` とともに公開する（`_assets/design-mcp-relay.md` の 3.2）"
      ]
     }
    },
```

<!-- EDIT id=J-02 file=docs/spec/_source/published-entries.json -->
表 T-064 の末（`PI-39` の後ろ）に `PI-40` と `PI-41`。 旧
```text
       "`InputCommandTranslator` が `Esc` の段（表 T-283 の `RG-3`）と、面が立っているかの判じに読む"
      ]
     }
    }
   ]
  }
 ]
}
```
新
```text
       "`InputCommandTranslator` が `Esc` の段（表 T-283 の `RG-3`）と、面が立っているかの判じに読む"
      ]
     }
    }
   ]
  },
  {
   "id": "PI-40",
   "layer": "Adapter",
   "component": "McpToolTranslator",
   "members": [
    {
     "name": "mcpToolList",
     "note": {
      "ja": [
       "MCP の道具の一覧。",
       "名は 表 T-107 の確定名、説明は同表の「何を担うか」の欄（`_assets/design-mcp-relay.md` の 3.1）"
      ]
     }
    },
    {
     "name": "relayedCallOf",
     "note": {
      "ja": [
       "MCP の道具の呼び出しを、ページへ運ぶ呼び出しに写す"
      ]
     }
    },
    {
     "name": "mcpToolResultOf",
     "note": {
      "ja": [
       "ページの答えを MCP の道具の答えに写す。",
       "拒否は値のまま写す（表 T-035 の `AG-9a`）"
      ]
     }
    },
    {
     "name": "pageNotConnectedResult",
     "note": {
      "ja": [
       "ページが繋がっていないときの答え。",
       "理由の区分 `pageNotConnected` と開く URL を持つ拒否の値である（表 T-035 の `AG-12` の ②）"
      ]
     }
    }
   ]
  },
  {
   "id": "PI-41",
   "layer": "Framework",
   "component": "McpRelayServer",
   "members": [
    {
     "name": "startMcpRelay",
     "note": {
      "ja": [
       "`non-pure`。",
       "取次のプロセスの入口である。",
       "他のコンポーネントからは呼ばれない"
      ]
     }
    }
   ]
  }
 ]
}
```

**図の 3 ファイル**（仕様の文ではないので旧 ・ 新を持たない。下書きをそのまま移す）: `previous-project-result/26-export-shell-crs/mcp-relay/` の `fig-mcp-relay.json` → `docs/spec/_source/`、`fig-mcp-relay.drawio` → `docs/spec/_source/`、`fig-mcp-relay.svg` → `docs/spec/_assets/`。移し方と作り直し方は同じフォルダの `README.md`。

当てた後に打つもの: `npm run gen`（表 T-064 と 行 ID の接頭辞の登録簿を刷る —— `PO` の行数が 6 → 7）→ `python docs/spec/_source/build.py`（`components.json` を足した後、図 F-013 と経路の図を刷る）→ `python tools/generate_unit_tree.py`（4 ユニットの空の木）→ `bash .claude/skills/spec-graph-check/check.sh`（8 節の赤の見込み）。

## 5. 継ぎ目 —— 仕様だけを読む試験の体に渡す

```
SEAM-1 (page side, AgentApiEndpoint PI-17 -- waits for L4)
- answerRelayedCall(api, call, sendNotice): Promise<RelayedAnswer>
    call = { member: <a confirmed name of table T-107>, params: { <parameter name>: value } }
    reads a property (agentApiVersion, schemaVersion) or calls the method of that name;
    exportPng bytes come back as a base64 string; a refusal comes back as the value it is.
    watchChanges subscribes once; each notice goes to sendNotice(notice).
- Observable: for every member of table T-107, the answer equals what the member
  returns when called directly (same stamp, same refusal reason).

SEAM-2 (relay side, McpToolTranslator PI-40, pure)
- mcpToolList: one tool per member of table T-107, same names, none added, none bundled (AG-12 (4)).
- relayedCallOf(toolCall) / mcpToolResultOf(answer): a refusal stays a value (AG-9a), never an MCP error.
- pageNotConnectedResult(pageUrl): reason 'pageNotConnected', empty stamp, carries the URL (AG-12 (2)).

SEAM-3 (relay process, McpRelayServer PI-41; page link UF-188)
- listens on 127.0.0.1 only, a port the OS picks; GET / returns the single .html bytes unchanged.
- a WebSocket from another origin, without the key, with a wrong key, or a second page: closed (AG-12 (3)(7)).
- the page connects only while Agent API is enabled and the URL fragment holds the key; disabling closes it (AG-12 (2)).
- watchChanges with waitMs: returns queued notices at once, or [] after waitMs (AG-12 (5)).
- CSP of the built page carries connect-src 'self' (table T-232 PO-7).
```

## 6. グラフ（`0590ad03`）

| 対象 | 届く先 | 読んだ結果 |
|---|---|---|
| `FR-150` | 指す: 表 T-035 ・ 表 T-107、行 `AG-12` ・ `IC-20`。指される: 要求 2 件 / 参照 3 か所（`FR-111:1843` ・ `FR-064:6956` ・ 5.3 `:575`） | `:575` は E-18 が書き換える。ほかは真のまま |
| `AG-12` | 指される: 要求 1 件 / 参照 1 か所（`FR-150:6998`） | 変えない |
| 表 T-062 | 行 37。指す要求 0、5.2 ・ 5.3 ・ 5.4 ・ 5.6 から 13 か所 | 数の文は E-07 ・ E-09 ・ E-11 ・ E-19 |
| 表 T-075 | 行 167。指す要求 1（`FR-071`）、2 次 4 | `FR-071` は表を指すだけで数を言わない |
| 表 T-232 | 行 6。1.6（`CN-8`）と 6.1（`SWS-8`）から | どちらも「全数は 表 T-232」と指すだけ |
| `LY-5` | 要求 1（`FR-102`）/ 参照 14 | どれも「現在値は `Framework`」を読む —— E-03 の後も真 |

`induced.py FR-150 T-035 T-107 T-062 T-075 T-232 T-060` → 7 of 7、辺 2、閉路 0 ⇒ どの順で当ててもよい。

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | `0590ad03` | 当てた後 | 数え方 |
|---|---|---|---|
| tables / figures / rows / uids | 212 / 29 / 2685 / 176 | 212 / 30 / 2694 / 177 | `md-checks.py`（写しに当てて測った。13 節） |
| 表 T-062 / 表 T-075 / 表 T-064 / 表 T-232 の行 | 37 / 167 / 37 / 6 | 39 / 171 / 39 / 7 | 同上 |
| `（MUST）` ／ `（MUST NOT）` の句 | 2424 | 2424 | 検査 39（写しで同じ数） |
| 起点をまだ書いていない要求 | 21 | 20 | 5.3 の結び。⚠️ 試験 `cr-435-every-requirement-names-a-unit` の基準線 `requirement-owner-baseline.txt`（いま `unfilled=17`）は下げる向きなので、調整役が下げてよい（`JDG-520`） |
| 検査 46 ・ 12 ・ 13 ・ 14 ・ 32 | 基準線 | 基準線のまま | 写しで測った |

## 8. 波 —— 持ち場で割る

⭐ **仕様の文は、持ち場 L4 が合流した後に、ほかの変更要求と 1 度に当てる**（`docs/development-records/cr-plan-2026-09-26.md` の W0 〜 W5 と同じ形）。実装は後の波である。

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧を数え直す。2 節の番号を測り直す。11 節の問いの答えは受けてある（`JDG-974`） | 調整役 |
| 1 | 仕様（`docs/spec`） | E-01 〜 E-20、J-01 ・ J-02、図の 3 ファイル、`components.json`（下の一覧）。`npm run gen` ・ `build.py` ・ `generate_unit_tree.py`。変更履歴に 1 行 | 仕様の持ち場 |
| 2a | ページの側 ⛔ **L4 を待つ**: `src/adapter/agent-api-endpoint/relayed-call.ts`（新）・ `agent-api-endpoint.ts`（公開を足す） | SEAM-1 | 実装の体 |
| 2b | ページの側: `src/framework/single-html-shell/agent-api-relay-link.ts`（新）・ `single-html-shell.ts`（`watchAgentApiEnabling` の結線、`:536` 〜 `:547`）・ `vite.config.ts`（`PO-7`） | SEAM-3 のページの半分 | 2a と同じ体 |
| 2c | 取次の側: `src/adapter/mcp-tool-translator/*`・`src/framework/mcp-relay-server/*`・組み立ての 2 つ目の入口・`tools/` に 表 T-107 から道具の説明を刷る生成器 | SEAM-2 ・ SEAM-3 | 別の体（2a と持ち場が重ならない） |
| 3 | 仕様だけを読む試験の体 | 5 節の SEAM から契約試験 | 実装した体と別 |
| 4 | ― | 実物で確かめる: 取次を起動 → URL を開く → `IC-20` → 道具を呼ぶ。⚠️ `connect-src 'self'` が同じ origin の `ws:` を通すことを Chromium 系で実測する（問い 1 の答え A の前提。通らなければ、推奨の文のとおり E-20 の値だけを B へ直す） | 調整役 |

**`components.json` に足すもの**（波 1。ノードの `description` は英語で 1 行）:

- `nodes`: `McpToolTranslator`（`shape: component`、`remark: "FR-150 / AG-12"`）・ `McpRelayServer`（同）。
- `layout`: `adapter` の群に `McpToolTranslator`、`framework` の群に `McpRelayServer`。
- `edges`: `McpRelayServer → McpToolTranslator`（`dependency`、`label: "translate tool calls"`）・ `McpToolTranslator → AgentApiEndpoint`（`dependency`、`label: "call and answer types"`）。`SingleHtmlShell → AgentApiEndpoint` は既にある（`label` に `/ relays calls` を足してよい）。
- ⛔ 取次の 2 つから ほかへの辺を足さない —— 足せば「取次はドメインを持たない」の見張りが外れる。

⚠️ **赤の見込み**: 波 1 だけを当てると、検査 26b（`PI-40` ・ `PI-41` ・ `answerRelayedCall` の名を公開エントリが export していない —— 生成器の空の木は `export {}` だけ）と、`single-html-shell` の型検査に関わらない限り他は緑の見込み。⭐ 推す当て方: 波 1 と 2a 〜 2c を同じ合流に入れる。分けるなら、検査 26b の赤の持ち主を台帳に書く。
⚠️ 毎フレームの経路には触れない（`frame-loop.ts` を変えない）。`perf-pending.md` の行は要らない。
⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`0590ad03` の行番号）

| ファイル | 何を |
|---|---|
| `src/adapter/agent-api-endpoint/relayed-call.ts`（新、⛔ L4 を待つ） | `answerRelayedCall` と `RelayedCall` ・ `RelayedAnswer`。`AgentApi` の鍵で名を引く。`exportPng` の答えを base64 に |
| `src/adapter/agent-api-endpoint/agent-api-endpoint.ts`（⛔ L4 を待つ） | 上の 3 つの名を公開する（`PI-17`） |
| `src/framework/single-html-shell/agent-api-relay-link.ts`（新） | `location.hash` の鍵、同じ origin の WebSocket、最初の文、JSON-RPC の受け答え、`changeNoticed` |
| `src/framework/single-html-shell/single-html-shell.ts` | `watchAgentApiEnabling`（`:537` 〜 `:547`）の有効 ・ 無効で、繋ぐ ・ 閉じる |
| `vite.config.ts` | 方針の組み立て（`:140` 〜 `:149`）に `connect-src 'self'` |
| `src/adapter/mcp-tool-translator/mcp-tool-translator.ts`（新） | `mcpToolList`（`satisfies Record<keyof AgentApi, …>` で 1 対 1 をコンパイラに見張らせる）・ `relayedCallOf` ・ `mcpToolResultOf` ・ `pageNotConnectedResult` |
| `src/adapter/mcp-tool-translator/` の `.json`（新、生成物） | 道具の説明。`tools/` の新しい生成器が 表 T-107 の「何を担うか」から刷る。検査 21 の一覧に 1 行、検査 27（`npm run gen:check`）に入れる |
| `src/framework/mcp-relay-server/mcp-relay-server.ts`（新） | `startMcpRelay` —— stdio の JSON-RPC、`127.0.0.1` の HTTP と WebSocket、鍵、待っている呼び出し、溜めた通知 |
| 組み立て（`vite.config.ts` か別の設定）・ `tsconfig` | 取次の 2 つ目の入口（単一 `.html` のバイト列を中に持つ 1 ファイル）。`mcp-relay-server` だけにコマンド行の実行環境の型を与え、`Entity` ・ `UseCase` の型の設定（`LR-6`）は変えない |
| `docs/spec/_source/build.py` | ⭐ 勧め: `fig-mcp-relay.json` も作らせる（`stamp_drawio` と同じ印） —— 図を作り直す道を 1 つにする |
| `tools/check_layer_rules.py` | 変えない見込み（名前付きの外の指定子は数えない） |

## 10. ⛔ この変更でやらないこと

- `AG-12` ・ `FR-150` の振る舞いを決め直さない（`JDG-503`）。
- 道具を束ねない ・ 足さない（`AG-12` の ④）。MCP の HTTP の運び方を持たない（決定 8）。
- サーバー（GRSS）・名簿 ・ 認証を持たない（`SO-12`、`FR-111` の RATIONALE）。
- 2 章（表 T-003 ・ 表 T-007 ・ 表 T-008 ・ 2.4）と ADR-000 の Context を書き換えない —— 問い 2 の答え（`JDG-974` の ②）により、別の変更要求が書く（`DFC-1428`、番号は調整役が振る）。
- `DFC-560`（書き手の名が固定）に触れない —— MCP で運んでも同じ名で書く。
- コードを書かない。

## 11. 前に立つ者へ返す問い

⭐ **3 つとも 2026-10-01 に答えを得た** —— 利用者の「それ以外は、全部推奨で」（`JDG-974`、逐語は 0.1 節）により、3 つとも推奨の A である。

| 問い | 案と代償 | 推奨 ／ 答え |
|---|---|---|
| 問い 1 —— ページの内容セキュリティ方針に `connect-src` を足すか | **A**（本書の E-20）`connect-src 'self'` —— 取次が配ったページだけが同じ origin の取次へ繋げる。代償: 手元のファイルで開いた成果物にも 1 行増える（繋ぐ相手が無いので何も起きない）。`'self'` が `ws:` を含むかは Chromium 系で未実測（8 節の波 4 で測る）／ **B** `connect-src ws://127.0.0.1:*` —— 口の番号を問わず `127.0.0.1` の WebSocket を許す。代償: 手元のファイルのページからも取次へ繋ぎに行ける形になる（取次の origin の照合が断るが、方針の守りは薄い）／ **C** 足さない —— `AG-12` の ① が成り立たず、取次は作れない | **A**。狭いほうから始め、実測で `ws:` が通らなければ B へ移す（そのときは本書の E-20 の値だけを直す）。⭐ **答え: A（`JDG-974` の ①）** —— E-20 |
| 問い 2 —— 2 章（表 T-007 の機器、表 T-008 の経路と「ネットワークを通る経路は 1 本も無い」、表 T-003 の `CN-1` ・ `CN-6`、`XO-1`）と ADR-000 の Context に、取次を書き込むか | **A** 別の変更要求を 1 本起こす —— 機器の行（取次のプロセス）、経路の行（MCP の stdio、`127.0.0.1` の WebSocket と HTTP）、`CN-6` ・ `XO-1` に「`FR-150` の取次を使うときを除く」を 1 文ずつ。代償: 変更要求が 1 本増える ／ **B** 本書に入れる —— 塊が 5 〜 6 増え、族（2 章の与件 と 5 章の組み方）が混ざる ／ **C** 書かない —— 2 章と `FR-150` の食い違いが残る（`R1.3`） | **A**。番号は調整役が振る。本書の後でも前でもよい（本書は 2 章に触れない）。⭐ **答え: A（`JDG-974` の ②）** —— 別の変更要求（台帳 `DFC-1428`、番号は調整役から受ける） |
| 問い 3 —— 待ち受ける口の番号 | **A**（本書の決定 6）OS に選ばせ、数を持たない。代償: 起動のたびに `IC-20` を押し直し、`localStorage` の記憶（言語など、表 T-206 の別枠）も起動ごとに新しい origin になる ／ **B** 既定の番号を設定の行に 1 つ持ち、塞がっていれば OS に選ばせる。代償: 設定の行 1 つ、番号がほかのプログラムとぶつかる扱い、`FR-150` の RATIONALE の書き直し | **A**。`FR-150` がすでに代償として書いている。使ってみて押し直しが重いと分かれば B を別の変更要求で。⭐ **答え: A（`JDG-974` の ③）** —— 決定 6 |

本書に残る問いは無い。

## 12. 台帳

- `DFC-1336`: 本書が当たったら、状態を「仕様待ち」から「実装待ち」へ（決定仕様の欄は `_assets/design-mcp-relay.md` と 表 T-062 の `CP-40` ・ `CP-41`）。前に立つ者が書く。
- `JDG-866`: 「指示 —— `CR-613` が当てる」。前に立つ者が書く。
- `JDG-974`: 問い 1 〜 3 の答え。前に立つ者が起こした。本書が当たったら「指示 —— `CR-613` が当てる」へ（問い 2 の部分は別の変更要求）。
- `DFC-1428`: 0.2 節の 7（2 章が取次を知らない）。前に立つ者が起こした。問い 2 の答え A により、別の変更要求が閉じる（番号は調整役が振る）。本書は閉じない。
- ⚠️ `requirement-owner-baseline.txt` の `unfilled` は、本書で 1 下がる向き（7 節）。

⭐ **前に立つ者が 2026-10-01 に起こした台帳の行と、それを持つ変更要求**（4 本に同じ表を置く）:

| 行 | 持つもの |
|---|---|
| `DFC-1420` ・ `DFC-1421` | `CR-611` が閉じる |
| `DFC-1422` | `CR-611` の起草で見つけた仕様の穴。どの変更要求も閉じない |
| `DFC-1423` | `CR-610` が閉じる（`DFC-553` の ② も `CR-610`） |
| `DFC-1424` | `取下げ` —— `DFC-553` の ② と同じ件 |
| `DFC-1425` ・ `DFC-1426` ・ `DFC-1427` | `CR-612` が閉じる |
| `DFC-1428` | 本書の問い 2 の答えにより、別の変更要求が閉じる（番号は調整役が振る） |
| `JDG-970` ・ `PND-611` | `CR-612` の問い 1（保留） |
| `JDG-971` ・ `JDG-972` ・ `JDG-973` ・ `JDG-974` | `CR-610` ・ `CR-611` ・ `CR-612` の問い 2 ・ 本書 |

## 13. 測り方の再現

```
# the tree: refactor 0590ad03 (branch b3-export-shell-crs)
git log --oneline -1                                      # -> 0590ad03 Rule JDG-950 ...

# the ruling and the item
grep -n "JDG-866" docs/development-records/rulings.md     # -> :1149
grep -n "DFC-1336" docs/development-records/defects.md    # -> :434

# nothing about the relay in the design side (0.2 item 1)
grep -n "取次\|MCP" docs/spec/05-07-design.md docs/spec/_assets/*.md    # -> 0 lines

# the page cannot open a WebSocket today (0.2 item 2)
grep -n "^| PO-" docs/spec/05-07-design.md                # -> PO-1 .. PO-6, no connect-src
grep -n "default-src\|form-action" vite.config.ts

# maxima (section 2)
for p in CP UF PI PO; do grep -rhoE "^\| $p-[0-9]+" docs/spec | sed "s/| $p-//" | sort -n | tail -1; done
grep -rhoE "図 F-[0-9]{3}" docs/spec | sort -u | tail -1  # -> 図 F-044
grep -rln "F-045\|CP-40\|UF-185\|PI-40\|PO-7" change-request docs/development-records   # -> none

# rulings reached (section 0 ③)
grep -n "MCP\|取次\|connect-src\|127\.0\.0\.1\|WebSocket" docs/development-records/rulings.md
#   -> JDG-500, JDG-503, JDG-866 only

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-150 AG-12
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-062 T-075 T-232 LY-5
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-150 T-035 T-107 T-062 T-075 T-232 T-060
#   -> 7 of 7, 2 edges, 0 cycles

# every old block of section 4 once, all applied to a COPY of docs/spec (scratchpad g613/)
PYTHONIOENCODING=utf-8 python <scratchpad>/g613/edits.py . <scratchpad>/g613/copy3
#   -> 22 blocks, each count=1, bad=0
# on the copy: gen the table, then the checks
python docs/spec/_source/published_entries_json_to_md.py  # -> 39 rows, 235 members
python .claude/skills/spec-graph-check/md-checks.py       # -> checks 5-10, 15, 48 all 0; 212/30/2694/177
python .claude/skills/spec-graph-check/check-line-breaks.py        # -> baseline
python .claude/skills/spec-graph-check/check-marks.py              # -> OK
python .claude/skills/spec-graph-check/check-must-clause-coverage.py   # -> 2424 clauses, same as the tree
python .claude/skills/spec-graph-check/style-checks.py             # -> same counts as the tree
python .claude/skills/spec-graph-check/check-spec-holds-no-history.py .   # -> 0 sites
strictdoc export docs/spec --output-dir <scratchpad>/g613/sdout    # -> exported; design-mcp-relay.html shows the figure, 0 raw **

# the figure (previous-project-result/26-export-shell-crs/mcp-relay/)
python <drawio-uml skill>/scripts/draw.py fig-mcp-relay.json fig-mcp-relay.drawio
draw.io -x --embed-svg-fonts false -f svg -b 12 -o fig-mcp-relay.svg fig-mcp-relay.drawio
```

### 13.1 ⚠️ 測りが見られなかったもの

- 検査 21（`check-provenance.py`）は写しの `docs/review/` が無いので 2 件赤だった（持ち込まなかったファイルのせい）。`_source` の 2 つの新しいファイル（`fig-mcp-relay.json` ・ `.drawio`）は名乗りを通った。
- `check.sh` の全体は走らせていない（前に立つ者が走らせる）。`build.py` と `generate_unit_tree.py` も写しで走らせていない。
- `connect-src 'self'` が同じ origin の `ws:` を通すことは実測していない（問い 1 の答え A の前提。8 節の波 4 で測る）。`http://127.0.0.1` のページで File System Access API が使えることも実測していない（`127.0.0.1` は安全な文脈として扱われるはず、という読みだけ）。
- `previous-project-result/10-agent-interface/` は読んでいない —— 振る舞いは `CR-563` と `AG-12` が既に決めており、本書は組み方だけを書いた。
