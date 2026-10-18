# GRS サーバー連携デモ（Windows）

GoodRelax Scheduler（GRS）の画面のまま、ファイルを手元の PC のフォルダに置く代わりに、**HTTPS サーバーの先のフォルダ（Dummy Server）** に置けることを見せるデモです。

- 置き場所が違うだけで、開く・保存の流れは GRS そのものです（利用者 2026-10-18、`JDG-2592`）。
- ⛔ **配る GRS（`GRS.html`）はサーバー連携を持ちません**（`JDG-2580`）。デモは、ビルド済みの `dist/index.html` に小さなスクリプトを 1 つ足しただけのものです。GRS のコードは 1 行も変えていません。

## 試し方

⭐ **動かすのに要るのは Windows の PowerShell だけです**（Windows に最初から入っています）。Node.js も npm も、導入するものはありません（`JDG-2583`、`JDG-2584`）。

1. 落とした `grs-server-sync-demo.zip` を右クリック →「プロパティ」→ 下の「許可する」に印を付けて OK（しないと SmartScreen の警告が出ます）。
2. 展開して、できた `grs-server-sync-demo` フォルダの `start-server.cmd` をダブルクリックします。

### 一式と zip を組み立てる（開発する側だけ）

組み立てにだけ Node.js が要ります。`npm install` は要りません（node の標準の部品しか使いません）。

1. `npm run build:demo` —— `dist-server-sync-demo/grs-server-sync-demo/`（展開した形）と `dist-server-sync-demo/grs-server-sync-demo.zip`（配る形）ができます。`dist/index.html` を読むので、`src/` を変えたら先に `npm run build`。
2. そのまま試すなら `dist-server-sync-demo/grs-server-sync-demo/start-server.cmd` をダブルクリックします。

`dist-server-sync-demo/` はコミットしません（`.gitignore`）。zip はリポジトリに置かず、配るときに組み立てます。公開の置き場は `https://goodrelax.github.io/gr-scheduler/download/grs-server-sync-demo.zip` です（GitHub Pages の組み立てで作る、`JDG-2597`。Pages と紹介頁の入口は `DFC-3071`）。

### 初めの 1 回だけ

- 黒い窓（サーバー）が開き、その PC 用の自己署名の証明書を作ります（`JDG-2582`、`JDG-2584`）。
- 続けて Windows が「セキュリティ警告 —— 次であると主張する証明機関 (CA) から証明書をインストールしようとしています: localhost …… この証明書をインストールしますか?」と 1 回だけ問います（`JDG-2598`）。
  - **[はい]**: 証明書をその利用者の「信頼されたルート証明機関」に入れます（管理者権限は要りません。.NET の開発用証明書と同じやり方）。以後、ブラウザーは警告を出しません。
  - **[いいえ]**: 何も入れません。ブラウザーが「接続がプライベートではありません」（`NET::ERR_CERT_AUTHORITY_INVALID`）を出すので、[詳細設定] →「localhost に進む（安全ではありません）」を押します。次からは問いません（もう一度問わせるには `server\certificate-trust-declined.txt` を消す）。
- その後、既定のブラウザーで `https://localhost:8443/` が開きます。ブラウザーを既に開いていたときは、一度閉じてから開き直すと警告が消えます。
- 💡 なぜ警告が出るのか: `localhost` はどの PC でも「自分自身」を指す名前なので、公の認証局はこの名の証明書を誰にも出しません。だから証明書はその PC で作るしかなく、信頼するかはその PC の持ち主が決めます。
- ブラウザーは **Edge か Chrome** を使います（ファイルの窓は File System Access API に頼るため）。

### 止め方

黒い窓を閉じます。`schedule-data` の中身は残ります。

## 画面の違い（デモ版だけ）

| 所 | 通常の GRS | デモ版 |
|---|---|---|
| 左上のロゴ | `GRS` | 赤字の `Demo`（席を `Demo` の幅に広げる、`JDG-2590`） |
| 開く（`IC-1`、`Ctrl`＋`O`） | Windows のファイルの窓 | 先に小窓「Open from: [This PC] [Dummy Server]」（`JDG-2593`） |
| ファイルに保存（`IC-2`） | 5 つの形式 | 5 つの下に赤い 6 つ目「Dummy Server (GRS JSON .json)」（`JDG-2594`） |

デモが足した語は英語だけです（GRS の辞書には入れていません、`JDG-2596`）。

### Dummy Server の窓

Windows のファイルの窓に似せた一覧です（名前・更新日時・大きさ）。

- 開くとき: 行を押して [Open]（2 回押しでも開きます）。その後は GRS のいつもの流れ（未保存の確認、置き換え／統合／基準として重ねる）。
- 保存するとき: 「File name」に今のファイル名が初めから入っています。**そのまま [Save] なら同名で更新、書き替えれば別名で保存**です（既にあるファイルに重ねるときは、GRS が上書きしてよいかを問います）。行を押すとその名が入ります。

## ユースケース

