# CR-602 — 基準日線は青緑になり、選んだ依存線と送った先の線は色を変えずに 2px 太くなる

> 起草の状態: 起草（2026-10-01、枝 `status-line-colour`）。まだ当てていない。4 節の旧 28 件（E-01 〜 E-09 ・ J-01 〜 J-19）と 4.3 〜 4.5 節の旧 6 件は、読んだ木で各 1 回だった（13 節）。
> 読んだ木: `status-line-colour` `9552de12`（`refactor` `502edfd1` から切った木。`CR-596` が当たっている）。行番号・数は、すべてこの木で測った（13 節）。⚠️ `refactor` は起草中に `0590ad03` へ進んだが、進んだ分は本書の触るファイルに触れない（`git diff --stat 502edfd1 0590ad03` は `tbl-row-id-prefixes.md` と `tools/body_brief.py` だけ）。
> ID の帯: 調整役から `CR-602` を受けた。`JDG-910` 〜 `JDG-919` は書いてある（本書は台帳の行を足さない）。⭐ 本書は仕様の新しい識別子を 1 つも取らない —— `S-447` を書き換え、`S-446` ・ `S-448` を退ける（2 節）。
> ⛔ 当てる順: `CR-596` の後（本書が書き換える `EL-9` ・ `EL-16` ・ `SL-8` ・ `DC-8` ・ `VG-4` ・ `PE-12` の文と `S-446` 〜 `S-448` は `CR-596` が書いた。`9552de12` で当たっている）。`CR-598` ・ `CR-601` とは同じセルを 1 つも書き換えないので、仕様の文はどの順でもよい。⭐ 推す順は `CR-598` ・ `CR-601` の後か同じ回 —— 3 つとも `cr-596-…contract.test.ts` を書き直すので、試験の体を 1 つにする（6.3 節・8 節）。
> 閉じるもの: `DFC-1327`、`JDG-910` 〜 `JDG-919`。見本: `previous-project-result/23-status-date-line-colour/`。
> ⛔ **覆すもの**: `JDG-671` ・ `JDG-656`（`S-163` の朱）、`JDG-857` の `S-163` の値（紫はカーソル `S-195` へ移る）、`JDG-792` ・ `JDG-799` の色（`S-448` を退ける）、`JDG-793`（線 × 3・囲み 3px）、`JDG-795` ・ `JDG-796` の色と太さの部分、`JDG-840`（`S-448` と `S-195` の近さ —— どちらの値も無くなる）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-910` | 「基準線は 利用者の値（JDG-857） それと依存線の強調は依存線の色のままにしろ。 線を太くするだけでいい。 ただし、タスクやマイルス十ーんを囲うのはタスクやマイルストーンの淵(輪郭線)を太くして、依存線の色にしろ。 or 縁と同じ場所、同じ形で前面に囲い線を出せ。<br>意味わかる？ 両案のどちらがシンプルか検討しろ。 また、他のんセッションでも依存線を検討しているので、調整役を中心に連携しろ。」 | 強調した依存線は `S-159` のまま太くするだけ。囲みは (a) か (b)。⚠️ `S-163` ＝ `#ff40ff` は `JDG-912` ・ `JDG-916` が覆した | E-02 ・ E-04 ・ J-18。調整は 6.3 節 |
| `JDG-911` | 「(b)にしろ。 ただし、囲うのは予定だけにしろ。実績を囲うな。  また太線にするのも、既存の依存線に対して 2px 増やしただけにしろ。 サンプルの依存線の強調は線が太すぎてダサい。」 | 囲みは (b)（輪郭と同じ所・同じ形の線を前面に）。予定だけを囲む。線は依存線の太さ ＋ 2px | E-02 ・ E-04 ・ J-16 ・ J-17 |
| `JDG-912` | 「明だけ #f500f5 (Recommended)」 | 明の値は `#f500f5`、暗は `#ff40ff`（`JDG-919` がカーソルの値と読む） | J-10 ・ J-11 |
| `JDG-913` | 「カーソルの色も変える」 | カーソル `S-195` の色を変える | J-10 〜 J-12 |
| `JDG-914` | 「両方に当てる (Recommended)」 | 見せ方を選んだ依存線（`SL-8`）と送った先（`EL-16`）の両方に当てる。続きの印の点も `S-159`。`S-448` は使い道が無くなる | E-02 〜 E-04 ・ J-18 |
| `JDG-915` | 「提案通り 輪郭 +2px で。<br><br>それと、依存線とイナズマ線の色も近いな.... 依存線を落ち着いた濃いめの茶色にして、イナズマ線はやや明るめの橙にしてみろ。」 | 囲む線の太さは予定の輪郭 ＋ 2px（線も囲みも「自分の線 ＋ 2px」）。依存線を茶、イナズマ線を橙に | E-02 ・ J-17 |
| `JDG-916` | 「基準日を青緑にして、カーソルを今の基準日の色にしよう。」 | `S-163` を青緑 `#008a7c` ／ `#47d1bf` に | J-07 〜 J-09 |
| `JDG-917` | 「B1 茶 (Recommended)」 | `S-159` を `#6f472a` ／ `#b38461` に | J-01 〜 J-03 |
| `JDG-918` | 「O1 橙 (Recommended)」 | `S-160` を `#d66400` ／ `#ff9933` に | J-04 〜 J-06 |
| `JDG-919` | 「提案通りでOK。  カーソルを除くと、 依存線、イナズマ線、基準日がアースカラー (木の色)でセンス良いやん！」 | カーソル `S-195` はマゼンタ `#f500f5` ／ `#ff40ff`。4 色の組が決まった | J-10 〜 J-12 |

問うた場面: 枝 `status-line-colour` のセッションが、触れる見本（`previous-project-result/23-status-date-line-colour/status-date-line-colour-sample.html`）を見せて、`DFC-1327`（`JDG-857` ・ `JDG-895`）の基準日線の色から問い始め、答えがカーソル・依存線・イナズマ線の色と依存線の強調の見せ方へ広がった。見本の README の「決まった組の測った数」に測り方がある。

### 0.2 調べた結果（`9552de12`）

