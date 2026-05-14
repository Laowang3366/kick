# LAN Nginx cache and rate-limit runbook

## Scope

This runbook is for the LAN Nginx site at:

```bash
/etc/nginx/sites-available/kick-lan.conf
```

It installs the repository template:

```bash
scripts/deploy/nginx/kick-lan.conf.template
```

The template keeps the current topology: `/www/wwwroot/excelcc/kick-web` serves the SPA, and `/api/`, `/uploads/`, and `/ws/` proxy to `127.0.0.1:8081`.

## Behavior

- `/assets/*`: `Cache-Control: public, max-age=31536000, immutable` for Vite hashed assets.
- `/index.html` and SPA fallback routes: `no-cache, no-store, must-revalidate`.
- gzip: enabled for text, CSS, JavaScript, JSON, XML, and SVG responses.
- `/ws/`: keeps `Upgrade` and `Connection: upgrade` headers and long read/send timeouts.
- Upload/body size: keeps the current `client_max_body_size 20m` behavior.
- Rate limits: examples are included but commented. Enable them only after confirming normal LAN login, write, upload, and WebSocket traffic.

## Dry run

Run from the server deploy repo:

```bash
cd /www/wwwroot/excelcc/kick-deploy/repo
bash scripts/deploy/nginx/install-kick-lan-nginx.sh --dry-run
```

The default mode is dry-run. It prints the target path, shows a diff when `diff` is available, and runs:

```bash
nginx -t
```

On hosts where `nginx -t` requires root to read the runtime pid file, run the
same dry-run with `sudo` for full validation:

```bash
sudo bash scripts/deploy/nginx/install-kick-lan-nginx.sh --dry-run
```

## Apply

Apply requires root:

```bash
cd /www/wwwroot/excelcc/kick-deploy/repo
sudo bash scripts/deploy/nginx/install-kick-lan-nginx.sh --apply
```

The script:

1. backs up `/etc/nginx/sites-available/kick-lan.conf` to `/etc/nginx/sites-available/kick-lan.conf.<timestamp>.bak`;
2. installs `scripts/deploy/nginx/kick-lan.conf.template`;
3. runs `nginx -t`;
4. reloads Nginx with `systemctl reload nginx`;
5. restores the backup automatically if validation fails before reload.

## Post-apply validation

Use LAN HTTP checks after reload:

```bash
curl -I http://127.0.0.1/
curl -I http://127.0.0.1/index.html
curl -I http://127.0.0.1/assets/<existing-built-asset>
curl -fsS http://127.0.0.1/api/public/home-overview
systemctl is-active nginx
```

Expected cache headers:

- `/assets/<hash>.js` or `/assets/<hash>.css`: `Cache-Control: public, max-age=31536000, immutable`
- `/index.html`: `Cache-Control: no-cache, no-store, must-revalidate`

## Rate-limit enablement

The template includes commented `limit_req_zone` and `limit_conn_zone` directives. On Ubuntu's default Nginx layout, site files under `sites-enabled` are included from the `http` context, so these zone directives are valid at the top of `kick-lan.conf`.

Recommended staged enablement:

1. Enable only `limit_req_zone $binary_remote_addr zone=kick_lan_auth:10m rate=5r/m;`.
2. Uncomment the auth-only `location ~ ^/api/auth/(login|register|forgot-password)(/|$)` block.
3. Run `nginx -t`.
4. Reload Nginx.
5. Watch `/var/log/nginx/access.log` and `/var/log/nginx/error.log` for false positives.

Write throttling and WebSocket connection caps are intentionally left commented because LAN admin operations, uploads, and practice submissions can be bursty.

## Rollback

Use the backup path printed by the apply script:

```bash
sudo cp -a /etc/nginx/sites-available/kick-lan.conf.<timestamp>.bak /etc/nginx/sites-available/kick-lan.conf
sudo nginx -t
sudo systemctl reload nginx
```

If `nginx -t` fails during apply, the install script restores the backup automatically and exits non-zero.
