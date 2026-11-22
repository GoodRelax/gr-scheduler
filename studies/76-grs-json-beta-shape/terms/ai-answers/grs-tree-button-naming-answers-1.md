# 外の AI の答え —— `grs-tree-button-naming-request-1.md`

持ち主が外の AI に出した質問状への答えを、持ち主が貼った写しのまま置く（2026-11-20 に受け取った）。見出しの AI-A・AI-B・AI-C は、答えた AI を役割の名で呼んだもの（どの AI かの対応はリポジトリの外に置く）。答えの中のほかの製品の名も役割の名に置き換えた（交換の相手先の名 Microsoft Project・Microsoft Excel は残した）。この答えを照らした裁定は、質問状の名で `docs/development-records/rulings.md` を引くと見つかる。2026-11-22 に持ち主の手元の写しから取り込んだ（二重の管理をやめるため）。

---

# AI-A
## 問 1. 対称な名の組

### 組 1: 対象明示の完全対称型（外側の子・配下 ⇔ 内側の自身）
| ボタン | 英語の札 | 日本語の札 | 出来事の名 | 説明の文（英語 1 文） |
|:---|:---|:---|:---|:---|
| ∨ | Expand Children | 直下を展開 | `expandChildrenPressed` | Expand only the direct child task groups of this group, leaving deeper descendants hidden. |
| ∨∨ | Expand All Below | 配下をすべて展開 | `expandAllBelowPressed` | Expand every descendant task group below this group. |
| ∧∧ | Collapse All Below | 配下をすべて折りたたむ | `collapseAllBelowPressed` | Collapse every descendant task group below this group while keeping this group visible. |
| ∧ | Collapse Self | 自身を折りたたむ | `collapseSelfPressed` | Collapse this task group and all of its descendants into its parent group. |

- 対称の作り方: 動詞を `Expand`（展開）と `Collapse`（折りたたむ）で揃え、対象を「単体（`Children` ⇔ `Self`）」と「全体（`All Below` ⇔ `All Below`）」の鏡像ペアにした。`∨` と `∧` が単一対象、`∨∨` と `∧∧` が全対象という対応になる。
- 強い所（6 節の決まり）: 対象語を必ず後ろに付けることで「配下を畳む（`Collapse All Below`）」と「自分が畳まれる（`Collapse Self`）」の区別が札だけで一目で分かり、OMPV（1語1義）と NEIM（名は体を表す）を両立できる。略語がなく、保存する意図（`show`／`hide`）とも語が衝突しない。
- 弱い所（6 節の決まり）: 世の慣わしでは `collapse` は「中身を畳んで自分は残る」動詞であるため、`Collapse Self` は慣用から一歩踏み出した造語になる。

### 組 2: 動作分離・洗練表現型（階層展開・折りたたみ ＋ しまい込み）
| ボタン | 英語の札 | 日本語の札 | 出来事の名 | 説明の文（英語 1 文） |
|:---|:---|:---|:---|:---|
| ∨ | Expand One Level | 1 階層を展開 | `expandOneLevelPressed` | Expand only one level of direct child task groups below this group. |
| ∨∨ | Expand All Levels | 全階層を展開 | `expandAllLevelsPressed` | Expand all levels of descendant task groups below this group. |
| ∧∧ | Collapse All Levels | 全階層を折りたたむ | `collapseAllLevelsPressed` | Collapse all levels of descendant task groups while keeping this group visible. |
| ∧ | Fold In | 親へしまい込む | `foldInPressed` | Fold this task group and its descendants away into its parent group. |

- 対称の作り方: 中身に効く 3 つを `Expand`／`Collapse` × `One Level`／`All Levels` で規則的に揃え、自分自身に効く `∧` だけを「親の中へ折り込む」意味の短い 2 語 `Fold In` に分離した。`Collapse Into Parent` の長さと説明臭さを削ぎ落とした表現にしている。
- 強い所（6 節の決まり）: `collapse` を「中身だけを畳む」意味に限定できるため、世の慣わしと OMPV を厳密に守れる。4 つのうち `∧` だけ動詞が変わることで、「このボタンだけは挙動の質が違う」と初見のユーザーに警告できる。
- 弱い所（6 節の決まり）: 親を持たない最上位の帯で `Fold In`（親へしまい込む）を見たとき、どの「親」へしまうのかが画面上やや抽象的になる。

