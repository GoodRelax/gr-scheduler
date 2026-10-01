# CR-630 — `Esc` は前に在るウインドウを閉じる —— 焦点が外にあっても、対話欄も検索パネルも段に立つ

> 起草の状態: 起草のみ（2026-10-01、枝 `l4-review-crs`）。まだ当てていない。4 節の旧 14 件は、読んだ木でどれも 1 回だった（13 節）。⚠️ 11 節の問い 2 つが残る —— EDIT はその推奨で書いた（該当する EDIT に「問い n の推奨で書いた」と記す）。
> 読んだ木: `refactor` `bfbe7eb7`（枝 `l4-review-crs`）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から受けた（`CR-630` のみ）。仕様の新しい識別子は仮番 `RG-<新1>` の 1 つだけ（2 節）。
> ⛔ 当てる順: `CR-621` → **本書**。E-03・E-04（`FR-036` のヘルプの行と 表 T-336）・E-10（対話欄の状態機械）・E-11（`S-99g` の注）・E-07 の状態のキー（対話欄）は、`CR-621` が書き換える所と重なる（4.1 節）。`CR-613` の J-02 とは旧の 1 行を分け合う（4.1 節）。
> 閉じるもの: `DFC-1320` の `Esc` の半分（`JDG-850`・`JDG-896`）、`DFC-1347` の ⑥⑦（`JDG-877`）。`DFC-1280` の段の語の半分（12 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-850` | 「#1 一度AIとの対話パネルを開いたら閉じれなくなった。しかも index.htmlを開きなおしても消えない。<br><br>AIとの対話パネルの状態はブラウザにもGRS JSONにも保持するな。<br>AIとの対話パネルは ESCでクローズ可能とせよ。<br>AIとの対話パネルは 通常のウインドウ同様、移動可能、サイズ可変 ヘッダー右にサイズ変更と閉じる [_][□][x]のアイコンとその機能を配置しろ」 | 本書は「ESCでクローズ可能とせよ」の 1 文だけを持つ（E-01・E-07・E-10）。持つ値・窓の枠・移動・大きさ・[_][□][x] は `CR-621` |
| `JDG-896` | 「#1 案A、」（案 A: 対話欄の既定を隠し、`Agent API` を有効にした記憶は残す。要約の欄に「Esc で閉じる・[_][□][x]・移動・大きさ変えは足す（`JDG-850`）」） | 既定を隠すのは `CR-621`。本書は `Esc` で隠しても `Agent API` を有効のまま残す（決定 5） |
| `JDG-877` | 「…<br>  検索パネルがアクティブになっている場合、ESCで検索パネルを閉じれ<br>  ESCでプロパティーパネルを閉じたあと検索パネルを閉じれない」（#28 の最後の 2 行。前の行は `CR-629`・`CR-621` が持つ） | 本書の骨格。⑥ は E-01 の窓の段、⑦ は E-01 の MUST NOT |
| `JDG-617` | 「11. 提案通りでOK。…」「推奨どおりで進めて」（要約の欄に「焦点がパネルの中にあるときの `Esc` はパネルを閉じ、打った語とフィルターは同じ画面のあいだ覚える」） | 変えない —— 焦点が中にあるパネルは、本書の後も閉じる（焦点を持つウインドウが先。問い 1 の推奨）。「だけ」は `CR-571` の決定 2 が導いた語であり、`JDG-877` がそれを覆した |
| `JDG-633` | 「→提案通り」（#3: 「列の絞り込みを開いているときの `Esc` は先に絞り込みを閉じ、もう一度でパネルを閉じる」） | 変えない。窓の段で検索パネルの番が来たときに当てる（E-01・E-07） |
| `JDG-820` | 「1 help だとな何のヘルプか分からない。 helpPanel とか、help*** とか適切な名称を再考せよ。 そもそも何を表す名称なのか？ その責務は？」（要約: 段の語を `helpModal` とし、表 T-283 と `IN-4` に書き足すのは `DFC-1280` の変更要求） | 窓の段の注に、段の語 `searchPanel`・`helpModal`・`dialogueField` を書く（E-07） |
| `PND-337` の裁定（2026-09-13） | 「いまの仕様のとおりとし、閉じる —— `IN-4` が答えている」（推奨の理由: 「ドラッグより上に置くと `IN-1` の `Esc` による中断へ手が届かなくなる」） | 窓の段を進行中のドラッグより後に置く理由に同じ形を使う（決定 1） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— 画面の上に開いたもの（ヘルプ・検索パネル・AI との対話欄）は、どれも `Esc` で閉じる、という 1 つの形に揃う。今は、検索パネルは焦点が中にあるときだけ、対話欄は一度も `Esc` で閉じない（`DFC-1320`・`DFC-1347` ⑥⑦）。利用者は `dist/index.html` でそれを不具合と読んだ（`JDG-850`・`JDG-877`）。
⭐ 副次に **`CH-2` ／ `GL-002`** —— 閉じる手立てが見つからない窓は、日程を覆い続ける（`DFC-1320` の「画面が塞がる」）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— 今の `IN-4` の段「焦点がある検索パネル」（表 T-283 の `RG-15`）は、進行中のドラッグ（`RG-4`）より上に在る。一方 `IN-1` は「中断は `Esc` で行い」、表 T-330 の `SV-10`・`SV-11` はパネルを動かす・大きさを変えるドラッグの「中断では元の角へ戻す」と言う。焦点がパネルの中に在るあいだに見出しの帯を握り（掴みの押下は既定動作を止める —— `src/framework/single-html-shell/frame-loop.ts:3102` の `isSearchPanelGrabPress`）、握ったまま `Esc` を押すと、表 T-283 の順では `RG-15` が先に食い、パネルが閉じる —— 中断ではない（焦点が握る押下で動くかは閲覧環境による。規則の上の食い違いは、それによらず在る）。⇒ 窓の段をドラッグの後へ動かすと、この食い違いも消える（決定 1）。
- **`R1.4`（境界・空の場合）** —— 焦点がパネルの外にあるとき、検索パネルを閉じる段が 1 つも無い。`JDG-877` ⑦ はその穴である（1 節の「今の失敗の道」）。対話欄は、焦点の有無によらず段が無い（`S-99g` の注が面でないとして外し、`IN-4` にも載らない —— `DFC-1320`）。
- **`R1.6`（否定要求は代替を示す）** —— 足す MUST NOT（焦点が外にあることを理由に段から外さない）は、閉じる順を同じ行の MUST が示す。
- **`R4.3`（実装が状態遷移と一致）・`R4.4`（状態遷移表）** —— 対話欄の状態機械に `escapePressed` の行を 1 つ足し（E-10）、検索パネルの `Esc` の升を合成の `shown` から `shown.normal`・`shown.maximised` の 2 つへ分ける（E-08。最小化したパネルは段に立たない）。状態・出来事の数は変わらない（7 節）。
- **`R2.14`（POLA）** —— 3 つのウインドウ（`CR-621` が 表 T-335 の「ウインドウ」にする）は、同じ段・同じ順・同じ最小化の扱いで閉じる。最小化したヘルプを段に立てない 表 T-336 の `HN-2` に、検索パネルと対話欄を揃える（決定 3）。
- **`R2.21`（1 つの仕事は 1 か所）** —— `Esc` の段を決める材料 `EscapeContext` を、`frame-loop.ts:1342`〜`:1360` の `escapeLevelOf` と `src/adapter/input-command-translator/input-command-translator.ts:1358`〜`:1372` の `escapeContextOf` が別々に組み、組む項目が違う（前者は選択を、後者は問いと説明を入れない）。本書が足す項目は 2 か所に同じく足す必要がある —— 9 節に書いた。2 つの組み手の食い違いそのもの（問いが立っているときの `Esc` が 2 段を使う見込み）は本書の外 —— 調整役へ潜む不具合として渡す（12 節の末）。
- **`R2.9`（YAGNI）** —— 「最後に押した窓」を覚える新しい状態は足さない。前後は 表 T-337 が既に 1 つの表で持つ（問い 1 の案 D を推さない理由）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **窓の段を、進行中のドラッグの後に置く。** 今は通常か最大化のヘルプが「開いている面」の段（ドラッグより上）に、焦点がある検索パネルが通知の次に在る。どちらもドラッグの後の新しい段へ移る | `IN-1`（中断は `Esc`）と `SV-10`・`SV-11`（パネルを動かす・大きさを変えるドラッグの中断）。`PND-337` の裁定が、プロパティパネルを同じ理由でドラッグの後に置いた（「ドラッグより上に置くと `IN-1` の `Esc` による中断へ手が届かなくなる」）。`CR-621` はヘルプと対話欄にも動かす・大きさを変えるドラッグを足す | バーを引いているあいだにヘルプが開いていても、`Esc` はまずドラッグを中断する（今はヘルプを閉じる） |
| 決定 2 | **3 つのウインドウを 1 つの段にまとめ、1 度の `Esc` で 1 つだけ閉じる。** 段の語（`escapePressed` の `rung`）はウインドウごとに `searchPanel`・`helpModal`・`dialogueField` とし、表 T-283 の窓の段の注に書く（E-07） | 今の「開いている面」の段が、1 つの段の中に問い・面・ヘルプの語を分けて持つ（`RG-3`）先例。`JDG-820` が `helpModal` を決め、`DFC-1280` が語を表に書くことを求めている | `RG-15` を退け、新しい行 `RG-<新1>` を起こす（2 節）。`RG-15` の意味（焦点がある検索パネル）が変わるので、番号を使い回さない |
| 決定 3 | **最小化したウインドウは段に立たない。** 検索パネルの `Esc` の升を `shown.normal`・`shown.maximised` の 2 つにする（E-08）。対話欄は `CR-621` が最小化を足した後、同じく最小化以外の子に載せ直す（4.1 節） | 表 T-336 の `HN-2`（最小化したヘルプは段を飛ばす）。題の行だけになったウインドウは何も覆っていない。`R2.14` | 今は、焦点が最小化した検索パネルの中にあれば `Esc` で閉じる —— その 1 つの場合が閉じなくなる。最小化すると入力欄が描かれない（`SV-12`）ので、焦点が中に残る場合はほぼ無い |
| 決定 4 | **開いている面の段の中の順（問い → 面）を `IN-4` の文に書く。** ヘルプが抜けた後の `RG-3` の注も「問い → 面」にする（E-01・E-06） | 今は `RG-3` の注だけが持ち、`IN-4` の文は「面が先、ヘルプが後」しか言わない。表 T-337 で問い（`UZ-3`）は面（`UZ-13`）の手前 —— 「手前のものから閉じる」と同じ向き | 無い |
| 決定 5 | **`Esc` で対話欄を隠しても、`Agent API` は有効のまま。** 升の先は `hidden` の 1 つで、`agentApiEnablingStateMachine` を動かさない（E-10 の注） | `FR-066` の「逆向きは無い —— 欄を非表示にしても `Agent API` は有効のままである」。`JDG-896` 案 A は有効の記憶を残す | 無い |
| 決定 6 | **対話欄が段に立つのは、`Agent API` が有効で `S-99i` が表示のあいだだけ**（見えているあいだ）。状態のキーは `dialogueFieldDisplayStateMachine.shown` とし、有効かどうかは段を決める側（シェル）が読む | `FR-066`「`Agent API` が有効であるあいだ…欄を表示する」。有効でない領域の状態を、別の領域の升のガード `{in:}` では読めない（同じ領域の機械に限る —— `state-machines.json` の `$comment`） | 無い |
| 決定 7 | **表面（`ScreenSurface`）は、焦点がどのウインドウの中にあるかを答える**（表 T-065 の `IF-9` に 1 文。E-14）。段の判定の材料 `EscapeContext` は真偽のまま（ウインドウごとに「立っている」「焦点がある」） | 今の `RG-15` の「フレームの値（焦点がパネルの中にある）」を 3 つのウインドウへ広げる。`IF-9` は今、この答えを持たない（`holdIsSearchPanelFocused` の配線だけ —— `src/framework/dom-screen-surface/dom-screen-surface.ts:1051`）。`PI-36` の `EscapeContext` は「段の判定に要る真偽」と書く —— 真偽のままなら真 | 表面の答えが 1 つ増える |
| 決定 8 | **ヘルプの `Esc` の升の根拠を `S-99g` から `HN-2` へ替える**（E-09）。`S-99g` の注から `IN-4` の句を外し、「`Esc` では窓の段に立つ」と書く（E-11）。`FR-036` の同じ意味の 1 文と `HN-2` も揃える（E-03・E-04） | 注が「開いている面の段では面と同じに扱う」と言い続けると、E-01 と食い違う（`R1.3`）。ホイール（表 T-023 の後の段）と `SK-19` の 2 段目での扱いは変えない | 無い |
| 決定 9 | **コマンドパレット（`FR-053`）・図形の一覧（`S-142`）・パレットの最小化（`S-200`）は段に入れない。** 今の MUST NOT をそのまま残す | どれも 表 T-335 のウインドウではない（閉じる入口 `IC-52` を持たず、入口と構えの置き場である）。`FR-053` の「`Esc` で閉じてはならない（MUST NOT）」は利用者に問われていない | 無い |

---

## 1. 範囲 —— 行き先

### 1.1 今の失敗の道（`DFC-1347` ⑥⑦。コードから読んだ。`bfbe7eb7` の行番号）

`Esc` の段は、押した 1 回ごとに `frame-loop.ts:2970` で `escapeLevelOf`（`:1342`〜`:1360`）が決める。検索パネルの段の材料は `:1352` の `isSearchPanelFocused: context.screen.searchPanelDisplayState.kind === 'shown' && context.isSearchPanelFocused === true` の 1 つだけであり、その値は `:2379` が表面から読む `screen?.isSearchPanelFocused?.()` —— 実体は `src/framework/dom-screen-surface/search-panel-drawing.ts:470` の `isInside(layer, activeElement)`、つまり **ブラウザの焦点がパネルの層の中に在るか** である。

1. `src/entity/document-model/screen-state/screen-state.ts:56` —— 焦点がパネルの中に無ければ `'searchPanel'` を返さず、`:57`〜`:67` の下の段（編集・面・ヘルプ・ドラッグ・プロパティパネル・構え・選択・`Dual Cursor`・説明）へ落ちる。
2. `frame-loop.ts:1300`〜`:1310` の `searchPanelAfterEscapeRung` は、段が `'searchPanel'` のときだけ絞り込みを閉じるか `ESCAPE_SEARCH_PANEL`（`:452`）を送る。ほかの段では何もしない。
3. 原稿の升も同じ —— `searchPanelDisplayStateMachine` の `escapePressed` はガード `isRungSearchPanel` の下でしか `hidden` へ行かない（`docs/spec/_source/state-machines.json:2608`〜`:2621`）。
4. 翻訳器の側も同じ条件を別に組む —— `input-command-translator.ts:1362`。これを `selection-input.ts:138`（選択を解く）と `shortcut-keys.ts:63`（段が無ければ `UNASSIGNED` —— ブラウザへ渡す。`IN-4a`）が読む。

⇒ **焦点がパネルの外へ出た瞬間から、検索パネルを `Esc` で閉じる道は 1 つも無い（⑥）。** 焦点が外へ出る道は、プロパティパネルの欄を押す（欄は焦点を受ける）、ヘッダーの文書名の欄を押す、`Tab`、パネルを最小化して語の欄が描かれなくなる（`SV-12`）、などである —— 台帳の「焦点が語の欄に在れば閉じた」（一部再現）はこれと合う。
⇒ **⑦ はコードから決定的に言える。** `Esc` がプロパティパネルを閉じたということは、その押しの時点で焦点がパネルの外に在った（中に在れば `screen-state.ts:56` が先に `'searchPanel'` を返す）。パネルを閉じる道（`ESCAPE_RUNG_EVENTS` の `propertiesPanel: ESCAPE_SURFACE`、`frame-loop.ts:497`）は焦点を検索パネルへ戻さず、焦点を持っていた欄が画面から消えれば焦点は頁の本体へ落ちる。以後の `Esc` は、選択が在れば選択を解き（`screen-state.ts:64`、`selection-input.ts:138`）、その次は `null` —— ブラウザへ渡る（`shortcut-keys.ts:63`、`IN-4a`）。検索パネルは閉じない。
⇒ 対話欄（`DFC-1320`）は、`EscapeTarget`（`screen-state.ts:15`〜`:28`）に語が無く、`dialogueFieldDisplayStateMachine` に `escapePressed` の行が無い —— 焦点の有無によらず閉じない。

### 1.2 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 段の並び・窓の段の規則・理由 | `IN-4`（表 T-028）の並びから段落「⭐ プロパティパネルを…」まで | E-01 | その区間 |
| 検索パネルの閉じ方 | 表 T-330 の `SV-14` の最初の文 | E-02 | その文 |
| ヘルプの `Esc` | `FR-036` の本文の 1 文、表 T-336 の `HN-2` | E-03・E-04 | その 2 か所 |
| 表 T-283 | `state-machines.json` の `priorities`: `RG-15` を退け、`RG-3` からヘルプを外し、`RG-<新1>` を `RG-4` と `RG-14` の間に起こし、`RG-14` の注を直す | E-05・E-06・E-07 | その 4 つの段 |
| 升 | 検索パネル・ヘルプ・対話欄の `escapePressed` | E-08・E-09・E-10 | その 3 行 |
| 面と窓の区別の注 | `settings.json` の `S-99g`・`S-99h` の注 | E-11・E-12 | その 2 つの注 |
| 公開の入口の注 | `published-entries.json` の `isHelpStandingIn` の注 | E-13 | その 1 行 |
| 表面の答え | `05-07-design.md` の 表 T-065 の `IF-9` に 1 文 | E-14 | その 1 文 |

⭐ 生成物 `docs/spec/_assets/tbl-state-machines.md`（表 T-283、画面の値の出来事の行 `escapePressed` の「動かすもの」、3 つの機械の遷移表と状態図）・`docs/spec/_assets/tbl-settings.md`（`S-99g`・`S-99h`）・`docs/spec/_assets/tbl-published-entries.md`（`PI-39` の `isHelpStandingIn`）・`docs/spec/_assets/tbl-row-id-prefixes.md`（`RG` の行）・`src/use-case/advance-screen-session/screen-values.ts` の生成区画は、`npm run gen` だけが書く。⛔ 手で書かない。

## 2. 新しい識別子

| 仮番 | 何か | 置き場 |
|---|---|---|
| `RG-<新1>` | 表 T-283 の段「開いているウインドウ」 | `docs/spec/_source/state-machines.json` の `priorities`（E-07）。本表の「番号は最後の次を採り、並びは表の上下が持つ」（`RG-14` の注）に従う |

⭐ 仮番の本番は、仕様を当てる会（spec-pass）が当てる時に振る（規則 02 の 2.5）。E-07 と E-13 の 2 か所に同じ仮番が出る —— 1 回で振り直す。
⭐ 識別子の表に載らない名が 2 つ増える: ガード `isRungDialogueField`（E-10）と、`escapePressed` の `rung` の語 `dialogueField`（E-07 の注）。接頭辞・表・要求・設定値の行・状態・出来事は足さない。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bfbe7eb7`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 並びの 2 段目「焦点がある検索パネル」 | `docs/spec/01-04-requirements.md:7787`（`IN-4`） | 5 段目「開いているウインドウ」（ドラッグの後、プロパティパネルの前） | E-01 |
| 「⭐ 焦点がある検索パネル（`FR-151`）の段は、…」 | 同 | 「⭐ 閉じる番の検索パネル（`FR-151`）は、…」 | E-01 |
| 「⭐ 開いている面の段では、立っている面が先、通常か最大化のヘルプが後である（…`S-99g`） —— 手前のものから閉じる。」 | 同 | 「問いが先、立っている面が後」＋窓の段の 2 文 | E-01 |
| 「⭐ プロパティパネルを進行中のドラッグの次に置くのは、…」の「次に」 | 同 | 「より後に」＋窓の段を前後に置く理由 2 文 | E-01 |
| 「焦点がパネルの中にあるときの `Esc`」 | 同 `:4923`（`SV-14`） | 「`Esc`（…「開いているウインドウ」の段 —— 焦点がパネルの外にあっても段に立ち、…）」 | E-02 |
| 「ホイールと `Esc` の段で」 | 同 `:7538`（`FR-036`） | 「ホイールの段で」＋ `Esc` の 1 文 | E-03 |
| 「「開いている面」の段を飛ばし、次の段へ渡す。」 | 同 `:7559`（`HN-2`） | 「「開いているウインドウ」の段に立たない —— …」 | E-04 |
| 段 `RG-15`（焦点がある検索パネル）の全体 | `docs/spec/_source/state-machines.json:43`〜`:66` | 無し（`RG-<新1>` が引き取る） | E-05 |
| `RG-3` のヘルプの 2 状態・根拠 `HN-2`・注の「→ ヘルプ」「最小化したヘルプは…」 | 同 `:87`〜`:117` | 問いと面の 2 状態、注「問い → 面」 | E-06 |
| `RG-14` の注「進行中のドラッグの次に置く」 | 同 `:138`〜`:158` | 「進行中のドラッグと開いているウインドウの後に置く」 | E-07 |
| 検索パネルの `escapePressed` の升 `shown`（合成） | 同 `:2608`〜`:2621` | `shown.normal`・`shown.maximised` | E-08 |
| ヘルプの `escapePressed` の根拠 `S-99g`（2 升） | 同 `:2766`〜`:2790` | `HN-2` | E-09 |
| `S-99g` の注「・表 T-028 の `IN-4` の「開いている面」の段では、…段の中では面の後（手前のものから閉じる）」と「進行中のドラッグの次に」 | `docs/spec/_source/settings.json:3845` | 「`Esc` では面の段に立たず、…「開いているウインドウ」の段に立つ」ほか | E-11 |
| `S-99h` の注「進行中のドラッグの次に」 | 同 `:3857` | 「進行中のドラッグと開いているウインドウの後に」 | E-12 |
| `isHelpStandingIn` の注「表 T-283 の `RG-3`」 | `docs/spec/_source/published-entries.json:2396` | 「表 T-283 の `RG-<新1>`」 | E-13 |
| 生成された表 T-283・遷移表・注 | `docs/spec/_assets/tbl-state-machines.md:29`〜`:36` ほか | `npm run gen` | ― |
| コードの「焦点があるときだけ」 | 9 節の表 | 9 節 | 実装する者 |
| 旧い文を逐語で引く試験 | 8 節の波 1 の表 | 新しい文へ | 実装する者・試験の体 |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（改行は LF に揃えて数える。読んだ木の 5 ファイルはどれも LF だけだった）。`CR-621` を当てた後の木では、E-03・E-04・E-07・E-10・E-11 の旧が変わっている見込み —— 4.1 節の差分で載せ直す。
⭐ E-01 は 1 行の表の行（`IN-4`）の中の区間であり、行の頭（「`Esc` は閉じる対象または…1 階層ぶん消費し、…渡すこと。<br>」）と尾（「⛔ ドラッグ中にパネルを先に閉じてはならない…」以下）はそのまま残る。E-14 も 1 行（`IF-9`）の中の 1 文の後ろへ足す。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧
```text
消費する階層は 出ている通知 → 焦点がある検索パネル → 確定していないその場の編集 → 開いている面 → 進行中のドラッグ・引きかけの矢印 → プロパティパネル → 構え → 選択 → `Dual Cursor` モード → 出ている説明 の順とすること（MUST） —— 説明を最後に置くのは、`IN-3` が求める「消せること」を果たす手立てがほかに 1 つも無いからである。<br>⭐ 焦点がある検索パネル（`FR-151`）の段は、列の絞り込みが開いていれば絞り込みだけを閉じ、次の `Esc` でパネルを閉じる（表 T-330 の `SV-14`）。<br>⭐ 開いている面の段では、立っている面が先、通常か最大化のヘルプが後である（`_assets/tbl-settings.md` の `S-99g`） —— 手前のものから閉じる。<br>⭐ プロパティパネルを進行中のドラッグの次に置くのは、ドラッグ中の `Esc` がほぼ「このドラッグをやめたい」という意味だからである。<br>
```
新
```text
消費する階層は 出ている通知 → 確定していないその場の編集 → 開いている面 → 進行中のドラッグ・引きかけの矢印 → 開いているウインドウ → プロパティパネル → 構え → 選択 → `Dual Cursor` モード → 出ている説明 の順とすること（MUST） —— 説明を最後に置くのは、`IN-3` が求める「消せること」を果たす手立てがほかに 1 つも無いからである。<br>⭐ 開いている面の段では、問いが先、立っている面が後である —— 手前のものから閉じる（`FR-152` の 表 T-337）。<br>⭐ 開いているウインドウの段に立つのは、`FR-036` の 表 T-335 のウインドウのうち、最小化していないものである —— 題の行だけになったウインドウは何も覆っていない（最小化したヘルプの 表 T-336 の `HN-2` と同じ）。<br>1 度の `Esc` で閉じるウインドウは 1 つとし、焦点がその中にあるウインドウを先に、ほかは `FR-152` の 表 T-337 の手前のものから閉じること（MUST）。<br>⛔ 焦点がウインドウの外にあることを理由に、開いているウインドウを段から外してはならない（MUST NOT） —— 外すと、焦点がプロパティパネルやほかの欄へ移ったあと、ウインドウを閉じる手立てが `Esc` から消える。<br>⭐ 閉じる番の検索パネル（`FR-151`）は、列の絞り込みが開いていれば絞り込みだけを閉じ、次の `Esc` でパネルを閉じる（表 T-330 の `SV-14`）。<br>⭐ 開いているウインドウを進行中のドラッグより後に置くのは、ウインドウを動かすドラッグと大きさを変えるドラッグ（表 T-330 の `SV-10`・`SV-11`）の中断も `Esc` だからである（`IN-1`） —— 前に置くと、中断のつもりの `Esc` がウインドウを閉じる。<br>⭐ プロパティパネルより前に置くのは、ウインドウがパネルの手前に重なるからである（表 T-337） —— 手前のものから閉じる。<br>⭐ プロパティパネルを進行中のドラッグより後に置くのは、ドラッグ中の `Esc` がほぼ「このドラッグをやめたい」という意味だからである。<br>
```

