# GRS JSON の「1 つの欄に 2 つ以上の意味」の棚卸し

ベータの前に 1 度だけ `GRS JSON` の形を崩して直す、その対象を洗い出した記録である。
きっかけは色の欄（`"fillColor": "#c0504d/#b2423f"` が明るいテーマと暗いテーマの 2 つの値を 1 つの字列に詰め、同じ欄が `red` や `transparent` のような名も取る）である。
「1 匹いれば、ほかにもいる」として、同じ種類の欄をすべて探した。

本書は読むだけの調べであり、仕様書もコードも書き換えていない。

## 1. 調べ方

### 1.1 読んだもの

| 読んだもの | 何のために |
| --- | --- |
| `docs/spec/_source/grs-document.schema.json` | 文書の JSON Schema。`$defs` の下の欄と、`documentSettings` の欄の型・パターン・列挙・説明 |
| `docs/spec/_source/erd.json` | スキーマの元の原稿。エンティティごとの `export`（MSPDI へ書き出すか）と、列ごとの `origin`（`Own` ／ `Consume` ／ `GRS` ／ `Carry`）と `exchange`（交換相手の要素） |
| `docs/spec/_assets/fig-erd-detail.md` | `AT-` の行（列ごとの日本語の意味）。`AT-1` 〜 `AT-168` |
| `docs/spec/_assets/tbl-settings.md` | 文書に保存する設定（表 T-202・T-203・T-216・T-372）と、パレット色の表 T-294 |
| `docs/spec/_assets/tbl-glossary.md` | 表 T-104（設定のキーの名と日本語） |
| `docs/spec/01-04-requirements.md` | 色の規則（表 T-017b の `CV-1` 〜 `CV-10`）、予実の状態（表 T-019・T-019a）、フェード（`FD-`）、時刻の書き方（`WT-`）、タイムゾーンの選択肢（表 T-376）、書き手の語（表 T-229）、表示の倍率（表 T-252）など、行ごとに要るところ |
| `docs/spec/05-07-design.md` | 不変条件（表 T-220 の `IV-9`・`IV-22`・`IV-23`・`IV-24`） |

### 1.2 全数を歩いたことの確かめ方

スキーマを Python の `json` で読み、`$defs` の下の各定義の `properties` を機械で数え上げ、その一覧を 1 行ずつ見た。
見た欄の数は次のとおりである。

| 群 | 数 | 内訳 |
| --- | --- | --- |
| `$defs` の下の欄 | **166** | `Project` 28・`Task` 21・`Dependency` 6・`TaskGroup` 9・`TaskGroupMember` 2・`Calendar` 9・`WeekDay` 6・`Exception` 9・`WorkingTime` 3・`Resource` 7・`Assignment` 5・`TaskVisual` 6・`TaskOrigin` 5・`CommentBox` 17・`HighlightBox` 10・`CarryElement` 4・`documentStamp` 4・`changeLog` 4・`BaselineTask` 5・`ColumnFilter` 4・`ColumnSort` 2（`Carry`・`DateTime`・`Time` は欄を持たない型） |
| `documentSettings` の直下の欄 | **34** | `tableViews` を 1 つと数える |
| `documentSettings.tableViews` の 3 つの表の葉 | **13** | `delayDiagnosticsReport` 4・`resourceList` 5・`searchPanel` 4 |
| 文書の最上段のキー | **6** | `$schema`・`schemaVersion`・`schedule`・`documentSettings`・`documentStamp`・`changeLog` |
| **合計** | **219** | `schedule` の下の 12 の配列は器なので数えていない |

`$defs` の 166 欄のうち、1 つ以上の所見に出る欄は **81**、所見の無い欄は **85** である（81 ＋ 85 ＝ 166。§3 に名を並べた）。
ただし所見 08（日時と時刻の型が時差と秒を受け付ける）は型の所見であり、その型を使うだけで意味が 1 つの欄（`Task.start` など）は「所見の無い欄」に数えた。
`documentSettings` の 47 欄（34 ＋ 13）のうち、所見に出る欄は 15、所見の無い欄は 32 である。
最上段の 6 キーに所見は無い。

MSPDI に縛られるか（表の「MSPDI に縛られるか」の欄）は次のように決めた。
`erd.json` の `export` はエンティティごとに持つ値であり、列ごとには持たない。
そこで、エンティティの `export` が真で、かつ列が交換相手の要素（`fig-erd-detail.md` の「交換相手の要素」の欄）を持つ列を「はい」（MSPDI の名と符号を保つ —— 形を変える対象の外）とした。
`export` が真でも交換相手の要素を持たない列（例 `Task.parentTaskUid`）と、`export` が偽のエンティティの列は「いいえ」とした。
`Task.fadeInDays` は交換相手では `ExtendedAttribute` に入るが、`GRS JSON` の中の名と形は `GRS` が決めているので「いいえ」とした。

### 1.3 決めきれなかったこと

| 何を | なぜ |
| --- | --- |
| `changeLog.editedBy` に書く語 | `lastEditedBy` の語は表 T-229 が持つが、`editedBy` の語を定める行が見つからない（`AT-131` は「その版を書いた者」とだけ言う。`docs/spec/_assets/fig-erd-detail.md:488`）。所見 49 では「同じ語を使うなら同じ問題」として挙げた |
| 真偽の列の `null` の意味 | `Task.milestone`・`WeekDay.dayWorking` ほか、`null` を取る真偽の列の多くで、`null` が何を言うかが書かれていない（所見 26） |
| `ColumnFilter.hiddenValues` の語が画面の言語で変わるか | 表 T-372 は「値の一覧で印を外した値の語」と言うだけである（`docs/spec/_assets/tbl-settings.md:259`）。状態の列のように語を画面が作る列で、言語を切り替えると語が変わるかを確かめられなかった |
| いくつかの `Px` の列の縮尺 | `TaskVisual.strokeWidthPx`・`HighlightBox.cornerRadiusPx`・`rulerHeightPx`・`rulerFontSizePx` に表示の倍率を掛けるかを、本調べで読んだ範囲では決められなかった（所見 15・33） |
| `documentSettings` の日付がどのタイムゾーンの日か | `scrollDate`・`fitSpanStart`・`fitSpanFinish` は `DateTime` 型を参照せず、パターンだけを持つ（`docs/spec/_source/grs-document.schema.json:222`・`:230`・`:333`）。`Project.scheduleDataTimeZone` の時計か `viewTimeZone` の時計かが書かれていない（所見 12） |
| 時刻の無い日付を読むか | スキーマの冒頭の説明は「時刻の無い日付は、開始の側ではその日の最初の稼働の始まりと読む」と言う（`docs/spec/_source/grs-document.schema.json:6`）が、`DateTime` のパターンは `T` 以降を必須とする（同 `:1811`）。読む側がスキーマより緩いのかを決められなかった |

## 2. 所見

