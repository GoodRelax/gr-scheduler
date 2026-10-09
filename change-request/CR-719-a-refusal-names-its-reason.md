# CR-719 —— 断った理由に名前を付ける —— 開くときの 4 場面と編集のときの 7 場面に 表 T-233 の行を足す

> 起草の状態: 当てた（2026-10-10、作業木 `3fa296f7` の上）。調整役が 11 節の 11 行（場面・語 → 次の一手・表示の仕方）を利用者に見せ、利用者は「それでやれ」と答えた（`JDG-1777`）。仕様・コード・既存の試験・台帳を同じ作業木で当てた。仕様だけを読む試験は別の体が書く（9 節）。
> ID の帯: 番号 `CR-719`、裁定 `JDG-1776`（本件）と `JDG-1773`（席の負荷の取り決め。本書の外だが同じコミットで記録した）を調整役から受けた。`8d776ed6` の木で `CR-719` を名乗る所は 0 件、`JDG-1773`・`JDG-1776` も 0 件だった（13 節）。
> 表 T-233 の新しい 11 行は、起草のときに仮の名 `RS-NEW-1`〜`RS-NEW-11` で書き、当てるときに `RS-78`〜`RS-88` を振った（`3fa296f7` の木で `RS-78`〜`RS-88` を名乗る所は本書の 2 節の予定の欄だけだった）。本文の仮の名は当てた番号に置き換えた。欠番 `RS-17`・`RS-18`・`RS-35`・`RS-45`・`RS-47` は使わない —— 同じ ID を二度使わない。
> 当てる裁定: `JDG-1776`（案 A —— 場面ごとに 1 行、11 行。Excel の記入表は作らず、11 の語は調整役が対話で見せる）と `JDG-1777`（利用者が 11 節の語と表示の仕方を読み、そのまま認めた）。覆す裁定は無い。`JDG-1777` は調整役から受けた番号で、`3fa296f7` の木で名乗る所は 0 件だった。
> 閉じるもの: 台帳 `DFC-2305`（編集）と `DFC-2310`（開く）。当てたので `実測待ち` へ動かした（12 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果

| 行の読み | `8d776ed6` で見たもの | 本書での扱い |
|---|---|---|
| `DFC-2310`: 取り込みの検証が `S-113`・`S-114`・`S-115`・`FR-012` の名で拒み、`RS-15` に落ちる | 正しい。`validate-imported-document.ts` の `validateImportedDocument` は `refusal('S-113', …, 'NT-6')`・`refusal('S-114', …, 'NT-6')`・`refusal('S-115', …, 'NT-6')`・`refusal('FR-012', …, 'NT-1')` を返し、`document-file-flow.ts` の `tellImportRefusals` は 表 T-233 にも 表 T-220 にも無い名を `RS-15` に振り替える | `RS-78`〜`RS-81` |
| `DFC-2305`: 画面の書き込みが `IV-2`・`IV-6`・`IV-9`・`IV-11`・`IV-12`・`IV-14`・`IV-21` で拒まれると `RS-10` に潰れる | 正しい。`src/use-case/edit-document/` の `reject(<命令>, 'IV-…', …)` は 25 か所（`IV-2` 10・`IV-6` 1・`IV-9` 2・`IV-11` 1・`IV-12` 2・`IV-14` 7・`IV-21` 2）。`frame-loop.ts` の `REFUSAL_SITUATIONS` が持つ 表 T-220 の行は `IV-1`（`RS-57`）だけなので、残る 7 つは `NOTICE_REASON_OF_WRITE_REFUSAL` の `refused` → `RS-10` に落ちる | `RS-82`〜`RS-88` |
| `IV-2` は画面からは起きない | 誤り。タスクをコピーし、コピー元のタスクを消してから貼り付けると、`task-paste.ts` の `pasteTasks` が `IV-2` で拒む（`CM-8`）。今は「受け付けられない操作が含まれていたので、まとめて取りやめました」が出る | `RS-82` の場面の例にした |
| `IV-6` は画面からは起きない | 正しい（健全な文書では）。`edit-task.ts` の `moveTaskToTaskGroup` は、タスクが文書に無ければ先に `IV-2` で拒むので、`IV-6` はタスクが在ってどのタスクグループにも載っていないとき —— 開くときの検証を通った文書では起きない | 行は足す（利用者の 11 行）。表示は「出す」を推す —— 起きたら壊れた文書であり、人が知るべきである |

### 0.2 裁定の鎖（rulings.md を「RS-15」「RS-10」「S-113」「importMax」「DFC-2305」「DFC-2310」「CR-718」「取り込みの形」「次の一手」「表示しない」で引いた）

