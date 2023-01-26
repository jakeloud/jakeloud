#!/usr/bin/env bash
cat > /etc/nginx/conf.d/$domain <<-EOF
server { 
  listen 80;
  server_name $domain;

  location / {
    proxy_set_header   X-Forwarded-For \$remote_addr;
    proxy_set_header   Host \$host;
    proxy_pass         http://127.0.0.1:$port;
  }
}
EOF
certbot -n --agree-tos --email "$EMAIL" --nginx -d $domain
