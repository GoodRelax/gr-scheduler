# `Agent API` のメンバ — 表 T-107・表 T-400

**UID**: DOC-TBL-AGENT-API-MEMBERS
**Version**: 0.1

> ⛔ 本書は生成物である。  
> 手で直さない —— 直しても次の `npm run gen` で消える。
> **`Agent API` のメンバと呼び方の唯一の正は `_source/agent-api-members.json` である。**  
> 本書はそれを `_source/agent_api_members_json_to_md.py` が印字したものである。
> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。

規則は 表 T-035 と、「正」の列が指す要求が持つ。  
本書は 表 T-107 と 表 T-400 の全行を印字する。

**`Agent API` は 1 つの面に 22 のメンバをフラットに並べる。**  
用途別に分けない理由は Chapter 5.2 が持つ（`R2.5`）。  
いまの版は 5 である（`AM-1` が返す値）。  
呼び方を変える変更は版を上げる（表 T-035 の `AG-1`）。  
⭐ **呼び方（引数の名・型・意味と戻り値）は本表と 表 T-400 が持つ** —— コードの `AgentApi` の型と、MCP の道具の入力の形は本表の原稿から生成し、手で書かない。  
境界値は Chapter 6.1 が持つ。

**表 T-107 — `Agent API` のメンバ**

