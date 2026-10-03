# CR-646 —— `GRS JSON` の形を 1 度に変える（側ごとの時刻・既定の時刻の 2 列・`stackOrder` と `lastSaved` を消す・どの `Task` にも `TaskVisual` を 1 つ）

> 起草の状態: 仕様の波を当てた（2026-10-03、`1b7ad9ee` の上）。⛔ コードの波（14 節）と試験の波（15 節）はまだ当たっていない。
> ID の帯: 番号 `CR-646` と台帳の帯 `DFC-1823`〜`DFC-1829` は調整役から受けた。帯の行は `DFC-1823` を 1 つ使った（12 節）。
> 閉じるもの: `docs/review/grs-json-schema-self-explanation-2026-10-03.md` の 7.1 節の CR D —— C-13・C-14・C-16〜C-19・C-21〜C-26・C-28・C-32〜C-35 の 17（仕様の側は本書が当て、コードの側は 14 節が名指す）。同書 7.3 節の食い違い「書く時刻」（`EX-7` と `JDG-1205`）。台帳 `DFC-1799`（仕様の側）。
> ⛔ 閉じないもの: `DFC-1796`（案内を刷る生成器が無いこと。案内は本書でも手で写した）、`DFC-1797`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md`。全文は同書を見よ）

| 裁定 | 逐語（抜粋） | 本書での扱い |
|---|---|---|
| `JDG-1195` | 「stackOrder を消し、向きに Why (Recommended)」 | `AT-62` を消す（E-03）。`ST-5`・`S-58`・スキーマの `stackDirection` に Why（E-05・E-07・E-12）。名の例を生きた列へ替え、`G-4` を概念「積み順」に改め、`N-4` を退かせた（E-06） |
| `JDG-1197` | 「PND-677：1 つを課す」 | 表 T-220 に `IV-23`（E-09）、`AT-97` とスキーマの説明（E-03） |
| `JDG-1203`〜`JDG-1205` | 「表のとおり決める (Recommended)」 | 表 T-350 を新しく置き、`EX-7` がそれを指す（E-01）。`Project` に `AT-154`・`AT-155`（E-03）、既定の時刻は 表 T-209 の `S-482`・`S-483`（E-04） |
| `JDG-1206` | 「まだ公式リリースしていないので、Bで良い。 今はシンプルにしろ。」 | 表 T-297 に行を足さず、足さないことを前文の下に 1 段（E-09）。`FR-073` が版を上げても読み替えないと言う（E-02） |
| `JDG-1207` の後半 | 「表のとおり (Recommended)」（`JDG-1210` が保つ） | `EX-11` の `ConstraintDate` ＝ 書き出した `Start`、`EX-12` の `ManualStart` ／ `ManualFinish` ＝ 書き出した `Start` ／ `Finish`（E-01） |
| `JDG-1209` | 「A. 上げる (Recommended)」 | `FR-073` に「形を変える変更は版を当てる日の日付へ 1 度だけ上げる（MUST）」（E-02）。`SCHEMA_VERSION` を `2026-10-03` にした（E-13） —— ⛔ コードの波は上げ直さない |
| `JDG-1210` | 「Bで確定。 スキーマにこのWhyを書け」 | `AT-9`（作るときに書く）、`AT-11` を消す、`DV-12`（書き出しで作る `LastSaved`）、`NR-7`、`FR-101`・`FR-021` に 1 段、`PF-10` を退かせた（E-01〜E-03・E-09） |
| `JDG-1211` | 「スキーマのコメントに日時の使い分けの理由を残せと言う意味だぞ？」 | 根の説明・`documentStamp`・`fileSavedUtc`・`created`・新しい 2 列の説明（C-24 の文案、E-12）。Chapter 6.2 に規則（E-10） |

### 0.2 ⛔ 当てる前に確かめたこと

**問い 1 —— 既定の時刻 `08:00:00` ／ `17:00:00` の置き場はどこか。⇒ 表 T-209 の新しい 2 行 `S-482`・`S-483`（提案 2、`S-128` と同じ形）。**

- 表 T-209 は「取り込んでいない文書、および、取り込んだが値が空の文書が使う」既定であり、`Project.minutesPerDay` が空なら `S-128` という形がすでにある。⇒ 列が空なら行を使う、を同じ形で言える。
- 値は文字（`lit`、`HH:MM:SS`）で持つ。`_source/settings.schema.json` の `lit` の形に時刻を足した。
- ⛔ 文の中で手で写さない（レビューの指摘 d）—— スキーマの説明とプロンプトの原稿は `{{S-482}}` ／ `{{S-483}}` と書き、生成器 `tools/generate_entity_types.py` の `with_calendar_rows_printed` が値を刷る（数だけを読んでいた `default_calendar_number` を `default_calendar_value` にし、文字も返す）。
- `DEFAULT_CALENDAR_ROWS` に 2 行を足した —— `src/entity/document-model/schedule/schedule-entities.ts` の `DEFAULT_CALENDAR_VALUES` に `'S-482': '08:00:00'`・`'S-483': '17:00:00'` が刷られ、コードの波は打ち込まずに読める。
- 出典は公式の頁（`JDG-1204`）—— 行の備考に Microsoft サポートの URL を書いた。🔎 の印は付けない（出所がある）。

**問い 2 —— 字面の合わない既定の時刻をどう読むか（提案 2）。⇒ `GRS JSON` は文書ごと拒み、MSPDI は持ち回りに残す。**

- `GRS JSON`: スキーマに `$defs/Time`（`xsd:time` の字面の `pattern`）を置き、2 列はそれを指す。照合の表の生成器（`tools/generate_json_schema_validator.py`）は `pattern` を `/$defs/DateTime` でだけ捨てる —— ⇒ 手を入れずに `Time` の `pattern` は照合に載る。`Project` は文書に 1 つしか無く、行ごと落とす道が無い（`05-07-design.md` の Chapter 6.1 の前文に 1 段）。
- MSPDI: 字面の合わない値は列へ移さず `carry` に残し（`EX-4`）、列は空、書く時刻は `S-482` ／ `S-483`（`AT-154` の意味、`FR-021`）。

**問い 3 —— `G-4` と `N-4`（提案 3）。⇒ `G-4` は概念「積み順」に改め、`N-4` は退かせた。**

- 「積み順」は本書の散文で今も生きている（表 T-014 の題、`ST-6`・`ST-7`、`A-1` の ①、`RC-3`、`K-11`・`K-58`）。⇒ 散文を読むための語（表 T-005）としては要る。持ち主は `ST-2`（決める）と `ST-6`（人は決めない）。
- 表 T-101 は「データの語」であり、確定名（英）の欄は文書が持つ名である。文書は段を持たなくなった —— ⇒ `N-4` に置く名が無い。`src/` にも概念の名は無い（`stack*` の識別子を数えた: `stackOrder` は列だけ、ほかは `stackGap`・`stackSafetyCap`・`stackDirection` などの別のもの）。
- ⇒ `N-4` を退かせ（`retired.py`）、`G-4` から `stackOrder` を外した。

**問い 4 —— 1 点の日（`CommentBox.anchorDate`・`scrollDate`）の時刻（提案 1）。⇒ `00:00:00`、表 T-350 の `WT-8`、「`GRS` の選択」と名乗る。**

**問い 5 —— 版を上げるのは仕様の波か、コードの波か。⇒ 仕様の波（本書）で上げた。**

- 刊行するスキーマ（`_source/grs-document.schema.json`）は本書で形が変わる。その `const` は `SCHEMA_VERSION` から刷られる（`CR-643`）—— ⇒ 形を変えて版を上げないと、新しい形が古い版を名乗る。
- `JDG-1209` は「当てる日の日付」—— 本書を当てた日は 2026-10-03。
- ⛔ コードの波は `SCHEMA_VERSION` を動かさない（1 度だけ上げる。`FR-073` の新しい段）。
- 起動時の見本の生成器は形だけを合わせた（14 節の K-8 の残りはコードの波）—— `stackOrder` を書かない、`lastSaved` を書かない、2 列を `null` で書く。⇒ `npm run gen` は止まらずに通る。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-1` の `GL-004`**（成果物が構造化データである）。`GRS` が書いた日時が MS Project の読む瞬間と同じになり、スキーマだけを持つ書き手が読み違える鍵（誰も読まない段・二重の保存時刻）が消える。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾がない・唯一の正）** —— `EX-7`「`00:00:00`」と `JDG-1205` の食い違いを表 T-350 で解いた。保存の時刻は `AT-140` の 1 か所（`AT-11` を消し、`LastSaved` は書き出しで作る）。既定の時刻は `S-482` ／ `S-483` の 1 か所で、文は刷る。版の値は `SCHEMA_VERSION` の 1 か所。
- **`R1.4`（境界・空の場合）** —— 既定の時刻の列が空・字面が合わない（`GRS JSON` と MSPDI で別）、マイルストーン、1 点の日、取り込んだまま編集していない値を、それぞれ決めた。
- **`R2`（名）** —— 新しい接頭辞 `WT`（Written Time）。列名は MSPDI の名のまま（`defaultStartTime` ／ `defaultFinishTime`、`JDG-1192`）。名の例は生きた列 `groupId` へ替えた。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 側ごとの時刻は新しい表 T-350（行 10）に置き、`EX-7` はそれを指す | 表を正にする（`spec-table-first-writing`）。`EX-7` の升に 10 の場合を詰めない | 表 1 つ、接頭辞 1 つ |
| 決定 2 | マイルストーンは終了の側の列（`finish`・`actualFinish`）も開始の時刻（`WT-5`） | `JDG-1205`「マイルストーン（開始＝終了）は既定の開始時刻」。開始と終了が同じ瞬間になる | `BaselineTask.milestone` も同じに読む |
| 決定 3 | 時刻の `pattern` は照合に載せる | 問い 2。`Project` は行ごと落とせない | 字面の合わない `GRS JSON` は開かない（`RS-25`） |
| 決定 4 | 取り込んだ `LastSaved` は持ち回らずに読み捨てる | 持ち回ると書き出しで作る値と 2 度書く。往復は `NR-7` が外す | MS Project の最終保存日は往復しない（`JDG-1210` のとおり） |
| 決定 5 | `BK-4` の新しく始めた文書は `created` に始めた瞬間を書き、既定の時刻の 2 列は `null` | `JDG-1210`「新しく作るときに書く」。`null` なら交換相手は自分の既定を使う | 起動時の見本（`FR-027`）は見本を作った日のまま |
| 決定 6 | 版は仕様の波で上げた | 問い 5 | コードの波が当たるまで、刷られたスキーマの版と `src` の読み書きの形が合わない（`DFC-1823`） |
| 決定 7 | 案内（`docs/guides/schedule-to-grs-json/`）の土台と例と手順 2・7 も本書で直した | 検査 75 が刊行するスキーマで照らす —— 直さないと `stackOrder` と `lastSaved` で赤くなる | 案内は手で写したまま（`DFC-1796`） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 側ごとの時刻 | `docs/spec/01-04-requirements.md` の 表 T-033 の `EX-7`・`EX-11`・`EX-12`、新しい 表 T-350、`FR-054`・`FR-024`・`FR-021` に 1 段ずつ | E-01 |
| 版を上げる規則 | 同 `FR-073` | E-02 |
| 列 | `docs/spec/_source/erd.json`（`AT-9`・`AT-97`・`AT-140`・`AT-154`・`AT-155` と 3 つのエンティティの説明、`AT-11`・`AT-62` を消す、`DV-1`・`DV-12`）、`erd.schema.json`（`isTime`） | E-03 |
| 既定の時刻 | `docs/spec/_source/settings.json` の 表 T-209 の `S-482`・`S-483`、`settings.schema.json` | E-04 |
| 積む向き | 表 T-014 の `ST-5`・`ST-6`、表 T-202 の `S-58`（備考と `schemaNote`） | E-05 |
| 名の例・語 | 表 T-005 の `G-4`、表 T-006a の `W-2`・`W-5`・`W-7`、語幹の例、所属の例、`_assets/tbl-glossary.md` の `N-4`（退く） | E-06 |
| 文書の基本情報 | 表 T-224 の `PF-10`（退く）と下の注、`FR-101`、表 T-342 の `BK-4` | E-08 |
| 不変条件・正規化・退いた列 | `docs/spec/05-07-design.md` の 表 T-220 の `IV-23` と前文、表 T-297 の下、表 T-228 の `NR-7`、表 T-075 の `UF-128`・`UF-170` | E-09 |
| スキーマの規則 | 同 Chapter 6.2 | E-10 |
| 辞書 | `docs/spec/_source/display-words.json` の `IV-23`（空の語、ほかの `IV` と同じ） | E-11 |
| 生成器 | `docs/spec/_source/erd_json_to_schema.py`・`settings_json_to_md.py`・`tools/generate_entity_types.py`・`tools/generate_image_to_grs_json_prompt.py`・`tools/generate_startup_template.py` | E-12・E-13 |
| プロンプトの原稿 | `docs/spec/_source/image-to-grs-json-prompt.ja.md`・`.en.md` の手順 2 と 7 | E-14 |
| 接頭辞 | `docs/spec/_source/row-id-prefixes.json` の `WT` | E-15 |

