# CR-584 — 月のラベルが入れば月まで刷り、書き出す絵は 1920 × 1080 で空白を地の色で塗る

> 起草の状態: 当てた（2026-09-26、枝 `cr-organise`、波 W1。`JDG-740`）。当てた木は `87d98a47` に `CR-555` を当てた作業木（未コミット）。4 節の 20 塊を書いたとおりに当てた —— どの旧も当てる直前に 1 回だけ現れ、E-01 の旧は `CR-555` の E-20 の新のままだった（旧を今の文へ合わせた塊は無い）。
> 11 節の問い 1 は調整役が A と決めた（2026-09-26）: `S-84` ＝ 2（導いた値）。`JDG-720` の「約 2.3」はトリアージのセッションの見積もりであり、利用者の逐語は「月まで表示できるときは月まで表示しろ。」である。⇒ J-03・J-09・D-02・D-04・D-06 は 4 節の文のまま。
> 起草の元: 利用者の指示 `JDG-720`・`JDG-723`・`JDG-724`（逐語は 0.1 節）と、調整役が見つけた仕様の穴 2 つ（書き出す絵の高さの整数化・書き出す題の縦の位置。コードは `999f9f10` が既に直した）。コード（9 節）と試験はまだ変えていない。
> 読んだ木: `cr-organise` の `87d98a47`。⚠️ 起草のあいだに、同じ作業木で調整役が `CR-555` を当て始めた（未コミット。`01-04-requirements.md` の 表 T-241 の `IX-1`・`IX-4` が `CR-555` の新になっていた）。旧の塊の数え方は 13 節（`87d98a47` に `CR-555` の E-19・E-20 を当てた写しと、起草の終わりの作業木の 2 つで数えた）。
> コードの木: 書き出す絵の高さと題の位置は、この木に無いコミット `999f9f10`（`src/adapter/image-exporter/image-exporter.ts`）を `git show` で読んだ。
> ID の帯: 調整役から `CR-584` と仮の番号 90400 〜 90499 を受けた。⭐ 本書は新しい識別子を 1 つも作らない（2 節）。
> 当てる順: 波 W1 の中で `CR-555` の後、`CR-572` の前（調整役の決定）。⇒ 表 T-241 の `IX-4` の旧は `CR-555` の E-20 の新である（4.1 節の E-01）。`CR-572` が `S-81`・`S-83`・`S-84` を定数へ移すとき、本書の新しい値を運ぶ（5 節）。
> 閉じるもの: `DFC-1140`・`DFC-1146`（仕様と保存された値）と `DFC-1145` の仕様の側（コードの側は 9 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語（`docs/development-records/rulings.md` から写した）

| 裁定 | 逐語 | 決めること（`rulings.md` の欄のまま） | 本書での扱い |
|---|---|---|---|
| `JDG-720` | 「カレンダーで月まで表示できるのに年しか表示されない倍率がある。月まで表示できるときは月まで表示しろ。」 | 月の段のラベルが入る幅があれば、年だけでなく月まで刷る。⇒ 表 T-205 の `S-83` を今の `TM-2` のラベル `m` から導き直す（1.4 → 0.5）。同じ導出の古さを持つ `S-84` も導き直す（4.3 → 約 2.3）。`FR-017`（01-04:4292）の「しきい値がその境目である」がすでに言っていることを値に戻す | J-02・J-03・J-07 〜 J-10 と D-02・D-04・D-06。⚠️ `S-84` は導くと 2 になる（0.2 節の 2、11 節の問い 1） |
| `JDG-723` | 「透過色は要らない。背景色で統一しろ」 | 書き出す絵の空白は地の色（`S-146`）で塗り、透過にしない。⇒ `IX-10` の「余りを空白のまま」に 1 文足す | E-02 |
| `JDG-724` | 「.pngと.svgとクリップボードの画像サイズを1600x900じゃなくて、1920x1080にしろ。」 | `S-81` `exportCanvas` の既定値を 1920x1080 にする。保存された起動テンプレートと見本も書き換える（運用前なので古い形の読み替えは要らない） | J-01・J-04 〜 J-06・J-11 と D-01・D-03・D-05、`npm run gen` |

調整役の依頼（利用者の言葉ではない）: 書き出す絵の高さが整数の px であること（今は `PND-133` と `IX-4` が暗に言うだけ）と、書き出す `Document Title` の縦の位置（コードは帯の中点 ＋ 字の大きさ × `labelBaseline`。`S-33` を `U-27` に結ぶ行が無い）を、`999f9f10` のコードのとおりに仕様へ書く。

### 0.2 調べた結果（`87d98a47`）

1. **`S-83` の今の導き方は、`TM-2` が刷らないラベルで導いている。** 表 T-205 の下の導出表（`_source/settings.json` の 表 T-205 の後の段）は、月の段を `2026-01`（7 単位、42px、30.4 日）で導いて 1.38 → 1.4 とする。だが 表 T-238 の `TM-2` は 1 行目に `yyyy`、2 行目に `m` を刷り、`YYYY-MM` に畳むのは `TM-3`・`TM-4` だけと定める（`FR-017`）。⇒ 月の段を束縛するのは 2 行目の `m`、最も広いのは `12` の 2 単位である。週の段の `01-05`（5 単位）も同じく古い —— `TM-3` の 2 行目は `d`（その週の始まりの日、2 桁）である。
2. **導き直すと `S-83` は 0.5、`S-84` は 2 になる。** 導き方は同じ段の既存の約束をそのまま使う —— 目盛のフォント 12px（`S-8`、`FR-017` の「この 12 は固定の基準」）、ラベルの幅 ＝ 単位数 × 12px × `labelCoef`（`S-30` 0.5、`FR-093`）、隙間 `S-135` 2px。
   - 月: （2 × 12 × 0.5 ＋ 2）÷ 28 日 ＝ 14 ÷ 28 ＝ **0.5**。28 日で割るのは、最も短い月で重ならない境目だからである（30.4 日の平均で割ると 14 ÷ 30.4 ＝ 0.46 で、2 月でラベルが重なる）。`JDG-720` の 0.5 と一致する。
   - 週: （2 × 12 × 0.5 ＋ 2）÷ 7 日 ＝ 14 ÷ 7 ＝ **2**。⚠️ `JDG-720` の「約 2.3」と合わない。2.3 に当たる式は、（実測の `12` の幅 14.2px ＋ 2）÷ 7 ＝ 2.31 だけである（`DFC-1140` の調べの欄に「最も広い月のラベル「12」は 14.2px」とある）—— これは `rulerFont` 14px の画面で測った幅であり、12px の基準に直していない。`rulerTierOf`（`src/entity/layout-engine/schedule-layout/time-axis.ts:21`）は px/日 を `rulerFont ÷ fontMin`（14 ÷ 12）で割ってからしきい値と比べるので、しきい値は 12px の基準で導くものである（`FR-017` の判定式）。⇒ 本書の 4 節は 2 で書き、11 節の問い 1 で利用者に確かめる。
   - 2 つとも割り切れるので、丸めは要らない（規則 02 の 4 節「設計の数を丸めて書くな」）。
