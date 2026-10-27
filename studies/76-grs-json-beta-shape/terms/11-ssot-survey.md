# SSOT の調べ —— 名前・鍵・スキーマ・順・裁定の置き場（読むだけの調べ）

- 調べた木: worktree `dazzling-fermi-589256`、枝 `claude/cr851-review-apply-4`、HEAD `1268eea24`。リポジトリのファイルは 1 つも変えていない（最後に `git status --short` が 0 行）。
- 今日走らせたもの: `gen:check` の 39 本の `--check` を 1 本ずつ（全部 rc=0。`generate_mspdi_child_order.py` は XSD が無いので XSD の部分だけ SKIPPED）、検査 83・84・75・37・76 の本体（全部 OK）。
- 数え方は各所に書いた。「測った」と書いたものは、scratchpad の `order_cmp.py` か、その場の Python 1 行で数えたもの。

---

## 1. 層どうしの名前と鍵の揃え方（今あるもの）

### 1.1 層の定義

| 略 | 層 | 実体 |
|---|---|---|
| G | 用語辞書 | `docs/spec/_assets/tbl-glossary.md`（手書き。563 行、表の行 396。接頭辞ごと: IC 138・K 132・U 66・P 22・N 15・X 5・VK 4 —— `^\| [A-Z]+-[0-9]+` を数えた） |
| P | 仕様の散文 | `docs/spec/*.md`（4 ファイル）と `_assets/*.md` の手書きの部分 |
| M | 原稿 | `docs/spec/_source/*.json`（erd・settings・display-words・agent-api-members・document-commands ほか） |
| C | コード | `src/` |
| A | Agent API と MCP の説明 | `agent-api-members.json` → `src/adapter/mcp-tool-translator/mcp-tool-descriptions.json`（取次 `grs-relay.mcpb` に入る） |
| S | GRS JSON スキーマ | `docs/spec/_source/grs-document.schema.json`・`grs-commands.schema.json`（生成物） |
| X | 外の読み手の文書 | spec-html（StrictDoc の書き出し）、`docs/download/index.html`、`docs/about/index.html`、`docs/release-notes/`、`docs/guides/schedule-to-grs-json/`、公開されるスキーマ 2 本 |

### 1.2 揃えている仕組み

**(a) 生成器**（`package.json` の `gen` が 39 本を順に呼ぶ。一覧と出力は 2 章）

**(b) check.sh の節**（`.claude/skills/spec-graph-check/check.sh`）—— 名前・鍵・スキーマにかかわるものだけ

| 検査 | 行 | 何と何を比べるか |
|---|---|---|
| 1-4 | 513 | StrictDoc の書き出し（spec-html の元）が割れていないか |
| 5-10, 15 | 556 | 散文の表の参照・行 ID の参照が実在するか（`md-checks.py`）。**名前（camelCase）は見ない** |
| 12-14, 32 | 560 | 規則 02 の表記の表が止める綴り、禁止語、辞書の英語名の Title Case（`style-checks.py`）。**鍵の名は見ない** |
| 16 | 576 | `fig-erd-*.md` が `erd.json` と、`tbl-settings.md` が `settings.json` と一致 |
| 17 | 604 | `grs-document.schema.json` が `erd.json`＋`tbl-settings.md` と一致 |
| 20 | 616 | `src` の実体の型が `erd.json`（とスキーマ）と一致 |
| 21 | 581 | 生成物が自分の原稿の名を書いているか（出どころだけ） |
| 23 | 589 | 原稿の刷られる散文が言語ごとの辞書になっているか |
| 26b | 667 | 表 T-064（公開名）と `src` の export が両向きで一致 |
| 27 | 627-656 | 生成物 22 本の `--check`（検証器・起動の雛形・アイコン・表示語・MSPDI・交換形式・状態機械・知らせ ほか） |
| 37 | 706 | `display-words.json` の群と、その鍵の表の行の指紋（今日の実行: 11 群・398 組・変化なし） |
| 44 | 718 | `src`・`tests` が退役した／存在しない仕様 ID を引いていないか |
| 75 | 1076 | 手書きの手引き `docs/guides/schedule-to-grs-json/` がスキーマに通り、プロンプトがスキーマに無い鍵を書いていないか |
| 76 | 1090 | 形式の版が時刻、変更の台帳の規則、`$id`（S-540）が公開サイトで解けるか |
| 77 | 1104 | コードが文字コードで綴った語が `docs/spec` にあるか |
| 83 | 1179 | `_source` の JSON どうしの参照が全部解けるか（今日: 8,205 参照・15 原稿・12 スキーマ） |
| 84 | 1196 | 命令の値の名 ↔ 書く列の名、行を指す値の名 ↔ 鍵の列、設定の鍵（G の K 行）↔ 画面の語（今日: 371 組・38 違い・許可リスト 38 行で全部覆う） |
| 85 | 1208 | 取次の束の版が入力と一緒に動くか |
| 90 | 1240 | 生成スキーマの要素が 1 種類の値で null を取らないか（基準線つき） |

