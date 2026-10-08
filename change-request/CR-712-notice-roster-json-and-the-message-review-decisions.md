# CR-712 —— 知らせの名簿を `_source` の JSON へ移し、2026-10-09 に決まった 138 行の出し方を当てる

> 状態: **下書き**（2026-10-09、本席。当てていない）。`docs/spec`・`src`・`tests`・辞書の原稿・生成器・検査には何も当てていない。当てる順と持ち場は調整役が決める（8 節）。
> 状態（追記）: **波 1（移すだけ）を当てた** —— `a4d3ec29`（2026-10-09、体）。⭐ **波 2（決定を当てる）を当てた** —— `80ec60ea`（仕様と `src`）・`b6e2f80a`（古い振る舞いを言うテストの直し、その 1）・`933e996b`（テストの残り・台帳・検査の直し）・`1a3541f4`（ブラウザのテストの直し）（2026-10-09、体。`be901ebe` の上）。本番の名は `RS-77`・`S-542`。台帳は `DFC-2305` を足し、`DFC-2166` を実測待ちへ、`JDG-1746`〜`JDG-1764` を適用済へ動かした。
> 測った木: `572da133`（前の席が台帳に書いた未コミットの直しを含む作業木。仕様・`src`・生成器は `572da133` のまま）。本書の数はすべてこの木で測った（13 節）。
> ID の帯: 番号 `CR-712`。裁定 `JDG-1746`〜`JDG-1764`（本席が `docs/development-records/rulings.md` に書いた。`JDG-1753`〜`JDG-1764` は 11 節の問いへの利用者の答え）。新しい `PND` は使わない（`PND-830`〜`PND-839` の予約は返す）。
> 仕様の新しい識別子は初稿では仮の名で書いた。⭐ 波 2 の体が 2026-10-09 に `be901ebe` で測った最大 ＋ 1 で本番の番号に替えた —— 仮の名 `RS-NEW-1` → `RS-77`（`RS-` の最大は `RS-76`）、仮の名 `S-NEW-1` → `S-542`（`S-` の最大は `S-541`）。初稿の束の表 `T-NEW-1` は作らない（`JDG-1757`）。ほかの新しい名は次のとおり —— 表 T-286 の出来事 `notices/noticeTimeElapsed`、表 T-290 の運ぶ値 `reportedCounts` とガード `hasAnythingToReport`。⛔ 当てる体が、当てる直前に木の最大 ＋ 1 で本番の番号を採り、測った日付と sha を添える（`docs/development-rules/02-changing-the-spec.md` の 2.5）。`572da133` で `RS-` の最大は `RS-76`、`S-` の最大は `S-541`。⭐ 新しい表と新しい行の頭字は作らない（`JDG-1757` で束の表が要らなくなった —— X-2）。
> 当てる裁定: `JDG-1746`〜`JDG-1764`。一部を覆す裁定は 0.2 節（`JDG-509`・`JDG-617`・`JDG-858`・`JDG-921`・`JDG-1118`・`JDG-1159`。印は `JDG-1754` で付いた）。
> 閉じるもの: `DFC-2166`、`PND-787`（裁定済の行の着地）、検査 69 の基準線の 2 行（`NOTICE_MANNER_OF_REASON`・`NoticeReason`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定（全文は `docs/development-records/rulings.md` の 2026-10-09 の節）

| 裁定 | 何を決めたか | 本書での扱い |
|---|---|---|
| `JDG-1553` | 利用者に見せる知らせの全数を一覧にし、利用者が要否を埋めた後に消す・まとめる変更要求を起こす | 本書がその変更要求である |
| `JDG-1746` | 知らせを 1 つずつ「出すかどうか」を利用者が決める。OK を押させること自体が負担である | 表示の仕方の欄（X-1）。E-02〜E-05 |
| `JDG-1747` | 記入の器は Excel、要否は 5 つの択 | 記録だけ（器は `docs/review/message-review-2026-10-08.xlsx`） |
| `JDG-1748` | 138 行の扱い（出す 63・出さない 22・時間で消す 12・1 枚にまとめる 15・文を直す 26）。まとめ先と直した文は各行の『推奨の理由』の欄のとおり。`IV` の 22 行は黙って拒まずに告げる。`QN-5` は保存していない編集があるときだけ問う | 3.2 節の対応表の全行。E-02〜E-09 |
| `JDG-1749` | 先入れの推奨から選び直した 11 行（まとまり C の 5 行と `RS-34`・`RS-44`・`RS-53`・`RS-55` を出さない、`RS-59`・`RS-61`・`RS-66` を時間で消す） | 3.2 節 |
| `JDG-1750` | `RS-69` の文を直し、時間で消す | 3.2 節・E-08 |
| `JDG-1751` | 名簿（ID・場面・作法・出典・表示の仕方）を `_source` の新しい JSON（`notice-reasons.json`）が持ち、表 T-233・表 T-234 と `src` の `NoticeReason` の型と作法の写しをそこから生成する。語は `display-words.json` に残し行 ID でつなぐ | E-01・5 節 |
| `JDG-1752` | 移設・表示の仕方の欄・138 行・時間で消える知らせを 1 本の `CR-712` にする | 本書の切り方 |
| `JDG-1753` | 問い方についての利用者の指示（本書の中身ではない） | 記録だけ |
| `JDG-1754` | 0.2 節の 6 つの裁定に「覆された（一部）」の印を付けてよい | 0.2 節（印は rulings.md に付いた） |
| `JDG-1755` | 時間で消す通知の期限は **3 秒**、定数で持つ（後で使ってみて変える） | X-6・E-04（`S-542` = 3000 ms） |
| `JDG-1756` | 時間で消える 1 枚にも `OK` の入口を残す | X-8 |
| `JDG-1757` | 読込の結果の行（`RS-14`・`RS-16`・`RS-51`・`RS-52`・`RS-60`・`RS-71`・`RS-72`）は通知の欄でなく `U-62`（`Import Report`）に並べる | X-1・X-2・X-5・E-05 |
| `JDG-1758` | `RS-8` の次の一手は「先に [Enter] で編集を確定するか、[Esc] で取りやめてください」 | X-2・E-08 |
| `JDG-1759` | 出さない行の語は辞書に残す | X-4 |
| `JDG-1760` | `RS-40` は退役させず `hide` で残す | 3.2.2 節 |
| `JDG-1761` | `IV-11`・`IV-12`・`IV-21` は取り込みの形の文にする（`IV-14` は案のまま） | E-09 |
| `JDG-1762` | `IV-10`・`IV-19`・`IV-20`・`IV-22` に次の一手を足す | E-09 |
| `JDG-1763` | 英語の語は本書の案を採る（`JDG-1758`・`JDG-1761`・`JDG-1762` で書き足した升を含む） | E-08・E-09 |
| `JDG-1764` | 起動時に渡された文書の読込で上がる `RS-51`・`RS-52`・`RS-60` なども `U-62` に並べ、`NT-4` の 1 枚には本来の用件だけを残す | 11.2 節の `X-13` |

### 0.2 裁定の鎖（rulings.md を「通知」「知らせ」「NT-2」「時間で消」「自動で消」「OK」「[OK]」「NOTICE_MANNER」「名簿」「QN-5」「新規」「RS-27」「薄く描」「マイルストーン」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-153` | 倍率のメッセージは 1.5 秒で自動で消してよい。今の通知とは別の種類にする | **保つ**。`S-244` は通知ではない（`FR-039` の 表 T-260 の `SE-5`）。時間で消す通知の期限 `S-542` は別の行として置く（X-6） |
| `JDG-509` | プロンプトを写した後に「…AI に渡してください。…」を **[OK] 付きで**出す（`RS-65`） | ⚠️ **一部覆された**（`JDG-1748`）—— 文は保ち、OK を待たずに時間で消す |
| `JDG-617` | ピン止めが多くて飛べないときに「…ピン止めを減らしてください **[OK]**」を出す（`RS-66`） | ⚠️ **一部覆された**（`JDG-1749`）—— 文は保ち、時間で消す |
| `JDG-858` | 絵を写したら「…コピーしました **[OK]**」を出す（`RS-68`） | ⚠️ **一部覆された**（`JDG-1748`）—— 文は保ち、時間で消す |
| `JDG-921` | 新規（`N`）でも今の作業を間違って消さないよう必ず確認する（`QN-5`、`FR-095` の「未保存の編集の有無によらず」） | ⚠️ **狭められた**（`JDG-1748`）—— 保存していない編集があるときだけ問う。保存済みなら失うのは取り消しの履歴だけ（3.2 節の `QN-5`、E-07） |
| `JDG-1118` | `RS-69` の文「マイルストーンは開始ー終了の期間を持たないため親タスクとして定義できません」と、遅延診断の「このマイルストーンは達成してるのでは？」 | ⚠️ **語が覆された**（`JDG-1750`・`JDG-1748`）—— どちらも推奨の文に替わる（E-08） |
| `JDG-1159` | `RS-69` は ほかの断りと同じく `NT-1` の通知とし、`OK`・`Enter`・`Esc` で消す | ⚠️ **一部覆された**（`JDG-1750`）—— `NT-1` は保ち、時間で消す。`OK`・`Enter`・`Esc` で先に消せることは保つ（`NT-8`） |
| `JDG-1623` | 合流で届かなかったタスクは `U-62` に名前で並べる（`RS-73`） | **保つ**。`RS-50`・`RS-73` の表示の仕方は「報告に並べる」（X-1） |
| `JDG-1746`〜`JDG-1764` | 0.1 節 | 本書が当てる |

