# CR-586 — 取り込んだマイルストーンと行の色は、それぞれ 1 つの正に従う

> 起草の状態: 起草した（2026-09-26）。利用者の裁定 `JDG-701`（`DFC-1065` への答え）と `JDG-702`（`DFC-1067` への答え）を当てる。⛔ 仕様・コード・試験はまだ 1 文字も変えていない。
> 読んだ木: `87d98a47`（枝 `cr-organise`）。行番号・数・参照は、すべてこの木で測った（測り方は 13 節）。
> ⚠️ 起草の最中に、同じ checkout の作業木へ W1 の編集（`CR-555` ほか）が当たり始めた。⇒ 数・旧の数え・`impact.py` は、`git archive 87d98a47` で取り出した写しで測り直した（13 節）。`induced.py` だけは、写しに書き出し（`check.sh` が作る）が無いので、この checkout の書き出し（2026-09-26 18:16）を読んだ。
> 当てる順: `JDG-740` の計画の W5（`CR-577` → `CR-582` → 本書 → `CR-583`）。⚠️ 表 T-017b の `CV-9` は W3 の `CR-559`（E-03）が書き直すので、本書の E-06 の旧は `CR-559` の新の末尾の句である（13 節で、`CR-559` ほか先に当てる 8 本の編集を写しに当ててから数えた）。
> ID の帯: 調整役から `CR-586` と仮の帯 `90600` 〜 `90699` を受けた。新しい行 ID は `IV-22` の 1 つだけであり、仮である（2 節）。
> 閉じるもの: `DFC-1065`（描いた形と `Task.milestone` の食い違い）、`DFC-1067`（`TaskGroup` の色の黒を `CM-30` が受ける）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

⚠️ 逐語は `docs/development-records/rulings.md` から写した（1 文字も変えていない）。問いは `docs/review/duplicate-survey-2026-09-26.md` の 7 節の Q2 と Q3。

| 裁定 | 逐語 | 読み（`rulings.md` の読みの欄） | 本書での扱い |
|---|---|---|---|
| `JDG-701` | **「Task.milestone に従う (推奨)」** | 「マイルストーンか」は `Task.milestone` に従う（`G-1` のとおり）。`ND-1` の札とリンクの種類もそれに従う。取り込みで描いた形（`TaskVisual.shapeKind`）と `Task.milestone` の食い違いを見つけて知らせる（または揃える）規則を足し、食い違う文書を作らせない | E-01（表 T-251 の読み分け）・E-02（`FR-009` の FS の段）・E-04（表 T-220 の `IV-22`、見つけて知らせる）・E-03（表 T-032 の `MG-8`、揃える）・E-05 ・ E-08 |
| `JDG-702` | **「拒む (推奨)」** | `CM-30` は、プロパティパネルが `TaskGroup` の色として出す名前だけを受け、それ以外（'black' など）を拒む。その名前の一覧を唯一の許可リストとし、`CM-30` と取り込みの両方がそれで判定する | E-06（`CV-9`）・E-07 ・ E-09 と 4.3 節の生成器 |

### 0.2 調べた結果（`87d98a47`）

