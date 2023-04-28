# Jakeloud

## Setup process
1. run this in terminal.
```
ssh <login>@<ip>
sudo sh -c "$(curl --silent -fsSL https://raw.githubusercontent.com/notTGY/jakeloud/main/install.sh)"
```
2. Go to server ip in browser. Enter domain for jakeloud dashboard (ex. `jakeloud.example.com`) and root user email. At this point server is setuping ssl cert and becomes unresponsive, so wait ~5min.
3. Go to your domain. Register root user with the same email.

## Adding new user
1. Go to your domain and login into root user.
2. Tick "Allow Registration" checkbox under jakeloud settings.
3. Register new user.
4. Untick "Allow Registration" checkbox under jakeloud settings.
## Goals
1. Jakeloud is intended for customisation and intense
extensibility. So I would like it to be as small as
possible. I'd go for 1000 lines of code limit.
2. Secure, robust system that can handle reboots and
partial reloads.
3. Low footprint and maximum possible performance
without sacrificing previous two points.

## Notes
1. Jakeloud wouldn't scan nginx configs as there may
be some other apps and services running on the server.
It will only remove configs you implicitly ask him to
remove (when deleting an app). So it may be a good
idea to review your `/etc/nginx/conf.d` folder to
clean up configs in case system failure to remove one.
The same applies to docker images, docker containers,
cloned git repositories (you can find those in
`/etc/jakeloud/`).
Frequency of such errors depends on how often you
restart/update jakeloud just after performing an
operation.
