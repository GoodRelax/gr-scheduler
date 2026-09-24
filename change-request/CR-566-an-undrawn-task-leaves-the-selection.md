# CR-566 — 描かれなくなったタスクは選択から外れる

> 状態: 当てた（2026-09-24）。E-01 と E-02 を仕様・原稿へ当て、`npm run gen` で刷り直した。E-03（Q16 の写しの置き場）も同じ日に原稿へ当てた（11 節）。E-04 〜 E-06（`DFC-806`、`JDG-410`、ハイライトボックスのダブルクリック）も同じ日に当てた（11 節）。E-07（表 T-064 の `PI-5` に `labelledAssigneeUidOf`、`CR-547` の実装が求めた）も同じ日に当てた（11 節）。
> 読んだ木: `57511ed9`（ブランチ `claude/loving-einstein-50a6c2`）。行番号・数・参照は、すべてこの木で測った。
> ID の帯: まとめ役から CR-566 と `DFC-942` を受けた。
>
> 閉じるもの: `DFC-683`（描かれていないタスクを選ばせない —— 仕様の着地は `CR-437` と `CR-541` が済ませ、コードが残っていた）のうち、仕様の側に残っていた 2 つの食い違い。
> 1 つ目は、状態機械の原稿の `selectionPruned` の注が「表示の切り替えでの刈りは書かない」と言い、表 T-023c の結び（`01-04-requirements.md:2245`〜`:2250`）と食い違うこと。
> 2 つ目は、刈る判定を `ItemHitArea` の外へ出すのに、表 T-064 の `PI-7` がその名を持たないこと（検査 26b）。
> 11 節は、同じ波で `PND-449`（`JDG-300` の Q16、選んだ `Task` を全部写す）の写しの置き場も運ぶ（E-03）。
> ⭐ 本書は `CR-490` の決定 9 が書いた直し方（同書 2.2 節の申し送り 3、4 節「`selectionPruned` の源の行に `FR-049` が加わる。升は変わらない」）をそのまま当てる。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-002`（`CH-2`、縮めても全体を 1 枚で俯瞰させる）—— 行の軸の倍率で描かれなくなったタスクを選択に残さない（`CR-541` の Q7 と同じ筋）。
縮めたり畳んだりしたまま、見えないタスクへ整列（`FR-034`）や削除が及ぶことを防ぐ。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（矛盾が無い、唯一の正）—— 状態機械の原稿の注が 表 T-023c の結びと食い違っていた。E-01 で注を結びに合わせた。
- `R4.4`（状態機械）—— 升（遷移）は 1 つも変えない。出来事 `selectionPruned` の源の行と注だけを直す。
- `R2.1`（命名）—— 公開名は `isTaskDrawn`（問い: 描かれているか）と `selectionWithinDrawn`（既存の `selectionWithinSchedule` と同じ形の名）とした。
- `R7.1`（純粋性）—— 2 つの名はどちらも純粋である。シェルが出来事を送る。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | E-01 を利用者に問わずに当てる | `JDG-321` の ②（仕様の自己矛盾を変更要求で直すだけなら問わない）。直し方は `CR-490` の決定 9 が既に書いている | — |
| 決定 2 | 源の行に `FR-049` ・ `FR-018` ・ `HR-1a` ・ `HR-6` を足す | 表 T-023c の結びが入口として名指す 3 つ（表示の切り替え、行の畳みと隠し、行の軸の倍率）の行である | — |
| 決定 3 | 帯に入りきらないピン止めの行（`FR-098`）と、段数の安全弁（表 T-014 の `ST-7`）で置かれなかった行のタスクは、描かれていないと読まない | 表 T-023c の結びは 3 つの入口だけを名指す。`FR-098` は溢れた行を「領域の下端の外へ落ちる」と書き、描かないとは書かない。`ST-7` は黙って切り捨てることを禁じる | ピン止めした行が畳んだ行の下に在るとき、その行のタスクも外れない（配置の結果が、ピンが無い理由を持たないため） |
| 決定 4 | 描かれていることの判定に、進捗マーカー・再開の印・ラベルと `milestoneFigure` を数えない | 表 T-023c の結びは予定・実績・実績のダミー（表 T-240）だけを名指す。`milestoneFigure` は予定を隠しても組まれ（`schedule-geometry.ts:984`〜`:986`）、菱形は予定（`task.plan`）から描かれる | マーカーだけが描かれたタスクは、見えていても選べない（`DFC-942`） |
| 決定 5 | 押している最中の下書きの絵（ドラッグのプレビュー）では刈らない | プレビューは文書に採られないことがあり、その下で刈るとドラッグの選択が終わる | — |

---

## 1. 範囲 —— 要求ごとの行き先

| 要求 | 仕様で変える所 | 編集 |
|---|---|---|
| R1 描かれなくなったタスクを刈る出来事の源 | `docs/spec/_source/state-machines.json` の `selectionPruned.source`（生成 `_assets/tbl-state-machines.md` の出来事の表） | E-01 |
| R2 刈る判定の公開名 | `05-07-design.md` の 表 T-064 の `PI-7` | E-02 |
| R3 写しの置き場が、選んだ `Task` をすべて持つ（Q16） | `docs/spec/_source/state-machines.json` の `selection` の運ぶ値 `copiedForPaste` の注（生成 `_assets/tbl-state-machines.md` の「根 `selection` の値」） | E-03 |
| R4 ハイライトボックスをダブルクリックしたときの宛先（`DFC-806`、`JDG-410`） | `01-04-requirements.md` の 表 T-023 の `MK-13`、`docs/spec/_source/state-machines.json` の出来事 `fieldFocusAsked` と状態 `fieldFocusWanted` が運ぶ `fieldRow`（生成 `_assets/tbl-state-machines.md`）、`_source/display-words.json` の `MK-13` の語 | E-04 ・ E-05 ・ E-06 |

数: 仕様の文の編集 2（E-02 ・ E-04）、原稿 JSON の編集 4（E-01 ・ E-03 ・ E-05 ・ E-06）。

---

## 2. 新しい識別子

新しい行 ID・表番号・要求は無い。
`PI-7` の公開するメンバが 2 つ増える（`isTaskDrawn` ・ `selectionWithinDrawn`）。
台帳の行 `DFC-942` をまとめ役から受けた（`docs/development-records/defects.md`）。
E-03 も新しい ID を作らない。
E-04 〜 E-06 も新しい ID を作らない —— 名指す `PR-22` は `CR-551` の E-47 が表 T-016 に足した行である。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧（`57511ed9`） | 新 | 理由 |
|---|---|---|
| `selectionPruned` の注の「表示の切り替えでの刈りは書かない」 | 「または、表示の切り替え・行の畳みと隠し・行の軸の倍率で描かれなくなったタスクを刈った」 | 表 T-023c の結びが、その時点で選択から外すと定めている |
| `fieldFocusAsked` の注の「（名称・行名・担当・注記の本文・文書名）」（E-05） | 「（名称・行名・担当・注記の本文・枠の色・文書名）」 | `MK-13` に枠の色の欄の宛先が足された（E-04）。E-04 は字を消さず、1 項を足すだけである |
| `MK-13` の語の「コメントボックス＝プロパティパネルを開いて本文を編集、名称ラベル＝…」／「Comment Box: opens the Properties Panel and edits its body; Name Label: …」（E-06） | 間に「ハイライトボックス＝プロパティパネルを開いて枠の色を編集、」／「Highlight Box: opens the Properties Panel and edits its frame colour; 」を挟む | 語は行が挙げる対象を並べており、E-04 で足した対象が語に無いと検査 37 が赤くなる |
| `copiedForPaste` の注の「無いこともある」（E-03） | 「無いこともある。`Task` を写したときは、選ばれていた `Task` をすべて持つ」 | `FR-033` が、2 つ以上選ばれた `Task` をすべて複製すると定めている（`CR-541`）。置き場が 1 つしか持てないと、貼り付けが残りを落とす |

---

## 4. 書き直す所（当てる体がそのまま使う文）

<!-- EDIT id=E-01 file=docs/spec/_source/state-machines.json -->
旧（`:5197-5207`、`selectionPruned.source`）
```text
     "key": "selectionPruned",
     "source": {
      "kind": "effectResult",
      "rows": [
       "FR-081",
       "UN-9"
      ],
      "note": {
       "ja": "書き込みが着地し、文書に無くなった対象を刈った。表示の切り替えでの刈りは書かない"
      }
     },
