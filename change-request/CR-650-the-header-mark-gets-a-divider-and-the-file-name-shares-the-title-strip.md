# CR-650 —— ヘッダーの「GRS」を小さくして縦線で題と分け、題とファイル名が 1 本の帯を分け合う

> 起草の状態: 当てた（2026-10-04、`197265d9` の上）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-650`、裁定の帯 `JDG-1310`〜`JDG-1314`、設定の行 `S-490`〜`S-493` は調整役から受けた。裁定は `JDG-1310`・`JDG-1311` の 2 つを使った。台帳の帯 `DFC-1970`〜`DFC-1974` は使っていない。
> 閉じるもの: `DFC-1900` の仕様とコード（`JDG-1250`・`JDG-1255`・`JDG-1259` の 1 問目・`JDG-1310`・`JDG-1311`）。
> ⛔ 触れないもの: `JDG-1259` の 2 問目（親子の進捗の疑義の日数）は `CR-651` の持ち場である。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md`。全文は同書を見よ）

| 裁定 | 逐語（要約） | 本書での扱い |
|---|---|---|
| `JDG-1250` | 3 案とも退ける。「GRS」の字を小さくし、帯の上から下まで縦線を入れるだけ。ファイル名の上限は無し。題とファイル名で空きを分け合い、ぶつかれば題が勝つ。幅を超えればファイル名の先頭が隠れてよい | `BR-1`（字の大きさ `S-490`）・`BR-7`（縦線）・`HS-9`（分け合い、上限なし）・`HS-10`（題が勝ち、名前は先頭から隠れる） |
| `JDG-1255` | 「読み 1＋状態は残す」—— 題は層の上で勝つ。ファイル名は右に寄せ、溢れたら先頭から隠れる。保存の状態は題に覆わせない | `HS-10` の層・右揃え・下段の MUST NOT |
| `JDG-1259`（1 問目） | ロゴの縁取りは `S-461` の 5% のまま | `BR-3`・`S-461` の値を変えない（注の例の数だけ直す） |
| `JDG-1310` | 書き出す絵では縦線も描かない | `BR-6`・表 T-076 の `EP-1` |
| `JDG-1311` | 下段の字は 10px のまま（`JDG-884` の「下段はフォントを小さく」を守る） | `DFC-1900` の案のうち `S-210` を 1.125 に上げる部分を退けた。`S-210` と `HS-7` は変えない |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4`（`GL-006`、すぐわか）** —— 「GRS」が `Document Title` と同じ大きさ・同じ色で並ぶと、アプリの印が文書の題の一部に読める（`DFC-1900` の ①）。小さい字と縦線で分けると、どこからが文書の題かを読まずに分かる。
⭐ **`CH-2`（`GL-001`）** —— ファイル名が根拠の無い上限（コードの `max-width:24ch`）で常に末尾から切れ、1920px の帯で題とのあいだに 898px の余白があっても拡張子が見えなかった。題とファイル名が余白を分け合うと、同じ帯でより多くを示せる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（唯一の正）** —— 題の左端の式は `BR-2` が 1 か所で持ち、`EP-1`・`S-226`・`S-462` の注はそれを指すだけにした。⚠️ 書き出し（`image-exporter.ts`）と画面（`app-header-drawing.ts`）がそれぞれ同じ行を読む形は `DFC-1786` の既知の逸脱のままであり、本書は式を両側で同じに直しただけである。
- **`R1.4`（境界）** —— 帯が分け合う幅より下段が広いときは、`HS-10` の式で題の幅が 0 になり、題は末尾から省かれ尽くす。下段は覆わない。⭐ 名前が空のとき（`HS-5`）も、下段の幅だけが題を押す。
- **`R2.9`（YAGNI）** —— 帯の中の隔たりを 3 つの行に分けず、1 つの `S-491` にした（縦線の両脇・題とファイルの状態のあいだ・ファイルの状態と入口のあいだ）。どれも帯の中で隣り合う中身を隔てる同じ隔たりである。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `GRS` の字の大きさを 16.5px（`S-235` を掛けて 11px）とし、🔎 を付けた | `JDG-1250` の「小さく」と、利用者が形を決めた見本 2 の既定 11px。見本は 10・11・12 を選べたが、利用者は数を選んでいない | 数を選び直すなら新しい裁定が要る |
| 決定 2 | 帯の中の隔たりを 18px（`S-235` を掛けて 12px）とし、🔎 を付けた | これまでの帯の間隔（地の文字 16px の 0.75 倍）と見本 2 の 12px が同じ数 | 帯の間隔が宿主の文字の大きさに追随しなくなる（`FR-051` の「`App Header` の中身は `S-235` を掛けて描く」に揃う） |
| 決定 3 | 縦線の太さを 1px（倍率も `S-235` も掛けない）とし、🔎 を付けた | `S-440`（プロパティパネルの縦の罫）と同じ決め方 | 無い |
| 決定 4 | 縦線の色は `S-149`（罫の色）を継ぐ新しい行 `S-493` | `DFC-1900` の案。罫の色を直接読まずに行を立てるのは `S-464` と同じ流儀（片方だけ選び直せる） | 色の表が 1 行増える |
| 決定 5 | `S-462` の値（2.5）は変えず、掛ける相手を `Branding` の字の大きさ（`S-490`）に変え、席から題までの隙間を外した | 書体の実測（注）は字の大きさ 1 に対する比なので、相手を替えても字は席に収まる。題までの隔たりは縦線の両脇の `S-491` が持つ | 既定の書体では字の右に 6.4px の余りが残り、縦線の左の隔たりが右より広い |
| 決定 6 | 題の地は `S-146`（地の色）で塗り、題の右の隔たりも同じ地で塗る | `HS-10` の「題が上の層で勝つ」を、名前の上に不透明な地を置いて示す（見本 2 の作り） | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| `Branding` の字の大きさ・席・縦線・書き出し | `docs/spec/01-04-requirements.md` の `FR-051` の前文 2 か所と 表 T-349 の `BR-1`・`BR-2`・`BR-6`、新しい行 `BR-7` | E-01〜E-07 |
| 書き出しの題の左端と縦線 | 同書の 表 T-076 の `EP-1` | E-08・E-09 |
| 題とファイル名の分け合い | 同書の `FR-101` の 表 T-341 に新しい行 `HS-9`・`HS-10` | E-10 |
| ユニットの責務 | `docs/spec/05-07-design.md` の 表 T-075 の `UF-104` | E-11・E-12 |
| 設定値 | `docs/spec/_source/settings.json` の `S-225`・`S-226`・`S-461`・`S-462` の注と名、新しい行 `S-490`・`S-491`・`S-492`（表 T-206）・`S-493`（表 T-236） | E-13〜E-20 |
| 生成器の群 | `tools/generate_entity_types.py` の `NOT_STORED_DOCUMENT_TITLE_SIZES` に `S-490`〜`S-492`、`SCREEN_COLOURS` に `S-493` | E-21 |

**数**: 表 0。図 0。要求 0。行 +7（`BR-7`・`HS-9`・`HS-10`・`S-490`・`S-491`・`S-492`・`S-493`）。

---

## 2. 新しい識別子

2026-10-04 に `197265d9` の `docs/spec` で数えて、どれも 0 回だった（13 節）。

| 識別子 | 種類 | 置き場 |
|---|---|---|
| `BR-7` | 表 T-349 の行 | `01-04-requirements.md` |
| `HS-9`・`HS-10` | 表 T-341 の行 | 同上 |
| `S-490`・`S-491`・`S-492` | 表 T-206 の行 | `_source/settings.json`（`S-463` の次） |
| `S-493` | 表 T-236 の行 | 同上（`S-464` の次） |

コードの新しい名: `ROLE.brandingDivider`（`Branding Divider`）・`ROLE.titleAndFileStrip`（`Title And File Strip`）・`ROLE.documentTitleGround`（`Document Title Ground`）・`PAINT.brandingDivider`・`STYLE.brandingDivider`・`STYLE.titleAndFileStrip`・`STYLE.documentTitleGround`（`dom-screen-surface.ts`）。`STYLE.brandedTitle` を消した。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 | 理由 |
|---|---|---|
| `BR-1`「字の大きさは `Document Title` と同じ（`S-225` × `S-235`）」 | `S-490` × `S-235`、題より小さい | `JDG-1250` |
| `BR-2`「題の左端は席の右端」「余白は `S-226` に席の幅を足した長さ」 | 席の右に縦線と両脇の隔たり。余白は（`S-226` ＋ 席 ＋ `S-491` × 2）× `S-235` ＋ `S-492` | `JDG-1250` |
| `BR-2` の席の幅「`S-225` × `S-462` × `S-235`」 | `S-490` × `S-462` × `S-235` | 字の大きさが `S-490` に移った |
| `BR-6`「描かず、席を空白のまま残し」 | `Branding` も縦線も描かず、席と縦線の分を空ける | `JDG-1310` |
| `EP-1` の余白の文（`S-225` と `S-462` から決める） | `BR-2` の式を指す。`S-490`・`S-462`・`S-491`・`S-492` から決まる | 同上 |
| `FR-051`「`Branding` の字は `Document Title` と同じ大きさなので」 | 題より小さく、縦線は帯の中に収まるので | 同上 |
| `S-225` の注「`Branding` の字も本行の大きさで描く」 | ⛔ 本行で描かない。`S-490` が持つ | 同上 |
| `S-226`・`S-461`・`S-462` の注の式と例の数（13.33px × 0.05 ＝ 0.67px、隙間 7.7px） | `S-490` を使った式と数（11px × 0.05 ＝ 0.55px、余り 6.4px） | 同上 |
| コード `openedFileName` の `max-width:24ch`（`CR-280` で入った根拠の無い数） | 上限なし（`HS-9`） | `JDG-1250` |
| コード `appHeader` の `gap:0.75em` | `column-gap` を `S-491` × `S-235` で | 決定 2 |
| `DFC-1900` の案「`S-210` を 1.125 に上げる」 | 変えない | `JDG-1311` |

---

## 4. 書き直す所

⛔ **作法**: どの旧も、当てる前に該当ファイルで 1 回だけ現れることを数えた（13 節のスクリプトが `count == 1` を主張してから置き換える）。新しい表の行は段落（表）の終わりに足した（`BR-7` は `BR-6` の後、`HS-9`・`HS-10` は `HS-8` の後）。

E-01〜E-21 は 1 節の表と 3 節の旧 → 新のとおりである。文面は当てた後の `docs/spec` が正であり、本書に写さない（写せば 2 か所になる）。

当てた後に打ったもの: `npm run gen` → `npm run gen:check` → `rm -rf output` → `GRS_DEV_PORT=5991 bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 3.55 の行を足した。

