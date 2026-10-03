#!/usr/bin/env bash
# Machine load snapshot: total CPU % (5 samples, 2 s apart) and the six processes that consumed the
# most CPU seconds over the same 10 s window (OneDrive is always listed).
# Usage: load.sh <tag>
TAG="$1"
powershell.exe -NoProfile -Command '
$before = @{}; Get-Process | ForEach-Object { $before[$_.Id] = $_.CPU }
$s = (Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 2 -MaxSamples 5).CounterSamples | ForEach-Object { [math]::Round($_.CookedValue,1) }
$d = Get-Process | ForEach-Object { [pscustomobject]@{ N = $_.Name; D = [math]::Round(($_.CPU - $before[$_.Id]), 2) } }
$top = $d | Sort-Object D -Descending | Select-Object -First 6 | ForEach-Object { "{0} {1}s" -f $_.N, $_.D }
$od = ($d | Where-Object { $_.N -eq "OneDrive" } | Measure-Object D -Sum).Sum
"cpu% " + ($s -join " ") + " | OneDrive " + $od + "s | top cpu-seconds in 10s: " + ($top -join ", ")
' | sed "s/^/$(date +%H:%M:%S) $TAG /"
