# CR-196 — 呼びようの無かった公開エントリ 3 つと、組み立てを通らずに出ていた絵

> **閉じるもの**: 裁定 `D5a` / `D9` / `D5b` / `D8`（`previous-project-result/temp/rulings-2026-08-21.md`）。
> ⭐ **表 T-064 の 3 行と、`_source/components.json` の `ClipboardGateway` の辺を書く。**
> ⛔ **メンバの名前だけを書き、引数・戻り値は書かない** —— `CR-146` が「継ぎ目と公開エントリの署名の持ち主は `src/` である」と定めている。
> ⚠️ **`D8` は `CR-195` から回ってきた。** 理由は `CR-195` の §7 にある —— **`ClipboardGateway` の絵の経路は、辺を 1 本足せば済む形ではなかった。**

## 0. ⛔ 立ちどまって答える 3 つ（**検査 22 が空欄を許さない**）

### ① これは `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-3`（構造を持つ日程データとして他のソフトへ渡す）を進める。受ける目標は `GL-003`。**
⛔ **`D5a` が無いあいだ、文書を差し替える道が 1 本も無かった。** 取り込み（`PI-10`）・取り消し（`PI-11`）・
やり直し（`PI-12`）・自動保存からの復帰（`PI-23`）・ファイルを開いて置き換える（`OP-3`）・
起動時の文書（表 T-034）—— **6 つの呼び手が、計算した文書を現在値にする手段を持っていない。**
⭐ **`src/` が 4 か所でそう報告している**（§2）。

⭐ **`CH-1`（作図ソフトと同じ操作感で描く）も進める。受ける目標は `GL-004`。**
⛔ **`D9` が無いあいだ、日から画面上の x を出せない。** `dateAtX` は逆向きだけを持っており、
**カーソル・基準日線・スクロール位置の復元は、どれも「この日はどこか」を要る。**

⭐ **`CH-3` をもう一段進める** —— ⛔ **`D5b` と `D8` は同じ 1 つの穴の 2 人の呼び手である。**
`WY-2`（表 T-041、`:3088`）が **「透かしの層を除いた描画が正規化後に同じ SVG / PNG になること」** を求めるのに、
**SVG の経路だけが 表 T-076 の組み立てと `TaskGroup` の切り落としを通っていない。**

### ② `review-standards` のどの条項を当て、何が出たか

