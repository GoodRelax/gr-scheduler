# A06 — README / NEXT-STEPS / NEUTRALIZED-TERMS

- 作成: 2026-08-13
- 担当範囲: 引継ぎの入口（README）・残された宿題（NEXT-STEPS）・言い換えた語（NEUTRALIZED-TERMS）
- 規約: 各行に出典 `ファイル名:行番号` を書く。確かめられないことは **未検証** と明記する。数は自分で数える。

---

## 0. 読んだ文書と行数

| 文書 | 読んだ行 / 総行 | 備考 |
|---|---|---|
| `previous-project-result/README.md` | **351 / 351（全文）** | 指定文書 |
| `previous-project-result/NEXT-STEPS-ja.md` | **433 / 433（全文）** | 指定文書 |
| `previous-project-result/NEUTRALIZED-TERMS-ja.md` | **121 / 121（全文）** | 指定文書 |
| `previous-project-result/OPEN-ITEMS-ja.md` | 126 / 126（全文） | 照合のため追加で読んだ（README の「4 件」と NEXT-STEPS の「3 件」の食い違いを判定するため） |
| `docs/spec/_assets/tbl-settings.md` | 185–214 ／ 285–304（部分） | 照合のため。`fontScale` の px と目盛しきい値の確認だけ |
| `docs/spec/01-04-requirements.md` | grep による該当箇所のみ（部分） | `FR-063` と WBS クランプの確認だけ |

**機械で数えた値**（自分で実行して得た数。出典は各節）

| 数えたもの | 実測 | コマンドの要点 |
|---|---:|---|
| `previous-project-result/` の全ファイル数 | **72** | `find . -type f`（うち `temp/` が 28） |
| `temp/` を除くファイル数 | **44** | 同上 |
| `temp/` を除く `.md` の数 | **39** | `find -name "*.md" -not -path "./temp/*"` |
| `authority:` を持つ文書 | **4** | `grep -rl "^authority:"` |
| NEXT-STEPS の未決件数 | **16** | 節を自分で数えた（§4） |
| `user-order.md` の項番の最大 / 欠番 | **69 / 3**（11・14・52） | `grep -oE "^[0-9]+\. "` |
| `DECIDED-ja.md` の行数 / 表本文行 | **354 / 193** | `wc -l` ／ `grep -c "^|"` − ヘッダ行と区切り行 |

---

## 1. README が示す文書の地図

### 1-1. 読む順の表（`README.md:149`–`174`。**自分で数えて 24 行**）

| 順 | 対象 | 何を持つと書いてあるか | 出典 | 実在 |
|:--:|---|---|---|:--:|
| 1 | `user-order.md` | 次期開発の入力そのもの。項 1〜69、欠番 11/14/52 で実質 **66 項目** | `README.md:151` | ○ |
| 2 | `01-mspdi/mspdi-pitfalls-ja.md` | MSPDI 実装の落とし穴 | `README.md:152` | ○ |
| 3 | `01-mspdi/mspdi-enums-ja.md` | enum 全数（**53 要素 / 535 値**） | `README.md:153` | ○ |
| 4 | `01-mspdi/mspdi-core-tree.md` ／ `mspdi-tables.md` | MSPDI の構造・**全 29 テーブル**の責務 | `README.md:154` | ○ |
| 5 | `04-performance/performance-notes-ja.md` | 効いた手 / 効かなかった手 / 罠 / 実測基準線 / 参考実装の設計要点 | `README.md:155` | ○ |
| 6 | `02-data-model/data-model-entry-ja.md` | データ構造の入口・読む順・JSON 実例 | `README.md:156` | ○ |
| 7 | `02-data-model/grs-mspdi-field-ledger-ja.md` | 全要素の取捨選択（Own / Consume / Reconstruct / Carry / Drop） | `README.md:157` | ○ |
| **8** | `02-data-model/grs-native-erd-ja.md` | **データ構造の正**。ERD・識別子・マージ・Carry ストア・往復規約 | `README.md:158` | ○ |
| **8a** | `02-data-model/grs-document-settings-ja.md` | **設定値の正**。描画 **57 項目** ＋ 表示状態 ＋ 出力 ＋ LOD、保存しない **9 項目** | `README.md:159` | ○ |
| 8b | `02-data-model/property-mspdi-mapping-ja.md` | プロパティ全項目の MSPDI 対応・進捗と実績・格納方式 3 案 | `README.md:160` | ○ |
| **9** | `03-ui-naming/ui-parts-ja.md` | **命名の正**。語彙 6 系統 → 3 語。面ごとの記法と語幹一致 | `README.md:161` | ○ |
| 9b | `03-ui-naming/ui-detail-spec-ja.md` | UI 詳細仕様。4 部構成・上部ボタン・パレット・掴み領域・操作割当・自動レイアウト | `README.md:162` | ○ |
| **10** | `07-plan-actual/plan-actual-decisions-ja.md` | **予実の正**。⚠️ 8b と 9b の予実まわりを**上書きする**（同書 §11 に差分の全数） | `README.md:163` | ○ |
| 11 | `05-security-a11y/security-design.md` | 脅威モデル・JSON / MSPDI XML の検証・単一 HTML の CSP。⚠️ SVG/PNG 取込の節は**対象機能が取り下げ済み** | `README.md:164` | ○ |
| 12 | `05-security-a11y/a11y-wcag21-aa-checklist.md` | WCAG 2.1 AA チェックリスト | `README.md:165` | ○ |
| **13** | **（行が無い）** | ⚠️ 表に 13 行目が存在しない。**`README.md:176` は「13 は経緯」と参照している** | `README.md:176` | — |
| 14 | `08-poc/` | 動く PoC（`poc-integrated.html` 1 本・6 タブ）。書き戻し **13 件**（§6 の 6 ＋ 末尾表の 7）棚卸し済み | `README.md:166` | ○ |
| 15 | `09-architecture/architecture-entry-ja.md` | 描画方式 = SVG の結論の所在／不変更新ストアの設計が無いこと／**モジュール構成と技術スタックは意図的な空白** | `README.md:167` | ○ |
| 15b | `09-architecture/architecture-layering-draft-ja.md` | 層仕訳の推奨案。⚠️ `status: draft`、**決定ではない** | `README.md:168` | ○ |
| **16** | `10-agent-interface/` | 機械向けインターフェース。**要求 17 件・API 契約・実測 8 件・決定 6 件・サンプル JSON 2 本**。中心は「口は 2 つあるが、文書は 1 つ」。**`authority` は持たない** | `README.md:169`／`README.md:322` | ○ |
| — | `MILESTONES-ja.md` | 節目 6 つ（M0 設計 → M1 骨格 → M2 データと入出力 → M3 核機能 → M4 予実 → M5 仕上げ）と性能ゲート | `README.md:170` | ○ |
| — | `DECIDED-ja.md` | 決まっていることの索引「**175 行**」。⚠️ 実測 **354 行**（§7 C-2） | `README.md:171` | ○ |
| — | `NEXT-STEPS-ja.md` | 実開発ステップ別の欠落 **16 件** | `README.md:172` | ○ |
| — | `OPEN-ITEMS-ja.md` | 実機確認の残件 **4 件** | `README.md:173` | ○ |
| — | `NEUTRALIZED-TERMS-ja.md` | 中立化の記録 | `README.md:174` | ○ |

