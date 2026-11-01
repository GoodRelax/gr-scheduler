# 掃除の棚卸し 2026-10-22 —— α の直前に残した無理

読むだけの棚卸し（`JDG-3045`・`JDG-3046`「棚卸し→持ち場ごと」）。何も直していない。
起点は統合の枝 `integ/coord-1022` の先端 `5dd50095c`。台帳（`defects.md`・`rulings.md`）には書かず、提案だけをここに置く。

- 所は 6 つ: 仕様（4 ファイルと `_assets`）・`_source`・`src`・`tests`・道具（`tools`・`check.sh`・`09-tools.md`）。台帳と記録は 7 つ目の所として分けた（直すと台帳を書くので、書き手を 1 つにするため）。
- `_asset` の置き場は `docs/spec/_assets/`（28 ファイル）。ほかに `scratch/spec-html-probe/html/spec/_assets` があるが、これは試しの出力で対象外。
- 各所は読むだけのサブエージェントに分けて読ませ、要の数は調整役でなくこの子セッションが測り直して確かめた（下の「確かめ直した数」）。
- 「大きさ」: S = 1 ファイル・30 分ほど、M = 数ファイルか 1〜2 時間、L = 多くのファイルか設計の判断が要る。
- 「振る舞い」: 「はい」は掃除の外。CR が要る。「疑い」は字の検索で拾ったもので、直す前に読んで確かめる。

## 1. 数のまとめ

| 所 | 行の数 | うち振る舞いが変わる（CR へ） | 測り方の要点 |
|---|--:|--:|---|
| 仕様（4 ファイルと `_assets`） | 21 | 1 | 2 節 |
| `_source` | 16 | 1（値の選び直し） | 3 節 |
| `src` | 20 | 1（見本の担当名） | 4 節 |
| `tests` | 22 | 0 | 5 節 |
| 道具 | 32 | 2（`pages.yml` の起動・`push_guard` の橋） | 6 節 |
| `check.sh` の赤と基準線 | 14 | 0 | 7 節 |
| 台帳と記録 | 31 | 5 | 8 節 |
| **計** | **156** | **10** | |

`check.sh` を 1 回だけ回した結果: 見出し 72、`FAIL` 0、`OK` 140、終了 0（`grep -c '^=====' / '^FAIL' / '^OK'` を走行の記録に）。赤は無い。無理は「基準線に抱えた数」と「下げられるのに下げていない基準線」の側にある（7 節）。

### 確かめ直した数（この子セッションが自分で打った）

| 主張 | コマンド | 結果 |
|---|---|---|
| `dist` の旧名は直っている | `grep -c "previous-project-result" dist/index.html` | 0 |
| 関数の大きさの基準線が緩い | `head -1 .claude/skills/spec-graph-check/function-size-baseline.txt` と `check.sh` の検査 60 の行 | 5744/509 に対し実測 5390/467 |
| MUST の覆いの基準線が緩い | `head -1 …/must-clause-coverage-baseline.txt` と検査 39 の行 | 2047 に対し実測 2040 |
| `src` の STOP の印 | `git grep -n "// STOP:" -- src \| wc -l` | 31 |
| `check.sh` の見出しの数が古い | `sed -n 2p .claude/skills/spec-graph-check/check.sh` | 「All 81」（数え直すと 83） |
| CR-822 の道具が目録に無い | `grep -c check_versions docs/development-rules/09-tools.md` | 0 |
| 見本の `Developer C` の重なりはわざと | `grep -n "DO NOT" tools/generate_startup_template.py` | `:933` に「DELIBERATE」 |
| 使われない関数 | `git grep -n previousWorkingDay -- src tests tools` | 定義の 1 か所だけ |
| 引継書の小物 (4) は済み | `grep -n "4\.96" docs/development-records/handoff.md` | 小物の列そのもの（`:15`）だけ |
| 作業木の数 | `git worktree list \| wc -l` / `ls .claude/worktrees \| wc -l`（根で） | 234 / 296 |

## 2. 仕様（`docs/spec` の 4 ファイルと `_assets`）

測り方: 生成器 11 本を `--check`（書かない形）で回し、`_source` と `_assets` のずれは 0。`_assets/*.md` のうち手書きは `tbl-glossary.md` と `design-mcp-relay.md` の 2 つだけ。STOP・TODO・FIXME・`previous-project-result/`・存在しない表や `_assets` を指す参照はどれも 0（`grep -c`、表番号 239 を集めて照合）。