| 裁定・行 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1776` | `CR-718` の 11 節の問いに案 A。行は 11、Excel は要らない | 本書が当てる |
| `JDG-1748`・`JDG-1749` | 138 行の表示の仕方（出す・時間で消す・出さない） | 新しい 11 行も同じ欄で選ぶ。既存の行の値は変えない |
| `JDG-1759` | 出さない行も語を辞書に残す | 11 行とも語を持つ（相乗りしない） |
| `JDG-1761`・`JDG-1762` | 表 T-220 の行の語を取り込みの形（…ので、このファイルは開けません → 元のファイルで…してから開いてください）にした | 開くときの 4 行はこの形に揃える。編集の 7 行はこの形を使えない —— それが行を足す理由である（`CR-718` の 11 節） |
| `JDG-269` | 次の一手を空にしない（空の語は `RS-15` に落ちる） | 11 行とも次の一手を持つ |

覆す裁定は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-006`（横断の作法）—— `FR-076` の「⛔ 拒否の理由を 1 つの行へ潰してはならない（MUST NOT）」と「⛔ その通知を本表の行（`RS-15` を含む）へ振り替えてはならない（MUST NOT）」を、行が無いために守れなかった 11 の場面で守れるようにする。`NT-1` の「どの項目が、なぜ誤りか」と `NT-6` の「いま何ができるか」を果たす。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 上限の数（32 MB・20000 件・64 段・扱える日付の範囲）を語に書き写さない。語は差し込む場所を設定値の名前で書き、画面が 表 T-211 ／ 表 T-214 の値を差し込む（X-2）。`FR-073` が `{downloadUrl}` と `S-350` で既に行っている形である。
- `R1.4`（境界）—— 取り込みの拒否を「不変条件（表 T-220 の行）で拒んだもの」と「行を持たない拒否（資源の上限・日付の無いタスク）」に分け、`FR-076` の「本表に入れない」を前者に狭めた。
- `R2.21`（判じは 1 か所）—— 編集の拒否から理由の行を選ぶ判じは `frame-loop.ts` の `REFUSAL_SITUATIONS` の 1 つに足す。新しい判じの場所を作らない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 11 行とも、相乗り（`wordsOf`）せず自分の語を持つ | `JDG-1776` は「11 個」と数えた。`IV-14` の語（「日付として読めない値か、扱える範囲の外の日付です」）は編集向きに読めるが、`wordsOf` が指せるのは 表 T-233 の行だけである（原稿の `$comment`） | 辞書の項が 11 増える |
| X-2 | 上限の数は語に書き写さず、設定値の名前の差し込み口（`{importMaxBytes}`・`{importMaxItems}`・`{importMaxDepth}`・`{importMinDate}`・`{importMaxDate}`）で書く。画面は検証と同じ値（成果物に埋め込んだ定数）を差し込む | `R1.3`。`FR-073` の「⛔ 所を語に書き写してはならない（MUST NOT）」と同じ形。数を言わないと、件数で断られた人がどこまで減らせばよいかを読めない（`NT-6` の「いま何ができるか」） | 差し込みの継ぎ目が 1 つ増える（5 節）。語の検査が差し込み口を知る必要がある |
| X-3 | 作法は、資源の上限の 3 行を `NT-6`、ほかの 8 行を `NT-1` とする | 検証は今も上限の 3 つを `NT-6`、日付の無いタスクを `NT-1` で返している。編集の拒否は入力を受け付けないとき（`NT-1`） | 表 T-233 に `NT-6` の行が初めて入る |
| X-4 | 表示の仕方の推奨（11 節の一覧）: 開く 4 行と `IV-2`・`IV-6` は「出す」、入力の欄で断る 5 行（`IV-9`・`IV-11`・`IV-12`・`IV-14`・`IV-21`）は「時間で消す」 | 開くときはファイルが開かず、どの上限かは画面のどこにも出ない（`RS-11`・`RS-26`・表 T-220 の行と同じ「出す」）。相手が消えた（`IV-2`）・壊れた文書（`IV-6`）も画面に見えない（`RS-57` と同じ）。欄で断るものは欄が元の値に戻って見え、決まりは一目で読める（`RS-58` 終了が開始より前・`RS-56` と同じ「時間で消す」） | 利用者が行ごとに選び直せる（欄の値 1 つ） |
| X-5 | 編集の拒否から行を選ぶ道は、本表の出典の欄がその 表 T-220 の行を名指す行とする（`FR-076` に 1 行） | 表が正（出典の欄）。`RS-57`（`IV-1`）と `RS-58`（`IV-10`）が既にこの形である | 無い |
| X-6 | 束の中の拒否が別々の行に当たるときは、今のまま `RS-10`（まとめて取りやめました）とする | `reasonOfWriteRefusal` は全部が同じ行に当たるときだけその行を運ぶ。混ざった束の「まとめて取りやめた」は事実である | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 新しい 11 行 | `docs/spec/_source/notice-reasons.json`（表 T-233） | E-01 |
| 11 行の語と次の一手（ja・en） | `docs/spec/_source/display-words.json` の `reasons` | E-02 |
| 取り込みの拒否のうち、不変条件だけを本表の外に置く | `docs/spec/01-04-requirements.md` の `FR-076`（表 T-233 の結び） | E-03 |
| 編集の拒否が運ぶ行・差し込み口 | 同 `FR-076` | E-04・E-05 |
| 資源の上限の通知が運ぶ行 | 同 `FR-023` | E-06 |
| `Agent API` の拒否の値の鍵 | 同 `FR-064` の 表 T-035 の `AG-9a` | E-07 |
| 貼り付けが安全弁に達したとき（`ST-7`） | 同 `FR-033` | E-08 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行（版は当てるときの次） | E-09 |

