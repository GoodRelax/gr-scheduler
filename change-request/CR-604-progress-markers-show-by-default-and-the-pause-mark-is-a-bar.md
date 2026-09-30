# CR-604 — 進捗マーカーを既定で出し、中断の印を太めの横棒「−」にする

> 起草の状態: 当てた（2026-10-01、枝 `spec-pass-1001`、仕様の通し。`166415e0` の上）。E-01〜E-05 の旧はどれも 1 回で当たり、書き直した旧は 0。⚠️ E-01 の新の注から丸括弧「（`JDG-867`、2026-09-30。既定を偽とした `JDG-370` を覆した）」を落として当てた（仕様は裁定の ID と日付を持たない。検査 7）。新しい識別子は 0。⚠️ 波 1 の試験の `false` → `true` は仕様の体が試験を書けないので当てていない —— コードの巡が直す（赤は `cr-551-plan-dates…test.ts` の S-63 の 1 件と `schedule-drawing.sws.test.ts` の SWS-3 の 1 件）。
> 起草時の状態: 起草（2026-10-01、枝 `b1-drawing-crs`、作業 B1。調整役の割り当て）。仕様にもコードにもまだ当てていない。当てる時期は調整役が決める（段 B の L4 が合流した後に 1 度で当てる）。
> 読んだ木: `refactor` `b4af9080`（起草の枝 `b1-drawing-crs` の `361595cf` も、`docs/spec`・`src`・`tests` は同じ）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-603` 〜 `CR-605` を受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）—— 棒の太さは既にある `S-328` を共有する（`JDG-962`）。
> 当てる順: どの変更要求とも独立である。`CR-603`・`CR-605` と同じ波で当ててよい。
> 閉じるもの: `DFC-1337`、`DFC-1364`、`JDG-867`、`JDG-962`。覆すもの: `JDG-370`（既定で隠す）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-867` | 「#18 進捗マーカーはやっぱりデフォルトで表示しろ。<br>進捗の遅れはすぐに見たい。<br>進捗マーカーの / は意味が分からない。 一時停止を示す。 - にしろ。線の幅は太目に書け。」 | `S-63` の既定を真（`JDG-370` を覆す）。中断の印（表 T-021 の `PM-3`）を横棒にし、線を太めに | 4 節の E-01（既定）・E-02（記号）・E-03（描き方の文） |
| `JDG-962` | 「「!」と同じ 1.7 (Recommended)」 | 横棒の太さは `S-24` × `S-328`（1.7）。`S-328` を「!」と「−」で共有する | E-03・E-04 |
| `JDG-370`（覆される） | 「進捗マーカーはデフォルトを非表示にしろ」 | —— 本書が覆す。`JDG-371`（遅延診断を実行したときは自動で表示）はそのまま生きる | E-01。当てたら `JDG-370` の状態に「`JDG-867` が覆した」を足す |

問うた場面（2026-10-01）: 触れる見本 `previous-project-result/24-pause-glyph-and-weekend-shade/pause-glyph-sample.html` の撮影画像 2 枚（`pause-shared-light.png` = 1.7、`pause-own-2.6-round-light.png` = 2.6・端丸め）を見せて問うた。

### 0.2 調べた結果（b4af9080）

