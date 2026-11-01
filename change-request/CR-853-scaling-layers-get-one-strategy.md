# CR-853 —— 拡大縮小の層を 1 つの戦略にまとめ、倍率と px の名前と意味を決め直す

> 状態: ✏️ **下書き** —— 2026-10-25、子セッション `scaling-strategy`（枝 `claude/sleepy-elbakyan-9a7d86`、起点 develop `80927c91d`）。仕様・スキーマ・コードは 1 行も変えていない。
> 当てる裁定: `JDG-3290` 〜 `JDG-3297`（study 78 の 5 節の 7 問。JDG 行は調整役の了承の後に台帳へ書く）。不具合: `DFC-3594`（期間を固定した絵が `devicePixelRatio` で 0.33px ずれる）。
> 調べ: [`studies/78-scaling-strategy/`](../studies/78-scaling-strategy/README.md)（測った数・見本・掃きの台本）。
> ⭐ **本 CR は振る舞いの行だけを持ち、`CR-851` の後に着地する**（調整役の裁定 2026-10-25）—— 外部契約の行（鍵・命令・説明の名と意味）は `CR-851` の行の確かめへ渡した（3 節）。起点は develop のまま書く。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定の鎖（`rulings.md` を「表示の倍率」「ズーム」「`zoomY`」「`displayScale`」「コメントボックス」「`strokeWidthPx`」「ブラウザ」で引いた）

