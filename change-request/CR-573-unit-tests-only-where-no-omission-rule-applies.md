# CR-573 — 試験の方針 —— 仕様は「何を確かめるか」を表で持ち、単体試験は省略の表が覆わない関数だけに書く

> 起草の状態: 起草した（2026-09-26）。利用者の裁定 `JDG-635` 〜 `JDG-645` と、起草の途中で下りた `JDG-605`（性能の試験を測る時期・測り方・利用者を呼ぶ場面）（逐語は 0.1 節）を当てる本文の案である。本書は裁定を決め直さない —— 裁定が決めていないことだけを 12 節で問う。
> ⭐ 当てた状態（2026-09-26、`95f162e8` の上）: **波 0 を当てた** —— `JDG-606`（12 節の問い 1 は案 A）と `JDG-607`（表 T-334 と 表 T-218 を 1 つの JSON の原稿にする）を合わせて当てた（9 節）。⛔ コード・試験・基準線はまだ 1 文字も変えていない —— それは波 1 〜 4 である。
> ⭐ 波 1 〜 3 を当てた記録（2026-09-26）: 振り分け表からの逸脱 2 つ・生成器の変更・それに追随した仕様と規則の書き換えは 15 節。
> 読んだ木: `b6292bb0`（`CR-570` 着地後、`e1b8bab2` を測り直した木。測り方は 14 節）。⚠️ 先の草案は `e1b8bab2` で測っていた —— 本節と 8・10・14 節の数はこの再測定で置き換えた。旧い数は各節に「旧」として残す。
> ID の帯: `CR-573` と `JDG-635` 〜 `JDG-645` は調整役が予約した（`rulings.md` の同日の節）。波 0 が作った名（表 T-334、接頭辞 `VT`・`UO`・`GT`・`PW`、原稿と生成器と記録のファイル）は当てるときに詰めた（2 節）。検査の番号・札・`tests/` と `tools/gate/` のファイル名は仮のまま —— 当てる波が詰める。台帳の番号の帯は受けていない。
> ⛔ 当てる順: `CR-570` の着地の後（`JDG-645` の問 G）。`CR-570` は `tests/` と `src/` を大きく書き換えている最中であり、振り分け表（10 節）はその後の木でしか測れない。
> 閉じるもの: `DFC-311`（第 8・9・10 章が器のまま）—— `JDG-606` で案 A に決まり、波 0 で閉じた（13 節）。性能の門が無条件に走る件（6 節）は、調整役が `playwright.config.ts` の `testIgnore` で閉じ、`CR-570` と一緒に着地する（`JDG-605`）—— 本書はその門を当てない。

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
| `JDG-606` | 「試験の章については提案通りでOK。」（12 節の問い 1 への答え。推奨は案 A） | Chapter 8・9・10 は表 T-334 を指すだけにし、試験のノードも `TEST_RESULT` も生成器も置かない。試験の章の MUST ／ MUST NOT の 6 か所を退役させ、`DFC-311`（`PND-424`）を閉じる | 4.1・4.2 節を案 A で当てた（波 0）。12 節の問い 1 は閉じた |
| `JDG-607` | 「JSON化しない？ そっちの方がこの後楽でしょ？_assets に生成して 本文は参照すれば、人間も見やすいし。 意見くれたし」「提案通りとしろ。  ただし、適用時期は司令塔と協議して決めろ。」 | 表 T-334 と 表 T-218 を 1 つの原稿 `docs/spec/_source/` の JSON にし、生成器で `docs/spec/_assets/` の表へ出す。本文（Chapter 7）は参照するだけ。⛔ 04 の省略の表と関門の表は JSON にしない。協議の結果: 波 0 に入れ、Chapter 7 を 1 回だけ触る | 原稿 `_source/verification.json`・形 `_source/verification.schema.json`・生成器 `_source/verification_json_to_md.py`・刷り物 `_assets/tbl-verification.md`（1 節・2 節） |
| `JDG-644` | 同上（問 E XSD） | XSD が無いときは明示してスキップ。関門は根の作業木で回す。XSD は repo に入れない | 4.3 節 |
| `JDG-645` | 同上（問 F・問 G） | F: 現状を固定している試験の一斉の棚卸しはしない。赤になったとき、条項があれば引かせ、無ければ消す。G: `CR-570` の後に ①振り分け表 → ②`dfc-*` の移動とユースケース試験 → ③単体の削除・検査の切り替え・`@purity` の検査 → ④基準線 | 4.3 節、9 節 |

### 0.2 調べた結果（`e1b8bab2`）