### 1-2. ⚠️ 引継書の地図に無いもの

**まず事実を 1 つ確定させる。** `README.md:230`–`320` のフォルダ構成ツリーは、`temp/` を除く **44 ファイルの全数を列挙しており、漏れは 0 である**（`find . -type f` で数えた 44 と一致）。
**`10-agent-interface/` は README の地図に載っている**（`README.md:169` の読む順 16 行目、`README.md:301`–`309` のツリー）。
したがって **「地図に無かった」のは README ではない。** 抜けたのは README を読み替えて作られた下流の資産地図の側である。

| 種別 | 対象 | どこに無いか | どこには有るか |
|---|---|---|---|
| **①どの地図にも無い** | **`previous-project-result/temp/`（28 ファイル。うち `inventory/` 11 枚）** | `README.md` 全文に `temp/` の記載は **0 件**（`grep -rn "temp/"` で非 `temp` の `.md` にヒット無し） | 実在するのみ。**`.gitignore:37` が `previous-project-result/temp/` を丸ごと除外している**（`git check-ignore -v` で確認）。在庫表 11 枚は **Git に載っていない** |
| ②読む順に無い（ツリーには有る） | `DISCARDED-ja.md` | `README.md:149`–`174` の表に行が無い | `README.md:237`（ツリー）／`README.md:341`（§4 で参照） |
| ②同 | `20-spec-template/`（`00-ai-guide.md` / `01-ai-queries.md` / `spec-template.md` / `spec-writing-rules.md` / `spec.sgra` の **5 本**） | 同上 | `README.md:311`–`316` |
| ②同 | `21-review-standard/review-standards.md` | 同上 | `README.md:318`–`319` |
| ②同 | `03-ui-naming/appheader-palette-icons.html` | 同上（⚠️ **アイコンの図形と配置の正**であり、次期仕様書が名指し参照している） | `README.md:260`–`268` |
| ②同 | `08-poc/README.md` / `08-poc/POC-SPEC-ja.md` | 読む順 14 行目は `poc-integrated.html` と `POC-RESULTS-ja.md` しか名指ししない（`README.md:166`） | `README.md:285`–`286` |
| ②同 | `01-mspdi/mspdi/README.md` | 読む順の表に行が無い | `README.md:116`（散文）／`README.md:247` |
| ②同 | `10-agent-interface/` の **6 ファイル中 5 本**（`agent-interface-spec-ja.md` / `-samples-ja.md` / `-open-items-ja.md` / `ai-cowork-trial-findings-ja.md` ＋ `samples/` の JSON 2 本） | 読む順 16 行目は入口 `agent-interface-requirements-ja.md` だけを名指し（`README.md:169`） | `README.md:302`–`309` |
| ③番号が飛んでいる | 読む順の **13** | 表に 13 行目が無い | ⚠️ `README.md:176` が「13 は経緯」と参照する。`06-background/` は実在せず、`README.md:223`–`224` が同フォルダの 2 文書を破棄済みと書く |

> **効き方**: ①は「在庫表そのものが Git 管理外」という運用の穴。②は「読む順だけを追った読み手は、`appheader-palette-icons.html`（アイコンの正）と `20-spec-template/`（仕様書の書き方）に一度も出会わない」という漏れ方をする。**今回の `10-agent-interface/` の取りこぼしと同じ形**である。

### 1-3. README が定める「正」の構造（設計に効く）

| # | 決定 | 出典 |
|:--:|---|---|
| M-1 | **`authority:` を持つ文書だけがその領域の唯一の正。5 つ目を作らない。** `naming` = `ui-parts-ja.md` ／ `data-model` = `grs-native-erd-ja.md` ／ `plan-actual` = `plan-actual-decisions-ja.md` ／ `document-settings` = `grs-document-settings-ja.md` | `README.md:58`–`70`（実測 4 件で一致） |
| M-2 | `type` の 8 種と扱い。**`Background` は仕様として採用しない**（根拠の出典として引くのは正）。**`Frozen Record` は追随させない**（食い違ったら他方が正） | `README.md:41`–`50` |
| M-3 | **段階が新しいほうが正とは限らない。** 正否は `type` と `authority` で決まる | `README.md:56` |
| M-4 | **数値（寸法・既定値・範囲）の正は 8a**（`grs-document-settings-ja.md`）。他の文書の数値は説明のための再掲 | `README.md:177` |
| M-5 | **`07-plan-actual/plan-actual-decisions-ja.md` は 8b と 9b の予実まわりを上書きする。** 差分の全数は同書 §11 | `README.md:163`／`README.md:281` |
| M-6 | **`10-agent-interface/` は `authority` を持たない。** 用語の正は 4 文書のまま | `README.md:169`／`README.md:322` |
| M-7 | **MSPDI の事実は必ず正本 XSD で検証する。XSD はこのリポジトリに入っていない**（複製は `docs/reference/mspdi/` ＝ 本フォルダの外・git 管理外）。**日本語要約は参考であって正ではない**（実際に誤りが複数あった） | `README.md:101`–`118` |
| M-8 | **XSD が手元に無く Web にも出られないときは「未検証」と書く。推測を断定で書かない** | `README.md:120`–`121` |
| M-9 | **前プロジェクトの記録番号（`CR-` / `DEF-` / `DEC-` / `ADR-` / `RISK-` / `IO-L1-` 等）は無視してよい。次期は自分の番号体系を振り直す** | `README.md:123`–`131` |
| M-10 | **コードは引き継がない。コピペ禁止。** 例外として設計要点を言語化した 3 領域（依存線の自動配線／多段レイアウト／ズーム・パンの描画経路）が `04-performance/performance-notes-ja.md` §4 にある | `README.md:81`–`91` |
| M-11 | **骨格の段階で性能を実測してから機能を積む。** 前プロジェクトは M1 で 1 回測ったきりで、**完成版を一度も計測しなかった** | `README.md:93`–`98` |

---

## 2. データモデルに効く決定

