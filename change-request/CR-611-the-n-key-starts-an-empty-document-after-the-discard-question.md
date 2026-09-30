# CR-611 — `N` で、問うてから、空の文書を新しく始める

> 起草の状態: 起草（2026-10-01、枝 `b3-export-shell-crs`）。まだ当てていない。4 節の旧 11 件は、読んだ木で各 1 回だった（13 節）。11 節の 2 つの問いは 2026-10-01 に答えを得た（`JDG-972`、2 つとも推奨）—— 答えは E-04 ・ E-10 と 9 節の見本の題に書き入れてある。
> 読んだ木: `refactor` `0590ad03`（枝 `b3-export-shell-crs` の作業木。`docs/spec`・`src`・`tests`・`tools` は `0590ad03` のまま）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-611` を受けた。本書が仕様に取る識別子は、表 `T-342`・接頭辞 `BK`・行 `BK-1` 〜 `BK-6`・行 `SK-25` である（2 節。どれも当てる日に測り直す）。台帳の番号は取らない（12 節）。
> 当てる順: 4 節の旧は、兄弟（`CR-610`・`CR-612`・`CR-613`）のどの旧とも重ならない（13 節）。⚠️ `CR-612` とは生成器 `tools/generate_startup_template.py` と生成物 `src/framework/single-html-shell/startup-template.json` を共有する —— 仕様の旧は重ならず、生成物は後に当てる側が `npm run gen` で起こし直す。⚠️ `CR-610` の `FR-101`（見出しに出すファイルの名）は、本書の E-01 の「新しく始めた後は上書きする先を持たない」を前提に読める（8 節）。仕様は L4 の合流の後、W0 〜 W5 と同じ 1 回の通しで当てる（8 節）。
> **閉じるもの**: `DFC-1322`（`JDG-852`・`JDG-897`・`JDG-921`）・`DFC-1420`（新しく始めた後の `Ctrl+S` が前のファイルを黙って上書きする）・`DFC-1421`（`QN-5` の文が偽になる）。問いは 2026-10-01 に答えを得た（`JDG-972`）。`DFC-1323`（`JDG-853`・`JDG-922`）の「新しく始めた後」の半分は、表 T-342 の `BK-2`・`BK-5` の帰結として満たす（0.2 節の 10）。残り —— 全消し（`HF-20`）と一般則 —— は `DFC-1323` の変更要求に残す。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-852` | 「#3 パレットの右のアイコンは Ctrl + n で新規に始める。 この時全日程をクリア。<br>サンプルのタイトルは Sample Project ... Push Ctrl + n to start with new one. とか表示」（2026-09-30、`rulings.md:1135`） | 新しく始めるときは全日程を消す（テンプレートへ戻さない）。見本の題で新しく始める鍵を案内する | 全日程を消す ⇒ E-01（`FR-095` と 表 T-342）・E-05・E-06・E-07。見本の題 ⇒ 9 節（11 節の問い 2 の答え、`JDG-972`）。鍵は `JDG-897` が上書きした |
| `JDG-897` | 「#3 は N」（2026-09-30、`rulings.md:1180`。示した「Ctrl+Shift+N もブラウザが取る。候補は `N` 1 文字（推奨）か `Alt+N`（Mac で動かない）」への答え） | 鍵は `N` 1 文字。`P`（`SK-14`）・`F`（`SK-18`）と同じ形 | E-02（表 T-036 の `SK-25`） |
| `JDG-921` | 「新規は Nでよいが、確認メッセージを出すよね？ 今の作業を間違って消さないようにしろ。」（2026-09-30、`rulings.md:1183`） | `N` は `IC-98` と同じ道を通り、捨てる前に確かめる。押し違いで今の作業を失わせない | 決定 1（未保存の編集の有無によらず必ず問う）⇒ E-01。問いの文 ⇒ E-04 ・ E-10（11 節の問い 1 の答え、`JDG-972`） |
| `JDG-853` ／ `JDG-922` | `JDG-853`: 「#4 最上位の行操作子の[x] 全消ししたり、Ctrl + nで全消ししたら全行をAutoで開く。<br>倍率も全行表示できる倍率。スクロール位置も一番上。…ただし、これらのロジックは新規作成専用のロジックにするな。…」（`rulings.md:1136`）／ `JDG-922`: 「他は、全部推奨どおり」（`rulings.md:1184`。#4 の推奨は「全消しと新規は `fitPressed` と同じ動き（Auto・レベル 0 を開く・合わせる・一番上）。一般則として、人がズームかスクロールするまで、行の集合が変わるたびに合わせ直す」） | 新しく始めた後は、全行 Auto・段 0 開・合わせた倍率・一番上 | ⭐ 新しく始めた後の半分は、空の文書が持つ値（`BK-2`・`BK-5`）と `OP-10` が既に満たす（0.2 節の 10）。⛔ 新規だけの論理を足さない（`JDG-853` の「新規作成専用のロジックにするな」）。全消しと一般則は `DFC-1323` へ残す |
| `JDG-972` | 「問 7. 出荷する見本の大きさ →一旦保留。 落ち着いたらシンプル化する。 後でやる旨記録しておけ。<br><br>それ以外は、全部推奨で」（2026-10-01。枝 `b3-export-shell-crs` の起草のセッションがまとめて問うた問 1 〜 11 への 1 つの答えのうち、本書の問い 1 ・ 2 に当たる「それ以外は、全部推奨で」の部分） | 本書の 2 つの問いは推奨: ① 捨てる前の確認は、未保存の編集が無くても真になる 1 文（ja「いまの文書を閉じますか？ 保存していない編集と、元に戻す履歴は失われます」／ en「Close the current document? Unsaved edits and the undo history will be lost」）② 見本の題は `Sample Project - Press N to start a new one` | ① は E-04（`QN-5` の場面）と E-10（`QN-5` の文）、② は 9 節の `PROJECT_TITLE`。決定 8 ・ 決定 9。11 節に答えを記した |

### 0.2 調べた結果（`0590ad03`）

