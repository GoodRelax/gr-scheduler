# Component Architecture (full, ~35 components) — SSOT

Comprehensive Clean-Architecture component map for gr-scheduler, covering all
components ARCH-C-001..035 from `docs/spec/30-architecture.sdoc`, grouped by
layer (Entity / UseCase / Adapter / Framework). Dependencies point **inward**
(DIP): Framework -> Adapter -> UseCase -> Entity; the core (Entity / UseCase)
never references Adapter / Framework. This is the detailed map the 15-node
overview in 30-architecture.sdoc §3 lacks. Layer colors follow the project
default legend (Entity #FF8C00, UseCase #FFD700, Adapter #90EE90,
Framework #87CEEB).

Node ids are ASCII (`Cnnn` = ARCH-C-nnn). Labels carry the component name and
its `src/` module path.

## A. Full component map (all 35 nodes, DIP-respecting edges)

```mermaid
flowchart LR
    subgraph FW["Framework layer"]
        C032["ARCH-C-032 App Shell / single-file bootstrap<br/>src/main.ts"]
        C033["ARCH-C-033 DOM SVG Web-API Host<br/>src/framework/host.ts"]
        C034["ARCH-C-034 Dev Logger / Error Toast<br/>src/framework/observability.ts"]
    end
    subgraph AD["Adapter layer"]
        C022["ARCH-C-022 SVG Renderer<br/>src/adapters/render/svg-renderer.ts"]
        C023["ARCH-C-023 Pointer / Gesture Controller<br/>src/adapters/input/pointer-controller.ts"]
        C024["ARCH-C-024 File I/O<br/>src/adapters/io/file-io.ts"]
        C025["ARCH-C-025 Autosave (localStorage)<br/>src/adapters/persistence/autosave.ts"]
        C026["ARCH-C-026 Import Sanitizer<br/>src/domain/usecase/import-sanitizer.ts + adapters/io/import-service.ts"]
        C027["ARCH-C-027 Clipboard<br/>src/adapters/clipboard/clipboard.ts"]
        C028["ARCH-C-028 i18n / Font<br/>src/adapters/i18n/i18n-font.ts"]
        C029["ARCH-C-029 Property / Palette UI<br/>src/adapters/ui/property-panel.ts"]
        C030["ARCH-C-030 Tool Palette UI<br/>src/adapters/ui/tool-palette.ts"]
        C031["ARCH-C-031 Watermark Overlay<br/>src/adapters/render/watermark-overlay.ts"]
    end
    subgraph UC["UseCase layer"]
        C009["ARCH-C-009 Time-Coordinate Mapper<br/>src/domain/usecase/time-coordinate-mapper.ts"]
        C010["ARCH-C-010 Anisotropic Zoom + LOD Selector<br/>src/domain/usecase/lod-selector.ts"]
        C011["ARCH-C-011 Layout Engine (multi-bar)<br/>src/domain/usecase/layout-engine.ts"]
        C012["ARCH-C-012 Alignment Solver<br/>src/domain/usecase/alignment-solver.ts"]
        C013["ARCH-C-013 Dependency Router<br/>src/domain/usecase/dependency-router.ts"]
        C014["ARCH-C-014 Progress-Line Builder<br/>src/domain/usecase/progress-line-builder.ts"]
        C015["ARCH-C-015 Section / Row Organizer<br/>src/domain/usecase/section-organizer.ts"]
        C016["ARCH-C-016 Cursor / Span Calc<br/>src/domain/usecase/cursor-span.ts"]
        C017["ARCH-C-017 JSON Codec<br/>src/domain/usecase/json-codec.ts"]
        C018["ARCH-C-018 MSPDI Codec<br/>src/domain/usecase/mspdi-codec.ts"]
        C019["ARCH-C-019 Command / History (Undo/Redo)<br/>src/domain/usecase/history-manager.ts"]
        C020["ARCH-C-020 Template Provider<br/>src/domain/usecase/template-provider.ts"]
        C021["ARCH-C-021 Viewport Coordinator<br/>src/domain/usecase/viewport-coordinator.ts"]
        C035["ARCH-C-035 Extension Ports (reserved)<br/>src/domain/ports/extension-ports.ts"]
    end
    subgraph EN["Entity layer"]
        C001["ARCH-C-001 ScheduleDocument aggregate<br/>src/domain/model/schedule-model.ts"]
        C002["ARCH-C-002 Section / Row model"]
        C003["ARCH-C-003 Item model"]
        C004["ARCH-C-004 Dependency model"]
        C005["ARCH-C-005 Annotation model<br/>src/domain/model/annotation.ts"]
        C006["ARCH-C-006 Watermark model"]
        C007["ARCH-C-007 ViewState model"]
        C008["ARCH-C-008 Palette / i18n value model"]
    end

    %% Framework -> Adapter / inner
    C032 --> C033
    C032 -->|new doc| C020
    C032 -->|load/save| C017
    C033 -->|hosts| C022
    C033 -->|hosts| C023
    C033 -->|hosts| C024
    C033 -->|hosts| C025
    C034 -->|observes status| C025
    C034 -->|observes rejects| C026

    %% Adapter -> UseCase (via ports)
    C022 --> C011
    C022 --> C013
    C022 --> C014
    C022 --> C009
    C023 --> C012
    C023 --> C010
    C023 --> C021
    C023 -->|dispatch cmd| C019
    C024 --> C017
    C024 --> C018
    C025 --> C017
    C027 -->|dispatch cmd| C019
    C028 --> C008
    C029 -->|edit via cmd| C019
    C029 --> C003
    C030 -->|invoke| C019
    C031 --> C006
    %% Adapter -> Entity (sanitizer produces a validated model)
    C026 -->|produces model| C001

    %% UseCase -> Entity + intra-UseCase
    C009 --> C007
    C010 --> C003
    C010 --> C007
    C011 --> C002
    C011 --> C003
    C012 --> C003
    C013 --> C004
    C013 --> C003
    C014 --> C003
    C014 -->|uses| C009
    C014 -->|uses| C011
    C015 --> C002
    C016 --> C007
    C016 -->|uses| C009
    C017 --> C001
    C018 --> C001
    C018 -->|reuses| C017
    C019 --> C001
    C020 --> C001
    C021 --> C007
    C035 -.reserved.-> C001

    classDef entity fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a;
    classDef usecase fill:#FFD700,stroke:#8a7400,color:#1a1a1a;
    classDef adapter fill:#90EE90,stroke:#2f7d32,color:#1a1a1a;
    classDef framework fill:#87CEEB,stroke:#2a6f97,color:#1a1a1a;

    class C001,C002,C003,C004,C005,C006,C007,C008 entity;
    class C009,C010,C011,C012,C013,C014,C015,C016,C017,C018,C019,C020,C021,C035 usecase;
    class C022,C023,C024,C025,C026,C027,C028,C029,C030,C031 adapter;
    class C032,C033,C034 framework;
```

> Note: ARCH-C-005 (Annotation) has no inbound edge in this view because the M-series
> annotation editor/renderer wiring (comment + rounded-box) is drawn by the SVG Renderer
> (C022) and edited via the command store (C019); the explicit C022->C005 / C029->C005
> edges are omitted to reduce clutter. The aggregation of C002..C008 under the
> ScheduleDocument root (C001) is shown in `domain-model-class.md`, not here.

## B. Layer-level DIP invariant (reading aid)

```mermaid
flowchart LR
    FWb["Framework<br/>C032..C034"] --> ADb["Adapter<br/>C022..C031"]
    ADb -->|implements ports of| UCb["UseCase<br/>C009..C021, C035"]
    UCb -->|operates on| ENb["Entity<br/>C001..C008"]

    classDef entity fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a;
    classDef usecase fill:#FFD700,stroke:#8a7400,color:#1a1a1a;
    classDef adapter fill:#90EE90,stroke:#2f7d32,color:#1a1a1a;
    classDef framework fill:#87CEEB,stroke:#2a6f97,color:#1a1a1a;
    class ENb entity;
    class UCb usecase;
    class ADb adapter;
    class FWb framework;
```

> Ambiguity flagged (not guessed): `30-architecture.sdoc` proposes module paths
> under `src/adapter/...` and `src/domain/{geometry,zoom,layout,...}`, but the ACTUAL
> tree uses `src/adapters/...` and flattens the UseCase services under
> `src/domain/usecase/...` (e.g. `time-coordinate-mapper.ts`, `layout-engine.ts`,
> `import-sanitizer.ts`). The paths above are taken from the real source tree; the
> `.sdoc` proposed paths are noted where they differ. The sanitizer (ARCH-C-026)
> spans two files in practice: the pure `domain/usecase/import-sanitizer.ts` and the
> orchestrating `adapters/io/import-service.ts`.
```
