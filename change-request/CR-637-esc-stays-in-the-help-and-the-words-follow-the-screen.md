# CR-637 — `Esc` をヘルプの基本操作に残し、語を画面の「担当者名簿」「休日の設定」と Add／Delete／Apply に揃える

> 起草の状態: 当てた（2026-10-03、調整役の統合点 `5e34d55f` から早送りした作業木）。起草と当てを同じコミットで行った。4 節の旧はどれも当てる木で 1 回だった（13 節）。
> ID の帯: 番号 `CR-637` は調整役から受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。台帳の行は調整役の帯 `DFC-1712`〜`DFC-1719` から `DFC-1712` を 1 つ使う（12 節）。
> 当てる順: `CR-638`・`CR-639` より先（同じ作業木で順に当てる。触る行は重ならない）。
> 閉じるもの: `JDG-1180`・`JDG-1181`・`JDG-1182` の仕様の側（`CR-635` の 11 節の問い 1〜3）。コードの側は `DFC-1712` が持つ（9 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（`docs/development-records/rulings.md` の行。長いものは要るところだけを写した）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1180` | 「基本操作に置く (Recommended)」（問い「`Esc`（`SK-8`）をヘルプに残しますか？」への答え） | `FR-036` に 1 文 —— 入口の項目が段に載らない割当は、入口を持たない割当と同じ塊（基本操作）に置く（E-01）。生成器 `tools/generate_help_roster.py` を合わせた（9 節） |
| `JDG-1181` | 「記号ではわからない。 絵を見せろ。」 ／ 「絵のとおり (Recommended)」 | `IC-133` の hint「当てるまで」→「適用するまで」、`RS-46` の text「行を足せません」→「行を追加できません」、`MK-6` の text「選択に足す」→「選択に追加する」、`IC-96` の hint「足した側」→「追加した側」（E-07）。`IC-44`・`IC-41`・`RS-54` は変えない |
| `JDG-1182` | 「日英とも揃える (Recommended)」（示した推奨: `U-49` 担当者名簿 ／ `Resource Roster`（英語は今のまま）、`U-65` 休日の設定 ／ `Holiday Settings`（`IC-132` と面の題も）） | `U-49` の日本語名を「担当者名簿」、`U-65` を「休日の設定」 ／ `Holiday Settings` にする（E-05）。`IC-132` の label と面の題の英語を `Holiday Settings` にする（E-07）。仕様の文が「名簿」（`U-49` の意味）・「暦の編集面」と書く所を数えて揃えた（E-02・E-03・E-04・E-06。数は 7 節） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— `Esc` は閉じるだけでなく、ドラッグの中断・構えを解く・選択を解く（表 T-028 の `IN-4`）にも効く。これはこのツールで覚えることであり、`CR-635` が `IC-52` と一緒にヘルプから外したままでは、1 画面で見渡す道（`FR-036` の RATIONALE）から抜ける。⭐ 用語集・仕様の文・画面の語が同じ面を同じ名で呼べば、ヘルプと画面と仕様を行き来する人が迷わない。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— ① 足す文は「入口の項目の割当の場所に置くこと（MUST）」の例外である。⇒ 文の中で「上の…に代えて」と名指し、2 つの MUST が同じ割当に別の場所を求めないようにした（E-01）。② `CR-635` が書いた「`SK-8` は…ヘルプに出ない」は偽になる。⇒ 同じ行を書き直した（E-01）。③ `U-65` の確定名を `Holiday Settings` にすると、`Calendar Editor` と書く所が 1 つでも残れば同じ面が 2 つの名を持つ。⇒ 仕様の 12 か所と、面の名を鍵に持つ原稿（`display-words.json` の `surfaces`）と生成器（`LEFT_OUT_SURFACES`）を同じ回で書いた（E-02・E-05・E-07・9 節）。
- **`R1.4`（境界・空の場合）** —— 入口の項目が段に載らない割当が 表 T-036 と 表 T-023 にいくつ在るかを測った（13 節）: `SK-8` の 1 つだけ（`MK-3`・`MK-4` の入口 `IC-12`〜`IC-15` は段に載る）。生成器は 2 つの表のどちらにも同じ規則を当てる。入口が 表 T-109 に無い行は、今までどおり止まる（黙って基本操作へ入らない）。
- **`R2.9`（YAGNI）** —— 新しい塊を立てない。`Esc` は既にある基本操作の塊に入る（利用者の択）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **`U-65` の確定名（英）を `Holiday Settings` にし、仕様の `Calendar Editor` をすべて書き換える** | `JDG-1182` の読みの欄「英語は `U-65`・`IC-132` の label・面の題を `Holiday Settings` にする」。`U-49` の英語 `Resource Roster` は確定名と面の題が同じ語である —— 同じ形にそろえる | 面の名（`data-role` ほか）が変わる。⚠️ `src` の手書きのコードには `Calendar Editor` の綴りが無い（13 節で測った。面はまだ描かれていない、`DFC-1671`） |
| 決定 2 | **「名簿」は `U-49` を指すものだけを「担当者名簿」にする** —— 22 か所。アイコンの名簿（表 T-109）・枠の名簿（`mspdi-custom-fields.json`）・サーバーの名簿ほか、別の物を指す 19 か所は変えない | `JDG-1182` は `U-49` の名を揃える裁定である。別の物を指す「名簿」を変えると、用語集に無い物に `U-49` の名が付く | 同じ「名簿」の字が別の物も指し続ける |
| 決定 3 | **「暦の編集面」は 4 か所とも「休日の設定」にする**（表 T-344 の題・`U-65` の日本語名・`IC-132` の `何の入口か`・接頭辞 `WC` の日本語の説明）。`FR-088` の「暦の編集は」（行いの名）は変えない | 面の名だけを揃える | 無い |
| 決定 4 | **表 T-109 の `何の入口か` の欄（`IC-62`・`IC-132`）も揃える** | `CR-635` の決定 8 は欄を変えなかったが、`JDG-1182` は仕様の文の「名簿」「暦の編集面」も揃えると言う | 無い |
| 決定 5 | **`SK-8` の語は ja「取り消す・閉じる」、en「Cancel or close」** | ヘルプは行 ID で辞書の語を引く（`FR-038`）。表 T-036 の `SK-8` の `機能` の欄「取り消す / 閉じる」をそのまま語にした（`SK-3` の語が同表の欄と同じであるのと同じ形） | 語は辞書の原稿だけが持つ —— 利用者が後で選び直せる |
| 決定 6 | **語の生成器は、表 T-036 のどの行に語が要るかを、生成したヘルプの名簿から読む** | `tools/generate_display_words.py` が段に載らない入口の規則を写して持つと、規則が 2 か所になる。読むのは行 ID だけで、`npm run gen` はヘルプの名簿を先に作る（`tbl-property-items.md` を読むのと同じ一方向） | ヘルプの名簿を作らずに語の生成器だけを走らせると、古い名簿を読む |
| 決定 7 | **辞書の `IC-?` の hint のうち担当者名簿の面の中で出る語（「名簿のすべての担当者を選ぶ」ほか 2 つ）は変えない** | `JDG-1182` は用語集と仕様の文の裁定であり、`JDG-1181` が名指した語にこれは無い | 画面の中で「名簿」と「担当者名簿」が並ぶ —— 直すなら別の裁定 |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| `Esc` をヘルプの基本操作に | `FR-036` の段の終わり（1 文と、`SK-8` の ⚠️ の書き直し） | E-01 |
| `U-65` の確定名 | `01-04-requirements.md` の `UZ-13`・`FR-088`・`EP-11`・`FR-036` の `Calendar Editor`、表 T-344 の題 | E-02 |
| `U-49` の語 | `01-04-requirements.md` の 16 か所・`05-07-design.md` の 2 か所 | E-03・E-04 |
| 用語集 | 表 T-103 の `U-49`・`U-65`、表 T-109 の `IC-52` の `面`、`IC-62`・`IC-132` の `何の入口か`、`IC-133`〜`IC-138` の `面` | E-05 |
| 設定値の注と接頭辞 | `settings.json` の `S-429`・`S-437` の注、`row-id-prefixes.json` の `WC` | E-06 |
| 画面の語 | `display-words.json`（`icons` の 3 項・`reasons` 1・`assignments` 1・`surfaces` 1・`shortcuts` に 1 項） | E-07 |

**数**: 要求の文 ＋1（E-01）。表の行の増減 0。図 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・要求のどれも足さない。⚠️ `Holiday Settings` は新しい名ではなく、`U-65` の確定名の付け替えである（決定 1）。辞書の `shortcuts` に足す `SK-8` の項は既にある行 ID の語である。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`5e34d55f`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「`SK-8`（`Esc`）は…によりヘルプに出ない」 | `FR-036` の段の終わり | 「入口の項目が段に載らない割当は…同じ塊に置くこと（MUST）」と、`SK-8` がその塊に出る ⚠️ | E-01 |
| 確定名 `Calendar Editor`（12 か所） | `01-04-requirements.md` 4・`tbl-glossary.md` 8 | `Holiday Settings` | E-02・E-05 |
| 「暦の編集面」（4 か所） | 表 T-344 の題・`U-65`・`IC-132`・`WC` | 「休日の設定」 | E-02・E-05・E-06 |
| `U-49` を指す「名簿」（22 か所） | 01-04 16・05-07 2・用語集 2・`settings.json` 2 | 「担当者名簿」 | E-03・E-04・E-05・E-06 |
| 辞書の語 6 と面の名 1 | `display-words.json` | 4 節の E-07 の表 | E-07 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（`5e34d55f` で、どれも 1 回。13 節）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧（`FR-036` の段の終わりの行）
```text
⚠️ 表 T-036 の `SK-8`（`Esc`）は `入口` が `IC-52` なので、上の「入口の項目の割当の場所に置く」によりヘルプに出ない。
```
新（2 行。⚠️ 段の終わりに置くので、文のあいだに挟まない）
```text
⭐ 入口の項目が段に載らない割当は、上の「入口の項目の割当の場所に置く」に代えて、入口を持たない割当と同じ塊に置くこと（MUST） —— 利用者が、`Esc` をヘルプの基本操作の塊に残すと定めた。
⚠️ 表 T-036 の `SK-8`（`Esc`）は `入口` が `IC-52` なので、この文により入口を持たない割当の塊に出る —— `Esc` は閉じるほか、ドラッグの中断・構えを解く・選択を解く（表 T-028 の `IN-4`）にも効き、このツールで覚えることである。
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`Calendar Editor` → `Holiday Settings`（`FR-152` の `UZ-13`、`FR-088` の「暦の編集は `Calendar Editor`…」、`FR-080` の `EP-11`、`FR-036` の MUST NOT の面の列挙）と、表 T-344 の題「暦の編集面の欄と入口」→「休日の設定の欄と入口」。どれもその行の中で 1 回。

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`U-49` を指す「名簿」→「担当者名簿」の 16 か所: UC の拡張 3c、表 T-225 の `AS-4`・`AS-5`（3）・`AS-7`（3）・`AS-9`・`AS-12`、その下の 2 行、`FR-099` の題・STATEMENT・RATIONALE、`FR-088` の「名簿と同じ作法」。題「担当者の名簿を出して消す」は「担当者名簿を出して消す」。

