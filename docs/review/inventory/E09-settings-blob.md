# E09 — documentSettings

**担当範囲**: 設定値の塊（`documentSettings`）の**構造**。値ではない。
どの鍵がどの鍵の下に入れ子になるか、配列か、どの群にまとまるか、行 ID（`S-xx`）で仕様書のどの行に対応するか。

---

## 0. 読んだ原典

| # | ファイル | 行数 | 読んだ範囲 |
|:--:|---|--:|---|
| 1 | `previous-project-result/02-data-model/grs-document-settings-ja.md` | 631 | **全文** |
| 2 | `docs/spec/_assets/tbl-settings.md` | 332 | **全文**（値の正） |
| 3 | `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 | **全文**（§5.7 は 1221–1401 行） |
| 4 | `docs/spec/_assets/tbl-glossary.md` | 259 | **全文**（名前の正・突き合わせ用） |
| 5 | `previous-project-result/02-data-model/data-model-entry-ja.md` | 343 | **部分**（76–214 行の JSON 実例と数え方の注記 80–96 行のみ） |
| 6 | `previous-project-result/10-agent-interface/samples/grs-document-with-revision-stamp.json` | 96 | **全文**（JSON 根の兄弟関係の実物） |
| 7 | `docs/spec/01-04-requirements.md` | 3800+ | **部分**（`FR-024` / `FR-039` / `FR-046` / `FR-080` / 表 T-024a / 表 T-032 の該当行のみ） |
| 8 | `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` | 1348 | **部分**（設定値に触れる 415–459 / 555–610 / 1195–1264 行のみ） |
| 9 | `docs/reference/mspdi/mspdi_pj12.xsd` | — | **部分**（`StatusDate` の 1 点のみ・662 行） |

> ⚠️ 5・7・8・9 は**全文を読んでいない**。本書がそれらに基づいて書いた主張は、読んだ行の範囲に限る。

**出典の書き方**: 以下の表の「出典」列はファイル名（basename）と行番号で書く。basename は上表のパスに対応する。

**由来の凡例**: `documentSettings` は **MSPDI に出ない**（`grs-document-settings-ja.md:605`／`grs-native-erd-ja.md:1665`）。
したがって**本書の全行の「由来」は `GRS`**（GRS 固有の新設）であり、**「MSPDI の要素」は全行 `—`** である。
`Own` / `Consume` / `Reconstruct` / `Carry` / `Drop` は 1 行も現れない。**この 2 列は全行で同じ値になるが、指示どおり落とさずに載せる。**

**既定値の書き方**: 既定値・下限・上限の**実値は `tbl-settings.md` が正**なので、本書は**行 ID を指すだけ**にする（二重に持たない）。

---

## 1. `documentSettings` は JSON のどこに座るか

**文書の根の直下に置かれた単一オブジェクトである。配列ではない。**（`grs-native-erd-ja.md:344`）

```
文書の根
├─ schemaVersion            文書の形式の版（FR-024 が載せることを要求）※ documentSettings の中ではない
├─ revisionStamp {…}        Agent API 用の版スタンプ
├─ changeLog [ … ]          変更の理由の履歴
├─ project {…}
├─ documentSettings {…}     ← 本書の担当。トップレベル 81 キーの単一オブジェクト
├─ tasks [ … ]
├─ dependencies [ … ]
├─ taskGroups [ … ]
├─ taskGroupMembers [ … ]
├─ taskVisuals [ … ]
├─ taskOrigins [ … ]
├─ calendars [ … ]
├─ resources [ … ]
├─ assignments [ … ]
└─ carryElements [ … ]
```

出典: `grs-document-with-revision-stamp.json:1-96`（実物）／ `data-model-entry-ja.md:98-158`（実例）。

| 事実 | 内容 | 出典 |
|---|---|---|
| 根の直下の単一オブジェクト | `documentSettings` は `project` / `tasks` と**兄弟**であり、どれの下にも入らない | `grs-document-with-revision-stamp.json:32`／`data-model-entry-ja.md:113` |
| 非 export | MSPDI へ書かない（対応概念が無い） | `grs-native-erd-ja.md:1665`／`data-model-entry-ja.md:331` |
| 常に全項目 | 既定値と一致していても省略しない | `grs-document-settings-ja.md:40-44`／`01-04-requirements.md:2795`（`FR-024`） |
| 知らない鍵は捨てない | 読み込み時、欠けた設定値は既定値で補い、**知らない鍵は保つ** | `01-04-requirements.md:2886`（表 T-024a `OP-6`） |
| 合流時は塊ごと | 設定が衝突したときは**項目ごとに問わず** `documentSettings` 全体へ一括適用 | `01-04-requirements.md:2675`（表 T-032 `MG-12`） |
| PK を持たない | 単一オブジェクトなので鍵を持たない。行の集合ではない | `grs-native-erd-ja.md:344`（ERD に出さない理由） |

---

## 2. 入れ子の深さと群

### 2-1. 深さは 2 段までしか無い

| 深さ | 何があるか | 全数 |
|:--:|---|--:|
| 1（`documentSettings` 直下） | 単純値 79 ＋ 入れ子オブジェクト 2 | **81 キー** |
| 2（入れ子の中） | `shapeHeightOf` の 5 メンバー ＋ `exportCanvas` の 2 メンバー | 7 |
| 3 以上 | **無い** | 0 |

**葉の総数 86**（81 − 2 ＋ 5 ＋ 2）。**自分で数えた**（`data-model-entry-ja.md:113-158` の JSON を機械的に解析した結果：トップレベル 81・葉 86・入れ子オブジェクト 2・`null` 値 1）。
`data-model-entry-ja.md:82-85` も同じ数（81 / 86）を書いており一致する。

### 2-2. 入れ子オブジェクトは 2 つだけ

| 鍵 | 形 | メンバー | 備考 | 出典 |
|---|---|---|---|---|
| `shapeHeightOf` | オブジェクト | `rectangle` / `chevron` / `arrow` / `endpointSpan` / `milestone` | **メンバー名は `shapeKind` の 5 値と一致する**（`tbl-glossary.md:49-53` の `P-11`〜`P-15`） | `data-model-entry-ja.md:119-121`／`tbl-settings.md:61-65` |
| `exportCanvas` | オブジェクト | `width` / `height` | 選べる寸法（A3 横ほか）は**保存しない**。保存するのは解決後の 2 値だけ | `data-model-entry-ja.md:153`／`tbl-settings.md:180` |

**条件つきで 3 つ目になりうるもの**: `dualCursor` は既定 `null` だが、値が入るときは `{ date1, date2 }` の
オブジェクトである（`grs-document-settings-ja.md:247`／`tbl-settings.md:128`）。**実例では `null` なので葉 1 として数えている**。

### 2-3. 配列は 1 つも無い

**唯一あった配列は廃止済みである。** 旧版は `rulerTierPxPerDay = [1, 8]` という 1 キーの配列だったが、
「隣どうしが互いを縛る（Month ≦ Week ≦ Day）のに、配列だとどの要素にどの範囲が掛かるかを書く場所が無い」という理由で
**境目ごとの 3 キーに分けた**（確定 2026-08-01。`grs-document-settings-ja.md:420-425`）。
`tbl-glossary.md:243` も「時間軸のしきい値は 1 つの配列にせず、境目ごとに別のキーとして名づける」と規約化している。

> ⚠️ `planActualGuidePattern`（`S-104`）の値は `2,2` と書かれているだけで、**文字列か配列かは原典から確かめられない。未検証**（`tbl-settings.md:326`）。

### 2-4. 群と JSON の入れ子は**一致しない**（重要）

**群は文書の見出しであって、JSON の入れ子ではない。** 表 T-201 の 9 群も、表 T-202〜T-205 の表そのものも、
JSON 上では**すべて `documentSettings` 直下に平坦に並ぶ**（`data-model-entry-ja.md:113-158` は群の境目を空行で示しているだけで、入れ子にしていない）。

| 表 | 群（表の中の区分） | JSON 上の入れ子 | 一致するか |
|---|---|---|:--:|
| T-201 | タイムルーラー | 平坦（3 キーが直下） | 入れ子なし |
| T-201 | 縦の寸法 | 平坦（9 キーが直下） | 入れ子なし |
| T-201 | **形状の縦幅** | **`shapeHeightOf` オブジェクト** | **一致する（唯一）** |
| T-201 | 依存線 | 平坦（3 キー） | 入れ子なし |
| T-201 | 進捗マーカー | 平坦（9 キー） | 入れ子なし |
| T-201 | ラベル | 平坦（9 キー） | 入れ子なし |
| T-201 | 形状の細部 | 平坦（11 キー） | 入れ子なし |
| T-201 | イナズマ線 | 平坦（`statusDate` 🅿 を除く 2 キー） | 入れ子なし |
| T-201 | ズーム | 平坦（⛔ 3 キーを除く 2 キー） | 入れ子なし |
| T-202 | 表示の切り替えと書式 | 平坦（14 キー） | 入れ子なし |
| T-203 | 画面の状態 | 平坦（9 キー） | 入れ子なし |
| T-204 | 出力 | 平坦（2 キー。ただし `exportCanvas` 自身がオブジェクト） | 群としては入れ子なし |
| T-205 | LOD のしきい値 | 平坦（7 キー） | 入れ子なし |
| T-206 | 保存しないもの | **JSON に現れない** | — |
| T-207 | 透かし（成果物の定数） | **JSON に現れない** | — |
| T-208〜T-215 | §9「後から選び直す値」 | **置き場所が決まっていない**（§5） | **未確定** |

> ⚠️ **`shapeHeightOf` だけが「群 ＝ オブジェクト」になっている。** 他の群を同じ形にする規定は原典に無い。
> 群を入れ子にすると `OP-6`（知らない鍵を保つ）や `MG-12`（塊ごと一括適用）の粒度が変わるが、**その検討の記録も無い。未検証。**

---

## 3. 保存する設定値 — 全 85 行（トップレベル 81 キー）

**列の凡例** — 「鍵」`PK`/`FK`/`—`、「由来」全行 `GRS`、「MSPDI の要素」全行 `—`、「既定値」は `tbl-settings.md` の行 ID を指す（値は写さない）。
「制約・規則」の先頭に **保存**／**非保存** を書く。範囲が他の鍵に追随する場合は**鍵の名前**で書き、数値は書かない。

### 3-1. タイムルーラー（T-201）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `pxPerDayAt1x` | number（px） | × | — | — | GRS | — | `S-1` | 保存。**寸法の根 4 つの 1 つ**（他は `basePlanHeight`/`actualMin`/`fontMin`） | tbl-settings.md:49 / grs-document-settings-ja.md:92 |
| `rulerHeight` | number（px） | × | — | — | GRS | — | `S-2` | 保存。下限が `rulerFont` に追随（相互拘束の対）。**目盛の段階が変わっても動かさない**。`fontScale` を変えると**保存値が書き換わる**（`FR-039`） | tbl-settings.md:50 / grs-document-settings-ja.md:93 / 01-04-requirements.md:3426 |
| `rulerFont` | number（px） | × | — | — | GRS | — | `S-3` | 保存。上限が `rulerHeight` に追随。既定が `fontScaleSizes[fontScale]` の関数。**`rulerHeight` と独立したキーとして保つこと（MUST）** | tbl-settings.md:51 / grs-document-settings-ja.md:94 / 01-04-requirements.md:3428 |

### 3-2. 縦の寸法（T-201）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `basePlanHeight` | number（px） | × | — | — | GRS | — | `S-4` | 保存。**根 4 つの 1 つ**。下限が `actualMin` ÷ `actualOfPlan` に追随 | tbl-settings.md:52 / grs-document-settings-ja.md:115 |
| `actualOfPlan` | number（比） | × | — | — | GRS | — | `S-5` | 保存。**縦寸法の鎖の最上流**。由来の記録が無い（🔎） | tbl-settings.md:53 / grs-document-settings-ja.md:116 |
| `actualMin` | number（px） | × | — | — | GRS | — | `S-6` | 保存。**根 4 つの 1 つ**。下限が `fontMin` ÷ `fontOfActual` に追随 | tbl-settings.md:54 / grs-document-settings-ja.md:117 |
| `fontOfActual` | number（比） | × | — | — | GRS | — | `S-7` | 保存。`markerOfFont` の上限を規定する（`S-21`） | tbl-settings.md:55 / grs-document-settings-ja.md:118 |
| `fontMin` | number（px） | × | — | — | GRS | — | `S-8` | 保存。**根 4 つの 1 つ**。`rulerFont`/`rowTitleFont`/`taskLevelOfDetailReadablePx`/`markerMin`/`fontScaleSizes.S` の下限に現れる | tbl-settings.md:56 / grs-document-settings-ja.md:119 |
| `thinFontScale` | number（倍） | × | — | — | GRS | — | `S-9` | 保存。掛けた後も `fontMin` を割らないこと（割るときの扱いは `FR-077`） | tbl-settings.md:57 / grs-document-settings-ja.md:120 |
| `actualGap` | number（px） | × | — | — | GRS | — | `S-10` | 保存 | tbl-settings.md:58 / grs-document-settings-ja.md:121 |
| `stackGap` | number（px） | × | — | — | GRS | — | `S-11` | 保存。下限が `dependencyWidth` に追随（相互拘束の対） | tbl-settings.md:59 / grs-document-settings-ja.md:122 |
| `rowGap` | number（px） | × | — | — | GRS | — | `S-12` | 保存 | tbl-settings.md:60 / grs-document-settings-ja.md:123 |

### 3-3. 形状の縦幅（T-201）— **唯一の「群 ＝ オブジェクト」**

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `shapeHeightOf` | object（5 メンバー） | × | — | — | GRS | — | （容器） | 保存。**入れ子の親**。メンバー名は `shapeKind` の 5 値と一致させること | data-model-entry-ja.md:119-121 / tbl-glossary.md:48-53 |
| `shapeHeightOf.rectangle` | number（倍） | × | — | — | GRS | — | `S-13` | 保存。**基準なので固定**（下限＝上限） | tbl-settings.md:61 / grs-document-settings-ja.md:143 |
| `shapeHeightOf.chevron` | number（倍） | × | — | — | GRS | — | `S-14` | 保存 | tbl-settings.md:62 / grs-document-settings-ja.md:144 |
| `shapeHeightOf.arrow` | number（倍） | × | — | — | GRS | — | `S-15` | 保存。細線は矩形より薄い（上限 < 1） | tbl-settings.md:63 / grs-document-settings-ja.md:145 |
| `shapeHeightOf.endpointSpan` | number（倍） | × | — | — | GRS | — | `S-16` | 保存。同上 | tbl-settings.md:64 / grs-document-settings-ja.md:146 |
| `shapeHeightOf.milestone` | number（倍） | × | — | — | GRS | — | `S-17` | 保存。矩形より大きい（下限 > 1） | tbl-settings.md:65 / grs-document-settings-ja.md:147 |

### 3-4. 依存線（T-201）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `dependencyWidth` | number（px） | × | — | — | GRS | — | `S-18` | 保存。上限が `stackGap` に追随（相互拘束の対）。**ズームに追随しない**（`FR-094`） | tbl-settings.md:66 / grs-document-settings-ja.md:153 |
| `dependencyArrowLength` | number（px） | × | — | — | GRS | — | `S-19` | 保存。下限が `dependencyWidth` に追随 | tbl-settings.md:67 / grs-document-settings-ja.md:154 |
| `dependencyRunOfArrow` | number（倍） | × | — | — | GRS | — | `S-20` | 保存 | tbl-settings.md:68 / grs-document-settings-ja.md:155 |

> **依存線の色は設定値を持たない**（固定色）。色を保存しないので鍵が無い（`grs-document-settings-ja.md:270-278`）。

### 3-5. 進捗マーカー（T-201）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `markerOfFont` | number（倍） | × | — | — | GRS | — | `S-21` | 保存。上限が `fontOfActual` に追随（**仕様書で新設された拘束**）。旧 3 キーを畳んだ 1 キー | tbl-settings.md:69 / grs-document-settings-ja.md:169 |
| `markerMin` | number（px） | × | — | — | GRS | — | `S-22` | 保存。下限が `fontMin`、上限が `actualMin` に追随（**仕様書で新設された拘束**） | tbl-settings.md:70 / grs-document-settings-ja.md:170 |
| `markerGap` | number（px） | × | — | — | GRS | — | `S-23` | 保存。**固定値**（下限＝上限＝既定） | tbl-settings.md:71 / grs-document-settings-ja.md:171 |
| `markerStroke` | number（px） | × | — | — | GRS | — | `S-24` | 保存 | tbl-settings.md:72 / grs-document-settings-ja.md:172 |
| `resumeScaleInvalid` | number（倍） | × | — | — | GRS | — | `S-25` | 保存。`resumeValid = false` のときの縮小率 | tbl-settings.md:73 / grs-document-settings-ja.md:173 |
| `resumeArmOfMarker` | number（比） | × | — | — | GRS | — | `S-26` | 保存。上限が `resumeHeadOfMarker` に追随 | tbl-settings.md:74 / grs-document-settings-ja.md:174 |
| `resumeHeadOfMarker` | number（比） | × | — | — | GRS | — | `S-27` | 保存 | tbl-settings.md:75 / grs-document-settings-ja.md:175 |
| `resumeDashOn` | number（px） | × | — | — | GRS | — | `S-28` | 保存 | tbl-settings.md:76 / grs-document-settings-ja.md:176 |
| `resumeDashOff` | number（px） | × | — | — | GRS | — | `S-29` | 保存 | tbl-settings.md:77 / grs-document-settings-ja.md:177 |

### 3-6. ラベル（T-201）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `labelCoef` | number（比） | × | — | — | GRS | — | `S-30` | 保存。**実測しない方針なので、この 1 値がレイアウト精度を単独で決める** | tbl-settings.md:78 / grs-document-settings-ja.md:183 |
| `labelPad` | number（px） | × | — | — | GRS | — | `S-31` | 保存 | tbl-settings.md:79 / grs-document-settings-ja.md:184 |
| `labelGap` | number（px） | × | — | — | GRS | — | `S-32` | 保存 | tbl-settings.md:80 / grs-document-settings-ja.md:185 |
| `labelBaseline` | number（比） | × | — | — | GRS | — | `S-33` | 保存 | tbl-settings.md:81 / grs-document-settings-ja.md:186 |
| `labelHaloOfFont` | number（比） | × | — | — | GRS | — | `S-34` | 保存。下限 0 ＝ 縁取りなし | tbl-settings.md:82 / grs-document-settings-ja.md:187 |
| `truncateUnits` | number（半角換算の単位数） | × | — | — | GRS | — | `S-35` | 保存 | tbl-settings.md:83 / grs-document-settings-ja.md:188 |
| `rowTitleFont` | number（px） | × | — | — | GRS | — | `S-36` | 保存。下限が `fontMin` に追随 | tbl-settings.md:84 / grs-document-settings-ja.md:189 |
| `rowTitleIndent` | number（px） | × | — | — | GRS | — | `S-37` | 保存。**`rowTitlePanelWidth` の下限を規定する**（`S-79`） | tbl-settings.md:85 / grs-document-settings-ja.md:190 |
| `rowTitleTopScale` | number（倍） | × | — | — | GRS | — | `S-38` | 保存。`TaskGroup` 深さ 1 の行名の倍率 | tbl-settings.md:86 / grs-document-settings-ja.md:191 |

### 3-7. 形状の細部（T-201）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `planStroke` | number（px） | × | — | — | GRS | — | `S-39` | 保存 | tbl-settings.md:87 / grs-document-settings-ja.md:197 |
| `thinStrokeOfPlan` | number（比） | × | — | — | GRS | — | `S-40` | 保存 | tbl-settings.md:88 / grs-document-settings-ja.md:198 |
| `thinStrokeMin` | number（px） | × | — | — | GRS | — | `S-41` | 保存。上限が `thinStrokeMax` に追随（相互拘束の対） | tbl-settings.md:89 / grs-document-settings-ja.md:199 |
| `thinStrokeMax` | number（px） | × | — | — | GRS | — | `S-42` | 保存。下限が `thinStrokeMin` に追随（相互拘束の対） | tbl-settings.md:90 / grs-document-settings-ja.md:200 |
| `chevronNotchOfHeight` | number（比） | × | — | — | GRS | — | `S-43` | 保存 | tbl-settings.md:91 / grs-document-settings-ja.md:201 |
| `chevronNotchOfWidth` | number（比） | × | — | — | GRS | — | `S-44` | 保存。上限を超えると先端が反転する | tbl-settings.md:92 / grs-document-settings-ja.md:202 |
| `arrowHeadOfStroke` | number（倍） | × | — | — | GRS | — | `S-45` | 保存 | tbl-settings.md:93 / grs-document-settings-ja.md:203 |
| `arrowHeadOfSpan` | number（比） | × | — | — | GRS | — | `S-46` | 保存 | tbl-settings.md:94 / grs-document-settings-ja.md:204 |
| `spanDotOfStroke` | number（倍） | × | — | — | GRS | — | `S-47` | 保存 | tbl-settings.md:95 / grs-document-settings-ja.md:205 |
| `starInnerOfOuter` | number（比） | × | — | — | GRS | — | `S-48` | 保存。`milestoneGlyph` の面積順に影響する | tbl-settings.md:96 / grs-document-settings-ja.md:206 |
| `minShapeWidth` | number（px） | × | — | — | GRS | — | `S-49` | 保存。ゼロ期間でも残す最小幅 | tbl-settings.md:97 / grs-document-settings-ja.md:207 |

### 3-8. イナズマ線（T-201）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `progressLineWidth` | number（px） | × | — | — | GRS | — | `S-50` | 保存 | tbl-settings.md:98 / grs-document-settings-ja.md:213 |
| `progressLineOverhang` | number（px） | × | — | — | GRS | — | `S-51` | 保存 | tbl-settings.md:99 / grs-document-settings-ja.md:214 |
| `statusDate` 🅿 | integer（第 n 日） | — | — | — | GRS | — | `S-52` | **非保存**。前プロジェクトの PoC 専用の鍵で、**製品の `documentSettings` には入らない**。製品の基準日は `Project.status_date`（文書のデータ）で、MSPDI の `Project/StatusDate`（`xsd:dateTime`・`minOccurs="0"`）へ往復する | tbl-settings.md:100 / grs-document-settings-ja.md:215,227-231 / mspdi_pj12.xsd:662 |

> **`progressLineColor` は無い**（廃止・§7）。イナズマ線の色は依存線と同じ固定色で、保存しない。

### 3-9. ズーム（T-201）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `zoomStep` ⛔ | number（倍） | — | — | — | GRS | — | `S-53` | **非保存**（`T-206` の `S-96`）。操作の速さであって結果の絵は変わらない。**JSON に現れないことを検査する**（`grs-document-settings-ja.md:617` の検査 5） | tbl-settings.md:101,227 / grs-document-settings-ja.md:221,481 |
| `zoomMin` ⛔ | number（倍） | — | — | — | GRS | — | `S-54` | **非保存**（`S-97`）。ただし `zoomX`/`zoomY` のクランプ範囲としては効く | tbl-settings.md:102,228 / grs-document-settings-ja.md:222,482 |
| `zoomMax` ⛔ | number（倍） | — | — | — | GRS | — | `S-55` | **非保存**（`S-98`）。`zoomMin` と相互拘束の対 | tbl-settings.md:103,229 / grs-document-settings-ja.md:223,483 |
| `canvasPadding` | number（px） | × | — | — | GRS | — | `S-56` | 保存。「使える幅・使える高さ > 0」の式に現れる | tbl-settings.md:104 / grs-document-settings-ja.md:224,532-533 |
| `svgPadding` | number（px） | × | — | — | GRS | — | `S-57` | 保存 | tbl-settings.md:105 / grs-document-settings-ja.md:225 |

> ⚠️ **群の名前が「ズーム」なのに、保存する 2 キー（`canvasPadding` / `svgPadding`）は余白であってズームではない。** 群の切り方の問題（§未解決）。

### 3-10. 表示の切り替えと文書全体の書式（T-202・14 キー）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `stackDirection` | enum `'up'` / `'down'` | × | — | — | GRS | — | `S-58` | 保存。**文書全体で 1 つ**（行ごと・バーごとには持たない） | tbl-settings.md:121 / grs-document-settings-ja.md:240 / grs-native-erd-ja.md:1131 |
| `planActualDisplay` | enum `'both'` / `'plan-only'` / `'actual-only'` | × | — | — | GRS | — | `S-59` | 保存。**3 値の列挙にして「両方 OFF」を構造的に作れなくする**（真偽 2 つで持たない） | tbl-settings.md:122 / grs-native-erd-ja.md:1353-1361 |
| `assigneeVisible` | boolean | × | — | — | GRS | — | `S-60` | 保存。既定で隠す（低ズームの段数膨張の主因） | tbl-settings.md:123 / grs-document-settings-ja.md:242,280-293 |
| `percentCompleteVisible` | boolean | × | — | — | GRS | — | `S-61` | 保存。同上 | tbl-settings.md:124 / grs-document-settings-ja.md:243 |
| `dependencyVisible` | boolean | × | — | — | GRS | — | `S-62` | 保存。**担当 / 完了率とは独立**（段数に影響しない） | tbl-settings.md:125 / grs-document-settings-ja.md:244,263 |
| `progressMarkerVisible` | boolean | × | — | — | GRS | — | `S-63` | 保存。**MSPDI へは書かない**。格納先をここと定めた確定は 2026-07-30 | tbl-settings.md:126 / grs-native-erd-ja.md:1363-1374 / plan-actual-decisions-ja.md:431-432 |
| `progressLineVisible` | boolean | × | — | — | GRS | — | `S-64` | 保存 | tbl-settings.md:127 / grs-document-settings-ja.md:246 |
| `dualCursor` | object `{ date1, date2 }` / `null` | **○** | — | — | GRS | — | `S-65` | 保存。**2 本の日付を持つ**（持たないと測った日数が再現しない）。`null` のとき葉は 1、値があるとき葉は 2 | tbl-settings.md:128 / grs-document-settings-ja.md:247 |
| `guideCursorMode` | enum `'none'` / `'crosshair'` / `'single-vertical'` / `'double-vertical'` | × | — | — | GRS | — | `S-66` | 保存。判別値は kebab-case | tbl-settings.md:129 / grs-document-settings-ja.md:248 |
| `dateGridLinesVisible` | boolean | × | — | — | GRS | — | `S-67` | 保存。目盛の段階に連動させる規定が無いので既定で隠す（規則は `FR-089`） | tbl-settings.md:130 / grs-document-settings-ja.md:249,265 |
| `groupGridLinesVisible` | boolean | × | — | — | GRS | — | `S-68` | 保存。`TaskGroup` 境界の横線 | tbl-settings.md:131 / grs-document-settings-ja.md:250,266 |
| `baselineVisible` | boolean | × | — | — | GRS | — | `S-69` | 保存。変更前の予定（別ファイル）を重ねるか | tbl-settings.md:132 / grs-document-settings-ja.md:251,267 |
| `fontScale` | enum `'S'` / `'M'` / `'L'` | × | — | — | GRS | — | `S-70` | 保存。**保存値は初期値であり読む人が変更できること**（WCAG 1.4.4）。変更は文書の編集になり、**`rulerFont`/`rulerHeight` の保存値も追随して書き換わる**。各値の px は表 T-215 | tbl-settings.md:133 / grs-native-erd-ja.md:1345-1351 / 01-04-requirements.md:3420-3428 |
| `importSeq` | integer | × | — | — | GRS | — | `S-71` | 保存・**非 export**。取込のたびに +1。`TaskOrigin.last_seen_import_seq` と対で「マスタから消えた候補」を導出する | tbl-settings.md:134 / grs-document-settings-ja.md:253 / grs-native-erd-ja.md:475-476,1130 / 01-04-requirements.md:2674 |

### 3-11. 画面の状態（T-203・9 キー）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `themePreference` | enum `'light'` / `'dark'` | × | — | — | GRS | — | `S-72` | 保存。列挙なので範囲は無い。**保存値は初期値**（読む人が変更でき、変更は文書の編集になる） | tbl-settings.md:148 / grs-document-settings-ja.md:301,336-338 |
| `themeHue` | integer（0〜359） | × | — | — | GRS | — | `S-73` | 保存。**派生する色（地の彩度・明度の寄せ幅・行の帯の色）は保存しない**。色を指定していない `Task`/`TaskGroup` もこれに追随する | tbl-settings.md:149 / grs-document-settings-ja.md:302,340-376 |
| `themeMonochrome` | boolean | × | — | — | GRS | — | `S-74` | 保存。**描画時のフィルタ**であり、保存値（人の指定色を含む）を変えない | tbl-settings.md:150 / grs-document-settings-ja.md:303,378-392 |
| `zoomX` | number | × | — | — | GRS | — | `S-75` | 保存。`zoomMin`/`zoomMax`（非保存）でクランプする。**保存対象から外してはならない（MUST NOT）** | tbl-settings.md:151 / grs-document-settings-ja.md:304 / 01-04-requirements.md:2827 |
| `zoomY` | number | × | — | — | GRS | — | `S-76` | 保存。同上。等倍の基準は `basePlanHeight` の定義 | tbl-settings.md:152 / grs-document-settings-ja.md:305 |
| `scrollDate` | date / `null` | **○** | — | — | GRS | — | `S-77` | 保存。**px で持たない**（MUST NOT）。`null` ＝「人がまだ場所を決めていない」。読み込む側は全体表示の位置にする（`OP-10`） | tbl-settings.md:153 / grs-document-settings-ja.md:306,321-325 / 01-04-requirements.md:2827,2888 |
| `scrollGroupId` | string（UUID）/ `null` | **○** | **FK** | **`TaskGroup.id`** | GRS | — | `S-78` | 保存。**整数のインデックスではない**（行の並べ替えで別の行を指すため）。**存在しない id を指していたら全体表示の位置にする**（弱い参照。参照整合性を強制しない） | tbl-settings.md:154 / grs-document-settings-ja.md:307 / 01-04-requirements.md:2888 |
| `rowTitlePanelWidth` | number（px） | × | — | — | GRS | — | `S-79` | 保存。下限が `rowTitleIndent` × `maxGroupDepth` に追随（**仕様書で新設**）。上限は `propertyPanelWidth` と**互いに依存**し、片方だけ検証してはならない | tbl-settings.md:155 / grs-document-settings-ja.md:308,311-313 |
| `propertyPanelWidth` | number（px） | × | — | — | GRS | — | `S-80` | 保存。同上（対で検証する） | tbl-settings.md:156 / grs-document-settings-ja.md:309 |

### 3-12. 出力（T-204・2 キー ＋ 入れ子 2）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `exportCanvas` | object `{ width, height }` | × | — | — | GRS | — | `S-81` | 保存。**入れ子の親**。プリセット（A3 横 / A4 横 / 現在の画面）は**名前を保存せず、解決後の 2 値だけを保存する** | tbl-settings.md:180 / grs-native-erd-ja.md:1376-1384 |
| `exportCanvas.width` | number（px） | × | — | — | GRS | — | `S-81` | 保存。`S-81` に 1 行しかないので**メンバーごとの範囲は原典に無い（未検証）** | tbl-settings.md:180 / data-model-entry-ja.md:153 |
| `exportCanvas.height` | number（px） | × | — | — | GRS | — | `S-81` | 保存。同上 | tbl-settings.md:180 / data-model-entry-ja.md:153 |
| `exportPngScale` | enum `1` / `2` | × | — | — | GRS | — | `S-82` | 保存。**毎回手で選ばせない**ために保存する | tbl-settings.md:181 / grs-document-settings-ja.md:403 |

### 3-13. LOD のしきい値（T-205・7 キー）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `rulerTierPxPerDayMonth` | number（px/day） | × | — | — | GRS | — | `S-83` | 保存。**固定値であり実行時に導出してはならない**。上限が `rulerTierPxPerDayWeek` に追随（単調性） | tbl-settings.md:193 / grs-document-settings-ja.md:412,427-429 |
| `rulerTierPxPerDayWeek` | number（px/day） | × | — | — | GRS | — | `S-84` | 保存。前後のしきい値の間に入ること | tbl-settings.md:194 / grs-document-settings-ja.md:413 |
| `rulerTierPxPerDayDay` | number（px/day） | × | — | — | GRS | — | `S-85` | 保存。下限が `rulerTierPxPerDayWeek` に追随 | tbl-settings.md:195 / grs-document-settings-ja.md:414 |
| `taskLevelOfDetailReadablePx` | number（px） | × | — | — | GRS | — | `S-86` | 保存。下限が `fontMin` に追随。判定は WBS の深さ | tbl-settings.md:196 / grs-document-settings-ja.md:415 |
| `groupLevelOfDetailBase` | number | × | — | — | GRS | — | `S-87` | 保存。`threshold(d) = base × ratio^(d − 2)` の初項 | tbl-settings.md:197 / grs-document-settings-ja.md:416 |
| `groupLevelOfDetailRatio` | number | × | — | — | GRS | — | `S-88` | 保存。**1 以下だと単調性が壊れる**（下限に ε） | tbl-settings.md:198 / grs-document-settings-ja.md:417 |
| `stackSafetyCap` | integer | × | — | — | GRS | — | `S-89` | 保存。**範囲を持たない**（下限・上限とも `—`）。⚠️ 意味が前プロジェクトから変わった（§10-2） | tbl-settings.md:199 / grs-document-settings-ja.md:418 |

---

## 4. `documentSettings` に**入らない**もの（T-206 / T-207）

**表 T-206 — 保存しないもの（17 行）**。JSON に現れないので、鍵の名前を持つものと持たないものがある。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| （鍵名なし）予定の端点の掴み代 | number（px） | — | — | — | GRS | — | `S-90` | **非保存**（製品の定数）。掴み領域は読む人のアクセシビリティに属する（WCAG 2.5.5）。**英語の識別子が無い** | tbl-settings.md:221 / grs-document-settings-ja.md:465 |
| （鍵名なし）実績の端点の掴み代 | — | — | — | — | GRS | — | `S-91` | **非保存**。同上。**英語の識別子が無い** | tbl-settings.md:222 / grs-document-settings-ja.md:466 |
| （鍵名なし）フェード掴み点の当たり判定 | number（px 角） | — | — | — | GRS | — | `S-92` | **非保存**。見た目の点（`S-109`）より広く取る。**英語の識別子が無い** | tbl-settings.md:223 / grs-document-settings-ja.md:467 |
| （鍵名なし）実績入力の入口の当たり判定 | number（px 角） | — | — | — | GRS | — | `S-93` | **非保存**。旧称「ダミーの実績線」は用語辞書に無い語だったので改めた（2026-08-13）。**英語の識別子が無い** | tbl-settings.md:224 |
| （鍵名なし）取り消しの段数 | integer | — | — | — | GRS | — | `S-94` | **非保存**。**履歴自体を保存しない**のに回数だけ文書が指定するのは筋が通らない。**英語の識別子が無い** | tbl-settings.md:225 / grs-document-settings-ja.md:474 |
| （鍵名なし）取り消しの合計メモリ上限 | number（MB） | — | — | — | GRS | — | `S-95` | **非保存**。同上。**英語の識別子が無い** | tbl-settings.md:226 / grs-document-settings-ja.md:475 |
| `zoomStep` | number | — | — | — | GRS | — | `S-96`（→`S-53`） | **非保存**。JSON に現れないことを機械検査する | tbl-settings.md:227 / grs-document-settings-ja.md:617 |
| `zoomMin` | number | — | — | — | GRS | — | `S-97`（→`S-54`） | **非保存**。同上 | tbl-settings.md:228 |
| `zoomMax` | number | — | — | — | GRS | — | `S-98`（→`S-55`） | **非保存**。同上 | tbl-settings.md:229 |
| （鍵名なし）透かしに出す開いた者の名前 | string | — | — | — | GRS | — | `S-99a` | **非保存・`localStorage`**。**開いた人の名前と日時で描くのが正しい**（作者の名前が焼き付くのは証跡として誤り） | tbl-settings.md:230 / grs-document-settings-ja.md:501-512 |
| （鍵名なし）利用者が設定した透かし解除パスワードの SHA-256 | string | — | — | — | GRS | — | `S-99c` | **非保存・`localStorage`**。未設定なら表 T-207 の既定値を使う | tbl-settings.md:231 |
| `Agent API` を有効にした文書の記録 | — | — | — | — | GRS | — | `S-99b` | **非保存・`localStorage`**。文書の識別子と対にして環境側へ置く。**設定値としての鍵名が無い** | tbl-settings.md:232 |
| `language` ⛔ | enum `'ja'` / `'en'` | — | — | — | GRS | — | `S-99` | **非保存・`localStorage`**。絵が変わらない。読めないときはブラウザの言語設定へ落とす。**表 T-202 に行が無いので切り替え対象ではない** | tbl-settings.md:233 / grs-document-settings-ja.md:487-497 |
| ~~本日線の表示状態~~ | — | — | — | — | GRS | — | `S-99d` | **廃止（2026-08-13）**。基準日線は `Project.status_date` が `null` かどうかで描画が決まり、表示状態という値を持たない | tbl-settings.md:234 / 01-04-requirements.md:1945 |
| （鍵名なし）コマンドパレットの表示状態 | boolean | — | — | — | GRS | — | `S-99e` | **非保存**。画面の使い方であって文書の内容ではない。**英語の識別子が無い** | tbl-settings.md:235 |
| （鍵名なし）全画面表示かどうか | boolean | — | — | — | GRS | — | `S-99f` | **非保存**。同上。**英語の識別子が無い** | tbl-settings.md:236 |
| （鍵名なし）開いている面 | — | — | — | — | GRS | — | `S-99g` | **非保存**。同上。**英語の識別子が無い** | tbl-settings.md:237 |

**表 T-207 — 透かし（成果物に埋め込む定数。文書には保存しない）**

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| （鍵名なし）既定の透かし解除パスワード | string | — | — | — | GRS | — | `S-100` | **非保存**。成果物へ入るのは SHA-256 だけ。**英語の識別子が無い**（用語辞書の `WatermarkPassword` は UI パーツ名） | tbl-settings.md:243 / tbl-glossary.md:107 |
| （鍵名なし）既定の透かし解除パスワードの SHA-256 | string | — | — | — | GRS | — | `S-101` | **非保存**。成果物へ定数として埋め込むのはこの値。**英語の識別子が無い** | tbl-settings.md:244 |
| `watermarkOpacity` | number | — | — | — | GRS | — | `S-102` | **非保存**（成果物の定数）。⚠️ **用語辞書 `K-101` は ⛔ を付けていない**（§9-3） | tbl-settings.md:245 / tbl-glossary.md:231 |

---

## 5. 置き場所が決まっていない表（T-208〜T-215）

`tbl-settings.md:251-252` は「**本節の表は §1 の判定では文書に保存する側に落ちるものを含む。各表の中で保存の可否を明記する**」と宣言している。
**明記しているのは表 T-209 だけである**（自分で数えた：8 表中 1 表）。残り 7 表は保存の可否が書かれていないので、
**`documentSettings` に入るのかどうかを原典から確かめられない。**

| 表 | 行 ID | 鍵 | 保存の可否 | 入れ子になるか | 出典 |
|---|---|---|---|---|---|
| T-208 予実の補助線 | `S-103` `S-104` `S-105` | `planActualGuideWeight` / `planActualGuidePattern` / `planActualGuideColor` | **未記載** | 平坦の見込み（`S-105` は「実績バーの色に追随」なので**保存しない値**の可能性が高いが、明記が無い） | tbl-settings.md:321-329 |
| T-209 既定の暦 | `S-106` `S-107` `S-108` | **鍵名なし**（稼働する曜日 / 例外日 / 週の始まり） | **保存する**（唯一の明記） | **`documentSettings` かどうかは書かれていない。** 暦は `Calendar` / `WeekDay` / `Exception` のエンティティを持つので、そちらの可能性がある | tbl-settings.md:311-319 |
| T-210 フェードの掴み点 | `S-109` `S-110` `S-111` | `fadeHandleHalfPx` / `fadeHandleStrokePx` / （鍵名なし） | **未記載** | 平坦の見込み | tbl-settings.md:301-309 |
| T-211 保存と受け入れの上限 | `S-112`〜`S-115` `S-125` | `autosaveIdleMs` / `importMaxBytes` / `importMaxItems` / `importMaxDepth` / `maxGroupDepth` | **未記載** | 平坦の見込み。**`maxGroupDepth` は `rowTitlePanelWidth` の下限に現れる**ので、保存しないなら `S-79` の範囲が文書から決まらない | tbl-settings.md:261-271 |
| T-212 画面の各部の寸法と待ち時間 | `S-124` `S-116` | `iconHintDelayMs` / `appHeaderMaxHeight` | **未記載** | 平坦の見込み | tbl-settings.md:254-259 |
| T-213 依存のラグ | `S-117` `S-118` | `dependencyLagDefault` / （鍵名なし＝ラグの単位） | **未記載** | 平坦の見込み | tbl-settings.md:273-280 |
| T-214 受け入れる日付の範囲 | `S-119` `S-120` | `importMinDate` / `importMaxDate` | **未記載** | 平坦の見込み | tbl-settings.md:282-287 |
| T-215 文字サイズ | `S-121` `S-122` `S-123` | `fontScaleSizes.S` / `.M` / `.L` | **未記載** | **保存するなら 3 つ目の入れ子オブジェクト**になる。`rulerFont`（`S-3`）の既定がこの写像を参照する | tbl-settings.md:289-299 |

> **前プロジェクトの台帳にこれら 17 鍵は 1 つも無い**（`grs-document-settings-ja.md` を機械検索して 0 件）。**すべて仕様書側で新設された。**

---

## 6. 何を保存し何を保存しないか（原典 §5.7-1）

### 6-1. 判定の形

| 版 | 判定 | 出典 |
|---|---|---|
| 前プロジェクト | **1 段**。「その値を変えると画面または出力が変わるか」だけ。**判断ではなく検査**で、CI で機械検証する | grs-document-settings-ja.md:23-36 |
| 仕様書 | **2 段**。第 1 段＝絵が変わるか／第 2 段＝**文書の内容か、読む人の環境か**。さらに**第 3 の枠**（保存値を初期値として持ち、読む人の指定が上書きする＝`fontScale` / `themePreference`） | tbl-settings.md:10-26 |

**同じ JSON からは同じ絵が出る**ことが第 1 段の目的だが、**第 2 段で外したものはこの保証の対象に入らない**（`tbl-settings.md:23`）。

### 6-2. 保存する側の内訳（`grs-native-erd-ja.md:1281-1289`）

| 区分 | 台帳の行数 | 出典 |
|---|--:|---|
| 描画の設定（57 のうち保存対象） | 53 | grs-native-erd-ja.md:1282 |
| 表示の切り替え | 14 | grs-native-erd-ja.md:1284 |
| 画面の状態 | 9 | grs-native-erd-ja.md:1286 |
| 出力 | 2 | grs-native-erd-ja.md:1287 |
| LOD のしきい値 | 7 | grs-native-erd-ja.md:1288 |
| **合計** | **85** | 自分で足した |

**85 台帳行 − `shapeHeightOf` の 5 行 ＋ 容器 1 キー ＝ トップレベル 81 キー。** 実例の解析結果（81）と一致する。

### 6-3. ズーム / スクロールを**保存する**理由

**2026-07-31 に「保存しない」から覆した。**（`grs-native-erd-ja.md:1312-1331`／`grs-document-settings-ja.md:330-334`）

- **理由は 1 つ**: 「人に重要なところを見せたい」場面があるから（ユーザー判断）。文書が「どこを見せたいか」を持てないと、渡した相手に同じ絵が出ない。
- **全体を見たい人は `Fit` を押せばよい** —— 押せば済むことのために、見せたい場所を捨てる理由がない。
- **`HighlightBox` とは役割が違う**（ハイライトボックスは「何が重要か」、ズーム / スクロールは「最初にどこが見えるか」）。
- **スクロール位置は px で持たない。日付（`scrollDate`）＋ 行の識別子（`scrollGroupId`）で持つ。** ズームや画面幅が変わった瞬間に別の場所を指すため。
- 仕様書側では `WY-1`（WYSIWYG の達成判定）が**この 4 キーを保存対象から外すことを禁じている（MUST NOT）**（`01-04-requirements.md:2827`）。

### 6-4. 透かしを**保存しない**理由

（`grs-native-erd-ja.md:1333-1343`／`grs-document-settings-ja.md:499-513`）

**透かしは「Web 会議で秘密の日程を撮影されたときの証跡」である。** 証跡として意味があるのは「**誰がいつ画面に出していたか**」なので、
**開いた人の名前と日時で描かれるのが正しい**。**作者の名前が焼き付いて他人の画面に出るのは、証跡としては誤りである。**

```
ユーザー名   localStorage（その人の環境設定）        … S-99a
日時         実行時に生成（RFC 3339 UTC）
hideHash     .html に埋め込み。文書には持たない      … S-101
```

**これは WYSIWYG に対する唯一の意図的な例外である**（`grs-document-settings-ja.md:501`）。

### 6-5. `fontScale` を**保存する**理由

（`grs-native-erd-ja.md:1345-1351`）

**SVG / PNG 出力の再現性のため。** 文字サイズが変わると**ラベルの打ち切りと LOD が変わる**ので、出力が一致しない。
**`exportCanvas` と 2 つで出力が決定する。**

> ⚠️ **保存値は「初期値」であり、読む人は変更できること**（WCAG 1.4.4）。強制すると違反になる。
> 仕様書 `FR-039` はさらに一歩踏み込み、**読む人が文字サイズを変えると `rulerFont`（`S-3`）と `rulerHeight`（`S-2`）の保存値が書き換わり、それが「文書の編集」になる**と定める（`01-04-requirements.md:3426-3428`）。
> **同じ注意が `themePreference` にも要る**（`grs-document-settings-ja.md:336-338`）。

### 6-6. 保存しない側の全数（前プロジェクト §5-1）

**9 項目 ＋ 別枠 2。** 内訳は 掴み代 4 ／ Undo 2 ／ ズームの刻みと範囲 3、別枠が `language` と 透かし。
**このうち鍵の名前を持つのは ⛔ の 3 つだけ**であり、残りは `documentSettings` の鍵ではないので JSON に現れようがない（`grs-document-settings-ja.md:617`）。

---

## 7. 廃止した項目

| 廃止した鍵 | いつ | 理由 | 出典 |
|---|---|---|---|
| `todayLineVisible` | 2026-07-31 | 本日線の位置は**実行時のシステム日付**なので、保存すると「同じ JSON → 同じ表示」が**明日には破れる**。代わりにカーソルを使う。**この決定により例外が無くなった** | grs-document-settings-ja.md:552-566 / grs-native-erd-ja.md:1295-1297 |
| `progressLineColor` | 2026-08-02 | **派生する色は保存しない。** 保存すると `themeHue` を変えたときにこの線だけ取り残される。依存線と同じ固定色にする | grs-document-settings-ja.md:270-278 / plan-actual-decisions-ja.md:572-574 |
| `markerTextOfFont` | 2026-08-02 | 「マーカーの丸の中に完了率の数字を描く」設計を前提にしていたが、**その設計は存在しない**（マーカーの中身は記号 4 種のみ）。`markerOfFont` 1 キーへ畳んだ | grs-document-settings-ja.md:159-165 |
| `markerOfText` | 2026-08-02 | 同上 | grs-document-settings-ja.md:159-165 |
| `markerTextBaseline` | 2026-08-02 | 同上。**PoC でもどこからも参照されていなかった** | grs-document-settings-ja.md:159-165 |
| `planActualStyle`（`'overlap'` / `'separate'`） | 2026-07-30 | **上下分離表示そのものを廃止した。** 予定の高さ > 実績の高さで幾何的に解くので、切替の設定が要らない | grs-native-erd-ja.md:1397-1401 |
| `rulerTierPxPerDay`（配列） | 2026-08-01 | 隣どうしが互いを縛るのに、配列だとどの要素にどの範囲が掛かるかを書く場所が無い。**境目ごとの 3 キーに分けた** | grs-document-settings-ja.md:420-425 |
| 本日線の表示状態（`S-99d`） | 2026-08-13 | 基準日線は `Project.status_date` が `null` かどうかで描画が決まり、**表示状態という値を持たない** | tbl-settings.md:234 / 01-04-requirements.md:1945 |

> **廃止済みの鍵が仕様書側に残っていないことを確認した**（`tbl-settings.md` / `tbl-glossary.md` を機械検索し、上記 8 件はいずれも 0 件）。

---

## 8. 改名の対応表（前プロジェクトの旧名から）

| 旧名 | 確定名 | 理由 | 出典 |
|---|---|---|---|
| `activeLocale` | `language` | 「ロケール」は位置を連想させる。値は `ja`/`en` の**言語** | grs-native-erd-ja.md:1393 |
| `gridCategoryLinesVisible` | `groupGridLinesVisible` | `category` は廃止語。示す対象は `TaskGroup` の境界 | grs-native-erd-ja.md:1394 |
| `cursorGuideMode` | `guideCursorMode` | UI パーツ名の改名（`Cursor Guide` → `Guide Cursor`）をデータ項目にも及ぼす | grs-native-erd-ja.md:1395 |
| `scrollX` / `scrollY` | `scrollDate` / `scrollGroupId` | px で持つとズームや画面幅の変化で別の場所を指す。**日付 ＋ 行の識別子で持つ** | grs-document-settings-ja.md:306-307,628 / tbl-glossary.md:242 |
| `rowTitleWidth` | `rowTitlePanelWidth` | 2026-08-04 に統合。**この改名でトップレベルのキーが 1 つ減った** | data-model-entry-ja.md:88 |
| `markerTextOfFont` × `markerOfText` | `markerOfFont`（1 キー） | 径を 2 段階で決めるためだけに使われていた。畳んで 1 キーに | grs-document-settings-ja.md:159-165 |
| `import_seq`（ERD の記法） | `importSeq` | **snake_case は許した 3 語に含まれない** | grs-native-erd-ja.md:475,1130 ↔ grs-document-settings-ja.md:253 / tbl-glossary.md:218 |
| `stack_direction`（ERD の記法） | `stackDirection` | 同上 | grs-native-erd-ja.md:1131,1259 ↔ grs-document-settings-ja.md:240 / tbl-glossary.md:205 |
| 群名「時間軸」 | 群名「タイムルーラー」 | 群の名前だけの変更（鍵は変わらない） | grs-document-settings-ja.md:88 ↔ tbl-settings.md:49 |
| 群名「進捗線（イナズマ線）」 | 群名「イナズマ線」 | 同上 | grs-document-settings-ja.md:209 ↔ tbl-settings.md:98 |
| 群名「形状ごとの縦幅」 | 群名「形状の縦幅」 | 同上 | grs-document-settings-ja.md:139 ↔ tbl-settings.md:61 |

---

## 9. `tbl-settings.md` と `tbl-glossary.md` の突き合わせ

### 9-1. 数（自分で数えた）

| 数えたもの | 値 | 方法 |
|---|--:|---|
| `tbl-settings.md` の `S-` 行 | **132** | 行頭 `\| S-…` を機械的に数えた。`S-1`〜`S-125` が欠番なく揃い、加えて `S-99a`〜`S-99g` の 7 行がある |
| `tbl-glossary.md` 表 T-104 の `K-` 行 | **105** | 同様に数えた。最大が `K-106` で **`K-89` が欠番** |
| `tbl-settings.md` の行のうち英語の識別子を持たないもの | **19**（`S-99b` を含めると 20） | 名前の列が `` ` `` で始まらない行を機械的に抽出した |
| 前プロジェクト台帳 §3 の描画の設定 | **57**（3＋9＋5＋3＋9＋9＋11＋3＋5） | 群ごとに数えて足した。台帳の「全 57 項目」と一致 |
| `documentSettings` のトップレベルの鍵 | **81** | 実例 JSON を機械的に解析 |
| 同・葉 | **86** | 同上（入れ子オブジェクト 2・`null` 値 1） |