---

## 2. 新しい識別子

- 表 `T-350`（`GRS` が書く日時の時刻）と接頭辞 `WT`（行 `WT-1`〜`WT-10`）。
- 列 `AT-154`（`Project.defaultStartTime`）・`AT-155`（`Project.defaultFinishTime`）。
- 設定の行 `S-482`（既定の開始時刻 `08:00:00`）・`S-483`（既定の終了時刻 `17:00:00`）。
- 書き出しで作る値 `DV-12`（`Project/LastSaved`）。
- 不変条件 `IV-23`。正規化 `NR-7`。
- スキーマの `$defs/Time`。`erd.json` の列の印 `isTime`。`settings.json` の行の鍵 `schemaNote`。
- 生成器の定数 `TIME_DEF`・`TIME_PATTERN`・`MANUSCRIPT_NOTES`（`erd_json_to_schema.py`）、関数 `default_calendar_value`（`generate_entity_types.py`、`default_calendar_number` の改名）。
- ⚠️ 測った最大（当てる直前、`1b7ad9ee` の木）: 表 `T-349`、列 `AT-153`、設定 `S-481`、`IV-22`、`DV-11`、`NR-6`。`WT` は `row-id-prefixes.json` に無かった。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`1b7ad9ee`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `AT-62` `TaskGroupMember.stackOrder` | `erd.json`・表 T-058 | 無し —— 積む順は `ST-2` の自動だけ。`TaskGroupMember` の説明が「段は持たない」と言う | E-03 |
| `AT-11` `Project.lastSaved` | `erd.json`・表 T-058 | `AT-140`（ファイルへ書けた刻）と `DV-12`（書き出しで作る `LastSaved`） | E-03 |
| `PF-10` 最後に保存した日時 | 表 T-224 | 無し —— 表の下の注が「出さない」と理由を言う | E-08 |
| `N-4` `stackOrder` | 表 T-101 | `G-4`「積み順」（概念） | E-06 |
| `EX-7`「`GRS` が書く日付の時刻は `00:00:00`」 | 表 T-033 | 表 T-350 | E-01 |
| 根の説明「GRS uses only the day for now and writes 00:00:00」 | `erd_json_to_schema.py` の `ROOT_DESCRIPTION` | C-24 の文案（「notes」は「comment and highlight boxes」に —— レビューの指摘 c） | E-12 |
| 手順 2「時刻は常に 00:00:00」・手順 7 の `"stackOrder": null` | プロンプトの原稿 ja・en と案内 | 側ごとの時刻（`{{S-482}}`・`{{S-483}}` を刷る）・段を書かない | E-14 |
| 起動時の見本の生成器の `stackOrder` と `check_stack_order`、`lastSaved`（`PROJECT_LAST_SAVED`） | `tools/generate_startup_template.py` | 書かない。2 列を `null` で書く | E-13 |
| 版 `2026-09-27` | `SCHEMA_VERSION` | `2026-10-03` | E-13 |

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（01-04）—— `EX-7` は「`GRS` が書く日時の時刻は 表 T-350 に従うこと（MUST）」と `Project/FinishDate` が終了の側の時刻を継ぐこと（C-13）。表 T-033 の下に、時刻の段（既定の時刻の列と `S-482` ／ `S-483`、理由、「`GRS` の選択」の意味）と 表 T-350。`EX-11`（`ConstraintDate` ＝ 書き出した `Start`）・`EX-12`（`Manual*` ＝ 書き出した `Start` ／ `Finish`）（C-19）。`FR-054` に「日時どうしは日の部分で比べる（MUST）」（C-34 の仕様の根）。`FR-024` の書く形の文が 表 T-350 を指す。`FR-021` に既定の時刻の 2 列の往復（C-33）と `LastSaved` を読み捨てること。
- **E-02**（`FR-073` の RATIONALE）—— 形を変える変更は版を当てる日の日付へ 1 度だけ上げる（MUST）、上げても読み替えない（C-21、`JDG-1206`）。
- **E-03**（`erd.json`）—— 3 節の消すもの。`AT-154`・`AT-155`（型「時刻」、`isTime`、意味と `schemaNote`、C-14・C-32）。`AT-9` の意味と `schemaNote`（C-23・C-24）。`AT-140` の意味と `schemaNote`（C-24）。`AT-97` の意味（`IV-23`、C-28）。`TaskGroupMember`・`TaskVisual`・`documentStamp` の説明（C-24・C-25・C-28）。`DV-1`（終了の側の時刻を継ぐ）・`DV-12`。
- **E-04**（`settings.json`）—— `S-482`・`S-483`（C-32 ②）。
- **E-05** —— `ST-5` に Why、`ST-6` を列なしで（C-25・C-26）。`S-58` の備考と `schemaNote`（C-26）。
- **E-06** —— `G-4`・`W-2`・`W-5`・`W-7`・語幹の例・所属の例、`N-4` を退かせる（C-25、問い 3）。
- **E-08** —— 表 T-224 の `PF-10` を退かせ、注を直した。`FR-101` に「ファイルへ書けた時刻を持つのは `AT-140` だけ（MUST）、`LastSaved` は書き出しで作る」。`BK-4` に `created` と 2 列（決定 5）。
- **E-09**（05-07）—— 表 T-220 の前文に時刻の `pattern` は照合に載せる段、`IV-23`（C-28）。表 T-297 の下に「運用の前に形を変えて消した列は足さない」（`JDG-1206`）。表 T-228 の `NR-7`（C-23）。`UF-128`・`UF-170` に側ごとの字を作る責務（C-17 の置き場）。
- **E-10**（Chapter 6.2）—— 見せ方の鍵の説明も `schemaNote` から、日時の種類を使い分ける理由をスキーマが言う（MUST、`JDG-1211`）、時刻の列は 1 つの時刻の定義を指し照合に載る（MUST）。
- **E-11**（辞書）—— `IV-23` の項（`text` と `nextStep` は空、`IV-1`〜`IV-22` と同じ）。表の順に `IV-6` の後へ置いた。
- **E-12**（`erd_json_to_schema.py`）—— `isTime` → `$defs/Time`、`settings.json` の行の `schemaNote` を見せ方の鍵の `description` に（使われない注は止まる）、根の説明（C-24）。`settings_json_to_md.py` は `schemaNote` を印字しない鍵に数える。
- **E-13**（生成器）—— `generate_entity_types.py`: `default_calendar_value`、`DEFAULT_CALENDAR_ROWS` に `S-482`・`S-483`、文字の行は `string` で刷る。`generate_image_to_grs_json_prompt.py`: 空にする列から `lastSaved` を外した。`generate_startup_template.py`: 3 節のとおり形だけ、`SCHEMA_VERSION`。
- **E-14**（原稿の手順 2・7、C-16）—— 時刻は列の側で決まり、`project.defaultStartTime`（null なら `{{S-482}}`）／ `defaultFinishTime`（null なら `{{S-483}}`）、マイルストーンは両端とも開始の側、暦の例外は `00:00:00` ／ `23:59:00`。手順 7 は段を書かない。
- **E-15** —— 接頭辞 `WT`。

