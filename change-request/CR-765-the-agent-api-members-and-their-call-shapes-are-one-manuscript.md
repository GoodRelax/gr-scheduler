# CR-765 —— `Agent API` の 22 のメンバと呼び方（引数・型・戻り値）を 1 つの原稿が持ち、コードの型と MCP の道具の入力はそこから刷る

> 起草の状態: 起草だけ（2026-10-15、`4a907919` の上で起草した）。当てていない —— `docs/spec`・`src`・`tests`・生成器に触れていない。11 節に利用者へ問うことは無い（裁定 `JDG-2160` が向きを決め、残りは ③ に問わずに決めたこととして書いた）。仕様の差し替え・`npm run gen`・コード・試験は調整役が体に手配する。
> ID の帯: 番号 `CR-765`〜`CR-768`、裁定 `JDG-2220`〜`JDG-2229`、台帳 `DFC-2720`〜`DFC-2729`、`PND-948`〜`PND-951`、見本の置き場 `57` を調整役から受けた（4 つの変更要求で共有）。本書が使うのは `CR-765` だけ。変更履歴と `perf-pending` の番号は当てる体が調整役から受ける。`4a907919` の木で `CR-765` を名乗るものは 0 件だった（13 節）。
> 当てるもの: 裁定 `JDG-2160`（表 T-107 を `_source` の JSON の原稿にし、22 のメンバの引数の名・型・戻り値を書き起こし、表 T-107・`AgentApi` の型・MCP の道具の入力の形をそこから生成する）。閉じるもの: 台帳 `DFC-2641`。`DFC-2645` の手の写しのうち `WRITTEN_PROPERTIES` も本書が消す。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`4a907919`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| 引数の名の手の写しは `WRITTEN_PROPERTIES` 1 つ | 4 つある —— `AgentApi`（`agent-api-members.ts` の 166 行）、`WRITTEN_PROPERTIES`（`mcp-tool-translator.ts` の 55 行）、`RelayedParams` と `MEMBER_PARAMETERS`（`relayed-call.ts` の 15 行・55 行）、取次の `'waitMs'` の字（`mcp-relay-server.ts` の 482〜484 行）。試験にも 2 つ（`PARAM_KEYS`） | 4 つとも原稿から刷る（5 節）。試験の写しは原稿を読む形に直す |
| TS の引数の名と MCP の鍵は同じ | 21 のメンバで同じ。`watchChanges` だけ違う —— TS は受け手 `receive`、取次へ運ぶ値は空、MCP は `waitMs`（`AG-12` の ⑤） | 原稿はメンバごとに、TS の引数と、MCP だけの鍵を分けて持つ（X-d） |
| 戻り値の型は仕様に名がある | `Document`・`DocumentStamp`・`Selection`・`SearchRows`・`DocumentCommand`・`Refusal` は 表 T-064 の行（`PI-34`・`PI-3`・`PI-32`・`PI-1`・`PI-8`・`PI-9`）。ほかの 14（`AgentWriteRequest`・`AgentWriteOutcome`・`AgentRefusal`・`AgentRefusalReason`・`AgentExport`・`AgentFocusOutcome`・`AgentImportSource`・`AgentShownTasks`・`AgentDelayDiagnostics`・`AgentChangeReceiver`・`AgentWatch`・`AgentUtteranceOutcome`・`DialogueMessage`・`ChangeNotice`）は仕様に名が無い | 14 の型を原稿で書き起こし、新しい表に刷る（X-b）。6 つは行を指すだけ |
| 表 T-107 は生成できる場所にある | `tbl-glossary.md` は手で書く書。手で書く書の中に生成の領域を置いた前例は無い。表を自分の生成物の書へ移した前例は 2 つ（`CR-278` の 表 T-016、`CR-712` の 表 T-233・表 T-234） | 表 T-107 を新しい生成物の書へ移す（X-a）。用語辞書の 6 節は指す文だけを残す |
| 表 T-107 を移しても読み手は困らない | ファイル名を手で並べる所がある —— `tests/contract/spec-table.ts` の `FILES`、検査 8 本ほど（`check-dictionary-table-covariance.py`・`check-line-breaks.py`・`check-marks.py`・`check-must-clause-coverage.py`・`audit-ch5.py`・`style-checks.py`・`check-render.py`）、`tools/follow_the_manuscript.py`・`tools/fix_line_breaks.py`。「`_assets/tbl-glossary.md` の 表 T-107 の `AM-16`」を逐語で引く試験（`cr-571`・`cr-728`） | 偽 —— 当てる体と試験の体が同じ巡で直す（5 節）。`specindex.py` は書を自分で探すので、行の辺は動かない |
| 表 T-107 の行の並びは自由 | 並びは行 ID の順ではなく（`AM-25`・`AM-26`・`AM-19` が `AM-6` と `AM-7` の間）、試験が並びを止める（`Object.keys(api())` と MCP の道具の並び） | 原稿の並びを刷る並びとする（今と同じ） |
| `CR-752` と同じ文を書く | `CR-752` は 5.3 節の「引数・戻り値は `src/` の公開エントリが持ち…（表 T-107 と同じ扱いである）」を消し、「境界値は Chapter 6.1 が持つ（表 T-107 と同じ扱いである）」を残す（`CR-752` の 77 行・99 行）。表 T-107 の前文と中継の設計書には触れない | 本書は 5.3 節に触れない。`CR-752` の後に当てれば「同じ扱い」が真になる（8 節） |