1. **試験の章は 2 か所にある。** 方針と表（表 T-042・T-043・T-218・T-219）は `05-07-design.md` の Chapter 7（テスト戦略、`:1714` 〜 `:1829`）、ケースの器は `08-10-test.md` の Chapter 8・9・10（88 行、3 章とも引用の段だけ）。Chapter 8.1 は今「⛔ いまは作らない」と書いている —— `JDG-638` と正面から食い違う。
2. **ユースケースは Chapter 3.2 に 14 件**（`01-04-requirements.md` の `**UID**: UC-` を数えた。番号は `UC-001` 〜 `UC-014`、並びは `UC-010` の次が `UC-014`）。どれも `SCENARIO` と `EXTENSIONS` を持つ。`tests/usecase/` は存在しない。`npm run e2e` は `--pass-with-no-tests` でその空をごまかしている（`package.json`）。
3. **状態表は 9 つ**（`_source/state-machines.json` の `regions`）—— 表 T-280・T-286・T-289・T-290・T-292・T-293・T-295・T-296・T-328。⛔ 旧: 「契約試験は 8 つに在り、`rowTree`（表 T-328）には無い」（`e1b8bab2`）。**`b6292bb0` では 9 つとも契約試験に在る** —— `tests/contract/tree-state-machine.contract.test.ts` が `rowTree`（表 T-328、`CR-570` が置いた）を持ち、55 件が緑（`vitest run` で実測）。⇒ この指摘は取り下げる。⭐ 状態表の全組を契約試験で結ぶことは、仕様が既に求めている —— 表 T-250 の `SD-3` と表 T-285 の `RA-6`。
4. **試験の置き場**（`git ls-files`、`b6292bb0`）: `tests/unit` 345 ファイル・201,302 行（旧 201,310。うち `dfc-*` 37、変わらず）、`tests/contract` 28（旧 27、＋1）、`tests/system` 33（旧 29、＋4）、`tests/nfr` 3、`tests/integration` 1。⚠️ 単体の件数は実測した —— `vitest run tests/unit`: 338 `*.test.ts` ファイル（12 失敗）、8,224 件（8,201 通過・1 失敗・4 期待された失敗・18 skip）。旧稿の 6,404 は `JDG-635` の前の見積り。⭐ `sort.py`（10 節）の正規表現によるケース数え（6,420）は `it.each` やループで生やす `it(...)` を数え漏らす（`tests/contract/tree-state-machine.contract.test.ts` は静的に 6 だが実行すると 55）ので、件数の debt を測るときは `vitest run` の実数を使うこと。
5. **`@purity` の札**（`git grep -o -E "@purity +[a-z-]+" -- src`、`b6292bb0`）: `pure` 1,507（旧 1,502、＋5）／ `semi-pure-a` 1（変わらず）／ `semi-pure-b` 111（変わらず）／ `non-pure` 336（変わらず）—— `rulings.md` の数と一致した。
6. **検査 39 は、ほぼ単体試験だけで持たれている。** ⛔ 旧稿（`e1b8bab2`）の表は取り下げる —— **`b6292bb0` では検査 39 自身の基準線がすでに 1,286 に引かれており（`.claude/skills/spec-graph-check/must-clause-coverage-baseline.txt`）、下の実測と一致する。** 検査 39 の本体は改変せず現在木でそのまま回し、次にスクラッチパッドの木のコピー（`docs/・tests/・src/` と検査 39・42 本体だけを複製、リポジトリ自体は複製しない）で `tests/unit` を丸ごと消した木、`tests/unit` を消して `dfc-*` だけ残した木のそれぞれで回した:

   | 数える試験 | MUST ／ MUST NOT | 逐語で持たれる | 持たれない |
   |---|--:|--:|--:|
   | `tests/` 全部（今の検査、`b6292bb0` のまま） | 2,137 | 851 | 1,286 |
   | `tests/unit` を丸ごと消す | 2,137 | 63 | 2,074 |
   | `tests/unit` のうち `dfc-*` だけを残す | 2,137 | 163 | 1,974 |

   （旧稿の値: 全部 2,136/828/1,308、単体除く 2,136/49/2,087、`dfc-*` のみ残す 2,136/149/1,987 —— `e1b8bab2` 測定）
   ⚠️ MUST/MUST NOT の総数が 2,136 → 2,137 と 1 増えている（本書は理由を追っていない。`CR-570` 着地の間の仕様編集による）。⇒ 単体を消すと、持たれない数は 1,286 から 2,074（`dfc-*` を system／契約へ移した後は 1,974）へ上がる。**上げは利用者の OK**（`JDG-637`、規則 04 の 6.3）—— 波 4 で、この表を添えて問う。
7. **検査 42 は、ほぼ単体試験の注記である。** 同じ手で、現在木のまま（`b6292bb0` の基準線どおり）324、`tests/unit` を丸ごと消すと 10、`tests/unit` を消して `dfc-*` だけ残すと 17（`--list` の実数。旧稿は「361 → 12」、`e1b8bab2` 測定）。下げは調整役が問わずにしてよい（`JDG-520`）。
8. **`npm run parity` は MSPDI の往復ではない。** ⭐ `b6292bb0` で再確認: 変わらず真である —— `tools/parity/check.mjs` は MSPDI/XML を 1 度も import しない（見本とアプリを同じ盤で並べて比べる道具、規則 04 の 3.6）。⇒ 省略の R4 を「parity が覆う」と読むと穴が開く（3.3 節・4.3 節の `UO-9`）。⚠️ 実行結果は別件として記録する: `node tools/parity/check.mjs` を回すと 0/75 ステップが一致し 75/75 が「一致も、開いている不具合の指定も無く食い違う」（約 1 分半）。この食い違いの原因はここでは調べていない —— 波 4 の前に別途、調整役が見ること。
9. **規則 04 の 6.4 の 1 行は古い。** ⭐ `b6292bb0` で再確認: 変わらず真である ——「`sample-schedule/` は `.gitignore` されているので、作業木には無い」とあるが、`git ls-files sample-schedule` は今も 9 ファイルを返す（`.gitignore:83` が 2026-09-12 からの公開を書く）。ERP の見本 `sample-large-erp-program.ja.xml` の「1. プログラム管理」は今も在る。
10. **性能の門はもう無条件には走らない —— 6 節が前提としていたことは、`b6292bb0` ではすでに直っている。** ⛔ 旧稿（`e1b8bab2`・`653b0738`）は「`playwright.config.ts` にまだ `testIgnore` が無い」と書いていたが、`b6292bb0` の `playwright.config.ts:55-67` は `GRS_PERF=1` でない限り `PERFORMANCE_GATES`（`nfr-001-010-011-013-the-rest-of-chapter-7.test.ts`・`nfr-002-003-frame-time-is-the-interval.test.ts`）を `testIgnore` している。実測（`GRS_PERF` を付けずに `playwright test --list`）: `nfr-001`・`nfr-002` は 0 件、`nfr-004-single-file.test.ts` は 5 件、`tests/system` 込みで総計 185 件・30 ファイル。⇒ 6 節の直しは `CR-570` と一緒にすでに着地している。本書が 6 節に足すつもりだった 3 つ（測る時期・測り方・呼ぶ場面の規則、測り待ちの一覧、検査 66）のうち、門そのもの（`testIgnore`）はもう「本書が当てる」対象ではない —— 6 節は着地の事実を記録する節に書き替える。
11. **⚠️ `sort.py`（10 節）の keep-exception 一覧を読み直すと、9 件のうち 1 件は名指しの理由が偽だった。** `cr-432-edit-task-branches-the-spec-decides.test.ts` は、道具が挙げた唯一の exception 理由が `MSPDI_NAMESPACE`（`'http://schemas.microsoft.com/project/2007'`、ただの名前空間の文字列定数）だけである。これは数の変換を行う関数ではなく、外の約束と突き合わせる純粋関数（`UO-1` の例外）にも当たらない —— 定数がそのまま合っているかは import した側の読み手が見るまでもない。実際のファイルの他の import（`cycleTaskPlanActualState`・`editTask`、いずれも `pure`）も例外域ではない。⇒ **`cr-432` は keep-exception ではなく delete に振り直す。**
    ⛔ もう 1 つ見つけた —— `sort.py` 自身の見落とし（`NAMED_RE` の正規表現が、波括弧の中の名を非重複マッチで捌くため、2 個組の分割代入 `{ A, B }` の B 側を典型的に読み落とす。3 個以上でも中間の名が落ちる場合がある）。`cr-567-an-imported-leaf-task-sits-on-its-parents-row.test.ts` の理由欄も `MSPDI_NAMESPACE` だけを挙げるが、実ファイルは `{ MSPDI_NAMESPACE, documentFromMspdi }` を import しており `documentFromMspdi`（本物の MSPDI 変換関数）が読み落とされていた。この 1 件は結果としては keep-exception のままで正しい（`documentFromMspdi` が正しい理由）。⚠️ この読み落としは他のファイルの keep-impure／delete の判定にも紛れている可能性があり、本書はそこまで洗い直していない —— 波 1 の体は `sort.py` を使う前に `NAMED_RE` を直すか、2 個以上の分割代入を持つ行を手で見直すこと。

