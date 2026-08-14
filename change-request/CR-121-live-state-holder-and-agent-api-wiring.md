# CR-121 — 現在値の保持者を宣言し、`Agent API` の 17 メンバに支えを与える

## 1. 変更概要

**CR-120 が `Agent API` の面を宣言したことで、初めて検算できるようになった** —— **17 メンバのうち 10 件が、コンポーネントモデルに支えを持たない。**

| # | 決めること | 置き場 |
|---|---|---|
| ① | **現在値の保持者は `SingleHtmlShell` である**と宣言する | 表 T-060 の `LY-5` |
| ② | **文書に保存しない実行時の値の型を `documentModel` が持つ**と明記し、`Selection`（`CP-32`）と `DialogueLog`（`CP-33`）を足す | 表 T-060 の `LY-1` ／ 表 T-062 |
| ③ | **7 本目 `SnapshotSource`（`AgentApiEndpoint` が宣言）と 8 本目 `AppShellSource`（`DocumentCodec` が宣言）を足す。**どちらも `SingleHtmlShell` が実装する | 表 T-062 の `CP-17` / `CP-20` / `CP-25` |
| ④ | **`DocumentCodec` が `IO-7`（単一 `.html`）も持つ** | 表 T-062 の `CP-20` |
| ⑤ | ⚠️ **1 概念 2 語を潰す** —— `PostChatMessage` → `PostDialogueMessage` ／ `readChatMessages` → `readDialogueMessages` | 表 T-062 の `CP-16` ／ 表 T-107 の `AM-6` |
| ⑥ | **`model.json` に辺を 15 本足し、図を再生成する** | `docs/review/components/` |

**表も図も要求 `UID` も新設しない。行が 2 本増えるだけである。**

## 2. 変更の背景・目的

### 2-1. グラフで調べた（利用者指示・2026-08-15）

**閉路を成す依存を 1 か所ずつ直すと収束しないので、閉路の全体を 1 パスで書く。**そのために 2 つのグラフを実測した。

#### A. 仕様の参照グラフ —— 誘導部分グラフで見る

**`graph.py --cycles` が返す全体の最大 SCC は 206 個で、計画には使えない**（`SKILL.md` が「the 180-member whole-graph cycle is useless for this; the induced one is actionable」と定めている）。
**本 CR が触る 65 個に誘導した部分グラフ**（辺 85 本）を Tarjan に掛けると、**閉路は 3 つ、すべて 2 個**だった。

| 閉路 | 掛かるメンバ | 判定 |
|---|---|---|
| **`AG-2` ↔ `FR-063`** | `AM-4 readStamp` | **規約どおりの 2-閉路**（規則の持ち主と、それを指す側）。**壊れていない** |
| **`FR-025` ↔ `FR-080`** | `AM-13 exportSvg` / `AM-14 exportPng` | 同上 |
| **`AG-11` ↔ `AG-6`** | `AM-6` / `AM-17 watchChanges` | 同上 |

⚠️ **3 つより大きい閉路は無く、3 つとも `SKILL.md` の言う「規約そのものである 2-閉路」である。**
**したがって本 CR は要求の本文を 1 文字も変えない。** 閉路が定めたのは**編集の束ではなく、突き合わせて読む束**である ——
**6 本の原文を 3 束として読み、設計がそれらと矛盾しないことを確かめた**（§6-2）。

#### B. コンポーネントグラフ —— `LR-3`（MUST）を実測する

| | 現状 | 本 CR 適用後 |
|---|--:|--:|
| 節点 / 辺 | 31 / 47 | **33 / 62** |
| **閉路** | **0** | **0（非巡回のまま）** |
| 層内の辺とその閉路 | 14 / **0** | **17 / 0** |
| **外向きの辺（`LR-1` 違反）** | 0 | **0** |
| `AgentApiEndpoint` の到達 | **14 / 31** | **20 / 33** |