「種類」の番号は次のとおりである。
1 ＝ 1 つの字列に値を詰める ／ 2 ＝ 1 つの欄が種類の違う値を取る ／ 3 ＝ 特別な意味を持つ値（`null`・`0`・空・`transparent` など） ／ 4 ＝ 3 つの状態を持つ真偽 ／ 5 ＝ 意味や単位がほかの欄で決まる ／ 6 ＝ 単位やタイムゾーンが書かれていない ／ 7 ＝ 名が中身と違う ／ 8 ＝ その他の同じ臭い（同じ事実を 2 か所に持つ、意味を失った欄など）。

「古いファイルが壊れるか」は、「よりきれいな形」に直したときに今の形のファイルが開けなくなるかである。

重さの目安: **高** ＝ 読む人（人も AI も）が取り違えて、間違った値を書くか読むおそれが大きい ／ **中** ＝ 規則を読めば分かるが、欄だけからは分からない ／ **低** ＝ 書かれていて害が小さいか、交換相手の形なので直せない。

### 2.1 色

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | `TaskGroup.color`・`TaskVisual.fillColor`・`TaskVisual.strokeColor`・`CommentBox.strokeColor`・`CommentBox.fillColor`・`CommentBox.textColor`・`HighlightBox.strokeColor`・`HighlightBox.fillColor`（以下「色の 8 欄」） | `AT-58`・`AT-102`・`AT-103`・`AT-121`・`AT-146`・`AT-148`・`AT-150`・`AT-152` | 1 | `"#c0504d/#b2423f"`・`"#c0504d/"`・`"/#b2423f"` | 明るいテーマの値と暗いテーマの値を `/` で区切って 1 つの字列に詰め、どちらが空かを `/` の位置で言う（`docs/spec/_assets/fig-erd-detail.md:444`、`docs/spec/01-04-requirements.md:2155`、`docs/spec/_source/grs-document.schema.json:1388`）。読む側は字列を割らないと値が取れず、`/` の左右のどちらが明るい側かは欄の名にも型にも出ない | `{"kind":"custom","light":"#c0504d","dark":"#b2423f"}`。片側が無いときは `{"kind":"custom","light":"#c0504d","dark":null}` | はい | いいえ | 高 |
| 02 | 色の 8 欄 | 同上 | 2 | `"red"` と `"#c0504d/"` が同じ欄 | 同じ欄が「パレットの名（描く値は表 T-294 が明暗と描く所ごとに決める）」と「作成者が選んだ値そのもの」という、性質の違う 2 種を取る（`docs/spec/01-04-requirements.md:2154`・`:2155`）。どちらかは字列の見た目（`#` の有無）で見分けるしかない | `{"kind":"palette","name":"red"}` と 01 の `{"kind":"custom",...}` を `kind` で分ける | はい | いいえ | 高 |
| 03 | 色の 8 欄（`CommentBox.strokeColor`・`CommentBox.textColor` を除く 6 欄が `transparent` を取る） | 同上 | 3 | `null` と `"transparent"` | `null` は「テーマに従う」、`transparent` は「描かない」であり、どちらも「色を持たない」に見えるのに意味が逆である（`docs/spec/_assets/tbl-settings.md:732` の `S-324`、`docs/spec/01-04-requirements.md:6603`）。しかも `transparent` はパレットの名の 1 つとして色の名と同じ列挙に並ぶ（`docs/spec/_source/grs-document.schema.json:1388`）。さらに `null` が何に従うかは欄ごとに違う（テーマの塗り `S-155`、地の色 `S-146`、注記の色 `S-312`、文字の色 `S-147`、`themeHue` —— `docs/spec/01-04-requirements.md:6625`） | `null` ＝ テーマに従う、`{"kind":"none"}` ＝ 描かない、として「描かない」を色の名から外す | はい | いいえ | 高 |
| 04 | `TaskGroup.color`・`CommentBox.strokeColor`・`CommentBox.textColor` | `AT-58`・`AT-148`・`AT-152` | 2・8 | `TaskGroup.color` は `black` を取らない。`CommentBox` の線と字は `transparent` を取らない | `AT-` は「形は `AT-102` と同じ」と言うが、取れる名の組は欄ごとに違い、違いはスキーマのパターンの中にだけある（`docs/spec/_source/grs-document.schema.json:1016`・`:1559`・`:1585`、`docs/spec/_assets/fig-erd-detail.md:398`・`:463`・`:467`）。「同じ形」が欄によって別の形である | 色の型を 1 つ（`$defs/Color`）にし、欄ごとの禁止は不変条件の表に書く。または `ColorNoBlack`・`ColorOpaque` のように名を分けた型にする | いいえ（パターンだけを直すなら） | いいえ | 中 |
| 05 | 色の 8 欄の `white`・`black` | `AT-102` ほか | 7 | `"white"` を暗いテーマでは `#14161a` で描く | `white` と `black` は暗いテーマで入れ替わる（`docs/spec/_assets/tbl-settings.md:722`・`:723`、`docs/spec/01-04-requirements.md:2159`）。保存する綴りは「白」と言うが、中身は「地と同じ色」と「字と同じ色」である | `"paper"`（地の色）・`"ink"`（字の色）のように、明暗で変わる意味の名にする | はい | いいえ | 中 |
| 06 | `CommentBox.fillColor` と `CommentBox.fillTransparencyPercent`、`HighlightBox.fillColor` と `HighlightBox.fillTransparencyPercent` | `AT-150`・`AT-151`・`AT-146`・`AT-147` | 8 | `"fillColor":"transparent"` と `"fillTransparencyPercent":100` | 塗りを見えなくする書き方が 2 つある —— 色を `transparent` にするか、透過率を 100 にするか（`docs/spec/_assets/fig-erd-detail.md:465`・`:466`・`:477`・`:478`）。同じ絵に 2 つの字面があると、往復の比較や検索で別物に見える | 塗りの欄からは `{"kind":"none"}` を外し、見えなさは透過率だけで言う。またはその逆 | はい | いいえ | 中 |
| 07 | `TaskVisual.fillColor`・`TaskVisual.strokeColor` | `AT-102`・`AT-103` | 8 | `"fillColor":"red"` | 1 つの値が 2 つの図形を決める —— 塗りは予定バーの塗りと、そこから導く実績バーの塗り（`CV-10`）を決め、輪郭は予定バーと実績バーの縁を決める（`docs/spec/01-04-requirements.md:2159`・`:2163`）。実績の色だけを変える置き場が無い。仕様の意図どおりであり、書かれている | 今のまま。実績を別に選ばせるなら `actualFillColor` を足す | いいえ | いいえ | 低 |