### ① `CH-` / `GL-` のどれを前へ進めるか

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
| `docs/spec/05-07-design.md` の Chapter 7 | 表 T-218 を本文から出し、`_assets/tbl-verification.md` の 表 T-334 と 表 T-218 を指す段へ。`TS-6` の意味、その後の段。表 T-219 を案 A へ、Chapter 9 の生成の段を退ける（`JDG-606`） | 4.1 |
| `docs/spec/_source/verification.json`（新）・`verification.schema.json`（新）・`verification_json_to_md.py`（新）と刷り物 `docs/spec/_assets/tbl-verification.md`（新） | 表 T-334 と 表 T-218 の原稿・形・生成器（`JDG-607`）。生成器は 表 T-218 に無い `TS` を名指す 表 T-334 の行を拒み、表 T-218 の「確かめるもの」の欄を 表 T-334 から引く。`package.json` の `gen:verification` ／ `gen:verification:check` と `gen` ／ `gen:check` の鎖に入れた | 4.1 |
| `docs/spec/08-10-test.md` | 冒頭と 8.1・8.2・9.1・9.2・10.1 の引用の段を、表 T-334 ／ T-218 ／ T-219 を指す段へ。10.2 の「書くときの形」（`TEST_RESULT` ノード）だけを、記録へ足す段へ | 4.2 |
| `docs/spec/_source/row-id-prefixes.json` | `VT`・`UO`・`GT`・`PW` を登録（刷り物 `_assets/tbl-row-id-prefixes.md` は `npm run gen`） | 2 |
| `docs/development-records/changelog.md` | 変更履歴に 1 行（版 2.73）。⚠️ 草案は `A-appendix.md` と書いていたが、変更履歴は 2026-09-11 から `changelog.md` に在る | — |
| `docs/development-records/defects.md`・`fixed-defects.md`・`pending-decisions.md` | `DFC-311` を `実測済` にして `fixed-defects.md` へ移す。`PND-424` の推奨の欄に `JDG-606` を足す（`裁定済` のまま） | 13 |
| `.claude/skills/spec-graph-check/check.sh` の 27・`check-provenance.py`（検査 21）・`docs/development-rules/09-tools.md` の 5 節 | 新しい生成器の `--check` を門に入れ、刷り物が原稿を名乗ることを検査 21 に足し、目録に 1 行 | 1 |
| `docs/development-rules/04-verification.md` | 1・3.5・4・5・6.4・6.7 節、新しい節 3.9（既知の赤・flaky・現状を固定した試験・XSD） | 4.3 |
| `docs/development-rules/09-tools.md` | 新しい検査 3 本と、数え先を替えた検査 39・42 | 5 |
| `.claude/skills/spec-graph-check/` | 検査 39・42 の数え先、検査 A・B・C（仮）、`check.sh` | 5 |
| `docs/development-records/perf-pending.md`（新）・`docs/development-records/measurements/performance-runs.md`（新）・`docs/development-records/README.md` | 性能の測り待ちの一覧と、緑の走行の 1 行の記録（`JDG-605`）。波 0 では役の見出しと空の表だけ。README の置き場の一覧に 2 行 | 4.3・6 |
| ⭐ 触らない: `tests/nfr/*` と `playwright.config.ts` の `testIgnore` | 門は調整役が `CR-570` と一緒に当てる（`JDG-605`） | 6 |
| `tests/unit/**` | 振り分け表のとおり 消す／移す／残す | 9・10 |
| `tests/usecase/**`（新） | UC 1 件につき 1 本 | 9 |
| `tests/known-red.txt`（新、仮）・`tools/gate/`（新、仮） | 既知の赤の一覧と、それを読む関門の走らせ手 | 4.3 |
| `package.json`・`playwright.config.ts`・`vitest.config.ts`・`tests/README.md` | `--pass-with-no-tests` を外す、`guard:publish` を伸ばす、`TS-*` を書く注記 | 3.3 |

---

## 2. 新しい識別子（波 0 の名は当てるときに詰めた。ほかは仮）

⭐ 測った日: 2026-09-26、`e1b8bab2`。再測定: 同日、`b6292bb0`（`CR-570` 着地後）。
⭐ **当てる直前の再測定（規則 02 の 2.5 節）: 2026-09-26、`95f162e8`** —— 見出し `**表 T-nnn —` の番号は `T-329` まで、`CR-571` が `T-330` 〜 `T-333` を名乗っており、`T-334` を名乗る者はほかに無かった。接頭辞 `VT`・`UO`・`GT`・`PW` は `row-id-prefixes.json` にも 3 つの木（`docs/spec`・`docs/development-records`・`docs/development-rules`）の `| XX-n |` にも無かった。
⭐ **当てた後の木（同日）**: 仕様の表の番号の最大は `T-334`（`_assets/tbl-verification.md` の見出し）。接頭辞の登録簿は 167 件（本書が `VT`・`UO`・`GT`・`PW` の 4 つを足した）。
⚠️ **草案は接頭辞を 3 つと書いていた。** 草案の `GT-4` 〜 `GT-7` は関門ではなく、性能を測る時期・測り方・呼ぶ場面の決まりである —— 1 つの接頭辞に 2 つの意味を持たせない（行 ID の接頭辞は 1 つの並びに 1 つ）ので、`PW-1` 〜 `PW-4` に分けた。`GT` は `GT-1` 〜 `GT-3` の 3 行である。
- 検査の番号は `check.sh` の `section` の最大が 63。本書は仮に 64・65・66 を使う（波 3b が当てるときに詰める）。

| 名 | 何か | 置き場 |
|---|---|---|
| 表 T-334 ／ `VT-*` | 確かめるもの（Verification Target）。当てた | 原稿 `_source/verification.json` → `_assets/tbl-verification.md`。Chapter 7 は指すだけ（`JDG-607`） |
| 表 T-218 ／ `TS-*`（既存） | テストの系統。本文から原稿へ移した。行は振り直していない | 同上 |
| `UO-*` | 単体試験を省略してよい場合（Unit-test Omission）。当てた（`UO-1` 〜 `UO-11`） | `04-verification.md` の 3.5 節 |
| `GT-*` | 関門（Gate）。当てた（`GT-1` 〜 `GT-3`） | `04-verification.md` の 4 節 |
| `PW-*` | 性能の測り（Performance Watch）。当てた（`PW-1` 〜 `PW-4`。草案の `GT-4` 〜 `GT-7`） | `04-verification.md` の 5 節 |
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
| 表 T-218 の欄「受け皿」（Chapter 8 の `USE_CASE_TEST` ほか） | 欄「確かめるもの」（表 T-334 の行）。⭐ 当てた形（`JDG-607`）: 表 T-218 は `_assets/tbl-verification.md` へ移り、この欄は原稿に書かず 表 T-334 の各行の `verifiedBy` から生成のたびに引く |
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