### 組 3: 慣わし厳守・日常語統一型（Open ／ Close）
| ボタン | 英語の札 | 日本語の札 | 出来事の名 | 説明の文（英語 1 文） |
|:---|:---|:---|:---|:---|
| ∨ | Open Children | 直下を開く | `openChildrenPressed` | Open only the direct child task groups of this group. |
| ∨∨ | Open All Below | 配下をすべて開く | `openAllBelowPressed` | Open all descendant task groups below this group. |
| ∧∧ | Close All Below | 配下をすべて閉じる | `closeAllBelowPressed` | Close all descendant task groups below this group while keeping this group open. |
| ∧ | Close This Group | このグループを閉じる | `closeThisGroupPressed` | Close this task group itself so it disappears into its parent. |

- 対称の作り方: フォルダやウィンドウの操作で馴染み深い `Open`（開く）と `Close`（閉じる）の対義語を使い、「配下を閉じる（`Close All Below`）」と「このグループ自体を閉じる（`Close This Group`）」を並べて対比させた。
- 強い所（6 節の決まり）: 専門用語（`Expand`／`Collapse`）を知らない初見のユーザーでも、日本語の「配下をすべて閉じる」と「このグループを閉じる」の差から動きを直感しやすい。保存意図（`show`／`hide`）ともぶつからない。
- 弱い所（6 節の決まり）: アウトライン UI の標準語彙である `Expand`／`Collapse` から離れるため、他のガントチャートやエディタに慣れたユーザーには少し独自用語に映る。

### いちばん勧める組と、その理由（1〜3 行）
**組 1** を勧めます。`Children` ⇔ `Self` と `All Below` ⇔ `All Below` の完全な鏡像構造によって見た目の対称性をそのまま言葉に写せており、初見のユーザーも `Collapse All Below` と `Collapse Self` の対比から「配下だけ消えるか、自分ごと消えるか」を札だけで誤解なく見分けられるためです。

## 問 2. ∧ の食い違いの扱い

| 道 | 中身 | 良い所 | 悪い所 |
|:---|:---|:---|:---|
| (a) | 挙動はそのままで、`∧` だけを「自分を消す・閉じる」言い切りの動詞（例: `Hide This Group` や `Close Self`）にし、他の 3 つと別動詞にする。 | ・`collapse` に「自分が消える」意味を混ぜずに済み、世の慣わしと OMPV を守れる。<br>・ボタンの札を見るだけで「押すとこの行自体が画面から消える」とダイレクトに伝わる。 | ・見た目が `∨・∨∨・∧∧・∧` と完全に対称なのに、名前が 3 対 1 に割れて対称性が崩れる。<br>・`Hide` を使うと内部の保存意図（`hide`）や表の列の `Show/Hide` と語が衝突する。 |
| (b) | 挙動はそのままで、`∧` を「親の中へしまう・自身を折りたたむ」と親子の収納関係で名づける（組 1 の `Collapse Self` や組 2 の `Fold In`）。 | ・見た目の対称性と、「`∧` で親へしまい、親の `∨` で戻す」という操作の往復（対称ペア）を名前の意味で一貫させられる。<br>・既存の仕様や操作感を一切壊さずに導入できる。 | ・最上位の帯（深さ 1）で押す場合、「親（見出しパネル）へしまい込まれる」という構造は、初見のユーザーにはやや直感しづらい。 |
| (c) | 4 つすべてを「押した帯の中身」への操作に統一し（例: `∧` は「見えている最も深い 1 段だけを畳む」に変更）、自分を消す操作は右クリックメニューや行ホバーの別アイコンへ移す。 | ・4 つのボタンの記号・名前・対象範囲が 100% 「配下の中身」に揃い、鬼っ子が消える。<br>・深いツリーを 1 階層ずつ段階的に畳む操作は、全体俯瞰の微調整に一定の意味がある。 | ・「作業が終わった兄弟グループをその場でワンクリックで片付ける」という GRS 独自の軽快な操作性と、親の `∨` で戻す対称設計が失われる。<br>・パネルの頭にも `∧` を足すかなど、UI と仕様の再設計コストが大きい。 |

