# CR-855 —— 仕様の文とコードの名を、名の辞書の決まった名にそろえる

> 起草の状態: 起草と、道具で当てる表の用意まで（2026-11-27、develop `e053fb30a`）。仕様のファイル（`docs/spec/`）は、B9（仕様のファイルの分割）が develop に入るまで触らない（BOSS の順番の決まり）。コードの識別子（6 節）は `CR-851` が develop に入った後に当てる。
> ID の帯: BOSS から番号 `CR-855`、裁定 `JDG-3996`〜`JDG-4005`、台帳 `DFC-3661`〜`DFC-3665` を受けた。本書はまだどれも使っていない。
> 当てるもの: `JDG-3351`〜`JDG-3379`（用語の裁定 1 枚目と 2 枚目、`studies/76-grs-json-beta-shape/terms/6-cr855-handoff.md`）、`JDG-3512`（Delay Diagnosis）、`JDG-3742`（Progress Status Mark）、`CR-857` から回った `JDG-3463`・`JDG-3469`・`JDG-3486`（付録 A の「`CR-855`」の行）。`JDG-3470` は仕様の 1 章の当てへ回した（5.4 節）。
> 一覧: 前の名と新しい名の組は `studies/83-beta-rename-inventory/renames.tsv` の `CR-855` の行（`RN-304`〜`RN-350`）である。本書は行の番号でそれを指し、名を写し直さない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`e053fb30a`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| 名の辞書 `glossary.json` は決まった名をもう持っている（`CR-857`） | 持っている。`helpWindow` は `Help Window`、`taskGroupLanes` は `Task Group Lanes`。ただし前の名を `renames[]` に持つのは `CR-857`・`CR-855` の版の 67 件だけで、study 83 の画面の語 47 行の前の名は 1 つも無い | 前の名を `renames[]` に記録する（改名の手順 2、規則 02 の 2.6）。道具が「辞書がもう新しい名を持つ札」に前の名を書けるようにした（4.1 節） |
| `tools/apply_glossary_renames.py` の `apply` で仕様の文は直る | 区切られた名（`` `...` ``・引用符・鉤括弧・表の升）だけを直す。表記の改め（ポインタ → ポインター）と文の中に立つ名は数えて並べるだけ | 文の中の語は別の道具で直す（4.2 節）。ほかの意味を持つ語は 1 か所ずつ読む |
| study 83 の新しい名がそのまま当てる名である | 2 つは後の裁定で変わった: `Progress Marker` → `Progress Mark`（`JDG-3372`）は `Progress Status Mark` に（`JDG-3742`）、進捗マーカー → 進捗ステータスマーク | 辞書の今の札を新しい名とした（辞書が後の裁定を持つ） |
| 「単一 HTML」は全部「GRS HTML」になる（`RN-337`） | 「単一 HTML」は 2 つの物の名である。ファイルの形式（`IO-7`、`singleHtmlFormat`）は GRS HTML（`JDG-3353`、2026-10-27）。価値の語（`singleHtml`）は後の `JDG-3467`（2026-10-29）が「単一 HTML」のままにした | 形式の意味の所だけを GRS HTML にする（5.2 節）。1 か所ずつ読む |
| コードの名は画面の語と一緒に直せる | 識別子は約 250 名・4,000 か所（6 節）。いま `CR-851` の席が src の GRS JSON と Agent API の名を改めている | コードは `CR-851` が develop に入った後に、道具で一度に当てる（3 節の段 C） |

### 0.2 裁定の鎖（`rulings.md` を「CR-855」「改名」で引き、似た名を `grep` した）

