# CR-628 — ヘッダーの題の左に GRS の字のロゴを置き、プロジェクト名を太字にする

> 起草の状態: 当てた（2026-10-01、枝 `spec-pass-1001`、仕様の通し。`CR-627` の後の木 `66efd17c`）。旧 11 件はどれも 1 回 —— E-02・E-10 の旧は `CR-610` が着地させた文（表 T-341 の `HS-7`・`HS-8`、`FR-101`、`S-449`）にそのまま一致したので、写し直しは要らなかった。番号: 表 `T-<新1>` → `T-349`、`S-<新1>`・`S-<新2>`・`S-<新3>`・`S-<新5>` → `S-461`・`S-462`・`S-463`・`S-464`、接頭辞 `BR`（未使用を全枝で測った）。⚠️ `S-<新4>`（リポジトリの URL）は `CR-622` が `S-459` として先に着地させていた（同書 4.1 節。`BR-4` と表 `T-<新1>` を引かずに）ので、**E-05 は当てず**、`S-459` の名と注に `BR-4` を足した（E-05a・E-05b）。本書の `S-<新4>` は全部 `S-459` と読み替えた。⚠️ 当てるときに足したもの（提案）: `BR-5` の末に、`Branding` を 表 T-109 の入口の並びに数えず、`IC-7` の注の「`App Header` の左端」は入口の並びの中の左端だとする 1 文（`CR-627` の並べ替えと合わせるため）。`S-462` の注から日付を外した（仕様に日付を持たない）。検査 11 の重なりで、`BR-4` の 2 つの MUST NOT（`FR-069`・`FR-073` と同文だった）と、`S-226`・`S-463` の注の 1 文を言い換えた（MUST の数は変えない）。生成は辞書の区 `branding`（`tools/generate_display_words.py`）だけ —— 5 節の `tools/generate_entity_types.py` の群は次の巡（`CR-625` と同じ扱い）。
> 読んだ木: `refactor` `bfbe7eb7`（枝 `l4-review-crs`）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: `CR-628` だけ。本書が新しく立てる仕様の識別子は、どれも仮の綴り（表 `T-349`、設定値 `S-461` 〜 `S-464`、行 `BR-1` 〜 `BR-6` の接頭辞 `BR`）であり、当てる回の仕様の体が番号を振る（2 節）。
> ⛔ 当てる順: `CR-610` → `CR-627` → **本書**。E-02（`FR-051` の末の 2 行）と E-10（`UF-104` の責務の升）は、`CR-610` の E-05・E-11 が書く新の文の上に書いた（4.1 節）。`CR-627`（表 T-109 の並び）とは同じ塊を持たない —— 本書のロゴは 表 T-109 に行を持たない（決定 1）。
> 閉じるもの: `DFC-1352`（`JDG-882`・`JDG-894`・`JDG-899`）と `DFC-1353`（`JDG-883`、`JDG-922` の #34）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-882` | 「#33 ヘッダー部分のタイトルの左に GRS とロゴを入れろ ロゴをクリックすると<br>https://github.com/GoodRelax/gr-scheduler<br>にジャンプさせろ。<br><br>ただし、スケジュールを.svg/.pngに出力したり、クリップボードに貼るときはロゴを消せ ※資料に貼るとき邪魔。」 | 本書の骨格。置き場は `FR-051` の新しい 表 T-349（E-02）、押した先は `S-459`（E-05）、書き出しは 表 T-076 の `EP-1`（E-03） |
| `JDG-894` | 「#33 ロゴ  : 特に絵は不要 GRS と文字で書け。 5%でグレーの縁取りを入れろ。」 | 字は辞書の 1 語（E-07）、縁の幅は `S-461` 0.05、縁の色は `S-464`（`S-148` を継ぐ）（E-04・E-06） |
| `JDG-899` | 「#33 ロゴの分を空けて位置を揃える」 | 書き出しではロゴを描かず、席を空けたまま題を画面と同じ位置に置く —— `EP-1` の「`Document Title` の位置を動かしてはならない（MUST NOT）」を保つ（E-03） |
| `JDG-883` | 「#34 ヘッダーのプロジェクト名を太字フォントにしろ。」 | `FR-039` に例外の 3 行と、太さの行 `S-463` 700（E-01・E-04） |
| `JDG-922` | 「他は、全部推奨どおり」（要約の欄: 「#34: 書き出しの絵の題も太字（画面と同じ）」、「#5: …プロジェクト名は文書の題」） | 書き出す `Document Title` も `S-463` の太さ（E-01 の 1 行目、E-03 の 3 行目）。「プロジェクト名」は `Document Title`（`U-27`）と読む |
| `JDG-602` | 「定数値の変更 : ヘッダーのプロジェクト名のフォントをヘッダーの高さに少しマージンをもって収まる程度に拡大しろ。 多分今の125%ぐらい。…」（要約: 見出しの高さは変えない —— 題の行の高さ 1.2 で 29px を保つ） | 変えない。ロゴの字は題と同じ `S-225` の大きさと同じ行の高さで置くので、帯の高さは動かない（決定 4） |
| `JDG-169` | 「問1:  ヘッダーやパレットの絶対サイズは変えるな。 今のサイズが一番操作しやすく、画面効率も良い。」 | 変えない。ロゴは `S-235` の 2/3 で描き、帯の高さを変えない（決定 4）。横に席の幅だけ題が右へ寄る（決定 6 の代償） |
| `PND-52`（裁定済、2026-09-07） | 「表 T-206 に `S-225`（字の大きさ 16px）と `S-226`（帯の左端からの余白 12px）を立てた」「字の大きさと左の余白は、画面と書き出しが同じ 1 つの行を読むこと（MUST）」 | 保つ。画面も書き出しも同じ行（`S-225`・`S-226`・`S-462`）から題の左端を求める。後の `JDG-882` が題の左にロゴを置かせたので、`S-226` は帯の左端からロゴまでの余白になる（決定 6） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4` ／ `GL-006`（すぐわか）** —— 太字の `Document Title` は、`App Header` の中で文書の名を最初に読ませる。同じ帯の `Opened File Name`（`U-58`）と取り違えるな、と `FR-101` がわざわざ言う（`01-04-requirements.md:6571`）ほど、2 つの名前は並んでいる。太さで分ければ読む前に分かる。
- **`CH-5` ／ `GL-005`（1 つのファイルだけで動く）** —— 1 つの `.html` を受け取った人が、ロゴを 1 回押せば出どころ（リポジトリ）の頁へ行ける。ヘルプの著作権表示のリンク（`DFC-1351`、`JDG-940`、兄弟の `CR-622`）と同じ先である。⚠️ ロゴの主な目的は製品の名乗りであり、`CH-` を強く前へ進めるものではない —— 正直に書くと、利用者の指示（`JDG-882`）がこの変更の理由の大半である。
- ⭐ **最優先事項 5（WYSIWYG、`FR-080`）を壊さない** —— 書き出しでロゴを消しても題の位置は画面と同じ（`JDG-899`、表 T-041 の `WY-3`）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— ① `FR-039` の「⛔ ほかの字をその太さで描いてはならない（MUST NOT）」（`01-04-requirements.md:7706`）とコードの TRAP の注「every text here stays at the normal weight」（`dom-screen-surface.ts:286-288`）は、`JDG-883` の太字と食い違う ⇒ `NT-7` の例外と同じ形で、禁止の外の 1 行を足す（E-01）。② 表 T-076 の `EP-1` は「`Document Title` の位置を動かしてはならない（MUST NOT）」「DOM を直接測って揃えてはならない（MUST NOT）」と言う。字の実寸で題を置くと、書体によって画面と書き出しで題の位置が食い違う ⇒ 題の左端を行だけから求める席の幅 `S-462` を立てた（E-02 の `BR-2`、E-03、E-04）。③ `S-245`（名称ラベルの太さ、試す値）と題の太さを 1 つの行にすると、片方を選び直したときにもう片方が動く ⇒ 別の行 `S-463`（決定 9）。④ リポジトリの URL を語やコードに書くと `FR-069` のヘルプのリンク（`CR-622`）と 2 か所に載る ⇒ 1 つの行 `S-459`（決定 3）。
- **`R1.2`（検証できる表現）** —— 「5% のグレーの縁取り」を、「字の輪郭の外へ出る幅 ＝ 字の大きさ × `S-461`、色 ＝ `S-464`、字の形を細らせない」の測れる文にした（`BR-3`）。「ロゴの分を空けて位置を揃える」を、「題の左端 ＝ 帯の左端 ＋（`S-226` ＋ `S-225` × `S-462`）× `S-235`」の測れる式にした（`BR-2`、`EP-1`）。
- **`R1.4`（境界・空の場合）** —— ① 帯が狭いとき → 席は縮めず、題の末尾が省かれる（`BR-2` の MUST NOT）。② 題が空（`title` が `null`）のとき → 画面のロゴはそのまま、書き出しは帯だけ（今のコード `image-exporter.ts:137`）。③ 並びのどの書体も無い閲覧環境 → 測った 4 つの書体で最も広い `BIZ UDPGothic` の 2.31 に縁の 0.10 を足しても 2.41 で、席 2.5 に収まる（`S-462` の注）。④ ネットワークの無い環境で押したとき → 開いたタブが読めないだけで、`GRS` の頁は動かない（`CN-6`、`BR-4`）。⑤ 未保存の編集があるとき → 頁そのものを移さないので、`FR-100` の離脱の警告も出ない（`BR-4`）。
- **`R2.7`（DRY・魔法の数）** —— 縁の比 0.05・席の比 2.5・太さ 700・URL・縁の色は、どれも設定値の行にした（2 節）。字 `GRS` は辞書の 1 語にした（`FR-038` の「画面に刷る語は…辞書として 1 か所に持つこと（MUST）」、E-07）。
- **`R2.14`（POLA）** —— ロゴを押すと新しいタブが開き、`GRS` の頁は残る。`FR-073` の案内のリンク（`S-350`）と、ヘルプの Copyright のリンク（`docs/review/apache-license-notice-2026-09-30.md` §5 (a) の「新しいタブで開く」、`JDG-940` が採った案 2）と同じ振る舞いである（決定 2）。
- **`R2.21`（1 つの仕事は 1 か所）・`R2.22`（公開の入口）** —— 題の左端の式は画面（`app-header-drawing.ts`）と書き出し（`image-exporter.ts`）の 2 か所が使う ⇒ 1 つの関数にして両方から呼ぶ（5 節）。リンクの `target`・`rel` は `notices-drawing.ts:23`・`:25` の `LINK_TARGET`・`LINK_RELATION` をそのまま使い、写さない（5 節）。
- **`R2.1`（名前）** —— UI パーツの名は既にある `Branding`（`_assets/tbl-glossary.md:117` の `U-35`）を使い、新しい名を立てない。行の接頭辞も同じ語から `BR`（`Branding`）とした（決定 12）。
- **`R6.2`（試験）** —— 8 節の波 4 に、境界（狭い帯・空の題・2 つの言語・暗いテーマ）を含む場合を並べた。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` の `JDG-` の行を `EP-1`・`FR-039`・`S-245`・`S-225`・`S-226`・`U-35`・`FR-080`・`S-148`・「ロゴ」・「太字」・「太く」・`Branding`・`GitHub`・「新しいタブ」で引いた（13 節）—— 当たって本書に関わるのは 0.1 節の 7 つと、`JDG-123`（ヘッダーとパレットは 2/3 に固定 —— ロゴも `S-235` で描く）・`JDG-427`（案内の所は押すと新しいタブで開くリンク —— 決定 2 の先例）・`JDG-940`（ヘルプの Copyright は GitHub へのリンク —— 決定 3 の相手）・`JDG-962`（1 つの行を 2 つの用途で共有した先例 —— 決定 9 で比べた）である。導いた決定と食い違う裁定は 0。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **ロゴは `Branding`（`U-35`）であり、表 T-109 の入口ではない。** 行を足さず、ツールチップ（`EZ-2`）・キーの割当（表 T-036）・押下状態と薄い描き方（`FR-029`）も持たない（`BR-5`） | `FR-029` は「各種メニューの用途を言葉ではなくアイコンで伝えること（MUST）」と言い、表 T-109 の全行が 図 F-019 の図形を持つ。ロゴは図形を持たない字のリンクである（`JDG-894`「特に絵は不要」）。ヘルプの Copyright のリンクも 表 T-109 に行を持たない。⇒ `CR-627` の 表 T-109 の並べ替えと重ならない | ポインタを乗せても説明が出ない —— 押した先は閲覧環境がリンクの先として示す |
| 決定 2 | **押すと閲覧環境の新しいタブで開き、開いた頁へこの頁の参照と参照元を渡さない**（`BR-4`） | 先例は 2 つ: `FR-073` の案内のリンク（「人が押すと、閲覧環境の新しいタブでその頁を開く」「開いた頁へ、この頁への参照と参照元を渡してはならない（MUST NOT）」、`JDG-427`）と、ヘルプの Copyright のリンク（`docs/review/apache-license-notice-2026-09-30.md` §5 (a) 行 1「新しいタブで開く」、`JDG-940` の案 2、兄弟の `CR-622` が書く）。同じタブで開くと、未保存の編集（`FR-100`）を持つ頁を離れることになる | 無い |
| 決定 3 | **リポジトリの URL を 表 T-206 の 1 行 `S-459` に置く**（`S-350` の隣、E-05）。⛔ `S-350` とは兼ねない | 所見 `docs/review/apache-license-notice-2026-09-30.md` §5 の末「リポジトリの URL は文に直書きせず、設定の表の 1 行に置くのがよい（`FR-069` と `JDG-882` のロゴのリンクが同じ値を使う）」。`S-350` は最新版を入手する頁で、同行の注は「リポジトリの頁を案内先にしない」と言う —— 用途が違う | ⚠️ `CR-622`（`FR-069` のヘルプのリンク）も同じ URL を要る。同じ行を 2 本の変更要求が書きうる ⇒ 4.1 節の継ぎ目 |
| 決定 4 | **ロゴの字の大きさは `Document Title` と同じ `S-225` × `S-235`**。大きさの行を足さない。行の高さも題と同じにする | 同じ帯に並ぶ 2 つの字の高さが揃う。`S-225` の注は「`S-235` を掛けた字が `App Header` の高さに余白を残して収まる」と言う ⇒ 同じ大きさなら帯の高さは動かない（`JDG-602`・`JDG-169` の問 1） | `S-225` を選び直すとロゴも一緒に動く |
| 決定 5 | **席の幅 `S-462` を字の大きさに対する比 2.5 とする。** 題の左端は字の実寸でなく席の右端とする（`BR-2`） | `EP-1` は書き出しに DOM を測らせない（MUST NOT）ので、字の実寸で題を置くと書き出しが同じ位置を求められない。実測（13 節）: `GRS` の幅は `Yu Gothic UI` 1.82・`Yu Gothic` 2.02・`Arial` 2.17・`BIZ UDPGothic` 2.31（字の大きさ 1 に対して）。縁の両側 0.10 を足した最大 2.41 ＜ 2.5 | 既定の書体では字と題のあいだが 0.58（7.7px）空く。隙間の大きさは利用者が選んだ値ではない（🔎）。字の実寸がもっと広い書体では、字が題に触れうる |
| 決定 6 | **`S-226` の意味を「帯の左端から `App Header` の左端の中身（`Branding`）までの余白」に移し、値 12px は変えない。** 題の左の余白は `S-226` ＋ 席の幅になる（E-04） | 利用者は題の左にロゴを置かせた（`JDG-882`）。ロゴは題がいた所に立ち、題は席の幅だけ右へ寄る。⛔ 退けた案: `S-226` の値を「12 ＋ 席の幅」へ上げ、ロゴの位置に別の行を立てる —— 導く元と導いた値の両方を行に持つことになり（`FR-029` の「その幅を px の数として…持たせてはならない（MUST NOT）」と同じ理由）、片方だけが直されて離れる | 題は既定で 33.3px 右へ寄る（(12 ＋ 20 × 2.5) × 0.6667 ＝ 41.3px。今は 8.0px）。`EP-1` の「`S-225`（字の大きさ）と `S-226`（左の余白）である」の文は、試験が逐語で持つので残し、次の行で「左の余白は `S-226` に席の幅を足した長さ」と言い足す |
| 決定 7 | **縁は字の輪郭の外へ出る幅を字の大きさ × 0.05 とし、字の塗りの下に描く**（`BR-3`）。色は `S-148`（控えめな文字の色）を継ぐ新しい行 `S-464`、字の塗りは `S-147` | 「5%でグレーの縁取り」（`JDG-894`）を、見える縁の幅と読んだ。塗りの上に描くと縁の内側の半分が字を細らせる。色の先例は `S-443`（`FR-015` の「グレー」を `S-148` で描き、新しい値を起こさない）。暗いテーマ・モノクロ（`FR-041`）でも `S-148` の対がそのまま効く | 縁の色だけを選び直すには `S-464` の `sameAs` を外す |
| 決定 8 | **ロゴの字は標準の太さとする**（`BR-1`） | 太くせよと言われたのはプロジェクト名だけである（`JDG-883`）。`FR-039` の禁止（ほかの字を太く描かない）を広げずに済む | 無い |
| 決定 9 | **題の太さは新しい行 `S-463` 700 とし、`S-245` を使い回さない。** その場で編集しているあいだの欄（`FR-035`）も同じ太さ | `JDG-883` は「太字」と言い、`S-245` の注は「700 が太字である」と言う。`S-245` は名称ラベルの「もう少し太く」（`JDG-169`）の試す値で、描いた絵を見て選び直す ⇒ 兼ねると題の太さが一緒に動く。先例は `S-235` の注「`S-236` と兼ねてはならない —— 片方だけを選び直すことがある」。⚠️ `JDG-962` は 1 つの行を 2 つの記号で共有させたが、あれは同じ意味（記号の棒の太さ）だった。欄を題と同じ太さにするのは、編集を始めたときに字の幅が跳ねないためである | 太い字は横に広がるので、狭い帯では題の末尾が早く省かれる |
| 決定 10 | **字 `GRS` を辞書（`display-words.json`）の新しい区 `branding` の 1 語 `logo` とし、ja・en とも `GRS`**（E-07） | `FR-038`「画面に刷る語は、言語ごとの辞書として 1 か所に持つこと（MUST）」「要求にも表にも語そのものを書いてはならない（MUST NOT）」。字は利用者が書いた（`JDG-894`）。`U-45` は「略称は `GRS`。日本語に訳さない」 | 生成器 `tools/generate_display_words.py` に区を 1 つ足す（9 節）。同じ回に当てないと生成が止まる（規則 02 の 3.5） |
| 決定 11 | **規則の置き場は `FR-051` の新しい 表 T-349**（新しい要求を立てない） | `FR-051` は既に `App Header` の中身の描き方（`S-235` を掛けるもの、`Document Title` の字と余白）を持つ（`01-04-requirements.md:4754`〜`:4756`）。新しい要求は UID・検証の行・由来を 1 つずつ増やす | `FR-051` の題（見出しと目盛を流さずに連動させる）とロゴの規則の距離は遠い —— `App Header` の中身の段がそこに在ることで補う |
| 決定 12 | **行の接頭辞は `BR`（`Branding`）**。`words` に `Branding` | `U-35` の確定名と同じ語にする（`R2.1` の用語一貫）。`LG`（利用者の語「ロゴ」）も考えたが、確定名と別の語になる。`BR` は、既にある `BL`・`BO`・`BT` と 2 文字目で分かれる | 当てる日に、`BR` が使われていないことを測り直す（2 節） |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| プロジェクト名を太字 | `FR-039` の太さの段（`NT-7` の行の後に 3 行） | E-01 | その 3 行 |
| ロゴを置く・掛けるもの | `FR-051` の末の段（`CR-610` の E-05 の後の文）と、新しい 表 T-349 | E-02 | 1 文と表 |
| 書き出しで席を空け、題を揃える | 表 T-076 の `EP-1` の升の末に 3 行 | E-03 | その 3 行 |
| 大きさ・席・縁の比・題の太さ | `docs/spec/_source/settings.json` の `S-225`・`S-226` の注と `S-226` の名、新しい `S-461`・`S-462`・`S-463` | E-04 | その 5 項 |
| リポジトリの URL | 同原稿の新しい `S-459`（`S-350` の次） | E-05 | その 1 項 |
| 縁の色 | 同原稿の 表 T-236 の新しい `S-464`（`S-443` の次） | E-06 | その 1 項 |
| 字 `GRS` | `docs/spec/_source/display-words.json` の新しい区 `branding` | E-07 | その区 |
| 接頭辞 `BR` | `docs/spec/_source/row-id-prefixes.json` | E-08 | その 1 項 |
| `U-35` の説明 | `docs/spec/_assets/tbl-glossary.md` の 表 T-103 の `U-35`（手書き） | E-09 | その 1 行 |
| 描くユニットの責務 | `docs/spec/05-07-design.md` の `UF-104`（`CR-610` の E-11 の後の文）と `UF-62` | E-10・E-11 | その 2 升 |

