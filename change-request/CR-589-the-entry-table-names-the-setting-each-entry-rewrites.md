# CR-589 — アイコンの名簿が、表示の切り替えの入口が書き換える設定値の行を持ち、コードの 2 つの対応表はそこから生成する

> 起草の状態: 当てた（2026-09-26、枝 `cr-organise`、波 W4b。`JDG-740`）。当てた木は `d2a4e6b0` に `CR-562` ・ `CR-561` ・ `CR-563` を当てた作業木（枝 `cr-organise`、未コミット）。11 節の問い 2 つは調整役が A と A に決めた（13 行だけを埋め、描き手の写しも生成へ）。4 節の旧 15 はどれも 1 度だけ現れ、そのまま当てた（E-03 の旧は着地した `CR-588` の `IC-4` の文と一致した）。E-16 の規則は 表 T-109 の 100 行に当たり（最後の欄は `—` 78、`AR-n` 22。当たらない行 0）、表は 113 行 ・ 7 列 ・ 埋まった欄 13 になった —— W4 の後の予測 114 行との差 1 は、`CR-561` の `IC-108` を止めたからである。9.1 節の (a) は `tools/generate_icon_roster.py`（`entry_switches` ・ 見出しで列を引く ・ 拒む 6 つ）、(b) は `tools/generate_entity_types.py`（`entry_switch_block`）に当てた。⚠️ 当てるときに (b) へ足した: 8 節の「刷る側は L4 まで足さない」（手書きの表と同じ名を刷ると `tsc` が落ちる）を守るため、名は「そのユニットが読み、手で宣言していない」ときだけ刷る。手で宣言しているあいだは、手書きの表を 表 T-109 の欄と比べ、違えば `npm run gen` が止まる（入口のファイルの 2 つの表は今の欄と一致した）。⇒ L4 が手書きの表を消して名を読むと、次の `npm run gen` が区画へ刷る。`app-header-items.ts` には、刷る名ができるまで区画を作らない。9.2 節 ・ 9.3 節 ・ 9.4 節（`src` ・ 試験 ・ 規則 ・ 基準線）はこの枝の外であり、当てていない。変更履歴の行は、変更履歴の持ち主へ調整役が足す。
> （起草の記: 起草した（2026-09-26）。当時は仕様・コード・試験・生成器・基準線を 1 文字も変えていなかった。）
> 読んだ木: `87d98a47`（枝 `cr-organise`。`docs/development-records/rulings.md` に調整役の未コミットの編集があり、`JDG-691` の行はその中にある —— 読んだだけで触っていない）。行番号・数はどれもこの木で測った（13 節）。
> 当てる順: ⭐ 波 W4（`CR-561`・`CR-562`・`CR-571`・`CR-574` が 表 T-109 に行を足し、`CR-588` が `IC-4` の行を書き換える）の**直後に、独立した 1 段として**当てる（`JDG-691` の「W4 の直後に独立した段として行う」。調整役の計画 `docs/development-records/cr-plan-2026-09-26.md` の波 W4b）。
> ⚠️ 起草の途中（2026-09-26 18 時台）に、同じ作業木へ調整役の計画のファイル（未追跡）と `CR-584`〜`CR-588` の草案が現れ、`docs/spec` ほかにも未コミットの編集が入った。本書の数はどれも `87d98a47` の `docs/spec/_assets/tbl-glossary.md`（その間も変わっていない）と、その時点の変更要求の草案で測った。計画は `CR-579` をこの通しに入れない（「⛔ この通しに入れない（`JDG-740`）」）—— 本書は `CR-579` が当たっていない木に当てるものとして書いた（5 節の注）。
> ID の帯: 調整役から `CR-589` と仮の番号の帯 90900〜90999 を受けた。⭐ 本書は新しい行 ID・表・接頭辞・設定値の行を 1 つも作らないので、帯は使わない（2 節）。当てる直前（2026-09-26、同じ木）に測り直しても、本書が作る識別子は 0 である。
> 閉じるもの: `JDG-691` の指示（調整役が B を選んだ）と、`CR-579` の 9 節が台帳へ起こす候補に挙げた `DFC-1041`（12 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者と調整役の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-691` | 「司令塔に伝えて、判断を仰げ。」 | 利用者は判断を調整役に任せた。調整役は B —— 表 T-109 に「その入口が書き換える設定の行」の欄を足し、`VISIBLE_ELEMENT_BY_ENTRY`・`GUIDE_CURSOR_MODE_BY_ENTRY` をそこから生成する。理由は ① 正を仕様の 1 か所にする ② 生成した区画は `JDG-695` の 1,000 行に数えない ③ W4 の直後が最も安い | 本書の骨格。欄の名と範囲は ③ の 決定 1・決定 2 |
| `JDG-695` | 「提案通りでOK。」 | 手書き 1,000 行を超える `src` のファイルは割る。`<generated>` の区画は数えない | 生成へ移すと、入口のファイルの手書きの行が減る（9 節） |

⚠️ `CR-579` の 10 節は `JDG-691` を「A 今はしない」と書くが、`rulings.md` の同行はその記述を答えとして扱わないと書いている（「その記述は答えとして扱わない」）。本書は `rulings.md` の行に従う。

### 0.2 調べた結果（`87d98a47`）

1. **表 T-109 は手書きの Markdown で、6 列・97 行である**（`docs/spec/_assets/tbl-glossary.md:504`）。列は `行 ID`・`面`・`群`・`何の入口か`・`正`・`構え`。
2. **結び付けは文の中にしか無い。** 表示の切り替えの入口は、書き換える設定値の行を `何の入口か` の括弧の中に書く（`IC-8` の「予定を表示する・非表示にする（`S-227`。<br>実績とは独立）」）。`IC-48` は「同・`'single-vertical'`」とだけ書き、設定値の行を書かない（`IC-47` から継ぐ）。
3. **コードはそれを 5 か所（数え方で 6 か所）で打ち直している** —— 同じ形（入口 → 設定値の鍵）の手書きの対応を、`src` で数えた:

| # | 所（関数・定数の名で引く） | 行数 | 何を持つか |
|---|---|---|---|
| a | `src/adapter/input-command-translator/input-command-translator.ts` の `VISIBLE_ELEMENT_BY_ENTRY` | 11 | 入口 → 表 T-202 の真偽の鍵 |
| b | 同ファイルの `GUIDE_CURSOR_MODE_BY_ENTRY` | 2 | 入口 → `S-66` の値 |
| c | 同ファイルの `commandFromEntry` の `case ENTRY.…` の 3 つの群 | 13 の `case` | どの入口を a・b へ回すか（a・b の鍵の集合の 3 つ目の写し） |
| d | `src/adapter/screen-renderer/command-palette.ts` の `SETTINGS_KEY_BY_ROW` | 8 | a のうちパレットの行（`TRAP`「nothing checks that they agree」。検査 70 の基準線 `twin-comments-baseline.txt` に写しとして登録済み） |
| e | 同ファイルの `GUIDE_CURSOR_MODE_BY_ROW` | 2 | b の写し |
| f | `src/adapter/screen-renderer/app-header-items.ts` の `commandStateOf` の 3 つの腕（`IC-4`・`IC-8`・`IC-9`）と、その 3 つの `IconId` の定数 | 3 | a のうちヘッダーの行 |

   ⇒ 仕様の 13 の結び付けが、`src` に 5 か所（c を数えれば 6 か所）写っている。d〜f は 表 T-237 の `EN-2`・`EN-6`（入口を塗って示す）のために同じ結び付けを読む。
4. **13 の入口は、`正` の欄でちょうど見分けられる。** `正` が `FR-049` で始まる行は 11（`IC-4`・`IC-8`・`IC-9`・`IC-39`・`IC-40`・`IC-42`・`IC-43`・`IC-79`・`IC-80`・`IC-81`・`IC-103`）、`FR-048` で始まる行は 2（`IC-47`・`IC-48`）。表 T-202 の 16 行のうち型が真偽の行もちょうど 11 で、`FR-049` の「対象は**型が真偽である行だけ**とすること（MUST）」の範囲と一致する（`tbl-settings.md:156` 〜）。
5. **設定値を書き換える入口はほかにもある** —— `何の入口か` が括弧に設定値の行を書く行は、上の 13 のほかに 18 —— うち `IC-32` の `S-48` は図形の比であって書き換えないので、書き換えるのは 17（`IC-7`・`IC-11`・`IC-12`〜`IC-15`・`IC-104`・`IC-105`・`IC-100`・`IC-16`・`IC-21`・`IC-99`・`IC-101`・`IC-45`・`IC-50`・`IC-75`・`IC-76`）。書き方は巡る（`IC-99`）・刻む（`IC-12`）・選ぶ（`IC-16`）・数値を読む（`IC-45`）とまちまちで、`IC-10`（全体表示）は 2 つ以上の行を書く。
6. **表 T-109 を位置で読む所**（「同じ形」の 2 つ目 —— 列を 1 つ足すと効く所）:
   - 列の数を確かめる所: `tools/generate_icon_roster.py` の `build`（`len(table.headings) != len(FIELDS)`、6 列）、試験 3 本（`tests/system/duplicate-paste-and-dual-cursor.test.ts`・`tests/system/measured-sweep.test.ts`・`tests/system/user-reported-fixes.test.ts` の `T109_COLUMNS = 5`）。
   - 位置で `構え` を読む所: `tools/generate_icon_roster.py` の `icon_of`（`row[5]`）、`tests/system/measured-sweep.test.ts` の `T109_STANCE = 4`。
   - 最後の欄を `構え` として読む所: 試験 4 本（`tests/system/divider-colour-corner-and-sticky-field.test.ts`・`tests/system/rows-fixed-with-nothing-holding-them.test.ts`・`tests/system/three-rows-read-from-the-spec-alone.test.ts`・`tests/contract/dfc-295-entering-the-dual-cursor-drops-the-arm.test.ts`）。
   - 見出しか前の方の位置で読む所（列を足しても効かない）: `tools/spec_tables.py` で表を直に読む生成器のうち `generate_display_words.py`（`row[0]`〜`row[2]`）と `generate_icon_glyphs.py`（行 ID だけ）、名簿を読む `generate_help_roster.py`、`.by['…']` で読む試験。
   ⇒ 新しい欄を `構え` の**前**に挟めば、最後の欄を読む 4 本は効かない。末尾に足すと 4 本とも `構え` を見失う。
7. **`何の入口か` の括弧の設定値を読む試験が 2 本ある** —— `tests/unit/cr-386-ic-103-planned-dates-beside-the-name.test.ts`（`IC-103` の文が `` `S-232` `` を含む、パレットの入口を `` `S-62` `` で探す）と `tests/unit/uf-48-write-moment.test.ts`（`NAMES_ITS_OWN_ROW` —— 9 つの入口の文が自分の行を名指し、`IC-48` だけが名指さないこと）。
8. ⚠️ **計画は本書の段を「毎フレーム いいえ」とし、`src` を実装の持ち場 L4 の「`589` の生成の結線」に置く**（`cr-plan-2026-09-26.md` の状態表と持ち場の表）。本書の測りでは、翻訳係の直しは毎フレームではないが、描き手の 2 ファイル（決定 5）は毎フレームの道に在る（9.2 節）。⇒ 決定 5 を採るなら、計画の「毎フレーム」の欄は「描き手の 2 ファイルだけ はい」になる。
9. **生成の区画は 1 ファイルに 1 つである。** `tools/generate_entity_types.py` の `region` は最初の `// <generated -- do not edit by hand>` で割る。入口のファイル（`input-command-translator.ts`）の区画はこの生成器のもの（`TARGETS` の 1 項、`NOT_STORED_ZOOM_STEP` ほか 5 群）。⇒ 別の道具が同じ印で 2 つ目の区画を書くことはできない。`CR-579` の W4 が `ARMED_BY_ENTRY` を同じ理由でこの生成器に刷らせ、結びは `generate_icon_roster.py` の関数を取り込んで使う（`icon-roster.json` を読む形は、`package.json` の `gen` で `types` が `icons` より先に走るので採らない）。
10. **行の幅**（`589-widths.py`、13 節）: 97 行の表示の幅（全角 2）は中央値 89・最大 437。足す欄は `—` の行で +4、真偽の行で +10、`IC-47`・`IC-48` で +32（`IC-48` は 81 → 113）。当てた後の中央値は 93。⇒ Markdown の行は読めるまま（決定 3）。
11. **同じ時期に同じ所を動かす変更要求**:
    - `CR-588`（W4。起草中）が 表 T-109 の `IC-4` の行を書き換える（同書の E-18。`JDG-722` —— 重ねる予定が無いときは切り替えず、ファイルを選ばせる）。⇒ 本書の E-03 の旧は `CR-588` の E-18 の新である。
    - `CR-579`（入口のファイルを割る）はこの通しに入らない（計画の表の最後の行）。⇒ 入口のファイルに `FIXED_ACTION_BY_ENTRY` は無く、`generate_entity_types.py` はまだ `generate_icon_roster.py` を取り込んでいない。
    - `CR-572`（着地の順は本書より前の見込み）が `S-65`・`S-66` を 表 T-202 から 表 T-206 へ移し、`guideCursorMode` を文書の値から画面の値（`ScreenSession`）へ移し、命令 `CM-59`（`setGuideCursorMode`）を退かせる（同書の 3 節・16.3 節。`JDG-625`）。表 T-202 の真偽の 11 行は動かない（同書の「内容 25」）。
    - ⇒ `CR-588` の後、`IC-4` は「押せば必ず `S-69` を反転する」入口ではなくなる（重ねる予定が在るときだけ反転する）。
