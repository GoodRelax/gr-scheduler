# 画面の語を用語集の木に当てる — 第 2.5 段

読んだもの: 画面の語の辞書 `src/adapter/screen-renderer/display-words.json`（生成物。`$comment` を除く配列 62 本）、第 1 段の `1-glossary-terms.tsv`（用語集 382 行。`docs/spec/_assets/tbl-glossary.md` の行 ID の数と同じ）、1 枚目の決まり `3-sheet1-questions.md` の「決まったこと」の表と 3 つの木（`JDG-3351`〜`JDG-3363`）、2 枚目の案（同じ書の問 10〜19 と `4-sheet2-survey.md`。**まだ決まっていない**）、第 2 段の `2-json-mspdi-tree.md`（書き方）。
2 枚目の案の名（Grab Region・Handle・Grip・Task Group Buttons・Task Labels・Comment Box・Resume Mark ほか）に当たる語は、**印 pending** と問の番号を付けた。

- 語ごとの全部は `5-display-words-map.tsv`（749 行）にある。列は `word`・`layer`・`where`・`count`・`glossary_id`・`mark`・`note`。
- 印: **match** 用語集（または 1 枚目で決まった名）と同じ / **alias** 同じものを別の名で呼ぶ / **missing** 行が無い / **clash** 1 つの語が別のものを指す / **pending** 2 枚目の裁定が出ないと印を付けられない。
- `glossary_id` は用語集の行 ID（`U-31` など）。用語集に行がまだ無い 1 枚目の名は `S1:<英語名>`、2 枚目の案の名は `S2:問 <番号> <英語名>`、`JDG-3348` で決まった名は `JDG-3348`。
- 「古い名」で alias を付けたものは、note に どの裁定が名を変えたかを書いた（例: `JDG-3356`）。

## 数え方

1. **文**: `display-words.json` の配列の各項目から、ja と en の文字列を 1 つずつ取った。全部で 2219（ja 1103・en 1116）。`surfaces` の `name`（旧い窓の名 7）と `helpHeadings` の `block`（6）は ja・en の対でない文字列なので、`screen-surface-name-en`・`screen-help-block-en` の層として別に取った。`labelBreakSegments`（label の ja を折り返す位置の列）は label の写しなので数えていない。`timeZones` の都市名も文として読んだ（語は当たらない）。
2. **層**: `screen-<json のキー名>-<ja|en>`（`label`・`hint`・`text`・`nextStep`・`heading`・`name`・`manner`・`press`・`milestoneLabel`）。`settings` の label の英語が識別子（`pxPerDayAt1x` のような camelCase）のものは `screen-label-en-identifier` に分け、識別子を単語に割って（`fade Handle Half Px`）数えた。
3. **語の数え方**: scratchpad の `build_map.py` が、`patterns.py` の正規表現 292 本を 1 つずつ文に当てた。count は 1 つの層での当たりの回数の合計。長い語から順に当て、当たった所は伏せて、短い語が二重に当たらないようにした（「Task Group Panel」を数えたあとで「Task Group」を数える）。`{name}` のような差し込みは消してから当てた。英語は大文字小文字を区別しない（`Save As` と `Pin` のように区別が要る語だけ区別した）。
4. **where**: 当たった文の rowId（`IC-7`・`K-100` など）。rowId の無い項目は `配列名[番号]`（例 `helpHeadings[2]`）。最大 3 つ、文書の順。
5. **同じ語が ja と en の両方に当たる**（`GRS JSON`・`Agent API` など）: 語の欄に `a / b` と書き、層ごとに別の行にした。
6. **count 0 の行**: 1 枚目で決まった名・2 枚目の案の名・旧い名（Help Modal・Task Group Area・Canvas Overlays など）のうち、画面に 1 回も出ないもの。layer は `(none)`、note は「画面に 0 回」。
7. **長音の行**（印 pending、問 19a）: ポインタ・ブラウザ・フィルタ（伸ばさない綴り）の出現。同じ出現は概念の行（Pointer・Browser Window・Schedule Filter）でも数えているので、**印ごとの数の表には入れず**別に載せた。
8. **`(` で始まる語の行**（`(PR)` プロパティ・`(K)` 設定・`(icon label)` アイコン）は、名ではなく項目の表をまとめた行で、**印ごとの数の表には入れず**別に載せた。
9. **ID の突き合わせ**: `(K)` の行は、画面の設定 132 件の ja を、同じ ID の T-104 の日本語（`1-glossary-terms.tsv`）と文字列で比べた。プロパティ（`(PR)`）は、画面の名を T-102 の日本語と読んで印を付けた（機械ではなく表で決めた。表は `build_map.py` の `PROP`）。
10. **文の表**（`reasons`・`invariants`・`questions`・`notices` など。ja 243 文）は名ではなく文なので、文の中の語だけを語の行に数えた（文そのものの行は作っていない）。
11. 数はすべて scratchpad の `build_map.py`（TSV と `rows.json` を書く）と `build_tree.py`（この文書を書く）で数えた。`build_map.py` は `patterns.py`・`treedef.py` を読む。語の文脈は `ctx.py` で確かめた。

## 1. 印ごとの数

語の行（長音の行・`(` の行を除く）の数と、画面での出現数（count の合計）。