⭐ 生成物 `docs/spec/_assets/tbl-settings.md`（表 T-206・表 T-236）・`docs/spec/_assets/tbl-row-id-prefixes.md`・`src/adapter/screen-renderer/display-words.json`・`src/**` の生成区画は `npm run gen` だけが書く。⛔ 手で書かない。

**数**: 文の編集 5（`01-04-requirements.md` が 3、`05-07-design.md` が 2）＋ 手書きの表 1（`tbl-glossary.md`）。原稿 JSON の編集 5（`settings.json` 3・`display-words.json` 1・`row-id-prefixes.json` 1）。

## 2. 新しい識別子

⛔ **どれも仮の綴りである。** 番号は、本書を当てる回の仕様の体が、当てる日の木で振る（規則 02 の 2.5）。本書は今の木の番号の状況について何も主張しない。当てるときは下の綴りを機械で置き換えること。

| 仮の綴り | 何か | 置き場 |
|---|---|---|
| 表 `T-349` | `App Header` の `Branding` | `01-04-requirements.md` の `FR-051`（E-02） |
| 行 `BR-1` 〜 `BR-6`（接頭辞 `BR`、`words` は `Branding`） | 表 T-349 の 6 行 | 同上。接頭辞は `row-id-prefixes.json`（E-08）。⚠️ 当てる日に `git grep -n "\bBR-[0-9]"` が 0 件であることを測り直す |
| `S-461` | `Branding` の縁の幅の、字の大きさに対する比（0.05） | 表 T-206（`settings.json` の `S-226` の次） |
| `S-462` | `Branding` の席の幅の、字の大きさに対する比（2.5 🔎） | 同上 |
| `S-463` | `Document Title` の字の太さ（700） | 同上 |
| `S-459` | 本ソフトウェアのリポジトリの URL | 表 T-206（`S-350` の次） |
| `S-464` | `Branding` の縁の色（`S-148` を継ぐ） | 表 T-236（`S-443` の次） |
| 辞書の区 `branding` の語 `logo` | 字 `GRS`（ja・en） | `display-words.json`（`fileStatus` の次） |

