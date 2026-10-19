# 10 版の規則 —— **版の決め方・書き方・上げ方は本書の表だけが持つ**

⛔ **版の規則は本書だけに書く**（利用者 2026-10-20「そうしよう。 バージョンのルールはそこだけに書いておくようにしてくれ。」、`JDG-2980`）。
ほかの所（仕様・引継書・道具の注・README）は、本書を指す 1 行だけを持つ。
⭐ 仕様（`docs/spec/`）は、製品が動くときに守る約束だけを持つ —— 版の書式、比べ方、形が違えば版も違うこと、版をどこに出すか（`JDG-2985`）。
⛔ 規則の文が本書の外へ戻ると、検査 86 が赤にする（3 節）。

---

## 1. 版は UTC の秒までの時刻 —— 書き方は置き場で 3 つ

⭐ **版はすべて、UTC の秒までの時刻である**（`JDG-2982`）。1 つの時刻を、置き場が許す形で書く。3 つの形は機械で互いに移せる。

| 書き方 | 形 | 例（同じ時刻） | 置き場 | なぜこの形か |
|---|---|---|---|---|
| 詰めた形 | `YYYYMMDDTHHMMSSZ` | `20261019T022508Z` | タグ・リリースノートのファイル名・`package.json`・仕様書の変更履歴 | 名に `:` を書かない。`package.json` は private なので npm 11 が受け付ける（2026-10-20 に試した） |
| 区切りのある形 | `YYYY-MM-DDTHH:MM:SSZ`（20 字） | `2026-10-19T02:25:08Z` | JSON の中 —— `schemaVersion`・`agentApiVersion`・`tools/artifact-versions.json`。人が読む所（束の説明の頭・入手の頁） | RFC 3339。AI もスキーマの検証も日時として読む。辞書順が時刻の順 |
| semver | `年.月日.時分秒`、どの数も頭の 0 を落とす | `2026.1019.22508`（1 月 5 日 0 時 12 分 34 秒は `2026.105.1234`） | MCP の束の manifest.json の `version` と、取次の初期化の答えの `serverInfo` の版 | 束の決まりが semver を求める。⛔ pre-release の印（`0.0.0-20261019T022508Z`）にしない —— 入れる側が「不安定」と読む。3 つの数なら semver の順が時刻の順になる |

⛔ 小数秒と `Z` 以外の帯を書かない。

## 2. 版を持つもの —— 1 行に 1 つ

| 版を持つもの | 書き方と置き場 | 何が決めるか | 誰・何が上げるか | いつ | 誤りを止める機械 | 例 |
|---|---|---|---|---|---|---|
| GRS Relay（`grs-relay.mcpb`・grs-relay.mjs・取次の `serverInfo`）。入手の頁の 2 つのボタンの下にも出る | 区切りのある形を `tools/artifact-versions.json` の `grsRelayBuiltAt` に書きコミットする。束と `serverInfo` へは semver で、束の説明の頭と頁へは区切りのある形で、組み立てが書き入れる | 中身（同じファイルの `grsRelayInputs`）を最後に変えたコミットの時刻。組み立ては git に問わずファイルを読む —— docs だけのコミットからは同じ版と同じバイト列ができる。⭐ `package-lock.json` の版の行だけの変更は中身の変更に数えない（`JDG-2986`） | 中身を変えた席が `node tools/artifact_versions.mjs bump grsRelay` を回す | 中身を変えるコミットと同じコミット | 検査 85（中身が版より後に変わると赤）。GT-2 の `tools/check_reproducible_artifacts.mjs`（2 度作って同じ SHA-256） | `2026-10-19T02:25:08Z` ＝ `2026.1019.22508` |
| サーバー同期のデモの zip（`grs-server-sync-demo.zip`） | 区切りのある形を同じファイルの `serverSyncDemoBuiltAt` に。zip の各項目がその時刻を持つ | 中身（`serverSyncDemoInputs`）を最後に変えたコミットの時刻 | `node tools/artifact_versions.mjs bump serverSyncDemo` | 同上 | 検査 85。GT-2 の同じ確かめ | `2026-10-19T19:51:01Z` |
| `GRS JSON` の形式の版（`schemaVersion`） | 区切りのある形。値の置き場は `tools/generate_startup_template.py` の `SCHEMA_VERSION` の 1 か所で、`npm run gen` がスキーマ・テンプレートへ配る | 文書の形（表 T-058 の列と 表 T-052 の鍵）を変える変更を当てる時刻 | 形を変える CR の席が値を書き、`tests/contract/dfc-2950-fr-073-a-shape-change-raises-the-format-version.contract.test.ts` の版と指紋の対を 1 つ足す | ⛔ 1 つの変更要求の中で版を上げるのは 1 度だけとする | 同じ試験（形の指紋が変わったのに対が無ければ赤）。検査 76（時刻の形） | `2026-10-19T00:35:37Z` |
| `Agent API` の版（`agentApiVersion`） | 区切りのある形。値の置き場は `docs/spec/_source/agent-api-members.json` の `version` で、`npm run gen` がコードへ配る | 呼び方（メンバーの名・引数・戻り値の型。表 T-107 と 表 T-400）を変える変更を当てる時刻。⭐ 互換かどうかを人が判じない —— 呼び方が少しでも変われば上げる（`JDG-2986`） | 呼び方を変える CR の席が値を書き、`tests/contract/cr-822-a-call-shape-change-raises-the-agent-api-version.contract.test.ts` の版と指紋の対を 1 つ足す | 1 つの変更要求の中で 1 度だけ | 同じ試験 | `2026-10-19T01:15:00Z` |
| 仕様書の変更履歴（`docs/development-records/changelog.md`） | 詰めた形。⚠️ `5.36` までの行は番号のまま残す（書き換えない）。日付の欄は版と同じ UTC の日（`5.36` までは日本時間の日） | その行を書いた時刻（`date -u +%Y%m%dT%H%M%SZ`）。⛔ 前もって配らない（`JDG-2983`） | 仕様を変える CR の席 | 仕様を変える CR ごとに 1 行 | 検査 38（番号の行の後に時刻の行、どちらも上から小さい順、同じ版は 1 行だけ）。⭐ 合流で順が崩れたら時刻で並べ直す | `20261020T130000Z` |
| リリースのタグ | `<段階>-<詰めた形>`。段階は `Alpha`・`Beta`・`Release` の 3 つだけ（`JDG-2981`・`JDG-2984`） | 出す sha の `grsRelayBuiltAt` —— 出すもののビルド版 | 利用者が、合流の後に打つ。打つコマンドは `node tools/release_version.mjs <段階>` が出す | リリースごと | 検査 86（リリースノートの名の形と、最新のリリースノートが `package.json` と同じ時刻） | `Alpha-20261019T022508Z` |
| `package.json` と `package-lock.json`（2 か所）の版 | 詰めた形 | 最新のリリースの時刻 | `node tools/release_version.mjs <段階>` が書く。⛔ 手で打たない | リリースのコミットだけ | 検査 86（3 か所が最新のリリースノートの時刻と同じ） | `20261019T022508Z` |
| リリースノートと README の版の行 | `docs/release-notes/<タグ>.md`（英語）と `<タグ>-ja.md`（日本語）。README は「Version `<詰めた形>`, tag `<タグ>`」の 1 行（日本語は「版 … タグ …」） | 最新のリリース | リリースのコミットで、リリースする席 | リリースごと | 検査 86（英日の対が揃う。README と README-ja が最新のタグと版を名指す） | `docs/release-notes/Alpha-20261019T022508Z.md` |

