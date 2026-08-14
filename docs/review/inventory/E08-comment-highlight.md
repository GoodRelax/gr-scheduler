# E08 — Comment + HighlightBox

注記（`Comment` / `HighlightBox`）のデータモデル全数調査。
原典に無いことは「未検証」と明記する。数は自分で数えた。

## 読んだ原典

| 文書 | 行数 | 読んだ範囲 | 役割 |
|---|--:|---|---|
| `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 | **全文**（§5.8 = 1405-1472 を含む） | 本担当の正 |
| `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` | 1348 | §2-6（553-606）／§8（1011-1031）／注記の語の全数検索 | 予実領域の上書き。注記との接点を確認 |
| `docs/spec/_assets/tbl-glossary.md` | 259 | 全文 | 用語の正。名前の突き合わせ |
| `previous-project-result/user-order.md` | 637 | 項 21 / 25 / 44 / 45 / 56 / 57 / 61（325-347・450-470・191・213） | 要求の出所 |
| `previous-project-result/03-ui-naming/ui-parts-ja.md` | — | §1-1〜§1-3（22-80）／§2-1-5 の記法（268-276）／注記の語の全数検索 | 記法の正（面ごとの casing） |
| `previous-project-result/02-data-model/data-model-entry-ja.md` | 343 | 全体像（44-90）／注記の語の全数検索 | 14 エンティティの並び |
| `docs/reference/mspdi/mspdi_pj12.xsd` | — | 要素名の機械検索（`Comment`/`Annotation`/`Highlight`/`Callout`/`Sticky`/`Note`） | MSPDI の正 |
| `docs/spec/01-04-requirements.md` | — | UC-008(685)／FR-019(2433)／FR-097(3038)／T-032 の MG-8a(2669)・MG-12(2675)／UN-5(1515)／RT-4a(1694)／1574 | 現行仕様書との差の確認用 |

**出典欄の略号**: `erd` = `grs-native-erd-ja.md` ／ `glossary` = `tbl-glossary.md` ／ `order` = `user-order.md` ／
`plan-actual` = `plan-actual-decisions-ja.md` ／ `ui-parts` = `ui-parts-ja.md` ／ `req` = `01-04-requirements.md` ／
`xsd` = `mspdi_pj12.xsd`。番号は行番号。

**エンティティ数の自数え**: §5.2 の ERD に描かれるのは Project / Task / Dependency / Calendar / WeekDay /
Exception / Resource / Assignment / TaskGroup / TaskGroupMember / TaskOrigin / TaskVisual の **12**。
これに注記 2 を足して **14**。原典 `erd:126` の「全 14 エンティティ」と一致する。

**フィールド数の自数え**: `Comment` **8** ＋ `HighlightBox` **7** ＝ **15**。

---

## 1. `Comment`（コメントボックス）

出所は `order:337-341`（項 44）。**見た目を構成するので文書データとして保存する**（`order:454-455` 項 57）。
**MSPDI へは書かない**（`erd:1407`）。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|---|---|---|---|---|---|---|---|
| `id` | `string`（UUID） | 否 | PK | — | GRS | — | 未検証（採番規則は「UUID」としか書かれていない） | UUID。`TaskGroup.id` と揃える。UID 再採番の影響を受けない＝マージで衝突しない | erd:1415, erd:1471 |
| `leaderShapeKind` | `string`（判別値 2 種） | **未検証**（原典は `?` を付けないが「必須」とも書かない） | — | — | GRS | — | 未検証 | 値は `'callout-box'` / `'polyline'` の 2 値のみ。項 44 の 2 種（引出し四角 `-□` `/□` ／ 折れ線 `/----` `\____/`）に対応 | erd:1416, order:338 |
| `text` | `string`（原典は「本文」とだけ書き、型を明記しない） | **未検証** | — | — | GRS | — | 未検証（空文字・未入力の扱いは原典に無い） | コメントボックスの本文。原典に長さ上限・改行・書式の規定は**無い** | erd:1417 |
| `anchorDate` | `date`（原典は「日付」） | **未検証** | — | — | GRS | — | 未検証 | **world**。ズーム・スクロールに追従する | erd:1418, erd:1446 |
| `anchorGroupId` | `string`（UUID＝`TaskGroup.id`） | **未検証**（原典は `?` を付けない） | FK | `TaskGroup.id` | GRS | — | 未検証 | **行はインデックスで参照してはならない**（§4）。id 参照なので行の並べ替えで指す先が変わらない | erd:1419, erd:1434-1440, erd:1447 |
| `anchorTaskUid` | `int`（＝`Task.uid`） | **可**（原典が `?` を付ける＝任意） | FK | `Task.uid` | GRS | — | 未検証（`null` と読めるが明記なし） | 指す `Task`。**指定時は 9 点アンカーから引き出す**。参照先 `Task` が消えたら注記も連鎖削除 | erd:1420, erd:1472 |
| `anchorPoint` | `int`（`0`-`8`） | **可**（原典が `?` を付ける＝任意） | — | — | GRS | — | 未検証 | 9 点アンカー（3×3）。`anchorTaskUid` が無いときの意味は原典に**無い**（→ 未解決） | erd:1421 |
| `bodyOffsetPx` | `{ dx, dy }`（px。dx/dy の数値型は**未検証**） | **未検証** | — | — | GRS | — | 未検証 | **screen（px）**。吹き出しは文字を含む独立した装飾で、文字サイズがズーム不変。px ならアンカーからの見た目の距離が一定になる | erd:1422, erd:1448, order:340 |

**`Comment` に色の列は無い。** 原典が明示している（「`Comment` には色の列が無い（`leaderShapeKind` / `text` / 位置だけ）。
決めるのは 1 列だけである」＝ `erd:1104`）。文字色・引出し線の色・吹き出しの塗りの正は**原典に無い**（→ 未解決）。

## 2. `HighlightBox`（ハイライトボックス）

出所は `order:342-347`（項 45）。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|---|---|---|---|---|---|---|---|
| `id` | `string`（UUID） | 否 | PK | — | GRS | — | 未検証 | UUID。UID 再採番の影響を受けない＝マージで衝突しない | erd:1425, erd:1471 |
| `startDate` | `date` | **未検証** | — | — | GRS | — | 未検証 | **world**。日付の範囲の始め。`endDate` との前後関係の規定は原典に**無い** | erd:1426, erd:1446 |
| `endDate` | `date` | **未検証** | — | — | GRS | — | 未検証 | **world**。日付の範囲の終わり | erd:1426, erd:1446 |
| `topGroupId` | `string`（UUID＝`TaskGroup.id`） | **未検証** | FK | `TaskGroup.id` | GRS | — | 未検証 | 範囲の**上端**の行。インデックス参照は禁止 | erd:1427, erd:1447 |
| `bottomGroupId` | `string`（UUID＝`TaskGroup.id`） | **未検証** | FK | `TaskGroup.id` | GRS | — | 未検証 | 範囲の**下端**の行。`topGroupId` と同値（1 行だけ囲む）の可否は原典に**無い** | erd:1428, erd:1447 |
| `strokeColor` | `string \| null`（`'#rrggbb'`） | **可** | — | — | GRS | — | **`null`**（＝注記用の固定色で描く。**固定色の値は未確定**） | 疎な上書き。`null`=注記用の固定色（テーマから独立）／値=人の指定。**`'transparent'` は選べない**（枠線がこの注記の唯一の描画要素だから）。固定色の制約は「依存線の橙・イナズマ線・`themeHue` のいずれとも色相を離し、ライト/ダーク両方で地に対し 3:1 以上」 | erd:1429-1430, erd:1032, erd:1093, erd:1102-1103, erd:1106-1108, erd:1217 |
| `cornerRadiusPx` | 数値（px。int / float は**未検証**） | **未検証** | — | — | GRS | — | 未検証 | **screen（px）**。項 45 の「角丸の R は拡大縮小しても同じ大きさに見える」の要求そのもの | erd:1431, erd:1449, order:343 |

**塗り（fill）の列は無い。** 原典は `strokeColor` だけを持つ。項 45 の「任意の色」は**枠線の色**として実装されている
（`erd:1429`・「枠線がこの注記の唯一の描画要素」＝ `erd:1102-1103`）。

## 3. MSPDI との関係（`—` の根拠）

| 主張 | 根拠 | 検証 |
|---|---|---|
| 注記に対応する MSPDI 要素は無い | `erd:1407`「MSPDI へは書かない（対応概念が無い）」／`erd:1469` | **XSD で確認済み**。`name="…"` の全数検索で `Comment` / `Annotation` / `Highlight` / `Callout` / `Sticky` を含む要素・属性は **0 件**。最も近い `Notes` は 3 箇所のみで、いずれも `Task`(xsd:2121) / `Resource`(xsd:2846) / `Assignment`(xsd:3396) にぶら下がる本文であり、**自由な位置に置く注記ではない** |
| 由来は全列 `GRS`（新設） | 同上 | 上と同じ |
| 拡張領域（`ExtendedAttribute`）にも載せない | `erd:37`「拡張領域を使うのは `fadeInDays` / `fadeOutDays` の 2 つだけ」 | 原典どおり。注記を拡張領域へ載せる記述は**無い** |

## 4. なぜ 2 つに分けるか（1 つの型に統合しない）

| 観点 | `Comment` | `HighlightBox` | 出典 |
|---|---|---|---|
| 何をするか | **点を指す** | **範囲を囲む** | erd:1411, order:346 |
| 必要な幾何 | 1 点（日付 1 ＋ 行 1）＋ 吹き出しのずれ | 範囲（日付 2 ＋ 行 2） | erd:1414-1431 |
| 位置の列 | `anchorDate` / `anchorGroupId`（＋任意で `anchorTaskUid` / `anchorPoint`） | `startDate` / `endDate` / `topGroupId` / `bottomGroupId` | erd:1418-1421, erd:1426-1428 |
| screen の列 | `bodyOffsetPx` | `cornerRadiusPx` | erd:1422, erd:1431 |
| 色 | **列を持たない** | `strokeColor` 1 列 | erd:1104, erd:1429 |
| 形の選択 | `leaderShapeKind`（2 値） | 無し | erd:1416 |

**共通するのは `id` だけである。** 8 列と 7 列で一致するのは `id` のみで、残り 7 対 6 は重ならない。
統合すると、どちらか一方でしか使わない列が常に `null` になる（自数え）。
要求側も「コメントと囲み枠は**別のもの**として持つこと」と明記している（`order:346`）。
現行仕様書も同じ判断を繰り返している（`req:2439`「必要な情報が違うので別のものとして持つ」）。

## 5. 行は**インデックスではなく `TaskGroup.id`** で参照する

| 項目 | 内容 | 出典 |
|---|---|---|
| 採らない形 | 行の**順番**で持つ（前プロジェクトは `anchorRowIndex` / `topRowIndex` / `bottomRowIndex`） | erd:1436 |
| 却下の理由 | **行を並べ替えると別の行を指す。** 畳み・非表示でも同じ事故が起きる | erd:1436-1437 |
| 採る形 | `TaskGroup.id`（UUID）で参照する | erd:1439, erd:1447 |
| なぜ壊れないか | 器は WBS を動かしても**作り直さない**（更新するのは `parent_id` だけで `id` は保つ） | erd:1439, erd:988-989 |
| 要求側 | 「行は順番ではなく**行の識別子**で参照すること」 | order:339, order:344 |
| 現行仕様書 | `FR-019`「行を順番で参照してはならない（MUST NOT）」 | req:2433-2435 |

**`Task` を指す `anchorTaskUid` だけは `Task.uid`（＝MSPDI UID の整数）である。** 行の参照とは別物なので混同しないこと（`erd:1420`）。

## 6. world と screen の使い分け（間違えない）

| 値 | 空間 | 理由 | 出典 |
|---|---|---|---|
| `Comment.anchorDate` | **world** | 日付に紐づくのでズーム・スクロールに追従しなければならない | erd:1446 |
| `HighlightBox.startDate` / `endDate` | **world** | 同上 | erd:1446 |
| `Comment.anchorGroupId` / `HighlightBox.topGroupId` / `bottomGroupId` | **id 参照**（world でも screen でもない） | 行の順序に依存させない | erd:1447 |
| `Comment.bodyOffsetPx` | **screen（px）** | 吹き出しは文字を含む独立した装飾で、**文字サイズがズーム不変**。px ならアンカーからの見た目の距離が一定になる | erd:1448 |
| `HighlightBox.cornerRadiusPx` | **screen（px）** | 項 45 の要求そのもの（ズームで同じ大きさに見える） | erd:1449, order:343 |
| `Comment.anchorPoint` | **形状内の離散位置**（9 点アンカー） | 原典は空間を明記しない。px でも日付でもない離散値 | erd:1421 |

**「ピクセル座標は却下」という別の決定と矛盾しない。** 理由が違う ——
略称（バーのラベル）は**バーの内部/近傍に収まる**必要があり、バーの大きさがズームで変わるので px だと崩れた。
コメントの吹き出しは**バーに収まる必要のない独立した装飾**なので px が望ましい（`erd:1451-1453`）。

> **命名で空間が読めるようにしてある。** screen の 2 列だけが `Px` 接尾辞を持ち、world の 3 列は `Date` 接尾辞を持つ。
> id 参照の 3 列は `Id` 接尾辞を持つ。**接尾辞を落とすと空間が読めなくなるので、改名時に落とさないこと。**

## 7. 畳み・非表示のときの振る舞い

| 型 | 事象 | 振る舞い | 理由 | 出典 |
|---|---|---|---|---|
| `Comment` | 指している行が**畳まれた / 非表示になった** | **コメントも一緒に隠す** | 指す先が見えないのに引出し線だけ浮くのは意味不明。行を戻せば戻るので**情報は失わない**（隠すだけでデータは消さない） | erd:1458-1459, order:341 |
| `HighlightBox` | 範囲内の行が非表示になった | **見えている行だけを囲う（枠が縮む）** | 項 45 の要求 | erd:1461, order:345 |
| `HighlightBox` | **上端・下端**が非表示 | **表示中の最も外側の行に寄せる** | 同上 | erd:1462 |

- **どちらも「隠す/縮む」であって、保存値は変えない。** 原典は列の書き換えを一切指示していない（自数え: §5.8 の畳み節に更新対象の列は 0 個）。
- **`TaskGroup.collapsed` が畳みの保存先**であり、注記側は状態を持たない（`erd:316`）。

## 8. マージ・往復のときの扱い

| 項目 | 扱い | 出典 |
|---|---|---|
| MSPDI export | **書かない**（対応概念が無い） | erd:1469 |
| MSPDI import | 取込側に注記は存在しない。**既存の注記はそのまま保つ**（消さない） | erd:1470 |
| 識別子の衝突 | `id` は UUID なので**衝突しない**（UID 再採番の影響を受けない） | erd:1471 |
| 参照先が消えたとき | 指していた `TaskGroup` / `Task` が削除されたら、注記も**連鎖削除**する（§5.5c と同じ規則） | erd:1472 |
| JSON | 「JSON を渡せば GRS 同士で同じ見た目が再現される」の対象。注記は**見た目を構成するので保存する** | erd:1407, order:454-455 |
| Undo | 注記の編集は**履歴に入れる** | plan-actual:1029 |

**⚠️ §5.5c の連鎖削除の表に注記の行が無い。** §5.8 は「§5.5c と同じ規則」と言うが、
§5.5c の表（`erd:671-676`）は `Task` → `TaskVisual` / `TaskGroupMember` / `Dependency` / `Assignment`、
`TaskGroup` → `TaskGroupMember`、`Resource` → `Assignment` の 3 行だけで、**`Comment` / `HighlightBox` は挙がっていない**（自数え）。
同一文書内の食い違い（→ 未解決）。

## 9. 用語辞書との突き合わせ

| 原典の名前 | 用語辞書 | 判定 |
|---|---|---|
| エンティティ `Comment` | `Comment Boxes` = コメントボックス。**「コメント」と略さない（MUST NOT）** | **要改名**。`CommentBox` にする（型名は PascalCase＝`ui-parts:31-37`）。本文は `CommentBox.text` となり、辞書の「コメントボックスの本文」に対応する |
| エンティティ `HighlightBox` | `Highlight Boxes` = ハイライトボックス | 一致（単数形なだけ） |
| 上位語 | `Annotations` = 注記（2 つをまとめて指す） | 原典も §5.8 の見出しで「注記」を使う。一致 |
| `id` / `leaderShapeKind` / `text` / `anchorDate` / `anchorGroupId` / `anchorTaskUid` / `anchorPoint` / `bodyOffsetPx` / `startDate` / `endDate` / `topGroupId` / `bottomGroupId` / `cornerRadiusPx` | **辞書に 1 語も無い** | **要追記**。名前の正が辞書に無いまま散在している。⚠️ **自数え**: 15 行の列名は重複（`id` が両エンティティにある）を除くと **14 種**。うち辞書にあるのは `strokeColor` **1 種だけ**で、**13 種が未収録** |
| `HighlightBox.strokeColor` | `P-18` に `strokeColor`、`P-19` に「`'transparent'` は `strokeColor` / `fillColor` / `TaskGroup.color` が取りうる値」 | **食い違い**。原典は `HighlightBox.strokeColor` に**透明を許さない**。辞書 `P-19` は `strokeColor` を修飾せずに書いているので、注記まで読めてしまう |
| `id`（両エンティティ） | 辞書に `id` の行は無い | 未収録。`TaskGroup.id` と同型（UUID） |

**命名規約に照らした自己点検（15 列）**

| 規約 | 結果 |
|---|---|
| 識別子は英語・lowerCamelCase | **15 列すべて適合**（自数え）。§5.8 は snake_case を 1 つも使っていない |
| snake_case は 3 語のみ許可 | 違反 **0**。ただし FK の相手 `TaskGroup.parent_id` 等、**周辺のエンティティ側**には snake_case が残る（E02 の担当範囲） |
| `type` / `data` / `info` / `value` を使わない | 違反 **0**。`text` は禁止語には含まれない |
| 大文字の略語を連ねない | 適合。`anchorTaskUid`（`UID` ではなく `Uid`）／`bodyOffsetPx`・`cornerRadiusPx`（`PX` ではなく `Px`） |
| 判別値は kebab-case（`ui-parts:31-37`） | `'callout-box'` 適合。`'polyline'` は 1 語なので区切りが現れない。⚠️ ただし辞書 `P-14` の `'endpointSpan'`（`Task.shapeKind` の値）は camelCase で**同じ規約に反する**。同じ `…ShapeKind` という語幹の 2 列で値の記法が割れている（→ 未解決） |

## 10. 予実領域の上書き（`plan-actual-decisions-ja.md`）との差分

**結論: 注記に関する差分は無い。** 確認した範囲と根拠を示す。

| 確認したこと | 結果 |
|---|---|
| `plan-actual` 全文の語検索（`Comment` / `HighlightBox` / 注記 / annotation / ハイライト / コメント） | **ヒット 3 行のみ**（292 / 1029 / 1282・自数え）。うち注記の設計に関わるのは **1029（Undo の対象）だけ**で、ERD §5.8 と矛盾しない |
| ERD が `plan-actual §2-6` を引く箇所（`erd:1097-1098`）の裏取り | `plan-actual:578`「テーマ色相（`themeHue`）からも離す。予定・実績と同系色だと本体に溶ける」を確認。**引用は正しい** |
| 廃止済み（`progressRatio` / `importance` / `progressStatus` / `iconShapeKind` / 保存する `stop`）が §5.8 に混入していないか | **混入 0**（自数え）。§5.8 の 15 列に該当語は 1 つも無い |
| 注記用の固定色の実値 | **`plan-actual §2-6` にも無い**。同節の実測表は 予定塗り / 予定線 / 実績塗り / 依存線 の 4 つだけで、注記も行の帯も持たない（`plan-actual:590-605`） |

**⚠️ 語の使い方だけ 1 件ずれている。** `plan-actual:1029` は「注記・ハイライトボックスの編集」と書くが、
辞書 `U-15a` では **注記 ⊃ ハイライトボックス**なので、この並列は包含関係の誤りである。
現行仕様書は `UN-5`（`req:1515`）で「注記（コメントボックス・ハイライトボックス）」と正しく書いている。

---

## 未解決

### A. 原典どうし・原典内部の矛盾

| # | 何が食い違うか | 出典 | 提案（決めるのは次期） |
|---|---|---|---|
| A-1 | §5.8 は「参照先が消えたら §5.5c と同じ規則で連鎖削除」と言うが、**§5.5c の表に `Comment` / `HighlightBox` の行が無い** | erd:1472 vs erd:671-676 | §5.5c の表に 2 行足す。**`Task` 削除は `anchorTaskUid` を持つ `Comment` にしか波及しない**点も書き分ける |
| A-2 | 辞書 `P-19` は `strokeColor` が `'transparent'` を取りうると書くが、**`HighlightBox.strokeColor` は透明を選べない** | glossary:57 vs erd:1102-1103, erd:1217 | `P-19` の適用範囲を `TaskVisual.strokeColor` / `fillColor` / `TaskGroup.color` に限定して書く |
| A-3 | 辞書 `U-14` は「コメント」と略すことを禁じるのに、**エンティティ名が `Comment`** | glossary:83 vs erd:1414 | **要改名 `CommentBox`**（→ B-1） |
| A-4 | 判別値の記法が割れている。`leaderShapeKind` は kebab（`'callout-box'`）、`Task.shapeKind` は camel（`'endpointSpan'`） | erd:1416, glossary:52 vs ui-parts:31-37 | 規約（kebab）に寄せるなら `'endpoint-span'`。**E08 単独では決められない**（`shapeKind` の担当と合わせて決める） |
| A-5 | `plan-actual:1029` が「注記・ハイライトボックス」と並列する（包含関係の誤り） | plan-actual:1029 vs glossary:85 | 次期の文では「注記（コメントボックス・ハイライトボックス）」で統一する |
| A-6 | §5.8 の「既存の注記はそのまま保つ」の根拠として**項 61 を引く**が、項 61 は**タスク**について書かれている | erd:1470 vs order:463-465 | 拡張適用そのものは妥当に見えるが、**原典が項 61 を注記へ広げている**ことは記録しておく |

### B. 要改名

| # | 現在の名前 | 問題 | 提案 |
|---|---|---|---|
| B-1 | `Comment` | 辞書 `U-14` が「コメント」への省略を MUST NOT で禁止。器と本文のどちらを指すか読めない | **`CommentBox`**。`ui-parts:271-276` の「UI パーツ＝PascalCase の複合語（空白あり）／データの実体＝PascalCase 1 語」に従うと、UI パーツ `Comment Boxes` に対応する実体名は空白を取った単数形 `CommentBox` になる。`HighlightBox`（既に同形）と対になる |
| B-2 | `Comment.text` | 禁止語ではないが、器の名前が `CommentBox` になれば `CommentBox.text` で辞書の「コメントボックスの本文」に一致する | 改名不要。**`Comment.text` のままにするなら B-1 が未解決のまま残る** |
| B-3 | `bodyOffsetPx` の `body` | 器（box）と本文（body）の語が 1 つのエンティティに同居する | 語の整理は次期。**`Px` 接尾辞は落とさないこと**（空間が読めなくなる） |

### C. 原典が決めていないこと（未検証・未定義）

| # | 決まっていないこと | なぜ困るか | 出典（無いことの確認先） |
|---|---|---|---|
| C-1 | **注記用の固定色の実値** | `HighlightBox.strokeColor = null` のとき何色で描くか決まらない | erd:1106-1108（「未定である。次期の色 PoC で確定させる。推測で書かない」）／plan-actual:590-605 に無いことを確認 |
| C-2 | **注記の保存先（親）** | §5.1 / §5.2 の ERD に注記が描かれておらず、`Project` にぶら下がるのか文書直下の配列なのか不明。JSON のコレクション名（`comments` / `highlightBoxes` 等）も**どこにも無い** | erd:126（「注記の 2 つは §5.8 で別に示す」）／`data-model-entry-ja.md` の JSON 実例に注記のキーが**無い**ことを確認 |
| C-3 | 各列の **null 可否と既定値** | 15 列のうち原典が明示するのは `anchorTaskUid` / `anchorPoint`（任意）と `strokeColor`（`null`=固定色）の **3 列だけ**（自数え）。残り 12 列は未検証 | erd:1414-1431 |
| C-4 | `anchorPoint` が `anchorTaskUid` 無しで指定されたとき | 原典は「`anchorTaskUid` 指定時は 9 点アンカーから引き出す」としか書かない。片方だけある状態の意味が無い | erd:1420-1421 |
| C-5 | `HighlightBox` の範囲の**向きと退化** | `startDate > endDate` / `topGroupId` が `bottomGroupId` より下 / 両者が同値（1 行だけ囲む）の可否が無い | erd:1426-1428 |
| C-6 | `HighlightBox` の**上下端の両方が消えた**とき | 「上端・下端が非表示なら表示中の最も外側の行に寄せる」の先、**範囲内の行が 1 つも見えないとき**の振る舞いが無い | erd:1461-1462 |
| C-7 | `HighlightBox` の **FK が片方だけ**削除されたとき | 連鎖削除で箱ごと消すのか、残った側へ寄せるのかが無い（`Comment` は FK が実質 1 本なので問題にならない） | erd:1472 |
| C-8 | `Comment` の**文字の見た目**（文字色・サイズ・折り返し・本文の長さ上限） | 「`Comment` には色の列が無い」とは書いてあるが、**では何色で描くのか**が無い。`plan-actual:607-621`（文字色はテーマの前景色 1 つ）が適用されるかは**未検証** | erd:1104 |
| C-9 | 注記どうしの**重なり順（z 順）** と、日程表との前後 | 複数の注記が重なったときの描画順が無い。`id` は UUID なので順序を持たない | erd:1414-1431（順序の列が無いことを確認） |
| C-10 | `bodyOffsetPx` の**符号の向きと原点** | `dx` / `dy` が右下正なのか、原点がアンカー点なのか吹き出しのどの角なのかが無い | erd:1422 |
| C-11 | `leaderShapeKind` を**後から変えられるか**、既定はどちらか | 2 値であることしか書かれていない | erd:1416 |
| C-12 | **LOD で間引かれた `Task`** を指す `Comment` の扱い | §5.8 の畳み規則は「行」についてだけ書かれており、`anchorTaskUid` 側が LOD で消えた場合が無い。⚠️ 現行仕様書 `req:1694`（`RT-4a`）は「注記が同じ状況で隠れる」と**既に前提にしている** | erd:1458-1462 vs req:1694 |

### D. 現行仕様書（`docs/spec`）との差 — 原典に無い決定が既にある

| # | 差 | 出典 | 扱い |
|---|---|---|---|
| D-1 | **JSON 合流時の注記の扱い**。原典 §5.8 は **MSPDI import しか書いていない**（「取込側に注記は存在しない」）。仕様書は `MG-12` で「注記も合流の対象」、`MG-8a` で「JSON の『上書き』は見た目と行の所属も置き換える」と定める | erd:1470 vs req:2669, req:2675 | **原典は JSON 同士の合流を想定していない。** `id` が UUID なので衝突はしないが、**同じ注記の 2 版**をどう畳むかは両方に無い |
| D-2 | **本文を入力する要求が原典側に無い**。仕様書 `FR-097` が「コメントボックスの本文を編集する」を新設し、その `RATIONALE` に「文字を入れる要求が 1 つも無かった」と明記 | req:3038-3044 vs order:337-341 | 原典の `text` 列は要求より先にあった。**列の存在自体は原典が正**、入口は仕様書が正 |
| D-3 | **置く操作の入口**（構え `AR-5` / `AR-6`）は仕様書だけが持つ | req:2066, req:2435 | データモデルには影響しない（記録のみ） |
