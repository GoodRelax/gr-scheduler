# CR-851 GRS JSON の形の対応表（doc-shape-map.tsv）の注 —— 第 3 版

作業木 `cr851-json-reshape-8cc2ca`（HEAD `84283a081`）の `docs/spec/_source/grs-document.schema.json` を今の形として作った。
表 `doc-shape-map.tsv` が正で、`doc-shape-map.md` はそれを読みやすく刷った版である。作ったとき、今のスキーマの要素がどれもちょうど 1 度ずつ表に出ることを機械で確かめた（§1）。
利用者が行ごとに読む版は `doc-shape-map.md`（TSV から刷った版。実体ごとの節、列は old ｜ new ｜ example ｜ change ｜ why ｜ screen change。300 行）。

第 3 版で当てたもの:

- JDG-3315: タスク名とタスクグループ名を強いない。`Task.name`・`TaskGroup.name` は任意（省けば名が無く、画面は空）。タスクグループ名をタスク名から写すのは MSPDI を取り込むときの親タスクの名だけ。すべてを消した後の最初のタスクグループは "Untitled"。IV-8 と名を必須にする検査は消える。プロパティパネルで名を消すとプロパティが消える。JDG-3313（JDG-3313、名の無いあいだだけ写す）を覆す。
- JDG-3314（CR-849）: `Task`・`CommentBox`・`TaskGroup` に任意の `hyperlinkAddress`（URL、512 字まで）と `hyperlink`（題、512 字まで）を足す（MSPDI の名）。`Task` は MSPDI の `HyperlinkAddress`／`Hyperlink` に当たる（C3）。`HyperlinkSubAddress` は写しのまま。`CommentBox`・`TaskGroup` は書き出さないので C4。6 行、`why` に `CR-849` と書いた。

第 2 版で当てたもの:

第 2 版で当てたもの:

- 裁定の記録の 35〜40（JDG-3308 既定の線 1px、JDG-3309 思想 1「書かない ＝ 無い」、JDG-3310 色を書かない ＝ 描かない、JDG-3311 `taskShape`／`milestoneShape`、JDG-3312 フェードの Alias、JDG-3313 名の無いタスクグループ）。
- 調整役の 2026-10-25 の伝言の 7〜9（`JDG-3077` 独自色の片側を省いてよい、`JDG-3262` CR-851 が `x-grsChanges` の最初の行を書く、`JDG-3277` 0.625 を `fontMin` を含むすべての定数に畳む）。
- 縮尺の名（`scaling-names-for-cr851-2026-10-25.md` の §1・§2・§5・§6、JDG-3290〜3297、付録 E-1〜E-15 の英文）。

## 1. 数と測り方

| 数 | 値 |
| --- | --- |
| 今のスキーマの要素（`element_old` に出るべきもの） | **260** |
| 表の行 | 300 |
| うち今の要素の行 | 260 —— 欠け 0・余り 0・重なり 0（`assert`） |
| うち足す行（`element_old` が `-`） | 40（第 3 版で CR-849 の 6 行を足した） |
| うち消す行（`element_new` が `-`） | 3（`CommentBox.leaderShapeKind`・`rulerFontSizePx`・`rulerHeightPx`） |
| `element_new` の重なり | 0（第 2 版で `assert` を足した） |

260 の内訳: 最上段 6 ＋ `schedule` の 12 ＋ `documentSettings` の直下 34 ＋ `tableViews` の 3 表 3 ＋ その葉 13 ＋ `$defs` の定義 24 ＋ `$defs` の欄 166 ＋ 入れ子 2（`dx`・`dy`）。

数えた Python（作業木の根で打つ）:

```
python -I -c "
import json
s=json.load(open('docs/spec/_source/grs-document.schema.json',encoding='utf-8'))
P=s['properties'];ds=P['documentSettings']['properties'];tv=ds['tableViews']['properties']
d=s['\$defs']
nested=sum(len(v.get('properties',{})) for e in d.values() for v in e.get('properties',{}).values() if 'properties' in v)
n=[len(P),len(P['schedule']['properties']),len(ds),len(tv),sum(len(t['properties']) for t in tv.values()),len(d),sum(len(e.get('properties',{})) for e in d.values()),nested]
print(n,sum(n))"
```

出力 `[6, 12, 34, 3, 13, 24, 166, 2] 260`。表との突き合わせは同じフォルダの `check_tables.py`（同じ数え方の `schema_elements()` と `Counter`）。
走らせ方: リポジトリの根で `python -I studies/76-grs-json-beta-shape/check_tables.py`。

