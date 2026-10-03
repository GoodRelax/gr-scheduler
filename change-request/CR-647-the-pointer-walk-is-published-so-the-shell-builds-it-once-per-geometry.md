# CR-647 —— ポインタの当たりの領域を公開し、シェルが描いた幾何ごとに 1 度だけ組む

> 起草の状態: 当てた（2026-10-03、`2f24bfc7` の上）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-647` と台帳の帯 `DFC-1820`〜`DFC-1822` は調整役から受けた（10 節で、木のどこにも `CR-647` が無いことを測った）。仕様の新しい識別子（表・行 ID・接頭辞・設定の行・要求）は取らない（2 節）。
> 当てる順: どの変更要求とも独立である（表 T-064 の `PI-7` を書く草案はほかに無い）。
> 閉じるもの: 台帳 `DFC-1811`（押しの当たりが入力ごとに全タスクの形を作り直す）—— その「対応方針」の欄が求めた「表 T-064 の `PI-7` に作り置きの名を足す変更要求」が本書である。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 何が起きているか

1. **当たりの領域は点に依らない。** `src/entity/layout-engine/item-hit-area/item-hit-area.ts` の `itemAtPointer` は、問われるたびに全タスクの形・掴みの領域・依存線の領域・期限の箱を組み直してから点を試す。組み直しは全タスクを歩くが、点には依らない。
2. **作り置きは測った。** 領域を描いた幾何ごとに 1 度だけ組み、枠の層の `src/framework/single-html-shell/frame-loop.ts` が持つ形（`ff1f8336`）は、`performance-runs.md` の走行 6 で `MK-6` 44.91 → 54.96 fps、`MK-7` 25.48 → 30.79 fps だった。
3. **公開名が無いので外した。** その形では `pointerWalkOf`・`PointerWalk`・`answersAtPointer`・`PointerAnswers` が `ItemHitArea` のフォルダを越えて `frame-loop.ts` に読まれる。表 T-064 の `PI-7` はこの 4 つを公開していないので、表と `src/` を突き合わせる検査が赤になり、`a5e32db3` は作り置きを外した（`DFC-1810` の 1 度の歩きだけを残した）。
4. **内側の層には置けない。** 作り置きを `ItemHitArea` の中の `WeakMap` に置く道は、表 T-249 の `SF-7`（内側の 3 層のモジュールスコープに可変状態を置かない）が閉じる。作り置きを持つのは、現在値を持つシェルである。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- **表 T-054 の `CH-3`（軽快に動かす、`GL-003`）を前へ進める。** 押したまま動かす操作（`MK-6`・`MK-7`）で、入力の受け取りが全タスクを歩かなくなる。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R2.22`（補助関数を書く前に公開の入口を探す）** —— シェルが領域の組み立てを写して持てば、`itemAtPointer` の答えと離れる。公開して 1 か所に置く。
- **`R5`（毎フレームの経路のアルゴリズム）** —— 入力ごとの全タスクの歩きを、描いた幾何ごとの 1 度へ移す。
- **`R7.2`（計算の純粋性）** —— 4 つとも `pure` のまま。可変の作り置きは `non-pure` のシェルにだけ在る（`SF-7`）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 4 つの名を `PI-7` に足す（調整役の指示 2026-10-03） | `DFC-1811` の対応方針が挙げた 2 つの道のうち、別の置き場は `SF-7` が閉じる | `PI-7` の公開が 10 → 14 に増える |
| 決定 2 | 公開の理由は最後のメンバの後ろに 1 度だけ書く | 表 T-064 の `PI-5` の「2 つとも … のために公開した」の形 | 無い |
| 決定 3 | 理由に台帳の行 ID を書かない | 仕様は台帳の行 ID を 1 度も引かない（`docs/spec` で `DFC-` は 0 件） | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 当たりの領域の公開名 | 表 T-064 の `PI-7`（原稿 `docs/spec/_source/published-entries.json`） | E-01 |

**数**: 原稿 JSON のメンバ 4（`pointerWalkOf`・`PointerWalk`・`answersAtPointer`・`PointerAnswers`）、注の行 8、理由の行 3。要求の文 0。表の行の増減 0。図 0。

---

## 2. 新しい識別子

仕様の行 ID は 1 つも取らない。表 T-064 の `PI-7`（`ItemHitArea`）に公開名 4 つ —— `pointerWalkOf`・`PointerWalk`・`answersAtPointer`・`PointerAnswers` —— を足した。4 つともコードには `ff1f8336` で在った名であり、`2f24bfc7` ではファイルの中だけの名として在る。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

