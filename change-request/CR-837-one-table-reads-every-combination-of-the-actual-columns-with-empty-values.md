# CR-837 —— 実績の 5 つの列の値の組を、空も含めてすべて 1 つの表が引き、組ごとに状態・完了率・指摘を示す

> 起草の状態: 起草だけ（2026-10-24、枝 draft-crs-31、起点 develop d0ae3a9c8）。当てていない —— docs/spec・src・tests に触れていない。当てるのは後の子セッション（計画 uid 35）。
> 当てる裁定: `JDG-2470` の ③・④（利用者 2026-10-17）と `JDG-3165`（利用者 2026-10-24 —— 11 節の問い 1 の答え「指摘にしない」）。`JDG-2470` の ① は `DFC-2966`、② は「今のまま」で、本書は扱わない。
> 閉じる台帳: `defects.md` の `DFC-2967`。
> 新しい ID: 表 T-019 の行 `PA-新1` 〜 `PA-新13`（13 行）。退ける行: 表 T-310 の `VC-8` と 表 T-373 の `FA-8`（席は焼いたまま —— X-14）。表の番号と要求の UID は新しく取らない（表 T-019 と 表 T-019a は番号を保ったまま置き場を移す）。新しいファイル 4 つ —— `docs/spec/_source/plan-actual-states.json`・`docs/spec/_source/plan-actual-states.schema.json`・`docs/spec/_source/plan_actual_states_json_to_md.py`・`docs/spec/_assets/tbl-plan-actual-states.md`（StrictDoc の文書 UID `DOC-TBL-PLAN-ACTUAL-STATES`）。本番の番号は当てる子が当てる直前に測って配る。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定の鎖

`docs/development-records/rulings.md` を、触れる ID（`T-019`・`T-019a`・`PA-`・`PS-`・`FR-010`・`FR-012`・`FR-131`・`VC-5`〜`VC-8`・`VO-2`・`CM-13`・`AT-34`〜`AT-39`・`AT-141`）と、主題の語（「予実の状態」「組み合わせ表」「resumeValid」「percentComplete」「完了率」）で引いた（13 節）。当たった 41 行のうち、本書の主題に関わるものを下に挙げる。

| 裁定 | 日付 | 言っていること | 本書との関係 |
|---|---|---|---|
| `JDG-2470` | 2026-10-17 | ③ 実績の開始日・終了日・進捗率・進捗の状態の組み合わせを、空のときの扱いも含めて 1 つの表にする —— 無ければ `_source` に JSON で定め、`_assets` に刷り、仕様の適切な所で引く。④ その要点がスキーマの説明に在るか確かめる | 本書が従う |
| `JDG-78` | 2026-09-14 | 異常系・準正常系は極力起こさない。どのオブジェクトかを示す。自動で直せるものは直す。ケアは優先度が低く、リファクタ一式の後に `DFC-586` で行う | 従う —— `actualStart` があり `actualFinish` も `stop` も空の組（`PND-499`、裁定済で `DFC-586` へ送られた）は、本書で設計しない |
| `JDG-476` | — | 完了の判定は `actualFinish` の有無。`percentComplete` は消化率であって完了度ではない | 従う —— 完了率を状態の条件にしない |
| `JDG-478` | — | `percentComplete` が 100 で `actualFinish` が無い組とその逆は正常で、指摘にしない | 従う —— 指摘の欄に出さない |
| `JDG-1196` | — | `GRS JSON` を読んだら `percentComplete` を日付から数え直す。MSPDI を読んだら取り込んだ値を保つ | 従う —— 表の前書きと完了率の 2 つの欄 |
| `JDG-1430` | — | 完了率の分母（予定の期間）を `FR-011` の数え方で数える。マイルストーンは 0 | 従う —— 完了率の欄を「予定の期間が 0 より長い」「0」に分ける |
| `JDG-69` | — | 実績の最後の日は `actualFinish` か `stop`、長さは日付から数える | 従う。表から「実績の最後の日」の欄を外し、`FR-011` だけが持つ形にする（③ の 3） |
| `JDG-66` | — | 実績の長さが 0 を下回る置き方は拒む（表 T-220 の `IV-21`） | 従う —— 表は拒まれなかった文書を読む、と前書きに書く |
| `JDG-521` | — | コピーは未着手（表 T-019 の `PA-1`）として作る | 変えない（`PA-1` は残る） |
| `JDG-2684`・`JDG-2740` | — | 命令 `CM-13` の判別の鍵 `state` の値は `notStarted`（`PA-1`）・`inProgress`（`PA-2`）・`suspendedWithResumeDate`（`PA-3`）・`suspendedWithoutResumeDate`（`PA-4`）・`finished`（`PA-5`） | 従う —— 「`GRS` が置くか」の欄はこの値を引く |
| `JDG-2803` | — | 進捗マーカーを押したタスクは、診断をやり直すまで普段の状態（表 T-019 の状態）で出す | 変えない |
| `JDG-3165` | 2026-10-24 | 実績終了日がある `Task` に `resumeValid` が真で残っていても、遅延診断は矛盾にも疑義にもしない —— 状態の判別は実績終了日を先に見るので効かず、`FR-010` が実在の形とする（先例 `JDG-1005`: 同じ日に始まる FS を矛盾にしない） | 本書が従う —— `VC-8` の条件はこの組そのものなので、`VC-8` と、それを直す `FA-8` を退ける（X-14） |

覆す裁定: 無い。覆す仕様の行: 表 T-310 の `VC-8`（入れた裁定の行は無い —— `rulings.md` を `VC-8` で引いて 2 件: `JDG-1748`（辞書の語の一覧に並ぶだけ）と `JDG-3165`）。