| 裁定 | 何を決めたか | 本 CR との関係 |
| --- | --- | --- |
| `JDG-131` | 表示の倍率はプロジェクトの大きさに合わせて絵ごと縮めるためにある（パネルの幅と字下げにも掛ける） | 生かす —— 2 問目（箱も従う）の根拠 |
| `JDG-152`・`JDG-154` | 表示の倍率の段と既定、`Ctrl` ＋ `Shift` ＋ `+` / `-` は GRS、`Ctrl` ＋ `+` / `-` はブラウザ | 生かす |
| `JDG-456`・`JDG-464`・`JDG-2895` | ハイライトボックスとコメントボックスの線・字は「倍率に追随させない」「画面の px で描く」 | **表示の倍率について覆す**（`JDG-3291`）。ズームで変えないことは生かす |
| `JDG-710`・`JDG-715`・`JDG-1562` | 行の最小の高さは表示の倍率 100 のときの画面の px で、表示の倍率でだけ伸び縮みする | 生かす —— 2 問目の決まりがこの扱いを全部の `…Px` へ広げる |
| `JDG-952` | 選んだ線に足す 2px（`S-447`）は画面の px で、表示の倍率に従わない | 生かす —— 文書に保存しない道具の値であり、本 CR の `…Px`（文書の値）の決まりの外 |
| `JDG-1473` | 期間を固定した絵の行の高さは表示の倍率で決まり、`zoomY` は効かない | 生かす（3.2 節 `I-8`） |
| `JDG-2682` | `fontScale` を `fontSizeStep` へ改名 | 名は生かす。値を語にする（`JDG-3295`） |
| CR-851 の席の裁定 14・15（JDG 行になる前） | `S-236` の 0.625 を値に畳む。タスクの線の太さ 1〜10 は表示の倍率 100 の px | 生かす —— 本 CR の数はすべて畳んだ後の値で書く |
| CR-851 の指摘 55（一括の「推奨どおり」） | `rulerFontSizePx`・`rulerHeightPx` は今のまま | **覆す**（`JDG-3294`） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-004`（WYSIWYG、`FR-080`）と `GL-006`（読む人の指定を強制しない、`FR-039`）。利用者 2026-10-25「拡大縮小関係について、別途戦略を整理したい。 困難小手先でやったらコケるやろ？」と「WYSIWYGにするので、ブラウザの倍率によってPNGが変わるのはいい気がするが別途整理が必要。」。初見の AI が GRS JSON とスキーマだけを見て迷わないこと（CR-851 の席の裁定 16・17）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **R2 の OKPN・OMPV**（`JDG-3223`・`JDG-3224`）と、CR-851 の命名規則（席の裁定 18）。
出たこと: `zoomY` は 1 未満で「畳む深さ」、1 以上で「大きさ」を言い、OMPV に反する（`JDG-3293`）。`…Px` は表示の倍率に従うものと従わないものの 2 つの意味を持ち、初見の読み手が区別できない（`JDG-3291`）。`rulerFontSizePx` / `rulerHeightPx` は書き手が 2 人（作成者と文字サイズの段）の値である（`JDG-3294`）。`zoomX` の 1 は記録の無い定数 3.75px/日 を指す（`JDG-3292`）。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ `dayWidthPx` の範囲は、今の `zoomX` の範囲（0.02 〜 240）に 3.75 を掛けた **0.075 〜 900** とする —— 振る舞いを変えないため。既定は 3.75（今の `zoomX` ＝ 1）。
2. ⭐ `verticalZoomRatio` の範囲は **1 〜 240**（上は今の `zoomMax`）。字の側の上限（`FR-016`・表の `BC-*`）はそのまま効く。既定は 1。
3. ⭐ `taskGroupAutoExpandDepth` の既定は **3**（今の `zoomY` ＝ 1 で描く深さ 4 に当たる）。範囲は 0 〜 `maxGroupDepth` − 1（今は 4）。
4. ⭐ 縦のホイールは今と同じ道筋をたどる —— 縮める向きは、`verticalZoomRatio` が 1 より大きければ `S-53` の刻みで 1 へ向けて縮め、1 なら `taskGroupAutoExpandDepth` を 1 減らす。拡げる向きは、深さが上限でなければ 1 増やし、上限なら比を拡げる。⭐ 文書の中で `auto` のタスクグループが持たない深さへの刻みは飛ばす（押しても何も変わらない刻みを作らない）。
5. ⭐ 期間を固定した絵（`IX-14`）は、文書が持つ `verticalZoomRatio` と `taskGroupAutoExpandDepth` を読まず、比 1・深さ 3 で組む —— 2 つは画面のズームで書き換わる値なので、読むと `WY-4`（ズームで絵を変えない）を破る。今の「`zoomY` を 1 と置く」と同じ絵になる。
6. ⭐ 期間を固定した絵の `App Header` の帯の高さは、DOM から測らず **29px**（今の作りが `devicePixelRatio` 1 と 2 で測る値）の道具の定数とする（`DFC-3594`）。画面の帯は今どおり測る。
7. ⭐ （CR-851 へ渡した —— 変換のスクリプトは CR-851 が持つ）α 版の文書を β 版へ移す変換（CR-851 の席の裁定 16 の、GitHub からダウンロードさせるスクリプト）は次のとおり写す: `displayScale` → `displayScalePercent`（同じ数）、`zoomX` → `dayWidthPx` ＝ 3.75 × `zoomX`、`zoomY` → `verticalZoomRatio` ＝ max(1, `zoomY`) と `taskGroupAutoExpandDepth` ＝（`zoomY` で今描く深さ）− 1、`fontSizeStep` の `S` / `M` / `L` → `small` / `medium` / `large`、`rulerFontSizePx`・`rulerHeightPx` → 捨てる。

---

## 1. 対応

⚠️ 4・5・7・8 の名・鍵・命令の行は CR-851 が当てる（3 節）。本 CR はその名を使う振る舞いの行だけを当てる。

| # | 直すこと | 裁定 | 仕様の ID |
| --- | --- | --- | --- |
| 1 | GRS はブラウザの倍率と OS の倍率を読まず、変えず、打ち消さない。画面の単位は CSS の px だけ | `JDG-3290` の前提（study 78 の P1・P2） | `FR-039` に段を足す |
| 2 | 書き出しは 2 本立てのまま —— 期間を固定していなければ画面のとおり、固定していれば文書だけで決まる。固定した絵は DOM から測った寸法を入力にしない | `JDG-3290`・`DFC-3594` | `FR-080`・`FR-025` の `IX-12` / `IX-13` |
| 3 | 文書の `…Px` はどれも「表示の倍率 100 のときの CSS の px」。コメントボックスとハイライトボックスも表示の倍率に従う | `JDG-3291` | 表 T-252・`FR-097`・`FR-019`・`S-132` / `S-369` / `S-374` / `S-624`・`AT-115` / `AT-122` / `AT-145` / `AT-149` / `AT-168` |
| 4 | `zoomX` → `dayWidthPx`、`displayScale` → `displayScalePercent` | `JDG-3292` | `S-75`・`S-234`・`S-1`・`S-54` / `S-55` / `S-97` / `S-98`・`DS-4`・`FR-016`・`FR-017`・`CM-65` / `CM-71` / `CM-74` |
| 5 | `zoomY` → `verticalZoomRatio`（1 以上）と `taskGroupAutoExpandDepth`（0 〜 4） | `JDG-3293`・`JDG-3296` | `S-76`・新しい `S-625`（仮）・`S-87` / `S-88`・`DS-8`・`FR-018`・表 T-329 の `TD-4`・`FR-055`・表 T-262 の `ZE-1` 〜 `ZE-3`・`BC-1`・`IX-14`・`CM-65` / `CM-71` |
| 6 | `rulerFontSizePx`・`rulerHeightPx` を文書から外す。⚠️ 問うたときの場面は「設定の面で作成者が数を入れられる」と述べたが誤り —— 設定の面の 2 つは読むだけの行（表 T-380 の `RN-5`）で、書けるのはファイルを手で直す人か、ファイルを書く AI だけである。外す理由（書き手が 2 人、文字サイズの段で上書きされる）は変わらない | `JDG-3294` | `S-2` / `S-3`（保存しない定数へ）・`FR-039`・`RN-5`・`K-2` / `K-3` |
| 7 | `fontSizeStep` の値を `small` / `medium` / `large` に | `JDG-3295` | `S-70`・表 T-215 の `S-121` 〜 `S-123`・`CM-62` |
| 8 | 量の接尾辞 `Px` / `Percent` / `Ratio` / `Fraction` を命名規則に足し、スキーマの注記に書く | `JDG-3297` | CR-851 の命名規則・`erd.json` の `schemaNotes` |

## 2. 影響（本 CR の分。外部契約の行は CR-851 が持つ）

```
外部契約     本 CR には無い（CR-851 へ渡した —— 3 節）
仕様の他の行 FR-016・FR-017・FR-018・FR-019・FR-025・FR-039・FR-055・FR-080・FR-097、表 T-252・T-262・T-329・T-005a、
             tbl-settings の T-201 / T-202 / T-203 / T-205 / T-215 / T-217 の行、tbl-glossary の K-2 / K-3 / K-63 / K-64、
             published-entries.json（zoomY を名指す 3 か所）、display-words.json（1851・1893・2335・2342・2671 行目）
             —— 数は impact.py で当てる前に測る（下書きの数は grep の目安: zoomY 22 か所・zoomX 10 か所 in 01-04）
