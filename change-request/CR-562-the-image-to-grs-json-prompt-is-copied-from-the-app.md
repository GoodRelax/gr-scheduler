# CR-562 — 画像から GRS JSON を作らせるプロンプトを、アプリからクリップボードへ写す

> 起草の状態: 起草（2026-09-24）。⛔ **`docs/spec` と `src/` は 1 字も触っていない。** 11 節の問い 1 つ（入口の置き場）には、利用者が 2026-09-24 に「提案通り」と答えた（`JDG-503`、0 節 ③ の決定 12）。12 節の台帳の行は、本書を書いた者が同じ日に `rulings.md` ・ `defects.md` へ写した。
> 読んだ木: `45ba1707`（`claude/goofy-borg-332fd7`、`refactor` の上）。行番号・数・参照は、すべてこの木で測り直した（測り方は 13 節。起草の日の木は `ebc71984`）。⚠️ **当てる前に数え直すこと** —— 当てるのはリファクタ（`CR-551`〜`CR-554`、H2〜H10、段 8）の後である。
> 4 節の編集（E- ・ J- ・ N-）は 2026-09-24 に `45ba1707` の木で書き、旧がそれぞれのファイルに 1 回だけ現れることを数えた（13 節の 5）。
>
> **閉じるもの**: 利用者の 2026-09-23 の指示 2 件（12 節の `JDG-501` ・ `JDG-502`。逐語は 0.1 節）。欠陥 `DFC-920`（プロンプトの「自由」の色が今のスキーマで断られる）と `DFC-921`（土台の文書がスキーマから外れている）。
> ⛔ **覆すもの**: `FR-068` の「渡す文書は `GRS JSON` そのもの」を、**面が 2 つの中身を持つ**形へ広げる（渡す文書の形は変えない —— 2 つ目の中身は交換形式ではなく依頼文である）。`docs/guides/schedule-to-grs-json/` の使い方 1〜2（ファイルを 2 つ落として添える）。
> ⭐ **形の方針**: 新しい交換形式を作らない。スキーマは 1 つ（`docs/spec/_source/grs-document.schema.json`）のまま、読む側の検証（`GRS_DOCUMENT_SCHEMA`）とプロンプトが同じ原稿から生まれる。返ってきた JSON は今ある「開く」（`OP-2`）の 1 つの入口から入る。

### 0.1 利用者の逐語（2026-09-23）

⚠️ 前に立つ者が本書の起草者へ渡した写しのまま写した。

| # | 逐語 |
|---|---|
| Q1 | 「画像認識してGRSのJSONを生成する機能も実装しろ。」 |
| Q2 | 「画像から JSONはAI向けのプロンプトをクリップボードにコピーさせればよい。GRS JSONのスキーマは他と共用できるだろ？」 |

