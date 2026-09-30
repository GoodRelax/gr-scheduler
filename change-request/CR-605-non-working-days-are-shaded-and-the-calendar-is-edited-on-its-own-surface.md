# CR-605 — 非稼働日を灰色に塗り、暦を専用の面で編集する

> 起草の状態: 起草（2026-10-01、枝 `b1-drawing-crs`、作業 B1。調整役の割り当て）。仕様にもコードにもまだ当てていない。当てる時期は調整役が決める（段 B の L4 が合流した後に 1 度で当てる。8 節）。
> 読んだ木: `refactor` `b4af9080`（起草の枝 `b1-drawing-crs` の `361595cf` も、`docs/spec`・`src`・`tests` は同じ）。行番号・数は、すべてこの木で測った（13 節）。4 節の旧は、スクリプトが木から読み出して 1 回だけ現れることを確かめてから書いた。
> ID の帯: 調整役から `CR-603` 〜 `CR-605`・`PND-607` 〜 `PND-608`・`JDG-960` 〜 `JDG-964`（と予備の `JDG-991` ・ `JDG-992`）を受けた。⚠️ 本書は仕様の識別子を 16 取る（2 節）。帯を配られていない種類なので、⛔ 当てる直前に空きを測り直すこと（規則 02 の 2.5）。
> 当てる順: `CR-602`（基準日線ほかの色）の後。`LM-20` の数は `CR-602` の色で測った。旧を共有する草案は無い（13 節）。
> 閉じるもの: `DFC-1359`、`PND-432`（着地）、`PND-490`（`JDG-961`）、`JDG-889`、`JDG-960`、`JDG-961`、`JDG-963`、`JDG-964`、`JDG-991`、`JDG-992`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-889` | 「#40 稼働日のカレンダーをサポートせよ。<br>土日祝日の背景をグレーとせよ。」 | 非稼働日を灰色に塗る。暦を編集できるようにする | 部 A（E-01〜E-04）・部 B（E-05〜E-18） |
| `JDG-960` | 「内蔵しない (Recommended)」 | 祝日の一覧を持たない。`S-107` を保つ | 変えない（10 節） |
| `JDG-961` | 「暦を1つ作って指す (Recommended)」 | 文書の暦が既定に解けるとき、`CM-39` が `Calendar` を作って指させる（`PND-490` の案②） | E-05・E-09 |
| `JDG-963` | 「明 黒6%・暗 黒25% (Recommended)」 | 塗りの色 `S-450`。明るいテーマで線が 3 : 1 を割ることを制限事項に記す | E-01・E-03・E-04 |
| `JDG-964` | 「日の段 : 塗る<br>週の段と月の段: 例外日は塗る<br>年の段: 塗らない<br>理由: 週や月の段に土日を塗るとノイジー。 しかし盆暮れや春節を忘れると困る。 これなら判定も楽だろ？」 | 目盛の段で塗る範囲を決める | E-02 の `OD-2` |
| `JDG-991` | 「コマンドパレット (Recommended)」 | 暦の編集面の入口は コマンドパレット | E-05・E-11 |
| `JDG-992` | 「MSPDIの仕様はどうなってる？ これに合わせたい。」／「繰り返しなしで休みも稼働も (Recommended)」 | 繰り返しの無い例外日（`Type` = 9）を、休みも稼働も足し・直し・消す。取り込んだ繰り返しは消すだけ | E-05 の `WC-4` 〜 `WC-6` |
| `PND-432`（2026-09-07） | 「裁定はすべて提案通りでよい。」 | 暦の面を独立して立てる（案②）。曜日 7 つのトグルと例外日の可変長リストを 1 枚で扱う | 部 B |

問うた場面（2026-10-01）: 触れる見本 `previous-project-result/24-pause-glyph-and-weekend-shade/weekend-shade-sample.html` の撮影画像（明・暗・暗で黒を重ねたもの・低い倍率で全部塗ったもの）と、見本が測った比の表を見せて問うた。

### 0.2 調べた結果（b4af9080）

1. **`FR-054`（MUST）の塗りは作られていない。** STATEMENT は「非稼働日（週末・祝日）を稼働日と区別して描くこと」と定めるが、描き方も色も仕様に無い（表 T-236 に行が無い）。コードの `src/adapter/svg-renderer/schedule-grid.ts` は行の帯（`:231`）と日付罫線（`:247`〜`:272`）だけを描く。
2. **塗る日を決める述語は既に在る。** `src/entity/document-model/schedule/working-calendar.ts:76` の `isWorkingDay` が、曜日と例外日の区間（繰り返しは展開しない）で稼働日を答える。期間の計算と同じ述語で塗れば、描いた灰色と数えた日数が食い違わない（`OD-1`）。
3. **行の帯は不透明に塗られる**（`schedule-grid.ts:232`〜`:237`、行の色は表 T-294 の帯の列）。⇒ 塗りは帯の上に半透明で重ねるしかなく、黒を薄く重ねる色なら帯の色を選ばない（`OD-5`）。前例は 表 T-236 の `S-170`（`rgba(0,0,0,0.28)`）。
4. **目盛の段はしきい値 3 つで決まる**（表 T-205 の `S-83` 0.5・`S-84` 2・`S-85` 17.5 px/日、`src/entity/layout-engine/schedule-layout/time-axis.ts:24`〜`:31` の `rulerTierOf`）。⇒ `OD-2` は新しいしきい値を持たず、`layout.tier` を読むだけで決まる。
5. **明るいテーマで NFR-007 を割る。** 見本の表（表 T-305 の 10 色相の最悪、`CR-602` の色）で、`S-450` 明を重ねた行の帯の上のカーソル 2.64 : 1、イナズマ線 2.88 : 1。塗りの無い帯の上でもカーソルは 3.01 : 1 しかない。暗いテーマは黒を重ねると比が上がる（全部 3 : 1 以上）。⇒ `LM-20`。
6. **暦の面は仕様に無い**（`PND-432`、2026-09-07 に裁定、未着地）。`CM-39`（`setCalendar`）に人の入口が 1 つも無い。コードの `src/use-case/edit-document/edit-calendar.ts:19`〜`:25` の命令は稼働する曜日と週の始まりだけを運び、例外日を運ばない。`:63`〜`:68` は文書の暦が既定に解けると拒む（STOP、`PND-490`）。
7. **新しい暦の `uid` の採り方は既に在る。** `Resource` と `Assignment` は `Project.uidHighWaterMark`（表 T-058 の `AT-20`）に従う（`01-04-requirements.md:2208`〜`:2209`）。`GRS` が足す暦の `ordinal` は既にある最大の次（`AT-67`）。
8. **面の作法の手本は名簿である**（`FR-099` の 表 T-257、`U-49`）。開いている面は画面の値 `S-99g` と状態機械 `openSurfaceStateMachine` の `surfaceName`（`docs/spec/_source/state-machines.json:1698`〜`:1710`）が持ち、`UZ-13`（重なりの順）・`EP-11`（書き出さない面）・`IC-52`（閉じる入口）が面を名指す。
9. **色の行は生成器の群に載るまで src に届かない。** `tools/generate_entity_types.py:1701` 〜 の `COLOUR_TARGETS['SCHEDULE_COLOURS']` に `S-450` を足す必要がある（規則 02 の 3.5）。⛔ その生成器は L4 の持ち場である。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`UC-007`（暦）と `FR-054`（MUST）の未達を閉じる** —— 描くと定めたまま描いていなかった。
- ⭐ **`GL-006`（説明を読まずに操作できる）** —— 休みの列が灰色なら、バーが週末をまたいで伸びる理由が絵で読める。
- ⭐ **`UC-007` の暦の編集** —— 自社の休業日を入れる手段が無いと、既定のままでは日数が実態と合わない（`FR-088` の RATIONALE）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（唯一の正）** —— 塗る日は数える日と同じ述語（`OD-1`）。塗りの範囲は目盛の段を読む（`OD-2`）。面の作法は 表 T-257 を指す（写さない）。
- **`R2.21`（1 つの仕事は 1 か所）** —— 例外日も曜日も週の始まりも、1 つの命令 `CM-39` が 1 回の書き込みで運ぶ（`FR-088` の `WS-3` の全か無か）。
- **`R1.4`（異常系・境界値）** —— 始まりが終わりより後の行・重なる行・空の名前の扱いは、`JDG-78`（異常系は `DFC-586` の後）により `PND-607` に預ける（11 節）。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` を「暦」「祝日」「例外日」「非稼働」「週末」「`S-107`」「`CM-39`」「`PND-432`」「`PND-490`」で引いた。当たるのは 0.1 節の行と `JDG-21`（何も変えない書き込みは段を残さない）・`JDG-300`（`PND-489` の告げる件数）で、どれも本書と食い違わない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 塗りは `Row Area` だけで、目盛の帯は塗らない（`OD-3`） | 目盛の帯は曜日の字を持ち、地を変えると字の比が落ちる。見本の既定もそうした | 無い |
| 決定 2 | 塗りを行の帯の上、罫線と図形の下に置く（`OD-4`） | 帯は不透明（0.2 節の 3）。罫線と図形は塗りに隠されてはならない | 無い |
| 決定 3 | 塗りを 1 つの要素にまとめる（`OD-6`） | 毎フレーム描く（`JDG-605`）。見本で、1.2 px/日 の 758 日に 109 の連なりが 1 つの path に収まった | 無い |
| 決定 4 | 書き出しも同じに塗る（`OD-7`） | 行の帯を画面と同じに描くのと同じ（`schedule-grid.ts:205`〜`:206` の注、`EP-5`） | 書き出す絵が変わる |
| 決定 5 | 面は下書きを持ち、当てるときだけ書く（`WC-7`） | `PND-432` の理由（通知と取り消しの段が曜日の数だけ積もる） | 閉じると下書きが消える |
| 決定 6 | 入口 `IC-132` をパレットの「表示」の群に、名簿（`IC-62`）の隣に置く | 名簿と同じ「一覧の面を開く」入口である | 無い |
| 決定 7 | 足した行の初めの日は今日（端末の日付）、休み（`WC-6`） | 休業日を足す手が最も多い（`JDG-889`）。基準日は置かれていないことがある | 無い |
| 決定 8 | 作る暦は `isBaseCalendar` を真とする | `FR-054` の解き方の 2 番目（基準の暦のうち `ordinal` 最小）でも同じ暦に解ける | 無い |
| 決定 9 | 面の題・入口の語は表示語の原稿に置く（E-16〜E-18）。語は 13 節の見出しのとおり | `FR-038` の辞書 | 利用者が語を直すなら、当てる前に |