**新規 15 辺の内訳** —— `adapter→documentModel` 7 ／ `adapter→adapter` 3 ／ `usecase→documentModel` 2 ／
`adapter→layoutEngine` 1 ／ `layoutEngine→documentModel` 1 ／ `framework→adapter` 1。**すべて内向きか層内である。**

### 2-2. 支えの無い 10 メンバ（**実測**）

**`AgentApiEndpoint` が出す辺は 3 本しかない**（`ApplyDocumentChange` / `NotifyChangeWatchers` / `PostChatMessage`）。
**2 手先まで辿っても `Schedule`・`DocumentSettings`・`DocumentCodec`・`SvgRenderer`・`ImageExporter`・`ScheduleLayout` には一度も届かない。**

| 支えの無いメンバ | 足りないもの |
|---|---|
| `AM-3` `AM-4` | 現在の文書と刻印を得る道 |
| `AM-5` | ⚠️ **選択の持ち主が仕様書のどこにも無い**（表 T-056 の 18 エンティティにも、表 T-203「画面の状態」にも 0 件。自分で数えた） |
| `AM-6` | ⚠️ **確定した発話の持ち主が居ない。**`CP-16` は「配る」であって「持つ」ではない |
| `AM-11` 〜 `AM-14` | `DocumentCodec` / `SvgRenderer` / `ImageExporter` への道 |
| `AM-15` | ⚠️ **層の問題。**本体を同梱した `.html` を作れるのは `Framework` だが、`Adapter → Framework` は `LR-1` が禁じている |
| `AM-16` | `ScheduleLayout` への道 |

### 2-3. 10 件は 3 つの決定に畳める —— **引くのは `Agent API` だけだから**

**現在の状態を「引きに行く」必要がある部品は `AgentApiEndpoint` だけである。**
ほかはすべてシェルのフレーム走行が呼び、**値を引数で受け取る**（5.1 が「画面の寸法は引数として受け取る」と既に書いている形である）。
**`AgentApiEndpoint` だけが外から非同期に呼ばれ、シェルの走行に乗っていない。**

### 2-4. 決定① 現在値の保持者 —— **仕様書が既に答えを持っていた**

**層ごとに消していくと 1 つしか残らない。**

| 層 | 持てるか | 原文 |
|---|:--:|---|
| `Entity` | ⛔ | `LY-1` / `LY-2` が**すべて `pure`** と定めている |
| `UseCase` | ⛔ | `LY-3` が「**操作と検証は `pure`**、確定と通知は `non-pure`」と定めている |
| `Adapter` | ⛔ | `LY-4` は「変換」と「**外側の道具**を使うためのインターフェースの宣言」。文書は外側の道具ではない |
| **`Framework`** | ✅ | `LY-5` が「**単一 `.html` のシェル**」を置くと定めている |

⚠️ **`ApplyDocumentChange` を保持者にする案は採らない。** 理由は 2 つある ——

1. **`LY-3` が「操作と検証は `pure`」と定めている。可変の現在値を抱えた部品は `pure` になり得ない。** 道は最初から閉じている
2. **`R2.2`（SRP・MUST）** —— 「書き込みの手順」と「現在値の保持」は変更理由が別である

**`model.json` は既にそう書いていた** —— `SingleHtmlShell` の説明は「**holds the embedded-document slot**」である。**宣言されていなかっただけである。**
これは `R7.9`（SHOULD）が名指しする **functional core / imperative shell** そのものである。

### 2-5. 決定② 実行時の値 —— **`EditHistory` が完全な先例である**

**`EditHistory`（`CP-4`）は `documentModel` にありながら、表 T-056 の 18 エンティティに入っていない。**
**つまり「文書に保存しない値の型」を `documentModel` に置く形が、既に 1 件動いている。**

| | 型（`pure`・不変。`documentModel`） | 現在値（`non-pure`。シェル） |
|---|---|---|
| 文書 | `Schedule` / `DocumentSettings` / `DocumentStamp` | シェル |
| 取り消し | `EditHistory`（**保存しない**） | シェル |
| **選択** | **`Selection`（`CP-32`・新設）** | シェル |
| **発話** | **`DialogueLog`（`CP-33`・新設）** | シェル |

