# CR-771 —— コードの公開名と、配る物の名を慣習にそろえる（ブラウザの保存の鍵・MCP の取次の表示名・公開名の揺れ・名付けの家の流儀を規則に書く。棚卸しと当てる計画）

> 状態: ⭐ **当てた** —— 2026-10-15、当てる体が `b8fe0d50`（`CR-751`〜`CR-770` の着地の後）の上に当てた（変更履歴は 4.82）。手順: 一意の名は名ごとの全文一致の表で 1 回置き換え（7 節の台本は木に入れず、使い捨ての台本で当てた。新しい名が同じファイルに既にある 7 か所は読んで確かめた）、一般の語の欄（`accepted`・`readStamp`・`ordered`・`valid`・`undecided`・`shown`・`many`・`timeIn` ほか）は宣言を替えて `tsc` が指す所だけを替え、型の付かない試験の固定データは読んで直した。原稿（`published-entries.json`・`agent-api-members.json`・`state-machines.json`・`settings.json`・`verification.json` とその形 `verification.schema.json`、要求 `DC-1`・`DC-3`）を替えて `npm run gen` で刷った。`dist` は作り直したが含めない。
> ⭐ `66d989c6` から当てた日の木 `b8fe0d50` までの差（`git grep -w -c`、`src`・`tests`・`tools`・`docs/spec` の原稿と本文の行）: ① 2.3 の `Pc` の 4 名は `CR-755` が替えた —— `PcRegionChoice`・`regionForPc`・`readPcRegion` は 0 になり、`standardTimeZoneKeyForPc`（14 行）・`readPcStandardTimeZone`（11 行）が生まれ、`PcTimeZone` 3 → 4・`withPcTimeZone` 2 のまま。本書はこの 4 つを `System` に替えた（`SystemTimeZone`・`standardTimeZoneKeyForSystem`・`readSystemStandardTimeZone`・`withSystemTimeZone`）。② `AgentUtteranceOutcome` 5 → 11 行（`CR-765` が原稿 `agent-api-members.json` に刷った —— 8.1 のとおりその原稿へ当てた）。③ 2.3 の `DelayFixType` の族は `CR-769` が `DelayFixKind` に替え済み。④ ほかの名はほぼ同じ（`pressRowOf` 31 → 32・`date1` 44 → 45・`groupIdOf` 23 → 33・`groupIds` 76 → 81・`selectedGroupIds` 46 → 47）。⑤ `CR-769` が残したコードだけの名（調整役の指示で本書が持つ）: 保存される名を写す名を同じ語にした —— `…GroupId(s)` 25 名（`heldGroupId` → `heldTaskGroupId`・`selectedGroupIds` → `selectedTaskGroupIds`・`groupIdOf` → `taskGroupIdOf`・`groupIds` → `taskGroupIds` ほか）、刻の `seenScheduleUpdatedUtc`・`incomingScheduleUpdatedUtc`・`outgoingScheduleUpdatedUtc`・`updatedUtc` → `…At`、`UseCase` の答え `ApplyOutcome`・`ReplaceOutcome` の `accepted` → `ok`、`PlanInput`・`ReplacementInput` の `readStamp` → `expectedStamp`（エージェント API の口の引数も同じ名）。
> 当てる体が決めたこと（11 節に問いを足さない）: ① 2.4 の `date1`・`date2` の役の名は、仕様 `DC-3` の呼び名「カーソル A ／ カーソル B」から取った —— 値 `cursorADate`・`cursorBDate`、追う側 `'cursorA'`・`'cursorB'`、状態 `placingCursorA`・`placingCursorB`、効果 `storeFixedCursorADate`・`storeFixedCursorBDate`、座標 `cursorAX`・`cursorBX`（2 本は対称で、置く順が入れ替わるので「先・後」は役にならない）。② `pressRowOf` は `pressedRowOf` にした。`dismissKeyOf` は変えない —— dismiss key は dismiss button と同じ名詞の複合語で、同じ族の 5 名（`dismissKey`・`noticeDismissKey`・DOM の属性ほか）と組である。③ `hasNo…` の 3 つは肯定形にし、状態機械の見張りは `not` を付けて同じ条件のまま（`settleKeyPressed` が運ぶ値も肯定形 —— 送る側は `hasSurfaceOrConfirmation: false` を送る）。④ 2.4 の最後の行（裸の真偽の欄）は数え直して 9 を替えた: `ZoomEntranceEnds` の 4 → `isTimeOutAtEnd` ほか、`EntityRows.many` → `hasManyRows`（生成器 `tools/generate_entity_types.py` も）、`Selection.ordered` → `isOrdered`、`ResumeGeometry.valid`・`undecided` → `isValid`・`isUndecided`、`DrawnRow.shown` → `isShown`。真偽を返す裸の関数 8 も `is`／`has` にした（`isStartupAgentApiEnabled`・`isSameRecord`・`isLaidBelow`・`isPlaceNamed`・`isLeavingTaskGroupArea`・`hasUndecidedResume`・`isPasteRefusedFor`・`isScheduleFilterChanging`）。⑤ 2.4 の「2 つのファイルが別々に宣言する同じ名」は `b8fe0d50` で 16（17 から `CR-769` の後に 1 減）。違う関数の同じ名を分けた（`fault` → `jsonFault`・`mspdiFault`、`edit-task-group.ts` の `withSchedule` → `withScheduleParts`）。⚠️ 残した 14: 型の別名 11（`ColumnFilter`・`DelayFixTables` ほか）は、ほかのコンポーネントの公開の形から型を引いて名付けた写しである —— 規則 `LR-2` と表 T-064 が、公開されていない名を部品の外から読むことを許さないので、1 か所に寄せると公開の名を足す仕様の変更になる。`taskGroupRankById`（`Entity` の写しは表 T-064 に無い）と `NOT_STORED_SEARCH_PANEL_FONT_SIZES`（生成の区画）も同じ理由で残した。同じ式の写し `dayFromSerial`（`Entity` の公開名）は、`Adapter` の写しを消すと `input-command-translator.ts` のコメントの割合が検査 55 の 10% を越える（コードの 5 行だけが減る）ので残した。⑥ 2.5 の `tests/usecase/` → `tests/use-case/` は、置き場の表（`verification.json`）の形 `^tests/[a-z]+/$` を `^tests/[a-z]+(-[a-z]+)*/$` に広げた。⑦ `PND-110` の答え（`JDG-300`、一括の 100 件のうち 1 件）が頭 `grsched.` を選んでいた —— 本書の 0.2 の裁定の鎖に無かった。`JDG-2241` の下で `X-1` のとおり `grs.` に替え、`JDG-300` の行には覆された印を付けていない（台帳の行の持ち主でないため。調整役への問い）。
> 起草の状態（当てる前の記録）: **下書き（当てていない）**。2026-10-15、作業木 `66d989c6` の上で棚卸しを測り、当てる計画を書いた。`docs/spec`・`src`・`tests`・`tools`・規則には何も当てていない。台帳は動かしていない —— 利用者の指示は調整役の席が `JDG-2241` として既に記録した（本席は一度 `JDG-2245` として二重に記録し、調整役の指摘で取り下げた。帯の `JDG-2245`〜`JDG-2254` は使っていない）。
> ID の帯: 番号 `CR-771` を調整役から受けた（`CR-769`〜`CR-771` の帯）。`66d989c6` の木で `CR-771` を名乗る所は 0 件だった。新しい行 ID・`DFC`・`PND` は使わない。
> 当てる裁定: `JDG-2241`（英語の慣習に従う）。覆す裁定: 無い。
> 棚卸しの全体: `docs/review/english-naming-survey-2026-10-15.md` の 2.5 節（`src` の公開の宣言 1,790・型の欄 2,106 を数えた。番号 SF1〜SF17 は棚卸しの番号）と 2.6 節（配る物）。保存される名とエージェント API は `CR-769`、画面の語は `CR-770`。
> 測った木: `66d989c6`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 決めの土台