---

## 1. 範囲 —— 行き先

| 部 | 何 | 仕様で変える所 | 編集 |
|---|---|---|---|
| A | 塗りの色 | 表 T-236 に `S-450`（原稿 `settings.json`） | E-01 |
| A | 塗り方 | `FR-054` の RATIONALE の終わりに 1 段落と 表 T-343（`OD-1` 〜 `OD-7`） | E-02 |
| A | 3 : 1 を割ること | 制限事項の表に `LM-20`、`NFR-007` の RATIONALE に 1 文 | E-03・E-04 |
| B | 暦の面・入口・下書き・例外日・作る暦 | `FR-088` の RATIONALE の終わりに 1 段落と 表 T-344（`WC-1` 〜 `WC-7`） | E-05 |
| B | 開いている面の名指し | `UZ-13`・`EP-11`・状態機械の `surfaceName` | E-06・E-07・E-13 |
| B | 用語・命令・入口 | 表 T-103 に `U-65`、表 T-108 の `CM-39`、表 T-109 の `IC-52` と `IC-132` 〜 `IC-138` | E-08〜E-12 |
| B | 接頭辞・表示語 | 登録簿に `OD` ・ `WC`、表示語に入口 7 つと面の題 | E-14〜E-18 |

**数**: 表を 2 つ足す（T-343・T-344）。行を足す: 表 T-343 に 7・表 T-344 に 7・`S-450`・`LM-20`・`U-65`・`IC-132` 〜 `IC-138`（7）。行の編集: `UZ-13`・`EP-11`・`CM-39`・`IC-52`。要求の文の追加: `FR-054`・`FR-088`・`NFR-007`。図 0。

---

## 2. 新しい識別子

⚠️ すべて起草のときの見込みである。⛔ 当てる直前に、`docs/spec` ・ `change-request` ・ 全ての枝（`git for-each-ref`）で空きを測り直し、日付と木の sha を横に書くこと（規則 02 の 2.5）。起草のときの測り方は 13 節。

