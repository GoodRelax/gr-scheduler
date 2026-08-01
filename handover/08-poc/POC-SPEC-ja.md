---
type: Frozen Record
title: "gr-scheduler PoC 共通仕様"
description: 案比較 PoC の仕様。製品仕様ではない。食い違ったら handover 側が正。
tags: [poc]
phase: proof-of-concept
status: deprecated
---
# gr-scheduler PoC 共通仕様（2026-07-30）

- 目的: **レイアウト（マルチバー行の依存線配線）** と **ズーム（LOD）** の実現性を、
  複数案を同じ土俵で比べて確かめる。
- 出力: `dist/poc/` に **自己完結の単一 `.html`**（外部ファイル参照ゼロ・オフラインで開ける）。
- 位置づけ: **使い捨ての実験**。`handover/` の確定内容を変えるものではない。
  PoC で分かった事実だけを後で `handover/` に書き戻す。

> ⚠️ **本書は案比較 PoC（レイアウト 3 案 / ズーム 2 案）の仕様であり、製品仕様ではない。**（2026-08-01 追記）
>
> 書かれた時点（2026-07-30）以降に `handover/` 側で変わった規則がある。本書は
> **凍結した計測記録**なので追随させない。食い違ったら **`handover/` 側が正**である。
>
> | 本書の記述 | 現在の正 |
> |---|---|
> | 進捗マーカーは**固定ピクセルサイズ**（§3-5） | 文字サイズから導く（`../07-plan-actual/handover-plan-actual-decisions-ja.md` §2-4-1） |
> | `(!)` は**期限超過**のとき（§3-5 / §8） | `(!)` は**遅れ**。判定は 3 条件（同 §2-4） |
> | 幅がない形状種（`arrow` / `endpointSpan` / `milestone`）は実績を**下にずらす**（§1） | **マイルストーンだけ実績日の位置へ横にずらす**。上下の中心は予定と同じで、占有する縦幅は ◇ 1 つぶん（同 §2-2） |
> | 横ズーム `Ctrl` / 縦ズーム `Shift` / スライダー（§6） | `Ctrl`＝両軸 / `Shift`＝横 / `Alt`＝縦。スライダーは置かない（`../03-ui-naming/handover-ui-detail-spec-ja.md` §5-2） |
>
> **統合 PoC（`poc-integrated.html`）は本書ではなく `handover/` の確定内容に従う。**

---

## 0. 全 PoC 共通の絶対条件

1. **単一 `.html`**。外部 CSS / JS / フォント / 画像を参照しない。`<script>` と `<style>` はインライン。
2. **SVG で描く**（Canvas ではない。確定した描画方式に合わせる）。
3. **コードとコメントは英語 ASCII**。画面に出す文字列だけ日本語でよい（読むのは日本語話者）。
4. **データ生成は下記の共通コードを一字一句そのまま埋め込む**。案ごとに変えてよいのは
   **レイアウト算出・配線・LOD・描画**だけ。入力が違うと比較にならない。
5. **計測パネルを右上に固定表示**する（§4 の項目）。
6. **確定した命名を使う**（`shapeKind` / `percentComplete` / `stackOrder` / `TaskGroup` / `actualDuration`）。
   旧名（`iconShapeKind` / `progressRatio` / `importance` / `progressStatus` / `laneIndex` / `section`）は使わない。
7. 既存 `src/` のコードを見ない・写さない。

---

## 1. データモデル（PoC 用の最小形）

```
Task        { uid, name, groupId, startDay, finishDay, milestone, shapeKind,
              wbsParentUid, wbsDepth,
              actualStartDay, actualDurationDays, actualFinishDay, percentComplete,
              stackOrder }
TaskGroup   { id, title, memberUids }
Link        { fromUid, toUid, linkType }        linkType: 'FS' | 'SS' | 'FF' | 'SF'
```

- 日付は**プロジェクト開始からの通日**（整数 `day`）で持つ。稼働日計算は PoC では行わない。
- `shapeKind`: `'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone'`。
- **上下に幅がある形状種**（`rectangle` / `chevron`）→ 実績を**内側に重ねる**。
- **幅がない形状種**（`arrow` / `endpointSpan` / `milestone`）→ 実績を**下にずらす**。
  ずらす場合も**実績ぶんの高さを常に確保する**（表示を切り替えても行の高さが動かない）。