**(c) コミットの門**: `tools/gate/run-gate.mjs:246` の GT-1 が `npm run gen:check` を、`:255` が check.sh を走らせる。
**(d) 試験**: `tests/contract/cr-822-a-call-shape-change-raises-the-agent-api-version.contract.test.ts`（Agent API の形の指紋と版）、`tests/contract/dfc-2950-fr-073-a-shape-change-raises-the-format-version.contract.test.ts`（スキーマの指紋と形式の版）、`cr-765-*`（MCP の入力 = 印字した引数）。
**(e) 規則**（人が守るだけ）: `docs/development-rules/03-implementation.md:9-18`（仕様の名をそのまま綴る、別名禁止）、`:20-` （値は写さず生成）、`02-changing-the-spec.md:191-199`（原稿の置き場の表）。仕様側は `05-07-design.md:1615-1621`（Chapter 6.2: 名前の正は T-104、値の正は tbl-settings.md）と `tbl-glossary.md:5-7`（「本書が用語の正」）。

### 1.3 層の組ごとの答え

「生成」= 片方が片方から刷られる。「検査」= 機械が比べる。「なし」= 規則だけ、または何も無い。

| 組 | 答え | 根拠 |
|---|---|---|
| G ↔ P | **なし**（名前については） | 行 ID は検査 5-10、綴りは検査 32 だけ。散文の `Task.xxx` を辞書やスキーマと比べる検査は無い。⭐ 測った: 散文の `` `実体.列` `` 395 件中、スキーマに無い列 0。`` `camelCase` `` 1,172 種のうち原稿 JSON にも `src` にも無いもの 8（`scrollX` の「使わない」例など、説明できるもの） |
| G ↔ M（settings の鍵） | **一部検査** | 検査 84 の screen 組（K 行 ↔ display-words の語）、検査 37。`generate_display_words.py:116` が T-104 を名簿として読み、欠け・余りで止まる |
| G ↔ S（documentSettings の鍵） | **なし** | `tbl-glossary.md:175` は「documentSettings の鍵は全部 T-104 に行を持つ（MUST）」と言うが、比べる検査は無い。⭐ 測った: スキーマの documentSettings の鍵 34 のうち `tableViews` だけ K 行が無い（`tbl-glossary.md` に `tableViews` は 0 回） |
| G ↔ M（実体と列 T-101/T-102） | **なし** | ⭐ 測った: P 行の名のうち `erd.json` の列でないもの 2 —— `P-5 actualDuration`（`tbl-glossary.md:56`。退いた列。`json-codec.ts` は古い文書から取り除く側）と `P-17 actualPlacement`（`:68`）。erd の実体 19 のうち N 行が無いもの 7（`BaselineTask`・`CarryElement`・`Exception`・`WeekDay`・`WorkingTime`・`changeLog`・`documentStamp`） |
| G ↔ C | **一部生成、他はなし** | アイコン（T-109 → `icon-roster.json`・`icon-glyphs.json`）と設定の語は生成。それ以外は規則 03 §1 だけ。⭐ 実例: `P-17 actualPlacement` の値を辞書は `'inside'/'below'/'atActualDate'` と書き、コードは `'inside'/'below'/'sideways'`（`src/entity/layout-engine/schedule-layout/schedule-layout.ts:129`、`shape-cross-sections.ts:69`）。`actualPlacement` は原稿 JSON にも仕様本文にも 0 回 |
| G ↔ A | **なし** | 辞書の 6・7 節は表 T-107・T-108 へ指すだけ（`tbl-glossary.md:366-374`）。検査 84 の頭書き（`check-source-names.py:35-38`）が「メンバ名・命令名は比べる相手が無い」と自分で書いている |
| P ↔ C | **ID だけ検査** | 検査 44（ID）、42（注の引用文）、77、81、39（MUST 句を試験が逐語で持つ）。名前の一致は規則 03 §1 だけ |
| P ↔ S | **表は生成、散文はなし** | `fig-erd-detail.md`（T-056/057/058）と `tbl-settings.md` は原稿から刷る（検査 16）。散文の鍵名は上の「測った 0」だけ |
| C ↔ S | **生成＋検査** | 型（検査 20）、読む検証器 `grs-json-schema.ts`（検査 27）、起動の雛形はスキーマで検証（検査 27）、命令の型と `SHAPE_OF_COMMAND_KIND`（`generate_document_commands.py`、gen:check のみ）、版の指紋の試験（dfc-2950）。**順は見ない**（3 章） |
| C ↔ A | **生成**（check.sh には無く GT-1 の gen:check だけ） | `generate_agent_api.py` が `src` の 3 か所の領域を刷る。試験 cr-765・cr-822 |
| A ↔ S | **一部生成・一部検査** | `grs-commands.schema.json` は `document-commands.json`＋文書スキーマから生成。`schemaNotes` の名は両スキーマにあるか生成器が確かめて止まる（`generate_mcp_tool_descriptions.py:136-148`）。**`mcpInstructions` と各ツールの説明文の名は誰も見ない**。⭐ 測った: 説明文の camelCase 50 種のうち、どちらのスキーマにも、`agent-api-members.json` の引用符つきの名にも無いもの 15（`causeUid`・`stoppedUids`・`selfDelayMinutes`・`asShown`・`staleStamp`・`fileExists` ほか。原稿では文の中だけに出る —— 例 `agent-api-members.json:580`） |
| X ↔ S | **同じファイル＋一部検査** | Pages は `docs/` を丸ごと写す（`.github/workflows/pages.yml:96`）ので公開スキーマ = 生成物そのもの。検査 76（`$id` が解ける）、75（手引き）、画像→GRS JSON のプロンプトは生成（`imageprompt`、gen:check のみ） |
| X ↔ P | **生成** | spec-html は StrictDoc（`pages.yml:84`）。検査 1-4・49 |
| X（ダウンロード・紹介・リリースノート）↔ 他の全部 | **なし**（版の数字だけ検査） | 名前を読む検査は無い（`docs/download`・`docs/about` を読むスクリプトは版と存在の確認だけ: `check-grs-json-ledger.py:195`、`tools/check_versions.mjs:7`、`stamp_download_page.mjs`）。⭐ 測った: ダウンロード頁は Agent API のメンバ名 27 のうち `agentApiVersion` だけを 8 回書く。紹介頁・README・リリースノートは 0 |
| X（取次の束）↔ A | **生成** | `build:relay` が `src` から束を作る。検査 85 は版だけ |