| 条項 | 当てた対象 | 結果 |
|---|---|---|
| **`R2.1`**（Naming・MUST・最重要）| 裁定 `D9` が名指しした綴り `xOfDate` | ⛔ **本物の違反が出た。** `docs/spec/01-04-requirements.md:320` が **「`Of` は比率（X ÷ Y）に限ること（MUST）。変換と導出は `From`」** と定める。⭐ **数えた** —— 表 T-064 は導出に `From` を **14 回**使い（`layoutFromSchedule` `documentFromJson` `svgFromSchedule` …）、`Of` は比率でない用法が 2 件しかない。**`xFromDay` と綴る**（§0 ⑧ の 2）|
| **`R2.1`**（同上）| `D5a` の新しい入口の綴り | ⭐ **仕様書自身の語を採った** —— 表 T-067 の `WS-6` が **「現在値を差し替える」** と書き、`FR-087` の `OP-3` が人に見せる 3 択の 1 つを **「置き換える」** と書いている。**`replaceDocument`**。⚠️ **表 T-006b を引いた** —— 「置き換え」も「差し替え」も予約語ではない |
| **`R2.13`**（CQS）| `D5a` の入口 | ⭐ **コマンドである**（状態を変える）。`non-pure` を添えた。**`applyDocumentChange` と同じ形** |
| **`R2.2`**（SRP）| `PI-8` が 2 つの入口を持つこと | ⭐ **責務は 1 つのままである** —— どちらも 表 T-067 の `WS-1` 〜 `WS-7` を通る。**違うのは入口が受け取る形だけ**（命令の列か、組み立て済みの文書か）。⛔ **`05-07-design.md:70` の「文書への書き込みの経路は 1 本である」は、コンポーネントが 1 つであることを言っている** |
| **`R4`**（DRY）| `D5b` と `D8` を別々に書くこと | ⛔ **退けた。** 2 人の呼び手が同じ「組み立てた画面の絵」を要る。⭐ **`ImageExporter`（`CP-21`）だけが 表 T-076 の組み立てと切り落としを持つ**ので、**そこに 1 つメンバを足せば 2 人とも満たされる** |
| **`R2.16`**（CA。依存が一方向で中心を向く）| `D8` の辺の相手 | ⭐ **`ClipboardGateway`（`Adapter`）→ `ImageExporter`（`Adapter`）は同層内である。** ⛔ **`CanvasRasterizer`（`Framework`）へ引いてはならない** —— `LR-1` が外向きを禁じる。⚠️ **`Rasterizer` は節点ではなく 表 T-065 の `IF-6` の名であり、宣言している側は `ImageExporter` である** |
| **`R2.9`**（YAGNI）| `PI-21` に足すメンバの数 | ⭐ **1 つだけ。** `exportPng` は既に在り、**SVG を返すメンバが無いことだけが穴である** |
| **`R7.1`**（純粋性の分類）| `exportSvg` の純粋性 | ⭐ **`pure` である**（記号を添えない。表 T-064 の前文が「添えていないメンバは `pure`」と定める）。⚠️ **`exportPng` が `semi-pure-b` なのは `Rasterizer` を呼ぶからであり、組み立てて文字列にするところは外を読まない。** ⛔ **`audit-ch5.py` の T-064 ↔ T-075 の突き合わせを確かめた** —— `image-exporter.ts` は `@purity pure` を 11 個持つので、`pure` を名乗って落ちない |
| **`R1.3`**（唯一の正がある）| `AM-13` の行 | ⭐ **1 文字も変えない。** 「画面を縮めた絵を値で返す」は**既に正しい** —— 壊れていたのは、それを作れる公開メンバが無かったことである |

### ⑧ 利用者に問わずに決めたこと（**覆してよい**）

| | 決めたこと | 何に載せたか |
|---|---|---|
| 1 | `D5a` の入口の綴りを **`replaceDocument`** とした | ⭐ **表 T-067 の `WS-6` の語（差し替える）と `OP-3` の語（置き換える）が同じ行為を指している。** ⛔ **`commitDocument` / `settleDocument` は仕様書に無い語であり、新しい概念を作ってしまう** |
| 2 | ⛔ **裁定 `D9` の綴り `xOfDate` を採らず、`xFromDay` とした** | ⛔ **`xOfDate` は `01-04-requirements.md:320` の MUST に反する** —— `Of` は比率に限る。⭐ **導出に `From` を使う先例が表 T-064 に 14 件ある。** ⚠️ **「日」を採ったのは、`PI-1` が `dayOf`（日付の字面を日にする）と `textOfDay`（日を日付の字面に戻す）で「日」を値、「日付の字面」を文字列と分けているからである。** ⛔ **`dateAtX` はその区別も接続語の MUST も破っているが、本 CR では直さない**（下の 3）|
| 3 | ⛔ **`dateAtX` を改名しない** | ⚠️ **実装着手前レビューが既に開いた指摘として記録している**（`docs/review/preimplementation-review-2026-08-15.md:457`。`dateAtX` / `itemAtPointer` / `itemsInMarquee` の 3 件）。⭐ **3 件は 3 つの行（`PI-5` / `PI-7` / `PI-7`）にまたがり、`src/` の 3 ファイルと試験 2 本が引いている。** ⛔ **本 CR は `PI-5` しか触らないので、3 件を 1 度に書けない。** ⚠️ **「触る行の指摘は全部その場で当てる」の例外としてここに記録する** —— **半分だけ改名すると、対になっている 2 つの名が別々の規約に従うことになる** |
| 4 | `D5b` の綴りを **`exportSvg`** とした | ⭐ **`AM-13` の確定名がそれである**（表 T-107）。⚠️ **`exportPng` が `AM-14` と `PI-21` の両方に同じ綴りで在る**ので、形が揃う。⭐ **適用されなかった編集計画が同じ名を提案していた**（`docs/review/edit-plan-2026-08-15.md:634`）—— **発明ではなく採り直しである** |
| 5 | ⛔ **`AM-13` の行を 1 文字も変えなかった** | ⭐ **「画面を縮めた絵を値で返す」は既に画面全体を指している**（`FR-080` が「画面」を GRS が占める画面の全体と定める）。⛔ **壊れていたのは実装と Chapter 5 であって、表 T-107 ではない** |
| 6 | ⛔ **`ClipboardGateway → SvgRenderer` の辺を、足すのではなく置き換えた** | ⛔ **その辺自体が欠陥である** —— `SvgRenderer` が作るのは**日程の絵**であり（`PI-19` の名が `svgFromSchedule` とそう綴る）、組み立ても切り落としも通らない。⭐ **`FR-025` の `:3136` が「出る絵は同じである」と明文で求め、`WY-2` が「同じ SVG / PNG になること」と判定にしている。** ⚠️ **`IO-6` が渡すのは「画像」であり、`:3136` がその経路を `FR-025`（PNG の要求）の対象と名指している。** ⭐ **だから辺は 89 のままで、行き先だけが変わる** |
| 7 | 辺の綴りを既存の 2 本に合わせた（`image out`）| ⭐ **`AgentApiEndpoint → ImageExporter` と `SingleHtmlShell → ImageExporter` が既に `image out` である。** 3 本目だけ別語にする理由が無い |