12. **W4 が足す・変える行**（各変更要求の 4 節から。13 節の写しの木で数えた）: `IC-107`・`IC-108`（`CR-561` の N-20）、`IC-115`（`CR-562` の E-13。`IC-19` を退かせ、`IC-18`・`IC-20` の順を入れ替える。E-28 が `IC-52` の `面` を縮める）、`IC-117` 〜 `IC-127`（`CR-571` の 4.3 節）、`IC-128` 〜 `IC-131`（`CR-574` の 4.5 節。`IC-21` の文も変える）、`IC-4`（`CR-588` の E-18）。`CR-575`・`CR-563` は 表 T-109 の行を書かない（`CR-563` の `IC-116` は使わないと同書が書く）。足す行はどれも `正` が `FR-049`・`FR-048` ではなく、新しい欄は `—` である。W4 の後の表は 114 行（97 − 1 ＋ 1 ＋ 2 ＋ 11 ＋ 4）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ 主には基盤の作業である —— `CH-1`〜`CH-6` のどれも直接には前へ進めない。
- 間接には `CH-4`（`GL-006`、すぐわか）: 入口の結び付けを誤ると、押した入口と塗られる入口（表 T-237 の `EN-2`・`EN-6`）と変わる絵が食い違い、説明を読まずに操作できなくなる。今はその誤りをコンパイルも検査も捕まえない（0.2 節の 3 の d の `TRAP`）。本書の後は、仕様の 1 か所を直せば `npm run gen` が 3 つのユニットへ運ぶ。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- `R1.3`（唯一の正）: 結び付けの正を 表 T-109 の新しい欄 1 か所にし、`何の入口か` の括弧から同じ設定値の行を外した（決定 4）。⚠️ 外さずに欄を足すと、同じ表の同じ行に同じ結び付けが 2 度載る（仕様自身が「写した瞬間に正が 2 か所になる」と戒める形）。
- `R1.5`（MECE）: 欄の範囲を「`FR-049` と `FR-048` の入口だけ」と前文に書いた（決定 1）。`—` の行が「設定値を書き換えない」と読まれないよう、ほかの入口の結び付けは `何の入口か` が持つと前文が言う。
- `R2.7`（DRY）・`R2.21`（1 つの仕事は 1 か所）: 0.2 節の 3 の a〜f を 1 つの生成器の出力に畳む（決定 5）。表を読む関数は `tools/generate_icon_roster.py` に 1 つだけ置き、`tools/generate_entity_types.py` はそれを取り込む（`CR-579` の W4 の `fill_arms_shape` と同じ形）。
- `R2.19`（コンポーネント境界）: `ScreenRenderer` は `InputCommandTranslator` を読まない（辺は翻訳係 → 描き手の向き）。⇒ 生成器が両方のユニットに同じ名の定数を刷る（`03-implementation.md` の「1 つの名前は、それを使うユニットごとに刷られる」）。新しい辺は足さない。
- `R3.3`（安全確認なしの型アサーション無し）: 今の `visibleElementOfEntry`・`guideCursorModeOfEntry` は `as VisibleElement`・`as PressedGuideCursor` で値を型に当てている。生成した表は値を文字列の型の和で刷るので、`as` を外し、代入で型を確かめさせる（5 節）。誤った鍵は `tsc` が落とす —— `JDG-691` の理由 ① の「誤った結び付けもコンパイルが通る今の形を断つ」。
- `R2.9`（YAGNI）: アイコンの名簿（`icon-roster.json`）には新しい欄を運ばない（読む者がいない。決定 6）。
- `R2.1`（命名）: 欄の名 `切り替える設定値` は 表 T-006b（単独で使ってはならない日本語）の語を含まない。コードの定数の名は今のまま（`VISIBLE_ELEMENT_BY_ENTRY`・`GUIDE_CURSOR_MODE_BY_ENTRY`）—— 名を変えると読む所がすべて動くのに、意味は変わらない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **欄は `FR-049` と `FR-048` の入口の 13 行だけが埋める。** ほかの入口は `—` | 裁定の目的は 2 つの対応表の生成（`JDG-691`）。0.2 節の 5: ほかの 17 行は書き方がまちまちで、`IC-10` は 2 つ以上の行を書く —— 1 つの欄に 1 つの行と書けば偽になる。13 行の範囲は `正` の欄と 表 T-202 の真偽の行で仕様の中から判じられ、生成器がその一致を確かめられる（9 節） | 設定値を書き換える入口の結び付けが、13 行は欄に、ほかは文の括弧にと、2 つの書き方に分かれる（前文がそう言う）。広げる案は 11 節の問い 1 |
| 決定 2 | 欄の名は `切り替える設定値`。ガイドカーソルの行は `` `S-66` `` の後ろに書く値を全角の括弧で添える | `JDG-691` の文言は「書き換える設定の行」だが、決定 1 で範囲を切り替え（`FR-049`）と選択（`FR-048`）に絞ったので、名もその範囲を言う。仕様は設定の行を「設定値の行」と呼ぶ。値を添えるのは、`IC-47` と `IC-48` が同じ行の別の値を書くから（`DFC-1041` の「`Guide Cursor` の型」） | 裁定の文言と 1 語違う |
| 決定 3 | **表 T-109 は Markdown のまま `tools/spec_tables.py` で読む。** `_source/` の JSON の原稿へは移さない | 0.2 節の 10: 足す幅は `—` の行で +4 桁、埋まる行で +10〜32 桁で、行は読めるまま。移すと、仕様の 25 か所の「`_assets/tbl-glossary.md` の 表 T-109」、表を直に読む生成器 3 本（うち `generate_icon_roster.py`・`generate_icon_glyphs.py` は表の上の散文の「97 行ある」も読む）と、`'T-109'` を名指して表を読む行（`tests`・`tools`・`.claude` で 84 行）の読み先がすべて動く。W4 が足したばかりの 18 行も原稿へ写し直すことになる。`generate_icon_roster.py` は既に `spec_tables.read` で読んでいる | 表が手書きのままなので、欄の形の破れは生成器が拒むまで見えない（生成器が拒む —— 9.1 節） |
| 決定 4 | **欄が名指す設定値の行を、同じ行の `何の入口か` の括弧から外す**（12 行。`IC-48` はもともと書いていない） | `R1.3`。仕様の作法（写すと正が 2 か所になる）。前文に「重ねて書かない」を置く | 括弧を読む試験 2 本を欄へ読み替える（9.3 節） |
| 決定 5 | 生成は `tools/generate_entity_types.py` に新しい出力の関数を 1 つ足して行い、**入口のファイル・`command-palette.ts`・`app-header-items.ts` の 3 つ**へ刷る（d〜f も畳む） | 0.2 節の 3。入口の側だけを生成にすると、d〜f の手書きの写しは「一緒に直せ」という `TRAP` のまま、仕様の欄を直しても黙って古いままになる —— 今より悪い。広さは 11 節の問い 2 | `ScreenRenderer` の 2 ファイルに区画が増える |
| 決定 6 | アイコンの名簿（`icon-roster.json`）は新しい欄を運ばない。`generate_icon_roster.py` は列を見出しで数え、`構え` を見出しで読む | 名簿を読む描き手は、表 T-237 を塗るのに型の付いた定数（決定 5）を読む。名簿へも運ぶと同じ結び付けが生成物に 2 度出る | 名簿の見出しの写し（`columns`）は 7 列のうち 6 列になる（名簿の見出しの文にそう書く） |
| 決定 7 | **欄を `正` と `構え` のあいだに挟む** | 0.2 節の 6: 最後の欄を `構え` として読む試験 4 本が効かないまま残る。末尾なら 4 本とも直す | 列の数を確かめる所 4 つ（生成器 1・試験 3）と、位置で `構え` を読む所 2 つ（生成器 1・試験 1）は直す（9 節） |
| 決定 8 | `commandFromEntry` の 13 の `case` を消し、`switch` の前で 2 つの表を引く。使われなくなる `ENTRY` の 13 の名も消す | 0.2 節の 3 の c: `case` が残ると、欄に 1 行足しても `switch` が拾わず、押しても何も起きない（`default` の `commandFromArmingEntry` へ落ちる） | 入口ごとの前段の条件（下の決定 9）は表を引く前に置く |
| 決定 9 | `CR-588`（`JDG-722`。`IC-4` で重ねる予定が無いとき）の条件は、表を引く前に残す。欄は `S-69` のまま | 欄が言うのは「その入口が書く設定値の行」であり、書く前の条件ではない。前文は「押すたびに」と書かない | — |