⭐ 本書が「覆された」と印す行は上の 6 つ。利用者がその印を認め（`JDG-1754`）、調整役が rulings.md の 6 行の状態の欄に既に付けた。当てる体は着地先だけを書き足す（12 節）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-003`（`CH-3` ぬるサク）—— 今は 1 枚の通知で止めている 15 行（押しても何も起きないことを告げる行ほか。出さない 21 行のうち、今も出ているもの）が画面に出なくなり、成功と案内の 13 行は OK を待たずに消える。OK を押す手が操作の流れを切らなくなる（`JDG-1746` の「いちいち [OK] するのが面倒」）。
- `GL-006`（`CH-4` すぐわか）—— 黙って開かなかった取り込みの拒否 22 種が、何が悪いかを告げる。1 回の読込で通知の欄に積まれていた最大 7 枚の知らせが、`U-62` の 1 面に件数の行として並ぶ（`JDG-1757`）。
- 名簿の唯一の正が手書きの表と手写しの型の 2 か所から、原稿 1 つへ移る（`R1.3`）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（唯一の正）** —— 表 T-233 の作法の欄を `src/framework/single-html-shell/frame-loop.ts` の `NOTICE_MANNER_OF_REASON` が手で写し、自ら「TRAP: not generated」と書いている。`NoticeReason` の和も表の 63 行を手で写している。検査 69 の基準線が 2 行で抱えている。⇒ 原稿から生成する（E-01・5 節）。
- **`R1a`（矛盾する要求が無いか）** —— 決定どおりに出さない行を作ると、「告げること（MUST）」と書いた次の文が偽になる。本席が測った衝突は 4.0 節の表の 14 か所である。⭐ どれも裁定が勝つ（`02-changing-the-spec.md` の 1 節「裁かれた行が勝つ」）。本書はその文を書き換える。
- **`R1a`（言うことと行うことの食い違い）** —— 表 T-233 の結びは「取り込みの検証が拒んだとき、`NT-1` の通知が運ぶ理由は、拒んだ 表 T-220 の行の行 ID とすること（MUST）」と既に定めている。`src` はそれを守っていない（`src/framework/single-html-shell/document-file-flow.ts` の `afterDropping` が `return false` で黙り、`frame-loop.ts` の `NOTICE_REASON_OF_WRITE_REFUSAL` が `importRefused: null`）。辞書の 22 項は空のまま。⇒ `JDG-1748` は新しい規則ではなく、既にある MUST を語で満たす決定である（E-09）。
- **`R1a`（NT-2 の選言）** —— `05-07-design.md` の 表 T-078 の下は「通知の期限を持たないのは、`NT-2` の選言の前の枝（読み終える前に消えない）を選んだからである」と述べる。時間で消す行ができると後の枝を当てる行が生まれるので、その文が偽になる（E-04）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | **表示の仕方は 4 つの値の列挙とする** —— `show`（出す。`NT-8` で消すまで立つ）・`autoDismiss`（時間で消す。`NT-8` で先にも消せる）・`hide`（画面に出さない）・`report`（1 回の読込 —— 開く・開き直す・合流させる・重ねる —— の中で上がったら、通知の欄に立てず、読込が着地したときに `U-62` に 1 行として並べる。読込の外で上がったら `show` と同じ 1 枚）。⭐ `report` は Excel の 5 択に無いが、`RS-50`・`RS-73` が既に「通知の欄に立ててはならない（MUST NOT）」と自分の欄で定めている出し方であり、`JDG-1757` が読込の結果の 7 行を同じ面へ寄せた | `JDG-1751` が「表示の仕方」の欄を名指した。4 つ目を置かないと、`U-62` に並ぶ 9 行の欄が `show` を名乗り、生成した表と場面の欄が食い違う | 値が 1 つ増える |
| X-2 | **「1 枚にまとめる」15 行を 2 つの仕組みに分ける**。⭐ **語の相乗り**（`wordsOf`）—— 1 回の操作でどれか 1 つしか起きない理由どうしが 1 つの文を共有する（`RS-7`・`RS-9` は `RS-6` の語、`RS-12`・`RS-13` は `RS-11` の語、`RS-42` は `RS-15` の語）。⚠️ `RS-8` は相乗りせず自分の項を持つ —— `text` は `RS-6` と同じ文、`nextStep` は自分の文（`JDG-1758`）。⭐ **`U-62` に並べる**（`display: report`）—— 1 回の読込で同時に起き得る `RS-14`・`RS-16`・`RS-51`・`RS-52`・`RS-60`・`RS-71`・`RS-72` を、`RS-50`・`RS-73` と同じ 1 面に理由ごとの行として並べる（`JDG-1757`） | 各行の『推奨の理由』が 2 種類のことを言っている —— A・D・H のまとまりは「1 文にまとめる」、I のまとまりは「1 枚にまとめ、件数の行として並べる」。⭐ 後者は `JDG-1757` で `U-62` に決まったので、束の表（初稿の `T-NEW-1`・頭字 `NC`）は要らなくなった —— 表示の仕方の値 `report` 1 つで言える。いちばん単純な形を採った | 欄が 1 つ増える（`wordsOf`）。`RS-8` の `text` は `RS-6` の `text` と同じ文を 2 項に持つ（次の一手だけが違うので、項を分けるほうが単純） |
| X-3 | **語の相乗りは行を潰さない** —— `RS-7`〜`RS-9`・`RS-12`・`RS-13`・`RS-42` の行は残り、`Agent API` の拒否の値（表 T-035 の `AG-9a`）はこれまでどおり本当の理由の行を運ぶ。画面に刷る語だけが相乗り先の語になる | 表 T-233 の結びの「⛔ 拒否の理由を 1 つの行へ潰してはならない（MUST NOT）」は、画面に出る語が理由の別を捨てることを禁じている。行を残し、`AI` に返る理由も残すので、その禁止には触れない（`CR-692` が `RS-74` を分けたのも `AI` に本当の理由を返すためである） | 相乗りした 6 行の語は辞書から消える（3.1 節） |
| X-4 | **出さない行の語は辞書に残す**（`JDG-1759`） | 表示の仕方は 1 つの欄の値であり、戻すときにその欄だけを直せば済むようにする。⚠️ 辞書の項は利用者が書くもので体は作れない（`display-words.json` の `$comment`）ので、消すと戻すときに利用者へ書き直しを求めることになる。`RS-19`・`RS-49` は自分の欄で「語を残す」と既に定めている | `CR-711` の「刷らない語は持たない」とは向きが違う。あちらは `FR-072` が刷ることを禁じた語で、こちらは欄 1 つで刷れる語である |
| X-5 | **読込の結果は、読込が着地したときに 1 度だけ `U-62` を立てて並べる** —— 読込の途中で上がった `report` の理由は件数を足して運び（表 T-290 の新しい運ぶ値 `reportedCounts`）、`fileFlow/documentOpenLanded` で 1 つでもあれば `U-62` を立てる（ガード `hasTasksToReport` を `hasAnythingToReport` へ広げて改名する —— 名が指すものを言う）。⭐ 読込が着地しなかったとき（取りやめ・拒否）は運んだ行を捨てる —— 何も取り込んでいないので、収めた・数え直した・採ったという報告が偽になる。⭐ 相乗りする理由どうしは、`NT-3` の「同じ理由」の判じ方で同じ理由として数える | `RS-14`・`RS-51`・`RS-52`・`RS-60` は形を判じて読んだ直後、`RS-16`・`RS-71`・`RS-72` は取り込みが着地した後に上がる（`src/framework/single-html-shell/document-file-flow.ts` の `tellDecodedIntake` と `tellImportReport`）。面を 2 度立てないには、着地まで運ぶしかない。`droppedTaskNames`・`missingTaskNames` が同じ形で既に運ばれている | 拒まれた読込の `RS-14`（先頭だけ開いた）は告げない —— 拒否の通知が先頭のファイルを読めなかったことを告げる |
| X-6 | **時間で消す期限は `S-542` の 1 つの値とし、3000 ms とする**（`JDG-1755`、利用者の値）。⭐ 利用者の言うとおり定数で持つ —— 原稿 `settings.json` の 表 T-206 の行とし、`npm run gen` で `src` の生成した定数へ刷る。後で使ってみて変える見込みが高い値なので、直す所を 1 か所にする | 利用者が「後で使ってみて変える可能性が高い」と言った値であり、導き方を持たない。⚠️ 長い文（`RS-63` の 60 字ほか）は 3 秒で読み終えられないことがある —— ポインタを乗せれば止まる（X-7）ので、読み終える前に消えない道は残る | 無い |
| X-7 | **`NT-2` の「止める・延ばす」の中身** —— ポインタが箱の上にある間は期限を数えない（止める）。箱から離れたら `S-542` を始めから数え直す（延ばす）。同じ理由（相乗りを含む）が上がって `NT-3` で束ねたときも数え直す。⭐ 「読み終える前に消えない」の枝は、表示の仕方が `show` の行が今のまま満たす | `NT-2` は選言であり、どちらかの枝を行ごとに当てればよい（`05-07-design.md` の 表 T-078 の下の文）。止める手段を押す場所に置かず、読むときに自然に起きる動き（ポインタを乗せる）に置く。`SE-4` の「最後の押しから数え直す」と同じ数え直しの形 | 「無効にする」入口は作らない（選言のうち 2 つで足りる） |
| X-8 | **時間で消す 1 枚にも `OK` の入口と `Enter`・`Esc` を残す**（`JDG-1756`） | `NT-8` の「人がその場で消せること（MUST）」と「`NT-2` と併存する」は、時間で消える通知にも当たる | OK の入口は見え続ける |
| X-9 | **出さない理由は、上げる側では今のまま上げ、表示の仕方を当てる所を 1 か所にする** —— 通知の状態機械（表 T-286 の `notices/noticeRaised`）が、`hide` の理由を受けても 1 枚を立てない | 上げる所は `src` に 20 か所以上あり（シートの `RS-27` の行）、状態機械の升も `RS-27` を 15 か所で名指す（`_source/state-machines.json`）。上げる側を 1 つずつ直すと、表示の仕方の欄が唯一の正でなくなる | 出さない理由も出来事としては流れる |
| X-10 | **表 T-220 の行は `notice-reasons.json` に行ごとには持たせず、1 つの家族として持たせる**（作法 `NT-1`・表示の仕方 `show`・相乗り `IV-17` → `RS-21` の 1 件だけ） | 表 T-220 は不変条件の全数の表で、`scheduleViolations`（表 T-064 の `PI-1`）を駆動する。表 T-233 の結びは「同じものに 2 つ目の鍵を作らない」と定めている。22 行を JSON に写すと、行の名簿を 2 か所に持つ | 22 行に別々の表示の仕方を与えたくなったら、本書の外で原稿の形を変える |
| X-11 | **知らせの名簿に入れないもの** —— `MG-10`（通知をやめ、`U-61` の面に常に出る注記にする —— 決定の案のとおり）、`FR-100`（ブラウザが文を決め、`GRS` は語を持たない）、遅延診断の 26 行・倍率の印・ファイルの状態・検索パネルの語・`shownOnAnotherRow`（通知でも問いでもない。表示する語の表がそれぞれ別に名簿を持つ）。`EX-3` は通知として残るので、表 T-233 の新しい行 `RS-77` になる | 表 T-037 の結びは「通知が運ぶ理由は 表 T-233 の行とすること（MUST）」と定める。行を持たない `EX-3` は通知できない（今は `DFC-557` の DEVIATION で捨てている） | 無い |
| X-12 | **表 T-233・表 T-234 を、新しい生成物 `docs/spec/_assets/tbl-notice-reasons.md` に刷る**。表の番号は変えない。`FR-076` の本文と結びの規則は `01-04-requirements.md` に残り、表は生成物を指す | 生成物は 1 ファイルが自ら生成物であることを名乗る形（`_assets/tbl-settings.md`・`_assets/tbl-state-machines.md`）しか前例が無い。手書きの文書の中に生成した区画を置く前例は無い | 表 T-233 / 表 T-234 を `01-04-requirements.md` から読んでいる試験と検査を付け替える（5 節・9 節） |

---

## 1. 範囲 —— 行き先

| 何 | 変える所 | 編集 |
|---|---|---|
| 知らせの名簿の原稿 | 新しい `docs/spec/_source/notice-reasons.json` と `docs/spec/_source/notice-reasons.schema.json`、新しい `docs/spec/_source/notice_reasons_json_to_md.py`、生成物 `docs/spec/_assets/tbl-notice-reasons.md`、`05-07-design.md` の Chapter 6.2 | E-01 |
| 表示の仕方の値（138 行） | `notice-reasons.json` の `display`・`wordsOf` の欄 | E-02 |
| 出さない行が破る「告げる」の文 | `01-04-requirements.md` の `FR-029`・`FR-019`・`FR-016`・表 T-051 の `HF-10`・`HF-13`・`HF-14`・表 T-351 の `WL-9`・表 T-246 の `HB-3`・表 T-037 の `NT-3`・`NT-7`・表 T-233 の 4 行の欄 | E-03 |
| 時間で消す通知 | 表 T-037 の `NT-2`・`NT-5`・`NT-8` の結び、`FR-076` の本文、`_assets/tbl-settings.md` の 表 T-206（`S-542`、原稿は `settings.json`）、`05-07-design.md` の 表 T-078 の下の文、`_source/state-machines.json` の 表 T-286 | E-04 |
| 読込の結果を `U-62` にまとめる | `_assets/tbl-glossary.md` の `U-62`、表 T-032 の `MG-14`、表 T-233 の `RS-51` の欄、`FR-080` の 表 T-076 の `EP-22`、`_source/state-machines.json` の 表 T-290 の `fileFlow/documentOpenLanded` | E-05 |
| 相乗り | `notice-reasons.json` の `wordsOf`、表 T-037 の結び（「行を足すときは辞書の原稿にも項を足すこと」の例外） | E-06 |
| `QN-5` | 表 T-234 の `QN-5`、`FR-095` の本文と RATIONALE、`_source/state-machines.json` の `fileFlow/newDocumentEntryPressed`・`fileFlow/openChoiceAnswered`・`fileFlow/documentFileRead` | E-07 |
| 直す語 | `docs/spec/_source/display-words.json` の `reasons`（`RS-6`・`RS-11`・`RS-69`・`RS-77`）・`delayReportReasons` の `milestoneAchieved`・新しい節 `differenceReview`、表 T-032 の `MG-10`、表 T-033 の `EX-3` | E-08 |
| 取り込みの拒否を告げる | `display-words.json` の `invariants` の 21 項、`src` の取り込みの道（5 節） | E-09 |
| 変更履歴 | `docs/development-records/changelog.md` に 1 行 | E-10 |

数（予測。7 節に内訳）: 要求 ±0。表 ±0。表の場所の移動 2（表 T-233・表 T-234 → 生成物）。表 T-233 の行 ＋1（71 → 72）。表 T-234 の行 ±0（10）。設定値 ＋1（`S-542`）。表 T-286 の出来事 ＋1。表 T-290 の運ぶ値 ＋1。行の頭字 ±0。辞書の項 −5（`reasons` 71 → 67）・−1（`invariants` 22 → 21）・＋1（`differenceReview`）。語の升（ja）の新設・書き換え 53、en 53。図 0。

---

## 2. 新しい識別子（すべて仮の名。当てる直前に最大 ＋ 1 で採る）

| 仮の名 | 何か | `572da133` で測った根拠 |
|---|---|---|
| `RS-77` | 表 T-233 の行。`EX-3` の書き出しの知らせ（`NT-5`、`autoDismiss`）。⭐ 原稿の並びでは `RS-76` の次、`RS-15` の前に置く（`RS-15` が最後 —— E-01） | `RS-` の最大は `RS-76`。`git grep -c "RS-77"` は 0 件 |
| `S-542` | 表 T-206 の行。時間で消す通知の期限（3000 ms、`JDG-1755`） | `S-` の最大は `S-541` |
| `notices/noticeTimeElapsed` | 表 T-286 の出来事（期限が来た 1 枚の理由を運ぶ） | 表 T-286 に同じ名の出来事は 0 件 |
| ガード `isHiddenReason`・`isTimedCard` | 表 T-286 の升 | `state-machines.json` に 0 件 |
| 運ぶ値 `reportedCounts`・ガード `hasAnythingToReport` | 表 T-290 の `fileFlow/documentOpenLanded`（`hasAnythingToReport` は今の `hasTasksToReport` を広げて改名する） | `git grep` で 0 件 |
| 辞書の節 `differenceReview`（`part`: `separateNote`） | `MG-10` の注記の語 | `display-words.json` に 0 件 |

⛔ `IV-13` は欠番である（表 T-220 は 22 行）。番号を詰めない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

### 3.1 消すもの・書き換えるもの

| 旧 | 新 |
|---|---|
| `01-04-requirements.md` の `FR-076` の中の手書きの 表 T-233（71 行）と 表 T-234（10 行） | 原稿 `notice-reasons.json` の `reasons`・`questions` から刷る `_assets/tbl-notice-reasons.md` の同じ番号の表。⛔ 行は 1 つも消えない（E-01。移し替えはバイト一致で確かめる） |
| `frame-loop.ts` の手写し `type NoticeReason`（63 の和）と `NOTICE_MANNER_OF_REASON`（63 鍵） | 生成した型と表（5 節）。手写しは消える |
| `.claude/skills/spec-graph-check/literal-restatement-baseline.txt` の `NOTICE_MANNER_OF_REASON` と `NoticeReason` の 2 記録 | 無い（基準線は縮むだけ —— 利用者の OK は要らない） |
| 辞書の `reasons` の `RS-7`・`RS-9`・`RS-12`・`RS-13`・`RS-42` の 5 項（各 ja/en の `text`・`nextStep`） | 無い。画面は相乗り先（`RS-6`・`RS-11`・`RS-15`）の語を刷る（X-2・X-3）。⚠️ `RS-8` の項は残り、語を書き換える（`JDG-1758`） |
| 辞書の `invariants` の `IV-17` の項（空） | 無い。`RS-21` の語を刷る（決定の案「`RS-21` の語をそのまま使う」） |
| 辞書の `RS-6`・`RS-8`・`RS-11`・`RS-69` の語、`delayReportReasons` の `milestoneAchieved` の語 | 4.8 節の新しい語 |
| 表 T-233 の結び「⛔ 行を足すときは、辞書の原稿にも項を足すこと（MUST）」の無条件の形 | 「相乗り（`wordsOf`）を持たない行を足すときは」に狭める（E-06） |
| 表 T-233 の `RS-19` の欄の「⛔ いまは告げてはならない（MUST NOT）」 | 表示の仕方 `hide` が言う。理由の文（設定する道が無い）は欄に残す |
| 表 T-233 の `RS-49` の欄の「⭐ 本行を置く根拠は `NT-3` 自身である —— 同行は件数を添える例として「担当者名の波及」を名指し」 | 「表示の仕方は `hide`（`JDG-1748`）—— 名前の変化はタスクの表示で見え、取り消しで戻せる」。`NT-3` の例からも「担当者名の波及」を除く（E-03） |
| 表 T-233 の `RS-53` の欄の「⭐ 引くことを求める文を持つこと —— `RS-27` では、何をすればよいかが読めない」 | 「表示の仕方は `hide`（`JDG-1749`）」。⚠️ マイルストーンの断り書きは残す |
| 表 T-234 の `QN-5` の「未保存の編集の有無によらず立つ」 | 「保存していない編集があるときだけ立つ」（E-07） |
| `FR-095` の「捨てる前に、未保存の編集の有無によらず、…確認を求めること（MUST）」と RATIONALE の「⭐ 問うかどうかを未保存の編集で分けないのは、…1 文字の鍵（`SK-25`）だからである」 | 「保存していない編集があるときだけ、…確認を求めること（MUST）」と、裁定の理由（E-07） |
| `FR-029` の「押されたときに限り、行えない理由を通知すること（MUST）」の無条件の形 | 運ぶ理由の行の表示の仕方が `hide` のときは告げない（E-03） |
| `NT-7` の「画面からの書き込み（…）は 表 T-233 の `RS-27` で告げて捨て」 | 「`RS-27` として捨て（同行は出さない —— 問いが画面に立っている）」（E-03） |
| `FR-019` の「⛔ 指す `TaskGroup` が無い縦位置で置こうとしたときは、作らずに理由を告げること（MUST）」 | 「作らないこと（MUST）。運ぶ理由は `RS-44` とする（出さない）」（E-03） |
| `FR-019` の「⛔ **黙って作らずに済ませてはならない（MUST NOT）** —— `FR-029` は…」の 1 文 | 無い（「⚠️ 理由は出さない —— 置かれなかったことは画面で見える」に置き換える。C-5b） |
| `FR-029` のツールチップの MUST NOT の理由が逐語で引く「押されたときに限り、行えない理由を通知すること（MUST）」 | C-1 の新しい文の逐語（C-14） |
| `HF-14` の「⛔ 薄いまま押されたときは、行を立てずに理由を告げること（MUST）。理由は 表 T-233 の `RS-46`」 | 「行を立てないこと（MUST）。運ぶ理由は `RS-46` とする（出さない）」（E-03） |
| `NT-5` の対象の例の「表 T-032 の `MG-10`」 | 除く（`MG-10` は通知でなく面の注記になる。E-08） |
| 表 T-032 の `MG-14` の「⭐ 前の 2 つは、件数を添えて通知の欄（…`U-57`）に告げる」 | 「前の 2 つも、件数を添えて `U-62` に 1 行ずつ並べる」（E-05） |
| 表 T-233 の `RS-51` の欄の「⭐ 告げる先は通知の欄でよい —— 運ぶのは件数だけであり、`NT-9` の 1 行に収まる」 | 「⭐ 告げる先は `U-62` の 1 行である（表示の仕方 `report`）」（E-05） |
| `_assets/tbl-glossary.md` の `U-62` の「取り込みが落とした `Task` の名前と、…届かなかった `Task` の名前を、理由ごとに並べて告げる面」 | 1 回の読込の結果（件数の行と名前の一覧）を理由ごとに並べる面（E-05） |
| 表 T-290 のガード `hasTasksToReport`（落とした名前か届かなかった名前があるとき） | `hasAnythingToReport`（件数の行か名前があるとき。E-05） |
| `05-07-design.md` の 表 T-078 の下の「コードの `frame-clock-wakes.ts` の `setTimeout` は 4 つ…通知の期限を持たないのは下の選言の前の枝を選んだからである」 | 5 つ。表示の仕方が `autoDismiss` の行にだけ後の枝を当てる（E-04） |
| `src/framework/single-html-shell/document-file-flow.ts` の `afterDropping` が `!ok` で黙って `return false` | 破れた 表 T-220 の行を告げて `false`（E-09・5 節） |
| `frame-loop.ts` の `NOTICE_REASON_OF_WRITE_REFUSAL` の `importRefused: null` | 拒んだ 表 T-220 の行（5 節） |
| `document-file-flow.ts` の `exportedText` の `// DEVIATION: … (EX-3, EX-6) … dropped (DFC-557)` のうち `EX-3` | `RS-77` を上げる。`EX-6` は本書の外（10 節） |

