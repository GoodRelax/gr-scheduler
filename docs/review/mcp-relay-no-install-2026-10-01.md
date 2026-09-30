# 調べ —— 何も入れていない人へ、MCP の取次をどう渡すか

**日付**: 2026-10-01 ／ **起こり**: `JDG-1010`（「何もインスコしてない人にバッチファイを配布する検討」）／
**読んだ木**: `refactor` `e724925d` ／ **方法**: 読み取りだけ。一次資料は 2026-10-01 に読んだ（10 節）。
`src/` ・ `tests/` ・ `docs/spec` は 1 字も触っていない。

⛔ **本書は提案である。** 仕様の変更は、利用者が認めたときだけ `CR-620` の下書きにし、調整役が当てる。

---

## 0. 結論（先に）

| 問い | 答え |
|---|---|
| **バッチファイル（`.bat` ／ `.cmd` ＋ PowerShell）で配るべきか** | ⛔ **配らない。** Windows 11 の Smart App Control は、インターネットから落とした `.bat` ・ `.cmd` ・ `.ps1` を止め、利用者に「それでも実行」の道を出さない（3.1）。止まらない機械でも、取次を PowerShell でもう 1 つ書くことになり、`JDG-503` の「同じ中身」と `CR-613` の決定 1 に反する |
| **では何で配るか** | ⭐ **すでに裁定済みの形そのもの** —— `AG-12` の ① の「AI のアプリが MCP の相手として 1 つのファイルで入れる形（実行の土台はアプリが持つ）」は、Claude Desktop では **MCP の束（`.mcpb`）** である。Claude Desktop は Node.js を内蔵するので、利用者は Node も Python も git も入れずに済む（2 節） |
| 利用者がすること | `.mcpb` を 1 つ落として **ダブルクリック** → Claude Desktop の「インストール」を押す → AI に「GRS を開いて」と頼む → AI が示す `http://127.0.0.1:…/#…` を開く（7 節） |
| 仕様は変わるか | **`AG-12` は変えない**（既にこれを求めている）。変えたいのは `CR-613` が作る設計書の 6 節「配り方」に、形の名（`.mcpb`）・中に入れるもの・署名の方針・入れない形（バッチファイル・実行ファイル）を書くことだけ —— 利用者が認めれば `CR-620`（`CR-613` の後に当てる） |
| 前提として残るもの | ⚠️ **AI のアプリ（Claude Desktop）とブラウザは要る。** 「何も入れていない」は「AI のアプリ以外は何も入れていない」と読む（8 節の問い 1） |

---

## 1. いまの AI 連携の到達点（`e724925d` で測り直した）

| 道 | 状態 |
|---|---|
| ページ内の `Agent API`（`FR-065`、表 T-107 のメンバ） | 動く（`IC-20` で有効にしたとき）。対話の場には開いた不具合が残る（`DFC-558` ・ `DFC-1019` ・ `DFC-1320`） |
| 画像 → GRS JSON のプロンプトの写し（`CR-562`） | 動く |
| MCP の取次（`FR-150` ・ `AG-12`） | **仕様だけ**。設計書は `CR-613`（起草・未適用）、2 章は `CR-614`（起草・未適用）。コードは 0 行 |

既に決まっていること（本書は決め直さない）:

- `JDG-503`（`PND-603`）: 取次は **1 つのファイルで配る形を本筋に**、同じ中身を `node` で動かす形も配る。取次は `GRS` のページを `127.0.0.1` で **自分で配り**、同じ origin で繋ぐ。
- `CR-613` の決定 3 ・ 5 ・ 6 ・ 7 ・ 8: 鍵は URL の断片、口の番号は OS が選ぶ、開く URL は拒否の値に添える、MCP は stdio だけ。
- `JDG-974`: ページの CSP に `connect-src 'self'` を足す。

⭐ **この 2 つで「file:// のページから繋ぐ」問題は最初から起きない。** 人が開くのは取次の配った `http://127.0.0.1:<口>/` であり、file:// ではない。

