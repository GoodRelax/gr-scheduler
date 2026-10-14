# CR-750 —— タイムゾーンの知らせ（`RS-90`）の次の一手は [基準を変える] を押すまでを言う

> 起草の状態: 当てた（2026-10-14、作業木 `e4d07fdb` の上）。調整役の波 9 の体 F が、起草・辞書の原稿・既存の試験の手当て・台帳を同じ作業木で行った。
> ID の帯: 番号 `CR-750`、裁定 `JDG-2038`、変更履歴 `4.59`、`perf-pending` の `199` を調整役から受けた。使ったのはこの 4 つだけ（新しい台帳の行は無い）。新しい行 ID は無い。`e4d07fdb` の木で `CR-750` を名乗る変更要求は 0 件、`JDG-2038` は 0 件、変更履歴の `4.59` の行と `perf-pending` の `199` の行は 0 件だった（9 節）。
> 当てるもの: `JDG-2038`（「A 一言足す (推奨)」）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`e4d07fdb`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| `RS-90` の次の一手は「選んで付け替える」で終わっている | `docs/spec/_source/display-words.json` の区 `reasons` の `RS-90` の `nextStep` は「…基準のタイムゾーンを選び、「ローカルタイムを保つ」で付け替えてください」（en は "…and choose Keep Local Time"） | 押す一手を足す（X-1） |
| 選んだだけでは基準は変わらない | `FR-156` は地域と選び方を選んだだけでは当てず、`IC-161` を押したときに当てる（`CR-742`、`JDG-1983`） | 次の一手のとおりにしても何も起きない —— 語が手順の最後の一手を欠いている |
| 押す入口の語は [基準を変える] ／ Change Base Time Zone | 辞書の `IC-161` は ja「基準を変える」・en「Change Base Time Zone」。選び方の語は `keepLocalTime` の ja「ローカルタイムを保つ」・en「Keep Local Time」 | 画面の語をそのまま引く |
| 押すものを角かっこで示す書き方がある | `RS-8` の次の一手「先に [Enter] で編集を確定するか、[Esc] で取りやめてください」（`JDG-1758`）。en は角かっこを付けない（"First press Enter to commit the edit"） | ja は [基準を変える]、en は角かっこなし |
| 次の一手の語を試験が指紋で抑えている | `tests/contract/t-233-reason-words-tell-the-row.contract.test.ts` の `RS-90` の指紋（場面と語を一緒に読んだ印）。語を写した試験は無い（`git grep` で旧い語は辞書の原稿と生成物だけ） | 場面と語を読み合わせ、指紋を記録し直す（5 節） |

### 0.2 裁定の鎖（`rulings.md` を「`RS-90`」「タイムゾーン」「基準を変え」「`IC-161`」「ローカルタイムを保つ」「付け替え」「次の一手」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1711` | MSPDI を取り込んだ文書は PC の地域。通知とヘッダーで見せる | 変えない |
| `JDG-1983` | 基準のタイムゾーンは選んでから [基準を変える]（`IC-161`）で当てる | 本書の理由 —— 次の一手をこの手順に合わせる |
| `JDG-1986` | `RS-90` は時間で消える（`NT-2`） | 変えない |
| `JDG-1758` | 次の一手で押すものを [Enter] の形で示す | 書き方の先例 |
| `JDG-2038` | A 一言足す | X-1 |

