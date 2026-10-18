# CR-796 —— 取次は人が決めたフォルダへ書き出しを保存し、表をページに分けて読ませ、人を待たずに答え、対話の機能を外す

> 状態: 🔧 **片ごとに当てている** —— 2026-10-18、α を手で触る補助の席（`objective-montalcini-bfeb78`）が起草し、利用者の決定（「遅延診断のデッドロック問題は α版で直すよ。 その後はGRS Relay 。 GRS Relayの確認が終わったら GT-2のテスト。」、調整役が中継）で α に入れる。調整役の指示で 7 つの片に分け、片ごとに仕様 → 実装 → 仕様だけを読む別の体の試験 → 関門の順で当て、片ごとにコミットする（どこで止めても動く）。打ち切りは 20:00。変更履歴は 5.10（片ごとに版を増やさない）。片の進みは 5 節。
> 当てる裁定: `JDG-2760`〜`JDG-2768`（どれも利用者が答えた。2026-10-18 朝）。覆す裁定: 無し —— `JDG-2767` は `JDG-2506` が「後で消す」とした対話欄のコードを消す時を決めた。
> 閉じる不具合: `DFC-3250`（取り消し・やり直しが空の実装）・`DFC-3251`（`null` が届かない）・`DFC-3252`（取り込みが人を待って時間切れ）・`DFC-3253`（答えが受け口を超える）・`DFC-3254`〜`DFC-3256`（表を読めない・列の名・担当リスト）・`DFC-3257`（Claude Code が命令の形を落とす）・`DFC-3131`（説明が日本語で行 ID だらけ）。
> 新しい ID（当てた順に振り直した）: 表 T-107 の `AM-28`（`readTableRows`）・`AM-29`（`requestOpenFile`、片 ⑦）、表 T-400 の `AV-15`（`AgentImportOutcome`）・`AV-16`（`AgentSearchPage`）・`AV-17`（`AgentTableColumn`）・`AV-18`（`AgentTableRows`）・`AV-19`（`AgentTableRow`）・`AV-20`（`AgentTableCell`）・`AV-21`（`AgentSavedFile`、片 ⑦）、表 T-233 の `RS-90`（取次との接続が切れた）、表 T-234 の `QN-17`（AI がファイルを開くよう求めている）。
> 消す ID: 1.2 節の表のとおり（`FR-066`・`U-44`・`IC-18`・`S-99i`・`UZ-9`・`AG-11`・`AM-6`・`AM-18`・`AV-12`・`AV-13` ほか）。
> 改名: 無し —— 起草のときは `AM-25` を `readTableRows` へ改める案だったが、α に入れるにあたり試験 15 本の書き直しを避けて名を残した（③ の 9）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1` ／ `GL-004`（構造化した日程データを AI に渡す）。利用者が 2026-10-18 に取次の全 22 の道具を手で使わせ、見つかった穴（`DFC-3250`〜`DFC-3257`）と、人と AI が同じことをできるという求め（`JDG-2766`「人間とAIが協奏するには同じことをAIに出来るようにしないと」）を、取次の 1 回の直しで閉じる。利用者 2026-10-18「GRS Relayの修正は1回で終わらせたい」。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R2.9`**（要らないものを持たない）・**`R2.21`**（1 つの仕事は 1 か所）・**`R2.5`**（名は指すものを言う）。
出たこと:
① 対話欄は開く入口が無く（`JDG-2506`）、AI の発話は人に見えない —— 使われない機能を持ち続けない（`R2.9`）。消す。
② 保存のために道具を足すと、`AG-12` の ④（道具は 表 T-107 と 1 対 1）を崩し、書き出しの道具と保存の道具が同じ形式を 2 か所で持つ —— 書き出しの 5 つのメンバに MCP だけの鍵を足す（`watchChanges` の `waitMs` と同じ前例、`R2.21`）。
③ 検索の読み手を 4 つの表へ広げると、名 `readSearchRows` が指す先と食い違う —— `readTableRows` へ改名する（`R2.5`）。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 保存は道具を足さず、書き出しの 5 つ（`AM-11`〜`AM-15`）の MCP だけの鍵 `fileName`・`overwrite` で頼む —— 鍵があれば取次が値をファイルに書き、AI には書いた所と大きさだけを返す。鍵が無ければ今までどおり値を返す。
2. ⭐ 保存先は取次の設定 2 つ —— `saveFolder`（既定は利用者のドキュメントの下の `GRS`、`JDG-2762`）と `confirmBeforeOverwrite`（既定 `true`、`JDG-2763`）。束（`.mcpb`）では AI のアプリの拡張の設定に出し、コマンド行の形（`grs-relay.mjs`）では同じ名の引数で受ける。
3. ⭐ `fileName` はフォルダの中の相対の所（下のフォルダを含んでよい）で、拡張子は形式ごとに 1 つ（`.json`・`.xml`・`.svg`・`.png`・`.html`）。`..`・絶対の所・ドライブ・UNC・装置名・`:` を含む名、解いた実の所がフォルダの外へ出るもの（リンク・ジャンクション）は断る。
4. ⭐ 上書きの前に既にあるファイルを `<名>.bak` へ 1 世代移す（古い `.bak` は置き換える）。書くのは一時ファイルに書いてから名を替える。大きさの上限は置かない —— 書き出しの大きさは文書の上限（表 T-004）が既に縛る。
5. ⭐ 読むのは人が選ぶ —— 新しいメンバ `requestOpenFile`（`AM-28`）は問い `QN-17`「AI がファイルを開くよう求めています」を出してすぐ返り、人が「開く…」を押すと `IC-1` と同じ道（`FR-087`、`OP-3` の 3 択）で開く。押す操作が人の操作なので、ブラウザがファイルを選ぶ窓を開ける。AI が保存先のフォルダのファイルを名で読む道は作らない（読んだ中身は会話として AI のサービスへ渡るので、人が選んだものだけにする）。
6. ⭐ 人の答えを待つメンバ（`AM-8` の合流の 3 択・`AM-28`）は、問いを出したら `AgentImportOutcome`（`AV-15`）の「人に問うたとき」ですぐ返る。人が答えた後の書き込みは**人の書き込み**として刻印に残る —— だから AI の `watchChanges` が起きる（`AG-6` は自分の書き込みで起きない）。⚠️ 置き換え（表 T-230 の `RD-4`）は刻印を入ってきたままに据えるので、入ってきた文書の最後の書き手が呼んだ側と同じ名なら起きない —— `AG-12` の ⑥ に書き、AI は `readStamp` で見る（実装の体が見つけた食い違い）。型の名を `AgentAskOutcome` から `AgentImportOutcome` にしたのは、`Promise<A | B>` の入れ子の `|` を表の印字が持てないためである。
7. ⭐ 取次の締め切りは 45 秒 —— AI 側の要求の時間切れ（MCP の TypeScript の部品の既定 60 秒と見込む。**未測** —— 実装で測り直し、短ければこの値を下げる）より短くする。過ぎたら拒否 `relayTimedOut` を値で返し、後から来た答えは捨てる。`watchChanges` の `waitMs` は 40 秒で頭打ちにする。
8. ⭐ 切断の知らせは通知 `RS-90`（`NT-5`、時間で消さない）—— 利用者の語では「帯」だが、既にある通知の箱（`NT-8` で消せる）を使い、新しい UI パーツを作らない。
9. ⭐（片 ④ で改めた）表の読み手は今の `readSearchRows`（`AM-25`）のまま、引数 `filters`・`offset`・`limit` を足し、答えを `AgentSearchPage`（`AV-16`）にする —— 名を変えると試験 15 本が書き直しになり、α の時間に収まらない。遅延診断レポートと担当リストの表を読む道（`DFC-3254` の残り・`DFC-3256`）は、調整役の指示（`JDG-2766` の原則に入る）で 4 片目の続きとして新しいメンバ `readTableRows`（`AM-28`、表を引数で選ぶ 1 つ）で入れた —— 利用者が選んだ A' の「道具を増やさない」を 1 つだけ破る（覆してよい）。⚠️ 以下の起草のときの文（表を引数 `table` で選ぶ —— `searchTasks`・`searchCommentBoxes`・`delayDiagnosticsReport`・`resourceList`）は当てていない。`filters` が `asShown`（既定）なら、その表に人が掛けている列のフィルタと並べ替え（`tableViews`、`S-560`〜`S-572`）を当てる。語は引数で渡し、パネルの入力欄は読みも変えもしない（今の `AM-25` と同じ）。1 回に返す行は既定も上限も 100（方法: 空の語の検索の 1 行は約 445 字（2026-10-18 に 1,000 行で 418,200 字を測った）なので、100 行で約 4.5 万字）。答えに列の一覧（列の行 ID・画面の名 ja/en・値の種類）を添える。
10. ⭐ AI が列のフィルタを掛けるのは今ある `setTableView`（`CM-92`）のまま —— 画面と同じ値を書くので、人の画面の表も同じに絞られる（`JDG-2766` の「同じことを」）。
11. ⭐ `readDocument`（`AM-3`）は引数 `includeCarry`（既定 `false`）と `taskUids`（既定 `null` ＝ 全部）を受ける。`taskUids` を渡すと、タスクに属する 6 つの群（`tasks`・`assignments`・`taskVisuals`・`taskGroupMembers`・`taskOrigins`・`baselineTasks`）をそのタスクだけにする。持ち越しの欄（`carry`・`carryElements`）は雛形の文書で 84% を占めた（1,383,668 → 220,379 字、`DFC-3253`）。
12. ⭐ 刻印の食い違いの拒否（`AV-3`）は文書を持たない —— 今の刻印だけを返し、AI は要るものを読み直す。変更の知らせ（`AV-14`）も文書を持たず、今の刻印だけを持つ。
13. ⭐ 取り消し・やり直し（`AM-9`・`AM-10`）は引数 `expectedStamp` を受け（`WS-1` が照らす）、表 T-230 の `RD-1`・`RD-2` を名乗る。戻す段・進める段を書いたのが呼んだ書き手（表 T-229 の `ED-2`）でなければ拒否 `notOwnStep` —— AI が人の編集を黙って戻さない。
14. ⭐ 道具の入力の形は、どの MCP の受け手でも落ちない書き方だけにする —— `oneOf`・`anyOf`・型の並びを使わない。命令の束は `kind` を 91 の名の `enum` にし、命令ごとの欄の形は 2 つ目の資源 `grs-relay://grs-commands.schema.json`（表 T-108 の原稿から刷る）で渡す。`showOnlyTasks`（`AM-27`）の解除は `null` でなく空の並び `[]`。
15. ⭐ 道具・命令・引数の説明は英語で刷り、仕様の行 ID を入れない（`JDG-2768`）。原稿に `en` を足し、表の印字（`tbl-agent-api-members.md`・`tbl-document-commands.md`）は日本語のまま。公開の仕様の宛先は初期化の案内に 1 度だけ。
16. ⭐ `Agent API` の版（`AG-1`）は実装を当てる時刻へ上げる —— メンバを消し・足し・改名し・形を変えるので非互換である。文書の形式の版（`FR-073`）は上げない —— `GRS JSON` の形は変わらない（対話欄の状態はもともと文書に置かない）。

