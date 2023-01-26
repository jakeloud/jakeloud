#!/usr/bin/env bash

# deps
apt update && apt install nodejs certbot python3-certbot-nginx curl git nginx -y
sudo sh -c "$(curl --silent -fsSL https://get.docker.com)"

# clone repo and mount everything
git clone https://github.com/nottgy/jakeloud.git /jakeloud

# this line allows to use install.sh as update script
rm -r etc/jakeloud/jakeloud

cp -r /jakeloud/app /etc/jakeloud/jakeloud
cp /jakeloud/jakeloud.service /etc/systemd/system/jakeloud.service

rm -r /jakeloud

sudo systemctl daemon-reload

systemctl enable jakeloud
systemctl start nginx
systemctl start jakeloud
