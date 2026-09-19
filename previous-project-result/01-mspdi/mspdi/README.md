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

There are two schema versions. Each has its own folder, and the file name carries the
version, so a citation such as `mspdi_pj15.xsd:2518` names its version by itself.

```
pj12 (Project 2007)
  Authoritative    https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd
  Local copy       docs/reference/mspdi/pj12/mspdi_pj12.xsd   (fetch it yourself; git-ignored)

pj15 (Project 2013)
  Authoritative    NO official URL -- .../project/2007/mspdi_pj15.xsd answers HTTP 404
                   (measured 2026-09-19). The authority is the Project 2013 SDK download,
                   identified by the SHA-256 values below.
  Local copy       docs/reference/mspdi/pj15/mspdi_pj15.xsd   (extract it yourself; git-ignored)

Neither version
  docs/reference/mspdi/learn-docs/   Microsoft Learn element reference. It documents 47
                   elements that neither XSD declares and none of the 17 that pj15 added,
                   so it cannot settle a pj12-versus-pj15 question.
```

⚠️ **A file never says "15".** Both versions share the namespace
`http://schemas.microsoft.com/project/2007`, and pj15's own description of `SaveVersion`
says Project 2013 writes 14 (the Project 2010 value). Call a schema pj12 / pj15; call a file
by its `SaveVersion` (12 / 14).

The comparison of the two, with the measurements, is
`docs/review/mspdi-pj12-vs-pj15-2026-09-19.md`.

**The copy lives outside this folder.** `previous-project-result/` is the frozen result of
the first project, while the schema is an external source the current project keeps
consulting, so the copies sit on the project's own reference shelf at `docs/reference/`.
This file stays here because every document in `previous-project-result/` points at it.

**Rule, one sentence: check MSPDI facts against the local copy, but cite the official URL.**
The local copy is a byte-identical replica, so looking at it and quoting the URL are the
same claim. Do not call the local file "the authority" — it is a cache.
pj15 has no URL to cite: cite `mspdi_pj15.xsd:NNN` and the Project 2013 SDK, and let the
SHA-256 below say which copy you mean.

## If you cannot reach the web

The Japanese summaries in `../mspdi-*.md` are **secondary sources and can be wrong**
(several were, and were corrected against the XSD). Without the XSD you cannot verify them.

**Then say so.** Write "unverified — the XSD was not available" rather than asserting a
fact you could not check. Guessing and stating it as fact is the failure this whole
reference set exists to prevent.

Ask whoever set up the environment to place `mspdi_pj12.xsd` in `docs/reference/mspdi/pj12/`
and `mspdi_pj15.xsd` in `docs/reference/mspdi/pj15/`. Each is one file and needs no build step.

## How to fetch

Run from the repository root. Requires `curl`; `7z` (7-Zip) for pj15; `git` only for the
Learn docs.

```sh
VDIR="docs/reference/mspdi"

# 1) pj12 -- the MSPDI XML schema for Project 2007
mkdir -p "$VDIR/pj12"
curl -fsSL "https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd" \
  -o "$VDIR/pj12/mspdi_pj12.xsd"

# 2) pj15 -- the schema for Project 2013. It is published only inside the Project 2013
#    SDK installer. Download page: https://www.microsoft.com/en-us/download/details.aspx?id=30435
#    Nothing is installed: 7-Zip reads the schema out of the .msi as it stands.
curl -fsSL -o /tmp/Project2013SDK.msi \
  "https://download.microsoft.com/download/2/1/2/2125FE61-0E1E-49F4-ADC1-CCE92FF613DB/Project2013SDK.msi"
mkdir -p "$VDIR/pj15"
7z e /tmp/Project2013SDK.msi -o"$VDIR/pj15" -y \
  Projec_1_File_xsd_mspdi_pj15 Schemas_File_mht__ReadMe___Schemas_ File_SoftwareLicenseTerms
mv "$VDIR/pj15/Projec_1_File_xsd_mspdi_pj15"        "$VDIR/pj15/mspdi_pj15.xsd"
mv "$VDIR/pj15/Schemas_File_mht__ReadMe___Schemas_" "$VDIR/pj15/ReadMe_Schemas.mht"
mv "$VDIR/pj15/File_SoftwareLicenseTerms"           "$VDIR/pj15/SoftwareLicenseTerms.rtf"

# 3) Optional: Microsoft Learn element reference (human-readable prose)
git clone --depth 1 \
  https://github.com/MicrosoftDocs/office-developer-msproject-xml-docs /tmp/msp-docs
mkdir -p "$VDIR/learn-docs"
cp -r /tmp/msp-docs/project-xml-data-interchange "$VDIR/learn-docs/"
cp /tmp/msp-docs/LICENSE   "$VDIR/learn-docs/LICENSE"
cp /tmp/msp-docs/README.md "$VDIR/learn-docs/UPSTREAM-README.md"
```

