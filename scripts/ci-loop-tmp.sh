#!/usr/bin/env bash
# Temporary: run `mise run ci` N times from a clean dist and count passes.
N="${1:-10}"; pass=0
for i in $(seq 1 "$N"); do
  git clean -qfdx packages/theme/dist packages/ui/dist >/dev/null 2>&1
  mise run ci >"/tmp/ci-$i.log" 2>&1; rc=$?
  echo "run $i: $rc"
  if [ "$rc" -eq 0 ]; then pass=$((pass+1)); else grep -m3 -iE "ENOTEMPTY|ENOENT|error" "/tmp/ci-$i.log"; fi
done
echo "passed $pass/$N"
