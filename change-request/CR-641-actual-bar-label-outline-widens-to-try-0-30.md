# CR-641 — 実績バーの上の名称ラベルの縁取り `S-34` を 0.05 → 0.30（試す値）にする

> 起草の状態: 当てた（2026-10-03、`0647874d` の上）。起草と当てを同じコミットで行った。4 節の旧は当てる木で 1 回だった（13 節）。
> ID の帯: 番号 `CR-641` は調整役から受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。台帳の新しい行も取らない —— 生成だけで `src` に届くため（9 節）。
> 閉じるもの: `JDG-1170` の仕様の側（`DFC-1750`）。`JDG-1171`（見本を Artifact 化し、スライダーを足す）は見本の作り方の指示であり、仕様も `src` も直さないので本書の範囲外（調整役がすでに見本へ適用済み）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md` の `JDG-1170`。全文は同書を見よ）

| 裁定 | 逐語（抜粋） | 本書での扱い |
|---|---|---|
| `JDG-1170` | 「これでどうか？ 単純に縁取りを30%に変えただけ。」／「倍率 50・75 を見てから決める」／「いったん、0.30でやってみよう。  これなら変化点は最小だろ？」（倍率 50・75 を画素 1 倍で描いて 4 倍に拡げた絵を見て） | 表 T-201 の `S-34`（`labelHaloOfFont`）の既定を 0.05 → 0.3（範囲 0〜0.3 の上限ちょうど）にする。「いったん」なので試す値 —— 出荷ビルドを見て詰め直す（4 節） |

⚠️ **覆す裁定**: `JDG-856`（0.10 → 0.05）と `JDG-147`（0.17 → 0.10）の「細くする」。どちらも「縮めると白抜きが多い」が理由であり、`JDG-1170` は倍率 50・75 で 0.30 でもラベルの面の 87% が白くなるのを見たうえでの答えである。⛔ 覆した履歴は仕様に書かない（`docs/development-rules/08-spec-template/spec-writing-rules.md` の「仕様書は理由を持ち、履歴を持たない」）—— 履歴は本書と `rulings.md` が持つ。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **表 T-054 の `CH-1`〜`CH-7` と 1.3 の `GL-001`〜`GL-009` の、どれも前へ進めない。** 本書は `NFR-007`（コントラストの下限）に照らした可読性の不具合（`DFC-1750`）への対応であり、新しい挑戦や目標を進めるものではない —— 実績バーの上の名称ラベルは、明るいテーマで字と実績の塗りの比が 2.59 : 1 しかない（WCAG 2.1 の式。見本の README の「1. 色どうしの比」）。不具合の修正は挑戦・目標の前進ではない（`CR-375` が同じ形で答えている）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— `S-34` の既定と注が唯一の正であり、値を変えると注の導いた数（12px で 0.6px、床 7.5px で 0.375px）と「0.05 は、利用者が…指定した値」の文がどちらも偽になる。⇒ 両方を 0.3 に合わせて書き直した（4 節）。
- **`R1.4`（境界・空の場合）** —— 0.3 は `min`/`max`（0〜0.3）の上限ちょうどであり、範囲の外には出ない。`max` 自体は変えない（決定 1）。
- **`R2.9`（YAGNI）** —— 新しい設定の行は立てない。利用者の「変化点は最小」どおり、既にある `S-34` だけを動かし、担当と進捗の札の縁取りと期限の印の縁は `S-34` を読む側として一緒に太くなる（決定 2）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `S-34` の `min`/`max`（0・0.3）は変えない —— 既定だけを上限へ動かす | `JDG-1170` は範囲の上限の値を選んだのであり、範囲そのものを広げる指示ではない。見本の README も「0.30（範囲の上限）」と書く | 無い |
| 決定 2 | 担当と進捗の札の縁取りと、期限の印の縁（表 T-304 の `DA-3`）は、新しい設定の行を立てずに `S-34` のまま一緒に太くする | `JDG-1170` の「変化点は最小」と、見本の README の「同じ値を読む担当・進捗の札と期限の印の縁も 6 倍の太さになる」。別の値にする裁定は無い（`JDG-1170` の問いで「期限の印は別にする」の択は選ばれなかった） | 3 つの縁が同じ比率で連動し、個別には調整できない —— 分けるなら新しい設定行を立てる変更要求が要る |
| 決定 3 | 字の色（`S-168`）と実績の塗り（`S-157`）は変えない | `JDG-1170` は `S-34` だけを動かす。見本の案 D（実績の上だけ字を反転）は測った数では最もよく読めたが、利用者は値 1 つの変更（案 F）を選んだ | 字の芯と塗りの比（明 2.59 : 1）は変わらない —— 縁で読ませる構成のままである |
| 決定 4 | `S-34` の注は、理由（字と塗りの比が足りないので縁で読ませる）・試す値であること・連動して太くなる縁を書き、裁定の ID・利用者の言葉・覆した前の値は書かない | `spec-writing-rules.md` の「仕様書は理由を持ち、履歴を持たない」（検査 54 の背後の規則）。前の注の「利用者が縁取りを 10% から 5% にするよう指定した」は出どころの文なので、置き換えで消える | 裁定の言葉を読むには `rulings.md` の `JDG-1170` へ行く |
| 決定 5 | 注は連動する縁を UI の名で書き、コードのファイルと行番号は書かない | 行番号はコードの変更で腐る。`settings.json` の注に `.ts` の名指しは 1 件も無い（`grep` で 0 件） | コードの在り処は本書の 5 節が持つ |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 実績バーの上の名称ラベルの縁取りの既定 | `docs/spec/_source/settings.json` の `S-34` の `default`（0.05 → 0.3） | E-01 |
| 導いた数と理由の注記 | 同 `S-34` の `note.ja` | E-01 |

**数**: 表の升 2（既定・注）。行の増減 0。要求の文 0。図 0。設定の行 0（決定 2）。

---

## 2. 新しい識別子

本書は新しい識別子を 1 つも取らない —— 表・行 ID・接頭辞・設定値の行・要求のどれも足さない。台帳の新しい行も取らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`0647874d`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `default.num` の `"0.05"` | `_source/settings.json` の `S-34` | `"0.3"` | E-01 |
| 注の「12px の字で 0.6px（12 × 0.05）」「床 7.5px で 0.375px」 | 同 `S-34` の `note.ja` | 「12px の字で 3.6px（12 × 0.3）」「床 7.5px で 2.25px」 | E-01 |
| 「⭐ 0.05 は、利用者が縁取りを 10% から 5% にするよう指定した値である —— 0.10 では縮めたときに白抜きが多く、かえって読みにくかった」 | 同 | 理由の文（字と塗りの比が足りないので縁で読ませる）・試す値・縮めたときの白い面の広さ・一緒に太くなる縁 | E-01 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧が `settings.json` に 1 回だけ現れることを数えること（当てる木で 1 回。13 節）。

<!-- EDIT id=E-01 file=docs/spec/_source/settings.json -->
旧
```text
"default": { "num": "0.05" },
...
"note": { "ja": "0 = 縁取りなし。縁取りの太さは字の大きさ × 本値である —— 12px の字で 0.6px（12 × 0.05）、表示の倍率が既定の 100 のときの字の床 7.5px（`S-8` の 12 × 描く比 0.625）で 0.375px。縁は字の下に描く（`paint-order=stroke`）ので、字の外に見えるのは太さの半分である。バーの上の文字が色に依存せず読める。⭐ 0.05 は、利用者が縁取りを 10% から 5% にするよう指定した値である —— 0.10 では縮めたときに白抜きが多く、かえって読みにくかった" }
```
新
```text
"default": { "num": "0.3" },
...
"note": { "ja": "0 = 縁取りなし。縁取りの太さは字の大きさ × 本値である —— 12px の字で 3.6px（12 × 0.3）、表示の倍率が既定の 100 のときの字の床 7.5px（`S-8` の 12 × 描く比 0.625）で 2.25px。縁は字の下に描く（`paint-order=stroke`）ので、字の外に見えるのは太さの半分である。バーの上の文字が色に依存せず読める。⭐ 0.3 は範囲の上限であり、出荷ビルドを見て詰め直す試す値である。明るいテーマでは字（`S-168`）と実績の塗り（`S-157`）の比が 2.59 : 1 しかない（WCAG 2.1 の式）ので、実績の上の名称ラベルは縁で読ませる —— 縁取りの割合は字の芯と塗りの比を動かさず、字の周りの白い面だけを広げる（見本 `previous-project-result/34-actual-bar-label-legibility/README.md` の掃引。撮った画素の暗い側 2% と明るい側 2% を実績の塗りと同じ式で比べた）。⚠️ 縮めた表示の倍率 50・75 では、ラベルの面の 87% が白くなる（同じ掃引で、塗りより 2 : 1 以上明るい画素の割合。明るいテーマ、画素の倍率 1）。⚠️ 同じ値を、担当と進捗の札の縁取りと、期限の印の縁（表 T-304 の `DA-3`）も読む —— 3 つの縁は一緒に太さが変わる" }
```

当てた後に打つもの: `npm run gen`（`docs/spec/_source/settings_json_to_md.py` が `_assets/tbl-settings.md` を、`tools/generate_entity_types.py` が `src/entity/document-model/document-settings/document-settings.ts` の `SETTINGS_CONSTANTS.labelHaloOfFont` を刷る）→ `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

