FROM php:8.4-cli-bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev libonig-dev libicu-dev unzip \
        img2pdf poppler-utils libreoffice-writer-nogui fonts-liberation libzip-dev util-linux libpng-dev libjpeg62-turbo-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install -j2 gd pdo_pgsql mbstring zip intl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /app
COPY . .
COPY --from=repo docs/nomenclator_arhivistic.csv /app/database/seeders/data/nomenclator_arhivistic.csv
RUN composer install --no-interaction --prefer-dist --no-progress
RUN chown -R www-data:www-data storage bootstrap/cache
# PHP can report multipart parser warnings before Laravel writes the JSON response.
RUN printf 'display_errors=Off\nlog_errors=On\n' > "$PHP_INI_DIR/conf.d/api-errors.ini"
USER www-data
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
