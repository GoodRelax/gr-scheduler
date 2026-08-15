# CR-126 — 対話の輪を閉じ、シェルの走行を宣言し、ハンドルの持ち主を正す

## 1. 変更概要

**CR-125 §9 が残した 6 件を一括で直す。** `graph.py --units` が **6 件を 1 ユニットに畳んだ**ので、分けて直すと収束しない（§2-1）。

| # | 直すもの | 置き場 |
|---|---|---|
| ① | ⭐ **`Agent API` に 18 番目 `postDialogueMessage` を置く。**「17」と数えている 4 箇所を 18 に直す | 表 T-107 ／ 表 T-062 ほか |
| ② | **人の発話が `DialogueLog` へ届く辺を足す**（`InputCommandTranslator → PostDialogueMessage`） | `model.json` |
| ③ | **発話が監視を起こす辺を足す**（`PostDialogueMessage → NotifyChangeWatchers`）—— `AG-11`（MUST）が要求している | `model.json` |
| ④ | **シェルの走行の辺を 6 本足す。**出次数 3 → 9 | `model.json` ／ `build.py` |
| ⑤ | **`InputCommandTranslator → ScheduleLayout` を足し、`dateAtX` を宣言する** | `model.json` ／ 表 T-064 |
| ⑥ | **ファイルのハンドルの持ち主を `CP-28` に正す** —— `LY-5` と `model.json` が既にそう書いている | 表 T-062 |

⭐ **要求の本文は 1 文字も変えない**（§2-2）。**表も図も要求 `UID` も新設しない。行が 1 本増えるだけである。**

## 2. 変更の背景・目的

### 2-1. グラフで調べた —— **6 件は 1 ユニットである**

```bash
python .claude/skills/spec-graph-check/graph.py     # units(findings) を呼んだ
```

**6 件が触る 40 個の対象に誘導した部分グラフ**（辺 37 本）を測った。

| 測ったもの | 結果 |
|---|---|
| **ユニット分割** | ⭐ **1 つ。**6 件すべてが `CP-16` / `CP-18` / `AG-11` / `LY-5` などを共有する。**`SKILL.md` の言う「分けて編集すると収束しない」束である** |
| **閉路（Tarjan）** | **2 つ。どちらも 2-閉路** —— `FR-066 ↔ UC-013`（要求とその出どころ）／ `AG-11 ↔ AG-6`（規則と、それを指す規則） |
| 影響の広がり | `depth0=40` ／ `depth1=76` ／ `depth2=202` |

**2 つの閉路はどちらも `SKILL.md` の言う「規約そのものである 2-閉路」であり、壊れていない。**
**閉路が定めたのは編集の束ではなく、突き合わせて読む束である。**

### 2-2. 2 束の原文を読み合わせた —— **要求は 1 文字も変えなくてよい**

| 束 | 原文 | 判定 |
|---|---|---|
| **`AG-11` ↔ `AG-6`** | `AG-11`「発話は日程データではないので**版数を上げない**。**それでも監視は起きること**（`AG-6`）—— 版数で選べないので、**監視は発話を版数とは別の順序で数えること（MUST）**」／ `AG-6`「自分がまだ受け取っていない、**自分以外の書き手が確定した**変更と発話だけ」 | ⭐ **足りないのは規則ではなく辺である。** `AG-6` は既に「**自分以外の書き手**」と書いており、**話者が複数いることを前提にしている。**`AM-18` を足しても規約は 1 文字も変わらない。**「それでも監視は起きること」を成り立たせる辺（③）が無かっただけである** |
| **`FR-066` ↔ `UC-013`** | `FR-066`「画面上で AI と言葉を**やり取り**する欄を出すこと」／ `UC-013` 手順 2「作成者が画面上の対話欄で、直したいことを言葉で伝える」 | ⚠️ **「やり取り」は双方向である。**ところが 表 T-107 の 17 メンバで発話に触れるのは `AM-6`（読む）だけで、**AI が言葉を入れる道が無い。**また `UC-013` 手順 2 の人の発話にも辺が無い（②）。**どちらも要求は正しく、面と辺が足りない** |