| 印 | 語の行（0 回を含む） | うち画面に出る行 | 出現数 |
| --- | ---: | ---: | ---: |
| match | 294 | 264 | 823 |
| alias | 160 | 147 | 463 |
| missing | 103 | 103 | 314 |
| clash | 57 | 57 | 265 |
| pending | 46 | 36 | 64 |
| **計** | 660 | 607 | 1929 |

- 画面に 0 回の行は 53（1 枚目で決まった名・2 枚目の案の名・旧い名で、画面が使っていないもの）。
- 長音の行（pending、問 19a）: 出現 23（フィルタ 12・ブラウザ 10・ポインタ 1）。伸ばす綴り（フィルター・ブラウザー・ポインター）は 0。

`(` の行（項目の表をまとめた行）:

| 印 | 行 | 出現数 |
| --- | ---: | ---: |
| match | 23 | 154 |
| alias | 21 | 66 |
| missing | 37 | 686 |

### 層ごとの出現数

| 層 | match | alias | missing | clash | pending | 計 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `screen-label-ja` | 89 | 29 | 18 | 42 | 21 | 199 |
| `screen-label-en` | 51 | 20 | 14 | 26 | 6 | 117 |
| `screen-label-en-identifier` | 29 | 12 | 7 | 12 | 17 | 77 |
| `screen-hint-ja` | 114 | 47 | 41 | 38 | 0 | 240 |
| `screen-hint-en` | 88 | 48 | 39 | 40 | 2 | 217 |
| `screen-heading-ja` | 0 | 7 | 0 | 0 | 0 | 7 |
| `screen-heading-en` | 0 | 7 | 0 | 0 | 0 | 7 |
| `screen-name-ja` | 5 | 2 | 0 | 0 | 0 | 7 |
| `screen-name-en` | 2 | 5 | 0 | 0 | 0 | 7 |
| `screen-surface-name-en` | 0 | 7 | 0 | 0 | 0 | 7 |
| `screen-help-block-en` | 5 | 0 | 0 | 0 | 0 | 5 |
| `screen-text-ja` | 185 | 88 | 85 | 44 | 2 | 404 |
| `screen-text-en` | 170 | 104 | 79 | 48 | 13 | 414 |
| `screen-nextStep-ja` | 35 | 41 | 15 | 7 | 0 | 98 |
| `screen-nextStep-en` | 35 | 46 | 16 | 6 | 1 | 104 |
| `screen-manner-ja` | 4 | 0 | 0 | 0 | 0 | 4 |
| `screen-manner-en` | 4 | 0 | 0 | 0 | 0 | 4 |
| `screen-press-ja` | 4 | 0 | 0 | 0 | 1 | 5 |
| `screen-press-en` | 3 | 0 | 0 | 0 | 1 | 4 |
| `screen-milestoneLabel-ja` | 0 | 0 | 0 | 1 | 0 | 1 |
| `screen-milestoneLabel-en` | 0 | 0 | 0 | 1 | 0 | 1 |
| **計** | **823** | **463** | **314** | **265** | **64** | **1929** |

### 日本語と英語

| 言語 | match | alias | missing | clash | pending | 計 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ja | 436 | 214 | 159 | 132 | 24 | 965 |
| en | 387 | 249 | 155 | 133 | 40 | 964 |

en の層には `screen-label-en-identifier`・`screen-surface-name-en`・`screen-help-block-en` も入れた。

## 2. 用語集の木と画面の語

各語の後ろの `(m3)` は 印の頭文字（m=match・a=alias・x=missing・c=clash・p=pending）と出現数（全層の合計）。`0回:` は画面に出ない名。
`ja:` の行は日本語の層、`en:` の行は英語の層（識別子の層を含む）。

### A. 画面の木（1 枚目で決まった木）