### 1.4 見つけた隙間

1. **check.sh 27 の注が事実と違う。** `check.sh:620-626` は「gen:check の的は全部ここで門になる」と書くが、⭐ 測った（gen:check の 39 本それぞれのスクリプト名を check.sh で grep）: **10 本が check.sh に無い** —— `agent_api_members_json_to_md`・`document_commands_json_to_md`・`generate_agent_api`・`generate_document_commands`・`generate_mcp_tool_descriptions`・`generate_image_to_grs_json_prompt`・`generate_theme_hue_roster`・`generate_time_zone_roster`・`generate_milestone_shapes`・`generate_user_wording`。GT-1 の gen:check では走るので、コミットの門では捕まる。check.sh だけを「木の言葉」として使うと、**Agent API・命令・MCP の説明の古びは見えない**。
2. **G ↔ S（documentSettings）**: 辞書の MUST（全鍵に K 行）を誰も数えない。今 `tableViews` が欠け。
3. **G ↔ 原稿・コード（T-101/T-102 の名と値）**: 何も結ばない。今 `P-5`・`P-17` が古い／食い違う。
4. **G ↔ A**: Agent API のメンバ名・命令名・引数名は辞書と結ばれていない（設計どおり別の原稿だが、語の一致を見る者は無い）。
5. **A の説明文**: MCP の `instructions` と各ツールの説明の中の鍵名は検査されない（上の 15）。返り値の形（例: 遅延診断の報告の欄）は原稿で文としてしか書かれていない。
6. **X の手書き頁**: ダウンロード・紹介・リリースノートの名前は何にも結ばれていない（今は名前をほぼ書いていないので被害は小さい）。
7. **図**: `fig-mcp-relay.json` は「`fig-mcp-relay.drawio` と `.svg` はここから生成」と書く（`fig-mcp-relay.json:5`）が、それを刷る npm スクリプトも生成器も木に無い（`fig-mcp-relay` を `.py`/`.mjs` で grep → `source_refs.py` だけ）。`build.py` の図 5 枚も再生成して比べない（check.sh の NOT COVERED、`build.py --check` の出力 "NOT CHECKED"）。
8. **散文の鍵名**: 今は 0 件だが、`Entity.column` を散文とスキーマで比べる検査は無い。

---