⭐ **当てた形（`JDG-607`）**: 下の 表 T-334 と 表 T-218 は本文に書かず、`_source/verification.json` から `_assets/tbl-verification.md` へ生成した。本文は `:1781` の段の位置で「確かめるものは `_assets/tbl-verification.md` の 表 T-334 に従うこと（MUST）」と指し、その後に下の 2 つの ⭐ の段を置いた。表 T-219 と後の段は案 A のとおり本文に在る（`JDG-606`）。
⚠️ 旧 `:1794` 〜 `:1795` の文法の段（テストレベルの欄を持つのは `TS-2` と `TS-3` だけ）も退けた —— 案 A ではどの行も書き込む先を持たないので、「本仕様書は試験のノードを持たない —— テストレベルの欄は読む者のための注記」の 1 文に替えた。

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
- 10.1 → 「確かめるものは 表 T-334 の `VT-3`、合否は 表 T-043。」
- ⚠️ 草案は「10.2 は変えない」と書いていたが、10.2 の「書くときの形: `TEST_RESULT` ノードを並べる」は `JDG-606`（`TEST_RESULT` を置かない）と食い違う。⇒ その 2 行だけを「節目ごとに再計測し、結果は `docs/development-records/measurements/` に足す」に替えた。10.2 の残りは変えていない。
- 冒頭の「この文書はまだ器である」も、ノードを持たないと言う 1 段に替えた。

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

⭐ 当てた形: 下の表の 4 行は `PW-1` 〜 `PW-4` として当てた（2 節）。`GT-5` の「検査 66」は、検査が入る波 3b までは手で行を足す、と書いた。

**5 節に段を足す:**

> ⛔ `tests/nfr` の時間を測る試験は `GRS_PERF=1` のときだけ走る —— `playwright.config.ts` の `testIgnore` が外す（`JDG-643`・`JDG-605`）。付けずに `npm run e2e` を打てば、その 2 ファイルは件として数えられない（`playwright test --list` で 0 件）。`nfr-004-single-file` は性能ではないので毎回走る。
>
> | 行 ID | 問い | 決まり（`JDG-605`） |
> |---|---|---|
> | PW-1 | いつ測るか | ① 節目を閉じるとき（仕様の 表 T-042）。② 毎フレームの経路（下の表）に触れた CR を `main` へ早送りする前。溜まっていれば 1 回にまとめて測る |
> | PW-2 | 触れたことを誰が立てるか | 機械 —— 検査 66 が、着地した CR の差分が下の表のファイルに触れていれば、`docs/development-records/perf-pending.md` に行を求める |
> | PW-3 | どう測るか | 他のセッションが止まっているとき（ListAgents の busy 0）、同じ dist の sha で `GRS_PERF=1` を付けて 1 回。合否は `JDG-50`（段 0 で測った値より悪くしない） |
> | PW-4 | 誰を呼ぶか | 利用者を呼ぶのは ① 赤（段 0 より悪い）② 節目を閉じるとき ③ 合格条件・測り方・段 0 の基準値を変えるとき、だけ。⭐ 緑は `docs/development-records/measurements/performance-runs.md` に 1 行残し、測り待ちの行を消して、事後に報告する |
>
> ⭐ 2026-07-18 の「性能テストするときは俺を呼べ」（RISK-001）は、`PW-4` の 3 つの場面に絞られた（`JDG-605`）。
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

## 6. RISK-001 —— 性能の門（`playwright.config.ts` の `testIgnore`）は `b6292bb0` ではすでに着地している

**旧稿の記録（`e1b8bab2`・`653b0738`、当時まだ `testIgnore` が無かった木）:**

- `playwright.config.ts:57` の `testMatch: ['usecase/**/*.test.ts', 'system/**/*.test.ts', 'nfr/**/*.test.ts']` が `tests/nfr` を拾う。
- `tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts:463`〜`:464` の `test.beforeAll` が `test.setTimeout(600_000)`。
- `tests/nfr/nfr-001-010-011-013-the-rest-of-chapter-7.test.ts:379`〜`:380` の `test.beforeAll` が `test.setTimeout(900_000)`。
- `grep -rn "GRS_PERF\|process.env\|test.skip\|\.skip(" tests/nfr` は 0 件。
- ⇒ `npm run e2e` を打つ者は誰でも、ほかの走行と重なる機械で性能の測定を起こしていた。

**`b6292bb0` で確かめた現状 —— 直り済み。** `playwright.config.ts:55`〜`:67` はすでに次を持つ:

```
const PERFORMANCE_GATES = [
  'nfr/nfr-001-010-011-013-the-rest-of-chapter-7.test.ts',
  'nfr/nfr-002-003-frame-time-is-the-interval.test.ts',
]
const measuresPerformance = process.env['GRS_PERF'] === '1'
...
testIgnore: measuresPerformance ? [] : PERFORMANCE_GATES,
```

実測（`b6292bb0`、`playwright test --list`）: `GRS_PERF` を付けないとき `nfr-001`・`nfr-002` は 0 件、`nfr-004-single-file.test.ts` は 5 件（性能ではないので毎回走る）、`tests/system` を含めて総計 185 件・30 ファイル。⇒ `JDG-643`・`JDG-605` の直しはすでに `CR-570` と一緒に `refactor` へ着地しており、本書が「当てない」と書いていたものは当たった。

**本書が今も足すべきなのは 3 つ（門そのものは対象から外れる）:** ① 測る時期・測り方・呼ぶ場面の規則（4.3 節の `PW-1`〜`PW-4`、04 の 5 節）—— `testIgnore` は在るが、この規則の文はまだ無い。② 性能の測り待ちの一覧と走行の記録（2 節）—— まだ無い。③ 検査 66（5 節）—— まだ無い。`testIgnore` は 1 行消せば黙って外れ、`tests/nfr` に時間を測るファイルを足しても一覧に入らない。どちらも緑のまま測定が無条件に戻り、見つけるのは次に重なった走行である、という理由は今も生きている——検査 66 が要る理由は「門が無い」からではなく「門は消せる／すり抜けられる」からである。

---

## 7. グラフ（`e1b8bab2`）

