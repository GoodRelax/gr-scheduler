# CR-702 —— `GRS` が書くマイルストーンの日時は開始も終了も終業の時刻とし、フェードの 2 つの枠の項目名（`Alias`）は列の名とする

> 起草の状態: 当てた（2026-10-08、作業木 `4e5547e8` の上）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-702` は調整役から受けた（13 節で、当てる前の木で `CR-702` を名乗るものが無いことを測った）。仕様の新しい識別子（行 ID・表・図・設定値の行・接頭辞）は取らない。欠陥の行は起こさない（帯 `DFC-2245`〜`DFC-2249` は使わなかった）。
> 当てる裁定: `JDG-1621`（問 22。`JDG-1205` を一部覆す）・`JDG-1625`（問 26）。加えて、調整役が利用者の常の指示のもとで決め、`JDG-1698` として並行して記録している決定 —— 終業の規則は MSPDI から取り込んだ文書に限らず `GRS` が書くすべての文書に効き、マイルストーンの開始と終了はどちらも既定の終了時刻とする。
> 閉じるもの: 表 T-350 の `WT-5`（マイルストーンを始業の時刻で書く）が、取り込んだ MSPDI で先行の終わる日へ引いたマイルストーンを先行の終了より前の時刻に置き、表 T-310 の `VC-15` の時刻の比べで矛盾（紫）にすること。`_source/mspdi-custom-fields.json` の 2 つの `alias` が空で、出荷版がフェードを MSPDI へ書き出せず、読み戻せないこと。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `rulings.md` の該当行）

| 裁定 | 逐語（要所） | 本書での扱い |
|---|---|---|
| `JDG-1621` | 「いや、アトサキは重要。 MSPDIとGRSで始業・終了時間を合わせたらいいのでは？ 意見くれたし。」／「節目は終業の時刻で書く (Recommended)」 | 表 T-350 の `WT-5` を、マイルストーンの開始の側の列を既定の終了時刻で書く行に替える（E-01）。普通のタスクの開始は既定の開始時刻のまま。`VC-15` は変えない |
| `JDG-1698` | 調整役の決定（利用者の常の指示のもと） | 規則は MSPDI から取り込んだ文書に限らない —— `WT-5` の根拠の欄にそう書く（E-01）。`JDG-1621` の読みの「MSPDI から取り込んだ文書で」を広げる |
| `JDG-1625` | 「MSPDIのXMLのスキーム上、エイリアスを認められているのか？ であれば、 fadeIn / fadeOut のように GRSの名前を消すのと キャメルとかスネークとかの書き方は他の識別子に合わせろ。」／「fadeInDays / fadeOutDays (Recommended)」 | 2 つの `alias` を `fadeInDays` / `fadeOutDays` にし（E-03）、`EX-6` に「名簿の `Alias` は、その枠が運ぶ列の名とすること（MUST）」を足す（E-02） |

⭐ 同じ・似た主題の裁定を `rulings.md` で引いた（「マイルストーン」「節目」と「時刻」、「Alias」「エイリアス」、「フェード」と「枠」「独自」）。
- `JDG-1205`（2026-10-03。GRS が書く日時の時刻。「マイルストーン（開始＝終了）は既定の開始時刻」）—— `JDG-1621` が一部覆した（印は `rulings.md` に既に在る）。ほかの列の時刻は変えない。`JDG-1698` が規則を全文書へ広げたことは、`JDG-1205` の状態の欄には書いていない —— 本書の持ち場の外の行なので、調整役が `JDG-1698` を記録するときに足すか決める。
- `JDG-1191`・`JDG-1200`（日時の形）—— 食い違わない。形は変えず、値の時刻だけが変わる。
- `JDG-1042`（MSPDI から取り込んだ文書は時刻で比べる、`VC-15`）—— 変えない。終業の時刻で書いたマイルストーンが、先行の終了と同じ時刻になり反しない。
- `JDG-1222`（`Duration` は終わりの日を含めて数え、マイルストーンは `PT0H0M0S`）—— 食い違わない。開始と終了が同じ瞬間のままである。
- `JDG-151`・`JDG-179`・`JDG-191`・`JDG-1622`（フェードの掴みと描き方）—— 枠の名とは別の主題。
- 項目名（`Alias`）を決めた裁定は、`JDG-1625` の前に無い（`rulings.md` を `Alias` で引いて `JDG-1625` の 1 件）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- **`GL-004`**（日程を機械が読める構造化データとして出し入れし、情報を落とさずに往復できる） —— フェードの日数が MSPDI を往復できるようになる（今は `alias` が空なので書き出しで落ち、読み戻せない）。マイルストーンの時刻が、MS Project が FS の後の節目に置く時刻と同じになり、交換相手と `GRS` で同じ瞬間を指す。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（唯一の正）** —— 枠の項目名の正は `_source/mspdi-custom-fields.json` の名簿である（`05-07-design.md` の 6.2 節）。⇒ 仕様（`EX-6`）は「列の名とする」という規則だけを持ち、字は列の名（`AT-40` ／ `AT-41`）を指す。名簿と規則がずれないよう、生成器が列の名と違う `alias` を拒む（機械の検査、E-04）。
- **`R2.14`（POLA）** —— マイルストーンの開始が 8:00、終了が 8:00 だと、先行の 17:00 の終わりより前に節目が来る。⇒ 終業の時刻に揃える。`Project.startDate` はマイルストーンではないので例外に入れない。
- **`R2.21`（1 つの仕事は 1 か所）** —— 時刻を選ぶのは `textOfStartSide` ／ `textOfFinishSide` の 2 つだけのまま。マイルストーンかどうかで時刻が変わるのは、終了の側から開始の側へ移る（E-05）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | `WT-5` が及ぶ列を「マイルストーンの開始の側の列（`WT-1`・`WT-3` の例外）」とする —— `Task.start`・`BaselineTask.start`・`Task.actualStart`・`Task.resume` | `JDG-1698` の「開始と終了はどちらも既定の終了時刻」。コードはマイルストーンの実績の開始と終了を同じ値で書く（`field-commit.ts` の `commandFromMilestoneDay`、表 T-021a の `PA-5`）ので、実績の開始だけを始業に残すと、同じ値で書く 2 列が食い違う | マイルストーンの `resume` は使われないが、開始の側の列として同じ規則に乗る |
| X-2 | 終了の側の列は、マイルストーンでも `WT-2` ／ `WT-4` のとおり既定の終了時刻 —— 例外の行を要しない | 新しい規則では、終了の側がマイルストーンかどうかで変わらない | 無い |
| X-3 | `EX-6` の足す文に（MUST）を付ける | 生成器が拒むので、守られる規則である。仕様は「列の名」と言い、字そのもの（番号と同じく原稿が持つ）は写さない | `（MUST）` の印 +1 |
| X-4 | 起動テンプレート（`tools/generate_startup_template.py`）も同じ規則で刷り直す | 出荷する雛形は `GRS` が書く文書である（`JDG-1698`） | テンプレートのマイルストーンの時刻 34 か所が 8:00 から 17:00 に変わる |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| マイルストーンの開始の側の列を既定の終了時刻で書く | `docs/spec/01-04-requirements.md` の 表 T-350 の `WT-5` | E-01 |
| 名簿の `Alias` は枠が運ぶ列の名 | 同じファイルの 表 T-033 の `EX-6` | E-02 |
| 2 つの `alias` を埋め、注を直す | `docs/spec/_source/mspdi-custom-fields.json`・`docs/spec/_source/mspdi-custom-fields.schema.json` の `alias` の説明 | E-03 |
| 生成器が列の名と違う `alias` を拒む | `tools/generate_mspdi_custom_fields.py` | E-04 |
| 公開の入口の注（`textOfStartSide` ／ `textOfFinishSide`） | `docs/spec/_source/published-entries.json`（表 T-064 の `PI-1` を刷る） | E-05 |
| `GRS JSON` のスキーマの根の説明 | `docs/spec/_source/erd_json_to_schema.py` の `ROOT_DESCRIPTION` | E-06 |
| 変更履歴 | `docs/development-records/changelog.md` に版 4.02 の 1 行 | E-07 |
| 裁定の状態 | `docs/development-records/rulings.md` の `JDG-1621`・`JDG-1625` の着地先と状態の欄 | E-08 |
| `VC-15`・`EX-8`・`FR-054`・`WT-1`〜`WT-4`・`WT-6`〜`WT-10` | 変えない | — |

**数**: 表の増減 0。表の行の増減 0（`WT-5`・`EX-6` はセルだけ）。要求 ID の増減 0。図 0。`（MUST）` の印 +1（`EX-6`）、`（MUST NOT）` 0。

---

## 2. 新しい識別子

取らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| # | 消すもの（`4e5547e8`） | 置き換わる先 |
|---|---|---|
| 1 | `WT-5` の列の欄「マイルストーン（…が真）の終了の側の列」 | 「マイルストーン（…が真）の開始の側の列 —— `WT-1` ・ `WT-3` の例外（`Project.startDate` はマイルストーンではない）」 |
| 2 | `WT-5` の時刻の欄「既定の開始時刻 —— 開始と終了が同じ瞬間になる」 | 「既定の終了時刻 —— 終了の側（`WT-2` ・ `WT-4`）と同じ時刻になり、開始と終了が同じ瞬間になる」 |
| 3 | `WT-5` の根拠の欄「`GRS` の選択 —— マイルストーンの日付は開始日として入れる（`WT-1` の出典）」 | 「`GRS` の選択 —— マイルストーンは、その日の仕事が終わった時に置く。…すべての文書で同じである」 |
| 4 | `mspdi-custom-fields.json` の `"alias": ""` 2 つと `aliasNote` の「EVERY alias IS EMPTY ON PURPOSE. … Until the user fills it, GRS cannot recognise its own frame and must not claim one.」 | `"alias": "fadeInDays"` ／ `"fadeOutDays"`、注は「EVERY alias IS THE NAME OF THE COLUMN ITS FRAME CARRIES …」 |
| 5 | スキーマの `alias` の説明「empty until the user chooses the word」 | 「the name of the column the frame carries, the same word as prefers」 |
| 6 | 生成器の docstring「The alias of each frame is empty until the user fills it, … A machine-written alias would settle all three at once.」 | 「The alias of each frame is the manuscript's, and EX-6 makes it the name of the column the frame carries … This script refuses an alias that is not its frame's column.」 |
| 7 | 公開の入口 `textOfFinishSide` の注の 2 行目「マイルストーンは開始の時刻（表 T-350 の `WT-2`・`WT-4`・`WT-5`）」 | `textOfStartSide` の注の 2 行目「マイルストーンは終了の時刻（表 T-350 の `WT-1`・`WT-3`・`WT-5`）」 |
| 8 | スキーマの根の説明「a milestone takes the start time at both ends」 | 「a milestone takes the finish time at both ends」 |

---

## 4. 書き直す所

⛔ **作法**: 置き換える前に、旧がそのファイルに 1 回だけ現れることを数えた（13 節。どれも 1 回）。どのファイルも `4e5547e8` で LF（CRLF は 0）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
表 T-350 の `WT-5` の行を置き換える。 旧
```text
| WT-5 | マイルストーン（`Task.milestone` ・ `BaselineTask.milestone` が真）の終了の側の列 | 既定の開始時刻 —— 開始と終了が同じ瞬間になる | `GRS` の選択 —— マイルストーンの日付は開始日として入れる（`WT-1` の出典） |
```
新
```text
| WT-5 | マイルストーン（`Task.milestone` ・ `BaselineTask.milestone` が真）の開始の側の列 —— `WT-1` ・ `WT-3` の例外（`Project.startDate` はマイルストーンではない） | 既定の終了時刻 —— 終了の側（`WT-2` ・ `WT-4`）と同じ時刻になり、開始と終了が同じ瞬間になる | `GRS` の選択 —— マイルストーンは、その日の仕事が終わった時に置く。<br>先行の終わる日に置いたマイルストーンが先行の終了（`WT-2`）と同じ時刻になり、時刻で比べても依存の向きに反しない（表 T-310 の `VC-15`）。<br>⭐ MSPDI から取り込んだ文書に限らず、`GRS` が書くすべての文書で同じである |
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
表 T-033 の `EX-6` のセルの中の句（`partial`）の後ろに 1 文を足す。 旧
```text
⭐ 取込元が使っているかどうかは、定義の側の `Alias` が名簿のものと一致するかで見分けること（MUST） —— **値の側は番号しか持たない**（`mspdi_pj12.xsd:2254`）。<br>
```
新
```text
⭐ 取込元が使っているかどうかは、定義の側の `Alias` が名簿のものと一致するかで見分けること（MUST） —— **値の側は番号しか持たない**（`mspdi_pj12.xsd:2254`）。<br>⭐ 名簿の `Alias` は、その枠が運ぶ列の名（`_assets/fig-erd-detail.md` の `AT-40` ／ `AT-41`）とすること（MUST） —— 交換相手の道具では列の見出しに出るので、製品の名を前に付けず、ほかの識別子と同じく camelCase で綴る（表 T-006a の `W-2`）。<br>
```