| # | 決定 | 出典 |
|:--:|---|---|
| D-01 | **JSON のトップレベルに `revisionStamp`（`revision` / `lastEditedBy` / `updatedAt` の 3 キー）と `changeLog` を含める。** 形は `10-agent-interface/samples/grs-document-with-revision-stamp.json` | `NEXT-STEPS-ja.md:335`–`339` |
| D-02 | **`agentApiVersion` は含めない。** 書いた側の都合であって日程表の情報ではなく、入れると版が上がるたびに全ファイルの diff が出る | `NEXT-STEPS-ja.md:337`–`338` |
| D-03 | **`revisionStamp` は MSPDI へ書き出さない**（往復無損失の対象外） | `NEXT-STEPS-ja.md:340` |
| D-04 | **`revisionStamp` に `documentId` を入れない。** 識別子は「版」ではないので名前と中身がずれる（決定-3 は 3 キーで確定） | `NEXT-STEPS-ja.md:318`–`319` |
| D-05 | **`documentId` が要る。効く先は 3 つ** —— 自動保存のキー／起動時の 4 分岐の判定／埋込文書つき GRS のファイル名。**自動保存のキーは `grsched.autosave.<documentId>`** | `NEXT-STEPS-ja.md:309`／`NEXT-STEPS-ja.md:259`／`NEXT-STEPS-ja.md:313` |
| D-06 | **`file://` では localStorage も IndexedDB も全ローカルファイルで共有される**（実測）。識別子が無いと素の GRS・埋込文書つき GRS・古い複製が同じ鍵を奪い合う。**2 窓同時は現実に起きる構成** | `NEXT-STEPS-ja.md:260`–`262`／`NEXT-STEPS-ja.md:314`–`316` |
| D-07 | **`language` を `documentSettings` に入れてはならない。** 置き場は `localStorage`。読めないときはブラウザの言語設定に従う。対象言語は **en / ja の 2 つだけ**、項目名は `language`、値は `ja` / `en` | `NEXT-STEPS-ja.md:139`–`143`／`NEXT-STEPS-ja.md:136` |
| D-08 | **翻訳の対象はメニューとパネルの文字だけ。タスク名・行名はデータなので対象外** | `NEXT-STEPS-ja.md:136` |
| D-09 | **i18n キーの記法は snake_case**（記法の正は `ui-parts-ja.md` §1-2） | `NEXT-STEPS-ja.md:136` |
| D-10 | **`documentSettings` は常に全項目を書き出す**（既定値と一致していても省略しない） | `NEXT-STEPS-ja.md:208`–`210` |
| D-11 | **既定値未定の 16 キーは全て埋まった。** 内訳は「値を入れた 15 キー」＋「キーを廃止した 1 キー」 | `NEXT-STEPS-ja.md:282`–`290` |
| D-12 | **`progressLineColor` を廃止した。** イナズマ線の色を文書に保存すると `themeHue` を変えたときこの線だけ取り残される。**依存線と同じ固定色**にする | `NEXT-STEPS-ja.md:290` |
| D-13 | **既定値の由来が無い 3 キー**（`themePreference` / `rowTitlePanelWidth` / `propertyPanelWidth`）は**次期が選び直してよい** | `NEXT-STEPS-ja.md:289` |
| D-14 | **目盛のしきい値 3 本を `1 / 4 / 14` → `1.4 / 4.3 / 30` に決め直した。** 旧値は目安を 3 つとも割っていた | `NEXT-STEPS-ja.md:292`–`293` |
| D-15 | **`rulerHeight` 既定 34 → 48px、下限 `rulerFont + 6` → `rulerFont × 3 + 6`。帯の高さは目盛の段階によらず固定**（`zoomX` → 段階 → 高さ → `zoomY` の循環を消した） | `NEXT-STEPS-ja.md:401` |
| D-16 | **`grs-document-settings-ja.md` §4-2 の 9 キーに下限・上限の列を新設した**（列そのものが無かった）。無いとパネル幅が画面を食い尽くし `Fit` が定義できず、取込の検証（項 62）もできない | `NEXT-STEPS-ja.md:402` |
| D-17 | **`fontScale` は `'S'` / `'M'` / `'L'` の 3 値で文書に保存する。既定は `'M'`。読む人が変更でき、変更したら文書の編集になる。和文の可読下限は 12px** | `NEXT-STEPS-ja.md:216` |
| D-18 | **色は疎な上書き。`null` = テーマから解く、値 = 人の指定。「既定へ戻す」は `null` を代入する操作である** | `NEXT-STEPS-ja.md:152`–`154` |
| D-19 | **透明は `'transparent'` という値で表す。`null` へ戻す札とは別物。塗りと輪郭を同時に透明にはできない** | `NEXT-STEPS-ja.md:156`–`159` |
| D-20 | **`TaskGroup.color`（行色）にも「既定へ戻す」入口が要る**（編集入口は現在どの文書にも書かれていない） | `NEXT-STEPS-ja.md:155` |
| D-21 | **担当者の欄は読取専用ではない。** 文書内の資源から選ぶ／新しい名前を入れる の両方ができること。規則の正は `grs-native-erd-ja.md` §5.5a-2 | `NEXT-STEPS-ja.md:161`–`163` |
| D-22 | **初期テンプレートを埋込文書の入れ口に置いてはならない。** 入れ口が `null` でないとクラッシュ復旧の 4 分岐が壊れる。**投入経路は 埋込文書 → URL パラメータ → 自動保存 → 初期テンプレート の順で、テンプレートは最下位** | `NEXT-STEPS-ja.md:200`–`204` |
| D-23 | **旧 `gr-scheduler.schema.json` は流用しない。** 予定日付が `startDate` / `endDate` で確定名 `start` / `finish` と食い違う | `NEXT-STEPS-ja.md:332`–`333` |
| D-24 | **MSPDI の必須は 4 種だけ** —— `Project/SaveVersion`・`Project/CurrencyCode`・`Task`/`Resource`/`Assignment`/`Calendar` の `UID`・`WeekDay/DayType`。**`Project/UID` は省略可**。`elementFormDefault="qualified"`、トップレベル要素は `Project` 1 つ、宣言順の全数は `Project` 70 / `Task` 96 / `Resource` 71 / `Assignment` 265。文字コードは UTF-8・BOM なし | `NEXT-STEPS-ja.md:346` |
| D-25 | **同時更新まわりの 4 語が確定** —— `ConcurrentUpdate` / `BaseRevisionCheck` / `AutomaticReconciliation`（延期中） / `ImportMerge`。**使わないと決めた語** = `Conflict` / `Collision` / `Resolution` / 裸の `Merge` / 裸の `Lock` | `NEXT-STEPS-ja.md:230` |
| D-26 | **識別子は 1 つも増えない。`baseRevision` / `stale-base-revision` / `expectedRevision` は変えない** | `NEXT-STEPS-ja.md:237` |
| D-27 | **WBS の深さはクランプしない**（中立化の過程で「5 段にフラット化される」という文自体が削除された）。正は `grs-native-erd-ja.md` §5.5e | `NEUTRALIZED-TERMS-ja.md:94` |
| D-28 | **`sourceProjectUid` の実例値は `EXT-WBS-2026`**（役割名 `EXTernal WBS` に揃えた。旧 `IQV-2026`）。**例示データの中の識別子も中立化の対象である** | `NEUTRALIZED-TERMS-ja.md:40`–`44` |
| D-29 | **外部マスタの再取込 UID 照合は「ある商用 WBS マスタツールの実挙動」で検証したものであり、全ての対向ツールがそう振る舞う保証はない。接続する相手ごとに実機で確かめてから設計を固める** | `NEUTRALIZED-TERMS-ja.md:93` |
| D-30 | **変更前予定は別ファイルの読取専用スナップショットで持つ（「P6 式」）。ERD の一級エンティティにしない** | `NEUTRALIZED-TERMS-ja.md:83`（方式名の出典）／実体は `grs-native-erd-ja.md:1719` |

---

## 3. アーキテクチャに効く決定

