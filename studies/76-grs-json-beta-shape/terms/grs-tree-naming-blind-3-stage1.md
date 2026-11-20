# 送る人へ（AI には送らない）

- 2 段の質問状です。1 段目はこのファイルの「ここから下を AI へ送る」より下、2 段目は `grs-tree-naming-blind-3-stage2.md` の「ここから下を AI へ送る」より下です。
- 少なくとも 3 つの別の AI（例: Copilot・Gemini・ChatGPT）に、AI ごとに新しい会話で出してください（前の質問状を見た会話は使わない）。リポジトリやウェブの資料は見せません。
- 1 段目を貼って答えを待ち、同じ会話に 2 段目を貼ります。1 段目の答えを直させないでください。2 つの答えを 1 つのファイルにまとめ、オーナーの手元のフォルダーに `answer3-<ai>.md`（例 `answer3-gemini.md`）で保存してください。
- 1 段目に載せた名は、決まっていない物も含めて今の先頭の案です（キー `visibilityRule`、値 `revealed`・`retracted`・`automatic`、深さ `visibleDepth`、出来事の名）。意味の説明は 2 段目にだけあります。

---- ここから下を AI へ送る ----

# 初見の質問状（1 段目）: このデータとボタンを、初めて見てどう読みますか

**答え方: 日本語で、1 つのコードブロック（```markdown で始めて ``` で閉じる）の中に、5 節の型で書いてください。コードブロックの外には何も書かないでください。**

## 1. 頼みたいこと

ある日程表アプリ（ガントチャート）の名を、100 万人に出せる質にしたいと考えています。そのために、名が初見でどう読まれるかを測ります。2 節のデータと 3 節のボタンだけを見て、それぞれの名が何を意味すると思うか、押すと何が起きると思うかを書いてください。

- 名の意味の説明は、わざと書いていません。名と形だけから読んでください。
- 私たちの意図を推し量らないでください。似た製品を調べたり、ほかの資料から当てたりしないでください。欲しいのは初見の読みです。外れても構いません。外れた読みがいちばん役に立ちます。
- この答えの後に、同じ会話で 2 段目（私たちの意図と、審査の問い）を送ります。

## 2. データ（文書のファイル。JSON）

アプリは文書を JSON で保存します。画面の左の欄に「タスクグループ」と呼ぶ帯が木の形で並びます。その帯に関わる所だけを抜き出しました（id は実物では UUID。ほかのキーは省いた）。

```json
{
  "documentSettings": {
    "taskGroupTreeView": { "visibleDepth": 2 }
  },
  "scheduleData": {
    "taskGroups": [
      { "id": "A",  "name": "A",  "parentTaskGroupId": null, "siblingOrder": 1, "visibilityRule": "automatic" },
      { "id": "B",  "name": "B",  "parentTaskGroupId": "A",  "siblingOrder": 1, "visibilityRule": "automatic" },
      { "id": "B1", "name": "B1", "parentTaskGroupId": "B",  "siblingOrder": 1, "visibilityRule": "revealed" },
      { "id": "B2", "name": "B2", "parentTaskGroupId": "B",  "siblingOrder": 2, "visibilityRule": "automatic" },
      { "id": "C",  "name": "C",  "parentTaskGroupId": "A",  "siblingOrder": 2, "visibilityRule": "retracted" },
      { "id": "D",  "name": "D",  "parentTaskGroupId": null, "siblingOrder": 2, "visibilityRule": "automatic" }
    ]
  }
}
```

`visibilityRule` が取る値は `revealed`・`retracted`・`automatic` の 3 つだけです。親子の形は次のとおりです（データの親子であって、画面の絵ではありません）。

```text
A
├─ B
│   ├─ B1
│   └─ B2
└─ C
D
```

## 3. 画面のボタン

帯の名にポインタを乗せると、名の右に 4 つのボタンが 2 × 2 に並びます。帯の欄の見出し（いちばん上の行）には、3 つのボタンが 1 行に並びます。ボタンは記号だけで、ポインタを乗せると札が出ます（英語版と日本語版）。右の列は、押したときにプログラムの中で起きる出来事の名です。

```text
帯の名の右:  ∧  ∧∧          見出し:  ∧∧  ∨  ∨∨
             ∨  ∨∨
```

