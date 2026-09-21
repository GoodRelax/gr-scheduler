# CR-550 — `Dual Cursor` の 2 つの日付と期間を、ポインタのそばに示す

> ⭐ **状態: 当てた（2026-09-22）。** 11 節の問いに前に立つ者が答え（11.1 節）、その答えで E-01 と E-02 を直してから当てた（4.1 節）。コードも同じ巡で直した（9 節、13 節）。
> 起草の状態: 起草（2026-09-22）。11 節の問いに前に立つ者が答えてから、4 節の編集を当てる。
> 読んだ木: `4015736e`（`origin` の `006aefbc` の上に台帳と `CR-541` の仕様を載せた先端）。行番号・行数・参照の数は、すべてこの木で測った（測り方は 12 節）。
>
> **閉じるもの**: 利用者の 2026-09-22 の答え F6（scratchpad `user-words.md` の第 4 通）と第 5 通の「F6 : B 年・月・日 という意味で yyyy/m/d (xx days)」。
> ⛔ **覆すもの**: 見本の問い S3 の推奨 ①（「ルーラーの帯の中央に暦日で『14 日』」、`JDG-302`）と、それを当てた `CR-541` の E-68（表 T-029a の `DC-3`）・E-55（辞書の節 `dualCursorSpan`）・E-63 の 1（生成器の `DUAL_CURSOR_SPAN_ROWS`）、およびそれを描いた `CR-544` の `svgFromSchedule` の引数 `dualCursorSpanWord`（`799e3e8a`）。
> 裁定の行（`rulings.md`）の記入は本書の仕事ではない（`CR-549` か前に立つ者）。

利用者の逐語（F6）:

```text
|⇔|を選択した時、マウスカーソルに以下の情報を小さく表示しろ

カーソルAの日付: yyyy/m/d
カーソルBの日付: yyyy/m/d
カーソルA-Bの期間: yyyy/m/d
```

