# CR-388 — ダミーの上のポインタは押して掴むものを告げ、依存線の起点は 1 か所が答える

> **閉じるもの**: 利用者の答え 2026-09-15 `JDG-121`「すべて推奨通りにやれ。」の ③ と ④ —— 逐語は `docs/development-records/rulings.md` の同行。
> - ③ 表 T-028 の `IN-2` は、マイルストーンのダミー（表 T-023d の `GR-18`）の上を横方向の伸縮の合図と定めたままである。一方 `CR-382` の決定 4 で、`GR-18` は押すと同じ日の実績のマイルストーン（`GR-15`）と同じものを掴むようになった ⇒ 押す前の合図（伸縮）と押したときの操作（掴んで動かす）が食い違う。`DFC-597` の実装の続きであり、台帳の行は立てない
> - ④ 台帳 `DFC-607`: `src/framework/single-html-shell/frame-loop.ts` の `tentativeDependencyOf` が、`src/adapter/input-command-translator/input-command-translator.ts` の `commandFromDependencyDrag` と同じ断片（当たりがタスクのときだけ `dependencyEndAtPointer` を呼び、そうでなければ打ち切る）を写して持つ
>
> ⭐ **起草して、同じ波で `docs/spec` へ当てた。** 読んだ木は `c7077c5e`。`src/` と `tests/` には触れていない。
> ⭐ 2 件を 1 本にしたのは、`JDG-121` が 2 件の着地先を同じ変更要求と定めたからである。2 件は行も表も共有しない（第 2 節の `induced.py` で、書き換えた 2 行が同じ閉路に入らないことを確かめた）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-008`（描いたものを直接掴んで動かし、握っているあいだ結果が絵に出る）**。③ は、押す前のポインタの形が、押したら何を掴むかを偽りなく告げるようにする。④ は、引いているあいだの仮の線（`CR-383`）と離したときに作る依存が、同じ 1 本の答えから起点を読むようにし、片方だけが直されて仮の線と結果が離れることを防ぐ。

### ② レビュー観点のどの条項を当て、何が出たか

（`docs/development-rules/07-review-standards.md`）

- **`R1.3`（矛盾がない。唯一の正がある）** —— 表 T-028 の `IN-2` は「マイルストーンの図形の上は掴めることの合図」と「`GR-18` の上は横方向の伸縮の合図」を並べる。`CR-382` の後、`GR-18` は同じ日の `GR-15`（図形の上）と同じものを掴む（表 T-023d の `GR-18` の MUST）ので、同じ場所で同じものを掴むのに 2 つの合図が定められている ⇒ 決定 1。
- **`R2.7`（DRY）と `R2.19`（コンポーネント境界）** —— 依存線の起点を求める断片が `InputCommandTranslator` と `SingleHtmlShell` に 1 つずつ在る。表 T-064 の `PI-5` の欄の MUST NOT（式を写して持たせてはならない）と 1.9 が禁じる形である ⇒ 決定 3。
- **`R1.3`（設計の原稿とコードの一致）** —— 表 T-247 の `EG-2` で数えると、`frame-loop.ts` は `ItemHitArea` から `dependencyEndAtPointer` ・ `itemAtPointer` ・ `NOT_STORED_SIZES` を読んでおり、辺 `SingleHtmlShell` → `ItemHitArea` が在る。`_source/components.json` の `edges` にその辺が無く、`EG-5` / `EG-6` に反していた（本書より前から。検査 19 は層の向きだけを見るので捕まえていない）⇒ 決定 4。

### ③ 利用者に問うたこと・**問わずに決めた**こと

**問うて裁定を得た**: `JDG-121`（前に立つ者の推奨をすべて採る）。

**問うこと**: なし（0 件）。

**問わずに決めた（覆してよい）**:

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `GR-18` の上は **掴めることの合図**（`GR-15` の図形の上と同じ）。`GR-9` / `GR-17` は横方向の伸縮の合図のまま | `JDG-121` の ③。`IN-2` の既存の文「マイルストーンの図形の上は掴めることの合図」と、表 T-023d の `GR-18` の MUST「`GR-15` と同じものを掴む」。⭐ 前例 `DFC-200`（2026-09-02、`fixed-defects.md`）: `GR-18` が図形の上に立っていたあいだ、造りは `grab` を与えていた | ⚠️ `DFC-429`（2026-09-10、利用者の申し立て「実績タスクを触れるならマウスカーソルの形状をスライドに変更しろ」）の読みは、`GR-18` については退く。その申し立ては、ダミーが図形と別の日（翌稼働日）に立っていた時期のものであり、`JDG-90` / `JDG-101` がその位置を覆し、`JDG-121` が後の裁定として合図を定めた。`GR-9` / `GR-17` には `DFC-429` の読みがそのまま残る |
| 決定 2 | 依存線を構えているあいだの段（既定の矢印）は **1 文字も変えない** | 同段の「実績のダミー」は `GR-18` を含む ⇒ 構えのあいだは `GR-18` の上も既定の矢印のまま（`JDG-114` / `JDG-115`、`CR-383` の決定 2）。本書の新しい MUST は構えていないときの形だけを定める | なし |
| 決定 3 | 表 T-064 の `PI-7` に `dependencyStartOfHit` を足す。押したときの当たり（`itemAtPointer` の答え）がタスクのときだけ、そのタスクに限って `dependencyEndAtPointer` を問うた答えを返し、そうでなければ `null` を返す | `JDG-121` の ④ と `DFC-607` の案①（前に立つ者の推奨の名と形 `dependencyStartOfHit(geometry, x, y, hit)`）。⭐ 置き場が `PI-7` なのは、当たりの型 `Hit` と `dependencyEndAtPointer` がどちらも `ItemHitArea`（`src/entity/layout-engine/item-hit-area/item-hit-area.ts`）に在るからである ⇒ 新しいメンバは自分のコンポーネントの中だけを読み、層をまたぐ辺も層の中の辺も増やさない（表 T-061 の `LR-1` / `LR-3`）。呼ぶ側は Adapter と Framework で、どちらも内向き（`LR-1`） | 引数と戻り値は表 T-064 の前文により `src/` が持つので、署名は表に書かない。構えを渡さない（`FR-009` の MUST NOT）のは `dependencyEndAtPointer` と同じで、呼ぶのは構えが依存線のときだけ |
| 決定 4 | `_source/components.json` に辺 `SingleHtmlShell` → `ItemHitArea` を足し、生成物を刷り直した | 表 T-247 の `EG-2` / `EG-5` / `EG-6`。`InputCommandTranslator` → `ItemHitArea` は既に在る。`SingleHtmlShell` → `ScheduleLayout` / `ScheduleGeometry` は在ったが `ItemHitArea` は無かった | 図 F-013 は層と層の間だけを描き、`framework` → `layoutEngine` の矢印は既に在ったので形は変わらない（裏づけの数が 3 → 4）。経路ごとの図では「読む経路」（`view-read`）に 1 本増える |
| 決定 5 | 断片を写さない理由は 1.9 を指すだけとし、`PI-5` の欄の MUST NOT を `PI-7` に書き写さない | 1 つの規則に持ち主は 1 つ（`R1.3`）。`PI-7` の文は「同じ 1 本を読むために公開した」と目的だけを述べる | なし |

---

## 1. 測った

| 数 | 値 | 測り方 |
|---|--:|---|
| `IN-2` の中で `GR-18` を名指す所（当てる前） | 2（伸縮の合図の MUST と、その理由の ⚠️） | `IN-2` の行を Python で数えた |
| `IN-2` の `（MUST）`（当てる前 → 当てた後） | 2 → 3 | 同上 |
| `docs/spec` で「伸縮の合図」「掴めることの合図」を持つ行 | 1（`IN-2` だけ） | `grep` |
| 写された断片 | 2 か所（`input-command-translator.ts:2543-2546`、`frame-loop.ts:2235-2238`） | 2 つの関数を読んだ |
| `frame-loop.ts` が `ItemHitArea` から読む名 | 3（`dependencyEndAtPointer` ・ `itemAtPointer` ・ `NOT_STORED_SIZES`、`frame-loop.ts:44-49`） | import を読んだ |
| `_source/components.json` の `edges` | 85 → 86 | Python で数えた。`docs/review/components/components.md` の生成も 86 と書いた |
| 表 T-064 の `PI-7` のメンバ | 3 → 4 | 行を読んだ |
| 当てた後の数 | `tables=150  figures=11  rows=1942  uids=153` | `md-checks.py` の最終行。当てる前（`c7077c5e`）と同じ |

## 2. グラフ

**`impact.py IN-2 PI-7 GR-18 GR-15`**:

| 種 | 指している要求 / 参照 | 中身 |
|---|---|---|
| `IN-2` | 1 / 1 | `FR-101`（カーソルの綴りを宿主に渡す、の比喩）。持ち主は `FR-040` |
| `PI-7` | 1 / 1 | `FR-009`（`SL-1` を答える名に構えを渡さない） |
| `GR-18` | 3 / 9 | `FR-003`、`FR-016`（6 か所）、`FR-040`（`IN-2` の行）、`tbl-settings.md` |
| `GR-15` | 3 / 6 | `FR-043`、`FR-016`（3 か所）、`FR-103`（2 か所） |

**`impact.py T-028 T-064`**: 表 T-028 は 9 行、要求 14 / 2 次 38 / 要求以外 4。表 T-064 は 36 行、要求 3（`FR-003` `FR-009` `FR-016`）/ 2 次 14 / 要求以外 5。⭐ 行を足さずセルの文だけを変えたので、どちらの表の員数も動かない。

**`induced.py IN-2 GR-18 GR-15 GR-9 GR-17 AR-4 PTD-3 FR-043 PI-7 PI-5 FR-009 LR-3`**: 12 種すべて解決、辺 20、閉路 2 —— `FR-043 GR-17 GR-9`（大きさ 3）と `FR-009 PI-7 PTD-3`（大きさ 3）。⇒ 書き換えたのは `IN-2`（どの閉路にも入らない）と `PI-7`（2 つ目の閉路の 1 員だけ）である。`FR-009` と `PTD-3` は書き換えていない —— `FR-009` の MUST NOT（`itemAtPointer` に構えを渡さない）は新しいメンバにも成り立ち、`PTD-3` は依存線のドラッグの始まりを定めるだけで起点の求め方を述べない。

**届いた行を `rulings.md` で引いた**:

| 行 | 裁定 | 読んだ結果 |
|---|---|---|
| `IN-2` | `JDG-114` `JDG-115` | 依存線の構えのあいだは既定の矢印。決定 2 で据置 ⇒ 衝突 0 |
| `GR-18` | `JDG-05` `JDG-39` `JDG-90` `JDG-101` | 掴みも実績と合わせる（`JDG-05`）・1 か所（`JDG-39`）・同じ日の実績のマイルストーンと同じ姿（`JDG-90` / `JDG-101`）。決定 1 はどれとも整合 ⇒ 衝突 0 |
| `GR-15` | `JDG-39`（着地先の欄だけ） | 合図を述べない ⇒ 衝突 0 |
| `PI-7` / `FR-009` | `JDG-84` `JDG-114` `JDG-116` | 仮の線の形。起点をどこが答えるかを述べない ⇒ 衝突 0 |

⚠️ `rulings.md` の外で、`fixed-defects.md` の `DFC-429`（ダミーの上はスライド）と `DFC-200`（図形の上の `GR-18` は `grab`）が当たる —— 決定 1 の代償の欄に書いた。

## 3. 当てた中身

| 対象 | 置き場 | 中身 |
|---|---|---|
| 表 T-028 `IN-2` | `01-04-requirements.md` | 伸縮の合図の MUST の対象を「タスクの実績のダミー（`GR-9` / `GR-17`）」に絞り、理由の ⚠️ の名指しからも `GR-18` を外した。その後に 1 文: マイルストーンの実績のダミー（`GR-18`）の上は、同じ日の実績のマイルストーン（`GR-15`）の図形の上と同じく掴めることの合図とする（MUST）。理由: 押すと `GR-15` と同じものを掴むので、伸縮の合図は押す前の合図と押したときの掴みを食い違わせる。依存線の構えのあいだの段は据置 |
| 表 T-064 `PI-7` | `05-07-design.md` | メンバ `dependencyStartOfHit` を足した（決定 3 の字面）。`InputCommandTranslator`（離したときに依存を作る）と `SingleHtmlShell`（引いているあいだ仮の線を描く、`FR-009`）が同じ 1 本を読むために公開した。写すと片方だけが直されて離れる（1.9）。構えが依存線のときだけ呼ぶのは `dependencyEndAtPointer` と同じ |
| 辺 `SingleHtmlShell` → `ItemHitArea` | `_source/components.json` | 1 本足し、`python docs/spec/_source/build.py` で刷り直した: `_source/overview.json`（`framework` → `layoutEngine` の裏づけ 3 → 4）、`docs/review/components/components.md`（1 行）、`_source/view-read.drawio` と `_assets/view-read.svg`（1 本）。⚠️ `_source/view-io.drawio` と `_assets/view-io.svg` も書き直された —— どちらも 1 行のファイルで、この経路には 2 つの箱のどちらも無い（生成の揺れと読む） |

## 4. 数の予測

当てる前（`c7077c5e`）`tables=150  figures=11  rows=1942  uids=153`。本書の差: tables 0 / figures 0 / rows 0 / uids 0（セルの文だけ）。当てた後の実測も同じ（第 1 節）。

## 5. 影響 —— 本書の外で動くもの（実装と試験の波。本書は直さない）

| 所 | 何が動くか |
|---|---|
| `src/framework/single-html-shell/frame-loop.ts` の `POINTER_SHAPE_BY_GRAB`（:249-268） | `'GR-18': 'ew-resize'`（:256）を `'GR-15'` と同じ `'grab'` に。`pointerShapeAt`（:2370）の依存線の構えの枝（:2382-2388）は変えない |
| `src/entity/layout-engine/item-hit-area/item-hit-area.ts` | `dependencyEndAtPointer`（:411）の隣に `dependencyStartOfHit(geometry, x, y, hit)` を export する —— `hit` が `null` かタスクでなければ `null`、タスクなら `dependencyEndAtPointer(geometry, x, y, hit.item.taskUid)` |
| `src/adapter/input-command-translator/input-command-translator.ts` の `commandFromDependencyDrag`（:2543-2546） | 写した断片を `dependencyStartOfHit(context.geometry, press.at.x, press.at.y, press.hit)` の 1 行に |
| `src/framework/single-html-shell/frame-loop.ts` の `tentativeDependencyOf`（:2235-2238） | 同じく `dependencyStartOfHit(geometry, press.at.x, press.at.y, press.hit)` に。import（:44-49）に足す |
| 検査 26b | ⚠️ `src/` が `dependencyStartOfHit` を export するまで赤（新しい隙間 1）—— 表 T-064 が名を公開し、公開エントリが持たない。実装の波で閉じる |
| `tests/unit/in-2-a-the-dummies-say-slide.test.ts` | 逐語の定数 `IN_2_DUMMY_MUST`（:84）が旧文を持つ ⇒ 赤。`GR-18` を端点と同じ形と主張し本体と違う形と主張する節（:426-458）を、`GR-15` の図形と同じ形の主張へ。仕様だけを読む試験の体が書く |
| `tests/unit/in-2-pointer-shape.test.ts` | 注（:44、:72）が旧文の `GR-18` を引く。逐語の主張があれば赤 |
| 試験を足す | `IN-2` の新しい MUST（`GR-18` の上は掴めることの合図）と、`PI-7` の `dependencyStartOfHit`（当たりがタスクのときだけ答え、それ以外は `null`）を押さえる試験 |
| `docs/development-records/defects.md` | `DFC-607` を `実装待ち` |
| `docs/development-records/rulings.md` | `JDG-121` を足した |
| `docs/development-records/changelog.md` | 1 行（2.14） |

## 6. ⛔ この変更でやらないこと

- ⛔ 表 T-023d（`GR-18` の掴み、順、結び）を変えない —— 掴みは `CR-382` が既に定めた
- ⛔ `IN-2` の依存線の構えのあいだの段を変えない（決定 2）
- ⛔ `FR-009`、表 T-023a の `PTD-3`、表 T-064 の `PI-5` の MUST NOT を変えない（決定 3・決定 5）
- ⛔ 表 T-064 に型 `Hit` を公開名として足さない —— 新しいメンバの引数の型は `src/` が持つ（表 T-064 の前文）
- ⛔ `src/` と `tests/` と検査の基準線に触らない
