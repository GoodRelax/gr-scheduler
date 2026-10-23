# CR-827 —— 日程の画像をデータ化するプロンプトは、本文をコピーし、スキーマはファイルとしてダウンロードさせる

> 起草の状態: 当てた（2026-10-23、枝 `cr827-828-prompt-help`、`265dfcb86` の上）。計画の段 2 の子セッションが、起草・仕様・`src`・台帳を同じ作業木で行い、試験は仕様だけを読む別のサブエージェントが書いた。
> ID の帯: 調整役から `CR-827`・`CR-828`・`DFC-3473`〜`DFC-3477`・`JDG-3124`〜`JDG-3128`・`PND-936`〜`PND-937`・性能の測り待ち `267` を受けた。本書が使ったのは `CR-827` と `267`（`CR-828` と 1 行で共有）。新しい行 ID は 表 T-024 の `IO-10` の 1 つ（調整役が配った。`265dfcb86` の `docs/spec` と `change-request` に `IO-10` は 0 件）。`265dfcb86` の木で `CR-827` を名乗る変更要求は 0 件だった（9 節）。
> 当てるもの: `JDG-3086`（`DFC-3392`、計画 uid 202）—— 1 回押すと、本文のコピーとスキーマのダウンロードを両方行う。`JDG-502` の「スキーマ ＋ 空の文書を写す」のうちスキーマの部分と、`FR-068` の (3) を覆す。`DFC-3391`（版のずれの疑い）は再現を 1 度試した（0.1）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`265dfcb86`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| プロンプトが長いのはスキーマを埋めているから（`DFC-3392`） | 生成器の報告: コピーする文字列は ja 51938・en 49645 バイト、そのうちスキーマが 32498 バイト | スキーマを本文から外し、同じ押下でファイルとしてダウンロードさせる。本文は ja 19426・en 17133 バイトになった（7 節） |
| スキーマの版が合っていない（`DFC-3391`） | 生成物 `src/adapter/screen-renderer/image-to-grs-json-prompt.json` の版の行・埋め込んだスキーマの `const`・空の文書の `schemaVersion`、原稿 `docs/spec/_source/grs-document.schema.json` の `const`、`tools/generate_startup_template.py` の `SCHEMA_VERSION` の 5 つとも `2026-10-19T00:35:37Z` | 再現しない。台帳に残す（8 節）。本書の後は、本文の中の版は版の行と土台の文書の 2 か所だけになり、どちらも同じ生成器が同じ値から刷る |
| スキーマをファイルで渡す入口は無い | 表 T-024 に `IO-` の行が無い。`src/` にダウンロードの道が無い（書き出しはどれも保存の選択面を通る） | 表 T-024 に `IO-10` を足し、`FileStore`（`IF-3`）にダウンロードの道を 1 つ足す |

### 0.2 裁定の鎖（`rulings.md` を「`DFC-3392`」「`FR-068`」「スキーマ」「プロンプト」で引いた）