| # | ファイル:行（または数え方） | 何が無理か | 大きさ | 振る舞い |
|---|---|---|---|---|
| A1 | `docs/spec/01-04-requirements.md:319` | `_assets/source/` を指す。今は `_source/` | S | いいえ |
| A2 | `docs/spec/_assets/tbl-settings.md:546`（原稿は `_source/settings.json:5754`、S-485） | `studies/33-parent-task-palette-icons/` は `33-wbs-parent-palette-icons/` に改名済み。直しは原稿側（B2 と同じ） | S | いいえ |
| A3 | `docs/spec/_assets/tbl-glossary.md`（7 表・382 行。`grep -c '^\| '` から見出しと区切りを引いた数） | 手書きの唯一の大きな表。`DFC-2175` の「9 表・463 行」は古い（T-107・T-108 は外へ出た）。JSON 化は計画 uid 13 | L | いいえ |
| A4 | `01-04-requirements.md` の 1.8、`tbl-glossary.md:370`・`:376` | 1.8 は「T-101〜T-109」のまま。用語集の 6・7 節は置き場を指す 1 文だけの残り | S | いいえ |
| A5 | `01-04-requirements.md` の表 T-005（G-1〜G-14） | 用語集の手写しの抜粋。自分で「食い違ったら辞書が勝つ」と書く。2 か所で持つ（今ずれているかは未確認） | M | いいえ |
| A6 | `01-04-requirements.md:4611`「本表の 9 行」 | 近くに 9 行の表が無い（疑い: 行が増減した後に直していない） | S | いいえ |
| A7 | `05-07-design.md:338`・`:341`・`:343`・`:527`（UT-7・UT-10・UT-12・UF-60） | 手で持ったファイル数。表 T-075 と `src` の実数と合わず、ScreenRenderer を UT-7 は 12、UF-60 は 16 と書いて仕様の中でも食い違う | S | いいえ |
| A8 | `01-04-requirements.md:230`（LM-19） | 2026-09-14 の 1 回の実測（p95 24.4 ms）を手で持ち「いまの値を是とする」。走行は 2026-10-17 まである | M | 数だけなら いいえ |
| A9 | `08-10-test.md:58`〜`:66`（10.2 節） | 速さの原本を 2026-09-05 の 1 本に固定。以降の走行 12 回を見ていない | S | いいえ |
| A10 | `01-04-requirements.md:9413` 表 T-026（RC-1・3・7・11・12・13）、`tbl-settings.md` の 🔎 254 個（S- 523 行のうち 180 行） | 「骨格で測って選び直す」のまま、骨格の時期は過ぎた | L | **はい → CR** |
| A11 | `A-appendix.md:9`〜`:12`・`:16`・`:29` | 「まだ器である」「未記入」が 2 節。A.1 は中身があるのに未記入の印。A.2 の一覧は空で、実体は `NOTICE` と `license.json` | S | いいえ |
| A12 | `05-07-design.md:9`〜`:10` | 1912 行あるのに「まだ器である」の前書き。未記入の節は 0 | S | いいえ |
| A13 | `spec.sgra:98`〜`:192` | 試験の型 4 つを宣言するが使う節は 0（疑い: 将来の器として残すなら別の判断） | S | いいえ |
| A14 | `**Version**:` を持つ 17 ファイル（`grep -H '^\*\*Version\*\*'`） | 0.1〜0.4 のまま。仕様の版は変更履歴の 5.36。一部は生成器が書く（`_source` 側と重なる） | S | いいえ |
| A15 | `_assets/design-mcp-relay.md:181`・`:194`・`:205`・`:208`・`:227`、`01-04-requirements.md:493`・`:8208` | ダウンロード・インストールの意味で「落とす」「入れる」が 7 か所（利用者の裁定 2026-10-20 の語に反する） | S | いいえ |
| A16 | `_assets/fig-source-relations.svg` | 仕様のどのファイルからも指されない（疑い: 置く意図なら正しい） | S | いいえ |
| A17 | `_assets/fig-grab-map-*.svg` ほか 6 枚（F-020〜F-025） | 種が `studies/16-grab-area-sizing/` の手書きの見本。`--check` の仲間に入っていない。題の形が他の図と違う | M | いいえ |
| A18 | `tbl-glossary.md` の表 T-102 | 239 表のうちただ 1 つ、どこからも指されない。T-016 と中身が重なる（疑い） | S | いいえ |
| A19 | 「いまは」の言い切り 12 か所（`grep -c いまは`。例 `05-07-design.md:801`、`tbl-settings.md:394`・`:687`） | 時点の事実を手で持つ。今も正しいかは未確認 | M | いいえ |
| A20 | `01-04-requirements.md:230`、`05-07-design.md:1081`・`:1102` | 数の出どころが終わった記録 `history/refactor-*.md` | S | いいえ |
| A21 | `strictdoc-theme.css`（先頭に「毎回書き直す」）、`strictdoc_config.py` | 道具が書き直すファイルを git が持つ（疑い） | S | いいえ |

## 3. `docs/spec/_source`

測り方: `_source` の生成器 10 本・`erd_json_to_schema.py`・`build.py`・`source_relations.py` と、`_source` へ書く `tools/generate_*.py` 8 本を `--check` で回し、ずれは 0。英日のプロンプト 2 本は行数・記号・`{{S-nnn}}` の置き場が一致。`studies/` を指す 18 種のうち欠けは 1。重複は Python の `ast` で最上位関数 244 個を比べた。

| # | ファイル:行（または数え方） | 何が無理か | 大きさ | 振る舞い |
|---|---|---|---|---|
| B1 | `property-items.schema.json`（134 行） | 他の手書きスキーマ 9 本は生成器か検査が使うのに、これだけ誰も検証に使わない | S | いいえ |
| B2 | `settings.json:5754`（S-485） | A2 の原稿。旧名 `studies/33-parent-task-palette-icons/` | S | いいえ |
| B3 | `settings.json:3752`（S-193）「いまは `PR-2` の 1 行」 | 複数行の行は PR-2 と PR-21 の 2 行（PR-21 は 2026-09-06 に追加） | S | いいえ |
| B4 | `settings.json:7720`（S-164） | 「1 本も描かれていない（`FR-042`）」の根拠が別の話に見える（疑い） | S | 疑いを解いてから |
| B5 | `settings.json` の 🔎 169 行・「試す値」13 行・「暫定の値」1 行（`grep -c '"mark": "🔎"'` ほか） | A10 の原稿。由来の無い手持ちの値 | L | **はい → CR** |
| B6 | `*_json_to_md.py` の写し: 同名関数 20 種、同じ中身の組（`broken_prose` 4 本×50 行・`_break_points`・`separate_tables`・`broken` 各 4 本・`say` 6 本ほか）。概算 600 行 | 共有の部品が無い。1 本だけ直し忘れると表の形がずれる | M | いいえ（`--check` で出力の一致を守れる） |
| B7 | `image-to-grs-json-prompt.en.md:1`・`.ja.md:1` と `docs/guides/schedule-to-grs-json/prompt-en.md`・`prompt-ja.md` | 手写し。差は英 41 行・日 11 行。英語の写しは「row」と古い語、`prompt-en.md:46` は `08:00:00` を直書き | M | いいえ |
| B8 | `package.json:38`（`gen`） | `gen:components`・`gen:relations` が無いのに `gen:check`（`:39`）には在る（道具の E14 と同じ） | S | いいえ |
| B9 | `09-tools.md` | `agent_api_members_json_to_md.py`・`document_commands_json_to_md.py` を名指さない（`grep -c` で 0・0） | S | いいえ |
| B10 | 手書きスキーマ 13 本の `$id` | 住所の流儀が 3 通り（公開 2 本・リポジトリの住所 10 本・無し 1 本） | S | 公開 2 本を変えるなら はい |
| B11 | `erd_json_to_md.py:38`・`:39`、`source_relations.py:74` | 使われない定数 3 つ | S | いいえ |
| B12 | 60 行を超える関数 8 つ（最大 `erd_json_to_md.py:339 problems` 122 行） | 長い関数 | M | いいえ |
| B13 | `*.py` の非 ASCII 421 行（日本語 302） | 出力の日本語は理由があるが、コメントの分は英語にできる（疑い: 内訳は未分類） | M | 文字列に触れなければ いいえ |
| B14 | `fig-mcp-relay.drawio` | 作り直す道がリポジトリの中に無い（外の道具 `draw.py` 頼み）。図 6 枚の検査は NOT CHECKED | M | いいえ |
| B15 | `settings.json` 18 行・`erd.json` 1 行の `` `:2760` `` 型の行番号の引用 | 今は合っている（2 件確かめた）が、引き先が動くと黙って狂う | M | いいえ |
| B16 | `_source/__pycache__/`（ignore 済み） | 棚卸しの `--check` が作ったごみ。git には出ない | S | いいえ |

## 4. コード（`src`、と `dist`・About の頁）

