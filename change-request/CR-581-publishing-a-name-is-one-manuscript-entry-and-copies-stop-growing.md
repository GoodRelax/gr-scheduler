# CR-581 — 重複の予防（前半）—— 名を 1 つ公開するのは原稿の 1 項にし、写しを増やさない見張りを置く

> 起草の状態: 起草し、同じ枝で当てた（2026-09-26、枝 `p3/cr-581-duplicate-prevention`、`0ad572f6` の上）。段取りの改善の巡のチップ P3（`docs/development-records/handoff.md` の「2026-09-26 の巡（調整役）」の 1.）である。
> 範囲: `CR-581` の**前半だけ** —— 表 T-064 の原稿化・公開の入口の索引・値の集合の言い直しの検査・写しのコメントの登録簿。⛔ 後半（名前を正規化した写しの差分の関門）は、割る 3 本（`CR-578`〜`580`）の後の別の波である（11 節）。
> 読んだ木: `0ad572f6`（`refactor` の先端、2026-09-26）。数はどれもこの木で測った（14 節）。
> ID の帯: `CR-581` は調整役が予約した。検査の番号は合流で調整役が 69・70 に詰めた。台帳 `DFC-1110`〜`1119` の帯は使わなかった（13 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から。抜粋） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-607` | 「JSON化しない？ そっちの方がこの後楽でしょ？_assets に生成して 本文は参照すれば、人間も見やすいし。」 | 表 T-334 を `_source` の JSON から `_assets` へ生成し、本文は参照するだけにする | ⭐ 表 T-064 に同じ形を当てる先例（3 節）。本文には「全行は `_assets` の文書が持つ」とだけ書く |
| `JDG-520` | （基準線）調整役は下げ・名の付け替え・刈り込み・登録を問わずにしてよい。上げは利用者の OK | 新しい検査の基準線を今日の数で登録してよい。上げは問う | 検査 69・70 の基準線は今日の当たりの登録（上げではない）。検査 46 の基準線に新しい文書を 0 で登録した |
| 利用者と合意した順（2026-09-26、`handoff.md` の「次にやること」1.） | 「P3 重複の予防 = `CR-581` の前半」 | 表 T-064 を原稿から生成 ／ 公開の入口の索引 ／ 手書きの値の集合の検査 ／ 双子のコメントの登録簿を増やさない基準線 | 本書の範囲そのもの |

### 0.2 調べた結果（`0ad572f6`）

1. **写しを止めていたのは、公開に変更要求が要ることだった。** 重複の調査（`docs/review/duplicate-survey-2026-09-26.md`）の親の群 136 のうち、偶然の写しが 128、すでに答えが食い違うものが 49。偶然の写し 128 のうち **78 は、元が公開されていないことだけが写しの理由だった**（調査の正本 `duplicated-responsibility-groups-d65097b9.json` の `blocked_by` が `t064`）。
2. **公開 1 つの費用。** 試作 D（`previous-project-result/temp/cr-581-guard-prototypes-2026-09-26/d-publish/publish-cost.md`、手元だけ）が `taskGroupRankById` で歩いた: 9 手・5 ファイル、うちコードは 5 行ほどで、残りは変更要求の儀式（影響の測定・第 0 節・予約・変更履歴）。辺（`components.json`）も層の規則（表 T-061）も妨げになっていなかった。
3. **表 T-064 は手書きで、37 行・メンバ 197・名を公開しない片 3。** 検査 26b の読みと一致した（`check-published-members.py`: 197 member(s)、スキップ 9 のうち 5 が表の片、4 が `src/` 側）。スキップの片 5 のうち 2 は、注記の括弧の中の `／` で割れた注記の続きである（`PI-6` の `` `FR-097`）） ``、`PI-37` の `` `FR-038`） ``）。
4. **表 T-064 を読む道具は 7 つ、ファイルを名指して読むのは 2 つ。** `audit-ch5.py`（検査 33）と `tools/generate_unit_tree.py`（検査 18）が `05-07-design.md` を名指して読む。原稿の一覧を持つ 5 つ（検査 46・47・39・37 と `tools/follow_the_manuscript.py`）と試験の補助 `tests/contract/spec-table.ts` は、一覧に無い文書の表を読まない。
5. **公開の入口だけを探しても、元の多くは見つからない。** 試作 E（`d-publish/results.md`）が既知の写し 8 組で測った: 公開の入口だけを探すと 2/8、`src/` のすべての関数を探すと 6/8。8 組の元のうち 6 つが非公開か、兄弟のファイルが出すだけで入口が出し直していなかった。
6. **手書きの値の集合。** 試作 C（`c-literal/results.md`）の規則（モジュールの頂の集合、生成の集合と Jaccard 0.7 以上かつ共通 3 以上、`Record` や写像型が生成の和で守るものは外す）を今日の木で回した: 手書きの集合 181 と生成の集合 869 を比べ、当たり 35 —— 言い直し 14・偶然 5・型が守るので外すもの 14・型の付いた組み立てで外すもの 2。試作の当たり（言い直し 14・型が守る 14・偶然 7）と同じ集合である。
7. **写しのコメント。** 試作 B（`b-twin/results.md`）の数え方（「〜の写し」「両方を変えよ」「〜と同じ」ほかの言い回し、否定の例外を除く）を今日の木で回した: 写しだと述べるコメント 50 —— 写し 36・仕様の表の手写し 2・結びつき 12。名指した相手が古いか消えたもの 5（`zoom-and-fit.ts` の `namesAPlace`、`task-figures.ts` の `lineEndHalfHeight`、`row-scroll.ts`、`view-place.ts`、`gesture-values.ts` の `REPEATING_ENTRIES` —— 最後の 1 つは相手がもう無い）。試作の正規表現は今日の木でもちょうど 37 に当たり、広く探した 2 回で 13 を足した（写し 4・結びつき 9）（14 節）。試作は `1781a77e` で 37（写し 32・仕様の表の手写し 2・結びつき 3）だった。

### ① `CH-` / `GL-` のどれを前へ進めるか

- ⛔ **`CH-1`〜`CH-6` のどれも直接には前へ進めない** —— 本書は作り方の基盤である。
- 間接には `CH-1`（`GL-008`）と `CH-3`（`GL-003`）: 答えが食い違った写し 49 のうち 10 は、利用者の手順で届く欠陥だった（調査の 4.1 節。例 `DFC-1051` —— フェードの掴み点が許した日数を `IV-12` が拒む）。写しが増えなければ、この種の欠陥の出どころが減る。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- `R1.3`（唯一の正）・`R2.7`（DRY）: 表 T-064 の正は原稿 1 つにし、表はそれを刷るだけにした。道具の側は、表を名指して読んでいた 2 つが刷った文書を読むように変え、原稿の一覧を持つ 6 つに文書を 1 つ足した —— ⚠️ 一覧が 6 か所に写されていること自体が `R2.7` の違反であり、本書は直さない（11 節）。
- `R2.19`（コンポーネント境界）: 索引は公開の入口が出す名と、入口が出し直していない名を分けて示す。後者を他のコンポーネントから使うには、入口から出し直し、原稿に 1 項足す —— 境界の規則（表 T-061・Chapter 5.3）は変えない。
- `R2.1`（命名）: 新しい名は `published-entries.json`・`published_entries_json_to_md.py`・`tbl-published-entries.md`・`DOC-TBL-PUBLISHED-ENTRIES`・`public-entry-index.md`・`generate_public_entry_index.py`・`check-literal-restatement.py`・`check-twin-comments.py`。どれも隣の先例（`verification.json` の一式、`comment-rules-card.md`、`check-*.py`）と同じ組み立てである。表 T-006b・T-104 の予約語には当たらない（本書は仕様の語を 1 つも足さない）。
- `R2.9`（YAGNI）: 試作の TWIN 印・`twins.json`・字句の比較（TW-1〜TW-5）は作らない。登録簿を増やさない見張り（TW-6）だけを置く —— 試作 B の見立てでも、登録簿は定常では 2〜3 件に縮む。

### ③ 利用者に問わずに決めたこと

1. **表 T-064 は本文から `_assets/tbl-published-entries.md` へ移す**（`JDG-607` の先例）。本文には移した先と原稿を指す 2 文だけを残し、`（MUST）` は足さない —— 足すと検査 39 の「逐語で持たれない」が 1 つ増え、基準線の上げになる。
2. **原稿はセルを刷ったとおりに持つ。** 注記の改行 `<br>` も原稿に書く。⚠️ 「`。` の後に必ず `<br>`」は 1 か所（`PI-37` の `。仕様書`）で破れているので、生成器が差し込む形にはしなかった。
3. **片のつなぎは語で持つ。** 既定は全角の `／` と空白 1 つ、他の 2 つ（前後に空白 `spaced` 31 か所、空白なし `bare` 1 か所）は `sepAfter` に書く。全角の `／` を原稿に書くと検査 23 が散文と読むので、文字ではなく語にした。
4. **注記の括弧の中の `／` で割れた片は、原稿では注記の続きに戻した。** 刷る表のバイトは変わらず、検査 26b の読み（その片をスキップと数える）も変わらない。
5. **原稿の生成器は、検査 26b と同じ読みを守らせる。** 注記が全角の括弧で始まらないメンバ、名に読める散文の片を、1 バイトも書かずに拒む —— 原稿のメンバと 26b が数えるメンバが食い違わないため。
6. **索引は `docs/review/` に置く**（`comment-rules-card.md` と同じ、開発者が読む生成物の置き場）。行番号は持たない —— 上の行を 1 行直すたびに索引が赤くなり、並行のセッションの合流でぶつかる。`ファイル#名前` で引く。
7. **索引は、公開の入口が出す名と、フォルダのファイルが出すが入口が出さない名の 2 つを載せる。** 非公開の関数は載せない（載せると 1,500 を超え、毎回の編集で動く）。⚠️ 既知の写し 8 組の元のうち、索引に載るのは 4（入口 3・ファイルだけ 1）。載らない 4 は非公開の関数である（14 節）。
8. **索引の「何のためか」は、表 T-064 の注記の最初の文。** 表が公開していない名には書かれた目的が無いので、宣言の頭（引数と戻り値の型）を載せる。
9. **検査 69・70 の鍵は名前であって、ファイルと行ではない** —— 割る 3 本（`CR-578`〜`580`）がファイルを割っても鍵は動かない（体が割る形を試して緑を確かめた）。
10. **検査 69・70 の当たりに台帳の行を立てない。** 負債は基準線のファイルが 1 件 1 記録で持ち、`why:` 行で理由と行き先を書く —— 検査 26b の基準線と同じ扱いである。同じ事実を台帳にも書けば、それ自体が写しになる。
11. **名を公開するだけの変更に変更要求を要さないという規則は、規則 02 の持ち主（チップ P1）へ渡す**（6 節に文案）。本書は仕様にその規則を書かない —— 作り方の規則は仕様ではない（`docs/development-rules/README.md` の冒頭）。

