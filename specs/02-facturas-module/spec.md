# Módulo de Facturas (Ventas) — Especificación y Diseño (SDD)

**Fecha:** 2026-07-13  
**Estado:** Propuesta  
**Versión:** 1.0.0  

---

## Fase 1 — Descubrimiento

### 1.1 Alcance
Este módulo implementa el procesamiento e integración de Facturas de Ventas. Su objetivo principal es transformar un archivo Excel con formato de comprobantes de retención (`RETENCION ORIGINAL`) en un reporte limpio de ventas facturadas (`VENTAS`), aplicando una separación de responsabilidades estricta e independencia total respecto al flujo existente de Compras/Retenciones.

### 1.2 Objetivos
- Diseñar e implementar el nuevo módulo **Facturas** para transformar hojas con estructura de retenciones electrónicas ecuatorianas en reportes de facturación de ventas emitidas.
- Mantener la separación total de UI, UX y lógica de negocio.
- Asegurar que la implementación no genere regresiones en el flujo existente de Compras/Retenciones.

### 1.3 Requerimientos Funcionales
- **Detección de hoja de origen**: Buscar y procesar la hoja `RETENCION ORIGINAL` (o similar/primera hoja que contenga columnas de retención).
- **Mapeo de datos**:
  - `RAZÓN SOCIAL` ← `razonsocial`
  - `NÚMERO DE FACTURA` ← `sussecuenc`
  - `FECHA EMISIÓN` ← `susfecemi`
  - `SUB TOTAL ` ← Si `ivabase1 > 0 || coddocum === '20'`, entonces `ftebase1`. De lo contrario, vacío/null.
  - `VENTAS  TARIFA CERO` ← Si `ivabase1 === 0 && coddocum !== '20'`, entonces `ftebase1`. De lo contrario, vacío/null.
  - `IVA` ← Si `ivabase1 > 0`, entonces `ivabase1`. De lo contrario, `0`.
  - `TOTAL` ← Fórmula de Excel: `=D[fila]+F[fila]` si hay subtotal, o `=E[fila]+F[fila]` si hay tarifa cero. (O equivalentemente `=D[fila]+E[fila]+F[fila]`).
- **Limpieza y Formateo**:
  - Eliminar hojas irrelevantes.
  - Nombrar la hoja de salida como `VENTAS`.
  - Aplicar formato profesional: negrita en encabezados, autofiltro, freeze pane en fila 2, anchos automáticos, formato monetario para columnas numéricas (`#,##0.00`) y formato de fecha para FECHA EMISIÓN.

---

## Fase 2 — Especificación del Dominio y Reglas

### 2.1 Modelo de Dominio de Facturas
El dominio **Facturas** se define por los siguientes campos de salida estructurados:
- **Razón Social**: Nombre del emisor de la factura.
- **Número de Factura**: Número secuencial del sustento (factura de venta referenciada).
- **Fecha Emisión**: Fecha de emisión de la factura de venta referenciada.
- **Subtotal**: Base imponible sujeta a IVA (tarifa 12%/15%).
- **Ventas Tarifa Cero**: Base imponible no sujeta a IVA (tarifa 0%).
- **IVA**: Monto del IVA de la factura.
- **Total**: Suma de Subtotal, Tarifa Cero e IVA.

### 2.2 Reglas de Negocio
1. **Regla de Clasificación Tributaria**:
   - Una venta se considera con tarifa diferente de cero (va a `SUB TOTAL `) si el valor del IVA del sustento (`ivabase1`) es mayor que cero, O si el tipo de documento del sustento (`coddocum`) es `'20'` (documentos del sistema financiero o del Estado).
   - Una venta se considera con tarifa cero (va a `VENTAS  TARIFA CERO`) si `ivabase1` es cero (o vacío) Y el `coddocum` no es `'20'`.
