#!/usr/bin/env bash
# Temporary (removed again before merge): runs the server-backed suite N times
# (default 10) and prints each run's exit code and the tests that failed in it.
# Extra arguments go to Playwright; VOID_SERVER_APPS and VOID_CPU_THROTTLE pass
# through from the environment. The apps get their own ports, so the loop can
# run next to another checkout's suite.
#   bash scripts/server-loop.sh 10
#   VOID_CPU_THROTTLE=4 VOID_SERVER_APPS=phoenix,laravel bash scripts/server-loop.sh 5
set -u
n=${1:-10}
shift || true
failed=0
log=$(mktemp)
for i in $(seq 1 "$n"); do
  env VOID_TEST_PORT=5981 VOID_RAILS_PORT=5982 VOID_PHOENIX_PORT=5983 VOID_LARAVEL_PORT=5984 \
    mise run test:server -- --reporter=list "$@" >"$log" 2>&1
  rc=$?
  summary=$(sed 's/\x1b\[[0-9;]*m//g' "$log" | grep -E '^\s+[0-9]+ (passed|failed|flaky|skipped)' | tr -s ' ' | tr '\n' ',' | sed 's/,$//')
  echo "run $i: exit $rc ($summary)"
  sed 's/\x1b\[[0-9;]*m//g' "$log" | grep -E '^\s+✘' | sed 's/^ */  failed: /'
  [ "$rc" -ne 0 ] && failed=$((failed + 1))
done
rm -f "$log"
echo "runs with failures: $failed of $n"
[ "$failed" -eq 0 ]
