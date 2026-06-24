-- =============================================================================
-- SEED DE DATOS MÍNIMOS - IPCB IMPORT
-- =============================================================================

-- NOTA:
-- Las tablas básicas (roles, sucursales, almacenes, ubicaciones, categorias, 
-- marcas, unidades_medida) ya tienen datos iniciales en ipcb_import_schema.sql.
--
-- INSTRUCCIONES:
-- 1. Regístrate en la pantalla de Login para crear el primer usuario en Auth.
-- 2. En la base de datos (Supabase), cambia manualmente el rol_id de tu perfil a 1 (SUPERADMIN).
-- 3. Ejecuta este script en el SQL Editor de Supabase para tener datos semilla.

-- =============================================================================
-- 1. PROVEEDORES DE EJEMPLO
-- =============================================================================
INSERT INTO proveedores (codigo, empresa, pais, contacto_nombre, email, whatsapp, canal_preferido) VALUES
  ('PROV-001', 'Shenzhen Auto Parts Co., Ltd.', 'China', 'Wei Chen', 'sales@shenzhenauto.cn', NULL, 'EMAIL'),
  ('PROV-002', 'Indústria de Autopeças São Paulo', 'Brasil', 'Carlos Silva', NULL, '+5511999999999', 'WHATSAPP'),
  ('PROV-003', 'Tokyo Motor Components', 'Japón', 'Kenji Sato', 'export@tokyomotor.jp', '+819012345678', 'AMBOS');

-- =============================================================================
-- 2. PRODUCTOS DE EJEMPLO Y STOCK INICIAL
-- =============================================================================
-- Categorías: 1(Filtros), 2(Bujías), 3(Frenos)
-- Marcas: 1(Toyota), 2(NGK), 3(Brembo), 5(Bosch)
-- Unidad de medida: 1(UND), 4(SET)

INSERT INTO productos (codigo_interno, nombre, descripcion, categoria_id, marca_id, unidad_medida_id, stock_minimo_global, precio_costo_ref, precio_venta_ref) VALUES
  ('FIL-TOY-001', 'Filtro de Aceite Hilux', 'Filtro de aceite original para Toyota Hilux 2016+', 1, 1, 1, 50, 4.50, 12.00),
  ('BUJ-NGK-001', 'Bujía Iridium IX', 'Bujía de alto rendimiento Iridium BKR6EIX', 2, 2, 1, 100, 3.20, 8.50),
  ('FRE-BRE-001', 'Pastillas de Freno Delanteras', 'Juego de pastillas de freno cerámicas Brembo', 3, 3, 4, 20, 25.00, 55.00),
  ('FIL-TOY-002', 'Filtro de Aire Corolla', 'Filtro de aire original para Toyota Corolla', 1, 1, 1, 30, 6.00, 15.00),
  ('BUJ-BOS-001', 'Bujía Platinum Plus', 'Bujía platino Bosch Super Plus', 2, 5, 1, 80, 2.80, 7.00);

-- Insertar stock directo en ALM-01 (almacen_id = 1) 
-- Ubicaciones: 2 = EST-A1, 3 = EST-A2
-- Nota: Lo insertamos directo en inventario_stock para datos semilla iniciales
-- y así evitar problemas con el created_by (UUID de usuario que no conocemos aquí).

INSERT INTO inventario_stock (producto_id, almacen_id, ubicacion_id, stock_actual, stock_minimo) VALUES
  ((SELECT id FROM productos WHERE codigo_interno = 'FIL-TOY-001'), 1, 2, 150, 50),
  ((SELECT id FROM productos WHERE codigo_interno = 'BUJ-NGK-001'), 1, 2, 300, 100),
  ((SELECT id FROM productos WHERE codigo_interno = 'FRE-BRE-001'), 1, 3, 45, 20),
  ((SELECT id FROM productos WHERE codigo_interno = 'FIL-TOY-002'), 1, 2, 85, 30),
  ((SELECT id FROM productos WHERE codigo_interno = 'BUJ-BOS-001'), 1, 2, 200, 80);

-- =============================================================================
-- 3. CLIENTES DE EJEMPLO BOLIVIANOS
-- =============================================================================
INSERT INTO clientes (codigo, nombre, empresa, nit_ci, telefono, email, direccion, ciudad) VALUES
  ('CLI-001', 'Roberto Gómez', 'Taller Mecánico El Tuerca', '1234567015', '+591 70012345', 'tallertuerca@gmail.com', 'Av. Banzer 4to Anillo', 'Santa Cruz de la Sierra'),
  ('CLI-002', 'María Laura Roca', 'Repuestos Express SRL', '9876543011', '+591 77098765', 'ventas@repuestosexpress.com.bo', 'Doble Vía a La Guardia Km 6', 'Santa Cruz de la Sierra'),
  ('CLI-003', 'Carlos Mamani', 'Lubricentro Carlos', '4561230018', '+591 60055443', 'carlos.lubricentro@hotmail.com', 'Av. 6 de Agosto', 'Cochabamba');