数（予測）: 要求 ±0。表 ±0。表 T-233 の行 +11（72 → 83）。辞書の `reasons` の項 +11。設定値 ±0。図 0。命令 ±0。`01-04-requirements.md` の `（MUST）` +2（E-03・E-04）、`（MUST NOT）` +1（E-05）。

---

## 2. 新しい識別子

表 T-233 の 11 行（当てた番号。起草のときの予定と同じになった）:

| 行 ID | 起草のときの予定 | 場面 | 作法 | 出典 | 表示の仕方（推奨） |
|---|---|---|---|---|---|
| `RS-78` | `RS-78` | 取り込むファイルの大きさが `S-113` を超える | `NT-6` | `FR-023` ／ 表 T-211 の `S-113` | 出す |
| `RS-79` | `RS-79` | 取り込む `Task` の件数が `S-114` を超える | `NT-6` | `FR-023` ／ 表 T-211 の `S-114` | 出す |
| `RS-80` | `RS-80` | 取り込む `Task` の入れ子（WBS）の深さが `S-115` を超える | `NT-6` | `FR-023` ／ 表 T-211 の `S-115` | 出す |
| `RS-81` | `RS-81` | 取り込む `Task` に `start` か `finish` が無い（表 T-033 の `EX-5` の中身の無い行を除く） | `NT-1` | `FR-012` | 出す |
| `RS-82` | `RS-82` | 書き込みが指す相手（`Task`・`TaskGroup`・`Resource`）が文書に無い —— 例: コピー元のタスクを消してから貼り付けた | `NT-1` | Chapter 6.1 の 表 T-220 の `IV-2` | 出す |
| `RS-83` | `RS-83` | 載せ替えるタスクが、どのタスクグループにも載っていない | `NT-1` | Chapter 6.1 の 表 T-220 の `IV-6` | 出す |
| `RS-84` | `RS-84` | 塗りと線の両方を透明にしようとした | `NT-1` | Chapter 6.1 の 表 T-220 の `IV-9` | 時間で消す |
| `RS-85` | `RS-85` | 終了日の無いタスクにフェードを付けようとした | `NT-1` | Chapter 6.1 の 表 T-220 の `IV-11` | 時間で消す |
| `RS-86` | `RS-86` | フェードの日数の和がタスクの期間を超える | `NT-1` | Chapter 6.1 の 表 T-220 の `IV-12` | 時間で消す |
| `RS-87` | `RS-87` | 日付として読めない値か、扱える範囲（表 T-214）の外の日付を入れた | `NT-1` | Chapter 6.1 の 表 T-220 の `IV-14` | 時間で消す |
| `RS-88` | `RS-88` | 実績の終了が実績の開始より前になる | `NT-1` | Chapter 6.1 の 表 T-220 の `IV-21` | 時間で消す |

並びの置き場（原稿は表が刷る順に並べる）: `RS-78`〜`RS-81` は開く行（`RS-14` の後）、`RS-82`〜`RS-88` は `RS-58` の後。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `FR-076` の「⚠️ **取り込みの検証（`FR-023`）の拒否は本表に入れない**」 | 「⚠️ **取り込みの検証（`FR-023`）が不変条件で拒んだものは本表に入れない**」と、段の終わりに、行を持たない拒否が本表の行を運ぶ 1 行（E-03）。「⭐ ⇒ 取り込みの検証が拒んだとき、…」の文は逐語のまま残す（試験 7 本が引く） |
| `FR-023` の「…超えた入力は取り込まずに通知すること（MUST）」 | 「…超えた入力は取り込まず、超えた上限に当たる 表 T-233 の行を通知の仕組みへ運ぶこと（MUST）」（E-06） |
| `AG-9a` の「拒んだ 表 T-220 の行の行 ID であり、人向けの通知と同じ鍵である」 | 「人向けの通知と同じ鍵である —— 不変条件で拒んだなら 表 T-220 の行、行を持たない拒否なら 表 T-233 の行」（E-07） |
| `FR-033` の「段が 表 T-014 の `ST-7` の安全弁に達したときは、貼り付けを受け付けずに通知すること（MUST）」 | 「…貼り付けを受け付けず、表 T-233 の `RS-24` として通知の仕組みへ運ぶこと（MUST） —— 作法は `FR-076` に従う」（E-08） |
| `validate-imported-document.ts` の拒否の規則 `S-113`・`S-114`・`S-115`・`FR-012` | `RS-78`〜`RS-81` |
| 編集の拒否 `IV-2`・`IV-6`・`IV-9`・`IV-11`・`IV-12`・`IV-14`・`IV-21` → `RS-10` | → `RS-82`〜`RS-88`（`REFUSAL_SITUATIONS` に 7 行） |
| 試験 `tests/contract/dfc-406-d-411-the-reason-a-refused-write-carries.test.ts` の「a parent task naming a uid the document does not hold is told RS-10」（`IV-2` → `RS-10` を主張する） | 同じ場面は `RS-82` を主張する形へ。「行の無い拒否は `RS-10` のまま」の守りは、まだ行の無い規則（例: `CM-15` の `FR-012`、または別々の行に当たる拒否の混ざった束）へ移す |

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/_source/notice-reasons.json -->
`reasons` に 2 節の 11 行を足す。`scene.ja` は 2 節の場面の欄、`manner` は作法、`source.ja` は出典、`display` は 11 節で利用者が選んだ値（推奨は 2 節）。

