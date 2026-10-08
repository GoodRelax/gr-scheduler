# CR-699 —— 刊行する GRS JSON のスキーマは、最新版の所と変更の台帳を持つ —— 形式の版は UTC の時刻とし、台帳に行を足すのは公式運用を宣言した後だけとする

> 状態: **適用済**（2026-10-08、当てる体。基の木 `2ce7ce5f`）。2026-10-08、作業木 `f5bd70a3` の上で聞き取りの席が起草し、同じ日の裁定 `JDG-1691`〜`JDG-1693` を受けて書き足した。当てる前に本文を測り直した（着地していない変更要求なので本文を直した）。
> ID の帯: 番号 `CR-699` は調整役から受けた。起草の時に仮に名乗った `S-540`・`S-541` は `CR-689` が先に当て、`S-532`・`S-533` は `CR-690` が当てた。調整役は、並行の `CR-707` が `S-533` の次から取るので、本書に `S-540`・`S-541` を配った —— 当てる前の木 `2ce7ce5f` で、どちらも木のどこにも書かれていないことを `git grep -E "S-54[01]\b"` で確かめた（0 件）。台帳の帯 `DFC-2295`〜`DFC-2299` も受けたが、使わなかった。表・要求 ID・図・接頭辞は取らない。
> 当てる裁定: `JDG-1673`〜`JDG-1678`（`docs/development-records/rulings.md` の「2026-10-08 —— GRS JSON のスキーマ変更の規則: 版は UTC の時刻・最新版の所・変更の台帳」）。`JDG-1209` は `JDG-1677` が一部覆した（印は付けた）。同じ節の `JDG-1691`〜`JDG-1693`（2026-10-08、`PND-806`〜`PND-808` への答え）も当てる。
> 閉じるもの: `DFC-2230`（刊行するスキーマの `$id` が 404 の所を指す）—— `仕様待ち` → `実測待ち`（仕様・生成器・検査を本書が当てた。`.github/workflows/pages.yml` は手で起こす間止めてあるので、刊行した所が新しいスキーマを返すのは、利用者がその workflow を走らせた後である）。
> 閉じた裁定待ち: `PND-806`（`JDG-1691`。宣言の変更要求が、宣言の前の補い・読み替え 5 つを消し、表 T-297 を台帳へ畳む）・`PND-807`（`JDG-1692`。示した綴りのまま）・`PND-808`（`JDG-1693`。書き出す文書の先頭に `"$schema"` を書く —— 推奨「今は書かない」を覆した）。残す裁定待ちは無い。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `rulings.md` の該当行）

| 裁定 | 逐語（要所） | 本書での扱い |
|---|---|---|
| `JDG-1673` | 「…GRSを公式運用した時、GRS JSONのスキーマ変更時のルールを決めておく必要がある。…最新バージョンを確認するため GoodRelaxのGitHubへのリンクを入れる。…最新バージョンとの比較を入れるプロパティーを足す。…」 | 規則全体の出どころ。版の記載は既にある（`DR-4`）ので変えない。リンクは E-01・E-04、台帳は E-02・E-04 |
| `JDG-1674` | 「スキーマに置く (Recommended)」 | 台帳は刊行するスキーマだけが持つ。書き出す文書には載せない（E-04） |
| `JDG-1675` | 「Pages の JSON (Recommended)」 | `$id` を Pages の所にし、所は表 T-206 の 1 行に置く（E-01・E-04） |
| `JDG-1676` | 「5 種 (Recommended)」 | 種別は 追加・削除・改名・変換・拒む（E-04 の表） |
| `JDG-1677` | 「スキーマに変更履歴を入れるのは俺が公式に宣言した時からとせよ。…配列を使う？ またバージョンは時間も入れよう。  RCFとかISOでUTCで時間を書く時の書式があったろ？ それに合わせろ。…」 | 台帳は宣言までは空の配列（E-04）。版は RFC 3339 の UTC で `YYYY-MM-DDTHH:MM:SSZ` とする（E-02） |
| `JDG-1678` | 「運用開始の版を 1 行に持つ (Recommended)」 | 表 T-206 に「公式運用を始めた形式の版」の行を置き、今は `null`（E-01）。検査がこれを読む（9 節） |
| `JDG-1691` | 「推奨通り」（`PND-806`） | 宣言の変更要求が、宣言の前の補い・読み替え 5 つを消し、表 T-297 を台帳へ畳む。本書はその義務を Chapter 6.1 に書くだけ（E-03） |
| `JDG-1692` | 「x-grsChanges ってなに？ こんな命名規則あったっけ？  JSON業界で標準ならOK。」（`PND-807`） | 綴りは示したまま（E-04 の表）。`x-` の出どころを E-04 の注に書く |
| `JDG-1693` | 「書き出す GRS JSON の先頭に "$schema"（スキーマの所在）を書く。  まだGRSは正式運用していない。  入れるなら今がチャンスだろ？」（`PND-808`。推奨「今は書かない」を覆した） | 書き出す文書のルートの先頭に `"$schema"` を書き、値は `S-540`。刊行するスキーマのルートがその鍵を受ける（E-08）。版は本書の 1 度の上げに含める（X-6） |