<!-- EDIT id=E-03 file=docs/spec/_source/mspdi-custom-fields.json -->
`frames` の 2 つの `alias` を `"fadeInDays"` ／ `"fadeOutDays"` にし、`aliasNote` を次に置き換える。`docs/spec/_source/mspdi-custom-fields.schema.json` の `alias` の `description` の 1 文目も 3 節の 5 のとおり置き換える。
```text
EVERY alias IS THE NAME OF THE COLUMN ITS FRAME CARRIES (the frame's prefers, a column of table T-058), spelt in camelCase like every other identifier and with no product name in front (EX-6). It is written into the partner's file and shows as a column heading in the partner's tool, and it is also the key EX-6 uses to tell a frame GRS wrote from a frame the import source wrote, and to read the fade back. It is NOT a word the screen prints, so it is not in display-words.json and MUST NOT be translated. tools/generate_mspdi_custom_fields.py refuses an alias that is not its frame's prefers.
```

<!-- EDIT id=E-04 file=tools/generate_mspdi_custom_fields.py -->
`build` の長さの検査の後ろに、`frame['alias'] != frame['prefers']` の枠を `PROBLEM` として拒む検査を足し、docstring の「NO VALUE IS INVENTED HERE」の段を 3 節の 6 のとおり直す。`npm run gen` が `src/adapter/document-codec/mspdi-custom-fields.json` を刷る。