<!-- EDIT id=E-04 file=docs/spec/05-07-design.md -->
`UF-109` の「資源の名簿（`FR-099`・表 T-257）」→「担当者名簿（`FR-099`・表 T-257）」、「名簿の横の送り」→「担当者名簿の横の送り」。

<!-- EDIT id=E-05 file=docs/spec/_assets/tbl-glossary.md -->
旧
```text
| U-49 | `Resource Roster` | 名簿。<br>…
| U-65 | `Calendar Editor` | 暦の編集面。<br>…
```
新
```text
| U-49 | `Resource Roster` | 担当者名簿。<br>…
| U-65 | `Holiday Settings` | 休日の設定。<br>…
```
表 T-109: `IC-52` の `面` の末の `Calendar Editor`、`IC-133`〜`IC-138` の `面` → `Holiday Settings`。`IC-62` の `何の入口か`「担当者の名簿を表示する」→「担当者名簿を表示する」、`IC-132`「暦の編集面を開く（…）」→「休日の設定を開く（…）」。

<!-- EDIT id=E-06 file=docs/spec/_source/settings.json docs/spec/_source/row-id-prefixes.json -->
`S-429` の注「名簿と検索パネルは」→「担当者名簿と検索パネルは」、`S-437` の注「名簿の罫」→「担当者名簿の罫」。接頭辞 `WC` の ja「暦の編集面の欄と入口（表 T-344）」→「休日の設定の欄と入口（表 T-344）」（英語の名 `Working Calendar` は接頭辞の名であり変えない）。

