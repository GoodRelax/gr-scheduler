# GRS用 デモ・サーバー API仕様書

[English](DEMO-SERVER-API.md) | 日本語

> ⚠️ これは GRS 本体の API ではありません。サーバー連携デモのページ `GRS-Demo.html` が、サーバーに求める API の仕様です。GRS 本体の API は [Agent API](https://github.com/GoodRelax/gr-scheduler/blob/main/docs/spec/_assets/tbl-agent-api-members.md) です。

この仕様を満たせば、言語も OS も問いません。`server/grs-demo-server.ps1` は、この仕様を満たす見本の実装です。

## ページと API は 1 つのサーバーから

`GRS-Demo.html`（zip の中のものをそのまま）を、API と**同じサーバーから**配ってください。ページは自分を配ったサーバーとしか通信しません（Content-Security-Policy が `connect-src 'self'` だけを許す）。ページを別の所から開いて自分のサーバーを指しても、つながりません。CORS を設定しても変わりません。

HTTPS を使ってください。HTTP では、`localhost` を除き、GRS が使う PC のファイルの機能をブラウザーが止めます。

## API

| 概要 | API 名 | 返すもの |
|---|---|---|
| ページ | `GET /` | `GRS-Demo.html`（`text/html; charset=utf-8`） |
| 一覧 | `GET /api/files` | `200` と JSON の配列: `[{"name": "Plan.json", "size": 48211, "modified": "2026-10-18T13:05:00Z"}]` |
| 読む | `GET /api/files/{name}` | `200` とそのファイルの GRS JSON。無ければ `404`（「ファイルに保存」で新しい名を選んだときも、こう読まれる） |
| 書く | `PUT /api/files/{name}` | 本文は GRS JSON の丸ごと。古いものと置き換えて保存し、`2xx` を返す |

- `{name}` は UTF-8 で URL エンコードされて届きます（`encodeURIComponent`）。`.json` で終わるファイル名 1 つで、フォルダは含みません。
- 失敗したときは、`2xx` 以外の状態と、短い文の本文を返してください。GRS はいつものファイルの失敗の知らせを出し、文書はそのまま残します。文は、サーバーのログやブラウザーの開発者ツール（ネットワーク）で読む人のためのものです。

## 自分のデータの出し入れ

- **GET で変換する。** ファイルが読まれたときに、自分のシステムから GRS JSON を組み立てます。形は [GRS JSON のスキーマ](https://goodrelax.github.io/gr-scheduler/spec/_source/grs-document.schema.json) です。
- **PUT で書き戻す。** タスクは `schedule.tasks[].uid`（MSPDI の UID）で突き合わせます。使わない項目は受け取ったまま保ちます（GRS も知らないデータを捨てません）。
- まずは GET だけでも構いません。PUT は文を付けて断り、書き戻しは後から足せます。

## この仕様の範囲外

- **ログイン**: ページと API が同じ起源なので、ブラウザーは要求のたびにセッションの Cookie を送ります。今あるログインがそのまま効きます。ページは独自のヘッダー（Bearer トークンなど）を足せません。
- **2 人が同じファイルを保存したとき**: 後の PUT が残ります。保存は版の番号を持たないので、古い版からの保存を見分けるなら、サーバー側で独自に足すことになります。
- **編集 1 件ずつの同期**: それは Agent API の領分で、この仕様の範囲外です。

## AI への指示の例

```text
添付の DEMO-SERVER-API-ja.md の API 仕様を満たすサーバーを <言語> で書いてください。
GET /api/files/{name} は、私たちの API（添付）から GRS JSON（スキーマ添付）を組み立てて返す。
PUT /api/files/{name} は、タスクを uid で突き合わせて書き戻す。対応しない項目は私に聞いてください。
```
