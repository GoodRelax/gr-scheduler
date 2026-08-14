# E07 — TaskVisual + TaskOrigin

見た目の列（`TaskVisual`）と取り込み元の記録（`TaskOrigin`）の全数調査。**推測を断定で書かない。** 原典で確かめられないものは「未検証」と書く。

## 0. 読んだ原典

| ファイル | 行数 | 読んだ範囲 | 本書での役割 |
| --- | --: | --- | --- |
| `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 | **全文**（§5.6 / §5.7 / §7.6 を含む） | 構造の正。`TaskVisual` / `TaskOrigin` の列の出所 |
| `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` | 1348 | **全文**（§2 描画を含む） | 予実・描画の正。`shapeKind` / `milestoneGlyph` の値と不変条件。**予実領域は ERD を上書きする** |
| `docs/spec/_assets/tbl-settings.md` | 332 | 全文 | 設定値の正。`TaskVisual` の値が引く寸法（`shapeHeightOf.*` 等） |
| `docs/spec/_assets/tbl-glossary.md` | 259 | 全文 | 名前の正。突き合わせて食い違いを記録した |
| `docs/spec/01-04-requirements.md` | 3728 | 表 T-005 / T-012 / T-016 / T-017 / `FR-001` / `FR-007` / `FR-030` / `FR-041` / `FR-075` / `FR-083` / `UC-003` の該当箇所のみ | 食い違いの確認用（**全文は読んでいない**） |
| `docs/reference/mspdi/mspdi_pj12.xsd` | 3906 | `Milestone` / `HideBar` / `ExtendedAttribute`（定義側・値側）/ `Project/UID` / `Task/UID` / 描画語の走査（**全文は読んでいない**） | MSPDI の事実の正 |

出典の書き方は `ファイル名:行番号`。ファイル名は上表のベース名で書く。

## 1. なぜ `shapeKind` が `Task` ではなく `TaskVisual` に載るのか

| # | 理由 | 出典 |
| --- | --- | --- |
| 1 | **`Task` を「MSPDI の Own だけを持つ器」に保つため。** GRS 由来の列を `Task` に逆流させない（§4 原則 6「Task 無汚染」）。`TaskOrigin` を分離したのも同じ基準 | `grs-native-erd-ja.md:118`, `grs-native-erd-ja.md:378` |
| 2 | **その結果、書き出しに除外一覧が要らなくなる。** `Task` = MSPDI Own のみという不変条件が保たれるので、export は「`Task` の全列をそのまま書く」で済み、**除外漏れバグが構造的に起きない** | `grs-native-erd-ja.md:378` |
| 3 | **MSPDI に写す先が無いものだけを `TaskVisual` に置く**、という切り分け。色・形状・名称ラベル位置は写す先が無い。写す先を持つ `fadeInDays` / `fadeOutDays` は `Task` 側に残る（§5.5f・本書 §5） | `grs-native-erd-ja.md:867` |
| 4 | MSPDI に**形状・グリフに相当する要素は 1 つも無い**ので、`milestoneGlyph` は GRS 専用・非 export として `TaskVisual` に置く | `plan-actual-decisions-ja.md:373-374` |

⚠️ **仕様書・用語辞書と食い違っている。** 詳細は本書 §7 と「未解決」。

## 2. `TaskVisual`（GRS 新設・非 export・`Task` に 0..1）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `task_uid` **要改名** | `int` | 不可 | PK | `Task.uid`（PK 兼 FK） | GRS | 無し（非 export） | 無し（必須） | `Task` 1 件につき高々 1 行（`Task \|\|--o\| TaskVisual`）。`Task` 削除で連鎖削除。マージの「上書き」でも**保持**する（置換すると再取込のたびに見た目が壊れる） | `grs-native-erd-ja.md:228`, `grs-native-erd-ja.md:333`, `grs-native-erd-ja.md:673`, `grs-native-erd-ja.md:446` |
| `nameAnchor` | `int`（`0`〜`8`） | 可 | — | — | GRS | 無し（非 export） | `null` ＝ 自動配置 | バー上の **9 点アンカー**（3×3）。**疎な上書き**（原則自動、人が動かしたときだけ値を持つ）。**ピクセル座標では持たない**（縦横独立ズームでずれる） | `grs-native-erd-ja.md:334`, `grs-native-erd-ja.md:1022`, `grs-native-erd-ja.md:1210`, `grs-native-erd-ja.md:1219` |
| `nameAlign` | 列挙 `'left'` / `'center'` / `'right'` | 可 | — | — | GRS | 無し（非 export） | `null` ＝ 自動 | ラベルの左詰め / 中央ぞろえ / 右詰め。疎な上書き。指定が無いときの配置順は別表が持つ（仕様書 `FR-002` 系。本書の担当外） | `grs-native-erd-ja.md:335`, `grs-native-erd-ja.md:1211`, `01-04-requirements.md:1106` |
| `shapeKind` | 列挙 5 値 `'rectangle'` / `'chevron'` / `'arrow'` / `'endpointSpan'` / `'milestone'` | **未検証**（原典に `null` の規定が無い。疎な上書きの一覧にも無い） | — | — | GRS | 無し（非 export。**形状に相当する要素が MSPDI に無い**） | **未検証**（原典に既定値の記載が無い。取込時は `Task.milestone` に従属して決まる） | **不変条件: `shapeKind = 'milestone'` ⇔ `Task.milestone = true`。権威は `Task.milestone`**（export される側だから）。人が別々に設定できるようにしない。`'milestone'` と他 4 値の間で変えられない（仕様書 `FR-083`）。**実績は予定と同じ形状で描く** | `grs-native-erd-ja.md:336`, `plan-actual-decisions-ja.md:332`, `plan-actual-decisions-ja.md:356-361`, `plan-actual-decisions-ja.md:266-268`, `01-04-requirements.md:937` |
| `milestoneGlyph` | 列挙 8 値 `'circle'` / `'hexagon'` / `'pentagon'` / `'diamond'` / `'square'` / `'star'` / `'triangleUp'` / `'triangleDown'` | **未検証**（`shapeKind ≠ 'milestone'` のとき値を持つかは原典に無い） | — | — | GRS | 無し（非 export） | `'diamond'` | **`shapeKind = 'milestone'` のときだけ見る。** 値の並びは**同じ外接円に内接させたときの面積の大きい順**（◇ と □、△ と ▽ は同面積で既定・上向きを先に置く）。☆ の面積は `starInnerOfOuter` に依存するが**既定値での順で固定**する | `grs-native-erd-ja.md:337`, `plan-actual-decisions-ja.md:333-335`, `plan-actual-decisions-ja.md:338-354`, `tbl-settings.md:96` |
| `fillColor` | `null` / `'transparent'` / `'#rrggbb'` | 可 | — | — | GRS | 無し（非 export） | `null` ＝ テーマから解く | **疎な上書き。** `null` は「選んでいない」であって透明ではない。**解いた結果を保存しない**（保存すると `themeHue` 変更時にバーだけ取り残される）。`strokeColor` と**独立に判定する**。**`strokeColor` と同時に `'transparent'` にはできない**（本書 §4） | `grs-native-erd-ja.md:338`, `grs-native-erd-ja.md:1024`, `grs-native-erd-ja.md:1036-1040`, `grs-native-erd-ja.md:1058-1066`, `grs-native-erd-ja.md:1214` |
| `strokeColor` | `null` / `'transparent'` / `'#rrggbb'` | 可 | — | — | GRS | 無し（非 export） | `null` ＝ テーマから解く | 同上。**塗りだけ透明（＝輪郭だけの図形）は正当な表現として許す。** 両方を透明にしようとしたら**後から選んだ側を優先し、他方をテーマへ戻す** | `grs-native-erd-ja.md:339`, `grs-native-erd-ja.md:1066-1069`, `grs-native-erd-ja.md:1215` |
| `lineWeight` | 列挙 `'thin'` / `'medium'` / `'thick'` | **未検証**（疎な上書きの対象外と明記されているが、`null` の可否は原典に無い） | — | — | GRS | 無し（非 export） | **未検証**（原典に既定値の記載が無い） | **色ではなく「色に頼らない識別手段」**（WCAG 1.4.1）なので**テーマから導出しない**。3 値が何 px に解決されるかの設定値キーは `tbl-settings.md` に**無い**（本書「未解決」） | `grs-native-erd-ja.md:340`, `grs-native-erd-ja.md:1025`, `grs-native-erd-ja.md:1051-1052`, `grs-native-erd-ja.md:1615` |

**この 8 列で全数である**（`grs-native-erd-ja.md:332-341` の ERD ブロックと `grs-native-erd-ja.md:1615` の §7.6 の列挙が一致する。自分で数えた: 8）。

**廃止済みで列に無いもの**（旧版を読み戻さないための記録）:

| 旧列 | 扱い | 出典 |
| --- | --- | --- |
| `iconShapeKind` | **`shapeKind` へ改名** | `grs-native-erd-ja.md:35`, `plan-actual-decisions-ja.md:1044` |
| `importance`（LOD の選別） | **廃止。** LOD は WBS の階層の深さで判定する | `grs-native-erd-ja.md:33`, `grs-native-erd-ja.md:1025`, `plan-actual-decisions-ja.md:1088` |
| `progressStatus`（自由文字列） | **廃止。** 状態が `actualFinish` / `resume` / `resumeValid` で構造化された | `grs-native-erd-ja.md:34`, `plan-actual-decisions-ja.md:1087` |
| `progressRatio`（0..1） | **廃止 → `Task.percentComplete`**（整数・0 以上） | `grs-native-erd-ja.md:27`, `plan-actual-decisions-ja.md:1083` |
| `labelOffset`（px） | **不採用**（px なのでズームでずれる） | `grs-native-erd-ja.md:1231` |
| `milestoneShape` / `taskShape` | **`shapeKind` に統合** | `grs-native-erd-ja.md:1231` |
| `planActualStyle`（`'overlap'` / `'separate'`） | **廃止**（上下分離表示そのものを廃止。高さの差で幾何的に解く） | `grs-native-erd-ja.md:1401`, `plan-actual-decisions-ja.md:382-391` |

## 3. `TaskOrigin`（GRS 新設・非 export・`Task` に 0..1）

**行の有無そのものが意味を持つ。** 行が無い＝**GRS 生まれ**＝マージの照合対象にしない（`grs-native-erd-ja.md:380`, `grs-native-erd-ja.md:403`）。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `task_uid` **要改名** | `int` | 不可 | PK | `Task.uid`（PK 兼 FK） | GRS | 無し（非 export） | 無し（必須） | `Task` 1 件につき高々 1 行。**代理キーではなく出自メモ**（`Task` の PK は `uid` のまま）。マージの既定判定にだけ使う | `grs-native-erd-ja.md:326`, `grs-native-erd-ja.md:353`, `grs-native-erd-ja.md:384`, `grs-native-erd-ja.md:1491` |
| `source_project_uid` **要改名** | `string`（≤16 文字） | **可**（③ 出自不明のとき `null`） | — | — | GRS | 値の出所は `Project/UID`（**書き戻さない**）。XSD 実測: `xsd:string` / `maxLength=16` / `minOccurs=0` | 無し（取込時に書く） | 3 状態を表す ① マスタ由来＝値あり ② GRS 生まれ＝**行なし** ③ 出自不明（`Project/UID` 省略）＝行あり・`null` ＋ `import_session_id`。③ は既定を「別 UID」（安全側）へフォールバック | `grs-native-erd-ja.md:327`, `grs-native-erd-ja.md:376`, `grs-native-erd-ja.md:380`, `mspdi_pj12.xsd:238-247` |
| `source_uid` **要改名** | `int` | **未検証**（行があれば取込由来なので値を持つと読めるが、原典に明記が無い） | — | — | GRS | 値の出所は取込元の `Task/UID`（XSD 実測: `xsd:integer`・必須）。**書き戻さない** | 無し（取込時に書く） | **再取込の突合専用。** (`source_project_uid`, `source_uid`) で照合する。**export で元 UID を復元するものではない**（別 UID で振り直したタスクは元ソースへの往復を諦める＝C-3）。これが無いと再取込のたびにタスクが**まるごと複製**する | `grs-native-erd-ja.md:328`, `grs-native-erd-ja.md:382`, `grs-native-erd-ja.md:404`, `grs-native-erd-ja.md:428-429`, `mspdi_pj12.xsd:1610` |
| `last_seen_import_seq` **要改名** | `int` | **未検証**（取込のたびに書くと読めるが、`null` の可否は原典に無い） | — | — | GRS | 無し（**MSPDI には返さない**） | 無し（取込時に書く） | **そのタスクが最後に届いた取込の番号。** 「マスタから消えた候補」を**フラグを立てず導出する**ための観測記録（本書 §4）。マージの「上書き」時は今回値へ**更新**する | `grs-native-erd-ja.md:329`, `grs-native-erd-ja.md:472-481`, `grs-native-erd-ja.md:448` |
| `import_session_id` **要改名** | `string`（GRS が発番する取込セッション ID） | **可**（① マスタ由来のときの値は**未検証**） | — | — | GRS | 無し（**外部 UID ではないので export しない**） | 無し | **`Project.UID` 省略時の代替出自。** `Project/UID` は XSD 上 `minOccurs=0` なので省略されうる | `grs-native-erd-ja.md:330`, `grs-native-erd-ja.md:380`, `grs-native-erd-ja.md:1567`, `mspdi_pj12.xsd:238` |

**この 5 列で全数である**（`grs-native-erd-ja.md:325-331` の ERD ブロックと `grs-native-erd-ja.md:1616` の §7.6 の列挙が一致する。自分で数えた: 5）。

## 3b. 参照 — 他エンティティの列（E07 が記録を指示されたもの。列の正は担当分に譲る）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Task.milestone` | `bool` | 可（Own 列は nullable。`null` ＝ 元ファイルに要素が無かった） | — | — | Own | `Task/Milestone`（XSD 実測: `xsd:boolean` / `minOccurs=0`。⚠️ 同名の要素が `Assignment` にもある） | `null` | **`TaskVisual.shapeKind = 'milestone'` ⇔ `true`。権威はこちら**（export される側だから）。⚠️ 仕様書と辞書は「真偽値の `milestone` という列は持たない」と書く（未解決 U-2） | `grs-native-erd-ja.md:259`, `grs-native-erd-ja.md:1511`, `plan-actual-decisions-ja.md:61`, `plan-actual-decisions-ja.md:356-361`, `mspdi_pj12.xsd:1782`, `mspdi_pj12.xsd:3391` |
| `Task.fadeInDays` | `int`（日数） | 可（`null` なら要素を書かない。`0` と区別する） | — | — | Consume（**GRS が決めた枠だけ Consume。他の `ExtendedAttribute` は Carry**） | 値: `Task/ExtendedAttribute`（`FieldID` ＋ `Value`）／ 定義: `Project/ExtendedAttributes/ExtendedAttribute`（`CFType=5` `ElemType=20` `UserDef=true` `Alias`）。枠は `Number1` | `null` | **`TaskVisual` ではなく `Task` に載る**（写す先が MSPDI にあるため）。掴み点は予定バーの**左上の角**、`rectangle` / `chevron` のみ。**`Estimated` にマッピングしてはならない** | `grs-native-erd-ja.md:269`, `grs-native-erd-ja.md:863-907`, `plan-actual-decisions-ja.md:674`, `plan-actual-decisions-ja.md:1195`, `mspdi_pj12.xsd:986-1050`, `mspdi_pj12.xsd:2248-2264` |
| `Task.fadeOutDays` | `int`（日数） | 可（同上） | — | — | Consume（同上） | 同上。枠は `Number2` | `null` | 掴み点は予定バーの**右下の角**、`rectangle` / `chevron` のみ。**拡張領域を使うのはこの 2 列だけ**（旧 6 枠 → 2 枠） | `grs-native-erd-ja.md:270`, `grs-native-erd-ja.md:37`, `plan-actual-decisions-ja.md:675`, `plan-actual-decisions-ja.md:1196` |
| `TaskGroup.label` | `string` | 可 | — | — | GRS | 無し（非 export） | `null` ＝ 導出 | **`derived_from_task_uid` と同時に `null` にできない**（行の名前が決まらない）。人が手で作った器は必須。改名すると導出が止まる | `grs-native-erd-ja.md:314`, `grs-native-erd-ja.md:967-971` |
| `TaskGroup.derived_from_task_uid` **要改名** | `int` | 可 | —（ERD は **FK と明記していない**） | `Task.uid`（意味上） | GRS | 無し（非 export） | 無し（生成規則で入る） | `label = null` のとき名前の導出元。**`null` ＝ 人が手で作った器**＝ WBS に追随しない。導出は装飾せず、薄字 / 斜体で示す | `grs-native-erd-ja.md:314`, `grs-native-erd-ja.md:954-971`, `grs-native-erd-ja.md:991-992` |
| `TaskGroup.height` **（論理値）** | `int`（論理高さ） | 可 | — | — | GRS | 無し（非 export） | `null` ＝ 自動 | **ズーム = 1 基準の論理高さで持ち、ズームに比例して伸縮する。** px で持つと**縦横を別々に拡大縮小した瞬間にずれる**。疎な上書き | `grs-native-erd-ja.md:318`, `grs-native-erd-ja.md:1023`, `grs-native-erd-ja.md:1212`, `grs-native-erd-ja.md:1219` |
| `TaskGroup.color` | `null` / `'transparent'` / `'#rrggbb'` | 可 | — | — | GRS | 無し（非 export） | `null` ＝ テーマから解く | 行の帯の色。`TaskVisual` の色と同じ扱い（疎な上書き・解いた結果を保存しない） | `grs-native-erd-ja.md:317`, `grs-native-erd-ja.md:1028`, `grs-native-erd-ja.md:1216` |
| `TaskGroup.collapsed` | `bool` | **未検証**（原典に規定が無い） | — | — | GRS | 無し（非 export） | **未検証**（原典に既定値の記載が無い） | ユーザー操作の意思。**見た目の一部なので保存し、共有で再現する** | `grs-native-erd-ja.md:316`, `grs-native-erd-ja.md:1027` |
| `documentSettings.import_seq` **要改名** | `int` | 不可（既定 `0`） | — | — | GRS | 無し（**非 export**） | `0` | 取込のたびに +1 する文書内連番。`TaskOrigin.last_seen_import_seq` と対で「マスタから消えた候補」を導出する。⚠️ **仕様書は同じものを `importSeq`（camelCase）で持つ** | `grs-native-erd-ja.md:1130`, `grs-native-erd-ja.md:472-481`, `tbl-settings.md:134` |