`JDG-3086`（2026-10-22）に従う。覆すのは `JDG-502`（2026-09-23）の「スキーマ ＋ 空の文書を写す」のうちスキーマの部分 —— `JDG-502` の行は既に「`JDG-3086` が覆す」と書いている。`JDG-3000`（利用者の「改善1」）は `JDG-3086` が受けた。ほかに `FR-068` を名指して覆す裁定は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-006`（マニュアルを読まずに使える）—— 押せば、AI に渡すものが 2 つ揃う（クリップボードの本文と、ダウンロードのフォルダのスキーマ）。本文が 3 分の 1 ほどになり、貼り付け先の入力欄の上限に当たりにくい。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（唯一の正）—— スキーマの中身は今までどおり `_source/grs-document.schema.json` だけが持ち、生成器が同じ生成物へ空白を除いて入れる。ファイルの名も原稿のファイルの名から刷る（生成物の `schemaFileName`）—— `src/` に名を打たない。
- `R2.14`（POLA）—— ダウンロードは保存の選択面を開かない（`JDG-3086` の「1 回で両方」）。告げる文（`RS-65`）は、ダウンロードしたファイルの名を言う。
- `R2.7`（同じことを 2 か所で言わない）—— 拡張子 `.json` を `IO-2` と `IO-10` が分け合う。媒体の型の対応は拡張子を鍵に持つので、生成器は「同じ拡張子なら同じ型」を求める形に変えた（`tools/generate_exchange_formats.py`）。対応表の印字は重なる拡張子を 1 度だけ出す（`tools/generate_entity_types.py`）。

### ③ 利用者に問わずに決めたこと（覆してよい）

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | ダウンロードは閲覧環境の素のダウンロード（リンクの `download`）で行い、保存の選択面を開かない | `JDG-3086` の示した代償「押すたびにダウンロードのフォルダに同じファイルが増える」は、選択面を開かない道の言い方である | 同じ名が在れば閲覧環境が名を変えて置く（`grs-document.schema (1).json` など） |
| X-b | ファイルの中身はスキーマを空白を除いた 1 行の JSON にする | 生成物が既に持つ形で、成果物の大きさが変わらない。AI は 1 行でも読める | 人が開くと読みにくい（公開の `S-540` に整形した版がある） |
| X-c | 媒体の型は `application/json` | `IO-2` と同じ拡張子なので、媒体の型の対応が 1 つで済む。JSON Schema 専用の型にすると同じ拡張子に 2 つの型が乗る | 無い |
| X-d | クリップボードを先に書き始め、次にダウンロードを渡す | クリップボードの書き込みはページに焦点があることを求める。ダウンロードを先にすると、閲覧環境の表示が焦点を取る恐れがある | 無い |
| X-e | クリップボードが使えない環境では、今までどおり `RS-` の「コピーできなかった」だけを告げ、ダウンロードもしない | 異常系の手当ては `JDG-78` に従い今は足さない | クリップボードの無い環境でスキーマだけを得る道は無い（公開の `S-540` はある） |
| X-f | 土台の文書は今までどおり本文に埋める | `JDG-3086` が外すと言ったのはスキーマだけ。土台は 3 KB で短い | 無い |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| [日程の画像をデータ化するプロンプト]（`IC-115`）を押したときにクリップボードへ入るもの | 原稿・版の行・スキーマ・土台の文書の 4 つ | 原稿・版の行・土台の文書の 3 つ |
| 同じ押下で起きること | 無い | `grs-document.schema.json` がダウンロードのフォルダに置かれる |
| 告げる文（`RS-65`） | 「クリップボードに貼り付けたプロンプトをAIに渡してください。」 | 「クリップボードのプロンプトを、ダウンロードしたスキーマのファイル grs-document.schema.json と一緒にAIに渡してください。」 |
| 原稿の「添付」の段 | 形の正と土台は本文の後ろの 2 つの `json` の囲み | 形の正は一緒に渡したファイル `grs-document.schema.json`、土台は本文の後ろの `json` の囲み |

---

## 2. 新しい識別子

表 T-024 の `IO-10`（`GRS JSON` のスキーマ）。ほかに行 ID は取らない。新しい名前は `FileStore` の `downloadFile`（`IF-3` の文に足した）と、生成物の鍵 `schemaFileName`。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| # | 消すもの（`265dfcb86`） | 置き換わる先 |
|---|---|---|
| 1 | `FR-068`「…(3) `GRS JSON` のスキーマ（…）、(4) 土台の文書、の 4 つをこの順に…」「(3) と (4) は空白を除いた 1 行の JSON とし、それぞれ `json` の囲みに入れる。」 | 「…(3) 土台の文書、の 3 つをこの順に…」「(3) は空白を除いた 1 行の JSON とし…」と、スキーマを入れることの禁止（MUST NOT）、同じ押下で `IO-10` をダウンロードに渡すこと（MUST） |
| 2 | `FR-068` の RATIONALE「⭐ プロンプトにスキーマと土台の文書を埋めるのは、利用者がアプリの外のファイルを落として添えずに済むようにするためである…」 | 「⭐ スキーマを本文に埋めずファイルで渡すのは…（`JDG-3086`）」 |
| 3 | `05-07-design.md` 6.2「…どちらも生成器が原稿の後ろへ連ねる（`FR-068`）。」 | 「…土台の文書は生成器が原稿の後ろへ連ね、スキーマは…`IO-10` のファイルとしてダウンロードに渡る（`FR-068`）。」 |
| 4 | 表 T-024 の注「…拡張子は行ごとに違うので、組も行ごとに違う。」 | 「…取り込む行どうしでは拡張子が違うので…」と、拡張子を分け合う行は媒体の型も同じであること（MUST） |
| 5 | 生成器の検査「2 つの行が拡張子を分け合ってはならない」（`tools/generate_exchange_formats.py`） | 「拡張子を分け合う行は媒体の型が同じであること」 |

---

## 4. 書き直す所

| 所 | 書いたこと |
|---|---|
| `docs/spec/01-04-requirements.md` の `FR-068` | 文（STATEMENT）にダウンロードを足し、(3) を外し、ダウンロードの MUST・名・中身・原稿が名指す MUST・代償、入口と告げる文、RATIONALE |
| 同 表 T-024 | `IO-10` の行、「`IC-2` に出す」の注、拡張子を分け合う注 |
| 同 表 T-008 の `CHN-2` | 運ぶものにスキーマ（`IO-10`）を足した |
| `docs/spec/05-07-design.md` 6.2 と 表の `IF-3` | 原稿の禁止の理由と、`FileStore` がダウンロードも担うこと |
| `docs/spec/_assets/tbl-glossary.md` の `IC-115` | 「…コピーし、スキーマのファイルをダウンロードに渡す」 |
| `docs/spec/_source/notice-reasons.json` の `RS-65` の場面、`display-words.json` の `RS-65` の語と `IC-115` の説明 | 1 節の表のとおり |
| `docs/spec/_source/image-to-grs-json-prompt.ja.md`・`.en.md` | 1 行目の素性の文と「添付」の段 |

### 4.1 生成物

`npm run gen` の生成器が `src/adapter/screen-renderer/image-to-grs-json-prompt.json`（`schemaFileName` を足した）・`src/adapter/document-codec/exchange-formats.json`・`src/adapter/screen-renderer/export-formats.json`（`IO-10`）・`docs/spec/_assets/tbl-notice-reasons.md`・`src/adapter/screen-renderer/display-words.json` を書いた（手で直していない）。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えたもの |
|---|---|
| `src/adapter/screen-renderer/app-header-items.ts` | `imageToJsonPromptText` からスキーマを外した。`imageToJsonSchemaFile`（新）が名と中身を返す |
| `src/adapter/file-gateway/file-store.ts` | `FileStore` に `downloadFile`（持たない環境を許す） |
| `src/framework/file-system-access-file-store/file-system-access-file-store.ts` | `downloadFile` —— 拡張子から媒体の型を引き、殻が渡したダウンロードを呼ぶ。ハンドルは持たない |
| `src/framework/single-html-shell/single-html-shell.ts` | `downloadThroughAnchor` —— Blob とリンクの `download` |
| `src/framework/single-html-shell/frame-loop.ts` | `copyImageToJsonPrompt` が、クリップボードを書き始めた後にスキーマのファイルをダウンロードに渡す |
| `tools/generate_image_to_grs_json_prompt.py`・`tools/generate_exchange_formats.py`・`tools/generate_entity_types.py` | 3 節の 5 と 4.1 |

試験: 仕様だけを読む別のサブエージェントが書いた（数と結果は 7 節）。

毎フレームの経路（規則 04 の 5 節）: `src/adapter/screen-renderer/**` と `frame-loop.ts` に触れたので `perf-pending` の 267 を足した（`CR-828` と共有）。押したときにだけ動く道で、毎フレームの仕事は変わらない見込み。

---

## 6. グラフ（`impact.py`）

`FR-068` の辺に `IO-10`・`JDG-3086` が足され、`IO-10` は `FR-068`・`IC-115`・`IF-3`・`CHN-2` から指される。消す辺は無い。

---

## 7. 数（実測）

- コピーする文字列: ja 51938 → 19426、en 49645 → 17133 バイト（生成器の報告の行）。ダウンロードするファイル: 32499 バイト（スキーマ 32498 ＋ 改行）。
- 出荷ビルドで押した（Playwright、1280 × 627、ja）: ダウンロード 1 件、名 `grs-document.schema.json`、JSON として読めて `$schema` を持つ。クリップボードの `json` の囲みは 1 つ、`grs-document.schema.json` の名を含む。告げる文は 1 節の表のとおり。
- 試験の数と結果は、合流の報告に書く。

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `defects.md` | `DFC-3392` を `実測待ち`。`DFC-3391` は状態を変えず、`265dfcb86` で再現しなかったことと本書の後の形を書いた |
| `rulings.md` | `JDG-3086` を `適用済`、`JDG-502` の ⚠️ を「`CR-827` が当てた」に |
| `perf-pending.md` | `267` |
| `changelog.md` | 本書の 1 行（書いた時刻の版） |

---

## 9. 測り方の再現

```
git grep -c "CR-827" 265dfcb86 -- change-request docs src tests                    # 0 件
PYTHONIOENCODING=utf-8 python tools/generate_image_to_grs_json_prompt.py --check     # バイトの数
PYTHONIOENCODING=utf-8 python -c "import json;d=json.load(open('src/adapter/screen-renderer/image-to-grs-json-prompt.json',encoding='utf-8'));print(d['schemaVersion'],json.loads(d['schema'])['properties']['schemaVersion']['const'],json.loads(d['emptyDocument'])['schemaVersion'])"
```

---

## 10. 利用者の実物の手順

[日程の画像をデータ化するプロンプト] / [Schedule Image-to-JSON Prompt] を 1 回押す。① ダウンロードのフォルダに `grs-document.schema.json` が 1 つ増えるか（選ぶ窓は出ない）。② 告げる文がそのファイルの名を言うか。③ AI のチャットに、クリップボードの本文を貼り、日程の画像と `grs-document.schema.json` を添えて送り、返った JSON を GRS の [開く] で開けるか。Edge と Chrome の両方で。
