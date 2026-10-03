# CR-645 —— `GRS JSON` を読むときは、完了率を日付から数え直す

> 起草の状態: 当てた（2026-10-03、`5a746112` の上）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-645` と台帳の帯 `DFC-1816`〜`DFC-1819` は調整役から受けた。帯の行は `DFC-1816` を 1 つ使った（12 節）。`PND-680` は使わなかった（0.2 節の問い 3 —— 仕様に先例があった）。仕様の新しい識別子（表・行 ID・接頭辞・設定の行・要求）は取らない（2 節）。
> 閉じるもの: `docs/review/grs-json-schema-self-explanation-2026-10-03.md` の 7.1 節の CR C —— C-27（`JDG-1196`）。同書 6 節の見落とし 5。台帳 `PND-676`（既に `裁定済`）。
> ⛔ 閉じないもの: CR D（版を上げる、ほか 17）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md`。全文は同書を見よ）

| 裁定 | 逐語（抜粋） | 本書での扱い |
|---|---|---|
| `JDG-1196` | 「GRS JSON を読むときだけ (Recommended)」 —— 決定の欄: `GRS JSON`（単一 `.html` に埋め込んだものを含む）を読んだときは、`percentComplete` を日付から数え直す、MSPDI を読んだときは取り込んだ値を保つ（`FR-021`） | `FR-012` に 5 文（E-01）。`OP-6`（E-02）、`AT-39`（E-03）、`VC-5`（E-04）、`RS-52`（E-05） |

### 0.2 ⛔ 当てる前に確かめた 3 つ

**問い 1 —— どこで数え直すか。⇒ `documentFromJson`（`json-codec.ts`）の最後の 1 か所。6 つの呼び口には散らさない。**

- 読む路の呼び口は 6 —— `agent-api-members.ts` の `handedDocument`、`embedded-html-codec.ts` の `documentFromEmbeddedHtml`、`document-file-flow.ts` の `decodedDocument`・`projectIdentityFromText`・`takeInHandedDocument`、`single-html-shell.ts` の `emptyDocument`。どれも `documentFromJson` を通るので、そこで数え直せば 6 つとも同じになる。`documentFromMspdi` は `documentFromJson` を通らない —— MSPDI の値は触られない（`FR-021`）。
- 式は `UF-75`（`percent-complete.ts`）の `repriced` が持つ。暦の編集（`UF-16`、`edit-calendar.ts`）が持っていた「文書の全 `Task` を数え直して、動いた `Task` を答える」私的な関数 `recountedPercentComplete` を `UF-75` へ移して公開し（表 T-064 の `PI-9`）、暦の編集と読みの 2 つがそれを呼ぶ —— 式を 1 か所に閉じ込める（`FR-012` の `EZ-5`）。
- ⇒ `DocumentCodec`（`Adapter`）→ `EditDocument`（`UseCase`）の辺が 1 本増えた（内向き、`LR-1` に合う）。`components.json` に辺を足し（`EG-5`、検査 59）、図を作り直した。
- ⚠️ 読み込みの検証（`FR-023`）は数え直しの後に走る。`finish` が `start` より前の `Task` は数えると負になるが、その `Task` は `IV-10` で落ちるので、数え直しは値を変えず件数にも数えない（`recountedPercentComplete` の 1 行）。

**問い 2 —— `Agent API` の読み（`AM-8`）は「`GRS JSON` を読んだとき」に入るか。⇒ 入る。**

- `AM-8` は `{ text }`・`{ document }`・素の文書のどれも `GRS JSON` の字面として符号器に通す（`handedDocument`）。`JDG-1196` の「`GRS JSON` を読んだとき」の字面どおり、同じ読みである。
- 告げる件数は最初の読みのもの —— `takeInHandedDocument` は渡された文書を書いて読み直すが、その読み直しでは数え直すものが残っていない（`HandedFormatReading` に `recountedCount` を足して運んだ。`frame-loop.ts` は型を素通しするので触れていない）。

**問い 3 —— 開いただけで値が変わる。告げるか、未保存の編集を立てるか。⇒ 告げる（`NT-3`・`RS-52`）。未保存の編集は立てない。**

