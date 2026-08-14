# A02 — `Agent API` の要求とサンプル

**担当範囲**: `Agent API` の**要求**と**サンプル**。命令の一覧・受理／拒否の返し方・束の原子性・取り消しの扱い・サンプル JSON の全鍵。

---

## 0. 読んだ文書と行数

| # | 別名 | ファイル | 行数 | 読んだ範囲 |
|:--:|:--:|---|--:|---|
| 1 | `REQ` | `previous-project-result/10-agent-interface/agent-interface-requirements-ja.md` | 304 | **全文** |
| 2 | `SMP` | `previous-project-result/10-agent-interface/agent-interface-samples-ja.md` | 180 | **全文** |
| 3 | `JSON` | `previous-project-result/10-agent-interface/samples/agent-apply-request-and-outcomes.json` | 77 | **全文** |
| 4 | `DOC` | `previous-project-result/10-agent-interface/samples/grs-document-with-revision-stamp.json` | 96 | **全文**（担当は別。食い違いの照合に必要なので読んだ） |
| 5 | `SPEC` | `docs/spec/01-04-requirements.md` | 3728 | **部分**（`FR-028` / `FR-031`＋表 T-027 / `FR-063` / `FR-064`＋表 T-035 / `FR-066` / `UC-012` の該当行のみ） |
| 6 | `E03` `E04` `E09` | `previous-project-result/temp/inventory/` の該当 3 枚 | — | **部分**（照合した行のみ） |

> ⚠️ **読んでいない文書**（本書の主張はこれらに**基づかない**）: `agent-interface-spec-ja.md`（691 行）／`agent-interface-open-items-ja.md`（572 行）／`ai-cowork-trial-findings-ja.md`（335 行）／`previous-project-result/DISCARDED-ja.md`（212 行）。
> `REQ` / `SMP` はこの 4 つを繰り返し名指しするので、**「〜に書いてある」という記述は転記であって検証ではない**。本書ではそれを **未検証** と書く。

**要求の件数（自分で数えた）**: `REQ` の `### A-n` 見出しは **18 個**（`REQ:31,44,52,69,83,95,108,120,129,147,158,175,202,220,229,251,262,271`）。うち `A-17`（`REQ:262`）が取り消し線つきの**不採用**なので、**生きている要求は 17 件**。表題の「17 件」と一致する。

---

## 1. API の表面 —— 呼び出しの一覧と触るもの

| # | 呼び出し | 返す形 | 触るエンティティ | 出典 |
|:--:|---|---|---|---|
| F-1 | `readDocument()` | **凍結された複製**（素の値。拒否を載せる口が無い） | 文書全体（変えない） | `SMP:162`／`REQ:83-89`／`REQ:59-61` |
| F-2 | `readRevision(): number` | 素の整数 | `revisionStamp.revision`（変えない） | `SMP:162`／`REQ:60`／`JSON:64` |
| F-3 | `applyCommands(request)` | **`ApplyOutcome`**（受理可否を値で返す） | 命令次第（`Task` / `Dependency` …）＋ `revisionStamp` ＋ `changeLog` ＋ 取り消しの履歴 | `SMP:163`／`JSON:6-21`／`REQ:52-58` |
| F-4 | `watchChanges(request)` | **未規定**（`onChange` を渡す形。**解除の手段が 3 文書に無い**） | `revisionStamp` を見るだけ（変えない） | `SMP:165-166`／`JSON:65-67,73-74` |
| F-5 | `undo(steps)` | **未規定** | 取り消しの履歴 | `SMP:169` |
| F-6 | `exportPng()` | **`Promise`。失敗の返し方は未規定**（`REQ` が明記） | 画面出力（変えない） | `REQ:62-63` |
| F-7 | 画面出力と各形式の書き出し（関数名は 3 文書に無い） | 文字列 / blob。**ダウンロードのダイアログを出さない** | 出力寸法・文字サイズ・倍率は `documentSettings` を読む | `REQ:220-227` |

| 事実 | 内容 | 出典 |
|---|---|---|
| 入口は 1 つ | 単一 `.html` の中で公開する入口は **1 つだけ**。名前は **`globalThis.grSchedulerAgentApi`** | `REQ:34-35` |
| 既定は非公開 | **既定では公開しない。** エージェント起動時は**起動側のフラグ**、人間が起動したときは**画面での有効化**で公開する | `REQ:35-36` |
| 起動時の読み込み側（API ではない） | `readBootDocument(hostDocument)` が `{ bootDocument, failureReason }` を返す。`failureReason` の値は **`'boot-holder-not-unique'` / `'boot-document-unparsable'`** の 2 つ | `SMP:135-147` |

