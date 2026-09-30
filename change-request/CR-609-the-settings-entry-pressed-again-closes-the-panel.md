# CR-609 — 設定を出しているあいだに設定の入口をもう一度押すと、プロパティパネルを閉じる

> 起草の状態: 起草のみ（2026-10-01、枝 `b2-panel-crs`）。まだ当てていない。4 節の旧 5 件は、読んだ木でどれも 1 回だった（13 節）。
> 読んだ木: `b2-panel-crs` の `0590ad03`（`refactor`）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から受けた（B2: CR-606..609）。⭐ 本書は仕様の新しい識別子を 1 つも取らない（2 節）。
> ⛔ 当てる順: `CR-606` → `CR-607` → **本書** → `CR-608`。E-01・E-04・E-05 は `CR-606`・`CR-607` が書き換える所と重なる（4.1 節「重なり」）。
> 閉じるもの: `DFC-1325`（`JDG-855`）と `DFC-677`（戻す先の無い場合が、本書の後は起こらない）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-855` | 「#6 ヘッダーから 三 で設定を開いたあと、再度 三 を押下してもプロパティーパネルが表示されたままとなっている。<br>再度 三 を押下したらプロパティイーパネルと閉じろ」 | 本書の骨格。`FR-072` の「もう一度同じ入口を押したら直前の選択物へ戻す」を覆す（E-01・E-03） |
| `JDG-173` | 「問6: 提案通りでやってみろ」（`PND-496`: 設定を出したまま閉じたあとの `IC-17` は設定を出す） | 変えない。閉じたあとの押しは設定を出す —— E-01 はその文の後ろの説明だけを書き直す |
| `JDG-283` | 「推奨の Cとせよ」（パネルを戻す道の 1 つに `IC-17` を数える） | 変えない。本書の後も、閉じたパネルへの `IC-17` はパネルを戻す（設定を出す） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— 押下状態の立った入口をもう一度押すと、押す前へ戻る。`App Header` とパレットの表示の入口は、多くはそう振る舞い、ヒントも「もう一度押すと非表示にする」の形で言う（`docs/spec/_source/display-words.json` の `ja` のヒントで「もう一度押す」を含む行 26）。`IC-17` だけが、もう一度押すと別のもの（直前の選択物）を出していた。利用者は `dist/index.html` でそれを不具合と読んだ（`JDG-855`）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— `FR-072`（`docs/spec/01-04-requirements.md:1954`）の「もう一度同じ入口を押したら直前の選択物へ戻すこと」と、表 T-280 の `documentSettingsDisplayed` × `screen/settingsEntryPressed` の升（`docs/spec/_source/state-machines.json:2041`〜`:2049`、「→ `selectionDisplayed`」）は、利用者の裁定 `JDG-855`（閉じる）と食い違う。裁かれた行が勝つ（規則 02 の 1）ので、要求と升の 2 か所を同じ変更で書き換える。
- **`R1.4`（境界・空の場合）** —— 同じ升は運ぶ値 `returnSubject` を戻すが、その値に「無いこともある」（`state-machines.json:1954`）と書き、無いときの先をガードでも文でも決めていない（`DFC-677`）。⭐ 閉じる先はどの場合も `hidden` なので、場合を分ける必要が消える —— ガードも行も足さずに穴が閉じる。
- **`R4.4`（状態遷移表）** —— 変えるのは状態遷移表の升 1 つと、状態 1 つの運ぶ値だけ。状態・出来事の数は変わらない（7 節）。
- **`R2.9`（YAGNI）** —— `returnSubject` を読むのは、書き換える升と `src/use-case/advance-screen-session/screen-values.ts` の `onSettingsEntryPressed`（`:678`）だけである（13 節の `git grep`）。升が閉じる先になれば読む者が 0 になる ⇒ 運ぶ値ごと消す（E-02）。シェルの `propertiesPanelKept` も、読む所が `toggleDocumentSettingsProperties` の枝（`frame-loop.ts:2621`）だけなので、同じ理由で消える（9 節）。
- **`R2.14`（POLA）** —— ① の 26 行の先例に揃える。`IC-17` の名簿の行（表 T-109）とヒントも「もう一度押すと閉じる」を言う（E-04・E-05）。
- **`R4.3`（中間の不正な状態）** —— シェルの `settingsEntryEventsOf`（`frame-loop.ts:1025`〜`:1035`）は、閉じたパネルに `IC-17` を押すと `propertiesOfChoiceAsked` と `settingsEntryPressed` の 2 つを続けて送り、1 度 `selectionDisplayed` を通る。戻す先を覚えるためだけの遠回り（注 `DEVIATION ... (DFC-677)`）であり、本書の後は要らない（9 節の波 2）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **直前の選択物が在っても無くても、もう一度の押しは閉じる。** 升にガードを置かず、`DFC-677` の「戻す先が無いとき」は場合として消える | `JDG-855` の逐語は場合を分けていない。分けると、同じ押しが 2 つの違う結果を持ち、押す前に読めない（`R2.14`） | 無い |
| 決定 2 | **運ぶ値 `returnSubject` を消す**（E-02）。`selectionDisplayed` × 押しの升の注「`subject` を `returnSubject` に移す」も消す（E-03） —— 設定を出すときは `subject` を捨てる | 読む者が 0 になる（`R2.9`）。選択そのものは選択の領域が持ち、`FR-072` の「設定を開いても選択を解除しない」はそのまま真 | 設定を閉じたあとに直前の選択物のプロパティを見るには、別の道（名前の直接編集、行を選ぶ、検索の飛び先ほか。出す入口は各要求が持つ）を使う |
| 決定 3 | 閉じたあとの押しは設定を出す（`JDG-173`）を残し、その文の後ろの説明「「もう一度…」は、…あいだの押しに限る」だけを書き直す。`⛔ 閉じたあとの押しで…（MUST NOT）` の理由「閉じる前の中身の逆が出ると」も「選択物が出ると」へ直す | 引いていた文が消えるので、説明が指す先が無くなる。MUST・MUST NOT の本体の語は変えない（試験 `tests/unit/cr-424-the-property-panel-keeps-a-minimum-width.test.ts:36`〜`:38` が逐語で引く） | 無い |
| 決定 4 | 表 T-109 の `IC-17` の `何の入口か` を「表示する・プロパティパネルを閉じる（`S-99h`）」とする（E-04） | 同表の表示の入口の書き方（`IC-7` の「表示する・非表示にする（`S-99e`）」）。規則そのものは 表 T-280 と `FR-072` が持ち、名簿は役目だけを言う | 名簿の行に 1 句増える |
| 決定 5 | `IC-17` のヒントに「もう一度押すとパネルを閉じる」（英語は `; press again to close the panel`）を足す（E-05） | ① の 26 行の先例と同じ形・同じ位置（最初の文の直後。英語は末尾） | ヒントが 1 文長くなる |
| 決定 6 | シェルの遠回り（`settingsEntryEventsOf` の 2 つ目の出来事と `DEVIATION` の注）と `propertiesPanelKept` を消す（9 節の波 2）。`propertiesPanelKept` の宣言の上の `@provisional PND-338` の印も一緒に消えるので、`PND-338` の行は調整役が同じ波で閉じる（12 節） | 読む所が 0 の変数は `noUnusedLocals`（`tsconfig.json:24`）が拒む。印だけを残す置き場は無い | 調整役の台帳の手が 1 つ要る |
| 決定 7 | ⛔ 設定を出しているあいだに選択が動いたときの扱い（`DFC-706`）は本書で決めない | 別の升（`documentSettingsDisplayed` × `selectionMoved`）であり、利用者の裁定がまだ無い（同行「どちらが正かは本行では決めない」） | `DFC-706` は開いたまま残る |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| もう一度の押しは閉じる | `FR-072` の STATEMENT の 3 行 | E-01 | その 3 行 |
| 運ぶ値を消す | `docs/spec/_source/state-machines.json` の状態 `propertiesPanelContentStateMachine.documentSettingsDisplayed` | E-02 | その状態の `carries` |
| 升の先を `hidden` へ | 同原稿の `settingsEntryPressed` の 3 升（表 T-280 の 1 行） | E-03 | その 1 行 |
| 名簿が役目を言う | `docs/spec/_assets/tbl-glossary.md` の 表 T-109 の `IC-17` の行（手書き） | E-04 | その 1 行 |
| ヒントが言う | `docs/spec/_source/display-words.json` の `IC-17` の `hint` | E-05 | その 2 行 |

⭐ 生成物 `docs/spec/_assets/tbl-state-machines.md`（表 T-280 の升 `:309` と状態の注 `:317`、状態図の矢印の名札）・`src/adapter/screen-renderer/display-words.json`・`src/adapter/screen-renderer/icon-roster.json`・`src/use-case/advance-screen-session/screen-values.ts` の生成区画は、`npm run gen` だけが書く。⛔ 手で書かない。

## 2. 新しい識別子

無い。行・表・要求・接頭辞・設定値の行・状態・出来事を 1 つも足さない。消すのは運ぶ値 `returnSubject` の 1 つだけである（識別子の表に載る名ではない）。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`0590ad03`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「もう一度同じ入口を押したら直前の選択物へ戻すこと」 | `docs/spec/01-04-requirements.md:1954`（`FR-072`） | 「パネルが文書の設定を出しているあいだに…プロパティパネルを閉じること（MUST）」 | E-01 |
| 「「もう一度同じ入口を押したら直前の選択物へ戻す」は、パネルが設定を出しているあいだの押しに限る」 | 同 `:1955` | 「閉じたあとの押しは、上の「もう一度」に数えない」 | E-01 |
| 「閉じる前の中身の逆が出ると」 | 同 `:1956` | 「選択物が出ると」 | E-01 |
| 運ぶ値 `returnSubject`（「同じ入口をもう一度押したときに戻す選択物。無いこともある」） | `docs/spec/_source/state-machines.json:1950`〜`:1957` | `"carries": []` | E-02 |
| 注「`subject` を `returnSubject` に移す」 | 同 `:2037`〜`:2039` | 注なし | E-03 |
| 升 `documentSettingsDisplayed` × `settingsEntryPressed` → `selectionDisplayed`、注「`returnSubject` を `subject` に戻す」 | 同 `:2041`〜`:2049` | → `hidden`、注「直前の選択物の有無を問わない」 | E-03 |
| 生成された升と状態の注 | `docs/spec/_assets/tbl-state-machines.md:309`・`:317` | `npm run gen` | ― |
| コードの「戻す」 | `src/use-case/advance-screen-session/screen-values.ts:675`〜`:683`（`onSettingsEntryPressed`）・`:109`（手書きの `ScreenValuesStateCarried.returnSubject`）・`:275`（生成区画） | 9 節 | 実装する者 |
| シェルの遠回り | `src/framework/single-html-shell/frame-loop.ts:1025`〜`:1035`（`settingsEntryEventsOf` と `DEVIATION` の注）・`:1587`〜`:1589`・`:1733`・`:2621`〜`:2622`・`:2666`・`:2716`（`propertiesPanelKept`） | 9 節 | 実装する者 |
| 試験の `returnSubject: null` と「戻す」を引く試験 | 9 節の表の 3 行 | 9 節 | 実装する者・試験の体 |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（改行は LF に揃えて数える）。E-01・E-04・E-05 は、`CR-606`・`CR-607` を当てた後の木では旧が変わっている —— 4.1 節の差分で当てる。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧
```text
設定を開いても選択を解除せず、もう一度同じ入口を押したら直前の選択物へ戻すこと。  
⭐ 文書の設定を出したままパネルを閉じたあとに、設定を出す入口を押したときは、設定を出すこと（MUST） —— 「もう一度同じ入口を押したら直前の選択物へ戻す」は、パネルが設定を出しているあいだの押しに限る。  
⛔ 閉じたあとの押しで、中身を直前の選択物へ切り替えてはならない（MUST NOT） —— 押した入口の職務は設定を出すことであり、閉じる前の中身の逆が出ると、押した入口と違うものが出る。  
```
新
```text
設定を開いても選択を解除しないこと。  
⭐ パネルが文書の設定を出しているあいだに、設定を出す入口をもう一度押したときは、プロパティパネルを閉じること（MUST） —— 直前の選択物が在っても無くても同じとし、選択物へは戻さない（`_assets/tbl-state-machines.md` の 表 T-280 の `propertiesPanelContentStateMachine`）。  
⭐ 戻す先の有無で結果を分けると、同じ押しが 2 つの違う結果を持ち、押す前に読めない —— 押下状態の立った入口をもう一度押せば押す前へ戻る、というほかの表示の入口と同じ形にする。  
⭐ 文書の設定を出したままパネルを閉じたあとに、設定を出す入口を押したときは、設定を出すこと（MUST） —— 閉じたあとの押しは、上の「もう一度」に数えない。  
⛔ 閉じたあとの押しで、中身を直前の選択物へ切り替えてはならない（MUST NOT） —— 押した入口の職務は設定を出すことであり、選択物が出ると、押した入口と違うものが出る。  
```

<!-- EDIT id=E-02 file=docs/spec/_source/state-machines.json -->
旧
```text
       "key": "documentSettingsDisplayed",
       "parent": null,
       "initial": false,
       "carries": [
        {
         "name": "returnSubject",
         "note": {
          "ja": "同じ入口をもう一度押したときに戻す選択物。無いこともある"
         }
        }
       ],
