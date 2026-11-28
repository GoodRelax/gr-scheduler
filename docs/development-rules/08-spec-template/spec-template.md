# 仕様書のテンプレート（GRS）—— ANMS v0.36 を正にする

⭐ **GRS の仕様書のテンプレートは ANMS v0.36 である**（持ち主の裁定 `JDG-3823`・`JDG-3824`、計画 `studies/82-anms-ndd-apply-plan/README.md` の B1）。原本は gr-sw-maker の `process-rules/spec-template-ja.md` の改定案の確定の写し（ANMS v0.36 draft v53、2026-11-23）で、写しを [`anms-v036-ja.md`](anms-v036-ja.md) に置く。⚠️ 改定案はまだ gr-sw-maker の `main` に無い —— 計画の B1 のとおり、確定の写しを原本に使う。⛔ 写しを手で直さない。直すときは原本を先に直し、写しを取り直す。
⭐ **本書は、ANMS v0.36 を GRS に当てるときの決まりだけを持つ。** 章・節・ID・鎖・全章の決まり・運用は写しが持ち、本書は書き写さない。
⚠️ **2026-11-24 まで、本書は GRS 独自の 10 章のテンプレート（Chapter 1〜10 と付録）だった。** 今の仕様書（`docs/spec/` の 4 つの文書。2 つは B9 で部品のファイルに割った —— 2 節の「仕様書の分け方」）はまだ旧い形である —— 組み替えは計画の B5・B8・B9 が行う。組み替えの間は、3 節の対応表で旧い章を新しい章へ読む。

---

## 1. 仕様書の頭の 3 行と変更履歴

⭐ ANMS の「仕様書の冒頭」のとおり、仕様書の頭に次の 3 行を書く。

```markdown
**バージョン:** 20261124T000000Z
**テンプレート:** ANMS v0.36
**変更履歴:** ../development-records/changelog.md
```

| 事 | GRS の決まり |
|:---|:---|
| 置き場 | 最初のファイルの頭だけに 3 行を書く。2 つ目から後のファイルの頭には、最初のファイルの名を書く。今のバージョンは頭だけに書き、ほかの所に写さない |
| バージョンの書き方と上げ方 | 規則 10 の表（版の規則は規則 10 だけが持つ） |
| 変更履歴のファイル | `docs/development-records/changelog.md`（仕様書と別のファイル。2026-09-11 から） |
| 変更履歴の列 | 切り替えた後の行は「バージョン / 変更 / 変えた ID / 根拠」の 4 列で書く。「変えた ID」は足した ID・変えた ID・消した ID を分けて書く。「根拠」は変更を求めた記録の ID（`CR-`・`RVF-`・`OPQ-`・ADR の ID） |
| 前の行 | 3 列（版 / 日付 / 変更内容）の行は書いたまま残す。4 列の行は、その下に見出しを分けた新しい表で末尾に足す。⛔ 行を書き換えない |
| 最後の行 | 最後の行のバージョンは、仕様書の頭のバージョンと同じにする |
| 切り替える時 | 頭の 3 行は、組み替え（計画の B8）が入るコミットで書く。それより前に「テンプレート: ANMS v0.36」と書かない —— 仕様がまだ旧い形だからである。StrictDoc の文書の欄（`**Grammar**`・`**UID**`）との並べ方と、古い `**Version**` の行の扱いは、B9 が組み立ての道具と一緒に決めて本表に書く。B9 の決め（2026-11-27）: 頭の 3 行は、最初のファイル `spec-ch1-3.md` の `**Grammar**`・`**UID**` の欄の後の行に置く。古い `**Version**` の行は、頭の 3 行を書くコミットで消す。2 つ目から後の部品は頭の 3 行を持たない |

---

## 2. GRS が ANMS に足す決まりと、ANMS の選択肢から選んだ決まり