⚠️ `CR-610` が同じ回に `S-449` を取る。本書の `S-461` 〜 `S-464` は、`CR-610` の後に振ること。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bfbe7eb7`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `S-226` の名「`Document Title` の、帯の左端からの余白」 | `docs/spec/_source/settings.json:3371` | 「`App Header` の左端の中身（`Branding`）の、帯の左端からの余白」 | E-04 |
| 「題の左の余白 ＝ `S-226`」という読み（書いた文は無い。`EP-1` の「`S-226`（左の余白）」の読み） | `01-04-requirements.md:6328` | 「左の余白は、`S-226` に席の幅を足した長さ」（`EP-1` の新しい 1 行、`BR-2`） | E-03・E-02 |
| コードの TRAP の注「every text here stays at the normal weight, the h2 heading included; S-245 is the OC-1 name labels' alone, and NT-7's answer initial is the one bold.」（⛔ 本書は直さない） | `src/framework/dom-screen-surface/dom-screen-surface.ts:286-288` | `Document Title` は `S-463`（`FR-039` の新しい 3 行） | 9 節 |
| 書き出しの題の `x` ＝ `S-226` × `S-235` × 比（⛔ 同） | `src/adapter/image-exporter/image-exporter.ts:141` | （`S-226` ＋ `S-225` × `S-462`）× `S-235` × 比 | 9 節 |
| 試験の「the inset drawn is S-226」（⛔ 同） | `tests/contract/dfc-355-the-four-rulings-of-2026-09-07.test.ts:577-593` | 上の式 | 9 節 |

⭐ **消さないもの**（読み直して真のまま）: `FR-039` の「⭐ 表 T-012 の形状の名称ラベル…だけを…`S-245` の太さで描くこと（MUST）」と「⛔ ほかの字をその太さで描いてはならない（MUST NOT）」（`tests/unit/cr-419-names-draw-heavier-and-every-text-shares-one-typeface-list.test.ts:39-42` が逐語で持つ）。`EP-1` の既にある文のすべて（`tests/contract/dfc-355-the-four-rulings-of-2026-09-07.test.ts:186-217` が逐語で持つ。`tools/generate_entity_types.py:2864` の注も「字の大きさと左の余白は、画面と書き出しが同じ 1 つの行を読むこと」を引く）。`S-226` の注の文（`dfc-355` の `:596` の注が「題の置き方を決める値ではない」を引く —— 検査 42）。`FR-080` の「描かない UI パーツは、その場所を空白として残すこと（MUST）」（ロゴの席はこれで空く）。

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（改行は LF に揃えて数える）。E-02・E-10 の旧は `CR-610` の新の文であり、`CR-610` を当てた後の木でだけ 1 回現れる（4.1 節）。
⚠️ 見出しに `partial` と書いたものは行の一部の置き換えである。塊の末の改行を旧にも新にも含めない。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-039` の太さの段の末（`NT-7` の行）。旧
```text
⚠️ 確認の答えの頭 1 文字を太字にする 表 T-037 の `NT-7` の規則は、この禁止の外である —— 打鍵で答えられることをボタンに名乗らせる印であり、名前を目立たせるための太さではない。  
```
新
```text
⚠️ 確認の答えの頭 1 文字を太字にする 表 T-037 の `NT-7` の規則は、この禁止の外である —— 打鍵で答えられることをボタンに名乗らせる印であり、名前を目立たせるための太さではない。  
⭐ `App Header` の `Document Title`（`_assets/tbl-glossary.md` の `U-27`）は、同書の 表 T-206 の `S-463` の太さで描くこと（MUST） —— その場で編集しているあいだの欄（`FR-035`）も、書き出す絵の題（表 T-076 の `EP-1`）も同じ太さとする。  
⭐ 利用者が、ヘッダーのプロジェクト名を太字にし、書き出しの絵の題も画面と同じ太字とするよう定めた —— 文書の名を、帯のほかの字（`Branding`・ファイルの状態・言語の略号）より先に読ませる。  
⚠️ これも上の禁止の外である —— 太さの行は `S-245` と別であり、名称ラベルの太さを選び直しても `Document Title` の太さは動かない。  
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md base=CR-610 -->
`FR-051` の末の 2 行（`CR-610` の E-05 が書いた新の文）。旧
```text
⭐ 掛けるのは、入口の図形の箱と隙間（`FR-029` がどの面にも掛ける）と、`Document Title` の字の大きさと左の余白（同表の `S-225` / `S-226`、規則は 表 T-076 の `EP-1`）と、ファイルの状態の 2 段の字（宿主の地の文字に `S-235` を掛けてから、段ごとの係数を掛ける —— 係数は `FR-101` の 表 T-341 の `HS-7`）である。  
⚠️ 帯の高さは、中身から環境で確定させる値のままであり（上の段）、`S-116` はその上限のままである —— ファイルの状態の 2 段はその中身に数えない（表 T-341 の `HS-8`）。
```
新
```text
⭐ 掛けるのは、入口の図形の箱と隙間（`FR-029` がどの面にも掛ける）と、`Document Title` の字の大きさと左の余白（同表の `S-225` / `S-226`、規則は 表 T-076 の `EP-1`）と、`Branding`（`U-35`）の字と席（下の 表 T-349）と、ファイルの状態の 2 段の字（宿主の地の文字に `S-235` を掛けてから、段ごとの係数を掛ける —— 係数は `FR-101` の 表 T-341 の `HS-7`）である。  
⚠️ 帯の高さは、中身から環境で確定させる値のままであり（上の段）、`S-116` はその上限のままである —— ファイルの状態の 2 段はその中身に数えない（表 T-341 の `HS-8`）。  
⭐ `App Header` の左端、`Document Title` の左に `Branding` を置き、表 T-349 に従うこと（MUST） —— 利用者が、題の左に `GRS` の字を置き、押せばリポジトリへ移れるようにと定めた。  
⚠️ `Branding` の字は `Document Title` と同じ大きさなので、帯の高さを変えない。

**表 T-349 — `App Header` の `Branding`**

