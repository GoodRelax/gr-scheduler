// CR-731 spec-only clauses: the MUST and MUST NOT sentences of FR-155, T-373 and T-340, copied byte for byte from docs/spec

export const FR_155_MACHINE_ROWS_APPLIED =
  '直す案は、直し方が「機械」の行を、表 T-373 の結びの順で当て終えた後の姿で作ること（MUST）'

export const FR_155_SAVE_THEN_ONE_BUNDLE =
  '作成者が直す案の下の段の 2 つの入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-157` ・ `IC-158`）のどちらかを押したとき、`GRS` は、先に文書を保存し（`IC-157` は 表 T-036 の `SK-11` と同じ道、`IC-158` は 表 T-340 の `SX-3` の控え）、書けたときだけ、チェックの入った行の直しを 1 つの束として発行すること（MUST）'

export const FR_155_NOT_WRITTEN_NO_FIX =
  '⛔ 書けなかったとき（選ばなかった・上書きを断った・書き込みが拒まれた）は直してはならない（MUST NOT）'

export const FR_155_REFUSED_NONE_APPLIED =
  '⛔ 束のどれかを命令が断ったときは、束の全部を当ててはならない（MUST NOT）'

export const FR_155_LOG_ROWS_ADDED =
  '直したら、直した行を 表 T-374 の直した記録の表に足すこと（MUST）'

export const FR_155_NOTHING_IN_THE_DOCUMENT =
  '⛔ 直す案・チェック・選んだ択・書き換えた日付・直した記録と、直す案の表と直した記録の表の列のフィルタと並べ替えを、文書に書いてはならない（MUST NOT）'

export const FR_155_NO_AGENT_API_ENTRANCE =
  '⛔ `IC-157` ・ `IC-158` に当たる入口を `Agent API`（表 T-107）に置いてはならない（MUST NOT）'

export const T_373_DERIVED_PARENT_BY_HAND =
  '⛔ `parentTaskUid` が `null` で、親を `FR-135` で導いた組には、`FA-9` 〜 `FA-12` の機械・選ぶ・日付の候補を当ててはならない（MUST NOT）'

export const T_340_NOTHING_MOVES_ON_FAILURE =
  '⭐ **書けなかったときは、どの行でも何も動かさないこと（MUST）'

export const T_340_SX_2_ROW =
  '| SX-2 | 表 T-024 のうち書出の方向を持ちファイルとして出る、`IO-2` 以外の形式（`IC-2` で選んで書いたとき） | 書き出し —— `fileFlow/documentFileWriteEnded` を送ること（MUST） | 変えてはならない（MUST NOT） | 変えてはならない（MUST NOT） | 変えてはならない（MUST NOT） —— 書き出した先は交換や絵のためのファイルであり、この文書のファイルではない |'

export const T_340_SX_3_ROW =
  '| SX-3 | 直す前の控えの `GRS JSON`（`FR-155` の 表 T-109 の `IC-158`、提案する名は 表 T-346 の `RW-15`） | 控え —— 表 T-290 の `fileFlow/diagnosticFixBackupSaved` を送ること（MUST） | 変えてはならない（MUST NOT） —— 控えはこの文書の作業のファイルではない | 変えてはならない（MUST NOT） | 変えてはならない（MUST NOT） —— 控えを上書きする先にすると、次の `SK-11` が直した文書で控えを潰す |'