⚠️ **`derived_from_task_uid` と `import_seq` も snake_case であり、許された 3 語に入らない（要改名: `derivedFromTaskUid` / `importSeq`）。** 正の判断は担当分（`TaskGroup` / 文書設定）に譲る。

**本節は 9 行**（自分で数えた）。本書の列の行数は **`TaskVisual` 8 ＋ `TaskOrigin` 5 ＋ 参照 9 = 22 行**である。

## 4. 列に載らない規則（E07 が記録を指示されたもの）

| # | 規則 | 内容 | 出典 |
| --- | --- | --- | --- |
| R-1 | **塗りと輪郭を同時に透明にできない** | 両方を透明にすると**そのタスクが画面から消えて掴めなくなる**。項 25 の「色以外にも識別手段」は線の太さと形状だが、**どちらも図形が描かれることが前提**である。後から選んだ側を優先し、他方をテーマへ戻す。**塗りだけ透明（輪郭だけの図形）は許す** | `grs-native-erd-ja.md:1066-1069` |
| R-1b | 同上の**規則の所在** | ⚠️ **仕様書では `FR-007`（色と線の太さを選ぶ）が持つ**（「塗りと輪郭を同時に透明にすることを許してはならない（MUST NOT）」）。`FR-030` は「色だけで状態を伝えない」であって、この禁止を持っていない。ユースケース側の入口は `UC-003` 拡張 3a | `01-04-requirements.md:1374`, `01-04-requirements.md:3344`, `01-04-requirements.md:548-549` |
| R-2 | **色の値域は 3 種** | `null`（選んでいない → テーマから解く）／ `'transparent'`（人が透明を選んだ）／ `'#rrggbb'`（人が色を選んだ）。**`null` は透明ではない。** 却下案: 空文字・8 桁 hex（半透明を止める理由が無くなる）・真偽列 `fillTransparent`（色を決める場所が 2 つになる）・`null` を透明に読み替え（**色を選んでいない全タスクが一斉に透明になる**） | `grs-native-erd-ja.md:1058-1083` |
| R-3 | **解いた色を保存しない** | 全タスクが具体色を持つ形にしてはならない。`themeHue` を変えたときに**バーだけ前の色で取り残される**（設定値キー `progressLineColor` を廃止したのと同じ事故）。`themeMonochrome` は**描画時のフィルタ**で、保存値は変えない | `grs-native-erd-ja.md:1042-1052`, `plan-actual-decisions-ja.md:564-568`, `01-04-requirements.md:1422` |
| R-4 | **行の高さは倍率 1 のときの論理値で持つ** | `TaskGroup.height` は `null`＝自動 / 値＝**ズーム = 1 基準の論理高さ**で保存し、**ズームに比例**して伸縮する。**画面上の長さ（px）で持つと、GRS は縦横独立ズームなので拡大縮小した瞬間にずれる**。同じ理由でラベルは離散アンカー＋整列にしてある | `grs-native-erd-ja.md:1023`, `grs-native-erd-ja.md:1212`, `grs-native-erd-ja.md:1219` |
| R-5 | **`label` と名前の導出元を同時に `null` にできない** | `TaskGroup.label = null` のとき `derived_from_task_uid` のタスク名を**装飾せずそのまま**表示する。**両方 `null` は禁止**（行の名前が決まらない）。人が手で作った器は `label` 必須。導出であることは薄字 / 斜体で示し、**文字列に印を混ぜない**（生成文字列を `label` に保存すると多国語対応が壊れる） | `grs-native-erd-ja.md:954-963`, `grs-native-erd-ja.md:967-971` |
| R-6 | **既定行（器）の生成規則** | ① 子を持つタスク S → 器を作り S の直下の葉を member に入れる（**S 自身も member**）② 子を持たない Lv1 タスク → 単独の器 ③ 子を持たない Lv2 以下 → 親サマリの器。**ルート器は作らない。Lv1 の葉のために架空の親サマリを作ってはならない** | `grs-native-erd-ja.md:942-950` |
| R-7 | **器の寿命** | 葉 → サマリ: そのタスクの器を作り新しい葉を member に入れる。サマリ → 葉: **器は残す**（書式が入っている可能性がある）。空の器は畳んで隠せること。インデントで 6 段目になる操作は**そもそもできないようにする** | `grs-native-erd-ja.md:996-1001` |
| R-8 | **二軸の追随は片方向** | バーを別の行へドラッグ（マルチバー化）→ WBS は**変わらない**・member が変わる・外部マスタへ**伝播しない**。`Row Title Tree` で階層を移動 → WBS が**変わり**・器が**追随して動き**・**伝播する**。「両軸は独立」を双方向と読んではならない | `grs-native-erd-ja.md:976-984` |
| R-9 | **器は追随するが作り直さない** | 更新するのは `parent_id` だけで、`id` / `label` / `color` / `height` / `collapsed` と member の `stack_order` は**保つ**。作り直すとユーザーが作った視覚情報が WBS 操作で消える。**人が手で作った器（`derived_from_task_uid = null`）は追随しない** | `grs-native-erd-ja.md:988-992` |
| R-10 | **削除の連鎖** | `Task` 削除 → `TaskVisual` / `TaskGroupMember` / 端点とする `Dependency` / `task_uid` が一致する `Assignment` を連鎖削除し、**件数をトーストで通知**する。※`TaskOrigin` は**この表に挙がっていない**（本書「未解決」） | `grs-native-erd-ja.md:673` |
| R-11 | **マージ時（「上書き」）の扱い** | `TaskVisual` は**保持**（MSPDI に出ない情報。置換すると再取込のたびに見た目が壊れる）。`TaskGroupMember` も**保持**。`TaskOrigin` は**更新**（`source_uid` は維持、`last_seen_import_seq` を今回値に） | `grs-native-erd-ja.md:446-448` |
| R-12 | **「消えた候補」はフラグを立てず導出する** | 記録するのは `documentSettings.import_seq`（取込のたびに +1）と `TaskOrigin.last_seen_import_seq` の 2 つだけ。判定は `last_seen_import_seq < max(同じマスタの last_seen_import_seq)` で**保存しない**。→ 立て消しが存在しないので**消し忘れバグが構造的に起きない**。**GRS は勝手に消さず、通知して人に選ばせる** | `grs-native-erd-ja.md:470-487` |
| R-13 | **`TaskVisual` / `TaskOrigin` は非 export** | MSPDI は**描画データを一切持たない**（Bar Styles・色・行高・折畳・ズームは全てファイル外）。「同じ見た目の再現」は **GRS の JSON でのみ**成立する | `grs-native-erd-ja.md:1262`, `grs-native-erd-ja.md:1665` |

