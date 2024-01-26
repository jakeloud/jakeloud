#!/usr/bin/env bash

# deps (most useless ---> essential)
apt update && apt install jq nodejs certbot python3-certbot-nginx curl git nginx -y
if command -v docker; then
  echo "reusing docker"
else
  sudo sh -c "$(curl --silent -fsSL https://get.docker.com)"
fi


# clone repository and mount everything
git clone https://github.com/jakeloud/jakeloud.git /jakeloud

# this line allows to use install.sh as update script
rm -rf etc/jakeloud/jakeloud

mkdir -p /etc/jakeloud/jakeloud
cp -r --remove-destination /jakeloud/jakeloud /etc/jakeloud
cp /jakeloud/jakeloud.service /etc/systemd/system/jakeloud.service
if [ ! -f /etc/jakeloud/conf.json ]; then
  cp /jakeloud/conf.json /etc/jakeloud/conf.json
  ip -j route get 1 | jq -r '.[0].prefsrc' | xargs -I {} sed -i "s/%serverip%/{}/g" /etc/jakeloud/conf.json
fi

# generate ssh key
if [ ! -f /etc/jakeloud/id_rsa ]; then
  ssh-keygen -q -t ed25519 -N '' -f /etc/jakeloud/id_rsa
  # FIXME wrong sed command for rsa key
  cat /etc/jakeloud/id_rsa.pub | xargs -I {} sed -i "s/%ssh-key%/{}/g" /etc/jakeloud/conf.json
fi

rm -rf /jakeloud

sudo systemctl daemon-reload

systemctl enable jakeloud
systemctl start nginx
systemctl start jakeloud
# in case of update
systemctl restart jakeloud