```text
   Browser Window                            ブラウザーのウィンドウ
   +- GRS                                    GRS                           ja: GoodRelax Scheduler(a1) GRS(m11)
      |                                                                    en: GoodRelax Scheduler(a1) GRS(m12)
      +- App Header                          アプリヘッダー                ja: App Header(m1) ヘッダー(a2)
      |  |                                                                 en: App Header(m3) header(a1)
      |  |                                                                 0回: アプリヘッダー(m)
      |  +- Branding                         ブランド表示
      |  +- Project Title                    プロジェクトのタイトル        ja: プロジェクト名(m1) 文書名(a2)
      |  |                                                                 en: Project Name(m1) document name(a2)
      |  +- File Status                      ファイルの状態
      |  |  +- Opened File Name              開いているファイル名
      |  |  +- File Saved At                 ファイル保存時刻
      |  +- Header Commands                  ヘッダーのコマンド
      +- Schedule Filter Bar                 スケジュールフィルタバー      ja: スケジュールフィルタ(x6)
      |                                                                    en: Schedule Filter(x6)
      +- Task Group Panel                    タスクグループパネル          ja: タスクグループパネル(m4)
      |  |                                                                 en: Task Group Panel(m4)
      |  +- Task Group Title Tree            タスクグループタイトルツリー  ja: タスクグループ見出し(a1)
      |                                                                    en: task group title(x4)
      +- Panel Divider                       パネル境界                    0回: パネル境界 / Panel Divider(m)
      +- Schedule Canvas                     スケジュールキャンバス        ja: 日程表(a9) キャンバス(a1)
      |  |                                                                 en: chart(a2) canvas(a3)
      |  |                                                                 0回: Canvas Overlays(a) キャンバスオーバーレイ(a)
      |  +- Time Ruler                       タイムルーラー                ja: 目盛ラベル(c3) 目盛 (の帯)(a7)
      |  |                                                                 en: Ruler(a9)
      |  |                                                                 0回: タイムルーラー(m) Time Ruler(m)
      |  +- Task Group Lanes                 タスクグループレーンズ
      |  |  +- Task Group Lane               タスクグループレーン          0回: Task Group Area(a) タスクグループ領域(a) タスクグループレーン / Task Group Lane(m)
      |  |     |                                                               タスクグループの帯(a)
      |  |     +- Task Graphic               タスク図形                    ja: 図形(c4) バー (単独)(a1) 棒(a1) マイルストーン形状(m3) タスク形状(m1) 形状 (単独)(m1)
      |  |        |                                                            矩形(m4) 矢羽根(m6) 端点スパン(m5)
      |  |        |                                                        en: bars (単独)(a2) Milestone Shape(m3) Task Shape(m1) Rectangle(m4) Chevron(m6)
      |  |        |                                                            Endpoint Span(m4)
      |  |        |                                                        0回: タスク図形 / Task Graphic(m)
      |  |        +- Plan Bar                予定バー                      ja: 予定の表示(a4) 予定 (単独の題)(a1)
      |  |        |                                                        en: Plan Bar(m1) Plan / the plan (単独)(a4)
      |  |        |                                                        0回: 予定バー(m)
      |  |        +- Actual Bar              実績バー                      ja: 実績の表示(a3) 実績 (単独の題)(a1)
      |  |        |                                                        en: Actual Bar(m1) Actual / the actual (単独)(a11)
      |  |        |                                                        0回: 実績バー(m)
      |  |        +- Milestone Mark          マイルストーンマーク          ja: マイルストーン (単独)(c52) 菱形(a1)
      |  |                                                                 en: milestone (単独)(c52)
      |  |                                                                 0回: マイルストーンマーク / Milestone Mark(m)
      |  +- Scrollbars                       スクロールバー                0回: スクロールバー / Scrollbars(m)
      |  +- Watermark                        透かし                        ja: 透かし解除パスワード(m3) 透かし(m7)
      |                                                                    en: unlock password(m3) Watermark(m7)
      +- Properties Panel                    プロパティパネル              ja: プロパティパネル(m8) Properties Panel(m1) パネル (単独)(a1)
      |                                                                    en: Properties Panel(m8) panel (単独)(a1)
      +- Command Palette                     コマンドパレット              ja: コマンドパレット(m6)
      |                                                                    en: Command Palette(m8)
      +- Tool Window                         ツールウィンドウ              ja: ウィンドウ (単独)(a3) 窓(a1) 面(a2)
      |  |                                                                 en: window (単独)(a6)
      |  |                                                                 0回: ツールウィンドウ / Tool Window(m)
      |  +- Help Window                      ヘルプウィンドウ              ja: ヘルプ (単独)(a6)
      |  |                                                                 en: Help Modal(a1) Help (単独)(a6)
      |  |                                                                 0回: ヘルプウィンドウ / Help Window(m)
      |  +- Search Window                    検索ウィンドウ                ja: 検索パネル(a2)
      |  |                                                                 en: Search Panel(a3)
      |  +- Resource List Window             担当リストウィンドウ          ja: 担当リスト(a2)
      |  |                                                                 en: Resource List(a5)
      |  +- Delay Diagnostics Report Window  遅延診断レポートウィンドウ    ja: 遅延診断レポート(a2) 遅延診断(m4)
      |  |                                                                 en: Delay Diagnostics Report(a2) Delay Diagnostics(x3)
      |  +- Holiday Settings Window          休日の設定ウィンドウ          ja: 休日の設定(a3)
      |                                                                    en: Holiday Settings(a1) Working Time(a4)
      +- Dialog                              ダイアログ                    0回: ダイアログ / Dialog(m)
      |  +- Save As Dialog                   ファイル保存ダイアログ        ja: ファイルに保存(a1)
      |  |                                                                 en: Export Chooser(a1) Save As(a3)
      |  +- Open File Dialog                 ファイルオープンダイアログ    ja: ファイルを開く (題)(a1)
      |  |                                                                 en: Open Chooser(a1) Open File (題)(a1)
      |  +- Watermark Unlock Dialog          透かし解除ダイアログ          0回: Watermark Unlock(a) 透かし解除 (面)(a)
      |  +- Difference Review Dialog         差分確認ダイアログ            0回: Difference Review(a) 差分の確認(a)
      |  +- Import Report Dialog             読込報告ダイアログ            0回: Import Report(a) 読込報告(a)
      |  +- Message Box                      メッセージボックス            0回: Message Box(m) メッセージボックス(m)
      |     +- Confirmation                  確認メッセージ                ja: 確認の問い(a1) 問い (単独)(a2)
      |                                                                    en: question(a3)
      |                                                                    0回: 確認メッセージ / Confirmation Message(m)
      +- Notification                        通知                          ja: 変更の通知(c1) 通知(m4)
      |  |                                                                 en: change notice(c1) notification(m4)
      |  +- Notification Area                通知領域                      0回: 通知領域 / Notification Area(m)
      +- Tooltip                             ツールチップ                  ja: アイコンの説明(a1)
                                                                           en: icon hint(a1)
                                                                           0回: ツールチップ / Tooltip(m)
```

### B. スケジュール文書の木（1 枚目）

