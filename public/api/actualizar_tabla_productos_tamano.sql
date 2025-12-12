-- Script para cambiar el campo marca por tamano en la tabla productos
-- Ejecutar en phpMyAdmin

USE ionica;

-- Cambiar el campo marca por tamano (numérico)
ALTER TABLE productos 
CHANGE COLUMN marca tamano DECIMAL(10, 2) NULL;

