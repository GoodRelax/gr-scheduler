# CR-638 — `N` で始めた空の文書の週の始まりは `S-108`（月曜 ＝ `1`）とする

> 起草の状態: 当てた（2026-10-03、`CR-637` を当てたコミット `e393fbb6` の上）。起草と当てを同じコミットで行った。4 節の旧はどれも当てる木で 1 回だった（10 節）。
> ID の帯: 番号 `CR-638` は調整役から受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。台帳の行は調整役の帯 `DFC-1712`〜`DFC-1719` から `DFC-1713` を 1 つ使う（9 節）。
> 当てる順: `CR-637` の後、`CR-639` の前（触る行は重ならない）。
> 閉じるもの: `JDG-1184` の仕様の側 —— 持ち場 F の仕様だけを読む試験の体（`CR-611`）が見つけた読みの割れ（表 T-342 の `BK-4` の読み A `null` と、`S-108` の読み B `1`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-1184` | 「月曜（1）を入れる (Recommended)」（問い「N で始めた空の文書の「週の始まり」はどうしますか？」への答え。もう一方の択は「空（null）にする」） | 読み B —— 表 T-342 の `BK-4` に 1 文: `weekStartDay` は `null` にせず、`S-108`（月曜 ＝ `1`）とする（E-01）。`S-108` の注に、空の文書にもこの値を書くことを足した（E-02） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-004`**（機械が読める構造化データとして出し入れできる） —— `FR-054` は週の目盛を `Project.weekStartDay` に従わせ、取り込んでいない文書の既定を `S-108` に持たせる。空の文書が `null` を書き出すと、交換相手のツールは自分の既定で週の始まりを読み、`GRS` の画面と食い違う（`JDG-1184` の示した理由）。暦（`BK-3`）を同じ 表 T-209 の既定で埋めるのと同じ扱いにする。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— `BK-4` の「`null` を取れる列は `null`」と、`S-108` の「置き場は `Project.weekStartDay`」・起動の見本（`weekStartDay` が `1`）が、空の文書の `weekStartDay` について 2 つの答えを出していた。⇒ `BK-4` の例外を「`calendarUid` だけ」から「`calendarUid` と `weekStartDay` の 2 つだけ」に広げて閉じる（E-01）。
- **`R1.4`（境界・空の場合）** —— `FR-054` の RATIONALE は既定を持たない列として `minutesPerWeek`・`daysPerMonth` を挙げ、`weekStartDay` を挙げていない —— 本書の読みと食い違わない。`FR-054` は変えない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **`BK-4` の 1 文目を書き直し、理由を 1 文足す**（`calendarUid` だけは → `calendarUid` と `weekStartDay` の 2 つだけは） | 「だけ」を残して文を足すと、同じ升の中で 2 つの文が食い違う（`R1.3`） | 無い |
| 決定 2 | **`S-108` の注に、空の文書（`BK-4`）にもこの値を書くと足す** | `JDG-1184` の着地先の欄が `S-108` を名指す。値の行から、その値を書く所へ戻れる | 無い |
| 決定 3 | **`FR-054` は変えない** | 既に「取り込んでいない文書の既定は表 T-209 の `S-108` が持つ」と書く | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 空の文書の週の始まり | `FR-095` の 表 T-342 の `BK-4`（1 文目の書き直しと 1 文） | E-01 |
| 値の行から戻る道 | `_source/settings.json` の `S-108` の注 | E-02 |

**数**: 表の升 2。行の増減 0。要求の文 0。図 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・要求のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`e393fbb6`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「`calendarUid` だけは `BK-3` の暦を指す」 | 表 T-342 の `BK-4` | 「`calendarUid` と `weekStartDay` の 2 つだけはそうしない —— `calendarUid` は `BK-3` の暦を指す」＋ `weekStartDay` の 1 文 | E-01 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること（当てる木で 1 回）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧（`BK-4` の升の頭）
```text
| BK-4 | `project` | `null` を取れる列（`_assets/fig-erd-detail.md` の 表 T-058）は `null` とし、`calendarUid` だけは `BK-3` の暦を指す（`FR-054`）。<br>
```
新
```text
| BK-4 | `project` | `null` を取れる列（`_assets/fig-erd-detail.md` の 表 T-058）は `null` とし、`calendarUid` と `weekStartDay` の 2 つだけはそうしない —— `calendarUid` は `BK-3` の暦を指す（`FR-054`）。<br>`weekStartDay` は `_assets/tbl-settings.md` の 表 T-209 の `S-108`（月曜 ＝ `1`）とする —— 暦（`BK-3`）と同じく既定で埋める。<br>空のまま書き出すと、交換相手のツールが自分の既定で読み、`GRS` の画面の週の始まりと食い違う。<br>
```