---

## 2. 命令（`commandName`）の一覧

**3 文書に現れる `commandName` は 2 種だけである（自分で数えた）。**

| # | `commandName` | 触るエンティティ | サンプルに現れた引数 | 出典 |
|:--:|---|---|---|---|
| C-1 | `update-task` | `Task` | `taskUid` / `start` / `finish` | `JSON:10,11-12,29,47` |
| C-2 | `create-dependency` | `Dependency` | `predecessorUid` / `successorUid` / `linkType` / `lag` / `lagFormat` | `JSON:49-50` |

⚠️ **これで全部ではない。** 3 文書に命令の一覧表は無い。`SMP:12` が「対応する仕様: `agent-interface-spec-ja.md`」と名指しし、`JSON:2` が "See agent-interface-spec-ja.md section 3" と書く。**同書（691 行）は本担当では読んでいない＝未検証。**

**命令の形について確かめられたこと**

| 規約 | 内容 | 出典 |
|---|---|---|
| 鍵名は `commandName` | トライアルの `{"type": "place"}` を改めた。**`type` という無意味な汎用語を使わない** | `SMP:167` |
| 動詞-名詞のケバブ | `update-task` / `create-dependency`。⚠️ **実例 2 件からの帰納であり、規約として書かれてはいない（未検証）** | `JSON:10,49` |
| 履歴操作は命令ではない | `undo` は**コマンドから外した**（→ §5） | `SMP:169` |
| 命令の引数は文書の列名を使う | `start` / `finish` は `Task` の列名そのまま。⚠️ ただし `uid` が `taskUid` に変わる（`DOC:38` は `uid`、`JSON:10` は `taskUid`）。**改名規則を書いた記述が無い（未検証）** | `JSON:10` ↔ `DOC:38` |

---

## 3. 受理／拒否の返し方 —— `FR-028` と整合するか

### 3-1. `ApplyOutcome` の鍵（サンプル実測）

| 鍵 | 受理時 | 拒否時 | 出典 |
|---|---|---|---|
| `accepted` | `true` | `false` | `JSON:17,33,54` |
| `revision` | 新しい版数 | **現在の版数（進まない）** | `JSON:18,36,56` |
| `document` | 文書の不変の複製 | **現在の文書がそのまま返る**（読み直しの往復が要らない） | `JSON:19,37,57` |
| `rejectionReason` | （無し） | `stale-base-revision` ／ `invalid-argument` | `JSON:34,55` |
| `expectedRevision` | （無し） | 版ずれのときだけ付く | `JSON:35` |

**拒否の理由コードは 2 種だけ確定している**（自分で数えた）。`document-locked` は「実例は無い」と明記されている（`SMP:180`）。

### 3-2. `FR-028` との整合

| 観点 | `FR-028`（`SPEC:3094`） | `A-9`（`REQ:52-63`） | 判定 |
|---|---|---|---|
| 例外を投げない | 「受理したか否かを値で返すこと。**例外を投げてはならない（MUST NOT）**」 | 「失敗は投げるのではなく、**受理されたか / 受理されなかった理由 / 現在の文書**を返す」 | **一致** |
| 適用範囲 | 「人が UI で行える編集・確認・出力と同じこと」＝**全呼び出し**に読める | **`ApplyOutcome` を返す呼び出しだけ**（書く / 履歴 / 見せる）。**`read*` と `export*` は素の値**を返すので拒否を載せる口が無い | **`REQ` のほうが狭い。** `REQ:59-61` は「矛盾ではない」と自弁する —— 公開点は人が明示的に有効化したときにだけ存在するので「呼べたのに読めない」状態が無く、**読みは常に成功する**と考えてよい |
| 画像化の失敗 | `AG-8`「画像化に失敗したときも、呼び出した側が**失敗を値で受け取れること**」（`SPEC:3155`） | 「`exportPng()` は例外。**失敗の返し方は未規定。次期が決めること**」 | **仕様書が先へ進んでいる。** ただし**形はまだ無い**（→ O-1） |
| 拒否の中身 | `AG-9a`「拒否の値には、**拒否された対象**・理由の区分・現在の版数を含めること（MUST）」（`SPEC:3156`） | サンプルの拒否は**理由と版数は持つが、どの命令が落ちたかを示す鍵が無い** | **サンプルが `AG-9a` を満たしていない**（→ O-3） |
| 拒否したら現在の文書を返す | `AG-2`（`SPEC:3146`） | `A-3`（`REQ:97-98`）／実例（`JSON:37`） | **一致** |

---

## 4. 束（batch）の全か無か

