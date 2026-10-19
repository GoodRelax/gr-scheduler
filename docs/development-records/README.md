# 開発の記録 —— 止まっても再開できるようにする

> **English.** This folder holds GR Scheduler's development ledgers: the user's rulings (`rulings.md`, `JDG-` rows),
> the defect ledger (`defects.md` open, `fixed-defects.md` closed, `DFC-` rows), decisions still pending
> (`pending-decisions.md`), the specification's changelog (`changelog.md`), the hand-over between work sessions
> (`handoff.md`), the project plan (`project-plan.json`, a GRS document) and the test inventory. `measurements/`
> keeps raw performance runs; `history/` keeps finished plans and reports. Several checks in
> `.claude/skills/spec-graph-check/` read these files, so their table formats are fixed. The text is in Japanese.

**本フォルダは「作業中の頭の中」をディスクへ落とす場所である。**
⛔ **停電・枠切れ・要約による文脈の消失・日をまたぐこと —— 止まる理由は選べない。**
⭐ **どれもディスクは残る。だから、消える側をここへ書く。**

**規則は [`docs/development-rules/05-working-method.md`](../development-rules/05-working-method.md) が持つ。本書は置き場と書式だけを定める。**

---

## 1. ⛔ ここに書かないもの

⭐ **git が答えられることを書かない。** 二重に持てば必ずずれる。

| 問い | 答える者 |
|---|---|
| 何を変えたか | `git log` / `git diff` |
| なぜ仕様を変えたか | `change-request/` の変更要求 |
| 仕様は何を定めているか | `docs/spec/` |
| 作り方の規則は何か | `docs/development-rules/` |
| ⭐ **いまどこにいて、次に何をするか** | **本フォルダ** |

---

## 2. ⭐ 何が在るか

```
docs/development-records/
  rulings.md           利用者の裁定（JDG）。⭐ 問う前にここを検索する。唯一の置き場
  defects.md           不具合・改善要望の台帳（DFC。開いている行）
  fixed-defects.md     同・決着した行（`実測済` と `取下げ`）
  pending-decisions.md 裁定待ちの一覧（PND。検査 25 が印と突き合わせる）
  perf-pending.md      性能の測り待ち（1 行 1 変更要求。規則 04 の 5 節の表 PW、JDG-605）
  magic-numbers.md     src/ のマジックナンバーの作業表（ファイル単位。不具合台帳とは別）
  changelog.md         仕様書の変更履歴（版の形は ../development-rules/10-versions.md。検査 38）
  handoff.md           次の巡への引継ぎ。⛔ 番号を増やさず、毎巡この 1 ファイルを書き換える
  project-plan.json    計画（GRS JSON。GRS で開いて読む）。読み方は project-plan.md（検査 79）
  previous-plan.json   1 つ前の計画（JDG-2307）
  test-inventory.md    試験の目録（1 試験ファイル 1 行。生成物 —— `npm run gen:tests`、検査 71）
  measurements/        性能と被覆の測定の生の出力。索引は measurements/README.md
  history/             終わった計画・報告・波の記録（W4・W5 を含む）と evidence/。索引は history/README.md
```

⛔⛔ **`defects.md` と `fixed-defects.md` は 1 つの台帳の 2 つの半分である。**
**道具（`tools/ledger_metrics.py`）と 検査 28 / 29 / 31 は両方を読む。**
⛔ **片方しか読まない道具を足すな** —— **刈り取ったぶんだけ空を測り、全部緑になる。**

**波の記録（`history/` の `W4-adapter.md`・`W5-framework.md`）と計画のファイルは 3 節だけを持つ:**

```
## 現在地      いま何をしていて、次の一手は何か。⭐ ここだけ読めば再開できること
## 状態表      ユニットごとの段（⬜ 未着手 / 🔧 実装済 / 🧪 試験済 / ✅ 受入済）
## 記録        決めたこと・踏んだ罠・裁定。⭐ 追記のみ。過去の行を書き換えない
```

⚠️ **「現在地」だけは書き換える。** ⛔ **他の 2 節は追記のみ** —— 記録を書き換えると、
「そのとき何を知っていたか」が失われる。

---

## 3. ⛔ 書き足す時機

| いつ | 何を |
|---|---|
| **ユニットの段が 1 つ進んだ直後** | 状態表の 1 マス |
| **裁定を受けた／罠を踏んだ／自分で決めた直後** | 記録に 1 行 |
| **危ない操作の前** | 何を壊しうるか、どう戻すか |
| **枠が細ってきたとき** | ⭐ **要約が入って検討事項が消える前に** |
| **中断する前** | ⭐ **緑で止まる。** 通せないなら「ここが赤い、原因はここまで絞れた」と書く |

⛔ **あとでまとめて書かない。** ⚠️ **実測**: まとめて書いた回に古い節が残り、次の担当を誤らせた。

---

## 4. ⭐ 再開するとき

```
1. `handoff.md` を開く（波や計画のファイルを進めているなら、そのファイルも）
2. 「現在地」を読む
3. git status と機械検査を走らせ、書いてある状態と実物が合っているか確かめる
   ⚠️ 合っていなければ、実物が正しい。記録を直してから進む
```