**採らなかった案（`InputCommandTranslator` と `PostChatMessage` に持たせる）の落ちる理由を 2 つ確かめた** ——

| # | 原文 | 何が起きるか |
|--:|---|---|
| 1 | 表 T-023c の `SL-8`「**選択されていることを、色以外の手掛かりでも示すこと（MUST）**」 | **描画が選択を読む。**案 B では `SvgRenderer → InputCommandTranslator` という層内の辺ができ、**描画が入力に依存する** |
| 2 | `R2.2`（SRP・**MUST**） | `PostChatMessage` は動詞句の `UseCase` である。「配る」と「持つ」で **2 責務**になる |

⚠️ **`Selection` は名前を発明しない。** **用語辞書の `U-39` が既に確定名として持っている** ——
「`Selection`｜**選択**。既にある対象を選ぶこと、**およびその集合**。描画領域の規則は表 T-023c、行の規則は `FR-085` が持つ」。
**部品名はこの確定名をそのまま使う。**

⚠️ **引っかかりを 1 つ申告する。** `documentModel` という名は「文書のモデル」であり、**選択は文書のデータではない。**
ただし `EditHistory` が既に同じ立場でそこに居るので、**`LY-1` の文言を伸ばすのが最小の変更である。**
**第 3 の下位クラスタを作ると 5.1 の層の割り方そのものを変えることになる**（採らない）。

### 2-6. 決定③ `LR-1` を破らずに引く —— **`LR-5` の形をもう一度使う**

**`LR-5` の原文** ——

> **外側の道具は、内側が宣言したインターフェースを介して使うこと（MUST）。その実装は外側の層が持つこと（MUST）** —— これがあるので `LR-1` に例外が要らない

**既に 6 本ある**（`SvgSurface` / `InputSource` / `FileStore` / `DocumentStore` / `Clipboard` / `Rasterizer`）。**同じ形を 2 本足す。**

| 本 | 名前 | 宣言する部品 | 実装する部品 | 何を供給するか |
|--:|---|---|---|---|
| **7** | **`SnapshotSource`** | `AgentApiEndpoint`（`CP-17`） | `SingleHtmlShell`（`CP-25`） | **凍結された現在値**（文書・選択・発話・身振りの最中か）。`AG-4` の「凍結された複製」と `AG-9` の判定に要る |
| **8** | **`AppShellSource`** | `DocumentCodec`（`CP-20`） | `SingleHtmlShell`（`CP-25`） | **アプリ自身の HTML**。`IO-7` を作るのに要る |

⚠️ **「押し込む」案は採らなかった。** シェルが確定のたびに `AgentApiEndpoint` へ渡す形は、辺もインターフェースも増えないが、
**`AgentApiEndpoint` が複写を持つことになり、`R2.20`（MUST）の「何をキャッシュするか・無効化の契機・許容する陳腐化・同時失効時の挙動」を
Chapter 5.6 の ADR に書く必要が生まれる。** **引けば正が 1 つに留まり、複写そのものが存在しない**（利用者判断・2026-08-15）。

### 2-7. 決定④ `IO-7` の持ち主 —— **5.2 の分割基準がそのまま決める**

**5.2 の原文** ——

> **同じ表・同じ要求が寸法と規則を持っているなら 1 部品、別々の要求が持っているなら別部品とする。**

**`DocumentCodec` は既に `IO-1`（MSPDI）と `IO-2`（JSON）を持ち、`IO-7` は同じ 表 T-024 のもう 1 行である。**
**32 個目の部品を立てると、1 つの表が 2 部品に割れて基準に反する。**

### 2-8. 決定⑤ **1 概念 2 語を潰す（2 か所）**

**用語辞書の確定名は `Dialogue Field`（`U-44`・対話欄）である。** ところが同じ概念に「Chat」という 2 つ目の語が入っている。