### 時間↔座標

```
x(day) = (day - viewOriginDay) * pxPerDay + padLeft - scrollX
```

`pxPerDay` が横ズーム。縦ズームは行の高さの倍率で独立に持つ（**異方性ズーム**）。

---

## 2. 共通コード（**そのまま埋め込む**）

```js
// ---------------------------------------------------------------------------
// Shared PoC data. Copy verbatim. Do not modify.
// ---------------------------------------------------------------------------

/** Deterministic LCG so every PoC renders byte-identical input. */
function makeRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

var SHAPE_KINDS = ['rectangle', 'chevron', 'arrow', 'endpointSpan'];

/**
 * Layout stress cases. Each case becomes ONE TaskGroup (= one row).
 * t: [name, startDay, finishDay, shapeKind, milestone]
 * d: [fromIndex, toIndex, linkType]  (indices are local to the case)
 */
var LAYOUT_CASES = [
  { title: '1. 直列 FS 3 本',
    t: [['A', 0, 20, 'rectangle', false], ['B', 24, 44, 'rectangle', false], ['C', 48, 68, 'rectangle', false]],
    d: [[0, 1, 'FS'], [1, 2, 'FS']] },

  { title: '2. 逆行依存（右から左へ）',
    t: [['A', 60, 80, 'rectangle', false], ['B', 10, 30, 'rectangle', false], ['C', 100, 120, 'rectangle', false]],
    d: [[0, 1, 'FS'], [2, 0, 'FS']] },

  { title: '3. 同一行内で交差する 2 本',
    t: [['A', 0, 24, 'rectangle', false], ['B', 30, 54, 'rectangle', false],
        ['C', 60, 84, 'rectangle', false], ['D', 90, 114, 'rectangle', false]],
    d: [[0, 2, 'FS'], [1, 3, 'FS']] },

  { title: '4. 1 対 4 の扇形（出）',
    t: [['SRC', 0, 20, 'chevron', false], ['A', 30, 46, 'rectangle', false], ['B', 50, 66, 'rectangle', false],
        ['C', 70, 86, 'rectangle', false], ['D', 90, 106, 'rectangle', false]],
    d: [[0, 1, 'FS'], [0, 2, 'FS'], [0, 3, 'FS'], [0, 4, 'FS']] },

  { title: '5. 4 対 1 の扇形（入）',
    t: [['A', 0, 16, 'rectangle', false], ['B', 20, 36, 'rectangle', false], ['C', 40, 56, 'rectangle', false],
        ['D', 60, 76, 'rectangle', false], ['DST', 90, 110, 'chevron', false]],
    d: [[0, 4, 'FS'], [1, 4, 'FS'], [2, 4, 'FS'], [3, 4, 'FS']] },

  { title: '6. 完全結合（4 タスク 6 本）',
    t: [['A', 0, 20, 'rectangle', false], ['B', 26, 46, 'rectangle', false],
        ['C', 52, 72, 'rectangle', false], ['D', 78, 98, 'rectangle', false]],
    d: [[0, 1, 'FS'], [0, 2, 'FS'], [0, 3, 'FS'], [1, 2, 'FS'], [1, 3, 'FS'], [2, 3, 'FS']] },

  { title: '7. 3 段に積まれた行を跨ぐ依存',
    t: [['A', 0, 60, 'rectangle', false], ['B', 10, 70, 'rectangle', false], ['C', 20, 80, 'rectangle', false],
        ['D', 90, 110, 'rectangle', false]],
    d: [[0, 3, 'FS'], [1, 3, 'FS'], [2, 3, 'FS'], [0, 1, 'SS'], [1, 2, 'SS']] },

  { title: '8. マイルストーンへ集約',
    t: [['A', 0, 24, 'rectangle', false], ['B', 12, 40, 'rectangle', false], ['C', 28, 56, 'rectangle', false],
        ['M', 62, 62, 'milestone', true]],
    d: [[0, 3, 'FS'], [1, 3, 'FS'], [2, 3, 'FS']] },

  { title: '9. 同一開始日の 5 タスク',
    t: [['A', 20, 44, 'rectangle', false], ['B', 20, 40, 'rectangle', false], ['C', 20, 36, 'rectangle', false],
        ['D', 20, 32, 'rectangle', false], ['E', 20, 28, 'rectangle', false]],
    d: [[4, 0, 'SS'], [3, 0, 'SS'], [2, 0, 'SS'], [1, 0, 'SS']] },

  { title: '10. 隣接（finish == start）',
    t: [['A', 0, 30, 'rectangle', false], ['B', 30, 60, 'rectangle', false],
        ['C', 60, 90, 'rectangle', false], ['D', 90, 120, 'rectangle', false]],
    d: [[0, 1, 'FS'], [1, 2, 'FS'], [2, 3, 'FS']] },

  { title: '11. 長い名称がはみ出す',
    t: [['要件定義と外部仕様の確定', 0, 12, 'rectangle', false],
        ['詳細設計レビューの反映', 18, 30, 'rectangle', false],
        ['結合検証と是正', 36, 48, 'rectangle', false]],
    d: [[0, 1, 'FS'], [1, 2, 'FS']] },

  { title: '12. 幅がない形状種の混在',
    t: [['A', 0, 26, 'arrow', false], ['B', 32, 58, 'endpointSpan', false],
        ['C', 64, 90, 'chevron', false], ['M', 96, 96, 'milestone', true]],
    d: [[0, 1, 'FS'], [1, 2, 'FS'], [2, 3, 'FS'], [0, 2, 'FS']] },

  { title: '13. 予実＋進捗マーカー付きで配線',
    t: [['A', 0, 30, 'rectangle', false], ['B', 36, 66, 'rectangle', false],
        ['C', 72, 102, 'chevron', false], ['D', 40, 100, 'rectangle', false]],
    d: [[0, 1, 'FS'], [1, 2, 'FS'], [0, 3, 'SS'], [3, 2, 'FF']] },

  { title: '14. 密集（12 タスク・交差多数）',
    t: [['a', 0, 10, 'rectangle', false], ['b', 8, 20, 'rectangle', false], ['c', 16, 28, 'rectangle', false],
        ['d', 24, 36, 'rectangle', false], ['e', 32, 44, 'rectangle', false], ['f', 40, 52, 'rectangle', false],
        ['g', 48, 60, 'rectangle', false], ['h', 56, 68, 'rectangle', false], ['i', 64, 76, 'rectangle', false],
        ['j', 72, 84, 'rectangle', false], ['k', 80, 92, 'rectangle', false], ['l', 88, 100, 'rectangle', false]],
    d: [[0, 3, 'FS'], [1, 5, 'FS'], [2, 7, 'FS'], [3, 9, 'FS'], [4, 11, 'FS'],
        [0, 11, 'FS'], [6, 8, 'FS'], [8, 10, 'FS'], [5, 9, 'FS'], [7, 11, 'FS']] },

  { title: '15. 行を跨ぐ依存の受け口',
    t: [['X', 0, 24, 'rectangle', false], ['Y', 40, 64, 'rectangle', false], ['Z', 80, 104, 'rectangle', false]],
    d: [[0, 1, 'FS'], [1, 2, 'FS']] }
];

/** Cross-row links, given as [caseIndex, taskIndex] pairs. Exercise vertical routing. */
var CROSS_ROW_LINKS = [
  [[0, 2], [2, 0], 'FS'], [[3, 4], [5, 0], 'FS'], [[7, 3], [9, 0], 'FS'],
  [[5, 3], [13, 0], 'FS'], [[9, 3], [14, 0], 'FS'], [[11, 3], [14, 1], 'FS'],
  [[13, 2], [14, 2], 'FS'], [[1, 2], [6, 0], 'FS'], [[6, 3], [12, 0], 'FS']
];

/** Build the layout-stress dataset: one TaskGroup per case. */
function buildLayoutDataset() {
  var tasks = [], groups = [], links = [], uid = 1, idx = [];
  for (var c = 0; c < LAYOUT_CASES.length; c++) {
    var kase = LAYOUT_CASES[c], memberUids = [], local = [];
    for (var i = 0; i < kase.t.length; i++) {
      var row = kase.t[i];
      var dur = row[2] - row[1];
      var actualDur = Math.max(0, Math.round(dur * (0.3 + 0.5 * ((c + i) % 5) / 4)));
      tasks.push({
        uid: uid, name: row[0], groupId: 'G' + c,
        startDay: row[1], finishDay: row[2],
        milestone: row[4], shapeKind: row[3],
        wbsParentUid: null, wbsDepth: 1 + (i % 3),
        actualStartDay: row[1], actualDurationDays: actualDur,
        actualFinishDay: null,
        percentComplete: dur === 0 ? 0 : Math.min(100, Math.round((actualDur / dur) * 100)),
        stackOrder: null
      });
      memberUids.push(uid); local.push(uid); uid++;
    }
    idx.push(local);
    groups.push({ id: 'G' + c, title: kase.title, memberUids: memberUids });
    for (var k = 0; k < kase.d.length; k++) {
      links.push({ fromUid: local[kase.d[k][0]], toUid: local[kase.d[k][1]], linkType: kase.d[k][2] });
    }
  }
  for (var x = 0; x < CROSS_ROW_LINKS.length; x++) {
    var a = CROSS_ROW_LINKS[x][0], b = CROSS_ROW_LINKS[x][1];
    links.push({ fromUid: idx[a[0]][a[1]], toUid: idx[b[0]][b[1]], linkType: CROSS_ROW_LINKS[x][2] });
  }
  return { tasks: tasks, groups: groups, links: links };
}

/**
 * Build the zoom dataset: a large project with a 5-level WBS.
 * Level fan-out 5 / 4 / 3 / 2 / 2 -> 5 + 20 + 60 + 120 + 240 = 445 tasks.
 * Rows (TaskGroup) are the level-2 nodes, so 20 rows carry every leaf.
 */
function buildZoomDataset() {
  var rng = makeRng(20260730);
  var tasks = [], groups = [], links = [], uid = 1;
  var HORIZON = 720;                       // project spans 720 days
  var FANOUT = [5, 4, 3, 2, 2];
  var byDepth = [[], [], [], [], [], []];

  function make(depth, parentUid, s, f, label) {
    var t = {
      uid: uid++, name: label, groupId: null,
      startDay: s, finishDay: f, milestone: false, shapeKind: 'rectangle',
      wbsParentUid: parentUid, wbsDepth: depth,
      actualStartDay: s, actualDurationDays: Math.round((f - s) * (0.2 + rng() * 0.7)),
      actualFinishDay: null, percentComplete: 0, stackOrder: null
    };
    var dur = f - s;
    t.percentComplete = dur === 0 ? 0 : Math.min(100, Math.round(t.actualDurationDays / dur * 100));
    tasks.push(t); byDepth[depth].push(t);
    return t;
  }

  function split(node, depth) {
    if (depth > 5) return;
    var n = FANOUT[depth - 1];
    var span = node.finishDay - node.startDay;
    var seg = span / n;
    for (var i = 0; i < n; i++) {
      var s = Math.round(node.startDay + seg * i + seg * 0.05 * rng());
      var f = Math.round(node.startDay + seg * (i + 1) - seg * 0.10 * rng());
      if (f <= s) f = s + 1;
      var child = make(depth, node.uid, s, f, 'L' + depth + '-' + uid);
      split(child, depth + 1);
    }
  }

  for (var p = 0; p < FANOUT[0]; p++) {
    var s0 = Math.round(HORIZON / FANOUT[0] * p);
    var f0 = Math.round(HORIZON / FANOUT[0] * (p + 1)) - 4;
    var root = make(1, null, s0, f0, 'L1-' + (p + 1));
    split(root, 2);
  }

  // Rows: every depth-2 node becomes a TaskGroup holding its whole subtree.
  var byUid = {};
  for (var q = 0; q < tasks.length; q++) byUid[tasks[q].uid] = tasks[q];
  function rootGroupOf(t) {
    var cur = t;
    while (cur.wbsDepth > 2 && cur.wbsParentUid != null) cur = byUid[cur.wbsParentUid];
    return cur.wbsDepth === 2 ? cur.uid : null;
  }
  var groupMap = {};
  for (var r = 0; r < tasks.length; r++) {
    var g = rootGroupOf(tasks[r]);
    if (g == null) { tasks[r].groupId = 'ROOT'; continue; }
    tasks[r].groupId = 'G' + g;
    if (!groupMap['G' + g]) groupMap['G' + g] = { id: 'G' + g, title: byUid[g].name, memberUids: [] };
    groupMap['G' + g].memberUids.push(tasks[r].uid);
  }
  var rootGroup = { id: 'ROOT', title: 'L1', memberUids: [] };
  for (var r2 = 0; r2 < tasks.length; r2++) {
    if (tasks[r2].groupId === 'ROOT') rootGroup.memberUids.push(tasks[r2].uid);
  }
  groups.push(rootGroup);
  for (var key in groupMap) if (groupMap.hasOwnProperty(key)) groups.push(groupMap[key]);

  // Links: chain siblings at every depth (FS), plus a few long-range ones.
  for (var d = 1; d <= 5; d++) {
    var lvl = byDepth[d];
    for (var i2 = 1; i2 < lvl.length; i2++) {
      if (lvl[i2].wbsParentUid === lvl[i2 - 1].wbsParentUid) {
        links.push({ fromUid: lvl[i2 - 1].uid, toUid: lvl[i2].uid, linkType: 'FS' });
      }
    }
  }
  for (var j = 0; j < 40; j++) {
    var a2 = tasks[Math.floor(rng() * tasks.length)], b2 = tasks[Math.floor(rng() * tasks.length)];
    if (a2.uid !== b2.uid && a2.finishDay <= b2.startDay) {
      links.push({ fromUid: a2.uid, toUid: b2.uid, linkType: 'FS' });
    }
  }
  return { tasks: tasks, groups: groups, links: links };
}
```