- 勧める道と、その理由: **(b)（短い表現 `Collapse Self` または `Fold In` を採る道）** を勧めます。他社製品にはない「自分の行のボタン 1 つで親の中へ片付け、親の `∨` で戻す」という体験は GRS の大きな魅力であり、(c) でそれを捨てるのは惜しいためです。横に並んだ 4 つのボタンは比較しながら見られるため、`Collapse All Below` の隣に `Collapse Self`（または `Fold In`）が並んでいれば、初見でも違いを十分に読み取れます。

## 問 3. 頭と帯を分けるか

- 同じ名にする場合の困り事:
  - **主語の喪失**: ユーザーにとってパネルの頭は見出し（ヘッダー）であり、「仮の根ノード」という意識はない。そこに `Expand Children`（直下を展開）や `Open Children` と書かれていると、「誰の直下なのか」が一瞬分からない。
  - **ヘルプ・操作案内・外部 AI 連携の混乱**: 「『配下をすべて折りたたむ』を押す」と案内したとき、パネル全体を一括操作するボタンなのか、特定の帯のボタンなのかを名前だけで区別できない（OKPN に反する）。
- 別の名にする場合の困り事:
  - **動詞の分裂による学習コスト**: 現在の出荷版のように、帯は `Expand`、頭は `Show` と動詞まで変えてしまうと、同じアイコン（`∨`・`∨∨`・`∧∧`）なのに別の機能であるかのような誤解を与える。
  - **名前と実態の不一致（「Only」問題）**: 現在の設計では、頭の `∨` は最上位の帯に `show` を書くだけで深い帯を消さない（`hide` にしない）。それにもかかわらず `Show Top Level Only`（最上位**だけ**表示）と名づけると、深い階層が開いている状態で押したときに深い階層が消えず、札が嘘をつくことになる。
- 勧めるほうと、その理由: **「別の名にする（ただし動詞は帯と完全に揃え、対象語だけを `Top Level`／`All` に変える）」** ことを勧めます。スコープ（全体か個別行か）が異なる以上、ヘルプや AI 操作での識別性を保つために名前は分けるべきですが、動詞を揃えることで「同じ操作の全体版」であることが一目で伝わります。また、頭の `∨` の英語札からは実態と合わない `Only` を外し、`Expand Top Level` とすべきです。

| 組 | 頭の ∨ | 頭の ∨∨ | 頭の ∧∧ |
|:---|:---|:---|:---|
| 組 1 | Expand Top Level ／ 最上位を展開 ／ `expandTopLevelPressed` | Expand All ／ すべて展開 ／ `expandAllPressed` | Collapse All ／ すべて折りたたむ ／ `collapseAllPressed` |
| 組 2 | Expand Top Level ／ 最上位を展開 ／ `expandTopLevelPressed` | Expand All Levels ／ 全階層を展開 ／ `expandAllLevelsPressed` | Collapse All Levels ／ 全階層を折りたたむ ／ `collapseAllLevelsPressed` |
| 組 3 | Open Top Level ／ 最上位を開く ／ `openTopLevelPressed` | Open All ／ すべて開く ／ `openAllPressed` | Close All ／ すべて閉じる ／ `closeAllPressed` |

## 問 4. 先例

