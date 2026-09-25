# CR-573 — 試験の方針 —— 仕様は「何を確かめるか」を表で持ち、単体試験は省略の表が覆わない関数だけに書く

> 起草の状態: 起草した（2026-09-26）。利用者の裁定 `JDG-635` 〜 `JDG-645` と、起草の途中で下りた `JDG-605`（性能の試験を測る時期・測り方・利用者を呼ぶ場面）（逐語は 0.1 節）を当てる本文の案である。⛔ 仕様・規則・コード・試験・基準線はまだ 1 文字も変えていない。本書は裁定を決め直さない —— 裁定が決めていないことだけを 12 節で問う。
> 読んだ木: `e1b8bab2`（`refactor` の先端を切った作業木）。数はどれもこの木で測った（測り方は 14 節）。⛔ 当てる前に、`CR-570` が着地した木で測り直すこと。
> ID の帯: `CR-573` と `JDG-635` 〜 `JDG-645` は調整役が予約した（`rulings.md` の同日の節）。本書が新しく作る名（表の番号・行 ID の接頭辞・検査の番号・ファイル名・札）はどれも仮である（2 節）—— 調整役がコミットの前に詰める。台帳の番号の帯は受けていない。
> ⛔ 当てる順: `CR-570` の着地の後（`JDG-645` の問 G）。`CR-570` は `tests/` と `src/` を大きく書き換えている最中であり、振り分け表（10 節）はその後の木でしか測れない。
> 閉じるもの: `DFC-311`（第 8・9・10 章が器のまま —— 12 節の問い 1 の答えしだい）。性能の門が無条件に走る件（6 節）は、調整役が `playwright.config.ts` の `testIgnore` で閉じ、`CR-570` と一緒に着地する（`JDG-605`）—— 本書はその門を当てない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した。抜粋） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-31` | 「既存の不具合を0にしろ、新規の不具合を探すテストはするな、必要なのは修正確認テストだけだ。」 | 新規の欠陥を探す試験を足さない。要るのは直したことを確かめる試験だけ | 単体試験を増やさない理由。直した不具合の戻り止め（`dfc-*`）は消さずに移す（`JDG-637`） |
| `JDG-25` | 「一旦そのまま」（第 8・9・10 章について、2026-09-06） | 試験の章をそのとき触らない。⚠️ 台帳 `DFC-311` は「一旦は後で戻る意」として開いたまま | ⭐ `JDG-635` の「その旨、仕様書のテストの章に書く」で戻ってきた。形は 12 節の問い 1 |
| `JDG-635` | 「単体試験さぁ、原則廃止しない？  既存の単体試験も削除。」「その旨、仕様書のテストの章に書く。」「→単体試験を省略していいルールの方を整備しよう。 逆はの抜け漏れるぞ」 | 単体試験は原則廃止し、既存も消す。規則は「省略してよい場合」を並べ、どれにも当たらないものは単体試験が必須 | 4.1 節（仕様）・4.3 節（規則 04 の 3.5） |
| `JDG-636` | 「@purity って、関数を書く前の設計で決まるよね？」「それでいい、草案に入れろ」 | 省略の表 P・S1〜S4・R1〜R6。外の約束の数を突き合わせる純粋関数は例外。札が嘘をつかないことを検査する | 4.3 節の表 `UO`、5 節の検査 A |
| `JDG-637` | 「→提案通り」（2 件） | `tests/unit/dfc-*` は消さずに system ／契約試験へ移す。検査 39・42 の数え先を契約・system・ユースケースへ替え、基準線を引き直す（上げは利用者の OK） | 5 節、9 節の波 2・3・4 |
| `JDG-638` | 「→基本提案通り。 ユーケース試験はやろう」 | `UC-001` からの 14 件に 1 本ずつ、仕様だけを読む体が書き、`dist/index.html` を file:// で走らせる。食い違いはその場で直さず `defects.md` へ | 4.1 節の `VT-1`、9 節の波 2b |
| `JDG-639` | 同上（書き分けの部分） | 仕様の試験の章は「何を確かめるか」（UC 全件・状態表の全行・性能は表 T-042 ／ T-043）、`04-verification.md` は「作り方」 | 4.1 節と 4.3 節の分け方そのもの |
| `JDG-640` | 「全部推奨どおりでいい。」（問 A 関門） | commit ／ `refactor` へ push ／ `main` の早送りの 3 段の関門 | 4.3 節の表 `GT` |
| `JDG-641` | 同上（問 B 既知の赤） | 既知の赤は 1 行 1 DFC の一覧に置き、一覧に無い赤で関門を止める。減らすのは調整役、増やすのは利用者の OK | 4.3 節 |
| `JDG-642` | 同上（問 C flaky） | retries で隠さない。DFC を起こして直すか消す。それまで一覧に flaky と付ける | 4.3 節 |
| `JDG-643` | 同上（問 D 性能） | `tests/nfr` の性能の試験は `GRS_PERF=1` のときだけ。付けるのは利用者の居るセッションだけ（RISK-001、`JDG-50`） | ⚠️「利用者の居るセッションだけ」は `JDG-605` が 3 つの場面に絞った。`GRS_PERF=1` の門は生きている —— 6 節 |
| `JDG-605` | 「そもそも、性能試験を行うのは、どんな時が良いか？ 提案しろ。」「Bでいいが、e2eのパフォーマンス試験に毎回俺が必要か？」「Cでいい、記録して司令塔に伝えろ」 | いつ: 節目を閉じるとき（表 T-042）と、毎フレームの経路（レイアウト・幾何・当たり判定・描画、04 の 5 節）に触れた CR の `main` 早送りの前。溜まっていれば 1 回にまとめる。触れたかは機械が立て「性能の測り待ち」の一覧に載せる。どう: 他のセッションが止まっているとき（ListAgents の busy 0）、同じ dist の sha で `GRS_PERF=1` を付けて 1 回。合否は `JDG-50`。誰: 利用者を呼ぶのは ① 赤（段 0 より悪い）② 節目を閉じるとき ③ 合格条件・測り方・段 0 の基準値を変えるとき、だけ。緑は測りの記録に 1 行残して事後に報告。2026-07-18 の「性能テストするときは俺を呼べ」はこの 3 つに絞られる。門（`testIgnore`）は調整役が `CR-570` と一緒に当てる | 4.3 節（04 の 5 節）、6 節、5 節の検査 66、9 節 |
| `JDG-644` | 同上（問 E XSD） | XSD が無いときは明示してスキップ。関門は根の作業木で回す。XSD は repo に入れない | 4.3 節 |
| `JDG-645` | 同上（問 F・問 G） | F: 現状を固定している試験の一斉の棚卸しはしない。赤になったとき、条項があれば引かせ、無ければ消す。G: `CR-570` の後に ①振り分け表 → ②`dfc-*` の移動とユースケース試験 → ③単体の削除・検査の切り替え・`@purity` の検査 → ④基準線 | 4.3 節、9 節 |

### 0.2 調べた結果（`e1b8bab2`）

1. **試験の章は 2 か所にある。** 方針と表（表 T-042・T-043・T-218・T-219）は `05-07-design.md` の Chapter 7（テスト戦略、`:1714` 〜 `:1829`）、ケースの器は `08-10-test.md` の Chapter 8・9・10（88 行、3 章とも引用の段だけ）。Chapter 8.1 は今「⛔ いまは作らない」と書いている —— `JDG-638` と正面から食い違う。
2. **ユースケースは Chapter 3.2 に 14 件**（`01-04-requirements.md` の `**UID**: UC-` を数えた。番号は `UC-001` 〜 `UC-014`、並びは `UC-010` の次が `UC-014`）。どれも `SCENARIO` と `EXTENSIONS` を持つ。`tests/usecase/` は存在しない。`npm run e2e` は `--pass-with-no-tests` でその空をごまかしている（`package.json`）。
3. **状態表は 9 つ**（`_source/state-machines.json` の `regions`）—— 表 T-280・T-286・T-289・T-290・T-292・T-293・T-295・T-296・T-328。契約試験は 8 つに在り（`tests/contract/state-machine-*.contract.test.ts`）、`rowTree`（表 T-328、`CR-570`）には無い。⭐ 状態表の全組を契約試験で結ぶことは、仕様が既に求めている —— 表 T-250 の `SD-3` と表 T-285 の `RA-6`。
4. **試験の置き場**（`git ls-files`）: `tests/unit` 345 ファイル・201,310 行（うち `dfc-*` 37）、`tests/contract` 27、`tests/system` 29、`tests/nfr` 3、`tests/integration` 1。単体の件数 6,404 は `JDG-635` の前に試験方針のセッションが数えた数である（本書は vitest を回していない）。
5. **`@purity` の札**（`git grep -o -E "@purity +[a-z-]+" -- src`）: `pure` 1,502 ／ `semi-pure-a` 1 ／ `semi-pure-b` 111 ／ `non-pure` 336 —— `rulings.md` の数と一致した。
6. **検査 39 は、ほぼ単体試験だけで持たれている。** 検査 39 の本体を scratchpad へ写し、読む木だけを絞って回した:

   | 数える試験 | MUST ／ MUST NOT | 逐語で持たれる | 持たれない |
   |---|--:|--:|--:|
   | `tests/` 全部（今の検査） | 2,136 | 828 | 1,308 |
   | `tests/unit` を除く | 2,136 | 49 | 2,087 |
   | `tests/unit` のうち `dfc-*` だけを残す | 2,136 | 149 | 1,987 |
   | 契約・system・ユースケースだけ（`JDG-637` の数え先） | 2,136 | 46 | 2,090 |

   ⚠️ この作業木の今の値 1,308 は基準線 1,305 より 3 多い（本書は理由を追っていない）。⇒ 単体を消すと、持たれない数は 1,308 から 2,000 前後へ上がる。**上げは利用者の OK**（`JDG-637`、規則 04 の 6.3）—— 波 4 で、この表を添えて問う。
7. **検査 42 は、ほぼ単体試験の注記である。** 同じ手で `tests/unit` を除くと、出所の無い引用は 361 → 12（この作業木の値。規則 04 の 6.7 の +3 を含む）。下げは調整役が問わずにしてよい（`JDG-520`）。
8. **`npm run parity` は MSPDI の往復ではない。** `tools/parity/check.mjs` は見本とアプリを同じ盤で並べて比べる道具である（規則 04 の 3.6）。MSPDI の往復を `tests/unit` の外で見ているのは `tests/contract/if-3-file-store.test.ts:655` の `FR-060` の段だけで、`mspdiFromDocument` を呼ぶ単体は 9 ファイル。⇒ 省略の R4 を「parity が覆う」と読むと穴が開く（3.3 節・4.3 節の `UO-9`）。
9. **規則 04 の 6.4 の 1 行は古い。**「`sample-schedule/` は `.gitignore` されているので、作業木には無い」とあるが、`git ls-files sample-schedule` は 9 ファイルを返す（`.gitignore:83` が 2026-09-12 からの公開を書く）。ERP の見本 `sample-large-erp-program.ja.xml` の「1. プログラム管理」は `:1519` に在る。
10. **性能の門は今、無条件に走る**（6 節）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-5`（`GL-005`、単一の `.html` で完結）—— ユースケース試験は、利用者がダウンロードするのと同じ `dist/index.html` を file:// で押す。今の緑は開発サーバの `src` についての緑であり、配る 1 ファイルについての緑ではない。
- `CH-3`（`GL-003`、ぬるサク）—— 性能の門（表 T-043）を消さずに、測るべき時（節目と、毎フレームの経路に触れた CR の早送りの前）にだけ、他のセッションが止まった機械で回す（`JDG-605`）。今は誰の `npm run e2e` でも 25 分近く走る門が、ほかの走行と重なって起動する。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- `R1.3`（唯一の正）: 「何を確かめるか」は仕様、「作り方」は規則 04 —— 同じ規則を 2 か所に書かない。⇒ 仕様は規則 04 の省略の表を指すだけで、行を写さない（4.1 節）。
- `R7.1`・`R7.6`（純粋性の 4 値と札）: 省略の主軸は設計で決まる札である。⇒ 札が偽なら省略も偽になるので、札を検査する（5 節の検査 A）。
- `R6.1`（フレーキー）・`R6.2`（要求カバレッジ）: flaky を retries で隠さない。ユースケース試験は `UC-xxx` を親に取る。
- `R2.1`（命名）: 新しい接頭辞 3 つ・札 2 つ・ファイル 4 つ・検査 3 本の名はどれも仮。⚠️ 裁定の札 `S1`〜`S4`・`R1`〜`R6` は、`R1` 〜 `R7`（07 の群）や `S-*`（設定値の行）と見分けられないので、行 ID には使わない（`UO-*` を振り、裁定の札は欄に残す）。
- `R2.9`（YAGNI）: 振り分けのための新しい道具は作らない —— 枝の数は `function-size.mjs`（検査 56）、網羅は既に入っている `@vitest/coverage-v8` で測る。