消すものは無い —— `PI-7` の既存の 10 メンバの名と注は変えない。

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（`PI-7`）—— `isInsideRect` の後ろに 4 メンバを足した。`pointerWalkOf` は「描いた幾何と掴み代の大きさから、点に依らない当たりの領域を 1 度に組んで答える。`itemAtPointer` が問われるたびに中で組むものと同じ」。`PointerWalk` は型、同じ幾何のあいだは何度でも引ける。`answersAtPointer` は「押したときの当たりと説明の持ち主（`EZ-6`）を 1 度の歩きで答える。答えは `itemAtPointer` と同じ、応える順は 表 T-023d の結び」。`PointerAnswers` は型。理由は `PointerAnswers` の後ろに「4 つとも `SingleHtmlShell` が、ポインタの入力ごとの当たりを、描いた幾何ごとに 1 度だけ組んだ領域から引くために公開した。領域を組むには全タスクを歩くので、入力ごとに組み直すと、押したまま動かすあいだのフレームレート（`NFR-002`）を入力の受け取りが削る。組んだ領域はシェルが持つ —— 内側の層のモジュールスコープに可変状態を置かない（`SF-7`）」。

当てた後に打つもの: `npm run gen`（`_assets/tbl-published-entries.md` と `docs/review/public-entry-index.md` を刷る）→ `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

---

## 5. 継ぎ目

```
SEAM
- Table T-064 row PI-7 (ItemHitArea) publishes four more names:
  pointerWalkOf(geometry, sizes): PointerWalk   -- the point-free regions, built once
  PointerWalk                                   -- type
  answersAtPointer(walk, x, y): PointerAnswers  -- the press hit and the EZ-6 hint holder, one walk
  PointerAnswers                                -- type { hit, hint }
- itemAtPointer keeps its signature and its answers; it builds a walk per call.
- The memo lives in SingleHtmlShell (frame-loop.ts): one PointerWalk per drawn
  ScheduleGeometry, rebuilt when the geometry object changes (SF-7: no module-scope
  mutable state in the inner layers).
- No new spec row, no new settings row, no new edge in components.json
  (SingleHtmlShell already reads ItemHitArea).
```

---

## 6. グラフ（`2f24bfc7`）

- `impact.py PI-7`: `PI-7` を指す要求 1 件（`FR-009`、`01-04-requirements.md:2720`）・参照 2 箇所（同と 5.3 の `UF-7`）。どちらも行を名指すだけで、メンバを写していない ⇒ ほかの文の書き換えは 0。
- `induced.py PI-7 T-064`: 種 2 つのあいだの辺 0、閉路 0。

---

## 7. 数の予測と測った数

| 数 | `2f24bfc7` | 本書を当てた後 | 差 |
|---|---|---|---|
| tables / figures / rows / uids | 変わらない | 変わらない | 0 |
| 表 T-064 の `PI-7` のメンバ | 10 | 14 | +4 |
| `public-entry-index.md` の「published by table T-064」 | 281 | 285 | +4 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `published-entries.json` ＋ 生成物 ＋ `changelog.md` の 1 行 | E-01、`npm run gen`、`gen:check` | 仕様の波 |
| 2 | `item-hit-area.ts`・`frame-loop.ts` | 4 つの名を export し、シェルが幾何ごとに 1 つの `PointerWalk` を持つ（`ff1f8336` の形） | コードの波（同じ体） |

- ⭐ **毎フレームの経路: はい。** ポインタの入力ごとに走る。`perf-pending.md` に行を足す。

---

## 9. 仕様の外で直すもの

- `src/entity/layout-engine/item-hit-area/item-hit-area.ts`・`src/framework/single-html-shell/frame-loop.ts`（8 節の波 2）。
- 台帳: `defects.md` の `DFC-1811`、`perf-pending.md` の行、`performance-runs.md` の走行の行。

---

## 10. 測り方の再現

```
# the tree: 2f24bfc7

# the number is unused (no change request, no commit message, no file names it)
ls change-request | grep CR-647
git log --all --oneline --grep CR-647
git grep -l CR-647 HEAD -- .

# the members of PI-7 before (section 7)
PYTHONIOENCODING=utf-8 python -c "import json; d=json.load(open('docs/spec/_source/published-entries.json', encoding='utf-8')); print([m['name'] for r in d['rows'] if r['id']=='PI-7' for m in r['members']])"

# docs/spec never cites a ledger id (decision 3)
grep -c 'DFC-' docs/spec/_source/published-entries.json docs/spec/05-07-design.md docs/spec/01-04-requirements.md

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py PI-7
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py PI-7 T-064
```
