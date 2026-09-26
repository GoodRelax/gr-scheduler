# CR-572 — ファイルは日程表の見せ方だけを持つ —— 見る人の画面の値と道具の定数を `documentSettings` から外す

> 起草の状態: 起草した（2026-09-26）。利用者の裁定 `JDG-603`（仕分けの変更要求を起こす）と、本書のために問うた `JDG-620` 〜 `JDG-626`（逐語は 0.1 節）を受けた。⭐ `JDG-626` がモノクロを文書の中身へ戻した（`JDG-621`・`JDG-625` の一部を覆した）。⛔ 仕様・コード・見本はまだ 1 文字も変えていない。
> 読んだ木: `refactor` 70be9db6 を `git archive` でスクラッチへ写した木で測った（13 節）。起草したワークツリーは別の起点で切られていたので、測った数はどれも `refactor` の先端のものである。⛔ 当てる前に、その時点の `refactor` の先端で測り直すこと。
> 測り直し（2026-09-26、`CR-570` の着地後の `refactor` b6292bb0）: 16 節の旧の塊はすべて同じ行番号のまま逐語で在った。鍵は 112（内容 26・好み 3・画面だけ 1・定数 82）、`edit-document-settings.ts` の命令は 16 種・書く鍵は 30（`CR-570` の `CM-86` `setLevelZeroTreeState` が 1 つ足した）、書き手はほかに増えていない。3.4 節の数は 2 つを直した（下の注）。数は 2 通りの数え方で突き合わせた。
> ID の帯: 調整役から `CR-572`・`JDG-620` 〜 `JDG-629`・`DFC-995` 〜 `DFC-997` を受けた。新しい名はどれも仮である（2 節）。
> ⛔ 当てる順: `CR-570` の後。`CR-570` は `documentSettings` に鍵を 1 つ足し（`JDG-600`。本書は `CR-570` が付ける仮の名で呼ぶ）、`settings.json`・文書スキーマ・`src`・見本を書き換えている最中である。同じファイルを同時に触らない。`CR-570` が足す鍵は「内容」に分ける（3.1 節）。
> 閉じるもの: `DFC-995`（仮。12 節）—— `S-124` を 1000 → 150 に変えても（`JDG-602`）、その前に保存した `GRS JSON` を開くとツールチップは 1000ms のまま出る。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-603` | 「C: 111 項目を仕分ける (Recommended)」 | `documentSettings` の項目を「文書の中身」と「見る人の好み」に仕分け、好みはファイルに書かない | 本書の骨格 |
| `JDG-620` | 「定数へ移す (Recommended)」 | 画面のどの操作も書き換えない 82 鍵は、ファイルに書かず、道具の定数にする | 3.1 節の「定数」、4.1 節 |
| `JDG-621` | 「明暗テーマ・モノクロ箱のみ。 文字サイズは.json  ※理由: 適切な文字サイズはプロジェクトによる。」 | 明暗テーマとモノクロは見る人の好み。文字サイズ（S/M/L）は文書の中身としてファイルに残す | ⚠️ モノクロの部分は `JDG-626` が覆した。文字サイズは生きている |
| `JDG-622` | 「保存しない (Recommended)」 | 2 本カーソルの 2 つの日付はファイルにも保存しない。モードの中だけの画面の値 | 4.4 節（`DC-1`） |
| `JDG-623` | 「中身を見て決めさせろ。 候補を列挙せよ」 | 好みの置き場は、項目ごとに候補を並べて決める | 項目ごとに問い、`JDG-624`・`JDG-625` を得た |
| `JDG-624` | 「ブラウザの初期値だけ。 覚えないにしたいかな。  理由: 昼と夜でライト/ダークを変えるユーザーもいる。」 | 明暗テーマは起動のたびにブラウザの明暗（`prefers-color-scheme`）に従い、押した切り替えはどこにも覚えない | 4.3 節 |
| `JDG-625` | 「定数だけ」（モノクロ・ガイドカーソル・プロパティパネルの幅の 3 問に同じ答え） | 3 つは覚えない。起動のたびに定数の初期値から始まる | ⚠️ モノクロの部分は `JDG-626` が覆した。ガイドカーソルとプロパティパネルの幅は生きている（4.3 節） |
| `JDG-626` | 「明暗テーマは好み。 プロジェクトのテーマカラーとモノクロは、.jsonに保存 とする。 理由: 色はプロジェクトによって変わる。 明暗は人によって変わる。」 | 明暗テーマ（`S-72`）は見る人の好み。モノクロ（`S-74`）はプロジェクトのテーマカラー（`themeHue`、`DR-5`）と同じく文書に保存する | 3.1 節の「内容」、4.3 節。11 節の 2 つの確認を閉じた |
| `JDG-601` | 「まってー。 読み替えの仕様は検討無用。 まだGRSは運用を開始してない。」 | 古い形式の読み替えを作らない。見本・起動テンプレート・骨組みは新しい形へ書き直す | 3.5 節。⭐ 読み替えは要らない —— `OP-6` が既に「知らない鍵は捨てる」と定める |

### 0.2 調べた結果

**測り方**（13 節に再現の手順）: 文書スキーマ `grs-document.schema.json` の `properties.documentSettings.properties` の鍵を全部並べた。それぞれを `settings.json` の行と、鍵の欄の綴りで突き合わせた（入れ子の 2 鍵 `fontScaleSizes`・`shapeHeightOf` は行を手で当てた）。画面から書き換わるかどうかは、人の操作で新しい値を書く唯一の場所 `src/use-case/edit-document/edit-document-settings.ts` の命令 15 種が書く鍵で決めた（設定パネルは読むだけ —— `properties-panel.ts` の `isEditable: false`、`FR-072`）。⚠️ `documentSettings` を書く所はほかに 3 つある（`e1b8bab2` で測り直した体が見つけた）—— 取り消し・やり直しで 20 鍵を今の値のまま運ぶ `columnsOutsideHistory`（`document-change-plan.ts`）、行を消したときにピン止めとスクロールの行 id を掃除する `editTaskGroup` の `deleteTaskGroup`（`edit-task-group.ts`）、取り込みで `documentSettings` を丸ごと差し替える・合わせる `replacedDocument`・`mergedDocument`（`import-document.ts`）。どれも値を運ぶか消すだけで、人の選択から新しい値を作らないので、分類は変わらない。⚠️ 取り込みの差し替えこそが、古いファイルの凍った値が入ってくる道である。

1. **111 鍵のうち、画面の操作で書き換わるのは 29 鍵だけである。** 残りの 82 鍵は、どの命令も書かない。ファイルに入る値は、そのファイルを最初に書いた `GRS` の既定値そのものである。
   - 例: 利用者が `JDG-602` で `S-124` を 150 にした。その前に保存した `.json` を同僚に渡すと、同僚の `GRS` が新しくても 1000ms で出る。値の正は 1 行なのに、ファイルの数だけ写しがある。
   - 同じことが既に起きている: 見本 `sample-schedule/No Name.json` と `Three-Year Product Plan.json` は 104 鍵、案内の骨組み `docs/guides/schedule-to-grs-json/grs-skeleton.json` は 105 鍵、起動テンプレート `startup-template.json` は 111 鍵を持つ。どれも書いた日の版の写しである。
2. **反証 —— 「どの値も文書に保存する」と決めた記録は在った。**
   - 前プロジェクトの Decision Record `previous-project-result/02-data-model/grs-document-settings-ja.md` の §1 が「値を変えたとき、画面の表示または出力が変わるなら `documentSettings` に入れる」という 1 つの検査を定めた。111 鍵がすべて入っているのはこの検査による。⭐ 本書はこの検査を 3.0 節の物差しに置き換える。
   - 同書は「`themeHue`・`themeMonochrome` を保存する理由 —— 色のテーマはプロジェクトのテーマカラーである（ユーザー判断、確定 2026-08-01）」「`themePreference` も同じ枠」と書く。⭐ 利用者はこの記録を見たうえで（`JDG-626`）、`themePreference`（明暗）だけを覆した —— 「色はプロジェクトによって変わる。明暗は人によって変わる」。`themeMonochrome` は保存し続け、`themeHue` は `DR-5` のまま日程データの群に残る（本書は触らない）。
   - `JDG-123` は、表示の倍率 `displayScale` について推奨の「見る人ごと」を覆して「倍率は保存する。プロジェクトの規模によって適切な出力倍率が変わる」とした。`JDG-131` も行見出しパネルの幅と字下げについて同じ理由を述べた。⭐ 本書は両方を「内容」に置き、覆さない。`JDG-621` の文字サイズの理由も同じ形である。
   - `FR-039` は「保存値は初期値である。変更した結果は文書の編集として保存される」と明暗・文字サイズ・倍率の 3 つに定める。⭐ 明暗について覆す（4.3 節）。
   - `WY-1` は「書き出した JSON を読み直すと描画領域が同じ（倍率と表示位置を含む）」を求め、例外を「読む人の環境に属する表示状態（全数は表 T-206）」とする。⭐ 本書は例外の側に 4 鍵を移すだけであり、`WY-1` の文は変えない。
   - `FR-025` の理由の段は「サイズを文書に保存するのは、同じ JSON から同じ出力を得るためである」と書く。⭐ 82 鍵を定数にすると、この約束は「同じ JSON を同じ版の `GRS` で開けば同じ出力」に変わる。`LM-15` は既に「同じ刻印なら同じ絵」を約束していないと書いている。4.5 節で `FR-025` の理由を書き直す。
   - `DR-5` は「そのプロジェクトの属性であって、読む人の好みではない」と、本書と同じ物差しを既に使っている。
   - 表 T-206 の `S-99`（表示言語、`FR-038`）と `S-99b`（`Agent API` の有効化 —— 「有効化は読む人の判断であって文書の内容ではない」）は、読む人の値をファイルに書かない先例である。
3. **読み替えは要らない。** `OP-6` は「`documentSettings` は、この造りのスキーマが解釈できるものだけを読む。知らない鍵（退役した鍵を含む）は捨てる」と定める（`CR-565`、`JDG-425`）。今のファイルを新しい版で開くと、82 鍵と 4 鍵はそのまま捨てられる。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-4`（すぐわか、`GL-006`）—— 道具を直したら、どのファイルを開いても直った動きになる。今は、ツールチップの待ち時間を縮めても、古いファイルを開いた人には縮まらない。
- `CH-5`（単一の `.html` で完結、`GL-005`）—— `GRS` の利用者はファイルをダウンロードするだけで、git も GitHub も使わない。直った道具を受け取れば済み、手元の `.json` を作り直させない。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- `R1.3`（唯一の正）: 82 鍵は値の正が `settings.json` の 1 行とファイルの写しの 2 つに割れている。⇒ 本書が直す本体である。
- `R1.2`（曖昧な表現）: `FR-063` の「見せ方」の定義（「全体を収める表示と表示の切り替えを揃えれば同じ描画に戻せるもの」）は、定数も含むように読める。⇒ 4.2 節で「人が文書に対して選んだもの」に絞る。
- `R2.1`（命名）: 動かす 4 鍵は名を変えない。今の綴りのまま画面の値になる。新しい名は生成する定数の束 1 つだけである（2 節、仮）。
- `R2.9`（YAGNI）: 好みを覚える別枠（`localStorage`）を足す案は、利用者が項目ごとに退けた（`JDG-624`・`JDG-625`）。⇒ 本書は別枠を 1 つも足さない。
- `R4.3`・`R4.4`（状態遷移）: 4 鍵が文書から画面の値へ移ると、取り消し（`UN-13`）と未保存の印（`FR-100`）と刻印（`FR-063`）から外れる。⇒ 3.3 節で行ごとに挙げた。状態機械は足さない（どれも 1 つの値を置き換えるだけで、状態の組み合わせを持たない）。