### 2.2 日時とタイムゾーン

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 08 | `DateTime` 型を使うすべての欄（`Task.start`・`Task.finish`・`Task.deadline`・`Task.actualStart`・`Task.stop`・`Task.actualFinish`・`Task.resume`・`Project.creationDate`・`Project.startDate`・`Project.statusDate`・`Exception.fromDate`・`Exception.toDate`・`CommentBox.anchorDate`・`HighlightBox.start`・`HighlightBox.finish`・`BaselineTask.start`・`BaselineTask.finish`・`ColumnFilter.fromDate`・`ColumnFilter.toDate`）と `Time` 型（`Project.defaultStartTime`・`Project.defaultFinishTime`・`WorkingTime.fromTime`・`WorkingTime.toTime`） | 各列 | 6・8 | `"2026-10-01T09:00:00+05:00"`、`"…Z"`、秒の付いた値 | パターンは末尾の `Z` や `+05:00` と秒と小数秒を受け付ける（`docs/spec/_source/grs-document.schema.json:1811`・`:1818`）が、説明は「`project.scheduleDataTimeZone` の時計の時刻、分まで。差は書かない —— `GRS` は換算せず、取り込んだ字面を往復のためだけに保つ」と言う（同 `:1806`、`:6`）。つまり `Z` を書いても UTC ではなく、`+05:00` を書いても無視される。字面は「この時差の時刻」と言い、中身は「文書の時計の時刻」である | パターンを `^-?\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}$` に絞る（例 `"2026-10-01T09:00"`）。取り込んだ字面が違うときは、その字面を `carry` に控えて書き出しで戻す | はい（差や秒の付いたファイル） | 一部（字面を保つのは往復のため） | 高 |
| 09 | `HighlightBox.finish`・`Exception.toDate`・`documentSettings.fitSpanFinish`（と、日付の範囲として打つ `ColumnFilter.toDate`） | `AT-118`・`AT-80` | 6・7 | `HighlightBox.finish` ＝ `"…T23:59:00"`、`Task.finish` ＝ `"…T17:00:00"` | 「終わり」の書き方が 2 通りある。`Task.finish` は仕事が終わる瞬間であり（`docs/spec/_source/grs-document.schema.json:6`）、丸 1 日の範囲の終わりはその日の `23:59:00`（`docs/spec/01-04-requirements.md:7142` の `WT-7`）。同じ「finish」の名で、片方は瞬間、片方は「その日を含む」である | 丸 1 日の範囲は日付だけで持つ: `{"firstDay":"2026-10-01","lastDay":"2026-10-03"}`。`Exception` は交換相手の形のまま | はい | `Exception` は はい、ほかは いいえ | 中 |
| 10 | `Project.creationDate` | `AT-9` | 6 | `"2026-10-24T21:15:30"` | 新しく作るときは「その場所の時刻（帯を持たず秒まで）」を書く（`docs/spec/_assets/fig-erd-detail.md:344`、`docs/spec/01-04-requirements.md:7144` の `WT-9`）。しかし `DateTime` 型は「`scheduleDataTimeZone` の時計の時刻、分まで」と言う（`docs/spec/_source/grs-document.schema.json:1806`）。どちらの時計か、秒を持つのかが型と列で食い違う | 列の形は交換相手のまま。書く時刻を `scheduleDataTimeZone` の時計に揃えるか、`DateTime` ではない別の型（その PC の時計、秒まで）と書く | いいえ（規則を直すだけなら） | はい（列）。時計の決めは `GRS` | 中 |
| 11 | `Project.startDate`・`Project.statusDate` | `AT-12`・`AT-13` | 6・7 | — | `fig-erd-detail.md` は型を「日付」とする（`docs/spec/_assets/fig-erd-detail.md:346`・`:347`）が、スキーマは `DateTime` である（`docs/spec/_source/grs-document.schema.json:642`・`:645`）。`statusDate` は時刻を持つが、基準日線は日に立ち、時刻では動かない（同 `:645` の説明）。「日付」か「日時」かが文書の中で 2 通り | 交換相手の形のまま。`AT-` の型の欄を「日時（描くのは日だけ）」に揃える | いいえ | はい | 低 |
| 12 | `documentSettings.scrollDate`・`fitSpanStart`・`fitSpanFinish`、`ColumnFilter.fromDate`・`toDate` | （`S-77`・`S-518`・`S-519`、表 T-372） | 6 | `"scrollDate":"2026-10-01T00:00:00"` | 設定の表は型を「日付」とする（`docs/spec/_assets/tbl-settings.md:181`・`:182`・`:203`・`:260`）が、スキーマは日時のパターンである（`docs/spec/_source/grs-document.schema.json:222`・`:230`・`:333`）。時刻の部分は決まった値（`00:00:00` か `23:59:00`）しか取らない（`docs/spec/01-04-requirements.md:7141`〜`:7143`）。`documentSettings` の 3 つは `DateTime` 型を参照しないので、どのタイムゾーンの日かも書かれていない | 日付だけの型にする: `"scrollDate":"2026-10-01"`。どの時計の日か（`scheduleDataTimeZone` か `viewTimeZone` か）を型の説明に書く | はい | いいえ | 中 |
| 13 | `documentSettings.displayTimeZones` | （`S-575`） | 1・2 | `"UTC-08:00"` と `"UTC-08:00 DST"` | 1 つの鍵に「UTC の差」と「標準時か夏時間か」を詰めている。` DST` の付いた鍵は差を動かさず、一年中その差で読む（`docs/spec/_source/grs-document.schema.json:174`、`docs/spec/01-04-requirements.md:5948` の `ZN-34`）。同じ差の鍵が 2 つあり、違うのは画面に出す略称だけである。`scheduleDataTimeZone` と `viewTimeZone` は ` DST` の鍵を取らないので、同じ「タイムゾーンの鍵」が欄によって違う組になる | `{"offset":"-08:00","daylight":true}`。または差だけの鍵と、略称を選ぶ別の欄に分ける | はい | いいえ | 中 |
| 14 | `documentSettings.viewTimeZone` | （`S-574`） | 3・7 | `null` | `null` は「日程データのタイムゾーンと同じ、付け替えたらついて行く」を言う（`docs/spec/_assets/tbl-settings.md:183`）。同じ差を書いた値（ついて行かない）とは振る舞いが違うので、`null` は「無い」ではなく「追随」である。さらに表 T-104 の日本語は「本プロジェクトの基準タイムゾーン」で（`docs/spec/_assets/tbl-glossary.md:289`）、`Project.scheduleDataTimeZone` のことに読める | `null` の意味は今のまま（ほかに無い「追随」を 1 つで言う）。表 T-104 の日本語を「見せる基準のタイムゾーン」に直す | いいえ | いいえ | 低 |

