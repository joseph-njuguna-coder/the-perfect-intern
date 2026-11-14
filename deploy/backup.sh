#!/usr/bin/env bash
# Nightly backup of the database and uploaded files, with simple rotation.
# Install:  sudo install -m 750 deploy/backup.sh /usr/local/bin/perfect-intern-backup
# Cron:     15 2 * * *  perfectintern  /usr/local/bin/perfect-intern-backup >> /var/log/perfect-intern-backup.log 2>&1
set -euo pipefail
umask 077

set -a; . /etc/perfect-intern.env; set +a
BACKUP_DIR="${BACKUP_DIR:-/var/backups/perfect-intern}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%F-%H%M)"
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/monthly"

pg_dump --format=custom --no-owner "$DATABASE_URL" > "$BACKUP_DIR/daily/db-$STAMP.dump"
tar -czf "$BACKUP_DIR/daily/uploads-$STAMP.tar.gz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"

# Keep the first backup of each month for a year.
if [ "$(date +%d)" = "01" ]; then
  cp "$BACKUP_DIR/daily/db-$STAMP.dump" "$BACKUP_DIR/daily/uploads-$STAMP.tar.gz" "$BACKUP_DIR/monthly/"
fi
find "$BACKUP_DIR/daily" -type f -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR/monthly" -type f -mtime +365 -delete

# Off-site copy (REQUIRED for real protection). Example with rclone to S3-compatible storage:
#   rclone copy "$BACKUP_DIR" remote:perfect-intern-backups --max-age 2d
echo "$(date -Is) backup ok: $STAMP"