| 事実 | 内容 | 出典 |
|---|---|---|
| 原子性 | 複数の変更をまとめて渡せる。**途中で 1 つでも拒否されたら、全部を元に戻す。** 半端に適用された文書を残さない | `REQ:120-123`／`SPEC:3147`（`AG-3`） |
| 拒否時は版数も動かない | 文書は一切変わらず、**`revision` も進まない** | `SMP:93-94`／`JSON:56-57` |
| 1 回の呼び出し = 取り消し 1 段 | API 専用の履歴を作らない | `REQ:111`／`SPEC:1481` |
| 1 回の呼び出し = `changeLog` 1 件 | 「One atomic batch: … One Undo step, one changeLog entry.」 | `JSON:5`／`DOC:11-18` |
| なぜ要るか | 日程の変更は「タスクを動かす」「依存を張り直す」「行を移す」が**セットで初めて意味を持つ**。片方だけ通ると通知で説明できない状態になる | `REQ:125-127`／`SMP:96-98` |
| 裏付けの強さ | **実測ではない。** 「実装して運用（拒否時の巻き戻しは発生せず）」＝**実装のみ** | `REQ:290` |
| 版ずれのやり直し方 | ① 返ってきた `document` を使う（読み直し不要）／② **同じコマンドを機械的に再送しない。判断からやり直す**／③ `baseRevision` を更新して送る。トライアルでは 6 回とも②を踏んだ | `SMP:80-84`／`JSON:39` |

---

## 5. 取り消し（Undo）は命令の 1 つか → **いいえ**

| 事実 | 内容 | 出典 |
|---|---|---|
| 命令ではない | トライアルの `{"type":"undo","count":2}` を **`undo(steps)`** に改め、**コマンドから外した**（履歴操作は原子的な一括適用の外） | `SMP:169` |
| 履歴は 1 つ | API 経由の変更は **UI 操作と同じ Undo / Redo の履歴**を通る。API 専用の履歴を作らない | `REQ:110-111` |
| 方式は既存の正 | `plan-actual-decisions-ja.md` §8（不変更新スナップショット）に従う。**新しい Undo を設計しない** | `REQ:116`（**未検証** —— 同書は本担当では読んでいない） |
| 必要性は実測 | AI は 1 セッションに **7 回**自分の誤りを訂正した。うち **2 件**は取り返しのつかない損害 | `REQ:113-115` |
| 機構は未検証 | トライアルでは実装したが**押されなかった** | `REQ:118`／`REQ:289` |
| 仕様書側の受け | `FR-031` の RATIONALE が「**`Agent API` 経由の変更も同じ履歴に積み、呼び出し 1 回を 1 段とすること（MUST）**」と定める | `SPEC:1481` |
| ⚠️ 仕様書に着地していない | 表 T-035 は **12 行**（`AG-1,2,3,4,5,6,11,7,8,9a,10,9`。自分で数えた）で、**`undo` の行が無い**。「`Agent API` から取り消しを呼べるか」は仕様書のどこにも無い | `SPEC:3144-3158`（→ O-14） |

---

## 6. サンプル JSON の全鍵

`agent-apply-request-and-outcomes.json`（77 行）。**鍵の出現は 75 個、相異なる鍵名は 34 種**（`json.load` で全走査して自分で数えた）。