第 5 通: 「F6 : B 年・月・日 という意味で yyyy/m/d (xx days)」。前に立つ者の読み: 3 行目は年・月・日を `y/m/d` の形で書き、括弧に日数を添える（例 `0/0/14 (14 days)`）。日数は差で数える（4/1 と 4/15 は 14）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-006`**（`CH-4`、説明を読まずに操作できる）—— 測る道具を選んだ瞬間から、何を測っているか（2 つの日付）と答え（期間）が、目を置いているポインタのそばに出る。ルーラーの帯まで目を移さずに読める。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・重複がない。唯一の正がある）** —— `DC-3` の「置く所は、タイムルーラーの帯の中の、2 本の線の中点」（`CR-541` の E-68）と F6 の「マウスカーソルに」が両立しない。`DC-3` を書き直して 1 つにした（E-01）。辞書の `dualCursorSpan` も同じ所を指していたので、節ごと置き換えた（E-02）。
- **`R1.4`（異常系・境界値）** —— 月末をまたぐ期間（1/31 から 2/28）、うるう日（2/29 から翌年の 2/28）、同じ日、A が B より後、線が 1 本しか無いとき、ポインタが日程表の外にあるとき。すべて `DC-3` に書いた。
- **`R2`（命名）** —— 新しい表・行 ID・接頭辞は 0。辞書の節の名は `dualCursorSpan` → `dualCursorReadout`（期間だけでなく 2 つの日付も持つので、名を中身に合わせた）。

### ③ 利用者に問わずに決めたこと

⭐ 下は根拠を添えて問わずに決めた（あとから覆せる）。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | カーソル A は `date1`、カーソル B は `date2` とする（左右の位置ではない） | `DC-1` が既に `date1` を最初に追従する側と定めている。`DC-2` で追従する側が入れ替わっても、名が線に付いたまま動かない | A が右にあることもある |
| 決定 2 | 期間は、早いほうの日付から遅いほうの日付へ数える。A が B より後でも同じ値 | 利用者の例は差であり、向きを持たない（「4/1 と 4/15 → 14」） | 向きは示さない |
| 決定 3 | 月の数え方: 早い日付を k か月進めた日（その月に同じ日が無ければ月末の日）が遅い日付を越えない最大の k を月数とし、残りを日とする | 「年・月・日」を一意に決める規則が要る。月末の日へ寄せる読みは、1/31 から 2/28 を「1 か月」と読ませる | 1/31 から 3/1 は `0/1/1` になる（2/28 から 1 日） |
| 決定 4 | 日付の書き方は `yyyy/m/d`（年 4 桁、月と日は 0 を詰めない） | 利用者の字（`yyyy/m/d`）と、前に立つ者の例（`2026/4/1`）。期間の年は 0 を詰めない（例 `0/0/14`） | `EZ-6` の説明は `YYYY-MM-DD` のままなので、画面に 2 つの書き方が並ぶことがある |
| 決定 5 | 置き方は `IN-3` が `EZ-6` の説明に定める例外と同じ（左上の隅をポインタの点、ポインタを受け取らせない）。ただし待たずに出し、ポインタと一緒に動き、ポインタが動いても消えない | 前に立つ者の指示（「IN-3 / EZ-6 の例外を再利用できるなら」）。受け取らせないのは、`DC-2` のクリックを奪わないためである | 字の上をクリックしても線は置ける（字は押せない） |
| 決定 6 | 字の大きさは `S-204`（ツールチップの係数） | F6 の「小さく」。画面の字で「小さく」の値を持つのはこの行である | — |
| 決定 7 | ポインタが `Row Area` とタイムルーラーの上に無いあいだは示さない | 追従する線はポインタの横の位置に立つ（`DC-1`）。パネルやヘッダーの上では追従する日付が無い | パネルの上では期間を読めない |
| 決定 8 | 日付の決まっていない側は `—` で示し、期間の行も `—` にする | 「線が 1 本しか無いとき」を塞ぐ。`—` は言語で変わらない記号なので辞書に持たない（`EZ-6` の「記号も数字も言語で変わらない」と同じ扱い） | — |
| 決定 9 | 書き出し（表 T-076）には出さない | 表 T-076 の `EP-12` が操作の状態を描かないと定めており、ポインタの位置は操作の状態である。`EP-6` が描くのは 2 本の線そのもの | 書き出した絵に期間は残らない（`CR-541` の札も書き出しに出していなかったので、失うものは無い） |

---

## 1. 範囲 —— 項目ごとの行き先

| 項目 | 仕様で変える所 | 4 節の編集 |
|---|---|---|
| F6 の 3 行と置き方 | 表 T-029a の `DC-3` | E-01 |
| 語（3 行の型） | `_source/display-words.json` の節 `dualCursorSpan` → `dualCursorReadout` | E-02 |
| 生成器 | `tools/generate_display_words.py`（形で示す） | E-03 |

**数**: 編集の単位は 3（E-01 〜 E-03）。

---

## 2. 新しい識別子

新しい表・行 ID・接頭辞・要求 ID は 0。辞書の節の名 `dualCursorReadout` を 1 つ立て、`dualCursorSpan` を消す（2026-09-22、`4015736e` と 64 のブランチの先端で `dualCursorReadout` は 0 件）。

---

## 3. ⛔ 消すものを先に列挙する

| 消すもの | 所 | 編集 / 直す者 |
|---|---|---|
| `DC-3` の「2 本の間の日数を示す … 置く所は、タイムルーラーの帯の中の、2 本の線の中点 … 例: `14 日`」（`CR-541` の E-68） | `01-04-requirements.md:4867` | E-01 |
| 辞書の節 `dualCursorSpan`（`{n} 日` / `{n} days`、`CR-541` の E-55） | `_source/display-words.json:3596-3604` | E-02 |
| 生成器の `DUAL_CURSOR_SPAN_ROWS` とその 3 か所 | `tools/generate_display_words.py:227-231` ・ `:397` ・ `:452` ・ `:536` | E-03 |
| 生成物の節 `dualCursorSpan` | `src/adapter/screen-renderer/display-words.json:3959`（生成物。手で直さない） | `npm run gen` |
| ⛔ `CR-544` の描画（`799e3e8a`。この木には無く、ブランチ `worktree-agent-ae1ba88d9171ca82b` と `worktree-agent-ae7553177d373d004` の先端に在る） | 下の表 | 実装する者（9 節） |

**`CR-544` が足し、本書で要らなくなるコード**（`worktree-agent-ae7553177d373d004` の先端 `0e8b5a20` の行番号）:

| ファイル | 行 | 消すもの |
|---|---|---|
| `src/adapter/svg-renderer/schedule-overlays.ts` | `:51` | `OverlaysInput` の `readonly dualCursorSpanWord: string \| null` |
| 同 | `:100-122` | 関数 `dualCursorSpanSvg`（と、その上の `// see DC-3, FR-038` ・ 2 行の `// WHY:`） |
| 同 | `:124-156` | `dualCursorParts` の戻り値の `span`（`lines` だけを返す形へ戻す）と、分割代入の `dualCursorSpanWord`、`const band = regions.timeRuler` |
| 同 | `overlayParts` の戻り値 | `rulerParts: cursorParts.span` |
| `src/adapter/svg-renderer/svg-renderer.ts` | `:173-174` | `// see FR-080, T-020, T-076, DC-3` の `DC-3` と、`// WHY: dualCursorSpanWord is DC-3's word …` |
| 同 | `:193` | `svgFromSchedule` の末尾の引数 `dualCursorSpanWord: string \| null = null` |
| 同 | `:308` 付近 | `overlayParts({ ...drawing, dualCursorSpanWord })` → `overlayParts(drawing)`、および `...overlays.rulerParts` |