```text
   Schedule Document     スケジュール文書    ja: スケジュール (単独)(c5) 日程 (単独)(c13) 文書 / document (単独)(a21)
   |                                             ファイル / file (形式の名なし)(a96)
   |                                         en: schedule (単独)(c20) 文書 / document (単独)(a24) ファイル / file (形式の名なし)(a96)
   |                                         0回: スケジュール文書 / Schedule Document(m)
   +- Schedule Data      スケジュールデータ  ja: スケジュールデータ(m1)
   |  |                                      en: Schedule Data(m1)
   |  |                                      0回: 日程データ(a)
   |  +- MSPDI part      MSPDI 由来の部分
   |  +- GRS part        GRS 独自の部分
   +- Document Settings  文書の設定          ja: 文書の設定(m3) 文書の描画設定(a1)
   |                                         en: Document Settings(m3) document's drawing settings(a1)
   +- Document Stamp     文書の刻印          0回: Document Stamp / 文書の刻印(m)
   +- Change Log         変更の記録          0回: Change Log / 変更の記録(m)
```

### C. ファイルの形式（1 枚目）

```text
   Schedule Document Format  スケジュール文書の形式
   +- GRS JSON               GRS JSON                ja: GRS JSON(m2) JSON (形式の名なし)(a1)
   |                                                 en: GRS JSON(m2) JSON (形式の名なし)(a2)
   +- GRS HTML               GRS HTML                ja: 単一 HTML(a1) .html (GRS の .html / GRS.html)(a3)
   |                                                 en: Single HTML(a1) .html (GRS の .html / GRS.html)(a2)
   |                                                 0回: GRS HTML(m)
   +- MSPDI                  MSPDI                   ja: MSPDI XML(a2)
                                                     en: MSPDI XML(a2)
                                                     0回: MSPDI(m)
   Derived Output            派生出力
   +- Picture                画像                    ja: SVG画像 / PNG画像(m2) 画像(m3)
   |                                                 en: SVG Image / PNG Image(a2) Image(a2) picture(m2)
   +- Report                 レポート                ja: Markdown(m2) .md(m1) .tsv(m2) 修正の記録(m3) レポート (単独)(c4)
                                                     en: Markdown(m3) .tsv(m2) Fix Log(m2) report (単独)(c5)
   GRS JSON Schema           GRS JSON スキーマ       ja: スキーマ / schema (単独)(a2)
                                                     en: スキーマ / schema (単独)(a2)
                                                     0回: GRS JSON Schema(m)
```

### D. 2 枚目の案 A: マウスで操作するもの（まだ決まっていない）

```text
   Grab Region         掴み領域              0回: 掴み領域 / Grab Region(m) 掴み代(a)
   Grab Point          掴み点                0回: 掴み点(m)
   Handle              ハンドル              ja: フェード掴み点(p2)
                                             en: handle (識別子の中)(p4)
                                             0回: ハンドル / Handle(p)
   Grip                グリップ              0回: 掴み帯 / Grip / グリップ(p)
   Scroll Thumb        スクロールつまみ      0回: つまみ / Scroll Thumb(p)
   Task Group Buttons  タスクグループボタン  ja: ボタン(p2) 折りたたむ(p1) 1 階層だけ展開する(p1) 配下をすべて折りたたむ(p1)
                                                 配下をすべて展開する(p1) ピン止め (ボタンの名)(p1)
                                             en: control(p2) button(p2) Collapse(p1) Expand One Level(p1) Collapse Below(p1)
                                                 Expand Below(p1) Pin (ボタンの名)(p1)
                                             0回: 操作子(p) Task Group Expander / Task Group Pin(m)
   Interaction Cues    操作の合図            0回: 操作の合図 / Interaction Cues(p) ドロップの案内 / Drop Cue(m)
                                                 選択枠 / Selection Frame(p) ドラッグ中のコピー / 写し(p)
```

### E. 2 枚目の案 B と JDG-3348: いつも描いてある絵の部品（Task Group Lane の中）

