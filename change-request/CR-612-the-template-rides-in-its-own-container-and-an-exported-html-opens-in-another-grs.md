# CR-612 — 見本は自分の容れ物に乗り、書き出した .html は別の GRS で開ける

> 起草の状態: 当てた（2026-10-01、枝 `spec-pass-1001`、仕様の通し）—— 仕様の波 1（E-01 〜 E-17、E-09 を除く 16 件）。旧 16 件はどれも当てる木で 1 回だった（`CR-610` ・ `CR-611` の後。E-11 の新の行は `FR-096` の MSPDI の文の直後、`CR-610` の 表 T-340 の段の前に入る）。最終の ID は `MC-10` ・ `RS-67` ・ `PI-20` の `documentFromEmbeddedHtml`（起草のまま）。書き直し: E-07 の新は `CR-611` が着いたので空の文書に 表 T-342 を指し足した。E-08 の新は検査 46（1 行 1 文）のため 2 つ目の文を次の行へ割った。波 2a のうち `tools/generate_exchange_formats.py` の組の一意（`DFC-1427`）だけは、`IO-7` の `<` で `npm run gen` が止まるので同じ回に当てた（`tools/generate_startup_template.py` は当てていない）。波 2b 〜 5 は次の巡。⚠️ 表 T-064 の `PI-20` の `documentFromEmbeddedHtml` は src がまだ書き出さないので、検査 26b が赤い（基準線の判断は調整役）。
> 起草のときの状態: 起草（2026-10-01、枝 `b3-export-shell-crs`）。まだ当てていない。4 節の旧 16 件は、読んだ木で各 1 回だった（13 節）。11 節の 2 つの問いは 2026-10-01 に答えを得た —— 問い 1（出荷する見本の大きさ）は **保留**（`JDG-970`、`PND-611`）、問い 2（`BT-1` の検証）は推奨の「掛ける」（`JDG-973`）。11 節に残っていた `RS-67` の語も同じ日に答えを得た（`JDG-993`）—— 開けない `.html` への告げは 1 つの短い語にし、`GRS` 本体の `index.html` を開く道で開けば見本が開く。⏸ 保留に合わせて、出荷する見本を小さくする編集（`TP-5` ・ `TP-6`、元の E-09）・生成器の 2 つ目の森・見本の大きさのための試験の向け直しを外した —— 本書は容れ物の仕組みと測る文書 `MC-10` だけを当て、出荷する見本は 1000 件のまま、バイト単位で変えない（10 節）。
> 読んだ木: `b3-export-shell-crs`（`refactor` `0590ad03` から切った。`docs/spec` ・ `src` ・ `tests` ・ `tools` は `0590ad03` のまま）。行番号・数・大きさは、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-612` を受けた。仕様の新しい行 ID は `MC-10`（`0590ad03` で最大 `MC-9`、当てる日に測り直す）と `RS-67`（`0590ad03` で最大 `RS-66`、当てる日に測り直す）の 2 つ。公開の名 `documentFromEmbeddedHtml` を 1 つ足す（2 節）。
> ⛔ 当てる順: **`CR-611` の後**（E-07 の `BT-4` の注は、`CR-611` が `FR-095` を「空の文書で始める」に替えた後でなければ循環する —— いまの `FR-095` は「`BT-4` と同じ状態に戻す」）。**`CR-610` の後**（`CR-610` の E-01 と本書の E-11 は同じ旧の 1 行（`FR-096` の MSPDI の文）を使う。`CR-610` はその行を残して後ろに段と表を足すので、`CR-610` の後なら E-11 の旧はそのまま 1 回現れる。逆の順だと文字の上では当たるが、E-11 の文が `CR-610` の表の後ろへずれる）。4 本を `CR-610` → `CR-611` → 本書 → `CR-613` の順に写しへ当て、すべての旧が 1 回ずつ当たることを確かめた（13 節）。`CR-613` とは重ならない。仕様の文は、持ち場 L4 の合流の後に 1 回で当てる（8 節）。
> **閉じるもの**: `DFC-1349`（`JDG-879`、書き出す .html から既定のデータを消す）・ `DFC-1358`（`JDG-888`、書き出した .html を別の GRS で読む）・ `DFC-1425`（起動の入れ口の数を `RS-15` で告げる）・ `DFC-1426`（`CHN-2` に単一 `.html` が無い）・ `DFC-1427`（生成器の一意の検めが `OP-12` より強い）。`PND-452` は開く道について本書で閉じ、起動の道（`BT-1`）は問い 2 の答え「掛ける」（`JDG-973`）が決めた —— 当てるのは `JDG-78` のとおり `DFC-586` の時（10 節）。⏸ **`DFC-1348`（`JDG-878`、見本の大きさ）は閉じない** —— 問い 1 は保留（`JDG-970`）であり、`PND-611` の答えを待つ。問いは 2026-10-01 に答えを得た（`JDG-970` ・ `JDG-973` ・ `JDG-993`）。`RS-67` の語と、本体の `index.html` を開く扱いは `JDG-993` が決めた（決定 9 ・ 決定 16）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-878` | 「#29  dist/index.html のサイズが1Mを超えた。<br>サンプルスケジュールのデータ量はどれくらいか？<br>本番リリース前にはもう少し簡素なスケジュールにする予定<br>それでだめなら、スクリプトやデータ部分を gzip圧縮することを検討しろ。」 | 見本の量を示す。本番前に見本を簡素にし、それでも駄目なら gzip を考える | 量は 0.2 節の 1。簡素にする大きさと形は問い 1 —— ⏸ 保留（`JDG-970`、`PND-611`）。本書は見本の中身を変えない。gzip は決定 11（いまは入れない） |
| `JDG-879` | 「#30 GRSで作った日程を.htmlで出力する際は、GRSのデフォルトデータを消せ。 ファイルサイズの無駄。」 | 書き出す単一 .html（表 T-024 の `IO-7`）から起動の見本を消す | E-08（見本をスクリプトと別の容れ物に置く）・ E-12（書き出しで外す）。決定 1 〜 4 |
| `JDG-888` | 「#39 GRSが出力した Single HTMLを別のGRSで読み込み可能とせよ。<br>ユースケース:<br>サプライヤに大きい日程を Single HTMLで渡して、<br>サプライヤの日程を埋めてもらった。<br>発注者でその日程をメインの計画に取り込む」 | 書き出した単一 .html を、別の GRS の「開く」で読み、置き換え・合流・重ねの 3 択（`OP-3`）で取り込める | E-01 ・ E-03 ・ E-04 ・ E-05 ・ E-06 ・ E-11 ・ E-12 ・ E-13。決定 6 〜 10。仕様の文には業種の語を持ち込まず「渡した相手が埋めた文書」と書く |
| `JDG-970` | 「問 7. 出荷する見本の大きさ →一旦保留。 落ち着いたらシンプル化する。 後でやる旨記録しておけ。<br><br>それ以外は、全部推奨で」（2026-10-01。枝 `b3-export-shell-crs` の起草のセッションがまとめて問うた問 1 〜 11 への 1 つの答えのうち、本書の問い 1 に当たる「問 7」の部分） | 出荷する見本の大きさ（`TP-2` ・ `TP-5` ・ `TP-6`）は保留。落ち着いてから利用者が簡素にする。後でやることを記録する（`PND-611`） | 本書は容れ物の仕組みと測る文書 `MC-10` だけを当て、出荷する見本は 1000 件のまま、バイト単位で変えない。元の E-09（`TP-5` ・ `TP-6`）・生成器の 2 つ目の森・試験の向け直し（元の波 4a）を外した。10 節 ・ 11 節 |
| `JDG-973` | 同じ逐語（同じ答えのうち、本書の問い 2 に当たる「問 8」への「それ以外は、全部推奨で」の部分） | 起動の道（表 T-034 の `BT-1`）に埋め込まれた文書にも `FR-023` の検証を掛ける（`PND-452` の推奨）。断ったときの手当ては `JDG-78` のとおり `DFC-586` の時 | 決定 14。決定 7 で読み手が 1 つになるので、掛けるのは 1 か所の呼び出しで済む。その呼び出しと仕様の文は `DFC-586` の時に当てる（10 節） |
| `JDG-993` | ① 「もっとシンプルに、<br>このファイルはGRSに有効な.htmlではありません。GRSのヘッダーメニューを操作してされたか、ファイルの出自を確認してください。<br>とかで、いいだろ？<br> <br>GRS 本体の index.html そのものを開こうとしたケースはそのままデフォルト日程を開けばよいだろ？<br><br>意見くれたし。」<br>② 「OK!」（2026-10-01。① は前に立つ者が `RS-67` の起草の語を見せたときの答え、② は ① への前に立つ者の返し —— 右の 2 つ —— を受けた答え） | ① `RS-67` は、`GRS` が開けない `.html` のすべてに 1 つの断り（文書の容れ物も見本の容れ物も無い、または文書の容れ物が 2 つ以上。起動の道の 2 つ以上も同じ）。語は text ja「このファイルは GRS で開ける .html ではありません」／ en「This file is not an .html that GRS can open」、nextStep ja「GRS のヘッダーの書き出しで作ったファイルか、ファイルの出どころを確かめてください」／ en「Check that it was written out from the GRS header, or where the file came from」。<br>② `GRS` 本体の `index.html`（見本の容れ物を持ち、文書の容れ物を持たない）を開く道（表 T-024a）で開くと、ほかのファイルと同じく見本の日程が開く。読む順は、文書の容れ物 → 無ければ見本の容れ物 → どちらも無ければ `RS-67` | 決定 9 ・ 決定 16。E-03 ・ E-12 ・ E-13 ・ E-17。SEAM-2 ・ SEAM-4 ・ SEAM-4a。11 節の残りの問いを閉じる |

⭐ 3 つを 1 つの「容れ物」の話にする（`DFC-1349` の対応方針）。見本を自分の容れ物に乗せるから、書き出しがそれを外せ（`JDG-879`）、書き出したものは埋め込んだ文書の容れ物だけを持つので、別の GRS がそれを読める（`JDG-888`）。見本を小さくする（`JDG-878`）のは、同じ容れ物の中身を替えることである —— ⏸ それは `PND-611` の答えを待ち、本書では替えない（`JDG-970`）。本書が測る文書 `MC-10` を見本から分けておくので、後で見本だけを替えても性能の基準は動かない。

### 0.2 調べた結果（`0590ad03`）