### 2.3 単位

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | `TaskGroup.minHeightPx`・`documentSettings.taskGroupPanelWidthPx`・`CommentBox.bodyOffsetPx`・`CommentBox.strokeWidthPx`・`CommentBox.fontSizePx`・`HighlightBox.strokeWidthPx` | `AT-59`・`AT-115`・`AT-149`・`AT-168`・`AT-145` | 6 | `"minHeightPx":40`、`"taskGroupPanelWidthPx":300`、`"fontSizePx":14` | 名の末尾の `Px` が 3 通りの px を言う。`minHeightPx` は表示の倍率 100 のときの画面の px で、表示の倍率だけを掛ける（`docs/spec/01-04-requirements.md:9056` の `DS-13`）。`taskGroupPanelWidthPx` は描く比（表示の倍率と `S-236`）を掛ける前の px（`docs/spec/_assets/tbl-settings.md:207`、`docs/spec/01-04-requirements.md` の `DS-9`）。コメントボックスの px は画面の px で、倍率を掛けない（`docs/spec/01-04-requirements.md:6629`）。欄の名からはどれかが分からない | 文書の px は 1 つの約束（例: 表示の倍率 100 のときの px）に揃え、外れるものは名で言う（例 `fontSizeScreenPx`）。少なくとも型の説明に縮尺を書く | はい（名を変えるなら） | いいえ | 中 |
| 16 | `Task.fadeInDays`・`Task.fadeOutDays`・`Project.parentTaskProgressToleranceDays` | `AT-40`・`AT-41`・`AT-156` | 6・5 | `"fadeInDays":3`、`"parentTaskProgressToleranceDays":1` | 名の末尾の `Days` が 2 通りの日を言う。フェードは暦日で数える（`docs/spec/01-04-requirements.md:1409` の `FD-6`）。親タスクの許す日数は稼働日の数で、当てるときは × `Project.minutesPerDay` 分とする（`docs/spec/_assets/tbl-settings.md:274` の `S-487`）。後者は単位がほかの欄（`minutesPerDay`）で決まる | `fadeInCalendarDays`・`fadeOutCalendarDays`・`parentTaskProgressToleranceWorkingDays` | はい | いいえ（フェードは交換相手では `ExtendedAttribute` だが、名は `GRS` が決める） | 中 |
| 17 | `Dependency.linkLag`・`Dependency.lagFormat` | `AT-47`・`AT-48` | 5・6 | `"linkLag":4800,"lagFormat":7` | `linkLag` の単位は `lagFormat` が何であっても 0.1 分であり、`lagFormat` は見せる単位だけを言う（`docs/spec/_assets/fig-erd-detail.md:387`・`:388`）。名の上ではラグの単位を `lagFormat` が決めるように読める。稼働日で見せるときの 1 日は `Project.minutesPerDay` 分（空なら 480）で、これもほかの欄で決まる | 交換相手の名と符号を保つ（形は変えない）。スキーマの説明は既に書いている（`docs/spec/_source/grs-document.schema.json:927`） | いいえ | はい | 中 |
| 18 | `documentSettings.displayScale`・`zoomX`・`zoomY` | （`S-234`・`S-75`・`S-76`） | 6 | `"displayScale":100`、`"zoomX":1` | どちらも「大きさの倍率」だが、`displayScale` は百分率の整数、`zoomX` は 1 を等倍とする比である（`docs/spec/_assets/tbl-settings.md:180`・`:201`）。名からは単位が分からない | `displayScalePercent`。または両方を比に揃える | はい（名を変えるなら） | いいえ | 低 |

### 2.4 タスクと形

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 19 | `Task.actualStart`・`Task.stop`・`Task.actualFinish`・`Task.resume`・`Task.resumeValid` | `AT-34`・`AT-141`・`AT-36`・`AT-37`・`AT-38` | 3・4・5・7 | 中断・再開日未定 ＝ `"resumeValid":false` で `stop` に日付、完了 ＝ `actualFinish` に日付で `"resumeValid":false` | 予実の 5 つの状態を、5 つの空になりうる列の組み合わせで言う（`docs/spec/01-04-requirements.md:3058`〜`:3064` の 表 T-019）。`resumeValid` の `false` は「再開日が決まっていない中断」（`PA-4`）と「完了」（`PA-5`）の両方に置かれ、判別は上から順に当てる表 T-019a に頼る（同 `:3079`〜`:3083`）。`stop` は名が「止めた」と言うが、進行中のタスクでも実績が届いた最後の日を持つ（`docs/spec/_assets/fig-erd-detail.md:375`） | 交換相手の形を保つ（形は変えない）。読み方は表 T-019a に任せる | いいえ | はい | 中 |
| 20 | `Task.percentComplete` | `AT-39` | 8・2 | `"percentComplete":120` | `GRS JSON` を読むときは日付から数え直し、MSPDI から取り込んだ値は保つ（`docs/spec/_assets/fig-erd-detail.md:379`、`docs/spec/_source/grs-document.schema.json:864`）。`GRS JSON` の中では「日付から出る値の控え」で、書いた値は読まれない。同じ欄が出どころで意味を変える | 交換相手の形を保つ。`GRS JSON` での扱い（読まない控え）をスキーマの説明が既に言っている | いいえ | はい | 低 |
| 21 | `Task.fadeInDays`・`Task.fadeOutDays` | `AT-40`・`AT-41` | 3 | `null` と `0` | 「`null` と `0` を区別する」（`docs/spec/_assets/fig-erd-detail.md:380`）が、描く形はどちらも矩形である（`docs/spec/01-04-requirements.md:1407` の `FD-4`）。違いは交換相手のファイルに枠があったかどうかだけで、絵の意味ではない | 数は `0` 以上の整数だけとし（既定 `0`）、取り込んだ枠の有無は往復の控え（`carry`）に持つ | はい（`null` を拒むなら） | いいえ | 低 |
| 22 | `TaskVisual.shapeKind` | `AT-100` | 2・3・8 | `"rectangle"`・`"milestone"`・`null` | 列挙が「描く形」（矩形・矢羽根・矢印・端点スパン）と「マイルストーンであること」を 1 つに混ぜている。マイルストーンかどうかの正は `Task.milestone` であり、2 つは食い違ってはならない（`docs/spec/05-07-design.md:1346` の `IV-22`）。`null` は「`Task.milestone` から解く」（`docs/spec/_assets/fig-erd-detail.md:442`）。同じ事実を 2 か所に持ち、3 つ目の書き方（`null`）もある | マイルストーンは `Task.milestone` だけで言い、形の欄は期間を持つタスクの形だけにする: `"barShape":"rectangle"`（マイルストーンでは見ない）。マイルストーンの形は `milestoneGlyph` だけ | はい | いいえ | 中 |
| 23 | `TaskVisual.milestoneGlyph` | `AT-101` | 5・3 | `null` と `"diamond"` | 形がマイルストーンのときだけ見る（`docs/spec/_assets/fig-erd-detail.md:443`）ので、意味がほかの欄で決まる。既定は `diamond` で、`null` も取る（`docs/spec/_source/grs-document.schema.json:1362`）ので、菱形の書き方が 2 つある | `null` を取らず既定 `"diamond"` を書く。22 の形にすれば「マイルストーンのときだけ」は `Task.milestone` が決める | はい | いいえ | 低 |
| 24 | `TaskVisual.taskUid`（`TaskVisual` の行そのもの） | `AT-97` | 3・8 | `{"taskUid":7,"shapeKind":null,"milestoneGlyph":null,"fillColor":null,"strokeColor":null,"strokeWidthPx":null}` | どのタスクもちょうど 1 つの `TaskVisual` を持ち、何も決めていないタスクは `taskUid` のほかがすべて `null` の行を持つ（`docs/spec/05-07-design.md:1331` の `IV-23`）。すべて `null` の行が「何も選んでいない」を言い、行の欠けは「壊れた文書」を言う | タスクの中に `"visual": null` か `{...}` として持つ。または行が無いことを「何も選んでいない」とする | はい | いいえ | 低 |
| 25 | `BaselineTask.milestone` | `AT-138` | 7 | `true` | `Task.milestone` は「マイルストーンかどうかの正」（`docs/spec/_assets/fig-erd-detail.md:370`）だが、同じ名の `BaselineTask.milestone` は「マイルストーンとして描くか」（同 `:495`）である。名が同じで、片方は事実、片方は描き方 | 名は同じでよいが、`AT-138` の意味を「変更前の予定でマイルストーンだったか」と書き、描き方の言葉を外す | いいえ | いいえ | 低 |
| 26 | `Task.milestone`・`Calendar.isBaseCalendar`・`WeekDay.dayWorking`・`Exception.dayWorking`・`Resource.isCostResource`・`Task.resumeValid`・`BaselineTask.milestone` | `AT-30`・`AT-65`・`AT-74`・`AT-81`・`AT-88`・`AT-38`・`AT-138` | 4 | `null` | どれも型が真偽か `null` で（`docs/spec/_source/grs-document.schema.json:820`・`:1069`・`:1132`・`:1189`・`:1274`・`:857`・`:1790`）、`null` が何を言うか（偽と同じか、「交換相手に無かった」か、基準の暦から継ぐか）が書かれていない。表 T-019 は `resumeValid` の未着手の欄を「—」とするだけである（`docs/spec/01-04-requirements.md:3060`） | 交換相手の列は形を保ち、`null` の読み方を `AT-` に書く。`GRS` だけの `BaselineTask.milestone` は `null` を取らない真偽にする | `BaselineTask` だけ はい | `BaselineTask.milestone` のほかは はい | 低 |

