# CR-715 —— `Schedule Canvas` の描画の層はウインドウ全体を覆い、範囲は `App Header` の下から始まる

> 状態: **適用済**（2026-10-08、当てる体。基の木 `acadb8f3`）。仕様の字・試験・台帳を 1 つの変更で当てた。**コードは変えない**（製品の振る舞いの違いは 0。5 節）。
> ID の帯: 番号 `CR-715` だけ（調整役が配った）。台帳の新しい行（`DFC`・`PND`・`JDG`）は使わない。仕様の新しい識別子は無い。
> 当てる裁定: `JDG-1738`（利用者、2026-10-08 夜、`DFC-2143` の ②）。覆す裁定は無い。
> 閉じるもの: `DFC-2143`（仕様だけを直した。`DFC-2068` と同じ扱いで `実測待ち`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定（全文は `docs/development-records/rulings.md` の該当行）

| 裁定 | 何を決めたか | 本書での扱い |
|---|---|---|
| `JDG-1738` | コードは変えない。`Schedule Canvas`（`U-32`）の範囲は `App Header` の下の縁からウインドウの下の端まで（`UZ-9`・`WB-3` のまま）。ページの中の `data-role="Schedule Canvas"` の要素はウインドウ全体を覆う描画の層であり、範囲とは別である。範囲を測る試験は見出しの下の縁から測る | E-01〜E-05 |

### 0.2 裁定の鎖（rulings.md を「Schedule Canvas」「U-32」「UZ-9」「WB-3」「data-role」「App Header の下」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `CR-669` が当てた `FR-036` の最大化の範囲 | ヘルプを最大化したときに占める範囲は `Schedule Canvas` の全体 | 保つ。その「全体」が何を指すかを `U-32` が持つ |
| `JDG-1738` | 上のとおり | 本書が当てる |