⭐ 同じ・似た主題の裁定を `rulings.md` で引いた（「schemaVersion」「形式の版」「版番号」「互換」「旧形式」「読み替え」「マイグレ」「YYYY-MM-DD」）。
- `JDG-425`・`JDG-426`（2026-09-24。書くのは自分のスキーマどおり、読むのは解釈できるものだけ。新しい版の文書を読んだら入手の頁へ案内）—— 変えない。台帳はその上に足す。
- `JDG-601`（2026-09-26。「まだGRSは運用を開始してない」ので読み替えを作らない）・`JDG-1206`（2026-10-03。古い形は読み替えず拒む）—— 宣言の前は、どちらもそのまま生きる（E-02）。宣言の後に、台帳がこれに代わる。
- `JDG-1202`（スキーマは `schemaVersion` を `const` で示す）—— 変えない。値の書式だけが変わる。
- `JDG-1209`（版を、当てる日の日付へ上げる）—— **一部覆す**: 上げる値は、当てる時刻（UTC）になる。
- `JDG-1590`（入手の頁からリポジトリへは、詳しい説明の案内としてだけリンクする）—— 食い違わない。スキーマの所はリポジトリの頁ではなく、Pages が返す JSON そのものである。
- 版を日付と定めたのは `CR-187` である（裁定の行は無い）。本書は FR-073 の RATIONALE のその段を書き換える。
- 文書に `"$schema"` を書くことを決めた裁定は、`JDG-1693` の前に無い（`rulings.md` を `$schema` で引いて 0 件、2026-10-08）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- **`GL-004`**（日程を機械が読める構造化データとして出し入れし、情報を落とさずに往復できる） —— 公式運用の後、形を変えた版を出しても、利用者が保存した `GRS JSON` が開けなくならない。そのための台帳を、運用の前に置く。今の決まりは「版が新しければ案内し、古い形は拒む」だけである。運用が始まると、拒むことが利用者の日程を開けなくする。
- スキーマだけを渡された AI が、`$id` を開けば最新のスキーマに届き、台帳を読めば、自分の持つ古い文書が最新の `GRS` でどう読まれるかが分かる（`JDG-1190` の「スキーマだけで分かる」の延長）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（唯一の正）** —— 所は表 T-206 の 1 行だけが持つ。生成器の定数 `SCHEMA_ID` は消し、生成器はその行を読む（E-01、9 節）。台帳の正は原稿 `_source/grs-json-changes.json` の 1 つで、スキーマに刷る（E-04）。⚠️ 表 T-297 と台帳の「削除」は同じ意味である。宣言の後は台帳だけに足すと書き、表 T-297 は宣言の変更要求が台帳へ畳む（`JDG-1691`、E-03）。文書の `"$schema"` の値も `S-540` から採り、`$id` と同じ 1 か所を正とする（E-08）。
- **`R2.14`（POLA）** —— 「プロパティー名」だけでは列が 1 つに決まらない（`name` は `Task` にも `Resource` にもある）。そのため台帳は、実体と列の 2 つで指す。
- **規則の信頼の段（記録 `rule-reliability-ladder`）** —— 「版を上げたら台帳に行を足す」は、散文だけでは守られない。宣言の後は検査が赤にする（9 節）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 版の書式は `YYYY-MM-DDTHH:MM:SSZ` の 20 字に固定する。小数秒は書かず、帯は `Z` だけとする | 利用者は「RFC とか ISO で UTC」と言った。RFC 3339 の日時は秒を必ず持つ。小数秒と帯の書き方を 1 つに絞れば、長さが揃い、辞書順がそのまま時刻の順になる。比べ方（`formatVersionReading` の文字列の大小）は変わらない | 同じ秒に 2 度上げられない（1 つの変更要求で上げるのは 1 度、という今の決まりで足りる） |
| X-2 | 台帳の正は新しい原稿 `docs/spec/_source/grs-json-changes.json` とし、生成器がスキーマの `x-grsChanges` に刷る | 生成物の手書きは禁止（スキーマは生成物）。台帳を生成器の中の定数に持てば、`SCHEMA_ID` と同じ欠陥（`DFC-2230`）を繰り返す | 原稿が 1 つ増え、その原稿は自分の役割を名乗る必要がある（検査 21・22） |
| X-3 | 「公式運用を始めた形式の版」は表 T-206 に置く（保存しない群） | 利用者が選んだ（`JDG-1678`）。値は製品のものであって文書の内容ではない（`S-350` と同じ扱い） | `src/` は読まない（生成器の群に足さない。記録 `new-settings-rows-need-generator-group`）。読むのは検査だけ |
| X-5 | 文書の `"$schema"` はルートの必須の鍵とし、刊行するスキーマは型（文字列）だけを縛る —— `const` にしない。読む路はその値で文書を拒まない。書き出すときは、読んだ値でなく `S-540` の今の値を書く | ルートの説明は「Every key is written」であり、ほかのルートの鍵も必須である。互換は `schemaVersion` が判じる（`FR-073`）—— 所を比べると、所が移っただけで文書を拒むことになる | `"$schema"` を書かない手書き・AI の文書は `RS-25` で拒まれる。骨組みと画像からのプロンプト（生成物）が書くので、雛形どおりなら届く |
| X-6 | 版は本書の 1 度の上げに含める（`"$schema"` のための 2 度目は無い）。`"$schema"` を持たない古い版（`2026-10-04`）の文書は、読み替えずに拒む | `FR-073`「形を変える変更は版を上げる」「1 つの変更要求の中で版を上げるのは 1 度だけ」。運用の前なので古い形の読み替えは作らない（`JDG-601`・`JDG-1206`。利用者「まだGRSは正式運用していない」、`JDG-1693`） | 手元の古い版の文書は開けない —— 運用の前なので、運用中の文書は無い |
| X-7 | 文書の `"$schema"` は `erd.json` の根の箱の行にしない。生成器 `erd_json_to_schema.py` がルートの先頭に置く | `erd.schema.json` は図の属性の名を `^[A-Za-z][A-Za-z0-9]*$` に縛る —— mermaid の属性の名は `$` を持てない。表 T-052 の `DR-4` が鍵を言い、生成器が置く | 図 F の ERD の根の箱には `$schema` が描かれない（`DR-4` が持つ） |
| X-8 | 台帳の 1 要素の欄は、設計書に表を足さず、原稿を縛る `_source/grs-json-changes.schema.json` に持たせ、Chapter 6.2 はそこを指す | E-04 の注の選択肢のうち、表の番号を取らない方（本書の帯は表を持たない）。欄の正は機械が照らす契約の 1 か所になる | 表の増減 0 |
| X-9 | 文書の型 `Document` は `$schema` を持たない。`json-codec.ts` が書くときに先頭に足し、読むときに捨てる。`ROOT_KEYS`（`DR-1`〜`DR-4` が名指す鍵）は `$schema` を先頭に持つ | 所は製品のもの（`S-540` は表 T-206 —— 保存しないもの）であり、文書の中身ではない。中身に持てば、文書を作るすべての所が所を写すことになる | 生の値を照らす `documentViolations` は `$schema` を欠く値に `DR-4` を言う |
| X-10 | 試験が組む文書の根に、テンプレートの `$schema` を足した（86 か所）。所の URL は書き写さない | `"$schema"` を欠く文書は `RS-25` で拒まれる（X-6）。試験は所を `startup-template.json` から採る | 試験の差分が広い（主に 1 行ずつ） |
| X-4 | 読む路が台帳の行を当てるコードは、本書では作らない。種別ごとのコードは、その種別の最初の行を足す変更要求が作る | 台帳は宣言まで空である。空のうちに 5 種の解釈器を作るのは、使われない道を先に作ることになる（`JDG-601` の「読み替えの仕様は検討無用」） | 宣言の後の最初の変更要求が、読む路のコードも持つ（10 節） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 最新のスキーマの所・公式運用を始めた版 | `docs/spec/_source/settings.json` の表 T-206 に 2 行（`S-540`・`S-541`）。刷った表は `docs/spec/_assets/tbl-settings.md` | E-01 |
| 形式の版の書式・上げる値・宣言の後の台帳の義務 | `docs/spec/01-04-requirements.md` の `FR-073` の RATIONALE（STATEMENT は変えない） | E-02 |
| 宣言の後に消す列は表 T-297 ではなく台帳へ・宣言の変更要求が宣言の前の補い・読み替えを消す | `docs/spec/05-07-design.md` の Chapter 6.1、表 T-297 の直下の注 | E-03 |
| 刊行するスキーマの `$id` と台帳の形 | `docs/spec/05-07-design.md` の Chapter 6.2（`schemaVersion` の `const` の段の後） | E-04 |
| 台帳の原稿 | 新しいファイル `docs/spec/_source/grs-json-changes.json`（空の台帳）と、その形を縛る `grs-json-changes.schema.json` | E-05 |
| 書き出す文書の先頭の `"$schema"` | `docs/spec/01-04-requirements.md` の 表 T-052 の `DR-4`（ルート直下の鍵に足す）と、`docs/spec/05-07-design.md` の Chapter 6.2 | E-08 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行 | E-06 |
| 裁定の状態 | `rulings.md` の `JDG-1673`〜`JDG-1678`・`JDG-1691`〜`JDG-1693` の状態の欄（「適用済」へ） | E-07 |
| `FR-024`・`OP-6`・表 T-233 の理由・辞書の語 | 変えない | — |

