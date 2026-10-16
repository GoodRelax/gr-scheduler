# CR-778 —— 表 T-064 の `PI-39` から、`CR-772` で消えた軸の型 `GrabbedVerticalAxis` を引く

> 状態: ⭐ **当てた** —— 2026-10-16、アルファの第 2 レーンの席（`6c11e22a` の上）。仕様の段（原稿 `_source/published-entries.json` と `npm run gen`、変更履歴 4.89）とコード（書き出しを消した）を 1 つの巡で当てた。
> ID の帯: 番号 `CR-778` と変更履歴 4.89 を調整役から受けた。新しい行の ID は使わない。
> 閉じるもの: `DFC-2903`。当てる裁定: なし（仕様の側の取り残しを引くだけで、振る舞いを変えない）。
> 覆すもの: なし。`CR-772` が表 T-289 の `taskGroupGrabStateMachine` から軸を引いたとき、表 T-064 の項が残った —— 本書はその片づけである（`CR-772` には追補しない —— 検査 62）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`6c11e22a`）

| 主張 | 見たもの | 扱い |
|---|---|---|
| 表 T-289 に軸は無い | 真。`taskGroupGrabStateMachine` の状態は `notGrabbed`・`grabPressed`・`carrying` で、軸を運ぶ値は無い | 表 T-064 の項を引く |
| `GrabbedVerticalAxis` を読む者は無い | 真。`src` と `tests` で名を持つのは、型の宣言（`gesture-values.ts`）と再輸出（`advance-screen-session.ts`）の 2 か所だけ | 両方を消す |

### 0.2 裁定の鎖（`rulings.md` を「軸」「`GrabbedVerticalAxis`」「`taskGroupGrabStateMachine`」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-2390`〜`JDG-2394` | `CR-772` の本体（1 回のドラッグで隙間と段を選ぶ） | 変えない。本書は取り残しを引くだけ |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-1`・`GL-008`（描いたものを直接掴んで日程を変えられる） —— 掴んで運ぶ状態機械の公開の形が、表 T-289 の今の状態と食い違わなくなる。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（唯一の正） —— 表 T-064 が、表 T-289 に無い型を公開すると言っていた。引いて 1 つにした。
- `R2.9`（YAGNI） —— 読む者の無い型を、検査 26b を緑に保つためだけに書き出していた。消した。

### ③ 利用者に問わずに決めたこと（覆してよい）

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 型の宣言ごと消す（公開をやめて残すのではなく） | 読む者が 0 で、表 T-289 にも無い | — |

---

## 1. 範囲

| 観点 | 本書の前 | 本書の後 |
|---|---|---|
| 表 T-064 の `PI-39` の項 | `GrabbedVerticalAxis`（掴んだタスクグループを動かす軸 —— 表 T-289）を含む | 含まない |
| `src` | `gesture-values.ts` が型を宣言し、`advance-screen-session.ts` が再輸出する | どちらも無い |

## 2. ⛔ 消したもの（旧 → 新）

| 旧 | 新 |
|---|---|
| `_source/published-entries.json` の `PI-39` の項 `GrabbedVerticalAxis`「型。」「掴んだタスクグループを動かす軸 —— 表 T-289」 | なし |

## 3. 数

| 何か | 予測 | 実測 |
|---|---|---|
| 変わる表 | 1（表 T-064） | 1（`_assets/tbl-published-entries.md` の `PI-39` の 1 行） |
| 表の行 | ±0（行の中の項が 1 つ減る） | ±0 |
| 増える・消える行 ID | 0 | 0 |
| 変わる図 | 0 | 0 |
| `src` で名を持つ所 | 2 → 0 | 0（`grep -rn GrabbedVerticalAxis src tests docs/spec`） |

## 4. 継ぎ目（コード）

- `src/use-case/advance-screen-session/gesture-values.ts` の型 `GrabbedVerticalAxis` を消した。
- `src/use-case/advance-screen-session/advance-screen-session.ts` の再輸出から名を消した。
- 検査 26b（公開の名と表 T-064 の突き合わせ）が両側の一致を確かめる。

## 5. 台帳

- `DFC-2903` を閉じる（決定仕様は本書）。
