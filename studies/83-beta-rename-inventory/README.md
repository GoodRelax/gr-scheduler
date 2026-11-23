# 決まった名と今の仕様・コードの差 —— 前の名の一覧（計画の 455「差分抽出」）

2026-11-24、SUB「差分抽出」が作った。β の名（GRS JSON は `JDG-3566`〜`JDG-3807`、文書の命令と Agent API は `JDG-3771`〜`JDG-3785`、画面の名は裁定）で引退する **前の名** を、仕様の原稿・仕様の本文・src・tests・用語集で数えた一覧である。改名の手順（`studies/82-anms-ndd-apply-plan/README.md` の A9、NDD 付録 A.2）の「前の名で全部のファイルを検索する」に当たる。**この席は何も直していない。** 直すのは CR-851（GRS JSON と Agent API の原稿）、CR-855（仕様の文とコードの名）、CR-856（振る舞いが変わる物）である。

## 置き場

| ファイル | 中身 |
|---|---|
| [`renames.tsv`](renames.tsv) | 前の名 1 つと新しい名 1 つの組ごとに 1 行（350 行、`RN-001`〜`RN-350`）。列は下の表 |
| [`occurrences.tsv`](occurrences.tsv) | 前の名 × ファイルごとに 1 行（16,621 行）。当たった数と行番号 |
| [`beta-keys-without-old-name.txt`](beta-keys-without-old-name.txt) | 前の名を持たない β のキー（β で足したキー）64 個 |
| [`extract_renames.py`](extract_renames.py) | 3 つを作るスクリプト。手で直さず、スクリプトを直して作り直す |

作り直し（リポジトリの根で）: `python studies/83-beta-rename-inventory/extract_renames.py`（約 10 秒）。

`renames.tsv` の列:

| 列 | 意味 |
|---|---|
| `area` | `GRS JSON`・`document command`・`Agent API`・`screen word` |
| `kind` | `type`（型）・`key`（キー）・`value`（値）・`command`（命令）・`command field`（命令の欄）・`member`（Agent API の道具や答えの欄）・`member field`・`screen label`（画面の札）・`code name`（コードの名） |
| `old` → `new` | 前の名 → 新しい名。`(removed)` は消える名。画面の名は検索の正規表現をそのまま置いた |
| `cr` | 当てる CR |
| `jdg` | 拠り所の裁定 |
| `source`〜`glossary` | 場所ごとの当たりの数（下の「数え方」の `pattern`） |
| `total` / `key_total` / `files` | 当たりの合計 / キーの形の当たりの合計（汎用語と値だけ） / 当たったファイルの数 |
| `check` | `CHECK`（要確認）、同じ字面の前の名が何行にあるか、当たり 0 |
| `note` / `context` | 注 / どのキー・命令の中か（β の道 `<-` α の道、方針の表の問の番号） |
| `pattern` / `key_pattern` | 数えた正規表現 |

## 数

| 群 | 行 | 前の名（字面の数） | 種類の内訳 | 当てる CR |
|---|---:|---:|---|---|
| GRS JSON | 122 | 117 | 型 8・キー 96・値 18 | CR-851 |
| 文書の命令 | 100 | 100 | 命令 68・欄 29・型 1・値 2 | CR-851 |
| Agent API | 81 | 80 | 型 23・道具 7・欄 22・値 29 | CR-851 |
| 画面の名 | 47 | 47 | 札 46・コードの名 1 | CR-855（`Document Title` は CR-856 も） |
| 計 | 350 | 335 | | |

同じ字面が 2 つの群にまたがる名がある（`schemaVersion`・`changeLog`・`parentId` など）ので、群の和 344 は字面の数 335 より多い。

出る場所（同じ字面と同じ式は 1 度だけ数えた）:

| 前の名の種類 | 式の数 | 原稿 `_source` | 本文 `docs/spec` | src | tests | 用語集 | 計 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 汎用語でない名 | 256 | 2,874 | 3,450 | 17,967 | 25,979 | 523 | **50,793** |
| 汎用語（1 語の小文字）と値 | 80 | 9,748 | 4,162 | 25,132 | 83,710 | 1,436 | 124,188（キーの形・引用符つきだけなら **50,387**） |

- 当たり 0 の行は 8。7 行は下書き（2026-10-25 の `doc-shape-map`・`commands-map`）にだけある名で、今の原稿・コードには無い（α の名は別の行にある。例: `taskStackDirection` は `stackDirection` の行 `RN-086`）。残る 1 行は画面の語「操作点」（引き渡しの時も 0）。当てる物は無い。
- src と tests の当たりが多いのは、GRS JSON を読み書きするコードと見本が前のキーで書いてあるためである（`carry` は src 2,698・tests 3,151、`fadeInDays` は src 1,051・tests 1,255）。

## 数え方

