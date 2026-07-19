# I/O Round-Trips — Sequence Diagrams (JSON + MSPDI, CR-001/CR-002 target)

Import / export round-trips for gr-scheduler, derived from
`src/domain/usecase/json-codec.ts` (`serializeScheduleDocument` /
`deserializeScheduleDocument` / `validateScheduleDocument`),
`src/domain/usecase/mspdi-codec.ts` (`exportMspdi` / `importMspdi`,
`SIDECAR_PREFIX = "grsch-sidecar:"`), and
`src/adapters/io/import-service.ts` (`importDocumentFile`, byte sniffing).
Target actual-date / dependency / deadline fields are annotated as they flow
through.

> Legend for field flow: **[impl]** = round-trips in the current code; **[target]**
> = CR-001/CR-002 target mapping (actual dates, dependency link type/lag, deadline,
> baseline reference), not yet emitted as standard MSPDI elements by the code (today
> it survives ONLY via the loss-free sidecar). See the ambiguity notes at the bottom.

## (a) JSON export -> import (primary format, loss-free)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Shell as App Shell (C032)
    participant FileIO as File I/O (C024)
    participant Import as Import Service (C024/C026)
    participant JsonCodec as JSON Codec (C017)
    participant Sanitizer as Sanitize+Validate (C026)
    participant Model as ScheduleDocument (C001)

    rect rgb(230,245,255)
    note over User,Model: EXPORT (.json)
    User->>Shell: save as JSON
    Shell->>JsonCodec: serializeScheduleDocument(document)
    note right of JsonCodec: writes startDate/endDate,<br/>actualStart/actualEnd,<br/>targetDate, progressRatio,<br/>dependency linkType/lagDays,<br/>viewState.planActualStyle<br/>(baseline = separate reference doc, not a field)
    JsonCodec-->>Shell: json text
    Shell->>FileIO: writeFile(name.json, json)
    FileIO-->>User: download .json
    end

    rect rgb(235,255,235)
    note over User,Model: IMPORT (.json)
    User->>Import: importDocumentFile(file)
    Import->>FileIO: readFileAsText(file)
    FileIO-->>Import: text
    Import->>Import: sniff bytes (not leading "<") -> JSON route
    Import->>JsonCodec: deserializeScheduleDocument(text)
    JsonCodec->>Sanitizer: validateScheduleDocument(parsed)
    note right of Sanitizer: reject on schema/type mismatch;<br/>trust-boundary gate (security-design)
    Sanitizer-->>JsonCodec: validated document
    JsonCodec-->>Import: ScheduleDocument
    Import->>Model: replace current document (DATA-JSON-001)
    Model-->>User: chart re-rendered
    end