### 9-2. 片方にしか無い鍵

**設定値の鍵として見るかぎり、食い違いは 1 つだけである。**

| 鍵 | `tbl-settings.md` | `tbl-glossary.md` | 判定 |
|---|---|---|---|
| `statusDate` 🅿 | `S-52` にある | **無い** | **正しい**。PoC 専用で製品の設定値ではないので、名前の正に載せない扱いと読める。ただし**明記が無い** |

用語辞書にあって設定値表に無い鍵は **0 件**（機械的に突き合わせた。`Task` / `TaskGroup` / `ja` / `en` は鍵ではなく型・値の記述）。

### 9-3. 群の割り当てが食い違う

| 鍵 | `tbl-settings.md` | `tbl-glossary.md` | 出典 |
|---|---|---|---|
| `themePreference` / `themeHue` / `themeMonochrome` | 表 T-203「**画面の状態**」 | 群「**テーマ**」（`K-59`〜`K-61`） | tbl-settings.md:148-150 ↔ tbl-glossary.md:191-193 |

前プロジェクトの台帳も §4-2「画面の状態」に置いている（`grs-document-settings-ja.md:301-303`）ので、**外れているのは用語辞書である。**

### 9-4. 印（⛔）の付け方が食い違う

| 鍵 | `tbl-settings.md` | `tbl-glossary.md` | 出典 |
|---|---|---|---|
| `watermarkOpacity` | 表 T-207（**文書には保存しない**成果物の定数） | `K-101`。**⛔ が付いていない** | tbl-settings.md:245 ↔ tbl-glossary.md:231 |