---

## 3. 確定済みの規則（PoC でも守る）

### 3-1. 積み順（`stackOrder`）の割当

```
1. 占有区間を求める。左端〜右端に、はみ出す名称ラベルの幅を加算する
2. 並べる順序: milestone 優先 → startDay 昇順 → finishDay 降順 → uid 昇順（決定的であること）
3. その段に既に置かれた Task と占有区間が重ならない、最も浅い段へ置く（貪欲）
4. マイルストーンは最上段
5. 機能上の上限は設けない。安全弁だけ持ち、到達したら画面に知らせる
   ※「最終段を再利用する」（重なりを許して押し込む）は廃止。絶対にやらない
6. 行の帯高は段数で決まる。行高固定を前提にしてはならない
```

### 3-2. レイアウトの計算順序（**循環を切る**）

```
1. 依存関係から「最小間隔の制約」を作る    経路は引かない
2. ラベルの占有幅を概算する
3. 積み順の割当                            1 と 2 を入力にする → 位置が確定
4. 依存線の経路を引く                      位置が確定済みなので 1 回で決まる
```

**依存線とラベルの干渉は計算しない**（確定）。

### 3-3. ラベル

```
1. タスクの幅に収まる      → 中に書く
2. 収まらない              → 全角12 / 半角24 で打ち切る
3. 打ち切っても収まらない  → 右に出す
4. 右に出すと干渉する      → タスクを上下にずらす（＝段を増やす）
```

