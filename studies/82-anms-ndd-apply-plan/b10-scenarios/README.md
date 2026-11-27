---
type: Study
title: B10 シナリオ —— 6.2 の Gherkin、e2e の試験の題のタグ、@manual の記録
description: study 82 の B10。仕様 3.2 のユースケースの道を Gherkin のシナリオ 63 本に写し、持ち主のチェックリストから @manual のシナリオ 18 本を写した。今の e2e の試験の題に付ける SCN の ID とタグの一覧と、@manual のテスト記録の下書きを置く。B9 が仕様のファイルを割った後に当てる。
tags: [anms, gherkin, scenario, manual, b10]
phase: plan
status: draft
---

# B10 シナリオ

- 作った日: 2026-11-27。基は `develop` の `e053fb30a`。命令は 2026-11-27 の持ち主の始めの命令（BOSS の簡易指示）。JDG・DFC の帯は `JDG-3961`〜`3965`・`DFC-3681`〜`3685`。
- 席: SUB「B10 シナリオ」。親は [gr-scheduler BOSS（5 代目）](#local_ce96eac6-ac3a-49af-94e1-39cc464d056d)。
- 順番の決まり: B9（仕様のファイルの分割）が `develop` に入るまで `docs/spec/*.md` に触らない。試験の題もその後にまとめて直す（B11b が同じ試験のファイルのコメントを直している最中でもある）。本書のフォルダーは下書きだけを持つ。

## 1. 置いた物

| ファイル | 中身 |
|:---|:---|
| [`scenarios-6-2-draft.md`](scenarios-6-2-draft.md) | 6.2 のシナリオ 81 本（道 63 ＋ `@manual` 18）。2 節がそのまま当てる本文 |
| [`test-title-tags.tsv`](test-title-tags.tsv) | 今の e2e の試験の題に付ける `SCN` の ID とタグの一覧（試験 1 行ずつ、今の題と新しい題） |
| [`manual-record-draft.md`](manual-record-draft.md) | `@manual` のテスト記録の下書き（`docs/development-records/test-records/manual-scenarios.md` に当てる） |
| [`scn-test-map.tsv`](scn-test-map.tsv) | シナリオ 63 本と、確かめる今の Playwright の試験の対応（74 行。`direct`・`partial`・`none` と、足りない所の注）。別のエージェント（Opus）が試験の本文を開いて当て、席が直した |
| [`apply_titles.py`](apply_titles.py) | `test-title-tags.tsv` の題を当てる台本。今の題がファイルに 1 か所だけ在ることを全行で確かめてから書く（1 行でも外れたら何も書かない） |
| [`check-95-manual-record-patch.mjs.txt`](check-95-manual-record-patch.mjs.txt) | 検査 95 が `manual-scenarios.md` を別の形で読むための直しの案（`tools/gate/test-record.mjs` に当てる） |

### 1.1 試験の題の一覧の数（`test-title-tags.tsv`）

| 何を | 数 | 数え方 |
|:---|---:|:---|
| 題を替える試験（`test(...)`） | 37 | `awk -F'\t' '$3=="test"' test-title-tags.tsv \| wc -l` |
| 題を替える手順（`test.step(...)`。古い手順と拡張の番号を印へ） | 82 | 同じく `$3=="step"` |
| 触る試験のファイル | 30 | `python apply_titles.py test-title-tags.tsv` の `OK  119 title(s) in 30 file(s)` |

⭐ 試しに当てた（2026-11-27、当てた後に `git checkout -- tests` で戻した）: `npx playwright test --list` は当てる前と同じ 860 件・121 ファイル。`--grep "@UC-001\.RJ1( |$)"` は 2 件、`@UC-010.RJ1` は 4 件（`dfc-2309` の 3 場面を含む）、`@UC-002.RJ1`・`@UC-004.RJ1` は 0 件（下の 1.2）。

### 1.2 試験の無いシナリオ

63 本のうち、確かめる Playwright の試験が `direct` 28、`partial` 23、無い 12（`scn-test-map.tsv` の各シナリオの最もよい行）。無い 12 本:

| シナリオ | 印 | 足りない試験 | vitest で近い試験 |
|:---|:---|:---|:---|
| SCN-3 | UC-001.OK | 1 日の列の中だけを引き、開始日と終了日が同じタスクが `S-49` 以上の幅で出る | — |
| SCN-7 | **UC-002.RJ1** | 引いて運ぶ道のほかの入口から、深さの上限を超える移動を拒んで知らせる | `tests/contract/jdg-2414-hm-3a-is-measured-at-each-command.contract.test.ts`（移動だけを拒む） |
| SCN-15 | **UC-004.RJ1** | 依存を受け付けない辺で離して拒まれる | `tests/unit/t-233-rs-56-a-self-dependency-is-told-its-own-row.test.ts`（構えが残ることは見ない） |
| SCN-17 | UC-004.OK | 日程の重なる 2 つのタスクの依存の経路 | `tests/contract/cr-758-dependency-lines-clear-of-labels-and-the-landed-line-hit.contract.test.ts` |
| SCN-19 | UC-005.OK | 予定と実績が同じ期間のとき、出た帯で予定を掴む | — |
| SCN-20 | UC-005.OK | 上下の幅の無い形状で実績を下へずらす | 前提だけ（`tests/contract/cr-430-ga-1-to-22-grab-areas.test.ts`） |
| SCN-23 | UC-006.OK | 同じ段の 2 つの遅れで、遅いほうの頂点を通す | — |
| SCN-32 | UC-008.OK | 留める日が null のコメントボックス | — |
| SCN-36 | UC-009.OK | 名前を入力させる道を持たない間の既定の名前（`IMPS-867`） | `tests/contract/fr-020-the-four-values-live-in-the-tables-not-in-src.test.ts` |
| SCN-54 | UC-014.OK | GRS JSON の合流でタスクのほかの物も足す | — |
| SCN-61 | UC-015.OK | 遅れがすべて余裕に収まるとき赤が 0 | — |
| SCN-62 | UC-015.OK | 一部の期間を出したまま診断しても全タスクを診断する | — |

⚠️ **拒む道 2 つ（`UC-002.RJ1`・`UC-004.RJ1`）に Playwright の試験が無い。** ANMS 6.1 の合格基準は「全シナリオが passed」で、基準書 R6 は拒む道ごとにシナリオを求める。シナリオは書いたが、確かめる e2e が無いので、記録では `undefined` になる。試験を書くのは B10 の仕事の外（命令は「今の e2e の試験の題に付ける」）—— 問 3。
⚠️ `tests/use-case/` に UC-015 のファイルが無い（表 T-334 の `VT-1` は UC ごとに 1 つを求める）。UC-015 のシナリオ 6 本のうち 4 本は `tests/system/` の試験が確かめる。

### 1.3 下書きを直した所（試験と仕様の行に合わせた）

| シナリオ | 直した事 | 拠り所 |
|:---|:---|:---|
| SCN-31 | 畳む → 非表示にする（試験は指すタスクグループを隠す。書き直す前の拡張 2a は「折りたたまれた、または非表示になった」の両方） | `uc-008` の手順「extension 2a」 |
| SCN-36 | 「名前の設定を促す」→「入力させる道を持たない間、`S-99a` の既定値で描く」 | 表 T-633 の `IMPS-867`。促す道は仕様に無い |
| SCN-46・SCN-47 | 返す物を「今の文書」→「刻印」（受理は `AV-2`、拒否は `AV-3`） | 表 T-400。試験は `refusal.document` が無いことを確かめる（`CR-796`） |

⚠️ **仕様の中の食い違い（1 件）**: UC-012 の `STEPS` 手順 6「受理したことと今の文書を値で返す」と `REJECTION` RJ1「理由と今の文書を…返す」は、表 T-400 の `AV-2`・`AV-3`（文書を返さず刻印を返す。`CR-796`）と合わない。B5 が 3.2 を書き直した時の文である。シナリオは行（表 T-400）に合わせた。直すのは UC-012 の 2 文で、仕様の文の直しになる（引く試験を grep してから。問 4）。

⭐ 題のタグは Playwright が読む（2026-11-27 に使い捨ての試験で確かめた。`@playwright/test` 1.62.1）: 題 `SCN-2 UC-001 refuses the stack @UC-001.RJ1 @FR-003` は `--grep "@UC-001\.RJ1"` で引け、JSON の報告の `tags` に `UC-001.RJ1`・`FR-003` が出る。⇒ 道具を足さずに、印ごとの試験を引ける（`JDG-3830`）。

## 2. B9 の後に当てた事（2026-11-27、`develop` の `20fe577af` を取り込んで）

B9 は章の番号を変えなかったので、6.2 のシナリオは今の `docs/spec/08-10-test.md` の「8.1 Test Cases」に置いた（ANMS の章立てへ移すときに 6.2 になる）。

| # | 当てた事 | ファイル | 確かめ |
|:---|:---|:---|:---|
| 1 | 8.1 に前書きとシナリオ 81 本を置き、「本章はケースのノードを持たない」の注を外した（確かめる物・置き場・合格基準の 1 文は残した）。引く試験と道具は 0（`grep`） | `docs/spec/08-10-test.md` | `check.sh` |
| 2 | 接頭辞 `SCN` を登録した（`xOwner` は `records`、`section` は `manual-scenarios.md` —— 表の行として `SCN` を持つのはそこだけで、生成器の歩みは表の行しか数えない） | `docs/spec/_source/row-id-prefixes.json`、生成物 `tbl-row-id-prefixes.md` | `npm run gen`・`gen:check` |
| 3 | 試験の題 37・手順の題 82 を台本で当て、残っていた古い番号の手順の題 3 つと `specMismatch` の文 1 つを手で直した。`tests/known-red.txt` の注の欄 2 つも印へ替えた（照らし合わせる `case` の欄は変えない） | `tests/use-case/`・`tests/system/` の 30 ファイル | `npx playwright test --list` 860 件 |
| 4 | `@manual` の記録を置き、検査 95 が `manual-scenarios.md` を別の形で読むようにした（仕様の `@manual` のシナリオ 18 本と行が 1 対 1 か、Result が Cucumber の値か、passed のほかに Remark があるか） | `docs/development-records/test-records/manual-scenarios.md`、`tools/gate/test-record.mjs`、規則 09 の検査 95 の行 | `--check` 緑・`--self-test` 9 通り |
| 5 | 試験の一覧を作り直した | `docs/development-records/test-inventory.md` | `gen:check` |

⚠️ UC-012 の 2 文（問 4）は直していない —— 仕様の文の直しは BOSS の答えを待つ。

## 2a. B9 の後に当てる順（当てる前に書いた計画）

| # | 当てる事 | ファイル | 確かめ |
|:---|:---|:---|:---|
| 1 | `develop` を取り込む（B9・B11b が入った後） | — | `git log -1` |
| 2 | 6.2 の本文を写す（下書きの 2 節）。節の番号と前書きの「第 3.2 節」は B9 の後の章立てに合わせる | B9 の後のユースケーステストの節のファイル | StrictDoc の書き出し（下書きを今の `08-10-test.md` の 8.1 に入れた写しで、2026-11-27 に終了コード 0、81 本が出て、崩れた `**` は 0） |
| 3 | 接頭辞 `SCN` を ID の登録簿に足す（要る場合。検査が知らない接頭辞を赤にするか、`check.sh` で見る） | `docs/spec/_source/row-id-prefixes.json` | `npm run gen:prefixes`、`check.sh` |
| 4 | e2e の試験の題に `SCN` の ID とタグを付け、試験の手順の題の古い番号（`UC-001 extension 4a` など）を印へ替える | `tests/use-case/`・`tests/system/`（一覧は `test-title-tags.tsv`） | `npx playwright test --list`、`--grep @UC-001.OK` で当たる数 |
| 5 | `@manual` の記録を置き、検査 95 が記録の形を読み分けるようにする | `docs/development-records/test-records/manual-scenarios.md`、`tools/gate/test-record.mjs` | `node tools/gate/test-record.mjs --check`・`--self-test` |
| 6 | 試験の一覧を作り直す | `docs/development-records/test-inventory.md` | `npm run gen:tests` |
| 7 | 終わりの確かめ | — | tsc、vitest 全件（MSPDI の写しを入れて）、playwright（`--list`、use-case と system）、`check.sh` ALL GREEN、privacy 0 |

## 3. BOSS への問い

| # | 問い | 勧め | 拠り所 |
|:---|:---|:---|:---|
| 問 1 | 次のチェックリスト（計画の 225、2026-11-28）を、初めから `@manual` のシナリオとして 6.2 に書き、持ち主の結果を `manual-scenarios.md` に書く形にするか | する。チェックリストと 6.2 が別々に行を持つと 2 か所になる。チェックリストの席が `SCN` の番号を本書の続き（82 から）で振る | ANMS「テストの進め方」（AI が `@manual` を付けたシナリオをまとめて人に頼む） |
| 問 2 | ユースケースの印を持たない手で確かめる行（ヘルプ、ダウンロード頁、紹介頁。記録の下書きの 3 節の 6 行）をどこに置くか | 6.2 に置かず、6.3 から後の節（例: 「6.x Manual Checks」）に、行 ID と手順の表で置く。ANMS 6.2 はシナリオに印を 1 つ求めるので、印の無い行を 6.2 に入れると R6 の指摘になる | ANMS 6.2・6.3、基準書 R6「各シナリオが、確かめるユースケースの道の ID をタグで 1 つ持つか」 |
| 問 3 | 試験の無いシナリオ 12 本（うち拒む道 2）の e2e を誰が書くか | 拒む道 2 本（`SCN-7`・`SCN-15`）は β の前に書く（ANMS 6.1 の合格基準）。残り 10 本は β の後の CR にまとめる。書く席は仕様だけを読む別の席（`spec-driven-tests-by-another-agent`） | ANMS 6.1、基準書 R6 |
| 問 4 | UC-012 の 2 文（手順 6 と RJ1）を表 T-400 に合わせて直すか | B10 が 6.2 を当てる時に一緒に直す（「今の文書」→「適用した後の刻印」「今の刻印」）。引く試験を先に grep する | 表 T-400 の `AV-2`・`AV-3`、`CR-796` |

## 4. 見込み

B9 が `develop` に入った後の残りは 2〜3 時間（取り込み 10 分、6.2 を当てて検査を直す 30〜45 分、題の台本 15 分、検査 95 の直し 20 分、tsc・vitest 全件・playwright・`check.sh` で 60〜90 分）。BOSS へ 2026-11-27 に送った。