2. **Fórmula del Total**: El total se calcula mediante una fórmula de celda `=D{fila}+F{fila}` o `=E{fila}+F{fila}` (o genéricamente `+D{fila}+E{fila}+F{fila}`).
3. **Conversión y Limpieza**: Los estilos, comentarios, conditional formatting y hojas adicionales deben ser removidos para asegurar un reporte final limpio.

---

## Fase 3 — Diseño Técnico

### 3.1 Arquitectura del Módulo
La funcionalidad se integrará en las capas existentes:
- **Core (`src/core/`)**:
  - `modules.ts`: Agregar definición del nuevo módulo `facturas` y renombrar el existente a `compras`.
  - `semantic-rules.ts`: Definir reglas semánticas específicas para `compras` y `facturas`.
- **Transformer (`src/transformer.ts`)**:
  - Adaptar `ExcelTransformer` para recibir el `moduleId` y aplicar las reglas semánticas correspondientes.
- **Server API (`src/server/`)**:
  - Alinear `routes/files.ts` para usar el `moduleId` correcto y pasar las opciones de transformación al core.
- **Web UI (`src/web/`)**:
  - Crear una vista independiente o panel especializado para Facturas con controles dedicados si es necesario, o integrarlo con el selector de módulos de forma independiente e impecable.

```
┌─────────────────────────────────────────────────────────┐
│                     Client Web (React)                  │
│   ┌──────────────────────────┬──────────────────────┐   │
│   │    Module Compras (🛒)   │  Module Facturas (📄)│   │
│   └──────────────────────────┴──────────────────────┘   │
└────────────────────────────┬────────────────────────────┘
                             │ POST /api/files (moduleId)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     Express API Router                  │
└────────────────────────────┬────────────────────────────┘
                             │ processFile(..., { module })
                             ▼
┌─────────────────────────────────────────────────────────┐
│               ExcelTransformer (Core Engine)            │
│   ┌──────────────────────────┬──────────────────────┐   │
│   │    Transform Compras     │  Transform Facturas  │   │
│   └──────────────────────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Fase 4 — Plan de Implementación

### Tarea 1: Extender Definición de Módulos y Reglas
- **Archivos**: `src/core/modules.ts`, `src/core/semantic-rules.ts`, `src/core/types.ts`
- **Cambios**:
  - Agregar constante `FACTURAS_SEMANTIC_RULES`.
  - Modificar `MODULES` para incluir `compras` y `facturas`.
  - Agregar `module` a `TransformOptions`.

### Tarea 2: Adaptar ExcelTransformer
- **Archivos**: `src/transformer.ts`
- **Cambios**:
  - Implementar bifurcación de lógica en `transform()` según `options.module`.
  - Para `facturas`:
    - Buscar la hoja de origen (`RETENCION ORIGINAL` o la primera hoja).
    - Leer filas y generar la estructura de 7 columnas para `VENTAS`.
    - Escribir fórmulas dinámicas de suma en la columna `TOTAL`.
    - Limpiar hojas adicionales.
    - Aplicar formateo (monedas, fechas, negritas, anchos, freeze pane).

### Tarea 3: Alinear el Servidor y Orquestador
- **Archivos**: `src/core/processor.ts`, `src/server/routes/files.ts`
- **Cambios**:
  - Pasar el `module` de las opciones al transformer.
  - Asegurar compatibilidad en la subida y procesamiento por lote.

### Tarea 4: Actualizar la Interfaz Web (UI/UX)
- **Archivos**: `src/web/store.ts`, `src/web/App.tsx`, `src/web/components/*`
- **Cambios**:
  - Crear e integrar componentes dedicados e independientes para el flujo de Facturas (paneles de carga, tablas de resultados independientes, estados visuales y flujos de acción desacoplados).

### Tarea 5: Tests y Validación
- **Archivos**: `tests/core/transformer.test.ts`, `tests/core/processor.test.ts`
- **Cambios**:
  - Escribir tests específicos para el flujo de transformación de Facturas.
  - Verificar que el build general funcione y pase todas las pruebas sin regresiones.
