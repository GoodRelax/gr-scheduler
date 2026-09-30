# -*- coding: utf-8 -*-
"""Tune the MSPDI samples in sample-schedule/ so Delay Diagnostics reads each
one as an ordinarily managed project with a few delays (CR-618, section 9.2).

    python tools/tune_mspdi_samples.py            # rewrite the six samples
    python tools/tune_mspdi_samples.py --check    # exit 1 when a rewrite would change a byte

WHAT IT CHANGES. Only dates and progress (CR-618 decision 3): the status date,
and the actuals of leaf tasks and their assignments -- ActualStart,
ActualFinish, the percent columns, ActualDuration / RemainingDuration and
ActualWork / RemainingWork -- then the rolled-up actuals of the WBS ancestors
of every leaf it touched. It never changes the row tree, a name, a UID, a plan
date, a link or a file name, so every test that reads a sample keeps its rows.

THE TREATMENT IS A TABLE PER SAMPLE (TREATMENTS below), and en and ja get the
same table (CR-618 decision 5):

    statusDate  the new status date; every leaf the table does not name is
                progressed ON PLAN to it -- finished when its finish is on or
                before it, started when its start is, not started otherwise
    late        (uid, percent): the leaf started on plan but has not finished
                although its finish is before the status date
    seed        (uid, percent): a data-entry slip -- a percent complete typed
                into a leaf that has not started (table T-310 VC-5); placed
                near the end of a chain so DW-1 purples only its short
                downstream

A leaf that has not finished holds back what depends on it, so the tool
derives the rest over every link until nothing changes: an FS successor of a
leaf that has not finished does not start; an SS or FF successor of a leaf
that has not started does not start (VS-3); and no successor finishes while
its predecessor has not (VC-13). A late leaf that would be held back is an
error -- pick another.

A summary task's ActualDuration is also capped at the status date, so the stop
the importer derives from it is never after the status date (VS-5).

THE COUNTS ARE NOT DECIDED HERE. Table S of CR-618 is checked by
tests/contract/cr-618-the-mspdi-samples-read-as-managed-projects.contract.test.ts
with the real diagnoseDelay; this tool only writes the data.

NOT RECOMPUTED: costs, earned value, slack and variances. MS Project
recomputes them when it opens the file; GRS does not read them.

The rewrite is idempotent -- a leaf already in the state the table asks for is
left byte for byte -- so running it on its own output changes nothing, which
is what --check measures.
"""
from __future__ import annotations

import datetime as dt
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / 'sample-schedule'
LANGUAGES = ('en', 'ja')

# CR-618 section 9.2, table S. The status dates and late leaves are where the
# plan lets a delay of a few working days reach a terminal (JDG-1040).
TREATMENTS: dict[str, dict] = {
    'sample-small-website-renewal': {
        'statusDate': '2026-10-09T17:00:00',
        'late': [(34, 90), (35, 90)],       # Performance Tuning, Defect Fixing
        'seed': [(44, 10)],                 # Operations Handover
    },
    'sample-medium-sfa-webapp': {
        'statusDate': '2026-09-09T17:00:00',
        'late': [(35, 90), (43, 90)],       # Monitoring and Log Collection Setup, Code Review - Iteration 1
        'seed': [(128, 10)],                # Cutover Rehearsal
    },
    'sample-large-erp-program': {
        'statusDate': '2026-12-09T17:00:00',
        'late': [(11, 90),                  # Steering Committee #5
                 (87, 90), (98, 90), (109, 90), (120, 90),              # the four Playback Sessions
                 (128, 90), (132, 90), (136, 90), (140, 90), (144, 90), (148, 90)],  # the six Connection Tests
        'seed': [(243, 10)],                # Production Data Migration - Wave 2
    },
}

FINISH_TO_FINISH = 0
FINISH_TO_START = 1
START_TO_START = 3

