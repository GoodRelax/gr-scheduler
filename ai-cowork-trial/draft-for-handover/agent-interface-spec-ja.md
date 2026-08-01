---
type: Working Note
title: Agent Interface 仕様（ドラフト）
description: 機械向けの口の契約。関数・エンベロープ・コマンド・拒否理由・監視・起動時投入。決定ではない。
tags: [agent-interface, spec]
phase: proof-of-concept
status: draft
---
# Agent Interface 仕様（ドラフト）

- 日付: 2026-08-02
- 対応する要求: `agent-interface-requirements-ja.md`
- **これは提案である。決定ではない。**
- **記法は `handover/03-ui-naming/handover-ui-parts-ja.md` §1-2 に従う**
  （型 PascalCase / 関数・JSON プロパティ camelCase / 文字列判別値 kebab-case / 略語を識別子に入れない）。

---

## 0. 名前

| 面 | 名前 | 備考 |
|---|---|---|
| ページ上の公開点 | `window.grScheduler` | **短縮別名を作らない**（1 概念 1 語） |
| 文書のトップレベル | `revisionStamp` / `conversation` | §2 |
| 版数 | `agentApiVersion` | semver |

> `grs` のような略語を識別子にしない（`handover-ui-parts-ja.md` §1-2「略語は識別子に入れない」）。
> **散文では GRS と書いてよい。**

---

## 1. 関数

```ts
/** 機械向けの口。人間向け UI と同じ文書・同じ履歴・同じ検証を通る。 */
interface GrSchedulerAgentInterface {
  /** 契約の版。呼ぶ側は最初にこれを読む。major が違えば呼ばない。 */
  readonly agentApiVersion: string;
  /** 文書スキーマの版（既存の schemaVersion と同じ値）。 */
  readonly schemaVersion: string;

  // --- 読む（副作用なし・不変コピーを返す）
  readDocument(): GrSchedulerDocument;
  readRevision(): number;
  readSelectedTaskUids(): number[];
  readViewState(): ViewState;

  // --- 書く（UI と同じ履歴を通る。1 回の呼び出し = Undo 1 段）
  applyCommands(request: ApplyRequest): ApplyOutcome;
  loadDocument(request: LoadRequest): ApplyOutcome;

  // --- 履歴（コマンドではない。履歴そのものを動かすため）
  undo(steps?: number): ApplyOutcome;
  redo(steps?: number): ApplyOutcome;

  // --- 出す（保存ダイアログを出さずに値を返す）
  exportJson(): string;
  exportMspdi(): string;
  exportSvg(): string;
  exportPng(): Promise<Blob>;

  // --- 見せる（人間に「ここを見て」と促す）
  setViewState(request: ViewStateRequest): ApplyOutcome;
  focusTask(taskUid: number): ApplyOutcome;

  // --- 待つ
  watchChanges(request: WatchRequest): StopWatching;
}

type StopWatching = () => void;
```

**`undo` / `redo` をコマンドにしない理由**: コマンドは「文書をどう変えるか」を表す。
履歴を動かす操作をその中に混ぜると、**原子的な一括適用（`A-5`）の巻き戻し対象に履歴操作が入る**。
別の口に分ける。

---

## 2. 文書に足すもの

**既存の構造（`handover/02-data-model/grs-native-erd-ja.md`）は変えない。**
トップレベルに 2 つ足すだけである。

```jsonc
{
  "schemaVersion": "grs-1",

  "revisionStamp": {
    "revision": 104,
    "lastEditedBy": "agent",
    "updatedAt": "2026-08-02T13:24:51.117Z",
    "agentApiVersion": "1.0.0"
  },

  "conversation": [
    {
      "entrySeq": 1,
      "writtenBy": "human",
      "messageText": "検証フェーズを 2 週間後ろにずらせる?",
      "atRevision": 45,
      "writtenAt": "2026-08-02T13:10:02.418Z"
    }
  ],

  "project": { },
  "documentSettings": { },
  "tasks": [ ]
}
```

### 2-1. `revisionStamp`

| プロパティ | 型 | 意味 |
|---|---|---|
| `revision` | integer | **あらゆる確定で 1 増える。** 減らない。飛ばさない |
| `lastEditedBy` | `"human"` \| `"agent"` | **最後に確定させたのは誰か。** 監視の判定に使う（`A-11`） |
| `updatedAt` | ISO 8601 | 最後の確定時刻 |
| `agentApiVersion` | semver | 書いた側の契約の版 |

> ⚠️ **`documentSettings` に入れてはならない。**
> `documentSettings` は「同じ JSON から同じ絵を得るためのもの」であり
> （`handover/02-data-model/grs-document-settings-ja.md` §2）、**`revisionStamp` は絵に影響しない**。
> 混ぜると「全項目を常に書き出す」規約の対象が濁る。