| # | 現在 | 誰が入れたか |
|--:|---|---|
| 1 | `PostChatMessage`（`CP-16`） | **Chapter 5.2**（2026-08-15 より前） |
| 2 | `readChatMessages`（`AM-6`） | **CR-120**（本セッション。1 を引き継いだ） |

**1.9 の原文**（`:292`）—— 「**モデルの語彙に一本化する（MUST）。**⋯ **1 つの概念には 1 つの語しか与えない。**」

⚠️ **これは CR-120 の欠陥でもある。** **語幹を確定名 `Dialogue` に揃える** ——
`PostChatMessage` → **`PostDialogueMessage`** ／ `readChatMessages` → **`readDialogueMessages`**。

⚠️ **`DialogueLog` は `changeLog`（`ET-17`）と別物である。** 前者は PascalCase の型（`W-1`）で語幹は `dialogue`、
後者は camelCase の JSON 鍵（`W-2`）で語幹は `change`。**記法も語幹も違うので衝突しない。**

## 3. 変更箇所

| # | ファイル | 対象 | 行の増減 |
|---|---|---|--:|
| 1 | `docs/spec/05-07-design.md` | 表 T-060 の `LY-1` / `LY-5` —— **各 1 行を 1 行で置換** | 0 |
| 2 | `docs/spec/05-07-design.md` | 表 T-062 の `CP-16` / `CP-17` / `CP-20` / `CP-25` —— **各 1 行を 1 行で置換** | 0 |
| 3 | `docs/spec/05-07-design.md` | 表 T-062 の `CP-31` の直後に `CP-32` / `CP-33` を足す | **＋2** |
| 4 | `docs/spec/_assets/tbl-glossary.md` | 表 T-107 の `AM-6` —— **1 行を 1 行で置換** | 0 |
| 5 | `docs/review/components/model.json` | 節点 ＋2・改名 1・辺 ＋15・ビュー更新 | — |
| 6 | `docs/spec/_assets/*.svg` ほか | **`python docs/review/components/build.py` で再生成。手で直さない** | — |

⚠️ **変更しないもの（読んだうえで、変えないと決めた）** —— **要求の本文はすべて**（`AG-2` / `AG-4` / `AG-6` / `AG-8` / `AG-9`
/ `AG-11` / `FR-025` / `FR-028` / `FR-063` / `FR-066` / `FR-067` / `FR-080` / `SL-1` / `SL-8` / 表 T-024 / 表 T-023c）／
表 T-061（`LR-1` 〜 `LR-6`）／ 表 T-060 の `LY-2` / `LY-3` / `LY-4` ／ 5.1 と 5.2 の本文 ／ 図 F-012。

⚠️ **表 T-062 の `CP-19`（`SvgRenderer`）と `CP-21`（`ImageExporter`）の行は変えない。** 辺が増えるだけで責務は動かない。

## 4. 変更前の仕様

```
| LY-1 | `Entity` / `documentModel` | 表 T-052 が定める文書ルートの 3 群すべて（日程データの群のエンティティは 表 T-056）と、その不変条件（全数は Chapter 6.1 が持つ）。取り消しの履歴（不変の値として持ち、丸ごと置き換える） | すべて `pure` |
| LY-5 | `Framework` | **`Adapter` が宣言したインターフェースの実装**（ブラウザの DOM・SVG・File System Access API・`localStorage` を使う）と、単一 `.html` のシェル | 外を読むものは `semi-pure-b`、残りは `non-pure` |
| CP-16 | `UseCase` | `PostChatMessage` | 確定した発話を配る。文書に保存しない | `FR-066` / 表 T-035 の `AG-11` |
| CP-17 | `Adapter` | `AgentApiEndpoint` | `Agent API` を設置する。既定で公開しない | `FR-028` / `FR-065` / 表 T-035 |
| CP-20 | `Adapter` | `DocumentCodec` | JSON と `MSPDI` を文書と相互変換する | `FR-024` / `FR-021` / `FR-056` / `FR-057` |
| CP-25 | `Framework` | `SingleHtmlShell` | 起動と結線。埋め込みの入れ物を持ち、公開点を置く | `FR-067` / `FR-065` |
| CP-31 | `Framework` | `CanvasRasterizer` | `Rasterizer` の実装 | `FR-025` |
| AM-6 | 読む | `readChatMessages` | 動詞＋目的語・`semi-pure-b` | 人が確定した発話。文書には保存されない | 表 T-035 の `AG-11` ／ `FR-066` |
```

