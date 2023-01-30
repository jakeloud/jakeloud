#!/usr/bin/env bash

# deps
apt update && apt install nodejs certbot python3-certbot-nginx curl git nginx -y
if command -v docker; then
  echo "reusing docker"
else
  sudo sh -c "$(curl --silent -fsSL https://get.docker.com)"
fi


# clone repository and mount everything
git clone https://github.com/nottgy/jakeloud.git /jakeloud

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
# in case we updated jakeloud
systemctl restart jakeloud