| # | 鍵 | 座る場所 | 値（実例） | 意味・注意 |
|:--:|---|---|---|---|
| 1 | `_comment` | 根 | 文字列 | ファイル全体の説明。⚠️ **"Three worked examples" と書くが実例は 4 本ある**（`JSON:2` ↔ `SMP:23`） |
| 2 | `example1_acceptedBatch` | 根 | object | 受理の例 |
| 3 | `_what` | 各例の下 | 文字列 | その例が何を示すか |
| 4 | `request` | 各例の下 | object | `applyCommands` への要求 |
| 5 | `baseRevision` | `request` | `10` / `12` | **どの `revision` を読んで書いているか**（`A-3`） |
| 6 | `editedBy` | `request` | `"agent"` | 書き手の**役割**。値域は `'human' \| 'agent'`（`SMP:168`） |
| 7 | `commands` | `request` | 配列 | 命令の並び。**この配列 1 本が原子的な 1 束** |
| 8 | `commandName` | `commands[]` | `"update-task"` / `"create-dependency"` | 命令の名前（`type` ではない） |
| 9 | `taskUid` | `commands[]` | `3` / `4` | 対象 `Task` の UID。⚠️ 文書側の列名は `uid`（`DOC:38`） |
| 10 | `finish` | `commands[]` | `"2026-10-15T17:00:00"` | 予定終了。**TZ を持たないローカル時刻** |
| 11 | `start` | `commands[]` | `"2027-01-15T17:00:00"` | 予定開始。同上 |
| 12 | `changeExplanation` | `request` | 文字列 | **変更の理由。** ⚠️ 保存されるときの鍵名は `explanation`（`DOC:15`）で**名前が違う**（→ O-6） |
| 13 | `outcome` | 各例の下 | object | 返り値 |
| 14 | `accepted` | `outcome` | `true` / `false` | 受理したか |
| 15 | `revision` | `outcome`・`wakes`・`returns` | `11` / `12` / `13` / `14` | 適用後（拒否時は現在）の版数 |
| 16 | `document` | `outcome` | プレースホルダ文字列 | 文書の**不変の複製**。拒否時も**現在の文書**が入る |
| 17 | `example2_staleBaseRevision` | 根 | object | 版ずれ拒否の例（**トライアルで 6 回発火**） |
| 18 | `rejectionReason` | `outcome` | `"stale-base-revision"` / `"invalid-argument"` | 拒否の区分。**2 種のみ確定** |
| 19 | `expectedRevision` | `outcome` | `12` | 期待される版数。**版ずれのときだけ付く** |
| 20 | `_retry` | 例の下 | 文字列 | 再試行の作法（「機械的に再送するな」） |
| 21 | `example3_atomicRollback` | 根 | object | 原子的な巻き戻しの例 |
| 22 | `predecessorUid` | `commands[]` | `3` | 先行 `Task` |
| 23 | `successorUid` | `commands[]` | `999`（存在しない＝不正） | 後続 `Task` |
| 24 | `linkType` | `commands[]` | `1`（FS） | ⚠️ **在庫表は `link_type` が正**とする（→ X-4） |
| 25 | `lag` | `commands[]` | `0` | ⚠️ **単位が未決**（→ O-13） |
| 26 | `lagFormat` | `commands[]` | `7` | ラグの表示単位（GRS は表示に使わない） |
| 27 | `example4_watchLoop` | 根 | object | 監視ループの例 |
| 28 | `steps` | `example4` | 配列 | 呼び出し順の擬似コード（5 段。自分で数えた） |
| 29 | `call` | `steps[]` | 文字列 | 呼び出しの式（**構造ではなく文字列**） |
| 30 | `returns` | `steps[]` | `12` / `{accepted,revision}` | 返り値 |
| 31 | `note` | `steps[]` | 文字列 | 注記 |
| 32 | `blocksUntil` | `steps[]` | `"revision > 12 AND lastEditedBy !== 'agent'"` | **起きる条件**（`A-11` の実体） |
| 33 | `wakes` | `steps[]` | object | 起きたときの状態 |
| 34 | `lastEditedBy` | `wakes` | `"human"` | 最後に書いた者 |

⚠️ **`sinceRevision` / `self` / `onChange` は JSON の鍵ではない。** `call` の**文字列の中**に書かれているだけである（`JSON:65,73`）。`watchChanges` の引数の形は、**この 3 語しか分からない**（→ O-4）。

---

## 7. データモデルに効く決定

