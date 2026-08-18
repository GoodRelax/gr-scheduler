# W4 `Adapter` —— 開発の記録

**規則は [`docs/development-rules/05-working-method.md`](../development-rules/05-working-method.md)。書式は [README](README.md)。**

**対象**: `src/adapter`   ⭐ **機械検査がこの宣言を読み、状態表と実物を突き合わせる。**

---

## 現在地

⬜ **31 ユニットとも未着手。** ⭐ **着手前の調査を終えた**（2026-08-18）。

### 調査で決まったこと

⭐ **裁定 J の 3 件は、いずれも利用者に問う必要が無かった**（規則 06 の 1. の実測がまた再現した）。

```
J-1  裁定不要。FR-019 が「指定が無ければ注記用の固定色で描くこと（MUST）」と
     既に定めており、CM-55 の引数は既に string | null で実装済み・試験済み
J-2  裁定不要。前提が誤っていた。CM-33 は選択を前提にしない —— 対象は
     groupId で受ける（実装済み・試験済み）。Agent API は applyCommands に
     その値を渡すだけである
J-3  件数が誤っていた。5 件ではなく 3 件（CM-40 / CM-44 / CM-45）。
     しかも「面が無い」のではなく、⛔ 仕様の中で 2 つの文が食い違っている
```

### 縦線 —— **N = 5。31 本そろえる必要は無い**

```
1  src/adapter/svg-renderer/svg-surface.ts          UF-33  継ぎ目 IF-1 の宣言
2  src/adapter/svg-renderer/svg-renderer.ts         UF-32  公開エントリ PI-19
3  src/framework/dom-svg-surface/dom-svg-surface.ts UF-49  IF-1 の実装（W5）
4  src/framework/single-html-shell/single-html-shell.ts UF-47  BO-1〜BO-5（W5）
5  src/framework/single-html-shell/frame-loop.ts    UF-48  現在値と CA-1（W5）
```

⭐ **表 T-077 の BO-1 / BO-2 / BO-4 が名指すユニットは全部実装済みである**
（`UF-58` `regionsFromScreen` ／ `UF-23` `chooseStartupDocument` ／
`UF-5` `layoutFromSchedule` ／ `UF-6` `geometryFromLayout`）。**未実装は BO-5 だけである。**

⚠️ **W5 に先に手を出すのは 8 コンポーネント中 2 つ・9 ファイル中 3 ファイルだけである。**

**次の一手**:

```
1. ✅ CR-185（SvgRenderer → Schedule の辺）適用済み
2. ✅ CR-186（担当者の面。表 T-225 を新設）適用済み
     25 検査 ALL GREEN／audit-ch5 PASS／描画 PASS／試験 684 件緑
3. ⛔ 残る CR を 1 本書く
     CR-c  バンドル済み GRS JSON（FR-027 の初期テンプレート。裁定は受けた）
           ソフト開発・3 年・7 フェーズを矢羽根・L1〜L5・100 行 / 1000 タスク・
           schemaVersion は日付・L1 は森（Total System / SmartPhone App / …）
4. 縦線の 1（UF-33）から順に書く。段は 05 の 4. に従う
5. 試験は別のエージェントに docs/spec だけを読ませて書かせる（04 の 1.）
```

---

## 状態表

⭐ **段**: ⬜ 未着手 → 🔧 実装済 → 🧪 試験済 → ✅ 受入済
⛔ **✅ になるまで、他のユニットがそれに依存してはならない**（05 の 4.）。
⭐ **例外は型だけ** —— 公開エントリの型が型検査を通れば、依存側は書き始めてよい（05 の 3.）。

### `agent-api-endpoint` —— AgentApiEndpoint（PI-17）

| ユニット | ファイル | 種別 | 純粋性 | 公開 | 段 |
| --- | --- | --- | --- | --- | --- |
| UF-27 | `agent-api-endpoint.ts` | **公開エントリ** | non-pure | PI-17 | ⬜ 未着手 |
| UF-28 | `agent-api-members.ts` | 内部 | non-pure |  | ⬜ 未着手 |
| UF-29 | `snapshot-source.ts` | 内部 | n/a |  | ⬜ 未着手 |

### `autosave-gateway` —— AutosaveGateway（PI-23）

| ユニット | ファイル | 種別 | 純粋性 | 公開 | 段 |
| --- | --- | --- | --- | --- | --- |
| UF-43 | `autosave-gateway.ts` | **公開エントリ** | semi-pure-b | PI-23 | ⬜ 未着手 |
| UF-44 | `document-store.ts` | 内部 | n/a |  | ⬜ 未着手 |

### `clipboard-gateway` —— ClipboardGateway（PI-24）