3. **隙間 `S-135` を月と週にも足すと、2 か所の文が偽になる。** `S-135` の意味の欄「この隙間を足して導くのは 表 T-205 の `S-85` だけである —— 刻みが 1 日の段でしか隣り合うラベルが接しない」と、表 T-205 の下の段「毎日刻む段だけは `rulerLabelGap`（`S-135`）を足す」。⇒ 新しいしきい値は、どの段でもラベルが刻みにちょうど収まる境目なので、どの段でも隣り合うラベルが接する。2 か所とも直す（J-07・J-10）。`JDG-720` の 0.5 は隙間を足さないと出ない（12 ÷ 28 ＝ 0.43）。
4. **各段の 1 行目は束縛しない。** `TM-2` の `yyyy` は 1 年に 1 つ、`TM-3` の `yyyy-mm` は 1 か月に 1 つ（`LF-1`）—— `yyyy-mm` は（7 × 12 × 0.5 ＋ 2）÷ 28 ＝ 1.57 で、週の段のしきい値 2 より小さい。
5. **`S-81` の数を写した文が、仕様の中に `S-81` の行のほかに 2 行ある。** `S-85` の意味の欄（「`S-81` ＝ 1600px」と「`S-81` 1600 − 行見出しパネル 200 ＝ 1400px … 17.55 以下」、実測の文）と、`S-221` の意味の欄（「参考の 18px を書き出す絵の幅 1600 で割って割合にした」「書き出す絵で 18px」）。⇒ `S-85` は同じ式を 1920 で数え直す（上限 21.56。17.5 はその内 —— 値は変えない）。`S-221` は係数を変えない（行の理由「画面の大きさが変わっても割合が保たれる」）—— 書き出す絵の字は 18px → 21.6px になる。割り算の由来（18 ÷ 1600）は係数の導き方として真のまま残す。
6. **空白は 2 種ある。** `IX-10` の余り（縮めた絵が `S-81` の高さに満たない下の帯）と、`FR-080` の「描かない UI パーツは、その場所を空白として残すこと（MUST）」（右端のスクロールバーの帯）。`DFC-1145` の実測の透過は両方に出ている（下 780 〜 899 行、右 1594 〜 1599 列）。⇒ 1 文を `IX-10` に置き、両方を名指す（`FR-080` の文は書かない）。
7. **書き出す絵の高さ（`999f9f10` の `exportSvg`）**: `grownHeight = Math.ceil(Number(rounded(screenHeight * ratio)))`、`height = Math.max(exportCanvas.height, grownHeight)`、天井 `exportCanvasHeightCap` との比較・SVG の `height` と `viewBox`・`heightPx`（PNG の画素の高さ）は、どれもこの `height` を使う。`rounded` は `Math.round(v × 100) ÷ 100` —— 表 T-231 の `NS-3` の 0.01 px の格子と同じ格子である。境目: 端数が 0.005 px 未満なら切り上げない（1080.0049 → 1080）、0.005 px 以上なら次の整数（1080.005 → 1080.01 → 1081）。1373 × 773 の画面は、1600 の幅で 900.80 → 901、1920 の幅で 1080.96 → 1081（13 節の `584-height.js`）。
8. **書き出す題の縦の位置（`999f9f10` の `appHeaderSvg`）**: `y = (band.y + band.height / 2 + titlePx × labelBaseline) × ratio`、`titlePx = S-225 × S-235`。画面の `Document Title` は DOM で、帯は `align-items:center`（`src/framework/dom-screen-surface/dom-screen-surface.ts:274-276`）—— 帯の縦の中央に立つ。`EP-1` は字の大きさと左の余白を `S-225`・`S-226` に結ぶが、縦を結ぶ文が無い。`S-33`（表 T-201、`labelBaseline`）の意味は「フォントのベースライン補正」だけで、指す要求は `FR-001`・`FR-003` の 2 つ（`impact.py`）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-2` ／ `GL-002`**（全体を 1 画面で見る）—— 縮めて全体を見る倍率ほど、年だけの目盛では日程が何月かを読めない。月のラベルが入る倍率なら月まで刷る（`JDG-720`）。
- ⭐ **`CH-1` ／ `GL-004`** —— `FR-025`・`FR-080` の親である（`Relations`）。書き出す絵が基準環境（表 T-025 の `MC-6`、1920 × 1080）の画面と同じ px で出て、貼った先で透けない。
- ⚠️ **`CH-3`（ぬるサク、`GL-003`）には負に働きうる** —— 目盛は毎フレーム描く。基準環境の日程の幅 1702px で数えると、月の段で刷る月のラベルは最大 約 40（1702 ÷ 1.4 ÷ 30.4）→ 約 112（1702 ÷ 0.5 ÷ 30.4）、週の段の週のラベルは最大 約 57（1702 ÷ 4.3 ÷ 7）→ 約 122（1702 ÷ 2 ÷ 7）になる。⇒ 当てた後に調整役が `GRS_PERF` で測る（8 節の波 3）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.2`（検証できる表現）** —— `S-83`・`S-84` の値の横に式を書いた（J-02・J-03）。高さの丸めは「0.01 px の格子へ四捨五入してから切り上げる」と境目の数で書いた（E-01）。
- **`R1.3`（唯一の正）** —— ① 隙間 `S-135` を足す段の範囲が、`S-135` の欄と 表 T-205 の注の 2 か所に書かれている → 両方を同じ読みに直した（J-07・J-10）。② 空白の塗りは `IX-10` の 1 か所に置き、`FR-080` の空白はそこから名指す（E-02）。③ 閉路 `FR-025` ↔ `FR-080` ↔ `S-81`（6 節）—— 本書は `S-81` の値と 表 T-241 の 2 行を書き、`FR-080` の文は書かない。`FR-080` の比は `S-81` の幅 ÷ 画面の幅 のままで、`FR-025` の「`S-81` の縦横比は、表 T-025 の `MC-6` が定める画面と同じである」（1600 × 900 も 1920 × 1080 も 16:9）は真のまま残る。④ 閉路 `FR-017` ↔ `S-85` —— 本書は `S-85` の欄を書き、`FR-017` の文は書かない。`FR-017` の「しきい値がその境目である」に値を合わせる向きである。⑤ 閉路 `EP-1` ↔ `S-225` —— 本書は `EP-1` に 1 文足し、`S-225` の欄は書かない（`S-225` の「画面と書き出しの両方が本行を読むこと」は縦の位置でも真）。
- **`R1.4`（境界値）** —— 2 月（28 日）で月のラベルが重ならない境目にした（0.2 節の 2）。高さの端数の境目 0.005 px（0.2 節の 7）。暗いテーマの地の色は `S-146` の暗い値が持つ（E-02 は行を名指すだけ）。
- **`R2.7`（マジックナンバー無し）** —— 導き方は `S-8`・`S-30`・`S-135` の行から数える。新しい定数を足さない。
- **`R2.21`（1 つの仕事は 1 か所）** —— 「帯の縦の中点 ＋ 字の大きさ × `labelBaseline`」がコードに 2 か所ある（`999f9f10` の `appHeaderSvg` と `schedule-task-figures.ts` の `labelSvg`）。⇒ 9 節に片付けの候補として書く（本書は直さない）。
- **`R5`（パフォーマンス）** —— ① の ⚠️。⛔ 最適化は進めない（`JDG-11`）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 月と週のしきい値にも隙間 `S-135` を足し、その範囲を書いた 2 か所（`S-135` の欄・表 T-205 の注）を直す | `JDG-720` の 0.5 は隙間を足さないと出ない（0.2 節の 3）。`FR-017` の「しきい値がその境目である」—— 境目でラベルが接するのは日の段に限らない | — |
| 決定 2 | 月の段は最も短い 28 日の月で導く | 平均の 30.4 日では 2 月で重なる（`DFC-1140` の修正案と同じ） | 31 日の月ではラベルの右に余りが出る |
| 決定 3 | 導出表の日の段の行（`15`／`水`・`Mon`、`1 × ppd ≧ 26`、採用 26）は本書で書き直さない | `JDG-720` は `S-83`・`S-84` を名指す。日の段の束縛するラベルは `S-85` の欄（「束縛するラベルは `Mon`」）と `S-219`（曜日の字を 0.6 に縮める）が持ち、表の 26 は `S-135` が 8 だった頃の 18 ＋ 8 である。直すには束縛するラベルを選び直す判断が要る | 導出表の 3 行のうち 1 行が古いまま残る（10 節。台帳の候補） |
| 決定 4 | `S-85` の値 17.5 は変えず、欄の式だけを `S-81` の幅 1920 で数え直す（上限 17.55 → 21.56） | `JDG-724` は `S-81` を名指す。17.5 は新しい上限の内にある | 上限との間に約 4 の開きが残る。⚠️ その式の前提（書き出す絵を `S-81` の幅で描き直す）が `FR-080`（画面を縮めた絵）と合わないことを 10 節に書いた |
| 決定 5 | `S-221` の係数 0.01125 は変えない。書き出す絵の透かしの字は 18px → 21.6px になる | 行の理由「画面の大きさが変わっても割合が保たれる」。1920 の幅では基準環境の画面の字（実測 21.6px）と同じ大きさになる（`DFC-1146` が起草者に 1 行で書けと求めた点） | 透かしが 1.2 倍大きくなる |
| 決定 6 | 空白の塗りは、`S-150`（パネルの地）の下の余りも含めて `S-146` で塗る | `JDG-723` の決めること「地の色（`S-146`）で塗り」 | 行見出しパネルの下の余りは、パネル（`S-150`）とわずかに違う色になる |
| 決定 7 | 高さの規則（E-01）と題の縦の位置（E-03）は、`999f9f10` のコードのとおりに書く | 調整役の依頼。`EP-1` の「`Document Title` の位置を動かしてはならない（MUST NOT）」と「DOM を直接測って揃えてはならない（MUST NOT）」を、測らずに満たす式である | 画面の中央揃えと、ベースライン補正で求めた位置は、書体によって 1 px ほど違いうる（`WY-3` の許容差 1.0 px の内） |
| 決定 8 | 見本と案内の骨組みの刻印（`settingsUpdatedUtc`）は書き換えない | 前例 `70be9db6`（見本の `iconHintDelayMs` を書き換え、刻印は変えなかった） | — |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 月・週のしきい値（`JDG-720`） | `_source/settings.json` の 表 T-205 の `S-83`・`S-84`（値と欄）、表 T-205 の後の段（注の 1 文、導出表の 2 行）、表 T-201 の `S-135` の欄 | J-02・J-03・J-07 〜 J-10 |
| 書き出す絵の大きさ（`JDG-724`） | `_source/settings.json` の 表 T-204 の `S-81`（値と欄）、表 T-205 の `S-85` の欄（3 か所）、表 T-207 の `S-221` の欄 | J-01・J-04 〜 J-06・J-11 |
| 空白の塗り（`JDG-723`） | `01-04-requirements.md` の 表 T-241 の `IX-10` | E-02 |
| 高さは整数の px（調整役） | 表 T-241 の `IX-4`（`CR-555` の新） | E-01 |
| 書き出す題の縦の位置（調整役） | `01-04-requirements.md` の 表 T-076 の `EP-1` | E-03 |
| 保存された値 | `sample-schedule/No Name.json`・`sample-schedule/Three-Year Product Plan.json`・`docs/guides/schedule-to-grs-json/grs-skeleton.json` | D-01 〜 D-06 |
| 生成物 | `_assets/tbl-settings.md`・`src/entity/document-model/document-settings/document-settings.ts`・`src/framework/single-html-shell/startup-template.json` | `npm run gen`（手で直さない） |

