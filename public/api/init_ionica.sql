-- Base de datos para el sistema de ventas IONICA
-- Ejecutar este script en phpMyAdmin para crear la base de datos y tabla de usuarios

CREATE DATABASE IF NOT EXISTS ionica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ionica;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar usuarios de prueba
-- Contraseña: password (hasheada con password_hash)
INSERT INTO usuarios (username, email, password, nombre, activo) VALUES
('admin', 'admin@ionica.com', '$2y$10$f8uvTChVfhOsLE0OJr6tleRyhK/0sZy6eJ.YhaGiKNrreingRLSP.', 'Administrador', 1),
('vendedor', 'vendedor@ionica.com', '$2y$10$f8uvTChVfhOsLE0OJr6tleRyhK/0sZy6eJ.YhaGiKNrreingRLSP.', 'Vendedor', 1)
ON DUPLICATE KEY UPDATE password = VALUES(password);

-- Nota: La contraseña hasheada corresponde a "password"
-- Para crear tu propia contraseña, usa: password_hash('tu_contraseña', PASSWORD_DEFAULT)

