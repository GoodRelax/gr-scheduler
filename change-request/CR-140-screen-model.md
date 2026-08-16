# CR-140 — 画面のモデルと、画面の面のコンポーネント

> ✅ **適用済みである（2026-08-16・版 0.34）。** 58 編集すべてを `count=1` で当て、§C の 6 手順を最後まで通した。
> **再び当ててはならない** —— もう一度走らせると全編集が `count=0` で当たらない。
>
> **当てた結果**（すべて実測で取り直した）:
>
> | 手順 | 結果 |
> |---|---|
> | 1) 58 編集 | **全部 `count=1`。**予測どおり 1 本も外れなかった |
> | 2) `model.json` | JSON として読める。**ノード 38・辺 86** |
> | 3) `build.py` | ⭐ **通った。**F-2 の懸念は起きず、**ラベル文字列も候補位置も足さずに済んだ**（図 F-015 は `outer presentation@0.40` を 1 つ動かしただけ）。5 図と `components.md`（38 ノード・86 辺）を作り直した |
> | 4) `audit-ch5.py` | **RESULT: PASS** |
> | 5) `check.sh` | **ALL GREEN。**`tables=112` `figures=10` `rows=1314` `uids=140`、検査 5-10・15・12 が 0、助言 13/14 は 4/18 で増減なし、`FR` の欠番は 50 だけ |
> | 6) 刊行物 | `check-render.py` **PASS**（生の `**` は 0、設計の表 18/18・図 7/7）。⭐ **図 F-015 と F-017 を draw.io CLI で PNG に落として目で確かめ、新しい札が全部読めることを見た** |
>
> **独立に数え直した値**（本書を鵜呑みにせず取り直した）: 表 T-060 = 5 ／ T-062 = 38 ／ T-063 = 7 ／ T-064 = 38 ／ T-065 = 9 ／ T-070 = 8 ／ T-071 = 4 ／ T-074 = 3 ／ T-075 = 71 ／ T-103 = 52。**辺の重複 0・閉路 0・クラスタ対 9（増減なし）・外向き 0。** 設計に「8 本」は 0 件、数としての「34」も 0 件。「8 ファイル」の残り 2 件は `EditDocument` の集約で、触っていない。
>
> ⚠️ **`ScreenState` の `shape` は `component` のまま当てた**（§F-1）。**利用者の判断は未了である** —— `rectangle` に揃えるなら 編集 46 の 1 語を変えて `build.py` を走らせ直すだけでよい。

## 1. 何をするか

**画面のモデルを `Entity` に置く。第 3 の小層は作らない。**

| | 層 | 名前 | 何を |
|---|---|---|---|
| `CP-35` | `layoutEngine` | `ScreenRegions` | 画面の各部の矩形。**書き出しと画面の両方が通る** |
| `CP-36` | `documentModel` | `ScreenState` | 保存しない画面の値（構え・開いている面・パレット・全画面）。**画面専用** |
| `CP-37` | `Adapter` | `ScreenRenderer` | 日程表の外側の UI パーツを組み立て、対話欄で確定した発話を渡す |
| `CP-38` | `Framework` | `DomScreenSurface` | `ScreenSurface` の実装 |
| `IF-9` | — | `ScreenSurface` | 層をまたぐ 9 本目 |

**34 → 38 コンポーネント ／ 57 → 71 ユニット ／ 8 → 9 本。要求は 1 本も足さない。新しい表も作らない。**

## 2. 利用者が決めたこと

| | |
|---|---|
| 置き場 | **`Entity`。**「仮にデスクトップアプリになっても必要だろ？」 |
| 構成 | ⭐ **2 つに割って既存の小層へ**（第 3 の小層を作らない） |
| 根拠 | 書き出しが文書だけの純粋関数になり、**書き出しが通る部品と画面にしか要らない部品が、2 小層の境目で分かれた** |
| AI | **要求文を 1 文字も足さない** —— `XO-4` / `FR-066` / `AM-6` / `AM-18` / `AG-11` が既に持つ |
| 発話 | **中身を作るのは AI。**GRS は API とチャット UI を持つだけ |

## 3. グラフによる影響調査（本セッションで実測）

| 対象 | 指している要求 | 参照 |
|---|--:|--:|
| 表 T-062 | **0 件** | 5 箇所（5.2 / 5.3 ×6 / 5.4 / 5.6 / A.3） |
| 表 T-060 | **0 件** | 5 箇所 |

**どちらも要求から指されていない。**動くのは Chapter 5 の中と、原稿・生成物・検査の道具である。

## 4. 検証の状態

| | |
|---|---|
| BEFORE の逐語検査 | ⭐ **58 編集すべて `count=1`** |
| ⭐ **模擬適用** | scratchpad の写しに 58 編集すべてを当て、**`audit-ch5.py` が PASS**。検査 5-10・15・12 も改定前と同数 |
| 草案から直した | **6 件**（§E） |
| 草案から落とした | **2 件**（§D。`R7.9` 違反になるため） |
| `shape` の判断 | ⭐ **`component` で確定。**原稿を数えたところ `component` 32 / `rectangle` 2 で、同じ性質の `EditHistory` も `component`。外れ値は `rectangle` の 2 つのほう |

⚠️ **`Selection` と `DialogueLog` だけが `rectangle` である。**揃えるかは別件として残す。

---

# CR-140 — 当てられる編集一覧（58 編集・全数取り直し済み）

## 0. 検証の結果

**草案の引用は全数を取り直した。CR-137・CR-138・CR-139 は当てる 5 ファイルのうち 3 つに 1 文字も触れておらず、草案が前提していた「05-07-design.md / model.json / audit-ch5.py は無傷」は実測でも裏づいた。**

| 事項 | 結果 |
|---|---|
| BEFORE の逐語検査 | **58 編集すべて count=1。**0 件も 2 件以上も無い |
| 05-07-design.md の最終コミット | `3a2ed2f`（CR-136）。CR-137 `2bbcb33` / CR-138 `c720780` / CR-139 `37e31a4` はいずれも触れていない |
| model.json / audit-ch5.py | 同上。無傷 |
| 模擬適用 | scratchpad の写しに **58 編集すべてを count=1 で適用できた** |
| `audit-ch5.py`（改定後） | **RESULT: PASS** |
| `md-checks.py`（検査 5・6・7・8・9・10・15） | **全部 0**（改定前と同じ） |
| `style-checks.py` | 検査 12（ゲート）**0**、助言 13 が 4、14 が 18 —— **改定前と完全に同数** |

**草案から直したものが 6 件ある**（§6 に理由）。**落としたものが 2 件ある**（草案 編集 8・9）。

---

# A. 当てる順の編集一覧

⚠️ **ファイルごとにまとめ、各ファイルの中は行番号の降順にした。**こうすると **先に当てた編集が後の行番号をずらさない**ので、ここに書いた行番号は最後まで有効である。同じ行を 2 度開く編集は 1 本も無い。

---

## ファイル 1 —— `docs/spec/05-07-design.md`（編集 1 〜 35）

### 編集 1 — `CA-1` の 2 つ → 3 つ、片方 → 1 つ
**場所**: `docs/spec/05-07-design.md:578`（表 T-071 `CA-4`）
**いま**:
```
| CA-4 | 同時失効時の挙動 | **同時に失効する複数のキャッシュを持たない。** 持ち主は `SingleHtmlShell` ただ 1 つで、`CA-1` の 2 つは同じ契機で同時に作り直される。**片方だけが古いという状態を作ってはならない（MUST NOT）** |
```
**こうする**:
```
| CA-4 | 同時失効時の挙動 | **同時に失効する複数のキャッシュを持たない。** 持ち主は `SingleHtmlShell` ただ 1 つで、`CA-1` の 3 つは同じ契機で同時に作り直される。**1 つだけが古いという状態を作ってはならない（MUST NOT）** |
```
**理由**: 編集 2 で `CA-1` が 3 つになるので、数と「片方」が両方合わなくなる。1 行に 2 か所あるので 1 本に畳んだ。

### 編集 2 — キャッシュする値に `ScreenRegions` を足す
**場所**: `:575`（表 T-071 `CA-1`）
**いま**:
```
| CA-1 | 何をキャッシュするか | **そのフレームの `ScheduleLayout` と `ScheduleGeometry`**（表 T-068 の結果）。⚠️ **文書そのものはキャッシュではない** —— 現在値であり、持ち主は `LY-5` が定めている |
```
**こうする**:
```
| CA-1 | 何をキャッシュするか | **そのフレームの `ScreenRegions` と `ScheduleLayout` と `ScheduleGeometry`**（後の 2 つは 表 T-068 の結果）。⚠️ **文書そのものはキャッシュではない** —— 現在値であり、持ち主は `LY-5` が定めている |
```
**理由**: `ScreenRegions` は 表 T-068 の結果ではないので、「表 T-068 の結果」の射程を後の 2 つに限る必要がある。

### 編集 3 — ADR-001 Consequences の辺 2 本 → 3 本
**場所**: `:569`
**いま**:
```
**Consequences** —— `Framework` から `layoutEngine` への辺が 2 本増えた。
```
**こうする**:
```
**Consequences** —— `Framework` から `layoutEngine` への辺が 3 本増えた。
```
**理由**: model.json 実測で今 2 本、`SingleHtmlShell → ScreenRegions` を足して 3 本。以降（クラスタ対 1 つ・図 F-015 にシェル・純粋関数のまま）は据え置きで真のまま。