**数（予測）**: 表 0。表の行 +2（表 T-206）、書き換え 1（表 T-052 の `DR-4`）。要求 ID 0。図 0。`（MUST）` +8 前後・`（MUST NOT）` +3 前後（E-02・E-03・E-04・E-08 の文。当てた後に数える）。`_source/` のファイル +2。

---

## 2. 新しい識別子

| 識別子 | 何 | 備考 |
|---|---|---|
| `S-540` | 刊行する `GRS JSON` のスキーマの、最新版の所（URL） | 表 T-206（保存しない群） |
| `S-541` | 公式運用を始めた形式の版 | 表 T-206。値は今 `null` |
| `x-grsChanges` | 刊行するスキーマのルートの注釈の語（台帳） | 仕様の行 ID ではない。綴りは `JDG-1692` |
| `$schema`（文書のルートの鍵） | 書き出す `GRS JSON` の先頭の、最新のスキーマの所 | 仕様の行 ID ではない。値は `S-540`（`JDG-1693`） |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧（今の文） | 新 |
|---|---|
| `FR-073` RATIONALE「形式の版は日付とすること（MUST）。」 | 「形式の版は、その変更を当てた時刻とすること（MUST）。」 |
| 同「書式は `YYYY-MM-DD` とし、同じ日に 2 度改めるときだけ `YYYY-MM-DDTHH:MM` を許す（MUST）。」 | 「書式は RFC 3339 の UTC の `YYYY-MM-DDTHH:MM:SSZ` とすること（MUST）。」 |
| 同「秒を書いてはならない（MUST NOT）。」 | 「小数秒と、`Z` 以外の帯を書いてはならない（MUST NOT） —— 長さが 20 字に定まり、辞書順がそのまま時刻の順になる。」 |
| 同「⚠️ **短いほうが前になる**ので、`YYYY-MM-DD` と `YYYY-MM-DDTHH:MM` が混じっても順序は壊れない。」 | 消す（書式が 1 つになり、混じらない） |
| 同「…形式の版を、その変更を当てる日の日付へ上げること（MUST）」 | 「…形式の版を、その変更を当てる時刻へ上げること（MUST）」 |
| 同「⚠️ 版を上げても、古い形の文書を読み替えない —— …」 | 「⚠️ 公式運用の前（表 T-206 の `S-541` が `null`）は、版を上げても古い形の文書を読み替えない —— …」（後ろの文はそのまま） |
| 生成器 `erd_json_to_schema.py` の定数 `SCHEMA_ID`（`https://github.com/GoodRelax/gr-scheduler/docs/spec/_source/grs-document.schema.json`、404） | 表 T-206 の `S-540` の値を読む（9 節） |
| `tools/generate_startup_template.py` の `SCHEMA_VERSION = '2026-10-04'` | 当てる時刻の `'YYYY-MM-DDTHH:MM:SSZ'`（9 節） |
| 表 T-052 の `DR-4`「どちらの群にも入れず、ルート直下に `schemaVersion` / `documentStamp` / `changeLog` の 3 つを置くこと（MUST） —— 順に、文書の形式の版（`FR-024`。<br>文字列とすること）、…」 | 「どちらの群にも入れず、ルート直下に `$schema` / `schemaVersion` / `documentStamp` / `changeLog` の 4 つを置き、`$schema` を文書の先頭の鍵とすること（MUST） —— 順に、最新のスキーマの所（`_assets/tbl-settings.md` の 表 T-206 の `S-540`。<br>文字列とすること。<br>読む路はその値で文書を拒まない —— 互換は `FR-073` の版が判じる）、文書の形式の版（`FR-024`。<br>文字列とすること）、…」（後ろはそのまま） |
| 生成器 `erd_json_to_schema.py` のルートの `required`（`schemaVersion` から始まる 5 つ） | `$schema` を先頭に足した 6 つ（9 節） |

