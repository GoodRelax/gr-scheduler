# Demo server API specification for GRS

English | [日本語](DEMO-SERVER-API-ja.md)

> ⚠️ This is not an API of GRS itself. It specifies the API that the server-sync demo page, `GRS-Demo.html`, needs from a server. The API of GRS itself is the [Agent API](https://github.com/GoodRelax/gr-scheduler/blob/main/docs/spec/_assets/tbl-agent-api-members.md).

Any language and any OS will do as long as the server meets this specification. `server/grs-demo-server.ps1` is a sample implementation.

## One server for the page and the API

Serve `GRS-Demo.html` (from the zip, unchanged) **from the same server** as the API. The page only talks to the server it came from: its Content-Security-Policy allows `connect-src 'self'` and nothing else. If you open the page from somewhere else and point it at your server, it will not connect, and CORS settings will not help.

Use HTTPS. Over plain HTTP, browsers switch off the PC file features GRS uses, except on `localhost`.

## API

| Purpose | API | Returns |
|---|---|---|
| Page | `GET /` | `GRS-Demo.html` as `text/html; charset=utf-8` |
| List | `GET /api/files` | `200`, a JSON array: `[{"name": "Plan.json", "size": 48211, "modified": "2026-10-18T13:05:00Z"}]` |
| Read | `GET /api/files/{name}` | `200` and the GRS JSON of that file. `404` if there is none (a new name in Save As is read this way) |
| Write | `PUT /api/files/{name}` | The body is the whole GRS JSON. Store it, replacing the old one, and return any `2xx` |

- `{name}` comes URL-encoded as UTF-8 (`encodeURIComponent`). It is one file name ending in `.json`, with no folders.
- On failure, return a non-`2xx` status with a short plain-text body. GRS shows its usual file-error notice and keeps the document as it is. Your text is for whoever reads the server log or the browser's network panel.

## Your data in and out

- **GET is where you convert.** Build GRS JSON from your system when the file is read. Its shape is the [GRS JSON schema](https://goodrelax.github.io/gr-scheduler/spec/_source/grs-document.schema.json).
- **PUT is where you write back.** Match tasks by `schedule.tasks[].uid` (the MSPDI UID). Keep fields you do not use as they came. GRS does not drop data it does not know.
- You can start with GET only. Refuse PUT with an error text, and add write-back later.

## Out of scope

- **Login**: the page and the API are one origin, so the browser sends your session cookie with every request. A login your site already has works as it is. The page cannot add its own headers, such as a bearer token.
- **Two people saving the same file**: the last PUT wins. A save carries no version number, so a check for stale saves would be your own addition.
- **Edit-by-edit sync**: that belongs to the Agent API, outside this specification.

## A prompt for your AI

```text
Write a server in <your language> that meets the API specification in the attached DEMO-SERVER-API.md.
GET /api/files/{name} builds GRS JSON (attached schema) from our API (attached).
PUT /api/files/{name} writes the tasks back by uid. Ask me about any field that does not map.
```
