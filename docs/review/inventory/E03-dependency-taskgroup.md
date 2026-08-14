# E03 — Dependency + TaskGroup

担当範囲: `Dependency`（← MSPDI `PredecessorLink`）と `TaskGroup` / `TaskGroupMember`（マルチバーの容れ物）。

## 読んだ原典

| # | ファイル | 行数 | 読み方 |
| --- | --- | --: | --- |
| 1 | `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 | **全文** |
| 2 | `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md` | 677 | **全文** |
| 3 | `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` | 1348 | **全文** |
| 4 | `docs/spec/_assets/tbl-glossary.md` | 259 | **全文**（名前の正との突合） |
| 5 | `docs/reference/mspdi/mspdi_pj12.xsd` | 3906 | **`PredecessorLink` の定義 2162–2237 を実読**（MSPDI の事実の検証）。全文は読んでいない |
| 6 | `docs/spec/01-04-requirements.md` | 3800+ | **該当箇所のみ**（`FR-004` / `FR-005` / `FR-009` / `FR-003` の表 T-014・T-015・T-015a・T-018・T-018a・T-038、1.9 表記規約、取り込みの検査） |
| 7 | `docs/spec/_assets/tbl-settings.md` | — | **該当箇所のみ**（表 T-211 の `S-125`、表 T-213 の `S-117` / `S-118`） |

出典欄は上のファイル名（basename）と行番号で書く。行番号は上記の版の実測である。

---

## 0. 2 つの軸は別物である

**表 A — 軸 A（WBS）と軸 B（マルチバー）**

| 軸 | 何を表すか | 持ち主 | 深さの上限 | MSPDI へ export | LOD の名前 / 駆動 | 出典 |
| --- | --- | --- | --- | --- | --- | --- |
| **A: WBS** | タスクの親子の木 | `Task.wbs_parent_uid`（`Task` の自己参照） | **無し**（取り込んだ深さをそのまま保持し、そのまま書き戻す。クランプしない） | **する**（`OutlineLevel` を木の深さから算出） | タスク LOD / 幅（`zoomX`） | grs-native-erd-ja.md:84, 811-839; plan-actual-decisions-ja.md:836-856, 862 |
| **B: マルチバー** | 1 行に複数タスクを横並べする器 | `TaskGroup`（自己参照 `parent_id`）＋ `TaskGroupMember` | **5 段**（値は `maxGroupDepth`） | **しない**（GRS 専用） | グループ LOD / 縦（`zoomY`） | grs-native-erd-ja.md:85, 232; plan-actual-decisions-ja.md:863, 880; 01-04-requirements.md:1271 |

- **追随は片方向である。** 行見出しツリーでの階層移動は WBS を変え、器は `parent_id` だけ追随する。バーを別の行へドラッグしても WBS は変わらない（grs-native-erd-ja.md:976-992, 1765-1775）。
- **`TaskGroup` の 5 段は「人が階層を作るとき」だけの上限である。** 取り込みは上限で拒まず、LOD の判定でだけ頭打ちにしてよい（grs-native-erd-ja.md:831-839, 1003; 01-04-requirements.md:1271-1275, 2716）。
- 上限 5 の**仕様書側の持ち主は `FR-004`**、値は表 T-211 の `S-125`（既定 `5` 🔎 / 範囲 3〜8）である（01-04-requirements.md:1245, 1271; tbl-settings.md:269）。

---

## 1. `Dependency`（← `PredecessorLink`）

**置き場所は原典に明記が無い（未検証）。** §5.2 の全体 ERD は `Project` の直下に `Task` / `Calendar` / `Resource` / `Assignment` / `TaskGroup` を並べるが、`Dependency` のコレクションを描いていない（grs-native-erd-ja.md:213-218）。関係線は `Task ||--o{ Dependency` が 2 本あるだけである（同 226-227）。export では**後続 `Task` の子**として `PredecessorLink` に戻す（同 1546）。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `successor_uid` | int | 不可 | **PK**（複合の 1/3） | `Task.uid`（後続） | Consume | `Tasks/Task/UID`（リンクを内包する `Task` の UID。`PredecessorLink` の子ではない） | なし（構造から決まる） | 文書内の `Task.uid` で解決できること（import バリデータで強制）。自己参照の依存を作らせない。⚠️ **要改名 `successorUid`**（snake_case は `wbs_parent_uid` / `link_type` / `Project.status_date` の 3 語のみ） | grs-native-erd-ja.md:274, 1546, 1561; 01-04-requirements.md:292, 1673 |
| `predecessor_uid` | int | 不可 | **PK**（複合の 2/3） | `Task.uid`（先行） | Consume | `PredecessorLink/PredecessorUID`（`xsd:integer` / `minOccurs="0"`） | なし | **欠落（`minOccurs=0`）は妥当な XML** なので、欠落したリンクは `Dependency` 化せず**要素まるごと Carry** へ退避する。文書内に存在しない UID を指すリンクも同じく退避（マージの再採番で無関係な `Task` へ張り替わるため）。⚠️ **要改名 `predecessorUid`** | grs-native-erd-ja.md:275, 1547, 1558-1559; mspdi_pj12.xsd:2168 |
| `link_type` | int | 不可 | **PK**（複合の 3/3） | — | Consume | `PredecessorLink/Type`（`minOccurs="0"` / enum 0,1,2,3） | **欠落時は `1`（FS）へ正規化**し、「欠落だった事実」は Carry に原形保持（export で復元） | 値は `0=FF` / `1=FS` / `2=SF` / `3=SS`（XSD の enumeration と documentation が一致）。**同一ペアに種別違いの依存を 2 本張れるので PK の一部**。同一ペア・同一種別の重複は 1 本目だけ `Dependency` 化し、2 本目以降は要素まるごと Carry（XSD に `unique`/`key`/`keyref` は **0 件**＝重複は妥当。`PredecessorLink` は `maxOccurs="unbounded"`）。**snake_case が許される 3 語の 1 つ**（仕様書の表 T-018 も `link_type` を使う） | grs-native-erd-ja.md:276, 358, 1548, 1556-1557; mspdi_pj12.xsd:2162, 2173-2184; 01-04-requirements.md:292, 1664-1669 |
| `lag` | int | 可（`null`＝元ファイルに要素が無かった） | — | — | Consume | `PredecessorLink/LinkLag`（`xsd:integer` / `minOccurs="0"` / "The amount of lag in tenths of a minute."） | 画面で依存を作ったときに置く値は `dependencyLagDefault = 0`（＝間を空けない） | **単位が原典と仕様書で食い違う**（原典＝1/10 分＝MSPDI 単位そのまま／仕様書 `S-118`＝稼働日 🔎）。→ §4 の C-1。負値＝リード。**ラグは値として保持するだけで日付を自動で動かさない**。ラグの変更は Undo の対象 | grs-native-erd-ja.md:277, 1549; mspdi_pj12.xsd:2196-2200; tbl-settings.md:277-278; 01-04-requirements.md:1680, 1517 |
| `lag_format` | int | 可 | — | — | Consume | `PredecessorLink/LagFormat`（`minOccurs="0"` / enum 25 値） | なし（`null` なら MSPDI に書かない） | ラグの表示単位。**GRS は表示に使わないが、忠実な書き戻しのため Consume で保持**する。XSD の enumeration は `3,4,5,6,7,8,9,10,11,12,19,20,35..44,51,52,53` の **25 値**（自分で数えた）。⚠️ **XSD の documentation は 52 までしか列挙しておらず `53` が未文書化**。⚠️ **要改名 `lagFormat`** | grs-native-erd-ja.md:278, 1020, 1550; mspdi_pj12.xsd:2201-2233; grs-mspdi-field-ledger-ja.md:664 |
| `ordinal` ⚠️ 原典が矛盾 | int | 可（新規追加は `null`） | （Carry の付着キー） | — | GRS | —（`PredecessorLink` の親内での出現順） | 未定 | §5.5d-2 は「識別子を持たない要素（**`PredecessorLink` を含む**）のキーは (親のキー, `ordinal`)」とし「**`ordinal` 列を弱エンティティのネイティブ行にも持たせる（§5.2 ERD 反映済み）**」と書くが、**§5.2 の `Dependency` に `ordinal` 列は無い**（`WeekDay` / `Exception` には有る）。§7.2 は逆に「同一ペア・同一種別の重複は意味を持たないので**序数は不要**」と明記する。→ §4 の C-2 | grs-native-erd-ja.md:709-711, 273-279, 298-309, 1548 |
| `carry` / `carryElements` ⚠️ **器が無い。新設が必要** | object（JSON。**型は未確定**） | 可 | — | — | GRS（**本目録の提案。原典に列は無い**） | `PredecessorLink/CrossProject`（`xsd:boolean` / `minOccurs="0"`）、`PredecessorLink/CrossProjectName`（`xsd:string` / `minOccurs="0"`） | 未定 | 原典 §3 の表は `PredecessorLink` の**除外欄**に `CrossProject` / `CrossProjectName` を置き、台帳 §7.2 も両者を Carry と仕分ける。しかし §5.5d-1 の「フィールド単位 Carry」は**所有エンティティの `carry: { … }` に入れる**設計であり、**`Dependency` にはその器が §5.2 の ERD にも §7.2 の列表にも無い**。`CrossProject=1` のリンクは要素まるごと Carry へ退避する規則があるが、**ネイティブ化される（＝`CrossProject` が `0` や欠落でない値として明示された）リンクの `CrossProject` / `CrossProjectName` の行き先が定義されていない** → そのままでは Drop=0 が破れる。→ §4 の C-3 | grs-native-erd-ja.md:97, 273-279, 698-700, 1542-1561; grs-mspdi-field-ledger-ja.md:506, 637 |

**`Dependency` について原典が確定していること（列ではない規則）**

| # | 規則 | 出典 |
| --- | --- | --- |
| D-1 | **代理キーを持たない。** PK は (`successor_uid`, `predecessor_uid`, `link_type`) の複合＝自然キー。MSPDI は依存線に ID を振らないため | grs-native-erd-ja.md:358, 1807 |
| D-2 | **線の幾何（経路）は保存しない。** `DependencyRoute` テーブルは廃止。`Dependency` が持つのは論理（先行 / 後続・種別・ラグ）だけ。人が経路を調整する入口も設けない | grs-native-erd-ja.md:1009, 1015, 1809; 01-04-requirements.md:1693, 1701 |
| D-3 | **不変条件**: ネイティブの `Dependency` が持つ UID は、必ず文書内の `Task.uid` で解決できること。出口（export）の検査項目にも「参照の解決」がある | grs-native-erd-ja.md:759, 1561 |
| D-4 | マージの「上書き」では `Dependency` は**置換**される（`TaskVisual` / `TaskGroupMember` のように保持されない） | grs-native-erd-ja.md:445 |

---

## 2. `TaskGroup`（マルチバーの容れ物・行の器）

**GRS 新設・非 export。** `Project` の直下のコレクション（`Project ||--o{ TaskGroup`）。`GroupViewState` は廃止され、行の書式 3 列（`collapsed` / `color` / `height`）が本テーブルに畳み込まれている。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `id` | string（UUID） | 不可 | **PK** | — | GRS | —（対応する要素が無い。非 export） | 新規作成時に UUID を発番 | **UUID のままにする**（`task_uid` にしない）。器とサマリタスクの 1:1 は**初期姿だけ**で、人が追加・分割・統合できる独立した実体だから。UUID なので UID の再採番の影響を受けず、注記からの参照も壊れない。`documentSettings.scrollGroupId` がこの値を持つ（整数ではない） | grs-native-erd-ja.md:311, 360, 972-973, 1471; tbl-settings.md:154 |
| `parent_id` | string（UUID） | 可（`null`＝ルート） | FK | `TaskGroup.id`（自己参照） | GRS | — | `null` | **入れ子は ≤ 5 段**（仕様書側の持ち主は `FR-004`、値は `maxGroupDepth`）。上限が掛かるのは**人が階層を作るとき**だけで、取り込みは上限で拒まない（超える階層には器を作らず最も深い段の行に載せる）。WBS の階層移動には**この列だけ**が追随する（器を作り直さない）。人が手で作った器（`derived_from_task_uid = null`）は追随しない。**ルート器は作らない**。⚠️ **要改名 `parentId`** | grs-native-erd-ja.md:312, 232, 947, 988-991, 1000, 1003; 01-04-requirements.md:1245, 1271-1275, 1291, 2716; tbl-settings.md:269 |
| `label` | string | 可（`null`＝導出） | — | — | GRS | — | `null`（生成した器）／人が作った器は必須 | `null` のとき `derived_from_task_uid` のタスク名を**そのまま**表示する（装飾しない）。**`label` と `derived_from_task_uid` の両方が `null` は禁止**（名前が決まらない）。人が改名すると値が入り導出は止まる。**導出した文字列を `label` に保存してはならない**（多国語対応が壊れる。表示時に i18n で組む）。導出であることは薄字 / 斜体で示す | grs-native-erd-ja.md:313, 954-971 |
| `derived_from_task_uid` | int | 可 | —（原典は Mermaid で FK と記していない） | `Task.uid`（実質の参照先） | GRS | — | 生成規則で作った器は元タスクの UID／人が作った器は `null` | `label = null` のときの名前の導出元。`null` の器は WBS の階層移動に追随しない（視覚のみ・非伝播）。⚠️ **参照先の `Task` を削除したときの規則が §5.5c の連鎖表に無い**（→ §4 の C-4）。⚠️ **要改名 `derivedFromTaskUid`** | grs-native-erd-ja.md:314, 967-971, 991, 671-675 |
| `order` | int | 原典に記載なし（**未検証**） | — | — | GRS | — | 原典に記載なし（**未検証**） | 兄弟内の並び順。**並び順はユーザーの意思であり算出不能**なので保持する（§5.6 の無駄の監査で「妥当」と判定済み）。兄弟の並べ替えは WBS 側へも伝わる（表 T-015a の `HM-8` / `HM-9`）。⚠️ 用語辞書に載っていない語である | grs-native-erd-ja.md:315, 1029; 01-04-requirements.md:1296-1297; tbl-glossary.md:23-29 |
| `collapsed` | bool | 原典に記載なし（**未検証**） | — | — | GRS | — | 原典に記載なし（**未検証**） | 折り畳み。**見た目の一部なので保存し、共有で再現する**（`GroupViewState` を廃止して畳み込んだ 3 列の 1 つ）。畳んだ配下の行と `Task` は描いてはならず、配下の `Task` を親の行へ載せ替えてもならない。空になった器も畳んで隠せること | grs-native-erd-ja.md:316, 999, 1027, 1030, 1258, 1266; 01-04-requirements.md:1268 |
| `color` | string | 可（`null`＝テーマから解く） | — | — | GRS | — | `null` | 行色の**疎な上書き**。値域は 3 種 — `null`（選んでいない）／`'transparent'`（人が透明を選んだ）／`'#rrggbb'`。**解いた結果は保存しない**（保存すると `themeHue` を変えたときこの行だけ取り残される）。JSON では `null` を明示してキーを省略しない。`themeMonochrome` は描画時のフィルタで、保存値を変えない | grs-native-erd-ja.md:317, 1028, 1039, 1058-1062, 1092, 1216; plan-actual-decisions-ja.md:564-567 |
| `height` | int | 可（`null`＝自動） | — | — | GRS | — | `null` | 行高の**疎な上書き**。値は**ズーム = 1 基準の論理高さ**で保存し、ズームに比例して伸縮する（px の絶対座標では保存しない）。⚠️ 仕様書は「行の帯高は段数で決まる。行高固定を前提にしてはならない」と定めており、**人の指定値と段数由来の高さの関係が原典・仕様書のどちらにも書かれていない**（→ §4 の C-5） | grs-native-erd-ja.md:318, 1023, 1212, 1219; 01-04-requirements.md:1190 |

**`TaskGroup` について原典が確定していること（列ではない規則）**

| # | 規則 | 出典 |
| --- | --- | --- |
| G-1 | **器の生成規則**: ①子を持つタスク S → 器を作り S 直下の葉を member に入れる（**S 自身も member**）②子を持たない Lv1 タスク → 自分の器（単独 1 行）③子を持たない Lv2 以下 → 親サマリの器。**ルート器は作らない** | grs-native-erd-ja.md:942-950 |
| G-2 | **器は追随するが作り直さない。** WBS の階層移動で更新するのは `parent_id` だけで、`id` / `label` / `color` / `height` / `collapsed` と member の `stack_order` は保つ | grs-native-erd-ja.md:988-989; 01-04-requirements.md:1293-1294 |
| G-3 | **遷移**: 葉 → サマリ（子ができた）＝器を作る／サマリ → 葉（子が居なくなった）＝**器は残す**（書式が入っている可能性）／インデントで 6 段目になる操作は**そもそもできないようにする** | grs-native-erd-ja.md:996-1003 |
| G-4 | **非 export。** MSPDI は描画データを一切持たないので、マルチバーは相手ツールに伝わらない | grs-native-erd-ja.md:1262, 1793; plan-actual-decisions-ja.md:880 |
| G-5 | 注記（`Comment.anchorGroupId` / `HighlightBox.topGroupId` / `bottomGroupId`）は**行のインデックスではなく `TaskGroup.id`** を指す（並べ替え・畳みで別の行を指す事故を防ぐため） | grs-native-erd-ja.md:1419, 1427-1428, 1434-1440 |

---

## 3. `TaskGroupMember`（どの `Task` がどの行に載るか）

**GRS 新設・非 export。** `TaskGroup` の下にぶら下がる（`TaskGroup ||--o{ TaskGroupMember : members`）。**原典は本テーブルの PK を明記していない**（§5.3 の識別子の表に本テーブルの行が無い。→ §4 の C-6）。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `group_id` | string（UUID） | 不可 | FK（PK の一部と推定。**原典に明記なし**） | `TaskGroup.id` | GRS | —（非 export） | なし | どの行に載るか。`TaskGroup` を削除すると配下の member を連鎖削除する（**`Task` 自体は削除しない**＝器から出るだけ）。⚠️ **要改名 `groupId`** | grs-native-erd-ja.md:321, 233, 674 |
| `task_uid` | int | 不可 | FK ＋ **UNIQUE** | `Task.uid` | GRS | —（非 export） | なし | **UNIQUE ＝ 1 タスクは高々 1 行**（`Task ||--o| TaskGroupMember : task_uid(0..1)`）。`Task` を削除すると連鎖削除する。マージの「上書き」では**保持**する（置換すると再取込のたびにマルチバー配置がリセットされ、製品最大の差別化が運用に耐えなくなる）。⚠️ **要改名 `taskUid`** | grs-native-erd-ja.md:322, 157, 230, 447, 673, 1482 |
| `stack_order` | int | 可（`null`＝自動） | — | — | GRS | —（非 export） | `null` | 縦積み段の**疎な上書き**（`null`＝決定的な順序で自動割当／値＝人が指定した段）。原典の優先順位は **`stack_order`（人の指定）> `start` 昇順 > `finish` 降順 > `uid` 昇順**。⚠️ **要改名 `stackOrder`**（用語辞書 `N-4` と仕様書 1.9 の `TaskGroupMember.stackOrder` が確定名）。⚠️ **仕様書 `ST-6` が「積み順は自動割当のみとし、人が段を手で指定する手段を設けない（MUST NOT）」と定めたため、列そのものの要否が原典と食い違う**（→ §4 の C-7） | grs-native-erd-ja.md:323, 1021, 1152-1156, 1203-1204, 1213; tbl-glossary.md:28; 01-04-requirements.md:291, 1187 |

---

## 4. 二軸に関わる横断規則（列ではないが E03 の範囲）

**表 B — 削除時の連鎖（§5.5c）**

| 削除対象 | 連鎖して削除するもの | 通知 | 出典 |
| --- | --- | --- | --- |
| `Task` | `TaskVisual` / **`TaskGroupMember`** / **当該 `Task` を端点とする `Dependency`** / `task_uid` が一致する `Assignment` | 削除件数をトーストで通知 | grs-native-erd-ja.md:673 |
| `TaskGroup` | 配下の `TaskGroupMember`（**`Task` 自体は削除しない**＝器から出るだけ） | — | grs-native-erd-ja.md:674 |
| `Resource` | `resource_uid` が一致する `Assignment` | 削除件数を通知 | grs-native-erd-ja.md:675 |
| `TaskGroup` / `Task`（注記が指していた場合） | その `Comment` / `HighlightBox` も**連鎖削除**（§5.5c と同じ規則、と §5.8 が述べる） | — | grs-native-erd-ja.md:1472 |

⚠️ **§5.5c の表に「注記」の行が無い**（§5.8 側にだけ書かれている）。⚠️ **`TaskGroup.derived_from_task_uid` が指す `Task` を削除したときの規則がどちらにも無い**（→ C-4）。

**表 C — WBS の輪（循環）**

| 事実 | 内容 | 出典 |
| --- | --- | --- |
| 循環は起こりうる | MSPDI 由来のデータは `OutlineLevel` ＋ 文書順から組むので構造上循環しないが、**GRS が親の付け替えを許す以上、あるタスクの親をその子孫にする循環が起こりうる** | grs-native-erd-ja.md:859-861 |
| 禁止する検査が要る（編集時） | **WBS 編集時のバリデーションで禁止する。** 仕様書側は「自分の子孫を親にする移動を受け付けてはならない（MUST NOT）」 | grs-native-erd-ja.md:861; 01-04-requirements.md:1292 |
| 禁止する検査が要る（取り込み時） | 外から来た循環は素通りするので**取り込み側で別に弾く**。**循環では深さが確定しないので、ネストの深さの上限では検出できない** | 01-04-requirements.md:1292, 2782; tbl-settings.md:271 |
| 器の側の循環 | `TaskGroup.parent_id` の循環を禁じる規則は**原典にも仕様書にも見当たらない**（未検証。深さ上限 `HM-3a` は「移動後の最深部で測る」としか言っていない） | 01-04-requirements.md:1291-1292（該当規則の不在） |

---

## 5. 用語辞書（`tbl-glossary.md`）との突合

| 原典の名前 | 用語辞書の確定名 | 判定 |
| --- | --- | --- |
| `TaskGroup` | `TaskGroup`（`N-2`・タスクグループ） | 一致 | 
| `TaskGroupMember` | `TaskGroupMember`（`N-3`） | 一致 |
| `stack_order` | **`stackOrder`**（`N-4`。散文では `TaskGroupMember.stackOrder`） | **要改名** |
| `Dependency` | **辞書に無い**（UI パーツ `Dependency Lines`＝`U-16` はあるが、データのエンティティ名の行が無い） | 未確定 |
| `link_type` | 辞書に無い。ただし**仕様書 1.9 の `W-8` が snake_case を許す 3 語の 1 つとして明示**し、表 T-018 が列名として使う | 一致（例外として許容済み） |
| `lag` / `lag_format` | 辞書に無い（設定値の `dependencyLagDefault`＝`K-104` は有る） | `lag_format` は **要改名 `lagFormat`** |
| `successor_uid` / `predecessor_uid` | 辞書に無い | **要改名 `successorUid` / `predecessorUid`** |
| `group_id` / `task_uid` / `parent_id` / `derived_from_task_uid` | 辞書に無い | **要改名 `groupId` / `taskUid` / `parentId` / `derivedFromTaskUid`** |
| `TaskGroup.id` / `label` / `order` / `collapsed` / `color` / `height` | 辞書に無い（`scrollGroupId`＝`K-70` が `TaskGroup.id` を参照する） | 記法違反なし。ただし `order` は辞書に無く曖昧 |

- 命名の規約に照らして、**`type` / `data` / `info` / `value` の汎用語を単独で使っている列は本範囲に無い**（`link_type` は許可された 3 語の 1 つ）。
- 大文字略語の連なりは本範囲に無い（改名先は `successorUid` であって `successorUID` ではない）。

---

## 未解決

| # | 論点 | 内容 | 影響 |
| --- | --- | --- | --- |
| **C-1** | **ラグの単位が食い違う** | 原典は `lag` を **1/10 分**（MSPDI `LinkLag` の単位そのまま）とする（grs-native-erd-ja.md:277, 1549）。仕様書 `S-118` はラグの単位を**稼働日** 🔎 とする（tbl-settings.md:278）。`actualDuration` と同じく**境界で変換する**必要があるが、その変換規則がどこにも無い | 変換を書かないと、`dependencyLagDefault = 0` 以外の値を持つ依存で往復が壊れる |
| **C-2** | **`Dependency.ordinal` の要否が原典内で矛盾** | §5.5d-2 は `PredecessorLink` を弱エンティティに挙げ「`ordinal` 列をネイティブ行にも持たせる（§5.2 ERD 反映済み）」と書くが、**§5.2 の `Dependency` に `ordinal` は無い**。§7.2 は「序数は不要」と明記（grs-native-erd-ja.md:709-711, 273-279, 1548） | `ordinal` が無いと、1 つの `Task` が持つ複数の `PredecessorLink` の**原順序を復元できない**（§5.5d-3 は「`ordinal` 順に出力して原順序を復元する」と定めている）→ 未編集往復の差分ゼロが崩れうる |
| **C-3** | **`Dependency` に `carry` の器が無い（新設が必要）** | `CrossProject` / `CrossProjectName` は Carry と仕分けられているのに（grs-native-erd-ja.md:97、grs-mspdi-field-ledger-ja.md:506）、フィールド単位 Carry の置き場である `carry: { … }` が `Dependency` に定義されていない。`CrossProject=1` の退避規則だけでは、**ネイティブ化されるリンクに書かれた `CrossProject` / `CrossProjectName` の値**を保持できない | **器を新設すること。** 無ければ Drop=0（機械検証で証明する前提）が破れる |
| **C-4** | `TaskGroup.derived_from_task_uid` の参照先 `Task` を削除したときの規則が無い | §5.5c の連鎖表に `TaskGroup` の行が無く（`Task` 削除の連鎖先は `TaskVisual` / `TaskGroupMember` / `Dependency` / `Assignment` のみ）、器は「サマリ → 葉」でも残す方針である（grs-native-erd-ja.md:671-675, 998） | 参照先が消えた器は `label = null` のまま**名前が決まらなくなり**、「両方 `null` は禁止」（同 970）の不変条件を破る |
| **C-5** | `TaskGroup.height`（人の指定）と段数由来の行高の関係が未定義 | 原典は `height` を「`null`=自動 / 値=論理高さ」とだけ書き（grs-native-erd-ja.md:1212）、仕様書は「行の帯高は段数で決まる。行高固定を前提にしてはならない（MUST NOT）」と定める（01-04-requirements.md:1190） | 指定値が下限なのか固定値なのか上書きなのかで、段が増えたときの絵が変わる |
| **C-6** | `TaskGroupMember` の PK が原典に無い | §5.3 の識別子の表に本テーブルの行が無い（grs-native-erd-ja.md:350-360）。`task_uid` が UNIQUE なので単独で PK になりうるが、(`group_id`, `task_uid`) の複合とも読める | 実装ごとに違う形になる |
| **C-7** | **`stack_order` を持つかどうかが原典と仕様書で逆** | 原典は「疎な上書きで復活」（`ALIGN-L1-001` / `ALIGN-L2-001` が縦位置の意図を要求するため。grs-native-erd-ja.md:1021, 1810）。仕様書 `ST-6` は「**人が段を手で指定する手段を設けない（MUST NOT）**」＝要望 30-6 を取り下げ（01-04-requirements.md:1187）。用語辞書 `N-4` も「人が指定できるかどうかは `ST-6` が定める」と仕様書側へ委ねている | 仕様書に従うなら**列そのものが不要**になる。どちらを採るかの明示的な決定が要る |
| **C-8** | `TaskGroup.order` / `collapsed` の既定値が原典に無い | 生成規則（§5.5g）は器の作り方を定めるが、初期の並び順と初期の畳み状態を書いていない（grs-native-erd-ja.md:942-950, 967-971） | **未検証**。次期が決める |
| **C-9** | `Dependency` の置き場所（コレクションの持ち主）が原典に無い | §5.2 の ERD が `Project` の直下に `Dependency` を描いていない（grs-native-erd-ja.md:213-218, 226-227） | JSON の形（トップレベル配列か `Task` の子か）が決まらない |
| **C-10** | `TaskGroup.parent_id` の循環を禁じる規則が無い | WBS の循環は原典・仕様書の両方が禁じるが（grs-native-erd-ja.md:861、01-04-requirements.md:1292, 2782）、**器の入れ子の循環**についての規則は見当たらない | **未検証**。器も自己参照なので同じ検査が要る可能性がある |
| **C-11** | XSD の `LagFormat` に未文書化の値がある | enumeration は 25 値（`3..53`）だが、documentation の列挙は `52=e%?` で終わり **`53` を説明していない**（mspdi_pj12.xsd:2203-2232。値の数は自分で数えた） | `53` を受け取ったときの表示単位が分からない（Carry / Consume として保持するだけなら実害なし） |
| **C-12** | 用語辞書にデータのエンティティ名 `Dependency` が無い | 辞書のデータの語は `Task` / `TaskGroup` / `TaskGroupMember` / `stackOrder` / `Item` の 5 行で、依存のエンティティ名を持たない（tbl-glossary.md:23-29） | 散文で `Dependency.link_type` と書く根拠が辞書側に無い。辞書への追記が要る |