---

## 2. 3 つの道の比べ

| | (a) Windows の組み込みだけ（`.bat` ＋ PowerShell 5.1 ＋ .NET） | (b) 1 つの実行ファイル（Node SEA ・ Deno ・ Bun ・ Go） | (c) MCP の束 `.mcpb`（⭐ 推奨。`AG-12` の ① そのもの） |
|---|---|---|---|
| 入れるもの | 無し（PowerShell 5.1 は Windows に入っている） | 無し | 無し（Node は Claude Desktop が持つ） |
| 大きさ | スクリプト数十 KB ＋ html 1.4 MB | 実行時を丸ごと抱える（数十 MB 級。⚠️ 公式の数は無く、測る必要あり） | 取次の JS ＋ html 1.4 MB（`dist/index.html` は 1,466,839 バイト）を zip したもの |
| 落とした後に止まるか（Mark of the Web） | ⛔ Smart App Control が有効な機械では止まり、上書きの道が無い（3.1）。有効でなくても SmartScreen が警告する | ⛔ 署名が無ければ SmartScreen の「PC を保護しました」→「実行」を人が押す。Smart App Control は止める | ✅ Windows が実行するファイルではない —— Claude Desktop が開く zip である（⚠️ Claude Desktop の入れる画面が署名の無い束に何と言うかは未確認、9 節） |
| 実行ポリシー | 既定は `Restricted`。`-ExecutionPolicy Bypass` はその場だけ効くが、グループポリシーには負ける | 関係なし | 関係なし |
| 管理者権限が無い | ⚠️ `HttpListener` は `127.0.0.1` の接頭辞で URL ACL（管理者）が要る可能性がある（未確認）。`TcpListener` で自分で HTTP と WebSocket を書けば避けられるが、コードが増える | 要らない（`127.0.0.1` で待つだけ） | 要らない |
| AI のアプリへの繋ぎ方 | 利用者が `claude_desktop_config.json` に絶対パスを手で書くか、ランチャーが JSON を書き換える（壊しやすい） | 同じく設定ファイルに絶対パスが要る | ✅ ダブルクリック・ドラッグ・設定の「拡張機能」から入れるだけ。設定ファイルに触らない |
| macOS ・ Linux | 別に書き直す（`.command` ／ `.sh`） | OS ごとに作る。macOS は Developer ID ＋ 公証（年 99 USD）が無いと Gatekeeper が止める | ✅ Claude Desktop の macOS 版も同じ束を入れる（Node は macOS 版にも内蔵）。Linux 版の Claude Desktop は無いので、`node` の形（`AG-12` の ① の 2 つ目）を使う |
| 取次の中身 | ⛔ PowerShell でもう 1 つ書く —— `JDG-503` の「同じ中身」、`CR-613` の決定 1（取次は `src/` の TypeScript、検査 19 ・ 59 が見張る）に反する | 同じ JS を包むので中身は 1 つ | 同じ JS をそのまま入れるので中身は 1 つ |
| 署名 | Authenticode（Artifact Signing は月 9.99 USD から。個人は米国・カナダに限る旨の記述あり、未確認） | 同じ | `mcpb sign`（自己署名も可）。Windows の SmartScreen とは無関係 |

(d) **取次を置かない道**も見た —— Claude Desktop の「カスタムコネクタ」は URL で繋ぐが、繋ぐのは Anthropic のクラウドからであり、手元の `127.0.0.1` には届かない（10 節の [C3]）。ブラウザ拡張で page を操る道（Playwright MCP の拡張モードなど）は、拡張を入れること自体が「入れる」に当たり、`JDG-503` の形でもない。⇒ 取次は要る（`PND-603` の ③ と同じ結論）。

---

## 3. 決め手になった事実

### 3.1 バッチファイルは Smart App Control に止められる

