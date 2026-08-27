#!/usr/bin/env bash
# Push FieldReport to https://github.com/CamDeans/FieldReport
# Run from your machine (requires GitHub auth — browser, SSH, or PAT).
set -euo pipefail

REMOTE="${REMOTE:-https://github.com/CamDeans/FieldReport.git}"
BRANCH="${BRANCH:-cursor/shipaton-revenuecat-cd5d}"

git remote get-url origin >/dev/null 2>&1 || git remote add origin "$REMOTE"
git remote set-url origin "$REMOTE"

echo "Pushing branch: $BRANCH"
git push -u origin "$BRANCH"

if [[ "${PUSH_MAIN:-0}" == "1" ]]; then
  echo "Also pushing as main (empty GitHub repo → default branch)"
  git push -u origin "$BRANCH:main"
fi

if [[ "${PUSH_ALL:-0}" == "1" ]]; then
  echo "Pushing all local branches"
  git push -u origin --all
fi

echo "Done. Open: https://github.com/CamDeans/FieldReport"