### 2-3. 「17」と数えている箇所の全数（**機械で数えた**）

| 位置 | 何を書いているか | 判定 |
|---|---|---|
| `05-07-design.md:130` | `R2.5`（ISP）の断り書き「`Agent API` は 17 のメンバを 1 つの面に載せ」 | **直す** |
| `05-07-design.md:213` | 表 T-063 の `UT-4`「表 T-107 の 17 メンバの結線」 | **直す** |
| `05-07-design.md:239` | 表 T-064 の `PI-17`「外へ公開する 17 メンバの名前は」 | **直す** |
| `tbl-glossary.md:300` | 表 T-107 の前書き「1 つの面に 17 のメンバをフラットに並べる」 | **直す** |
| `model.json` | `AgentApiEndpoint` の説明 "Seventeen flat members." | **直す** |
| `A-appendix.md:44` / `:45` | 版 0.16 / 0.17 の記録 | ⛔ **触らない。過去の記録である** |

⚠️ **`R2.5` を意図して満たさない理由は数に依らない** —— 「`FR-028` が入口を 1 つと定めているため」であり、17 でも 18 でも成り立つ。**断り書きの数だけを直す。**

### 2-4. 決定① 18 番目のメンバ —— 群「話す」を立てる

**既存の 7 群は 版 / 読む / 書く / 履歴 / 出す / 見せる / 待つ である。**

| 案 | 判定 |
|---|---|
| **「書く」に入れる** | ⛔ **「書く」は `applyCommands` と `importDocument` で、どちらも文書への書き込みである。**発話は文書に保存しない（`FR-066`・MUST NOT）ので、同じ群に入れると「書く ＝ 版数が上がる」が崩れる |
| **群「話す」を立てる** | ✅ **採る。**読む / 書く / 待つ / 見せる / 出す と同じ 1 語の動詞で並ぶ |

**名前は `postDialogueMessage` とする** —— **部品 `PostDialogueMessage`（`CP-16`）と同じ概念だから同じ語である**（1.9）。
**`importDocument` / `undoEdit` / `redoEdit` / `watchChanges` が既に同じ形をしている**（表 T-107 と `UseCase` 層で綴りが一致する）。

⚠️ **`AM-6`（`readDialogueMessages`）は変えない。** `AG-11` が「**人が**確定した発話を読めること」と定めており、**読む側の範囲は人の発話のままである。**

### 2-5. 決定④ シェルの走行 —— **呼び手のいないメンバから機械的に決まる**

**`LY-5` が「現在値を保持するのは `Framework` だけ」と定め、5.3 が「どの部品もインスタンスを作らない」と定めた以上、
すべての部品を呼ぶのはシェルである。** ところが `model.json` のシェルの出辺は 3 本しかなかった。

**どこへ辺を引くかは、表 T-064 で「呼び手のいない公開メンバ」を数えれば決まる**（自分で数えた）——

| 呼び手のいなかったメンバ | 足す辺 |
|---|---|
| `commandOfInput` / `selectionOfInput` | `SingleHtmlShell → InputCommandTranslator` |
| `openDocumentFile` / `saveDocumentFile` | `SingleHtmlShell → FileGateway` |
| `saveDocumentSnapshot` / `restoreDocumentSnapshot` | `SingleHtmlShell → AutosaveGateway` |
| `writeClipboard` | `SingleHtmlShell → ClipboardGateway` |
| `exportPng`（`Agent API` からしか呼ばれず、人が出せない） | `SingleHtmlShell → ImageExporter` |
| `svgOfSchedule`（**画面を描き直す者がいない**） | `SingleHtmlShell → SvgRenderer` |

⭐ **これで検査が両方向になる** —— 「辺がメンバに着地する」だけでなく「**メンバに辺がある**」も測れる。

⚠️ **`Framework` の 7 部品は例外である。** 実装であり、`realization` の辺は自分から出る。入辺は持たない。

