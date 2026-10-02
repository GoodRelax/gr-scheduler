# CR-625 — ポインタの点に出す説明は、マウスカーソルの下に出し、窓の端で折り返す

> 起草の状態: 当てた（2026-10-01、枝 `spec-pass-1001`、仕様の通し）—— E-01〜E-07 を当てた。旧 7 件は `1fcc0834`（`CR-621`・`CR-630`・`CR-622`・`CR-623`・`CR-624` の後）でどれも 1 回で、書き直した旧は無い（`CR-624` は `IN-3` の引き金の文を書き換えたが、E-01 の例外の文には触れていない）。本番の ID は 表 T-206 の `S-460`（すべての枝の `docs/spec` と `change-request/` の下書きで `S-` の最大は `S-459`、`S-460` 以上は 0 件。`S-999` は試験の番兵なので除いた）。当てるときに変えた所: E-07 の `S-460` の注から日付の括弧「（2026-10-01 に絵の画素を数えた）」を外した（仕様は日付を持たない）。検査 11 が 表 T-029a の `DC-3` の書き出しの文と重複と読んだ E-04 の書き出しの文を「札を書き出した絵（表 T-076）に描き込んではならない」と言い換えた（新の塊も当てた文に直した）。当てていないもの: 8 節の波 1 のうち `tools/generate_entity_types.py` の群 `NOT_STORED_HELP_SIZES` に `S-460` を足すこと（足さなくても `npm run gen` と `gen:check` は通る）と、コード・試験の全部、波 2（仕様だけの試験）—— 次の巡。
> 起草のときの状態: 起草のみ（2026-10-01、枝 `l4-review-crs`）。まだ当てていない。4 節の旧 7 件は、読んだ木でどれも 1 回だった（13 節）。
> 読んだ木: `refactor` `bfbe7eb7`（枝 `l4-review-crs`）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から受けた（CR-625 だけ）。仕様の新しい識別子は設定値の行 1 つで、起草のときは仮の名（`S-<新1>`）で書き、当てる回に本文の全部を本番の番号 `S-460` へ 1 度で置き換えた（2 節）。
> ⛔ 当てる順: `CR-624` → **本書** → `CR-626`。E-01（`IN-3`）は `CR-624` が先に書き換える要求と重なり、E-03（`DC-3`）は `CR-626` が後から書き換える行と重なる（4.1 節）。⭐ `DC-3`・`EZ-6`・`IN-3` は 1 つの閉路に入る（6 節）⇒ `CR-624` と本書は、仕様を当てる同じ 1 回で続けて当てる。
> 閉じるもの: `DFC-1339`（`JDG-869`・`JDG-893`）・`DFC-1340`（`JDG-870`・`JDG-922` #21）・`DFC-1360`（`JDG-890`・`JDG-922` #41）。`DFC-1340` のずらし量の値は 11 節の問い 1 の答え B（24px、`JDG-1092`）で決まった —— 本書は B で書いてあり、書き換えは無い。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-869` | 「#20 画面右端でタスクやマイルストーンにカーソルを当てたとき、Tipsが隠れる。<br>隠れないようにマウスカーソルの右側にtipsを表示しろ」 | 既定の向きはポインタの右（E-02）。右端に収まらないときの返し方を `EZ-6` の説明にも広げる（E-01・E-02） |
| `JDG-893` | 「#20: 「右端では左側に折り返す」という意味でよい」 | E-02 の「ポインタの左へ返す」 |
| `JDG-870` | 「#21 ツールチップがマウスカーソルにあたる場合がある。<br>ツールチップは常にマウスカーソルの下に表示しろ。」 | 説明の左上の隅を、ポインタの点から `S-460` だけ下に置く（E-02・E-07） |
| `JDG-922` #21 | 「他は、全部推奨どおり」—— #21 の推奨「下に収まらないときだけ上へ返す」 | E-02 の「下端が…収まらないときに限り…上へ返す」 |
| `JDG-890` | 「#41 1本カーソルのマウスポインタの右下に日付を表示しろ<br>    yyyy/mm/dd (曜日)」 | `CU-3` に日付の札（E-04）。右下は E-02 の既定の置き方 |
| `JDG-922` #41 | 「他は、全部推奨どおり」—— #41 の推奨「十字と縦 1 本の両方に出し、タスクの説明が出ている間は日付の札を隠す」 | E-04 の「十字と縦 1 本のどちらでも」「`EZ-6` の説明が出ているあいだは札を出してはならない」 |
| `JDG-925` | 「ゼロ埋めはあり。…」（2 本カーソルの日付） | 札の日付も 0 を詰める（E-04）。⭐ `DC-3` の日付の書き方そのものは `CR-626` が書き換える（5 節） |
| `JDG-728` | 「仕様に合わせろ」（`DFC-1130`: ツールチップは出したときに 1 度だけ測る） | 向きは、置くときに 1 度だけ測る（E-02）。⭐ 同行の読みの「ポインタの点に出す説明は…これまでどおり点に付いていく」も保つ |
| `JDG-300` Q25 A | 「説明はポインタの点に出し、`IN-3` に `EZ-6` の例外を書く」（`PND-391`） | 変えない。点に対して置き、ポインタを取らない —— 点からの離れ方だけを E-02 が足す |
| `JDG-325` | 「\|⇔\|を選択した時、マウスカーソルに以下の情報を小さく表示しろ」 | 変えない。読み出しの置き方は E-02 の段を指す（E-03） |
| `JDG-379` ・ `JDG-398` | 「カーソルに追従する日付情報のフォントは今の50%」／「7. カーソルに付いてくる日付 →提案通り」（最小 10px） | 札の字も `S-334`・`S-340` で描く（E-04・E-07） |
| `JDG-667` | 「#8 →推奨通り ただし、タスクに充てるツールチップは500msの待ち時間にしよう。…」（`EZ-6` はポインタが動いたら消す） | 変えない。`EZ-6` の説明は動いたら消えるので、向きは出したときに 1 度だけ測れば足りる |
| `JDG-375` ・ `JDG-396` | 「ToolTipsは1行に表示しろ。Helpのように画面の右側にある場合は、右寄せで表示」／ 1 行で出し、窓の幅を超えるときだけ折り返す | 変えない。`IN-7` の前段（錨に添える説明の揃え方）はそのまま |