| # | 決定 | 出典 |
|:--:|---|---|
| D-1 | 文書は**あらゆる更新で 1 ずつ増える整数**と、**誰が最後に書いたか**と**いつ書いたか**を持つ | `REQ:71-72` |
| D-2 | **`documentSettings` に入れない。** トップレベルの別の入れ物に置く。理由: 設定値は「同じ JSON から同じ絵を得るためのもの」であり、**`revision` は絵に影響しない** | `REQ:77-79` |
| D-3 | **決定（2026-08-02）: 保存した JSON に含める。ただし `revision` / `lastEditedBy` / `updatedAt` の 3 つだけで、`agentApiVersion` は入れない** | `REQ:80-81` |
| D-4 | 書き手は **`editedBy: 'human' \| 'agent'`**。「AI」は実装の呼び名なので**役割で呼ぶ** | `SMP:168`／`JSON:8` |
| D-5 | **会話は保存しない。** 保存するのは `changeLog`（どの `revision` で・誰が・**なぜ**変えたか）だけ | `REQ:177-183` |
| D-6 | `changeLog` は**変更 1 回につき 1 件**なので**変更回数で自然に有界**。**上限の設計が要らない** | `REQ:194` |
| D-7 | 代償として**何も変更しなかったときの発言は残らない**。**意図して受け入れた** | `REQ:195` |
| D-8 | 読み出しは**内部状態への参照ではなく凍結された複製**を返す（既存の Undo が不変更新スナップショット前提のため） | `REQ:85-89` |
| D-9 | 書き込みは**基準版を申告でき、食い違えば拒否して現在の文書を返す**。呼び名は **`BaseRevisionCheck` / 基準版の照合**。**「楽観ロック」と呼ばない**（何もロックしておらず、「めったに起きない」という見込みが実測で外れている） | `REQ:97-104` |
| D-10 | **申告を省略した書き込みも受け付ける**（人間の UI 操作は常に最新を見ているため）。ただし **AI は常に申告する** | `REQ:105-106` |
| D-11 | 起動時の入れ口は **`<script type="application/json" id="embedded-document">null</script>`**。名前は **`embeddedDocumentHolder`** | `REQ:204`／`SMP:107` |
| D-12 | 入れ口は**ちょうど 1 つでなければならない**。1 つでなければ `boot-holder-not-unique`、解析できなければ `boot-document-unparsable` を返し、**黙って捨てない** | `SMP:136-147` |
| D-13 | 注入する文字列の `<` を **JSON の Unicode エスケープ（バックスラッシュ ＋ `u003c`）** へ置き換える（`</script>` の混入で HTML が壊れる。**対照実験で内容が本文へ漏れることを実測**） | `REQ:215-216,295`／`SMP:119-121` |
| D-14 | **入れ口が運ぶのは文書だけであり、API の有効化は運ばない** | `REQ:207` |
| D-15 | **原本は読み取り専用**として扱い、**複製の名前は ASCII のみ**とする | `REQ:208` |
| D-16 | 投入された文書も**信頼できない入力**である。**解析できたことと受け入れてよいことは別**で、通常の取込検証を必ず通す | `SMP:150-152` |
| D-17 | ⚠️ **日時の書き方が 2 通り混在する。** 命令の `start` / `finish` は **TZ 無しのローカル時刻**（`"2026-10-15T17:00:00"`）、`revisionStamp.updatedAt` と `changeLog[].changedAt` は **`Z` 付き UTC**（`"2026-08-02T13:24:51.117Z"`）。**使い分けの規則を書いた記述は 3 文書に無い（未検証）** | `JSON:10` ／ `DOC:7,16` |
| D-18 | **`revisionStamp` は MSPDI へ書き出さない** | `SMP:179` |

---

## 8. アーキテクチャに効く決定

| # | 決定 | 出典 |
|:--:|---|---|
| R-1 | 人間向け UI と**同格**の機械向けインターフェースを持つ。単一 `.html` の中で、**呼び出せる入口を 1 つ**公開する。名前は **`globalThis.grSchedulerAgentApi`** | `REQ:33-35` |
| R-2 | **既定では公開しない。** エージェント起動時は**起動側のフラグ**、人間が起動したときは**画面での有効化**で公開する | `REQ:35-36` |
| R-3 | API は **semver の版数**を持ち、**AI は最初に版数を読む**。非互換な変更で **major** を上げる | `REQ:46-47` |
| R-4 | API は **UI の防御を迂回しない。** 迂回してはならないものは **4 件**（自分で数えた）: 取込データの厳格な検証／`innerHTML` 直挿しの禁止・XXE の無効化／透かしのパスワード照合（生パスワードを保存しない）／将来の編集権限 | `REQ:133-138` |
| R-5 | **描画は DOM 非依存の純粋関数**とする（`document` に触らず **SVG 文字列**を返す）。理由（ユーザー判断 2026-08-02）: **純粋関数のほうが作りやすい。意図しない競合が起こらないから** | `REQ:231,240` |
| R-6 | **ビルド成果物は当面 単一 `.html` のみ。** ライブラリ／CLI は出さない。**純粋性さえ保てば、必要になった日に足せる** | `REQ:232-242` |
| R-7 | 出力寸法・文字サイズ・倍率は `documentSettings` の値を使う。**API で別系統の設定を持たない** | `REQ:226-227` |
| R-8 | **呼び出しの粒度を粗くする** —— 1 回の呼び出しで「**読んで・書いて・次に待つべき点を返す**」。素直な CRUD を並べない。実測で **5 往復 → 3 往復** | `REQ:271-277`／`JSON:72` |
| R-9 | 読みを **2 つに分ける**（`readDocument()` と `readRevision()`）。**版だけ欲しい場合が多い**ため | `SMP:162` |
| R-10 | **専用のチャット窓口を作らない。** 変更の理由は `applyCommands` の `changeExplanation` に相乗りさせる | `SMP:164` |
| R-11 | 監視は **`sinceRevision` 必須**。省略で**実地にビジーループを踏んだ**（処理済みの状態で即座に起き、張り直すたびに即終了） | `REQ:149-154`／`JSON:67` |
| R-12 | 起こす条件は「**自分以外の書き手が、指定の `revision` より後に何かを確定した**」。**手番や特定の操作に縛らない** | `REQ:160-161`／`JSON:66` |
| R-13 | 将来のサーバ／機械連携の窓口は、**この関数群と 1 対 1 の薄い包み**にする。`file://` では**ライブの共同編集は原理的に成立しない**ので、共同編集はサーバ前提である | `REQ:253-258` |
| R-14 | `http(s)` で配信する場合に限り、URL パラメータで**同一オリジンの相対パス**を読ませてよい。**絶対 URL・スキーム付き・上位ディレクトリへの脱出は拒否する** | `REQ:217-218` |
| R-15 | `file://` では **`fetch` も `XMLHttpRequest` も兄弟ファイルを取れない**（2 エンジンで実測）。`location.search` は読めるので**パラメータは受け取れるが中身を取りに行けない**。**URL にパスを付ける方式は `file://` では成立しない** | `REQ:210-214` |
| R-16 | **モジュール構成・技術スタックは前プロジェクトが意図的な空白にしている。埋めるのは次期** | `REQ:243-244` |