---

## 1. 範囲 —— 行き先

| 何 | 所 | 編集 |
|---|---|---|
| 欄を足す | 表 T-109 の見出し | E-01 |
| 欄の意味 | 表 T-109 の前文（`構え` の段の後ろ、表題の前に 1 段） | E-02 |
| 13 行の欄を埋め、12 行の括弧から設定値の行を外す | `IC-4`・`IC-8`・`IC-9`・`IC-39`・`IC-40`・`IC-42`・`IC-43`・`IC-79`・`IC-80`・`IC-81`・`IC-103`・`IC-47`・`IC-48` | E-03 〜 E-15 |
| ほかの行（今の木で 84、W4 の後で 101）の欄を `—` にする | 表 T-109 のほかの全行 | E-16（規則で当てる） |
| 要求・設定値・用語・名簿・状態機械 | 変えない | — |
| 生成器・`src`・試験・規則の一覧・検査の対応 | 9 節（仕様の外） | — |

**数**: 仕様の文の編集 16（すべて `docs/spec/_assets/tbl-glossary.md`）。原稿 JSON の編集 0。

## 2. 新しい識別子

- 表・行 ID・接頭辞・要求 ID・設定値の行・文書 UID・検査の番号: **作らない**。配られた仮の帯（90900〜90999）は使わずに返す。
- 表 T-109 の新しい列の見出し `切り替える設定値`（識別子ではない）。
- コードの名（仮。当てる体が `R2.1` で決め直してよい）: `tools/generate_icon_roster.py` の公開の関数 `entry_switches`、`tools/generate_entity_types.py` の出力の関数 `entry_switch_block`。生成される定数の名は今の手書きの名のまま（`VISIBLE_ELEMENT_BY_ENTRY`・`GUIDE_CURSOR_MODE_BY_ENTRY`）。
- `package.json` の名: 足さない（9.1 節の (c)）。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`87d98a47`。関数・定数の名で引く） | 置き換わる先 | 編集 |
|---|---|---|---|
| 12 行の `何の入口か` の括弧の設定値の行（`` （`S-69`） `` ほか） | `tbl-glossary.md` の 表 T-109 | 同じ行の `切り替える設定値` | E-03 〜 E-14 |
| `VISIBLE_ELEMENT_BY_ENTRY`（手書き 11 行） | `input-command-translator.ts` | 同じ名の生成された定数（区画の中） | 9.2 節 |
| `GUIDE_CURSOR_MODE_BY_ENTRY`（手書き 2 行） | 同 | 同じ名の生成された定数 | 9.2 節 |
| `commandFromEntry` の `case ENTRY.baselineVisible:` 〜 `case ENTRY.planDatesVisible:`（9）・`case ENTRY.planDisplay:`・`case ENTRY.actualDisplay:`（2）・`case ENTRY.guideCursorCrosshair:`・`case ENTRY.guideCursorSingleVertical:`（2） | 同 | `switch` の前で 2 つの表を引く段 | 9.2 節 |
| `ENTRY` の 13 の名（上の `case` だけが読む） | 同 | 消す | 9.2 節 |
| `visibleElementOfEntry`・`guideCursorModeOfEntry` の `as` | 同 | 代入で型を確かめる | 9.2 節 |
| `SETTINGS_KEY_BY_ROW`（手書き 8 行）と、その上の `TRAP` の 2 行 | `command-palette.ts` | 生成された `VISIBLE_ELEMENT_BY_ENTRY` | 9.2 節（問い 2 の A） |
| `GUIDE_CURSOR_MODE_BY_ROW`（手書き 2 行） | 同 | 生成された `GUIDE_CURSOR_MODE_BY_ENTRY` | 9.2 節（同） |
| `commandStateOf` の `case BASELINE_OVERLAY_ENTRY:`・`case PLAN_DISPLAY_ENTRY:`・`case ACTUAL_DISPLAY_ENTRY:` の 3 つの腕と、その 3 つの定数 | `app-header-items.ts` | `switch` の前で `VISIBLE_ELEMENT_BY_ENTRY` を引く段 | 9.2 節（同） |
| `generate_icon_roster.py` の「列の数 ＝ `FIELDS` の数」と `row[5]` | `tools/generate_icon_roster.py` の `build`・`icon_of` | 見出しの並びを確かめ、`構え` を見出しで読む | 9.1 節 |
| 検査 70 の基準線の `SETTINGS_KEY_BY_ROW` の 3 行 | `.claude/skills/spec-graph-check/twin-comments-baseline.txt` | 消す（下げ。調整役 —— `JDG-520`） | 8 節の「後」の段 |