### 2.5 タスクグループ

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 27 | `TaskGroup.name`・`TaskGroup.derivedFromTaskUid` | `AT-53`・`AT-54` | 3・7・2 | `"name":null,"derivedFromTaskUid":12` | `name` の `null` は「導出する」を言う（`docs/spec/_assets/fig-erd-detail.md:393`）。`derivedFromTaskUid` は名が「名前の導出元」と言うが、タスクグループを別の親の下へ移したときに、どの `Task` を親タスクにするかも決める（`docs/spec/01-04-requirements.md:1854` の `HM-12`）。`name` を書いても導出元は残り、木の結びつきとして働く。名前の出どころと、タスクグループの木と WBS の結びつきという 2 つの役を 1 つの欄が持つ | `{"representedTaskUid":12,"nameOverride":null}` —— このタスクグループが表すタスクと、名を上書きする字を分ける | はい | いいえ | 中 |
| 28 | `TaskGroup.editPermission` | `AT-144` | 7・3 | `null`・`"設計"` | 名は「編集の許し」と言うが、中身は編集できるグループの名である（`docs/spec/_assets/fig-erd-detail.md:397`）。`null` は「誰でも編集できる」で、いまは名が何であれ書けば読み取り専用になる（`docs/spec/01-04-requirements.md:1874`・`:1881` の `GP-1`） | `"editGroup":"設計"`（`null` ＝ 誰でも） | はい | いいえ | 低 |
| 29 | `TaskGroup.treeState` | `AT-153` | 2 | `"auto"`・`"collapsed"`・`"expanded"`・`"temporarilyExpanded"`・`"hidden"` | 列挙が「開き方」（自動・畳む・開く）と、「見せるか」（`hidden`）と、「一時的か」（`temporarilyExpanded` は縦を縮めたら `auto` へ戻る）の 3 つの軸を 1 つに混ぜている（`docs/spec/_assets/fig-erd-detail.md:396`）。状態遷移の表（表 T-328）が持つ状態の組として閉じており、書かれている | 今のまま（状態遷移の状態として 1 つに持つ）。分けるなら `{"expansion":"auto","hidden":false,"temporary":false}` | はい（分けるなら） | いいえ | 低 |

### 2.6 注記（コメントボックスとハイライトボックス）

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 30 | `CommentBox.anchorDate`・`anchorTaskGroupId`・`anchorBandFraction`・`anchorTaskUid`・`anchorTaskFigure`・`anchorHighlightBoxId`・`anchorSnapPoint` | `AT-113`・`AT-114`・`AT-163`〜`AT-167` | 5 | 吸着していない: `anchorTaskUid` 以下 4 つが `null`。タスクに吸着: `"anchorTaskUid":12,"anchorTaskFigure":"plannedBar","anchorSnapPoint":"topLeftCorner"` | 「自由点」か「タスクに吸着」か「ハイライトボックスに吸着」かという 3 択を、7 つの平たい列と「同時に持たない」「同時に `null`」「対象を持つときだけ持つ」の約束で言う（`docs/spec/_assets/fig-erd-detail.md:455`〜`:462`）。`anchorDate` と `anchorTaskGroupId` は、吸着していないときは線先の位置、吸着しているときは「対象を消したときに戻る所」であり、同じ欄が場合で意味を変える | `"anchor":{"date":"2026-10-01T09:00","taskGroupId":"…","bandFraction":0.5,"snap":null}`、吸着は `"snap":{"task":12,"figure":"plannedBar","point":"topLeftCorner"}` か `"snap":{"highlightBox":"…","point":"rightMiddle"}` | はい | いいえ | 中 |
| 31 | `CommentBox.anchorBandFraction` | `AT-163` | 3 | `null` と `0.5` | `null` は 0.5（帯の縦の中央）である（`docs/spec/_assets/fig-erd-detail.md:458`）。同じ位置に書き方が 2 つあり、往復の比較で別物に見える | `null` を取らず、既定の `0.5` を書く | はい | いいえ | 低 |
| 32 | `CommentBox.leaderShapeKind` | `AT-111` | 8 | `"calloutBox"`・`"polyline"`・`null` | 引出し線は 1 種に絞られ、この列と列挙は退役させる予定である（`docs/spec/01-04-requirements.md:6637`）。値を書いても絵は変わらず、意味を失った欄が残っている | 列を消す | はい（`additionalProperties` が偽なので、この鍵を持つ古いファイルを拒む） | いいえ | 低 |
| 33 | `HighlightBox.cornerRadiusPx` | `AT-122` | 3・6 | `null`・`4` | 意味は「角の丸み」だけで（`docs/spec/_assets/fig-erd-detail.md:475`）、`null` のときに何で描くかと、px にズームや表示の倍率を掛けるかが書かれていない。ほかの `null` を取る数の列（`strokeWidthPx` など）はどれも「`null` ＝ 表 T-217 の既定」と書いている | 同じ書き方に揃える: `null` ＝ 表 T-217 の既定、縮尺は 15 の約束 | いいえ | いいえ | 低 |