```
新
```text
     "key": "selectionPruned",
     "source": {
      "kind": "effectResult",
      "rows": [
       "FR-081",
       "UN-9",
       "FR-049",
       "FR-018",
       "HR-1a",
       "HR-6"
      ],
      "note": {
       "ja": "書き込みが着地し、文書に無くなった対象を刈った。または、表示の切り替え・行の畳みと隠し・行の軸の倍率で描かれなくなったタスクを刈った"
      }
     },
```

⭐ `npm run gen` で `_assets/tbl-state-machines.md` の出来事の表の 1 行が刷り直る。手では書かない。

<!-- EDIT id=E-02 file=docs/spec/05-07-design.md -->
旧（`:544`、表 T-064 の `PI-7` の末尾）
```text
呼ぶ側が同じ集合を写して持つと、片方だけに行が足されて離れる（1.9）） |
```
新
```text
呼ぶ側が同じ集合を写して持つと、片方だけに行が足されて離れる（1.9）） ／ `isTaskDrawn`（1 つのタスクの幾何が、表 T-023c の結びの「描かれている」に当たるかを答える —— 予定・実績・実績のダミー（表 T-240）のどれかが在れば真とする。<br>⭐ `InputCommandTranslator` が、描かれていないタスクをクリック（`SL-2`）でも全選択（`SL-5`）でも取らないために公開した） ／ `selectionWithinDrawn`（選択から、幾何に描かれていないタスクを外した選択を答える。<br>選んだ順序（`SL-7b`）は保ち、外すものが無ければ同じ値を返す。<br>⭐ `SingleHtmlShell` が、表示の切り替え・行の畳みと隠し・行の軸の倍率で描かれなくなったタスクを、その時点で選択から外すために公開した） |
```

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

| 継ぎ目 | 形 |
|---|---|
| 判定 | `src/entity/layout-engine/item-hit-area/item-hit-area.ts` の `export function isTaskDrawn(task: TaskGeometry): boolean` —— `plan` ・ `actual` ・ `dummies` のどれかが在れば真 |
| 刈る値 | 同じファイルの `export function selectionWithinDrawn(selection, geometry)` —— 引数の型は構造の型 `DrawnChoice<T extends ChosenItem>`（`items` と `ordered`）。`Selection` をそのまま渡せ、戻り値は `Selection` に代入できる。⚠️ `Selection` を名指さないのは、`components.json` に `ItemHitArea` → `Selection` の辺が無いからである（検査 59） |
| 色の欄の焦点（E-04） | `src/framework/dom-screen-surface/properties-panel-drawing.ts` の `holdColourFocusTarget` が、色の欄の値を持つ見本（無ければ最初の見本）を、`fieldEditingOf` の `focusPropertyField` が引く器として登録する。焦点が入ったかを答えるのは同じ `focusPropertyField`（`field-editing.ts`、`domScreenSurface` が `holdFocusPropertyField` で渡す） |
| 呼ぶ側 | 全選択は `selection-input.ts` の `everythingSelectable`、クリックは同じファイルの `pickableRefOf`、範囲選択は `itemsInMarquee`（予定と実績が無いときは実績のダミーの外接矩形で囲みを見る）。シェルは `frame-loop.ts` の `runFrame` が幾何を組んだあと、消えた対象の刈りと同じ `pruneChoiceTo` で `selectionPruned` を送る |

---

## 6. グラフ（`57511ed9` で測った）

- `impact.py PI-7`: 指すのは `FR-009`（`01-04-requirements.md:2551`）の 1 か所 —— `itemAtPointer` に構えを渡すことを禁じる文であり、メンバが増えても偽にならない。
- `impact.py FR-081`: 指すのは `FR-083` ・ `FR-049` ・ 5.3 節 ・ `tbl-state-machines.md` の 2 か所。どれも選択の規則を指すだけで、刈る時点を写していない。
- `induced.py PI-7 T-064 FR-081 T-023c FR-049 FR-018 HR-1a HR-6 UN-9`: 9 の種、種どうしの辺 12、閉路 1（`FR-049` と `FR-081`）。本書はどちらの文も書き換えない（E-01 は原稿の源の行に名を足すだけ）ので、閉路は編集の順を縛らない。
- E-04 ・ E-05（`a42c0cb4` で測った）: `impact.py MK-13` は要求 8 件・参照 16 箇所。宛先の一覧を写しているのは `tbl-state-machines.md` の 2 か所（出来事 `fieldFocusAsked` と状態 `fieldFocusWanted` の運ぶ値）だけで、E-05 がその原稿を直す。`IN-5a`（`:6888`）が挙げるのは文字を打つ欄であり、色の欄は入らないので変えない。`MK-13` の行は自分で閉じたまま（1 項を足すだけ）なので、`CR-560` が `MK-13` の直後に `MK-15` を差す錨は字が変わるだけで位置は変わらない。
- E-03（`18db8646` で測った）: 行 ID も源の行も変えず、注の字だけを足す。`copiedForPaste` を名指す所は、原稿に 3 か所、生成物に 3 か所（`tbl-state-machines.md:888` ・ `:892` ・ `:900`）。字が変わるのは `:892` の 1 か所だけである。

---

## 7. 仕様の外で直すもの（⛔ 本書は直さない）

- コード: 5 節の継ぎ目（同じ波で当てた）。
- 台帳: `DFC-683` と `DFC-942`（`docs/development-records/defects.md`）。
- 当てた後に、出荷ビルドで押して確かめる: 予定と実績を隠したとき、畳んだとき、行の軸の倍率で行が消えたときに、選んでいたタスクが外れること。進捗マーカーだけが描かれたタスクをクリックしても選ばれず、マーカーの働き（`JDG-187`）は届くこと。

---

## 8. ⛔ この変更でやらないこと

- 升（遷移）は変えない。
- `SL-8` の枠の組み方は変えない。
- 当たりの判定（`itemAtPointer`）は変えない —— マーカーの働きはそのまま届く。
- 範囲選択で、予定や実績と並んで描かれた実績のダミーを囲みに入れるかは変えない（いまのまま、予定と実績の外接矩形で見る）。

---

## 9. 前に立つ者へ返す問い

無し。0 節の ③ の決定 3 の代償（畳んだ行の下のピン止めの行）は、配置の結果がピンの抜けた理由を公開すれば解ける。本書はそこまで手を入れない。

---

## 10. 台帳

| 台帳 | 行 |
|---|---|
| `docs/development-records/defects.md` | `DFC-683`（状態 `実測待ち`）・ `DFC-942`（状態 `実測待ち`） |
| `docs/development-records/pending-decisions.md` | `PND-449`（E-03 と同じ変更で 裁定済） |
| `docs/development-records/defects.md` | `DFC-806`（E-04 ・ E-05、状態 `実測待ち`） |
| `docs/development-records/rulings.md` | `JDG-410`（E-04 の裁定、`CR-551` の 1 節で E-49 として予約していた） |

---

## 11. 追記の場所（E-03 以降）

本節から後は、同じ変更要求に後から足す編集の置き場である（写したものの置き場、Q16 の編集が E-03 から続く）。
足す体は、1 節の範囲の表と 2 節・3 節・6 節・10 節に、足した編集の分を加えること。

<!-- EDIT id=E-03 file=docs/spec/_source/state-machines.json -->
旧（`:5055-5061`、`selection` の運ぶ値 `copiedForPaste`）
```text
      "name": "copiedForPaste",
      "rows": [
       "FR-033"
      ],
      "note": {
       "ja": "無いこともある"
      }