### 1.1 change の数

| change（そのまま） | 行 |
| --- | --- |
| type | 118 |
| none | 36 |
| add | 40 |
| rename+type | 34 |
| description-only | 25 |
| rename+union | 11 |
| union | 8 |
| value-meaning+type | 6 |
| rename | 5 |
| rename+description-only | 4 |
| union+type | 4 |
| remove | 3 |
| rename+value-meaning | 2 |
| type+description-only | 2 |
| value-meaning+description-only | 1 |
| rename+type+description-only | 1 |
| **計** | **300** |

成分ごと（1 行が 2 回数えられうる）: type 165・rename 57・none 36・add 40・description-only 33・union 23・value-meaning 9・remove 3。

`value-meaning` の 9 行（字面を変えずに中身が変わる、見落としやすい行）:

- `dayWidthPx`（旧 `zoomX`。1 日の幅を CSS px で持つ ＝ 3.75 × `zoomX`）
- `verticalZoomRatio`（旧 `zoomY`。大きさだけ、1 未満を取らない）
- `taskGroupPanelWidthPx`（300 → 188、下限 80 → 50）
- `TaskVisual.strokeWidthPx`（N は表示の倍率 100 の N px。既定 1 → 1px）
- 箱の 5 つの px —— `CommentBox.fontSizePx`・`strokeWidthPx`・`bodyOffsetPx`、`HighlightBox.strokeWidthPx`・`cornerRadiusPx`。画面の px から「倍率 100 の CSS px」に変わり、表示の倍率に従うようになる（JDG-3291）

### 1.2 class の付け方（第 2 版で定義を改めた）

JDG-3309 で「無い」の言い方が変わったので、`class` は**新しい形での類**にした。

| 類 | 意味 | 行（全 300 行） |
| --- | --- | --- |
| C1 | いつも値がある。必須 | 120 |
| C2 | 「ほかに従う」状態を `kind` に持つ（`theme`・`sameAsScheduleData`・`notDecided`）。必須 | 8 |
| C2/C4 | `theme` を持つ色で、プロパティを省けば「描かない」 | 4（`TaskGroup.color`・`TaskVisual.fillColor`・`strokeColor`・`HighlightBox.strokeColor`） |
| C3 | MSPDI の任意。省けば交換相手に要素が無かった | 54 |
| C4 | GRS の任意。省けば値が無い（JDG-3309）。空の配列・空の写しの表もここ | 70 |
| unchanged | 実体と器の行（中の欄は別の行） | 29 |
| - | 共有の型の定義の行と、消える行のいくつか | 15 |

今の要素 260 行だけで数えると C1 101・C4 63・C3 51・C2 7・C2/C4 4・unchanged 29・- 5。
第 1 版の 70 / 30 / 51 は absence-classification.md の数であり、JDG-3309 で次のように動いた:

- C2 30 のうち 23 が別の類へ移った。C4 へ 15（`parentTaskUid`・`fadeIn/OutCalendarDays`・`parentId`・`representedTaskUid`・`editGroup`・`sourceProjectId`・`fileSavedAt`・`fitSpan` の 2 日・`sort` 3・日付のフィルタの両端 2）、線先の 4 欄は `anchor` の値の種類の中の C1 へ、色 4 つは C2/C4 へ。
- C2 に残ったのは 7（箱の色 4・表示位置 2・`viewTimeZone`）。

### 1.3 画面の振る舞いが変わる行: 11

| 行 | 変わること |
| --- | --- |
| `verticalZoomRatio` | 1 未満の縦のズームが値として無くなり、畳む深さは `taskGroupAutoExpandDepth` が持つ（振る舞いの行は CR-853） |
| `TaskGroup.name` | タスクから作ったタスクグループの題は空で始まり、タスクに名を付けても変えても題は変わらない（今は名の無いタスクグループがタスクの名を見せる）。JDG-3315 |
| `TaskVisual.strokeWidthPx` | N は倍率 100 で N px。既定の輪郭が 0.625 → 1 px になる |
| 箱の px 5 行 | 表示の倍率が 100 でないとき、図と一緒に伸び縮みする（100 では今と同じ） |
| `CommentBox.fillColor`・`HighlightBox.fillColor` | パレットの「透明」は、色を保って透過率を 100 にする |
| `CommentBox.fillTransparencyPercent` | 透過率 100 の箱で塗りの色を選ぶと 50 になる |