### 3.2 138 行の対応表（シート『記入』の N 列。`docs/review/message-review-2026-10-08.xlsx`）

#### 3.2.1 表示する（今のまま）—— 63 行

**変えない**: `RS-1`・`RS-2`・`RS-3`・`RS-4`・`RS-5`・`RS-10`・`RS-20`・`RS-21`・`RS-24`・`RS-25`・`RS-26`・`RS-41`・`RS-43`・`RS-48`・`RS-57`・`RS-64`・`RS-67`・`RS-75`・`RS-76`・`QN-1`・`QN-2`・`QN-3`・`QN-4`・`QN-8`・`QN-9`・`QN-10`・`QN-11`・`QN-12`。原稿では `display: show`（問いは `ask`）。

**変えないが、本書で役が 1 つ増える行**:

| 行 | 増える役 |
|---|---|
| `RS-15` | `RS-42` の相乗り先（語は今のまま） |
| `RS-21` | `IV-17` の相乗り先（語は今のまま） |
| `RS-50`・`RS-73` | 表示の仕方 `report`（X-1）。出し方は今のまま `U-62`。`JDG-1757` で同じ面に件数の行が並ぶ |

**名簿に入れない行（語と出し方は今のまま）**: `shownOnAnotherRow`・`FR-100`・`scaleEcho.max`・`scaleEcho.min`・`fileStatus.neverSaved`・`searchPanel.nothingChecked`・`searchPanel.showOnlyCheckedBar`・`DW-1`〜`DW-3`・`delayReportReasons.missingActual`・`delayReportReasons.parentProgressOutside`・`VC-1`〜`VC-15`・`VS-1`〜`VS-5`（X-11）。

#### 3.2.2 表示しない —— 22 行（`display: hide`。`QN-5` だけ `askOnlyWithUnsavedEdits`）

| 行 | 今 | 新 | 仕様で書き換える文 |
|---|---|---|---|
| `RS-19` | 上げる者なし（`MUST NOT` で告げない） | `hide` | 欄の `MUST NOT` を表示の仕方へ（3.1 節） |
| `RS-22` | 上げる者なし | `hide` | 無い（「行は消さずに残す」は保つ） |
| `RS-27` | `NT-1`、20 か所以上から上がる | `hide` | `FR-029` の落ち先の文・`NT-7`（E-03） |
| `RS-28` | `NT-1`（`HF-2`） | `hide` | `FR-029`（E-03） |
| `RS-29` | `NT-1`（`HF-11`） | `hide` | 同上 |
| `RS-30` | `NT-1`（`HF-13`） | `hide` | `HF-13` の「濃く描いた入口を押して `RS-30` が返ると」の文は、返る理由として残す（出ないだけ） |
| `RS-31` | `NT-1`（`HF-10`） | `hide` | `HF-10` の「⚠️ 薄いときの理由は 表 T-233 の `RS-31` である」は残す（運ぶ理由） |
| `RS-32` | `NT-1`（`HF-12`） | `hide` | `FR-029`（E-03） |
| `RS-34` | `NT-1`（`FR-034`） | `hide` | `FR-029`（E-03） |
| `RS-36` | `NT-1`（`HF-15`） | `hide` | 同上 |
| `RS-37` | `NT-1`（`HF-15`） | `hide` | 同上 |
| `RS-38` | `NT-1`（`FR-085`） | `hide` | 同上 |
| `RS-39` | `NT-1`（`HF-15`） | `hide` | 同上 |
| `RS-40` | `NT-3a`、上げる所が無い | `hide` | 無い（退役させない —— `JDG-1760`） |
| `RS-44` | `NT-1`（`FR-019`） | `hide` | `FR-019` の MUST、`FR-016` の 3 文、`HB-3`（E-03） |
| `RS-46` | `NT-3a`（`FR-085`・`HF-14`） | `hide` | `HF-14` の MUST（E-03） |
| `RS-49` | 上げる者なし（`AS-1` が未作成） | `hide` | 欄と `NT-3` の例（3.1 節） |
| `RS-53` | `NT-1`（`FR-001`） | `hide` | 欄（3.1 節）・`FR-029` |
| `RS-55` | `NT-1`（`HM-4`） | `hide` | `WL-9` の「`RS-55` を告げる」（E-03） |
| `RS-62` | 画面には出ない（`AI` への拒否） | `hide` | 無い（`AG-9a` は今のまま運ぶ） |
| `RS-74` | 画面には出ない（`AI` への拒否） | `hide` | 無い |
| `QN-5` | 未保存の編集の有無によらず問う | `askOnlyWithUnsavedEdits` | `FR-095`・表 T-234・`state-machines.json`（E-07） |