---

## 5. 継ぎ目

```
SEAM (CR-650)
- app-header-drawing.ts: fillAppHeader builds the App Header as
  [Branding seat] [Branding Divider] [Title And File Strip] [Header Commands].
  The strip holds [Document Title Ground > Document Title] then
  [File Status > Opened File Name, File Saved At].
- appHeaderStyle(): padding-left = S-226 x S-235 (unchanged),
  column-gap = S-491 x S-235.
- Branding glyph = S-490 x S-235; seat = glyph x S-462; rim = glyph x S-461.
- Divider: width S-492 px (not scaled), background var(--gr-brandingDivider)
  = S-493 (sameAs S-149), negative block margin = the band's block padding,
  so it runs the band's full height without adding height.
- Title ground: background S-146, a block border of the same colour
  cancelled by a negative margin (covers both file lines without raising the
  band, HS-8), padding-right S-491 x S-235, z-index above the file status.
- File Status: flex 1 0 auto (never narrower than its lower line, so the
  title gives way first); Opened File Name: contain:inline-size, flex-end,
  no max-width (the head spills left and is hidden by the ground or the
  strip's overflow-x clip).
- image-exporter.ts appHeaderSvg: title x =
  band.x + (S-226 + S-490 x S-462 + 2 x S-491) x S-235 + S-492, times ratio.
  Neither the Branding nor the divider is drawn.
```

