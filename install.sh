#!/usr/bin/env bash

# clone repository and mount everything
git clone https://github.com/jakeloud/jakeloud.git /jakeloud

# this line allows to use install.sh as update script
rm -rf etc/jakeloud/jakeloud

mkdir -p /etc/jakeloud/jakeloud
touch /etc/jakeloud/conf.json
cp -r --remove-destination /jakeloud/jakeloud /etc/jakeloud
cp /jakeloud/jakeloud.service /etc/systemd/system/jakeloud.service

rm -rf /jakeloud

sudo systemctl daemon-reload

systemctl enable jakeloud
systemctl start jakeloud
# in case of update
systemctl restart jakeloud