### ③ 利用者に問わずに決めたこと

1. **「何を確かめるか」の表は Chapter 7 に 1 つ置き（表 T-334、仮）、Chapter 8・9・10 はその表を指す。** 表 T-042・T-043 と同じ章に置けば、性能の行は表 T-043 を指すだけで済む。
2. **ユースケース試験 1 本は、その UC の `SCENARIO` を頭から終わりまで押す。** `EXTENSIONS` は要求の側の試験（system ／契約）が持つ。`JDG-638` の「1 本ずつ」を 1 本のまま守るため。
3. **省略の表は規則 04 の 3.5 節に置き、行 ID は `UO-*`（仮）。** 裁定の札（P・S1〜S4・R1〜R6）は欄に写す。
4. **外の約束の例外は、関数の注釈の札 `@external-contract <仕様の行 ID>`（仮）で名乗らせる。** 機械が例外を見分ける手が札しかない。
5. **機械が推せない省略（`UO-5` 結線・`UO-9` 往復・`UO-11` 作り直し）は、札 `@unit-test-omitted <UO-n>`（仮）で名乗らせ、検査 B が名乗った行の条件を読める範囲で確かめる。**
6. **`UO-4`（上位の試験が分岐を全部通る）は、Vitest の網羅（契約・結合の試験だけ）で測る。** Playwright の走行は `src` の網羅を出さない。網羅のファイルが無いとき、検査 B は緑ではなく「測っていない」と出す。
7. **`UO-9`（往復）を守るのは `npm run parity` ではなく、MSPDI の見本 7 本を読み・書き・読み直して元と比べる契約試験である**（0.2 の 8）。今それが `tests/unit` にしか無ければ、振り分け表で「残す」か「移す」に入れる。
8. **`semi-pure-a` にも検査 A の禁止を掛ける。** `R7.1` の定義（副作用なし・決定的）から導いた —— `semi-pure-b` ／ `non-pure` を呼べば決定的でなくなる。`pure` が `semi-pure-a` を呼ぶことは、裁定が禁じていないので検査しない。
9. **既知の赤の一覧は `tests/known-red.txt`（仮）。一覧に在って緑になった行（flaky を除く）も赤にする**（検査 43 と同じ両向きの保持）—— 減らす役の調整役が、減らし忘れに気づける。
10. **`GRS_PERF` の門が囲うのは時間を測る 2 ファイルだけ**（`JDG-605` の読みと同じ。門そのものは調整役が当てる）。`tests/nfr/nfr-004-single-file.test.ts` は 1 ファイルであること（`NFR-004`、表 T-043 の `PG-7` は記録のみ）を見る試験で、時間を測らないので毎回走る。
11. **関門の走行で XSD が無ければ、スキップではなく関門を止める。** `JDG-644` の「関門は根の作業木で回す」を、覚えておく規則ではなく機械の断りにする（README の 2 節の段）。
12. **門は設定そのもの（`testIgnore`）が持つが、見張りの検査は残す**（検査 66、仮）。設定は 1 行消せば黙って外れ、`tests/nfr` に時間を測るファイルを足しても一覧に入らない —— どちらも緑のまま測定が無条件に戻る。同じ検査が「性能の測り待ち」の一覧の漏れも見る（`JDG-605` の「機械が立てる」）。
13. **毎フレームの経路は、ファイルの置き場で決める**（仮）: `src/entity/layout-engine/**`・`src/adapter/svg-renderer/**`・`src/adapter/screen-renderer/**`・`src/framework/single-html-shell/frame-loop.ts`。規則 04 の 5 節が挙げる 4 つ（レイアウト・幾何・当たり判定・描画）の住む所であり、一覧は 04 の 5 節の表に置く。⚠️ 当てる体が、表 T-060 と 5.3 節の置き場で確かめ直すこと。