1. **見本は出荷物の 44.7% である。** `dist/index.html` は 1,444,325 B（gzip -9 で 266,305 B）。うち見本の字面（`var UP={schemaVersion:` から `changeLog:[]};` まで）が 645,394 B = 44.7%、残りが 798,931 B。見本だけを詰めた JSON は 645,474 B（gzip -9 で 48,288 B、それを base64 にすると 64,384 B）。中身はタスク 458,825 B・`taskGroupMembers` 82,894 B・担当 71,813 B・行 22,266 B、残り 9,676 B。⚠️ `DFC-1348` の 1,397,873 B ／ 645,386 B は、それより前の `refactor` の数である。
2. **見本はスクリプトに束ねられ、2 か所から取り込まれている。** `frame-loop.ts:207` と `single-html-shell.ts:49` がどちらも `import startupTemplate from './startup-template.json'` である。⚠️ `frame-loop.ts` が要るのは `:220` の `GREATEST_KNOWN_SCHEMA_VERSION = startupTemplate.schemaVersion` と `:1548` の引数だけで、版の 1 語のために見本の全体を束ねている。`single-html-shell.ts:178-191` の `startupTemplateDocument` が起動のたびに見本を読み直し、`:369` の `template` を `:467`（`BT-4`）・ `:516`（`frameLoop` の引数）・ `:544`（`Agent API` の版）に配る。
3. **書き出しは起動した頁の字面そのものである。** `single-html-shell.ts:351` が起動の最初に `readDeliveredHtml()`（`:69-72`、`outerHTML`）で頁を取り、`embedded-html-codec.ts:126-144` の `exportEmbeddedHtml` がそれに文書の容れ物を 1 つ足す（`:101-123`）。⇒ 見本はスクリプトの本文の中にあるので、書き出しは外せない。外せばスクリプトの本文が変わり、`vite.config.ts` がビルドのときに刻んだ `script-src` のハッシュ（表 T-232 の `PO-4`）が合わなくなって頁が起動しない。
4. **走らない JSON の容れ物は `PO-4` に掛からない。** 型が `application/json` の `script` 要素はデータの塊であり、ブラウザは走らせないので、方針のハッシュを求めない。`BT-1` の容れ物（`embedded-document`、`embedded-html-codec.ts:48-50` の `containerHtml`）が同じ形で、同じ方針の下で既に開いている（`tests/unit/io-7-bt-1-the-exported-file-reopens-itself.test.ts`、`tests/system/single-html-policy.sws.test.ts` の `SWS-8` は「方針が何も拒まなかった」を出荷ビルドで見る）。`vite.config.ts` がハッシュを取るのは、畳み込んだ `type="module"` の本文だけである（`scriptSourceHashOf`、`inlinedScriptTexts`）。
5. **`BT-1` の容れ物の形は裁定済みである。** `PND-70`（2026-09-05、`CR-353`）で、要素と置き場所を「保存された `.html` の形そのもの」として分類 `D` にした。`DFC-552` は、その id が `Agent API` の造り手が組む単一 HTML との約束であると記す。⇒ 見本の容れ物に同じ id を使い回すと、その約束の中身が変わる（決定 1）。
6. **性能の試験は 1000 件の見本に頼っている。** ① `tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts` は出荷ビルド（`:447`）を開いて見本のまま測り、`:1556` で「測った文書が `TP-6` より少ない」を満たさない条件として数える。② `tests/nfr/nfr-001-010-011-013-the-rest-of-chapter-7.test.ts` の `MC-9` の 4 段（`:141-147`、125 ／ 250 ／ 500 ／ 1000）と `PG-10`（`:865`、「束ねた文書の 509 本の依存」）も見本を削って作る。③ 規則 04 の 5 節 `PW-3` の合否は `tools/probe/examples/lm-19-frame-time-baseline.mjs` で測り、その既定は `tasks: 1000, // MC-7 and TP-6: the startup template holds this many`（`:55`）、`:294` で「見本をそのまま測る」。⇒ **出荷する見本を小さくすると、そのままでは性能の試験が 1000 件の文書を測らなくなる。** 測る文書を見本と分けて持つ（決定 5、E-14 の `MC-10`）—— 見本を小さくするのは `PND-611` の後だが、分けるのは本書で先に済ませる。
7. **試験の 127 本が見本のファイルを読む。** `git grep -l startup-template -- tests` は 127 本（`tests/unit` 82 ・ `tests/contract` 39 ・ `tests/system` 4 ・ `tests/integration` 2）。多くは「大きく現実的な文書」として関数に食わせており、見本の大きさと中身（行の名・件数）に頼る。⇒ 見本を小さくするとき（`PND-611` の後）に、測る文書へ向け直すことになる。⏸ 本書は見本の中身を変えないので、127 本は向け直さず、どれも出荷する見本を読み続ける（元の波 4a は外した）。
8. **生成器は行の数を変えられない。** `tools/generate_startup_template.py` は 100 行の森を手で並べ（`WANTED_ROWS = 100`、`:350`）、`WANTED_TASKS = 1000`（`:351`）で件数を合わせる。写しで `WANTED_TASKS` だけを 100 にすると 10 分で終わらなかった（止めた）。写しで 30 ／ 40 ／ 20 ／ 50 行を求めると `TP-5: the tree holds 100 rows` で止まる。⇒ 小さい見本には、小さい森を生成器に 1 つ足すことになる —— ⏸ `PND-611` の答えの後の仕事であり、本書は足さない。⭐ 同じ写しを既定のまま走らせた出力は、いまの `startup-template.json` とバイト単位で同じだった（生成器は決定的である）。
9. **見本を小さくしたときの大きさ（比例の見積もり。`PND-611` の答えの材料 —— 本書は見本を小さくしない）。** 1000 件の平均（タスク 1 件あたり 613.5 B、行 1 つあたり 222.7 B、固定 9,676 B）から:

   | 見本 | 見本の大きさ | gzip -9 | `dist/index.html` |
   |---|---:|---:|---:|
   | 50 タスク ・ 20 行 | 約 44.8 KB | 約 3.4 KB | 約 844 KB |
   | **100 タスク ・ 30 行（問い 1 の推奨 A。保留）** | **約 77.7 KB** | 約 5.8 KB | **約 877 KB** |
   | 200 タスク ・ 40 行 | 約 141 KB | 約 10.6 KB | 約 940 KB |
   | 300 タスク ・ 50 行 | 約 205 KB | 約 15.3 KB | 約 1,004 KB |
   | 1000 タスク ・ 100 行（いま） | 645 KB | 48.3 KB | 1,444 KB |

   ⚠️ 見積もりである。生成した見本で測ってはいない（13.1 節）。`dist` の欄は、見本を除いた 798,931 B に見本の大きさを足しただけ。