- ⭐ `svgFromSchedule` を呼ぶ 2 か所（同先端の `frame-loop.ts:2206` ・ `:2583`）は、この引数を渡していない（既定の `null` のまま）。呼び手は直さなくてよい。
- ⭐ 数を刷る試験は、そのブランチの `tests/` に 0 件である（`dual-cursor-span` を `git grep` して 0）。
- ⚠️ `CR-541` の 11 節の宿題 12（「表 T-020 に `DC-3` の札の行を足すか」）は、本書で消える —— 読み出しは SVG の層ではなく、ツールチップと同じ画面の上の層に出る（決定 5）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**（`CR-541` と同じ）: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**。旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊である。仕様書へ新しく書いた文には `**` を 1 つも使っていない。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧（`:4867`、表 T-029a の `DC-3`）
```text
| DC-3 | 測る | 2 本の間の日数を示すこと（MUST）。<br>⭐ 日数は暦日で数え、2 本の日付の差とすること（MUST） —— `FR-047` の稼働日の数え方とは別である。<br>⭐ 置く所は、タイムルーラーの帯の中の、2 本の線の中点とすること（MUST）。<br>語は `FR-038` の辞書が持つ（例: `14 日`） |
```
新
```text
| DC-3 | 測る | 本モードにいるあいだ、ポインタのそばに 3 行を小さく示すこと（MUST）: 1 行目にカーソル A（`date1`）の日付、2 行目にカーソル B（`date2`）の日付、3 行目に A と B のあいだの期間。<br>⭐ 追従している側の日付は、その線がいま立っている日とすること（MUST） —— 線と字が同じ日を指す。<br>日付は `yyyy/m/d` と書くこと（MUST）（年は 4 桁、月と日は 0 を詰めない。例: `2026/4/1`）。<br>⭐ 期間は、2 つの日付のうち早いほうを E、遅いほうを L として、`y/m/d (n days)` の形で書くこと（MUST）。<br>n は E から L までの暦日の差とする —— `FR-047` の稼働日の数え方とは別である。<br>月数 k は、E を k か月進めた日（その月に E と同じ日が無ければ、その月の末日）が L を越えない最大の整数とする。<br>y は k を 12 で割った商、m はその余り、d は E を k か月進めた日から L までの暦日の差とする。<br>例: 4/1 と 4/15 は `0/0/14 (14 days)`、2026/1/31 と 2026/2/28 は `0/1/0 (28 days)`、2026/1/31 と 2026/3/1 は `0/1/1 (29 days)`、2024/2/29 と 2025/2/28 は `1/0/0 (365 days)`、同じ日は `0/0/0 (0 days)`。<br>A が B より後の日でも、期間は同じ値とする。<br>日付が決まっていない側は、その行の日付と期間の行を `—` で示すこと（MUST）。<br>⭐ 置き方は、表 T-028 の `IN-3` が `FR-092` の `EZ-6` の説明に定める例外と同じとすること（MUST） —— 左上の隅をポインタの点に置き、ポインタを受け取らせない。<br>`EZ-6` と違い、待たずに出し、ポインタと一緒に動かし、ポインタが動いても消さない。<br>文字の大きさは `_assets/tbl-settings.md` の `S-204` とする。<br>ポインタが `Row Area` とタイムルーラーの上に無いあいだは示さない。<br>⛔ 書き出し（表 T-076）に出してはならない（MUST NOT） —— 操作の状態である（`EP-12`）。<br>語は `FR-038` の辞書が持つ（例: `カーソルAの日付: 2026/4/1`） |
```