⭐ **消さないもの**: `何の入口か` の括弧の設定値のうち、13 行以外のもの（`IC-99` の `` `S-70` `` ほか —— 決定 1）。`IC-47` の文の `'crosshair'` と「もう一度押せば `'none'` に戻る」（押し直しの規則は文が持つ）。`IC-48` の「同・」（継ぐ頭の `IC-47` は退かない —— 規則 02 の 4 節の「同・」の罠に当たらない）。`FR-049`・`FR-048`・表 T-202・表 T-237 の文。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**（`CR-555` と同じ）: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること。** 旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊であり、どれも行の全体（末の改行まで）である。
⚠️ 行末の 2 つの半角空白（改行の印）も旧と新の一部である。写すときに落とさないこと。
⭐ **旧の塊は W4 の後の文である** —— E-01・E-02 と、E-03 〜 E-15 のうち E-03 を除く 12 行は W4 のどの変更要求も書き換えないので、今の木の文である。⚠️ **E-03（`IC-4`）の旧は `CR-588` の E-18 の新である**（`CR-588` は起草中 —— 当てる前に、着地した `IC-4` の行と照らす。違っていれば、E-03 は同じ規則で作り直す —— `何の入口か` の括弧の `S-69` を全角の括弧ごと 1 つ外し、最後の欄の前に `S-69` の欄を挟む）。W4 が足す・変える行は E-16 の規則で当たる。13 節で、W4 を当てた写しの木で 15 の旧が 1 回ずつ、今の木で E-03 を除く 14 が 1 回ずつ現れることを数えた。
⚠️ 生成物（`src/adapter/screen-renderer/icon-roster.json` ほか）は手で直さない。9 節の生成器を直して `npm run gen` を打つ。

<!-- EDIT id=E-01 file=docs/spec/_assets/tbl-glossary.md -->
header。旧
```text
| 行 ID | 面 | 群 | 何の入口か | 正 | 構え |
| --- | --- | --- | --- | --- | --- |
```
新
```text
| 行 ID | 面 | 群 | 何の入口か | 正 | 切り替える設定値 | 構え |
| --- | --- | --- | --- | --- | --- | --- |
```

<!-- EDIT id=E-02 file=docs/spec/_assets/tbl-glossary.md -->
preamble。旧
```text
**名簿として運ぶほかに届ける道が無い。**

**表 T-109 — アイコンの全数**
```
新
```text
**名簿として運ぶほかに届ける道が無い。**

⭐ `切り替える設定値` の欄は、表示の値を書き換える入口のうち、次の 2 種の入口が書く設定値の行である。  
`FR-049` が 表 T-202 の真偽の行に作る切り替えの入口にはその行を置き、`FR-048` のガイドカーソルを選ぶ入口には `S-66` を置いて、その入口が書く値を後ろの全角の括弧に入れる（`IC-47` の欄の形）。  
ほかの入口の欄は `—` である —— ほかの設定値を書き換える入口の結び付けは、その行の `何の入口か` が持つ。  
⭐ **同欄は、押された入口から書き換える設定値を引くためにある** —— 結び付けが文の中にしか無いと、コードが打ち直すほかなく、入口を別の行へ誤って結んでも気づく者がいない。  
⚠️ 同欄が名指す設定値の行を、同じ行の `何の入口か` に重ねて書かない —— 書けば同じ結び付けが 2 か所に載る。

**表 T-109 — アイコンの全数**
```

<!-- EDIT id=E-03 file=docs/spec/_assets/tbl-glossary.md -->
IC-4。旧
```text
| IC-4 | `App Header` | 文書 | 変更前の予定の重ねを表示する・非表示にする（`S-69`）。<br>⭐ **重ねる予定が無いときは切り替えず、変更前の予定にするファイルを選ばせる**（表 T-024a の `OP-15`） —— 押しても何も描かれない入口にしない。<br>⚠️ **重ねる予定が在るときはファイルを読む入口ではない** —— 読む入口は `IC-1` であり、重ねを選ぶのは 表 T-024a の `OP-3` の第 3 の選択肢である（同 `OP-9`）| `FR-049`（`FR-015`）| — |
```
新
```text
| IC-4 | `App Header` | 文書 | 変更前の予定の重ねを表示する・非表示にする。<br>⭐ **重ねる予定が無いときは切り替えず、変更前の予定にするファイルを選ばせる**（表 T-024a の `OP-15`） —— 押しても何も描かれない入口にしない。<br>⚠️ **重ねる予定が在るときはファイルを読む入口ではない** —— 読む入口は `IC-1` であり、重ねを選ぶのは 表 T-024a の `OP-3` の第 3 の選択肢である（同 `OP-9`）| `FR-049`（`FR-015`）| `S-69` | — |
```

<!-- EDIT id=E-04 file=docs/spec/_assets/tbl-glossary.md -->
IC-8。旧
```text
| IC-8 | `App Header` | 表示 | 予定を表示する・非表示にする（`S-227`。<br>実績とは独立）| `FR-049` | — |
```
新
```text
| IC-8 | `App Header` | 表示 | 予定を表示する・非表示にする（実績とは独立）| `FR-049` | `S-227` | — |
```

<!-- EDIT id=E-05 file=docs/spec/_assets/tbl-glossary.md -->
IC-9。旧
```text
| IC-9 | `App Header` | 表示 | 実績を表示する・非表示にする（`S-228`。<br>予定とは独立）| `FR-049` | — |
```
新
```text
| IC-9 | `App Header` | 表示 | 実績を表示する・非表示にする（予定とは独立）| `FR-049` | `S-228` | — |
```

<!-- EDIT id=E-06 file=docs/spec/_assets/tbl-glossary.md -->
IC-39。旧
```text
| IC-39 | `Command Palette` | 表示 | イナズマ線を表示する・非表示にする（`S-64`）| `FR-049`（`FR-014`）| — |
```
新
```text
| IC-39 | `Command Palette` | 表示 | イナズマ線を表示する・非表示にする | `FR-049`（`FR-014`）| `S-64` | — |
```

<!-- EDIT id=E-07 file=docs/spec/_assets/tbl-glossary.md -->
IC-40。旧
```text
| IC-40 | `Command Palette` | 表示 | 進捗マーカーを表示する・非表示にする（`S-63`）| `FR-049`（`FR-013`）| — |
```
新
```text
| IC-40 | `Command Palette` | 表示 | 進捗マーカーを表示する・非表示にする | `FR-049`（`FR-013`）| `S-63` | — |
```

<!-- EDIT id=E-08 file=docs/spec/_assets/tbl-glossary.md -->
IC-42。旧
```text
| IC-42 | `Command Palette` | 表示 | 日付罫線を表示する・非表示にする（`S-67`）| `FR-049`（`FR-089`）| — |
```
新
```text
| IC-42 | `Command Palette` | 表示 | 日付罫線を表示する・非表示にする | `FR-049`（`FR-089`）| `S-67` | — |
```

<!-- EDIT id=E-09 file=docs/spec/_assets/tbl-glossary.md -->
IC-43。旧
```text
| IC-43 | `Command Palette` | 表示 | グループ罫線を表示する・非表示にする（`S-68`）| `FR-049`（`FR-042`）| — |
```
新
```text
| IC-43 | `Command Palette` | 表示 | グループ罫線を表示する・非表示にする | `FR-049`（`FR-042`）| `S-68` | — |
```

<!-- EDIT id=E-10 file=docs/spec/_assets/tbl-glossary.md -->
IC-79。旧
```text
| IC-79 | `Command Palette` | 表示 | 担当ラベルを表示する・非表示にする（`S-60`）| `FR-049` | — |
```
新
```text
| IC-79 | `Command Palette` | 表示 | 担当ラベルを表示する・非表示にする | `FR-049` | `S-60` | — |
```

<!-- EDIT id=E-11 file=docs/spec/_assets/tbl-glossary.md -->
IC-80。旧
```text
| IC-80 | `Command Palette` | 表示 | 完了率ラベルを表示する・非表示にする（`S-61`）| `FR-049`（`FR-090`）| — |
```
新
```text
| IC-80 | `Command Palette` | 表示 | 完了率ラベルを表示する・非表示にする | `FR-049`（`FR-090`）| `S-61` | — |
```

