# GRS demo server contract (file level)

English | [日本語](SERVER-API-ja.md)

What your server must do so that `GRS-Demo.html` can open and save files on it. Any language and any OS will do. `server/grs-demo-server.ps1` is a sample that keeps this contract.

## One server for the page and the files

Serve `GRS-Demo.html` (from the zip, unchanged) **from the same server** as the files. GRS only talks to the server it came from: its Content-Security-Policy allows `connect-src 'self'` and nothing else. If you open the page from somewhere else and point it at your server, it will not connect, and CORS settings will not help.

Use HTTPS. Over plain HTTP, browsers switch off the PC file features GRS uses, except on `localhost`.

## Four requests

| Request | Your server returns |
|---|---|
| `GET /` | `GRS-Demo.html` as `text/html; charset=utf-8` |
| `GET /api/files` | `200`, a JSON array: `[{"name": "Plan.json", "size": 48211, "modified": "2026-10-18T13:05:00Z"}]` |
| `GET /api/files/{name}` | `200` and the GRS JSON of that file. `404` if there is none (a new name in Save As is read this way) |
| `PUT /api/files/{name}` | The body is the whole GRS JSON. Store it, replacing the old one, and return any `2xx` |

- `{name}` comes URL-encoded as UTF-8 (`encodeURIComponent`). It is one file name ending in `.json`, with no folders.
- On failure, return a non-`2xx` status with a short plain-text body. GRS shows its usual file-error notice and keeps the document as it is. Your text is for whoever reads the server log or the browser's network panel.

## Your data in and out

- **GET is where you convert.** Build GRS JSON from your system when the file is read. Its shape is the [GRS JSON schema](https://goodrelax.github.io/gr-scheduler/spec/_source/grs-document.schema.json).
- **PUT is where you write back.** Match tasks by `schedule.tasks[].uid` (the MSPDI UID). Keep fields you do not use as they came. GRS does not drop data it does not know.
- You can start with GET only. Refuse PUT with an error text, and add write-back later.

## Not in the contract

- **Login**: the page and the API are one origin, so the browser sends your session cookie with every request. A login your site already has works as it is. The page cannot add its own headers, such as a bearer token.
- **Two people saving the same file**: the last PUT wins. A save carries no version number, so a check for stale saves would be your own addition.
- **Edit-by-edit sync**: that is the Agent API, not this contract.

## A prompt for your AI

```text
Write a server in <your language> that keeps the attached SERVER-API.md.
GET /api/files/{name} builds GRS JSON (attached schema) from our API (attached).
PUT /api/files/{name} writes the tasks back by uid. Ask me about any field that does not map.
```