台帳: `defects.md` で `T-019` を持つ行は `DFC-1017`・`DFC-1470`・`DFC-2606`・`DFC-2967` の 4 つ（どれも本書と重ならない —— 本書が閉じるのは `DFC-2967` だけ）。`fixed-defects.md` は `DFC-51`・`DFC-286`・`DFC-294` の 3 つ（直したもの。`DFC-294` の試験は `FR-010` の注記の文を引くので、注記は `FR-010` に残す —— ③ の 7）。`pending-decisions.md` は `PND-164`・`PND-318`・`PND-362`・`PND-499`・`PND-710` の 5 つで、どれも `裁定済`。`PND-499` が 3 行（`PA-新9`・`PA-新11`・`PA-新13`）の読みを `DFC-586` へ送っている。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1`（`GL-004` —— 描いた日程表が、機械が読める構造化データとして出し入れでき、情報を落とさずに往復できる）。スキーマだけを渡されて `GRS JSON` を書く者（AI を含む）は、今、`actualStart`・`actualFinish` に説明を持たず、状態を決める順も読めない（`grs-document.schema.json` の `Task` の説明は "One task: its plan, and its actual given by dates." の 1 文だけ —— 13 節）。判別の順と各列の要点がスキーマに在れば、書き手が「完了したつもりで `percentComplete` に 100 を書き `actualFinish` を空にする」形を書かずに済む。

`CH-7`（`GL-009` —— 遅れの発生源と、数字が信用できないタスクを、読み手が判断せずに受け取れる）。`VC-8` を退けると、交換相手の正常なファイルにある「中断してから完了したタスク」に `?` が付かず、そこから依存の下流の診断が止まらない（`JDG-3165`）。

仕様書の側（表を 1 つに引き直すこと）は、どの課題も直には進めない土台の手入れである。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の次の条項を当てた。

- **`R1.3`**（唯一の正・重複なし）: 状態の判別は 表 T-019a の 1 か所。今の 表 T-019 の「実績の最後の日」の欄は `FR-011` の STATEMENT（「実績の最後の日を完了したタスクでは `actualFinish`、それ以外では `stop`」）のコピーである —— 外す。新しい 表 T-019 の「状態」の欄は手で打たず、生成器が 表 T-019a の段を当てて刷る —— 判別を 2 か所に持たない。
- **`R1.5`**（MECE）: 5 つの列の値の組は 2 × 2 × 2 × 2 × 3 ＝ 48 通り（日付の 4 列が「空」「日付」、`resumeValid` が「`true`」「`false`」「空」）。今の 表 T-019 が覆うのは 7 通り（`PA-1` が `resumeValid` の 3 通り、`PA-2`〜`PA-5` が 1 通りずつ）で、残る 41 通りの完了率と指摘は、`FR-012`・`FR-131`・表 T-310・表 T-312 に散る。新しい表は 48 通りのどれにもちょうど 1 行が当たる（13 節の小さな数えで 0 の抜け・0 の重なりを確かめた）。1.9 節の決定表の規則を、生成器が書く前に確かめる。
- **`R1.4`**（異常系・準正常系）: 異常な組（`actualStart` が空なのに日付がある、など）にも行を与える —— 状態と指摘は今の仕様が言っているので、表はそれを引くだけ。今の仕様が読みを持たない 2 か所（`PA-新9`・`PA-新11`・`PA-新13` の完了率と、`MSPDI` から来た空の `percentComplete` の指摘）は `JDG-78` により `DFC-586` へ送り、設計しない。
- **`R1.3`**（矛盾）: 1 つの組で `FR-010` と 表 T-310 の `VC-8` が食い違って読める所があった（完了したタスクに `resumeValid` が真で残る組）。11 節の問い 1 で問い、利用者が「指摘にしない」と答えた（`JDG-3165`）。`VC-8` の条件はこの組そのもので、答えの後は当たる組が 1 つも無いので、狭めずに退ける（X-14）。
- **`R2.1`**（名は体を表す）: 原稿は 表 T-019a（判別の段）と 表 T-019（値の組）を持つので、名を `plan-actual-states` とした。
- **`R2.7`**（DRY）: 「状態」の欄を生成で刷るのと同じ理由で、「`GRS` が置くか」の欄は 表 T-108 の `CM-13` の `state` の値を引くだけにし、置く値を述べる行（`PV-`・`GO-`）をコピーしない。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 1 | ⭐ 新しい表を 3 つ目として並べず、**表 T-019 を「値の組の表」に作り直す**。番号 `T-019` と行 `PA-1`〜`PA-5` は保つ。表 T-019a は今のまま（行も字も同じ）。2 つとも原稿へ移し、`_assets` に刷る | 3 つ目の表を並べれば、各組の状態が 表 T-019a の答えと並んで 2 度書かれる（1 つの意味は 1 つの表）。今の 表 T-019 の意味「`GRS` がその状態にするときに置く値」は、新しい表の 5 行（`GRS` が置く組）にそのまま入る —— 表を延ばすのが正直な形。番号を保てば、`PA-1`〜`PA-5` を `FR-010` の外で引く原稿の 11 行（`01-04-requirements.md` の 4 行・`_source/document-commands.json` の 5 行・`_source/property-items.json` の 1 行・`_source/settings.json` の 1 行 —— 13 節）を書き換えずに済む | 表 T-019 の行が 5 から 18 に増える |
| 2 | 表 T-019 の「状態」「判別の段」は生成器が 表 T-019a の段を上から当てて刷る。原稿の組は状態を持たない | `R1.3` | 1 行の値の組が 2 つの段にまたがると刷れない —— 生成器が拒む（行を割って書く） |
| 3 | 今の 表 T-019 の「実績の最後の日」の欄を外す | `FR-011` の STATEMENT のコピー（`R1.3`）。読む試験は 0 件（`tests` を「実績の最後の日」で引き、`specTable` の欄として読むものは無かった —— 13 節） | 表だけを見て最後の日を引けなくなる（`FR-011` を読む） |
| 4 | `percentComplete` は条件の列にせず、結論の 2 つの欄（予定の期間が 0 より長い／0）とする | 状態を決めない（`FR-131`、`JDG-476`）。`GRS JSON` を読めば日付から数え直すので、条件にしても値が決まっている（`FR-012`） | `MSPDI` から取り込んだ値は表に出ない —— 前書きの 1 文で「人が日付を編集するまで取り込んだ値を保つ」と言う |
| 5 | 指摘の欄は、表 T-310 の層 3（`VC-5`〜`VC-7` —— 使う列がこの 5 列と `percentComplete` だけ。`VC-8` は X-14 で退く）と、この組を名指す 表 T-312 の `VO-2` だけを引く | ほかの指摘は予定の日付・基準日・依存・親子を合わせて見る。引けば表が依存の表になる | 表を見ても `VO-1` などは出ない —— 前書きでそう言う |
| 6 | `resumeValid` の値の域に「空」を入れ、表 T-019a の文字どおり（`PS-3` は「`false`」だけ）に読む | スキーマと 表 T-058 の `AT-38` が空を許す（null 可）。`src/entity/document-model/schedule/plan-actual-state.ts` の 21 行も `=== false` だけを見る | 「空 ＝ 偽」と読む設計にはならない（読みを変えるなら別の変更要求） |
| 7 | `FR-010` の散文（判別の順の MUST、全域、中止、`PS-2`・`PS-3` の順の理由、`ActualDuration` の注記）は `FR-010` に残し、移すのは 2 つの表だけ | 試験 `tests/contract/dfc-294-…` は注記の文を `01-04-requirements.md` から引く（104 行・108 行）。MUST の文を生成物へ移すと、MUST の数えと試験の両方が動く | 「表 T-019 の注記」と呼んでいた 4 か所を「`FR-010` の注記」と書き直す（X-8） |
| 8 | 表 T-019 の 1.9 節の決定表の規則（抜けも重なりも無い）は、生成器が書く前に確かめる。検査 57 は広げず、その頭書きに 1 文足す | 検査 57 は `01-04-requirements.md` だけを読む。生成した表は書く前に自分を確かめる（`property_items_json_to_md.py` の "REFUSED BEFORE A BYTE IS WRITTEN" と同じ） | 値の域は原稿が持つ（検査の側には持たない） —— `CR-430` の 8 節は手で書いた表の域を検査に置くと決めたもので、機械の読める原稿を持つ表には当てない |
| 9 | 新しい 13 行も接頭辞 `PA` とし、登録簿（`_source/row-id-prefixes.json`）の `PA` の意味を「予実の 5 つの列の値の組」に書き直す | 行の意味は 18 行とも「5 つの列の 1 つの値の組」で 1 つ | — |
| 10 | 判別の順はスキーマの `Task` の説明（`erd.json` の `Task` の `description.en`）に書き、列ごとの要点は各列の `schemaNote.en` に書く。`actualStart`・`actualFinish` には今は説明が無いので足す | 判別は 4 つの列にまたがる規則で、1 つの列の説明に置くと他の 3 列から見えない | `Task` の説明が 1 文から 4 文になる |
| 11 | 「`GRS` が置くか」の欄は `CM-13` の `state` の値を引く。`PA-1` で置く `resumeValid` の値は書かない（今の 表 T-019 の「—」のまま） | 表 T-021a の `PV-4` は `false` を置くと言い、`src/use-case/edit-document/task-plan-actual.ts` の 350 行は「`PA-1` のセルは —」として触らない。本書は置く値を変えない | 食い違いは本書の外（台帳の行にするかは調整役が決める） |
| 12 | `actualStart` が空で `actualFinish` に日付がある 12 通りを 1 行（`PA-新3`、`resumeValid` は「—」）にまとめ、仮の番号を詰めた（問うたときの `PA-新5`〜`PA-新14` は `PA-新4`〜`PA-新13`） | `JDG-3165` の後、`resumeValid` が真の側と真でない側の結論が同じになった。結論の同じ 2 行を、重ならないために要る分割でもないのに分けておく理由が無い | — |
| 13 | `VC-8` は狭めずに退け、それを直す `FA-8` も退ける。2 つの席は焼いたまま（`.claude/skills/spec-graph-check/retired.py` に理由とともに足す）。表 T-373 の前書きの「機械の直しが書き換えるのは…`resumeValid`…」から `resumeValid` を外す | `VC-8` の条件「`actualFinish` があるのに `resumeValid` が真」は、`JDG-3165` が指摘にしないと決めた組そのもので、狭めた後に残る組が無い。機械の直しで `resumeValid` を書き換える行は `FA-8` だけ（表 T-373 を `resumeValid` で引いて、ほかは `FA-7`（選ぶ）だけ） | 手か AI が書いた文書が完了したタスクに真を残しても告げない（利用者が受け入れた） |

---

## 1. 対応

| # | 直すこと | 仕様の ID | 直す物 |
|---|---|---|---|
| 1 | 表 T-019a と 表 T-019 の原稿を JSON で定め、生成器で `_assets` に刷る | 表 T-019 ・ 表 T-019a | `docs/spec/_source/plan-actual-states.json`（新）・`plan-actual-states.schema.json`（新）・`plan_actual_states_json_to_md.py`（新）・`docs/spec/_assets/tbl-plan-actual-states.md`（生成物、新） |
| 2 | 表 T-019 を 5 つの列の値の組 48 通りをすべて覆う表にし、組ごとに状態・`GRS` が置くか・完了率・指摘を引く | 表 T-019（`PA-1`〜`PA-5` と `PA-新1`〜`PA-新13`） | 同上 |
| 3 | `FR-010` が新しい置き場を引き、2 つの表を `01-04-requirements.md` から消す | `FR-010` | `docs/spec/01-04-requirements.md` |
| 4 | `FR-012` と 表 T-310 の前書きが 表 T-019 の欄を引く | `FR-012` ・ `FR-131`（表 T-310） | 同上 |
| 5 | 「表 T-019 の 5 状態」「表 T-019 の注記」「表 T-019 の 5 行」「表 T-019 の行」の言い方を、新しい表に合わせる | 表 T-005 の `G-13` ・ `FR-006` ・ `FR-011` ・ `FR-021` ・ `FR-044` ・ 図 F-018 の前書き ・ 表 T-108 の `CM-13` | `01-04-requirements.md`・`05-07-design.md`・`_source/document-commands.json` |
| 6 | 原稿の置き場の規則（6.2）に 1 段足す | 6.2 | `docs/spec/05-07-design.md` |
| 7 | 接頭辞 `PA` の意味を書き直す | 登録簿（表は生成） | `docs/spec/_source/row-id-prefixes.json` |
| 8 | スキーマの説明に、判別の順と各列の要点を足す | 表 T-058 の `AT-34`・`AT-36`・`AT-141`・`AT-37`・`AT-38`・`AT-39`（列の意味は変えない） | `docs/spec/_source/erd.json`（`schemaNote.en` と `Task` の `description.en`）→ 生成で `grs-document.schema.json` |
| 9 | 表の置き場を数える道具・検査・試験の補助に 1 行ずつ足す | — | 4 節の表 |
| 10 | 完了したタスクに残った `resumeValid` の真を指摘にしない —— `VC-8` と `FA-8` を退け、「指摘にしない組」に足す（`JDG-3165`） | 表 T-310 の `VC-8`・表 T-373 の `FA-8`・表 T-312 の下の結び | `01-04-requirements.md`・`_source/display-words.json`・`.claude/skills/spec-graph-check/retired.py` |
| 11 | `VC-8` を立て、`FA-8` で直すコードを外す | — | `src/entity/document-model/schedule/delay-diagnostics.ts`・`delay-fixes.ts`、試験 1 本の 1 行 |

---

## 2. 影響

```
数の予測         tables 0 新（表 T-019 を作り直し、表 T-019a とともに _assets へ移す） ・ rows +13（PA-新1〜PA-新13） −2（表 T-310 の VC-8、表 T-373 の FA-8）
                 ・ uids 0（要求・行の UID の新設は無い。StrictDoc の文書 UID が 1 つ: DOC-TBL-PLAN-ACTUAL-STATES） ・ figures 0