10. **開く道は `.html` を読む手前で止まる。** ① 表 T-024 の `IO-7` は「書出のみ」で先頭の文字の欄が「—」（`01-04-requirements.md:5899`）、その注は「`IO-7` もその欄を持たない —— 埋め込まれた文書を読むのは表 T-034 の `BT-1` であって、開く道ではない」（`:5907`）。② 生成物 `src/adapter/document-codec/exchange-formats.json` の `IO-7` は `firstCharacter: null`。③ `document-codec.ts:41-44` の `ROW_OF_FORMAT` は `IO-2` と `IO-1` だけ、`:52-60` の `READABLE_FORMATS` も 2 つ。⇒ `.html` を開くと `OP-12` の拡張子の食い違い（`RS-11`）で断られる。
11. **`<` を 2 つの行が持つと、いまの判別と生成器が壊れる。** HTML は `<` で始まる（書き出しは `<!DOCTYPE html>` から。`readDeliveredHtml` の `:70`）。MSPDI XML も `<` である。① `formatFromFile`（`document-codec.ts:96-114`）は先頭の文字で `find` した**最初の**行を取るので、`.html` ＋ `<` は拡張子が `IO-7`、先頭の文字が `IO-1` を指して食い違いになる。② `tools/generate_exchange_formats.py:228-233` は、判じられる行どうしが先頭の文字を共有すると「`OP-12` が 1 行を名指せない」として止まる。⚠️ ところが `OP-12` の文は「拡張子と先頭の非空白 1 文字の**両方が同じ行に**合致」であり、拡張子が行ごとに違えば（同じ生成器の `:234-240` が強いている）組は 1 行に決まる。⇒ 生成器の検査は `OP-12` より強い。組で判じるように直す（決定 6）。
12. **選び手に受け付けの一覧は無い。** `file-system-access-file-store.ts:239` の `picker({ multiple: false })` は形式を絞らず、ドロップ（`:283`・`:290`）も `Files` を見るだけである。⇒ `.html` を選び・落とすために変えるものは無い（決定 12）。
13. **`.html` から置き換えで開いた後の `SK-11` は、いまのままだと `.html` を `GRS JSON` で上書きする。** `document-file-flow.ts:677-679` の `isOverwritableOpenedFile` が上書きする先から外すのは `.xml`（MSPDI）だけである。`SK-11` は `GRS JSON` を書く（`FR-096`、`:689-701`）。⇒ 本体の入った `.html` が本体を持たない `GRS JSON` に変わり、同じ名のまま `OP-12` に断られる（拡張子は `IO-7`、先頭の文字は `IO-2`、`RS-13`）。合流と重ねは上書きする先を変えない（`CR-594`、`FR-060` の ⭐ の文）。⇒ E-11 と 9 節。
14. **起動の見本は `BT-1` で開いた文書の前にも読まれている。** `single-html-shell.ts:367-371` は、画面の色を決めるために `chosen` より前に `template` を読む（`TRAP` の注）。⇒ 見本を持たない書き出した `.html` でも起動できるよう、その色の元を替える（9 節）。
15. **起動のときの入れ口の数の告げは、行の無い理由で出ている。** `single-html-shell.ts:200-201` の `embeddedEntryCountNotOne: 'RS-15'`。`RS-15` は「この理由にまだ行が無い」である（`01-04-requirements.md:7399`）。⇒ 開く道の `.html` にも同じ場面（入れ口が無い・2 つ以上）が出るので、理由の行を 1 つ起こし、両方で使う（E-13、決定 9）。
16. **`PND-452` は開く道では問いにならない。** `OP-5` は「経路によらず `FR-023` の検証を通すこと」であり、`IO-7` が取込の方向を持てば、開く道で読んだ `.html` の文書はそのまま `OP-5` を通る（`document-file-flow.ts` の `:540` の検証は、形式を判じて復号した後に掛かる）。残るのは起動の道（`BT-1`、`single-html-shell.ts:245-285` の `embeddedStartupDocument` は検証の辺を呼ばない。`STOP` の注 `:244`）だけである（問い 2）。
17. **`GRS` 本体の `index.html` は、本書の後は見本の容れ物だけを持つ。** 書き出した `.html` は文書の容れ物だけを持つ（決定 3）。⇒ 開く道で本体そのものを開くと、文書の容れ物は無く、見本の容れ物は 1 つある。本書より前に出荷した本体は、見本をスクリプトの中に持つ（0.2 節の 2）ので、どちらの容れ物も無い。⭐ ダブルクリックで開いた本体は見本を見せる（表 T-034 の `BT-4`）—— 開く道で同じファイルが別の答え（断り）を返すと、同じファイルが開き方で違う中身になる（`JDG-993`、決定 16）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-5` ／ `GL-005`**（単一の `.html` で完結させる）—— 書き出した `.html` は既定のデータを運ばない（約 645 KB 軽くなる）。⏸ 出荷物の大きさ（約 1,444 KB）は、見本を簡素にする `PND-611` の後に下がる —— 本書はその仕組み（見本の容れ物と `MC-10`）を先に置く。
- ⭐ **`CH-1` ／ `GL-004`**（構造化した日程データを出す）—— 単一の `.html` が、渡す形であると同時に、戻ってきた日程を合流させて取り込む形になる（`UC-014`、`FR-022` の `UID` の照合）。
- ⚠️ **`CH-3` ／ `GL-003`**（ぬるサク）—— 本書では変わらない。見本は同じ 645 KB を、スクリプトの字面からではなく走らない JSON の容れ物から読む。見本を小さくして起動の仕事を減らすのは `PND-611` の後である（そのとき、起動のたびに 1000 件を通す効き目は消え、退行は `MC-10` で測ったときにだけ見える）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— ① 表 T-024 の注「開く道ではない」と `JDG-888` が食い違う → E-03 ・ E-04。② `OP-1` が形式を書き写している（表 T-024 が正）→ E-06 で表を指す形に。③ 起動の見本についての性能の注（`MC-7` より行が多い・多めに採る）は、見本が小さくなると偽になる（`PND-611`）→ その日を待たずに、測る文書の行 `MC-10`（E-14）へ移し、表 T-226 の注は指すだけにする（E-10）。④ `FR-067` の「空で起動するのではない」は、見本を持たない書き出した `.html` では次の順位が空の文書になるので偽になる → E-12。⑤ 同じ MUST を 2 か所に置かない —— `GL-002` の MUST NOT は `MC-10` の 1 か所だけにした。
- **`R1.4`（異常系・境界値）** —— ① 文書の容れ物の無い `.html` は 2 つに分かれる（`JDG-993`）: ①a `GRS` 本体の `index.html`（見本の容れ物だけを持つ）→ 開く道でも見本が開く。`OP-3` の 3 択が先に立ち、見本は `OP-5` の検証を通る（決定 16）。①b どちらの容れ物も無い `.html`（`GRS` が書いたものでない、または本書より前に出荷した本体 —— 見本はスクリプトの中）→ `RS-67`。② 文書の容れ物が 2 つ以上 → `RS-67`（起動の道も同じ）。③ `.html` の拡張子で先頭が `{` → `OP-12` の `RS-13`、先頭が `<` でも `{` でもない → `RS-12`（変わらない。`OP-12` の断りは `RS-67` より先に立つ）。④ 埋め込まれた文書が壊れている・版が新しい → `IO-2` と同じ（`RS-25` ・ `FR-073`）。⑤ 置き換えで開いた `.html` への `SK-11` → 上書きする先を持たない（E-11）。⑥ 書き出した `.html` の `BT-1` が読めない → 告げて空の文書（E-07 ・ E-12）。⑦ 大きさの上限 `S-113`（32 MB）は `.html` の全体に掛かる（本体が約 0.8 MB を占める）。
- **`R1.2`（検証できる表現）** —— 「容れ物を含めてはならない」は、書き出した字面に見本の容れ物の id が無いことで確かめられる。「開く道でも読める」は、書き出した字面を開く道に渡して `U-56` が立つことで確かめられる（5 節）。
- **`R2.21`（1 つの仕事は 1 か所）** —— 容れ物を字面から見つけ直す手は `embedded-html-codec.ts` の `containerSpans` 1 つに寄せ、書き出し・開く道の読み・起動の読みが同じ手を使う（決定 7）。版の 1 語を見本から取る所（`frame-loop.ts:220` と `single-html-shell.ts:544`）を 1 つの生成物に寄せる（決定 2）。
- **`R2.14`（POLA）** —— `formatFromFile` の「先頭の文字だけで行を引く」は、名（形式を判じる）が約束する「組で判じる」より弱い → 9 節。
- **`R2.9`（YAGNI）** —— gzip を入れない（決定 11）。
- **`R5`（性能）** —— 毎フレームの経路には触れない。`frame-loop.ts` は `import` の 1 行と引数だけが動く。⚠️ それでも規則 04 の 5 節の表は `frame-loop.ts` を毎フレームの経路に数えるので、`perf-pending.md` に 1 行が要る（8 節）。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` を `TP-`・`IO-7`・`OP-12`・`BT-4`・`BT-1`・`FR-067`・`MC-7`・「起動テンプレート」・「初期テンプレート」・「単一 HTML」・「Single HTML」で引いた（13 節）—— 当たるのは `JDG-655` ・ `JDG-711`（見本の行の高さ。見本の中身の規則として生成器に残る）・ `JDG-724`（`S-81`）・ `JDG-887`（保存の面の並び。表 T-024 の行の並びは変えないので食い違わない）・ `JDG-878` ・ `JDG-879` ・ `JDG-888` で、本書と食い違わない。`pending-decisions.md` では `PND-20`（上書きする先は往復する形式だけ。2026-09-22 に `GRS JSON` だけと仕分け済み —— 決定 8 と同じ向き）・ `PND-70`（`BT-1` の容れ物の形、分類 `D`）・ `PND-452`（問い 2）・ `PND-458`（拡張子の大小。本書は変えない）。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 見本の容れ物は、`BT-1` の容れ物（id `embedded-document`）と**別の id** を持つ | ① `BT-1` の容れ物の形は `PND-70` で分類 `D`、`Agent API` の造り手との約束（`DFC-552`）。② 同じ id を使うと、出荷した本体でも `BT-1` が勝ち（表 T-034 の順）、`OP-10` の `BT-4` の除外（起動した文書が見本かを `chosen.row === 'BT-4'` で知る、`single-html-shell.ts:513`）が効かなくなり、見本に `FR-067` の告げ（`RS-51` ・ `RS-48`）が掛かる。③ 書き出しは同じ id の容れ物を差し替えるので、書き出した `.html` から見本を消すという結果は同じになるが、①②を失う | 頁に容れ物が 2 種類ある。id は仕様に書かない（`BT-1` の id も書いていない。置き場は殻、`CP-25` の「埋め込みの入れ物を持ち」） |
| 決定 2 | 容れ物はビルドが差し込む（`vite.config.ts` に、開発サーバとビルドの両方で効く `transformIndexHtml` の差し込みを足す）。`index.html`（原稿）にも生成器にも書かせない。どのモジュールも `startup-template.json` を `import` しない。版の 1 語は生成器が別の小さな生成物に書き、`frame-loop.ts` ・ `single-html-shell.ts` ・ `document-file-flow.ts` はそれを読む | ① `import` が 1 つでも残ると、束ね手が見本をスクリプトへ戻す（0.2 節の 2）。② 開発サーバでも同じ頁の形で起動できる。③ `index.html` に 645 KB を置くと原稿が生成物になる | `vite.config.ts` が見本のファイルを読む。容れ物の字面は `<` を `<` に書き換えて入れる（`embeddedJson` と同じ作法、`</script` が出ない） |
| 決定 3 | 書き出しで見本の容れ物を外すのは `DocumentCodec`（`exportEmbeddedHtml`）とし、殻は外す容れ物の id を `AppShell` で渡す | 書き出す `.html` の形は `FR-067` の書き手 `UF-37` の仕事である。純粋な字面の操作なので試験で押せる | `AppShell`（`IF-8` の型）に欄が 1 つ増える。仕様は `AppShell` の欄を持たないので、仕様の文は動かない |
| 決定 4 | 見本を持たない `.html`（書き出したもの）で `BT-1` が読めないときは、`FR-095` が始める空の文書で起動する（E-07 ・ E-12） | `JDG-879` の直の帰結である。書き出した `.html` の `BT-1` が読めないのは、中身を手で書き換えたときだけである（書き出した本体と文書の版は同じ） | `FR-067` の「空で起動するのではない」を「何も開かずに起動するのではない」に書き換える。`CR-611` の空の文書に頼る —— ⛔ **`CR-611` はその空の文書を見本の容れ物から作ってはならない**（書き出した `.html` には容れ物が無い）。`FR-068` の土台の文書（スクリプトに入っている）と同じ作り方なら足りる |
| 決定 5 | 測る文書（`MC-10`）は、**いまの見本とバイト単位で同じ文書**（100 行 ・ 1000 タスク）とし、出荷物に入れず `tests/fixtures/` に置く。性能を測るときは、出荷ビルドの写しの見本の容れ物の中身をそれに差し替えて開く | ① 測る文書が変わらないので、段 0 との比べ（`PW-3`）も `performance-runs.md` の記録もそのまま続く —— 基準を動かさない（基準を動かすのは利用者の OK が要る）。② 容れ物は走らないので、差し替えても `PO-4` のハッシュは合い、`CSP` を外した写しも要らない。③ `BT-4` から開くので、`OP-10` の扱いも出荷の起動と同じ絵になる（`BT-1` に埋めると `OP-10` の全体表示に落ち、同じ絵にならない） | 測る道具（`tests/nfr` の 2 本、`lm-19` の探り）が写しを作る手を持つ。⏸ 本書の後も、測る文書は出荷する見本とバイト単位で同じである（同じ生成器の同じ森から書く。`CR-611` が替える題も同じ）。見本を簡素にする変更（`PND-611`）が `TP-1` ・ `TP-3` ・ `TP-4` ・ `TP-7` ・ `TP-8` を変えると、測る文書も変わる（10 節） |
| 決定 6 | `IO-7` の先頭の非空白 1 文字は `<` とし、`OP-12` の文は変えない。判別と生成器は「2 つの欄の組が 1 行に合う」で判じる | 0.2 節の 11。HTML は `<` で始まるほか無い。組は拡張子が行ごとに違うので 1 行に決まる | `IO-1` と `IO-7` が同じ `<` を持つことを表 T-024 の注に書く（E-04） |
| 決定 7 | 開く道の `.html` は、`DocumentCodec` が字面を走査して容れ物を見つけ（`containerSpans` を使う）、中身を `documentFromJson` で読む。HTML を DOM に解かない。起動の道（`BT-1`）も、起動の最初に取った頁の字面（`deliveredAppShellHtml`）を同じ手で読む | ① `FR-023` は `innerHTML` への直挿しを禁じる。他人から届いた `.html` を DOM に解く理由が無い。② 書き出しと 2 つの読みが同じ手を使う（`R2.21`）。③ 問い 2 がどちらに決まっても、起動の道に検証を掛けるのは 1 か所の呼び出しになる | 起動の道の「入れ口の数」は、id を持つ**要素**の数から、id を持つ **`script` 要素**の数に変わる（GRS が書く容れ物は `script` だけなので、GRS が書いたファイルでは同じ数になる） |
| 決定 8 | `.html` から置き換えで開いた文書の最初の `SK-11` は、上書きする先を持たない（MSPDI と同じ）。合流・重ねは上書きする先を変えない（`CR-594` のまま） | 0.2 節の 13。上書きする先は `GRS JSON` の拡張子を持つファイルだけ（`PND-20` の仕分けと同じ向き） | 最初の `SK-11` で保存先を問う。提案する名は文書名と `.json`（`FR-096`） |
| 決定 9 | 理由の行 `RS-67`（`GRS` で開ける `.html` ではない）を起こし、開く道で文書の容れ物も見本の容れ物も無い・文書の容れ物が 2 つ以上のときと、起動の道で文書の容れ物が 2 つ以上のときの両方で運ぶ。作法は `NT-1` | 0.2 節の 15。同じ場面に 2 つの理由を持たない。起動の道でいま `RS-15`（行が無い）が出ているのを閉じる。場合ごとに語を分けず、開けない `.html` には 1 つの断りを返す（`JDG-993` の「もっとシンプルに」） | 辞書に語を 1 組足す（E-17）。語は `JDG-993` が決めた —— 起草の語（「文書がちょうど 1 つ埋め込まれていない」）は、容れ物の数という中の事情を人に見せていた。断りの語は、無いのか 2 つ以上なのかを言い分けない |
| 決定 10 | 表 T-008 の `CHN-1` に単一 `.html` を足す。`CHN-2`（書き出し）にも足す | `CHN-1` は開く道の経路で、`FR-023` の検証の対象を数える所（E-05）である。`CHN-2` は `IO-7` の書き出しがいまも通る経路なのに書かれていなかった | `CHN-2` は本書の起こりではない穴である（12 節） |
| 決定 11 | gzip はいま入れない | ① `JDG-878` の gzip は、見本を簡素にして「それでだめなら」の次の手である。見本を簡素にするのは `PND-611` の答えの後（`JDG-970`）なので、gzip はその後に測って決める（0.2 節の 9 の見積もりでは、問い 1 の推奨 A なら `dist` は約 877 KB で 1 MB を割る）。② スクリプトを gzip すると、解いた字面を走らせるのに `script-src` へハッシュでない出どころ（`blob:` か `'unsafe-eval'`）が要り、表 T-232 と `NFR-009` が許さない。③ 見本だけを gzip しても、1 ファイルに入れるには base64（+33%、48,288 B → 64,384 B）が要り、読むのに `DecompressionStream` の非同期が起動の前に挟まる。小さくした見本（約 78 KB → gzip 約 6 KB）で得るものは約 70 KB | ⏸ `dist` は `PND-611` の答えまで約 1,444 KB のまま（1 MB を越えたまま）。答えが B（300 タスク）なら 1 MB を越え、gzip の問いが戻る |
| 決定 12 | 選び手・ドロップの受け付けは変えない | 0.2 節の 12。一覧が無い | — |
| 決定 13 | `Agent API` の `AM-8`（`importDocument`）には `.html` を受けさせない | `JDG-888` は人の「開く」の話である。`AM-8` の入力の形（`AgentImportSource`）を広げるのは別の変更である | 10 節 |

⭐ 次の 3 つは問うて決めた（11 節の問い 1 ・ 2 と、`RS-67` の語を見せたときの答え `JDG-993`）。問わずに決めた上の 13 と区別するために、ここに分けて置く。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 14 | 起動の道（`BT-1`）に埋め込まれた文書にも `FR-023` の検証を掛ける。掛ける呼び出しと、断ったときの手当てと、その仕様の文は `DFC-586` の時に当てる | 問い 2 の答え（`JDG-973`）。`JDG-78` により異常系の手当てはリファクタの後。決定 7 で読み手が 1 つなので、1 か所の呼び出しで済む | 本書の後も、`DFC-586` までは起動の道は検証を掛けない（`STOP` の注 `single-html-shell.ts:244` を残す） |
| 決定 15 | 出荷する見本の大きさと形は変えない（表 T-226 の `TP-2` ・ `TP-5` ・ `TP-6`、`startup-template.json` のバイト）。容れ物の仕組みと `MC-10` だけを当てる —— 問い 1 の案 D の形である | 問い 1 の答えは保留（`JDG-970`）。落ち着いてから利用者が簡素にする（`PND-611`）。仕組みを先に当てておけば、後で見本だけを替えられる | `dist` は約 1,444 KB のまま。`DFC-1348` は開いたまま |
| 決定 16 | 開く道（`Ctrl` ＋ `O` ・ドロップ、表 T-024a）で読む `.html` の順は、① 文書の容れ物（1 つならそれ、2 つ以上なら `RS-67`）→ ② 無ければ見本の容れ物 → ③ どちらも無ければ `RS-67`。⇒ `GRS` 本体の `index.html` を開くと、ほかのファイルと同じく見本の日程が開く | `JDG-993`。同じファイルは、どう開いても同じ中身を見せる —— 本体をダブルクリックすれば見本が開く（表 T-034 の `BT-4`）。安全は本書の中で既に立っている: ① `OP-3` の置き換え・合流・重ねの問いが先に立つ（合流は履歴に載り、取り消せる）② 開いた `.html` は `SK-11` の上書きする先にならない（決定 8）③ 見本はほかのファイルと同じく `OP-5` の検証を通る（`JDG-973`） | 開く道の読み手が、文書の容れ物の id に加えて見本の容れ物の id も受け付ける（読む順は `DocumentCodec` の 1 か所、SEAM-2）。⚠️ 開く道で開いた見本は `BT-4` から開いたのではないので、`OP-10` の `BT-4` の除外は掛からない —— 中身は同じで、最初の表示位置は `FR-055` の全体表示になる（`OP-10` の「別の文書を開いた時点でこの除外は解ける」のとおり）。本書より前に出荷した本体（見本はスクリプトの中、容れ物なし）は読めず、`RS-67` になる |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所（`0590ad03`） | 編集 |
|---|---|---|
| 経路に単一 `.html` | 表 T-008 の `CHN-1` ・ `CHN-2`（`01-04-requirements.md:502-503`） | E-01 ・ E-02 |
| `IO-7` を取込／書出に | 表 T-024 の `IO-7`（`:5899`）と注（`:5906-5907`） | E-03 ・ E-04 |
| 検証の対象 | `FR-023` の RATIONALE（`:6193`） | E-05 |
| 受け付ける形式 | 表 T-024a の `OP-1`（`:6436`） | E-06 |
| 見本の無い `.html` の `BT-4` | 表 T-034 の `BT-4`（`:6511`） | E-07 |
| 見本の置き場 | `FR-027`（`:6700`） | E-08 |
| 見本と性能の注 | 表 T-226 の後の注（`:6718-6720`） | E-10 |
| `.html` から開いた後の `SK-11` | `FR-096`（`:6795`） | E-11 |
| 書き出しで見本を外す・開く道で読める | `FR-067`（`:7061-7065`） | E-12 |
| 入れ口の数の理由 | 表 T-233（`:7398` の次） | E-13 |
| 測る文書 | 表 T-025（`:7825` の次） | E-14 |
| ユニットの仕事 | `05-07-design.md` 表 T-075 の `UF-37`（`:483`） | E-15 |
| 公開の名 | `_source/published-entries.json` の `PI-20`（`:1419-1427`） | E-16 |
| 理由の語 | `_source/display-words.json`（`RS-65` の次） | E-17 |
| 表 T-024a の `OP-12` ・ `OP-3` ・ `OP-5` ・ 表 T-032 ・ `FR-022` ・ `FR-060` ・ 表 T-232 ・ 状態機械 | — | 変えない |

**数**: 文の編集 14（`01-04` 13 ・ `05-07` 1。表の行を足す 2 件を含む）、原稿 JSON の編集 2。⏸ 表 T-226 の行（`TP-5` ・ `TP-6`）は変えない（元の E-09 を外した、`JDG-970`）。生成し直すもの: `exchange-formats.json`（`npm run formats`）・ `tbl-published-entries.md`（`gen:entries`）・ 画面の語（`npm run words`）・ `tbl-row-id-prefixes.md` の行数（`gen:prefixes`）。

---

## 2. 新しい識別子

| 種類 | 識別子 | 測った最大 |
|---|---|---|
| 表 T-025 の行 | `MC-10`（測る文書） | `0590ad03` で最大 `MC-9`、当てる日に測り直す |
| 表 T-233 の行 | `RS-67`（`GRS` で開ける `.html` ではない） | `0590ad03` で最大 `RS-66`、当てる日に測り直す |
| 公開の名（表 T-064 の `PI-20`） | `documentFromEmbeddedHtml` | —（`git grep` で 0 件） |

⚠️ 兄弟の `CR-610` ・ `CR-611` が同じ回に `RS-` の行を足すなら、当てる順で番号を詰め直す（`MC-` を足す兄弟は無い見込み）。
⭐ 表・接頭辞・設定値の行・状態機械・出来事は足さない。コードの側で足すファイルは `tests/fixtures/measuring-document.json`（名は仮。生成物。出荷する見本とバイト単位で同じ）と、版の 1 語の小さな生成物（9 節）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`0590ad03`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `IO-7` の方向「書出のみ」・先頭の文字「—」・備考「読む側は表 T-034 の `BT-1`」 | `01-04:5899` | 「取込 / 書出」・ `<` ・ 読む道は 2 つ | E-03 |
| 注「`OP-1` が取込で受け付ける 2 行だけ」「`IO-7` もその欄を持たない —— … 開く道ではない」 | `01-04:5906-5907` | 「取込で受け付ける行だけ」・ `IO-1` と `IO-7` が同じ `<` | E-04 |
| `OP-1` の形式の書き写し「`GRS JSON` と MSPDI XML（IO-1 / IO-2）」 | `01-04:6436` | 表 T-024 のうち取込を持つ行 | E-06 |
| `FR-027` の「バンドル済みの `GRS JSON` として持つ」 | `01-04:6700` | スクリプトと別の走らない容れ物に置く | E-08 |
| 注「`MC-7` より行が多い」「`GL-002` の判定に用いてはならない」「多めに採る」 | `01-04:6718-6720` | `MC-10` へ移る。注は指すだけ | E-10 ・ E-14 |
| `FR-067` の「空で起動するのではない」 | `01-04:7064` | 「何も開かずに起動するのではない」と見本の無い `.html` の注 | E-12 |
| `UF-37` の「単一 `.html` の書き出し」 | `05-07:483` | 書き出しと、埋め込まれた文書の取り出し | E-15 |
| コード: `import startupTemplate from './startup-template.json'` 2 か所 | `frame-loop.ts:207` ・ `single-html-shell.ts:49` | 版は小さな生成物から、見本は頁の容れ物から | 9 節 |
| コード: 見本から版を取る 2 か所 | `frame-loop.ts:220` ・ `single-html-shell.ts:544` | 版の生成物 | 9 節 |
| コード: `embeddedEntryCountNotOne: 'RS-15'` | `single-html-shell.ts:201` | `RS-67` | 9 節 |
| コード: DOM で数える起動の読み | `single-html-shell.ts:251-262` | 頁の字面を `DocumentCodec` の読み手で | 9 節 |
| コード: 先頭の文字だけで行を引く | `document-codec.ts:99-106` | 2 つの欄の組で行を引く | 9 節 |
| コード: 上書きする先から外すのは `.xml` だけ | `document-file-flow.ts:677-679` | `IO-2` の拡張子のファイルだけを上書きする先にする | 9 節 |
| 生成器: 判じる行どうしの先頭の文字の一意 | `tools/generate_exchange_formats.py:228-233` | 組の一意 | 9 節 |
| 生成器: 1 つの出力 | `tools/generate_startup_template.py:106-107` | 同じ 1 つの森から 2 つの出力（出荷する見本・測る文書。今はバイト単位で同じ）＋版の生成物。⏸ 森は足さない（`:350-351` は変えない） | 9 節 |
| 試験: 「測った文書が `TP-6` より少ない」 | `tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts:1553-1561` | `MC-10` の件数と比べる | 波 4c |
| 探り: 既定「見本は 1000 件」・「見本をそのまま測る」 | `tools/probe/examples/lm-19-frame-time-baseline.mjs:55` ・ `:291-294` | 写しの容れ物を測る文書に差し替えて開く | 波 4c |

⭐ **消さないもの**（読み直して真のまま）: `OP-12` の全文、`OP-3` ・ `OP-5` ・ `OP-6`（`IO-7` の備考が `OP-6` を指すだけ）、表 T-034 の `BT-1` ・ `BT-2` の全文（`BT-2` の「求める体験は `IO-7` と `BT-1` が既に果たす」も真）、`FR-062`、`FR-060` の ⭐ の文（`CR-594`）、表 T-226 の全行（`TP-1` 〜 `TP-8`。⏸ 見本の大きさは `PND-611` まで変えない）、`FR-068` の土台の文書の文、`MC-7` ・ `MC-9`、表 T-232。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（`0590ad03` で 16 件とも 1 回。13 節）。ファイルの改行は、4 つとも LF（CRLF は 0）。
⚠️ 行の末の 2 つの空白（段落の中の改行）も旧と新の一部である。見出しに `partial` と書いた編集は行の一部の置き換えで、塊の末の改行を旧にも新にも含めない。
⏸ E-09（表 T-226 の `TP-5` ・ `TP-6` を小さくする編集）は外した —— 問い 1 は保留（`JDG-970`、`PND-611`）。番号は詰めない（兄弟の変更要求と 13 節の記録が E-10 以降を同じ番号で引く）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
表 T-008 の `CHN-1`。旧
```text
| CHN-1 | DEV-2 | DEV-1 | `GRS JSON` / MSPDI XML | ファイル選択またはドラッグ＆ドロップ | **信頼できない** |
```
新
```text
| CHN-1 | DEV-2 | DEV-1 | `GRS JSON` / MSPDI XML / 単一 `.html` | ファイル選択またはドラッグ＆ドロップ | **信頼できない** |
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
表 T-008 の `CHN-2`。旧
```text
| CHN-2 | DEV-1 | DEV-2 | `GRS JSON` / MSPDI XML / SVG / PNG | ダウンロード | 該当なし（送信のみ） |
```
新
```text
| CHN-2 | DEV-1 | DEV-2 | `GRS JSON` / MSPDI XML / 単一 `.html` / SVG / PNG | ダウンロード | 該当なし（送信のみ） |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
表 T-024 の `IO-7`。旧
```text
| IO-7 | 単一 `.html` | 書出のみ | `.html` | — | 本体と文書をまとめて 1 つのファイルで渡す（`FR-067`） | 読む側は表 T-034 の `BT-1` |
```
新
```text
| IO-7 | 単一 `.html` | 取込 / 書出 | `.html` | `<` | 本体と文書をまとめて 1 つのファイルで渡す（`FR-067`）。<br>渡した相手が埋めた文書を取り込む | 読む道は 2 つ —— 起動時は表 T-034 の `BT-1`、開くときは表 T-024a である（開くときに読む容れ物の順と、開かずに断る場合は `FR-067`）。<br>どちらも埋め込まれた `GRS JSON` を読み、読んだ後の扱いは `IO-2` と同じとする（`OP-6`・表 T-032 の `MG-12`） |
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
表 T-024 の後の注。旧
```text
先頭の非空白 1 文字の欄を持つのは、`OP-1` が取込で受け付ける 2 行だけである —— 判別（表 T-024a の `OP-12`）はその 2 行のためにあり、書出だけの形式は判別されない。  
**`IO-7` もその欄を持たない** —— 埋め込まれた文書を読むのは表 T-034 の `BT-1` であって、開く道ではない。  
```
新
```text
先頭の非空白 1 文字の欄を持つのは、`OP-1` が取込で受け付ける行だけである —— 判別（表 T-024a の `OP-12`）はそれらの行のためにあり、書出だけの形式は判別されない。  
⚠️ **`IO-1` と `IO-7` は同じ `<` で始まる** —— 1 行を決めるのは 2 つの欄の組であり、拡張子は行ごとに違うので、組も行ごとに違う。  
⚠️ 先頭の文字だけでは行が決まらない —— `OP-12` が両方の合致を求めるのは、このためでもある。  
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
`FR-023` の RATIONALE。旧
```text
**RATIONALE**: 検証の対象は表 T-008 の CHN-1・CHN-3・CHN-5 —— `GRS JSON`、MSPDI XML、localStorage から読み戻す別枠の設定値、`Agent API` からの入力である。  
```
新
```text
**RATIONALE**: 検証の対象は表 T-008 の CHN-1・CHN-3・CHN-5 —— `GRS JSON`、MSPDI XML、単一 `.html` に埋め込まれた `GRS JSON`、localStorage から読み戻す別枠の設定値、`Agent API` からの入力である。  
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
表 T-024a の `OP-1`。旧
```text
| OP-1 | 受け付ける形式 | `GRS JSON` と MSPDI XML（表 T-024 の IO-1 / IO-2） |
```
新
```text
| OP-1 | 受け付ける形式 | 表 T-024 のうち、方向に取込を持つ行 |
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
表 T-034 の `BT-4`（⛔ `CR-611` の後に当てる）。旧
```text
| BT-4 | 3 | 初期表示用のテンプレート（`FR-027`） |
```
新
```text
| BT-4 | 3 | 初期表示用のテンプレート（`FR-027`）。<br>⚠️ テンプレートを持たない `.html`（`FR-067` が書き出したもの）では、`FR-095` が始める空の文書（表 T-342）とする |
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
`FR-027` の置き場の文。旧
```text
テンプレートはバンドル済みの `GRS JSON` として持つこと（MUST）。  
```
新
```text
テンプレートは `GRS JSON` として持ち、出荷する単一の `.html` の中に、スクリプトとは別の、走らない JSON の容れ物として置くこと（MUST）。  
⛔ スクリプトに束ねてはならない（MUST NOT） —— 束ねると `FR-067` の書き出しがテンプレートを外せない。  
外せばスクリプトの本文が変わり、表 T-232 の `PO-4` のハッシュが合わなくなる。  
⭐ 走らない容れ物は `PO-4` のハッシュの対象ではないので、書き出しで外しても、性能を測るために中身を差し替えても（表 T-025 の `MC-10`）、ハッシュは変わらない。  
```

⏸ **E-09 は外した**（表 T-226 の `TP-5` ・ `TP-6` は変えない。問い 1 は保留、`JDG-970`、`PND-611`）。

<!-- EDIT id=E-10 file=docs/spec/01-04-requirements.md -->
表 T-226 の後の注。⭐ 見本が 1000 件のままでも新の文は真である —— 測る文書は `MC-10` が持ち、`GL-002` の判定は `MC-7` が持つ。見本を簡素にする日（`PND-611`）に偽になる注を、先に `MC-10` へ移しておく。旧
```text
⚠️ **本テンプレートは表 T-025 の `MC-7` より行が多い**（100 行 対 50 行）。  
⛔ したがって `GL-002`（1 画面に収まる）の判定に用いてはならない（MUST NOT） —— 判定は `MC-7` の規模で行う。  
⭐ 多めに採るのは、起動のたびに目標規模を超える文書が通ることになり、性能の退行がすぐ出るためである。
```
新
```text
⭐ **本テンプレートは、性能を測る文書でも、`GL-002`（1 画面に収まる）を判定する文書でもない** —— 測る文書は表 T-025 の `MC-10`、判定の規模は同表の `MC-7`（`FR-055`）が持つ。
```

<!-- EDIT id=E-11 file=docs/spec/01-04-requirements.md -->
`FR-096` の `SK-11` の段の末（⛔ `CR-610` の後に数え直す）。旧
```text
⚠️ **MSPDI で開いた文書の最初の `SK-11` は上書きする先を持たない**ので、保存先を問うことになる —— `FR-060` の上書きが成り立つのは、その文書を `GRS JSON` として一度保存した後である。
```
新
```text
⚠️ **MSPDI で開いた文書の最初の `SK-11` は上書きする先を持たない**ので、保存先を問うことになる —— `FR-060` の上書きが成り立つのは、その文書を `GRS JSON` として一度保存した後である。  
⚠️ **単一 `.html`（表 T-024 の `IO-7`）から置き換えで開いた文書も同じである** —— `SK-11` が書く `GRS JSON` でその `.html` を上書きすると、本体を持つファイルが本体の無い `GRS JSON` に変わり、同じ名のままでは `OP-12` に断られる。
```

<!-- EDIT id=E-12 file=docs/spec/01-04-requirements.md -->
`FR-067` の本文。旧
```text
埋め込まれた文書が読み取れないとき、または入れ口が 1 つでないときは、黙って捨てずに通知すること（MUST）。  
そのうえで**表 T-034 の次の順位へ降りる** —— 空で起動するのではない。  
黙って捨てると、渡した側は届いたと思い、受け取った側は空だと思う。
```
新
```text
埋め込まれた文書が読み取れないとき、または入れ口が 1 つでないときは、黙って捨てずに通知すること（MUST）。  
入れ口が 2 つ以上あるときに運ぶ理由は、表 T-233 の `RS-67` とする（起動の道でも開く道でも同じ）。  
そのうえで**表 T-034 の次の順位へ降りる** —— 何も開かずに起動するのではない。  
⚠️ 書き出した `.html` はテンプレートを持たないので（下の ⛔）、そこでの次の順位は表 T-034 の `BT-4` の注のとおり空の文書である —— 告げてから開くので、受け取った側は空である理由を知る。  
黙って捨てると、渡した側は届いたと思い、受け取った側は空だと思う。

⛔ 書き出す `.html` に、初期テンプレート（`FR-027`）の容れ物を含めてはならない（MUST NOT） —— 書き出した `.html` は埋め込んだ文書を表 T-034 の `BT-1` で開くので、テンプレートは使われず、ファイルを大きくするだけである。  
⭐ 書き出した `.html` は、開く道（`FR-087`）でも読めること（MUST） —— 渡した相手が埋めた日程を、元の計画へ合流させて取り込むためである（`FR-022`）。  
⭐ 開く道では、埋め込まれた文書の入れ口を読み、それが無ければ初期テンプレートの容れ物を読むこと（MUST） —— 同じファイルは、どう開いても同じ中身を見せる。  
`GRS` 本体の `.html` を開けば、ダブルクリックで開いたときと同じテンプレートが開く。  
⛔ どちらも無い `.html` は開かず、表 T-233 の `RS-67` を告げる —— `GRS` で開ける `.html` ではない。  
読み方は表 T-024 の `IO-7` と表 T-024a に従う。
```

<!-- EDIT id=E-13 file=docs/spec/01-04-requirements.md -->
表 T-233 に `RS-67` を足す（`RS-65` の次、`RS-15` の前）。旧
```text
| RS-65 | 日程の画像をデータ化するプロンプトをクリップボードへ写した | `NT-5` | `FR-068` |
```
新
```text
| RS-65 | 日程の画像をデータ化するプロンプトをクリップボードへ写した | `NT-5` | `FR-068` |
| RS-67 | `GRS` で開ける `.html` ではない（利用者の文書の容れ物も見本の容れ物も無い、または文書の容れ物が 2 つ以上） | `NT-1` | `FR-067` |
```

<!-- EDIT id=E-14 file=docs/spec/01-04-requirements.md -->
表 T-025 に `MC-10` を足す（`MC-9` の次）。旧
```text
| MC-9 | 計算量の伸び方（`NFR-013`）を測る規模 | タスク数を `1×` / `2×` / `4×` / `8×` の 4 段階に変え、同じ操作を 1 段階ごとに 3 回測って中央値を採る |
```
新
```text
| MC-9 | 計算量の伸び方（`NFR-013`）を測る規模 | タスク数を `1×` / `2×` / `4×` / `8×` の 4 段階に変え、同じ操作を 1 段階ごとに 3 回測って中央値を採る |
| MC-10 | **測る文書** | 初期テンプレート（`FR-027`）と同じ生成器が同じ回に起こし、すべて開いたとき 100 行・ 1000 `Task` とすること（MUST）。<br>題材・工程・行の木・ 1 行あたりのタスク・深さは表 T-226 の `TP-1`・`TP-3`・`TP-4`・`TP-7`・`TP-8` に従い、期間は 3 年とする。<br>⛔ 出荷物に含めてはならない（MUST NOT） —— 含めると、表 T-043 の `PG-7` が記録する出荷物の大きさを、測るための文書が膨らませる。<br>⭐ 測るときは、出荷ビルドの写しの初期テンプレートの容れ物（`FR-027`）の中身を本行の文書に差し替えて開くこと（MUST） —— 表 T-034 の `BT-4` から開くので、表 T-024a の `OP-10` の扱いも出荷の起動と同じになる。<br>⚠️ `MC-7` より行が多い（100 行 対 50 行）ので、`GL-002`（1 画面に収まる）の判定に用いてはならない（MUST NOT） —— 判定は `MC-7` の規模で行う。<br>⭐ 多めに採るのは、目標規模を超える文書で測り、性能の退行を早く出すためである |
```

<!-- EDIT id=E-15 file=docs/spec/05-07-design.md -->
表 T-075 の `UF-37`。旧
```text
| UF-37 | `DocumentCodec` | `embedded-html-codec.ts` | `semi-pure-b` | 単一 `.html` の書き出し | `FR-067`（`OW-2`） |
```
新
```text
| UF-37 | `DocumentCodec` | `embedded-html-codec.ts` | `semi-pure-b` | 単一 `.html` の書き出しと、埋め込まれた文書の取り出し | `FR-067`（`OW-2`） |
```

<!-- EDIT id=E-16 file=docs/spec/_source/published-entries.json -->
`PI-20` の名に `documentFromEmbeddedHtml` を足す（`exportEmbeddedHtml` の次）。旧
```text
     "name": "exportEmbeddedHtml",
     "note": {
      "ja": [
       "`semi-pure-b`。",
       "表 T-024 の `IO-7`"
      ]
     }
    },
```
新
```text
     "name": "exportEmbeddedHtml",
     "note": {
      "ja": [
       "`semi-pure-b`。",
       "表 T-024 の `IO-7`"
      ]
     }
    },
    {
     "name": "documentFromEmbeddedHtml",
     "note": {
      "ja": [
       "`pure`。",
       "単一 `.html` の字面から、埋め込まれた文書を読む。",
       "表 T-024 の `IO-7`"
      ]
     }
    },