| # | 決定 | 出典 |
|:--:|---|---|
| A-01 | **描画層が `document` に触れない構成にすること**（DOM 非依存の純粋関数。**SVG 文字列を返す**）。3-3 / 3-4 を決めるときのレビュー観点として登録済み | `NEXT-STEPS-ja.md:267`–`269` |
| A-02 | **機械向けの口は `globalThis.grSchedulerAgentApi` ちょうど 1 つ。既定は非公開で、素の GRS を開いただけでは存在しない** | `NEXT-STEPS-ja.md:270` |
| A-03 | **「口は 2 つあるが、文書は 1 つ」** が `10-agent-interface/` の中心 | `README.md:169` |
| A-04 | **層仕訳の推奨案** —— 中核計算を entity、操作層（コマンド・revision・基準版の照合・Undo・検証・変更理由）を use case、**UI と機械向けの口を同格の adapter** に置く。⚠️ **`status: draft` で決定ではない** | `NEXT-STEPS-ja.md:254`–`257`／`README.md:168` |
| A-05 | **描画方式 = SVG の裏付けは「推奨 1 件と PoC の前提 1 行だけ」。追認が要る**（3-1 は未決） | `NEXT-STEPS-ja.md:248` |
| A-06 | **状態管理／不変更新ストアは、既存の決定 2 件がこれを前提にしているのに設計が無い**（3-2 は未決） | `NEXT-STEPS-ja.md:249`／`README.md:167` |
| A-07 | **モジュール構成と技術スタックは「意図的な空白」**（3-3 / 3-4） | `NEXT-STEPS-ja.md:250`–`251`／`README.md:167` |
| A-08 | **localStorage はプレフィックス ＋ キーの分け方が確定。自動保存のキーは文書ごとに分ける（`grsched.autosave.<documentId>`）。スキーマ移行手順は未定** | `NEXT-STEPS-ja.md:252`／`NEXT-STEPS-ja.md:259`–`263` |
| A-09 | **アーキテクチャ文書に ADR-000「最小構成との比較」が存在しなければ、内容の巧拙以前に違反**（レビュー観点規約 R2.18 MUST）。要求を満たす最小の構成・増やした要素・**どの規約がどの要求のために働いたか**まで書く | `NEXT-STEPS-ja.md:272`–`275` |
| A-10 | **UI の面が 3 つ増えている** —— ① チャット欄 ② 機械向けの口を有効にする面と有効な間の常時表示 ③ 起動時の保留用件を集めた 1 枚。**③ を 1 枚にまとめるのは `file://` の権限復帰でどのみち 1 クリックが要るため** | `NEXT-STEPS-ja.md:113`–`117` |
| A-11 | **`Toast` に入れてはならないものが 2 つ** —— ① 起動時の保留用件（流れて消えてはいけない） ② 機械向けの口が有効な間の表示（常時表示であって通知ではない） | `NEXT-STEPS-ja.md:189`–`191` |
| A-12 | **通知の発生源は既に 8 系統**（取込で届かなかった N 件／連鎖削除の件数／`Work` 系を温存したこと／Carry の予約枠満杯のフォールバック／`stackSafetyCap` 到達／自動保存の成否／取込バリデーションの拒否・警告／localStorage 破損）。設計はこの 8 つを収容すること | `NEXT-STEPS-ja.md:176`–`187` |
| A-13 | **対象環境の確定 5 件** —— ブラウザは Chromium 系基準・Firefox は動作確認・**Safari 対象外**／OS は問わない／**タッチ・モバイルは対象外**（WCAG 2.5.5 は AA 判定に数えない）／性能の基準機は実測記録済みで**基準 GPU は内蔵**／CSP の `img-src` は `data:` | `NEXT-STEPS-ja.md:53`–`57` |
| A-14 | **測る前にブラウザを内蔵 GPU へ固定すること**（基準機は GPU が 2 つあり、固定しないと OS が切り替えて数字が揺れる） | `NEXT-STEPS-ja.md:59`–`60` |
| A-15 | **「WCAG 2.1 AA 適合」とは名乗らない。AA を指針とし、視覚と操作に絞る。読み上げは対象外**（条文に部分適合が無い。5.2.1「met in full」） | `NEXT-STEPS-ja.md:70`–`85` |
| A-16 | **レベルを A に下げる案は採らない（逆効果）** —— 読み上げの核は Level A に集中し、動機そのものは AA にある。**レベルという刃では分けられない** | `NEXT-STEPS-ja.md:86`–`88` |
| A-17 | **`1.3.1` だけは別枠で残す** —— 適合範囲の外だが「画面とデータを分離した」が本物かを外から測る指標として、骨格段階で試す | `NEXT-STEPS-ja.md:90`–`91` |
| A-18 | **`Fit` は「全体が収まる」ことを保証しない。** 保証するのは「WBS と `TaskGroup` の深さを試したうえで収まる最大のズームに着地する」ことだけ。**縦は畳めるが横は畳めない**。**中央寄せはデータ形式が表現できない** | `NEXT-STEPS-ja.md:387`–`392` |
| A-19 | **LOD で消えたタスクのために場所を空けない**（画面は資源である） | `NEXT-STEPS-ja.md:390`–`391` |
| A-20 | **目標規模の 50 行は全部 1 段でも縦に入らない**（1 行 1 段の最小占有が約 30px、入るのは約 32 行）。最優先事項 3 は **`TaskGroup` を畳んで初めて成り立つ** | `NEXT-STEPS-ja.md:394`–`395` |
| A-21 | **LOD のレベル減に式は立てない。** 深さ 5〜1 を順に試し、実際の行数からフォントが下限を上回る最初の深さを採る（**推定が 1 つも入らない**） | `NEXT-STEPS-ja.md:360`–`364` |
| A-22 | **依存線は横切りを許容し、重ね順で解く** —— **バーより前面・名称ラベルより背面**。行をまたいでも避けようとしない | `NEXT-STEPS-ja.md:373`–`374` |
| A-23 | **依存線のアンカーは右辺の中央・左辺の中央の 2 種類のまま。** `link_type` が組合せを選ぶだけで、SF / SS は x を反転して同じ規則に載る | `NEXT-STEPS-ja.md:375`–`376` |
| A-24 | **依存線の経路は 8 パターン・形は 3 種類**（水平 1 本 / 2 折れ / 通路経由の 4 折れ）。折れ点の上限は 0〜4。**新しい設定値キーは 1 つも増えない** | `NEXT-STEPS-ja.md:377`–`378` |
| A-25 | **アイコンは全て線画。20×20 のデザイングリッドで作画し太さを揃える** | `NEXT-STEPS-ja.md:123` |
| A-26 | **タスク形状 4 種はアイコンではなく描画対象**で、作図の幾何まで確定済み（`chevronNotchOfHeight` / `arrowHeadOfStroke` / `spanDotOfStroke` ほか）。**マイルストーン 8 種は形状の集合と並び順（面積の大きい順）だけ確定** | `NEXT-STEPS-ja.md:127`–`130` |
| A-27 | **節目は再計測が済むまで閉じない**（前プロジェクトはここで死んだ）。**M1 は機能を持たない骨格で、そこで描画方式が決まる** | `README.md:170` |
| A-28 | **`innerHTML` 直挿し禁止・XXE 無効化は設計時点の判断** | `README.md:333` |
| A-29 | **画面とデータを分離する**（`user-order.md` 67） | `README.md:331` |

> **数**: データモデル 30 件（D-01〜D-30）＋ アーキテクチャ 29 件（A-01〜A-29）＋ 正の構造 11 件（M-1〜M-11） = **70 件**（自分で数えた）。