impact.py        T-019 を指す要求 8 件（FR-006・FR-033・FR-010・FR-011・FR-044・FR-012・FR-103・FR-021）、2 次 42 件。
                 T-019a を指す要求 6 件（FR-010・FR-044・FR-131・FR-132・FR-151・FR-092）、2 次 39 件。
                 FR-012 を指す要求 14 件 / 33 箇所。FR-131 を指す要求 6 件 / 10 箇所。表 T-310 を指す要求 6 件。
                 CM-13 を指す 17 箇所。G-13 を指す要求 4 件 / 5 箇所。
                 VC-8 を指すのは FR-155 の 1 箇所（表 T-373 の FA-8 の行）だけ。FA-8 を指す所は 0。
                 ⇒ 2 行を一緒に退ければ、ほかに書き換える引用は無い
                 ⭐ 2 次の要求はどれも ID で引くだけで、表の置き場も行の意味も変えないので書き換えない。
                 書き換えるのは 1 次のうち 7 か所（X-4〜X-8）だけ —— FR-033 の DU-1（PA-1）・FR-103 の GO-3（PA-5）・
                 FR-131・FR-132・FR-151・FR-092 の T-019a の引用は、行 ID がそのまま残るので変えない
induced.py       種 14（T-019 T-019a FR-010 FR-012 FR-131 T-310 CM-13 G-13 AT-34 AT-36 AT-37 AT-38 AT-39 AT-141）:
                 辺 15、輪 0。
                 種 18（上に FR-006 FR-011 FR-021 FR-044 を足す）: 辺 34、輪 1（大きさ 4: AT-141 FR-006 FR-011 FR-012）。
                 ⇒ 輪の 4 つのうち本書が触るのは FR-006・FR-011（引用の言い方だけ）・FR-012（1 文足す）・AT-141（スキーマの説明だけ）。
                 1 回の書き込みで当てる。
                 種 18（最初の 14 に VC-8 FA-8 T-312 T-373 を足す）: 辺 18、輪 0
生成物           docs/spec/_assets/tbl-plan-actual-states.md（新）・docs/spec/_assets/tbl-row-id-prefixes.md（PA の意味と行の数 5 → 18、
                 定義の置き場）・docs/spec/_assets/tbl-document-commands.md（CM-13 の 1 句）・docs/spec/_source/grs-document.schema.json
                 （説明 7 つ）・docs/spec/_source/grs-commands.schema.json（同じ列の説明を CM-13 などの引数へコピーする生成）・
                 src/adapter/screen-renderer/image-to-grs-json-prompt.json（スキーマを抱える生成物）・dist/index.html（組み立て）。
                 tools/artifact-versions.json の grsRelayBuiltAt —— grs-document.schema.json は GRS Relay の中身に数える（同ファイルの
                 grsRelayInputs）ので、当てる子が node tools/artifact_versions.mjs bump grsRelay を回す（検査 85）
形式の版         上げない —— 説明は形の指紋に入らない（tests/contract/dfc-2950-… の 53 行「prose is left out」）。
                 grs-json-changes.json にも足さない（形を変えない）
src のコード     VC-8 を立てる所と FA-8 の直しを外す（4 節 —— delay-diagnostics.ts・delay-fixes.ts）。ほかは生成物だけ（上）と、
                 古くなるコメント 1 行（4 節）。src/adapter/screen-renderer/display-words.json（生成物）から VC-8 の語が抜ける
試験             既存の 4 つ（cr-604・cr-571・dfc-286・document-model）は 表 T-019a / 表 T-019 を specTable で読む —— 置き場が
                 変わるので tests/contract/spec-table.ts の FILES に 1 行足せば緑のまま（欄の名「状態」「条件」と T-019a の字は同じ）。
                 tests/contract/cr-731-t-373-the-rows-that-mend-themselves.contract.test.ts の 166 行（FA-8 の場合）を外す。
                 仕様だけを読む試験を 1 本足す（4 節）
毎フレームの仕事 無い —— 仕様書・生成器・スキーマの説明だけ
```

---

## 3. 書き直す所

### X-1 —— 原稿（新）`docs/spec/_source/plan-actual-states.json`

形の見本（当てる子が `plan-actual-states.schema.json` とともに仕上げる）。分類の値（`empty`・`date`・`true`・`false`）は分類として持ち、表示の語（空・日付）は生成器が刷る（`05-07-design.md` の 6.2「分類を述べる欄を辞書にしてはならない」）。散文の欄は `{"ja": …}` の辞書で持つ。

```json
{
 "$schema": "./plan-actual-states.schema.json",
 "$comment": [
  "SINGLE SOURCE OF TRUTH -- EDIT THIS FILE.",
  "Table T-019a (the steps that judge the plan/actual state, first match wins) and table T-019 (every combination of the five actual columns, and how each is read).",
  "Generated FROM this file: _assets/tbl-plan-actual-states.md (plan_actual_states_json_to_md.py).",
  "Rebuild: npm run gen   |   npm run gen:check fails if anything has drifted.",
  "Validated by _source/plan-actual-states.schema.json.",
  "NO STATE IS TYPED ON A COMBINATION: the generator prints it from the first step whose condition holds, so the judging lives in one place."
 ],
 "columns": [
  { "name": "actualStart",  "values": ["empty", "date"] },
  { "name": "actualFinish", "values": ["empty", "date"] },
  { "name": "stop",         "values": ["empty", "date"] },
  { "name": "resume",       "values": ["empty", "date"] },
  { "name": "resumeValid",  "values": ["true", "false", "empty"] }
 ],
 "steps": [
  { "id": "PS-1", "when": { "actualStart": ["empty"] },  "condition": { "ja": "`actualStart` が空" },        "state": { "ja": "未着手" } },
  { "id": "PS-2", "when": { "actualFinish": ["date"] },  "condition": { "ja": "`actualFinish` がある" },     "state": { "ja": "完了" } },
  { "id": "PS-3", "when": { "resumeValid": ["false"] },  "condition": { "ja": "`resumeValid` が `false`" },  "state": { "ja": "中断・再開日未定" } },
  { "id": "PS-4", "when": { "resume": ["date"] },        "condition": { "ja": "`resume` に日付がある" },    "state": { "ja": "中断・再開予定あり" } },
  { "id": "PS-5", "when": {},                            "condition": { "ja": "上のどれにも当たらない" },   "state": { "ja": "進行中" } }
 ],
 "combinations": [
  {
   "id": "PA-1",
   "when": { "actualStart": ["empty"], "actualFinish": ["empty"], "stop": ["empty"], "resume": ["empty"] },
   "placedAs": "notStarted",
   "percentComplete": { "plannedSpan": { "ja": "…" }, "zeroSpan": { "ja": "…" } },
   "findings": { "ja": "…" }
  }
 ]
}
```

- `when` に書かない列は「—」（その列のどの値でも当たる）、2 つ以上の値は「／」で並べて刷る。
- `placedAs` は 表 T-108 の `CM-13` の `state` の値か `null`（置かない）。生成器は値が `_source/document-commands.json` の形 `PlanActualPlacement` の `state` の値にあるかを確かめてよい（当てる子が決める）。
- 各セルの字は X-3 の表のとおり。

### X-2 —— 生成器（新）`docs/spec/_source/plan_actual_states_json_to_md.py`

`property_items_json_to_md.py`・`notice_reasons_json_to_md.py` と同じ形（`spec_md_printing` の `say`・`separate_tables`・`broken`・`schema_problems` を使い、`--check` を持つ）。docstring の頭で書く物（`docs/spec/_assets/tbl-plan-actual-states.md`）を名乗る（検査 21 の `_source` の決まり）。

書く前に拒むもの:

1. `plan-actual-states.schema.json` が拒むもの（`jsonschema` があるとき）。
2. 行 ID の二重。升の中の縦棒・改行。
3. `when` が `columns` に無い列か値を名指す。
4. 最後の段（`PS-5`）が条件を持つ（全域でなくなる）。
5. 1 つの組の行が、開くと 2 つ以上の段に当たる（状態を 1 つに刷れない）。
6. 5 つの列の値の組（2 × 2 × 2 × 2 × 3 ＝ 48 通り）のどれかに当たる行が 0 か 2 以上（`01-04-requirements.md` の 1.9 の決定表の規則）。

刷るもの: 文書の頭（X-3）、表 T-019a（`行 ID | 順 | 条件 | 状態` —— 順は配列の位置）、表 T-019（X-3）。

### X-3 —— 生成物（新）`docs/spec/_assets/tbl-plan-actual-states.md`（後の姿）

```markdown
# 予実の状態と列の組 — 表 T-019a・表 T-019

**UID**: DOC-TBL-PLAN-ACTUAL-STATES
**Version**: 0.1