| 裁定 | 逐語（11 節の問いへの答え、2026-10-01。Q の番号は調整役がチャットで振った番号） | 本書での扱い |
|---|---|---|
| `JDG-1092` | 「Q10: 推奨通りB」（11 節の問い 1 への答え） | `S-460` は 24px（E-07 のまま） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— タスクの説明（`EZ-6`）は、打ち切られた名前の全文を読む唯一の手立てである（`FR-002`）。それが画面の右端で切れ、マウスカーソルに重なって読めなかった（`JDG-869`・`JDG-870`）。ガイドカーソルの線を目で追った先の日を、ルーラーまで目を運ばずに読める（`JDG-890`）。
⭐ **`CH-3` ／ `GL-003`**（軽快に動かす） —— 向きは置くときに 1 度だけ測り、置いた点が変わらないあいだ窓を読み直さない（`JDG-728` と同じ形）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— いまポインタの点に出す説明の置き方は、`IN-3` の例外（`EZ-6`。置き方は「点に」だけ）と `DC-3`（左上を点に置き、右端・下端で返す）の 2 か所に分かれ、`IN-7` の末尾が「`IN-3` の例外のまま」と両者を束ねていた。`EZ-6` だけが返し方を持たないのは、この分かれ方から来る（`DFC-1339`）。⇒ 置き方を `IN-7` の後段 1 か所に置き、`IN-3` の例外・`DC-3`・`CU-3` はそこを指す（E-01〜E-04）。⭐ `FR-048` の「`CU-3` の縦 2 本は…日付を持たない」は、札を足すと読み違えを生む ⇒ 同じ波で書き直す（E-05）。
- **`R1.4`（境界）** —— 右にも左にも収まらない幅（上限は窓の幅から `S-339` を両側に引いた幅、`IN-7`）と、下にも上にも収まらない高さの 2 つを決めた（決定 3・決定 4）。
- **`R2.7`（マジックナンバー）** —— ずらし量を設定値の行 `S-460` に置く（E-07）。`PND-391` が「ずらし量を発明していない（余白の数を持つ行が無い）」と書いた穴である。値の根拠は基準機の標準の矢印の絵を数えた（13 節）。
- **`R2.14`（POLA）** —— 3 つの説明（タスクの説明・2 本カーソルの読み出し・1 本カーソルの札）が同じ規則で同じ所に立つ。1 本カーソルの札と 2 本カーソルの読み出しは `DC-9` で同時に出ない。
- **`R2.21`（1 つの仕事は 1 か所）** —— 置き方の規則が仕様で 1 か所になるので、コードも置く関数を 1 つにする（9 節）。いまは `tooltipElement`（測らない）と `showDualCursorReadout`（返す）の 2 か所が別々に置いている。
- **`R4.3`（中間の不正な状態）** —— 札と `EZ-6` の説明は同じフレームの画面の値から決める（`EZ-6` の説明が出るフレームで札が消える）。1 フレームだけ両方が出ることは無い（5 節の継ぎ目）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **置き方を `IN-7` の後段 1 か所に置く**（新しい行 ID を取らない）。`IN-3` の例外・`DC-3`・`CU-3` はそこを指す | `IN-7` は既に説明の置き場を持つ行であり、末尾で点に出す説明を名指していた。規則 02 の 2.5「同じ意味の表が既に無いか」 | `IN-7` の升が長くなる |
| 決定 2 | **横は、左上の隅をポインタの点と同じ横の位置に置く（横のずらしは持たない）。** ずらすのは縦だけ | 矢印は点から右下へ伸びる（基準機の標準の矢印は右へ 12px・下へ 19px、13 節）。縦に矢印より下へ出せば、横は点に揃えても重ならない。`JDG-869` の「右側」、`JDG-890` の「右下」を 1 つの値で満たす | 十字のガイドカーソルでは、縦の線が札の左端を下へ貫く |
| 決定 3 | **右に収まらないときは右端を点に揃えて左へ返す。左にも収まらないときは、左端を窓の左端から `S-339` に置く** | 左へ返すのは `JDG-893`。左にも収まらない場合は `IN-7` の前段の最後の段（左端を `S-339` に置く）と同じ形。縦は矢印より下なので、横が点に掛かってもカーソルには重ならない | 無い |
| 決定 4 | **上へ返すのは、下に収まらず上に収まるときだけ。上にも収まらないときは下に置く。上へ返すときも点から `S-460` だけ離す** | `JDG-922` #21「下に収まらないときだけ上へ返す」。下を既定とするので、どちらにも収まらなければ下。上側の離れは、押さえる点が中心に在るポインタの形（十字・握った手）にも重ならない長さを 1 つの値で持つため | 上へ返した説明は、矢印の絵に対しては要るより遠い |
| 決定 5 | **収まるかは、窓の縁から `S-339` の内側で判ずる**（`DC-3` のいまの文は「画面の右端」） | `IN-7` の前段が錨に添える説明に使う余白と同じ値にし、「収まる」の意味を 1 つにする | `DC-3` の読み出しの返り始めが 8px 早くなる |
| 決定 6 | **ずらし量は 表 T-206 の新しい行**（`S-339` の隣、生成器の群は `NOT_STORED_HELP_SIZES`）。表示の倍率を掛けない | 同じ説明の見せ方の値（`S-339`・`S-334`・`S-340`）が住む表。矢印は宿主が描くので、表示の倍率で大きさが変わらない（`S-249` がポインタの画像に倍率を掛けないのと同じ向き） | 閲覧環境の拡大（`Ctrl` ＋ ホイール）で頁の px が小さくなると、矢印に届かない |
| 決定 7 | **札の字は `S-334`・`S-340` を使い回し、両行の名を「カーソルの日付の字」に広げる**（E-07） | `JDG-379` の「カーソルに追従する日付情報のフォントは今の50%」は 2 本の読み出しに限らない。別の行を立てると同じ字が 2 つの値を持つ | 2 本と 1 本の字を別々に選べない |
| 決定 8 | **札は線を描いているあいだだけ出す**（ポインタが `Row Area` の外なら出さない） | 線は `Row Area` の中だけに引く（`PND-342`、`JDG-300`）。線の無い所で線の日を言うと、何の日か読めない | ルーラーの上では日付が出ない |
| 決定 9 | **札は `FR-152` の 表 T-337 の `UZ-1` に入れる**（E-06） | 同表の結び「本表に行の無い UI パーツを画面に重ねてはならない（MUST NOT）」。押下を受けず、いま行った入力への答えである点が `DC-3` の読み出しと同じ | 無い |
| 決定 10 | **書き出さない**理由は `EP-6`（`Guide Cursor` を描かない）と `EP-12`（操作の状態）を指す。表 T-076 に行を足さない | `DC-3` の読み出しも同じ形（行を持たず、自分の升で `EP-12` を指す） | 無い |
| 決定 11 | 曜日の語は、表 T-238 の `TM-4` が刷る曜と同じ語（`FR-038` の辞書の `weekdays`）とする | 同じ日の同じ曜を 2 つの語で呼ばない。`CR-624` も `EZ-6` の日付に同じ語を使う（5 節） | 無い |
| 決定 12 | 台帳の `DFC-1339` の「遅延診断の読み（`:149-154`）」は `Dual Cursor` の読み出し（`DC-3`）のことと読む | `tooltips-drawing.ts:149-154` は `showDualCursorReadout` であり、遅延診断の絵ではない。`JDG-893` の「（遅延診断の読み `DC-3` と同じ）」も同じ | 無い |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 点に出す説明の置き方（下へずらす・右端で左へ・下端で上へ・1 度だけ測る） | `01-04-requirements.md` の 表 T-028 の `IN-7` の末尾 | E-02 | その段 |
| タスクの説明がその置き方に従う | 同 `IN-3` の例外の文 | E-01 | その 1 文 |
| 2 本カーソルの読み出しがその置き方に従う | 同 表 T-029a の `DC-3` の置き方の 4 文 | E-03 | その 2 文 |
| 1 本カーソルの日付の札 | 同 表 T-029 の `CU-3` の行 | E-04 | その行の後段 |
| `CU-3` は日付を値として持たない | 同 `FR-048` の結びの 1 行 | E-05 | その 1 行 |
| 札の重ね順 | 同 `FR-152` の 表 T-337 の `UZ-1` | E-06 | その 1 句 |
| ずらし量の行・字の行の名・余白の行の注 | `docs/spec/_source/settings.json` の `S-334`・`S-339`・`S-340` と新しい `S-460` | E-07 | その塊 |

