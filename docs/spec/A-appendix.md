# gr-scheduler 仕様書 — 付録

**Grammar**: spec.sgra
**UID**: DOC-APPENDIX
**Version**: 0.1

付録はどの章範囲にも属さないので、席番号を `A` とする独立したファイルにしてある。

## A.1 References (参考文献)

**Type**: SECTION

MSPDI の正は版ごとに次のとおりとする。  
pj12 —— 公式 URL `https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd`。  
pj15 —— 公式 URL は無い。  
Project 2013 SDK（配布元 `https://www.microsoft.com/en-us/download/details.aspx?id=30435`、`Project2013SDK.msi`、SHA-256 `75891caee6e10b87ab2281d33cdb9c19d16e70b48cc1cf7d7433c583564988b1`）に含まれる `mspdi_pj15.xsd`（SHA-256 `1c208a9732d6ba16f677a9f2fb9d5a629f0c200346b1851998a44765c502eb85`）を正とする。  
ローカル複製のパスを正として書かない（複製は cache であって正ではない。  
`docs/reference/README.md`）。

## A.2 Licenses (ライセンス)

**Type**: SECTION

本体のライセンスは Apache License 2.0 であり、全文は根の `LICENSE`、著作権表示は根の `NOTICE` が持つ。  
成果物の `.html` に全文と帰属表示を持たせる規則は `FR-069` が持ち、`tools/generate_license.py` が 2 つのファイルから組み立てる。  
単一 HTML に同梱される実行時依存は、出力にコードが載るので全数を挙げる —— 全数は `package.json` の `dependencies` が持ち、空なら挙げるものは無い。

## A.3 Changelog (変更履歴)

**Type**: SECTION

変更履歴は `docs/development-records/changelog.md` が持つ。