- `induced.py`（本書が名指す 25 の対象 —— 表 T-218・T-219・T-042・T-043・T-060・T-250・T-285・T-025、行 `TS-1`〜`TS-6`・`TW-1`〜`TW-3`・`LY-1`〜`LY-5`・`SD-3`・`RA-6`・`LM-19`）: 25 がすべて仕様に在り、内側の辺 4、閉路 0 ⇒ 1 つずつ書いてよい。
- `impact.py`: 表 T-218・T-219 を指す要求は 0 件（Chapter 7 の段だけが指す）。`TS-1`・`TS-4`・`TW-1` は指す所が 0。`SD-3` は 5.3・5.6 の 6 か所、`RA-6` は 0。表 T-042・T-043・T-060 は指すだけで書き換えない。
- ⚠️ 仕様の外の読み手（`TS-*`・`TW-*` を書く所、`git grep -E "\bTS-[1-6]\b|\bTW-[1-3]\b"`）: `playwright.config.ts`・`vitest.config.ts`・`tests/README.md`・`tests/contract/` の 9 ファイルの注記・`tests/integration/schedule-drawing.sws.test.ts`・規則 04 の 6.4。⭐ `TS-6` は退かせないので、検査 44（退いた ID を引く）は赤にならない。案 A で `TW-2` の意味が変わると、`schedule-drawing.sws.test.ts:42`・`:121`・`:2155` の注記が偽になる —— 波 3c が直す。

---

## 8. 数の予測（`b6292bb0` で測り直した。旧稿は `e1b8bab2` 測定。当てた後に同じ数え方で突き合わせる）

| 数 | 前（`b6292bb0`、旧 `e1b8bab2`） | 後（案 A） | 内訳 |
|---|--:|--:|---|
| tables | 188（変わらず） | 189 | ＋表 T-334 |
| figures | 28（変わらず） | 28 | — |
| rows | 2361（変わらず） | 2364 | ＋`VT-1`〜`VT-3` |
| uids | 162（変わらず） | 162 | 案 B なら ＋14（`TC-xxx` を UC ごとに） |
| 仕様の MUST ／ MUST NOT の印（検査 39 の分母） | 2,137（旧 2,136、＋1。理由は追っていない） | 2,133 | −6（3.1 節の 6 つ）＋2（4.1 節の 2 つ） |
| 登録簿の接頭辞 | 163（変わらず） | 166 | ＋`VT`・`UO`・`GT` |

⭐ **当てた後の実測（2026-09-26、波 0 の後の作業木。`md-checks.py` と検査 39）**: tables 189・figures 28・rows 2364・uids 163・MUST ／ MUST NOT の印 2,133・登録簿の接頭辞 167。
⚠️ 予測との差は 2 つで、どちらも数え落としである —— ① uids は 162 → 163: 新しい刷り物 `_assets/tbl-verification.md` の `**UID**: DOC-TBL-VERIFICATION` を数え落とした（刷り物は他の `tbl-*.md` と同じく UID を持つ）。② 接頭辞は 166 → 167: `PW` を分けた 1 つ（2 節）。
⚠️ 印の 2,133 は予測どおりだが、内訳は予測と違う —— 退けた印は 6 ではなく 7（`:1781` の「3 つとする（MUST）」を 3.1 節の表は置き換えとして挙げながら、−6 に数えていなかった）、足した印は 2 ではなく 3（4.1 節の案に「結果を本仕様書へ写さないこと（MUST NOT）」が在る）。−7 ＋ 3 ＝ −4。
⭐ 検査 39 の「持たれない」数は 1,286 → 1,282 に下がった（退けた 7 つはどれも持たれていなかった。足した 3 つも持たれていない）。⇒ 契約試験を足さずに緑である —— 本節の次の段が言う「その 2 つを逐語で引く契約試験」は要らなかった（11 節の「MUST を逐語で引くためだけの試験を書かない」とも合う）。下げは調整役（`JDG-520`）。
⚠️ **検査 42 は 324 → 333 で赤になる**（波 0 の後の作業木）—— 退けた文を逐語で引く `tests/unit` のコメントが 7 ファイルに 9 か所ある（`dfc-286`・`dfc-288`・`dfc-294`・`dfc-337` が旧 表 T-218 の `TS-6` の行を、`t-023a-ptd-1`・`t-023c-sl-3` が旧 `:1794` と旧 `:1798` を、`t-024a-op-10` が旧 `:1798` を引く）。どれも波 2a（`dfc-*` を移す）か波 3a（消す）の持ち物であり、波 3b が検査 42 の数え先から `tests/unit` を外す。⛔ 波 0 は `tests/` に触れない。

⚠️ 検査 39 の「持たれない」数は、仕様の段（波 0）では 2 つの新しい印の分だけ動く。⛔ 基準値は上げない —— 波 0 で、その 2 つを逐語で引く契約試験を同じコミットに入れる（`CR-569` の 7 節と同じ手）。単体の削除（波 3）で動く分は波 4 が扱う（波 4 の基準線は 0.2 の 6 の実測どおり 1,286 → 2,074 → 1,974 と動く）。

---

## 9. 波 —— 持ち場で割る（`CR-570` の着地の後）

| 波 | 持ち場（このファイルだけを書く） | 中身 | 体 |
|---|---|---|---|
| 0 ✅ | `docs/spec/**`（Chapter 7・`08-10-test.md`・`row-id-prefixes.json`・`_source/verification*`・`_assets/tbl-verification.md`）と `npm run gen` の出力、`package.json` の `gen` の鎖、`docs/development-rules/04-verification.md` と `09-tools.md` の 1 行、`check.sh` の 27 と `check-provenance.py` の 1 行、`docs/development-records/`（`changelog.md`・台帳 3 つ・`README.md`・`perf-pending.md` と `measurements/performance-runs.md` の空の見出し） | 3.1・3.2 節と 4 節の本文に `JDG-606`（案 A）と `JDG-607`（表 T-334 と 表 T-218 を JSON の原稿へ）を合わせた。番号を詰めた（検査 62、2 節）。⭐ `GT-2` が効くのは波 2 の後。性能の門は `CR-570` と一緒に既に在る（`JDG-605`）。⚠️ `tests/known-red.txt` は `tests/` に在るので波 3c が作る | 仕様の体（Opus）。2026-09-26 に当てた |
| 1 | 振り分け表（10 節）だけ。コードも試験も書かない | `tests/unit` の全ファイルを 消す／移す／残す に分け、利用者に見せる（`JDG-645` の問 G ①） | 測りの体（Opus —— 判断が要る） |
| 2a | `tests/unit/dfc-*` と、移す先の `tests/system/`・`tests/contract/` の新しいファイル | 37 ファイルを移す（画面を押すものは system、値だけのものは contract）。中身の主張は変えない | 実装の体（Sonnet） |
| 2b | `tests/usecase/`（新しいファイルだけ） | UC 1 件につき 1 本（4.1 節の `VT-1`）。`docs/spec` だけを読む。⛔ 食い違いは直さず報告し、調整役が `defects.md` へ | ⭐ 仕様だけを読む試験の体。2a と別 |
| 3a | `tests/unit/**`（振り分け表が「消す」とした行だけ） | 削除 | 実装の体（Sonnet） |
| 3b | `.claude/skills/spec-graph-check/**`（検査 39・42・64・65・66、`check.sh`）と `docs/development-rules/09-tools.md` | 5 節 | 道具の体（Opus） |
| 3c | 「残す」試験の XSD のスキップ・`tests/known-red.txt`・`tools/gate/`・`package.json`・`playwright.config.ts`・`vitest.config.ts`・`tests/README.md`・`tests/integration/schedule-drawing.sws.test.ts` の注記 | 4.3 節、3.3 節。⛔ `tests/nfr/*` と `testIgnore` は触らない（調整役の持ち物、6 節）。`playwright.config.ts` は `TS-1` の注記だけ | 実装の体（Sonnet） |
| 4 | 基準線と測り待ち | 検査 42 を下げる・64〜66 を登録（調整役）。測り待ちの一覧が空でなければ、`PW-3` のとおり 1 回にまとめて測る（緑なら記録して事後に報告、赤なら利用者を呼ぶ）。検査 39 の引き上げは、0.2 の 6 の表を添えて利用者に問う（`JDG-637`） | 調整役 |

