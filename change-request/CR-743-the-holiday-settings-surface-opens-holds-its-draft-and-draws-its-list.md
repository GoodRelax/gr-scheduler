# CR-743 —— 休日の設定（`U-65`）を開けるようにし、下書きを状態機械に持たせ、欄の確定と断りと一覧の描き方を定める

> 起草の状態（当てる前の記録）: **下書き（当てていない）**。2026-10-11、作業木 `f4ca3bef` の上で起草した。`docs/spec`・`src`・`tests` には何も触れていない —— 調整役の段取りで、`CR-710` の波を整える体が `src` を直しているあいだに起草し、当てるのはその後である。
> ID の帯: 番号 `CR-743` だけを調整役から受けた。`f4ca3bef` の木で `CR-743` を名乗るものは 0 件（13 節）。裁定の行は足さない —— 本書が当てる利用者の判断は、すでに `適用済` の `JDG-1967`〜`JDG-1970`（`CR-710` の波 0）と、利用者が裁定済とした `PND-432`（2026-09-07）の内側にある。問いは 11 節に 1 つ。
> 新しい行 ID は 1 つ —— 表 T-344 の `WC-10`（`f4ca3bef` で `WC-10` は 0 件。`WC-` の行は `WC-1`〜`WC-9` の 9 行。当てるときに数え直す）。新しい名は状態機械 1 つ・出来事 3 つ・辞書の区 1 つ（2 節）。ユニットを分けるなら 表 T-075 に 3 行（5 節。番号は当てるときに数える —— `f4ca3bef` の `UF-` の末尾は `UF-202`）。
> 閉じるもの: `DFC-1671`（下書きの置き場と例外日の欄の種類）・`DFC-2318`（表 T-257 の `RR-2`〜`RR-5`）。`PND-140` は `U-65` の分だけ答える（`未裁定` のまま、ほかの面は本書の外）。`PND-607`（当てられない例外日の行）は 11 節で問う。
> `CR-605`（面を起こした）・`CR-710`（`WC-8`・`WC-9`・`IC-163`〜`IC-165`）・`CR-722`（表 T-257 を `FR-088` へ移した）は着地しており、着地した変更要求は追記を取らない（検査 62）ので、別の番号で当てる。`CR-742`（下書き）とは同じ原稿 `state-machines.json` の領域 `screen` に機械を足す —— 12 節。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`f4ca3bef`）

| 主張（台帳の行・指示） | 見たもの | 本書での扱い |
|---|---|---|
| 出荷の造りで休日の設定が開かない（2026-10-11、見本の体が `2bb7d3ce` で見た） | `f4ca3bef` でも同じ（読みで確かめた。実物は押していない）。`src/adapter/input-command-translator/input-command-translator.ts` の `ENTRY` に `IC-132` が無い。`screen-state-input.ts` の `surfaceEntered` を呼ぶのは書き出しの面（`IC-2`）だけ。⇒ パレットに `IC-132` は描かれる（`icon-roster.json`）が、押しても `surfaceEntryPressed` が出ない | 表 T-280 の `surfaceEntryPressed` の出どころに `IC-132` を足す（X-9）。翻訳は 5 節 |
| `src` に `IC-133`〜`IC-138`・`IC-163`〜`IC-165` の欄が無い | `git grep` で `src/**/*.ts` に 0 件。生成した 4 つの JSON（`display-words.json`・`help-roster.json`・`icon-roster.json`・`icon-glyphs.json`）にだけ在る。`open-modals.ts` の最後の枝は `// STOP: … (DFC-1671)` と `@provisional PND-140` で、見出しと入口しか組まない | 正しい。仕様の穴（`DFC-1671`）を本書が埋め、コードは 5 節 |
| `FR-088` は下書きを持つと言うが、置き場が無い（`DFC-1671`） | `FR-088` に「面は下書きを持ち、当てる入口（`IC-138`）を押したときだけ…`CM-39` を 1 回発行」「閉じたときは下書きを捨てる」が在る。表 T-280 の `openSurfaceStateMachine.open` が運ぶのは `surfaceName` だけ。下書きを運ぶ機械は無い | 正しい。領域 `screen` に `calendarDraftStateMachine` を足す（X-8） |
| 例外日の欄の種類が決まっていない（`DFC-1671` の後半） | 表 T-344 の `WC-4` は欄の名（`AT-78`〜`AT-81`）だけを言い、文字の欄か日付の欄か・確定の作法を言わない。`DFC-2036` は、前の面が保存の字面（`yyyy-mm-ddThh:mm:ss`）をそのまま出していたと記録した | `WC-4` に欄の種類と確定を書く（X-4） |
| 表 T-257 の描き方を誰も持たない（`DFC-2318`） | `open-modals-drawing.ts` の `holidaySettingsBoxStyle` が `RR-1`（`S-240`）だけを当てる。`RR-2`〜`RR-5` を描く所は無い。`DomScreenSurface` の `NOT_STORED_WHEEL_UNITS` の写しを読む者が居ない | 仕様は在る。⚠️ ただし `RR-2`・`RR-4` の「一覧」が `U-65` のどの段かを言わない —— 曜日・時間帯の段と例外日の一覧が 1 つの面に在る。`RR-2` に段を名指す（X-7） |
| `CM-39` は下書きの全部を受け、同じなら書かない | `edit-calendar.ts` の `editCalendar` は `workingDayTypes`・`weekStartDay`・`exceptions`（直した後の一覧の全部）・`workingTimes`（`WC-8` の 1 組）を受け、何も動かなければ同じ参照を返す（取り消しの段を残さない）。例外日は `ordinal` で前の行と突き合わせ、足した行と日の動いた行だけ時刻を刻む（`CR-649`）。`refusalsOf` は `IV-17`・`IV-24`（`workingTimesBreach`）を断る | 正しい。下書きの断り（X-6）は同じ述語を使い、写しを作らない（5 節） |
| `PND-140` —— 開いた面ごとに何を運ぶか | 表 T-280 の機械が運ぶのは状態であり、面の中身は描き手（`open-modals.ts` の `openModalFromSession`）が文書と状態から組む。`Difference Review` の候補は領域 `fileFlow` の機械が運ぶ値（`mergeCandidates`）で、面の中身はそこから組む | `U-65` も同じ形にする —— 機械は下書きだけを運び、面の中身は描き手が下書き（無ければ文書）から組む（③ の X-a） |