⚠️ E-01 の「本モード」は表 T-029a の `DC-1`（入る）から `DC-4`（出る）までのあいだである。F6 の「|⇔|を選択した時」の `|⇔|` は、このモードに入る入口（表 T-109 の `IC-45`）の図形である。

<!-- EDIT id=E-02 file=docs/spec/_source/display-words.json -->
旧（`:3596-3605`、ファイルの終わり）
```text
 "dualCursorSpan": [
  {
   "rowId": "DC-3",
   "text": {
    "ja": "{n} 日",
    "en": "{n} days"
   }
  }
 ]
}
```
新
```text
 "dualCursorReadout": [
  {
   "line": "a",
   "text": {
    "ja": "カーソルAの日付: {date}",
    "en": "Cursor A: {date}"
   }
  },
  {
   "line": "b",
   "text": {
    "ja": "カーソルBの日付: {date}",
    "en": "Cursor B: {date}"
   }
  },
  {
   "line": "span",
   "text": {
    "ja": "カーソルA-Bの期間: {y}/{m}/{d} ({n} days)",
    "en": "A-B: {y}/{m}/{d} ({n} days)"
   }
  }
 ]
}
```

- ⭐ ja の 3 行は利用者の字（F6 と第 5 通）そのものである。`yyyy/m/d` の所を差し込みの印にした: `{date}` は `yyyy/m/d` で書いた日付、`{y}` `{m}` `{d}` `{n}` は `DC-3` の y・m・d・n。
- ⛔ **en の 3 行は前に立つ者の提案である**（「Cursor A: 2026/4/1」「Cursor B: 2026/4/15」「A-B: 0/0/14 (14 days)」）。利用者の語を待つ（原稿の `$comment` は、体が語を発明することを禁じている。11 節の問い 2）。
- ⚠️ ja の 3 行目の `(14 days)` は、利用者が ja の字として書いたとおり英語の `days` を残した（11 節の問い 3）。
- ⚠️ 差し込みの印は、生成器が知らない —— 生成器は字を運ぶだけで、置き換えは読む側（画面の描き手）が行う（既存の `{n}` と同じ扱い）。