1. **強調の見せ方を持つ仕様の所は 9 つである。** 表 T-023c の `SL-8`（`01-04-requirements.md:2370`）、表 T-303 の `EL-9`（`:2822`）・ `EL-16`（`:2829`）、表 T-259 の `VG-4`（`:1337`）、表 T-267 の `HT-1`（`:4263`）、表 T-270 の `PE-12`（`:4402`）、表 T-029a の `DC-8`（`:5693`）、表 T-252 の `DS-7`（`:7747`）、表 T-075 の `UF-145`（`05-07-design.md:413`）。値の行は `S-178` ・ `S-446` ・ `S-447` ・ `S-448`（`_source/settings.json:3641` ・ `:4410` ・ `:4423` ・ `:6057`）と、`S-448` を名指す `S-195` の注（`:5405`）・ `S-178` を名指す `S-194` の注（`:3012`）。`impact.py` で数えた（6.1 節）。⭐ `S-448` を読む所は E-02 ・ E-03 ・ E-04 ・ E-07 ・ J-12 で全部であり、当てた後 `docs/spec` に 0 件になる（13 節の写しで確かめた）。
2. **`S-178` は 2 つの線の倍率を兼ねている。** 値の名が「選択された線の太さの倍率（表 T-023c の `SL-8`、表 T-029a の `DC-8`）」であり、依存線（`SL-8` ・ `VG-4` ・ `HT-1` ・ `DS-7` ・ `UF-145`）とカーソル（`DC-8`、`S-194` の注）の両方が読む。コードも同じ —— `svg-renderer.ts:128-130` の `selectedLineWidth` を、依存線（`schedule-task-figures.ts:775`）、カーソル（`schedule-overlays.ts:254`）、基準日線（`schedule-overlays.ts:295`）が呼び、当たり判定の太さは `dependency-route.ts:324` が `S-178` を掛けて持つ。⇒ 裁定は依存線だけを言う（`JDG-910` ・ `JDG-914`）ので、**`S-178` をカーソルだけの倍率に狭め、依存線は `S-447` を足す**形で分けた（決定 3）。
3. **囲みは今、前面の専用の層で描いている。** `schedule-task-figures.ts:608-610` が端の `Task` ごとに `aroundTaskSvg`（`:905-912`）を呼び、予定と実績の角を合わせた外接矩形を `selectionFrameSvg`（`svg-renderer.ts:109-124`）の `'endOutline'` の形 —— 実線、太さ `S-447`（画面の px、倍率なし）—— で描く。層は `endOutlineParts` で、`svg-renderer.ts:628` が表 T-020 の `ZO-10` の位置に重ねる。⇒ (b) はこの 1 か所を「予定の図形の輪郭をなぞる線」に替えるだけで済み、図形を描く道（`barSvg` `:450`、`layerSvg` `:418`）には触れない。
4. **予定の図形の形は 2 通りある。** `BarGeometry`（`schedule-geometry.ts:81-94`）の `form` が `'outline'`（`points`、マイルストーンは `layers` を持つ —— 役は `body` ・ `inner` ・ `dot` ・ `shade`、`:59`）か `'line'`（`from` ・ `to` ・ `strokeWidth` ・ `head` ・ `dots`）。`'line'` は表 T-012 の線だけの形 `SH-3` ・ `SH-4`（`01-04-requirements.md:1159-1160`）であり、輪郭を持たない。⇒ (b) をそのまま当てられないので、決定 5 と問い 1 にした。輪郭の太さは `settings.planStroke`（`S-39`、`schedule-task-figures.ts:551-563`）で、`screen-regions.ts:78-90` が表示の倍率を掛ける（`S-39` ＝ 1 は表示の倍率 100 で 0.625px、`S-18` ＝ 2.4 は 1.5px）。
5. **4 色の測った数（見本の README の数を測り直した）。** 表 T-305 の 10 色相それぞれで地 `S-146` と行の帯 `S-164` を 8 ビットの sRGB に丸め、WCAG 2.1 の相対輝度で比を求めた最小: `S-163` 3.80 ／ 6.15、`S-195` 3.02 ／ 4.10、`S-159` 7.17 ／ 3.53、`S-160` 3.30 ／ 5.44（明 ／ 暗）。⇒ **4 色とも `NFR-007` の 3 : 1 を満たす。例外の行も制限事項の行も要らない。** 色相の距離（16 進を sRGB として HLS の色相を求め、明どうし・暗どうしの差の小さいほう）: 基準日線とカーソル 126°、基準日線と依存線 147°、基準日線とイナズマ線 142°、カーソルと依存線 85°、カーソルとイナズマ線 88°、依存線とイナズマ線 3°（明 2.8° ／ 暗 4.4°）。⚠️ `JDG-918` の読みの「2°〜3°」は、暗では 4° である —— 利用者が見て採った組は変わらない。
6. **モノクロ（`FR-041` ／ `CV-7`）は変えない。** HSL の明度（(最大 ＋ 最小) ÷ 2 ÷ 255）で、基準日線と依存線がほぼ同じ —— 明 27.1% と 30.0%、暗 54.9% と 54.1%。`FR-041` の「依存線 `S-159` と基準日線 `S-163` …は、モノクロでは明度と形でしか分からない」（`:2103`）は真のまま（今は形だけで分かる）。
7. **新しい近さが 2 つ出る。** ① 注記の色 `S-312`（`#b45309`、色相 26、明度 37.1%）がイナズマ線から 2° ／ 4° になる（今は 354° の赤から 32°）。`FR-019` は離すことを SHOULD に留めている（`:5579-5580`）ので違反ではない —— 問い 3。② テーマの色相に追随する強調 `S-151` とカーソルが、`TH-9`（285）で 15°、`TH-8`（330）で 30° になる。基準日線と `S-151` は `TH-2`（190）で 16°。どれも形（縦の線と破線の枠）で見分ける —— 注に書く。
8. **試験。** 変わる値と文を引くのは `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts` だけ（13 節の `grep`）。`S-446` を `rowCells('T-206', 'S-446')`（`:102`）で読むので、当てた瞬間にこのファイルは読み込みで落ちる（規則 02 の 3.5 節）。⇒ 仕様の波と試験の波を同じ合流で当てる（8 節）。`S-163` ・ `S-195` ・ `S-159` の値は、試験がどれも表 T-236 から読む（`tests/unit/cr-551-fit-status-line-and-cursors.test.ts:57-58`、`tests/unit/cr-555-dependency-lines-are-elided.test.ts:828`）ので、値の変更だけでは落ちない。
9. **毎フレーム: はい。** 囲みは `taskFigureParts`（`schedule-task-figures.ts:495`）の `Task` ごとの繰り返しの中で、端の `Task` にだけ組む（`:608-610`）。線の色と太さは `inkOf`（`:771-777`）で線ごとに決める。当たり判定の太さは `dependency-route.ts:324`。3 つとも規則 04 の 5 節の「毎フレームの経路」の表（`docs/development-rules/04-verification.md:277-281`）の置き場（`src/adapter/svg-renderer/**` ・ `src/entity/layout-engine/**`）にある。変わる手間は、端の `Task` 1 つにつき矩形 1 つが輪郭の線 1 つ（マイルストーンは `body` の層の数）に替わることと、掛け算が足し算になることだけである。⇒ `perf-pending.md` に 1 行（`PW-2`）。
10. **仕様とコードの食い違いを 1 つ見つけた（本書は直さない）。** 選ばれた基準日線の太さを、`SL-8` は `S-438`（4px）と定めるが、コードは `S-333` × `S-178`（2 × 2 ＝ 4）で描く（`schedule-overlays.ts:295`）。今は値が一致するので絵は同じだが、どちらかを選び直すと黙ってずれる。⇒ 台帳の行として前に立つ者へ返す（12 節）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— 縦に走る 3 種の線（基準日線・カーソル 2 本・ガイドカーソル）と、選んだ依存線が色で紛れていた（`DFC-1327`: `S-163` の候補 `#ff40ff` と `S-195` ・ `S-448` が 16°〜19°）。4 色を 85° 以上に離し、選んだ線は依存線の色のまま太さと囲みで示す。
- ⚠️ **`CH-3`（ぬるサク）** —— 毎フレームの経路に触れる（0.2 節の 9）。手間は増えないと見込むが、測る（8 節）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— ① `SL-8` の「⛔ 対象自身の輪郭をなぞってはならない（MUST NOT）」と (b) の「輪郭と同じ所・同じ形」がぶつかる → 前者は選択の破線の枠の規則だと 1 文で限る（E-02 の末）。② `S-178` が依存線とカーソルの 2 つの規則を持つ → カーソルだけに狭め、依存線は `S-447` にする（決定 3）。③ 選んだ線の色を名指す文（`EL-9` ・ `EL-16` ・ `PE-12` ・ `DC-8` ・ `S-195` の注）が `S-448` を言い続けると偽になる → 全部を同じ回に書く。
- **`R1.4`（異常系・境界値）** —— ① 線だけの形（`SH-3` ／ `SH-4`）には輪郭が無い（決定 5、問い 1）。② 予定を描いていない端（`S-227` を切っている）—— 囲まない（決定 6）。③ 層を持つマイルストーン —— `body` の層だけをなぞる（決定 7）。④ 1 つの `Task` が 2 本の線の端 —— 囲みは 1 つ（`SL-8` の既存の ⚠️）。⑤ 端の `Task` そのものも選ばれている —— 破線の枠をその上に描く（既存の ⚠️、`ZO-10`）。⑥ 表示の倍率を変えた —— 足す 2px は画面の px（決定 2、問い 2）。
- **`R1b`（否定形の代わり）** —— 「⛔ 実績を囲んではならない」には「囲むのは予定だけ」を添えた。
- **`R2.21`（1 つの仕事は 1 か所）** —— 「自分の線に 2px 足す」を `S-447` の 1 行に持たせ、線と囲みの両方が読む（`JDG-915` の「1 つの規則」）。
- **`R5`（性能）** —— 0.2 節の 9。⛔ 最適化は進めない（`JDG-11`）。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` の `JDG-` の行を「基準日線」「S-163」「S-195」「S-448」「S-446」「S-447」「S-178」「囲み」「依存線の色」「イナズマ線」で引いた —— 当たるのは `JDG-656` ・ `JDG-671`、`JDG-790` 〜 `JDG-799`、`JDG-840`、`JDG-857`、`JDG-895`、`JDG-910` 〜 `JDG-919`。
⭐ 規則 06 の ① ② —— 公開の名（表 T-064）も型の形も変わらない。状態・出来事・運ぶ値を足さない。保存も交換もしない（色と太さは表 T-236 ・ 表 T-206 の保存しない値）。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `S-447` を「自分の線に足す 2px」の 1 行に書き換え、線と囲みの両方が読む。`S-446` ・ `S-448` は退ける（番号は `retired.py` に焼く）。新しい行は立てない | `JDG-915` の「線も囲みも「自分の線 ＋ 2px」の 1 つの規則」。`S-447` は既に画面の px の「依存線の端を囲む線の太さ」であり、同じ主題の値である | `S-447` の意味が「囲む線の太さ 3px」から「足す太さ 2px」へ変わる。`CR-596` の本文が言う `S-447` は、その日の記録として読む |
| 決定 2 | 足す 2px は画面の px とし、表示の倍率にもズームにも追随させない | 今の `S-447` と選択の枠 `S-174` が同じ扱い（`S-447` の注）。利用者は表示の倍率 100 で「2px」と言った | 表示の倍率 50 では線が 0.75px → 2.75px（3.7 倍）になる。問い 2 |
| 決定 3 | `S-178` はカーソルの倍率だけに狭める。`DC-8` を `SL-8` を引かない文に書き直す（E-07） | 裁定は依存線だけを言う。カーソルは 1px → 2px のまま | 「選ぶと太くする」規則が 2 つ（依存線は足す、カーソルは掛ける）になる |
| 決定 4 | 囲む線の太さは、予定の輪郭の太さ（`S-39` × 描く比）＋ `S-447`。層は今の `ZO-10` のまま | `JDG-911` の (b)、`JDG-915` | — |
| 決定 5 | 線だけの形（`SH-3` ／ `SH-4`）は、描いた予定の線そのものをなぞる —— 線は自分の太さ ＋ `S-447`、矢じりと点は縁を `S-447` の太さで | 「同じ所・同じ形」を、輪郭の無い形にも 1 つの規則で当てる | その線は前面の茶の線に覆われ、予定の線の色が見えなくなる（矢じりと点の中は見える）。問い 1 |
| 決定 6 | 予定を描いていない端は囲まない。実績を代わりに囲まない | `JDG-911` の「実績を囲うな」 | 予定を隠した表示では両端の囲みが出ない（線の太さは出る） |
| 決定 7 | 層を持つマイルストーンは `body` の層だけをなぞる | 輪郭を描くのは `body` の層だけ（`layerSvg` `:418-447` —— `inner` ・ `dot` ・ `shade` は中の印） | — |
| 決定 8 | 選択の破線の枠（`S-151`、予定と実績の外接矩形）は変えない。囲みの上に描く | `SL-8` の既存の ⚠️ と `ZO-10` | 端の `Task` が選ばれていると、茶の囲みと青の破線の枠が重なる（今と同じ） |
| 決定 9 | 色は利用者の選んだ 16 進で持ち、HSL は注に書く | `JDG-919` が 16 進で組を言った。4 色とも HSL と 16 進が 8 ビットで一致する（13 節） | `S-159` ・ `S-160` の値の書き方が HSL から 16 進に変わる |
| 決定 10 | `S-312` の注の 1 文だけを直し、色は変えない | `FR-019` の SHOULD。問い 3 | 注記の枠とイナズマ線が近い色のまま |
| 決定 11 | `FR-041` と `CV-7` の文は変えない | 0.2 節の 6（真のまま） | — |
| 決定 12 | 強調の矢じり（`emphasisArrowIdOf`）は、色が同じになるので普通の矢じりを使ってよい | 矢じりは `markerUnits="userSpaceOnUse"` で線の太さに追随しない（`schedule-task-figures.ts:481-491` の `dependencyArrowSvg`、`:487`） | コードの判断。5 節の継ぎ目に書く |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 選んだ依存線の見せ方 | 表 T-023c の `SL-8`（`:2370`） | E-02 | E-02 の新を旧へ |
| 続きの印の点の色 | 表 T-303 の `EL-9`（`:2822`） | E-03 | 同上 |
| 送った先の線の見せ方 | 表 T-303 の `EL-16`（`:2829`） | E-04 | 同上 |
| 線の太さを引く文 | `VG-4`（`:1337`）・ `HT-1`（`:4263`）・ `PE-12`（`:4402`）・ `DS-7`（`:7747`）・ `UF-145`（`05-07-design.md:413`） | E-01 ・ E-05 ・ E-06 ・ E-08 ・ E-09 | 同上 |
| カーソルの印 | 表 T-029a の `DC-8`（`:5693`）、`S-178` ・ `S-194` の注 | E-07 ・ J-13 〜 J-15 | 同上 |
| 4 色 | `S-159` ・ `S-160` ・ `S-163` ・ `S-195` の値と注 | J-01 〜 J-12 | 値を旧へ |
| 足す太さ ・ 退ける行 | `S-447`（書き換え）、`S-446` ・ `S-448`（退ける） | J-16 〜 J-18 | 塊を戻し、`retired.py` の席を外す |
| 注記の色の注 | `S-312` の注の 1 文 | J-19 | 同上 |
| `FR-041` ・ `CV-7` ・ `FR-009` の ⓪ ・ `ZO-10` ・ `EP-12` ・ `EL-17` 〜 `EL-21` ・ `S-224` ・ `S-438` | 変えない | — | — |

**数**: 文の編集 9（E-01 〜 E-09。`01-04-requirements.md` 8、`05-07-design.md` 1）。原稿 JSON の編集 19（J-01 〜 J-19）。生成器の群 3（4.3 節）。`retired.py` 1（4.4 節）。規則の文 1（4.5 節）。

---

## 2. 新しい識別子

本書は仕様の新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・状態・出来事・運ぶ値・関数の公開の名のどれも足さない。
⭐ 既にある行を 1 つ書き換え（`S-447`）、2 つを退ける（`S-446` ・ `S-448`）。退けた番号は振り直さず、`retired.py` に理由つきで焼く（規則 02 の 4 節）。⚠️ 退ける 2 行の次の行（`S-447` ・ `S-336`）の注は「同上」で始まらない —— 継ぎの頭を移す要は無い（13 節）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`9552de12`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `S-448`（選んだ線と送った先の色 `#ff2bbc` ／ `#db4db5`） | `_source/settings.json:6056-6075`（生成物 `tbl-settings.md:558`） | 依存線の色 `S-159` のまま | J-18 |
| `S-446`（送った先の線 ＝ `S-18` × 3） | `:4409-4421`（`tbl-settings.md:445`） | 線自身の太さ ＋ `S-447` | J-16 |
| `S-447` の「囲む線の太さ 3px」（絶対値） | `:4422-4434`（`tbl-settings.md:446`） | 自分の線に足す 2px（線と囲みの両方） | J-17 |
| `S-178` の依存線の分（× 2） | `SL-8`（`:2370`）・ `VG-4`（`:1337`）・ `HT-1`（`:4263`）・ `DS-7`（`:7747`）・ `UF-145`（`05-07-design.md:413`）・ `S-178` の値の名と注（`settings.json:3643` ・ `:3651`） | ＋ `S-447`。`S-178` はカーソル（`DC-8`）だけ | E-01 ・ E-02 ・ E-05 ・ E-08 ・ E-09 ・ J-13 ・ J-14 |
| `SL-8` の「描いた予定と実績の外接矩形に沿って、色 `S-448`・太さ `S-447` の実線で囲む」 | `:2370` | 予定の図形の輪郭と同じ所・同じ形の線、色 `S-159`、太さ 輪郭 ＋ `S-447`、前面。実績は囲まない | E-02 |
| `EL-9` の「選んだ線は `S-448`」 | `:2822` | 選んでも `S-159` | E-03 |
| `EL-16` の「色 `S-448`、太さ `S-18` × `S-446`」 | `:2829` | `SL-8` の見せ方 | E-04 |
| `PE-12` の「選んだ線の色」 | `:4402` | 選んだ線の太さ | E-06 |
| `DC-8` の「`SL-8` が依存線に定めるやり方」と「色（`S-448`）」 | `:5693` | `S-194` × `S-178` を自分で言う。`S-447` は当てない | E-07 |
| `S-194` の注の「`DC-8` が `SL-8` から引く」 | `settings.json:3012` | `DC-8` が持つ | J-15 |
| `S-159` の値 `hsl(26 88% 44%)` ／ `hsl(30 92% 60%)` と注 | `:5534` ・ `:5538` ・ `:5545` | `#6f472a` ／ `#b38461`、測った数の注 | J-01 〜 J-03 |
| `S-160` の値 `hsl(354 62% 42%)` ／ `hsl(354 70% 64%)` と注「依存線とは別の色」 | `:5554` ・ `:5558` ・ `:5565` | `#d66400` ／ `#ff9933` | J-04 〜 J-06 |
| `S-163` の値 `#d9381e` ／ `#ff5a3a` と注「赤寄りの朱」「18° ／ 20°」「14° ／ 16°」 | `:5706` ・ `:5710` ・ `:5717` | `#008a7c` ／ `#47d1bf` | J-07 〜 J-09 |
| `S-195` の値 `#c2188f` ／ `#f07ad0` と注の「`S-448`」 | `:5394` ・ `:5398` ・ `:5405` | `#f500f5` ／ `#ff40ff` | J-10 〜 J-12 |
| `S-312` の注の「色相 26 は依存線と同じ」 | `:5585` | 明 25 ／ 暗 26 とほぼ同じ、イナズマ線とも 2°〜4° | J-19 |
| コードの `S-448` ・ `S-446` ・ 外接矩形の囲み ・ `S-178` の依存線の分（⛔ 本書は直さない） | 9 節 | 5 節の継ぎ目 | 波 1b |
| 試験の `S-446` ・ `S-448` ・ `SL_8_*` ・ `EL_9_COLOUR` ・ `EL_16_LOOK`（⛔ 本書は直さない） | 9 節 | 新しい文から書き直す | 波 2 |

