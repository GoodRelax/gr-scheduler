@echo off
REM Thin shim: after editing docs/spec/_source.
REM ROLE. This file holds NO procedure. What the bundle runs lives in
REM package.json, and what it can and cannot see lives in
REM docs/development-rules/09-tools.md. This exists only so the bundle
REM can be started from Explorer.
REM LINE ENDINGS. Stored with LF, which .gitattributes enforces for
REM everything here. Measured 2026-09-12: cmd.exe runs this from
REM Explorer with LF endings, pause included. Do not convert it.
cd /d "%~dp0..\.."
call npm run guard:gen
pause