| 何 | 中身 | 本書での扱い |
|---|---|---|
| `JDG-2241` | 「英語の慣習に従う。 他の用語もそうしてきたはず。 もし慣習と違うなら、しかるべきタイミングで直すぞ。  まだ公開前なので今がラストチャンスぐらいに思え。」 | ⭐ **公開の後に直すと壊れるもの**（利用者のブラウザに残る保存の鍵、配る物の名）を先に直す。コードだけの名は公開の後に直しても利用者のファイルも連携も壊さない —— 安いものだけを直し、高いものは規則に書いて残す |
| 表 T-006a（`W-1`〜`W-11`）と、規則 03 の 1 節（仕様が名の正、綴りまで写す） | コードの名の記法 | 測ると記法は守られている（棚卸しの 2.5 の「慣習どおり」）。本書は語の選びの揺れだけを扱う |
| 慣習の出どころ | Google TypeScript Style Guide、TypeScript Handbook、typescript-eslint の naming-convention、.NET Framework Design Guidelines の名付けの節、Swift API Design Guidelines、Clean Code（Martin）2 章 | 本書と棚卸しにだけ書く |

### 0.2 裁定の鎖（rulings.md を「命名」「名付け」「Of」「empty」「Pc」「grsched」「GRS relay」「mcpb」「ファイル名」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1010`〜`JDG-1014` | MCP の取次は `grs-relay.mcpb` で配る | 名 `grs-relay` は変えない。表示名の大文字だけ（2.2） |
| `JDG-1732` | `sample-schedule/Three-Year Product Plan.json` を書き直さない | 名を変えない（X-3） |
| （保留）ja／en の接尾辞の揃え | 記憶にある保留「仕様の和英の接尾辞 -ja／-en と兄弟のフォルダ —— 利用者の合図を待つ」 | 本書は触れない（X-4） |
| 名付けの流儀（`xOf`）を決めた裁定 | 0 件 | 規則に書く（E-01） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-5` / `GL-007`（AI と協働する）—— MCP の客の画面に出る取次の表示名が、ほかの取次と同じ書き方になる（2.2）。
- 書き手の側（どの `CH-` も前へ進めない —— 次の書き手が名を選ぶときの土台である。そう書く）: 家の流儀（純粋な関数は名詞句、作用は動詞）を規則に書き、公開の後のレビューが「揺れ」と読み違えないようにする。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（唯一の正）—— 仕様の名にコードが 2 つ目の名を与える所: `showPlan`・`showActual`（仕様は `planVisible`・`actualVisible`、SF7）、`AgentUtteranceOutcome`（仕様は `DialogueMessage`、SF1）。規則 03 の 1 節「別名を与えない」に反する。
- `R2.21`（1 つの仕事は 1 か所）—— 同じ公開名を 2 つのファイルが別々に宣言する 17（SF16）。
- 規則 03 の 1 節の「綴りまで写す」—— 表 T-064 の名を替えるものは、仕様とコードを同じ段で替える。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 公開の後に直すと壊れるもの（ブラウザの保存の鍵の頭、2.1）を本書のいちばん先に置く | `JDG-2241` の「今がラストチャンス」 | 無い |
| X-2 | `xOf` の名付け（純粋な関数は値の名詞句、作用は動詞、真偽は `is`／`has`／`can`）は直さず、規則 03 に家の流儀として書く | 測ると一貫している: `getX` 0、`…Of` 215、作用を持つ（`void` を返す）関数 34 のすべてが動詞で始まる。Swift API Design Guidelines（副作用の無いものは名詞句、あるものは動詞句）とコマンドとクエリの分離（Meyer）が同じ分け方。⚠️ .NET と Clean Code は「メソッドは動詞」と言う —— 違う慣習のうち、木が一貫して守る方を書き留める | 規則に 1 節足す |
| X-3 | `sample-schedule/Three-Year Product Plan.json` の名（空白と大文字）は変えない | `JDG-1732` が名指す。題がそのまま見本の名になっている | 見本の XML（`sample-large-erp-program.en.xml` ほか）と書き方が違うまま |
| X-4 | ja／en の接尾辞（`prompt-en.md`・`image-to-grs-json-prompt.en.md`・`sample-*.en.xml` の 3 通り）は触れない | 利用者の合図を待つ保留がある | 3 通りのまま |
| X-5 | 保存の面の媒体型 `image/x-grs-svg`・`text/x-grs-html`・`text/x-grs-markdown` は変えない | RFC 6838 の 3.4 は `x-` も `x.` も勧めないが、私的な型を名乗るほかの形も登録が要る。型は保存の面の中で拡張子を絞るためだけに使い、利用者のファイルにも連携にも残らない。`CR-768` がこの型を表 T-024 に載せる —— 本書は名を変えない | 無い |
| X-6 | コードだけの名で、直すと試験の数百か所が動くもの（`emptyScreenSession` は試験 395 か所）は直さず、規則に書く | 公開の後に直しても壊れない（X-1 の裏） | 揺れの一部が残る |

---

## 1. 範囲 —— 行き先

| 何 | 変える所 | 2 節 |
|---|---|---|
| ブラウザの保存の鍵の頭 | `src` のウェブ保存の鍵の頭の定数（`S-99`・`S-99a`〜`S-99c` の鍵を組み立てる 1 か所。仕様は頭の綴りを持たない —— `git grep -c grsched docs/spec` は 0） | 2.1 |
| MCP の取次の表示名 | `tools/build_relay_bundle.mjs`・`src/framework/mcp-relay-server/mcp-relay-server.ts` | 2.2 |
| 表 T-064 の名とコード | `docs/spec/_source/published-entries.json`・`src` | 2.3 |
| コードだけの名 | `src`・`tests` | 2.4 |
| 規則 | `docs/development-rules/03-implementation.md` の 2 節 | E-01 |
| 試験のフォルダ | `tests/usecase/` → `tests/use-case/` | 2.5 |

数: 要求 ±0。表 ±0。表 T-064 のメンバ ±0（名の綴りだけ）。`（MUST）` ±0。

---

## 2. 名前の対応表

### 2.1 ⭐ 公開の前に直す —— ブラウザの保存の鍵（利用者のブラウザに残る）

| 旧 | 新 | 理由 |
|---|---|---|
| 頭 `grsched.`（`grsched.screenLanguage`・`grsched.openedBy`・`grsched.agentApiEnabled`・`grsched.unlockPasswordSha256`） | 頭 `grs.` | 製品の頭は木のほかの所がすべて `grs`（`grs-relay`・DOM の `grs-export-fit`・`grs-files`・媒体型の `x-grs-`）。1 つの製品に 1 つの頭（逆ドメイン名でない短い頭は Web Storage で普通の形）。⚠️ 公開の後に替えると、利用者が選んだ画面の言語と AI の窓口の入切が消える |

### 2.2 MCP の取次の表示名

| 旧 | 新 | 理由 |
|---|---|---|
| `display_name: 'GRS relay'` | `'GRS Relay'` | 名前は Title Case（`JDG-1862` の規則と同じ —— 製品名の後の語も頭を大きく書く） |
| `name: 'grs-relay'`・`grs-relay.mcpb` | 変えない | kebab-case のファイル名と包みの名は慣習どおり |

### 2.3 表 T-064 に載る名（仕様とコードを同じ段で）

| 旧 | 新 | 慣習 | 数（`git grep -w`、行） |
|---|---|---|---|
| `PcTimeZone`・`PcRegionChoice`・`regionForPc`・`readPcRegion` | `SystemTimeZone`・`SystemRegionChoice`・`regionForSystem`・`readSystemRegion` | 略語を避ける（.NET）。JavaScript はこれを system の時刻帯と呼ぶ（`Intl.DateTimeFormat().resolvedOptions().timeZone`）。PC は機器の名で、設定の名ではない | `src` 20・試験 9・仕様 2 |
| `planDatesSpanYears`・`holdsWorkingDayUnlikeMinutesPerDay` | `isPlanSpanningYears`・`isWorkingDayUnlikeMinutesPerDay` | 真偽を返す関数は `is` で始める（typescript-eslint の naming-convention の真偽の例、.NET） | 小さい |
| `hasNoCalendarDraftRefusal`・`hasNoSurfaceOrConfirmation`・`hasNoUnsettledEntry` | 肯定形（`hasCalendarDraftRefusal` ほか、呼び手の条件を裏返す） | .NET「肯定の句で名付ける（CanSeek、CantSeek でなく）」 | 仕様 12 |
| `pressRowOf`・`dismissKeyOf` | 当てる体が名ごとに読む（動詞で始まり命令と読める `…Of`） | X-2 の流儀 | 小さい |
| `DelayFixType`・`DELAY_FIX_TYPES` | `CR-769` の 2.6 が替える | — | — |

### 2.4 コードだけの名（安いものだけ）

| 旧 | 新 | 慣習 | 数 |
|---|---|---|---|
| `GeometryInputs.showPlan`・`showActual` | `planVisible`・`actualVisible` | 仕様の名に別名を与えない（規則 03 の 1 節） | `src` 10・試験 2 |
| `AgentUtteranceOutcome` | `AgentDialogueMessageOutcome` | 同上（仕様の名は `DialogueMessage`）。⚠️ `CR-765` がこの型を原稿から刷る —— その着地の後に原稿へ当てる | `src` 5 |
| `depLinkParts`・`depLinkPartsPinned` | `dependencyLinkParts…` | 略語を避ける。`dependencyLinkParts` は既にある | `src` 6・試験 1 |
| `date1`・`date2`・`date1X`・`date2X`（2 連カーソル） | 役の名（当てる体が仕様の 2 連カーソルの語から選ぶ） | Clean Code 2 章（数の並びの名を避ける） | `src` 19・試験 19・仕様 6 |
| `onAppHeaderHeightPx`・`onCommandPaletteBandPx`・`onTaskGroupControlsHeightPx` | `on…Measured` | DOM と React の `on` ＋ 出来事（`onChange`・`onResize`） | 小さい |
| 2 つのファイルが別々に宣言する同じ名 17（`fault`・`withSchedule`・`dayFromSerial`・`taskGroupRankById` ほか） | 同じ意味の型は 1 か所で宣言して再び出す。違う関数は違う名 | 1 つの名に 1 つのもの | 17 |
| 真偽の型の欄で意味の曖昧な裸の名（`ZoomEntranceEnds.timeIn` ほか、`Selection.ordered`・`DrawnRow.shown`） | `is…`（コードの中だけの真偽、`CR-769` の問い 1 の B の後の `W-10`） | Clean Code「誤った情報を避ける」 | 当てる体が数え直す |

### 2.5 試験のファイルとフォルダ

| 旧 | 新 | 理由 | 数 |
|---|---|---|---|
| `tests/usecase/`（15 ファイル） | `tests/use-case/` | `src/use-case/` と同じ語幹（`W-11`） | 外から名指す行 184（51 ファイル） |
| `tests/contract` の `.contract.test.ts` の中の綴り（332 のうち 135） | 変えない | フォルダが既に contract と言うので意味は無いが、試験の名を動かす費用に見合わない（X-6） | — |

---

## 3. 数（`66d989c6`。棚卸しの 2.5・2.6）

- `src` の公開の宣言 1,790（異なる名 1,772）、再び出す 547、公開の型の欄 2,106。記法（PascalCase・camelCase・CONSTANT_CASE）、頭字語の書き方（`Uid`・`Html`・`Json` を語として書く —— 大文字の頭字語を camelCase の中に書く所 0）、略語（`Cnt`・`Btn`・`Ctx`・`Cfg`・`Idx`・`Num`・`Tmp` 0）、ハンガリアン・`_` の頭・`I` の頭 0 —— すべて慣習どおり。
- 本書が替える名: 2.1 の 4、2.2 の 1、2.3 の約 12、2.4 の約 35、2.5 のフォルダ 1。触れる行 約 400（`git grep -w` の行の和。2.4 の欄の名は当てる体が数え直す）。

---

## 4. ⛔ 変えない語

- `xOf` の名付け（X-2）、`emptyScreenSession` ほかの `empty…` の値（X-6。規則 E-01 に「初期の値は camelCase の `empty…`」と書く）、判別の欄 `kind`（MCP と DOM が決めた所の `type` を除く）。
- MSPDI の名・プラットフォームの API の名（`innerHTML`・`toJSON`・`createSVGPoint` ほか）。
- 見本の名（X-3）、ja／en の接尾辞（X-4）、媒体型（X-5）。

---

## 4.5 規則に足す文

<!-- EDIT id=E-01 file=docs/development-rules/03-implementation.md -->
2 節（仕様が名を持たないときの名付け）の末尾に足す。

```
### ⭐ 名付けの家の流儀（JDG-2241、CR-771）