### 編集 4 — ADR-001 の題に「画面の矩形」を足す
**場所**: `:561`
**いま**:
```
**ADR-001 — レイアウトと幾何をフレーム先頭で 1 回だけ計算する**
```
**こうする**:
```
**ADR-001 — 画面の矩形とレイアウトと幾何をフレーム先頭で 1 回だけ計算する**
```
**理由**: 編集 2 で `CA-1` に `ScreenRegions` が入る以上、題が 3 つ目を掲げないと ADR とキャッシュ表が食い違う。

### 編集 5 — `MN-7` と `MN-8` を表 T-070 の末尾に足す
**場所**: `:558-559`（表 T-070 の末尾。**直前の空行を含めて掴む**）
**いま**（空行 ＋ 次の 1 行）:
```

**`R2.20`（MUST）が、キャッシュを用いる場合に 4 点を本節の ADR に置くことを求めている。**
```
**こうする**:
```
| MN-7 | ⭐ **画面のモデルを `Entity` に置いた**（`CP-35` / `CP-36`） | 描く直前にその場で割り付ける | **`LR-6` により、矩形も画面の値もブラウザ無しで決まる。** 書き出しが文書だけの純粋関数になり、書き出しが通る値（`CP-35`）と画面にしか要らない値（`CP-36`）が 2 小層の境目で分かれる | 現在値は `Framework` が持つので（`LY-5`）、毎フレーム引数で内側へ渡す |
| MN-8 | ⭐ **日程表の外側の UI パーツを組み立てるコンポーネントを立てた**（`CP-37` / `CP-38`） | 描画が 1 つで日程表も外側も描く | **表 T-075 の `UF-61` 〜 `UF-69` が受ける要求を、組み立てる側で受けるコンポーネントが 1 つも無かった。** `FR-080` の `WY-2` が除外を持つのは透かしの層だけなので、外側を日程表と同じ出口に混ぜられない | コンポーネントが 2 つ、層をまたぐインターフェースが 1 本増えた |

**`R2.20`（MUST）が、キャッシュを用いる場合に 4 点を本節の ADR に置くことを求めている。**
```
**理由**: 席は空。`WY-2` の除外が透かしの層だけであることは 表 T-041 の原文で確認済み。列数 5 で他行と一致、`。` の直後に閉じる `**` は無い。

### 編集 6 — `MN-6` の題に「画面の矩形」、辺 2 本 → 3 本
**場所**: `:557`
**いま**:
```
| MN-6 | ⭐ **レイアウトと幾何をフレーム先頭で 1 回だけ計算して配る**（ADR-001） | 必要になったコンポーネントが各々計算する | 4 本の経路が `ScheduleLayout` を必要とし、**ポインタが動くたびに 表 T-068 の 11 段が 4 回走る**。`NFR-002` / `NFR-003` の予算に収まらない | `Framework` から `layoutEngine` への辺が 2 本増え、図 F-013 にクラスタ対が 1 つ増えた |
```
**こうする**:
```
| MN-6 | ⭐ **画面の矩形とレイアウトと幾何をフレーム先頭で 1 回だけ計算して配る**（ADR-001） | 必要になったコンポーネントが各々計算する | 4 本の経路が `ScheduleLayout` を必要とし、**ポインタが動くたびに 表 T-068 の 11 段が 4 回走る**。`NFR-002` / `NFR-003` の予算に収まらない | `Framework` から `layoutEngine` への辺が 3 本増え、図 F-013 にクラスタ対が 1 つ増えた |
```
**理由**: 編集 4 の改題に追随。1 行に 2 か所あるので 1 本に畳んだ。「4 本の経路」と「クラスタ対 1 つ」は据え置きで正しい。

### 編集 7 — `MN-3` の 8 本 → 9 本、6 つ → 7 つ
**場所**: `:554`
**いま**:
```
| MN-3 | 層をまたぐインターフェースを 8 本宣言した（表 T-065） | ブラウザの API を直に呼ぶ | `LR-5`。**これがあるので `LR-1` に例外が要らない** | `Framework` に実装だけのコンポーネントが 6 つ増えた |
```
**こうする**:
```
| MN-3 | 層をまたぐインターフェースを 9 本宣言した（表 T-065） | ブラウザの API を直に呼ぶ | `LR-5`。**これがあるので `LR-1` に例外が要らない** | `Framework` に実装だけのコンポーネントが 7 つ増えた |
```
**理由**: 実装だけの `Framework` コンポーネントは今 `CP-26` 〜 `CP-31` の 6 で、`DomScreenSurface` を足して 7（実測で確認）。1 行に 2 か所あるので 1 本に畳んだ。

### 編集 8 — `MN-2` のコンポーネント 34 → 38
**場所**: `:553`
**いま**:
```
コンポーネントを 34 に分けた（表 T-062）
```
**こうする**:
```
コンポーネントを 38 に分けた（表 T-062）
```
**理由**: この並びは「38 コンポーネント」にならないので、`audit-ch5.py:49` が要求する 2 件の当たりを崩さない。

### 編集 9 — ADR-000 Decision の 6 つ → 8 つ
**場所**: `:542`
**いま**:
```
**表 T-070 の 6 つを増やした。**
```
**こうする**:
```
**表 T-070 の 8 つを増やした。**
```
**理由**: 編集 5 で 表 T-070 が 6 行 → 8 行になる。

### 編集 10 — 9 本目 `IF-9 ScreenSurface` を足す
**場所**: `:361`（表 T-065 の末尾）
**いま**:
```
| IF-8 | `AppShellSource` | `DocumentCodec`（`CP-20`） | `SingleHtmlShell`（`CP-25`） | アプリ自身の HTML。`IO-7` を作るのに要る |
```
**こうする**:
```
| IF-8 | `AppShellSource` | `DocumentCodec`（`CP-20`） | `SingleHtmlShell`（`CP-25`） | アプリ自身の HTML。`IO-7` を作るのに要る |
| IF-9 | `ScreenSurface` | `ScreenRenderer`（`CP-37`） | `DomScreenSurface`（`CP-38`） | 作った記述を画面に載せ、対話欄で確定した発話を返す |
```
**理由**: `IF-9` の席は空。`audit-ch5.py:167` の正規表現に当たり、kebab 変換で `screen-surface.ts` → 宣言者 `ScreenRenderer`。その置き場は 編集 14 の `UF-70` である（模擬実行で `homeless` 0 を確認）。

### 編集 11 — 層をまたぐ I/F の 8 ファイル → 9 ファイル、行 ID に `UF-70`
**場所**: `:348`
**いま**:
```
⚠️ **この 8 ファイルもユニットである**（表 T-074 の `SU-3`）—— 表 T-075 の `UF-29` / `UF-31` / `UF-33` / `UF-38` / `UF-40` / `UF-42` / `UF-44` / `UF-46` がそれである。
```
**こうする**:
```
⚠️ **この 9 ファイルもユニットである**（表 T-074 の `SU-3`）—— 表 T-075 の `UF-29` / `UF-31` / `UF-33` / `UF-38` / `UF-40` / `UF-42` / `UF-44` / `UF-46` / `UF-70` がそれである。
```
**理由**: 以降（「宣言だけを別ファイルに…」）は 1 文字も変えない。取り直した全文も逐語で 1 件。

### 編集 12 — `PI-35` 〜 `PI-38` の 4 行を足す
**場所**: `:344`（表 T-064 の末尾）
**いま**:
```
| PI-34 | `documentModel` | `Document` | `Document`（型。5 つの鍵は 表 T-052 の `DR-1` 〜 `DR-4`）／ `documentViolations`（`DR-1` に反する箇所） |
```
**こうする**:
```
| PI-34 | `documentModel` | `Document` | `Document`（型。5 つの鍵は 表 T-052 の `DR-1` 〜 `DR-4`）／ `documentViolations`（`DR-1` に反する箇所） |
| PI-35 | `layoutEngine` | `ScreenRegions` | `ScreenRect`（型。矩形。左上の座標と幅と高さの数値 4 つを自前で宣言し、**ブラウザの供給する型に触れない**（`LR-6`））／ `ScreenRegions`（型。各部の矩形。各部の名は 表 T-103 が持つ）／ `regionsFromScreen`（画面の寸法と `DocumentSettings` から各部の矩形を出す）／ `regionAtPointer`（ポインタがどの領域にあるか） |
| PI-36 | `documentModel` | `ScreenState` | `ScreenState`（型。構えは 表 T-023b、ほかは 表 T-206 の `S-99e` / `S-99f` / `S-99g`）／ `emptyScreenState` ／ `screenStateWithArmed` ／ `screenStateWithSurface`（開いている面）／ `screenStateWithPalette`（`S-99e`）／ `screenStateWithFullScreen`（`S-99f`）／ `escapeTarget`（`Esc` が次に消費するもの。階層は 表 T-028 の `IN-4`） |
| PI-37 | `Adapter` | `ScreenRenderer` | `ScreenSurface`（表 T-065）／ `ScreenView`（型。日程表の外側の UI パーツの記述）／ `screenViewFromRegions` ／ `dialogueMessageFromInput`（対話欄で確定した発話。順序の規則は 表 T-035 の `AG-11`） |
| PI-38 | `Framework` | `DomScreenSurface` | `ScreenSurface` の実装 1 つ |
```
**理由**: 席は空。`S-99e`/`S-99f`/`S-99g`（`tbl-settings.md` の 表 T-206）・表 T-103・表 T-023b（`構え`）・`IN-4`・`AG-11`・`LR-6` はすべて実在を実測。純粋性語を書いていないので `audit-ch5.py:186` の当たりを増やさない（模擬実行で `purity T-064 names but T-075 drops : none`）。