当てた後に打ったもの: `npm run gen`（2 回、接頭辞の数が後の生成で動くため）→ `npm run gen:check` → `npm run typecheck` → `vitest` フル（機械の錠の下） → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。

### 4.1 重なり

`CR-643`〜`CR-645` は当て済み。⚠️ `CR-644` のラグ（0.1 分）は起動時の見本の生成器がそのまま書く —— 本書は触れない。着地していない変更要求のうち、表 T-033・T-224・T-220・T-228・T-342 を書くものは本書の木では見えない（調整役が束ねる）。

---

## 5. 継ぎ目

```
SEAM (CR-646, spec wave)
- Generated, no hand-written src changed:
  * src/entity/document-model/schedule/schedule-entities.ts: Project loses
    lastSaved (AT-11) and gains defaultStartTime / defaultFinishTime
    (AT-154 / AT-155, string | null); TaskGroupMember loses stackOrder (AT-62);
    DATE_COLUMNS.Project loses 'lastSaved'; DEFAULT_CALENDAR_VALUES gains
    'S-482': '08:00:00' and 'S-483': '17:00:00'.
  * src/adapter/document-codec/grs-json-schema.ts: SCHEMA_DEFS.Time with the
    xsd:time pattern -- the walker ENFORCES it (only DateTime's pattern is
    dropped); no stackOrder, no lastSaved.
  * src/framework/single-html-shell/startup-template.json, empty-document.json,
    startup-template-manifest.json, tests/fixtures/measuring-document.json:
    schemaVersion 2026-10-03; project without lastSaved, with the two
    default-time columns null; members without stackOrder. Dates are still
    T00:00:00 and 963 of 1000 tasks still lack a TaskVisual (code wave K-8).
  * src/adapter/screen-renderer/image-to-grs-json-prompt.json (prompt steps
    2 and 7, the schema it carries), display-words.json (IV-23, empty).
- Not here: every hand-written src change (section 14), the tests (15).
```