---

## 9. 廃棄・撤回された決定

| # | 廃棄されたもの | 置き換え | 出典 |
|:--:|---|---|---|
| K-1 | **`A-17` 「非 ASCII のデータをシェル引数に載せない」** → **不採用（2026-08-04）**。「成果物は当面 単一 `.html` だけ」なので**シェル引数を持つ部品が存在しない**（YAGNI） | 無し。実測は `ai-cowork-trial-findings-ja.md` §3-2 に残る（**未検証** —— 同書は未読） | `REQ:262-269` |
| K-2 | 専用のチャット窓口 `POST /api/chat` | `applyCommands` の `changeExplanation`。**保存対象も「変更の理由」だけに絞った** | `SMP:164` |
| K-3 | 汎用鍵 `{"type": "place"}` | `{"commandName": "update-task"}`。**無意味な汎用語の禁止** | `SMP:167` |
| K-4 | `actor: "human" \| "ai"` | `editedBy: 'human' \| 'agent'` | `SMP:168` |
| K-5 | 命令としての `{"type":"undo","count":2}` | 関数 `undo(steps)`。**コマンドから外した** | `SMP:169` |
| K-6 | 手番を回す道具 `turn.mjs` | **道具そのものが不要になる。** `applyCommands` が同じ仕事をする | `SMP:170` |
| K-7 | `wait.mjs --since N`（`--since` を省略できた） | `watchChanges({ sinceRevision })`。**`sinceRevision` を必須にした** | `SMP:166` |
| K-8 | ライブラリ／CLI をビルド成果物に加える案 | **当面 出さない**（`agent-interface-open-items-ja.md` 決定-1。**未検証** —— 同書は未読） | `REQ:232-238` |
| K-9 | `agentApiVersion` を保存 JSON に入れる案 | **入れない**（同 決定-3。**未検証**） | `REQ:80-81` |
| K-10 | 会話を丸ごと保存する案 | 保存するのは `changeLog` だけ。理由: 残す価値があったのは「なぜその手か」と「前言の訂正」だけで、**丸ごと保存すると価値の薄いものが日程表に同梱され、プライバシーの懸念だけが残る** | `REQ:191-193` |

⚠️ **`DISCARDED-ja.md`（212 行）は本担当では読んでいない。** 上表は `REQ` / `SMP` 本文が「落とした」「やめた」と書いている分だけである。

---

## 10. 未決のまま残っている件