```
新
```text
      "name": "copiedForPaste",
      "rows": [
       "FR-033"
      ],
      "note": {
       "ja": "無いこともある。`Task` を写したときは、選ばれていた `Task` をすべて持つ"
      }
```

⭐ `npm run gen` で `_assets/tbl-state-machines.md` の「根 `selection` の値」の 1 行が刷り直る。手では書かない。
⚠️ 行と `Task` の両方が選ばれているときは、いまのとおり行を写す（`CR-541` の 11 節の 8 行目）。行を 2 つ以上写すことはどの行も述べないので、注にも書かない —— シェルはいまのとおり `RS-27` で断る。

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧（`:3369`、表 T-023 の `MK-13` の「対象ごとに定めること（MUST）」の欄、コメントボックスの項の終わり）
```text
付箋だけが別の器官を要求する理由が無い。<br>／タスク（名称ラベルと本体のどちらでも）
```
新
```text
付箋だけが別の器官を要求する理由が無い。<br>／ハイライトボックス ＝ プロパティパネルを出し、枠の色の欄（表 T-016 の `PR-22`）に焦点を置くこと（MUST）<br>／タスク（名称ラベルと本体のどちらでも）
```

⭐ 利用者の裁定（`JDG-410`、2026-09-24）「DFC-806 は推奨通り、 色についてのプロパティーを開け」を当てる。`CR-551` の 1 節が E-49 として予約していた編集であり、`CR-551` を開き直すと検査 62 がその予約を測り直すので、本書で当てる。

<!-- EDIT id=E-05 file=docs/spec/_source/state-machines.json -->
旧（`:4615`、出来事 `fieldFocusAsked` の注、および `:4621-4627` と `:4842-4848`、同じ出来事と状態 `fieldFocusWanted` が運ぶ `fieldRow` の行）
```text
       "ja": "欄に焦点を置くことを要求が名指した押下（名称・行名・担当・注記の本文・文書名）"