- 告げる: `RS-52` が「⛔ 黙って数え直してはならない（MUST NOT） —— 人が触っていない `Task` の値が動くので、告げなければ何が変わったのか読めない」と言う。読んだときもこの理由はそのまま当たる。新しい理由の行は立てず、`RS-52` の場面を「暦が変わったときと、`GRS JSON` を読んだとき」に広げた —— ⚠️ 新しい行を足すと `frame-loop.ts` の `NoticeReason` を書くことになり、その持ち場はこの巡では性能の体のものである。
- ⚠️ 指示に書かれた `05-07-design.md:1291` を読み直した —— 「一部を黙って落とすと、欠けたことが見えないまま日程が読まれる」は行を落とすことの文であり、値を変えることの文ではない。告げる根拠は `RS-52` の MUST NOT のほうである。
- 未保存の編集: 読みで値を動かして告げる先例が仕様に在る —— 範囲の外の設定値を収める `RS-51`（`OP-6`）。表 T-290 の `unsavedEditsStateMachine` は、置き換えの `documentOpenLanded` で `nothingUnsaved` へ移り、収めたかどうかを見ない。⇒ 同じ扱いとし、`FR-012` に「数え直しだけを理由に、未保存の編集を立ててはならない（MUST NOT）」と書いた。⇒ 先例が在ったので `PND-680` は起こしていない。
- `FR-012` の暦の先例（同じ書き込みの中で数え直す）は編集の話であり、読みには当たらない —— 暦の編集はそれ自体が未保存の編集を立てる。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-1` の `GL-004`**（成果物が構造化データである）。人に入れさせない値（`FR-012`）を、ファイル（AI が書いたものを含む）を経て入れる穴が閉じる —— 日付と食い違う完了率は、開いた時点で日付どおりになり、件数で告げられる。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾がない・唯一の正）** —— スキーマの説明「GRS keeps it in step when dates change」は、読むときには嘘だった（保存値をそのまま使っていた）。読みでも数え直すので、説明を「whenever the dates change and whenever it reads this file」に替えた（E-03）。
- **`R1.4`（境界・空の場合）** —— `percentComplete` が空（`null`）の `Task` も、日付が在れば数え直して数に入る（`null` → 0 は値の変化である）。日付が使えない `Task` は値を変えない（その `Task` は `FR-023` が落とす）。`finish` < `start` は 0.2 の問い 1。
- **`R2`（名）** —— 公開名 `recountedPercentComplete`（もとの私的な名のまま）、読みの数 `recountedCount`（隣の `clampedCount` と同じ形）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 数え直しの席は `documentFromJson` の最後 | 問い 1 | `DocumentCodec` → `EditDocument` の辺が 1 本増えた |
| 決定 2 | `AM-8` の読みも数え直し、告げる | 問い 2 | — |
| 決定 3 | 告げる理由は `RS-52` を広げて使う（新しい行を立てない） | 問い 3 | 語は 2 つの場面を 1 つの文で言う（次の一手が 2 文になった） |
| 決定 4 | 数え直しだけでは未保存の編集を立てない | 問い 3 の `RS-51` と表 T-290 | 開いて保存しない限り、ファイルは食い違ったまま —— 開くたびに告げる |
| 決定 5 | 起動時の `BT-1`（埋め込まれた文書）は数え直すが、まだ告げない | `StartupNoticeReason` が `frame-loop.ts` に在り、触れない持ち場 | `DFC-1816`（12 節） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 要求 | `docs/spec/01-04-requirements.md` の `FR-012` | E-01 |
| 開く | 同 表 T-024a の `OP-6` | E-02 |
| 列の意味と説明 | `docs/spec/_source/erd.json` の `AT-39`（意味と `schemaNote`） | E-03 |
| 矛盾の観点 | `docs/spec/01-04-requirements.md` の 表 T-310 の `VC-5` | E-04 |
| 理由と語 | 同 表 T-233 の `RS-52`、`docs/spec/_source/display-words.json` の `RS-52` | E-05 |
| ユニット・公開名・部品図 | `docs/spec/05-07-design.md` の 表 T-075 の `UF-75`・`UF-35`、`docs/spec/_source/published-entries.json` の `PI-9`、`docs/spec/_source/components.json` の辺 | E-06 |
| コード | `src/use-case/edit-document/percent-complete.ts`・`edit-calendar.ts`・`edit-document.ts`、`src/adapter/document-codec/json-codec.ts`、`src/adapter/agent-api-endpoint/agent-api-members.ts`、`src/framework/single-html-shell/document-file-flow.ts`・`single-html-shell.ts` | 5 節 |

**数**: `FR-012` に `（MUST）` 3（読んで数え直す・告げる・`OP-6`）と `（MUST NOT）` 2（MSPDI・未保存の編集）、文 5。`OP-6` に `（MUST）` 1。表の升 4（`VC-5`、`RS-52`、`UF-75`、`UF-35`）と `AT-39` の 2 欄。表の行 0、設定の行 0。

---

## 2. 新しい識別子

仕様の行 ID は 1 つも取らない。表 T-064 の `PI-9`（`EditDocument`）に公開名 `recountedPercentComplete` を足した。コードに型 `PercentCompleteRecount`（`percent-complete.ts`）、読みの欄 `recountedCount`（`JsonDecoding`・`HandedFormatReading`・`DecodedIntake`）、定数 `PERCENT_COMPLETE_RECOUNTED_REASON` と型 `HandedFirstReading`（`document-file-flow.ts`）を足した。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`5a746112`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `RS-52` の場面「稼働日の暦が変わったので」 | 表 T-233 | 「格納済みの完了率を日付から数え直した —— 暦が変わったときと、`GRS JSON` を読んだとき」 | E-05 |
| 辞書の `RS-52` の語「稼働日の暦が変わったので、完了率を数え直しました」と次の一手「取り消しで暦の変更ごと戻せます」 | `display-words.json` | 「完了率を日付から数え直しました」、次の一手は暦とファイルの 2 文 | E-05 |
| `AT-39` の説明「GRS keeps it in step when dates change, so write what the dates give」 | `erd.json` | 「GRS recounts it whenever the dates change and whenever it reads this file, so the dates decide; write what they give」 | E-03 |
| `edit-calendar.ts` の私的な `recountedPercentComplete` | `src` | `percent-complete.ts` の公開の `recountedPercentComplete` | 5 節 |
| 読みが保存値をそのまま使うこと | `json-codec.ts` の `documentFromJson` | 数え直して数える | 5 節 |

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（`FR-012`）—— 暦の段の後ろに 5 文: `GRS JSON` を読んだときも数え直す（MUST。単一 `.html` の `IO-7` と `AM-8` を含む）、日付が正である理由、`MSPDI` を読んだときは数え直さない（MUST NOT、`FR-021`）、読んで数え直したときも件数を添えて告げる（MUST、`NT-3`・`RS-52`）、数え直しだけを理由に未保存の編集を立てない（MUST NOT、`RS-51` と表 T-290）。
- **E-02**（`OP-6`）—— 升の最後に「`Task` の `percentComplete` は、文書の値を復元せず、日付から数え直すこと（MUST） —— 合流を選んだときも同じである（`FR-012`）」。
- **E-03**（`AT-39`）—— 意味に「`GRS JSON` を読むときは日付から数え直し、`MSPDI` から取り込んだ値は保つ（`FR-012`・`FR-021`）」。説明は 3 節の表のとおり。
- **E-04**（`VC-5`）—— 「`GRS JSON` から読んだ文書では、本行が立つのは `VC-6` も立つ期間 0 の `Task` だけ —— 主に `MSPDI` から取り込んだ値に当たる」。⚠️ レビューの ④ は「立たない」と書いていたが、期間 0 で `actualFinish` を持ち `actualStart` を持たない `Task` は数え直すと 100 になり、`VC-5` が立つ（同時に `VC-6`）。
- **E-05**（`RS-52`）—— 3 節の表のとおり。`RS-21` との違いの文を「受け入れた暦と読んだ日付の帰結」に。
- **E-06**（設計）—— `UF-75` に「文書の全 `Task` を数え直して、値が変わった `Task` を答える —— 暦の編集（`UF-16`）と `GRS JSON` の読み（`UF-35`）が同じ式を呼ぶ」。`UF-35` に「完了率を日付から数え直して数える（`FR-012`・`RS-52`）」。`PI-9` に `recountedPercentComplete`。`components.json` に `DocumentCodec` → `EditDocument`（「percent complete」）。

当てた後に打ったもの: `npm run gen` → `python docs/spec/_source/build.py`（図） → `npm run gen:check` → `npm run typecheck` → `vitest` フル（機械の錠の下） → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。

### 4.1 重なり

CR A（`CR-643`）・CR B（`CR-644`）は当て済み。CR D は見本と雛形を作り直して版を上げる —— ⚠️ CR D が見本を作り直すときは、書く完了率が日付の与える値であること（さもなくば開くたびに `RS-52` が立つ）。本書は版を上げない（形は変わらない）。

---

## 5. 継ぎ目

```
SEAM (CR-645)
- Use case (UF-75, percent-complete.ts, published by edit-document.ts as PI-9):
    recountedPercentComplete(schedule): { schedule, movedTaskUids }
      the same reference when nothing moved; a negative count (finish before
      start) keeps the old value and is not counted (FR-023 drops that Task)
    editCalendar (UF-16) now calls it instead of its own private copy.