測り方: `git grep` で印を数えた（TODO・FIXME・HACK・暫定 0、STOP 31）。`eslint-disable`・`@ts-ignore`・`as any` は 0、`as unknown as` は 25。関数の大きさは `function-size.mjs` に流して測った（5956 関数、帯 65）。`export` 1889 個を拾い、他のファイルと試験と道具から名が出るかを数えた（字の検索なので疑い）。

⚠️ **`src` のどのファイルを触っても中継の入力が変わる**（`tools/artifact-versions.json` の `grsRelayInputs` は `src` 全体・`vite.relay.config.ts`・`tools/relay_version.mjs`・`tools/build_relay_bundle.mjs`・`dist/index.html` を持つ）。検査 85 のために `node tools/artifact_versions.mjs bump grsRelay` が要り、中継の版と `.mcpb` のバイト列が動く。`src` の掃除は波ごとに 1 回の bump にまとめる。

| # | ファイル:行（または数え方） | 何が無理か | 大きさ | 振る舞い |
|---|---|---|---|---|
| C1 | `edgeOf`（計画 115）: `src/entity/layout-engine/schedule-layout/schedule-layout.ts:217`（呼ぶ所 `:270`）と写し `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts:519` `baselineEdgeXOf` | 同じ「端の日」の規則が別名で 2 か所。`edgeOf` の名の関数は 1 つだけ | S | いいえ |
| C2 | `NOT_STORED_DUMMY_SIZES`（計画 116）: `task-figures.ts:830`・`schedule-layout.ts:821` | ⚠️ 計画の前提「手で持つ寸法」は当たらない —— 両方とも生成済み。本当の無理は、task-figures の写しと `schedule-geometry.ts:57` の再書き出しを誰も読まないこと、生成器の注 `tools/generate_entity_types.py:3361-3384` と `:3892-3894` が古いこと | S | いいえ |
| C3 | `baseChangeCommandOf`（計画 117）: `src/use-case/edit-document/edit-document-settings.ts:600` ほか src 5・tests 3 | 単数の名で命令の配列を返す。⚠️ 複数形 `baseChangeCommandsOf` は既に `field-entry.ts:258` が使う。仕様の PI-9（`_source/published-entries.json:2487`）が名指すので、仕様の変更（規則 02）が先 | M | いいえ |
| C4 | 引継書の小物 (1): `src/framework/mcp-relay-server/mcp-relay-server.ts:59-60`「the version is package.json's」、`vite.relay.config.ts:96`「the source's commit time」 | 今の作り（`artifact-versions.json` の時刻）と違う注。道具の E20・E21 と同じ束 | S | いいえ（ただし中継の版が上がる） |
| C5 | 引継書の小物 (2): `docs/about/index.html:467`・`:890` の `2026.1019.22508` | `10-versions.md` の形でない。`:890` はスクリプトの中なので `:6` の CSP のハッシュを作り直す要がある。ハッシュを作る道具は `tools/` に無い | S | いいえ |
| C6 | 引継書の小物 (5): `dist/index.html` | もう 0 件（`3940a36ab` で直った）。引継書の (5) が古い（8 節の F1） | — | — |
| C7 | 計画 196 の前半「見本の担当 `Developer C` の重なり」: `startup-template.json:27762`・`:27780`（uid 1008・1010） | ⛔ わざと。`tools/generate_startup_template.py:933-941` が「直すな」と書く —— 表 T-225 の AS-8 を試せる唯一の組。計画の前提とぶつかる | S | **はい（起動の文書が変わる）→ 利用者の裁定** |
| C8 | 計画 196 の後半「`PlanActualState` の中の語」: `plan-actual-state.ts:9-14` は `suspendedResumePlanned`・`suspendedResumeUnknown`、命令の側 `edit-task.ts:64-88` は `suspendedWithResumeDate`・`suspendedWithoutResumeDate`。`search-panel.ts:92` が同じ名の局所の型を作る | 同じ状態に語の組が 2 つ（`JDG-2684` は命令の側だけ決めた）。計画の名がこれを指すかは疑い | M | いいえ |
| C9 | STOP の印 31（`git grep -n "// STOP:" -- src`）。うち 15 は仕様が既に答えた（8 節の F2） | 古い印を外せば PND 7 本（143・144・141・313・430・270・250）を `裁定済` にできる。⚠️ サブエージェントの 1 つは「31 とも PND が `未裁定` なので掃除ではない」と読んだ。台帳 `DFC-2730`（実装待ち）は 15 を古いと仕分けており、こちらを採る。外す前に各 PND の文とコードが合うかを 1 つずつ確かめる | M | いいえ |
| C10 | `src/entity/document-model/schedule/working-calendar.ts:240` `previousWorkingDay` | どこからも呼ばれない | S | いいえ |
| C11 | 自分のファイルの中でしか使わない `export` の関数・定数 37（例 `delay-diagnostics-report.ts:128`・`:1094`・`:1574`、`time-axis.ts:121`） | 書き出しが要らない（疑い） | M | いいえ |
| C12 | 自分のファイルの中だけの型の `export`: interface 95・type 68・生成の型 38 | 疑い。生成のものは生成器の形 | M | いいえ |
| C13 | 試験からしか使わない `export`: 関数 34・定数 4・型 30（＋生成 12） | 試験のための公開（検査 65 の作法で正しいものもある） | M | いいえ |
| C14 | 同じ本体の補助関数（別ファイル）13 名（`taskGroupRankById`・`labelUnits`・`charUnits`・`withScheduleParts`・`rectHoldsPoint`・`dayFromSerial`・`serialOf`・`escaped`・`rounded` ほか）。「一緒に直せ」の注 17 | 写し。層の向きで import できないものが混じる（1 つずつ判定） | L | いいえ |
| C15 | `MS_PER_DAY` が 3 か所（`input-command-translator.ts:489`・`schedule-grid.ts:118`・`time-axis.ts:20`）、生の `86400000` が 3 か所 | 同じ値の手持ち 6 | S | いいえ |
| C16 | `docs/development-records/magic-numbers.md` | 8 節の F27 と同じ（表が古い） | — | — |
| C17 | `as unknown as` 25（多い順 `import-document.ts` 5） | 型を 2 重に剥がす所（疑い） | M | いいえ |
| C18 | 関数の大きさの基準線 | 7 節の G1 と同じ | — | — |
| C19 | 長い関数の上位（`frame-loop.ts:2868 frameLoop` 1535 行、`field-editing.ts:208` 460 行、`dom-screen-surface.ts:1030` 366 行、`import-document.ts:653 builtMerge` 281 行・枝 54、枝の最多 `frame-loop.ts:4114 receiveInput` 68） | 帯（50 行・枝 15）を大きく超える。割るのは設計の判断 | L | いいえ |
| C20 | `src` が名指す DFC のうち 46 種がまだ `defects.md`（開いた側）に在る | 直したのに台帳が動いていないか、直っていない所を指すか（疑い。台帳と突き合わせ） | M | いいえ |