⭐ **Q2 が Q1 の形を決めている** —— `GRS` 自身は画像を読まない。画像を読むのは利用者が選んだ AI であり、`GRS` はその AI へ渡す依頼文を写すだけである。⇒ `FR-023` の RATIONALE「画像の取り込みは範囲外なので、攻撃面はこれだけである」は偽にならない（返ってくるのは今までどおりの `GRS JSON` のファイルである）。
⭐ **Q2 の問い「スキーマは他と共用できるだろ？」への答えは「できる。既に 1 つである」** —— 読む側の検証 `GRS_DOCUMENT_SCHEMA`（`src/adapter/document-codec/json-codec.ts:714`）は `tools/generate_json_schema_validator.py` がこの原稿から刷ったものであり、ヘッダーの「AI 出力」（`FR-068`）が写す文書も同じ形である。本書は 3 つ目の読み手（プロンプト）を同じ原稿に繋ぐ。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-1`**（作図ソフトと同じ操作感で描きながら、構造化した日程データを出す）である。受ける目標は `GL-004`（成果物が構造化データである）。
作図ソフトや表計算ソフトで描かれた日程は構造を持たない。その絵を構造化データへ起こす道を、アプリの中から始められるようにする。
⚠️ **`GL-005`（1 つのファイルだけで動く）は動かさない** —— 写すのは文字列であり、送り先も通信も持たない。AI へ貼るのは利用者である。

### ② レビュー観点のどの条項を当て、何が出たか

| 条項 | 当てた結果 |
|---|---|
| `R2.17`（プロンプト工学: `src/` に置く・入出力スキーマを明示・曖昧指示なし・プロンプトテスト・版の方針・ハルシネーション対策） | ⛔ **今の案内は 4 つを欠く** —— 置き場が `docs/guides/`（製品の外）、入出力スキーマは「添付があれば」の任意、試験が無い、版はプロンプトに無い。⭐ 決定 3〜6 で 4 つとも塞ぐ。ハルシネーション対策は既に在る（出力 1 の「推定したこと」の表、`prompt-ja.md:112`） |
| `R1.3`（唯一の正） | ⛔ **スキーマの写しが 2 つある** —— 案内が添えさせる `grs-document.schema.json` と、案内の中の列の一覧（`prompt-ja.md` の 作り方 2〜9）。後者は今は各実体の `required` と一致する（2026-09-24 に体が照合した）が、原稿が変われば離れる。⭐ 決定 4 で写しをやめ、スキーマを丸ごと埋める |
| `R1.4`（異常系） | ⛔ **AI が誤った JSON を返したとき、開く路が黙る** —— `DFC-656`（`documentFromJson` が断ると通知が 0 件）と `DFC-922`（表 T-220 のうち開く路が見るのは `IV-17` だけ）。⭐ 本書の流れは AI の誤りを前提にしているので、決定 8 でこの 2 行を本書の前提に置く |
| `R2.7`（DRY） | 土台の文書（`grs-skeleton.json`）が手書きで、起動時の文書を刷る道具と別に保たれ、既に離れている（`DFC-921`）。⭐ 決定 5 で同じ道具から刷る |
| `R2.9`（YAGNI） | ⭐ 貼り付けで開く入口・AI への送信・画像の読み取りを持たない（10 節） |

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | ⭐ **プロンプトの言語は、写した瞬間の表示言語（`FR-038` の `ja` / `en`）に従う** | 表示言語は利用者が読める言語であり、「推定したこと」の表を読むのも同じ利用者である。言語を別に選ばせる入口は `FR-029` の「入口を増やさない」に反する | 英語の AI に日本語の画面から頼みたい人は、`IC-21` で表示言語を切り替えてから写す |
| 決定 2 | ⭐ **面は写す前に中身を読める形で見せる**（`FR-068` の「題と閉じる入口だけにしてはならない」を 2 つ目の中身にも当てる） | `FR-068` の RATIONALE「何を渡しているか分からないまま渡すのは…釣り合わない」はプロンプトにも当たる | 面に約 42 KB の文字が並ぶ（13 節の測り方 1）。スクロールで読む |
| 決定 3 | ⭐ **プロンプトの原稿は `docs/spec/_source/` に言語ごとに 1 つ置き、生成で `src/` へ届ける**（`display-words.json` と同じ道） | `R2.17` は製品のプロンプトを `src/` に置けと言い、この木の約束（`_source` が正、`npm run gen` が刷る。検査 21。⚠️ 起草のときは「21・22」と書いたが、22 は変更要求の作法の検査である）は原稿を `_source` に置けと言う。生成物が `src/` に在れば両方を満たす | 生成器が 1 つ増える。検査 16 と同じく、生成物を手で直してはならない |
| 決定 4 | ⭐ **スキーマは URL で指さず、プロンプトに丸ごと埋める**（最小化した `grs-document.schema.json`、22,917 バイト） | 利用者は git を使わずファイルを落とすだけである（利用者の裁定 2026-09-16）。URL は版がずれ、`$id`（`https://github.com/GoodRelax/gr-scheduler/docs/spec/_source/grs-document.schema.json`）は生のファイルを指さない。添付させると手順が 2 つ増える | 写す文字が増える（ja 42,240 バイト、en 40,639 バイト。13 節の測り方 1）。貼り付けの長さに上限を持つ AI では入りきらないことがある —— その AI の名は本書に書かない。⚠️ 埋めるスキーマは `documentSettings` を閉じている（`DFC-841`）ので、AI は同群の鍵を 1 つも欠かさず書こうとする。土台が同じ版で刷られていれば（決定 5）害は無い |
| 決定 5 | ⭐ **土台の文書（空の `GRS JSON`）は、起動時の文書を刷る道具（`tools/generate_startup_template.py`）から同じ版で刷る** | 起動時の文書の `schemaVersion` がこの造りの知る最大の版（`GREATEST_KNOWN_SCHEMA_VERSION`、`frame-loop.ts:177`）であり、土台がそれと同じなら `FR-073` の「新しい版」の告げも `OP-6` の補いも起きない。今の土台は `2026-09-14`、起動時の文書は `2026-09-17` で離れている（`DFC-921`） | 案内の `grs-skeleton.json` も生成物になり、手で直せなくなる |
| 決定 6 | ⭐ **プロンプトは自分の版として、写した造りの `schemaVersion` を 1 行持つ** | `R2.17` の版の方針。返ってきた JSON がどの造りのプロンプトから作られたかを、利用者が AI の答えと並べて読める | — |
| 決定 7 | ⭐ **返ってきた JSON は、今ある「開く」（`IC-1` とドラッグ＆ドロップ、`OP-2`）から入れる。貼り付けで開く入口は作らない** | `OP-2` が「入口は本要求の『開く』1 つとし…別の入口を設けてはならない（MUST NOT）」と定めている。開いた後は `OP-3` が「置き換える／合流する」を問うので、今の日程に足すことも選べる | 利用者は AI の答えを `〜.json` として保存する手間を 1 つ持つ |
| 決定 8 | ⭐ **本書の実装の波は、`DFC-656` と `DFC-922` が閉じてから始める** | AI の答えは誤りを含みうるのが前提である。誤った JSON を開いて何も起きない（`DFC-656`）、UID が重なった JSON が黙って開く（`DFC-922`）のままでは、利用者は何が悪いのか分からない | 本書の着地が 2 行ぶん後ろへずれる |
| 決定 9 | ⭐ **プロンプトの色の決まりを、今の保存の形に合わせる**（`CR-548` のカスタムカラー `"#rrggbb/"`） | 「自由」の `"#RRGGBB"` は `fillColor` の `pattern` に断られ（`json-codec.ts:313`）、開く路が黙る（`DFC-920`）。`CR-548` の決定 2 は「案内を 1 字も書き直さずに済む」としたが、色の名の綴りだけを数え、`#RRGGBB` の行を見ていなかった | 案内の `:34`〜`:35` を書き直す |
| 決定 10 | ⭐ **案内（`docs/guides/schedule-to-grs-json/`）は開発者向けの写しとして残し、利用者向けの使い方は「アプリの AI 出力から写す」に書き直す** | 利用者はアプリだけを持つ（利用者の裁定 2026-09-16）。案内の `:9`〜`:12`（ファイルを 2 つ落とす）と `:223`〜`:231`（Python での確かめ）は利用者には打てない | 案内のプロンプトの塊は生成物になる |
| 決定 11 | ⛔ **`GRS` は「推定したこと」の表を読まない** | 表は AI の答えの本文に在り、JSON の外である。`GRS` が読めば新しい交換形式になる（`FR-068` の MUST NOT） | 利用者は AI の画面で表を読み、`GRS` の画面と見比べる |
| 決定 12 | ⭐ **入口は AI 出力の面に中身の切替を 1 つ足す（案 A、`IC-115`）。閉じる入口 `IC-52` はいま見せている中身を写す** —— 利用者の答え（2026-09-24、`JDG-503` の「問 4. 提案通り」） | 11 節の問 1 | 面の名が「AI 出力」なので、初めは気づきにくい —— 切替の説明の語で補う |
| 決定 13 | ⭐ **面を開くたびに、中身は「渡す文書」から始める**（`IC-19` を押すと切替が戻る。4 節の J-05） | 今の `FR-068` の振る舞いと `IC-19` の行（「AI へ渡す文書を画面で確かめて写す」）が、開いた直後はそのまま真であり続ける。前回の選択を覚えると、文書を写すつもりで閉じた人が依頼文を写す | 画像から作る人は、開くたびに `IC-115` を 1 回押す |
| 決定 14 | ⭐ **`IC-115` の図形は、絵の枠から曲がった矢印が `{ }` へ向かう形とする**（4 節の E-08。新しく起こす） | 表 T-109 の前文「図形を持たない行は無い」（MUST）が、行を足す日に図形を求める。`FR-029` は図形を 図 F-019 の正とし、語で書き取らせない。既存の図形を借りると（`IC-106` が `IC-82` を借りた形）、借りた先の意味と混ざる —— 入口は「画像 → JSON」を 1 つの面の中で示したい（決定 12 の代償） | 実物と見比べて選び直す義務は 表 T-026 の `RC-13` が持つ —— 当てる者が実物で確かめ、合わなければ図形だけを替える |
| 決定 15 | ⭐ **中身の見出しの語は、辞書の新しい節 `aiExportContents`（鍵 `document` ・ `imageToGrsJsonPrompt`）に置く。節 `surfaces` には置かない** | 節 `surfaces` は面ごとに見出しを 1 つ持ち、面の名簿は 表 T-109 の `IC-52` の `面` の欄である（`tools/generate_display_words.py` の `CLOSE_SURFACE_ROW`）。1 つの面に 2 つ目の見出しを置く席が無い。名簿は要求が持つ（6.2 の MUST NOT）ので、`FR-068` が 2 つの中身を名指し、生成器が鍵を固定で持つ —— `FR-072` の見出しの `helpHeadings` と同じ形 | 生成器に固定の鍵が 2 つ増える（9 節） |
| 決定 16 | ⭐ **生成物は `src/adapter/screen-renderer/image-to-grs-json-prompt.json` の 1 本とする** | 同じ置き場の生成物 `icon-roster.json` ・ `display-words.json` に倣う。表 T-075 はユニットの表であり、生成した JSON に行を持たない（両者とも行が無い）ので、行を足さずに済む | 名を変えるときは原稿の 1 行目の道標（N-01 ・ N-02）も替える |

---

## 1. 範囲 —— 項目ごとの行き先