---

## 4. 書き直す所

### E-01 —— 表 T-206 に 2 行（`docs/spec/_source/settings.json`、`S-459` の後）

| 行 | 値（`value.ja`） | 既定（`default.ja`） | 注（`note.ja`） |
|---|---|---|---|
| `S-540` | 刊行する `GRS JSON` のスキーマの、最新版の所（Chapter 6.2） | `` `https://goodrelax.github.io/gr-scheduler/spec/_source/grs-document.schema.json` `` | ⭐ 利用者が指定した所である。⭐ 生成器が、刊行するスキーマの `$id` にこの値を刷る。⭐ 書く路が、書き出す文書の先頭の `"$schema"` にこの値を書く（`DR-4`）。スキーマだけを持つ人（AI を含む）が開くと、そのときの最新のスキーマ（JSON）が返る。⛔ 生成器・語・コード・試験にこの URL を書き写さない。所が変わったときに直すのを本行の 1 か所にするためである。⚠️ 入手の頁（`S-350`）と同じサイトに置く —— サイトは `docs/` を丸ごと載せるので、原稿の置き場がそのまま所になる。保存しないのは、所が製品のものであって文書の内容ではないからである |
| `S-541` | 公式運用を始めた形式の版（`FR-073`） | `null` | ⭐ 利用者が `GRS` の公式運用を宣言したときに、その時の形式の版（`FR-073` の書式）を入れる。値を入れるのは利用者の宣言だけである。⭐ `null` のあいだは、変更の台帳（Chapter 6.2）は空のままとし、形を変えた版は古い形の文書を読み替えずに拒む（`FR-073`）。⭐ 値が入った後に版を上げる変更は、台帳に行を足す（`FR-073`）。検査が、足していない版を赤にする。保存しないのは、運用の始まりが製品のものであって文書の内容ではないからである |

