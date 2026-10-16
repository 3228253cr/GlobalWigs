#!/bin/bash
# SessionStart hook for Claude Code cloud sessions.
# The site is plain HTML/CSS/JS with no package manifest, so the only setup
# needed is the HTML linter used to check pages before pushing.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

HTMLHINT_VERSION="1.9.2"

if ! command -v htmlhint >/dev/null 2>&1 || [ "$(htmlhint --version 2>/dev/null)" != "$HTMLHINT_VERSION" ]; then
  npm install -g --no-audit --no-fund "htmlhint@${HTMLHINT_VERSION}"
fi