**数**: 仕様の文の編集 3（E-01 〜 E-03、どれも `01-04-requirements.md`）、原稿 JSON の編集 11（J-01 〜 J-11、どれも `_source/settings.json`）、データの編集 6（D-01 〜 D-06）。

### 1.1 同じ形の所（書く前に数えた。`87d98a47`）

| 形 | 数 | 本書で直す | 直さない（理由） |
|---|--:|---|---|
| 表 T-205 の値の導き方が古いラベル・古い隙間で書かれている | 導出表 3 行 ＋ 注の 1 文 ＋ `S-135` の欄 1 文 ＝ 5 | 月・週の 2 行、注、`S-135` の欄（J-07 〜 J-10） | 日の段の行（決定 3） |
| `S-83`・`S-84` の値を持つもの | 原稿 1 ＋ 生成 2（`document-settings.ts`・`startup-template.json`）＋ 手書き 3（見本 2・骨組み 1）＝ 6 | 原稿と手書き 3（J-02・J-03、D-02・D-04・D-06）。生成 2 は `npm run gen` | — |
| `S-81` の値を持つもの・その数を写した文 | 原稿 1 ＋ 生成 2 ＋ 手書き 3 ＋ 仕様の文 2 行（`S-85`・`S-221`）＝ 8 | 原稿、手書き 3、仕様の文 2 行（J-01・J-04 〜 J-06・J-11、D-01・D-03・D-05） | `S-221` の「参考の 18px を書き出す絵の幅 1600 で割って割合にした」は係数の導き方として真（0.2 節の 5） |
| 試験の中の `1600` と `900` | `exportCanvas: { width: 1600, height: 900 }` を自分で組む設定 5 ファイル、1600 × 900 の画面 3 ファイル、注の文 5 か所（`uf-27-28-29.test.ts:1662` ほか） | — | 9 節。どれも表を読まずに自分の設定を組むか、過去の裁定を引く注である。`S-81` を表から読む試験（`uf-47-48-choosers.test.ts:2989`）は値に付いてくる |
| 書き出す絵の空白 | `IX-10` の余り ＋ `FR-080` の描かない UI パーツの場所 ＝ 2 | どちらも E-02 の 1 文で | `FR-080` の文は書かない（`R1.3` の ②） |
| 字の縦の位置を「中点 ＋ 字の大きさ × `labelBaseline`」で求めるコード | 2（`labelSvg`、`999f9f10` の `appHeaderSvg`）。別の式が 1（`image-exporter.ts` の `rowTitleSvg` は `box.y + fontSizePx`） | 仕様は `EP-1` の 1 文（E-03） | コードは直さない（9 節の `R2.21`）。`rowTitleSvg` の式は 10 節 |

---

## 2. 新しい識別子

⭐ 本書は新しい識別子を作らない —— 表・行・接頭辞・設定値・要求を足さない。既にある行の値と文だけを書く。配られた仮の番号 90400 〜 90499 は使わない（調整役へ返す）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`87d98a47`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `S-81` の既定 `1600 × 900` | `_source/settings.json:2244-2245`（刷り物 `tbl-settings.md:246`） | `1920 × 1080` と、その理由（`MC-6` と同じ大きさ） | J-01 |
| `S-83` の既定 `1.4` | `_source/settings.json` の `S-83`（`tbl-settings.md:259`） | `0.5` と式 | J-02 |
| `S-84` の既定 `4.3` | 同 `S-84`（`:260`） | `2` と式（11 節の問い 1） | J-03 |
| `S-85` の欄の「`S-81` ＝ 1600px」 | 同 `S-85`（`:261`） | 「`S-81`」（数を写さない） | J-04 |
| `S-85` の欄の「`S-81` 1600 − 200 ＝ 1400px … 17.55 以下 ⇒ 17.5 とした」 | 同 | 1920 − 200 ＝ 1720px … 21.56 以下 ⇒ 17.5 はその内 | J-05 |
| `S-85` の欄の実測の条件（`S-81` の幅を書いていない） | 同 | 「`S-81` の幅 1600」を足す | J-06 |
| 表 T-205 の注「毎日刻む段だけは `rulerLabelGap`（`S-135`）を足す」 | `_source/settings.json:2420`（`tbl-settings.md:269`） | どの段も足す、と最も短い刻み | J-07 |
| 導出表の月の行（`2026-01`、42px、`30.4 × ppd ≧ 42`、1.4） | `:2428`（`tbl-settings.md:274`） | `m` の `12`、12px ＋ `S-135`、`28 × ppd ≧ 14`、0.5 | J-08 |
| 導出表の週の行（`01-05`、30px、`7 × ppd ≧ 30`、4.3） | `_source/settings.json` の次の行（`tbl-settings.md:275`） | `d` の 2 桁、12px ＋ `S-135`、`7 × ppd ≧ 14`、2 | J-09 |
| `S-135` の欄「足して導くのは … `S-85` だけ」 | `_source/settings.json:266`（`tbl-settings.md:73`） | 目盛のしきい値（`S-83` 〜 `S-85`）のどれにも足す | J-10 |
| `S-221` の欄の実測の条件（`S-81` の幅を書いていない） | `_source/settings.json:4508`（`tbl-settings.md:447`） | 「`S-81` の幅 1600」を足し、1920 のときの字の大きさを 1 文 | J-11 |
| 見本・骨組みの `exportCanvas` 1600 × 900、`rulerTierPxPerDayMonth` 1.4、`rulerTierPxPerDayWeek` 4.3 | 13 節の表 | 1920 × 1080、0.5、2 | D-01 〜 D-06 |

