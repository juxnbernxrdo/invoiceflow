# Diseño de Mejoras UX/UI - InvoiceFlow CLI

**Fecha:** 2026-07-03
**Estado:** Aprobado

## Resumen

Mejorar la experiencia de usuario de InvoiceFlow CLI mediante cambios en el comando, barra de progreso y manejo de errores con sugerencias.

## Cambios Propuestos

### 1. Comando CLI
- **Actual:** `invoice-flow`
- **Nuevo:** `invoiceflow`
- **Archivos a modificar:** `package.json` (campo `bin`)

### 2. Selector de Archivos
- **Decisión:** Mantener el selector actual de `autocompleteMultiselect`
- **Razón:** El selector actual funciona bien y es intuitivo

### 3. Barra de Progreso
- **Paquete:** `cli-progress`
- **Uso:** Mostrar progreso con porcentaje durante el procesamiento de archivos
- **Implementación:**
  - Barra de progreso para el procesamiento de cada archivo
  - Indicador de archivo actual/total
  - Porcentaje de completado

### 4. Manejo de Errores con Sugerencias
- **Mejora:** Agregar sugerencias de solución para errores comunes
- **Ejemplos:**
  - Error de archivo no encontrado → Sugerir verificar la ruta
  - Error de formato inválido → Sugerir usar archivos .xlsx o .xls
  - Error de permisos → Sugerir verificar permisos de lectura

## Archivos a Modificar

1. `package.json` - Cambiar comando y agregar dependencia `cli-progress`
2. `src/cli.ts` - Implementar barra de progreso y mejorar mensajes de error
3. `src/transformer.ts` - Emitir eventos de progreso para la barra

## Dependencias Nuevas

```json
{
  "cli-progress": "^3.12.0"
}
```

## Limitaciones

- No alterar el ASCII Art existente
- Mantener el funcionamiento actual de la CLI
- No cambiar la lógica de transformación de archivos

## Criterios de Aceptación

1. El comando `invoiceflow` funciona correctamente
2. Se muestra barra de progreso durante el procesamiento
3. Los errores incluyen sugerencias de solución
4. No se rompe el funcionamiento existente
5. Las pruebas existentes pasan