- Smart App Control は「未知の署名の無いコード」を既定で止める [W5]。個々のアプリについて止めるのを外す道は無い [W6]。
- Microsoft の技術者の記事（公式文書ではない）は、Mark of the Web の付いた `.bat` ・ `.cmd` ・ `.ps1` も止められ、上書きの道が出ないと書く [W7]。⚠️ 公式文書での確認は取れていない（9 節）。
- 止まらない機械でも、SmartScreen は署名の無いファイルに「PC を保護しました」を出し、人が「実行」を選ぶまで動かない [W4]。自己署名は署名が無いのと同じ扱い [W4]。
- 実行ポリシーの既定は Windows のクライアントで `Restricted` [W2]。`-ExecutionPolicy Bypass` は「その場だけ」で、グループポリシーには勝てない [W2]。管理の厳しい職場の機械では、ここで止まる。

⇒ **「落とした `.bat` をダブルクリック」は、何も入れていない人ほど（＝ 既定の設定のままの人ほど）止まる。**

### 3.2 Claude Desktop は Node を持っている

- `.mcpb` は「手元の MCP サーバーと `manifest.json` を入れた zip」で、サーバーは stdio で動く [C1]。
- Node は「Claude Desktop に同梱（macOS と Windows）」[C1]。サポート記事も「組み込みの Node.js 環境」と言う [C2]。
- 入れ方は 3 つ: ファイルのダブルクリック、窓へのドラッグ、設定 → 拡張機能 → 詳細 → 「拡張機能をインストール」[C1]。ディレクトリへの登録は今は受け付けていないので、束は自分で配る [C1]。
- `.dxt` は `.mcpb` に名が変わった（古い `.dxt` も動く）[C4]。

⇒ **`AG-12` の ① の「実行の土台はアプリが持つ」は、今の Claude Desktop でそのまま成り立つ。**

### 3.3 ブラウザの側 —— 自分で配ったページなら何も起きない

- file:// のページの origin は「不透明」で、`Origin: null` と名乗る [B1]。⇒ `null` を受けると、どの file:// のページからも・サンドボックスの iframe からも繋げてしまう。**`null` は断る。**
- Chrome は 142 から「ローカルネットワークへのアクセス」の許可を問い、147 から WebSocket にも広げた [B3][B4]。⚠️ file:// のページは「ローカル」と扱われ、問われる側に入る可能性がある [B5]（未確認）。
- 同じ仕様は、ループバックから来た要求を問わない [B5]。⇒ **取次が `127.0.0.1` で配ったページから同じ origin へ繋ぐ `CR-613` の形は、許可の問いにも `Origin: null` にも当たらない。** 既に決めた形が正しかったことの裏付けである。

---

## 4. 守り（`AG-12` の ⑦ と `CR-613` の 7 節を当て直した）

| 脅威 | 守るもの | 判定 |
|---|---|---|
| 別の機械から繋ぐ | `127.0.0.1` だけで待つ（MCP の仕様も「SHOULD」[M2]） | ✅ 既に `AG-12` の ① |
| ふつうの悪意のページ（`https://evil.example`）が `ws://127.0.0.1:<口>` を叩く | origin の照合。ブラウザは WebSocket の `Origin` を偽らせない。MCP の仕様は origin を検めることを MUST とする [M2] | ✅ 既に `AG-12` の ⑦。加えて Chrome 147 以降は許可の問いが出る [B4] |
| file:// のページ・サンドボックスの iframe（`Origin: null`） | `null` を受けない —— 受けるのは配ったページの origin だけ | ✅ `AG-12` の ⑦ の「配ったページの origin だけ」がそのまま `null` を断る。⭐ 実装で見落としやすいので、設計書に 1 文で書く（`CR-620` の候補） |
| DNS の張り替え（悪意の名前を `127.0.0.1` に向ける） | origin は悪意の名前のままなので断られる。ページ（`GET /`）は読まれうるが、中身は公開の html で鍵を含まない | ✅ 実害なし。⭐ `Host` を `127.0.0.1:<口>` と照らす 1 行を足せば、`GET /` も断れる（深い守り。`CR-620` の候補、8 節の問い 3） |
| 同じ機械の別のプロセスが `Origin` を偽って繋ぐ | 起動ごとの鍵（断片にあり、サーバーへも記録へも出ない） | ✅ 既に `AG-12` の ⑦ |
| 鍵の漏れ | ⚠️ `CR-613` の決定 5 ・ 7 により、開く URL（鍵つき）は拒否の値に添えられ、AI の会話に載る ⇒ AI の提供元の記録に鍵が残る | 許せる —— 鍵は `127.0.0.1` の、その起動の 1 回だけに効く。取次を閉じれば死ぬ。⚠️ 利用者に知らせるなら、この 1 文を設計書の 7 節へ |
| 同じ利用者の権限で動くマルウェア | 守らない（取次の外。そのマルウェアは文書のファイルを直接読める） | 範囲外 |