## 5. フェード（`fadeInDays` / `fadeOutDays`）は `TaskVisual` に**無い**

**原典で確かめた結論: フェードの 2 列は `Task` にある。`TaskVisual` には無い。**

| 事実 | 内容 | 出典 |
| --- | --- | --- |
| 置き場所 | `Task.fadeInDays` / `Task.fadeOutDays`。`← ExtendedAttribute(Consume・拡張領域)` と注記されている | `grs-native-erd-ja.md:269-270` |
| なぜ `Task` か | **拡張領域は MSPDI の一部**なので、そこで往復する値は「MSPDI に存在するデータ」である。したがって「`Task` は MSPDI 由来の列のみ」に反しない。**`TaskVisual` に置くべきは「MSPDI に写す先が無いもの」**（色・形状・名称ラベル位置）であり、fade は写し先を持つので区別される | `grs-native-erd-ja.md:867` |
| 使う枠 | 拡張領域を使うのは**この 2 つだけ**（旧 6 枠 → 2 枠）。`Number1` / `Number2`。`Text` も `Date` も `Flag` も使わない | `grs-native-erd-ja.md:37`, `plan-actual-decisions-ja.md:1188-1198` |
| MSPDI 側の型 | `CFType = 5`（Number）/ `ElemType = 20`（Task）/ `UserDef = true` / `Alias = 'GRS Fade In Days'` `'GRS Fade Out Days'`。**定義（`Project/ExtendedAttributes/ExtendedAttribute`）と値（`Task/ExtendedAttribute`）の両方を書かないと成立しない** | `grs-native-erd-ja.md:869-885` |
| 枠の衝突 | 固定枠を使うが、**取込時に同じ `FieldID` が取込側にも定義されていたら空き枠へ退避して警告**する（他ツールのデータを静かに上書きしない）。GRS が使う `FieldID` だけ Consume、他は Carry。**値が `null` なら要素を書かない**（`0` とは区別） | `grs-native-erd-ja.md:889-907` |
| `Estimated` との違い | **`fadeInDays` を `Estimated` にマッピングしてはならない。** `Estimated` はタスク全体で 1 つの 2 値、fade は**両端で独立・日数で指定**。`Estimated` と `DurationFormat` は引き続き Carry | `grs-native-erd-ja.md:922-931` |
| 掴み点 | 予定バーの**左上の角**＝フェードイン、**右下の角**＝フェードアウト。**`rectangle` / `chevron` のみ**（幅のない形状とマイルストーンは持たない） | `plan-actual-decisions-ja.md:222-226`, `plan-actual-decisions-ja.md:674-675` |
| 切り欠きとの区別 | **切り欠き（`chevron`）とフェードインは別物。** 切り欠きは形状の描き方で日数を持たない。**フェードインの日数は予定と実績で同じ値を使う** | `plan-actual-decisions-ja.md:321-325` |
| ⚠️ PoC / アイコン草案 | **本調査では確認していない（未検証）。** 上の事実はすべて ERD §5.5f と plan-actual §2 から取った。PoC（`previous-project-result/08-poc/`）とアイコン草案は E07 の指定原典に入っていないので開いていない。**「PoC に無い」も「ある」も本書は主張しない** | — |