`TaskGroup.minHeightPx` の画面の変化（第 1 版の「0 を打つとチェックが外れる」）は、N20 でプロパティの有無に戻したので無くなった。

## 2. 表の読み方

- `oneOf[<kind>]` はその `kind` の枝、`oneOf[*]` はどの枝にもあるプロパティ。1 つの旧い要素が 2 か所へ行くときは ` ; ` でつないだ。
- 任意のプロパティの `type_new` には `optional (absent = …)` と書いた。**この括弧の中が、そのプロパティのスキーマの説明に置く「省いたら何を見せるか」の 1 行である**（JDG-3309）。
- `why` の略:
  - 所見と裁定: `Fnn` ＝ studies/75 の所見、`JDG-nnnn` ＝ `docs/development-records/rulings.md` の裁定、`JDG-329x` ＝ 縮尺の名の裁定、`E-n` ＝ その付録の英文。
  - 私の側: `CHOICE Xn` ＝ §3 の私の選択、`OPEN On` ＝ §5 の決まっていない所。
  - 第 1 版の `DEFERRED` は縮尺の名が決まったので消えた。

## 3. 私が選んだところ（覆してよい）

### 3.1 第 2 版で増えた・変わった選択

| ID | 選んだこと | ほかの案 |
| --- | --- | --- |
| N19 | 和をやめて素の値に戻ったプロパティは**値の名を取り戻す**: `parentTaskUid`・`TaskGroup.parentId`・`sourceProjectId`・`fileSavedAt` は今の名のまま。JDG-3302 5.13 の改名（`parentTask` など）は和を持つためだった。伝言の例は `parentTask` と書いているが、参照の名の規則（MSPDI の参照は …Uid）に合わせた | 伝言どおり `parentTask`。`TaskGroup.parentId` → `parentTaskGroupId` |
| N20 | `TaskGroup.minHeightPx` を C4 にした（省けば下限なし、値は 1 以上）。JDG-3302 5.6 の「0 ＝ 下限なし」は、思想 1 では 0 が 2 つ目の「無い」になる。プロパティの有無が MH-2 のチェックと 1 対 1 になり、画面の変化も消える | JDG-3302 5.6 のまま C1（0 ＝ 下限なし） |
| N21 | `CommentBox.text` と `BaselineTask.name` を C4 にした（1 字以上、省けば空の本文／名が無い）。`""` は 2 つ目の「無い」になる（JDG-3302 5.10 を JDG-3309 が覆す、と読んだ） | JDG-3302 5.10 のまま `""` を値として必須 |
| N22 | `VisibleColor` を `Color` へ畳んだ。JDG-3310 で `none` が無くなり、2 つの型の形が同じ（theme｜palette｜custom）になった。違いはプロパティが必須か任意かだけで、それは各欄が言う。`BandColor`（ink を除く）は残す | `VisibleColor` を別名として残す |
| N23 | 接尾辞 Fraction（JDG-3297 は 0 ≤ x < 1）を、表示位置の 2 つの割合には当てた（今の上限 1 は S-176・S-177）。帯の中の高さ `bandFraction` は下端 ＝ 1 を取るので 0〜1 のまま | どちらも 0〜1 ／ どちらも 0 ≤ x < 1 |
| N24 | `BaselineTask.milestone` は C1（必須、写し元に無ければ false）のまま。いつも値がある事実だから。`Task.milestone` は MSPDI に倣い C3（省けば false） | `BaselineTask.milestone` も省けば false の C4 |
| L2 | 空の写しの表（`passthroughValues`・`PassthroughElement.fields`）も空の配列と同じく省く（`minProperties: 1`） | `{}` を書く |
| T4 | 0.625 を畳んだ定数は**丸めない**（JDG-3277 は「保存する値を丸める」）。だから絵は今と同じ。§4 の数はこの読みによる | 定数も丸める —— その場合は目盛の帯が 36 / 42 / 48、字が 11 / 13 / 15 になり絵が少し変わる |

### 3.2 第 1 版から変わらない選択