⚠️ **シェルは `Entity` を直に呼ばない。** レイアウトと幾何は `SvgRenderer` と `ItemHitArea` と `InputCommandTranslator` が呼ぶ。
**`framework → entity` の辺を作らないので、`build.py` の `CLUSTER_EDGE_LABELS` に新しい対が要らない**（§6-3）。

### 2-6. 決定⑥ ハンドルの持ち主 —— **`model.json` が既に正しかった**

| 出どころ | 何と書いてあるか |
|---|---|
| `model.json` の `FileSystemAccessFileStore` | "Reads and writes files and **keeps the handle**." |
| `model.json` の `FileGateway` | "Opens and overwrites the document file. Declares FileStore."（**ハンドルに触れていない**） |
| 表 T-060 の `LY-5` | 「**現在値を保持するのはこの層だけである** —— 内側の 3 層はすべて値を引数で受け取る」 |
| Chapter 5.3 | 「**どの部品もインスタンスを作らない。公開するのは型と関数だけである**」 |
| 表 T-062 の `CP-22` | 「ファイルの読み書きと**ハンドルの保持**」 ⛔ **ここだけが食い違っている** |

**3 対 1 である。`CP-22` の 1 行を直し、`CP-28` に持ち主を明記する。**

## 3. 変更箇所

| # | ファイル | 対象 | 行の増減 |
|---|---|---|--:|
| 1 | `docs/spec/_assets/tbl-glossary.md` | 前書きの「17」→「18」／ 表 T-107 の `AM-17` の直後に `AM-18` を足す | **＋1** |
| 2 | `docs/spec/05-07-design.md` | `CP-18` / `CP-22` / `CP-25` / `CP-28` を各 1 行で置換 ／ `R2.5` の断り書き ／ `UT-4` ／ `PI-5` / `PI-17` / `PI-22` ／ `IF-3` | 0 |
| 3 | `docs/spec/_assets/source/model.json` | **辺 ＋9**、`AgentApiEndpoint` の説明を 1 語 | — |
| 4 | `docs/spec/_assets/source/build.py` | `CLUSTER_EDGE_LABELS` の `("framework","adapter")` を 1 行 | 0 |
| 5 | `docs/spec/_assets/*.svg` ほか | **`python docs/spec/_assets/source/build.py` で再生成。手で直さない** | — |
| 6 | `docs/spec/A-appendix.md` | A.3 Changelog に版 0.18 を足す | ＋1 |

⚠️ **変更しないもの（読んだうえで、変えないと決めた）** —— **要求の本文はすべて**（`FR-016` / `FR-028` / `FR-055` / `FR-060` / `FR-066` / `FR-070` / `FR-080` / `UC-013` / 表 T-035 の `AG-1` 〜 `AG-11` / 表 T-023 / 表 T-023c / 表 T-024 / 表 T-034）／ 表 T-060（`LY-1` 〜 `LY-5`）／ 表 T-061（`LR-1` 〜 `LR-6`）／ 表 T-107 の `AM-1` 〜 `AM-17` ／ 図 F-012 ／ 5.1 と 5.4 の本文 ／ `model.json` の `views`（4 枚の節点の並び）。

## 4. 変更前の仕様

```
| CP-18 | `Adapter` | `InputCommandTranslator` | 画面の入力を操作へ変える。`InputSource` を宣言する | `FR-016` / `FR-070` |
| CP-22 | `Adapter` | `FileGateway` | ファイルの読み書きとハンドルの保持。`FileStore` を宣言する | `FR-060` / 表 T-024 |
| CP-25 | `Framework` | `SingleHtmlShell` | 起動と結線。**現在値を保持する。** 埋め込みの入れ物を持ち、公開点を置く。`SnapshotSource` と `AppShellSource` の実装 | `FR-067` / `FR-065` |
| CP-28 | `Framework` | `FileSystemAccessFileStore` | `FileStore` の実装 | `FR-060` |
| PI-5 | `layoutEngine` | `ScheduleLayout` | `ScheduleLayout`（型）／ `layoutOfSchedule` ／ `fitZoom`（`FR-055`）／ `taskPlacement`（どこに載るか） |
| PI-22 | `Adapter` | `FileGateway` | `FileStore`（表 T-065）／ `openDocumentFile`（`semi-pure-b`）／ `saveDocumentFile`（`non-pure`） |
| IF-3 | `FileStore` | `FileGateway`（`CP-22`） | `FileSystemAccessFileStore`（`CP-28`） | ファイルの読み書きとハンドル（`FR-060`） |
**`Agent API` は 1 つの面に 17 のメンバをフラットに並べる。** 用途別に分けない理由は Chapter 5.2 が持つ（`R2.5`）。
```

