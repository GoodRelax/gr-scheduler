# CR-711 —— 倍率の入口の端を答えるメンバ、刷らないパネルの見出しの語、固定した期間の左端の余白

> 状態: **適用済**（2026-10-08、当てる体。基の木 `7717d55e`）。仕様の表・辞書の原稿・生成器・試験・裁定 1 行を 1 つの変更で当てた。画面の振る舞いは変えない（5 節）。
> ID の帯: 番号 `CR-711`、裁定 `JDG-1725`（調整役が配った。使う前に全文書を引いて 0 件を確かめた。`JDG-1700`〜`JDG-1719` は別の席の帯なので使わない）。台帳の新しい行（`DFC`・`PND`）は使わない。仕様の新しい識別子は無い。
> 当てる裁定: `JDG-1725`（`JDG-1696` の下で調整役が採った推奨）。覆す裁定は無い。
> 閉じるもの: 検査 26b の基準線の 1 行（`InputCommandTranslator | zoomEntranceEndsOf`。`DFC-567` の 3 段目が足した、表 T-064 に無い越える名前）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定（全文は `docs/development-records/rulings.md` の該当行）

| 裁定 | 何を決めたか | 本書での扱い |
|---|---|---|
| `JDG-1725` | `CR-707` の 11 節の問い 1 —— 期間を固定した全体表示（表 T-367 の `FX-3`）にも起動の余白 `S-534` を足すか —— に「足さない」と答えた | E-03（記録だけ。仕様の字は変えない） |

利用者には問うていない。`JDG-1696` の「修正が容易なら推奨仕様でOK」の下で調整役が推奨を採った。利用者は戻ってから覆してよい。

### 0.2 裁定の鎖（rulings.md を「FX-3」「S-534」「余白」「見出し」「Properties Panel」「zoomEntranceEndsOf」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1630` | 起動直後の日程の左端に余白を取る（`CR-707` が `S-534` として当てた） | 保つ。余白は `OP-10` だけに当たる（`CR-707` の X-2） |
| `JDG-1669` | 固定したときの全体表示の縦は今どおり | 触れない |
| `CR-707` の 11 節の問い 1 | `FX-3` にも `S-534` を足すか（推奨: 足さない） | `JDG-1725` が答えた。`CR-707` は着地済みなので書き換えない（検査 62） |

⭐ 本書が「覆された」と印す行は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-006`（見分けられる）—— 端に在る倍率の入口を薄く描く読み口（`DFC-567` の 3 段目）が、公開の表に名を持つ。
- 辞書の原稿は、画面が刷る語だけを持つ形に戻る（`FR-038`・Chapter 6.2）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（唯一の正）** —— `SingleHtmlShell` が `InputCommandTranslator` の `zoomEntranceEndsOf` を読み、端の入口を薄く描く（`src/framework/single-html-shell/frame-loop.ts` の `zoomEntranceEndsOf(contextOf(frame))`）。表 T-064 の `PI-18` にその名が無く、検査 26b の基準線が 1 行で抱えていた。⇒ メンバの行を足し、基準線から刈った。
- **`R1a`（矛盾する要求が無いか）** —— `FR-072` は「⛔ パネルの先頭に見出しの行を置いてはならない（MUST NOT）」と定める。一方、辞書の原稿 `docs/spec/_source/display-words.json` の `surfaces` は `Properties Panel` の見出しの語（ja「プロパティパネル」／ en「Properties Panel」）を持ち続けていた。`src/` はその語を読まない（`src/adapter/screen-renderer/open-modals.ts` の `surfaceHeading` が引く面は `SURFACE_OF_ROW` の 7 つと `Help Modal` だけで、`Properties Panel` を含まない）。⇒ どの画面も刷らない語であり、`05-07-design.md` の 6.2（「生成器が毎回そこから起こして原稿と突き合わせる」）の突き合わせが、刷らない語を求め続けていた。原稿から落とし、生成器の名簿からもその面を除いた。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | `zoomEntranceEndsOf` の行は `PI-18` の `rowBandCeilingOf` の後に置く | 同じ倍率の解き方（`src/adapter/input-command-translator/zoom-and-fit.ts`）から出る、殻が読む答えの隣 | 無い |
| X-2 | 型 `ZoomEntranceEnds` は表に足さない | 殻は型を名で import せず `ReturnType` で受ける。検査 26b の基準線も型を挙げていない | 型の名は表に無い |
| X-3 | 生成器 `tools/generate_display_words.py` は `IC-52` の面の名簿から `Properties Panel` を除く（`SURFACES_WITHOUT_HEADING`） | 名簿は `IC-52` の「面」の欄（閉じる入口が立つ面の全数）から起こしている。閉じる入口はパネルにも立つので、欄からパネルを消すのは誤り。見出しを刷らない面を除く理由は `FR-072` の MUST NOT にあり、`EXPORT_FORMATS_NOT_OFFERED` と同じ形で生成器が持つ | 除く面の名が生成器に 1 つ残る |
| X-4 | `tests/contract/display-words.contract.test.ts` は、見出しを刷らない面の語を「落とした」と記録するのをやめ、`FR-072` の場合で 0 件を確かめる | 語が無くなったので落とす理由も無い。残る道は、語が戻ったときに赤くなることである | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 変える所 | 編集 |
|---|---|---|
| 倍率の入口の端を答えるメンバ | `docs/spec/_source/published-entries.json` の `PI-18`（生成物 `docs/spec/_assets/tbl-published-entries.md` の 表 T-064） | E-01 |
| 刷らないパネルの見出しの語 | `docs/spec/_source/display-words.json` の `surfaces`（生成物 `src/adapter/screen-renderer/display-words.json`）・`tools/generate_display_words.py` | E-02 |
| 固定した期間の左端の余白 | 無い（`JDG-1725` を記録するだけ） | E-03 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行（4.13） | E-04 |

数: 要求 ±0。表の行 ±0。表 ±0。表 T-064 のメンバ ＋1（332 → 333）。辞書の語 −2（872 → 870）。設定値 ±0。図 0。命令 ±0。`（MUST）` の印 ±0。

---

## 2. 新しい識別子

無い。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| 辞書の原稿 `surfaces` の `Properties Panel`（`heading` の ja「プロパティパネル」／ en「Properties Panel」） | 無い（E-02） |
| `.claude/skills/spec-graph-check/crossing-names-baseline.txt` の `InputCommandTranslator \| zoomEntranceEndsOf` と、その注の 1 行 | 無い（E-01 が表に名を持たせたので、基準線が抱える理由が無い） |
| `tests/contract/display-words.contract.test.ts` の `drop('surfaces', …, 'FR-072 (MUST NOT) puts no heading row …')` | 見出しを刷らない面の語を集め、`FR-072` の場合で 0 件を確かめる（X-4） |

---

## 4. 書き直す所（当てた文）

### E-01 —— 表 T-064 の `PI-18` に 1 行

`rowBandCeilingOf` の後に足す:

```
zoomEntranceEndsOf
  倍率の 4 つの入口（`IC-12`〜`IC-15`）のそれぞれについて、いま押しても倍率が 1 段も動かない端に在るかを答える（時間の軸は `_assets/tbl-settings.md` の `S-75` の範囲と `S-229`、行の軸は 表 T-262 の `ZE-1`・`ZE-3`）。
  ⭐ 殻が、端に在る入口を `FR-029` のとおり薄く描くために読む —— 押したときと同じ刻みの解き方で答えるので、薄い印と押した結果が食い違わない。
  ⛔ 端を解くのは本メンバ 1 本とし、描く側が倍率の範囲を別に解き直さない