| 種類 | 番号・名 | 何か | 測った（2026-10-01、全ての枝と `change-request/`） |
|---|---|---|---|
| 表 | `T-343` | `FR-054` の非稼働日の塗り | `docs/spec` の表の最大は `T-339`。⚠️ ほかの枝と草案が `T-340` 〜 `T-342` を取っているので、その次を選んだ |
| 表 | `T-344` | `FR-088` の暦の編集面の欄と入口 | 同上 |
| 行 ID の接頭辞 | `OD`（Off Day） | 表 T-343 の行 | 登録簿 189 件に無い。見まがう接頭辞（`OC`・`OP`・`OR`・`OW`）とは 2 字目が違う |
| 行 ID の接頭辞 | `WC`（Working Calendar） | 表 T-344 の行 | 登録簿に無い。`W`・`WB`・`WM`・`WR`・`WS`・`WY` とは 2 字目が違う |
| 行 | `S-450` | 表 T-236「非稼働日の塗り」 | `docs/spec` の設定値の最大は `S-447`。⚠️ ほかの枝が `S-448` ・ `S-449` を使っているので、その次を選んだ（`S-999` は試験の作り物） |
| 行 | `LM-20` | 制限事項「塗りの上で 3 : 1 を割る」 | `docs/spec` の制限事項の最大は `LM-19` |
| 行 | `U-65` | 表 T-103 `Calendar Editor` | `docs/spec` の UI パーツの最大は `U-64` |
| 行 | `IC-132` 〜 `IC-138` | 表 T-109 の入口 7 つ | `docs/spec` の入口の最大は `IC-131` |
| 表示語の面の名 | `Calendar Editor` | `surfaces` の 1 項 | 0 件 |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

本書は行も文も消さない。書き換わるのは次の 4 か所の字面だけである。

| 書き換わるもの | 所（b4af9080） | 新 | 編集 |
|---|---|---|---|
| `UZ-13` の面の列挙の末尾 | `01-04-requirements.md:4668` | `Calendar Editor`（`U-65`）を足す | E-06 |
| `EP-11` の面の列挙の末尾 | `01-04-requirements.md:6337` | 同上 | E-07 |
| `CM-39` の「暦と週の始まりを直す」 | `tbl-glossary.md:449` | 例外日と作る暦を含めた文 | E-09 |
| `IC-52` の面の列挙の末尾 | `tbl-glossary.md:595` | `Calendar Editor` を足す | E-10 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（b4af9080 でどれも 1 回。スクリプトが確かめた）。旧・新は行の全体（末の改行まで）である。⭐ 段落を足す編集は、段落の終わりに足す（規則 02 の 4）。

<!-- EDIT id=E-01 file=docs/spec/_source/settings.json -->
旧
```text
    {
     "id": "S-167",
     "name": {
      "ja": "交互の行の地の色"
     },
     "light": {
      "colour": "hsl(H 20% 99%)",
      "code": true
     },
     "dark": {
      "colour": "hsl(H 14% 11%)",
      "code": true
     },
     "hue": {
      "ja": "○"
     },
     "note": {
      "ja": "縞"
     }
    },
```
新
```text
    {
     "id": "S-167",
     "name": {
      "ja": "交互の行の地の色"
     },
     "light": {
      "colour": "hsl(H 20% 99%)",
      "code": true
     },
     "dark": {
      "colour": "hsl(H 14% 11%)",
      "code": true
     },
     "hue": {
      "ja": "○"
     },
     "note": {
      "ja": "縞"
     }
    },
    {
     "id": "S-450",
     "name": {
      "ja": "非稼働日の塗り"
     },
     "light": {
      "colour": "rgba(0,0,0,0.06)",
      "code": true
     },
     "dark": {
      "colour": "rgba(0,0,0,0.25)",
      "code": true
     },
     "hue": {
      "ja": "—"
     },
     "note": {
      "ja": "非稼働日の列を塗る（`FR-054` の 表 T-343）。行の帯と行の色の上に重ねる。⭐ 黒を薄く重ねる色である —— テーマの色相・行の色（表 T-294）のどの帯の上でも、同じだけ暗く見える。⭐ 利用者が触れる見本（`previous-project-result/24-pause-glyph-and-weekend-shade/`）を見て選んだ値である（`JDG-963`）。⚠️ 明るいテーマでは、塗りの上でカーソルとイナズマ線が `NFR-007` の 3 : 1 を割る —— 制限事項 `LM-20`。⛔ テーマの色相に追随させない"
     }
    },
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧
```text
**時刻の部分は解釈せず、書き戻すためにそのまま保つ**（表 T-033 の `EX-2` / `EX-7`）。
```
新
```text
**時刻の部分は解釈せず、書き戻すためにそのまま保つ**（表 T-033 の `EX-2` / `EX-7`）。

非稼働日を描くときは 表 T-343 に従うこと（MUST）。
⭐ 塗る日は、稼働日を数えるのと同じ文書の暦で決める —— 描いた灰色と数えた日数が食い違うと、人はどちらを信じればよいか分からない。

**表 T-343 — 非稼働日の塗り**