| 事 | GRS の決まり | 拠り所 |
|:---|:---|:---|
| 要求の表 | 要求は StrictDoc の節点（`UID`・`STATEMENT`・`PARENT`）で書く。ANMS の「ID / 要求文 / 親の ID」は `UID`・`STATEMENT`・`PARENT` の関係で読み、ANMS の traces の列は `PARENT` の関係で読む | `JDG-3831` |
| 行 ID | 今の ID（桁をそろえていない ID を含む）は振り直さない。新しく足す接頭辞（`OPQ` ほか）も、チーム T の基準書の問 62（ID の桁の決まり）の答えが出るまでは、今の GRS の形（0 を詰めない。`OPQ-1`）で振る。答えが出たら、要れば道具で一括して直す（BOSS 2026-11-24）。表の行の ID（`S-`・`CM-` ほか）は、実装仕様の ID として保つ | 計画の 5 節、ANMS「ID の振り方」、基準書の「ID を振り直さない」。チーム T への問い T3 |
| 未決の問い | 付録 A.3 に置く。列は ANMS の 6 列に「分類（`A`〜`I`）/ 触る行 ID」を足す。仕様の印は、表の升と要求文の中に置かず、表の直後か要求の節点の末尾に独立した 1 文で置く（升は値として、要求文は逐語で読まれる） | 規則 06 の 3 節 |
| 機械が読む原本 | 製品のコードは 10,000 行を超える（2026-11-23 の実測 52,283 行、計画の 7 節）ので、用語集・ID の登録簿・状態遷移表の JSON は必須である。置き場: 用語集は CR-857 が作る `glossary.json`、ID の登録簿は `docs/spec/_source/row-id-prefixes.json`、状態遷移表は `docs/spec/_source/state-machines.json`。キーの形は計画の B3・B4 が合わせる | ANMS「機械が読む原本（JSON）」 |
| UI の文言 | `docs/spec/_source/display-words.json`。英語を正にする | `JDG-3825` |
| 仕様の原稿の和文 | `en` を正にするかは、チーム T の答え（T4）の後に決める | `JDG-3825` |
| 仕様書の分け方 | ANMS の Chapter Structure の括弧の外側から分け、1 ファイルを約 100 KB までにする。B9（2026-11-27）が、要求の文書 `01-04-requirements.md` を `spec-ch1-3.md` と `spec-ch4-01.md`〜`spec-ch4-17.md` に、設計の文書 `05-07-design.md` を `spec-ch5-01.md`・`spec-ch5-02.md`・`spec-ch6-7.md` に割った。名の章の番号は、ファイルの中の見出しの番号（旧い章）に合わせる。切れ目は見出しの行に置く。部品の並びと切れ目は `docs/spec/_source/spec-files.json` が持つ。旧い 2 つの名は文書の全体の名として残る —— 仕様の文と src・tests のコメントがその名で指すからである。道具と試験は文書の全体を `tools/spec_files.py`・`tests/spec-files.ts` で読む。部品の本文をつなぐと、割る前のファイルと 1 字も違わない。2 つ目から後の部品は、頭に StrictDoc の欄（題・`**Grammar**`・`**UID**`）、続ける節の見出し、最初のファイルの名の行（`> 最初のファイル: …`）を持つ。⛔ 部品の頭を手で書き換えない —— `python tools/spec_files.py --check` が赤くなる | ANMS「仕様書の分割」 |
| 6.2 のシナリオ | Gherkin のシナリオを 6.2 に書き、今の e2e の試験の題にシナリオの ID（`SCN-xxx`）とユースケースの印のタグを付けて対応させる。新しい道具を足さない | `JDG-3830` |
| テスト記録 | GT-2 ごとに、試験した sha とファイルごとの passed・failed・skipped の数の要約を `docs/development-records/test-records/` に置く | `JDG-3827` |
| 第 7 章 | 設計原則の準拠確認の表を置く（計画の B13）。組み替えの間は、旧い章の番号の続きの Chapter 11 として `08-10-test.md` の末尾に置く（表 T-740、行 ID `DPC`）。新しいファイルにしないのは、仕様書のファイルの名を並べた道具と試験の一覧を増やさないためである | `JDG-3823` |
| レビューの指摘 | 仕様書のノードは持たない。置き場は規則 07 の「レビュー指摘の置き場（GRS）」 | 規則 07 の付録 A.1 |

