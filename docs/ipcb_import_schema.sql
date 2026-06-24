-- =========================
-- TABLA: USUARIOS
-- =========================
create table usuarios (
    id uuid primary key default gen_random_uuid(),
    nombre varchar(100) not null,
    email varchar(100) unique not null,
    rol varchar(20) not null check (rol in ('admin', 'operador', 'vendedor')),
    created_at timestamp default now()
);

-- =========================
-- TABLA: CLIENTES
-- =========================
create table clientes (
    id_cliente bigint generated always as identity primary key,
    nombre varchar(100) not null,
    telefono varchar(20),
    email varchar(100),
    estado boolean default true,
    created_at timestamp default now()
);

-- =========================
-- TABLA: CATEGORIAS
-- =========================
create table categorias (
    id_categoria bigint generated always as identity primary key,
    nombre varchar(100) unique not null
);

-- =========================
-- TABLA: CATALOGO PIEZAS
-- =========================
create table catalogo_piezas (
    id_pieza bigint generated always as identity primary key,
    nombre varchar(100) not null,
    marca varchar(100),
    modelo_auto varchar(100),
    anio varchar(20),
    descripcion text,
    precio_referencial numeric(10,2),
    stock int default 0,
    imagen_url text,
    disponible boolean default true,
    id_categoria bigint references categorias(id_categoria),
    created_at timestamp default now()
);

-- =========================
-- TABLA: CONTENEDORES
-- =========================
create table contenedores (
    id_contenedor bigint generated always as identity primary key,
    codigo_serial varchar(50) unique not null,
    fecha_llegada date,
    estado_distribucion varchar(50),
    created_at timestamp default now()
);

-- =========================
-- TABLA: IMPORTACIONES
-- =========================
create table importaciones (
    id_importacion bigint generated always as identity primary key,
    pais_origen varchar(100),
    fecha_importacion date,
    costo_total numeric(10,2),
    estado varchar(50),
    id_contenedor bigint references contenedores(id_contenedor),
    created_at timestamp default now()
);

-- =========================
-- TABLA: COTIZACIONES
-- =========================
create table cotizaciones (
    id_cotizacion bigint generated always as identity primary key,
    id_cliente bigint references clientes(id_cliente),
    fecha date default current_date,
    total numeric(10,2),
    observaciones text,
    created_at timestamp default now()
);

-- =========================
-- TABLA: DETALLE COTIZACION
-- =========================
create table detalle_cotizacion (
    id_detalle bigint generated always as identity primary key,
    id_cotizacion bigint references cotizaciones(id_cotizacion),
    id_pieza bigint references catalogo_piezas(id_pieza),
    cantidad int not null,
    precio_unitario numeric(10,2),
    subtotal numeric(10,2)
);