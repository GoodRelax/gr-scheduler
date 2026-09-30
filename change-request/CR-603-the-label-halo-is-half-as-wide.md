# CR-603 — ラベルの縁取りを字の 5% にする（`S-34` 0.10 → 0.05）

> 起草の状態: 起草（2026-10-01、枝 `b1-drawing-crs`、作業 B1。調整役の割り当て）。仕様にもコードにもまだ当てていない。当てる時期は調整役が決める（`docs/development-records/cr-plan-2026-09-26.md` の波 W0〜W5 と同じく、段 B の L4 が合流した後に 1 度で当てる）。
> 読んだ木: `refactor` `b4af9080`（起草の枝 `b1-drawing-crs` の `61c76b4d` も、`docs/spec`・`src`・`tests` は同じ）。行番号・数は、すべてこの木で測った（10 節）。
> ID の帯: 調整役から `CR-603` 〜 `CR-605` を受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。
> 当てる順: どの変更要求とも独立である。`CR-604`・`CR-605` と同じ波で当ててよい（`S-34` を書く草案はほかに無い。10 節）。
> 閉じるもの: `DFC-1326`、`JDG-856`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-856` | 「#7 フォントの周りの縁取りって、今何%？ 10%にしてる？ もし10%なら5%にしろ。 10%じゃなかったら10%にしろ<br>白抜きが多くて縮小した時に逆に見にくい。」 | 縁取りは今 10%（`S-34` = 0.10）なので 5%（0.05）にする | 4 節の E-01 |

### 0.2 調べた結果（b4af9080）

1. **今の値は 0.10 である。** `docs/spec/_source/settings.json:961` の `S-34`（`labelHaloOfFont`）の既定が `"0.10"`。コードは `src/entity/document-model/document-settings/document-settings.ts:269` が同じ値を持ち、`npm run gen`（`npm run types`）が原稿から刷る。
2. **読む所は 2 つ。** 名称ラベルの縁 `schedule-task-figures.ts:363`（`fontSize * settings.labelHaloOfFont`）と、期限の矢印の縁 `task-figures.ts:618`（`d * settings.labelHaloOfFont`、`FR-045` の 表 T-304 の `DA-3`）。どちらも値を読むだけで、式は変わらない。
3. **縁は `paint-order=stroke` で描く**ので、字の外に見える幅は線の太さの半分である。0.10 で外に 5%、0.05 で外に 2.5%。
4. **範囲は変わらない。** 下限 0・上限 0.3 の内に収まる。
5. **試験が値を写していない。** `tests/unit/cr-556-the-deadline-arrow.test.ts:83` は原稿から `S-34` を読み（`stored('S-34')`）、`:489` で d × `S-34` を主張する。値が変わっても式のまま通る。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`GL-006`**（読める画面）—— 利用者の実測の訴え「白抜きが多くて縮小した時に逆に見にくい」に答える。縁が太いと、縮めた字で縁が字画を食う。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（唯一の正）** —— 値は原稿 `settings.json` の 1 か所。生成物（`tbl-settings.md`・`document-settings.ts`）は `npm run gen` が刷る。
- **`FR-041` の縁取りの役** —— `01-04-requirements.md:2044` は「条件を満たせない色相があるときは、縁取り（`labelHaloOfFont`）で `CT-1` / `CT-2` を外す」と書く。縁の太さの値には触れないので、文は変わらない。⚠️ 縁が細くなると、縁が地の色で字を囲む効き目も小さくなる（9 節に申し送り）。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` を `S-34`・`labelHaloOfFont`・「縁取り」で引いた。当たるのは `JDG-856` と、0.17 → 0.10 のとき（`CR-412`、2026-09-17）の求めである。どちらも本書と食い違わない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 期限の矢印の縁（`DA-3`）も同じ値で細くなるのを受け入れる | `DA-3` は「d × `S-34`」と行を名指しており、別の値を持たない（`R1.3`） | 矢印の縁も半分になる。⚠️ `JDG-203`（依存線が字の間に見える）がやや強まりうる —— 見るのは実物で |
| 決定 2 | 注の「⭐ 0.10 は…」の文を、利用者の新しい指定に書き換える | 注は値の出どころを持つ | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 縁取りの太さの既定 | 表 T-201 の `S-34`（原稿 `docs/spec/_source/settings.json:961`） | E-01 |

**数**: 原稿 JSON の値 1 と注 1（同じ行の中）。表の行の増減 0。図 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・関数の名のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（b4af9080） | 置き換わる先 | 編集 |
|---|---|---|---|
| 既定 `"0.10"` | `settings.json` の `S-34` の `default.num` | `"0.05"` | E-01 |
| 注の数（1.2px・0.75px・「12 × 0.10」）と「⭐ 0.10 は…」の文 | 同じ行の `note.ja` | 0.6px・0.375px・「12 × 0.05」と、`JDG-856` の文 | E-01 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（b4af9080 で 1 回）。