⭐ **消さないもの**（読み直して真のまま）: `SL-8` の「⚠️ 同じ `Task` が 2 本以上…囲みは 1 つ」「⚠️ 描かれていない端…は囲まない」「⚠️ 端の `Task` そのものも選ばれているときは、囲みの上に破線の枠を描く」、選択の枠（`S-174` ・ `S-175` ・ `S-151`）、基準日線の `S-438`。`EL-16` の囲みの文（「線の両端の `Task` を、`SL-8` が…定める囲みで囲む」）。`ZO-10`。`FR-009` の ⓪ ①。`EP-12`。`S-224`（地の色の縁 ＝ 線自身の太さ × 3）。`S-447` の注の「画面の px である —— 表示の倍率（`FR-039`）にもズームにも追随させない」（試験 `S_447_PX` が引く逐語を残した）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（`9552de12` で 28 件とも 1 回。13 節）。ファイルの改行は LF。
⚠️ 見出しに `partial` と書いたものは行の一部の置き換えであり、塊の末の改行を旧にも新にも含めない。`partial` の無い J-16 ・ J-18 は塊を丸ごと消す —— 塊の末の改行も消す。J-17 は塊を丸ごと置き換える。
⭐ 4.1 と 4.2 は、`9552de12` の写し（`docs/spec` を一時の場所へ写したもの）に上から順に当て、28 件とも 1 回ずつ当たり、`settings_json_to_md.py` と `md-checks.py` と `style-checks.py` が通ることを確かめた（13 節）。