1. **いまの `IC-98` の道。** `src/framework/single-html-shell/frame-loop.ts:2421-2425` が `newDocumentEntryPressed` を `hasStartupTemplate` と問い（`discardQuestionOf`、`:1448-1454`。`QN-5` に今の文書の題を挙げる）を載せて送る。`src/use-case/advance-screen-session/file-flow-values.ts:447-450` は、問いが立っていない限り **毎回** 問う（未保存の編集を見ない）。表 T-290 の升（`_assets/tbl-state-machines.md:838`）も同じで、見張りは `hasStartupTemplate` だけである。「はい」で `carryOutOwedAction`（`frame-loop.ts:2363-2372`）が `RD-7` で起動テンプレートへ差し替え、`:2350` の `returnToStartupTemplate()` が `OP-10` の `BT-4` の除外を張り直す。
2. **鍵。** `src/adapter/input-command-translator/shortcut-keys.ts:85-90` に `Ctrl+O`・`Ctrl+S`・`Ctrl+R` と、`P`（`CONSUMED_ELSEWHERE`。拾うのは `screen-state-input.ts:182`）が在り、`N` は無い。⚠️ `N` は既に `NT-7` の答えの鍵である —— `frame-loop.ts:371` の `CONFIRMATION_CANCEL_KEY = 'N'`、`:2823` が問いの立っているあいだ他の何よりも先に拾う。`NT-7`（`01-04-requirements.md:7321`）は「問いが立っているあいだ、この 2 つのキーをほかの何にも渡してはならない」とする。⇒ **`N` を 2 度続けて押すと、1 度目が問いを立て、2 度目は取りやめる。何も捨てない**（E-02 の注）。欄に打つ `n` は `IN-5a`（`:7789`）の「単文字キー」が既に守る。
3. **ヘルプ。** `FR-036`（`:7484`）は「表 T-036 の `入口` の欄が名指す行の割当は、その入口の項目の割当の場所に置く」。`SK-25` の入口は `IC-98` なので、生成物 `src/adapter/screen-renderer/help-roster.json:670-671`（`IC-98` の `keys` はいま `null`）が `npm run gen` で `N` を持つ。⭐ 新しい語は要らない —— `display-words.json` の `shortcuts` が語を持つのは入口が `—` の行だけである（`:3568-3625`）。`IC-98` の説明（`display-words.json:25-34`「開いている文書を捨てて、新しく始める」）は真のまま。
4. **問うのは毎回か、未保存の編集があるときだけか。** 逐語を並べる:
   - `JDG-921`: 「確認メッセージを出すよね？ 今の作業を間違って消さないようにしろ。」
   - `FR-095`（`:6832`）: 「捨てる前に、未保存の編集について表 T-024a の `OP-4` と同じ確認を行うこと（MUST）。」
   - `OP-4`（`:6439`）: 「置き換えを選んだときは、捨てる前に確認を求めること（MUST）。」—— 条件は置き換えだけで、表 T-290 の `openChoiceAnswered` も未保存の編集を見ない。
   - `FR-031`（`:2266-2270`）: 確認を求めてよいのは取り消しで取り戻せないものを失う場面であり、「取り消しの履歴ごと捨てる場合」もこの階級に入る。`RD-7` の履歴の欄は「捨てる」（`05-07-design.md:749`）。
   ⇒ 裁定（`JDG-921`）は条件を付けず、`FR-095` の「未保存の編集について」は導いた句である。**裁定が勝つ**（共通の依頼文）。`FR-031` も、未保存の編集が無くても履歴を捨てる以上、問うことを許す。⇒ 決定 1。⚠️ 帰結: `QN-5` の文「保存していない編集があります。置き換えますか？ 失われます」（`display-words.json:3176-3177`）は、未保存の編集が無いときに偽である。**いまも偽である** —— `IC-98` も `OP-3` の置き換えも `Ctrl+R` の読み直しも、未保存の編集を見ずに `QN-5` を立てる。⇒ 11 節の問い 1（答え A、`JDG-972`。台帳 `DFC-1421`）。
5. **空の文書を ERD と設定の表から定める。** 文書のルートは 表 T-052 の 3 つの群（`DR-2` 日程データ・`DR-3` 見せ方・`DR-4` 刻印）。日程データの群は `project` と 11 の配列（`erd.json` の `container.boxes` の `schedule`）。制約は 2 つだけ在る:
   - 表 T-050 の直下（`:2445-2452`）: 「文書は、`TaskGroup` を必ず 1 つ以上持つこと（MUST）」、行が 0 になるときは深さ `L1` の行を 1 つ、名前は `defaultNames` の `row`、id は新しく採る（「決まった値を使ってはならない（MUST NOT）」）。コードも差し替えの道で `documentHoldingOneRow` を当てる（`src/use-case/apply-document-change/document-change-plan.ts:341`）。
   - 暦は `FR-054` の 表 T-209（`S-106` 月〜金・`S-107` 例外日無し・`S-108`・`S-128`）。`Project` の列の空の可否は 表 T-058（`erd.json` の `nullable`）。見せ方の群は 表 T-202 と 表 T-203（`tests/contract/cr-572-the-file-holds-tables-t-202-and-t-203-only.contract.test.ts`）。`themeHue` と `importSeq` は 表 T-216、`outlineBase` の既定 1 は `FR-021`（`:5865`）。
   ⚠️ `FR-068` の「土台の文書」（`tools/generate_image_to_grs_json_prompt.py:152-192`）が近いが、**そのままは使えない** —— 行の id が決まった値（`:68` の `00000000-0000-4000-8000-000000000001`、名前 `Row 1`）で 表 T-050 の MUST NOT に当たり、刻印の書き手 `ai-conversion`（`:188`）は 表 T-229 に無い。⇒ 決定 2（新しい 表 T-342）。
