# データ構造設計 — 入口と JSON 実例（引継ぎ Step 3 成果物）

- 日付: 2026-07-26
- 目的: 次期開発が**どの文書をどの順で読めばよいか**を示し、**GRS JSON の具体形**を 1 つの実例で示す。
- 位置づけ: **入口**。詳細は各文書に委ねる。

---

## 1. 読む順（6 文書）

| 順 | 文書 | 何が書いてあるか | 性質 |
|:--:|---|---|---|
| **1** | `../vendor/mspdi-pitfalls-ja.md` | **MSPDI 実装の落とし穴**（XSD 実測） | **製品に依存しない**。最優先 |
| 2 | `../vendor/mspdi-enums-ja.md` | enum 全数（53 要素 / 535 値） | 同上。実装時に必携 |
| 3 | `../vendor/mspdi-core-tree.md` / `mspdi-tables.md` | MSPDI の構造・全 29 テーブルの責務 | MSPDI 自体の理解 |
| 4 | `grs-mspdi-field-ledger-ja.md` | **全要素の取捨選択**（Own/Consume/Reconstruct/Carry/Drop） | 仕分けの実例。枠組み自体が再利用できる |
| **5** | **`grs-native-erd-ja.md`** | **GRS の構成（確定版）**。ERD・識別子・マージ・Carry ストア | **データ構造の正** |
| 6 | `grs-data-model-ja.md` §8 | **設計判断の変遷**（何を試し、なぜ変えたか） | 却下案とその理由 |

> **迷ったら 5 を見る。** 1〜4 は前提知識、6 は経緯。

---

## 2. 全体像（14 エンティティ）

```
MSPDI 由来（Own / Consume）          GRS 新設（‼️ 非 export）
├─ Project                          ├─ TaskGroup          行の器（入れ子 ≤Lv5）
├─ Task ★                           ├─ TaskGroupMember    どの行に載るか＋段
├─ Dependency ★                     ├─ TaskVisual         名称ラベル位置・色・字形・線幅
├─ Calendar / WeekDay / Exception   ├─ TaskOrigin         出自（マージ判定用）
└─ Resource / Assignment（軽量）    ├─ Comment            引出し四角/折れ線の注記（§5.8）
                                    └─ HighlightBox       角丸の囲み枠（§5.8）
                                    documentSettings      文書の表示設定（§5.7-1 で確定）
                                                          ※ズーム/スクロール/テーマ/言語/透かしは
                                                            読む人の環境なので保存しない

★ ＋ TaskGroup / TaskGroupMember = コア 4（これが無いとモデルが成立しない）
```

**2 軸**（最重要）:

- **軸A: WBS 階層** = `Task.wbs_parent_uid`（MSPDI `OutlineLevel` 対応・**export する**）
- **軸B: マルチバー** = `TaskGroup` ＋ `TaskGroupMember`（**GRS 専用・非 export**）

行に入れ直しても WBS は動かない。`OutlineLevel` を `TaskGroup` から算出しないので、2 つの木があってもドリフトしない。

---

## 3. GRS JSON の実例

「製品A」行に、企画◆・設計バー・検証◆を横並べした最小例。