| 行 ID | 項目 | 定め |
| --- | --- | --- |
| OD-1 | 塗る日 | 本要求が決める文書の暦で、稼働日でない日を塗ること（MUST）。<br>曜日の稼働（`WeekDay`）と、繰り返しの無い例外日（`Exception`）の両方に従う。<br>⚠️ 繰り返しの例外日は実日付へ展開しない（本要求の RATIONALE）ので、塗らない。<br>⭐ 稼働にする例外日（`dayWorking` が真）は、週末でも塗らない |
| OD-2 | 倍率ごとの範囲 | 目盛の段（`_assets/tbl-settings.md` の 表 T-205 の `S-83` 〜 `S-85` が分ける段）で塗る範囲を決めること（MUST）。<br>「年 ＋ 月 ＋ 日 ＋ 曜日」の段では非稼働日をすべて塗る。<br>「年 ＋ 月 ＋ 週」と「年 ＋ 月」の段では、例外日で非稼働になった日だけを塗る。<br>「年」の段では塗らない。<br>⭐ 週や月の段で週末を塗ると細い縞が並んで見にくく、長い休業（例外日）は低い倍率でも見失いたくない（`JDG-964`）。<br>⭐ 段の判定は目盛が既に持っているので、新しいしきい値を持たない |
| OD-3 | 塗る場所 | `Row Area`（`_assets/tbl-glossary.md` の `U-50`）の上端から下端まで、その日の列の幅で塗ること（MUST）。<br>ピン止めした行（`U-46`）の上も塗る。<br>⛔ `Time Ruler`（`U-19`）の帯は塗らない（MUST NOT） —— 目盛の字の地を変えない |
| OD-4 | 重ね順 | 行の帯と行の色（`FR-042`）の上、日付罫線（`U-17`）・グループ罫線（`U-18`）と日程の図形の下に描くこと（MUST） |
| OD-5 | 色 | `_assets/tbl-settings.md` の 表 T-236 の `S-450` で塗ること（MUST）。<br>⭐ 黒を薄く重ねる色なので、下の帯の色を選ばない |
| OD-6 | まとめ方 | 続いた非稼働日を 1 つの矩形にまとめ、見えている矩形をすべて 1 つの図形の要素にまとめて描くこと（MUST） —— 毎フレーム描くので、要素の数を倍率と日数に依らず 1 つにする |
| OD-7 | 書き出し | 画像の書き出し（`FR-025`）でも、画面と同じ日を同じ色で塗ること（MUST） —— 行の帯を画面と同じに描くのと同じ扱いである |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
旧
```text
| LM-16 | **同じ語を名乗る呼び手どうしは見分けられず、互いの書き込みで起きない** | 書き手は 1 つの文字列であり（表 T-229 の `ED-2`）、`AG-6` はその等値だけで「自分以外か」を判定する。<br>**語が重なった 2 体は、互いの書き込みを自分のものと読む。<br>** ⭐ **画面と起動テンプレートについては起きない** —— 同表がその 2 語を予約している。<br>⚠️ 閉じるには監視の継ぎ目に書き手の識別を別で持たせることになり、それは別の判断である<br>⚠️ 同じ語で監視を購読できるのも 1 体だけである —— 後から購読した呼び手が先の購読を置き換え（表 T-035 の `AG-6`）、先の呼び手は知らされないまま監視を失う |
```
新
```text
| LM-16 | **同じ語を名乗る呼び手どうしは見分けられず、互いの書き込みで起きない** | 書き手は 1 つの文字列であり（表 T-229 の `ED-2`）、`AG-6` はその等値だけで「自分以外か」を判定する。<br>**語が重なった 2 体は、互いの書き込みを自分のものと読む。<br>** ⭐ **画面と起動テンプレートについては起きない** —— 同表がその 2 語を予約している。<br>⚠️ 閉じるには監視の継ぎ目に書き手の識別を別で持たせることになり、それは別の判断である<br>⚠️ 同じ語で監視を購読できるのも 1 体だけである —— 後から購読した呼び手が先の購読を置き換え（表 T-035 の `AG-6`）、先の呼び手は知らされないまま監視を失う |
| LM-20 | 明るいテーマでは、非稼働日の塗り（`FR-054` の 表 T-343）の上で、カーソル（`_assets/tbl-settings.md` の `S-195`）とイナズマ線（`S-160`）が `NFR-007` の 3 : 1 を割る | 利用者が触れる見本を見て、割ることを知ったうえで塗りの濃さを選んだ（`JDG-963`）。<br>⭐ カーソルは塗りが無くても行の帯の上で 3.01 : 1 しかなく、どの灰色を重ねても割る。<br>測った最悪は、行の帯（`S-164`）の上でカーソル 2.64 : 1、イナズマ線 2.88 : 1（塗りの無い帯の上では 3.01 : 1 と 3.29 : 1）である。<br>測り方は、`CR-602` が決めた色（`S-195` 明 `#f500f5`、`S-160` 明 `#d66400`）と、表 T-236 の式に 表 T-305 の 10 色相を入れた地を sRGB へ換算し、`S-450` を重ねた地との WCAG 2.1 の比の最悪を取った（`previous-project-result/24-pause-glyph-and-weekend-shade/weekend-shade-sample.html`、2026-10-01）。<br>⭐ 線は塗らない列を通って続くので、線そのものを見失うことはない |
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧
```text
⚠️ カスタムカラーと地の明度が近いと、モノクロで 3 : 1 を割りうる（彩度を落とすと色相差が明度差に化けない） —— その値は作成者が選んだものであり、`GRS` は補正しない（表 T-017b の `CV-8`）。
```
新
```text
⚠️ カスタムカラーと地の明度が近いと、モノクロで 3 : 1 を割りうる（彩度を落とすと色相差が明度差に化けない） —— その値は作成者が選んだものであり、`GRS` は補正しない（表 T-017b の `CV-8`）。  
⚠️ 明るいテーマでは、非稼働日の塗り（`FR-054`）の上でカーソルとイナズマ線が 3 : 1 を割る —— 利用者が承知して選んだ値であり、制限事項 `LM-20` に記す。
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
旧
```text
⚠️ **2 つの曜日の符号は別である** —— `Project.weekStartDay` と `WeekDay.dayType` は範囲が違い（表 T-058 の `AT-17` / `AT-73`）、どちらも交換相手へ書き出す列なので、符号の正は Chapter 6.2 が指す公式 XSD が持つ。
```
新
```text
⚠️ **2 つの曜日の符号は別である** —— `Project.weekStartDay` と `WeekDay.dayType` は範囲が違い（表 T-058 の `AT-17` / `AT-73`）、どちらも交換相手へ書き出す列なので、符号の正は Chapter 6.2 が指す公式 XSD が持つ。

暦の編集は `Calendar Editor`（`_assets/tbl-glossary.md` の `U-65`）で行うこと（MUST）。
**入口はコマンドパレットとすること（MUST）**（同書の 表 T-109 の `IC-132`、`JDG-991`）。
面の欄と入口は 表 T-344 に、字の大きさ・スクロール・罫線・閉じる入口は `FR-099` の 表 T-257 に従うこと（MUST） —— 名簿と同じ作法であり、面ごとに読み方を変えない。
⭐ 面は下書きを持ち、当てる入口（`IC-138`）を押したときだけ、表 T-108 の `CM-39` を 1 回発行すること（MUST） —— 曜日を 1 つ変えるたびに書き込むと、`FR-012` の告知が変えた数だけ出て、取り消しの段も同じ数だけ積もる（`PND-432`）。
閉じたときは下書きを捨てる。
例外日は、繰り返しの無いもの（表 T-058 の `AT-82` の `9`）を足し、直し、消せること（MUST）。
行ごとに休みか稼働か（`AT-81`）を選べること（MUST） —— 交換相手の `Exception` がその両方を持つ（`JDG-992`）。
⛔ 稼働にする日の時間帯を持たせてはならない（MUST NOT） —— 時刻を解釈しない（`FR-054`）。
⚠️ 取り込んだ繰り返しの例外日は、一覧に出して消せるようにし、直させてはならない（MUST NOT） —— 繰り返しを展開しない（`FR-054`）ので、直した結果を画面で確かめられない。
⭐ 文書の暦が 表 T-209 の既定に解けるとき、`CM-39` は同じ書き込みで `Calendar` を 1 行作り、`Project.calendarUid` に指させてから、曜日と例外日を書くこと（MUST。`JDG-961`） —— 作らないと、新しい文書では暦を 1 つも直せない。
作る暦の `uid` は `Project.uidHighWaterMark`（`AT-20`）に従って採り、`isBaseCalendar` を真とする。

**表 T-344 — 暦の編集面の欄と入口**

