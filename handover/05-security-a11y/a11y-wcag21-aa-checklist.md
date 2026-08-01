---
type: Reference
title: "gr-scheduler WCAG 2.1 AA チェックリスト"
description: 達成基準と前プロジェクトの実装対応表。参照先の実装ファイルは handover に無い。
tags: [a11y]
phase: planning
status: stable
---
# gr-scheduler WCAG 2.1 AA チェックリスト (M5c)

本書は Phase 4 M5c で実装したアクセシビリティ対応を、WCAG 2.1 の各達成基準
(Success Criterion, SC) に対応づけたものである。`実装` 欄はコード上の対応箇所、
`自動検証` 欄は自動テストの有無、`人手確認` 欄は人間のアクセシビリティレビュアが
実機/支援技術で確認すべき残タスクを示す。

- 対象要求: `docs/spec/25-nfr-a11y.sdoc` (NFR-L1-003/004/005/006)、`CLAUDE.md`
  品質目標 (WCAG 2.1 AA + 色弱者対応 + キーボード操作)。
- 自動 a11y スキャン: `tests/e2e/a11y.spec.ts` (Playwright + axe-core)。
  serious/critical 0 件で PASS。実行: `npm run build && npx playwright install chromium
  && npm run test:e2e`。
- 単体検証: `tests/{contrast,accessible-name,a11y-encoding,keyboard-commands}.test.ts`。

---

> 🔴 **この文書の使い方（2026-07-30 追記）**
>
> **`実装` 欄と `自動検証` 欄は前プロジェクトの実装の記録**であり、参照先（`src/` / `tests/` /
> `docs/spec/25-nfr-a11y.sdoc`）は **`handover/` に入っていない**（`../DISCARDED-ja.md`）。旧名も残る。
>
> **次期が引き継ぐのは 3 つだけ**:
>
> 1. **SC の一覧**（どの達成基準を対象にしたか）— そのまま使える
> 2. **`人手確認 (残)` 欄** — 自動検証で埋まらない項目。次期でも同じことを人が見る
> 3. **`残存ギャップ`（4 件のうち 3 件が未解決）** — **次期の課題として引き継ぐ**。
>    #2（ラベルの可読性）は 2026-07-31 の縁取りで解決済み。**#3 は `themeHue` で条件が成立した**ので優先度が上がっている
>
> `実装` 欄は**次期の設計で置き換える**。特に **SC 1.4.1（色に依存しない）は前提が変わった**:
> 予実の区別は「破線/実線」だけでなく、**予定バーの高さ > 実績バーの高さ という幾何**と
> **Progress Marker の形**（`(✓)` / `( \ )` / `(!)`）が担う
> （`../07-plan-actual/handover-plan-actual-decisions-ja.md` §2-2 / §2-4）。
> **マーカーは SVG で描き、フォントの字形に依存させない**ことも同基準の充足条件である。

## 対応表

