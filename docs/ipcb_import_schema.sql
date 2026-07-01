-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp without time zone DEFAULT now(),
  nombre character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  rol character varying NOT NULL CHECK (rol::text = ANY (ARRAY['admin'::character varying, 'operador'::character varying, 'vendedor'::character varying]::text[])),
  avatar_url text,
  telefono text,
  direccion text,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clientes (
  id_cliente bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL,
  telefono character varying,
  email character varying,
  estado boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  empresa character varying,
  direccion text,
  CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente)
);
CREATE TABLE public.categorias (
  id_categoria bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  CONSTRAINT categorias_pkey PRIMARY KEY (id_categoria)
);
CREATE TABLE public.catalogo_piezas (
  id_pieza bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL,
  marca character varying,
  modelo_auto character varying,
  anio character varying,
  descripcion text,
  precio_referencial numeric,
  imagen_url text,
  id_categoria bigint,
  stock integer DEFAULT 0,
  disponible boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT catalogo_piezas_pkey PRIMARY KEY (id_pieza),
  CONSTRAINT catalogo_piezas_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categorias(id_categoria)
);
CREATE TABLE public.contenedores (
  id_usuario uuid,
  id_contenedor bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  codigo_serial character varying NOT NULL UNIQUE,
  fecha_llegada date,
  estado_distribucion character varying,
  created_at timestamp without time zone DEFAULT now(),
  puerto_origen character varying,
  puerto_destino character varying,
  linea_naviera character varying,
  costo_flete_total numeric DEFAULT 0,
  CONSTRAINT contenedores_pkey PRIMARY KEY (id_contenedor),
  CONSTRAINT contenedores_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id)
);
CREATE TABLE public.importaciones (
  id_importacion bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pais_origen character varying,
  fecha_importacion date,
  costo_total numeric,
  estado character varying,
  id_contenedor bigint,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT importaciones_pkey PRIMARY KEY (id_importacion),
  CONSTRAINT importaciones_id_contenedor_fkey FOREIGN KEY (id_contenedor) REFERENCES public.contenedores(id_contenedor)
);
CREATE TABLE public.cotizaciones (
  id_usuario uuid,
  id_cotizacion bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_cliente bigint,
  total numeric,
  observaciones text,
  fecha date DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT now(),
  estado character varying DEFAULT 'PENDIENTE'::character varying,
  numero_cotizacion character varying,
  CONSTRAINT cotizaciones_pkey PRIMARY KEY (id_cotizacion),
  CONSTRAINT cotizaciones_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT cotizaciones_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id)
);
CREATE TABLE public.detalle_cotizacion (
  id_detalle bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_cotizacion bigint,
  id_pieza bigint,
  cantidad integer NOT NULL,
  precio_unitario numeric,
  subtotal numeric,
  CONSTRAINT detalle_cotizacion_pkey PRIMARY KEY (id_detalle),
  CONSTRAINT detalle_cotizacion_id_cotizacion_fkey FOREIGN KEY (id_cotizacion) REFERENCES public.cotizaciones(id_cotizacion),
  CONSTRAINT detalle_cotizacion_id_pieza_fkey FOREIGN KEY (id_pieza) REFERENCES public.catalogo_piezas(id_pieza)
);
CREATE TABLE public.proveedores (
  id_proveedor bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL,
  contacto character varying,
  email character varying,
  telefono character varying,
  pais character varying,
  estado boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT proveedores_pkey PRIMARY KEY (id_proveedor)
);
CREATE TABLE public.notas_entrega (
  id_usuario uuid,
  id_transportista bigint,
  id_nota bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  numero_nota character varying NOT NULL UNIQUE,
  id_cliente bigint,
  id_cotizacion bigint,
  observaciones text,
  fecha date DEFAULT CURRENT_DATE,
  tipo_cambio numeric DEFAULT 8.00,
  total_bultos integer DEFAULT 0,
  total_peso_kg numeric DEFAULT 0,
  total_usd numeric DEFAULT 0,
  total_bs numeric DEFAULT 0,
  estado character varying DEFAULT 'EMITIDA'::character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notas_entrega_pkey PRIMARY KEY (id_nota),
  CONSTRAINT notas_entrega_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT notas_entrega_id_cotizacion_fkey FOREIGN KEY (id_cotizacion) REFERENCES public.cotizaciones(id_cotizacion),
  CONSTRAINT notas_entrega_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id),
  CONSTRAINT notas_entrega_id_transportista_fkey FOREIGN KEY (id_transportista) REFERENCES public.transportistas(id_transportista)
);
CREATE TABLE public.detalle_liquidacion_transporte (
  id_detalle bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_nota bigint,
  id_proveedor bigint,
  numero_factura character varying,
  valor_factura numeric,
  flete numeric,
  cantidad_bultos integer,
  peso_kg numeric,
  total_liquidacion numeric,
  CONSTRAINT detalle_liquidacion_transporte_pkey PRIMARY KEY (id_detalle),
  CONSTRAINT detalle_liquidacion_transporte_id_nota_fkey FOREIGN KEY (id_nota) REFERENCES public.notas_entrega(id_nota),
  CONSTRAINT detalle_liquidacion_transporte_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES public.proveedores(id_proveedor)
);
CREATE TABLE public.rutas_contenedor (
  id_ruta bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_contenedor bigint NOT NULL,
  ubicacion_actual character varying NOT NULL,
  fecha_llegada date,
  observaciones text,
  estado character varying DEFAULT 'EN_TRANSITO'::character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT rutas_contenedor_pkey PRIMARY KEY (id_ruta),
  CONSTRAINT rutas_contenedor_id_contenedor_fkey FOREIGN KEY (id_contenedor) REFERENCES public.contenedores(id_contenedor)
);
CREATE TABLE public.contenedor_detalles (
  id_detalle bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_contenedor bigint NOT NULL,
  id_pieza bigint NOT NULL,
  id_cliente bigint NOT NULL,
  id_proveedor bigint NOT NULL,
  cantidad integer NOT NULL DEFAULT 1,
  costo_compra numeric DEFAULT 0,
  precio_venta numeric DEFAULT 0,
  ganancia_neta numeric DEFAULT ((precio_venta * (cantidad)::numeric) - (costo_compra * (cantidad)::numeric)),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT contenedor_detalles_pkey PRIMARY KEY (id_detalle),
  CONSTRAINT contenedor_detalles_id_contenedor_fkey FOREIGN KEY (id_contenedor) REFERENCES public.contenedores(id_contenedor),
  CONSTRAINT contenedor_detalles_id_pieza_fkey FOREIGN KEY (id_pieza) REFERENCES public.catalogo_piezas(id_pieza),
  CONSTRAINT contenedor_detalles_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT contenedor_detalles_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES public.proveedores(id_proveedor)
);
CREATE TABLE public.transportistas (
  id_transportista bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL,
  placa_vehiculo character varying,
  telefono character varying,
  tipo_vehiculo character varying,
  id_usuario uuid,
  estado boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT transportistas_pkey PRIMARY KEY (id_transportista),
  CONSTRAINT transportistas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id)
);
CREATE TABLE public.finanzas_pagos (
  id_pago bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  numero_recibo character varying NOT NULL UNIQUE,
  id_cliente bigint NOT NULL,
  id_nota bigint,
  monto numeric NOT NULL,
  metodo_pago character varying NOT NULL,
  referencia character varying,
  observaciones text,
  id_usuario uuid NOT NULL,
  fecha date DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT finanzas_pagos_pkey PRIMARY KEY (id_pago),
  CONSTRAINT finanzas_pagos_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT finanzas_pagos_id_nota_fkey FOREIGN KEY (id_nota) REFERENCES public.notas_entrega(id_nota),
  CONSTRAINT finanzas_pagos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id)
);
CREATE TABLE public.gastos_operativos (
  id_gasto bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  concepto character varying NOT NULL,
  monto numeric NOT NULL,
  categoria character varying NOT NULL,
  comprobante character varying,
  id_usuario uuid NOT NULL,
  fecha date DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT gastos_operativos_pkey PRIMARY KEY (id_gasto),
  CONSTRAINT gastos_operativos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id)
);
CREATE TABLE public.kardex_inventario (
  id_kardex bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_pieza bigint NOT NULL,
  tipo_movimiento character varying NOT NULL CHECK (tipo_movimiento::text = ANY (ARRAY['ENTRADA'::character varying, 'SALIDA'::character varying, 'AJUSTE'::character varying]::text[])),
  cantidad integer NOT NULL,
  motivo character varying NOT NULL,
  id_referencia bigint,
  saldo_actual integer NOT NULL,
  id_usuario uuid NOT NULL,
  fecha timestamp without time zone DEFAULT now(),
  CONSTRAINT kardex_inventario_pkey PRIMARY KEY (id_kardex),
  CONSTRAINT kardex_inventario_id_pieza_fkey FOREIGN KEY (id_pieza) REFERENCES public.catalogo_piezas(id_pieza),
  CONSTRAINT kardex_inventario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id)
);