## 6. `TaskVisual` の値が引く設定値（`tbl-settings.md`）

| `TaskVisual` の値 | 引く設定値キー | 既定 | 出典 |
| --- | --- | --- | --- |
| `shapeKind = 'rectangle'` | `shapeHeightOf.rectangle` | `1.0`（基準なので固定） | `tbl-settings.md:61` |
| `shapeKind = 'chevron'` | `shapeHeightOf.chevron` ＋ `chevronNotchOfHeight` / `chevronNotchOfWidth` | `1.0` 🔎 / `0.45` 🔎 / `0.35` 🔎 | `tbl-settings.md:62`, `tbl-settings.md:91-92` |
| `shapeKind = 'arrow'` | `shapeHeightOf.arrow` ＋ `arrowHeadOfStroke` / `arrowHeadOfSpan` | `0.5` / `3.2` 🔎 / `0.4` 🔎 | `tbl-settings.md:63`, `tbl-settings.md:93-94` |
| `shapeKind = 'endpointSpan'` | `shapeHeightOf.endpointSpan` ＋ `spanDotOfStroke` | `0.5` / `1.15` 🔎 | `tbl-settings.md:64`, `tbl-settings.md:95` |
| `shapeKind = 'milestone'` | `shapeHeightOf.milestone` | `1.5` | `tbl-settings.md:65` |
| `milestoneGlyph = 'star'` | `starInnerOfOuter`（**この値が ☆ の面積を決め、並び順に影響する**） | `0.45` 🔎 | `tbl-settings.md:96` |
| 実績の縦幅（全形状共通） | `actualOfPlan`（**比は 1 つだけ。マイルストーンも例外ではない**） | `0.73` 🔎（**由来は寸法統合前の 22 : 16。設計上の導出ではない**） | `tbl-settings.md:53`, `tbl-settings.md:109-111`, `plan-actual-decisions-ja.md:276-297` |
| `fillColor` / `strokeColor` が `null` のとき | `themeHue` / `themePreference` / `themeMonochrome` | `214` / `'light'` 🔎 / `false` | `tbl-settings.md:148-150`, `tbl-settings.md:158` |
| `lineWeight` の 3 値 | **該当キーが `tbl-settings.md` に無い**（`planStroke` / `thinStroke*` は細線形状の太さであって `lineWeight` ではない） | — | `tbl-settings.md:87-90`, `tbl-glossary.md:171-174` |