### 0.2 裁定の鎖（`rulings.md` を「休日の設定」「暦」「下書き」「例外日」「時間帯」「`U-65`」「`IC-13`」「`WC-`」「`T-257`」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `PND-432`（2026-09-07 裁定済）・`JDG-889` | 暦の面を独立して立てる。プロパティパネルに置かない。下書きを当てるときだけ `CM-39` を 1 回 | 変えない。本書は下書きの置き場を名指すだけ |
| `JDG-991`・`JDG-992` | 入口はコマンドパレット。例外日は繰り返しの無いものを、休みも稼働も | 変えない |
| `JDG-1154`・`JDG-1156`・`JDG-1157`・`JDG-1181`・`JDG-1182` | 面の名 `休日の設定` ／ `Holiday Settings`、入口の語（追加・適用・削除） | 変えない —— 本書が足す語（X-10）はこの語に揃える |
| `JDG-1220`・`JDG-1221` | 例外日の日付の時刻は `editCalendar` だけが刻む | 変えない —— 下書きは日付だけを持つ（X-4） |
| `JDG-1300` | 繰り返しの無い例外日の述語（`AT-82`） | 変えない —— `WC-5` の判じは同じ述語 |
| `JDG-157`・`JDG-374` | 一覧の字・送り・罫・閉じる入口（表 T-257） | 変えない —— `RR-2` の「一覧」を名指すだけ（X-7） |
| `JDG-1702`・`JDG-1787` | 稼働日の時間帯を面で直す。面が示す 1 組と、書く曜日・保つ曜日 | 変えない |
| `JDG-1967` | 欄「稼働日の時間帯」は曜日と週の始まりの下 | X-7 の段の分け方の根拠 —— 例外日の一覧だけが送られ、時間帯の欄は動かない |
| `JDG-1968` | 合計が `minutesPerDay` と違う組を当てたときも `RS-89` を 1 度 | X-8 の効果 `issueCalendarCommand` の後で告げる（③ の X-g） |
| `JDG-1969` | [＋] の行は最後の終わりの 1 時間後から 1 時間 | 変えない（`WC-8` に在る） |
| `JDG-1970` | 足した例外日は休みで始まる | 変えない（`WC-6` に在る） |
| `JDG-1978` | 時刻の無い日付の字の読み | 変えない —— 例外日は丸 1 日の範囲（`WT-6`・`WT-7`）で、本書は日付だけを打たせる |

