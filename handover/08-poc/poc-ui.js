/* ==========================================================================
   poc-ui.js -- the single source of every dimension the PoC pages draw with.
   Every PoC page loads this file and declares NO size literal of its own.

   Authority for the values:
     handover/03-ui-naming/handover-ui-detail-spec-ja.md   4-9 / 4-10 / 6
     handover/07-plan-actual/handover-plan-actual-decisions-ja.md  2-4-1 / 2-6

   Reference environment for every absolute pixel value below:
     1920 x 1080 / browser full screen / 100% zoom / 50px header band.

   SPEC carries, for each setting: the group it belongs to, its key, its
   Japanese display name, its unit, the step of its spinner, its default, and
   a function returning the range it may take. A range is a function of the
   whole set because settings constrain each other -- see 4-10-2.
   ========================================================================== */
(function (global) {
"use strict";

var EPS = 1e-6;

/**
 * The reference environment every absolute pixel value is quoted against.
 * Not a setting: it describes the screen we measured on, not the product.
 *   handover/07-plan-actual/handover-plan-actual-decisions-ja.md 2-4-1
 */
var ENV = { viewW: 1920, viewH: 1080, headerH: 50 };
ENV.canvasH = ENV.viewH - ENV.headerH;

var SPEC = [
  /* ---- time axis ---------------------------------------------------- */
  { g: "時間軸", k: "pxPerDayAt1x", n: "1 日の幅（zoomX = 1）", u: "px", step: 0.5, d: 6,
    rng: function () { return { lo: 0.5, hi: 60 }; } },
  { g: "時間軸", k: "rulerH", n: "目盛の帯の高さ", u: "px", step: 1, d: 34,
    rng: function (S) { return { lo: S.rulerFont + 6, hi: 120,
      why: "目盛の文字が入る高さ" }; } },
  { g: "時間軸", k: "rulerFont", n: "目盛の文字", u: "px", step: 1, d: 12,
    rng: function (S) { return { lo: S.fontMin, hi: 40, why: "和文の可読下限を割らない" }; } },

  /* ---- vertical ------------------------------------------------------ */
  { g: "縦の寸法", k: "basePlanH", n: "予定の縦幅（zoomY = 1）", u: "px", step: 1, d: 28,
    rng: function (S) { return { lo: S.actualMin / S.actualOfPlan, hi: 200,
      why: "下限 = actualMin ÷ actualOfPlan。等倍がこの値だと縦に縮める余地が無くなる" }; } },
  { g: "縦の寸法", k: "actualOfPlan", n: "実績 ÷ 予定", u: "", step: 0.01, d: 0.73,
    rng: function () { return { lo: 0.05, hi: 1 - EPS, why: "実績 < 予定" }; } },
  { g: "縦の寸法", k: "actualMin", n: "実績の縦幅の下限", u: "px", step: 1, d: 16,
    rng: function (S) { return { lo: S.fontMin / S.fontOfActual, hi: 80,
      why: "下限 = fontMin ÷ fontOfActual。これを割ると文字が下限に張り付く（07 2-4-1）" }; } },
  { g: "縦の寸法", k: "fontOfActual", n: "フォント ÷ 実績", u: "", step: 0.05, d: 0.80,
    rng: function () { return { lo: 0.05, hi: 1 - EPS, why: "フォント < 実績" }; } },
  { g: "縦の寸法", k: "fontMin", n: "最小フォント", u: "px", step: 1, d: 12,
    rng: function () { return { lo: 12, hi: 40, why: "和文がこれを割ると読めない（07 2-4-1）" }; } },
  { g: "縦の寸法", k: "thinFontScale", n: "細線のフォント倍率", u: "", step: 0.05, d: 0.85,
    rng: function () { return { lo: 0.3, hi: 1, why: "細線は少し小さく" }; } },
  { g: "縦の寸法", k: "actualGap", n: "予定 → 実績の間隔（下に置くとき）", u: "px", step: 1, d: 2,
    rng: function () { return { lo: 0, hi: 20 }; } },
  { g: "縦の寸法", k: "laneGap", n: "段の間隔", u: "px", step: 1, d: 12,
    rng: function (S) { return { lo: S.depWidth * 2, hi: 60,
      why: "依存線が 1 本通る幅（下限 = 依存線の太さ × 2）" }; } },
  { g: "縦の寸法", k: "rowGap", n: "行の間隔", u: "px", step: 1, d: 8,
    rng: function () { return { lo: 0, hi: 60 }; } },

  /* ---- shape heights ------------------------------------------------- */
  { g: "形状ごとの縦幅（予定の縦幅の倍率）", k: "shapeH.bar", n: "=== 矩形", u: "x", step: 0.1, d: 1.0,
    rng: function () { return { lo: 1, hi: 1, why: "基準なので 1 固定" }; } },
  { g: "形状ごとの縦幅（予定の縦幅の倍率）", k: "shapeH.chevron", n: ">===> 矢羽根", u: "x", step: 0.1, d: 1.0,
    rng: function () { return { lo: 0.2, hi: 3 }; } },
  { g: "形状ごとの縦幅（予定の縦幅の倍率）", k: "shapeH.arrow", n: "---> 矢印", u: "x", step: 0.05, d: 0.5,
    rng: function () { return { lo: 0.1, hi: 1 - EPS, why: "細線は矩形より薄い（それが取り柄）" }; } },
  { g: "形状ごとの縦幅（予定の縦幅の倍率）", k: "shapeH.endpointSpan", n: "*----* 端点スパン", u: "x", step: 0.05, d: 0.5,
    rng: function () { return { lo: 0.1, hi: 1 - EPS, why: "細線は矩形より薄い" }; } },
  { g: "形状ごとの縦幅（予定の縦幅の倍率）", k: "shapeH.milestone", n: "◇ マイルストーン", u: "x", step: 0.1, d: 1.5,
    rng: function () { return { lo: 1 + EPS, hi: 4, why: "目立たせるので矩形より大きい" }; } },

  /* ---- dependency lines. Fixed: they follow neither zoom nor font. ---- */
  { g: "依存線（固定・ズームに追随しない）", k: "depWidth", n: "太さ", u: "px", step: 0.1, d: 1.5,
    rng: function (S) { return { lo: 0.5, hi: S.laneGap / 2,
      why: "段の間隔の半分を超えない" }; } },
  { g: "依存線（固定・ズームに追随しない）", k: "depArrowLen", n: "矢印の三角形の長さ", u: "px", step: 1, d: 10,
    rng: function (S) { return { lo: S.depWidth * 2, hi: 40,
      why: "線より太くならない長さ" }; } },
  { g: "依存線（固定・ズームに追随しない）", k: "depRunOfArrow", n: "入口の走り ÷ 三角形", u: "x", step: 0.1, d: 2,
    rng: function () { return { lo: 1 + EPS, hi: 6,
      why: "1 以下だと三角形が入口の走りを食い尽くし、同時に出口の走りが 0 以下になる" }; } },

  /* ---- progress marker ----------------------------------------------- */
  { g: "進捗マーカー", k: "markTextOfFont", n: "中の数字 ÷ フォント", u: "", step: 0.05, d: 0.75,
    rng: function () { return { lo: 0.3, hi: 1.5 }; } },
  { g: "進捗マーカー", k: "markOfText", n: "マーカー径 ÷ 中の数字", u: "x", step: 0.1, d: 2.0,
    rng: function () { return { lo: 1.6, hi: 4, why: "3 桁が円に収まる比" }; } },
  { g: "進捗マーカー", k: "markMin", n: "マーカー径の下限", u: "px", step: 1, d: 16,
    rng: function (S) { return { lo: S.fontMin, hi: 80 }; } },
  { g: "進捗マーカー", k: "markGap", n: "実績の右端からの隙間", u: "px", step: 1, d: 4,
    rng: function () { return { lo: 4, hi: 4,
      why: "確定仕様で 4px 固定。端点の掴み代と重ならない最小距離であり、それ以上離さない（07 2-4）" }; } },
  { g: "進捗マーカー", k: "markStroke", n: "円の線の太さ", u: "px", step: 0.1, d: 1.3,
    rng: function () { return { lo: 0.5, hi: 4 }; } },
  { g: "進捗マーカー", k: "markTextBaseline", n: "数字のベースライン補正", u: "", step: 0.02, d: 0.36,
    rng: function () { return { lo: 0, hi: 0.8 }; } },
  { g: "進捗マーカー", k: "resumeScaleInvalid", n: "再開日未定のときの縮小率", u: "x", step: 0.05, d: 0.7,
    rng: function () { return { lo: 0.3, hi: 1, why: "未定は小さく薄く" }; } },
  { g: "進捗マーカー", k: "resumeArmOfMark", n: "Resume の腕の長さ ÷ マーカー", u: "", step: 0.02, d: 0.62,
    rng: function (S) { return { lo: 0.2, hi: 1 - S.resumeHeadOfMark, why: "矢じりぶんを残す" }; } },
  { g: "進捗マーカー", k: "resumeHeadOfMark", n: "Resume の矢じり ÷ マーカー", u: "", step: 0.02, d: 0.22,
    rng: function () { return { lo: 0.05, hi: 0.5 }; } },
  { g: "進捗マーカー", k: "resumeDashOn", n: "Resume へ繋ぐ破線の実部", u: "px", step: 1, d: 3,
    rng: function () { return { lo: 1, hi: 12 }; } },
  { g: "進捗マーカー", k: "resumeDashOff", n: "Resume へ繋ぐ破線の空部", u: "px", step: 1, d: 2,
    rng: function () { return { lo: 1, hi: 12 }; } },

  /* ---- labels --------------------------------------------------------- */
  { g: "ラベル", k: "labelCoef", n: "幅の概算係数", u: "", step: 0.05, d: 0.5,
    rng: function () { return { lo: 0.3, hi: 1, why: "全角 1 文字 = フォント × 2 × 係数" }; } },
  { g: "ラベル", k: "labelPad", n: "形状の内側の余白", u: "px", step: 1, d: 6,
    rng: function () { return { lo: 0, hi: 30 }; } },
  { g: "ラベル", k: "labelGap", n: "形状の外へ出すときの隙間", u: "px", step: 1, d: 8,
    rng: function () { return { lo: 0, hi: 30 }; } },
  { g: "ラベル", k: "labelBaseline", n: "ベースライン補正", u: "", step: 0.02, d: 0.35,
    rng: function () { return { lo: 0, hi: 0.8 }; } },
  { g: "ラベル", k: "labelHaloOfFont", n: "縁取りの太さ ÷ フォント", u: "", step: 0.02, d: 0,
    rng: function () { return { lo: 0, hi: 0.3,
      why: "0 = 縁取りなし。バーの上の文字を読ませる手段（採否は性能 PoC で決める）" }; } },
  { g: "ラベル", k: "truncUnits", n: "打ち切り幅（半角換算）", u: "", step: 2, d: 24,
    rng: function () { return { lo: 4, hi: 120, why: "全角 12 文字 = 半角 24" }; } },
  { g: "ラベル", k: "rowLabelW", n: "行名の欄の幅", u: "px", step: 5, d: 170,
    rng: function () { return { lo: 40, hi: 500 }; } },
  { g: "ラベル", k: "rowLabelFont", n: "行名の文字", u: "px", step: 1, d: 13,
    rng: function (S) { return { lo: S.fontMin, hi: 40, why: "和文の可読下限を割らない" }; } },
  { g: "ラベル", k: "rowIndent", n: "行名の 1 段のインデント", u: "px", step: 1, d: 12,
    rng: function () { return { lo: 0, hi: 60 }; } },

  /* ---- shape detail ---------------------------------------------------- */
  { g: "形状の細部", k: "planStroke", n: "予定の輪郭線", u: "px", step: 0.1, d: 1,
    rng: function () { return { lo: 0, hi: 4 }; } },
  { g: "形状の細部", k: "thinStrokeOfPlan", n: "細線の太さ ÷ その形状の予定の縦幅", u: "", step: 0.02, d: 0.20,
    rng: function () { return { lo: 0.05, hi: 0.6 }; } },
  { g: "形状の細部", k: "thinStrokeMin", n: "細線の太さの下限", u: "px", step: 0.1, d: 1.2,
    rng: function (S) { return { lo: 0.5, hi: S.thinStrokeMax, why: "上限を超えない" }; } },
  { g: "形状の細部", k: "thinStrokeMax", n: "細線の太さの上限", u: "px", step: 0.5, d: 4,
    rng: function (S) { return { lo: S.thinStrokeMin, hi: 20, why: "下限を下回らない" }; } },
  { g: "形状の細部", k: "chevronNotchOfH", n: "矢羽根の切り欠き ÷ 高さ", u: "", step: 0.05, d: 0.45,
    rng: function () { return { lo: 0.05, hi: 1 }; } },
  { g: "形状の細部", k: "chevronNotchOfW", n: "矢羽根の切り欠き ÷ 幅", u: "", step: 0.05, d: 0.35,
    rng: function () { return { lo: 0.05, hi: 0.5, why: "0.5 を超えると先端が反転する" }; } },
  { g: "形状の細部", k: "arrowHeadOfStroke", n: "矢印の矢じり ÷ 線の太さ", u: "x", step: 0.2, d: 3.2,
    rng: function () { return { lo: 1.5, hi: 8 }; } },
  { g: "形状の細部", k: "arrowHeadOfSpan", n: "矢印の矢じり ÷ 全長（上限）", u: "", step: 0.05, d: 0.4,
    rng: function () { return { lo: 0.1, hi: 1 }; } },
  { g: "形状の細部", k: "spanDotOfStroke", n: "端点の点の半径 ÷ 線の太さ", u: "x", step: 0.05, d: 1.15,
    rng: function () { return { lo: 0.5, hi: 4 }; } },
  { g: "形状の細部", k: "starInnerOfOuter", n: "☆ の内接半径 ÷ 外接半径", u: "", step: 0.05, d: 0.45,
    rng: function () { return { lo: 0.2, hi: 0.8 }; } },
  { g: "形状の細部", k: "minShapeW", n: "ゼロ期間でも残す最小幅", u: "px", step: 1, d: 2,
    rng: function () { return { lo: 1, hi: 20 }; } },

  /* ---- progress line ---------------------------------------------------- */
  { g: "進捗線（イナズマ線）", k: "progWidth", n: "太さ", u: "px", step: 0.5, d: 2,
    rng: function () { return { lo: 0.5, hi: 8 }; } },
  { g: "進捗線（イナズマ線）", k: "progOverhang", n: "上下へのはみ出し", u: "px", step: 1, d: 6,
    rng: function () { return { lo: 0, hi: 40 }; } },
  { g: "進捗線（イナズマ線）", k: "todayDay", n: "基準日（第 n 日）", u: "日", step: 1, d: 132,
    rng: function () { return { lo: 0, hi: 300 }; } },

  /* ---- zoom -------------------------------------------------------------- */
  { g: "ズーム", k: "zoomStep", n: "1 ノッチの倍率", u: "x", step: 0.01, d: 1.1,
    rng: function () { return { lo: 1.01, hi: 2 }; } },
  { g: "ズーム", k: "zoomMin", n: "下限", u: "x", step: 0.01, d: 0.02,
    rng: function (S) { return { lo: 0.001, hi: S.zoomMax, why: "上限を超えない" }; } },
  { g: "ズーム", k: "zoomMax", n: "上限", u: "x", step: 1, d: 64,
    rng: function (S) { return { lo: S.zoomMin, hi: 512, why: "下限を下回らない" }; } },
  { g: "ズーム", k: "canvasPad", n: "キャンバスの余白", u: "px", step: 1, d: 10,
    rng: function () { return { lo: 0, hi: 60 }; } },
  { g: "ズーム", k: "svgPad", n: "SVG の縁の余白", u: "px", step: 1, d: 10,
    rng: function () { return { lo: 0, hi: 60 }; } }
];

/* ---- flat store, built from the defaults ------------------------------- */
var S = {};
SPEC.forEach(function (sp) { S[sp.k] = sp.d; });

function resetAll() { SPEC.forEach(function (sp) { S[sp.k] = sp.d; }); }
function shapeRatio(kind) { return S["shapeH." + kind]; }

/** Ranges depend on other settings, so evaluate the whole set at once. */
function ranges() {
  var out = {};
  SPEC.forEach(function (sp) { out[sp.k] = sp.rng(S); });
  return out;
}

function violations() {
  var r = ranges(), bad = [];
  SPEC.forEach(function (sp) {
    var v = S[sp.k], q = r[sp.k];
    if (v < q.lo - 1e-9 || v > q.hi + 1e-9) bad.push({ sp: sp, v: v, q: q });
  });
  return bad;
}

/* ---- derived geometry --------------------------------------------------- */

function hasThickness(kind) { return kind === "bar" || kind === "chevron"; }

/**
 * Dependency-line runs. ONE ratio drives both so they cannot drift apart.
 * The entry needs the arrowhead plus a visible straight piece; the exit has
 * no arrowhead, so it is shorter by exactly one arrowhead.
 *   handover-ui-detail-spec-ja.md 4-9
 */
function depRunEntry() { return S.depArrowLen * S.depRunOfArrow; }
function depRunExit() { return S.depArrowLen * (S.depRunOfArrow - 1); }

/**
 * The plan height at which the actual bar exactly reaches its 16px floor.
 * Shrinking past this point is what triggers dropping an outline level
 * instead of drawing smaller (07 2-4-1), so nothing below it is ever drawn.
 */
function planFloor() { return S.actualMin / S.actualOfPlan; }

/** True when this vertical zoom has hit the floor and a level must drop. */
function atFloor(zoomY) { return S.basePlanH * zoomY < planFloor(); }

/** Every vertical dimension of one shape kind, derived from S alone. */
function shapeMetrics(kind, zoomY) {
  var ratio = shapeRatio(kind);
  // One clamp, on the plan height. The actual then follows by ratio alone and
  // is guaranteed to clear its own 16px floor, so it needs no second clamp --
  // two independent clamps are what let the ratio drift away from the spec.
  var planH = Math.max(planFloor(), S.basePlanH * zoomY) * ratio;
  var actualH = planH * S.actualOfPlan;
  var thin = !hasThickness(kind) && kind !== "milestone";
  var rawFont = actualH * S.fontOfActual * (thin ? S.thinFontScale : 1);
  var fontSize = Math.max(S.fontMin, rawFont);
  var markText = Math.max(S.fontMin, fontSize * S.markTextOfFont);
  return {
    kind: kind,
    planH: planH,
    actualH: actualH,
    fontSize: fontSize,
    fontFloored: rawFont < S.fontMin,
    markTextSize: markText,
    markSize: Math.max(S.markMin, markText * S.markOfText),
    reserved: hasThickness(kind) ? planH : planH + S.actualGap + actualH,
    insideActualTop: (planH - actualH) / 2,
    belowActualTop: planH + S.actualGap,
    thinStroke: Math.max(S.thinStrokeMin, Math.min(S.thinStrokeMax, planH * S.thinStrokeOfPlan)),
    glyphSize: planH
  };
}

/* ---- text metrics. Estimated, never measured, never cached. ------------- */

function isFullWidth(ch) {
  var c = ch.charCodeAt(0);
  return (c >= 0x1100 && c <= 0x115F) || (c >= 0x2E80 && c <= 0xA4CF) ||
         (c >= 0xAC00 && c <= 0xD7A3) || (c >= 0xF900 && c <= 0xFAFF) ||
         (c >= 0xFE30 && c <= 0xFE6F) || (c >= 0xFF00 && c <= 0xFF60) ||
         (c >= 0xFFE0 && c <= 0xFFE6);
}

/** Width in half-width units: full-width counts 2, half-width counts 1. */
function widthUnits(s) {
  var n = 0, i;
  for (i = 0; i < s.length; i++) n += isFullWidth(s.charAt(i)) ? 2 : 1;
  return n;
}

function labelWidth(s, fontSize) { return widthUnits(s) * fontSize * S.labelCoef; }

/** Cut to truncUnits half-width units, appending a half-width ellipsis. */
function truncateUnits(s, units) {
  if (widthUnits(s) <= units) return s;
  var out = "", n = 0, i, w;
  for (i = 0; i < s.length; i++) {
    w = isFullWidth(s.charAt(i)) ? 2 : 1;
    if (n + w > units - 3) break;
    out += s.charAt(i);
    n += w;
  }
  return out + "...";
}

/* ---- theme -------------------------------------------------------------- */

/** Force a theme, or pass null to fall back to the OS preference. */
function setTheme(name) {
  if (name) document.documentElement.setAttribute("data-theme", name);
  else document.documentElement.removeAttribute("data-theme");
}

function currentTheme() {
  var forced = document.documentElement.getAttribute("data-theme");
  if (forced) return forced;
  return global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark" : "light";
}

global.POC_UI = {
  ENV: ENV,
  SPEC: SPEC,
  S: S,
  resetAll: resetAll,
  ranges: ranges,
  violations: violations,
  shapeRatio: shapeRatio,
  hasThickness: hasThickness,
  planFloor: planFloor,
  atFloor: atFloor,
  shapeMetrics: shapeMetrics,
  depRunEntry: depRunEntry,
  depRunExit: depRunExit,
  isFullWidth: isFullWidth,
  widthUnits: widthUnits,
  labelWidth: labelWidth,
  truncateUnits: truncateUnits,
  setTheme: setTheme,
  currentTheme: currentTheme
};

})(window);