| ID | 選んだこと |
| --- | --- |
| B1 | 最上段の `buildVersion`（UTC の時刻の字） |
| T1 | `DateTime` の年は 4 桁だけ。読み方（分で読む）は変えない |
| T2 | 記録の刻と `buildVersion` を 1 つの型 `UtcInstant` にした |
| T3 | 色の 16 進は小文字 |
| L1 | 写しの名は 512、値は 65535 を上限にした |
| A1 | 箱の数に、設定の行の範囲を足した |
| A2 | uid の範囲を MSPDI の列にも当てた |
| A3 | `importSessionId` は uuid の形 |
| N1 | `carry` → `passthrough…` |
| N2 | `changeLogEntries` |
| N4 | 表示位置の中の名 `leftEdgeDay` ほか |
| N5 | 列のプロパティは 1 つの列挙 `ColumnKey` |
| N6 | `themeHueDegrees` |
| N7 | `highestIssuedUid` |
| N8 | `lastImportNumber`・`lastSeenImportNumber` |
| N9 | `firstOutlineLevel` |
| N10 | `sourceFormat` の値を残した |
| N11 | `siblingOrder` |
| N12 | 線先の自由点の日時を `dateTime` と呼んだ |
| N13 | `dx`・`dy` は略語のまま残した（JDG-3291 は `bodyOffsetPx` を残すと決めたが、中の 2 つの名は言っていない） |
| N14 | `$defs` の名を PascalCase に |
| N15 | `BaselineTask.milestone` の名を残した |
| N16 | `isBlankHidden` |
| N17 | 日付のフィルタの両端を `firstDay`/`lastDay` と呼んだ（第 2 版では素の任意の `Day`） |
| N18 | `dimGray`・`lightGray` |

第 1 版の N3（`fontSizeStep` の値の語）は JDG-3295 で決まったので選択から外れた。

## 4. 0.625 を畳んだ数（JDG-3277、T4 の読み）

| 定数・値 | 今 | 畳んだ後 | 備考 |
| --- | --- | --- | --- |
| `fontSizeStepSizes`（表 T-215 の S-121〜S-123） | 12 / 14 / 16 | **7.5 / 8.75 / 10** | 文書に保存しない定数。伝言の「18/21/24 → 11/13/15」は目盛の字（段 × 1.5）の数だった |
| `fontMin`（S-8） | 12 | 7.5 | S-121 の下限 |
| 目盛の字（S-3、段 × 1.5） | 18 / 21 / 24 | 11.25 / 13.125 / 15 | `rulerFontSizePx` は消えるので道具が導く（JDG-3294） |
| `rulerLabelPad`（S-136） | 2 | 1.25 | |
| 目盛の帯（S-2、字 × 3 ＋ 余白 × 3） | 60 / 69 / 78 | 37.5 / 43.125 / 48.75 | 導く値。保存しないので「丸めた既定が式と食い違う」問題は起きない |
| `taskGroupPanelWidthPx` の既定（S-79） | 300 | 188（187.5 を丸めた） | 式でなく測っていない定数（🔎）なので、x0.625 を丸めた値 |
| 同 下限（`taskGroupTitleIndent` × `maxGroupDepth`） | 16 × 5 ＝ 80 | 10 × 5 ＝ 50 | 式の値 |
| `dayWidthPx` の既定（S-1 `pxPerDayAt1x` × 0.625） | — | 3.75 | 範囲 0.075〜900（今の `zoomX` の範囲 × 3.75） |

第 1 版で書いた「S-2 で求めると 42」は、`rulerLabelPad` を 1 に丸めたときの数であり、定数を丸めない（T4）なら 43.125 になる。
どちらにしても、`rulerHeightPx` が消えるので文書の値の食い違いではなくなった。

## 5. 決まっていないところ

| ID | 状態 |
| --- | --- |
| O1 | **解決**（JDG-3277、§4）。T4 の読み（定数を丸めない）が合っているかだけ確かめが要る |
| O2 | **解決**（JDG-3308） |
| O3 | **解決**（JDG-3313、のち JDG-3315 が覆した: 写すのは MSPDI の取り込みだけ） |
| O4 | **解決**（JDG-3077: 片側を省いてよい、開くときに導き `source: derived` で書く、汚れにしない） |
| O5 | **残る** —— `ColumnKey` の全部のプロパティと、状態の列・タスク種別の列の `hiddenValues` に書く変わらない名の一覧。表 T-331・T-347・T-371 と状態の表に「プロパティ」の欄が要る |
| O6 | **解決**（JDG-3312） |

## 6. 接尾辞の決まり（JDG-3297。命名の規則 2 に足す）