---

## 6. グラフ（`197265d9`）

- `impact.py T-349`: 指す要求は `FR-051`・`FR-080`、2 次は 13 件（`FR-016`・`FR-053`・`FR-098`・`FR-101`・`FR-036`・`FR-039`・`FR-003`・`FR-041`・`FR-009`・`FR-015`・`FR-077`・`FR-020`・`FR-025`）。2 次はどれも `FR-051` ／ `FR-080` を名指すだけで、`Branding` の大きさ・席の式を写していない。
- `impact.py T-341`: 指す要求は `FR-051`・`FR-087`・`FR-101`・`FR-096`。`FR-087`（`OP-16`）と `FR-096`（`SX-1`）は表を名指すだけで、行の並びに依らない。
- `impact.py S-462` ／ `S-225` ／ `S-226` ／ `EP-1` ／ `BR-2`: 指す所は `FR-051`・`FR-080`（`EP-1`）・`FR-039`（`EP-1` の太さ）と 表 T-206 の注だけであり、すべて本書が直した。
- `impact.py S-210` ／ `HS-7` ／ `HS-8`: `FR-101` と `UF-104` だけ。本書は `S-210`・`HS-7`・`HS-8` を変えない（`JDG-1311`）。
- 閉路: `BR-*` と `S-490`〜`S-492`、`HS-*` と `S-491` の間の値の行と規則の閉路だけである（02 の 1 節「作法」）。