| # | 未決の内容 | 出典 |
|:--:|---|---|
| O-1 | **`exportPng()` の失敗の返し方が未規定。** `REQ` 自身が「**次期が決めること**」と書く。仕様書 `AG-8` は「失敗を値で受け取れること」を要求するが**形は無い** | `REQ:62-63` ↔ `SPEC:3155` |
| O-2 | **機械可読なスキーマは 0 件** | `SMP:14,178` |
| O-3 | **拒否の値に「どの命令が落ちたか」を示す鍵が無い。** `AG-9a` は「**拒否された対象**」を MUST とする | `JSON:33-38,53-58` ↔ `SPEC:3156` |
| O-4 | **`watchChanges` の引数・返り値・解除の手段が未規定。** `sinceRevision` / `self` / `onChange` の 3 語が**文字列の中にあるだけ**で、**監視を止める方法が 3 文書に無い** | `JSON:65,73` |
| O-5 | **`self` と `editedBy` の関係が未規定。** 同じ「自分」を 2 つの名前で呼んでいる | `JSON:65` ↔ `JSON:8` |
| O-6 | **`changeExplanation`（要求側）と `explanation`（`changeLog` 側）で名前が違う。** 対応づけを書いた記述が無い | `JSON:14` ↔ `DOC:15` |
| O-7 | **命令の全一覧が本担当の 3 文書に無い。** `agent-interface-spec-ja.md` §3（691 行・未読）が持つとされる | `SMP:12`／`JSON:2` |
| O-8 | **`A-4`（Undo）は未検証。** トライアルで実装したが押されなかった | `REQ:118,289` |
| O-9 | **「落ちて復帰しても `sinceRevision` から追いつける」は未検証** | `REQ:155-156` |
| O-10 | **`A-6` / `A-7` / `A-8` / `A-9` / `A-16` は「提案」であって実測ではない。** `REQ` 自身が最終行で「**実測と提案を混ぜるな**」と警告している | `REQ:301-304` |
| O-11 | **権限つきの拒否（`document-locked`）の実例は無い**（将来拡張） | `SMP:180` |
| O-12 | **MSPDI 側の実例は 0 件** | `SMP:179` |
| O-13 | **`lag` の単位をサンプルが決着させない。** サンプルは `"lag": 0` のみで、`E03` の C-1（**1/10 分 ↔ 稼働日**）の**どちらの側でも 0** になる | `JSON:51`／`DOC:78` ↔ `E03:147` |
| O-14 | **仕様書の表 T-035（12 行。自分で数えた）に `undo` の行が無い。** 「`Agent API` から取り消しを呼べるか」が仕様書に着地していない | `SPEC:3144-3158` |
| O-15 | **`A-n` の番号は前プロジェクト内だけの通し番号。** 次期は自分の体系で振り直すと明記されている | `REQ:17` |
| O-16 | **`Agent API` は `authority` を持たない。** 用語の正は 4 文書のままである。本ディレクトリの記述は**正ではない** | `REQ:15-16` |

---

## 在庫表との食い違い

### A. 11 枚の在庫表と食い違うもの

| # | 何が食い違うか | 在庫表の側（file:line ＋ 引用） | 出典の側（file:line ＋ 引用） | どちらが正か |
|:--:|---|---|---|---|
| **X-1** | **`FR-063`（版数・最後に書いた者・時刻）の受け皿が既にあるか** | `E04-project.md:117`「→ **`FR-063` は現状どこにも着地していない。** 新設が要る（→ U-4・U-7）。」／同 `:169`「**`FR-063` の「最後に書いた者」の受け皿**。… GRS 側にも列・確定名・設定値行が無い。**新設が要るが、名前も置き場所も決まっていない**」／同 `:125`「どこに置くか（原典の記述）… **未定**」 | `agent-interface-requirements-ja.md:80-81`「**決定（2026-08-02）**: **保存した JSON に含める。** ただし `revision` / `lastEditedBy` / `updatedAt` の 3 つだけで、**`agentApiVersion` は入れない**」／実物 `grs-document-with-revision-stamp.json:4-8` `"revisionStamp": { "revision": 12, "lastEditedBy": "agent", "updatedAt": "2026-08-02T13:24:51.117Z" }` | **出典の側が正。** 名前も置き場所も 2026-08-02 に決着し、実物の JSON もある。原因は `E04` の「読んだ原典」表（`E04-project.md:9-17`・**9 行。自分で数えた**）に **`10-agent-interface/` のファイルが 1 つも無い**ことである。**`E04` §3-3 と §5-2 V-1 は撤回が要る** |
| **X-2** | **在庫表どうしが割れている** | `E04-project.md:117`「どこにも着地していない」 | `E09-settings-blob.md:41-42` が根の直下に **`revisionStamp {…}` Agent API 用の版スタンプ** と **`changeLog [ … ] 変更の理由の履歴`** を載せ、原典表（`E09-settings-blob.md:17`）で `grs-document-with-revision-stamp.json`（96 行）を**全文読んだ**と宣言している | **`E09` が正。** 同じ在庫の中で結論が割れており、機械検査では捕まらない。**次期は `E09` の根の並び（15 行の入れ物）を出発点にすること** |
| **X-3** | **チャットの発話が版数を上げ、監視を起こすか** | `E04-project.md:129`「`AG-11`（**確定した発話は版数を上げる**。`FR-063` を名指し）」（仕様書 `01-04-requirements.md:3153` `AG-11`、および `:3149` `AG-6`「**確定した発話（`AG-11`）もこれに含める（MUST）**」を引く） | `agent-interface-requirements-ja.md:168`「**GRS は会話を保存しない**ので（`A-12`）、**チャットに書いても `revision` は進まず、監視は起きない。**」／`agent-interface-samples-ja.md:52-53`「**会話は保存しないので `revision` が進まず**、`watchChanges` は起きない」 | **仕様書（＝在庫の側）が現行の正**であり、前プロジェクトの `A-11` / `A-12` は**覆されている**。⚠️ **覆した記録がどちらの側にも無い（未検証）。** ⚠️ さらに**仕様書の内部に衝突が残る** —— `FR-063`（`01-04-requirements.md:3111`）は「**版数を上げるのは、文書に保存される値を変える更新すべて**」「**版数を上げないのは、文書に保存されない操作だけ**」と定め、`FR-066`（同 `:3187`）は「**会話そのものを文書に保存してはならない（MUST NOT）**」と定める。**保存しないものが版数を上げる**ことになり、`AG-11` と `FR-063` が両立しない。**設計で決着が要る** |
| **X-4** | **依存の種別の綴り（`link_type` か `linkType` か）** | `E03-dependency-taskgroup.md:44`「`link_type` … **snake_case が許される 3 語の 1 つ**（仕様書の表 T-018 も `link_type` を使う）」／同 `:132`「**仕様書 1.9 の `W-8` が snake_case を許す 3 語の 1 つとして明示**し、表 T-018 が列名として使う … 一致（例外として許容済み）」 | `agent-apply-request-and-outcomes.json:51` `"linkType": 1`／`grs-document-with-revision-stamp.json:78` `"linkType": 1` | **在庫の側（`link_type`）が正**（仕様書 1.9 `W-8` と表 T-018 に裏付けがある）。サンプル JSON は 2026-08-02 で**命名規約より前**に書かれている。**ただし決めるべき点が残る** —— 文書の列名が `link_type` なら、**`create-dependency` の引数名も `link_type` にしないと入口ごとに綴りが変わる** |
| **X-5** | **命令の引数名 `predecessorUid` / `successorUid`** | `E03-dependency-taskgroup.md:42-43` はいずれも「⚠️ **要改名 `successorUid` / `predecessorUid`**」と書く（原典 ERD は `successor_uid` / `predecessor_uid`） | `agent-apply-request-and-outcomes.json:50` `"predecessorUid": 3, "successorUid": 999` | **食い違いではなく裏付け。** サンプルは `E03` が「要改名」と判定した綴りを**既に使っている**。改名先の綴りが 2 系統から独立に出ている点で強い |