### 編集 13 — `PI-18` に `screenStateFromInput` を足す
**場所**: `:328`
**いま**:
```
| PI-18 | `Adapter` | `InputCommandTranslator` | `InputSource`（表 T-065）／ `commandFromInput`（割当は 表 T-023 と 表 T-036）／ `selectionFromInput`（規則は 表 T-023c。取り消しの対象外＝`UN-9`） |
```
**こうする**:
```
| PI-18 | `Adapter` | `InputCommandTranslator` | `InputSource`（表 T-065）／ `commandFromInput`（割当は 表 T-023 と 表 T-036）／ `selectionFromInput`（規則は 表 T-023c。取り消しの対象外＝`UN-9`）／ `screenStateFromInput`（`Esc` の階層は 表 T-028 の `IN-4`。置き場は `CP-36`） |
```
**理由**: `IN-4` の `Esc` 階層は 1 つの MUST で順序を並べているので、順序を通して見るコンポーネントが 1 つ要る。`selectionFromInput` と同型。

### 編集 14 — `UF-58` 〜 `UF-71` の 14 行を足す（57 → 71）
**場所**: `:300`（表 T-075 の末尾）
**いま**:
```
| UF-57 | `Document` | `document.ts` | `pure` | `CP-34` |
```
**こうする**:
```
| UF-57 | `Document` | `document.ts` | `pure` | `CP-34` |
| UF-58 | `ScreenRegions` | `screen-regions.ts` | `pure` | `CP-35` |
| UF-59 | `ScreenState` | `screen-state.ts` | `pure` | `CP-36` |
| UF-60 | `ScreenRenderer` | `screen-renderer.ts` | `pure` | UI パーツごとの 9 ファイルを束ねて公開する |
| UF-61 | `ScreenRenderer` | `screen-frame.ts` | `pure` | `App Header`・`Panel Divider`・`Scrollbars` の割り付けと、全画面表示（`FR-051` / `FR-052` / `FR-071`） |
| UF-62 | `ScreenRenderer` | `app-header-items.ts` | `pure` | `Document Title`（`FR-035`）・`Autosave Status`（`FR-061`）・`Agent API` が有効であることの表示（`FR-065`）・表示言語の切替（`FR-038`） |
| UF-63 | `ScreenRenderer` | `row-title-panel.ts` | `pure` | `Row Title Panel` と `Row Title Tree`（`FR-085` / `FR-005` / `FR-098`） |
| UF-64 | `ScreenRenderer` | `properties-panel.ts` | `pure` | `Properties Panel`（`FR-006` / `FR-072`） |
| UF-65 | `ScreenRenderer` | `command-palette.ts` | `pure` | `Command Palette`（`FR-053` / `FR-083`） |
| UF-66 | `ScreenRenderer` | `open-modals.ts` | `pure` | 重ねて開く面（定義は 表 T-028 の `IN-4`）—— `FR-036` / `FR-074` / `FR-099` / `FR-088` / `FR-068` |
| UF-67 | `ScreenRenderer` | `notices.ts` | `pure` | 知らせ（`FR-076`。作法は 表 T-037） |
| UF-68 | `ScreenRenderer` | `dialogue-field.ts` | `pure` | `Dialogue Field`（`FR-066`。順序は 表 T-035 の `AG-11`） |
| UF-69 | `ScreenRenderer` | `tooltips.ts` | `pure` | ツールチップ（`FR-029` / `FR-037` / `FR-092`） |
| UF-70 | `ScreenRenderer` | `screen-surface.ts` | `—` | `ScreenSurface` の宣言（`IF-9`） |
| UF-71 | `DomScreenSurface` | `dom-screen-surface.ts` | `non-pure` | `CP-38` |
```
**理由**: 57 ＋ 14 ＝ 71。ファイル名 14 個は既存 57 と 1 つも衝突しない（模擬実行で `unit file names are unique 71 vs 71`）。挙げた UI パーツ名は 表 T-103 に全部ある —— `App Header`(`U-31`) `Panel Divider`(`U-24`) `Scrollbars`(`U-21`) `Row Title Panel`(`U-22`) `Row Title Tree`(`U-23`) `Properties Panel`(`U-25`) `Command Palette`(`U-26`) `Document Title`(`U-27`) `Autosave Status`(`U-28`) `Dialogue Field`(`U-44`)。挙げた FR はすべて実在（`FR-050` は指していない）。

### 編集 15 — 層をまたぐ I/F の 8 ファイル → 9 ファイル
**場所**: `:238`
**いま**:
```
層をまたぐインターフェースの 8 ファイルは型の宣言だけを持ち
```
**こうする**:
```
層をまたぐインターフェースの 9 ファイルは型の宣言だけを持ち
```

### 編集 16 — `UT-7` を足す
**場所**: `:232`（表 T-063 の末尾）
**いま**:
```
| UT-6 | `SingleHtmlShell` | `single-html-shell.ts` ／ `frame-loop.ts` | **純粋性ではない** —— 表 T-075 のとおり どちらも同じである。**起動は `FR-067` と `FR-065` が、フレームの走行は 表 T-060 の `LY-5` と 5.6 の ADR-001 が縛るので、変更の理由が別である。** ⚠️ **割らないと 1 つのユニットが 8 つの事柄を負い、`R2.2` に反する** —— 5.2 の分割基準「別々の要求が寸法と規則を持っているなら別コンポーネントとする」が、ユニットの側でも同じことを言う |
```
**こうする**:
```
| UT-6 | `SingleHtmlShell` | `single-html-shell.ts` ／ `frame-loop.ts` | **純粋性ではない** —— 表 T-075 のとおり どちらも同じである。**起動は `FR-067` と `FR-065` が、フレームの走行は 表 T-060 の `LY-5` と 5.6 の ADR-001 が縛るので、変更の理由が別である。** ⚠️ **割らないと 1 つのユニットが 8 つの事柄を負い、`R2.2` に反する** —— 5.2 の分割基準「別々の要求が寸法と規則を持っているなら別コンポーネントとする」が、ユニットの側でも同じことを言う |
| UT-7 | `ScreenRenderer` | `screen-renderer.ts` と、UI パーツごとの 9 ファイル | **純粋性ではない** —— 表 T-075 のとおり 10 とも同じである。**UI パーツごとに縛る要求が別なので割った**（`UT-2` と同じ形である）—— ヘルプの規則が変わってもプロパティパネルの規則は変わらない |
```
**理由**: 宣言ファイル `screen-surface.ts` を本表に書かないのは `:221` の規則どおりで、`UT-4` に前例がある。模擬実行で `T-063 rows that T-075 shows as 1 unit: none`。

### 編集 17 — 層をまたぐ I/F の 8 ファイル → 9 ファイル
**場所**: `:221`
**いま**:
```
層をまたぐインターフェースの 8 ファイルは本表に行を持たない
```
**こうする**:
```
層をまたぐインターフェースの 9 ファイルは本表に行を持たない
```
⚠️ `:228` と `:253` の「集約ごとの 8 ファイル」は `EditDocument` の話なので触らない（実測で新設計にも 2 件残る）。

### 編集 18 — 34 → 38 コンポーネント、8 本 → 9 本（同じ 1 行）
**場所**: `:219`
**いま**:
```
**ユニットを割った理由を 表 T-063 に、ユニットの全数を 表 T-075 に、34 コンポーネントの公開インターフェースを 表 T-064 に、層をまたぐ 8 本を 表 T-065 に示す。**
```
**こうする**:
```
**ユニットを割った理由を 表 T-063 に、ユニットの全数を 表 T-075 に、38 コンポーネントの公開インターフェースを 表 T-064 に、層をまたぐ 9 本を 表 T-065 に示す。**
```
**理由**: 1 行に 2 か所あるので 1 本に畳んだ。ここが `audit-ch5.py:49` の「38 コンポーネント」2 件目である。

### 編集 19 — ディレクトリ木に `dom-screen-surface/`
**場所**: `:216`
**いま**:
```
                      browser-clipboard/ · canvas-rasterizer/
```
**こうする**:
```
                      browser-clipboard/ · canvas-rasterizer/ · dom-screen-surface/
```
**理由**: 足した後 83 桁（既存最長 85 以内）。

### 編集 20 — ディレクトリ木に `screen-renderer/`
**場所**: `:213`
**いま**:
```
                      autosave-gateway/ · clipboard-gateway/
```
**こうする**:
```
                      autosave-gateway/ · clipboard-gateway/ · screen-renderer/
```
**理由**: 79 桁。

### 編集 21 — ディレクトリ木に `screen-regions/`（続き行で折り返す）
**場所**: `:206`
**いま**:
```
    layout-engine/    schedule-layout/ · schedule-geometry/ · item-hit-area/
```
**こうする**:
```
    layout-engine/    schedule-layout/ · schedule-geometry/ · item-hit-area/
                      screen-regions/
```
**理由**: 1 行に足すと実測 94 桁で既存最長 85 を超える。続き行の字下げは半角 22 で既存の続き行と一致（実測）。

### 編集 22 — ディレクトリ木に `screen-state/`
**場所**: `:205`
**いま**:
```
                      edit-history/ · selection/ · dialogue-log/
```
**こうする**:
```
                      edit-history/ · selection/ · dialogue-log/ · screen-state/
```
**理由**: 80 桁。⭐ 編集 19 〜 22 の後、葉フォルダは 34 → 38 で `audit-ch5.py:76` と一致し、kebab 名も 表 T-075 の 4 コンポーネントと一致する（模擬実行で確認）。木の最大幅は 85 のまま。