⚠️ **決めていないこと**: ⛔ **差し替えた文書が持つ版数（`revisionStamp`）である。**
`src/use-case/undo-edit/undo-edit.ts:33-43` が `STOP` として記録しており、`FR-063` は版数を「1 ずつ増える整数」と定め、
`AG-6` はそれで選ぶ。**取り消しで 1 段戻したとき、古い版数を持ち帰るのか新しい版数を打つのかが決まっていない。**
⭐ **`replaceDocument` を書く回に必ず問われる。** ⚠️ **分類 `D`（保存・交換される値）なので、推奨で走ってはならない**（規則 06）。**本 CR は入口の名だけを置き、値は置かない。**

---

## 1. 測った（⛔ 2 本とも走らせた）

```
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py PI-8 PI-5 AM-13
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py PI-8 PI-5 PI-19 PI-21 AM-13 T-064 T-107 T-024 T-076 T-041 WY-2 WY-3 FR-080 FR-025 IO-3 IO-4 IO-6
```

| | 実測 |
|---|---|
| 誘導部分グラフ（種 17 個）| 種 **17/17 が解決**。辺 15・**閉路 1 個（大きさ 2: `FR-025` ↔ `FR-080`）** |
| その閉路を触るか | ⛔ **触らない。** 本 CR は要求を 1 行も編集しない。⭐ **だから 1 つの計画で 1 度に書く必要は生じない** |
| `PI-8` を指している箇所 | 要求 0 件。参照 3 か所（変更履歴 2・表 T-108 の前文 1）|
| `PI-5` / `AM-13` を指している箇所 | ⛔ **どちらも 0 件。** 行が浮いている |
| `D8` の辺 | ⛔ **グラフに載らない。** `_source/components.json` は仕様のオブジェクトではない |
| 結論 | ⭐ **4 つの裁定は互いに素なオブジェクトに載る。1 つずつ順に書いてよい** |

⚠️ **`induced.py` は種が 1 つも解決しないと拒んで止まる。** 本件は 17 個とも解決しているので、
**閉路 1 個は本物である。** ⭐ **`FR-025` ↔ `FR-080` は「画像の書き出し」と「描画の一致」が互いを引いている作法の閉路であり、
直してはならない。**

⛔ **`impact.py` が「`PI-5` と `AM-13` を指している箇所が 0 件」と答えたことは、決定的ではない。**
⚠️ **表 T-064 と 表 T-107 は、要求から指されない設計の表である** —— **メンバを足しても要求は動かない。**
⭐ **`CR-192` が 表 T-065 で同じ答えを得ている。**