6. **空の文書で最初の行を足す入口。** 在る。穴は無い —— 行は空の文書が既に 1 つ持ち（`BK-2`）、最も浅い段に足す入口は `HF-17`（`:1743`）、`Task` は `FR-001`（`:1109-1111`）が行の上（いちばん下の行より下も含む）を引いて作る。
7. **新しく始めた後の上書きする先。** `FileStore`（`src/adapter/file-gateway/file-store.ts:59-73`）には上書きする先を手放す行いが無く、`RD-7` の道は店に触れない。`saveHeldDocumentToFile`（`src/framework/single-html-shell/document-file-flow.ts:693-701`）は開いたファイルがあればそこへ書き、`DI-5`（`:6807`）はその道で問わない。⇒ **いま `IC-98` の後の `Ctrl+S` は、前に開いたファイルへ新しい文書を黙って書く**（コードで確かめた。未再現）。`DI-5` の前提「開いたファイルは、定義によりこの文書のファイルである」が破れている。⇒ E-01 の 2 つ目の MUST。台帳の行は `DFC-1420`（前に立つ者が起こした。12 節）。
8. **刻印。** `RD-7` の刻印の欄は「入ってきたまま」（`05-07-design.md:749`）。その理由（`:766-767`）は「ファイルと起動テンプレートから来る文書は、書かれたときの刻印を持っていなければ `FR-063` の等値の判定が意味を成さない」である。空の文書は差し替えるその時に作るので、書かれたときの刻印を持たない ⇒ 理由が当たらない。さらに `WS-7` は「日程データの群が動いたか」を `scheduleUpdatedUtc` の等値で導く（`:771`）ので、生成器の定めた刻（`tools/generate_startup_template.py:113` の `STAMPED_AT`。起動テンプレートと同じ値）を入ってきたままにすると、起動テンプレートから新しく始めたとき「動いていない」と導かれ、`AG-6` の監視が変化を見落とす。⇒ E-05（刻印を「進める」）。書き手の語は画面なので 表 T-229 の `ED-1` —— 表 T-229 は変えない。
9. **`OP-10` と `FR-055`。** 空の文書は表示位置が `null`（`BK-5`）なので `OP-10` の冒頭（`FR-055` の全体表示）に入る。`FR-055`（`:5402-5403`）は「描くものが 1 つも無い文書では、倍率を等倍に戻し、表示位置を `scrollDate` に合わせる」「`null` のときは実行日に合わせてよい（MAY）」。`OP-10` の `BT-4` の除外は、空の文書が `BT-4` から開いた文書ではなく、`Task` も持たないので働かない。⇒ **`OP-10` は真のまま**。⚠️ コードの `:2350` `returnToStartupTemplate()` は除外を張り直すので、`leaveStartupTemplate()` に替える（9 節）。
10. **`DFC-1323` の新規の半分。** `JDG-922` の #4 が新規に求めるのは Auto・段 0 を開く・合わせる・一番上である。空の文書は行 1 つが `auto`（`BK-2`、`TaskGroup.treeState` は「新しく作る行は `auto`」）、段 0 は `S-418` の既定 `'auto'`、倍率と位置は 9 のとおり `FR-055`、上端は `scrollGroupId` が `null`（`BK-5`）。⇒ **作りの帰結として満たす**。`fitPressed` を送る論理は足さない（`JDG-853`「新規作成専用のロジックにするな」）。
11. **`WY-1`（`:6300`）。** 「編集 → JSON へ書き出し → 初期化（`FR-095`）→ その JSON を読み込み」は、初期化の後が空の文書になるだけで真のまま（読み込みは `OP-4` の問いを経て置き換える）。語「初期化」も `FR-095` を名指したまま。
12. **見本の題。** `tools/generate_startup_template.py:898` の `PROJECT_TITLE`（`:2539` で `Project.title` に入る。中立語の検査の集合 `:4052` にも入る）。生成物は `src/framework/single-html-shell/startup-template.json`（`:106-107` の `OUT`、`:7` に題）。⭐ 題を逐語で持つ試験は無い —— `tests/contract/dfc-378-a-write-that-changed-nothing-answers-the-same-document.test.ts:37` の同じ綴りは、自前の文書の値である。⚠️ 保存するときのファイル名の案は題に拡張子を足したもの（`document-file-flow.ts:175`）なので、題の末の `.` は `….json` の `..` になる。
13. **散文の数。** `FR-086`（`:5776`）が「表 T-036 の 27 行」と数えている。`SK-25` を足すと 28 行 ⇒ E-03。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4`（すぐわか）／ `GL-006`** —— 見本の題が「`N` で新しく始める」を告げ、押せば白紙が出る。消す手間を人に掛けない。
- ⭐ **`GL-004`（WYSIWYG）** —— `WY-1` の「初期化」が、テンプレートの残りの無い空の文書になる。
- ⚠️ **`GL-006` の誤操作への備え** —— 1 文字の鍵なので、未保存の編集が無くても問う（決定 1）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— `FR-095` の「未保存の編集について」と表 T-290（毎回問う）が食い違い、`QN-5` の文が表 T-290 の立て方と食い違う（0.2 節の 4）→ E-01・問い 1。空の文書の中身を持つ所が無かった → 表 T-342（E-01）。
- **`R1.4`（異常系）** —— 新しく始めた後の `SK-11` が前のファイルを黙って上書きする（0.2 節の 7）→ E-01。
- **`R1.2`（検証できる表現）** —— 空の文書は 表 T-342 の 6 行で、どの値も表の行か数で言える（5 節の観測）。
- **`R2.14`（POLA）** —— 9 節の `returnToStartupTemplate()` は、テンプレートでない文書に `BT-4` の除外を張る名である → 替える。
- **`R2.21`（1 つの仕事は 1 か所）** —— `N` と `IC-98` は同じ関数を呼ぶ（9 節）。空の文書は起動テンプレートと同じ生成器が同じ回に起こす。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `N` も `IC-98` も、未保存の編集の有無によらず必ず問う | 0.2 節の 4。裁定 `JDG-921` は条件を付けず、`FR-095` の条件の句は導いたもの。`RD-7` は履歴を捨てるので `FR-031` の階級に入る。表 T-290 はいまも毎回問う（振る舞いは変わらない） | 保存した直後でも 1 打（`y`）要る。`QN-5` の文を直す（問い 1 の答え A、`JDG-972`） |
| 決定 2 | 空の文書を新しい 表 T-342（`FR-095` の中）に置く | 表が唯一の正（依頼文の規則）。`FR-068` の土台の文書は行の id と書き手で使えない（0.2 節の 5） | 表 1 つ・接頭辞 1 つ・行 6 つが増える |
| 決定 3 | 日程も暦も `project` の列も見せ方も、すべて表の既定へ戻す（今の文書の暦・色相・プロジェクト情報を持ち越さない） | `JDG-852`「全日程をクリア」と「新規に始める」。持ち越すと、見本から始めた白紙が見本の持ち主（`PF-1` 〜 `PF-10`）と休日を名乗る | 自分の暦を作り込んだ人は、新しく始めるたびに作り直す（MSPDI を取り込めば戻る） |
| 決定 4 | 新しく始めた後は上書きする先を持たない | `DI-5` の前提（開いたファイルはこの文書のファイル）が空の文書には成り立たない。`FR-060` の「起動した直後の最初の保存で選び直す」と同じ形 | 新しく始めた後の最初の `Ctrl+S` は保存先を選ばせる |
| 決定 5 | `RD-7` の刻印を「入ってきたまま」から「進める」に替える | 0.2 節の 8。「入ってきたまま」の理由が当たらず、`WS-7` の等値が変化を見落とす | 空の文書の刻は押した時刻になり、書き手は `user` |
| 決定 6 | `DFC-1323` の新規の半分は、空の文書の値の帰結として満たし、論理を足さない | 0.2 節の 10。`JDG-853`「新規作成専用のロジックにするな」 | 全消し（`HF-20`）の後の合わせは、`DFC-1323` の変更要求が当てるまで今のまま |
| 決定 7 | `SK-25` を `SK-10`（開く）の直下に置く | ファイルの操作の並び（開く・新しく始める・保存する） | — |

⭐ 次の 2 つは問うて決めた（11 節の問い 1 ・ 2、答えは `JDG-972`）。問わずに決めた上の 7 つと区別するために、ここに分けて置く。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 8 | `QN-5` を、未保存の編集の有無によらず立つ場面にし（E-04）、文を、どちらの場合にも真な 1 文にする（E-10）: ja「いまの文書を閉じますか？ 保存していない編集と、元に戻す履歴は失われます」／ en「Close the current document? Unsaved edits and the undo history will be lost」 | 問い 1 の答え A（`JDG-972` の ①）。置き換え・読み直し・新しく始めるの 3 つが同じ問いを出す | 問いは 1 つのまま。`QN-11` は足さない |
| 決定 9 | 見本の題を `Sample Project - Press N to start a new one` にする（9 節の `PROJECT_TITLE`） | 問い 2 の答え A（`JDG-972` の ②）。`JDG-852` の形を保ち、鍵を `N` にした | 見本を保存するときのファイル名の案が `Sample Project - Press N to start a new one.json` になる |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所（`0590ad03`） | 編集 |
|---|---|---|
| 新しく始める = 空の文書、必ず問う、上書きする先を持たない | `FR-095` の STATEMENT・RATIONALE（`01-04-requirements.md:6831-6838`）＋ 新しい 表 T-342 | E-01 |
| 鍵 `N` | 表 T-036（`:4988` の `SK-10` の直下） | E-02 |
| 散文の数 | `FR-086`（`:5776`） | E-03 |
| 問いの場面 | 表 T-234 の `QN-5`（`:7420`） | E-04（問い 1 の答え A） |
| 差し替えの行 | 表 T-230 の `RD-7`（`05-07-design.md:749`）と注（`:756-757`） | E-05・E-06 |
| 入口の説明 | 表 T-109 の `IC-98`（`_assets/tbl-glossary.md:528`） | E-07 |
| 出来事と遷移 | `_source/state-machines.json:3992-4024`・`:4851-4879`（生成物 `_assets/tbl-state-machines.md:726`・`:838` と図） | E-08・E-09 |
| 問いの文 | `_source/display-words.json:3176-3177` | E-10（問い 1 の答え A。語は `JDG-972` が逐語で持つ） |
| 接頭辞の登録 | `_source/row-id-prefixes.json:101`（生成物 `_assets/tbl-row-id-prefixes.md`） | E-11 |
| 変えない | `FR-027`・表 T-034 の `BT-4`・`OP-4`・`OP-10`・`FR-055`・`WY-1`・表 T-229・`IC-98` の語 | — |

**数**: 仕様の文の編集 7（E-01 〜 E-07）、原稿 JSON の編集 4（E-08 〜 E-11）、生成物の起こし直し 4（`tbl-state-machines.md`・`tbl-row-id-prefixes.md`・`src/adapter/screen-renderer/display-words.json`・`help-roster.json`）。`（MUST）` が 1 つ増える（7 節）。

## 2. 新しい識別子

| 識別子 | 種 | 何 | 空きの根拠 |
|---|---|---|---|
| `T-342` | 表 | 空の文書（`FR-095` の中、RATIONALE の後） | 表の番号は `docs/spec` で最大 `T-339`（0590ad03 で最大 T-339、当てる日に測り直す）。`T-340` ・ `T-341` は先に当てる `CR-610` が取る（前に立つ者の振り分け、2026-10-01） |
| `BK` | 接頭辞 | Blank document —— 表 T-342 の行 | 登録簿（`_source/row-id-prefixes.json`）に無く、三つの木に `BK-n` が 0 件（13 節）。当てる日に測り直す |
| `BK-1` 〜 `BK-6` | 行 | 表 T-342 の 6 行 | 接頭辞が新しい |
| `SK-25` | 行 | 表 T-036 の `N`（新しく始める） | `SK` の行は最大 `SK-24`（0590ad03 で最大 SK-24、当てる日に測り直す） |

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`0590ad03`） | 置き換わる先 |
|---|---|---|
| 「`BT-4` と同じ状態に戻す」 | `FR-095` STATEMENT（`:6831`）・`IC-98`（`tbl-glossary.md:528`）・`RD-7`（`05-07-design.md:749`・`:757`） | 「表 T-342 の空の文書に置き換える」 |
| 「未保存の編集について」 | `FR-095` STATEMENT（`:6832`） | 「未保存の編集の有無によらず」 |
| 「出すものは `FR-027` のテンプレート」 | `FR-095` RATIONALE（`:6838`） | 「出すものは空の文書であり、`FR-027` のテンプレートではない」 |
| `RD-7` の刻印「入ってきたまま」 | `05-07-design.md:749` | 「進める」 |
| 「扱いは `RD-4` と同じ」「違うのは出どころだけ」 | `05-07-design.md:756-757` | 履歴と取り消しの 1 段は同じ、出どころと刻印が違う |
| 運ぶ値 `hasStartupTemplate` と、その 2 つの見張り（`not` の枝は `RS-27` を告げる） | `state-machines.json:4004-4013`・`:4851-4879` | 無し（空の文書は常に在る）。`notAsked` → `questionAsked` を見張り無しで |
| 「未保存の編集を捨てて置き換えるとき」（`QN-5` の場面） | `:7420` | 「いまの文書を捨てて置き換えるとき（…）。未保存の編集の有無によらず立つ」（E-04、問い 1 の答え A） |
| 「保存していない編集があります。…」 | `display-words.json:3176-3177` | 「いまの文書を閉じますか？ 保存していない編集と、元に戻す履歴は失われます」（E-10、`JDG-972` の ①） |
| 「表 T-036 の 27 行」 | `:5776` | 「28 行」 |
| コード: `hasStartupTemplate`・`returnToStartupTemplate()` の `RD-7` の枝・`RD-7` への起動テンプレートの受け渡し | 9 節 | 9 節 |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 旧を新で置き換える。置き換える前に、旧がそのファイルに 1 回だけ現れることを数える（13 節。改行は正規化して比べる。この木の `docs/spec` は CRLF、`row-id-prefixes.json` は LF）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-095` の STATEMENT から RATIONALE まで。旧
```text
**STATEMENT**: 作成者が新しく始めることを選んだとき、`GRS` は、**開いている文書を捨てて表 T-034 の `BT-4` と同じ状態に戻すこと**。  
捨てる前に、未保存の編集について表 T-024a の `OP-4` と同じ確認を行うこと（MUST）。

**ORIGIN**: UC-011 拡張 1b

**RATIONALE**: 表 T-041 の `WY-1` は判定の手順に「初期化」を置いており、それを行うのが本要求である。  
判定条件が指す操作が存在しないと、`GL-004`（WYSIWYG）の達成を確かめられない。  
出すものは `FR-027` のテンプレートであり、本要求は別のテンプレートを持たない。
```
新
```text
**STATEMENT**: 作成者が新しく始めることを選んだとき、`GRS` は、**開いている文書を捨てて、表 T-342 の空の文書に置き換えること**。  
捨てる前に、未保存の編集の有無によらず、表 T-024a の `OP-4` と同じ確認を求めること（MUST） —— 置き換えは取り消しの履歴ごと捨てるので（`05-07-design.md` の 表 T-230 の `RD-7`）、`FR-031` が確認を許す階級に入る。  
新しく始めた後は、上書きする先を持たないこと（MUST） —— 空の文書はどのファイルにも無いので、表 T-227 の `DI-5` の前提（開いたファイルはこの文書のファイルである）が成り立たない。

**ORIGIN**: UC-011 拡張 1b

**RATIONALE**: 表 T-041 の `WY-1` は判定の手順に「初期化」を置いており、それを行うのが本要求である。  
判定条件が指す操作が存在しないと、`GL-004`（WYSIWYG）の達成を確かめられない。  
⭐ 出すものは空の文書であり、`FR-027` のテンプレートではない —— 新しく始める人が要るのは消す手間の無い白紙であり、テンプレートは起動した直後に 1 度だけ出すものである（`FR-027`）。  
⭐ 問うかどうかを未保存の編集で分けないのは、入口の 1 つが 1 文字の鍵（表 T-036 の `SK-25`）だからである —— 保存した後の押し違いでも、取り消しの履歴は戻らない。  
⚠️ 上書きする先を持たないので、新しく始めた後の最初の `SK-11`（表 T-036）は、起動した直後と同じく保存先を選ばせる（`FR-060`）。

**表 T-342 — 空の文書**

| 行 ID | 群（表 T-052） | 空の文書が持つもの |
| --- | --- | --- |
| BK-1 | 日程データの群（`DR-2`）の配列のうち、`BK-2` と `BK-3` を除くすべて | 空。<br>`Task` が 1 つも無いので、`Task` の列である依存と WBS の親子も無い |
| BK-2 | 行（`taskGroups`） | 1 つ —— 表 T-050 の直下の規則が、行が 0 の文書に作る 1 行である。<br>名前・深さ・id の採り方はその規則が持ち、id は新しく始めるたびに新しく採る |
| BK-3 | 暦（`calendars`） | 1 つ —— 稼働する曜日は `_assets/tbl-settings.md` の 表 T-209 の `S-106`、例外日は同表の `S-107` とする。<br>`uid`・名前・出現順は `FR-068` の土台の文書の暦と同じとする |
| BK-4 | `project` | `null` を取れる列（`_assets/fig-erd-detail.md` の 表 T-058）は `null` とし、`calendarUid` だけは `BK-3` の暦を指す（`FR-054`）。<br>`null` を取れない列は、`themeHue` を `_assets/tbl-settings.md` の 表 T-216 の `S-73`、`importSeq` を同表の `S-71`、`uidHighWaterMark` を `0`、`outlineBase` を `1`（`FR-021`）、`sourceFormat` を `grs` とし、`carry` と `carryElements` は空とする。<br>⚠️ `title` も `null` である —— タブの見出しは `FR-035` の `Untitled` になる |
| BK-5 | 見せ方の群（`DR-3`） | `_assets/tbl-settings.md` の 表 T-202 と 表 T-203 の既定。<br>表示位置が `null` なので、倍率と表示位置は 表 T-024a の `OP-10` の冒頭（`FR-055` の全体表示）が決める。<br>⚠️ 同じ文書の 表 T-206 の値（保存しないもの）は変えない —— 文書の値ではない |
| BK-6 | 文書の刻印（`DR-4`） | `schemaVersion` は `FR-027` のテンプレートと同じ版、`changeLog` は空、`documentStamp.fileSavedUtc` は空とする（まだファイルへ書いていない）。<br>ほかの刻と書き手は、差し替えが進める（`05-07-design.md` の 表 T-230 の `RD-7`） |

> ⚠️ **本表の 6 行が空の文書の全数である** —— 行は 表 T-052 が文書のルートに置く 3 つの群に沿い、日程データの群は `BK-1` 〜 `BK-4` に分けてある。
```

