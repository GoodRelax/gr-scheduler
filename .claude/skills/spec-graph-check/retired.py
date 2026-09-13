# -*- coding: utf-8 -*-
"""The ids the gr-scheduler specification has retired on purpose, and why.

⛔⛔ WHY THE LIST LIVES ALONE, IN A MODULE THAT HOLDS DATA AND NOTHING ELSE.
A set literal kept in two files drifts, and nothing can report the drift: a
literal cannot notice that another file holds a different one. A short second
copy is what everything reading `specindex.known` would read -- edge building
in `graph.py`, seed classification in `graph.py` and `induced.py` -- so
references to retired ids would be classified as names the specification never
defined rather than as seats it burnt, and the edges those references make
would be silently absent from the blast radius the next round is planned with.
⇒ One literal, and everyone imports it.

⚠️ THIS FILE MUST IMPORT NOTHING FROM THIS PACKAGE AND DO NOTHING AT IMPORT
TIME, for two separate reasons. `md-checks.py` already imports `specindex`,
so a single import back the other way would close a cycle. And
`check-spec-id-references.py` and `list-asserted-claims.py` used to lift this
literal out of `md-checks.py` with `ast.literal_eval` for one reason only:
`md-checks.py` runs checks 5 through 15 at module level, so importing it to
reach a set would have executed and printed every one of them. A file that
holds data and no behaviour costs them nothing to import, which is the whole
point of moving the set here.

⛔ WHAT A SEAT IN THIS SET DOES NOT MEAN.
  - NOT that a reference naming the id is wrong. A withdrawal is recorded by
    the documents that name the withdrawn row, and those records are true of
    the day they were written.
  - NOT that the number is free. The opposite: the seat stays burnt so that a
    later row or table cannot quietly take a used number, which is why an
    entry is never removed to "make the reference resolve".
  - NOT that the row ever shipped. Some of these lived hours.
  - NOT a list of everything ever withdrawn. It holds what something still
    names; an id no document mentions has no reason to be booked here.

⭐ A NEW ENTRY CARRIES ITS REASON. Every retirement below says what left,
when, on whose ruling, and which document still names it, so that a later
reader can refute the booking instead of trusting it. Add in the same voice.

NOTE ON NON-ASCII: several reasons quote specification wording in Japanese,
the language it is written in; those code points are data.
"""

