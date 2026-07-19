# MSPDI (MS Project XML) reference — vendored copies

This folder holds **local, offline copies** of the official Microsoft Project
Data Interchange (MSPDI) specification, used while implementing the MSPDI
mapping defined in [`../../40-data-format.sdoc`](../../40-data-format.sdoc)
(section "2. MSPDI XML mapping", requirement `IO-L1-002`).

> **Only this `README.md` is committed.** The copied artifacts
> (`mspdi_pj12.xsd`, `learn-docs/`) are **git-ignored** on purpose — see
> [Licensing](#licensing) below. Re-fetch them locally with the commands in
> [How to re-fetch](#how-to-re-fetch).

## What belongs here

| Path | Source | Description |
| --- | --- | --- |
| `mspdi_pj12.xsd` | `https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd` | The MSPDI XML Schema (Project 2007; still the de-facto schema for later Project desktop versions). ~234 KB. Use for offline schema validation. |
| `learn-docs/project-xml-data-interchange/` | `https://github.com/MicrosoftDocs/office-developer-msproject-xml-docs` | Human-readable element reference (Microsoft Learn source Markdown). 378 pages. |
| `learn-docs/LICENSE` | same repo | CC-BY-4.0 license text (attribution). |
| `learn-docs/UPSTREAM-README.md` | same repo | The upstream repository README. |

## Official links (also cited in the spec)

- Schema (XSD): <https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd>
- Introduction: <https://learn.microsoft.com/en-us/office-project/xml-data-interchange/introduction-to-project-xml-data>
- Project elements / structure: <https://learn.microsoft.com/en-us/office-project/xml-data-interchange/project-elements-and-xml-structure>
- Docs source repo: <https://github.com/MicrosoftDocs/office-developer-msproject-xml-docs>

## Licensing

- **`mspdi_pj12.xsd`**: published by Microsoft on `schemas.microsoft.com`. The
  file header reserves Microsoft intellectual-property rights and does not grant
  an explicit redistribution license. It is therefore **not redistributed** in
  this repository (git-ignored) and is only fetched locally for development.
- **`learn-docs/`**: licensed **CC-BY-4.0** (see `learn-docs/LICENSE`).
  Redistribution with attribution would be permitted, but it is git-ignored here
  too to keep the repository lean and avoid vendoring third-party doc trees.

Attribution (for the Learn docs): "Microsoft Project XML Data Interchange
documentation" by Microsoft, licensed under CC-BY-4.0.

## How to re-fetch

Run from the repository root (requires `curl` and `git`):

```sh
VDIR="docs/spec/vendor/mspdi"
mkdir -p "$VDIR"

# 1) MSPDI XML schema
curl -fsSL "https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd" \
  -o "$VDIR/mspdi_pj12.xsd"

# 2) Learn documentation (element reference), shallow clone then copy
git clone --depth 1 \
  https://github.com/MicrosoftDocs/office-developer-msproject-xml-docs /tmp/msp-docs
mkdir -p "$VDIR/learn-docs"
cp -r /tmp/msp-docs/project-xml-data-interchange "$VDIR/learn-docs/"
cp /tmp/msp-docs/LICENSE   "$VDIR/learn-docs/LICENSE"
cp /tmp/msp-docs/README.md "$VDIR/learn-docs/UPSTREAM-README.md"
```
