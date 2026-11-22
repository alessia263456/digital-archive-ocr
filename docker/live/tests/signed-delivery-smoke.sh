#!/usr/bin/env bash
set -euo pipefail
set +x 2>/dev/null || true

cd "$(dirname -- "${BASH_SOURCE[0]}")/.."

public_host="arhivar.swedencentral.cloudapp.azure.com"
fixture_id="$(python3 -c 'import secrets; print(secrets.token_hex(12))')"
fixture_path="smoke/p22-56b/${fixture_id}.pdf"
fixture_body="P22-56b synthetic Signed URL check ${fixture_id}"

php_generate=$(cat <<'PHP'
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$path = getenv('P22_SMOKE_PATH');
$body = getenv('P22_SMOKE_BODY');
$storage = new App\Services\DocumentStorageService();
if (!$storage->put($path, $body)) {
    exit(1);
}
echo $storage->temporaryUrl($path, now()->addMinutes(5)), "\n";
echo $storage->temporaryUrl($path, now()->subMinute()), "\n";
PHP
)

php_delete=$(cat <<'PHP'
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
exit((new App\Services\DocumentStorageService())->delete(getenv('P22_SMOKE_PATH')) ? 0 : 1);
PHP
)

cleanup() {
    local result=$?
    trap - EXIT
    if ! docker compose exec -T -e "P22_SMOKE_PATH=${fixture_path}" backend php -r "$php_delete" >/dev/null 2>&1; then
        printf 'Could not remove synthetic R2 object %s.\n' "$fixture_path" >&2
        result=1
    fi
    exit "$result"
}
trap cleanup EXIT

if ! urls="$(docker compose exec -T \
    -e "P22_SMOKE_PATH=${fixture_path}" \
    -e "P22_SMOKE_BODY=${fixture_body}" \
    backend php -r "$php_generate" 2>/dev/null)"; then
    printf 'Could not create the synthetic R2 object or Signed URLs.\n' >&2
    exit 1
fi

mapfile -t signed_urls <<<"$urls"
if [[ ${#signed_urls[@]} -ne 2 || -z ${signed_urls[0]} || -z ${signed_urls[1]} ]]; then
    printf 'Expected one valid and one expired Signed URL.\n' >&2
    exit 1
fi
case "${signed_urls[0]}" in
    "https://${public_host}/"*) ;;
    *)
        printf 'The generated Signed URL does not target the configured live hostname.\n' >&2
        exit 1
        ;;
esac

valid_response="$(curl --silent --show-error --http1.1 --include \
    --resolve "${public_host}:443:127.0.0.1" \
    --user preview "${signed_urls[0]}")"
valid_status="$(sed -n '1s/^[^ ]* \([0-9][0-9][0-9]\).*/\1/p' <<<"$valid_response")"
valid_headers="${valid_response%%$'\r\n\r\n'*}"
valid_body="${valid_response#*$'\r\n\r\n'}"
if [[ $valid_status != 200 || $valid_body != "$fixture_body" ]]; then
    printf 'Valid Signed URL check failed (HTTP %s).\n' "$valid_status" >&2
    exit 1
fi
cache_control="$(awk 'tolower($1) == "cache-control:" { $1 = ""; sub(/^ /, ""); print tolower($0); exit }' <<<"$valid_headers")"
if ! grep -Eqi '^Content-Type: application/pdf([;[:space:]]|$)' <<<"$valid_headers" \
    || ! grep -Eqi '^X-Content-Type-Options: nosniff[[:space:]]*$' <<<"$valid_headers" \
    || [[ $cache_control != *private* || $cache_control != *no-store* || $cache_control != *max-age=0* ]]; then
    printf 'Signed delivery security headers did not match the contract.\n' >&2
    exit 1
fi
printf 'Caddy/FrankenPHP valid Signed URL: HTTP 200, content and security headers verified.\n'

expired_status="$(curl --silent --show-error --http1.1 \
    --resolve "${public_host}:443:127.0.0.1" --user preview \
    --output /dev/null --write-out '%{http_code}' "${signed_urls[1]}")"
if [[ $expired_status != 403 ]]; then
    printf 'Expired Signed URL check failed (HTTP %s).\n' "$expired_status" >&2
    exit 1
fi
printf 'Caddy/FrankenPHP expired Signed URL: HTTP 403 verified.\n'

tampered_status="$(curl --silent --show-error --http1.1 \
    --resolve "${public_host}:443:127.0.0.1" --user preview \
    --output /dev/null --write-out '%{http_code}' \
    "${signed_urls[0]}&p22_smoke_tampered=1")"
if [[ $tampered_status != 403 ]]; then
    printf 'Tampered Signed URL check failed (HTTP %s).\n' "$tampered_status" >&2
    exit 1
fi
printf 'Caddy/FrankenPHP tampered Signed URL: HTTP 403 verified.\n'