### ③ 利用者に問わずに決めたこと

1. **仕様の造り —— 行を 1 行ずつ移すのでなく、表ごと「保存しない」へ付け替える。** 比べた案:

   | 案 | 何をするか | 動く行 | 決め手 |
   |---|---|--:|---|
   | **A（採る）** | 生成器 `erd_json_to_schema.py` の表 → 群の対応で、表 T-201・T-204・T-205・T-208・T-210 〜 T-215 を `notStored` にする。例外の 7 行だけを表から表へ移すか退かせる | 7 | 今の仕組み（表 T-207・T-236 は表ごと定数）と同じ形。行 ID も表の話題別の並びも変わらない |
   | B | 定数になる 82 行を 1 行ずつ表 T-206 へ移す | 82 | 表 T-206 が 147 → 229 行になり、「表 T-201 の `S-18`」と書く文がすべて腐る |
   | C | 各行に「置き場」の列を足し、生成器が表でなく列を読む | 0（列 111） | 行ごとに自分の置き場を名乗れて最も丈夫だが、`settings.schema.json`・両方の生成器・刷る表の形が変わり、手間が A の数倍 |

2. **`GRS JSON` の形式の版（`schemaVersion`）は上げる。** 鍵が減るので、書き出す形が変わる（`FR-024`）。古い版が新しいファイルを読むと、欠けた鍵を既定値で補う（`OP-6`）ので開ける。
3. **`Agent API` から 4 つの命令を外す。** `CM-59`（ガイドカーソル）・`CM-60`/`CM-61`（2 本カーソル）・`CM-63`（明暗）は、文書への命令の全数（表 T-108）から退き、画面の値の出来事（`state-machines.json` の原稿、`displayLanguageChosen` と同じ形）になる。`CM-67`（パネル幅）は行見出しパネルの幅だけを書く命令になる。`Agent API` は文書を書く口なので（`AG-8`）、見る人の画面の値には届かない。`CM-64`（モノクロ）は文書への命令のまま残る（`JDG-626`）。⚠️ 今、Agent から明暗を切り替えている呼び手があれば効かなくなる —— 運用前なので呼び手は無い（`JDG-601`）。
4. **表 T-203 の `S-127` `pinnedRowMax`（ピン止めの上限）は表 T-211（構造の上限）へ移す。** どの命令も書かない上限であり、並びの話題も T-211 が近い。
5. **目盛の 2 鍵 `S-2` `rulerHeight`・`S-3` `rulerFont` は表 T-202 の `S-70` `fontScale` の隣へ移し、保存し続ける。** `FR-039` が「目盛の文字と帯の高さは、それぞれ独立したキーとして保つこと（MUST）—— UI を試したうえで固定の定数へ戻す道を残すため」と定め、文字サイズに追随して書き換わる。文字サイズは内容に残る（`JDG-621`）ので、2 鍵も内容である。

---

## 1. 範囲 —— 要求ごとの行き先

| 要求・表 | 何が変わるか | 節 |
|---|---|---|
| `settings.json`（刷り物 `tbl-settings.md`） | 表 T-201・T-204・T-205・T-208・T-210 〜 T-215 の見出しと前の段に「文書には保存しない」を書く。7 行を移すか退かせる | 4.1 |
| `erd_json_to_schema.py` と `grs-document.schema.json` | 表 → 群の対応を付け替え、スキーマを作り直す（111 → 25 鍵。`CR-570` の 1 鍵を足して 26） | 4.1 |
| `FR-063` | 「見せ方」の定義を「人が文書に対して選んだもの」に絞り、道具の定数を除く | 4.2 |
| `FR-039` | 明暗を文書の値から外す。文字サイズと倍率は今のまま | 4.3 |
| `FR-041`・`FR-048`・`FR-052`・`FR-082` | 明暗・ガイドカーソル・プロパティパネルの幅・2 本カーソルの置き場の文（モノクロの文は変えない） | 4.3・4.4 |
| 表 T-027（`UN-12`・`UN-13`・`UN-16`） | 取り消しの対象から明暗とガイドカーソルを外す。2 本カーソルとパネル幅の「保存するが戻さない」を消す | 4.6 |
| `FR-025` | 理由の段の「同じ JSON から同じ出力」を「同じ版の `GRS`」に絞る | 4.5 |
| 表 T-108（`_assets/tbl-glossary.md`） | `CM-59`・`CM-60`・`CM-61`・`CM-63` を退かせる（画面の値の出来事へ）。`CM-67` は行見出しパネルの幅だけ | 4.7・16 |
| `05-07-design.md` | 表 T-064 の `PI-2`（公開する定数の束）、`PI-39` の `ScreenSession`（4 つの値）、6.1 節 | 4.8 |
| `display-words.json` | 設定パネルに並ぶ 86 鍵の語を消す（パネルは 25 鍵を並べる） | 4.8 |

---

## 2. 新しい識別子（どれも仮 —— 調整役がコミットの前に詰める）

| 仮の名 | 何か | 置き場 |
|---|---|---|
| `SETTINGS_CONSTANTS` | 定数になる 82 鍵の値。鍵の綴りは今のまま。`tools/generate_entity_types.py` が表から生成する | `src/entity/document-model/document-settings/document-settings.ts`（生成の区画） |
| ― | 新しい表・行 ID・接頭辞は無い。行は ID を保ったまま表を移る | ― |

⚠️ 生成器に群を足すこと —— 表の行は、`tools/generate_entity_types.py` が群として並べたときだけ `src` に届く（`gen:check` はそれが無くても緑のまま）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

### 3.0 物差し（Decision Record §1 の 1 つの検査を置き換える）

