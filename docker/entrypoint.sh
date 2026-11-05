#!/bin/sh
# Aplica as migrations e sobe a API. Se a migration falhar, o container não sobe (docs/08 §3).
# Começa como root só para acertar o dono da pasta das fotos (volume criado pelo Docker vem como root) e
# depois roda tudo como o usuário bun.
set -e
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${MEDIA_DIR:-/app/media}"
  chown -R bun:bun "${MEDIA_DIR:-/app/media}"
  exec setpriv --reuid=bun --regid=bun --init-groups "$0" "$@"
fi
cd /app/apps/api
bun src/db/migrate.ts
exec bun src/index.ts
