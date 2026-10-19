# GoodRelax Scheduler (GRS)

English | [日本語](README-ja.md)

Single-HTML-file Gantt chart scheduler with plan vs. actual, delay diagnostics, MSPDI import/export, and an MCP server for AI agents. No install, no server.

## Try it now

- **Open it in your browser:** <https://goodrelax.github.io/gr-scheduler/>
- **Download it:** <https://goodrelax.github.io/gr-scheduler/download/>
  - `GRS.html` -- the whole app in one file. Save it anywhere and open it in your browser; it works offline.
  - `grs-relay.mcpb` -- GRS Relay, which lets an AI assistant work on the schedule you have open (see below).
  - `grs-server-sync-demo.zip` -- a demo that opens and saves schedules on a small HTTPS server on your PC (Windows).

## Status: alpha

- Version `20261019T022508Z`, tag `Alpha-20261019T022508Z` (2026-10-19).
- What this version holds, its known limits and how to install it: see [the release notes](docs/release-notes/Alpha-20261019T022508Z.md) and [GitHub Releases](https://github.com/GoodRelax/gr-scheduler/releases).
- The open items are listed in [the handoff](docs/development-records/handoff.md) and the [change requests](change-request/).
- During the alpha, the GRS JSON format can change from one version to the next, and a newer version may not open a file saved by an older one. Keep the `GRS.html` you used together with your files.

## Use with an AI (GRS Relay)

GRS Relay is an MCP server that links an AI app to the GRS page. It works with any AI app that supports MCP (the common way for AI apps to use outside tools). The AI can read the schedule you have open, change it, run the Delay Diagnostics and save files, while you watch every change on the screen. The schedule stays in your browser; GRS Relay keeps no copy.

- `grs-relay.mcpb` -- in an AI app that reads MCP bundles (.mcpb), install it by drag and drop.
- `grs-relay.mjs` -- in other MCP apps, register this file as an MCP server; it needs Node.js 18 or later.

The steps are on the [download page](https://goodrelax.github.io/gr-scheduler/download/).

## Files

- **GRS JSON** -- the native format. One file holds the whole schedule.
- **MSPDI** (Microsoft Project XML) -- import and export.
- **Single HTML** -- export the app and the schedule together as one HTML file. Whoever receives it opens the .html file in a browser and can view and edit the schedule at once, without getting GRS first.

## Docs

- About GRS: <https://goodrelax.github.io/gr-scheduler/about/>
- Specification: <https://goodrelax.github.io/gr-scheduler/spec-html/>

## Feedback

Please report problems and ideas in [GitHub Issues](https://github.com/GoodRelax/gr-scheduler/issues). See [CONTRIBUTING.md](CONTRIBUTING.md) for what to write. To report a vulnerability, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## For developers

```bash
npm ci
npm run build    # writes dist/index.html, the app in one file
npm test
```

The specification is the source of truth. Its manuscripts live in `docs/spec/_source`; `npm run gen` rebuilds the generated tables from them.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