```
新
```text
       "key": "documentSettingsDisplayed",
       "parent": null,
       "initial": false,
       "carries": [],
```

<!-- EDIT id=E-03 file=docs/spec/_source/state-machines.json -->
旧
```text
      "settingsEntryPressed": {
       "hidden": {
        "to": "documentSettingsDisplayed",
        "evidence": [
         "FR-072"
        ]
       },
       "selectionDisplayed": {
        "to": "documentSettingsDisplayed",
        "evidence": [
         "FR-072",
         "IC-17"
        ],
        "note": {
         "ja": "`subject` を `returnSubject` に移す"
        }
       },
       "documentSettingsDisplayed": {
        "to": "selectionDisplayed",
        "evidence": [
         "FR-072"
        ],
        "note": {
         "ja": "`returnSubject` を `subject` に戻す"
        }
       }
      },
```
新
```text
      "settingsEntryPressed": {
       "hidden": {
        "to": "documentSettingsDisplayed",
        "evidence": [
         "FR-072"
        ]
       },
       "selectionDisplayed": {
        "to": "documentSettingsDisplayed",
        "evidence": [
         "FR-072",
         "IC-17"
        ]
       },
       "documentSettingsDisplayed": {
        "to": "hidden",
        "evidence": [
         "FR-072",
         "IC-17"
        ],
        "note": {
         "ja": "直前の選択物の有無を問わない"
        }
       }
      },
