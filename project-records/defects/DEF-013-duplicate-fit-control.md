# DEF-013: ヘッダー [Fit] とパレット旧 [⤢] が重複し同一アクセシブル名を共有

- 起票: 2026-07-23（test-engineer, Playwright E2E フル実行で発見）
- 種別: defect（UI 重複コントロール / WCAG 4.1.2 隣接）
- 重大度: **Low**（機能は破綻していない。同一操作を実行する2つのボタンが
  同一アクセシブル名 "Fit schedule to view" を共有するため、名前ベースの
  ロケータ/支援技術双方から一意に区別できない）
- 状態: **Fixed（2026-07-23、アクセシブル名の区別により解消）**
  - CR-006 Part 1 は「パレットに既にある Fit を残したまま、使用頻度が高いのでヘッダーにも新設する」と
    明記しており、**両方を残すのがユーザーの意図**である。したがってボタン自体の削除は行わず、
    **アクセシブル名を区別**する非破壊の是正を採った。
  - `i18n.ts` に `fit_to_content_palette`（en: `Fit schedule to view (palette)` /
    ja: `全体表示 (パレット)`）を追加し、パレット側 `fitButton` とその再ローカライズ経路を
    このキーへ切替。ヘッダー側は `fit_to_content` のまま（主たる操作子）。
  - これで支援技術・名前ベースロケータの双方から一意に識別できる。
  - gate: tsc 0 / vitest 876 / eslint 0 / **Playwright 117/117**。
- **ユーザー判断（2026-07-23、確定）**: **パレット側の Fit は残す**。
  したがって本 defect は「アクセシブル名の区別」をもって **CLOSE** とし、
  一本化（パレット側の廃止）は行わない。
- 関連: TOOL-L1-008（CR-006 Part1 → CR-015 で改訂されたヘッダー順）,
  `src/app/main.ts`（`fitButton` / `headerFitButton`）, `src/app/header-model.ts`

---

## 事象

`src/app/main.ts` に **Fit ボタンが2つ**存在する。

1. `fitButton`（`data-role="fit-to-content"`、グリフ `⤢`）: コマンドパレット内。
   コメントに `// Fit: frame the whole schedule in the viewport (fix 7).` とあり、
   CR-006 以前の初期実装（"fix 7"）に由来する。
2. `headerFitButton`（`data-role="header-fit"`、可視ラベル `Fit`）: ヘッダー内。
   CR-006 Part 1 で新設され、CR-015 でヘッダー内の並び順が
   `[Fit][P]` → 先頭2枠に変更された。

両者とも `aria-label` / `title` が `uiLabel('fit_to_content')` = **"Fit schedule to view"**
で完全に同一。CR-006 がヘッダーに Fit を新設した際、パレット側の旧 Fit ボタンを
撤去し忘れたと見られる（CR-004 で撤去した旧 "Import icon" ボタンと同種の後始末漏れ）。

## 発見経緯

Playwright E2E で `page.getByRole('button', { name: 'Fit schedule to view' })` /
`{ name: 'Fit' }`（部分一致）を使う4つのテストが **strict mode violation**
（2要素に解決）で失敗した:

- `tests/e2e/lines-cursor-dependency-batch.spec.ts`「2. the today line …」
- `tests/e2e/lines-cursor-dependency-batch.spec.ts`「3. the progress line bends …」
- `tests/e2e/interaction-batch.spec.ts`「Fit frames the whole schedule …」
- `tests/e2e/visual-data-batch.spec.ts`「Fit frames items from BOTH majors …」

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Fit' }) resolved to 2 elements:
    1) <button data-role="fit-to-content" aria-label="Fit schedule to view">⤢</button>
    2) <button data-role="header-fit" aria-label="Fit schedule to view">Fit</button>
```

## 暫定対応（test-engineer, 2026-07-23）

上記4テストのロケータを `page.locator('button[data-role="header-fit"]')` に固定し、
どちらのボタンかを名前解決に依存しない形にした（ヘッダーが CR-015 で正典化された
位置のため）。**これはテストの回避策であり、UI 側の重複は未解消**。

## あるべき挙動（implementer 判断待ち）

ヘッダーが常時表示の固定バー（`layout-mock-conformance.spec.ts` が保証する
"a slim header" は常にビューポート内）である以上、パレット側の `⤢` ボタンは
機能的に冗長と考えられる。以下のいずれかで是正することを推奨する:

1. **パレット側の `⤢` Fit ボタンを撤去**（CR-004 の Import icon 撤去と同種の整理）。
   ただしパレットがヘッダーから離れた位置にドラッグされている場合の
   「手元で完結したい」ユースケースを損なわないか要確認。
2. 撤去しない場合は、少なくとも **アクセシブル名を分ける**
   （例: パレット側は "Fit schedule to view (palette)" 等）。

## 検証

- 是正後、`getByRole('button', { name: 'Fit schedule to view' })` が
  ドキュメント全体で高々1要素に解決すること（or 明確に区別可能なこと）。
- 上記4テストのロケータを `header-fit` 固定から `getByRole` ベースへ
  戻せること（対症療法の解消）。