| 項目 | 行き先 | 覆すときの戻し方 |
|---|---|---|
| 入口（11 節の問い 1。案 A に決まった —— 決定 12） | 案 A: `FR-068` の面（`U-30` の `AI Export Modal`）に「中身の切替」の行を 表 T-109 に 1 行（`IC-115`。取りまとめ役が 2026-09-24 に予約した）。閉じる入口 `IC-52` は、いま見せている中身を写す（今の「閉じると写す」、`frame-loop.ts:4011` をそのまま広げる）。図形は 図 F-019 に 1 つ（決定 14） | 行と図形を消し、`FR-068` の 2 つ目の中身の段を消す |
| 写す中身 | `FR-068` に 1 段: 「プロンプト（表示言語の原稿）＋ 版の 1 行 ＋ スキーマ（最小化）＋ 土台の文書（最小化）」の順に連ねた 1 つの文字列（順は 5 節） | 段を消す |
| 原稿 | `docs/spec/_source/image-to-grs-json-prompt.ja.md` ・ `.en.md`（新規。役割を 1 行目に宣言する —— 検査 21）。置き場の規則を `05-07-design.md` の 6.2 に 1 段 | ファイルを消し、6.2 の段を消し、生成器を外す |
| 画面の値 | `_source/state-machines.json` の領域 `screen` に出来事 1 つ（`aiExportContentToggled`）と状態機械 1 つ（`aiExportContentStateMachine`）。⚠️ 起草のときの本表に無かった —— 保存しない画面の値は、`05-07-design.md` の 5.6（ADR-002）のとおり状態機械の原稿だけが持ち、印字は 表 T-280（領域 `screen`）である。「いま見せている中身」は画面の値なので、そこに足すほかに置き場が無い | 出来事と状態機械を消す |
| 生成 | `npm run gen` に 1 つ: 原稿 2 つ ＋ `grs-document.schema.json` ＋ 刷った土台 → `src/adapter/screen-renderer/` の下の生成物 1 つ ＋ 案内の `prompt-*.md` の塊と `grs-skeleton.json` | 生成器を外す |
| 断りの理由 | 写せなかったときは今ある `RS-15` をそのまま使う（`frame-loop.ts:4016`） | — |
| 開いたときの確かめ | 何も足さない。4.6 節の一覧が今の確かめである。欠けは `DFC-656` ・ `DFC-922` が持つ | — |

## 2. 新しい識別子

⚠️ 規則 02 の 2.5 節: **当てる直前に測り直すこと。** 下の「最大」は `ebc71984` で測った。

| 識別子 | 何か | `ebc71984` での最大 |
|---|---|---|
| `IC-115`（案 A のとき） | 表 T-109 の行: AI 出力の面の中身を「この文書」と「画像から作る」で切り替える | 取りまとめ役の予約（2026-09-24）。⚠️ `ebc71984` では最大が `IC-105`、`7dbd292d` で `CR-551` が `IC-106` を足した。`IC-107` ・ `IC-108` は `CR-561`、`IC-109`〜`IC-114` は使い勝手の変更要求のセッションが先に押さえている —— 「いまの最大の次」で採った番号は、次のコミットで失効する |
| 辞書の項 3 つ | 切替の語と説明（節 `icons` の `IC-115`）と、中身の見出し 2 つ（新しい節 `aiExportContents`、決定 15）。語は `display-words.json` だけが持つ（`FR-038`）。⚠️ 起草のときは「2 つ・節 `surfaces`」と書いたが、節 `surfaces` は面ごとに見出しを 1 つしか持てない（決定 15） | — |
| 出来事 `aiExportContentToggled` ・ 状態機械 `aiExportContentStateMachine` | 領域 `screen` の画面の値（4 節の J-04 ・ J-05）。識別子ではなく名なので、予約は要らない（`git grep` で 0 件 —— 13 節の 2） | — |
| 原稿 2 つ ＋ 生成器 1 つ | 決定 3 ・ 決定 16 | — |

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| 案内の使い方 1〜2（`prompt-ja.md:9`〜`:12`、`prompt-en.md` の同じ所）: 2 つのファイルを落として添える | 「`GRS` の AI 出力を開き、画像から作るを選び、閉じる（写る）」 |
| プロンプトの 添付（`prompt-ja.md:24`〜`:27`）: 土台とスキーマは添付 | 土台とスキーマはプロンプトの末尾に埋まっている |
| プロンプトの「自由」の色 `"#RRGGBB"`（`prompt-ja.md:35`） | `"#rrggbb/"`（`CR-548` のカスタムカラー。明るいテーマの値だけ） |
| 手で保つ `grs-skeleton.json` | 刷った土台（決定 5） |
| 案内の「できた JSON を確かめる」の Python（`prompt-ja.md:217`〜`:231`） | 開発者向けの注へ移す。利用者向けには「`GRS` で開き、告げが出たら AI にその語を渡して直させる」 |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**（`CR-553` と同じ）: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（13 節の 5 の道具が E- ・ J- の 16 件すべてで 1 回を確かめ、写しに順に当てた）。旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊である。
⚠️ `45ba1707` では、当てる 7 つのファイルはどれも LF である。当てる木が CRLF なら、`\r\n` を `\n` にしてから数え、書くときに戻すこと。
⚠️ **表 T-109 と 図 F-019 には、他の変更要求も行と図形を足す**（`CR-561` の `IC-107` ・ `IC-108`、使い勝手の変更要求の `IC-109`〜`IC-114`）。旧は `45ba1707` の木のものである —— それらが先に着いたなら、E-05〜E-07 と E-11 の「97」は当てる時点の行数で数え直し（新はその ＋1）、E-08 の升と E-09 の名は 4.2 の末尾の規則で取り直すこと。
⚠️ J-01 〜 J-05 を当てたら `json.loads` で読めることを確かめ、`npm run gen` で生成物を刷る（生成物を手で直さない）。⛔ **J-01 ・ J-03 の語は案である** —— 辞書の `$comment` が体の起こした語を禁じているので、11 節の問 2 の答えが出るまで当てない。
⚠️ N-01 ・ N-02 はファイルを新しく作る編集であり、旧を持たない。
⚠️ 当てる順: E-01 〜 E-12（E-03 は欠番）と J-01 〜 J-05 は互いに行を分け合わない（13 節の 5）。`CR-563` の旧（表 T-275 ・ `FR-032` ・ 表 T-050 ・ 表 T-016 ・ 表 T-035 ・ `UC-012` ・ 表 T-233 の `RS-61`）には 1 つも触れない。

### 4.1 要求（`01-04-requirements.md`）

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-068` の本文の後半（面と複写の段）。2 つの中身・切替・写す中身・依頼文の組み立て・読まないものを足す。前半（渡す文書は `GRS JSON` そのもの、MSPDI を渡さない）は変えない。行末の半角空白 2 つ（`  `）は旧・新の一部である。旧
```text
⭐ 面にはその文書を読める形で出すこと（MUST）。  
題と閉じる入口だけにしてはならない（MUST NOT）

⭐ 複写の入口は 表 T-109 の `IC-52` とすること（MUST）。  
新しい行を足してはならない（MUST NOT） —— **同じ機能の入口を増やさない**（`FR-029`）。  
その行は既にこの面に在る。
```
新
```text
⭐ 面は 2 つの中身を持つこと（MUST） —— 渡す文書と、画像から `GRS JSON` を作らせる依頼文（AI へのプロンプト）である。  
中身を切り替える入口は 表 T-109 の `IC-115` とし、面を開いたときは渡す文書を見せること（MUST）。  
⭐ 面には、いま見せている中身を読める形で出すこと（MUST）。  
題と閉じる入口だけにしてはならない（MUST NOT） —— 依頼文にも同じく掛かる。  
中身ごとの見出しの語は `FR-038` の辞書が持つ。

⭐ 複写の入口は 表 T-109 の `IC-52` とし、写すのはいま見せている中身とすること（MUST）。  
新しい行を足してはならない（MUST NOT） —— **同じ機能の入口を増やさない**（`FR-029`）。  
その行は既にこの面に在る。  
⚠️ `IC-115` は中身を選ぶ入口であり、写す入口ではない。

