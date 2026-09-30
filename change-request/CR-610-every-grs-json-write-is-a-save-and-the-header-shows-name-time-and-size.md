# CR-610 — GRS JSON を書けたら入口によらず保存であり、ヘッダーは名前と、時刻と大きさを 2 段で示す

> 起草の状態: 起草（2026-10-01、枝 `b3-export-shell-crs`）。まだ当てていない。4 節の旧 13 件は、読んだ木で各 1 回だった（13 節）。11 節の 4 つの問いは 2026-10-01 に答えを得た（`JDG-971`、4 つとも推奨）—— 答えは `HS-6` ・ `HS-3` ・ `SX-2` と E-06 の 2 つの係数に書き入れてある。
> 読んだ木: `refactor` `0590ad03`（枝 `b3-export-shell-crs` の切り口）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-610` を受けた。本書が取る仕様の識別子は 表 T-340 ・ 表 T-341 ・ 接頭辞 `SX` ・ `HS` ・ 設定値 `S-449`（2 節。どれも当てる日に測り直す）。台帳の番号は取らない（12 節）。
> 当てる順: 本書の旧に触れるほかの変更要求は無い —— 兄弟の `CR-611`（`FR-095` ・ 表 T-036）・ `CR-612`（表 T-024 の `IO-7` ・ `FR-067`）・ `CR-613`（`AG-12` ・ `FR-150`）は、本書の 13 の旧のどれにも触れない（13 節で `change-request/` を旧の文で引いた）。⭐ 4 本は `CR-610` → `CR-611` → `CR-612` → `CR-613` の順に当て、表の番号は本書が T-340 ・ T-341、`CR-611` が T-342 を取る（2 節の振り分け）。仕様の文は、持ち場 L4 が合流した後の 1 回の当て（`docs/development-records/cr-plan-2026-09-26.md` の W0 〜 W5 と同じ形）で当てる（8 節）。
> **閉じるもの**: `DFC-1366`（`IC-2` で書いた `GRS JSON` が保存にならない）・ `DFC-1354`（ヘッダーの 2 段・綴り・大きさ・縦幅）・ `PND-325`（時刻の綴り）・ `DFC-574`（開いたファイルの名前がヘッダーに出ない。コードだけ）・ `DFC-1423`（2 段の字に `S-235` が掛かっていない）・ `DFC-553` の ②（`S-210` が生成されず手で写されている）。問い 1 と問い 4 が推奨で答えられたので、`DFC-783` の「開く」の半分と、`DFC-720` の `IC-2` の半分も閉じる。問いは 2026-10-01 に答えを得た（`JDG-971`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-884` | 「プロジェクトをJSONに保存しても ヘッダーのコマンドパレットの表示はファイル未保存のままだ。Ctrl + s でやっと保存されたことになる。GRS JSONのファイル名と保存日時を2段で表示しろ。保存時刻はファイル名の下に小さいフォントで表示しろ。現状、ヘッダーの縦幅が大きくなってい待っている。 縦幅を変えないフォントを選べ。ファイルサイズも表示しろ。」と図「xxxx.json ／ yyyy/mm/dd hh:mm:ss  xx[kB] ※下段はフォントを小さく」（2026-09-30、`rulings.md:1167`） | 2 段。上段に名前、下段に `yyyy/mm/dd hh:mm:ss` と大きさ `[kB]`。下段は上段より小さい字。ヘッダーの縦幅を変えない | 表 T-341 の `HS-1` 〜 `HS-8`（E-04）。係数は `JDG-971` の ②（E-06） |
| `JDG-892` | 「「保存」として扱ってよい」（問い「書き出し画面から GRS JSON を書いたときも「保存」として扱ってよいですか？」への答え。2026-09-30、`rulings.md:1175`） | どの入口（`IC-2` を含む）から `GRS JSON` を書いても保存 —— ヘッダーの保存の状態と未保存の印が変わる。`GRS JSON` 以外の形式は書き出しのまま | 表 T-340 の `SX-1` ・ `SX-2`（E-01） |
| （`DFC-217` の裁定、2026-09-03） | 「②を採る。備考のほうを直す」 —— `S-210` はファイルの名前にも掛かる（`docs/development-records/fixed-defects.md:235`） | 名前と時刻を同じ大きさにする | ⛔ **`JDG-884`（2026-09-30）の「保存時刻はファイル名の下に小さいフォントで」が後から覆した** —— 名前には新しい `S-449` を掛け、`S-210` は下段だけに掛ける（E-06） |
| （`CR-395` の決定 1、利用者の「現行の 2/3」） | `App Header` の中身に `S-235` を掛ける。中身には「ファイルの名前と保存した日時の字」を含む | 2 段の字も `S-235` で縮めてから段ごとの係数を掛ける | 本書は変えない（`HS-7` がそのまま指す）。⚠️ コードは掛けていない（0.2 節の 6） |
| `JDG-971` | 「問 7. 出荷する見本の大きさ →一旦保留。 落ち着いたらシンプル化する。 後でやる旨記録しておけ。<br><br>それ以外は、全部推奨で」（2026-10-01。枝 `b3-export-shell-crs` の起草のセッションがまとめて問うた問 1 〜 11 への 1 つの答えのうち、本書の問い 1 〜 4 に当たる「それ以外は、全部推奨で」の部分） | 本書の 4 つの問いは推奨: ① 開いた直後の下段はその文書の `AT-140` と読んだファイルの大きさ ② 字は上段 12px ・下段 10px（見本の候補 A）③ 大きさは 1000 で割り小数 1 桁の `48.2[kB]` ④ `IC-2` で MSPDI を書いても上書きする先を動かさない | ① は `HS-6`（E-04）、② は `S-449` 1.125 ・ `S-210` 0.9375（E-06）、③ は `HS-3`（E-04）、④ は `SX-2`（E-01）と `ROUND_TRIP_FORMS`（9 節）。11 節に答えを記した |

### 0.2 調べた結果（`0590ad03`）

