# Domain Model — Class Diagram (CR-001/CR-002 target — actual-date fields)

Entity-layer domain model of gr-scheduler in its **CR-001/CR-002 target state
(actual-date fields)**. This is a `classDiagram` derived from
`src/domain/model/schedule-model.ts` + `src/domain/model/annotation.ts`, with the
CR-001 (actual-date / dependency / deadline) and CR-002 (previousPlan abolished,
baseline moved to a separate reference document) changes applied (see
`project-records/change-requests/change-request-001-20260719-230349.md` and
`project-records/change-requests/change-request-002-20260720-054132.md`).

All classes below live in the **Entity** layer (Clean Architecture), so they all
carry the Entity color (#FF8C00) per the project legend.

> IMPORTANT (spec-ahead-of-code): this diagram reflects the **CR-001/CR-002
> target (actual-date fields)**, which the code has NOT yet adopted. Versus the
> current source `ScheduleItem` (which still carries `planActualKind` /
> `planGroupId` and `previousPlan`): `ScheduleItem` GAINS `actualStart`,
> `actualEnd`, `targetDate`, DROPS `planActualKind` / `planGroupId`, and (per
> CR-002 Part 3) DROPS `previousPlan` — baseline (former plan) is now a separate,
> id-matched, read-only reference document, not a field. `Dependency` GAINS
> `linkType` + signed `lagDays`; `ViewState` GAINS `planActualStyle`
> (overlap|separate). Per CR-001 §8 / CR-002 §8 the schema.json and `src/**` are
> changed only in the implementation session, so until then this is a design
> target, not the running code.

```mermaid
classDiagram
    direction LR

    class ScheduleDocument {
        +string projectId
        +number schemaVersion
        +string title
        +IsoDate epochDate
        +ViewState viewState
        +Section[] sections
        +Row[] rows
        +ScheduleItem[] items
        +Dependency[] dependencies
        +Annotation[] annotations
        +ImportedAsset[] assets
        +DeclaredCategory[] declaredCategories
    }

    class Section {
        +string id
        +string name
        +number order
        +string[] rowIds
        +boolean collapsed
    }

    class Row {
        +string id
        +string sectionId
        +string classificationLabel
        +string subClassificationLabel
        +number order
        +0|1|2 depth
    }

    class ScheduleItem {
        +string id
        +string rowId
        +ItemKind itemKind
        +IsoDate startDate  «plan span start»
        +IsoDate|null endDate  «plan span end»
        +IsoDate actualStart  «NEW: actual start (CR-001)»
        +IsoDate|null actualEnd  «NEW: actual end (CR-001)»
        +IsoDate targetDate  «NEW: deadline marker (CR-001)»
        +number progressRatio  «0..1»
        +string abbrev
        +number importance
        +IconShapeKind iconShapeKind
        +string fillColor
        +string strokeColor
        +string assignee
        +string status
        +string importedAssetId
    }

    class BaselineReferenceDocument {
        <<separate read-only document>>
        +ScheduleDocument snapshot  «former plan, loaded as grey underlay»
        +string matchKey  «id-matched to current items»
        +boolean actualsIgnored  «plan dates only; CR-002 Part 3»
    }

    class Dependency {
        +string id
        +string fromItemId
        +AnchorIndex fromAnchor  «0..8»
        +string toItemId
        +AnchorIndex toAnchor  «0..8»
        +LinkType linkType  «NEW C: FS|SS|FF|SF»
        +number lagDays  «NEW C: signed; +lag / -lead»
        +number bends  «0..3»
        +string strokeColor
    }

    class ViewState {
        +number zoomX
        +number zoomY
        +number scrollX
        +number scrollY
        +FontScale fontScale
        +PlanActualStyle planActualStyle  «NEW H: overlap|separate, default overlap»
        +PlanActualDisplay planActualDisplay  «plan-only|actual-only|both|none»
        +boolean progressLineVisible
        +boolean todayLineVisible
        +DualCursorState dualCursor
        +Watermark watermark
        +Locale activeLocale
    }

    class Watermark {
        +boolean enabled
        +string userName
        +string timestamp
        +string hideHash
    }

    class Annotation {
        <<abstract>>
        +string id
        +AnnotationKind annotationKind
    }
    class CommentAnnotation {
        +string text
        +IsoDate anchorDate
        +number anchorRowIndex
        +string anchorItemId
        +AnchorIndex anchorPoint
        +Offset bodyOffsetPx
    }
    class RoundedBoxAnnotation {
        +IsoDate startDate
        +IsoDate endDate
        +number topRowIndex
        +number bottomRowIndex
        +string strokeColor
        +number cornerRadiusPx
    }

    class ImportedAsset {
        +string id
        +ImportedAssetFormat assetFormat  «svg|png»
        +string sanitizedDataUri  «self-contained data: URI»
    }

    class LinkType {
        <<enumeration>>
        FS
        SS
        FF
        SF
    }
    class PlanActualStyle {
        <<enumeration>>
        overlap
        separate
    }

    ScheduleDocument "1" *-- "1" ViewState : viewState
    ScheduleDocument "1" *-- "0..*" Section : sections
    ScheduleDocument "1" *-- "0..*" Row : rows
    ScheduleDocument "1" *-- "0..*" ScheduleItem : items
    ScheduleDocument "1" *-- "0..*" Dependency : dependencies
    ScheduleDocument "1" *-- "0..*" Annotation : annotations
    ScheduleDocument "1" *-- "0..*" ImportedAsset : assets
    ViewState "1" *-- "0..1" Watermark : watermark
    Section "1" o-- "0..*" Row : rowIds
    Row "1" o-- "0..*" ScheduleItem : rowId
    BaselineReferenceDocument ..> ScheduleItem : id-matched underlay (read-only)
    ScheduleItem "0..*" ..> "0..1" ImportedAsset : importedAssetId
    Dependency "0..*" ..> "1" ScheduleItem : fromItemId
    Dependency "0..*" ..> "1" ScheduleItem : toItemId
    Dependency ..> LinkType : linkType
    ViewState ..> PlanActualStyle : planActualStyle
    Annotation <|-- CommentAnnotation
    Annotation <|-- RoundedBoxAnnotation

    style ScheduleDocument fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style Section fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style Row fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style ScheduleItem fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style BaselineReferenceDocument fill:#FFE0A3,stroke:#8a4b00,color:#1a1a1a
    style Dependency fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style ViewState fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style Watermark fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style Annotation fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style CommentAnnotation fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style RoundedBoxAnnotation fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style ImportedAsset fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a
    style LinkType fill:#FFE0A3,stroke:#8a4b00,color:#1a1a1a
    style PlanActualStyle fill:#FFE0A3,stroke:#8a4b00,color:#1a1a1a
```

Notes and flagged ambiguities:

- `ScheduleItem` shows a curated field set. The real type also carries the full
  PROP-L1-002 property fields (`fullName`, `description`, `major/middle/minorCategory`,
  `remarks`, `lineWeight`, `labelPosition`, `labelOffset`, `fadeInDays`, `fadeOutDays`,
  `milestoneShape`, `taskShape`, `fillColorExplicit`) — omitted here for readability,
  not dropped by CR-001/CR-002. `labelPosition` enum values include
  `inner-left` (in-bar left-aligned, the CR-003 default for task labels), distinct
  from the outside-the-bar `left`.
- Baseline (former/changed-from plan) is NOT a field on `ScheduleItem` anymore.
  Per CR-002 Part 3 it is a **separate reference document** (`BaselineReferenceDocument`
  above): a past-plan snapshot loaded (JSON only) with a "treat as baseline" flag,
  id-matched to the current items, rendered as a read-only grey underlay at the same
  row height (plan dates only; its actuals are ignored). This supersedes the CR-001
  `previousPlan` field.
- `AnnotationKind` = `callout-box | polyline | rounded-box`; `CommentAnnotation.annotationKind`
  is one of the two comment-leader kinds, `RoundedBoxAnnotation.annotationKind` is `rounded-box`.
- CR-001 does NOT specify where `planActualStyle` sits other than "viewState"; it is
  placed on `ViewState` alongside the existing `planActualDisplay`, consistent with the
  CR §2 diff. `LinkType` mnemonic order (FS/SS/FF/SF) is the GR-facing set; the MSPDI
  numeric mapping (FF=0/FS=1/SF=2/SS=3) is a codec concern shown in
  `sequence-io-roundtrip.md`, not stored on the enum.
```
