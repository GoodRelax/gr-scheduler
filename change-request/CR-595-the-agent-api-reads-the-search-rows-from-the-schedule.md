# CR-595 — `Agent API` が検索の当たりを `Schedule` から読む辺を、構成の図に足す

**台帳の行**: なし（検査 59 の赤そのものが起点。持ち場 L4 の段 B、`CR-571` の波 2b で見つけた）。
**番号**: 調整役から受けた（2026-09-27）。

⛔ **変えるのは `docs/spec/_source/components.json` の辺 1 本と、その生成物だけである。** 散文・表・要求の文には触れない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

**`CH-1` ／ `GL-004`（成果物が機械の読める構造化データである）。**
⭐ `CR-571` の `AM-25`（`readSearchRows`）は、外の AI が文書の中を言葉で探して、構造化された当たりの行を受け取る入口である。その答えを作る関数（`searchRowsOf`、表 T-064 の `PI-1`）は `Schedule` が持つ。
⛔ 構成の図がその依存を名乗らないあいだ、検査 59 は `src/` の import を「宣言されていない辺」として赤にし、次に紛れ込む本物の未宣言の辺を隠す。

### ② レビュー観点のどの条項を当て、何が出たか

**`R2.16`**（CA: 依存は一方向で中心を向く）—— ⭐ 辺は内向き（`Adapter` → `Entity`）である。
**`R2.19`**（コンポーネント境界: 参照してよいのは宣言された公開の入口だけ）—— ⭐ `searchRowsOf` は表 T-064 の `PI-1` の公開名であり、`Schedule` の入口から読む。`AgentApiEndpoint` は既に `ScheduleLayout`・`Document` の `Entity` を読んでいる（同じ層の間の同じ向き）。
**`R2.21`**（1 つの仕事は 1 か所）—— ⭐ 当たりを作る規則（表 T-330 の `SV-4`・`SV-8`）を `Agent API` の中に写さず、`Schedule` の 1 か所を呼ぶ。写せば同じ規則が 2 か所になる。
**`R1.3`**（唯一の正）—— ⚠️ `CR-571` の J-05 は `Agent API` が `searchRowsOf` を読むと書いたが、構成の図（`components.json`）に辺を足していなかった。**図と要求が食い違っていた**ので、図を要求へ揃える（`JDG-321` ② の形 —— 仕様の自己矛盾を変更要求で直す）。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. **辺の札は `search rows`、説明は `readSearchRows`（`AM-25`）の名を引く。** ⭐ ほかの辺と同じく、何を運ぶかを名乗る。
2. **もう 1 本の未宣言の辺（`AgentApiEndpoint` → `ScreenRenderer`、`hasRoomBelowPinsIn`）は宣言しない。** ⭐ その問い（表 T-332 の `SJ-8`）は描く側の知識ではなく配置の知識なので、関数を `ScheduleLayout` へ移し（表 T-064 の `PI-5` に 1 名を足す —— 規則 02 の 1 の「変更要求の要らない変更」）、既にある辺 `AgentApiEndpoint` → `ScheduleLayout` の上で読む。

---

## 1. ⭐ 編集計画（**オブジェクトごとに 1 回**）

```
1. docs/spec/_source/components.json の edges
     AgentApiEndpoint -> ScheduleLayout の行の直後に 1 行足す:
     { "source": "AgentApiEndpoint", "target": "Schedule", "arrow": "dependency",
       "label": "search rows",
       "description": "asks the schedule for the rows a search word finds, for readSearchRows (AM-25)" }
2. npm run gen（overview.json・docs/review/components/components.md を刷る。⛔ 手で書かない）
```

---

## 2. ⭐ 数の予測（**規則 02 の 2.**）

| | 予測 |
|---|--:|
| `tables` / `figures` / `rows` / `uids` | **0** |
| 構成の辺 | **+1** |
| 新しい設定値 | **0** |
| 再生成が要るファイル | `overview.json`・`components.md`（`npm run gen`）。図 `fig-components` と `view-*` は `check.sh` が刷り直さない（「NOT CHECKED」）|
| 検査 59 の未宣言の辺 | `AgentApiEndpoint` → `Schedule` の分が **−1** |
| 検査 39 の基準線 | **動かない**（MUST を足さない） |

---

## 3. ⛔ 覆したとき落ちる試験

⭐ 辺を消すと検査 59 が `src/adapter/agent-api-endpoint/agent-api-members.ts` の `searchRowsOf` の import を未宣言の辺として赤にする。
⭐ `readSearchRows` の振る舞いは `tests/contract/cr-571-agent-api-search.contract.test.ts` が持つ（本 CR は振る舞いを変えない）。