覆す裁定は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-1`（`GL-008`）—— 交換相手と同じ暦（稼働する曜日・時間帯・例外日・週の始まり）を、`GRS` の中で直せる。今は `CM-39` に人の入口が 1 つも無い（`PND-432` が 2026-09-07 に挙げた穴が、コードでは今も開いている）。
- `CH-4`（`GL-006`）—— 面の一覧が長くても題と閉じる入口が見え、名前の欄が左に残り、欄の誤りがその場で読める（X-5〜X-7）。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 下書きを捨てる時は 表 T-280 の機械だけが持ち、`FR-088` の「閉じたときは下書きを捨てる」は機械を指す文へ替える（X-1）。断りの語は辞書だけが持ち、表 T-344 は辞書の鍵を名指す（X-6・X-10）。下書きの断りの条件は `IV-17`・`IV-24` を名指し、写さない。
- `R2.21`（関心の分離）—— 下書きを組む規則（`WC-6` の初めの値・`WC-8` の [＋] の初めの値・面が示す 1 組）は純粋な関数に置き、翻訳と描き手はそれを呼ぶ（5 節）。下書きの断りと `editCalendar` の断りは同じ Entity の述語を使う。
- `R2.22`（名は指すものを言う）—— `calendarDraftStateMachine`（暦の下書き）、出来事 `calendarDraftEdited`（下書きを直した）・`calendarApplyEntryPressed`（`IC-138` を押した）、効果 `issueCalendarCommand`（`CM-39` を出す）。`CR-742` の `baseTimeZoneDraftStateMachine`・`timeShiftDraftStateMachine` と同じ名の族（〈何の〉`DraftStateMachine`）。
- 表が正 —— 欄の種類・確定・断りは 表 T-344 の行に置き、`FR-088` は表を指す（X-2〜X-6）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 下書きは 表 T-280 の領域 `screen` の機械 `calendarDraftStateMachine` が運ぶ（`DFC-1671` の案 ①）。⚠️ 計画の欄（`handoff.md` の 2026-10-08）が書いた案 ③（フレームの循環が面の中だけに持つ）は採らない | 案 ③ の先例とされた `Difference Review` の候補は、実は領域 `fileFlow` の機械の運ぶ値（`mergeCandidates`）である —— 先例をたどると案 ① に着く。`CR-742` も基準の変更の下書きを同じ形で持つ。画面の値は表 T-280 の機械が持つ（Chapter 5.6 の ADR-002） | 機械 1 つと出来事 3 つが原稿に増える |
| X-b | 機械は「直したか」だけを状態にし、直していないあいだ（`untouched`）は面が文書の暦をそのまま見せる。初めて直したときに、文書の暦から下書きを組んで `drafted` へ移る | `CR-742` の X-13 と同じ形。開いた瞬間に文書を写すと、開いているあいだに取り消しで変わった暦が面に出ない | — |
| X-c | 下書きの欄は、確定（`Enter`・欄を離れる・欄の外を押す —— 表 T-028 の `IN-6`）のときに下書きへ書く。打っている途中の字では断りを判じない | 他の欄（プロパティパネル・設定の面）と同じ確定の作法。打鍵ごとに出来事を出すと、画面の値の機械が字ごとに進む | 見本 52 は打つたびに赤くした。本書では欄を離れてから赤くなる |
| X-d | 時刻の欄の読めない字（`8`・`25:00`）は、下書きに字のまま残し、欄を 表 T-236 の `S-154`（不良の色）で囲み、断りの 1 行（`WC-10`）を出す。例外日の日付の欄の読めない字は、プロパティパネルの日付の欄と同じく欄を元の値へ戻し、表 T-233 の `RS-87` を告げる | 時刻は見本 52（合意した見た目）の作り。日付は `FR-006` の日付の欄の作法がすでに在り、2 つ目の作法を作らない | 時刻と日付で、読めない字の扱いが違う |
| X-e | `IC-138` は、下書きに断り（`WC-10`）が 1 つでもあるあいだ薄くする（`FR-029`）。下書きが文書と同じときは薄くしない —— 押しても `CM-39` は文書を変えず、取り消しの段も残さない（`WC-7` のまま） | 見本 52 の作り。`editCalendar` はすでに同じ参照を返す | — |
| X-f | 当てた後も面は開いたまま。下書きは捨て（`untouched`）、面は当てた後の文書を見せる | `WC-7` は閉じると言わない。見本 52 も開いたまま。当てた結果を同じ面で読める | — |
| X-g | `RS-89` を当てたときに告げるのは、`CM-39` が文書を変えたときだけ | 何も当てていないのに「当てた組が違う」と告げない（`JDG-1968` の「当てたとき」の読み） | — |
| X-h | 開いているあいだに取り消し・やり直し・`Agent API` が暦を変えても、下書きは捨てない。当てると下書きの全部が書かれる | 下書きは画面の値で、文書の履歴に乗らない（`FR-031`）。捨てると、打ちかけの例外日の行が黙って消える | 直しかけのまま取り消すと、当てたときに取り消した暦の上へ下書きが書かれる（1 回の `Ctrl+Z` で戻る） |
| X-i | 面の段: 題の段（`WC-1`）と、上の段（`WC-2`・`WC-3`・`WC-8`・`WC-9`）と、下の段（`WC-6`・`WC-7`）は送られない。例外日の一覧（`WC-4`・`WC-5` の行）だけが縦と横に送られ、列の見出しの行は一覧の上に残る | `JDG-1967` の「例外日の一覧が長くなっても欄が下へ逃げない」。`RR-2` の「一覧の行の並びだけ」を `U-65` の段で読む | 面の高さが低いと、一覧の見える行が少なくなる |
| X-j | 足す語（X-10）は見本 52 の語を採る —— 段の見出し・列の見出し・断り・`WC-9` の 1 行・`IC-137` の稼働の側の語・`WC-5` の繰り返しの語 | `JDG-1787` が見本で見せると決め、利用者は見本 52 の並び（`JDG-1967`〜`JDG-1970`）に答えた。語そのものへの異論は出ていない | 語を替えるときは辞書の 1 か所 |
| X-k | `PND-140` は `U-65` の分だけ、行の推奨（面で判別する共用体）で答える。ほかの面は本書の外 | `PND-140` の推奨どおり。`U-65` の中身は描き手が下書きと文書から組む（X-a） | `PND-140` は `未裁定` のまま残る |

---

## 1. 範囲 —— 行き先

| 観点 | 今（`f4ca3bef`） | 本書の後 |
|---|---|---|
| コマンドパレットの [休日の設定] を押す | 何も起きない | 休日の設定が開く（`IC-132` → `U-65`） |
| 曜日を 1 つ押す | — | 下書きだけが変わり、文書は変わらない。`IC-138` で 1 回だけ書かれ、取り消し 1 回で戻る |
| 時間帯の始まりに `8` と打って欄を離れる | — | 欄が不良の色で囲まれ、「時刻の形ではない（8）—— 0:00〜24:00 の形で打つ」の 1 行が出て、[適用] が薄い |
| 例外日の始まりの日に `2026/13/1` と打つ | — | 欄は元の日に戻り、`RS-87` が出る |
| 例外日を 40 行持つ文書 | — | 例外日の一覧だけが縦に送られ、題・曜日・時間帯・[追加]・[適用] は見えたまま。`Ctrl`+`Shift`+ホイールで一覧だけが横に送られ、名前の欄は左に残る |
| 直しかけで [×] か `Esc` | — | 下書きを捨てて閉じる（問わない） |

---

## 2. 新しい識別子

| 名 | 置き場 | 何か |
|---|---|---|
| `WC-10` | 表 T-344 | 断りの 1 行（X-6） |
| `calendarDraftStateMachine` | `docs/spec/_source/state-machines.json` の領域 `screen`（表 T-280） | 暦の下書き（X-8） |
| `calendarDraftEdited`・`calendarApplyEntryPressed` | 同じ領域の出来事 | 下書きを直した ／ `IC-138` を押した（X-8） |
| `documentReplaced`（領域 `screen`） | 同じ領域の出来事 | 領域 `notices` に同じ鍵が在る（`WS-6`・`WS-7`）。出来事は領域ごとに 1 度定める決まりなので、`screen` にも定める（X-8）。⚠️ `CR-742` の X-d も同じ出来事を要る —— 先に当てたほうが定め、後のほうは使うだけ（12 節） |
| `holidaySettings` | `docs/spec/_source/display-words.json` の区 | 面の段の見出し・列の見出し・断り・`WC-9` の 1 行の語（X-10） |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `FR-088` の「閉じたときは下書きを捨てる。」 | 下書きの置き場と捨てる時は 表 T-280 の機械を指す（X-1） |
| `src/adapter/screen-renderer/open-modals.ts` の `// STOP: spec does not decide where Holiday Settings holds its T-344 draft (DFC-1671)` と `@provisional PND-140` | 外す（5 節） |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` の、読む者の居ない `NOT_STORED_WHEEL_UNITS` の写し（`DFC-2318`。同じ名は `dom-input-source.ts`・`properties-panel-drawing.ts` にも在る） | `RR-3` の送りが読む（5 節）。読まないなら外す |