| 行 ID | 部分 | 定め |
| --- | --- | --- |
| WC-1 | 見出し | 面の見出しの行に、面の題と閉じる入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-52`）を置く（`FR-099` の 表 T-257 の `RR-6`） |
| WC-2 | 稼働する曜日 | 7 つの曜日の入口（`IC-133`）を、週の始まり（`WC-3`）から順に 1 列に並べる。<br>押すたびに、下書きの上でその曜日の稼働と非稼働が入れ替わる。<br>⛔ 7 つとも非稼働の下書きは当てない（表 T-220 の `IV-17`、本要求の上の MUST NOT） |
| WC-3 | 週の始まり | 7 つの曜日から 1 つを選ぶ入口（`IC-134`）。<br>値の置き場は `Project.weekStartDay` |
| WC-4 | 例外日の一覧 | 1 行に 1 つの例外日を、始まりの日の順に並べる。<br>欄は、名前（`AT-78`）・始まりの日（`AT-79`）・終わりの日（`AT-80`）・休みか稼働か（`IC-137`、`AT-81`）・消す入口（`IC-136`）。<br>⭐ 繰り返しの無い例外日では、始まりと終わりの日が実日付の範囲である |
| WC-5 | 繰り返しの例外日 | 取り込んだ繰り返しの例外日（`AT-82` が `9` でない行）は、名前と、繰り返しであることを示す語を出し、消す入口（`IC-136`）だけを置く。<br>⛔ 欄を直させない（本要求の上の MUST NOT） |
| WC-6 | 足す | 一覧の下に、例外日を足す入口（`IC-135`）を置く。<br>足した行は、名前を空、始まりと終わりの日を今日（端末の日付）、休みとし、`AT-82` を `9` とする |
| WC-7 | 当てる | 下書きを文書へ当てる入口（`IC-138`）を置く。<br>押したら `CM-39` を 1 回発行する。<br>⭐ 下書きが文書と同じなら書かない —— 何も変えなかった書き込みは取り消しの段を残さない（`FR-031`） |
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
旧
```text
| UZ-13 | 7 | 開いている面（`_assets/tbl-settings.md` の `S-99g`）のうち `Help Modal` を除くもの —— `Resource Roster`（`U-49`）・`Export Chooser`（`U-54`）・`Open Chooser`（`U-56`）・`Watermark Unlock`（`U-60`）・`Difference Review`（`U-61`）・`Import Report`（`U-62`） | 押した直後に 1 度だけ答えて閉じるもの —— いま行った操作への答えなので、開いたまま読むヘルプより手前。<br>`App Header` より手前でなければ、窓が低いとき面の閉じる入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-52`）がヘッダーに隠れる。<br>面は一度に 1 つしか開かないので、面どうしの前後を持たない |
```
新
```text
| UZ-13 | 7 | 開いている面（`_assets/tbl-settings.md` の `S-99g`）のうち `Help Modal` を除くもの —— `Resource Roster`（`U-49`）・`Export Chooser`（`U-54`）・`Open Chooser`（`U-56`）・`Watermark Unlock`（`U-60`）・`Difference Review`（`U-61`）・`Import Report`（`U-62`）・`Calendar Editor`（`U-65`） | 押した直後に 1 度だけ答えて閉じるもの —— いま行った操作への答えなので、開いたまま読むヘルプより手前。<br>`App Header` より手前でなければ、窓が低いとき面の閉じる入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-52`）がヘッダーに隠れる。<br>面は一度に 1 つしか開かないので、面どうしの前後を持たない |
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
旧
```text
| EP-11 | 重ねて出す面 —— `Command Palette`（`U-26`。<br>`Palette Groups` / `Palette Commands` は `U-34`）／ `Help Modal`（`U-30`）／ `Dialogue Field`（`U-44`）／ `Resource Roster`（`U-49`） | 描かない | 道具の操作面であり、日程ではない。<br>**`Command Palette` は閉じた状態として扱う**（本要求の前段） |
```
新
```text
| EP-11 | 重ねて出す面 —— `Command Palette`（`U-26`。<br>`Palette Groups` / `Palette Commands` は `U-34`）／ `Help Modal`（`U-30`）／ `Dialogue Field`（`U-44`）／ `Resource Roster`（`U-49`）／ `Calendar Editor`（`U-65`） | 描かない | 道具の操作面であり、日程ではない。<br>**`Command Palette` は閉じた状態として扱う**（本要求の前段） |
```

<!-- EDIT id=E-08 file=docs/spec/_assets/tbl-glossary.md -->
旧
```text
| U-64 | `Search Panel` | 検索パネル。<br>語で探したタスクとコメントボックスを表に並べ、押すとそこへ飛ぶ、浮く UI パーツ。<br>規則は `01-04-requirements.md` の `FR-151`。<br>⚠️ `tbl-settings.md` の `S-99g` の面ではない |
```
新
```text
| U-64 | `Search Panel` | 検索パネル。<br>語で探したタスクとコメントボックスを表に並べ、押すとそこへ飛ぶ、浮く UI パーツ。<br>規則は `01-04-requirements.md` の `FR-151`。<br>⚠️ `tbl-settings.md` の `S-99g` の面ではない |
| U-65 | `Calendar Editor` | 暦の編集面。<br>文書の暦（稼働する曜日・例外日）と週の始まりを直す面。<br>立てる規則は `01-04-requirements.md` の `FR-088`、欄と入口は同書の 表 T-344 |
```

<!-- EDIT id=E-09 file=docs/spec/_assets/tbl-glossary.md -->
旧
```text
| CM-39 | `Calendar` | `setCalendar` | ⭐ | 暦と週の始まりを直す | `FR-088` |
```
新
```text
| CM-39 | `Calendar` | `setCalendar` | ⭐ | 暦（稼働する曜日・例外日）と週の始まりを直す。<br>文書の暦が表 T-209 の既定に解けるときは、同じ書き込みで `Calendar` を 1 行作って `Project.calendarUid` に指させる（`JDG-961`） | `FR-088` |
```

<!-- EDIT id=E-10 file=docs/spec/_assets/tbl-glossary.md -->
旧
```text
| IC-52 | `Help Modal` / `Resource Roster` / `Export Chooser` / `Open Chooser` / `Properties Panel` / `Search Panel` | — | 開いている面とプロパティパネルと検索パネルを閉じる | 表 T-028 の `IN-4` | — | — |
```
新
```text
| IC-52 | `Help Modal` / `Resource Roster` / `Export Chooser` / `Open Chooser` / `Properties Panel` / `Search Panel` / `Calendar Editor` | — | 開いている面とプロパティパネルと検索パネルを閉じる | 表 T-028 の `IN-4` | — | — |
```

<!-- EDIT id=E-11 file=docs/spec/_assets/tbl-glossary.md -->
旧
```text
| IC-62 | `Command Palette` | 表示 | 担当者の名簿を表示する | `FR-099` | — | — |
```
新
```text
| IC-62 | `Command Palette` | 表示 | 担当者の名簿を表示する | `FR-099` | — | — |
| IC-132 | `Command Palette` | 表示 | 暦の編集面を開く（稼働する曜日・例外日・週の始まり） | `FR-088` | — | — |
```

