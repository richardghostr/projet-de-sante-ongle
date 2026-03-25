FROM php:8.2-cli

# Install dependencies required to build pdo_mysql
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       default-mysql-client \
       libzip-dev \
       libonig-dev \
    && docker-php-ext-install pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/backend