消す仕様の行は無い（行を足し、升に書き足すだけ）。

---

## 4. 書き直す所

### 4.1 `FR-088`

#### X-1 —— `FR-088` の RATIONALE（「⭐ 面は下書きを持ち、当てる入口（`IC-138`）を押したときだけ、…」の次の文）

旧:

```
閉じたときは下書きを捨てる。
```

新:

```
下書きを持つ所と、下書きを捨てる時（閉じたときほか）は、表 T-280 の `calendarDraftStateMachine` に従うこと（MUST）。
欄の確定は下書きを書き換えるだけであり、文書へ書くのは `IC-138` だけである —— 欄の種類・確定・断りは 表 T-344 の各行が持つ。
```

### 4.2 表 T-344

#### X-2 —— `WC-2` の「定め」の升（「押すたびに、…入れ替わる。」の次）

```
並びの始まりは下書きの週の始まり（`WC-3`）とする —— 選び直すと並びもすぐ替わる。
```

#### X-3 —— `WC-3` の「定め」の升（末尾に足す）

```
<br>選ぶ欄とし、選んだら下書きの週の始まりを替える。
```

#### X-4 —— `WC-4` の「定め」の升（「⭐ 繰り返しの無い例外日では、…」の前に足す）

```
<br>名前は文字の欄とし、空を許す（交換相手の `Name` は任意）。<br>始まりと終わりの日は、`FR-006` の 表 T-016 の入力の型が `日付` の欄と同じ欄とする —— 日付だけを見せて打たせ（表 T-375 の `TX-3` の「時刻を表示しない」側の形、時刻を表示していても同じ）、読めない字と扱える範囲（表 T-214）の外の日は欄を元の値へ戻して 表 T-233 の `RS-87` を告げる。<br>どの欄も、確定（表 T-028 の `IN-6`・`SK-19`）で下書きへ書く
```

#### X-5 —— `WC-8` の「定め」の升（「1 本を 1 行とし、…」の文の次）

```
<br>時刻の欄は `H:MM`（表 T-375 の後の段の時刻の形）で見せ、`H:MM` と `HH:MM` を読む。<br>確定（表 T-028 の `IN-6`・`SK-19`）で下書きへ書き、読めた値は見せる形へ整える（`08:00` → `8:00`）。<br>終わりの側の `0:00` は `24:00` と読む（`IV-24`）。<br>読めない字は下書きに字のまま残す（`WC-10`）
```

#### X-6 —— 表 T-344 に `WC-10` を足す（`WC-7` の前）

```
| WC-10 | 断り | 下書きが当てられないあいだ、断りを 1 件 1 行で、その段（`WC-2`・`WC-8` の断りは `WC-9` の下、`WC-4` の断りは一覧の下）に出す。<br>語は `FR-038` の辞書の区 `holidaySettings` の `timeNotReadable`（時刻の欄の字が `WC-8` の形で読めない）・`startNotBeforeEnd`（始まりが終わりより前でない）・`rangesOverlap`（2 本が重なる —— 接する 2 本は重ならない）・`noWorkingWeekday`（稼働する曜日が 1 つも無い、`IV-17`）・`exceptionFromAfterTo`（例外日の始まりの日が終わりの日より後）。<br>⭐ 時間帯の 3 つは `IV-24` を、曜日の 1 つは `IV-17` を、`CM-39` が断るのと同じ判じで読む —— 面だけの規則を作らない。<br>断りを持つ時刻の欄は、`_assets/tbl-settings.md` の 表 T-236 の `S-154` の線で囲む。<br>⛔ 断りが 1 つでもあるあいだ、`IC-138` を薄くする（`FR-029`）。<br>⚠️ 断りは告知（`FR-076`）ではない —— 面の中の 1 行であり、直せば消える |
```

