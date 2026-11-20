# Temporary HTTPS placeholder

On the designated Azure VM, place compose.yaml and Caddyfile in /opt/archive-placeholder. Check DNS, the VM's inbound web rules and availability of TCP 80 and 443 before startup. The owner must approve each Azure or host firewall change in advance.

Caddy reads /etc/archive-placeholder/auth, a root-owned mode 0600 file in a mode 0700 directory. It contains one Basic Auth username and bcrypt hash on one line. Generate the hash using the pinned image's interactive `caddy hash-password` command. Keep the actual password in the owner's password manager. The initial username is `preview`. The owner can retrieve the initial password on a private VM terminal with `sudo systemd-creds decrypt --name=placeholder /etc/archive-placeholder/login.cred -`. This handoff uses the VM's systemd host key. Save the password privately before removing the encrypted handoff.

From /opt/archive-placeholder run:

```sh
sudo docker compose config -q
sudo docker compose run --rm -T --no-deps caddy caddy validate --config /etc/caddy/Caddyfile
sudo docker compose up -d --force-recreate
```

From outside Azure, request HTTP and confirm a redirect to HTTPS. In a fresh browser, visit the public hostname and confirm the certificate is trusted, anonymous and invalid credentials get a Basic challenge (401), and valid credentials return 200 with exactly “Hello World”. Check a second path anonymously. Repeat the deployment and checks with the same TLS volume.

For rollback run `sudo docker compose stop caddy` in the placeholder directory. This releases the two public ports and keeps certificate data. For the Laravel handoff, extend this Caddy service to proxy to the internal backend on a shared Docker network, or stop it before starting the replacement listener. Keep Laravel's backend port internal and retain the hosting challenge until release promotion.