...
          "PR-21",
          "U-27"
```
新
```text
       "ja": "欄に焦点を置くことを要求が名指した押下（名称・行名・担当・注記の本文・枠の色・文書名）"
...
          "PR-21",
          "PR-22",
          "U-27"
```

⭐ `npm run gen` で `_assets/tbl-state-machines.md` の 2 行（出来事の表の `fieldEntry/fieldFocusAsked` と、状態 `fieldEditStateMachine.fieldFocusWanted` の運ぶ値）が刷り直る。手では書かない。
⚠️ 状態 `editingField` と出来事 `fieldEditBegan` ・ `fieldEditEnded` の `fieldRow` には足さない —— あれらは文字を打つ欄（`IF-9`）が名乗る行であり、色の欄は打たない。

<!-- EDIT id=E-06 file=docs/spec/_source/display-words.json -->
旧（`:3531-3532`、`MK-13` の語）
```text
    "ja": "対象で意味が決まる。コメントボックス＝プロパティパネルを開いて本文を編集、名称ラベル＝名称、…",
    "en": "What it does depends on what it lands on -- Comment Box: opens the Properties Panel and edits its body; Name Label: its name; …"
```
新
```text
    "ja": "対象で意味が決まる。コメントボックス＝プロパティパネルを開いて本文を編集、ハイライトボックス＝プロパティパネルを開いて枠の色を編集、名称ラベル＝名称、…",
    "en": "What it does depends on what it lands on -- Comment Box: opens the Properties Panel and edits its body; Highlight Box: opens the Properties Panel and edits its frame colour; Name Label: its name; …"