| UC | 名 | 操作 | 結果 |
|---|---|---|---|
| UC-1 | 起動する | `start-server.cmd` | サーバーが立ち、デモが開く。左上は赤い `Demo` |
| UC-2 | サーバーから開く | 開く → Dummy Server → ファイルを選ぶ | GRS の開く流れで読む。開いたファイル名がいつもの所に出る |
| UC-3 | 上書き保存 | `Ctrl`＋`S` | サーバーのファイルを開いていれば、**問わずに**その同じファイルを更新する（`JDG-2589`） |
| UC-4 | サーバーへ保存 | ファイルに保存 → Dummy Server → 名前 → Save | 無い名なら新しく書く。**既にあるファイルに重ねるときは、同名でも GRS 自身の「上書きしますか？」が出る**（`DI-4`。ローカルの「ファイルに保存」と同じ）。保存したファイルがその後の「開いているファイル」になり、`Ctrl`＋`S` はそこへ書く |
| UC-5 | ローカルで開く・保存 | 開く → This PC ／ ファイルに保存 → 5 つの形式 ／ ドラッグ＆ドロップ | 通常の GRS と同じ |
| UC-6 | 新しい文書を初めて保存 | 新規 → `Ctrl`＋`S` | 今までどおり Windows の窓（サーバーへは「ファイルに保存」から） |
| UC-7 | 失敗 | サーバーを止めた後に保存する／使えない名前 | GRS のいつものファイルの失敗の知らせ。ファイルは変わらない |
| UC-8 | 終える | 黒い窓を閉じる | サーバーが止まる。`schedule-data` は残る |

**しないこと**: サーバー上の削除・名前の変更・下のフォルダ、ログイン、同時編集の検知（2 つの窓で同じファイルを保存すると、後に保存したほうが残る）。

### サーバーで使えるファイル名（`JDG-2595`）

Windows で使える名なら日本語も使えます。`\ / : * ? " < >`・縦線・制御文字・先頭の `.` や空白、`CON` などの予約名は使えません。末尾は `.json` です（書かなければ足します）。

## しくみ

| 部品 | ファイル | 役目 |
|---|---|---|
| ページ側 | `app/demo-client.js` | GRS が起動時に一度だけ読む `window.showOpenFilePicker` / `showSaveFilePicker` を包む。ファイルを選ぶ所だけをサーバーに替え、サーバーのファイルは `getFile()` が GET、`createWritable()` の `close()` が PUT の「ファイルの手」として GRS に渡す |
| ビルド | `build-demo.mjs`（`npm run build:demo`） | 一式と zip を `dist-server-sync-demo/` に作る。`dist/index.html` を**読むだけ**で、デモのスクリプトを GRS のスクリプトの前に足した `GRS-Demo.html` を書き、CSP の `script-src` にそのハッシュを足す。`dist/index.html` が前後で同じバイトであることを確かめて sha256 を出す |
| サーバー | `server/grs-demo-server.ps1`、`start-server.cmd` | Windows PowerShell 5.1 の `TcpListener`＋`SslStream`。導入も管理者権限も要らない |
| データ | `schedule-data/`（＋ビルド時に `sample-schedule/Three-Year Product Plan.json`） | GRS JSON 3 つ（`JDG-2585`）。MSPDI のサンプル 2 つは、GRS で開いて GRS JSON で保存したもの |
| 試験 | `tests/server-sync-demo.e2e.mjs` | 本物のサーバー・`GRS-Demo.html`・Chromium で UC-1〜UC-4・UC-7 を通す |

サーバーの API（ページとサーバーは同じ起源なので、GRS の CSP `connect-src 'self'` のままで届きます）:

| 要求 | 中身 |
|---|---|
| `GET /` | デモのページ |
| `GET /api/files` | `schedule-data` の `*.json` の一覧（`name`・`size`・`modified`） |
| `GET /api/files/<名>` | 1 つのファイル（無ければ 404） |
| `PUT /api/files/<名>` | 本文をそのファイルとして書く（置き換え。いったん `.part` に書いてから差し替える） |

守り: `127.0.0.1` だけで待ち受ける。`Host` がこのサーバーの名でなければ断り、PUT は `Origin` がこのサーバーでなければ断る（`JDG-1013` と同じ考え方）。名は上の規則だけを通し、`schedule-data` の外へは出ない。1 回に書けるのは 64 MB まで。

サーバーの引数: `-Port <番号>`（既定 8443）、`-DataDir <フォルダ>`、`-Page <html>`、`-NoBrowser`、`-NoTrust`（信頼を問わない。試験用）、`-RemoveCertificate`（証明書を消して終える）。`start-server.cmd -Port 9443` のように渡せます。

## 試験

```bash
npm run build:demo
```

```bash
node tools/gate/gate-queue.mjs run -- node demo/server-sync/tests/server-sync-demo.e2e.mjs
```

サーバーは一時フォルダに写した `schedule-data` に書くので、`dist-server-sync-demo` の中身は変わりません。

## 危うい所

- 会社の PC では、方針で PowerShell の実行が止められていることがあります（`start-server.cmd` は `-ExecutionPolicy Bypass` で起こしますが、グループポリシーには勝てません）。
- 自己署名の証明書は `Cert:\CurrentUser\My`（個人）と、[はい] と答えたときは `Cert:\CurrentUser\Root`（信頼されたルート証明機関）に、「GRS Demo Server (localhost)」の名で残ります。要らなくなったら `start-server.cmd -RemoveCertificate` で両方から消せます（Windows が消してよいかを問います）。`certmgr.msc` からも消せます。
- 会社の PC では、方針で「信頼されたルート証明機関」に入れられないことがあります。そのときは [いいえ] と同じく、警告を通り抜けて使います。
- ポート 8443 が使われていると起動しません。`start-server.cmd -Port 9443` で別の番号にします。
- デモの「単一 HTML」書き出しは、デモのスクリプトごと書き出します（通常の GRS の書き出しは変わりません）。