⚠️ `exceptionFromAfterTo` は 11 節の問い 1 の答えで変わる（推奨のままなら上のとおり）。

#### X-7 —— 表 T-257 の `RR-2` の「定め」の升（末尾に足す）

```
<br>⭐ 休日の設定（`U-65`）の「一覧」は 表 T-344 の `WC-4`・`WC-5` の行の並びであり、列の見出しの行はその上に残す。<br>`WC-2`・`WC-3`・`WC-8`・`WC-9` の段と、`WC-6`・`WC-7`・`WC-10` の段は送らない —— 例外日の一覧が長くなっても、時間帯の欄と当てる入口が見えたままである。<br>`RR-3`・`RR-4`・`RR-5` も同じ一覧に当てる（`RR-4` の名前の欄は `WC-4` の名前）
```

### 4.3 表 T-280（`state-machines.json` の領域 `screen`）

#### X-8 —— `calendarDraftStateMachine` を足す

| 状態 | 初め | 運ぶもの | 根拠 |
|---|:--:|---|---|
| `untouched` | ○ | — | `FR-088`・`WC-7` |
| `drafted` | | `calendarDraft` —— 稼働する曜日の集合（`AT-73` の符号）・週の始まり（`AT-17` の符号）・時間帯の行の並び（各行は始まりと終わりの字）・例外日の行の並び（`Exception` の形。足した行は `ordinal` が文書の最大 ＋ 1 から） | `FR-088`・表 T-344 |

| 出来事 | 出どころ | 運ぶもの | 遷移 |
|---|---|---|---|
| `calendarDraftEdited` | 入力（`IC-133`・`IC-134`・`IC-135`・`IC-136`・`IC-137`・`IC-163`・`IC-164`・`IC-165`、`WC-4` の欄の確定） | `calendarDraft`（直した後の下書きの全部） | どちらからも `drafted`。`untouched` からは、翻訳が文書の暦から組んだ下書きに直しを当てたもの（X-b） |
| `calendarApplyEntryPressed` | 入力（`IC-138`） | — | `drafted` で、ガード `hasNoCalendarDraftRefusal`（`WC-10` の断りが無い）を満たせば `untouched` へ。効果 `issueCalendarCommand` —— シェルが下書きで `CM-39` を 1 回出す。`untouched` では何もしない（升を置かない） |
| `surfaceCloseAsked`・`escapePressed`・`surfaceEntryPressed`・`surfaceRaisedByFlow`・`watermarkEntryPressed` | 既にある出来事 | — | `drafted` で、ガード `leavesHolidaySettings`（この出来事で開いている面が `U-65` でなくなる）を満たせば `untouched` |
| `documentReplaced`（領域 `screen` に定める） | 効果の結果（`WS-6`・`WS-7`） | — | `drafted` → `untouched` |

⭐ 面（`WC-2`〜`WC-10`）は、`drafted` では下書きから、`untouched` では文書の暦から組む。組み方（面が示す 1 組・`WC-9` の曜日・`WC-6` と [＋] の初めの値）は `FR-088` と 表 T-344 が持つ。
⭐ `issueCalendarCommand` の後、`CM-39` が文書を変え、当てた 1 組の合計が `Project.minutesPerDay`（空なら `S-128`）と違うときに 表 T-233 の `RS-89` を 1 度告げる（`FR-088`、X-g）。

`npm run gen` が `_assets/tbl-state-machines.md`（表 T-280）と `src/use-case/advance-screen-session/screen-values.ts` の型と初期値を作り直す（手で直さない）。

#### X-9 —— 領域 `screen` の出来事 `surfaceEntryPressed` の出どころ（`source.rows`）

旧: `IC-2`・`SK-12` ／ 新: `IC-2`・`SK-12`・`IC-132`（運ぶ `surfaceName` は `U-65`。`openSurfaceStateMachine.open` の `surfaceName` はすでに `U-65` を持つ）

### 4.4 辞書（`FR-038`）

#### X-10 —— `docs/spec/_source/display-words.json` に区 `holidaySettings` を足す（語は見本 52、X-j）