```text
   Stack Row                          積み段              ja: 積み順の段 / 積み順(p2)
   Actual Dummy                       実績のダミー        ja: ダミー(p1)
                                                          en: dummy (識別子の中)(p1)
   Baseline Outline                   変更前の予定の輪郭  ja: 輪郭(c1)
   Plan-Actual Guide Line             予実の補助線        ja: 補助線(p3)
                                                          en: plan actual guide(p3)
   Progress Marker                    進捗マーカー        ja: 進捗マーカー(m4) マーカー (単独)(m5)
                                                          en: Progress Marker(m4) marker (単独)(m5)
   Resume Mark                        再開マーク          ja: 再開アイコンへ繋ぐ破線(p3) 再開アイコン(m3)
                                                          en: Resume Icon(m1)
                                                          0回: 再開マーク / Resume Mark(p)
   Deadline Mark                      期限マーク          0回: 期限の印 / Deadline Mark / 期限マーク(p)
   Continuation Mark                  続きマーク          0回: 続きの印 / Continuation Mark / 続きマーク(p)
   Task Labels                        タスクのラベル      ja: 札(p1) ラベル (単独)(p1)
   |                                                      en: labels (単独)(p9)
   +- Name Label                      名称ラベル          ja: 名称ラベル(m2)
   |                                                      en: Name Label(m1)
   +- Assignee Label                  担当ラベル          ja: 担当ラベル(m4)
   |                                                      en: Assignee Label(m5)
   +- Percent Complete Label          完了率ラベル        ja: 完了率ラベル(m3)
                                                          en: Percent Complete Label(m3)
   Dependency Line                    依存線              ja: 依存線(m10) 矢じり(p4) 矢印(c10)
                                                          en: Dependency Lines(m3) Dependency Line (単数)(p5) arrowhead(p3) arrow(c9)
   Annotation                         注記                ja: 注記(m1)
   |                                                      en: annotation(m1)
   +- Comment Box                     コメントボックス    ja: コメントボックス(m8)
   |  |                                                   en: Callout(s)(a6) Comment Box(m2)
   |  +- Leader Line / Leader Anchor  引出し線 / 線先     0回: Leader Line / 引出し線(m) Leader Anchor / 線先(m)
   +- Highlight Box                   ハイライトボックス  ja: ハイライトボックス(m6)
                                                          en: Highlight Box (単数)(p6)
   Progress Line                      イナズマ線          ja: イナズマ線(m4)
                                                          en: Progress Line(m5)
   Status Line                        基準日線            ja: 基準日線(m1)
                                                          en: Status Line(m1)
   Date Grid Lines                    日付罫線            ja: 日付罫線(m3)
                                                          en: Date Grid Lines(m3)
   Group Grid Lines                   グループ罫線        ja: グループ罫線(m3)
                                                          en: Group Grid Lines(m3)
   Time Axis                          時間軸              ja: 時間軸(m3)
                                                          en: Time Axis(m3)
   View                               見えている範囲      ja: 見えている範囲(m1)
                                                          en: View(m2)
```

### F. 用語集にあって 1・2 枚目の木に載らない語（操作の状態・データの語ほか）

```text
   Selection                         選択                        ja: 選択(m24)
                                                                 en: selection / select(m39)
   Marquee                           範囲選択                    ja: 範囲選択(m1)
                                                                 en: Marquee(m1)
   Armed Shape                       構え                        ja: 構え(m30)
                                                                 en: tool (構え)(a6)
   Pointer                           ポインタ                    ja: ポインタ(m1) マウス(a1)
                                                                 en: pointer(m2) mouse(a1)
   Cursors                           カーソル                    ja: ガイドカーソル(m3) デュアルカーソル(m3) カーソル(m1)
                                                                 en: Guide Cursor(m3) Dual Cursor(m3) Cursors(m1)
   Item                              アイテム                    ja: アイテム(m1)
                                                                 en: item(m7)
   Pinned Task Group                 ピン止めしたタスクグループ  ja: ピン止めしたタスクグループ(m1)
                                                                 en: pinned task group(m3)
   Icon                              アイコン                    ja: アイコン(m1)
                                                                 en: icon(m1)
   Task                              タスク                      ja: Task (日本語の文の中)(a1) タスク名(a3) 親タスク(m22) 上位タスク(a1) タスク(m78)
                                                                     親 (単独) / parent (単独)(a13)
                                                                 en: Task Name(a1) Parent Task(m12) summary task(a1) task(m80) 親 (単独) / parent (単独)(a20)
   TaskGroup                         タスクグループ              ja: タスクグループ(m64) TaskGroup (日本語の文の中)(a4)
                                                                 en: Task Group(m63)
   Resource                          担当                        ja: 担当(m21)
                                                                 en: assignee(a6) Resource(m10)
   Assignment                        割当                        ja: 割当(m4) 割り当て(a1)
                                                                 en: Assignment(m2)
   Dependency                        依存                        ja: 依存(m11)
                                                                 en: dependency(m13)
   Project                           プロジェクト                ja: プロジェクト(m2)
                                                                 en: Project(m2)
   Calendar                          暦                          ja: 暦(m5)
                                                                 en: calendar(m4)
   Agent API                         Agent API                   ja: Agent API(m3)
                                                                 en: Agent API(m3)
   Browser (stem of Browser Window)  ブラウザ                    ja: ブラウザ(m10)
                                                                 en: browser(m11)
```

### G. 木のどこにも置けなかった語（行が無い語・1 つの語が別のものを指す語）