## 2. SSOT のフォルダ `docs/spec/_source/`

### 2.1 中身の 3 種（各ファイルの `$comment` の 1 行目で分けた）

- 原稿（SINGLE SOURCE OF TRUTH）15: `erd.json`・`settings.json`・`display-words.json`・`agent-api-members.json`・`document-commands.json`・`notice-reasons.json`・`property-items.json`・`published-entries.json`・`row-id-prefixes.json`・`state-machines.json`・`verification.json`・`components.json`・`mspdi-custom-fields.json`・`grs-json-changes.json`・`fig-mcp-relay.json`（＋散文の原稿 `image-to-grs-json-prompt.ja.md` / `.en.md`、図の `.drawio`）
- 手書きの契約（`*.schema.json`、原稿を検証するだけ）10: erd・settings・agent-api-members・document-commands・notice-reasons・property-items・published-entries・state-machines・verification・mspdi-custom-fields・grs-json-changes（`row-id-prefixes`・`components`・`display-words` には契約が無い）
- 生成物 4: `grs-document.schema.json`・`grs-commands.schema.json`・`overview.json`・`source-relations.json`

### 2.2 原稿 → 生成器 → 出力（木）

```
erd.json ──┬─ erd_json_to_md.py ............ _assets/fig-erd-detail.md, fig-erd-overview.md        [gen:md, 検査16]
           ├─ erd_json_to_schema.py ........ _source/grs-document.schema.json                     [gen:schema, 検査17]
           │    (+ _assets/tbl-settings.md, settings.json, grs-json-changes.json,
           │       generate_startup_template.SCHEMA_VERSION, generate_time_zone_roster)
           ├─ tools/generate_entity_types.py  src/entity/document-model/** の型と定数 (約50 unit)   [types, 検査20]
           ├─ tools/generate_icon_roster.py . (+glossary T-109, 01-04) src/.../icon-roster.json  [icons, 検査27]
           ├─ document_commands_json_to_md.py / settings_json_to_md.py / state_machines_json_to_md.py が参照
           └─ tools/generate_startup_template.py (+settings.json, schema) →
                 src/framework/single-html-shell/startup-template.json, -manifest.json, empty-document.json,
                 tests/fixtures/measuring-document.json, sample-schedule/Three-Year Product Plan.json [startup, 検査27]
settings.json ─┬─ settings_json_to_md.py ...... _assets/tbl-settings.md                         [gen:settings, 検査16]
               ├─ (erd_json_to_schema.py が tbl-settings.md と一緒に読む: documentSettings・$defs の形)
               ├─ tools/generate_entity_types.py  SETTINGS_DEFAULTS ほかの定数
               ├─ tools/generate_theme_hue_roster.py src/adapter/screen-renderer/theme-hue-roster.json [gen:check のみ]
               └─ tools/generate_help_roster.py (+icon-roster.json) src/.../help-roster.json   [検査27]
grs-document.schema.json (生成物) ─┬─ tools/generate_json_schema_validator.py  src/adapter/document-codec/grs-json-schema.ts [検査27]
                                   ├─ tools/generate_image_to_grs_json_prompt.py (+prompt .ja/.en.md, empty-document.json)
                                   │      src/adapter/screen-renderer/image-to-grs-json-prompt.json   [gen:check のみ]
                                   └─ tools/generate_document_commands.py, generate_mcp_tool_descriptions.py が読む
agent-api-members.json ─┬─ agent_api_members_json_to_md.py  _assets/tbl-agent-api-members.md      [gen:check のみ]
                        ├─ tools/generate_agent_api.py ..... src/adapter/agent-api-endpoint/agent-api-members.ts,
                        │                                    relayed-call.ts, src/framework/mcp-relay-server/mcp-relay-server.ts の領域 [gen:check のみ]
                        └─ tools/generate_mcp_tool_descriptions.py (+両スキーマ, document-commands.json)
                                                             src/adapter/mcp-tool-translator/mcp-tool-descriptions.json [gen:check のみ]
document-commands.json ─┬─ document_commands_json_to_md.py  _assets/tbl-document-commands.md (+erd, settings) [gen:check のみ]
                        └─ tools/generate_document_commands.py  src/use-case/edit-document/*.ts の 13 領域,
                                                             _source/grs-commands.schema.json            [gen:check のみ]
display-words.json ── tools/generate_display_words.py (+glossary, tbl-property-items.md, help-roster.json, 01-04, 05-07)
                                                             src/adapter/screen-renderer/display-words.json, dependency-kinds.json [検査27]
property-items.json ─┬─ property_items_json_to_md.py ... _assets/tbl-property-items.md        [検査27]
                     └─ tools/generate_property_items.py  src/adapter/screen-renderer/property-items.json [検査27]
notice-reasons.json ─┬─ notice_reasons_json_to_md.py ... _assets/tbl-notice-reasons.md          [検査27]
                     └─ tools/generate_notice_reasons.py  src/use-case/advance-screen-session/notice-values.ts の領域 [検査27]
state-machines.json ─┬─ state_machines_json_to_md.py ... _assets/tbl-state-machines.md と fig-sm-*.svg 31 枚 [検査27]
                     └─ tools/generate_state_machine_types.py  各 unit の領域                    [検査27]
published-entries.json ─┬─ published_entries_json_to_md.py  _assets/tbl-published-entries.md   [検査27]
                        └─ tools/generate_public_entry_index.py (+src) docs/review/public-entry-index.md [検査27]
verification.json ─── verification_json_to_md.py ...... _assets/tbl-verification.md              [検査27]
row-id-prefixes.json ─ row_id_prefixes_json_to_md.py .... _assets/tbl-row-id-prefixes.md           [検査27]
components.json ───── build.py ......................... _source/overview.json, docs/review/components/components.md
                                                          (図 5 枚は比べない)                     [検査27]
mspdi-custom-fields.json ─ tools/generate_mspdi_custom_fields.py  src/adapter/document-codec/mspdi-custom-fields.json [検査27]
grs-json-changes.json ── erd_json_to_schema.py が x-grsChanges に入れる（今 changes は 0 件）       [検査76]
_source の全 JSON ───── source_relations.py ............ _source/source-relations.json            [検査83]
fig-mcp-relay.json ──── （生成器が木に無い。1.4 の 7）
原稿でない入力: 01-04-requirements.md の表 → generate_time_zone_roster.py（time-zone-roster.json）, generate_exchange_formats.py
   （exchange-formats.json・export-formats.json）; _assets/fig-icons.svg → generate_icon_glyphs.py; fig-milestone-shapes.svg →
   generate_milestone_shapes.py; XSD → generate_mspdi_child_order.py; package.json/LICENSE → generate_license.py;
   development-rules/user-wording.json → user-wording.md; docs/review/comment-rules-src.md → comment-rules-card.md;
   05-07-design.md 表 T-075 → generate_unit_tree.py（src のスタブ）; tests → generate_test_inventory.py
```

