# CR-123 — コンポーネント図を 5.2 へ畳み、図の原稿を `_assets/source/` へ移す

## 1. 変更概要

**`_assets/fig-components.md` は、本文から見て 2 段の遠回りになっている** ——
`05-07-design.md` → `_assets/fig-components.md` → `_assets/*.svg`。**読み手は図に着くまで 2 回飛ぶ。**

| # | 決めること | 置き場 |
|---|---|---|
| ① | **`fig-components.md` の本文を 5.2 の中へ畳み、`_assets/*.svg` を直に参照する** | `05-07-design.md` の 5.2 |
| ② | **`fig-components.md` を削除する。**あわせて `[LINK: DOC-FIG-COMPONENTS]` を外す | 同上 |
| ③ | **図の原稿と生成物と生成器を `docs/spec/_assets/source/` へ移す** | `model.json` / `overview.json` / `.drawio` 5 本 / `build.py` |
| ④ | **`build.py` の出力先を直す** —— `components.md` だけは `docs/review/components/` へ書く | `build.py` |

**ERD の 2 文書（`fig-erd-overview.md` / `fig-erd-detail.md`）は畳まない**（利用者判断。理由は §2-4）。

## 2. 変更の背景・目的

### 2-1. 畳んでも本文はほとんど伸びない

**`fig-components.md` は 65 行・2,606 バイトしかない**（自分で数えた）。
**中身は 5 枚のサムネイルリンク（`[![…](x.svg)](x.svg)`）と、各 1 〜 2 文の説明だけである。**

⚠️ **StrictDoc のガイドは「大きい図は別文書にする」と定めているが、その理由は「大きい図が本文の流れを分断する」ことである**
（`C:\StrictDocStarter\samples\md-basic-ja\00-ai-guide.md:594`）。
**サムネイルリンクは分断しない。**分断するのはインラインの mermaid である。**5.1 は 図 F-012（mermaid）を節の中に直に置いており、本 CR はその形に揃える。**

### 2-2. `_assets/source/` に置いたものは公開される（**実測した**）

**`docs/spec/_assets/source/` にプローブを 2 つ置いて書き出したところ、両方とも複製された** ——

```
html/spec/_assets/source/probe.json
html/spec/_assets/source/probe.drawio
```

**したがって `model.json`（21 KB）・`overview.json`（12 KB）・`.drawio` 5 本（68 KB）・`build.py`（6.7 KB）が公開される。**
**これは意図した結果である**（利用者判断・2026-08-15）—— **仕様書を受け取った人が、原稿から図を再生成できる。**

### 2-3. ⚠️ `_assets/source/` に `.md` を置いてはならない

**StrictDoc は `_assets/` の下位も走査して `.md` を文書として解析する。**
**一方、検査ハーネスの `specindex.discover()` は `docs/spec` と `docs/spec/_assets` の 2 つを `os.listdir` するだけで、再帰しない**（実装を読んだ。`specindex.py:31`）。

**つまり `_assets/source/*.md` は「export には文書として入るのに、機械検査が一度も読まない」状態になる。**
`SKILL.md` が同じ事故を記録している ——「a new asset file was reported green by checks 5–10 for a whole session
before anyone noticed they had never read it」。

**したがって `build.py` が書き出す `components.md`（部品表・11 KB）は `docs/review/components/` へ残す。**④はそのための変更である。

### 2-4. ERD の 2 文書を畳まない理由（**利用者判断**）

| 文書 | 規模 | 記法 | 判定 |
|---|--:|---|---|
| `fig-components.md` | **65 行 / 2.6 KB** | **SVG のサムネイルリンク** | ✅ **畳む** |
| `fig-erd-overview.md` | 129 行 / 7.7 KB | mermaid | ⛔ 畳まない |
| `fig-erd-detail.md` | **477 行 / 42 KB** | mermaid | ⛔ 畳まない |

⚠️ **mermaid はサムネイルにできない。**「**SVG はリンクにしてあるのでクリックで原寸が開く（mermaid にはできない利点）**」は実測済みの事実である。
**畳むと 6.2 の本文が 477 行分断される。**