⭐ 生成物 `docs/spec/_assets/tbl-settings.md`（表 T-206）と `src/framework/dom-screen-surface/dom-screen-surface.ts` の生成区画 `NOT_STORED_HELP_SIZES` は、`npm run gen` だけが書く。⛔ 手で書かない。⚠️ 生成区画に新しい行が載るのは、`tools/generate_entity_types.py` の群 `NOT_STORED_HELP_SIZES`（`:1339`）に `S-460` を足したときだけである（9 節）。

## 2. 新しい識別子

| 番号（起草のときは仮の名 `S-<新1>`） | 何か | 置き場 |
|---|---|---|
| `S-460` | ポインタの点に出す説明を、点から縦に離す長さ（既定 24px 🔎。問い 1） | 表 T-206（`docs/spec/_source/settings.json`、`S-339` の直後） |

⭐ 起草のときは仮の名であり、本当の番号は仕様を当てる回が取った（規則 02 の 2.5。2026-10-01、`S-460`）。表・要求・接頭辞・表示語・状態・出来事は 1 つも足さない。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bfbe7eb7`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「⚠️ ポインタの点に出す説明（`FR-092` の `EZ-6` と、表 T-029a の `DC-3`）の置き方は `IN-3` の例外のままであり、本行の揃え方は当たらない」 | `01-04-requirements.md:7793`（`IN-7` の末尾） | 点に出す説明の置き方の段（8 文） | E-02 |
| `DC-3` の「左上の隅をポインタの点に置き」 | 同 `:5689` | `IN-7` の後段「左上の隅を…点から `S-460` だけ下に置く」 | E-02・E-03 |
| `DC-3` の「⭐ ポインタの右に置くと画面の右端に収まらないときは、ポインタの左へ返すこと（MUST）」 | 同 `:5689` | `IN-7` の後段の右端の文 | E-02・E-03 |
| `DC-3` の「ポインタの下に置くと画面の下端に収まらないときは、ポインタの上へ返すこと（MUST）」 | 同 `:5689` | `IN-7` の後段の「下端が…収まらないときに限り」 | E-02・E-03 |
| 「`CU-3` の縦 2 本はポインタに追従する視線誘導で、日付を持たない」 | 同 `:5661`（`FR-048`） | 「`CU-3` は…日付を値として持たない —— 札は…画面の値にも文書にも残らない」 | E-05 |
| `S-334`・`S-340` の名の「`Dual Cursor` の読み出しの」 | `settings.json:4442`・`:4468` | 「カーソルの日付の字（`Dual Cursor` の読み出し・ガイドカーソルの日付の札）の」 | E-07 |
| コードの「点に置いて測らない」と「縁で返す（ずらし無し）」 | `src/framework/dom-screen-surface/tooltips-drawing.ts:49-55`（`tooltipElement`）・`:152-156`（`showDualCursorReadout`） | 9 節 | 実装する者 |
| 旧の文と旧の位置を引く試験 | `tests/unit/cr-550-dual-cursor-readout.test.ts:44-46`・`:325-343`、`tests/unit/cr-541-panels-help-tooltip-and-dialogue.test.ts:292-308` | 9 節 | 実装する者 |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（改行は LF に揃えて数える）。E-01 は `CR-624` を当てた後の木で旧が変わりうる —— 4.1 節の差分で当てる。E-07 は **問い 1 の推奨で書いた**（`S-460` の既定 24px と、その注の「19px に 5px の隙間」）。E-02・E-04 は値を持たず行を指すだけなので、問い 1 の答えで変わらない。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧
```text
⭐ 例外は `FR-092` の `EZ-6`（タスクの説明）である —— 説明をポインタの点に出し、ポインタを受け取らせないこと（MUST）。<br>そのため「ポインタを乗せられること」は当たらず、ポインタが動いたら消す（`EZ-6`）。
```
新
```text
⭐ 例外は `FR-092` の `EZ-6`（タスクの説明）である —— 説明をポインタの点に出し、ポインタを受け取らせないこと（MUST）。<br>点に対する置き方は `IN-7` の後段（ポインタの点に出す説明）に従うこと（MUST） —— 説明をマウスカーソルの下に出し、カーソルに重ねない。<br>そのため「ポインタを乗せられること」は当たらず、ポインタが動いたら消す（`EZ-6`）。
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧
```text
<br>⚠️ ポインタの点に出す説明（`FR-092` の `EZ-6` と、表 T-029a の `DC-3`）の置き方は `IN-3` の例外のままであり、本行の揃え方は当たらない |
```
新
```text
<br>⭐ ポインタの点に出す説明（`IN-3` の例外の説明、表 T-029a の `DC-3` の読み出し、表 T-029 の `CU-3` の日付の札）には上の揃え方を当てず、ポインタの点に対して次のとおり置くこと（MUST）。<br>左上の隅を、ポインタの点と同じ横の位置で、点から `_assets/tbl-settings.md` の 表 T-206 の `S-460` だけ下に置く —— マウスカーソルの矢印は点から右下へ伸びるので、矢印より下に出せば説明がカーソルに重ならない。<br>右端が窓の右端から `S-339` の内側に収まらないときは、右端をポインタの点の横の位置に揃え、ポインタの左へ返すこと（MUST） —— 画面の右端でも説明が隠れない。<br>それでも左端が窓の左端から `S-339` の内側に収まらないときは、左端を窓の左端から `S-339` の位置に置くこと（MUST）。<br>下端が窓の下端から `S-339` の内側に収まらないときに限り、下端を点から `S-460` だけ上に揃え、ポインタの上へ返すこと（MUST） —— 説明は常にマウスカーソルの下に出し、下に収まらないときだけ上へ返す。<br>上へ返しても上端が窓の上端から `S-339` の内側に収まらないときは、返さずに下に置くこと（MUST）。<br>⭐ 向きは、説明をその点に置くときに 1 度だけ測って決めること（MUST） —— `EZ-6` の説明は出したときに 1 度、ポインタと一緒に動く `DC-3` の読み出しと `CU-3` の日付の札は置く点が変わるたびに 1 度である。<br>⛔ 置いた点が変わらないあいだ、窓の大きさを読み直してはならない（MUST NOT） |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
旧
```text
⭐ 置き方は、表 T-028 の `IN-3` が `FR-092` の `EZ-6` の説明に定める例外と同じとすること（MUST） —— 左上の隅をポインタの点に置き、ポインタを受け取らせない。<br>`EZ-6` と違い、待たずに出し、ポインタと一緒に動かし、ポインタが動いても消さない。<br>⭐ ポインタの右に置くと画面の右端に収まらないときは、ポインタの左へ返すこと（MUST）。<br>ポインタの下に置くと画面の下端に収まらないときは、ポインタの上へ返すこと（MUST） —— 3 行が画面の外で切れない。
```
新
```text
⭐ 置き方は、表 T-028 の `IN-7` の後段（ポインタの点に出す説明）に従い、ポインタを受け取らせないこと（MUST） —— `IN-3` が `FR-092` の `EZ-6` の説明に定める例外と同じ置き方であり、3 行が画面の外で切れない。<br>`EZ-6` と違い、待たずに出し、ポインタと一緒に動かし、ポインタが動いても消さない。
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧
```text
| CU-3 | `Guide Cursor`（ガイドカーソル） | ポインタに追従する補助線 | **3 モード排他** —— なし / 十字 / 縦 1 本。<br>⛔ **「縦 2 本」を持ってはならない（MUST NOT）** —— **測るための 2 本（`CU-2`）と見分けが付かない。<br>** 閲覧者が選べること（MUST）。<br>値は表 T-206 の `S-66`（文書に保存しない） |
```
新
```text
| CU-3 | `Guide Cursor`（ガイドカーソル） | ポインタに追従する補助線と、その線が立つ日の札 | **3 モード排他** —— なし / 十字 / 縦 1 本。<br>⛔ **「縦 2 本」を持ってはならない（MUST NOT）** —— **測るための 2 本（`CU-2`）と見分けが付かない。<br>** 閲覧者が選べること（MUST）。<br>値は表 T-206 の `S-66`（文書に保存しない）<br>⭐ 十字と縦 1 本のどちらでも、線を描いているあいだ、縦の線が立つ日を 1 行の日付の札で示すこと（MUST） —— 線を目で追った先の日を、タイムルーラーまで目を運ばずに読める。<br>札の日付は `yyyy/mm/dd (曜日)` と書くこと（MUST） —— 年は 4 桁、月と日は 2 桁で 0 を詰め、半角空白 1 つの後に半角の括弧で曜日の語を囲む（例: `2026/04/01 (水)`、英語の画面では `2026/04/01 (Wed)`）。<br>曜日の語は、表 T-238 の `TM-4` が刷る曜と同じ語（`FR-038` の辞書の `weekdays`）とすること（MUST）。<br>置き方は 表 T-028 の `IN-7` の後段（ポインタの点に出す説明）に従い（既定はポインタの右下）、ポインタを受け取らせないこと（MUST）。<br>文字の大きさは `_assets/tbl-settings.md` の 表 T-206 の `S-334` とし、同表の `S-340` を下回らせない（表 T-029a の `DC-3` と同じ）。<br>⛔ `FR-092` の `EZ-6` の説明が出ているあいだは、札を出してはならない（MUST NOT） —— 同じ点のそばに重なる。<br>説明が消えたら札を戻すこと（MUST）。<br>⛔ 札を書き出した絵（表 T-076）に描き込んではならない（MUST NOT） —— `EP-6` が `Guide Cursor` を描かない理由と同じく、書き出した時点のポインタの位置に意味が無い（操作の状態、`EP-12`）。<br>⚠️ 札は日付を値として持たない —— 画面の値にも文書にも残らない（`FR-048` の結び） |
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
旧
```text
`CU-3` の縦 2 本はポインタに追従する視線誘導で、日付を持たない。  
```
新
```text
`CU-3` はポインタに追従する視線誘導であり、日付を値として持たない —— 表 T-029 の `CU-3` の日付の札は線がいま立つ日を示すだけで、画面の値にも文書にも残らない。  
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
旧
```text
| UZ-1 | 1（最前面） | 表示の倍率のメッセージ（`FR-039` の 表 T-260）・`Dual Cursor` の読み出し（表 T-029a の `DC-3`） |
```
新
```text
| UZ-1 | 1（最前面） | 表示の倍率のメッセージ（`FR-039` の 表 T-260）・`Dual Cursor` の読み出し（表 T-029a の `DC-3`）・ガイドカーソルの日付の札（表 T-029 の `CU-3`） |
```