| 何 | 形 | 例 |
|---|---|---|
| 値を計算するだけの関数（純粋） | 値の名詞句 —— `xOf`・`xFromY`・`withX`。⛔ `getX` と書かない | `colorOf`・`geometryFromLayout` |
| 作用を持つ関数 | 動詞で始める | `applyCommands`・`focusTask` |
| 真偽を返す関数・コードの中だけの真偽の欄 | `is`／`has`／`can` で始め、肯定の句にする | `isDelayed`。⛔ `hasNo…` |
| 保存される真偽・外へ出す真偽 | 表 T-006a の `W-10` に従う | — |
| 初期の空の値（モジュールの定数） | `empty…` の camelCase（試験が数百か所で引くので CONSTANT_CASE にしない） | `emptyScreenSession` |
| 種類を言う名 | `Kind`。`Type` は MSPDI の要素名を写す所と、外の API が決めた所だけ | `shapeKind`・`linkType` |

出どころ: 名詞句と動詞の分け方は Swift API Design Guidelines とコマンドとクエリの分離（Meyer）。真偽の頭は typescript-eslint の naming-convention の例と .NET Framework Design Guidelines。
```

---

## 5. 継ぎ目（コード）

- 2.1: ウェブ保存の鍵は `src` の 1 か所（頭の定数）が組み立てる。旧い鍵を読み替えない（稼働前、`JDG-1663`）。⚠️ 鍵を消す道（GRS の初期化 `IC-139`）が頭で鍵を探す —— 同じ定数を読むので一緒に替わる。
- 2.2: `.mcpb` を作り直す（`npm run build:relay`）。
- 2.3: 表 T-064 の名は検査 `check-published-members.py` が仕様とコードを突き合わせる —— 同じ段で替える。
- 毎フレームの経路: 名だけが変わる。

---

## 6. グラフ

行 ID を変えない。表 T-064 の名の升だけが替わる。当てる体は `impact.py PI-1` を当てる日の木で測る。

---

## 7. 機械の手順

`CR-769` の 7 節の道具（名ごとの表の `tools/rename/apply_names.py` と、一般の語の `rename_symbols.mjs`）をそのまま使う。本書の名はほとんどが一意の名（(a) の種）。`date1`・`date2`・型の欄の裸の名は (b) の種（型でたどる）。

---

## 8. 段・時機・見積もり

### 8.1 当てる時機

| 群 | 触れ合う変更要求（`66d989c6` で本文を数えた） | 時機 |
|---|---|---|
| 2.1 保存の鍵の頭 | 無い | ⭐ いつでも当ててよい —— 公開の前に必ず |
| 2.2 表示名 | 無い | いつでも |
| 2.3 `Pc` の名 | `CR-755`（`PcTimeZone`・`regionForPc` を名指す） | `CR-755` の着地の後 |
| 2.4 `AgentUtteranceOutcome` | `CR-765` | `CR-765` の着地の後、その原稿へ |
| 2.4・2.5 ほか | 無い | `CR-769` の凍結の後（同じ道具を使う）。⛔ `CR-769` と同じ凍結に束ねない（`JDG-1735`） |
| 触れない（`f6796d70` で測った） | `CR-763`・`CR-764` | — |

### 8.2 段

| 段 | 何をする | 見込み |
|---|---|---|
| 1 | 2.1・2.2（小さい。凍結は要らない） | 0.5 h |
| 2 | 2.3（仕様とコード）・E-01 | 1〜1.5 h |
| 3 | 2.4・2.5、check.sh、`vitest`（錠の下） | 1.5〜2 h |

- 計 約 3〜4 h。

---

## 9. 仕様の外で直すもの

- 規則 03（E-01）。基準値のファイルに旧い名があれば名だけを替える（調整役、`JDG-520`）。

---

## 10. ⛔ この変更でやらないこと

- 保存の鍵（`GRS JSON`）・エージェント API・命令の名を変えない（`CR-769`）。画面の語を変えない（`CR-770`）。
- 振る舞いを変えない。

---

## 11. 利用者に問うこと

無い —— 本書の名はどれも利用者の画面にもファイルにも出ない（2.1 のブラウザの鍵と 2.2 の表示名を除く。この 2 つは製品の頭と Title Case の既にある決まりに合わせるだけ）。⚠️ `CR-769` の問い 1 の答えで、2.4 の最後の行（コードの中の真偽の欄に `is` を付ける）の扱いが決まる。

---

## 12. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `rulings.md` | 動かさない（`JDG-2241` は調整役の席が記録した） |
| `changelog.md` | 当てる体が番号を受ける |

---

## 13. 測り方の再現

```
# the tree: worktree at 66d989c6
# exported declarations: strip comments, strings and regex literals from every `git ls-files 'src/*.ts'`,
#   then match ^export (declare|default|async|abstract)? (function|const|let|var|class|interface|type|enum) Name
#   -> 1790 (the same regex over the raw text also gives 1790)
# members: the top-level {...} body of every exported interface / class / type X = {...} -> 2106
# T-064: docs/spec/_source/published-entries.json members -> 480 (473 distinct), all present in src
# places a name touches: the counter in docs/review/english-naming-survey-2026-10-15.md section 6
# web storage prefix: grep -rn "WEB_STORAGE_KEY_PREFIX" src  -> 'grsched.'
# relay display name: grep -n "display_name" tools/build_relay_bundle.mjs -> 'GRS relay'
```

---

## 14. 利用者の実物の手順と見積り

- 実物の手順（調整役へ送る。`JDG-1340`）: (1) 新しい `dist/index.html` で画面の言語を英語にし、開き直しても英語のままであること（保存の鍵の頭が替わっても読み書きが合う）。(2) MCP の客の取次の一覧に「GRS Relay」と出ること。
- 見積り: 約 3〜4 h（8.2）。
