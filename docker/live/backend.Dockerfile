FROM dunglas/frankenphp:1-php8.4-bookworm@sha256:2721ad9a89b1e34da343f584c063b397012c8c48f0d5727cad657fe2cdf8763f AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends img2pdf poppler-utils libreoffice-writer-nogui fonts-liberation util-linux \
    && rm -rf /var/lib/apt/lists/* \
    && install-php-extensions pdo_pgsql mbstring gd zip posix \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /app
COPY artisan composer.json composer.lock ./
COPY app/ app/
COPY bin/ bin/
COPY bootstrap/ bootstrap/
COPY config/ config/
COPY --from=repo docs/nomenclator_arhivistic.csv database/seeders/data/nomenclator_arhivistic.csv
COPY database/migrations/ database/migrations/
COPY public/ public/
COPY routes/ routes/
RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && chown -R www-data:www-data storage bootstrap/cache
ENV HOME=/tmp
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

FROM base AS test
COPY tests/ tests/
COPY phpunit.xml ./
RUN php /usr/local/bin/composer install --prefer-dist --no-interaction --no-progress \
    && chown -R www-data:www-data bootstrap/cache
USER www-data

FROM base AS live
RUN php /usr/local/bin/composer install --no-dev --prefer-dist --no-interaction --no-progress \
    && php /usr/local/bin/composer check-platform-reqs --no-dev \
    && chown -R www-data:www-data bootstrap/cache
USER www-data