---

## 1. 対応

### 1.1 直すこと

| # | 直すこと | 裁定・不具合 | 仕様の ID | 直す原稿・文書 |
| --- | --- | --- | --- | --- |
| 1 | 書き出しの 5 つに MCP だけの鍵 `fileName`・`overwrite`、答え `AgentSavedFile`、拒否 `fileExists`・`badFileName`・`saveFolderUnavailable` | `JDG-2760`〜`2763` | `AM-11`〜`AM-15`・`AV-4`・`AV-17`、`AG-12` の ⑨（新）と結び、設計 3.1・5・6・7 | `_source/agent-api-members.json`、`_assets/design-mcp-relay.md`、`01-04-requirements.md`（`AG-12`） |
| 2 | 取次の設定 `saveFolder`・`confirmBeforeOverwrite` | `JDG-2761`〜`2763` | 設計 6 | `_assets/design-mcp-relay.md` |
| 3 | 人が選んで開く `requestOpenFile` と問い `QN-17` | `JDG-2760` | `AM-28`（新）・`AV-15`（新）・`QN-17`（新） | `_source/agent-api-members.json`、`_source/notice-reasons.json`、`_source/display-words.json` |
| 4 | 人を待つメンバはすぐ返る | `JDG-2764`・`DFC-3252` | `AM-8`・`AV-15`、`AG-12` の ⑥、設計 5 | `_source/agent-api-members.json`、`01-04-requirements.md`、`_assets/design-mcp-relay.md` |
| 5 | 取次の締め切りと `relayTimedOut` | `JDG-2764` | `AV-4`、`AG-12` の ⑤、設計 3.3・5 | 同上 |
| 6 | 切断の知らせ `RS-90` | `JDG-2764` | `RS-90`（新）、`AG-12` の ② | `_source/notice-reasons.json`、`_source/display-words.json`、`01-04-requirements.md` |
| 7 | 表の読み手 `readTableRows` | `JDG-2765`・`2766`、`DFC-3254`〜`3256` | `AM-25`（改名）・`AV-16`（新） | `_source/agent-api-members.json`、`_source/components.json` |
| 8 | `readDocument` の 2 つの引数 | `JDG-2765`・`2766`、`DFC-3253` | `AM-3` | `_source/agent-api-members.json` |
| 9 | 拒否と知らせは文書を持たない | `DFC-3253` | `AV-3`・`AV-14`、`AG-2`・`AG-6` | `_source/agent-api-members.json`、`01-04-requirements.md` |
| 10 | 取り消し・やり直し | `DFC-3250` | `AM-9`・`AM-10`、`RD-1`・`RD-2` の呼び手の欄 | `_source/agent-api-members.json`、`05-07-design.md`（表 T-230） |
| 11 | 落ちない入力の形と命令の資源 | `DFC-3257`・`DFC-3251` | `AM-7`・`AM-27`、`AG-12` の ⑧、設計 3.1 | `_source/agent-api-members.json`、`_assets/design-mcp-relay.md`、`01-04-requirements.md` |
| 12 | 英語の説明 | `JDG-2768`・`DFC-3131` | 表 T-107・表 T-108 の原稿、案内の文 | `_source/agent-api-members.json`、`_source/document-commands.json` |
| 13 | 対話の機能を消す | `JDG-2767` | 1.2 節 | 1.2 節の各所 |

