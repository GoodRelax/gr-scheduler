# Component / DIP Overview (15-node) — SSOT

Reduced dependency overview for `docs/spec/30-architecture.sdoc` §3. It shows the
Dependency-Inversion direction between the four Clean-Architecture layers: edges
point **inward** (Framework -> Adapter -> UseCase -> Entity); the core
(Entity / UseCase) never references Adapter / Framework, and Adapters implement
the ports the UseCase layer exposes. UseCase services (ARCH-C-009..021, C035) and
the Entity models (ARCH-C-001..008) are collapsed into single nodes here; the full
per-component map lives in `component-architecture-full.md`.

Layer colors follow the project default legend (Entity #FF8C00, UseCase #FFD700,
Adapter #90EE90, Framework #87CEEB).

```mermaid
flowchart RL
    subgraph Framework
        Shell["ARCH-C-032<br/>App Shell"]
        Host["ARCH-C-033<br/>DOM SVG Host"]
        Obs["ARCH-C-034<br/>Dev Logger Toast"]
    end
    subgraph Adapter
        Render["ARCH-C-022<br/>SVG Renderer"]
        Pointer["ARCH-C-023<br/>Pointer Controller"]
        FileIO["ARCH-C-024<br/>File IO"]
        Auto["ARCH-C-025<br/>Autosave"]
        Sanit["ARCH-C-026<br/>Import Sanitizer"]
        Clip["ARCH-C-027<br/>Clipboard"]
        I18n["ARCH-C-028<br/>i18n Font"]
        PropUI["ARCH-C-029<br/>Property Palette UI"]
        ToolUI["ARCH-C-030<br/>Tool Palette UI"]
        WmUI["ARCH-C-031<br/>Watermark Overlay"]
    end
    subgraph UseCase
        UcCore["UseCase Services<br/>ARCH-C-009..021<br/>ARCH-C-035"]
    end
    subgraph Entity
        EnCore["Domain Model<br/>ARCH-C-001..008"]
    end
    Shell -->|bootstraps| Host
    Host -->|hosts| Render
    Host -->|hosts| Pointer
    Obs -->|observes| Auto
    Render -->|depends on port| UcCore
    Pointer -->|dispatches command| UcCore
    FileIO -->|depends on port| UcCore
    Auto -->|depends on port| UcCore
    Sanit -->|produces model for| UcCore
    Clip -->|dispatches command| UcCore
    I18n -->|resolves values via| UcCore
    PropUI -->|edits via| UcCore
    ToolUI -->|invokes| UcCore
    WmUI -->|reads state from| UcCore
    UcCore -->|operates on| EnCore

    classDef entity fill:#FF8C00,stroke:#8a4b00,color:#1a1a1a;
    classDef usecase fill:#FFD700,stroke:#8a7400,color:#1a1a1a;
    classDef adapter fill:#90EE90,stroke:#2f7d32,color:#1a1a1a;
    classDef framework fill:#87CEEB,stroke:#2a6f97,color:#1a1a1a;

    class EnCore entity;
    class UcCore usecase;
    class Render,Pointer,FileIO,Auto,Sanit,Clip,I18n,PropUI,ToolUI,WmUI adapter;
    class Shell,Host,Obs framework;
```

> The import sanitizer (ARCH-C-026) spans two files in the real tree: the pure
> `src/domain/usecase/import-sanitizer.ts` (validation/sanitize) and the orchestrating
> `src/adapters/io/import-service.ts` (file wiring). The Framework layer has no separate
> directory in the real tree; ARCH-C-032/033 host wiring is folded into `src/app/main.ts`
> and the dev logger / toast (ARCH-C-034) lives in `src/app/logger.ts` + `src/app/benchmark.ts`.