---

## 4. 未決のまま残っている件

### 4-1. NEXT-STEPS の残件（**自分で数えて 16 件**。文書の自己申告 `NEXT-STEPS-ja.md:420` と一致）

| ステップ | 節 | 決めること | 出典 |
|---|---|---|---|
| 2 UI モック | 2-1 | **視覚モックの絵が 1 枚も無い。** PoC には `Command Palette` / `Watermark` / `Comment Boxes` / `Highlight Boxes` が **6 本すべてに 0 件** | `NEXT-STEPS-ja.md:108` |
| 2 | 2-2 | **アイコンの図形が 0 件**、かつ **必要数が確定しない**（確定は App Header **8 個**、現行 **11 個**。`Cmd` / `SS` / `Theme` の行き先が書かれていない）。六角形の向き・五角形の回転など作図の幾何も未定 | `NEXT-STEPS-ja.md:124`／`NEXT-STEPS-ja.md:130` |
| 2 | 2-3 | **キー付きの表示文字列カタログが 0 件**（ボタン文言・ツールチップ・通知メッセージ） | `NEXT-STEPS-ja.md:137` |
| 2 | 2-4 | **Properties Panel の UI 設計** —— グループ分け／入力ウィジェット／編集可否／バリデーションの見せ方／フォーカス順。UI パーツ木で **`Properties Panel` だけ子ノードが 1 行も無い**。⚠️ **ドラッグ操作の WCAG 2.1.1 適合をこのパネルに預けており、到達性は未検証** | `NEXT-STEPS-ja.md:150`／`NEXT-STEPS-ja.md:165`–`167` |
| 2 | 2-5 | **`Toast` が UI パーツ木に無い**（ヒット 0）。表示位置・滞留時間・多重時の積み方・i18n が未定 | `NEXT-STEPS-ja.md:174` |
| 2 | 2-6 | **初期テンプレートの中身が 0 件**（何行・何タスク・どの設定値を持つか）。⚠️ **`revisionStamp` の初期値も決める** | `NEXT-STEPS-ja.md:198`／`NEXT-STEPS-ja.md:206` |
| 2 | 2-7 | **`fontScale` の S / M / L が何 px か。** ⚠️ **§7 C-4 参照 —— 新仕様側では既に決まっている** | `NEXT-STEPS-ja.md:217` |
| 2 | 2-8 | **`ImportMerge` を命名の正（`ui-parts-ja.md` §2-1）へ通すかどうか** | `NEXT-STEPS-ja.md:231` |
| 3 アーキ | 3-1 | 描画方式の追認 | `NEXT-STEPS-ja.md:248` |
| 3 | 3-2 | 状態管理／不変更新ストアの設計 | `NEXT-STEPS-ja.md:249` |
| 3 | 3-3 | モジュール／ディレクトリ構成 | `NEXT-STEPS-ja.md:250` |
| 3 | 3-4 | 技術スタック | `NEXT-STEPS-ja.md:251` |
| 3 | 3-5 | localStorage の**スキーマ移行手順**（キーの分け方は決着済み） | `NEXT-STEPS-ja.md:252`／`NEXT-STEPS-ja.md:263` |
| 4 データ | 4-2 | **`documentId` を `grs-native-erd-ja.md` へ入れる。** 型・生成規則・往復での扱い（MSPDI へ出すか） | `NEXT-STEPS-ja.md:310` |
| 5 入出力 | 5-1 | **機械可読な JSON Schema が 0 件**（型・必須・値域）。無いと項 62（取込の厳格検証）が実装できない | `NEXT-STEPS-ja.md:330` |
| 5 | 5-2 | **往復に使う代表 MSPDI 文書 1 本。** Own / Consume / Reconstruct / Carry / Drop を一通り踏むもの。**次期のリポジトリで作る**（本資産に置くとコードと乖離する） | `NEXT-STEPS-ja.md:347`–`350` |

**内訳の検算**: ステップ 2 = 8 ／ 3 = 5 ／ 4 = 1 ／ 5 = 2 ／ 1 と 6 = 0 → **合計 16**。`NEXT-STEPS-ja.md:38` の M0/M1/M2 割り当て（8 / 5 / 3）とも一致する。

> ⚠️ **節の数え方に注意**: 2-2 は「決めること」が **① 図形が 0 件 ② 必要数が確定しない** の **2 件**である（`NEXT-STEPS-ja.md:124`）。**節を数えると 16、論点を数えると 17 になる。** 16 は節の数である。

### 4-2. NEXT-STEPS の外に残る未決

| # | 未決 | 出典 |
|:--:|---|---|
| O-1 | **実機確認の残件 4 件**（`Number` 枠の上限／`PercentComplete` 100 超の扱い／完了タスクの `Stop`/`Resume`／GRS が書いた `Resource`/`Assignment` を MS Project がどう扱うか）。所要 20 分 | `README.md:173`／`OPEN-ITEMS-ja.md:11`–`12` |
| O-2 | **`10-agent-interface/` の未決 2 件（いずれも延期）** —— 自動調停の要否（＝多人数編集を実装するとき）／エージェントの寿命と追いつき（＝サーバを立てるとき） | `NEXT-STEPS-ja.md:429`–`433` |
| O-3 | **WCAG「要対応 19 件」** —— 満たし方が書かれていない。**次期の実装作業であって本資産の欠落ではない**（何を満たすかは全数そろっている） | `NEXT-STEPS-ja.md:82`／`NEXT-STEPS-ja.md:96`–`97` |
| O-4 | **`appheader-palette-icons.html` §6 に「確定済み文書への書き戻し 8 件」が未処理。** 特に「決着 D」は `ui-detail-spec-ja.md` §4-4 の確定（**予定＝破線 / 実績＝実線**）を覆すと宣言しながら書き戻していない。**両方を読むこと** | `README.md:265`–`268` |
| O-5 | **依存線の SF（①〜⑤ の鏡像）と FF / SS（⑥⑦⑧）は絵で確かめられていない。** PoC は FS の 5 例しか描いておらず `Frozen Record` なので追随させない。視覚モックで最初に描くこと | `NEXT-STEPS-ja.md:380`–`381` |
| O-6 | **`fontScale` の px を決めたら、目盛のしきい値 3 本が最大のフォントでも成り立つかを検算すること**（間引けるのは日の段だけ。年月・週の段は間引かない） | `NEXT-STEPS-ja.md:220`–`224` |

---

## 5. 廃棄・撤回された決定（**生きている決定と混ぜない**）