### 1.2 消すもの（⛔ 先に数えた —— 規則 05 の CR の作法）

`grep` で `対話|発話|Dialogue|U-44|IC-18|S-99i|UZ-9|AG-11|AM-6|AM-18|AV-12|AV-13|DialogueMessage|readDialogueMessages|postDialogueMessage` を `docs/spec` に引いた所（`3.` に数と方法）。

| 消す ID・語 | 在りか | 消し方 |
| --- | --- | --- |
| `FR-066`（AI と画面上で対話する） | `01-04-requirements.md` | 節ごと消す。指す所（`SK-19`・`UZ-9`・`EP-11`・`WB-3` の対話欄・`IN-5a`・設計 5.5）から語を外す |
| `U-44`（`Dialogue Field`） | `_assets/tbl-glossary.md`（`_source/display-words.json`） | 行と語を消す |
| `IC-18` | 表 T-109（`_source/display-words.json` ほか）・`fig-icons.svg` | 行を消す。絵の原稿は実装の段で刷り直す |
| `S-99i`（対話欄の見え方） | `_source/settings.json` | 行を消す |
| `UZ-9`（対話欄の重ね順） | 表 T-268（`01-04-requirements.md`） | 行を消す |
| `AG-11`（発話を読める） | 表 T-035 | 行を消す。`AG-6` と `AG-12` の ⑤ から「発話」を外す |
| `AM-6`（`readDialogueMessages`）・`AM-18`（`postDialogueMessage`） | 表 T-107（`_source/agent-api-members.json`） | 行を消す |
| `AV-12`（`AgentDialogueMessageOutcome`）・`AV-13`（`DialogueMessage`） | 表 T-400（同） | 行を消す。`AV-14` の `messages` と `mark` の発話の番号を消す |
| 状態機械の対話欄の行 | `_source/state-machines.json` | 行を消す |
| 公開名 `postDialogueMessage`・`DialogueMessage` ほか | `_source/published-entries.json`・`_source/components.json` | 名を消す |
| `UC-013` の手順 2 の「画面上の対話欄」と注 | `01-04-requirements.md` | 「AI のアプリの会話で」に書き換え、注 3 行を消す |
| `CHN-14` の「発話の通知」 | 表（`01-04-requirements.md`） | 語を外す |

