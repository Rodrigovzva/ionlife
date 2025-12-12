-- Script para agregar campos adicionales a la tabla usuarios
-- Ejecutar en phpMyAdmin si quieres usar todos los campos del formulario

USE ionica;

-- Agregar campos adicionales si no existen
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20) AFTER nombre,
ADD COLUMN IF NOT EXISTS direccion VARCHAR(200) AFTER telefono,
ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100) AFTER direccion,
ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'vendedor' AFTER activo,
ADD COLUMN IF NOT EXISTS notas TEXT AFTER rol;

-- Actualizar valores por defecto de rol si es necesario
UPDATE usuarios SET rol = 'administrador' WHERE username = 'admin';
UPDATE usuarios SET rol = 'vendedor' WHERE username = 'vendedor' AND (rol IS NULL OR rol = '');