### 編集 23 — フォルダ 34 → 38、1 対 1 の相手も 38
**場所**: `:199`
**いま**:
```
34 のフォルダは 表 T-062 の 34 コンポーネントと 1 対 1
```
**こうする**:
```
38 のフォルダは 表 T-062 の 38 コンポーネントと 1 対 1
```
**理由**: `audit-ch5.py:49` の `("38 のフォルダ", 1)` と、`("38 コンポーネント", 2)` の 1 件目。

### 編集 24 — 最も多くユニットを持つコンポーネントを差し替える
**場所**: `:187`
**いま**:
```
表 T-075 のとおり `EditDocument` と `DocumentCodec` が最も多くのユニットを持つが
```
**こうする**:
```
表 T-075 のとおり `ScreenRenderer` と `EditDocument` が最も多くのユニットを持つが
```
**理由**: 改定後は `ScreenRenderer` 11・`EditDocument` 9・`DocumentCodec` 5（audit の導出値で確認）。続く「どちらも平らに並べている」もモジュール 0 のままなので真。

### 編集 25 — ユニット 57 → 71
**場所**: `:183`（表 T-074 `SU-3`）
**いま**:
```
**57。** 全数は 表 T-075
```
**こうする**:
```
**71。** 全数は 表 T-075
```
**理由**: `audit-ch5.py:139` が `"**57。** 全数は 表 T-075"` を 1 件で当てる。**編集 48 と対。**

### 編集 26 — コンポーネント 34 → 38
**場所**: `:181`（表 T-074 `SU-1`）
**いま**:
```
| **34。** 全数は 表 T-062、公開する名前は 表 T-064 |
```
**こうする**:
```
| **38。** 全数は 表 T-062、公開する名前は 表 T-064 |
```

### 編集 27 — 層をまたぐ 8 本 → 9 本
**場所**: `:173`
**いま**:
```
**層をまたぐ 8 本だけは
```
**こうする**:
```
**層をまたぐ 9 本だけは
```

### 編集 28 — `CP-35` 〜 `CP-38` の 4 行を足す
**場所**: `:123`（表 T-062 の末尾）
**いま**:
```
| CP-34 | `documentModel` | `Document` | **文書ルートの合成と、`DR-1` の不変条件**（ルートに 3 群だけを置く／群に属する値をルート直下へ直に置かない） | 表 T-052 の `DR-1` |
```
**こうする**:
```
| CP-34 | `documentModel` | `Document` | **文書ルートの合成と、`DR-1` の不変条件**（ルートに 3 群だけを置く／群に属する値をルート直下へ直に置かない） | 表 T-052 の `DR-1` |
| CP-35 | `layoutEngine` | `ScreenRegions` | **画面の各部の矩形**（各部の名は 表 T-103 が持つ）と、ポインタがどの領域にあるかの判定 | `FR-051` |
| CP-36 | `documentModel` | `ScreenState` | **文書に保存しない画面の値** —— 構え（全数は 表 T-023b）と、表 T-206 の `S-99e` / `S-99f` / `S-99g` | `FR-053` / `FR-071` / 表 T-023b |
| CP-37 | `Adapter` | `ScreenRenderer` | 日程表の外側の UI パーツの記述を作り、対話欄で確定した発話を渡す。`ScreenSurface` を宣言する | `FR-051` / `FR-006` / `FR-036` / `FR-053` / `FR-076` / `FR-066` |
| CP-38 | `Framework` | `DomScreenSurface` | `ScreenSurface` の実装 | — |
```
**理由**: 席は全部空（docs/spec 全体で 0 件）。挙げた FR は全部実在。`CP-n` と `PI-n` を同数同順で足すので `audit-ch5.py:46` の 1 対 1 が保たれる。

### 編集 29 — シェルの責務に「画面の矩形」を足す
**場所**: `:114`（表 T-062 `CP-25`）
**いま**:
```
**フレームの先頭でレイアウトと幾何を 1 回計算して配り**
```
**こうする**:
```
**フレームの先頭で画面の矩形とレイアウトと幾何を 1 回計算して配り**
```
**理由**: ⭐ **草案に無い補い。** 編集 4（ADR-001 改称）・編集 2（`CA-1` に `ScreenRegions`）・編集 44（model.json の `SingleHtmlShell → ScreenRegions`）を当てると、その辺を裏づける責務が 表 T-062 に 1 行も無くなる。`CP-25` の「正」は 5.6 の ADR-001 を指しているので、題が変われば責務も追随する。

### 編集 30 — `CP-21` に書き出しの組み立てと切り落としを持たせる
**場所**: `:110`
**いま**:
```
| CP-21 | `Adapter` | `ImageExporter` | 画像として書き出す。`Rasterizer` を宣言する | `FR-025` |
```
**こうする**:
```
| CP-21 | `Adapter` | `ImageExporter` | 画像として書き出す。**表 T-076 が「描く」と定めた UI パーツを組み立て、縦に収まらない `TaskGroup` を落とす。** `Rasterizer` を宣言する | `FR-025` / `FR-080` |
```
**理由**: CR-138 が `FR-025` に「`TaskGroup` 単位で落とす」を、`FR-080` に 表 T-076 を置いたのに、その判断の持ち主が決まっていなかった。⭐ **草案の「表 T-076 が「入る」と定めた領域」は語が合わない** —— 表 T-076 の列見出しは実測で `| 行 ID | UI パーツ | 描くか | 理由と扱い |`、`WY-3` も「表 T-076 が「描く」とした UI パーツ」と書く。同義語を増やさないため「描く」「UI パーツ」に統一した。

### 編集 31 — `CP-18` から確定発話と `FR-066` を外す
**場所**: `:107`
**いま**:
```
| CP-18 | `Adapter` | `InputCommandTranslator` | 画面の入力を操作へ変え、対話欄で確定した発話を渡す。`InputSource` を宣言する | `FR-016` / `FR-070` / `FR-066` |
```
**こうする**:
```
| CP-18 | `Adapter` | `InputCommandTranslator` | 画面の入力を操作へ変える。`InputSource` を宣言する | `FR-016` / `FR-070` |
```
**理由**: 対話欄は UI パーツ（`U-44`）であって入力機器ではない。責務を「描画領域の入力」に狭めない判断は正しい —— 同じ行に残る `FR-070` の 表 T-036 は `SK-13` 〜 `SK-15` を持ち、いずれも描画領域の外に働く。

### 編集 32 — 実装だけの `Framework` コンポーネント 6 → 7
**場所**: `:84`
**いま**:
```
逆に `Framework` の 6 コンポーネントが分かれているのは
```
**こうする**:
```
逆に `Framework` の 7 コンポーネントが分かれているのは
```

### 編集 33 — `LY-4` に外側の UI パーツの記述を足す
**場所**: `:50`（表 T-060 `LY-4`）
**いま**:
```
| LY-4 | `Adapter` | `Agent API`、SVG の生成、交換形式との相互変換、
```
**こうする**:
```
| LY-4 | `Adapter` | `Agent API`、SVG の生成、日程表の外側の UI パーツの記述の生成、交換形式との相互変換、
```
**理由**: ⭐ **草案の落ち。** 編集 34 が `LY-2` を、編集 35 が `LY-1` を直したのと同じ理由。`CP-37` の責務は `LY-4` の列挙のどれにも当たらない（「SVG の生成」は `CP-19`、「画面の入力を操作へ変えること」は `CP-18`）。`LY-5` は「ブラウザの DOM」で `CP-38` を既に覆うので直す要なし。

### 編集 34 — `layoutEngine` に置くものへ「画面の各部の矩形」を足す
**場所**: `:48`（表 T-060 `LY-2`）
**いま**:
```
| LY-2 | `Entity` / `layoutEngine` | 日付と座標の対応、
```
**こうする**:
```
| LY-2 | `Entity` / `layoutEngine` | 画面の各部の矩形、日付と座標の対応、
```
**理由**: ⛔ `:66`（`Entity` を 2 つに割った理由）は 1 文字も変えない。「第 3 の小層を作らない」決定とむしろ一致する。

### 編集 35 — `documentModel` に置くものへ「画面の使い方の値」を足す
**場所**: `:47`（表 T-060 `LY-1`）
**いま**:
```
（取り消しの履歴・選択・確定した発話。いずれも不変の値として持ち、丸ごと置き換える）
```
**こうする**:
```
（取り消しの履歴・選択・確定した発話・画面の使い方の値。いずれも不変の値として持ち、丸ごと置き換える）
```
**理由**: 既存の 3 前例（`CP-4` / `CP-32` / `CP-33`）と同じ枠に入れる。**ここに「全数は 表 T-206」と書かない** —— 同表の中で画面の値は 3 行だけである。

---

## ファイル 2 —— `docs/spec/_assets/source/model.json`（編集 36 〜 46）

### 編集 36 — `views.startup` に `DomScreenSurface` と `ScreenRenderer`
**場所**: `:878-881`
**いま**:
```
    "SingleHtmlShell",
    "DomInputSource",
    "InputCommandTranslator",
    "ChooseStartupDocument",
```
**こうする**:
```
    "SingleHtmlShell",
    "DomInputSource",
    "DomScreenSurface",
    "InputCommandTranslator",
    "ScreenRenderer",
    "ChooseStartupDocument",
```
**理由**: ⭐ この 2 行を入れないと、編集 45 で付け替えた発話の辺（`ScreenRenderer → PostDialogueMessage`）が 図 F-017 から消える —— 起動の図は「発話を配るまで」を示す図である（設計 `:161`）。**実測で確認**: 入れた後、F-017 に新しい辺が 4 本現れる（`SingleHtmlShell→ScreenRenderer` / `DomScreenSurface→ScreenRenderer` / `ScreenRenderer→DialogueLog` / `ScreenRenderer→PostDialogueMessage`）。行頭は半角空白 4。