<!-- EDIT id=E-05 file=docs/spec/_source/published-entries.json -->
`textOfStartSide` の注を「開始の側の列へ書く日時の字。」「マイルストーンは終了の時刻（表 T-350 の `WT-1`・`WT-3`・`WT-5`）」の 2 行に、`textOfFinishSide` の注を「終了の側の列へ書く日時の字（表 T-350 の `WT-2`・`WT-4`）」の 1 行にする。`npm run gen` が `_assets/tbl-published-entries.md` と `docs/review/public-entry-index.md` を刷る。

<!-- EDIT id=E-06 file=docs/spec/_source/erd_json_to_schema.py -->
`ROOT_DESCRIPTION` の「(a milestone takes the start time at both ends)」を「(a milestone takes the finish time at both ends)」にする。`npm run gen` が `_source/grs-document.schema.json` と `src/adapter/screen-renderer/image-to-grs-json-prompt.json` を刷る。

<!-- EDIT id=E-07 file=docs/development-records/changelog.md -->
表の末尾に版 4.02 の 1 行を足す（当てる前の末の行は 4.01。並行する組と重なれば、統合のときに調整役が振り直す）。

<!-- EDIT id=E-08 file=docs/development-records/rulings.md -->
`JDG-1621` と `JDG-1625` の着地先の欄の末に「⭐ 2026-10-08 に着地: 本書（…）」を足し、状態の欄を「適用済 —— 本書が当てた（2026-10-08）。⚠️ 旧の状態: 指示 —— 調整役が当てる」にする。逐語と読みは変えない。`JDG-1205`・`JDG-1698` の行は触らない。