## 3. 変更箇所

| # | 対象 | 中身 |
|---|---|---|
| 1 | `docs/spec/05-07-design.md` | 5.2 の冒頭 1 行を置換（`fig-components.md` への参照と `[LINK:]` を外す）＋ **末尾に図 5 枚と注記を足す** |
| 2 | `docs/spec/_assets/fig-components.md` | **削除** |
| 3 | `docs/review/components/{model.json, overview.json, *.drawio, build.py}` | **`docs/spec/_assets/source/` へ移動**（`git mv`） |
| 4 | `docs/spec/_assets/source/build.py` | `HERE` 基準のパスを直す。`components.md` の出力先だけ `docs/review/components/` にする |

⚠️ **`.svg` 5 本は動かさない。**`docs/spec/_assets/` のままである。**参照する側のパスが `fig-components.svg` から `_assets/fig-components.svg` へ変わるだけである。**

⚠️ **変更しないもの** —— 表 T-060 / T-061 / T-062 ／ 5.1 の本文 ／ ERD の 2 文書 ／ 用語辞書 ／ 設定値 ／
`A-appendix.md` の変更履歴（記録である。§6-2 に断りを置く）。

⚠️ **②は①と同時に行う必要がある。** **`[LINK:]` の宛先が消えると export が止まる** ——
`error: DocumentIndex: the inline link references an object with an UID that does not exist: DOC-FIG-COMPONENTS.`

## 4. 変更前の仕様

`docs/spec/_assets/fig-components.md` の全 65 行と、`05-07-design.md:78` の 1 行 ——

```
**部品を 表 T-062 に、全体を 図 F-013 に、経路ごとの詳細を 図 F-014 〜 図 F-017 に示す**（`_assets/fig-components.md`）。層の定義と依存の規則は 5.1 が持つ。 → [LINK: DOC-FIG-COMPONENTS]
```

## 5. 変更後の仕様

### 5-1. 置換 A —— 5.2 の冒頭

```
**部品を 表 T-062 に、全体を 図 F-013 に、経路ごとの詳細を 図 F-014 〜 図 F-017 に示す。** 層の定義と依存の規則は 5.1 が持つ。
```

### 5-2. 追記 —— 5.2 の末尾（`R2.5` の断り書きの直後）

**`fig-components.md` の 5 節を、小節を作らずに並べる。**5.1 が 図 F-012 を節の中に直に置いているのと同じ形である。
**図の順は冒頭の 1 文と同じ（全体 → 書き込み → 読み取り → 出し入れ → 起動）。**

⚠️ **前方参照にならない。** 冒頭の 1 文が 図 F-013 〜 F-017 を指し、**同じ節の中で定義する。**
5.1 が 図 F-012 について同じ形を採っており、検査 5 と 検査 15 は緑である。

### 5-3. `build.py` のパス

| 定数 | 前 | 後 |
|---|---|---|
| `HERE` | `docs/review/components` | **`docs/spec/_assets/source`** |
| `MODEL` / `OVERVIEW` / `.drawio` | `HERE/…` | **`HERE/…`（変わらない）** |
| `ASSETS`（`.svg` の出力先） | `HERE/../../spec/_assets` | **`HERE/..`** |
| **`components.md` の出力先** | `HERE/components.md` | ⭐ **`HERE/../../../review/components/components.md`** |
| Usage 行 | `python docs/review/components/build.py` | **`python docs/spec/_assets/source/build.py`** |

## 6. 影響反映と影響分析結果

### 6-1. 席番号

**本 CR は新しい席を 1 つも採らない。** 表・図・行 ID・要求 `UID` のいずれも新設しない。
**図 F-013 〜 F-017 は席を保ったまま、定義される文書だけが変わる。**

### 6-2. 確かめたこと