### 編集 37 — `views.io` に `ScreenRenderer`
**場所**: `:861-863`
**いま**:
```
    "ImageExporter",
    "DocumentCodec",
    "FileSystemAccessFileStore",
```
**こうする**:
```
    "ImageExporter",
    "DocumentCodec",
    "ScreenRenderer",
    "FileSystemAccessFileStore",
```
**理由**: `views.io` の並びは Adapter → Framework → UseCase なので、Adapter の塊の末尾に置く（草案の `866-867` は Framework の塊の中で、挿入位置として意味を成さない）。図 F-016 に `ImageExporter → ScreenRenderer` が 1 本現れる。

### 編集 38 — `views.read` に 4 名を足す
**場所**: `:841-854`（`views.read` の全体）
**いま**:
```
  "read": {
   "label": "The read path for drawing",
   "nodes": [
    "SingleHtmlShell",
    "SvgRenderer",
    "DomSvgSurface",
    "ScheduleLayout",
    "ScheduleGeometry",
    "ItemHitArea",
    "Schedule",
    "DocumentSettings",
    "Selection"
   ]
  },
```
**こうする**:
```
  "read": {
   "label": "The read path for drawing",
   "nodes": [
    "SingleHtmlShell",
    "SvgRenderer",
    "DomSvgSurface",
    "ScreenRenderer",
    "DomScreenSurface",
    "ScheduleLayout",
    "ScheduleGeometry",
    "ItemHitArea",
    "ScreenRegions",
    "Schedule",
    "DocumentSettings",
    "Selection",
    "ScreenState"
   ]
  },
```
**理由**: 4 名は層ごとに散るので view ブロックを丸ごと掴み、既存の層の並び（Framework/Adapter → layoutEngine → documentModel）を崩さずに 4 か所へ入れた。実測で 図 F-015 には新しい辺が **9 本**現れ、`ScreenRenderer → DialogueLog` だけが落ちる（`DialogueLog` がこの view に居ないため）。

### 編集 39 — `views.write` に `ScreenState`
**場所**: `:837-839`
**いま**:
```
    "Selection",
    "Document"
   ]
```
**こうする**:
```
    "Selection",
    "ScreenState",
    "Document"
   ]
```
**理由**: `views.write` の並びは「入口 → UseCase → 保存しない値・文書」で、同種の `Selection` の直後が正しい（草案の `826-827` は並びの先頭）。行頭は半角空白 4。

### 編集 40 — `framework` クラスタに `DomScreenSurface`
**場所**: `:816-818`
**いま**:
```
     "BrowserClipboard",
     "CanvasRasterizer"
    ]
```
**こうする**:
```
     "BrowserClipboard",
     "CanvasRasterizer",
     "DomScreenSurface"
    ]
```
**理由**: 行頭は半角空白 5、閉じ括弧は 4（実測どおり）。

### 編集 41 — `adapter` クラスタに `ScreenRenderer`
**場所**: `:799-801`
**いま**:
```
     "AutosaveGateway",
     "ClipboardGateway"
    ]
```
**こうする**:
```
     "AutosaveGateway",
     "ClipboardGateway",
     "ScreenRenderer"
    ]
```

### 編集 42 — `layoutEngine` クラスタに `ScreenRegions`
**場所**: `:758-762`
**いま**:
```
      "nodes": [
       "ScheduleLayout",
       "ScheduleGeometry",
       "ItemHitArea"
      ]
```
**こうする**:
```
      "nodes": [
       "ScheduleLayout",
       "ScheduleGeometry",
       "ItemHitArea",
       "ScreenRegions"
      ]
```
**理由**: 入れ子クラスタなので要素は半角空白 7、閉じ括弧は 6（実測）。

### 編集 43 — `documentModel` クラスタに `ScreenState`
**場所**: `:746-749`
**いま**:
```
       "EditHistory",
       "Selection",
       "DialogueLog"
      ]
```
**こうする**:
```
       "EditHistory",
       "Selection",
       "DialogueLog",
       "ScreenState"
      ]
```

### 編集 44 — 辺を 13 本足す（すべて内向き・新しいクラスタ対 0）
**場所**: `:715-722`（`edges` の末尾）
**いま**:
```
  {
   "source": "SingleHtmlShell",
   "target": "ScheduleGeometry",
   "arrow": "dependency",
   "label": "geometry once per frame",
   "description": "computes the frame's geometry from that layout, once (ADR-001)"
  }
 ],
```
**こうする**（末尾の `}` を `},` にして 13 ブロックを挿し、`],` で閉じる）:
```
  {
   "source": "SingleHtmlShell",
   "target": "ScheduleGeometry",
   "arrow": "dependency",
   "label": "geometry once per frame",
   "description": "computes the frame's geometry from that layout, once (ADR-001)"
  },
  {
   "source": "SingleHtmlShell",
   "target": "ScreenRegions",
   "arrow": "dependency",
   "label": "regions once per frame",
   "description": "computes the frame's screen rectangles once, before the layout (ADR-001)"
  },
  {
   "source": "ScreenRegions",
   "target": "DocumentSettings",
   "arrow": "dependency",
   "label": "panel widths",
   "description": "reads the saved panel widths (S-79 / S-80)"
  },
  {
   "source": "InputCommandTranslator",
   "target": "ScreenRegions",
   "arrow": "dependency",
   "label": "region under pointer",
   "description": "asks which region the pointer is in"
  },
  {
   "source": "InputCommandTranslator",
   "target": "ScreenState",
   "arrow": "dependency",
   "label": "next screen state",
   "description": "reads what is armed and which surface is open, and returns the next screen state"
  },
  {
   "source": "SingleHtmlShell",
   "target": "ScreenRenderer",
   "arrow": "dependency",
   "label": "screen frame",
   "description": "rebuilds the UI parts outside the schedule once per frame"
  },
  {
   "source": "DomScreenSurface",
   "target": "ScreenRenderer",
   "arrow": "realization",
   "label": "implements ScreenSurface"
  },
  {
   "source": "ScreenRenderer",
   "target": "ScreenRegions",
   "arrow": "dependency",
   "label": "where each part sits",
   "description": "reads the rectangle of each screen part"
  },
  {
   "source": "ScreenRenderer",
   "target": "ScreenState",
   "arrow": "dependency",
   "label": "screen values",
   "description": "reads the screen values the document never saves"
  },
  {
   "source": "ScreenRenderer",
   "target": "Schedule",
   "arrow": "dependency",
   "label": "row names + attributes",
   "description": "reads the row names and the attributes the properties panel shows"
  },
  {
   "source": "ScreenRenderer",
   "target": "DocumentSettings",
   "arrow": "dependency",
   "label": "outer presentation",
   "description": "reads the presentation values"
  },
  {
   "source": "ScreenRenderer",
   "target": "Selection",
   "arrow": "dependency",
   "label": "selection to show",
   "description": "reads what is selected"
  },
  {
   "source": "ScreenRenderer",
   "target": "DialogueLog",
   "arrow": "dependency",
   "label": "utterances shown",
   "description": "reads the utterances the dialogue field shows"
  },
  {
   "source": "ImageExporter",
   "target": "ScreenRenderer",
   "arrow": "dependency",
   "label": "parts that go out",
   "description": "takes the parts table T-076 lets into the export (EP-1 / EP-3)"
  }
 ],
```
**理由**: 13 本の source / target は草案どおり（1 本も足さず、落とさず）。**草案から 3 点直した** ——
① 13 本目の理由を `EP-2` → `EP-1` / `EP-3` に。実測で `EP-2` は `Time Ruler`（`U-19`）で `SvgRenderer` 側の絵、`ScreenRenderer` が作って書き出しに入るのは `EP-1`（帯と `Document Title` を描く）と `EP-3`（`Row Title Panel` / `Row Title Tree`）である。
② ⭐ **ラベルを 3 本、既存と重ならないものに変えた** —— `frame` → `screen frame` / `presentation values` → `outer presentation` / `what is selected` → `selection to show`。**そのままだと 図 F-015 の中で `frame` が 2 本、`presentation values` が 2 本、`what is selected` が 3 本になる**（実測）。F-015 は CR-139 が札の置き場所を直したばかりの図であり、`presentation values` はそこで切れて `what is selected` と重なった当の札である。
③ `DomScreenSurface → ScreenRenderer` だけ `realization` なので `description` を持たない（`DomSvgSurface → SvgRenderer` の前例）。
全ラベルは 24 文字以下。

### 編集 45 — 確定発話の辺を `ScreenRenderer` へ付け替える
**場所**: `:604-605`
**いま**（⚠️ **2 行そろえて掴む** —— `"source": "InputCommandTranslator",` 単独では 5 件ある）:
```
   "source": "InputCommandTranslator",
   "target": "PostDialogueMessage",
```
**こうする**:
```
   "source": "ScreenRenderer",
   "target": "PostDialogueMessage",
```
**理由**: 付け替え後も `PostDialogueMessage` の入次数は 2（`AgentApiEndpoint` と `ScreenRenderer`。実測）で、`edge target with no member` にも `unreached` にも掛からない。