### 0.2 裁定の鎖（`rulings.md` を「`T-107`」「`AgentApi`」「`WRITTEN_PROPERTIES`」「`mcp-tool-descriptions`」「引数」「`AG-12`」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-2071` | 仕様書が唯一の正 | 本書の起こり（`DFC-2641` はその ③ の調べ） |
| `JDG-2160` | 表 T-107 を原稿にし、引数・型・戻り値を書き起こし、表・型・MCP の入力を生成する | 本書そのもの |
| `JDG-618`・`JDG-1387` | `AM-25`・`AM-16`・`AM-26`・`AM-27` を足した | 変えない。原稿へそのまま移す |
| `JDG-124`・`JDG-280` | `agent-api-members.ts` の型の読み先 | 変えない（型の生成の領域の外の import は手で書く） |

覆す裁定: 無い。覆すのは 表 T-107 の前文と `design-mcp-relay.md` の 2 文（裁定ではなく本文、`DFC-2641`）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-1`（`GL-004`、構造化した日程データを出す）—— 外の AI は 表 T-107 の呼び方で日程を読み書きする。呼び方が仕様に無いと、コードの形が変わったときに外の AI の手順が黙って変わる（`DFC-2641` の証拠）。
- ほかに直接進める課題は無い —— 画面は変わらない。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（唯一の正）—— 引数の名が 4 か所（0.1 の 1 行目）。原稿 1 つにする。
- `R2.5`（ISP）—— 22 のメンバを 1 つの面に並べる理由は 5.2 節が持つ。本書は面を分けない。
- `R2.21`（1 つの仕事は 1 か所）—— MCP の型（`string` ・ `number` ・ `object`）を TS の型から導く規則を 1 か所（`design-mcp-relay.md` の 3.1 節）に書き、生成器だけが実装する（X-e）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 原稿は `docs/spec/_source/agent-api-members.json`（と手で書く `agent-api-members.schema.json`、刷る `agent_api_members_json_to_md.py`）。刷る書は `docs/spec/_assets/tbl-agent-api-members.md`（UID `DOC-TBL-AGENT-API-MEMBERS`）。用語辞書の 6 節は節の頭と、表 T-107 の置き場を指す 1 文だけを残す | `CR-581` の 表 T-064（`published-entries.json`）の 3 つ組の前例。手で書く書の中に生成の領域を置かない | 0.1 の 5 行目のファイル名の一覧と逐語の試験を直す |
| X-b | 名の無い 14 の型を、同じ原稿の型の区で書き起こし、新しい表「`Agent API` が受け渡す値の型」に刷る。行 ID の接頭辞は `AV`（`4a907919` で `AV` は空いている。登録簿 `row-id-prefixes.json` は 216 件）。6 つの型（`Document` ほか）は 表 T-064 の行を指すだけ | 裁定の「戻り値を書き起こす」。戻り値の型の名だけでは呼び手が欄を知れない | 表 +1、行 +14、接頭辞 +1 |
| X-c | 表 T-107 に 2 つの欄「引数」「戻り値」を足す（「品詞と純粋性」の後）。引数の欄は 1 行に 1 つ、「名: 型 —— 意味」。引数の無いメンバは `—` | 見出しで欄を読む試験・生成器（`確定名`・`品詞と純粋性`・`何を担うか`・`正`）は見出しが残れば動く | 表が横に広くなる |
| X-d | `watchChanges` の MCP だけの鍵 `waitMs` は、原稿のメンバに「MCP だけの鍵」として書く。`exportPng` の運ぶ形（TS は `Uint8Array`、取次へは base64 の文字列、MCP は画像）は `design-mcp-relay.md` の今の文が持つ —— 原稿は TS の戻り値だけを書く | 1 つのメンバが 3 つの見え方を持つのは 2 つだけ。規則として既に書かれた形は書き写さない | — |
| X-e | MCP の入力の型は TS の型から機械で導く —— `string` → `string`、`number` → `number`、`readonly number[] | null` → `["array","null"]` の `number` の並び、名の付いた型 → `object`。規則を `design-mcp-relay.md` の 3.1 節に書く。⭐ 引数の意味の 1 文を MCP の各鍵の説明（`description`）にも刷る | 型を 2 つ書くと食い違いうる（`JDG-2161` の理由と同じ）。説明は道具の説明と同じく原稿から刷り、手で書かない | MCP の `tools/list` の答えに鍵ごとの説明が増える（形と鍵は変わらない —— 試験は鍵だけを止める） |
| X-f | `Agent API` の版（`AM-1` が返す値、いま `AGENT_API_VERSION = 4`）は原稿が持ち、表 T-107 の前文に刷る | 版は外の AI との約束であり、呼び方が変われば上がる（`AG-1`）。呼び方の正を仕様に置くなら版も仕様に置く | 呼び方を変える変更要求は、原稿の版も上げる |
| X-g | 生成するもの: 表 T-107 と 表 T-新（`AV`）の書、`AgentApi` の型と 14 の値の型（`agent-api-members.ts` の生成の領域）、`RelayedParams`・`MEMBER_PARAMETERS`（`relayed-call.ts` の生成の領域）、`mcp-tool-descriptions.json`（道具の名・説明に入力の形を足し、`WRITTEN_PROPERTIES` を消す）、取次の `waitMs` の鍵 | 0.1 の 1 行目の 4 つの写しを 0 にする | — |
| X-h | 用語辞書 6 節の 2 つの ⚠️ の段（見せ方の群を読む面を置かない ／ クリップボードと `localStorage` は無い）は、原稿の「表の後の文」として刷る書へ移す | 表 T-107 の注であり、表と同じ書に置く | — |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| 表 T-107 の置き場 | 手で書く `tbl-glossary.md` の 6 節 | 原稿 `_source/agent-api-members.json` から刷る `_assets/tbl-agent-api-members.md` |
| 引数・戻り値 | `src/` の公開エントリが持つ（表 T-107 の前文・`design-mcp-relay.md`） | 表 T-107 の 2 つの欄と 表 T-新（`AV`）が持つ |
| `AgentApi` の型・値の型 | 手で書く | 原稿から生成 |
| MCP の道具の入力 | `WRITTEN_PROPERTIES` を手で書く | 原稿から `mcp-tool-descriptions.json` に刷る |
| 外の AI に見えるもの | 道具の名・説明・入力の鍵と型 | 同じ。鍵ごとの説明が増える（X-e） |
| 画面 | — | 変わらない |

---

## 2. 新しい識別子

| 何か | 置き場 | 番号 |
|---|---|---|
| 表「`Agent API` が受け渡す値の型」 | `docs/spec/_assets/tbl-agent-api-members.md`（刷る） | 当てる時に 表 の最大の次を測り直して取る。本書では 表 T-新 と書く |
| その行の接頭辞 | `docs/spec/_source/row-id-prefixes.json` | `AV`（行は `AV-1`〜`AV-14`）。当てる時に空きを測り直す |
| 書の UID | 刷る書の頭 | `DOC-TBL-AGENT-API-MEMBERS` |

⚠️ 並んで起草している `CR-766`（命令の原稿）・`CR-767`（状態機械）も新しい書と原稿を作る —— 表の番号は当てる順に取る（規則 02 の 2.5 節）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `tbl-glossary.md` の 6 節の前文 4 文（「**`Agent API` は 1 つの面に 22 のメンバをフラットに並べる。**」〜「本表は名前と、何を担うかだけを持つ。」）と 表 T-107 の 22 行と表の後の 2 つの ⚠️ の段 | X-1（6 節は指す 1 文だけ）・X-2（刷る書） |
| `design-mcp-relay.md` の 3.1 節「引数の名と型は `src/` の公開エントリが持つ `AgentApi` の署名である（表 T-064 の `PI-17`）。」 | X-3 |
| `design-mcp-relay.md` の 8 節「- 引数と戻り値の型 —— `src/` の公開エントリ（表 T-064 の `PI-17`）。」 | X-3 |
| 「`tbl-glossary.md` の 表 T-107」と書く所（`design-mcp-relay.md` の 57 行・158 行・194 行、`published-entries.json` の `PI-17` の注、`01-04-requirements.md` の 表 T-332 の `SJ-9` ほか —— 当てる時に `grep -rn "tbl-glossary.md. の 表 T-107\|tbl-glossary.md の 表 T-107" docs/spec` で数え直す —— `4a907919` で 8 か所） | 「`tbl-agent-api-members.md` の 表 T-107」 |

ほかの文は消さない。`05-07-design.md` の 5.3 節は `CR-752` が持つ（0.1 の最後の行）。

---

## 4. 書き直す所

### X-1 —— `tbl-glossary.md` の 6 節

```
## 6. `Agent API` のメンバ