## 5. 変更後の仕様

**リテラルの置換で示す。正規表現は使わない。置換元はいずれも `docs/spec` でちょうど 1 回だけ一致する（当てる直前に機械照合する）。**

```
| LY-1 | `Entity` / `documentModel` | 表 T-052 が定める文書ルートの 3 群すべて（日程データの群のエンティティは 表 T-056）と、その不変条件（全数は Chapter 6.1 が持つ）。および**文書に保存しない実行時の値**（取り消しの履歴・選択・確定した発話。いずれも不変の値として持ち、丸ごと置き換える） | すべて `pure` |
| LY-5 | `Framework` | **`Adapter` が宣言したインターフェースの実装**（ブラウザの DOM・SVG・File System Access API・`localStorage` を使う）と、単一 `.html` のシェル。**現在値を保持するのはこの層だけである** —— 内側の 3 層はすべて値を引数で受け取る | 外を読むものは `semi-pure-b`、残りは `non-pure` |
| CP-16 | `UseCase` | `PostDialogueMessage` | 確定した発話を `DialogueLog` へ積み、配る。文書に保存しない | `FR-066` / 表 T-035 の `AG-11` |
| CP-17 | `Adapter` | `AgentApiEndpoint` | `Agent API` を設置する。既定で公開しない。`SnapshotSource` を宣言する | `FR-028` / `FR-065` / 表 T-035 / 表 T-107 |
| CP-20 | `Adapter` | `DocumentCodec` | JSON・`MSPDI`・単一 `.html` を文書と相互変換する。`AppShellSource` を宣言する | `FR-024` / `FR-021` / `FR-056` / `FR-057` / `FR-067` |
| CP-25 | `Framework` | `SingleHtmlShell` | 起動と結線。**現在値を保持する。** 埋め込みの入れ物を持ち、公開点を置く。`SnapshotSource` と `AppShellSource` の実装 | `FR-067` / `FR-065` |
| CP-32 | `documentModel` | `Selection` | 選ばれている対象の集合と、選んだ順序。文書に保存しない | 表 T-023c の `SL-1` / `SL-7b` / `SL-8` |
| CP-33 | `documentModel` | `DialogueLog` | 確定した発話と、版数とは別の順序。文書に保存しない | `FR-066` / 表 T-035 の `AG-11` / `AG-6` |
| AM-6 | 読む | `readDialogueMessages` | 動詞＋目的語・`semi-pure-b` | 人が確定した発話。文書には保存されない | 表 T-035 の `AG-11` ／ `FR-066` |
```

### 5-1. `model.json` に足す辺 15 本