⭐ 本書が「覆された」と印す行は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- 新しい振る舞いで進めるものは無い（コードは変えない）。支えるのは `GL-006`（`CH-4`）—— 最大化した窓や動かした窓が `App Header` の入口を隠さない（`UZ-9`・`WB-3`）という読みを、仕様だけを読む試験が誤らずに持てるようにする。
- 仕様とコードの一致（`DFC-2143`）—— 仕様だけを読む試験が、DOM の要素の箱を範囲と読んで赤くなる道を塞ぐ。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1a`（矛盾する要求が無いか）** —— 表 T-006a の `W-4` は「UI パーツの確定名を運ぶ `data-role` は 表 T-103 の名をそのまま書く」と言う。読み手は、その名を持つ要素の箱がその UI パーツの範囲だと読める。一方 `UZ-9`・`WB-3` は `Schedule Canvas` を `App Header` の下からと読む。コードの殻（`src/framework/single-html-shell/single-html-shell.ts` の `boot` が `SCHEDULE_CANVAS_ROLE` の要素を `AT_WINDOW_ORIGIN` で敷く）は要素を (0, 0) から敷き、範囲は `src/entity/layout-engine/screen-regions/screen-regions.ts` の `regionsFromScreen` が `App Header` の高さ（と `U-67` の帯）の下から解く。⇒ 2 つの読みのあいだに書かれた文が無かった。`U-32` に範囲と描画の層の別を書き、`W-4` に注を足した。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 範囲の定義は 表 T-103 の `U-32` の行に 1 か所だけ置き、`UZ-9`・`UZ-12`・`WB-3`・`W-4` はそこを指す | 表が SSOT。指す側が範囲を書き直すと 2 つ目の定義になる | 無い |
| X-2 | `U-67` の帯が出ているあいだは、範囲は帯の下の縁から始まると `U-32` に書く | `TV-11` が「その高さだけ `Schedule Canvas` を下げる」と既に言い、`regionsFromScreen` も `topBandHeight` の下から解く | 無い |
| X-3 | 新しい `（MUST NOT）` は 1 つ（`U-32` の「範囲を要素の箱から読んではならない」）。逐語の試験を `tests/contract` に置き、範囲を箱から読んでいた 2 本の出荷ビルドの試験を見出しの下の縁から測る形に直した | `JDG-1738` の「範囲を測る試験は見出しの下の縁から測る」 | 無い |
| X-4 | 範囲を引く既存の `（MUST）` の文（`FR-036` のヘルプの最大化、`FR-066` の対話欄）の字は変えない | どちらも「`Schedule Canvas`（`U-32`）の全体」と言い、`U-32` が範囲を持つので読みが定まる。字を変えると逐語の試験が赤くなるだけ | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 変える所 | 編集 |
|---|---|---|
| `Schedule Canvas` の範囲と描画の層 | `docs/spec/_assets/tbl-glossary.md` の 表 T-103 の `U-32` | E-01 |
| `data-role` の名と範囲の別 | `docs/spec/01-04-requirements.md` の 表 T-006a の `W-4` | E-02 |
| 対話欄の重ね順の理由 | 同書の 表 T-337 の `UZ-9` | E-03 |
| 最背面の層 | 同書の 表 T-337 の `UZ-12` | E-04 |
| 最大化の範囲 | 同書の 表 T-335 の `WB-3` | E-05 |
| 試験 | `tests/contract/cr-715-the-schedule-canvas-range-starts-below-the-app-header.contract.test.ts`（新）・`tests/system/cr-597-the-search-panel-word-jump-and-grab.test.ts`・`tests/system/cr-660-the-two-table-windows-on-the-shipped-build.test.ts` | 9 節 |
| 台帳 | `DFC-2143`・`JDG-1738`・変更履歴 4.14 | E-06 |

数: 要求 ±0。表の行 ±0。表 ±0。設定値 ±0。図 0。`（MUST）` の印 ±0。`（MUST NOT）` の印 ＋1（`U-32`）。

---

## 2. 新しい識別子

無い。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| 無い（字は足すだけ。消す文は無い） | —— |
| 試験 `cr-597` の SV-11 と `cr-660` の SV-7 の 2 本が `[data-role="Schedule Canvas"]` の箱を範囲として読む | 見出し（`U-31`）の下の縁からウインドウの下の端までを範囲として測る（`cr-669` の `scheduleCanvasBox` と同じ形） |

---

## 4. 書き直す所（当てた文）

### E-01 —— 表 T-103 の `U-32`

旧:

```
（画面に出ない構造名。<br>日本語を当てない）
```

新（旧の字の後に足す）:

```
（画面に出ない構造名。<br>日本語を当てない）。
範囲は、`App Header`（`U-31`）の下の縁からウインドウの下の端までの、ウインドウの全幅とする —— 表示の絞り込みの帯（`U-67`）が出ているあいだは、その帯の下の縁から（`01-04-requirements.md` の 表 T-353 の `TV-11`）。
利用者が見て押すのはこの範囲であり、仕様が `Schedule Canvas` の全体・中・角と書くときもこの範囲を指す（同書の 表 T-337 の `UZ-9`、表 T-335 の `WB-3` ほか）。
⚠️ ページの中で `data-role` に `Schedule Canvas` を持つ要素は、ウインドウの左上の角 (0, 0) からウインドウ全体を覆う描画の層であり、`App Header` の帯の上も含む —— 範囲とは別である（利用者が定めた）。
⛔ `Schedule Canvas` の範囲を、`data-role` に `Schedule Canvas` を持つ要素の箱から読んではならない（MUST NOT） —— 範囲は `App Header` の下の縁から測る
```

`U-33` の「（同上）」は、`U-35` と同じく括弧の中の字を指すので変わらない。

### E-02 —— 表 T-006a の `W-4`

「訳すと同じものに 2 つ目の綴りができる」の後に足す:

```
⚠️ 名を運ぶ要素の箱は、その UI パーツの範囲と同じとは限らない —— `Schedule Canvas` の要素はウインドウ全体を覆う描画の層であり、範囲は `App Header` の下の縁から始まる（`_assets/tbl-glossary.md` の `U-32`）
```

### E-03 —— 表 T-337 の `UZ-9`

「`App Header` と重ならない」の後に足す:

```
（`Schedule Canvas` の範囲は `App Header` の下の縁から始まる —— `_assets/tbl-glossary.md` の `U-32`）
```

### E-04 —— 表 T-337 の `UZ-12`

理由の欄の後に足す:

```
⚠️ `data-role` に `Schedule Canvas` を持つ描画の層はウインドウ全体を覆い、`App Header` の帯の奥にも敷かれる —— 最背面なので、その帯では `App Header`（`UZ-8`）が手前に在る。
利用者が見て押す範囲は `_assets/tbl-glossary.md` の `U-32` のとおり `App Header` の下の縁から始まる
```

### E-05 —— 表 T-335 の `WB-3`

「`Schedule Canvas`（`U-32`）の全体」の後に足す:

```
 —— `App Header` の下の縁からウインドウの下の端まで。