## How to verify what you fetched

The copies this reference set was written against:

| | pj12 | pj15 |
| --- | --- | --- |
| Size | **239,895 bytes** | **243,710 bytes** |
| Lines | **3,906** | **3,974** (counted with `grep -c ""`; the same count gives 3,907 for pj12) |
| SHA-256 | **`a3e9138f0f02df06d7b1254be6190c2dd48fdcf6a2445ab79a6abab765a8c7b4`** | **`1c208a9732d6ba16f677a9f2fb9d5a629f0c200346b1851998a44765c502eb85`** |
| Schema version | Microsoft Office Project **2007** (`pj12` = Project 12). Header revision date `2007-11-28` | Microsoft Project **2013** (`pj15` = Project 15). Header revision date `2012-07-18` |
| Came from | the official URL | `Project2013SDK.msi`: 64,038,400 bytes, SHA-256 `75891caee6e10b87ab2281d33cdb9c19d16e70b48cc1cf7d7433c583564988b1`, Authenticode signature by Microsoft Corporation valid (2026-09-19) |

```sh
sha256sum docs/reference/mspdi/pj12/mspdi_pj12.xsd docs/reference/mspdi/pj15/mspdi_pj15.xsd      # Linux
shasum -a 256 docs/reference/mspdi/pj12/mspdi_pj12.xsd docs/reference/mspdi/pj15/mspdi_pj15.xsd  # macOS
certutil -hashfile docs\reference\mspdi\pj12\mspdi_pj12.xsd SHA256   # Windows, once per file
```

**A different hash is not automatically a problem** — Microsoft may have republished the
file. It does mean the line numbers quoted throughout `previous-project-result/` may no longer line up,
so locate elements by name rather than by line.

## Official links

- Schema (XSD), pj12: <https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd>
- Project 2013 SDK (holds the pj15 schema): <https://www.microsoft.com/en-us/download/details.aspx?id=30435>
- Introduction: <https://learn.microsoft.com/en-us/office-project/xml-data-interchange/introduction-to-project-xml-data>
- Project elements / structure: <https://learn.microsoft.com/en-us/office-project/xml-data-interchange/project-elements-and-xml-structure>
- Docs source repo: <https://github.com/MicrosoftDocs/office-developer-msproject-xml-docs>

## Licensing

| Item | Licence | Redistributed here |
| --- | --- | --- |
| `mspdi_pj12.xsd` | Microsoft, all rights reserved. **No explicit redistribution grant** | **No** |
| `mspdi_pj15.xsd` and the other files taken from the SDK | Microsoft; the SDK's own licence terms (`pj15/SoftwareLicenseTerms.rtf`) | **No** |
| `learn-docs/` (incl. its own `LICENSE`) | **CC-BY-4.0** | **No** — permitted with attribution, but excluded by the same rule |

Attribution, if you do use the Learn docs: "Microsoft Project XML Data Interchange
documentation" by Microsoft, licensed under CC-BY-4.0.

> **A `LICENSE` file anywhere in this folder tree belongs to `learn-docs/` and does NOT
> apply to either XSD.** That adjacency has misled readers before.
>
> The fetch step above places it at `learn-docs/LICENSE`, but copies made by hand often
> land next to the XSD instead — which is exactly the arrangement that misleads. Wherever
> it sits, it is the CC-BY-4.0 text for the Learn docs. **The XSD carries no such grant.**