### 4.1 文の編集（`docs/spec/01-04-requirements.md` ・ `05-07-design.md`）

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md partial -->
表 T-259 の `VG-4`（`:1337`）。旧
```text
⛔ 選ばれて 表 T-206 の `S-178` を掛けた太さでも、続きの印で送った先として同表の `S-446` を掛けた太さ（`FR-009` の 表 T-303 の `EL-16`）でも数えてはならない（MUST NOT）
```
新
```text
⛔ 選ばれた線と、続きの印で送った先の線（`FR-009` の 表 T-303 の `EL-16`）を、表 T-206 の `S-447` を足した太さで数えてはならない（MUST NOT）
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md partial -->
表 T-023c の `SL-8`（`:2370`）。旧の 2 文を新の 8 文に置き換える。旧
```text
依存線は、その線自身の太さに 表 T-206 の `S-178` を掛けて太く描くこと（MUST）。<br>選んだ依存線は、色を同書の 表 T-236 の `S-448` とし（矢じりと、`FR-009` の 表 T-303 の `EL-9` の続きの印の点を含む）、線の両端の `Task`（マイルストーンを含む）を、描いた予定と実績の外接矩形に沿って、色 `S-448`・太さ 表 T-206 の `S-447` の実線で囲むこと（MUST） —— どのタスクがどのタスクに依存するかを、線のまわりで読ませる。
```
新
```text
依存線は、その線自身の太さに 表 T-206 の `S-447` を足した太さで描き、色は変えないこと（MUST） —— 色は依存線の色（同書の 表 T-236 の `S-159`）のままとし、矢じりと、`FR-009` の 表 T-303 の `EL-9` の続きの印の点も同じとする。<br>⭐ 色を変えないのは、選んだ線に別の色を当てると、その色が同表のほかの線の色（カーソルの `S-195`、基準日線の `S-163`）と紛れるからである。<br>選んだ依存線の両端の `Task`（マイルストーンを含む）は、描いた予定の図形を、その輪郭と同じ所・同じ形の線で囲むこと（MUST） —— どのタスクがどのタスクに依存するかを、線のまわりで読ませる。<br>囲む線は、色を `S-159`、太さをその輪郭の太さ（表 T-201 の `S-39` に `FR-039` の描く比を掛けた太さ）に `S-447` を足した太さとし、図形の前（`FR-110` の 表 T-020 の `ZO-10`）に描くこと（MUST） —— 輪郭を太くせずに前へ重ねるので、図形を描く手順は変わらない。<br>⛔ 実績を囲んではならない（MUST NOT） —— 囲むのは予定だけであり、予定と実績を合わせた外接矩形でも囲まない。<br>⚠️ 輪郭を持たない線だけの形（`FR-001` の 表 T-012 の `SH-3` ／ `SH-4`）は、描いた予定の線そのものを同じ所・同じ形でなぞる —— 線はその太さに `S-447` を足した太さで、矢じりと点はその縁を `S-447` の太さで描く。<br>⚠️ 予定を描いていない端（予定の表示、`_assets/tbl-settings.md` の 表 T-202 の `S-227` を切っている）は囲まない。<br>⚠️ 上の「対象自身の輪郭をなぞってはならない」は選択の破線の枠の規則であり、この囲みには当てない。
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md partial -->
表 T-303 の `EL-9`（`:2822`）。旧
```text
色は、その線を描く色 —— ふだんは依存線の色（表 T-236 の `S-159`）、選んだ線（表 T-023c の `SL-8`）は同表の `S-448` —— とすること（MUST）。
```
新
```text
色は依存線の色（表 T-236 の `S-159`）とすること（MUST） —— 選んだ線（表 T-023c の `SL-8`）でも変えない。
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md partial -->
表 T-303 の `EL-16`（`:2829`）。旧
```text
依存線は `EL-19` の形で、色を `_assets/tbl-settings.md` の 表 T-236 の `S-448`（矢じりを含む）、太さを 表 T-201 の `S-18` に 表 T-206 の `S-446` を掛けた太さで描くこと（MUST）。
```
新
```text
依存線は `EL-19` の形で、表 T-023c の `SL-8` が選んだ依存線に定める色と太さ（色は `_assets/tbl-settings.md` の 表 T-236 の `S-159` のまま、太さは線自身の太さに 表 T-206 の `S-447` を足した太さ。矢じりを含む）で描くこと（MUST） —— 印が出ているあいだは選ばれている線が無い（表 T-270 の `PE-12`）ので、同じ見せ方でも紛れない。
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md partial -->
表 T-267 の `HT-1`（`:4263`）。旧
```text
選んだ線は 表 T-206 の `S-178` を掛けた太さで取り
```
新
```text
選んだ線は 表 T-206 の `S-447` を足した太さ（表 T-023c の `SL-8`）で取り
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md partial -->
表 T-270 の `PE-12`（`:4402`）。旧
```text
選べば、印が消えても選んだ線の色と両端の囲み（表 T-023c の `SL-8`）が残り
```
新
```text
選べば、印が消えても選んだ線の太さと両端の囲み（表 T-023c の `SL-8`）が残り
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md partial -->
表 T-029a の `DC-8`（`:5693`）。旧の 2 文を新の 3 文に置き換える。旧
```text
追従している側を、表 T-023c の `SL-8` が依存線に定めるやり方 —— その線自身の太さ（`_assets/tbl-settings.md` の 表 T-206 の `S-194`）に同表の `S-178` を掛ける —— で示すこと（MUST） —— 同行の理由もそのまま当てはまる。<br>⚠️ 色は変えず、両端の囲みも持たない —— 同行が選んだ依存線に定める色（`S-448`）と両端の囲みは、依存線だけのものである。
```
新
```text
追従している側を、その線自身の太さ（`_assets/tbl-settings.md` の 表 T-206 の `S-194`）に同表の `S-178` を掛けた太さで描いて示すこと（MUST） —— 表 T-023c の `SL-8` と同じく、色以外の手掛かりで示す（同行の理由がそのまま当てはまる）。<br>⚠️ 色は変えず、両端の囲みも持たない —— 同行が選んだ依存線に定める両端の囲みは、依存線だけのものである。<br>⚠️ 同行が依存線の太さに足す `S-447` は、この線に当てない —— カーソルの線は倍率の `S-178` で太くする。
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md partial -->
表 T-252 の `DS-7`（`:7747`）。旧
```text
（同書の 表 T-201 の `S-18` に描く比を掛け、選ばれていれば 表 T-206 の `S-178` を掛けた値）であり、表示の倍率で縮む。
```
新
```text
（同書の 表 T-201 の `S-18` に描く比を掛け、選ばれていれば 表 T-206 の `S-447` を足した値）であり、表示の倍率で縮む —— 足す `S-447` は画面の px であり、縮まない。
```

<!-- EDIT id=E-09 file=docs/spec/05-07-design.md partial -->
表 T-075 の `UF-145`（`05-07-design.md:413`）。旧
```text
選んだ線を太くし（`SL-8`・`S-178`）
```
新
```text
選んだ線を太くし（`SL-8`・`S-447`）
```

### 4.2 原稿 JSON の編集（`docs/spec/_source/settings.json`）

<!-- EDIT id=J-01 file=docs/spec/_source/settings.json partial -->
`S-159` の明の値（表 T-236）。旧
```text
"colour": "hsl(26 88% 44%)",
```
新
```text
"colour": "#6f472a",
```

<!-- EDIT id=J-02 file=docs/spec/_source/settings.json partial -->
`S-159` の暗の値。旧
```text
"colour": "hsl(30 92% 60%)",
```
新
```text
"colour": "#b38461",
```

<!-- EDIT id=J-03 file=docs/spec/_source/settings.json partial -->
`S-159` の注。旧
```text
"ja": "⛔ **テーマの色相に追随させない** （`FR-041`）。⚠️ 明暗で色相が 26 → 30 へ動くのは実物がそうだからであり、理由は記録されていない"
```
新
```text
"ja": "⛔ **テーマの色相に追随させない** （`FR-041`）。⭐ 落ち着いた濃いめの茶である（明 hsl(25 45% 30%)、暗 hsl(26 35% 54%)）。⭐ 選んだ依存線と、続きの印で送った先の線（表 T-023c の `SL-8`、`FR-009` の 表 T-303 の `EL-16`）も本行で描く —— 線は太さだけを変える。⚠️ イナズマ線（`S-160`）と色相が近い（明 3° ／ 暗 4°） —— 見分けは明度（明 30% と 42%、暗 54% と 60%）、彩度（45% ／ 35% と 100%）と形（矢じりのある折れ線と、上端から下端へ続くジグザグ）に頼る。⭐ `NFR-007` の 3 : 1 を、表 T-305 の 10 色相の地（`S-146`）と行の帯（`S-164`）のすべてで満たす（最小は明 7.17、暗 3.53）。⚠️ 予定の塗り（`S-155`）には暗いテーマで割る（最小 2.42、色相 95） —— 両端の囲み（`SL-8`）は予定の輪郭の上に重なり、外側の半分は地と帯に接する。測り方: 地と帯は 表 T-305 の色相ごとに HSL を 8 ビットの sRGB へ丸め、WCAG 2.1 の相対輝度 L から (L1 + 0.05) ÷ (L2 + 0.05) を求めた最小。色相の距離は、16 進を sRGB として HLS の色相を求め、明どうし・暗どうしの差のうち小さいほう（2026-10-01）。⭐ **利用者が触れる見本で選んだ値である**"
```

<!-- EDIT id=J-04 file=docs/spec/_source/settings.json partial -->
`S-160` の明の値。旧
```text
"colour": "hsl(354 62% 42%)",
```
新
```text
"colour": "#d66400",
```

<!-- EDIT id=J-05 file=docs/spec/_source/settings.json partial -->
`S-160` の暗の値。旧
```text
"colour": "hsl(354 70% 64%)",
```
新
```text
"colour": "#ff9933",
```

<!-- EDIT id=J-06 file=docs/spec/_source/settings.json partial -->
`S-160` の注。旧
```text
"ja": "⛔ **テーマの色相に追随させない** （`FR-041`）。⭐ **依存線とは別の色である**"
```
新
```text
"ja": "⛔ **テーマの色相に追随させない** （`FR-041`）。⭐ やや明るめの橙である（明 hsl(28 100% 42%)、暗 hsl(30 100% 60%)）。⚠️ 依存線（`S-159`）とは色相で明 3° ／ 暗 4° —— 見分けは `S-159` の注のとおり、明度・彩度・形に頼る。⚠️ 遅延診断のボトルネックのマーカー（`S-387`）とは明 28° ／ 暗 30° —— マーカーは丸の中の印であり、形で見分ける。⭐ `NFR-007` の 3 : 1 を、表 T-305 の 10 色相の地と行の帯のすべてで満たす（最小は明 3.30、暗 5.44。測り方は `S-159` の注）。⭐ **利用者が触れる見本で選んだ値である**"
```

<!-- EDIT id=J-07 file=docs/spec/_source/settings.json partial -->
`S-163` の明の値。旧
```text
"colour": "#d9381e",
```
新
```text
"colour": "#008a7c",
```

<!-- EDIT id=J-08 file=docs/spec/_source/settings.json partial -->
`S-163` の暗の値。旧
```text
"colour": "#ff5a3a",
```
新
```text
"colour": "#47d1bf",
```

<!-- EDIT id=J-09 file=docs/spec/_source/settings.json partial -->
`S-163` の注。旧
```text
"ja": "基準日。⭐ **赤寄りの朱である** —— 依存線（`S-159`）と色相で離す（色相の距離は明るいテーマで 18°、暗いテーマで 20°。16 進を sRGB として HLS の色相を求め、差の小さいほうを取った）。⚠️ **イナズマ線（`S-160`）との色相の距離は 14° ／ 16° であり、本表の線の色のうち最も近い** —— 見分けは明度と形（縦の 1 本と折れ線）に頼っている。⛔ **テーマの色相に追随させない**（`FR-041`）。⭐ **利用者が、触れる見本に並べた 5 つの候補から選んだ値である** —— 依存線とイナズマ線の両方から色相で最も離れる候補だった"
```
新
```text
"ja": "基準日。⭐ 青緑である（明 hsl(174 100% 27%)、暗 hsl(172 60% 55%)）。⛔ **テーマの色相に追随させない**（`FR-041`）。⭐ 本表のほかの線の色から色相で離す —— カーソル（`S-195`）から 126°、依存線（`S-159`）から 147°、イナズマ線（`S-160`）から 142°（測り方は `S-159` の注）。⚠️ テーマの色相に追随する強調（`S-151`）とは、表 T-305 の `TH-1`（色相 214）で明 40° ／ 暗 42°、`TH-2`（190）で 16° ／ 18°、`TH-3`（140）で 34° ／ 32° —— 見分けは形（縦の 1 本）に頼る。⚠️ モノクロ（`FR-041`）では依存線（`S-159`）と明度がほぼ同じである（明 27.1% と 30.0%、暗 54.9% と 54.1%。(最大 ＋ 最小) ÷ 2 ÷ 255 で求めた） —— 縦の 1 本と折れ線という形でしか分からない。⭐ `NFR-007` の 3 : 1 を、表 T-305 の 10 色相の地（`S-146`）と行の帯（`S-164`）のすべてで満たす（最小は明 3.80、暗 6.15。測り方は `S-159` の注）。⭐ **利用者が触れる見本で選んだ値である**"
```

<!-- EDIT id=J-10 file=docs/spec/_source/settings.json partial -->
`S-195` の明の値。旧
```text
"colour": "#c2188f",
```
新
```text
"colour": "#f500f5",
```

<!-- EDIT id=J-11 file=docs/spec/_source/settings.json partial -->
`S-195` の暗の値。旧
```text
"colour": "#f07ad0",
```
新
```text
"colour": "#ff40ff",
```

<!-- EDIT id=J-12 file=docs/spec/_source/settings.json partial -->
`S-195` の注。旧
```text
"ja": "⛔ **テーマの色相に追随させない** —— マゼンタ寄りの色であり、選択と現在位置の色（`S-151`）と見分ける。2 本とも同じ色である —— どちらが追従中かは色で示さない（表 T-029a の `DC-8` が 表 T-023c の `SL-8` を引き、同行はカーソルの線について太さだけを変えると定める —— 選んだ依存線の色（`S-448`）と両端の囲みはカーソルに当てない）。⭐ ガイドカーソル（`CU-3`）も本行で描く —— 2 つは排他であり（表 T-029a の `DC-9`）、同時には出ない。⛔ **測って決めた値ではない**"
```
新
```text
"ja": "⛔ **テーマの色相に追随させない**。⭐ マゼンタである（明 hsl(300 100% 48%)、暗 hsl(300 100% 62.5%)） —— 明は、暗の値を白地で 3 : 1 に届くまで明度だけ下げた値である。⭐ 本表のほかの線の色から色相で離す —— 基準日線（`S-163`）から 126°、依存線（`S-159`）から 85°、イナズマ線（`S-160`）から 88°（測り方は `S-159` の注）。⚠️ 選択と現在位置の色（`S-151`）とは、表 T-305 の `TH-1`（色相 214）で 86° だが、`TH-8`（330）で 30°、`TH-9`（285）で 15° —— 見分けは形（縦の細い線）に頼る。2 本とも同じ色である —— どちらが追従中かは色で示さない（表 T-029a の `DC-8` は太さだけを変え、両端の囲みを持たない）。⭐ ガイドカーソル（`CU-3`）も本行で描く —— 2 つは排他であり（表 T-029a の `DC-9`）、同時には出ない。⭐ `NFR-007` の 3 : 1 を、表 T-305 の 10 色相の地と行の帯のすべてで満たす（最小は明 3.02、暗 4.10。測り方は `S-159` の注）。⭐ **利用者が触れる見本で選んだ値である**"
```

<!-- EDIT id=J-13 file=docs/spec/_source/settings.json partial -->
`S-178` の値の名（表 T-206）。旧
```text
"ja": "選択された線の太さの倍率（表 T-023c の `SL-8`、表 T-029a の `DC-8`）"
```
新
```text
"ja": "追従しているカーソルの線の太さの倍率（表 T-029a の `DC-8`）"
```

<!-- EDIT id=J-14 file=docs/spec/_source/settings.json partial -->
`S-178` の注。旧
```text
"ja": "同上。⭐ **絶対値ではなく、その線自身の太さに掛ける倍率である** —— 依存線は `S-18`、カーソルは `S-194` を、線自身の太さとして持つ。⚠️ **基準日線には掛けない** —— 選ばれた基準日線は `S-438` の太さで描く（`SL-8`）。⛔ **測って決めた値ではない** （🔎）"
```
新
```text
"ja": "同上。⭐ **絶対値ではなく、その線自身の太さ（`S-194`）に掛ける倍率である**。⚠️ **依存線には掛けない** —— 選んだ依存線と送った先の線は、線自身の太さに `S-447` を足す（表 T-023c の `SL-8`）。⚠️ **基準日線には掛けない** —— 選ばれた基準日線は `S-438` の太さで描く（`SL-8`）。⛔ **測って決めた値ではない** （🔎）"
```

<!-- EDIT id=J-15 file=docs/spec/_source/settings.json partial -->
`S-194` の注。旧
```text
掛ける規則は 表 T-029a の `DC-8` が 表 T-023c の `SL-8` から引く。
```
新
```text
掛ける規則は 表 T-029a の `DC-8` が持つ。
```

<!-- EDIT id=J-16 file=docs/spec/_source/settings.json -->
`S-446` を消す（表 T-206 の行。次の `S-447` の塊は J-17 が書き換える）。旧
```text
    {
     "id": "S-446",
     "value": {
      "ja": "続きの印で送った先の依存線の太さの倍率（`FR-009` の 表 T-303 の `EL-16`）"
     },
     "default": {
      "num": "3",
      "suffix": "×"
     },
     "note": {
      "ja": "見せ方の値であり保存しない。⭐ 絶対値ではなく倍率であり、掛ける相手は依存線の太さ `S-18` である（選ばれた線の `S-178` と同じ形）。⛔ **`S-178` より小さくしてはならない** —— 送った先の線が選んだ線より細いと、どこへ送られたかが読めない。⭐ **利用者が触れる見本で選んだ値である**"
     }
    },