<!-- EDIT id=E-01 file=docs/spec/_source/settings.json -->
旧
```text
     "key": "`labelHaloOfFont`",
     "unit": "—",
     "default": {
      "num": "0.10"
     },
     "min": {
      "num": "0"
     },
     "max": {
      "num": "0.3"
     },
     "note": {
      "ja": "0 = 縁取りなし。縁取りの太さは字の大きさ × 本値である —— 12px の字で 1.2px（12 × 0.10）、表示の倍率が既定の 100 のときの字の床 7.5px（`S-8` の 12 × 描く比 0.625）で 0.75px。バーの上の文字が色に依存せず読める。⭐ 0.10 は、利用者が「字の大きさ × 0.1」で試すよう指定した値である —— 描いた絵を見て選び直す"
     }
```
新
```text
     "key": "`labelHaloOfFont`",
     "unit": "—",
     "default": {
      "num": "0.05"
     },
     "min": {
      "num": "0"
     },
     "max": {
      "num": "0.3"
     },
     "note": {
      "ja": "0 = 縁取りなし。縁取りの太さは字の大きさ × 本値である —— 12px の字で 0.6px（12 × 0.05）、表示の倍率が既定の 100 のときの字の床 7.5px（`S-8` の 12 × 描く比 0.625）で 0.375px。縁は字の下に描く（`paint-order=stroke`）ので、字の外に見えるのは太さの半分である。バーの上の文字が色に依存せず読める。⭐ 0.05 は、利用者が縁取りを 10% から 5% にするよう指定した値である（`JDG-856`、2026-09-30）—— 0.10 では縮めたときに白抜きが多く、かえって読みにくかった"
     }
```

当てた後に打つもの: `npm run gen`（`tbl-settings.md`・`document-settings.ts`・`startup-template.json` を刷る）→ `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh`。`docs/development-records/changelog.md` に 1 行足す。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- Table T-201 row S-34 labelHaloOfFont: default 0.10 -> 0.05 (range 0..0.3 unchanged).
- Readers: schedule-task-figures.ts (name label halo = font size x S-34) and
  task-figures.ts (deadline arrow edge DA-3 = d x S-34). No formula changes.
- The value reaches src only through npm run gen (document-settings.ts is
  generated from docs/spec/_source/settings.json). No hand edit in src.
- Test change: none expected (cr-556 reads S-34 from the manuscript).
- No new settings row, no new constant, no new identifier.
```

---

## 6. グラフ（b4af9080）

- `impact.py S-34`: `S-34` を指す要求 1 件（`FR-045`、`01-04-requirements.md:3262` の `DA-3`）・参照 2 箇所（ほかに `tbl-settings.md:546` の `S-169`「太さは 表 T-201 の `S-34`」）。どちらも行を名指すだけで、値を写していない ⇒ ほかの文の書き換えは 0。
- `induced.py S-34 S-63 PM-3 S-328 S-341`（`CR-604` と合わせて）: 種 5 のうち解決 5、種のあいだの辺 1、閉路 0。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | b4af9080 | 本書を当てた後 | 差 |
|---|---|---|---|
| 設定値の行 | 変わらない | 変わらない | 0 |
| tables / figures / rows / uids（`md-checks.py`） | 変わらない | 変わらない | 0 |
| `tbl-settings.md` の `S-34` の既定 | 0.10 | 0.05 | 値のみ |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（1 回） | 調整役 |
| 1 | `docs/spec/_source/settings.json`（`S-34` の 1 行）＋ 生成物 ＋ `changelog.md` の 1 行 | E-01、`npm run gen`、`gen:check`、check.sh、vitest | 仕様の波（調整役が決める。⛔ L4 の合流の後 —— `npm run gen` は `tools/generate_entity_types.py`（L4 の持ち場）を走らせるので、L4 が生成器を書き換えている間に刷ると生成物が食い違う） |

- ⭐ **毎フレームの経路: いいえ。** 値だけが変わり、描く要素の数も式も変わらない。`perf-pending.md` の行は要らない。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `docs/development-records/defects.md` | `DFC-1326` を閉じる | いいえ |
| `docs/development-records/rulings.md` | `JDG-856` を「適用済」にする | いいえ |
| ⚠️ 申し送り: 実物で見る | 当てた後、`dist/index.html` で縮めた名称ラベルと期限の矢印を利用者に見せる（`JDG-147` の「見てから決める」）。`FR-041` の `CT-1` / `CT-2` を縁取りで外している色相で、字が地から切り離されて見えるかも一緒に見る | いいえ |

---

## 10. 測り方の再現

```
# the tree: refactor b4af9080

# the old block appears once (section 4)
grep -c '"ja": "0 = 縁取りなし。縁取りの太さは字の大きさ × 本値である —— 12px の字で 1.2px（12 × 0.10）' docs/spec/_source/settings.json   # -> 1

# readers of the value (section 0.2 item 2)
git grep -n 'labelHaloOfFont' -- src

# the test reads S-34 from the manuscript (section 0.2 item 5)
sed -n '83p;489p' tests/unit/cr-556-the-deadline-arrow.test.ts

# no other draft writes S-34
grep -ln '"S-34"\|`S-34`' change-request/CR-59*.md change-request/CR-60*.md

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-34
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py S-34 S-63 PM-3 S-328 S-341
```