| 接尾辞 | 意味 | この表のプロパティ |
| --- | --- | --- |
| `Px` | 表示の倍率 100 のときの CSS px。描くときは × `displayScalePercent` / 100 で、ズームは掛けない | `dayWidthPx`・`taskGroupPanelWidthPx`・`minHeightPx`・`strokeWidthPx`（3 か所）・`fontSizePx`・`bodyOffsetPx`・`cornerRadiusPx` |
| `Percent` | 百分率。100 が全部、または同じ大きさ | `displayScalePercent`・`fillTransparencyPercent`（`percentComplete` は MSPDI の名のまま） |
| `Ratio` | 既定に掛ける倍率。1 が既定 | `verticalZoomRatio` |
| `Fraction` | 1 つの物の中の位置。0 ≤ x < 1 | `leftEdgeDayFraction`・`topEdgeTaskGroupFraction`（`bandFraction` は N23 で 0〜1） |

ほかの単位の接尾辞（JDG-3281）: `…Day`（日付だけ）・`…At`（記録の刻）・`…CalendarDays`・`…WorkingDays`・`…Degrees`。

## 7. スキーマの説明に置く英文（E-1〜E-15 を思想 1 に合わせた）

付録の英文をそのまま使い、「when not set」「null」の言い方だけ直した。

| プロパティ | 説明（英文） |
| --- | --- |
| `displayScalePercent` | Display scale of the schedule drawing in percent: 100 draws every ...Px value as that many CSS pixels; 50 draws it at half size. It scales the shapes and the text of the schedule together, but not the app header, the command palette or the browser's own zoom. Opening the document starts at this value; a reader who changes it edits the document. |
| `dayWidthPx` | Width of one calendar day on the time axis, in CSS pixels at displayScalePercent 100. Fit to screen sets it so that the whole schedule fits the width of the screen. |
| `verticalZoomRatio` | Vertical size of the task figures relative to the default: 1 is the default size, 2 draws plan bars, actual bars and task name labels twice as tall. It never goes below 1; how deep task groups open is taskGroupAutoExpandDepth. |
| `taskGroupAutoExpandDepth` | How deep task groups whose treeState is auto open: they open down to this depth, counting a top-level task group as depth 1, so their children show down to depth taskGroupAutoExpandDepth + 1. 0 draws only the top-level task groups, closed. A task group a person opened or closed keeps its own treeState. |
| `fontSizeStep` | Text size step of the schedule: the reader's choice of text size (small 7.5, medium 8.75, large 10 CSS pixels at displayScalePercent 100, before the tool's own ratios). Opening the document starts at this step; a reader who changes it edits the document. |
| `taskGroupPanelWidthPx` | Width of the task group panel, in CSS pixels at displayScalePercent 100. |
| `TaskGroup.minHeightPx` | Lowest height of the task group's row, in CSS pixels at displayScalePercent 100; absent means no lowest height. verticalZoomRatio does not change it. |
| `TaskVisual.strokeWidthPx` | Outline width of the task's plan and actual bars, in CSS pixels at displayScalePercent 100 (1 to 10; GRS writes 1 for a new task). |
| `CommentBox.fontSizePx` | Text size of the comment box, in CSS pixels at displayScalePercent 100 (8 to 24; GRS writes 10 when it places a box). It follows displayScalePercent like the rest of the drawing; zoom does not change it. |
| `CommentBox.strokeWidthPx` | Width of the comment box's border and leader line, in CSS pixels at displayScalePercent 100 (1 to 10; GRS writes 1 when it places a box). It follows displayScalePercent; zoom does not change it. |
| `CommentBox.bodyOffsetPx` | Offset from the anchor point to the lower-left corner of the comment box body, in CSS pixels at displayScalePercent 100. It follows displayScalePercent, so the box keeps its place beside what it points at; zoom does not change it. |
| `HighlightBox.strokeWidthPx` | Border width of the highlight box, in CSS pixels at displayScalePercent 100 (1 to 10; GRS writes 1 when it places a box). It follows displayScalePercent; zoom does not change it. |
| `HighlightBox.cornerRadiusPx` | Corner radius of the highlight box, in CSS pixels at displayScalePercent 100 (0 to 24; 0 is a square corner; GRS writes 4 when it places a box). It follows displayScalePercent; zoom does not change it. |

E-16〜E-21（命令と Agent API）と E-22（`schemaNotes` の「Sizes」の段）は文書のプロパティではないので表に行が無い。
E-20 が名指す `isFitSpanFixed` は `fitSpan.isFixed` になり、E-17 のスクロールの 4 つの欄は `scrollPosition` の中の名になる。命令の表の改訂で合わせる必要がある。