- 検索する所は `git ls-files` の中だけ: 原稿 `docs/spec/_source/**`、本文 `docs/spec/*.md` と `docs/spec/_assets/*.md`、`src/**`、`tests/**`、用語集 `studies/76-grs-json-beta-shape/terms/glossary-draft/glossary.json`。図の `.svg`・`dist`・`studies` のほかの所・台帳・CR は数えていない（履歴なので）。
- 英字の名: 大文字小文字を区別し、前後に識別子の字が付かない所だけ —— `(?<![A-Za-z0-9_$])NAME(?![A-Za-z0-9_$])`。だから `changeLog` は `changeLogEntries` に当たらない。
- 汎用語（`order`・`which`・`name`・`id` など、1 語の小文字）は文や別のコードにも当たるので、キーの形の式も数えた —— `["'`]NAME["'`]|\.NAME(?![A-Za-z0-9_$])|(?<![A-Za-z0-9_$.])NAME\??\s*:`。`occurrences.tsv` はこちらで書く。
- 値: 引用符で囲んだ形だけをキーの形として数えた —— `["'`]VALUE["'`]`。数の値（表示の倍率 50〜200 → 0.5〜2）は名でないので行を立てず、キーの行 `displayScale`（`RN-025`）の注に書いた。`UTC+09:00` → `+09:00` の 25 個は 1 行の正規表現 `UTC[+-][0-9]{2}:[0-9]{2}`（`RN-122`）にまとめた。
- 画面の語: `terms/6-cr855-handoff.md` 2 節の式（`(?!ー)` で伸ばさない形だけ、`・` は「どれか」）をそのまま使った。引き渡しの数（2026-10-27）と、本文の数はほぼ同じだった（札 128・操作子 166・進捗マーカー 155 は同じ。フィルタ 261・ポインタ 263 も同じ）。
- 1 つの字面は、場所の中の当たりを全部数えた。別の意味の当たりも混ざる（「札」の別の意味、`name` の別の物）。**直すときは `context` の物だけを 1 つずつ読むこと**。とくに、ある命令の中だけで名が変わる欄（`taskUids` → `missingTaskUids` は断りの欄だけ。`readDocument.taskUids` は今のまま）は、数が上限である。

## 前の名 → 新しい名の対応の作り方

| 群 | 元 | つなぎ方 |
|---|---|---|
| GRS JSON のキー | `terms/grs-json-beta-schema-sources.tsv`（β のキーごとの拠り所）と `doc-shape-map.tsv`（α → 下書き） | β のキーの `dsm:` を下書きの道として `doc-shape-map` で α の道へ戻し、`alpha:` はそのまま使う。α の最後のキーの名と β のキーの名が違えば 1 行。表で届かない 9 個（`carry`・`taskVisuals` ほか）は、拠り所の文と裁定を読んで `KEY_EXTRA` に手で書いた |
| GRS JSON の値 | 同じ組のキーの `enum` | α にあって β に無い値。消えた数と足した数が同じなら位置で組み、`grs-json-final-review-tree.md` と読み合わせた。組めない値は `VALUE_OVERRIDES` に手で書いた（`endpointSpan` → `dumbbell` は `JDG-3711`） |
| GRS JSON の型 | `grs-json-beta-schema-sources.tsv` の末尾の (a)「型の名」 | `TYPE_RENAMES` に手で書いた 8 個 |
| 文書の命令 | `commands-map.tsv`（α → 下書き）と `terms/agent-api-names-by-policy-draft.md`（下書き → 確定、`JDG-3781`） | 2 つをつないだ。`setTaskPlanActualState` → `placeTaskPlanActual` → `setTaskProgressStatus` のように 2 段で変わる名もある。`set*` を `edit*` にまとめる命令（`commands-map` の edit-fold）も 1 行ずつ置いた。`edit*.set.*` の欄は GRS JSON のキーと同じ名なので、GRS JSON の行に従う |
| Agent API | 方針の表の BGQA5 の節と、表の外の名（`readDelayDiagnostics` → `readDelayDiagnosis` ほか、`JDG-3512`） | 表の「今の名」→「方針で選ぶ名」。「今のまま」の行は除いた。新しい道具 `closePropertiesPanel` は前の名が無いので入れていない |
| 画面の名 | `terms/6-cr855-handoff.md` 2 節（`JDG-3351`〜`JDG-3379`）と `JDG-3512`（Delay Diagnostics → Delay Diagnosis） | 表の行をそのまま。`JDG-3512` は札と、コードの名（`[Dd]elayDiagnostics` で始まる識別子）の 2 行 |

## 要確認 —— 片づけた 2 件と、残る 2 件（行 5）

1 回目（06615b267）で 4 件を BOSS に知らせた。5 代目 BOSS の読みを受けて、①② は根拠を書いて閉じ、③④ は案を書いた。

### 閉じた物

1. **`CarryElement` → `MspdiElement`（`RN-002`）**: この組を名指しした裁定は無いが、形は `JDG-3606`（MSPDI の構造と要素の名のまま、`ordinal` を持たず、繰り返せる要素はいつも配列）と `JDG-3613`（`mspdiElement`）で決まっていて、凍結したスキーマ（`JDG-3807`）の `$defs/MspdiElement` がその型である。オーナーに問う物は無い。
2. **`carryElements` の行き先（`RN-018`）**: 1 回目は「β の 4 つの配列だけ」と読んだが誤りだった。凍結したスキーマでは 8 つの実体すべて（Project・Calendar・WeekDay・Exception・Task・PredecessorLink・Resource・Assignment）に `grs.passthrough` があり（`JDG-3606`・`JDG-3748`）、実体の中の知らない子要素はその実体の `grs.passthrough` へ行く。だから `carry`（`RN-017`）と `carryElements` はどちらも `passthrough` になる。`scheduleData.passthroughCalendars`・`passthroughTasks`・`passthroughResources`・`passthroughAssignments`（`JDG-3613`・`JDG-3750`）は、GRS が行にしない一覧の要素まるごとで、別物である。

### 残る物（決めるのは BOSS とオーナー）

3. **`treeState` → `showMode` を当てる CR（`RN-105`・`RN-106`・`RN-109`・`RN-120`）**: 前の値から新しい値への読み替えは作らない（発売前は旧い形を変換しない）。値は 1 対 1 でなくてよく、新しいふるまい（`JDG-3662`〜`JDG-3685`）で `shown`・`hidden`・`automatic`・`hiddenUntilZoomIn` を当てる。
   - **案: CR-851。** 理由: `JDG-3662`〜`JDG-3685` の 24 行すべてが、当ての欄で「`CR-851` が当てる」と書く（`rulings.md` の各行の右から 2 つ目の欄を数えた。`CR-856` と書く行は 0）。その中には、元に戻す規則（`JDG-3670`）や祖先を優先して描く規則（`JDG-3673`）のようなふるまいの行も入る。`CR-856` は CR の本文がまだ無い。裁定の当ての欄から読むと、`CR-856` は用語の裁定から出た画面のふるまい（プロパティパネルでプロジェクトの名を直す `JDG-3355`、休日設定をツールウィンドウにする `JDG-3356` など）を受け持つ。
   - **知らせ（食い違いの疑い）**: `CR-851` の 4.1 節には、まだ α → β の変換の HTML（`docs/download/grs-json-alpha-to-beta-converter.html`、`JDG-3306`・`JDG-3307`）がある。写し替えの規則は「3 つの表の『今 → 新』の列そのもの」と書いてある。「読み替えを作らない」がアプリだけの話ならこの節と両立する。変換の HTML も作らないなら、4.1 節と `JDG-3306`・`JDG-3307` を覆す裁定が要る。変換の HTML を残すなら、`treeState` の 4 つの値の写し方をそこで決める必要がある。
4. **`AgentRefusalReason` の新しい名（`RN-230`）**: 方針の表（`agent-api-names-by-policy-draft.md`）、外の AI のレビュー（`agent-api-names-ai-c-review.md`）、Agent API の名の席 1・2 の作業の枝（2026-11-24 の先端）のどこにも名が無い。方針の表は「P-5 で頭の `Agent` を外す。名は問いに無い」とだけ書く。
   - **案: `RefusalReason`。** P-5 で呼ぶ側の頭 `Agent` を外し、P-9（欄の型は欄の名を PascalCase にした物）で親の型 `Refusal` の欄 `reason` から作る。退けた案: `Reason`（短すぎて `readSchema` で引けない。`Column` を退けて `TableColumn` にしたのと同じ N-2）、`AgentRefusalReason` のまま（P-5 に反する）。オーナーへは BOSS が GQA でまとめて問う。
   - 近くの名: 原稿の `CodecRefusalReason` も、外の AI のレビューが「`JDG-3285` の後の名が無い」と挙げている。頭が `Agent` でないので、この一覧の行には入れていない。

## この一覧が覆わない物

- 名が同じで置き場だけ変わるキー（例: `taskGroupId` が `tasks[].grs.` の下へ）。形の差は CR-851 の関門 `terms/compare_schemas.py` が見る（今は差 1,701 行）。
- 画面の語のうち、用語集の残り 834 語のレビュー（計画の B3、CR-857）で後から決まる名。決まったら改名の手順で、この一覧に行を足して数え直す。
- 前の名から作ったコードの合成語（`changeLog` を頭に持つ長い識別子など）。字面が丸ごと一致する所だけ数えた（`delayDiagnostics` だけは頭の一致で 1 行を立てた）。合成語は CR-855 が名ごとに探す。
- 当てた後に前の名が 0 件になったかの確かめ（A9 の 3 つ目）。当てた CR が、このスクリプトを回し直して確かめる。