⭐ 変更要求の番号（`CR-`）・台帳の行 ID（`JDG-`・`DFC-` ほか）は版ではない —— 本書の外（規則 05）が持つ。

### 2.1 リリースの手順

| 段 | 何をする | 誰 | 機械 |
|---|---|---|---|
| 1 | 出す sha の上で `node tools/release_version.mjs <段階>` を回す —— `package.json` と lock の版を書き、タグ名・リリースノートの 2 つのファイル名・打つ `git tag` を出す。出すものが前のリリースと同じ時刻なら止まる | 調整役 | 同じ道具 |
| 2 | リリースノートの 2 本を書き、README と README-ja の版の行を直し、1 のファイルと同じコミットにする。変更は分野ごとの「CR ／ 何が変わったか」の表と、前のタグから閉じた DFC の「直した不具合」の表で、読者の言葉で 1 行ずつ（利用者に見えない修正は「内部の修正 N 件」、`JDG-2957`・`JDG-2959`） | 調整役 | 検査 86 |
| 3 | その sha に `GT-2` が通る | 調整役 | `tools/push_guard.py`（最後の `GT-2` が失敗なら push を拒む） |
| 4 | `develop` → `main` の PR を開く（`gh pr create --base main --head develop`。本文に変更履歴の範囲・ビルド版・`GT-2` の結果） | 調整役 | ⛔ `main` へは push しない（`tools/push_guard.py`、`JDG-2930`） |
| 5 | GitHub で見て合流する | 利用者 | GitHub の ruleset（`main` は PR のみ） |
| 6 | 配備 —— `gh workflow run pages.yml --ref main`（`pages.yml` は手で起こすだけ） | 合流の後 | 配備の組み立てが版を書き入れる |
| 7 | 1 が出したタグを打ち、GitHub Release を作る | 利用者 | — |

## 3. 規則を表の外へ戻さない機械（`JDG-2986`）

| # | 何を止めるか | 機械 |
|---|---|---|
| 1 | `package.json`・lock の 2 か所・README・README-ja が最新のリリースノートの時刻とタグを名指さない。リリースノートの名が 2 節の形でない・英日の対が欠ける | 検査 86（`tools/check_versions.mjs`） |
| 2 | 版の規則の文が本書の外に書かれる —— 目印の語句（`tools/check_versions.mjs` の `RULE_MARKS`）が、許された所（本書・実装する道具・試験・着地した CR・記録の台帳）の外に現れる。本書を指すべき所（同じファイルの `POINTERS`）が本書を指さない | 検査 86 |
| 3 | 変更履歴の時刻の順と重複 | 検査 38 |
| 4 | lock の版の行だけの変更で取次の版を上げさせる追いかけっこ | 検査 85 |
| 5 | `Agent API` の呼び方が変わったのに版が同じ | `tests/contract/cr-822-a-call-shape-change-raises-the-agent-api-version.contract.test.ts` |
| 6 | 版を手で打つ | `tools/release_version.mjs` |

⚠️ タグそのものは合流の後に利用者が打つので、機械は見ない —— 1 段の道具が打つコマンドを出す。