**Type**: SECTION

表 T-107（`Agent API` のメンバ）と、その呼び方（引数・型・戻り値）は `_assets/tbl-agent-api-members.md` が持つ（原稿 `_source/agent-api-members.json`）。
```

### X-2 —— 刷る書 `tbl-agent-api-members.md`（原稿の中身）

前文（原稿の `before`）:

```
**`Agent API` は 1 つの面に 22 のメンバをフラットに並べる。**
用途別に分けない理由は Chapter 5.2 が持つ（`R2.5`）。
いまの版は 4 である（`AM-1` が返す値。呼び方を変える変更は版を上げる —— 表 T-035 の `AG-1`）。
⭐ **呼び方（引数の名・型・意味と戻り値）は本表と 表 T-新 が持つ** —— コードの `AgentApi` の型と、MCP の道具の入力の形は本表の原稿から生成し、手で書かない。境界値は Chapter 6.1 が持つ。
```

表 T-107 の見出し:

```
| 行 ID | 群 | 確定名 | 品詞と純粋性 | 引数 | 戻り値 | 何を担うか | 正 |
```

引数と戻り値の欄の値（`4a907919` のコードの形をそのまま写す。⚠️ 写す前に 1 つずつ、表の「何を担うか」「正」と食い違わないかを確かめ、食い違えば `DFC-` の行にする —— 規則 01 の ⑤）:

| 行 | 引数 | 戻り値 |
|---|---|---|
| `AM-1`・`AM-2` | —（プロパティ） | `number` ／ `string` |
| `AM-3` | — | `Document`（表 T-064 の `PI-34`） |
| `AM-4` | — | `DocumentStamp`（`PI-3`） |
| `AM-5` | — | `Selection`（`PI-32`） |
| `AM-6` | — | `DialogueMessage` の並び（`AV-`） |
| `AM-25` | `word: string` —— 探す語 | `SearchRows`（`PI-1`、表 T-331） |
| `AM-26` | — | `AgentShownTasks`（`AV-`） |
| `AM-19` | — | `AgentDelayDiagnostics`（`AV-`） |
| `AM-7` | `request: AgentWriteRequest` —— 照合する刻印と命令の束 | `AgentWriteOutcome`（`AV-`） |
| `AM-8` | `source: AgentImportSource` —— 取り込む文書 | `AgentWriteOutcome` を待つ値 |
| `AM-9`・`AM-10` | — | `AgentWriteOutcome` |
| `AM-11`〜`AM-13` | — | `AgentExport<string>`（`AV-`） |
| `AM-14` | — | `AgentExport<Uint8Array>` を待つ値 |
| `AM-15` | — | `AgentExport<string>` を待つ値 |
| `AM-16` | `taskUid: number` —— 見せるタスクの `uid` | `AgentFocusOutcome`（`AV-`） |
| `AM-27` | `taskUids: readonly number[] | null` —— 表示にするタスクの `uid` の並び。`null` は解除 | `AgentWriteOutcome` |
| `AM-17` | `receive: AgentChangeReceiver` —— 変更を受け取る手。⚠️ MCP だけの鍵 `waitMs: number` —— 待つ長さ（`AG-12` の ⑤） | `AgentWatch`（`AV-`） |
| `AM-18` | `text: string` —— 置く発話 | `AgentUtteranceOutcome`（`AV-`） |

表 T-新 —— `Agent API` が受け渡す値の型（`AV-1`〜`AV-14`、欄: 行 ID ／ 型の名 ／ 欄（名: 型 —— 意味）／ 正）。中身は `4a907919` の `agent-api-members.ts` の 53〜159 行、`dialogue-log.ts` の 7 行、`change-notice.ts` の 25 行の形を写し、正の欄は 表 T-035 の `AG-3`・`AG-6`・`AG-9a`・`AG-11`、`FR-066`・`FR-134`・表 T-353 を指す。`AgentRefusalReason` は理由の行（表 T-233・表 T-220）を指すだけで、語を書き写さない。

表の後の文（原稿の `after`）: 今の 6 節の 2 つの ⚠️ の段（X-h）。

### X-3 —— `design-mcp-relay.md`

3.1 節:

```
- **道具の入力** —— 1 つのオブジェクトとし、鍵はそのメンバの引数の名とする。
  引数の名・型・意味は 表 T-107 の引数の欄が持ち（`tbl-agent-api-members.md`）、道具の入力の形はその原稿から刷り、手で書かない。
  入力の型は TS の型から導く —— `string` は文字列、`number` は数、数の並びか `null` は数の並びか null、名の付いた型はオブジェクト。鍵ごとの説明は引数の欄の意味である。
  引数を持たないメンバとプロパティ（`agentApiVersion` ・ `schemaVersion`）は空のオブジェクトを受ける。
  ⚠️ `watchChanges` だけは受け手の代わりに待つ長さ `waitMs` を受ける（`AG-12` の ⑤）—— 表 T-107 の `AM-17` の MCP だけの鍵である。