---

## 5. 継ぎ目

```
SEAM (CR-702)
- src/entity/document-model/schedule/working-calendar.ts:
    textOfStartSide(day, project, milestone: boolean)  -- milestone -> defaultFinishTimeOf(project), else defaultStartTimeOf
    textOfFinishSide(day, project)                     -- always defaultFinishTimeOf(project); the milestone flag is gone
  Every caller that writes start / actualStart / resume of a Task passes task.milestone === true
  (armed-placement, field-commit, input-command-translator alignWrites, item-grab, task-paste,
  task-plan-actual). Project.startDate is never a milestone. tsc refuses a caller with the old arity.
- tools/generate_startup_template.py mirrors the same two functions; the template's milestones now
  read start = finish = <day>T17:00:00 (S-483, the template leaves defaultFinishTime null).
- src/adapter/document-codec/mspdi-custom-fields.json (generated): alias = "fadeInDays" / "fadeOutDays".
  mspdi-fade-frames.ts is unchanged: it already writes the roster's alias into the definition and
  claims a frame on import only when the definition's Alias equals it (EX-6).
```

---

## 6. グラフ（`4e5547e8`）

| 対象 | 届く先 | 読んだ結果 |
|---|---|---|
| `WT-5` | 指される: 要求 0 件 / 参照 1 か所（`tbl-published-entries.md` の `PI-1`、`textOfFinishSide` の注） | 注を E-05 で直す |
| `EX-6` | 指される: 要求 1 件 / 参照 6 か所（`FR-057`、`05-07-design.md` の `UT-17`・`UF-36`・`UF-155`・6.2 節、`tbl-property-items.md` の `PR-14`） | どれも「枠の選び方は `EX-6`」「`Alias` で名乗った枠だけを取る」「番号と `Alias` と型はこの原稿が持つ」と言うだけで、`Alias` の字を言わない ⇒ 変えない |
| `VC-15` | `WT-5` の根拠が指す | 比べ方は変えない。終業で書いたマイルストーンは先行の終了と同じ時刻になり反しない |