### 編集 46 — ノードを 4 つ足す
**場所**: `:209-215`（`nodes` の末尾）
**いま**:
```
  {
   "name": "DialogueLog",
   "shape": "rectangle",
   "description": "Confirmed utterances, in an order of their own that is independent of the revision. Never saved.",
   "remark": ""
  }
 ],
```
**こうする**:
```
  {
   "name": "DialogueLog",
   "shape": "rectangle",
   "description": "Confirmed utterances, in an order of their own that is independent of the revision. Never saved.",
   "remark": ""
  },
  {
   "name": "ScreenRegions",
   "shape": "component",
   "description": "The rectangle of every screen part, and which region the pointer is in.",
   "remark": "FR-051 / T-103"
  },
  {
   "name": "ScreenState",
   "shape": "component",
   "description": "The screen values the document never saves: what is armed, which surface is open, the palette and the full screen.",
   "remark": "FR-053 / FR-071 / T-023b"
  },
  {
   "name": "ScreenRenderer",
   "shape": "component",
   "description": "Builds the description of the UI parts outside the schedule, and passes on the utterance confirmed in the dialogue field. Declares ScreenSurface.",
   "remark": "FR-051 / FR-006 / FR-036 / FR-053 / FR-076 / FR-066"
  },
  {
   "name": "DomScreenSurface",
   "shape": "component",
   "description": "Puts that description on the page.",
   "remark": "implements ScreenSurface"
  }
 ],
```
**理由**: 草案は BEFORE も description / remark も持たなかったので、閉じ括弧 ` ],` まで含む逐語 BEFORE を起こし、既存 34 ノードの書き方（英語 ASCII・remark は要求 ID）に揃えて本文を書いた。`ScreenState` の `shape` は §5 の判断待ち。

---

## ファイル 3 —— `.claude/skills/spec-graph-check/audit-ch5.py`（編集 47 〜 55）

### 編集 47 — 表 T-065 の解釈できる行数 8 → 9
**場所**: `:168` / **いま**: `check("T-065 rows that parse", len(iface_rows), 8)` / **こうする**: `check("T-065 rows that parse", len(iface_rows), 9)`

### 編集 48 — 4 列に割れる行数と `SU-3` の文字列を 57 → 71
**場所**: `:138-139`
**いま**:
```
check("T-075 rows that parse into 4 cells", len(unit_cells), 57)
check("T-074 SU-3 states the unit count", design.count("**57。** 全数は 表 T-075"), 1)
```
**こうする**:
```
check("T-075 rows that parse into 4 cells", len(unit_cells), 71)
check("T-074 SU-3 states the unit count", design.count("**71。** 全数は 表 T-075"), 1)
```
**理由**: 139 行目の文字列は設計 `:183` と対。**編集 25 と対で当てること。**

### 編集 49 — 表 T-075 の期待行数 57 → 71
**場所**: `:135` / **いま**: `check("T-075 rows (units)", len(rows_of("T-075")), 57)` / **こうする**: `... 71)`

### 編集 50 — `FRAMEWORK` 集合に `DomScreenSurface`
**場所**: `:99-101`
**いま**:
```
FRAMEWORK = {"SingleHtmlShell", "DomSvgSurface", "DomInputSource",
             "FileSystemAccessFileStore", "LocalStorageDocumentStore",
             "BrowserClipboard", "CanvasRasterizer"}
```
**こうする**:
```
FRAMEWORK = {"SingleHtmlShell", "DomSvgSurface", "DomInputSource",
             "FileSystemAccessFileStore", "LocalStorageDocumentStore",
             "BrowserClipboard", "CanvasRasterizer", "DomScreenSurface"}
```
**理由**: **必須。** `DomScreenSurface` の入次数は 0 なので、足さないと `unreached component` で必ず落ちる。3 行目は 72 桁。ほかの 3 新規（`ScreenRegions` 3・`ScreenState` 2・`ScreenRenderer` 3）は入次数を持つので追加不要（実測）。

### 編集 51 — model.json のノード数 34 → 38
**場所**: `:88` / **いま**: `check("model nodes", len(nodes), 34)` / **こうする**: `... 38)`

### 編集 52 — 葉フォルダ数 34 → 38
**場所**: `:76` / **いま**: `check("directory tree leaf folders", len(leaves), 34)` / **こうする**: `... 38)`
**理由**: `:73-75` の除外リストは層のフォルダだけで、足す 4 つはいずれも葉なので編集不要。

### 編集 53 — 表 T-063 の期待行数 6 → 7
**場所**: `:56` / **いま**: `check("T-063 rows", len(ut), 6)` / **こうする**: `... 7)`

### 編集 54 — 本文の言い回しの期待値 34 → 38（回数は 1 と 2 のまま）
**場所**: `:49`
**いま**: `for phrase, want in (("34 のフォルダ", 1), ("34 コンポーネント", 2), ("部品", 1)):`
**こうする**: `for phrase, want in (("38 のフォルダ", 1), ("38 コンポーネント", 2), ("部品", 1)):`
**理由**: ⚠️ `("部品", 1)` は動かさない（規則 5）。裏取り済み —— 「38 のフォルダ」は `:199` の 1 件、「38 コンポーネント」は `:199` と `:219` の 2 件。編集 8 は「コンポーネントを 38 に分けた」なのでこの語に当たらない。

### 編集 55 — T-062 / T-064 / T-065 の期待行数
**場所**: `:43-45`
**いま**:
```
check("T-062 rows (components)", len(cp), 34)
check("T-064 rows (public interfaces)", len(pi), 34)
check("T-065 rows (cross-layer interfaces)", len(iface), 8)
```
**こうする**:
```
check("T-062 rows (components)", len(cp), 38)
check("T-064 rows (public interfaces)", len(pi), 38)
check("T-065 rows (cross-layer interfaces)", len(iface), 9)
```
**理由**: `:46` の 1 対 1 は値を持たない比較なので編集不要。

**⛔ 触らないもの**: `:59` のコメント「7 of the 34」（過去のレビューの記録）／ `:80` の 18（表 T-107。18 のまま）／ `:82` の正規表現／ `:73-75` の除外リスト／ `:128` の `PURITY`。

---

## ファイル 4 —— `docs/spec/_assets/tbl-glossary.md`（編集 56）

### 編集 56 — 表 T-103 に `U-51 ScreenState` を足す
**場所**: `:131-132`（表 T-103 の末尾。`U-50` は `:130`。⚠️ **その行そのものは触らない**）
**いま**（空行 ＋ 引用ブロックの 1 行目）:
```

> **呼び名は `Agent API` とする。日本語でも `Agent API` と書く。**
```
**こうする**:
```
| U-51 | `ScreenState` | （画面に出ない構造名。日本語を当てない）。文書に保存しない画面の値をまとめて持つ型の名。⚠️ **「画面の状態」と呼んではならない（MUST NOT）** —— その日本語は `tbl-settings.md` の表 T-203 と、本書の表 T-104 の `K-67` 〜 `K-72` が既に使っており、あちらは文書に保存する値である |

> **呼び名は `Agent API` とする。日本語でも `Agent API` と書く。**
```
**理由**: 席は空（表 T-103 は 51 行・最大 `U-50`・`U-1` 〜 `U-50` に欠番なし・`U-15a` は枝番・`U-51` は docs/spec に 0 件）。⭐ **検査 12 は当たらない** —— `style-checks.py:97` が `rel == GLOSSARY and NAMING_RULE.search(line)` で免除し、`NAMING_RULE` は `呼んではならない` を含む（模擬実行で検査 12 が 0 のまま）。**草案から 3 点直した**（§6 参照）。

---

## ファイル 5 —— `docs/spec/A-appendix.md`（編集 57 〜 58）

### 編集 57 — 変更履歴に **版 0.34 / CR-140** を足す
**場所**: `:61` の直後（ファイル末尾。ファイルは 61 行）
**いま**（`:61` の末尾）:
```
**仕様書の本文は 1 文字も触っていない**（`tables` / `rows` / `uids` は不変） |
```
**こうする**（その行の後ろに 1 行足す）:
```
**仕様書の本文は 1 文字も触っていない**（`tables` / `rows` / `uids` は不変） |
| 0.34 | 2026-08-16 | ⭐ **画面のモデルを `Entity` に置き、画面の面を組み立てるコンポーネントを立てた**（CR-140。利用者の裁定と、実装着手前レビューの **F-3**）—— 画面の各部の矩形を `ScreenRegions`（`CP-35`・`layoutEngine`）に、**文書に保存しない画面の値**を `ScreenState`（`CP-36`・`documentModel`）に置いた。**第 3 の小層は作っていない** —— 書き出しが文書だけから決まるようになった結果、**書き出しが通る値と画面にしか要らない値の境目が、2 小層の境目と一致した。** ⭐ **日程表の外側の UI パーツを組み立てる `ScreenRenderer`（`CP-37`）と、その DOM 実装 `DomScreenSurface`（`CP-38`）を立て、9 本目の層をまたぐインターフェース `ScreenSurface`（`IF-9`）を宣言した** —— ヘルプ・ツールチップ・`App Header`・コマンドパレット・プロパティパネル・知らせを担うコンポーネントが 1 つも無く、**全数を宣言して閉じた Chapter 5 の中で宙に浮いていた。** ⚠️ **確定した発話の持ち主を `InputCommandTranslator` から `ScreenRenderer` へ移した** —— `IF-2` が供給するのは「ポインタとキーの出来事」だけで、対話欄は UI パーツであって入力機器ではない。`PI-18` には `Esc` の階層（表 T-028 の `IN-4`）を通して見る `screenStateFromInput` を足した。⚠️ **書き出しの組み立てと切り落としの持ち主を `ImageExporter`（`CP-21`）にした** —— 表 T-076 が「描く」と定めた UI パーツを誰が組み立てるかが決まっていなかった。⚠️ **用語集の 表 T-103 に `U-51` を足した** —— `ScreenState` を 表 T-203 と同じ「画面の状態」と呼ばないためである。**コンポーネント 34 → 38・ユニット 57 → 71・層をまたぐ 8 → 9 本・辺 73 → 86・非巡回のまま・外向き 0 のまま。** 図 F-013 のクラスタ対は 9 のまま増えない |
```
**理由**: ⚠️ **草案は「版 0.33 / CR-139」で書かれていたが、その席は CR-139（図の生成器、2026-08-16）が `:61` で取っている**（`change-request/` の最後も `CR-139-let-the-figure-generator-finish.md`）。本 CR は **版 0.34 / CR-140**、置き場はファイル末尾。⭐ **`exportSvg` の句を落とした**（編集 8・9 を落としたため。§4 参照）。模擬実行で確認 —— 検査 7 の未解決 0、検査 5 の未定義表 0、検査 8 の不整合 0、検査 9 の陳腐化 0、検査 15 の図 0、列数 3、**`。` の直後に閉じる太字 0**、「部品」0 件・「外へインターフェースを公開」0 件（`audit-ch5.py:53-55` / `:65-68` の「1 件」が保たれる）。