⭐ 依頼文は、写した瞬間の表示言語（`FR-038`）の原稿から作ること（MUST）。  
原稿は言語ごとに 1 つとし、置き場は `05-07-design.md` の 6.2 が定める。  
⚠️ 依頼文は画面の語ではなく、渡す中身である —— 渡す文書と同じく、`FR-038` の辞書に置かない。  
⭐ 写す依頼文は、(1) 表示言語の原稿、(2) 版の 1 行（`schemaVersion:` と 1 字の空白に、初期テンプレート（`FR-027`）の `schemaVersion` の値を続けたもの）、(3) `GRS JSON` のスキーマ（`05-07-design.md` の 6.2 が起こす `_source/grs-document.schema.json`）、(4) 土台の文書、の 4 つをこの順に空行で区切って連ねた 1 つの文字列とすること（MUST）。  
(3) と (4) は空白を除いた 1 行の JSON とし、それぞれ `json` の囲みに入れる。  
⭐ 土台の文書は、初期テンプレートと同じ版と同じ `documentSettings` を持ち、タスクを 1 つも持たない `GRS JSON` とし、初期テンプレートと同じ生成器が同じ回に起こすこと（MUST） —— 版が揃うので、返った文書を開いても `FR-073` の告げも 表 T-024a の `OP-6` の補いも起きない。  
⛔ **依頼文のために新しい交換形式を鋳てはならない（MUST NOT）** —— AI に返させるのは表 T-024 の `GRS JSON` そのものであり、返った文書は 表 T-024a の `OP-2` の「開く」1 つから入る。  
⛔ `GRS` は、AI が答えに添える「推定したこと」の表を読んではならない（MUST NOT） —— 表は JSON の外に在り、読めばそれが新しい交換形式になる。
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`FR-068` の RATIONALE。スキーマと土台を埋める理由を足す（0 節 ③ の決定 4 の導き）。旧
```text
**RATIONALE**: 何を渡しているか分からないまま渡すのは、`Agent API` を既定で公開しないという判断と釣り合わない。
```
新
```text
**RATIONALE**: 何を渡しているか分からないまま渡すのは、`Agent API` を既定で公開しないという判断と釣り合わない。  
⭐ 依頼文にスキーマと土台の文書を埋めるのは、利用者がアプリの外のファイルを落として添えずに済むようにするためである —— 添えさせると手順が 2 つ増え、URL で指すと造りと版がずれる。
```

<!-- EDIT id=E-11 file=docs/spec/01-04-requirements.md -->
`FR-086` の数えた数（検査 9 が 表 T-109 の行数と突き合わせる —— 当てた写しで赤になったので足した）。`IC-115` は透かしの入口ではないので、同じ文の「0 件」は真のまま。旧
```text
表 T-109 の 97 行・
```
新
```text
表 T-109 の 98 行・
```

<!-- EDIT id=E-12 file=docs/spec/01-04-requirements.md -->
`FR-036` のヘルプの置き場。`FR-036` は 表 T-109 の全行をヘルプに載せる（MUST）が、`IC-115` の面（`AI Export Modal`）はどの塊にも無い —— 当てた写しで `tools/generate_help_roster.py` が「no help item carries IC-115」で止まったので足した。`IC-1` の下に開いた後の面の入口を並べる形に倣う。行末の半角空白 2 つは旧・新の一部である。旧
```text
⭐ `App Header` の塊では、`IC-1` の項目の下に、開いたあとに立つ面の入口（`Open Chooser` の `IC-71` 〜 `IC-73`、`Difference Review` の `IC-95` 〜 `IC-97`）を字下げして並べること（MUST）。  
```
新
```text
⭐ `App Header` の塊では、`IC-1` の項目の下に、開いたあとに立つ面の入口（`Open Chooser` の `IC-71` 〜 `IC-73`、`Difference Review` の `IC-95` 〜 `IC-97`）を字下げして並べること（MUST）。  
同じく、`IC-19` の項目の下に、その入口が開く `AI Export Modal` の中身の切替（`IC-115`）を字下げして並べること（MUST） —— 同じ面の閉じる入口 `IC-52` は `Resource Roster` の塊に 1 度だけ載っているので、ここに重ねない。  
```

### 4.2 用語集の表 T-109 と 図 F-019（`_assets/tbl-glossary.md` ・ `_assets/fig-icons.svg`）

⚠️ 表 T-109 は手書きの原稿である（`_assets/tbl-glossary.md`。検査 21 の生成物の一覧に無い）。`src/adapter/screen-renderer/icon-roster.json` はそこから刷る生成物なので、旧は表に取る。図 F-019 も原稿である（表 T-109 の後の前文「本図は本仕様書が持つ原稿であり、生成物ではない」）。

⚠️ **E-03 は欠番**（2026-09-24 に書いて取り下げた）—— `IC-19` の行に依頼文を書き足す案だったが、行が動くと辞書の `IC-19` の語（利用者が書いた「AI へ渡す文書を画面で確かめて写す」）との組が検査 37（`check-dictionary-table-covariance.py`）で赤になり、語の読み直しと基準の書き換えが要る。決定 13 で面は渡す文書から開くので、今の行は真のまま —— 変えない。

<!-- EDIT id=E-04 file=docs/spec/_assets/tbl-glossary.md -->
`IC-52` の行の次に `IC-115` の行を足す（`IC-52` の行は変えない）。列の形は `IC-75`（同じ入口で戻す）と `IC-52` に倣う。旧
```text
| IC-52 | `Help Modal` / `AI Export Modal` / `Resource Roster` / `Export Chooser` / `Open Chooser` / `Properties Panel` | — | 開いている面とプロパティパネルを閉じる | 表 T-028 の `IN-4` | — |
```
新
```text
| IC-52 | `Help Modal` / `AI Export Modal` / `Resource Roster` / `Export Chooser` / `Open Chooser` / `Properties Panel` | — | 開いている面とプロパティパネルを閉じる | 表 T-028 の `IN-4` | — |
| IC-115 | `AI Export Modal` | — | 面の中身を、渡す文書と、画像から `GRS JSON` を作らせる依頼文とで切り替え、**同じ入口で戻す**。<br>⚠️ **写す入口ではない** —— 写すのは `IC-52` であり、写す中身はいま見せているほうである | `FR-068` | — |
```

<!-- EDIT id=E-05 file=docs/spec/_assets/tbl-glossary.md -->
8 節の前文の行数。旧
```text
**97 行ある。**
```
新
```text
**98 行ある。**
```

<!-- EDIT id=E-06 file=docs/spec/_assets/tbl-glossary.md -->
同じ前文の英名の段。旧
```text
持つと 97 個の確定名を新たに作ることになる。
```
新
```text
持つと 98 個の確定名を新たに作ることになる。
```

<!-- EDIT id=E-07 file=docs/spec/_assets/tbl-glossary.md -->
同じ前文の図形の段。旧
```text
全 97 行が 図 F-019 に図形を持つ。
```
新
```text
全 98 行が 図 F-019 に図形を持つ。
```

<!-- EDIT id=E-08 file=docs/spec/_assets/fig-icons.svg -->
`IC-115` の図形を足す（決定 14）。升は `IC-106` の次（最後の段の 6 つ目、`translate(196 364)`、名は `x="208" y="398"`）。24 × 24 の格子の上に、他の図形と同じ `class="s"`（線の太さ 2）で起こした。旧
```text
  <text class="lbl" x="172" y="398">IC-106</text>
</svg>
```
新
```text
  <text class="lbl" x="172" y="398">IC-106</text>
  <g transform="translate(196 364)">
    <rect class="s" x="2.5" y="3.5" width="10" height="8.5" rx="1.5"/>
    <path class="s" d="M4.5 10 L7 7.5 L8.8 9.3 L10.2 8 L11 8.8"/>
    <path class="s" d="M7.5 14.5 V17.5 A1.5 1.5 0 0 0 9 19 H13"/>
    <path class="s" d="M11 17 L13 19 L11 21"/>
    <path class="s" d="M17.5 12.5 Q16 12.5 16 14 V15.8 Q16 17 15 17 Q16 17 16 18.2 V20 Q16 21.5 17.5 21.5"/>
    <path class="s" d="M20 12.5 Q21.5 12.5 21.5 14 V15.8 Q21.5 17 22.5 17 Q21.5 17 21.5 18.2 V20 Q21.5 21.5 20 21.5"/>
  </g>
  <text class="lbl" x="208" y="398">IC-115</text>
</svg>
```

