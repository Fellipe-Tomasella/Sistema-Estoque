#!/bin/sh
# Aplica as migrations e sobe a API. Se a migration falhar, o container não sobe (docs/08 §3).
set -e
cd /app/apps/api
bun src/db/migrate.ts
exec bun src/index.ts