#### 3.2.3 OK を押さずに自然に消える —— 12 行（＋ 文を直す 2 行）

`display: autoDismiss`。作法・語は今のまま。

| 行 | 作法 | 備考 |
|---|---|---|
| `RS-23` | `NT-3a` | 監視の配り先が答えない |
| `RS-33` | `NT-1` | 予定と実績の両方は隠せない |
| `RS-54` | `NT-1` | 構えは立ったまま |
| `RS-56` | `NT-1` | 自己依存 |
| `RS-58` | `NT-1` | 終了が開始より前（編集） |
| `RS-59` | `NT-3a` | 全画面表示を認めない（`JDG-1749`） |
| `RS-61` | `NT-1` | 編集グループ（`FR-111` は未作成。`JDG-1749`） |
| `RS-63` | `NT-5` | 新しい形式で読めた |
| `RS-65` | `NT-5` | プロンプトを写した（`JDG-509` を一部覆す） |
| `RS-66` | `NT-3a` | ピン止めが多い（`JDG-1749`。`JDG-617` を一部覆す） |
| `RS-68` | `NT-5` | 絵を写した（`JDG-858` を一部覆す） |
| `RS-70` | `NT-1` | 推定の親子は選べない |
| `RS-69`（文を直す） | `NT-1` | `JDG-1750`（3.2.5 節） |
| `RS-77`（`EX-3`、文を直す） | `NT-5` | 新しい行（3.2.5 節） |

#### 3.2.4 1 枚にまとめる —— 15 行

| 行 | 仕組み | まとめ先 | 表示の仕方 |
|---|---|---|---|
| `RS-6` | 相乗りの先頭 | 語を書き換える（4.8 節） | `show` |
| `RS-7`・`RS-9` | 相乗り | `wordsOf: RS-6` | `show` |
| `RS-8` | 自分の項（`text` は `RS-6` と同じ文、`nextStep` は自分の文） | 語を書き換える（4.8 節、`JDG-1758`） | `show` |
| `RS-11` | 相乗りの先頭 | 語を書き換える（4.8 節） | `show` |
| `RS-12`・`RS-13` | 相乗り | `wordsOf: RS-11` | `show` |
| `RS-42` | 相乗り | `wordsOf: RS-15`（`RS-15` の語は今のまま） | `show` |
| `RS-14`・`RS-16`・`RS-51`・`RS-52`・`RS-60`・`RS-71`・`RS-72` | `U-62` に並べる | 読込が着地したら `U-62` に 1 行ずつ（`RS-50`・`RS-73` の名前の一覧と同じ面） | `report`（`JDG-1757`） |

⚠️ `RS-52` は暦の編集の後にも単独で上がる。読込の外なので、`report` の定めのとおり `show` と同じ 1 枚の通知になる（`JDG-1757`）。⚠️ `RS-16`（重ねる側に対応するタスクが無い）は、開く面の『重ねる』（`IC-73`）でも `FR-015` の入口でも、開く読込と同じ流れで着地する（`document-file-flow.ts` の `landImportedDocument` → `tellImportReport`、`choice` が `baseline`）ので、1 回の読込に当たる。

#### 3.2.5 文面を直す —— 26 行

| 行 | 新しい語（ja、決定の案） | 置き場 |
|---|---|---|
| `RS-69` | 4.8 節 | `reasons`、`autoDismiss`（`JDG-1750`） |
| `MG-10` | 4.8 節 | 新しい節 `differenceReview` の `separateNote`。通知ではなく `U-61` の面に常に出る注記（OK 無し） |
| `EX-3` | 4.8 節 | 表 T-233 の新しい行 `RS-77`、`autoDismiss` |
| `delayReportReasons.milestoneAchieved` | 4.8 節 | `delayReportReasons`（名簿の外。語だけ） |
| `IV-1`〜`IV-12`・`IV-14`〜`IV-23`（22 行） | 4.9 節 | `invariants`（`IV-17` は `RS-21` に相乗り） |

---

## 4. 書き直す所（案の文）

### 4.0 出さない行が破る文（本席が測った衝突 14 か所）

| # | 所 | 今の文（要旨） | 破る行 |
|---|---|---|---|
| C-1 | `FR-029`（`01-04-requirements.md:7918`） | 押されたときに限り、行えない理由を通知すること（MUST） | `RS-27`〜`RS-32`・`RS-34`・`RS-36`〜`RS-39`・`RS-53` |
| C-2 | 同（:7921） | どの入口にも当たる行が無いときの落ち先が `RS-27` | `RS-27` |
| C-3 | `NT-7`（:8025） | 画面からの書き込みは `RS-27` で告げて捨てる（MUST） | `RS-27` |
| C-4 | `HF-14`（:1775） | 薄いまま押されたら理由を告げること（MUST）、理由は `RS-46` | `RS-46` |
| C-5 | `FR-019`（:6000） | 作らずに理由を告げること（MUST）、理由は `RS-44` | `RS-44` |
| C-5b | `FR-019`（:6001） | ⛔ 黙って作らずに済ませてはならない（MUST NOT）—— `FR-029` の「押されたときに限り、行えない理由を通知すること」を引く | `RS-44` |
| C-6 | `FR-016`（:4270・:4287・:4293） | `RS-44` を告げる | `RS-44` |
| C-7 | `HB-3`（:4316） | `RS-44` を告げる | `RS-44` |
| C-8 | `WL-9`（:3882） | `RS-55` を告げる | `RS-55` |
| C-9 | `FR-095`（:7468）と RATIONALE | 未保存の編集の有無によらず確認する（MUST） | `QN-5` |
| C-10 | 表 T-234 の `QN-5`（:8134） | 未保存の編集の有無によらず立つ | `QN-5` |
| C-11 | `NT-3`（:8020）の例と `RS-49` の欄 | 「担当者名の波及」に件数を添える。本行の根拠は `NT-3` | `RS-49` |
| C-12 | `RS-53` の欄 | 引くことを求める文を持つこと | `RS-53` |
| C-14 | `FR-029`（:7885） | 掴めない端点を薄く描いてツールチップで理由を示すことを定めてはならない（MUST NOT）—— 理由に「後段の『押されたときに限り、行えない理由を通知すること（MUST）』と両立しない」を逐語で引く | C-1 が引かれた文を書き換えるので、引用が偽になる |

⚠️ `HF-10`（`RS-31`）・`HF-13`（`RS-30`）・`_assets/tbl-state-machines.md` の `raiseNotice`（`RS-27`）の升は、運ぶ理由を名指すだけで「告げる」を言わないので、書き換えない（X-9）。

### E-01 —— 知らせの名簿を原稿へ移す

**原稿の形**（`docs/spec/_source/notice-reasons.json`。`$comment` の 1 行目で唯一の正・起こす生成物・作り直し方を名乗る —— 検査 21・22）:

```
{
  "$schema": "./notice-reasons.schema.json",
  "$comment": ["SINGLE SOURCE OF TRUTH -- EDIT THIS FILE.", "...generates docs/spec/_assets/tbl-notice-reasons.md and the generated region of the unit that owns NoticeReason..."],
  "reasons": [
    { "id": "RS-1", "scene": { "ja": "覚えているファイルへ、いま書き込む権限が無い" }, "manner": "NT-3a", "source": { "ja": "`FR-060`" }, "display": "show" },
    { "id": "RS-7", "scene": { "ja": "文書を変える身振りの最中である" }, "manner": "NT-1", "source": { "ja": "表 T-067 の `WS-2`" }, "display": "show", "wordsOf": "RS-6" },
    { "id": "RS-8", "...": "...", "display": "show" },
    { "id": "RS-14", "...": "...", "display": "report" },
    { "id": "RS-27", "...": "...", "display": "hide" },
    { "id": "RS-50", "...": "...", "display": "report" },
    { "id": "RS-63", "...": "...", "display": "autoDismiss" }
  ],
  "questions": [
    { "id": "QN-5", "scene": { "ja": "…" }, "names": { "ja": "挙げる —— 捨てる文書の名前" }, "source": { "ja": "表 T-024a の `OP-4`" }, "display": "askOnlyWithUnsavedEdits" }
  ],
  "invariantRefusals": { "table": "T-220", "manner": "NT-1", "display": "show", "wordsOf": { "IV-17": "RS-21" } }
}
```

- `scene`・`source`・`names` の升は今の表の升の Markdown を 1 バイトも変えずに運ぶ（`settings.json` の `note` と同じく、言語の辞書の形 `{ "ja": … }`）。⭐ 移し替えの証明は、生成した 2 つの表の行が今の `01-04-requirements.md` の行とバイトで一致すること（Chapter 6.2 の「移し替えは往復のバイト一致で検証すること（MUST）」）。そのために、波 1 では 表 T-233 / 表 T-234 の列を今のまま刷り、表示の仕方の列は波 2 で足す（8 節）。
- 並びは今の表の刷り順のまま（`RS-15` が最後、`RS-48` の後に `RS-63`・`RS-64`、`RS-66` の後に `RS-65` ほか）。
- スキーマ（`notice-reasons.schema.json`、手書きの契約。`settings.schema.json` と同じ役）が強制すること: `display` の列挙（`reasons`: `show`・`autoDismiss`・`hide`・`report`。`questions`: `ask`・`askOnlyWithUnsavedEdits`）、`manner` は 表 T-037 の行 ID の形、`wordsOf` は省けること、知らない鍵を拒むこと。
- 生成器 `docs/spec/_source/notice_reasons_json_to_md.py`（`npm run gen:notices` と `--check`。`npm run gen` と `gen:check` の列に足す）が強制すること: `wordsOf` の先が同じ原稿の行であり、自身は `wordsOf` を持たず、作法と表示の仕方が同じであること。`invariantRefusals.wordsOf` の鍵が 表 T-220 の行であること。⛔ どれかが外れたら何も書かずに 1 で終わる。
- 生成物 `docs/spec/_assets/tbl-notice-reasons.md` は 表 T-233・表 T-234 を刷り、冒頭で生成物であること・原稿の名・作り直し方を名乗る（`_assets/tbl-state-machines.md` の冒頭と同じ 3 つ）。
- `01-04-requirements.md` の `FR-076` は表を持たず、「通知が運ぶ理由は `_assets/tbl-notice-reasons.md` の 表 T-233 の行とすること（MUST）」のように生成物を指す。結びの規則（`RS-15` の落ち先、取り込みの検証の拒否、`QN-8` ほか）は `FR-076` に残す。
- `05-07-design.md` の Chapter 6.2 に 1 段落を足す:

```
⭐ 知らせの名簿の原稿は `_source/notice-reasons.json` とし、`_assets/tbl-notice-reasons.md` の 表 T-233・表 T-234 はそこから起こす生成物とする（MUST）。
同文書を手で直してはならない（MUST NOT）。
⭐ 同原稿は、理由と問いの行 ID・場面・作法・出典・表示の仕方を持ち、語を持たない —— 語は `_source/display-words.json` が行 ID で持つ。
⚠️ 辞書の生成器は、理由と問いの名簿をこの原稿から起こして辞書と突き合わせる（上の「名簿は要求の側が持つ」の、要求の側がこの原稿である）。
```