```

⭐ 生成の後の 表 T-280 の行（`npm run gen` が書く。見込み）: `| `screen/settingsEntryPressed` | → `documentSettingsDisplayed` | → `documentSettingsDisplayed` | → `hidden`（直前の選択物の有無を問わない） |`。状態の注は「—— 根拠 `S-99h` ・ `FR-072` ・ `IC-17`」になる。

<!-- EDIT id=E-04 file=docs/spec/_assets/tbl-glossary.md -->
旧
```text
| IC-17 | `App Header` | 表示 | 文書の描画設定をプロパティパネルに表示する。<br>⭐ テーマの色相は、その面の先頭の欄で選ぶ（`FR-041` の 表 T-305） | `FR-072` | — | — |
```
新
```text
| IC-17 | `App Header` | 表示 | 文書の描画設定をプロパティパネルに表示する・プロパティパネルを閉じる（`S-99h`）。<br>⭐ テーマの色相は、その面の先頭の欄で選ぶ（`FR-041` の 表 T-305） | `FR-072` | — | — |
```

<!-- EDIT id=E-05 file=docs/spec/_source/display-words.json -->
旧
```text
    "ja": "文書の描画設定をプロパティパネルに表示する。テーマの色相もここで選ぶ",
    "en": "Show the document's drawing settings in the Properties Panel, where the theme hue is chosen"