⭐ E-01 は **問い 1 の推奨**（焦点を持つウインドウが先、ほかは 表 T-337 の手前から）と **問い 2 の推奨**（窓の段はプロパティパネルより前）で書いた。
⭐ 並びの語は、生成器 `docs/spec/_source/state_machines_json_to_md.py:492`〜`:547` が E-05〜E-07 の `rung` の語と 1 語ずつ突き合わせる —— 並びの中に括弧を入れない（`CR-571` が同じ理由で絞り込みの扱いを並びの外の 1 文へ出した）。書き換えた並びと原稿の段の語が 1 対 1 で一致することを、両方を当てた写しで確かめた（13 節）。

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧
```text
| SV-14 | 閉じる | `IC-52`、または焦点がパネルの中にあるときの `Esc`（表 T-028 の `IN-4`）。<br>
```
新
```text
| SV-14 | 閉じる | `IC-52`、または `Esc`（表 T-028 の `IN-4` の「開いているウインドウ」の段 —— 焦点がパネルの外にあっても段に立ち、最小化しているあいだは立たない）。<br>
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
旧
```text
⚠️ 面と同じく、通常か最大化のヘルプはホイールと `Esc` の段で立っているものに数え、最小化したヘルプは数えない —— 定義は `S-99g` の注が持つ。
```
新
```text
⚠️ 面と同じく、通常か最大化のヘルプはホイールの段で立っているものに数え、最小化したヘルプは数えない —— 定義は `S-99g` の注が持つ。  
⭐ `Esc` では、通常か最大化のヘルプは面の段ではなく、表 T-028 の `IN-4` の「開いているウインドウ」の段に立つ —— 最小化したヘルプは立たない（表 T-336 の `HN-2`）。
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧
```text
| HN-2 | `Esc`（表 T-028 の `IN-4`） | 「開いている面」の段を飛ばし、次の段へ渡す。<br>ヘルプは閉じない |
```
新
```text
| HN-2 | `Esc`（表 T-028 の `IN-4`） | 「開いているウインドウ」の段に立たない —— ほかに段に立つウインドウが無ければ、次の段へ渡す。<br>ヘルプは閉じない |
```