## 2. 影響

```
仕様の他の行     AG-12 の ① 〜 ⑧ → ① 〜 ⑨（⑨ = 保存）。④ の 1 対 1 は崩さない（保存は MCP だけの鍵）
                 AG-2・AG-6・AG-10 の文、表 T-230 の RD-1・RD-2、表 T-233・表 T-234 の行
生成物           tbl-agent-api-members.md・tbl-document-commands.md・tbl-notice-reasons.md・tbl-glossary.md・
                 tbl-settings.md・tbl-state-machines.md・tbl-published-entries.md・tbl-row-id-prefixes.md・図の原稿
実装（α の後）   取次: 鍵の読み・保存・締め切り・2 つ目の資源・入力の形の刷り方（generate_agent_api.py:105、
                 generate_document_commands.py:638 / :694）・英語の説明。ページ: AM-3・AM-9・AM-10・AM-25・AM-28・
                 AV-3・AV-14・切断の通知・QN-17、対話欄のコードを消す。束: 拡張の設定 2 つ（build_relay_bundle.mjs）
試験             cr-613・cr-614・cr-765・cr-791 の期待が変わる。新しい試験は別の体が仕様だけから書く
形式の版         上げない（FR-073）。Agent API の版は上げる（AG-1、③ の 16）
毎フレームの仕事 無い —— 読み手と取次の変更で、描く道は変わらない（切断の通知と QN-17 は既にある箱を使う）
```