1. **既定は偽である。** 原稿 `docs/spec/_source/settings.json:1656` の `S-63` の既定が `false`。コードは生成物 `src/entity/document-model/document-settings/document-settings.ts:60`（`SETTINGS_DEFAULTS`、`npm run types` が刷る）と `src/framework/single-html-shell/startup-template.json:40852`（`npm run startup` が刷る）。
2. **仕様とコードで中断の記号が逆向きである（`DFC-1364`）。** 表 T-021 の `PM-3` は `( \ )`（`01-04-requirements.md:3205`）、コードは左下から右上へ「/」を描く（`src/adapter/svg-renderer/schedule-task-figures.ts:286`〜`:290`）。⭐ 本書はどちらも「−」に置き換えるので、どちらが正しかったかを選ばずに食い違いが消える。
3. **`S-328` は既に「棒の太さ」の共有の値である。** `FR-013`（`:3182`）が `(!)` の縦棒に、`FR-133` の 表 T-315（`:3556`〜`:3559`）が `?`・`!!`・`!` の線に同じ `S-328` を使う。名前だけが「遅れの記号 `(!)` の縦棒の太さ」のままである。
4. **`S-328` は生成器の群に載っている。** `tools/generate_entity_types.py:1425` の `NOT_STORED_DELAY_MARK_SIZES` が `S-328` と `S-341` を src へ運ぶ。⇒ 本書は設定値の行を足さないので、生成器（L4 の持ち場）に手を入れない（規則 02 の 3.5）。
5. **既定を偽と主張する試験が 1 つある。** `tests/unit/cr-551-plan-dates-delay-mark-chevron-and-old-documents.test.ts:390`〜`:401` は表・`SETTINGS_DEFAULTS`・起動テンプレートの 3 つが `false` で揃うことを主張する。⇒ 仕様と同じコミットで `true` に変える（8 節の波 1）。ほかの試験は `progressMarkerVisible` を明示して文書を作るか（`rowDocument(…, { progressMarkerVisible: false })` が 11 か所）、`IC-40` を押す前に値を読む（`tests/usecase/uc-005-record-actuals.test.ts:38`・`uc-006-find-delays.test.ts:58`）。
6. **FR-013 の 2 文を試験が引く。** 同じファイルの `:226` `FR_013_BAR` と `:227` `FR_013_PARTS` が、`:3182` と `:3183` をそのまま引く。⇒ E-03 は 2 文を書き換えず、`:3183` の後ろ（段落の終わり）に 1 文を足す（規則 02 の 4「段落の終わりに足せ」）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`UC-006`**（遅れを見つける）—— 利用者の言葉「進捗の遅れはすぐに見たい」。遅れの印 `PM-4` は進捗マーカーの上に出るので、既定で隠すと、開いた文書で遅れが見えない。
- ⭐ **`GL-006`**（説明を読まずに操作できる）—— 「/」は意味が伝わらなかった。横棒は一時停止の記号として読まれる（利用者「一時停止を示す」）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（唯一の正）** —— 記号の形は表 T-021、太さは `S-328` の 1 行。新しい係数の行を作らない（`JDG-962`）。
- **`R2.21`（1 つの仕事は 1 か所）** —— 「棒の太さ」の役は `S-328` がすでに 4 つの記号（`!`・`?`・`!!`・遅延の `!`）に負っている。名前をその役に合わせる（E-04）。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` を `S-63`・`progressMarkerVisible`・`PM-3`・「中断」・`S-328` で引いた。当たるのは `JDG-370`（覆す）・`JDG-371`（保つ）・`JDG-867`・`JDG-962` である。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 横棒の半分の長さは `S-341` × 円の半径（記号の半分の高さと同じ長さ） | 見本はこの長さで描き、利用者はそれを見て `JDG-962` を答えた。新しい数を作らない | 無い |
| 決定 2 | 横棒の端は切る（`butt`、SVG の既定） | `!` の縦棒も端を切って描く（`schedule-task-figures.ts:233`）。見本の 2 枚目の丸めた端は採られなかった | 無い |
| 決定 3 | 横棒は円の中心を通る水平の線とする | 「−」の字形そのもの | 無い |
| 決定 4 | 既定を真にしても、`JDG-371` の文（遅延診断が偽でも描く、`FR-133`）はそのまま残す | 人は `IC-40` でマーカーを消せる。そのときに診断が描く理由は変わらない | 無い |
| 決定 5 | 名称ラベルの位置が動くこと（`FR-109`、表 T-273）は仕様の変更ではない | 表 T-273 はマーカーを出す場合も出さない場合も既に持つ | 起動した直後の絵が変わる（ラベルがマーカーの右へ寄る） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 進捗マーカーの既定 | 表 T-202 の `S-63`（原稿 `settings.json:1656`） | E-01 |
| 中断の記号 | 表 T-021 の `PM-3`（`01-04-requirements.md:3205`） | E-02 |
| 中断の記号の描き方 | `FR-013`（`01-04-requirements.md:3183` の後ろ） | E-03 |
| 棒の太さの係数の名前 | 表 T-206 の `S-328`（原稿 `settings.json:4320`） | E-04 |
| 記号の半分の高さの名前 | 表 T-206 の `S-341`（原稿 `settings.json:4503`） | E-05 |

**数**: 表の行の編集 1（E-02）・要求の文の追加 1（E-03）・原稿 JSON の行の編集 3（E-01・E-04・E-05）。行の増減 0。図 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・関数の名のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（b4af9080） | 置き換わる先 | 編集 |
|---|---|---|---|
| `S-63` の既定 `"false"` | `settings.json:1656` の行 | `"true"` と、理由の文（`JDG-867`） | E-01 |
| `PM-3` の記号 `( \ )` | `01-04-requirements.md:3205` | `( − )` | E-02 |
| `S-328` の名「遅れの記号 `(!)` の縦棒の太さの、`S-24` に対する係数（`FR-013`）」 | `settings.json:4320` の行 | 「進捗マーカーの記号の棒の太さの、…」（`!` の縦棒・`−` の横棒、`FR-133` の記号も名指す） | E-04 |
| コードの「/」 | `schedule-task-figures.ts:286`〜`:290` | 中心を通る横棒 | 波 2（コード） |
| 試験の `false` の主張 | `cr-551-plan-dates-delay-mark-chevron-and-old-documents.test.ts:390`〜`:401` | `true` | 波 1（仕様と同じコミット） |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（b4af9080 でどれも 1 回）。

<!-- EDIT id=E-01 file=docs/spec/_source/settings.json -->
旧
```text
     "id": "S-63",
     "key": "`progressMarkerVisible`",
     "type": {
      "ja": "真偽"
     },
     "default": {
      "lit": "false",
      "code": true
     },
     "min": "—",
     "max": "—",
     "note": {
      "ja": "進捗マーカー（`FR-013`）と再開アイコン（`FR-044`）。寸法をズームに追随させない規則は `FR-094` が持つ。遅延診断を出しているあいだは、偽でもマーカーを描く —— 理由は画面の値 `delayDiagnosticsShown`（表 T-206 の `S-445`、`FR-133`）が持つ"
     }