<!-- EDIT id=E-09 file=docs/spec/_assets/fig-icons.svg -->
図の名（1 行目）。旧
```text
aria-label="GRS icon glyphs IC-1 to IC-106 (IC-46 and IC-49 retired)"
```
新
```text
aria-label="GRS icon glyphs IC-1 to IC-106 and IC-115 (IC-46 and IC-49 retired)"
```

⚠️ **升の取り直しの規則**（`IC-107`〜`IC-114` の図形が先に着いたとき）: 升は左上から 12 列（`x` = 16 ＋ 36 × 列）、段は `y` = 12 ＋ 44 × 段、名は升の `x` ＋ 12 と `y` ＋ 34 である。E-08 の旧は `</svg>` の直前の名の行に取り直し、新の図形は次の升へ置く。12 列目（`x` = 412）の次は次の段の 1 列目であり、段が増えるときは 1 行目の `viewBox` と `height` を 44 増やす。E-09 の名は、そのとき図に在る範囲に書き直す（例: 全部が着いたなら `IC-1 to IC-115`）。

### 4.3 設計（`05-07-design.md` の 6.2）

<!-- EDIT id=E-10 file=docs/spec/05-07-design.md -->
6.2 の画面に刷る語の原稿の段の後に、依頼文の原稿の段を足す（決定 3 ・ 決定 16）。旧
```text
**語が届く先は `src/` の生成物 1 本とし（MUST）**、その素性は下の道標の規則に従う。
```
新
```text
**語が届く先は `src/` の生成物 1 本とし（MUST）**、その素性は下の道標の規則に従う。

⭐ 画像から `GRS JSON` を作らせる依頼文（`01-04-requirements.md` の `FR-068`）の原稿は、`_source/image-to-grs-json-prompt.ja.md` と `_source/image-to-grs-json-prompt.en.md` の 2 つとする（MUST） —— 言語ごとに 1 つであり、言語を足す作業は原稿を 1 つ足す記入で済む。  
⛔ 原稿に `GRS JSON` のスキーマと土台の文書を写してはならない（MUST NOT） —— どちらも生成器が原稿の後ろへ連ねる（`FR-068`）。  
写せば、スキーマの原稿（上の「起こす原稿は 2 つ」）と初期テンプレート（`FR-027`）から離れる。  
⚠️ 原稿は 1 行目で、唯一の正であることと、起こす生成物と、作り直し方を名乗る。  
その 1 行は依頼文に入れない。  
**依頼文が届く先は `src/` の生成物 1 本とし（MUST）**、その素性は下の道標の規則に従う。
```

### 4.4 原稿 JSON（`_source/display-words.json` ・ `_source/state-machines.json`）

<!-- EDIT id=J-01 file=docs/spec/_source/display-words.json -->
節 `icons` の `IC-52` の項の後ろに `IC-115` の項を足す（節の並びは 表 T-109 の印字順 —— E-04 で `IC-52` の次に置いた）。⛔ 語は案（11 節の問 2）。旧
```text
    "ja": "開いている面を閉じる。Esc でも閉じる",
    "en": "Close the open surface; Esc closes it too"
   }
  },
```
新
```text
    "ja": "開いている面を閉じる。Esc でも閉じる",
    "en": "Close the open surface; Esc closes it too"
   }
  },
  {
   "rowId": "IC-115",
   "label": {
    "ja": "画像から作る依頼文",
    "en": "Image-to-JSON Prompt"
   },
   "hint": {
    "ja": "面の中身を、渡す文書と、画像から GRS JSON を作らせる依頼文とで切り替える。もう一度押すと戻す",
    "en": "Switch between the document and the prompt that asks an AI to build GRS JSON from an image; press again to switch back"
   }
  },
```

<!-- EDIT id=J-02 file=docs/spec/_source/display-words.json -->
`$comment` の 2 つ目の文（何の語を持つか）に、中身の見出しを足す（決定 15）。旧
```text
the three headings FR-072 asks for,
```
新
```text
the three headings FR-072 asks for, the heading of each of the two contents FR-068 shows,
```

<!-- EDIT id=J-03 file=docs/spec/_source/display-words.json -->
最後の節 `dualCursorReadout` の後に、節 `aiExportContents` を足す（決定 15）。⛔ 語は案（11 節の問 2）。旧
```text
    "ja": "{y}/{m}/{d} ({n} day)",
    "en": "{y}/{m}/{d} ({n} day)"
   }
  }
 ]
}
```
新
```text
    "ja": "{y}/{m}/{d} ({n} day)",
    "en": "{y}/{m}/{d} ({n} day)"
   }
  }
 ],
 "aiExportContents": [
  {
   "content": "document",
   "heading": {
    "ja": "渡す文書（GRS JSON）",
    "en": "The Document (GRS JSON)"
   }
  },
  {
   "content": "imageToGrsJsonPrompt",
   "heading": {
    "ja": "画像から GRS JSON を作らせる依頼文",
    "en": "Prompt: GRS JSON from an Image"
   }
  }
 ]
}
```

<!-- EDIT id=J-04 file=docs/spec/_source/state-machines.json -->
領域 `screen` の出来事に、切替の押しを足す（`surfaceEntryPressed` の次）。旧
```text
    {
     "key": "surfaceRaisedByFlow",
```
新
```text
    {
     "key": "aiExportContentToggled",
     "source": {
      "kind": "input",
      "rows": [
       "IC-115"
      ]
     },
     "carries": []
    },
    {
     "key": "surfaceRaisedByFlow",
```

<!-- EDIT id=J-05 file=docs/spec/_source/state-machines.json -->
領域 `screen` の状態機械に、面の中身を足す（`openSurfaceStateMachine` の次）。`IC-115` で 2 つを行き来し、面の入口（`surfaceEntryPressed`）で渡す文書へ戻る（決定 13）。旧
```text
    {
     "name": "watermarkDisplayStateMachine",
```
新
```text
    {
     "name": "aiExportContentStateMachine",
     "states": [
      {
       "key": "document",
       "parent": null,
       "initial": true,
       "carries": [],
       "evidence": [
        "FR-068"
       ]
      },
      {
       "key": "imageToGrsJsonPrompt",
       "parent": null,
       "initial": false,
       "carries": [],
       "evidence": [
        "FR-068",
        "IC-115"
       ]
      }
     ],
     "transitions": {
      "aiExportContentToggled": {
       "document": {
        "to": "imageToGrsJsonPrompt",
        "evidence": [
         "IC-115"
        ]
       },
       "imageToGrsJsonPrompt": {
        "to": "document",
        "evidence": [
         "IC-115"
        ]
       }
      },
      "surfaceEntryPressed": {
       "imageToGrsJsonPrompt": {
        "to": "document",
        "evidence": [
         "FR-068"
        ]
       }
      }
     }
    },
    {
     "name": "watermarkDisplayStateMachine",
```

⚠️ J-04 ・ J-05 を当てたら `npm run gen` で `_assets/tbl-state-machines.md`（表 T-280 ・ 図 F-026）と `src/use-case/advance-screen-session/screen-values.ts` の生成の領域を刷る。遷移の関数（手書き）は実装の波が書く。

### 4.5 新しい原稿（`_source/`）