## 3. 測ったこと

- 取次の 22 の道具を 2026-10-18 に Claude Code から呼んだ結果: `previous-project-result/70-alpha-hands-on/relay-tools-2026-10-18.md`（✅ 17・❌ 5）。表の 3 つの窓の人と AI の対照: 同 `relay-table-windows-2026-10-18.md`。
- 大きさ（空白を詰めた JSON の字数を Python で数えた）: 雛形の `readDocument` 1,383,668 字、持ち越しを除いて 220,379 字、タスクの要点 9 欄で 55,486 字。空の語の検索 1,000 行で 418,200 字。
- 命令の数: `mcp-tool-descriptions.json` の `applyCommands` の `commands.items.oneOf` の長さ 91（Python で数えた）。
- 当てる前の測り（2026-10-18、`.claude/skills/spec-graph-check/`）: `induced.py AG-2 AG-6 AG-11 AG-12 FR-066 FR-150 UC-013 RD-1 RD-2 U-44 IC-18 S-99i UZ-9 T-230 T-233 T-234` —— 種 16 のうち 16、種の中の辺 21、閉路 3（`FR-066`・`IC-18`・`S-99i`・`UC-013`・`UZ-9` の 5 つ、`AG-11`↔`AG-6`、`AG-12`↔`FR-150`）。どの閉路も 1 つの片の中で 1 度に書く。`impact.py AG-12 FR-066 AG-11` —— `AG-12` を指す所 43、`FR-066` を指す要求 4 件・所 26、`AG-11` を指す要求 3 件・所 19。