| 道具 | 1 段出す | 全部出す | 全部畳む（自分は残る） | 自分ごとしまう | 確かさ（確か・記憶） |
|:---|:---|:---|:---|:---|:---|
| コードエディタ A（ファイルの木／アウトライン） | Expand（個別クリック） | Expand All | Collapse All ／ Collapse Folders in Explorer | 該当なし（親へ移動して Collapse する必要がある） | 確か |
| Microsoft Excel（アウトライン／グループ化） | 明細の表示（`Show Detail` ／ `+`） | アウトラインレベル番号の最大値（`2`, `3`...） | 明細の非表示（`Hide Detail` ／ `-`）またはレベル `1` | 該当なし（集計行自身は常に残り、明細行だけが隠れる） | 確か |
| WorkFlowy ／ Dynalist（アウトライナ） | Expand（`+` クリック） | Expand All | Collapse ／ Collapse All（`-` クリック） | 該当なし（自分自身を隠すボタンはなく、親項目を Collapse する） | 確か |
| OS のファイル管理 A（リスト表示） | `>` クリック（直下のみ展開） | `Option` + `>` クリック | `Option` + `v` クリック（配下をすべて閉じた上で閉じる） | 該当なし（子を選択中に左矢印キー 2 回で親へ戻る操作のみ） | 確か |
| Microsoft Project ／ 一般的なガントチャート | Expand（`▶` クリック） | Expand All ／ Expand All Subtasks | Collapse ／ Collapse All Subtasks（`▼` クリック） | 該当なし（サマリータスク自体を消すにはフィルタを使う） | 記憶 |
***

# AI-B
## 問 1. 対称な名の組

  

### 組 1: Expand / Collapse + Into Parent（慣わし優先）

  

| ボタン | 英語の札 | 日本語の札 | 出来事の名 | 説明の文（英語 1 文） |

| ∨ | Expand One Level | 1階層展開 | expandOneLevelPressed | Show only the direct children of this task group. |

| ∨∨ | Expand Below | 配下を展開 | expandBelowPressed | Show every descendant of this task group. |

| ∧∧ | Collapse Below | 配下を折りたたむ | collapseBelowPressed | Hide every descendant of this task group while keeping this task group visible. |

| ∧ | Collapse Into Parent | 親へ折りたたむ | collapseIntoParentPressed | Hide this task group and place it back under its parent. |

  

- 対称の作り方:

  - ∨⇔∧∧ を Expand⇔Collapse で対称にする。

  - ∨∨⇔∧∧ を Below で対称にする。

  - ∧ だけは「子孫への操作ではない」ことを名で明示する。

- 強い所（6 節の決まり）:

  - 世の慣わしに最も近い。

  - OMPV を守りやすい（Collapse は子孫に効く操作だけ）。

  - ∧ の異質さを隠さない。

- 弱い所（6 節の決まり）:

  - ∧ だけ長く、見た目の対称は崩れる。

  - 「Into Parent」が少し説明的で、札としては重い。

  

### 組 2: Reveal / Conceal（結果重視）

  

| ボタン | 英語の札 | 日本語の札 | 出来事の名 | 説明の文（英語 1 文） |

| ∨ | Reveal Children | 子を表示 | revealChildrenPressed | Make the direct children visible. |

| ∨∨ | Reveal Descendants | 配下を表示 | revealDescendantsPressed | Make all descendants visible. |

| ∧∧ | Conceal Descendants | 配下を隠す | concealDescendantsPressed | Hide all descendants while keeping this task group visible. |

| ∧ | Conceal Self | 自分を隠す | concealSelfPressed | Hide this task group and its descendants. |

  

- 対称の作り方:

  - Reveal⇔Conceal を完全対称にする。

  - Children⇔Self、Descendants⇔Descendants で対象を明示する。

- 強い所（6 節の決まり）:

  - 名だけで対象が分かる。

  - ∧ が鬼っ子であることを隠さない。

  - OMPV を守りやすい。

- 弱い所（6 節の決まり）:

  - 木 UI の慣わし（Expand/Collapse）から離れる。

  - 保存する意図 show/hide と意味領域が近い。

  

### 組 3: Open / Close Family（木を家族として捉える案）

  

| ボタン | 英語の札 | 日本語の札 | 出来事の名 | 説明の文（英語 1 文） |

| ∨ | Open Children | 子を開く | openChildrenPressed | Open the direct children of this task group. |

| ∨∨ | Open Family | 配下を開く | openFamilyPressed | Open the entire subtree below this task group. |