```

### E-02 —— 辞書の原稿から `Properties Panel` の見出しを落とす

`surfaces` の 9 項から `Properties Panel` を消し、8 項にした。生成器の名簿は `IC-52` の面の欄から `SURFACES_WITHOUT_HEADING` を除いたものになる。

### E-03 —— `JDG-1725`

仕様の字は変えない。`FX-3` は「期間の両端の日の列を `Row Area` の両端に合わせる（MUST）」のまま、`S-534` は `OP-10` だけに当たるままである。

### E-04 —— 変更履歴 4.13

`docs/development-records/changelog.md` に 1 行（番号が重なれば調整役が付け直す）。

### 4.1 生成物

`npm run gen:entries`（`tbl-published-entries.md`）と `npm run words`（`src/adapter/screen-renderer/display-words.json`）で起こし直した。手では直していない。

---

## 5. 継ぎ目（コード）

| 所 | 何をしているか |
|---|---|
| `src/adapter/input-command-translator/zoom-and-fit.ts` の `zoomEntranceEndsOf` | 変えない。本書は表に名を持たせただけ |
| `src/adapter/screen-renderer/display-words.json` | 生成物。`surfaces` から 1 項が落ちる。読む側（`open-modals.ts`・`search-panel.ts`・`delay-diagnostics-report.ts`・`dialogue-field.ts`）はどれも `Properties Panel` を引かないので、画面は変わらない |

⚠️ `src/adapter/screen-renderer/` の下のファイルが変わるので、`perf-pending.md` に行を足した（検査 66）。毎フレームの仕事は変わらない（語の表から 1 項が減るだけ）。

---

## 6. グラフ（`7717d55e` の上で当てた後、`impact.py PI-18 FX-3`）

| 起点 | 要求 / 参照 | 本書の扱い |
|---|---|---|
| `PI-18` | 1 件 / 1 か所（`FR-052`） | 指す側の字は変えない。メンバが 1 つ増えるだけ |
| `FX-3` | 0 件 / 1 か所（`tbl-settings.md` の 4 節） | 変えない |

---

## 7. 数の予測と実測

| 数 | 前 | 後 | 測り方 |
|---|---|---|---|
| 表 T-064 のメンバ | 332 | 333 | `npm run gen:entries` の出力 |
| 検査 26b の基準線が抱える越える名前 | 130 | 129 | `check-published-members.py` の `OK` の行 |
| 辞書の語 | 872 | 870 | `npm run words` の出力 |

---

## 8. 波

1 つの波で足りる。

---

## 9. 仕様の外で直すもの

- 生成器: `tools/generate_display_words.py`（X-3）。
- 試験: `tests/contract/display-words.contract.test.ts`（X-4）。新しい `（MUST）` は無いので、逐語の試験は足さない。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- `IC-52` の面の欄からパネルを消さない（閉じる入口はパネルにも立つ）。
- `FX-3` と `S-534` の字を変えない（`JDG-1725`）。
- 行 → タスクグループの改名はしない（`CR-708`）。

---

## 11. 利用者に問うこと

無い（`JDG-1725` は `JDG-1696` の下で推奨を採った。覆すときは `JDG-1725` の行を覆す）。

---

## 12. 台帳

| 行 | 本書での扱い |
|---|---|
| `JDG-1725` | 適用済、着地先 表 T-367 の `FX-3`・表 T-206 の `S-534`（直すものは無い） |

---

## 13. 測り方の再現

```
# the tree: worktree at 7717d55e
git grep -c "CR-711\|JDG-1725" HEAD                          # 0 hits before this change
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py PI-18 FX-3
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-published-members.py
git grep -n "Properties Panel" HEAD -- src/adapter/screen-renderer   # the panel's own roster filter only; no heading read
```
