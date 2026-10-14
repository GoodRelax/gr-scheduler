# CR-744 —— MS Project を開いたときのタイムゾーンの知らせ（`RS-90`）は時間で消える

> 起草の状態: 当てた（2026-10-14、作業木 `bc3d016a` の上）。調整役の `CR-742`・`CR-743` の `src` の波の体 A が、起草・仕様・既存の試験の手当て・台帳を同じ作業木で行った。
> ID の帯: 番号 `CR-744`、変更履歴 `4.52` を調整役から受けた（体 A の帯は `DFC-2479`〜`DFC-2481`）。裁定の番号 `JDG-1986` は調整役が問いと一緒に割り当てた。使ったのは `CR-744`・`4.52`・`JDG-1986` だけ（新しい台帳の行は無い。毎フレームの経路のコードに触れないので `perf-pending` の行も無い）。新しい行 ID は無い。`bc3d016a` の木で `CR-744` を名乗る変更要求は 0 件、`JDG-1986` は 0 件、変更履歴の `4.52` の行は 0 件だった（9 節）。
> 当てるもの: `JDG-1986`（「B 時間で消える (推奨)」）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`bc3d016a`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| `RS-90` は OK を押すまで残る | `docs/spec/_source/notice-reasons.json` の `RS-90` は告げ方 `NT-3`、表示の仕方 `show`（`NT-8` で消されるまで立つ）。`src/use-case/advance-screen-session/notice-values.ts` の生成の表も同じ | 告げ方を `NT-2`、表示の仕方を `autoDismiss` にする（X-1） |
| 時間で消すかを決めるのは表示の仕方である | `src/framework/single-html-shell/frame-clock-wakes.ts` は `NOTICE_DISPLAY_OF_REASON` が `autoDismiss` の理由にだけ時計を掛ける。表 T-037 の `NT-2` も「時間で消すのは、表 T-233 の表示の仕方が「時間で消す」の理由の通知だけ」と言う | 告げ方の欄だけを替えても消えない —— 2 つの欄を替える |
| 告げ方の欄に `NT-2` を書ける | `notice-reasons.schema.json` の `manner` は `^NT-[0-9]+[a-z]?$`。生成器は行の告げ方を表 T-037 の行として読むだけ | 書ける。`NoticeManner` の型に `NT-2` が加わる（生成） |
| 試験の手が `RS-90` の OK を押す | `tests/system/cr-570-tree-state-stage.ts` の `dismissTimeZoneNotice` は知らせが無いと赤くなる。`tests/usecase/uc-harness.ts` の `dismissNotice` は無ければ何もしない | `dismissTimeZoneNotice` も、無ければ何もしない形にする（5 節） |

### 0.2 裁定の鎖（`rulings.md` を「`RS-90`」「タイムゾーン」「この PC の地域」「時間で消」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1711` | MSPDI を取り込んだ文書は PC の地域。通知とヘッダーで見せる | 変えない —— 知らせは今も出る。出し方だけを替える |
| `JDG-1986` | 時間で消える（`NT-2`） | X-1 |

覆す裁定は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-4`（`GL-006`）—— MS Project のファイルを開くたびに出る 1 行を、押して片づけなくても日程の上から消える。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 時間で消すことは 表 T-233 の表示の仕方の欄だけが持ち、`FR-156` は `RS-90` を名指すだけ（変えない）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 告げ方の欄も `NT-3` から `NT-2` にする | 調整役の指示。`NT-3` は件数を添える破壊的な結果の告げ方であり、`RS-90` は件数を持たない | 無い |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| MS Project のファイルを置き換えて開く | 「日程データのタイムゾーンを、この PC の地域にしました」が OK を押すまで立つ | 同じ 1 行が出て、時間で消える。立っているあいだは `Enter`・`Esc`・OK で消せる（`NT-8`） |
| `IC-98` で新しく始める | 同上 | 同上 |

---

## 2. 新しい識別子

無い。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| 表 T-233 の `RS-90` の告げ方 `NT-3` | `NT-2` |
| 表 T-233 の `RS-90` の表示の仕方「出す」 | 「時間で消す」 |

ほかの文は消さない。

---

## 4. 書き直す所

### X-1 —— `docs/spec/_source/notice-reasons.json` の `RS-90`

```
"manner": "NT-2",
"display": "autoDismiss"
```

生成した 表 T-233 の行:

```
| RS-90 | **取り込んだ MSPDI か新しく作った文書の日程データのタイムゾーンを、この PC の地域にした**（`FR-156`）。<br>⭐ PC の地域が `FR-156` の 表 T-376 に無いときは、寄せた先の地域も告げる（寄せ方は `FR-156`） | `NT-2` | 時間で消す | — | `FR-156` |
```

### 4.1 生成物

`npm run gen` が `_assets/tbl-notice-reasons.md` と `src/use-case/advance-screen-session/notice-values.ts` の生成の区画（`NoticeManner` に `NT-2`、`RS-90` の告げ方と表示の仕方）を書いた。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えたもの |
|---|---|
| `src/use-case/advance-screen-session/notice-values.ts` | 生成だけ（手で書いた所は無い） |
| `tests/system/cr-570-tree-state-stage.ts` | `dismissTimeZoneNotice` —— 知らせが無ければ何もしない（時間で消えたあとに呼ばれても赤くならない）。在れば今までどおり OK を押し、消えたことを確かめる |

`tests/usecase/uc-harness.ts` の `dismissNotice` は既に、知らせが無ければ何もしない —— 変えない。

毎フレームの経路（規則 04 の 5 節）: コードに触れない（時計を掛ける道は既に `autoDismiss` の理由を読む）。

---

## 6. グラフ（`impact.py`）

- `RS-90` を指すのは要求 1 件（`FR-156`）。本書は辺を足さず、消さない。

---

## 7. 数（実測）

- 要求 ±0、表 ±0、表の行 ±0、`（MUST）` ±0、`（MUST NOT）` ±0 —— 仕様の書の差分は 表 T-233 の 1 行の 2 つの升だけ。

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `rulings.md` | `JDG-1986` を足し `適用済`（着地の欄に 表 T-233 の `RS-90`） |
| `changelog.md` | `4.52` |

---

## 9. 測り方の再現

```
git grep -c "CR-744" bc3d016a -- change-request docs src tests                          # 0 件
git grep -c "JDG-1986\|| 4.52 |" bc3d016a -- docs change-request                          # 0 件
git diff bc3d016a -- docs/spec/_assets/tbl-notice-reasons.md | grep -c "^[-+]| RS-90"      # 2（旧 1 行・新 1 行）
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py RS-90
```

---

## 10. 利用者の実物の手順

MS Project のファイル（`.xml`）を開き、「日程データのタイムゾーンを、この PC の地域にしました」の 1 行が出て、押さずに待つと消えるか。もう一度開き、出ているあいだに `Esc` で消せるか。