用語辞書は「⛔ を付けたものは文書に保存しない」と宣言している（`tbl-glossary.md:127`）ので、**印の付け忘れである。**
同じ疑いが `K-94`〜`K-100` / `K-102`〜`K-106`（§5 の保存の可否が未記載の鍵）にも掛かるが、**そちらは保存の可否そのものが未確定**なので印の当否も決まらない。

---

## 10. 予実の上書き（`plan-actual-decisions-ja.md`）が `documentSettings` に及ぼす差分

`grs-native-erd-ja.md:22-37` の上書き表に挙がる **`progressRatio` / `importance` / `progressStatus` / `iconShapeKind` / 保存する `stop`** は、
**いずれも `Task` / `TaskVisual` の列であって `documentSettings` の鍵ではない。**
`grs-document-settings-ja.md` と `tbl-settings.md` の両方を機械検索したが **5 語とも 0 件**であり、**設定値の塊には影響しない。**

**設定値の塊に及んだ差分は 3 件だけである。**

| # | 何が起きたか | 差分 | 出典 |
|:--:|---|---|---|
| 10-1 | `progressMarkerVisible` を**追加**した（進捗マーカーの全体非表示トグル） | 表示の切り替えが 1 キー増えた。格納先を `documentSettings` と定めたのは 2026-07-30 | grs-native-erd-ja.md:1363-1374 / plan-actual-decisions-ja.md:431-432 |
| 10-2 | マーカーの寸法を**文字サイズから導く**ことにした | `markerTextOfFont` / `markerOfText` / `markerTextBaseline` を廃止し `markerOfFont` 1 キーへ。**絵が変わる**（実測 24px → 18px） | grs-document-settings-ja.md:159-165 |
| 10-3 | イナズマ線を**固定色**にした | `progressLineColor` を廃止。**派生する色は保存しない**という原則がここで確立した | grs-document-settings-ja.md:270-278 / plan-actual-decisions-ja.md:572-574 |