1. **`IC-2` の道は保存を告げない。** `exportHeldDocumentToFile`（`src/framework/single-html-shell/document-file-flow.ts:714-739`）は、書けても `documentFileSaved` を送らず `noteFileSaved` も呼ばない。送るのは `saveHeldDocumentToFile`（`:683-710`、`SK-11`）の `:705-706` だけである。⇒ `DFC-1366` の言うとおり。
2. ⚠️ **ところが上書きする先は、`IC-2` の道でもすでに動いている。** `saveDocumentFile`（`src/adapter/file-gateway/file-gateway.ts:222-251`）は選んだファイルへ書くとき `shouldBecomeOpenedFile: isRoundTripForm(request.form)`（`:234`、`ROUND_TRIP_FORMS = ['grsJson', 'mspdi']` は `:94`）を渡し、店の `saveToFile`（`src/framework/file-system-access-file-store/file-system-access-file-store.ts:358-373`）が `:365` で取っ手を上書きする先にする。⇒ **いまは `IC-2` で `a.json` を書くと、ヘッダーは前のファイルの名前のまま、次の `Ctrl` ＋ `S` は `a.json` へ問わずに書く** —— 画面が名乗るファイルと書く先が食い違う。本書の `SX-1` は、名前と保存の状態を上書きする先に揃えるので、この食い違いも消す。
3. **MSPDI も同じく上書きする先になる**（`:94` の `mspdi`。`DFC-720` が「`SK-11` の対象形式と食い違う疑い」として開いている）。ただし `isOverwritableOpenedFile`（`document-file-flow.ts:677-679`）が拡張子 `.xml` の取っ手を上書きの相手と見なさないので、次の `SK-11` は保存先を問う。⇒ 害は出ていないが、`SX-2` の「上書きする先を変えない」とは食い違う（問い 4。答えは A —— `mspdi` を外す、`JDG-971`）。
4. **状態機械は送る順を受け入れる。** `beginWritingDocumentFile`（`:385-393`）は書き終えると必ず `endFileOperation(DOCUMENT_FILE_WRITE_ENDED)` を送る。`documentFileSaved` を先に送れば `onDocumentFileSaved`（`src/use-case/advance-screen-session/file-flow-values.ts:414-418`）が `idle` へ戻し、後の `documentFileWriteEnded` は `onDocumentFileWriteEnded`（`:434-437`）で素通りする。⇒ `file-flow-values.ts` を変えずに `IC-2` の道から送れる。
5. **取っ手を残さずに書く道（ダウンロード）は、仕様にもコードにも無い。** `writeChosenFile`（`file-system-access-file-store.ts:448-453`）は選択面が無ければ `unavailable` で断る（`CN-2` ／ `LM-14`、表 T-233 の `RS-3`）。表 T-065 の `IF-3` は「ハンドルは実装が保持する」とだけ言う。⇒ 依頼文の「取っ手の無い書き込み」は今は起こらない。表 T-340 の下の注でそう書き、道を足す変更要求に行を足させる（決定 4）。
6. **いまのヘッダーが高くなる理由を測った。** `STYLE.fileStatus`（`src/framework/dom-screen-surface/dom-screen-surface.ts:292-295`）は箱に 0.75em（`FILE_STATUS_TEXT_SCALE`、`:262`）と行の高さ 1.2 を宣言し、2 段が流れの中で 12px × 1.2 × 2 ＝ 28.8px を取る。ほかの中身（入口の箱 16px、`Document Title` 13.3px × 1.2 ＝ 16px）より高い。同じ寸法で組んだ見本で測ると、ヘッダーは 29.0px → 41.8px（12.8px、44% 高い）になる（`previous-project-result/26-export-shell-crs/header-save-status/`）。⚠️ **仕様とコードの食い違いがもう 1 つある** —— `FR-051`（`01-04-requirements.md:4754`）は 2 段の字に「宿主の地の文字に `S-235` を掛けてから同表の `S-210` を掛ける」と定める（`CR-395` の決定 1）が、コードは `S-235` を掛けない（`S-210` の備考の実測「名前も日時も 12px」は 16px × 0.75）。台帳の行は `DFC-1423`（前に立つ者が起こした。12 節）。
7. **時刻の綴りは今 `yyyy-mm-dd hh:mm:ss`。** `readableStamp`（`src/framework/dom-screen-surface/app-header-drawing.ts:34-48`）が綴り、頭に `STOP` と `@provisional PND-325` を持つ。
8. **`S-210` は生成されず、手で写されている。** `FILE_STATUS_TEXT_SCALE = 0.75`（`dom-screen-surface.ts:262`）。`tools/generate_entity_types.py` は `S-210` を挙げない（`S-235` は `:1289` の `NOT_STORED_CHROME_SCALE`）。⇒ 台帳の `DFC-553` の ② と同じ件である（前に立つ者が起こした `DFC-1424` は、同じ件として取り下げた）。
9. **開いたファイルの名前がヘッダーに出ない（`DFC-574`）は今も真。** `landOpenedDocument`（`document-file-flow.ts:450-458`）は置き換えでも `openedFileName: null` を送る。受け手の `onDocumentOpenLanded`（`file-flow-values.ts:401-411`）は名が運ばれたときだけ書く。⇒ `HS-6`（開いた後の 2 段）を満たすには、この 1 行も直す（9 節）。
10. **大きさを出す面がもう 1 つ来る。** `JDG-854`（`DFC-1324`、開き方の面）は「ファイル: xxxx.json (100kB)」と描いた。同じ大きさを 2 か所で別々に綴ると離れていく（`R2.21`）⇒ 本書の `HS-3` を綴りのただ 1 か所とし、`DFC-1324` の変更要求がそこを指す（問い 3。答えは A、`JDG-971`）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4`（すぐわか）** —— 保存したのに「ファイル未保存」と出るのは、書けたのに失敗に見える（`FR-101` の RATIONALE「2 度目以降の保存が成功しても、画素が 1 つも変わらないと、人には失敗として見える」）。ヘッダーが名乗るファイルと `Ctrl` ＋ `S` が書くファイルが食い違うのも同じ（0.2 節の 2）。
- ⭐ **`GL-004` ／ `CH-1`** —— 上書きする先が交換用の書き出し（MSPDI ・絵）へ動かない（`SX-2`）ので、次の `Ctrl` ＋ `S` がこの文書のファイルへ書く。
- ⚠️ **`CH-3`（ぬるサク）** —— ヘッダーが 12.8px 低くなり、その分だけ日程表が広くなる（`FR-051`「上部に使った高さはそのまま日程表から引かれる」）。毎フレームの仕事は増えない（書けたときに 1 回綴るだけ）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— ① `FR-096` の本文は `IC-2` を「書き出し」と呼び、`FR-101` の RATIONALE は「ヘッダーのアイコンから、同じ名前でも別名でも保存できる必要がある」と言う（`IC-2` を保存と読む）。どちらが正かは表のどこにも無かった → 表 T-340（E-01）。② `S-210` の備考「ファイルの名前にも掛かる」は `JDG-884` と食い違う → E-06。③ `FR-101` の「時刻の綴りそのものは本書が定めない」は `JDG-884` の綴りと食い違う → E-03。④ 大きさの綴りを持つ所は 1 つ（`HS-3`）にする（問い 3、`JDG-971`）。
- **`R1.2`（検証できる表現）** —— 「縦幅を変えない」を、「`App Header` の高さは 2 段の箱を描かないときの高さと等しい」と、既定の地の文字で「2 段が枠の内側に切れずに収まる」の 2 つの測れる文にした（`HS-8`）。どちらも表示枠の外のブラウザで矩形を読めば判じられる（5 節）。
- **`R1.4`（異常系・境界値）** —— ① 書けなかった（選ばなかった・上書きを断った・拒まれた）→ 何も動かさない（表 T-340 の下の注）。② 取っ手の残らない書き込み → 道が無い（0.2 節の 5）。③ まだ書いていない → 大きさを出さない（`HS-5`）。④ 合流と重ねの後 → 2 段とも変えない（`HS-6`、`CR-594` の上書きする先と揃う）。⑤ 地の文字を大きくした閲覧者 → 高さを先に立て、切れを許す（`HS-8` の ⚠️）。⑥ 大きさの小さなファイル → 50 バイト未満は `0.0[kB]` になるが、`GRS JSON` はそれより必ず大きい（決定 6）。
- **`R2.21`（1 つの仕事は 1 か所）** —— 保存の後始末（名を送る・時刻と大きさを控える）は `SK-11` と `IC-2` の 2 つの道から呼ばれる。コードでも 1 つの関数にする（9 節）。
- **`R2` の名前** —— `U-59`（`File Saved At`）に大きさを足しても名を変えない（決定 7）。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` の `JDG-` の行を `FR-101` ・ `FR-096` ・ `S-210` ・ `U-58` ・ `U-59` ・「ファイル名」・「保存日時」・「保存時刻」・`kB`・「ヘッダーの縦」・`DFC-720` ・ `DFC-783` ・ `IC-2` で引いた（13 節）—— 当たるのは `JDG-123`（ヘッダーとパレットは固定で 2/3。本書は変えない）・ `JDG-854`（開き方の面の大きさ、問い 3）・ `JDG-884` ・ `JDG-892` で、本書と食い違わない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 書けた後に動くものを、入口ではなく書いた形式で決める表 T-340 を `FR-096` に置く。行は 2 つ（`GRS JSON` ／ それ以外のファイルとして出る形式） | `JDG-892` は「どの入口からでも」と形式で分けた。表 T-024 に列を足す案は、`CR-612` が `IO-7` の行を書き換えるのと同じ行を触るので採らない。`FR-096` は `SK-11` の書く形式も持つ（`:6792-6795`）ので、置き場として自然である | 表 T-024 と行の鍵（形式）が重なる —— `SX-2` は形式を書き写さず「表 T-024 のうち … `IO-2` 以外」とだけ言う |
| 決定 2 | `SX-1`（`IC-2` で書いた `GRS JSON`）の書いたファイルを、上書きする先とヘッダーの名前にする | ① `FR-060`「上書きが成り立つのは、同じ起動のうちに一度保存先を決めたあと」—— `JDG-892` のもとで `IC-2` の `GRS JSON` は保存なので、その書き先は「決めた保存先」である。② 表 T-227 の `DI-5`「開いたファイルは、定義によりこの文書のファイル」—— 書けた直後のそのファイルは、この文書のバイト列そのものである。書く前に `DI-1` 〜 `DI-4` が相手を確かめている。③ `FR-101` の RATIONALE「いまどのファイルに向かっているか」—— 名前と上書きする先が別のファイルを指すと、名前は答えになっていない（0.2 節の 2 の食い違い）。④ コードの店はすでにそうしている（0.2 節の 2）ので、変わるのはヘッダーと未保存の編集だけである | `IC-2` で「控え」のつもりで別名に書くと、以後の `Ctrl` ＋ `S` はその控えへ書く —— 別名保存としては正しい振舞いであり、名前が見えるので読める |
| 決定 3 | `SX-2`（MSPDI ・単一 HTML ・ SVG ・ PNG）は、未保存の編集・ヘッダー・上書きする先のどれも変えない | `JDG-892`「GRS JSON 以外の形式は書き出しのまま」。`FR-096`「MSPDI は本要求の書き出しでだけ出す」「`SK-11` はどの形式から開いた文書であっても `GRS JSON` で書く」—— 書き出した先はこの文書のファイルではない | コードの `ROUND_TRIP_FORMS` から `mspdi` を外す（9 節。`DFC-720` の半分。問い 4 で利用者が認めた、`JDG-971`） |
| 決定 4 | 取っ手を残さない書き込みの行を作らない。表 T-340 の下の注で「その道は本仕様に無い」と言う | 0.2 節の 5。起こらない場合の規則を書くと、試験が組めない文になる | 将来ダウンロードの道を足すときに、その変更要求が行を足す |
| 決定 5 | 時刻の綴りは `yyyy/mm/dd hh:mm:ss`（0 で埋め、24 時間、時間帯を綴らない）。`PND-325` を閉じる | `JDG-884` の図がそのまま綴りである。`PND-325` の推奨（`YYYY-MM-DD`）と `FR-101` の「宿主の暗黙の綴り」は、利用者の後の言葉が覆した。区切りだけで語を持たないので `FR-038` の辞書に触れない | `IN-2`（カーソルの綴りは宿主に渡す）と立場が分かれる —— ヘッダーは利用者が綴りを決めた所なので、分かれてよい |
| 決定 6 | 大きさは 1000 で割り（`kB`）、小数第 1 位へ四捨五入し、`[kB]` を空けずに付ける。例 `48.2[kB]` | ① 利用者は `kB` と書いた —— `k` は 1000 倍の接頭語で、1024 倍は `KiB`（IEC 80000-13）。② 小数 1 桁は、小さな文書（数 kB）でも保存ごとの違いが読める桁である。整数にすると 500 バイト未満が `0[kB]` になり、`DI-6` の「0 バイトの相手」と読み違える。③ 図の「xx」は桁数を決めていない（置き場の印）。④ `[kB]` は図の綴りのまま | Windows のファイル一覧は 1024 で割った数を `KB` と出すので、数が 2.4% ずれて見える（問い 3 で確かめ、利用者が推奨を採った。`JDG-971`） |
| 決定 7 | 大きさのために新しい UI パーツの名を立てない。`U-59`（`File Saved At`）の段に時刻と並べて置き、同行の説明に大きさを足す | 大きさは時刻と必ず一緒に出て一緒に消える（`HS-5`）—— 別のパーツにする理由が無い。名を足すと、辞書・画面の役の名（`ROLE`）・試験の名簿が 1 つずつ増える | 英語の名が時刻しか言わない |
| 決定 8 | 2 段の字は `FR-051` のとおり「地の文字 × `S-235`」を土台にし、上段に新しい `S-449`、下段に `S-210` を掛ける。`S-210` の名（更新日時の字）は変えず、値と備考を下段に合わせる | ① `FR-101` の「更新日時の字の大きさは `S-210` が定める係数で決めること（MUST）」は下段を指す —— 文を残せる。② `JDG-884` は上段と下段で字を分けた ⇒ 係数は 2 つ要る。③ `CR-395` の決定 1（利用者の「現行の 2/3」）はヘッダーの中身すべてに `S-235` を掛ける | 係数が 1 を超える（上段 1.125）—— `S-235` で縮めた後に掛けるからであり、備考に書く |
| 決定 9 | 縦幅は「2 段の箱を `App Header` の高さに数えない」で守る。既定の地の文字（16px）で切れずに収まることを別の MUST にする | 見本で測った: 流れの中に置く限り、読める大きさの 2 段はほかの中身（16px）より必ず高い。箱を高さに数えなければ、どの地の文字でも高さは変わらない。字が大きすぎれば切れるが、それは測れる（`HS-8`） | 地の文字を 20px に上げた閲覧者では、推奨の係数で上下が 1.4px ずつ切れる（見本の実測）|

