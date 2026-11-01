# tools/schema-only-writer — スキーマだけの書き手の試験（X-14）

⭐ **`JDG-2040` の試験を繰り返すための道具である。**スキーマ（`docs/spec/_source/grs-document.schema.json`）だけを渡した新しい体に、日単位と分単位の GRS JSON を 1 本ずつ書かせ、出荷物（`dist/index.html`）で開いて測る。手順の元は `CR-751` の X-14 と、その 9 節の最後の段落（進捗の席の探り）である。

## 何が在るか

| | |
|---|---|
| `writer-brief.md` | ⭐ **書き手のサブエージェントに渡す指示書。**`{SCHEMA}` と `{OUT}` を差し替えて、そのまま渡す |
| `measure.mjs` | 書かれたファイルを 1 本ずつ測り、`<名>.measure.json` を書く。1 本につき 1 行の要約を出す |
| `validate.py` | `measure.mjs` が呼ぶ検証（Python の `jsonschema`、draft 2020-12） |

## 手順

1. スキーマを scratch のフォルダへ写す（例: `scratch/x14/schema/grs-document.schema.json`）。⛔ 書き手に作業木の中の他のファイルを見せない
2. **新しいサブエージェント**に `writer-brief.md` を渡す —— `{SCHEMA}` は写したスキーマ、`{OUT}` は書かせるフォルダ。⛔ 仕様・コード・見本・前の版は渡さない
3. 測る（作業木の根から。⛔ `npx` は使わない）:

```bash
npm run build      # 測るのは dist/index.html である
node tools/schema-only-writer/measure.mjs docs/spec/_source/grs-document.schema.json \
     scratch/x14/out/day-level.json scratch/x14/out/minute-level.json
# --app <index.html> で別の出荷物、--out-dir <dir> で報告の置き場所を変えられる
```

4. 書き手の `doubts.md`（スキーマの外を読みたくなった点）と、測って出た食い違いを、1 点 1 行で台帳（`docs/development-records/defects.md`）へ記録する

## 何を測るか

| 列 | 中身 |
|---|---|
| `schemaViolations` | スキーマ違反の数と最初の 20 件。⚠️ `formatsUnchecked` に出た `format`（いまは `date-time`）は、この `jsonschema` では確かめられず素通りする |
| `refused` | 開かなかった —— ヘッダーの題名・`Agent API` が読み戻した題名（`null` は空と見なす）・読み戻したタスクの `uid` と名の組のどれかが、ファイルと違う。⚠️ 題名だけでは決めない —— 書き手が題名を `null` にすると、開いても題名は空のままである |
| `notices` | 開いた後に立った知らせ（`data-notice-box` の理由の番号と文言） |
| `consoleErrors` / `pageExceptions` | コンソールのエラーとページの例外 |
| `recounts` | `readDocument()` で読み戻したタスクごとの `percentComplete`・`start`・`finish`・`actualStart`・`actualFinish`・`stop` が、ファイルと食い違った行。ファイルに無い列は `null` と見なす |

流れ: `showOpenFilePicker` を差し替える → ヘッダーの「開く」（`IC-1`）→ `Open Chooser` の差し替え（`IC-71`。確かめが出れば進む）→ `IC-20` で `Agent API`（`window.grSchedulerAgentApi`）を有効にして `readDocument()`。下ごしらえは `tools/probe/harness.mjs` を使う。

## 合格

違反 0・拒み 0・知らせ 0（書かせた日程が意図して起こすものを除く）・エラー 0・例外 0・数え直し 0。⭐ **測るだけで、止めない** —— 終了コードはいつも 0 である。スキーマの外を読みたくなった点は 0 でなくても赤にはしないが、台帳に行が立つ。

## いつ回すか

`erd.json` の `schemaNote`・`settings.json` の行の型と `schemaNote`・生成器の説明、形式の版（`SCHEMA_VERSION`）、日時と暦と完了率の読み（`FR-011`・`FR-012`・`FR-054`・`FR-088`・`FR-156`）を変える CR を当てたとき。⭐ 当てる前と後に 1 度ずつ回し、2 つを比べる（初めの回は `CR-751`。当てる前は日単位 PASS・分単位 FAIL（`RS-89` の知らせ 1）・迷い 17 点、後は両方 PASS・迷い 14 点。記録は `docs/development-records/measurements/x14-2026-10-15-cr-751/`）。⚠️ 2 回目からは指示書の分単位の例外日を「ふつうの日と違う時間を稼働する日」に改めた —— 1 回目の「一部だけ稼働」は、`minutesPerDay` の約束（合計を揃える）と知らせ 0 の求めがぶつかっていた。

## 結果の置き場所

- `<名>.measure.json` は既定で入力の隣に書かれる。書き手の出力は scratch に置くので、報告も scratch に残る
- 残す価値のある回は、2 本の GRS JSON・`doubts.md`・2 本の `.measure.json` を `docs/development-records/measurements/x14-<日付>-<CR>/` へ写し、要約の行を CR の試験の欄に書く
- ⚠️ 本リポジトリは公開である。`measure.mjs` はコンソールの文言の中のホームフォルダを `<home>` に伏せるが、コミットの前に個人情報の点検は必ず行う