<!-- EDIT id=E-07 file=docs/spec/_source/display-words.json -->
| 区 | 鍵 | 欄 | 旧 | 新 | 裁定 |
|---|---|---|---|---|---|
| `icons` | `IC-133` | `hint`（ja） | …（当てるまで文書は変わらない） | …（適用するまで文書は変わらない） | `JDG-1181` |
| `icons` | `IC-96` | `hint`（ja） | …足した側は取込元へ戻せなくなる | …追加した側は取込元へ戻せなくなる | 同 |
| `reasons` | `RS-46` | `text`（ja） | これ以上深い段には行を足せません | これ以上深い段には行を追加できません | 同 |
| `assignments` | `MK-6` | `text`（ja） | 範囲選択する（Shift を併せると選択に足す） | 範囲選択する（Shift を併せると選択に追加する） | 同 |
| `icons` | `IC-132` | `label`（en） | Working calendar | Holiday Settings | `JDG-1182` |
| `surfaces` | `Calendar Editor` → `Holiday Settings`（`name`） | `heading`（en） | Working calendar | Holiday Settings | 同 |
| `shortcuts` | `SK-8`（足す。`SK-5` と `SK-9` のあいだ、表 T-036 の印字順） | `text` | — | ja「取り消す・閉じる」、en「Cancel or close」 | `JDG-1180`（決定 5） |