| 行 ID | 群 | 確定名 | 品詞と純粋性 | 引数 | 戻り値 | 何を担うか | 正 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AM-1 | 版 | `agentApiVersion` | プロパティ・`semi-pure-a` | — | `number` | `Agent API` の版。<br>呼ぶ側が最初に読む | 表 T-035 の `AG-1` |
| AM-2 | 版 | `schemaVersion` | プロパティ・`semi-pure-a` | — | `string` | この版の `GRS` が読み書きする文書の形式の版。<br>いま開いている文書が持つ値は `AM-3` で読む | 表 T-052 の `DR-4` |
| AM-3 | 読む | `readDocument` | 動詞＋目的語・`semi-pure-b` | — | `Document`（表 T-064 の `PI-34`） | 文書ぜんたいの凍結された複製。<br>ルートの 3 群すべてを含む | 表 T-035 の `AG-4` ／ 表 T-052 の `DR-1` |
| AM-4 | 読む | `readStamp` | 動詞＋目的語・`semi-pure-b` | — | `DocumentStamp`（表 T-064 の `PI-3`） | 文書の刻印。<br>楽観ロックの照合に用いる | 表 T-035 の `AG-2` ／ `FR-063` |
| AM-5 | 読む | `readSelection` | 動詞＋目的語・`semi-pure-b` | — | `Selection`（表 T-064 の `PI-32`） | いま選ばれている対象。<br>選んだ順序を保つ | 表 T-023c の `SL-1` / `SL-7b` |
| AM-6 | 読む | `readDialogueMessages` | 動詞＋目的語・`semi-pure-b` | — | `readonly DialogueMessage[]`（`AV-13`） | 人が確定した発話。<br>文書には保存されない | 表 T-035 の `AG-11` ／ `FR-066` |
| AM-25 | 読む | `readSearchRows` | 動詞＋目的語・`semi-pure-b` | `word`: `string` —— 探す語 | `SearchRows`（表 T-064 の `PI-1`、表 T-331） | 語を 1 つ受け、検索パネルの 2 つの表と同じ行を返す。<br>列のフィルタと並べ替えは当てない。<br>パネルを読みも変えもしない。<br>⭐ ステータス（`SQ-5`）は、遅延診断を出していないときの値（`PM-4` か 表 T-019a の状態）で返す —— 診断の値（表 T-315 の `DG-1` 〜 `DG-3`）は `AM-19` の 表 T-317 の `DX-8` が返す（`FR-134` の、AI へ渡す道は 1 つ）。<br>⚠️ 遅延診断はしない —— ステータスの遅れは、予定の日が基準日を過ぎたタスク・マイルストーン（表 T-021b）を返すだけであり、信用できない・要修正 (?)・ボトルネック・ボトルネック経路 (!!) は入らない。<br>正確な遅延の解析には遅延診断（`readDelayDiagnostics`、`AM-19`）が要る | `FR-151` の 表 T-330 の `SV-4` ／ 表 T-331 |
| AM-26 | 読む | `readShownTasks` | 動詞＋目的語・`semi-pure-b` | — | `AgentShownTasks`（`AV-8`） | いま日程表に描いているタスクの `uid` の並び（`01-04-requirements.md` の 表 T-353 の `TV-1` の積 —— スケジュールフィルタを掛けた表が 1 つも無ければ `null`）と、スケジュールフィルタを掛けている表の名（`searchPanel`・`delayDiagnosticsReport`・`resourceList`）の並びを返す。<br>返すだけで、画面も文書も書かない | `FR-151` の 表 T-353 |
| AM-19 | 読む | `readDelayDiagnostics` | 動詞＋目的語・`semi-pure-b` | — | `AgentDelayDiagnostics`（`AV-9`） | 遅延診断のレポート（`FR-134` の 表 T-317）を凍結した値で返す。<br>画面の値も文書も書かない。<br>正確な遅延の解析（信用できない値・ボトルネック・ボトルネック経路）はこの命令が返す。<br>`readSearchRows`（`AM-25`）の遅れは基準日との比べだけである | `FR-134` ／ 表 T-035 の `AG-4` |
| AM-7 | 書く | `applyCommands` | 動詞＋目的語・`non-pure` | `request`: `AgentWriteRequest`（`AV-1`） —— 照合する刻印と命令の束 | `AgentWriteOutcome`（`AV-2`） | 一括の書き込み。<br>原子的に適用し、受理したか否かを値で返す | `FR-028` ／ 表 T-035 の `AG-3` / `AG-9a` |
| AM-8 | 書く | `importDocument` | 動詞＋目的語・`non-pure` | `source`: `AgentImportSource`（`AV-7`） —— 取り込む文書 | `Promise<AgentWriteOutcome>`（`AV-2`） | 取り込みと合流 | `FR-087` / `FR-022` ／ 表 T-032a |
| AM-9 | 履歴 | `undoEdit` | 動詞＋目的語・`non-pure` | — | `AgentWriteOutcome`（`AV-2`） | 履歴を戻す | `FR-031` ／ 表 T-035 の `AG-10` |
| AM-10 | 履歴 | `redoEdit` | 動詞＋目的語・`non-pure` | — | `AgentWriteOutcome`（`AV-2`） | 履歴を進める | `FR-031` |
| AM-11 | 出す | `exportJson` | 動詞＋目的語・`semi-pure-b` | — | `AgentExport<string>`（`AV-5`） | `GRS JSON` を値で返す | 表 T-024 の `IO-2` ／ `FR-024` ／ 表 T-035 の `AG-7` |
| AM-12 | 出す | `exportMspdi` | 動詞＋目的語・`semi-pure-b` | — | `AgentExport<string>`（`AV-5`） | 交換形式を値で返す | 表 T-024 の `IO-1` ／ `FR-021` |
| AM-13 | 出す | `exportSvg` | 動詞＋目的語・`semi-pure-b` | — | `AgentExport<string>`（`AV-5`） | 書き出す絵（`FR-080`、文書が全体表示時の期間を固定しているときは 表 T-241 の `IX-12`）を値で返す | 表 T-024 の `IO-3` ／ `FR-080` |
| AM-14 | 出す | `exportPng` | 動詞＋目的語・`semi-pure-b` | — | `Promise<AgentExport<Uint8Array>>`（`AV-5`） | 画像を値で返す。<br>失敗も値で返す | 表 T-024 の `IO-4` ／ `FR-025` ／ 表 T-035 の `AG-8` |
| AM-15 | 出す | `exportEmbeddedHtml` | 動詞＋目的語・`semi-pure-b` | — | `Promise<AgentExport<string>>`（`AV-5`） | 本体と文書を合わせた 1 つの `.html` を値で返す | 表 T-024 の `IO-7` ／ `FR-067` |
| AM-16 | 見せる | `focusTask` | 動詞＋目的語・`non-pure` | `taskUid`: `number` —— 見せるタスクの `uid` | `AgentFocusOutcome`（`AV-6`） | 指定したタスクが載るタスクグループと祖先を展開し、見える位置へ表示を寄せる | `FR-151` の 表 T-332 の `SJ-9` |
| AM-27 | 見せる | `showOnlyTasks` | 動詞＋目的語・`non-pure` | `taskUids`: `readonly number[]` か `null` —— 表示にするタスクの `uid` の並び（`null` は解除） | `AgentWriteOutcome`（`AV-2`） | `uid` の並びを受けて、検索の表の表示の列を、並びのタスクを「表示」・ほかのすべてを「非表示」に置き換え、検索の表のスケジュールフィルタを掛ける。<br>`null` を受けたら検索の表のスケジュールフィルタを解除する（表示の列の値は残す）。<br>検索パネルが出ていなければ最小化で出してから掛ける —— スケジュールフィルタはウィンドウと一緒に生きる（`TV-8`）。<br>掛けたら帯（`U-67`）が出る —— 人の画面に何が起きたかが残る。<br>展開は `TV-6` のとおり —— 検索の表のスケジュールフィルタを掛けているあいだに「非表示」から「表示」に戻った行のタスクだけを展開する。<br>⚠️ 遅延診断レポートの表と担当リストの表のスケジュールフィルタには触れない。<br>出す命令は `setTableView`（表 T-108 の `CM-92`）1 つであり、未保存の編集（`FR-100`）で取り消しの 1 段である（`FR-031` の 表 T-027 の `UN-20`） | `FR-151` の 表 T-353 の `TV-5` 〜 `TV-8` |
| AM-17 | 待つ | `watchChanges` | 動詞＋目的語・`non-pure` | `receive`: `AgentChangeReceiver`（`AV-10`） —— 変更を受け取る手<br>⚠️ MCP だけの鍵 `waitMs`: `number` —— 待つ長さ（ミリ秒） —— 切れたら「まだ無い」を値で返す（`AG-12` の ⑤） | `AgentWatch`（`AV-11`） | 自分以外が確定した変更と発話を待つ | 表 T-035 の `AG-6` / `AG-11` |
| AM-18 | 話す | `postDialogueMessage` | 動詞＋目的語・`non-pure` | `text`: `string` —— 置く発話 | `AgentDialogueMessageOutcome`（`AV-12`） | AI が確定した発話を対話欄へ置く | `FR-066` ／ 表 T-035 の `AG-11` |