- 幅は**概算**する: `(全角数 * 2 + 半角数 * 1) * fontSize / 2`。**実測もキャッシュもしない**。
- フォントサイズはタスク高さの 80%、**下限 10px でクランプ**。

### 3-4. 依存線

- **9 点アンカー**から引き出す（四隅・辺の中点・中心）。
- **折れ点は 0〜3**。
- 他のタスク矩形との**重なりを最小化**する。
- 前後が接している（`finish == start`）ときは**幾何的な最小間隔**が要る。これは §3-2 の 1 で作る。

### 3-5. 予実と進捗マーカー

- 実績バー: 左端 = `actualStartDay`、右端 = `actualStartDay + actualDurationDays`。
- 予定バーの高さ > 実績バーの高さ。上下に露出した帯で予定を掴む。
- Progress Marker は実績バー右端から**固定 4px**、**固定ピクセルサイズ**、**占有幅に含める**。
  `(✓)` 完了 / `( \ )` 中断（斜線は左上から右下）/ `(!)` 期限超過 / `( )` 未完了は選択時のみ。
  **SVG で描く**（フォント字形に依存しない）。

### 3-6. LOD（ズーム PoC）

- 判定は **WBS の階層の深さ**（`wbsDepth`）。`importance` は使わない（廃止）。
- **判定でだけ深さを 5 で頭打ち**にする。保持する値はクランプしない。
- 時間軸の粒度は 年 → 年月 → 月日曜 と連動する。
- **最重要**: **ズームアウトしたとき L1 の情報が 1 画面に収まること。**