## 8. 裁定どうしの食い違い・確かめたいこと

1. **伝言の `parentTask` と、参照の名の規則（MSPDI の参照は …Uid）。** N19 で `parentTaskUid` に戻した。
2. **JDG-3297 の Fraction「0 ≤ x < 1」と、今の S-176・S-177（上限 1）・`bandFraction`（下端 ＝ 1）。** N23。
3. **JDG-3309 と JDG-3302 5.6（`minHeightPx` の 0）・JDG-3302 5.10（`""`）。** 伝言の C2 の書き換えの一覧には無いが、思想 1 の「無いは省くだけ」に従い N20・N21 で C4 にした。覆すなら C1 に戻す。
4. **E-11・E-12・E-14・E-15 の「… when not set」と、箱の数を置くときに書く C1（JDG-3302）。** 思想 1 でも箱の数はいつも値があるので必須のまま、説明を「GRS writes … when it places a box」にした（§7）。
5. **JDG-3277 の「`rulerFontSizePx` 21 → 13・`rulerHeightPx` 69 → 43」と JDG-3294（2 つのプロパティを消す）。** 後の JDG-3294 が勝つ、とした。
6. **E-5 の「small 12, medium 14, large 16」。** 付録自身が「CR-851 が畳んだ後の値で書き直す」と言うので、7.5 / 8.75 / 10 にした（T4）。
7. **JDG-3262（台帳の行を書く）と第 1 版の §5 の 4。** 解決 —— GRS は正式な利用の前には読まず、変換スクリプトが α → β の道。
8. **JDG-3268・JDG-3260・JDG-3265 と第 1 版で挙げた食い違い。** JDG-3309（思想 1）と JDG-3077 で解けた: 消すことはプロパティを除くこと、空の配列は書かない、色を書かなければ描かない、独自色は片側を省ける。

9. **JDG-3315 と JDG-3313（JDG-3313）。** 後の JDG-3315 が勝つ。`TaskGroup.name` の行は「写すのは MSPDI の取り込みの親タスク名だけ、すべてを消した後の最初のタスクグループは "Untitled"」になった。N21（`CommentBox.text`・`BaselineTask.name` を省ける）も同じ向きである。
10. **CR-849 の 6 行（JDG-3314）。** CR-849 の行は CR-851 の表に載るが、AT- の行 ID はまだ無い（`spec_row` は `-`）。`CommentBox`・`TaskGroup` の 2 欄は書き出さない GRS の列なので C4 とし、名だけ MSPDI に揃えた。`Task` の 2 欄が写し（`passthroughValues`）から列へ移るので、MSPDI の読み書きで `HyperlinkAddress`・`Hyperlink` を写しから外す必要がある（`HyperlinkSubAddress` は写しのまま）。

## 9. 表に行が無いが同じ CR で変わるもの

- スキーマの冒頭と `documentSettings` の説明の書き直し（「Every key is written, null included」→「いつも値のあるプロパティは書く。任意のプロパティを省いたら値が無い」）。
- `x-grsChanges` の最初の行（JDG-3262）。
- 命令のスキーマ（`clear` ＝ プロパティを除く、`setZoom`・`fitScheduleToScreen`・`setDisplayScale`・`setFontSizeStep` の欄名 E-16〜E-19）と Agent API の答えの形・説明（E-20・E-21）。
- `erd.json` の `schemaNotes` に「Sizes」の段（E-22）。
- 表 T-380 の RN-5（`rulerFontSizePx` の読むだけの行）を消す（JDG-3294）。
- MSPDI の書き出しのフェードの枠の `Alias` を `fadeInCalendarDays`／`fadeOutCalendarDays` に（JDG-3312）。`Exception/Period` を列へ移す読み書き。
- 不変条件の扱い:
  - IV-8・IV-22 は消える。
  - IV-9 は「`TaskVisual` は塗りと輪郭の両方を省かない、`HighlightBox` は線を省いたまま塗りの透過率を 100 にしない」と書き直す。
  - IV-23 は残る。新たに「`taskShape`／`milestoneShape` の有無は `Task.milestone` に従う」を足す（JDG-3311）。
  - IV-24 は F36 の言葉に直す。
- 設定の表: S-370 は退き、S-371 は「透過率 100 の箱で色を選んだときの 50」に役が変わる。S-3・S-2 は導く値の行になる。