## 7. 命名の点検（規約との突き合わせ）

規約: 識別子は英語・lowerCamelCase 既定。snake_case を許すのは `wbs_parent_uid` / `link_type` / `Project.status_date` の **3 語だけ**。

| 原典の名前 | 判定 | 提案 | 理由 | 出典 |
| --- | --- | --- | --- | --- |
| `TaskVisual.task_uid` | **要改名** | `taskUid` | 許された 3 語に入らない snake_case | `grs-native-erd-ja.md:333` |
| `TaskOrigin.task_uid` | **要改名** | `taskUid` | 同上 | `grs-native-erd-ja.md:326` |
| `TaskOrigin.source_project_uid` | **要改名** | `sourceProjectUid` | 同上。大文字略語を連ねないので `UID` ではなく `Uid` | `grs-native-erd-ja.md:327` |
| `TaskOrigin.source_uid` | **要改名** | `sourceUid` | 同上 | `grs-native-erd-ja.md:328` |
| `TaskOrigin.last_seen_import_seq` | **要改名** | `lastSeenImportSeq` | 同上。仕様書は同系の文書設定を既に `importSeq` と camelCase で持っている | `grs-native-erd-ja.md:329`, `tbl-settings.md:134` |
| `TaskOrigin.import_session_id` | **要改名** | `importSessionId` | 同上 | `grs-native-erd-ja.md:330` |
| `TaskVisual` の残り 7 列（`nameAnchor` `nameAlign` `shapeKind` `milestoneGlyph` `fillColor` `strokeColor` `lineWeight`） | 適合 | — | lowerCamelCase。汎用語（`type` / `data` / `info` / `value`）を含まない。用語辞書 `P-10` / `P-16` / `P-18` / `P-20` と**綴りが一致** | `grs-native-erd-ja.md:334-340`, `tbl-glossary.md:48`, `tbl-glossary.md:54`, `tbl-glossary.md:56`, `tbl-glossary.md:58` |
| エンティティ名 `TaskVisual` / `TaskOrigin` | 適合（ただし**辞書に無い**） | — | PascalCase。用語辞書の表 T-101 は `Task` / `TaskGroup` / `TaskGroupMember` / `stackOrder` / `Item` の 5 語だけで、**この 2 つを載せていない** | `tbl-glossary.md:23-29` |