| 部 | ja | en |
|---|---|---|
| `workingWeekdays`（`WC-2` の段の見出し） | 稼働する曜日 | Working Weekdays |
| `weekStart`（`WC-3`） | 週の始まり | Week Starts On |
| `workingHours`（`WC-8`） | 稼働日の時間帯 | Working Hours |
| `rangeFrom` ／ `rangeTo`（`WC-8` の列） | 始まり ／ 終わり | From ／ To |
| `exceptionDays`（`WC-4` の段の見出し） | 例外日の一覧 | Exception Days |
| `exceptionName` ／ `exceptionFrom` ／ `exceptionTo` ／ `exceptionKind`（`WC-4` の列） | 名前 ／ 始まりの日 ／ 終わりの日 ／ 休みか稼働か | Name ／ Start ／ Finish ／ Day Off or Working |
| `dayWorking`（`IC-137` の稼働の側の語。休みの側は `IC-137` の label「休み」） | 稼働 | Working |
| `repeating`（`WC-5` の繰り返しの語） | 繰り返し —— ここでは直せない | Repeats; cannot be edited here |
| `otherHoursWeekdays`（`WC-9`、`{weekdays}` は辞書の `weekdays` を区切りでつないだもの） | {weekdays}は別の時間帯を持つ —— 取り込んだまま保ち、ここでは直さない | {weekdays} hold other working hours; kept as imported, not edited here |
| `weekdaySeparator` | ・ | , |
| `timeNotReadable` | 時刻の形ではない（{text}）—— 0:00〜24:00 の形で打つ | Not a time ({text}); type it as 0:00 to 24:00 |
| `startNotBeforeEnd` | 始まりが終わりより前ではない（{range}） | The start is not before the end ({range}) |
| `rangesOverlap` | 時間帯が重なっている（{first} と {second}） | The ranges overlap ({first} and {second}) |
| `noWorkingWeekday` | 稼働する曜日を 1 つ以上選んでください | Choose at least one working weekday |
| `exceptionFromAfterTo` | 始まりの日が終わりの日より後になっている（{name}） | The start day is after the finish day ({name}) |

⚠️ 区を足すと `dictionary-table-pairing.txt`（検査の対）と `tests/contract/display-words.contract.test.ts` の数が動く —— 当てる体が測る。

### 4.5 生成物

当てる体は `npm run gen` で `_assets/tbl-state-machines.md`・`src/adapter/screen-renderer/display-words.json`・`src/use-case/advance-screen-session/screen-values.ts` の生成の区画・`docs/development-records/test-inventory.md` ほかを作り直す（手で直さない）。`strictdoc export docs/spec` は一時フォルダへ出し、根に `output` を作らない。

---

## 5. 継ぎ目（コード）と試験 —— 当てる体への見込み

持ち場はファイルで分ける（波 2 の 3 つは並べて走れる）。

| 持ち場 | 仕様の行 | `src`（見込みのファイル） | 中身 |
|---|---|---|---|
| A 下書きの規則（Entity ／ UseCase） | `FR-088`・`WC-2`〜`WC-10`・`IV-17`・`IV-24` | 新 `src/use-case/advance-screen-session/calendar-draft.ts`（純粋。ユニットにするなら 表 T-075 に 1 行）・生成の `screen-values.ts`（遷移を足す） | 文書の暦から下書きを組む（面が示す 1 組・`WC-9` の曜日）・押下ごとの直し（`WC-6` と [＋] の初めの値は `JDG-1969`・`JDG-1970`）・断りの判じ（`edit-calendar.ts` の `refusalsOf` が使う `workingTimesBreach` と同じ Entity の述語を呼ぶ。写さない）・下書きから `CM-39` を組む |
| B 翻訳と描き手（Adapter） | `IC-132`〜`IC-138`・`IC-163`〜`IC-165`・`WC-4`・`WC-8` | `src/adapter/input-command-translator/input-command-translator.ts`（`ENTRY` に `IC-132`〜`IC-138`・`IC-163`〜`IC-165`）・`screen-state-input.ts`（`IC-132` → `surfaceEntered('U-65')`、押下と欄の確定 → `calendarDraftEdited`、`IC-138` → `calendarApplyEntryPressed`）・`field-commit.ts`（欄の確定の行き先）・`src/adapter/screen-renderer/open-modals.ts`（`U-65` の面の中身を組む。`STOP` を外す。大きくなるなら新 `holiday-settings.ts` に分ける）・`screen-renderer.ts`（`OpenModal` の `U-65` の形 —— `PND-140` の推奨の共用体） | 面の中身: 段ごとの行・欄の字・断りの行・入口の薄さ（`IC-138`・`IC-163`・`IC-164`） |
| C 描くことと殻（Framework） | `RR-1`〜`RR-6`・`WC-10`・`RS-89` | `src/framework/dom-screen-surface/open-modals-drawing.ts`（`U-65` の枝 —— 新 `holiday-settings-drawing.ts` に分けるのを推す。ファイルは 694 行）・`dom-screen-surface.ts`（`MK-5` の横の送り、`NOT_STORED_WHEEL_UNITS` を読む）・`src/framework/single-html-shell/frame-loop.ts`（効果 `issueCalendarCommand`、当てた後の `RS-89`） | 送らない段と送る一覧（`RR-2`）・横の送り（`RR-3`）・名前の欄の固定（`RR-4`、`position:sticky`）・`S-241` の罫（`RR-5`、画面の px）・欄の確定（`IN-6`）・断りの線（`S-154`） |

- 検査 60（関数の大きさ）: `openModalFromSession`・`modalElement` に枝を足すと超える見込み —— 規則 07 の `R2` で割る（上の新しいファイル）。基準を上げない。
- 毎フレームの経路: 面は開いているあいだだけ描く。辞書（生成）と描き手の枝が増えるので、当てる体は `perf-pending` に 1 行足す（番号は調整役）。
- 試験: 古い振る舞いを縛る事例は無い（`f4ca3bef` で `tests` の中の `IC-132`〜`IC-138`・`IC-163`〜`IC-165`・`Holiday Settings`・`U-65`・`T-344`・`RR-2`〜`RR-5` を名指す 10 本は、面の名・語・`CM-39` を縛るだけで、開かないことを縛らない —— 当てる体は走らせて確かめる）。新しい事例は仕様だけを読む体（12 節）。