<!-- EDIT id=E-12 file=docs/spec/_assets/tbl-glossary.md -->
旧
```text
| IC-68 | `Resource Roster` | — | 選ばれていないことを示し、同じ入口で選ぶ | `FR-099` | — | — |
```
新
```text
| IC-68 | `Resource Roster` | — | 選ばれていないことを示し、同じ入口で選ぶ | `FR-099` | — | — |
| IC-133 | `Calendar Editor` | — | 曜日の稼働と非稼働を、下書きの上で入れ替える | `FR-088`（表 T-344 の `WC-2`） | — | — |
| IC-134 | `Calendar Editor` | — | 週の始まりの曜日を、下書きの上で選ぶ | `FR-088`（表 T-344 の `WC-3`） | — | — |
| IC-135 | `Calendar Editor` | — | 例外日の行を下書きに足す | `FR-088`（表 T-344 の `WC-6`） | — | — |
| IC-136 | `Calendar Editor` | — | 例外日の行を下書きから消す | `FR-088`（表 T-344 の `WC-4` ・ `WC-5`） | — | — |
| IC-137 | `Calendar Editor` | — | 例外日の休みと稼働を、下書きの上で入れ替える | `FR-088`（表 T-344 の `WC-4`） | — | — |
| IC-138 | `Calendar Editor` | — | 下書きを文書へ当てる（表 T-108 の `CM-39` を 1 回） | `FR-088`（表 T-344 の `WC-7`） | — | — |
```

<!-- EDIT id=E-13 file=docs/spec/_source/state-machines.json -->
旧
```text
         "rows": [
          "U-49",
          "U-54",
          "U-56",
          "U-60",
          "U-61",
          "U-62"
         ]
```
新
```text
         "rows": [
          "U-49",
          "U-54",
          "U-56",
          "U-60",
          "U-61",
          "U-62",
          "U-65"
         ]
```

<!-- EDIT id=E-14 file=docs/spec/_source/row-id-prefixes.json -->
旧
```text
  {
   "prefix": "OC",
   "words": "Occupancy",
   "owner": "spec",
   "means": {
    "ja": "形状の占有幅に算入するもの"
   }
  },
```
新
```text
  {
   "prefix": "OC",
   "words": "Occupancy",
   "owner": "spec",
   "means": {
    "ja": "形状の占有幅に算入するもの"
   }
  },
  {
   "prefix": "OD",
   "words": "Off Day",
   "owner": "spec",
   "means": {
    "ja": "非稼働日の塗り（表 T-343）"
   }
  },
```

<!-- EDIT id=E-15 file=docs/spec/_source/row-id-prefixes.json -->
旧
```text
  {
   "prefix": "WB",
   "words": "Window Behaviour",
   "owner": "spec",
   "means": {
    "ja": "ウインドウの状態（通常・最小化・最大化）"
   }
  },
```
新
```text
  {
   "prefix": "WB",
   "words": "Window Behaviour",
   "owner": "spec",
   "means": {
    "ja": "ウインドウの状態（通常・最小化・最大化）"
   }
  },
  {
   "prefix": "WC",
   "words": "Working Calendar",
   "owner": "spec",
   "means": {
    "ja": "暦の編集面の欄と入口（表 T-344）"
   }
  },
```

<!-- EDIT id=E-16 file=docs/spec/_source/display-words.json -->
旧
```text
  {
   "rowId": "IC-62",
   "label": {
    "ja": "名簿",
    "en": "Resource Roster"
   },
   "hint": {
    "ja": "文書が持つ担当者の一覧を表示する",
    "en": "Show the list of resources the document holds"
   }
  },
```
新
```text
  {
   "rowId": "IC-62",
   "label": {
    "ja": "名簿",
    "en": "Resource Roster"
   },
   "hint": {
    "ja": "文書が持つ担当者の一覧を表示する",
    "en": "Show the list of resources the document holds"
   }
  },
  {
   "rowId": "IC-132",
   "label": {
    "ja": "暦",
    "en": "Working calendar"
   },
   "hint": {
    "ja": "稼働する曜日・休業日・週の始まりを直す面を開く",
    "en": "Open the surface that edits the working weekdays, the exception days and the week start"
   }
  },
```

<!-- EDIT id=E-17 file=docs/spec/_source/display-words.json -->
旧
```text
  {
   "rowId": "IC-68",
   "label": {
    "ja": "未選択",
    "en": "Not selected"
   },
   "hint": {
    "ja": "この担当者は選ばれていない。押すと選ぶ",
    "en": "This resource is not selected; press to select it"
   }
  },
```
新
```text
  {
   "rowId": "IC-68",
   "label": {
    "ja": "未選択",
    "en": "Not selected"
   },
   "hint": {
    "ja": "この担当者は選ばれていない。押すと選ぶ",
    "en": "This resource is not selected; press to select it"
   }
  },
  {
   "rowId": "IC-133",
   "label": {
    "ja": "曜日",
    "en": "Weekday"
   },
   "hint": {
    "ja": "この曜日を稼働にするか休みにするかを切り替える（当てるまで文書は変わらない）",
    "en": "Switch this weekday between working and not working (the document changes only when applied)"
   }
  },
  {
   "rowId": "IC-134",
   "label": {
    "ja": "週の始まり",
    "en": "Week starts on"
   },
   "hint": {
    "ja": "週の目盛が書く曜日を選ぶ",
    "en": "Choose the weekday the week ticks start on"
   }
  },
  {
   "rowId": "IC-135",
   "label": {
    "ja": "足す",
    "en": "Add"
   },
   "hint": {
    "ja": "例外日の行を足す",
    "en": "Add an exception day row"
   }
  },
  {
   "rowId": "IC-136",
   "label": {
    "ja": "消す",
    "en": "Delete"
   },
   "hint": {
    "ja": "この例外日の行を消す（当てるまで文書は変わらない）",
    "en": "Delete this exception day row (the document changes only when applied)"
   }
  },
  {
   "rowId": "IC-137",
   "label": {
    "ja": "休み",
    "en": "Day off"
   },
   "hint": {
    "ja": "この例外日を休みにするか稼働にするかを切り替える",
    "en": "Switch this exception day between day off and working"
   }
  },
  {
   "rowId": "IC-138",
   "label": {
    "ja": "当てる",
    "en": "Apply"
   },
   "hint": {
    "ja": "下書きを文書へ当てる。取り消せる",
    "en": "Apply the draft to the document; it can be undone"
   }
  },
```