---

## 5. 推奨

⭐ **バッチファイルは配らない。何も入れていない人（Claude Desktop だけを入れた人）には `grs-relay.mcpb` を 1 つ配る。**
これは `JDG-503` ・ `AG-12` の ① が既に決めた「1 つのファイルで入れる形」に名を与えるだけで、新しい方針ではない。

| 何を | どこで作る | 中身 |
|---|---|---|
| `grs-relay.mcpb` | `npm run build` の後の 1 段（例: `npm run build:relay`）。Pages の Actions で作り、公開の `dist/` の隣に置く | `manifest.json`（`server.type` は `node`、入口は取次の JS）＋ 取次を 1 ファイルに束ねた JS ＋ 同じ版の `index.html`（`CR-613` の設計書 3.2 の「同じバイト列」） |
| `grs-relay.mjs`（`node` の形） | 同じ段 | 上と同じ JS。`AG-12` の ① の 2 つ目の形（Node を入れた人・Linux 向け） |
| 署名 | ⚠️ 当面は署名しない（8 節の問い 2） | `mcpb sign` は後から足せる。Authenticode ・ Apple の公証は要らない（実行ファイルを配らないので） |
| 配らないもの | —— | `.bat` ・ `.cmd` ・ `.ps1` ・ 実行ファイル（`.exe`） |

---

## 6. 仕様への当たり（利用者が認めたとき —— `CR-620`）

- **`AG-12` は変えない。** ① が既に「AI のアプリが 1 つのファイルで入れる形」と「コマンド行の JavaScript の実行環境の形」を MUST にしている。製品名（Claude Desktop）を仕様の行に入れない（本文は「AI のアプリ」のまま）。
- **`CR-613` の E-01（`_assets/design-mcp-relay.md`）の 6 節「配り方」と 7 節「守り」に足す** —— 形の名 `.mcpb`（MCP の束。MCP の組織が持つ開かれた形式）、中に入れるもの、配らない形とその理由（Smart App Control）、`Origin: null` を断ること、（問い 3 が是なら）`Host` の照合。
- ⛔ **当てる順**: `CR-613` の後（`CR-620` の旧は `CR-613` の E-01 の新）。`CR-614` とは触る所が別（2 章）なので順は問わない。⚠️ `CR-613` はまだ当たっていないので、旧の文は当てる木で数え直す。
- 影響の測り: `python .claude/skills/spec-graph-check/impact.py FR-150 AG-12`（下書きの時に取る）。

---

## 7. 利用者の手順（案。アプリの利用者向けの文書に載せる形）

**Windows ・ macOS（Claude Desktop を入れてある人）**

1. `GRS` の公開ページから `grs-relay.mcpb` を落とす。
2. 落としたファイルをダブルクリックする（または Claude Desktop の窓へドラッグする）。
3. Claude Desktop に出る画面で「インストール」を押す。
4. Claude Desktop の会話で「GRS を開いて」と頼む。
5. AI が示す `http://127.0.0.1:…/#…` のリンクをブラウザで開く。
6. 開いたページで、文書を「開く」で開き、`Agent API` の入口（`IC-20`）を押す。
7. あとは AI に日程の読み書きを頼む。⚠️ Claude Desktop を起動し直したら、5 と 6 をもう一度する（口の番号と鍵が変わる —— `CR-613` の決定 6）。