```
新
```text
    "ja": "文書の描画設定をプロパティパネルに表示する。もう一度押すとパネルを閉じる。テーマの色相もここで選ぶ",
    "en": "Show the document's drawing settings in the Properties Panel, where the theme hue is chosen; press again to close the panel"
```

⭐ 表 T-109 の `IC-17` とその表示語は、検査 37（`check-dictionary-table-covariance.py`）が対の指紋を持つ（`.claude/skills/spec-graph-check/dictionary-table-pairing.txt:237` の `T-109 IC-17`）。E-04・E-05 で指紋が変わる ⇒ 対を読み直したうえで、調整役がその 1 行だけを刷り直す（`CR-606`・`CR-607` も同じ対を動かすので、3 本を当てた後に 1 度でよい）。

### 4.1 重なり

`CR-606`（ラベル「テーマの色相」→「テーマ色」を全体で。語の持ち主）と `CR-607`（設定の面のテーマ色の欄の上に `GRS Reset` の入口を足す。`FR-041` の 表 T-305）は、本書より先に当たる。⇒ **本書の 3 つの EDIT は、当てるときに両書の新の文へ載せ直す（rebase）。** 本書が動かす語は下の「本書の差分」だけであり、ほかの語は両書が残した文をそのまま使う。

| 本書の EDIT | 両書が書き換えうる所 | 本書の差分（載せ直すときはこれだけを当てる） |
|---|---|---|
| E-01（`FR-072` の STATEMENT の 3 行） | ⚠️ 同じ要求の別の行（`01-04-requirements.md` の `FR-072` の「`FR-041` のテーマの色相の欄がこれである」）は `CR-606` が書き換える。本書の旧 3 行は含まない —— 行は重ならないが、オブジェクトは同じ `FR-072` である。`CR-607` が `FR-072` の「本面の欄」の段に `GRS Reset` を足すなら、それも本書の旧の外 | 旧 3 行 → 新 5 行（4 節のとおり）。旧 3 行が両書の後も 1 回だけ現れることを数え直す |
| E-04（表 T-109 の `IC-17` の行） | `CR-606`: 「テーマの色相は」→「テーマ色は」ほか。`CR-607`: 「その面の先頭の欄で選ぶ」（`GRS Reset` が先頭に来れば偽になる）ほか | 最初の文の「表示する。」を「表示する・プロパティパネルを閉じる（`S-99h`）。」にする。⭐ 同じ行の `<br>` から後ろは両書の文のまま |
| E-05（`IC-17` の `hint`） | `CR-606`: `ja` の「テーマの色相もここで選ぶ」、`en` の `theme hue`。`CR-607`: `GRS Reset` を言う句を足すかもしれない | `ja`: 最初の文「文書の描画設定をプロパティパネルに表示する。」の直後に「もう一度押すとパネルを閉じる。」を挟む。`en`: 末尾に `; press again to close the panel` を足す |

⭐ E-02・E-03（`state-machines.json`）は両書とも書かない見込み。`CR-608`（見る範囲の合わせ直し）は本書の後に当たり、本書の旧・新のどれとも重ならない見込み —— 同書が 表 T-280 の `propertiesPanelContentStateMachine` の升を書くなら、本書の新の上に載せる。

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- The rule is table T-280, propertiesPanelContentStateMachine, as CR-609
  E-02 / E-03 leave it:
    hidden                    x settingsEntryPressed -> documentSettingsDisplayed
    selectionDisplayed        x settingsEntryPressed -> documentSettingsDisplayed
    documentSettingsDisplayed x settingsEntryPressed -> hidden
  whether or not a selection was shown before. No guard.
- documentSettingsDisplayed carries NOTHING (returnSubject is gone).
  PropertiesPanelContentState is the generated type; run `npm run gen`,
  never write the region by hand.
- The selection itself is untouched by any of the three (FR-072: opening or
  closing the panel does not clear the selection).
- IC-17 pressed on a hidden panel shows the settings in ONE event
  (settingsEntryPressed); nothing shows the old choice first.
- The pressed look of IC-17 (EN-4, FR-029) is up exactly while
  documentSettingsDisplayed; after the closing press it is down.
- Code: src/use-case/advance-screen-session/screen-values.ts
  onSettingsEntryPressed; src/framework/single-html-shell/frame-loop.ts
  settingsEntryEventsOf / case 'toggleDocumentSettingsProperties' /
  propertiesPanelKept. No new command, no new constant, no new event.
```