- 試験の名と主張を数えた: `grep -rln "textOfStartSide\|textOfFinishSide" tests` は 3 件（`cr-646-side-time-writers.test.ts`・`cr-646-mspdi-times-and-last-saved.test.ts`・`cr-646-stage.ts`）。旧の振る舞いを言う試験は、ほかに `cr-646-edits-write-side-times.test.ts` の 3 件と `dfc-572-pv-1-pv-2-actual-finish-is-the-finish-day.test.ts` の 1 件。どれも新しい `WT-5` に合わせて直した（9 節）。
- `uf-36.test.ts` の枠の試験は、`alias` が空か否かで期待を分けて書かれていて、`alias` を埋めると埋まった側の期待へ動く（直さない）。

---

## 7. 数の予測と実測

| 数 | 予測 | 実測（当てた後） |
|---|---|---|
| 表 | 0 | 0 |
| 表の行 | 0 | 0 |
| 要求 ID・図・設定値の行 | 0 | 0 |
| `（MUST）` の印 | +1 | +1 |
| `（MUST NOT）` の印 | 0 | 0 |
| `01-04-requirements.md` の行 | 0（2 行のセルの中） | 0 |
| 起動テンプレートのマイルストーンの時刻 | 8:00 → 17:00 | 34 行 |

---

