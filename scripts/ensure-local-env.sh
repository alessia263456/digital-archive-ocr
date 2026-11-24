#!/bin/sh
set -eu

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root_dir"

if ! git check-ignore -q .env; then
    echo "Refusing to write credentials: .env is not ignored by Git." >&2
    exit 1
fi

env_file="$root_dir/.env"
if [ ! -f "$env_file" ]; then
    cp "$root_dir/backend/.env.example" "$env_file"
fi
chmod 600 "$env_file"

temporary_env=
temporary_value=
cleanup() {
    [ -z "$temporary_env" ] || rm -f "$temporary_env"
    [ -z "$temporary_value" ] || rm -f "$temporary_value"
}
trap cleanup 0 HUP INT TERM

set_env_value() {
    key=$1
    value=$2
    temporary_env=$(mktemp "$root_dir/.env.XXXXXX")
    if grep -q "^${key}=" "$env_file"; then
        temporary_value=$(mktemp "$root_dir/.env-value.XXXXXX")
        printf '%s' "$value" > "$temporary_value"
        chmod 600 "$temporary_value"
        awk -v key="$key" -v value_file="$temporary_value" '
            BEGIN { prefix = key "="; getline value < value_file }
            index($0, prefix) == 1 { print prefix value; updated = 1; next }
            { print }
            END { if (!updated) print prefix value }
        ' "$env_file" > "$temporary_env"
        rm -f "$temporary_value"
        temporary_value=
    else
        cat "$env_file" > "$temporary_env"
        printf '\n%s=%s\n' "$key" "$value" >> "$temporary_env"
    fi
    chmod 600 "$temporary_env"
    mv "$temporary_env" "$env_file"
    temporary_env=
}

if ! grep -q '^APP_KEY=.' "$env_file"; then
    app_key="base64:$(openssl rand -base64 32 | tr -d '\n')"
    set_env_value APP_KEY "$app_key"
fi

if ! grep -q '^DB_PASSWORD=.' "$env_file"; then
    db_password=$(openssl rand -hex 32)
    set_env_value DB_PASSWORD "$db_password"
fi

echo "Local credentials are present in the Git-ignored .env file."