<!-- EDIT id=E-05 file=docs/spec/_source/state-machines.json -->
旧
```text
   {
    "id": "RG-15",
    "keys": [
     "Esc"
    ],
    "rung": {
     "ja": "焦点がある検索パネル"
    },
    "states": [
     {
      "in": "searchPanelDisplayStateMachine.shown"
     }
    ],
    "also": {
     "ja": "フレームの値（焦点がパネルの中にある）"
    },
    "evidence": [
     "IN-4",
     "SV-14"
    ],
    "note": {
     "ja": "列の絞り込みが開いていれば、絞り込みだけを閉じる（`SV-14`）"
    }
   },
   {
    "id": "RG-2",
```
新
```text
   {
    "id": "RG-2",
```

<!-- EDIT id=E-06 file=docs/spec/_source/state-machines.json -->
旧
```text
    "id": "RG-3",
    "keys": [
     "Esc"
    ],
    "rung": {
     "ja": "開いている面"
    },
    "states": [
     {
      "in": "confirmationStateMachine.questionAsked"
     },
     {
      "in": "openSurfaceStateMachine.open"
     },
     {
      "in": "helpDisplayStateMachine.shown.normal"
     },
     {
      "in": "helpDisplayStateMachine.shown.maximised"
     }
    ],
    "evidence": [
     "IN-4",
     "FR-070",
     "HN-2"
    ],
    "note": {
     "ja": "同じ段の中は、問い → 面 → ヘルプの順。問いか面が立っているあいだは `SK-19` の 2 段目を当てない（`FR-070`）。最小化したヘルプはこの段に立たない（`HN-2`）"
    }
   },
```
新
```text
    "id": "RG-3",
    "keys": [
     "Esc"
    ],
    "rung": {
     "ja": "開いている面"
    },
    "states": [
     {
      "in": "confirmationStateMachine.questionAsked"
     },
     {
      "in": "openSurfaceStateMachine.open"
     }
    ],
    "evidence": [
     "IN-4",
     "FR-070"
    ],
    "note": {
     "ja": "同じ段の中は、問い → 面の順。問いか面が立っているあいだは `SK-19` の 2 段目を当てない（`FR-070`）。ヘルプはこの段に立たない —— 開いているウインドウの段に立つ（`IN-4`）"
    }
   },
```