```
新
```text
     "id": "S-63",
     "key": "`progressMarkerVisible`",
     "type": {
      "ja": "真偽"
     },
     "default": {
      "lit": "true",
      "code": true
     },
     "min": "—",
     "max": "—",
     "note": {
      "ja": "進捗マーカー（`FR-013`）と再開アイコン（`FR-044`）。寸法をズームに追随させない規則は `FR-094` が持つ。遅延診断を出しているあいだは、偽でもマーカーを描く —— 理由は画面の値 `delayDiagnosticsShown`（表 T-206 の `S-445`、`FR-133`）が持つ。⭐ 既定を真とするのは、利用者が進捗の遅れをすぐに見たいと求めたからである（`JDG-867`、2026-09-30。既定を偽とした `JDG-370` を覆した）—— 遅れの印（表 T-021 の `PM-4`）はマーカーの上に出るので、隠すと開いた文書で遅れが見えない"
     }
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧
```text
| PM-3 | `( \ )` | 中断 | 中断・再開予定あり ＋ 中断・再開日未定 |
```
新
```text
| PM-3 | `( − )` | 中断 | 中断・再開予定あり ＋ 中断・再開日未定 |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
旧
```text
縦棒の下端・点の中心・点の半径は、同表の `S-329` ・ `S-330` ・ `S-331` とすること（MUST） —— 縦棒の下端と点の上端のあいだに隙間を空け、`!` を 2 つの形として読ませる。  
```
新
```text
縦棒の下端・点の中心・点の半径は、同表の `S-329` ・ `S-330` ・ `S-331` とすること（MUST） —— 縦棒の下端と点の上端のあいだに隙間を空け、`!` を 2 つの形として読ませる。  
⭐ 中断の記号 `( − )`（表 T-021 の `PM-3`）は、円の中心を通る水平の横棒 1 本とし、半分の長さを円の半径に 表 T-206 の `S-341` を掛けた値、太さを `S-24` に同表の `S-328` を掛けた値とすること（MUST） —— 横棒は一時停止を表し、`!` の縦棒と同じ太さで描くと、記号の族として揃って読める。  
```

<!-- EDIT id=E-04 file=docs/spec/_source/settings.json -->
旧
```text
      "ja": "遅れの記号 `(!)` の縦棒の太さの、`S-24` に対する係数（`FR-013`）"
```
新
```text
      "ja": "進捗マーカーの記号の棒の太さの、`S-24` に対する係数 —— 遅れの記号 `(!)` の縦棒と中断の記号 `( − )` の横棒（表 T-021 の `PM-3` ・ `PM-4`、`FR-013`）、および遅延診断の記号の線（`FR-133` の 表 T-315）"
```

<!-- EDIT id=E-05 file=docs/spec/_source/settings.json -->
旧
```text
      "ja": "進捗マーカーの記号の半分の高さの、マーカーの円の半径に対する比（表 T-021 の `PM-2` ・ `PM-3` ・ `PM-4`、`FR-013`）"
```
新
```text
      "ja": "進捗マーカーの記号の半分の高さの、マーカーの円の半径に対する比（表 T-021 の `PM-2` ・ `PM-3` ・ `PM-4`、`FR-013`）。横棒だけの `PM-3` では半分の長さである"