```

<!-- EDIT id=E-17 file=docs/spec/_source/display-words.json -->
`RS-67` の語を足す（`RS-65` の次、`RS-15` の前）。語は `JDG-993` が決めた（0.1 節）。旧
```text
   "rowId": "RS-65",
   "text": {
    "ja": "クリップボードに貼り付けたプロンプトをAIに渡してください。",
    "en": "Paste the prompt from the clipboard into an AI."
   },
   "nextStep": {
    "ja": "冒頭部分は適宜編集してください。",
    "en": "Edit its opening part as needed."
   }
  },
```
新
```text
   "rowId": "RS-65",
   "text": {
    "ja": "クリップボードに貼り付けたプロンプトをAIに渡してください。",
    "en": "Paste the prompt from the clipboard into an AI."
   },
   "nextStep": {
    "ja": "冒頭部分は適宜編集してください。",
    "en": "Edit its opening part as needed."
   }
  },
  {
   "rowId": "RS-67",
   "text": {
    "ja": "このファイルは GRS で開ける .html ではありません",
    "en": "This file is not an .html that GRS can open"
   },
   "nextStep": {
    "ja": "GRS のヘッダーの書き出しで作ったファイルか、ファイルの出どころを確かめてください",
    "en": "Check that it was written out from the GRS header, or where the file came from"
   }
  },
