---
type: Index
title: "MSPDI (MS Project XML) reference -- how to obtain the authoritative schema"
description: "The XSD is NOT in this repository. Where it comes from, how to fetch it, and how to verify the copy you fetched."
tags: [mspdi]
phase: survey
status: stable
---
# MSPDI (MS Project XML) reference — how to obtain the schema

## Read this first

**Nothing third-party is committed to this repository. This `README.md` is the only
tracked file in this folder.** The schema and the upstream documentation are fetched
locally by whoever needs them (see [How to fetch](#how-to-fetch)).

That is deliberate. The schema carries `(c) 2007 Microsoft Corporation. All rights
reserved.` and grants no explicit redistribution licence, so it is not redistributed
here. The Microsoft Learn documentation is CC-BY-4.0 and *could* be redistributed with
attribution, but it is left out too — one rule, no exceptions, nothing to argue about.

## Which one is authoritative

```
Authoritative      https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd
Local copy         docs/reference/mspdi/mspdi_pj12.xsd   (fetch it yourself; git-ignored)
```

**The copy lives outside this folder.** `previous-project-result/` is the frozen result of
the first project, while the schema is an external source the current project keeps
consulting, so the copies sit on the project's own reference shelf at `docs/reference/`.
This file stays here because every document in `previous-project-result/` points at it.

**Rule, one sentence: check MSPDI facts against the local copy, but cite the official URL.**
The local copy is a byte-identical replica, so looking at it and quoting the URL are the
same claim. Do not call the local file "the authority" — it is a cache.

## If you cannot reach the web

The Japanese summaries in `../mspdi-*.md` are **secondary sources and can be wrong**
(several were, and were corrected against the XSD). Without the XSD you cannot verify them.

**Then say so.** Write "unverified — the XSD was not available" rather than asserting a
fact you could not check. Guessing and stating it as fact is the failure this whole
reference set exists to prevent.

Ask whoever set up the environment to place `mspdi_pj12.xsd` in `docs/reference/mspdi/`.
It is one file and needs no build step.

## How to fetch

Run from the repository root. Requires `curl`; `git` only for the Learn docs.

```sh
VDIR="docs/reference/mspdi"

# 1) The MSPDI XML schema — this is the one you need
curl -fsSL "https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd" \
  -o "$VDIR/mspdi_pj12.xsd"

# 2) Optional: Microsoft Learn element reference (human-readable prose)
git clone --depth 1 \
  https://github.com/MicrosoftDocs/office-developer-msproject-xml-docs /tmp/msp-docs
mkdir -p "$VDIR/learn-docs"
cp -r /tmp/msp-docs/project-xml-data-interchange "$VDIR/learn-docs/"
cp /tmp/msp-docs/LICENSE   "$VDIR/learn-docs/LICENSE"
cp /tmp/msp-docs/README.md "$VDIR/learn-docs/UPSTREAM-README.md"
```

## How to verify what you fetched

The copy this reference set was written against:

| | |
| --- | --- |
| Size | **239,895 bytes** |
| Lines | **3,906** |
| SHA-256 | **`a3e9138f0f02df06d7b1254be6190c2dd48fdcf6a2445ab79a6abab765a8c7b4`** |
| Schema version | Microsoft Office Project **2007** (`pj12` = Project 12). Header revision date `2007-11-28` |

```sh
sha256sum docs/reference/mspdi/mspdi_pj12.xsd     # Linux
shasum -a 256 docs/reference/mspdi/mspdi_pj12.xsd # macOS
certutil -hashfile docs\reference\mspdi\mspdi_pj12.xsd SHA256   # Windows
```

**A different hash is not automatically a problem** — Microsoft may have republished the
file. It does mean the line numbers quoted throughout `previous-project-result/` may no longer line up,
so locate elements by name rather than by line.

## Official links

- Schema (XSD): <https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd>
- Introduction: <https://learn.microsoft.com/en-us/office-project/xml-data-interchange/introduction-to-project-xml-data>
- Project elements / structure: <https://learn.microsoft.com/en-us/office-project/xml-data-interchange/project-elements-and-xml-structure>
- Docs source repo: <https://github.com/MicrosoftDocs/office-developer-msproject-xml-docs>

## Licensing

| Item | Licence | Redistributed here |
| --- | --- | --- |
| `mspdi_pj12.xsd` | Microsoft, all rights reserved. **No explicit redistribution grant** | **No** |
| `learn-docs/` (incl. its own `LICENSE`) | **CC-BY-4.0** | **No** — permitted with attribution, but excluded by the same rule |

Attribution, if you do use the Learn docs: "Microsoft Project XML Data Interchange
documentation" by Microsoft, licensed under CC-BY-4.0.

> **A `LICENSE` file anywhere in this folder tree belongs to `learn-docs/` and does NOT
> apply to `mspdi_pj12.xsd`.** That adjacency has misled readers before.
>
> The fetch step above places it at `learn-docs/LICENSE`, but copies made by hand often
> land next to the XSD instead — which is exactly the arrangement that misleads. Wherever
> it sits, it is the CC-BY-4.0 text for the Learn docs. **The XSD carries no such grant.**