<!-- EDIT id=E-07 file=docs/spec/_source/state-machines.json -->
旧
```text
   {
    "id": "RG-14",
    "keys": [
     "Esc"
    ],
    "rung": {
     "ja": "プロパティパネル"
    },
    "states": [
     {
      "machine": "propertiesPanelContentStateMachine",
      "except": "hidden"
     }
    ],
    "evidence": [
     "IN-4"
    ],
    "note": {
     "ja": "面ではない（`S-99g`、`S-99h`）。進行中のドラッグの次に置く（`IN-4`）。番号は最後の次を採り、並びは表の上下が持つ"
    }
   },
```
新
```text
   {
    "id": "RG-<新1>",
    "keys": [
     "Esc"
    ],
    "rung": {
     "ja": "開いているウインドウ"
    },
    "states": [
     {
      "in": "searchPanelDisplayStateMachine.shown.normal"
     },
     {
      "in": "searchPanelDisplayStateMachine.shown.maximised"
     },
     {
      "in": "helpDisplayStateMachine.shown.normal"
     },
     {
      "in": "helpDisplayStateMachine.shown.maximised"
     },
     {
      "in": "dialogueFieldDisplayStateMachine.shown"
     }
    ],
    "also": {
     "ja": "フレームの値（焦点がどのウインドウの中にあるか）"
    },
    "evidence": [
     "IN-4",
     "SV-14",
     "HN-2",
     "FR-066",
     "FR-152"
    ],
    "note": {
     "ja": "1 度の `Esc` で 1 つだけ閉じる。焦点がその中にあるウインドウが先、ほかは 表 T-337 の手前から（`IN-4`）。最小化したウインドウは立たない。検索パネルは、列の絞り込みが開いていれば絞り込みだけを閉じる（`SV-14`）。対話欄は `Agent API` が有効なあいだだけ立つ（`FR-066`）。`escapePressed` の `rung` の語は `searchPanel` ・ `helpModal` ・ `dialogueField`"
    }
   },
   {
    "id": "RG-14",
    "keys": [
     "Esc"
    ],
    "rung": {
     "ja": "プロパティパネル"
    },
    "states": [
     {
      "machine": "propertiesPanelContentStateMachine",
      "except": "hidden"
     }
    ],
    "evidence": [
     "IN-4"
    ],
    "note": {
     "ja": "面ではない（`S-99g`、`S-99h`）。進行中のドラッグと開いているウインドウの後に置く（`IN-4`）。番号は最後の次を採り、並びは表の上下が持つ"
    }
   },
```

⭐ E-07 は **問い 1 の推奨**（注の「焦点がその中にあるウインドウが先」）と **問い 2 の推奨**（`RG-4` と `RG-14` の間）で書いた。
⚠️ 状態のキー `dialogueFieldDisplayStateMachine.shown` は、`CR-621` が対話欄に最小化・最大化を足して子の状態を起こしたなら、最小化以外の子（ヘルプと同じなら `shown.normal`・`shown.maximised`）へ載せ直す（決定 3。4.1 節）。

<!-- EDIT id=E-08 file=docs/spec/_source/state-machines.json -->
旧
```text
      "escapePressed": {
       "shown": {
        "to": "hidden",
        "guard": [
         {
          "name": "isRungSearchPanel"
         }
        ],
        "evidence": [
         "SV-14",
         "IN-4"
        ]
       }
      },
```
新
```text
      "escapePressed": {
       "shown.normal": {
        "to": "hidden",
        "guard": [
         {
          "name": "isRungSearchPanel"
         }
        ],
        "evidence": [
         "SV-14",
         "IN-4"
        ]
       },
       "shown.maximised": {
        "to": "hidden",
        "guard": [
         {
          "name": "isRungSearchPanel"
         }
        ],
        "evidence": [
         "SV-14",
         "IN-4"
        ]
       }
      },
```

<!-- EDIT id=E-09 file=docs/spec/_source/state-machines.json -->
旧
```text
      "escapePressed": {
       "shown.normal": {
        "to": "hidden",
        "guard": [
         {
          "name": "isRungHelp"
         }
        ],
        "evidence": [
         "IN-4",
         "S-99g"
        ]
       },
       "shown.maximised": {
        "to": "hidden",
        "guard": [
         {
          "name": "isRungHelp"
         }
        ],
        "evidence": [
         "IN-4",
         "S-99g"
        ]
       }
      }
```
新
```text
      "escapePressed": {
       "shown.normal": {
        "to": "hidden",
        "guard": [
         {
          "name": "isRungHelp"
         }
        ],
        "evidence": [
         "IN-4",
         "HN-2"
        ]
       },
       "shown.maximised": {
        "to": "hidden",
        "guard": [
         {
          "name": "isRungHelp"
         }
        ],
        "evidence": [
         "IN-4",
         "HN-2"
        ]
       }
      }
```

<!-- EDIT id=E-10 file=docs/spec/_source/state-machines.json -->
旧
```text
       "hidden": {
        "to": "shown",
        "evidence": [
         "S-99i",
         "IC-18",
         "FR-066"
        ],
        "note": {
         "ja": "`Agent API` が無効なら、同じ押しで有効にもなる（`agentApi/enablingAskedByDialogueField`）"
        }
       }
      }
     }
    },
```
新
```text
       "hidden": {
        "to": "shown",
        "evidence": [
         "S-99i",
         "IC-18",
         "FR-066"
        ],
        "note": {
         "ja": "`Agent API` が無効なら、同じ押しで有効にもなる（`agentApi/enablingAskedByDialogueField`）"
        }
       }
      },
      "escapePressed": {
       "shown": {
        "to": "hidden",
        "guard": [
         {
          "name": "isRungDialogueField"
         }
        ],
        "evidence": [
         "IN-4",
         "FR-066"
        ],
        "note": {
         "ja": "`Agent API` は有効のまま（`FR-066`）"
        }
       }
      }
     }
    },
```

⚠️ E-10 の升も、`CR-621` が子の状態を起こしたなら、最小化以外の子の升へ分ける（E-08 と同じ形）。