> ⛔ 本書は生成物である。
> 手で直さない —— 直しても次の `npm run gen` で消える。
> **予実の状態と列の組の唯一の正は `_source/plan-actual-states.json` である。**
> 本書はそれを `_source/plan_actual_states_json_to_md.py` が印字したものである。
> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`（検査 16 が呼ぶ）。

規則は `FR-010`（判別と置く値）・`FR-012`（完了率）・`FR-131`（指摘）が持つ。
本書は 表 T-019a（判別の段）と 表 T-019（予実の 5 つの列の値の組ごとの読み）を印字する。

**表 T-019a — 予実の状態の判別**

| 行 ID | 順 | 条件 | 状態 |
| --- | :-: | --- | --- |
| PS-1 | 1 | `actualStart` が空 | 未着手 |
| PS-2 | 2 | `actualFinish` がある | 完了 |
| PS-3 | 3 | `resumeValid` が `false` | 中断・再開日未定 |
| PS-4 | 4 | `resume` に日付がある | 中断・再開予定あり |
| PS-5 | 5 | 上のどれにも当たらない | 進行中 |

条件の欄は `actualStart`・`actualFinish`・`stop`・`resume`・`resumeValid` の 5 つである。
日付の 4 列の値は「空」か「日付」、`resumeValid` の値は「`true`」「`false`」「空」である。
「—」はその列のどの値でも当たることを表し、「／」で並べた値はそのどれでも当たる（`01-04-requirements.md` の 1.9）。
⭐ 5 つの列の値の組 48 通り（2 × 2 × 2 × 2 × 3）のどれにも、ちょうど 1 行が当たる —— 生成器が書く前に確かめる。
`判別の段` と `状態` は、生成器が 表 T-019a の段を上から当てて刷る。
`GRS` が置くのは `PA-1` 〜 `PA-5` の 5 つの組だけであり（表 T-108 の `CM-13` の `state`）、ほかの組は読むだけである。
`percentComplete` の 2 つの欄は、`GRS JSON` を読んだ後と、人が日付を編集した後に格納する値である（`FR-012`）。
⚠️ `MSPDI` から取り込んだ文書では、人がそのタスクの日付を編集するまで、取り込んだ値（空を含む）を保つ（`FR-012`・`FR-021`）。
⛔ `percentComplete` は状態を決めない（`FR-131`）。
予定の日付が本表に効くのは、完了率の分母（予定の期間）と、期間が 0 の扱いだけである —— 画面に出す `Task` は `start` と `finish` を持ち、`finish` は `start` より前でない（`FR-012`）。
中身のない行（表 T-033 の `EX-5`）は `Task` として出さないので、本表に当たらない。
実績の長さが 0 を下回る置き方は取り込みで拒む（`05-07-design.md` の 表 T-220 の `IV-21`） —— 本表はその後の文書を読む。
指摘の欄は、表 T-310 の層 3（`VC-5` 〜 `VC-7`）と、この列の組を名指す 表 T-312 の `VO-2` だけを引く —— ほかの指摘は予定の日付・基準日・依存・親子を合わせて見る（表 T-310 〜 T-312）。

**表 T-019 — 予実の 5 つの列の値の組と読み**

| 行 ID | `actualStart` | `actualFinish` | `stop` | `resume` | `resumeValid` | 判別の段 | 状態 | `GRS` が置くか | `percentComplete`（予定の期間が 0 より長い） | `percentComplete`（予定の期間が 0） | この組だけで立つ指摘 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PA-1 | 空 | 空 | 空 | 空 | — | `PS-1` | 未着手 | 置く —— `CM-13` の `'notStarted'` | `0` —— `actualStart` が無ければ分子は 0（`FR-033` の `DU-1`、表 T-310 の `VC-5` の注） | `0`（`FR-012`） | `percentComplete` が 0 より大なら `VC-5`。<br>`GRS JSON` では 0 なので立たない |
| PA-新1 | 空 | 空 | 日付 | — | — | `PS-1` | 未着手 | 置かない | `0` —— 同上 | `0`（`FR-012`） | `percentComplete` が 0 なら `VC-7`、0 より大なら `VC-5`。<br>`GRS JSON` では 0 なので `VC-7` |
| PA-新2 | 空 | 空 | 空 | 日付 | — | `PS-1` | 未着手 | 置かない | `0` —— 同上 | `0`（`FR-012`） | `percentComplete` が 0 なら `VC-7`、0 より大なら `VC-5`。<br>`GRS JSON` では 0 なので `VC-7` |
| PA-新3 | 空 | 日付 | — | — | — | `PS-1` | 未着手 | 置かない | `0` —— 同上 | `100` —— `actualFinish` がある（`FR-012`） | `VC-6`。<br>`percentComplete` が 0 より大なら `VC-5`（`GRS JSON` では予定の期間が 0 のとき）、0 で `stop` か `resume` を持てば `VC-7` |
| PA-5 | 日付 | 日付 | 空 | 空 | `false` | `PS-2` | 完了 | 置く —— `CM-13` の `'finished'` | `FR-012` の式。<br>実績は `actualStart` から `actualFinish` まで（`FR-011`） | `100` —— `actualFinish` がある（`FR-012`） | — |
| PA-新4 | 日付 | 日付 | — | — | `true` | `PS-2` | 完了 | 置かない | `FR-012` の式。<br>実績は `actualStart` から `actualFinish` まで（`FR-011`） | `100` —— `actualFinish` がある（`FR-012`） | — |
| PA-新5 | 日付 | 日付 | 日付 | — | `false` ／ 空 | `PS-2` | 完了 | 置かない | `FR-012` の式。<br>実績は `actualStart` から `actualFinish` まで（`FR-011`） | `100` —— `actualFinish` がある（`FR-012`） | — |
| PA-新6 | 日付 | 日付 | 空 | 日付 | `false` ／ 空 | `PS-2` | 完了 | 置かない | `FR-012` の式。<br>実績は `actualStart` から `actualFinish` まで（`FR-011`） | `100` —— `actualFinish` がある（`FR-012`） | — |
| PA-新7 | 日付 | 日付 | 空 | 空 | 空 | `PS-2` | 完了 | 置かない | `FR-012` の式。<br>実績は `actualStart` から `actualFinish` まで（`FR-011`） | `100` —— `actualFinish` がある（`FR-012`） | — |
| PA-4 | 日付 | 空 | 日付 | 空 | `false` | `PS-3` | 中断・再開日未定 | 置く —— `CM-13` の `'suspendedWithoutResumeDate'` | `FR-012` の式。<br>実績は `actualStart` から `stop` まで（`FR-011`） | `0` —— `actualFinish` が無い（`FR-012`） | — |
| PA-新8 | 日付 | 空 | 日付 | 日付 | `false` | `PS-3` | 中断・再開日未定 | 置かない | `FR-012` の式。<br>実績は `actualStart` から `stop` まで（`FR-011`） | `0` —— `actualFinish` が無い（`FR-012`） | — |
| PA-新9 | 日付 | 空 | 空 | — | `false` | `PS-3` | 中断・再開日未定 | 置かない | 本書は定めない —— `FR-011` は終わりの無い実績の長さを定めない | `0` —— `actualFinish` が無い（`FR-012`） | `finish` が基準日より前なら 表 T-312 の `VO-2` |
| PA-3 | 日付 | 空 | 日付 | 日付 | `true` | `PS-4` | 中断・再開予定あり | 置く —— `CM-13` の `'suspendedWithResumeDate'` | `FR-012` の式。<br>実績は `actualStart` から `stop` まで（`FR-011`） | `0` —— `actualFinish` が無い（`FR-012`） | — |
| PA-新10 | 日付 | 空 | 日付 | 日付 | 空 | `PS-4` | 中断・再開予定あり | 置かない | `FR-012` の式。<br>実績は `actualStart` から `stop` まで（`FR-011`） | `0` —— `actualFinish` が無い（`FR-012`） | — |
| PA-新11 | 日付 | 空 | 空 | 日付 | `true` ／ 空 | `PS-4` | 中断・再開予定あり | 置かない | 本書は定めない —— `FR-011` は終わりの無い実績の長さを定めない | `0` —— `actualFinish` が無い（`FR-012`） | `finish` が基準日より前なら 表 T-312 の `VO-2` |
| PA-2 | 日付 | 空 | 日付 | 空 | `true` | `PS-5` | 進行中 | 置く —— `CM-13` の `'inProgress'` | `FR-012` の式。<br>実績は `actualStart` から `stop` まで（`FR-011`） | `0` —— `actualFinish` が無い（`FR-012`） | — |
| PA-新12 | 日付 | 空 | 日付 | 空 | 空 | `PS-5` | 進行中 | 置かない | `FR-012` の式。<br>実績は `actualStart` から `stop` まで（`FR-011`） | `0` —— `actualFinish` が無い（`FR-012`） | — |
| PA-新13 | 日付 | 空 | 空 | 空 | `true` ／ 空 | `PS-5` | 進行中 | 置かない | 本書は定めない —— `FR-011` は終わりの無い実績の長さを定めない | `0` —— `actualFinish` が無い（`FR-012`） | `finish` が基準日より前なら 表 T-312 の `VO-2` |
```

セルごとの出典（仕様から測った —— 作った振る舞いは無い）:

| 欄 | 行 | 出典 |
|---|---|---|
| 判別の段・状態 | 全 18 行 | 表 T-019a の `PS-1`〜`PS-5` を上から当てた（13 節の数えで 18 行とも 1 つの段に収まる） |
| `GRS` が置くか | `PA-1`〜`PA-5` | 表 T-108 の `CM-13` の `place`（`state` の 5 つの値と、それぞれが値を持つ列） |
| 同 | 他の 13 行 | `FR-010` の STATEMENT「状態を変えるときは 表 T-019 の値を置く」 —— `GRS` が実績を置く道（表 T-021a の巡り、表 T-245 の掴んで置く値、`CM-13`）は、どれも 5 つの状態のどれかの値を置く。`CM-13` の `state` も 5 つの値だけを持つ |
| 完了率（長い） | `actualStart` が空の 4 行 | 表 T-310 の `VC-5` の注（「`GRS JSON` から読んだ文書では…本行が立つのは `VC-6` も立つ期間 0 の `Task` だけ」 ⇒ 期間が 0 より長ければ 0）、`FR-033` の `DU-1`（「`FR-012` の式の分子が 0」） |
| 同 | `stop` か `actualFinish` を持つ着手済みの 11 行 | `FR-012` の STATEMENT と `FR-011`（実績の長さは `actualStart` から実績の終わり —— 完了なら `actualFinish`、それ以外は `stop`） |
| 同 | `PA-新9`・`PA-新11`・`PA-新13` | `FR-011` は終わりの無い実績の長さを定めない。表 T-313 の `BD-1` は残りを数えるときだけ「実績の終わりが無ければ `FR-011` の床まで数える」と言い、`src/use-case/edit-document/percent-complete.ts` の 23 行は長さが無ければ 0 とする —— 決めない（5 節で `DFC-586` へ） |
| 完了率（0） | 全 18 行 | `FR-012` の「予定の期間が 0 の `Task` では…`actualFinish` があれば 100、無ければ 0」 |
| 指摘 | `VC-5` | 表 T-310 の `VC-5`「`percentComplete` が 0 より大きいのに `actualStart` が無い」 |
| 同 | `VC-6` | 同 `VC-6`「`actualFinish` があるのに `actualStart` が無い」 |
| 同 | `VC-7` | 同 `VC-7`「未着手（`percentComplete` が 0 かつ `actualStart` が無い）なのに `stop` または `resume` を持つ」 |
| 同 | `VO-2` | 表 T-312 の `VO-2`「`finish` が基準日より前で、着手済みなのに `actualFinish` も `stop` も無い」 |
| 同 | 「—」の行 | 表 T-310 の層 3 の 3 行がどれも当たらない。`percentComplete` が 100 で `actualFinish` が無い組とその逆、`actualFinish` があって `resumeValid` が真の組（`JDG-3165`、X-14 —— `PA-新4` は全体が、`PA-新3` はその一部がこれで、`PA-新3` には `VC-6` だけが残る）は、表 T-312 の下の「指摘にしない組」 |

消すもの: 今の 表 T-019 の欄「実績の最後の日」（③ の 3）。今の 表 T-019 の見出し「予実の 5 状態」（5 行の表ではなくなる）。

### X-4 —— `FR-010`（`docs/spec/01-04-requirements.md` の 3043 行〜3083 行）

前（3043 行）:

> **STATEMENT**: `GRS` は、`Task` の予実の状態を**表 T-019a の手順**で判別し、状態を変えるときは**表 T-019 の値**を置くこと。

後:

> **STATEMENT**: `GRS` は、`Task` の予実の状態を**表 T-019a の手順**で判別し、状態を変えるときは**表 T-019 のうち `GRS` が置く行（`PA-1` 〜 `PA-5`）の値**を置くこと。  
> ⭐ 2 つの表は `_assets/tbl-plan-actual-states.md` が持つ —— 原稿 `_source/plan-actual-states.json` から起こす生成物である（`05-07-design.md` の 6.2）。  
> 表 T-019 は、予実の 5 つの列（`actualStart`・`actualFinish`・`stop`・`resume`・`resumeValid`）の値の組を、空を含めてすべて覆い、組ごとに、判別した状態・`GRS` が置く組か・格納する完了率（`FR-012`）・その組だけで立つ指摘（`FR-131`）を引く。

前（3049 行・3050 行）:

> ⚠️ 「表 T-019 の 5 つから外れる入力を受け付けない」という形にしてはならない（MUST NOT） —— 表 T-019 は `GRS` が置く値の表であって、交換相手が書きうる組み合わせの全数ではない。  
> 交換相手は**途中で中断して完了したタスク**に `Stop` / `Resume` / `ResumeValid` を残すので（`Resume` は過去の日付である）、表 T-019 のどの行にも当たらない実在の形がある。

後:

> ⚠️ 「`GRS` が置く 5 行（表 T-019 の `PA-1` 〜 `PA-5`）から外れる入力を受け付けない」という形にしてはならない（MUST NOT） —— 5 行は `GRS` が置く値であって、交換相手が書きうる組み合わせの全数ではない。  
> 交換相手は**途中で中断して完了したタスク**に `Stop` / `Resume` / `ResumeValid` を残すので（`Resume` は過去の日付である）、5 行のどれにも当たらない実在の形がある —— その形の読みも 表 T-019 が引く。

消すもの:

- 3053 行・3054 行「本表は、`GRS` がその状態にするときに置く値である。」「読むときの判別は表 T-019a が持つ。」 —— STATEMENT の新しい 2 文が言う。
- 3056 行〜3064 行 —— 見出し「**表 T-019 — 予実の 5 状態**」と表（X-3 へ移る）。
- 3075 行〜3083 行 —— 見出し「**表 T-019a — 予実の状態の判別**」と表（X-3 へ移る。字は変えない）。

残すもの（字を変えない）: 3045 行〜3047 行の ORIGIN・RATIONALE、3051 行（`FR-012` の「中身のない行」の文）、3066 行〜3069 行（「中止」・「遅れ」）、3071 行〜3073 行（判別の MUST・全域・「どの状態でもない」）、3085 行〜3088 行（`PS-2`・`PS-3` の順の理由）、3090 行〜3093 行（`ActualDuration` の注記）。⚠️ 残す文の「表 T-019a」「表 T-019」は番号で引くので、そのまま新しい置き場に届く。

### X-5 —— `FR-012`（同 3339 行の後に 1 文足す）

前（3339 行、STATEMENT の最後の文）:

> ⚠️ 数え直しだけを理由に、未保存の編集（`FR-100`）を立ててはならない（MUST NOT） —— 読んで範囲へ収めた設定値（表 T-233 の `RS-51`）と同じく、置き換えで開いた文書は 表 T-290 の `unsavedEditsStateMachine` の `nothingUnsaved` へ移る。

後（上の文の次の行に足す）:

> ⭐ 予実の列の値の組ごとに格納する値は、`_assets/tbl-plan-actual-states.md` の 表 T-019 の `percentComplete` の 2 つの欄（予定の期間が 0 より長いときと 0 のとき）が引く。

### X-6 —— 表 T-310 の前書き（`FR-131`、同 3648 行の後に 1 文足す）

前（3648 行）:

> `VC-15` は瞬間で比べる（その行）。

後（次の行に足す）:

> ⭐ 層 3 の `VC-5` 〜 `VC-7` が、予実の列のどの値の組で立つかは、`_assets/tbl-plan-actual-states.md` の 表 T-019 の「この組だけで立つ指摘」の欄が引く。

### X-7 —— `FR-044` の RATIONALE（同 3308 行）

前:

> **RATIONALE**: 表 T-019 の 5 状態のうち 2 つ（PA-3 / PA-4）は再開予定日の有無で分かれるので、**その日付を人が置く手段が要る。**

後:

> **RATIONALE**: 表 T-019 の `GRS` が置く 5 行のうち 2 つ（PA-3 / PA-4）は再開予定日の有無で分かれるので、**その日付を人が置く手段が要る。**

### X-8 —— 「表 T-019 の注記」の 4 か所（注記は `FR-010` に残る —— ③ の 7）

| 所 | 前 | 後 |
|---|---|---|
| 表 T-005 の `G-13`（`01-04-requirements.md` の 268 行） | 「後者の規則は表 T-019 の注記が持つ」 | 「後者の規則は `FR-010` の注記が持つ」 |
| `FR-006`（同 2007 行） | 「⚠️ 取り込んだ `ActualDuration` の原値の扱いは表 T-019 の注記が持つ。」 | 「⚠️ 取り込んだ `ActualDuration` の原値の扱いは `FR-010` の注記が持つ。」 |
| `FR-011`（同 3146 行） | 「…Carry（表 T-005 の `G-13`）として持ち回る（表 T-019 の注記）。」 | 「…Carry（表 T-005 の `G-13`）として持ち回る（`FR-010` の注記）。」 |
| `FR-021`（同 6906 行） | 「⭐ 編集していないタスクは原値をそのまま書き戻す（表 T-019 の注記）。」 | 「⭐ 編集していないタスクは原値をそのまま書き戻す（`FR-010` の注記）。」 |

### X-9 —— `05-07-design.md`

(a) 6.2 の原稿の置き場の段（1711 行〜1714 行の知らせの名簿の段）の次に足す:

> ⭐ 予実の状態と列の組の原稿は `_source/plan-actual-states.json` とし、`_assets/tbl-plan-actual-states.md` の 表 T-019a・表 T-019 はそこから起こす生成物とする（MUST）。  
> 同文書を手で直してはならない（MUST NOT）。  
> ⭐ 同原稿は 表 T-019a の段を機械が読める条件として持ち、表 T-019 の行は 5 つの列の値だけを持つ —— 表 T-019 の状態の欄は、生成器が段を上から当てて刷る（手で打てば、同じ判別を 2 か所に持つ）。  
> ⭐ 生成器は、表 T-019 の行が 5 つの列の値の組をすべて覆い、2 行が同じ組に当たらないことを確かめてから書く（`01-04-requirements.md` の 1.9 の決定表の規則）。