⭐ 波 2b の体への手引き（規則 04 の 6 節から）: file:// の保存は宿主のダイアログを `addInitScript` で差し替えて受け取る。開くのは落とす道（`DFC-569` は 2026-09-24 に配線済み）。`UC-012` の `Agent API` は `IC-20` で有効にする。例 `UC-002`: `sample-large-erp-program.ja.xml` を開き、「1. プログラム管理」を畳み、保存して開き直しても畳んだまま（`JDG-638`）。
⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。壊して確かめる試しは、合わせた木で回す。

---

## 10. 振り分け表 —— 別の測りが持つ

⭐ 本書は表そのものを持たない —— 338 行の表は波 1 の体が `CR-570` 後の木で測って作り、利用者に見せる（`JDG-645` の問 G ①）。ただし本書のための再測定（`b6292bb0`、下記）で、波 1 が引き継ぐ集計とその見落としは先に分かったので、ここに残す。

**先取りの集計（`b6292bb0`、旧稿の見積り用スクリプトをそのまま再実行。表そのものは出力先のスクラッチパッドにのみ在り、本書には写さない）:**

| verdict | files（旧 `e1b8bab2`） | cases（旧） |
|---|--:|--:|
| delete | 138 → **139**（`cr-432` を加える） | 2,669 → 2,684（`cr-432` の 15 件を加える。旧 2,659） |
| keep-exception | 9 → **8**（`cr-432` を delete へ振り直す。次の段落） | 343 → 328（`cr-432` の 15 件を除く） |
| keep-impure | 124（変わらず） | 2,587（旧 2,574） |
| move-system（`dfc-*`） | 30（変わらず） | 376（変わらず） |
| move-contract（`dfc-*`） | 7（変わらず） | 56（変わらず） |
| tooling | 30（変わらず） | 389（変わらず） |
| 合計 | 338（変わらず） | 6,420（旧 6,397） |

⛔ **keep-exception のうち `cr-432-edit-task-branches-the-spec-decides.test.ts` は振り直す。** 見積りスクリプトが挙げた唯一の理由は `MSPDI_NAMESPACE`（名前空間の文字列定数、数の変換を行わない）だけで、`UO-1` の例外には当たらない。ファイルの他の import（`cycleTaskPlanActualState`・`editTask`）も `pure`・非例外。⇒ **delete** に入れる。
⚠️ 見積りスクリプト自身に正規表現の見落としがある —— 2 個組の分割代入 `{ A, B }` から B 側を落とすことがある。`cr-567` の理由欄は `MSPDI_NAMESPACE` だけを挙げるが、実ファイルは `documentFromMspdi`（本物の例外）も import しており、これは読み落とされていただけで verdict（keep-exception）自体は正しい。波 1 の体は、この見落としを先に直すか、2 個以上の分割代入を持つ行を手で見直してから使うこと。
⚠️ **cases 列は実際のテスト件数を過小に数える。** 見積りスクリプトは `it(`/`test(` の静的な出現数を数えるが、ループで `it()` を生やすファイル（例: `tests/contract/tree-state-machine.contract.test.ts` は静的に 6 だが `vitest run` すると 55）は数え落ちる。件数の debt を測るときは対象ファイルを `vitest run --reporter=verbose` で実測すること（0.2 の 4 に実測値）。

測り方（波 1 が本表を作るときの手順。旧稿のまま、コマンドを 1 つだけ直した）:

1. `tests/unit` の各ファイルが import する `src` の関数を並べる。
2. 関数ごとに、4.3 節の表 `UO` の行を決める —— 札（`@purity`・`@external-contract`）、生成物か、`function-size.mjs` の枝の数、export の有無、契約・結合の試験だけで取った網羅。⛔ 旧稿は `npx vitest run tests/contract tests/integration --coverage` と書いていたが、`npx` はこのリポジトリの worktree では違う vitest を拾うことがある（根の `node_modules` を素通りする）—— `node ../../../node_modules/vitest/vitest.mjs run tests/contract tests/integration --coverage`（作業木からの相対、深さは worktree の位置による）を使うこと。
3. ファイルごとに決める:
   - **移す** —— 名が `dfc-*`（37）。行き先は system か contract。
   - **残す** —— 試す関数のうち 1 つでも `UO` のどの行にも当たらない、または `@external-contract` に当たる（`01-04-requirements.md:5294` が名指す日付を欠く写しの試験を含む）。
   - **消す** —— それ以外。
4. 表の列: ファイル・件数（`vitest` の実数、見積りスクリプトの静的数え上げではない）・試す関数・当たった `UO` の行・振り分け・残すなら理由。合計の行に、消す件数と、検査 39 の「持たれない」数の予測（0.2 の 6 の手）を置く。

---

## 11. 仕様の外で直すもの・この変更でやらないこと

- ⛔ 新規の欠陥を探す試験を足さない（`JDG-31`）。ユースケース試験は `JDG-638` が求めたものに限る。
- ⛔ 仕様の MUST を逐語で引くためだけの試験を書かない（検査 39 の注記）。
- ⛔ 性能の数を変えない。`LM-19` と表 T-043 はそのまま。
- `docs/development-records/handoff.md` の該当行は、調整役が着地のときに書き直す（本書は書かない）。

---

## 12. 前に立つ者へ返す問い

⭐ 問う前に反証した: `rulings.md` の `JDG-25`・`JDG-31`・`JDG-635` 〜 `JDG-645`、台帳の `DFC-311`・裁定待ちの `PND-424`、仕様の Chapter 7・`08-10-test.md` を読んだ。下の 1 つは、どの条項もどの裁定も決めていない（起草のときの問い 2 —— 性能の門を先に当てるか —— は `JDG-605` が閉じた）。