⚠️ 新の STATEMENT の 3 文と RATIONALE の 5 文は、どれも 1 行で終わる（検査 46）。表の直前・直後の空行は、既存の表（`FR-070` の 表 T-036）と同じ形。

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
表 T-036。旧
```text
| SK-10 | 開く | `Ctrl` ＋ `O` | IC-1 |
```
新
```text
| SK-10 | 開く | `Ctrl` ＋ `O` | IC-1 |
| SK-25 | 文書を新しく始める（`FR-095`）。<br>⚠️ 問いが立っているあいだの `n` は 表 T-037 の `NT-7` の答え（取りやめる）であり、本行に届かない —— 続けて 2 度押しても、2 度目は問いを閉じるだけで何も捨てない | `N` | IC-98 |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`FR-086`。旧
```text
表 T-109 の 113 行・表 T-036 の 27 行・表 T-234 の 8 行
```
新
```text
表 T-109 の 113 行・表 T-036 の 28 行・表 T-234 の 8 行
```

⚠️ 当てる日に 表 T-109 と 表 T-234 の行数も数え直す（兄弟が変えていれば、その数も直す）。

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
表 T-234 の `QN-5`。⭐ 問い 1 の答え A（`JDG-972` の ①）。旧
```text
| QN-5 | 未保存の編集を捨てて置き換えるとき | 挙げる —— 捨てる文書の名前 | 表 T-024a の `OP-4` |
```
新
```text
| QN-5 | いまの文書を捨てて置き換えるとき（`FR-095` の新しく始めることを含む）。<br>未保存の編集の有無によらず立つ | 挙げる —— 捨てる文書の名前 | 表 T-024a の `OP-4` |
```

<!-- EDIT id=E-05 file=docs/spec/05-07-design.md -->
表 T-230。旧
```text
| RD-7 | `FR-095` の初期化 | 呼び手が持って来る（表 T-034 の `BT-4` の同梱の雛形） | 捨てる | 入ってきたまま | 積まない | `FR-095` ／ `OP-4` |
```
新
```text
| RD-7 | `FR-095` の初期化 | 呼び手が持って来る（`01-04-requirements.md` の 表 T-342 の空の文書） | 捨てる | 進める | 積まない | `FR-095` ／ `OP-4` |
```

<!-- EDIT id=E-06 file=docs/spec/05-07-design.md -->
表 T-230 の注。旧
```text
⭐ **扱いは `RD-4` と同じであり、選んだのではなく導いた** —— `FR-095` は人が求め、`OP-4`（問いは 表 T-234 の `QN-5`）で確かめたうえで、持っているものを置き換える道である。  
⛔ **`RD-4` と違うのは、入ってくる文書の出どころだけである** —— **ファイルではなく、表 T-034 の `BT-4` の同梱の雛形から来る。**
```
新
```text
⭐ **履歴と取り消しの 1 段の扱いは `RD-4` と同じであり、選んだのではなく導いた** —— `FR-095` は人が求め、`OP-4`（問いは 表 T-234 の `QN-5`）で確かめたうえで、持っているものを置き換える道である。  
⛔ **`RD-4` と違うのは、入ってくる文書の出どころと刻印である** —— **空の文書（`01-04-requirements.md` の 表 T-342）は差し替えるその時に作るので、書かれたときの刻印を持たない。**  
⭐ 下の「入ってきたまま」の理由（`FR-063` の等値）が当たらないので、刻印を進める。
```

⚠️ 旧の 2 行目の末の 2 つの空白（段落の中の改行）は旧に含めていない —— 置き換えた後も新の 3 行目の末に残る。

<!-- EDIT id=E-07 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の `IC-98`。旧
```text
| IC-98 | `App Header` | 文書 | 文書を新しく始める（開いている文書を捨て、表 T-034 の `BT-4` と同じ状態へ戻す）。<br>⚠️ 捨てる前の確認は `FR-095` が表 T-024a の `OP-4` に揃えている | `FR-095` | — | — |
```
新
```text
| IC-98 | `App Header` | 文書 | 文書を新しく始める（開いている文書を捨て、`01-04-requirements.md` の 表 T-342 の空の文書にする）。<br>⚠️ 捨てる前の確認は `FR-095` が表 T-024a の `OP-4` に揃えている | `FR-095` | — | — |
```

<!-- EDIT id=E-08 file=docs/spec/_source/state-machines.json -->
出来事 `newDocumentEntryPressed`。旧
```text
     "key": "newDocumentEntryPressed",
     "source": {
      "kind": "input",
      "rows": [
       "IC-98",
       "FR-095"
      ],
      "note": {
       "ja": "新しく始める入口"
      }
     },
     "carries": [
      {
       "name": "hasStartupTemplate",
       "rows": [
        "FR-095"
       ],
       "note": {
        "ja": "始める元の文書が在るか。呼び手が詰める"
       }
      },
      {
       "name": "question",
```
新
```text
     "key": "newDocumentEntryPressed",
     "source": {
      "kind": "input",
      "rows": [
       "IC-98",
       "SK-25",
       "FR-095"
      ],
      "note": {
       "ja": "新しく始める入口・`N`"
      }
     },
     "carries": [
      {
       "name": "question",
```

<!-- EDIT id=E-09 file=docs/spec/_source/state-machines.json -->
`confirmationStateMachine` の遷移。旧
```text
      "newDocumentEntryPressed": {
       "notAsked": [
        {
         "to": "questionAsked",
         "guard": [
          {
           "name": "hasStartupTemplate"
          }
         ],
         "evidence": [
          "FR-095",
          "QN-5"
         ]
        },
        {
         "to": "notAsked",
         "guard": [
          {
           "name": "hasStartupTemplate",
           "not": true
          }
         ],
         "effect": "raiseNotice",
         "effectArgument": "RS-27",
         "evidence": [
          "RS-27"
         ]
        }
       ],
```
新
```text
      "newDocumentEntryPressed": {
       "notAsked": {
        "to": "questionAsked",
        "evidence": [
         "FR-095",
         "QN-5"
        ]
       },
```

⚠️ `questionAsked` の升（→ 自己 / `raiseNotice`（`RS-27`））は変えない。形は `overwriteQuestionRaised` の `notAsked`（`:4954-4960`）と同じ。当てた後 `npm run gen` で `_assets/tbl-state-machines.md` を起こし直す（手で書かない）。

<!-- EDIT id=E-10 file=docs/spec/_source/display-words.json -->
`QN-5` の文。⭐ **語は利用者が認めた** —— 問い 1 の答え A（`JDG-972` の ①）が ja ・ en の 2 文を逐語で持つ（同ファイルの `$comment`「AN AGENT MUST NOT INVENT ONE」を満たす）。旧
```text
    "ja": "保存していない編集があります。置き換えますか？ 失われます",
    "en": "There are unsaved edits. Replace the document? They will be lost"
```
新
```text
    "ja": "いまの文書を閉じますか？ 保存していない編集と、元に戻す履歴は失われます",
    "en": "Close the current document? Unsaved edits and the undo history will be lost"
```

<!-- EDIT id=E-11 file=docs/spec/_source/row-id-prefixes.json -->
接頭辞の登録（`BF` と `BL` のあいだ、字の順）。旧
```text
  {
   "prefix": "BL",
```
新
```text
  {
   "prefix": "BK",
   "words": "Blank document",
   "owner": "spec",
   "means": {
    "ja": "新しく始めたときに置く空の文書の中身"
   }
  },
  {
   "prefix": "BL",
```

## 5. 継ぎ目 —— 仕様だけを読む試験の体に渡す

```
SEAM-1 (key, T-036 SK-25)
- src/adapter/input-command-translator/shortcut-keys.ts: a plain `n` (no modifier) answers
  acted({ kind: 'startNewDocument' }). The kind is added to the action union in
  input-command-translator.ts (L4) beside 'reopenDocumentFile'.
- frame-loop.ts handles 'startNewDocument' by calling the SAME function the IC-98 entry calls
  (one function, two callers; name it askToStartNewDocument(frame)).
- While a question is up, `n` stays the NT-7 cancel (frame-loop.ts:2823 runs first). Unchanged.

SEAM-2 (state machine, T-290)
- Event: { type: 'newDocumentEntryPressed', question } -- hasStartupTemplate is GONE.
- confirmationStateMachine.notAsked -> questionAsked, no guard (unsaved edits are NOT read).
  questionAsked -> questionAsked / raiseNotice('RS-27') (unchanged).

SEAM-3 (the empty document, T-342)
- tools/generate_startup_template.py writes src/framework/single-html-shell/empty-document.json
  in the same run as startup-template.json: same schemaVersion, documentSettings = the T-202/T-203
  defaults, one calendar (Mon..Fri working, no exceptions; uid/name/ordinal as FR-068's base),
  project per BK-4, every schedule array empty INCLUDING taskGroups (the landing adds the row:
  document-change-plan.ts:341 documentHoldingOneRow with a fresh id and the defaultNames row word).
- carryOutOwedAction('startNewDocument') -> replaceHeldDocument({ row: 'RD-7', document: empty,
  editedBy, updatedUtc }). RD-7 now ADVANCES the stamp like RD-3 (advancedStamp).
- After landing, call leaveStartupTemplate(), not returnToStartupTemplate().

SEAM-4 (save target, FR-095 second MUST)
- FileStore (src/adapter/file-gateway/file-store.ts, IF-3) gains forgetOpenedFile(): void --
  after it, readOpenedFileState() answers { kind: 'none' } and the candidate read by
  readFileToOpen is dropped too. The flow calls it when RD-7 lands.

Observable (for the tester, from the spec only):
- Press `n` with nothing unsaved: the QN-5 question shows (FR-095 asks always). Press `n` again:
  the question closes, the document is unchanged. Press `n`, then `y`: the document equals T-342.
- After `y`: tasks/resources/assignments/annotations/baselines are empty; exactly one row, depth L1,
  named by defaultNames.row, and two new-document presses give two different row ids; one
  calendar Mon..Fri with no exception; project.title null; themeHue 214; documentSettings equal to
  the T-202/T-203 defaults; zoom 1 (FR-055 on a document with nothing drawn); fileSavedUtc null;
  lastEditedBy 'user'; scheduleUpdatedUtc differs from the document before.
- Open a GRS JSON file, press `n`, `y`, then Ctrl+S: the store's writeChosenFile is called (a
  chooser), overwriteOpenedFile is NOT called.
- The help lists `N` at the IC-98 item (FR-036).
```

## 6. グラフ（`0590ad03`）

| 対象 | 届く先（`impact.py`） | 読んだ結果 |
|---|---|---|
| `FR-095` | 要求 2 ／ 参照 9 —— `FR-080`（`WY-1`、`:6300`）・`FR-076`（`:7427`）・`05-07-design.md:575`・`:749`・`:756`・`:758`・`tbl-glossary.md:528`・`tbl-state-machines.md:726`・`:736` | `:6300`（`WY-1`）は真のまま（0.2 節の 11）。`:7427`（`FR-095` は `QN-5` を使い行を持たない）は真のまま。`:575` は変わらない。`:749`・`:756`・`:757` は E-05・E-06、`:528` は E-07、`:726` は E-08 の生成物。`:736`（`newDocumentLanded`）と `:758` は真のまま |
| 表 T-036 | 1 次 16 ／ 2 次 53 | 行数を散文で持つのは `FR-086`（`:5776`）だけ ⇒ E-03。`FR-036`（`:7481`・`:7484`）は入口を持つ行の割当を入口の項目に置くので、語を足さずに `N` が出る |
| `IC-98` | 参照 1 —— `tbl-state-machines.md:726` | E-08 |
| `BT-4` | 要求 3 ／ 参照 6 —— `FR-087`（`OP-10`）・`FR-095`・`FR-063`（`ED-3`）・`05-07-design.md:749`・`:757`・`tbl-glossary.md:528` | `OP-10` と `ED-3` は起動テンプレートの話のまま真。ほかは E-01・E-05 〜 E-07 で `BT-4` を指さなくなる |
| `QN-5` | 要求 1 ／ 参照 8 —— `FR-100`（`:6534`）・`05-07-design.md:500`・`:756`・`tbl-state-machines.md:722`・`:726`・`:728`・`:814`・`:845` | どれも問いを名指すだけで、場面の文を写していない ⇒ E-04 で動かない |
| `RD-7` | 参照 2 —— `05-07-design.md:755`・`tbl-state-machines.md:736` | 真のまま |
| `WY-1` ・ `OP-10` | 要求 6 ／ 参照 7、要求 5 ／ 参照 15 | 変えない（0.2 節の 9・11） |

`induced.py FR-095 T-036 T-230 T-234 T-290 T-109 T-050 T-052 FR-060` → 9 of 9、辺 2、閉路 0。⇒ E-01 〜 E-11 はどの順で当ててもよい。

## 7. 数の予測（`0590ad03`。当てた後に同じ数え方で突き合わせる）

| 数 | `0590ad03` | 本書を当てた後 | 数え方 |
|---|---|---|---|
| tables / figures / rows / uids（`md-checks.py`） | 212 / 29 / 2685 / 176 | 213 / 29 / 2692 / 176 | 表 +1（T-342）、行 +7（`SK-25`・`BK-1` 〜 `BK-6`） |
| 表 T-036 の行 | 27 | 28 | `impact.py T-036` |
| `（MUST）` の印（`docs/spec/*.md` と `_assets/*.md`） | 1510 | 1511 | `FR-095` の STATEMENT が 1 → 2 |
| `（MUST NOT）` の印 | 941 | 941 | — |
| 接頭辞の登録 | 189 件 | 190 件 | `row-id-prefixes.json` の `prefix` |
| 試験が逐語で持たない MUST（検査 39） | 基準線 | 基準線 ＋ 1 まで | 新しい MUST は 9 節の試験が逐語で持つ |

## 8. 波 —— 持ち場で割る

⭐ 仕様（E-01 〜 E-11）は、L4 が合流した後に `docs/development-records/cr-plan-2026-09-26.md` の W0 〜 W5 と同じ 1 回の通しで当てる。⭐ E-04 ・ E-10 と 9 節の題は、問い 1 ・ 2 の答え（`JDG-972`）で決まっている。

| 波 | 持ち場 | ファイル | 待つもの |
|---|---|---|---|
| S | 仕様 | E-01 〜 E-11、`npm run gen` | L4 の合流 |
| C1 | 生成器 | `tools/generate_startup_template.py`（題・`empty-document.json`）、生成物 2 つ | `CR-612` と同じ生成器 —— 後に当てる側が起こし直す |
| C2 | 使い道・門 | `file-flow-values.ts`・`advance-screen-session.ts`・`document-change-plan.ts`・`file-store.ts`・`file-system-access-file-store.ts`・`document-file-flow.ts`・`shortcut-keys.ts`・`single-html-shell.ts` | S |
| C3 | L4 の持ち場 | `frame-loop.ts`・`input-command-translator.ts` | ⛔ **L4 の合流を待つ** |
| T | 試験の体（仕様だけを読む） | 5 節の観測 | C1 〜 C3 の合流した木で |

⚠️ `CR-610`（`FR-101`）への申し送り: 本書の後、新しく始めた文書は開いたファイルを持たないので、見出しのファイルの名と時刻は「まだ書いていない」側になる（`DFC-783`・`DFC-574` のコードの側は本書で直さない）。

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`0590ad03` の行番号）

| ファイル | 直すこと | 持ち場 |
|---|---|---|
| `src/adapter/input-command-translator/shortcut-keys.ts:85-90` | 修飾の無い `n` で `acted({ kind: 'startNewDocument' })`。`KEY` に `n` を足す（`input-command-translator.ts:394`） | C2 ／ `KEY` と型は C3 |
| `src/adapter/input-command-translator/input-command-translator.ts:237` | 動きの型に `startNewDocument` を足す | C3（L4） |
| `src/framework/single-html-shell/frame-loop.ts:2421-2425` | `IC-98` の枝を `askToStartNewDocument(frame)` に括り出し、`:2540` の並びに `case 'startNewDocument'` を足して同じ関数を呼ぶ。`hasStartupTemplate` を消す | C3（L4） |
| `frame-loop.ts:2363-2372`・`:2350`・`:1548` | `RD-7` に起動テンプレートでなく空の文書を渡し、書き手と時刻を載せる。着地で `leaveStartupTemplate()` と `store.forgetOpenedFile()`。11 番目の引数を空の文書に替える | C3（L4） |
| `src/use-case/advance-screen-session/file-flow-values.ts:81`・`:159`・`:447-450` | `hasStartupTemplate` を消し、問いが立っていなければ必ず問う | C2 |
| `src/use-case/apply-document-change/document-change-plan.ts:300`・`:426-431` | `RD-7` の呼びに `editedBy`・`updatedUtc` を足し、`RD-3` と同じく `advancedStamp` で刻印を進める | C2 |
| `src/adapter/file-gateway/file-store.ts:59-73`・`src/framework/file-system-access-file-store/file-system-access-file-store.ts` | `forgetOpenedFile(): void` を足す（`openedHandle` と読んだ候補を捨てる）。`FileStore` の代役を持つ試験にも足す | C2 |
| `src/framework/single-html-shell/single-html-shell.ts:369` 付近 | `empty-document.json` を読み、`frameLoop` へ渡す | C2 |
| `tools/generate_startup_template.py:898` | `PROJECT_TITLE` を `Sample Project - Press N to start a new one` にする（問い 2 の答え A、`JDG-972` の ②）。同じ回に `empty-document.json` を書く（0.2 節の 5 の `FR-068` の組み立てと部分を共有する） | C1 |
| `src/framework/single-html-shell/startup-template.json`・`empty-document.json`・`src/adapter/screen-renderer/display-words.json`・`help-roster.json` | `npm run gen` で起こし直す（手で書かない） | C1 ／ S |
| 試験 | `tests/contract/state-machine-*.contract.test.ts` の 6 本（`hasStartupTemplate` を持つ: `agent-api:122`・`field-entry:271`・`file-flow:169`・`:225-226`・`interaction-record:106`・`selection:299`・`unsaved-edits:104`）を直す。5 節の観測を仕様だけを読む体が書く | T |

## 10. ⛔ この変更でやらないこと

- `FR-027`（起動時のテンプレート）と 表 T-034 の `BT-4` は変えない —— 起動時だけに出す。
- 全消し（`HF-20`）の後の合わせと、「行の集合が変わるたびに合わせ直す」一般則（`JDG-922` の #4 の後半）は `DFC-1323` の変更要求に残す。
- 見出しのファイルの名と時刻（`FR-101`、`DFC-783`・`DFC-574`）のコードは直さない。
- `FR-068` の土台の文書（行の id が決まった値、書き手 `ai-conversion`）は変えない —— AI に写す土台であり、本書の空の文書とは用が違う。
- 題が `null` の文書を保存するときのファイル名の案（`.json` になる、`DFC-1422`）は決めない。

## 11. 前に立つ者へ返す問い

⭐ **2 つとも 2026-10-01 に答えを得た** —— 利用者の「それ以外は、全部推奨で」（`JDG-972`、逐語は 0.1 節）により、2 つとも推奨の A である。答えは E-04 ・ E-10 と 9 節に書き入れてある。

**問い 1 —— 捨てる前の問いの文（`QN-5`）** ⭐ **答え: A（`JDG-972` の ①）**。決定 1 で `N` と `IC-98` は毎回問うが、いまの文「保存していない編集があります。置き換えますか？ 失われます」は、未保存の編集が無いときに偽である（`OP-3` の置き換えと `Ctrl+R` も同じ問いを毎回立てるので、いまも偽になる）。
- **A（推奨）**: `QN-5` を、どちらの場合にも真な 1 文に書き換える。案 ja「いまの文書を閉じますか？ 保存していない編集と、元に戻す履歴は失われます」／ en「Close the current document? Unsaved edits and the undo history will be lost」。代償: 語は利用者が書き直してよい（辞書は利用者の語だけを持つ）。問いは 1 つのまま、置き換え・読み直し・新しく始めるの 3 つが同じ文を出す。
- B: `QN-5` を残し、未保存の編集が無いときの問い `QN-11` を足す（呼び手が状態で選ぶ）。代償: 行 1・語 2（ja/en）・表 T-290 の運ぶ値の選び方が増え、E-04 は変えずに行を足す形になる。
- C: 文を変えない。代償: 保存した後に押しても「保存していない編集があります」と出る（嘘をつく確認。`DFC-364` が退けた形）。

**問い 2 —— 見本の題**（`tools/generate_startup_template.py:898`） ⭐ **答え: A（`JDG-972` の ②）**。題は文書の値なので、画面の言語によらず英語のまま出る（`FR-035`）。
- **A（推奨）**: `Sample Project - Press N to start a new one` —— `JDG-852` の形を保ち、鍵を `N` にした。代償: 見本を保存するときのファイル名の案が `Sample Project - Press N to start a new one.json` になる（題 ＋ 拡張子、`document-file-flow.ts:175`）。
- B: 逐語に近く `Sample Project ... Push N to start with new one.` —— 代償: 末の `.` でファイル名の案が `….json` の `..` になり、`...` も名に残る。
- C: 別の綴り（利用者が書く）。

残る問いは無い。

## 12. 台帳（前に立つ者が起こす。本書は番号を取らない）

- `DFC-1322`: 状態を「CR-611 を起草」へ（問い 1・2 は答えを得た —— 本書が当たったら「実装待ち」）。
- `DFC-1420`（前に立つ者が起こした）: **`IC-98` の後の `Ctrl+S` が、前に開いたファイルへ新しい文書を黙って書く** —— `FileStore` に上書きする先を手放す行いが無い（`file-store.ts:59-73`、`document-file-flow.ts:693-701`、`DI-5`）。コードで確かめた、未再現。本書の E-01 と 9 節で閉じる。データを失う欠陥。
- `DFC-1421`（同）: **`QN-5` の文が、未保存の編集が無いときも「保存していない編集があります」と言う**（`IC-98`・`OP-3` の置き換え・`Ctrl+R`。表 T-290 は未保存の編集を見ずに立てる）。問い 1 の答え A（`JDG-972`）の E-04 ・ E-10 で閉じる。
- `DFC-1422`（同）: **題が `null` の文書を保存するとき、ファイル名の案が `.json` になる**（`document-file-flow.ts:175` の `project.title ?? ''`）。仕様に案の名の規則が無い。本書の後、新しく始めた文書はすべて題が `null` なので、最初の保存で必ず当たる。⚠️ 本書では閉じない —— どの変更要求もまだ閉じない仕様の穴である。
- `JDG-972`（前に立つ者が起こした）: 問い 1・問い 2 の答え。本書の E-04・E-10・9 節の題へ写してある。本書が当たったら「指示 —— `CR-611` が当てる」へ。
- `DFC-1323`: 「新しく始めた後」の半分は本書が作りの帰結として満たす（0.2 節の 10）と注を足す。

⭐ **前に立つ者が 2026-10-01 に起こした台帳の行と、それを持つ変更要求**（4 本に同じ表を置く）:

| 行 | 持つもの |
|---|---|
| `DFC-1420` ・ `DFC-1421` | 本書が閉じる |
| `DFC-1422` | 本書の起草で見つけた仕様の穴（候補のファイル名の規則）。どの変更要求も閉じない |
| `DFC-1423` | `CR-610` が閉じる（`DFC-553` の ② も `CR-610`） |
| `DFC-1424` | `取下げ` —— `DFC-553` の ② と同じ件 |
| `DFC-1425` ・ `DFC-1426` ・ `DFC-1427` | `CR-612` が閉じる |
| `DFC-1428` | `CR-613` の問い 2 の答えにより、別の変更要求が閉じる（番号は調整役が振る） |
| `JDG-970` ・ `PND-611` | `CR-612` の問い 1（保留） |
| `JDG-971` ・ `JDG-972` ・ `JDG-973` ・ `JDG-974` | `CR-610` ・ 本書 ・ `CR-612` の問い 2 ・ `CR-613` |

## 13. 測り方の再現

```
# the tree: refactor 0590ad03 (worktree of branch b3-export-shell-crs)
git log --oneline -1                                    # 0590ad03
# max ids
grep -rhoE "\bT-[0-9]{3}[a-z]?\b" docs/spec | sort -u -V | tail -1     # T-339
grep -on "SK-[0-9]\+[a-z]\?" -r docs/spec src tests tools change-request | sed 's/.*://' | sort -u -V | tail -1   # SK-24
grep -rn "\bBK-[0-9]" docs change-request src tests tools | wc -l     # 0
grep -c '"prefix": "BK"' docs/spec/_source/row-id-prefixes.json      # 0
python -c "import json;print(len(json.load(open('docs/spec/_source/row-id-prefixes.json',encoding='utf-8'))['prefixes']))"   # 189
# each old block of section 4 appears exactly once in its file (CRLF normalised):
#   a script reads this file, takes every block after an EDIT marker whose line
#   before it ends in 旧, and counts it in the named file (str.count after replacing
#   CRLF with LF on both sides; the script lives outside the repository)
#   -> E-01..E-11: blocks=11 once=11
# the siblings' old blocks: none of CR-610/612/613 is in this tree; the files they touch
# (FR-096, FR-101, S-210, FR-067, IO-7, OP-12, FR-022, AG-12, FR-150) are none of E-01..E-11
# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-095 IC-98 T-036 BT-4 RD-7 ED-3 QN-5 WY-1 OP-10
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-095 T-036 T-230 T-234 T-290 T-109 T-050 T-052 FR-060
# counts
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py | tail -1   # tables=212 figures=29 rows=2685 uids=176
cat docs/spec/*.md docs/spec/_assets/*.md | grep -o "（MUST）" | wc -l                   # 1510
# code facts of section 0.2
grep -n "hasStartupTemplate" -r src tests docs/spec/_source      # 3 src, 7 tests lines, 3 json
grep -n "CONFIRMATION_CANCEL_KEY\|NEW_DOCUMENT_ENTRY" src/framework/single-html-shell/frame-loop.ts
git grep -n "Three-Year Product Plan" -- tests tools src      # generator :898, template :7, dfc-378 own fixture
```

### 13.1 ⚠️ 測りが見られなかったもの

- `Ctrl+S` が新しく始めた後に前のファイルへ書くこと（0.2 節の 7）は、コードを読んで確かめただけで、出荷ビルドで押していない。
- 見本の題を長くしたとき見出しの名の欄に収まるかは、描いて確かめていない（C1 の後に見る）。
- 兄弟の `CR-610` 〜 `CR-613` の本文はこの木に無く、依頼文の要約でだけ重なりを見た。