⭐ **消さないもの**: `IX-10` の「余りを空白のままとすること（MUST）」（試験 `tests/unit/uf-39-40.test.ts:844`・`:1952` が引く —— 文はそのまま残し、段の終わりに 1 文足す）。`FR-080` の「描かない UI パーツは、その場所を空白として残すこと（MUST）」（場所を残す規則であり、塗る色は E-02）。`S-217` の欄「`S-81` の高さは伸ばす前の下限であって、上限ではない」。`S-221` の「参考の 18px を書き出す絵の幅 1600 で割って割合にした」。`EP-1` の既存の文すべて。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 各編集は「旧」を「新」で置き換える部分の置き換えである。旧・新は、`<!-- EDIT … -->` の直後の 2 つの `text` の塊の中身から、塊の最後の改行を除いたものである（塊の中の改行は旧・新の一部）。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（13 節）。CRLF は LF に揃えて数える。
⚠️ JSON の塊は、当てた後に `json.loads` で読めることを確かめる。生成物は手で直さない —— 原稿を直して `npm run gen`。
⚠️ `CR-574`（まだ当てていない）が `S-135` の欄と 表 T-205 の注の「表示言語」を「画面の言語」に書き換える。本書の J-07・J-10 の旧はその語を含まない句だけを取ったので、`CR-574` の前でも後でも 1 回ずつ現れる。

### 4.1 文の編集（`docs/spec/01-04-requirements.md`）

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
表 T-241 の `IX-4` の末（旧は `CR-555` の E-20 の新の末尾。高さは整数の px）。旧
```text
天井が要るのは、伸ばした先が機械の描ける大きさを超えうるからである** —— 画面が縦に長いほど、縮めた絵の高さが伸びる。<br> |
```
新
```text
天井が要るのは、伸ばした先が機械の描ける大きさを超えうるからである** —— 画面が縦に長いほど、縮めた絵の高さが伸びる。<br>⭐ 高さは整数の px とすること（MUST） —— 縮めた絵の高さ（画面の高さ × その比）を `05-07-design.md` の 表 T-231 の `NS-3` と同じ 0.01 px の格子へ四捨五入し、次の整数の px へ切り上げた値と、`S-81` の高さのうち大きいほうである。<br>⚠️ 先に 0.01 px の格子へ四捨五入するのは、比の掛け算が残す浮動小数の端数で 1 px 高くしないためである —— 端数が 0.005 px 未満なら切り上げず、0.005 px 以上なら次の整数へ上がる（例: 1373 × 773 の画面は 773 × 1920 ÷ 1373 ＝ 1080.96… で 1081 px）。<br>`S-217` と比べる高さ、SVG の高さ、PNG の画素の高さは、どれもこの 1 つの整数とすること（MUST） —— 画素の数は整数でしかありえず、3 つが違えば SVG と PNG が別の絵になる。<br> |
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
表 T-241 の `IX-10` の末（空白を地の色で塗る）。旧
```text
行を足して埋めてはならない（MUST NOT） —— 画面に無いものが出る。<br> |
```
新
```text
行を足して埋めてはならない（MUST NOT） —— 画面に無いものが出る。<br>⭐ 絵の中の空白 —— 本行の余りと、`FR-080` が描かない UI パーツの場所として残す空白 —— は、`_assets/tbl-settings.md` の 表 T-236 の `S-146`（地の色）で塗ること（MUST）。<br>透過のまま残してはならない（MUST NOT） —— 透過の所には絵を貼った先の地が透けて、下と右に絵と違う色の帯が出る。<br> |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
表 T-076 の `EP-1` の末（書き出す題の縦の位置）。旧
```text
**書き出しは画面を描く側への辺を既に持っており、描く値はその辺から来る。<br>** |
```
新
```text
**書き出しは画面を描く側への辺を既に持っており、描く値はその辺から来る。<br>**⭐ 縦は、書き出す `Document Title` のベースラインを、帯の縦の中点から、字の大きさ（`S-225` × `S-235`）に `_assets/tbl-settings.md` の 表 T-201 の `S-33` を掛けた長さだけ下に置くこと（MUST） —— 画面は字を帯の縦の中央に置き、書き出しは字をベースラインで置くので、測らずに同じ高さへ揃えるにはベースラインの補正が要る。<br> |
```

### 4.2 原稿 JSON の編集（`docs/spec/_source/settings.json`）

<!-- EDIT id=J-01 file=docs/spec/_source/settings.json -->
表 T-204 の `S-81`。旧
```text
     "id": "S-81",
     "key": "`exportCanvas`",
     "type": "`{ width, height }`",
     "default": {
      "pair": [
       "1600",
       "900"
      ],
      "code": true,
      "parts": [
       "width",
       "height"
      ]
     },
     "note": {
      "ja": "SVG / PNG の出力サイズ。規則と理由は `FR-025`、縮める比は `FR-080` が持つ"
     }
```
新
```text
     "id": "S-81",
     "key": "`exportCanvas`",
     "type": "`{ width, height }`",
     "default": {
      "pair": [
       "1920",
       "1080"
      ],
      "code": true,
      "parts": [
       "width",
       "height"
      ]
     },
     "note": {
      "ja": "SVG / PNG の出力サイズ。規則と理由は `FR-025`、縮める比は `FR-080` が持つ。⭐ 1920 × 1080 は 表 T-025 の `MC-6` の画面と同じ大きさである —— 書き出しの基準環境（`FR-080`）では縮める比が 1 になり、画面と同じ px の絵が出る"
     }
```

<!-- EDIT id=J-02 file=docs/spec/_source/settings.json -->
表 T-205 の `S-83`。旧
```text
     "id": "S-83",
     "key": "`rulerTierPxPerDayMonth`",
     "default": {
      "num": "1.4",
      "code": true
     },
     "min": {
      "num": "0.1"
     },
     "max": "`rulerTierPxPerDayWeek`",
     "note": {
      "ja": "目盛が「年」から「年 ＋ 月」に変わる px/day。次のしきい値を超えない"
     }
```
新
```text
     "id": "S-83",
     "key": "`rulerTierPxPerDayMonth`",
     "default": {
      "num": "0.5",
      "code": true
     },
     "min": {
      "num": "0.1"
     },
     "max": "`rulerTierPxPerDayWeek`",
     "note": {
      "ja": "目盛が「年」から「年 ＋ 月」に変わる px/day。次のしきい値を超えない。⭐ 0.5 ＝（月の行 `m` の最も広い `12` の 2 単位 × `S-8` 12px × `S-30` 0.5 ＋ `S-135` 2px）÷ 28 日 ＝ 14 ÷ 28 —— 月のラベルが最も短い月に収まる境目である（導き方は本表の下の注）"
     }
```