---

## 1. 範囲 —— ファイルごとの行き先

| ファイル | 何が変わるか | 節 |
|---|---|---|
| `docs/spec/05-07-design.md` の Chapter 7 | 表 T-334（仮）を足す。表 T-218 の欄と `TS-6` の意味、その後の段。表 T-219 と Chapter 9 の生成の段（問い 1 の答えしだい） | 4.1 |
| `docs/spec/08-10-test.md` | 8.1・9.1・10.1 の引用の段を、表 T-334 を指す段へ | 4.2 |
| `docs/spec/_source/row-id-prefixes.json` | `VT`・`UO`・`GT` を登録（刷り物 `_assets/tbl-row-id-prefixes.md` は `npm run gen`） | 2 |
| `docs/spec/A-appendix.md` | 変更履歴に 1 行 | — |
| `docs/development-rules/04-verification.md` | 1・3.5・4・5・6.4・6.7 節、新しい節 3.9（既知の赤・flaky・現状を固定した試験） | 4.3 |
| `docs/development-rules/09-tools.md` | 新しい検査 3 本と、数え先を替えた検査 39・42 | 5 |
| `.claude/skills/spec-graph-check/` | 検査 39・42 の数え先、検査 A・B・C（仮）、`check.sh` | 5 |
| `docs/development-records/perf-pending.md`（新、仮）・`docs/development-records/measurements/performance-runs.md`（新、仮） | 性能の測り待ちの一覧と、緑の走行の 1 行の記録（`JDG-605`） | 4.3・6 |
| ⭐ 触らない: `tests/nfr/*` と `playwright.config.ts` の `testIgnore` | 門は調整役が `CR-570` と一緒に当てる（`JDG-605`） | 6 |
| `tests/unit/**` | 振り分け表のとおり 消す／移す／残す | 9・10 |
| `tests/usecase/**`（新） | UC 1 件につき 1 本 | 9 |
| `tests/known-red.txt`（新、仮）・`tools/gate/`（新、仮） | 既知の赤の一覧と、それを読む関門の走らせ手 | 4.3 |
| `package.json`・`playwright.config.ts`・`vitest.config.ts`・`tests/README.md` | `--pass-with-no-tests` を外す、`guard:publish` を伸ばす、`TS-*` を書く注記 | 3.3 |

---

## 2. 新しい識別子（どれも仮 —— 調整役がコミットの前に詰める）

⭐ 測った日: 2026-09-26、`e1b8bab2`。規則 02 の 2.5 節のとおり、当てる直前に測り直すこと。

- 仕様の表の番号の最大は `T-329`（`**表 T-nnn —` の見出しを数えた）。ほかの進行中の変更要求が `T-330` 〜 `T-333` を名乗っているので、本書は仮に `T-334` を使う。
- `VT`・`UO`・`GT` は、`row-id-prefixes.json` と 3 つの木（`docs/spec`・`docs/development-records`・`docs/development-rules`）の `| XX-n |` で空いている。
- 接頭辞の登録簿は 163 件（`row-id-prefixes.json` の `prefixes`）。本書で 166 になる。
- 検査の番号は `check.sh` の `section` の最大が 63。本書は仮に 64・65・66 を使う。

| 仮の名 | 何か | 置き場 |
|---|---|---|
| 表 T-334 ／ `VT-*` | 確かめるもの（Verification Target） | `05-07-design.md` の Chapter 7 |
| `UO-*` | 単体試験を省略してよい場合（Unit-test Omission） | `04-verification.md` の 3.5 節 |
| `GT-*` | 関門（Gate） | `04-verification.md` の 4 節 |
| 札 `@external-contract <行 ID>` | 外の約束の数を突き合わせる純粋関数 | `src` の関数の注釈 |
| 札 `@unit-test-omitted <UO-n>` | 機械が推せない省略を名乗る | 同上 |
| `tests/known-red.txt` | 既知の赤の一覧（1 行 1 DFC） | `tests/` の根 |
| `tools/gate/run-gate.mjs` | vitest と Playwright の JSON の報告を既知の赤と突き合わせる | `tools/` |
| `docs/development-records/perf-pending.md` | 性能の測り待ちの一覧（1 行 1 CR: CR・着地の sha・触れた毎フレームの経路のファイル）。緑の走行が記録されたら消える | `docs/development-records/` |
| `docs/development-records/measurements/performance-runs.md` | 性能の走行の記録（1 走行 1 行: 日付・dist の sha・合否・`JDG-50` の段 0 との差・まとめて測った CR） | `docs/development-records/measurements/` |
| 検査 64 `check-purity-honesty.py`（＋ `purity-calls.mjs`） | 札が嘘をつかない | `.claude/skills/spec-graph-check/` |
| 検査 65 `check-unit-test-or-omission.py` | 省略の行の無い関数に単体試験が在る | 同上 |
| 検査 66 `check-perf-gate.py` | `playwright.config.ts` の `testIgnore` が、時間を測る `tests/nfr` の全ファイルを `GRS_PERF` の無い走行から外している。毎フレームの経路に触れた着地の CR が、測り待ちの一覧か走行の記録に在る | 同上 |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

