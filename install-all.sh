#!/usr/bin/env bash

# deps (most useless ---> essential)
apt update && apt install nodejs certbot python3-certbot-nginx curl git nginx -y
if command -v docker; then
  echo "reusing docker"
else
  curl --silent -fsSL https://get.docker.com | sh
fi

# clone repository and mount everything
git clone https://github.com/jakeloud/jakeloud.git /jakeloud

# this line allows to use install.sh as update script
rm -rf etc/jakeloud/jakeloud

mkdir -p /etc/jakeloud/jakeloud
cp -r --remove-destination /jakeloud/jakeloud /etc/jakeloud
cp /jakeloud/jakeloud.service /etc/systemd/system/jakeloud.service

rm -rf /jakeloud

sudo systemctl daemon-reload

systemctl enable jakeloud
systemctl start nginx
systemctl start jakeloud
# in case of update
systemctl restart jakeloud