```
新
```text
```

<!-- EDIT id=J-17 file=docs/spec/_source/settings.json -->
`S-447` の塊を書き換える（値の名・既定・注）。旧
```text
    {
     "id": "S-447",
     "value": {
      "ja": "依存線の端の `Task` を囲む線の太さ（表 T-023c の `SL-8`、`FR-009` の 表 T-303 の `EL-16`）"
     },
     "default": {
      "num": "3",
      "suffix": "px"
     },
     "note": {
      "ja": "見せ方の値であり保存しない。⭐ 画面の px である —— 表示の倍率（`FR-039`）にもズームにも追随させない（`SL-8` の枠の `S-174` と同じ）。⭐ **利用者が触れる見本で選んだ値である**"
     }
    },
```
新
```text
    {
     "id": "S-447",
     "value": {
      "ja": "選んだ依存線と、続きの印で送った先の線と、その両端の予定を囲む線に足す太さ（表 T-023c の `SL-8`、`FR-009` の 表 T-303 の `EL-16`）"
     },
     "default": {
      "num": "2",
      "suffix": "px"
     },
     "note": {
      "ja": "見せ方の値であり保存しない。⭐ 絶対値ではなく、線自身の太さに足す値である —— 依存線はその線自身の太さ（表 T-201 の `S-18` に描く比を掛けた太さ）に、両端の囲みは予定の輪郭の太さ（同表の `S-39` に描く比を掛けた太さ）に足す。線と囲みに 1 つの値を当てる —— 「自分の線に足す」という 1 つの規則である。⭐ 画面の px である —— 表示の倍率（`FR-039`）にもズームにも追随させない（`SL-8` の枠の `S-174` と同じ）。⭐ 表示の倍率 100（描く比 0.625、`S-236`）では、依存線は 1.5px → 3.5px、予定の輪郭は 0.625px → 2.625px になる。⭐ **利用者が触れる見本で選んだ値である**"
     }
    },
```

<!-- EDIT id=J-18 file=docs/spec/_source/settings.json -->
`S-448` を消す（表 T-236 の行。次の `S-336` の塊はそのまま）。旧
```text
    {
     "id": "S-448",
     "name": {
      "ja": "選んだ依存線と、続きの印で送った先の色（表 T-023c の `SL-8`、`FR-009` の 表 T-303 の `EL-16`）"
     },
     "light": {
      "colour": "#ff2bbc",
      "code": true
     },
     "dark": {
      "colour": "#db4db5",
      "code": true
     },
     "hue": {
      "ja": "—"
     },
     "note": {
      "ja": "⭐ **利用者が触れる見本で選んだ値である**（明るいテーマ、表示の倍率 100 で見た）。明るいテーマの値は、見本の `#ff2ebd` を行の帯（`S-164`）に対して `NFR-007` の 3 : 1 に届くよう明度だけ 0.5% 下げたものである。依存線の線・矢じり・続きの印の点と、両端の `Task` の囲みに使う。⭐ 3 : 1 は、地（`S-146`）に 3.32 ／ 4.93、行の帯（`S-164`）に 3.01 ／ 3.55 で満たす。⚠️ バーの塗りには割る（予定 `S-155` に 1.96 ／ 2.91）—— 依存線の地の色の縁を敷かない区間（`FR-009`）であり、`S-159` と同じ扱いである（2026-09-27、テーマの色相 214、WCAG 2.1 の相対輝度で測った）。⚠️ カーソル（`S-195`）と色相がほぼ同じである（1° ／ 0°）—— 見分けは形である: カーソルは縦の細い直線、本行で描くのは太い折れ線と端の矩形。⛔ **テーマの色相に追随させない。**"
     }
    },
```
新
```text
```

<!-- EDIT id=J-19 file=docs/spec/_source/settings.json partial -->
`S-312` の注の 1 文。旧
```text
⚠️ 色相 26 は依存線（`S-159`）と同じであり、離すことは `FR-019` が SHOULD に留めている。
```
新
```text
⚠️ 色相 26 は依存線（`S-159`、明 25 ／ 暗 26）とほぼ同じで、イナズマ線（`S-160`、明 28 ／ 暗 30）とも 2° 〜 4° であり、離すことは `FR-019` が SHOULD に留めている。
```

当てた後に打つもの: `npm run gen`（`_assets/tbl-settings.md` と `src` の生成された定数が変わる —— 4.3 節と同じ波で）→ `npm run gen:check` → `rm -rf output && bash .claude/skills/spec-graph-check/check.sh`（⚠️ check 42 は、波 2 が `cr-596-…contract.test.ts` の逐語を書き直すまで赤になる —— 8 節）。

### 4.3 生成器の群（`tools/generate_entity_types.py`）

⛔ 規則 02 の 3.5 節 —— 原稿の行を退けると、群がその行を名指したまま生成が止まる。4.2 と同じ波で当てる。

<!-- EDIT id=G-01 file=tools/generate_entity_types.py partial -->
旧（`:1398`）
```text
    'NOT_STORED_DEPENDENCY_EMPHASIS_SIZES': (['S-446', 'S-447'],
```
新
```text
    'NOT_STORED_DEPENDENCY_EMPHASIS_SIZES': (['S-447'],
```
⚠️ 直前の注（`:1390-1397`）の「S-446 (the landing line's width, a multiplier on S-18 like S-178) and S-447 (the screen-px outline …)」を、「S-447, the screen-px width a selected or landing dependency line adds to its own width, and its end outlines add to the plan's outline (SL-8, EL-16; CR-602)」の形に書き直す（形で示す）。

<!-- EDIT id=G-02 file=tools/generate_entity_types.py partial -->
旧（`:1767-1770`）
```text
                         'S-443',
                         # CR-596: the selected dependency line's and the landing
                         # line's colour, and their end outlines (SL-8, EL-16).
                         'S-448'],
```
新
```text
                         # CR-602: S-448 left; a selected or landing dependency line keeps S-159.
                         'S-443'],