### E-02 —— `FR-073` の RATIONALE（3 節の旧 → 新のとおり）に、次の 2 段を足す（「1 つの変更要求の中で版を上げるのは 1 度だけとする」の段の後）

> ⭐ **公式運用の後（表 T-206 の `S-541` が `null` でない）に版を上げる変更は、変えた列ごとに、刊行するスキーマの変更の台帳（`05-07-design.md` の Chapter 6.2）へ 1 行を足すこと（MUST）。**  
> その版より古い版の文書は、台帳のうち文書の版より新しい行を古い順に当てて読むこと（MUST） —— 運用の後は、形を変えても、利用者の保存した文書を開けなくしないためである。  
> ⛔ 公式運用の前は、台帳に行を足してはならない（MUST NOT） —— 運用の前に形を変えた文書は、上の段のとおり読み替えずに拒む。

### E-03 —— Chapter 6.1、表 T-297 の直下の注に 1 文と 1 段を足す

旧: 「⚠️ 運用の前に形を変えて消した列は、本表に足さない —— その列を持つ文書は読み替えず、日程データの群が合わない文書として拒む（`01-04-requirements.md` の `FR-073`）。」
新: 上の文の後に「⭐ 公式運用の後に消す列は、本表ではなく、刊行するスキーマの変更の台帳（Chapter 6.2）に「削除」の行として足す —— 同じ意味の表を 2 つ持たない。」

さらにその後に（`JDG-1691`）:

> ⭐ **公式運用を宣言する変更は、宣言の前に置いた補いと読み替えを消し、本表を台帳へ畳んで、台帳を空から始めること（MUST）。**  
> 消すのは 5 つ —— 本表の行（`RK-1`・`RK-2`）、`TaskGroup.editGroup` を `null` で補うこと（`01-04-requirements.md` の `GP-1`）、注記の色 8 列（`_assets/fig-erd-detail.md` の `AT-145`〜`AT-152`）を `null` で補うこと、`Project.sourceFormat`（`AT-143`）を補うこと、`actualDuration` から `stop`（`AT-141`）へ読み替えること（`FR-011`）。  
> 宣言の前に運用中の文書は無い。残せば、台帳に載らない読み替えが残り、「台帳は最新の `GRS` が古い文書にすることの全件」が偽になる。

### E-04 —— Chapter 6.2、「⭐ `schemaVersion` は、その造りの版を `const` で言うこと（MUST）」の段の後に足す