### 3.1 仕様

| 旧 | 新 |
|---|---|
| Chapter 7 `:1781`「**仕様書に受け皿を持つテストの系統は 3 つとする（MUST）** —— 系統と、それを受ける章と、テストコードの置き場を 表 T-218 に示す。」 | 「確かめるものは 表 T-334 に従うこと（MUST）。確かめるものを受ける系統と置き場を 表 T-218 に示す。」（4.1 節） |
| 表 T-218 の欄「受け皿」（Chapter 8 の `USE_CASE_TEST` ほか） | 欄「確かめるもの」（表 T-334 の行）。問い 1 で案 B なら「受け皿」の欄を残して両方を持つ |
| 表 T-218 の `TS-6`（単体テスト。意味は下の段の「ユニットの内側を守る」） | 行は残す（⛔ 番号を振り直さない）。意味を「省略の表のどの行にも当たらない関数だけ」に |
| `:1797`〜`:1799`「単体の水準は仕様書の外で実施する。⚠️ 受け皿が無いことは、書かなくてよいという意味ではない —— 契約テストは継ぎ目を守り、単体テストはユニットの内側を守る。どちらも落ちれば工程が止まる。」 | 4.1 節の段（単体試験は原則として書かない、規則 04 の省略の表を指す） |
| 表 T-219 の `TW-1` 〜 `TW-3`（ノードと `TEST_RESULT` の `PASS` で合否） | 問い 1 の案 A: 表 T-334 の行と関門の走行で合否（4.1 節）。案 B: 今のまま |
| `:1816`〜`:1829` の 6 つの印（「Chapter 8 と Chapter 10 のケースは手で書くこと（MUST）」「Chapter 9 のケースは…生成物とすること（MUST）」「手で書いてはならない（MUST NOT）」「`tests/integration/` と `tests/system/` のテストは…持つこと（MUST）」「一致すること（MUST）」「手で直してはならない（MUST NOT）」） | 案 A: 退く（`DFC-311` の選択肢 ②、生成器を作らない）。案 B: 残し、生成器を書く |
| `08-10-test.md` の 8.1「⛔ いまは作らない。…品質が安定したら、仕様書に最低限の試験を書く」 | 4.2 節 |
| 同 9.1「⛔ いまは作らない。第八章と同じ理由と同じ代償である。」 | 4.2 節 |
| 同 10.1「未記入。`NON_FUNC_TEST` ノード…」 | 4.2 節。10.2 は変えない |
| ⭐ 変えない: `01-04-requirements.md:129`（Vitest と Playwright の分け方）・`:130`（置き場は Chapter 7 が定める） | 今のまま真 |
| ⭐ 変えない: `01-04-requirements.md:5294`「日付を欠く写しでのこの規約は、今は単体試験だけが守り」 | 今のまま。⛔ その単体試験は `UO-1` の例外（MSPDI の `Duration` と余裕日数、`EX-12`・`DV-8`）に当たるので、振り分け表で「残す」に入れること |

### 3.2 規則 04

| 旧 | 新 |
|---|---|
| 3.5 節「⛔ 新しい単体試験を書いてよいのは 2 つの場合だけ」（① 実物で測って直したものの戻り止め ② 仕様だけを読む体）と「⛔ これ以外の増産を禁じる。」 | 表 `UO`（4.3 節）。① は 6.2 節（`tests/system/user-reported-fixes.test.ts`）と `JDG-637` の移し先へ。② は 1 節の書き手の規則へ |
| 3.5 節の実測の表（2026-09-03） | 残す（記録） |
| 4 節の表（道具の一覧） | 残し、表 `GT` と検査 64・65・66 の行を足す |
| 5 節「⭐ 節目ごとに測るものと合否は仕様書 Chapter 7（表 T-042 / T-043）が持つ。」 | 残し、`JDG-605` の いつ／どう／誰 の表と、毎フレームの経路の置き場の表を足す（4.3 節） |
| 6.4 節「⛔ sample-schedule/ は .gitignore されているので、作業木には無い。親から写さないと FR-021 の条項が 1 本余分に落ちる」 | 消す（0.2 の 9 —— 追跡されている） |
| 6.7 節の後段「⚠️ 同じ形の罠がもう 1 つある —— `tests/unit/uf-36.test.ts` は作業木では必ず落ちる。…親の木からその 2 つのフォルダを写す。」 | XSD の規則（4.3 節）。⭐ `docs/spec/output/` の +3 の段は残す（検査 42 の罠は数え先を替えても src 側に残る） |

### 3.3 設定・道具・注記

| 旧 | 新 |
|---|---|
| `package.json` の `"e2e": "playwright test --pass-with-no-tests"` | `--pass-with-no-tests` を外す（波 2 で `tests/usecase` が 14 本を持った後） |
| `"guard:publish": "python tools/precheck.py --unpushed && npm run guard:commit"` | 表 `GT` の `GT-2` を打つ形へ（`vite build`・ユースケース試験・e2e・parity を足し、`tools/gate/run-gate.mjs` を通す） |
| `playwright.config.ts:12`「TS-1 holds none yet, which is why `npm run e2e` carries --pass-with-no-tests」 | 事実に合わせて書き直す |
| `vitest.config.ts` の `TS-6  tests/unit/  the inside of one unit, written by whoever implemented it` | 「省略の表が覆わない関数だけ。書くのは仕様だけを読む体」 |
| `tests/README.md:16` の `unit/` の行（`whoever implemented the unit`） | 同上 |
| 検査 39 `check-must-clause-coverage.py:231` の `os.walk(TESTS)`（`tests/` 全部） | `tests/contract`・`tests/system`・`tests/usecase` だけ（`JDG-637`） |
| 検査 42 `check-quoted-source.py:61` の `TREES = ('src', 'tests')` | `('src', 'tests/contract', 'tests/system', 'tests/usecase')` |

---

## 4. 書き直す所（案の文 —— 当てる体が旧・新の塊へ起こす）

### 4.1 Chapter 7（`05-07-design.md`）

表 T-219 の後ではなく、`:1781` の段の位置に置く。

> 確かめるものは 表 T-334 に従うこと（MUST）。確かめるものを受ける系統と置き場を 表 T-218 に示す。
>
> **表 T-334 — 確かめるもの**
>
> | 行 ID | 確かめるもの | 全数を持つ所 | 1 件の単位 | 系統（表 T-218） | 走らせ方 |
> | --- | --- | --- | --- | --- | --- |
> | VT-1 | 利用者の手順 | Chapter 3.2 の `USE_CASE` のすべて | `UC-xxx` 1 つにつき 1 本。<br>その `SCENARIO` の手順を頭から終わりまで押す | `TS-1` | 出荷ビルドの `dist/index.html` を file:// で開く |
> | VT-2 | 状態表の全行 | `_source/state-machines.json` の領域のすべて（表 T-250 の `SD-3`） | 領域 1 つにつき 1 本。<br>出来事 × いまの状態 のすべての組（表 T-285 の `RA-6`） | `TS-5` | 値だけで決まるので Vitest |
> | VT-3 | 性能 | 表 T-043 の、合否が「ゲート」の行 | 行 1 つにつき 1 件以上 | `TS-4` | 測定条件は 表 T-025。<br>合否は 表 T-043 の「正」の欄の要求 |
>
> ⭐ 数を本章に書かないのは、全数を持つ所が別にあるからである —— UC を足しても、領域を足しても、本表は変わらない。
> ⭐ `VT-3` が決めるのは何を測るかだけである。いつ測り、誰を呼ぶかは工程であり、本仕様書は定めない（表 T-042 の後の段「どの要求をどの節目で満たすかは、本仕様書は定めない」と同じ）—— `docs/development-rules/04-verification.md` の 5 節が持つ（`JDG-605`・`JDG-639`）。

