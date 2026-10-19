# GoodRelax Scheduler（GRS）

[English](README.md) | 日本語

HTML ファイル 1 つで動くガントチャートの日程管理ツールです。予定と実績の比較、遅延診断、MSPDI の読み込み・書き出し、AI エージェント向けの MCP サーバーを備えます。インストールもサーバーも不要です。

## すぐに試す

- **ブラウザーで開く:** <https://goodrelax.github.io/gr-scheduler/>
- **ダウンロードする:** <https://goodrelax.github.io/gr-scheduler/download/>
  - `GRS.html` —— アプリ全体が 1 つのファイルです。好きな場所に保存し、ブラウザーで開きます。オフラインでも動きます。
  - `grs-relay.mcpb` —— GRS Relay。開いている日程表を AI に扱わせるためのものです（下を参照）。
  - `grs-server-sync-demo.zip` —— 同じ PC の上の小さな HTTPS サーバーで日程表を開き・保存するデモです（Windows）。

## 状態: α 版

- 版 `20261019T022508Z`、タグ `Alpha-20261019T022508Z`（2026-10-19）。
- この版でできること・分かっている制約・インストール方法は、[リリースノート](docs/release-notes/Alpha-20261019T022508Z-ja.md) と [GitHub Releases](https://github.com/GoodRelax/gr-scheduler/releases) を見てください。
- 残っている項目は [引継書](docs/development-records/handoff.md) と [変更要求](change-request/) にあります。
- α 版のあいだは、版が上がると GRS JSON の形が変わることがあり、古い版で保存したファイルを新しい版で開けない場合があります。使っている版の `GRS.html` を、ファイルと一緒に残しておいてください。

## AI と使う（GRS Relay）

GRS Relay は、AI アプリと GRS のページを結ぶ MCP サーバーです。MCP（AI アプリが外の道具を使うための共通の仕組み）に対応した AI アプリなら使えます。AI は、あなたが開いている日程表を読み、書き換え、遅延診断を実行し、ファイルを保存できます。変更はすべて画面で見えます。日程表のデータはブラウザーの中にだけあり、GRS Relay は写しを持ちません。

- `grs-relay.mcpb` —— MCP の束（.mcpb）を読み込める AI アプリなら、ドラッグ & ドロップでインストールできます。
- `grs-relay.mjs` —— ほかの MCP 対応アプリでは、Node.js 18 以降でこのファイルを MCP サーバーとして登録します。

インストール方法は、[ダウンロードページ](https://goodrelax.github.io/gr-scheduler/download/) にあります。

## ファイル

- **GRS JSON** —— GRS の形式です。1 つのファイルに日程表の全体が入ります。
- **MSPDI**（Microsoft Project の XML）—— 読み込みと書き出し。
- **単一 HTML** —— アプリと日程表を 1 つの HTML ファイルにまとめて書き出せます。受け取った人は、その .html ファイルをブラウザーで開くだけで日程表を見て、編集できます。GRS を持っていない相手にも、そのまま配れます。

## 文書

- GRS の紹介: <https://goodrelax.github.io/gr-scheduler/about/>
- 仕様: <https://goodrelax.github.io/gr-scheduler/spec-html/>

## ご意見

不具合や要望は [GitHub Issues](https://github.com/GoodRelax/gr-scheduler/issues) へお寄せください。書いてほしいことは [CONTRIBUTING.md](CONTRIBUTING.md) にあります。脆弱性は公開の Issue ではなく、[SECURITY.md](SECURITY.md) の手順で報告してください。

## 開発する人へ

```bash
npm ci
npm run build    # dist/index.html（1 ファイルのアプリ）を作る
npm test
```

仕様が唯一の正です。原稿は `docs/spec/_source` にあり、`npm run gen` が生成の表を作り直します。

## ライセンス

Apache License 2.0。[LICENSE](LICENSE) と [NOTICE](NOTICE) を参照してください。