## 6. グラフ（`0590ad03`）

- `impact.py FR-072 IC-17 T-280 propertiesPanelContentStateMachine`:
  - `FR-072` を指す要求 6 件・参照 17 か所（`FR-091`:1418、`FR-041`:2089、`FR-009`:2748、`FR-016`:3936（`MK-11`）、`FR-029`:7249（`EN-4`）、`FR-040`:7786（`IN-4`）、5.3 節の `UF-64`・`UF-106`、表 T-109 の `IC-17`、表 T-206 の `S-171`、表 T-280 の出来事 3 行と状態の注 2 行、`createdTaskNamingStateMachine` の 2 か所）。
  - `IC-17` を指す箇所 3（`FR-041`:2089、出来事 `screen/settingsEntryPressed` の行、状態の注 `:317`）。
  - 表 T-280 を指す要求 1（`FR-009`:2829、`EL-16`）と 2 次 13 件（どれも `FR-009` 経由で、続きの印の話）。
  - `propertiesPanelContentStateMachine` は表の行ではない（`impact.py` は「どの表にも無い行」と答える）⇒ 原稿を `git grep` で引いた（13 節）。
- ⭐ 届いた先を 1 つずつ読んだ: 「直前の選択物へ戻す」を言うのは `FR-072` の 2 行（E-01）と生成された `tbl-state-machines.md:309`・`:317`（E-02・E-03 の生成）だけ。`FR-091`（パネルを出すのをやめても選択を解かない）・`FR-041`（色相の欄の置き場）・`FR-009`・`FR-016`・`FR-029`（`EN-4` は「パネルがそれを出している」—— 閉じれば落ちる。真のまま）・`FR-040`（`Esc` の段）・`S-171`・`UF-64`・`UF-106`・出来事の行（「入力: `IC-17` ・ `FR-072`」）は、書き換えの後も真 ⇒ 書き換えない。
- `induced.py FR-072 IC-17 T-280 propertiesPanelContentStateMachine`: 種 3/4 が仕様の対象、種の中の辺 1、閉路 0 ⇒ 1 つずつ書いてよい。
- `rulings.md` を `FR-072`・`T-280`・`S-99h`・`IC-17`・`三`・`propertiesPanelContent` で引いた: 当たりは `JDG-173`（閉じたあとの押しは設定 —— 残す）・`JDG-283`（`IC-17` はパネルを戻す道 —— 残す）・`JDG-450`/`JDG-451`（色相の欄の置き場 —— 触れない）・`JDG-855`（本書）。`JDG-851`（`GRS Reset`）・`JDG-876`（パレットの文字の大きさの入口）は `CR-607` ほかの持ち物で、本書の旧に触れない。⇒ 導いた条項（決定 1〜6）と食い違う裁定は 0。
- `pending-decisions.md`: `PND-496`（裁定済。`JDG-173`）は変わらない。`PND-144` の推奨の決め手は「`FR-072` 自身の「もう一度同じ入口を押したら直前の選択物へ戻すこと」」であり、E-01 でその文が消える（12 節）。`PND-339` は選び直しの話で触れない。