## 5. 変更後の仕様

**リテラルの置換で示す。正規表現は使わない。置換元はいずれも `docs/spec` でちょうど 1 回だけ一致する（当てる直前に機械照合する）。**

### 5-1. 表 T-107 に足す 1 行

```
| AM-18 | 話す | `postDialogueMessage` | 動詞＋目的語・`non-pure` | AI が確定した発話を対話欄へ置く。日程データではないので版数を上げない | `FR-066` ／ 表 T-035 の `AG-11` |
```

### 5-2. `model.json` に足す辺 9 本

| # | 辺 | 向き | 何のために |
|--:|---|---|---|
| 1 | `InputCommandTranslator → PostDialogueMessage` | 内向き | **人が対話欄で確定した発話**（`UC-013` 手順 2 ／ `AG-11`） |
| 2 | `PostDialogueMessage → NotifyChangeWatchers` | 層内 | **発話でも監視が起きる**（`AG-11` の MUST） |
| 3 | `InputCommandTranslator → ScheduleLayout` | 内向き | **掴んだ位置を日付へ直す**（`FR-017` の時間軸。`dateAtX`） |
| 4 | `SingleHtmlShell → SvgRenderer` | 内向き | フレームごとに画面を描き直す |
| 5 | `SingleHtmlShell → InputCommandTranslator` | 内向き | 入力を操作と選択へ変える |
| 6 | `SingleHtmlShell → FileGateway` | 内向き | 人がファイルを開く / 保存する |
| 7 | `SingleHtmlShell → AutosaveGateway` | 内向き | 操作の切れ目で自動保存する（`S-112`） |
| 8 | `SingleHtmlShell → ImageExporter` | 内向き | 人が画像を書き出す |
| 9 | `SingleHtmlShell → ClipboardGateway` | 内向き | 人がクリップボードへ出す |

**9 本すべてが内向きか層内である。外向きは 0 本である**（§6-2）。

### 5-3. `build.py` の `CLUSTER_EDGE_LABELS`

```
("framework", "adapter"): "implements"   →   ("framework", "adapter"): "drives / implements"
```

**辺 4 〜 9 は実装ではなく走行なので、"implements" だけでは嘘になる**（裏づけが 8 → 14 に増え、うち 6 本が走行である）。

## 6. 影響反映と影響分析結果

### 6-1. 席番号

| 席 | `docs/spec` での出現（**採る前に全数を検索した**） | 判定 |
|---|--:|---|
| **`AM-18`** | **0** | **採れる。**現在の最大は `AM-17`。**`AM-` に欠番は無い** |

| 種別 | 新設 | 実測 |
|---|--:|---|
| 表番号（`T-`） / 図番号（`F-`） / 要求 `UID` | **0 / 0 / 0** | **1 つも新設しない。図は再生成であって新設ではない** |
| 行 ID | **1** | `AM-18` |

### 6-2. `LR-1` / `LR-3` / `LR-4` の検算（**Tarjan で計算した**）

| 検査 | 現状 | **修正後** |
|---|--:|--:|
| 節点 / 辺 | 33 / 62 | **33 / 71** |
| **外向きの辺（`LR-1` MUST NOT）** | 0 | **0 本** |
| **閉路（`LR-3` MUST）** | 0 | **0（非巡回のまま）** |
| **`LR-4` 違反** | 0 | **0 本** |
| 層内の辺 | 17 | **18** |
| `SingleHtmlShell` の出次数 | 3 | **9** |

### 6-3. `build.py` が落ちないこと