当たらなかったもの: どこからも import されない `src` のファイル 0、古い名と古い道 0、`src` が名指すパス 19 とも実在。

## 5. 試験（`tests`）

測り方: `git grep` で数えた（式は各行）。仕様の識別子は、`tests/` から `[A-Z]{1,5}-\d+` を全部拾い、前置きが仕様の表の 1 列目に定義されているもの（異なり 2638）を `docs/spec` 全体と突き合わせた（全数）。日本語の逐語の引用は「こと／（MUST）」で終わる文字列 2378 を仕様と部分一致で比べた。`tools/generate_test_inventory.py --check` は終了 0（`test-inventory.md` は最新）。試験は走らせていない。

| # | ファイル:行（または数え方） | 何が無理か | 大きさ | 振る舞い |
|---|---|---|---|---|
| D1 | `tests/known-red.txt:17-20`（`DFC-1024` の揺れる 4 行） | 原因は `DFC-2312` で直った。外す条件は「GT-2 が時間切れ 0 で通る」（外すのは調整役）。`defects.md` の DFC-1024 の本文は「5 行」と古い | S | いいえ |
| D2 | `known-red.txt:15`・`:16`・`:21`（DFC-1016・1020・922） | 台帳はまだ開いているので外せない。ただし `:16` の注の `FR-066` は仕様に無い番号 | S | いいえ |
| D3 | `it.skip` 13（`git grep -nE "it\.skip\("`）。12 は空の印だけ | `cr-423:727`（PND-204）と `cr-427:414`（PND-445）は `JDG-300` で裁定済みなのに「open」のまま。書けるようになった | M | いいえ |
| D4 | 条件付きの skip 4（`cr-739:260`・`cr-820:106`・`:142`・`cr-796-s7:470`） | 成果物が無いと静かに飛ぶ。飛んだことを読み取る道が無い（疑い） | S | いいえ |
| D5 | `it.todo` 9、`it.fails` 10（`git grep`） | 引く DFC はすべてまだ開いている —— 外せる物は無い。例外 `unit/cr-439:187` は DFC 番号を持たない | S | いいえ |
| D6 | `tests/system/open-defect-pins.test.ts`（題と `:6` の説明） | `test.fail` の固定を 1 つも持たないのに「open defect pins」。名指す DFC はすべて直済み | S | いいえ |
| D7 | `LOADED_MACHINE_TIMEOUT_MS = 60_000` 4 か所、`display-words.contract.test.ts:3922` の `300_000` | 原因は直った（単独 0.6〜1.7 秒）。今は遅さを隠す側。外す条件は D1 と同じ | S | いいえ |
| D8 | `test.setTimeout` 304 か所（`git grep -hoE 'test\.setTimeout\([A-Za-z_0-9]+\)' \| sort \| uniq -c`）。180 秒 103・240 秒 64 は理由なし | `playwright.config.ts` に全体の時間切れが無く、各試験が自分で延ばす | M | いいえ |
| D9 | 仕様の識別子の引用: 2638 のうち 36（1.4%）が仕様に無い。本物は約 10（`unit/uf-41-42.test.ts:1361` の `FR-061`、`known-red.txt:16` の `FR-066`、`state-machine-notices.contract.test.ts:165` の `RS-35` ほか） | 古い引用 | M | いいえ |
| D10 | 日本語の逐語の引用: 2378 のうち 277 が逐語で無い。本物を 1 件確かめた: `unit/t-023d-follows-the-pointer.test.ts:1337`（HM-3 は今「親タスク」） | 残り 230 余りは未読（疑い。大半は省略記号・断片・負の試験） | M | いいえ |
| D11 | `docs/spec/*.md:NNN` の行番号の引用 34 か所・17 ファイル（`git grep -nE "docs/spec/[A-Za-z0-9_./-]+\.md:[0-9]+" -- tests`） | 32 が外れている（仕様が 9423 行に伸びて動いた）。識別子で引けばよい | M | いいえ |
| D12 | 試験が名指す `tests/…` のファイル 118 のうち 28 が無い（例 `tests/unit/uf-23.test.ts`、`uf-61`〜`uf-69`） | 消えた・動いた試験を引く説明 | M | いいえ |
| D13 | `unit/t-023d-follows-the-pointer.test.ts:154`、`contract/dfc-355-…:69-76` | `screen-frame.ts` の STOP の注を引くが、そのファイルに STOP は 0。`scrollbarIn` の行番号も違う | S | 疑い（固定している中身次第） |
| D14 | 試験の補助の写し: `REQUIREMENTS` 312 定義、`realRaf` 122 ファイル、`rowOf` 113、`cellOf` 106、`TEMPLATE` 150、`NO_MODIFIERS` 88 | `tests/contract/spec-table.ts` があるのに各ファイルが自前で写す。仕様の書式が変わると広く壊れる | L | いいえ |
| D15 | 大きなファイル（`unit/uf-72-screen-part.test.ts` 5603 行、`system/measured-sweep.test.ts` 4241 行ほか） | 古い引用が溜まる所。割るのは設計の判断 | L | いいえ |
| D16 | `integration/cr-572-…:1`・`:171` の `DFC-995` | 台帳のどちらにも行が無い | S | いいえ |
| D17 | `contract/cr-620-seam-4-help-footnote.contract.test.ts:178` | 生の NUL バイト 1 つ。git がこのファイルを「バイナリ」と見る | S | いいえ |
| D18 | `tests/README.md:28`（「Seventy-one units」）・`:36-37`（行番号） | 手で持つ数と行番号 | S | いいえ |
| D19 | `vitest.config.ts` の注「179 of 180 files」「19.15s」（2026-09-07） | 今は 635 ファイル。古い数 | S | いいえ |
| D20 | `test-inventory.md` が数える「仕様の行に紐づかない試験 7」「どの試験も名指さない FR-010・040・079・081・150、NFR-005・006・008・012、UC-015」 | 掃除ではなく覆いの穴。記録だけ | — | — |
| D21 | `tests/README.md` の配置図（`:57-61`） | `integration/*.sws.test.ts` の名づけが実在するか未確認（疑い） | S | いいえ |
| D22 | `.claude/skills/spec-graph-check/comment-rules-tests-baseline.txt` | 7 節の G2 と同じ。試験のコメントを直すとまた下がる | — | — |

当たらなかったもの: `.only`・`xit`・`fixme` 0、TODO 系 0、古い名 0、使われない fixture と補助ファイル 0。