---

## 3. 旧い 10 章から ANMS v0.36 の章へ（組み替えの対応表）

⭐ B8 は本表で節を移す。⛔ 移しても行 ID は変えない（2 節）。

| 旧い章と節 | ANMS v0.36 の章と節 | 移すときに足すこと |
|:---|:---|:---|
| 1.1 Background | 1.1 Background | — |
| （無い） | 1.2 Purposes・1.3 Analysis・1.4 Issues | 憲章の下書きから PUR・AN・ISS を書く（計画の B5、`JDG-3824`） |
| 1.2 Challenges | 1.5 Challenges | 親を ISS にする（今は CH が子の GL を持つ向きで、逆である） |
| 1.3 Goals | 1.6 Goals | 親を CH にする |
| 1.4 Approach | 1.7 Approach | 見込みの行数と JSON を持つ判断を書く |
| 1.5 Scope | 1.8 Scope | — |
| 1.6 Constraints | 1.9 Constraints | — |
| 1.7 Limitations | 1.10 Limitations | 実装を見送る MAY・SHOULD の要求の ID と理由 |
| 1.8 Glossary | 1.11 Glossary | 表は用語集の JSON から作る |
| 1.9 Notation | 1.12 Notation | — |
| 2.1 Overview Diagram・2.2 Devices・2.3 Routes | 4.1 Architecture Concept・4.2 Components | — |
| 2.4 Exclusions | 1.8 Scope（Out-of-scope） | — |
| 3 Use Cases | 2.1 Use Cases（流れが要れば 2.2 Use Case Flows） | 6 つの欄と印（計画の B5） |
| 4.1 Functional Requirements | 3.1 Functional Requirements | 親をユースケースの印か目標にする |
| 4.2 Non-Functional Requirements | 3.2 Non-Functional Requirements | — |
| 4.3 Reduction Candidates | 1.10 Limitations | — |
| 5.1〜5.5 | 4.1〜4.5 | 図の要素の一覧表に traces の列 |
| 5.6 Decisions | 4.6 Decisions（ADR） | — |
| 6.1 Software Specifications | 5.x Natural Language Implementation Specification と、属する 5.x の節 | 「ID / 実装仕様 / traces」の表。新しい ID は `IMPS-xxx` |
| 6.2 Data Schema | 5.x Data Schema | — |
| 7 Test Strategy | 6.1 Test Strategy | 検証方法の表 |
| 8 Use Case Tests | 6.2 Use Case Tests | シナリオ（`JDG-3830`） |
| 9 Software Specification Tests・10 Non-Functional Tests | 6.3 から後の節 | — |
| 11 Design Principles Compliance（B13 が足した） | 7 Design Principles Compliance | — |
| A.1 References・A.2 Licenses | A.1 References・A.2 Licenses | — |
| A.3 Changelog（2026-09-11 に `changelog.md` へ移した） | 頭の 3 行の「変更履歴」 | 1 節 |
| （無い） | A.3 Open Questions | 開いた `PND` の行を `OPQ` で移す（計画の B7） |

---

## 4. 同じフォルダーのほかの文書

| 文書 | 今の扱い |
|:---|:---|
| [`anms-v036-ja.md`](anms-v036-ja.md) | ANMS v0.36 の写し。テンプレートの正 |
| [`spec-writing-rules.md`](spec-writing-rules.md) | ANMS が持たない GRS の書き方 —— StrictDoc の記法、散文の数、履歴を持たないこと、表と図、規則と理由の置き場、検査の走らせ方。2026-11-24 に旧い 10 章の章ごとの規則を消した |
| [`00-ai-guide.md`](00-ai-guide.md)・[`01-ai-queries.md`](01-ai-queries.md) | StrictDoc の Markdown と jq の手引き。章立てに依らないので、そのまま使う |
| [`spec.sgra`](spec.sgra) | StrictDoc の文法。要求の節点（2 節）が使う |