<!-- EDIT id=E-03 file=(tools。形で示す) -->
旧
```text
(tools/generate_display_words.py as on 4015736e: DUAL_CURSOR_SPAN_ROWS = ('DC-3',) at :231,
 'dualCursorSpan': list(DUAL_CURSOR_SPAN_ROWS) at :397,
 'dualCursorSpan': ('rowId', ('text',)) at :452, and 'dualCursorSpan' in the tuple at :536)
```
新
```text
tools/generate_display_words.py
  1. Replace the held key tuple and its comment (:227-231):
       # The three lines DC-3 of table T-029a (MUST) shows beside the pointer while the
       # Dual Cursor mode is on: the date of cursor A (date1), of cursor B (date2), and
       # the span between them. HELD HERE, the same move as SCALE_ECHO_ENDS: DC-3 states
       # the three lines in prose and no table holds them as rows (CR-550).
       # These are KEYS, not words.
       DUAL_CURSOR_READOUT_LINES = ('a', 'b', 'span')
  2. roster entry   'dualCursorReadout': list(DUAL_CURSOR_READOUT_LINES)     (was :397)
  3. key/fields     'dualCursorReadout': ('line', ('text',))                 (was :452)
  4. the held-sections tuple: 'dualCursorSpan' -> 'dualCursorReadout'   (:536; the only
     tuple that names the section)
No new generator: check 27's count of generated artifacts does not move.
```

### 4.1 当てたときに直した所（11.1 節の答えによる）

⭐ 上の E-01 と E-02 は起草の文である。当てた文は、11.1 節の答えで次のように直した（当てた文そのものは `01-04-requirements.md` の表 T-029a の `DC-3` と、辞書の節 `dualCursorReadout` を見よ）。

| 編集 | 直した所 | 答え |
|---|---|---|
| E-01 | 「n が 1 のときは `(1 day)` と書くこと（MUST） —— 表示言語によらない」と、例 `4/1 と 4/2 は 0/0/1 (1 day)` を足した | 問い 4 |
| E-01 | 「ポインタの右に置くと画面の右端に収まらないときは左へ、下に置くと下端に収まらないときは上へ返すこと（MUST）」を足した | 問い 5 |
| E-01 | 「本モードにいるあいだ、`EZ-6` の説明を出してはならない（MUST NOT）」を足した | 問い 1 |
| E-04（新） | `FR-092` の `EZ-6` の末尾に「`Dual Cursor` のモード（表 T-029a の `DC-1` から `DC-4` のあいだ）にいるあいだは、出してはならない（MUST NOT） —— `DC-3` の読み出しが同じポインタの点に出て重なる」を足した。`IN-3` の文は変えていない（例外の置き方は同じで、`EZ-6` が出ない時間が増えるだけ）。同じ commit で `IN-3` と読み合わせた | 問い 1 |
| E-02 | 3 行目を 2 つに割った: `span` は `カーソルA-Bの期間: {span}` / `A-B: {span}`、その `{span}` に入る値を `days`（`{y}/{m}/{d} ({n} days)`）と `oneDay`（`{y}/{m}/{d} ({n} day)`）の 2 つにした。日付の決まっていない側は `{span}` を `—` にする | 問い 2・3・4 |
| E-03 | 生成器の鍵は `DUAL_CURSOR_READOUT_LINES = ('a', 'b', 'span', 'days', 'oneDay')` | 問い 4 |
| E-01 | 検査 46（文の終わりで改行する）に合わせ、「（年は 4 桁 …。例 …）」を「 —— 年は 4 桁、月と日は 0 を詰めない（例: `2026/4/1`）」に、返す向きの 2 文を `<br>` で分けた | — |
| E-05（新） | `05-07-design.md` の表 T-064: `PI-1` に `calendarSpanOf`、`PI-5` に `timeAxisOf` を足した。読み出しを組む `ScreenRenderer` がこの 2 つを読む（検査 26b は、表に無い名がコンポーネントの外へ出ることを許さない） | — |

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

| # | 間 | 継ぎ目（逐語） |
|---|---|---|
| S-1 | 仕様 ↔ 画面の描き手 | 生成される `src/adapter/screen-renderer/display-words.json` の節 `dualCursorReadout`、項は `line` が `a` / `b` / `span` の 3 つ。`{date}` を `yyyy/m/d` の日付で、`{y}` `{m}` `{d}` `{n}` を `DC-3` の値で置き換えて刷る。日付の決まっていない側は行全体ではなく差し込みの所を `—` にする（`カーソルAの日付: —`）、期間の行は `{y}/{m}/{d} ({n} days)` の所をまとめて `—` にする |
| S-2 | 仕様 ↔ 純粋な日付の計算 | `y/m/d` と `n` は `DC-3` の規則（E と L、月末へ寄せる k）。入力は 2 つの暦日、出力は `{ y, m, d, n }`。向きを持たない（`f(a, b) = f(b, a)`） |
| S-3 | 仕様 ↔ SVG の描き手 | 読み出しは SVG に描かない（`svgFromSchedule` の引数は増えず、`CR-544` の `dualCursorSpanWord` が消える）。書き出し（表 T-076）にも出ない |