<!-- EDIT id=E-02 file=docs/spec/_source/display-words.json -->
`reasons` に 11 項を足す（`rowId` は当てた番号）。語は 11 節の一覧の ja と、下の en:

| 行 ID | en `text` | en `nextStep` |
|---|---|---|
| `RS-78` | The file is larger than {importMaxBytes} MB, so it cannot be opened | Split the original file, or take out what is not needed, to bring it to {importMaxBytes} MB or less, then open it |
| `RS-79` | The file holds more than {importMaxItems} tasks, so it cannot be opened | Split the original file so that each part holds {importMaxItems} tasks or fewer, then open it |
| `RS-80` | Tasks are nested more than {importMaxDepth} levels deep, so this file cannot be opened | Make the nesting {importMaxDepth} levels or shallower in the original file, then open it |
| `RS-81` | A task has no start date or no finish date, so this file cannot be opened | Give that task a start and a finish date in the original file, then open it |
| `RS-82` | What this change points at (a task, task group or assignee) is no longer in the document, so it was not made | Look over the screen, choose the target again, then try once more |
| `RS-83` | The task being moved sits on no task group, so it was not moved | Look over the screen, then try once more |
| `RS-84` | The fill and the line cannot both be transparent | Give one of them a colour |
| `RS-85` | A task with no finish date cannot have a fade | Enter a finish date first, then add the fade |
| `RS-86` | The fade days would add up to more than the task's span, so the change was not made | Shorten the fades, or lengthen the task's span |
| `RS-87` | The value is not a date, or is outside the dates that can be handled, so the change was not made | Enter a date from {importMinDate} to {importMaxDate} |
| `RS-88` | The actual finish would come before the actual start, so the change was not made | Enter the dates again so that the actual finish is on or after the actual start |

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`FR-076` の 表 T-233 の結びの段で、2 か所を変える。

① 段の頭の 1 行を替える:

```text
⚠️ **取り込みの検証（`FR-023`）が不変条件で拒んだものは本表に入れない** —— Chapter 6.1 の 表 T-220 の行が既に行 ID を持っており、**そちらは自分の行 ID で引ける。**  
```

② 段の終わり（「⚠️ 上の「同表に無い理由を運んではならない」の例外はこの 1 つだけであり、…も同じ鍵を運ぶ。」の後）に 1 行足す:

```text
⭐ 同表に行を持たない取り込みの拒否（資源の上限（`_assets/tbl-settings.md` の 表 T-211）と、`start` か `finish` を持たない `Task`（`FR-012`））は、上の例外に当たらない —— 本表のうち出典の欄がその上限か `FR-012` を名指す行を運ぶこと（MUST）。  
```

⚠️ 「⭐ ⇒ 取り込みの検証が拒んだとき、`NT-1` の通知が運ぶ理由は、拒んだ 表 T-220 の行の行 ID とすること（MUST）」は**逐語のまま残す** —— 既存の試験 7 本（`tests/contract/cr-586-…`・`cr-712-the-words-…`・`cr-718-an-import-refusal-…`・`cr-718-the-requirement-text-…`・`dfc-732-…`・`tests/system/cr-712-…`・`tests/system/cr-718-…`）と `display-words.contract.test.ts` の正規表現がこの文を引く。狭めは ① の頭の行と ② の行が持つ（② は段の終わりに置く —— 検査 42 は試験が引く文の隣を読む）。
（「⛔ 同じものに 2 つ目の鍵を作らない。」「⚠️ 同表の行の相乗りは…」「⛔ その通知を本表の行（`RS-15` を含む）へ振り替えてはならない（MUST NOT）…」も変えない。）

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`FR-076` の「⛔ **拒否の理由を 1 つの行へ潰してはならない（MUST NOT）** —— …」の行の後に 1 行足す:

```text
⭐ 画面からの書き込みが Chapter 6.1 の 表 T-220 の行で拒まれたときは、本表のうち出典の欄がその行を名指す行を運ぶこと（MUST） —— 拒んだ行がばらばらの束は、`RS-10` のままである。  
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
`FR-076` の「⛔ 行の言うことを書き換えたときは、…」の段の前に 1 行足す:

```text
⛔ 設定値を理由の語に書き写してはならない（MUST NOT） —— 語は差し込む場所を設定値の名前（例 `{importMaxBytes}`）で書き、画面はそこへ `_assets/tbl-settings.md` の値を差し込む（`FR-073` の `{downloadUrl}` と同じ形）。  
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
`FR-023` の「資源の上限（ファイルサイズ・件数・WBS のネストの深さ・解釈しない要素のネストの深さ）を … 超えた入力は取り込まずに通知すること（MUST）。」を替える:

```text
資源の上限（ファイルサイズ・件数・WBS のネストの深さ・解釈しない要素のネストの深さ）を `_assets/tbl-settings.md` の表 T-211 に従って持ち、超えた入力は取り込まず、超えた上限に当たる 表 T-233 の行を通知の仕組みへ運ぶこと（MUST） —— 作法は `FR-076` に従う。  
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
`FR-064` の 表 T-035 の `AG-9a` の「⭐ 取り込みの検証（`FR-023`）が拒んだときの理由の区分は、拒んだ `05-07-design.md` の 表 T-220 の行の行 ID であり、人向けの通知と同じ鍵である（規則は `FR-076` の 表 T-233 の結びが持つ）」を替える:

```text
⭐ 取り込みの検証（`FR-023`）が拒んだときの理由の区分は、人向けの通知と同じ鍵である —— 不変条件で拒んだなら `05-07-design.md` の 表 T-220 の行の行 ID、同表に行を持たない拒否なら 表 T-233 の行の行 ID（規則は `FR-076` の 表 T-233 の結びが持つ）
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
`FR-033` の「段が 表 T-014 の `ST-7` の安全弁に達したときは、…」の 1 行を替える（`CR-718` が `FR-008` に当てた形）:

```text
段が 表 T-014 の `ST-7` の安全弁に達したときは、貼り付けを受け付けず、表 T-233 の `RS-24` として通知の仕組みへ運ぶこと（MUST） —— 作法は `FR-076` に従う。貼り付けだけに逃げ道を作ると、安全弁が場所によって効いたり効かなかったりする。
```

⚠️ コードは変わらない —— `copy-and-paste.ts` は既に `STACK_SAFETY_CAP_REASON`（`RS-24`）を上げている。

<!-- EDIT id=E-09 file=docs/development-records/changelog.md -->
変更履歴の表の終わりに 1 行足す（版は当てる日の最後の次。ぶつかれば調整役が付け直す）。

### 4.1 生成物

`npm run gen` が `docs/spec/_assets/tbl-notice-reasons.md`（表 T-233）と `src/use-case/advance-screen-session/notice-values.ts` の生成の領域（`NoticeReason`・`NOTICE_DISPLAY_OF_REASON`）を刷る。手で直さない。

---

## 5. 継ぎ目（コード）—— `8d776ed6` の行

| ファイル | 変えるもの |
|---|---|
| `src/use-case/validate-imported-document/validate-imported-document.ts` | `validateImportedDocument` の `refusal('S-113', …)`（172 行の枝）・`refusal('S-114', …)`（188 行）・`refusal('S-115', …)`（216 行）・`refusal('FR-012', …)`（255 行）の規則を、当てた 表 T-233 の行（`RS-78`〜`RS-81`）にする。行は名前を付けた定数に置く（`UNUSABLE_DATE_ROW` と同じ形）。`notice`（`NT-6` ／ `NT-1`）は変えない |
| `src/framework/single-html-shell/document-file-flow.ts` | 変えない —— `tellImportRefusals` は規則が `NOTICE_DISPLAY_OF_REASON` に在ればその行を運ぶ。生成で行が入れば `RS-15` に落ちなくなる |
| `src/framework/single-html-shell/frame-loop.ts` | `REFUSAL_SITUATIONS` に 7 行 —— `{ reason: <RS-82>, command: null, rule: 'IV-2' }` から `IV-21` まで（`RS-57` の `IV-1` と同じ形）。`reasonOfWriteRefusal` は変えない（束の全部が同じ行に当たるときだけその行、X-6） |
| `src/adapter/screen-renderer/notices.ts` | `filledWord` に、設定値の名前の差し込み口を足す（`{importMaxBytes}`・`{importMaxItems}`・`{importMaxDepth}`・`{importMinDate}`・`{importMaxDate}` → 検証が読むのと同じ `SETTINGS_CONSTANTS` の値）。`linkedWordsOf`（`{downloadUrl}`）は変えない |
| `Agent API` | コードは変えない。`importDocument` の拒否の値の規則が、上の 4 つでは 表 T-233 の行になる（E-07） |