### 4.1 重なり

`change-request/` のうち `S-34` を書く変更要求は `CR-412`（0.17 → 0.10）と `CR-603`（0.10 → 0.05）であり、どちらも着地済み。着地していない変更要求で `S-34` を書くものは無い。

---

## 5. 継ぎ目

```
SEAM (CR-641)
- settings.json: S-34 (labelHaloOfFont) default 0.05 -> 0.3 (the range's
  upper bound). min/max (0 / 0.3) unchanged.
- Generated: src/entity/document-model/document-settings/document-settings.ts
  SETTINGS_CONSTANTS.labelHaloOfFont: 0.05 -> 0.3 (npm run gen). The only
  other generated file whose bytes change is docs/spec/_assets/tbl-settings.md.
- No code wave: the three readers already read
  SETTINGS_CONSTANTS.labelHaloOfFont and widen with it --
  * src/adapter/svg-renderer/schedule-task-figures.ts, labelSvg
    (haloWidth = fontSize * settings.labelHaloOfFont): the name label on
    the actual bar AND the assignee/progress tag (both call labelSvg);
  * src/entity/layout-engine/schedule-geometry/task-figures.ts, the
    due-date mark (haloWidth: d * settings.labelHaloOfFont, table T-304
    DA-3).
- This is a try value (JDG-1170's own "いったん") -- a later CR may move
  S-34 again after the shipped build is reviewed; this CR does not
  pre-commit to that.
```