---

## 6. グラフ（`impact.py`、`f4ca3bef`）

| 行・要求 | 指している箇所 |
|---|---|
| `FR-088` | 要求 6 件・28 か所（`FR-031`・`FR-011`・`FR-016`・`FR-054`・`FR-074`・`FR-076`） |
| 表 T-344 ／ 表 T-257 | 要求 3 件（`FR-011`・`FR-088`・`FR-054`）／ 3 件（`FR-016`・`FR-151`・`FR-088`） |
| `U-65` ／ `IC-132` ／ `IC-138` ／ `IC-163` | 4 件・5 か所 ／ 1 件 ／ 1 件・2 か所 ／ 1 件・2 か所 |
| `CM-39` ／ `IV-17` ／ `IV-24` ／ `RS-89` | 2 件・8 か所 ／ 2 件・4 か所 ／ 1 件・6 か所 ／ 2 件・3 か所 |
| `S-99g` | 8 件・28 か所（本書は `openSurfaceStateMachine` を変えず、出どころの行を 1 つ足すだけ） |
| `WC-4` ／ `WC-7` ／ `WC-8` ／ `WC-9` ／ `RR-3` | 要求 0 件・2 か所 ／ 0 件・1 か所 ／ 3 件・9 か所 ／ 1 件・2 か所 ／ 1 件・4 か所 |

足す辺: `FR-088` → 表 T-280（X-1）、`WC-4` → `FR-006`・`TX-3`・`RS-87`・`IN-6`（X-4）、`WC-8` → 表 T-375 の後の段・`IN-6`・`SK-19`（X-5）、`WC-10` → `IV-17`・`IV-24`・`S-154`・`FR-029`（X-6）、`RR-2` → 表 T-344（X-7）。輪の見込み: `RR-2` → 表 T-344 と、`WC-1` → `RR-6` で 2 つの表が互いを指す（`FR-088` の中の 2 表 —— 同じ要求の中の輪なので許す読みでよいか、当てる体が `impact.py` の輪の数で確かめる）。

---

## 7. 数（見込み —— 当てる体が測り直す）

- 要求 ±0、表 ±0、表の行 ＋1（`WC-10`）。状態機械 ＋1、出来事 ＋3（`documentReplaced` を `CR-742` が先に定めていれば ＋2）。辞書の区 ＋1（部 20）。
- 新しい `（MUST）` の句 ＋1（X-1 —— 旧の文は MUST を持たない）。升の中の ⛔ ＋1（X-6）。当てる体は `git diff -U0 f4ca3bef -- docs/spec | grep -c "（MUST）"` で数え直す。

---

## 8. 台帳（当てるとき）

| 台帳 | 動かすもの |
|---|---|
| `defects.md` | `DFC-1671`・`DFC-2318` を `実測待ち`（利用者の手順は 12 節）。`DFC-1359` の「暦の編集面は `DFC-1671` の後」の欄に着地を 1 行 |
| `pending-decisions.md` | `PND-140` に「`U-65` は `CR-743` が推奨の形で答えた」を 1 行（状態は `未裁定` のまま）。`PND-607` は 11 節の答えで閉じる |
| `rulings.md` | 11 節の答えを 1 行（番号は調整役）。適用済の着地の欄は `WC-10` か `WC-4` |
| `changelog.md` | 次の版（調整役が番号を渡す） |
| `perf-pending.md` | 1 行（5 節） |

---

## 9. 見積もり

| 持ち場 | 時間 | 中身 |
|---|---|---|
| 仕様（`_source` と `01-04-requirements.md`） | 2 h | X-1〜X-10、`npm run gen`、`strictdoc export`、検査 |
| `src` A 下書きの規則 | 2.5 h | `calendar-draft.ts` と機械の遷移 |
| `src` B 翻訳と描き手 | 2.5 h | 入口 11 個の翻訳と欄の確定、面の中身 |
| `src` C 描くことと殻 | 3 h | 段と一覧の送り・固定・罫・断りの線、効果と `RS-89`、検査 60 の割り |
| 試験（仕様だけを読む体） | 3 h | 12 節の 6 項 |
| 計 | 13 h | ⚠️ `DFC-1671` の計画の見積もり 6〜8 h（`handoff.md` の 2026-10-08）は、その後に `CR-710` が足した時間帯の欄（`WC-8`・`WC-9`・`IC-163`〜`IC-165`）と `DFC-2318` の `RR-2`〜`RR-5` を含まない |

波の順: ① 仕様（1 体、2 h）→ ② `src` の A・B・C（3 体を並べて。A の型（`calendarDraft` の形）を先に生成で固め、B・C はそれを読む）→ ③ 仕様だけを読む試験の体 → ④ 調整役が実物を確かめる手順を利用者へ。

---

## 10. この変更でやらないこと・残したもの