<!-- EDIT id=E-07 file=docs/spec/_source/settings.json -->
旧
```text
     "id": "S-334",
     "value": {
      "ja": "`Dual Cursor` の読み出しの文字の大きさの係数（表 T-029a の `DC-3`）"
     },
     "default": {
      "num": "0.4375"
     },
     "note": {
      "ja": "⛔ **px で持たない理由は `S-204` と同じである。** ⭐ `S-204`（0.875）の半分である —— 読み出しはポインタのそばに出て日程を覆うので、ツールチップより小さくする。⚠️ `S-204` から導かず、本行が値を持つ —— ツールチップの字を変えても読み出しの字は動かない。⭐ 下限は `S-340`"
     }
    },
    {
     "id": "S-339",
     "value": {
      "ja": "ツールチップと窓の縁のあいだに残す余白（表 T-028 の `IN-7`）"
     },
     "default": {
      "num": "8",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "説明の見せ方であり、日程の内容ではないので保存しない。⭐ 説明の幅の上限は、窓の幅から両側に本行を引いた幅である —— 描き手はこれを窓の幅に従う書き方（例: `calc(100vw - 2 × 本行)`）で持ち、窓の大きさを読みに行かない。⛔ **測って決めた値ではない** （🔎）"
     }
    },
    {
     "id": "S-340",
     "value": {
      "ja": "`Dual Cursor` の読み出しの文字の大きさの下限（表 T-029a の `DC-3`）"
```
新
```text
     "id": "S-334",
     "value": {
      "ja": "カーソルの日付の字（`Dual Cursor` の読み出し・ガイドカーソルの日付の札）の大きさの係数（表 T-029a の `DC-3`・表 T-029 の `CU-3`）"
     },
     "default": {
      "num": "0.4375"
     },
     "note": {
      "ja": "⛔ **px で持たない理由は `S-204` と同じである。** ⭐ `S-204`（0.875）の半分である —— 読み出しはポインタのそばに出て日程を覆うので、ツールチップより小さくする。⚠️ `S-204` から導かず、本行が値を持つ —— ツールチップの字を変えても読み出しの字は動かない。⭐ 下限は `S-340`"
     }
    },
    {
     "id": "S-339",
     "value": {
      "ja": "ツールチップと窓の縁のあいだに残す余白（表 T-028 の `IN-7`）"
     },
     "default": {
      "num": "8",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "説明の見せ方であり、日程の内容ではないので保存しない。⭐ 説明の幅の上限は、窓の幅から両側に本行を引いた幅である —— 描き手はこれを窓の幅に従う書き方（例: `calc(100vw - 2 × 本行)`）で持ち、窓の大きさを読みに行かない。⭐ ポインタの点に出す説明（`IN-7` の後段）が窓に収まるかも、本行の内側で判ずる。⛔ **測って決めた値ではない** （🔎）"
     }
    },
    {
     "id": "S-460",
     "value": {
      "ja": "ポインタの点に出す説明を、ポインタの点から縦に離す長さ（表 T-028 の `IN-7`）"
     },
     "default": {
      "num": "24",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "説明の見せ方であり、日程の内容ではないので保存しない。⭐ 閲覧環境の標準の矢印のポインタに重ならない長さである —— 矢印は押さえる点から右下へ伸び、基準機（表 T-025 の `MC-1`）の OS の標準の矢印の絵は、拡大率 100% の 32 × 32 の絵で点から下へ 19px、右へ 12px まで不透明の画素を持つ。拡大率 150% と 200% の絵（48 × 48 と 64 × 64）も、頁の px に直すと下へ 18px と 19.5px である。本行は 19px に 5px の隙間を足した値である。⚠️ 同じ OS の大きい矢印の設定（同じ数え方で 25px と 30px）には届かない —— 閲覧環境はポインタの大きさを頁に知らせないので、読んで合わせることはできない。⭐ 上へ返すときも同じ長さだけ点から離す（`IN-7`）。⭐ 表示の倍率を掛けない（`FR-039` の 表 T-252 に行を持たない） —— 矢印は宿主が描くので、表示の倍率で大きさが変わらない。⛔ **隙間の 5px は選んだ値であり、利用者が見て決めた値ではない** （🔎）"
     }
    },
    {
     "id": "S-340",
     "value": {
      "ja": "カーソルの日付の字（`Dual Cursor` の読み出し・ガイドカーソルの日付の札）の大きさの下限（表 T-029a の `DC-3`・表 T-029 の `CU-3`）"
```