## 7. 数の予測（`0590ad03`。当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables | 差 0 | 表を足しも消しもしない |
| figures | 差 0 | 状態図は 1 枚のまま。矢印は 8 本のまま（`documentSettingsDisplayed → hidden` の名札に `settingsEntryPressed` が加わり、`documentSettingsDisplayed → selectionDisplayed` の名札から抜ける —— 後者は `propertiesOfChoiceAsked` で残る） |
| rows | 差 0 | 表 T-109・表 T-280 の行数は変わらない（行の中の文だけ） |
| uids | 差 0 | 要求を足しも消しもしない |
| `propertiesPanelContentStateMachine` の状態 / 出来事 / 升 | 3 / 7 / 変わらない | 升の先と注だけが変わる |
| 同機械の運ぶ値 | 2 → 1 | `returnSubject` を消す |
| `（MUST）` の印（`01-04-requirements.md`） | ＋1 | E-01 の「プロパティパネルを閉じること（MUST）」。検査 39 のために試験が逐語で引く（8 節の波 1） |

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 | 毎フレーム |
|---|---|---|---|---|
| 0 | ― | `CR-606`・`CR-607` を当てた木で、E-01・E-04・E-05 の旧を数え直し、4.1 節の差分で載せ直す | 当てる体 | ― |
| 1 | ⛔ **L4 の合流を待つ**（`screen-values.ts` は L4 の持ち物で、`npm run gen` がその生成区画を書く）。`docs/spec`（E-01〜E-05）＋ `npm run gen` ＋ `src/use-case/advance-screen-session/screen-values.ts` ＋ 試験の 8 ファイル（9 節の表の試験の 2 行） | 原稿と、それを読むコードを 1 つの波で着地させる（規則 02 の 3.5 —— 生成区画から `returnSubject` が消えると `onSettingsEntryPressed` が `tsc` で落ちる）。`tests/unit/cr-424-the-property-panel-keeps-a-minimum-width.test.ts` の逐語の 2 つを新しい文へ替え、`:369` の場合を「閉じる」へ書き直す（E-01 の「閉じること（MUST）」を逐語で引く） | L4 の後の実装の体 | いいえ —— `onSettingsEntryPressed` は `IC-17` を押した 1 回に 1 度だけ走る。生成した型はコンパイルの時だけのもの |
| 2 | ⛔ **L4 の合流を待つ**（`frame-loop.ts` は L4 の持ち物）。`src/framework/single-html-shell/frame-loop.ts` ＋ `tests/system/divider-colour-corner-and-sticky-field.test.ts` | 遠回りと `propertiesPanelKept` を消す（決定 6）。調整役は同じ波で `PND-338` の行を閉じる（12 節）。系の試験は、注釈枠のプロパティを出す道を `IC-17` の 2 度押しから別の道（同ファイルの名前の直接編集ほか、`FR-072` の入口を持つ要求の道）へ替える | 実装の体 | いいえ —— 入口の命令 `toggleDocumentSettingsProperties` を処す 1 回だけ。描く手順は変わらない |
| 3 | `tests/contract/cr-609-*.test.ts`（新しいファイルだけ） | 5 節の継ぎ目: 設定を出してもう一度押すと閉じる（直前に選択物を出していた場合・出していなかった場合・閉じたパネルから設定を出した場合の 3 つ）／ 閉じても選択は残る ／ `IC-17` の押下状態が落ちる ／ 閉じた後の押しは設定を出す（`JDG-173` の文が今も真） | 仕様だけの試験の体（波 1 と並べてよい） | ― |