### 2.7 暦（すべて交換相手の形）

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 34 | `Exception.fromDate`・`Exception.toDate` | `AT-79`・`AT-80` | 5 | `"fromDate":"2026-12-29T00:00:00","toDate":"2027-01-03T23:59:00"` | 繰り返しの無い例外日では実日付の範囲、繰り返しの例外日では繰り返しの起点であって実日付の範囲ではない（`docs/spec/_assets/fig-erd-detail.md:419`、`docs/spec/_source/grs-document.schema.json:1182`）。どちらかは `recurrenceKind` と `carry` の `Period` で決まる | 交換相手の形を保つ | いいえ | はい | 中 |
| 35 | `Exception.recurrenceKind` | `AT-82` | 3・5 | `9`・`null`・`1`（`carry.Period` が無いか `1`） | 「繰り返さない」に 3 つの書き方がある —— `9`、`null`、`1` で `carry` の `Period` が無いか `1`（`docs/spec/_assets/fig-erd-detail.md:422`）。最後の書き方は、`carry`（解釈しないはずの控え）の中身で意味が決まる | 交換相手の形を保つ | いいえ | はい | 低 |
| 36 | `WeekDay.workingTimes`・`Exception.workingTimes`（と `dayWorking`） | `AT-158`・`AT-159` | 3・5 | `"dayWorking":true,"workingTimes":[]` | 空の並びが 2 つの意味を持つ。稼働日なら「既定の時間帯（08:00-12:00、13:00-17:00）で読む」（`docs/spec/_assets/fig-erd-detail.md:414`、`docs/spec/_source/grs-document.schema.json:1138`）。不変条件は「0 本は稼働でない日」と言う（`docs/spec/05-07-design.md:1347` の `IV-24`）。どちらかは `dayWorking` で決まる | 交換相手の形を保つ。`IV-24` の「0 本（稼働でない日）」を、`AT-158` の読み方と食い違わない書き方に直す | いいえ | はい | 中 |
| 37 | `WorkingTime.toTime` | `AT-162` | 3 | `"00:00:00"` | 終わりの `00:00:00` は 24:00（その日の終わり）と読む（`docs/spec/_assets/fig-erd-detail.md:428`）。始まりの `00:00:00` はその日の始まりなので、同じ字面が欄で意味を変える | 交換相手の形を保つ | いいえ | はい | 低 |
| 38 | `Project.weekStartDay`・`WeekDay.dayType` | `AT-17`・`AT-73` | 7 | 日曜 ＝ `0`（`weekStartDay`）、日曜 ＝ `1`（`dayType`） | 同じ曜日を 2 つの番号の体系で書く（`docs/spec/_assets/fig-erd-detail.md:351`・`:412`）。`dayType` の `0` は交換相手では例外日を言うが、本列は取らない | 交換相手の形を保つ（仕様は既に警告している） | いいえ | はい | 低 |

### 2.8 依存・担当・プロジェクト（交換相手の形）

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 39 | `Dependency.linkType` | `AT-46` | 7 | `0` ＝ FF、`1` ＝ FS、`2` ＝ SF、`3` ＝ SS | 数が種別の名を言わず、並びも直感と違う（`0` が終了-終了）（`docs/spec/_assets/fig-erd-detail.md:386`） | 交換相手の符号を保つ | いいえ | はい | 低 |
| 40 | `Resource.resourceKind`・`Resource.isCostResource` | `AT-87`・`AT-88` | 8 | `"resourceKind":2`（費用）と `"isCostResource":true` | 「費用の資源か」を 2 か所で言える（`docs/spec/_assets/fig-erd-detail.md:431`・`:432`）。食い違ったときにどちらを読むかが書かれていない | 交換相手の形を保つ | いいえ | はい | 低 |
| 41 | `Project.name`・`Project.title` | `AT-2`・`AT-3` | 7 | — | `name` は画面に出さず、画面の文書名は `title` である（`docs/spec/_assets/fig-erd-detail.md:337`・`:338`）。「名」と言う欄が文書の名ではない | 交換相手の名を保つ（スキーマの説明は既に書いている） | いいえ | はい | 低 |
| 42 | `Project.id` | `AT-1` | 7・5 | `null` | 名は `id` だが主キーにしない。省いたときは `TaskOrigin.importSessionId` が代わりを務める（`docs/spec/_assets/fig-erd-detail.md:336`） | 交換相手の形を保つ | いいえ | はい | 低 |
| 43 | `Project.minutesPerDay` | `AT-14` | 8・3 | `null` ＝ 480 | 「期間とラグの 1 日を何分と数えるか」と「稼働日 1 日の分数と等しいはず」の 2 つを 1 つの数が負い、違うと開くたびに告げる（`docs/spec/_source/grs-document.schema.json:649`）。`null` は 480 | 交換相手の形を保つ | いいえ | はい | 低 |
| 44 | `Task.calendarUid`・`Resource.calendarUid` | `AT-33`・`AT-89` | 8 | `3` | 名は暦を指すが、稼働日の数え上げには使わず、往復のためだけに持つ（`docs/spec/_assets/fig-erd-detail.md:373`・`:433`）。`Project.calendarUid` と同じ名で役が違う | 交換相手の形を保つ | いいえ | はい | 低 |