### B. 在庫表の外で見つかった食い違い（同ディレクトリ内・同日付）

| # | 何が食い違うか | 片側 | もう片側 | どちらが正か |
|:--:|---|---|---|---|
| **Y-1** | ⚠️ **同じサンプル束の中で、チャットが監視を起こすかが逆になっている** | `agent-apply-request-and-outcomes.json:69` `"note": "the human dragged a bar, **or typed an instruction in the chat panel**, or both"`（＝チャットで起きる） | `agent-interface-samples-ja.md:51-53`「**チャットで話しかけただけでは、この輪は回らない。** 会話は保存しないので `revision` が進まず、`watchChanges` は起きない」／`agent-interface-requirements-ja.md:168` 同旨 | **未決着のまま両方が残っている。** 仕様書は `AG-6` / `AG-11`（`01-04-requirements.md:3149,3153`）で **JSON:69 の側**を採った。**X-3 と同じ 1 つの問題**であり、**前プロジェクトの中で既に割れていた**ことがここで分かる |
| **Y-2** | **サンプル JSON が自称する実例の本数** | `agent-apply-request-and-outcomes.json:2` `"Three worked examples of the write contract."` | `agent-interface-samples-ja.md:23`「**書き込みの実例 4 本**（受理 / 版ずれ拒否 / 原子的な巻き戻し / 監視ループ）」 | **4 本が正**（`example1_acceptedBatch` / `example2_staleBaseRevision` / `example3_atomicRollback` / `example4_watchLoop` を自分で数えた）。`_comment` が `example4_watchLoop` を足したときに更新されていない |
| **Y-3** | **`Task` の識別子の鍵名** | `agent-apply-request-and-outcomes.json:10` `"taskUid": 3`（命令の引数） | `grs-document-with-revision-stamp.json:38` `"uid": 1`（文書の列） | **どちらも正しく、意図的に違う可能性が高い**（命令の引数は「何の UID か」を示す必要がある）。⚠️ **そう書いた記述は 3 文書に無い（未検証）。** `E01-task-plan.md:25` は `Task` の PK を `uid` とする。**命令の引数命名規則を設計で決めること** |
