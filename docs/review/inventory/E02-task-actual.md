# E02 — Task (actual side)

`Task` の実績・進捗側の全数調査。**正は `plan-actual-decisions-ja.md` であって ERD ではない。**
MSPDI の事実は `docs/reference/mspdi/mspdi_pj12.xsd`（実在・3906 行）で確かめた。確かめられないものは「未検証」と書く。

## 読んだ原典

| # | ファイル | 行数 | 読んだ範囲 | 位置づけ |
| --- | --- | --: | --- | --- |
| 1 | `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` | 1348 | **全文** | 予実・進捗の**正** |
| 2 | `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 | **全文** | データ構造。予実部分は**旧版**（冒頭 22–37 行が自ら上書きを宣言） |
| 3 | `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md` | 677 | **全文** | MSPDI 全要素の仕分け。予実部分は 20–31 行が自ら上書きを宣言 |
| 4 | `docs/reference/mspdi/mspdi_pj12.xsd` | 3906 | 実績側の全要素を照合 | **MSPDI の正** |
| 5 | `docs/reference/mspdi/learn-docs/project-xml-data-interchange/*.md` | 381 ファイル | 実績側 7 要素 | 上流の要素別解説書（plan-actual が「解説書」と呼ぶもの） |
| 6 | `docs/spec/_assets/tbl-glossary.md` | 259 | **全文** | 仕様書の用語の正。突き合わせ用 |

> 行数は `wc -l` で自分で数えた。

---

## 1. 保存する実績側の列（GRS ネイティブ・すべて `Task` の列）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Task.actualStart` | 日付（MSPDI は `xsd:dateTime`） | 可 | — | — | Own | `Task/ActualStart` | `null` | 実績バーの左端。**人が置く日付**。空 = 未着手。進捗の塗りの起点は `Start` ではなく `ActualStart`（ユーザー判断で確定） | plan-actual-decisions-ja.md:54 / plan-actual-decisions-ja.md:208 / plan-actual-decisions-ja.md:1308 / grs-native-erd-ja.md:261 / grs-native-erd-ja.md:1512 / grs-mspdi-field-ledger-ja.md:453 / mspdi_pj12.xsd:1919 |
| `Task.actualDuration` | 整数（**稼働日数**）。MSPDI 側は `xsd:duration` | 可 | — | — | **Own**（台帳の旧仕分け `Carry` から昇格） | `Task/ActualDuration` | `null` | **実績バーの長さそのもの。** 右端 = `actualStart` ＋ `actualDuration`（稼働日で加算）。境界で `Project.minutes_per_day` を使って `xsd:duration` と相互変換する。**端数は丸めない** — 割り切れないときは `carry` に原文字列を保持し、未編集なら原値を書き戻す。表示単位は `Task/DurationFormat` に従う | plan-actual-decisions-ja.md:55 / plan-actual-decisions-ja.md:67 / grs-native-erd-ja.md:262 / grs-native-erd-ja.md:1513 / grs-native-erd-ja.md:1524 / grs-native-erd-ja.md:1644 / grs-mspdi-field-ledger-ja.md:24 / grs-mspdi-field-ledger-ja.md:456 / mspdi_pj12.xsd:1929 |
| `Task.actualFinish` | 日付 | 可 | — | — | Own | `Task/ActualFinish` | `null` | **完了時だけ**入る。完了を押しても右端は 1 日も動かない（右端の日付がそのまま入る）。**完了と「中断・再開日未定」はこの有無で一意に分かれる**。値があるとき右端に実線の縦キャップを描く | plan-actual-decisions-ja.md:56 / plan-actual-decisions-ja.md:120 / plan-actual-decisions-ja.md:212 / plan-actual-decisions-ja.md:215 / grs-native-erd-ja.md:263 / grs-native-erd-ja.md:1514 / grs-mspdi-field-ledger-ja.md:454 / mspdi_pj12.xsd:1924 |
| `Task.resume` | 日付 | 可 | — | — | **Own（MSPDI ネイティブ）**。旧判断「拡張領域へ回す」は撤回済み | `Task/Resume` | `null` | 中断時のみ。**「残りがいつから始まる予定か」＝未来の予定**であって「最後に再開した日」ではない（⚠️ XSD の documentation は逆を書く。§10 の 1 番） | plan-actual-decisions-ja.md:57 / plan-actual-decisions-ja.md:86 / plan-actual-decisions-ja.md:552 / plan-actual-decisions-ja.md:1157 / grs-native-erd-ja.md:266 / grs-native-erd-ja.md:1517 / grs-mspdi-field-ledger-ja.md:446 / mspdi_pj12.xsd:1752 |
| `Task.resumeValid` | 真偽 | 可 | — | — | **Own**（台帳の旧仕分け `Carry` から昇格） | `Task/ResumeValid` | `null` | `false` = **再開日未定の中断（＝中止）**。「中止」という専用の概念・専用の枠を作らない。拡張領域を **0 枠**で表現する | plan-actual-decisions-ja.md:58 / plan-actual-decisions-ja.md:121 / plan-actual-decisions-ja.md:1186 / grs-native-erd-ja.md:267 / grs-native-erd-ja.md:1517 / grs-mspdi-field-ledger-ja.md:26 / grs-mspdi-field-ledger-ja.md:447 / mspdi_pj12.xsd:1757 |
| `Task.percentComplete` | **整数、0 以上。上限を型に持たせない** | 可 | — | — | Own | `Task/PercentComplete` | `null` | `round( actualDuration ÷ (finish − start) × 100 )`（いずれも稼働日）。**格納する**（日付を編集したら再計算）。分母は予定の期間で、`actualStart` が `start` より後でも変わらない。完了したら 100 とする。**「0〜100」と書いてはならない**（読んだ実装者が必ずクランプを書き、「予定 10 日の仕事に 15 日かかった」という事実を消す）。人が直接入力する入口を作らない | plan-actual-decisions-ja.md:59 / plan-actual-decisions-ja.md:128 / plan-actual-decisions-ja.md:131 / plan-actual-decisions-ja.md:152 / plan-actual-decisions-ja.md:156 / plan-actual-decisions-ja.md:981 / grs-native-erd-ja.md:264 / grs-native-erd-ja.md:1515 / grs-mspdi-field-ledger-ja.md:455 / mspdi_pj12.xsd:1894 |
| `Task.milestone` | 真偽 | 可 | — | — | Own | `Task/Milestone` | `null` | 実績側の効き: 実績の端点も進捗の掴み点も持たず、`percentComplete` は **0 か 100 のみ**、`actualDuration` は **0**、予定の期間も **0**（0 除算を避けること）。実績 ◇ は `actualFinish` の位置に描き、無ければ描かない。不変条件 `shapeKind = 'milestone'` ⇔ `Task.milestone = true`（**権威は `Task.milestone`** ＝ export される側）。**`Task/Type` でマイルストーンを判定してはならない**（MSPDI に同名の `Type` が 3 つある）。⚠️ **用語辞書と食い違う**（§10 の 2 番） | plan-actual-decisions-ja.md:61 / plan-actual-decisions-ja.md:196 / plan-actual-decisions-ja.md:199 / plan-actual-decisions-ja.md:242 / plan-actual-decisions-ja.md:263 / plan-actual-decisions-ja.md:356 / plan-actual-decisions-ja.md:371 / grs-native-erd-ja.md:260 / grs-native-erd-ja.md:1511 / grs-mspdi-field-ledger-ja.md:435 / mspdi_pj12.xsd:1782 / tbl-glossary.md:25 |

**この 7 列で 5 状態がすべて表せる。拡張領域を 1 枠も使わない。**
拡張領域を使うのは `fadeInDays` / `fadeOutDays` の 2 枠だけで、これは実績側ではない（旧 6 枠 → 2 枠）。
出典 `plan-actual-decisions-ja.md:102`, `plan-actual-decisions-ja.md:1182`, `grs-native-erd-ja.md:37`。

---

## 2. 保存しない実績側の値（export で作り直す／描画時に導出する）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `stop`（保存しない） | 日付 | — | — | — | **Reconstruct**（⚠️ 台帳は `Own` と書く。§10 の 3 番） | `Task/Stop` | 書かない | **保存しない。** export 時に `actualStart + actualDuration` で算出し、**中断のときだけ**書く。中断していないタスクに書くと相手ツールが「このタスクは分割されている」と解釈して隙間を描く恐れがある（解説書にその挙動の記述はなく確かめる術がない）。実績の長さは `ActualDuration` で伝える | plan-actual-decisions-ja.md:70 / plan-actual-decisions-ja.md:112 / plan-actual-decisions-ja.md:1128 / plan-actual-decisions-ja.md:1141 / grs-native-erd-ja.md:1518 / grs-mspdi-field-ledger-ja.md:445 / mspdi_pj12.xsd:1747 |
| 実績バーの右端（**名前は未確定**） | 日付 | — | — | — | GRS（導出・保存しない） | — | — | `actualStart + actualDuration`（稼働日で加算）。**保存しない。** イナズマ線の「進行中」の頂点でもある。基準日を動かしてもこの値は動かない | plan-actual-decisions-ja.md:64 / plan-actual-decisions-ja.md:67 / plan-actual-decisions-ja.md:209 / plan-actual-decisions-ja.md:213 / plan-actual-decisions-ja.md:728 |
| 状態（5 値。**名前は未確定**） | 列挙 | — | — | — | GRS（導出・保存しない） | — | — | §3 の 5 列から一意に決まる。**`progressStatus`（自由文字列）は廃止**。状態は 5 つ、Progress Marker の記号は 4 つ。混同しないこと | plan-actual-decisions-ja.md:102 / plan-actual-decisions-ja.md:115 / plan-actual-decisions-ja.md:1087 / plan-actual-decisions-ja.md:1091 |
| 遅れ（**名前は未確定**） | 真偽 | — | — | — | GRS（導出・保存しない） | — | — | **状態ではなく導出。** 上の 5 状態のどれとも並ばない。判定は 3 条件（§4）。`Project.status_date` と比較する | plan-actual-decisions-ja.md:122 / plan-actual-decisions-ja.md:409 / grs-native-erd-ja.md:1570 / tbl-glossary.md:80 |
| Progress Marker の記号（**名前は未確定**） | 列挙 `(✓)` `(!)` `( \ )` `( )` | — | — | — | GRS（導出・保存しない） | — | — | 5 状態 → 3 記号 ＋ 導出の `(!)`。`(✓)` は**他のどの判定よりも優先**。`( )` は選択したときだけ薄く出す。記号は SVG で描く（フォントの字形に依存しない）。表示トグルの状態は `documentSettings.progressMarkerVisible`（既定 `true`）で、MSPDI へは書かない | plan-actual-decisions-ja.md:115 / plan-actual-decisions-ja.md:403 / plan-actual-decisions-ja.md:429 / plan-actual-decisions-ja.md:431 / grs-native-erd-ja.md:1363 |

---

## 3. GRS が解釈しない実績側の MSPDI 要素（Carry。往復のため温存する）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RemainingDuration` | `xsd:duration` | 可 | — | — | **Carry（完了時だけ GRS が `0` を書く＝ Own 扱い。Carry の唯一の例外）** | `Task/RemainingDuration` | — | 進行中は `Duration − 進捗` が破綻するので再計算できない。完了時は `ActualFinish` が入っており残りが 0 と確定するので破綻しない | plan-actual-decisions-ja.md:137 / plan-actual-decisions-ja.md:1136 / grs-native-erd-ja.md:1641 / grs-mspdi-field-ledger-ja.md:457 / mspdi_pj12.xsd:1959 |
| `PercentWorkComplete` | `xsd:integer` | 可 | — | — | Carry | `Task/PercentWorkComplete` | — | 工数管理は非対象 | grs-mspdi-field-ledger-ja.md:458 / mspdi_pj12.xsd:1899 |
| `PhysicalPercentComplete` | `xsd:integer` | 可 | — | — | Carry | `Task/PhysicalPercentComplete` | — | EVM 非対象 | grs-mspdi-field-ledger-ja.md:466 / mspdi_pj12.xsd:2146 |
| `ActualWork` | `xsd:duration` | 可 | — | — | Carry | `Task/ActualWork` | — | 工数側は再計算も削除もせず温存して通知する | plan-actual-decisions-ja.md:1235 / grs-mspdi-field-ledger-ja.md:459 / mspdi_pj12.xsd:1944 |
| `ActualOvertimeWork` | `xsd:duration` | 可 | — | — | Carry | `Task/ActualOvertimeWork` | — | 同上 | grs-mspdi-field-ledger-ja.md:459 / mspdi_pj12.xsd:1949 |
| `ActualWorkProtected` | `xsd:duration` | 可 | — | — | Carry | `Task/ActualWorkProtected` | — | 同上 | grs-mspdi-field-ledger-ja.md:459 / mspdi_pj12.xsd:2238 |
| `ActualOvertimeWorkProtected` | `xsd:duration` | 可 | — | — | Carry | `Task/ActualOvertimeWorkProtected` | — | 同上 | grs-mspdi-field-ledger-ja.md:459 / mspdi_pj12.xsd:2243 |
| `RegularWork` | `xsd:duration` | 可 | — | — | Carry | `Task/RegularWork` | — | 同上 | grs-mspdi-field-ledger-ja.md:459 / mspdi_pj12.xsd:1954 |
| `OvertimeWork` | `xsd:duration` | 可 | — | — | Carry | `Task/OvertimeWork` | — | 同上 | grs-mspdi-field-ledger-ja.md:459 / mspdi_pj12.xsd:1914 |
| `RemainingWork` | `xsd:duration` | 可 | — | — | Carry | `Task/RemainingWork` | — | 同上 | grs-mspdi-field-ledger-ja.md:459 / mspdi_pj12.xsd:1969 |
| `RemainingOvertimeWork` | `xsd:duration` | 可 | — | — | Carry | `Task/RemainingOvertimeWork` | — | 同上 | grs-mspdi-field-ledger-ja.md:459 / mspdi_pj12.xsd:1979 |
| `ActualCost` | `xsd:decimal` | 可 | — | — | Carry | `Task/ActualCost` | — | コスト管理は非対象 | grs-mspdi-field-ledger-ja.md:465 / mspdi_pj12.xsd:1934 |
| `ActualOvertimeCost` | `xsd:decimal` | 可 | — | — | Carry | `Task/ActualOvertimeCost` | — | 同上 | grs-mspdi-field-ledger-ja.md:465 / mspdi_pj12.xsd:1939 |
| `RemainingCost` | `xsd:decimal` | 可 | — | — | Carry | `Task/RemainingCost` | — | 同上 | grs-mspdi-field-ledger-ja.md:465 / mspdi_pj12.xsd:1964 |
| `RemainingOvertimeCost` | `xsd:decimal` | 可 | — | — | Carry | `Task/RemainingOvertimeCost` | — | 同上 | grs-mspdi-field-ledger-ja.md:465 / mspdi_pj12.xsd:1974 |
| `BCWS` | `xsd:float` | 可 | — | — | Carry | `Task/BCWS` | — | EVM 非対象 | grs-mspdi-field-ledger-ja.md:466 / mspdi_pj12.xsd:2136 |
| `BCWP` | `xsd:float` | 可 | — | — | Carry | `Task/BCWP` | — | 同上 | grs-mspdi-field-ledger-ja.md:466 / mspdi_pj12.xsd:2141 |
| `ACWP` | `xsd:float` | 可 | — | — | Carry | `Task/ACWP` | — | 同上 | grs-mspdi-field-ledger-ja.md:466 / mspdi_pj12.xsd:1984 |
| `CV` | `xsd:float` | 可 | — | — | Carry | `Task/CV` | — | 同上。⚠️ **2 文字の略語**なので GRS 側へ写さない | grs-mspdi-field-ledger-ja.md:466 / mspdi_pj12.xsd:1989 |
| `EarnedValueMethod` | 整数（enum） | 可 | — | — | Carry | `Task/EarnedValueMethod` | — | 同上 | grs-mspdi-field-ledger-ja.md:466 / mspdi_pj12.xsd:2151 |
| `DurationFormat` | 整数（enum 26 値） | 可 | — | — | Carry（**ただし export で読む**） | `Task/DurationFormat` | — | `xsd:duration` を整形するときだけ読む。**Carry は「書き戻すだけ」であって「読まない」ではない。** `7=d`（日）/ `8=ed`（経過日）があり、稼働日と暦日の区別がここにある。既存規則「元の値の書式を踏襲する」が効く | plan-actual-decisions-ja.md:146 / plan-actual-decisions-ja.md:1249 / grs-native-erd-ja.md:1534 / grs-mspdi-field-ledger-ja.md:432 / mspdi_pj12.xsd:1707 |
| `Type`（`Task` 下） | 整数 0/1/2 | 可 | — | — | Carry | `Task/Type` | — | "0=Fixed Units, 1=Fixed Duration, 2=Fixed Work"。**これでマイルストーンを判定してはならない。** ⚠️ 汎用語だが MSPDI 側の名前なので改名できない。**GRS 側へは写さない**ので規約違反にならない | plan-actual-decisions-ja.md:368 / plan-actual-decisions-ja.md:371 / grs-mspdi-field-ledger-ja.md:434 / mspdi_pj12.xsd:1630 |
| `TimephasedData`（`Task` 下） | 要素（`maxOccurs="unbounded"`） | 可 | — | — | Carry（要素まるごと） | `Task/TimephasedData` | — | 中身は**工数・原価・完了率の時間配分**であって、**バーの分割区間を表す構造ではない**。GRS も分割区間のリストを持たない（持てば往復で必ず落ちる） | plan-actual-decisions-ja.md:97 / plan-actual-decisions-ja.md:100 / plan-actual-decisions-ja.md:1250 / grs-mspdi-field-ledger-ja.md:494 / mspdi_pj12.xsd:2473 |

**この節の 23 行はすべて `Drop` ではない。** Drop=0 は入口（import の再合成検査）と出口（未編集往復の差分ゼロ）で機械検証される。
出典 `grs-mspdi-field-ledger-ja.md:636`, `grs-native-erd-ja.md:1706`。

---

## 4. 5 状態の判別（拡張領域を 1 枠も使わない）

**表 E02-1 — 5 状態**（`plan-actual-decisions-ja.md:104`–`110` を写した。`Stop` 列は保存項目ではなく export 時の書き分け）

| 状態 | `actualStart` | `actualDuration` | `actualFinish` | `resume` | `resumeValid` | `Stop`（export） |
| --- | --- | --- | --- | --- | --- | --- |
| 未着手 | 空 | 空 | 空 | 空 | — | 書かない |
| 進行中 | あり | あり | 空 | 空 | true | 書かない |
| 中断・再開予定あり | あり | あり | 空 | **日付** | true | **書く** |
| 中断・再開日未定 | あり | あり | 空 | 空 | **false** | **書く** |
| 完了 | あり | あり | **あり** | 空 | false | 書かない |

**判別式**（表 E02-1 から導いた。原典は表の形でしか示していない）

```
1. actualStart が空          → 未着手
2. actualFinish がある        → 完了
3. resume がある              → 中断・再開予定あり
4. resumeValid = false        → 中断・再開日未定
5. それ以外                   → 進行中
```

- 順序に意味がある。**完了と「中断・再開日未定」は `actualFinish` の有無だけで一意に分かれる**（`resumeValid` はどちらも `false` なので分離に使えない）。原典が明記している（`plan-actual-decisions-ja.md:120`）。
- 「中止」（もう再開しない）は**中断・再開日未定と同じもの**。専用の概念を作らない（`plan-actual-decisions-ja.md:121`）。
- **遅れは状態ではない。** 上の 5 状態のどれとも並ばない導出値である（`plan-actual-decisions-ja.md:122`）。
- **記号は 4 つ、状態は 5 つ。** 未着手＋進行中 → `( )`、中断 2 種 → `( \ )` に畳むので、5 状態 → 3 記号 ＋ 導出の `(!)` になる（`plan-actual-decisions-ja.md:115`）。かつて見出しが「4 状態」だったのはこの記号の数と取り違えたためである（`plan-actual-decisions-ja.md:118`）。
- ⚠️ **未着手の `resumeValid` は表で `—`（不問）である。** `null` を書くのか `true` を書くのかは原典に無い → **未検証**。

### 4-1. 遅れ `(!)` を出す 3 条件（確定 2026-08-01）

```
1. finish < 基準日                                期限を過ぎている
2. 未着手           かつ  start  < 基準日          着手予定を過ぎている
3. 中断・再開予定あり  かつ  resume < 基準日          再開予定を過ぎている
```

- 規則は 1 文: **動いているべき日を過ぎたのに動いていなければ `(!)`。**
- 基準日は `Project.status_date`（`grs-native-erd-ja.md:1570` / `tbl-glossary.md:80`）。
- **中断・再開日未定（`resumeValid = false`）は条件 3 に当たらない** — 再開予定日そのものが無いので「過ぎている」と言えない。ただし条件 1 には当たりうる（`plan-actual-decisions-ja.md:423`）。
- 条件 2・3 の判定日は**イナズマ線が頂点を打つ日と同じ日**である（`plan-actual-decisions-ja.md:419`）。
- 出典 `plan-actual-decisions-ja.md:409`–`425`。

### 4-2. イナズマ線の頂点（実績側から見た規則）

| 状態 | 頂点 | 出典 |
| --- | --- | --- |
| 完了 | 打たない | plan-actual-decisions-ja.md:723 |
| 中断・再開日未定 | 打たない（止めると決めたものを遅れとして数えない） | plan-actual-decisions-ja.md:724 |
| 中断・再開予定あり | `resume` < 基準日 なら `resume` に打つ。まだ来ていなければ打たない | plan-actual-decisions-ja.md:725 |
| 未着手 | `start` < 基準日 なら `start` に打つ。まだ来ていなければ打たない | plan-actual-decisions-ja.md:726 |
| 進行中 | **実績バーの右端**（`actualStart + actualDuration`）に打つ | plan-actual-decisions-ja.md:727 |

---

## 5. 中断は 1 回しか記録できない（XSD で確認済み）

**主張**: `Stop` / `Resume` / `ResumeValid` はいずれも **Min 0 / Max 1**。MSPDI は**中断の履歴を持たない**。常に「今の境界」1 つだけを持つ（`plan-actual-decisions-ja.md:88`–`100`）。

**自分で確かめた結果 — 主張は正しい。**

| 要素 | XSD の記述 | 出典 | 解説書の Occurrences | 出典 |
| --- | --- | --- | --- | --- |
| `Stop` | `minOccurs="0"`、`maxOccurs` 属性なし（＝既定 1） | mspdi_pj12.xsd:1747 | Minimum: 0 / Maximum: 1 | stop-element.md:49 |
| `Resume` | `minOccurs="0"`、`maxOccurs` 属性なし（＝既定 1） | mspdi_pj12.xsd:1752 | Minimum: 0 / Maximum: 1 | resume-element.md:49 |
| `ResumeValid` | `minOccurs="0"`、`maxOccurs` 属性なし（＝既定 1） | mspdi_pj12.xsd:1757 | Minimum: 0 / Maximum: 1 | resumevalid-element.md:47 |
| `TimephasedData`（`Task` 下） | `maxOccurs="unbounded"` | mspdi_pj12.xsd:2473 | — | — |

帰結（原典の 3 点。`plan-actual-decisions-ja.md:93`–`95`）:

- 2 回目に中断すると、記録は新しい境界に置き換わる（1 回目は残らない）
- `ActualFinish` が入ると残りの部分が無くなるので `Resume` は意味を失う
- **完了したらバーは 1 本になる**

> **GRS も同じ制約に倣う。分割区間のリストを持たない。持てば往復で必ず落ちる**（`plan-actual-decisions-ja.md:100`）。

---

## 6. `percentComplete` は 0 以上で、上限だけが意図的に無い

| 事項 | 内容 | 出典 |
| --- | --- | --- |
| 型 | 整数、0 以上。**上限を型に持たせない**（確定 2026-07-30） | plan-actual-decisions-ja.md:152 |
| 禁止 | **「0〜100」と書いてはならない。** そう読んだ実装者は必ずバリデーションかクランプを書き、「予定 10 日の仕事に 15 日かかった」という業務上の事実を消す | plan-actual-decisions-ja.md:156 |
| 100 超 | 内部・JSON・MSPDI export とも算出値をそのまま出す。**頭打ちにしない。拡張領域も使わない**（暫定。実機確認で見直す） | plan-actual-decisions-ja.md:165 |
| XSD の裏づけ | `type="xsd:integer"`、**制約ファセットなし**。`<PercentComplete>150</PercentComplete>` は妥当な XML になる | plan-actual-decisions-ja.md:161 / mspdi_pj12.xsd:1894 |
| 解説書の裏づけ | "The percentage of the task duration completed."（範囲の記述なし） | percentcomplete-element.md:20 |
| 残るリスク | MS Project が 100 超をどう扱うか（丸める / 拒否する / 受け入れる）は**未確認**。実機確認 #2 で決着させる | plan-actual-decisions-ja.md:172 / plan-actual-decisions-ja.md:1292 |
| 超過分の保存 | 不要。**日付から常に再計算できる**冗長情報だから | plan-actual-decisions-ja.md:176 |
| 入力の入口 | 右クリックのクイック設定（0/25/50/75/100%）とキーボード増減は**不採用**。率を直接入力させると `percentComplete = round(actualDuration ÷ (finish − start) × 100)` が成り立たなくなる | plan-actual-decisions-ja.md:978 / plan-actual-decisions-ja.md:981 |

⚠️ **`FR-012` が「0〜100 に丸めてはならない」と定める、という指示中の記述は本調査の原典 3 本では確かめられなかった** — `previous-project-result/` は仕様書の `FR-` 番号を持たない。上表のとおり**規則そのものは plan-actual に明記されている**。`FR-012` との対応は**未検証**（`docs/spec` を読む担当が確かめること）。

**自分で数えた**: `plan-actual-decisions-ja.md` 全 1348 行に `FR-` の記載は **0 件**（`grep -c "FR-"`）。

---

## 7. マイルストーンの実績の扱い

**表 E02-2 — タスクとマイルストーンの差**（`plan-actual-decisions-ja.md:193`–`196`）

| | 予定の期間 | `actualDuration` | `percentComplete` |
| --- | --- | --- | --- |
| タスク | `finish − start` | 0 以上 | 0 以上の連続値（通常 0〜100） |
| **マイルストーン** | **0** | **0** | **0 か 100 のみ** |

| 事項 | 決定 | 出典 |
| --- | --- | --- |
| 掴み方 | 実績の端点も進捗の掴み点も無い。**点そのものを掴んで移動する**（平行移動のみ） | plan-actual-decisions-ja.md:198 / plan-actual-decisions-ja.md:679 |
| 0 除算 | 予定の期間が 0 のとき、完了なら 100、そうでなければ 0 | plan-actual-decisions-ja.md:199 |
| 実績の位置 | **実績日（`actualFinish`）の位置へ横にずらす**（確定 2026-08-01）。予定の真下に積む旧案は撤回 | plan-actual-decisions-ja.md:238 / plan-actual-decisions-ja.md:246 |
| 描き方 | 予定 ◇ は中心が `start`（= `finish`）で輪郭、実績 ◇ は中心が `actualFinish` で塗り。上下の中心は同じ。占有する縦幅は ◇ 1 つぶん | plan-actual-decisions-ja.md:240 |
| 未完了のとき | **実績 ◇ を描かない。** 0 か 100 しかないので、描くか描かないかの 2 値でよい | plan-actual-decisions-ja.md:263 |
| 縮小率 | すべてのタスク形状と同じ `actualOfPlan` を掛ける。**マイルストーンも例外ではない**（比が同じであることが規則で、絶対値を揃えるのではない） | plan-actual-decisions-ja.md:282 / plan-actual-decisions-ja.md:296 |
| 行の高さ | 実績を横にずらすので**実績ぶんの高さ確保は要らない**（`arrow` / `endpointSpan` は必要） | plan-actual-decisions-ja.md:380 |
| 段割当 | **マイルストーンを特別扱いしない**（ALIGN-L2-004 は 2026-08-02 に失効）。縦揃えは `stack_order` と人が作る専用の行だけが担う | grs-native-erd-ja.md:1164 / grs-native-erd-ja.md:1173 |
| なぜ横か | マイルストーンの実績は「いつ起きたか」であって「どこまで進んだか」ではない。縦に積んでも遅れは読めないが、**横にずらせば遅れが日数として見える**。加えて縦 2 段は 1 行を 59px にして `Fit` を壊していた（PoC 実測） | plan-actual-decisions-ja.md:254 / plan-actual-decisions-ja.md:257 |

---

## 8. ERD 旧版との差分（9 行・自分で数えた）

`grs-native-erd-ja.md:26`–`35` の上書き宣言表を写した。**行数は 9 で、指示の「9 行」と一致する。**

| # | ERD（旧版）の記述 | 確定（plan-actual が正） | 出典 |
| --- | --- | --- | --- |
| 1 | `progressRatio`（0..1） | **`percentComplete`**（整数・0 以上）。`actualDuration` から算出して格納 | grs-native-erd-ja.md:27 / plan-actual-decisions-ja.md:1083 |
| 2 | `actualFinish` を実績バーの右端とする | **右端は `actualStart + actualDuration`**。`actualFinish` は**完了時だけ**入る | grs-native-erd-ja.md:28 |
| 3 | （無し） | **`actualDuration`** を追加（稼働日数。実績バーの長さそのもの） | grs-native-erd-ja.md:29 |
| 4 | （無し） | **`resumeValid`** を追加（`false` = 再開日未定の中断＝中止） | grs-native-erd-ja.md:30 |
| 5 | `stop` / `resume` は**拡張領域** | **`Stop`/`Resume`/`ResumeValid` は Own（MSPDI ネイティブ）**。§3-4 #8 の判断を撤回 | grs-native-erd-ja.md:31 / plan-actual-decisions-ja.md:1173 |
| 6 | `stop` を保存する | **保存しない。** 中断時の右端と同じ値なので export で算出する | grs-native-erd-ja.md:32 / plan-actual-decisions-ja.md:70 |
| 7 | `importance`（LOD の選別） | **廃止。** LOD は WBS の階層の深さ（`wbs_parent_uid` から導出）で判定 | grs-native-erd-ja.md:33 / plan-actual-decisions-ja.md:825 |
| 8 | `progressStatus`（自由文字列） | **廃止。** 状態が `actualFinish`/`resume`/`resumeValid` で構造化された | grs-native-erd-ja.md:34 / plan-actual-decisions-ja.md:1091 |
| 9 | `iconShapeKind` | **`shapeKind`** へ改名（タスク形状） | grs-native-erd-ja.md:35 / plan-actual-decisions-ja.md:1044 |

**廃止語が ERD 本文に生き残っていないかを機械確認した（自分で grep して数えた）。**

| 廃止語 | ERD 内の出現 | 生きた列として残っているか |
| --- | --- | --- |
| `progressRatio` | 2 件（26 行台の上書き宣言 ／ 1815 行の設計変遷表） | いいえ |
| `importance` | 4 件（33 / 1025 / 1231 / 1490 — すべて「廃止した」という記述） | いいえ |
| `progressStatus` | 2 件（34 / 1231 — 同上） | いいえ |
| `iconShapeKind` | 1 件（35 — 改名の記録） | いいえ |
| 保存する `stop` | 0 件（1518 行は「保存しない」と書いている） | いいえ |

→ **ERD 本体（§5.2 の Mermaid・§7.1 の列表）は既に確定版に更新済み**であり、旧版は宣言表と設計変遷表の中にしか残っていない。ただし**設計変遷表（§8I）の 2 行は更新漏れである**（§10 の 4 番・5 番）。

**関連する廃止**: `planActualStyle`（`'overlap'` / `'separate'`）も廃止済み（上下分離表示そのものの廃止に伴う）。出典 `grs-native-erd-ja.md:1401`。

---

## 9. export の書き分け（実績側）

`plan-actual-decisions-ja.md:1116`–`1130` を写した。

| 場面 | 書く要素 | 値 |
| --- | --- | --- |
| 常に | `ActualStart` | 保存値 |
| 常に | `ActualDuration` | 実績バーの右端 − `actualStart`（稼働日） |
| 未完了のとき | `PercentComplete` | `ActualDuration ÷ (Finish − Start) × 100`（**頭打ちにしない**） |
| 完了のとき | `ActualFinish` | 実際に終わった日 |
| 完了のとき | `RemainingDuration` | **`0` を書く** |
| 完了のとき | `PercentComplete` | **要素そのものを書かない**（空欄にする） |
| 完了のとき | `Stop` / `Resume` | 空 |
| 中断のときだけ | `Stop` | `actualStart + actualDuration` |
| 中断のときだけ | `Resume` / `ResumeValid` | 保存値 |

- **完了時に `PercentComplete` を書かない理由**: `ActualFinish` があり `RemainingDuration` が 0 なら完了はその 2 つで一意に決まる。冗長な `PercentComplete` を併記すると、100 超を丸めない方針と MS Project の意味論が衝突する場面をわざわざ作る。**書かなければ衝突しない**（`plan-actual-decisions-ja.md:142`）。
- **未編集タスクは受け取った値をそのまま書き戻す。** 編集の定義は「`start` / `finish` / `actualStart` / `actualDuration` / `actualFinish` / `resume` のいずれかが変わったタスク」（`plan-actual-decisions-ja.md:1231`–`1234`）。
- **`ActualDuration` の型変換を省くと Drop=0 が静かに壊れる。** 数値としては近い値が出るのでテストが通ってしまう。往復同一性の検査に**期間の文字列一致**を含めること（`grs-native-erd-ja.md:1539`）。
- **round-trip 同一性テストに進行中タスクのケースを必須追加すること**（完了タスクだけの検証では欠落を見逃す。`grs-mspdi-field-ledger-ja.md:649`）。

---

## 10. XSD で確かめた MSPDI の事実（実績側）

| # | 主張（plan-actual §10-7 ほか） | 自分で確かめた結果 | 出典 |
| --- | --- | --- | --- |
| 1 | `CompleteThrough` は**存在しない** | **正しい。** XSD 全文に `name="CompleteThrough"` は 0 件 | plan-actual-decisions-ja.md:1241 / mspdi_pj12.xsd（0 件） |
| 2 | `Active` は**存在しない** | **正しい。** XSD 全文に `name="Active"` は 0 件 | plan-actual-decisions-ja.md:1242 / mspdi_pj12.xsd（0 件） |
| 3 | `IsNull` は存在するが「空行かどうか」の意味。中止の表現に流用してはならない | **存在は正しい**（`Task` 下と `Resource` 下の 2 か所）。意味の記述は XSD の documentation では確認できず → 意味は**未検証** | plan-actual-decisions-ja.md:1243 / mspdi_pj12.xsd:1642 / mspdi_pj12.xsd:2529 |
| 4 | `PercentComplete` は `xsd:integer`・**制約ファセットなし**・範囲の記述もなし | **正しい。** `type="xsd:integer" minOccurs="0"`、`xsd:simpleType` を持たない | plan-actual-decisions-ja.md:1244 / mspdi_pj12.xsd:1894 |
| 5 | `Stop` / `Resume` / `ResumeValid` は Min 0 / **Max 1**。履歴を持たない | **正しい**（§5 の表） | plan-actual-decisions-ja.md:1246 / mspdi_pj12.xsd:1747 |
| 6 | `Baseline` は**存在する** | **正しい。** `Task` / `Resource` / `Assignment` の 3 か所で `maxOccurs="unbounded"` | plan-actual-decisions-ja.md:1248 / mspdi_pj12.xsd:2307 |
| 7 | `DurationFormat` は `7=d` / `8=ed` を含む | **正しい。** 26 値の enum で、documentation に "7=d ... 8=ed" とある | plan-actual-decisions-ja.md:1249 / mspdi_pj12.xsd:1709 |
| 8 | `TimephasedData` は `maxOccurs="unbounded"` だが中身はバーの分割区間ではない | **`maxOccurs="unbounded"` は正しい。** 中身の解釈は enum 定義からの読みであり、XSD の documentation は "The time phased data block associated with the task." としか言わない → 解釈は**未検証** | plan-actual-decisions-ja.md:1250 / mspdi_pj12.xsd:2473 |
| 9 | `Milestone` は `xsd:boolean` / "Whether the task is a milestone." | **正しい**（XSD の documentation と逐語一致） | plan-actual-decisions-ja.md:367 / mspdi_pj12.xsd:1782 |
| 10 | `Task/Type` は 0=Fixed Units / 1=Fixed Duration / 2=Fixed Work | **正しい**（XSD の documentation と逐語一致） | plan-actual-decisions-ja.md:368 / mspdi_pj12.xsd:1630 |
| 11 | `PredecessorLink/Type` は 0=FF / 1=FS / 2=SF / 3=SS | **正しい**（XSD の documentation と逐語一致） | plan-actual-decisions-ja.md:369 / mspdi_pj12.xsd:2175 |
| 12 | `ActualDuration` は "The span of actual working time for a task so far ... can be calculated in two ways ..." | **解説書には逐語で存在する。** ただし **XSD の documentation は "The actual duration of the task." であって別文である** | plan-actual-decisions-ja.md:1245 / actualduration-element.md:20 / mspdi_pj12.xsd:1931 |

---

## 未解決

原典どうしが矛盾している点・決められない点・要改名。**番号は本書内の参照用**。

| # | 種別 | 内容 | 出典（両側） | 影響 |
| --- | --- | --- | --- | --- |
| 1 | **原典どうしの矛盾（重大）** | **`Resume` の意味が XSD と解説書で逆を向く。** 解説書は「残りがいつから始まる**予定**か」（未来）、XSD の documentation は "The date that the task **resumed**."（過去）。plan-actual は解説書を採り、「最後に再開した日ではない」と強調している。**XSD を正とすると中断モデルの意味が変わる** | plan-actual-decisions-ja.md:86 ／ resume-element.md:20 ／ mspdi_pj12.xsd:1754 | 中断・再開の設計全体。相手ツールの解釈が過去側なら `resume` の往復が意味を失う |
| 2 | **原典どうしの矛盾（重大）** | **`Stop` の意味が XSD と解説書で違う。** 解説書は「実績部分の終わり」、XSD の documentation は "The date that the task **was stopped**."。plan-actual §10-2 は**解説書の文面を根拠に**「拡張領域 → Own」を撤回している | plan-actual-decisions-ja.md:1176 ／ stop-element.md:20 ／ mspdi_pj12.xsd:1749 | Own 昇格の根拠そのもの。XSD 側の読みなら「中断した日」であり、`actualStart + actualDuration` と一致する保証がない |
| 3 | **原典どうしの矛盾** | **`stop` の仕分けが分類定義と食い違う。** 台帳は `Stop` を **Own** と仕分けるが、台帳自身の定義は「Own＝保存値を書く / Reconstruct＝保存しない・export で算出」であり、`stop` は保存しない。定義に照らせば **Reconstruct** | grs-mspdi-field-ledger-ja.md:88 ／ grs-mspdi-field-ledger-ja.md:445 ／ grs-native-erd-ja.md:1518 ／ plan-actual-decisions-ja.md:70 | 本書 §2 では **Reconstruct** と書いた。次期が仕分け語を決め直すこと |
| 4 | **更新漏れ** | **ERD §8I #12 が `PercentComplete` の最終案を「Own（÷100 して保持）」と書く。** 確定は「**整数のまま**保持」であり `÷100` は旧版 | grs-native-erd-ja.md:1815 ／ plan-actual-decisions-ja.md:1083 ／ grs-mspdi-field-ledger-ja.md:27 | 設計変遷表を読んだ実装者が `progressRatio` を再導入しうる |
| 5 | **更新漏れ** | **ERD §8I #13 が `ActualDuration` の最終案を「Carry」と書く。** 確定は **Own**（§8A の注記と台帳 §8B は昇格を認めている） | grs-native-erd-ja.md:1816 ／ grs-native-erd-ja.md:1644 ／ grs-mspdi-field-ledger-ja.md:648 | 実績バーの右端の出所が 2 つになる |
| 6 | **用語の食い違い（重大）** | **用語辞書は「真偽値の `milestone` という列は持たない」と明記し、`shapeKind` が `'milestone'` のときマイルストーンとする。** 一方 plan-actual は不変条件を「**権威は `Task.milestone`**（export される側だから）」と定め、ERD も `bool milestone` 列を持つ。**権威がどちらか、列が存在するかが正反対** | tbl-glossary.md:25 ／ plan-actual-decisions-ja.md:356 ／ plan-actual-decisions-ja.md:359 ／ grs-native-erd-ja.md:260 | `Task/Milestone` の往復。列を持たないなら export で `shapeKind` から焼くことになり、plan-actual の「食い違ったら往復で失われるのは `Task.milestone` の側」という論拠が成立しない |
| 7 | **用語の食い違い** | **用語辞書 P-10 `shapeKind` / P-16 `milestoneGlyph` はプロパティ表（T-102）にあり、`Task` のプロパティのように読める。** ERD はどちらも `TaskVisual`（非 export）の列とする | tbl-glossary.md:48 ／ tbl-glossary.md:54 ／ grs-native-erd-ja.md:336 ／ grs-native-erd-ja.md:1615 | 置き場所（`Task` か `TaskVisual` か）。E02 の範囲外だが実績の形状規則が両方に触れる |
| 8 | **用語の新語** | **用語辞書 P-17 `actualPlacement`（`'inside'` / `'below'` / `'atActualDate'`・`shapeKind` から導出）は `previous-project-result/` の 3 原典に存在しない。** 規則そのもの（内側に重ねる／下にずらす／実績日へ横にずらす）は plan-actual にあるが、**名前は仕様書側で新設されたもの** | tbl-glossary.md:55 ／ plan-actual-decisions-ja.md:228 ／ plan-actual-decisions-ja.md:391 | 名前の出所。導出値なので保存列にしないこと |
| 9 | **決められない（未検証）** | **未着手の `resumeValid` を何にするか。** 5 状態の表は `—`（不問）としか書いていない。`null` か `true` か、原典に無い | plan-actual-decisions-ja.md:106 | import / export の書き分け。`null` と `false` の区別は Drop=0 の前提 |
| 10 | **決められない（未検証）** | **`percentComplete` に 100 超を書いたとき MS Project がどう扱うか。** 丸める / 拒否する / 受け入れる のいずれか不明。実機確認 #2（`OPEN-ITEMS-ja.md` と番号一致） | plan-actual-decisions-ja.md:172 ／ plan-actual-decisions-ja.md:1292 | 頭打ちにするかどうかの最終判断 |
| 11 | **決められない（未検証）** | **完了時に `Stop` / `Resume` を相手がどう書き出すか。** 実機確認 #3。優先度は低い（GRS は完了時に書かないので結果は同じ） | plan-actual-decisions-ja.md:1293 | 往復差分 |
| 12 | **決められない（名前が無い）** | **導出値に確定名が無い**: 実績バーの右端 ／ 状態（5 値） ／ 遅れ ／ Progress Marker の記号。用語辞書にも無い（`Progress Marker` は UI パーツ名 U-5 として存在するが、記号の値集合の名前は無い） | plan-actual-decisions-ja.md:64 ／ plan-actual-decisions-ja.md:102 ／ tbl-glossary.md:74 | 実装で各自が名づけると散る。`actualThrough` は**作らないと決まっている**ので再提案しないこと（plan-actual-decisions-ja.md:1089） |
| 13 | **要改名（本書の範囲外だが実績側から参照する）** | **`TaskGroupMember.stack_order` は `stackOrder` であるべき。** 許される snake_case は `wbs_parent_uid` / `link_type` / `Project.status_date` の 3 語だけで、`stack_order` は含まれない。用語辞書 N-4 も `stackOrder` を確定名としている | grs-native-erd-ja.md:323 ／ tbl-glossary.md:28 | マイルストーンの縦揃えを担う列なので実績側から参照する |
| 14 | **要改名（本書の範囲外）** | ERD の `calendar_id` / `wbs_order` / `lag_format` / `day_type` / `day_working` / `from_date` / `to_date` / `task_uid` / `group_id` / `source_uid` / `is_base` / `is_cost_resource` / `base_calendar_id` / `last_seen_import_seq` / `import_session_id` / `source_project_uid` / `derived_from_task_uid` / `uid_high_water_mark` / `schema_version` / `minutes_per_day` / `week_start_day` / `start_date` / `stack_direction` / `import_seq` はいずれも許可 3 語に含まれない snake_case | grs-native-erd-ja.md:239–341 | 全エンティティに波及。**E02 の 7 列は全て lowerCamelCase で規約に適合している** |
| 15 | **出典の誤り（自分で見つけた）** | **plan-actual §10-7 が `OutlineLevel` の定義文を「XSD 1682 行」と出典表示しているが、その文は XSD にない。** XSD:1684 は "The outline level of the task."、引用文 "The number that indicates the level of a task in the project outline hierarchy." は**解説書**の文である。行番号 1682 は要素の位置としては正しい | plan-actual-decisions-ja.md:1247 ／ mspdi_pj12.xsd:1684 ／ outlinelevel-element.md:20 | 「XSD で確認した」という主張の信頼度。同じ節の他の行も出典の取り違えがありうる（#12 の `ActualDuration` も同型） |
| 16 | **パスの不整合** | **原典が示す MSPDI の正のパスが実在しない。** plan-actual:15 は `../01-mspdi/mspdi/mspdi_pj12.xsd`、:16 は `docs/spec/vendor/mspdi/learn-docs/`、台帳:13 は「同梱していない」と書く。**実際は `docs/reference/mspdi/mspdi_pj12.xsd` と `docs/reference/mspdi/learn-docs/` に実在する** | plan-actual-decisions-ja.md:15 ／ plan-actual-decisions-ja.md:16 ／ grs-mspdi-field-ledger-ja.md:13 | 次の担当者が「XSD が無い」と判断して要約から設計しかねない |
| 17 | **未検証（原典が自ら未検証と書く）** | `RemainingDuration` を完了時に `0` と書く扱いが Carry の**唯一の**例外であること、および `Assignment` 側の `Stop` / `Resume`（XSD に実在・mspdi_pj12.xsd:3458 / 3463）を GRS が触らないことの往復影響 | plan-actual-decisions-ja.md:1136 ／ mspdi_pj12.xsd:3458 | `Assignment` の中断情報が `Task` と食い違ったまま往復しうる |

---

## 数えたもの（自己申告）

| 数えたもの | 数 | 方法 |
| --- | --- | --- |
| 本書の実績側フィールド行（§1 ＋ §2 ＋ §3） | **35**（7 ＋ 5 ＋ 23） | 表の行を数えた |
| ERD 旧版との差分 | **9** | `grs-native-erd-ja.md:26`–`35` の表の行を数えた（指示と一致） |
| 5 状態 | **5** | `plan-actual-decisions-ja.md:106`–`110` |
| Progress Marker の記号 | **4**（`(✓)` `(!)` `( \ )` `( )`） | `plan-actual-decisions-ja.md:403`–`407` |
| 遅れ `(!)` の条件 | **3** | `plan-actual-decisions-ja.md:411`–`414` |
| 実績側で拡張領域を使う枠 | **0** | `plan-actual-decisions-ja.md:102` / `plan-actual-decisions-ja.md:1189`（全体でも 2 枠で、それは fade） |
| 未解決 | **17** | 下表の行を数えた |