```

当てた後に打つもの: `npm run gen` → `npm run gen:check`（`exchange-formats.json` の `IO-7` が `".html"` ／ `"<"` になり、`tools/generate_exchange_formats.py` は 9 節の直しが先に要る —— 直さずに打つと「two rows of table T-024 share a first non-blank character」で止まる）→ `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh`（⚠️ check 42 は波 4b が引用を書き直すまで赤になる —— 8 節）。

---

## 5. 継ぎ目 —— 仕様だけを読む試験の体に渡す

```
SEAM-1 (format detection, OP-12 with T-024 IO-7)
- formatFromFile(fileName, text) in src/adapter/document-codec/document-codec.ts
  answers { ok: true, format: 'singleHtml' } for a name ending '.html' whose first
  non-blank character (after a BOM) is '<'. '.xml' + '<' stays 'mspdi'.
  '.html' + '{' is a mismatch (the two columns name different rows, RS-13).
  The row is chosen by the PAIR (extension, first character), never by one column.

SEAM-2 (reading an embedded document, new public name, PI-20)
- documentFromEmbeddedHtml(html: string, elementIds: readonly string[], greatestKnownVersion: string)
  in src/adapter/document-codec/embedded-html-codec.ts, re-exported by document-codec.ts.
  Scans the text (no DOM). The ids are tried in the order given; the first id that
  names at least one <script ... id="<id>"> element decides: exactly one -> the
  answer documentFromJson gives for its text; two or more ->
  { ok: false, reason: 'entryCountNotOne', entryCount }. No id names any element ->
  { ok: false, reason: 'entryCountNotOne', entryCount: 0 }.
  The open route passes [the embedded document's id, the startup template's id]
  (the read order of FR-067, ruling JDG-993); the start-up route (BT-1) passes
  [the embedded document's id] only.
  Round trip: documentFromEmbeddedHtml(exportEmbeddedHtml(...).html, [id], v) gives the
  exported document back (equal after the codec's normalisation).

SEAM-3 (export leaves the template out, FR-067 MUST NOT)
- exportEmbeddedHtml(source, document): AppShell (IF-8 type, app-shell-source.ts)
  gains one member naming the ids of the containers to leave out (the startup
  template's). The written html holds no element with those ids and exactly one
  container with embeddedDocumentElementId. The module script's text is unchanged
  byte for byte (so PO-4's hash still matches).

SEAM-4 (open route, FR-087 / OP-3 / FR-022 / FR-096)
- frameLoop(...) with a FileStore double whose readFileToOpen answers
  { fileName: 'x.html', text: <an exported .html> }: SK-10 -> U-56 stands (OP-3).
  IC-72 (merge) -> U-61 (Difference Review) lists the Tasks whose UID matches.
  IC-71 (replace) -> then SK-11 asks for a destination (saveFile with a chosen
  destination, never 'openedFile'), like a document opened from MSPDI.
  A file 'y.html' holding neither container (an .html GRS did not write, or an
  index.html shipped before CR-612, whose template sits inside the module script)
  -> documentOpenFailed, RS-67 told (NT-1). Two document containers -> RS-67.

SEAM-4a (opening the app's own index.html, FR-067 read order, ruling JDG-993)
- readFileToOpen answers { fileName: 'index.html', text: <dist/index.html as shipped
  by this CR> } (the startup template's container, no document container):
  SK-10 -> U-56 stands first (OP-3), never a refusal.
  IC-71 (replace) -> the current document is the startup template (table T-226:
  100 rows, 1000 Task), having passed OP-5 like any file; the first view is
  FR-055's fit (OP-10: opened, not BT-4). SK-11 afterwards asks for a destination.
  IC-72 (merge) -> lands on the history like any merge; undo gives back the
  document before it.

SEAM-5 (the shipped build, FR-027 / MC-10)
- dist/index.html holds exactly one non-module <script type="application/json">
  carrying the startup template (id chosen by the build, not 'embedded-document'),
  and the module script's text does not contain the template's project title.
- The template carried there matches table T-226; tests/fixtures/<measuring doc>
  holds 100 rows and 1000 Task (MC-10) and is not in dist.
- The shipped template keeps its size (JDG-970: on hold, PND-611): it still holds
  100 rows and 1000 Task, and the measuring document has the same bytes.

SEAM-6 (start-up, T-034)
- An exported .html whose embedded document cannot be read: told, then the empty
  document of FR-095 (after CR-611). Two containers with the embedded id: RS-67.
```

---

## 6. グラフ（`0590ad03`）

### 6.1 `impact.py`

| 対象 | 届く先 | 読んだ結果 |
|---|---|---|
| `IO-7` | 要求 3 ／ 参照 7 —— `FR-021`（`:5907`）・ `FR-025`（`:6381` `IX-2` ・ `:6386` `IX-7`）・ `FR-062`（`:6510` `BT-2`）・ `05-07:613`（`IF-8`）・ `tbl-glossary.md:385`（`AM-15`）・ `tbl-published-entries.md:38`（`PI-20`） | `:5907` は E-04。`IX-2` ・ `IX-7`（絵でない交換形式）・ `BT-2` ・ `IF-8` ・ `AM-15` は真のまま。`PI-20` は E-16 |
| `OP-12` | 要求 3 ／ 参照 9 —— `FR-021:5906`・ `FR-087:6450-6451`・ `FR-076:7349-7351`（`RS-11` 〜 `RS-13`）・ `PI-20` ・ 状態機械の 2 か所 | `:5906` は E-04。ほかは真のまま（`OP-12` の文は変えない） |
| `FR-067` | 要求 3 ／ 参照 9 —— `FR-021:5899`・ `FR-087:6450`・ `FR-062:6503`・ `05-07` の `CP-20` ・ `CP-25` ・ `UT-5` ・ `UT-6` ・ `UF-37` ・ `AM-15` | `:5899` は E-03。`CP-20` は既に「相互変換する」。`UF-37` は E-15 |
| `FR-022` | 要求 6 ／ 参照 26 | 本書は `FR-022` を指すだけで変えない |
| `BT-1` | 要求 4 ／ 参照 7 | E-03 が新しく指す。`BT-1` は変えない |
| `BT-4` | 要求 3 ／ 参照 6 —— `FR-087`（`OP-10`）・ `FR-095:6831`・ `FR-063:6910`（`ED-3`）・ `05-07:749` ・ `:757`（`RD-7`）・ `tbl-glossary.md:528` | `OP-10` の除外は、見本から開いたか（`BT-4` の行）で決まり、E-07 の空の文書は `Task` を持たないので `OP-10` の「`Task` を 1 件も持たない文書」の文に当たる。`RD-7` ・ `FR-095` は `CR-611` の持ち場 |
| `TP-2` ・ `TP-5` ・ `TP-6` | 0 ／ 0 | 浮いた行（指す所が無い）。試験だけが読む（`tests/nfr/nfr-002…:191`・ `tests/unit/fr-027…:464-467`） |
| `MC-7` | 要求 3 ／ 参照 6 —— `FR-055:5436`・ `FR-027:6714` ・ `:6718-6719`・ `FR-092:7140`・ `tbl-settings.md:607`（`S-114`） | `:6718-6719` は E-10 で `MC-7` を指さなくなり、`MC-10`（E-14）が指す。`:6714`（`TP-6`）は E-09 を外したので `MC-7` を指したまま —— 見本が 1000 件のうちは真である（`PND-611`） |
| `FR-027` | 要求 3 ／ 参照 5 —— `FR-062:6511`・ `FR-095:6838`・ `FR-068:7091`・ `05-07:575` ・ `:1666` | `FR-068` の土台の文書は「初期テンプレートと同じ版と同じ `documentSettings`」で、置き場の文に頼らない。真のまま |
| `CHN-1` | 要求 4 ／ 参照 5 —— `FR-023:6193`・ `FR-087:6437`（`OP-2`）・ `FR-062:6510`・ `NFR-009:8109`・ 状態機械 | `:6193` は E-05。ほかは真のまま |

### 6.2 `induced.py`

```
seeds: IO-7 OP-12 FR-067 FR-022 BT-1 BT-4 TP-2 TP-5 TP-6 MC-7
-> 10 of 10 resolved, 4 edges inside the seed set, 0 cycles
```

⇒ 閉路 0。表 T-024 は塊「開くと合流」（表 T-024 ・ T-024a ・ T-032）に属する —— 塊を読み直した（`OP-1` 〜 `OP-15`、`MG-1` ・ `MG-12`）。変えるのは `OP-1` だけで、`MG-12`（`GRS JSON` を合流させた）は E-03 の備考が指す。

---

## 7. 数の予測（`0590ad03`。当てた後に同じ数え方で突き合わせる）

| 数 | `0590ad03` | 当てた後 | 差 | 数え方 |
|---|---:|---:|---:|---|
| tables / figures / rows / uids（`md-checks.py`） | 212 / 29 / 2685 / 176 | 212 / 29 / 2687 / 176 | rows ＋2（`MC-10` ・ `RS-67`） | 13 節 |
| 表 T-025 の行 | 9 | 10 | ＋1 | `^| MC-` |
| 表 T-233 の行 | 61 | 62 | ＋1 | `^| RS-` |
| `（MUST）` ・ `（MUST NOT）` の印（`01-04`、出現の数） | 2,234 | 2,241 | ＋7（E-08 ＋1、E-10 −1、E-12 ＋3、E-14 ＋4。E-12 の ＋1 は `JDG-993` の読む順の MUST） | 13 節の `verify.py` が写しに当てて数えた |
| `exchange-formats.json` の `IO-7` | `".html"` ／ `null` | `".html"` ／ `"<"` | — | `npm run formats` |
| `dist/index.html` | 1,444,325 B | 約 1,444 KB のまま | ほぼ 0 —— 見本は JS の字面（645,394 B）から JSON の容れ物（詰めた JSON で 645,474 B）へ移るだけ | 0.2 節の 1（見積もり）。⏸ 下がるのは `PND-611` の後 |
| 書き出した `.html` | 本体＋見本＋文書 | 本体（約 799 KB）＋文書 | 見本の分（約 645 KB） | 同上 |
| 表 T-226 の行 ・ `startup-template.json` | 8 行 ・ 今のバイト | 同じ | 0 | ⏸ 変えない（`JDG-970`）。`CR-611` が替える題だけが動く |

---

## 8. 波 —— 持ち場で割る

⭐ **仕様の文（波 1）は、持ち場 L4 が合流した後に 1 回で当てる**（`docs/development-records/cr-plan-2026-09-26.md` の W0 〜 W5 と同じ）。コードは 2 と 3 を同じ回に入れる —— 2 だけでは `frame-loop.ts:207` が見本を束ね続け、3 だけでは容れ物が無い。

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（16 件とも 1 回）。`CR-611` ・ `CR-610` が当たったかを見る。問いの答えは受けてある（`JDG-970` 保留 ・ `JDG-973` ・ `JDG-993`）。`JDG-993` が本当の番号に置き換わっていることを見る。`RS-67` ・ `MC-10` の番号を測り直す | 調整役 |
| 1 | 仕様の文（`01-04` ・ `05-07` ・ `_source/published-entries.json` ・ `_source/display-words.json`） | E-01 〜 E-17（E-09 を除く 16 件）。変更履歴に 1 行 | 仕様の持ち場 |
| 2a | 生成器: `tools/generate_startup_template.py` ・ `tools/generate_exchange_formats.py` ・ 生成物 | 同じ森から見本と測る文書の 2 つの出力を書く（今はバイト単位で同じ）。版の 1 語の生成物。判別の組の一意（9 節）。⏸ 森は足さない | 実装の体 |
| 2b | ビルド: `vite.config.ts` | 容れ物の差し込み（9 節） | 2a と同じ体 |
| 2c | `DocumentCodec`: `embedded-html-codec.ts` ・ `document-codec.ts` ・ `app-shell-source.ts` | SEAM-1 〜 SEAM-3 | 実装の体 |
| 2d | 殻（L4 の外）: `single-html-shell.ts` ・ `document-file-flow.ts` | 見本を容れ物から読む・ `BT-1` を同じ読み手で読む・ `RS-67` ・ `.html` の復号・上書きする先 | 2c と同じ体 |
| 3 | **L4 の持ち場**: `frame-loop.ts` | `:207` の `import` を消す・ `:220` の版を生成物から・ `RS-67` の理由と作法（`:490` 付近の型、`:548` 付近の `NT` の表）。⛔ **L4 の合流を待つ** | 2d と同じ体。`cross-lane: frame-loop.ts for CR-612` の 1 コミットに分ける |
| 4b | 仕様だけを読む試験の体 | SEAM-1 〜 SEAM-6（SEAM-4a を含む）の新しい試験。変わった文を引く試験の書き直し: `tests/unit/fr-027-startup-shows-its-depth.test.ts`（`:110` 「バンドル済み」・ `:576-577` 「より行が多い」）・ `tests/unit/uf-47-48-choosers.test.ts:2451`・ `tests/nfr/nfr-002…:1675-1676`・ `tests/unit/uf-37-38.test.ts:30` ・ `:379`（`IO-7` は書出だけ）・ `tests/unit/uf-41-42.test.ts:36`（`comesIn: false`）・ `tests/contract/if-3-file-store.test.ts:637`（形式の名）・ `tests/unit/io-7-bt-1-the-exported-file-reopens-itself.test.ts`（見本の読み方） | 別の体（実装した体に書かせない） |
| 4c | 測る道具: `tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts` ・ `tests/nfr/nfr-001-010-011-013-the-rest-of-chapter-7.test.ts` ・ `tools/probe/examples/lm-19-frame-time-baseline.mjs` | 出荷ビルドの写しを作り、見本の容れ物の中身を測る文書に差し替えて開く（`MC-10`）。`:1556` の比べを `MC-10` の件数に | 4b と別の体 |
| 5 | ― | 実物で確かめる: `dist` の大きさ（`PG-7`）、容れ物が 1 つでハッシュが合う（`SWS-8`）、書き出した `.html` に見本が無い、その `.html` を別の `dist` の「開く」で開き、置き換え・合流（`U-61` に `UID` の一致が並ぶ）・重ねを押す、置き換えの後の `Ctrl` ＋ `S` が保存先を問う。`dist/index.html` そのものを開く道で開き、`OP-3` の問いの後に見本が開く。容れ物の無い `.html` が `RS-67` の語で断られる。性能を `PW-3` で測る | 調整役 |

- ⚠️ `frame-loop.ts` に触れるので、規則 04 の 5 節 `PW-2` により `perf-pending.md` に 1 行が要る（調整役が書く）。測る文書が変わらないので、段 0 との比べはそのまま成り立つ（決定 5）。
- ⚠️ 1 と 4b は同じ合流で当てる —— 1 だけでは check 42 が引用の書き直し待ちで赤になる。
- ⚠️ 2a の測る文書は、出荷する `startup-template.json` とバイト単位で同じであることを生成器の `--check` で確かめる（決定 5 の前提）。
- ⏸ 元の波 4a（見本のファイルを読む 127 本の試験を測る文書へ向け直す）は外した —— 見本の中身が変わらないので、どれも今のまま通る。向け直すのは見本を簡素にする変更（`PND-611`）の回である。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`0590ad03` の行番号）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `tools/generate_startup_template.py` | 出力先を 2 つにする: いまの 1 つの森（100 行 ・ 1000 件 ・ 3 年）から ① 出荷する見本 → `src/framework/single-html-shell/startup-template.json`（バイト単位で今のまま）、② 測る文書（`MC-10`）→ `tests/fixtures/measuring-document.json`（名は仮。① と同じバイト）。⏸ 森を足さない —— 見本を簡素にするのは `PND-611` の答えの後である。版の 1 語（`SCHEMA_VERSION`）を小さな生成物に書く（置き場は体が決め、`frame-loop.ts` ・ `single-html-shell.ts` ・ `document-file-flow.ts` がそこから読む）。`--check` は 3 つとも見る。`generate_image_to_grs_json_prompt.py` の `import generate_startup_template as startup`（`:44`）が使う `Builder` ・ `settings_defaults` ・ `SCHEMA_VERSION` の形は保つ | いいえ |
| `tools/generate_exchange_formats.py` | `:228-233` の「先頭の文字の一意」を「（拡張子、先頭の文字）の組の一意」に替える（`:234-240` の拡張子の一意は残す）。`$comment` の文を合わせる（`DFC-1427`） | いいえ |
| `vite.config.ts` | `transformIndexHtml`（開発サーバとビルドの両方）で `<script type="application/json" id="<見本の id>">…</script>` を `</body>` の前に差し込む。字面は見本の JSON を詰め、`<` を `<` に。見本のファイルが無い・JSON として読めないならビルドを止める。`inlineBuiltAssetsIntoHtml` のハッシュの対象（`type="module"` だけ）は変えない | いいえ |
| `src/adapter/document-codec/embedded-html-codec.ts` | `documentFromEmbeddedHtml` を足す（渡された id を順に試し、`containerSpans` で最初に見つかった id の容れ物が 1 つなら、開始タグの `>` から閉じタグの前までを `documentFromJson` へ。2 つ以上・どの id も無いなら `entryCountNotOne`。SEAM-2）。読む順はこの 1 か所が持ち、呼ぶ側は id の並びを渡すだけ（決定 16）。`exportEmbeddedHtml` は `AppShell` が名指す id の容れ物を外してから文書の容れ物を置く | いいえ |
| `src/adapter/document-codec/document-codec.ts` | `ExchangeFormat` に `'singleHtml'`、`ROW_OF_FORMAT` に `IO-7`。`formatFromFile` は組で行を引く（`:99-106`）。`documentFromEmbeddedHtml` を再公開（`PI-20`） | いいえ |
| `src/adapter/document-codec/app-shell-source.ts` | `AppShell` に外す容れ物の id の欄を 1 つ | いいえ |
| `src/framework/single-html-shell/single-html-shell.ts` | `:49` の `import` を消す。見本は頁の容れ物から読む（無ければ見本なし —— `BT-4` は `FR-095` の空の文書）。`:367-371` の色の元を、見本が無ければ空の文書に。`embeddedStartupDocument`（`:245-285`）は `deliveredAppShellHtml` を `documentFromEmbeddedHtml` で読む（渡す id は文書の容れ物の 1 つだけ。0 件なら `BT-4` へ降りる）。`:201` を `RS-67` に。`appShellSource`（`:152-168`）が見本の id を渡す。`:544` の版を生成物から | いいえ |
| `src/framework/single-html-shell/document-file-flow.ts` | `decodedDocument`（`:208-237`）に `'singleHtml'`（`documentFromEmbeddedHtml` に [文書の容れ物の id, 見本の容れ物の id] の順で渡す → 読めれば `IO-2` と同じ答え。文書の容れ物が無ければ見本の容れ物へ落ちる —— 本体の `index.html` は見本を返し、その後は `OP-5` → `OP-3` をほかのファイルと同じく通る。`entryCountNotOne` なら `RS-67` の断り）。見本の容れ物の id は、`single-html-shell.ts` が `appShellSource` に渡すのと同じ 1 つの定数から取る（決定 16）。`isOverwritableOpenedFile`（`:677-679`）を「`IO-2` の拡張子で終わる名だけ」に。`:124-130` の `TRAP` の注の対（`document-codec.ts` の地図）を合わせる | いいえ |
| `src/framework/single-html-shell/frame-loop.ts`（⛔ L4 を待つ） | `:207` の `import` を消し、`:220` の `GREATEST_KNOWN_SCHEMA_VERSION` を生成物から。`RS-67` を理由の型と作法の表に | ⚠️ ファイルは表の上で毎フレームの経路（`PW-2`）。動くのは `import` と定数だけ |
| `tests/nfr/*` ・ `tools/probe/examples/lm-19-frame-time-baseline.mjs` ・ 変わった文を引く試験 | 8 節の波 4b ・ 4c（⏸ 見本を読む 127 本は向け直さない） | いいえ |

---

## 10. ⛔ この変更でやらないこと

- `BT-1` の容れ物の id ・形（`PND-70`、分類 `D`）を変えない（決定 1）。
- `OP-12` の文、`OP-3` の 3 択、`FR-022` の照合、`FR-060` の上書きの規則（`CR-594`）を変えない。
- gzip を入れない（決定 11）。
- `Agent API` の `AM-8` に `.html` を受けさせない（決定 13）。`AM-15` は変えない。
- 表 T-024 の行の並び（`FR-096` の選択面の並び、`JDG-887` の 2 段の格子）を変えない。
- 見本の題（`CR-611` が変える）・ `FR-095` ・ 表 T-036 に触れない。
- ⏸ **出荷する見本の大きさと形を変えない**（表 T-226 の `TP-2` ・ `TP-5` ・ `TP-6`、`startup-template.json` のバイト）—— 問い 1 は保留（`JDG-970`）であり、`PND-611` の答えが出るまで見本は 1000 件のまま、バイト単位で今のまま（`CR-611` が替える題を除く）。生成器に 2 つ目の森を足さず、見本を読む試験を向け直さない。見本を簡素にするのは、落ち着いてから利用者が決める —— そのとき `MC-10` は既に見本から分かれているので、性能の基準を動かさずに見本だけを替えられる。
- ⚠️ 見本を簡素にする変更が `TP-1` ・ `TP-3` ・ `TP-4` ・ `TP-7` ・ `TP-8` まで変えるなら、`MC-10` がそれらを指すので測る文書も変わり、`PW-3` の比べの前提が動く —— そのときは利用者に基準の扱いを問う（規則 04 の `PW-4` の ③）。
- 起動の道（`BT-1`）に `FR-023` の検証を掛ける呼び出し・断ったときの手当て・その仕様の文（表 T-008 の起動の経路の行を含む）は当てない —— 問い 2 の答えは「掛ける」（`JDG-973`）だが、当てるのは `JDG-78` のとおり `DFC-586` の時である（決定 14）。それまで `STOP` の注を残す。

---

## 11. 前に立つ者へ返す問い

⭐ **2 つとも 2026-10-01 に答えを得た**（逐語は 0.1 節）—— 問い 1 は保留（`JDG-970`）、問い 2 は推奨（`JDG-973`）。

| 問い | 案 | 推し ／ 答え |
|---|---|---|
| **問い 1 —— 出荷する見本を、どの大きさと形にするか**（`TP-2` ・ `TP-5` ・ `TP-6`。利用者は「本番前に簡素な日程にする予定」） | **A**: 100 タスク ・ 30 行、期間 3 年と 7 工程 ・ 工程ごとの節目 ・ 森 ・ 深さ 5 段は保つ → 見本 約 78 KB、`dist` 約 877 KB（1 MB を割る）。代償: 生成器に 30 行の森を 1 つ足す。起動のたびに 1000 件を通す効き目が消える（退行は測ったときだけ見える）。試験の向け直し（波 4a）が要る ／ **B**: 300 タスク ・ 50 行（`MC-7` の行数）→ 約 205 KB、`dist` 約 1,004 KB。1 MB を越えるので gzip の問いが戻る ／ **C**: 50 タスク ・ 20 行 → 約 45 KB、`dist` 約 844 KB。工程の棒と節目と束ねの行で約 25 件を使い、仕事のタスクが 1 行に 1 〜 2 本になる —— `TP-7`（均一にしない）が絵に出にくい ／ **D**: 大きさは利用者が本番前に決める。本書は仕組み（容れ物 ・書き出しで外す ・測る文書を分ける ・開く道）だけを当て、見本は 1000 件のまま（`dist` は 1,444 KB のまま、書き出しは約 645 KB 軽くなる）。⚠️ いずれも見積もりは比例による（0.2 節の 9）。期間を 1 年にするかも併せて問う（推奨: 3 年のまま —— 生成器の期間の計算を触らない） | ⭐ **A**。1 MB を割る最も小さい変更で、見本が見せたいもの（工程 ・節目 ・深さ ・実績の遅れ）を残せる。⏸ **答え: 保留（`JDG-970`）** —— 「一旦保留。 落ち着いたらシンプル化する」。本書は案 D の形で当て（決定 15）、見本の大きさは `PND-611` に残した |
| **問い 2 —— 起動の道（`BT-1`、ダブルクリックで開いた `.html`）にも `FR-023` の検証を掛けるか**（`PND-452`） | **掛ける**: 同じ `.html` が「開く」でも起動でも同じ検証を通る（本書で開く道は掛かるようになる）。代償: `JDG-78` により異常系の手当てはリファクタの後（`DFC-586`）に回る約束であり、拒む語は `PND-447` 待ち。表 T-008 に起動の経路の行を 1 つ足すことになる ／ **掛けない（いまのまま）**: 起動の道は、書き出した本人の手元の `.html` を開くことが多い。代償: 同じファイルが開き方で違う扱いになる | ⭐ **掛ける**（`PND-452` の推奨と同じ）。本書の決定 7 で読み手が 1 つになったので、掛けるのは 1 か所の呼び出しで済む。当てるのは `DFC-586` の後でよい。⭐ **答え: 掛ける（`JDG-973`）** —— 決定 14 |

⭐ 問い 1 の保留に合わせて E-09 を外した。問い 2 の答えは本書のどの編集も変えない（当てるのは `DFC-586` の時）。
⭐ 起草のときに残していた `RS-67` の語（E-17。問 1 〜 11 には入っていなかった）は、2026-10-01 に前に立つ者が利用者に見せ、答えを得た（`JDG-993`、逐語は 0.1 節）—— 語は 1 つの短い断りに替わり（E-13 ・ E-17）、`GRS` 本体の `index.html` を開く道で開けば見本が開く（決定 16、E-03 ・ E-12、SEAM-2 ・ SEAM-4a）。
見本の大きさは本書の外の `PND-611` が持つので、本書に残る問いは無い。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1349` ・ `DFC-1358` | 0.1 節 | 「`仕様待ち`」のまま。当てた後、前に立つ者が `CR-612` の名を入れる |
| `DFC-1348` | 0.1 節（見本の大きさ） | ⏸ 本書では閉じない —— `PND-611` の答え（見本を簡素にする変更）が閉じる |
| `JDG-878` | 0.1 節 | ⏸ 見本を簡素にする部分は `PND-611` を待つ。本書が当てるのは容れ物の仕組みだけ |
| `JDG-879` ・ `JDG-888` | 0.1 節 | 「指示 —— 調整役が投入時期を決める」→ 前に立つ者が「指示 —— `CR-612` が当てる」に（本書は記録を書かない） |
| `JDG-970` ・ `PND-611` | 問い 1 の答え（保留）と、その記録 | 前に立つ者が起こした。`PND-611` は見本を簡素にするまで開いたまま |
| `JDG-973` | 問い 2 の答え（掛ける） | 前に立つ者が起こした。当てるのは `DFC-586` の時 |
| `JDG-993` | `RS-67` の語（1 つの短い断り）と、`GRS` 本体の `index.html` を開く道で開けば見本が開くこと（決定 9 ・ 決定 16） | 前に立つ者が起こす（番号は前に立つ者が振り、本書の `JDG-993` を置き換える）。状態は「指示 —— `CR-612` が当てる」 |
| `PND-452` | 問い 2 | 開く道の分は本書で閉じる（`OP-5` が掛かる）。起動の道は `JDG-973` が「掛ける」と決めた —— 当てるのは `DFC-586` の時 |
| `DFC-1425` | 起動の道の「入れ口が 2 つ以上」の告げが、行の無い理由 `RS-15` で出ている（`single-html-shell.ts:200-201`、0.2 節の 15） | 前に立つ者が起こした。本書の `RS-67` で閉じる |
| `DFC-1426` | 表 T-008 の `CHN-2` に、いまも通っている単一 `.html` の書き出しが無い（決定 10） | 同。本書の E-02 で閉じる |
| `DFC-1427` | `tools/generate_exchange_formats.py:228-233` の一意の検査が `OP-12` の文より強い（0.2 節の 11） | 同。本書の 9 節で閉じる |
| `perf-pending.md` | `frame-loop.ts` に触れる（8 節） | 調整役が 1 行書く |

⭐ **前に立つ者が 2026-10-01 に起こした台帳の行と、それを持つ変更要求**（4 本に同じ表を置く）:

| 行 | 持つもの |
|---|---|
| `DFC-1420` ・ `DFC-1421` | `CR-611` が閉じる |
| `DFC-1422` | `CR-611` の起草で見つけた仕様の穴。どの変更要求も閉じない |
| `DFC-1423` | `CR-610` が閉じる（`DFC-553` の ② も `CR-610`） |
| `DFC-1424` | `取下げ` —— `DFC-553` の ② と同じ件 |
| `DFC-1425` ・ `DFC-1426` ・ `DFC-1427` | 本書が閉じる |
| `DFC-1428` | `CR-613` の問い 2 の答えにより、別の変更要求が閉じる（番号は調整役が振る） |
| `JDG-970` ・ `PND-611` | 本書の問い 1（保留） |
| `JDG-971` ・ `JDG-972` ・ `JDG-973` ・ `JDG-974` | `CR-610` ・ `CR-611` ・ 本書の問い 2 ・ `CR-613` |

---

## 13. 測り方の再現

```
# the tree: b3-export-shell-crs, cut from refactor 0590ad03 (docs/spec, src, tests, tools unchanged)
git log --oneline -1                                 # -> 0590ad03 Rule JDG-950 ...
# scratchpad: <scratchpad>/g612/

# the rulings and ledger rows (section 0.1)
grep -n -E "(JDG-878|JDG-879|JDG-888)\b" docs/development-records/rulings.md   # -> :1161 :1162 :1171
grep -n -E "^\| *(DFC-1348|DFC-1349|DFC-1358) " docs/development-records/defects.md
grep -n "PND-452\|PND-70 \|PND-20 \|PND-458" docs/development-records/pending-decisions.md

# sizes (section 0.2 items 1 and 9)
python <scratchpad>/g612/measure.py      # dist 1,444,325 B (gzip -9 266,305); template compact 645,474 (gzip 48,288, base64 64,384)
#   the literal in dist: from 'var UP={schemaVersion:' to 'changeLog:[]};' -> 645,394 B = 44.7%, rest 798,931 B
python <scratchpad>/g612/estimate.py <scratchpad>/g612/tpl-100-1000.json
#   -> the regenerated copy is identical to the shipped file; 613.5 B per task, 222.7 B per row, 9,676 B fixed
# the generator on copies (section 0.2 item 8): <scratchpad>/g612/sweep.py <root> <scratchpad> 100x1000 100x100 ...
#   100x1000 regenerates the shipped bytes; 30/40/20/50 rows stop at 'TP-5: the tree holds 100 rows';
#   100x100 did not finish in 10 minutes and was stopped

# who reads the template (section 0.2 items 2, 6, 7)
git grep -n "startup-template" -- src tools vite.config.ts package.json
git grep -l "startup-template" -- tests | sed -E 's#/[^/]*$##' | sort | uniq -c   # 82 unit, 39 contract, 4 system, 2 integration
git grep -n "MC-7\|TP-6\|TP-5\|TP-2" -- tests tools src

# the open route (section 0.2 items 10 to 13)
sed -n 41,114p src/adapter/document-codec/document-codec.ts
sed -n 228,240p tools/generate_exchange_formats.py   # :228-233 first-character uniqueness, :234-240 extension uniqueness
grep -n "picker({" src/framework/file-system-access-file-store/file-system-access-file-store.ts   # -> :239
grep -n "isOverwritableOpenedFile" -A3 src/framework/single-html-shell/document-file-flow.ts      # -> :677

# rulings reached (section 0 (3)): every "| JDG-" row grepped for
#   TP-n / IO-7 / OP-12 / BT-4 / BT-1 / FR-067 / MC-7 / 起動テンプレート / 初期テンプレート / 単一 HTML / Single HTML
#   -> JDG-655 JDG-711 JDG-724 JDG-887 JDG-878 JDG-879 JDG-888

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py IO-7 OP-12 FR-067 FR-022 BT-1 BT-4 TP-2 TP-5 TP-6 MC-7
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-027 FR-096 OP-1 CHN-1 CHN-2 FR-023 UF-37 T-226 T-025
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py IO-7 OP-12 FR-067 FR-022 BT-1 BT-4 TP-2 TP-5 TP-6 MC-7
#   -> 10 of 10, 4 edges, 0 cycles

# totals (section 7)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py   # -> tables=212 figures=29 rows=2685 uids=176
git grep -oh "\bMC-[0-9]\+" -- docs/spec | sort -u    # max MC-9;  RS: max RS-66;  RS-67 / MC-10: 0 hits anywhere

# tests quoting the sentences section 4 replaces (for wave 4b)
for p in "バンドル済み" "より行が多い" "MSPDI で開いた文書の最初の" "取込で受け付ける 2 行" "読む側は表 T-034" "初期表示用のテンプレート（"; do git grep -l -F "$p" -- tests src tools; done

# the four sibling drafts applied to copies in the order 610 -> 611 -> 612 -> 613: every old block once
python <scratchpad>/g612/siblings.py change-request/CR-610-*.md change-request/CR-611-*.md change-request/CR-612-*.md change-request/CR-613-*.md

# every old block of section 4 occurs exactly once; all edits apply to COPIES; MUST markers counted
PYTHONIOENCODING=utf-8 python <scratchpad>/g612/verify.py change-request/CR-612-the-template-rides-in-its-own-container-and-an-exported-html-opens-in-another-grs.md

# re-measured 2026-10-01 after the answer JDG-970 (E-09 taken out), line endings normalised:
#   CR-612 old blocks=16, each once in its file; the four drafts applied in the order
#   610 -> 611 -> 612 -> 613 to in-memory copies: every old block once (bad=0);
#   MUST / MUST NOT markers in 01-04: 2234 -> +6 (E-08 +1, E-10 -1, E-12 +2, E-14 +4)
# re-measured 2026-10-01 after the answer JDG-993 (E-03, E-12, E-13, E-17 rewritten), LF normalised:
#   old blocks=16, each once in its file (bad=0); the old blocks themselves did not change;
#   MUST / MUST NOT markers in 01-04: 2234 -> 2241, +7 (E-08 +1, E-10 -1, E-12 +3, E-14 +4);
#   after the edits: MC rows 10, RS rows 62
grep -o "（MUST\( NOT\)\?）" docs/spec/01-04-requirements.md | wc -l   # -> 2234
grep -c "^| MC-" docs/spec/01-04-requirements.md                        # -> 9
grep -c "^| RS-" docs/spec/01-04-requirements.md                        # -> 61
grep -c "^| TP-" docs/spec/01-04-requirements.md                        # -> 8 (unchanged by this CR)
grep -n "for key, what\|share an" tools/generate_exchange_formats.py   # -> :228 (to :233), :240 (block :234-240)
```

### 13.1 ⚠️ 測りが見られなかったもの

- 小さい見本の大きさは、1000 件の平均からの比例の見積もりである。小さい森で生成して測ってはいない（生成器が行の数を変えられないため）。
- 走らない JSON の容れ物が方針に拒まれないことは、`BT-1` の容れ物が同じ方針の下で開いていること（既存の試験）から言った。見本の容れ物を差し込んだビルドを作って `SWS-8` を走らせてはいない。
- 開く道で `.html` を読み、`U-61` に `UID` の一致が並ぶことは、コードを読んで言った（`OP-5` → `OP-3` → `FR-022` の道は `IO-2` と同じ）。走らせてはいない。
- 本体の `index.html` を開く道で開いて見本が開くこと（決定 16）と、開く道で開いた見本の最初の表示が `FR-055` の全体表示になることは、`OP-10` の文から言った。走らせてはいない（見本の容れ物を持つビルドがまだ無い）。
- `JDG-993` の後に 4 本を写しへ当て直してはいない —— 4 節の旧は 1 つも変えていないので、`610` → `611` → `612` → `613` の順の結果（bad=0）はそのまま立つ。
- `CR-610` ・ `CR-611` は、4 節の旧が重なるかと、`CR-611` の空の文書の置き場（`src/framework/single-html-shell/empty-document.json`、見本の容れ物ではない —— 決定 4 の前提を満たす）だけを読んだ。表の番号は前に立つ者が振り分けた（`CR-610` が T-340 ・ T-341、`CR-611` が T-342）。