### 2.9 取り込みの記録と控え

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 45 | `Project.sourceFormat` | `AT-143` | 2・8 | `"grs"`・`"pj12"`・`"pj15"` | 列挙が「自前の形式」と「交換相手の形式の版」を 1 つに並べる。この列を持たない文書では `carry` の `SaveVersion` から見分ける（`docs/spec/_assets/fig-erd-detail.md:362`）ので、版を 2 か所に持つ | `{"origin":"grs"}` か `{"origin":"mspdi","schema":"pj15"}`。列は必須なので `carry` からの見分けはやめる | はい | いいえ | 低 |
| 46 | `Project.carry`・`Exception.carry`（とほかの `carry`・`carryElements`） | `AT-22`・`AT-83` | 7・8 | `carry.SaveVersion`・`carry.Period` | `carry` は「`GRS` が解釈しない値」と言う（`docs/spec/_source/grs-document.schema.json:1798`）が、`GRS` は `Project.carry` の `SaveVersion` で元の形式を見分け（`AT-143`）、`Exception.carry` の `Period` で繰り返しかどうかを決める（`AT-82`、`docs/spec/_assets/fig-erd-detail.md:422`）。「解釈しない」の中に解釈する鍵が混じる | `GRS` が読む鍵は列に上げる（例 `Exception.recurrencePeriod`）。`carry` には本当に読まない値だけを残す | はい（`Period` を列に移すなら） | 一部（中身は交換相手の値。どれを読むかは `GRS`） | 中 |
| 47 | `TaskOrigin.sourceProjectId`・`TaskOrigin.importSessionId` | `AT-106`・`AT-109` | 5 | `"sourceProjectId":null,"importSessionId":"…"` | 取り込み元のプロジェクトは `sourceProjectId` が言い、元の `Project.id` が無いときは `importSessionId` が代わりを務める（`docs/spec/_assets/fig-erd-detail.md:336`・`:448`・`:451`）。照合の鍵がどちらの欄かは、もう一方が空かどうかで決まる | `"sourceKey":{"projectId":"…"}` か `"sourceKey":{"importSessionId":"…"}` | はい | いいえ | 低 |

### 2.10 刻印と書き手

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 48 | `documentStamp.settingsUpdatedAt` | `AT-129` | 7 | `"2026-10-24T12:00:00Z"` | 名は「設定が変わった刻」と言うが、中身は「どちらの群であれ動いた刻」である（`docs/spec/_assets/fig-erd-detail.md:485`）。日程データだけが動いても進む。名を信じて「設定だけの変化」と読むと間違える | `documentUpdatedAt`（日程データだけの刻は `scheduleUpdatedAt` のまま） | はい | いいえ | 中 |
| 49 | `documentStamp.lastEditedBy`（と、同じ語を使うなら `changeLog.editedBy`） | `AT-128`（`AT-131`） | 2 | `"user"`・`"template"`・呼び手が申告した名 | 決まった語（`user` ＝ 画面を操作する人、`template` ＝ 出荷する起動テンプレート）と、呼び手が自由に名乗る名を同じ字列に入れる（`docs/spec/01-04-requirements.md:8176`〜`:8178` の 表 T-229）。呼び手が `user` と名乗れば人と見分けられない（同 `:231` の `LM-16` は呼び手どうしの重なりを言う） | `{"kind":"user"}`・`{"kind":"template"}`・`{"kind":"agent","name":"…"}` | はい | いいえ | 中 |

### 2.11 表の見え方（`documentSettings.tableViews` が持つ `ColumnFilter`・`ColumnSort`）

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | `ColumnFilter.column`・`ColumnSort.column` | （表 T-372） | 7・8 | `"SQ-5"` | 列を仕様書の表の行 ID で指す（`docs/spec/_assets/tbl-settings.md:258`・`:262`）。行 ID は仕様書の中の番号であり、ファイルの形が仕様書の番号の付け方に縛られる。番号を振り直すと古いファイルの値が別の列を指すか、何も指さなくなる（表に無い列は開くときに捨てる —— 同 `:214`） | 列の名を表す変わらない鍵: `"column":"taskName"` | はい | いいえ | 中 |
| 51 | `ColumnFilter.hiddenValues` | （表 T-372） | 3・7 | `["山田",""]` | 外した値を画面に出る語で持つ。空の字列は「（空白）」の項目を言う。担当の列では担当の `uid` ではなく名を持つので、改名すると何にも当たらなくなる（`docs/spec/_assets/tbl-settings.md:259`）。語が画面の言語で変わるかは決めきれなかった（§1.3） | `{"hidden":["山田"],"hideBlank":true}`、担当の列は `"hiddenResourceUids":[4]` | はい | いいえ | 中 |
| 52 | `ColumnFilter.fromDate`・`ColumnFilter.toDate` | （表 T-372） | 5 | 日付の列では日付、ほかの列では `null` | 日付の列だけが置き、ほかの列と置いていない列は `null`（`docs/spec/_assets/tbl-settings.md:260`・`:261`）。`null` が「この列は日付でない」と「範囲を決めていない」の 2 つを言い、どちらかは `column` で決まる | `"filter":{"kind":"values","hidden":[…]}` か `"filter":{"kind":"dateRange","firstDay":"…","lastDay":"…"}` | はい | いいえ | 低 |

### 2.12 画面の状態（`documentSettings`）

| No. | エンティティ.欄 | AT- | 種類 | 仕様にある値の例 | なぜ 2 つ以上の意味か | よりきれいな形 | 古いファイルが壊れるか | MSPDI に縛られるか | 重さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 53 | `scrollDate`・`scrollDateFraction`（と `scrollTaskGroupId`・`scrollTaskGroupFraction`） | （`S-77`・`S-177`・`S-78`・`S-176`） | 1・5 | `"scrollDate":"2026-10-01T00:00:00","scrollDateFraction":0.25` | 横の位置を「日」と「その日の中の割合」の 2 つに分けて持つが、`scrollDate` は時刻を書ける型で、時刻はいつも `00:00:00` である（`docs/spec/_assets/tbl-settings.md:203`・`:206`、`docs/spec/01-04-requirements.md:7143` の `WT-8`）。割合の意味は `scrollDate` で決まる | `"scrollDate":"2026-10-01"`（日付だけ）と割合。縦は今のまま | はい | いいえ | 低 |
| 54 | `fitSpanStart`・`fitSpanFinish`・`isFitSpanFixed` | （`S-518`・`S-519`・`S-532`） | 5・8 | `"fitSpanStart":null,"fitSpanFinish":"…"` | 1 つの「全体表示の期間」を 3 つの鍵で持ち、片方だけの値と前後逆の値を読むときの規則（`FX-1`）が要る（`docs/spec/_assets/tbl-settings.md:181`・`:208`、`docs/spec/01-04-requirements.md:6434`） | `"fitSpan":null` か `{"firstDay":"2026-10-01","lastDay":"2026-12-31","fixed":true}` | はい | いいえ | 低 |
| 55 | `fontSizeStep`・`displayScale`・`rulerFontSizePx`・`rulerHeightPx` | （`S-70`・`S-234`・`S-3`・`S-2`） | 5・8 | `"fontSizeStep":"M","rulerFontSizePx":21,"rulerHeightPx":69` | `fontSizeStep` と `displayScale` の保存値は「初期値」で、読む人の指定が上書きする（`docs/spec/_assets/tbl-settings.md:27`）—— ほかの保存値と違い、値は「この文書の絵」ではなく「開いたときの始まり」を言う。`rulerFontSizePx` と `rulerHeightPx` の既定は `fontSizeStep` から決まるが、鍵は独立に保つ（同 `:178`・`:179`） | 今のまま。初期値であることをスキーマの説明に書く | いいえ | いいえ | 低 |

### 2.13 妥当と判じた特別な値（参考）