`:1797` 〜 `:1799` を次へ:

> `TS-5` と `TS-6` が仕様書に受け皿を持たないのは、それが理由である —— 単体の水準は仕様書の外で実施する。
> 契約テストは継ぎ目と状態表（表 T-334 の `VT-2`）を守る。
> ⭐ 単体テストは原則として書かない —— 関数の内側は、上の系統の試験と、設計で決まる純粋性（表 T-060）が守る。
> 単体テストは、`docs/development-rules/04-verification.md` の省略の表のどの行にも当たらない関数にだけ書くこと（MUST）。
> ⚠️ 規則の向きは「省略してよい場合」を並べる側である —— 表に無いものは書く側へ倒れる。「書いてよい場合」を並べると、並べ忘れた関数が試験なしで通る。
> **どの系統も、落ちれば工程が止まる。**

表 T-218（案 A）:

| 行 ID | 系統 | 確かめるもの | 親に取るもの | テストレベル | 置き場 | ツール |
| --- | --- | --- | --- | --- | --- | --- |
| TS-1 | ユースケーステスト | 表 T-334 の `VT-1` | `UC-xxx` | System | `tests/usecase/` | Playwright |
| TS-2 | ソフトウェア仕様テスト | —— | `SWS-xxx` | Integration | `tests/integration/` | Vitest |
| TS-3 | ソフトウェア仕様テスト | —— | `SWS-xxx` | System | `tests/system/` | Playwright |
| TS-4 | 非機能テスト | 表 T-334 の `VT-3` | `NFR-xxx` | —— | `tests/nfr/` | Playwright |
| TS-5 | 契約テスト | 表 T-334 の `VT-2` と継ぎ目 | —— | Unit | `tests/contract/` | Vitest |
| TS-6 | 単体テスト | 省略の表が覆わない関数（上の段） | —— | Unit | `tests/unit/` | Vitest |

表 T-219（案 A）:

| 行 ID | 章 | ケースの起こし方 | 合格基準 |
| --- | --- | --- | --- |
| TW-1 | Chapter 8 | ノードを起こさない。<br>ケースは 表 T-334 の `VT-1` が決める | Chapter 3.2 の `UC-xxx` のすべてが `tests/usecase/` に 1 本を持ち、関門の走行で緑であること |
| TW-2 | Chapter 9 | ノードを起こさない | `tests/integration/` と `tests/system/` が関門の走行で緑であること |
| TW-3 | Chapter 10 | ノードを起こさない。<br>ケースは 表 T-334 の `VT-3` が決める | 表 T-043 のゲート行が、節目を閉じる走行で通ること |

> 結果を本仕様書へ写さないこと（MUST NOT） —— 結果は関門の走行の出力と `docs/development-records/measurements/` が持つ。2 か所に置くと必ずずれる（10.2 と同じ理由）。

### 4.2 `08-10-test.md`（案 A）

- 8.1 の引用の段 →「⭐ 本章はケースのノードを持たない。確かめるものは 表 T-334 の `VT-1`（Chapter 7）、置き場は 表 T-218 の `TS-1` が持つ。⛔ 章は畳まない —— 消すと「なぜ無いのか」が失われる。」
- 8.2 → 「結果は関門の走行の出力が持つ（表 T-219 の `TW-1`）。」
- 9.1 ／ 9.2 → 同じ形で `TW-2`。
- 10.1 → 「確かめるものは 表 T-334 の `VT-3`、合否は 表 T-043。」10.2 は変えない。

### 4.3 規則 `04-verification.md`

**1 節に 1 段を足す:**

> ⭐ 単体試験が要るとき（3.5 節の表のどの行にも当たらない関数）も、書くのは B —— 仕様だけを読む体である。⛔ その関数を書いた者が書いてはならない。

**3.5 節の「新しい単体試験を書いてよいのは 2 つの場合だけ」を次へ置き換える:**

> ### ⛔ 単体試験は「省略してよい場合」を並べ、どれにも当たらない関数だけに書く（`JDG-635`・`JDG-636`）
>
> ⛔ 規則の向きを逆にしてはならない —— 「書いてよい場合」を並べると、並べ忘れた関数が試験なしで通る。表に無いものは書く側へ倒れる。
>
> | 行 ID | 省略してよい場合 | 見分け方（機械が読むもの） | 代わりに守るもの | 裁定の札 |
> |---|---|---|---|---|
> | UO-1 | `@purity pure` ／ `semi-pure-a` の関数 | 札（07 の `R7.6`。層ごとの札は仕様の 表 T-060 の `LY-1`〜`LY-5` で設計が決める） | 札の検査（検査 64）と上位の試験 | P |
> | UO-2 | 生成物 | 生成器の出力（`npm run gen` が書くファイル） | `npm run gen:check` | S1 |
> | UO-3 | 分岐の無い関数 | 枝の数 0（検査 56 の `function-size.mjs`） | それを呼ぶ上位の試験 | S2 |
> | UO-4 | 上位の試験が分岐を全部通る | 契約・結合の試験だけで取った Vitest の網羅で、その関数の分岐が全部通る | 上位の試験 | S3 |
> | UO-5 | 結線（入口を関数へ繋ぐだけ） | 札 `@unit-test-omitted UO-5`。層が `Framework` | ユースケース試験（仕様の 表 T-334 の `VT-1`） | S4 |
> | UO-6 | export されない関数 | `export` が無い | それを呼ぶ export された関数の扱い | R1 |
> | UO-7 | 型で保証されること | 関数ではなく場合 —— 型で閉じた分岐・`never` の枝 | `npm run typecheck` | R2 |
> | UO-8 | 生成された表を引くだけのコード | 引く先が生成物で、引くほかに分岐が無い | `gen:check` と、その表の契約試験 | R3 |
> | UO-9 | 往復で戻る変換（MSPDI の取り込みと書き出し） | 札 `@unit-test-omitted UO-9` | 見本を読み・書き・読み直して元と比べる契約試験。⚠️ `npm run parity` は見本とアプリの突き合わせであって往復ではない | R4 |
> | UO-10 | 通らない分岐 | —— | ⛔ 試さずに消す | R5 |
> | UO-11 | 作り直しが決まったコード | 札 `@unit-test-omitted UO-11 <決めた CR>`。その CR が着地したら札も消える | 作り直した後の関数が、改めてこの表で振り分けられる | R6 |
>
> ⛔ **`UO-1` の例外 —— 外の約束と数を突き合わせる純粋関数は省略できない。** MSPDI の曜日の番号・`PT8H0M0S` の綴り・稼働日・丸め。単体試験か、表で回す契約試験を書く。関数の注釈に `@external-contract <仕様の行 ID>` を置いて名乗る。⚠️ 札が純粋でも、相手の約束を読み違えれば、どの上位の試験も同じ読み違いごと緑になる。

