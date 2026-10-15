// CR-774 spec-only clauses: the sentences of HF-15, UC-002, HM-3a and T-234 that the past-the-depth-cap cases are driven by

export const HF_15_CAP_SELF = '上限は、掴んでいるタスクグループ自身が `FR-004` の深さの上限を超えないところまで下げること（MUST）'
export const HF_15_SELECTABLE =
  '触れば限りが分かる。⭐ **配下が深さの上限を超える段も選べること（MUST）** —— その段では差し込み線を破線で描く。'
export const HF_15_ASK = '⭐ その段で離したときは、書き込む前に 表 T-234 の `QN-16` で問うこと（MUST）。'
export const HF_15_ANSWERS =
  '答えが `proceed` なら、深すぎる配下を上限の段へ引き上げて移動し、`cancel` なら書き込まない —— ⛔ 黙って止めてはならない（MUST NOT）'
export const HF_15_WHY_NOT_QUIET = '配下を畳んでいると、なぜ動かないのかが見えない。'
export const HF_15_LIFT =
  '引き上げは、移動のあと上限より深くなるタスクグループを、上限 − 1 の段の祖先の子とし、上限の段の祖先の直後へ、木の順（親の次に子）のまま並べること（MUST）'
export const HF_15_TASKS_STAY = '引き上げたタスクグループに載っている `Task` は、そのタスクグループに載ったままとする（`HM-3`）。'
export const HF_15_ONE_UNDO = '移動と引き上げは、取り消しの 1 手とする（`UN-4`）。'

export const UC_002_2A_ASK = '掴んで運び、配下が上限を超える段で離したときは、`GRS` は書き込む前に問う（表 T-234 の `QN-16`）。'
export const UC_002_2A_ANSWERS = '答えが Yes なら深すぎる配下を上限の段へ引き上げて移し、No なら何も変えない（表 T-051 の `HF-15`）。'
export const UC_002_2A_OTHER_ROADS = 'ほかの入口から来た移動は受け付けず、深さの上限に達したことを通知する（`HM-3a`）。'

export const HM_3A_GRAB_NOTE =
  '⚠️ タスクグループパネルで掴んで運ぶときは、離したときに 表 T-234 の `QN-16` で問い、答えが Yes なら深すぎる配下を上限の段へ引き上げてから移す（表 T-051 の `HF-15`）'
export const HM_3A_STILL_HOLDS = '引き上げたあとは上限を超えないので、本行は破られない。'

// WHY: the sentences the retired reading of CR-772 stood on; a manuscript that still carries one has not taken CR-774.
export const RETIRED_CAP_WITH_SUBTREE = '上限は、配下を含めて `FR-004` の深さの上限を超えないところまで下げること（MUST）'
export const RETIRED_NO_PLACE = '置ける段が 1 つも無い隙間では差し込み線を引かず、離しても書き込まないこと（MUST）'
export const RETIRED_HM_3A_NOTE = '上限を超える段をそもそも選ばせず、告げない'
export const RETIRED_UC_002_2A = '差し込み線は上限の段で黙って止まる'