## 8. 波

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | 仕様の原稿・生成物・台帳 | E-01〜E-08 |
| 2 | `src/`（手で直す 9 ファイル、刷り直す 3 ファイル）・`tools/generate_startup_template.py`・旧の振る舞いを言う試験 5 ファイル | 5 節の継ぎ目 |

- ⭐ **毎フレームの経路: いいえ。** 変わるのは編集を確かめたときに書く日時の字と、書き出し・取り込みの枠の名だけである。

---

## 9. 仕様の外で直すもの

- 旧の振る舞いを言う試験（実装した体が、新しい条文を指して直した）: `tests/unit/cr-646-side-time-writers.test.ts`（`WT-5` の 2 件と EX-7 の並び）・`tests/unit/cr-646-edits-write-side-times.test.ts`（GO-11 の 2 件、GO-8 の 1 件）・`tests/unit/cr-646-mspdi-times-and-last-saved.test.ts`（引数の数）・`tests/contract/dfc-572-pv-1-pv-2-actual-finish-is-the-finish-day.test.ts`（マイルストーンの `actualStart`）。
- 新しい条文（`WT-5` の新しい形、`EX-6` の足した文）を仕様だけから確かめる試験は、別の体が書く。

---

## 10. ⛔ この変更でやらないこと

- `VC-15` の比べ方（取り込んだ文書は時刻、ほかは日）を変えない。普通のタスクの開始は既定の開始時刻のまま —— 先行の終わる日に始めれば矛盾（紫）のままとする（`JDG-1621`）。
- 取り込んだまま編集していない値の時刻を書き換えない（`WT-10`）。既に保存された `GRS JSON` のマイルストーンを読み替えない（`JDG-1206`）。
- 形式の版（`schemaVersion`）を上げない —— 文書の形は変わらない。スキーマの根の説明の字だけが変わる。
- `EX-8`・`mspdi-fade-frames.ts` を変えない —— 名簿の `alias` を読むだけで動く。
- `JDG-1205` と `JDG-1698` の行を書き換えない。

---

## 11. 利用者に問うこと

無い。

---

## 12. 台帳

| 行 | 本書での扱い |
|---|---|
| `JDG-1621` | 「指示 —— 調整役が当てる」→「適用済 —— 本書が当てた」（E-08）。着地先に `WT-5` を足した |
| `JDG-1625` | 同上。着地先に `EX-6` の足した文と生成器の検査を足した |
| `JDG-1698` | 調整役が記録し、状態を決める（本書は触らない） |
| `JDG-1205` | `JDG-1621` が一部覆した印は既に在る。本書は書き換えない |
| 欠陥・保留の行 | 起こさない |

---

## 13. 測り方の再現

```
git rev-parse --short HEAD                                   # -> 4e5547e8 (before this change)

# the number is unused (measured 2026-10-08, 4e5547e8)
git grep -l "CR-702"                                         # -> nothing

# each old text occurs once (E-01, E-02, E-05, E-06)
grep -c "の終了の側の列 | 既定の開始時刻" docs/spec/01-04-requirements.md                 # -> 1
grep -c "値の側は番号しか持たない\*\*（\`mspdi_pj12.xsd:2254\`）。<br>" docs/spec/01-04-requirements.md   # -> 1
grep -c "マイルストーンは開始の時刻" docs/spec/_source/published-entries.json             # -> 1
grep -c "takes the start time at both ends" docs/spec/_source/erd_json_to_schema.py      # -> 1

# the last changelog row before this one (E-07)
tail -1 docs/development-records/changelog.md | cut -c1-8   # -> | 4.01 |

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py WT-5
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py EX-6
grep -rln "textOfStartSide\|textOfFinishSide" tests          # -> 3 files

# the template's milestone times (section 7)
git diff --stat -- src/framework/single-html-shell/startup-template.json   # -> 68 lines (34 + 34)
```