**台帳と plan-actual のあいだに矛盾は見つからなかった**（設定値の範囲において）。台帳は 3 件とも plan-actual を引いて反映済みである。

### 10-4. 台帳（前プロジェクト）と仕様書（`tbl-settings.md`）の差分

**値の差は仕様書が正なので写さない。構造・意味の差だけを記録する。**

| # | 差分 | 台帳 | 仕様書 | 出典 |
|:--:|---|---|---|---|
| 1 | `stackSafetyCap` の**意味** | 「積み順の安全弁。到達したら人に知らせる」 | 「**1 つの `TaskGroup` あたりの段数の安全弁**」（2026-08-12 確定、値は 2026-08-13 に変更）。**数え方と到達時の挙動は `FR-003` の `ST-7` が持つ** | grs-document-settings-ja.md:418 ↔ tbl-settings.md:199 |
| 2 | `rulerFont` / `rulerHeight` の**既定** | 固定値 | **`fontScale` に追随する関数**になった。`FR-039` により**保存値が書き換わる** | grs-document-settings-ja.md:93-94 ↔ tbl-settings.md:50-51 |
| 3 | 相互に縛り合う対の数 | 「**4 組**」と明記（`dependencyWidth↔stackGap` / `thinStrokeMin↔thinStrokeMax` / `zoomMin↔zoomMax` / `rulerHeight↔rulerFont`） | **少なくとも 3 本の拘束が増えた**（`markerOfFont`→`fontOfActual`、`markerMin`→`actualMin`、`rowTitlePanelWidth`→`rowTitleIndent`×`maxGroupDepth`）。**「4 組」は古い** | grs-document-settings-ja.md:520-527 ↔ tbl-settings.md:69,70,155 |
| 4 | 保存しないものの数 | 「**全 9 項目 ＋ 別枠 2**」 | 表 T-206 は **17 行**（コマンドパレット / 全画面 / 開いている面 / `Agent API` の記録 / 透かしの 2 件を足した）。**「9 項目」は古い** | grs-document-settings-ja.md:455 ↔ tbl-settings.md:217-237 |
| 5 | 「後から選び直す値」の 8 表 | **存在しない**（17 鍵とも台帳に 0 件） | 表 T-208〜T-215 として新設。**保存の可否は 1 表しか明記されていない** | tbl-settings.md:247-329 |
| 6 | 透かしの定数 | 「hideHash は `.html` に埋め込み」とだけ | 表 T-207 として既定パスワードと SHA-256 を仕様の値に据えた | grs-document-settings-ja.md:512 ↔ tbl-settings.md:239-245 |

