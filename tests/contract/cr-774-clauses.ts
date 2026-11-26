// CR-774 spec-only clauses: the sentences of HF-15, UC-002, HM-3a and T-234 that the past-the-depth-cap cases are driven by

export const HF_15_CAP_SELF = '`GRS` は、上限を、掴んでいるタスクグループ自身が `FR-004` の深さの上限を超えないところまで下げること。'
export const HF_15_SELECTABLE =
  '`GRS` は、配下が深さの上限を超える段も選べるようにすること。配下が深さの上限を超える段を選んでいる間、`GRS` は、差し込み線を破線で描くこと。'
export const HF_15_ASK = '配下が深さの上限を超える段で離したとき、`GRS` は、書き込む前に 表 T-234 の `QN-16` で問うこと。'
export const HF_15_ANSWERS =
  '配下が深さの上限を超える段で離したとき、`GRS` は、黙って止めないこと。`QN-16` の答えが `proceed` のとき、`GRS` は、深すぎる配下を上限の段へ引き上げて移動すること。`QN-16` の答えが `cancel` のとき、`GRS` は書き込まないこと。'
export const HF_15_WHY_NOT_QUIET = '黙って止めると、配下を畳んでいるときに、なぜ動かないのかが見えない。'
export const HF_15_LIFT =
  '`GRS` は、移動のあと上限より深くなるタスクグループを、上限 − 1 の段の祖先の子として引き上げること。`GRS` は、引き上げたタスクグループを、上限の段の祖先の直後へ、木の順（親の次に子）のまま並べること。'
export const HF_15_TASKS_STAY = '`GRS` は、引き上げたタスクグループに載っている `Task` を、引き上げたタスクグループに載せたままにすること（`HM-3`）。'
export const HF_15_ONE_UNDO = '`GRS` は、移動と引き上げを、取り消しの 1 手とすること（`UN-4`）。'

export const UC_002_2A_ASK = '配下が深さの上限を超える段で離したとき、`GRS` は、書き込む前に 表 T-234 の `QN-16` で問うこと。'
export const UC_002_2A_ANSWERS = '`QN-16` の答えが `proceed` のとき、`GRS` は、深すぎる配下を上限の段へ引き上げて移動すること。`QN-16` の答えが `cancel` のとき、`GRS` は書き込まないこと。'
export const UC_002_2A_OTHER_ROADS = 'ほかの入口から来た移動を受け付けず、深さの上限に達したことを作成者に知らせる（`HM-3a`）。'

export const HM_3A_GRAB_NOTE =
  '⚠️ タスクグループパネルで掴んで運ぶときは、離したときに 表 T-234 の `QN-16` で問い、答えが Yes なら深すぎる配下を上限の段へ引き上げてから移す（表 T-051 の `HF-15`）'
export const HM_3A_STILL_HOLDS = '引き上げたあとは上限を超えないので、`HM-3a` は破られない。'

// Why: the sentences the retired reading of CR-772 stood on; a manuscript that still carries one has not taken CR-774.
export const RETIRED_CAP_WITH_SUBTREE = '上限は、配下を含めて `FR-004` の深さの上限を超えないところまで下げること（MUST）'
export const RETIRED_NO_PLACE = '置ける段が 1 つも無い隙間では差し込み線を引かず、離しても書き込まないこと（MUST）'
export const RETIRED_HM_3A_NOTE = '上限を超える段をそもそも選ばせず、告げない'
export const RETIRED_UC_002_2A = '差し込み線は上限の段で黙って止まる'