- 見本 52 の「合計 8h（1d ＝ 8h）」の 1 行と、下書きの状態の 1 行（「下書きは文書と同じ」「適用していない変更がある」）—— 見本だけのもの（見本の README）。足すなら別の変更要求。
- `PND-140` のほかの面（`FR-036`・`FR-074`・`FR-099`・`FR-068`）。
- 面の窓の大きさと置き場 —— 今の面の枠（`modalFrameStyle`）のまま。
- 例外日の行を並べ替える入口 —— `WC-4` は始まりの日の順に並べるだけ。
- `DFC-1961`（取り込んだ 1 回きりの例外日の読み）・`DFC-1836`（日付の時刻を刻む継ぎ目）・`DFC-2036` —— どれも `実測待ち` で、本書は同じ述語と `editCalendar` を使うだけ。

---

## 11. 利用者（調整役）に問うこと

1. **当てられない例外日の行（`PND-607`）をどう扱うか。**
   場面: 休日の設定（`Holiday Settings`）の例外日の一覧（`Exception Days`）で、始まりの日（`Start`）を終わりの日（`Finish`）より後にした行や、別の行と日が重なる行を作り、[適用]（`Apply`、`IC-138`）を押そうとする。⚠️ 重なる 2 行は、今の数え（`working-calendar.ts` の `isWorkingDayAt`）が先に並んだ行を採るので、休みか稼働かが並びで決まる。
   - 択 A（推奨）: 始まりが終わりより後の行だけを断る（`WC-10` の `exceptionFromAfterTo`、[適用] が薄い）。重なる行は許す。名前の空も許す。—— 推す理由: 交換相手（MS Project）も重なる例外日を持てて、取り込んだ文書を面で開いただけで当てられなくなるのを避ける。逆の範囲は数えられない行なので断る。
   - 択 B: 逆の範囲に加えて、重なる行も断る（`rangesOverlap` と同じ形の語を足す）。—— 並びで答えが変わる行を作らせない。代償: 取り込んだ重なりを持つ文書では、重なりを消すまで曜日も時間帯も当てられない。
   - 択 C: どちらも断らず、当てたあとに告げるだけ。—— 代償: 逆の範囲は数えに入らず、黙って効かない行が残る。

   ⚠️ `PND-607` は `JDG-78` により `DFC-586`（`f4ca3bef` で開いたまま）の後へ保留されていた。どの択でも、本書が決めるのは面の中の断り（当てる前に止める）だけであり、`CM-39` が受けて拒むか（`PND-607` の推奨の後半）は `DFC-586` まで待つ。

---

## 12. 当てる体への申し送り

- `CR-742` と同じ原稿の同じ領域に機械を足す。`documentReplaced`（領域 `screen`）は先に当てたほうが定め、後のほうは升を足すだけにする。2 つの機械の名の族（〈何の〉`DraftStateMachine`）を揃える。
- 断りの判じは `edit-calendar.ts` の `refusalsOf` と同じ Entity の述語を呼ぶ（`workingTimesBreach`・稼働する曜日の有無）。写しを作ると検査 30／重複の検査が赤くなる。
- 仕様だけを読む試験の体への手引き（6 項）: ① パレットの `IC-132` で `U-65` が開き、題の右端に `IC-52`（`WC-1`・`RR-6`）② 曜日・時間帯・例外日を直しても文書は変わらず、`IC-138` で `CM-39` が 1 回、取り消し 1 回で全部戻る（`FR-088`・表 T-280）③ `IC-52`・`Esc`・別の面で閉じると下書きが消え、開き直すと文書の暦が出る ④ 時刻の欄の `8`・`13:00〜12:00`・重なりで `WC-10` の語が出て `IC-138` が薄く、終わりの `0:00` は `24:00`（`WC-5`・`WC-10`・`IV-24`）⑤ 例外日の日付の欄の読めない字は元へ戻り `RS-87`（`WC-4`）⑥ 例外日が多いとき一覧だけが縦に送られ、`MK-5` で一覧だけが横に送られ、名前の欄が左に残り、罫は `S-241` の画面の px（`RR-2`〜`RR-5`）。
- 利用者の実物の手順（当てた後）: コマンドパレットの [休日の設定] を押して面が開くか。土曜を押して稼働にし、時間帯の 1 本目を `7:00` にし、[適用] を押して、土曜の塗りが時間帯の外だけになり、`Ctrl+Z` 1 回で戻るか。時間帯の始まりに `8` と打って欄を離れ、断りの 1 行が出て [適用] が薄いか。例外日を 30 行ほど持つ文書で、一覧だけが送られ、[適用] と時間帯の欄が見えたままか。

---

## 13. 測り方の再現

```
git grep -c "CR-743" f4ca3bef -- change-request docs src tests                                   # 0 件
git grep -c "IC-13[2-8]\|IC-16[3-5]" f4ca3bef -- "src/*.ts"                                      # 0 件（生成の JSON 4 つにだけ在る）
git grep -c "calendarDraft\|WC-10\|holidaySettings" f4ca3bef -- docs src                         # 0 件
grep -n "STOP: spec does not decide where Holiday Settings" src/adapter/screen-renderer/open-modals.ts
grep -n "surfaceEntered(" src/adapter/input-command-translator/screen-state-input.ts             # 書き出しの面だけ
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-088 T-344 T-257 U-65 IC-132 IC-138 IC-163 CM-39 IV-17 IV-24 RS-89 S-99g WC-4 WC-7 WC-8 WC-9 RR-3
```