| 対象 | 何を確かめたか |
|---|---|
| **`fig-components.md` を指している箇所** | **2 件だけ**（自分で数えた）—— `05-07-design.md:78`（①②で消える）と `A-appendix.md:43`（**変更履歴の記録**） |
| ⚠️ **`A-appendix.md:43`** | 版 0.15 の記録が `_assets/fig-components.md` と `docs/review/components/model.json` を名指ししている。**どちらも本 CR で場所が変わる。** ⚠️ **記録は書き換えない**（CR-118 §8-2 と同じ扱い）。**移動した事実は変更履歴の次の行が引き受ける** |
| **`.png`** | **1 つも存在しない**（`build.py` のコメントが手順を書いているだけ）。移すものは無い |
| **`components.md`** | `# gr-scheduler components` の見出しを持つが `**UID**:` を持たない。**`_assets/` の下へ移すと文書として解析されるので移さない**（§2-3） |
| **`__pycache__`** | `build.py` はスクリプトとして実行され、標準ライブラリしか import しない。**`_assets/source/` に `__pycache__` は生まれない** |
| **`strictdoc_config.py`** | StrictDoc が読むのは**入力フォルダ直下の 1 つだけ**である。`_assets/source/build.py` は解釈されず、複製されるだけである |
| **`docs/review/components/`** | 移動後に残るのは `components.md` 1 つだけになる |

### 6-3. 機械検査

**反映前の実測** —— `ALL GREEN` ／ `tables=97 figures=9 rows=1112 uids=141` ／ ゲート 13 本すべて緑 ／ 助言 13 が 4・14 が 18。

#### 反映したときに動くはずの値（**予測**）

| 指標 | 反映前 | 反映後の予測 | 根拠 |
|---|--:|--:|---|
| **`figures`** | **9** | **9（動かない）** | ⚠️ **図 F-013 〜 F-017 は席を保ち、定義される文書が変わるだけである。動いたら取り違えている** |
| `tables` / `rows` / `uids` | 97 / 1112 / 141 | **動かない** | 表も行も `UID` も増減しない |
| **`DOCUMENT` ノード** | **9** | **8** | `fig-components.md` を削除する |
| **`SECTION` ノード** | — | **−5** | `fig-components.md` の 5 節が消え、5.2 の中には小節を作らない |
| ノード数（`FUNC_REQ` ほか） | 98 / 7 / 13 / 14 | **動かない** | 要求を新設も廃止もしない |
| ゲート 12 | 0 | **0** | 値・名前の表に触れない |
| 助言 13 / 14 | 4 / 18 | **4 / 18** | 数値も「規則は ⋯」の形も足さない |
| **検査の対象ファイル** | **9** | **8** | `specindex.discover()` は `docs/spec` と `docs/spec/_assets` を見る。⚠️ **`_assets/source/` は再帰しないので数えられない**（§2-3。だから `.md` を置かない） |
| **書き出しの `[LINK:]` 由来のリンク** | 3 | **2** | `DOC-FIG-COMPONENTS` への 1 本が消える |

## 7. 最終判断日時

**2026-08-15**（利用者判断 —— **`_assets` 内の `.md` からさらに別のファイルを引用するのをやめる** ／
**`fig-components.md` の本文を `05-07-design.md` へ移し、そこから `_assets` の各 `.svg` を参照する** ／
**原稿の JSON と生成した `.drawio` を `_assets/source/` に入れる** ／ **`build.py` も一緒に移す** ／
**`_assets/source/` が公開されることを承知する** ／ **ERD の 2 文書は畳まない**）

**採らなかった案**

| 案 | 採らなかった理由 |
|---|---|
| **ERD の 2 文書も畳む** | `fig-erd-detail.md` は 477 行の mermaid で、**mermaid はサムネイルにできない。**6.2 の本文が分断される（§2-4） |
| **ERD を SVG にしてから畳む** | 見た目と扱いは全図で揃うが、**ERD の生成器（`docs/review/erd/`）を書き直す大きめの作業になる。**本 CR の範囲を超える |
| **`build.py` を `docs/review/components/` に残す** | 原稿と生成器が離れる。**利用者は「原稿と生成器が同じ場所に揃う」ほうを採った** |
| **`components.md` も `_assets/source/` へ移す** | ⛔ **不可。**StrictDoc は文書として解析するのに、機械検査は再帰しないので読まない（§2-3） |
| **`.svg` も `_assets/source/` へ移す** | `.svg` は仕様書が本文で参照する成果物であって原稿ではない。**`_assets/` 直下が正しい置き場である** |