<!-- EDIT id=N-01 file=docs/spec/_source/image-to-grs-json-prompt.ja.md -->
新規。2 行目から後ろは、`docs/guides/schedule-to-grs-json/prompt-ja.md` の「プロンプト」の塊（`45ba1707` の `:22`〜`:124`、4 つの逆引用符の囲みの中身）を写し、次の 4 つだけを書き換える（3 節の表の 2 〜 3 行目）。1 行目（役割の宣言。検査 21 が先頭 1400 字に `SINGLE SOURCE OF TRUTH` を探す）は次のとおり。
```text
<!-- SINGLE SOURCE OF TRUTH -- EDIT THIS FILE. The Japanese prompt of FR-068 (image to GRS JSON); this first line is not part of the prompt. Generated from it: src/adapter/screen-renderer/image-to-grs-json-prompt.json and the prompt block of docs/guides/schedule-to-grs-json/prompt-ja.md. Rebuild: npm run gen -->
```

| # | 塊の中の旧（`prompt-ja.md` の行） | 新 |
|---|---|---|
| 1 | `# 添付` の 3 項のうち、`grs-skeleton.json` と `grs-document.schema.json` の 2 項（`:26`〜`:27`） | 消す。代わりに 1 項「形の正（JSON Schema 2020-12）と土台の文書: 本文の後ろの 2 つの `json` の囲み（前がスキーマ、後が土台）。スキーマに厳密に従う」。`日程の原本` の項は残す（画像は利用者が添える） |
| 2 | `休日` の項の「grs-skeleton.json の暦」（`:31`）と、作り方 1 の「grs-skeleton.json を丸ごと写し」（`:38`） | 「土台の文書の暦」 ／ 「土台の文書を丸ごと写し」 |
| 3 | 色の `自由` の項の `"#RRGGBB"`（`:35`） | `"#rrggbb/"`（`CR-548` のカスタムカラー。明るいテーマの値だけを書き、`/` の後ろは空ける） |
| 4 | （無い） | スキーマと土台は原稿に書かない —— 生成器が版の 1 行と共に後ろへ連ねる（E-01 ・ E-10） |

<!-- EDIT id=N-02 file=docs/spec/_source/image-to-grs-json-prompt.en.md -->
新規。N-01 と同じ形で、`prompt-en.md` の同じ塊（`:22`〜`:124`）を写し、同じ 4 つを英語の側で書き換える（`attached` の 2 項、`grs-skeleton.json's calendar` と `Copy grs-skeleton.json whole`、`free` の `"#RRGGBB"`）。1 行目は次のとおり。
```text
<!-- SINGLE SOURCE OF TRUTH -- EDIT THIS FILE. The English prompt of FR-068 (image to GRS JSON); this first line is not part of the prompt. Generated from it: src/adapter/screen-renderer/image-to-grs-json-prompt.json and the prompt block of docs/guides/schedule-to-grs-json/prompt-en.md. Rebuild: npm run gen -->
```

⚠️ 原稿の中身は依頼文であり、仕様の文ではない —— 特定の製品の名を書かないこと（今の塊には無い。塊の外の案内の前書きにだけ在る）。`.md` なので検査 23（`.json` だけを読む）には掛からない。

### 4.6 `GRS` が開くときに確かめること（`45ba1707` で読み直した。起草は `ebc71984`）

⭐ 利用者の流れは **写す → 画像と一緒に AI へ貼る → 返った JSON を `〜.json` で保存 → `GRS` の「開く」→ `OP-3` で置き換えるか合流するかを選ぶ → AI の「推定したこと」の表と画面を見比べる** である。開く路は次の順で確かめる。本節は編集ではない —— 何も足さない（1 節）。

| 順 | 確かめること | 場所 | 告げ |
|---|---|---|---|
| 1 | 拡張子と先頭の 1 字が合う（`IO-2`: `.json` と `{`） | `document-codec.ts:96`〜`:114` | `RS-11`〜`RS-13` |
| 2 | JSON として読める | `json-codec.ts:1490`〜`:1497` | `RS-25` の理由は作るが、⛔ **告げない**（`DFC-656`） |
| 3 | 退いた列を外す（`withoutRetiredColumns`、`:1425`）と、古い版の補い（`isKeptOpen` ・ `editGroup` ・ `sourceFormat` ・ 旧い実績の長さ） | `json-codec.ts:1352`〜`:1482` | — |
| 4 | スキーマの歩き（型・列挙・範囲・長さ・`pattern`・`required`・`additionalProperties`。`documentSettings` は型と列挙だけ） | `json-codec.ts:1280`〜`:1334`、`:1509` | 断れば 2 と同じく告げない（`DFC-656`） |
| 5 | 版の新旧（`FR-073`） | `json-codec.ts:1510`〜`:1515` | `RS-48` |
| 6 | 設定値を範囲へ収める（`clampedSettings`） | `json-codec.ts:1528`〜`:1541` | 告げる（`frame-loop.ts:3698`） |
| 7 | 大きさ・タスク数・WBS の輪と深さ・日付・開始と終了・実績の順（`FR-023`、`S-113`〜`S-115` ・ `S-119` ・ `S-120` ・ `IV-14` ・ `IV-21`） | `validate-imported-document.ts:160`〜`:310` | 読めない日付のタスクは消して名前を告げる（`frame-loop.ts:3716`〜`:3734`） |
| 8 | 稼働する曜日が 1 つ以上（`IV-17`） | `frame-loop.ts:1041` | 告げる |
| ⛔ | **表 T-220 の残りの行（`IV-1` 主キーの重なり・`IV-2` 指す先・`IV-6` どのタスクもちょうど 1 つの行に載る ほか）** | `scheduleViolations` は数えるが、開く路は `IV-17` しか読まない | ⛔ **黙って開く**（`DFC-922`）。⚠️ AI は UID を重ねやすい |

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```text
写す文字列の順: <プロンプトの原稿（表示言語）> "\n\n" <版の 1 行: "schemaVersion: " + 起動時の文書の schemaVersion>
  "\n\n```json\n" <最小化したスキーマ> "\n```\n\n```json\n" <最小化した土台> "\n```\n"
生成物の置き場: src/adapter/screen-renderer/image-to-grs-json-prompt.json（決定 16。表 T-075 に行は要らない）
生成物の中身: { ja: <原稿 ja の 2 行目から>, en: <原稿 en の 2 行目から>, schemaVersion, schema: <最小化>, emptyDocument: <最小化> }
  鍵の名は当てる者が決めてよい。⛔ 連ねた文字列を言語ごとに 2 つ持たない（スキーマと土台が 2 回入る）
面の中身の値: 状態機械 aiExportContentStateMachine の 'document' | 'imageToGrsJsonPrompt'（J-05）。IC-52 の写しはこの値で分ける
クリップボードへの書き込み: 今ある writeClipboard（clipboard-gateway.ts:17）を使う。種類は 'document'（frame-loop.ts:4011〜:4021 の枝を広げる）
```

## 6. グラフ（`45ba1707` で測り直した。起草の日は `ebc71984`）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 行 | 指している要求 / 参照 | 起草の日（`ebc71984`） |
|---|---|---|
| `FR-068` | 1 / 5（`FR-033`、2.3 ・ 5.2 ・ 5.3 の節、表 T-109 の節） | — |
| `IC-19` | 0 / 1（`tbl-state-machines.md:61` の出来事） | 0 / 1 |
| `U-30` | 1 / 2（`FR-080`、状態機械 `openSurfaceStateMachine`） | 1 / 2 |
| `IC-52` | 6 / 10（`FR-004` ・ `FR-006` ・ `FR-099` ・ `FR-070` ・ `FR-068` ・ `FR-036`） | 5 / 9（`FR-099` は `CR-551` の後に増えた） |

