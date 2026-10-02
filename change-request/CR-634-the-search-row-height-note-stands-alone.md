# CR-634 — 検索の表の行の高さ（`S-427`）の注を「同上」から書き下す

> 起草の状態: 当てた（2026-10-03、枝 `spec-pass-1001`、調整役の指示 `JDG-1035`）。読んだ木も当てた木も `spec-pass-1001` の `1194d47c`。E-01 の旧は当てる木で 1 回だった。
> ID の帯: 番号 `CR-634` は調整役から受けた（どの枝の `change-request/` にも無いことを測った。10 節）。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。
> 当てる順: どの変更要求とも独立である（`S-427` を書く草案はほかに無い。10 節）。
> 閉じるもの: 無い —— `defects.md`・`pending-decisions.md` に `S-427` を追う行は無い（10 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 何が起きているか

1. **`S-427` の注は「同上」で始まる。** `docs/spec/_source/settings.json` の `S-427`（検索の表の行の高さ、`FR-151` の 表 T-330 の `SV-17`）の注は「同上。⚠️ 表 T-333 の最大の段（`S-433`）の字が入る高さであること」である。「同上」は 表 T-206 の 1 つ上の行の注を継ぐ。
2. **1 つ上の行が窓の行に変わった。** `CR-621`（`37f3c446`）は `S-426` を「検索パネルの縁を掴める幅」から「ウインドウ（`FR-036` の 表 T-335）の縁を掴める幅」に改め、注を「ウインドウの見せ方であり…」に書き換えた。⇒ `S-427` の注は、今は窓の縁の注（`S-250` と同じ性質、内と外は同じ値、`S-230` と同じ 6px、測って決めた値ではない）を継いで読める。`S-427` は窓の縁と関わらない。
3. **継ぐはずだった中身。** `CR-621` の前（`37f3c446^`）の「同上」の鎖は `S-423` まで遡り、`S-427` の注は「パネルの見せ方であり、日程の内容ではないので保存しない。⛔ 値はまだ無い —— 触れる見本で決める」を継いでいた。`S-427` の既定は今も「未定 🔎」なので、この中身は今も正しい。
4. **前例。** `CR-629`（`3efc540f`）は同じ理由で `S-425`・`S-428` の「同上」を書き下し、注の頭を「検索パネルの見せ方であり、日程の内容ではないので保存しない。」とした。`S-427` だけが残った。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⛔ **どれも前へ進めない。** 表 T-054 の `CH-1` 〜 `CH-7` のどれも、`GL-001` 〜 `GL-009` のどれも、本書で前へ進まない —— 仕様の手入れである。表の注は値の出どころと性質を持つ（`R1.3` 唯一の正）。継ぐ先を取り違えた注は、窓の縁の性質を検索の表の行に誤って着せる。本書はそれを外すだけで、値も要求も変えない。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾がない）** —— 「同上」が継ぐ中身が `S-426` の書き換えで変わり、`S-427` の注が窓の縁の注になった。継がずに書き下す（E-01）。
- **`R1.4`（境界）** —— 既定が「未定 🔎」のままなので、注は値の出どころを言えない。`CR-621` の前の中身「値はまだ無い —— 触れる見本で決める」をそのまま持つ。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 注の頭を `S-425`・`S-428` と同じ「検索パネルの見せ方であり、日程の内容ではないので保存しない。」にする | `CR-629` の前例。`S-427` は検索パネルの表の寸法である | 無い |
| 決定 2 | `CR-621` の前に継いでいた「⛔ 値はまだ無い —— 触れる見本で決める」を書き下して持つ | 既定は今も「未定 🔎」 | 無い |
| 決定 3 | 「⚠️ 表 T-333 の最大の段（`S-433`）の字が入る高さであること」はそのまま残す | `S-427` 自身の注である | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 検索の表の行の高さの注 | 表 T-206 の `S-427`（原稿 `docs/spec/_source/settings.json` の `S-427` の `note.ja`） | E-01 |

**数**: 原稿 JSON の注 1。値・名・要求の文 0。表の行の増減 0。図 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・関数の名のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`1194d47c`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 注の頭「同上」 | `settings.json` の `S-427` の `note.ja` | 書き下した 2 文（保存しないことと、値はまだ無いこと） | E-01 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（`1194d47c` で 1 回）。

<!-- EDIT id=E-01 file=docs/spec/_source/settings.json -->
旧
```text
     "id": "S-427",
     "value": {
      "ja": "検索の表の行の高さ（`SV-17`）"
     },
     "default": {
      "ja": "未定 🔎"
     },
     "note": {
      "ja": "同上。⚠️ 表 T-333 の最大の段（`S-433`）の字が入る高さであること"
     }
```
新
```text
     "id": "S-427",
     "value": {
      "ja": "検索の表の行の高さ（`SV-17`）"
     },
     "default": {
      "ja": "未定 🔎"
     },
     "note": {
      "ja": "検索パネルの見せ方であり、日程の内容ではないので保存しない。⚠️ 表 T-333 の最大の段（`S-433`）の字が入る高さであること。⛔ 値はまだ無い —— 触れる見本で決める"
     }
```

当てた後に打つもの: `npm run gen`（`tbl-settings.md` を刷る）→ `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

---

## 5. 継ぎ目

```
SEAM
- Table T-206 row S-427 (search table row height): note only. The leading
  ditto is replaced by the row's own text; value, name and default unchanged.
- No src or test change: S-427 has no value, and no file in src or tests cites it.
- No new settings row, no new constant, no new identifier.
```

---

## 6. グラフ（`1194d47c`）

- `impact.py S-427`: `S-427` を指す要求 1 件（`FR-151`、`01-04-requirements.md:5011` の `SV-17`）・参照 1 箇所。`SV-17` は行を名指すだけで注を写していない ⇒ ほかの文の書き換えは 0。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | `1194d47c` | 本書を当てた後 | 差 |
|---|---|---|---|
| 設定値の行 | 変わらない | 変わらない | 0 |
| tables / figures / rows / uids（`md-checks.py`） | 変わらない | 変わらない | 0 |
| `tbl-settings.md` の `S-427` の注 | 「同上。…」 | 書き下した注 | 注のみ |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（1 回） | 当てる体 |
| 1 | `docs/spec/_source/settings.json`（`S-427` の 1 行）＋ 生成物 ＋ `changelog.md` の 1 行 | E-01、`npm run gen`、`gen:check`、check.sh | 仕様の波 |

- ⭐ **毎フレームの経路: いいえ。** 注だけが変わる。`perf-pending.md` の行は要らない。

---

## 9. 仕様の外で直すもの

無い —— コード・試験・台帳のどれも変えない。

---

## 10. 測り方の再現

```
# the tree: spec-pass-1001 1194d47c

# the number is unused on every branch (handoff.md only names it as the next free one)
for r in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes); do git grep -l 'CR-634' $r -- . ; done

# the old block appears once (section 4)
grep -c '"ja": "同上。⚠️ 表 T-333 の最大の段（`S-433`）の字が入る高さであること"' docs/spec/_source/settings.json   # -> 1

# what the ditto inherited before CR-621 (section 0.1 item 3)
git show 37f3c446^:docs/spec/_source/settings.json | grep -n -A12 '"S-42[3-7]"'

# nobody else cites S-427 (section 5)
git grep -n 'S-427' -- src tests docs/spec ':!docs/spec/_assets/tbl-settings.md'

# no ledger row tracks S-427 (header)
grep -n 'S-427' docs/development-records/defects.md docs/development-records/pending-decisions.md

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-427
```