## 8. 反映記録（2026-08-15）

**①〜④をすべて当てた。**移動は `git mv` で行い、`build.py` を新しい場所から実行して図を再生成した。

### 8-1. §6-3 の予測と実測

| 指標 | 予測 | **実測** | 判定 |
|---|--:|--:|---|
| **`figures`** | **9（不動）** | **9** | ✅ **図 F-013 〜 F-017 は席を保った** |
| `tables` | 97（不動） | **97** | ✅ |
| `rows` | 1112（不動） | **1112** | ✅ |
| **`uids`** | **141（不動）** | **140** | ⛔ **外れた**（下記） |
| **`DOCUMENT` ノード** | **9 → 8** | **8** | ✅ |
| **`SECTION` ノード** | **−5** | **73 → 68** | ✅ |
| ノード数（`FUNC_REQ` / `GOAL` / `NON_FUNC_REQ` / `USE_CASE`） | 不動 | **98 / 7 / 13 / 14** | ✅ |
| ゲート 12 | 0 | **0** | ✅ |
| 助言 13 / 14 | 4 / 18 | **4 / 18** | ✅ |
| ゲート 13 本（1 〜 12 と 15） | 緑 | **すべて緑** | ✅ |
| 検査の対象ファイル | 9 → 8 | **8** | ✅ |
| 書き出しの `[LINK:]` 由来のリンク | 3 → 2 | **2** | ✅ |

### 8-2. ⛔ `uids` の予測が外れた理由（**事実として残す**）

**§6-3 は「要求を新設も廃止もしないので `uids` は動かない」と予測した。実測は 141 → 140 だった。**

**原因** —— **`uids` は要求の `UID` だけを数えているのではない。文書の `UID` も数えている。**
**削除した `fig-components.md` は `**UID**: DOC-FIG-COMPONENTS` を持っていた**（`git show HEAD:` で確かめた）。

⚠️ **教訓** —— **`uids` が動くかどうかを「要求を増減したか」で判断してはならない。**
**`**UID**:` の行を増減したかで判断する。**文書の `UID` も `DOC-` 接頭辞のまま同じ数えに入る。

### 8-3. 実物で確かめた

**`error` 行は 0。**

| 確認 | 実測 |
|---|---|
| **図 5 枚** | **5 枚とも `naturalWidth > 0`。**`_assets/fig-components.svg` は **3435 px**。**5 枚とも `<a href>` で原寸に繋がっている** |
| **図のパス** | `src="_assets/fig-components.svg"` ほか。**`05-07-design.md` から `_assets/` への 1 段の参照になった**（前は 2 段） |
| **`_assets/source/` の複製** | **8 ファイルすべて複製された**（`build.py` / `model.json` / `overview.json` / `.drawio` 5 本） |
| **`fig-components.html`** | **書き出しから消えた。**`_assets/` に残る `.html` は ERD 2 文書と用語辞書と設定値の 4 文書ぶんだけである |
| **文書一覧** | 「設計 — コンポーネント」が消え、図は 5.2 の中にある |
| **リテラルの `[LINK:`** | **0 件**（宛先が消えた 1 本を同時に外したので export が止まらなかった） |
| **連続する空行** | **0 件**（挿入前に機械照合した） |

### 8-4. `build.py` の出力先（**新しい場所から実行して確かめた**）

| 出力 | 行き先 | 実測 |
|---|---|---|
| `.svg` 5 本 | `docs/spec/_assets/` | ✅ **5 本とも出た**（`fig-components.svg` は 59,177 バイト） |
| `.drawio` 5 本・`overview.json` | `docs/spec/_assets/source/` | ✅ |
| **`components.md`** | ⭐ **`docs/review/components/`** | ✅ **`_assets/` の下に落ちていない**（§2-3 の穴を避けた） |

**移動後、`docs/review/components/` に残るのは `components.md` 1 つだけである。**