```json
{
  "schemaVersion": "grs-1",
  "project": {
    "id": "PRJ-0001",
    "name": "2026年度 開発日程",
    "startDate": "2026-04-01T00:00:00",
    "statusDate": "2026-07-26T00:00:00",
    "minutesPerDay": 480,
    "weekStartDay": 0,
    "calendarId": 1,
    "uidHighWaterMark": 4,
    "carry": { "CurrencyCode": "JPY", "SaveVersion": "12" }
  },

  "documentSettings": {
    "stackDirection": "up", "importSeq": 1,
    "planActualDisplay": "both", "planActualStyle": "overlap",
    "assigneeVisible": true, "progressVisible": true,
    "todayLineVisible": true, "dualCursor": null, "cursorGuideMode": "none",
    "gridDateLinesVisible": true, "gridGroupLinesVisible": true,
    "progressLineVisible": false, "progressLineColor": "#b03030",
    "baselineVisible": false,
    "fontScale": "M",
    "exportCanvas": { "width": 1600, "height": 900 }
  },

  "tasks": [
    {
      "uid": 1,
      "wbsParentUid": null, "wbsOrder": 0,
      "name": "製品A",
      "start": "2026-04-01T09:00:00", "finish": "2027-03-31T17:00:00",
      "milestone": false,
      "actualStart": null, "actualFinish": null, "progressRatio": 0.15,
      "deadline": null, "stop": null, "resume": null, "notes": null,
      "fadeInDays": null, "fadeOutDays": null,
      "calendarId": 1,
      "carry": {}
    },
    {
      "uid": 2,
      "wbsParentUid": 1, "wbsOrder": 0,
      "name": "企画完了",
      "start": "2026-05-15T17:00:00", "finish": "2026-05-15T17:00:00",
      "milestone": true,
      "actualStart": "2026-05-15T17:00:00", "actualFinish": "2026-05-15T17:00:00",
      "progressRatio": 1.0,
      "deadline": null, "stop": null, "resume": null, "notes": null,
      "fadeInDays": null, "fadeOutDays": null,
      "calendarId": null,
      "carry": { "Type": "1", "DurationFormat": "7" }
    },
    {
      "uid": 3,
      "wbsParentUid": 1, "wbsOrder": 1,
      "name": "詳細設計",
      "start": "2026-05-16T09:00:00", "finish": "2026-09-30T17:00:00",
      "milestone": false,
      "actualStart": "2026-05-20T09:00:00", "actualFinish": null,
      "progressRatio": 0.4,
      "deadline": "2026-10-15T17:00:00", "stop": null, "resume": null,
      "notes": "外注分を含む",
      "fadeInDays": null, "fadeOutDays": 5,
      "calendarId": null,
      "carry": { "Cost": "0", "FixedCost": "0" }
    },
    {
      "uid": 4,
      "wbsParentUid": 1, "wbsOrder": 2,
      "name": "検証完了",
      "start": "2026-12-20T17:00:00", "finish": "2026-12-20T17:00:00",
      "milestone": true,
      "actualStart": null, "actualFinish": null, "progressRatio": 0,
      "deadline": null, "stop": null, "resume": null, "notes": null,
      "fadeInDays": null, "fadeOutDays": null,
      "calendarId": null,
      "carry": {}
    }
  ],

  "dependencies": [
    { "successorUid": 3, "predecessorUid": 2, "linkType": 1, "lag": 0, "lagFormat": 7 },
    { "successorUid": 4, "predecessorUid": 3, "linkType": 1, "lag": 0, "lagFormat": 7 }
  ],

  "taskGroups": [
    { "id": "grp-a", "parentId": null, "label": null, "derivedFromTaskUid": 1, "order": 0,
      "collapsed": false, "color": "#e8eef7", "height": null }
  ],
  "taskGroupMembers": [
    { "groupId": "grp-a", "taskUid": 2, "stackOrder": null },
    { "groupId": "grp-a", "taskUid": 3, "stackOrder": null },
    { "groupId": "grp-a", "taskUid": 4, "stackOrder": null }
  ],

  "taskVisuals": [
    { "taskUid": 2, "nameAnchor": null, "nameAlign": null,
      "iconShapeKind": "diamond", "fillColor": "#4a76c8", "strokeColor": "#2b4a80",
      "lineWeight": "medium", "importance": 0.9, "progressStatus": null },
    { "taskUid": 3, "nameAnchor": null, "nameAlign": null,
      "iconShapeKind": "bar", "fillColor": "#6aa84f", "strokeColor": "#38601f",
      "lineWeight": "medium", "importance": 0.7, "progressStatus": "遅延気味" }
  ],

  "taskOrigins": [
    { "taskUid": 1, "sourceProjectUid": "IQV-2026", "sourceUid": 1,
      "lastSeenImportSeq": 1, "importSessionId": null },
    { "taskUid": 2, "sourceProjectUid": "IQV-2026", "sourceUid": 2,
      "lastSeenImportSeq": 1, "importSessionId": null },
    { "taskUid": 3, "sourceProjectUid": "IQV-2026", "sourceUid": 3,
      "lastSeenImportSeq": 1, "importSessionId": null }
  ],

  "calendars": [
    { "id": 1, "name": "標準", "isBase": true, "baseCalendarId": null,
      "weekDays": [
        { "ordinal": 0, "dayType": 1, "dayWorking": false },
        { "ordinal": 1, "dayType": 2, "dayWorking": true },
        { "ordinal": 6, "dayType": 7, "dayWorking": false }
      ],
      "exceptions": [
        { "ordinal": 0, "name": "元日", "fromDate": "2027-01-01T00:00:00",
          "toDate": "2027-01-01T23:59:59", "dayWorking": false, "type": 9 }
      ]
    }
  ],

  "resources": [
    { "uid": 1, "name": "田中", "type": 1, "isCostResource": false, "calendarId": null,
      "carry": { "MaxUnits": "1", "StandardRate": "0" } }
  ],
  "assignments": [
    { "uid": 1, "taskUid": 3, "resourceUid": 1, "carry": { "Units": "1", "Work": "PT800H0M0S" } }
  ],

  "carryElements": []
}
```