### E-02 —— 表示の仕方の値を入れ、表に刷る

表 T-233 の刷り方（波 2 の後）:

```
| 行 ID | 場面 | 作法 | 表示の仕方 | まとめ方 | 正 |
| RS-7 | 文書を変える身振りの最中である | `NT-1` | 出す | 語は `RS-6` | 表 T-067 の `WS-2` |
| RS-14 | … | `NT-5` | `U-62` に並べる | — | 表 T-024a の `OP-11` |
| RS-27 | … | `NT-1` | 出さない | — | `FR-029` |
| RS-50 | … | `NT-5` | `U-62` に並べる | — | `FR-023` |
| RS-63 | … | `NT-5` | 時間で消す | — | `FR-073` |
```

表 T-234 は 1 列「問うか」（`問う` ／ `保存していない編集があるときだけ問う`）を足す。

`FR-076` の結びに足す:

```
⭐ 理由ごとに画面へどう出すかは、表 T-233 の「表示の仕方」の欄が持つ（MUST）。
「出さない」の理由は、上げられても通知の欄に 1 枚を立てない —— 行は理由として残り、`Agent API` の拒否の値（表 T-035 の `AG-9a`）と試験はその行を運ぶ。
⛔ 要求の本文に「告げる」と書かれていても、出すかどうかを本文で決め直してはならない（MUST NOT） —— 欄が唯一の正である。
```

### E-03 —— 出さない行が破る文を書き換える（4.0 節の C-1〜C-12・C-14）

| # | 新しい文（案） |
|---|---|
| C-1 | `FR-029`: 「押されたときに限り、行えない理由を運ぶこと（MUST）。作法は `FR-076` の 表 T-037 の `NT-1` に従い、運ぶ理由は、押された入口の場面に当たる同要求の 表 T-233 の行とすること（MUST）。⭐ その理由を画面に出すかどうかは同表の表示の仕方の欄が決める —— 薄さが行えないことを既に示しているので、多くの行は出さない（`JDG-1748`）」 |
| C-2 | 「⚠️ どの入口にも当たる行が無いときの落ち先が `RS-27` である（出さない）」 |
| C-3 | `NT-7`: 「画面からの書き込み（取り消し・やり直しを含む）は 表 T-233 の `RS-27` として捨て（同行は出さない —— 問いが画面に立っているので、受けなかったことは見える）、`Agent API` の書き込みは 表 T-035 の `AG-9` のとおり拒むこと（MUST）」 |
| C-4 | `HF-14`: 「⛔ 薄いまま押されたときは、行を立てないこと（MUST）。運ぶ理由は 表 T-233 の `RS-46` とする」（後の「⛔ 行を立ててからパネルを開き…」は保つ） |
| C-5 | `FR-019`: 「⛔ 指す `TaskGroup` が無い縦位置で置こうとしたときは、作らないこと（MUST）—— 運ぶ理由は 表 T-233 の `RS-44` とする」 |
| C-5b | 「⛔ 黙って作らずに済ませてはならない（MUST NOT）…」の 1 文を消し、「⚠️ 理由は出さない —— 置かれなかったことは画面で見える（`JDG-1749`）」とする。後の「⛔ 行を 1 つ作って載せてはならない（MUST NOT）」は保つ |
| C-14 | 引用を C-1 の新しい文に合わせる —— 「…後段の『押されたときに限り、行えない理由を運ぶこと（MUST）』と両立しない」（ツールチップの MUST NOT そのものは保つ） |
| C-6・C-7 | 「`RS-44` を告げる」→「`RS-44` を運ぶ」（4 文） |
| C-8 | `WL-9`: 「何も書かない。運ぶ理由は 表 T-233 の `RS-55`（Chapter 6.1 の 表 T-220 の `IV-4`）」 |
| C-11 | `NT-3` の例を「連鎖削除・取込による上書き・暦の変更（`FR-088`）」にし、`RS-49` の欄の根拠の段を 3.1 節のとおりにする |
| C-12 | `RS-53` の欄を 3.1 節のとおりにする |

C-9・C-10 は E-07。⚠️ 初稿の C-13（`NT-9` の 1 行の規則と束の 1 枚）は、`JDG-1757` で束が `U-62` へ移ったので消えた —— `U-62` は通知ではなく、`NT-9` の外である（同面の用語の定義が既にそう言う）。

### E-04 —— 時間で消す通知

表 T-037 の `NT-2` の作法の升:

```
読み終える前に消えないようにするか、止める・延ばす・無効にする手段を持つこと（MUST）。
⭐ 時間で消すのは、表 T-233 の表示の仕方が「時間で消す」の理由の通知だけとする（MUST） —— ほかの通知は、`NT-8` で消されるまで立つことで前の枝を満たす。
⭐ その通知は、立ってから `_assets/tbl-settings.md` の 表 T-206 の `S-542` が経ったら、人の操作を待たずに消すこと（MUST）。
⭐ ポインタがその通知の箱の上にある間は数えないこと（MUST） —— 止める手段である。箱から離れたら `S-542` を始めから数え直すこと（MUST） —— 延ばす手段である。
⭐ 同じ理由が上がって `NT-3` で束ねたときも、始めから数え直すこと（MUST）。
⚠️ `NT-8` の消し方（`OK`・`Enter`・`Esc`）はそのまま当たる —— 先に人が消してよい。
⚠️ `U-62` に並べる理由（表 T-233 の表示の仕方）は通知ではないので、本行に当たらない —— `U-62` は `OK` で閉じるまで立つ。
```

表 T-206 の新しい行（原稿 `settings.json` の `T-206` の塊）:

```
| S-542 | 時間で消す通知を出しておく時間（表 T-037 の `NT-2`） | 3000ms | ⭐ 利用者が「3秒」と指定し、定数で持てと言った値である（`JDG-1755`）。⚠️ 後で使ってみて変える見込みが高い —— 直すのは本行の既定だけで、`src` は `npm run gen` で追随する。⚠️ 長い文は 3 秒で読み終えられないことがある —— ポインタを乗せている間は数えないので（`NT-2`）、読み終える前に消えない道は残る。⛔ `S-244`（倍率のメッセージ）とは別の値である —— あちらは通知ではない（`SE-5`）。保存しないのは、画面の道具の時間であって文書の内容ではないからである |
```

⛔ 生成器 `tools/generate_entity_types.py` の群に `'NOT_STORED_NOTICE_TIMES': (['S-542'], TIMED_WHERE_IT_STANDS)` を足し、`frame-clock-wakes.ts` に刷る（`S-244` の `NOT_STORED_SCALE_MESSAGE_TIMES` と同じ形）。足さないと `gen:check` が緑のまま行が `src` に届かない（`02-changing-the-spec.md` の 3.5 節、`CR-551`）。

`NT-5` の升の「⚠️ **`NT-2` の対象とする** —— 読み終える前に消えてはならない」は保ち、対象の例から「表 T-032 の `MG-10`」を除く。

`05-07-design.md` の 表 T-078 の下:

```
⚠️ `FT-4` が数えるのは 4 つである —— …（今のまま）
⚠️ 数え方: …（今のまま）
コードの `frame-clock-wakes.ts` の `setTimeout` は 5 つ（アイコンの説明の待ち、タスクの説明の待ち、倍率のメッセージ、押し続け、時間で消す通知の期限）である。
⛔ 通知の期限は、表示の仕方が「時間で消す」の通知が立っているときにだけ数える —— 表 T-037 の `NT-2` は選言であり、ほかの通知には前の枝（読み終える前に消えない）を当てている。
```

表 T-286（原稿 `_source/state-machines.json` の `notices` の領域）:

| 出来事 | `hidden` | `shown` |
|---|---|---|
| `notices/noticeRaised` | → 自己 [`isHiddenReason`]<br>→ `shown`（1 枚）[not `isHiddenReason`] | → 自己 [`isHiddenReason`]（変えない）<br>→ 自己 [`isSameReasonStanding`]（今のまま。相乗りする理由どうしは同じ理由と数える）<br>→ 自己 [それ以外]（今のまま） |
| `notices/noticeTimeElapsed`（新） | — | → `hidden` [`isTimedCard` & `isOnlyOneStanding`]<br>→ 自己 [`isTimedCard` & not `isOnlyOneStanding`]（その 1 枚を除く）<br>それ以外 → — |

出来事の定義: 「`notices/noticeTimeElapsed` —— 副作用の結果（シェルが数えた `S-542` が経った）: `NT-2` ・ `FT-4` —— 運ぶ値 `reason`（期限が来た 1 枚の理由）」。⚠️ ポインタが乗っている間の止めと数え直しはシェルの時計の仕事で（`SE-4` と同じ）、状態機械は期限が来たことだけを受ける。

### E-05 —— 読込の結果を `U-62` にまとめる（`JDG-1757`）

- 表 T-233 の表示の仕方 `report` の定め（`FR-076` の結びに足す）: 「⭐ 表示の仕方が「`U-62` に並べる」の理由は、1 回の読込（開く・開き直す・合流させる・重ねる）の中で上がったら、通知の欄に立てず、読込が着地したときに `_assets/tbl-glossary.md` の `U-62` に 1 行として並べること（MUST）。読込の外で上がったら、「出す」と同じ 1 枚の通知とする —— 暦を変えて完了率を数え直したとき（`RS-52`、`FR-012`）がその場合である」。
- `_assets/tbl-glossary.md` の `U-62` の升（案）:

```
| U-62 | `Import Report` | 1 回の読込（開く・開き直す・合流させる・重ねる）の結果を、理由ごとに並べて告げる面。<br>立てる規則は `FR-076`（表 T-233 の表示の仕方が「`U-62` に並べる」の行）・`FR-023`・表 T-032 の `MG-14`。<br>⭐ 件数を持つ理由（`RS-14`・`RS-16`・`RS-51`・`RS-52`・`RS-60`・`RS-71`・`RS-72`）は、その理由の語と件数と次の一手を 1 行に並べる。名前を持つ理由（`RS-50`・`RS-73`）は、その理由の語の下に名前を並べる。並びは 表 T-233 の刷り順とする。<br>⭐ 読込が着地したときに 1 度だけ立てる —— 途中で上がった理由は着地まで運び、着地しなかった読込（取りやめ・拒否）の理由は捨てる。<br>⛔ 件数が 0 の理由を並べてはならない（MUST NOT、`MG-14`）。<br>⛔ **`Confirmation`（`U-55`）ではない** —— 答えを求めない。<br>入口は `OK` の 1 つだけである。<br>⛔ **`Notification Area`（`U-57`）でもない** —— 表 T-037 の `NT-9` が通知を 1 行に限っており、理由ごとの行と名前の列挙が入らない。<br>⚠️ **名前は文書の値であるので訳さない**（`FR-023`） |
```

- 表 T-032 の `MG-14` の升の「⭐ 前の 2 つは、件数を添えて通知の欄（`_assets/tbl-glossary.md` の 表 T-103 の `U-57`）に告げる」を「⭐ 前の 2 つも、件数を添えて `U-62` に 1 行ずつ並べる（表 T-233 の表示の仕方）」にする。後の `RS-73` の段と「両方あるときは 1 つの面に理由ごとに並べる」は保つ。
- 表 T-233 の `RS-51` の欄の「⭐ **告げる先は通知の欄でよい** —— **運ぶのは件数だけであり、`NT-9` の 1 行に収まる。**」を「⭐ **告げる先は `U-62` の 1 行である**（表示の仕方）」にする。
- `FR-080` の 表 T-076 の `EP-22` の「落とした `Task` を告げる面（`FR-023`）」を「1 回の読込の結果を告げる面（`FR-023`・`FR-076`）」にする。
- 表 T-290（`_source/state-machines.json`）: `fileFlow/documentOpenLanded` の運ぶ値に `reportedCounts`（読込の中で上がった `report` の理由と件数。相乗りは同じ理由に数える）を足し、升を「→ 自己 [`hasAnythingToReport`] / `raiseFlowSurface`（`U-62`）（`droppedTaskNames`・`missingTaskNames`・`reportedCounts`・`openedFileName` を書き換える）」にする。`fileFlow/flowSurfaceClosed` の [`isImportReportSurface`] の升は `reportedCounts` も空にする。⭐ 件数は着地の出来事が運ぶので、着地しなかった読込の件数は状態に入らない（X-5）。
- 表 T-037 の `NT-3`・`NT-9` は変えない —— `U-62` は通知ではない。初稿の束の表 `T-NEW-1`・頭字 `NC` は作らない。
- ⚠️ `NT-4`（起動時の保留中の用件）の 1 枚は本書は触れない。起動時に渡された文書の読込をどう扱うかは 11 節の残る問い 1。