---

## 1. 範囲 —— ファイルごとの行き先

| ファイル | 何をしたか |
|---|---|
| `docs/spec/_source/published-entries.json`（新） | 表 T-064 の原稿。37 行・メンバ 197・片 3 |
| `docs/spec/_source/published-entries.schema.json`（新） | 原稿の形の契約 |
| `docs/spec/_source/published_entries_json_to_md.py`（新） | 原稿 → `_assets/tbl-published-entries.md`。`--check` |
| `docs/spec/_assets/tbl-published-entries.md`（新、生成物） | 表 T-064 の全行。文書 UID `DOC-TBL-PUBLISHED-ENTRIES` |
| `docs/spec/05-07-design.md` | 5.3 の表 T-064 の塊（見出し・列見出し・罫・37 行）を 2 文に替え、「本表は」を「表 T-064 は」にした（4 節） |
| `tools/generate_public_entry_index.py`（新） | `src/` と原稿 → `docs/review/public-entry-index.md`。`--check` |
| `docs/review/public-entry-index.md`（新、生成物） | 公開の入口の索引 |
| `.claude/skills/spec-graph-check/check-literal-restatement.py`・`literal-restatement-baseline.txt`（新） | 検査 69 |
| `.claude/skills/spec-graph-check/check-twin-comments.py`・`twin-comments-baseline.txt`（新） | 検査 70 |
| `.claude/skills/spec-graph-check/audit-ch5.py`・`tools/generate_unit_tree.py` | 表 T-064 を刷った文書から読む |
| 検査 46・47・39・37 の一覧、`tools/follow_the_manuscript.py`、`tests/contract/spec-table.ts` | 原稿の一覧に新しい文書を足した |
| `.claude/skills/spec-graph-check/line-break-baseline.txt` | 新しい文書を 0 で登録した |
| `.claude/skills/spec-graph-check/check-provenance.py` | 生成物の行を足した（検査 21） |
| `.claude/skills/spec-graph-check/check.sh` | 検査 27 に生成器 2 本、検査 69・70 の節、数 63 → 65 |
| `package.json` | `gen:entries`・`gen:index`（と `:check`）を `gen`・`gen:check` の列に足した。既存の並びは変えていない |
| `docs/development-rules/09-tools.md` | 末尾に本書の節（12 節）を足した |
| `.claude/skills/spec-graph-check/SKILL.md` | T-064 の行を手で直すときの罠の段落に、原稿を直して刷ることを 1 文足した |
| `tests/contract/t-283-priorities.contract.test.ts` | `PI-36` の文を刷った文書から逐語で探す（移した後に赤になった 1 件） |
| `docs/development-records/changelog.md` | 版 2.74 を 1 行（規則 02 の 7。版の番号は合流で詰まるかもしれない） |