- 「`CR-855` の席」と書く裁定は 27 行（`JDG-3351`〜`JDG-3379` と `JDG-3821`）。`JDG-3362` だけは当ての欄が `CR-851` を名指すが、`CR-851` の本書は `Canvas Overlays` を 1 度も書かない —— 用語集の行を消すのは名の仕事なので本書が当てる（5.1 節）。
- 覆った裁定: `JDG-3372` の Progress Mark は `JDG-3742` が Progress Status Mark に、`JDG-3463` の「後追い終了」は `JDG-3486` が「後追終了」に、`JDG-3353` の「単一 HTML」は価値の語の意味だけ `JDG-3467` が残した。
- 画面の語は行 ID で引く（`JDG-3836`・`JDG-3837`、規則 03 の 1 節）。だから画面の語の改名は原稿 `display-words.json` と仕様の文と試験だけで済み、コードの変更は要らない。コードの名（6 節）は別の仕事である。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-` も `GL-` も直には進めない。β（2026-11-30）の前に、画面・仕様・コードが同じ物を同じ名で呼ぶようにする基盤の仕事である（`GL-006` の「読む人が迷わない」の土台。名が 2 つあると、読む者は別の物かと考えなければならない —— 規則 03 の 1 節）。

### ② レビュー観点のどの条項を当て、何が出たか

- `07-review-standards.md` の付録 A.2「改名の手順」: 前の名を全部のファイルで数える（2 節）、辞書に履歴を残す（4.1 節）、後で前の名が記録の外に 0 件であることを確かめる（7 節）。
- `R2`「互換性とバージョン」: 外に出す名（GRS JSON・Agent API・文書の命令）は改めない —— `CR-851` の物と凍結した物（`JDG-3807`）を 1.2 節で分けた。
- `OKPN`・`OMPV`（データの要素）: 本書は `settings.json` の鍵 `shapeHeightOf.endpointSpan`（`S-16`）を改めない。その鍵はタスクの形の値で引かれる（`settings.shapeHeightOf[shapeKind]`）ので、値の改名（`endpointSpan` → `dumbbell`、`CR-851`）と同じ巡で改める（5.3 節）。足すデータの要素も変える型も無い。
- `R2` の DRY（公開面）（補助を書く前に公開の入口を探す）: 文の語を直す道具は新しく書かず、既にある `apply_glossary_renames.py` の読む範囲と書き方を `import` して使った（4.2 節）。コードは `tools/rename/cr792_rename.py` を表の場所を受け取れるようにして使う（4.3 節）。

### ③ 持ち主に**問わずに決めた**こと（**覆してよい**）

| 決めたこと | 理由 |
|---|---|
| 依存のヒント 4 つの日本語を「`{abbreviation}`（終了 → 開始、直列作業）」の形にする（`JDG-3463`・`JDG-3486`） | 裁定は「別名を書き、完了を終了にそろえる」とだけ言う。書き方は既存の括弧の中に読点で足すのが最も小さい |
| 「全体を収める」「写し」「札」「つまみ」「段目」「日程表」「操作子」は 1 か所ずつ読む | ほかの意味がある（「写し」は生成した写し、「札」はボタンの名、「段目」は表の段） |
| `本ソフトウェア`・`本ツール`・`本製品` を `` `GRS` `` にし、日本語の字と接する側に空白を入れる | 仕様は `` `GRS` は、`` と書く（`` `GRS` `` は `01-04-requirements.md` だけで 2,603 か所） |
| `shapeHeightOf.endpointSpan` の改名は `CR-851` と同じ巡にする（5.3 節） | 値で引く鍵なので、片方だけ改めると形の高さが引けなくなる |
| 凍結した契約の原稿の説明の文に残る前の語は直さない（1.2 節） | `JDG-3807`。持ち主の件として BOSS に渡す |
| コードの識別子は `CR-851` の後に当てる | 同じファイルを 2 つの席が同時に書くと、合流で片方の改めが落ちる（[`parallel-agents-ja.md`](../docs/development-rules/parallel-agents-ja.md)） |

### ④ 持ち主に問うこと

- 1.2 節の凍結した原稿の説明の文に残る前の語 10 行は持ち主の件である。BOSS が BGQA の問 24（Delay Diagnostics と date の 2 種類を問うている）に足す（BOSS、2026-11-27）。
- BOSS に問うて答えを受けたこと（2026-11-27）: `JDG-3470` は本書で当てない（5.4 節）。コードの識別子は `CR-851` が develop に入った後に道具で当てる（3 節の段 C）。`S-16` の改名は `CR-851` の席へ渡す（5.3 節。BOSS が `CR-851` に伝える）。

---

## 1. 範囲

### 1.1 本書が当てる物

| 群 | study 83 の行 | 道 | 節 |
|---|---|---|---|
| 辞書の札の前の名（英語 16・日本語 11） | `RN-304`・`RN-306`・`RN-307`・`RN-309`・`RN-310`・`RN-312`〜`RN-325`・`RN-327`・`RN-329`・`RN-332`（一部）・`RN-335`・`RN-338`・`RN-339`・`RN-344`・`RN-348`・`RN-349` | `apply_glossary_renames.py record` と `apply` | 4.1 |
| 文の中の表記と、ほかの意味を持たない名 | `RN-330`・`RN-331`・`RN-333`・`RN-342`・`RN-345` と上の行の文の中の当たり | `tools/rename/cr855_words.py`（モード `all`） | 4.2 |
| 1 か所ずつ読む語 | `RN-305`・`RN-311`・`RN-324`・`RN-326`・`RN-328`・`RN-334`・`RN-336`・`RN-337`・`RN-340`・`RN-343`・`RN-346`・`RN-347` | 同じ道具の `--list` が並べ、人（子の席）が読んで直す | 4.2 |
| 仕様の変更 3 つ | `RN-308`（Canvas Overlays を消す）・`RN-337` の形式の意味（`IO-7` → GRS HTML）・`shapeHeightOf.endpointSpan` | 手で、行 ID で | 5 |
| `CR-857` から回った語 | `JDG-3463`・`JDG-3486`（依存のヒント）、`JDG-3469`（`projectedFinish` → `estimatedFinish`、見込み終了 → 終了見込み） | 手で | 5.5 |
| コードの識別子 | `RN-350` と、改めた画面の名から作った識別子 | `tools/rename/cr792_rename.py --map` | 6 |

`RN-341`（操作点）は当たり 0 で、当てる物は無い。

### 1.2 本書が当てない物

| 物 | 行き先 | 理由 |
|---|---|---|
| GRS JSON のキー・値・型、文書の命令、Agent API の名（study 83 の `CR-851` の 303 行） | `CR-851` | `JDG-3349`・`JDG-3807` |
| `shapeHeightOf.endpointSpan` → `shapeHeightOf.dumbbell`（`S-16`、`K-16` の英語） | `CR-851`（値の改名と同じ巡） | 5.3 節 |
| 凍結した契約の原稿（`grs-document.schema.json`・`grs-commands.schema.json`・`agent-api-members.json`・`document-commands.json`）の説明の文に残る前の語 | 持ち主（BOSS が BGQA の問 24 に足す） | `JDG-3807`。数は下の表 |
| `isProgressMarkerVisible`・`isDependencyLineVisible`・`readDelayDiagnostics`・`runDelayDiagnostics` | `CR-851` | GRS JSON のキーと Agent API の道具の名 |
| 仮の名（辞書の `xProvisional`） | —— | 当てない。`e053fb30a` の辞書には 0 件 |
| `JDG-3470`（目標 `GL-010` と課題 `CH-8` を足し、表 T-054・表 T-106・about のページを改める） | 仕様の 1 章の当て（BOSS が席へ回す） | 1 章は B5 の下書きを持ち主が BGQA10 で見ている最中なので、その当てと一緒にする（BOSS、2026-11-27） |
| ふるまいが変わる裁定（`JDG-3355` のプロジェクト名をプロパティパネルで直す、`JDG-3356` の休日設定をツールウィンドウにする） | `CR-856` | 名の改めだけにする |

凍結した原稿に残る前の語（`e053fb30a`、study 83 の式で数えた）:

| 行 | 前の語 | `grs-document` | `grs-commands` | `agent-api-members` | `document-commands` |
|---|---|---:|---:|---:|---:|
| `RN-305` | chart | 2 | 2 | 0 | 0 |
| `RN-310` | Delay Diagnostics | 1 | 1 | 12 | 0 |
| `RN-321` | Search Panel | 0 | 0 | 6 | 0 |
| `RN-330` | フィルタ | 0 | 0 | 11 | 2 |
| `RN-332` | 文書の設定ほか | 0 | 0 | 1 | 0 |
| `RN-336` | 写し | 0 | 0 | 0 | 2 |
| `RN-342` | 日程データ | 0 | 0 | 6 | 1 |
| `RN-343` | 日程表 | 0 | 0 | 2 | 0 |
| `RN-349` | 進捗マーカー | 0 | 0 | 2 | 0 |
| `RN-350` | `delayDiagnostics`（識別子） | 2 | 2 | 24 | 2 |

---

## 2. 数の予測（`e053fb30a` で測った。B9 の後に測り直す）

### 2.1 前の名の当たり（study 83 の式、`CR-855` の行）

数え方は 9 節。場所: 仕様の手書きの `.md`（spec）、生成した `.md`（gen、`npm run gen` が追う）、原稿 `_source`（凍結した 4 本と辞書を除く）、凍結した 4 本と辞書（frozen）、試験、src。

| 行 | 前の名 | spec | gen | 原稿 | frozen | 試験 | src |
|---|---|---:|---:|---:|---:|---:|---:|
| `RN-304` | 2 連カーソル | 2 | 0 | 0 | 0 | 2 | 0 |
| `RN-305` | chart | 1 | 0 | 4 | 11 | 10 | 16 |
| `RN-306` | Actual Operation Dummy | 1 | 1 | 1 | 0 | 8 | 0 |
| `RN-307` | Callout | 0 | 0 | 2 | 4 | 0 | 2 |
| `RN-308` | Canvas Overlays | 2 | 1 | 0 | 3 | 1 | 0 |
| `RN-309` | Comment Boxes | 0 | 2 | 2 | 2 | 0 | 0 |
| `RN-310` | Delay Diagnostics | 7 | 27 | 16 | 16 | 33 | 54 |
| `RN-311` | Dependency Lines | 1 | 2 | 5 | 4 | 1 | 3 |
| `RN-312` | Document Title | 37 | 14 | 14 | 0 | 94 | 4 |
| `RN-313` | Export Chooser | 2 | 4 | 4 | 0 | 65 | 4 |
| `RN-314` | Grab Region | 1 | 1 | 1 | 0 | 0 | 0 |
| `RN-315` | Help Modal | 6 | 8 | 3 | 0 | 60 | 14 |
| `RN-316` | Jump Landing Related Ring | 0 | 0 | 0 | 0 | 1 | 1 |
| `RN-317` | Jump Landing Ripple | 0 | 0 | 0 | 0 | 3 | 1 |
| `RN-318` | Open Chooser | 9 | 7 | 4 | 0 | 69 | 7 |
| `RN-319` | Progress Marker | 0 | 0 | 3 | 2 | 1 | 1 |
| `RN-320` | Resume Icon | 1 | 1 | 2 | 2 | 0 | 1 |
| `RN-321` | Search Panel | 8 | 21 | 12 | 6 | 105 | 31 |
| `RN-322` | Task Group Area | 88 | 24 | 24 | 0 | 290 | 8 |
| `RN-323` | Task Group Drop Line | 0 | 0 | 0 | 0 | 6 | 1 |
| `RN-324` | Task Group Expander | 2 | 1 | 1 | 0 | 15 | 1 |
| `RN-325` | Task Group Grab Copy | 0 | 0 | 0 | 0 | 8 | 1 |
| `RN-326` | Task Group Grab Cues | 0 | 0 | 0 | 0 | 1 | 1 |
| `RN-327` | Task Group Pin | 4 | 1 | 1 | 0 | 17 | 1 |
| `RN-328` | つまみ | 14 | 3 | 3 | 3 | 5 | 0 |
| `RN-329` | タスクグループ見出しツリー | 0 | 1 | 1 | 0 | 0 | 0 |
| `RN-330` | フィルタ | 112 | 65 | 58 | 40 | 124 | 8 |
| `RN-331` | ブラウザ | 147 | 20 | 30 | 2 | 80 | 11 |
| `RN-332` | 文書の設定ほか | 56 | 39 | 40 | 8 | 50 | 3 |
| `RN-333` | ポインタ | 249 | 37 | 38 | 0 | 228 | 1 |
| `RN-334` | 全体を収める | 11 | 0 | 0 | 4 | 2 | 0 |
| `RN-335` | 再開アイコン | 88 | 14 | 20 | 1 | 20 | 6 |
| `RN-336` | 写し | 34 | 10 | 8 | 18 | 21 | 0 |
| `RN-337` | 単一 HTML | 8 | 1 | 2 | 4 | 2 | 1 |
| `RN-338` | 実績のダミーほか | 10 | 8 | 8 | 0 | 2 | 0 |
| `RN-339` | 掴み帯 | 37 | 7 | 7 | 1 | 34 | 2 |
| `RN-340` | 操作子 | 206 | 27 | 27 | 0 | 220 | 0 |
| `RN-342` | 日程データ | 72 | 24 | 17 | 8 | 37 | 0 |
| `RN-343` | 日程表 | 120 | 28 | 35 | 17 | 58 | 14 |
| `RN-344` | 期限の印 | 36 | 9 | 9 | 0 | 16 | 0 |
| `RN-345` | 本ソフトウェアほか | 39 | 7 | 7 | 0 | 16 | 0 |
| `RN-346` | 札 | 135 | 32 | 33 | 0 | 20 | 2 |
| `RN-347` | 段目ほか | 51 | 9 | 11 | 1 | 18 | 2 |
| `RN-348` | 続きの印 | 58 | 9 | 9 | 0 | 37 | 0 |
| `RN-349` | 進捗マーカー | 133 | 38 | 38 | 5 | 64 | 3 |
| `RN-350` | `delayDiagnostics`（識別子） | 7 | 43 | 23 | 46 | 503 | 437 |

⚠️ src の当たりの多くは `npm run gen` が刷る写し（`src/adapter/screen-renderer/display-words.json` ほか）である。src を手で直すのは 6 節のコードの名だけ。

### 2.2 道具ごとの予測（空走り、`e053fb30a`）

| 道 | 予測 |
|---|---|
| `apply_glossary_renames.py record docs/review/cr-855-record.tsv` | 27 件を記録（英語 16・日本語 11）。`delayDiagnosis` は契約の群の語なので道具が断る —— 画面の語は 4.2 節の `W-28` で直す |
| 記録の後の `apply` | 区切られた前の名 580 か所・129 ファイル。文の中の当たり 913 は 4.2 節が直す |
| `cr855_words.py --apply`（モード `all` の 36 行、`docs/review/cr-855-words.tsv`） | 3,065 か所・327 ファイル（先に `apply` を回せば、区切られた所の分だけ減る） |
| `cr855_words.py --list`（モード `read` の 13 行） | 読む行 861（`W-19` 日程表 203・`W-20` 操作子 304・`W-21` 札 134・`W-22` 写し 59・`W-23` つまみ 20・`W-24` 段目 59・`W-25` 全体を収める 13・`W-26` 単一 HTML 49・`W-27` chart 20 と、`W-46`〜`W-49` の英語の名） |
| 前の名の残り（7 節） | 記録の外に 0。例外は `Cursors`（`cursorsGroup` のパレットの群の名として今も正しい。`--check --version CR-855` はこの 7 か所を挙げ続ける） |

⚠️ 予測は B9 の分割の後に測り直す。分割はファイルの数を変えるが、当たりの数は変えないはずである —— 変われば分割の写し漏れか重なりである。

### 2.3 仕様の数（tables / rows / uids / figures）

| 数 | 予測 | 理由 |
|---|---|---|
| tables | ±0 | 表を足さず消さない |
| rows | −1 | 用語集の行 `U-33`（Canvas Overlays）を消す（5.1 節） |
| uids | ±0 | |
| figures | ±0 | 図の `.svg` の語は生成器が刷る |

---

## 3. 手順（段と順番）

```
段 A（済、本書の起草の巡） 起草・道具の拡張・表（docs/review/cr-855-*.tsv）。仕様のファイルは触らない
  ⛔ B9 が develop に入ったと BOSS が知らせるまで待つ
