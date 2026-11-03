#!/usr/bin/env bash
# Git pre-push hook: run the unit tests and the offline promptfoo suites
# before anything leaves the machine. Install with:
#   ln -s ../../scripts/pre-push.sh .git/hooks/pre-push
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "pre-push: unit tests"
npm test --silent

for suite in eval eval:regressions eval:dataset eval:agent; do
  echo "pre-push: npm run ${suite}"
  status=0
  npm run --silent "${suite}" -- --no-write > /dev/null || status=$?
  if [ "${status}" -eq 100 ]; then
    echo "pre-push: ${suite} has failing tests. Re-run 'npm run ${suite}' to see them."
    exit 1
  elif [ "${status}" -ne 0 ]; then
    echo "pre-push: ${suite} could not run (exit ${status})."
    exit 1
  fi
done
echo "pre-push: all suites green"