### 編集 58 — 版 0.29 の「2 つより多いユニット」に `ScreenRenderer`（11）を足す
**場所**: `:57`
**いま**:
```
2 つより多いユニットを持つのは `EditDocument`（9）・`DocumentCodec`（5）・`AgentApiEndpoint`（3）で、いずれも平らに並べている。
```
**こうする**:
```
2 つより多いユニットを持つのは `EditDocument`（9）・`DocumentCodec`（5）・`AgentApiEndpoint`（3）・`ScreenRenderer`（11）で、いずれも平らに並べている。
```
**理由**: `audit-ch5.py:203-205` が 表 T-075 から導いた辞書と**完全一致**で比べる。模擬実行の出力 —— `{'EditDocument': 9, 'DocumentCodec': 5, 'AgentApiEndpoint': 3, 'ScreenRenderer': 11} vs {...} OK`。**11 は `screen-surface.ts`（`UF-70`）を含む数である** —— `owners` は層をまたぐ I/F のファイルも数える（`DocumentCodec` 5 に `app-shell-source.ts` が入っている前例）。**編集 14 から `UF-70` を落とすと 10 になり、この 1 文が必ず落ちる。**

---

# B. 動く数の予測表（すべて模擬適用で実測）

## B-1. 機械検査が数える値

| 事項 | いま | 改定後 | 当てる編集 |
|---|---|---|---|
| 表 T-060（層） | 5 | 5 | 33・34・35（行は増えない） |
| 表 T-062（コンポーネント） | 34 | **38** | 28 |
| 表 T-063（割った理由） | 6 | **7** | 16 |
| 表 T-064（公開インターフェース） | 34 | **38** | 12 |
| 表 T-065（層をまたぐ） | 8 | **9** | 10 |
| 表 T-070（増やしたもの） | 6 | **8** | 5 |
| 表 T-071（キャッシュ 4 点） | 4 | 4 | 2・1 |
| 表 T-074（構造の単位） | 3 | 3 | 26・25 |
| 表 T-075（ユニット） | 57 | **71** | 14 |
| 表 T-103（UI パーツ） | 51 | **52** | 56 |
| 表 T-107（Agent API メンバ） | 18 | **18** | 触らない |
| ディレクトリ木の葉フォルダ | 34 | **38** | 19 〜 22 |
| `ScreenRenderer` のユニット | — | **11**（`UF-60` 〜 `UF-70`） | 14 |

## B-2. `md-checks.py` の全体量

| 事項 | いま | 改定後 |
|---|---|---|
| `tables` | 112 | **112**（⭐ 新しい表を作らない） |
| `figures` | 10 | **10** |
| `rows` | 1287 | **1314**（＋27 ＝ CP 4 ＋ PI 4 ＋ UF 14 ＋ UT 1 ＋ IF 1 ＋ MN 2 ＋ U 1） |
| `uids` | 140 | **140**（⭐ 要求を 1 本も足さない） |
| 検査 5 / 6 / 7 / 8 / 9 / 10 / 15 | 全部 0 | **全部 0** |
| 検査 12（ゲート） | 0 | **0** |
| 助言 13 / 14 | 4 / 18 | **4 / 18**（増減なし） |

## B-3. `model.json` のグラフ

| 事項 | いま | 改定後 |
|---|---|---|
| ノード | 34 | **38** |
| 辺 | 73 | **86**（新規 13。付け替え 1 は増減なし） |
| 重複する辺 | 0 | **0** |
| 閉路 | 0 | **0**（86 辺で DFS） |
| `LR-1` 外向きの辺 | 0 | **0** |
| クラスタ対（自己対を除く） | 9 | **9**（新規 0・消滅 0） |
| `Framework → layoutEngine` | 2 | **3** |
| `Adapter → documentModel` | 7 | **13** |
| `Adapter → layoutEngine` | 5 | **7** |
| `Framework → Adapter` | 14 | **16** |
| `layoutEngine → documentModel` | 4 | **5** |
| `Adapter → UseCase` / `Framework → UseCase` / `UseCase → *` | 7 / 1 / 12 | **不変** |
| 図に現れる新しい辺 | — | F-014 に 1・**F-015 に 9**・F-016 に 1・**F-017 に 4** |
| 図の中で重複するラベル | read 3 種・io 1 種 | **本 CR は 1 つも増やさない**（編集 44 の②） |

## B-4. `audit-ch5.py` の直書き値

| 値 | 箇所 | 改定後 |
|---|---|---|
| `34` | `:43` / `:44` / `:49`（2 語）/ `:76` / `:88` の 5 か所 | **38** |
| `8` | `:45` / `:168` | **9** |
| `57` | `:135` / `:138` / `:139` の文字列 | **71** |
| `6` | `:56` | **7** |
| `FRAMEWORK` | `:99-101` | **＋`DomScreenSurface`** |
| `18`（`:80`）/ `PURITY`（`:128`）/ コメント（`:59`）/ 除外リスト（`:73-75`）/ 正規表現（`:82`） | — | **触らない** |

## B-5. docs/spec 全体の数の主張の全数

| 語 | いま | 改定後 | 拾い残し |
|---|---|---|---|
| `34`（数として） | 設計 `:181` / `:199`×2 / `:219` / `:553` の 5 席 | **全部 38** | 残る 10 件は `CP-34` `T-034` `UF-34` `PI-34` `FR-057` 等の別物 |
| `57`（数として） | 設計 `:183` の 1 席 | **71** | 残る 3 件は `FR-057` `UF-57` `表 T-057` |
| `8 本` | 設計 `:173` / `:219` / `:554` | **9 本**（設計に「8 本」0 件） | A-appendix の 3 件は過去版の記録 —— 直さない |
| `8 ファイル` | 設計 5 か所 | 層をまたぐ 3 か所（`:221` `:238` `:348`）だけ **9 ファイル** | `:228` と `:253` は `EditDocument` の集約 8 ファイル —— 触らない |
| `1 対 1` | 設計 `:199` の 1 席 | 相手が 38 になる | 要求 `:1773` の 1 件は依存線の種別で無関係 |
| `6 つ` | 設計 `:542` / `:554` | **8 つ / 7 つ** | 設計に「6 つ」0 件 |
| `6 コンポーネント` | 設計 `:84` | **7 コンポーネント** | — |
| 辺の `2 本` | 設計 `:557` / `:569` | **3 本** | `:381` `:385` `:389` `:623` は 2 軸・弱い参照で無関係 |
| `CA-1` の `2 つ` | 設計 `:578` | **3 つ** | `:66`「`Entity` を 2 つに割る」は据え置きで正しい |

## B-6. 席が空いていること（全数を docs/spec で確認）

`CP-35` 〜 `CP-38` ／ `PI-35` 〜 `PI-38` ／ `UF-58` 〜 `UF-71` ／ `UT-7` ／ `IF-9` ／ `MN-7`・`MN-8` ／ `U-51` —— **すべて 0 件。** 欠番（`FR-050` `T-030` `T-044` 〜 `T-047` `S-21` `S-52` `S-57` `K-21` `K-66` `F-002` 〜 `F-007`）にも、CR-138 が使った席（表 T-076 / `EP-1` 〜 `EP-13` / `WY-3`）にも当たらない。

---

# C. 当てた後に走らせる手順

**順序を守ること。**

```
1) 58 編集を上の番号順に当てる（ファイルごと・行番号の降順）

2) model.json が JSON として読めることを確かめる
   python -c "import json,io; json.load(io.open('docs/spec/_assets/source/model.json',encoding='utf-8'))"

3) ⭐ 図と一覧を作り直す（model.json を変えたので必須）
   python docs/spec/_assets/source/build.py

4) 章 5 の自己検算
   PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/audit-ch5.py
   → RESULT: PASS を確かめる

5) 16 検査
   bash .claude/skills/spec-graph-check/check.sh
   → 検査 5-10・15 が 0、検査 12 が 0、検査 16 が緑
   → 検査 1-4（StrictDoc 書き出し）の UID 数は 140 のまま、FR の欠番は 50 だけ

6) 刊行物の目視（版 0.25 の事故の再発防止）
   strictdoc export docs/spec --formats=html
   → 表 T-062 / T-063 / T-064 / T-065 / T-070 / T-075 / T-103 が描画され、
     生の ** が 0 であること
```