---

## 2. 新しい識別子

- 文書 UID `DOC-TBL-PUBLISHED-ENTRIES` —— 2026-09-26、`git grep` で 0 件だった。
- 検査の番号 69・70 —— `check.sh` の 66 の次が空いていたのは 2026-09-26 の `0ad572f6` での話で、P2・P4 も同じ帯（仮 70〜73 を P3 に）を受けていた。合流で調整役が 69〜73 に詰めた。
- `package.json` の名 `gen:entries`・`gen:entries:check`・`gen:index`・`gen:index:check`。
- 表・行 ID・接頭辞・要求 ID は 1 つも作らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `05-07-design.md` 5.3 の「**表 T-064 — 公開インターフェース**」から `PI-39` の行までの 41 行（31,243 バイト） | `_assets/tbl-published-entries.md` の同じ 41 行（バイト一致。sha256 の頭 `69e1b80123c94d2a`） |
| 本文の「本表は名前と、それが何を担うかだけを持つ。」 | 「表 T-064 は名前と、それが何を担うかだけを持つ。」 |
| `audit-ch5.py` が `05-07-design.md` だけから T-064 の行とメンバを読む | 刷った文書も読む（章と文書をつないだ文字列から） |
| `generate_unit_tree.py` が `05-07-design.md` から T-064 を読む | T-064 だけ刷った文書から読む（`REL_OF_TABLE`） |
| 表 T-064 に名を足すには本文のセルを手で直す（変更要求） | 原稿に 1 項足して `npm run gen`（6 節） |

