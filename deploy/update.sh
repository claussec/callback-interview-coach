#!/usr/bin/env bash
# Pull the latest version from GitHub and restart. Run as root: bash /opt/callback/deploy/update.sh
set -euo pipefail
cd /opt/callback
sudo -u callback git pull --ff-only
cd server && sudo -u callback npm ci --omit=dev
cp /opt/callback/deploy/callback.service /etc/systemd/system/callback.service
systemctl daemon-reload && systemctl restart callback
systemctl --no-pager status callback | head -5