### 2.3 走らせ方と順

- `npm run gen`（`package.json` の `gen`）が 39 本を `&&` で順に呼ぶ: settings → notices → items → machines → verification → entries → members → commands → prefixes → md → **schema** → components → relations → **types** → machines:types → noticereasons → **validator** → tree → **startup** → **imageprompt** → icons → huesroster → zonesroster → propitems → helproster → **agentapi** → **doccommands** → **mcptools** → license → glyphs → milestones → words → wording → mspdi → mspdi:order → formats → card → index → tests。
- 順が意味を持つ所: schema は tbl-settings.md の後（settings が先）、types・validator・startup はスキーマの後、imageprompt は empty-document.json の後（startup が先）、mcptools は doccommands（`grs-commands.schema.json`）の後、helproster は icons の後、words は helproster と items の後。逆向きの依存が 1 つある: `erd_json_to_schema.py` は `generate_entity_types` を import して settings.json の既定値を読む（`erd_json_to_schema.py:70`、`:73` は SCHEMA_VERSION）—— 出力ではなく関数を借りるだけ。
- `npm run gen:check` は同じ 39 本の `--check`（`gen` と `gen:check` の集合は一致: 片方にしか無いもの 0 —— 両方の文字列を分けて比べた）。
- 新しさの証明: (1) GT-1 が gen:check を走らせる（`run-gate.mjs:246`）。(2) check.sh は 16・17・18・20・27・71・83 で 29 本だけを走らせる（1.4 の 1）。(3) 生成物は自分の原稿と作り直し方を書く（検査 21）。
- 今日の結果: 39 本とも rc=0。

---

## 3. GRS JSON の形の SSOT と「順」

### 3.1 形を決めているファイル

| ファイル | 決めること |
|---|---|
| `erd.json` | 日程データの群（実体・列・関係・型）と、ルートと schedule の箱（`container`） |
| `settings.json`（`tbl-settings.md` を経て） | `documentSettings` の鍵・型・既定値・範囲、`ColumnFilter`/`ColumnSort` の形（`kind: shape` の塊 1） |
| `grs-json-changes.json` | 変更の台帳（`x-grsChanges`）。今は `changes` 0 件 |
| `tools/generate_startup_template.py:172` | `schemaVersion` の値（`'2026-10-19T00:35:37Z'`）。スキーマの `const` はここから読む |
| `settings.json` の S-540 | `$id` と文書の `$schema` の値 |
| 仕様 `01-04-requirements.md:7330-7338` | 表 T-052（DR-1〜DR-5: ルートの群と `$schema` を先頭に置く規則） |

