#!/bin/bash
# GCE startup script — installs Docker Engine + the compose plugin on
# Debian/Ubuntu. Runs automatically on first boot when passed via
# --metadata-from-file startup-script=deploy/vm-startup.sh
set -e

apt-get update
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Let the default non-root user run docker without sudo
usermod -aG docker "$(logname 2>/dev/null || echo debian)" || true

systemctl enable docker
systemctl start docker