```

⚠️ E-04 の `S-328` の注（「⭐ 記号の形は `FR-094` の宣言した寸法だけで描く —— 本行と `S-329` 〜 `S-331` がその宣言である」）は変えない —— 横棒は `S-328` と `S-341` だけで描けるので、宣言の集合は同じである。

当てた後に打つもの: `npm run gen`（`tbl-settings.md`・`document-settings.ts`・`startup-template.json` を刷る）→ `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → vitest（仕様の試験が原稿を読む。規則 02 の 1 の 6）。`docs/development-records/changelog.md` に 1 行足す。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- Table T-202 row S-63 progressMarkerVisible: default false -> true.
  It reaches src through npm run gen only (SETTINGS_DEFAULTS in
  document-settings.ts, and startup-template.json via npm run startup).
  FR-133 is unchanged: delay diagnostics still draws markers when S-63 is false.
- Table T-021 row PM-3: the symbol is "( − )", a single horizontal bar through
  the circle centre. Half length = circle radius x S-341 (0.5).
  Stroke width = S-24 markerStroke x S-328 (1.7), the same as the "!" bar.
  Ends are butt (the SVG default), like the "!" bar.
- In code, draw it with NOT_STORED_DELAY_MARK_SIZES['S-328'] and ['S-341'];
  no new constant, no new settings row, no generator change.
- Test change in the spec commit: the S-63 case in
  tests/unit/cr-551-plan-dates-delay-mark-chevron-and-old-documents.test.ts
  (lines 390-401) expects true in the table, SETTINGS_DEFAULTS and the template.
- New test (tester, spec only): a PM-3 marker draws exactly one horizontal
  line whose y1 == y2 == centre.y, whose length == 2 x radius x S-341 and
  whose stroke-width == markerStroke x S-328.