当てた後に打つもの: `npm run gen`（`help-roster.json`・`display-words.json`・`icon-roster.json` を刷る）→ `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

### 4.1 重なり

`change-request/CR-6[0-3]*.md` のうち本書の旧を含むものは `CR-635`（E-01 の旧を書いた。着地済み —— ⛔ 追記しない）だけ。`CR-638`（表 T-342 の `BK-4`）・`CR-639`（表 T-346・`GR-28`・設定値）は本書の行に触れない。

---

## 5. 継ぎ目

```
SEAM (CR-637)
- help-roster.json: SK-8 (Esc) is an item of the basics block again (HC-1,
  table T-036, keys "Esc"), in table T-036 print order. 89 items -> 90.
  The rule: an assignment whose entrance item is left off the help sits in
  basics (FR-036). Today only SK-8 (entrance IC-52) is such a row.
- display-words.json: shortcuts gains SK-8 (ja / en). The words generator
  lists the T-036 rows the help roster carries as items of their own.
- U-65 is renamed: the surface name is "Holiday Settings" everywhere
  (icon-roster surfaces of IC-52 and IC-133..IC-138, display-words surfaces
  name, LEFT_OUT_SURFACES). No hand-written src file spells the old name.
- Words: IC-133 / IC-96 hints, RS-46 text, MK-6 text (ja); IC-132 label and
  the surface heading (en) -> "Holiday Settings".