---

## 未解決

### A. 原典どうしが矛盾している点

| # | 矛盾 | 双方 | 決められない理由 |
|:--:|---|---|---|
| A-1 | **`import_seq` / `stack_direction` の記法** | `grs-native-erd-ja.md:475,1130,1131,1259` は snake_case、`grs-document-settings-ja.md:240,253` と `tbl-glossary.md:205,218` と実例 JSON は camelCase | どちらも「正」を名乗る文書。**名前の正は用語辞書**なので `importSeq` / `stackDirection` が勝つが、ERD 側は直っていない。**snake_case を許した 3 語に含まれないので `要改名`** |
| A-2 | **群の割り当て（テーマ）** | `tbl-settings.md:148-150`（画面の状態）↔ `tbl-glossary.md:191-193`（テーマ） | 群がどちらの意味を持つのか（JSON の入れ子ではないので表の見出しにすぎない）が定義されていない |
| A-3 | **`watermarkOpacity` の ⛔** | `tbl-settings.md:245`（保存しない）↔ `tbl-glossary.md:231`（⛔ なし） | 用語辞書の宣言（`:127`）と行の内容が食い違う |
| A-4 | **`stackSafetyCap` が「LOD のしきい値」の表にある** | `tbl-settings.md:199`（表 T-205 ＝ LOD）／`tbl-glossary.md:190`（群 LOD） | 内容は**段数の安全弁**で LOD ではない。群の切り方の誤りだが、直すと行 ID の並びが動く |
| A-5 | **`canvasPadding` / `svgPadding` が群「ズーム」にある** | `tbl-settings.md:104-105` | 内容は余白でズームではない。前プロジェクトの群をそのまま引き継いだ結果（`grs-document-settings-ja.md:217-225`） |
| A-6 | **`schemaVersion` の置き場所** | 実例 JSON は**根の直下**（`grs-document-with-revision-stamp.json:2`）／`grs-native-erd-ja.md:1573` は **`Project.schema_version`** | `FR-024`（`01-04-requirements.md:2795`）は「文書の形式の版を載せること」としか書かない。**`documentSettings` の鍵ではない**ことだけは両方が一致する（本書の担当外だが、E01/E02 と突き合わせること） |
| A-7 | **台帳 §6 の「相互に縛り合う対が 4 組」** | `grs-document-settings-ja.md:520-527` ↔ `tbl-settings.md:69,70,155` | 仕様書側で拘束が増えたのに台帳の数が更新されていない。**台帳は前プロジェクトの凍結物なので直せない。仕様書側の数を数え直す必要がある** |
| A-8 | **台帳 §5 の「保存しないもの 全 9 項目」** | `grs-document-settings-ja.md:455` ↔ `tbl-settings.md:217-237`（17 行） | 同上 |
| A-9 | **JSON 実例の `dateGridLinesVisible`** | `data-model-entry-ja.md:145` は `true`／`tbl-settings.md:130` と `grs-document-settings-ja.md:249` の既定は `false` | 実例は**インスタンスの値**であって既定ではない、と読めば矛盾しない（同じ実例の `importSeq` / `scrollDate` / `scrollGroupId` も既定と違う）。ただし**そう明記されていない。未検証** |
| A-10 | **JSON 実例の `stackSafetyCap`** | `data-model-entry-ja.md:157` は前プロジェクトの値／`tbl-settings.md:199` は 2026-08-13 に変更 | 実例が古いだけと読めるが、実例は「全項目の実際の姿」の根拠として使われている（`:82-85`）ので、**数の照合に使うときは値がずれていることを承知しておく必要がある** |