<!-- EDIT id=J-03 file=docs/spec/_source/settings.json -->
表 T-205 の `S-84`（⚠️ 値は 11 節の問い 1 の推奨 A。B なら `2` を `2.3` に、欄の式を問い 1 の B の文に）。旧
```text
     "id": "S-84",
     "key": "`rulerTierPxPerDayWeek`",
     "default": {
      "num": "4.3",
      "code": true
     },
     "min": "`rulerTierPxPerDayMonth`",
     "max": "`rulerTierPxPerDayDay`",
     "note": {
      "ja": "目盛が「年 ＋ 月」から「年 ＋ 月 ＋ 週」に変わる px/day。前後のしきい値の間"
     }
```
新
```text
     "id": "S-84",
     "key": "`rulerTierPxPerDayWeek`",
     "default": {
      "num": "2",
      "code": true
     },
     "min": "`rulerTierPxPerDayMonth`",
     "max": "`rulerTierPxPerDayDay`",
     "note": {
      "ja": "目盛が「年 ＋ 月」から「年 ＋ 月 ＋ 週」に変わる px/day。前後のしきい値の間。⭐ 2 ＝（週の始まりの日の行 `d` の 2 桁の 2 単位 × `S-8` 12px × `S-30` 0.5 ＋ `S-135` 2px）÷ 7 日 ＝ 14 ÷ 7 —— 週のラベルが 1 週に収まる境目である（導き方は本表の下の注）"
     }
```

<!-- EDIT id=J-04 file=docs/spec/_source/settings.json -->
表 T-205 の `S-85` の欄の 1 句（`S-81` の数を写さない）。旧
```text
⛔ この導き方は、書き出す絵の寸法（`S-81` ＝ 1600px）を基準環境の幅に使わない。
```
新
```text
⛔ この導き方は、書き出す絵の寸法（`S-81`）を基準環境の幅に使わない。
```

<!-- EDIT id=J-05 file=docs/spec/_source/settings.json -->
同じ欄の導き方（`S-81` の幅 1920 で数え直す。値 17.5 は変えない —— 決定 4）。旧
```text
⭐ **導き方**: 書き出す絵の描画幅は `S-81` 1600 − 行見出しパネル 200 ＝ 1400px。そこに 61 日を入れるには 22.95px/日 が要り、しきい値に直すと 19.67。⛔ さらに倍率の刻みが実測 1.121 倍なので、どの初期倍率からでも届くには1 刻みぶんの余裕が要る ⇒ 22.95 ÷ 1.1667 ÷ 1.121 ＝ 17.55 以下。 ⇒ ⭐ **17.5 とした。**
```
新
```text
⭐ **導き方**: 書き出す絵の描画幅は `S-81` の幅 1920 − 行見出しパネル 200 ＝ 1720px。そこに 61 日を入れるには 28.20px/日（1720 ÷ 61）以下が要り、しきい値に直すと 24.17（÷ 1.1667）。⛔ さらに倍率の刻みが実測 1.121 倍なので、どの初期倍率からでも届くには1 刻みぶんの余裕が要る ⇒ 28.20 ÷ 1.1667 ÷ 1.121 ＝ 21.56 以下。 ⇒ ⭐ **17.5 はこの上限の内にある。**
```

<!-- EDIT id=J-06 file=docs/spec/_source/settings.json -->
同じ欄の実測の条件。旧
```text
⭐ 実測（出荷ビルド、1920 × 1080）: 日の段が出る最初の刻みは 21.11px/日 になり、書き出した `.svg` に 66.3 日入る。
```
新
```text
⭐ 実測（出荷ビルド、1920 × 1080、`S-81` の幅 1600）: 日の段が出る最初の刻みは 21.11px/日 になり、書き出した `.svg` に 66.3 日入る。
```

<!-- EDIT id=J-07 file=docs/spec/_source/settings.json -->
表 T-205 の後の段の 1 文（隙間を足す段）。旧
```text
⚠️ **毎日刻む段だけは `rulerLabelGap`（`S-135`）を足す** —— 刻みが 1 日で、隣り合うラベルが接するのは日の段と曜日の段だけだからである。
```
新
```text
⚠️ **どの段も `rulerLabelGap`（`S-135`）を足す** —— しきい値は、その段の最も短い刻みに、隣り合うラベルが隙間を空けて収まる境目だからである（`FR-017` の「しきい値がその境目である」）。⚠️ 各段の 1 行目（`TM-2` の `yyyy`、`TM-3` の `yyyy-mm`）は刻みが長いので束縛しない —— `yyyy-mm` は 7 単位の 42px ＋ `S-135` を 28 日に入れて 1.57 であり、週の段のしきい値より小さい。⚠️ 最も短い刻みは、月の段では 28 日の月（30.4 日の平均で導くと 2 月でラベルが重なる）、週の段では 7 日、毎日刻む日の段と曜日の段では 1 日である。
```

<!-- EDIT id=J-08 file=docs/spec/_source/settings.json -->
導出表の月の行。旧
```text
| 2 年 ＋ 月 | `2026-01` | 7 | 42px | `30.4 × ppd ≧ 42` | 1.38 | **1.4** |
```
新
```text
| 2 年 ＋ 月 | 月の行 `m` の `12` | 2 | 12px ＋ `S-135` | `28 × ppd ≧ 14` | 0.5 | **0.5** |
```

<!-- EDIT id=J-09 file=docs/spec/_source/settings.json -->
導出表の週の行（⚠️ 11 節の問い 1 が B なら、採用の欄を `**2.3**` に）。旧
```text
| 3 ＋ 週 | `01-05` | 5 | 30px | `7 × ppd ≧ 30` | 4.29 | **4.3** |
```
新
```text
| 3 ＋ 週 | 週の始まりの日の行 `d` の 2 桁 | 2 | 12px ＋ `S-135` | `7 × ppd ≧ 14` | 2 | **2** |
```

<!-- EDIT id=J-10 file=docs/spec/_source/settings.json -->
表 T-201 の `S-135` の欄の 1 文。旧
```text
この隙間を足して導くのは 表 T-205 の `S-85` だけである —— 刻みが 1 日の段でしか隣り合うラベルが接しない。
```
新
```text
この隙間は 表 T-205 の目盛のしきい値（`S-83` 〜 `S-85`）のどれにも足して導く —— しきい値は、その段の最も短い刻みに隣り合うラベルが隙間を空けて収まる境目である（導き方は同表の下の注）。
```

<!-- EDIT id=J-11 file=docs/spec/_source/settings.json -->
表 T-207 の `S-221` の欄の実測の文（決定 5）。旧
```text
⭐ 実測（出荷ビルド、1920 × 1080）: 画面で 21.6px、書き出す絵で 18px。
```
新
```text
⭐ 実測（出荷ビルド、1920 × 1080、`S-81` の幅 1600）: 画面で 21.6px、書き出す絵で 18px。⭐ `S-81` の幅が 1920 のとき、書き出す絵の字は 0.01125 × 1920 ＝ 21.6px となり、基準環境（表 T-025 の `MC-6`）の画面の字と同じ大きさになる —— 係数は変えない。字が書き出す絵の幅に比例するのは、本行の「画面の大きさが変わっても割合が保たれる」の帰結である。
```

### 4.3 保存された値（見本と案内の骨組み。運用前なので古い形の読み替えは足さない —— `JDG-724`）