覆す裁定は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-4`（`GL-006`）—— MS Project のファイルを開いた人が、知らせの言うとおりに手を動かせば、基準が実際に変わる。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 当てるのが押したときであることは `FR-156` だけが持ち、次の一手は押すものの名を言うだけ（`FR-156` は変えない）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | en は角かっこを付けず "then press Change Base Time Zone" で終える | 調整役の指示の en と、`RS-8` の en の先例 | 無い |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| MS Project のファイルを置き換えて開く／`IC-98` で新しく始める | 次の一手が「…「ローカルタイムを保つ」で付け替えてください」で終わる —— 選んだだけで止まると基準は変わらない | 「…「ローカルタイムを保つ」を選んで [基準を変える] を押してください」で終わる |

---

## 2. 新しい識別子

無い。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `RS-90` の `nextStep.ja` の末尾「「ローカルタイムを保つ」で付け替えてください」 | 「「ローカルタイムを保つ」を選んで [基準を変える] を押してください」 |
| `RS-90` の `nextStep.en` の末尾 "pick it as the base time zone in Document Settings and choose Keep Local Time" | "pick it as the base time zone in Document Settings, choose Keep Local Time, then press Change Base Time Zone" |

ほかの文は消さない（`RS-90` の `text` と、`nextStep` の 1 文目はそのまま）。

---

## 4. 書き直す所

### X-1 —— `docs/spec/_source/display-words.json` の区 `reasons` の `RS-90` の `nextStep`

```
"nextStep": {
 "ja": "この PC の地域が一覧に無いときは、UTC の差が同じ一覧の地域に寄せています。別の地域で読みたいときは、文書の設定で基準のタイムゾーンを選び、「ローカルタイムを保つ」を選んで [基準を変える] を押してください",
 "en": "If this PC's region is not in the list, the listed region with the same UTC offset was used. To read the dates in another region, pick it as the base time zone in Document Settings, choose Keep Local Time, then press Change Base Time Zone"
}
```

### 4.1 生成物

`npm run gen` が `src/adapter/screen-renderer/display-words.json` だけを書き換えた（仕様の書の生成物は動かない —— 辞書の原稿は 表 T-233 の升を持たない）。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えたもの |
|---|---|
| `src/adapter/screen-renderer/display-words.json` | 生成だけ（手で書いた所は無い） |
| `tests/contract/t-233-reason-words-tell-the-row.contract.test.ts` | `RS-90` の指紋を記録し直した。場面（取り込んだ MSPDI か新しく作った文書の日程データのタイムゾーンを、この PC の地域にした。寄せた先の地域も告げる）と語を一緒に読み、語は今も場面を告げている —— 足したのは手順の最後の一手だけ |

毎フレームの経路（規則 04 の 5 節）: 生成した辞書 `display-words.json` は画面が読む語の一覧なので、`perf-pending` に `199` を足す。描く要素の数も手順も変わらない（`RS-90` の 1 行の字が延びるだけ）。

---

## 6. グラフ（`impact.py`）

- `RS-90` を指すのは要求 1 件（`FR-156`）と、`05-07-design.md` の 5.3 節・公開の入口の表。本書は辺を足さず、消さない。

---

## 7. 数（実測）

- 要求 ±0、表 ±0、表の行 ±0、`（MUST）` ±0、`（MUST NOT）` ±0 —— 仕様の書（`docs/spec`）の差分は 0 行。辞書の原稿の差分は `RS-90` の 2 つの升だけ。

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `rulings.md` | `JDG-2038` を足し `適用済`（着地の欄に 表 T-233 の `RS-90`） |
| `changelog.md` | `4.59` |
| `perf-pending.md` | `199` |

---

## 9. 測り方の再現

```
git grep -c "CR-750" e4d07fdb -- change-request docs src tests                                   # 0 件
git grep -c "JDG-2038" e4d07fdb -- docs change-request                                            # 0 件
git grep -c "| 4.59 |\|| 199 |" e4d07fdb -- docs/development-records/changelog.md docs/development-records/perf-pending.md   # 0 件
git diff e4d07fdb --stat -- docs/spec                                                             # _source/display-words.json だけ
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py RS-90
```

---

## 10. 利用者の実物の手順

MS Project のファイル（`.xml`）を開き、出た 1 行の次の一手が「…「ローカルタイムを保つ」を選んで [基準を変える] を押してください」で終わるか。言語を English にして開き直し、"…choose Keep Local Time, then press Change Base Time Zone" で終わるか。その手順どおりに文書の設定で地域を選び、[基準を変える] を押して基準が変わるか。
