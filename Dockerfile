FROM php:8.1-apache

# Habilitar mod_rewrite para Apache
RUN a2enmod rewrite

# Instalar extensiones PHP necesarias
RUN docker-php-ext-install pdo pdo_mysql

# Configurar directorio de trabajo
WORKDIR /var/www/html

# Copiar archivos de la aplicación
COPY public/ /var/www/html/

# Configurar permisos
RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 755 /var/www/html

# Crear configuración de Apache para puerto 4000 (accesible desde todas las interfaces)
RUN echo "Listen 0.0.0.0:4000" > /etc/apache2/ports.conf
RUN echo "<VirtualHost *:4000>" > /etc/apache2/sites-available/000-default.conf
RUN echo "    ServerAdmin webmaster@localhost" >> /etc/apache2/sites-available/000-default.conf
RUN echo "    ServerName localhost" >> /etc/apache2/sites-available/000-default.conf
RUN echo "    DocumentRoot /var/www/html" >> /etc/apache2/sites-available/000-default.conf
RUN echo "    <Directory /var/www/html>" >> /etc/apache2/sites-available/000-default.conf
RUN echo "        Options Indexes FollowSymLinks" >> /etc/apache2/sites-available/000-default.conf
RUN echo "        AllowOverride All" >> /etc/apache2/sites-available/000-default.conf
RUN echo "        Require all granted" >> /etc/apache2/sites-available/000-default.conf
RUN echo "    </Directory>" >> /etc/apache2/sites-available/000-default.conf
RUN echo "    ErrorLog \${APACHE_LOG_DIR}/error.log" >> /etc/apache2/sites-available/000-default.conf
RUN echo "    CustomLog \${APACHE_LOG_DIR}/access.log combined" >> /etc/apache2/sites-available/000-default.conf
RUN echo "</VirtualHost>" >> /etc/apache2/sites-available/000-default.conf

# Exponer puerto 4000
EXPOSE 4000

# Iniciar Apache
CMD ["apache2-foreground"]