⭐ **閉じた（2026-09-26）** —— 問い 1 は `JDG-606`「試験の章については提案通りでOK。」で案 A に決まり、波 0 で当てた。残る問いは無い。

1. ✅ **Chapter 8・9・10 に試験のノード（`TC-xxx` と `TEST_RESULT`）を置くか**（`DFC-311`・`PND-424`。`PND-424` は「推奨を出さない」のまま閉じていた）。`JDG-639` は「章は何を確かめるかを書く」と決めたが、その書き方は決めていない。
   - 案 A（推奨）: 章は表 T-334 を指すだけにし、ノードも Chapter 9 の生成器も作らない。3.1 節の 6 つの MUST ／ MUST NOT を退ける —— 結果が仕様とテストコードの 2 か所に載らない。`DFC-311` は選択肢 ② で閉じる。
   - 案 B: UC 14 件の `USE_CASE_TEST` を手で書き、Chapter 9 の生成器を作り、結果を `TEST_RESULT` に残す。uids が ＋14、生成器の仕事が 1 本増える。
   - 場面: 案 A では、「1. プログラム管理」を畳んで開き直す `UC-002` の試験が `tests/usecase/` に在ることが合否。案 B では、そのうえで Chapter 8 に `TC-` のノードと、実行日と証拠のパスを持つ `TR-` のノードが要る。

---

## 13. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-311` | 第 8・9・10 章が器のまま | ✅ 閉じた（2026-09-26、`JDG-606`）—— `実測済` にして `fixed-defects.md` へ移した。`PND-424` は `裁定済` のまま、推奨の欄に `JDG-606` を足した |
| （番号は調整役） | ⛔ 閉じた（`b6292bb0` で確認）: `npm run e2e` が性能の門を無条件に走らせる（6 節） | `playwright.config.ts` の `testIgnore` が `CR-570` と一緒に着地済み。立てるとすれば済み行として |
| （番号は調整役） | ⛔ 閉じた（`b6292bb0` で確認）: `rowTree`（表 T-328）の状態表に契約試験が無い（0.2 の 3） | `tests/contract/tree-state-machine.contract.test.ts` が持つ（55 件、緑）。本書の `VT-2` はもう既存の事実 |
| `JDG-635` 〜 `JDG-645`・`JDG-605` | 0.1 節の裁定 | `rulings.md` に記録済み（着地先は本書。`JDG-605` の門は `playwright.config.ts`） |

---

## 14. 測り方の再現

⭐ 下は `b6292bb0`（`CR-570` 着地後の session worktree）で打ち直したもの。`e1b8bab2` の旧稿の再現手順は、行の右に「旧」で残す。`npx` は使っていない —— この worktree に自分の `node_modules` は無く、根のものを相対パスで呼ぶ（`node ../../../node_modules/<pkg>/...`。深さは worktree の位置に合わせること）。