> ⭐ **刊行するスキーマの `$id` は、`_assets/tbl-settings.md` の 表 T-206 の `S-540` の所とすること（MUST）** —— スキーマだけを持つ人が、そこを開けば最新のスキーマに届く。  
> ⭐ **刊行するスキーマは、ルートの注釈の語 `x-grsChanges` に、変更の台帳を配列で持つこと（MUST）。**  
> 1 件の変更を 1 要素とし、古い順に末尾へ足すだけとする —— 前の要素を書き換えない。  
> 台帳の正は `_source/grs-json-changes.json` であり、生成器が刷る。  
> ⛔ 書き出す `GRS JSON` に台帳を載せてはならない（MUST NOT） —— 古い文書は自分より後の変更を知りようがなく、最新のスキーマが全件を持てば足りる。  
> ⚠️ 語は JSON Schema の語ではない —— JSON Schema 2020-12 は知らない語を注釈として通すので、台帳は照合を変えない。頭の `x-` は、規格の外の語だと読み手に告げる —— JSON Schema の計画が即席の注釈の語に告げた慣習（json-schema.org のブログ 2023-02-22「custom annotations will continue」。`x-` で始まる語は注釈とし、語彙の語と衝突しないよう取ってある）であり、OpenAPI の拡張の語も同じ慣習である（`JDG-1692`）。  
> ⭐ 台帳の 1 要素は、次の欄を持つ:
>
> | 欄 | 中身 |
> |---|---|
> | `version` | その変更を当てた形式の版（`FR-073` の書式） |
> | `kind` | `added`（追加）／`removed`（削除）／`renamed`（改名）／`converted`（変換）／`refused`（拒む） |
> | `entity` | 変えた列の実体（表 T-058 の実体名）。見せ方の群の鍵は `documentSettings` |
> | `column` | 変えた列の名（その版より前の名） |
> | `default` | `added` だけ。古い文書を読むときに補う値 |
> | `to` | `renamed` だけ。新しい名 |
> | `rule` | `converted` だけ。読む路が当てる規則の名 |
>
> ⭐ 古い文書を最新の `GRS` がどう読むかは種別が決める: `added` は `default` で補って読む、`removed` は捨てて読み告げない（Chapter 6.1 の表 T-297 と同じ）、`renamed` は `to` の名へ移して読む、`converted` は `rule` の規則で読む、`refused` は文書ごと拒む（表 T-233 の `RS-25`）。  
> ⚠️ 公式運用の前（`S-541` が `null`）は、台帳は空の配列である（`FR-073`）。

⭐ 当てる席は、欄を `_source/grs-json-changes.schema.json` に持たせ、設計書は指すだけにした（X-8）。上の欄の表と種別ごとの読み方の文は、契約の `description` と Chapter 6.2 の 1 文に入った。

### E-08 —— 書き出す文書の先頭の `"$schema"`（`JDG-1693`）

表 T-052 の `DR-4` は 3 節の旧 → 新のとおり。Chapter 6.2、E-04 の `$id` の段の後に足す:

> ⭐ **書き出す `GRS JSON` は、ルートの先頭の鍵に `"$schema"` を書き、値を 表 T-206 の `S-540` の所とすること（MUST）** —— 文書だけを渡された人・AI・エディタが、そこからスキーマへ辿れる。JSON を扱うエディタの多くは、データの文書の `"$schema"` を読んでスキーマを引き、照合と補完に使う。  
> ⭐ **刊行するスキーマのルートは、`"$schema"` を必須の鍵として受けること（MUST）** —— ルートは閉じている（`additionalProperties: false`）ので、受けなければ自分の書いた文書を拒む。型は文字列だけを縛り、`const` にしない。  
> ⛔ 読む路は、`"$schema"` の値を理由に文書を拒んではならない（MUST NOT） —— 互換は形式の版が判じる（`01-04-requirements.md` の `FR-073`）。所が移っても、古い所を書いた文書は読める。  
> 書き出すときは、読んだ値でなく `S-540` の今の値を書く。  
> ⚠️ `S-540` は、開けば JSON が返る所でなければならない —— 書いた所が開けなければ、辿れない（`DFC-2230`）。

### E-05 —— 新しい原稿 2 つ

- `docs/spec/_source/grs-json-changes.json` —— 役割を名乗る頭（検査 21・22 の形）と `"changes": []`。
- `docs/spec/_source/grs-json-changes.schema.json` —— 上の表の欄・`kind` の 5 つの列挙・`version` の `pattern`（`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$`）・種別ごとの必須欄（`added` は `default`、`renamed` は `to`、`converted` は `rule`）。

### E-06・E-07 —— 台帳

`changelog.md` に 1 行。`rulings.md` の `JDG-1673`〜`JDG-1678`・`JDG-1691`〜`JDG-1693` の状態を「適用済」にする。`DFC-2230` は `実装待ち` へ（コードの波で `実測待ち`）。

---

## 5. 継ぎ目