---

## 4. 画面に必ず出す計測パネル（右上固定）

| 項目 | 意味 |
|---|---|
| `tasks` / `links` / `rows` | 入力の規模 |
| `drawn` | 実際に描いた Task 数（LOD 後） |
| `svg nodes` | SVG 要素数 |
| `layout ms` | 積み順割当＋ラベル計算の時間 |
| `route ms` | 依存線の経路計算の時間 |
| `paint ms` | DOM 反映の時間 |
| `fps` | パン / ズーム連続操作中の実測 |
| **`overlap`** | **同一行内でタスク矩形どうしが重なった数。0 でなければ不合格** |
| `line×icon` | 依存線がタスク矩形を横切った数（少ないほどよい） |
| `line×line` | 依存線どうしの交差数（少ないほどよい） |
| `bends` | 折れ点の総数 |
| **`density`** | **タスク占有面積 ÷ 帯の総面積。空けすぎ / 詰めすぎの指標** |
| `maxStack` | 最大段数 |

`overlap` が 0 でない案は**その時点で不合格**。

---

## 5. 見た目の基準（朝の目視評価）

- **無駄に空けない。詰めすぎて見にくくしない。**
  - 段の間隔は「依存線が 1 本通る幅」を基準にする。通らないなら足りない。2 本ぶん空けたら空けすぎ。
  - 行の上下パディングは段の高さの 25% 以内に収める。