```

<!-- EDIT id=G-03 file=tools/generate_entity_types.py partial -->
旧（`:2684-2686`）
```text
    (os.path.join(LAYOUT, 'schedule-geometry', 'dependency-route.ts'),
     lambda _erd: not_stored_block('NOT_STORED_SELECTION_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_DEPENDENCY_SIZES'),
```
新
```text
    (os.path.join(LAYOUT, 'schedule-geometry', 'dependency-route.ts'),
     lambda _erd: not_stored_block('NOT_STORED_DEPENDENCY_EMPHASIS_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_DEPENDENCY_SIZES'),
```
⚠️ `dependency-route.ts` が読むのは `S-178` ではなく `S-447` になる（当たり判定の太さ、`HT-1`）。直前の注（`:2669-2683`、「S-178 STANDS HERE AS WELL AS IN `svg-renderer.ts`」）を `S-447` の話に書き直す（形で示す）。`:1367-1374` と `:2895-2896` の注の「S-178 … the multiplier SL-8 states / DC-8 borrows from SL-8」は、「S-178 is the Dual Cursor's multiplier (DC-8); a dependency line adds S-447 instead」の形に直す。⭐ `S-178` は `NOT_STORED_SELECTION_SIZES` に置いたまま（群を動かすと、書き出しに出すかの印 `DRAWN_WITH_WHERE_IT_STANDS` ／ `DRAWN_INTO_THE_EXPORTED_PICTURE` も変わる —— `DC-8` の印は書き出しに出さない）。

### 4.4 退けた番号（`.claude/skills/spec-graph-check/retired.py`）

<!-- EDIT id=K-01 file=.claude/skills/spec-graph-check/retired.py partial -->
旧
```text
           'IC-19', 'RS-35',
           'T-006'}
```
新
```text
           'IC-19', 'RS-35',
           # CR-602 (2026-10-01, rulings JDG-910 .. JDG-919): S-446 (the landing
           # line's width, S-18 times 3, table T-206) and S-448 (the colour of a
           # selected dependency line, of the landing line and of their end
           # outlines, table T-236) left. A selected or landing line keeps the
           # dependency colour S-159 and is drawn at its own width plus S-447,
           # and S-447 also widens the plan outline its end Tasks are traced
           # with. CR-596, CR-602 and the ledgers name both, so the seats stay
           # burnt.
           'S-446', 'S-448',
           'T-006'}
```

### 4.5 規則の文（`docs/development-rules/03-implementation.md`）

<!-- EDIT id=L-01 file=docs/development-rules/03-implementation.md partial -->
旧（`:96`）
```text
NOT_STORED_DEPENDENCY_EMPHASIS_SIZES 着地の印と選んだ依存線の強調の太さ（`S-446` / `S-447`、`CR-596`）
```
新
```text
NOT_STORED_DEPENDENCY_EMPHASIS_SIZES 選んだ依存線と着地の印の線・両端の囲みに足す太さ（`S-447`、`CR-602`）
```

<!-- EDIT id=L-02 file=docs/development-rules/03-implementation.md partial -->
旧（`:98`）
```text
NOT_STORED_SELECTION_SIZES           選択の印の太さ・刻み・倍率（`S-174` / `S-175` / `S-178`）
```
新
```text
NOT_STORED_SELECTION_SIZES           選択の枠の太さ・刻みと、追従しているカーソルの倍率（`S-174` / `S-175` / `S-178`）
```

変更履歴（`docs/development-records/changelog.md`）に 1 行。⚠️ 行にリテラルの `|` を書かない。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM-1 (L1 renderer + geometry: a selected / landing dependency line and its end outlines,
        T-023c SL-8, T-303 EL-9 / EL-16, T-267 HT-1)
- Colour: a selected line and the landing line, their arrow heads and their continuation
  dots are drawn in S-159, the plain dependency colour. Nothing reads S-448 any more
  (the row is retired). Because the colour is the same and the head is
  markerUnits="userSpaceOnUse", the emphasis marker may be dropped and the plain
  arrowId reused (emphasisArrowIdOf, dependencyDefsOf) -- the implementer's call.
- Width: own + NOT_STORED_DEPENDENCY_EMPHASIS_SIZES['S-447'] for BOTH 'selected' and
  'landing' (own = settings.dependencyWidth, already scaled by the display; S-447 is
  screen px and is NOT scaled). svg-renderer.ts:569 landingWidth and
  schedule-task-figures.ts:775 selectedLineWidth(own, true) both become own + S-447.
  The halo (S-224 x own) is unchanged.
- Hit test: dependency-route.ts:324 strokeWidth of a selected link = ownWidth + S-447
  (the generator now writes NOT_STORED_DEPENDENCY_EMPHASIS_SIZES there, G-03).
- End outline (the endOutline layer, ZO-10, schedule-task-figures.ts:608-610): replace
  aroundTaskSvg(..., 'endOutline') by one pure function that traces task.plan ONLY:
    form 'outline', no layers -> <polygon points=plan.points fill="none"
                                  stroke=S-159 stroke-width=planStroke + S-447>
    form 'outline', layers    -> for each layer whose role is 'body': the same
                                  outline (polygon when cornersOfRing succeeds, else
                                  path d=pathDataOf), fill="none", same stroke;
                                  'inner' / 'dot' / 'shade' layers: nothing
    form 'line' (SH-3/SH-4)   -> <line> from..to at bar.strokeWidth + S-447; the head
                                  polygon and each dot circle with fill="none" and
                                  stroke-width S-447 (all in S-159)
    task.plan === null        -> nothing (never the actual)
  planStroke is settings.planStroke (S-39, already scaled by the display).
- Keep: aroundTaskSvg(..., 'frame') for the dashed selection frame (S-151, plan and
  actual box, drawn over the outline). selectionFrameSvg loses its 'endOutline' form.
  selectedLineWidth stays for the Dual Cursor (schedule-overlays.ts:254) and the
  status line (:295) -- do not change either (see CR-602 section 10 item 4).
- Colours of S-159 / S-160 / S-163 / S-195 arrive through the generated
  SCHEDULE_COLOURS; no hand edit.
- Per-frame: yes (taskFigureParts, inkOf, dependency-route). Measure before main ff.

Observable (for the tester, from the spec only; display ratio 100 unless said):
- One selected EL-3 line: polyline stroke = S-159 of the theme, stroke-width =
  S-18 x draw ratio + S-447 = 1.5 + 2 = 3.5; its head fills S-159; every other line
  is S-159 at 1.5. No element anywhere uses #ff2bbc or #db4db5.
- A selected EL-4 line: the three dots fill S-159, radius unchanged.
- After one click on a continuation mark (EL-16): the landed line is the whole route,
  S-159, 3.5 wide; nothing is selected (PE-12).
- Both ends of such a line: for a rectangle or chevron plan, one element with the SAME
  points as the plan polygon, fill none, stroke S-159, width S-39 x ratio + S-447 =
  0.625 + 2 = 2.625, drawn after the plan and before the dashed frame (ZO-10). No
  element traces the actual bar; no rectangle encloses plan and actual together.
  A milestone: its body outline, same shape. An arrow (SH-3) / endpoint span (SH-4):
  the plan line at its width + 2, head and dots edged at 2.
- Display ratio 200: the line is 3 + 2 = 5 and the rectangle outline 1.25 + 2 = 3.25
  (the addend does not scale).
- Plan display off (S-227): the line is still 3.5 wide, no outline is drawn.
- The following Dual Cursor line: S-195, S-194 x S-178 = 2, no outline.
- An exported picture holds no emphasis and no outline (EP-12), as before.
```

---

## 6. グラフ（`9552de12`）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 届く先 | 読んだ結果 |
|---|---|---|
| `S-448` | 要求 3 ／ 参照 5 —— `FR-081`（`:2370` `SL-8`）・ `FR-009`（`:2822` `EL-9`、`:2829` `EL-16`）・ `FR-082`（`:5693` `DC-8`）・ `tbl-settings.md:524`（`S-195` の注） | 5 つとも本書が書き換える（E-02 ・ E-03 ・ E-04 ・ E-07 ・ J-12）。当てた後の読む所は 0 |
| `S-446` | 要求 2 ／ 参照 2 —— `FR-094`（`:1337` `VG-4`）・ `FR-009`（`:2829` `EL-16`） | E-01 ・ E-04。当てた後の読む所は 0 |
| `S-447` | 要求 1 ／ 参照 1 —— `FR-081`（`:2370`） | E-02 が新しい意味で読む。E-01 ・ E-04 ・ E-05 ・ E-07 ・ E-08 ・ E-09 ・ J-14 も読むようになる |
| `S-178` | 要求 5 ／ 参照 10 —— `FR-094` ・ `FR-081` ・ `FR-105` ・ `FR-082` ・ `FR-039`、`05-07-design.md:413`、`tbl-settings.md:340` ・ `:386` ・ `:444` ・ `:445` | `FR-082`（`DC-8`）と `:340`（`S-194`）・ `:386`（`S-224`「`S-178` と同じく…倍率」—— 真のまま）・ `:444`（`S-438`「`S-178` を掛けない」—— 真のまま）だけが残る |
| `S-159` | 要求 2 ／ 参照 5 —— `FR-041`（`:2103`）・ `FR-009`（`:2822`）・ `tbl-settings.md:533`（`S-312`）・ `:540`（`S-163`）・ `:558`（`S-448`） | `:2103` は真のまま（0.2 節の 6）。`:533` ・ `:540` は J-19 ・ J-09 |
| `S-160` | 要求 0 ／ 参照 1 —— `tbl-settings.md:540`（`S-163` の注） | J-09 |
| `S-163` | 要求 2 ／ 参照 2 —— `FR-041`（`:2103`）・ `FR-046`（`:3289`） | どちらも行を名指すだけで、値を言わない |
| `S-195` | 要求 2 ／ 参照 3 —— `FR-041`（`:2103`）・ `FR-048`（`:5657`）・ `tbl-settings.md:558` | 同上。`:558` は退ける `S-448` の注 |
| `SL-8` | 要求 7 ／ 参照 23 | 本書が書き換えない指し先（`FR-083` `:1236` ・ `FR-016` `:4002` ・ `:4030` ・ `ZO-10` `:4617` ・ `05-07-design.md:137` ・ `:568`）は、どれも色も囲みの形も言わない |
| `EL-16` | 要求 5 ／ 参照 11 | `FR-009` の ⓪（`:2788`）・ `ZO-10`（`:4617`）・ `EP-12`（`:6338`）・ 表 T-280 は真のまま |