| 語 | glossary_id | 印 | ja | en | 例 |
| --- | --- | --- | ---: | ---: | --- |
| 稼働 / working | - | missing | 18 | 25 | IC-132, IC-133, IC-137 |
| 期間 / span / duration | - | clash | 21 | 18 | PR-5, K-49, K-141 |
| 子 (単独) / child (単独) | - | missing | 10 | 16 | IC-141, IC-142, IC-90 |
| 画面 / screen | - | missing | 14 | 10 | IC-21, K-90, IC-60 |
| フェード / fade | - | missing | 9 | 11 | PR-14, K-94, K-95 |
| 表 / table | - | missing | 11 | 9 | IC-118, IC-119, IC-153 |
| 先行 / predecessor | - | missing | 10 | 9 | PR-37, PR-43, delayReportReasons[9] |
| 曜日 / weekday | - | missing | 10 | 9 | IC-132, IC-133, IC-134 |
| 時間帯 / time range | - | missing | 10 | 9 | IC-163, IC-164, RS-89 |
| 子タスク / child task | - | missing | 15 | 3 | IC-141, IC-142, RS-80 |
| 進捗 / progress (単独) | P-8 | clash | 6 | 10 | K-132, K-140, SQ-11 |
| 列 / column | - | missing | 7 | 7 | IC-153, IC-122, IC-123 |
| 後続 / successor | - | missing | 7 | 6 | PR-38, PR-44, VC-2 |
| 例外日 / exception day | - | missing | 6 | 7 | IC-132, IC-135, IC-136 |
| 基準日 / Status Date | U-11 | missing | 5 | 5 | IC-44, delayReportSummary[0], VS-5 |
| 行 (表の行・レーンの行) | - | clash | 10 | 0 | IC-143, IC-157, IC-158 |
| row | - | clash | 0 | 10 | IC-153, IC-157, IC-158 |
| baseline | K-84 | clash | 0 | 7 | IC-4, IC-73, K-84 |
| 縦軸 / vertical axis | - | missing | 3 | 3 | IC-14, IC-15, MK-4 |
| タスク種別 / Task Type | - | missing | 3 | 3 | SQ-14, DT-9, FM-9 |
| フィルタ (列のフィルタ) | - | missing | 6 | 0 | IC-153, IC-122, readOnlySettings[11] |
| filter (列のフィルタ) | - | missing | 0 | 6 | IC-153, IC-122, readOnlySettings[11] |
| ラグ / lag | - | missing | 2 | 2 | PR-42, K-104 |
| 変更前の予定 | K-84 | missing | 4 | 0 | IC-4, K-84, IC-73 |
| GRS Relay | - | missing | 1 | 1 | RS-90 |
| 全体を収める / Zoom to Fit | - | missing | 1 | 1 | IC-10 |
| WBS | - | clash | 1 | 1 | differenceReview[0] |
| ベースライン | K-33 | clash | 1 | 0 | K-33 |
| タイトルバー / title bar | - | missing | 1 | 0 | IC-127 |

### H. 項目の表（プロパティ・設定・アイコン）

`(PR)` プロパティの名のうち、用語集の行と同じでないもの（日本語側。英語側は同じ印）:

| 画面の日本語 | glossary_id | 印 | 数 | 用語集との違い |
| --- | --- | --- | ---: | --- |
| タスク名 | P-1 | alias | 1 | P-1 の日本語は「名称」 |
| マイルストーン名 | P-1 | alias | 1 | P-1 の日本語は「名称」。マイルストーン用の別ラベル |
| UID | - | missing | 1 | uid に行が無い（2 段目） |
| 予定開始日 | P-3 | alias | 1 | P-3 の日本語は「開始日」。画面は「予定」を付ける |
| 予定終了日 | P-3 | alias | 1 | P-3 の日本語は「終了日」。画面は「予定」を付ける |
| 予定日 | - | missing | 1 | マイルストーンの日の名の行が無い |
| 実績日 | - | missing | 1 | マイルストーンの実績の日の名の行が無い |
| フェード日数 前/後 | P-21 | alias | 1 | P-21 は「フェードイン日数 / フェードアウト日数」 |
| 先行タスク | - | missing | 1 | 行が無い |
| 後続タスク | - | missing | 1 | 行が無い |
| 枠線幅 | P-18 | alias | 3 | P-18 の日本語は「線の太さ」 |
| 枠線色 | P-18 | alias | 3 | P-18 の日本語は「線色」 |
| 塗潰し色 | P-18 | alias | 3 | P-18 の日本語は「塗り色」（塗潰し / 塗りの綴りの揺れもある） |
| タスクグループ名 | - | missing | 1 | TaskGroup の name の行が無い |
| 最小高さ | - | missing | 1 | 行が無い |
| 編集権限 | - | missing | 1 | 行が無い（editGroup） |
| 色 | - | missing | 1 | Color の行が無い |
| 本文 | - | missing | 1 | コメントボックスの本文。行が無い |
| フォントサイズ | K-85 | alias | 1 | K-85 の日本語は「文字サイズ」。同じものを 2 つの名で呼ぶ |
| 最前面に配置 | - | missing | 2 | 行が無い |
| 塗りの透過率（%） | - | missing | 2 | fillTransparencyPercent の行が無い |
| 文字色 | - | missing | 1 | 行が無い |
| 種別 | P-23 | alias | 1 | P-23 は「依存の種別」 |
| ラグ | - | missing | 1 | 行が無い |
| 先行 | - | missing | 1 | 行が無い |
| 後続 | - | missing | 1 | 行が無い |

プロパティの名（日本語）37 種 45 件のうち match 11・alias 16・missing 18。

- `(icon label)` / `screen-label-ja` : 138 件（missing）— T-109 の IC 行は日本語の説明だけで、名の欄（英語の欄）が無い。画面は IC 行ごとに名を持つ（設計: 表 T-109 は英語の欄を拒む）
- `(icon label)` / `screen-label-en` : 138 件（missing）— T-109 の IC 行は日本語の説明だけで、名の欄（英語の欄）が無い。画面は IC 行ごとに名を持つ（設計: 表 T-109 は英語の欄を拒む）
- `(icon hint)` / `screen-hint-ja` : 138 件（missing）— T-109 の IC 行は日本語の説明だけで、名の欄（英語の欄）が無い。画面は IC 行ごとに名を持つ（設計: 表 T-109 は英語の欄を拒む）
- `(icon hint)` / `screen-hint-en` : 138 件（missing）— T-109 の IC 行は日本語の説明だけで、名の欄（英語の欄）が無い。画面は IC 行ごとに名を持つ（設計: 表 T-109 は英語の欄を拒む）
- `(K) ja label equal to the T-104 日本語` / `screen-label-ja` : 132 件（match）— 設定の日本語の名は用語集 T-104 の日本語と同じ（生成元が同じ）。K-90・K-139・K-140・K-141 は、用語集の行が名のあとに注記（稼働日・開始日 / 終了日など）を足すだけの違いなので同じとした
- `(K) en label is the settings identifier` / `screen-label-en-identifier` : 98 件（missing）— 画面の英語が識別子（pxPerDayAt1x など）のまま。T-104 の英語の欄も識別子なので、英語の名がどこにも無い（表 T-109 の注と同じ事情）
- `(K) en label is an English display name` / `screen-label-en` : 34 件（alias）— 画面の英語は表示名（Ruler Height など）、T-104 の英語の欄は鍵（rulerHeightPx）。同じ設定を 2 つの名で呼ぶ