## 4. 利用者の実物の手順（実装の後に確かめる）

1. 取次を入れ直し、AI のアプリの拡張の設定に「保存先のフォルダ」（既定 `ドキュメント\GRS`）と「上書きの前に確認する」（既定オン）が出る。
2. AI に「`計画.json` で保存して」と頼む → `ドキュメント\GRS\計画.json` ができ、AI は所と大きさを答える。もう 1 度頼む → AI が「上書きしてよいですか？」と問い、「いいよ」で上書きされ `計画.json.bak` が残る。
3. AI に「ファイルを開かせて」と頼む → 画面に「AI がファイルを開くよう求めています」と「開く…」「やめる」。「開く…」でファイルを選ぶ窓が開く。
4. AI に取り込みを頼み、3 択に答えずに 1 分待つ → AI はすぐ「画面の問いに答えてください」と言い、時間切れにならない。
5. 取次を止める → 画面に「GRS Relay との接続が切れました」。
6. AI に「担当リストを読んで」「検索で今月が期限のものを」と頼む → 画面と同じ絞り込みの行が返る。
7. 対話欄はどこにも無い。

## 5. 片の進み（調整役の優先の順）

| 片 | 中身 | 裁定・不具合 | 状態 |
| --- | --- | --- | --- |
| ① | 人を待つ呼び出しはすぐ返る（`AM-8`・`AV-15`）・取次の締め切り 45 秒と `relayTimedOut`・`waitMs` の頭打ち 40 秒・切断の通知 `RS-90` | `JDG-2764`・`DFC-3252` | 仕様・実装・試験（`tests/contract/cr-796-s1-*` 2 本 26 件、別の体）を当てた |
| ② | 落ちない入力の形と命令の資源・`showOnlyTasks` の解除は `[]` | `DFC-3257`・`DFC-3251` | 仕様・実装（生成器 2 本と取次の 2 つ目の資源 `_source/grs-commands.schema.json`）・試験（`tests/contract/cr-796-s2-*`、別の体）を当てた。⚠️ 目録は 91 の命令すべてを持つ —— `CM-76`（人だけ、未実装で断る）も載せた。外すなら原稿の `agent` の欄で外せる |
| ③ | 英語の説明 | `JDG-2768`・`DFC-3131` | 仕様（原稿に道具 22・引数・命令 91 の `en`、設計 3.1）・実装（生成器 3 本が `en` から刷り、日本語と行 ID を断る）・試験（`tests/contract/cr-796-s3-*`、別の体）を当てた。⚠️ `request` の中の `expectedStamp`・`commands` の鍵の説明は無い（表 T-400 の原稿に `en` が無い。`request` の説明が 2 つを名指す） |
| ④ | A'（`readDocument` の 2 つの引数・`readSearchRows` のページと列のフィルタ・拒否と知らせは文書を持たない） | `JDG-2765`・`JDG-2766`・`DFC-3253`・`DFC-3255` | 当てた（`21f47b05`）。試験 `tests/contract/cr-796-s4-*`（別の体） |
| ④' | 遅延診断レポートと担当リストの表の読み手 `readTableRows`（`AM-28`、`AV-18`〜`AV-20`） | `JDG-2766`・`DFC-3254`・`DFC-3256` | 当てた（`11403b91`）。試験 `tests/contract/cr-796-s4b-*`（別の体）。セルは英語の画面の値、`RQ-3` はいつも選んでいない値 |
| ⑤ | 取り消し・やり直し（`AM-9`・`AM-10` に `expectedStamp`、自分の段だけ、`notOwnStep`、表 T-230 の `RD-1`・`RD-2`、`AG-10`） | `DFC-3250` | 当てた（`414b843c`）。試験 `tests/contract/cr-796-s5-*`（別の体）。履歴の段に書き手を持たせた |
| ⑥ | 対話の機能を消す | `JDG-2767` | 仕様と src から消した —— `FR-066`・`U-44`・`IC-18`・`S-99i`・`S-453`・`S-454`・`S-456`・`UZ-9`・`AG-11`・`AM-6`・`AM-18`・`AV-12`・`AV-13`、コンポーネント `PostDialogueMessage`・`DialogueLog`（`CP-16`・`CP-33`・`PI-16`・`PI-33`・`UF-26`・`UF-56`・`UF-68`・`UF-111`・`FT-5`）。退役の席は `retired.py`。表のウィンドウの名は表の見え方の鍵から導く（`ScreenState` → `DocumentSettings` の辺） |
| ⑦ | ファイルを開く・保存する | `JDG-2760`〜`JDG-2763` | 未 —— 調整役の指示で別の席が当てる（この席のコンテキストが尽きるため）。仕様の直しの原稿は引き継ぎの手引きに添えた |