毎フレームの経路ではない（開くときに 1 回、拒まれた書き込みに 1 回）。`perf-pending.md` に行は要らない。
⚠️ 辞書の語を画面で照らす試験（`tests/contract/display-words.contract.test.ts` ほか）が差し込み口を知らなければ、差し込んだ数を戻して照らす形（同ファイルの `{total}`・`{shown}` の扱い）を足す。

### 5.1 既存の試験で、古い振る舞いを主張しているもの（実装の体が退役・付け替える）

- `tests/contract/dfc-406-d-411-the-reason-a-refused-write-carries.test.ts` の「a parent task naming a uid the document does not hold is told RS-10」—— `IV-2` → `RS-10` を主張する。3 節のとおり付け替える。
- `tests/contract/t-233-reason-words-tell-the-row.contract.test.ts` の `PAIRED_ON_2026_09_03` —— 新しい 11 行の指紋を足す（行と語を読み合わせた印）。
- `tests/contract/dfc-290-d-321-fr-033-copy-and-paste-reach-the-document.test.ts` —— E-08 で替える `FR-033` の `ST-7` の文を逐語で引く（4 か所: 注 2・値 2）。新しい文に合わせる（振る舞いの主張は変えない —— `CR-718` が `e24-…` の試験に行った形）。
- `tests/contract/cr-718-an-import-refusal-names-its-t-220-task-group.contract.test.ts` の `FR-012` を含まない主張はそのまま通る。E-03 は同ファイルほか 7 本が引く文を残すので、逐語の引きは赤くならない。


### 5.2 当てるときに合わせたもの

- E-07: `AG-9a` の今の文は起草が引いた形と違い、「…拒んだ `05-07-design.md` の 表 T-220 の行の行 ID とすること（MUST） —— 人向けの通知と同じ鍵である（…）。」であり、試験 2 本（`tests/contract/cr-718-an-import-refusal-names-its-t-220-task-group.contract.test.ts`・`tests/unit/cr-551-agent-import-checks-every-shape.test.ts`）がこの文を逐語で引く。E-03 と同じ形で、文は**逐語のまま残し**、同じ升の後ろに「⭐ 同表に行を持たない拒否（資源の上限と、`start` か `finish` を持たない `Task`）では、理由の区分は `FR-076` が運ばせる 表 T-233 の行の行 ID である —— これも人向けの通知と同じ鍵である。」を足した（`（MUST）` ±0 —— 義務は E-03 ② の `FR-076` の 1 行が持つ）。
- 5 節の差し込み口: `notices.ts` の `settingsFilledWord` は、語の中の `{名前}` のうち `SETTINGS_CONSTANTS` が持つ名前（数か文字列）だけを値に替える。5 つの名前を書き並べない —— 新しい差し込み口は語に書くだけで届く。`{downloadUrl}` は今までどおり `linkedWordsOf` が持つ。
- 5 節の ⚠️: `tests/contract/display-words.contract.test.ts` は、辞書の語を画面と照らす前に、`{downloadUrl}` と同じく設定値の名前を値に戻す（`withSettingValues`）。
- 5.1 のほか: `tests/contract/cr-712-the-display-manner-of-every-task-group.contract.test.ts` の数（72 → 83 行、出す 28 → 34、時間で消す 14 → 19、辞書の項 67 → 78）と「時間で消す」の列に `RS-84`〜`RS-88` を足した。
- 編集の拒否の 25 か所は当てる木でも同じ数だった（`IV-2` 10・`IV-6` 1・`IV-9` 2・`IV-11` 1・`IV-12` 2・`IV-14` 7・`IV-21` 2）。コードの `reject` は変えず、`REFUSAL_SITUATIONS` の 7 行が選ぶ。
- 変更履歴は `4.24`（`4.23` は同じ時期に当たる `CR-720` が持つ）。

---

## 6. グラフ（`8d776ed6` の上、`impact.py FR-076 FR-033 FR-023 FR-012 RS-10 RS-15 S-113 S-114 S-115 RS-24`）

- `FR-076` を指すのは要求 16 件・29 か所、`FR-033` は 6 件・23 か所、`FR-023` は 13 件・43 か所、`FR-012` は 14 件・32 か所。仕様の中のどの指しも、E-03〜E-08 で替える文を逐語で引かない（試験が引く文は 5.1）。
- `RS-10` を指すのは要求 1 件・2 か所、`RS-15` は 1 件・3 か所、`S-113` は 0 件・1 か所、`S-114` は 0 件・0 か所、`S-115` は 0 件・3 か所、`RS-24` は 1 件・1 か所。
- 新しく指す辺: 表 T-233 の 11 行 → `FR-023`・表 T-211・`FR-012`・表 T-220（出典の欄）。`FR-076` → 表 T-211・`FR-012`・`FR-073`。`FR-033` → `RS-24`。どれも既に在る辺の向き（要求 → 表 T-233 → 要求の出典）であり、`RS-57`・`RS-58` が 表 T-220 を出典に持つ形と同じなので、輪は作らない。