> ⚠️ **MSPDI へは書き出さない。** MSPDI 側に対応する概念がなく、
> Carry（`grs-native-erd-ja.md` §5.5d）へ載せる意味もない。**往復の対象外とする。**

### 2-2. `conversation`

| プロパティ | 型 | 意味 |
|---|---|---|
| `entrySeq` | integer | 発言の連番（`revision` とは別） |
| `writtenBy` | `"human"` \| `"agent"` | 誰の発言か |
| `messageText` | string | 本文。**表示は必ずテキストとして行う**（`innerHTML` 直挿し禁止 ＝ `user-order.md` 62） |
| `atRevision` | integer | **どの版を見て言ったか。** あとから「何を見ての発言か」を辿れる |
| `writtenAt` | ISO 8601 | 発言時刻 |

**`conversation` を持つかどうかは未決**（`OPEN-ITEMS-ja.md` O-6）。持たない選択もありうる。

---

## 3. 書き込みの契約

```ts
interface ApplyRequest {
  /** 呼ぶ側が読んだ版。食い違えば拒否される。人間の UI 操作では省略してよい。 */
  baseRevision?: number;
  /** 誰の変更か。既定は 'agent'。 */
  editedBy?: 'human' | 'agent';
  /** 原子的に適用する。1 つでも拒否されたら全部戻す。 */
  commands: GrSchedulerCommand[];
  /** 同じ往復で発言も残す（A-18 粒度）。 */
  conversationEntry?: { messageText: string };
}

interface ApplyOutcome {
  accepted: boolean;
  /** 適用後（拒否時は現在）の版。呼ぶ側はこれを次の sinceRevision に使う。 */
  revision: number;
  /** 拒否理由。accepted === true のときは無い。 */
  rejectionReason?: RejectionReason;
  /** 拒否が staleBaseRevision のとき、GRS が期待した版。 */
  expectedRevision?: number;
  /** 常に現在の文書（不変コピー）。拒否時も返す — 読み直しの往復を省くため。 */
  document: GrSchedulerDocument;
}

type RejectionReason =
  | 'stale-base-revision'   // baseRevision が現在と違う
  | 'unknown-command'       // 知らない commandName
  | 'invalid-argument'      // 引数の型・値域
  | 'validation-rejected'   // 取込検証で弾いた（user-order.md 62）
  | 'document-locked'       // 読取専用／権限（user-order.md 65-2）
  | 'gesture-in-progress';  // 人間がドラッグ中
```

**拒否のときも文書を返す**のが要点である。トライアルでは拒否 6 回のすべてで、
**返ってきた文書をそのまま使って再送**できた。**読み直しの往復が要らない。**

### 3-1. コマンド

判別は `commandName`（`type` のような無意味な語を使わない）。

```jsonc
{ "commandName": "create-task",
  "wbsParentUid": 1, "wbsOrder": 2, "name": "検証", "start": "...", "finish": "...", "milestone": false }

{ "commandName": "update-task",
  "taskUid": 3, "start": "2026-06-01T09:00:00", "finish": "2026-10-15T17:00:00" }

{ "commandName": "delete-task", "taskUid": 3 }

{ "commandName": "assign-task-to-group",   "taskUid": 3, "groupId": "grp-a", "stackOrder": null }
{ "commandName": "remove-task-from-group", "taskUid": 3, "groupId": "grp-a" }

{ "commandName": "create-task-group", "groupId": "grp-b", "parentId": null,
  "derivedFromTaskUid": 5, "order": 1 }
{ "commandName": "update-task-group", "groupId": "grp-b", "label": "製品B", "collapsed": true }
{ "commandName": "delete-task-group", "groupId": "grp-b" }

{ "commandName": "create-dependency",
  "predecessorUid": 2, "successorUid": 3, "linkType": 1, "lag": 0, "lagFormat": 7 }
{ "commandName": "delete-dependency", "predecessorUid": 2, "successorUid": 3 }

{ "commandName": "update-task-visual",
  "taskUid": 3, "shapeKind": "chevron", "fillColor": "#6aa84f" }

{ "commandName": "update-document-settings",
  "changedSettings": { "assigneeVisible": true, "zoomX": 1.5 } }
```

**規則**:

- コマンド名は kebab-case の文字列判別値（`handover-ui-parts-ja.md` §1-2）。
- 引数のプロパティ名は **`grs-native-erd-ja.md` の属性名と語幹を一致させる**。新語を作らない。
- **一覧はこれで確定ではない。** 実開発で UI の操作割当
  （`handover/03-ui-naming/handover-ui-detail-spec-ja.md` §5）と**1 対 1**に整える。