## 8. MSPDI 突合（正本 XSD で確かめたこと・確かめられないこと）

| 主張 | 出所 | XSD での確認 | 判定 |
| --- | --- | --- | --- |
| `Task/Milestone` は `xsd:boolean`、"Whether the task is a milestone." | `plan-actual-decisions-ja.md:367` | `mspdi_pj12.xsd:1782`（`type="xsd:boolean"` / `minOccurs="0"`） | **確認した** |
| （原典に記載なし）**`Milestone` は `Assignment` にも在る** | — | `mspdi_pj12.xsd:3391`（"Whether the assignment is a milestone."） | **本調査で確認した追加事実。** 同名要素なので、実装時に `Task/Milestone` と取り違えないこと |
| 形状・グリフに相当する要素は MSPDI に 1 つも無い（近いのは `HideBar` だけ） | `plan-actual-decisions-ja.md:373` | `xsd:element name="…"` を `Color` / `Shape` / `Style` / `Font` / `Bar` / `Pattern` / `Glyph` / `Icon` / `Visual` / `Height` / `Fill` / `Stroke` で走査 → 該当は `HideBar`（`mspdi_pj12.xsd:2126`）**のみ** | **確認した（この語彙の範囲で）。** 全要素名を 1 つずつ目視したわけではない |
| 拡張領域の定義側は `FieldID` / `FieldName` / `CFType` / `ElemType` / `Alias` / `UserDef` / `Guid` を持つ | `grs-native-erd-ja.md:873` | `mspdi_pj12.xsd:986-1080`（いずれも実在。`CFType` は `5=Number`、`ElemType` は `20=Task`、`Alias` は `maxLength=50`） | **確認した** |
| 拡張領域の値側は `FieldID` / `Value` / `ValueGUID` / `DurationFormat` を持つ | `grs-native-erd-ja.md:874` | `mspdi_pj12.xsd:2248-2270`（4 つとも実在） | **確認した** |
| `Project/UID` は `xsd:string` / `maxLength=16` / `minOccurs=0`（＝省略可） | `grs-native-erd-ja.md:1567` | `mspdi_pj12.xsd:238-247` | **確認した**（`TaskOrigin.source_project_uid` が `null` を取る根拠） |
| `Task/UID` は `xsd:integer` で必須 | `grs-native-erd-ja.md:254`（GRS 側は `int uid PK`） | `mspdi_pj12.xsd:1610`（`minOccurs` 属性なし＝必須） | **確認した**（`task_uid` / `source_uid` が整数である根拠） |
| GRS が使う枠は `Number1` / `Number2` | `plan-actual-decisions-ja.md:1195-1196` | `FieldID` は `xsd:string`「PID に対応する」とあるだけで、**枠と PID の対応表は XSD に無い** | **未検証。** 実値は XSD からは決まらない |
| MS Project が `Number` 枠を何番まで解釈するか | `plan-actual-decisions-ja.md:1291` | XSD の documentation は "Project only understands Flag1-Flag10, etc." としか書かない（`mspdi_pj12.xsd:988`） | **未検証（実機確認の残件）** |