---

## 6. グラフ（`4015736e` で測った）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 要求 / 参照 | 指している箇所 |
|---|---|---|
| `DC-3` | 0 / 0 | 浮いている。⭐ 書き直しで偽になる所が無い |
| 表 T-029a | — | `FR-016` ・ `FR-082` ・ `FR-075` ・ `FR-104` ・ `FR-039` ・ `FR-031` ・ `FR-029` ・ `NFR-010`。⭐ どれも表を指すだけで、`DC-3` の中身を引いていない |
| `DC-1` / `DC-2` | 1 / 5 ・ 1 / 4 | `FR-048` と状態機械の出来事の表、`FR-082` と 5.x。書き直さない |
| `IN-3` | 4 / 9 | `FR-002` ・ `FR-092` ・ `FR-029` ・ `FR-040`、状態機械の表。書き直さない（`DC-3` が引く） |
| `EZ-6` | 4 / 10 | `FR-002` ・ `FR-048` ・ `FR-080` ・ `FR-040`、`S-124`。書き直さない（問い 1 の答えによっては書き直す） |
| `S-204` | 1 / 1 | `FR-092`。書き直さない（`DC-3` が引く） |
| `FR-047` | 3 / 6 | 書き直さない |

⭐ 導いた条項（決定 1 〜 9）について、届いた行ごとに `rulings.md` を引いた: 当たるのは `JDG-302` の S3（本書が覆す。利用者の F6）と `JDG-300` の Q25（`IN-3` の例外。本書はそれを引くだけで向きを変えない）である。

### 6.2 `induced.py`（9 の種）

種: `DC-1 DC-3 T-029a FR-082 IN-3 EZ-6 FR-092 FR-038 FR-047` —— 解決 9/9、種の中の辺 7、閉路 1: `EZ-6` `IN-3`。
⭐ 本書は 2 つとも書き直さない（`DC-3` から引くだけ）ので、この閉路を 1 つの計画で書く必要は起きない。⚠️ 問い 1 を「`EZ-6` をモード中は出さない」と答えるなら、その 1 文は `EZ-6` に入り、`IN-3` の例外の文と同じ commit で読み合わせる。

---

## 7. 数の予測（`4015736e` で測った）

| 数 | 前 | 後 | 内訳 |
|---|--:|--:|---|
| tables | 181 | 181 | — |
| figures | 25 | 25 | — |
| rows | 2245 | 2245 | `DC-3` を書き直すだけ |
| uids | 162 | 162 | — |
| 接頭辞 | 160 | 160 | — |
| 辞書の節 | — | ±0 | `dualCursorSpan` を消し、`dualCursorReadout` を立てる |

⚠️ `CR-548` と同じ日に当てるときは、`CR-548` の予測（tables 183、rows 2265、接頭辞 161）の上に本書の ±0 が乗る。2 つの変更要求の編集は同じファイル（`01-04-requirements.md`・`display-words.json`）に入るが、旧の塊は重ならない（`CR-548` の E-19 は `scaleEcho` の節の直前、本書の E-02 はファイルの終わり）。

---

## 8. 当てる順と commit の割り方（規則 02 の 3.5 節）

```
0. answer section 11 (question 2 and 3 change the words of E-02)
1. spec   E-01, E-02
2. tools  E-03 -- before npm run gen, or the generator refuses the unknown section
3. npm run gen ; npm run gen:check
4. code in the same wave (section 9), including the removal of CR-544's span
5. strictdoc export docs/spec into a TEMP dir + check-render.py ;
   bash .claude/skills/spec-graph-check/check.sh ; npx vitest run
```