```

⭐ `npm run gen` で `src/adapter/screen-renderer/display-words.json` が刷り直る。手では書かない。
⚠️ 検査 37 の対（`dictionary-table-pairing.txt` の `T-023 MK-13`）は、表の行と語を読み合わせたうえで調整役が登録し直す（`JDG-520`）。

<!-- EDIT id=E-07 file=docs/spec/05-07-design.md -->
旧（`:542`、表 T-064 の `PI-5` の末尾）
```text
置き場の式を `src/` の 2 か所に置いてはならない（MUST NOT） |
```
新
```text
置き場の式を `src/` の 2 か所に置いてはならない（MUST NOT） ／ `labelledAssigneeUidOf`（担当ラベルが名を出す担当者、すなわち `FR-059` の絞りと並びで先頭に来る 1 名の資源の `uid`。<br>いなければ `null`）—— ⭐ **`ScreenRenderer` が、プロパティパネルの担当者の欄のどれに焦点を置くか（表 T-225 の `AS-1`）を決めるために公開した** —— 絞りを写して持たせると、`FR-059` の規則が 2 か所になる（1.9） |
```

⭐ 2026-09-24、`CR-547`（計画の H10）の実装が `labelledAssigneeUidOf` を `ScheduleLayout` の外（`src/adapter/screen-renderer/properties-panel.ts`）から読むので、検査 26b が表 T-064 に名を求めた。本書の E-02 と同じ形（公開名を 1 つ足すだけ）なので、同じ変更要求に足して同じ日に当てた。新しい要求 ID ・ 表 ・ 設定値は 0。