### 6.2 `induced.py`

```
seeds: FR-081 FR-009 FR-082 FR-094 FR-105 FR-039 FR-107 T-206 T-236
-> 9 of 9 resolved, 6 edges inside the seed set, 1 cycle: FR-039 FR-094 (size 2)
```

⇒ 閉路は `FR-039`（`DS-7`、E-08）と `FR-094`（`VG-4`、E-01）の 1 つ。⛔ 2 つは 1 つの計画で同じ波に書く（どちらも「線自身の太さ ＋ `S-447`」を同じ言い方で言う）。値の行と規則の要求の小さな閉路であり、作法である（規則 02）。

### 6.3 ⭐ `CR-596` ・ `CR-598` ・ `CR-601` と触る所の突き合わせ（調整役の求め）

| 変更要求 | 状態 | 書き換える所 | 本書と同じセルか | 順 |
|---|---|---|---|---|
| `CR-596` | 当たっている（`9552de12`） | `EL-9` の色 ・ `EL-16` 〜 `EL-21` ・ `SL-8` の 4 文 ・ `DC-8` ・ `VG-4` ・ `PE-12` ・ `ZO-10` ・ `EP-12` ・ `FR-009` の ⓪ ・ `MK-13` ・ `RT-4a` ・ 表 T-280 ・ `S-195` の注 ・ `S-446` 〜 `S-448` ほか | **同じセルを書く**: `EL-9` ・ `EL-16`（1 文）・ `SL-8`（2 文）・ `DC-8`（2 文）・ `VG-4`（1 文）・ `PE-12`（1 句）・ `S-195` の注 ・ `S-446` 〜 `S-448` | ⛔ 本書は `CR-596` の後。E-01 〜 E-07 ・ J-12 ・ J-16 〜 J-18 の旧は `CR-596` が書いた文そのものであり、`9552de12` で各 1 回（4 節）。⚠️ `CR-596` の本文は書き換えない（規則 02 の 2.5 節の末） |
| `CR-598` | 起草（当てていない） | `EL-20` の ⚠️ の 1 文（`:2833`）、`05-07-design.md` の `LC-10` の注（`:866`） | 違う。本書は `EL-20` にも `LC-10` にも触れない。`05-07-design.md` では本書は `:413`（`UF-145`）だけ | どちらが先でもよい。コードは同じ持ち場 L1 だが別のファイル（`CR-598` は `schedule-geometry.ts`、本書は `svg-renderer.ts` ・ `schedule-task-figures.ts` ・ `dependency-route.ts`） |
| `CR-601` | 起草（当てていない） | `EL-17` のセル（`:2830`）、`_source/state-machines.json:1141` | 違う。本書は `EL-17` にも状態機械にも触れない | どちらが先でもよい。⚠️ `CR-601` の継ぎ目（SEAM-1 の Observable）は「`S-448` line and outlines stay」と書く。本書が先に当たったら、`CR-601` の試験の体の依頼文ではそれを「the emphasised line (S-159 at its own width + S-447) and the plan outlines stay」と読み替えて渡す（`CR-601` の本文は書き換えない） |

⭐ **3 つが共に触るもの**: `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts`。`CR-598` は `EL_20_*`、`CR-601` は `EL_17_*` と 4 事例、本書は `S_446` ・ `S_447` ・ `EL_9_COLOUR` ・ `EL_16_LOOK` ・ `SL_8_*` ・ `S_446_NOT_BELOW` と色と太さの事例（9 節）—— 同じ定数は無いが同じファイルなので、⭐ **試験の体は 1 つにして 3 つの新しい文を渡す**（8 節）。
⭐ **毎フレームの測り**: 3 つとも毎フレームの経路に触れる（`CR-598` は `lodEndOf`、`CR-601` は `frame-loop.ts`、本書は 0.2 節の 9）。`PW-1` の ②「溜まっていれば 1 回にまとめて測る」で 1 回にしてよい。

---

## 7. 数の予測（`9552de12`。当てた後に同じ数え方で突き合わせる）

| 数 | `9552de12` | 本書を当てた後 | 差 |
|---|---|---|---|
| tables / figures / rows / uids（`md-checks.py`） | 212 / 29 / 2685 / 176 | 212 / 29 / 2683 / 176 | rows −2（`S-446` ・ `S-448`） |
| `settings_json_to_md.py` の書き出し（表 ／ 行） | 20 ／ 392 | 20 ／ 390 | −2 |
| `_assets/tbl-settings.md` の行数（`wc -l`） | 700 | 698 | −2 |
| `01-04-requirements.md` で `S-178` を持つ行（`grep -c`） | 5 | 1（`DC-8`） | −4 |
| `docs/spec` で `S-446` ・ `S-448` を持つ行（`grep -rn`） | 11 | 0 | −11 |
| 状態機械の状態 ／ 出来事 | 変わらない | 変わらない | 0 |

⭐ 「当てた後」の 4 つの数は、4.1 ・ 4.2 節を `docs/spec` の写しに当てて測った（13 節）。

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（34 件とも 1 回）。`perf-pending.md` に 1 行（`PW-2`） | 調整役 |
| 1a | 仕様の文と原稿（`01-04-requirements.md` ・ `05-07-design.md` ・ `_source/settings.json`）＋ 生成器（`tools/generate_entity_types.py`）＋ `retired.py` ＋ 規則 03 の 2 行 | 4.1 〜 4.5 節、`npm run gen`。変更履歴に 1 行 | 仕様の持ち場 |
| 1b | **L1**: `svg-renderer.ts` ・ `schedule-task-figures.ts` ・ `dependency-route.ts` ・ `schedule-geometry.ts`（注 1 行） | SEAM-1 | L1（実装の体） |
| 2 | 仕様だけを読む試験の体 | `cr-596-…contract.test.ts` の本書の分（9 節）を新しい文から書き直し、SEAM-1 の Observable を 1 つずつ足す（実装した体に書かせない）。⭐ `CR-598` ・ `CR-601` の波 2 と同じ体に渡す | 別の体 |
| 3 | ― | 実物で確かめる（Playwright の probe。表示枠は rAF を回さない）: 明暗 × 線を 1 本選ぶ ・ 続きの印を押す ・ 矩形 ・ マイルストーン ・ 線だけの形 ・ 表示の倍率 100 と 200。`main` の早送りの前に測る（`JDG-605`） | 調整役 |

- ⛔ **1a と 1b と 2 は同じ合流で当てる** —— 1a だけでは `npm run gen` が `svg-renderer.ts` の `NOT_STORED_DEPENDENCY_EMPHASIS_SIZES` から `S-446` を、`SCHEDULE_COLOURS` から `S-448` を消し、`svg-renderer.ts:569` と `schedule-task-figures.ts:609` ・ `:745` ・ `:776` が読めなくなる。試験のファイルは `rowCells('T-206', 'S-446')`（`:102`）で読み込みから落ちる。
- ⭐ 1a の中の順: 原稿（4.2）と生成器（4.3）を先に、`npm run gen` を 1 回、それから文（4.1）。閉路 `FR-039` ・ `FR-094`（E-08 ・ E-01）は同じ体が続けて書く。
- ⚠️ `main` の早送りの前に測る（`JDG-605` ・ `JDG-726`）。`CR-598` ・ `CR-601` と 1 回にまとめてよい。測る場面に「依存線を 1 本選んだまま横に送る」を 1 つ足す。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`9552de12` の行番号）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `src/adapter/svg-renderer/svg-renderer.ts` | `:569` の `landingWidth`（`S-18` × `S-446` → 線自身の太さ ＋ `S-447`）。`:106-124` の `selectionFrameSvg` から `'endOutline'` の形と `:107` の WHY を外す。`:126-130` の `selectedLineWidth` は残す（カーソル・基準日線）。`:697-704` ・ `:812` ・ `:813` ・ `:817` ・ `:824` ・ `:837` は生成（手で直さない） | はい |
| `src/adapter/svg-renderer/schedule-task-figures.ts` | `:97` の `landingWidth` の入力、`:608-610` の囲み（予定の輪郭をなぞる純関数へ）、`:732-753` の強調の矢じり（決定 12）、`:769-777` の `inkOf`（色 `S-159`、太さ ＋ `S-447`）、`:902-912` の `aroundTaskSvg`（`'frame'` だけ残す）。`:830-845` の点は `ink.colour` を読むので直さずに `S-159` になる | はい |
| `src/entity/layout-engine/schedule-geometry/dependency-route.ts` | `:315-324` の選んだ線の `strokeWidth`（× `S-178` → ＋ `S-447`）。`:357-365` は生成（G-03） | はい |
| `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts` | `:185` の注 `see S-18, S-178, S-19, GA-19` の `S-178` を `S-447` に | いいえ（注） |
| `src/adapter/svg-renderer/schedule-overlays.ts` | 変えない（色は `themed` が生成された表から読む。`:254` ・ `:295` の `selectedLineWidth` も残す） | — |
| `tools/generate_entity_types.py` ・ `.claude/skills/spec-graph-check/retired.py` ・ `docs/development-rules/03-implementation.md` | 4.3 〜 4.5 節（波 1a） | — |
| `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts` | 定数 `:102-103`（`S_446` ・ `S_447`）・ `:106-107`（`EL_9_COLOUR`）・ `:112-113`（`EL_16_LOOK`）・ `:147-149`（`SL_8_WIDTH` ・ `SL_8_COLOUR`）・ `:161`（`S_446_NOT_BELOW`）、表の事例 `:215-216` ・ `:229-233`、太さの式 `:241-243`、色で線を拾う補助 `:963-1008`、事例 `:1037-1233`（`S-448` で拾う・`S-446` の太さ・`S-447` の枠）・ `:1472` ・ `:1556`（`inS448`）。⭐ 強調した線は色では拾えなくなる —— 太さで拾う | いいえ |
| `tests/unit/cr-555-dependency-lines-are-elided.test.ts:828-858` ・ `tests/unit/cr-551-fit-status-line-and-cursors.test.ts:57-58` ・ `tests/contract/cr-592-monochrome-greys-every-t-236-row.test.ts:24` ・ `:221-226` | 変えない —— 値を表 T-236 から読み、引く文（`FR-041` の `:2103`）は変わらない | — |

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