### 3.2 `erd.json` の形（`erd.schema.json` が契約）

- 最上段 8 鍵: `$schema`・`$comment`（6 行）・`printed`（刷る散文の辞書）・`documents`（2: fig-erd-detail / overview の作り）・`container`（`boxes` 5・`nodes` 5・`edges`）・`entities`（19）・`relations`（26）・`derived`（14、文書が持たず書き出すときに作る値 = 表 T-059）。
- 実体: `seat`・`name`・`description`（`ja`/`en`）・`export`・`carry`・`carry_seat`・`key_note`・`columns`。
- 列（全 160 列）: `seat`・`name`・`type`（人の読む型、日本語）・`nullable`・`json`（機械の型: `kind`/`null`/`maxLength`/`values`/`isDate`/`isTime`/`of` …）・`key`・`origin`・`exchange`（MSPDI の道）・`meaning`（ja）・`schemaNote`（en、160 列中 32 列だけ）。
- ⚠️ `seat` は **行 ID の番号（AT-n）であって順ではない**（Project の列は 1,2,…,18,154,155,19,156,… —— 測った。仕様 `05-07-design.md` の 6.2 末尾「席番号は振り直さない、位置から番号を取らない」）。**順は配列の並びそのもの**。

### 3.3 `erd.json` → `grs-document.schema.json` の写し方（`erd_json_to_schema.py`）

- 実体 → `$defs[実体名]`: `type: object`・`description` = 実体の `description.en`・`required` = 全列（列の並び）・`additionalProperties: false`・`properties` = 列の並び（`:588-623`）。⭐ 測った: 19 実体すべてで `properties` の順 = erd の列の並び。
- 列 → `json` から型の断片。`isDate` → `$ref DateTime`、`isTime` → `$ref Time`、carry の器 → `$ref Carry`、`schemaNote.en` → `description`（`:592-614`）。
- **落とすもの**: `seat`・`type`・`nullable`・`key`・`origin`・`exchange`・`meaning`・`key_note`・`carry_seat`、`relations`・`derived`・`documents`・`printed` 全部（関係は `of.entity` の到達の計算にだけ使う、`:1024-1035`）。
- **足すもの**: ルートの `$schema`（先頭、型は string だけ、`:990-1000`）、`$id`（S-540）、`$comment`（出どころと「決まっていない列挙を string に広げた」報告）、`title`/`description`、`x-grsChanges`（台帳）、`schemaVersion` の `const`、`$defs` の `Carry`・`DateTime`・`Time`・`ColumnFilter`・`ColumnSort`、`documentSettings` 全体（34 鍵、既定値と範囲つき）、`schedule` の箱。
- 決まっていない列挙の値は作らず string に広げる（生成器の頭書き `:19-22`）。
- 1 対 1 か: **実体と列は 1 対 1（並びも同じ）。ルート・schedule・documentSettings・共通の型は erd の外から来る**。

### 3.4 順はどこから来るか（今の事実）

| 場所 | スキーマの順を決めるもの | 根拠 |
|---|---|---|
| ルート | `$schema` を先頭に、`erd.json` の `container` の `Document` の箱の行の順（`schemaVersion`・`schedule`・`documentSettings`・`documentStamp`・`changeLog`） | `erd_json_to_schema.py:990-996` |
| `schedule` | `container` の `schedule` の箱の `entity_rows` の順（project・calendars・tasks・resources・assignments・taskGroups・taskGroupMembers・taskVisuals・commentBoxes・highlightBoxes・taskOrigins・baselineTasks） | `:626-645` |
| `$defs` | erd の実体の並び → Carry・DateTime・Time → settings の形 | `:981-985`、測った |
| 実体の中 | erd の列の並び | `:592-614` |
| **`documentSettings`** | **名のアルファベット順**（`nest()` が `for key in sorted(flat)`） | `:811-818`、`:890`。⭐ 測った: スキーマの 34 鍵は sorted と一致 |