- ⚠️ 1 つの worktree で仕様だけを当てると、生成物の節の名が変わるので、`dualCursorSpan` を読むコード（`CR-544` を合わせた木）が赤くなる。門は合わせた木で打つ。
- ⚠️ 検査 23 は動かない（新しい語はすべて `ja` / `en` の辞書の中にある）。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| 所 | 何をする | 備考 |
|---|---|---|
| `CR-544` のコード（3 節の表） | 消す | `svgFromSchedule` の形が `CR-544` の前に戻る |
| 純粋な日付の計算（S-2） | `{ y, m, d, n }` を返す関数を足す | 置き場は `src/entity/` の日付の単位（実装する者が 表 T-075 の持ち主で決める） |
| `src/adapter/screen-renderer/`（`ScreenView` を組む所。`tooltips.ts` の `tooltipsFromScreenView` と同じ形） | 3 行の字と、置く点（ポインタ）を組む | 入力は `ScreenSession` の `pointer` ・ 追従している側 ・ 文書の `dualCursor`（`S-65`） ・ 表示言語 |
| `src/framework/dom-screen-surface/`（`tooltips-drawing.ts` の `at` の置き方と同じ） | 左上をポインタの点に、`pointer-events:none`、字は `S-204` | ⚠️ 同じ所に `EZ-6` の説明が出る場合は問い 1 |
| 試験 | 3 行の字、`DC-3` の 5 つの例、`—`、書き出しに出ないこと | 仕様だけを読む試験者が書く |
| `docs/development-records/`: `PND-344`（S3）を覆された裁定として記す | 台帳 | `CR-549` の型の記帳 |

---

## 10. ⛔ この変更でやらないこと

- `EZ-6` と `IN-3` の文（問い 1 の答えを待つ）。
- `EZ-6` の日付の書き方（`YYYY-MM-DD`）を `yyyy/m/d` にそろえること —— 利用者の F6 は `Dual Cursor` の読み出しについてだけ述べている。
- 稼働日の数（`FR-047`）を添えること —— S3 の案 ② は採られていない。
- `rulings.md` ・ `pending-decisions.md` ・ `defects.md` ・ `changelog.md`。

---

## 11. 前に立つ者へ返す問い

| # | 問い | 推奨と理由 |
|---|---|---|
| 1 | モード中にタスクの上で止まると、`EZ-6` の説明（`S-124` の後）が読み出しと同じ点に出て重なる | モード中は `EZ-6` の説明を出さない（`EZ-6` に 1 文足す）。`DC-5` がモード中の編集を受け付けないので、タスクの名前を読む必要が薄い。⚠️ `EZ-6` と `IN-3` は閉路を作るので、足すなら 1 つの commit で読み合わせる |
| 2 | en の 3 行（前に立つ者の提案 `Cursor A: {date}` ・ `Cursor B: {date}` ・ `A-B: {y}/{m}/{d} ({n} days)`） | そのまま受けるかを利用者に問う。原稿は体の発明を禁じている |
| 3 | ja の 3 行目の `(14 days)` —— 利用者の字どおり英語の `days` を残すか、`(14 日)` にするか | 利用者の字どおり残す（第 5 通の字）。確認だけ |
| 4 | 日数が 1 のとき、en は `(1 days)` になる | 単数の語を足さない（辞書に数で分ける仕組みが無い）。気になるなら `({n} d)` のような形を利用者に問う |
| 5 | ポインタが画面の右端・下端の近くにあると、3 行が画面の外へはみ出す | `EZ-6` も同じ置き方で同じことが起きる（`tooltips-drawing.ts` は寄せていない）。両方まとめて、はみ出す向きだけ左・上へ返す規則を後の 1 枚で決める案を推す。本書では書かない |

### 11.1 前に立つ者の判断（2026-09-22）

