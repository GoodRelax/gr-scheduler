# CR-828 —— ヘルプは「保存の確認にサイトの名が出ても、どこへも送らない」と 1 文で言う

> 起草の状態: 当てた（2026-10-23、枝 `cr827-828-prompt-help`、`265dfcb86` の上）。計画の段 2 の子セッションが、起草・仕様・`src`・台帳を同じ作業木で行い、試験は仕様だけを読む別のサブエージェントが書いた。
> ID の帯: `CR-827` の頭書きのとおり。本書が使ったのは `CR-828` と性能の測り待ち `267`（`CR-827` と共有）。新しい行 ID は無い（辞書の鍵 `helpBlockNotes` は行 ID ではない）。`265dfcb86` の木で `CR-828` を名乗る変更要求は 0 件だった。
> 当てるもの: `JDG-3087`（`DFC-3395`、計画 uid 236）—— ヘルプに 1 文。同じヘルプの `DFC-3003`（ライセンス全文で窓が伸びる）は、調整役の指示で別の `CR-832` が当てる（窓の振る舞いの変更と 1 文の追加を分けるため）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`265dfcb86`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| 保存の確認の文言は GRS が出している（`DFC-3395` の読み手の誤解） | ブラウザ（Edge・Chrome）が File System Access でページに手元のファイルを上書きさせる前に出す確認。文言はブラウザが決める | GRS からは変えられない。ヘルプに 1 文（`JDG-3087`） |
| 1 文を足すとヘルプが 1 画面に収まらない | 1280 × 627（ja）で撮った: 左の列（基本操作とブラウザの機能）の下に空きがあり、1 文はそこに 2 行で入る。ほかの列の高さは変わらない | ブラウザの機能の塊の行の下に置く |

### 0.2 裁定の鎖（`rulings.md` を「`DFC-3395`」「保存の確認」で引いた）

`JDG-3087`（2026-10-22）に従う。覆す裁定は無い。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-006`（マニュアルを読まずに使える）—— 保存の確認を「サイトがファイルを扱う」と読み違えない。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（唯一の正）—— 1 文の語は辞書（`helpBlockNotes` の `browser`）だけが持つ。描き手は塊の名で引き、字を持たない。
- `R2.14`（POLA）—— 1 文はブラウザの機能の塊（見出し「GRS の機能ではない」）に置き、GRS の入口の一覧と混ぜない。

### ③ 利用者に問わずに決めたこと（覆してよい）

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 1 文は「ブラウザの機能（GRS の機能ではない）」の塊の行の下に置く | ブラウザがすることの説明で、塊の見出しと合う。1 画面に収まる空きがある | 塊の枠が 2 行ぶん高くなる |
| X-b | 文言: 「保存の前にブラウザが出す確認にサイトの名が出ても、GRS は手元のファイルを書き換えるだけで、どこへも送りません。」／ "Even if the browser's confirmation before saving names a site, GRS only rewrites the file on your computer and sends it nowhere." | `JDG-3087` の示した文案（「サイトの名は、ページの出どころです。…」）を 1 文に縮めた。「出どころ」は普段の言葉でないので外した | 「出どころ（オリジン）」の説明は無い |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| ヘルプのブラウザの機能の塊 | 2 行（ズームと倍率を戻す） | 2 行の下に 1 文（日英） |

---

## 2. 新しい識別子

無い（行 ID は取らない）。辞書の節 `helpBlockNotes`（鍵 `block`）、HTML の印 `data-help-note`、`HelpModal` の `blockNotes`。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

無い（仕様もコードも足すだけ）。

---

## 4. 書き直す所

| 所 | 書いたこと |
|---|---|
| `docs/spec/01-04-requirements.md` の `FR-036`（表 T-255 の後） | ブラウザの機能の塊に 1 文を添える MUST、語の置き場、ブラウザの文言は変えられないこと、入手の頁には書かないこと |
| `docs/spec/_source/display-words.json` | `helpBlockNotes` の `browser`（日英） |

### 4.1 生成物

`tools/generate_display_words.py` に節 `helpBlockNotes` を足し（鍵の一覧と形と書き出す節）、`src/adapter/screen-renderer/display-words.json` を書いた。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えたもの |
|---|---|
| `src/adapter/screen-renderer/screen-renderer.ts` | `HelpModal` に `blockNotes` |
| `src/adapter/screen-renderer/open-modals.ts` | `helpBlockNotes` —— 辞書の語をヘルプの言語で |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` | 書式 `helpBlockNote` |
| `src/framework/dom-screen-surface/open-modals-drawing.ts` | 塊の名で 1 文を塊の最後に足す |
| `tests/unit/uf-71.test.ts`・`tests/unit/uf-72-screen-part.test.ts` | 型の偽物に `blockNotes: []`（型が要るので足しただけ） |

試験: 仕様だけを読む別のサブエージェントが書いた（数と結果は合流の報告に書く）。

毎フレームの経路: `src/adapter/screen-renderer/**` に触れた。`perf-pending` の 267（`CR-827` と共有）。1 文はヘルプの本文を描き直すときに 1 つ足すだけ。

---

## 6. グラフ（`impact.py`）

`FR-036` に `JDG-3087`・`DFC-3395`・`CN-6`・`FR-060` の辺が足される。消す辺は無い。

---

## 7. 数（実測）

出荷ビルドを Playwright（1280 × 627、ja）で開いた: 1 文はブラウザの機能の塊の 2 行の下に 2 行で入り、ヘルプは 1 画面に収まる（画像で確かめた）。`data-help-note="browser"` の字は辞書の `ja` と同じ。

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `defects.md` | `DFC-3395` を `実測待ち` |
| `rulings.md` | `JDG-3087` を `適用済` |
| `perf-pending.md` | `267`（`CR-827` と共有） |
| `changelog.md` | 本書の 1 行 |

---

## 9. 測り方の再現

```
git grep -c "CR-828" 265dfcb86 -- change-request docs src tests                    # 0 件
```

---

## 10. 利用者の実物の手順

ヘルプを開く。左の列の「ブラウザの機能（GRS の機能ではない）」/ "Browser Functions (Not GRS)" の 2 行の下に 1 文が出るか。言語を切り替えると英語の文になるか。ヘルプが 1 画面に収まったままか。