```

8 節:

```
- 引数と戻り値の型 —— 表 T-107 と 表 T-新（`tbl-agent-api-members.md`）。
```

### 4.1 生成物

当てる体が `npm run gen` で `docs/spec/_assets/tbl-agent-api-members.md`・`docs/spec/_assets/tbl-row-id-prefixes.md`（`AV`）・`src/adapter/mcp-tool-translator/mcp-tool-descriptions.json`・生成の領域（`agent-api-members.ts`・`relayed-call.ts`・取次の鍵）・`docs/development-records/test-inventory.md` を刷り直す。`strictdoc export docs/spec`（`rm -rf output`）。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えるもの |
|---|---|
| `docs/spec/_source/agent-api-members.json`・`.schema.json`・`agent_api_members_json_to_md.py` | 新しい原稿・契約・刷り手（`published-entries` の 3 つ組に倣う。`--check`、`package.json` の `gen`・`gen:check` の `mcptools` の前に置く） |
| `tools/generate_mcp_tool_descriptions.py` | 表 T-107 の書ではなく原稿を読み、道具ごとに `inputSchema` を刷る。`check-provenance.py` の組（説明の json が名指す原稿）も替える |
| 新しい生成器（または `generate_mcp_tool_descriptions.py` を広げる。名は当てる体が `JDG-820` で付ける） | `agent-api-members.ts`・`relayed-call.ts`・`mcp-relay-server.ts` の生成の領域 |
| `src/adapter/agent-api-endpoint/agent-api-members.ts` | `AgentApi`・14 の値の型・`AGENT_API_VERSION` を生成の領域へ。実装 `agentApiMembers()` は手で書く |
| `src/adapter/agent-api-endpoint/relayed-call.ts` | `RelayedParams`・`MEMBER_PARAMETERS` を生成の領域へ |
| `src/adapter/mcp-tool-translator/mcp-tool-translator.ts` | `WRITTEN_PROPERTIES` と型の 4 つの定数を消し、生成された json の `inputSchema` を読む |
| `src/framework/mcp-relay-server/mcp-relay-server.ts` | `'waitMs'` の字を生成された値から読む |
| `.claude/skills/spec-graph-check/literal-restatement-baseline.txt` | `WRITTEN_PROPERTIES` の記録（76〜78 行）を同じ巡で抜く |
| ファイル名の一覧（0.1 の 5 行目の 10 か所ほど） | 新しい書を足す |
| `docs/development-rules/03-implementation.md` | 新しい生成の定数を一覧に足す（検査 30） |
| `.claude/skills/spec-graph-check/check-published-members.py` | 注の「18 members」を直す（仕様の外） |

試験（仕様だけを読む別の体が書く —— 規則 04）:

- 表 T-107 の 22 行の引数の欄の名と順が、MCP の道具の入力の鍵（`AM-17` は MCP だけの鍵）と、取次が渡す引数の順に等しいこと。入力の型が 3.1 節の導き方のとおりであること。表 T-新 の型の欄が、`Agent API` が返す値の欄と等しいこと（`readDocument` 以外の値の型を 1 つずつ）。
- `tests/contract/cr-613-seam-2-mcp-tool-translator.contract.test.ts`・`cr-613-seam-1-*` の `PARAM_KEYS`、`tests/unit/uf-27-28-29.test.ts` の 表 T-107 の写しは、原稿か刷った表を読む形に直す。逐語で書の名を引く試験（`cr-571`・`cr-728`）は新しい書の名へ。

毎フレームの経路に触れない —— `perf-pending` の行は要らない。

---

## 6. グラフ（`impact.py`・`induced.py`、`4a907919`）

- 誘導部分グラフ（20 対象: `T-107`・`PI-17`・`AG-12`・`AG-3`・`AG-6`・`AG-9a`・`FR-066`・`FR-028`・`T-035`・`CHN-10`・`NF-3`・`UF-28`・`CP-40`・`UT-4`・`AM-7`・`AM-17`・`AM-16`・`AM-25`・`AM-27`・`IC-157`）: 20 の種がすべて解決、辺 24、閉路 0 ⇒ 1 つずつ書いてよい。
- 届く所（`impact.py`、深さ 2）: 表 T-107 は要求 10 件（`UC-015`・`FR-009`・`FR-012`・`FR-134`・`FR-155`・`FR-151`・`FR-022`・`FR-087`・`FR-064`・`FR-150`）から指され、2 次 53 件。どれも行 ID か表の番号で指し、引数の形を写していない（「引数」を 表 T-107 の行で引いて 0 行 —— `DFC-2641` の測り）。書の名で指す所は 3 節の 4 行目。
- 足す辺: `AM-n` → `AV-n`（戻り値と引数の型）、`AV-n` → `PI-n`・`AG-n`・表 T-233。消す辺は無い。
- 並んで起草・適用している変更要求との重なり: `CR-752` が 5.3 節で 表 T-107 を引く（0.1）。`CR-757`（枝 `claude/compassionate-goldberg-0bf1a8` の `6f7c3ac3`）は `AM-7` を引くが行を書き替えない。`CR-766` は `AgentWriteRequest` の命令の束の入力の形を、本書の生成器に足す（8 節）。`CR-759`〜`CR-764` の草案は見えなかった —— 調整役が当てる前に「`T-107`」「`AM-`」で測り直す。

---

## 7. 数の予測

- 要求 ±0、`UID` ±0、図 ±0。
- 表 +1（表 T-新）、表の行 +14（`AV-1`〜`AV-14`）—— `4a907919` の `check.sh` は `tables=240  figures=30  rows=3269  uids=183`、本書だけを当てた後の予測は `tables=241  rows=3283`。表 T-107 の 22 行は書を移るだけで数は変わらない。
- `（MUST）`: ±0（新しい文に MUST を足さない）。

---

## 8. 波

### 8.1 幅（`05-working-method.md` の 11 節）

触る `src` のファイル: `agent-api-members.ts`・`relayed-call.ts`・`mcp-tool-translator.ts`・`mcp-relay-server.ts`。`CR-740`・`CR-752`〜`CR-758` の本文はどれも名指さない ⇒ 造りの体 1 つ ＋ 試験の体 1 つ（仕様の原稿と刷り手は前に立つ者か体 1 つ）。

### 8.2 順

1. `CR-752` の後（5.3 節の「表 T-107 と同じ扱いである」が真になる）。
2. 波の中: 原稿・契約・刷り手 → 用語辞書 6 節・中継の設計書・書の名の置き替え（3 節）→ `npm run gen` → 生成器（TS の領域と道具の入力）→ コード → 試験。⚠️ 新しい原稿の行は、それを読むコードと同じ巡で着地させる（規則 02 の 3.5 節）。
3. `CR-766` の前 —— `CR-766` は `AM-7` の `request` の入力の形を、命令の原稿から刷る形に替える（今は名の付いた型なので `object`）。

---

## 9. 仕様の外で直すもの

- 検査の注の古い数（`check-published-members.py` の「18」）。
- ファイル名を手で並べる一覧（5 節）。
- 見本は作らない（画面は変わらない）。

---

## 10. ⛔ この変更でやらないこと

- メンバを足す・消す・名を変えること。
- MCP の入力に `required` や `additionalProperties` を足すこと —— 取次は入力を検めない（`AG-12` の結び）。検めるのはページの `Agent API` である。
- 命令（表 T-108）の運ぶ値 —— `CR-766`。
- 表 T-064 のほかの名の呼び方（`DFC-2640`）。

---

## 11. 利用者に問うこと

無い —— 向きは `JDG-2160` が決めた。③ は `JDG-1696` に従い推奨を取った（覆してよい）。

---

## 12. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `defects.md` | `DFC-2641` の対応方針の欄の頭に「指示 —— `CR-765` が当てる」を書いた（本書の起草と同じコミット）。ステータスは `仕様待ち` のまま |
| `rulings.md` | `JDG-2160` の状態の欄を「指示 —— `change-request/CR-765-the-agent-api-members-and-their-call-shapes-are-one-manuscript.md` が当てる」にした |
| `changelog.md` | 当てる体が番号を受ける |

---

## 13. 測り方の再現

```
git grep -c "CR-765" 4a907919 -- change-request docs src tests previous-project-result tools   # 0 件
grep -n "^| AM-" docs/spec/_assets/tbl-glossary.md | wc -l                                       # 22
grep -rn "引数・戻り値\|src/. の公開エントリ" docs/spec --include=*.md
grep -rln "WRITTEN_PROPERTIES\|MEMBER_PARAMETERS\|RelayedParams\|PARAM_KEYS" src tests
python -c "import json;d=json.load(open('docs/spec/_source/row-id-prefixes.json',encoding='utf-8'));print(len(d['prefixes']))"   # 216
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-107
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py <6 節の 20 対象>
```

---

## 14. 利用者の実物の手順と見積り

- 実物の手順（調整役へ送る）: MCP の取次を起こし、客から `tools/list` を読んで、22 の道具の名と入力の鍵が今と同じで、鍵ごとに説明が付くこと。`focusTask` に `taskUid` を渡して寄ること、`watchChanges` に `waitMs` を渡して待つこと（今と同じ）。
- 見積り（当てる側）: 原稿の書き起こし（22 のメンバと 14 の型）2 時間、契約と刷り手 2 時間、TS と道具の入力の生成器 3 時間、書の名の置き替えと一覧 1.5 時間、仕様だけを読む試験 2 時間、`check.sh` と全試験 1 時間 —— 計 11.5 時間ほど。