## 3. ほころび

数の大きい順。どちらの側が正しいかは選んでいない。数は上の TSV の count の合計（長音の行は含めない）。

1. **ファイルを形式の名なしで呼ぶ**（214）
   `JDG-3353` は「ファイルはいつも形式の名を付けて言う」と決めたが、画面の「ファイル」「file」は形式の名を付けずに 192 回（ja 96・en 96）。さらに形式の名を別の語で言う所が 22 回ある —— 単一 HTML / Single HTML 2（ruled は GRS HTML）・`.html` 5・形式の名なしの JSON 3・スキーマ / schema 4（ruled は GRS JSON Schema）・MSPDI XML 4（ruled は MSPDI）・Image 4（ruled は Picture）。
   例: RS-11, IO-1, IO-7
2. **アイコンの名が用語集に無い（件数はアイコンの行）**（138）
   アイコン 138 行は、T-109 に日本語の説明だけがあり名の欄が無い（表 T-109 が英語の欄を拒む設計）一方、画面は ja・en の名（label）と説明（hint）を持つ。label は 138 個の ja と 138 個の en、hint も同じ数。名が用語集に無いので、画面の名どうしの食い違いを突き合わせる元が無い。
   例: IC-7, IC-98, IC-1
3. **設定の英語の名が識別子のまま、または表示名と鍵の 2 つがある（件数は設定の行）**（132）
   設定 132 行のうち、画面の英語が識別子（pxPerDayAt1x など）のままのものが 98。英語の表示名（Ruler Height など）を持つものが 34 で、T-104 の英語の欄は鍵（rulerHeightPx）なので、同じ設定を 2 つの英語で呼ぶ。日本語は T-104 と同じ（132 行）。
   例: K-1, K-112, K-113
4. **親・子・先行・後続の語に行が無い**（109）
   親タスク（P-22）の行だけがあり、子タスク・先行・後続の行が無い。画面は親 / parent 33・子 / child 26・子タスク / child task 18・先行 / predecessor 19・後続 / successor 13。「親」「子」を単独で書く所も多い（親タスクなのかタスクグループの親なのかは文脈で決まる）。
   例: PR-37, PR-43, delayReportReasons[9]
5. **「マイルストーン」が 2 つのものを指す**（104）
   マイルストーン（Milestone）は、タスクの種類（`taskTypes`・PR-1・検索表の列「タスク（マイルストーン）」）としても、描いた印としても使う（IC-27〜IC-34・IC-83〜IC-89 の「Milestone (Circle)」ほか 16 個、`shapeHeightOf.milestone`）。1 枚目の木の印は Milestone Mark で、画面にはその名が 0 回。ja 52・en 52。
   例: IC-27, IC-28, IC-29
6. **1 つの語が別のものを指す（マイルストーン・schedule 以外の clash）**（103）
   期間 / span / duration 39（T-006b A-12・端点スパンの span とも同じ）・進捗 / progress 16（A-6 の 3 つ）・矢印 / arrow 19（タスクの形・依存線の矢じり・親タスクの矢印）・baseline / ベースライン 8（変更前の予定と文字のベースライン）・report / レポート 9（Report の出力と遅延診断レポートの窓）・図形 4・目盛ラベル 3（Time Ruler の字に Label）・WBS 2・変更の通知 / change notice 2（Agent API の知らせと画面の Notification）・輪郭 1。
   例: K-112, K-113, K-114
7. **稼働の暦の語に行が無い**（94）
   休日の設定ウィンドウと遅延診断が使う語 —— 稼働 / working 43・曜日 / weekday 19・時間帯 / time range 19・例外日 / exception day 13。用語集には暦（N-9 Calendar）の行だけがあり、この 4 語はどの行にも無い。
   例: IC-132, IC-133, IC-137
8. **行の無い、そのほかの語**（82）
   画面 / screen 24・フェード / fade 20（P-21 の日数の行だけ）・基準日 / Status Date 10・縦軸 6・タスク種別 6・ラグ 4・変更前の予定 / baseline 4・Zoom to Fit 2・Delay Diagnostics（英語。VK-4 に英語の欄が無い）3・GRS Relay 2・タイトルバー 1。
   例: RS-90, IC-107, IC-168
9. **表・列・行・フィルタの語に行が無い**（78）
   3 つの表ウィンドウが使う語 —— 表 / table 20・列 / column 14・行 / row 20（表の 1 行と、タスクグループの 1 行の 2 つに使うので clash）・列のフィルタ 12・スケジュールフィルタ（掛ける機能の名）12。用語集の行は `U-67 Schedule Filter Bar`（帯）だけ。
   例: IC-143, readOnlySettings[7], searchPanel[7]