**手順 3 が作り直すもの**（⚠️ **どれも手で直してはならない**）:
`_assets/source/overview.json` ／ `_assets/source/fig-components.drawio` と `_assets/fig-components.svg` ／ `view-{write,read,io,startup}.drawio` と対応する 4 つの `.svg` ／ `docs/review/components/components.md`（ノード 34 → 38 行・辺 73 → 86 行）。
**`build.py` 自身は編集不要** —— 新しいクラスタ対 0・消えた対 0 なので、`CLUSTER_EDGE_LABELS`（9 件）に対する 2 つの停止条件（「ラベルの無い対」「裏づけの無いラベル」）はどちらも起きない（実測）。

---

# D. 落としたもの（草案 編集 8・9）

**⛔ 草案の 編集 8（`PI-21` に `exportSvg`）と 編集 9（`UF-39` の純粋性を 2 つに）は載せなかった。**

**理由 —— 本設計自身の `R7.9` に反する。** 設計 `:193` が「**純粋性はユニットを割る基準である**（`R7.9`）—— **純粋な側と非純粋な側が同じコンポーネントにあるとき、別のファイルへ出す**」と定め、`:302` が「`semi-pure-b` と `non-pure` が同じユニットに載ることは `R7.9` に反しない。**同条項が別ファイルへ分けよと求めるのは純粋な側と非純粋な側**であり、`semi-pure-b` は非純粋な側だからである」と明記している。`image-exporter.ts` 1 本に `pure`（`exportSvg`）と `semi-pure-b`（`exportPng`）を並べるのは、まさにその**禁じられた組み合わせ**である。`audit-ch5.py` は素通りするが（同スクリプト冒頭が「Green ... does not mean the design is right」と断っている）、`R7` を当てるレビューで必ず落ちる。

**落として何も失われない。** 編集 30（`CP-21` の責務）は単独で成立し、組み立てと切り落としは `exportPng` の内側で果たせる。**この CR の固定値 57 → 71 も守られる。**

**代案（採らなかった）**: (b) `export-svg.ts` を別ユニットに割る —— ユニット 72、表 T-063 に `UT-8`、編集 58 に `ImageExporter`（3）が要り、**固定値 71 を割る。** (c) `exportSvg` を `CP-19 SvgRenderer` に置く —— `svg-renderer.ts` は既に `pure` なので `R7.9` は通るが、編集 30 で組み立てを `CP-21` に置いたばかりなので持ち主が分かれる。

**落としたことの波及**: 編集 57（変更履歴 0.34）から `exportSvg` の句を外し、「⚠️ **書き出しの組み立てと切り落としの持ち主を `ImageExporter`（`CP-21`）にした** —— 表 T-076 が「描く」と定めた UI パーツを誰が組み立てるかが決まっていなかった。」に書き替えた（草案の「表 T-024 の `IO-3` に対応する公開メンバが無かった」は `exportSvg` を足さない以上そのまま残せない）。**上の編集 57 の全文に反映済み。**

---

# E. 草案から直した 6 件

| # | どこ | 草案 | 直した内容と理由 |
|---|---|---|---|
| 1 | 編集 30（`CP-21`） | 「表 T-076 が「**入る**」と定めた**領域**」 | 「表 T-076 が「**描く**」と定めた **UI パーツ**」。実測で 表 T-076 の列見出しは `描くか`、`WY-3` は「表 T-076 が「描く」とした UI パーツ」。同義語を増やさない |
| 2 | 編集 29（`CP-25`） | **編集が 1 本も無かった** | 補った。編集 4（ADR-001 改称）・編集 2（`CA-1`）・編集 44（`SingleHtmlShell → ScreenRegions`）を当てると、その辺を裏づける責務が 表 T-062 から消える |
| 3 | 編集 33（`LY-4`） | **編集が 1 本も無かった** | 補った。`CP-37` の仕事が `LY-4` の列挙のどれにも当たらない |
| 4 | 編集 44（辺 13 本） | 13 本目の理由が 表 T-076 の `EP-2` | `EP-1` / `EP-3` に。実測で `EP-2` は `Time Ruler`（`SvgRenderer` 側） |
| 5 | 編集 44（ラベル） | `frame` / `presentation values` / `what is selected` | `screen frame` / `outer presentation` / `selection to show` に。**そのままだと 図 F-015 の中で同じ札が 2 〜 3 本ずつ並ぶ**（実測）。F-015 は CR-139 が札の重なりを直したばかりの図である |
| 6 | 編集 56（`U-51`） | 「`tbl-settings.md` の 表 T-203 と 表 T-104 の …」／「（表 T-062 の `CP-36`）」 | ⚠️ **表 T-104 は `tbl-settings.md` ではなく `tbl-glossary.md`（＝この行と同じファイル）にある**（実測）。「`tbl-settings.md` の表 T-203 と、**本書の**表 T-104」に直した。あわせて **表 T-062 への指しを外した** —— 用語集は 表 T-002 〜 T-052（要求側）しか指しておらず、Chapter 5 の表を指す前例が 1 件も無い。名前の正は用語集、定義は `CP-36` / `PI-36` / `UF-59` が持つので、指さなくても失われない |

**変えなかったもの**（草案の判断が実測で正しかった）: 編集 31 で `CP-18` の責務を「描画領域の入力」に狭めないこと（`FR-070` の 表 T-036 が `SK-13` 〜 `SK-15` を持つ）／ 表 T-063 の `UT-7` に宣言ファイル `screen-surface.ts` を書かないこと（`:221` の規則・`UT-4` の前例）／ 編集 21 の折り返し（1 行に足すと 94 桁）／ `:66` を据え置くこと。

---

# F. 残る懸念と、利用者の判断が要ること

## F-1. ⭐ 利用者の判断が要るのは 1 件だけ —— `ScreenState` の `shape`

`model.json` の 編集 46 で `ScreenState` の `shape` を **`component`** にしてある（草案どおり）。ただし **既存の「文書に保存しない実行時の値」である `Selection` と `DialogueLog` は `rectangle`** であり、`ScreenState` は同じ性質・同じ `documentModel` クラスタである。

- **機械検査には影響しない**（`audit-ch5.py` は `shape` を読まない。設計 `:135` も「箱はコンポーネントである」と書く）。
- ただし**同種の 3 つが図 F-013 の中で 2 通りの形になる。**
- `rectangle` に揃えるなら 編集 46 の該当 1 語を変えるだけでよい。**それ以外はどこも動かない。**

## F-2. 走らせてみるまで分からないもの（読むだけの制約で未実行）

`build.py` の `place_labels` は、辺のラベルを箱と既に置いたラベルから離せないと `build: no clear position for edge label(s)` で止まる。**新しいラベルは 図 F-015 に 9 本・図 F-017 に 4 本・図 F-014 と F-016 に 1 本ずつ入る。** F-015 は CR-139 が候補位置を 4 つ足してやっと通した図なので、**ここは通らない可能性が最も高い。**
止まったときの手当ては 2 つ —— ① 編集 44 のラベル文字列を短くする（例 `where each part sits` → `part rects`、`regions once per frame` → `regions per frame`）／ ② CR-139 と同じく候補位置を足す。全ラベルは既に 24 文字以下にしてある。
なお **CR-139 の積み残し**（`presentation values` が箱の縁に 35px ほど掛かる。`build.py` の折れ線長さ比と draw.io の直交経路の食い違い）は本 CR でも解消しない。

## F-3. 低優先（この CR で決めても、次に送ってもよい）

- **ADR-001 の `Context`（`:563`）が改題を支えていない。** 現行の `Context` は 表 T-068 の 11 段を必要とする 4 経路だけを論拠にしており、編集 4 の題が掲げる「画面の矩形」に触れていない。`ScreenRegions` にも読み手が 2 つある（`CP-18` と `CP-37`）ので同じ論法は立つ。**1 文足すか、題を据え置くかを決めておくとよい。**
- **図 F-015 の前置き（`:149`）。** 「SVG を作るコンポーネントは `Adapter` にあるが、`UseCase` を通らずに `layoutEngine` を直接読む」は SVG の話しかしていないが、編集 38 の後この図には画面まわりの 4 コンポーネントが現れる。**機械検査は掛からない。**
- **`docs/review/components/components.md` と `overview.json` は生成物である。** 草案 58 編集のどこにもこれらを手で直す項目は無い（確認済み）。**生成物を手で直す編集は 1 本も混じっていない。**

## F-4. 参考 —— 草案の記述で数が合わなかったもの（成果物には影響しない）

- 草案 §C の柱書き「この 22 編集」は §C の表の行 17 〜 35 の **19 本**である。
- 草案 §M の「`"source": "InputCommandTranslator",` 単独では 6 件」は実測 **5 件**（2 行そろえて掴めば 1 件、という結論は変わらない）。
- 草案 §G の「「画面の状態」の出現は tbl-settings.md の … 計 8 か所」は、**tbl-settings.md に 2 か所・tbl-glossary.md（表 T-104）に 6 か所**の合計であり、2 ファイルにまたがる。

---

**⚠️ この作業ではリポジトリを 1 文字も編集していない。** 検証はすべて読み取りと、scratchpad の写し（`.../scratchpad/sim2/` と `.../scratchpad/v/sim.py`）上での模擬適用で行った。