⭐ 生成の後の 表 T-206 は `S-339` の次に `S-460` の行を持つ（`npm run gen` が刷る。見込み: `| S-460 | ポインタの点に出す説明を、ポインタの点から縦に離す長さ（表 T-028 の `IN-7`） | 24px 🔎 | … |`）。

### 4.1 重なり

`change-request/CR-603`〜`CR-620` の 1〜10 行目を読み、本書の旧が触る識別子（`IN-3`・`IN-7`・`DC-3`・`CU-3`・`EZ-6`・`EP-12`・`FR-048`・`UZ-1`・表 T-337・`S-334`・`S-339`・`S-340`）で全文を `grep` した（13 節）。旧を共有する既存の草案は 0 件である —— `CR-615` は `FR-152` と 表 T-337 を触るが着地済みで、`UZ-1` の行に触れていない。`CR-613`・`CR-616` の `FR-048` は一覧の 1 語であり、本書の旧の外である。

兄弟の草案（読めない。依頼文の要約で判じた）:

| 本書の EDIT | 兄弟が書き換えうる所 | 先に当たる側 | 本書の差分（載せ直すときはこれだけを当てる） |
|---|---|---|---|
| E-01（`IN-3` の例外の文） | ⚠️ `CR-624` は `IN-3` を書く（期限の印の説明、変更前の輪郭の説明）。例外の文に新しい説明を足すかもしれない | `CR-624` | 例外の文の「ポインタを受け取らせないこと（MUST）。」の直後に「点に対する置き方は `IN-7` の後段（ポインタの点に出す説明）に従うこと（MUST） —— 説明をマウスカーソルの下に出し、カーソルに重ねない。」を挟む。⭐ `CR-624` が例外に足した説明は、そのまま E-02 の「`IN-3` の例外の説明」に含まれる |
| E-02（`IN-7` の末尾） | 無い見込み | ― | 4 節のとおり |
| E-03（`DC-3` の置き方の 4 文） | `CR-626` は `DC-3` の日付の書き方と期間の語を書き換える。置き方の 4 文は触らない見込み | **本書** | `CR-626` が本書の後で `DC-3` の旧を数え直す。⚠️ `DC-3` の升の中の本書の新 2 文は、`CR-626` の旧の外に置くこと |
| E-04（`CU-3` の行） | `CR-626` は `CU-3` の札の日付の書き方を指すだけで、`CU-3` の行を書かない見込み | **本書** | 4 節のとおり |
| E-06（`UZ-1`） | `CR-621` は 表 T-335 の窓と `UZ-6`・`UZ-9` あたり（検索パネル・対話欄）を触るかもしれない。`UZ-1` の行は触らない見込み | どちらでも | 行 `UZ-1` の 3 つ目の中身の句だけ |
| E-07（`settings.json` の `S-334`〜`S-340`） | `CR-626` が `S-334`・`S-340` を触るかもしれない（読み出しの字） | **本書** | `CR-626` が本書の新の上で数え直す |

⭐ 除いたもの（`EXCLUDED`）: 遅延診断の `CR-616`・`CR-617` は、ポインタの点に出す説明を持たない（`git grep "ポインタの点\|ポインタのそば"` がどちらにも 0 件）。重なりは無い。

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- One placing rule for every tip shown at the pointer's point: table T-028
  IN-7, its last paragraph, as CR-625 E-02 leaves it. It covers
    (a) every tooltip IN-3 names as its exception (FR-092 EZ-6 today; any tip
        CR-624 adds to that exception is covered the same way),
    (b) the Dual Cursor readout (table T-029a DC-3),
    (c) the Guide Cursor date label (table T-029 CU-3).
  With p = the pointer's point, o = S-460 (T-206, px, NOT scaled by the
  display scale), m = S-339, W/H = the window:
    default:      left = p.x,           top    = p.y + o
    right edge:   if left + width > W - m  ->  right = p.x (turned left)
                  if then left < m          ->  left  = m
    bottom edge:  ONLY if top + height > H - m:
                     bottom = p.y - o (turned up)
                     but if that top < m -> stay below (default)
    never turned up while it fits below.
- Measured once per placing: EZ-6 when shown (JDG-728, the tooltip layer is
  rebuilt only when the tooltip set changes); the readout and the label each
  time the point they follow changes. No window read while the point stays.
- All three take no pointer (pointer-events none). The readout and the label
  draw in the UZ-1 layer (table T-337); DC-9 makes them never both present.
- The Guide Cursor label: one line "yyyy/mm/dd (weekday)", zero-padded month
  and day, one half-width space, half-width parentheses; weekday word = the
  FR-038 dictionary `weekdays` in the screen language (the ruler's words,
  published entry rulerWeekdayWords), e.g. ja "2026/04/01 (水)",
  en "2026/04/01 (Wed)". The date is the day under the pointer's x on the
  time axis (the same dateAtX the DC-3 readout uses).
  Shown in BOTH 'crosshair' and 'single-vertical' while the guide line is
  drawn (pointer over Row Area); absent for 'none', in the Dual Cursor mode,
  and in the SAME frame in which a task tooltip (EZ-6) is in the screen view.
  Font max(S-340 px, S-334 em). Never in an export.
- Format seam: CR-625 owns "yyyy/mm/dd (weekday)" (the CU-3 row).
  CR-626 (applied after) makes DC-3's dates point at it; CR-624 (applied
  before) owns "m/d (weekday)" for EZ-6. All three use ONE weekday source.
  Code: ONE formatter for the cursor date, next to the readout words in
  src/adapter/screen-renderer/tooltips.ts, so CR-626 calls the same function.
  CR-625 adds NO dictionary word (the label is a date and a weekday only; no
  key in the section dualCursorReadout) and does NOT touch DC-3's date
  sentence ("yyyy/m/d", CR-626 rewrites it to point at the CU-3 label).
- Code: src/framework/dom-screen-surface/tooltips-drawing.ts (one placing
  function for the three), src/adapter/screen-renderer/tooltips.ts,
  screen-renderer.ts (ScreenView carries the label), dom-screen-surface.ts
  (draws it in the readout layer), tools/generate_entity_types.py (S-460
  joins NOT_STORED_HELP_SIZES). No new command, no new event.