**Node を入れてある人・Linux**: `grs-relay.mjs` を落とし、AI のアプリの MCP の設定に `node grs-relay.mjs` を書く。

---

## 8. 利用者への問い（推奨つき）

| # | 問い | 推奨 | 理由 |
|---|---|---|---|
| 1 | 「何も入れていない人」は「Claude Desktop（AI のアプリ）だけを入れた人」と読んでよいか | **よい** | MCP の相手を起動するのは AI のアプリなので、アプリは必ず要る。ブラウザだけの人は今のままページ内の `Agent API` と `CR-562` の写しを使う |
| 2 | バッチファイルは配らず、`.mcpb`（`JDG-503` の「1 つのファイル」）を配るでよいか。署名は当面しない | **よい（署名は後）** | 3.1 ・ 3.2。署名は `mcpb sign` で後から足せ、足しても SmartScreen には関係しない |
| 3 | 守りに 2 文を足すか —— `Origin: null` を断ることを明記、`Host` を照らす | **両方足す** | 前者は既に `AG-12` の ⑦ から導けるが見落としやすい。後者は 1 行で DNS の張り替えの `GET /` も断てる |
| 4 | 上の 1 〜 3 を `CR-620` として下書きするか（`CR-613` の後に当てる）。試作（取次のコード）は今は作らず、実装の波で 9 節の未確認を確かめる | **下書きする・試作は後** | 仕様の変更は設計書の 2 節だけ。試作は取次の本体を書くのと同じ手間になる |

⭐ **答え（2026-10-01、逐語は `rulings.md`）**: 問い 1 は推奨（`JDG-1011`）、問い 2 は「署名は後」と問い返し（`JDG-1012`。答えは 11 節）、問い 3 は両方足す（`JDG-1013`）、問い 4 は下書きする・試作は後（`JDG-1014`）。
下書きは `change-request/CR-620-the-relay-ships-as-one-bundle-and-refuses-a-null-origin.md`。

---

## 9. 確かめられなかったこと（実装の波で測る）

- Claude Desktop が署名の無い `.mcpb` を入れるときに何を示すか（警告だけか、止めるか）。
- file:// のページが Chrome 147 以降で `127.0.0.1` へ繋ぐときに許可を問われるか（本推奨はこれに当たらない）。
- `HttpListener` が管理者なしで `http://127.0.0.1:<口>/` を待てるか（(a) を採らないので不要）。
- Smart App Control が `.bat` を止めることの公式文書（[W7] は個人の記事）。
- 実行ファイルの大きさ（(b) を採らないので不要）。
- Claude Desktop の Windows 版を入れるのに管理者が要るか。

---

## 10. 一次資料（2026-10-01 に読んだ。引用は 15 語未満）