| # | 答え | 理由 |
|---|---|---|
| 1 | モード中は `EZ-6` の説明を出さない（`EZ-6` と `DC-3` に 1 文ずつ足した） | 読み出しと同じ点に出て重なる。`DC-5` がモード中の編集を受け付けないので、タスクの名前を読む必要が薄い |
| 2 | en の 3 行は提案どおり: 「Cursor A: 2026/4/1」「Cursor B: 2026/4/15」「A-B: 0/0/14 (14 days)」 | 利用者が提案どおりと答えた（「英語は治安通り」 = 推奨通り） |
| 3 | ja の 3 行目は利用者の字どおり `days` を残す: 「カーソルA-Bの期間: 0/0/14 (14 days)」 | 利用者の第 5 通の字である |
| 4 | 1 日のときは両言語とも単数の「(1 day)」 | 「(1 days)」は誤りに読まれる。辞書に数で分ける仕組みが無いので、値の語を `days` と `oneDay` の 2 つに持たせた |
| 5 | 画面の右端・下端の近くでは、読み出しをポインタの反対側（左・上）へ返す | 3 行が画面の外で切れると読めない。`EZ-6` の説明の寄せ方は本書では変えない |

---

## 12. 測り方の再現

```
# totals (before)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py | grep "tables="
#   -> tables=181  figures=25  rows=2245  uids=162   (4015736e, 2026-09-22)

# CR-544's span code (not on 4015736e)
git grep -n "dualCursorSpan\|dual-cursor-span\|DUAL_CURSOR_SPAN" worktree-agent-ae7553177d373d004 -- src tests tools
#   -> schedule-overlays.ts :51 :104 :120 :130 :155 ; svg-renderer.ts :174 :193 :308 ;
#      generate_display_words.py :231 :397 :452 :536 ; the generated display-words.json :3959 ; tests: 0

# free name: git grep -n "dualCursorReadout" <every ref> -> 0 (2026-09-22)

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <ID>     # each ID of 6.1
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py DC-1 DC-3 T-029a FR-082 IN-3 EZ-6 FR-092 FR-038 FR-047

# every old block of section 4 occurs exactly once in its file:
#   -> 2 of 2 file edits occur exactly once (tool edits are described, not text edits)
# E-02 applied to a COPY of display-words.json and loaded with json.loads -> loads, with CR-548 E-19 applied first (2026-09-22); the five DC-3 examples and the reversed pair were recomputed by the rule and match
```

---

## 13. 当てたあとに測った数（2026-09-22、`origin/refactor` の `e895456d` の上）

| 数 | 予測（7 節） | 実測 | 備考 |
|---|--:|--:|---|
| tables / figures / rows / uids | ±0 | `tables=184 figures=27 rows=2262 uids=162` | この木の値。`DC-3` と `EZ-6` はセルを書き換えただけで、行は増えも減りもしない |
| 辞書の語 | ±0 の節 | 節 `dualCursorSpan`（1 項）→ `dualCursorReadout`（5 項） | 4.1 節の E-02 |
| 検査 39（MUST の節で試験が逐語で持たないもの） | — | 1334 → 1343（+9） | ⛔ 赤。`DC-3` の新しい MUST と `EZ-6` の MUST NOT である。仕様だけを読む試験者が試験を書くまで閉じない。基線は動かしていない |
| check.sh | — | 赤は 39 だけ | 26b・46・55・60 は直して緑（T-064 に 2 つの名、文の区切り、注記の量、関数の大きさ） |
| vitest | — | display-words の赤が 2 → 1（`dependencyKinds` の節を鍵に持たない既知の赤だけが残る） | t-233 の 2 件と MSPDI の読み込み失敗は既知。`cr-430` の 1 件は全体を回したときだけの時間切れで、単独では緑 |

⭐ 手で確かめた（Playwright、`dist/index.html` を `file://` で開き、`IC-45` を押してから動かした）: 3 行がポインタの右下に出て、右端・下端の近くでは左・上へ返り、`Row Area` の外では消える。A を置いたあと B が追従し、期間は `0/1/23 (54 days)`（8/15 から 10/8）と出た。