---

## 6. グラフ（`1b7ad9ee`）

- `impact.py EX-7`: 指している側は `FR-054`・`FR-057`・`UF-170`（`05-07-design.md:390`） —— 3 つとも本書で読み直した（`FR-054` に日で比べる段、`UF-170` に別の字を作る責務）。
- `impact.py FR-073`: 指している側は要求 7 件 ／ 参照 25 箇所 —— 新しい段は版を上げる時を言うだけで、判別の規則は変えない。
- `impact.py ST-6`: 指している側は `G-4` の 1 箇所 —— E-06 で読み直した。
- `impact.py FR-101`: 指している側は要求 5 件 ／ 参照 18 箇所 —— `AT-140` の保管は変えない。
- `impact.py T-224`: 指している要求は `FR-074` の 1 つ —— 表の全数の文（「本表が、この面が書く列の全数である」）は行が減っても真。
- `impact.py G-4`: 指している側は 0。

---

## 7. 数の予測と測った数

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| スキーマの `$defs` | 20 → 21（`Time`） | 生成の出力「entity definitions」 |
| `Project` の列 | 25 → 26（`lastSaved` を消し 2 列を足す） | `erd.json` |
| `isDate` の列 | 18 → 17 | 同 |
| 表 T-350 の行 | 0 → 10 | 手で数えた |
| 生成物のうち中身が動いたファイル | スキーマ 1・`src` の生成 7（`schedule-entities.ts`・`grs-json-schema.ts`・`image-to-grs-json-prompt.json`・`display-words.json`・`startup-template.json`・`startup-template-manifest.json`・`empty-document.json`）・試験の生成 1（`measuring-document.json`）・仕様の生成表 3（`fig-erd-detail.md`・`tbl-settings.md`・`tbl-row-id-prefixes.md`）・台帳の生成 1（`test-inventory.md`） | `npm run gen` 後の `git status` |
| `npm run typecheck` の誤り | 0 → 14（`src` 4、`tests` 10 —— どれも消えた `lastSaved` ／ `stackOrder` を書く所）。`tsconfig.entity.json` は 0 → 1（`import-document.ts:166`） | 13 節 |
| 自動試験の失敗（`vitest` フル） | base 4（30118 件）→ 209（29860 件、49 ファイル。ほかに古い形の文書を `stackOrder` で拒んで読み込めない試験ファイル 5）。base の 4 件はそのまま含まれる —— 増えたのはどれもコードの波の持ち分（`DFC-1823`） | 13 節 |
| `check.sh` | base 0 赤 → 当てた木で 0 赤（検査 37 の対に `IV-23` を 1 行足した —— 借りの数ではない） | `GRS_DEV_PORT=5991` |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1（当てた） | `docs/spec/` ＋ 生成器 ＋ 生成物 ＋ 案内 ＋ 台帳 | E-01〜E-15、`npm run gen` | 仕様の波（本書） |
| 2 | `src/`（手で書く所）・`tools/generate_startup_template.py` の残り・見本・`dist/`・`published-entries.json` の公開名 | 14 節の K-1〜K-11 | コードの波 |
| 3 | `tests/` | 15 節 | 仕様だけを読む試験の体（本書の書き手でも、コードの波の書き手でもない） |