⭐ 次の 2 つは問うて決めた（11 節の問い 1 ・ 2、答えは `JDG-971`）。問わずに決めた上の 9 つと区別するために、ここに分けて置く。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 10 | 置き換えでファイルを開いた後、まだそのファイルへ書いていないときは、下段に、開いた文書の `AT-140` の時刻と読んだ中身の大きさを出す（`HS-6`）。`AT-140` が空なら `HS-5` に当たる | 問い 1 の答え A（`JDG-971` の ①）。ヘッダーがいま向かっているファイルを述べる | 保存のたびに `AT-140` を文書へ書く造りが要る（`DFC-459` の直し、9 節） |
| 決定 11 | 上段の係数 `S-449` を 1.125、下段の係数 `S-210` を 0.9375 とする（既定の地の文字 16px で 12px ／ 10px） | 問い 2 の答え A（`JDG-971` の ②、見本 `previous-project-result/26-export-shell-crs/header-save-status/` の候補 A） | 地の文字を 20px に上げた閲覧者では上下が 1.4px ずつ切れる（決定 9 の代償と同じ） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所（`0590ad03`） | 編集 |
|---|---|---|
| 書けた後に動くもの | `FR-096`（`01-04-requirements.md:6795` の次）に 表 T-340 | E-01 |
| 上書きする先を決める書き込み | `FR-060`（`:6475` の次に 1 文） | E-02 |
| 時刻の綴り（`PND-325`） | `FR-101` の STATEMENT の末（`:6562`） | E-03 |
| ヘッダーの 2 段 | `FR-101`（`:6566` の前）に 表 T-341 | E-04 |
| `S-235` の掛け方の言い方 | `FR-051`（`:4754-4755`） | E-05 |
| 2 つの係数 | `_source/settings.json`（`S-210` の行を書き直し、`S-449` を足す） | E-06 |
| 保存・書き出しの出来事の出どころ | `_source/state-machines.json`（`documentFileSaved` ・ `documentFileWriteEnded`） | E-07 ・ E-08 |
| `U-59` の説明 | `_assets/tbl-glossary.md:140` | E-09 |
| ユニットの説明 | `05-07-design.md:517`（`UF-62`）・ `:530`（`UF-104`） | E-10 ・ E-11 |
| 接頭辞 | `_source/row-id-prefixes.json`（`HS` ・ `SX`） | E-12 ・ E-13 |

**数**: 文の編集 8（`01-04-requirements.md` が 5、`05-07-design.md` が 2、`tbl-glossary.md` が 1）。原稿 JSON の編集 5（E-06 ・ E-07 ・ E-08 ・ E-12 ・ E-13）。生成し直すもの 3（`tbl-settings.md` ・ `tbl-state-machines.md` ・ `tbl-row-id-prefixes.md`）。

---

## 2. 新しい識別子

| 識別子 | 何か | 測った最大（`0590ad03`） |
|---|---|---|
| 表 T-340 | 書けた後に動くもの（`FR-096`） | 0590ad03 で最大 `T-339`、当てる日に測り直す |
| 表 T-341 | ヘッダーのファイルの状態（`FR-101`） | 同上（T-340 の次） |
| 接頭辞 `SX`（`Save or Export`）、行 `SX-1` ・ `SX-2` | 表 T-340 の行 | `docs` ・ `src` ・ `tests` ・ `tools` ・ `change-request` に `SX-` の行は 0 件 |
| 接頭辞 `HS`（`Header Status`）、行 `HS-1` 〜 `HS-8` | 表 T-341 の行 | `HS-` の行は 0 件。⚠️ 初めは `FS` を考えたが、`docs/review/inventory/A08-poc-results.md:165-169` が `FS-1` 〜 `FS-5` を別の意味で持つので避けた（1 つの接頭辞に 1 つの意味） |
| `S-449` | 上段（ファイルの名前）の字の係数 | 0590ad03 で最大 `S-448`、当てる日に測り直す |

⚠️ **番号の振り分け（2026-10-01、前に立つ者）**: 当てる順は `CR-610` → `CR-611` → `CR-612` → `CR-613` である。本書が `T-340` ・ `T-341` を、`CR-611` が `T-342` を取る（`CR-611` の行の接頭辞は `BK` で重ならない）。当てる日に測り直し、動いたら本書の中の `T-340` ・ `T-341` ・ `S-449` の 3 つの綴りを機械で置き換えること。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`0590ad03`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「⚠️ 時刻の綴りそのものは本書が定めない —— 読む人の暗黙の綴りに従う … `IN-2` … と同じ立場である」 | `01-04-requirements.md:6562` | 表 T-341 の `HS-2`（`yyyy/mm/dd hh:mm:ss`） | E-03 |
| `FR-051` の「ファイルの名前と保存した日時の字（宿主の地の文字に `S-235` を掛けてから同表の `S-210` を掛ける）」 | `:4754` | 「ファイルの状態の 2 段の字（段ごとの係数は 表 T-341 の `HS-7`）」 | E-05 |
| `S-210` の名「ヘッダーの更新日時の文字の大きさの係数（`FR-101`）」と値 0.75 🔎 | `settings.json:3925-3932` | 下段（書けた時刻と大きさ）の係数、0.9375（問い 2） | E-06 |
| `S-210` の備考「⭐ ファイルの名前にも掛かる —— 係数は名前と日時の両方を抱える箱に宣言され、名前が継ぐ」「⚠️ 実測（出荷ビルド）: 名前も日時も 12px、`Document Title` は 16px」 | `settings.json:3934` | 名前は `S-449`。実測は古い（`S-225` は今 20px） | E-06 |
| `documentFileSaved` の出どころ「保存が書けた」 | `state-machines.json:4190` | 「`GRS JSON` が書けた（表 T-340 の `SX-1`）」 | E-07 |
| `documentFileWriteEnded` の出どころ「書き出しが終わった、…」 | `state-machines.json:4214` | 「`GRS JSON` 以外の形式の書き出しが終わった（`SX-2`）、…」 | E-08 |
| `U-59` の「開いているファイルへ最後に書いた時刻。」 | `tbl-glossary.md:140` | 時刻と、書いた中身の大きさ | E-09 |
| `UF-62` の「本ユニットは 2 つの値を運ぶだけであり」 | `05-07-design.md:517` | 3 つ（名前・時刻・大きさ） | E-10 |
| `UF-104` の「ファイルの名と保存の時刻」「時刻を土地の時刻で綴り」 | `05-07-design.md:530` | 名と保存の時刻と大きさ、表 T-341 のとおり綴る | E-11 |
| コードの `readableStamp` の `yyyy-mm-dd` と `STOP` ・ `@provisional PND-325`（⛔ 本書は直さない） | `app-header-drawing.ts:34-48` | `HS-2` | 9 節 |
| コードの `FILE_STATUS_TEXT_SCALE = 0.75` と、箱に宣言した 1 つの字の大きさ（⛔ 同） | `dom-screen-surface.ts:262` ・ `:292-295` | 生成した `S-210` ・ `S-449` ・ `S-235` を段ごとに掛け、箱は高さを取らない | 9 節 |
| コードの `ROUND_TRIP_FORMS` の `mspdi`（⛔ 同。問い 4） | `file-gateway.ts:94` ・ `:233` の `DEVIATION` | `grsJson` だけ | 9 節 |