次の特別な値は、意味が 1 つで「無い」か「既定」をはっきり言うので、所見にしなかった。

| 欄 | 値 | 意味 | 出典 |
| --- | --- | --- | --- |
| `Task.parentTaskUid`・`TaskGroup.parentId` | `null` | 根 | `docs/spec/_assets/fig-erd-detail.md:365`・`:392` |
| `TaskGroup.minHeightPx` | `null` | 下限なし（チェックを外したこと） | `docs/spec/_assets/fig-erd-detail.md:399`、`docs/spec/01-04-requirements.md:2326` の `MH-2` |
| `TaskVisual.strokeWidthPx`・`CommentBox.strokeWidthPx`・`CommentBox.fillTransparencyPercent`・`CommentBox.fontSizePx`・`HighlightBox.strokeWidthPx`・`HighlightBox.fillTransparencyPercent` | `null` | 表 T-201 ／ T-217 の既定 | `docs/spec/_assets/fig-erd-detail.md:446`・`:464`・`:466`・`:468`・`:476`・`:478` |
| `Project.defaultStartTime`・`Project.defaultFinishTime` | `null` | `08:00:00` ／ `17:00:00` | `docs/spec/_source/grs-document.schema.json:683`・`:687` |
| `documentStamp.fileSavedAt` | `null` | まだ 1 度もファイルへ書いていない | `docs/spec/_assets/fig-erd-detail.md:486` |
| `ColumnSort`（値の全体） | `null` | 並べ替えていない（既定の並び） | `docs/spec/_assets/tbl-settings.md:262` |
| `scrollDate`・`scrollTaskGroupId` | `null` | 人がまだ場所を決めていない | `docs/spec/_assets/tbl-settings.md:203`・`:204` |
| `TaskOrigin` の行の欠け | — | `GRS` で生まれたタスク | `docs/spec/_assets/fig-erd-detail.md:447` |
| `tableViews.resourceList.isUnassignedShown` | — | （担当なし）の行に `uid` が無いので、番兵の `uid` を作らず別の真偽で持つ | `docs/spec/_assets/tbl-settings.md:222` |

### 2.14 数のまとめ

| 重さ | 数 | 所見の番号 |
| --- | --- | --- |
| 高 | 4 | 01・02・03・08 |
| 中 | 21 | 04・05・06・09・10・12・13・15・16・17・19・22・27・30・34・36・46・48・49・50・51 |
| 低 | 30 | 07・11・14・18・20・21・23・24・25・26・28・29・31・32・33・35・37・38・39・40・41・42・43・44・45・47・52・53・54・55 |
| 計 | 55 | — |

55 のうち、MSPDI に縛られる（形を変える対象の外）のは 17（10・11・17・19・20・26 の大半・34〜44）、一部縛られるのは 2（08・46）である。

## 3. 調べて所見の無かった欄

### 3.1 `$defs` の下（85 欄）

| エンティティ | 所見の無い欄 |
| --- | --- |
| `Project`（18） | `title`・`subject`・`category`・`company`・`manager`・`author`・`revision`・`minutesPerWeek`・`daysPerMonth`・`calendarUid`・`defaultStartTime`・`defaultFinishTime`・`themeHue`・`uidHighWaterMark`・`importSequence`・`carryElements`・`outlineBase`・`scheduleDataTimeZone` |
| `Task`（11） | `uid`・`parentTaskUid`・`wbsOrder`・`name`・`start`・`finish`・`deadline`・`notes`・`dependencies`・`carry`・`carryElements` |
| `Dependency`（3） | `predecessorUid`・`carry`・`carryElements` |
| `TaskGroup`（3） | `id`・`parentId`・`order` |
| `TaskGroupMember`（2） | `taskUid`・`taskGroupId` |
| `Calendar`（8） | `uid`・`name`・`baseCalendarUid`・`ordinal`・`carry`・`carryElements`・`weekDays`・`exceptions` |
| `WeekDay`（3） | `ordinal`・`carry`・`carryElements` |
| `Exception`（3） | `ordinal`・`name`・`carryElements` |
| `WorkingTime`（2） | `ordinal`・`fromTime` |
| `Resource`（4） | `uid`・`name`・`carry`・`carryElements` |
| `Assignment`（5） | `uid`・`taskUid`・`resourceUid`・`carry`・`carryElements` |
| `TaskVisual`（1） | `strokeWidthPx` |
| `TaskOrigin`（3） | `taskUid`・`sourceUid`・`lastSeenImportSequence` |
| `CommentBox`（2） | `id`・`text` |
| `HighlightBox`（3） | `id`・`topTaskGroupId`・`bottomTaskGroupId` |
| `CarryElement`（4） | `ordinal`・`name`・`fields`・`children` |
| `documentStamp`（2） | `scheduleUpdatedAt`・`fileSavedAt` |
| `changeLog`（3） | `ordinal`・`explanation`・`changedAt` |
| `BaselineTask`（4） | `uid`・`name`・`start`・`finish` |
| `ColumnFilter`（0） | —（4 欄とも所見 50〜52 に出る） |
| `ColumnSort`（1） | `direction` |

`Task.start`・`Task.finish` ほかの日時の欄は、所見 08（型の差の扱い）だけに当たり、欄そのものの意味は 1 つなので、ここに並べた。
同じく `Project.scheduleDataTimeZone` は所見 13 で比べる相手として出るが、取る鍵は標準時だけで意味は 1 つである。

### 3.2 `documentSettings`（32 欄）

| 群 | 所見の無い欄 |
| --- | --- |
| 直下（19） | `isActualVisible`・`isAssigneeVisible`・`isBaselineVisible`・`isDateGridLinesVisible`・`isDependencyVisible`・`isGroupGridLinesVisible`・`isPercentCompleteVisible`・`isPlanDatesVisible`・`isPlanVisible`・`isProgressLineVisible`・`isProgressMarkerVisible`・`isTaskGroupPanelWidthFixed`・`isThemeMonochrome`・`isTimeOfDayVisible`・`levelZeroTreeState`・`pinnedTaskGroupIds`・`scrollTaskGroupId`・`stackDirection`・`tableViews` |
| `tableViews.delayDiagnosticsReport`（4） | `columnFilters`・`isScheduleFilterApplied`・`shownTaskUids`・`sort` |
| `tableViews.resourceList`（5） | `columnFilters`・`isScheduleFilterApplied`・`isUnassignedShown`・`shownResourceUids`・`sort` |
| `tableViews.searchPanel`（4） | `columnFilters`・`isScheduleFilterApplied`・`shownTaskUids`・`sort` |

`columnFilters` と `sort` の中身の形は `ColumnFilter`・`ColumnSort` の所見（50〜52）が持つ。

### 3.3 最上段（6 キー）

`$schema`・`schemaVersion`・`schedule`・`documentSettings`・`documentStamp`・`changeLog`