⚠️ **見せ方の群を読む面も、書く面も置かない。**  
見せ方の群は文書の一部であり（表 T-052 の `DR-1` / `DR-3`）、**読むのは `AM-3`、書くのは `AM-7` である。**  
別の面を立てると、同じものへの道が 2 本になる（1.9）。

⚠️ **クリップボードと `localStorage` は本表に無い。**  
理由は表 T-024 の `IO-5` / `IO-6` の用途にある ——前者は保存と復旧、後者は他のアプリへ画像を渡す経路であり、どちらも値で受け取る相手を持たない。

本表は、表 T-107 の引数と戻り値が名指す型のうち、表 T-064 に行を持たないものの欄を持つ。  
欄の型が名指すほかの型は、型の後ろの括弧が指す行が持つ。  
`AV-13` と `AV-14` は、ほかのコンポーネント（`DialogueLog`・`NotifyChangeWatchers`）が宣言する型である —— 欄の名は本表と同じとする。

**表 T-400 — `Agent API` が受け渡す値の型**

| 行 ID | 型の名 | 欄 | 正 |
| --- | --- | --- | --- |
| AV-1 | `AgentWriteRequest` | `expectedStamp`: `DocumentStamp`（表 T-064 の `PI-3`） —— 呼ぶ側が最後に読んだ刻印 —— 今の刻印と 1 つでも違えば束ごと拒む（`AG-2`）<br>`commands`: `readonly DocumentCommand[]`（表 T-064 の `PI-8`、表 T-108） —— 命令の束 —— 束の単位で原子的に適用する（`AG-3`） | `AM-7` ／ 表 T-035 の `AG-2` / `AG-3` |
| AV-2 | `AgentWriteOutcome` | **受理したとき**<br>　　`ok`: `true` —— 受理した<br>　　`stamp`: `DocumentStamp`（表 T-064 の `PI-3`） —— 適用した後の刻印<br>　　`hasMovedSchedule`: `boolean` —— 日程データの群を動かしたか（動かせば日程データの群の刻が進む —— `FR-063`）<br>**拒んだとき**<br>　　`ok`: `false` —— 拒んだ<br>　　`refusal`: `AgentRefusal`（`AV-3`） —— 拒否の値 | 表 T-035 の `AG-3` / `AG-9a` |
| AV-3 | `AgentRefusal` | `target`: `string` —— 拒まれた対象（メンバの行 ID か、拒んだ規則の在りか）<br>`reason`: `AgentRefusalReason`（`AV-4`） —— 理由の区分<br>`stamp`: `DocumentStamp`（表 T-064 の `PI-3`） —— 今の刻印<br>`document`: `Document` か `null`（表 T-064 の `PI-34`） —— 刻印が食い違って拒んだとき（`staleStamp`）だけ今の文書の凍結された複製、ほかは `null`（`AG-2`）<br>`refusals`: `readonly Refusal[]`（表 T-064 の `PI-9`） —— 拒まれた命令ごとの拒否（`AG-3`）<br>`message`: `string` —— 人が読む説明 | 表 T-035 の `AG-9a` / `AG-2` |
| AV-4 | `AgentRefusalReason` | 次のどれか 1 つ —— ⛔ 1 つの値へ潰さない（`AG-9a`）<br>`'staleStamp'` —— 渡した刻印が今の刻印と違う（`AG-2`）<br>`'gestureInFlight'` —— 人の操作が途中である<br>`'editingInPlace'` —— 人がその場で編集している途中である<br>`'questionAsked'` —— 人に問いを出している途中である<br>`'deliveringNotices'` —— 変更の知らせを配っている途中である（Chapter 5.5）<br>`'commandRefused'` —— 束の命令のどれかが拒まれた（`AG-3`）<br>`'unknownTask'` —— 指した `uid` のタスクが無い<br>`'notDrawnYet'` —— まだ 1 度も描いていない<br>`'tooTall'` —— 絵が書き出せる高さに収まらない（`FR-025`）<br>`'rasterFailed'` —— 画像にできなかった（`AG-8`）<br>`'embeddedHtmlFailed'` —— 単一 `.html` を組めなかった<br>`'notAvailable'` —— このページの結線に、そのメンバが使うコンポーネントが無い<br>`'malformedRequest'` —— 呼び方の形が違う（`FR-028`）<br>`CodecRefusalReason`（表 T-233） —— 取り込みの読みが拒んだ理由（表 T-233 の行 ID）<br>`InvariantRow`（表 T-064 の `PI-9`） —— 取り込みの検証（`FR-023`）が拒んだ不変条件（Chapter 6.1 の 表 T-220 の行 ID） | 表 T-035 の `AG-9a` ／ `FR-028` ／ 表 T-233 ／ 表 T-220 |
| AV-5 | `AgentExport<TValue>` | **書き出せたとき**<br>　　`ok`: `true` —— 書き出せた<br>　　`value`: `TValue` —— 書き出した値<br>**拒んだとき**<br>　　`ok`: `false` —— 拒んだ<br>　　`refusal`: `AgentRefusal`（`AV-3`） —— 拒否の値 | 表 T-035 の `AG-7` / `AG-8` / `AG-9a` |
| AV-6 | `AgentFocusOutcome` | **受理したとき**<br>　　`ok`: `true` —— 受理した<br>　　`stamp`: `DocumentStamp`（表 T-064 の `PI-3`） —— 適用した後の刻印<br>　　`hasMovedSchedule`: `boolean` —— 日程データの群を動かしたか<br>　　`isScrolled`: `boolean` —— 見える位置へ表示を寄せたか（ピン止めしたタスクグループに阻まれたら偽）<br>**拒んだとき**<br>　　`ok`: `false` —— 拒んだ<br>　　`refusal`: `AgentRefusal`（`AV-3`） —— 拒否の値 | `AM-16` ／ `FR-151` の 表 T-332 の `SJ-9` |
| AV-7 | `AgentImportSource` | 次の 3 つの形のどれか —— どの形も同じ読み方で読み、同じものを拒む<br>`Document`（表 T-064 の `PI-34`） —— 文書そのもの<br>**包んだ文書**<br>　　`document`: `Document`（表 T-064 の `PI-34`） —— 文書<br>**文字列**<br>　　`text`: `string` —— `GRS JSON` の文字列 | `AM-8` ／ `FR-087` / `FR-022` |
| AV-8 | `AgentShownTasks` | `drawnTaskUids`: `readonly number[]` か `null` —— いま日程表に描いているタスクの `uid` の並び —— スケジュールフィルタを掛けた表が 1 つも無ければ `null`（`TV-1`）<br>`tables`: `readonly VisibilityTable[]`（`FR-151` の 表 T-353） —— スケジュールフィルタを掛けている表の名の並び | `AM-26` ／ `FR-151` の 表 T-353 |
| AV-9 | `AgentDelayDiagnostics` | 遅延診断のレポート `DelayDiagnosticsReport`（表 T-064 の `PI-1`、表 T-317） の欄のすべてに、次の 2 つを足す<br>`fixProposals`: `readonly DelayFixRow[]`（表 T-064 の `PI-1`） —— 修正案の行（`DX-11`）<br>`fixLog`: `readonly DelayFixLogRow[]`（表 T-064 の `PI-1`） —— 修正の記録の行（`DX-12`） | `AM-19` ／ `FR-134` の 表 T-317 |
| AV-10 | `AgentChangeReceiver` | 知らせを 1 つずつ受け取る手（何も返さない）<br>`notice`: `ChangeNotice`（`AV-14`） —— 届いた知らせ | `AM-17` ／ 表 T-035 の `AG-6` |
| AV-11 | `AgentWatch` | `hasReplacedEarlierWatch`: `boolean` —— 先に購読していた手を置き換えたか<br>`stopWatching()`: `boolean` —— 購読をやめ、やめた購読があったかを返す | `AM-17` ／ 表 T-035 の `AG-6` |
| AV-12 | `AgentDialogueMessageOutcome` | **置いたとき**<br>　　`ok`: `true` —— 置いた<br>　　`message`: `DialogueMessage`（`AV-13`） —— 置いた発話<br>**拒んだとき**<br>　　`ok`: `false` —— 拒んだ<br>　　`refusal`: `AgentRefusal`（`AV-3`） —— 拒否の値 | `AM-18` ／ 表 T-035 の `AG-11` / `AG-9a` |
| AV-13 | `DialogueMessage` | `sequence`: `number` —— 発話の通し番号 —— 刻印とは別に数える（`AG-11`）<br>`author`: `string` —— 発話を確定した書き手の名<br>`text`: `string` —— 発話の本文<br>`settledAt`: `string` —— 確定した時刻 | 表 T-035 の `AG-11` ／ `FR-066` |
| AV-14 | `ChangeNotice` | `watcher`: `string` —— 知らせを受ける書き手の名<br>`document`: `Document` か `null`（表 T-064 の `PI-34`） —— 自分以外が日程データを変えていれば今の文書の凍結された複製、変えていなければ `null`（`AG-6`）<br>`messages`: `readonly DialogueMessage[]`（`AV-13`） —— まだ受け取っていない、自分以外の発話（`AG-11`）<br>`mark`: `WatcherMark`（表 T-035 の `AG-6`） —— どこまで受け取ったかの印（日程データの群の刻と発話の通し番号） | 表 T-035 の `AG-6` / `AG-11` |