<!-- EDIT id=E-11 file=docs/spec/_source/settings.json -->
旧
```text
      "ja": "同上。「面」とは、画面の上に重ねて開き、`Esc` の段（表 T-028 の `IN-4`）の「開いている面」で閉じられるものをいう。⚠️ プロパティパネルは面ではない —— 同行は、進行中のドラッグの次にパネルの段を別に置いている（`S-99h`）。⭐ **ヘルプ（`U-30` の `Help Modal`）は面ではない** —— 自分の表示の状態（`S-435`）を持ち、面と同時に開いていてよい（`FR-036`）。⚠️ ただし通常と最大化のヘルプは、表 T-023 の後の段・`FR-070` の `SK-19` の 2 段目・表 T-028 の `IN-4` の「開いている面」の段では、立っている面と同じに扱う —— 段の中では面の後（手前のものから閉じる）。最小化したヘルプはどれにも当たらない（`FR-036` の 表 T-336）"
```
新
```text
      "ja": "同上。「面」とは、画面の上に重ねて開き、`Esc` の段（表 T-028 の `IN-4`）の「開いている面」で閉じられるものをいう。⚠️ プロパティパネルは面ではない —— 同行は、進行中のドラッグと開いているウインドウの後にパネルの段を別に置いている（`S-99h`）。⭐ **ヘルプ（`U-30` の `Help Modal`）は面ではない** —— 自分の表示の状態（`S-435`）を持ち、面と同時に開いていてよい（`FR-036`）。⚠️ ただし通常と最大化のヘルプは、表 T-023 の後の段と `FR-070` の `SK-19` の 2 段目では、立っている面と同じに扱う。`Esc` では面の段に立たず、表 T-028 の `IN-4` の「開いているウインドウ」の段に立つ。最小化したヘルプはどれにも当たらない（`FR-036` の 表 T-336）"
```

<!-- EDIT id=E-12 file=docs/spec/_source/settings.json -->
旧
```text
表 T-028 の `IN-4` は、面より下、進行中のドラッグの次にパネルの段を与えている"
```
新
```text
表 T-028 の `IN-4` は、面より下、進行中のドラッグと開いているウインドウの後にパネルの段を与えている"
```

<!-- EDIT id=E-13 file=docs/spec/_source/published-entries.json -->
旧
```text
       "`InputCommandTranslator` が `Esc` の段（表 T-283 の `RG-3`）と、面が立っているかの判じに読む"
```
新
```text
       "`InputCommandTranslator` が `Esc` の段（表 T-283 の `RG-<新1>`）と、面が立っているかの判じに読む"
```

<!-- EDIT id=E-14 file=docs/spec/05-07-design.md -->
旧
```text
⚠️ **入口と形式は別の表の行であり、一方の上にあるとき他方は `null` である**。<br>
```
新
```text
⚠️ **入口と形式は別の表の行であり、一方の上にあるとき他方は `null` である**。<br>⭐ 焦点（閲覧環境のフォーカス）が `FR-036` の 表 T-335 のどのウインドウの中にあるかを答えること（MUST） —— 表 T-028 の `IN-4` の「開いているウインドウ」の段が、焦点を持つウインドウを先に閉じるために読む。<br>どのウインドウの中にも無いときは `null` とする。<br>
```

⭐ E-14 は **問い 1 の推奨**で書いた（案 B・D を採るなら、この 1 文は要らない —— 11 節）。

### 4.1 重なり

| 相手 | 重なる所 | どちらが先か・誰が数え直すか |
|---|---|---|
| `CR-621`（兄弟の草案。窓の枠・移動・大きさ・[_][□][x]・対話欄の既定を隠す） | ① 表 T-335 の前文「（今はヘルプ）」と 表 T-336 —— 本書は「表 T-335 のウインドウ」と書くだけで、どれがウインドウかは `CR-621` が持つ。`HN-2`（E-04）の `Esc` の語は本書が持つ。② `FR-036` の本文（E-03 の 1 行）。③ `dialogueFieldDisplayStateMachine`（E-10）—— 最小化・最大化・閉じる入口の行が足されると旧の尾が変わる。④ `S-99g` の注（E-11）・`S-99i`・`FR-066` —— `S-99i`・`FR-066` は本書は書かない。⑤ 表 T-337 の `UZ-9`（対話欄）の順 —— 本書は順を 表 T-337 に委ねるので、`CR-621` が対話欄を浮く窓として順を動かせば、`Esc` の順もそれに従う（本書は書き直さない） | ⛔ **`CR-621` が先。** 本書の E-03・E-04・E-07（状態のキー）・E-10・E-11 は、`CR-621` の新の上で旧を数え直して載せ直す。本書が動かす語は 4 節の新の差分だけ —— `Esc` の段の語と升 |
| `CR-629`（兄弟の草案。検索パネルの列・跳び方 `SJ-4`・`SJ-6`） | ① `SV-14` の同じ行 —— 本書 E-02 は 1 文目、`CR-629` の E-02 は 3 文目（「語・表の切り替え…」）。② `IF-9` の同じ行 —— 本書 E-14 は「入口と形式は…」の文の後ろ、`CR-629` の E-09 は「帯と縁が重なる所では…」の文。どちらも文字の区間は重ならない（13 節で測った）。③ `SJ-4` を「開閉を保つ」に覆すと、⑦ の話の筋（跳ぶとパネルが立つ）が変わるが、本書の規則は変わらない | どちらが先でもよい。後に当たる側が、同じ行の自分の旧を数え直すだけ（旧の区間は相手の新に触れない） |
| `CR-613`（草案、枝 `b3-export-shell-crs`） | その J-02 の旧の 1 行目が、本書 E-13 の旧と同じ 1 行（`isHelpStandingIn` の注） | 本書が先に当たれば、`CR-613` の J-02 は旧の 1 行目を E-13 の新へ替えて数え直す。`CR-613` が先なら、本書の E-13 はそのまま（J-02 は後ろへ足すだけ） |
| `CR-609`（草案、枝 `b2-panel-crs`。`IC-17` のもう一度の押しでパネルを閉じる） | `propertiesPanelContentStateMachine` の `settingsEntryPressed` の升と運ぶ値。本書はその機械の升に触れず、`RG-14`・`S-99h` の注の語だけを動かす | 重ならない。継ぎ目は「パネルを閉じる道が 1 つ増えても、`Esc` の段はプロパティパネルの段のまま」 |
| `CR-605`（草案。暦の面 `U-65`） | `S-99g` の「面」に 1 つ足し、`UZ-13`・`IC-52` を書く。本書の E-11 は `S-99g` の注の別の文 | 重ならない見込み。`CR-605` が注を書くなら、後の側が数え直す |
| `CR-617`（草案、遅延診断レポートの窓。⛔ 除外 —— 重なりだけ記す） | 「検索パネルと同じ作りの窓」に [_][□][x] を足す。表 T-335 のウインドウになれば、本書の窓の段に立つ | 後に当たる側が `RG-<新1>` の状態のキーに 1 つ足し、その機械に `escapePressed` の升を足す（E-08 と同じ形）。本書は書かない |
| `CR-603`〜`CR-620` のほか | 1〜10 行と本書の識別子で引いた（13 節）—— 重なり無し | ― |

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- The Esc ladder is IN-4 as CR-630 E-01 leaves it, and table T-283 prints
  the same order (the generator compares the words one for one):
    notice -> text edit -> open surface (question, then surface)
    -> gesture in flight -> OPEN WINDOW -> properties panel -> armed
    -> selection -> dual cursor mode -> tooltip
- OPEN WINDOW rung (RG-<new1>): the windows of table T-335 (help, search
  panel, dialogue field) that are shown and NOT minimised. The dialogue field
  stands only while the Agent API is enabled and S-99i is shown.
  One Esc closes exactly one window: the window that holds the focus first;
  otherwise the front-most by table T-337 (search panel, then help, then the
  dialogue field, as T-337 orders them today). Focus OUTSIDE every window
  does NOT remove a window from the rung (JDG-877 (7)).
- Search panel: when its turn comes and a column filter is open, that Esc
  closes the filter only (SV-14); the next Esc closes the panel.
- escapePressed.rung words: 'searchPanel' | 'helpModal' | 'dialogueField'.
  Guards: isRungSearchPanel, isRungHelp, isRungDialogueField (new).
  Cells: searchPanelDisplayStateMachine shown.normal / shown.maximised -> hidden;
  helpDisplayStateMachine shown.normal / shown.maximised -> hidden;
  dialogueFieldDisplayStateMachine shown -> hidden (Agent API stays enabled).
  A minimised window has no Esc cell.
- A drag in flight (including moving or resizing a window) takes Esc first
  (IN-1): the drag is interrupted, the window stays open.
- EscapeContext stays booleans: per window "standing" and "focused".
  Both builders (frame-loop.ts escapeLevelOf and input-command-translator.ts
  escapeContextOf) fill the same members.