⭐ `IC-52` の「閉じると写す」は `FR-068` の面だけの振る舞い（`frame-loop.ts:4011`）なので、他の 5 つの要求は動かない。
⭐ **閉路は無い** —— E-01 で `FR-068` が新しく指す先（`FR-027` ・ `FR-038` ・ `FR-073` ・ 表 T-024a の `OP-2` ・ `OP-6` ・ `IC-115` ・ 6.2 の節）は、どれも `FR-068` を指していない（`FR-068` を指す 5 箇所に無い）。E-10 で 6.2 が `FR-068` を指し返すが、6.2 は節であり要求ではない —— `FR-068` の側からは置き場を読むだけで、6.2 の段の書き換えは `FR-068` の文を動かさない。
⭐ 4 節を当てた写しで測った（13 節の 5）: `IC-115` は 要求 2 件 / 参照 5 箇所（`FR-068` が 2 箇所、`FR-036`、`tbl-state-machines.md` の出来事と状態機械）。`FR-068` は 要求 1 件 / 参照 10 箇所（前の 5 ＋ 6.2 の 2 ・ 表 T-109 の節の `IC-115` の行 ・ 状態機械の 2）—— 指す要求は `FR-033` の 1 つのままで、閉路は無い。`FR-036` は E-12 で `IC-19` ・ `IC-115` を新しく指すが、どちらの行も `FR-036` を指し返さない。

## 7. 数の予測（`45ba1707` で測った。当てた後に同じ数え方で突き合わせる）

| 数 | 前 | 後 |
|---|---|---|
| 表 T-109 の行 | 97（13 節の 2） | 98（E-04）。⚠️ 他の変更要求の `IC-` が先に着けば、そのぶん前も後も増える |
| 表 T-109 の前文の「97」 | 3 箇所 | 3 箇所とも 98（E-05 〜 E-07） |
| 図 F-019 の図形 | 97 | 98（E-08） |
| 辞書の項 | — | ＋3（`icons` に 1、新しい節 `aiExportContents` に 2） |
| 領域 `screen` の状態機械 ／ 出来事 | 12 ／ 32 | 13 ／ 33 |
| `md-checks.py` の数 | `tables=187 figures=27 rows=2301 uids=162` | `rows=2302`（`IC-115` の 1 行）、他は同じ。検査 5 〜 10 ・ 15 ・ 48 は写しでも同じ数（13 節の 5） |
| `dist/index.html` | 1,308,345 バイト（`b7a3b76f` で刷った dist。`45ba1707` まで刷り直していない） | ＋約 53.1 KB（原稿 ja 13,751 ＋ en 12,150 ＋ スキーマ 22,917 ＋ 土台 5,516 ＝ 54,334 バイト）＝ 約 ＋4.2 %。⚠️ 土台は `grs-skeleton.json` の `schedule` に起動時の文書の版と `documentSettings` を組んで見積もった（13 節の 1）—— 生成器が刷る実物で数え直す |
| 写す文字列 | — | ja 42,240 バイト ／ en 40,639 バイト（5 節の順で組んで数えた） |

## 8. 波

リファクタの後に 1 波。原稿と生成器（持ち主 A）と、面と写し（持ち主 B）の 2 体。試験は仕様だけを読む別の体が書く（写した文字列にスキーマが 1 字違わず入っていること、刷った土台が `GRS_DOCUMENT_SCHEMA` を通ること、表示言語で原稿が変わること、`IC-115` で見せる中身が替わり `IC-52` がいま見せている中身を写すこと、面を開き直すと渡す文書へ戻ること）。
⚠️ 4 節の編集を当てる体（仕様だけ）は、実装の波より先に 1 つ。当てたら `npm run gen` と検査を回し、J-01 ・ J-03 は 11 節の問 2 の答えが出てから当てる。

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

`DFC-656` ・ `DFC-922`（決定 8 の前提）。

| # | 置き場 | 何を |
|---|---|---|
| X-1 | `tools/`（新しい生成器 1 つ）と `package.json` の `gen` ・ `gen:check` | 原稿 2 つ（1 行目を除く）＋ 最小化したスキーマ ＋ 刷った土台 ＋ 版を `src/adapter/screen-renderer/image-to-grs-json-prompt.json` へ（決定 16。中身の形は 5 節）。`--check` を持たせ、検査 27 に加える |
| X-2 | `tools/generate_startup_template.py` | 同じ回に、タスクを持たない土台の文書を 1 つ刷る（`FR-068`、決定 5）。⚠️ **今の道具は土台を刷らない** —— 書き出すのは 1000 タスクの起動時の文書（`startup-template.json`、最小化で 650,882 バイト）1 つだけである。「同じ道具から刷る」は道具に出力を 1 つ足す仕事である。土台もスキーマに照らしてから書く（`check_schema` と同じ道） |
| X-3 | `tools/generate_display_words.py` | 節 `aiExportContents` を固定の鍵 2 つ（`document` ・ `imageToGrsJsonPrompt`）で名簿に足し、書き出す節の並びにも足す（決定 15。`HELP_HEADINGS` と同じ形） |
| X-4 | `.claude/skills/spec-graph-check/check-provenance.py` の `ARTIFACTS` | 新しい生成物 1 本（原稿の名 `image-to-grs-json-prompt`）。道標は `$comment` の鍵で持つ（`icon-roster.json` と同じ） |
| X-5 | `docs/guides/schedule-to-grs-json/prompt-ja.md` ・ `prompt-en.md` ・ `grs-skeleton.json` | 3 節の表のとおり。プロンプトの塊と `grs-skeleton.json` は X-1 ・ X-2 の生成物になり、案内に生成物の道標を置く。使い方 1〜2 を「アプリの AI 出力を開き、`IC-115` で依頼文に切り替え、閉じて写す」に、Python の確かめ（`:217`〜`:231`）を今ある「開発者向けの注」（`:241`）へ移す。英語版も同じ所 |
| X-6 | `docs/development-rules/09-tools.md` の生成器の表 | X-1 の生成器の行を足す |
| X-7 | `tools/generate_help_roster.py` | E-12 の置き場: `IC-19` の項目の下に `AI Export Modal` の入口を字下げして並べる（今は `OPENED_UNDER = 'IC-1'` の 1 つだけを持つ —— 入口ごとに開く面を持つ形へ）。⚠️ これが無いと `npm run gen` が「no help item carries IC-115」で止まる（13 節の 5 で写しに当てて確かめた） |
| X-8 | 検査の基準 2 つ（⛔ 利用者の了承が要る —— 基準の書き換えは CI の迂回と読まれる） | 検査 37 の `dictionary-table-pairing.txt` に `IC-115` の組が新しく 1 つ（語を表と読み合わせてから `--write-baseline`）。検査 39 の `must-clause-coverage-baseline.txt` は、試験が新しい MUST を逐語で持つまで 1329 → 1340（写しで測った。新しい MUST は E-01 ・ E-10 ・ E-12 が足す） |

⚠️ **生成したスキーマは `documentSettings` を閉じている**（`additionalProperties: false` と `required`）が、`05-07-design.md:1232` は知らない鍵と欠けた鍵を拒むことを禁じ、アプリも受け入れる —— この食い違いを `CR-552` のセッションが欠陥として台帳に起こしている最中である（2026-09-24、取りまとめ役の知らせ）。⭐ 本書はそのスキーマを AI へ丸ごと渡す（決定 4）ので、AI は `documentSettings` の鍵を 1 つも欠かさず書こうとする。土台が同じ版で刷られていれば（決定 5）害は無いが、⭐ **その行は `DFC-841` として着いた**（`b7a3b76f` で確かめた）—— 決定 4 にも書き足した。