⚠️ **原典の参照先の齟齬**: `grs-native-erd-ja.md:1746` は「ローカル複製 `../01-mspdi/mspdi/mspdi_pj12.xsd` は同梱していない」と書くが、**正本の XSD は `docs/reference/mspdi/mspdi_pj12.xsd` に実在する**（`previous-project-result/01-mspdi/mspdi/` には `README.md` しか無い）。**MSPDI の事実は前者で確かめること。**

## 未解決

| # | 何が問題か | 原典 A | 原典 B | どう決まっていないか |
| --- | --- | --- | --- | --- |
| U-1 | **`shapeKind` の所有エンティティ** | `TaskVisual.shapeKind`（ERD の ERD ブロックと §7.6、plan-actual §2-2-2 が明示） `grs-native-erd-ja.md:336` / `grs-native-erd-ja.md:1615` / `plan-actual-decisions-ja.md:332` | **`Task.shapeKind`**（仕様書 表 T-005 `G-1` `01-04-requirements.md:190`、用語辞書 `N-1` `tbl-glossary.md:25`、**plan-actual 自身の §9-1** `plan-actual-decisions-ja.md:1048-1050`） | **食い違っている。** データモデルの原典は `TaskVisual` に置き、その理由は「`Task` を MSPDI Own だけの器に保つ → export に除外一覧が要らない」（§1）。仕様書側は散文の読みやすさから `Task.shapeKind` と書いている。**どちらを正とするか未決。** ⚠️ plan-actual は §2-2-2 で `TaskVisual.shapeKind`、§9-1 で `Task.shapeKind` と書いており**文書内で矛盾**している |
| U-2 | **`Task.milestone` 列の有無** | **持つ**（`Task.milestone` は Own ← MSPDI `Milestone`。`shapeKind = 'milestone'` の**権威**） `grs-native-erd-ja.md:167` / `grs-native-erd-ja.md:259` / `grs-native-erd-ja.md:1511` / `plan-actual-decisions-ja.md:61` / `plan-actual-decisions-ja.md:356-361` | **持たない**（「⚠️ **真偽値の `milestone` という列は持たない**」） `01-04-requirements.md:190` / `tbl-glossary.md:25` | **正面から矛盾する。** XSD 実測では `Task/Milestone` は `xsd:boolean` / `minOccurs=0` で実在し（`mspdi_pj12.xsd:1782`）、Own として往復する対象である。仕様書の言い分（1 概念 2 表現を作らない）は分かるが、**列を持たないなら MSPDI の `Milestone` を何に写すのかが未定義**。U-1 と一体で決めること |
| U-3 | **透明の同時禁止を持つ要求番号** | 指示は `FR-030` が持つとした | 仕様書の実文は **`FR-007`** が持つ（`01-04-requirements.md:1374`）。`FR-030` は「色だけで状態を伝えない」（`01-04-requirements.md:3344`） | **指示の参照先が実物と違う。** 規則そのもの（同時透明の禁止）は原典 `grs-native-erd-ja.md:1066` と仕様書 `FR-007` の両方に在り、内容は一致している |
| U-4 | **`TaskVisual` 行が無い `Task` の見た目** | ERD の関係は **0..1**（`Task \|\|--o\| TaskVisual`）`grs-native-erd-ja.md:228` | `shapeKind` は疎な上書きの一覧に**無い**＝常に値を持つ読み `grs-native-erd-ja.md:1032` | **行が無いタスクの `shapeKind` / `lineWeight` をどう決めるかが原典に無い。** 既定値（`'rectangle'` か）も、`TaskVisual` を 1:1 必須にするのかも書かれていない。**未検証** |
| U-5 | **`lineWeight` の既定値と px 解決** | ERD は 3 値（`thin` / `medium` / `thick`）と「テーマから導出しない」だけを書く `grs-native-erd-ja.md:340` | 仕様書 表 T-017 `CL-2` は「細 / 中 / 太」`01-04-requirements.md:1391`。設定値の表・キー表の**どこにも `lineWeight` のキーが無い** | **3 値が何 px になるかが決まっていない。** 既定値も原典に無い。**未検証** |
| U-6 | **`TaskOrigin` の連鎖削除** | 削除の連鎖表は `TaskVisual` / `TaskGroupMember` / `Dependency` / `Assignment` を挙げるが、**`TaskOrigin` を挙げていない** `grs-native-erd-ja.md:673` | `TaskOrigin` は `Task` に 0..1 でぶら下がる `grs-native-erd-ja.md:229` | **書き漏れか意図的かが読み取れない。** 残すと「行が無い＝GRS 生まれ」の判定に**存在しないタスクの出自行**が混ざる。**未検証** |
| U-7 | **`TaskOrigin` の 3 列の `null` 可否** | `source_project_uid` は `null` を取ると明記 `grs-native-erd-ja.md:380` | `source_uid` / `last_seen_import_seq` / `import_session_id` は**規定が無い** | **未検証。** 特に「マスタ由来（① 状態）のときに `import_session_id` が `null` か」は書かれていない |
| U-8 | **`actualPlacement` という名前** | ERD にも plan-actual にも**この語は無い**（規則は「上下に幅がある → 内側」「幅がない → 下」「マイルストーン → 実績日へ横」という表の形で在る）`plan-actual-decisions-ja.md:222-236` | 用語辞書 `P-17` に `actualPlacement`（`'inside'` / `'below'` / `'atActualDate'`。**`shapeKind` から導出する**）`tbl-glossary.md:55` | **仕様書側で新設された語。** 導出値なので列ではないと読めるが、**保存しないことを明記した記述がどちらにも無い**。**未検証** |
| U-9 | **エンティティ名が用語辞書に無い** | ERD は `TaskVisual` / `TaskOrigin` を一級のエンティティとして持つ `grs-native-erd-ja.md:1490-1491` | 用語辞書 表 T-101（データの語）に**両方とも無い** `tbl-glossary.md:23-29` | **辞書の全数性が破れている。** 辞書が「語は 1 つも落とさずに引き継いだ」と書いている以上、**意図して落としたのか漏れたのかが読めない** |
| U-10 | **透明時のコントラスト判定** | 「透明の要素は**その下にある色**を相手にコントラストを判定する（下限 3:1）」`grs-native-erd-ja.md:1070-1071` | ⚠️ 原典自身が「**未検証である。次期の色 PoC で実測する。推測で値を書かない**」`grs-native-erd-ja.md:1072` | **未検証（原典が明示）** |
| U-11 | **SVG 出力で透明をどう書くか** | `fill="none"` か `fill="transparent"` か | 「**本資産に記述が無い。次期が決める**」`grs-native-erd-ja.md:1073-1074` | **未決（原典が明示）** |
| U-12 | **モノクロ時のコントラスト** | `themeMonochrome` は描画時のフィルタで保存値を変えない `grs-native-erd-ja.md:1116` | 「**モノクロ時のコントラストは未検証である**」`tbl-settings.md:168` | **未検証（原典が明示）** |
| U-13 | **`actualOfPlan = 0.73` の由来** | 全形状に同じ比を掛ける規則は確定 `plan-actual-decisions-ja.md:276-297` | 「**`0.73` 自体に設計上の導出は無い**」`plan-actual-decisions-ja.md:292-294`、「**選び直してよい**」`tbl-settings.md:109-111` | **値の根拠が無い（原典が明示）。** 規則は「比が 1 つであること」であって値ではない |
| U-14 | **要改名（命名規約違反）が 6 件** | 原典の名前: `TaskVisual.task_uid` / `TaskOrigin.task_uid` / `source_project_uid` / `source_uid` / `last_seen_import_seq` / `import_session_id`（自分で数えた: 6） | 規約が許す snake_case は `wbs_parent_uid` / `link_type` / `Project.status_date` の **3 語だけ** | **改名する（`taskUid` / `sourceProjectUid` / `sourceUid` / `lastSeenImportSeq` / `importSessionId`）か、許す語を増やすかの判断が要る。** 参照した他エンティティの `derived_from_task_uid` / `import_seq` も同じ状態（本書 §3b。判断は担当分に譲る） |
