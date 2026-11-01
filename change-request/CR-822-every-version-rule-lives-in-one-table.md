# CR-822 —— 版の規則は 1 つの表だけが持ち、仕様は約束だけを持つ

> 状態: ✅ **当てた** —— 2026-10-20、版の規則の席（`hungry-moore-21d7c7`）が起草し、同じ席が当てた。
> 元: 利用者 2026-10-20「そうしよう。 バージョンのルールはそこだけに書いておくようにしてくれ。」（`JDG-2980`、調整役が中継）。
> 当てる裁定: `JDG-2980`〜`JDG-2986`。新しい ID: 無し。消す ID: 無し。変更履歴: `20261019T222000Z`（本 CR から変更履歴の版は時刻、`JDG-2983`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1` ／ `GL-004` —— 人と AI は版を見て、入れ直しが要るか、文書を開けるかを決める（`FR-073`、表 T-035 の `AG-1`）。版の決め方が 12 か所に散っていると、1 か所を直して他が古いまま残り、版が約束を守らなくなる。

### ② レビュー観点のどの条項を当て、何が出たか

`R2.5`（DRY・1 つの正）—— 版の規則が仕様の 4 か所（`design-mcp-relay.md` の 6 節・`FR-073`・`AG-1`・`FR-065` の理由）、`Agent API` の原稿、引継書、規則 05、道具の注 3 本に重なって書かれていた。1 つの表を正にし、ほかは表を指す 1 行にした。検査 86 が重なりの戻りを止める。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 表は新しい規則 10（`docs/development-rules/10-versions.md`）に置いた —— 01〜09 のどれも版を主題にしていない。
2. ⭐ `tools/relay_version.mjs` と `src/framework/mcp-relay-server/mcp-relay-server.ts` の注は直さなかった —— どちらも GRS Relay の中身（`grsRelayInputs`）であり、注を直すと取次の版を上げることになる。`relay_version.mjs` は表の書き方を実装する道具として検査 86 の許す所に入れた。`mcp-relay-server.ts` の 59 行の注（「版は `package.json` のもの」）は CR-799 の前の古い文であり、次に中身を変える CR で直す。
3. ⭐ About ページ（`docs/about/index.html`）の版の文（semver の形）は直さなかった —— 文はスクリプトの中にあり、Content Security Policy の SHA-256 を作り直す要がある。About の版と数を揃える席（`JDG-2960`）に任せる。
4. ⭐ 変更履歴の日付の欄は、本 CR の行から版と同じ UTC の日にした —— 版が UTC なのに日付が日本時間だと、同じ行の 2 つの欄が別の日を指しうる。
5. ⭐ 今の `package.json` の版は、最新のリリース（`Alpha-20261019T022508Z`）の時刻 `20261019T022508Z` とした —— 表のとおり、版は最後のリリースの時刻である。`tools/release_version.mjs` は次のリリースのための道具であり、今回は同じ書き換えを手で 1 度だけ回した。
6. ⭐ 規則の目印の語句（`tools/check_versions.mjs` の `RULE_MARKS`）は、表から移した文だけが使う 7 つにした。着地した CR・台帳・過去の記録・試験は、それを書いてよい所とした（台帳は追記だけで、過去の行を書き換えない）。

## 1. 対応

| 直すこと | 場所 | 直すファイル |
| --- | --- | --- |
| 版の規則の表 | 規則 10 | `docs/development-rules/10-versions.md`（新）・規則の索引 |
| 製品の約束だけを残す | `FR-073`・表 T-035 の `AG-1`・`FR-065` の理由・`design-mcp-relay.md` の 6 節・表 T-107 の前文 | `docs/spec/01-04-requirements.md`・`docs/spec/_assets/design-mcp-relay.md`・`docs/spec/_source/agent-api-members.json` |
| 表を指す 1 行 | 引継書・規則 05・変更履歴の頭・記録の索引・道具の注 | `handoff.md`・`05-working-method.md`・`changelog.md`・`docs/development-records/README.md`・`tools/artifact-versions.json`・`tools/artifact_versions.mjs`・`tools/stamp_download_page.mjs` |
| 規則の文が表の外へ戻らない・リリースの版が揃う | 検査 86 | `tools/check_versions.mjs`（新）・`check.sh` |
| 変更履歴の版を時刻にする | 検査 38 | `check-changelog-versions.py` |
| lock の版の行だけの変更は取次の版を動かさない | 検査 85 | `tools/artifact_versions.mjs`・`tests/contract/cr-822-a-lock-version-change-moves-no-artifact-version.contract.test.ts`（新） |
| `Agent API` の呼び方が変われば版も変わる | 契約の試験 | `tests/contract/cr-822-a-call-shape-change-raises-the-agent-api-version.contract.test.ts`（新） |
| リリースの版を道具が書く | 2.1 節の 1 段 | `tools/release_version.mjs`（新） |
| `package.json` の版 | 2 節 | `package.json`・`package-lock.json`・`README.md`・`README-ja.md` |
| 移した条項を引く試験 | `FR-073` | `tests/contract/dfc-2950-…`・`tests/unit/cr-646-grs-json-shape.test.ts` |

## 2. 実測（2026-10-20）

```
棚卸し（bbdfeec2f、grep）: 版の規則を述べる所 12 —— 仕様 4（relay 6 節・FR-073・AG-1・FR-065 の理由）、
  agent-api-members.json の前文（と生成した表 T-107 の前文）、tools 3（artifact-versions.json・artifact_versions.mjs・
  relay_version.mjs）、引継書、規則 05、変更履歴の頭、記録の索引。古い注 2（stamp_download_page.mjs「コミットの時刻」、
  mcp-relay-server.ts:59「package.json の版」）
検査 86 の最初の走り（表を足しただけの木）: 規則の文 13（5 ファイル）、表を指さない所 10、リリースの版の食い違い 5
  本 CR の後: 0
変更履歴の番号: 0.01 刻みの通し番号。0.99→1.00 など 5 度の繰り上がりに意味は無い。欠番 4 か所（4.46・4.53〜4.55・4.90・5.03〜5.04）
npm 11.6.2: private のパッケージで version "20261019T022508Z" を install・pack・npm pkg get が受け付ける
検査 85: lock の版の行だけを書き換えた木で OK（取次の版を求めない）
Agent API の指紋: 0d2545fc…（版 2026-10-19T01:15:00Z と対にした）
```

## 3. 影響

```
生成物           docs/spec/_assets/tbl-agent-api-members.md（表 T-107 の前文）・tbl-row-id-prefixes.md・test-inventory.md（npm run gen）
実装・形式の版   値も動きも変えない。GRS JSON の形式の版・Agent API の版・取次の版は動かない
毎フレームの仕事 無い
試験             新 2 本（Agent API の指紋、lock の版と検査 85）。DFC-2950 と CR-646 の試験は、移した 2 つの条項を表から引く
運用             変更履歴の版を前もって配らない（行を書いた時刻）。合流で順が崩れたら時刻で並べ直す
```
