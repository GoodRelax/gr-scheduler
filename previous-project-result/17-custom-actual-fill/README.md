---
type: Design Sample
title: カスタムカラーの実績の塗り —— 触って決めた導き方
description: カスタムカラーを選んだタスクの実績バーの塗りを、いまの式（CV-6）と 4 つの別案で明暗・モノクロ・任意の #rrggbb について並べ、コントラスト比と「黒・白に潰れる」「灰に色が付く」を数で示す 1 ファイルの見本。利用者は案 D（比を守る）を採った。2026-09-24。
tags: [colour, custom-colour, actual-bar, contrast, monochrome, sample]
phase: design
status: accepted
---

# カスタムカラーの実績の塗り —— 触って決めた導き方

- 作った日・決めた日: 2026-09-24
- 見本: [`custom-actual-fill-sample.html`](custom-actual-fill-sample.html)（**1 ファイルで完結する。ダブルクリックすれば開く。** サーバーも通信も要らない）
- 出荷ビルドを押して実物を撮る探索子: [`shoot-shipped-build.mjs`](shoot-shipped-build.mjs)（`node previous-project-result/17-custom-actual-fill/shoot-shipped-build.mjs [出力先]`。既定の出力先は `scratch/cv6/`）
- 裁定: [`rulings.md`](../../docs/development-records/rulings.md) の `JDG-540`
- 仕様への反映: [`CR-564`](../../change-request/CR-564-a-custom-colours-actual-bar-keeps-its-hue-and-its-contrast.md)（表 T-017b の `CV-10`、表 T-206 の `S-415` ・ `S-416`）
- 不具合台帳: [`defects.md`](../../docs/development-records/defects.md) の `DFC-960`

## 何を決めたか

いまの `CV-6` は、選んだ色の HSL の明度から 46 を引く（暗いテーマは 38 を足す）。そのため明度が 46 未満の色の実績は黒に、暗いテーマで 62 を超える色の実績は白に潰れた。灰には赤みも付いた。
見本は、いまの式と 4 つの別案を並べた。利用者は **案 D「比を守る」** を採った。案 D は、明度を床と天井のあいだに収めてから比を測る。`CT-3` に届かなければ逆の向きへ振る。

## 見本の見方

- 表の 1 行が 1 色、1 列が 1 案 × 1 テーマである。セルには予定バー（外）と実績バー（中）を、アプリと同じ縁の色と高さの比で描いた。
- 「実/予」は実績と予定の塗りのコントラスト比（`CT-3`、3 以上）。「色味」は実績の `#rrggbb` の成分の最大 − 最小（0 は無彩色）。
- 右の欄で、色の追加・テーマ・モノクロ・案の数を変えられる。下の地図は、選んだ行の色相で彩度 × 明度を掃き、どこで壊れるかを色で示す。表の下の「全体の数」は 4096 色の掃き（測り方は見本の中に書いてある）。