<!-- EDIT id=E-12 file=docs/spec/_assets/tbl-glossary.md -->
IC-81。旧
```text
| IC-81 | `Command Palette` | 表示 | 依存線を表示する・非表示にする（`S-62`）。<br>⚠️ **隠しているあいだは、依存線を選ぶことも、ラグを編集することも、削除することもできない** —— 表示に戻してから行う。<br>規則と理由は `FR-049` が持つ | `FR-049`（`FR-009`）| — |
```
新
```text
| IC-81 | `Command Palette` | 表示 | 依存線を表示する・非表示にする。<br>⚠️ **隠しているあいだは、依存線を選ぶことも、ラグを編集することも、削除することもできない** —— 表示に戻してから行う。<br>規則と理由は `FR-049` が持つ | `FR-049`（`FR-009`）| `S-62` | — |
```

<!-- EDIT id=E-13 file=docs/spec/_assets/tbl-glossary.md -->
IC-103。旧
```text
| IC-103 | `Command Palette` | カーソル | 名称ラベルに予定日を添える・外す（`S-232`。<br>書き方は `FR-002` の 表 T-251）。<br>⭐ **本行は群 `カーソル` の頭に置き、基準日の入口（`IC-44`）の左に並べる** —— 並びを決めるのは本表の `群` の欄だけであり（同表の前文）、`IC-61` と同じく場所のために群を選んだ。<br>⚠️ 図形の「6/3」は特定の日を指さない | `FR-049`（`FR-002`）| — |
```
新
```text
| IC-103 | `Command Palette` | カーソル | 名称ラベルに予定日を添える・外す（書き方は `FR-002` の 表 T-251）。<br>⭐ **本行は群 `カーソル` の頭に置き、基準日の入口（`IC-44`）の左に並べる** —— 並びを決めるのは本表の `群` の欄だけであり（同表の前文）、`IC-61` と同じく場所のために群を選んだ。<br>⚠️ 図形の「6/3」は特定の日を指さない | `FR-049`（`FR-002`）| `S-232` | — |
```

<!-- EDIT id=E-14 file=docs/spec/_assets/tbl-glossary.md -->
IC-47。旧
```text
| IC-47 | `Command Palette` | カーソル | ガイドカーソルを `'crosshair'` にする（`S-66`。<br>3 値排他）。<br>⛔ **取り消す入口は置かない** —— **本行をもう一度押せば `'none'` に戻る**（`FR-048`） | `FR-048` | — |
```
新
```text
| IC-47 | `Command Palette` | カーソル | ガイドカーソルを `'crosshair'` にする（3 値排他）。<br>⛔ **取り消す入口は置かない** —— **本行をもう一度押せば `'none'` に戻る**（`FR-048`） | `FR-048` | `S-66`（`'crosshair'`） | — |
```

<!-- EDIT id=E-15 file=docs/spec/_assets/tbl-glossary.md -->
IC-48。旧
```text
| IC-48 | `Command Palette` | カーソル | 同・`'single-vertical'` | `FR-048` | — |
```
新
```text
| IC-48 | `Command Palette` | カーソル | 同・`'single-vertical'` | `FR-048` | `S-66`（`'single-vertical'`） | — |
```

<!-- EDIT id=E-16 file=docs/spec/_assets/tbl-glossary.md rule -->
E-03 〜 E-15 の 13 行を除く 表 T-109 のすべての行（今の木で 84 行、W4 を当てた木で 101 行）。⭐ 旧・新の塊ではなく規則で当てる —— W4 の 4 つの変更要求が行を足し・消し・書き換えるので、行ごとの旧は当てる日まで定まらない。

```text
rule: in each row line of table T-109 (a line that begins with "| IC-<n> |"
      between the heading line of E-01 and the next line that does not
      begin with "|"), put the cell " — |" in front of the LAST cell.
      the last cell is the arm column: "—" or "`AR-n`".
example (IC-10):
  old  | IC-10 | `App Header` | 表示 | 全体を 1 画面に収める | `FR-055` | — |
  new  | IC-10 | `App Header` | 表示 | 全体を 1 画面に収める | `FR-055` | — | — |
check after: every row line of table T-109 has 7 cells (tools/spec_tables.py),
             13 of them hold a cell other than "—" in 切り替える設定値.
```

⚠️ 当てる前に数えること: その表の行のうち最後の欄が `—` でも `` `AR-n` `` でもない行は 0（13 節）。0 でなければ規則が当たらない行があるので止まって調整役に問う。

---

## 5. 継ぎ目 —— 依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- Manuscript: table T-109 of docs/spec/_assets/tbl-glossary.md gains the
  column "切り替える設定値" between 正 and 構え (7 columns). A cell is
  an em dash; or `S-n`, a boolean row of table T-202, for an entry whose
  正 begins with FR-049 (the entry flips that row); or
  `S-66`（`'value'`） for an entry whose 正 begins with FR-048 (the
  entry writes that guide cursor value). 13 rows hold a cell:
  IC-4 IC-8 IC-9 IC-39 IC-40 IC-42 IC-43 IC-79 IC-80 IC-81 IC-103 (FR-049),
  IC-47 IC-48 (FR-048).
- One reader: tools/generate_icon_roster.py, public function
  entry_switches() -> [(entry row id, settings row id, value or None)] in
  table order. It refuses (non-zero exit, ASCII message, nothing written)
  on every case of CR-589 section 9.1 (a).
- One printer: tools/generate_entity_types.py, new function
  entry_switch_block(names), which IMPORTS entry_switches (it never reads
  icon-roster.json: package.json runs `types` before `icons`). Inside the
  existing <generated> region of each target, in table order:
    const VISIBLE_ELEMENT_BY_ENTRY: Readonly<Record<string, 'baselineVisible' | ...>> = {
      'IC-4': 'baselineVisible',
      ...
    }
    const GUIDE_CURSOR_MODE_BY_ENTRY: Readonly<Record<string, 'crosshair' | 'single-vertical'>> = {
      'IC-47': 'crosshair',
      'IC-48': 'single-vertical',
    }
  The value of a T-202 row is its settings.json "key" without backquotes.
  Neither name is exported (not listed in PUBLISHED_READ_BY_*).
- Targets: src/adapter/input-command-translator/input-command-translator.ts
  (both), src/adapter/screen-renderer/command-palette.ts (both),
  src/adapter/screen-renderer/app-header-items.ts
  (VISIBLE_ELEMENT_BY_ENTRY only).
- No reader casts. A lookup guards with Object.prototype.hasOwnProperty and
  returns the value or null; the value reaches VisibleElement,
  PressedGuideCursor or keyof DocumentSettings by assignment, so a key the
  code does not know fails tsc.
- commandFromEntry: no case label names these 13 entries any more. Right
  before the switch (after the steps that answer a press before any entry
  is read), the translator asks visibleElementOfEntry, then
  guideCursorModeOfEntry. If CR-579 W7 has landed by then, the two
  lookups stand next to FIXED_ACTION_BY_ENTRY. A precondition of one entry
  that must run first (CR-588 / JDG-722: IC-4 with no pre-change plan
  loaded opens the file chooser) stays ahead of both lookups.
- Behaviour does not change: the same 13 entries write the same values, and
  the palette and the header paint EN-2 / EN-6 for the same entries.