⚠️ **毎フレームの経路**: 本書の生成物のうち `src/adapter/screen-renderer/image-to-grs-json-prompt.json` と `display-words.json` が規則 04 の 5 節の `src/adapter/screen-renderer/**` に入る —— `perf-pending.md` に 72 を足した。コードの波は `TaskVisual` が見本ごとに約 960 増え（C-35）、`svg-renderer.ts` ・ `schedule-task-figures.ts` の描く数が変わる —— 主へ早送りする前に性能の関門（`JDG-605`）で測る。

---

## 9. 仕様の外で直すもの

- `docs/guides/schedule-to-grs-json/grs-skeleton.json` —— 版、`lastSaved` を消し 2 列を `null` で足し、暦の例外の `toDate` を `T23:59:00` に（7 か所）。
- `docs/guides/schedule-to-grs-json/prompt-ja.md`・`prompt-en.md` —— 手順 2・7 を刷った原稿の文へ（値は `08:00:00` ／ `17:00:00` を手で写した、`DFC-1796`）。例の日時を側ごとの時刻に、`stackOrder` を外した。検査 75 が照らす。
- `.claude/skills/spec-graph-check/retired.py` —— `AT-62`・`AT-11`・`PF-10`・`N-4`。
- `.claude/skills/spec-graph-check/dictionary-table-pairing.txt` —— `IV-23` の対を 1 行（表の行と辞書の項を読み合わせた。辞書の語は `IV-22` と同じく空）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 時刻を解釈しない（`FR-054` のまま。読むのは日だけ）。暦の稼働時間も使わない（`JDG-1205` の付随する決定）。
- 古い形の `GRS JSON` を読み替えない（表 T-297 に行を足さない、補って読む列も足さない —— `JDG-1206`）。
- 版を 2 度上げない（コードの波は `SCHEMA_VERSION` を動かさない）。
- `textOfDay` の字を変えない —— 毎フレームの `Map` の鍵に使う（14 節 K-1）。
- `previous-project-result/10-agent-interface/samples/grs-document-with-revision-stamp.json` は記録の見本であり作り直さない（`DFC-1799` が名指すもう 1 本）。

---

## 11. 利用者に問うこと