<!-- EDIT id=D-01 file=sample-schedule/No Name.json -->
旧
```text
  "exportCanvas": {
   "height": 900,
   "width": 1600
  },
```
新
```text
  "exportCanvas": {
   "height": 1080,
   "width": 1920
  },
```

<!-- EDIT id=D-02 file=sample-schedule/No Name.json -->
旧
```text
  "rulerTierPxPerDayMonth": 1.4,
  "rulerTierPxPerDayWeek": 4.3,
```
新
```text
  "rulerTierPxPerDayMonth": 0.5,
  "rulerTierPxPerDayWeek": 2,
```

<!-- EDIT id=D-03 file=sample-schedule/Three-Year Product Plan.json -->
旧
```text
  "exportCanvas": {
   "height": 900,
   "width": 1600
  },
```
新
```text
  "exportCanvas": {
   "height": 1080,
   "width": 1920
  },
```

<!-- EDIT id=D-04 file=sample-schedule/Three-Year Product Plan.json -->
旧
```text
  "rulerTierPxPerDayMonth": 1.4,
  "rulerTierPxPerDayWeek": 4.3,
```
新
```text
  "rulerTierPxPerDayMonth": 0.5,
  "rulerTierPxPerDayWeek": 2,
```

<!-- EDIT id=D-05 file=docs/guides/schedule-to-grs-json/grs-skeleton.json -->
旧
```text
    "exportCanvas": {
      "height": 900,
      "width": 1600
    },
```
新
```text
    "exportCanvas": {
      "height": 1080,
      "width": 1920
    },
```

<!-- EDIT id=D-06 file=docs/guides/schedule-to-grs-json/grs-skeleton.json -->
旧
```text
    "rulerTierPxPerDayMonth": 1.4,
    "rulerTierPxPerDayWeek": 4.3,
```
新
```text
    "rulerTierPxPerDayMonth": 0.5,
    "rulerTierPxPerDayWeek": 2,
```

⚠️ `src/framework/single-html-shell/startup-template.json` は手で直さない —— `npm run gen` の中の `npm run startup`（`tools/generate_startup_template.py`）が、生成された `SETTINGS_DEFAULTS` から書き直す。

---

## 5. 継ぎ目 —— 依頼文にこのまま写すこと

```
SEAM (verbatim in every brief of this CR's waves)
- Values only. S-81 exportCanvas 1920 x 1080 (table T-204), S-83
  rulerTierPxPerDayMonth 0.5, S-84 rulerTierPxPerDayWeek 2 (table T-205;
  S-84 waits for section 11 question 1). They reach src through
  docs/spec/_source/settings.json -> npm run gen (SETTINGS_DEFAULTS in
  src/entity/document-model/document-settings/document-settings.ts, and
  startup-template.json). Never type these numbers into src or tests; read
  SETTINGS_DEFAULTS or the table.
- The export is painted on S-146 (table T-236) before anything else: one
  rect 0 0 width height as the first child inside the fit clip in
  exportSvg (src/adapter/image-exporter/image-exporter.ts). IX-10.
- The exported height is one integer (IX-4, E-01) and the exported title
  baseline is band centre + (S-225 x S-235) x S-33 (EP-1, E-03). Both are
  already the code at 999f9f10; this CR only writes them into the spec.
```

⭐ **`CR-572` への申し送り**（`CR-572` の 3 節の表の行 29 `exportCanvas`・行 91 `rulerTierPxPerDayMonth`・行 92 `rulerTierPxPerDayWeek`）: `CR-572` は表 T-204・T-205 を定数へ移し、値を `tools/generate_entity_types.py` が `settings.json` から `SETTINGS_CONSTANTS` へ刷る。`CR-572` の本文は値を写していない（`1600` と `1.4` の字は 0 回、`4.3` は節の番号「4.3 節」としてだけ現れる。13 節）。⇒ 本書を先に当てれば、`CR-572` は新しい値（1920 × 1080・0.5・2）を運ぶ。⛔ **`CR-572` を当てる体は、刷った定数がこの 3 つの値であることを確かめること。** `CR-572` が見本と骨組みから外す 78 鍵には `exportCanvas` と 2 つのしきい値が入る —— 本書の D-01 〜 D-06 は、その間だけ効く書き換えである。

---

## 6. グラフ（2 本とも。作業木 `87d98a47` ＋ 調整役が当てている `CR-555`）

### 6.1 `impact.py`（2 次まで）

| 対象 | 要求 / 参照 | 何が指すか |
|---|---|---|
| `S-81` | 3 / 13 | `FR-021`（表 T-024 の `IO-3`・`IO-4`）・`FR-080`（4 か所）・`FR-025`（表 T-241 の 3 行と結び）、`tbl-settings.md` の 3 か所（`S-217`・`S-85`・`S-221` の欄）—— 値を写す文は `S-85`・`S-221` の 2 行だけ（J-04 〜 J-06・J-11） |
| `S-83` | 2 / 4 | `FR-016`（`:3232`「`S-229` 日が見えている状態がどの段に落ちるか」—— 読むだけ）・`FR-017`（`:4285`・`:4322`「`S-83` が両言語で 1 つの値でいられる」—— 真のまま）・用語集の 4 節 |
| `S-84` | 1 / 1 | `FR-016` |
| `S-85` | 1 / 4 | `FR-017`・用語集・`S-135`・`S-219` の欄（`S-219` の「`S-85` が 17.5 なので」は値を変えないので真） |
| `S-135` | 0 / 2 | 表 T-205 の注と導出表（J-07 〜 J-09） |
| `S-221` | 1 / 2 | `FR-020`（表 T-048 の `WM-13` —— 行を名指すだけ） |
| `IX-4`・`IX-10` | 1 / 1 ・ 1 / 1 | `CR-555` の後、`IX-1` が `IX-4` を、`IX-4` が `IX-10` を指す（`87d98a47` ではどちらも 0 / 0） |
| `EP-1` | 1 / 4 | `FR-051`・`S-225`・`S-226`・`S-235` の欄 |
| `S-33` | 2 / 2 | `FR-001`（`:1115`、形状に対するずれとは別と言う）・`FR-003`（`OC-10`）—— E-03 で `EP-1` が 3 つ目になる |
| `FR-017` | 8 / 25（`87d98a47` では 7 / 24） | 本書は文を書かない |
| `FR-025` | 4 / 14 | 本書は文を書かない（表 T-241 の 2 行だけ） |
| `FR-080` | 7 / 26（`87d98a47` では 6 / 24） | 本書は文を書かない（E-02 が名指す） |
| 表 T-205 | 2 要求（2 次 18。`87d98a47` では 12） | `FR-017`・`FR-018`。`05-07-design.md` の `LF-1`「しきい値の導き方は 表 T-205 の注が持つ」—— 真のまま |
| 表 T-241 | 1 要求（2 次 4） | `FR-025`（2 次: `FR-021`・`FR-076`・`FR-080`・`FR-096`） |

⭐ 導いた条項ごとに `rulings.md` を引いた（規則 02 の 1）: `S-81`・`exportCanvas`・`1600` → `JDG-724` だけ（1600 × 900 を原則とした言葉は `rulings.md` には無く、`change-request/CR-333-*.md` の冒頭と試験の注にだけ在る —— `JDG-724` がそれを覆す）。`S-83`・`S-84`・`rulerTier` → `JDG-720` だけ。`IX-10`・透過 → `JDG-723` だけ。`EP-1`・`labelBaseline`・`S-33` → 0 件。

### 6.2 `induced.py`