---

## 2. 何が壊れていたか（**逐語**）

### `D5a` —— 計算した文書を現在値にする道が無い

⛔ **`src/` が 4 か所で、同じ穴を独立に報告している:**

`src/use-case/undo-edit/undo-edit.ts:25-31`:

```
⛔ STOP -- the specification does not decide HOW `outcome.next` reaches WS-6.
`applyDocumentChange` takes `DocumentCommand`s (PI-8) and table T-108 has no
command that restores a whole document, so ApplyDocumentChange publishes no
entry that commits a document computed elsewhere. … whoever closes this adds it
to ApplyDocumentChange (CP-8), never here and never in the holder's owner.
```

`src/use-case/redo-edit/redo-edit.ts:28-31` に同じもの。
`src/adapter/agent-api-endpoint/agent-api-members.ts:660-663`:

```
// document through the one write path (MS-1 of table T-042). PI-8
// publishes only `applyDocumentChange`, which takes commands, and table
// T-108 has no command that takes a whole document in.
```

⭐ **表 T-108（`CM-1` 〜 `CM-71`）を全部読んだ。文書ぜんたいを受け取る命令は 1 つも無い。**
⭐ **表 T-065 の 9 本も全部読んだ。文書を内向きに運ぶ継ぎ目は 1 本も無い**（`IF-3` は読み書き、`IF-4` は置き場、`IF-7` は凍結した現在値）。

### `D9` —— 時間軸の対応が片道しか無い

`docs/spec/05-07-design.md:335`:

```
| PI-5 | layoutEngine | ScheduleLayout | ScheduleLayout（型）／ layoutFromSchedule ／ dateAtX（時間軸の対応。FR-017）／ fitZoom（FR-055）／ taskPlacement（どこに載るか） |
```

⛔ **「時間軸の対応」と書いてあるが、在るのは `x → 日` の 1 方向だけである。**
`src/entity/layout-engine/schedule-layout/schedule-layout.ts:343`:

```ts
export function dateAtX(layout: ScheduleLayout, x: number): CalendarDay | null
```

### `D5b` / `D8` —— 絵が 2 通りに割れている

`docs/spec/01-04-requirements.md:3088`（表 T-041 の `WY-2`）:

```
WY-2 | 同じ JSON を書き出しの基準環境で読み込み、全体表示（FR-055）を行ってから書き出したとき、
透かしの層を除いた描画が正規化後に同じ SVG / PNG になること
```

`docs/spec/05-07-design.md:110`（表 T-062 の `CP-21`）:

```
| CP-21 | Adapter | ImageExporter | 画像として書き出す。表 T-076 が「描く」と定めた UI パーツを組み立て、
縦に収まらない TaskGroup を落とす。Rasterizer を宣言する | FR-025 / FR-080 |
```

⛔ **ところが `PI-21` は `exportPng` しか公開していない**（`docs/spec/05-07-design.md:351`）。
**組み立てた画面を SVG として返す口が無い。** その帰結が 2 か所に出ている:

1. `src/adapter/agent-api-endpoint/agent-api-members.ts:753-764` —— `AM-13` は
   **`svgFromSchedule` を呼び、日程の描画領域だけをフレームの縮尺で返している。**
   同ファイルの注記が **「Applying the ratio here would put a second implementation of FR-080 in a
   component that does not own it」** と、自分で穴を記録している。
2. `_source/components.json` —— `ClipboardGateway → SvgRenderer`（`picture out`）。
   ⛔ **クリップボードへ出る絵も、組み立てを通らない。** `FR-025` の `:3136` が
   **「ダウンロードのダイアログを経由しないだけで、出る絵は同じである」**と明文で禁じている状態である。

---

## 3. 何を書くか（**オブジェクトごとに 1 回**）

