# 70 -- Alpha hands-on findings (2026-10-18)

The user tries the GRS alpha by hand before the Monday 2026-10-19 showing. This page keeps one row per finding.

- Build under test: Pages `0829239a` (same app as the root `dist/index.html` and the integration tip `52eb7112`).
- Bands: `DFC-3250`..`3279`, `JDG-2760`..`2779`, `PND-950`..`954`.
- Fixes are NOT made here. The coordinator schedules them after the user finishes (GT-2 is held until then).

| # | Screen (ja / en) | What the user saw | Severity | DFC | Proposed fix (size, owning seat) |
|---|---|---|---|---|---|
| 1 | GRS Relay (AI) | `undoEdit` / `redoEdit` always refuse `notAvailable` -- not built since 7c3b68e4 | Medium | DFC-3250 | Add the T-230 rows and route through the screen's undo history (M, AI relay seat) |
| 2 | GRS Relay (AI) / 検索 Search | `showOnlyTasks(null)` from Claude is refused `malformedRequest`; the schedule filter stays on | Medium | DFC-3251 | Print `anyOf` instead of a type list in the tool schema; name a missing key (S, AI relay seat) |
| 3 | GRS Relay (AI) / ファイルを開く Open File | `importDocument` waits on the 3-choice dialog past the MCP timeout; the relay restarts on a new port and the page silently disconnects | High | DFC-3252 | Return at once after the dialog, deliver the result by `watchChanges`; page shows a disconnect band (M, AI relay seat) |
| 4 | GRS Relay (AI) | `readDocument` and a `staleStamp` refusal are ~1.38 M chars on the template; over the AI client's limit | Medium | DFC-3253 | `staleStamp` returns the stamp only; or a read without MSPDI carry (M, AI relay seat, spec AV-3/AG-2) |
| 5 | GRS Relay (AI) | Request: open/save files through the relay (human picks files to read; AI saves 5 formats by a named file/folder) | New feature | JDG-2760 | New CR after the alpha unless the user says otherwise; folder rule asked (A/B/C) |
