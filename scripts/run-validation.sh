#!/usr/bin/env bash
set -euo pipefail

npm run build
npm run typecheck
RUN_INTEGRATION=1 npm run test -- tests/ui-app.integration.test.ts tests/integration.test.ts tests/markdown.integration.test.ts