- [M1] MCP 仕様 Transports — https://modelcontextprotocol.io/specification/latest/basic/transports （版 2026-07-28。stdio と Streamable HTTP）
- [M2] MCP 仕様 Streamable HTTP — https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http —「Servers MUST validate the Origin header on all incoming connections」
- [C1] Claude — MCPB — https://claude.com/docs/connectors/building/mcpb — Node は「Included with Claude Desktop on macOS and Windows」
- [C2] Claude ヘルプ 10949351 — https://support.claude.com/en/articles/10949351 —「Claude Desktop includes a built-in Node.js environment」
- [C3] Claude ヘルプ 11175166 — https://support.claude.com/en/articles/11175166 — カスタムコネクタは Anthropic のクラウドから繋ぐ
- [C4] MCPB — https://github.com/modelcontextprotocol/mcpb —「.dxt files are now .mcpb files」
- [C6] MCPB CLI — https://github.com/modelcontextprotocol/mcpb/blob/main/CLI.md — 証明書は「Should have Code Signing extended key usage」
- [C5] MCP ローカルサーバーへの接続 — https://modelcontextprotocol.io/docs/develop/connect-local-servers — 設定ファイルは `%APPDATA%\Claude\claude_desktop_config.json`
- [W1] Windows PowerShell とは — https://learn.microsoft.com/en-us/powershell/scripting/what-is-windows-powershell
- [W2] about_Execution_Policies (5.1) — https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies?view=powershell-5.1 —「isn't a security boundary」
- [W3] Mark of the Web — https://learn.microsoft.com/en-us/microsoft-365-apps/security/internet-macros-blocked
- [W4] SmartScreen の評判 — https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation —「EV certificates no longer bypass SmartScreen」
- [W5] Smart App Control — https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/overview
- [W6] Smart App Control FAQ — https://support.microsoft.com/en-us/windows/smart-app-control-frequently-asked-questions-285ea03d-fa88-4d56-882e-6698afdb7003
- [W7] （公式ではない）Eric Lawrence の記事、textslashplain.com、2026-04-28
- [N1] Node.js SEA — https://nodejs.org/api/single-executable-applications.html — 「Stability: 1.1 - Active development」
- [D1] Deno compile — https://docs.deno.com/runtime/reference/cli/compile/
- [U1] Bun executables — https://bun.com/docs/bundler/executables
- [A1] Apple 公証 — https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- [B1] WHATWG HTML origin — https://html.spec.whatwg.org/multipage/browsers.html#ascii-serialisation-of-an-origin
- [B2] Secure Contexts — https://w3c.github.io/webappsec-secure-contexts/
- [B3] Chrome Local Network Access — https://developer.chrome.com/blog/local-network-access
- [B4] Chrome 147 リリースノート — https://developer.chrome.com/release-notes/147
- [B5] Local Network Access 仕様 — https://wicg.github.io/local-network-access/
- [P1] Playwright MCP の拡張モード — https://github.com/microsoft/playwright-mcp

---

## 11. 署名はどう取るのか・有料か（`JDG-1012` の問いへの答え）

| 署名の種類 | 何に効くか | 取り方 | 費用 |
|---|---|---|---|
| **束の署名（`mcpb sign`）** | AI のアプリが束を入れるときの表示（⚠️ Claude Desktop が検めるか・何を示すかは公開の文書に無い、9 節） | PEM 形式の X.509 証明書（コード署名の用途）と対の秘密鍵を渡す。自己署名は `--self-signed` で作れる [C6] | 自己署名は**無料**。ただし「前と同じ人が署名した」ことしか示さず、身元の証明にならない |
| 同上（認証局の証明書） | 身元（個人名・組織名）を示す | 認証局からコード署名証明書を買う | **有料**（年ごと。値は認証局ごと）。⚠️ いまのコード署名証明書は秘密鍵をハードウェア（トークン・クラウドの鍵保管）に閉じ込める決まりなので、PEM の鍵ファイルを渡す `mcpb sign` と噛み合わない恐れがある（要確認） |
| Windows の Authenticode | SmartScreen ・ Smart App Control（実行ファイル・スクリプトに対して） | Microsoft の Artifact Signing（旧 Trusted Signing）か、認証局の証明書 | 月 9.99 USD から [W4]。個人は米国・カナダに限るという記述あり（未確認）。⭐ **束を配るだけなら要らない**（Windows が実行するファイルではない） |
| Apple の Developer ID ＋ 公証 | macOS の Gatekeeper（アプリ・実行ファイルに対して） | Apple Developer Program に入る | 年 99 USD [A1]。⭐ **束を配るだけなら要らない** |

⇒ **推奨どおり、当面は署名しない。** Claude Desktop が署名をどう扱うかを実装の波で確かめ、効くと分かってから、自己署名か認証局の証明書かを決める。