| # | 置き場 | 記号 | 英語の札 | 日本語の札 | 出来事の名 |
|:---|:---|:---|:---|:---|:---|
| b1 | 帯 | ∨ | Expand One Level | 1 階層だけ展開する | `expandOneLevelPressed` |
| b2 | 帯 | ∨∨ | Expand Below | 配下をすべて展開する | `expandBelowPressed` |
| b3 | 帯 | ∧∧ | Collapse Below | 配下をすべて折りたたむ | `collapseBelowPressed` |
| b4 | 帯 | ∧ | Retract | 親へしまう | `retractPressed` |
| h1 | 見出し | ∨ | Expand One Level | 1 階層だけ展開する | `expandOneLevelPressed` |
| h2 | 見出し | ∨∨ | Expand All | すべて展開する | `expandBelowPressed` |
| h3 | 見出し | ∧∧ | Collapse All | すべて折りたたむ | `collapseBelowPressed` |

## 4. 問い

**問 1. データの名.** `taskGroupTreeView`・`visibleDepth`・`visibilityRule`・`revealed`・`retracted`・`automatic` の 6 つについて、何を意味すると思うかと、その読みの確信（1 ＝ 当てずっぽう 〜 5 ＝ 迷いなし）。`visibleDepth` の `2` が何を数えているかも書いてください。

**問 2. ボタン.** 2 節のデータのまま、帯のボタン（b1〜b4）は帯 B で、見出しのボタン（h1〜h3）は見出しで押したとして、何が起きると思うかと確信（1〜5）。

**問 3. 出来事の名.** 4 つの出来事の名が何を表すと思うかと確信（1〜5）。見出しのボタンが帯のボタンと同じ出来事の名を使っていることを、どう読んだか。

**問 4. 画面の絵.** 次の 5 つの場面で、左の欄に描かれる帯を木の形で書いてください（描かれない帯は書かない）。あわせて、2 節のデータの値が変わると思うなら、どの帯の何が何に変わるかを書いてください（変わらないなら「なし」）。
- S0: 2 節のデータのまま。
- S1: S0 から、帯 B の ∧（Retract）を押した後。あわせて、B の下の B1 が画面でどうなるかと、その理由も書いてください。
- S2: S1 から続けて、帯 A の ∨（Expand One Level）を押した後。
- S3: S0 から、見出しの ∧∧（Collapse All）を押し、続けて見出しの ∨（Expand One Level）を押した後（2 つの時点を書く）。
- S4: S0 から、帯 A の ∧∧（Collapse Below）を押し、続けて `visibleDepth` が `5` に変わった後（何で変わるかは書きません。2 つの時点を書く）。

**問 5. 第一印象.** いちばん読みにくかった名を 3 つ（理由つき）。人によって読みが割れそうな名と、その割れ方。

## 5. 答えの型（この型のまま、1 つのコードブロックに書く）

```markdown
## 問 1. データの名
| 名 | 意味だと思うこと | 確信 1〜5 |
| taskGroupTreeView | | |
| visibleDepth（2 が数える物も） | | |
| visibilityRule | | |
| revealed | | |
| retracted | | |
| automatic | | |
## 問 2. ボタン（帯は B で、見出しは見出しで押す）
| # | 起きると思うこと | 確信 1〜5 |
| b1 ∨ | | |
| b2 ∨∨ | | |
| b3 ∧∧ | | |
| b4 ∧ | | |
| h1 ∨ | | |
| h2 ∨∨ | | |
| h3 ∧∧ | | |
## 問 3. 出来事の名
| 名 | 表すと思うこと | 確信 1〜5 |
| expandOneLevelPressed | | |
| expandBelowPressed | | |
| collapseBelowPressed | | |
| retractPressed | | |
- 見出しと帯が同じ名を使うことの読み:
## 問 4. 画面の絵（描かれる帯を字下げで。変わる値は「帯: 前 → 後」。確信 1〜5）
- S0: 絵: / 理由: / 確信:
- S1: 絵: / 変わる値: / B1 の扱いと理由: / 確信:
- S2: 絵: / 変わる値: / 確信:
- S3 見出しの ∧∧ の後: 絵: / 変わる値: ‖ 見出しの ∨ の後: 絵: / 変わる値: / 確信:
- S4 A の ∧∧ の後: 絵: / 変わる値: ‖ visibleDepth が 5 の後: 絵: / 変わる値: / 確信:
## 問 5. 第一印象
- 読みにくかった名（3 つ、理由つき）:
- 読みが割れそうな名と割れ方:
```

**繰り返します: 答えはすべて、1 つのコードブロックの中に書いてください。2 段目は答えの後に送ります。**