NOT_STARTED = 'notStarted'
STARTED = 'started'
FINISHED = 'finished'

PERCENT_TAGS = ('PercentComplete', 'PercentWorkComplete', 'PhysicalPercentComplete')
DURATION = re.compile(r'PT(\d+)H(\d+)M(\d+)S')


def minutes_of(text: str) -> int:
    match = DURATION.fullmatch(text)
    if match is None:
        raise ValueError('not a PTnHnMnS duration: ' + text)
    hours, minutes, seconds = (int(part) for part in match.groups())
    return hours * 60 + minutes + seconds // 60


def duration_of(minutes: int) -> str:
    return 'PT%dH%dM0S' % (minutes // 60, minutes % 60)


class Element:
    """One <Task> or <Assignment> block; edits touch only its own leading columns."""

    def __init__(self, text: str) -> None:
        cut = min((at for at in (text.find(tag) for tag in ('<PredecessorLink>', '<Baseline>', '<ExtendedAttribute>',
                                                            '<TimephasedData>')) if at >= 0), default=len(text))
        self.head, self.tail = text[:cut], text[cut:]

    def text(self) -> str:
        return self.head + self.tail

    def get(self, tag: str) -> str | None:
        match = re.search('<%s>([^<]*)</%s>' % (tag, tag), self.head)
        return None if match is None else match.group(1)

    def set(self, tag: str, value: str) -> None:
        if self.get(tag) is None:
            raise KeyError(tag)
        self.head = re.sub('<%s>[^<]*</%s>' % (tag, tag), '<%s>%s</%s>' % (tag, value, tag), self.head, count=1)

    def set_if_present(self, tag: str, value: str) -> None:
        if self.get(tag) is not None:
            self.set(tag, value)

    def drop(self, tag: str) -> None:
        self.head = re.sub(r'\n[ \t]*<%s>[^<]*</%s>' % (tag, tag), '', self.head, count=1)

    def put(self, tag: str, value: str, after: str) -> None:
        """Set tag, inserting it after the element `after` when it is missing (MSPDI order)."""
        if self.get(tag) is not None:
            self.set(tag, value)
            return
        match = re.search(r'\n([ \t]*)<%s>[^<]*</%s>' % (after, after), self.head)
        if match is None:
            raise KeyError(after)
        line = '\n%s<%s>%s</%s>' % (match.group(1), tag, value, tag)
        self.head = self.head[:match.end()] + line + self.head[match.end():]

    def state(self) -> str:
        if self.get('ActualFinish') is not None:
            return FINISHED
        return NOT_STARTED if self.get('ActualStart') is None else STARTED


class Calendar:
    """The project calendar: weekdays and whole-day exceptions (enough for MSPDI samples)."""

    def __init__(self, xml: str) -> None:
        uid = re.search(r'<CalendarUID>([^<]*)</CalendarUID>', xml).group(1)
        body = next(block for block in re.findall(r'<Calendar>.*?</Calendar>', xml, re.S)
                    if re.search(r'<UID>%s</UID>' % uid, block))
        self.working_weekdays = {int(day) for day, working in
                                 re.findall(r'<WeekDay>\s*<DayType>(\d)</DayType>\s*<DayWorking>(\d)</DayWorking>', body)
                                 if working == '1'}
        self.off = set()
        for exception in re.findall(r'<Exception>.*?</Exception>', body, re.S):
            if re.search(r'<DayWorking>0</DayWorking>', exception) is None:
                continue
            first = dt.date.fromisoformat(re.search(r'<FromDate>([^<]{10})', exception).group(1))
            last = dt.date.fromisoformat(re.search(r'<ToDate>([^<]{10})', exception).group(1))
            while first <= last:
                self.off.add(first)
                first += dt.timedelta(days=1)

    def is_working(self, day: dt.date) -> bool:
        return (day.isoweekday() % 7) + 1 in self.working_weekdays and day not in self.off

    def working_days(self, first: dt.date, last: dt.date) -> int:
        """Working days from first to last, both included."""
        count = 0
        while first <= last:
            count += self.is_working(first)
            first += dt.timedelta(days=1)
        return count


def day_of(text: str | None) -> dt.date | None:
    return None if text is None else dt.date.fromisoformat(text[:10])


def set_progress(task: Element, assignments: list[Element], percent: int) -> None:
    for tag in PERCENT_TAGS:
        task.set_if_present(tag, str(percent))
    for total, done, left in (('Duration', 'ActualDuration', 'RemainingDuration'), ('Work', 'ActualWork', 'RemainingWork')):
        whole = minutes_of(task.get(total))
        task.set_if_present(done, duration_of(whole * percent // 100))
        task.set_if_present(left, duration_of(whole - whole * percent // 100))
    for assignment in assignments:
        assignment.set_if_present('PercentWorkComplete', str(percent))
        whole = minutes_of(assignment.get('Work'))
        assignment.set_if_present('ActualWork', duration_of(whole * percent // 100))
        assignment.set_if_present('RemainingWork', duration_of(whole - whole * percent // 100))


def mark_started(task: Element, assignments: list[Element], percent: int) -> None:
    task.put('ActualStart', task.get('Start'), after='OvertimeWork')
    task.drop('ActualFinish')
    for assignment in assignments:
        assignment.put('ActualStart', assignment.get('Start'), after='ActualOvertimeWork')
        assignment.drop('ActualFinish')
    set_progress(task, assignments, percent)


def mark_finished(task: Element, assignments: list[Element]) -> None:
    task.put('ActualStart', task.get('Start'), after='OvertimeWork')
    task.put('ActualFinish', task.get('Finish'), after='ActualStart')
    for assignment in assignments:
        assignment.put('ActualFinish', assignment.get('Finish'), after='ActualCost')
        assignment.put('ActualStart', assignment.get('Start'), after='ActualOvertimeWork')
    set_progress(task, assignments, 100)


def mark_not_started(task: Element, assignments: list[Element], percent: int = 0) -> None:
    task.drop('ActualStart')
    task.drop('ActualFinish')
    for assignment in assignments:
        assignment.drop('ActualStart')
        assignment.drop('ActualFinish')
    set_progress(task, assignments, 0)
    for tag in PERCENT_TAGS:
        task.set_if_present(tag, str(percent))


def roll_up(tasks: dict[int, Element], touched: set[int], parent_of: dict[int, int | None],
            children_of: dict[int, list[int]]) -> None:
    """Summaries above a touched leaf take their children's actuals (VC-9, VC-10, VC-12)."""
    ancestors = set()
    for uid in touched:
        at = parent_of.get(uid)
        while at is not None:
            ancestors.add(at)
            at = parent_of.get(at)
    for uid in sorted(ancestors, key=lambda one: -tasks[one].get('OutlineNumber').count('.')):
        summary = tasks[uid]
        kids = [tasks[kid] for kid in children_of[uid]]
        starts = sorted(kid.get('ActualStart') for kid in kids if kid.get('ActualStart') is not None)
        finishes = [kid.get('ActualFinish') for kid in kids]
        if starts:
            summary.put('ActualStart', starts[0], after='OvertimeWork')
        else:
            summary.drop('ActualStart')
        if starts and all(finish is not None for finish in finishes):
            summary.put('ActualFinish', max(finishes), after='ActualStart')
        else:
            summary.drop('ActualFinish')
        whole = sum(minutes_of(kid.get('Duration')) for kid in kids)
        spent = sum(minutes_of(kid.get('ActualDuration')) for kid in kids)
        percent = 100 if summary.get('ActualFinish') is not None else (spent * 100 // whole if whole else 0)
        for tag in PERCENT_TAGS:
            summary.set_if_present(tag, str(percent))
        own = minutes_of(summary.get('Duration'))
        summary.set_if_present('ActualDuration', duration_of(own * percent // 100))
        summary.set_if_present('RemainingDuration', duration_of(own - own * percent // 100))


def cap_at_status_date(summary: Element, calendar: Calendar, status: dt.date, minutes_per_day: int) -> None:
    """Keep ActualStart + ActualDuration (the importer's stop) on or before the status date (VS-5)."""
    start = day_of(summary.get('ActualStart'))
    if start is None or summary.get('ActualFinish') is not None or summary.get('ActualDuration') is None:
        return
    most = calendar.working_days(start, status) * minutes_per_day
    spent = minutes_of(summary.get('ActualDuration'))
    # WHY: the importer rounds the length to whole days (half away from zero) before it counts the stop.
    if int(spent / minutes_per_day + 0.5) * minutes_per_day <= most:
        return
    whole = minutes_of(summary.get('Duration'))
    summary.set('ActualDuration', duration_of(most))
    summary.set_if_present('RemainingDuration', duration_of(max(0, whole - most)))


def wanted_states(tasks: dict[int, Element], links: dict[int, list[tuple[int, int]]], leaves: list[int],
                  status: str, late: dict[int, int], seed: dict[int, int]) -> dict[int, str]:
    """The state each leaf should hold: on plan, then held back behind what has not finished."""
    wanted = {}
    for uid in leaves:
        task = tasks[uid]
        wanted[uid] = FINISHED if task.get('Finish') <= status else STARTED if task.get('Start') <= status \
            else NOT_STARTED
    for uid in late:
        if wanted[uid] != FINISHED:
            raise ValueError('a late leaf must be due by the status date: UID %d' % uid)
        wanted[uid] = STARTED
    for uid in seed:
        wanted[uid] = NOT_STARTED
    changed = True
    while changed:
        changed = False
        for successor, predecessors in links.items():
            for predecessor, kind in predecessors:
                if successor not in wanted or predecessor not in wanted:
                    continue
                before, after = wanted[predecessor], wanted[successor]
                held = (kind == FINISH_TO_START and before != FINISHED) or                        (kind in (START_TO_START, FINISH_TO_FINISH) and before == NOT_STARTED)
                if held and after != NOT_STARTED:
                    wanted[successor] = NOT_STARTED
                elif before != FINISHED and after == FINISHED:
                    wanted[successor] = STARTED
                else:
                    continue
                if successor in late:
                    raise ValueError('late UID %d is held back by UID %d' % (successor, predecessor))
                changed = True
    return wanted


def on_plan_percent(task: Element, calendar: Calendar, status: dt.date) -> int:
    start, finish = day_of(task.get('Start')), day_of(task.get('Finish'))
    whole = calendar.working_days(start, finish)
    return max(1, min(99, calendar.working_days(start, status) * 100 // whole)) if whole else 1


def tune(xml: str, treatment: dict) -> str:
    minutes_per_day = int(re.search(r'<MinutesPerDay>(\d+)</MinutesPerDay>', xml).group(1))
    calendar = Calendar(xml)
    if treatment['statusDate'] is not None:
        old = re.search(r'<StatusDate>([^<]*)</StatusDate>', xml).group(1)
        for tag in ('StatusDate', 'CurrentDate', 'LastSaved'):
            xml = re.sub(r'<%s>(\d{4}-\d\d-\d\d)(T[^<]*)</%s>' % (tag, tag),
                         lambda match: '<%s>%s%s</%s>' % (tag, treatment['statusDate'][:10], match.group(2), tag)
                         if match.group(1) == old[:10] else match.group(0), xml, count=1)
    status_text = re.search(r'<StatusDate>([^<]*)</StatusDate>', xml).group(1)
    status = day_of(status_text)

    tasks_start, tasks_end = xml.index('<Tasks>'), xml.index('</Tasks>')
    task_blocks = list(re.finditer(r'<Task>.*?</Task>', xml[tasks_start:tasks_end], re.S))
    tasks: dict[int, Element] = {}
    links: dict[int, list[tuple[int, int]]] = {}
    for match in task_blocks:
        element = Element(match.group(0))
        uid = int(element.get('UID'))
        tasks[uid] = element
        links[uid] = [(int(predecessor), int(kind)) for predecessor, kind in re.findall(
            r'<PredecessorUID>(\d+)</PredecessorUID>\s*<Type>(\d+)</Type>', element.tail)]
    assignment_section = re.search(r'<Assignments>.*?</Assignments>', xml, re.S)
    assignment_blocks = [] if assignment_section is None else \
        list(re.finditer(r'<Assignment>.*?</Assignment>', assignment_section.group(0), re.S))
    assignments = [Element(match.group(0)) for match in assignment_blocks]
    assignments_of: dict[int, list[Element]] = {}
    for assignment in assignments:
        assignments_of.setdefault(int(assignment.get('TaskUID')), []).append(assignment)

    uid_of = {task.get('OutlineNumber'): uid for uid, task in tasks.items()}
    parent_of = {uid: uid_of.get(task.get('OutlineNumber').rsplit('.', 1)[0]) if '.' in task.get('OutlineNumber')
                 else None for uid, task in tasks.items() if uid != 0}
    children_of: dict[int, list[int]] = {}
    for uid, parent in parent_of.items():
        if parent is not None:
            children_of.setdefault(parent, []).append(uid)
    leaves = [uid for uid in parent_of if uid not in children_of]

    late = dict(treatment['late'])
    seed = dict(treatment['seed'])
    wanted = wanted_states(tasks, links, leaves, status_text, late, seed)
    touched = set()
    for uid in leaves:
        task, own = tasks[uid], assignments_of.get(uid, [])
        before = task.text() + ''.join(one.text() for one in own)
        if uid in seed:
            mark_not_started(task, own, seed[uid])
        elif uid in late:
            mark_started(task, own, late[uid])
        elif wanted[uid] == task.state():
            continue
        elif wanted[uid] == FINISHED:
            mark_finished(task, own)
        elif wanted[uid] == STARTED:
            mark_started(task, own, on_plan_percent(task, calendar, status))
        else:
            mark_not_started(task, own)
        if task.text() + ''.join(one.text() for one in own) != before:
            touched.add(uid)
    roll_up(tasks, touched, parent_of, children_of)
    for uid in children_of:
        cap_at_status_date(tasks[uid], calendar, status, minutes_per_day)

    out, at = [], 0
    for match, element in zip(task_blocks, tasks.values()):
        out.append(xml[at:tasks_start + match.start()])
        out.append(element.text())
        at = tasks_start + match.end()
    rest = xml[at:]
    if assignment_section is not None:
        section_at = assignment_section.start() - at
        section = assignment_section.group(0)
        rebuilt, cursor = [], 0
        for match, element in zip(assignment_blocks, assignments):
            rebuilt.append(section[cursor:match.start()])
            rebuilt.append(element.text())
            cursor = match.end()
        rebuilt.append(section[cursor:])
        rest = rest[:section_at] + ''.join(rebuilt) + rest[section_at + len(section):]
    out.append(rest)
    return ''.join(out)


def main(argv: list[str]) -> int:
    check = '--check' in argv
    stale = []
    for stem, treatment in TREATMENTS.items():
        for language in LANGUAGES:
            path = SAMPLES / ('%s.%s.xml' % (stem, language))
            before = path.read_bytes().decode('utf-8')
            after = tune(before, treatment)
            if after == before:
                continue
            if check:
                stale.append(path.name)
            else:
                path.write_bytes(after.encode('utf-8'))
                print('rewrote', path.name)
    if stale:
        print('stale: ' + ', '.join(stale) + ' -- run python tools/tune_mspdi_samples.py')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
