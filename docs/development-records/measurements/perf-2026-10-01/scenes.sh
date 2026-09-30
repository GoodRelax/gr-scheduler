#!/usr/bin/env bash
cd "$(dirname "$0")"
OUT=scenes-$(date +%Y%m%d-%H%M%S); mkdir -p $OUT
one() { echo "$(date +%H:%M:%S) run $3 $2 $(node scenes.mjs $1 2>/dev/null | tail -1)" | tee -a $OUT/run-log.txt; }
one b-569135d7 569 1; one b-8e60e6c8 8e6 1; one ../.. head 1
one ../.. head 2; one b-569135d7 569 2; one b-8e60e6c8 8e6 2
one b-8e60e6c8 8e6 3; one ../.. head 3; one b-569135d7 569 3
echo DONE $OUT
