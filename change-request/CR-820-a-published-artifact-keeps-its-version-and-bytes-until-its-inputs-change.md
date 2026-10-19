# CR-820 —— 配るファイル（GRS Relay の束とサーバー同期のデモの zip）は、中身を変えるまで同じ版・同じバイト列を保つ

> 状態: ✅ **当てた** —— 2026-10-20、取次の席（`unruffled-edison-a20654`）が起草し、同じ席が当てた。
> 元: 利用者 2026-10-20「いずれにせよ α版に統一して、再発防止の仕組みも入れろ。」（`JDG-2965`、調整役が中継）。版の持ち方は利用者が「版をファイルに書く」と定めた（`JDG-2966`）。
> 当てる裁定: `JDG-2965`〜`JDG-2967`。不具合: `DFC-3380`〜`DFC-3382`。新しい ID: 無し。消す ID: 無し。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1` ／ `GL-004` —— AI と人が見る GRS Relay の版が、中身の変わらないまま動かないようにする。人は版を見て、入れ直しが要るかを決める。

### ② レビュー観点のどの条項を当て、何が出たか

`R2.5`（名は指すものを言う）—— 「組み立てたソースのコミットの時刻」は、docs だけのコミットでも動いた。版が指すのは中身の時刻なので、中身を最後に変えた時刻と書き、中身の一覧を同じファイルに置いた。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 中身の一覧（下の 1 節）。`package.json` は入れない —— α の後に変わったのは説明と scripts だけで、束のバイト列に届かない。依存の版は `package-lock.json` が持つ。
2. ⭐ この CR の道具の変更（`tools/relay_version.mjs` など）では版を上げない —— 版は `2026-10-19T19:51:01Z`（`3940a36a`、両方の中身を最後に変えたコミット）のままにした。道具は版の求め方だけを変え、束のバイト列は版の値を除いて同じだからである。`check.sh` は、中身を最後に変えたコミットと版の行を足したコミットが同じ（このコミット）なので緑である。
3. ⭐ デモの zip の各項目の時刻は `serverSyncDemoBuiltAt`（UTC）とし、項目の並びは名の符号の順（地域の設定に依らない）とした。
4. ⭐ 2 度作って同じバイト列かを見る検査は、時間がかかるので GT-1 でなく GT-2 に置いた。版と中身の食い違いを見る検査は軽いので `check.sh` の 85 番に置いた。

## 1. 対応

| 直すこと | 仕様の場所 | 直すファイル |
| --- | --- | --- |
| 版は中身を最後に変えた時刻で、ファイルに書いて git に問わない | `design-mcp-relay.md` の 6 節 | `tools/artifact-versions.json`（新）・`tools/relay_version.mjs` |
| 中身を変えて版を上げないと止める | 同上 | `tools/artifact_versions.mjs`（新）・`check.sh` の 85 番 |
| 同じコミットから同じバイト列 | 同上 | `demo/server-sync/build-demo.mjs`・`tools/check_reproducible_artifacts.mjs`（新）・`tools/gate/run-gate.mjs`・規則 04 の表 GT |

中身の一覧（`tools/artifact-versions.json` が持つ）:

```
grsRelayInputs        src/  dist/index.html  vite.relay.config.ts  tools/build_relay_bundle.mjs
                      tools/relay_version.mjs  docs/spec/_source/grs-document.schema.json
                      docs/spec/_source/grs-commands.schema.json  package-lock.json
serverSyncDemoInputs  demo/server-sync/  dist/index.html  sample-schedule/Three-Year Product Plan.json
```

## 2. 実測（2026-10-20）

```
α (34d6ee84) を git archive し、この CR の版の読み方と grsRelayBuiltAt = 2026-10-19T02:25:08Z で束を作った
  grs-relay.mcpb  sha256 f101ce23...  配っている α の束と同じバイト列（版 2026.1019.22508）
この枝の先 (922d57a8b + この CR) で 2 度ずつ作った
  grs-relay.mcpb               10e6e2ed...  2 度とも同じ（版 2026.1019.195101）
  grs-server-sync-demo.zip     a173199c...  2 度とも同じ
α のデモの zip 35474c51 は作り直せない —— 各項目が α を組み立てた時刻（地方時）を持っていたため
```

⚠️ develop の版は α の `2026.1019.22508` ではなく `2026.1019.195101` である —— studies/ への改名（`CR-819`）で、`src/adapter/document-codec/mspdi-child-order.json` の説明の文字列が変わり、それを持つ `dist/index.html` と束のバイト列も変わったからである（`3940a36a`）。

⭐ main へは、main（`54602f00`）から切った枝に CR-820 の道具だけを載せて入れる（利用者が定めた —— `JDG-2967`）。その枝の版のファイルは α の時刻 `2026-10-19T02:25:08Z` を持つ。Pages の作り方（新しく `vite build` してから束を作る）で 3 つのコミットを作って測った:

```
34d6ee84 (α)    版のファイル 02:25:08Z  dist 0bff5da4  束 f101ce23  版 2026.1019.22508  zip b5b0eddb
54602f00 (main) 版のファイル 02:25:08Z  dist 0bff5da4  束 f101ce23  版 2026.1019.22508  zip b5b0eddb
develop の先     版のファイル 19:51:01Z  dist e099dc94  束 10e6e2ed  版 2026.1019.195101 zip a173199c
```

次の develop→main のリリースで、版は一度だけ動く。そのあと docs だけのコミットでは動かない。

## 3. 影響

```
生成物           無し
実装・形式の版   アプリと Agent API の版は変えない
毎フレームの仕事 無い
試験             tests/contract と tests/system に CR-820 の試験（仕様だけを読む別の席が書いた）。
                 版を HEAD のコミットの時刻と見ていた tests/system/cr-613-cr-620-built-relay.test.ts を揃えた
```
