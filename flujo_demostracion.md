# Guía de Demostración del ERP (Flujo Completo E2E)

> [!NOTE]
> Este documento detalla el flujo de trabajo completo (End-to-End) del sistema ERP. Está diseñado paso a paso con ejemplos de datos específicos para que puedas ejecutar una demostración perfecta frente a tu ingeniero o equipo directivo.

Este recorrido demuestra cómo todos los módulos del sistema están interconectados: desde la importación de mercancía en China hasta la entrega en la puerta del cliente en Bolivia, pasando por el control financiero.

---

## PASO 1: Importación y Recepción (Módulo de Contenedores)

**Objetivo:** Demostrar cómo se registra la compra internacional y cómo la mercancía ingresa al almacén, afectando automáticamente al inventario.

1. Ve al módulo **Contenedores (Importaciones)**.
2. Haz clic en **NUEVO CONTENEDOR**.
3. Ingresa los siguientes datos de prueba:
   - **Nro. Contenedor:** `ZCSU-8899001`
   - **Proveedor:** `Shenzhen Electronics Ltd.`
   - **Fecha de Salida (Origen):** Selecciona una fecha de la semana pasada.
   - **ETA (Llegada Estimada):** Selecciona el día de hoy.
   - **Estado:** Selecciona `En Tránsito`.
   - **Costo Total (USD):** `25000`
4. Haz clic en **Guardar**.
5. **Acción de Recepción:** Ahora, edita ese mismo contenedor y cambia su estado a `Recibido en Almacén`.
   > [!IMPORTANT]
   > Al cambiar el estado a "Recibido en Almacén", el sistema internamente actualizará el stock de los productos asociados a este contenedor. Esto demuestra la automatización del inventario.

---

## PASO 2: Verificación de Inventario (Módulo Kardex)

**Objetivo:** Demostrar la trazabilidad intocable del inventario.

1. Ve al módulo **Kardex de Inventario**.
2. Observa la tabla principal. Deberías ver un registro automático indicando una **ENTRADA** generada por la recepción del contenedor `ZCSU-8899001`.
3. Para demostrar un caso excepcional (mercancía dañada en el viaje):
   - Haz clic en **AJUSTE MANUAL**.
   - Selecciona un producto cualquiera.
   - Tipo de Ajuste: `BAJA POR DAÑO/PÉRDIDA (-)`.
   - Cantidad: `2`.
   - Motivo: `Cajas aplastadas durante la descarga del contenedor ZCSU-8899001`.
   - Haz clic en **Procesar Ajuste**.
   > [!TIP]
   > Muestra cómo este movimiento queda registrado con la etiqueta amarilla de "AJUSTE" y con tu usuario, garantizando total auditoría de quién tocó el stock.

---

## PASO 3: Registro de Cliente (Módulo Clientes)

**Objetivo:** Crear el perfil del cliente que realizará la compra.

1. Ve al módulo **Clientes**.
2. Haz clic en **REGISTRAR NUEVO CLIENTE**.
3. Ingresa los datos:
   - **Nombre:** `Importadora Los Andes (Juan Pérez)`
   - **Teléfono:** `+591 77711223`
   - **Email:** `compras@losandes.com.bo`
   - **Dirección:** `Av. Banzer, 4to Anillo, Santa Cruz`
4. Haz clic en **Guardar**.

---

## PASO 4: Venta y Facturación (Módulo Notas de Entrega / Ventas)

**Objetivo:** Generar la orden de salida para el cliente.

1. Ve al módulo **Notas de Entrega**.
2. Haz clic en **NUEVA NOTA DE ENTREGA**.
3. Selecciona como cliente a `Importadora Los Andes (Juan Pérez)`.
4. Agrega 2 o 3 productos al detalle de la venta (ej. 50 unidades del producto X).
5. Observa cómo el sistema calcula automáticamente el total a cobrar.
6. Cambia el estado a `Confirmado / Listo para Despacho`.
7. Haz clic en **Guardar / Generar Nota**.
   > [!WARNING]
   > Al confirmar esta nota de entrega, el sistema descuenta automáticamente esas cantidades del Stock Central (puedes verificarlo volviendo al Kardex después).

---

## PASO 5: Logística Local (Módulo Transportes)

**Objetivo:** Asignar un camión propio o tercerizado para llevar la mercancía desde tu almacén hasta el negocio del cliente en Santa Cruz.

1. Ve al módulo **Logística Nacional (Transportes)**.
2. Haz clic en **NUEVO CHOFER**.
3. Ingresa los datos del transportista:
   - **Nombre:** `Carlos Mendoza (Transportadora Veloz)`
   - **Placa:** `4567-XYZ`
   - **Teléfono:** `76543210`
   - **Tipo de Vehículo:** `Camión`
4. Haz clic en **Guardar**.
5. *Nota:* En un flujo completo real, volverías a la **Nota de Entrega** del cliente y le asignarías a "Carlos Mendoza" como el transportista responsable de esa entrega, para que el cliente sepa exactamente quién le lleva su pedido.

---

## PASO 6: Control Financiero (Módulo Caja y Finanzas)

**Objetivo:** Registrar el ingreso de dinero por la venta y un gasto operativo por el movimiento logístico.

### 6.1 Cobro al Cliente (Ingreso)
1. Ve al módulo **Caja y Finanzas**.
2. En la pestaña **COBRANZAS (INGRESOS)**, haz clic en **NUEVO INGRESO**.
3. **Cliente:** Selecciona `Importadora Los Andes`.
4. **Monto:** Ingresa el total de la venta (ej. `5000`).
5. **Método:** `Transferencia Bancaria`.
6. **Referencia:** `Nro. Comprobante 00998822`.
7. Haz clic en **Guardar Pago**.

### 6.2 Pago a Estibadores (Gasto)
1. Cambia a la pestaña **GASTOS OPERATIVOS (CAJA CHICA)**.
2. Haz clic en **REGISTRAR GASTO**.
3. **Categoría:** `Pago a Estibadores/Cargadores`.
4. **Concepto:** `Carga de camión de Carlos Mendoza para envío a Los Andes`.
5. **Monto:** `150`.
6. Haz clic en **Guardar Gasto**.

---

## 🎯 Conclusión para tu Ingeniero

Al finalizar este flujo, habrás demostrado a tu ingeniero que el sistema IPCB-Import no es solo un registro de datos, sino un **Ecosistema Conectado**:
1. **La importación** alimenta al inventario.
2. **Las ventas** descuentan el inventario.
3. **Los ajustes** dejan rastro de auditoría inviolable en el Kardex.
4. **Los despachos** se asocian a transportistas reales.
5. **El dinero** (entradas y salidas) queda centralizado para un control de utilidades preciso.

**Flujo completado con éxito.**
