# GRS server-sync demo: a small HTTPS server for Windows PowerShell 5.1.
#
# It serves the demo page (GRS-Demo.html) and keeps GRS JSON files in one folder
# (schedule-data). Nothing to install and no administrator rights: the listener is a
# TcpListener on 127.0.0.1 wrapped in SslStream, and the certificate is a self-signed
# one made on first start in the current user's store (Cert:\CurrentUser\My).
#
# API (the page and this server are one origin, so the page's CSP connect-src 'self' holds):
#   GET  /                  the demo page
#   GET  /api/files         [{ name, size, modified }] of the *.json files in schedule-data
#   GET  /api/files/<name>  the bytes of one file (404 when absent)
#   PUT  /api/files/<name>  write the request body as that file (replaces it)
#
# Guards: 127.0.0.1 only; the Host header must name this server; a PUT must carry this
# server's Origin; a name is one file in schedule-data (no folders), ends in .json and
# holds no character Windows refuses; a body is at most MaxBodyBytes.
#
# This is a demo, not a product: no login, no locking (the last PUT wins).

[CmdletBinding()]
param(
  [int]$Port = 8443,
  [string]$DataDir = '',
  [string]$Page = '',
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($DataDir -eq '') { $DataDir = Join-Path (Split-Path -Parent $here) 'schedule-data' }
if ($Page -eq '') { $Page = Join-Path (Split-Path -Parent $here) 'GRS-Demo.html' }
$DataDir = [IO.Path]::GetFullPath($DataDir)
$Page = [IO.Path]::GetFullPath($Page)

$CertFriendlyName = 'GRS Demo Server (localhost)'
$MaxBodyBytes = 64MB

function Write-Log([string]$text) {
  [Console]::WriteLine(('{0}  {1}' -f (Get-Date).ToString('HH:mm:ss'), $text))
}

if (-not (Test-Path -LiteralPath $Page -PathType Leaf)) {
  Write-Log "The demo page is missing: $Page"
  Write-Log 'Build it first (npm run build:demo), or start the server from the unpacked zip.'
  exit 1
}
if (-not (Test-Path -LiteralPath $DataDir -PathType Container)) {
  New-Item -ItemType Directory -Path $DataDir | Out-Null
}

# ---- certificate: reuse ours while it is valid for at least a day more, else make one ----
$cert = Get-ChildItem -Path Cert:\CurrentUser\My |
  Where-Object { $_.FriendlyName -eq $CertFriendlyName -and $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date).AddDays(1) } |
  Sort-Object NotAfter -Descending |
  Select-Object -First 1