---

## 7. 数（実測、`8d776ed6`）

- 表 T-233 の行 72（出す 28・出さない 21・時間で消す 14・`U-62` に並べる 9）、最大 `RS-77`。作法 `NT-6` の行は 0。
- 編集の拒否で 表 T-220 の行を名乗る `reject` は 29 か所（`IV-1` の 4 は `RS-57` に当たる。残る 7 つの行で 25 か所が `RS-10` に落ちる）。
- 取り込みの検証で 表 T-233 にも 表 T-220 にも無い規則は 4（`S-113`・`S-114`・`S-115`・`FR-012`）。

---

## 8. 波・確かめ

| 波 | 誰が | 何を |
|---|---|---|
| W1 | 当てる体（1 つの作業木） | 仕様（E-01〜E-08）→ `npm run gen` → コード（5 節）→ 既存の試験の付け替え（5.1）→ 台帳（12 節）→ 変更履歴（E-09） |
| W2 | 仕様だけを読む試験の体（別の作業木） | 9 節の継ぎ目の名で、W1 と同時に書いてよい |

⚠️ `frame-loop.ts` は持ち場が重なりやすい —— 同じ時期にこのファイルを持つ体があれば、調整役が順を決める。

---

## 9. 仕様だけを読む試験の継ぎ目（試験の体に名指す名）

- 取り込み: `validateImportedDocument(candidate)`（`src/use-case/validate-imported-document/validate-imported-document.ts`）の `refusals[].rule` が、32 MB を超える大きさ・20000 件を超える `Task`・深さ 64 を超える入れ子・`start` の無い `Task` で、当てた 表 T-233 の行になり、`S-113`・`S-114`・`S-115`・`FR-012`・`RS-15` にならないこと。上限の数は `SETTINGS_CONSTANTS` から読む（書き写さない）。
- 編集: 既存の試験 `tests/contract/dfc-406-d-411-the-reason-a-refused-write-carries.test.ts` と同じ枠（`loopWith(document)` → `settle({ row, key, text })` → `notices()`）で、①コピー元を消してから貼り付ける（`IV-2`）②塗りと線を両方透明にする（`IV-9`）③フェードの和を期間より長くする（`IV-12`）④実績の終了を実績の開始より前にする（`IV-21`）—— どれも当てた行の語が出て、`RS-10` の語が出ないこと。
- 表示の仕方: 当てた行が 表 T-233 の欄の値どおりに出る・時間で消える（`NOTICE_DISPLAY_OF_REASON`、`NT-2` の `S-542`）。
- 差し込み口: 画面に出た語に `{` が残らず、`importMaxBytes` などの値が入ること。
- 実物（`tests/system/`）: 20001 件の `Task` を持つ `GRS JSON` を『開く』で開く —— 当てた行の語が通知の欄に出て、開いていた文書は変わらない（`tests/system/cr-718-an-import-refusal-is-told-in-its-t-220-words.test.ts` と同じ形）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 既存の 72 行の表示の仕方を 1 つも変えない（`JDG-1748`・`JDG-1749`）。
- 表 T-220 の行の語（取り込みの形）を変えない（`JDG-1761`・`JDG-1762`）。
- `S-133`（`carryMaxDepth`、解釈しない要素の入れ子の深さ）は `FR-023` が資源の上限に数えるが、`8d776ed6` の `src` はどこでも確かめていない（`document-settings.ts` に値があるだけ）。本書は行を足さない —— 確かめる道ができるときに同じ形（`NT-6`、出典 表 T-211 の `S-133`）で足す。
- `CM-15`（予実の状態を進める）の `reject('CM-15', 'FR-012', …)` は 表 T-220 の行でも本書の 11 場面でもないので `RS-10` のままである。
- `PND-179`（貼り付けが安全弁に達したかを誰が数えるか）には触れない —— E-08 は文だけを 表 T-233 に寄せる。

---

## 11. 利用者に見せるもの（`JDG-1776` —— 11 の語。Excel は作らない）

調整役が対話で次の一覧を見せ、語と表示の仕方を確かめてから W1 を出す。表示の仕方は 3 つ —— **出す**（`OK` で消すまで残る）・**時間で消す**（`S-542` が経つと消える）・**出さない**。