**`build_overview()` は「ラベルの無い裏づけ対」と「裏づけの無いラベル」の両方で `sys.exit` する。**
**新しいクラスタ対は 0 である**（自分で計算した）——

| クラスタ対 | 裏づけ 現状 → 修正後 |
|---|---|
| `framework → adapter` | **8 → 14** ⚠️ ラベルを直す（§5-3） |
| `adapter → usecase` | 6 → **7** |
| `adapter → entity` | 15 → **16** |
| `framework → usecase` / `usecase → entity` | 1 / 11（**不動**） |

**`usecase → usecase`（辺 2）は層内なので `collapse()` が捨てる**（`build.py:81` の `if pair[0] == pair[1]: continue`）。**クラスタ対を作らない。**

### 6-4. ⭐ 着地の検算 —— **両方向とも通った**

```
edges after the fix : 71      landing entries : 71
direction 1  辺 → メンバ : 宣言の無い辺 0 ／ 実在しないメンバ 0 ／ 辺の無い対応 0
direction 2  メンバ → 辺 : 未到達メンバ 0（`Framework` の 7 部品を除く）
members declared : 80
RESULT: BOTH DIRECTIONS CLEAN
```

⚠️ **CR-125 の時点では片方向しか測れなかった。**④が入ることで初めて「メンバ → 辺」が測れるようになる。

### 6-5. 図はどれが変わるか（**4 枚の `views` を 1 つずつ当てた**）

| 図 | 新しい矢印 | 中身 |
|---|--:|---|
| **図 F-017（起動）** | **＋3** | ⭐ `SingleHtmlShell → InputCommandTranslator` ／ `InputCommandTranslator → PostDialogueMessage` ／ `PostDialogueMessage → NotifyChangeWatchers` —— **塞いだ穴がそのまま図に出る** |
| 図 F-014（書き込み）/ F-015（読み取り）/ F-016（出し入れ） | **各 0** | 足す辺の両端が節点の並びに揃わない |
| 図 F-013（全体） | 0 本増 | 矢印の数は変わらない。`framework → adapter` の**ラベルと裏づけ数**だけが変わる |

### 6-6. 機械検査

**反映前の実測**（自分で走らせた。CR-125 を当てた後）—— `ALL GREEN` ／ `tables=100 figures=9 rows=1158 uids=140` ／ ゲート 13 本すべて緑 ／ 助言 13 が 4・14 が 18 ／ 重複 `A=17 (new 0)`。

#### 反映したときに動くはずの値（**予測**）

| 指標 | 反映前 | 反映後の予測 | 根拠 |
|---|--:|--:|---|
| **`rows`** | **1158** | **1159** | `AM-18` で ＋1。他はすべて 1 行を 1 行で置換 |
| `tables` | 100 | **動かない** | 表を新設しない |
| **`figures`** | 9 | **動かない** | ⚠️ **再生成であって新設ではない。動いたら取り違えている** |
| `uids` | 140 | **動かない** | 要求を新設も廃止もしない |
| ノード数（`FUNC_REQ` ほか） | 98 / 7 / 13 / 14 | **動かない** | — |
| ゲート 12 | 0 | **0** | `AM-18` の行に `（MUST）` / `（MUST NOT）` は無い |
| 助言 13 | 4 | **4** | `AM-18` は「規則は ⋯」の形を書かない。「版数を上げない」は検出語（`してはならない` / `しなければならない` / `（MUST）`）に当たらない |
| 助言 14 | 18 | **18** | 検査対象は `tbl-settings.md` × `01-04-requirements.md` だけで、本 CR はどちらも触らない |
| 「> 未記入。」 | 13 | **13** | 器を埋めない |

## 7. 最終判断日時

**2026-08-15**（利用者判断 —— **`Agent API` に 18 番目のメンバを足す** ／ **シェルの走行の辺を 6 本すべて足す**）

**採らなかった案**