| ユニット | ファイル | 種別 | 純粋性 | 公開 | 段 |
| --- | --- | --- | --- | --- | --- |
| UF-45 | `clipboard-gateway.ts` | **公開エントリ** | non-pure | PI-24 | ⬜ 未着手 |
| UF-46 | `clipboard.ts` | 内部 | n/a |  | ⬜ 未着手 |

### `document-codec` —— DocumentCodec（PI-20）

| ユニット | ファイル | 種別 | 純粋性 | 公開 | 段 |
| --- | --- | --- | --- | --- | --- |
| UF-34 | `document-codec.ts` | **公開エントリ** | pure | PI-20 | ⬜ 未着手 |
| UF-38 | `app-shell-source.ts` | 内部 | n/a |  | ⬜ 未着手 |
| UF-37 | `embedded-html-codec.ts` | 内部 | semi-pure-b |  | ⬜ 未着手 |
| UF-35 | `json-codec.ts` | 内部 | pure |  | ⬜ 未着手 |
| UF-36 | `mspdi-codec.ts` | 内部 | pure |  | ⬜ 未着手 |

### `file-gateway` —— FileGateway（PI-22）

| ユニット | ファイル | 種別 | 純粋性 | 公開 | 段 |
| --- | --- | --- | --- | --- | --- |
| UF-41 | `file-gateway.ts` | **公開エントリ** | semi-pure-b | PI-22 | ⬜ 未着手 |
| UF-42 | `file-store.ts` | 内部 | n/a |  | ⬜ 未着手 |

### `image-exporter` —— ImageExporter（PI-21）

| ユニット | ファイル | 種別 | 純粋性 | 公開 | 段 |
| --- | --- | --- | --- | --- | --- |
| UF-39 | `image-exporter.ts` | **公開エントリ** | semi-pure-b | PI-21 | ⬜ 未着手 |
| UF-40 | `rasterizer.ts` | 内部 | n/a |  | ⬜ 未着手 |

### `input-command-translator` —— InputCommandTranslator（PI-18）

| ユニット | ファイル | 種別 | 純粋性 | 公開 | 段 |
| --- | --- | --- | --- | --- | --- |
| UF-30 | `input-command-translator.ts` | **公開エントリ** | pure | PI-18 | ⬜ 未着手 |
| UF-31 | `input-source.ts` | 内部 | n/a |  | ⬜ 未着手 |

### `screen-renderer` —— ScreenRenderer（PI-37）

| ユニット | ファイル | 種別 | 純粋性 | 公開 | 段 |
| --- | --- | --- | --- | --- | --- |
| UF-60 | `screen-renderer.ts` | **公開エントリ** | pure | PI-37 | ⬜ 未着手 |
| UF-62 | `app-header-items.ts` | 内部 | pure |  | ⬜ 未着手 |
| UF-65 | `command-palette.ts` | 内部 | pure |  | ⬜ 未着手 |
| UF-68 | `dialogue-field.ts` | 内部 | pure |  | ⬜ 未着手 |
| UF-67 | `notices.ts` | 内部 | pure |  | ⬜ 未着手 |
| UF-66 | `open-modals.ts` | 内部 | pure |  | ⬜ 未着手 |
| UF-64 | `properties-panel.ts` | 内部 | pure |  | ⬜ 未着手 |
| UF-63 | `row-title-panel.ts` | 内部 | pure |  | ⬜ 未着手 |
| UF-61 | `screen-frame.ts` | 内部 | pure |  | ⬜ 未着手 |
| UF-70 | `screen-surface.ts` | 内部 | n/a |  | ⬜ 未着手 |
| UF-69 | `tooltips.ts` | 内部 | pure |  | ⬜ 未着手 |

### `svg-renderer` —— SvgRenderer（PI-19）

| ユニット | ファイル | 種別 | 純粋性 | 公開 | 段 |
| --- | --- | --- | --- | --- | --- |
| UF-32 | `svg-renderer.ts` | **公開エントリ** | pure | PI-19 | ⬜ 未着手 |
| UF-33 | `svg-surface.ts` | 内部 | n/a |  | ⬜ 未着手 |

---

## 記録

⭐ **追記のみ。過去の行を書き換えない。**