⭐ **消さないもの**（読み直して真のまま）: `FR-101` の STATEMENT の残り —— 「名前を時刻の上に置くこと（MUST）」「まだ 1 度もファイルへ書いていないときは、時刻の代わりにその旨を示すこと（MUST）」「画面に出す時刻は、読む人のローカル時刻とすること（MUST）」「更新日時の字の大きさは … `S-210` が定める係数で決めること（MUST）」「px で持ってはならない（MUST NOT）」（試験が逐語で持つので、表 T-341 はこれらを指すだけにした）。`FR-060` の「その速い道は 表 T-036 の `SK-11` である（MUST） —— `IC-2` は `FR-096` の選択面を開く」（`IC-2` が問わずに上書きしないことは変わらない）。`FR-096` の STATEMENT（入口は `IC-2` 1 つ）。表 T-227 の全行。`FR-051` の「帯の高さは、中身から環境で確定させる値のまま」（E-05 は 1 句足すだけ）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（`0590ad03` で 13 件とも 1 回。13 節）。ファイルの改行は LF（作業木で測った）。新の文は 1 文 1 行で終わる（検査 46）。
⚠️ 見出しに `partial` と書いたものは行の一部の置き換えである。塊の末の改行を旧にも新にも含めない。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-096` の `SK-11` の段の末、表 T-227 の前。旧
```text
⚠️ **MSPDI で開いた文書の最初の `SK-11` は上書きする先を持たない**ので、保存先を問うことになる —— `FR-060` の上書きが成り立つのは、その文書を `GRS JSON` として一度保存した後である。
```
新
```text
⚠️ **MSPDI で開いた文書の最初の `SK-11` は上書きする先を持たない**ので、保存先を問うことになる —— `FR-060` の上書きが成り立つのは、その文書を `GRS JSON` として一度保存した後である。

⭐ **書けた後に何が動くかは、入口ではなく書いた形式で決まる** —— 表 T-340 に従うこと（MUST）。  
⇒ `IC-2` の選択面で `GRS JSON` を選んで書けたときも保存であり、`SK-11` で書けたときと同じものが動く —— 利用者が「「保存」として扱ってよい」と定めた。  
⚠️ 本表が決めるのは書けた後だけである —— 選択面が提案する名と、既にあるファイルへ書くときの問い（表 T-227）は、どちらの行でも本要求の上の段と下の段のままである。

**表 T-340 — 書けた後に動くもの**

| 行 ID | 書けたもの | 扱い | 未保存の編集（`FR-100`） | ヘッダーのファイルの状態（`FR-101`） | 上書きする先（`FR-060`） |
| --- | --- | --- | --- | --- | --- |
| SX-1 | `GRS JSON`（表 T-024 の `IO-2`）。<br>入口を問わない —— 表 T-036 の `SK-11` で書いたときも、表 T-109 の `IC-2` で選んで書いたときも同じである | 保存 —— 表 T-290 の `fileFlow/documentFileSaved` を送ること（MUST） | 無いものとすること（MUST） —— 表 T-290 の `unsavedEditsStateMachine` は `nothingUnsaved` へ移る | 書いたファイルの名前と、書けた時刻と、書いた大きさへ変えること（MUST） —— 並べ方と綴りは 表 T-341 | 書いたファイルとすること（MUST） —— 次の `SK-11` は、問わずにそのファイルへ上書きする（表 T-227 の `DI-5`） |
| SX-2 | 表 T-024 のうち書出の方向を持ちファイルとして出る、`IO-2` 以外の形式（`IC-2` で選んで書いたとき） | 書き出し —— `fileFlow/documentFileWriteEnded` を送ること（MUST） | 変えてはならない（MUST NOT） | 変えてはならない（MUST NOT） | 変えてはならない（MUST NOT） —— 書き出した先は交換や絵のためのファイルであり、この文書のファイルではない |

⭐ **書けなかったときは、どちらの行でも何も動かさないこと（MUST）** —— 選ばなかった・上書きを断った・書き込みが拒まれたときは `fileFlow/documentFileWriteEnded` を送り、告げるのは副作用の中身である（表 T-290）。  
⚠️ `SX-1` の上書きする先は、書いたファイルの取っ手を実装が持てたときに成り立つ（`05-07-design.md` の 表 T-065 の `IF-3`）。  
取っ手を残さずに書く道（ダウンロード）は本仕様に無い —— 選択面を持たない環境では書けず、表 T-233 の `RS-3` を告げる（表 T-004 の `LM-14`）。
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`FR-060` の ⚠️ の段の末（`CR-594` が足した文の次）。旧
```text
⭐ 合流と重ね（表 T-024a の `OP-3`）で開いた後も、上書きする先はそれまでのままとすること（MUST） —— 合流と重ねが作るのはどのファイルにも無い文書であり（表 T-290）、読んだファイルを上書きする先にするのは置き換えだけである。
```
新
```text
⭐ 合流と重ね（表 T-024a の `OP-3`）で開いた後も、上書きする先はそれまでのままとすること（MUST） —— 合流と重ねが作るのはどのファイルにも無い文書であり（表 T-290）、読んだファイルを上書きする先にするのは置き換えだけである。  
⭐ 書けたファイルが上書きする先になるかは、`FR-096` の 表 T-340 に従うこと（MUST） —— `IC-2` で `GRS JSON` を書けたときもそのファイルが上書きする先になり、ほかの形式の書き出しでは動かない。
```
⚠️ 旧の行の末に 2 つの空白を足し、新の 1 文を次の行に置く。

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`FR-101` の STATEMENT の末。旧
```text
⚠️ **時刻の綴りそのものは本書が定めない** —— 読む人の暗黙の綴りに従うのがこの問いに合うからであり、表 T-028 の `IN-2` がカーソルの綴りを宿主に渡しているのと同じ立場である。
```
新
```text
⭐ **名前と時刻の 2 段の並べ方、時刻と大きさの綴り、字の大きさ、`App Header` の高さとの関係は、表 T-341 に従うこと（MUST）** —— 大きさは、書いたファイルの大きさであり、利用者が時刻と並べて示せと定めた。
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md partial -->
`FR-101` の ORIGIN の後、RATIONALE の前。旧（RATIONALE の行の頭）
```text
**RATIONALE**: 書き込みが人の操作だけになったので、「いまどのファイルに向かっているか」
```
新
```text
**表 T-341 — ヘッダーのファイルの状態**

| 行 ID | 事項 | 規則 |
| --- | --- | --- |
| HS-1 | 段 | 2 段とすること（MUST） —— 上段にファイルの名前（`_assets/tbl-glossary.md` の `U-58`）、下段に書けた時刻と大きさ（`U-59`）を置く。<br>下段は時刻を先に、大きさを後に置き、あいだに空白を 2 つ置くこと（MUST） —— 利用者が図で示した並び（`yyyy/mm/dd hh:mm:ss  xx[kB]`）である |
| HS-2 | 時刻の綴り | `yyyy/mm/dd hh:mm:ss` と綴ること（MUST） —— 年は 4 桁、月・日・時・分・秒は 2 桁とし、足りない桁を 0 で埋め、時は 0 から 23 で数える。<br>時間帯は綴らない —— 読む人のローカル時刻であることと、秒までであることは本要求の上の段が持つ。<br>⭐ 綴りは利用者が示した。<br>数字と `/` ・ `:` ・空白だけなので、2 つの言語で同じ文字列になり、辞書（`FR-038`）に語を持たない |
| HS-3 | 大きさの綴り | バイト数を 1000 で割り、小数第 1 位へ四捨五入した数に、空けずに `[kB]` を付けること（MUST） —— 例えば 48213 バイトは `48.2[kB]` と綴る。<br>桁を区切る記号を入れてはならない（MUST NOT）。<br>⛔ 1024 で割ってはならない（MUST NOT） —— `k` は 1000 倍を表す接頭語であり、1024 倍は `Ki` と書く別の単位である。<br>⭐ `[kB]` は単位の記号であって語ではないので、辞書（`FR-038`）に持たない —— 利用者が図に書いた綴りのままである。<br>⭐ ファイルの大きさを画面に出すほかの面も、本行の綴りに従うこと（MUST） |
| HS-4 | 大きさの数 | ファイルへ書けたときは、そのとき書いた中身のバイト数とすること（MUST） —— 書いた後のファイルの大きさと同じ数である |
| HS-5 | まだ書いていないとき | 下段には、時刻の代わりに本要求の上の段が求めるその旨だけを出し、大きさを出さないこと（MUST） —— 大きさは書いた中身の大きさであり、書いていない文書に大きさは無い |
| HS-6 | 開いた後 | 置き換え（表 T-024a の `OP-3`）でファイルを開いてから、まだそのファイルへ書いていないときは、下段に、開いた文書の `AT-140`（`_assets/fig-erd-detail.md` の 表 T-058）の時刻と、読んだ中身のバイト数を出すこと（MUST） —— 2 段は、いま開いているファイルを述べる。<br>`AT-140` が空なら `HS-5` に当たる。<br>合流と重ね（同表の `OP-3`）の後は、2 段とも変えないこと（MUST） —— 上書きする先が変わらない（`FR-060`） |
| HS-7 | 字の大きさ | 宿主の地の文字に `_assets/tbl-settings.md` の 表 T-206 の `S-235` を掛け（`FR-051`）、上段にはさらに同表の `S-449` を、下段には本要求の上の段のとおり `S-210` を掛けること（MUST）。<br>⛔ 下段を上段より大きくしてはならない（MUST NOT） —— 利用者が「下段はフォントを小さく」と定めた |
| HS-8 | 高さ | 2 段の箱を、`App Header` の高さを決める中身に数えてはならない（MUST NOT） —— `App Header` の高さは、この箱を描かないときの高さと等しいこと（MUST）。<br>⭐ 利用者が「縦幅を変えないフォントを選べ」と定めた。<br>⭐ 宿主の地の文字がブラウザの既定（16px）のとき、2 段はどちらも `App Header` の枠の内側に切れずに収まること（MUST） —— `HS-7` の係数はこの条件で選ぶ。<br>⚠️ 地の文字をそれより大きくした閲覧者では、2 段の上下が枠で切れることがある —— 高さを変えないことを先に立てる（上部に使った高さはそのまま日程表から引かれる。`FR-051`） |