---

## 4. 書き直した所（本文）

`05-07-design.md` 5.3、表 T-064 の塊を次の 2 文に替えた:

```text
表 T-064 の全行は `_assets/tbl-published-entries.md` が持つ。  
⛔ **本節は 表 T-064 を写さない** —— 表は `_source/published-entries.json` から生成される。
```

⚠️ 表 T-064 の前の段落（`PI-n` と `CP-n` の対応・純粋性の既定・名前と担うことだけを持つ・署名は `src/` が持つ）は、表の規則なので本文に残した。

---

## 5. 機械検査

| 番号（仮） | 何を赤にするか | 何が見えないか | 基準線 |
|---|---|---|---|
| 27 に足した `published_entries_json_to_md.py --check` | 刷った表の手の編集、原稿を直して刷り直していないこと。原稿の形の破れ（行・コンポーネントの二重、名の二重、括弧で始まらない注記、名に読める片、最後の片のつなぎ）は書く前に拒む | メンバが入口から本当に出ているか —— それは検査 26b が見る | 無し |
| 27 に足した `generate_public_entry_index.py --check` | `src/` の公開した名か、原稿の注記が変わったのに索引を刷り直していないこと | 非公開の関数。言い換えた名（名が違えば、探す者の語が当たらない） | 無し |
| 69 `check-literal-restatement.py` | `src/` のモジュールの頂に手で書いた値の集合が、生成された集合を言い直していること（Jaccard 0.7 以上、共通 3 以上）。型が生成の和で守るものは外す | 関数の中の集合。複数のファイルに散った 1 語ずつの語彙（アイコンの面の名など）。言い換えた集合 | 19（言い直し 14・偶然 5）。増やすのは利用者の OK |
| 70 `check-twin-comments.py` | 写しだと述べる新しいコメント。登録した写しのコメントが消えたのに登録が残っていること | 誰もコメントしなかった写し（例: 調査の `compareDay` / `compareDays`） | 50（写し 36・仕様の表の手写し 2・結びつき 12）。増やすのは利用者の OK |

