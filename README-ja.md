# GoodRelax Scheduler（GRS）

[English](README.md) | 日本語

1 つの HTML ファイルでできた日程表のエディターです。ブラウザーで動き、インストールもサーバーも要りません。

## すぐに試す

- **ブラウザーで開く:** <https://goodrelax.github.io/gr-scheduler/>
- **ダウンロードする:** <https://goodrelax.github.io/gr-scheduler/download/>
  - `GRS.html` —— アプリ全体が 1 つのファイルです。好きな場所に保存し、ブラウザーで開きます。オフラインでも動きます。
  - `grs-relay.mcpb` —— GRS Relay。開いている日程表を AI に扱わせるためのものです（下を参照）。
  - `grs-server-sync-demo.zip` —— 同じ PC の上の小さな HTTPS サーバーで日程表を開き・保存するデモです（Windows）。

## 状態: α 版

- 版 `2026.1019.22508`、タグ `Alpha-20261019T022508Z`（2026-10-19）。
- この版でできること・分かっている制約・インストール方法は、[リリースノート](docs/release-notes/Alpha-20261019T022508Z.md) と [GitHub Releases](https://github.com/GoodRelax/gr-scheduler/releases) を見てください。
- 残っている項目は [引継書](docs/development-records/handoff.md) と [変更要求](change-request/) にあります。
- 版のあいだで変わることがあります。ファイルのバックアップを取っておいてください。

## AI と使う（GRS Relay）

GRS Relay は、MCP に対応した AI のデスクトップアプリにインストールする小さな MCP サーバーです。AI からの依頼を、あなたが開いている GRS のページへ伝えます。AI は日程表を読み、書き換え、遅延診断を実行し、ファイルを保存できます。変更はすべて画面で見えます。日程表のデータはブラウザーの中にだけあり、GRS Relay は写しを持ちません。インストール方法とページの接続方法は、ダウンロードページにあります。

## ファイル

- **GRS JSON** —— GRS の形式です。1 つのファイルに日程表の全体が入ります。
- **MSPDI**（Microsoft Project の XML）—— 読み込みと書き出し。

## 文書

- GRS の紹介: <https://goodrelax.github.io/gr-scheduler/about/>
- 仕様: <https://goodrelax.github.io/gr-scheduler/spec-html/>

## ご意見

不具合や要望は [GitHub Issues](https://github.com/GoodRelax/gr-scheduler/issues) へお寄せください。

## 開発する人へ

```bash
npm ci
npm run build    # dist/index.html（1 ファイルのアプリ）を作る
npm test
```

仕様が唯一の正です。原稿は `docs/spec/_source` にあり、`npm run gen` が生成の表を作り直します。

## ライセンス

Apache License 2.0。[LICENSE](LICENSE) と [NOTICE](NOTICE) を参照してください。