- The screen surface answers which T-335 window holds the focus, or null (IF-9).
- No new event, no new state, no new constant, no new settings row.
```

## 6. グラフ（`bfbe7eb7`）

- `impact.py IN-4 SV-14 S-99g FR-066 FR-151 FR-040`:
  - `IN-4` を指す要求 12 件・参照 60 か所、`SV-14` 1 件・4 か所、`S-99g` 8 件・22 か所、`FR-066` を指す要求 2 件・16 か所、`FR-151` 7 件・46 か所、`FR-040` 2 件・3 か所。
- `induced.py IN-4 SV-14 S-99g FR-066 FR-151 FR-040`: 種 6/6、種の中の辺 6、閉路 1（4 対象: `FR-151` `IN-4` `S-99g` `SV-14`）。
- 導いた条項の対象を足して打ち直した: `induced.py IN-4 SV-14 S-99g S-99h HN-2 IF-9 FR-036 FR-151 T-283` —— 種 9/9、辺 15、閉路 1（6 対象: `FR-036` `FR-151` `IN-4` `S-99g` `S-99h` `SV-14`）。⇒ **その 6 つ（E-01・E-02・E-03・E-11・E-12）は 1 つの計画・1 つの波で書く**（8 節の波 1）。`impact.py HN-2 IF-9 S-99h T-283 T-335 T-337` も打った（`HN-2` 0 件・1 か所、`IF-9` 1 件・10 か所、`S-99h` 5 件・12 か所、表 T-283 を指す要求 0 件、表 T-335 1 件・2 次 7 件、表 T-337 5 件・2 次 19 件）。
- ⭐ 届いた先を 1 つずつ読んだ（書き換えの後も真か）:
  - 真のまま: `UC-004`（構えは解かない）・`FR-033` の `CY-9`（`Esc` はドラッグの段）・`FR-016`:3947／3954・`FR-053`（パレットは `Esc` で閉じない —— 決定 9）・`FR-070`:4980／4987／5016（「開いている面」はプロパティパネルより上 —— 真）・`FR-071`・`FR-076` の `NT-7`／`NT-8`（通知が先頭、問いのキー）・`FR-039` の `SE-5`・`FR-152`・`FR-051`・`FR-052`・`FR-102` の `IR-2`・`SJ-4`、`05-07-design.md` の `CP-36`・`UF-102`・`UF-66`・`UF-107`・`UF-109`・`SD-4`、`tbl-glossary.md` の `U-57`（第 1 階層は通知）・`U-64`（面ではない）・`IC-52`、`tbl-settings.md` の `S-142`・`S-200`・`S-206`（`Esc` では閉じない・戻らない・止まらない）。
  - ⭐ `IF-9` の「「入力中か」を読む 3 つの規則（`IN-4` の第 2 階層・…）」は、今は偽（編集は 3 段目）で、本書の後に真へ戻る（編集が 2 段目）。
  - 偽になるので書き換える: `IN-4`（E-01）・`SV-14`（E-02）・`FR-036`:7538（E-03）・`HN-2`（E-04）・表 T-283（E-05〜E-07）・`S-99g` の注（E-11）・`S-99h` の注（E-12）・`isHelpStandingIn` の注（E-13）。
  - ⚠️ 偽のまま残る（本書の外。報告の潜む不具合）: `WM-9`（`01-04-requirements.md:5842`）と `U-60`（`tbl-glossary.md:141`）の「`Esc` の第 1 階層で閉じる」—— 第 1 階層は通知であり、面は今 4 段目、本書の後 3 段目。
- `rulings.md` を `IN-4`・`Esc`・`ESC`・`RG-15`・`SV-14`・`S-99g`・`HN-2`・`T-336` で引いた: 当たりは `JDG-153`（倍率のメッセージは `Esc` の階層に載せない —— 触れない）・`JDG-289`（`IN-4` の段「選択」—— 触れない）・`JDG-290`（`IF-9` の編集の始まりと終わり —— 本書の E-14 は別の答えを足すだけ）・`JDG-300`（`CR-541` の `IN-4` の一括 —— 着地済みの文を残す）・`JDG-617`・`JDG-633`・`JDG-668`（`Esc` で消した説明が戻る契機 —— 触れない）・`JDG-820`・`JDG-850`・`JDG-877`・`JDG-896`・`JDG-664`（最小化したヘルプの見た目 —— 触れない）。⇒ 導いた条項（決定 1〜9）と食い違う裁定は 0。`JDG-617` の「焦点がパネルの中にあるときの `Esc` はパネルを閉じ」は、問い 1 の推奨で真のまま残る（案 B・D では、焦点が中にあっても別の窓が先に閉じる場合がある —— 11 節の代償の欄）。
- `pending-decisions.md` を `IN-4`・`Esc`・`RG-15`・`T-283` で引いた: `PND-153`（説明を消す段 —— 触れない）・`PND-311`・`PND-345`（`Dual Cursor` —— 触れない）・`PND-337`（裁定済。本書の決定 1 の先例）・`PND-350`（対話欄の打ちかけは `IN-5a` に数えない —— 本書は対話欄を編集の段に入れず、窓の段に入れる。食い違わない）・`PND-448`（触れない）。

## 7. 数の予測（`bfbe7eb7`。当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables | 差 0 | 表を足しも消しもしない |
| figures | 差 0 | 図の枚数は変わらない（状態図の矢印の名札は `npm run gen` が書き直す） |
| rows | 差 0 | 表 T-283: `RG-15` を退け `RG-<新1>` を起こす（15 → 15。`Esc` の段は 10 → 10）。表 T-028・T-330・T-336・T-206・T-065 は行の中の文だけ |
| uids | 差 0 | 要求を足しも消しもしない |
| 画面の値の出来事 | 差 0 | `escapePressed` は既に在る |
| `dialogueFieldDisplayStateMachine` の遷移表の行 | 1 → 2 | `escapePressed` の行を足す（E-10） |
| `searchPanelDisplayStateMachine` の `escapePressed` の升 | 1 → 2 | 合成 `shown` の 1 升を、`shown.normal`・`shown.maximised` の 2 升へ（E-08） |
| ガードの名 | ＋1 | `isRungDialogueField` |
| `EscapeTarget` の語 | 12 → 13 | `dialogueField`（コード。9 節） |
| `（MUST）` の印 | `01-04-requirements.md` 1407 → 1408、`05-07-design.md` 100 → 101 | E-01 の窓の段の MUST、E-14 の表面の答えの MUST。検査 39 のために試験が逐語で引く（8 節の波 2） |
| `（MUST NOT）` の印 | `01-04-requirements.md` 834 → 835 | E-01 の「焦点がウインドウの外にあることを理由に…外してはならない」 |

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 | 毎フレーム |
|---|---|---|---|---|
| 0 | ― | `CR-621` を当てた木で、E-03・E-04・E-07・E-10・E-11 の旧を数え直し、4.1 節の差分で載せ直す。対話欄に子の状態が起きていれば、E-07 の状態のキーと E-10 の升を最小化以外の子へ分ける | 当てる体 | ― |
| 1 | ⛔ **L4 の合流を待つ**（`screen-values.ts`・`frame-loop.ts`・`input-command-translator.ts`・`dom-screen-surface` は L4 の持ち物）。`docs/spec`（E-01〜E-14）＋ `npm run gen` ＋ 9 節の表のコード ＋ 下の「旧い文を引く試験」の 8 ファイル | 閉路の 6 対象（6 節）を 1 つの波で書く。原稿と、それを読むコード・神託を同じ波で着地させる（規則 02 の 3.5 —— 神託 `tests/contract/state-machine-screen-values.contract.test.ts` が原稿の升とコードを突き合わせるので、片方だけでは赤） | L4 の後の実装の体 | いいえ —— 段の判定は `Esc` を押した 1 回に 1 度だけ走る。焦点の読みは入力ごと（`collectInputContext`、今の `isSearchPanelFocused` の読みと同じ場所・同じ回数）で、描く手順と回数は変わらない |
| 2 | `tests/contract/cr-630-*.test.ts`（新しいファイルだけ） | 下の「仕様だけの試験」 | 仕様だけの試験の体（波 1 と並べてよい） | ― |

**旧い文を逐語で引く試験（波 1 で同じく書き換える。`git grep` で数えた）:**

| ファイル | 所 | 何を |
|---|---|---|
| `tests/contract/t-283-priorities.contract.test.ts` | `:22`・`:24`・`:26`（`IN_4_ORDER`・`IN_4_SURFACE_THEN_HELP`・`IN_4_SEARCH_PANEL_RUNG`）、`:95`〜`:98`・`:124`〜`:132`（段の番号の並び）、`:155`〜`:158`（`RG-15`）、`:260`〜`:263`・`:274`〜`:282`（段の語と材料の表） | E-01 の新しい文、`RG-<新1>` の位置、段の語 `searchPanel`・`helpModal`・`dialogueField` |
| `tests/contract/dfc-307-in-4-the-standing-explanation-is-the-last-rung.test.ts` | `:157`（`IN_4_THE_LADDER`）、`:196` 付近（`LADDER_AS_PRINTED`） | 新しい並び |
| `tests/contract/state-machine-screen-values.contract.test.ts` | `:340`〜`:345`（`isRungHelp`・`isRungSearchPanel` を偽で待つ枝） | 段の語が名指されたので真の枝を主張し、`isRungDialogueField` を足す |
| `tests/system/cr-571-the-search-panel-through-the-keys.test.ts` | `:14`（`SV_14_ESC`）・`:15`（`IN_4_RUNG`） | E-02・E-01 の新しい文 |
| `tests/system/cr-574-help-window.test.ts` | `:30` | E-01 の新しい文（面の段の順） |
| `tests/system/cr-597-the-search-panel-word-jump-and-grab.test.ts` | `:48`（`RG_15_ROW`）・`:301`・`:596` | `RG-<新1>` の行 |
| `tests/unit/in-4-escape-closes-the-panel.test.ts` | `:185`（`HN_2`） | E-04 の新しい文 |
| `tests/unit/document-model.test.ts` | `escapeTarget` の場合（`isSearchPanelFocused`・`isHelpStanding` を詰める所） | 新しい材料と順 |

**仕様だけの試験（`tests/contract/cr-630-*.test.ts`。docs/spec だけを読む体が書く）:**

| 場合の名 | 主張 |
|---|---|
| the Esc ladder is the ten rungs of IN-4 in order | `IN-4` の並びが 10 段で、「開いているウインドウ」が「進行中のドラッグ・引きかけの矢印」の次、「プロパティパネル」の前。表 T-283 の `Esc` の段の語が同じ並び |
| a search panel whose focus is elsewhere still closes on Esc (JDG-877 (7)) | 検索パネルが通常で、焦点が外、プロパティパネルが出ている → 1 度目の `Esc` で検索パネルが閉じ、2 度目でプロパティパネル |
| after the properties panel is closed, Esc still reaches the search panel | プロパティパネルを閉じた後も、次の `Esc` が検索パネルを閉じる（どの順で押しても、ウインドウを閉じる手立てが消えない） |
| the dialogue field closes on Esc and the Agent API stays enabled (JDG-850) | 対話欄が見えているとき `Esc` → `S-99i` が隠す、`Agent API` は有効のまま |
| the dialogue field does not stand while the Agent API is disabled | 無効のあいだは段に立たない（次の段へ渡る） |
| the window with the focus closes first | 検索パネルと対話欄が開いていて、焦点が対話欄の中 → 対話欄が先に閉じる（問い 1 の推奨） |
| without focus, the front-most window of table T-337 closes first | 焦点がどのウインドウにも無い → 表 T-337 の手前（検索パネル → ヘルプ → 対話欄）から 1 つずつ |
| one Esc closes one window | 3 つ開いていても、1 度の `Esc` で閉じるのは 1 つ |
| a minimised window does not stand on the rung | 最小化した検索パネル・最小化したヘルプだけが開いているとき、`Esc` は次の段へ渡る（`HN-2`） |
| a drag in flight is interrupted before any window closes | 検索パネルの見出しの帯を握ったまま `Esc` → パネルは元の角へ戻り、開いたまま（`IN-1`・`SV-10`） |
| an open column filter closes before the panel (SV-14) | 検索パネルの番で絞り込みが開いている → 絞り込みだけが閉じ、次の `Esc` でパネル |
| an edit in progress is undone before a window closes | その場の編集が確定していない → `Esc` は編集を取り消す（2 段目） |
| a question and a surface close before any window | 面が立っていて検索パネルも開いている → 面が先 |
| nothing to close hands Esc to the browser (IN-4a) | 何も立っていない → 消費しない |
| the MUST sentences are quoted verbatim | E-01 の MUST・MUST NOT と E-14 の MUST を逐語で引く（検査 39） |

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`bfbe7eb7` の行番号）

| ファイル | 関数・所 | 何を | 毎フレーム |
|---|---|---|---|
| `src/entity/document-model/screen-state/screen-state.ts` | `EscapeTarget`（`:15`〜`:28`）、`EscapeContext`（`:32`〜`:49`）、`escapeTarget`（`:54`〜`:68`） | 語 `dialogueField` を足す。材料をウインドウごとの「立っている」「焦点がある」の真偽にする（`isSearchPanelFocused` は「焦点がある」の 1 つとして残る）。順を 通知 → 編集 → 問い → 面 → ドラッグ → ウインドウ（焦点のあるもの → 検索パネル → ヘルプ → 対話欄）→ プロパティパネル → … にする。`DFC-1280` の `WHY` の注 3 つを消す（語が仕様に在る） | いいえ |
| `src/framework/single-html-shell/frame-loop.ts` | `ESCAPE_HELP`・`ESCAPE_SEARCH_PANEL`（`:451`〜`:452`）、`ESCAPE_RUNG_EVENTS`（`:489`〜`:502`）、`escapeLevelOf`（`:1342`〜`:1360`）、`collectInputContext` の焦点の読み（`:2379`） | `ESCAPE_DIALOGUE_FIELD` を足し表に載せる。材料を新しい形で詰める（対話欄は `Agent API` が有効で `S-99i` が表示のときだけ立つ）。`searchPanelAfterEscapeRung`（`:1300`〜`:1310`）はそのまま | いいえ |
| `src/adapter/input-command-translator/input-command-translator.ts` | `escapeContextOf`（`:1358`〜`:1372`） | 同じ項目を同じく詰める（`R2.21` —— 2 つの組み手を 1 つにするかは実装の体の判断。9 節の外の潜む不具合を見よ） | いいえ |
| `src/use-case/advance-screen-session/screen-values.ts` | `onEscapePressed`（`:586`〜`:594`） | `rung === 'dialogueField'` で対話欄を `hidden` へ（`Agent API` は動かさない）。`searchPanel` は最小化のあいだ変えない（E-08） | いいえ |
| `src/framework/dom-screen-surface/search-panel-drawing.ts`（`:470`）・`dom-screen-surface.ts`（`:680`・`:1051`）・ヘルプと対話欄を描くファイル・`src/framework/single-html-shell/single-html-shell.ts`（`:423`・`:440`・`:508`） | `isFocused` と `holdIsSearchPanelFocused` の配線 | 焦点がどのウインドウの中にあるかを答える 1 つの読みにする（E-14） | いいえ —— 入力ごとの読み。描く手順は変わらない |

⚠️ `CR-578`（`frame-loop.ts` を割る。起草のまま）が先に当たると、上の関数は別のファイルへ移る。⇒ 行番号ではなく関数の名で引く。

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- ウインドウの枠・動かす・大きさを変える・[_][□][x]・対話欄の既定を隠す・持つ値（`CR-621`）。
- 検索パネルの列・省略・跳び方・パネルの開閉を保つ（`CR-629`）。
- コマンドパレット・図形の一覧・パレットの最小化を `Esc` で閉じない（`FR-053`・`S-142`・`S-200` の MUST NOT はそのまま。決定 9）。
- ⭐ 本ツールには、開いたままのメニューが無い（`docs/spec` を「メニュー」で引いて 0 件 —— ブラウザのメニューの 1 か所だけ）。宿主が描く選び窓（日付・色・ファイル）は宿主が `Esc` を扱う（表 T-337 の注「宿主が出すものは本表に入れない」）—— 本書は触れない。
- 対話欄の打ちかけの文字を `IN-5a`・`WS-2` の「入力中」に数えない（`PND-350` のまま）。`Esc` で隠したときに打ちかけを残すかは、`IC-18` で隠したときと同じ扱い（`CR-621` の持ち物）。
- `WM-9`・`U-60` の「第 1 階層」の誤りは直さない（報告の潜む不具合）。
- 遅延診断レポートの窓（`CR-617`）を段に足さない（4.1 節）。
- `surfaceCloseAsked` の `target` の語（`isHelpTarget`、`DFC-1280` の残り半分）を決めない。

## 11. 利用者に問うこと

### 問い 1 —— 開いている窓が 2 つ以上あるとき、`Esc` はどれから閉じるか（焦点の扱い）

場面: 検索パネルを開いたまま、AI との対話欄にも文字を打っている。ヘルプも開いている。ここで `Esc` を押す。

| 案 | 決め方 | `JDG-877` ⑥「アクティブなら閉じる」 | `JDG-877` ⑦「プロパティパネルの後も閉じられる」 | `JDG-617`「焦点が中なら閉じる」 | 代償 |
|---|---|---|---|---|---|
| A（今） | 焦点が中にある窓だけが段に立つ | ○ | ✕（今の不具合そのもの） | ○ | 対話欄・ヘルプは焦点で判じる手立てが今は無い |
| B | 焦点を見ない。画面の重ね順（表 T-337: 検索パネル → ヘルプ → 対話欄）の手前から | △（検索パネルは常に一番手前なので○。対話欄に打っていても検索パネルが先に閉じる） | ○ | △（今の重ね順なら○。`CR-621` が順を変えれば崩れうる） | 対話欄に打っている最中の `Esc` が、見ていない検索パネルを閉じる |
| **C（推奨）** | **焦点が中にある窓が先、無ければ 表 T-337 の手前から** | ○ | ○ | ○ | 表面が「焦点がどの窓の中か」を答える 1 つが増える（E-14） |
| D | 最後に開いた・押した窓から | ○ | ○ | △（中を押した窓なら○） | 「最後に押した窓」を覚える新しい状態が要り、重ね順もそれに合わせないと、見えている手前と閉じる順がずれる（`CR-621` の持ち物に及ぶ） |

⭐ **推奨は C。** 理由: 利用者の「アクティブ」を Windows の作法どおり「焦点のある窓」と読み、⑥ を満たす。焦点が外に出ても重ね順で必ず段に立つので ⑦ も満たす。`JDG-617` の文も真のまま残る。状態を足さず、前後は既存の 表 T-337 1 つが持つ。
⚠️ 代償を正直に: 表面の答えが 1 つ増える。B なら E-14 と E-01 の「焦点がその中にあるウインドウを先に」が消え、もっと単純になる。
E-01・E-07・E-14 はこの推奨で書いた。

### 問い 2 —— 窓とプロパティパネルが両方開いているとき、どちらを先に閉じるか

場面: 検索パネルで跳んだ（`SJ-4` でプロパティパネルが立つ）。日程表のバーを押して眺めている。ここで `Esc` を押す。

| 案 | 1 度目の `Esc` | 2 度目の `Esc` | 良い点 | 代償 |
|---|---|---|---|---|
| **A（推奨）** | **窓（検索パネル）を閉じる** | プロパティパネルを閉じる | 窓はパネルの手前に重なって描かれる（表 T-337）—— 「手前のものから閉じる」と同じ向き。⑥ の「検索パネルがアクティブなら閉じる」を、パネルが出ていても満たす | 窓を開いたまま `Esc` で選択を解いたりパネルを閉じたりしたい人は、先に窓を閉じることになる（今のヘルプと同じ振る舞い） |
| B | プロパティパネルを閉じる | 窓を閉じる | ⑦ の利用者の押した順（パネル → 検索パネル）そのもの | 検索パネルに焦点を置いていても、パネルが出ていれば先にパネルが閉じる —— ⑥ と合わない（問い 1 の C と組むなら、焦点のある窓だけをパネルより上に置く 2 つ目の段が要る） |

⭐ **推奨は A。** 理由: 重なりの前後と閉じる順が 1 つの表（表 T-337）で揃い、段が 1 つで済む。⑥ と ⑦ の両方を満たす。
E-01・E-07・E-11・E-12 はこの推奨で書いた。

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1320` | 対話欄を閉じる手段が無い・開き直しても出る | 本書は `Esc` の半分だけを閉じる（E-01・E-07・E-10）。既定を隠す・持つ値・枠・[_][□][x] は `CR-621`。⚠️ 問い 1・2 が答えられるまで、`Esc` の半分は裁定待ち（順だけが問い。閉じること自体は `JDG-850` が決めた） |
| `DFC-1347` | 検索パネルの要望の束 | 本書は ⑥⑦ を閉じる（E-01・E-02・E-07・E-08）。①②④⑤ は `CR-629`、③ は `CR-621`。⚠️ ⑥⑦ は問い 1・2 の答えまで裁定待ち |
| `DFC-1280` | `Esc` の段の語が仕様に無い | 段の語（`escapePressed` の `rung` の `searchPanel`・`helpModal`）は E-07 の注が名指す —— 神託の `isRungHelp`・`isRungSearchPanel` の真の枝が主張できる。⚠️ 閉じる求め `surfaceCloseAsked` の `target` の語（`isHelpTarget`）は残る —— 行は開いたまま、残りを「`target` の語だけ」へ狭める |
| `JDG-850` | 利用者の裁定（`Esc` で閉じる の 1 文） | 調整役へ: 本書を当てる波が決まったら、状態を「指示 —— `CR-630` が当てる（`Esc` の 1 文。残りは `CR-621`）」にする（検査 43） |
| `JDG-877` | 利用者の裁定（最後の 2 行） | 同上（「最後の 2 行は `CR-630`」） |
| `JDG-896` | 利用者の裁定（案 A） | 本書は「`Esc` で閉じる」と「`Agent API` の記憶を残す」の `Esc` の側だけ。既定を隠すのは `CR-621` |
| `JDG-617`・`JDG-633`・`JDG-820` | 着地済みの裁定 | 変えない（0.1 節） |
| `PND-337`・`PND-350` | 裁定済・推奨のまま | 触れない |