### 3-2. 適用の順序

1. `baseRevision` を照合。違えば **`stale-base-revision`** で全部拒否。
2. 現在の文書のスナップショットを取る。
3. コマンドを順に検証・適用。**1 つでも失敗したらスナップショットへ戻して拒否。**
4. 全部通ったら Undo 履歴へ **1 段**として積む。
5. `revision` を 1 増やし、`lastEditedBy` と `updatedAt` を書く。
6. `conversationEntry` があれば `conversation` へ足す（**同じ `revision` の中で**）。
7. 監視中の購読者へ通知する。

> **6 が同じ `revision` に入るのは意図である。** 「この変更を、この説明とともに確定した」を
> 1 つの版として残す。トライアルでは分けていたため、`revision` が会話のぶんだけ余分に進んだ
> （104 のうち 42 が会話）。**GRS では 1 手 1 版にできる。**

---

## 4. 監視

```ts
interface WatchRequest {
  /** これ以下の版では絶対に呼ばない。必須。 */
  sinceRevision: number;
  /** 自分の変更で起きないようにする。既定は 'agent'。 */
  self?: 'human' | 'agent';
  onChange: (outcome: { revision: number; document: GrSchedulerDocument }) => void;
}
```

**起こす条件**（`A-10` / `A-11`）:

```
revision > sinceRevision  かつ  lastEditedBy !== self
```

> ⚠️ **`sinceRevision` を省略可能にしてはならない。**
> 省略できる設計にすると、**処理済みの状態で即座に起きて、監視を張り直すたびに空振りする**。
> トライアルで実際にビジーループを踏み、必須化して直した（`ai-cowork-trial-findings-ja.md` §3-1）。

**プロセス外（将来の CLI／サーバ）でも意味は同じ**である。
「`sinceRevision` より後に、自分以外が確定するまで返らない」呼び出しを 1 つ用意する。

---

## 5. 起動時の投入

### 5-1. 単一 `.html` への注入（`file://` で唯一成立する経路）

ビルド成果物の `.html` は、**空の入れ口を最初から持つ**。

```html
<script type="application/json" id="grs-boot-document">null</script>
```

**注入する側の規約**:

| # | 規約 | 理由 |
|:--:|---|---|
| 1 | 入れ口は**ちょうど 1 つ**。複数あれば起動を中止して通知する | 曖昧さを残さない |
| 2 | 文字列中の `<` を `\u003c` へ置き換える | **対照実験で確認済み。** 省くと `</script>` がタグを早期に閉じ、**JSON は解析不能になり、残りが HTML として本文に出る**（`OPEN-ITEMS-ja.md` 決着-5） |
| 3 | 解析に失敗したら**無視して空で起動し、通知する**（黙って捨てない） | `security-design.md` §5 と同じ姿勢 |
| 4 | 投入された文書も**信頼できない入力として検証する** | `user-order.md` 62。**注入経路は検証の抜け道にしない** |

> ⚠️ **規約 2 はセキュリティ対策である。** 注入は実質 HTML のテンプレート処理なので、
> **タスク名に markup を仕込んだ文書を渡されると、生成した `.html` に混入する。**
> 「壊れるから」ではなく「**注入されるから**」エスケープする。§6 に再掲。

### 5-2. URL パラメータ（`http(s)` のときだけ）

```
grs.html?documentPath=./schedule.json
```

| # | 規約 |
|:--:|---|
| 1 | **`file://` では機能しない（実測）。** パラメータは読めるが、**取得が拒否される** — 兄弟ファイルへの `fetch` は `TypeError: Failed to fetch`、`XMLHttpRequest` は network error（`OPEN-ITEMS-ja.md` 決着-2）。**UI で理由を通知する** |
| 2 | **同一オリジンの相対パスのみ**。スキーム付き・`//` 始まり・上位ディレクトリへの脱出は拒否 |
| 3 | 取得したものは §5-1 の 4 と同じ検証を通す |

### 5-4. 保存の往復（`file://` でも成立する — 実測）

**`file://` でもファイル保存の口（File System Access API）は使える。**
`isSecureContext` は `true`、`showSaveFilePicker` / `showOpenFilePicker` / `showDirectoryPicker` は
いずれも関数として存在し、実際に呼ぶと**保存ダイアログが開く**
（`OPEN-ITEMS-ja.md` 決着-1。Edge 151 で実測）。

したがって往復は **1 本のパスで閉じられる**。

```
AI がファイルを書く  ->  人間が GRS で開く（開く口でハンドルを得る）
                    ->  人間が編集して保存（同じハンドルへ上書き）
                    ->  AI が同じパスを読み直す
```