| 行 ID | 事項 | 規則 |
| --- | --- | --- |
| BR-1 | 字 | 製品の略称（`_assets/tbl-glossary.md` の `U-45`）の字を 1 つ置くこと（MUST） —— 利用者が「特に絵は不要 GRS と文字で書け」と定めた。<br>⛔ 絵や図形を置いてはならない（MUST NOT）。<br>字そのものは `FR-038` の辞書が持つ —— `U-45` は訳さないので、2 つの言語で同じ字である。<br>字の大きさは `Document Title` と同じとすること（MUST） —— `_assets/tbl-settings.md` の 表 T-206 の `S-225` に `S-235` を掛けた値であり、同じ帯に並ぶ 2 つの字の高さが揃う。<br>太さは標準とし、色は同書の 表 T-236 の `S-147` とすること（MUST） —— 太く描くのは `Document Title` だけである（`FR-039`）。 |
| BR-2 | 席 | 帯の左端から、同書の 表 T-206 の `S-226` に `S-235` を掛けた長さだけ右を左端とし、幅が `S-225` × 同表の `S-462` × `S-235` の席を取ること（MUST）。<br>字は、左の縁（`BR-3`）が席の左端に接するように置き、縦は `Document Title` と同じく帯の縦の中央に置くこと（MUST）。<br>⭐ `Document Title` の左端は、席の右端とすること（MUST） —— 題の左の余白は `S-226` に席の幅を足した長さであり、表 T-076 の `EP-1` が書き出しでも同じ行から題を置く。<br>⛔ 字の実寸を測って題を置いてはならない（MUST NOT） —— 書き出しは画面を測らない（`EP-1`）ので、実寸で置くと、書体によって画面と書き出しで題の位置が食い違う。<br>⛔ 帯が狭いときも、席を縮めてはならない（MUST NOT） —— 省かれるのは `Document Title` の末尾である。 |
| BR-3 | 縁 | 字の輪郭の外側に、字の大きさに同書の 表 T-206 の `S-461` を掛けた幅の縁を、同書の 表 T-236 の `S-464` の色で描くこと（MUST） —— 利用者が「5%でグレーの縁取りを入れろ」と定めた。<br>⛔ 縁で字の形を細らせてはならない（MUST NOT） —— 縁は字の塗りの下に描き、字の内側へ入れない。 |
| BR-4 | 押したとき | 押したら、閲覧環境の新しいタブで、同書の 表 T-206 の `S-459` の頁を開くこと（MUST） —— 利用者が、押せば本ソフトウェアのリポジトリの頁へ移るよう定めた。<br>⛔ 同じタブで開いてはならない（MUST NOT） —— 未保存の編集（`FR-100`）を抱えたまま、日程を開いている頁が消える。<br>⛔ 移った先へ、`GRS` の頁の参照と参照元を知らせてはならない（MUST NOT） —— 理由と、押して頁を開くことが 表 T-003 の `CN-6` の通信でないことは `FR-073` の案内のリンクが持ち、ヘルプの著作権表示（`FR-069`）も同じ扱いである。<br>ポインタが乗っているあいだの形は指（`FR-106` の 表 T-269 の `PK-7`）とする。 |
| BR-5 | 入口の名簿との関係 | `_assets/tbl-glossary.md` の 表 T-109 に行を持たない —— `FR-029` の入口は用途を図形で伝えるものであり、`Branding` は図形を持たない字のリンクである。<br>⇒ ツールチップ（`FR-092` の `EZ-2`）も、キーの割当（表 T-036）も持たず、`FR-029` の押下状態と薄い描き方も当たらない。<br>⚠️ 押した先は、閲覧環境がリンクの先として示す。<br>⚠️ `Branding` は入口の並び（表 T-109 の行の順）に数えない —— 同表の `IC-7` の注が言う「`App Header` の左端」は入口の並びの中の左端であり、`Branding` と `Document Title` はその並びの外に在る。 |
| BR-6 | 書き出し | 書き出す絵とクリップボードへ写す絵での扱いは、表 T-076 の `EP-1` に従うこと（MUST） —— 描かず、席を空白のまま残し、`Document Title` を画面と同じ位置に置く。 |
```
⭐ 表の後は、そのまま `FR-051` の **Relations** に続く（`CR-610` の後の木で、旧の 2 行の次の行は空行、その次が `**Relations**:` である）。

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md partial -->
表 T-076 の `EP-1` の升の末。旧
```text
測らずに同じ高さへ揃えるにはベースラインの補正が要る。<br> |
```
新
```text
測らずに同じ高さへ揃えるにはベースラインの補正が要る。<br>⭐ `Document Title` の左の余白は、`S-226` に `Branding`（`U-35`）の席の幅を足した長さである —— 席の幅は `FR-051` の 表 T-349 の `BR-2` が `S-225` と同書の 表 T-206 の `S-462` から決め、画面も書き出しも同じ行を読む。<br>⭐ `Branding` は描かず、その席を本要求の前段のとおり空白のまま残す —— 利用者が「スケジュールを.svg/.pngに出力したり、クリップボードに貼るときはロゴを消せ ※資料に貼るとき邪魔。」と定め、「ロゴの分を空けて位置を揃える」とした。<br>⭐ 書き出す `Document Title` の太さは画面と同じであり、規則は `FR-039` が持つ。<br> |
```

<!-- EDIT id=E-04 file=docs/spec/_source/settings.json -->
`S-225` と `S-226` を書き直し、`S-226` の次に 3 項を足す。旧
```text
     "id": "S-225",
     "value": {
      "ja": "`Document Title`（`U-27`）の字の大きさ"
     },
     "default": {
      "num": "20",
      "suffix": "px"
     },
     "note": {
      "ja": "**画面と書き出しの両方が本行を読むこと**。規則は 表 T-076 の `EP-1` が持つ（画面と書き出しが本行を読むこと、書き出し専用の定数を持たないこと）。⭐ **値は利用者が「今の約 125%」と指定した値である**（2026-09-26）—— 以前の 16px（出荷ビルド 1920×1080 の実測）の 1.25 倍であり、`S-235` を掛けた字が `App Header` の高さに余白を残して収まる。⛔ 書き出しは帯の高さに比例させて字を描いてはならない（MUST NOT）—— 帯の高さ × 0.4 では 14.8px となり、画面より 7.5% 小さい"
     }
    },
    {
     "id": "S-226",
     "value": {
      "ja": "`Document Title` の、帯の左端からの余白"
     },
     "default": {
      "num": "12",
      "suffix": "px"
     },
     "note": {
      "ja": "同上。⭐ **`S-225` と対である** —— 字の大きさだけを揃えても、左の余白が違えば位置は揃わない。⚠️ 帯の高さ × 0.5 を左の余白にすると 18.5px となり、画面より 6.5px 右へずれる （出荷ビルド 1920×1080 の実測）。⭐ 帯の高さに比例しないのは、帯の高さが `FR-051` の測る値であり、題の置き方を決める値ではないからである。規則は 表 T-076 の `EP-1` が持つ"
     }
    },
```
新
```text
     "id": "S-225",
     "value": {
      "ja": "`Document Title`（`U-27`）の字の大きさ"
     },
     "default": {
      "num": "20",
      "suffix": "px"
     },
     "note": {
      "ja": "**画面と書き出しの両方が本行を読むこと**。規則は 表 T-076 の `EP-1` が持つ（画面と書き出しが本行を読むこと、書き出し専用の定数を持たないこと）。⭐ **値は利用者が「今の約 125%」と指定した値である**（2026-09-26）—— 以前の 16px（出荷ビルド 1920×1080 の実測）の 1.25 倍であり、`S-235` を掛けた字が `App Header` の高さに余白を残して収まる。⛔ 書き出しは帯の高さに比例させて字を描いてはならない（MUST NOT）—— 帯の高さ × 0.4 では 14.8px となり、画面より 7.5% 小さい。⭐ `Branding`（`U-35`）の字も本行の大きさで描く（`FR-051` の 表 T-349 の `BR-1`）—— 同じ帯に並ぶ 2 つの字の高さが揃い、帯の高さを変えない。⭐ `Branding` の席の幅（`S-462`）と縁の幅（`S-461`）も、本行に `S-235` を掛けた字の大きさに掛ける"
     }
    },
    {
     "id": "S-226",
     "value": {
      "ja": "`App Header` の左端の中身（`Branding`、`U-35`）の、帯の左端からの余白"
     },
     "default": {
      "num": "12",
      "suffix": "px"
     },
     "note": {
      "ja": "同上。⭐ **`S-225` と対である** —— 字の大きさだけを揃えても、左の余白が違えば位置は揃わない。⚠️ 帯の高さ × 0.5 を左の余白にすると 18.5px となり、画面より 6.5px 右へずれる （出荷ビルド 1920×1080 の実測）。⭐ 帯の高さに比例しないのは、帯の高さが `FR-051` の測る値であり、題の置き方を決める値ではないからである。規則は 表 T-076 の `EP-1` が持つ。⭐ **`Document Title` の左の余白は、本行に `Branding` の席の幅（`S-225` × `S-462`）を足した長さである**（`FR-051` の 表 T-349 の `BR-2`）—— 利用者が題の左に `GRS` の字を置かせたので、題がいた所に `Branding` が立ち、題は席の幅だけ右へ寄る。⛔ 題の左の余白を別の行として持たない —— 持てば、本行か席の幅を直したときに、その行だけが古い値のまま残る"
     }
    },
    {
     "id": "S-461",
     "value": {
      "ja": "`Branding`（`U-35`）の字の縁の幅の、字の大きさに対する比（`FR-051` の 表 T-349 の `BR-3`）"
     },
     "default": {
      "num": "0.05"
     },
     "note": {
      "ja": "⭐ **利用者が「5%でグレーの縁取りを入れろ」と定めた値である。** ⭐ 字の輪郭から外へ出る幅であり、縁は字の塗りの下に描くので、字の形を細らせない（`BR-3`）。⭐ 掛ける相手は字の大きさ（`S-225` × `S-235`）である —— 既定で 13.33px × 0.05 ＝ 0.67px。⛔ px で持たない —— 字の大きさを選び直しても 5% のままにするためである。保存しないのは、製品の名乗りの描き方であって文書の内容ではないからである"
     }
    },
    {
     "id": "S-462",
     "value": {
      "ja": "`Branding` の席の幅の、字の大きさに対する比（`FR-051` の 表 T-349 の `BR-2`）"
     },
     "default": {
      "num": "2.5",
      "mark": "🔎"
     },
     "note": {
      "ja": "⭐ 席は `GRS` の字とその両側の縁と、`Document Title` までの隙間を含む。⭐ `Document Title` の左の余白は `S-226` に本行 × `S-225` を足した長さであり、画面も書き出しも同じ式で題を置く（表 T-076 の `EP-1`）—— 字の実寸で題を置くと、書き出しは画面を測れない（同行の MUST NOT）ので、書体によって題の位置が食い違う。⚠️ 実測（Chromium 151、字の大きさ 1 に対する `GRS` の幅、太さ 400）: `Yu Gothic UI` 1.82、`Yu Gothic` 2.02、`Arial` 2.17、`BIZ UDPGothic` 2.31 —— 両側の縁（`S-461` × 2 ＝ 0.10）を足しても最大 2.41 であり、本値はこの 4 つのどれでも字を席に収める。既定の書体（`Yu Gothic UI`）では、字と題のあいだが 0.58（既定で 7.7px）空く。⛔ **隙間の大きさは利用者が選んだ値ではない** （🔎）。保存しない理由は `S-461` と同じである"
     }
    },
    {
     "id": "S-463",
     "value": {
      "ja": "`Document Title`（`U-27`）の字の太さ（`FR-039`）"
     },
     "default": {
      "num": "700"
     },
     "note": {
      "ja": "⭐ **利用者が太字と定めた値である**（規則と由来は `FR-039`）—— CSS の `font-weight` の 700 が太字である（`S-245` の注）。⭐ 画面と書き出しの両方が本行を読むこと（表 T-076 の `EP-1`、`S-225` と同じ）。その場で編集しているあいだの欄（`FR-035`）も本行で描く。⛔ **`S-245` と兼ねてはならない** —— あちらは名称ラベルを少し太くする試す値であり、描いた絵を見て選び直すので、兼ねると題の太さが一緒に動く。⚠️ 太い字は横に広がるので、狭い `App Header` では題の末尾が早く省かれる。保存しない理由は `S-245` と同じである"
     }
    },