| # | オブジェクト | 何をするか |
|---|---|---|
| 1 | `docs/spec/05-07-design.md:335`（`PI-5`）| `xFromDay` を 1 つ足す |
| 2 | `docs/spec/05-07-design.md:338`（`PI-8`）| `replaceDocument`（`non-pure`）を 1 つ足す |
| 3 | `docs/spec/05-07-design.md:351`（`PI-21`）| `exportSvg` を 1 つ足す |
| 4 | `docs/spec/_source/components.json` の `edges` | ① `ClipboardGateway` の絵の辺の行き先を `SvgRenderer` から `ImageExporter` へ替える。② `AgentApiEndpoint → SvgRenderer` の札を `picture out` から `picture arguments` へ直す（**辺は 89 のまま**）|
| 5 | `docs/spec/_source/components.json` の `views.io` | `SvgRenderer` を 1 節点加える（16 → 17）。⭐ `python docs/spec/_source/build.py` で図と `docs/review/components/components.md` を作り直す |
| 6 | `docs/spec/A-appendix.md` | 変更履歴に 1 行 |

⛔ **`_assets/tbl-glossary.md` の `AM-13` は触らない。** ⛔ **要求は 1 本も足さない。表も図も行も UID も足さない。**

### 数の予測

| | 前 | 後 |
|---|---|---|
| `tables` | 126 | **126** |
| `figures` | 11 | **11** |
| `rows` | 1563 | **1563** |
| `uids` | 145 | **145** |
| `_source/components.json` の辺 | 89 | **89**（行き先が 1 本、札が 2 本変わる）|
| 図 F-016（`views.io`）の節点 | 16 | **17** |
| 変わる生成物 | — | `_assets/view-io.svg` と `_source/view-io.drawio` と `docs/review/components/components.md` の **3 つだけ**。⭐ `overview.json` は内容が 1 バイトも動かない（層と層の対が増えないため）|
| 表 T-064 の行 | 38 | **38**（3 行がセルの編集）|
| 重複検出 | `A=26 new 0` | **`A=26 new 0`** |

⚠️ **`rows` が 1 つも動かないのが本 CR の要点である** —— **3 つとも既存の行のセルの編集であり、行の追加ではない。**

---

## 4. `src/` で何を書くか（**仕様書ではない側**）

⭐ **`CR-146` の裁定により、以下はすべて `src/` が正である。仕様書に書かない。**

| ユニット | ファイル | 何をするか |
|---|---|---|
| `UF-5` | `entity/layout-engine/schedule-layout/schedule-layout.ts` | `xFromDay` を書く。⭐ **`dateAtX` の逆で、`originX + (serial(day) − serial(originDay)) × pxPerDay`** |
| `UF-8` / `UF-9` | `use-case/apply-document-change/` | `replaceDocument` を書く。⛔ **表 T-067 の `WS-1` 〜 `WS-7` を全部通す。** ⚠️ **版数は未決である**（§0 の「決めていないこと」）—— **`STOP` 注記を残し、推測しない** |
| `UF-39` | `adapter/image-exporter/image-exporter.ts` | `exportSvg` を書く。⭐ **`exportPng` が既に持っている組み立てを、ラスタライズの手前で返す形に切り出す** |
| `UF-28` | `adapter/agent-api-endpoint/agent-api-members.ts` | `AM-13` の結線を `svgFromSchedule` から `exportSvg` へ移す。⛔ **`:753-764` の注記を消す** |
| `UF-45` | `adapter/clipboard-gateway/clipboard-gateway.ts` | 絵を `ImageExporter` から取る |
| `UF-19` 〜 `UF-23` ほか | 取り消し・やり直し・取り込み・自動保存・起動 | ⭐ **`replaceDocument` を呼ぶ側の `STOP` 注記を消す** |

⚠️ **試験は別の体が `docs/spec` だけを読んで書く**（規則 04 の 1.）。⛔ **書いた者に書かせない。**

---

## 5. 試験（**期待値を曲げない**）

⚠️ **`tests/unit/uf-20-21.test.ts:28-29` が「`PI-8` は文書を確定する入口を公開していない」と主張している。**
⛔ **これは仕様駆動で書かれた主張であり、出どころは 表 T-064 の `PI-8` の行である。**
⭐ **本 CR がその行を変えるので、写しの側を追随させる:**