---

## 7. 数の予測と測った数

| 数 | 予測 | 測った（`md-checks.py`） |
|---|---|---|
| tables | 224 → 224 | 224 → 224 |
| figures | 30 → 30 | 30 → 30 |
| rows | 2889 → 2896（+7） | 2889 → 2896 |
| uids | 178 → 178 | 178 → 178 |
| `npm run typecheck` | 0 → 0 | 0 → 0 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | `docs/spec`・`settings.json`・生成器の群・生成物 | E-01〜E-21、`npm run gen` |
| 2 | `dom-screen-surface.ts`（`STYLE`・`PAINT`・`ROLE` のヘッダーの項）・`app-header-drawing.ts`・`image-exporter.ts` | 5 節の継ぎ目 |
| 3 | 動く試験（`tests/unit/cr-628-the-branding-seat.test.ts`・`tests/contract/cr-610-t-341-hs-1-to-7-the-header-file-status.test.ts`・`tests/contract/dfc-355-the-four-rulings-of-2026-09-07.test.ts` の `EP-1` の題の左端）と、仕様だけを読む別の体が書いた新しい試験（`tests/contract/cr-650-the-branding-divider-and-the-shared-header-width.test.ts` 23 件、`tests/system/cr-650-the-title-and-the-file-name-share-the-header.test.ts` 1 件）。壊し試験: `Opened File Name` に `max-width:24ch` を戻すと `HS-9` の 1 件だけが赤になり、戻すと緑 | 12 節 |

- ⭐ **毎フレームの経路: はい。** `dom-screen-surface.ts` と `app-header-drawing.ts` を変えた —— `docs/development-records/perf-pending.md` に行を足した。変わるのはスタイルの文字列と要素の組み方（3 要素増）だけである。
- ⚠️ `tests/system/measured-sweep.test.ts` は `S-210` が動かないので動かない（`JDG-1311`）。

---

## 9. 仕様の外で直すもの

`src/adapter/image-exporter/image-exporter.ts` の題の左端の式（`DFC-1900` の記述には無かったが、`EP-1` が同じ式を求める）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- `S-210`・`HS-7`・`HS-8` は変えない（`JDG-1311`）。
- `BR-3`・`S-461` の値（5%）は変えない（`JDG-1259`）。
- `Header Commands` の中の間隔（`STYLE.headerCommands` の 0.25em）は変えない。
- `CR-648` が `dom-screen-surface.ts` の検索パネルの `STYLE` を触る —— 本書はヘッダーの項だけを触った。

---

## 11. 利用者に問うこと

無い。問うた 2 つは `JDG-1310`・`JDG-1311` として記録した。

---

## 12. 台帳

| 行 | 本書での扱い |
|---|---|
| `JDG-1250`・`JDG-1255` | 状態を「適用済 —— `CR-650` が当てた」にした |
| `JDG-1259` | 触れない（2 問目が `CR-651` の持ち場で、行の状態は 1 つしか持てない） |
| `JDG-1310`・`JDG-1311` | 新しく記録した（適用済） |
| `DFC-1900` | `仕様待ち` → `実測待ち`（出荷ビルドでの実測はまだ） |
| `perf-pending.md` | 1 行足した |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 197265d9
# new identifiers were absent from docs/spec before the edit:
git archive HEAD docs | tar -x -C <scratch>/base
grep -rlw -- S-490 <scratch>/base/docs/spec     # and S-491 S-492 S-493 BR-7 HS-9 HS-10: 0 files each

# counters (section 7), before on the archived copy and after on the tree:
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py <scratch>/base
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-349
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-341

# edits: a scratch script asserts count == 1 for every old text, then replaces
npm run gen && npm run gen:check && npm run typecheck
node ../../../node_modules/vitest/vitest.mjs run tests/unit/cr-628-the-branding-seat.test.ts tests/contract/cr-610-t-341-hs-1-to-7-the-header-file-status.test.ts
```