**実測で確かめた挙動**（Edge 151 / `file://`。全数は `OPEN-ITEMS-ja.md` 決着-1）:

| 挙動 | 実測 |
|---|---|
| ハンドルを取り、書き込む | **成功** |
| **同じハンドルへの 2 回目以降の書き込み** | **成功。ダイアログは出ない** — 人間の Ctrl+S 相当が邪魔されない |
| ハンドルをリロードまたぎで保持（IndexedDB） | **残る** |
| リロード直後の権限 | **`prompt` に戻る。1 クリックで `granted`** |
| 開いた既存ファイルへの書き戻し | **成功**（読取 → 変更 → 同じファイルへ書き込み） |
| ディスク上の結果 | **同じパスに上書き。` (1)` は作られない** |

**規約**:

| # | 規約 | 理由 |
|:--:|---|---|
| 1 | 開いたときのハンドルを保持し、保存は**同じハンドルへ上書き**する | 2 回目以降はダイアログが出ない（実測）。保存のたびに場所を選ばせない |
| 2 | ハンドルを保持し、**リロードをまたいで復帰させる** | ハンドルは残る（実測）。「編集中のファイル」を覚えていられる |
| 3 | 起動時に**「編集中のファイルへのアクセスを復帰しますか」を出す** | **権限は `prompt` に戻り、1 クリックが必要。省けない** — `file://` の復帰ダイアログに「常に許可」が無い（実測） |
| 4 | ハンドルが無い場合の書き出しは**決定的なファイル名**にする（例: 文書 id ＋ `revision`） | 名前は尊重されるので、**AI は名前で特定できる** |
| 5 | **保存先ディレクトリを指定しようとしない** | 制御できない（決着-3） |
| 6 | **「編集中のファイル」をダウンロードで実現しない** | ダウンロードは上書きされず ` (1)` ` (2)` と増える（決着-3）。**同じ「書き出す」でも経路で挙動が正反対である** |

### 5-3. 起動順序（**未決**）

素直に書けば次の順になるが、**既存のクラッシュ復旧と衝突しうる**。

```
注入された文書 → URL パラメータ → localStorage の自動保存 → 初期テンプレート
```

> ⚠️ `user-order.md` 60 は localStorage への自動保存と**クラッシュ復旧**を要求し、
> `security-design.md` §5 は「破損時はサイレントに破棄せず**復旧確認で通知する**」としている。
> **投入された文書がある場合に復旧確認を出すのか、黙って投入を優先するのかは決まっていない。**
> `OPEN-ITEMS-ja.md` O-7。

---

## 6. 防御（`A-7`）

**API は UI の防御を迂回しない。** 実装時に次を通ることを確認する。

| 防御 | 迂回されると何が起きるか | 既存の正 |
|---|---|---|
| 取込データの厳格な検証 | 注入・URL・`loadDocument` が**検証の抜け道**になる | `user-order.md` 62 / `05-security-a11y/security-design.md` §3 |
| `innerHTML` 直挿しの禁止 | `conversation` の本文と `notes` が**注入点**になる | 同 |
| XXE の無効化 | MSPDI 取込が外部実体を読む | 同 |
| 透かしのパスワード照合 | 透かしを API で外せる。**生パスワードを保存しない**規約も併せて守る | `user-order.md` 62 |
| 編集権限（将来） | 参照専用の `TaskGroup` を API で書き換えられる | `user-order.md` 65-2 |

> **`window` に口を出すこと自体の是非**は未決（`OPEN-ITEMS-ja.md` O-8）。
> 単一 `.html` をオフラインで開く限り同一ページに他人のコードは無いが、
> **「既定で出す」か「明示的に有効化したときだけ出す」か**は決めておく。

---

## 7. 将来の機械連携（`A-16`）

**サーバを立てたときの口は、§1 の関数と 1 対 1 にする。**

| §1 の関数 | 将来の口（名前は 1 対 1 にする） |
|---|---|
| `readDocument` / `readRevision` | 文書の取得 |
| `applyCommands` | 変更の適用 |
| `loadDocument` | 文書の差し替え |
| `watchChanges` | 変更の待受（長い待ち受けとして実装） |
| `exportSvg` / `exportMspdi` / `exportJson` / `exportPng` | 各形式の書き出し |

**名前を変えないこと。** 変えた瞬間、対応表を維持する仕事が発生し、やがてずれる。

> 多人数編集（`user-order.md` 65-1）では、`A-3` の楽観ロックと `A-10` の revision スコープ監視が
> **そのまま土台になる**。2 者で成立した規約を人数だけ増やす形である。
> **ただし競合の解消方針（後勝ち禁止のみ／自動マージ）は未決**（`OPEN-ITEMS-ja.md` O-4）。