| 問い | 答え | 分類 |
|---|---|---|
| ① 画面の操作（表 T-108 の命令）で書き換わるか | いいえ | **定数** —— 誰も選んでいない。ファイルの値は書いた版の既定値の写し |
| ② はいのとき、その値は日程を作った人の選択であり、ファイルを受け取った人にも同じに見せたいか | はい | **内容** —— ファイルに書く |
| ② が「いいえ」—— 見る人の目・時刻・画面の広さに依るか、モードの中だけの値か | はい | **好み**（覚えない）／ **画面だけ** |

### 3.1 111 鍵の行き先（全表は 14 節）

| 分類 | 数 | 鍵（行） | 行き先 |
|---|--:|---|---|
| 内容 | 25 | 表示の切り替え 11（`S-60`〜`S-64`・`S-67`〜`S-69`・`S-227`・`S-228`・`S-232`）・`stackDirection`（`S-58`）・`fontScale`（`S-70`）・`rulerFont`（`S-3`）・`rulerHeight`（`S-2`）・`displayScale`（`S-234`）・`zoomX`/`zoomY`（`S-75`・`S-76`）・スクロール 4（`S-77`・`S-78`・`S-176`・`S-177`）・`rowTitlePanelWidth`（`S-79`）・`pinnedGroupIds`（`S-126`）・`themeMonochrome`（`S-74`、`JDG-626`） | ファイルに残る。⭐ `CR-570` が足す段 0 の畳みの鍵（`JDG-600`）もここに入る |
| 好み | 3 | `themePreference`（`S-72`）・`guideCursorMode`（`S-66`）・`propertyPanelWidth`（`S-80`） | 画面の値（`ScreenSession`）。覚えない |
| 画面だけ | 1 | `dualCursor`（`S-65`） | 画面の値。モードを出ると消える（`DC-7`） |
| 定数 | 82 | 表 T-201 の 58 鍵（`S-2`・`S-3` を除く全部）・表 T-204 の 2・T-205 の 6・T-208 の 2・T-210 の 2・T-211 の 5・T-212 の 2・T-213 の 1・T-214 の 2・T-215 の 1（入れ子 `fontScaleSizes`）・`S-127` | `SETTINGS_CONSTANTS` |

### 3.2 仕様の行・文

| 旧 | 新 |
|---|---|
| 生成器の対応 `T-201`・`T-204`・`T-205`・`T-208`・`T-210`〜`T-215` → `documentSettings` | → `notStored` |
| 表 T-201 の `S-2`・`S-3` | 表 T-202 の `S-70` の後（保存する） |
| 表 T-202 の `S-65`・`S-66` | 表 T-206（保存しない） |
| 表 T-203 の `S-72` | 表 T-206（保存しない）。⭐ `S-74` は表 T-203 に残る（`JDG-626`） |
| 表 T-203 の `S-80` `propertyPanelWidth`（`0` は「まだ広げていない」） | 退かせる。画面の値の初期値は表 T-206 の `S-171`。`S-248`（床）は今のまま。⚠️「本行が `S-248` を下回る文書では `S-171` の幅で描く」の段（`FR-052`）は、文書の値が無くなるので消す |
| 表 T-203 の `S-127` | 表 T-211 |
| 表 T-206 の `S-99h`（面を出しているか）の文のうち `S-80` を指す部分 | `S-171` と画面の値を指す |
| `FR-039` の「保存値は初期値である。変更した結果は文書の編集として保存される」（明暗・文字サイズ・倍率の 3 つに掛かる） | 文字サイズと倍率だけに掛ける。明暗は 4.3 節 |
| `FR-063` の「見せ方」の定義 | 4.2 節 |
| `FR-025` の理由の段「サイズを文書に保存するのは…」「値そのものは見せ方の群として文書が持つ」 | 4.5 節 |
| `DC-1` の「文書が 2 つの日付を持つ」 | 画面の値が持つ |
| 表 T-206 の前の段「表示言語は文書に保存しないので…1 つの値が両方を満たさねばならない」 | 変えない（しきい値は定数のまま） |

### 3.3 命令・取り消し・未保存・刻印

| 旧 | 新 |
|---|---|
| 表 T-108 の `CM-59`・`CM-60`・`CM-61`・`CM-63`（群「見せ方の群」） | 退かせる。表 T-108 は文書への命令の全数なので、画面の値を書くものは載らない —— 画面の値の出来事（16.9 節）へ |
| `CM-67` `setPanelWidths`（行見出しパネルとプロパティパネルの 2 つの幅を書く） | 行見出しパネルの幅だけを書く。プロパティパネルの幅は画面の値。⭐ `FR-052` の「2 つの幅の和が行の領域を 0 以下にしない」は、書く側でなく描く側で守る |
| `UN-13`「文書全体の設定の変更 —— テーマ（`FR-041`）・文字サイズ・積む向き・ガイドカーソル（`FR-048`）…」 | 明暗（`FR-039`）とガイドカーソルを外す。モノクロ（`FR-041`）を含む残りは今のまま |
| `UN-12`（2 本カーソルの位置は保存するが戻さない） | 行を退かせるか、「保存も取り消しもしない」へ書き直す（当てる体が表 T-027 を読んで選ぶ。どちらでも同じ動き） |
| `UN-16`「パネル幅」 | 行見出しパネルの幅だけ（保存する・戻さない、は今のまま） |
| `FR-100` の未保存の印 | 明暗・ガイド・2 本カーソル・プロパティパネルの幅を変えても立たない（モノクロは今のまま立つ）（文書を書かないので、規則の文は変えずに済む —— 当てる体が確かめる） |
| `FR-063` の「どちらの群であれ動いた刻」 | 同上。4 つの値を変えても動かない ⇒ `AG-6` の監視に通知されない |

### 3.4 試験（`refactor` 70be9db6 で数えた）

- 定数になる 82 鍵を名で書く所（b6292bb0）: `tests/` に 1,355 か所、`src/` に 281 か所（生成物 4 ファイルを完全なパスで除く、`git grep -c -w <鍵>`）。好みと画面だけの 4 鍵: `tests/` 269・`src/` 57（好み 37・画面だけ 20）。⚠️ 起草の版の 279・47 は数え方の誤りだった —— 生成物をファイル名の末尾（`document-settings.ts`）で除いたので、手書きの `edit-document-settings.ts` まで除いていた。⭐ 多くは `SETTINGS_DEFAULTS` から設定を組む試験なので、鍵の読み先が変われば試験の組み立ても動く。
- 4 鍵を文書の編集として確かめている試験（取り消し・未保存・刻印）は、新しい規則では偽になる。⇒ 書き直すのは実装の体、新しい規則を書くのは仕様だけの試験の体（8 節）。

### 3.5 見本・起動テンプレート・骨組み（`JDG-601`: 読み替えず書き直す）

| ファイル | 今の鍵の数 | 新 |
|---|--:|---|
| `src/framework/single-html-shell/startup-template.json` | 111（b6292bb0 で 112） | 26 |
| `sample-schedule/No Name.json` | 104（b6292bb0 で 105） | 同上 |
| `sample-schedule/Three-Year Product Plan.json` | 104（b6292bb0 で 105） | 同上 |
| `docs/guides/schedule-to-grs-json/grs-skeleton.json` | 105（b6292bb0 で 106） | 同上 |

⭐ `sample-large-erp-program.ja.xml` は MSPDI なので `documentSettings` を持たない。触らない。

---

## 4. 書き直す所（案の文 —— 当てる体が旧・新の塊へ起こす）

### 4.1 `settings.json` と生成器

- 表 T-201・T-204・T-205・T-208・T-210 〜 T-215 の見出しに、表 T-207 と同じく「（成果物に埋め込む定数、文書には保存しない）」を付ける。
- 表 T-201 の前の段に 1 文: 「本表の値は、画面のどの操作も書き換えない。ファイルに写しを持たせると、書いた版の値が残り、道具を直しても直らない（`JDG-620`）。」
- 生成器 `erd_json_to_schema.py` の対応表（`'T-201': ('documentSettings', None)` ほか 10 行）を `('notStored', '<見出しの語>')` へ。`--report` で鍵の数が 25 になることを確かめる。
- `tools/generate_entity_types.py` に、`notStored` へ移った表の鍵と値を `SETTINGS_CONSTANTS` として刷る群を足す。範囲（`SETTINGS_BOUNDS`）は定数には要らないので刷らない —— ⚠️ `S-124` の下限 100 のような範囲の欄は、表の文として残る（値を選び直すときの目安）。

### 4.2 `FR-063` の「見せ方」の定義（`R1.2`）

