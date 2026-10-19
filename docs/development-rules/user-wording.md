<!-- generated from docs/development-rules/user-wording.json by tools/generate_user_wording.py -- do not edit by hand; rebuild with npm run wording -->

# 利用者に見せる文の語 —— 日英の表（副）

**利用者が画面の外で読む文（README・リリースノート・ダウンロードページ・紹介ページ・デモの README）は、この表の `ja` / `en` の語で書き、`avoid-ja` / `avoid-en` の語を使わない。**

⭐ **正は GRS の用語集である** —— 画面に出る語は [`tbl-glossary.md`](../spec/_assets/tbl-glossary.md) と [`display-words.json`](../spec/_source/display-words.json) が持ち、この表より勝つ。この表は副で、日本人なら当たり前の語を Claude が開発の言い回しで崩さないためのハーネスである。
⛔ **この .md を手で直さない。** 正は [`user-wording.json`](user-wording.json)。`npm run wording` で作り直し、`npm run gen:check` が食い違いを赤にする。

| id | ja | en | meaning | avoid-ja | avoid-en | applies-to | remark |
|---|---|---|---|---|---|---|---|
| UW-1 | ダウンロードする | download | 配るファイルを取ってくる | 落とす・入手する | fetch, grab | `readme`, `release-notes`, `download-page`, `about-page`, `demo-readme` | - |
| UW-2 | ダウンロードページ | download page | 配るファイルを置いたページの名 | 入手のページ・入手の頁 | - | `readme`, `release-notes`, `about-page` | - |
| UW-3 | インストールする | install | アプリ・MCP サーバー・拡張機能を足す | 入れる | put in | `readme`, `release-notes`, `download-page`, `demo-readme` | - |
| UW-4 | インストール方法 | How to install | 足し方を説く節の見出し | 入れ方 | - | `readme`, `release-notes`, `download-page` | - |
| UW-5 | ダウンロードせずに使う | use it without downloading | ブラウザーで開くだけの使い方 | 入れずに使う | no install | `readme`, `release-notes`, `download-page` | - |
| UW-6 | 再インストールする | reinstall | 足したものを足し直す | 入れ直す | put back | `release-notes`, `download-page` | - |
| UW-7 | アンインストールする | uninstall | 足したものを取り除く | 外す・抜く | take out | `release-notes`, `download-page` | - |
| UW-8 | 起動する | start | アプリ・サーバーを動かし始める | 立ち上げる・起こす | wake | `readme`, `release-notes`, `download-page`, `demo-readme` | - |
| UW-9 | 拡張機能 | extension | ブラウザーや AI アプリに機能を足すもの | 拡張・足し物 | add-on piece | `readme`, `release-notes`, `download-page` | - |
| UW-10 | 接続する | connect | ページと GRS Relay を通じさせる | つなぐ・繋ぐ | hook up | `readme`, `release-notes`, `download-page`, `about-page` | - |
| UW-11 | GRS Relay | GRS Relay | AI からの依頼をページへ伝える MCP サーバー | 取次 | the relay | `readme`, `release-notes`, `download-page`, `about-page` | 利用者向けの文では製品の名で呼ぶ |
| UW-12 | 依頼 | request | AI が GRS にしてほしいこと | 求め | - | `readme`, `release-notes`, `download-page`, `about-page` | - |
| UW-13 | 自動で | automatically | 人の操作なしに機械がする | 自分で（機械が主語のとき） | by itself | `readme`, `release-notes`, `download-page`, `about-page` | - |
| UW-14 | バックアップを取る | keep a backup | ファイルの複製を残して守る | 控えを取る | keep a copy | `readme`, `release-notes` | - |
| UW-15 | ページ | page | ウェブのページ | 頁 | - | `readme`, `release-notes`, `download-page`, `about-page`, `demo-readme` | - |
| UW-16 | クリックする | click | マウスでボタンなどを押す | 押す（マウスの操作を言うとき） | press (with the mouse) | `readme`, `release-notes`, `download-page`, `demo-readme` | キーやボタン全般を言うときは「押す」でよい。画面のボタンの名は display-words.json が正 |

**applies-to の値**

| 値 | 何か |
|---|---|
| `readme` | README.md / README-ja.md |
| `release-notes` | docs/release-notes/ |
| `download-page` | docs/download/index.html |
| `about-page` | docs/about/index.html |
| `demo-readme` | demo/server-sync/README*.md |