| 案 | 採らなかった理由 |
|---|---|
| **`AgentApiEndpoint → PostDialogueMessage` の辺を削る**（AI は `GRS` 経由で話さない） | 前プロジェクトの読み方（在庫表 `A01` の `W-6`「人間の言葉は同じページの中で AI へ直接届く」）に戻ることになる。**`FR-066` の「言葉を**やり取り**する欄」が片方向になり、対話欄に AI の返事が出ない設計になる**（利用者判断で不採用） |
| **シェルの走行を `SvgRenderer` の 1 本だけにする** | 図 F-013 のラベルを直さずに済むが、**`commandOfInput` / `openDocumentFile` / `writeClipboard` ほか 7 メンバが呼び手の無いまま残り、検査が片方向のままになる**（利用者判断で不採用） |
| **`AM-18` を群「書く」に入れる** | **「書く」は文書への書き込みであり版数が上がる。**発話は保存しないので（`FR-066`・MUST NOT）、同じ群に入れると群の意味が崩れる（§2-4） |
| **`LY-5` の「現在値」を「文書の現在値」に狭めて `CP-22` を残す** | **`model.json` と Chapter 5.3 が既にハンドルを `Framework` に置いている。**規則を緩めるより、食い違っている 1 行を直すほうが小さい（§2-6） |
| **シェルから `Entity` へ直に辺を引く**（レイアウトをフレーム先頭で 1 回だけ計算する） | **`framework → entity` という新しいクラスタ対ができ、`build.py` にラベルを足すことになる。**重複計算の是非は `R2.20`（キャッシュ）の論点であり、**Chapter 5.6 の ADR が持つ** |

## 8. 反映記録（2026-08-15）

**§5 の 12 置換を 1 パスで当て、`model.json` に辺を 9 本足し、`build.py` でラベルを 1 行直し、図を再生成し、A.3 Changelog に版 0.18 を足した。**
**12 置換はいずれも、当てる直前に「ちょうど 1 回一致」を機械照合してから実行した**（全 12 件とも `matches=1`。**1 件でも外れたら 1 バイトも書かずに止まる作り**にした）。
**`model.json` は往復が無損失であることを先に確かめてから**（`json.dumps(..., indent=1)` が元と 1 バイトも違わないことを照合）辺を足した。

### 8-1. §6-6 の予測と実測

| 指標 | 予測 | **実測** | 判定 |
|---|--:|--:|---|
| **`rows`** | **1159** | **1159** | ✅ |
| `tables` | 100（不動） | **100** | ✅ |
| **`figures`** | 9（**不動**。再生成であって新設ではない） | **9** | ✅ |
| `uids` | 140（不動） | **140** | ✅ |
| ノード数（`FUNC_REQ` / `GOAL` / `NON_FUNC_REQ` / `USE_CASE`） | 98 / 7 / 13 / 14（不動） | **98 / 7 / 13 / 14** | ✅ |
| ゲート 12 | 0 | **0** | ✅ |
| 助言 13 / 14 | 4 / 18 | **4 / 18** | ✅ |
| ゲート 13 本（1 〜 12 と 15） | 緑 | **すべて緑** | ✅ |
| 「> 未記入。」 | 13（不動） | **13** | ✅ |
| **重複検出（11）** | **`A=17 (new 0)`** | ⚠️ **`A=18 (new 1)` で一度落ちた** | ❌ **外した**（§8-2） |

### 8-2. ⚠️ 外した予測 1 件とその原因

**`AM-18` を置いた瞬間、重複検出が新しい群 `A6` を出してゲートが落ちた。**

```
--- A6  [NEW] : 2 places / max 0.54 ---
    T:T-035 AG-11  [01-04-requirements.md:3295]  発話は日程データではないので**版数を上げない**（`FR-063`）。
    T:T-107 AM-18  [tbl-glossary.md:324]         日程データではないので版数を上げない
```

**原因** —— **`AM-18` の「何を担うか」欄に、`AG-11` が持っている規則を書き写していた。**
1.9 は「**規則と理由の正は要求**」と定め、用語辞書は「本書が持つのは**名前**である」と自ら宣言している（`tbl-glossary.md:13`）。
**規則を落とし、「正」欄が `AG-11` を指すだけにした** —— 「AI が確定した発話を対話欄へ置く」。**再実行で `A=17 (new 0)` に戻った。**