```

⚠️ **`CR-579` はこの通しに入らない**（計画）: 入口のファイルの区画と 2 つの手書きの表の名は今と同じなので、上の継ぎ目はそのまま当たる。「`generate_entity_types.py` が `generate_icon_roster.py` を取り込む」は本書が初めて行い、後に `CR-579` の W4 が同じ取り込みを使う（`fill_arms_shape`）。⇒ `CR-579` を当てる手番は、本書の後の木で自分の W4・W7 を測り直す。
⚠️ **`CR-572` が先に当たっているとき**: `S-66` は 表 T-206 にあり、`guideCursorMode` は画面の値である。欄と生成器は表の番号を問わないので変わらない —— `GUIDE_CURSOR_MODE_BY_ENTRY` を読む側の型（`PressedGuideCursor` と、パレットの読む値の出どころ）は `CR-572` の後の形に合わせる。`VISIBLE_ELEMENT_BY_ENTRY` は 表 T-202 の真偽の行だけを読み、その 11 行は `CR-572` の後も 表 T-202 に残る。

---

## 6. グラフ（`87d98a47` で測った）

### 6.1 `impact.py`（2 次まで）

| 対象 | 指している要求 / 参照 | 本書の扱い |
|---|---|---|
| 表 T-109 | 要求 29（1 次）・2 次 53・要求以外 4 節。行 97 | 列を 1 つ足し、13 行の文を直す。表を指す要求の文はどれも「表 T-109 の行・`構え`・`群`」を指し、列の数を言う要求は無い |
| `FR-049` | 要求 13 / 参照 42 | 文は変えない。表 T-109 の欄は同要求の範囲（表 T-202 の真偽の行）をそのまま使う |
| `FR-048` | 要求 3 / 参照 9 | 文は変えない |
| `S-66` | 要求 4 / 参照 6（`tbl-glossary.md:570` を含む） | `IC-47` の文から外れ、欄へ移る（参照の数は変わらない） |
| 表 T-202 | 要求 15・2 次 56・要求以外 2 | 変えない |
| `IC-4` | 0 / 1 | 欄を埋める |
| `IC-8`・`IC-9`・`IC-39`・`IC-40`・`IC-42`・`IC-43`・`IC-79`・`IC-80` | 各 0 / 0 | 同 |
| `IC-81` | 1 / 2（`FR-049`） | 同。閉路 6.2 |
| `IC-103` | 0 / 1 | 同 |
| `IC-47`・`IC-48` | 各 1 / 2（`FR-048`） | 同 |
| `LR-3` | 0 / 2 | 変えない（`構え` を名簿で運ぶ理由。新しい欄は名簿で運ばない —— 決定 6） |

触った行ごとに `rulings.md` を引いた（規則 02 の 1 節）: `IC-47`・`IC-48` → `JDG-379`（排他の選択と `EN-6`。変わらない）、`IC-81` → `JDG-79`・`JDG-198`・`JDG-245`（依存線の表示の切り替え。変わらない）、`IC-103` → `JDG-119`・`JDG-367`（変わらない）、`S-66` → `JDG-625`（`CR-572` の移し。5 節の注）、`IC-4` → `JDG-722`（決定 9）、`FR-049` → `JDG-83`・`JDG-112`・`JDG-184`・`JDG-198`・`JDG-211`・`JDG-245`・`JDG-288`（どれも描き方と独立の規則で、結び付けを変えない）。⇒ 裁かれた行とぶつかる所は無い。

### 6.2 `induced.py`

種 `T-109 FR-049 FR-048 FR-029 S-66 T-202 T-237 EN-2 EN-6 IC-47 IC-48 IC-81 IC-103 LR-3`: 14 / 14 が仕様に在り、内側の辺 17、閉路 1 —— 大きさ 2: `FR-049` ↔ `IC-81`。
⇒ 本書は `IC-81` の行（E-12）を書き、`FR-049` の文は書かない。`FR-049` が `IC-81` を指す文（「戻す入口が既に在り（表 T-109 の `IC-81`）」）は、`IC-81` の括弧の `` `S-62` `` を外しても真のまま —— 同じ手で読み合わせた。

---

## 7. 数の予測（`87d98a47` で測った。当てた後に同じ数え方で突き合わせる）

- tables: 0（列を足しても表の数は変わらない）
- rows: 0（表 T-109 は 97 行のまま —— W4 の後なら 114 行のまま）
- uids: 0
- figures: 0

測り方: `md-checks.py` を、`docs/spec` の写しと、E-01 〜 E-16 を当てた写しに掛けた —— どちらも `tables=190  figures=28  rows=2384  uids=164`、出力の全体が一致（13 節）。

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

⭐ 計画（`cr-plan-2026-09-26.md`）は、枝 `cr-organise` では仕様と生成器と変更要求だけを書き、`src` と `tests` は後の実装の持ち場で書く（「⛔ src と tests はこの枝で書かない（書くのは生成器が書く区画だけ）」）。⇒ 本書は 2 つの段に割れる。

| 段 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | W4 が着地した先端で 13 節の数え直し（旧の塊 15 が 1 回ずつ、E-16 の規則が当たらない行 0）。`CR-588` の E-18 が本書の E-03 の旧のまま着地したか、`CR-572` が先に着地したか（5 節の注）を確かめる | 調整役 |
| W4b-1 | `docs/spec/_assets/tbl-glossary.md` | E-01 〜 E-16 | 仕様の体 |
| W4b-2 | `tools/generate_icon_roster.py` と生成物 `icon-roster.json` | 9.1 節の (a)（読む関数・拒む 6 つ・見出しの並びの見張り・`構え` を見出しで読む）。`npm run gen` | 実装の体（Sonnet） |
| L4 | `tools/generate_entity_types.py`・`src/adapter/input-command-translator/input-command-translator.ts`・`src/adapter/screen-renderer/command-palette.ts`・`src/adapter/screen-renderer/app-header-items.ts`・`docs/development-rules/03-implementation.md`・`.claude/skills/spec-graph-check/check-provenance.py` と生成物 | 9.1 節の (b)、9.2 節、9.4 節の 1〜2。`npm run gen` | 実装の持ち場 L4 の体（計画の「`589` の生成の結線」）。⚠️ `generate_entity_types.py` は持ち場 L3 のファイルでもある —— 調整役が 1 本ずつ合わせる |
| L4 | `tests/`（新しい `cr-589-*.test.ts` と 9.3 節の 5 本） | 9.3 節 | ⭐ 仕様だけを読む試験の体（実装の体と別） |
| 後 | 基準線・変更履歴・台帳 | 9.4 節の 3〜5、12 節 | 調整役 |

⛔ **W4b-1 と W4b-2 は 1 つのコミットにする** —— 7 列の表を今の `generate_icon_roster.py` が読むと止まり（`len(table.headings) != len(FIELDS)`）、`npm run gen` が赤になる。逆に生成器だけ先に当てると、欄の無い表で `entry_switches` が止まる。
⚠️ **W4b の後、L4 までのあいだ、試験 5 本は設計どおり赤である**（9.3 節の「直す 5 本」—— 列の数で 3 本、括弧の設定値で 2 本）。`src` を書かない枝なので直せない。⇒ `refactor` への合流は L4 の後（計画の W2 以降と同じ扱い）。
⛔ **刷る側（9.1 節の (b)）は L4 まで足さない** —— 手書きの `VISIBLE_ELEMENT_BY_ENTRY` が残っているファイルへ同じ名を刷ると、同じ名の `const` が 2 つになり `tsc` が落ちる。刷る側と手書きの表を消す直しは同じコミットにする。
⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない。当てる段の体が直す）

### 9.1 生成器 —— 名・読むもの・書く区画・`npm` の手

**(a) 読む側: `tools/generate_icon_roster.py`**（`npm run icons` / `icons:check`。どちらも既に `gen` / `gen:check` にある）

- 新しい公開の関数 `entry_switches()`（仮の名）。表 T-109 を `spec_tables.read` で読み、欄 `切り替える設定値` を見出しで引き、`docs/spec/_source/settings.json` を読んで、表の順に `(入口の行 ID, 設定値の行 ID, 値または None)` を返す。
- ⭐ 見出しの語 `切り替える設定値` は日本語の針になる —— 同ファイルの `STATED_COUNT` と同じく、読む相手が日本語の原稿なので規則 03 の 5 節が許す形である。その理由をコメントに書く（ASCII で）。
- **拒む**（非 0 で終わり、ASCII の文で行 ID を名指し、何も書かない）:
  1. 欄が `—`・`` `S-n` ``・`` `S-n`（`'value'`） `` のどれでもない。
  2. 名指した設定値の行が `settings.json` に無い。
  3. 値の無い欄が、表 T-202 の型が真偽の行でない行を名指す（`FR-049` の「対象は型が真偽である行だけ」）。または、その入口の `正` が `FR-049` で始まらない。
  4. 値の有る欄が `S-66` でない行を名指す（定数 `GUIDE_CURSOR_ROW = 'S-66'`。`TASK_SHAPE_ARM` と同じ形の名指し）。または、その入口の `正` が `FR-048` で始まらない。
  5. `正` が `FR-049` か `FR-048` で始まる入口の欄が `—`（前文の「2 種の入口が書く設定値の行」）。
  6. 2 つの入口が同じ真偽の行を名指す、または同じ `S-66` の値を名指す（`FR-029` の「同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）」）。
- ⛔ 値が `S-66` の型の綴る値に入っているかは確かめない —— `CR-572` の後は `S-66` が 表 T-206 にあり、`settings.json` の行が型の欄を持たない（表 T-206 の行は `value` の欄を持つ）。綴りの誤りは `tsc` が落とす（9.2 節の型）。
- 名簿（`icon-roster.json`）は新しい欄を運ばない（決定 6）。`build` の「列の数 ＝ `FIELDS` の数」を「見出しの並び ＝ `FIELDS` の見出し 6 つと `切り替える設定値` を `正` の後に挟んだ並び」に替え、`icon_of` は `構え` を見出しで読む（今の `row[5]` は 1 つずれる）。名簿の見出しの文（`BANNER`）の「the SIX columns of that table」を、7 列のうち 6 列を運び、`切り替える設定値` は `tools/generate_entity_types.py` が `src` へ刷ると言う文に替える。⚠️ `icon-roster.json` で変わるのは、括弧を外した 12 行の `entryTo` の文だけの見込み（`columns` の写しは 6 列のまま、行の鍵も変わらない）—— ほかが変わったら止まって調整役に問う。

**(b) 刷る側: `tools/generate_entity_types.py`**（`npm run types` / `types:check`。どちらも既に `gen` / `gen:check` にある）

- 新しい出力の関数 `entry_switch_block(names)`（仮の名）。`generate_icon_roster.entry_switches` を取り込み、`names` に挙げた定数を 5 節の形で刷る。値の無い欄は、表 T-202 のその行の `settings.json` の `key` から逆引用符を外した綴り、値の有る欄はその値。型の和は表の順、重なりは無い（(a) の 6 が拒む）。
- コメントは ASCII（`refuse_non_ascii_comments` が見る）: `// see T-109, FR-049` と `// see T-109, FR-048`。
- `TARGETS`:
  - 入口のファイルの項 —— 出力の式の末尾に `NEWLINE * 2 + entry_switch_block(('VISIBLE_ELEMENT_BY_ENTRY', 'GUIDE_CURSOR_MODE_BY_ENTRY'))` を足し、原稿の一覧に `docs/spec/_assets/tbl-glossary.md (table T-109)` を足す。
  - 新しい項 2 つ —— `command-palette.ts`（2 つとも）と `app-header-items.ts`（`VISIBLE_ELEMENT_BY_ENTRY` だけ）。原稿の一覧は `docs/spec/_assets/tbl-glossary.md (table T-109)` と `docs/spec/_source/settings.json (table T-202)`。⚠️ この 2 ファイルにはまだ区画が無い —— `region` がファイルの末に 1 つ足す。
