# W4 `Adapter` —— 開発の記録

**規則は [`docs/development-rules/05-working-method.md`](../development-rules/05-working-method.md)。書式は [README](README.md)。**

**対象**: `src/adapter`   ⭐ **機械検査がこの宣言を読み、状態表と実物を突き合わせる。**

---

## 現在地

⬜ **未着手。** 仕様側の下ごしらえは終わっている。

**次の一手**:

```
1. docs/development-rules/ を読む（05 の「1 巡の形」）
2. 裁定 J を利用者に問う（3 件。下の「記録」に転記してから着手する）
3. ⭐ まず 1 本の縦線を選ぶ —— いま index.html が読む single-html-shell は
   中身が無く、ブラウザには何も出ない。31 個そろうまで実物を確かめられない
   順番を採らない（05 の 2.）
```

⚠️ **`src/framework/` は W5 であり、まだ 8 コンポーネントとも空である。**
⭐ **縦線を通すには W5 の一部を先に触る必要がある。その判断は着手時に記録すること。**

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