```
前  DocumentCommand（型）／ applyDocumentChange（non-pure。唯一の書き込みの経路）
後  DocumentCommand（型）／ applyDocumentChange（non-pure。命令の列で書き込む）／
    replaceDocument（non-pure。外で組み立てた文書を現在値にする。段は 表 T-067）
```

⛔ **製品コードに合わせて期待値を書き換えたのではない**：変わったのは仕様書の行であり、その行をここに引く。

---

## 6. 裁定 4 件のうち、何を閉じ、何を閉じないか

| | 件 | 本 CR | 理由 |
|---|---|---|---|
| `D5a` | `PI-8` に「外で組み立てた文書を確定する」入口を 1 つ | ✅ **閉じる** | ⚠️ **版数だけは未決のまま残る**（分類 `D`）|
| `D9` | `PI-5` に日から x を出す入口 | ✅ **閉じる** | ⛔ **綴りは `xFromDay`。裁定の字面（`xOfDate`）は採らない**（§0 ⑧ の 2）|
| `D5b` | `AM-13` は画面全体を返す | ✅ **閉じる** | ⭐ **`AM-13` の行ではなく `PI-21` を直す** —— 行はもとから正しく、作れる口が無かった |
| `D8` | `ClipboardGateway → Rasterizer` の辺 | ✅ **閉じる** | ⭐ **足すのではなく行き先を替える。** 相手は `IF-6` を宣言する `ImageExporter` |
| — | `dateAtX` の改名 | ⛔ **閉じない** | ⚠️ **実装着手前レビューの開いた指摘。3 行にまたがるので 1 度に書けない**（§0 ⑧ の 3）|
| — | 差し替えた文書の版数 | ⛔ **閉じない** | ⛔ **分類 `D`。推奨で走ってはならない** |

---

## 7. ⚠️ 図 F-016 に `SvgRenderer` を 1 節点足した理由（**生成器が止めて分かった**）

⭐ **辺の行き先を替えたら、`build.py` が止めた:**

```
build: no clear position for edge label(s): image out
```

⛔ **原因を測った** —— 新しい辺 `ClipboardGateway → ImageExporter` は、図 F-016 の中で
**同じ段の隣どうし**（`x=249,y=1045` と `x=559,y=1045`）を結ぶ短い横線になる。
その 13 か所の候補位置が**すべて、先に置かれた `implements DocumentStore` の札
（`x 409..553, y 1074..1092`）に食われていた。**

⭐ **節点を 1 つ足したら通った。** ⛔ **札を短くしても通らない** —— 候補が全部同じ高さに並ぶので、
**幅ではなく段が足りない。**

### ⚠️ 「通ったから足した」ではない —— 中身の理由がある

| | |
|---|---|
| 図 F-016 の題 | **「ファイル・保管庫・クリップボード・画像と、取り込みの検証」**（`05-07-design.md:159`）—— **画像は本図の主題の 1 つである** |
| 本 CR の後の絵の経路 | `ClipboardGateway` ／ `AgentApiEndpoint` ／ `SingleHtmlShell` → `ImageExporter` → `SvgRenderer` |
| 足す前の図 | ⛔ **`ImageExporter` で終わっていた** —— **絵の中身がどこから来るのかが図から読めない** |
| 既にあった不揃い | ⭐ **`ImageExporter → ScreenRenderer`（`parts that go out`）は図に在る。** つまり本図は既に `ImageExporter` の先を 1 本描いており、**SVG の側だけを描いていなかった** |

⭐ **本 CR が「絵は 1 か所で組み立てる」と決めた以上、その 1 か所が何を読むかは同じ図に在るべきである。**

### ⛔ 確かめたこと（**draw.io は何も描かなくても終了コード 0 を返す**）

```
docs/spec/_assets/view-io.svg   55,864 bytes   1197 x 1492
  ClipboardGateway 3 / ImageExporter 3 / SvgRenderer 3 / image out 2  （いずれも実在）
overview.json                   ⭐ 内容の差分 0 —— 層と層の対は増えない
docs/review/components/components.md   ⭐ 変わった行は 2 行だけ（辺 2 本の札）
```