| # | 辺 | 向き | 何のために |
|--:|---|---|---|
| 1 | `AgentApiEndpoint → Schedule` | 内向き | `AM-3` |
| 2 | `AgentApiEndpoint → DocumentSettings` | 内向き | `AM-3` |
| 3 | `AgentApiEndpoint → DocumentStamp` | 内向き | `AM-4` |
| 4 | `AgentApiEndpoint → Selection` | 内向き | `AM-5` |
| 5 | `AgentApiEndpoint → DialogueLog` | 内向き | `AM-6` |
| 6 | `AgentApiEndpoint → DocumentCodec` | 層内 | `AM-11` `AM-12` `AM-15` |
| 7 | `AgentApiEndpoint → SvgRenderer` | 層内 | `AM-13` |
| 8 | `AgentApiEndpoint → ImageExporter` | 層内 | `AM-14` |
| 9 | `AgentApiEndpoint → ScheduleLayout` | 内向き | `AM-16` |
| 10 | `SvgRenderer → Selection` | 内向き | `SL-8`（選択を色以外でも示す） |
| 11 | `ScheduleGeometry → Selection` | 内向き | `S-111`（掴み点は選択中のタスクだけ） |
| 12 | `InputCommandTranslator → Selection` | 内向き | `SL-2` 〜 `SL-6`（選択を作り、広げ、解除する） |
| 13 | `PostDialogueMessage → DialogueLog` | 内向き | 発話を積む |
| 14 | `NotifyChangeWatchers → DialogueLog` | 内向き | `AG-6`（版数とは別の順序で選ぶ） |
| 15 | `SingleHtmlShell → DocumentCodec` | 内向き | `AppShellSource` の実装 |

**`SingleHtmlShell → AgentApiEndpoint` は既存の辺であり、ラベルに `SnapshotSource` の実装が乗る（辺は増えない）。**

## 6. 影響反映と影響分析結果

### 6-1. 席番号

| 席 | `docs/spec` での出現（**採る前に全数を検索した**） | 判定 |
|---|--:|---|
| `CP-32` / `CP-33` | **0** | 採れる |
| `Selection`（部品名） | **既に確定名**（`U-39`） | **発明しない。そのまま使う** |
| `DialogueLog` | **0** | 採れる |
| `SnapshotSource` / `AppShellSource` | **0 / 0** | 採れる |

| 種別 | 新設 | 実測 |
|---|--:|---|
| 表番号（`T-`） | **0** | 既存の表 T-060 / T-062 / T-107 に書くだけである |
| 図番号（`F-`） | **0** | 図 F-013 〜 F-017 は**再生成**であって新設ではない |
| 行 ID | **2** | `CP-32` / `CP-33` |
| 要求 `UID` | **0** | 要求を新設も廃止もしない |

### 6-2. 閉路 3 束の突き合わせ（**原文を 3 束として読んだ**）

| 束 | 原文 | 本 CR の設計と矛盾しないか |
|---|---|---|
| **`AG-2` ↔ `FR-063`** | `AG-2`「照合は刻印の 3 つすべてで行うこと（MUST）」／ `FR-063`「最後に書いた者と時刻は、見せ方の群だけを変えたときも更新すること（MUST）」 | ✅ **矛盾しない。** `AM-4 readStamp` が刻印 3 つを返し、`DocumentStamp`（`CP-3`）がその型を持つ。**本 CR は照合の規則に触れない** |
| **`FR-025` ↔ `FR-080`** | `FR-025`「表 T-024 の `IO-3`・`IO-4`・**`IO-6`** に従って出力し」／ `FR-080`「画面に見えているものと同じ絵を出す」 | ⚠️ **矛盾しない。ただし読んで分かったことが 1 つある** —— **`FR-025` は `IO-6`（クリップボード）も自分の対象と明記している。** CR-120 は `IO-6` を `Agent API` の面から外したが、**それは「機械には値で渡せるので経由する意味が無い」という判断であって、`FR-025` の担当範囲を狭めたのではない。**`ClipboardGateway`（`CP-24`）は今までどおり `IO-6` を持つ |
| **`AG-11` ↔ `AG-6`** | `AG-11`「監視は発話を版数とは別の順序で数えること（MUST）」／ `AG-6`「日程データの変更は版数で選び、確定した発話は版数に依らず選ぶ（MUST）」 | ✅ **矛盾しない。むしろ本 CR がこれを実装可能にする** —— **順序の持ち主が `DialogueLog`（`CP-33`）になり、`NotifyChangeWatchers → DialogueLog` の辺がそれを読む** |

### 6-3. `LR-1` と `LR-3` の検算（**手ではなく Tarjan で計算した**）