### E-06 —— 相乗り

表 T-037 の結び（`FR-076`）を:

```
⛔ 相乗り（表示の仕方の欄の「語は …」）を持たない行を足すときは、辞書の原稿にも項を足すこと（MUST） —— 生成器が原稿から名簿を起こすので、片方だけを書けば黙らずに落ちる。
⛔ 相乗りする行の項を辞書に持ってはならない（MUST NOT） —— 画面は相乗り先の語を刷るので、持てば刷られない語が残る。行は残り、`Agent API` の拒否の値は相乗りする行そのものを運ぶ。
```

### E-07 —— `QN-5`

- 表 T-234 の `QN-5` の場面: 「いまの文書を捨てて置き換えるとき（`FR-095` の新しく始めることを含む）。<br>保存していない編集があるときだけ立つ（`JDG-1748`）」。問うかの欄: `保存していない編集があるときだけ問う`。
- `FR-095` の STATEMENT: 「捨てる前に、保存していない編集があるときは、表 T-024a の `OP-4` と同じ確認を求めること（MUST）」。RATIONALE の「⭐ 問うかどうかを未保存の編集で分けないのは、…」を「⭐ 保存していない編集が無いときに問わないのは、そのとき失うのが取り消しの履歴だけであり、利用者がそれを問いの負担より軽いと裁いたからである（`JDG-1748`）。⚠️ 1 文字の鍵（表 T-036 の `SK-25`）を保存した後に押し違えると、取り消しの履歴は戻らない」にする。
- 保存していない編集の判じ方は、`QN-11` が既に使う判じ方（`FR-101` のファイルの状態）と同じものとする。新しい判じ方を作らない。
- `_source/state-machines.json`: `fileFlow/newDocumentEntryPressed`・`fileFlow/openChoiceAnswered`（置き換え）・`fileFlow/documentFileRead`（読み直し）の、問いを立てる升に、保存していない編集が無いときは問わずに進む枝を足す（ガードは `QN-11` の升が使う名を当てる体が引いて使う。新しい名を作らない）。

### E-08 —— 直す語（ja は決定の案と `JDG-1758`、en は `JDG-1763` で採った）

| 鍵 | 欄 | ja（新） | en（`JDG-1763`） |
|---|---|---|---|
| `reasons` の `RS-6`（`RS-7`・`RS-9` の相乗り先） | `text` | いまは変更を受け付けられなかったので、行っていません | The change could not be accepted just now, so it was not made |
| 同 | `nextStep` | もう一度行ってください | Try once more |
| `reasons` の `RS-8` | `text` | いまは変更を受け付けられなかったので、行っていません（`RS-6` と同じ文） | The change could not be accepted just now, so it was not made |
| 同 | `nextStep` | 先に [Enter] で編集を確定するか、[Esc] で取りやめてください | First press Enter to commit the edit, or Esc to cancel it |
| `reasons` の `RS-11`（`RS-12`・`RS-13` の相乗り先） | `text` | このファイルは GRS が読める形式（GRS JSON・MSPDI XML・GRS の .html）ではありません | This file is not in a format GRS can read (GRS JSON, MSPDI XML or a GRS .html) |
| 同 | `nextStep` | 形式とファイルが壊れていないかを確かめてください | Check the format, and whether the file is intact |
| `reasons` の `RS-69` | `text` | マイルストーンは期間を持たないので、親タスクにはできません | A milestone has no span, so it cannot be a parent task |
| 同 | `nextStep` | （今のまま）期間を持つタスクへ引いてください | （今のまま）Drag to a task that has a span |
| `reasons` の `RS-77` | `text` | 工数は書き換えていません | The work values were not rewritten |
| 同 | `nextStep` | 相手側のアプリで工数を更新してください | Update the work in the other application |
| `delayReportReasons` の `milestoneAchieved` | `text` | 先行がすべて完了しているので、このマイルストーンは達成済みかもしれない | Every predecessor is complete, so this milestone may already be achieved |
| `differenceReview` の `separateNote`（新しい節） | `text` | 別のものとして取り込むと、このタスクは元の WBS の台帳とつながらなくなり、相手側へ戻せなくなります | Taken in as a separate task, it loses its link to the original WBS ledger and cannot be written back to the other side |

- 表 T-233 の `RS-69` の場面の升は「**マイルストーンは期間を持たないので、親タスクにはできない**（WBS の親を結ぶ構えで、マイルストーンの上で離した）」にする —— 語と場面を一緒に直す（表 T-233 の結びの「行の言うことを書き換えたときは、辞書の項もその行の言うことに合わせること（MUST）」の逆向きも同じ）。「開始ー終了」の長音符の誤記も消える。
- `RS-77` の場面: 「**工数を持つ文書を `MSPDI` へ書き出し、工数を書き換えなかった**（表 T-033 の `EX-3`）」、作法 `NT-5`、正 表 T-033 の `EX-3`、表示の仕方 時間で消す。表 T-033 の `EX-3` の升の「通知すること」に「（表 T-233 の `RS-77`。書き出しの後に 1 回）」を足す。
- 表 T-032 の `MG-10` の升: 「**「別のものとして取り込む」を選ばせる面（`_assets/tbl-glossary.md` の `U-61`）に、そのタスクが元の外部 WBS マスタへ戻せなくなることを、選ぶ前から常に示すこと（MUST）。** 通知にしない —— 選ぶ人が選ぶ前に読むものであり、`OK` を押させるものではない」。`tools/generate_display_words.py` に部分の名簿 `DIFFERENCE_REVIEW_PARTS = ('separateNote',)` を足す（`OPEN_CHOOSER_PARTS` と同じ形）。
- ⚠️ `RS-8` の次の一手は `JDG-1758` の利用者の文（「先に「Enter]で編集を確定するか[ESC]で取りやめてください。」）を、調整役が括弧とキーの綴りを揃えた形（[Enter]・[Esc]）である。語の綴りは 表 T-036 のキーの綴りに合わせ、文末の「。」は辞書のほかの語に合わせて落とした。

### E-09 —— 取り込みの拒否を告げる（`invariants` の語）

ja は決定の案（『推奨の理由』の欄）をそのまま写した。`IV-11`・`IV-12`・`IV-21` は取り込みの形に直した文（`JDG-1761`）、`IV-10`・`IV-19`・`IV-20`・`IV-22` の次の一手は `JDG-1762` の文。en は `JDG-1763` で採った。

| 行 | `text`（ja） | `nextStep`（ja） | `text`（en） | `nextStep`（en） |
|---|---|---|---|---|
| `IV-1` | 同じ ID のものが 2 つ以上あるので、このファイルは開けません | 元のファイルの ID の重なりを直してから開いてください | Two or more items share one ID, so this file cannot be opened | Fix the repeated IDs in the original file, then open it |
| `IV-2` | 存在しないものを指している参照があるので、このファイルは開けません | 書き出したときのファイルをそのまま開いてください | A reference points at something that does not exist, so this file cannot be opened | Open the file exactly as it was exported |
| `IV-3` | ピン止めの記録が存在しないタスクグループを指しているので、このファイルは開けません | 書き出したときのファイルをそのまま開いてください | A pin record points at a task group that does not exist, so this file cannot be opened | Open the file exactly as it was exported |
| `IV-4` | タスクの親子が輪になっているので、このファイルは開けません | 元のファイルで親子の輪を解いてから開いてください | The parents and children of the tasks form a loop, so this file cannot be opened | Break the loop in the original file, then open it |
| `IV-5` | タスクグループの入れ子が段の上限より深いので、このファイルは開けません | 元のファイルで入れ子を浅くしてから開いてください | Task groups are nested deeper than the level limit, so this file cannot be opened | Make the nesting shallower in the original file, then open it |
| `IV-6` | どのタスクグループにも載っていない（または 2 つ以上に載っている）タスクがあるので、このファイルは開けません | 書き出したときのファイルをそのまま開いてください | A task sits on no task group (or on more than one), so this file cannot be opened | Open the file exactly as it was exported |
| `IV-7` | 暦が 1 つも無いので、このファイルは開けません | 書き出したときのファイルをそのまま開いてください | The file has no calendar, so it cannot be opened | Open the file exactly as it was exported |
| `IV-8` | 名前の無いタスクグループがあるので、このファイルは開けません | 書き出したときのファイルをそのまま開いてください | A task group has no name, so this file cannot be opened | Open the file exactly as it was exported |
| `IV-9` | 塗りと線の両方が透明なものがあるので、このファイルは開けません（案の「取込では」の形） | どちらかに色を付けてください | Something has both its fill and its line transparent, so this file cannot be opened | Give one of them a colour |
| `IV-10` | 終了の日が、開始の日より前になっているタスクがあるので、このファイルは開けません（案: `RS-58` の語 ＋ 結び） | 元のファイルでそのタスクの日付を直してから開いてください（`JDG-1762`） | A task finishes before it starts, so this file cannot be opened | Fix that task's dates in the original file, then open it |
| `IV-11` | フェードが付いているのに終了日の無いタスクがあるので、このファイルは開けません（`JDG-1761`） | 元のファイルで終了日を入れるかフェードを外してから開いてください | A task has a fade but no finish date, so this file cannot be opened | In the original file, enter a finish date or remove the fade, then open it |
| `IV-12` | フェードの日数の和がタスクの期間より長いタスクがあるので、このファイルは開けません（`JDG-1761`） | 元のファイルでフェードを短くするか期間を延ばしてから開いてください | A task's fade days add up to more than its span, so this file cannot be opened | In the original file, shorten the fades or lengthen the span, then open it |
| `IV-14` | 日付として読めない値か、扱える範囲の外の日付です | 正しい日付を入れてください | The value is not a date, or the date is outside the range that can be handled | Enter a valid date |
| `IV-15` | ファイルの中の取り込みの記録が食い違っているので、このファイルは開けません | 書き出したときのファイルをそのまま開いてください | The import records in the file disagree, so this file cannot be opened | Open the file exactly as it was exported |
| `IV-16` | 設定値の上限と下限が逆になっているので、このファイルは開けません | 元のファイルの設定値を直してから開いてください | A setting's upper and lower limits are the wrong way round, so this file cannot be opened | Fix the settings in the original file, then open it |
| `IV-17` | （相乗り: `RS-21` の語） | （同） | （同） | （同） |
| `IV-18` | タスクグループの親子が輪になっているので、このファイルは開けません | 書き出したときのファイルをそのまま開いてください | The parents and children of the task groups form a loop, so this file cannot be opened | Open the file exactly as it was exported |
| `IV-19` | 始まりと終わり（または上と下）が逆のハイライトボックスがあるので、このファイルは開けません | 元のファイルでハイライトボックスの向きを直してから開いてください（`JDG-1762`） | A highlight box has its start and end (or top and bottom) the wrong way round, so this file cannot be opened | Put the highlight box the right way round in the original file, then open it |
| `IV-20` | タスクグループが 1 つも無いので、このファイルは開けません | 書き出したときのファイルをそのまま開いてください（`JDG-1762`） | The file has no task group, so it cannot be opened | Open the file exactly as it was exported |
| `IV-21` | 実績の終了が実績の開始より前のタスクがあるので、このファイルは開けません（`JDG-1761`） | 元のファイルで実績の日付を直してから開いてください | A task's actual finish is before its actual start, so this file cannot be opened | Fix the actual dates in the original file, then open it |
| `IV-22` | マイルストーンの形なのにマイルストーンでない（またはその逆の）タスクがあるので、このファイルは開けません | 元のファイルでそのタスクの形とマイルストーンの印を揃えてから開いてください（`JDG-1762`） | A task drawn as a milestone is not a milestone (or the other way round), so this file cannot be opened | In the original file, make that task's shape and its milestone flag agree, then open it |
| `IV-23` | タスクの見た目の記録が欠けているか重なっているので、このファイルは開けません | 書き出したときのファイルをそのまま開いてください | A task's appearance record is missing or repeated, so this file cannot be opened | Open the file exactly as it was exported |