<!-- EDIT id=E-02 file=docs/spec/_source/settings.json -->
旧（`S-108` の `note.ja`）
```text
週の目盛が書く日付の基準（`FR-054`）。置き場は `Project.weekStartDay`
```
新
```text
週の目盛が書く日付の基準（`FR-054`）。置き場は `Project.weekStartDay`。⭐ 新しく始めた空の文書（`01-04-requirements.md` の 表 T-342 の `BK-4`）にもこの値を書く
```

当てた後に打つもの: `npm run gen`（`_assets/tbl-settings.md` を刷る。`src` の生成物は動かない —— 注は生成した定数に載らない）→ `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

### 4.1 重なり

`change-request/CR-6[0-3]*.md` で `BK-4` を書くのは `CR-611`（表 T-342 を立てた。着地済み —— ⛔ 追記しない）だけ。`CR-637`・`CR-639` は表 T-342 と `S-108` に触れない。

---

## 5. 継ぎ目

```
SEAM (CR-638)
- A blank document (FR-095, table T-342) holds Project.weekStartDay = S-108
  (DEFAULT_CALENDAR_VALUES['S-108'], Monday = 1), not null. calendarUid and
  weekStartDay are the only nullable Project columns BK-4 does not null.
- Reading B of the split lane F found: the spec-only test for CR-611 (an
  it.todo for BK-4 in tests/contract/cr-611-*.test.ts, on another branch) is
  to be written to reading B. Not edited here.
```

---

## 6. グラフ（`e393fbb6`）

- `impact.py BK-4`: `FR-095` の 1 箇所（表 T-342 を名指す）。
- `impact.py S-108`: `FR-054` の 1 箇所（「取り込んでいない文書の既定は表 T-209 の `S-108` が持つ」 —— 本書の読みと同じ）。
- `induced.py FR-095 T-342 BK-4 S-108 FR-054`: 種 5/5、辺 8、閉路 1（`FR-054` `S-108`）—— 値の行とその規則を持つ要求の作法の閉路である。本書は `S-108` だけを書き、`FR-054` は書かない。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables / figures / rows / uids | 差 0 | 升 2 つだけ |
| `（MUST）` ／ `（MUST NOT）` の印（`01-04-requirements.md`） | 差 0 | 表の升に印を書かない |
| `src` の生成物 | 差 0 | `S-108` の値は変わらない |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（どれも 1 回） | 当てる体 |
| 1 | `docs/spec/01-04-requirements.md`（`BK-4`）・`docs/spec/_source/settings.json`（`S-108` の注）＋ 生成物 ＋ `changelog.md` の 1 行 | E-01・E-02 | 仕様の波（本書） |
| 2 | `src/`・`tests/` | 9 節 | コードの波（調整役が配る、`DFC-1713`） |

- ⭐ **毎フレームの経路: いいえ。** 空の文書を作る 1 回の値だけが変わる。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

- 空の文書（表 T-342）を組む所が `Project.weekStartDay` を `DEFAULT_CALENDAR_VALUES['S-108']` で埋めること。⚠️ いまの `src/framework/single-html-shell/frame-loop.ts` の `carryOutOwedAction`（`startNewDocument`）は起動の見本（`FR-027`）で置き換えており、表 T-342 の空の文書はまだ組まれていない（`CR-611` のコードの巡）。
- 持ち場 F の仕様だけを読む試験（`CR-611`、別の枝の `tests/contract/cr-611-*.test.ts` の `BK-4` の `it.todo`）は、読み B で書く —— ⛔ 本書は試験に触れない。
- 台帳: `DFC-1713` を足した（`実装待ち`）。

---

## 10. 測り方の再現

```
# the tree: this worktree after the CR-637 commit (e393fbb6); both files are LF-only

# the old texts appear once (section 4) -- a script in the session scratchpad
#   (cr638_edits.py: E-01 old=1 new=0, E-02 old=1 new=0 before applying)

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py BK-4
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-108
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-095 T-342 BK-4 S-108 FR-054

# no test of this tree quotes BK-4
git grep -n "BK-4" -- tests src tools   # -> nothing

# where src reads the default
git grep -n "S-108" -- src   # schedule-grid.ts, svg-renderer.ts (?? fallback), schedule-entities.ts (the value 1)
```

---

## 11. 利用者に問うこと

無い。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1184` | 本書の裁定 | 状態を「適用済」にした |
| `DFC-1713` | コードの波（9 節） | 足した（`実装待ち`） |