```

## (b) MSPDI export -> import (standard elements + loss-free sidecar)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Shell as App Shell (C032)
    participant FileIO as File I/O (C024)
    participant Import as Import Service (C024/C026)
    participant Mspdi as MSPDI Codec (C018)
    participant JsonCodec as JSON Codec (C017)
    participant Model as ScheduleDocument (C001)

    rect rgb(230,245,255)
    note over User,Model: EXPORT (.xml)
    User->>Shell: save as MSPDI
    Shell->>Mspdi: exportMspdi(document)
    loop per item -> Task
        Mspdi->>Mspdi: emit Start/Finish, Milestone,<br/>OutlineLevel, PredecessorLink [impl]
        Mspdi->>Mspdi: map ActualStart/ActualFinish,<br/>PercentComplete, Deadline,<br/>PredecessorLink Type/LinkLag,<br/>Resource(assignee) [target]
    end
    opt baseline reference document loaded (separate JSON, read-only)
        Mspdi->>Mspdi: id-match current items to baseline<br/>snapshot -> BaselineStart/Finish (best-effort)
    end
    Mspdi->>JsonCodec: serializeScheduleDocument(document)
    JsonCodec-->>Mspdi: full json
    Mspdi->>Mspdi: sidecar = "grsch-sidecar:" + base64(json)<br/>into Project <Notes> (loss-free)
    Mspdi-->>Shell: MSPDI xml
    Shell->>FileIO: writeFile(name.xml, xml)
    FileIO-->>User: download .xml
    end

    rect rgb(235,255,235)
    note over User,Model: IMPORT (.xml)
    User->>Import: importDocumentFile(file)
    Import->>FileIO: readFileAsText(file)
    FileIO-->>Import: text (leading "<" -> MSPDI route)
    Import->>Mspdi: importMspdi(xml)
    Mspdi->>Mspdi: assertWithinByteLimit + rejectXmlDoctype (XXE guard)
    Mspdi->>Mspdi: read <Notes>
    alt sidecar present ("grsch-sidecar:")
        Mspdi->>JsonCodec: deserializeScheduleDocument(base64-decoded json)
        note right of JsonCodec: full sanitize+validate (defence in depth);<br/>ALL target fields restored loss-free
        JsonCodec-->>Mspdi: ScheduleDocument
    else no sidecar (foreign MSPDI)
        Mspdi->>Mspdi: reconstructFromStandardMspdi(xml)<br/>Task Start/Finish/Milestone -> items [lossy]
        note right of Mspdi: [target] read ActualStart/Finish,<br/>PercentComplete, Deadline,<br/>PredecessorLink Type/LinkLag, Resource;<br/>Baseline only as best-effort id-match<br/>into a separate reference doc
    end
    Mspdi-->>Import: ScheduleDocument
    Import->>Model: replace current document
    Model-->>User: chart re-rendered
    end
```

## GR (CR-001/CR-002 target) <-> MSPDI field mapping (reference for both directions)

| GR field | MSPDI element | Status |
|---|---|---|
| startDate / endDate | Task Start / Finish | [impl] |
| actualStart / actualEnd | ActualStart / ActualFinish | [target] (CR-001) |
| progressRatio | PercentComplete | [target] (CR-001) |
| baseline reference doc (separate JSON, id-matched) | BaselineStart / BaselineFinish | [target] (CR-002 Part 3, best-effort id-match) |
| targetDate | Deadline | [target] (CR-001) |
| dependency.linkType | PredecessorLink/Type (FF=0/FS=1/SF=2/SS=3) | [target] (CR-001) |
| dependency.lagDays | PredecessorLink/LinkLag (+ LagFormat) | [target] (CR-001) |
| assignee | Resource / Assignment | [target] |
| section / row hierarchy | OutlineLevel + Summary | [target] |
| everything (icons, colors, multi-bar, comments, watermark, rounded-box) | base64 JSON sidecar in `<Notes>` | [impl] |

Flagged ambiguities (not guessed):

- The **current** `mspdi-codec.ts` emits only `<Start>/<Finish>/<Milestone>/
  <OutlineLevel>1</OutlineLevel>` and a `PredecessorLink` with a fixed
  `Type = FINISH_TO_START`; `actualStart/actualEnd`, `progressRatio`,
  `targetDate`, `linkType`, `lagDays`, and `assignee` are NOT yet written as standard
  elements. They round-trip today ONLY through the loss-free sidecar. The `[target]`
  rows above are the CR-001/CR-002 target; they are shown so the sequence is
  implementable, and are explicitly marked as target rather than presented as existing
  behavior.
- Baseline (former plan) is NOT a `previousPlan` field anymore (CR-002 Part 3): it is a
  **separate JSON reference document** loaded read-only and id-matched to the current
  items. MSPDI `BaselineStart/BaselineFinish` is therefore **best-effort id-match** in
  both directions, not a clean 1:1 field mapping. Reference baselines are JSON-only
  (MSPDI XML cannot serve as a baseline source).
- `importDocumentFile` routes purely on the leading `<` byte (MSPDI) vs otherwise
  (JSON); this matches the source and is not an assumption.
```