⭐ 波 1 だけを当てた木でも利用者の #6 は直る —— シェルの遠回りは閉じたパネルから設定を出すときに 1 度 `selectionDisplayed` を通るだけで、終わりは `documentSettingsDisplayed`、もう一度の押しは `hidden` になる。波 2 は死んだ遠回りと `DEVIATION` の注を消す仕事である。
⭐ ヒント（E-05）の文字列は描き手がツールチップを描くときに読むが、差し替わるのは文字列だけで、手順も回数も変わらない。

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`0590ad03` の行番号）

| ファイル | 関数・所 | 何を | 毎フレーム |
|---|---|---|---|
| `src/use-case/advance-screen-session/screen-values.ts` | `onSettingsEntryPressed`（`:675`〜`:683`） | `documentSettingsDisplayed` なら `{ kind: 'hidden' }` へ動かす。それ以外は `{ kind: 'documentSettingsDisplayed' }` へ（運ぶ値なし） | いいえ |
| 同 | 手書きの `ScreenValuesStateCarried.returnSubject`（`:109`） | 消す（生成区画の `:275` は `npm run gen` が書き換える） | いいえ |
| `src/framework/single-html-shell/frame-loop.ts` | `settingsEntryEventsOf`（`:1025`〜`:1035`。`DEVIATION ... (DFC-677)` の注を含む）と `case 'toggleDocumentSettingsProperties'`（`:2620`〜`:2625`） | 押しは `settingsEntryPressed` を 1 つ送るだけにする。関数と注を消す。⚠️ 注は `JDG-283` を引くが、同番はパネルの境界の裁定である —— 消える注なので直す要は無い | いいえ |
| 同 | `propertiesPanelKept`（`:1587`〜`:1589`、印 `@provisional PND-338` を含む）と、書く所 `notePanelPutAway`（`:1732`〜`:1734`。呼ぶ所 `:2650`）・`followChoiceOnPanel`（`:2666`）・`showPropertiesOfChoice`（`:2716`） | 変数と書く行を消す。`showPropertiesOfChoice` の `STOP` と `@provisional PND-144` の 2 行は、その関数の中に残す（問いは消えていない） | いいえ |
| `tests/unit/cr-424-the-property-panel-keeps-a-minimum-width.test.ts` | `FR_072_BACK_WHILE_SHOWN`・`FR_072_ONLY_WHILE_SHOWN`（`:33`〜`:35`）、それを引く `it.each` の 2 行（`:48`〜`:49`）、場合 `:369`〜`:378` | E-01 の新しい文を逐語で引き、2 度目の押しで `built.panel()` が閉じる（`null`）ことを確かめる | ― |
| `tests/contract/state-machine-screen-values.contract.test.ts`（`:162`）ほか 6 ファイル（`tests/contract/cr-557-a-pressed-hue-swatch-is-one-undoable-step.test.ts:218`・`tests/contract/cr-557-the-theme-hue-field-heads-the-settings-panel.test.ts:198`・`tests/contract/cr-585-hue-swatches-stay-in-colour.test.ts:128`・`tests/contract/dfc-587-title-row-entries-are-drawn.test.ts:115`・`tests/contract/display-words.contract.test.ts:1046`・`tests/unit/cr-541-panels-help-tooltip-and-dialogue.test.ts:84`） | `returnSubject` の見本と `returnSubject: null` | 消す（型から消えるので、残すと余分な性質として `tsc` が落とす） | ― |
| `tests/system/divider-colour-corner-and-sticky-field.test.ts` | `:625`〜`:632`（`FR-072: a second press on ${SETTINGS_ENTRANCE} goes back to the last selection`） | 注釈枠のプロパティを出す道を替える（8 節の波 2） | ― |

⚠️ `CR-578`（`frame-loop.ts` を 1,000 行未満に割る。起草のまま）が先に当たると、上の関数は別のファイルへ移る。⇒ 行番号ではなく関数の名で引く。

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 閉じたあとの押しが設定を出すこと（`JDG-173`、`FR-072` の MUST と MUST NOT）を変えない。
- 設定を出しているあいだに選択が動いたときの扱い（`DFC-706`、`documentSettingsDisplayed` × `selectionMoved`）を決めない（決定 7）。
- 閉じる手立て（`IC-52`・`Esc` の `IN-4`・`SK-19` ほか）を変えない。`IC-17` の押しが 1 つ加わるだけである。
- `FR-072` の「テーマの色相の欄」の行（`CR-606`）と、設定の面の欄の並び（`CR-607`）に触れない。
- 選択物のプロパティを出す入口を足さない（`FR-072`「その入口を本要求が数え上げてはならない（MUST NOT）」）。