| # | 場面 | 語 → 次の一手 | 表示（推奨） |
|---|---|---|---|
| 1 | 40 MB のファイルを開いた | 大きさが 32 MB を超えているので、このファイルは開けません → 元のファイルを分けるか、要らないものを除いて 32 MB 以下にしてから開いてください | 出す |
| 2 | タスクが 25000 件あるファイルを開いた | タスクが 20000 件を超えているので、このファイルは開けません → 元のファイルを、タスクが 20000 件以下になるように分けてから開いてください | 出す |
| 3 | 親子の入れ子が 70 段あるファイルを開いた | 親タスクと子タスクの入れ子が 64 段より深いので、このファイルは開けません → 元のファイルで入れ子を 64 段以下に浅くしてから開いてください | 出す |
| 4 | 開始日の無いタスクを含むファイルを開いた | 開始日か終了日の無いタスクがあるので、このファイルは開けません → 元のファイルでそのタスクに開始日と終了日を入れてから開いてください | 出す |
| 5 | タスクをコピーし、元のタスクを消してから貼り付けた | 操作の相手（タスク・タスクグループ・担当者）が、もう文書にないので、行っていません → 画面を見直して、相手を選び直してから、もう一度行ってください | 出す |
| 6 | どのタスクグループにも載っていないタスクを動かした（壊れた文書でだけ起きる） | このタスクはどのタスクグループにも載っていないので、動かせません → 画面を見直して、もう一度行ってください | 出す |
| 7 | 塗りと線の両方を透明にした | 塗りと線の両方を透明にはできません → どちらかに色を付けてください | 時間で消す |
| 8 | 終了日の無いタスクにフェードを付けた | 終了日の無いタスクには、フェードを付けられません → 先に終了日を入れてから、フェードを付けてください | 時間で消す |
| 9 | フェードの日数の和をタスクの期間より長くした | フェードの日数の和がタスクの期間より長くなるので、変えられません → フェードを短くするか、タスクの期間を延ばしてください | 時間で消す |
| 10 | 日付の欄に 2300-01-01 を入れた | 日付として読めないか、扱える範囲の外の日付なので、変えられません → 1970-01-01 から 2200-12-31 までの日付を入れてください | 時間で消す |
| 11 | 実績の終了を実績の開始より前にした | 実績の終了が実績の開始より前になるので、変えられません → 実績の開始より後に終了が来るように、日付を入れ直してください | 時間で消す |

（32 MB・20000 件・64 段・1970-01-01・2200-12-31 は語に書かず、`S-113`・`S-114`・`S-115`・`S-119`・`S-120` の値を画面が差し込む —— X-2。）

⇒ 語か表示の仕方を利用者が変えたら、その行だけを E-01・E-02 で直して当てる。

---

## 12. 台帳（当てるときに動かす）

| 行 | 何 | 当てたときの扱い |
|---|---|---|
| `DFC-2305` | 編集で拒んだ不変条件が `RS-10` に潰れる | `裁定待ち` → `実測待ち`（手順: 13 節の下） |
| `DFC-2310` | 取り込みの検証が行の無い規則で拒むと `RS-15` に落ちる | `裁定待ち` → `実測待ち` |
| `JDG-1776` | 案 A、11 行 | `指示 —— CR-719 が当てる` → `適用済`（着地先: 表 T-233 の当てた 11 行・`FR-076`） |

利用者の実物での確かめ（当てた後、`DFC-2305`・`DFC-2310` の行に書く）: ① タスクを 1 つコピーし、元のタスクを消してから `Ctrl` ＋ `V` —— 期待: 5 番の語が出て、文書は変わらない。② プロパティパネルでフェードの日数をタスクの期間より長くする —— 期待: 9 番の語が出て、しばらくすると消える。③ 開始日の無いタスクを持つ `GRS JSON` を『開く』で開く —— 期待: 4 番の語が出て、開いていた文書は変わらない。

---

## 13. 測り方の再現

```
# the tree: worktree at 8d776ed6
git grep -c "CR-719" 8d776ed6 -- .          # 0
git grep -n "JDG-1773\|JDG-1776" 8d776ed6 -- docs   # 0
# T-233 rows, displays, manners, max id
# read docs/spec/_source/notice-reasons.json: len(reasons) = 72, max id RS-77, rows with manner NT-6 = 0
grep -n "refusal('S-11\|refusal('FR-012'" src/use-case/validate-imported-document/validate-imported-document.ts
grep -rnE "reject\([^)]*'IV-[0-9]+'" src/use-case/edit-document     # 29 (IV-1 x4, IV-2 x10, IV-6 x1, IV-9 x2, IV-11 x1, IV-12 x2, IV-14 x7, IV-21 x2)
grep -n "REFUSAL_SITUATIONS" -A10 src/framework/single-html-shell/frame-loop.ts   # IV-1 is the only T-220 row
grep -rn "carryMaxDepth" src                 # values only, never checked
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-076 FR-033 FR-023 FR-012 RS-10 RS-15 S-113 S-114 S-115 RS-24
```