| 種 | 解決 | 種の中の辺 | 閉路 | 扱い |
|---|---|---|---|---|
| `S-81 S-83 S-84 S-85 S-135 S-221 T-205 FR-017 TM-2 TM-3 T-238 IX-1 IX-4 IX-10 T-241 FR-025 FR-080 S-146 EP-1 T-076 S-33 U-27 S-225 S-217 FR-016 NS-3 T-231` | 27/27 | 38 | 3: `FR-025` `FR-080` `S-81` ／ `FR-017` `S-85` ／ `EP-1` `S-225` | 3 つとも値の行と規則を持つ要求の作法の閉路である（規則 02 の「直してはならない」）。本書はそれぞれ 1 つの計画・1 つの波で書く（`R1.3` の ③ 〜 ⑤）—— 要求の側（`FR-025` の文・`FR-080`・`FR-017`・`S-225`）は書かない |

⚠️ `87d98a47`（`CR-555` の前）で 25 の種を測ったときも同じ 3 閉路（辺 35）。

---

## 7. 数の予測

| 数 | 前（作業木。`87d98a47` ＋ `CR-555`） | 後（本書だけ） | 内訳 |
|---|--:|--:|---|
| tables | 190 | 190 | — |
| figures | 28 | 28 | — |
| rows | 2384 | 2384 | 行を足しも消しもしない（値と文だけ） |
| uids | 164 | 164 | — |
| 設定値の行 | — | ±0 | `S-81`・`S-83`・`S-84` の値が変わる |

⚠️ 前の数は `CR-555` を当てている最中の作業木で測った（2026-09-26）。本書の差はどの木でも 0 である。

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

⛔ **当てる順**: `CR-555` → 本書 → `CR-572`（調整役の決定）。⚠️ 波 2 は `999f9f10` が木に入ってから（入っていなければ、先に取り込む）。

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 11 節の問い 1 の答えを J-03・J-09・D-02・D-04・D-06 に当てる。4 節の旧 20 塊をその時点の木で数え直す（13 節） | 調整役 |
| 1 | `docs/spec/_source/settings.json`・`docs/spec/01-04-requirements.md`・`sample-schedule/` の 2 つ・`docs/guides/schedule-to-grs-json/grs-skeleton.json`（と生成物） | 4 節を当て、`npm run gen` と `npm run gen:check`。閉路 3 つは同じ手 | 仕様の体 |
| 2 | `src/adapter/image-exporter/image-exporter.ts` とその試験 | 9 節の地の色の矩形 | 実装の体（Sonnet） |
| 2t | `tests/`（新しいファイル `cr-584-*.test.ts` だけ） | 下の試験 | ⭐ 仕様だけを読む試験の体。実装の体と別 |
| 3 | ― | 試験・`dist` を建て直し、起動文書で月の段を目で確かめる。`GRS_PERF` で目盛の段が増えた分を測る（0 節 ① の ⚠️） | 調整役 |

仕様だけの試験の体が確かめること（期待値は表の値から試験の中で計算し、コードの値を写さない）:

| # | 確かめること |
|---|---|
| T1 | `rulerTierOf` の判定で、12px の目盛のとき 0.5 px/日 ちょうどで月の段、0.49 で年の段。2 px/日 ちょうどで週の段（問い 1 が B なら 2.3）。`S-83`・`S-84` は `SETTINGS_DEFAULTS` から読む |
| T2 | 28 日の月に `12` のラベルと `S-135` が収まり、30.4 日で割った値では収まらない（表 T-205 の注の読み） |
| T3 | 書き出した `.png` に透過の画素が 0（ウインドウ 1920 × 953 と、`S-81` より縦長の画面の 2 つ）。空白の画素の色が `S-146`（明・暗の 2 テーマ） |
| T4 | 書き出した `.svg` の最初の描画要素が `0 0 幅 高さ` を `S-146` で塗る |
| T5 | 1373 × 773 の画面で、SVG の `height`・`viewBox` の高さ・`heightPx` が同じ整数 1081。端数 0.0049 は切り上げず、0.005 は切り上げる |
| T6 | 書き出した `Document Title` のベースラインが、帯の中点 ＋ `S-225` × `S-235` × `S-33`（× 比）に在り、字の外接矩形の上端が絵の上端より下 |

⭐ 壊す試験（合わせた木の写しで）: 地の色の矩形を外す → T3・T4 が赤。`settings.json` の `S-83` を 1.4 に戻して `npm run gen` → T1・T2 が赤。

⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| 所（今の置き場） | 直すこと | 毎フレーム |
|---|---|---|
| `src/entity/document-model/document-settings/document-settings.ts`（生成の区画 `SETTINGS_DEFAULTS`） | `npm run gen` が `'exportCanvas.height'` 1080・`'exportCanvas.width'` 1920・`'rulerTierPxPerDayMonth'` 0.5・`'rulerTierPxPerDayWeek'` 2 を刷る | しきい値は はい —— `time-axis.ts` の `rulerTierOf` が毎フレーム読む（値だけが変わる）。`exportCanvas` は いいえ（書き出しのときだけ） |
| `src/framework/single-html-shell/startup-template.json` | `npm run gen`（`npm run startup`）が書き直す | いいえ |
| `src/adapter/image-exporter/image-exporter.ts` の `exportSvg` | 切り抜きの中の最初の子に、`0 0 width height` の矩形を `colourOf('S-146', …)` で置く（`DFC-1145` の修正案。約 2 行）。⚠️ `chromeGround` は `S-150` を返すので使わない | いいえ |
| 同 `exportSvg` の高さ・`appHeaderSvg` の題の縦 | `999f9f10` が既にこの形。木に無ければ取り込む | いいえ |
| ⭐ **`R2.21` の片付けの候補（直さない）** | 「帯の縦の中点 ＋ 字の大きさ × `labelBaseline`」が 2 か所にある —— `src/adapter/svg-renderer/schedule-task-figures.ts` の `labelSvg`（`:228`）と、`999f9f10` の `src/adapter/image-exporter/image-exporter.ts` の `appHeaderSvg`（写しは `DFC-1144` の修正案が、性能セッションの持ち場を避けるために選んだ）。⇒ 片付けの巡で、1 つの純粋な関数（公開の入口、表 T-064）にして両方から呼ぶ。`R2.22` の索引で既存の入口を先に探す | `labelSvg` は はい |
| 試験 | `S-81` を表や `SETTINGS_DEFAULTS` から読む試験は値に付いてくる（`tests/unit/uf-47-48-choosers.test.ts`、`999f9f10` の `tests/contract/ix-4-ep-1-the-exported-height-is-whole-and-the-title-stays-inside.test.ts`）。自分で `exportCanvas: { width: 1600, height: 900 }` を組む 5 ファイル（`tests/contract/dfc-295-…`・`dfc-322-…`・`tests/unit/fr-001-fr-083-…`・`fr-023-…`・`h10-…`）は変えなくてよい。見本を読む試験（`tests/nfr/nfr-002-003-…`・`tests/system/cr-570-tree-state-stage.ts`・`tests/unit/cr-567-…`・`cr-569-…`・`tests/usecase/uc-harness.ts`）と、目盛の段を読む試験（`tests/integration/schedule-drawing.sws.test.ts`・`tests/usecase/uc-007-bring-the-range-into-view.test.ts`）は、波 1 の後に走らせて確かめる。注の古い文 `tests/unit/uf-27-28-29.test.ts:1662`「S-81 is `exportCanvas`, 1600 x 900」は波 2t の体が直してよい | ― |

---

## 10. ⛔ この変更でやらないこと