| # | 廃棄・撤回されたもの | 理由 | 出典 |
|:--:|---|---|---|
| X-01 | **設定値キー `progressLineColor`** | 文書に保存すると `themeHue` を変えたときイナズマ線だけ取り残される | `NEXT-STEPS-ja.md:290` |
| X-02 | **目盛のしきい値 `1 / 4 / 14`** | §6-3 の目安を 3 つとも割っていた。→ `1.4 / 4.3 / 30` | `NEXT-STEPS-ja.md:292`–`293` |
| X-03 | **`rulerHeight` 既定 34px / 下限 `rulerFont + 6`** | 段階 4 の 3 段を収容できなかった。→ 48px / `rulerFont × 3 + 6` | `NEXT-STEPS-ja.md:401` |
| X-04 | **`user-order.md` 項 11（絵文字）／項 14（アイコンの SVG / PNG インポート）** | 取り下げ。「やらないこと」へ移した | `README.md:151`／`user-order.md:140`／`user-order.md:143` |
| X-05 | **`user-order.md` 項 52（予実の重ね表示／上下分離表示の切り替え）** | 廃止 | `user-order.md:395` |
| X-06 | **`security-design.md` の SVG / PNG 取込の節** | **対象機能が取り下げ済み**。冒頭の注記を先に読むこと | `README.md:164` |
| X-07 | **旧 `gr-scheduler.schema.json` / `40-data-format.sdoc`** | 旧 flat 形状。`startDate` / `endDate` が確定名と食い違う | `README.md:348`／`NEXT-STEPS-ja.md:332`–`333` |
| X-08 | **`old/gr-scheduler-template.json`** | **廃止済みの予実別行モデル**で書かれ、行 id に制御文字を含む | `README.md:349`／`NEXT-STEPS-ja.md:197` |
| X-09 | **前プロジェクトの ja/en 対訳** | パーツ名が確定名に変わったので使えない | `NEXT-STEPS-ja.md:137` |
| X-10 | **前プロジェクトの視覚モック** | 視覚的な目標としては有効だが**コピペ誘因**になる | `NEXT-STEPS-ja.md:110`–`111` |
| X-11 | **`docs/spec/glossary.md`（前プロジェクトの用語集）** | 旧名で書かれているため外した | `README.md:191` |
| X-12 | **既存ツール比較の調査記録（513 行・実名比較 46 箇所）** | 特定製品の評価×特定業種が前提。結論は `user-order.md`「それはどうして？」に吸収 | `README.md:194`／`NEUTRALIZED-TERMS-ja.md:73` |
| X-13 | **`.sdoc` 19 本（293 要求）** | 陳腐化を含み `user-order.md` に吸収済み | `README.md:347` |
| X-14 | **`src/` / `tests/` 一式** | 全て旧名。**コピペ禁止** | `README.md:346` |
| X-15 | **PoC の案比較 5 本**（2026-08-02 に外した） | 結論と数値は `POC-RESULTS-ja.md` に残っている。**PoC は `poc-integrated.html` 1 本だけ** | `README.md:287`–`289` |
| X-16 | **「export すると外部マスタの WBS も 5 段にフラット化される」という記述** | **WBS の深さはクランプしないことに確定したため、文自体が削除された**。中立化の記録としてのみ残る | `NEUTRALIZED-TERMS-ja.md:94` |
| X-17 | **「依存線の経路 全 6 件」という件数** | 一覧がどこにも無い（2026-08-04 に数を落とした）。**数だけを引き写さないこと** | `NEXT-STEPS-ja.md:370`–`371` |
| X-18 | **`06-background/handover-stale-spec-audit-ja.md` / `handover-user-order-diff-ja.md`** | 破棄済み。改名の対象でもない | `README.md:223`–`224`（`06-background/` はディスク上に存在しない） |

---

## 6. 中立化した語の一覧

**規模**: `previous-project-result/` 配下 **6 ファイル・約 60 箇所**を置換（`NEUTRALIZED-TERMS-ja.md:33`）。
⚠️ **置換前の語は文書上で伏せられている**（「（特定の商用 WBS マスタ製品名）」「〈同〉」等）ため、**置換前の語そのものを機械で探すことはできない。** 唯一の例外が識別子 `IQV-2026` である。

| # | 置換前 | 置換後 | 箇所 | 出典 |
|:--:|---|---|:--:|---|
| N-01 | （特定の商用 WBS マスタ製品名） | **外部 WBS マスタ**（初出）／**外部マスタ**（以後） | 30 | `NEUTRALIZED-TERMS-ja.md:39` |
| N-02 | `IQV-2026`（JSON 実例の識別子） | **`EXT-WBS-2026`** | 3 | `NEUTRALIZED-TERMS-ja.md:40` |
| N-03 | （特定業種の製品カテゴリ名） | **対象** | — | `NEUTRALIZED-TERMS-ja.md:59` |
| N-04 | 〈同〉A（実例ラベル） | **製品A** | — | `NEUTRALIZED-TERMS-ja.md:60` |
| N-05 | 〈同〉開発日程 | **開発日程** | — | `NEUTRALIZED-TERMS-ja.md:61` |
| N-06 | 1〈同〉＝1 行＝全フェーズを一枚絵で俯瞰 | **1 対象＝1 行＝全フェーズを 1 枚で俯瞰** | — | `NEUTRALIZED-TERMS-ja.md:62` |
| N-07 | 大分類 > 中分類 > 〈同〉 | **大分類 > 中分類 > 対象** | — | `NEUTRALIZED-TERMS-ja.md:63` |
| N-08 | （特定業種の工程名 2 語） | **検証** / **展開** | — | `NEUTRALIZED-TERMS-ja.md:64` |
| N-09 | 部品X（WBS 実例の子ノード） | **作業X** | — | `NEUTRALIZED-TERMS-ja.md:65` |
| N-10 | （地域＋業種の開発慣行を指す語）の日程表 | **1 行に全フェーズを並べる日程表の慣行** | — | `NEUTRALIZED-TERMS-ja.md:66` |
| N-11 | 「MS Project や〈製品名〉は使いにくい」 | 「**既存の日程管理ツールは使いにくい**」 | — | `NEUTRALIZED-TERMS-ja.md:67` |

### 6-1. 意図的に残した語

| 残した語 | 理由 | 出典 | 実測 |
|---|---|---|---|
| **`MS Project` / `MSPDI`** | 交換フォーマットの相手先そのもの（機能要求。消すと要求が消える） | `NEUTRALIZED-TERMS-ja.md:81` | 在庫表 11 枚のうち 8 枚が `MS Project` を使う（E01:1 / E02:3 / E04:1 / E05:1 / E06:6 / E07:1 / E10:3 / E11:1）。**規約どおりで食い違いではない** |
| **`mspdi_pj12.xsd`** | 事実の唯一の根拠。ただし**同梱しない**（第三者の著作物は 1 つも再配布しない） | `NEUTRALIZED-TERMS-ja.md:82` | — |
| **`P6`（2 箇所）** | 命名判断の根拠（`Start`/`Finish` は分野の標準語彙）と方式名（変更前予定＝別ファイルの読取専用スナップショット） | `NEUTRALIZED-TERMS-ja.md:83` | **実測 2 箇所で一致**（`ui-parts-ja.md:723` / `grs-native-erd-ja.md:1719`）。⚠️ `performance-notes-ja.md:195` に **3 つ目の `P6`** があるが、これは基準機の機種名 `MouseComputer P6I7G50BKABC` の一部で別物である（grep で数えるときの誤検出源） |
| 「日本の祝日」 | 暦の例示。祝日が地域固有であることが要点 | `NEUTRALIZED-TERMS-ja.md:84` | — |
| 「日本語」「日本語 UI」 | 言語の意味（i18n の対象言語） | `NEUTRALIZED-TERMS-ja.md:85` | — |