| SC | 名称 | レベル | 実装 | 自動検証 | 人手確認 (残) |
|----|------|--------|------|----------|----------------|
| 1.1.1 | Non-text Content | A | アイコンのみボタン (パレット図形/色スウォッチ/`Hidden Group Tab`/タブ) に `aria-label`+`title`。SVG の `Task` は `role="img"`+`<title>` に「名称+種別+日付」（**略称は廃止済み**）。`accessible-name.ts` / `svg-renderer.ts` / `tool-palette.ts` / `property-panel.ts` / `left-pane.ts` | `accessible-name.test.ts`、axe (image-alt/button-name) | スクリーンリーダーで各アイコンの読み上げが自然か |
| 1.4.1 | Use of Color | A | 選択=破線枠、キーボードフォーカス=実線リング、予定/実績=破線/実線 (`a11y-tokens.ts` `planActualStrokeDashArray` / `SELECTION_DASH_ARRAY` / `FOCUS_RING_DASH_ARRAY`)。色スウォッチに色名ラベル | `a11y-encoding.test.ts` | グレースケール印刷/CVD シミュレータで予実・選択が判別可能か |
| 1.4.4 | Resize Text | AA | `fontScale`（`S`/`M`/`L`）を `documentSettings` に持つが、**保存値は初期値であって読む人が変更できる**（`../02-data-model/grs-document-settings-ja.md` §4-2）。文書が強制してはならない | (未実装) | 200% 拡大で情報・機能が失われないか |
| 1.4.11 | Non-text Contrast | AA | 重なる相手とのコントラスト **3:1 以上**（特に実績 ÷ 予定）。Progress Marker は**形が意味を担い色に依存しない**。実測値は `../07-plan-actual/handover-plan-actual-decisions-ja.md` §2-6 | (未実装) | ダークモードで実績／予定の比が 3:1 を保つか |
| 2.5.5 | Target Size | **AAA(参考採用)** | 掴み代は予定バーの上下 6px、フェード掴み点 15×15px。**文書に保存しない**（読む人のアクセシビリティに属するため。`../02-data-model/grs-document-settings-ja.md` §5-1） | (未実装) | 手が震える人・タッチ操作で掴めるか。**AA の要求ではないので、本表の AA 適合判定には数えない** |
| 1.4.3 | Contrast (Minimum) | AA | UI 配色トークン集約 (`a11y-tokens.ts` `UI_COLOR_PAIRS`)。ツールバー/パネル/ペイン/ラベル/自動保存ステータスを AA 準拠値に調整。パレットの遊休時は「地色のみ」フェード (文字は不透明) にして文字コントラストを維持 | `contrast.test.ts` (全トークン ≥ AA)、axe (color-contrast) | 大規模フォント縮小時・ユーザー任意色 (fill/stroke) 選択時のラベル可読性 |
| 2.1.1 | Keyboard | A | キャンバスをフォーカス可能化 (`tabindex=0`)。Tab=アイテム間移動、矢印=1日/1行移動、Shift+矢印=リサイズ、Enter/Space=配置/編集、Escape=取消。`keyboard-commands.ts` (純関数) + `keyboard-navigation.ts` (配線)。文書レベル操作 (Undo/Redo/Copy/Paste/Delete) は `keyboard-shortcuts.ts` | `keyboard-commands.test.ts`、axe (focusable) | 全操作 (依存線作成・整列・透かし等) がキーボードのみで完了できるか (依存線作成のキーボード経路は未実装—下記残課題) |
| 2.1.2 | No Keyboard Trap | A | Tab のアイテムローピングは端で `preventDefault` せず、フォーカスがキャンバス外へ抜ける。`keyboard-navigation.ts` (focus-next/prev の境界処理) | axe、`keyboard-commands.test.ts` (roving 意図) | 実機で Tab/Shift+Tab がどのUI要素にも閉じ込められないか |
| 2.3.3 | Animation from Interactions | AAA(参考採用) | `prefers-reduced-motion: reduce` でパレットのフェード等の transition/animation を無効化。`a11y-stylesheet.ts` | (手動) | OS の「視差効果を減らす」設定でアニメーション停止を確認 |
| 2.4.3 | Focus Order | A | DOM 順を ツールバー→パレット→左ペイン→キャンバス→プロパティパネル に整列 (`main.ts` の stage 子要素再配置)。オーバレイは絶対配置+z-index のため見た目は不変 | axe | 実機で論理的な移動順か |
| 2.4.7 | Focus Visible | AA | `:focus-visible` で全コントロール/キャンバスに高コントラスト輪郭。フォーカス中アイテムに SVG 実線リング。`a11y-stylesheet.ts` / `svg-renderer.ts` (`updateFocusRing`) | axe、`a11y-encoding.test.ts` (リングが選択と別属性) | フォーカス表示が全要素で視認可能か |
| 3.1.1 | Language of Page | A | `<html lang>` を起動時とロケール切替時に active locale へ設定。`main.ts` | (手動) | ja/en 切替で lang 属性が追従するか |
| 4.1.2 | Name, Role, Value | A | ツールバー/パレット `role="toolbar"`、パネル/ペイン `role="region"`、キャンバス `role="application"`+`aria-label`+`aria-describedby`(操作ヘルプ)。プロパティは `<label>` で暗黙関連付け | axe (aria-*) | 支援技術で役割/名前/値が正しく伝わるか |
| 4.1.3 | Status Messages | AA | 自動保存の成否・取込エラー・キーボードフォーカス移動を `aria-live="polite"` で通知。自動保存ラベルは `role="status"`。`live-region.ts` / `main.ts` | (手動) | スクリーンリーダーで保存/エラーが割り込みなく読み上げられるか |

## 実施済 / 未実施の明示

- 実施: axe-core 自動スキャン (`npm run test:e2e`) をこの環境で実行し、
  serious/critical **0 件** を確認 (Chromium headless をローカルに導入)。単体テスト
  (contrast / accessible-name / a11y-encoding / keyboard-commands) 全 PASS。
- 未実施 (人手): 実スクリーンリーダー (NVDA/VoiceOver 等) での読み上げ検証、実機
  キーボード操作の一連フロー検証、CVD シミュレータでの目視確認。これらは人間の
  a11y レビュアに委ねる。

## 残存ギャップ (人手レビュア向け)

1. **依存線作成のキーボード経路**: 依存線 (DEP) の作成は現状ポインタ (Link モード
   ドラッグ) のみ。キーボードのみでの依存線作成は未実装。SC 2.1.1 の完全充足には
   将来対応が必要。
2. ~~**アイテムのユーザー任意色**: fill/stroke にユーザーが低コントラスト色を選ぶと
   ラベル (`#1a1a1a`) が読みにくくなる可能性。ラベルの自動反転や縁取りは未実装。~~
   → **解決済み（確定 2026-07-31）**。文字色はテーマの前景色 1 つに統一し、バーに載る文字に
   **背景色の縁取り**（フォント × 0.17）を付ける。文字が接する色が縁＝背景色になるので
   比は **21:1 で固定**され、人が選んだ色に依存しなくなる
   （`../07-plan-actual/handover-plan-actual-decisions-ja.md` §2-7）。
3. **透かし/コメント等オーバレイ**: 装飾テキストのコントラストは固定値。ユーザー
   背景色変更機能が入った場合は再評価が必要。
   → ⚠️ **条件が成立した（2026-08-01）。解決ではない。** `themeHue` / `themeMonochrome` が
   まさにその「ユーザー背景色変更機能」である（`../02-data-model/grs-document-settings-ja.md` §4-2）。
   同節が contrast 規則で解くのは**地の彩度と、予定・実績・輪郭線の明度**だけで、
   **透かし・コメントのオーバレイ文字は対象外**。**次期で必ず解くこと。**
4. **タッチ/ポインタ以外の支援入力**: スイッチ/音声入力での操作性は未検証。