⭐ **壊して確かめた。** 生成器は原稿の破れ 5 通りをすべて拒み、刷った表の手の編集を `DRIFTED` で捕まえた。検査 69 は、植えた言い直しで `new 1`、`NoticeReason` を別のファイルへ移しても緑、`ShapeKind` を生成から引いたのに記録を残すと赤。検査 70 は `src/` の写しで、新しい「a copy of rectHoldsPoint in screen-regions.ts」で `new 1`、登録したコメントを消すと赤、`frame-loop.ts` を別の道へ移して行をずらしても緑（14 節）。

---

## 6. ⭐ 公開の手順と、変更要求の要らない変更（規則 02 の持ち主へ）

**手順**（本書が着地した後）:

1. `docs/review/public-entry-index.md` を、仕事の語と型で探す。
2. 在れば import する。`file only` なら、そのコンポーネントの公開エントリから出し直す。非公開なら `export` して出し直す。
3. `docs/spec/_source/published-entries.json` の、そのコンポーネントの行に 1 項（名と、全角の括弧で始まる 1 文の注記）を足す。
4. `npm run gen` → 検査 26b が「表が名指す名が入口から出ている」を確かめる。

**規則 02 への文案**（チップ P1 か調整役が当てる。本書は `docs/development-rules/02-changing-the-spec.md` を触らない）:

```text
⭐ 変更要求の要らない変更 —— 表 T-064 に名を 1 つ足すだけの変更
  条件: 名はそのコンポーネントの公開エントリが既に出しているか、同じ変更で出す。
        振る舞いを変えない。表 T-064 の他の行・他の表・辺（components.json）を変えない。
  手: _source/published-entries.json に 1 項足して npm run gen。変更履歴も要らない。
  ⛔ 名の意味を変える・名を消す・新しい辺が要る・層の規則に触れるなら、ふつうの変更要求である。
```

⚠️ 検査 22（変更要求の第 0 節）と検査 62（予約）は変更要求のファイルだけを読むので、この変更を機械が妨げることはない。

---

## 7. グラフ（`0ad572f6` の作業木、表を移した後）

- `impact.py T-064`: 定義は `docs/spec/_assets/tbl-published-entries.md:15`、37 行。表を指す要求 4（`FR-003`・`FR-009`・`FR-016`・`FR-039`）、2 次 29、要求以外 6 節。どの要求の文も変えていない。
- `induced.py T-064 T-062 T-075 T-065 FR-003 FR-009 FR-016 FR-039`: 種 8/8、辺 7、閉路 1（`FR-003 FR-016 FR-039`）。本書はその 3 つのどれも書き換えないので、同じパスで書く組は無い。

---

## 8. 数の予測（当てた後に同じ数え方で突き合わせる）