```

<!-- EDIT id=E-05 file=docs/spec/_source/settings.json -->
⛔ **当てなかった**（2026-10-01）—— `CR-622` が同じ行を `S-459` として先に着地させていた。代わりに下の E-05a・E-05b で、`S-459` の名と注に `BR-4` を足した。
`S-350` の次、`S-360` の前に 1 項を足す（`S-350` の項そのものは `CR-620` が書き換えるので旧に含めない）。旧
```text
    {
     "id": "S-360",
```
新
```text
    {
     "id": "S-459",
     "value": {
      "ja": "本ソフトウェアのリポジトリの URL（`FR-051` の 表 T-349 の `BR-4`）"
     },
     "default": {
      "ja": "`https://github.com/GoodRelax/gr-scheduler`"
     },
     "note": {
      "ja": "⭐ 利用者が指定した所である —— `Branding` を押すと、閲覧環境の新しいタブでこの頁を開く（`BR-4`）。⛔ 語・コード・試験にこの URL を書き写さない（`S-350` と同じ理由 —— 所が変わったときに直すのを 1 か所にする）。⛔ **`S-350` と兼ねてはならない** —— あちらは最新版を入手する頁であり、同行の注はリポジトリの頁を入手の案内先にしないと言う。保存しないのは、所が製品のものであって文書の内容ではないからである"
     }
    },
    {
     "id": "S-360",
```

<!-- EDIT id=E-05a file=docs/spec/_source/settings.json partial -->
`S-459` の名（`CR-622` が書いた）に `BR-4` を足す。旧
```text
"ja": "本ソフトウェアのリポジトリの URL（`FR-069`）"
```
新
```text
"ja": "本ソフトウェアのリポジトリの URL（`FR-069`、`FR-051` の 表 T-349 の `BR-4`）"
```

<!-- EDIT id=E-05b file=docs/spec/_source/settings.json partial -->
`S-459` の注の頭（`CR-622` が書いた）。旧
```text
"ja": "⭐ 利用者が指定した所である —— ヘルプの著作権表示を押すと、閲覧環境の新しいタブでこの頁を開く（`FR-069`）。
```
新
```text
"ja": "⭐ 利用者が指定した所である —— ヘルプの著作権表示（`FR-069`）と `App Header` の `Branding`（`FR-051` の 表 T-349 の `BR-4`）を押すと、閲覧環境の新しいタブでこの頁を開く。
```

<!-- EDIT id=E-06 file=docs/spec/_source/settings.json -->
表 T-236 の `S-443` の次、`S-163` の前に 1 項を足す。旧
```text
    {
     "id": "S-163",
```
新
```text
    {
     "id": "S-464",
     "name": {
      "ja": "`Branding` の字の縁の色（`FR-051` の 表 T-349 の `BR-3`）"
     },
     "light": {
      "sameAs": "S-148"
     },
     "dark": {
      "sameAs": "S-148"
     },
     "hue": {
      "ja": "—"
     },
     "note": {
      "ja": "⭐ **控えめな文字の色（`S-148`）を継ぐ** —— 利用者の「グレーの縁取り」を、本表が副次のものに持つ中立の灰で描き、新しい値を起こさない（`S-443` と同じ）。⛔ テーマの色相に追随させない（`FR-041`）—— 色相を帯びると灰でなくなる。⭐ 字の塗りは `S-147`（主たる文字）のままである（`BR-1`）—— 縁は字の外側だけに出る（`BR-3`）"
     }
    },
    {
     "id": "S-163",
```

<!-- EDIT id=E-07 file=docs/spec/_source/display-words.json -->
区 `fileStatus` の次に区 `branding` を足す。旧
```text
 "fileStatus": [
  {
   "state": "neverSaved",
   "text": {
    "ja": "ファイル未保存",
    "en": "Not saved to a file"
   }
  }
 ],
```
新
```text
 "fileStatus": [
  {
   "state": "neverSaved",
   "text": {
    "ja": "ファイル未保存",
    "en": "Not saved to a file"
   }
  }
 ],
 "branding": [
  {
   "part": "logo",
   "text": {
    "ja": "GRS",
    "en": "GRS"
   }
  }
 ],
```
⭐ 字は利用者が書いた（`JDG-894`「GRS と文字で書け」）—— 同ファイルの `$comment`「EVERY ENTRY IS WRITTEN BY THE USER」に当たる。生成器が区を知らないと生成が止まるので、`tools/generate_display_words.py` の直し（9 節）と同じ回に当てる。

<!-- EDIT id=E-08 file=docs/spec/_source/row-id-prefixes.json -->
`BO` の次、`BT` の前（接頭辞の字の順）。旧
```text
  {
   "prefix": "BT",
```
新
```text
  {
   "prefix": "BR",
   "words": "Branding",
   "owner": "spec",
   "means": {
    "ja": "`App Header` の左端の `Branding`（製品の略称の字）の置き方・縁・押したときの行"
   }
  },
  {
   "prefix": "BT",
```

<!-- EDIT id=E-09 file=docs/spec/_assets/tbl-glossary.md -->
旧
```text
| U-35 | `Header Commands` / `Branding` | （同上） |
```
新
```text
| U-35 | `Header Commands` / `Branding` | （同上）。<br>`Branding` は `App Header` の左端に置く製品の略称の字であり、規則は `01-04-requirements.md` の `FR-051` の 表 T-349 が持つ |
```

<!-- EDIT id=E-10 file=docs/spec/05-07-design.md partial base=CR-610 -->
`UF-104` の責務の升（`CR-610` の E-11 が書いた新の文）。旧
```text
`App Header` の中身 —— 文書名・ファイルの名と保存の時刻と大きさ・ヘッダの入口 —— を描く（`U-31`）。<br>名前を時刻の上に置き（`FR-101`）、
```
新
```text
`App Header` の中身 —— `Branding`・文書名・ファイルの名と保存の時刻と大きさ・ヘッダの入口 —— を描く（`U-31`）。<br>`Branding` を文書名の左の席に押せる字として置き（`FR-051` の 表 T-349）、文書名を `FR-039` の太さで描き、名前を時刻の上に置き（`FR-101`）、
```

<!-- EDIT id=E-11 file=docs/spec/05-07-design.md partial -->
`UF-62` の責務の升の頭（`CR-610` の E-10 が書き換えるのは同じ升の「本ユニットは 2 つの値を運ぶだけであり」で、本書の旧と重ならない）。旧
```text
| `pure` | `Document Title`（`FR-035`）・`Opened File Name` と `File Saved At`（`FR-101`）・
```
新
```text
| `pure` | `Branding` の字と押した先の所（`FR-051` の 表 T-349）・`Document Title`（`FR-035`）・`Opened File Name` と `File Saved At`（`FR-101`）・
```

当てた後に打つもの: `npm run gen` → `npm run gen:check` → `bash .claude/skills/spec-graph-check/check.sh`（⚠️ 検査 39 は、波 4 の試験が新しい MUST を逐語で持つまで赤になりうる —— 8 節）。

### 4.1 重なり

`change-request/CR-603` 〜 `CR-620` の頭の 10 行を読み、本書が触る識別子（`EP-1`・`FR-039`・`S-245`・`S-225`・`S-226`・`U-35`・`Branding`・`UF-104`・`UF-62`・`S-443`・`S-350`・`FR-051`・接頭辞 `BT`）で全文を引いた（13 節）。

| 相手 | 重なる所 | 先に当たる方 | 数え直す側 |
|---|---|---|---|
| `CR-610`（起草） | ⚠️ **E-02**: `FR-051` の末の 2 行は `CR-610` の E-05 が書き換える。本書の旧は `CR-610` の新そのもの ⇒ 同書の後でなければ 0 回。**E-10**: `UF-104` の升の頭は `CR-610` の E-11 が書き換える。同じく同書の新の上に書いた。**E-11**: `UF-62` の同じ升を `CR-610` の E-10 が書くが、書く所（「2 つの値を運ぶだけ」）は本書の旧と重ならない。表 T-341・`HS-7`・`HS-8`・`S-449` は `CR-610` の仮の番号のまま写した | `CR-610` | 本書。当てる前に、`CR-610` を当てた木で E-02・E-10・E-11 の旧を数え直す（13 節の写しの上ではどれも 1 回）。`CR-610` の表の番号が動いたら、E-02 の旧・新の `T-341` を同じ番号へ置き換える |
| `CR-627`（兄弟。起草中の草案が作業木に在ったので読んだ） | 表 T-109 の並びと 図 F-019。本書は 表 T-109 に行を足さない（決定 1）ので、同じ塊を持たない。⚠️ 同書の E-16 は同じ `FR-039` の表示の倍率の入口の置き場の 1 文（`01-04-requirements.md:7720`）を書き換える —— 本書の E-01 の旧（`:7707` の `NT-7` の行）とは別の行であり、閉路（`FR-039` を含む）は両書とも 1 度に当てる | `CR-627` | 本書。`CR-627` の後の木で E-01 の旧をもう一度数える（行が違うので 1 回のままの見込み） |
| `CR-622`（兄弟） | ⚠️ **塊は重ならないが、値が重なる** —— `FR-069` のヘルプの Copyright のリンクも同じ URL を指す（`JDG-881`・`JDG-940`）。**継ぎ目**: リポジトリの URL は 表 T-206 の 1 行（本書の `S-459`）とし、ヘルプのリンクもその行を読む。`CR-622` が別の行を立てていたら、後に当たる方がその行を消して先の行を指す（調整役が当てる日に決める） | どちらでもよい | 後に当たる方 |
| `CR-620`（起草。MCP なので除外） | `S-350` の注を書き換える（同書の J-04）。本書の E-05 の旧は `S-350` の次の項の頭 `S-360` であり、`S-350` の項を含めない ⇒ 塊は重ならない | どちらでもよい | 無い |
| `CR-606`（起草） | `S-443` を 表 T-339 の `BL-3` で引くが、`settings.json` の `S-443` の項は書かない。本書の E-06 の旧は次の項 `S-163` の頭 | どちらでもよい | 無い |
| `CR-608`・`CR-613`・`CR-615` | `FR-051` を名で挙げるだけ（書き換えない） | ― | 無い |
| `CR-616`・`CR-617`（遅延診断。除外） | 本書の旧・新のどれにも触れない | ― | 無い |

⭐ 兄弟の `CR-621`・`CR-623`〜`CR-626`・`CR-629`・`CR-630` は、依頼文の範囲（窓・ファイルの面・ツールチップ・ポインタのそばの札・検索・`Esc`）が本書の旧のどれにも触れない。`CR-623`・`CR-624`・`CR-626`・`CR-629` が `display-words.json` に語を足しても、本書の E-07 の旧（区 `fileStatus`）を含まない限り重ならない。

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief). Ids in <> are the
provisional ones; use the numbers the spec pass allocated.

- Branding (U-35) is the App Header's leftmost content, left of Document Title.
  It is an <a> with data-role "Branding", text = display word branding/logo
  ("GRS" in both languages), href = table T-206 S-459 (generated constant
  NOT_STORED_REPOSITORY_ADDRESS), target "_blank", rel "noopener noreferrer".
  target / rel: import LINK_TARGET / LINK_RELATION from notices-drawing.ts
  (make them shared); never write the two values a second time.
- AppHeaderItems (src/adapter/screen-renderer/screen-renderer.ts) gains
    readonly brandingText: string
    readonly repositoryAddress: string
  filled by app-header-items.ts (UF-62) from the generated dictionary and
  NOT_STORED_REPOSITORY_ADDRESS['S-459'].
- Geometry. chrome = S-235 (NOT_STORED_CHROME_SCALE). g = S-225 x chrome.
    seat left   = band.x + S-226 x chrome
    seat width  = g x S-462
    title left  = band.x + (S-226 + S-225 x S-462) x chrome
    rim         = g x S-461, outside the glyph outline only, colour
                  T-236 S-464 (sameAs S-148), painted UNDER the fill:
                  -webkit-text-stroke-width = 2 x rim, paint-order: stroke fill
                  (measured: Chromium 151 honours paint-order on HTML text)
    glyphs      = font-size g, weight normal, colour S-147 (PAINT.ink),
                  line-height as Document Title (1.2); the left rim touches
                  the seat's left edge; vertically centred like the title.
  ONE function computes "title left" (in the adapter layer so both can import
  it); the surface and the image exporter both call it (R2.21).
  The seat never shrinks (flex-shrink 0). The header's flex gap must not stand
  between the seat and the title. No vertical px padding is added to the
  header (DFC-544 item 2); the header height does not change.
- Document Title weight = S-463 (700): the title span, the in-place edit
  field (FR-035; it inherits font) and the exported <text> (font-weight attr).
  Rewrite the TRAP comment at dom-screen-surface.ts:286-288 to the FR-039
  exception; OC-1 labels stay at S-245, every other text stays normal.
- Export (image-exporter.ts appHeaderSvg): x = title left x ratio; Branding is
  not drawn and nothing is drawn in its seat (EP-1). The clipboard picture is
  the same picture (FR-025).
- Generated constants (tools/generate_entity_types.py):
    NOT_STORED_DOCUMENT_TITLE_SIZES += S-462        (screen AND export)
    NOT_STORED_DOCUMENT_TITLE_WEIGHT = [S-463]      (screen AND export)
    NOT_STORED_BRANDING_RIM          = [S-461]      (screen)
    NOT_STORED_REPOSITORY_ADDRESS    = [S-459]      (app-header-items.ts)
    SCREEN_COLOURS                  += S-464
  tools/generate_display_words.py: new section 'branding': ('part', ('text',)),
  fixed key 'logo'.
- No T-109 row, no tooltip, no key, no pressed or faint look. The pointer is
  the browser's finger (T-269 PK-7), the <a> default.

Observable (for the tester, from the spec only):
- [data-role="Branding"] is inside [data-role="App Header"], before
  [data-role="Document Title"]; text "GRS" in ja and in en; an <a> whose href is
  S-459, target _blank, rel contains noopener and noreferrer.
- Its font-size equals Document Title's (S-225 x S-235); its font-weight is not
  S-463; its fill is S-147 and its rim colour S-148 of the current theme.
- Document Title's rect left minus App Header's rect left equals
  (S-226 + S-225 x S-462) x S-235 within 0.5 px, for a short title, a long
  title (ellipsis), an empty title, and a narrow viewport.
- App Header height with Branding equals the height with Branding display:none
  within 0.5 px.
- Document Title's computed font-weight is S-463, also while the title is
  being edited; row names are still not at S-245 (FR-039 MUST NOT).
- Export: the band holds exactly one <text> (the title), no "GRS"; its x is
  (S-226 + S-225 x S-462) x S-235 x ratio to two decimals; it carries
  font-weight S-463; y and font-size as before (EP-1).
- Pressing Branding opens a new tab and the GRS page stays (no navigation of
  the page, unsaved edits kept, no beforeunload prompt).
```

## 6. グラフ（`bfbe7eb7`）

### 6.1 `impact.py` —— 触る行ごとの届く先

| 対象 | 届く先（要求 / 参照） | 読んだ結果 |
|---|---|---|
| `EP-1` | 1 / 4 —— `FR-051:4755`、`tbl-settings.md:364-366` | E-02・E-04 が同じ回に書く。`FR-051` の文は `CR-610` の新の上で E-02 |
| `S-225` | 2 / 3 —— `FR-051:4755`、`FR-080:6328`（`EP-1`）、`S-226` の注 | どれも本書の編集の中 |
| `S-226` | 2 / 2 —— `FR-051:4755`、`FR-080:6328` | 名が移る（決定 6）。`FR-051` の「`Document Title` の字の大きさと左の余白（同表の `S-225` / `S-226`…）」は、左の余白が `S-226` から始まるので真のまま |
| `U-35` | 1 / 1 —— `FR-080:6328` | `EP-1` は既に `Branding` を「描かない」と数える ⇒ 書き出しでロゴを消すのは今の規則のまま |
| `FR-039` | 指される 27 要求 / 72 か所 | 太さの段を読むのは `S-245`（`tbl-settings.md:425`）・`S-246` の注（`:426`）・`FR-039` 自身だけ。ほかは文字サイズ・表示の倍率・書体の段を指す ⇒ 書き換えない |
| `S-245` | 1 / 2 —— `FR-039:7705`、`S-246` の注 | 変えない（決定 9） |
| `FR-101` | 1 / 11 | 本書は `FR-101` を書かない。`U-58` との取り違えの注（`:6571`）は真のまま（① の根拠） |
| `FR-051` | 指される 6 要求 / 20 か所 —— `FR-016:3971`・`:3978`、`FR-053:4878`、`FR-098:5320`、`FR-080:6328`、`FR-036:7577`、`FR-039:7747`（`DS-6`）、`tbl-published-entries.md:53` | どれもスクロールバー・パネル境界・`S-235` の扱いを指す。`DS-6`「`App Header` … 掛けない」はロゴにもそのまま当たる（表示の倍率を掛けない）⇒ 書き換えない |
| `U-27` | 2 / 12 | `FR-080:6328`、`FR-101:6571` —— 真のまま |
| `U-45` | 1 / 3 —— `FR-080:6357`「`GoodRelax Scheduler`（`U-45`）…は画面に描くものではないので、本表に行を持たない」 | 真のまま —— 画面に描く UI パーツは `Branding`（`U-35`、`EP-1` の行）であり、`U-45` は名である |
| 表 T-236 | 指す 19 要求 | 行を 1 つ足すだけ。どの要求も行の数を言わない（13 節の `grep`） |

### 6.2 `induced.py`

```
seeds: EP-1 S-225 S-226 U-35 FR-039 S-245 FR-101
-> 7 of 7, 8 edges, 2 cycles: (EP-1 S-225 S-226), (FR-039 S-245)
seeds: EP-1 S-225 S-226 U-35 FR-039 FR-051 FR-080 T-076 T-206 T-236 U-27 U-45 FR-073 S-350
-> 14 of 14, 27 edges, 3 cycles: (FR-039 FR-080), (EP-1 FR-051 S-225 S-226), (FR-073 S-350)
```

⇒ 閉路 `EP-1`・`FR-051`・`S-225`・`S-226` の 4 つを本書は全部書く（E-02・E-03・E-04）⇒ **E-02・E-03・E-04 は同じ回に当てる。** `FR-039`・`FR-080`（`EP-1` の持ち主）も同じ回（E-01・E-03）。`FR-073`・`S-350` は読むだけで書かない（E-05 は `S-350` の項に触れない）。値の行と規則を持つ要求の間の小さな閉路は作法である（規則 02 の 1）。

### 6.3 裁かれた行

`rulings.md` を上の対象と語で引いた結果は ③ の頭に書いた。`pending-decisions.md` を `EP-1`・`S-226`・`S-245`・`U-35`・「ロゴ」・「太字」で引くと `PND-4`（入口の語 —— 触れない）・`PND-50`（書き出しの帯の色 —— 触れない）・`PND-52`（裁定済。`S-225`・`S-226` を立てた —— 0.1 節のとおり保つ）が当たる。

## 7. 数の予測（`bfbe7eb7`。当てた後に同じ数え方で突き合わせる）

`md-checks.py` の今の値: tables=212 figures=29 rows=2683 uids=176。⚠️ `CR-610`（表 ＋2・行 ＋10 と予測）を先に当てるので、下の差は `CR-610` を当てた後の値に足す。

| 数 | 差 | 理由と数え方 |
|---|---|---|
| tables | ＋1 | 表 T-349（`md-checks.py`） |
| figures | 0 | 図を足さない |
| rows | ＋11 | 表 T-349 の `BR-1` 〜 `BR-6` の 6 と、生成される `tbl-settings.md` の `S-461` 〜 `S-464` の 5（`md-checks.py` は `specindex.discover` が見つけた `_assets` の生成物も数える —— 当てた日に、`S-` の行が数に入ることを確かめる）。接頭辞の表の行は行 ID の形（`XX-n`）でないので数えない |
| uids | 0 | 要求を足さない |
| 表 T-206 の行 | ＋4 | `S-461`・`S-462`・`S-463`・`S-459` |
| 表 T-236 の行 | ＋1（45 → 46） | `S-464` |
| 接頭辞の登録 | ＋1 | `BR`（`row-id-prefixes.json` の `prefixes`） |
| 辞書の区 | ＋1（区 32 → 33、語 ＋1） | `branding` の `logo` |
| `（MUST）` ・ `（MUST NOT）` の印（`01-04-requirements.md`） | ＋17 | E-01 ＋1、E-02 ＋16（`FR-051` の文 1、`BR-1` 4、`BR-2` 5、`BR-3` 2、`BR-4` 3、`BR-6` 1。旧の 2 行は 0）、E-03 0。ほかのファイルは 0 |

⚠️ 上の印の差は、13 節のスクリプトが新と旧の塊を数えた差（`must_delta`）である。当てた日に `grep -o "（MUST\( NOT\)\?）" docs/spec/01-04-requirements.md | wc -l` を当てる前と後で数える。

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 | 毎フレーム |
|---|---|---|---|---|
| 0 | ― | `CR-610`・`CR-627` を当てた木で、4 節の旧 11 件をもう一度数える（E-02・E-10 は `CR-610` の新の上で 1 回になること）。仮の綴り（表・`S-`・`BR`）に番号を振る（2 節）。`CR-622` と URL の行の持ち主を決める（4.1 節） | 調整役・仕様の体 | ― |
| 1 | ⛔ **L4 の合流を待つ**（`tools/generate_entity_types.py` と生成区画は L4 の持ち物）。`docs/spec`（E-01 〜 E-11）＋ `npm run gen` ＋ `tools/generate_display_words.py`（区 `branding`）＋ `tools/generate_entity_types.py`（5 節の群）＋ 変更履歴に 1 行 | 原稿と、それを読む生成器を 1 つの波で着地させる（規則 02 の 3.5 —— 辞書の区を生成器が知らないと生成が止まり、設定値の行は生成器の群に載るまで `src` に届かない） | 仕様の体 | いいえ —— 生成器と原稿だけで、走る道に触れない |
| 2 | L4: `src/adapter/screen-renderer/screen-renderer.ts`・`app-header-items.ts`、`src/framework/dom-screen-surface/app-header-drawing.ts`・`dom-screen-surface.ts`・`notices-drawing.ts` | 5 節の継ぎ目の画面の側: `Branding` の `<a>`、席と縁、題の左端の関数、題の太さ、TRAP の注の書き直し、`LINK_TARGET`・`LINK_RELATION` の共有 | L4 が合流した後の実装の体 | いいえ —— `App Header` を描き直すのは `appHeaderItems` の鍵が変わった枠だけである（`dom-screen-surface.ts:867`）。`AppHeaderItems` に足すのは定数の文字列 2 つで、輪も段も増えない |
| 3 | L5（書き出し）: `src/adapter/image-exporter/image-exporter.ts` ＋ `tests/contract/dfc-355-the-four-rulings-of-2026-09-07.test.ts` | 題の `x` を波 2 の関数で求め、`font-weight` を足す。`dfc-355` の `:577-593` の場合を新しい式へ書き直す（3 節） | 実装の体（波 2 の関数を待つ） | いいえ —— 書き出しは人が押した 1 回だけ |
| 4 | `tests/contract/cr-628-*.test.ts`（新しいファイルだけ） | 下の場合を、`docs/spec` だけを読む体が書く（実装した体に書かせない） | 仕様だけの試験の体（波 2・3 と並べてよい） | ― |
| 5 | ― | 実物で確かめる（Playwright の probe。表示枠は rAF を回さない）: 既定の書体でロゴの縁と席と題の隙間を目で見る、押して新しいタブが開き `GRS` の頁が残る、暗いテーマ・モノクロ、書き出した SVG と PNG とクリップボードに `GRS` が無く題の位置が画面と一致する（`WY-3`） | 調整役 | ― |

**波 4 の場合（`tests/contract/cr-628-*.test.ts`）:**

| 場合の名 | 確かめること |
|---|---|
| `BR-1 the header draws GRS left of the Document Title in both languages` | `Branding` が `Document Title` より前に在り、字が ja・en とも辞書の `branding/logo` |
| `BR-1 the logo glyphs are the Document Title's size, normal weight, S-147` | 字の大きさ ＝ `S-225` × `S-235`、太さが `S-463` でない、色が `S-147` |
| `BR-2 the title's left edge is the seat's right edge (short / long / empty title, narrow viewport)` | 題の左端 − 帯の左端 ＝（`S-226` ＋ `S-225` × `S-462`）× `S-235`（±0.5px） |
| `BR-2 the seat does not shrink in a narrow header` | 狭い画面で席の幅が変わらず、題が省かれる |
| `BR-3 the rim is S-461 of the glyph size in S-464, under the fill` | 縁の幅・色（明・暗）・塗りの下 |
| `BR-4 pressing the logo opens S-459 in a new tab and keeps the page` | `href`・`target`・`rel`、頁が移らない、未保存の編集が残る |
| `BR-5 the logo has no T-109 row, no tooltip, no key` | 表 T-109 に `Branding` の行が無い。ポインタを乗せて `S-124` 待っても説明が出ない |
| `FR-039 the Document Title is drawn at S-463, also while edited` | 題と編集の欄の太さ。行見出しの名前は `S-245` でない（既にある MUST NOT が真のまま） |
| `EP-1 the exported title keeps the screen's position and weight, and GRS is not drawn` | SVG の帯に `<text>` は題の 1 つ、`x` が式どおり、`font-weight` が `S-463`、`GRS` が無い |
| `FR-051 the header height does not change with the logo` | ロゴを `display:none` にしたときと帯の高さが同じ（±0.5px） |

⭐ 逐語で引く新しい MUST（検査 39）: E-01 の 1 行目、`BR-1` 〜 `BR-6` の MUST と MUST NOT、E-02 の「`Branding` を置き、表 T-349 に従うこと（MUST）」。

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`bfbe7eb7` の行番号）

| ファイル | 関数・所 | 何を | 波 | 毎フレーム |
|---|---|---|---|---|
| `tools/generate_entity_types.py`（⛔ L4） | `NOT_STORED_DOCUMENT_TITLE_SIZES`（`:1466`）ほか | 5 節の群 5 つ。`:1019`〜`:1030`・`:2863`〜`:2868` の注に `S-462`・`S-463` を足す（「字の大きさと左の余白は…同じ 1 つの行を読むこと」の引きは残す） | 1 | いいえ |
| `tools/generate_display_words.py` | `SHAPE`（`:489`〜）、名簿（`:439` 付近）、出力の区の並び（`:600`〜`:606`） | 区 `branding` と固定の鍵 `logo` | 1 | いいえ |
| `src/adapter/screen-renderer/screen-renderer.ts` | `AppHeaderItems`（`:103`〜`:110`） | `brandingText`・`repositoryAddress` | 2 | いいえ |
| `src/adapter/screen-renderer/app-header-items.ts` | 項を組む所 | 上の 2 つを辞書と生成した定数から埋める | 2 | いいえ（鍵が同じなら描き直さない） |
| `src/framework/dom-screen-surface/app-header-drawing.ts` | `appHeaderStyle`（`:22`〜`:25`）・`documentTitleStyle`（`:29`〜`:32`）・`fillAppHeader`（`:62`〜`:95`） | `Branding` の `<a>` と席、題の太さ、題の左端を 1 つの関数から | 2 | いいえ |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` | `STYLE`（`:286`〜`:288` の TRAP の注と `documentTitle`）、`ROLE`、`PAINT`（`:95` 付近） | 注を `FR-039` の例外へ書き直す。`ROLE.branding = 'Branding'`、縁の色 `S-464`、生成区画 | 2 | いいえ |
| `src/framework/dom-screen-surface/notices-drawing.ts` | `LINK_TARGET`・`LINK_RELATION`（`:23`・`:25`） | 共有する（写さない。`R2.22`） | 2 | いいえ |
| `src/adapter/image-exporter/image-exporter.ts`（L5） | `appHeaderSvg`（`:130`〜`:143`）・`textSvg`（`:120`〜`:126`） | 題の `x` を波 2 の関数で、`font-weight` を `S-463` で | 3 | いいえ |
| `tests/contract/dfc-355-the-four-rulings-of-2026-09-07.test.ts` | `:577`〜`:593`（「the inset drawn is S-226」） | 題の `x` を新しい式で確かめる。`:611`〜`:612` は真のまま | 3 | ― |

⭐ 逐語で古い文を引く試験は 0（13 節の `git grep`）—— 本書は既にある文を 1 つも書き換えず、足すだけだからである（`S-226` の名だけが変わるが、名を引く試験は無い）。
⚠️ `DFC-544`（`実装待ち`）の ② は「`appHeaderStyle` と `STYLE.appHeader`: `S-226` 以外の px の余白を足すと、`BO-1` が測る高さが環境の答えでなくなる」と言う。本書の席は横の長さであり、縦の余白を足さない（5 節）—— 罠を増やさない。

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 表 T-109 に行を足さない。図 F-019 に図形を足さない（決定 1）。`CR-627` の並べ替えに触れない。
- `FR-069`（ヘルプのライセンスと Copyright のリンク）を書かない —— `CR-622` の持ち物。URL の行を共有するだけ（4.1 節）。
- `S-350`（最新版を入手する所）とその注を変えない（`CR-620` の持ち物）。
- 名称ラベルの太さ `S-245` と、`FR-039` の既にある 2 つの文（MUST と MUST NOT）を変えない。
- `App Header` の高さ・`S-235`・`S-225` の値を変えない（`JDG-602`・`JDG-169`）。
- ロゴに説明（ツールチップ）・キー・押下状態を持たせない（決定 1）。
- 読み上げのための手当てを足さない（利用者の裁定）。

## 11. 利用者に問うこと

無い。置き場・字・縁の幅・押した先・書き出しの扱いは `JDG-882`・`JDG-894`・`JDG-899` が、太字と書き出しの題の太字は `JDG-883`・`JDG-922` が答えている。新しいタブ（決定 2）・URL の行（決定 3）・字の大きさ（決定 4）・席（決定 5・決定 6）・縁の描き方（決定 7）・太さの行（決定 9）は、裁定と先例から導いた。
⚠️ 席の幅 2.5（字と題のあいだ 7.7px）は測った書体の幅から選んだ値であり、利用者が見た値ではない（🔎）—— 8 節の波 5 で目で確かめ、狭い・広いと見えたら、利用者に見本で選んでもらう。

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1352` | ヘッダーの題の左に GRS のロゴが無い | 本書で閉じる（仕様は波 1、コードは波 2・3） |
| `DFC-1353` | ヘッダーのプロジェクト名が細字 | 本書で閉じる（仕様は波 1、コードは波 2・3） |
| `JDG-882`・`JDG-894`・`JDG-899`・`JDG-883` | 利用者の裁定（状態「指示 —— 調整役が投入時期を決める」） | 調整役へ: 本書を当てる波が決まったら「指示 —— `CR-628` が当てる」（検査 43）。着地したら 適用済 |
| `JDG-922` | #34 の部分（書き出しの絵の題も太字） | 同上。⚠️ 同行はほかの 13 件の推奨も持つ —— #34 の部分だけを本書が当てる |
| `DFC-544` | DOM 面の罠を注だけが持つ（② が `appHeaderStyle` の余白） | 触れない（9 節の ⚠️）。本書の後も ② の文は真 |
| `DFC-1351` | ヘルプの Copyright のリンク | 触れない（`CR-622`）。URL の行を共有する（4.1 節） |
| `PND-52` | `Document Title` の位置（裁定済） | 変えない。0.1 節のとおり保つ |

## 13. 測り方の再現

```
# the tree: l4-review-crs bfbe7eb7 (= refactor); every file below is LF-only (`file` says so)
git log --oneline -1                          # -> bfbe7eb7 Record JDG-1052, JDG-1053 ...

# rulings and ledger rows read whole
grep -n "^| JDG-602 \|^| JDG-882 \|^| JDG-883 \|^| JDG-894 \|^| JDG-899 \|^| JDG-922 \|^| JDG-881 \|^| JDG-940 " docs/development-records/rulings.md
#   -> :857 :1164 :1165 :1166 :1177 :1182 :1184 :1189
grep -n "DFC-1352 \|DFC-1353 \|DFC-1354 \|DFC-544 \|DFC-1351 " docs/development-records/defects.md   # -> :130 :449 :450 :451 :452
grep -n "^| DFC-14 " docs/development-records/fixed-defects.md                                    # -> :115
# rulings grepped for EP-1 FR-039 S-245 S-225 S-226 U-35 FR-080 S-148 ロゴ 太字 太く Branding GitHub 新しいタブ
#   -> JDG-30 88 122 123 131 133 149 152 153 154 160 169 171 201 255 301 368 373 444 545 427 602 646 647
#      725 881 882 883 894 899 906 910 911 922 940 952 962 1026 1052 ; relevant: section 0.1 and ③
# pending-decisions grepped for ロゴ Branding U-35 S-245 S-226 太字 EP-1 -> PND-4 PND-50 PND-52

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py EP-1 S-225 S-226 U-35 FR-039 S-245 FR-101
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-051 U-27 U-45 T-236 S-148
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py EP-1 S-225 S-226 U-35 FR-039 S-245 FR-101
#   -> 7 of 7, 8 edges, 2 cycles (EP-1 S-225 S-226) (FR-039 S-245)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py EP-1 S-225 S-226 U-35 FR-039 FR-051 FR-080 T-076 T-206 T-236 U-27 U-45 FR-073 S-350
#   -> 14 of 14, 27 edges, 3 cycles (FR-039 FR-080) (EP-1 FR-051 S-225 S-226) (FR-073 S-350)

# totals (section 7)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py   # -> tables=212 figures=29 rows=2683 uids=176

# no prose count of the tables this CR grows
grep -rnE "(T-206|T-236|T-103|T-076)[^|]{0,30}[0-9]+ ?(件|行)" docs/spec     # -> only T-103 "63 行" (01-04:5777); T-103 is not grown

# who quotes the text this CR touches (tests / src / tools)
git grep -n "S-226\|S-225\|S-245" -- tests                 # dfc-355 (:577-612 inset), cr-584, ix-4, cr-419, uf-39-40
git grep -n "帯の左端からの余白\|題の置き方\|Branding\|U-35" -- tests src tools .claude/skills
#   -> the S-226 NAME is quoted nowhere; "題の置き方を決める値ではない" (dfc-355:596) is kept; U-35 rows in uf-71 / uf-72 read the name column only
git grep -n "noopener\|_blank\|noreferrer" -- src          # -> notices-drawing.ts:23 :25 (LINK_TARGET / LINK_RELATION)
git grep -n "S-245\|font-weight\|fontWeight" -- src tools  # -> dom-screen-surface.ts:286 TRAP, :382 NT-7, svg-renderer, generator :1635 :1642
grep -n "fillAppHeader\|changed('appHeaderItems')" src/framework/dom-screen-surface/dom-screen-surface.ts   # -> :867 gate, :872 call

# the other change requests touching the old blocks (section 4.1; Grep over change-request/CR-6[0-2][0-9]-*.md)
#   pattern: EP-1 FR-039 S-245 S-225 S-226 U-35 Branding UF-104 S-443 S-350 "LM" FR-051
#   -> CR-610 (E-05 / E-10 / E-11 overlap), CR-620 (S-350 note), CR-606 (S-443 by name), CR-608 CR-613 CR-615 (FR-051 by name)

# the width of "GRS" (decision 5, S-462): the session scratchpad cr-628/probe-logo-width.cjs,
#   Playwright chromium from the root node_modules, span font-size 100px, width / 100, weight 400:
#   S-246 list 1.82, Yu Gothic UI 1.82, Yu Gothic 2.02, BIZ UDPGothic 2.31, Arial 2.17, sans-serif 2.05, Meiryo 2.05
# paint-order on HTML text (decision 7): cr-628/probe-paint-order.cjs, Arial 120px, 12px red stroke:
#   pure-black fill pixels normal 0 / "stroke fill" 7018 -> Chromium 151 honours paint-order on HTML text

# the old blocks: each counted once, LF-normalised, by the session scratchpad script cr-628/count_old.py
#   (reads this file's <!-- EDIT --> markers, takes each 旧 fence, counts it in its file; for base=CR-610 it first
#    applies every EDIT of change-request/CR-610-*.md to a copy of that file, then counts on the copy;
#    it also counts every block on the plain tree and prints the MUST delta of 新 minus 旧 per EDIT)
PYTHONIOENCODING=utf-8 python <scratchpad>/cr-628/count_old.py . change-request/CR-628-*.md
#   E-01 01-04-requirements.md   plain=1 after-CR-610=1 must_delta=+1
#   E-02 01-04-requirements.md   plain=0 after-CR-610=1 must_delta=+16  (base=CR-610)
#   E-03 01-04-requirements.md   plain=1 after-CR-610=1 must_delta=+0   (partial)
#   E-04 settings.json           plain=1 after-CR-610=1
#   E-05 settings.json           plain=1 after-CR-610=1
#   E-06 settings.json           plain=1 after-CR-610=1
#   E-07 display-words.json      plain=1 after-CR-610=1
#   E-08 row-id-prefixes.json    plain=1 after-CR-610=1
#   E-09 tbl-glossary.md         plain=1 after-CR-610=1
#   E-10 05-07-design.md         plain=0 after-CR-610=1                  (partial, base=CR-610)
#   E-11 05-07-design.md         plain=1 after-CR-610=1                  (partial)
#   every EDIT of CR-610 still found its own old block once on bfbe7eb7 (the script says so when not)
#   MUST delta in 01-04-requirements.md: +17
```

### 13.1 ⚠️ 測りが見られなかったもの

- 出荷ビルドのヘッダーは測っていない。席と題のあいだ 7.7px は、字の幅の実測（見出しの外の `span`）と式から出した —— 帯の中で目で見るのは 8 節の波 5 である。
- `paint-order` の効きは Chromium 151（Playwright の同梱）で確かめた。基準ブラウザの版（表 T-025 の `MC-5`）では確かめていない。
- `md-checks.py` が生成される `tbl-settings.md` の `S-` の行を数に入れるかは、当てた日に確かめる（7 節）。
- `CR-622` が URL の行を立てるかは読めなかった（起草中の兄弟）—— 4.1 節の継ぎ目で調整役が決める。
