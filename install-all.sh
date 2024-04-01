#!/usr/bin/env bash

# Add Docker's official GPG key:
apt-get update
apt-get install ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update

apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin nodejs certbot python3-certbot-nginx git nginx -y

# clone repository and mount everything
git clone https://github.com/jakeloud/jakeloud.git /jakeloud

# this line allows to use install.sh as update script
rm -rf etc/jakeloud/jakeloud

mkdir -p /etc/jakeloud/jakeloud
touch /etc/jakeloud/conf.json
cp -r --remove-destination /jakeloud/jakeloud /etc/jakeloud
cp /jakeloud/jakeloud.service /etc/systemd/system/jakeloud.service

rm -rf /jakeloud

# for github VCS ssh pulling
ssh github.com

systemctl daemon-reload

systemctl enable jakeloud
systemctl start nginx
systemctl start jakeloud
# in case of update
systemctl restart jakeloud