<!-- EDIT id=E-18 file=docs/spec/_source/display-words.json -->
旧
```text
  {
   "name": "Resource Roster",
   "heading": {
    "ja": "名簿",
    "en": "Resource Roster"
   }
  },
```
新
```text
  {
   "name": "Resource Roster",
   "heading": {
    "ja": "名簿",
    "en": "Resource Roster"
   }
  },
  {
   "name": "Calendar Editor",
   "heading": {
    "ja": "暦",
    "en": "Working calendar"
   }
  },
```

⚠️ E-01 の後、`S-450` を `tools/generate_entity_types.py` の `COLOUR_TARGETS['SCHEDULE_COLOURS']` に足す（規則 02 の 3.5。足さないと `gen:check` は緑のまま、行が src に届かない）。⛔ その生成器は L4 の持ち場なので、8 節の波 1 は L4 の合流の後である。

当てた後に打つもの: `npm run gen`（`tbl-settings.md`・`tbl-state-machines.md`・行 ID の登録簿の表・表示語の生成物・`SCHEDULE_COLOURS` を刷る）→ `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → vitest。`docs/development-records/changelog.md` に 1 行足す。`python tools/ledger_metrics.py` と `docs/spec/_source/row_id_prefixes_json_to_md.py`（`npm run gen` が含む）を打つ。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM A -- the shade (verbatim in the implementer's and the tester's brief)
- New colour row S-450 (table T-236): light rgba(0,0,0,0.06), dark
  rgba(0,0,0,0.25), not following the theme hue. In code it is
  SCHEDULE_COLOURS['S-450'] (generated), read through themed('S-450').
- Table T-343 (FR-054), rows OD-1..OD-7:
  OD-1 a day is shaded when isWorkingDay(workingCalendarOf(schedule), day)
       is false -- the same predicate the durations use.
  OD-2 layout.tier decides: 'yearMonthDayWeekday' shades every non-working
       day; 'yearMonthWeek' and 'yearMonth' shade only the days that an
       Exception made non-working; 'year' shades nothing.
  OD-3 from the top to the bottom of the Row Area, the day's column width;
       pinned rows too; never the Time Ruler band.
  OD-4 above the row bands (bandParts), below the date and group grid
       lines and every schedule figure.
  OD-5 fill = themed('S-450').
  OD-6 consecutive shaded days merge into one rectangle; all rectangles in
       view go into ONE <path> element (one element per frame).
  OD-7 the image export shades the same days the same way.
- File: src/adapter/svg-renderer/schedule-grid.ts (gridParts). Per frame: yes.

SEAM B -- the calendar surface
- U-65 'Calendar Editor' is a surface (S-99g; openSurfaceStateMachine
  surfaceName gains 'U-65'). Entry IC-132 in the Command Palette, group
  '表示', next to IC-62. Closed by IC-52 like the roster; layout per T-257
  RR-1..RR-6.
- Table T-344 (FR-088), rows WC-1..WC-7. The surface holds a DRAFT
  {workingDayTypes (1..7, AT-73), weekStartDay (0..6, AT-17), exceptions}.
  IC-133 toggles one weekday, IC-134 picks the week start, IC-135 adds an
  exception row (name '', from = to = today, dayWorking false,
  recurrenceKind 9), IC-136 deletes a row, IC-137 flips dayWorking,
  IC-138 applies: exactly ONE CM-39 per press; no write when the draft
  equals the document. Closing drops the draft.
- CM-39 (setCalendar) now also carries the exceptions list. When the
  document calendar resolves to the T-209 default, the SAME write adds a
  Calendar (uid from Project.uidHighWaterMark, ordinal = max + 1,
  isBaseCalendar true) and points Project.calendarUid at it, then writes
  the weekdays and exceptions. Undo reverts it in one step.
- Imported recurring exceptions (recurrenceKind != 9) are listed with the
  recurring word and can be deleted, never edited. No working times.
- Refusals and edge cases (from > to, overlaps, empty name) are NOT in
  this CR: PND-607, after DFC-586 (JDG-78).
```

---

## 6. グラフ（b4af9080）

- `impact.py FR-054`: 要求 7 件・参照 25 箇所。⭐ どれも「稼働日で数える」「暦は `FR-054`」と役を名指すだけで、描き方を写していない ⇒ E-02 はほかの文を書き換えない。
- `impact.py FR-088`: 要求 4 件・参照 12 箇所。同じく書き換え 0。
- `impact.py NFR-007`: 要求 4 件・参照 11 箇所。E-04 は RATIONALE の終わりに 1 文足すだけ。
- `impact.py IC-52`: 要求 7 件・参照 13 箇所。`UZ-13`（要求 1 件・参照 1）、`EP-11`（要求 1 件・参照 7）。面を列挙しているのは E-06・E-07・E-10・E-13 の 4 か所であり、ほかの参照は列挙を写していない。
- `impact.py CM-39`: 要求 0 件・参照 1（`fig-erd-detail.md:385` の `AT-72`「`GRS` が足す曜日の行（表 T-108 の `CM-39` ほか）は…」）。⭐ 作る暦の `ordinal` も同じ形（`AT-67`）なので、書き換え 0。
- `induced.py FR-054 FR-088 NFR-007 CM-39 IC-52 UZ-13 EP-11 S-107 T-236 T-103 T-109 T-205`: 種 12 のうち解決 12、種のあいだの辺 7、⚠️ **閉路 1（`FR-054` ・ `FR-088` ・ `S-107`）**。本書はそのうち `FR-054` と `FR-088` の 2 つを書くので、⛔ **E-02 と E-05 を 1 つの波で 1 度に当てる**（規則 02 の 1 の 3）。`S-107` は書かない（`JDG-960`）。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | b4af9080 | 本書を当てた後 | 差 |
|---|---|---|---|
| tables（`md-checks.py`） | 基準 | ＋2 | T-343・T-344 |
| rows | 基準 | ＋24 | `OD` 7・`WC` 7・`S-450`・`LM-20`・`U-65`・`IC-132` 〜 `IC-138` 7 |
| uids / figures | 基準 | 変わらない | 0 |
| 行 ID の接頭辞の登録簿 | 189 | 191 | ＋2（`OD`・`WC`） |
| 状態機械の `surfaceName` の行 | 6 | 7 | ＋1（`U-65`） |
| 表示語の `surfaces` | 基準 | ＋1 | `Calendar Editor` |
| 表示語の入口（`rowId` が `IC-`） | 基準 | ＋7 | `IC-132` 〜 `IC-138` |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 2 節の番号の空きを測り直す。4 節の旧を数える（どれも 1 回）。`CR-602` が当たっていることを確かめる | 調整役 |
| 1 | `docs/spec`（`01-04-requirements.md`・`tbl-glossary.md`）＋ `_source`（`settings.json`・`state-machines.json`・`row-id-prefixes.json`・`display-words.json`）＋ `tools/generate_entity_types.py` の `SCHEDULE_COLOURS` に `S-450` ＋ 生成物 ＋ `changelog.md` | E-01〜E-18 を 1 度に、`npm run gen`、`gen:check`、check.sh、vitest | 仕様の波。⛔ L4 の合流の後（生成器は L4 の持ち場）。⛔ E-02 と E-05 は閉路の 2 つなので同じコミット |
| 2A | `src/adapter/svg-renderer/schedule-grid.ts`（`gridParts`） | 5 節の SEAM A | 描画の持ち場（L1 の系統）。試験の体は `docs/spec` だけを読み、`OD-1` 〜 `OD-7` を試す（特に `OD-2` の 4 つの段、`OD-6` の要素 1 つ） |
| 2B | `src/use-case/edit-document/edit-calendar.ts`（`CM-39` の射程、作る暦）＋ 暦の面の新しいユニット（画面の値・面の描画・入口の翻訳） | 5 節の SEAM B | ⛔ 面を足す所は L4 の持ち場（`screen-state-input.ts`・`dom-screen-surface.ts`・`input-command-translator.ts`・`screen-values.ts`・`frame-loop.ts`）に触れる ⇒ L4 の合流の後。`edit-calendar.ts` だけは先に進めてよい（use-case 層、L4 の持ち場の外） |
| 3 | 試験 | 2A・2B の実装と並行に、仕様だけを読む試験の体（規則 04 の 1） | 試験の体 |

