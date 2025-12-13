FROM php:8.1-apache

# Habilitar mod_rewrite para Apache
RUN a2enmod rewrite

# Instalar extensiones PHP necesarias
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Instalar herramientas útiles
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Configurar directorio de trabajo
WORKDIR /var/www/html

# Copiar archivos de la aplicación
COPY public/ /var/www/html/

# Configurar permisos
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Crear configuración de Apache para puerto 4000
RUN echo "Listen 0.0.0.0:4000" > /etc/apache2/ports.conf \
    && echo "<VirtualHost *:4000>" > /etc/apache2/sites-available/000-default.conf \
    && echo "    ServerAdmin webmaster@localhost" >> /etc/apache2/sites-available/000-default.conf \
    && echo "    ServerName localhost" >> /etc/apache2/sites-available/000-default.conf \
    && echo "    DocumentRoot /var/www/html" >> /etc/apache2/sites-available/000-default.conf \
    && echo "    <Directory /var/www/html>" >> /etc/apache2/sites-available/000-default.conf \
    && echo "        Options -Indexes +FollowSymLinks" >> /etc/apache2/sites-available/000-default.conf \
    && echo "        AllowOverride All" >> /etc/apache2/sites-available/000-default.conf \
    && echo "        Require all granted" >> /etc/apache2/sites-available/000-default.conf \
    && echo "    </Directory>" >> /etc/apache2/sites-available/000-default.conf \
    && echo "    ErrorLog \${APACHE_LOG_DIR}/error.log" >> /etc/apache2/sites-available/000-default.conf \
    && echo "    CustomLog \${APACHE_LOG_DIR}/access.log combined" >> /etc/apache2/sites-available/000-default.conf \
    && echo "</VirtualHost>" >> /etc/apache2/sites-available/000-default.conf

# Exponer puerto 4000
EXPOSE 4000

# Iniciar Apache
CMD ["apache2-foreground"]