旧: 「見せ方」とは、同じ日程データから、全体を収める表示（`FR-055`）と表示の切り替え（表 T-202）を揃えれば同じ描画に戻せるもののことである。
新（案）: 「見せ方」とは、人がこの文書に対して選び、ファイルを受け取った人にも同じに見せる値のことである —— 全数は `_assets/tbl-settings.md` のうち文書に保存する表が持つ。⛔ 画面のどの操作も書き換えない値（道具の定数）と、見る人の画面の値（表 T-206）を見せ方に入れてはならない（MUST NOT） —— 前者はファイルに書いた版の写しになって道具の直しが届かず、後者は受け取った人の画面を書いた人の好みで上書きする。

### 4.3 明暗・ガイドカーソル・プロパティパネルの幅（`FR-039`・`FR-048`・`FR-052`）

- 明暗（`JDG-624`）: 起動したとき、ブラウザが伝える明暗（`prefers-color-scheme`）で描くこと（MUST）。読めないときはライト。押した切り替えは、そのページを閉じるまで効き、ファイルにもブラウザにも覚えてはならない（MUST NOT） —— 昼と夜で明暗を変える人がいる。⭐ `FR-039` の「文書に保存された値が読む人の指定を強制してはならない」は、文書が明暗を持たなくなるので、文字サイズと倍率に掛かる文として残す。
- ガイドカーソル・プロパティパネルの幅（`JDG-625`）: 起動のたびに表 T-206 の初期値（ガイドは `none`、幅は `S-171`）から始める。覚えない。
- モノクロ（`JDG-626`）: 今のまま文書の値である —— `FR-041` の文も `CM-64` も変えない。色はプロジェクトによって変わるので、テーマカラー `themeHue` と同じくファイルが持つ。
- 書き出す画像（`FR-080`）: 明暗は書き出した人の画面の値で描き、モノクロは文書の値で描く —— `JDG-123` の「見たままを書き出す」のとおり。

### 4.4 2 本カーソル（`FR-082`・`DC-1`・`DC-7`、`JDG-622`）

`DC-1` の「文書が 2 つの日付を持つ」を「画面の値が持つ」へ。`DC-7`（モードを出たら 2 本を消す）は今のまま。ファイルにも取り消しにも入らない。

### 4.5 `FR-025` の理由の段

旧: 「サイズを文書に保存するのは、同じ JSON から同じ出力を得るためである。…固定と保存は両立する —— …値そのものは見せ方の群として文書が持つ（`FR-063`）。」
新（案）: 「サイズを固定するのは、同じ JSON を同じ版の `GRS` で開けば同じ出力を得るためである。サイズは道具の定数であり、文書は持たない（`JDG-620`） —— 文書が持つと、書いた版のサイズが残り、道具を直しても直らない。」

### 4.6 表 T-027

3.3 節の 3 行。

### 4.7 表 T-108

`CM-59`・`CM-60`・`CM-61`・`CM-63` を退かせる（⚠️ 起草の初版は「群の欄を画面の命令の群へ」と書いたが、表 T-108 は `DocumentCommand` の全数であり、画面の命令の群は無い —— `e1b8bab2` で測った）。`CM-67` の要旨を「行見出しパネルの幅を変える」へ。塊は 16.8 節。

### 4.8 設計（`05-07-design.md`）と語

- 表 T-064 の `PI-2`: 公開するものに `SETTINGS_CONSTANTS` を足す。
- `PI-39` の `ScreenSession`: 4 つの値（`themePreference`・`guideCursorMode`・`dualCursor`・`propertyPanelWidth`）を持つ。
- 6.1 節（文書スキーマ）: 鍵の数を書いている文があれば直す（生成器の `--report` の数で）。
- `display-words.json` の `settings` の語: 設定パネルは `SETTINGS_DEFAULTS` の鍵を並べる（`properties-panel.ts` の `settingsFields`）ので、86 鍵の語は使われなくなる。消す。

---

## 5. 継ぎ目 —— 依頼文にこのまま写すこと

```
SEAM (verbatim in every brief of waves 2a..2d and 3)
- DocumentSettings keeps exactly the stored keys: the 25 of section 3.1
  (plus the key CR-570 adds for the level-zero fold). Nothing else.
- SETTINGS_CONSTANTS (provisional name) is generated into
  src/entity/document-model/document-settings/document-settings.ts and holds
  the 82 constant keys with today's spellings and today's defaults.
  A reader of one of those keys reads SETTINGS_CONSTANTS.<key> directly.
  Never merge the constants into a settings object, and never read them
  from a document.
- ScreenSession (PI-39) gains themePreference, guideCursorMode,
  dualCursor, propertyPanelWidth, same spellings.
  themePreference starts from prefers-color-scheme (light when unread);
  the other three start from table T-206.
  None of these four is written to a file, localStorage, the undo
  history, the unsaved mark or the stamp.
- themeMonochrome stays a stored key of DocumentSettings (JDG-626): saved,
  undoable, an unsaved edit, exactly as today.
- CM-59, CM-60, CM-61, CM-63 leave table T-108 and become screen-value
  events (like displayLanguageChosen); CM-64 stays; CM-67 writes
  rowTitlePanelWidth only.
- columnsOutsideHistory (document-change-plan.ts) carries 20 keys across
  undo/redo; drop propertyPanelWidth and dualCursor from it (they leave
  DocumentSettings). Keep the other 18.
- No reading conversion (JDG-601): OP-6 already drops unknown keys.
```

---

## 6. グラフ（`refactor` 70be9db6 の写しの木で測った）

- `induced.py`（本書が名指す 42 の対象、42 がすべて仕様に在る）: 内側の辺 45、閉路 2。
  - 大きさ 2: `CM-64` ↔ `FR-041` —— `JDG-626` の後はどちらも書き換えない（モノクロは文書の値のまま）。`FR-041` に明暗の文があれば、そこだけを書く。
  - 大きさ 6: `FR-039`・`FR-052`・`S-171`・`S-2`・`S-3`・`S-80` —— 1 つの計画で 1 度に書く（波 1 の中の 1 手）。
- `impact.py`（行と要求、2 次まで）: `FR-039` を指す要求 20 件・参照 60 か所、`FR-041` 6 件・28 か所、`FR-063` 7 件・22 か所、`FR-052` 7 件・18 か所、`FR-048` 3 件・9 か所、`WY-1` 6 件・7 か所、`S-80` 1 件・9 か所、`S-127` 4 件・9 か所、`DC-1` 2 件・6 か所、`CM-59`〜`CM-63`・`CM-67` はどれも 0 件（`CM-64` は 1 件）。
- ⚠️ 表 T-201 を種にすると要求 21 件・2 次 46 件になる。案 A は表 T-201 の中の行を動かさない（`S-2`・`S-3` を除く）ので、行を名指す文は腐らない。変わるのは「表 T-201 の値は文書に保存される」と読める文だけである —— 当てる体は `grep -n "T-201\|T-204\|T-205\|T-208\|T-21[0-5]"` の結果から、保存を言う文だけを拾う。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 何を | 今 | 後 |
|---|--:|--:|
| 文書スキーマの `documentSettings` の鍵 | 111（b6292bb0 で 112） | 26 |
| そのうち画面の操作で書き換わる鍵 | 29（b6292bb0 で 30） | 26 |
| 表 T-206 の行 | 147 | 150（`S-65`・`S-66`・`S-72` を足す。`S-80` は退かせるので足さない） |
| 起動テンプレート・見本 2・骨組みの鍵 | 111 / 104 / 104 / 105（b6292bb0 で 112 / 105 / 105 / 106） | すべて 26 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場（このファイルだけを書く） | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 番号を詰める（検査 62）。`CR-570` が着地した木で 13 節の測り直し | 調整役 |
| 1 | `docs/spec/**`（`settings.json`・生成器 `erd_json_to_schema.py`・`01-04-requirements.md`・`05-07-design.md`・`_assets/tbl-glossary.md`・`display-words.json` の原稿）と `npm run gen` の出力 | 3 節・4 節の仕様。閉路 2 つは 1 手ずつ | 仕様の体（Opus） |
| 2a | `tools/generate_entity_types.py`、生成される `document-settings.ts`・`grs-json-schema.ts` | `SETTINGS_CONSTANTS` の群。`npm run gen:check` が緑 | 実装の体（Sonnet） |
| 2b | `src/entity/**`（生成物を除く）・`src/use-case/**` とその試験 | `edit-document-settings.ts` から 4 命令を外す（`setThemeMonochrome` は残る）。`screen-values.ts` の `ScreenSession` に 4 値。定数の読み先 | 実装の体 |
| 2c | `src/adapter/**` とその試験 | 描く側・書き出す側・入力の訳し・ツールチップ（`tooltips.ts`）の読み先。`image-exporter.ts` は画面の値の明暗と文書の値のモノクロ | 実装の体 |
| 2d | `src/framework/**`（`startup-template.json` を含む）・`sample-schedule/*.json`・`docs/guides/schedule-to-grs-json/grs-skeleton.json` とその試験 | `frame-clock-wakes.ts` の待ち時間、起動時の `prefers-color-scheme`、見本の書き直し | 実装の体 |
| 3 | `tests/`（新しいファイルだけ） | 仕様だけを読んで書く試験: 保存した JSON の `documentSettings` の鍵の全数、古い鍵を持つファイルを開くと捨てる（`OP-6`）、明暗は起動時にブラウザに従い・書かず・戻さず・未保存にしない、ガイド・幅は開き直すと初期値、モノクロは保存して読み直すと戻る、`S-124` を変えると古いファイルでも効く | ⭐ 仕様だけの試験の体。実装の体と別。`docs/spec` だけを読む |
| 4 | 基準線・dist | 基準線は調整役（下げ・改名は調整役、上げは利用者に問う）。ERP の見本で実物の探り針。dist | 調整役 |

⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。`CR-570` と同じ波に入れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

- `docs/review/inventory/E09-settings-blob.md`・`G3-settings-T204-T215.md` は当時の記録として残す。
- `previous-project-result/02-data-model/grs-document-settings-ja.md` は Frozen な引継ぎであり書き換えない。§1 の検査が本書で置き換わったことは、本書と `JDG-620` が持つ。

## 10. ⛔ この変更でやらないこと

- 好みを覚える別枠（`localStorage`）を足さない（`JDG-624`・`JDG-625`）。
- 定数の値を変えない。どの鍵も今の既定値のまま定数になる。
- 古いファイルの読み替えを作らない（`JDG-601`）。
- `themeHue`（`DR-5`、日程データの群）には触れない。

## 11. 前に立つ者へ返す確認

⭐ 残っている確認は無い。起草時の 2 つ（`JDG-621` の「箱のみ」の読み、2026-08-01 の「色のテーマはプロジェクトのテーマカラー」を覆すか）は、利用者が記録を見たうえで答えた `JDG-626` で閉じた —— 明暗だけを好みにし、モノクロは保存する。

## 12. 台帳

| ID（仮） | 何か | 状態 |
|---|---|---|
| `DFC-995` | `S-124` を変えても、前に保存した `GRS JSON` ではツールチップの待ち時間が変わらない（82 鍵に同じ形） | 本書を当てるときに `defects.md` に立て、当てて閉じる |
| `JDG-620` 〜 `JDG-626` | 0.1 節の裁定 | `rulings.md` に記録済み（着地先は本書） |

## 13. 測り方の再現

```
# the tree measured: refactor 70be9db6, copied with git archive into a scratch folder
git archive refactor docs/spec .claude/skills/spec-graph-check tools change-request docs/development-records/rulings.md | tar -x -C <scratch>/tree

# every documentSettings key and its settings row
#   keys : grs-document.schema.json  properties.documentSettings.properties   -> 111
#   rows : settings.json tables, the back-quoted identifier in the key/name cell
#   nested keys by hand: fontScaleSizes = S-121..S-123 (T-215), shapeHeightOf = S-13..S-17 (T-201)

# which keys an in-app command writes: the put({...}) calls of
#   src/use-case/edit-document/edit-document-settings.ts          -> 29 keys (30 on b6292bb0)
# generated files are excluded by EXACT path, never by a file-name suffix
# the settings pane writes nothing: properties-panel.ts settingsFields isEditable: false

# where a key is named, generated files excluded
git grep -c -w <key> refactor -- src tests

# graph
python .claude/skills/spec-graph-check/induced.py <the 42 objects of section 6>
python .claude/skills/spec-graph-check/impact.py S-2 S-3 S-65 S-66 S-72 S-74 S-80 S-127 CM-59 CM-60 CM-61 CM-63 CM-64 CM-67 FR-039 FR-041 FR-048 FR-082 FR-052 FR-063 WY-1 DC-1 DC-7
```

---

## 14. 付録 —— 111 鍵の全表（`refactor` 70be9db6）

「src の出現」「tests の出現」は `git grep -c -w <鍵>` の和で、生成物（`grs-json-schema.ts`・`document-settings.ts`・`display-words.json`・`startup-template.json`）を除く。`zoomX` は表 T-206 の `S-229`（ズームの刻み）にも名が出るが、鍵は `S-75` である。