10. **2 枚目の案が決まるまで印を付けられない語（pending）**（64）
   問ごとの出現数: 問 18 18・問 13 16・問 19b 11・問 15 11・問 11 6・問 19d 2。今の用語集の名と同じ（match）だが、案が通ると名が変わる語: 再開アイコン 3（問 17）・Resume Icon 1（問 17）。長音の綴り（問 19a）は上の数に含めず別に 23（フィルタ 12・ブラウザ 10・ポインタ 1）。
   例: IC-61, AR-4, delayFixes[14]
11. **木の名の一部だけで呼ぶ（短い言い方）**（56）
   ヘッダー / header 3（ruled は App Header）・パネル / panel 2（Task Group Panel と Properties Panel の区別なし）・Ruler / 目盛 16（Time Ruler）・バー / bars / 棒 4（Plan Bar / Actual Bar と区別なし）・Plan / Actual 単独 17・予定の表示 / 実績の表示 7（日本語の切替の名に Bar が無い）・タスクグループ見出し 1（ruled は タイトル）・tool 6（構え）。
   例: helpHeadings[2], RS-67, IC-17
12. **窓のたぐいを旧い名や単独の語で呼ぶ**（55）
   `JDG-3356` が名の末尾を Window / Dialog にそろえた窓について、画面の題と `surfaces` の名は旧い名のまま 43 回 —— surfaces の名 7 つ（Help Modal・Resource List・Export Chooser・Open Chooser・Search Panel・Delay Diagnostics Report・Holiday Settings）はすべて旧い名で、題は「ヘルプ」「担当リスト」「ファイルに保存」「ファイルを開く」「検索パネル」「遅延診断レポート」「休日の設定」（英語の題 Working Time は surfaces の名 Holiday Settings と別の名）。種類を言う語も単独のまま 12 回 —— ウィンドウ 3・window 6・窓 1・面 2（`JDG-3356` がやめた「面」）。
   例: surfaces[0], IC-117, surfaces[4]
13. **「schedule」「日程」「日程表」「chart」を使う**（53）
   `JDG-3357` は「日程表」「chart」を使わない、`JDG-3358` は単独の schedule を書かないと決めた。画面は日程表 9・chart 2・単独の schedule / スケジュール / 日程 38（データを指す所とキャンバスを指す所が混ざるので clash）・キャンバス / canvas 4。「日程データ」は 0 回（スケジュールデータ / Schedule data は 2）。
   例: IC-1, IC-104, IC-105
14. **「文書」を単独で書く**（51）
   `JDG-3353` の Schedule Document（スケジュール文書）に対し、画面は「文書」「document」だけを 45 回（ja 21・en 24）。ヘッダーの題の名は「文書名 / document name」4 回（ruled は Project Title、用語集 U-27 は Document Title）、文書の設定の言い換え「文書の描画設定」2 回。
   例: SK-9, delayReportMarkdown[0], IC-17
15. **Callout**（6）
   画面の英語は Comment Box を 0 回、Callout を 6 回（label 2・hint 2・text 2）。日本語は「コメントボックス」8 回で用語集と一致。`問 16` の Callout のほうが外れている。
   例: IC-35, IC-119, MK-13
16. **担当（Resource）の英語が 2 つ**（6）
   日本語の「担当」（N-10 Resource）21 に対し、英語は Resource 10 と assignee 6。プロパティ PR-16 の英語は Assignee、検索表の列 SQ-2 は Assignees、担当リストの列 RQ-2 は Resource。
   例: PR-16, RS-49, RS-82

### 分類できなかったもの

どの語にも当たらず残った語（数の多いもの）。動詞・助詞・日付や都市名・場面の語で、名として行を立てる根拠が文の中に無かった。今回は行を立てていない（用語集の語かどうか、利用者の判断が要る）。

- 日本語: 表示 41・ドラッグ 28・一度押 27・日付 24・実績 21・場所 19・削除 19・修正 16・配下 15・開始 14・非表示 13・名前 13・上限 13・保存 12・編集 12・操作 12・追加 12・完了 12・文字 10・カナダ 10・形式 9・サイズ 9・展開 9・全体 8・縮小 8・言語 8・開始日 8・終了日 8・チェック 8・適用 8・予定 8・倍率 8・米国 8・コピー 7・切替 7・拡大 7・設定 7・解除 7・上書 7・日時 7
- 英語: the 437・and 90・this 82・not 74・open 51・one 48・cannot 43・was 37・date 36・drag 35・then 35・start 34・opened 34・time 33・its 32・again 32・finish 31・show 30・that 29・from 25・actual 25・fix 24・empty 23・has 22・zoom 21・hide 20・create 20・space 20・dates 20・delete 20・original 20・day 20・choose 19・color 19・every 19・name 19・back 18・out 17・only 17・are 16

この中で名になりうるが行を立てなかったもの: 実績 / actual・予定 / plan（データの語。P-3〜P-5 の一部）、開始日 / 終了日（P-3）、ズーム / zoom（K-62〜K-68 の語で JSON では dayWidthPx などに変わった）、タイムゾーン（K-144・K-145）、テーマ（K-59・K-60）、ボトルネック（遅延診断の語）、ピン（U-46・U-48 の一部）。