1. **`G-1` は既に `Task.milestone` を正としている**（`01-04-requirements.md:237`「マイルストーンかどうかは `Task.milestone`（真偽値）が持ち」）。コードも `ND-1` の札（`name-label.ts:66`）とリンクの種類（`edit-dependency.ts:93`）は `Task.milestone` を読む —— 裁定と同じ向きである。描いた形を「マイルストーンか」の判定に読むのは `isMilestone`（`edit-task.ts:170`、呼ぶ所 4: `task-appearance.ts:90`・`task-plan-actual.ts:350`・`:418`・`:470`）と `isDrawnAsMilestone`（`screen-state-input.ts:112`）の 2 本である。`shapeKindOf`（`schedule-layout.ts:220`）は描く形を解く関数であり、判定ではない（変えない）。
2. **食い違いが文書に入る道は 2 つある（調査の Q2 が挙げたのは 1 つ）。** ① `GRS JSON` —— 生成したスキーマは 2 列を結べない（`grs-json-schema.ts` は列ごとの列挙だけ）。② ⚠️ **MSPDI の上書き（合流）** —— 表 T-032 の `MG-8` は「見た目（色・形状）…を保つこと（MUST）」と定め、コードも保った `TaskVisual` を残して `Task` だけを置き換える（`import-document.ts:770`〜`:778` の `request.format === 'grsJson' || !wasHeld`）。取込元（MS Project など）でタスクをマイルストーンにする・やめると、`Task.milestone` だけが変わり、形が食い違う。画面の上の編集は食い違いを作らない（表 T-239 の `TC-1` と `FR-083` ・ `CM-20`）。
3. **表 T-220 の行は「拒んで告げる」形である**（`FR-023`・`FR-076` の `NT-1`、理由は行 ID。表 T-233 の結び）。自動で直す形（`JDG-78`）は `DFC-586` がリファクタの後に一括で当てる。⇒ ① には表 T-220 の行を足し、② は拒まずに `MG-8` で形を揃える（決定 1 ・ 決定 2）。
4. ⚠️ **開く路は、いまは 表 T-220 のうち `IV-17` しか読まない**（`DFC-922`。`frame-loop.ts:659`〜`:664` の `noWorkingWeekdayReason` だけが `scheduleViolations` を呼ぶ）。⇒ 行を足すだけでは、食い違う `GRS JSON` は黙って開く。9 節の 1 と 11 節の問い 2。
5. **行の色の許可リストは、仕様の中では既に 1 つに書けている。** 表 T-294 の `S-315`（黒）の行の帯の欄は「—（行の色には選ばせない）」であり、生成器もこの「—」を読んで描き手へ `band: false` を刷っている（`tools/generate_entity_types.py:1712-1735` の `palette_cell`）。⚠️ ところが列の形（`erd.json` の座席 58、`AT-58`）は黒を除かず、生成した選択肢（`schedule-entities.ts:439`）とスキーマは黒を受け、`CM-30`（`task-group-look.ts:24` の `isStoredColour(command.color, true)`）も受ける。パネルだけが手で書いた `LEFT_OUT_NAME_OF_HOLDER`（`properties-panel.ts:759-762`）で黒を外す。
6. **同じ形の先例が 1 つある** —— ハイライトボックスの枠（`AT-121`）は、列の形に `"transparent": false` を持ち（`erd.json:2714`）、生成したスキーマと選択肢が透明を除く。`CR-559` がコメントボックスの線と字（`AT-148`・`AT-152`）に同じ旗を足す。⇒ 行の色も、列の形の旗で生成物に黒を除かせる（決定 3）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-1` ／ `GL-004`**（構造化した日程データを出し入れし、外部 WBS マスタと往復する）—— 文書の中で「マイルストーンか」が 1 つの意味しか持たなくなる。MSPDI へ書き出すのは `Task.milestone` であり（`G-1`）、画面の形・札・依存の種別がそれと食い違う文書を作らない。取込元でマイルストーンにした変更は、合流で拒まずに絵へ届く（`MG-8`）。
- ⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— パネルが出さない色を持つ行（どの見本も選ばれていない欄と、テーマの帯で描かれる行）が文書に入らない。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・重複がない。唯一の正）** —— ① `MG-8` の「見た目（色・形状）…を保つこと（MUST）」は、取込元が `Milestone` を変えたときに 表 T-220 の新しい行と両立しない → `MG-8` に「ただし」の 1 段を足した（E-03）。② 行の色の「並べない」（`CV-9`）と「受ける」（`AT-58` の列の形と `CM-30`）が別の一覧だった → 一覧を列の形の 1 つにし、`CV-9` がそれを正と名指す（E-06 ・ E-07）。③ `induced.py` の閉路 `CV-6` ↔ `CV-9` ↔ `FR-007` ↔ `S-315`（大きさ 4）—— 本書が書くのは `CV-9` の 1 句だけで、`S-315` の行の帯の欄「—」は読むだけであり書かない。`CV-6`（「`TaskGroup.color` は行の帯の値で描く」）は、E-06 の「行の帯の欄が「—」でない名」の根拠として読み合わせた —— 食い違いは無い。④ 閉路 `CM-20` ↔ `FR-083` は読むだけ。
- **`R1.4`（異常系・境界値）** —— ① `shapeKind` が `null` の `TaskVisual` は形を `Task.milestone` から解くので食い違いようが無い → `IV-22` の対象から外した。② `Task.milestone` が `null`（`AT-30` は `null` を許す）は「真でない」側に数える —— `IV-22` は「真であること」と一致させるので、`null` と `'milestone'` の組は外れる。③ 透明は行の帯の欄に「描かない」を持つ（「—」ではない）ので、行の色の一覧に入る —— いまのパネル（`CV-9` の 2 段目の [透明]）とコード（`isStoredColour(…, true)`）と同じ。④ 保存済みの文書が黒の行を持つと、読めなくなる（分類 F）—— 利用者の方針（まだ運用していないので古い形の読み替えを置かない）に従い、読み替えを置かない。追跡している見本の文書 4 つには 0 件（13 節）。
- **`R2.7`（DRY）・ `R2.21`（1 つの仕事は 1 か所）** —— 並べない名を、パネル（`LEFT_OUT_NAME_OF_HOLDER`）・命令（`isStoredColour` の第 2 引数）・スキーマ（`"transparent": false`）の 3 か所が別々に持っている。本書は行の色について、生成した 1 つの一覧から 3 か所が読む形を継ぎ目に書いた（5 節の S-4 ・ S-5）。「マイルストーンか」も、`isMilestone` ・ `isDrawnAsMilestone` の 2 本を `Task.milestone` の読みへ畳む（S-2）。
- **`R2.14`（POLA）** —— 画面ではマイルストーンにできないタスクが、取り込みでは形だけマイルストーンになっていた。本書の後は、形・札・依存の種別がどれも同じ答えを返す。

### ③ 利用者に問わずに決めたこと

⭐ 下は根拠を添えて問わずに決めた（あとから覆せる）。`rulings.md` を「G-1」「ND-1」「CV-9」「CM-30」「S-315」「shapeKind」「MG-8」「黒」で引いた —— 当たるのは `JDG-701` ・ `JDG-702` のほか、`JDG-327`（白と黒を暗いテーマで入れ替える）・ `JDG-383` ／ `JDG-405`（色の欄の並べ方）・ `JDG-148` ・ `JDG-300` ・ `JDG-312` ・ `JDG-484` で、どれも本書と食い違わない。`MG-8` を名指す裁定は 0 件。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 裁定の「知らせる（または揃える）」を、`GRS JSON` では「知らせる」とする —— 表 T-220 に `IV-22` を足し、取り込みで拒んで行 ID で告げる | 表 T-220 のほかの行と同じ形であり、告げ方（`FR-076` の `NT-1`、理由は行 ID、語は辞書の `invariants`）が既に在る。食い違う `GRS JSON` は手で直したか AI が書いたファイルであり、どちらの列が意図かをファイルからは読めない。自動で直す形（`JDG-78`）は `DFC-586` が表 T-220 の全行へ一括で当てる | 1 か所の食い違いで文書全体が開かない（`DFC-586` までは） |
| 決定 2 | MSPDI の上書き（`MG-8`）では「揃える」とする —— 保った形が `IV-22` に外れたら、形を `null` へ戻す（`Task.milestone` から解く） | 取込元がタスクをマイルストーンにした（やめた）のは正しい変更であり、壊れたファイルではない。拒めば外部 WBS マスタとの往復（`GL-004`）が止まる。`null` へ戻せば、どの形にするかを新しく決めずに済む（`AT-100` が解く） | 人が選んだ形（例: 矢羽根）は、取込元がマイルストーンをやめて戻しても矩形になる。揃えたことを告げない（11 節の問い 1） |
| 決定 3 | 行の色の一覧は、表 T-294 の名のうち行の帯の欄が「—」でないものとし、列の形（`erd.json` の座席 58）に旗 `"band": true` を足して、生成器がその「—」を読んで除く | 「—」は既に `S-315` が持ち、生成器も読んでいる（0.2 の 5）。黒の名を列の形に書き写すと、表 T-294 と 2 か所になる。旗の形は `AT-121` の `"transparent": false` と並べた | `erd.schema.json` に旗が 1 つ増える。2 つの生成器（`erd_json_to_schema.py`・`tools/generate_entity_types.py`）が表 T-294 の行の帯の欄を読む |
| 決定 4 | `IV-22` は `null` の形を対象に含めず、`Task.milestone` の `null` を「真でない」に数える | 0.2 ・ ② の `R1.4` | — |
| 決定 5 | 規則は `ND-1` ／ `ND-2` の表（表 T-251）と `FR-009` の FS の段に、それぞれ 1 段ずつ書く。`G-1` は書かない | 裁定が名指すのはこの 2 つ。`G-1` は既に正を述べている。01-04 に「マイルストーン」は 116 回現れる（13 節）が、ほかの判定は `G-1` に従い、`IV-22` の後はどちらを読んでも同じ答えになる | ほかの判定（実績の床・進捗マーカーの巡り）には文を足さない —— コードの 2 本は 9 節で畳む |
| 決定 6 | 行の色だけを書き、ハイライトボックスの枠・コメントボックスの線と字（透明を除く 3 列）の一覧は書き直さない | 裁定は `TaskGroup` を名指す。3 列は既に列の形・スキーマ・命令が同じ一覧を持ち、食い違いが届かない（`DFC-1067` の後半の手書きの写しは、仕様を変えずに 9 節で直せる） | パネルの手書きの表（`LEFT_OUT_NAME_OF_HOLDER`）の枠の行は、9 節で生成物へ寄せる |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 名称ラベルの予定日の読み分け（`ND-1` ／ `ND-2`） | 表 T-251 の後に 1 段 | E-01 |
| 依存の種別（マイルストーンが端なら FS） | `FR-009` の FS の段の末に 1 文 | E-02 |
| MSPDI の上書きで形を揃える | 表 T-032 の `MG-8` の末に 1 段 | E-03 |
| 取り込みで見つけて知らせる | 表 T-220 に `IV-22`（`05-07-design.md`） | E-04 |
| その語の置き場 | `_source/display-words.json` の `invariants` に `IV-22` の項（語は空 —— 語は利用者が書く） | E-05 |
| 行の色の唯一の一覧 | 表 T-017b の `CV-9`（`CR-559` の後の文） | E-06 |
| 列の形（行の色） | `_source/erd.json` の座席 58（`AT-58`）の旗と意味 | E-07 |
| 列の形（形状） | `_source/erd.json` の座席 100（`AT-100`）の意味 | E-08 |
| 旗の定め | `_source/erd.schema.json` の `band` | E-09 |
| 生成器 | `_source/erd_json_to_schema.py`・`tools/generate_entity_types.py` | 4.3 |

**数**: 文の編集 6（E-01 〜 E-04、E-06。`01-04-requirements.md` 4、`05-07-design.md` 1）と原稿の編集 4（E-05 ・ E-07 〜 E-09）、生成器 2。

---

## 2. 新しい識別子

| 種類 | 採ったもの | 測った所（`87d98a47`、`git grep` を `docs src tests tools change-request` に） |
|---|---|---|
| 行 | `IV-22`（表 T-220。仮） | `90601` は 0 件。⚠️ 仮の番号であり、調整役が `tools/renumber_ids.py` で詰める。表 T-220 の行は `IV-1` 〜 `IV-21`（欠番なし）なので、詰めた先の番号は当てる日に測り直すこと（規則 02 の 2.5 節） |
| `erd.json` の旗 | `"band"`（列の形の鍵。行 ID ではない） | `erd.schema.json` の `jsonType` の鍵に `band` は無い |

- 本書が取らないもの: 表・接頭辞・設定値の行・理由の行（`RS-`）・命令（`CM-`）。拒んだときの理由は 表 T-220 の行 ID が運ぶ（表 T-233 の結び）ので、`RS-` の行を足さない。黒を拒む取り込みの理由は既存の `RS-25`（「読んだ `GRS JSON` の列が、決められた形に合わない」）である。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`87d98a47`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `MG-8` の「見た目（色・形状）…を保つこと（MUST）」の、`Task.milestone` が変わったときの形への効き | `01-04-requirements.md:5248` | 形が `IV-22` に外れるときは `null` へ戻す（旧の文は残し、「ただし」の段を足す） | E-03 |
| `TaskGroup.color` の列の形が黒を受けること | `_source/erd.json:1501`〜`:1504`（生成物 `schedule-entities.ts:439`・`grs-document.schema.json`） | 行の帯の欄が「—」でない名だけ（E-06 ・ E-07） | E-07 と 4.3 |
| `CM-30` が黒を受けること（仕様は受けるとも拒むとも書いていない） | コード `task-group-look.ts:24` | `CV-9` の一覧の外を拒む | E-06（コードは 9 節） |
| 手で書いた並べない名 | コード `properties-panel.ts:759-762` | 生成した一覧 | 9 節 |
| 描いた形で「マイルストーンか」を判じること | コード `edit-task.ts:170`・`screen-state-input.ts:112` | `Task.milestone` | 9 節 |

⭐ **消さないもの**（読み直して真のまま）: `G-1` の全文。`AT-100` の「`null` = `Task.milestone` から解く」。`TC-1`・`FR-083`（画面の上では食い違いを作らない）。`MG-8` の色と行の所属を保つ規則。`MG-8a`（`GRS JSON` の上書きは見た目も置き換える —— 置き換える値は `IV-22` を満たした取込元の値である）。`S-315` の行（行の帯の欄の「—」と備考）。`CV-9` のほかの句。`shapeKindOf`（描く形を解く —— 判定ではない）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**（`CR-555` ・ `CR-559` と同じ）: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（13 節の道具が 9 件すべてを、`87d98a47` の写しと、先に当てる 8 本を当てた写しの両方で数えた）。旧・新は、`<!-- EDIT … -->` の直後の 2 つの `text` の塊である。`kind=sub` の編集は行の一部の置き換えであり、塊の末の改行を旧にも新にも含めない。ほかは行の全体（末の改行まで）である。
⚠️ 行末の 2 つの半角空白（改行の印）も旧と新の一部である。写すときに落とさないこと。
⚠️ 同じファイルの編集は上から順に当てること。
⚠️ 生成物（`_assets/fig-erd-detail.md` ・ `_source/grs-document.schema.json` と `src/` の生成物）は手で直さない。原稿を直して `npm run gen` を打つ。
⚠️ E-04 と E-05 は同じ波で当てること —— 辞書の生成器は 表 T-220 の行と `invariants` の項が 1 対 1 でないと止まる（`tools/generate_display_words.py:402`）。

### 4.1 文の編集（`01-04-requirements.md` ・ `05-07-design.md`）

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-002` の 表 T-251 の後、「⛔ 名称ラベルの位置を…」の段の前に 1 段を足す。旧
```text
⛔ 名称ラベルの位置を人が指定する手段を持ってはならない（MUST NOT） —— 置き場所は `FR-109` だけが決める。  
```
新
```text
⭐ `ND-1` と `ND-2` のどちらで書くかは、`Task.milestone` だけで決めること（MUST） —— 描いた形（`TaskVisual.shapeKind`）で決めてはならない（MUST NOT）。マイルストーンかどうかの正は `Task.milestone` である（表 T-005 の `G-1`）。  
⚠️ 2 つが食い違う文書は作らせない —— `GRS JSON` から来た食い違いは `05-07-design.md` の 表 T-220 の `IV-22` が取り込みで拒み、MSPDI の上書きで生まれる食い違いは 表 T-032 の `MG-8` が形を揃えて消す。

⛔ 名称ラベルの位置を人が指定する手段を持ってはならない（MUST NOT） —— 置き場所は `FR-109` だけが決める。  
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`FR-009` の「マイルストーンが端に来る依存は…」の段の末（`書き換えると` の行）に 1 文を足す —— 段の途中に挟まない（規則 02 の 4 節）。旧
```text
書き換えると `FR-021` の往復無損失が壊れる。
```
新
```text
書き換えると `FR-021` の往復無損失が壊れる。  
⭐ 本段の「マイルストーン」は、`Task.milestone` が真の `Task` とすること（MUST） —— 描いた形（`TaskVisual.shapeKind`）で判じてはならない（MUST NOT）。マイルストーンかどうかの正は `Task.milestone` であり、MSPDI へ書き出すのもこの列である（表 T-005 の `G-1`）。
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md kind=sub -->
表 T-032 の `MG-8` の末尾。旧
```text
**行をまるごと差し替えると、マルチバーの配置が取込のたびに失われる** |
```
新
```text
**行をまるごと差し替えると、マルチバーの配置が取込のたびに失われる**<br>⭐ ただし、上書きで `Task.milestone` が変わり、保った形（`TaskVisual.shapeKind`）が `05-07-design.md` の 表 T-220 の `IV-22` に外れるときは、その形を `null` へ戻すこと（MUST） —— 形は `Task.milestone` から解かれる（`_assets/fig-erd-detail.md` の `AT-100`）。<br>取込元がそのタスクをマイルストーンにした（またはやめた）のであり、マイルストーンかどうかの正は `Task.milestone` である（表 T-005 の `G-1`）。<br>⚠️ 拒まない —— 取込元での正しい変更で合流を止めると、外部 WBS マスタとの往復（`GL-004`）が止まる |
```

