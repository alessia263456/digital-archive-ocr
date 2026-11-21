FROM php:8.4-cli-bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev libonig-dev unzip \
        poppler-utils util-linux libpng-dev libjpeg62-turbo-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install -j2 gd pdo_pgsql mbstring \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /app
COPY . .
RUN composer install --no-interaction --prefer-dist --no-progress
RUN chown -R www-data:www-data storage bootstrap/cache
USER www-data
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
