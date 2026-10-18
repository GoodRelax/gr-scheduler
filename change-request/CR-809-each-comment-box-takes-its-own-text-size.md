# CR-809 —— コメントボックスごとに本文の字の大きさを持てる

> 状態: ⭐ **当てた** —— 2026-10-19、取次の席 E が仕様とコードを当てた（変更履歴は 5.17、`perf-pending` に 1 行）。仕様だけを読む別の席が試験を書いた（`tests/unit/cr-809-each-comment-box-has-its-own-text-size.test.ts`）。
> 当てる裁定: `JDG-2895`（`DFC-3345`）。同じ席の問いで `JDG-2896`（`DFC-3346`、書き出しにメモを載せる件は取り下げ）。
> 新しい ID: `_assets/fig-erd-detail.md` の `AT-168`、`_assets/tbl-settings.md` の表 T-217 の `S-624`、表 T-016 の `PR-50`、表 T-108 の `CM-102`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-008`（見たとおりに応える）と `CH-3`。利用者が `GRS Relay` 経由で AI に 195 タスクの計画を組ませたとき、AI がボトルネック 11 件に付けたコメントの字が、表示倍率 50 % でも大きく描かれ、長い文が右へ伸びて画面の外で切れた。AI にも人にも、コメントの字の大きさを変える道が無かった（全体の文字サイズの段 `fontSizeStep` だけ）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R2`**（規則の在り処が 1 つ）。
出たこと: ① 範囲は表 T-217 の 1 行（`S-624`）に置き、命令の拒み・パネルの欄・描くときの寄せの 3 か所が同じ生成物 `NOT_STORED_ANNOTATION_BOUNDS` を読む。② `null` の既定は文字サイズの段（表 T-215）であり、数を写さない —— 行の既定は `S-3` と同じ `index` の形で書き、生成器はその既定を `null` として出す（描く側が表 T-215 を引く）。③ 生成器は `index` の既定を文書の設定の導出（`SETTINGS_DERIVED`）にも拾っていた —— 実体の列（鍵に `.` を持つ行）は導出の設定ではないので外した。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 列の名は `textSizePx`（`strokeWidthPx` と同じ「何の・単位」の形。`textColor` の隣）。パネルの欄の名は「文字の大きさ / Text Size」、単位の px を添える。
2. ⭐ 欄を空にして確定すると `null` を書き、文書の文字サイズに戻る（`strokeWidthPx` の欄と同じ）。
3. ⭐ 字の大きさは今までどおりズームによらず画面の px で描く（`FR-019` の線の太さと同じ扱い）。
4. ⭐ 列を持たない `CommentBox` の項は、読むときに `null` を足す —— 05-07 の注記の見た目の列を補う段に `AT-168` を加えた。`null` は列を足す前と同じ絵なので、α で保存された文書も絵が変わらずに開く。⚠️ 「運用の前は読み替えない」とは別の、既にある補いの段の仲間である（公式運用の宣言のときに一緒に消す 5 つの 1 つ）。
5. ⭐ 形式の版を `2026-10-18T23:17:29Z` へ上げた（`FR-073`、`DFC-2950` の試験に 1 組足した）。版の上がった文書を古い造りが開くと、版が新しいことを告げる。

---

## 1. 対応

| # | 直すこと | 仕様の ID | 直す物 |
|---|---|---|---|
| 1 | コメントボックスに本文の字の大きさの列を足す（整数 px、`null` = 文字サイズの段） | `AT-168`・表 T-217 の `S-624`・`FR-019`・`FR-097` | `erd.json`・`settings.json` → 生成（スキーマ・実体の型・範囲の表） |
| 2 | 範囲は 9 〜 24 px（`fontMin` 12 を割る —— 利用者が定めた）。`FR-077` の可読の下限は当てない | `S-624`・`FR-077`・`FR-097` | `settings.json`、原稿 2 か所 |
| 3 | 命令 `setCommentBoxTextSizePx`（範囲の外と整数でない値を拒む） | 表 T-108 の `CM-102` | `document-commands.json`（席 B に同じ文を送った）、`edit-annotation.ts` の `commentBoxLookChange` |
| 4 | パネルの欄（文字色の次） | 表 T-016 の `PR-50`・`FR-006` の見た目の行の順 | `property-items.json`・`display-words.json`、`field-commit.ts`、`properties-panel.ts` の単位 |
| 5 | 本文の箱は、その箱の字の大きさで量る | `FR-097` | `comment-box.ts` の `commentGeometry`、`highlight-box.ts` の `drawnCommentTextSizePx` |
| 6 | 列の無い項に `null` を足して読む | 05-07 の補いの段 | `json-codec.ts` の `ANNOTATION_LOOK_COLUMNS` |
| 7 | 形式の版を上げる | `FR-073`・`DR-4` | `generate_startup_template.py` → 生成。見本の JSON の版 |

## 2. 影響

```
仕様の他の行     FR-006 の見た目の行の順・FR-019 の 3 文・FR-077 に 1 文・FR-097 の 4 文・05-07 の補いの段 2 か所
生成物           tbl-settings.md・fig-erd-detail.md・tbl-property-items.md・tbl-document-commands.md・tbl-row-id-prefixes.md・
                 grs-document.schema.json・grs-commands.schema.json・grs-json-schema.ts・schedule-entities.ts・範囲の表 3 か所・
                 起動の文書・計測の文書・MCP の道具の説明・辞書とパネルの項目の写し・画像から作る指示
見本             docs/about・demo・guides の見本の版。計画の JSON（project-plan.json ほか）は古い版のまま開くので触らない
試験             新しい試験は別の席が仕様だけから書く。命令の数を数える試験（cr-766 の 4 本）・仕様の文を引く試験（7 本）・固定の箱（2 本）・形式の版の試験の組が変わる
検査             検査 23 の免除の数を 1 つずつ上げた（列を足すだけの CR は 1 つ上げてよい —— JDG-300）。検査 37 の対の記録に PR-50 を足した
毎フレームの仕事 コメントボックス 1 つにつき、字の大きさを 1 度選ぶ（列か段か）だけ。描く量は変わらない
```

## 3. 取り下げ

利用者の報告の 6.4-18（SVG / PNG にタスクのメモが入らない）は `JDG-2896` で取り下げた —— メモはタスクの補足であり、画面に全部は入らない。絵に載せたい言葉はコメントボックスで書く。