**RATIONALE**: 書き込みが人の操作だけになったので、「いまどのファイルに向かっているか」
```
⭐ `HS-6` の文は 11 節の問い 1 の答え A である（`JDG-971` の ①）。`HS-3` の綴りは問い 3 の答え A（同 ③）である。

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
`FR-051` の末の 2 行。旧
```text
⭐ 掛けるのは、入口の図形の箱と隙間（`FR-029` がどの面にも掛ける）と、`Document Title` の字の大きさと左の余白（同表の `S-225` / `S-226`、規則は 表 T-076 の `EP-1`）と、ファイルの名前と保存した日時の字（宿主の地の文字に `S-235` を掛けてから同表の `S-210` を掛ける）である。  
⚠️ 帯の高さは、中身から環境で確定させる値のままであり（上の段）、`S-116` はその上限のままである。
```
新
```text
⭐ 掛けるのは、入口の図形の箱と隙間（`FR-029` がどの面にも掛ける）と、`Document Title` の字の大きさと左の余白（同表の `S-225` / `S-226`、規則は 表 T-076 の `EP-1`）と、ファイルの状態の 2 段の字（宿主の地の文字に `S-235` を掛けてから、段ごとの係数を掛ける —— 係数は `FR-101` の 表 T-341 の `HS-7`）である。  
⚠️ 帯の高さは、中身から環境で確定させる値のままであり（上の段）、`S-116` はその上限のままである —— ファイルの状態の 2 段はその中身に数えない（表 T-341 の `HS-8`）。
```

<!-- EDIT id=E-06 file=docs/spec/_source/settings.json -->
`S-210` の行を書き直し、その次に `S-449` を足す。旧
```text
    {
     "id": "S-210",
     "value": {
      "ja": "ヘッダーの更新日時の文字の大きさの係数（`FR-101`）"
     },
     "default": {
      "num": "0.75",
      "mark": "🔎"
     },
     "note": {
      "ja": "⭐ **文字を 2 段小さくする比である**。⛔ **px で持たない理由も、掛ける相手も `S-203` と同じである。** ⭐ **ファイルの名前にも掛かる** —— **係数は名前と日時の両方を抱える箱に宣言され、名前が継ぐ。** ⚠️ 実測（出荷ビルド）: 名前も日時も 12px、`Document Title` は 16px。 ⛔ **測って決めた値ではない** （🔎）"
     }
    },
```
新
```text
    {
     "id": "S-210",
     "value": {
      "ja": "ヘッダーのファイルの状態の下段（書けた時刻と大きさ）の文字の大きさの係数（`FR-101` の 表 T-341 の `HS-7`）"
     },
     "default": {
      "num": "0.9375"
     },
     "note": {
      "ja": "⭐ **宿主の地の文字に `S-235` を掛けた大きさに掛ける比である**（`HS-7`）—— 既定の地の文字 16px では 10px になる。⭐ **利用者が見本で選んだ値である**（2 段の案を触って選んだ）。⛔ **px で持たない理由は `S-203` と同じである。** ⛔ **ファイルの名前には掛けない** —— 名前は `S-449` が持つ。⛔ **`S-449` より大きくしてはならない** —— 下段は上段より小さい字である（`HS-7`）。"
     }
    },
    {
     "id": "S-449",
     "value": {
      "ja": "ヘッダーのファイルの状態の上段（ファイルの名前）の文字の大きさの係数（`FR-101` の 表 T-341 の `HS-7`）"
     },
     "default": {
      "num": "1.125"
     },
     "note": {
      "ja": "⭐ **宿主の地の文字に `S-235` を掛けた大きさに掛ける比である**（`HS-7`）—— 既定の地の文字 16px では 12px になる。⚠️ **1 を超えるのは、`S-235` で 2/3 に縮めた後に掛けるからである。** ⭐ **利用者が見本で選んだ値である** —— 12px は、これまで名前が出ていた大きさと同じである。⛔ **px で持たない理由は `S-203` と同じである。** ⛔ **`S-210` と兼ねてはならない** —— 上段と下段は別の大きさの字である。"
     }
    },