## 10. ⛔ この変更でやらないこと

- `GRS` の中で画像を読むこと（Q2）。
- AI へ送ること。送り先を持てば `GL-005` とぶつかり、利用者の日程が外へ出る。
- 貼り付けで開く入口（決定 7）。
- 「推定したこと」の表を読むこと（決定 11）。

## 11. 前に立つ者へ返す問い

| 問い | 案 | 推奨 |
|---|---|---|
| 問 1: 入口をどこに置くか（✅ 2026-09-24 に A と答えがあった —— `JDG-503`） | **A. AI 出力の面（`IC-19` で開く）に中身の切替を 1 つ足す** ／ B. ヘッダーの AI の群に 4 つ目のアイコン ／ C. コマンドパレットだけ | ⭐ **A** —— ヘッダーは幅が限られ、B はそれを 1 つ使う。C は見つけにくい。A は「AI へ渡すもの」が 1 つの面に集まり、写す入口（`IC-52`）も 1 つのまま。⚠️ 代償: 面の名が「AI 出力」なので、「画像から作る」がその中に在ると初めは気づきにくい —— 切替の説明の語で補う |
| 問 2: 辞書の語（4 節の J-01 ・ J-03。⛔ 辞書の `$comment` は体が起こした語を禁じている —— `CR-551` の問 3 と同じ扱い） | `IC-115` の語「画像から作る依頼文」／ "Image-to-JSON Prompt"、説明「面の中身を、渡す文書と、画像から GRS JSON を作らせる依頼文とで切り替える。もう一度押すと戻す」／ "Switch between the document and the prompt that asks an AI to build GRS JSON from an image; press again to switch back"。見出し「渡す文書（GRS JSON）」／ "The Document (GRS JSON)"、「画像から GRS JSON を作らせる依頼文」／ "Prompt: GRS JSON from an Image" | ⭐ 案のまま —— 説明の形は `IC-11` の「もう一度押すと戻す」／ "press again to …" に揃えた。語の中に「画像」を入れるのは、決定 12 の代償（気づきにくい）を語で補うためである |

## 12. 台帳（2026-09-24 に本書を書いた者が写した）

- 裁定: `rulings.md` の「2026-09-23 —— MCP 連携・行の削除・画像から GRS JSON（CR-562 / CR-563）」の節の `JDG-501` ・ `JDG-502`。
- 欠陥: `defects.md` の `DFC-920` ・ `DFC-921` ・ `DFC-922`。
- 裁定待ち: 台帳に行を置かない。⚠️ 問 1 は表示だけの選択（`pending-decisions.md` の分類 `C`）であり、`C` の行はコードに暫定の印を求める（検査 25）。本書は実装をリファクタの後に置くので、問 1 は本節と前に立つ者の問いだけが持つ。問 2（辞書の語、2026-09-24 に 4 節を書いた体が足した）も同じ扱いとし、行を置かない —— J-01 ・ J-03 は答えが出るまで当てない。

## 13. 測り方の再現

```bash
# 1. sizes: prompt block, minified schema, minified skeleton
python - <<'EOF'
import json, re
G = 'docs/guides/schedule-to-grs-json/'
for lang in ('ja', 'en'):
    t = open(G + 'prompt-%s.md' % lang, encoding='utf-8').read()
    print(lang, len(re.search(r'````text\n(.*?)\n````', t, re.S).group(1).encode()))
for p in ('docs/spec/_source/grs-document.schema.json', G + 'grs-skeleton.json'):
    print(p, len(json.dumps(json.load(open(p, encoding='utf-8')), separators=(',', ':'), ensure_ascii=False).encode()))
EOF
# 2. the icon rows and the AI export surface
grep -oE '\| IC-[0-9]+[a-z]? ' docs/spec/_assets/tbl-glossary.md | sort -t- -k2 -n | tail -1
grep -n 'AI_EXPORT_MODAL_SURFACE' src/framework/single-html-shell/frame-loop.ts
# 3. the open path reads only IV-17 of table T-220
grep -n 'scheduleViolations' src/framework/single-html-shell/frame-loop.ts
# 4. the free colour the prompt allows, and the pattern that refuses it
grep -n 'RRGGBB' docs/guides/schedule-to-grs-json/prompt-ja.md
#   (1-4 re-run on 45ba1707, 2026-09-24)
#   -> 1: ja 13751, en 12150, schema 22917, skeleton 5362 (ebc71984: 13876 / 12248 / 23153 / 5393)
#   -> 2: the last row is IC-106; T-109 has 97 rows (grep -oE '^\| IC-[0-9]+' ... | wc -l)
#   -> 3: frame-loop.ts:1041 is the only scheduleViolations call; 4: prompt-ja.md:35

# 1b. the empty document as decision 5 would print it, and the copied text per language
#     (estimate: skeleton's schedule + the startup template's schemaVersion, documentSettings,
#      documentStamp; the order of section 5)
#   -> empty document 5516 bytes; ja 42240 bytes, en 40639 bytes
#   -> startup template: schemaVersion 2026-09-17, 1000 tasks, 650882 bytes minified -- the
#      tool prints no empty document today (section 9, X-2)
wc -c dist/index.html          # -> 1308345 (dist of b7a3b76f; unchanged up to 45ba1707)

# 1c. the line numbers of section 4.6 and sections 1 / 5: each line cited at ebc71984 found by
#     its text at 45ba1707 (<scratchpad>/cr562-lines.py, git show <rev>:<path>)
#   -> json-codec.ts 722->714, 1291->1280, 1363->1352, 1457->1490, 1476->1509, 1477->1510,
#      1495->1528; frame-loop.ts 1032->1041, 3620->3698, 3638->3716, 3933->4011, 3938->4016;
#      document-codec.ts and validate-imported-document.ts unchanged (git diff --stat)

# 5. graph (6.1), and every old block of section 4 once in its file, applied in order to a COPY
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-068   # and IC-52 U-30 IC-19
git archive HEAD | tar -x -C <scratchpad>/copy
PYTHONIOENCODING=utf-8 python <scratchpad>/cr562-edits.py . <scratchpad>/copy
#   -> edits 16 problems 0 (E-01 E-02 E-04..E-12 J-01..J-05; E-03 withdrawn); sharing a line 0;
#      both JSON manuscripts parse with json.loads
#   on the copy (N-01 / N-02 written as line 1 + today's prompt block):
#   -> md-checks.py: only rows 2301 -> 2302 changes (E-11 exists because check 9 went red without it)
#   -> check-provenance.py OK (30 artifacts, every _source file says which it is);
#      check-language-dictionary.py OK
#   -> state_machines_json_to_md.py, generate_state_machine_types.py, generate_icon_roster.py
#      (98 icons), generate_icon_glyphs.py (98 shapes): all wrote
#   -> generate_help_roster.py: stops "no help item carries IC-115" until X-7 (E-12 exists for it);
#      with AI Export Modal added to its placed surfaces it wrote 95 items
#   -> generate_display_words.py: "aiExportContents: is not a section this generator knows"
#      until X-3; without that section it wrote 612 words
#   -> check 37 red: IC-115 is a new pairing; check 39 red: 1329 -> 1340 (X-8)
#   -> impact.py IC-115: 2 requirements / 5 references; FR-068: 1 / 10
git grep -n '\bIC-115\b\|aiExportContent\|image-to-grs-json-prompt' -- . ':!previous-project-result'
#   -> only change requests and the ledgers (rulings.md JDG-503, defects.md DFC-920)

# change-request discipline (check 22) and identifier reservation (check 62), judged by exit code
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-cr-discipline.py ; echo "exit=$?"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-identifier-reservation.py ; echo "exit=$?"
```