# Retired on purpose; the reduction-candidate table records the retirement,
# so a reference to them is correct and must not be reported.
#
# T-044..T-047 and F-002..F-007 belong to a discarded Chapter 5/6 design.
# The changelog names them so the numbers are never handed to something
# else; the seats stay burnt. Do NOT remove them from this set to "make the
# reference resolve" -- resolving it would mean a new table had taken a used
# seat number.
# FR-026 / FR-061 and the rows below them are the autosave CR-280 removed.
# The changelog names them, so their seats stay burnt like every other
# retirement in this set.
RETIRED = {'FR-050', 'T-030',
           'FR-026', 'FR-061', 'BT-3', 'LM-17', 'RS-17', 'RS-18',
           'QN-6', 'QN-7', 'S-112', 'K-96', 'U-28', 'PG-13', 'TR-2',
           'IC-55', 'IC-56', 'IC-57', 'IF-4', 'RD-5', 'CP-23', 'CP-29',
           # IC-46 (guide cursor -> 'none') and IC-49 (guide cursor ->
           # 'double-vertical') left table T-109 with CR-369. The changelog of
           # 1.15 names IC-49 as the neighbour a glyph had to be told apart
           # from, and that record is true of the day it was written, so the
           # seats stay burnt.
           'IC-46', 'IC-49',
           'UF-43', 'UF-44', 'UF-52', 'PI-23', 'PI-29',
           'T-044', 'T-045', 'T-046', 'T-047',
           'F-002', 'F-003', 'F-004', 'F-005', 'F-006', 'F-007',
           'S-21', 'S-52', 'K-21', 'S-57', 'K-66', 'S-139',
           # S-59 (planActualDisplay) and K-74, its key, split into two
           # independent booleans (PND-442): S-227 planVisible and S-228
           # actualVisible, K-122 and K-123. The changelog names S-59, so the
           # seat stays burnt.
           'S-59', 'K-74',
           # CM-57 (setPlanActualDisplay) went with them: with the pair as two
           # ordinary boolean rows of table T-202, CM-58 setElementVisible is
           # the command that writes them, and a second command for the same
           # two columns would be a second entrance to one thing.
           'CM-57',
           # S-209 (the gap between the guide cursor's two vertical lines)
           # went out with the mode it measured (CR-369).
           'S-209',
           # S-82 (exportPngScale) went with the very idea of a scale: a
           # picture is always S-81's size, and anyone needing more is handed
           # an exchange format instead.
           'S-82',
           # CM-70 (setExportPngScale) and K-88 followed S-82 on the same day:
           # a command that accepts and writes nothing is a published name with
           # no meaning, and the key it named is gone.
           'CM-70', 'K-88',
           # AS-11 gave CM-41 setResourceName the entrance table T-225 never
           # had: an unknown name committed on a task that ALREADY has an
           # assignee would rename that person rather than swap in a new one.
           # It was withdrawn in favour of the swap, because the assignee can
           # already be changed from the Properties Panel and removed from the
           # assignee list -- so AS-7 takes the input.
           # ⭐ The seat stays burnt because AS-7's own row cites AS-11 as the
           # thing it no longer has to be told apart from, and that record is
           # true of the day it was written.
           # ⚠️ CM-41 is a command no human entrance reaches. It is still
           # reachable through the Agent API, so the notice requirement that
           # names it is not stranded -- and ledger row DFC-273, which asked
           # for the human path, is answered by that choice, not by a row.
           'AS-11',
           # S-93 (the dummies' own hit box, 30px) went because the hit area of
           # GR-9 / GR-17 / GR-18 IS the mark FR-043 draws -- 「印の外へ広げては
           # ならない（MUST NOT）」 -- which leaves the row with no reader at all.
           # A 30px box swallows the plan's own end point (GR-4) on any task
           # shorter than five days at the default magnification. The closing
           # rule of table T-023d, S-180's note, FR-043 and the appendix all
           # record the withdrawal by naming the row, and those records are
           # true of the day they were written, so the seat stays burnt like
           # every other retirement here.
           'S-93',
           # U-29 (the hidden-group tab) went with CR-320, when the row
           # controls were matched to the approved sample. It was the only
           # entrance that brought a hidden row back, and HR-6 (hide this row)
           # now gets its way back from the parent's 1 階層開く -- HR-7, reached
           # through HF-13 -- which left U-29 with no reader at all. Appendix 1.74
           # says so in as many words: 「U-29（非表示グループタブ）を廃止した」.
           'U-29',
           # IC-51 (畳む) merged into IC-50 (一覧を開く) with CR-273: 図 F-019
           # was handing both of them a byte-identical three-dot glyph, so a
           # reader saw two indistinguishable entrances of which one did nothing
           # in either state. One row now toggles, as IC-11 / IC-60 already did.
           # ⚠️ An EARLIER changelog row -- appendix 1.15, CR-263 -- says
           # 「⚠️ **IC-51 は廃していない**」. That was true of 1.15, where only
           # the glyph changed; version 1.25 SUPERSEDES it and is what retired the
           # row. ⛔ Do not read 1.15 as evidence that this booking is a mistake:
           # 1.25 is the later record, and the seat stays burnt.
           'IC-51',
           # IC-69 (丸囲みの ✓) and IC-70 (丸囲みの ✕) were the two glyphs a
           # confirmation was answered with. CR-327 replaced them with word
           # buttons, because a spelled Yes / No is what lets the leading
           # letter name the y / n key that also answers.
           # Both rows left table T-109 and 図 F-019, and NT-7 of table T-037 now
           # forbids their return: 「答えの入口に 表 T-109 の行を与えてはならない
           # （MUST NOT）」. A reference to either number is therefore a reference to
           # a deliberate withdrawal, not to an invented icon.
           'IC-69', 'IC-70',
           # S-185 (構えている入口の縁の太さ) went with CR-311: an armed entrance
           # is shown by filling it, not by rimming it. FR-029 and table T-237
           # forbid 「縁の色や太さ」 outright, so nothing is left to read a rim
           # thickness.
           # Appendix 1.65 records the withdrawal and the seat in one sentence --
           # 「S-185（縁の太さ）を廃止した … 番号は席番号なので S-185 は欠番のまま
           # 残す」 -- naming FR-050 as the precedent it follows.
           'S-185',
           # IC-94 was an icon on the difference-review surface, since
           # withdrawn. CR-366, which builds the merge face over that same
           # surface, stops to say the seat is deliberately vacant rather than
           # the next free number: 「⛔ 席は詰めない —— IC-94 は退役済み
           # なので空けたまま」. IC-93 and IC-95 are both live rows, so anything that
           # renumbers into this gap would silently reuse a used seat.
           'IC-94',
           # RS-45 was a refusal reason -- 「この画面を動かす本体が、このファイルの
           # 中に見つからない」 -- retired by CR-347 section 2.7, because a single
           # .html is made to be handed out and opened, not read back by the
           # application, so the shipped build has no route to that fault at
           # all. RS-44 and RS-46 are both still live rows, which is what makes
           # this a seat rather than an off-by-one.
           'RS-45',
           # T-006（EARS 構文パターン）held the six sentence shapes a requirement
           # may take. It was not withdrawn but SENT HOME: §1.9's writing rules
           # live in spec-writing-rules.md, not in the product's own
           # specification, and its Chapter 4.1 carries this very table. The
           # seat is booked because the rule that moved with it is itself the
           # reason: 「番号は席番号
           # とする（MUST）。…途中の表や図を削っても残りの番号を詰め直しては
           # ならない（MUST NOT）」. Leave it unbooked and a later table takes a
           # used number, and T-006 names two different things across the history.
           # ⛔ THE TABLE IS BOOKED, NOT ITS ROWS. E-1..E-6 were rows OF this
           # table and went with it, but they have no seat register of their own
           # and must not be given one here: `E-` is short enough that booking it
           # would swallow real misses everywhere else. ⚠️ Do not "complete" this
           # entry. ⚠️ WR-1 / WR-2 are not part of it either -- they were rows of
           # a separate unnumbered table in the same section, and they are LIVE in
           # the rule file today.
           # ⛔ T-006a and T-006b are LIVE tables that stayed behind in 1.9, so a
           # search for this seat must exclude them: measured 2026-09-11, a naive
           # `T-006` matches 62 occurrences over 31 files under docs/spec, src/
           # and tests/, and every one of them is the suffixed pair. What still
           # names the bare number is change-request/CR-106 and four files under
           # docs/review, and those records are true of the day they were written.
           'T-006'}