### B. 決められない点（原典に記述が無い ＝ 未検証）

| # | 何が決まっていないか | 影響 | 出典 |
|:--:|---|---|---|
| B-1 | **表 T-208 / T-210〜T-215 の 7 表の保存の可否** | `documentSettings` のトップレベルの鍵が 81 のままか増えるかが決まらない。`FR-024`（全項目を書き出す）と `§8-2` の検査 3（全項目が書かれていることを検査する）の**検査対象が確定しない** | tbl-settings.md:251-252（「各表の中で明記する」と宣言しているが、明記は T-209 だけ） |
| B-2 | **`fontScaleSizes` が保存されるなら 3 つ目の入れ子オブジェクトになる** | 入れ子の深さと葉の数が変わる（葉 86 → 89） | tbl-settings.md:289-299 |
| B-3 | **表 T-209（既定の暦）の置き場所** | 「保存する」とだけ明記され、**`documentSettings` なのか `Calendar` / `WeekDay` / `Exception` のエンティティなのかが書かれていない**。鍵名も無い | tbl-settings.md:311-319 |
| B-4 | **`planActualGuidePattern` の形**（文字列か配列か） | 配列なら「配列は 1 つも無い」という本書の記述が崩れる | tbl-settings.md:326 |
| B-5 | **`exportCanvas.width` / `.height` それぞれの範囲** | `S-81` は 1 行しかなく、メンバーごとの下限・上限が無い。`FR-023` の「範囲を持たない設定値は検証できない」に触れる | tbl-settings.md:180 / grs-document-settings-ja.md:539 |
| B-6 | **`dualCursor` のメンバー名の正** | `date1` / `date2` は**用語辞書に無い**。値が入るときの葉の数（2）が確定しない | tbl-settings.md:128 / tbl-glossary.md（該当なし） |
| B-7 | **群を JSON の入れ子にするかどうか** | 現状は `shapeHeightOf` だけが群＝オブジェクト。**他の群を入れ子にしない理由が書かれていない**。`OP-6`（知らない鍵を保つ）と `MG-12`（塊ごと一括適用）の粒度に効く | data-model-entry-ja.md:113-158 / 01-04-requirements.md:2675,2886 |
| B-8 | **`statusDate` 🅿 を用語辞書に載せない扱い** | 「載せない」と明記した行が無い。**書き忘れと区別できない** | tbl-settings.md:100 / tbl-glossary.md（該当なし） |
| B-9 | **`fontScale` の 3 値が `rulerFont` の保存値を書き換える経路の検査** | `FR-039` は「保存値が書き換わる」と定めるが、`§8-2` の JSON 往復検査 6 件（`grs-document-settings-ja.md:611-618`）は**この書き換えを想定していない**（設定値は比較対象から外し、SVG 出力の一致だけを見る） | 01-04-requirements.md:3426-3428 ↔ grs-document-settings-ja.md:603-620 |

