#!/bin/sh
# Backup do banco (docs/08 §8): pg_dump -Fc diário e limpeza dos mais antigos que KEEP_DAYS.
# Uso no container `backup` (imagem postgres): `sh /backup.sh` fica em loop; `sh /backup.sh once` faz um agora.
# Variáveis: PGHOST, PGUSER, PGPASSWORD, PGDATABASE (padrão do libpq), KEEP_DAYS (14), BACKUP_HOUR (3), TZ.
# MEDIA_DIR (opcional): pasta das fotos, copiada para $BACKUP_DIR/media (só as novas; nomes únicos que não mudam).
set -eu

BACKUP_DIR=${BACKUP_DIR:-/backups}
KEEP_DAYS=${KEEP_DAYS:-14}
BACKUP_HOUR=${BACKUP_HOUR:-3}

run_backup() {
  file="$BACKUP_DIR/${PGDATABASE}-$(date +%Y-%m-%d_%H%M).dump"
  pg_dump -Fc -f "$file.tmp" && mv "$file.tmp" "$file"
  echo "$(date '+%F %T') backup ok: $file"
  find "$BACKUP_DIR" -name "${PGDATABASE}-*.dump" -mtime +"$KEEP_DAYS" -delete
  if [ -n "${MEDIA_DIR:-}" ] && [ -d "$MEDIA_DIR" ]; then
    mkdir -p "$BACKUP_DIR/media"
    for m in "$MEDIA_DIR"/*.webp; do
      [ -e "$m" ] && [ ! -e "$BACKUP_DIR/media/${m##*/}" ] && cp "$m" "$BACKUP_DIR/media/"
    done
    echo "$(date '+%F %T') fotos ok"
  fi
}

mkdir -p "$BACKUP_DIR"
until pg_isready -q; do sleep 2; done

if [ "${1:-}" = "once" ]; then
  run_backup
  exit 0
fi

last_day=""
while true; do
  today=$(date +%F)
  if [ "$(date +%H)" -ge "$BACKUP_HOUR" ] && [ "$today" != "$last_day" ]; then
    run_backup || echo "$(date '+%F %T') backup FALHOU" >&2
    last_day=$today
  fi
  sleep 600
done