- 依存線が**タスクの上を横切らない**こと（やむを得ないときだけ・数を計測パネルに出す）。
- 交差する線が**どちらが手前か分かる**こと（跨ぎ記号 / 明度差のどちらでもよい。案として比べる）。
- 色に頼らない（WCAG 1.4.1）。形と位置で読めること。

---

## 6. 操作（両 PoC 共通）

> ⚠️ **この表は案比較 PoC（レイアウト 3 案 / ズーム 2 案）の割当であり、製品の割当ではない。**
> 製品の正は `../03-ui-naming/handover-ui-detail-spec-ja.md` §5-2 で、
> **`Ctrl`＝両軸 / `Shift`＝横 / `Alt`＝縦**、**スライダーは置かない**と決まっている。
> 下表は凍結した計測記録なので書き換えない。**統合 PoC（`poc-integrated.html`）は §5-2 に従う。**

| 操作 | 割当 |
|---|---|
| 横ズーム | `Ctrl` + ホイール / スライダー |
| 縦ズーム | `Shift` + ホイール / スライダー |
| パン | ドラッグ / ホイール |
| Fit | `F` キー / ボタン |

**異方性ズーム**（縦横独立）であること。

---

## 7. ファイル名

```
dist/poc/poc-layout-<案の記号>-<短い英名>.html
dist/poc/poc-zoom-<案の記号>-<短い英名>.html
dist/poc/index.html          全案の一覧と比較表（最後に作る）
dist/poc/POC-RESULTS-ja.md   計測結果と評価（最後に作る）
```

---

## 8. 共通データの既知の弱点（2026-07-30 追記）

生成器を単体で走らせて確かめた結果、**入力データそのものが Progress Marker の 4 状態を出せない**ことが分かった。

| 事実 | 影響 |
|---|---|
| どのタスクも **実績が予定を超えない**（`actualStart + actualDuration <= finish`） | `percentComplete` が 100 を超える場面が出ない。**100 超の描き分けを PoC で確かめられない** |
| **完了したタスクが無い**（`actualFinish` が入らない） | `(✓)` が出ない |
| **中断したタスクが無い**（`stop` / `resume` が無い） | `( \ )` と Resume アイコンが出ない |
| **基準日を持たない** | `(!)`（期限超過）が出ない |

**結果として、各案は「未完了 `( )`」しか本来は描けない。**
実際、案 C は「`0 < percentComplete < 35` を中断とみなす」という **PoC 限りの代用規則**を入れて描いていた。

> **この弱点は放置してよい。** 4 状態の字形・Resume アイコン・イナズマ線の頂点規則は
> **`poc-integrated.html` の「形状の基準」タブ**で全状態を描いて確かめてある。
> レイアウト案とズーム案が問うているのは**配線と LOD** であって字形ではない。
>
> **次に生成器を触るときは、状態の網羅をデータ側で用意すること。** 代用規則を各案が個別に発明すると、
> 案どうしの比較が成り立たなくなる。
