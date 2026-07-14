# Arquitectura de Plugins y CLI Basada en Comandos — Especificación (SDD)

**Fecha:** 2026-07-13  
**Estado:** Propuesta  
**Versión:** 2.0.0  

---

## Fase 1 — Descubrimiento

### 1.1 Objetivos
- Rediseñar la interfaz de línea de comandos (CLI) de InvoiceFlow para funcionar mediante comandos explícitos (`/facturas`, `/retenciones`, `/web`, `/help`, `/version`, `/`).
- Eliminar por completo el selector inicial de módulo en la CLI interactiva.
- Implementar una arquitectura de módulos/plugins desacoplados en el backend, donde cada módulo encapsula sus propias reglas de negocio y transformaciones.
- Rediseñar el frontend del cliente web para iniciar siempre con un selector visual de módulos, completamente desacoplado del estado de la CLI.

---

## Fase 2 — Especificación de Módulos

### 2.1 Módulo Facturas (ID: `facturas`)
- **Descripción**: Procesamiento de facturas de compras/gastos (26 a 12 columnas).
- **Características**: Soporta y requiere la selección de **Tipo de Gasto** (`EMPRESARIAL` / `PERSONAL`).
- **Comportamiento**: Idéntico al flujo original del proyecto.

### 2.2 Módulo Retenciones (ID: `retenciones`)
- **Descripción**: Procesamiento de retenciones electrónicas (40 a 7 columnas).
- **Características**: No soporta ni requiere Tipo de Gasto.
- **Comportamiento**: Mapea `RETENCION ORIGINAL` a la hoja `VENTAS` o `RETENCION FINAL`.

---

## Fase 3 — Diseño Técnico

### 3.1 CLI
- Escribir `/` o `/help` o sin comandos en la terminal interactiva listará las opciones de ayuda.
- El flujo interactivo no requerirá selección de módulo previa; se lanzará el módulo correspondiente mediante el comando typed.

### 3.2 Estructura del Cliente Web
El frontend presentará un selector visual de módulos en la pantalla principal. Al alternar entre pestañas o módulos, se renderizará un contenedor completamente independiente para cada uno:
- `FacturasWorkspace` para Facturas.
- `RetencionesWorkspace` para Retenciones.

---

## Fase 4 — Plan de Implementación

1. **Reorganizar Módulos y Reglas**:
   - Mapear el ID `facturas` al flujo de 26->12 columnas.
   - Mapear el ID `retenciones` al flujo de 40->7 columnas.
2. **Rediseñar CLI e Interactivo**:
   - Modificar `src/cli/index.ts` y `src/cli/interactive.ts` para procesar comandos.
3. **Desacoplar Frontend**:
   - Crear componentes limpios e independientes para cada flujo en el cliente web.
4. **Validación**:
   - Ejecutar los tests de regresión y comprobar la compilación global.