- Adapter (UF-35, json-codec.ts): documentFromJson recounts after the older-
  version fills and before the settings clamp; JsonDecoding.ok carries
  recountedCount. documentFromMspdi is untouched (FR-021).
- Adapter (agent-api-members.ts): HandedFormatReading carries recountedCount
  into the takeInDocument road (frame-loop.ts passes it through unchanged).
- Framework (document-file-flow.ts): the file open raises RS-52 with
  recountedCount beside RS-51; takeInHandedDocument raises it once the import
  lands. single-html-shell.ts BT-1: DEVIATION (DFC-1816).
```

---

## 6. グラフ（`5a746112`）

- `impact.py FR-012`: 指している側は要求 14 件・参照 29 箇所 —— 新しい文はどれも読む路の話であり、暦の編集・日付の編集の意味を変えない。塊「開くと合流」（表 T-024a）と「予実と遅れ」に触れる —— `OP-6` を同じ向きに直した（E-02）。
- `impact.py OP-6`: 要求 7 件・参照 11 箇所 —— 足した句は `percentComplete` 1 列だけを言う。
- `impact.py VC-5`: 指している側は 0。
- `impact.py RS-52`: `FR-012` と 05-07 のファイル構成の 1 箇所（`UF-35` の升、本書が書いた）。
- `impact.py AT-39`: `FR-134` 1 つ（列を名指すだけ）。

---

## 7. 数の予測と測った数

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| 同梱の文書を読んで数え直す `Task` の数 | 起動時の見本 0（1000 のうち）、計測用の文書 0（1000 のうち）、空の文書 0。`sample-schedule/Three-Year Product Plan.json` は `5a746112` では `RS-25` で拒まれていて測れない（ほかの体が直している） | 13 節の台本 |
| `npm run typecheck` の誤り | 0 → 0 | 同 |
| 新しい試験 | 15 件（`tests/unit/cr-645-…`）。式を外した写しで 7 件が赤くなることを確かめた | `vitest` |
| 自動試験の失敗（`vitest` フル） | base 8（30103 件）→ 8（30118 件）、失敗の集合は同じ | 13 節 |
| 古い振る舞いを留めていた試験 | 4 ファイル —— `dfc-355`（`RS-52` の逐語）、`t-233-reason-words`（`RS-52` の指紋を、場面と語を読み合わせて書き直した）、`cr-561-the-delay-diagnostics-report`（`VC-5` を立てる文書を、MSPDI が保つ値として組み直した）、`uf-27-28-29`（`AM-11` の往復の文書が `percentComplete: null` を書いていた —— 日付の与える 0 に） | 同 |
| `dfc-378` | 赤くならなかった —— 数え直しが何も動かさないときは同じ参照を返す | 同 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | 仕様 ＋ 生成物 ＋ コード ＋ 試験 ＋ 台帳 | E-01〜E-06、5 節 | 本書の体 |

⚠️ **毎フレームの経路**: `src/adapter/screen-renderer/display-words.json`（生成。`RS-52` の 4 つの字面）と `image-to-grs-json-prompt.json`（生成。`AT-39` の説明）が規則 04 の 5 節の `src/adapter/screen-renderer/**` に入るので、`perf-pending.md` に 1 行足した（70）。手で直したコードに毎フレームの経路は無い。`frame-loop.ts` には触れていない。

---

## 9. 仕様の外で直すもの

- 試験 4 ファイル（7 節）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 版を上げない（形は変わらない）。
- `frame-loop.ts` に触れない（性能の体の持ち場）—— 起動時の告知は `DFC-1816`。
- `sample-schedule/*` に触れない（ほかの体の持ち場）。
- `AM-8` の答え（`AgentWriteOutcome`）に数え直した数を足さない —— 表 T-107 は言わない。人の画面には告げる。

---

## 11. 利用者に問うこと

本書からは問わない。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1196` | `GRS JSON` を読むときだけ数え直す | 「適用済」。着地先に `FR-012`・`AT-39`・`OP-6`・`VC-5`・`RS-52` |
| `PND-676` | 読んだ完了率と日付のどちらが正か | 既に `裁定済`（変えない） |
| `DFC-1816` | 起動時の `BT-1` は数え直すが告げない（`StartupNoticeReason` が `frame-loop.ts`） | 起こした（`実装待ち`）。仕様は決まっている |
| `DFC-1817`〜`DFC-1819` | 帯 | 使わなかった |
| `PND-680` | 未保存の編集の扱い | 使わなかった（問い 3 —— 先例 `RS-51` と表 T-290） |
| `perf-pending.md` の 70 | 生成された辞書とプロンプト | 1 行足した |
| `docs/development-records/changelog.md` の 3.48 | 本書 | 1 行足した |

---

## 13. 測り方の再現

```
# tree: 5a746112.
# count per shipped document: documentFromJson, then repriced over every Task
rolldown <scratchpad>/measure.ts -o <scratchpad>/measure.mjs && node <scratchpad>/measure.mjs
#   startup-template.json 1000 tasks, moved 0; measuring-document.json 1000, moved 0; empty 0

npm run gen && python docs/spec/_source/build.py && npm run gen:check   # 0 drift
npm run typecheck                                                        # 0 errors on both
node tools/gate/gate-queue.mjs run -- node ../../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<after.json>

PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-012   # and OP-6, VC-5, RS-52, AT-39
```