```

## 6. グラフ（`bfbe7eb7`）

- `impact.py IN-3 IN-7 DC-3 CU-3 EZ-6 EP-12`（種は依頼文のとおり）:
  - `IN-3` を指す要求 6 件・参照 14 か所（`FR-002`:1473、`FR-152`:4664（`UZ-2`）、`FR-082`:5689、`FR-092`:7150・:7154、`FR-029`:7184、`FR-040`:7787・:7793、5.3 節 `UF-112`、表 T-103 の `U-53`、`tbl-state-machines.md` の 4 か所（`RG-8`・`hintTargetChanged`・`tooltipDisplayStateMachine` の 2 状態））。
  - `IN-7` は参照 1（`S-339`）。`DC-3` は要求 3 件・参照 8（`FR-152` の `UZ-1`、`EZ-6`、`IN-7`、`UF-132`、表 T-064 の `calendarSpanOf`・`timeAxisOf`、`S-334`・`S-340`）。
  - `CU-3` は要求 4 件・参照 11（`FR-048` の 6 か所、`DC-9`、`EP-6`、`NFR-010`、`S-194`・`S-195`）。`EZ-6` は要求 6 件・参照 17。`EP-12` は要求 1 件・参照 2（`DC-3`・`DC-8`）。
- 足した種 `impact.py UZ-1 S-334 S-339 S-340 FR-048`: `UZ-1` は `GR-19`（`FR-016`:3968、「押下を受けないもの（`UZ-1`・`UZ-2`）」—— 札は押下を受けないので真のまま）。`S-334`・`S-340` は `DC-3` と互い。`S-339` は `IN-7`。`FR-048` を指すのは `EN-6`（`FR-029`:7252）・`MC-8`（:7825）・`NFR-010`（:7913）・5.3 節・表 T-109 の `IC-47`・`IC-48`・`S-66`。
- ⭐ 届いた先を 1 つずつ読んだ: 置き方を言うのは `IN-3` の例外（E-01）・`IN-7` の末尾（E-02）・`DC-3`（E-03）だけ。`FR-002`（打ち切った名の全文は `EZ-6` が出す）・`UZ-2`・`FR-029`:7184・`U-53`・`RG-8`・`tooltipDisplayStateMachine`（`Esc` で消す段。札は説明ではないので段を持たない）・`UF-112`（「指す物の下に置いて描く」）・`UF-132`・`timeAxisOf`（札も同じ関数で日を引くが、行の文は偽にならない）・`EP-6`（`Guide Cursor` を描かない —— 札も描かない）・`EP-15`・`NFR-010`（線が無いときに描き直さない —— 札は線と一緒にしか出ない）・`MC-8`・`EN-6`・`DC-9` は、書き換えの後も真 ⇒ 書き換えない。`FR-048`:5660〜5663 の段は、5661 の 1 行だけが札と読み違える（E-05）。表 T-337 の結び「本表に行の無い UI パーツを重ねてはならない」が `UZ-1` への句を求める（E-06）。
- `induced.py IN-3 IN-7 DC-3 CU-3 EZ-6 EP-12`: 種 6/6、辺 9、閉路 1（`DC-3` `EZ-6` `IN-3`）。足した種を含めた 11 種では辺 20、閉路 2（`DC-3` `EZ-6` `IN-3` `S-334` `S-340` と `IN-7` `S-339`）。⇒ 本書の E-01〜E-07 は 1 つの計画・1 回の編集で当てる。⚠️ `EZ-6` は `CR-624` が書く ⇒ `CR-624` と本書を、仕様を当てる同じ 1 回で続けて当てる（ヘッダーの当てる順）。
- `rulings.md` を `IN-3`・`IN-7`・`DC-3`・`CU-3`・`EZ-6`・`EP-12`・`UZ-1`・`S-339`・「ガイドカーソル」・「読み出し」で引いた: 当たりは 0.1 節の表の行と、`JDG-658`・`JDG-662`・`JDG-668`（`EZ-2` の出し続け・押すと消える・`Esc` のあと戻る —— 錨に添える説明の話で、点に出す説明の置き方に触れない）、`JDG-913`・`JDG-919`（カーソルの色 —— 触れない）、`JDG-203`・`JDG-625`（重ね順と前後の分け方・覚えない値 —— 触れない）、`JDG-302`・`JDG-446`・`JDG-448`・`JDG-924`（期間の出し方・期限の印と説明の中身 —— `CR-624`・`CR-626` の持ち物）。⇒ 導いた条項（決定 1〜12）と食い違う裁定は 0。⭐ `JDG-300` Q25 A の「ポインタの点に出す」は、点に対して置く規則として残る（点から離す長さを足すだけ）。
- `pending-decisions.md`: `PND-391`（裁定済）の「ずらし量を発明していない（余白の数を持つ行が無い）」に本書が行を与える（12 節）。`PND-342`（裁定済）は札を出す領域の根拠（決定 8）。

## 7. 数の予測（`bfbe7eb7`。当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables | 差 0 | 表を足しも消しもしない |
| figures | 差 0 | 図に触れない |
| rows | ＋1 | 表 T-206 に `S-460`。ほかの表（T-028・T-029・T-029a・T-337）の行数は変わらない（行の中の文だけ） |
| uids | 差 0 | 要求を足しも消しもしない |
| `（MUST）` ・ `（MUST NOT）` の印（`01-04-requirements.md`、`grep -c` の行数ではなく出現の数） | ＋13 | E-01 ＋1、E-02 ＋7（MUST 6・MUST NOT 1）、E-03 −2、E-04 ＋7（MUST 5・MUST NOT 2 を足す。旧の 2 は残る）。E-05・E-06 は 0。旧の塊 6 → 新の塊 19。数え方は 13 節 |
| 表 T-206 の行（`tbl-settings.md` の `^| S-`） | 390 → 391 | 同上 |
| `NOT_STORED_HELP_SIZES` の鍵 | 9 → 10 | 生成器の群に `S-460` を足す（9 節） |

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 | 毎フレーム |
|---|---|---|---|---|
| 0 | ― | `CR-624` を当てた木で E-01 の旧を数え直し、4.1 節の差分で載せ直す。`CR-624` と同じ仕様の 1 回で当てる | 当てる体 | ― |
| 1 | ⛔ **L4**（`src/adapter/screen-renderer/**` と `src/framework/dom-screen-surface/**` は L4 の持ち物）。`docs/spec`（E-01〜E-07）＋ `tools/generate_entity_types.py`（群に 1 語）＋ `npm run gen` ＋ `src/adapter/screen-renderer/tooltips.ts`・`screen-renderer.ts` ＋ `src/framework/dom-screen-surface/tooltips-drawing.ts`・`dom-screen-surface.ts` ＋ 試験 2 ファイル（9 節の試験の 2 行） | 原稿と、それを読むコードを 1 つの波で着地させる（規則 02 の 3.5 —— `S-460` が生成区画に載り、置く関数がそれを読む）。旧の文を逐語で引く `cr-550` の `DC_3_PLACE`・`DC_3_RIGHT`・`DC_3_BOTTOM` と、点の位置そのものを確かめる `cr-541` の `Q38`・`cr-550` の 3 つの場合を、E-02・E-03 の新しい文と新しい位置へ書き直す | L4 の実装の体 | **はい** —— 札は画面の値を作るたび（ポインタが動くたび）に `screen-renderer` が求め、読み出しと札は置く点が変わるたびに窓と箱を 1 度測る。`src/adapter/screen-renderer/**` は毎フレームの経路（規則 04 の 5 節）。⇒ 着地の時に `docs/development-records/perf-pending.md` に 1 行を足す（PW-2） |
| 2 | `tests/contract/cr-625-*.test.ts`（新しいファイルだけ） | 仕様だけを読む試験（下の表）。波 1 と並べてよい | 仕様だけの試験の体 | ― |

仕様だけを読む体が書く場合（`tests/contract/cr-625-a-pointer-tip-sits-below-the-cursor.test.ts`）:

| 場合 | 確かめること |
|---|---|
| `S-460` の行 | 表 T-206 に在り、px で、正の数であり、表 T-252 に行を持たない（表示の倍率を掛けない） |
| 既定の置き方（`EZ-6`） | 点 (x, y) で出した説明の左上が (x, y ＋ `S-460`)。ポインタを取らない |
| 右端で左へ（`EZ-6`・`DC-3`・`CU-3` の 3 つ） | 右端が窓の右端 − `S-339` を越える点では、説明の右端 ＝ x |
| 左にも収まらない | 幅が x − `S-339` より広いとき、左端 ＝ `S-339` |
| 下端で上へ | 下端が窓の下端 − `S-339` を越える点では、説明の下端 ＝ y − `S-460` |
| 下に収まれば上へ返さない | 上にも下にも収まる点では、下（top ＝ y ＋ `S-460`） |
| 上にも収まらない | 窓の高さが小さく上へ返しても上端が `S-339` より上へ出るとき、下に置く |
| 1 度だけ測る（`JDG-728`） | `EZ-6` の説明を出した後に窓を縮め、ほかの部品を変えても、位置が変わらず窓を読み直さない |
| 追う説明は点ごとに測る | 読み出しと札は、点が変わると新しい点で向きを決め直す |
| 札の中身 | 十字と縦 1 本の両方で、`Row Area` の上の点の日を `2026/04/01 (水)`（ja）・`2026/04/01 (Wed)`（en）で 1 行。月・日が 1 桁の日で 0 を詰める |
| 札が出ない | `'none'`、`Dual Cursor` のモード、ポインタが `Row Area` の外（ルーラーの上を含む） |
| `EZ-6` と札 | タスクの説明が出るフレームで札が消え、説明が消えるフレームで札が戻る |
| 札の字 | `max(S-340 px, S-334 em)` |
| 札の層 | 表 T-337 の `UZ-1` の層に描かれ、ポインタを取らない |
| 書き出し | 書き出した絵（`FR-080`）に札が無い |
| 逐語 | E-01〜E-04 の新しい `（MUST）`・`（MUST NOT）` の文を逐語で引く（検査 39） |

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`bfbe7eb7` の行番号）

| ファイル | 関数・所 | 何を | 毎フレーム |
|---|---|---|---|
| `src/framework/dom-screen-surface/tooltips-drawing.ts` | `tooltipElement` の点に出す枝（`:49-55`。左上を点に置き、測らない）・`keepTooltipsInside`（`:88-102`。錨の説明が無いと何もせず返る）・`showDualCursorReadout`（`:135-157`。ずらし無しで縁で返す） | 5 節の置き方を 1 つの関数にし、3 つの説明がそれを呼ぶ（`R2.21`）。`EZ-6` の説明は層を作り直したときに 1 度だけ測る（`JDG-728` の条件はそのまま） | はい |
| `src/adapter/screen-renderer/tooltips.ts` | `readoutDays`・`dualCursorReadoutOf`（`:210-252`）の隣 | 札を求める純な関数（線が立つ日は `timeAxisOf` と `dateAtX`、曜日の語は辞書の `weekdays`）と、カーソルの日付の書き方の関数 1 つ（`CR-626` も呼ぶ）。`EZ-6` の説明がある画面の値では札を返さない | はい |
| `src/adapter/screen-renderer/screen-renderer.ts` | `ScreenView`（`:473`）・`screenViewFromRegions`（`:579-583`） | 画面の値が札を運ぶ | はい |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` | `showUnpressableWords`（`:1090-1098`） | 札を読み出しの層（`UZ-1`、`:764`）に描く（`DC-9` で読み出しと同時に在ることは無い）。生成区画 `NOT_STORED_HELP_SIZES`（`:1161-1181`）は `npm run gen` が書く | いいえ（描くのは札が変わったときだけ） |
| `tools/generate_entity_types.py` | 群 `NOT_STORED_HELP_SIZES`（`:1339-1340`） | `S-460` を足す（足さないと `gen:check` は緑のまま生成区画に載らない） | ― |
| `tests/unit/cr-550-dual-cursor-readout.test.ts` | `DC_3_PLACE`・`DC_3_RIGHT`・`DC_3_BOTTOM`（`:44-46`）と、それを使う場合（`:325-343`） | E-03 の新しい文を引き、位置を (x, y ＋ `S-460`)、上へ返すときの下端を y − `S-460` にする | ― |
| `tests/unit/cr-541-panels-help-tooltip-and-dialogue.test.ts` | `Q38`（`:45`。文は E-01 の後も残る）・場合 `:292-308` | top を 150 ＋ `S-460` にする | ― |

⚠️ `tests/unit/cr-551-fit-status-line-and-cursors.test.ts:441-449`（読み出しの字）と `tests/unit/dfc-1130-in7-tooltip-measured-once.test.ts`（錨の説明だけ）は、本書で位置も文も変わらない見込み。

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 説明の中身（名前・予定・実績・担当・%・期限の行、`m/d (曜日)`）を変えない —— `CR-624` の持ち物。
- `DC-3` の日付の書き方（`yyyy/m/d` → 0 詰め）と期間の語を変えない —— `CR-626` の持ち物。本書は `CU-3` の札の書き方を定め、`CR-626` がそれを指す（5 節）。
- 錨に添える説明（`EZ-2`・`FR-037`）の揃え方（`IN-7` の前段）を変えない。
- `EZ-6` の出る条件・待ち（`S-439`）・動いたら消えることを変えない（`JDG-667`）。
- 札に `Esc` の段（`IN-4`）を与えない —— 札は説明ではなく、ガイドカーソルを消せば消える（`FR-048` の同じ入口の押し直し）。
- 読み出しを出す領域（`Row Area` とタイムルーラー）を変えない。
- 遅延診断（`CR-616`・`CR-617`）に触れない。

## 11. 利用者に問うこと

⭐ **2026-10-01 に答えを得た** —— `JDG-1092`「Q10: 推奨通りB」。24px で書いてあり、書き換えは無い。残る問いは無い。

**問い 1 —— マウスカーソルと説明のあいだの縦の距離（`S-460`）**

説明は、ポインタの先端から下へこの長さだけ離して出します（上へ返すときは上へ同じ長さ）。基準機の標準の矢印の絵を数えると、矢印は先端から下へ 19px まで伸びています（大きい矢印の設定では 25px・30px）。

| 案 | 値 | 標準の矢印との隙間 | 大きい矢印の設定 | 代償 |
|---|---|---|---|---|
| A | 20px | 1px | 重なる | 矢印の尾と説明が接して見える |
| **B（推奨）** | **24px** | **5px** | 25px の設定で 1px 重なる | 大きい矢印を選んだ人には重なる |
| C | 32px | 13px | 30px の設定まで重ならない | 標準の矢印では説明が離れ、ポインタから遠い説明になる |

推奨は B —— 既定の矢印（ほとんどの人が使う）で、はっきり隙間を空けて重ならず、説明がポインタのすぐ下に在ると読める長さです。閲覧環境はポインタの大きさを頁に教えないので、大きい矢印の設定に合わせて読み替えることはできません。
⭐ 本書の EDIT は B で書いた（E-07 の既定と注。A か C なら E-07 の `num` と注の「5px の隙間」の句だけが変わる）。見て選びたいときは、値を動かせる 1 ファイルの見本を作って触ってもらうのが早い（規則 05 の 7。本書では作っていない）。

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1339` | 画面の右端でタスクの説明が切れる | 本書で閉じる（仕様は E-01・E-02、コードは波 1） |
| `DFC-1340` | 説明がマウスカーソルに重なる | 本書で閉じる（E-02・E-07）。値は問い 1 の答え B（24px、`JDG-1092`）—— 本書のまま |
| `JDG-1092` | 11 節の問い 1 への答え（状態「指示 —— 調整役が投入時期を決める」） | 調整役へ: 本書の波が決まったら「指示 —— `CR-625` が当てる」。着地したら 適用済 |
| `DFC-1360` | 1 本カーソルに日付が出ない | 本書で閉じる（E-04〜E-07、コードは波 1） |
| `DFC-1130` | ツールチップを描き直しのたびに測る | 触れない（`実測待ち`）。E-02 の「1 度だけ測る」は同行の直し（`JDG-728`）の形をポインタの点に出す説明へ広げる |
| `JDG-869`・`JDG-870`・`JDG-890`・`JDG-893` | 利用者の裁定（状態「指示 —— 調整役が投入時期を決める」） | 調整役へ: 本書を当てる波が決まったら「指示 —— `CR-625` が当てる」（検査 43）。着地したら 適用済 |
| `JDG-922` | #21・#41 の 2 項を本書が当てる（ほかの項はほかの変更要求） | 調整役へ: 同上（行の状態は項がすべて着地してから） |
| `PND-391` | 置き場と、ずらし量の行が無いこと | 裁定済のまま。調整役へ: 注に「`CR-625` がずらし量の行 `S-460` を立てた」を足してよい |

## 13. 測り方の再現

```
# the tree: refactor bfbe7eb7 (branch l4-review-crs); 01-04-requirements.md and settings.json are LF-only (0 CR bytes)
git log --oneline -1                                             # bfbe7eb7
grep -c $'\r' docs/spec/01-04-requirements.md docs/spec/_source/settings.json   # 0 / 0

# the blast radius
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py IN-3 IN-7 DC-3 CU-3 EZ-6 EP-12
#   IN-3 6 req / 14 refs; IN-7 0 / 1; DC-3 3 / 8; CU-3 4 / 11; EZ-6 6 / 17; EP-12 1 / 2
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py IN-3 IN-7 DC-3 CU-3 EZ-6 EP-12
#   seeds 6 of 6, edges 9, cycles 1 (DC-3 EZ-6 IN-3)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py UZ-1 S-334 S-339 S-340 FR-048
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py IN-3 IN-7 DC-3 CU-3 EZ-6 EP-12 UZ-1 S-334 S-339 S-340 FR-048
#   seeds 11 of 11, edges 20, cycles 2 (DC-3 EZ-6 IN-3 S-334 S-340 / IN-7 S-339)

# who says where a pointer tip stands
git grep -n "ポインタの点\|ポインタのそば" -- docs/spec change-request/CR-616-*.md change-request/CR-617-*.md
#   01-04-requirements.md :5689 (DC-3) :7154 (EZ-6) :7786 (IN-3) :7793 (IN-7); settings.json :4448 (S-334 note); CR-616/617: 0
git grep -n "ガイドカーソル\|Guide Cursor\|CU-3" -- docs/spec ':!docs/spec/_assets/tbl-state-machines.md'
#   FR-048 :5628 :5641 :5655 :5657 :5658 :5660 :5661 ; DC-4 :5690 ; DC-9 :5695 ; EP-6 :6333 ; EN-6 :7252 ; NFR-010 :7909 ...

# the code
grep -n "export function\|^function" src/framework/dom-screen-surface/tooltips-drawing.ts   # tooltipElement :37, keepTooltipsInside :88, showDualCursorReadout :135
grep -n "at: pointer\|export function dualCursorReadoutOf\|function taskTooltipOf" src/adapter/screen-renderer/tooltips.ts   # :134 :143 :230 :250
grep -n "S-339\|S-334\|S-340" tools/generate_entity_types.py       # :1339-1340 NOT_STORED_HELP_SIZES

# tests that quote the old wording or assert the old position
git grep -n "ポインタの点に出し\|左上の隅をポインタの点\|ポインタの左へ返す\|ポインタの上へ返す\|本行の揃え方は当たらない\|日付を持たない\|読み出しの文字の大きさ" -- tests tools .claude/skills
#   tests/unit/cr-541-panels-help-tooltip-and-dialogue.test.ts:45 ; tests/unit/cr-550-dual-cursor-readout.test.ts:45 :46 (and :44 DC_3_PLACE)

# the overlap scan of CR-603..620
for f in change-request/CR-60[3-9]*.md change-request/CR-61*.md change-request/CR-620*.md; do head -10 "$f"; grep -o "IN-3\|IN-7\|DC-3\|CU-3\|EZ-6\|EP-12\|FR-048\|UZ-1\b\|T-337\|S-339\|S-340\|S-334" "$f" | sort | uniq -c; done
#   FR-048: CR-613 (2, a list), CR-615 (2, a list), CR-616 (1, a list); FR-152/T-337: CR-615 (landed), CR-617; UZ-1: 0 (CR-605's hits are UZ-13)

# the standard arrow (the basis of S-460): count the opaque pixels of the OS arrow images on the reference machine (MC-1, Windows 11 build 26200)
#   the script (session scratchpad, cr-625/cursor_extent.py) reads each image of a .cur file with Pillow and takes the bounding box of the pixels whose alpha > 0
python cursor_extent.py aero_arrow.cur aero_arrow_l.cur aero_arrow_xl.cur    # the three files of the OS cursor folder (standard / large / extra large)
#   aero_arrow    32x32 hot spot (0,0): 19px below, 12px right; 48x48: 27 (= 18 page px at 150%); 64x64: 39 (= 19.5 at 200%)
#   aero_arrow_l  32x32: 25px below ; aero_arrow_xl 32x32: 30px below

# the old blocks: each counted once, LF-normalised, by a script in the session scratchpad (cr-625/count_old.py)
#   (reads the <!-- EDIT --> markers of this file, takes each 旧 fenced block, counts it in its file,
#    and counts （MUST） / （MUST NOT） in the old and the new block)
python count_old.py change-request/CR-625-a-pointer-tip-sits-below-the-cursor-and-flips-at-the-edges.md
#   E-01 01-04-requirements.md 1 (MUST 1 -> 2) / E-02 1 (0 -> 7) / E-03 1 (3 -> 1) / E-04 1 (2 -> 9) /
#   E-05 1 (0 -> 0) / E-06 1 (0 -> 0) / E-07 settings.json 1
#   01-04-requirements.md: MUST markers in the blocks 6 -> 19 (+13)

# the rulings and ledger rows read whole
grep -n "^| JDG-375 \|^| JDG-379 \|^| JDG-396 \|^| JDG-728 \|^| JDG-869 \|^| JDG-870 \|^| JDG-890 \|^| JDG-893 \|^| JDG-922 \|^| JDG-925 " docs/development-records/rulings.md
grep -n "DFC-1339 \|DFC-1340 \|DFC-1360 \|DFC-1130 " docs/development-records/defects.md    # :437 :438 :458 :400
grep -n "^| PND-391 \|^| PND-342 " docs/development-records/pending-decisions.md
```