### 6-2. 次期が守ること

| # | 規則 | 出典 |
|:--:|---|---|
| R-1 | 例示は業種に依存しない語で書く（「対象」「製品A」「企画 / 設計 / 検証 / 展開」） | `NEUTRALIZED-TERMS-ja.md:116`／`README.md:139` |
| R-2 | 対向ツールは役割名で呼ぶ（「外部 WBS マスタ」）。**製品名を仕様に埋め込まない** | `NEUTRALIZED-TERMS-ja.md:117`／`README.md:140` |
| R-3 | 他社製品の評価を仕様書に持ち込まない。必要なら選定記録として別に置く | `NEUTRALIZED-TERMS-ja.md:118` |
| R-4 | 例外は `MS Project` / `MSPDI` のみ | `NEUTRALIZED-TERMS-ja.md:119`／`README.md:141`–`142` |
| R-5 | **特定製品の挙動を前提にした規約には、必ず「どこまで検証したか」を併記する。** 中立化のためではなく**主張の強さを偽らない**ため | `NEUTRALIZED-TERMS-ja.md:120`–`121` |
| R-6 | **凍結リポジトリの原本は中立化していない。** 語が違うのは想定どおりでドリフトではない | `NEUTRALIZED-TERMS-ja.md:101`–`109` |

### 6-3. 中立化前の語が在庫表・仕様書に残っていないかの検査

| 検査した語 | 在庫表 11 枚 | `docs/spec` | 判定 |
|---|---|---|---|
| `IQV`（置換前の識別子） | **0 件** | **0 件** | ✅ 漏れなし。生存は `NEUTRALIZED-TERMS-ja.md:40` と `POC-RESULTS-ja.md:234`（どちらも**記録としての言及**であり正しい） |
| `EXT-WBS-2026`（置換後） | 0 件 | 0 件 | 在庫表は JSON 実例を持たないので不使用は自然 |
| 「外部マスタ」「外部 WBS マスタ」 | **使用**（`E01-task-plan.md:50`, `E04-project.md:77`, `E07-visual-origin.md:100`, `E11-identity-and-notstored.md:346` ほか） | **使用**（`01-04-requirements.md:196` に用語定義 G-7「特定の製品を指す語ではない」、`:344`, `:428`, `:738` ほか） | ✅ 規約どおり |
| `P6` | **0 件** | **0 件** | ✅ 中立化の例外語は在庫表・仕様書に持ち込まれていない |
| 置換前の業種語（N-03〜N-10） | **検査不能** | **検査不能** | ⚠️ **未検証。** 置換前の語が文書上で伏せられており、探すべき文字列が存在しない。**判定するには凍結リポジトリの原本が要る**（本作業の範囲外） |

---

## 7. 在庫表との食い違い

> 表記: 「在庫表側」= `previous-project-result/temp/inventory/` の 11 枚、または現行仕様 `docs/spec/`。
> 「出典側」= 本作業で読んだ 3 文書。

| # | 何が食い違うか | 出典側 | 在庫表・仕様書側 | どちらが正か |
|:--:|---|---|---|---|
| **C-1** | **`OPEN-ITEMS-ja.md` の件数が 3 と 4 で食い違う** | `NEXT-STEPS-ja.md:30`「あちらは **MS Project の実機を触らないと分からない 3 件**であり」 | `README.md:173`「実機確認の残件 **4 件**」／`OPEN-ITEMS-ja.md:11`「日付: 2026-07-30（**4 件目を 2026-08-05 に追加**）」／同 `:12`「**4 件**をチェックリストにする」。実際に `## 1`〜`## 4` の 4 節を自分で数えた | **4 件が正。** `NEXT-STEPS-ja.md:30` は 4 件目（2026-08-05 追加）を反映していない**古い記述**である。NEXT-STEPS 本体の日付は 2026-08-02（`:11`） |
| **C-2** | **`DECIDED-ja.md` の規模** | `README.md:171`「1 行ずつ引ける索引（**175 行**）」 | 実測 **354 行**（`wc -l`）。表本文行は **193 行**（`^\|` が 215 行 − ヘッダ 11 − 区切り 11） | **175 はどの数え方でも合わない。** README の記述が古い。**索引の規模を README から引かないこと** |
| **C-3** | **読む順の「13」が存在しない** | `README.md:176`「2〜4 は前提知識、6 は入口、**13 は経緯**」 | `README.md:149`–`174` の表に **13 行目が無い**（自分で数えて 24 行、番号は 1〜12・14・15・15b・16 と `—` 5 行） | **表の側が正。** 13 は `06-background/`（破棄済み。`README.md:223`–`224`）を指していたと**推定されるが未検証**。README:176 は宙に浮いた参照である |
| **C-4** | **`fontScale` の px は「どこにも書かれていない」か** | `NEXT-STEPS-ja.md:217`「**3 値がそれぞれ何 px かが、どこにも書かれていない。** 保存する設定なのに効果が定義されていない」 | `docs/spec/_assets/tbl-settings.md:293`–`295` に **`fontScaleSizes.S` = 12px / `.M` = 14px / `.L` = 16px**（3 つとも 🔎 ＝ 由来なし）。在庫表 `E09-settings-blob.md:261`「各値の px は表 T-215」、同 `:350` は grs-document-settings 側では「**未記載**」と記録 | **新仕様側が正で、NEXT-STEPS 2-7 は埋まっている。** ただし値は 3 つとも 🔎（由来が記録されていない）＝ **D-13 と同じ「次期が選び直してよい」性質**である |
| **C-5** | **その px を決めた後の「検算」がされたか** | `NEXT-STEPS-ja.md:224`「**px を決めたら、しきい値 3 本が最大のフォントでも成り立つかを検算すること**」 | `docs/spec/_assets/tbl-settings.md:201`「時間軸のしきい値の 3 値は、**目盛のフォントが 12px のときの解**である」。導出表（`:205`–`:207`）は 12px 前提のまま。`:298`–`:299` は「しきい値は固定値であり実行時に導出してはならない」に寄せて相互否定を解消したと記す | **検算そのものは見当たらない —— 未検証。** 仕様は「固定値」に寄せて論点を回避しているが、`L` = 16px のとき段階 2・3 のラベルが入るかは**読んだ範囲に無い**。O-6 として残る |
| **C-6** | **`documentId` が在庫表にも仕様書にも無い** | `NEXT-STEPS-ja.md:305`–`320`（4-2）「**`documentId` をデータ構造の正へ入れる**。決定-5 が既にこれを前提にしている（自動保存キー `grsched.autosave.<documentId>`）」 | 在庫表 11 枚に `documentId` / `document_id` / `autosave` の**ヒット 0**（`E09-settings-blob.md:346` の `autosaveIdleMs` は別物）。`docs/spec` にも `documentId` / `grsched.autosave` の**ヒット 0** | **NEXT-STEPS が正で、まだ誰も受けていない。** 識別と非保存を担当する `E11-identity-and-notstored.md` にも無い。**在庫表側の欠落**である |
| **C-7** | **`revisionStamp` / `changeLog` / `lastEditedBy` / `updatedAt` が仕様書に 1 件も無い** | `NEXT-STEPS-ja.md:335`–`339`「トップレベルに **`revisionStamp`（3 キー）と `changeLog` を含める**。形は `10-agent-interface/samples/grs-document-with-revision-stamp.json`」 | `docs/spec` に `revisionStamp` / `lastEditedBy` / `updatedAt` の**ヒット 0**、`changeLog` も 0（`A-appendix.md:23` の見出し "A.3 Changelog" は文書自身の変更履歴で別物）。一方 `docs/spec/01-04-requirements.md:3109`–`3111` の **`FR-063` は「1 ずつ増える整数と、最後に書いた者と時刻を文書に持たせ、書き出す JSON にも載せること」を既に要求している**。在庫表は `E09-settings-blob.md:41`–`42` に `revisionStamp {…}` と `changeLog [ … ]` を**文書の木として持っている** | **受け皿は存在する（在庫表と `10-agent-interface/` の側が正）。** 食い違いは「**`FR-063` が要求しているのに、仕様書がそのキー名を一度も書いていない**」こと。**「受け皿が無い」という引継ぎ事実は誤りである** —— 無いのは受け皿ではなく、仕様書側の結線である |
| **C-8** | **`ImportMerge` が在庫表に無い** | `NEXT-STEPS-ja.md:230`（4 語確定）／`:231`（命名の正へ通すかは未決） | 在庫表 11 枚に `ImportMerge` の**ヒット 0** | **食い違いではないが穴。** 2-8 が未決のままなので在庫表が拾えていない。**語を決めたら在庫表にも通す必要がある** |
| **C-9** | **`予定＝破線 / 実績＝実線` を在庫表がどちらも持っていない** | `README.md:265`–`268`「`appheader-palette-icons.html` §6 の**決着 D は `ui-detail-spec-ja.md` §4-4 の確定（予定＝破線 / 実績＝実線）を覆すと宣言しながら書き戻していない**。両方を読むこと」 | 在庫表で「破線 / 実線」に触れるのは `E02-task-actual.md:27`（`actualFinish` の**右端の実線の縦キャップ**）**1 行だけ**。予定／実績の線種の対比も、決着 D による覆しも記録されていない。`docs/spec/01-04-requirements.md:2028` は**変更前予定を「グレーかつ破線の輪郭」**と定めるが、これは `FR-030` のベースライン表示であって予実の線種とは別の話である | **未解決の対立が在庫表に写っていない。** どちらが正かは**未検証**（`appheader-palette-icons.html` §6 と `ui-detail-spec-ja.md` §4-4 の両方を読む必要があり、本作業では読んでいない）。**O-4 として残す** |
| **C-10** | **記録番号「約 185 箇所」が数え直せない** | `README.md:125`「記録番号が **約 185 箇所**出てくる」 | 自分で数えた: `CR|DEF|DEC|ADR|RISK|IO-L1` の 6 系統だけなら **78 件**（`temp/` を除く `.md`）。大文字接頭辞 ＋ 数字の一般形まで広げると **357 件**（`TC` 42 / `IO-L1` 32 / `CWE` 30 / `SW` 27 / `UC` 24 …） | **未検証。** README が「等」と書いており**数える対象集合が定義されていない**ため、185 が正しいとも誤りとも言えない。**この数を引き写さないこと** |