- tables: 0（表 T-064 は定義する文書が変わるだけで、数は変わらない）
- rows: 0（37 行のまま、バイト一致）
- uids: 0（要求は足さない、消さない）
- figures: 0
- 文書: +1（`DOC-TBL-PUBLISHED-ENTRIES`）

---

## 9. 波

1 つの波で当てた（本枝の 1 コミット）。仕様の塊の移動と、それを読む道具の直しは同じ波でなければならない（規則 02 の 3.5 節）—— 分けると、道具は表を見失う。

---

## 10. 並行の CR への影響

起草済みで未適用の CR のうち、表 T-064 か `PI-` の行を名指すものは 6 つ（2026-09-26、`grep`）: `CR-555`・`556`・`572`・`574`・`579`・`580`。⭐ それらが「`05-07-design.md` の `PI-n` のセルに足す」と書く所は、当てるときに「`published-entries.json` の `PI-n` の行に 1 項足して `npm run gen`」と読み替える。本書はそれらの本文を書き換えない（持ち主は保留の CR を整理するセッション）。

---

## 11. この変更でやらないこと

- **後半: 名前を正規化した写しの差分の関門**（試作 A。関数単位、局所名をならした字面の似かたで、新しい群を赤にする）。割る 3 本（`CR-578`〜`580`）が `src/` のトークンの 22.7% を動かすので、その後に基準線を引く。
- 写しを畳む `src/` の直し。検査 69・70 の基準線と調査の群は、それをする CR の入力である。
- 原稿の一覧が 6 か所に写されていること（検査 46・47・39・37、`follow_the_manuscript.py`、`spec-table.ts`）を 1 か所にまとめること。
- 検査 26b の説明文の古い数（`SKILL.md` の「97 members and skips 9 pieces」と、Framework の行がインターフェースを名指すという記述 —— 今は 197 で、`PI-26`〜`PI-31` はメンバとして読まれる）。
- 名の近さで写しを推す門（試作 E）。精度 5/10・再現 1/8 で、うるさい門になる（`SKILL.md` の「a noisy gate is worse than no gate」）。

---

## 12. 前に立つ者へ返す問い

1. 6 節の規則 02 の文案を P1 が当てるか、調整役が合流で当てるか。
2. ⭐ 解決済み: 検査 70・71（仮）は合流で 69・70 に、P2・P4 の足した仮番号は 71〜73 に詰めた。

---

## 13. 台帳

使わなかった（③ の 10）。帯 `DFC-1110`〜`1119` は返す。

---

## 14. 測り方の再現

```text
# the tree: 0ad572f6 (branch p3/cr-581-duplicate-prevention before the commit)

# table T-064 as written, against check 26b
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-published-members.py
#   197 member(s) read from table T-064, 9 piece(s) not covered (5 in the table, 4 in src/)

# byte identity: the caption line through the PI-39 row, before and after
#   before: 05-07-design.md lines 585..625   after: tbl-published-entries.md from its caption
#   31,243 bytes both, sha256 69e1b80123c94d2a... both
PYTHONIOENCODING=utf-8 python docs/spec/_source/published_entries_json_to_md.py --check
#   37 row(s), 197 member(s), 3 text piece(s)

# the index
PYTHONIOENCODING=utf-8 python tools/generate_public_entry_index.py --check
#   657 entry name(s), 197 published by T-064, 478 file-only
# the originals of the 8 known copies of d-publish/eval.txt, found in the index:
#   calendarDaysBetween (entry), serial (file only), isSameItem (entry), labelUnits (entry)  -> 4
#   rectHoldsPoint, taskGroupRankById (schedule-invariants.ts), reach, boundValueOf     -> private, 0

# check 69
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-literal-restatement.py --list
#   181 hand sets, 869 generated sets, 35 at J >= 0.7: 19 held (14 R, 5 C), 16 exempt (14 RG, 2 typed)

# check 70
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-twin-comments.py --list
#   50 claim(s): 36 copy, 2 spec-copy, 12 coupling; 5 named twins stale; 0.25 s

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-064
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py T-064 T-062 T-075 T-065 FR-003 FR-009 FR-016 FR-039
```