```
SEAM (CR-699)
- docs/spec/_source/erd_json_to_schema.py: drop the SCHEMA_ID constant; read S-540's value from
  settings.json (through the same reader generate_entity_types.py uses) and write it as "$id".
  Read docs/spec/_source/grs-json-changes.json and write its "changes" array as the root
  annotation "x-grsChanges" (an empty array until S-541 is set).
- tools/generate_json_schema_validator.py: add "x-grsChanges" to DROPPED (an annotation; the
  validator table never obeys it), next to "const".
- tools/generate_startup_template.py: SCHEMA_VERSION becomes the landing instant,
  'YYYY-MM-DDTHH:MM:SSZ' (UTC, seconds, no fraction). Everything that reads it regenerates
  (npm run gen): the schema's const, src/adapter/document-codec/grs-json-schema.ts, the startup
  template and its manifest, empty-document.json, image-to-grs-json-prompt.json.
- docs/spec/_source/erd_json_to_schema.py (root, JDG-1693): add "$schema" as the FIRST key of the
  root "required" and "properties" ({"type": "string"} plus a description naming S-540); the root
  stays "additionalProperties": false.
- tools/generate_entity_types.py: add S-540 to a generator group so src can read it (a settings row
  reaches src only when the generator lists it).
- src/adapter/document-codec/json-codec.ts: the writer emits "$schema" (S-540's current value) as the
  first root key, never the value it read; the reader does not compare the value (the schema checks
  the type only). formatVersionReading still compares strings; a date-only "2026-10-04" sorts before
  any "2026-10-04T..Z", so an older build still reports a newer document as newer. A document without
  "$schema" (the old shape) is refused by the schema (RS-25); no read conversion before launch.
- tools/generate_startup_template.py: the startup template, empty-document.json and the image
  prompt's skeleton carry "$schema" first.
- No reader code for the five kinds lands here (X-4).
```

---

## 6. グラフ（`f5bd70a3`）

| 対象 | 届く先 | 読んだ結果 |
|---|---|---|
| `FR-073` | 指している先: 表 T-103・T-233・T-024a・T-206・T-003・T-058・T-052・T-297。指される: 要求 7 件／参照 25 か所（`impact.py FR-073`） | 変えるのは RATIONALE の版の書式の段と、運用の前後の段だけ。STATEMENT（読めない版の判別・案内）は変えない。指している 25 か所のうち、版の書式を引く所は無い（`FR-011` の 3019 行は「古い版は読める版」を引くだけ） |
| `DR-4` | 指される: 要求 3 件／参照 9 か所（`impact.py DR-4`） | ルート直下の鍵に `$schema` を足す（E-08）。「文字列とすること」は新しい書式でも正しい。`BK-6`（新しい文書）は `FR-027` のテンプレートと同じ形なので、テンプレートが `$schema` を持てば足りる。当てる席が `impact.py DR-4` を測り直す |
| Chapter 6.2 | `schemaVersion` の `const` の段（1755 行あたり） | E-04 はその後に足す。試験が引く文を割らないよう、段落の終わりに足す（記録 `worktree-runs-parent-tools`） |
| 閉路 | `induced.py` は `check.sh` の書き出しが要るため、当てる席が測る | — |

---

## 7. 数の予測と実測

| 数 | 予測 | 実測（当てた後） |
|---|---|---|
| 表 | 0（E-04 を表にすれば +1） | 0（X-8） |
| 表の行 | +2（表 T-206） | +2（`S-540`・`S-541`）。書き換え 1（`DR-4`） |
| 要求 ID・図 | 0 | 0。`（MUST）` +7（足した 12・消した 5）、`（MUST NOT）` +3（足した 6・消した 3）—— 2 つの設計書の差分の `+`/`-` 行で数えた |
| `_source/` のファイル | +2 | +2（`grs-json-changes.json`・`grs-json-changes.schema.json`）。検査 +1（検査 76、`check-grs-json-ledger.py`） |
| 版の値を直に持つファイル（`2026-10-04` と `schemaVersion` が同じファイルにある所。`previous-project-result/` を除く） | 12 —— `tools/generate_startup_template.py`・`docs/spec/_source/grs-document.schema.json`（生成）・`src/framework/single-html-shell/` の 3 つ（生成）・`src/adapter/screen-renderer/image-to-grs-json-prompt.json`（生成）・`docs/guides/schedule-to-grs-json/grs-skeleton.json`・`sample-schedule/Three-Year Product Plan.json`・`tests/fixtures/measuring-document.json`・`tests/unit/` の 3 つ || 12 のうち、生成物 6 つ（`tests/fixtures/measuring-document.json` も生成器が書く）は `npm run gen` が書き直し、手で直したのは案内の骨組み・見本・試験 2 つ（`cr-646`・`cr-651`。`edit-calendar.test.ts` は版を引かない文中の日付）と生成器 1 つ。ほかに試験の根の組み立て 86 か所に `$schema` を足した（X-10） |