## 6. 道具（`tools`・`.claude/skills`・`09-tools.md`・`package.json`・workflows）

測り方: コードの道具は `git ls-files tools .claude/skills .claude/hooks | grep -E '\.(py|mjs|sh)$'` で 146 本。`09-tools.md` の表の行（第 4〜8 節）は 107。各道具の名を 09 の全文と表の行で照合した。`check.sh` の検査の数は見出しの番号を足して 83（1〜86、34〜36 は欠番）。重複は各 `.py` の最上位関数の本文の md5 を比べた。

| # | ファイル:行（または数え方） | 何が無理か | 大きさ | 振る舞い |
|---|---|---|---|---|
| E1 | 引継書の小物 (3): `tools/check_versions.mjs`（CR-822、検査 86） | 09 に無い | S | いいえ |
| E2 | 版の道具の仲間 6 本（`artifact_versions.mjs`・`check_reproducible_artifacts.mjs`・`relay_version.mjs`・`release_version.mjs`・`stamp_download_page.mjs`・`build_relay_bundle.mjs`） | 09 に無い。検査 85・86 の「何が見えないか」が目録に無い | S | いいえ |
| E3 | 生成器 7 本（`generate_agent_api.py`・`generate_document_commands.py` ほか）と B9 の 2 本 | 09 に名前が出ない（`npm run gen` が回すのに） | S〜M | いいえ |
| E4 | 検査の道具 4 本（検査 74〜77）と hook `block-sweeping-git.py` | 09 に無い | S | いいえ |
| E5 | 09 に名前が出ない道具: 計 29 本、表の行が無い道具: 計 50 本 | 第 9 節が 2026-09-26 から「次の合流で足す」と書いたまま | M | いいえ |
| E6 | `09-tools.md:77-82`・`:141`・`:234` | 手で持つ数（合計 105・生成器 28/30・検査 70）。実数は 146・83 | S | いいえ |
| E7 | `09-tools.md:36-37` | `guard:commit`・`guard:publish` の中身の写しが古い（今は `run-gate.mjs GT-1`・`GT-2`） | S | いいえ |
| E8 | `tools/rename/`（7 本・3670 行）、`tools/tune_mspdi_samples.py`、`tools/schema-only-writer/` | 呼び手は着地済みの CR の文書だけ。一回限りの台本（疑い）。捨てるか残すかは判断 | M | いいえ |
| E9 | `tools/probe/grab-figures.mjs` ほか 2 本 | 09 と文書からしか呼ばれない（人が手で回す見本なので弱い疑い） | S | いいえ |
| E10 | `package.json` の script 112 のうち、他から呼ばれないもの 29 | 大半は人の入口。`follow`・`layers`・`linebreaks:check`・`marks:check`・`render:check` は check.sh と二重の入口（疑い） | S | いいえ |
| E11 | `.claude/skills/spec-graph-check/check.sh:2`「All 81」・`:15` の数え直しの注 | 実数 83。番号 85・86 を足したときに数え直していない | S | いいえ |
| E12 | `check.sh:843-845`「78 held」、`:975`「19 held」、09 の検査 70 の行「50 件」 | 注に埋まった当時の数。今は 65・5・37 | S | いいえ |
| E13 | `.claude/skills/spec-graph-check/SKILL.md:315`「18 known groups」・`:80`「26 standing duplications」 | `docs/review/duplication-baseline.txt` は 72 組 | S | いいえ |
| E14 | `check-language-dictionary.py:85-100` | 「for now」で上げた上限が積み上がる形 | S | いいえ |
| E15 | `tools/relay_version.mjs:2`・`tools/stamp_download_page.mjs:1`「design-mcp-relay.md section 6」 | 版の規則は `10-versions.md` へ移った。引継書の小物 (1) | S | 中継の版が上がる |
| E16 | `tools/build_relay_bundle.mjs:117`・`vite.relay.config.ts:96`・`.github/workflows/pages.yml:114` | 「コミットの時刻」の古い言い方。`relay_version.mjs:13-15` と食い違う | S | 中継の入力（`pages.yml` を除く）—— C4 と一緒に |
| E17 | `.github/workflows/pages.yml:13-22` | 「PAUSED … package.json が無い」と全部古い。起動は `workflow_dispatch` だけ | S（注）| 注は いいえ。起動を戻すなら **はい → 利用者の裁定** |
| E18 | `tools/push_guard.py:10`・`:64-66`・`:122`（`DEV_BRANCHES = ('develop', 'refactor')`）と自己試験 約 25 行 | `origin/refactor` はもう無い（`git branch -r`）。`JDG-2935` の橋は要らなくなった（疑い） | M | **守りの道具の判定が変わる → 調整役の許し** |
| E19 | `check.sh:1088`・各基準線の注の「refactor」 | 大半は履歴の語で枝名ではない | S | いいえ |
| E20 | `def say()` が 51 ファイル、同じ中身の組 6 | 共通の部品が無い | M | いいえ |
| E21 | `read_baseline()` 11 ファイル（同じ中身 5 本と別の組 2 本）、`write_baseline` 3 本 | 基準線の読み書きの写し | M | いいえ |
| E22 | 同じ中身の組: `tracked()` 4・`path_of()` 8・`stop()` 4 ほか | 道具の中の写しは検査されていない（検査 45 は `src` だけ） | L | いいえ |
| E23 | 非 ASCII を含むファイル 93、日本語の行 1205（`tools/` 295 行） | 大半は仕様の語を読む正規表現と標本で理由がある。1 つずつ読む | M | いいえ |
| E24 | 絵文字の印が多い 5 本（`generate_startup_template.py` 231 行ほか） | ASCII の規則に反する（印をコメントに使う方針か要確認） | S | いいえ |
| E25 | `tools/check_versions.mjs:28-32`・`:87` | 日本語の文字列 7 行。理由はある（規則の印を探す標本）—— 理由の 1 行を足せば足りる | S | いいえ |
| E26 | `tools/generate_unit_tree.py:180` | 生成する雛形に `// TODO:` を書く（雛形の語。弱い） | S | いいえ |
| E27 | `.claude/workflows/audit-cadence-and-architecture.js:128` | `grep -rn "STOP --" src/` と書くが今の形は `STOP:`。打つと 0 件 | S | いいえ |
| E28 | `C2` の生成器の注（`tools/generate_entity_types.py:3361-3384`・`:3892-3894`） | C2 と同じ（生成器が古い注を刷る） | S | いいえ |
| E29 | `docs/about/` の頁の CSP のハッシュを作る道具が無い | C5 を直すたびに手で作る | S | いいえ |
| E30 | `package.json:38`（B8 と同じ） | `gen` と `gen:check` の食い違い | S | いいえ |
| E31 | 一回限りの台本の参照（`change-request/`・`docs/review/`） | E8 を捨てる前に参照を残すか決める | S | いいえ |
| E32 | 作業木 234 本が登録、`.claude/worktrees` に 296 個のフォルダ（計画 196 の「作業木の掃除」） | 機械の状態で git の中身ではない。掃除の手順はメモリーの作業木の掃除の手順（OneDrive の読み取り専用のフォルダに注意） | M | いいえ |