## 11. 利用者に問うこと

無い。「もう一度押したら閉じる」は `JDG-855` が、閉じたあとの押しは `JDG-173` が答えている。場合を分けないこと（決定 1）・運ぶ値を消すこと（決定 2）・名簿とヒントの句（決定 4・決定 5）は、裁定と先例から導いた。

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1325` | 設定を開いてもう一度押すと、閉じずに直前の選択物へ戻る | 本書で閉じる（仕様は波 1、コードは波 1・波 2） |
| `DFC-677` | 戻す先の「直前の選択物」が無いときの升の先が決まっていない | 本書で閉じる —— もう一度の押しはどの場合も `hidden` へ行き、戻す先を読まない（決定 1）。`frame-loop.ts:1026` の `DEVIATION ... (DFC-677)` の注は波 2 で消える |
| `JDG-855` | 利用者の裁定（状態「指示 —— 調整役が投入時期を決める」） | 調整役へ: 本書を当てる波が決まったら、状態を「指示 —— `CR-609` が当てる」にする（検査 43）。着地したら 適用済 |
| `PND-338` | 閉じたパネルをどこが保つか（印は `frame-loop.ts:1588`） | 調整役へ: 波 2 で印が変数ごと消える（決定 6）⇒ 同じ波で行を閉じる（検査 25 は双方向に見る）。閉じたことは `S-99h`（画面の値の `propertiesPanelContentState`）が持ち、閉じたパネルの中身は誰も保たない |
| `PND-144` | 選択が消えたときパネルが何を保つか | 本書は閉じない。⚠️ 推奨の決め手（`FR-072` の「もう一度同じ入口を押したら直前の選択物へ戻すこと」）が E-01 で消える ⇒ 調整役が推奨を読み直す |
| `DFC-706` | 設定を出しているあいだに選択が動く | 触れない（決定 7） |

## 13. 測り方の再現

```
# the tree: b2-panel-crs 0590ad03 (refactor); every file below is LF-only (`file` says so)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-072 IC-17 T-280 propertiesPanelContentStateMachine
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-072 IC-17 T-280 propertiesPanelContentStateMachine
#   -> seeds 3 of 4, edges 1, cycles 0

# who reads returnSubject (spec, src, tests, tools)
git grep -n "returnSubject" -- docs/spec src tests tools
#   docs/spec: state-machines.json :1952 :2038 :2047 ; tbl-state-machines.md :309 :317 (generated)
#   src: screen-values.ts :109 (hand-written) :275 (generated) :678 :681 :682 (onSettingsEntryPressed) -> no other reader
#   tests: 7 files (section 9)
git grep -n "propertiesPanelKept\|settingsEntryEventsOf" -- src      # frame-loop.ts only; one reader :2621

# who says "back to the previous selection"
git grep -n "直前の選択物\|もう一度同じ入口\|同じ入口をもう一度" -- . ':!docs/development-records' ':!change-request' ':!previous-project-result'
#   01-04-requirements.md :1954 :1955 :1956 ; state-machines.json :1954 ; tbl-state-machines.md :317 ; tests/unit/cr-424 :33 :35 :38 :354
grep -n "| IC-17 |" docs/spec/_assets/tbl-glossary.md                # :549 (hand-written; no manuscript in _source)
grep -n '"IC-17"' docs/spec/_source/display-words.json               # :256, hint :262-263
grep -c "\"ja\": \".*もう一度押す" docs/spec/_source/display-words.json   # 26 (the precedent of section 0 ①)

# the old blocks: each counted once, LF-normalised, by a script in the session scratchpad
#   (reads the <!-- EDIT --> markers of this file, takes each 旧 fenced block, counts it in its file)
#   E-01 01-04-requirements.md 1 / E-02 state-machines.json 1 / E-03 state-machines.json 1 /
#   E-04 tbl-glossary.md 1 / E-05 display-words.json 1

# the rulings and ledger rows read whole
grep -n "JDG-855 \|JDG-173 \|JDG-283 \|PND-496" docs/development-records/rulings.md
grep -n "DFC-1325 \|DFC-677 \|DFC-706 \|DFC-650 " docs/development-records/defects.md
grep -n "PND-144 \|PND-338 \|PND-339 \|PND-496 " docs/development-records/pending-decisions.md
grep -n "FR-072\|T-280\|S-99h\|IC-17\|三 " docs/development-records/rulings.md

# the pairing fingerprint of check 37
grep -n "T-109 IC-17" .claude/skills/spec-graph-check/dictionary-table-pairing.txt   # :237
```