**3.9 節を足す（既知の赤・flaky・現状を固定した試験）:**

> - ⭐ 既知の赤は `tests/known-red.txt` に 1 行 1 DFC で置く（`DFC-nnn`・試験のファイル・件の名・必要なら `flaky`）。関門は、一覧に無い赤で止まる。一覧に在って緑になった行も止まる（`flaky` の行を除く）。⭐ 減らすのは調整役、⛔ 増やすのは利用者の OK（`JDG-641`）。
> - ⛔ flaky を retries で隠さない（`playwright.config.ts` と vitest の再試行は 0 のまま）。DFC を起こして直すか消す。それまでは一覧に `flaky` と付けて載せる（`JDG-642`）。
> - ⛔ 現状を固定しているだけの試験を一斉に棚卸ししない（`JDG-31`・`JDG-645`）。修正の途中で赤になったとき、覆う条項があればその条項を引かせ（行 ID か逐語）、条項に従って直す。無ければ消し、消したことを commit に書く。
> - ⭐ MSPDI の XSD（`docs/reference/mspdi/`）を読む試験は、XSD が無いとき、その理由とパスを名乗ってスキップする。⛔ 関門は根の作業木で回す —— 関門の走らせ手は XSD が無ければ止まる。⛔ XSD を repo に入れない（`JDG-644`）。

**4 節に表を足す:**

> | 行 ID | 関門 | 打つもの | 打つ口 |
> |---|---|---|---|
> | GT-1 | commit | `gen:check` ＋ vitest ＋ `check.sh` | `npm run guard:commit`（`precheck` と `typecheck` も含む） |
> | GT-2 | `refactor` へ push | `GT-1` ＋ `vite build` ＋ ユースケース試験（file://）＋ e2e ＋ `npm run parity` | `npm run guard:publish` |
> | GT-3 | `main` の早送り | `GT-2` ＋ その CR の場面を出荷ビルドで 1 回押す ＋ 利用者に問う（`JDG-61`） | 手 |
>
> ⭐ どの関門も `tools/gate/run-gate.mjs` を通し、既知の赤の一覧と突き合わせる（3.9 節）。⛔ どの関門も `GRS_PERF` を付けない（`JDG-640`・`JDG-643`）。

**5 節に段を足す:**

> ⛔ `tests/nfr` の時間を測る試験は `GRS_PERF=1` のときだけ走る —— `playwright.config.ts` の `testIgnore` が外す（`JDG-643`・`JDG-605`）。付けずに `npm run e2e` を打てば、その 2 ファイルは件として数えられない（`playwright test --list` で 0 件）。`nfr-004-single-file` は性能ではないので毎回走る。
>
> | 行 ID | 問い | 決まり（`JDG-605`） |
> |---|---|---|
> | GT-4 | いつ測るか | ① 節目を閉じるとき（仕様の 表 T-042）。② 毎フレームの経路（下の表）に触れた CR を `main` へ早送りする前。溜まっていれば 1 回にまとめて測る |
> | GT-5 | 触れたことを誰が立てるか | 機械 —— 検査 66 が、着地した CR の差分が下の表のファイルに触れていれば、`docs/development-records/perf-pending.md` に行を求める |
> | GT-6 | どう測るか | 他のセッションが止まっているとき（ListAgents の busy 0）、同じ dist の sha で `GRS_PERF=1` を付けて 1 回。合否は `JDG-50`（段 0 で測った値より悪くしない） |
> | GT-7 | 誰を呼ぶか | 利用者を呼ぶのは ① 赤（段 0 より悪い）② 節目を閉じるとき ③ 合格条件・測り方・段 0 の基準値を変えるとき、だけ。⭐ 緑は `docs/development-records/measurements/performance-runs.md` に 1 行残し、測り待ちの行を消して、事後に報告する |
>
> ⭐ 2026-07-18 の「性能テストするときは俺を呼べ」（RISK-001）は、`GT-7` の 3 つの場面に絞られた（`JDG-605`）。
>
> | 毎フレームの経路（5 節の 4 つ） | 置き場（仮） |
> |---|---|
> | レイアウト・幾何・当たり判定 | `src/entity/layout-engine/**` |
> | 描画 | `src/adapter/svg-renderer/**`・`src/adapter/screen-renderer/**` |
> | フレームの走行 | `src/framework/single-html-shell/frame-loop.ts` |

---

## 5. 機械検査

| 検査 | 何を赤にするか | 読む所 | 基準線 |
|---|---|---|---|
| 64（新、仮）札が嘘をつかない | `pure` ／ `semi-pure-a` の関数が、① `semi-pure-b` ／ `non-pure` の札を持つ関数を呼ぶ（import を解いて宣言の札を読む）、② `document`・`window`・`Date.now`・`Math.random` に触れる、③ `await` を持つ（`async` を含む） | `src/`（生成物を除く）。TypeScript の型検査器で呼び先を解く（`typescript` は devDependencies に在る） | 初回の数を調整役が登録し、下げるだけ（`JDG-520`）。⛔ 上げは利用者 |
| 65（新、仮）省略の無い関数に単体試験 | export された関数で、`UO-1`（`@external-contract` の無いもの）・`UO-2`・`UO-3`・`UO-4`・`UO-8` が機械で推せず、`@unit-test-omitted` も無いのに、その名を import する `tests/unit` のファイルが無い。`@external-contract` を持つのに、単体試験も契約試験も無い | `src/`、`tests/unit`・`tests/contract`、網羅のファイル | 同上 |
| 66（新、仮）性能の門と測り待ち | ① `tests/nfr` のうち `test.setTimeout` を既定より伸ばすファイルが、`playwright.config.ts` の `GRS_PERF` の無いときの `testIgnore` に入っていない。② 4.3 節の毎フレームの経路に触れた着地の CR が、測り待ちの一覧にも走行の記録にも無い | `playwright.config.ts`・`tests/nfr`・`git log` の差分・2 つの記録 | 0 |
| 39（数え先を替える） | 今のまま（逐語で持たれない MUST が増えたら赤）。数えるのは `tests/contract`・`tests/system`・`tests/usecase` だけ（`JDG-637`） | 同左 | ⛔ 上がる（0.2 の 6）—— 波 4 で利用者に問う |
| 42（数え先を替える） | 今のまま。`tests/` の側は同じ 3 つだけ | `src/` と同左 | 下がる（361 → 12 前後）—— 調整役 |

⚠️ 検査 64 が見えないもの（`NOT COVERED` に毎回出す）: 引数で渡された関数の呼び出し、`new Date()`・`performance.now()`（裁定が名指していない）、引数の書き換え（`R7.1` が禁じるが本書の範囲外）。
⚠️ 検査 65 は網羅のファイルが無いとき `UO-4` を推せない —— 緑ではなく「測っていない」と出す。
⭐ 壊して確かめる（規則 04 の 2 節、合わせた木で）: 検査 64 は `pure` の関数に `Date.now()` を 1 つ、検査 65 は `@external-contract` の関数の試験を 1 つ外す、検査 66 は `testIgnore` の 1 行を外す、測り待ちの 1 行を消す —— どれも赤になることを見てから戻す。