当たらなかったもの: 09 が名指すのに無いファイル 0（生成物の 2 つを除く）、絶対パス・利用者名 0、`previous-project-result` は改名表と自己試験の中だけ（残してよい）。

## 7. `check.sh` の赤と基準線（1 回の走行から）

赤は 0。「下げられる」は check.sh 自身が ⭐ で下げよと言う行、または実測が基準線より小さい行。

| # | 基準線のファイル:行 | 基準線 | 実測 | 何が無理か | 大きさ |
|---|---|--:|--:|---|---|
| G1 | `.claude/skills/spec-graph-check/function-size-baseline.txt:1` | 5744 / 509 | 5390 / 467 | 下げられる。`:2-13` に「調整役が下げる」の注が 11 行たまっている | S |
| G2 | `.claude/skills/spec-graph-check/comment-rules-tests-baseline.txt` | 4 ファイルの行と密度 1327 | 332・347・549・1408、密度 1286、`tests/unit/uf-26.test.ts` の行は消す（ファイルが無い） | 検査 55 が「この変更で下げよ」と言う | S |
| G3 | `.claude/skills/spec-graph-check/must-clause-coverage-baseline.txt:1` | 2047 | 2040 | 検査 39 が ⭐「下げて地を守れ」と言う | S |
| G4 | `decided-spec-baseline.txt:1`（検査 29） | 78 | 78 | 実装待ち以降で置き場を名指さない台帳の行 78 —— 台帳の側の借り | M |
| G5 | `stale-blocked-baseline.txt:1`（検査 31） | 49 | 49 | 決着したのに止まって読める台帳の行 49 | M |
| G6 | `ruled-elsewhere-baseline.txt:1`（検査 40） | 11 | 11 | PND が裁定済みなのに台帳が裁定待ちのまま 11 | S |
| G7 | `ruling-landed-baseline.txt:1`（検査 43） | 9 | 9 | 未着地の裁定 9 | M |
| G8 | `quoted-source-baseline.txt:1`（検査 42） | 37 | 37 | 仕様に出どころの無い引用 37 | M |
| G9 | `spec-id-references-baseline.txt:1`（検査 44） | 84 | 84 | `src`・`tests` が退役（58）・未定義（26）の仕様の識別子を引く | M |
| G10 | `repeated-expressions-baseline.txt:1`（検査 45） | 74 | 74 | `src` の繰り返した式の群 74（`tests` は 3694 群、助言だけ） | L |
| G11 | `unit-test-or-omission-baseline.txt:1`（検査 65） | 42 | 42 | 試験も省く理由も無い `export` の関数 42（覆いの記録が無いので上限の数） | M |
| G12 | `crossing-names-baseline.txt`（検査 26b） | 123 | 123 | 表 T-064 に無い、部品をまたぐ名（`DFC-2648`） | L |
| G13 | `twin-comments-baseline.txt`（検査 70） | 37 記録 | `KNOWN copy` 31・`coupling` 6 | 写しを認める注。うち 2 件は相手の名が古い（`zoom-and-fit.ts:398`・`task-figures.ts:438` の「twin: stale」） | L |
| G14 | `docs/review/duplication-baseline.txt`（検査 11） | 72 組 | — | 文書の重複の組（E13 と同じ数のずれ） | M |

G1〜G3 は数を下げるだけの S（JDG-520 で調整役が下げてよい）。ただし G1 は `src` の掃除でまた動くので、`src` の波が着いた後に 1 回で下げるのがよい。G4〜G14 は「抱えた借り」で、各波が払うと下がる。

## 8. 台帳と記録（提案だけ。台帳は書いていない）

測り方: `defects.md` の DFC 行 790 本を読むだけの Python で読み、6 番目の列（ステータス）を数えた。開いている行 696（実測待ち 525・未検討 75・実装待ち 35・仕様待ち 33・試験待ち 23・裁定待ち 5）—— 台帳の先頭の自動の表と一致。実測待ち以外の開いた行 171 本を全部読み、掃除に当たるものを選んだ（52 本。分類は読んだうえでの判断）。