- `S-85`（17.5）・`S-219`・`S-221` の値を変えない（決定 4・5）。
- 導出表の日の段の行（採用 26）を書き直さない（決定 3）。⚠️ 台帳の候補: 26 は `S-135` が 8 だった頃の 18 ＋ 8 であり、`S-85` 17.5 と合わない。見本 `sample-schedule/Three-Year Product Plan.json` の `rulerTierPxPerDayDay` 26 も同じ古さ（`DFC-1140` の修正案が「前例」として挙げた）。
- ⚠️ 台帳の候補（調整役へ）: `S-85` の欄の導き方は「書き出す絵の描画幅は `S-81` の幅 − 行見出しパネル」とし、書き出す絵を `S-81` の幅で描き直す前提に立つ。だが `FR-080` は「`GRS` が占める画面の全体を … 縮めた絵」と定め、書き出す絵に入る日数は画面に入る日数と同じである（`S-81` に依らない）。同じ欄の実測「書き出した `.svg` に 66.3 日入る」は 1400 ÷ 21.11 ＝ 66.3 と一致し、測った値でなく割った値に見える。本書は数を 1920 に置き換えただけで、前提は直していない。
- ⚠️ 台帳の候補: 書き出す行見出しの縦（`image-exporter.ts` の `rowTitleSvg`）は `box.y + fontSizePx` で、`EP-3` も縦の位置を決めていない。画面の行見出しとの揃い方は測っていない。
- `FR-080` の文を書かない（空白を残す規則は残し、塗る色だけ `IX-10` が持つ）。
- 見本の古い形の読み替えを足さない（`JDG-724`）。
- コードの重複（9 節の `R2.21`）を直さない。

---

## 11. 前に立つ者へ返す問い

### 問い 1 —— `S-84`（週の段に変わる倍率）を 2 にするか 2.3 にするか

場面: 日程を縮めていき、目盛が「年 ＋ 月 ＋ 週」から「年 ＋ 月」に変わる所。週の始まりの日（`29` など 2 桁）が 1 週の幅に入る限り週の段を出す、というのが `JDG-720` の読み（「表示できるときは表示しろ」）である。

| 案 | 値 | 導き方 | 何が起きるか |
|---|---|---|---|
| **A（推す）** | 2 | 12px の目盛の基準で（2 桁 × 12 × 0.5 ＋ 隙間 2）÷ 7 ＝ 14 ÷ 7。`S-83` の 0.5 と同じ式 | 週のラベルがちょうど入る所まで週の段を出す。月の段と同じ読みで説明が 1 つに揃う |
| B | 2.3 | （画面で測った `12` の幅 14.2 ＋ 2）÷ 7 ＝ 2.31 —— 14px の目盛で測った幅を、12px の基準に直さずに使った値 | 週の段が出始めるのが少し遅くなる（1 刻み 1.121 倍でおよそ 1 刻み）。`S-83` の 0.5 と導き方が揃わず、欄に書ける式が無い（測った値として 🔎 を付けることになる） |

推す理由: `rulerTierOf` は px/日 を 14 ÷ 12 で割ってからしきい値と比べる（`FR-017` の判定式）ので、しきい値は 12px の基準で導くものである。B は 14px の幅をそのまま使うので、字の大きさの補正を 2 度掛けることになる。`JDG-720` の「約 2.3」は `DFC-1140` の見積もりから写した数で、`S-83` の 0.5 は同じ見積もりが 12px の基準で出した値である。代償: A は `JDG-720` の欄の数と違う値を書く。
⇒ **A なら 4 節のまま当てる。B なら J-03・J-09 の新の数を 2.3 に、J-03 の欄を「2.3 ＝（画面で測った `12` の幅 14.2px ＋ `S-135` 2px）÷ 7 日 🔎」に、D-02・D-04・D-06 の 2 を 2.3 にする。**

ほかに残っている問いは無い。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1140` | 月まで刷れる倍率で年しか刷らない | 本書を当てて閉じる（値・注・保存された値）。修正案の ③ の日の段の行は決定 3 で残した |
| `DFC-1145` | 書き出した `.png`／`.svg` の下と右が透過 | 本書で仕様の側（`IX-10`）。コードの側（9 節）は `実装待ち` のまま |
| `DFC-1146` | 書き出す絵を 1920 × 1080 に | 本書を当てて閉じる（`npm run gen` が `document-settings.ts` へ届ける） |
| `DFC-1143`・`DFC-1144` | 書き出す絵の高さの端数・題の見切れ（コードは `999f9f10`） | 本書の E-01・E-03 が、コードの形を仕様に書く。台帳の行は調整役が更新する |
| `JDG-720`・`JDG-723`・`JDG-724` | 0.1 節 | 調整役が状態を「指示 —— `CR-584` が当てる」にする（本書は `rulings.md` を触らない） |

---

## 13. 測り方の再現

```
# the tree: cr-organise 87d98a47; the coordinator was applying CR-555 in the same checkout (uncommitted)
git show 999f9f10 --stat
git show 999f9f10:src/adapter/image-exporter/image-exporter.ts     # exportSvg (grownHeight), appHeaderSvg (y), rounded()

# the rulings quoted in 0.1, verbatim
grep -n "JDG-72[034]" docs/development-records/rulings.md
grep -n "DFC-114[0-6]" docs/development-records/defects.md

# the graph (section 6), both tools, from the repo root
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-81 S-83 S-84 S-85 S-135 S-221 IX-4 IX-10 EP-1 S-33 FR-017 FR-025 FR-080 T-205 T-241
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py S-81 S-83 S-84 S-85 S-135 S-221 T-205 FR-017 TM-2 TM-3 T-238 IX-1 IX-4 IX-10 T-241 FR-025 FR-080 S-146 EP-1 T-076 S-33 U-27 S-225 S-217 FR-016 NS-3 T-231
#   -> 27/27, 38 edges, 3 cycles: FR-025 FR-080 S-81 ; FR-017 S-85 ; EP-1 S-225

# same-shape places (section 1.1)
git grep -n "1600\|× 900" -- docs/spec                         # S-81, S-85 (2), S-221 (2), a generator comment
git grep -n -A3 '"exportCanvas": {' -- '*.json'                # 2 samples, skeleton, startup template
git grep -n "rulerTierPxPerDayMonth\|rulerTierPxPerDayWeek" -- src sample-schedule docs/guides tests
git grep -n "labelBaseline" -- src                              # labelSvg :228 (+ appHeaderSvg at 999f9f10)
grep -c "1600" change-request/CR-572-*.md                     # 0 ; "1.4" 0 ; "4.3" only as a section number

# the height rule's numbers (0.2 item 7), scratchpad: draft/584-height.js (node, no npx)
#   773x1373: 1600 -> 900.80 -> 901 ; 1920 -> 1080.96 -> 1081
#   1080.0049 -> 1080 ; 1080.005 -> 1081

# every old block of section 4 occurs exactly once, in two trees, and the edits apply
#   scratchpad: draft/584-verify.py <repo> <this CR> <CR-555> <scratch>   (2026-09-26, HEAD 87d98a47)
#   tree A = the working tree (87d98a47 + CR-555 being applied, uncommitted)
#   tree B = 87d98a47 with CR-555's E-19 and E-20 applied to 01-04-requirements.md
#   edits parsed: 20 E-01 .. D-06
#   A-worktree: problems 0, applied 20 of 20, json ok      (every old block counted 1 before its edit)
#   B-base+CR555: problems 0, applied 20 of 20, json ok
#   then, on a copy of the working tree's docs/spec with the edits applied:
#   python docs/spec/_source/settings_json_to_md.py         -> 19 tables, 335 rows
#   md-checks.py <copy>   -> exit 0 ; tables=190 figures=28 rows=2384 uids=164 (same as before)
#   check-spec-holds-no-history.py <copy>  -> 0 sites
#   ⚠️ a first draft of J-10 said "表 T-205 の 3 つのしきい値" and check 9 read it as a row count
#      (T-205 holds 6 rows); the text now names the rows instead
```