(b) 図 F-018 の前書き（838 行）:

前: 「箱は 表 T-019 の 5 行、辺は 表 T-021a と `FR-043` / `FR-044` である。」

後: 「箱は 表 T-019 のうち `GRS` が置く 5 行（`PA-1` 〜 `PA-5`）、辺は 表 T-021a と `FR-043` / `FR-044` である。」

### X-10 —— 表 T-108 の `CM-13`（`docs/spec/_source/document-commands.json` の 993 行）

前: `"ja": "置く予実（表 T-019 の行と、その行が値を持つ列）"`

後: `"ja": "置く予実（表 T-019 のうち `GRS` が置く行 `PA-1` 〜 `PA-5` と、その行が値を持つ列）"`

### X-11 —— 接頭辞 `PA` の意味（`docs/spec/_source/row-id-prefixes.json` の 1025 行）

前: `"ja": "予定と実績が取りうる状態"`

後: `"ja": "予実の 5 つの列（actualStart・actualFinish・stop・resume・resumeValid）の値の組"`

（`PS` の「予実の状態を判別する順の段」は変えない。定義の置き場と行の数は生成器が毎回測る。）

### X-12 —— スキーマの説明（`docs/spec/_source/erd.json` → 生成で `grs-document.schema.json`）

スキーマの説明は仕様書の ID を持たず、概要と理由だけを言う（`05-07-design.md` の 6.2）。下の英文はどれも ID を持たない。

| 置き場 | 前 | 後 |
|---|---|---|
| `Task` の `description.en` | One task: its plan, and its actual given by dates. | One task: its plan, and its actual given by dates. Its progress state is read from the actual columns, first match wins: actualStart null, not started; actualFinish set, finished; resumeValid false, interrupted with no restart day; resume set, interrupted until that day; anything else, in progress. Finished is tested before the interruption columns because an MSPDI file may keep Stop, Resume and ResumeValid on a task that was interrupted and then finished. percentComplete never decides the state. |
| `actualStart` の `schemaNote.en` | （無い） | Null means not started. Leave the other actual dates null with it: a stop, resume or actualFinish without actualStart is still read as not started, and is reported as a contradiction. |
| `actualFinish` の `schemaNote.en` | （無い） | Set only once the task is finished: it is the actual's last day, and the task reads as finished whatever stop, resume and resumeValid hold. GRS writes it with stop null and resumeValid false; a resumeValid true left beside it is kept and changes nothing. |
| `stop` の `schemaNote.en` | MS Project's Stop, kept under its name for the round trip: the instant the actual has reached while the task is unfinished; null once actualFinish is set. | MS Project's Stop, kept under its name for the round trip: the instant the actual has reached while the task is unfinished. GRS writes it whenever actualStart is set and actualFinish is null, and null once actualFinish is set. |
| `resume` の `schemaNote.en` | MS Project's Resume: the day the rest of an interrupted task is planned to restart. | MS Project's Resume: the day the rest of an interrupted task is planned to restart. It counts only while resumeValid is not false, so GRS sets resumeValid true with it. |
| `resumeValid` の `schemaNote.en` | MS Project's ResumeValid: false means interrupted with no restart day decided. | MS Project's ResumeValid: false means interrupted with no restart day decided, and it outweighs a resume date. GRS writes false for that interruption and once the task is finished, and true in the other started, unfinished states. |
| `percentComplete` の `schemaNote.en` | Follows from the dates: round(actual length / planned length x 100), both in working minutes of the document calendar; the actual runs from actualStart to actualFinish, or to stop while unfinished, so statusDate does not move it. With no planned length (a milestone) it is 100 once actualFinish is set and 0 before. GRS recounts it whenever it reads this file and tells when the stored value differed, so write what the dates give. Not capped at 100, because an overrun reports more. | Follows from the dates: round(actual length / planned length x 100), both in working minutes of the document calendar; the actual runs from actualStart to actualFinish, or to stop while unfinished, and is 0 with no actualStart, so statusDate does not move it. With no planned length (a milestone) it is 100 once actualFinish is set and 0 before. GRS recounts it whenever it reads this file and tells when the stored value differed, so write what the dates give. Not capped at 100, because an overrun reports more. It never decides the state: 100 without actualFinish is still unfinished, and actualFinish below 100 finished early. |

各文の出典: `Task` の説明 ＝ 表 T-019a と `FR-010` の「交換相手は途中で中断して完了したタスクに…残す」と `FR-131`。`actualStart` ＝ `PS-1` と `VC-6`・`VC-7`（`GRS JSON` では `actualStart` が空なら完了率が 0 か 100 で、`actualFinish` があれば `VC-6`、無ければ `VC-7` が必ず立つ）。`actualFinish` ＝ `PS-2`・`PA-5`・`JDG-3165`（表 T-312 の下の「指摘にしない組」）。`stop` ＝ `PA-2`〜`PA-5`。`resume` ＝ `PS-3` が `PS-4` より先・`FR-044` の MUST。`resumeValid` ＝ `PA-2`〜`PA-5`（`PA-1` は「—」なので言わない）。`percentComplete` ＝ `VC-5` の注・`FR-131` の RATIONALE・`JDG-476`。


### X-13 —— 表の置き場を数える物に 1 行ずつ（`CR-712`・`CR-765`・`CR-766` が表を `_assets` へ移したときと同じ所）

| ファイル | 足す・直す行 |
|---|---|
| `.claude/skills/spec-graph-check/check-provenance.py`（59 行の次） | `('docs/spec/_assets/tbl-plan-actual-states.md', 'plan-actual-states.json'),` |
| `.claude/skills/spec-graph-check/check-line-breaks.py`（80 行の次） | `'docs/spec/_assets/tbl-plan-actual-states.md',` |
| `.claude/skills/spec-graph-check/check-marks.py`（64 行の次） | 同上 |
| `.claude/skills/spec-graph-check/check-must-clause-coverage.py`（176 行の次） | `os.path.join('_assets', 'tbl-plan-actual-states.md'),` |
| `.claude/skills/spec-graph-check/check-dictionary-table-covariance.py`（135 行の次） | 同上 |
| `.claude/skills/spec-graph-check/check-decision-tables.py`（頭書き） | 1 文 —— 「表 T-019 は決定表だが `_assets/tbl-plan-actual-states.md` に生成され、抜けと重なりは生成器が書く前に拒む」 |
| `tools/follow_the_manuscript.py`（60 行の次） | `'docs/spec/_assets/tbl-plan-actual-states.md',` |
| `tools/generate_display_words.py`（836 行） | 表 T-019a の行を `REL_REQUIREMENTS` ではなく新しい置き場から読む（定数を 1 つ足し、836 行の 1 引数を替える） |
| `tests/contract/spec-table.ts`（53 行の次） | `join('_assets', 'tbl-plan-actual-states.md'),` |
| `package.json`（38 行・39 行） | `gen:states` ／ `gen:states:check` を足し、`gen` と `gen:check` の鎖の `gen:prefixes` より前に入れる（接頭辞の登録簿の生成器は `docs/spec` の木を毎回なめて、`PA` の定義の置き場と行の数を測る） |
| `docs/development-rules/09-tools.md`（174 行の並び） | 生成器 1 行 |

### X-14 —— `VC-8` と `FA-8` を退け、「指摘にしない組」に足す（`JDG-3165`）

(a) 表 T-310（`01-04-requirements.md` の 3659 行）—— 行ごと消す:

> | VC-8 | 3 | `actualFinish` があるのに `resumeValid` が真 | その 2 列 |

(b) 表 T-373（同 3988 行）—— 行ごと消す:

> | FA-8 | `VC-8` | 機械 | `resumeValid` を偽にする | `CM-13` | — |

(c) 表 T-373 の前書き（同 3976 行）:

前: 「⭐ 機械の直しが書き換えるのは親（子を持つ `Task`）の値、依存線、`resumeValid`、マイルストーンの実績だけであり、子を持たない `Task` の予定と実績を書き換えない（利用者が定めた）。」

後: 「⭐ 機械の直しが書き換えるのは親（子を持つ `Task`）の値、依存線、マイルストーンの実績だけであり、子を持たない `Task` の予定と実績を書き換えない（利用者が定めた）。」

(d) 表 T-312 の下の「指摘にしない組」（同 3700 行の次に 1 行足す）:

前（3700 行）: 「`percentComplete` が 100 なのに `actualFinish` が無い組とその逆 —— どちらも正常である。」

後（次の行に足す）: 「`actualFinish` があるのに `resumeValid` が真の組 —— 状態の判別は `actualFinish` を先に見るので（表 T-019a の `PS-2`）、`resumeValid` は何にも効かない。交換相手は途中で中断して完了したタスクに残す（`FR-010`）。」

(e) 語の辞書 `docs/spec/_source/display-words.json` の 6713 行〜6718 行（`"rowId": "VC-8"` の 1 項）を消す —— 語は表の行と対で持つ（`FR-038`）。`npm run gen` で `src/adapter/screen-renderer/display-words.json` からも抜ける。