### C. 要改名

| # | 対象 | 何が規約に反するか | 提案 |
|:--:|---|---|---|
| C-1 | `import_seq` / `stack_direction`（`grs-native-erd-ja.md:475,1130,1131,1259`） | **snake_case を許すのは `wbs_parent_uid` / `link_type` / `Project.status_date` の 3 語だけ** | `importSeq` / `stackDirection`（用語辞書と実例 JSON が既に採っている形） |
| C-2 | `dualCursor.date1` / `date2`（`tbl-settings.md:128`） | 番号で区切った名前は**どちらが何かを名前が語らない**。用語辞書にも無い | 役割で名づける（例: 始点・終点の別が意味を持つなら、その別で。**意味は原典から確かめられないので提案の形にとどめる**） |
| C-3 | `fontScale` の値 `'S'` / `'M'` / `'L'`（`tbl-settings.md:133,289-299`） | 他の判別値は kebab-case の小文字（`'plan-only'` / `'single-vertical'` / `'transparent'`）で、**この 3 値だけ大文字 1 字**。`fontScaleSizes` のメンバー名も同じ大文字 1 字になる | 流儀を揃えるなら小文字の語（例: `'small'` / `'medium'` / `'large'`）。**ただし利用者に見える略号でもあるので、変えると UI の表記も動く** |
| C-4 | 表 T-206 / T-207 / T-209 / T-210 / T-213 の**鍵名を持たない 19 行**（§9-1 で数えた） | 識別子が日本語しか無い。**保存する行（`S-106`〜`S-108`）まで名前が無い** | 英語 lowerCamelCase の鍵名を与える（`S-106`〜`S-108` は保存するので必須。`S-90`〜`S-95` は非保存だが製品の定数として名前が要る） |
| C-5 | `tbl-glossary.md` の欠番 `K-89` | 欠番の理由が書かれていない（廃止した `progressLineColor` の跡と読めるが**未検証**） | 欠番であることを明記するか、詰める |
| C-6 | 群名「ズーム」に `canvasPadding` / `svgPadding` が入っている（A-5） | 群が中身を語らない | 「余白」の群を分けるか、群名を変える |

> **`type` / `data` / `info` / `value` のような無意味な汎用語は、`documentSettings` の 81 キーには 1 つも現れない。**
> **81 キーはすべて lowerCamelCase であり、snake_case も大文字の略語の連なりも無い**（`svgPadding` / `exportPngScale` は `SVGPadding` のような形になっていない）。
> —— どちらも実例 JSON（`data-model-entry-ja.md:113-158`）を機械的に解析して確かめた。目視ではない。
> **入れ子のメンバー名も同じ**（`shapeHeightOf` の 5 つ・`exportCanvas` の 2 つ）。**例外は上の C-2 / C-3 の 2 件だけである。**
