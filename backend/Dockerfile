FROM php:8.2-cli

# Install dependencies required to build extensions (pdo_mysql, gd)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       default-mysql-client \
       libzip-dev \
       libonig-dev \
       libfreetype6-dev \
       libjpeg-dev \
       libpng-dev \
       libwebp-dev \
       libxpm-dev \
       libpng-dev \
       libjpeg62-turbo-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install gd pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/backend