---

## 6. RISK-001 —— 性能の門は今、無条件に走る（前に立つ者が測り、本書が `e1b8bab2` で打ち直した）

- `playwright.config.ts:57` の `testMatch: ['usecase/**/*.test.ts', 'system/**/*.test.ts', 'nfr/**/*.test.ts']` が `tests/nfr` を拾う。
- `tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts:463`〜`:464` の `test.beforeAll` が `test.setTimeout(600_000)`。
- `tests/nfr/nfr-001-010-011-013-the-rest-of-chapter-7.test.ts:379`〜`:380` の `test.beforeAll` が `test.setTimeout(900_000)`。
- `grep -rn "GRS_PERF\|process.env\|test.skip\|\.skip(" tests/nfr` は 0 件。

⇒ `npm run e2e` を打つ者は誰でも、ほかの走行と重なる機械で性能の測定を起こしていた。`JDG-640` の `GT-2` は e2e を含むので、門が無いまま `GT-2` を効かせると、push のたびに測定が走る。⚠️ ここまでは `e1b8bab2` の記録である。

**直し（`JDG-643`・`JDG-605`）—— ⭐ 本書は当てない。** 調整役が根の木の `playwright.config.ts` に、`GRS_PERF=1` でないときに時間を測る 2 ファイルを外す `testIgnore` を置いた。`refactor` へは `CR-570` と一緒に着地する。調整役の測り: `playwright test --list` で、付けないとき `nfr-001`・`nfr-002` の件 0・`nfr-004` の件 8、付けたとき `nfr-001`・`nfr-002` の件 12。⚠️ 本書を書いた作業木（`e1b8bab2`）と `653b0738` の `playwright.config.ts` には、まだ `testIgnore` が無い —— 当てる前に、着地した木で `--list` を打ち直すこと。

**本書が足すのは 3 つだけ:** ① 測る時期・測り方・呼ぶ場面の規則（4.3 節の `GT-4`〜`GT-7`、04 の 5 節）。② 性能の測り待ちの一覧と走行の記録（2 節）。③ 検査 66（5 節）—— 設定が門そのものなので検査は要らない、とは読まない。`testIgnore` は 1 行消せば黙って外れ、`tests/nfr` に時間を測るファイルを足しても一覧に入らない。どちらも緑のまま測定が無条件に戻り、見つけるのは次に重なった走行である。

---

## 7. グラフ（`e1b8bab2`）

- `induced.py`（本書が名指す 25 の対象 —— 表 T-218・T-219・T-042・T-043・T-060・T-250・T-285・T-025、行 `TS-1`〜`TS-6`・`TW-1`〜`TW-3`・`LY-1`〜`LY-5`・`SD-3`・`RA-6`・`LM-19`）: 25 がすべて仕様に在り、内側の辺 4、閉路 0 ⇒ 1 つずつ書いてよい。
- `impact.py`: 表 T-218・T-219 を指す要求は 0 件（Chapter 7 の段だけが指す）。`TS-1`・`TS-4`・`TW-1` は指す所が 0。`SD-3` は 5.3・5.6 の 6 か所、`RA-6` は 0。表 T-042・T-043・T-060 は指すだけで書き換えない。
- ⚠️ 仕様の外の読み手（`TS-*`・`TW-*` を書く所、`git grep -E "\bTS-[1-6]\b|\bTW-[1-3]\b"`）: `playwright.config.ts`・`vitest.config.ts`・`tests/README.md`・`tests/contract/` の 9 ファイルの注記・`tests/integration/schedule-drawing.sws.test.ts`・規則 04 の 6.4。⭐ `TS-6` は退かせないので、検査 44（退いた ID を引く）は赤にならない。案 A で `TW-2` の意味が変わると、`schedule-drawing.sws.test.ts:42`・`:121`・`:2155` の注記が偽になる —— 波 3c が直す。

---

## 8. 数の予測（`e1b8bab2` で測った。当てた後に同じ数え方で突き合わせる）

| 数 | 前 | 後（案 A） | 内訳 |
|---|--:|--:|---|
| tables | 188 | 189 | ＋表 T-334 |
| figures | 28 | 28 | — |
| rows | 2361 | 2364 | ＋`VT-1`〜`VT-3` |
| uids | 162 | 162 | 案 B なら ＋14（`TC-xxx` を UC ごとに） |
| 仕様の MUST ／ MUST NOT の印（検査 39 の分母） | 2,136 | 2,132 | −6（3.1 節の 6 つ）＋2（4.1 節の 2 つ） |
| 登録簿の接頭辞 | 163 | 166 | ＋`VT`・`UO`・`GT` |

⚠️ 検査 39 の「持たれない」数は、仕様の段（波 0）では 2 つの新しい印の分だけ動く。⛔ 基準値は上げない —— 波 0 で、その 2 つを逐語で引く契約試験を同じコミットに入れる（`CR-569` の 7 節と同じ手）。単体の削除（波 3）で動く分は波 4 が扱う。

---

## 9. 波 —— 持ち場で割る（`CR-570` の着地の後）

| 波 | 持ち場（このファイルだけを書く） | 中身 | 体 |
|---|---|---|---|
| 0 | `docs/spec/**`（Chapter 7・`08-10-test.md`・`row-id-prefixes.json`・`A-appendix.md`）と `npm run gen` の出力、`docs/development-rules/04-verification.md`、`docs/development-records/perf-pending.md` と `measurements/performance-runs.md`（空の見出しだけ） | 3.1・3.2 節と 4 節の本文。番号を詰める（検査 62）。⭐ `GT-2` が効くのは波 2 の後。性能の門は `CR-570` と一緒に既に在る（`JDG-605`） | 仕様の体（Opus） |
| 1 | 振り分け表（10 節）だけ。コードも試験も書かない | `tests/unit` の全ファイルを 消す／移す／残す に分け、利用者に見せる（`JDG-645` の問 G ①） | 測りの体（Opus —— 判断が要る） |
| 2a | `tests/unit/dfc-*` と、移す先の `tests/system/`・`tests/contract/` の新しいファイル | 37 ファイルを移す（画面を押すものは system、値だけのものは contract）。中身の主張は変えない | 実装の体（Sonnet） |
| 2b | `tests/usecase/`（新しいファイルだけ） | UC 1 件につき 1 本（4.1 節の `VT-1`）。`docs/spec` だけを読む。⛔ 食い違いは直さず報告し、調整役が `defects.md` へ | ⭐ 仕様だけを読む試験の体。2a と別 |
| 3a | `tests/unit/**`（振り分け表が「消す」とした行だけ） | 削除 | 実装の体（Sonnet） |
| 3b | `.claude/skills/spec-graph-check/**`（検査 39・42・64・65・66、`check.sh`）と `docs/development-rules/09-tools.md` | 5 節 | 道具の体（Opus） |
| 3c | 「残す」試験の XSD のスキップ・`tests/known-red.txt`・`tools/gate/`・`package.json`・`playwright.config.ts`・`vitest.config.ts`・`tests/README.md`・`tests/integration/schedule-drawing.sws.test.ts` の注記 | 4.3 節、3.3 節。⛔ `tests/nfr/*` と `testIgnore` は触らない（調整役の持ち物、6 節）。`playwright.config.ts` は `TS-1` の注記だけ | 実装の体（Sonnet） |
| 4 | 基準線と測り待ち | 検査 42 を下げる・64〜66 を登録（調整役）。測り待ちの一覧が空でなければ、`GT-6` のとおり 1 回にまとめて測る（緑なら記録して事後に報告、赤なら利用者を呼ぶ）。検査 39 の引き上げは、0.2 の 6 の表を添えて利用者に問う（`JDG-637`） | 調整役 |