本書からは問わない。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1195`・`JDG-1197`・`JDG-1205`・`JDG-1206`・`JDG-1210` | 形を変える裁定 | 「指示 —— `CR-646` が当てる」。着地先に仕様の ID を名指した。コードの波が当たって「適用済」 |
| `JDG-1209` | 版を上げる | 「適用済」。着地先は `FR-073`・`DR-4` と `tools/generate_startup_template.py` |
| `JDG-1211` | 日時の使い分けの理由をスキーマに | 「適用済」。着地先は Chapter 6.2 の規則と `docs/spec/_source/erd_json_to_schema.py`・`AT-140`・`AT-154` |
| `JDG-1203`・`JDG-1204`・`JDG-1207`・`JDG-1208` | | 状態は変えない（`JDG-1203`・`JDG-1204` は適用済、`JDG-1207` は覆された、`JDG-1208` は `CR-644`）。`JDG-1207` の後半は `EX-11`・`EX-12` に着地 —— `JDG-1210` の行の着地先が持つ |
| `DFC-1799` | 3 年の見本がスキーマに合わない | `仕様待ち` → `実装待ち`（作り直しは 14 節 K-9） |
| `DFC-1823` | 仕様の波だけが当たった木で、`src` と試験が古い形を書く | 起こした（`実装待ち`）。両側を書き、どちらも選ばない |
| `DFC-1824`〜`DFC-1829` | 帯 | 使わなかった |
| `perf-pending.md` の 72 | 本書の生成物 | 1 行足した |
| `docs/development-records/changelog.md` の 3.49 | 本書 | 1 行足した |

---

## 13. 測り方の再現

```
# tree: 1b7ad9ee (BASE). Every file edited here is LF-only; the Japanese
# edits were made by a script that asserts each old string occurs once.
node tools/gate/gate-queue.mjs run -- node ../../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<base.json>
#   -> 30118 tests, 4 failed (cr-586 x2, display-words contract, cr-605)
npm run typecheck                                   # 0 errors on BASE

npm run gen && npm run gen && npm run gen:check     # 0 drift
npm run typecheck                                   # 14 errors (see section 7)
node ../../../node_modules/typescript/bin/tsc -p tsconfig.entity.json --noEmit   # 1 error
node tools/gate/gate-queue.mjs run -- node ../../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<after.json>

grep -rl "stackOrder" tests | wc -l                 # 94 files name the column
grep -rl "lastSaved" tests | wc -l                  # 14
grep -rl "T00:00:00" tests | wc -l                  # 97

PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py EX-7   # and FR-073, ST-6, FR-101, T-224, G-4
```

---

## 14. ⛔ コードの波（実装の体へ）

⭐ 仕様は当たっている。ここに書くのは、仕様のどの ID がどのファイルのどこを動かすかだけである。識別子は下の名をそのまま使う。行番号は `1b7ad9ee` で測った。

### K-1 —— 字を作る関数（`Schedule`、C-17）

| ファイル | 足すもの | 仕様 |
|---|---|---|
| `src/entity/document-model/schedule/calendar-day.ts`（`UF-170`） | `textOfDayStart(day)`（`00:00:00`）・`textOfDayEnd(day)`（`23:59:00`）と、その 2 つの時刻の定数 `DAY_START_TIME`・`DAY_END_TIME` | 表 T-350 の `WT-6`〜`WT-8` |
| `src/entity/document-model/schedule/working-calendar.ts`（`UF-128`） | `defaultStartTimeOf(project)` ／ `defaultFinishTimeOf(project)`（列、空なら `DEFAULT_CALENDAR_VALUES['S-482']` ／ `['S-483']`）、`textOfStartSide(day, project)`、`textOfFinishSide(day, project, milestone)`（`milestone` が真なら開始の時刻） | `WT-1`〜`WT-5`、`AT-154`・`AT-155` |
| `docs/spec/_source/published-entries.json` の 表 T-064 の `PI-1` | 上の公開名 7 つ（`UseCase` と `Adapter` が読む）—— 検査 26b は両向きなので、出す同じコミットで足す | `CR-644` と同じ手順 |

⛔ `textOfDay` は変えない —— 日を表す鍵の字であり、毎フレームの路が `Map` の鍵に使う（`task-figures.ts:668`、`schedule-layout.ts:193`、`frame-loop.ts:1877` の `readToday`）。同じ日の鍵が時刻で割れると、作り置きが毎回外れる。⇒ 読みの側（鍵・メッセージ・`properties-panel.ts:330` の表示）は `textOfDay` のまま。

### K-2 —— 書く所を側ごとの関数へ替える（C-17）

| 側 | 所（`textOfDay` を呼ぶ所） |
|---|---|
| 開始の側（`textOfStartSide`） | `armed-placement.ts:113`、`input-command-translator.ts:1287`、`item-grab.ts:158`・`:412`・`:204`（`resume`）・`:745`（`actualStart`）、`task-paste.ts:43`（`start`）、`task-plan-actual.ts:439`・`:447` |
| 終了の側（`textOfFinishSide`、マイルストーンは開始の時刻） | `armed-placement.ts:114`、`input-command-translator.ts:1288`、`item-grab.ts:101`（`statusDate`）・`:159`・`:203`（`stop`）・`:413`・`:747`、`task-paste.ts:43`（`finish`）、`task-plan-actual.ts:355`・`:440`・`:448`・`:471`、`json-codec.ts:332`（古い版の `stop`）、`mspdi-codec.ts:633`（取り込みの `stop`） |
| 列で決まる（どちらかを列の名で選ぶ） | `field-commit.ts:46`・`:84`（打った欄が `start` 系か `finish` 系か） |
| 丸 1 日 | `armed-placement.ts:159`・`:160` と `item-grab.ts:659`・`:660`（`HighlightBox` の始まり ／ 終わり → `textOfDayStart` ／ `textOfDayEnd`）、`input-command-translator.ts:496`（`anchorDate`）・`:547`（`scrollDate`）、`fit-zoom.ts:201`、`search-jump.ts:84`（`scrollDate`）→ `textOfDayStart`。暦の例外を書く所（`edit-calendar.ts` が作る `fromDate` ／ `toDate`）→ `textOfDayStart` ／ `textOfDayEnd` |
| 命令の荷として日を運ぶだけ | `item-grab.ts:178`・`:386`（`droppedDay`）、`dual-cursor-input.ts:23`・`:38`（画面の状態） —— 荷を受けて文書へ書く側で側を決める |
| MSPDI | `mspdi-codec.ts:1164` と `task-plan-actual.ts:243`（`ConstraintDate` ＝ 書き出す `Start` の字、`EX-11`）、`task-plan-actual.ts:260`・`:261`（`ManualStart` ／ `ManualFinish` ＝ 書き出す `Start` ／ `Finish` と同じ日時、`EX-12`） |
| マイルストーンの切り替え（`WT-5`） | `Task.milestone` を変える所（`edit-task.ts`・`task-appearance.ts` の形の切り替え）で、`finish` ／ `actualFinish` の時刻も書き直す |

⚠️ 取り込んだまま編集していない値は字面を保つ（`WT-10`、`EX-4`）—— 書き直すのは、その命令が動かした列だけである。

### K-3 —— MSPDI の読み書き（C-14・C-23・C-33、`FR-021`・`DV-12`・`NR-7`）

- `src/adapter/document-codec/mspdi-codec.ts`: 読み（`:395`〜`:423`）—— `lastSaved` を消し、`defaultStartTime` ／ `defaultFinishTime` を、字面が `xsd:time` に合えば列へ、合わなければ列を `null` にして `carry` に残す。`PROJECT_CONSUMED`（`:427`）に 2 つを足し、`LastSaved` は消費して捨てる（持ち回らない）。書き（`:891`〜`:922` の `writtenProjectChildren`）—— `LastSaved` は書き出すその瞬間の現地時刻（帯なし、秒まで）を、外から渡す時計で作る（関数は `pure` のまま）。2 列は `optionalLeaf` で、並びは `mspdi-child-order.json`（`CalendarUID` の後、`MinutesPerDay` の前）が決める。
- `mspdi-codec.ts:381`（`taskVisuals: []`）—— 取り込んだ `Task` ごとに、`taskUid` のほかがすべて `null` の `TaskVisual` を 1 つ組む（C-22、`IV-23`）。
- `src/adapter/document-codec/mspdi-imported-rows.ts:49` —— `stackOrder` を書かない。

### K-4 —— 編集と取り込み（C-22・C-25）

- `src/use-case/edit-document/task-create.ts:90` —— `stackOrder` を書かない。
- `src/use-case/import-document/import-document.ts:166` —— `PF-10` の行を消す。`:783`（`visuals.delete(uid)`）—— 合流の後もどの `Task` にも 1 つ残す（無ければすべて `null` の 1 つ）。
- 新しく始める文書（`BK-4`）を組む所 —— `created` に始めた瞬間（現地時刻、帯なし、秒まで）を外から渡す時計で書く。2 列は `null`。

### K-5 —— 日で比べる（C-34、`FR-054` の新しい段）

`dayOf` と `compareDays` で比べる所へ替える: `src/adapter/screen-renderer/delay-diagnostics-report.ts:181`（`plannedStart === plannedFinish`）、`src/use-case/edit-document/edit-annotation.ts:222`（`anchorDate ===`）・`:293`〜`:294`（`startDate` ／ `endDate ===`）、`src/use-case/edit-document/edit-calendar.ts:135`〜`:136`（`fromDate` ／ `toDate ===`。レビューの 155〜156 行は `1b7ad9ee` で 135〜136 に動いていた）。

### K-6 —— `IV-23` を守らせ、代わりの描き方を消す（C-22・C-28）

- `src/entity/document-model/schedule/schedule-invariants.ts` に `IV-23` を足す（`IV-6` と同じ形。読み込みで拒む理由は `IV-23`、`NT-1`）。
- その後で、`TaskVisual` が無いときの代わりの描き方を消す —— `taskVisuals` を読む手書きの 14 ファイル（`mspdi-codec.ts`・`field-commit.ts`・`properties-panel.ts`・`screen-renderer.ts`・`schedule-task-figures.ts`・`svg-renderer.ts`・`schedule-invariants.ts`・`schedule-layout.ts`・`edit-task-group.ts`・`edit-task.ts`・`task-appearance.ts`・`task-create.ts`・`task-paste.ts`・`import-document.ts`）のうち、`undefined` の枝を持つ所。⚠️ `svg-renderer.ts:470`・`schedule-task-figures.ts:539` は毎フレームの路。

### K-7 —— 版

⛔ 触らない。`SCHEMA_VERSION` は本書で `2026-10-03` になった（`tools/generate_startup_template.py:144`、`startup-template-manifest.json` へ刷られ、スキーマの `const` も同じ所から読む）。

### K-8 —— 起動時の見本の生成器（C-18、`tools/generate_startup_template.py`）

- `text_of`（`:1200`）を側ごとに分ける（`WT-1`〜`WT-8` —— 開始の側・終了の側・マイルストーン・暦の例外・注記の箱・`scrollDate`）。
- 見本のタスク 1000 のうち 963 が `TaskVisual` を持たない —— どの `Task` にも 1 つ（`IV-23`）。自前の確かめに `IV-23` を足す。
- `npm run gen` が `startup-template.json`・`empty-document.json`・`startup-template-manifest.json`・`tests/fixtures/measuring-document.json` を作り直す。

### K-9 —— 3 年の見本（C-18、`DFC-1799` を閉じる）

- `sample-schedule/Three-Year Product Plan.json` には生成器が無い。⇒ 作り直しは、scratchpad に置く 1 回限りの台本（コミットしない）か、出荷ビルドで開いて書き出し直すこと。中身: `stackOrder` を消す、`lastSaved` を消す、2 列を `null` で足す、`TaskVisual` をどの `Task` にも 1 つ、日時を 表 T-350 の時刻に、版を `2026-10-03` に。
- 終わりの確かめ: 刊行するスキーマ（Draft 2020-12）で 0 件、`IV-23` が立つ、本体で開ける。

### K-10 —— 性能（C-35）

`TaskVisual` が見本ごとに約 960 増える。主へ早送りする前に性能の関門（`JDG-605`、`GRS_PERF=1`）で測り、毎フレームの路が描く数の差を報告する。`perf-pending.md` にコードの波の行を足す（検査 66）。

### K-11 —— 出荷

`dist/index.html` を作り直す（起動時の見本と版が埋め込まれる）。

### K-12 —— 古い形を書く試験

`npm run typecheck` の 10 の誤り（`tests/` が `lastSaved` ／ `stackOrder` を書く）と、`vitest` の失敗（`DFC-1823`）は、古い形の文書を組む試験である —— 形を直すのはコードの波（試験の言う内容は変えない）。名指しの上限: `stackOrder` 94 ファイル、`lastSaved` 14、`T00:00:00` 97。

---

## 15. 試験の波（仕様だけを読む試験の体へ）

⭐ 読むのは `docs/spec/` だけ。新しい印を逐語で引き、刷られたスキーマ・照合の表・本体の路で確かめる。

| # | 確かめる仕様 | 入力と期待 |
|---|---|---|
| X-1 | 表 T-350 の `WT-1`〜`WT-5`、`AT-154`・`AT-155`、`S-482`・`S-483` | 2 列が `null` の文書でタスクを作る・動かす・実績を置く → `start`・`actualStart`・`resume` は `T08:00:00`、`finish`・`actualFinish`・`stop`・`deadline`・`statusDate` は `T17:00:00`。`defaultStartTime: '09:00:00'` なら `T09:00:00`。マイルストーンは両端 `T08:00:00` |
| X-2 | `WT-6`〜`WT-8` | ハイライトボックスを置く → `startDate` `T00:00:00`、`endDate` `T23:59:00`。コメントボックスの `anchorDate` と `scrollDate` は `T00:00:00`。暦の例外は `fromDate` `T00:00:00`、`toDate` `T23:59:00` |
| X-3 | `WT-10`・`EX-4` | 取り込んだ `T16:30:00` の `finish` は、そのタスクの `start` だけを動かしても `T16:30:00` のまま |
| X-4 | `FR-054` の日で比べる段 | 同じ日で時刻だけ違う `anchorDate` を置き直す命令は、変化なしとして扱われる。開始 `T08:00:00`・終了 `T17:00:00` の同じ日のタスクは 1 日のタスクとして数えられる |
| X-5 | `EX-11`・`EX-12` | 書き出した `ConstraintDate` が同じタスクの `Start` の字と等しい。`ManualStart` ／ `ManualFinish` が `Start` ／ `Finish` と同じ日時を取り込んだ綴りで持つ |
| X-6 | `DV-12`・`NR-7`・`FR-101` | 書き出した `LastSaved` が書き出した瞬間の現地時刻（帯なし、秒まで）。文書に `lastSaved` が無い。往復の比べで `LastSaved` だけが外れる |
| X-7 | `FR-021`（既定の時刻の 2 列） | `DefaultStartTime` を持つ MSPDI を読む → 列に入り `carry` に無い。書き出すと `CalendarUID` の後に 1 度だけ。字面が `8:00` の値は `carry` に残り列は `null` |
| X-8 | Chapter 6.1 の前文・`AT-154` | `defaultStartTime: '8:00'` の `GRS JSON` は文書ごと拒まれる（`RS-25`）。`'08:00:00'` は通る |
| X-9 | `IV-23` | `TaskVisual` を欠く `Task` を持つ `GRS JSON` は拒まれ、理由は `IV-23`。MSPDI を読んだ文書はどの `Task` にも 1 つ持つ。合流の後も 1 つ |
| X-10 | `FR-073` の新しい段・表 T-297 の下・`JDG-1206` | `stackOrder` を持つ文書と `lastSaved` を持つ文書は拒まれる（読み替えない）。スキーマの `schemaVersion` の `const` が `startup-template-manifest.json` の版と等しい |
| X-11 | `BK-4` | 新しく始めた文書の `created` が始めた瞬間（帯なし、秒まで）、2 列は `null` |
| X-12 | 表 T-224・`ST-6` | 文書の基本情報の面が出す行は `PF-1`〜`PF-9`。`TaskGroupMember` は `taskUid` と `groupId` だけを持つ |
| X-13 | Chapter 6.2 の新しい規則 | 刷られたスキーマの根の説明が開始の側・終了の側・丸 1 日・UTC の理由を言う。`documentSettings.stackDirection` が説明を持つ。2 列の説明が `S-482` ／ `S-483` の値を持ち、手で写していない（値を変えれば説明も変わる） |
