# GRS サーバー連携デモ（Windows）

[English](README.md) | 日本語

GoodRelax Scheduler（GRS）は 1 つの HTML ファイルで、サーバーを持ちません。このデモは GRS の別の組み立てで、ファイルを HTTPS サーバーの先のフォルダ（**Dummy Server**）にも置けます。開く・保存は、PC のファイルとまったく同じ操作です。GRS 本体は変えていません。

```mermaid
flowchart LR
  B["ブラウザー<br>GRS-Demo.html"] -- "GET / PUT /api/files" --> S["HTTPS サーバー<br>（手元の PC）"]
  S --- D[("schedule-data<br>*.json")]
```

## 3 つの段

| 段 | すること | 時間 | 分かること |
|---|---|---|---|
| 1. 見る | zip のデモを動かす | 10 分 | サーバーがするのは JSON ファイルの一覧・読み・書きだけ |
| 2. 自分のデータ | 自分の日程を GRS JSON にして、デモのサーバーに置く | 30 分 | 自分のデータがサーバー経由で GRS に出る |
| 3. 自分のサーバー | 同じ 3 つの口を、自分のサーバーに作る | 半日 | 自分のシステムをつなぐのに何が要るか |

## 1. 見る

1. `grs-server-sync-demo.zip` を落とし、右クリック →「プロパティ」→「許可する」に印を付けて OK。
2. 展開し、`grs-server-sync-demo` フォルダの `start-server.cmd` をダブルクリック。
3. 初回だけ、Windows が `localhost` の証明書をインストールするかを問います。**[はい]** ならブラウザーは警告しません（**[いいえ]** なら、ブラウザーの警告で「詳細設定 → localhost に進む」を押す）。
4. Edge か Chrome で `https://localhost:8443/` が開きます。左上のロゴは **Demo** です。
5. **開く → Dummy Server** でファイルを選び、編集して `Ctrl`＋`S` ⇒ サーバーのファイルが更新されます。**ファイルに保存 → Dummy Server**（赤い 6 つ目）で名前を付けて保存します。
6. 黒い窓を見てください。`GET` と `PUT` の 1 行ずつが、ブラウザーがファイルを読んだ・書いた記録です。窓を閉じるとサーバーが止まります。

## 2. 自分のデータ

1. [GRS の紹介頁](https://goodrelax.github.io/gr-scheduler/about/?lang=ja#trial) の 05 のとおり、自分の日程データを AI で GRS JSON にします。
2. そのファイルを `schedule-data` に入れて、**開く → Dummy Server**。

## 3. 自分のサーバー

[SERVER-API-ja.md](SERVER-API-ja.md) を読みます（3 つの口と、ページを同じサーバーから配ること）。それと自分のシステムの API を AI に渡し、自分の言語でサーバーを書かせます。`server/` の PowerShell のサーバーが見本です。

## 知っておくとよいこと

- **まずファイル単位、細かい同期はその次。** このデモはファイルを丸ごと読み書きします。編集 1 件ずつ同期するなら、GRS には AI と同じ Agent API があります。それは次の段階で、このデモには入っていません。
- 段 1・2 は Windows だけ。段 3 は OS を問いません。
- 証明書を消すには `start-server.cmd -RemoveCertificate`。
- 詳しいことは[仕様書](https://goodrelax.github.io/gr-scheduler/spec-html/)と[コード](https://github.com/GoodRelax/gr-scheduler)にあります。デモを組み立てる人向けのメモは [DEVELOPING-ja.md](DEVELOPING-ja.md)。