⭐ 波 2b の体への手引き（規則 04 の 6 節から）: file:// の保存は宿主のダイアログを `addInitScript` で差し替えて受け取る。開くのは落とす道（`DFC-569` は 2026-09-24 に配線済み）。`UC-012` の `Agent API` は `IC-20` で有効にする。例 `UC-002`: `sample-large-erp-program.ja.xml` を開き、「1. プログラム管理」を畳み、保存して開き直しても畳んだまま（`JDG-638`）。
⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。壊して確かめる試しは、合わせた木で回す。

---

## 10. 振り分け表 —— 別の測りが持つ

⭐ 本書は表を持たない。`CR-570` の後の木で、波 1 の体が測って作る（`JDG-645` の問 G ①、利用者に見せる）。

測り方:

1. `tests/unit` の各ファイルが import する `src` の関数を並べる。
2. 関数ごとに、4.3 節の表 `UO` の行を決める —— 札（`@purity`・`@external-contract`）、生成物か、`function-size.mjs` の枝の数、export の有無、契約・結合の試験だけで取った網羅（`npx vitest run tests/contract tests/integration --coverage`）。
3. ファイルごとに決める:
   - **移す** —— 名が `dfc-*`（37）。行き先は system か contract。
   - **残す** —— 試す関数のうち 1 つでも `UO` のどの行にも当たらない、または `@external-contract` に当たる（`01-04-requirements.md:5294` が名指す日付を欠く写しの試験を含む）。
   - **消す** —— それ以外。
4. 表の列: ファイル・件数・試す関数・当たった `UO` の行・振り分け・残すなら理由。合計の行に、消す件数と、検査 39 の「持たれない」数の予測（0.2 の 6 の手）を置く。

---

## 11. 仕様の外で直すもの・この変更でやらないこと

- ⛔ 新規の欠陥を探す試験を足さない（`JDG-31`）。ユースケース試験は `JDG-638` が求めたものに限る。
- ⛔ 仕様の MUST を逐語で引くためだけの試験を書かない（検査 39 の注記）。
- ⛔ 性能の数を変えない。`LM-19` と表 T-043 はそのまま。
- `docs/development-records/handoff.md` の該当行は、調整役が着地のときに書き直す（本書は書かない）。

---

## 12. 前に立つ者へ返す問い

⭐ 問う前に反証した: `rulings.md` の `JDG-25`・`JDG-31`・`JDG-635` 〜 `JDG-645`、台帳の `DFC-311`・裁定待ちの `PND-424`、仕様の Chapter 7・`08-10-test.md` を読んだ。下の 1 つは、どの条項もどの裁定も決めていない（起草のときの問い 2 —— 性能の門を先に当てるか —— は `JDG-605` が閉じた）。

1. **Chapter 8・9・10 に試験のノード（`TC-xxx` と `TEST_RESULT`）を置くか**（`DFC-311`・`PND-424`。`PND-424` は「推奨を出さない」のまま閉じていた）。`JDG-639` は「章は何を確かめるかを書く」と決めたが、その書き方は決めていない。
   - 案 A（推奨）: 章は表 T-334 を指すだけにし、ノードも Chapter 9 の生成器も作らない。3.1 節の 6 つの MUST ／ MUST NOT を退ける —— 結果が仕様とテストコードの 2 か所に載らない。`DFC-311` は選択肢 ② で閉じる。
   - 案 B: UC 14 件の `USE_CASE_TEST` を手で書き、Chapter 9 の生成器を作り、結果を `TEST_RESULT` に残す。uids が ＋14、生成器の仕事が 1 本増える。
   - 場面: 案 A では、「1. プログラム管理」を畳んで開き直す `UC-002` の試験が `tests/usecase/` に在ることが合否。案 B では、そのうえで Chapter 8 に `TC-` のノードと、実行日と証拠のパスを持つ `TR-` のノードが要る。

---

## 13. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-311` | 第 8・9・10 章が器のまま | 問い 1 の答えで閉じるか残す |
| （番号は調整役） | `npm run e2e` が性能の門を無条件に走らせる（6 節） | 調整役の `testIgnore`（`CR-570` と一緒）で閉じる。行を立てるかは調整役 |
| （番号は調整役） | `rowTree`（表 T-328）の状態表に契約試験が無い（0.2 の 3） | `CR-570` の着地で閉じていなければ立てる。本書の `VT-2` が求める |
| `JDG-635` 〜 `JDG-645`・`JDG-605` | 0.1 節の裁定 | `rulings.md` に記録済み（着地先は本書。`JDG-605` の門は `playwright.config.ts`） |

---

## 14. 測り方の再現

```
# the tree: e1b8bab2 (the session worktree), nothing written but this file

# use cases, state tables, test places, purity tags
grep -c "^\*\*UID\*\*: UC-" docs/spec/01-04-requirements.md                -> 14
python: state-machines.json regions[].table.id                              -> 9 tables
git ls-files tests/<dir> | wc -l   (unit 345, dfc-* 37, contract 27, system 29, nfr 3, integration 1)
git ls-files 'tests/unit/*.test.ts' | xargs cat | wc -l                     -> 201310
git grep -h -o -E "@purity +[a-z-]+" -- src | sort | uniq -c                -> 1502 / 1 / 111 / 336

# check 39 and 42 with a narrowed test tree: copy the script into the session
# scratchpad, set ROOT to the checkout, skip directories in its os.walk, print totals
#   all of tests/                      total 2136 held 828 unheld 1308
#   without tests/unit                 held 49  unheld 2087
#   tests/unit kept only for dfc-*     held 149 unheld 1987
#   contract + system + usecase only   held 46  unheld 2090
#   check 42: 361 -> 12 without tests/unit

# RISK-001
grep -n testMatch playwright.config.ts                                     -> :57
sed -n 463,464p tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts   -> setTimeout(600_000)
sed -n 379,380p tests/nfr/nfr-001-010-011-013-the-rest-of-chapter-7.test.ts -> setTimeout(900_000)
grep -rn "GRS_PERF\|process.env\|test.skip\|\.skip(" tests/nfr             -> 0

# identifiers and counts
md-checks.py                                   -> tables=188 figures=28 rows=2361 uids=162
table headings **表 T-nnn —** in docs/spec     -> largest T-329
row-id-prefixes.json prefixes                  -> 163 ; VT UO GT used nowhere under docs/
check.sh section numbers                       -> largest 63

# graph
python .claude/skills/spec-graph-check/induced.py <the 25 objects of section 7>  -> 25/25, 4 edges, 0 cycles
python .claude/skills/spec-graph-check/impact.py TS-1 .. TS-6 TW-1 .. TW-3 T-218 T-219 RA-6 SD-3 T-042 T-043 T-060
```