⚠️ **予測を外した理由は「重複検出は既存の 17 行が通っているから 18 行目も通る」と考えたことである。**
**通っている 17 行は規則を書き写していない。**書き写したのは本 CR が新しく足した文だけであり、**新しい文を既存の行と同じ性質だと仮定したのが誤りだった。**
**教訓** —— **全数の表に行を足すときは、既存の行の性質ではなく、足す文そのものを 1.9 に当てて読む。**

### 8-3. コンポーネントグラフの検算（**反映後の `model.json` から直に読んだ**）

| 検査 | 予測 | **実測** |
|---|--:|--:|
| 節点 / 辺 | 33 / 71 | **33 / 71** |
| **外向きの辺（`LR-1` MUST NOT）** | 0 | **0 本** |
| **閉路（`LR-3` MUST）** | 0 | **0（非巡回）** |
| **`LR-4` 違反** | 0 | **0 本** |
| `SingleHtmlShell` の出次数 | 9 | **9** |
| クラスタ対の裏づけ（`framework → adapter`） | 14 | **14**（`build.py` の出力が `framework -> adapter 14`） |
| 新しいクラスタ対 | 0 | **0**（`build_overview` が落ちなかったことが裏づけ） |

#### ⭐ 着地（両方向）

```
edges after the fix : 71      landing entries : 71
direction 1  辺 → メンバ : 宣言の無い辺 0 ／ 実在しないメンバ 0 ／ 辺の無い対応 0
direction 2  メンバ → 辺 : 未到達メンバ 0（`Framework` の 7 部品を除く）
members declared : 80
RESULT: BOTH DIRECTIONS CLEAN
```

### 8-4. 実物を見た（`strictdoc export` と、書き出した SVG を数えた）

| 確認 | 予測 | **実測** |
|---|---|---|
| 表 T-107 の行数 | 18 | **`AM-1` 〜 `AM-18` が 18 行**（欠番なし） |
| 表 T-062 / T-063 / T-064 / T-065 の行数 | 33 / 5 / 33 / 8（不動） | **33 / 5 / 33 / 8** |
| 設計章に残る「17 メンバ」 | **0** | **0 件**（「18」が 4 箇所） |
| `dateAtX` が `PI-5` にあるか | あり | **あり** |
| `CP-22` からハンドルが消えたか | 消える | **消えた** |
| `CP-28` にハンドルが付いたか | 付く | **付いた** |
| **図 F-017 の辺** | **15 → 18** | **18 辺。**新しい 3 本のラベル `confirmed utterance` / `utterance posted` / `input` が SVG に出ている |
| 図 F-014 / F-015 / F-016 の辺 | 18 / 11 / 15（**不動**） | **18 / 11 / 15** |
| 図 F-013 のラベル | `drives / implements` | **SVG に出ている** |
| **`--embed-svg-fonts false` の罠** | `<image>` 0 個 | **5 枚とも 0 個。**全体図は **59,263 バイト**（罠を踏むと 578 KB になる） |

### 8-5. CR-125 §9 の 6 件はすべて閉じた

| # | 欠陥 | 何で閉じたか |
|--:|---|---|
| 1 | `Agent API` に発話を投げるメンバが無い | **`AM-18 postDialogueMessage`** |
| 2 | 人の発話が `DialogueLog` へ届く辺が無い | **`InputCommandTranslator → PostDialogueMessage`**（図 F-017 に出た） |
| 3 | 発話だけを投げたとき監視が起きる経路が無い | **`PostDialogueMessage → NotifyChangeWatchers`**（同上） |
| 4 | シェルの走行の辺が 3 本しかない | **6 本足して 9 本。**呼び手のいない公開メンバが 0 になった |
| 5 | `InputCommandTranslator → ScheduleLayout` が無い | **辺と `dateAtX`** |
| 6 | `CP-22` のハンドルと `LY-5` の食い違い | **`CP-22` から外し `CP-28` に明記** |

**新しく開いた論点は 0 件である。**