<!-- EDIT id=E-04 file=docs/spec/05-07-design.md kind=sub -->
表 T-220 の最後の行 `IV-21` の後ろに `IV-22` を足す（旧は `IV-21` の行の末尾）。旧
```text
| その 3 列と、`FR-054` が解いた文書の暦 | 組合せ |
```
新
```text
| その 3 列と、`FR-054` が解いた文書の暦 | 組合せ |
| IV-22 | `TaskVisual.shapeKind` が非 `null` のとき、それが `'milestone'` であることと、その `TaskVisual` が指す `Task` の `milestone` が真であることが一致すること。<br>⭐ マイルストーンかどうかの正は `Task.milestone` であり、形は描き方だけを持つ（`01-04-requirements.md` の 表 T-005 の `G-1`） —— 食い違う文書では、描いた形と、名称ラベルに添える予定日（同書の 表 T-251）と依存の種別（同書の `FR-009`）が別のことを言う。<br>⚠️ **`shapeKind` が `null` の `TaskVisual` は対象外** —— 形を `Task.milestone` から解く（`_assets/fig-erd-detail.md` の `AT-100`）。<br>⚠️ 画面の上の編集は食い違いを作らない —— 作るときは同書の 表 T-239 の `TC-1` が形から真偽値を決め、置いた後は同書の `FR-083` が期間を持つ形とマイルストーンの乗り換えを禁じる。<br>MSPDI の上書きで `Task.milestone` だけが変わるときは、本行で拒まず、同書の 表 T-032 の `MG-8` が形を揃える —— 取込元での変更であって、壊れたファイルではない | その 2 列と、`TaskVisual` から `Task` への外部キー（表 T-057） | 組合せ |
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md kind=sub -->
表 T-017b の `CV-9` の末尾（`CR-559` の E-03 の後の文。その新の最後の句と、次の「語は」の句）。旧
```text
<br>行の色の欄には黒を並べない（表 T-294 の `S-315`）。<br>語は `FR-038` の辞書が持つ |
```
新
```text
<br>行の色の欄には黒を並べない（表 T-294 の `S-315`）。<br>⭐ 行の色の欄が並べる名を、`TaskGroup.color` が受ける名の唯一の一覧とすること（MUST） —— 一覧は、表 T-294 の名のうち、行の帯の欄が「—」でないものとする（透明は「描かない」を持つので一覧に入る）。<br>⛔ 一覧の外の名（黒）は、`CM-30`（`FR-042`）も、`GRS JSON` の取り込み（`05-07-design.md` の 表 T-220 の前文のスキーマ。拒んだときの理由は 表 T-233 の `RS-25`）も受けてはならない（MUST NOT） —— パネルが出さない名を命令と取り込みが受けると、どの見本も選ばれていない欄と、テーマの帯で描かれる行が残る。<br>⭐ 一覧は列の形（`_assets/fig-erd-detail.md` の `AT-58`）から生成し、欄・命令・取り込みのどれにも手で書き写してはならない（MUST NOT）。<br>語は `FR-038` の辞書が持つ |
```

### 4.2 原稿の編集（`_source/`）

<!-- EDIT id=E-05 file=docs/spec/_source/display-words.json -->
`invariants` の最後の項 `IV-21` の後ろに `IV-22` の項を足す。⛔ 語は空のまま —— 辞書の `$comment`「EVERY ENTRY IS WRITTEN BY THE USER AND AN AGENT MUST NOT INVENT ONE」。ほかの `IV-` の項もいまはすべて空である。旧
```text
   "rowId": "IV-21",
   "text": {
    "ja": "",
    "en": ""
   },
   "nextStep": {
    "ja": "",
    "en": ""
   }
  }
 ],
