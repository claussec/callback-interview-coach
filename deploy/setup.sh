#!/usr/bin/env bash
# One-time setup on a fresh Ubuntu 24.04 server, run as root:
#   bash setup.sh callback.your-domain.de
set -euo pipefail
DOMAIN="${1:?Usage: bash setup.sh YOUR-DOMAIN}"
REPO="https://github.com/claussec/callback-interview-coach.git"

echo "== System updates, firewall, automatic security updates"
apt-get update && apt-get -y upgrade
apt-get install -y git caddy ufw unattended-upgrades ca-certificates curl gnupg
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

echo "== Node.js 22 LTS"
if ! node --version 2>/dev/null | grep -q '^v2[2-9]'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "== App user and code"
id callback >/dev/null 2>&1 || useradd --system --home /opt/callback --shell /usr/sbin/nologin callback
if [ ! -d /opt/callback/.git ]; then git clone "$REPO" /opt/callback; fi
mkdir -p /opt/callback/server/data
chown -R callback:callback /opt/callback
cd /opt/callback/server && sudo -u callback npm ci --omit=dev

echo "== Configuration"
if [ ! -f /etc/callback.env ]; then
  cp /opt/callback/server/.env.example /etc/callback.env
  sed -i "s/^ADMIN_TOKEN=.*/ADMIN_TOKEN=$(openssl rand -hex 16)/" /etc/callback.env
fi
chown root:callback /etc/callback.env && chmod 640 /etc/callback.env

echo "== Service and HTTPS"
cp /opt/callback/deploy/callback.service /etc/systemd/system/callback.service
sed "s/callback.example.com/$DOMAIN/" /opt/callback/deploy/Caddyfile > /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable callback caddy
systemctl restart caddy

cat <<MSG

Done. Two steps left:
  1. nano /etc/callback.env   → paste your ANTHROPIC_API_KEY (and set ACCESS_CODE for testers)
  2. systemctl restart callback && systemctl status callback

Then open https://$DOMAIN
Your admin link (keep it private): https://$DOMAIN/#admin=$(grep ^ADMIN_TOKEN= /etc/callback.env | cut -d= -f2)
MSG
