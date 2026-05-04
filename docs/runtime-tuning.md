# Runtime tuning

Scope: Spring Boot backend on the LAN server `homeserver` class host
(12 CPU, about 16 GB RAM), with the backend service running as
`kick-backend.service` and runtime env loaded from
`/www/wwwroot/kick-backend/.env.production`.

The current deploy script restarts `kick-backend.service`; it does not rewrite
the systemd unit. JVM flags therefore must be consumed by the service unit
itself before `JAVA_OPTS` has any effect.

## Recommended starting values

Use `scripts/deploy/backend-runtime.env.example` as the source template.

```bash
JAVA_OPTS="-Xms2g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/www/wwwroot/kick-backend/heapdump.hprof -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Shanghai"

SERVER_TOMCAT_THREADS_MAX=240
SERVER_TOMCAT_THREADS_MIN_SPARE=24
SERVER_TOMCAT_MAX_CONNECTIONS=8192
SERVER_TOMCAT_ACCEPT_COUNT=1000
SERVER_TOMCAT_CONNECTION_TIMEOUT=10s

DB_POOL_MAX_SIZE=30
DB_POOL_MIN_IDLE=10
DB_POOL_CONNECTION_TIMEOUT=3000
DB_POOL_VALIDATION_TIMEOUT=2000
DB_POOL_MAX_LIFETIME=1800000

REDIS_TIMEOUT=1s
REDIS_CONNECT_TIMEOUT=1s
```

Rationale:

- `-Xmx4g` leaves headroom for MySQL Docker, Nginx, OS page cache, build tools,
  and short-lived deployment work on a 16 GB host.
- G1GC is the default on modern Java, but keeping it explicit makes runtime
  intent visible in service inspection.
- Tomcat threads at `240` provide concurrency headroom without letting request
  threads dominate CPU and memory.
- Hikari `30` keeps the existing application default while making the value
  explicit; confirm the MySQL container `max_connections` before increasing it.
- Redis timeouts stay at the existing 1 second behavior for local Redis.

## Applying JVM flags

If `systemctl show kick-backend.service -p ExecStart` still shows:

```text
java -jar /www/wwwroot/kick-backend/forum-1.0.0.jar
```

then `JAVA_OPTS` in `.env.production` is not active. Apply it with a systemd
drop-in on the server:

```bash
sudo systemctl edit kick-backend.service
```

Use this service override:

```ini
[Service]
EnvironmentFile=/www/wwwroot/kick-backend/.env.production
ExecStart=
ExecStart=/bin/sh -c 'exec java $JAVA_OPTS -jar /www/wwwroot/kick-backend/forum-1.0.0.jar'
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart kick-backend.service
sudo systemctl status kick-backend.service --no-pager -l
```

## Read-only runtime check

Run from the deployed repo:

```bash
cd /www/wwwroot/kick-deploy/repo
bash scripts/deploy/runtime-tuning-check.sh
```

Optional overrides:

```bash
SERVICE=kick-backend.service \
ENV_FILE=/www/wwwroot/kick-backend/.env.production \
PORT=8080 \
bash scripts/deploy/runtime-tuning-check.sh
```

The script prints the Java command, service env file values with secret-like
keys redacted, kernel backlog settings, service status, socket state, and the
configured Tomcat/Hikari/Redis values.

## Load validation

Before changing values, capture a baseline:

```bash
bash scripts/deploy/runtime-tuning-check.sh | tee /tmp/runtime-before.txt
curl -fsS http://127.0.0.1:8080/api/public/home-overview >/dev/null
```

Run a stepped load test from another host on the same LAN. Example with `wrk`:

```bash
wrk -t8 -c100 -d2m https://lan.excelcc.cn/api/public/home-overview
wrk -t8 -c200 -d2m https://lan.excelcc.cn/api/public/home-overview
wrk -t12 -c400 -d2m https://lan.excelcc.cn/api/public/home-overview
```

During each step, watch:

```bash
journalctl -u kick-backend.service -f
ss -ant sport = :8080 | awk 'NR == 1 || /ESTAB|SYN-RECV|TIME-WAIT|CLOSE-WAIT/'
docker stats
```

Pass criteria:

- backend health endpoint stays `200`
- no sustained `SYN-RECV` or `CLOSE-WAIT` growth
- no Hikari connection timeout spikes in service logs
- MySQL container CPU and connection counts remain stable
- Java RSS remains below the host memory budget with no OOM kills

## Rollback

Runtime rollback does not require code rollback. Restore the previous values in
`/www/wwwroot/kick-backend/.env.production` and restart:

```bash
sudo cp /www/wwwroot/kick-backend/.env.production.bak /www/wwwroot/kick-backend/.env.production
sudo systemctl restart kick-backend.service
curl -fsS http://127.0.0.1:8080/api/public/home-overview
```

If the systemd `JAVA_OPTS` override caused startup problems:

```bash
sudo systemctl revert kick-backend.service
sudo systemctl daemon-reload
sudo systemctl restart kick-backend.service
```