```

---

## 6. グラフ（`5e34d55f`）

- `impact.py FR-036`: 指している要求 12 件・参照 51 箇所 —— `SK-8` の扱いを写したものは無い（`SK-8` を指すのは `FR-036` の 1 か所だけ）。
- `impact.py SK-8`: `FR-036` の 1 箇所（E-01 が書き直した行）。
- `impact.py U-49`: `FR-099`・`FR-016`・`FR-152`・`FR-080`・状態機械 `openSurfaceStateMachine` —— どれも行 ID か確定名 `Resource Roster` で指し、日本語名を写していない。
- `impact.py U-65`: `FR-152`・`FR-088`・`FR-080`・状態機械 —— 確定名を書く 3 つは E-02 で書き換えた。状態機械は行 ID だけ。
- `impact.py IC-132`: `FR-088` の 1 箇所。`impact.py T-344`: `FR-088`、2 次 4 件（`FR-031`・`FR-054`・`FR-074`・`FR-076`）—— 表の題を写したものは無い。
- `induced.py FR-036 SK-8 IC-52 U-49 U-65 IC-132 T-344 FR-088 FR-099`: 種 9/9、辺 13、閉路 3（`FR-036` `IC-52` `SK-8` ／ `FR-099` `U-49` ／ `FR-088` `IC-132` `U-65`）—— 3 つとも 1 回の計画（1 つのスクリプト）で書いた。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables / figures / rows / uids | 差 0 | 表・図・行・要求を足しも消しもしない |
| `（MUST）` の印（`01-04-requirements.md`） | ＋1 | E-01 |
| `（MUST NOT）` の印（同） | 差 0 | |
| ヘルプの項目（`help-roster.json` の `item`） | 89 → 90 | `SK-8` |
| ヘルプの見出し（`heading`） | 5 → 5 | |
| `Calendar Editor` | 原稿 13（仕様 12 ・辞書 1）・生成物 8・生成器 2・試験 3 → どれも 0 | 決定 1 |
| 「暦の編集面」（`docs/spec` の原稿） | 4 → 0 | 決定 3 |
| `U-49` を指す「名簿」（`docs/spec` の原稿） | 22（「担当者名簿」0）→ 22（すべて「担当者名簿」） | 決定 2。別の物を指す「名簿」19 は 19 のまま |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（どれも 1 回） | 当てる体 |
| 1 | `docs/spec/`（原稿 6 つ）・`tools/generate_help_roster.py`・`tools/generate_display_words.py` ＋ 生成物 ＋ `changelog.md` の 1 行 ＋ 試験の逐語（9 節） | E-01〜E-07、`npm run gen`、`gen:check`、check.sh | 仕様の波（本書） |
| 2 | `src/`・`tests/` | 9 節の後半 | コードの波（調整役が配る、`DFC-1712`） |

- ⭐ **毎フレームの経路: いいえ。** ヘルプの中身と語だけが変わる。⚠️ 生成物 `src/adapter/screen-renderer/display-words.json` は規則 04 の 5 節の毎フレームの経路の表に載るので、`docs/development-records/perf-pending.md` に行 56 を足した（`CR-635` の行 55 と同じ形）。

---

## 9. 仕様の外で直すもの

⭐ 本書（仕様の波）が直したもの:

- `tools/generate_help_roster.py` —— `left_out` を `build` の頭へ移し、入口がどれも段に載らない割当（表 T-036 と 表 T-023）を基本操作の塊に置く（`off_the_help`）。`LEFT_OUT_SURFACES` の `Calendar Editor` を `Holiday Settings` にした。
- `tools/generate_display_words.py` —— `listed_shortcuts` が、生成したヘルプの名簿で 表 T-036 の項目として並ぶ行も数える（決定 6）。
- 試験の逐語（仕様の文を逐語で引く試験。検査 42 と vitest のため）: `tests/contract/cr-606-the-assignee-field-is-one-combo.test.ts`（`AS-5`）・`tests/unit/cr-439-open-modals-help-roster-report-export.test.ts`（`FR-099`）・`tests/unit/h10-one-assignee-per-line.test.ts`（2 行）・`tests/contract/dfc-288-d-289-fr-099-deleting-the-chosen-assignees.test.ts`（注の `IC-62`）・面の名を引く `tests/contract/spec-table-reads-the-whole-cell.contract.test.ts`・`tests/unit/cr-405-the-help-scrolls-down-in-three-columns.test.ts`（この 2 つは本書の前から赤 —— `DFC-1710` の持ち分。名だけ直した）。
- `tests/contract/display-words.contract.test.ts` —— `shortcuts` が「入口を持たない行」だけと比べていたのを、ヘルプの名簿が 表 T-036 の項目として並べる行と比べる形にした（`FR-036` の新しい文）。
- `.claude/skills/spec-graph-check/dictionary-table-pairing.txt` —— 検査 37 が、面の名・`何の入口か`・語を直した 表 T-109 の 10 行（`IC-52`・`IC-62`・`IC-96`・`IC-132`〜`IC-138`）と 表 T-023 の `MK-6` の指紋の変化、表 T-036 の `SK-8` の新しい対で止まった。行と語を並べて読み（`SK-8` の語は同表の `機能` の欄と同じ）、`--write-baseline` で取り直した（対 359 → 360。11 は取り直し、1 は新しい対）。⚠️ 負債の基準線ではなく、読み合わせの記録である。
- `tests/contract/t-233-reason-words-tell-the-row.contract.test.ts` の `RS-46` の指紋 —— 場面「これ以上深い段には行を足せない」と、ja「これ以上深い段には行を追加できません」（同じ文、Add ＝ 追加）・en・次の一手を並べて読み、取り直した（`bac76585cce3368a` → `54875dcd9728b4a9`。試験と同じ式を scratchpad で再現し、旧の値が一致することを確かめてから）。

⛔ 本書が直さないもの（コードの波、`DFC-1712`）:

- ヘルプの基本操作の塊に `Esc` の項目が出ること（`src/framework/dom-screen-surface/open-modals-drawing.ts`・`src/adapter/screen-renderer/open-modals.ts` が `shortcuts` の語を引けること）と、ヘルプの項目を数える試験（89 → 90）。
- 語を逐語で比べる試験（「当てるまで」「足せません」「選択に足す」「足した側」「Working calendar」）。
- 休日の設定の面を描くとき（`DFC-1671`）、面の名を `Holiday Settings` で持つこと。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- `IC-44` の hint・`IC-41` の label・`RS-54` の text は変えない（`JDG-1181`）。
- `U-49` の英語 `Resource Roster` は変えない（`JDG-1182`）。
- 接頭辞 `WC` の英語の名 `Working Calendar` は変えない（接頭辞の名であって面の名ではない）。
- `CR-635` には追記しない（規則 02 の 2.5 節）。

---

## 11. 利用者に問うこと

無い。⚠️ 決定 7（担当者名簿の面の中の辞書の語「名簿の…」）は、揃えるなら新しい裁定が要る。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1180`・`JDG-1181`・`JDG-1182` | 本書の裁定 | 状態を「適用済」にした |
| `DFC-1712` | コードの波（9 節の後半） | 足した（`実装待ち`） |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 5e34d55f; every file this CR edits is
# LF-only (CRLF 0, counted by a script that reads bytes)

# the old texts: each counted once by a script in the session scratchpad
# (cr637_edits.py --count: E-01..E-06 and the generator, old=1;
#  cr637_words.py --count: each display word old=1, "Working calendar" old=2)

# which assignments name an entrance the help leaves off (section 0, R1.4):
# a scratchpad script applying generate_help_roster's left-out rule to the
# entrance cells of tables T-036 and T-023  -> SK-8 (IC-52) only

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-036
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py SK-8
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py U-49
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py U-65
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py IC-132
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-344
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-036 SK-8 IC-52 U-49 U-65 IC-132 T-344 FR-088 FR-099

# the words (section 7): every occurrence in docs/spec with 30 characters of
# context, classified by hand (U-49 or another list)
git grep -n "名簿" -- docs/spec
git grep -n "暦の編集面\|Calendar Editor" -- docs/spec src tools tests

# no hand-written source spells the surface name (decision 1)
git grep -n -i "calendar.\?editor" -- src ':!*.json'   # -> nothing

# the help roster before and after: count entries by kind
#   5e34d55f: heading 5, item 89  ->  heading 5, item 90
```