**潜む不具合（本書は直さない。調整役が登録するための案）:**

| 案 | 不具合内容 | 期待値 | 対応案 |
|---|---|---|---|
| 1 | `WM-9`（`01-04-requirements.md:5842`）と `U-60`（`tbl-glossary.md:141`）が「`Esc` の第 1 階層で閉じる」と書く。`IN-4` の第 1 階層は「出ている通知」であり、面は今 4 段目（本書の後は 3 段目） | 「`IN-4` の「開いている面」の段で閉じる」 | 2 か所の語だけを直す小さな変更要求 |
| 2 | `EscapeContext` を 2 か所が別々に組み、項目が違う —— `input-command-translator.ts:1358`〜`:1372` の `escapeContextOf` は問い（`isConfirmationStanding`）を入れない。問いが立ち、プロパティパネルが出ておらず、選択が在るときの `Esc` は、シェルが問いに「いいえ」と答え（`frame-loop.ts:2987`）、同じ押しで `selection-input.ts:138` が選択も解く見込み（`frame-loop.ts:2977` の `pickedObjectsOf` 経由） —— 1 度の `Esc` が 2 段を使う（`IN-4`「1 階層ぶん消費し」に反する）。走らせて確かめてはいない | 1 度の `Esc` は 1 段だけ | 組み手を 1 つにする（`R2.21`）。本書の波 1 で同じ所を触るので、同じ波で直すのが安い |