段 B（仕様の文・原稿・試験）
  1. develop を合流し、2.1 と 2.2 を測り直して本書の数を直す
  2. python tools/apply_glossary_renames.py record docs/review/cr-855-record.tsv
  3. python tools/apply_glossary_renames.py apply --list
  4. python tools/rename/cr855_words.py --apply
  5. python tools/rename/cr855_words.py --list <scratch>.tsv —— 読む行を子の席に分けて読む
     （ファイルで分ける。2 つの席が同じファイルを書かない）
  6. 5 節の仕様の変更と 5.5 節の語を手で
  7. npm run gen、npm run gen:check
  8. tsc、vitest 全件（docs/reference/mspdi を写して）、playwright --list と全件、check.sh
段 C（コードの識別子） ⛔ CR-851 が develop に入った後
  9. develop を合流し、cr792_rename.py --map docs/review/cr-855-rename-map.tsv --survey
  10. 関わる識別子の add / keep を表に書き、--apply、道の改名は path-renames.txt に
  11. 8 と同じ検査
```

⚠️ 試験は仕様の文を字のまま引く（2026-11-25 の GT-2 の赤 2 回はこれだった）。段 B の 2〜4 は仕様と試験を同じ表で直すので、引用は一緒に動く。読む行（5）を直すときは、同じ文を引く試験を `grep` して同じに直す。

---

## 4. 道具

### 4.1 `tools/apply_glossary_renames.py record` の `old` 列

`CR-857` は決まった名を先に辞書へ入れたので、札はもう新しい名で、前の名がどこにも記録されていない。`record` は「札を新しい名に替え、前の札を `from` に書く」だけだったので、この形を書けなかった。

- 表に `old` 列を足した。`old` があり、札がすでに `new` と同じなら、札はそのままにして `renames[]` に `{from: old, ...}` を書く。札が `new` でなければ断る。
- 1 つの語に前の名を 2 つ書ける（実績操作のダミーと実績のダミー → 実績ダミー）。
- 記録した前の名が同じ言語の `avoid` にあれば `avoid` から外す（A.2「avoid に重ねて書かない」。`resumeMark` の `Resume Icon`）。
- 自己試験に 2 件を足した（11 件）。

### 4.2 `tools/rename/cr855_words.py`（新しい、一回限り）

表 `docs/review/cr-855-words.tsv` の行ごとに、正規表現と置き換えと、モード `all`（全部を置き換える）か `read`（並べて人が読む）を持つ。読む範囲と書き方は `apply_glossary_renames.py` を `import` して同じにした（仕様の手書きの `.md`、凍結した 4 本を除く原稿、試験、凍結した群の外の語の `definition`）。src は書かない。全部の行を 1 つの正規表現にして 1 回で置き換えるので、置き換えた語をもう 1 度読まない。

### 4.2b `cr855_words.py --src`（段 B で足した）

⚠️ 段 B で分かった: src の手書きの `.ts` は、画面の名を文字列でじかに書いている所がある —— 面の名と `data-role` の値（`'Help Modal'`・`'Search Panel'`・`'Task Group Pin'`・`'Delay Diagnostics Report'` ほか、規則 03 の 1 節に反する前からの形）。試験はその値で要素を探すので、試験だけを新しい名にすると赤になる。`--src` は、モード `all` のうち英語だけの行を、src の `.ts` の中で語の境目つきで置き換える（49 か所）。識別子（`HELP_MODAL` ほか）は段 C のまま。

### 4.3 `tools/rename/cr792_rename.py --map`

`CR-792` の道具は表の場所を固定して持っていた。`--map` と `--related` を足し、`docs/review/cr-855-rename-map.tsv`（前の名 17 の 4 つの書き方、67 行の下書き）と `docs/review/cr-855-related.tsv`（まだ空）を読ませる。識別子を丸ごと比べ、前の名を含む関わる識別子ごとに add / keep を決めるやり方はそのまま使う。

---

## 5. 名の改めでなく仕様の変更になる物

### 5.1 `Canvas Overlays`（`U-33`）を消す（`JDG-3362`）

- 裁定は「B にする」—— 使われていない名なので消す。中身の定めはどこにも無く、コードにも名が無い（`e053fb30a` で src 0）。
- 消す所: 辞書の語 `canvasOverlays`（`glossary.json`）と `glossary-tables.json` の `U-33` の行、`UZ-12` の升の列挙から `` `Canvas Overlays` ``、`EP-13` の升「`Schedule Canvas`（`U-32`）／ `Canvas Overlays`（`U-33`）」を「`Schedule Canvas`（`U-32`）」に。試験 1 ファイルの引用を同じに。
- 代わりの名（マウスで操作する点と操作子の名）は 2 枚目の木が決め、辞書の `pointerParts` の群が持つ。本書は足さない。

### 5.2 `IO-7` の名を GRS HTML にする（`JDG-3353`）

- 表 T-024 の `IO-7` の升「単一 `.html`」を「`GRS HTML`」に、辞書の `singleHtmlFormat` の札（英・日）を `GRS HTML` にする。⛔ 価値の語 `singleHtml`（単一 HTML、`JDG-3467`）は改めない —— 同じ字面の 2 つの物なので道具は当てず、行 ID で手で直す。
- 試験は 表 T-024 の升と `display-words.json` を突き合わせる（`CR-857` の後任の席の記録）ので、2 つを同じ巡で直す。

### 5.3 `shapeHeightOf.endpointSpan`（`S-16`）は `CR-851` と同じ巡

- src は `settings.shapeHeightOf[shapeKind]` と形の値で鍵を引く（`shape-cross-sections.ts`）。鍵だけを `dumbbell` にすると、値が `endpointSpan` のあいだダンベルの高さが引けない。値の改名（`JDG-3696`・`JDG-3711`）は `CR-851` が当てる。
- だから `settings.json` の `S-16` の鍵、`display-words.json` の `K-16` の英語、`glossary-tables.json` の `shapeHeightOfEndpointSpan` は `CR-851` の席が値と一緒に改める。BOSS が `CR-851` の席へ伝える（BOSS の答え、2026-11-27）。

### 5.4 `JDG-3470`（目標と課題を足す）—— 1 章の当てへ回した

- 裁定は 表 T-106 を 8 語にし、表 T-054 の `CH-1`・`CH-5` に語を付け、AI 連携の目標と課題を 1 つずつ足し、about のページの価値の並びを改める。`CR-857` の付録 A は本書に回した。
- 目標 `GL-010` と課題 `CH-8` を足すのは名の改めでなく仕様の変更で、検査 22 の範囲（`CH-[1-7]|GL-00[1-9]`）も広げる。
- BOSS の答え（2026-11-27）: 本書では当てない。仕様の 1 章（目標・課題）は B5 の下書きを持ち主が BGQA10 で見ている最中なので、その当てと一緒にする。BOSS が 1 章の当ての席へ回す。

### 5.5 `CR-857` から回った語

- `JDG-3463`・`JDG-3486`: `display-words.json` の `linkHintFS`・`linkHintSF`・`linkHintFF`・`linkHintSS` の日本語の「完了」を「終了」にし、別名（直列作業・引継必須・後追終了・並列開始）を足す（③）。英語の別名は問 4-9-2 で問うたまま答えが無いので、英語は改めない。
- `JDG-3469`: `DQ-1` の「見込み終了 | `projectedFinish`」を「終了見込み | `estimatedFinish`」に、src の内部の名 `projectedFinish`（`delay-diagnostics.ts`）を `estimatedFinish` に、試験 2 ファイルを同じに。Agent API に出る名は `CR-851` の物。

---

## 6. コードの識別子（段 C）

画面の名から作った識別子を、決まった名から作り直す（規則 03 の 1 節「綴りまで写す」）。`e053fb30a` で数えた（src と tests の識別子を camelCase・snake_case・kebab-case の語に割り、前の名の語の並びを含む物を拾った）:

| 前の名 | 当たり | 識別子の種類 | 例 |
|---|---:|---:|---|
| Search Panel | 1,068 | 63 | `searchPanel`・`SearchPanelSession`・`search-panel` |
| Delay Diagnostics | 1,068 | 57 | `delayDiagnosticsReport`・`DelayDiagnosticsReportWindow`（`readDelayDiagnostics`・`runDelayDiagnostics` は除く） |
| Task Group Area | 722 | 28 | `taskGroupArea`・`TASK_GROUP_AREA` |
| Document Title | 307 | 26 | `documentTitle`・`NOT_STORED_DOCUMENT_TITLE_SIZES` |
| Progress Marker | 192 | 11 | `progressMarkerOf`（`isProgressMarkerVisible` は除く） |
| Open Chooser | 186 | 14 | `OPEN_CHOOSER`・`OpenChooser` |
| Help Modal | 184 | 6 | `helpModal`・`HELP_MODAL` |
| Export Chooser | 121 | 10 | `EXPORT_CHOOSER`・`exportChooser` |
| Task Group Expander | 75 | 12 | `TaskGroupExpander` |
| Grab Strip（掴み帯） | 56 | 11 | `taskGroupGrabStrip` |
| Jump Landing | 51 | 12 | `jumpLandingRingOf` |
| ほか（Pin・Drop Line・Grab Copy・Callout・Resume Icon・Grab Region） | 49 | 12 | `taskGroupPin`・`calloutBox` |

- 下書きの表で `--survey` を回すと（`e053fb30a`）、前の名を含む関わる識別子 1,090 が決まっていない（`UNDECIDED`）。段 C で、`CR-851` の後の木で測り直し、機械で前の名の並びを置き換えた案を `add` で入れ、契約の名（Agent API の道具・GRS JSON のキー）と辞書のキー（`calloutIcon` などアイコンの行のキー）を `keep` に分けてから当てる。
- 道の改名: src 6・tests 21 のファイル名が前の名を持つ（`search-panel.ts`・`delay-diagnostics.ts` ほか）。`path-renames.txt` の行で記録する。
- 生成する定数の名（`NOT_STORED_DOCUMENT_TITLE_SIZES` など）は生成器の群の名から刷られるので、生成器の表で改める（規則 03 の 1 節）。
- `data-role` の値（`search-panel`・`delay-diagnostics-report`）は `JDG-3369` の `data-role` の名に合わせる。playwright がそれで要素を探すので、試験も同じ表で直る。

---

## 7. 台帳

段 B・段 C で見つけた仕様とコードの食い違いは `DFC-3661`〜`DFC-3665` に書く（どちらかを選ばない）。持ち主の裁定を受けたら `JDG-3996`〜`JDG-4005` に書く。

## 8. 反映記録

段 B を当てた（2026-11-27、B9 の後の develop `20fe577af` を合流した木）。段 C（コードの識別子）はまだ。

### 8.1 当てた順と数（予測 → 実測）

| 段 | 何を | 予測 | 実測 |
|---|---|---:|---:|
| 1 | `record docs/review/cr-855-record.tsv` | 27 件 | 27 件 |
| 2 | `apply`（区切られた前の名） | 580 か所・129 ファイル | 580 か所・129 ファイル |
| 3 | `cr855_words.py --apply`（`W-01`〜`W-45`） | 2,485 か所（3,065 − 580） | 2,485 か所・291 ファイル |
| 3b | 同じ（`W-50` 検索パネル → 検索ウィンドウ、段 B で足した） | —— | 208 か所・31 ファイル |
| 4 | `cr855_words.py --src`（src の `.ts` の画面の名の文字列） | —— | 49 か所 |
| 5 | 読む行（`W-19`〜`W-27`・`W-48`）、子の席 5 つがファイルで分けて読んだ | 仕様側 550 行 | 直した行 A 119・B 96・C 107・D 45・E 110 |
| 6 | 子の席の引用の対を試験へ（`old` → `new`） | —— | 581 対のうち 108 対が当たり、155 か所・58 ファイル |
| 7 | 手で（5 節・5.5 節・`W-46`〜`W-49`） | —— | 下の 8.2 |
| 8 | 道具・検査・生成器の中の前の語（`erd_json_to_schema.py` の句ほか） | —— | 62 か所・16 ファイル |

⚠️ 予測の外れ: 3b・4・8 は予測に無かった。study 83 は英語の式だけで画面の名を数え、日本語の前の名（検索パネル）と、src の文字列と、道具の中の句を数えていなかった。根本の原因は、study 83 の数え方（9 節）が「仕様の原稿・本文・src・tests・用語集」の字面だけを見て、名の言語ごとの札（`label.ja`）の前の形を式に入れていなかったこと。

### 8.2 手で当てた物

- `Canvas Overlays`: 辞書の語 `canvasOverlays` と `glossary-tables.json` の `U-33` を消し、`U-34` の「（同上）」を自分の文にした。`UZ-12`・`EP-13` の升、試験 `uf-39-40` の 1 か所。
- `IO-7`: 表 T-024 の升を `` `GRS HTML` ``、`display-words.json` の `IO-7` の名、辞書の `singleHtmlFormat` の札と定義（`renames[]` に `JDG-3353` で 2 件）。GRS のページ自体を指す「単一 `.html`」も GRS HTML とした（`JDG-3353`「今の「単一 HTML」に名を付ける」）。価値の語 `singleHtml` は残した。
- `W-46`・`W-47`: `Task Group Expander` → `Task Group Buttons`（辞書の `taskGroupButtons` は `U-47`）、`Task Group Grab Cues` → `Interaction Cues`。どちらも src の `data-role` の値なので、仕様・試験・src を同じに（22 か所）。`U-16` を `{label:dependencyLine}` に。
- `JDG-3463`・`JDG-3486`: ヒント 4 つと 表の `DP-1`〜`DP-3` の「完了」を「終了」に。`JDG-3469`: 見込み終了 → 終了見込み、`projectedFinish` → `estimatedFinish`（src 1 ファイル・試験 4 ファイル）。
- 試験が仕様の句を探す鍵（「`HF-10` の操作子」など）と、符号位置で綴った語 1 か所、表 T-018 の「完了」を読む試験 1 か所を新しい語に。
- 試験 `t-233` の指紋 5 行（`RS-51`・`RS-59`・`RS-64`・`RS-66`・`RS-73`）: 場面と語を読み直し、語の改めだけなので指紋を記録し直した。
- 凍結した原稿から刷った表を引く試験の 6 行は、新しい語にした後で戻した（凍結した原稿は前の語のまま、1.2 節）。

### 8.3 残した物

- 前の名が今も別の物の名である所: `Cursors`（`cursorsGroup`、パレットの群）4 か所、「単一 HTML」（`singleHtml`）。`--check --version CR-855` はこれを挙げ続ける。
- 子の席が別の意味と読んで残した語（写し・段目・つまみほか、仕様側 約 90 行）。
- 試験の注記に残る読む語 約 180 行（大半は操作子。前の仕様の文を履歴として引く注記を含む）。試験の動きには関わらない。後の仕事にする。

## 9. 測り方の再現

- 2.1 節: study 83 の `renames.tsv` の `CR-855` の行の `pattern` を、`git ls-files` の中の場所ごとに `re.findall` で数えた（生成した `.md` は頭の 15 行に「本書は生成物である」を持つ物）。
- 2.2 節: `record` は道具の `plan_records` をメモリの中で回し（辞書は書かない）、その後の `apply` は `scan(..., edit=False)`。`cr855_words.py --dry-run` と `--list`。
- 6 節: src と tests の識別子（`[A-Za-z_$][A-Za-z0-9_$]*(?:-[A-Za-z0-9_$]+)*`）を語に割り、前の名の語の並びを含む物を数えた。