- ⛔ **毎フレームの経路: はい（2A）。** 着地させる者は `docs/development-records/perf-pending.md` に 1 行足す（`PW-2`、`JDG-605`）—— 触れるファイルは `src/adapter/svg-renderer/schedule-grid.ts`。⭐ 要素の数は `OD-6` で 1 つに抑えるが、日ごとに `isWorkingDay` を呼ぶ費用は見えている日数に比例する（1.2 px/日 の 1920px で約 1,600 日）。`indexOfCalendar` の索引を使い回すことを 2A の依頼文に書く。
- 2B の面は開いているあいだだけ描くので、閉じた画面の毎フレームの費用は変わらない。ただし面を描く道は L4 の毎フレームのファイルに入るので、2B の着地でも `perf-pending.md` に 1 行足す。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。e2e と `GRS_PERF` は調整役が決める。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `tools/generate_entity_types.py` | `SCHEDULE_COLOURS` に `S-450`（波 1。L4 の後） | いいえ |
| `src/adapter/svg-renderer/schedule-grid.ts` | SEAM A（波 2A） | はい |
| `src/use-case/edit-document/edit-calendar.ts` | 例外日を運ぶ、作る暦（波 2B）。`:63`〜`:68` の STOP を外す | いいえ |
| 暦の面のユニット（新）と L4 の持ち場のファイル | SEAM B（波 2B） | 開いているときだけ |
| `docs/development-records/pending-decisions.md` | `PND-432` を「着地」、`PND-490` を「裁定済（`JDG-961`）」、`PND-607` を足す | —— |
| `docs/development-records/defects.md` | `DFC-1359` を閉じる | —— |
| `docs/development-records/rulings.md` | 0.1 節の `JDG-` 行を「適用済」にする | —— |
| `docs/development-records/perf-pending.md` | 8 節の 2 行 | —— |

---

## 10. ⛔ この変更でやらないこと

- 祝日の一覧を持たない。`S-107` を変えない（`JDG-960`）。
- 繰り返しの例外日を展開しない。直させない（`FR-054`、`JDG-992`）。
- 稼働の時間帯を持たせない（`FR-054` は時刻を解釈しない）。
- `Task.calendarUid` ・ `Resource.calendarUid` を編集させない（文書の暦は 1 つ、`FR-054`）。
- 目盛の帯を塗らない（決定 1）。
- 始まりが終わりより後の行・重なる行・空の名前の扱いを決めない（11 節、`PND-607`）。

---

## 11. 前に立つ者へ返す問い

- **`PND-607`（本書が台帳に立てる）**: 暦の面で、始まりの日が終わりの日より後の行・範囲が重なる行・名前が空の行を当てようとしたとき、どうするか。⭐ 推奨: 当てる前に面の中でその行を示して当てさせない（`CM-39` は拒んで `NT-1` で告げる）。⛔ `JDG-78` により、異常系の手当ては `DFC-586`（リファクタの完了）の後に問う。本書は正常系だけを当てる。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `JDG-889` ・ `JDG-960` ・ `JDG-961` ・ `JDG-963` ・ `JDG-964` ・ `JDG-991` ・ `JDG-992` | 0.1 節 | 「指示 —— 調整役が投入時期を決める」。当てたら「適用済」 |
| `PND-432` | 暦の面（2026-09-07 に裁定） | 当てたら着地 |
| `PND-490` | 既定の暦のときの `CM-39` | `JDG-961` で裁定。当てたら着地 |
| `PND-607` | 11 節 | 未裁定（`JDG-78` の後） |
| `DFC-1359` | 0.2 節の 1 | `仕様待ち`。部 A・部 B が当たったら閉じる |

---

## 13. 測り方の再現

```
# the tree: refactor b4af9080

# every OLD block of section 4 appears once: the script that wrote this file
# asserted it (count == 1) for each of E-01..E-18 before writing.

# the shade is not drawn today (0.2 item 1)
grep -n "bandParts.push\|dateGridLinesVisible" src/adapter/svg-renderer/schedule-grid.ts

# the predicate and the tiers (0.2 items 2 and 4)
sed -n '70,80p' src/entity/document-model/schedule/working-calendar.ts
sed -n '20,31p' src/entity/layout-engine/schedule-layout/time-axis.ts

# the command today (0.2 item 6)
sed -n '19,25p;60,68p' src/use-case/edit-document/edit-calendar.ts

# the colour generator group (0.2 item 9)
grep -n "SCHEDULE_COLOURS" tools/generate_entity_types.py

# free identifiers (section 2), across every branch
for b in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin); do git grep -hoE '\bT-3[0-9]{2}\b' $b -- docs/spec change-request; done | sort -t- -k2 -n -u | tail -1   # -> T-342
# the same loop with S-4[0-9]{2}, LM-[0-9]+, U-[0-9]+, IC-[0-9]+  -> S-449, LM-19, U-64, IC-131

# contrast numbers (0.2 item 5, LM-20)
# open previous-project-result/24-pause-glyph-and-weekend-shade/weekend-shade-sample.html
# (light theme, default values) and read the table under the chart

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-054 FR-088 NFR-007 CM-39 IC-52 UZ-13 EP-11
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-054 FR-088 NFR-007 CM-39 IC-52 UZ-13 EP-11 S-107 T-236 T-103 T-109 T-205
```