| # | 所（ファイル:行 または ID） | 何が無理か | 大きさ | 振る舞い |
|---|---|---|---|---|
| F1 | `handoff.md:15` の小物 (4)・(5) | (4) は `5dd50095c` の書き換えで消えた、(5) は `3940a36ab` で直った —— 列の 2 つが古い | S | いいえ |
| F2 | `DFC-2730`（`defects.md:751`） | 「古い STOP 16」は今 15（PND-419 の印は CR-796 で消えた）。15 か所は C9。外した後で PND 7 本を `裁定済` へ（順は 印 → 状態） | M | いいえ |
| F3 | `DFC-2647`（`:729`） | 実測済（決着）で刈り取り待ち。中の数（35・PND なし 25）は今の 31・PND なし 0 と合わない | S | いいえ |
| F4 | `DFC-2646`（`:728`） | 写し 5 組（検査 70 の「already diverged」2・「suspect divergence」3）を畳む。食い違う組を畳むと答えが変わりうる | M | **疑い はい → CR の候補** |
| F5 | `DFC-2648`（`:730`） | 表 T-064 に無い名 129（G12）。仕様に足すか、読む側を畳む | L | いいえ |
| F6 | 罠の束 `DFC-544`・`547`・`548`・`549`（`:112`・`:115`〜`:117`） | 罠を注だけが持つ。型・試験・生成器の表明・検査へ。549 は道具と新しい検査を含む | M〜L | いいえ |
| F7 | `DFC-532`〜`537`・`539`・`542`（`:100`〜`:110`） | 罠の束と同じ型（任意の欄が欠けても黙る・規則を 2 か所が持つ）。型を締め試験を足す | 計 L | いいえ |
| F8 | `DFC-464`（`:93`） | 表 T-234 の一覧に `FR-073` が無い（仕様の文。状態が「実装待ち」なのは不自然） | S | いいえ（③ の案は はい） |
| F9 | `DFC-630`（`:155`） | 13 か所の px の比べ方が `isAtLeastDrawnPx` を通らない | M | 疑い（境目だけ答えが変わる） |
| F10 | `DFC-1066`（`:323`） | uid の最高水位の 3 通りの書き方 | M | **はい → CR**（20 万行の `RangeError`、貼り付けの uid の順） |
| F11 | `DFC-1070`〜`1073`（`:326`〜`:329`） | 重複した責務の一覧（`frame-loop.ts` は 4458 行のまま） | L | いいえ |
| F12 | `DFC-1074`・`1075` | 3 ファイルの外の偶然の写し約 50 群、調査の但し書き | L / S | いいえ |
| F13 | `DFC-1284`・`1675` | ファイルと関数の大きさ（C19） | L | いいえ |
| F14 | `DFC-2630`〜`2632`（`:699`〜`:701`） | 台帳の 2 行が逆を言う、押して確かめる色相が書かれていない | S | いいえ |
| F15 | `DFC-2640`〜`2642`（`:720`〜`:722`） | 公開の名 479・Agent API 22・命令 88 の引数と戻りが `src` にしか無い | L | いいえ |
| F16 | `DFC-2643`・`2644`（`:725`・`:726`） | 状態機械のガード 65 は名だけ、23 は `src` に名が無い | L | いいえ |
| F17 | `DFC-2645`（`:727`） | 仕様の値の集まりを `src` が手で写す 14 件（検査 69・70） | M〜L | 大半いいえ |
| F18 | `DFC-2681`（`:732`） | `search-panel-drawing.ts:652` の 2px の手書き | S〜M | いいえ |
| F19 | `DFC-2705`（`:752`） | 表 T-206 の S-360・S-361 の注が古い既定を写す | S | 注だけなら いいえ |
| F20 | `DFC-2720`・`2721` | `Esc` の段の語、状態機械の升の副作用 | S〜M | いいえ |
| F21 | `DFC-2722`（`:750`） | 試験が原稿にもコードにも無いガード `hasStartupTemplate` を扱う | S | いいえ |
| F22 | `DFC-2855`（`:723`） | 命令 `deleteTaskGroup` の `newGroupId` を誰も読まない | S〜M | 外すだけなら いいえ |
| F23 | `DFC-2890`（`:767`） | 紹介頁の見本と釦の「256 タスク」などが手写し | M〜L | いいえ |
| F24 | `DFC-2175`（`:567`） | 用語集の JSON 化（A3。数は 7 表・382 行に直す） | L | いいえ |
| F25 | `DFC-2174`・`2540`・`721` | 仕様の側の整合。2174（「行」と「タスクグループ」）は画面の語が変わる | L / M / S | 2174 は **はい → CR** |
| F26 | `DFC-2304`（`:587`） | 帯に入るかを描く側と当たり判定が別々に引く | M | いいえ |
| F27 | `docs/development-records/magic-numbers.md`（25 行すべて `未着手`） | 測った版 `768501a`・対象 68 ファイルが古い（今は 185 ファイル、粗い測り直しで 664 個）。比率 183 は仕様の表に行を足す要がある | 測り直し S、比率 L | 比率は仕様の変更 → CR |
| F28 | 消えた対話欄を指す行: `DFC-562`（実装待ち）・`3005`・`3006`（試験待ち）、実測待ちの `558`・`571`・`1320` | CR-796 の slice 6（`56a753996`）で対話欄は消えた（`git grep` で `src` に 0）。取り下げの候補 | S | いいえ |
| F29 | `defects.md` に残る決着の行 94（実測済 84・取下げ 10） | `fixed-defects.md` への刈り取り待ち | S（機械） | いいえ |
| F30 | 開いた行のうち本文が無いファイルを指す 13 本（`DFC-539`・`1000`・`1131`・`1141`・`1473`・`1468`・`1600`・`2201`・`2223`・`2313`・`487`・`615`・`1606`）、`DFC-1016`・`1020`・`2313` の `tests/usecase/`、`DFC-1024` の旧い試験名、列が 8 つしかない行 4（`DFC-485`・`2186`・`2951`・`3357`） | 古い道と崩れた行の形 | S〜M | いいえ |
| F31 | `pending-decisions.md` の PND-452 | 「spec does not decide」の文が `JDG-973` の後も残る（実装は JDG-78 の後なので注の文だけ） | S | いいえ |

掃除に当たらないもの（作りとして）: `DFC-2560`〜`2569`・`2690`〜`2699`・`2770`・`611`・`560`・`631`・`550`・`567`・`641`・`1063`・`1064`・`582`（仕様の穴の裁定・振る舞い・異常系）。`DFC-1069` と `554` は既に `fixed-defects.md` に在る。`perf-pending.md` の 245 行は測りの借りで掃除ではない。

## 9. 計画の uid と引継書の小物への答え

| 計画 uid | 名 | 棚卸しの答え |
|---|---|---|
| 115 | `edgeOf` の 1 つへの寄せ | C1。写しは別名の `baselineEdgeXOf`。S |
| 116 | `NOT_STORED_DUMMY_SIZES` の生成への置き換え | **前提が違う**（もう生成済み）。本当の仕事は読まれない写しと古い注の始末（C2・E28）。S |
| 117 | `baseChangeCommandOf` の言い直し | C3。複数形が既にあり、仕様の PI-9 が名指す —— 仕様の変更が先。M |
| 118 | `DFC-2646`〜`2648` | 2646 は振る舞いの疑い（F4）、2647 は決着済みで刈り取り（F3）、2648 は L（F5） |
| 196 | 衛生の小物 | `Developer C` はわざと（C7、**利用者の裁定**）。`PlanActualState` の語の 2 組（C8、M）。作業木 234 本（E32、M） |
| 11 | 未検討のトリアージ | 未検討は今 75 本。指名の行（611・2560〜2569・2690〜2699・2770）は掃除ではない |
| 12 | 罠の束 | F6。掃除の型で振る舞いなし。M〜L |
| 13 | 用語集の JSON 化 | A3・F24。数は 7 表・382 行に直す。L |
| 17 | 試験待ち | 試験待ちは 23 本。指名の 550・567・641 は掃除ではない |
| 18 | 仕様待ち | 仕様待ちは 33 本。1070〜1073 は掃除の型（F11、L）、560・631・1063・1064 は違う |
| 20 | 実装待ち | 実装待ちは 35 本。464・532〜537・539・542 は掃除（F7・F8）、559・561・582 は違う、562 は消えた対話欄（F28） |
| 32 | トリアージで出た直し | 11 の後 |
| 77 | 古い STOP 16 | 今は 15（C9・F2） |
| 195 | 紹介・入手・デモの頁の語 | この棚卸しでは仕様の中の 7 か所（A15）だけを見た。頁の語は 195 の持ち場 |