| 検査 | 結果 |
|---|---|
| **外向きの辺（`LR-1` MUST NOT）** | **0 本。**15 辺すべてが内向きか層内である |
| **全体の閉路（`LR-3` MUST）** | **0。**追加前も追加後も非巡回 |
| **層内の辺の閉路（`LR-3` MUST）** | 14 → 17 本に増えるが **閉路は 0 のまま** |
| **`LR-4`（`documentModel` が `layoutEngine` を知らない）** | ✅ 新規辺 11 番は `ScheduleGeometry → Selection`（`layoutEngine → documentModel`）で**正しい向き** |

### 6-4. 機械検査

**反映前の実測**（自分で走らせた。CR-117 〜 CR-120 を当てた後）——
`ALL GREEN` ／ `tables=97 figures=9 rows=1110 uids=141` ／ ゲート 13 本すべて緑 ／ 助言 13 が 4・14 が 18 ／ 重複 `A=17 (new 0)`。

#### 反映したときに動くはずの値（**予測**）

| 指標 | 反映前 | 反映後の予測 | 根拠 |
|---|--:|--:|---|
| **`rows`** | **1110** | **1112** | `CP-32` / `CP-33` で ＋2。他はすべて 1 行を 1 行で置換 |
| `tables` | 97 | **動かない** | 表を新設しない |
| **`figures`** | 9 | **動かない** | ⚠️ **図は再生成であって新設ではない。**動いたら取り違えている |
| `uids` | 141 | **動かない** | 要求を新設も廃止もしない |
| ノード数（`FUNC_REQ` ほか） | 98 / 7 / 13 / 14 | **動かない** | — |
| ゲート 12 | 0 | **0** | 足す 2 行に `（MUST）` / `（MUST NOT）` は無い |
| 助言 13 / 14 | 4 / 18 | **4 / 18** | 「規則は ⋯」の形も数値も足さない |

## 7. 最終判断日時

**2026-08-15**（利用者判断 —— **調査 → 計画 → 一括修正の順で進める** ／ **現在値は引く（7 本目のインターフェースを宣言する）**）

**採らなかった案**

| 案 | 採らなかった理由 |
|---|---|
| `ApplyDocumentChange` が現在値を保持する | `LY-3` が「操作と検証は `pure`」と定めており、可変の現在値と両立しない。`R2.2`（SRP・MUST）にも触れる（§2-4） |
| シェルが `AgentApiEndpoint` へ**押し込む** | 複写が生まれ、`R2.20`（MUST）の 4 点を 5.6 の ADR に書く必要が出る。**引けば複写そのものが存在しない**（§2-6） |
| 選択を `InputCommandTranslator` が、発話を `PostChatMessage` が持つ | `SL-8` により描画が選択を読むので `SvgRenderer → InputCommandTranslator` ができ、**描画が入力に依存する。**`PostChatMessage` は 2 責務になる（§2-5） |
| 選択を見せ方の群（`documentSettings`）に足す | `FR-024` が常に全項目を書き出すので**保存されてしまう。**`UN-9`（選択は取り消し対象外）と `FR-066`（会話を文書に保存してはならない・MUST NOT）に正面から反する |
| `IO-7` のために 32 個目の Adapter 部品を立てる | 1 つの表（表 T-024）が 2 部品に割れ、5.2 の分割基準に反する（§2-7） |
| `Entity` に第 3 の下位クラスタを作る | 5.1 の層の割り方そのものを変えることになる。`EditHistory` の先例に乗るほうが小さい（§2-5） |

## 8. 反映記録（2026-08-15）

**§5 の 8 置換を当て、`model.json` を書き換え、`build.py` で図を再生成した。**
**8 置換はいずれも当てる直前に「ちょうど 1 回一致」を機械照合し、1 件でも外れたら止まるようにして実行した**（全 8 件とも `matches=1`）。

### 8-1. §6-4 の予測と実測