### 片 ① の利用者の手順（1〜3 手）

1. GRS Relay につないだ状態で、AI に「（何かのファイルを）取り込んで」と頼む → 画面に「ファイルを開く」の 3 択が出て、AI はすぐ「画面の問いに答えてください」と返す（時間切れにならない）。
2. 3 択で「追加する」を選ぶ → AI に「変わった？」と聞くと、変わったことを読める。
3. GRS Relay の拡張を無効にする（または Claude を閉じる）→ 画面に「GRS Relay との接続が切れました」。

### 片 ② の利用者の手順（1〜3 手）

1. Claude Code（Code タブ）の新しい会話で「GRS Relay の applyCommands で使える命令の種類を挙げて」と聞く → 命令の名が挙がる（前は空だった）。
2. AI に「検索で 2 つのタスクだけ表示して」→「解除して」と頼む → 帯が出て、解除で消える。

### 片 ③ の利用者の手順（1〜3 手）

1. Code タブか Chat タブの新しい会話で「GRS Relay の道具の説明を 3 つ読み上げて」と頼む → 英語の説明が返り、`AG-2` のような番号が入っていない。

### 片 ④ の利用者の手順（1〜3 手）

1. AI に「全体の目次を見せて」と頼む → 100 行ずつ返り、続きがあると言う（受け口を超えない）。
2. 検索パネルのタスクの表で列のフィルタを掛け、AI に「検索の表を読んで」と頼む → 画面と同じ行が同じ順で返る。
3. AI に「このタスクだけ詳しく」と頼む → そのタスクの欄だけが返る（MSPDI の持ち越しの欄は付かない）。

### 片 ④' の利用者の手順（1〜3 手）

1. 遅延診断を出し、AI に「遅延診断レポートの表を読んで」と頼む → 画面のレポートと同じ行が返る。
2. 担当リストで列のフィルタを掛け、AI に「担当リストを読んで」と頼む → 画面と同じ担当の行が同じ順で返る。

### 片 ⑤ の利用者の手順（1〜3 手）

1. AI に何か 1 つ直させ（例: タスク名）、続けて「今のを取り消して」と頼む → 元に戻る。「やり直して」で再び直る。
2. 自分で何か 1 つ直してから、AI に「取り消して」と頼む → AI は「人の編集なので戻せない」と答え、あなたの編集は残る。

### 片 ⑥ の利用者の手順（1〜3 手）

1. 画面のどこにも対話欄の入口が無く、ヘルプにも対話欄の説明が無い。
2. AI に「GRS Relay の道具の一覧を見せて」と頼む → `readDialogueMessages`・`postDialogueMessage` が無い（21 の道具）。
