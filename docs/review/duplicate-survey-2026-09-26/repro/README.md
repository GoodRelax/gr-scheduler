# 重複調査の再現スクリプト

- 対象の木は refactor `d65097b9`。各スクリプトは、その時点の `src/` の関数本体を字のまま写して並べ、同じ入力に対する答えを比べる（`src/` は変えない）。
- 動かす環境は Node 24（型の剥ぎ取りが既定で効く版）。npm も依存の導入も要らない。
- いつもリポジトリの根から動かす: `node docs/review/duplicate-survey-2026-09-26/repro/<file>.ts`
- `repro-G26.ts` と `repro-G66.ts` は `src/adapter/screen-renderer/` の `.json` を、根からの相対の道で読む。
- `rf/` の 6 本は写しでなく本物の `src/` を読み込む。拡張子なしの import を解くため次のように動かす: `node --experimental-transform-types --import ./docs/review/duplicate-survey-2026-09-26/repro/rf/reg.mjs docs/review/duplicate-survey-2026-09-26/repro/rf/<file>.ts`（`sample-schedule/` の標本を読み、標準出力に出すだけで、ファイルは書かない）
- `d65097b9` 以降に `src/` が変わると、写した本体は古くなる。比べ直すときは、写しのそばの `file:line` を今の木で読み直すこと。
- どのスクリプトがどの群に当たるかは、ファイル名の群の id（`repro-G23.ts` なら G23）と、`duplicated-responsibility-groups-d65097b9.json` の `differ_input` の括弧書きで分かる。
- 報告は `docs/review/duplicate-survey-2026-09-26.md` の §4 を見よ。
