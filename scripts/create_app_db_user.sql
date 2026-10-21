-- Usuario de MySQL para la aplicación, con permisos solo sobre ionlifebd (en lugar de root).
-- Ejecutar como root, reemplazando la contraseña:
--   mysql -u root -p < scripts/create_app_db_user.sql
-- Luego en .env: DB_USER=ionlife_app y DB_PASSWORD=<la contraseña>, y reiniciar el backend.
--
-- CREATE/ALTER/INDEX/REFERENCES son necesarios porque el backend crea tablas e índices
-- al arrancar (chat, roles_permisos, migraciones de devoluciones_registro).

CREATE USER IF NOT EXISTS 'ionlife_app'@'%' IDENTIFIED BY 'CAMBIAR_POR_CONTRASEÑA_SEGURA';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON ionlifebd.* TO 'ionlife_app'@'%';

FLUSH PRIVILEGES;