### 実例が示している要点

| 箇所 | 意味 |
|---|---|
| `"actualFinish": null` | **キーを省略せず `null` を明示**。「元ファイルに要素が無かった」を意図として残す（§5.5d） |
| `"uid": 4` が **`taskOrigins` に無い** | **GRS 生まれ**（`TaskOrigin` の行が無い＝出自なし）。マージで**照合対象にならない**（§5.4） |
| `"wbsParentUid": 1` が 3 件 | **軸A**（WBS）。企画・設計・検証は「製品A」の子 |
| `taskGroupMembers` が 3 件で同じ `groupId` | **軸B**（マルチバー）。**1 行に 3 つのタスク**が載る＝製品の核 |
| `"stackOrder": null` | **自動**（milestone 優先 → start 昇順 → finish 降順 → uid 昇順）。人が指定した時だけ値が入る |
| `"label": null` ＋ `"derivedFromTaskUid": 1` | **器の名前は uid=1 のタスク名（「製品A」）から導出**。人が改名すると `label` に値が入り導出が止まる（`grs-data-model-ja.md` §7.1-1） |
| `"fadeOutDays": 5` | 終了日の曖昧さ。**MSPDI へは拡張領域で往復**（§5.5f） |
| `"carry": { "Cost": "0", … }` | GRS が解釈しない MSPDI 列。**そのまま書き戻す**（§5.5d） |
| `"exceptions"[].type: 9` | **`Type` を必ず読む**。9=繰返しなし → `fromDate`/`toDate` が実日付（§5.5b） |
| `"ordinal"` | 弱エンティティ（`weekDays`/`exceptions`）の**原順序と Carry の付着キー** |
| `"uidHighWaterMark": 4` | 削除済みを含む最大 UID。**採番は常に +1**（`max` ではない・§5.3） |

---

## 4. MSPDI へ書き出すときの差

**同じ文書でも JSON と MSPDI では姿が違う**。境界で変換する。

| | GRS JSON | MSPDI export |
|---|---|---|
| 値が無い列 | **`null` を明示** | **要素を書かない** |
| `Reconstruct` 列（`ID`/`OutlineLevel`/`OutlineNumber`/`Summary`） | **持たない** | **その場で算出して書く** |
| `progressRatio` | 0〜1 で持つ | `PercentComplete` に **×100 して書く**（import では **読む＝Own**。読まないと進捗を失う） |
| `Duration` | **未編集は受け取った値を保持 / 編集済は持たない** | **未編集はそのまま書き戻す / 編集済は `finish − start` で算出**（§3-4 #3/#4） |
| `ActualDuration` / `RemainingDuration` | 不透明に保持 | **未編集はそのまま / 編集済は再計算して上書き**（同上） |
| `Work` 系（工数） | 不透明に保持 | **常にそのまま書き戻す**（GRS は工数を直せない。編集時はユーザーへ通知） |
| `TaskGroup` / `TaskGroupMember` / `TaskVisual` / `TaskOrigin` / `documentSettings` | 持つ | **書かない**（GRS 専用） |
| `fadeInDays` / `fadeOutDays` / `stop` / `resume` / `importance` / `progressStatus` | Task の列 | **`ExtendedAttribute`**（定義＋値の 2 層）で書く。<br>※ `stop`/`resume` は **MSPDI の同名要素へ写さない**（意味がずれる。§3-4 #8） |
| 見た目（色 / 字形 / 線幅 / `nameAnchor` / `nameAlign`） | 持つ | **書かない**（相手は解釈できない。§4-1） |
| `carry` / `carryElements` | 不透明に保持 | **原順序で書き戻す** |

---

## 5. 次期への申し送り

1. **`TaskVisual` の列はまだ確定していない可能性がある**。今回は MSPDI 交換に集中したため、GRS 固有の視覚属性は Step 2 の再点検で後から足した（`fillColor`/`strokeColor` 分離・`lineWeight`・`progressStatus`）。**UI 設計と突き合わせて再点検すること**。
2. **【決着】テキスト列は `name` ＋ `notes` の 2 つだけ**（ユーザー確定 2026-07-26）。現行仕様はテキスト列を 5 つ持っていた（略称・正式名称・説明・備考・メモ）が、MSPDI 側は `Name` と `Notes` の 2 つしかない。**`abbrev`（略称）は廃止し、アイコンに描くラベルは `Task.name` を使う**。`fullName` / `description` / `remarks` も廃止。詳細は `handover-property-mspdi-mapping-ja.md`。
3. **Carry ストアの実装が Drop=0 の前提**。「入口で自己検証・出口で往復同一性」を CI に入れること（§5.5d）。