- 書く区画の印は、この生成器の `OPEN` ＝ `// <generated -- do not edit by hand>`、`CLOSE` ＝ `// </generated>`（1 ファイルに 1 つ）。
- `PUBLISHED_READ_BY_SRC` にも `PUBLISHED_READ_BY_TESTS_ONLY` にも載せない（どちらのファイルの外も読まない —— `JDG-139`）。

**(c) `npm` の手**: 新しい名は足さない。`types`（刷る）と `icons`（名簿）は既に `gen` / `gen:check` の列にあり、刷る側は名簿のファイルではなく関数を取り込むので、`gen` の中の順（`types` が `icons` より先）に依らない。
**なぜ新しい道具のファイルにしないか**: 0.2 節の 8 —— 入口のファイルの区画は `generate_entity_types.py` のもので、別の道具が同じ印の区画を書けば、`region` は最初の印で割るので 2 つの道具が互いの中身を上書きする。

### 9.2 `src`（毎フレームの道かどうかを添える）

| ファイル | 関数・定数（名で引く） | 直し | 毎フレーム |
|---|---|---|---|
| `src/adapter/input-command-translator/input-command-translator.ts` | `VISIBLE_ELEMENT_BY_ENTRY`・`GUIDE_CURSOR_MODE_BY_ENTRY`（手書き） | 消す（区画の生成に替わる） | いいえ |
| 同 | `visibleElementOfEntry`・`guideCursorModeOfEntry` | 名と署名を保つ。`as` を外す（5 節） | いいえ —— 入口の押しを離したとき（`translate` の `press.on !== null` → `commandFromEntry`）だけ走る |
| 同 | `commandFromEntry` | 13 の `case` を消し、`switch` の前で 2 つを引く（5 節） | いいえ（同上） |
| 同 | `ENTRY` | 消した `case` だけが読む 13 の名を消す（`frame-drags.ts`・`row-tree-entrances.ts`・`screen-state-input.ts` が読む名は残す —— 当てる体が `git grep` で確かめる） | いいえ |
| 同 | ファイルの頭のコメント（「The marked region at the bottom is generated from …」） | 原稿に `docs/spec/_assets/tbl-glossary.md` の 表 T-109 を足す | ― |
| `src/adapter/screen-renderer/command-palette.ts` | `SETTINGS_KEY_BY_ROW`（と `TRAP` の 2 行）・`GUIDE_CURSOR_MODE_BY_ROW` | 消す。`isSettingsToggleOn`・`isExclusiveChoiceChosen` は生成された 2 つを引く（`hasOwnProperty` で守る） | **はい** —— パレットの記述は描くたびに組まれる（`commandPaletteFromSession`）。定数の表を 1 回引くのを、同じ形の表を 1 回引くのに替えるだけ |
| `src/adapter/screen-renderer/app-header-items.ts` | `commandStateOf` の 3 つの腕、`BASELINE_OVERLAY_ENTRY`・`PLAN_DISPLAY_ENTRY`・`ACTUAL_DISPLAY_ENTRY` | 腕と定数を消し、`switch` の前で `VISIBLE_ELEMENT_BY_ENTRY` を引いて `{ isEnabled: true, isPressed: settings[element] }` を返す | **はい** —— `appHeaderItemsFromDocument` は描くたびに走る。`switch` の腕 1 つを表を 1 回引くのに替えるだけ |

⭐ 入口のファイルの手書きの行は減る（手書きの表 2 つ 17 行ほど ＋ `case` 13 行 ＋ `ENTRY` の 13 名）。生成した区画は `JDG-695` の 1,000 行に数えない。
⚠️ 毎フレームの道に触れる（パレットとヘッダー）。`JDG-605` の手順（節目で `GRS_PERF=1`）を当てるかは調整役が決める —— 置き換えは同じ手数の定数の引きである。

### 9.3 試験（仕様だけを読む体）

**直す 5 本**（位置と括弧を読んでいたもの —— 0.2 節の 6・7）:

| ファイル | 今 | 直し |
|---|---|---|
| `tests/system/duplicate-paste-and-dual-cursor.test.ts` | `T109_COLUMNS = 5` | 6（`T109_PURPOSE = 2`・`T109_SOURCE = 3` は動かない） |
| `tests/system/measured-sweep.test.ts` | `T109_COLUMNS = 5`・`T109_STANCE = 4` | 6 と 5（または見出し `構え` で読む） |
| `tests/system/user-reported-fixes.test.ts` | `T109_COLUMNS = 5` | 6 |
| `tests/unit/cr-386-ic-103-planned-dates-beside-the-name.test.ts` | `IC-103` の `何の入口か` が `` `S-232` `` を含む ／ パレットの入口を `何の入口か` の `` `S-62` `` で探す | 同じことを `切り替える設定値` の欄で確かめる・探す |
| `tests/unit/uf-48-write-moment.test.ts` | `NAMES_ITS_OWN_ROW`（9 つの入口の文が自分の行を名指し、`IC-48` だけが名指さない） | 13 の入口が `切り替える設定値` で自分の行を名指すことを確かめる。`IC-48` の見張りは「欄が `S-66` と `'single-vertical'` を名指す」に替える（`IC-16` は欄が `—` で、文が `` `S-72` `` を名指すまま） |

**新しく書く `tests/unit/cr-589-*.test.ts`**（期待値は仕様の欄と 表 T-202 から試験の中で引き、コードの値を写さない）:

| # | 確かめること |
|---|---|
| T1 | 欄の埋まった行は、`正` が `FR-049` で始まるなら 表 T-202 の型が真偽の行を、`FR-048` で始まるなら `S-66` と値を名指す。`FR-049`・`FR-048` の行で欄が `—` のものは無い。2 つの入口が同じ行（同じ値）を名指さない（`FR-029`） |
| T2 | `FR-049` の入口ごとに、名指した行が偽の文書で押すと真を書き、真の文書で押すと偽を書く（翻訳係を通して、13 のうち 11） |
| T3 | `IC-47`・`IC-48` を押すと欄の値を書き、同じ入口をもう一度押すと `'none'` に戻る（`FR-048`。`IC-47` の文） |
| T4 | パレットとヘッダーの入口が、名指した行が真のときだけ押された姿（`EN-2`）、ガイドカーソルの入口は欄の値が選ばれているときだけ選ばれた姿（`EN-6`）になる |
| T5 | `src` の生成の区画の外に、13 の入口の行 ID を鍵にした表が無い（`git grep` で `'IC-4':` ほか） |

⭐ 壊す試験（合わせた木の写しで —— メモ「Spec-driven tests by another agent」）: ① 刷った区画の `'IC-39'` と `'IC-40'` の値を入れ替える → T2・T4 が赤、`npm run gen:check` も赤。② `commandFromEntry` の前段の引きを外す → T2・T3 が赤。③ 写しの仕様の `IC-42` の欄を `` `S-58` `` にする → `npm run gen` が (a) の 3 で止まる。