| # | 鍵 | 行（今の表） | 分類 | 行き先 | src の出現 | tests の出現 |
|--:|---|---|---|---|--:|--:|
| 1 | `actualGap` | `S-10`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 5 | 6 |
| 2 | `actualInitialDuration` | `S-129`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 16 |
| 3 | `actualMin` | `S-6`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 4 | 27 |
| 4 | `actualOfPlan` | `S-5`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 11 | 46 |
| 5 | `actualVisible` | `S-228`（T-202） | 内容 | 表 T-202 に残る（保存する） | 5 | 58 |
| 6 | `appHeaderMaxHeight` | `S-116`（T-212） | 定数 | 表 T-212 ごと定数へ（保存しない） | 1 | 7 |
| 7 | `arrowHeadOfSpan` | `S-46`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 3 |
| 8 | `assigneeLabelGap` | `S-302`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 3 | 5 |
| 9 | `assigneeVisible` | `S-60`（T-202） | 内容 | 表 T-202 に残る（保存する） | 6 | 27 |
| 10 | `basePlanHeight` | `S-4`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 7 | 25 |
| 11 | `baselineVisible` | `S-69`（T-202） | 内容 | 表 T-202 に残る（保存する） | 5 | 12 |
| 12 | `canvasPadding` | `S-56`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 10 | 67 |
| 13 | `carryMaxDepth` | `S-133`（T-211） | 定数 | 表 T-211 ごと定数へ（保存しない） | 0 | 1 |
| 14 | `chevronNotchOfHeight` | `S-43`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 3 |
| 15 | `chevronNotchOfWidth` | `S-44`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 5 |
| 16 | `commentBoxPad` | `S-181`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 4 | 7 |
| 17 | `commentBoxWrapUnits` | `S-182`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 8 |
| 18 | `dateGridLinesVisible` | `S-67`（T-202） | 内容 | 表 T-202 に残る（保存する） | 6 | 5 |
| 19 | `dependencyArrowLength` | `S-19`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 4 | 2 |
| 20 | `dependencyArrowWidth` | `S-300`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 4 |
| 21 | `dependencyLagDefault` | `S-117`（T-213） | 定数 | 表 T-213 ごと定数へ（保存しない） | 1 | 5 |
| 22 | `dependencyLeadIn` | `S-299`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 3 |
| 23 | `dependencyLeadOut` | `S-298`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 2 |
| 24 | `dependencyVisible` | `S-62`（T-202） | 内容 | 表 T-202 に残る（保存する） | 8 | 31 |
| 25 | `dependencyWidth` | `S-18`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 7 | 18 |
| 26 | `displayScale` | `S-234`（T-202） | 内容 | 表 T-202 に残る（保存する） | 19 | 193 |
| 27 | `dualCursor` | `S-65`（T-202） | 画面だけ | 表 T-206 へ移す（画面の状態。保存しない・覚えない） | 16 | 42 |
| 28 | `dummyOpacity` | `S-131`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 3 |
| 29 | `exportCanvas` | `S-81`（T-204） | 定数 | 表 T-204 ごと定数へ（保存しない） | 4 | 96 |
| 30 | `exportCanvasHeightCap` | `S-217`（T-204） | 定数 | 表 T-204 ごと定数へ（保存しない） | 1 | 24 |
| 31 | `fadeHandleHalfPx` | `S-109`（T-210） | 定数 | 表 T-210 ごと定数へ（保存しない） | 1 | 8 |
| 32 | `fadeHandleStrokePx` | `S-110`（T-210） | 定数 | 表 T-210 ごと定数へ（保存しない） | 1 | 3 |
| 33 | `fontMin` | `S-8`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 4 | 19 |
| 34 | `fontOfActual` | `S-7`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 13 |
| 35 | `fontScale` | `S-70`（T-202） | 内容 | 表 T-202 に残る（保存する） | 5 | 91 |
| 36 | `fontScaleSizes` | `S-121`〜`S-123`（T-215） | 定数 | 表 T-215 ごと定数へ（保存しない） | 2 | 91 |
| 37 | `groupGridLinesVisible` | `S-68`（T-202） | 内容 | 表 T-202 に残る（保存する） | 6 | 2 |
| 38 | `groupLevelOfDetailBase` | `S-87`（T-205） | 定数 | 表 T-205 ごと定数へ（保存しない） | 1 | 8 |
| 39 | `groupLevelOfDetailRatio` | `S-88`（T-205） | 定数 | 表 T-205 ごと定数へ（保存しない） | 1 | 6 |
| 40 | `guideCursorMode` | `S-66`（T-202） | 好み | 表 T-206 へ移す（定数だけ） | 7 | 25 |
| 41 | `iconHintDelayMs` | `S-124`（T-212） | 定数 | 表 T-212 ごと定数へ（保存しない） | 2 | 31 |
| 42 | `importMaxBytes` | `S-113`（T-211） | 定数 | 表 T-211 ごと定数へ（保存しない） | 3 | 12 |
| 43 | `importMaxDate` | `S-120`（T-214） | 定数 | 表 T-214 ごと定数へ（保存しない） | 10 | 13 |
| 44 | `importMaxDepth` | `S-115`（T-211） | 定数 | 表 T-211 ごと定数へ（保存しない） | 3 | 8 |
| 45 | `importMaxItems` | `S-114`（T-211） | 定数 | 表 T-211 ごと定数へ（保存しない） | 3 | 10 |
| 46 | `importMinDate` | `S-119`（T-214） | 定数 | 表 T-214 ごと定数へ（保存しない） | 10 | 12 |
| 47 | `labelBaseline` | `S-33`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 2 |
| 48 | `labelCoef` | `S-30`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 32 | 31 |
| 49 | `labelGap` | `S-32`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 12 |
| 50 | `labelHaloOfFont` | `S-34`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 5 |
| 51 | `labelPad` | `S-31`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 5 |
| 52 | `markerSize` | `S-22`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 26 |
| 53 | `markerStroke` | `S-24`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 4 | 3 |
| 54 | `maxGroupDepth` | `S-125`（T-211） | 定数 | 表 T-211 ごと定数へ（保存しない） | 22 | 45 |
| 55 | `milestoneActualDuration` | `S-130`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 0 | 9 |
| 56 | `milestoneNameMarkerGap` | `S-301`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 1 |
| 57 | `milestoneNameStartOfWidth` | `S-303`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 0 |
| 58 | `minShapeWidth` | `S-49`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 6 |
| 59 | `percentCompleteVisible` | `S-61`（T-202） | 内容 | 表 T-202 に残る（保存する） | 6 | 23 |
| 60 | `pinnedGroupIds` | `S-126`（T-203） | 内容 | 表 T-203 に残る（保存する） | 23 | 101 |
| 61 | `pinnedRowMax` | `S-127`（T-203） | 定数 | 表 T-211 へ移す（定数の表になる） | 0 | 23 |
| 62 | `planActualGuidePattern` | `S-104`（T-208） | 定数 | 表 T-208 ごと定数へ（保存しない） | 2 | 30 |
| 63 | `planActualGuideWeight` | `S-103`（T-208） | 定数 | 表 T-208 ごと定数へ（保存しない） | 1 | 0 |
| 64 | `planDatesVisible` | `S-232`（T-202） | 内容 | 表 T-202 に残る（保存する） | 6 | 12 |
| 65 | `planStroke` | `S-39`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 5 | 10 |
| 66 | `planVisible` | `S-227`（T-202） | 内容 | 表 T-202 に残る（保存する） | 7 | 53 |
| 67 | `progressLineOverhang` | `S-51`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 3 | 4 |
| 68 | `progressLineVisible` | `S-64`（T-202） | 内容 | 表 T-202 に残る（保存する） | 7 | 13 |
| 69 | `progressLineWidth` | `S-50`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 0 |
| 70 | `progressMarkerVisible` | `S-63`（T-202） | 内容 | 表 T-202 に残る（保存する） | 9 | 99 |
| 71 | `propertyPanelWidth` | `S-80`（T-203） | 好み | 退かせる —— 表 T-206 の `S-171` が画面の値の初期値になる | 12 | 100 |
| 72 | `pxPerDayAt1x` | `S-1`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 4 | 65 |
| 73 | `resumeArmOfMarker` | `S-26`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 3 |
| 74 | `resumeDashOff` | `S-29`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 0 |
| 75 | `resumeDashOn` | `S-28`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 0 |
| 76 | `resumeDashWidth` | `S-309`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 0 |
| 77 | `resumeHeadOfMarker` | `S-27`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 3 |
| 78 | `resumeOpacityInvalid` | `S-308`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 0 | 0 |
| 79 | `resumeScaleInvalid` | `S-25`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 4 |
| 80 | `rowGap` | `S-12`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 14 | 89 |
| 81 | `rowTitleFont` | `S-36`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 3 | 38 |
| 82 | `rowTitleIndent` | `S-37`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 5 | 42 |
| 83 | `rowTitlePanelWidth` | `S-79`（T-203） | 内容 | 表 T-203 に残る（保存する） | 14 | 131 |
| 84 | `rowTitleTopScale` | `S-38`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 25 |
| 85 | `rulerFont` | `S-3`（T-201） | 内容 | 表 T-202 へ移す（`S-70` の隣。保存する） | 5 | 144 |
| 86 | `rulerHeight` | `S-2`（T-201） | 内容 | 表 T-202 へ移す（`S-70` の隣。保存する） | 3 | 103 |
| 87 | `rulerLabelBottomPad` | `S-179`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 20 |
| 88 | `rulerLabelGap` | `S-135`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 2 |
| 89 | `rulerLabelPad` | `S-136`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 39 |
| 90 | `rulerTierPxPerDayDay` | `S-85`（T-205） | 定数 | 表 T-205 ごと定数へ（保存しない） | 1 | 4 |
| 91 | `rulerTierPxPerDayMonth` | `S-83`（T-205） | 定数 | 表 T-205 ごと定数へ（保存しない） | 1 | 7 |
| 92 | `rulerTierPxPerDayWeek` | `S-84`（T-205） | 定数 | 表 T-205 ごと定数へ（保存しない） | 1 | 6 |
| 93 | `scrollDate` | `S-77`（T-203） | 内容 | 表 T-203 に残る（保存する） | 44 | 249 |
| 94 | `scrollDayOffset` | `S-177`（T-203） | 内容 | 表 T-203 に残る（保存する） | 28 | 50 |
| 95 | `scrollGroupId` | `S-78`（T-203） | 内容 | 表 T-203 に残る（保存する） | 57 | 195 |
| 96 | `scrollGroupOffset` | `S-176`（T-203） | 内容 | 表 T-203 に残る（保存する） | 32 | 64 |
| 97 | `shapeHeightOf` | `S-13`〜`S-17`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 7 | 118 |
| 98 | `spanDotSize` | `S-307`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 3 | 4 |
| 99 | `stackDirection` | `S-58`（T-202） | 内容 | 表 T-202 に残る（保存する） | 4 | 111 |
| 100 | `stackGap` | `S-11`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 14 |
| 101 | `stackSafetyCap` | `S-89`（T-205） | 定数 | 表 T-205 ごと定数へ（保存しない） | 3 | 14 |
| 102 | `starInnerOfOuter` | `S-48`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 3 | 0 |
| 103 | `themeMonochrome` | `S-74`（T-203） | 内容 | 表 T-203 に残る（保存する。`JDG-626`） | 8 | 18 |
| 104 | `themePreference` | `S-72`（T-203） | 好み | 表 T-206 へ移す（起動時にブラウザの明暗に従う。覚えない） | 12 | 102 |
| 105 | `thinArrowHeadHeight` | `S-306`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 3 | 2 |
| 106 | `thinArrowHeadLength` | `S-305`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 2 | 3 |
| 107 | `thinFontScale` | `S-9`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 0 |
| 108 | `thinStrokeWidth` | `S-304`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 5 | 6 |
| 109 | `truncateUnits` | `S-35`（T-201） | 定数 | 表 T-201 ごと定数へ（保存しない） | 1 | 17 |
| 110 | `zoomX` | `S-75`（T-203） | 内容 | 表 T-203 に残る（保存する） | 47 | 395 |
| 111 | `zoomY` | `S-76`（T-203） | 内容 | 表 T-203 に残る（保存する） | 59 | 488 |

---

## 15. 波 3 —— 仕様だけの試験の体への依頼文（下書き。2026-09-26、`e1b8bab2` の時点）

⭐ 調整役の指示（2026-09-26）で、`CR-570` の着地を待つ間に下書きした。⛔ 渡す前に、起点の sha と、波 1（仕様）が実際に書いた行 ID・文をこの依頼文へ入れ直すこと —— 依頼文が挙げる振る舞いは本書の計画であり、試験の正は波 1 の後の `docs/spec` である。