⚠️ 告げ方: 取り込みが拒まれたら、破れた 表 T-220 の行ごとに 1 回ずつ理由を上げ、同じ行が何度破れても `NT-3` の件数で 1 枚にする。⭐ これは表 T-233 の結びの「取り込みの検証が拒んだとき、`NT-1` の通知が運ぶ理由は、拒んだ 表 T-220 の行の行 ID とすること（MUST）」を守ることであり、仕様の字は変えない（`IV-14` は取り込みでは `RS-50` が代わりに出る —— 語は編集で拒んだときのためのもの）。

### E-10 —— 変更履歴

`docs/development-records/changelog.md` に 1 行（番号は当てる日に調整役が付ける。リテラルの `|` を書かない）。

### 4.1 生成物

`npm run gen`（`gen:notices` を新しく含む）で起こし直す。手では直さない —— `_assets/tbl-notice-reasons.md`・`_assets/tbl-settings.md`・`_assets/tbl-state-machines.md`・`_assets/tbl-row-id-prefixes.md`・`src/adapter/screen-renderer/display-words.json`・各ファイルの生成した区画。

---

## 5. 継ぎ目（コード）

| 所 | 何をするか |
|---|---|
| 新しい生成器 `tools/generate_notice_reasons.py`（`npm run noticereasons` と `:check`、`gen` / `gen:check` の列に足す） | `notice-reasons.json` と 表 T-220 の行から、`src/use-case/advance-screen-session/notice-values.ts` の生成した区画に刷る: `type ReasonRow`（表 T-233 の全行）・`type InvariantRow`（表 T-220 の全行）・`type NoticeReason = ReasonRow \| InvariantRow`・`NOTICE_MANNER_OF_REASON`・`NOTICE_DISPLAY_OF_REASON`・`NOTICE_WORDS_ROW_OF_REASON`（相乗り先。無ければ自身）・`type QuestionRow`（表 T-234 の全行）・`QUESTION_DISPLAY_OF_ROW`（表 T-234 の行 → `ask` ／ `askOnlyWithUnsavedEdits`）。⚠️ 初稿の `NOTICE_BUNDLE_OF_REASON` は `JDG-1757` で束の表が無くなったので作らない。初稿の `DISCARD_QUESTION_DISPLAY` は継ぎ目の名 `QUESTION_DISPLAY_OF_ROW` に替えた（調整役の継ぎ目の文、2026-10-09）。⭐ 置き場が use-case なのは、表示の仕方を当てる状態機械（X-9）がそこに在り、`frame-loop.ts`（framework）はそこから import できるが逆はできないからである |
| `frame-loop.ts` | 手写しの `NoticeReason` と `NOTICE_MANNER_OF_REASON` を消し、生成した名を import する。`NOTICE_REASON_OF_WRITE_REFUSAL` の `importRefused` を、拒んだ 表 T-220 の行を運ぶ形にする（拒否の値が行を持たないなら、`document-file-flow.ts` の側で告げる） |
| `notice-values.ts` の `onNoticeRaised` | `hide` の理由は立てない。相乗り先で同じ理由を判じる。新しい出来事 `noticeTimeElapsed` の手を足す（表 T-286、E-04） |
| `frame-clock-wakes.ts` | 時間で消す 1 枚ごとの期限（`NOT_STORED_NOTICE_TIMES['S-542']`）。ポインタが箱の上にある間は止め、離れたら数え直す（`startScaleMessageTimer` と同じ形） |
| `src/adapter/screen-renderer/notices.ts` | 相乗り先の語を刷る。⚠️ `NT-4` の束ねは変えない |
| `document-file-flow.ts` | `afterDropping` の拒否で 表 T-220 の行を告げる（E-09）。`exportedText` の `mspdi` で `EX-3` の知らせを捨てず、`RS-77` を 1 回上げる |
| `document-file-flow.ts` の読込の道（`tellDecodedIntake`・`tellImportReport`・`IGNORED_FILES_REASON` を上げる所） | `report` の理由を通知として上げず、件数を数えて着地の出来事（`documentOpenLanded` の `reportedCounts`）に載せる。着地しなかった読込では捨てる（X-5、E-05） |
| `src/use-case/advance-screen-session/file-flow-values.ts` の `hasTasksToReport` | `hasAnythingToReport` へ広げて改名し、`reportedCounts` を運ぶ（表 T-290） |
| `U-62` を描く所（`src/adapter/screen-renderer/open-modals.ts`・`src/framework/dom-screen-surface/open-modals-drawing.ts`） | 件数の行（理由の語・件数・次の一手を 1 行）を、名前の一覧とともに 表 T-233 の刷り順で組む |
| `QN-5` を立てる所（`frame-loop.ts` の `discardQuestionOf`、`file-flow-values.ts`） | 保存していない編集が無いときは問わずに進む（E-07） |
| `U-61`（`Difference Review`）を描く所 | `differenceReview.separateNote` の語を常に出す（E-08） |
| 公開の入口 | `frame-loop.ts`（`SingleHtmlShell`）が `AdvanceScreenSession` の生成した名を読むので、`published-entries.json` の該当する `PI-` の行に名を足す（検査 26b。`CR-581` の 6 節の形） |
| 検査 69 の基準線 | 2 行を刈る（3.1 節） |

⚠️ `src/adapter/screen-renderer/` と `frame-clock-wakes.ts` が変わるので、`perf-pending.md` に行を足す（検査 66）。時間で消す期限は通知が立っている間だけの `setTimeout` 1 つであり、毎フレームの仕事は増えない。

⛔ 読む側が「知らない行」で投げるか（`02-changing-the-spec.md` の 3.5 節）: `notices.ts` の `REASONS_BY_ROW` は投げずに `RS-15` へ落ちる。生成した `Record<NoticeReason, …>` は型で揃う。⇒ 名簿の行と読む側は同じ波に置く（8 節）。

---

## 6. グラフ（`572da133`、`impact.py`）

| 起点 | 要求 / 参照 | 2 次 | 本書の扱い |
|---|---|---|---|
| 表 T-233 | 29 件 | 70 件 | 指す側の字は、4.0 節の 14 か所と `FR-076`・`MG-14`・`EP-22` だけを変える。ほかは「表 T-233 の `RS-x`」のまま —— 表の番号は変わらない |
| 表 T-234 | 7 件 | 38 件 | `FR-095` と `FR-076` だけを変える |
| 表 T-037 | 19 件 | 68 件 | `NT-2`・`NT-3`（例）・`NT-5`・`NT-7` の升と `FR-076` の結び |
| 表 T-220 | 18 件 | 55 件 | 字は変えない（語だけ） |
| 表 T-206 | 65 件 | 49 件 | 1 行足すだけ |
| `FR-029` | 27 件 / 73 か所 | — | C-1・C-2 |
| `FR-076` | 14 件 / 22 か所 | — | E-01・E-02・E-06 |
| `FR-095` | 5 件 / 14 か所 | — | E-07 |
| `FR-019` | 10 件 / 67 か所 | — | C-5・C-5b |
| `FR-016` | 8 件 / 32 か所 | — | C-6 |
| `FR-004` | 8 件 / 26 か所 | — | C-4（`HF-14`） |
| `FR-135` | 8 件 / 31 か所 | — | C-8（`WL-9`） |
| 行 `NT-2` | 3 件 / 7 か所（`FR-080`・`FR-076`・`FR-039`、`05-07-design.md` の 5.5 の 3 か所） | — | `FR-039` の `SE-5` と `FR-080` の `EP-16` は字を変えない（倍率のメッセージは通知でなく、通知は絵に焼かない —— どちらも本書で偽にならない） |
| 行 `QN-5` | 2 件 / 9 か所 | — | `FR-100` の「`Ctrl` ＋ `R` で読み直す側は … `QN-5` が既に持っている」は保つ |
| 行 `RS-27` | 2 件 / 12 か所 | — | 状態機械の升は理由を名指すだけなので保つ（X-9） |

⚠️ `induced.py` は **未測** —— 走らせると `scratch/spec-check/sd-out/json/index.json` が無いと言って止まる（`check.sh` を先に走らせる必要がある）。当てる体が `check.sh` の後に 13 節の 2 行目を打ち、閉路に入る対象を 2 つ以上触るなら 1 つの計画で 1 度に書く（`02-changing-the-spec.md` の 1 節の 3）。⚠️ `FR-029` と 表 T-037 は 表 T-051 の `HF-` の行とともに閉路に入ることが見込まれるので、E-03 と E-04 は同じ編集の計画に置く。

---

## 7. 数の予測

| 数 | 前（`572da133`） | 後 | 測り方 |
|---|---|---|---|
| 表 T-233 の行 | 71 | 72（`RS-77`） | `impact.py T-233` の「行」 |
| 表 T-234 の行 | 10 | 10 | `impact.py T-234` |
| 表の数 | — | ±0（初稿の `T-NEW-1` は `JDG-1757` で要らなくなった） | `npm run gen` の出力 |
| `01-04-requirements.md` が持つ表 | — | −2（移動） | 生成物の検査 16 |
| 表 T-206 の行 | — | ＋1 | `npm run gen:settings` の出力 |
| 表 T-286 の出来事 | 5 | 6 | `_assets/tbl-state-machines.md` |
| 表 T-290 の `documentOpenLanded` の運ぶ値 | — | ＋1（`reportedCounts`）、ガード 1 つ改名 | `_assets/tbl-state-machines.md` |
| 辞書の `reasons` の項 | 71 | 67（−5 ＋1） | `npm run words` の出力 |
| 辞書の `invariants` の項 | 22（語は 0） | 21（語は 21 項すべて ja を持つ） | 同上 |
| 辞書の新しい節 | — | ＋1（`differenceReview`、1 項） | 同上 |
| 語の升（ja）の新設・書き換え | — | 53（`RS-6` 2・`RS-8` 2・`RS-11` 2・`RS-69` 1・`RS-77` 2・`milestoneAchieved` 1・`separateNote` 1・`invariants` 42 —— `text` 21 ＋ `nextStep` 21） | 原稿の差分の升を数える |
| en の語 | — | 53（`JDG-1763`） | 同上 |
| `src` の和 `NoticeReason` の員数 | 63 | 94（表 T-233 の 72 ＋ 表 T-220 の 22。生成） | 生成した区画 |
| 検査 69 の基準線 | — | −2 | `check-literal-restatement.py` |
| 要求 | — | ±0 | `check.sh` |

⚠️ 表示の仕方の値の内訳（表 T-233 の 72 行）: `show` 28（うち相乗り 5）、`autoDismiss` 14（12 ＋ `RS-69` ＋ `RS-77`）、`hide` 21、`report` 9（`RS-14`・`RS-16`・`RS-50`・`RS-51`・`RS-52`・`RS-60`・`RS-71`・`RS-72`・`RS-73`） —— 計 72。表 T-234 の 10 行: `ask` 9、`askOnlyWithUnsavedEdits` 1。⛔ この内訳は当てる体が原稿を数えて突き合わせる（外れたら数え落とし）。

---

## 8. 波