```
# the tree: b6292bb0 (the session worktree;旧稿は e1b8bab2)

# use cases, state tables, test places, purity tags -- 変わらず
grep -c "^\*\*UID\*\*: UC-" docs/spec/01-04-requirements.md                -> 14
python: state-machines.json regions[].table.id                              -> 9 tables
git ls-files tests/<dir> | wc -l
  -> unit 345 (旧 345), dfc-* 37 (旧 37), contract 28 (旧 27), system 33 (旧 29), nfr 3, integration 1
git ls-files 'tests/unit/*.test.ts' | xargs cat | wc -l                     -> 201302 (旧 201310)
git grep -h -o -E "@purity +[a-z-]+" -- src | sort | uniq -c                -> 1507/1/111/336 (旧 1502/1/111/336)

# unit の実件数 (旧稿は見積りだけで vitest を回していなかった)
node ../../../node_modules/vitest/vitest.mjs run tests/unit
  -> Test Files 12 failed | 326 passed (338)
  -> Tests 1 failed | 8201 passed | 4 expected fail | 18 skipped (8224)
  -> 11/12 failed files are ENOENT on docs/reference/mspdi/{pj12,pj15}/*.xsd (XSD is local-only,
     absent from every worktree); 1 failed test is tests/contract/display-words.contract.test.ts
     (dependencyKinds section mismatch -- unrelated to CR-573, not investigated here)

# CR-573 の振り分け見積り (JDG-645 問 G ① の下書き。scratchpad の cr573/sort.py、e1b8bab2 のときに置いたもの)
python <scratchpad>/cr573/sort.py
  -> delete 138/2669, keep-exception 9/343, keep-impure 124/2587,
     move-system 30/376, move-contract 7/56, tooling 30/389, TOTAL 338/6420
  -> then reclassify cr-432-edit-task-branches-the-spec-decides.test.ts: keep-exception -> delete
     (its only exception hit is the MSPDI_NAMESPACE string constant, not a conversion function)
     giving delete 139/2684, keep-exception 8/328
  -> note: sort.py's NAMED_RE regex drops names from 2-item destructuring imports (non-overlapping
     match consumes the delimiter); cr-567's real documentFromMspdi import was one such drop, found
     by hand -- verdict there is still correct, but the tool's own report cannot be trusted blind
  -> note: sort.py counts cases by grepping `it(`/`test(` statically; a file with a runtime loop
     (tests/contract/tree-state-machine.contract.test.ts: 6 static occurrences, 55 cases at
     `vitest run`) is undercounted -- use vitest's own count for debt decisions (0.2 の 4)

# check 39 and 42, as-is on this tree (already the registered baseline)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-must-clause-coverage.py
  -> OK  2137 clauses, 851 held, 1286 not (baseline)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-quoted-source.py
  -> OK  324 quotations with no source (baseline)

# check 39 and 42 on two scratchpad copies (docs/, tests/, src/ and the two check scripts only,
# not the repo -- ROOT resolves 3 dirname()s up from the copied .claude/skills/spec-graph-check/,
# so the copy must keep that relative layout)
#   tests/unit removed entirely            : check39 held 63  unheld 2074 | check42 --list -> 10
#   tests/unit removed, dfc-* kept         : check39 held 163 unheld 1974 | check42 --list -> 17
#   (旧稿 e1b8bab2: 全部 828/1308, 単体除く 49/2087, dfc-*のみ 149/1987, 契約+system+UCのみ 46/2090;
#    check42 は 361 -> 12)

# vite build
node ../../../node_modules/vite/bin/vite.js build
  -> 163ms build, dist/index.html 1,326.92 kB / gzip 238.68 kB

# e2e, no GRS_PERF (RISK-001 / JDG-605 -- never set it)
node ../../../node_modules/@playwright/test/cli.js test --list
  -> 185 tests in 30 files; nfr-001/nfr-002 (the two frame-time files) absent from the list,
     nfr-004-single-file.test.ts present with 5 cases
node ../../../node_modules/@playwright/test/cli.js test
  -> 183 passed, 2 failed, 0 skipped, 9m40s
  -> failures: nfr-004-file-scheme-sweep.sws.test.ts (GR-22 Panel Divider band, file:// sweep) and
     user-reported-fixes.test.ts DFC-374 (FR-016 row-axis pixel ceiling at a 400px window) --
     neither mentions MSPDI or docs/reference/mspdi; not investigated further here

# parity
node tools/parity/check.mjs
  -> 0/75 steps agree, 75/75 diverge with no entry on either list, ~1m37s -- surprising, not
     investigated here; tools/parity/check.mjs imports no MSPDI/XML module (grep confirms), so the
     "parity is not an MSPDI round trip" finding (0.2 の 8) still holds regardless of this result

# T-328 / rowTree contract test (0.2 の 3, dropped finding)
node ../../../node_modules/vitest/vitest.mjs run tests/contract/tree-state-machine.contract.test.ts --reporter=verbose
  -> 55 passed (55); table T-328 (rowTree) is held by this file

# RISK-001 / performance gate (0.2 の 10, 6 節)
grep -n "PERFORMANCE_GATES\|testIgnore\|GRS_PERF" playwright.config.ts   -> already present at :55-67
node ../../../node_modules/@playwright/test/cli.js test --list          -> confirms nfr-001/002 excluded

# identifiers and counts -- 変わらず
md-checks.py                                   -> tables=188 figures=28 rows=2361 uids=162
table headings **表 T-nnn —** in docs/spec     -> largest T-329
row-id-prefixes.json prefixes                  -> 163 ; VT UO GT used nowhere under docs/
check.sh section numbers                       -> largest 63

# graph (not re-run this pass; 7 節 keeps its e1b8bab2 numbers)
python .claude/skills/spec-graph-check/induced.py <the 25 objects of section 7>  -> 25/25, 4 edges, 0 cycles
python .claude/skills/spec-graph-check/impact.py TS-1 .. TS-6 TW-1 .. TW-3 T-218 T-219 RA-6 SD-3 T-042 T-043 T-060
```

---

## 15. 波 1 〜 3 を当てた記録 —— 振り分け表からの逸脱と、仕様の追随（2026-09-26、未コミットの作業木）

⭐ 数え方: `git status --short`（`^R` が移したもの、`--no-renames` の `D` から移したものを除いたものが消したもの）、`md-checks.py`、検査 30。

- **試験の置き場**: `tests/unit` から 139 ファイルを消し、66 ファイルを `tests/contract` へ移した（`dfc-*` 37 ＋ ほか 29）。`tests/usecase/` に UC 1 件につき 1 本の 14 本と `uc-harness.ts` を置いた。
- ⚠️ **逸脱 1 —— `dfc-*` の移し先。** 振り分け表（利用者が見たもの）は `dfc-*` のうち 30 ファイルを「system へ移す」としたが、37 ファイルとも `tests/contract` へ入れた。
  `tests/system` は Playwright だけが走らせる置き場（表 T-218 の `TS-3`）であり、この 30 本は Vitest のケースである —— `tests/system` に置けば、どちらの走らせ手にも拾われない。中身の主張は変えていない。利用者へは調整役が伝える。
- ⚠️ **逸脱 2 —— `tests/unit/cr-378-an-import-is-an-edge-and-json-sits-with-its-owner.test.ts` は残した。** 走るときに `src` を import する試験である。
- **生成器の変更（表 `UO` の `UO-8`、裁定の札 R3）**: `tools/generate_state_machine_types.py` は、8 つの遷移表の定数（`AGENT_API` ／ `FIELD_ENTRY` ／ `FILE_FLOW` ／ `GESTURE` ／ `INTERACTION_RECORD` ／ `NOTICE` ／ `SCREEN` ／ `SELECTION` の `_VALUES_TRANSITIONS`）と、その行の型を刷らなくなった。
  読んでいたのは消した単体試験だけで、各領域の遷移の関数は読まない。刷るのは、読むコードの在る `task-group-folding.ts` の `TREE_STATE_TRANSITIONS` だけである（生成器の `TRANSITIONS_READ`、`JDG-139`）。
- **それに追随した書き換え**（1 つずつ当て、機械で測り直した）:
  - `docs/development-rules/03-implementation.md` の生成される定数の一覧から、その 8 行を消した。検査 30 は緑に戻った（72 名・84 写し）。
  - `docs/spec/_source/state-machines.json` の `$comment` の「Generated FROM this file」の段は、遷移表の定数を `src/use-case/advance-screen-session/` の各ユニットへ刷ると言っていた。これを、生成器がいますること（型と初期値は各領域が名指すユニットへ、遷移表の定数は読むコードの在るユニットだけへ）に直した。`$comment` は刷られないので刷り物は動かない（`npm run gen:check` 緑）。
  - `docs/spec/05-07-design.md` の 表 T-075 の `UF-86` ・ `UF-87` ・ `UF-88` ・ `UF-89` ・ `UF-121` ・ `UF-122` ・ `UF-124` ・ `UF-125` の欄「生成した型と遷移表の定数の区画」を「生成した型と初期値の区画」へ。5.5 の原稿の段「判別共用体・遷移表の定数を生成する」を、判別共用体と初期値を生成し、遷移表の定数は読むコードの在るユニットにだけ生成する、の 2 文へ。
- **消した試験を名指していた仕様の条項**:
  - `FR-030`（5.3 の「負う要求」の結び、表 T-277 の `OW-5` の確かめる手立て）: `tests/unit/uf-32.test.ts` → `tests/usecase/uc-005-record-actuals.test.ts`（表 T-021 の進捗マーカーは、状態ごとに形が違う）と `tests/system/nfr-004-file-scheme-sweep.sws.test.ts`（`SL-8`、選択を破線の枠でも示す）。これで `tests/contract/cr-435-every-requirement-names-a-unit.contract.test.ts` が緑に戻る。
  - 6.1 の 表 T-220 の前の ⚠️ の段: `tests/unit/edit-task-group.test.ts` → 1 行が戻る外側は `tests/unit/t-050-a-document-always-holds-one-row.test.ts`（残した）が押さえ、ユースケースの層の側は `UO-1` で単体試験を置かない（`edit-task-group.ts` は `pure`）、と書いた。
  - `docs/development-rules/` に、消した・移した試験のパスを名指す所は無かった。
- **触らなかったもの**: `docs/review/` の 11 ファイル（`dr-sites.jsonl` ・ `pd-sites.jsonl` を含む）が消した試験のパスを名指す。どれも日付と commit を名乗る測りの記録か当時の依頼文であり、書き換えると測りが偽になる —— そのまま残す。
- **数**（`md-checks.py`）: tables 189 ・ figures 28 ・ rows 2364 ・ uids 163 —— 波 0 の後と同じ（セルと段の書き換えだけで、行も表も足していない）。