```
BRIEF -- CR-572 wave 3: spec-only tester

ROLE
You write tests for CR-572 from the specification alone. You did not write
the code and must not read its bodies: under src/ you may read only a
file's header comment, its exported types and its signatures. Everything
you expect comes from docs/spec (and this brief's SEAM, which the
implementers were given word for word). If the spec is unclear or silent
on a point, do NOT test it: report "no clause" with what you looked for.
Never change an expected value to match the code; a red test is a finding.
Quote the spec sentence (file:line) a test enforces in the test's name or
first comment.

BASE
<sha given by the coordinator: the merged tree after CR-572 waves 1..2d>

WRITE ONLY
New files tests/unit/cr-572-*.test.ts and tests/system/cr-572-*.test.ts.
Do not edit other tests, src/, docs/, baselines. No worktrees, no
node_modules junctions, no git stash, no commits (the coordinator commits).
Run vitest with the root's copy by relative path, never npx:
  node ../../../node_modules/vitest/vitest.mjs run <files>
(from a session worktree; from the root use node_modules/vitest/vitest.mjs)

SEAM (copied verbatim from CR-572 section 5)
<paste section 5 of the CR here, unchanged>

WHAT TO LOOK FOR IN THE SPEC, AND TEST IF A CLAUSE EXISTS
1. Stored keys. The saved GRS JSON's documentSettings holds exactly the
   keys of the settings tables the spec says are stored (after wave 1:
   tables T-202 and T-203), no more, no fewer. Drive the test from a
   fixture copied from docs/spec/_assets/tbl-settings.md, not from src.
2. Constants are not in the file. No key of the tables the spec marks
   "not stored" (T-201, T-204, T-205, T-208, T-210..T-215, T-206, T-207)
   appears in a saved file.
3. An old file still opens and the constants win (OP-6, DFC-995). Open a
   GRS JSON whose documentSettings also carries iconHintDelayMs: 1000,
   basePlanHeight, themePreference: "dark", guideCursorMode,
   dualCursor, propertyPanelWidth. It opens; those keys are dropped; the
   next save does not write them; the tooltip delay in effect is the
   spec's S-124 value, not 1000.
4. Light/dark theme (FR-039 after wave 1, JDG-624). At start it follows
   the browser's prefers-color-scheme (dark -> dark, light -> light,
   unreadable -> light). Switching it: is not an unsaved edit (FR-100),
   is not an undo step (table T-027), does not move either stamp
   (FR-063), is not written to the file nor to localStorage, and is gone
   after a reload.
5. Monochrome stays in the file (JDG-626). Switching it IS saved, IS an
   undo step (UN-13) and IS an unsaved edit; a saved file reopens
   monochrome (WY-1).
6. Guide cursor and property panel width (JDG-625). Not in the file; after
   a reload they are table T-206's initial values (guide none, width
   S-171).
7. Dual cursor (JDG-622, DC-1, DC-7). Its two dates are never in the file;
   leaving the mode clears them.
8. Font size stays in the file (JDG-621). fontScale and the two ruler keys
   S-2 / S-3 are saved and follow a font size change (FR-039).
9. Agent API (table T-108). CM-59, CM-60, CM-61, CM-63 are no longer
   document commands an Agent can send; CM-64 still is.
10. Export (FR-080). The exported picture uses the exporter's current
   light/dark and the document's monochrome.

PROVE EACH TEST BITES (docs/development-rules/04-verification.md section 2)
On a scratch COPY of the merged tree (never the tree itself), break the
behaviour the test guards (for 1-3: add one constant key back to the
stored set, or change the S-124 value in docs/spec/_source/settings.json
and regenerate; for 4: persist the theme into the document), run the
test, see it go red, then discard the copy. A test that stays green
under its break is reported as not biting.

REPORT (under 60 lines)
- each test: file, name, spec clause it quotes, green/red on BASE,
  red under its break (yes/no)
- every red on BASE: the spec sentence, what the app did instead
- every point above with no clause in the spec ("no clause"), and what
  you searched for
```

---

## 16. 波 1 の旧 → 新の塊（下書き。旧は `e1b8bab2` で測った）

⛔ **`CR-570` の push の後に、すべての旧の塊を測り直すこと。** `CR-570` は `settings.json`（`S-418`）と `FR-018`・`FR-031`・`FR-055`・表 T-051 を書き換えている。行番号は `e1b8bab2` の `docs/spec/01-04-requirements.md` のものであり、ずれる。
⭐ 旧は逐語で写した。新は案であり、当てる体が前後の文と揃える。⛔ 旧の塊が測り直しで一致しなければ、その塊は当てずに調整役へ返す。

### 16.1 生成器の対応表（`docs/spec/_source/erd_json_to_schema.py:47-58`）

旧（10 行。`T-202`・`T-203` の 2 行は変えない）:

```
    'T-201': ('documentSettings', None),
    'T-204': ('documentSettings', None),
    'T-205': ('documentSettings', None),
    'T-208': ('documentSettings', None),
    'T-210': ('documentSettings', None),
    'T-211': ('documentSettings', None),
    'T-212': ('documentSettings', None),
    'T-213': ('documentSettings', None),
    'T-214': ('documentSettings', None),
    'T-215': ('documentSettings', None),
```

新: どれも `('notStored', '文書には保存しない')`。⚠️ 第 2 要素は見出しの中から探す語である（`T-207` の行と同じ形）—— 16.2 節の見出しに必ずその語が入ること。当てたら `python docs/spec/_source/erd_json_to_schema.py --report` で `documentSettings` の鍵が 26（`CR-570` の鍵を含む）になることを見る。

### 16.2 設定の表の見出し（`docs/spec/_source/settings.json` の各表の `caption.ja`）

| 表 | 旧 | 新（案） |
|---|---|---|
| T-201 | 描画の設定 | 描画の設定（成果物に埋め込む定数、文書には保存しない） |
| T-204 | 出力 | 出力（成果物に埋め込む定数、文書には保存しない） |
| T-205 | LOD のしきい値 | LOD のしきい値（成果物に埋め込む定数、文書には保存しない） |
| T-208 | 予実の補助線（`FR-084`） | 予実の補助線（`FR-084`。成果物に埋め込む定数、文書には保存しない） |
| T-210 | フェードの掴み点（`FR-075`） | フェードの掴み点（`FR-075`。成果物に埋め込む定数、文書には保存しない） |
| T-211 | 受け入れの上限（`FR-023`）と構造の上限（`FR-004`） | 同じ語 ＋「（成果物に埋め込む定数、文書には保存しない）」 |
| T-212 | 画面の各部の寸法の上限（`FR-051`）と、待ち時間 | 同上 |
| T-213 | 依存のラグ（`FR-009`） | 同上 |
| T-214 | 受け入れる日付の範囲（`FR-023`） | 同上 |
| T-215 | 文字サイズ（`FR-039` の `fontScale`） | 同上 |

表 T-201 の前の段（`blocks` の直前の `prose`）の末尾に 1 文（案）: 「本表から表 T-215 までのうち、見出しに『文書には保存しない』とある表の値は、画面のどの操作も書き換えない。ファイルに写しを持たせると、書いた版の値が残り、道具を直しても直らない（`JDG-620`）。」

### 16.3 行を移す・退かせる（7 行。`S-74` は表 T-203 に残る —— `JDG-626`）

| 行 | 旧の置き場 | 新 |
|---|---|---|
| `S-2` `rulerHeight`・`S-3` `rulerFont` | 表 T-201 | 表 T-202 の `S-70` の直後。行の中身は変えない |
| `S-65` `dualCursor` | 表 T-202 | 表 T-206。値の欄「2 本カーソルの 2 つの日付（`FR-082`）」、既定「`null`」、理由の欄「画面の値。モードを出ると消える（`DC-7`）。文書に保存しない（`JDG-622`）」 |
| `S-66` `guideCursorMode` | 表 T-202 | 表 T-206。既定 `'none'`。理由「読む人の手癖。起動のたびに既定から始める（`JDG-625`）」 |
| `S-72` `themePreference` | 表 T-203 | 表 T-206。既定「起動時にブラウザが伝える明暗（`prefers-color-scheme`）。読めないときは `'light'`」。理由「明暗は人によって変わる。覚えない（`JDG-624`・`JDG-626`）」。⚠️ 旧の既定の印 🔎 を持ち越すかは当てる体が行の規則で決める |
| `S-80` `propertyPanelWidth` | 表 T-203 | 退かせる。画面の値の初期値は `S-171`（16.6 節） |
| `S-127` `pinnedRowMax` | 表 T-203 | 表 T-211 |

### 16.4 `FR-039`（`01-04-requirements.md:6808`〜`6828`）

旧 `:6808`: 「**文書に保存された値が読む人の指定を強制してはならない（MUST NOT）。**」
新: 変えない（文字サイズと倍率に掛かる）。

旧 `:6813`〜`:6814`: 「**保存値は初期値である。**」「変更した結果は文書の編集として保存される。」
新（案）: 「**文字サイズと表示の倍率の保存値は初期値である。** 変更した結果は文書の編集として保存される。明暗テーマは文書に保存しない —— 起動したときにブラウザが伝える明暗（`prefers-color-scheme`）で描き、読めないときはライトで描くこと（MUST）。押した切り替えは、そのページを閉じるまで効き、ファイルにもブラウザの保管庫にも覚えてはならない（MUST NOT） —— 明暗は人によって変わり、昼と夜で変える人もいる（`JDG-624`・`JDG-626`）。」

