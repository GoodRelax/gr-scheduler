# スキーマの冒頭（ルートの description）の案 —— 2026-10-25

今の冒頭（`JDG-3330`・`JDG-3333`・`JDG-3338`）の「Terms:」の後に「Concepts:」の段を足した形。
Concepts の文言は Copilot の案を土台にし、タスクグループの文は利用者の指摘（タスクグループパネルにタスクは入らない）で直した。
形は今のまま —— 空行を入れず、木は `schedule` の下を 2 組に並べる（`JDG-3333`）。
時刻の決まりは冒頭に置かず、例外の 2 つ（`WorkingTime.toTime`・`Exception.toDate`）の説明にだけ書く（利用者の方針）。
まだ確かめ（Haiku → Sonnet → 席）の前の下書きである。

```text
Terms:
GRS is GoodRelax Scheduler, which reads and writes the JSON files defined by this schema.
MSPDI (Microsoft Project XML Data Interchange) is the XML file format used by Microsoft Project. GRS can also read and write MSPDI (.xml) files.
"Same as MSPDI X" indicates that the property has the same meaning and values as MSPDI element X. Any GRS-specific differences are noted with that property.
Concepts:
WBS is the tree of parent and child tasks, as in MSPDI.
Task groups are GRS's own objects that let several tasks be drawn in one row of the chart. Each task belongs to exactly one task group.
GRS counts working days using a single calendar: the one referenced by project.calendarUid.
"Carried" means GRS does not use the value, but preserves it and writes it back to MSPDI unchanged.
Actual dates are the authoritative source of task progress. Whether a task is not started, in progress, suspended, or finished is determined from its actual dates. GRS recalculates percentComplete from those dates when opening a GRS JSON file.
The shape of GRS JSON:
$schema           Address of this schema
schemaVersion     Version of the shape
buildVersion      GRS build that wrote the file
schedule          Schedule data
  +- project, calendars, tasks, resources, assignments (same as MSPDI)
  +- taskGroups, taskGroupMembers, taskVisuals, taskOrigins,
     baselineTasks, commentBoxes, highlightBoxes
documentSettings  How the schedule is drawn when opened
documentStamp     Last change, last save and last writer
changeLogEntries  Notes on changes
A property with no value is omitted: null and [] are never written.
```

- 冒頭に「Concepts:」を足すことは `JDG-3331`（冒頭は語の定めと短い文だけ）の一部を覆すので、決まったら裁定の行を書く。