生成物       grs-document.schema.json・grs-commands.schema.json・tbl-settings.md・tbl-document-commands.md・tbl-glossary.md
試験         縦のホイールの道筋・全体表示・端の判定・LOD の試験を書き直す（仕様だけを読む別のサブエージェント）。
             期間を固定した絵が devicePixelRatio 1 / 1.25 / 1.5 / 2 で同じになる試験を足す（study 78 の掃き）
毎フレーム   変わらない（読む値が 1 つから 2 つになるだけ）
```

## 3. 外部契約の行 —— CR-851 の行の確かめへ渡した

調整役の裁定（2026-10-25、案 b）: GRS JSON の鍵・命令・`Agent API` の説明・スキーマの注記の行は、**CR-851 の行の確かめで利用者が 1 度だけ見る**。本 CR はそれを持たない。
渡した表: 共有のメモの `scaling-names-for-cr851-2026-10-25.md`（古い鍵と命令・新しい鍵と命令・意味・JDG、量の接尾辞の決まり、α 版から β 版への写し方、スキーマの説明の下書き E-1 〜 E-22）。
⚠️ 本 CR の 4 節の振る舞いの行は、CR-851 が当てた後の名（`displayScalePercent`・`dayWidthPx`・`verticalZoomRatio`・`taskGroupAutoExpandDepth`・`fontSizeStep` の `small` / `medium` / `large`）で書く。CR-851 が名を変えて着地したら、それに合わせる。

| 渡した名 | 前 | 後 | JDG |
| --- | --- | --- | --- |
| 表示の倍率 | `displayScale` | `displayScalePercent` | `JDG-3292` |
| 横のズーム | `zoomX` | `dayWidthPx`（3.75 × `zoomX`） | `JDG-3292` |
| 縦のズーム | `zoomY` | `verticalZoomRatio`（1 以上）と `taskGroupAutoExpandDepth`（0 〜 4） | `JDG-3293`・`JDG-3296` |
| 文字サイズ | `fontSizeStep`: `S` / `M` / `L` | `small` / `medium` / `large` | `JDG-3295` |
| 目盛 | `rulerFontSizePx`・`rulerHeightPx` | 無くす | `JDG-3294` |
| `…Px` の意味 | 表示の倍率に従うものと従わないもの | すべて表示の倍率 100 の CSS の px（箱も従う） | `JDG-3291` |
| 書き出しの説明 | `exportSvg`・`exportPng` | 期間の固定の有無で何に従うかを書く | `JDG-3290` |
| 量の接尾辞 | —— | `Px` / `Percent` / `Ratio` / `Fraction` | `JDG-3297` |

## 4. 外部契約でない仕様の行（当てるときに行ごとに前 / 後を書く）

| # | 直す所 | 中身 |
| --- | --- | --- |
| I-1 | `FR-039` | 段を足す: GRS は `devicePixelRatio`・`outerWidth`・`screen.*` を組み方・文書・書き出しの入力にしない。ブラウザの倍率を CSS の `zoom` / `transform` で打ち消さない。画面の単位は CSS の px（study 78 の F1〜F7） |
| I-2 | 表 T-252 | `DS-4` を「`dayWidthPx` に表示の倍率 ÷ 100 を掛ける」へ。`DS-8` を `verticalZoomRatio` へ。コメントボックスとハイライトボックスの `…Px` に「掛ける」の行を足す |
| I-3 | `FR-097`・`FR-019`・`S-132` / `S-369` / `S-374` / `S-624` の注 | 「ズームによらず一定」に「表示の倍率には従う」を足す。`FR-097` の「線の太さに倍率を掛けてはならない」を「ズームを掛けてはならない」へ |
| I-4 | `FR-018`・表 T-005a・表 T-329 の `TD-4`・`S-87` / `S-88` | グループ LOD を `taskGroupAutoExpandDepth` で決める。しきい値の式（`S-87` / `S-88`）を退かせる。単調性の論証は「縮める向きの刻みは深さを減らすか比を縮めるだけ」で足りる |
| I-5 | `FR-055`・表の `BC-1` 〜 `BC-3` | 全体表示は、描ける最も深い深さを選んで `taskGroupAutoExpandDepth` に、比 1 を `verticalZoomRatio` に、横に収まる幅を `dayWidthPx` に置く |
| I-6 | 表 T-262 の `ZE-1` 〜 `ZE-3` | 縮める側の端 ＝ 比が 1 かつ深さがそれ以上減らしても絵が変わらない所。拡げる側の端 ＝ 深さが上限かつ比が上限 |
| I-7 | `FR-016`・`FR-017`・`S-55` の注 | 時刻を出す上限と目盛の段のしきい値を px/日（`dayWidthPx` × 表示の倍率 ÷ 100）で言う（`S-85` などはすでに px/日） |
| I-8 | `FR-025` の `IX-14` | 「`TD-4` の描く縦の倍率は 1 と置く」を「`verticalZoomRatio` を 1、`taskGroupAutoExpandDepth` を 3 と置く（文書の値を読まない）」へ（③-5） |
| I-9 | `FR-080`・`FR-025` の `IX-13` | 期間を固定した絵の区画は DOM から測った寸法を入力にしない。`App Header` の帯は道具の定数で組む（③-6、`DFC-3594`） |
| I-10 | `FR-039`・`S-2` / `S-3`・表 T-202 | 「目盛の文字と帯の高さは、それぞれ独立したキーとして保つ」と「保存値が書き換わる」を消し、`S-2` / `S-3` を保存しない定数の表へ移す |
| I-11 | `FR-072` の 表 T-380（文書の設定の面の読むだけの行）・`tbl-glossary.md` の `K-2` / `K-3` / `K-67` / `K-68` | `RN-5`（目盛と積む向き）から `rulerFontSizePx`・`rulerHeightPx` の 2 行を除く。`RN-3`（見えている範囲）の `zoomX`・`zoomY` の 2 行を、`dayWidthPx`（px/日）・`verticalZoomRatio`（%）・`taskGroupAutoExpandDepth`（深さ）の 3 行へ |
| I-12 | `S-54` / `S-55` / `S-97` / `S-98`・`K-63` / `K-64` | `zoomMin` / `zoomMax` を、`dayWidthPx` の範囲（0.075 〜 900）と `verticalZoomRatio` の範囲（1 〜 240）に分ける |
| I-13 | `published-entries.json`・`display-words.json` | `zoomY` / `zoomX` を名指す説明と画面の語（「1 日の幅（zoomX = 1）」「予定の縦幅（zoomY = 1）」）を新しい名へ |

## 5. 台帳（調整役の了承の後に書く）

| 台帳 | 行 |
| --- | --- |
| `rulings.md` | `JDG-3290`（書き出しの 2 本立て）・`JDG-3291`（`…Px` を 1 つの意味に）・`JDG-3292`（`dayWidthPx`・`displayScalePercent`）・`JDG-3293`（縦を 2 つに分ける）・`JDG-3294`（目盛の 2 鍵を外す）・`JDG-3295`（`small` / `medium` / `large`）・`JDG-3296`（`verticalZoomRatio` と `taskGroupAutoExpandDepth` の名）・`JDG-3297`（量の接尾辞）。着地の欄は「指示 —— CR-853 が当てる」 |
| `defects.md` | `DFC-3594` —— 期間を固定した絵が、`devicePixelRatio` が整数でないとき縦に 0.33px ずれる（`App Header` の高さを DOM から測るため）。study 78 の F11・F12 |

## 6. 測り方の再現

study 78 の 4 節の 3 つのコマンド（`sweep-browser-zoom.mjs`・`sweep-app-export.mjs`・`FIXED=1`）。`DFC-3594` の直しの後は、`result-app-export-fixed.json` の `svgHash` が 15 行すべてで同じになる。