⚠️ 12 のうち生成物は 5 つ（`npm run gen` が書き直す）。手で直すのは見本・案内の骨組み・試験の 6 つと、生成器の 1 つ。`previous-project-result/` の 2 つは過去の記録なので触らない。
⚠️ 手で直す 6 つは、版と同時に先頭の `"$schema"` も足す（`JDG-1693`）。`"$schema"` を持たない文書を読ませる試験は、拒むことを確かめる試験になる（X-6）。

---

## 8. 波

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1（仕様） | `docs/spec/_source/settings.json`・新しい原稿 2 つ・`01-04-requirements.md`・`05-07-design.md`・台帳 | E-01〜E-08 |
| 2（コードと生成） | `docs/spec/_source/erd_json_to_schema.py`・`tools/generate_json_schema_validator.py`・`tools/generate_startup_template.py`・`tools/generate_entity_types.py`・`src/adapter/document-codec/json-codec.ts`・`npm run gen` の生成物・見本 2 つ・試験 4 つ・`check.sh` の新しい検査 | 5 節・9 節 |

- ⭐ **毎フレームの経路: いいえ。** 読み書きの路で変わるのは、版の値の字面と、書くときの先頭の鍵 1 つだけである。

---

## 9. 仕様の外で直すもの

- 生成器 2 つと版の定数 1 つ（5 節）。
- **新しい検査**（`.claude/skills/spec-graph-check/check.sh` に 1 つ）:
  1. `SCHEMA_VERSION` が `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$` に合う。
  2. `S-541` が `null` なら、台帳は空である。
  3. `S-541` が `null` でなく、`SCHEMA_VERSION` がそれより新しいなら、台帳に `version == SCHEMA_VERSION` の行が 1 つ以上ある。
  4. 台帳の行は `version` の昇順で、どの `version` も `SCHEMA_VERSION` 以下である。`removed` と `renamed` の `column` は今の `erd.json`（または表 T-202・T-203 の鍵）に無く、`added` の `column` と `renamed` の `to` は有る。
- 見本 `sample-schedule/Three-Year Product Plan.json` と案内の骨組み `docs/guides/schedule-to-grs-json/grs-skeleton.json` の `schemaVersion` を新しい値へ、先頭に `"$schema"` を足す（運用の前なので読み替えはしない。記録 `no-backward-compat-before-launch`）。

---

## 10. ⛔ この変更でやらないこと

- 読む路が台帳の 5 種を当てるコード（X-4）。宣言の後、その種別の最初の行を足す変更要求が作る。
- 表 T-297 の 2 行と、`json-codec.ts` の 4 つの補い・読み替えを消すこと —— 宣言の変更要求が消す（`JDG-1691`）。本書は義務を Chapter 6.1 に書くだけ（E-03）。
- `S-541` に値を入れること —— 入れるのは利用者の宣言だけである。
- `FR-073` の STATEMENT・`FR-024`・`OP-6`。

---

## 11. 利用者に問うこと

- 無い。`PND-806`〜`PND-808` は 2026-10-08 に裁定を受けた（`JDG-1691`〜`JDG-1693`）。

---

## 12. 台帳

| 台帳 | 行 |
|---|---|
| `rulings.md` | `JDG-1673`〜`JDG-1678`・`JDG-1691`〜`JDG-1693`（指示 —— `CR-699` が当てる）、`JDG-1209` の状態（覆された、一部） |
| `defects.md` | `DFC-2230`（`仕様待ち`） |
| `pending-decisions.md` | `PND-806`〜`PND-808`（裁定済。`JDG-1691`〜`JDG-1693`） |

---

## 13. 測り方の再現

- 今の `$id` が開けないこと・推奨の所が開けること（2026-10-08）: `curl -s -o /dev/null -w "%{http_code}" -L <所>` —— `https://github.com/GoodRelax/gr-scheduler/docs/spec/_source/grs-document.schema.json` は 404、`https://goodrelax.github.io/gr-scheduler/spec/_source/grs-document.schema.json` は 200（中の `schemaVersion` の `const` は `2026-10-04`）、`https://raw.githubusercontent.com/GoodRelax/gr-scheduler/main/docs/spec/_source/grs-document.schema.json` は 200。
- 版の値を直に持つファイル: `grep -rln "2026-10-04" src tests tools sample-schedule docs/guides docs/spec/_source | xargs grep -ln "schemaVersion\|SCHEMA_VERSION"`（`sample-schedule/Three-Year Product Plan.json` は名に空白があるので別に数えた）。
- 届く先: `.claude/skills/spec-graph-check/impact.py FR-073`・`impact.py DR-4`（`f5bd70a3`）。