### 7-1. 一致を確認したもの（食い違いではない）

| 検査項目 | 出典側 | 実測 | 判定 |
|---|---|---|:--:|
| `authority:` を持つ文書は 4 つ | `README.md:60`／`:70` | `grep -rl "^authority:"` で **4 件**（`grs-document-settings-ja.md` / `grs-native-erd-ja.md` / `ui-parts-ja.md` / `plan-actual-decisions-ja.md`） | ✅ |
| `README.md` を除き全 36 文書にファイル名の重複なし | `README.md:195` | `temp/` を除く `.md` は **39**。`README.md` が **3 つ**（本体 / `01-mspdi/mspdi/` / `08-poc/`）なので **39 − 3 = 36** | ✅ |
| `user-order.md` は項 1〜69・欠番 3 つで実質 66 項目 | `README.md:151` | 項番の実測は **1〜69 が連番で存在**し、`11` `14` `52` に「（欠番）」の明記あり（`user-order.md:140` / `:143` / `:395`）→ **66** | ✅ |
| NEXT-STEPS の残件は 16 件 | `NEXT-STEPS-ja.md:420` | 節を自分で数えて **8 + 5 + 1 + 2 = 16** | ✅ |
| PoC の書き戻しは 13 件（6 ＋ 7） | `README.md:166` | 6 ＋ 7 = 13（算術のみ確認。中身は未検証） | ✅（算術） |
| `progressLineColor` の廃止 | `NEXT-STEPS-ja.md:290` | `E09-settings-blob.md:231`, `:428`, `:512`／`E11-identity-and-notstored.md:428`／`E07-visual-origin.md:95` が同じ理由で記録 | ✅ |
| `language` は非保存・`localStorage`・ブラウザ言語へフォールバック | `NEXT-STEPS-ja.md:139`–`143` | `E09-settings-blob.md:319`（⛔ 非保存・`S-99`）／`E11-identity-and-notstored.md:397` | ✅ |
| WBS の深さはクランプしない | `NEUTRALIZED-TERMS-ja.md:94` | `E01-task-plan.md:26`, `:49`, `:108`／`E03-dependency-taskgroup.md:27`／`docs/spec/01-04-requirements.md:1275` | ✅（⚠️ `E01-task-plan.md:129` が「`importMaxDepth` 超過ファイルを拒否するのか警告するのかは原典に無い」と別の未決を挙げている） |
| `agentApiVersion` は文書に載せない | `NEXT-STEPS-ja.md:337` | 在庫表 11 枚に**ヒット 0**、`docs/spec` にも 0 | ✅ |
| `rulerHeight` は目盛の段階によらず固定 | `NEXT-STEPS-ja.md:401` | `E09-settings-blob.md:141`「**目盛の段階が変わっても動かさない**」 | ✅（在庫表は `FR-039` により **`fontScale` 変更時に保存値が書き換わる**という**新しい拘束**を追加で記録しており、NEXT-STEPS はこれを知らない） |

---

## 8. この文書の限界（**未検証**の明示）

| 項目 | なぜ未検証か |
|---|---|
| 中立化前の業種語（N-03〜N-10）が在庫表・仕様書に残っていないか | 置換前の語が文書上で伏せられており、**探すべき文字列が存在しない**。判定には凍結リポジトリの原本が要る |
| `README.md:125` の「約 185 箇所」 | 数える対象集合が「等」で開いており定義されていない（§7 C-10） |
| 読む順の「13」が何を指していたか | `06-background/` と**推定されるが**、当該フォルダは実在せず破棄済みのため確認できない |
| `appheader-palette-icons.html` §6 決着 D と `ui-detail-spec-ja.md` §4-4 のどちらが正か | 両文書とも本作業では読んでいない（§7 C-9） |
| `fontScale` `L` = 16px でしきい値 `1.4 / 4.3 / 30` が成り立つか | 検算が仕様書の読んだ範囲に無い（§7 C-5） |
| README が挙げる各文書の**内容**（57 項目・53 要素/535 値・29 テーブル等） | README の自己申告をそのまま記録した。**各文書に当たっていない** |