---

## 6. グラフ（`0647874d`）

- `impact.py S-34`: 指す側は要求 1 件・参照 2 箇所 —— `FR-045` の 表 T-304 の `DA-3`（「形の縁を、地の色（同表の `S-146`）で、d × 表 T-201 の `S-34` の太さに描くこと（MUST）」）と、表 T-236 の `S-169` の注（「太さは 表 T-201 の `S-34`」）。⭐ どちらも式と指し先だけを持ち、0.05 から導いた数を持たないので、文は変わらない —— `DA-3` の縁は値と一緒に太くなる（決定 2）。
- 仕様の中で `labelHaloOfFont` を名指す残りの 3 箇所（`01-04-requirements.md` の `CT-1`／`CT-2` を外す文、用語集 `K-34`、辞書 `display-words.json` の `K-34`）も値を持たない。
- 本書は値と注だけを書き、どの要求も書かない。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables / figures / rows / uids | 差 0 | 升 2 つだけ |
| 設定値の行（`settings.json` の `id`） | 差 0 | 決定 2（新しい行を立てない） |
| `SETTINGS_CONSTANTS.labelHaloOfFont`（生成物） | `0.05` → `0.3` | E-01 |
| 生成物のうち中身が動いたファイル | 2（`tbl-settings.md`・`document-settings.ts`） | `npm run gen` 後の `git status`（13 節） |
| 自動試験の失敗の集合（`vitest` フル） | 差 0 | 13 節で base と当てた木を双方測った |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec/_source/settings.json` ＋ 生成物（`_assets/tbl-settings.md`・`document-settings.ts`）＋ `changelog.md` の 1 行 ＋ 台帳 | E-01、`npm run gen`、`gen:check`、check.sh | 仕様の波（本書、唯一の波） |

⛔ **コードの波は無い（決定 2・5 節）。**

- ⚠️ **毎フレームの経路: 生成物 1 つ（値 1 つ）。** `document-settings.ts` は規則 04 の 5 節の毎フレームの経路の表に載るので、`docs/development-records/perf-pending.md` に 1 行足す（`PW-2`）。描く要素の数も手順も変わらない —— 縁の線の太さが変わるだけである。

---

## 9. 仕様の外で直すもの

無い（決定 2）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- `min`/`max`（範囲 0〜0.3 そのもの）は変えない（決定 1）。
- 字の色（`S-168`）・実績の塗り（`S-157`）は変えない（決定 3）。見本の案 D（反転）は採らない。
- 担当と進捗の札・期限の印のためだけの新しい設定行は立てない（決定 2）—— 分けるなら別の変更要求。
- `JDG-1171`（見本を Artifact 化し、スライダーを足す）は本書の範囲外。

---

## 11. 利用者に問うこと

無い。⚠️ 0.3 は試す値であり、出荷ビルドを見てから詰め直すことが `JDG-1170` 自身に書かれている —— 詰め直しは次の変更要求で行う。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1170` | 本書の裁定 | 状態を「適用済」にし、着地先に `S-34` と `settings.json` を名指した |
| `DFC-1750` | 実績バーの上の名称ラベルが読みにくい | 状態を `仕様待ち` → `実測待ち` にした（生成だけで `src` に届き、手で書くコードは無い。出荷ビルドでの実測はまだ —— `DFC-1326` が `CR-603` の着地で取った形と同じ） |
| `perf-pending.md` の 59 | `CR-641` の生成物 `document-settings.ts` | 測り待ちに 1 行足した |

---

## 13. 測り方の再現

```
# the tree: 0647874d. settings.json is LF-only.

# the old text (section 3) appears exactly once in
# docs/spec/_source/settings.json before editing: the apply script asserts
# text.count(old) == 1 for the default line pair and for the note.

# npm run gen touches only 2 files (section 7): git status --short right
# after npm run gen lists docs/spec/_assets/tbl-settings.md and
# src/entity/document-model/document-settings/document-settings.ts besides
# the hand-edited files.

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-34

# full vitest suite with --reporter=json, once on 0647874d and once on this
# CR's tree; the sets of failing test names are compared (section 7).
# measured: 29727 tests on both trees, 53 failed on both, the two sets of
# (file, test name) are identical -- 0 new, 0 gone.
node ../../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<file>

# the numbers in the note (2.59 : 1, 87%) are the sample README's own
# measurements -- section 「1. 色どうしの比」 and 「2. 画面に届いた画素（掃引）」
# of previous-project-result/34-actual-bar-label-legibility/README.md --
# read directly, not re-measured here.
```