⚠️ ページの中で `data-role` に `Schedule Canvas` を持つ描画の層の箱ではない
```

### E-06 —— 台帳

- `DFC-2143`: `仕様待ち` → `実測待ち`（仕様だけを直した。コードは変えていない。`DFC-2068` と同じ扱い）。
- `JDG-1738`: `適用済 —— U-32・W-4・UZ-9・UZ-12・WB-3`。
- `docs/development-records/changelog.md` に 1 行（4.14。番号が重なれば調整役が付け直す）。

---

## 5. 継ぎ目（コード）

| 所 | 何をしているか |
|---|---|
| `src/framework/single-html-shell/single-html-shell.ts` の `boot` | `SCHEDULE_CANVAS_ROLE` の要素を `AT_WINDOW_ORIGIN`（`position:fixed;left:0;top:0;right:0;bottom:0;`）で敷く。変えない（E-01 の描画の層） |
| `src/entity/layout-engine/screen-regions/screen-regions.ts` の `regionsFromScreen` | `scheduleCanvas` を `App Header` の高さと `topBandHeight` の下から解く。変えない（E-01 の範囲） |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` の重ね順 | 描画の層は `screenParts` の外、最背面。`App Header` は `UZ-8` で手前。変えない（E-04） |

毎フレームの経路に触れない。`perf-pending.md` の行は要らない（検査 66）。

---

## 6. グラフ（`acadb8f3` の上、`impact.py U-32 UZ-9 UZ-12 WB-3 W-4`）

| 起点 | 要求 / 参照 | 本書の扱い |
|---|---|---|
| `U-32` | 5 件 / 9 か所（`W-4`・`FR-152` 2・`FR-151` 2・`FR-080`・`FR-066`・`FR-036` 2） | `W-4`・`UZ-9`・`UZ-12`・`WB-3` に `U-32` を指す字を足した。`SV-9`・`TV-11`・`EP-13`・`FR-066`・`FR-036` の字は変えない（X-4） |
| `UZ-9` | 1 件 / 2 か所（`FR-066`・`U-32`） | 変えない |
| `UZ-12` | 1 件 / 1 か所（`FR-110`） | 変えない |
| `WB-3` | 2 件 / 11 か所（`FR-151`・`FR-036`） | 変えない。範囲の読みが定まるだけ |

---

## 7. 数の予測と実測

| 数 | 前 | 後 | 測り方 |
|---|---|---|---|
| `（MUST）`・`（MUST NOT）` の印 | 2905 | 2906 | 検査 39 の `OK` の行（`U-32` の 1 つ） |
| 検査 39 の逐語に持たれている印 / 持たれていない印 | 761 / 2144 | 762 / 2144 | 同じ行。新しい印は `tests/contract/cr-715-…` と `tests/system/cr-597-…`・`cr-660-…` が逐語で持つ。持たれていない数は基準線のまま |

---

## 8. 波

1 つの波で足りる。

---

## 9. 仕様の外で直すもの

- 試験（新）: `tests/contract/cr-715-the-schedule-canvas-range-starts-below-the-app-header.contract.test.ts` —— `U-32` の `（MUST NOT）` と範囲・帯・層の文、`WB-3` の足した文を逐語で持ち、`regionsFromScreen` が範囲を `App Header` の下の縁（帯が在れば帯の下の縁）から解くことを確かめる。
- 試験（直す）: `tests/system/cr-597-the-search-panel-word-jump-and-grab.test.ts` の SV-11 と `tests/system/cr-660-the-two-table-windows-on-the-shipped-build.test.ts` の SV-7 の 2 本は、`[data-role="Schedule Canvas"]` の箱を範囲として読んでいた（箱の上端は 0 なので、範囲の上の端を確かめられず、押す点が見出しの帯に入りうる）。見出しの下の縁から測る `scheduleCanvasRange` に替えた。