## 13. 測り方の再現

```
# the tree: l4-review-crs bfbe7eb7 (= origin/refactor); the five spec files below are LF-only (0 CR bytes)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py IN-4 SV-14 S-99g FR-066 FR-151 FR-040
#   IN-4 12 req / 60 refs; SV-14 1 / 4; S-99g 8 / 22; FR-066 2 / 16; FR-151 7 / 46; FR-040 2 / 3
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py IN-4 SV-14 S-99g FR-066 FR-151 FR-040
#   -> seeds 6 of 6, edges 6, cycles 1 (size 4: FR-151 IN-4 S-99g SV-14)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py HN-2 IF-9 S-99h T-283 T-335 T-337
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py IN-4 SV-14 S-99g S-99h HN-2 IF-9 FR-036 FR-151 T-283
#   -> seeds 9 of 9, edges 15, cycles 1 (size 6: FR-036 FR-151 IN-4 S-99g S-99h SV-14)

# the code path of DFC-1347 (6)(7) and DFC-1320
git grep -n "isSearchPanelFocused\|searchPanelAfterEscapeRung\|escapeLevelOf\|escapeContextOf\|EscapeTarget\|isFocused" -- src
git grep -n "ESCAPE_RUNG_EVENTS\|ESCAPE_HELP\|ESCAPE_SEARCH_PANEL\|onEscapePressed\|dialogueFieldDisplayState" -- src

# the tests that quote the old wording
git grep -n "焦点がある検索パネル\|RG-15\|isRungSearchPanel\|isRungHelp\|開いている面の段では\|焦点がパネルの中にあるときの\|「開いている面」の段を飛ばし\|isSearchPanelFocused\|isHelpStanding" -- tests

# the rulings and ledger rows read whole
grep -n "JDG-850 \|JDG-877 \|JDG-896 \|JDG-617 \|JDG-633 \|JDG-820 " docs/development-records/rulings.md
grep -n "DFC-1320 \|DFC-1347 \|DFC-1280 " docs/development-records/defects.md
#   rulings mentioning IN-4 / Esc / ESC: rows 265 289 290 300 617 633 668 820 850 877 896 (by a row reader in the session scratchpad)
#   pending-decisions mentioning IN-4 / Esc: PND-153 311 337 345 350 448

# overlaps: lines 1-10 and the ids of this CR, in change-request/CR-603..620 (a reader in the session scratchpad)
#   sibling drafts present in this worktree (CR-623..626, CR-629): their 旧 blocks located in the files and compared
#   with ours by character span (a script in the session scratchpad) -> same line, disjoint spans:
#     CR-629 E-02 vs our E-02 (01-04:4923, SV-14), CR-629 E-09 vs our E-14 (05-07:614, IF-9); no other shared line
#   hits: CR-605 (S-99g, UZ rows, IC-52 -- other sentences), CR-613 (published-entries isHelpStandingIn line = E-13 old),
#         CR-617 (a window with [_][□][x]; excluded, noted), CR-609 (IN-4 read only)

# the old blocks: each counted once, LF-normalised, by a script in the session scratchpad
#   (reads the <!-- EDIT --> markers of THIS file, takes each 旧 fenced block, counts it in its file)
#   E-01 docs/spec/01-04-requirements.md 1
#   E-02 docs/spec/01-04-requirements.md 1
#   E-03 docs/spec/01-04-requirements.md 1
#   E-04 docs/spec/01-04-requirements.md 1
#   E-05 docs/spec/_source/state-machines.json 1
#   E-06 docs/spec/_source/state-machines.json 1
#   E-07 docs/spec/_source/state-machines.json 1
#   E-08 docs/spec/_source/state-machines.json 1
#   E-09 docs/spec/_source/state-machines.json 1
#   E-10 docs/spec/_source/state-machines.json 1
#   E-11 docs/spec/_source/settings.json 1
#   E-12 docs/spec/_source/settings.json 1
#   E-13 docs/spec/_source/published-entries.json 1
#   E-14 docs/spec/05-07-design.md 1
# the same script applied every 新 to in-memory copies: the three JSON files parse; the IN-4 chain and the
# Esc rung words of priorities match one for one (10 rungs); the RG ids read
#   RG-1 RG-2 RG-3 RG-4 RG-<新1> RG-14 RG-5 RG-6 RG-7 RG-8 RG-9 RG-10 RG-11 RG-12 RG-13
#   (MUST) 01-04 1407 -> 1408, (MUST NOT) 834 -> 835, (MUST) 05-07 100 -> 101

# the two checks that read change requests, run alone (not check.sh)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-cr-discipline.py          # OK (357 CRs)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-identifier-reservation.py # OK
```