旧 `:6828`: 「⭐ **入口がパレットに在っても、上の MUST NOT は変わらない** —— **保存値は初期値のままである。**」
新: 変えない（文字サイズの入口の段である）。

### 16.5 `FR-041`（`01-04-requirements.md:2006` と理由の段）

旧 `:2006`: 「保存するのは `themeHue` / `themeMonochrome` / `themePreference` の 3 つだけとし、」
新: 「保存するのは `themeHue` / `themeMonochrome` の 2 つだけとし、明暗（`themePreference`）は画面の値とし（`FR-039`）、」—— 後ろの「地の彩度・…から規則で解いて求めること（MUST）」は変えない。
旧 `:2010`: 「閲覧環境のシステム色に委ねてはならない（MUST NOT） —— システム色は OS の明暗に追随し、**読む人が選んだ `themePreference` には追随しない。**」
新: 変えない。⚠️ 起動時の明暗をブラウザから取ること（16.4 節）は、地を自分で塗ることと両立する —— 取るのは初期値だけであり、塗るのは `GRS` である。
旧 `:2017`: 「⚠️ **明暗テーマ（`themePreference`）とは別の値である**（`_assets/tbl-settings.md` の 表 T-203 の `S-72` と `S-74`）。」
新: 「⚠️ **明暗テーマ（`themePreference`）とは別の値である** —— モノクロは文書に保存し、明暗は保存しない（`_assets/tbl-settings.md` の 表 T-203 の `S-74` と 表 T-206 の `S-72`）。」
旧（理由の段）: 「**色のテーマはプロジェクトのテーマカラーであり、作った人の決めごとである。**」「明暗と同じ枠に入るので文書に保存する。」
新: 1 文目は変えない。2 文目を「モノクロも同じ枠に入るので文書に保存する。明暗は読む人の値であり、この枠に入らない（`JDG-626`）。」へ。

### 16.6 `FR-052`（`01-04-requirements.md:4111`〜`4116`）

旧 `:4111` の後半: 「描かれていた幅とは、`_assets/tbl-settings.md` の `S-80` が同書の 表 T-206 の `S-248` を下回るとき（0 を含む）は、`FR-072` が面を出すときに置く `S-171` の幅である。」
旧 `:4112`: 「⛔ 保存された `S-80` から数えてはならない（MUST NOT） —— …」
旧 `:4114`: 「離したときに保存する `S-80` は、止めて描いた幅とすること（MUST） —— …」
旧 `:4115`〜`:4116`: 「⭐ 面を出すとき（`FR-072`）、保存された `S-80` が `S-248` を下回る文書（0 を含む）では、…」「⛔ そのとき `S-80` を書き換えてはならない（MUST NOT） —— …」
新（案）: プロパティパネルの幅は画面の値とし、起動のたびに `S-171` から始めること（MUST）。境界を押した時点に描かれていた幅から、ポインタが動いたぶんだけ変え、`S-248` を下回るときは `S-248` で止めて描き、離したときの幅を画面の値とすること（MUST）。⛔ 文書にもブラウザの保管庫にも書いてはならない（MUST NOT）（`JDG-625`）。⇒ `:4112`・`:4115`・`:4116` の、保存値と描く幅がずれる場合の守りは、保存値が無くなるので消す。

### 16.7 `FR-063`（`01-04-requirements.md:6104`）と `FR-025`（`:5626`〜`:5628`）

旧 `:6104`: 「「見せ方」とは、同じ日程データから、全体を収める表示（`FR-055`）と表示の切り替え（表 T-202）を揃えれば同じ描画に戻せるもののことである。」
新: 4.2 節の案。

旧 `:5626`: 「**RATIONALE**: サイズを文書に保存するのは、同じ JSON から同じ出力を得るためである。」
旧 `:5628`: 「**固定と保存は両立する** —— 書き出すたびに選ばせないだけであって、値そのものは見せ方の群として文書が持つ（`FR-063`）。」
新: 4.5 節の案。`:5627`（「選ばせずに固定するのも同じ理由である」）は「同じ JSON を同じ版の `GRS` で開けば」に合わせて語を直す。

### 16.8 表 T-108（`_assets/tbl-glossary.md:460`〜`468`）と表 T-027・表 T-106 の行

| 行 | 旧 | 新 |
|---|---|---|
| `CM-59` | `\| CM-59 \| 見せ方の群 \| `setGuideCursorMode` \| — \| ガイドカーソルを選ぶ \| `FR-048` \|` | 退かせる |
| `CM-60` | `\| CM-60 \| 見せ方の群 \| `setDualCursor` \| ⭐ \| 2 本のカーソルを置く \| `FR-082` \|` | 退かせる |
| `CM-61` | `\| CM-61 \| 見せ方の群 \| `clearDualCursor` \| — \| 2 本のカーソルを解く \| `FR-082` \|` | 退かせる |
| `CM-63` | `\| CM-63 \| 見せ方の群 \| `setThemePreference` \| — \| 明暗テーマを選ぶ \| `FR-039` \|` | 退かせる |
| `CM-67` | `… \| `setPanelWidths` \| ⭐ \| パネル幅を変える \| `FR-052` \|` | 確定名は当てる体が R2.1 で決める（書くのは行見出しパネルの幅だけ）。組 ⭐ を外す |
| `UN-13` | 「テーマ（`FR-041`）・文字サイズ（`FR-039`）・積む向き（`FR-003`）・ガイドカーソル（`FR-048`）・…」 | 「モノクロ（`FR-041`）・文字サイズ（`FR-039`）・積む向き（`FR-003`）・…」 —— 明暗とガイドカーソルを外す |
| `UN-12` | 「`Dual Cursor` の位置の変更」 | 退かせる（文書に無い値は取り消しの対象かを問う必要が無い）。⚠️ `DC-6` と `UN-16` が `UN-12` を指している —— 同じ手で直す |
| `UN-16` | 「**見る場所の割り付け** —— パネル幅（`FR-052`）。… ⚠️ **保存することと戻せることは別である** —— `UN-12` が `Dual Cursor` の位置で同じ形を既に採っている。…」 | 「パネル幅」を「行見出しパネルの幅」へ。`UN-12` を指す文を消す |

⚠️ 退かせた `CM-*` を指す所は `impact.py CM-59 CM-60 CM-61 CM-63` で 0 件だった（6 節）が、⛔ `state-machines.json`・表 T-109 の入口の行・`src/` の `DocumentSettingsCommand` は別に探す。

### 16.9 画面の値の出来事（`docs/spec/_source/state-machines.json`）

⭐ 先例: 表示言語は、画面の値の状態機械の根が `language` を運び、出来事 `displayLanguageChosen`（効果 `storeLanguage`、証拠 `S-99`・`FR-038`）が書き換える。同じ形で次を足す（名は仮 —— R2.1 で当てる体が決める）:

| 運ぶ値 | 出来事（仮） | 証拠 |
|---|---|---|
| `themePreference` | 明暗の入口（`IC-16`）が押された | `S-72`・`FR-039` |
| `guideCursorMode` | 既存の `guideCursorEntryPressed` | `S-66`・`FR-048` |
| `dualCursor` | 既存の `dualCursorModeStateMachine` の出来事 | `S-65`・`FR-082` |
| `propertyPanelWidth` | プロパティパネルの境界を離した | `S-171`・`FR-052` |

⚠️ `dualCursorModeStateMachine` の効果 `writeClearDualCursor`・`writePlaceDualCursorClearingGuide`・`writeClearDualCursorSettingGuide`（`state-machines.json:2033`〜`2065`）は、今は文書へ書く命令（`CM-59`〜`CM-61`）を出す。画面の値を書く効果へ変わるので、名前の `write` が何を書くのかを当てる体が確かめる。

### 16.10 `DC-1`（`01-04-requirements.md:4913`）と `DC-7`

旧 `DC-1` の後半: 「⛔ `dualCursor` が既に 2 つの日付を持っているときは置き直してはならない（MUST NOT）。<br>`date1` を追従する側にするだけとする —— ⭐ **文書が 2 つの日付を持ったまま開かれることがある**（`dualCursor` は文書が持つ値である）。<br>その文書で入口を押したとき置き直すと、前に測った結果が入り直した瞬間に消える。<br>⚠️ **`DC-7` によりモードを出れば 2 本は消えるが、開いた文書が持ってくる 2 本は残る。**」
新: この 4 文を消す。`dualCursor` は画面の値であり（表 T-206 の `S-65`）、モードを出ると消え（`DC-7`）、文書から入ってくることも無いので、入口を押したときは常に空である。
`DC-7` の「消したときは `dualCursor` を `null` へ戻すこと（MUST）」と `EP-6` を指す文: 変えない（画面の値として同じ）。