| ∧∧ | Close Family | 配下を閉じる | closeFamilyPressed | Close the entire subtree below this task group. |

| ∧ | Close Into Parent | 親へ閉じる | closeIntoParentPressed | Close this task group into its parent. |

  

- 対称の作り方:

  - Open⇔Close。

  - Children⇔Family。

  - ∧ は Into Parent で別物と示す。

- 強い所（6 節の決まり）:

  - 見た目の対称感は強い。

  - 英語として自然。

- 弱い所（6 節の決まり）:

  - Open/Close は保存する意図なのか表示結果なのか曖昧になりやすい。

  - Expand/Collapse より慣わしが弱い。

  

### いちばん勧める組と、その理由（1〜3 行）

  

組 1。  

∧ の異質さを無理に隠さず、Expand/Collapse を「子孫への操作」に限定できる。NEIM よりも OMPV と世の慣わしを優先するなら最も筋が良い。

  

## 問 2. ∧ の食い違いの扱い

  

| 道 | 中身 | 良い所 | 悪い所 |

|---|---|---|---|

| (a) | ∧ を Hide Self / Conceal Self 系にする | 名だけで本当の動きが分かる。NEIM が強い | 他の3つが Expand/Collapse 系だと語彙が割れる。対称感は弱い |

| (b) | ∧ を Collapse Into Parent / Nest Into Parent / Fold Into Parent 系にする | ∧ と親の ∨ の対（しまう・戻す）が表せる。仕様の考え方に合う | 初見では動きが想像しにくい。「Into Parent」は説明臭い |

| (c) | ∧ を廃止または別機能化し、自分を消すを別UIへ移す | 4ボタン全部が子孫操作になり美しく対称 | 現在の重要な対（∧⇔親の∨）が失われる。新しい ∧ の意味を覚え直す必要がある |

  

- 勧める道と、その理由:

  - (b) を勧める。

  - この機能の本質は「見えなくする」より「親へしまう」に近い。

  - 特に ∧ が親の ∨ で戻る仕様なら、Hide より Parent を含む語のほうが設計の本質を表している。

  

## 問 3. 頭と帯を分けるか

  

- 同じ名にする場合の困り事:

  - 「Expand Below」が帯では部分木、頭では全体になる。

  - ヘルプで対象範囲の説明が必要。

  - AI 操作名としては対象指定を別引数で持つ必要がある。

  

- 別の名にする場合の困り事:

  - 同じ動作原理なのに語彙が二重化する。

  - ヘルプが長くなる。

  - 利用者が「Expand Below と Expand All の違いは何か」を考え始める。

  

- 勧めるほうと、その理由:

  - 同じ名にするほうを勧める。

  - 動作は同じで対象範囲だけが違うため。

  - 「どこに置かれたボタンか」で範囲が決まる設計のほうが語彙体系はきれい。

  

| 組 | 頭の ∨ | 頭の ∨∨ | 頭の ∧∧ |

|---|---|---|---|

| 組 1 | Expand One Level | Expand Below | Collapse Below |

| 組 2 | Reveal Children | Reveal Descendants | Conceal Descendants |

| 組 3 | Open Children | Open Family | Close Family |

  

## 問 4. 先例

  

| 道具 | 1段出す | 全部出す | 全部畳む（自分は残る） | 自分ごとしまう | 確かさ（確か・記憶） |

|---|---|---|---|---|---|

| OS のファイル管理 B の木 | Expand | Expand All（文脈による） | Collapse | なし | 記憶 |

| コードエディタ A のファイルの木 | Expand | Expand Recursively | Collapse | なし | 記憶 |

| コードエディタ B（IDE） | Expand One Level | Expand All | Collapse All | なし | 記憶 |

| Excel アウトライン | Show Detail | Show All Detail | Hide Detail | なし | 記憶 |

| WAI-ARIA Tree View | Expand | なし | Collapse | なし | 確か |

| アウトライナ系（WorkFlowy, Dynalist など） | Expand | Expand All Children 系 | Collapse | なし | 記憶 |

| ガント系ツール一般 | Expand | Expand All | Collapse | なし | 記憶 |

  

```