```
新
```text
   "rowId": "IV-21",
   "text": {
    "ja": "",
    "en": ""
   },
   "nextStep": {
    "ja": "",
    "en": ""
   }
  },
  {
   "rowId": "IV-22",
   "text": {
    "ja": "",
    "en": ""
   },
   "nextStep": {
    "ja": "",
    "en": ""
   }
  }
 ],
```

<!-- EDIT id=E-07 file=docs/spec/_source/erd.json -->
`TaskGroup` の座席 58（`color`、`AT-58`）—— 旗 `"band": true` と、意味の 1 句。旧
```text
     "json": {
      "kind": "color",
      "null": true
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "行の帯の色。形は `AT-102` と同じ。規則は表 T-017b"
```
新
```text
     "json": {
      "kind": "color",
      "null": true,
      "band": true
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "行の帯の色。形は `AT-102` と同じ。ただし行の帯を持たない名（`_assets/tbl-settings.md` の表 T-294 の行の帯の欄が「—」の名 —— 黒 `S-315`）は取らない（表 T-017b の `CV-9`）。規則は表 T-017b"
```

<!-- EDIT id=E-08 file=docs/spec/_source/erd.json kind=sub -->
`TaskVisual` の座席 100（`shapeKind`、`AT-100`）の意味。`AT-102` が 表 T-220 の `IV-9` を引く形に並べた。旧
```text
"ja": "描画の形だけを決める。`Task.milestone` を変えない（表 T-012）"
```
新
```text
"ja": "描画の形だけを決める。`Task.milestone` を変えない（表 T-012）。`'milestone'` であるかどうかは `Task.milestone` が真であるかどうかと食い違えない（`05-07-design.md` の表 T-220 の `IV-22`）"
```

<!-- EDIT id=E-09 file=docs/spec/_source/erd.schema.json -->
`jsonType` の `properties` に、`transparent` の隣へ `band` を足す。旧
```text
    "transparent": {
     "const": false,
     "description": "Only with kind \"color\": this column may not hold the transparent name (FR-019 forbids it for a highlight box). Absent means it may."
    },
```
新
```text
    "transparent": {
     "const": false,
     "description": "Only with kind \"color\": this column may not hold the transparent name (FR-019 forbids it for a highlight box). Absent means it may."
    },
    "band": {
     "const": true,
     "description": "Only with kind \"color\": this column is drawn as a row band (CV-6 of table T-017b), so it takes only the names of table T-294 whose row-band cells are not a dash. Black (S-315) holds a dash there, and CV-9 leaves it off the row colour field. The generators read the dash from table T-294, so the refused names are not repeated here. Absent means the column takes every name."
    },
```

### 4.3 生成器と生成物（形で示す）

| 何 | 何をする |
|---|---|
| `docs/spec/_source/erd_json_to_schema.py` の `kind == 'color'` の枝（`:172`〜`:176`） | `spec.get('band')` が真なら、表 T-294 の行のうち行の帯の欄（`lightBand` ・ `darkBand`）が「—」で始まる `ja` を持つ名を `colour_names()` から除いて `pattern` を組む。⭐ 「—」の読み方は `tools/generate_entity_types.py` の `palette_cell` と同じにする（両方が同じ判定を持つなら、一方をもう一方から呼べる形に寄せる —— `R2.21`） |
| `tools/generate_entity_types.py` の `column_shape`（`:194`〜`:205`） | 同じ条件で `values` から除く。⇒ `COLUMN_SHAPES.TaskGroup.color.choices` から `'black'` が消える |
| `npm run gen` | `_source/grs-document.schema.json` の `TaskGroup.color` の `pattern` から `black` が消え、`src/adapter/document-codec/grs-json-schema.ts` がそれを刷る。`_assets/fig-erd-detail.md` の `AT-58` ・ `AT-100` の意味が E-07 ・ E-08 の文になる。`src/adapter/screen-renderer/display-words.json` に `IV-22` の空の項 |
| 検査 | ⚠️ `tests/contract/document-invariants.contract.test.ts:577` 〜 の破り方の表は 表 T-220 の全行に 1 つずつ例を持つ —— 仕様の波と同じ波で `IV-22` の例を足す（8 節の波 1） |

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

| # | 間 | 継ぎ目（逐語） |
|---|---|---|
| S-1 | 仕様 ↔ 不変条件（`schedule-invariants.ts` の `INVARIANTS`） | `{ row: 'IV-22', kind: 'combination' }`. A breach is a `TaskVisual` whose `shapeKind` is not null and whose `(shapeKind === 'milestone')` differs from `(task.milestone === true)`, where `task` is the `Task` its `taskUid` names. `at` is `/schedule/taskVisuals/<index>`; `what` names the Task uid, the shape and the milestone value. A `TaskVisual` whose Task is missing is IV-2's, not this row's. |
| S-2 | 「マイルストーンか」を問う側 | Every "is this Task a milestone" judgement reads `task.milestone === true` (G-1). `isMilestone(task, visual)` in `edit-task.ts` and `isDrawnAsMilestone` in `screen-state-input.ts` read `task.milestone` only (or are removed and their callers read it). `shapeKindOf` in `schedule-layout.ts` stays: it resolves the drawn shape, it does not judge. `name-label.ts` and `edit-dependency.ts` already read `task.milestone` and are not touched. |
| S-3 | 合流（`import-document.ts` の合流の輪、`:770`〜`:778`） | For an MSPDI merge (`request.format !== 'grsJson'`) of a Task already held (`wasHeld`), after the Task is replaced: if the kept visual's `shapeKind` is not null and disagrees with the merged `task.milestone` (the S-1 test), write the visual back with `shapeKind: null`. Nothing else of the visual changes (MG-8 keeps colours and the row). No notice (decision 2). |
| S-4 | 行の色の一覧（生成物 ↔ 命令 ↔ パネル） | The one list is `COLUMN_SHAPES.TaskGroup.color.choices` (generated; black absent after 4.3). `setTaskGroupColor` (`task-group-look.ts`) accepts a palette name only if it is in that list, or a custom colour (CV-2), and refuses anything else with `reject('CM-30', 'CV-9', ...)`. The panel's `withColourField` offers, for each colour column, exactly the names in that column's generated choices, in table T-294 order, leaving the others' slots empty (CV-9) -- `LEFT_OUT_NAME_OF_HOLDER` goes. No name is spelled in `src/` by hand. |
| S-5 | 開く路（`GRS JSON`） | A `GRS JSON` whose `TaskGroup.color` is `black` fails the generated schema and is refused with RS-25 (no new code). A `GRS JSON` breaking IV-22 is refused on open with the row ID IV-22 as the reason (FR-076, table T-233's closing paragraph) -- see section 9 row 1 and section 11 question 2 for how this meets DFC-922. |

---

## 6. グラフ（`87d98a47` で測った）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 要求 / 参照 | 読み |
|---|---|---|
| `G-1` | 0 / 0 | 浮いている。本書は書かない（決定 5） |
| `ND-1` ・ `ND-2` | 0 / 2 ・ 0 / 0 | `05-07-design.md:343` ・ `:399`（ファイル構成の表が行 ID を引く）だけ。E-01 は表の後の段であり、行の文を変えない |
| 表 T-251 | 1 要求 | `FR-002`（表を持つ要求）。2 次: `FR-040` ・ `FR-085` ・ `FR-092` —— どれも表を指すだけで読み分けを引かない |
| `FR-009` | 7 / 25 | `UC-004` ・ `FR-016` ・ `FR-049` ・ `FR-076` ・ `FR-104` ・ `FR-110` ・ `SWS-3` —— どれも経路・種別の略号・当たりの半分を引き、FS の段の「マイルストーン」を引かない |
| 表 T-032 ・ `MG-8` | 表: 7 要求 ／ 行: 0 / 0 | ⚠️ 表 T-032 は塊「開くと合流」に属する（同じ塊: 表 T-024 ・ 表 T-024a）。E-03 は `MG-8` の 1 行の末に段を足すだけで、表 T-024a の `OP-` の行と `MG-8a` ・ `MG-12` を読み合わせた（`MG-8a` の置き換える値は `IV-22` を満たした取込元の値） |
| 表 T-220 ・ `IV-21` | 表: 12 要求 ／ 行: 3 / 5 | 表を指す要求は `FR-011` ・ `FR-016` ・ `FR-019` ・ `FR-023` ・ `FR-043` ・ `FR-076` ・ `FR-103` ほか —— 行を 1 つ足すだけで、既存の行を動かさない。`IV-21` は `FR-011` ・ `FR-043` ・ `FR-103` が引く（本書は `IV-21` の文を書かない） |
| `AT-100` ・ `AT-58` | 0 / 0 ・ 1 / 1 | `AT-58` は `FR-007` の `CV-1`（`:1951`）が列の形として引く —— E-07 の後も「列の形は `AT-58` が持つ」は真 |
| `CV-9` | 0 / 7 | `tbl-property-items.md:50` ・ `tbl-published-entries.md:37` ・ `tbl-settings.md` の 5 か所（`S-338` ・ `S-339` の備考、`S-315` の備考）—— 並べ方を引くだけで、一覧を引かない |
| `S-315` | 1 / 2 | `FR-007` の `CV-6` ・ `CV-9` —— 読むだけ |
| `CM-30` | 0 / 0 | 浮いている（規則は「正」の列の `FR-042`）。E-06 が `CM-30` を名指す |
| `RS-25` | 0 / 2 | 読むだけ |

⭐ 導いた条項（E-01 〜 E-04 ・ E-06）ごとに、届いた行を `rulings.md` で引いた（規則 02 の 1）—— 0 節 ③ の前文のとおり。`MG-8` ・ `IV-21` ・ `RS-25` ・ `CM-20` は 0 件。

### 6.2 `induced.py`（3 群。この checkout の書き出し 2026-09-26 18:16 を読んだ —— 冒頭の注）

| 種 | 解決 | 種の中の辺 | 閉路 | 扱い |
|---|---|---|---|---|
| `G-1 ND-1 ND-2 T-251 FR-002 FR-009 AT-30 AT-100 T-220 IV-21 IV-9 FR-023 TC-1 FR-083 CM-20` | 15/15 | 4 | 1: `CM-20` `FR-083` | 本書はどちらも書かない。読むだけ |
| `CV-9 CV-1 CV-6 S-315 T-294 CM-30 FR-042 FR-007 AT-58 AT-121 T-017b RS-25 T-220` | 13/13 | 18 | 1: `CV-6` `CV-9` `FR-007` `S-315` | 本書が書くのは `CV-9` の 1 句（E-06）だけ。`S-315` の「—」と `CV-6` の「行の帯の値で描く」を E-06 の根拠として読み合わせた（0 節 ② の ③）—— 1 手で書く |
| `MG-8 MG-8a T-032 AT-100 G-1 FR-083 T-220 FR-022 FR-021` | 9/9 | 1 | 0 | 1 つずつ書いてよい |

---

## 7. 数の予測（`87d98a47` で測った。当てた後に同じ数え方で突き合わせる）

| 数 | 前（`87d98a47`） | 後（本書だけ） | 内訳 |
|---|--:|--:|---|
| tables | 189 | 189 | — |
| figures | 28 | 28 | — |
| rows | 2364 | 2365 | 表 T-220 の `IV-22` |
| uids | 164 | 164 | — |
| 辞書の項 | — | ＋1 | `invariants` の `IV-22`（語は空） |
| 設定値の行 ・ 接頭辞 | — | 0 | — |

⚠️ 上は `87d98a47` の写しに本書だけを当てて `md-checks.py` で数えた（13 節）。W1 〜 W5 で先に当てる CR の差を足した木では、前 ・ 後の数はそれぞれ動くが、本書の差（rows ＋1、ほか 0）は同じである。

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

⛔ **当てる順**: W5 の中で `CR-577` → `CR-582` → 本書 → `CR-583`（`JDG-740`）。本書の前に 4 節の旧 9 塊をもう 1 度数えること（13 節の `586-verify.py`）。

```
wave 1  spec + generators + the tests the generated rosters make throw (ONE body)
          recount the 9 old blocks (count == 1 each), then E-01..E-09 in order,
          the two generators of 4.3, npm run gen, and in the same wave the
          IV-22 case of tests/contract/document-invariants.contract.test.ts
          (a table-driven contract: it walks every IV- row of table T-220)
wave 2  code (one implementer, Sonnet) -- section 9 rows 1..6, seam S-1..S-5
wave 3  spec-only tester (a different body; reads docs/spec and section 5 only)
          - a GRS JSON whose TaskVisual says 'milestone' and whose Task says false
            (and the reverse) is refused on open with reason IV-22
          - an MSPDI merge that flips Task/Milestone on a held task leaves the
            visual's shapeKind null, keeps its colours and its row
          - setTaskGroupColor 'black' is refused (CM-30, CV-9); every other name
            the row colour field offers is accepted; a GRS JSON with a black row
            is refused with RS-25
          - ND-1 / ND-2 and the FS rule read Task.milestone only
wave 4  coordinator: break test on the merged tree (drop the IV-22 entry ->
          the refusal cases go red; restore 'black' to the generated choices ->
          the CM-30 case goes red)
```

⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| # | 所（今のパスと関数） | 何を | 毎フレーム |
|---|---|---|---|
| 1 | `src/entity/document-model/schedule/schedule-invariants.ts` の `INVARIANTS`（`IV-21` の項の後）と、開く路 `src/framework/single-html-shell/frame-loop.ts:659`〜`:664`（`noWorkingWeekdayReason`） | S-1 の項を足す。開く路で `IV-22` を拒む（S-5。`DFC-922` との関係は 11 節の問い 2） | **いいえ** —— 開くときに 1 回 |
| 2 | `src/use-case/import-document/import-document.ts:770`〜`:778`（合流の輪） | S-3 | **いいえ** —— 合流のときに 1 回 |
| 3 | `src/use-case/edit-document/edit-task.ts:170` の `isMilestone` と、呼ぶ所 `task-appearance.ts:90`・`task-plan-actual.ts:350`・`:418`・`:470` | S-2（`Task.milestone` を読む） | **いいえ** —— 編集の命令 |
| 4 | `src/adapter/input-command-translator/screen-state-input.ts:112` の `isDrawnAsMilestone` | S-2 | **いいえ** —— 押したときの翻訳 |
| 5 | `src/use-case/edit-document/task-group-look.ts:24`（`setTaskGroupColor`） | S-4（`CM-30` の判定を生成した一覧で） | **いいえ** —— 編集の命令 |
| 6 | `src/adapter/screen-renderer/properties-panel.ts:759-762`（`LEFT_OUT_NAME_OF_HOLDER`）と `:795`〜 の `withColourField` | S-4（欄ごとの一覧を生成物から。枠の透明も同じ形で読む —— 決定 6） | ⚠️ **パネルを描くたびに通る**が、足す仕事は無い —— 手書きの表を、読み込み時に生成物から組む表へ置き換えるだけ |
| 7 | `src/use-case/edit-document/edit-annotation.ts:51`・`:55-57`、`task-appearance.ts:27`、`src/adapter/screen-renderer/properties-panel-drawing.ts:325` | `TRANSPARENT` を `stored-colour.ts:8` から読み、枠の「透明を許さない」を生成した選択肢で判じる（`DFC-1067` の後半。仕様は変えない） | **いいえ**（`properties-panel-drawing.ts` はパネルの描画だが、定数の読み先を変えるだけ） |

⭐ **毎フレームの問い**: `src/entity/layout-engine/schedule-layout/name-label.ts` は **触らない** —— `:66` の `planDatesOf` は既に `task.milestone === true` を読んでおり、`ND-1` の読み分けは裁定と同じである。毎フレームの経路で本書が触るのは 6 の `properties-panel.ts` だけであり、仕事は増えない ⇒ `GRS_PERF` の測り直しは要らない見込み（調整役の判断）。

---

## 10. ⛔ この変更でやらないこと

- `G-1` ・ `AT-30` の文を書かない（既に正を述べている）。
- 取り込みの食い違いを自動で直す形（`JDG-78`）へは変えない —— `DFC-586` が 表 T-220 の全行に一括で当てる。そのとき `IV-22` は「形を `null` へ戻して告げる」候補である（決定 1）。
- 開く路が 表 T-220 のほかの行を読むかどうか（`DFC-922`）を決めない。
- ハイライトボックスの枠・コメントボックスの線と字の許可リストの文を書き直さない（決定 6）。
- 画面の上の編集（`TC-1` ・ `FR-083` ・ `CM-20`）を変えない。
- 新しい理由の行（`RS-`）・新しい語を足さない。`IV-22` の語は利用者が書く（辞書の項は空）。
- 保存済みの文書の読み替え（黒の行・食い違う形）を置かない。

---

## 11. 前に立つ者へ返す問い

| # | 問い | 案 | 推奨と根拠 | 代償 |
|---|---|---|---|---|
| 1 | MSPDI の合流で形を `null` へ揃えたとき、利用者に告げるか | A: 告げない（本書の文）／ B: 合流の報告に「形を揃えたタスク」を名前で並べる（新しい理由の行と語が要る） | **A** —— 取込元でマイルストーンにした（やめた）のは利用者自身の変更であり、揃えた絵はその変更の結果そのものである。B は `JDG-78` の「どこをどう直したか示せ」に近いが、理由の行と語（利用者が書く）が要り、`DFC-586` の告げ方と一緒に決めるほうが揃う | A では、人が選んだ形（矢羽根など）が黙って矩形へ戻る |
| 2 | 開く路で `IV-22` を拒むのを、本書の実装の波でやるか、`DFC-922` を待つか | A: 本書の波で、`IV-17` と同じく `IV-22` だけを開く路で読む ／ B: `DFC-922`（開く路が表 T-220 の全行を読むか）が決まるまで待つ | **A** —— 裁定は「食い違う文書を作らせない」と言っており、B では食い違う `GRS JSON` が黙って開き続ける。行を 1 つずつ足す形は `IV-17` の先例と同じ | 開く路が名指しで読む行が 2 つになり、`DFC-922` が決まったときに 1 つの形へ畳み直す |

⭐ 上の 2 つは、本書の仕様の文（4 節）を変えない —— 1 は `MG-8` の新の文に告げる句を足すかどうか、2 はコードの波の順だけである。答えが出るまで、4 節は当ててよい。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1065` | 取り込んだ文書で、描いた形と `Task.milestone` が食い違うと、名前の札とリンクの型が描いた形に従わない | 本書を当て、9 節の 1 〜 4 を直して閉じる |
| `DFC-1067` | `TaskGroup` の色 'black' を `CM-30` は受けるが、パネルは出さず、描くと主題の帯になる —— パレットの名と `TRANSPARENT` を 5 か所で手で書いている | 本書を当て、9 節の 5 〜 7 を直して閉じる |
| `JDG-701` ・ `JDG-702` | 0.1 節 | ⚠️ `rulings.md` の状態の欄は「指示 —— 変更要求はまだ無い」。調整役が「指示 —— CR-586 が当てる」へ書き換える（本書は `rulings.md` を触らない） |
| `DFC-922` | 開く路が 表 T-220 の `IV-17` しか読まない | 本書は閉じない（11 節の問い 2） |
| `DFC-586` | 取り込みの検証を自動で直す形へ | 本書は閉じない。`IV-22` が候補に加わる（10 節） |

---

## 13. 測り方の再現

```
# the tree: 87d98a47 (branch cr-organise); every file below is LF (CRLF count 0)
git log --oneline -1                                          # 87d98a47

# rulings, verbatim (rulings.md has an uncommitted edit by the coordinator; rows 946-947 are committed)
grep -n "^| JDG-701 \|^| JDG-702 " docs/development-records/rulings.md
grep -n "^| DFC-1065 \|^| DFC-1067 \|^| DFC-922 " docs/development-records/defects.md

# the provisional id is free
git grep -n "90601" -- docs src tests tools change-request     # -> nothing

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py G-1 ND-1 ND-2 FR-009 AT-100 AT-58 IV-21 CV-9 S-315 CM-30
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-220 T-251 T-032 AT-100 RS-25 FR-002 MG-8
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py G-1 ND-1 ND-2 T-251 FR-002 FR-009 AT-30 AT-100 T-220 IV-21 IV-9 FR-023 TC-1 FR-083 CM-20
#   -> 15 of 15, 4 edges, 1 cycle: CM-20 FR-083
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py CV-9 CV-1 CV-6 S-315 T-294 CM-30 FR-042 FR-007 AT-58 AT-121 T-017b RS-25 T-220
#   -> 13 of 13, 18 edges, 1 cycle: CV-6 CV-9 FR-007 S-315
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py MG-8 MG-8a T-032 AT-100 G-1 FR-083 T-220 FR-022 FR-021
#   -> 9 of 9, 1 edge, 0 cycles

# the code readers (decision 5, section 9)
grep -rn "isMilestone\b\|isDrawnAsMilestone\|task.milestone === true" src --include=*.ts
grep -rn "isStoredColour(\|LEFT_OUT_NAME_OF_HOLDER\|const TRANSPARENT" src --include=*.ts
grep -rn "scheduleViolations" src --include=*.ts               # the open path: frame-loop.ts:660 only (DFC-922)
#   "マイルストーン" occurs 116 times in 01-04-requirements.md (str.count, 87d98a47)

# the tracked documents break neither new rule
python <scratch>/draft/586-scan-docs-at-base.py <repo>     # reads the blobs of 87d98a47 (git show)
#   -> documents scanned: 4 ; rule A breaches: 0 ; rule B breaches: 0
#      TaskGroup.color values seen: null 198, lightgray 2, orange 2

# every old block of section 4, today and on the post-apply copy
python <scratch>/draft/586-verify.py <repo> <scratch>/draft
#   edits parsed: 9 (E-01..E-09)
# run on a clean extract: git archive 87d98a47 docs/spec .claude/skills/spec-graph-check change-request
#   (the working tree of this checkout was being edited by W1 while this was drafted)
#   87d98a47: every old block count=1 (E-01, E-02, E-05, E-07, E-09 also as whole lines)
#   overlay: the EDIT blocks of the 8 earlier CRs were applied in wave order to copies of the
#     5 files this CR touches (W1 555, W2 557, W3 558 556 559 560, W4 562 563). Blocks that did
#     not apply there: CR-555 E-18,
#     CR-556 E-04 E-06, CR-562 E-29 (count=0). None of those blocks holds an old block of this CR.
#     CR-559's E-03 (CV-9) applied, so E-06 below was counted after it.
#   overlay: every old block count=1 ; applied 9 of 9, problems 0 (the three JSON files parse)
#   today:   applied 9 of 9, problems 0
#   md-checks on a copy of 87d98a47: before tables=189 figures=28 rows=2364 uids=164
#                                    after  tables=189 figures=28 rows=2365 uids=164 (exit 0)
#   on the same copies: check-spec-holds-no-history.py 0 sites; style-checks.py findings
#   identical before/after once line numbers are ignored
# NOT seen: CR-577, CR-582, CR-583, CR-572, CR-576, CR-571, CR-574, CR-575, CR-561 carry no
#   EDIT blocks, so they were not applied. Instead:
python <scratch>/draft/586-overlap.py <repo>
#   -> for each of the 17 pending CRs: none of this CR's old blocks, whole or by its longest
#      line (CR-582 writes erd.json seat 59, beside E-07's seat 58, not inside it)
#   CR-584, CR-585, CR-587..CR-589 are not in this tree and were not read.
```