### 9.4 規則・検査・基準線・記録

1. `docs/development-rules/03-implementation.md` の「いま原稿から生成されている定数」の一覧に 2 行（検査 30 が木の区画と数を突き合わせる）: `VISIBLE_ELEMENT_BY_ENTRY  表示の切り替えの入口が反転する 表 T-202 の真偽の鍵（表 T-109 の 切り替える設定値）` と `GUIDE_CURSOR_MODE_BY_ENTRY  ガイドカーソルの入口が書く S-66 の値（同）`。
2. `.claude/skills/spec-graph-check/check-provenance.py`（検査 21）に、3 つのファイルが `tbl-glossary.md` から生成されることを足す（入口のファイルの項は今 `settings.json` だけを名指す —— 1 つのファイルに 2 つ目の原稿を名指す形が検査 21 に無ければ、その形を決めて書く。`CR-579` の W4 も後で同じ形を使う）。
3. 検査 70 の基準線 `twin-comments-baseline.txt` から `SETTINGS_KEY_BY_ROW` の記録（3 行）を消す —— 下げ（`JDG-520`、調整役）。
4. 関数の大きさの基準線 `function-size-baseline.txt` の `app-header-items.ts::commandStateOf`（今 56 行・13 分岐）が下がれば、下げる（同）。
5. `docs/development-records/changelog.md` に 1 行（規則 02 の 7）。

---

## 10. ⛔ この変更でやらないこと

| やらないこと | なぜ |
|---|---|
| 13 行のほかの、設定値を書き換える 17 の入口の結び付けを欄へ移すこと | 決定 1。11 節の問い 1 |
| 表 T-109 を `_source/` の JSON の原稿へ移すこと | 決定 3 |
| `ENTRY`（入口の英語の名）を生成すること | 表 T-109 が英名の欄を拒む（`tbl-glossary.md` の前文「本表は英名の欄を持たない」） |
| アイコンの名簿に欄を運ぶこと | 決定 6 |
| `FR-049`・`FR-048`・表 T-202・表 T-237 の文を変えること | 欄はそれらの範囲をそのまま使う（6.1 節） |
| 振る舞いを変えること | 同じ 13 の入口が同じ値を書き、同じ入口が塗られる（5 節の最後） |
| `JDG-722`（`IC-4` で重ねる予定が無いとき）を直すこと | `CR-588`（W4）が当てる。本書は決定 9 のとおりその条件を先に残す |
| `generate_icon_roster.py` の説明の古い数（「AR-3 against eight」） | `DFC-1043`（`CR-579` の 9 節の候補） |

---

## 11. 前に立つ者へ返す問い

1. **欄を埋める範囲** —— A: `FR-049` と `FR-048` の 13 行だけ（本書。**推奨**）／ B: 設定値を書き換えるすべての入口（今の木で 30 行。巡る・刻む・選ぶ・2 つ以上を書く入口を 1 つの欄でどう書くかを行ごとに決め直す必要がある）。A の理由: 裁定の目的の 2 つの表に要る分で、`正` と 表 T-202 から仕様の中で判じられ、生成器が確かめられる。代償: 結び付けの書き方が 2 つに分かれる（前文が言う）。
2. **畳む写しの広さ** —— A: 入口の 2 表に加え、描き手の写し 3 か所（`command-palette.ts` の 2 表と `app-header-items.ts` の 3 つの腕）も生成へ（本書。**推奨**）／ B: 裁定の文言どおり入口の 2 表だけ。B なら描き手の `TRAP` を「表 T-109 の欄を直したら一緒に直せ」に書き替え、検査 70 の基準線は残す。A の理由: B では仕様の欄を直しても描き手が黙って古いまま残り、今の「両方を手で直す」より悪い（決定 5）。代償: `ScreenRenderer` の 2 ファイルに区画が増え、毎フレームの道に触れる（9.2 節）。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `JDG-691` | 0.1 節 | 今の状態の欄は「指示 —— `docs/development-records/cr-plan-2026-09-26.md` が持つ」。⚠️ その文書は `87d98a47` に無く、起草の途中に未追跡のファイルとして現れた（本書を W4b に置く）。本書が起草されたので、調整役が「指示 —— `CR-589` が当てる」へ書き替えるかを決める（⛔ 本書は `rulings.md` を触らない） |
| `JDG-695` | 0.1 節 | 引いただけ |
| `DFC-1041` | 表 T-109 が結び付けを文の中にしか持たず、コードが打ち直している | `87d98a47` の `defects.md` にはまだ無い（`CR-579` の 9 節が「台帳へ起こす候補」とし、同書を当てる手番が書く —— その手番はこの通しに入らない）。⇒ 調整役が起こし、L4 の着地で閉じる |
| 検査 70 の基準線の `SETTINGS_KEY_BY_ROW` | `command-palette.ts` の写し | 本書を当てて消す（9.4 節の 3） |

新しい `JDG`・`DFC` の行は起こさない。

---

## 13. 測り方の再現

スクリプトはセッションのスクラッチの置き場にあり、木には無い（`CR-554` の 13 節と同じ扱い）。

```text
# the tree: cr-organise 87d98a47 (2026-09-26); rulings.md carries the coordinator's uncommitted JDG-691 row

# the table, the column readers and the join in src
git grep -n "表 T-109 —" -- docs/spec                                  # tbl-glossary.md:504
git grep -n "VISIBLE_ELEMENT_BY_ENTRY\|GUIDE_CURSOR_MODE_BY_ENTRY\|SETTINGS_KEY_BY_ROW\|GUIDE_CURSOR_MODE_BY_ROW\|BASELINE_OVERLAY_ENTRY\|PLAN_DISPLAY_ENTRY\|ACTUAL_DISPLAY_ENTRY" -- src
git grep -n "T109_COLUMNS\|T109_STANCE\|cells.length - 1" -- tests       # section 0.2 item 6
git ls-tree 87d98a47 docs/development-records/cr-plan-2026-09-26.md     # nothing: the plan JDG-691 names is not in the commit
#   (it appeared later in the working tree, untracked, during drafting)

# row widths (display columns, CJK = 2)
python scratchpad/draft/589-widths.py docs/spec/_assets/tbl-glossary.md
#   97 rows; median 89, max 437; added cell +4 (em dash), +10 (`S-227`), +32 (IC-47 / IC-48)

# the post-W4 copy and the old blocks, built from the tree and from CR-561 N-20, CR-562 E-13/E-28,
# CR-571 4.3 and CR-574 4.5 (CR-574's rows are its draft text; CR-561's IC-108 surface is a stand-in)
python scratchpad/draft/589-build.py <repo> scratchpad/draft
#   today    rows 97,  problems 0, em dash inserted 84  (last cells: — 62, AR-2 4, AR-3 15, AR-4 1, AR-5 1, AR-6 1)
#   post-W4  rows 114, problems 0, em dash inserted 101 (last cells: — 79, AR-2 4, AR-3 15, AR-4 1, AR-5 1, AR-6 1)
# this file's own blocks, parsed from the CR and applied to both trees
python scratchpad/draft/589-count-cr.py <repo> change-request/CR-589-*.md scratchpad/draft/589-postw4-glossary.md
#   edits parsed: 15 (E-01 .. E-15)
#   post-W4 copy:              15 old blocks, each once; E-16 rows 101 (last cell not em dash/AR: 0);
#     after: 7 headings, 114 rows, 7 cells per row, filled 13
#   tbl-glossary.md (87d98a47): 14 old blocks once, E-03 0 times (expected: its old is CR-588 E-18 new);
#     E-16 rows 85 (IC-4 included), last cell not em dash/AR: 0; after: 7 headings, 97 rows, 7 cells per row
#   (the post-W4 copy also takes CR-588 E-18 verbatim; CR-588 is a draft of 2026-09-26 18:24)
python scratchpad/draft/589-verify-table.py <repo> <after-today> <after-post-W4>
#   headings 7; 97 and 114 rows, every row 7 cells; 13 filled

# counts on a copy of docs/spec (before, and with E-01..E-16 applied)
python .claude/skills/spec-graph-check/md-checks.py <copy-root>
#   tables=190  figures=28  rows=2384  uids=164, both; the whole output identical

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-109 FR-049 FR-048 S-66 T-202 IC-4 IC-8 IC-9 IC-39 IC-40 IC-42 IC-43 IC-79 IC-80 IC-81 IC-103 IC-47 IC-48 LR-3
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py T-109 FR-049 FR-048 FR-029 S-66 T-202 T-237 EN-2 EN-6 IC-47 IC-48 IC-81 IC-103 LR-3
#   14 of 14, 17 edges, 1 cycle: FR-049 IC-81

# rulings reached: rulings.md rows naming each touched row id (section 6.1)
```