(f) `.claude/skills/spec-graph-check/retired.py` の `RETIRED` に `'VC-8'`・`'FA-8'` を、理由の注とともに足す —— 「CR-837（ruling JDG-3165）: a finished task that still holds resumeValid true is no finding any more -- the state reads actualFinish first, and FR-010 names the shape as real. VC-8 (that very combination) and FA-8 (its machine fix) left tables T-310 and T-373; CR-837, the changelog and rulings.md name them, so the seats stay burned.」（`retired.py` は英語・ASCII で書く —— 規則 03）。

⚠️ 表 T-310 と 表 T-373 の番号は詰めない（`VC-9` 以降・`FA-9` 以降はそのまま）。

---

## 4. 継ぎ目（コード）と試験

- 継ぎ目（下の 4 つは振る舞いを変えない。名も形も変えない）:
  - `src/entity/document-model/schedule/plan-actual-state.ts` の 18 行 `planActualState(task)` —— 表 T-019a を当てる。
  - `src/use-case/edit-document/percent-complete.ts` の 18 行 `percentCompleteOf`、58 行 `recountedPercentComplete(schedule)` —— `FR-012`。
  - `src/entity/document-model/schedule/delay-diagnostics.ts` の 710 行 `columnContradictions(task)`（`VC-4`〜`VC-7` —— `VC-8` の分岐は下で外す）、926 行 `rowOmissions`（`VO-1`・`VO-2`）。
- 継ぎ目（`VC-8` を外す —— X-14、`JDG-3165`）:
  - `src/entity/document-model/schedule/delay-diagnostics.ts` の 726 行〜728 行（`columnContradictions` の `VC-8` の分岐）を消し、708 行の `// see` から `VC-8` を外し、1423 行（層の表 `FINDING_LAYERS` の `'VC-8': 3`）を消す。
  - `src/entity/document-model/schedule/delay-fixes.ts` の 716 行〜722 行（`resumeValidDrafts`）、1112 行（`case 'VC-8'`）を消し、1150 行の `CHAINING_FINDING_ROWS` から `'VC-8'` を外す。
  - `tests/contract/cr-731-t-373-the-rows-that-mend-themselves.contract.test.ts` の 166 行（`['FA-8', 'VC-8', RESUME_AFTER_FINISH]`）を外す（その名の値を他が使わなければ値も）。
- 生成で変わる `src` の物: `src/adapter/screen-renderer/image-to-grs-json-prompt.json`（`npm run gen`）。
- ⚠️ 古くなるコメント 1 行: `src/entity/document-model/schedule/delay-fixes.ts` の 324 行「a finish with no start has no T-019 state」 —— 当てた後は 表 T-019 に行（`PA-新3`）がある。コメントだけの直し（振る舞いは変えない）を当てる子が行う。
- 仕様だけを読む試験（別のサブエージェントが書く）が確かめること:
  1. `_assets/tbl-plan-actual-states.md` の 表 T-019 を読み、「—」と「／」を開くと、5 つの列の値の組 48 通りのどれにもちょうど 1 行が当たる。
  2. 表 T-019 の各行の「判別の段」と「状態」が、その行の組に 表 T-019a の段を上から当てた答えと一致し、「状態」の字が 表 T-019a のその段の「状態」の字と同じである。
  3. 48 通りの値の組を持つ `Task` を `planActualState` に渡すと、当たる行の「判別の段」の状態を返す。
  4. 予定の期間が 0 より長い `Task` と 0 の `Task` を、各行の組で 1 つずつ（「本書は定めない」の 3 行の長い側を除く）`GRS JSON` に書き、`percentComplete` に組と無関係の値（例 55）を入れて開くと、格納された値がその行の欄の値になる（`FR-012`）。
  5. 遅延診断（`FR-131`）を、各行の組の `Task` に、欄が名指す条件（`percentComplete` が 0 ／ 0 より大、`finish` が基準日の前 ／ 後）を置き分けて回すと、`VC-5`〜`VC-7`・`VO-2` が欄のとおりに出て、欄に無いものは出ない。
  9. `actualFinish` と `actualStart` があり `resumeValid` が真の `Task`（`PA-新4` の組、`stop`・`resume` の有無を置き分ける）に遅延診断を回すと、指摘も `?` も修正案も出ず、依存の下流の診断も止まらない。表 T-310 に `VC-8` の行が、表 T-373 に `FA-8` の行が無い（`JDG-3165`）。
  6. `docs/spec/_source/grs-document.schema.json` の `Task` の説明が 5 つの段の順を、`actualStart`・`actualFinish` が説明を持ち、どの説明も仕様書の ID を持たない（後半は既存の `tests/contract/cr-751-…` が見る）。
  7. 原稿から行を 1 つ消したコピーで生成器が拒み（抜け）、既存の行と同じ組の行を足したコピーで拒む（重なり）。原稿のコピーは一時の置き場に作る。
  8. 既存の `tests/contract/cr-571-search-table-filters.contract.test.ts`・`tests/unit/cr-604-the-pause-bar-and-markers-shown-by-default.test.ts`・`tests/contract/dfc-286-fr-044-emptying-a-set-resume-date-clears-resume-valid.test.ts`・`tests/unit/document-model.test.ts` が、`spec-table.ts` の 1 行だけで緑のまま（表 T-019a の字と欄の名、表 T-019 の「状態」の欄の名を変えないことの確かめ）。

---

## 5. 台帳

- `defects.md` の `DFC-2967` —— 本書が閉じる。当てて 4 節の試験が緑になったら `実測済`。試験が入るまでは `試験待ち`。⚠️ `JDG-3165` で遅延診断の出方が 1 つ変わる（完了したタスクに残った再開日確定に `?` が付かない）—— 実物で確かめるかは調整役が利用者の確かめの一覧に載せるかで決める（規則: 利用者の確かめは調整役を通す）。
- `DFC-586`（`JDG-78`）へ送るもの（本書は設計しない）:
  - `PA-新9`・`PA-新11`・`PA-新13` —— `actualStart` があり `actualFinish` も `stop` も空の組（`PND-499` が既に送った）。完了率（予定の期間が 0 より長い側）と実績の最後の日の読みを本書は定めない。⭐ 測ったこと: `GRS` 自身はこの組を置かず（`CM-13` の 3 つの着手済みの値はどれも `stop` に日付を要る —— `null` は受けない）、`MSPDI` を読めば `FR-011` が `ActualDuration` から `stop` を置く。来るのは、手か AI が書いた `GRS JSON` だけである。
  - `MSPDI` から取り込んだ `percentComplete` が空で、`actualStart` が空の組 —— `VC-5`（0 より大）も `VC-7`（0）も文字どおりには当たらない。`src/entity/document-model/schedule/delay-diagnostics.ts` の 716 行は空を 0 と読む（`?? 0`）。交換相手のファイルが要素を欠くときだけ来る準正常系である。
- 新しい台帳の行は足さない（調整役が要るかを決める）。⚠️ ③ の 11（`PV-4` と `task-plan-actual.ts` の 350 行）は本書の外の食い違いとして調整役に渡す。
- 変更履歴: `docs/spec/A-appendix.md` に 1 行（版と時刻は当てる子が調整役から受ける）。`perf-pending` の行は要らない（毎フレームの仕事を変えない —— 遅延診断は押したときに回り、`VC-8` を外すと 1 つの判定が減るだけ）。

---

## 6. 波

1. 仕様（原稿と文書）: X-1・X-2（原稿・スキーマ・生成器を新しく作る）→ `npm run gen` で X-3 が刷られる → X-4〜X-9（`01-04-requirements.md`・`05-07-design.md`）→ X-10・X-11・X-12（`_source` の 3 つの原稿）→ `npm run gen`（`grs-document.schema.json`・`grs-commands.schema.json`・`tbl-document-commands.md`・`tbl-row-id-prefixes.md`・`image-to-grs-json-prompt.json` が刷り直される）。`node tools/artifact_versions.mjs bump grsRelay`。
2. 道具と検査とコード: X-13 の 11 か所。X-14 の (e)・(f)。4 節の `delay-diagnostics.ts`・`delay-fixes.ts` の `VC-8`・`FA-8` を外す所と、`cr-731` の試験の 1 行。`delay-fixes.ts` の 324 行のコメント。
3. 仕様だけを読む試験（別の体）: 4 節の 1〜9。
4. `check.sh` を 1 度（調整役）。

大きさ: **M** —— 仕様書と原稿と生成器が主。`src` の振る舞いの変更は `VC-8`・`FA-8` を外す 2 ファイルだけで、ほかは生成物の刷り直しとコメント 1 行。

---

## 11. 利用者に問うこと

### 問い 1 —— 中断してから完了したタスクに残った「再開日確定」を、遅延診断で矛盾として告げますか

⭐ **答え（2026-10-24、`JDG-3165`）: 「指摘にしない (推奨)」 —— 択 B。** 下は問うたときの形のまま残す（行 ID だけは、答えの後に詰めた仮の番号で書く —— ③ の 12）。当てる所は X-3（`PA-新3`・`PA-新4` の指摘の欄）・X-12（`actualFinish` の説明）・X-14（`VC-8`・`FA-8` を退く）。

場面:

1. 交換相手の XML（MSPDI）を [開く / Open] で開く。
2. その中のあるタスクは、途中で中断して [再開予定日 / Resume] を置き（[再開日確定 / Resume Date Confirmed] が真）、その後に完了した。ファイルには [実績終了日 / Actual Finish] があり、再開予定日と、真のままの再開日確定も残っている。
3. 日程表では、そのタスクは [完了 / Finished]（✓）に見える —— 状態の判別は実績終了日を先に見るので、再開日確定は状態に何も効かない。
4. [遅延診断 / Delay Diagnostics] を押すと、そのタスクに「信用できない・要修正 / Unreliable, fix needed」の `?` が付き、指摘「実績終了があるのに再開の日が有効 / An actual finish but the resume date is still valid」が出る。矛盾の指摘を持つタスクから依存の下流は、診断の計算が止まる。
5. 修正案は「再開日確定を偽にする」（機械の直し）。

食い違い: 仕様の一方は「交換相手は途中で中断して完了したタスクに `Stop`・`Resume`・`ResumeValid` を残す —— 実在の形であり、受け付けない形にしてはならない」と言う。もう一方は、完了したタスクに再開日確定が真であることを「必ずどちらかが誤り」の矛盾に数える。交換相手が完了のときに再開日確定を真のまま残すかどうかは、確かめていない。

| 択 | 中身 | 良い点 | 悪い点 | 後で起きること |
|---|---|---|---|---|
| A | 今のまま —— 矛盾として告げ、`?` を付け、下流の計算を止める。修正案で偽にする | 手か AI が書いた文書の書き間違いも見つかる。何も変えない | 交換相手の正常なファイルでも `?` が出て、下流の診断が止まる | 中断してから完了したタスクが 30 件ある計画を取り込むと、診断のたびに 30 件の `?` が並び、利用者は毎回 30 件の修正案を当てる。当てた分だけ、書き戻す XML の再開日確定が元のファイルと変わる |
| B | 指摘にしない —— 「指摘にしない組」（実績終了日と進捗率 100 の食い違いと同じ扱い）に足す | 状態に何も効かない値で、正常なファイルの診断を止めない | 書き手が真を残しても何も告げない | 完了を解く操作（完了 → 中断）は再開日確定を偽に置くので、残った真が後で効くことは無い。ただし、交換相手へはそのまま書き戻す |
| C | 疑義にする —— 断定せず、`?` を塗らず、下流を止めない | 気づけて、診断も止めない | 疑義の一覧に、正常なファイルの行が毎回並ぶ | 30 件の計画では、疑義の一覧の 30 行が、本当に見るべき疑義を押し流す |

推奨: **B** —— 状態の判別は実績終了日を先に見るので、完了したタスクの再開日確定は何にも効かない。仕様はこの形を「実在する」と言っているので、「必ずどちらかが誤り」には当たらない。B か C なら、本書の 表 T-019 の `PA-新3`・`PA-新4` の指摘の欄と、スキーマの `actualFinish` の説明の最後の文が変わる（本書の中で当てられる）。A なら本書のまま。

参照: `FR-010`・表 T-310 の `VC-8`・表 T-373 の `FA-8`・表 T-019a の `PS-2`・表 T-019 の `PA-新3`・`PA-新4`。

### 問わないこと

- `PA-新9`・`PA-新11`・`PA-新13` の完了率と実績の最後の日、`MSPDI` から来た空の `percentComplete` の指摘 —— どちらも、`GRS` が書かず、手で書いたファイルか要素を欠く交換相手のファイルだけが届く準正常系なので、`JDG-78` により `DFC-586` へ送る（5 節）。
- 表を並べるか作り直すか、欄の選び方、`VC-8` を狭めずに退けること —— ③ に問わずに決めたこととして書いた。

---

## 13. 測り方の再現

```
# 裁定と台帳
grep -n '^| JDG-2470 ' docs/development-records/rulings.md
grep -n 'T-019\|PND-499\|予実の状態\|組み合わせ表\|resumeValid\|percentComplete\|完了率' docs/development-records/rulings.md   # 41 行
grep -n 'T-019' docs/development-records/defects.md docs/development-records/fixed-defects.md docs/development-records/pending-decisions.md
grep -n '^| DFC-2967 ' docs/development-records/defects.md
grep -n '^| PND-499 ' docs/development-records/pending-decisions.md

# 届く先
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-019 T-019a FR-010 FR-012 FR-131 T-310 CM-13 G-13 AT-34 AT-36 AT-37 AT-38 AT-39 AT-141
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py T-019 T-019a FR-010 FR-012 FR-131 T-310 CM-13 G-13 AT-34 AT-36 AT-37 AT-38 AT-39 AT-141
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py VC-8 FA-8                      # VC-8 は 1 箇所（FA-8）、FA-8 は 0
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py T-019 T-019a FR-010 FR-012 FR-131 T-310 CM-13 G-13 AT-34 AT-36 AT-37 AT-38 AT-39 AT-141 VC-8 FA-8 T-312 T-373   # 辺 18、輪 0
grep -rn 'VC-8\|FA-8' src tests docs/spec .claude/skills                                       # 外す所
grep -n '^| FA-' docs/spec/01-04-requirements.md | grep resumeValid                                # resumeValid を書く直しは FA-7（選ぶ）と FA-8 だけ
grep -n 'VC-8' docs/development-records/rulings.md                                              # 2 件: JDG-1748（語の一覧）と JDG-3165。VC-8 を入れた裁定は無い
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py T-019 T-019a FR-010 FR-012 FR-131 T-310 CM-13 G-13 FR-006 FR-011 FR-021 FR-044 AT-34 AT-36 AT-37 AT-38 AT-39 AT-141

# PA-1〜PA-5 を FR-010 の外で引く行（原稿だけ数える。生成物の tbl-*.md は除く）: 11 行
grep -rn 'PA-[1-5]' docs/spec --include=*.md --include=*.json | grep -v '01-04-requirements.md:30[4-9][0-9]:' | grep -v '_assets/'   # FR-010（3043〜3093 行）を除く

# 表を読む物（置き場を移すと赤くなる所）
grep -rn "specTable('T-019\|'T-019a'\|cellOf('T-019a'\|rowOf('T-019a'" tests tools
grep -rn 'tbl-notice-reasons' .claude/skills tools tests/contract/spec-table.ts   # CR-712 が足した所 = 本書が足す所
grep -rn '実績の最後の日' tests tools | grep -i 'by\[\|cell\|heading'                # 「実績の最後の日」の欄を読む試験は 0 件
grep -n 'T_019_CARRY_NOTE\|T_019_ONLY_WHEN_EDITED' tests/contract/dfc-294-*.ts        # 注記の文を 01-04 から引く

# スキーマの説明の今
grep -n '"actualStart"\|"stop"\|"actualFinish"\|"resume"\|"resumeValid"\|"percentComplete"' -A 3 docs/spec/_source/grs-document.schema.json
grep -n 'prose is left out' tests/contract/dfc-2950-*.ts                              # 説明は形の指紋に入らない

# 実装の読み（表と比べるだけ。変えない）
sed -n 18,24p src/entity/document-model/schedule/plan-actual-state.ts
sed -n 18,24p src/use-case/edit-document/percent-complete.ts
sed -n 710,730p src/entity/document-model/schedule/delay-diagnostics.ts
```

48 通りの組と 18 行の当たりの数え（一時のファイルで回した。抜け 0・重なり 0、18 行とも段が 1 つ）:

```python
import itertools
D = {'aS': 'ed', 'aF': 'ed', 'st': 'ed', 'rs': 'ed', 'rV': 'tfe'}   # e=空 d=日付 t/f=true/false
rows = {  # 書かない列は「—」
 'PA-1': dict(aS='e', aF='e', st='e', rs='e'),
 'PA-2': dict(aS='d', aF='e', st='d', rs='e', rV='t'), 'PA-3': dict(aS='d', aF='e', st='d', rs='d', rV='t'),
 'PA-4': dict(aS='d', aF='e', st='d', rs='e', rV='f'), 'PA-5': dict(aS='d', aF='d', st='e', rs='e', rV='f'),
 'N1': dict(aS='e', aF='e', st='d'), 'N2': dict(aS='e', aF='e', st='e', rs='d'),
 'N3': dict(aS='e', aF='d'),
 'N4': dict(aS='d', aF='d', rV='t'), 'N5': dict(aS='d', aF='d', rV='fe', st='d'),
 'N6': dict(aS='d', aF='d', rV='fe', st='e', rs='d'), 'N7': dict(aS='d', aF='d', rV='e', st='e', rs='e'),
 'N8': dict(aS='d', aF='e', rV='f', st='d', rs='d'), 'N9': dict(aS='d', aF='e', rV='f', st='e'),
 'N10': dict(aS='d', aF='e', rV='e', st='d', rs='d'), 'N11': dict(aS='d', aF='e', rV='te', st='e', rs='d'),
 'N12': dict(aS='d', aF='e', rV='e', st='d', rs='e'), 'N13': dict(aS='d', aF='e', rV='te', st='e', rs='e')}
def step(c):  # 表 T-019a
    return 'PS-1' if c['aS'] == 'e' else 'PS-2' if c['aF'] == 'd' else 'PS-3' if c['rV'] == 'f' else 'PS-4' if c['rs'] == 'd' else 'PS-5'
hits = {}
for combo in itertools.product(*D.values()):
    c = dict(zip(D, combo))
    hits[combo] = [r for r, w in rows.items() if all(c[k] in w.get(k, D[k]) for k in D)]
print(len(hits), sum(not m for m in hits.values()), sum(len(m) > 1 for m in hits.values()))  # 48 0 0
for r in rows:
    print(r, {step(dict(zip(D, k))) for k, m in hits.items() if m == [r]})                   # 段は 1 つずつ
```

（`N1`〜`N13` が `PA-新1`〜`PA-新13`。）