1. **カーソルの印（`DC-8`）** —— 太さは `S-194` × `S-178`（1px → 2px）のまま。`S-447` を当てない（決定 3）。色だけが `S-195` の新しい値になる。
2. **選択の破線の枠（`SL-8`、`S-151` ・ `S-174` ・ `S-175`）と基準日線の選んだ太さ `S-438`** —— 変えない。
3. **地の色の縁（`S-224`）** —— 線自身の太さ（`S-18` × 描く比）× 3 ＝ 4.5px のまま。強調した線（3.5px）は縁より細くなる（今の送った先の線は 4.5px で縁と同じだった）—— 縁は全ての線に敷くので、手前と奥の読み方は変わらない。
4. **仕様とコードの食い違い（0.2 節の 10）** —— `schedule-overlays.ts:295` は選ばれた基準日線を `S-333` × `S-178` で描き、`SL-8` は `S-438` と言う。本書は `S-178` の値を変えないので絵は変わらない。⛔ 本書では直さない —— 台帳の行にする（12 節）。
5. **書き出し（`EP-12`）** —— 強調も囲みも出さないまま。4 色は書き出した絵にも同じ値で出る（`FR-041` の「画面と書き出した絵とで、同じ行を同じ値で」）。
6. **モノクロ（`FR-041` ／ `CV-7`）** —— 文を変えない。基準日線と依存線はモノクロで明度がほぼ同じになり、形だけで分かる（`S-163` の注に書く）。
7. **注記の色 `S-312`** —— 色を変えない。イナズマ線との近さを注に書く（問い 3）。
8. **`FR-019` の「注記の色は色相 26 で依存線と同じ色相」**（`:5580`）—— 真のまま（新しい `S-159` は 25 ／ 26）。
9. **`CR-596` ・ `CR-598` ・ `CR-601` の本文** —— 書き換えない（6.3 節）。
10. 新しい設定値の行を足さない。状態・出来事を足さない。保存も交換も変えない。

---

## 11. 前に立つ者へ返す問い

⭐ 3 つとも推奨で 4 節の文を書いてある。推奨でよければ、そのまま当てられる。

| # | 問い | 選択肢 | 推奨と理由 |
|---|---|---|---|
| 問い 1 | 線だけの形（矢印 `SH-3`・端点スパン `SH-4`）の予定には輪郭がありません。依存線の端になったとき、どう囲みますか？ | (A) 予定の線そのものを同じ所・同じ形でなぞる（線は自分の太さ ＋ 2px、矢じりと点は縁を 2px）（推奨）／ (B) 予定の線の外接矩形を囲む（予定だけ）／ (C) 囲まない（線の太さだけで示す） | **(A)**。「同じ所・同じ形、自分の線 ＋ 2px」（`JDG-911` ・ `JDG-915`）の 1 つの規則のまま当たる。(B) は利用者が退けた外接矩形に戻る。(C) は `SL-8` の「両端を囲む」が形によって欠ける。⚠️ (A) では予定の線が前面の茶に覆われる —— 見本で見せて確かめるのがよい |
| 問い 2 | 足す 2px は、表示の倍率（`FR-039`）を変えても 2px のままにしますか？ | (A) 画面の px で 2px のまま（推奨）／ (B) 表示の倍率に合わせる（倍率 200 で 4px） | **(A)**。今の `S-447` と選択の枠 `S-174` が画面の px であり、利用者は倍率 100 で「2px」と言った。代償: 倍率 50 では線が 0.75px → 2.75px と比べて太く見える |
| 問い 3 | 注記の色（ハイライトボックス・コメントボックスの枠、`#b45309`）が、新しいイナズマ線の橙から色相で 2°〜4° になります。どうしますか？ | (A) そのまま（推奨）—— 注に書く ／ (B) 注記の色を別の見本で選び直す（別の変更要求） | **(A)**。`FR-019` は離すことを SHOULD に留め、依存線と同じ色相であることを既に受け入れている（`:5580`）。枠は矩形、イナズマ線は上端から下端へ続くジグザグで、形で分かる |

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1327` | 本書が当てる | 当てた後、前に立つ者が閉じる（`仕様待ち` → 当てた回の状態へ） |
| `JDG-910` 〜 `JDG-919` | 0.1 節 | 「指示 —— `CR-602` が当てる」（書いてある）。当てた後、前に立つ者が「適用済」へ |
| `JDG-671` ・ `JDG-656` | `S-163` の朱（候補 D）を覆す | 状態に「覆された」を記す（前に立つ者） |
| `JDG-857` | `S-163` の値としては覆す（値はカーソル `S-195` へ移る、`JDG-916` ・ `JDG-919`） | 「覆された（一部）」 |
| `JDG-792` ・ `JDG-799` | `S-448` の値。行を退ける | 「覆された」 |
| `JDG-793` | 線 × 3（`S-446`）・囲み 3px（`S-447`）を覆す | 「覆された」 |
| `JDG-795` ・ `JDG-796` | 色（`S-448`）と囲みの太さ・形の部分を覆す。「選んだ線も囲む」は残る | 「覆された（一部）」 |
| `JDG-840` | `S-448` と `S-195` の近さを受け入れた答え —— 両方の値が無くなり、問いが消える | 「覆された」 |
| 新しい台帳の行（番号は前に立つ者が振る） | 0.2 節の 10 —— 選ばれた基準日線の太さ: コード `S-333` × `S-178`（`schedule-overlays.ts:295`）、仕様 `S-438`（`SL-8`） | 前に立つ者が `defects.md` に書く（本書は台帳を書かない） |
| `perf-pending.md` の 1 行 | 0.2 節の 9 | 着地させる者が足す（`PW-2`） |

---

## 13. 測り方の再現

```
# the tree: status-line-colour 9552de12 (cut from refactor 502edfd1; CR-596 applied)
git log --oneline -1 9552de12
git diff --stat 502edfd1 refactor                             # tbl-row-id-prefixes.md, tools/body_brief.py only

# the rulings (section 0.1)
grep -n "^| JDG-91[0-9] " docs/development-records/rulings.md
grep -n "^| DFC-1327 " docs/development-records/defects.md

# the cells and rows (sections 0.2 item 1, 3, 6.1)
grep -n "S-178\|S-446\|S-447\|S-448" docs/spec/01-04-requirements.md docs/spec/05-07-design.md
grep -n '"id": "S-\(159\|160\|163\|178\|194\|195\|312\|446\|447\|448\)"' docs/spec/_source/settings.json
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-448 S-446 S-447 S-178 S-159 S-160 S-163 S-195
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py SL-8 EL-16 EL-9 DC-8 HT-1 VG-4 DS-7 S-194 S-312
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-081 FR-009 FR-082 FR-094 FR-105 FR-039 FR-107 T-206 T-236
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .   # -> tables=212 figures=29 rows=2685 uids=176

# the code (sections 0.2 items 2-4, 9, 10)
grep -rn "S-448\|S-446\|S-447\|S-178\|selectedLineWidth\|aroundTaskSvg\|endOutline\|selectionFrameSvg" src --include=*.ts | grep -v "\.test\."
grep -n "export type BarGeometry" -A14 src/entity/layout-engine/schedule-geometry/schedule-geometry.ts
grep -n "SCALED_BY_THE_DISPLAY" -A12 src/entity/layout-engine/screen-regions/screen-regions.ts

# the tests (section 0.2 item 8)
grep -rln "S-446\|S-447\|S-448\|S-178" tests
grep -rn -i "d9381e\|ff5a3a\|c2188f\|f07ad0\|ff2bbc\|db4db5" tests src tools   # -> svg-renderer.ts SCHEDULE_COLOURS only

# the colours (section 0.2 items 5-7): python colorsys, WCAG 2.1 relative luminance;
# grounds S-146 / S-164 solved at the 10 hues of table T-305 and rounded to 8-bit sRGB;
# hue = colorsys.rgb_to_hls of the hex, smaller of |a - b| and 360 - |a - b|;
# lightness = (max + min) / 2 / 255.  Results: 3.80/6.15, 3.02/4.10, 7.17/3.53, 3.30/5.44;
# S-159 vs S-155 (10 hues): light 4.16, dark 2.42 (hue 95).

# the dry run (sections 4, 7): copy docs/spec and .claude/skills/spec-graph-check to a
# scratch root, apply 4.1-4.2 in order asserting count == 1 before each replace, then
#   python docs/spec/_source/settings_json_to_md.py     # -> 20 tables, 390 rows (392 before)
#   python .claude/skills/spec-graph-check/md-checks.py <scratch root>   # -> rows=2683
#   python .claude/skills/spec-graph-check/style-checks.py <scratch root> # -> no diff against the live tree
#   grep -rn "S-446\|S-448" docs/spec                      # -> nothing

# lanes (section 6.3)
git merge-base HEAD lane-l1                                   # -> lane-l1 itself (no divergence)
git diff d15465d9 lane-l4 --stat -- src/adapter/svg-renderer/svg-renderer.ts tools/generate_entity_types.py   # other rows only
```

### 13.1 ⚠️ 測りが見られなかったもの

- 実物（`dist`）では見ていない。見本は仕様の値で描いた別物である。
- 線だけの形（決定 5）とマイルストーンの `body` の層をなぞった絵は、見本に無い（見本は矩形とマイルストーン 1 つ）—— 波 3 で見る。
- 毎フレームの費用は測っていない（8 節の測りが測る）。
- `check.sh` は `docs/spec` の写しには走らせていない —— 走らせたのは `md-checks.py` ・ `style-checks.py` ・ `settings_json_to_md.py` だけ。残りは波 1a の体が当てた木で走らせる。