| 波 | 中身 | 証明 |
|---|---|---|
| 0（調整役） | `CR-708` との順を決める（10 節）。仮の名の本番の番号を採る | 当てる日の `git grep` |
| 1（移すだけ —— 振る舞いは変えない） | `notice-reasons.json`・スキーマ・`notice_reasons_json_to_md.py`・生成物、`FR-076` が生成物を指す、Chapter 6.2 の段落、`generate_display_words.py` が名簿を原稿から読む、`tools/generate_notice_reasons.py` と `notice-values.ts` の区画、`frame-loop.ts` の手写しを消す、検査 37・69 と表を読む試験の付け替え。表示の仕方は今の仕様が言う値で入れる（仕様が出さないと定める `RS-19`・`RS-22`・`RS-74` は `hide`、`RS-50`・`RS-73` は `report`、ほかは `show`。`QN-5` は `ask`）。生成した表は表示の仕方の列をまだ刷らない | 生成した 表 T-233・表 T-234 の行が今の行とバイト一致。`npm run gen:check`・`guard:spec`・vitest が波の前と同じ数で緑 |
| 2（決定を当てる —— 仕様と `src` を 1 つの波で） | E-02〜E-09、`S-542` と生成器の群、`state-machines.json`、`src` の 5 節の残り。⭐ 仕様だけを読む試験の体を別に立てる（記憶 `spec-driven-tests-by-another-agent`）—— 継ぎ目の名（`NOTICE_DISPLAY_OF_REASON`・`noticeTimeElapsed`・`S-542`）を両方の依頼文に逐語で書く | `check.sh`・`npm run guard:gen`。7 節の予測と実測の突き合わせ |
| 3（利用者の試し） | 調整役が 1 枚の手順にまとめて利用者に頼む（記憶 `user-tests-go-through-coordinator`・`user-tests-after-all-fixed`） | 利用者の答え |

⚠️ 波 1 と波 2 を分けるのは、移し替えの証明（バイト一致）を決定の当てと混ぜないためである。波 2 の中で仕様と `src` を分けないのは、`02-changing-the-spec.md` の 3.5 節（原稿の行と読む側を同じ巡で）のため。

---

## 9. 仕様の外で直すもの

- 生成器: `tools/generate_display_words.py`（名簿の出どころを `notice-reasons.json` へ。相乗りする行と `IV-17` を名簿から除く。`DIFFERENCE_REVIEW_PARTS`）、`tools/generate_entity_types.py`（`NOT_STORED_NOTICE_TIMES`）、新しい `tools/generate_notice_reasons.py`、新しい `docs/spec/_source/notice_reasons_json_to_md.py`、`package.json` の `gen`・`gen:check`。
- 検査: `.claude/skills/spec-graph-check/check-dictionary-table-covariance.py`（`questions` と 表 T-234 の対の読み先）、`dictionary-table-pairing.txt`、`list-asserted-claims.py`、`check-literal-restatement.py` の基準線、`check.sh` が生成物の一覧を持つなら足す。
- 試験: 表 T-233 / 表 T-234 を `01-04-requirements.md` から読んでいるもの —— `tests/contract/t-233-reason-words-tell-the-row.contract.test.ts`・`display-words.contract.test.ts`・`state-machine-notices.contract.test.ts`・`dfc-1280-dfc-1410-the-state-machine-table-names-its-words-and-questions.contract.test.ts`・`dfc-582-every-invariant-row-has-a-dictionary-entry.test.ts` ほか（13 節の 4 行目で全数を測る）。出さない行が出ることを主張している試験 —— `dfc-567-fr-029-a-faint-roster-entrance-that-is-pressed-tells-rs-27.test.ts`・`dfc-337-fr-029-the-three-file-gates-say-why-on-a-second-press.test.ts`・`e24-paste-refused-while-several-rows-are-chosen.test.ts` ほか。⛔ 赤くなった試験は仕様の新しい文で直す（決定が勝つ）。基準線は上げない。
- 新しい `（MUST）`（`NT-2` の 4 つ・`FR-076` の表示の仕方と `report` の定め・`U-62`・`MG-10`・`FR-095`）には逐語の試験を足す（検査 39・42。仕様に足す行は段落の終わりに置く）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- **編集で拒んだ不変条件が `RS-10` に潰れる穴は直さない**（シートの `RS-10` の行の注。`IV-2`・`IV-6`・`IV-9`・`IV-11`・`IV-12`・`IV-14`・`IV-21` の編集の拒否）。表 T-233 の結びが既に禁じている形であり、本書の外の欠陥として扱う（12 節で `DFC` の行を提案）。
- `EX-6`（フェードの枠を移したことの通知）は `DFC-557` の DEVIATION のまま。決定の 138 行に無い。
- `NT-4` の束ね・`FR-100` のブラウザの問いは変えない。`U-62` は E-05 のとおり広げるが、名前の一覧の形は変えない。
- `RS-65`・`RS-66` の文末の「。」の不揃いは直さない（決定は「表示する」のまま語に触れていない）。
- 行の番号を振り直さない。出さない行も退役させない（`RS-22` の「席番号を別の場面に再び使わせない」を保つ）。
- **`CR-708`（行 → タスクグループの改名、下書き）との順** —— 本書の新しい語はすでに「タスクグループ」と書く。`CR-708` の名前の対応表は 表 T-233 / 表 T-234 の升を `01-04-requirements.md` の中で書き換える計画である（`c42039df` で測った 1,667 パターン）。⭐ 推奨の順: `CR-708` の 表 T-233 / 表 T-234 にかかる段を先に当て、本書の波 1 がそれを原稿へ運ぶ。逆の順なら、`CR-708` を当てる体はその段の書き換え先を `notice-reasons.json` に替え、その 13 節の数を測り直す。どちらの順でも、本書の新しい語（4.8・4.9 節）は `CR-708` の対象に入らない（既に新しい名で書いた）。⚠️ 今のままの語（`RS-61` の「この行は読み取り専用です」ほか）は `CR-708` が直す。
- `CR-705`（`RS-75`・`RS-76` を足した）・`CR-701`（`QN-13` を退役）・`CR-688`（`RS-71`〜`RS-73`）・`CR-692`（`RS-74`）は当て済みで、本書はそれらの行を `notice-reasons.json` に運ぶだけ。着地した変更要求には追補を書かない（検査 62）。

---

## 11. 利用者に問うたこと（答えの記録）と、残る問い

### 11.1 答え（2026-10-09。全文は rulings.md）

| # | 問い | 答え | 裁定 |
|---|---|---|---|
| 1 | 英語の語（4.8・4.9 節の en）を本書の案のまま採るか | 採る（`JDG-1758`・`JDG-1761`・`JDG-1762` で書き足した升の en も本書の案） | `JDG-1763` |
| 2 | 時間で消す通知の期限 `S-542` | 「3秒 ただし、定数で持てよ。 後で使ってみて変える可能性が高いし。」—— 3000 ms、表 T-206 の行（X-6） | `JDG-1755` |
| 3 | 「表示しない」21 行の語を辞書に残すか | 残す（X-4） | `JDG-1759` |
| 4 | `IV-11`・`IV-12`・`IV-14`・`IV-21` の編集の形の文 | `IV-11`・`IV-12`・`IV-21` を取り込みの形に直す。`IV-14` は案のまま（E-09） | `JDG-1761` |
| 5 | 次の一手の無い `IV-10`・`IV-19`・`IV-20`・`IV-22` | 足す（E-09） | `JDG-1762` |
| 6 | `RS-6`〜`RS-9` を 1 文にすると `RS-8` の一言が消える | 「先に「Enter]で編集を確定するか[ESC]で取りやめてください。にしよう。」—— `RS-8` だけ自分の次の一手を持つ（X-2・E-08） | `JDG-1758` |
| 7 | 読込の結果を通知の欄の 1 枚にするか、`U-62` に入れるか | `U-62` に入れる（X-1・X-2・X-5・E-05） | `JDG-1757` |
| 8 | `RS-40` を退役させるか | 退役させず `hide` | `JDG-1760` |
| 9 | 保存した後の `N` は問わずに取り消しの履歴ごと消える。`JDG-921` を狭めてよいか | 決定のとおり。0.2 節の 6 つの裁定に「覆された（一部）」の印を付けてよい | `JDG-1754` |
| 10 | 時間で消える 1 枚にも `OK` の入口を残すか | 残す（X-8） | `JDG-1756` |

⚠️ `JDG-1753` は問い方についての利用者の指示であり、本書の中身を変えない。

### 11.2 `JDG-1757` から生まれた問い（答え済み: `JDG-1764`）

| # | 問い | 推奨 → 答え | 理由 |
|---|---|---|---|
| X-13 | 起動時に渡された文書（表 T-024a の `OP-14`・`FR-067` の埋め込み）を読んで `RS-51`（設定値を範囲に収めた）や `RS-63` が上がるとき、今は起動時の 1 枚（表 T-037 の `NT-4`）に集まる（`src/framework/single-html-shell/single-html-shell.ts` の `raiseStartupNotice`）。`JDG-1757` が挙げた読込（開く・開き直す・合流させる・重ねる）に起動時の読込を含めて `U-62` に並べるか | 含める —— `RS-51`・`RS-52`・`RS-60` は起動時でも `U-62` に並べ、`NT-4` の 1 枚には `Agent API` の用件と `RS-63` などの通知だけを残す。⭐ **答え: 含める**（`JDG-1764`、2026-10-09「A. 取込報告の面に出す (Recommended)」） | 同じ「ファイルを読んだ結果」が、読んだ入口によって別の面に出ると、どこを見ればよいかが入口ごとに変わる。⚠️ 含めない場合は、`report` の定めの「読込」に起動時を入れない旨を `FR-076` に書く |

---

## 12. 台帳

| 行 | 本書での扱い |
|---|---|
| `JDG-1746`〜`JDG-1752`・`JDG-1755`〜`JDG-1764` | 状態は「指示 —— `CR-712` が当てる」（本席が書いた）。当てた日に「適用済」とし、着地先に 表 T-233（`_assets/tbl-notice-reasons.md`）・表 T-234・表 T-037 の `NT-2`・表 T-206 の `S-542`・`_assets/tbl-glossary.md` の `U-62`・`_source/notice-reasons.json`・`_source/display-words.json` ほかの仕様の ID とパスを書く（検査 43 は `CR-` だけの着地先を赤にする） |
| `JDG-1753` | 問い方の指示。本書の着地先は無い |
| `JDG-1754` | 0.2 節の 6 つの印は調整役が付けた。本書は何もしない |
| `JDG-509`・`JDG-617`・`JDG-858`・`JDG-921`・`JDG-1118`・`JDG-1159` | 「覆された（一部）」の印は付いた（`JDG-1754`）。当てた日に、覆した先として `CR-712` の着地先を書き足す |
| `DFC-2166` | 当てた日に閉じる |
| `PND-787` | 裁定済。当てた日に着地を書く |
| 新しい `PND` | 使わない —— 11.2 節の `X-13` は利用者が答えた（`JDG-1764`）。`PND-830`〜`PND-839` の予約は返す |
| 新しい `DFC`（提案だけ） | 「編集で拒んだ不変条件が `RS-10` に潰れる」（10 節。表 T-233 の結びの MUST NOT に反する）—— 番号は調整役が配る |

---

## 13. 測り方の再現

```
# the tree: worktree at 572da133
git grep -c "CR-712" HEAD -- change-request docs/spec src tools          # 0 before this draft
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-233 T-234 T-037 T-220 T-206
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-029 FR-095 FR-019 FR-016 FR-004 FR-135 FR-076 NT-2 NT-5 QN-5 RS-27
bash .claude/skills/spec-graph-check/check.sh && PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-076 FR-029 FR-095 FR-019 FR-016 FR-004 FR-135 T-233 T-234 T-037 T-220 T-206
git grep -l "01-04-requirements" HEAD -- tests tools .claude/skills | xargs git grep -l "T-233\|T-234" HEAD --   # readers to re-point
git grep -n "RS-77\|S-542\|reportedCounts\|hasAnythingToReport" HEAD   # 0 before applying
grep -n "NoticeReason\|NOTICE_MANNER_OF_REASON\|importRefused" src/framework/single-html-shell/frame-loop.ts
grep -n "afterDropping\|DEVIATION" src/framework/single-html-shell/document-file-flow.ts
grep -n "tellDecodedIntake\|tellImportReport\|IGNORED_FILES_REASON\|raiseStartupNotice" src/framework/single-html-shell/document-file-flow.ts src/framework/single-html-shell/single-html-shell.ts
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-identifier-reservation.py   # OK on this draft
# the 138 decisions: sheet 記入, column N of docs/review/message-review-2026-10-08.xlsx
#   counted with openpyxl: 表示する 63 / 表示しない 22 / 自然に消える 12 / 1 枚にまとめる 15 / 文面を直す 26
# S-542 = 3000 ms is the user's value (JDG-1755); no derivation is claimed
```