| 引継書の小物 | 答え |
|---|---|
| (1) 中継の版の古い注 | 在る: C4・E15・E16。直すと中継の版が上がる |
| (2) About の版の形 | 在る: C5。CSP のハッシュを作り直す道具が無い（E29） |
| (3) CR-822 の道具が 09 に無い | 在る: `tools/check_versions.mjs`（E1）、仲間 6 本も（E2） |
| (4) 「変更履歴 4.96」 | **済み**（F1） |
| (5) `dist` の旧名 | **済み**（C6・F1） |
| (6) 用語集の JSON 化・頁の語 | A3・計画 195 |
| (7) `JDG-2945` は予約済み | 掃除の仕事は無い |

## 10. 第 2 波の分け方の案

### 決まり（どの子セッションにも同じ）

- 触るファイルの集合が重ならないように、持ち場ごとに「触ってよいファイル」を下に書いた。集合の外は触らない。
- 台帳（`defects.md`・`fixed-defects.md`・`pending-decisions.md`・`rulings.md`・`handoff.md`・`magic-numbers.md`）を書くのは 1 つの持ち場（W5）だけ。ほかの持ち場は台帳の提案を報告に書く。
- 基準線のファイル（`.claude/skills/spec-graph-check/*baseline*`）は、その数を動かした持ち場が同じコミットで直す。G1〜G3 を下げるだけの仕事は調整役が最後に 1 回で行う。
- 振る舞いが変わるもの（11 節）は第 2 波に入れない。

### 持ち場

| 持ち場 | 触ってよいファイル | 入れる行 | 見込み | 依存 |
|---|---|---|---|---|
| W1 仕様と `_source`・`_assets` | `docs/spec/**`（`_source/*.json`・`*.py`・`_assets/*`）、`docs/guides/schedule-to-grs-json/prompt-*.md` | A1・A2/B2・A4・A6・A7・A8（数だけ）・A9・A11・A12・A13・A14・A15・A18・A19・A20・B1・B3・B4・B6・B7・B11・B16、C3 の仕様の側（PI-9 の名） | M（半日〜1 日）。B6 は M 単独 | なし。C3 の `src` 側は W2 の後半 |
| W2 コード | `src/**`、`vite.relay.config.ts`、`tools/relay_version.mjs`・`stamp_download_page.mjs`・`build_relay_bundle.mjs`・`artifact-versions.json`・`generate_entity_types.py`、`dist/`（作り直しだけ）、`tests/contract/cr-755-…`（C3 の試験） | C1・C2・C4・E15・E16（`pages.yml` を除く）・E28・C9（古い 15 か所）・C10・C15、C3（W1 の後）、C11 は確かめた分だけ | M〜L（1 日）。中継の bump を 1 回、GT-2 が要る | C3 は W1 の後。台帳への反映は W5 |
| W3 試験 | `tests/**`（`tests/contract/cr-755-…` を除く）、`vitest.config.ts`、`playwright.config.ts`、`comment-rules-tests-baseline.txt` | D3（裁定済みの 2 件）・D6・D9・D10（確かめた 1 件と読んだ分）・D11・D12・D13・D16 の試験側・D17・D18・D19・D21、G2 | M（半日〜1 日） | D1・D7（known-red と時間切れを外す）は調整役の GT-2 の後 |
| W4 道具と目録 | `tools/**`（W2 の 5 本を除く）、`.claude/skills/**`（基準線は G 行の決まりどおり）、`.claude/workflows/**`、`docs/development-rules/09-tools.md`、`package.json`、`.github/workflows/pages.yml`（注だけ）、`docs/about/index.html` | E1〜E7・E11〜E14・E17（注だけ）・E19・E24・E25・E27・B8/E30・B9・C5・E29 | M（半日〜1 日） | なし |
| W5 台帳と記録 | `docs/development-records/*.md`（台帳と引継書） | F1・F2（W2 の後）・F3・F14・F19 の注・F21 の台帳側・F28・F29・F30・F31・F27 の測り直し、D1 の「5 行」・D16、C20 の突き合わせ | M | F2 は W2 の後。最後に回す |

順: W1・W3・W4 は同時に始めてよい（集合が重ならない）。W2 も同時に始めてよいが、C3 だけは W1 が着いた後。W5 は W2 が着いた後。最後に調整役が G1・G3 を下げ、GT-2 で D1・D7 を外す。

### 第 2 波に入れない大きなもの（後の波で 1 つずつ。各々に 1 つの子セッション）

| 仕事 | 行 | 大きさ | 理由 |
|---|---|---|---|
| 用語集の JSON 化 | A3・F24（計画 13） | L | `_source` に生成器と検査が増え W1 とぶつかる |
| `src` の写しの畳み込み | C14・G13・F11・F12・F17 | L | `frame-loop.ts`・`input-command-translator.ts` が W2 と重なる。W2 の後 |
| 長い関数とファイルを割る | C19・F13 | L | 設計の判断（07 R2） |
| 罠の束と型の締め | F6・F7 | M〜L | 計画 12・20。`src` と道具の両方 |
| 試験の補助の写しの共通化 | D14・D15 | L | `tests/**` の広い範囲。W3 の後に 1 人で |
| 道具の補助の写しの共通化 | B6 以外の E20〜E22 | L | 共通の部品の置き場の設計 |
| 一回限りの台本の始末 | E8・E31 | M | 捨てるか残すかの判断 |
| 書き出しの絞り | C11〜C13 | M | 字の検索の疑いを 1 つずつ確かめる |
| 試験の時間切れの理由づけ | D8 | M | 304 か所。理由を書くか全体の設定にするか |
| 作業木の掃除 | E32 | M | 機械の状態。調整役が手順で行う |

## 11. 振る舞いが変わるので CR（または利用者の裁定）に回すもの

| 行 | 何 | 回し先 |
|---|---|---|
| A10・B5 | 🔎 の既定値 180 行と RC 行の選び直し | CR |
| C7 | 見本の `Developer C` の重なり（AS-8 のためのわざと）—— 計画 196 から外すのを推す | 利用者の裁定 |
| E17 | `pages.yml` の起動を戻すか | 利用者の裁定 |
| E18 | `push_guard.py` の `refactor` の橋を外す | 調整役の許し（守りの道具） |
| F4 | `DFC-2646` の食い違う写しを畳む | CR の候補 |
| F9 | `DFC-630` の比べ方を揃える（境目で答えが変わる疑い） | CR の候補 |
| F10 | `DFC-1066` の uid の最高水位 | CR |
| F25 | `DFC-2174` 「行」と「タスクグループ」 | CR |
| F27 | 比率のマジックナンバーを仕様の表へ | CR |
| B10 | 公開スキーマ 2 本の `$id` を揃えるなら | CR |
| C4・E15・E16 | 注の直しだけでも中継の版と `.mcpb` のバイトが動く | 振る舞いは変わらないが、版の動きを調整役が決める |