if ($null -eq $cert) {
  Write-Log 'Making a self-signed certificate for localhost (first start only)...'
  $cert = New-SelfSignedCertificate -DnsName 'localhost' -CertStoreLocation 'Cert:\CurrentUser\My' `
    -FriendlyName $CertFriendlyName -NotAfter (Get-Date).AddYears(2)
}

# ---- one connection, handled in its own runspace so a silent connection never blocks the rest ----
$handleConnection = {
  param($client, $cert, $config)

  function Write-Log([string]$text) {
    [Console]::WriteLine(('{0}  {1}' -f (Get-Date).ToString('HH:mm:ss'), $text))
  }

  function Send-Response($stream, [int]$status, [string]$reason, [string]$contentType, [byte[]]$body) {
    if ($null -eq $body) { $body = [byte[]]@() }
    $head = "HTTP/1.1 $status $reason`r`n" +
      "Content-Type: $contentType`r`n" +
      "Content-Length: $($body.Length)`r`n" +
      "Cache-Control: no-store`r`n" +
      "X-Content-Type-Options: nosniff`r`n" +
      "Connection: close`r`n`r`n"
    $headBytes = [Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($headBytes, 0, $headBytes.Length)
    if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
  }

  function Send-Text($stream, [int]$status, [string]$reason, [string]$text) {
    Send-Response $stream $status $reason 'text/plain; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes($text))
  }

  function Send-Json($stream, [string]$json) {
    Send-Response $stream 200 'OK' 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes($json))
  }

  # Reads exactly $count bytes, or returns $null when the connection ends first.
  function Read-Exactly($stream, [int]$count) {
    $buffer = New-Object byte[] $count
    $at = 0
    while ($at -lt $count) {
      $got = $stream.Read($buffer, $at, $count - $at)
      if ($got -le 0) { return $null }
      $at += $got
    }
    return ,$buffer
  }

  # Reads the request line and headers (up to the blank line), one byte at a time so the body stays unread.
  function Read-Head($stream) {
    $bytes = New-Object System.Collections.Generic.List[byte]
    $one = New-Object byte[] 1
    while ($true) {
      $got = $stream.Read($one, 0, 1)
      if ($got -le 0) { return $null }
      $bytes.Add($one[0])
      $n = $bytes.Count
      if ($n -ge 4 -and $bytes[$n - 4] -eq 13 -and $bytes[$n - 3] -eq 10 -and $bytes[$n - 2] -eq 13 -and $bytes[$n - 1] -eq 10) {
        return [Text.Encoding]::ASCII.GetString($bytes.ToArray())
      }
      if ($n -gt 65536) { return $null }
    }
  }

  # One file directly in the data folder, or $null. Windows naming rules (JDG-2595): Japanese is fine.
  function Resolve-DataFile([string]$encodedName) {
    try { $name = [Uri]::UnescapeDataString($encodedName) } catch { return $null }
    if ($name.Length -lt 6 -or $name.Length -gt 200) { return $null }
    if (-not $name.ToLowerInvariant().EndsWith('.json')) { return $null }
    if ($name.StartsWith('.') -or $name.StartsWith(' ') -or $name.EndsWith(' ')) { return $null }
    foreach ($ch in $name.ToCharArray()) {
      if ([int]$ch -lt 32 -or '\/:*?"<>|'.IndexOf($ch) -ge 0) { return $null }
    }
    $stem = $name.Substring(0, $name.Length - 5).TrimEnd(' ', '.')
    if ($stem -eq '' -or $stem -match '^(?i)(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\..*)?$') { return $null }
    $full = [IO.Path]::GetFullPath([IO.Path]::Combine($config.DataDir, $name))
    if ([IO.Path]::GetDirectoryName($full) -ne $config.DataDir) { return $null }
    return @{ Name = $name; Path = $full }
  }

  function Get-FileListJson {
    $items = @(Get-ChildItem -LiteralPath $config.DataDir -File -Filter '*.json' |
      Where-Object { $_.Extension -eq '.json' } |
      Sort-Object Name |
      ForEach-Object {
        [pscustomobject]@{
          name = $_.Name
          size = $_.Length
          modified = $_.LastWriteTimeUtc.ToString('yyyy-MM-ddTHH:mm:ssZ')
        }
      })
    if ($items.Count -eq 0) { return '[]' }
    return (ConvertTo-Json -InputObject $items -Compress)
  }

  $stream = $null
  try {
    $client.ReceiveTimeout = 15000
    $client.SendTimeout = 15000
    $stream = New-Object System.Net.Security.SslStream($client.GetStream(), $false)
    $stream.AuthenticateAsServer($cert, $false, [Security.Authentication.SslProtocols]::Tls12, $false)

    $head = Read-Head $stream
    if ($null -eq $head) { return }
    $lines = $head -split "`r`n"
    $requestLine = $lines[0] -split ' '
    if ($requestLine.Count -lt 3) { Send-Text $stream 400 'Bad Request' 'bad request line'; return }
    $method = $requestLine[0]
    $target = $requestLine[1]
    $headers = @{}
    foreach ($line in $lines[1..($lines.Count - 1)]) {
      $colon = $line.IndexOf(':')
      if ($colon -gt 0) { $headers[$line.Substring(0, $colon).Trim().ToLowerInvariant()] = $line.Substring($colon + 1).Trim() }
    }

    # Same guard as the relay (JDG-1013): only a page that asked for this server by name gets an answer.
    $hostHeader = [string]$headers['host']
    if ($config.AllowedHosts -notcontains $hostHeader.ToLowerInvariant()) {
      Write-Log "refused: Host '$hostHeader'"
      Send-Text $stream 421 'Misdirected Request' 'unknown host'
      return
    }
    $path = ($target -split '\?')[0]
    Write-Log "$method $([Uri]::UnescapeDataString($path))"

    if ($method -eq 'GET' -and ($path -eq '/' -or $path -eq '/index.html' -or $path -eq '/GRS-Demo.html')) {
      Send-Response $stream 200 'OK' 'text/html; charset=utf-8' ([IO.File]::ReadAllBytes($config.Page))
      return
    }
    if ($method -eq 'GET' -and $path -eq '/favicon.ico') { Send-Response $stream 204 'No Content' 'text/plain' $null; return }

    if ($method -eq 'GET' -and $path -eq '/api/files') { Send-Json $stream (Get-FileListJson); return }

    if ($path.StartsWith('/api/files/')) {
      $file = Resolve-DataFile $path.Substring('/api/files/'.Length)
      if ($null -eq $file) { Send-Text $stream 400 'Bad Request' 'This name cannot be used on the server.'; return }

      if ($method -eq 'GET') {
        if (-not (Test-Path -LiteralPath $file.Path -PathType Leaf)) { Send-Text $stream 404 'Not Found' 'no such file'; return }
        Send-Response $stream 200 'OK' 'application/json; charset=utf-8' ([IO.File]::ReadAllBytes($file.Path))
        return
      }

      if ($method -eq 'PUT') {
        $origin = [string]$headers['origin']
        if ($config.AllowedOrigins -notcontains $origin.ToLowerInvariant()) {
          Write-Log "refused: Origin '$origin'"
          Send-Text $stream 403 'Forbidden' 'unknown origin'
          return
        }
        $length = 0L
        if (-not [long]::TryParse([string]$headers['content-length'], [ref]$length) -or $length -lt 0) {
          Send-Text $stream 411 'Length Required' 'Content-Length is required'
          return
        }
        if ($length -gt $config.MaxBodyBytes) { Send-Text $stream 413 'Payload Too Large' 'The file is too large for the server.'; return }
        $body = [byte[]]@()
        if ($length -gt 0) { $body = Read-Exactly $stream ([int]$length) }
        if ($null -eq $body) { return }
        # Written beside the target first, then moved over it, so a broken write never leaves half a file.
        $temporary = $file.Path + '.part'
        [IO.File]::WriteAllBytes($temporary, $body)
        if (Test-Path -LiteralPath $file.Path) { [IO.File]::Replace($temporary, $file.Path, [NullString]::Value) }
        else { [IO.File]::Move($temporary, $file.Path) }
        Write-Log "  wrote $($file.Name) ($length bytes)"
        Send-Json $stream '{"ok":true}'
        return
      }
      Send-Text $stream 405 'Method Not Allowed' 'GET or PUT'
      return
    }

    Send-Text $stream 404 'Not Found' 'not found'
  } catch {
    $why = $_.Exception.Message
    if ($why -notmatch 'timed out|forcibly closed|0 bytes|Authentication failed|aborted') { Write-Log "error: $why" }
    try { if ($null -ne $stream) { Send-Text $stream 500 'Internal Server Error' 'server error' } } catch { }
  } finally {
    if ($null -ne $stream) { $stream.Dispose() }
    $client.Close()
  }
}

$config = @{
  DataDir = $DataDir
  Page = $Page
  MaxBodyBytes = $MaxBodyBytes
  AllowedHosts = @("localhost:$Port", "127.0.0.1:$Port")
  AllowedOrigins = @("https://localhost:$Port", "https://127.0.0.1:$Port")
}

$listener = New-Object System.Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
} catch {
  Write-Log "Port $Port is in use. Close the other server, or start this one with -Port <another number>."
  exit 1
}

$pool = [runspacefactory]::CreateRunspacePool(1, 8)
$pool.Open()
$running = New-Object System.Collections.Generic.List[object]
$address = "https://localhost:$Port/"

Write-Log "GRS demo server: $address"
Write-Log "Files: $DataDir"
Write-Log 'Close this window (or press Ctrl+C) to stop the server.'
if (-not $NoBrowser) { Start-Process $address }

try {
  while ($true) {
    if ($listener.Pending()) {
      $client = $listener.AcceptTcpClient()
      $worker = [powershell]::Create()
      $worker.RunspacePool = $pool
      [void]$worker.AddScript($handleConnection).AddArgument($client).AddArgument($cert).AddArgument($config)
      $running.Add(@{ Worker = $worker; Handle = $worker.BeginInvoke() })
    } else {
      Start-Sleep -Milliseconds 20
    }
    for ($i = $running.Count - 1; $i -ge 0; $i--) {
      if ($running[$i].Handle.IsCompleted) {
        try { [void]$running[$i].Worker.EndInvoke($running[$i].Handle) } catch { Write-Log "error: $($_.Exception.Message)" }
        $running[$i].Worker.Dispose()
        $running.RemoveAt($i)
      }
    }
  }
} finally {
  $listener.Stop()
  $pool.Close()
}
