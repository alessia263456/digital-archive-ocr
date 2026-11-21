# Live skeleton

Run commands from `docker/live` in a checkout of the selected revision. The `archive-live` project builds React assets into Caddy and runs Laravel under FrankenPHP classic mode on internal port 8000. PostgreSQL uses the project’s `pgdata` volume. The OCR smoke runs on demand. The public hostname is `arhivar.swedencentral.cloudapp.azure.com`.

## Prerequisites

Use a private shell with Docker Engine and Compose v2 or later, access to the checkout and Docker image registries, and permission to operate both projects. Run the following under an identity with Docker access. Keep the same identity and environment for all Compose commands. Confirm the VM architecture matches the pinned image and the placeholder owns TCP ports 80 and 443.

```sh
docker info --format '{{.OSType}}/{{.Architecture}}'
docker compose -f /opt/archive-placeholder/compose.yaml ps
placeholder_id=$(docker compose -f /opt/archive-placeholder/compose.yaml ps -q caddy)
PLACEHOLDER_TLS_VOLUME=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$placeholder_id")
test -n "$PLACEHOLDER_TLS_VOLUME" || exit 1
export PLACEHOLDER_TLS_VOLUME
docker volume inspect --format '{{.Name}}' "$PLACEHOLDER_TLS_VOLUME"
```

Confirm the volume name before proceeding. The normal name is `archive-placeholder_tls_data`. The edge also needs the existing root-owned mode 0600 bcrypt import at `/etc/archive-placeholder/auth`. Keep the existing DNS, ingress rules and placeholder Compose directory available. From outside the VM, verify an HTTP redirect to the expected hostname, a trusted TLS certificate, and an anonymous Basic challenge.

```sh
url=https://arhivar.swedencentral.cloudapp.azure.com
curl -sSI "http://arhivar.swedencentral.cloudapp.azure.com/"
curl -sSI "$url/"
```

Supply the persistent Laravel `APP_KEY` and PostgreSQL `DB_PASSWORD` as exported shell variables from the password manager. The Application key uses Laravel’s base64-encoded 32-byte key format. Retain both values for subsequent starts. Use `config -q` for validation so credentials stay out of terminal output. Run the offline configuration tests from the repository root with `python3 docker/live/test_config.py`.

## Local PHP compatibility check

From `docker/live`, run this smoke in a disposable container. It exercises the renderer through an HTTP request under the FrankenPHP service identity. The PHP test fixture is mounted only for this check. Expect `2x3`.

```sh
(
  set -eu
  docker build -f backend.Dockerfile -t archive-live-backend:smoke ../../backend
  id=$(docker run --rm -d --network none \
    -v "$PWD/FrankenPHP.Caddyfile:/etc/caddy/Caddyfile:ro" \
    -v "$PWD/tests/render.php:/app/public/render.php:ro" archive-live-backend:smoke)
  trap 'docker stop "$id" >/dev/null' EXIT
  result=$(docker exec "$id" curl --fail --silent --show-error --retry 5 --retry-connrefused \
    http://127.0.0.1:8000/render.php)
  test "$result" = 2x3 && echo "$result"
)
```

## Prepare and switch during P22-56b

The following live operations require deployment authorization and the P22-11 storage integration. Keep the placeholder serving while building and checking the internal services.

```sh
docker compose config -q
docker compose build backend caddy ocr-worker
docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile
docker compose run --rm --no-deps backend frankenphp validate --config /etc/caddy/Caddyfile
docker compose up -d --wait backend
docker compose exec -T backend php artisan migrate --force
docker compose exec -T backend php artisan migrate:status
docker compose run --rm ocr-worker
```

Check database migrations and the Romanian TSV smoke. Complete P22-11’s signed storage checks before accepting the deployed skeleton. At the agreed cutover, switch the listener with the same certificate volume.

```sh
docker compose -f /opt/archive-placeholder/compose.yaml stop caddy
docker compose up -d caddy
```

From outside Azure, repeat the HTTP redirect and anonymous HTTPS challenge checks. Open the public URL in a fresh browser, authenticate and confirm the React Screen and its built asset load. Check Laravel health and the API fallback using curl’s interactive password prompt.

```sh
curl --fail --user preview "$url/up"
curl -i --user preview -H 'Accept: application/json' "$url/api/missing"
```

Expect HTTP 200 for health and a Laravel JSON 404 for the absent API route. Anonymous or invalid credentials should receive a 401 challenge on both paths and on frontend assets. Check certificate continuity across the switch.

## Restore the placeholder during P22-56b

If the listener fails to start or an external smoke fails, run the following from the same checkout and shell.

```sh
docker compose stop caddy
docker compose -f /opt/archive-placeholder/compose.yaml start caddy
curl -sSI "$url/"
curl --fail --user preview "$url/"
```

Verify the anonymous 401, the trusted certificate and the authenticated “Hello World” response. Keep both projects and their volumes. This restores public traffic. Database recovery after a migration is a separate operation.