```

---

## 6. グラフ（b4af9080）

- `impact.py S-63`: 要求 5 件・参照 10 箇所（`FR-003:1610`・`FR-045:3260`・`FR-130:3358`・`FR-133:3539`〜`:3540`・`FR-049:5730`〜`:5731`・`tbl-glossary.md:580` の `IC-40`・`tbl-settings.md:462`・`:536`）。⭐ どれも「`S-63` が偽でも」「`S-63` に従わせない」「`S-63` を書かない」と行の役を述べるだけで、既定の値を写していない ⇒ 書き換え 0。
- `impact.py PM-3`: 要求 2 件（`FR-044:3101`・`FR-013:3209`）・参照 1（`tbl-settings.md:453` の `S-341`）。どれも記号の字形を写していない ⇒ E-05 の名前の補いだけ。
- `impact.py S-328`: 要求 2 件（`FR-013:3182`・`FR-133:3556`〜`:3559`）。E-04 の名前が両方を名指すようになる。
- `impact.py S-341`: 要求 1 件（`FR-133`）・参照 2（`S-329`・`S-330` の注）。
- `induced.py S-34 S-63 PM-3 S-328 S-341`: 種 5 のうち解決 5、種のあいだの辺 1、閉路 0。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | b4af9080 | 本書を当てた後 | 差 |
|---|---|---|---|
| 表 T-021 の行 | 6 | 6 | 0 |
| 設定値の行 | 変わらない | 変わらない | 0 |
| tables / figures / rows / uids（`md-checks.py`） | 変わらない | 変わらない | 0 |
| `01-04-requirements.md` の `( \ )` | 1 | 0 | −1 |
| `01-04-requirements.md` の `( − )` | 0 | 2 | ＋2（表と E-03 の文） |
| `FR-013` の中の `S-328` | 1 | 2 | ＋1 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧を数える（どれも 1 回） | 調整役 |
| 1 | `settings.json`（3 行）＋ `01-04-requirements.md`（2 か所）＋ 生成物 ＋ `changelog.md` ＋ `cr-551-plan-dates…test.ts:390`〜`:401` | E-01〜E-05、`npm run gen`、`gen:check`、check.sh、vitest。⛔ 試験の `false` → `true` は仕様と同じコミットに入れる —— 別にすると、間のコミットで試験が赤い | 仕様の波。⛔ L4 の合流の後（`npm run gen` が走らせる `tools/generate_entity_types.py` は L4 の持ち場） |
| 2 | `src/adapter/svg-renderer/schedule-task-figures.ts`（`markSymbolSvg` の `PM-3` の腕、`:286`〜`:290`） | 5 節の継ぎ目どおりに横棒を描く | 描画の持ち場（L1 の系統）。⭐ 試験の体は `docs/spec` だけを読み、5 節の新しい試験を書く |
| 3 | 既定が変わって赤くなった試験 | vitest を全部回し、`progressMarkerVisible` を暗に偽と仮定していた試験を洗う（絵の数・ラベルの位置を主張するもの）。直すのは試験の前提であって、仕様ではない。赤の数と名をこの節に書き足さず、調整役へ報告する | 試験の体 |

- ⭐ **毎フレームの経路: はい（描画）。** ただし `PM-3` の要素は「/」の 1 本が横棒の 1 本に替わるだけで、要素の数も費用も同じである。⭐ 既定が真になると、起動した直後から進捗マーカーを描く —— 描く要素は増える。⇒ `docs/development-records/perf-pending.md` に 1 行足し、`JDG-605` の時期（`main` の早送りの前）に測る。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。e2e と `GRS_PERF` は調整役が決める。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `src/adapter/svg-renderer/schedule-task-figures.ts:286`〜`:290` | 横棒を描く（波 2） | はい（費用は同じ） |
| `tests/unit/cr-551-plan-dates-delay-mark-chevron-and-old-documents.test.ts:390`〜`:401` | 既定の主張を `true` へ（波 1） | いいえ |
| `docs/development-records/perf-pending.md` | 既定で描く要素が増えることを 1 行（8 節） | —— |
| `docs/development-records/defects.md` | `DFC-1337`・`DFC-1364` を閉じる | いいえ |
| `docs/development-records/rulings.md` | `JDG-867`・`JDG-962` を「適用済」、`JDG-370` に「`JDG-867` が覆した」を足す | いいえ |
| ⚠️ 申し送り: ヘルプの絵 | 中断の記号を絵や字で説明している所が在れば `( − )` に揃える。b4af9080 で `docs/spec` の中に `( \ )` は表 T-021 の 1 か所だけだった（13 節）。ヘルプの原稿は当てる体がもう 1 度 grep する | いいえ |

---

## 10. ⛔ この変更でやらないこと

- `S-24`（輪の線の太さ 1.3）を変えない —— 利用者が太くしろと言ったのは中断の印の線である（`JDG-867` の「- にしろ。線の幅は太目に書け。」）。
- 「!」の太さ（`S-328` の値 1.7）を変えない（`JDG-962`）。
- `PM-3` が中断の 2 種（`PA-3` / `PA-4`）を 1 つの記号に畳むことを変えない —— 見分けは再開アイコンが持つ（`FR-044`）。

---

## 11. 前に立つ者へ返す問い

無い —— `JDG-867`・`JDG-962` が決めた。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `JDG-867` | 0.1 節 | 「指示 —— 調整役が投入時期を決める」。当てたら「適用済」 |
| `JDG-962` | 0.1 節 | 同上 |
| `JDG-370` | 覆される | 「適用済」のまま、`JDG-867` が覆したことを足す |
| `DFC-1337` | 0.2 節の 1 | `仕様待ち`。当てたら閉じる |
| `DFC-1364` | 0.2 節の 2 | `仕様待ち`。本書が両方を「−」に置き換えて閉じる |

---

## 13. 測り方の再現

```
# the tree: refactor b4af9080

# the old texts appear once (section 4)
grep -cF '"id": "S-63"' docs/spec/_source/settings.json          # -> 1 (the block starts at :1656)
grep -cF '| PM-3 | `( \ )` | 中断 |' docs/spec/01-04-requirements.md   # -> 1
grep -c '縦棒の下端・点の中心・点の半径は、同表の `S-329` ・ `S-330` ・ `S-331` とすること（MUST）' docs/spec/01-04-requirements.md   # -> 1

# the code draws "/" (section 0.2 item 2)
sed -n '286,290p' src/adapter/svg-renderer/schedule-task-figures.ts

# S-328 is shared and generated (section 0.2 items 3-4)
grep -n 'S-328' docs/spec/01-04-requirements.md
grep -n "NOT_STORED_DELAY_MARK_SIZES" tools/generate_entity_types.py

# tests on the default and on the FR-013 sentences (section 0.2 items 5-6)
sed -n '390,401p' tests/unit/cr-551-plan-dates-delay-mark-chevron-and-old-documents.test.ts
sed -n '226,227p' tests/unit/cr-551-plan-dates-delay-mark-chevron-and-old-documents.test.ts
git grep -n 'rowDocument(.*progressMarkerVisible: false' -- tests | wc -l   # -> 11 (13 lines name the key with false in all)

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-63 PM-3 S-328 S-341
```