| 日付 | 種別 | 内容 |
| --- | --- | --- |
| 2026-08-18 | 準備 | ⭐ **W4 が読む値はすべて原稿から生成済み** —— `COLUMN_DEFAULTS` / `NOT_STORED_SIZES` / `NOT_STORED_LIMITS` / `DEFAULT_CALENDAR_VALUES` / `DATE_COLUMNS`。**数を写す作業は無い** |
| 2026-08-18 | 実測 | ⛔ **`index.html` が読む `single-html-shell.ts` は中身が無い** —— いまアプリは何も描かない。実物確認は縦線が通るまでできない |
| 2026-08-18 | 未決 | ⚠️ **裁定 J（3 件）が未回答** —— `setHighlightBoxStrokeColor`（`null` に戻す入口を置くか）／ `setTaskGroupCollapsed`（選択前提を `Agent API` がどう呼ぶか）／ `createResource` ほか 4 件（面が無い）|
| 2026-08-18 | 裁定不要 | ⭐ **J-1 は仕様が既に答えていた。** `FR-019` の RATIONALE が「**ハイライトボックスの線色を指定でき、指定が無ければ注記用の固定色で描くこと（MUST）**」と定め、`null` の意味を「既定色で描く」に固定している。表 T-108 は自らを命令の全数と宣言し（`tbl-glossary.md:341`）、**引数は `src/` の公開エントリが正**（同 `:342`。CR-146 の裁定）。⭐ **`src/use-case/edit-document/edit-annotation.ts:97` が既に `strokeColor: string \| null` を宣言し、`'transparent'` を拒む**（`FR-019` の MUST NOT）。⛔ **独立した reset 命令は要らない** —— `FR-007`（`:1461`）が「戻せること（MUST）」の射程を `Task` の線色・塗り色と行の色に明示的に限っており、注記を含まない。**だから `CM-23` / `CM-31` は在り、注記の reset は無い** |
| 2026-08-18 | 裁定不要 | ⭐ **J-2 は前提そのものが誤っていた。** `setTaskGroupCollapsed` は選択を前提にしない。`src/use-case/edit-document/edit-task-group.ts:83` が `{ kind, groupId, collapsed }` を宣言し、試験も通っている。**`FR-085`（`:1270`）が「表 T-015 の `HR-3` 〜 `HR-5` … が前提にしている『選ばれた行』は本規則が与える」と明記**し、しかもその選択は 表 T-023c の描画領域の選択とは**別の集合**である。⛔ **`UN-9`（選択は取り消しの対象外）と `UN-14`（畳みは対象）が制度的に分けており、選択が `DocumentCommand` になりえない。** ⭐ **`Agent API` は `AM-7` `applyCommands` に値を渡すだけ**（表 T-107 に選択を変えるメンバは無い）。**複数行に効く入口（`HR-1` 〜 `HR-4` / `HF-3`）は `CM-33` を N 本にして 1 回に束ねる** —— 原子性は `AG-3`、履歴 1 段は `FR-031` が既に持つ |
| 2026-08-18 | 罠 | ⛔ ⭐ **`SvgRenderer` が色に 1 つも届かない** —— `_source/components.json` の辺は `ScheduleGeometry` / `ScheduleLayout` / `DocumentSettings` / `Selection` の 4 本だけで、**`Schedule` への辺が無い。** ところが `themeHue` は `Project` にあり（`AT-19`。表 T-052 の `DR-5` が「見せ方の群が持ってはならない（MUST NOT）」と定める）、`TaskVisual` の線色・塗り色と `TaskGroup.color` も日程データの群にある。⚠️ **幾何も色を運んでいない**（`schedule-geometry.ts` / `schedule-layout.ts` に `color` の綴りが 0 件。自分で数えた）。⭐ **5.1 が「描き方は `Adapter` が持ち、`layoutEngine` は座標までしか持たない」と書いているので、幾何に色を載せる案は仕様の言葉に反する。** ⛔ **`UF-32` を書く前に CR で辺を 1 本足す必要がある**（原稿を触るので図の再生成を伴う）|
| 2026-08-18 | 食い違い | ⛔ **J-3 は「面が無い」のではなく、仕様の中で 2 つの文が食い違っている。** 件数も誤りで、一次資料（`CR-150:127`）は「`createResource` ほか **3** 件」であり引継書の「ほか 4 件」は写し違い。さらに `CM-41` `setResourceName` には面が在る（表 T-023 の `MK-13` ／ 表 T-023d の `GR-11` ／ 表 T-036 の `SK-19`）。⭐ **残るのは `CM-40` / `CM-44` / `CM-45` の 3 件である。** ⛔ **食い違いの中身**: `UC-003` 手順 3（`:573`）が「日付・形状・色・線の太さ・**担当者**のいずれかを変える」と書き、`FR-006` の ORIGIN（`:1371`）が「UC-003 手順 1 〜 3」を名乗るのに、**表 T-016 の `PR-16`（`:1398`）が「読み取り専用」と書いている。** しかも `FR-006` の STATEMENT は「**同表が読み取り専用と記した項目を除いて**編集できるようにする」なので、`PR-16` の 1 語が面を閉じている。⭐ **決め手は要望の入力である** —— `previous-project-result/user-order.md:178`（`PR-16` の直接の祖先の行）が「**割当の追加・編集・解除ができる**（項 69）」と書き、項 69（`:198`）が「担当者を `GRS` 側で追加・編集・解除でき」と書く。**したがって面はプロパティパネルであり、「発明」ではなく「採用」である** |
| 2026-08-18 | 実測 | ⚠️ **エージェントの引用は行番号がよくずれる。** 反証の 9 巡が挙げた食い違いはほぼ全部が行番号の 1〜25 行のずれで、**逐語の中身は正しかった。** ⛔ **ただし 1 件だけ本物があった** —— 「前プロジェクトに面が無いので発明になる」という判定が誤りで、`user-order.md:178` に面が在った。⭐ **観点を変えた 3 体で反証させたのが効いた**（要求本文 / 表と図 / 先例と参考）|
| 2026-08-18 | 裁定 | ⭐ **利用者の裁定を 3 件受けた。** ①色は案 (a)（`SvgRenderer → Schedule` の辺を足す）。②担当者の面は 2 つ —— 担当ラベル（表示モード時。未設定は `-`、`Del` か `-` で解除）とプロパティパネル（UID はドロップダウン＋部分一致検索）。**見かけのキーは名前、実際のキーは UID。名簿に無い名前は追記し、同名が複数 UID にあるときは小さい UID を採る。** ③初期文書はバンドル済み `GRS JSON`（一般的なソフト開発・3 年・7 フェーズを矢羽根・L1〜L5・**100 行 / 1000 タスク**・`schemaVersion` は日付）|
| 2026-08-18 | 罠 | ⛔ ⭐ **`.drawio` の後ろ指し（XML 注記）が、図を 5 枚とも空にしていた** —— 66KB → **437 バイト**（`width="37px"`）。⚠️ **draw.io は「何も描かない」を返しながら終了コード 0 を返す**ので `build.py` の `run()` は気づかない。⛔ **その状態で機械検査 25 本は ALL GREEN だった** —— 検査 16 は `.svg` を何とも突き合わせていない。⭐ **切り分け**: 注記を外すと 51974 バイト、`mxGraphModel` の属性にしても 51974 バイト（注記なしと同じ）。**属性へ移した。** ⚠️ **`build.py` の docstring は「`<root>` の中なら 1 バイト違わず出る」と実測を主張していたが、その実測はもう成り立たない**（exe は 2026-05-28 付）。⭐ **`assert_drawn` を生成器に足し、わざと壊して落ちることを確かめた** |
| 2026-08-18 | 罠 | ⚠️ **`build.py` は `overview.json` の `$comment`（生成物の帯）を書いていなかった** —— 手で足された帯が再生成で消え、**検査 21 が落ちた。** ⭐ **検査 21 が入ってから誰も再生成していなかったので、いま初めて露見した。** `build_overview` が `$comment` を先頭鍵として書く形に直した |
| 2026-08-18 | 適用 | ✅ **CR-185 適用**（`SvgRenderer → Schedule` の辺）。辺 86 → 87、Chapter 5 の散文は 1 文字も動かず、数（124/11/1534/145）も不変 |
| 2026-08-18 | 適用 | ✅ **CR-186 適用**（担当者の面）。⭐ **表 T-225 を新設**（`AS-1` 〜 `AS-10`）し、`PR-16` の「読み取り専用」を外した。**`FR-006` と `FR-029` は 1 文字も直していない** —— 前者は「同表が読み取り専用と記した項目を除いて」と書いており、後者は「掴む面と値として編集する面の併存」を既に対象外としているからである。⭐ **予測と実測が一致**: tables 124→**125**、rows 1534→**1544**（`AS-` の 10 行）、uids **145**（不変）、重複 **new 0** |
| 2026-08-18 | 実測 | ⭐ **裁定 8（同名なら小さい `uid`）は発明ではなかった** —— `FR-059` が担当ラベルの並びで既に「同名は `UID` の昇順」を採っている。⛔ **一方 `MG-5`（合流は同名を統合）とは読者が必ず混同するので、`MG-5` の側に境界を 1 文書いた** |
| 2026-08-18 | 実測 | ⛔ **`assigneeVisible` の既定が `false` なので、既定の状態では担当者を編集する面が 1 つも無く、`FR-049` の MUST に違反していた** —— 裁定を待たずとも直す理由が既に在ったことになる。⚠️ **仕様書に入力ウィジェットの形を定めた記述は 0 件で、`AS-5`（ドロップダウン＋部分一致）が最初である** |
| 2026-08-18 | 未決 | ⚠️ **`FR-027` の初期テンプレート（`Document` の値）を持つユニットが 表 T-075 の 71 行に無い。** `chooseStartupDocument` は値として**受け取る**だけである。⭐ **縦線は保存経路を 1 本も結線しないので、開発用のリテラルで進めてよい**（外へ出て行かないので覆すコストは 1 か所）。⛔ **本物のテンプレートを書くと同時に保存経路も結線する、はやらない**（規則 06 の `D` と `H`）|