```
⭐ 2 つの値と「利用者が見本で選んだ」の句は 11 節の問い 2 の答え（候補 A、`JDG-971` の ②）である。当てた後に `npm run gen` が `_assets/tbl-settings.md` を刷り直す（`settings_json_to_md.py`）。

<!-- EDIT id=E-07 file=docs/spec/_source/state-machines.json -->
出来事 `documentFileSaved` の出どころ。旧
```text
     "key": "documentFileSaved",
     "source": {
      "kind": "effectResult",
      "rows": [
       "FR-060",
       "FR-101"
      ],
      "note": {
       "ja": "保存が書けた"
      }
```
新
```text
     "key": "documentFileSaved",
     "source": {
      "kind": "effectResult",
      "rows": [
       "FR-060",
       "FR-101",
       "SX-1"
      ],
      "note": {
       "ja": "`GRS JSON` が書けた（表 T-340 の `SX-1`。`SK-11` でも `IC-2` でも保存である）"
      }
```

<!-- EDIT id=E-08 file=docs/spec/_source/state-machines.json -->
出来事 `documentFileWriteEnded` の出どころ。旧
```text
      "rows": [
       "FR-096",
       "CS-4"
      ],
      "note": {
       "ja": "書き出しが終わった、または保存・書き出しが書けなかった（告げるのは副作用の中身）"
      }
```
新
```text
      "rows": [
       "FR-096",
       "CS-4",
       "SX-2"
      ],
      "note": {
       "ja": "`GRS JSON` 以外の形式の書き出しが終わった（表 T-340 の `SX-2`）、または保存・書き出しが書けなかった（告げるのは副作用の中身）"
      }
```
当てた後に `npm run gen` が `_assets/tbl-state-machines.md` を刷り直す（`state_machines_json_to_md.py`）。状態も遷移も変わらない —— 変わるのは出来事の表の出どころの升 2 つだけである。

<!-- EDIT id=E-09 file=docs/spec/_assets/tbl-glossary.md -->
旧
```text
| U-59 | `File Saved At` | ファイル保存時刻。<br>開いているファイルへ最後に書いた時刻。<br>規則は `FR-101` |
```
新
```text
| U-59 | `File Saved At` | ファイル保存時刻。<br>開いているファイルへ最後に書いた時刻と、そのとき書いた中身の大きさ（`App Header` のファイルの状態の下段）。<br>規則は `FR-101` |
```

<!-- EDIT id=E-10 file=docs/spec/05-07-design.md partial -->
`UF-62` の責務の升。旧
```text
本ユニットは 2 つの値を運ぶだけであり、**順序を運ぶ欄を持たない**。
```
新
```text
本ユニットは名前と時刻と大きさの 3 つの値を運ぶだけであり、**順序を運ぶ欄を持たない**。
```

<!-- EDIT id=E-11 file=docs/spec/05-07-design.md partial -->
`UF-104` の責務の升。旧
```text
`App Header` の中身 —— 文書名・ファイルの名と保存の時刻・ヘッダの入口 —— を描く（`U-31`）。<br>名前を時刻の上に置き（`FR-101`）、時刻を土地の時刻で綴り、
```
新
```text
`App Header` の中身 —— 文書名・ファイルの名と保存の時刻と大きさ・ヘッダの入口 —— を描く（`U-31`）。<br>名前を時刻の上に置き（`FR-101`）、時刻と大きさを 表 T-341 のとおり綴り、2 段を `App Header` の高さに数えずに置き（`HS-8`）、
```

<!-- EDIT id=E-12 file=docs/spec/_source/row-id-prefixes.json -->
`HR` の次、`HT` の前（接頭辞の字の順）。旧
```text
  {
   "prefix": "HT",
```
新
```text
  {
   "prefix": "HS",
   "words": "Header Status",
   "owner": "spec",
   "means": {
    "ja": "ヘッダーのファイルの状態（名前・書けた時刻・大きさ）の見せ方の項目"
   }
  },
  {
   "prefix": "HT",
```

<!-- EDIT id=E-13 file=docs/spec/_source/row-id-prefixes.json -->
`SV` の次、`TC` の前。旧
```text
  {
   "prefix": "TC",
```
新
```text
  {
   "prefix": "SX",
   "words": "Save or Export",
   "owner": "spec",
   "means": {
    "ja": "ファイルへ書けた後に、保存として扱うか書き出しとして扱うかの行"
   }
  },
  {
   "prefix": "TC",
```
当てた後に `npm run gen` が `_assets/tbl-row-id-prefixes.md` を刷り直す（`row_id_prefixes_json_to_md.py`）。

当てた後に打つもの: `npm run gen` → `npm run gen:check` → `bash .claude/skills/spec-graph-check/check.sh`（⚠️ 検査 39 ・ 42 は、波 2 が 9 節の試験を書き直すまで赤になりうる —— 8 節）。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM-1 (flow: every GRS JSON write is a save, T-340 SX-1 / SX-2)
- Where: src/framework/single-html-shell/document-file-flow.ts.
- New: ONE tail used by both saveHeldDocumentToFile (SK-11) and
  exportHeldDocumentToFile (IC-2) when the written form is 'grsJson' and
  saving.ok:
    landSavedDocument(hands, flow, saving, byteLength): void
      - hands.sendFromFlow({ type: 'documentFileSaved', openedFileName })
        with openedFileName = saving.openedFile.kind === 'none' ? null : saving.openedFile.fileName
      - flow.noteFileSaved(byteLength)
  byteLength = the byte length of the content handed to the store
  (new TextEncoder().encode(text).length for GRS JSON).
- DocumentFileFlow: noteFileSaved(byteLength: number): void (was noteFileSaved(): void)
  and readFileSavedByteLength(): number | null beside readFileSavedAt().
- Other forms through IC-2 (mspdi, singleHtml, svg, png): send nothing new;
  documentFileWriteEnded (already sent by beginWritingDocumentFile) is the only event.
- file-gateway.ts: a chosen write becomes the overwrite target only for 'grsJson'
  (ROUND_TRIP_FORMS narrowed; question 4 answered A, JDG-971). The overwrite path (overwriteOpenedFile)
  is unchanged.
- Replace-open landing (landOpenedDocument, OP-3 replace only): carry the read
  file's name as openedFileName (DFC-574) and, per HS-6 (question 1 answered A, JDG-971),
  set the saved-at reading from the opened document's documentStamp.fileSavedUtc
  (AT-140) and the byte length from the reading; merge / overlay: touch neither.

SEAM-2 (header: AppHeaderItems and its drawing, T-341)
- AppHeaderItems (src/adapter/screen-renderer/screen-renderer.ts) gains
    readonly fileSavedByteLength: number | null
  carried by app-header-items.ts from the frame's readings (frame-loop.ts reads
  flow.readFileSavedByteLength()). null exactly when fileSavedAt is null.
- app-header-drawing.ts draws the lower line text as
    `${stamp}  ${size}` (two U+0020 spaces, kept visible: white-space:pre)
  stamp = yyyy/mm/dd hh:mm:ss in local time, zero padded, 00-23 hours
  size  = `${(Math.floor((bytes + 50) / 100) / 10).toFixed(1)}[kB]`
          (integer arithmetic: bytes / 1000 rounded half up to one decimal)
  never saved: the lower line is fileNeverSavedText alone, no size.
- Sizes: ground x S-235 x S-449 (upper) and ground x S-235 x S-210 (lower),
  both read from generated constants (NOT_STORED_FILE_STATUS_SIZES, new
  group in tools/generate_entity_types.py; S-235 from NOT_STORED_CHROME_SCALE).
- Height: the File Status box takes no height in the header's flow (e.g. a
  column box of height 0 whose lines hang evenly about the header's middle,
  children flex-shrink 0). The header's overflow:hidden clips when too tall.
- data-role names unchanged: 'File Status', 'Opened File Name', 'File Saved At'.

Observable (for the tester, from the spec only):
- IC-2 -> U-54 -> GRS JSON -> write succeeds: [data-role="Opened File Name"] is the
  written file's name; [data-role="File Saved At"] text matches
  /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}  \d+\.\d\[kB\]$/ and the size is the
  written bytes / 1000 rounded half up to one decimal; the unsaved-edits state is
  nothingUnsaved (FR-100: leaving raises no host warning); the next SK-11 writes to
  that file without a chooser.
- IC-2 -> MSPDI / single HTML / SVG / PNG: header text, unsaved-edits state and the
  next SK-11's target are all as before the write.
- A cancelled or refused write (either form): nothing moves.
- Header height: with the default 16px ground, the App Header's height equals its
  height with the File Status box removed (display:none) to within 0.5px, and both
  lines' rects lie inside the App Header's border box.
- Never saved: the lower line is the never-saved words and contains no "[kB]".
```

---

## 6. グラフ（`0590ad03`）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 届く先 | 読んだ結果 |
|---|---|---|
| `FR-096` | 要求 6 ／ 参照 15 —— `FR-070`（`:4989` `SK-11` ・ `:4990` `SK-12`）・ `FR-021`（`:5908`）・ `FR-080`（`:6344` `EP-18`）・ `FR-025`（`:6391`）・ `FR-060`（`:6473-6474`）・ `FR-076`（`:7343` `RS-5`）・ `05-07-design.md:363` ・ `:475` ・ `tbl-glossary.md:136` ・ `:530` ・ `tbl-state-machines.md:721` ・ `:734` ・ `:817` | `SK-11`「`FR-096` の定めにより `GRS JSON` で書く」・ `SK-12`「書き出しを開く」は真のまま（`IC-2` の入口は変えない）。`:734` は E-08 が刷り直す |
| `FR-101` | 要求 1 ／ 参照 11 —— `FR-024`（`:6252` `DR-4`）・ `05-07-design.md:517` ・ `:528` ・ `:530` ・ `fig-erd-detail.md:449`（`AT-140`）・ `tbl-glossary.md:139-140` ・ `tbl-settings.md:408` ・ `tbl-state-machines.md:731` ・ `:733` ・ `:741` | `:517` ・ `:530` は E-10 ・ E-11、`:140` は E-09、`:408` は E-06 が刷り直す。`DR-4` ・ `AT-140` は真のまま（`HS-6` が読むだけ） |
| `FR-060` | 要求 4 ／ 参照 18 | E-02 は 1 文足すだけ。`LM-14`（`:226`）・ `RS-1` ・ `RS-2`（`:7339-7340`）は真のまま |
| `FR-051` | 要求 6 ／ 参照 20 | E-05 は `S-235` の掛け方を 表 T-341 へ送るだけ |
| `S-210` | 要求 2 ／ 参照 2 —— `FR-051:4754` ・ `FR-101:6560` | `:4754` は E-05。`:6560` は真のまま（下段の字） |
| `S-235` | 要求 7 ／ 参照 23 | 値も掛ける相手も変えない |
| `U-59` ／ `U-58` | 要求 1 ／ 参照 1 ・ 要求 1 ／ 参照 2 | E-09 だけ |
| `AT-140` | 要求 2 ／ 参照 2 | 変えない（`HS-6` が新しく指す） |
| 表 T-290 | 1 次 1（`FR-060`）／ 2 次 4（`FR-051` ・ `FR-070` ・ `FR-096` ・ `FR-076`） | 状態も遷移も変えない。出来事の表の出どころ 2 升だけ（E-07 ・ E-08） |

### 6.2 `induced.py`

```
seeds: FR-096 FR-101 FR-060 FR-051 FR-100 T-290 T-024 T-227 T-206
-> 9 of 9 resolved, 9 edges inside the seed set, 1 cycle: FR-060 <-> FR-096 (size 2)
```

⇒ 閉路は `FR-060` と `FR-096` の 1 つ（前から在る —— `FR-060` は `FR-096` の書く形式を指し、`FR-096` は `FR-060` の上書きを指す）。**E-01 と E-02 は同じ回に当てること。** 本書は同じ閉路に辺を 1 本足す（E-02 が 表 T-340 を指す）が、新しい閉路は作らない。E-03 〜 E-05 ・ E-09 〜 E-11 はどの順でもよい。

---

## 7. 数の予測（`0590ad03`。当てた後に同じ数え方で突き合わせる）

| 数 | `0590ad03` | 本書を当てた後 | 差 | 数え方 |
|---|---|---|---|---|
| tables / figures / rows / uids（`md-checks.py`） | 212 / 29 / 2685 / 176 | 214 / 29 / 2695 / 176 | 表 ＋2、行 ＋10（`SX` 2 ・ `HS` 8） | `md-checks.py`。⚠️ 生成される表（`tbl-settings.md` の `S-449`、`tbl-row-id-prefixes.md` の 2 行）を数えるかは当てた日に確かめる |
| 表 T-206 の行 | — | ＋1（`S-449`） | ＋1 | `settings.json` の `S-` の `id`（0590ad03 で 392） |
| 接頭辞の登録 | 189 | 191 | ＋2 | `row-id-prefixes.json` の `prefixes` |
| `（MUST）` ・ `（MUST NOT）` の印（`01-04-requirements.md`） | N | N ＋ 28 | E-01 ＋10、E-02 ＋1、E-03 ＋1、E-04 ＋16、E-05 0（ほかのファイルは 0） | 13 節の `verify.py` が新と旧の塊の印を数えた差 |
| 試験が逐語で持たない MUST（検査 39 の unheld） | 基準線 | 基準線 ＋ 新しい MUST の数 | 波 2 の試験が逐語で持てば基準線へ戻る | 検査 39 |

⚠️ 当てた日に `grep -o "（MUST\( NOT\)\?）" docs/spec/01-04-requirements.md | wc -l` を当てる前と後で数え、差が ＋28 であることを確かめる。

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | L4 を待つか | 体 |
|---|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（13 件とも 1 回）。表 ・ 接頭辞 ・ `S-` の最大を測り直す（2 節）。11 節の 4 つの答えは受けてある（`JDG-971`） | — | 調整役 |
| 1a | 仕様の文と原稿 JSON | E-01 〜 E-13、`npm run gen`、変更履歴に 1 行 | ⛔ 待つ —— 仕様の文は L4 の合流の後の 1 回の当て（W0 〜 W5 の形）で当てる | 仕様の持ち場 |
| 1b | 持ち場 L5（ファイルの流れ）: `document-file-flow.ts` ・ `file-gateway.ts` | SEAM-1 —— `landSavedDocument`、`IC-2` の `GRS JSON` で送る、`ROUND_TRIP_FORMS`、`landOpenedDocument` の名（`DFC-574`）と `HS-6` | 待たない（L4 のファイルに触れない）。合流は 1a と同じ回 | L5（実装の体） |
| 1c | ヘッダー: `app-header-drawing.ts`、⛔ `dom-screen-surface.ts` ・ `app-header-items.ts` ・ `screen-renderer.ts` ・ `frame-loop.ts` ・ `tools/generate_entity_types.py`（L4 の持ち場） | SEAM-2 —— 大きさを運ぶ欄、綴り、2 段の字の係数、高さを取らない箱、生成器の群 | ⛔ **待つ**（L4 の 6 ファイル） | L4 が合流した後の体 |
| 2 | 仕様だけを読む試験の体 | 表 T-340 ・ 表 T-341 から試験を書く。9 節の試験を書き直す（実装した体に書かせない） | 1c の後 | 別の体 |
| 3 | ― | 実物で確かめる（Playwright の probe。表示枠は rAF を回さない）: `IC-2` で `GRS JSON` を書き、ヘッダーの 2 段と未保存の編集と次の `Ctrl` ＋ `S` の書き先を見る。MSPDI を書いて何も動かないことを見る。ヘッダーの高さを 2 段の有る無しで比べる | — | 調整役 |

- ⭐ 1b と 1c は別のファイルを持つ。継ぎ目は `DocumentFileFlow` の `readFileSavedByteLength` と `AppHeaderItems.fileSavedByteLength` の 2 つの名だけ —— 両方の依頼文に SEAM-1 ・ SEAM-2 を逐語で写すこと。
- ⭐ 毎フレームの経路には触れない（書けたときに控えを 1 回書くだけ。描くのは今の `fillAppHeader` と同じ回数）。`perf-pending.md` の行は要らない見込み —— `fillAppHeader` が毎フレーム呼ばれるなら、綴りは値が変わったときだけ作ること（1c の体が確かめる）。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`0590ad03` の行番号）

| ファイル | 何を | 波 |
|---|---|---|
| `src/framework/single-html-shell/document-file-flow.ts` | `saveHeldDocumentToFile`（`:683-710`）の保存の後始末 `:703-708` を `landSavedDocument` に出し、`exportHeldDocumentToFile`（`:714-739`）の `saving.ok` の枝で `form === 'grsJson'` なら同じ関数を呼ぶ（`R2.21`）。`noteFileSaved`（`:423-425`）が大きさを受け、`readFileSavedByteLength` を足す。`landOpenedDocument`（`:450-458`）が置き換えのときだけ読んだファイルの名を運ぶ（`DFC-574`）。`HS-6`（問い 1 の答え A、`JDG-971`）の時刻と大きさを控える | 1b |
| `src/adapter/file-gateway/file-gateway.ts` | `:94` の `ROUND_TRIP_FORMS` を `grsJson` だけにし、`:233` の `DEVIATION` を消す（問い 4 の答え A、`JDG-971`。`DFC-720`）。`:239-249` の上書きの道は変えない | 1b |
| `src/use-case/advance-screen-session/file-flow-values.ts` | `:414-418`（`onDocumentFileSaved`）は変えない見込み —— 0.2 節の 4。確かめるだけ | 1b |
| `src/framework/dom-screen-surface/app-header-drawing.ts` | `readableStamp`（`:34-48`）を `HS-2` の綴りへ、`STOP` と `@provisional PND-325` を消す。`fillAppHeader`（`:72-79`）の下段に大きさ（`HS-3`）、書いていないときは大きさを出さない（`HS-5`）。段ごとの字の大きさ（`HS-7`） | 1c |
| `src/framework/dom-screen-surface/dom-screen-surface.ts`（⛔ L4） | `FILE_STATUS_TEXT_SCALE`（`:262`）を消し、`STYLE.fileStatus`（`:292-295`）を高さを取らない箱にする（`HS-8`）。生成された `NOT_STORED_FILE_STATUS_SIZES` を置く | 1c |
| `tools/generate_entity_types.py`（⛔ L4） | 群 `NOT_STORED_FILE_STATUS_SIZES: ['S-210', 'S-449']` を `dom-screen-surface.ts` へ（新しい設定値の行は、生成器が挙げるまで `src` に届かない） | 1c |
| `src/adapter/screen-renderer/screen-renderer.ts`（⛔ L4）・ `app-header-items.ts`（⛔ L4）・ `src/framework/single-html-shell/frame-loop.ts`（⛔ L4） | `AppHeaderItems` と読みに `fileSavedByteLength`（`screen-renderer.ts:99-101` ・ `:478-479`、`app-header-items.ts:167-169`、`frame-loop.ts:1845` ・ `:2089`） | 1c |
| `AT-140` を書く道（問い 1 の答え A、`JDG-971`） | 保存のときに `documentStamp.fileSavedUtc` を書けた時刻で埋める —— `DFC-459`（`実装待ち`）の直しそのもの。`HS-6` の時刻の半分はこれを待つ | 1b（`DFC-459` と組む） |
| 試験（波 2 が書き直す） | `tests/contract/fr-101-the-time-is-local-and-its-own-size.test.ts`（`S-210` の係数の鎖に `S-235` が入る、`:7` の注が消える文を引く）・ `tests/contract/dfc-66-fr-101-a-save-names-the-file-it-wrote.test.ts`（`:93` ・ `:446` の注が消える文を引く）・ `tests/unit/cr-439-app-header-file-status-and-entrances.test.ts` ・ `tests/unit/uf-71.test.ts` ・ `tests/unit/uf-41-42.test.ts:575-576`（`mspdi` の `shouldBecomeOpenedFile`）・ `tests/unit/uf-51.test.ts` ・ `tests/system/measured-sweep.test.ts:1261-1304`（高さを測る件を足す） | 2 |

---

## 10. ⛔ この変更でやらないこと

- `IC-2` の入口・選択面（`U-54`）・提案する名・既にあるファイルへの問い（表 T-227）を変えない（決定 1）。
- `SK-11` の書き方（`FR-060` の問わずに上書き、MSPDI から開いた文書の最初の `SK-11` が問う）を変えない。
- 文書を新しく始めた後（`FR-095`、兄弟の `CR-611`）のヘッダーの 2 段と上書きする先を決めない —— `DFC-783` の「新しく始める」の半分であり、`CR-611` が決める。⚠️ `CR-611` の依頼文にこの点を渡すこと（12 節）。
- 取っ手を残さない書き込み（ダウンロード）の道を足さない（決定 4）。
- 行の高さ 1.2（`STYLE.fileStatus`）を設定値にしない —— 本書の係数はこの値の上で選んだ。数を表へ上げるのは、魔法の数を片付ける回に任せる。
- 開き方の面（`U-56`、`DFC-1324`）に大きさを出さない —— その変更要求が `HS-3` を指す（問い 3 の答え A、`JDG-971`）。

---

## 11. 前に立つ者へ返す問い

⭐ **4 つとも 2026-10-01 に答えを得た** —— 利用者の「それ以外は、全部推奨で」（`JDG-971`、逐語は 0.1 節）により、4 つとも推奨の案である。答えは 4 節の編集に書き入れてある。

| 問い | 案と代償 | 推奨 ／ 答え |
|---|---|---|
| **問い 1** —— ファイルを開いた（置き換えた）直後、まだ保存していないとき、下段に何を出すか | **A** 開いた文書が持つ最後の保存時刻（`AT-140`）と、読んだファイルの大きさを出す。`AT-140` が空（一度も GRS で保存していない）なら「ファイル未保存」。代償: 保存のたびに `AT-140` を文書へ書く造りが要る（`DFC-459`、`実装待ち`）。`DFC-783` も閉じる ／ **B** 保存するまで「ファイル未保存」と出し、大きさを出さない。代償: 小さい。ただしファイルを開いた直後に「ファイル未保存」と出るので、#35 と同じ読み違い（保存が効いていない）を招く | **A** —— ヘッダーがいま向かっているファイルを正しく述べる。`DFC-783` の台帳も「`DFC-459` の直しで閉じる見込み」と読んでいる。⭐ **答え: A（`JDG-971` の ①）** —— `HS-6`（E-04） |
| **問い 2** —— 下段の字の大きさ（見本 `previous-project-result/26-export-shell-crs/header-save-status/header-save-status-sample.html`） | **A** 上段 12px ・下段 10px（`S-449` 1.125 ・ `S-210` 0.9375）。既定の地の文字で 1.6px 余る ／ **B** 上段 10.7px ・下段 9.3px（1.0 ・ 0.875）。地の文字 20px でも切れない ／ **C** 上段 12px ・下段 10.7px（1.125 ・ 1.0）。既定で 0.03px はみ出す（ほぼ切れる寸前）。どれもヘッダーの高さは 29.0px のまま（いまは 41.8px） | **A** —— 名前はいまと同じ 12px で読め、下段は目に見えて小さい。地の文字を 20px に上げた人では上下が 1.4px ずつ切れる。⭐ **答え: A（`JDG-971` の ②）** —— E-06 の `S-449` 1.125 ・ `S-210` 0.9375 |
| **問い 3** —— 大きさの綴り | **A** `48.2[kB]`（1000 で割る、小数 1 桁、図の `[kB]` のまま。開き方の面（`JDG-854` の「(100kB)」）も同じ綴りにする）／ **B** 整数 `48[kB]`（図の「xx」を 2 桁の整数と読む。500 バイト未満は `0[kB]`）／ **C** 1024 で割る（Windows のファイル一覧と数が揃う。ただし単位は `KiB` と書くのが正しい）。どれも代償は綴りの違いだけ | **A** —— `kB` は 1000 倍。小数 1 桁なら小さな文書でも違いが読める。2 つの面を 1 つの綴りにする（`R2.21`）。⭐ **答え: A（`JDG-971` の ③）** —— `HS-3`（E-04） |
| **問い 4** —— `IC-2` で MSPDI を書いた後、上書きする先を動かすか（`DFC-720` の半分） | **A** 動かさない（`SX-2`。`ROUND_TRIP_FORMS` から `mspdi` を外す）。次の `Ctrl` ＋ `S` は元の `.json` へ問わずに書く ／ **B** いまのまま `.xml` を上書きする先にする。次の `Ctrl` ＋ `S` は保存先を問う（`.xml` へは書かない）。代償: 表 T-340 の `SX-2` の「上書きする先」の升を「MSPDI だけは書いたファイル」に分け、ヘッダーの名前は動かない（名前と上書きする先が食い違う） | **A** —— 「GRS JSON 以外の形式は書き出しのまま」（`JDG-892`）の読み方であり、名前と上書きする先が揃う。⭐ **答え: A（`JDG-971` の ④）** —— `SX-2`（E-01）と 9 節の `ROUND_TRIP_FORMS` |

⭐ 4 つの答えは、どれも 4 節の編集にそのまま書いてある —— 当てる体が書き換える所は無い。残る問いは無い。

---

## 12. 台帳

| ID | 何か | 状態（前に立つ者が書く） |
|---|---|---|
| `JDG-884` ・ `JDG-892` | 0.1 節 | 「指示 —— `CR-610` が当てる」 |
| `JDG-971` | 11 節の問い 1 〜 4 への答え（4 つとも推奨） | 前に立つ者が起こした。本書が当たったら「指示 —— `CR-610` が当てる」へ |
| `DFC-1366` | `IC-2` の `GRS JSON` が保存にならない | 本書の 1b が閉じる |
| `DFC-1354` | ヘッダーの 2 段・綴り・大きさ・縦幅 | 本書の 1a ・ 1c が閉じる |
| `PND-325` | 時刻の綴り | 閉じる —— 答えは `JDG-884` の図（`yyyy/mm/dd hh:mm:ss`） |
| `DFC-574` | 開いたファイルの名前がヘッダーに出ない | 本書の 1b が同じ関数で直す（仕様は既に在る） |
| `DFC-783` | 開く・新しく始めるの後に前の保存時刻が残る | 問い 1 の答えが A なので（`JDG-971`）、「開く」の半分を本書が閉じる。「新しく始める」の半分は `CR-611` へ渡す |
| `DFC-720` | `SK-11` の対象形式と `ROUND_TRIP_FORMS` の食い違い | 問い 4 の答えが A なので（`JDG-971`）、`IC-2` の半分を本書が閉じる |
| `DFC-217` | `S-210` を名前にも掛ける（2026-09-03 の裁定） | 閉じたまま。`JDG-884` が後から覆したことを備考に 1 行足す |
| `DFC-1423` | 0.2 節の 6 —— `FR-051` は 2 段の字に `S-235` を掛けよと定めるが、コードは掛けない（12px ＝ 16px × 0.75） | 前に立つ者が起こした。本書の 1c で閉じる（`HS-7`） |
| `DFC-553` の ② | 0.2 節の 8 —— `S-210` が生成されず、`FILE_STATUS_TEXT_SCALE` に手で写されている | 本書の 1c で閉じる（生成器の群）。⚠️ 前に立つ者が起こした `DFC-1424` は、同じ件として `取下げ` にした |

⭐ **前に立つ者が 2026-10-01 に起こした台帳の行と、それを持つ変更要求**（4 本に同じ表を置く）:

| 行 | 持つもの |
|---|---|
| `DFC-1420` ・ `DFC-1421` | `CR-611` が閉じる |
| `DFC-1422` | `CR-611` の起草で見つけた仕様の穴。どの変更要求も閉じない |
| `DFC-1423` | 本書が閉じる（`DFC-553` の ② も本書） |
| `DFC-1424` | `取下げ` —— `DFC-553` の ② と同じ件 |
| `DFC-1425` ・ `DFC-1426` ・ `DFC-1427` | `CR-612` が閉じる |
| `DFC-1428` | `CR-613` の問い 2 の答えにより、別の変更要求が閉じる（番号は調整役が振る） |
| `JDG-970` ・ `PND-611` | `CR-612` の問い 1（保留） |
| `JDG-971` ・ `JDG-972` ・ `JDG-973` ・ `JDG-974` | 本書 ・ `CR-611` ・ `CR-612` の問い 2 ・ `CR-613` |

---

## 13. 測り方の再現

```
# the tree: refactor 0590ad03 (branch b3-export-shell-crs)
git log --oneline -1                     # -> 0590ad03 Rule JDG-950: ...

# the rulings (section 0.1)
sed -n 1167p docs/development-records/rulings.md   # JDG-884
sed -n 1175p docs/development-records/rulings.md   # JDG-892
sed -n 235p docs/development-records/fixed-defects.md   # DFC-217 (2026-09-03)

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-096 FR-101 FR-060 S-210 FR-051 U-59
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py U-58 T-290 S-235 AT-140
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-096 FR-101 FR-060 FR-051 FR-100 T-290 T-024 T-227 T-206
#   -> 9 of 9, 9 edges, 1 cycle (FR-060 FR-096)

# totals (section 7)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py   # -> tables=212 figures=29 rows=2685 uids=176

# new identifiers (section 2)
grep -oh "表 T-[0-9]\+" docs/spec/*.md docs/spec/_assets/*.md | sort -u | sed 's/表 T-//' | sort -n | tail -1   # -> 339
#   S- max over settings.json ids -> 448 (392 ids)
git grep -l "\bSX-[0-9]"   # -> none
git grep -l "\bHS-[0-9]"   # -> none
git grep -l "\bFS-[0-9]"   # -> docs/review/inventory/A08-poc-results.md, U2-ui-detail.md (so not FS)

# rulings reached (section 0 ③): every "| JDG-" row of rulings.md grepped for
#   FR-101 FR-096 S-210 U-58 U-59 ファイル名 保存日時 保存時刻 kB ヘッダーの縦 DFC-720 DFC-783 IC-2
#   -> JDG-123 JDG-854 JDG-884 JDG-892 (plus JDG-79 / JDG-265 / JDG-300, which mention neither the header nor the save)

# the code (section 0.2)
grep -n "documentFileSaved\|noteFileSaved" src/framework/single-html-shell/document-file-flow.ts   # -> :705 :706 only on the save road
grep -n "ROUND_TRIP_FORMS\|shouldBecomeOpenedFile" src/adapter/file-gateway/file-gateway.ts           # -> :94 :234
grep -n "openedHandle = handle" src/framework/file-system-access-file-store/file-system-access-file-store.ts  # -> :365
grep -n "openedFileName: null" src/framework/single-html-shell/document-file-flow.ts                  # -> :456 (DFC-574)
grep -n "FILE_STATUS_TEXT_SCALE" src/framework/dom-screen-surface/dom-screen-surface.ts               # -> :262 :295
grep -n "S-210" tools/generate_entity_types.py                                                        # -> none

# the other change requests touching the old blocks (header block "当てる順")
grep -l "時刻の綴りそのもの\|ファイルの名前と保存した日時の字\|MSPDI で開いた文書の最初の" change-request/*.md
#   -> CR-317, CR-395 (both landed; authors of the sentences)
grep -l "合流と重ね（表 T-024a の \`OP-3\`）で開いた後も\|2 つの値を運ぶだけ\|時刻を土地の時刻で綴り\|開いているファイルへ最後に書いた時刻。" change-request/*.md
#   -> CR-594 (landed, author of E-02's old sentence)
grep -l "保存が書けた\|書き出しが終わった、または" change-request/*.md
#   -> CR-460, CR-510 (both landed; authors of the two notes)
#   no drafted CR (CR-598 .. CR-613) quotes any old block of section 4

# every old block of section 4 occurs exactly once; the edits apply to COPIES
PYTHONIOENCODING=utf-8 python <scratchpad>/g610/verify.py change-request/CR-610-*.md

# header height (section 0.2 item 6, question 2): open the sample, viewport 1280x900
#   previous-project-result/26-export-shell-crs/header-save-status/header-save-status-sample.html
#   read .readout[data-height] / [data-over] per case, ground 16px and 20px
#   -> 16px: base 29.0, today 41.8, A/B/C 29.0 (clip 0 / 0 / 0.03)
#   -> 20px: base 31.6, A/B/C 31.6 (clip 1.4 / 0 / 1.9)
```

### 13.1 ⚠️ 測りが見られなかったもの

- 出荷ビルドのヘッダーは測っていない。高さは、コードの寸法（`STYLE.appHeader` ・ `entryGlyphRoom` ・ `S-225` ・ `S-235`）を写した見本で測った —— 宿主の字体は見本のもの（`system-ui`）である。
- `IC-2` で `GRS JSON` を書いた後に `Ctrl` ＋ `S` がそのファイルへ書く（0.2 節の 2）は、コードを読んで言った。走らせてはいない。
- `GRS JSON` が 50 バイトより必ず大きい（決定 6）は、文書の形（表 T-052 の `DR-4` のルートの 3 つの鍵と日程の群）から言った。最小の文書を書いて数えてはいない。
- `md-checks.py` が生成される表の行を数えるかは確かめていない（7 節）。