- `documentSettingsOrder` という名は、`docs`・`tools`・`src`・`studies`・`change-request`・`.claude` のどこにも鍵として無い（grep で出るのは `studies/76-grs-json-beta-shape/spec-rows-map.tsv` だけ）。settings.json は順を決めていない。
- **`DR-6` は仕様に無い。** `01-04-requirements.md` の表 T-052 は DR-1〜DR-5（`:7334-7338`）。`DR-6` が出るのは `change-request/CR-851-…md`・`studies/76-grs-json-beta-shape/property-order.md:4,13`・同 `README.md:26`・`spec-rows-map.tsv` だけで、どれも「案」。
- **JDG-3322**（`rulings.md:3559`）は「ERD をもとに 1 つの規則の順に並べる」と決め、着地の欄は「指示 —— CR-851 が当てる」。CR-851 の頭（`CR-851-…md:3`）は「起草した。当てていない」。⭐ `erd.json` と `grs-document.schema.json` を最後に変えたコミットは `efed5c9a3`（検査 90 を足したとき）で、CR-851 の枝のコミットは原稿に触れていない。**つまり今のスキーマの順は JDG-3322 の前のまま**。
- `property-order.md` の案: ルート 7（`$schema`・`schemaVersion`・`buildVersion`・`scheduleData`・`documentSettings`・`documentStamp`・`changeLogEntries`）、実体は MSPDI → GRS 独自 → 刻印 → 共通の型、実体の中は 識別子 → 参照 → 兄弟の中の位置 → 名と文 → 値と状態 → 描き方 → リンク → GRS の設定と帳簿 → 子の配列 → 素通し、documentSettings は意味の群（倍率 → 位置 → 時刻帯 → …）で名の順にしない（`property-order.md:13-80`）。

### 3.5 書き出すコードは同じ順か

- 書き出し: `jsonFromDocument`（`src/adapter/document-codec/json-codec.ts:461-467`）は `$schema` を先頭に置き、残りは **メモリ上のオブジェクトの挿入順のまま** `JSON.stringify` する。並べ替えはしない。
- メモリ上の順の出どころは 3 つ:
  1. 開いたファイル: `JSON.parse` がファイルの順を保つ。足りない列は古い文書向けの補いで前に足される（例 `json-codec.ts:253` の `{...既定, ...row}`）。**つまり開いて保存した文書は元のファイルの順**。
  2. 起動の雛形・空の文書: `tools/generate_startup_template.py` の手書きの Python 辞書の順（例 `project()` `:2693-2731`）。documentSettings だけはスキーマの `required` を読む（`:4486-4487`）。
  3. 新しい行: `src` の手書きのリテラル（`Task` は `src/use-case/edit-document/task-create.ts:41-62` と `src/entity/document-model/schedule/delay-fixes.ts:367-371` の 2 か所。どちらも erd の列の順）。
- ⭐ 測った（scratchpad の `order_cmp.py`: 文書をスキーマに沿って歩き、各オブジェクトで「在る鍵の順」がスキーマの `properties` の順と同じかを比べる）:

| 文書 | 比べたオブジェクト | 順が違う道 |
|---|---:|---|
| `src/framework/single-html-shell/empty-document.json` | 17 | 1: `$.schedule.project`（`outlineBase` が `carry`・`carryElements` の前。スキーマでは後） |
| `sample-schedule/Three-Year Product Plan.json` | 4,593 | 同じ 1 |
| `tests/fixtures/measuring-document.json` | 4,593 | 同じ 1 |

- 生成された TS の型の並びはスキーマと同じ（`schedule-entities.ts` の `Project` は `carry, carryElements, outlineBase` の順、`DocumentSettings` はアルファベット順）が、TS は鍵の順を強いない。
- **順を確かめる検査・試験は無い。** 形式の版の指紋の試験はわざと鍵を並べ替えてから比べる（`tests/contract/dfc-2950-fr-073-…test.ts:36-43`「オブジェクトの鍵の順は意味を持たない」）。check.sh にも gen:check にも順の検査は無い（`order`・`sort` で grep、該当なし）。

---

## 4. JSON スキーマと API の裁定の置き場（数つき）

### 4.1 `docs/development-records/rulings.md`

- 3,638 行、裁定の行（`^| JDG-`）1,988。
- 行の中の語で数えた（`grep '^| JDG-' | grep -c`）: 「GRS JSON / スキーマ / schema」195、「Agent API / MCP / 取次 / applyCommands / readDocument」114、どちらか 289。`CR-851` を書く行 124、うち「CR-851 … が当てる」（指示のまま、まだ当てていない）114。
- 主な節（見出しの行・その節の JDG 行の数）:

| 行 | 節 | JDG 行 |
|---:|---|---:|
| 676 | MCP 連携・行の削除・画像から GRS JSON（CR-562/563） | 12 |
| 780 | 文書の設定の読み書きとスキーマ（CR-565） | 3 |
| 1323 | MCP の取次の実装（CR-613・CR-620） | 5 |
| 1430 | GRS JSON のスキーマは自分を説明できるか | 5 |
| 1900 | スキーマ変更の規則: 版は UTC の時刻・最新版の所・変更の台帳 | 9 |
| 2459 | スキーマだけで読み書きできるようにする（CR-751） | 2 |
| 3013 | AI 連携の調べ: API の仕様の在りか | 1 |
| 3021 | 名の調べ: GRS JSON の鍵・Agent API・文書の命令 | 13 |
| 3072 | AI 連携の直し（CR-791） | 13 |
| 3292 | GRS Relay の急ぎの直し（CR-823） | 15 |
| 3441 | OKPN・OMPV・null を使わない | 10 |
| 3483 | 答えの前倒し（GRS JSON の形を β の前に） | 15 |
| **3505** | **GRS JSON を β の前に 1 回だけ組み替える（CR-851）** —— JDG-3322（順）・JDG-3380〜3384（鍵名、`:3617-`）・JDG-3410（Agent API の名も新しい鍵名に、`:3622`）を含む | **113** |
| 3625 | 拡大縮小の戦略と倍率と px の名（CR-853） | 8 |

### 4.2 `studies/76-grs-json-beta-shape/`（行のレビューの表、`status: draft`）

- 追跡されているファイル 97（`git ls-files`）: 表 5 本・説明 `.md` 7・`check_tables.py`・`concepts/` 7・`terms/` 14（＋`old/`）・`review-page/` 3・文章の点検 6 フォルダ 59。
- 表の行（見出しを除く）: `spec-rows-map.tsv` 906、`doc-shape-map.tsv` 303、`commands-map.tsv` 112、`review-results.tsv` 97、`refusal-reasons-map.tsv` 94。README は「正は 3 つの TSV」と書く（`README.md:28`）。
- 鍵名の問い: `terms/7-key-name-questions.md`・`terms/9-grs-only-key-questions.md`（答えは JDG-3380〜3384）、木 `terms/8-grs-only-key-tree.md`・`terms/10-screen-term-tree.md`。
- 隣の調べ: `studies/75-grs-json-reshape/`（2 ファイル、多義の棚卸し）、`studies/77-external-contract-inventory/`（5 ファイル。外部契約の行 1,234、うち json-doc 674・agent-api 190・commands 136・mcp-relay 41 —— `summary.json`）。

### 4.3 `change-request/` の下書き（頭の状態の行で確かめた）

| CR | 状態 | 中身 |
|---|---|---|
| CR-851 | 起草した。当てていない（`:3`） | GRS JSON の β の形、順（DR-6 案）、命令 93 → 43 |
| CR-848 | 起草した。当てていない | 任意色の形（CR-851 の上） |
| CR-849 | 起草した。当てていない | リンクの欄（CR-851 の上） |
| CR-853 | 下書き | 拡大縮小と倍率・px の名 |

- 仕様の側で今「決まっている」規則は、表 T-052 の DR-1〜DR-5、Chapter 6.2（`05-07-design.md:1615-`）、`FR-073`（版と台帳）、`design-mcp-relay.md`。**順の規則（DR-6）は仕様に入っていない**。

---

## 5. 隙間のまとめ

1. check.sh が gen:check の 10 本を走らせない（Agent API・命令・MCP の説明・画像プロンプト・色相・時間帯・マイルストーン形・利用者の語）。注 `check.sh:620-626` は逆を言う。
2. 辞書 ↔ スキーマ（documentSettings の鍵が全部 K 行を持つ MUST）を数える者がいない。今 `tableViews` が欠け。
3. 辞書 T-101/T-102 ↔ erd・コードを結ぶものが無い。今 `P-5 actualDuration`（退いた列）、`P-17 actualPlacement`（値が `atActualDate` と `sideways` で食い違う）。
4. 辞書 ↔ Agent API・命令の名を結ぶものが無い。
5. MCP の `instructions` とツールの説明文の中の名を見る者がいない（`schemaNotes` だけ見る）。今 15 の名が原稿の文の中にしか無い。
6. GRS JSON の順: スキーマの documentSettings はアルファベット順、ほかは erd の並び。書き出しは挿入順で、順を確かめる検査は無い。雛形の `Project` 1 か所がスキーマと違う。JDG-3322 の順は CR-851 待ちで未着地、DR-6 は案だけ。
7. 手書きの公開頁（ダウンロード・紹介・リリースノート）の名前は何にも結ばれていない。
8. `fig-mcp-relay.json` の図を刷る生成器が木に無い。`build.py` の図 5 枚も比べない。