| 指標 | 予測 | **実測** | 判定 |
|---|--:|--:|---|
| **`rows`** | **1112** | **1112** | ✅ |
| `tables` | 97（不動） | **97** | ✅ |
| **`figures`** | 9（**不動**。再生成であって新設ではない） | **9** | ✅ |
| `uids` | 141（不動） | **141** | ✅ |
| ノード数（`FUNC_REQ` ほか） | 98 / 7 / 13 / 14（不動） | **98 / 7 / 13 / 14** | ✅ |
| ゲート 12 | 0 | **0** | ✅ |
| 助言 13 / 14 | 4 / 18 | **4 / 18** | ✅ |
| ゲート 13 本（1 〜 12 と 15） | 緑 | **すべて緑** | ✅ |
| 重複検出（11） | — | `A=17 (new 0)`（**不動**） | ✅ |

**予測は全項目が的中した。**

### 8-2. コンポーネントグラフの検算（**反映後の `model.json` から直に読み、Tarjan に掛けた**）

| 検査 | 結果 |
|---|---|
| 節点 / 辺 | **33 / 62**（予測どおり） |
| クラスタに属さない節点 | **0**（`build.py` が入口で弾く条件） |
| **外向きの辺（`LR-1` MUST NOT）** | **0 本** |
| **全体の閉路（`LR-3` MUST）** | **0（非巡回）** |
| **層内の辺とその閉路（`LR-3` MUST）** | **17 本 / 閉路 0** |
| **`LR-4` 違反（`documentModel` → `layoutEngine`）** | **0 本** |
| `AgentApiEndpoint` の到達 | **20 / 33** |
| **17 メンバの支え** | ⭐ **`AM-1` / `AM-2`（ビルドの定数）を除く 15 メンバすべてに経路が通った。落ちるものは 0 件** |

### 8-3. 実物を見た（`location.reload(true)` を掛けた）

```bash
strictdoc export docs/spec --formats=html --output-dir scratch/spec-html-probe
```

| 確認 | 実測 |
|---|---|
| 表 T-062 の行数 | **`CP-` 行が 33**（HTML の DOM から数えた） |
| 表 T-060 の行数 | `LY-` 行が **5**（不動） |
| `PostChatMessage` の残存 | **0 件。**`PostDialogueMessage` に置き換わっている |
| `SnapshotSource` / `AppShellSource` | **各 2 回**（宣言する側と実装する側） |
| `LY-1` / `LY-5` の追記 | **どちらも本文に出ている** |
| **図 5 枚の読み込み** | **5 枚とも `naturalWidth > 0`。**全体図は **3435 × 1189** |
| **`--embed-svg-fonts false` の罠** | **`<image>` 要素は 5 枚とも 0 個。**全体図は **59,177 バイト**（罠を踏むと 578 KB になる） |
| **層の上下（利用者の要求「配置で CA が読める」）** | `Entity` **y=39** → `documentModel` **73** → `layoutEngine` **291** → `UseCase` **533** → `Adapter` **751** → `Framework` **969`。**内側の層ほど上にある** |
| 図の中の `Chat` の残骸 | **4 枚とも 0 件** |
| 新しい節点の露出 | `Selection` は F-014 / F-015 に、`DialogueLog` と `PostDialogueMessage` は F-017 に出ている |

### 8-4. ⚠️ CR-120 の欠陥を 1 件、本 CR で直した

**`readChatMessages`（`AM-6`）は、用語辞書の確定名 `Dialogue Field`（`U-44`）と同じ概念に 2 つ目の語を与えていた。**
**1.9（`:292`）の「1 つの概念には 1 つの語しか与えない」に反する。**

⚠️ **語源は CR-120 ではなく Chapter 5.2 である** —— `PostChatMessage`（`CP-16`）が先に「Chat」を持ち込んでおり、
**CR-120 はそれを引き継いだ。**⑤で 2 か所とも `Dialogue` に揃えた。**反映後、`docs/spec` の `Chat` は 0 件である。**
