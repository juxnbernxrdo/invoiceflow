# InvoiceFlow

**InvoiceFlow** es una herramienta de terminal que transforma archivos de facturación electrónica ecuatoriana de Excel, convirtiendo archivos de 26 columnas en un formato limpio de 12 columnas listo para análisis y reporte.

## Descripción general

La herramienta toma como entrada archivos Excel con datos crudos de facturación electrónica (formato de exportación del SRI u otros sistemas) y genera un archivo de salida simplificado que contiene únicamente las columnas relevantes para análisis de compras y retenciones.

### Formatos soportados

| Formato | Entrada | Salida |
|---------|---------|--------|
| `.xls` (Excel 97-2003) | Sí (formato principal) | No |
| `.xlsx` (Excel 2007+) | Sí | Siempre |

## Transformación de datos

La transformación convierte un archivo de entrada con **26 columnas** en uno de salida con **12 columnas**. A continuación se detalla cada operación:

### Columnas eliminadas (15)

Estas columnas se eliminan del archivo de salida porque contienen datos auxiliares, cálculos intermedios o metadatos del comprobante que no son necesarios para el análisis de compras:

| Columna | Descripción | Motivo de eliminación |
|---------|-------------|----------------------|
| `tpcomproba` | Tipo de comprobante | Dato auxiliar del comprobante |
| `numautori` | Número de autorización | Dato técnico del SRI |
| `fecautori` | Fecha de autorización | Dato técnico del SRI |
| `placa` | Placa vehicular | Dato auxiliar (solo transporte) |
| `nro_item` | Número de ítem | Dato de detalle, no requerido |
| `codprincipal` | Código principal del producto | Código interno del producto |
| `codauxiliar` | Código auxiliar del producto | Código interno del producto |
| `cantidad` | Cantidad | Dato de detalle del ítem |
| `precio_u` | Precio unitario | Dato de detalle del ítem |
| `descuento` | Descuento | Dato de detalle del ítem |
| `poriva` | Porcentaje de IVA | Siempre 15%, dato redundante |
| `base0` | Base tarifa 0% | Se usa para calcular BASE CERO, luego se elimina |
| `valice` | Valor ICE | Se usa para calcular BASE CERO, luego se elimina |
| `exento` | Exento de IVA | Se usa para calcular BASE CERO, luego se elimina |
| `noobjiva` | No objeto de IVA | Se usa para calcular BASE CERO, luego se elimina |

### Columnas renombradas (10)

Los nombres técnicos de las columnas de entrada se reemplazan por nombres legibles en español:

| Nombre original | Nombre nuevo |
|-----------------|--------------|
| `idrecep` | `ID RECEPTOR` |
| `secuenciales` | `SECUENCIAL ` |
| `ruc_emisor` | `RUC EMISOR` |
| `razonsocial` | `RAZÓN SOCIAL` |
| `fechaemi` | `FECHA EMISIÓN` |
| `claveacceso` | `CLAVE ACCESO` |
| `descripcion` | `DESCRIPCIÓN` |
| `baseimp` | `BASE  IVA` |
| `valiva` | `IVA` |
| `precio_t` | `TOTAL` |

### Columnas creadas (1)

| Columna | Valor por defecto | Descripción |
|---------|-------------------|-------------|
| `TIPO GASTO` | `EMPRESARIAL` | Se inserta después de `DESCRIPCIÓN`. Se puede personalizar con `--tipo-gasto`. |

### Columnas calculadas (1)

| Columna | Fórmula | Descripción |
|---------|---------|-------------|
| `BASE CERO` | `base0 + valice + exento + noobjiva` | Suma de las columnas de tarifa 0%. Se posiciona antes de `BASE  IVA`. |

> **Nota:** El valor original de la columna `irbpnr` del archivo de entrada no se utiliza. `BASE CERO` se recalcula exclusivamente a partir de las cuatro columnas indicadas.

### Resumen de columnas de salida (12)

| # | Columna | Origen |
|---|---------|--------|
| 1 | `ID RECEPTOR` | Renombrada de `idrecep` |
| 2 | `SECUENCIAL ` | Renombrada de `secuenciales` |
| 3 | `RUC EMISOR` | Renombrada de `ruc_emisor` |
| 4 | `RAZÓN SOCIAL` | Renombrada de `razonsocial` |
| 5 | `FECHA EMISIÓN` | Renombrada de `fechaemi` |
| 6 | `CLAVE ACCESO` | Renombrada de `claveacceso` |
| 7 | `DESCRIPCIÓN` | Renombrada de `descripcion` |
| 8 | `TIPO GASTO` | Creada (configurable con `--tipo-gasto`, default: `EMPRESARIAL`) |
| 9 | `BASE CERO` | Calculada: `base0 + valice + exento + noobjiva` |
| 10 | `BASE  IVA` | Renombrada de `baseimp` |
| 11 | `IVA` | Renombrada de `valiva` |
| 12 | `TOTAL` | Renombrada de `precio_t` |

## Flujo del proceso

```
Archivo de entrada (.xls o .xlsx)
        │
        ▼
┌─────────────────────────┐
│  1. Lectura del archivo │  ExcelJS lee el archivo
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  2. Detección de        │  Identifica columnas por nombre
│     columnas            │  técnico (fila 1)
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  3. Eliminación de      │  Remueve 15 columnas auxiliares
│     columnas            │  e intermedias
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  4. Renombrado de       │  Reemplaza nombres técnicos por
│     encabezados         │  nombres legibles
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  5. Creación de         │  Inserta TIPO GASTO (configurable)
│     TIPO GASTO          │
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  6. Cálculo de          │  Suma base0 + valice + exento
│     BASE CERO           │  + noobjiva
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  7. Traducción de       │  Ajusta fórmulas para apuntar
│     fórmulas            │  a nuevas posiciones de columnas
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  8. Formateo de         │  Encabezados en negrita, auto-
│     salida              │  filtros, freeze pane, anchos
└─────────────────────────┘         dinámicos
        │
        ▼
┌─────────────────────────┐
│  9. Limpieza de         │  Elimina estilos residuales,
│     estilos             │  formatos condicionales y metadatos
└─────────────────────────┘
        │
        ▼
Archivo de salida (.xlsx)
```

### Manejo de archivos `.xls`

Los archivos en formato `.xls` (Excel 97-2003) se convierten internamente a `.xlsx` antes de procesarlos utilizando la librería SheetJS. La conversión es transparente para el usuario y el archivo de salida siempre se genera en formato `.xlsx`.

## Instalación

### Requisitos previos

- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior

### Instalación global

```bash
npm install -g invoiceflow-cli
```

### Instalación local

```bash
npm install invoiceflow-cli
```

## Uso

### Modo argumento

```bash
invo [opciones] [archivos...]
```

#### Opciones

| Opción | Descripción | Default |
|--------|-------------|---------|
| `--tipo-gasto <valor>` | Valor para la columna TIPO GASTO en la salida | `EMPRESARIAL` |
| `-V, --version` | Mostrar versión | |
| `-h, --help` | Mostrar ayuda | |

#### Ejemplos

```bash
# Procesar un archivo (TIPO GASTO = EMPRESARIAL por defecto)
invo facturas_junio.xls

# Procesar con TIPO GASTO personalizado
invo --tipo-gasto PERSONAL facturas_junio.xls

# Procesar múltiples archivos
invo enero.xls febrero.xls marzo.xlsx
```

### Modo interactivo

Ejecutar sin argumentos para entrar al modo interactivo:

```bash
invo
```

En el modo interactivo:

1. Se muestra el banner de InvoiceFlow.
2. Escribir `@` para abrir el selector de archivos Excel disponibles en el directorio actual.
3. Seleccionar archivos con la barra espaciadora y confirmar con Enter.
4. Seleccionar el **Tipo de gasto** (EMPRESARIAL o PERSONAL).
5. Los archivos seleccionados se insertan automáticamente en la línea de comandos.
6. Presionar Enter para procesar.

> **Nota:** Si se elimina el carácter `@` del campo de entrada (con Backspace o Delete), el selector se cierra automáticamente. El tipo de gasto también se solicita al procesar archivos escritos manualmente (sin `@`), siempre que no se haya proporcionado la opción `--tipo-gasto`.

### Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `@` | Buscar y seleccionar archivos Excel |
| `@ruta` | Abrir un archivo específico por ruta |
| `/web` | Iniciar el cliente web en `http://localhost:3000` |
| `/quit`, `exit`, `quit` | Salir de la CLI |

## Cliente web

InvoiceFlow incluye un cliente web que comparte el mismo motor de procesamiento que la CLI. Para iniciarlo:

```bash
# Desde la CLI interactiva
invo
> /web

# O directamente
npm run start:web
```

El servidor se inicia en `http://localhost:3000` y ofrece:

- **Subida de archivos**: arrastrar y soltar o seleccionar archivos `.xls` / `.xlsx`
- **Selector de tipo de gasto**: EMPRESARIAL o PERSONAL
- **Procesamiento**: un solo clic para procesar todos los archivos subidos
- **Descarga**: descargar archivos procesados directamente desde el navegador

### API REST

El cliente web se comunica con una API REST:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/files` | Subir archivos (multipart/form-data) |
| `GET` | `/api/files` | Listar archivos subidos |
| `GET` | `/api/files/:id` | Obtener estado de un archivo |
| `DELETE` | `/api/files/:id` | Eliminar un archivo |
| `POST` | `/api/files/process` | Procesar archivos pendientes |
| `GET` | `/api/files/:id/download` | Descargar archivo procesado |

## Resultado de la transformación

La CLI genera un archivo de salida en el mismo directorio que el archivo de entrada. Al procesar, se solicita interactivamente el nombre del archivo de salida (por defecto `FACTURAS ELECTRÓNICAS.xlsx`).

### Formato del archivo de salida

El archivo de salida se genera con formato profesional:

- **Encabezados**: texto en negrita (Arial 12), centrado, con ajuste de línea
- **Filtros automáticos**: habilitados en todas las columnas
- **Paneles congelados**: fila de encabezado fija (freeze pane en fila 2)
- **Ancho de columna**: calculado dinámicamente según el contenido más largo (mín. 8, máx. 50 / 80 para texto)
- **Altura de fila**: se ajusta automáticamente cuando el texto requiere varias líneas
- **Formato de números**: columnas monetarias con formato `#,##0.00`
- **Formato de fechas**: columna FECHA EMISIÓN con formato `mm-dd-yy`
- **Estilos limpios**: sin colores residuales, formatos condicionales ni metadatos

### Ejemplo de salida

| ID RECEPTOR | SECUENCIAL | RUC EMISOR | RAZÓN SOCIAL | FECHA EMISIÓN | CLAVE ACCESO | DESCRIPCIÓN | TIPO GASTO | BASE CERO | BASE IVA | IVA | TOTAL |
|-------------|------------|------------|--------------|---------------|--------------|-------------|------------|-----------|----------|-----|-------|
| 1003559844001 | 005-002-000150138 | 1791280792001 | EMPRESA S.A. | 02-01-26 | 01022026011791... | PRODUCTO X | EMPRESARIAL | 0.00 | 8.70 | 1.30 | 10.00 |

## Scripts de desarrollo

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Compilar TypeScript (CLI + servidor) |
| `npm run build:web` | Compilar cliente web (Vite) |
| `npm run build:all` | Compilar todo (CLI + servidor + web) |
| `npm run dev:web` | Desarrollo del cliente web con hot reload |
| `npm run start:web` | Iniciar servidor web en producción |
| `npm run clean` | Limpiar archivos compilados |
| `npm run rebuild` | Limpiar y compilar todo |

## Dependencias

### Dependencias de producción

| Paquete | Versión | Uso |
|---------|---------|-----|
| `exceljs` | ^4.4.0 | Lectura y escritura de archivos Excel |
| `xlsx` | ^0.18.5 | Conversión de formato `.xls` a `.xlsx` |
| `chalk` | ^4.1.2 | Formato de texto en terminal |
| `cli-progress` | ^3.12.0 | Barra de progreso |
| `commander` | ^15.0.0 | Parsing de argumentos de línea de comandos |
| `prompts` | ^2.4.2 | Selector interactivo de archivos |
| `express` | ^5.2.1 | Servidor web para la API y el cliente |
| `multer` | ^2.2.0 | Subida de archivos HTTP |
| `react` | ^19.2.7 | Interfaz web |
| `react-dom` | ^19.2.7 | Renderizado web |
| `zustand` | ^5.0.14 | Estado global del cliente web |
| `lucide-react` | ^1.23.0 | Iconografía consistente |
| `uuid` | ^14.0.1 | Generación de IDs únicos |

### Dependencias de desarrollo

| Paquete | Versión | Uso |
|---------|---------|-----|
| `typescript` | ^6.0.3 | Compilador TypeScript |
| `ts-node` | ^10.9.2 | Ejecución directa de TypeScript |
| `vite` | ^8.1.3 | Build tool para el cliente web |
| `@vitejs/plugin-react` | ^6.0.3 | Plugin React para Vite |
| `@types/node` | ^26.1.0 | Tipos de Node.js |
| `@types/express` | ^5.0.6 | Tipos de Express |
| `@types/multer` | ^2.2.0 | Tipos de Multer |
| `@types/react` | ^19.2.17 | Tipos de React |
| `@types/react-dom` | ^19.2.3 | Tipos de React DOM |
| `@types/uuid` | ^10.0.0 | Tipos de UUID |
| `@types/cli-progress` | ^3.11.6 | Tipos de cli-progress |
| `@types/prompts` | ^2.4.9 | Tipos de prompts |

## Estructura del proyecto

```
invoiceflow-cli/
├── src/
│   ├── index.ts              # Punto de entrada
│   ├── cli.ts                # Lógica de la CLI
│   ├── transformer.ts        # Transformación de Excel
│   ├── core/
│   │   ├── index.ts          # Exportaciones compartidas
│   │   ├── types.ts          # Tipos compartidos
│   │   └── processor.ts      # Orquestador de procesamiento
│   ├── server/
│   │   ├── index.ts          # Servidor Express
│   │   ├── store.ts          # Almacén de sesiones
│   │   └── routes/
│   │       └── files.ts      # Rutas de la API
│   ├── web/
│   │   ├── index.html        # HTML de entrada
│   │   ├── main.tsx          # Montaje de React
│   │   ├── App.tsx           # Componente raíz
│   │   ├── api.ts            # Cliente HTTP
│   │   ├── store.ts          # Estado global (Zustand)
│   │   └── components/
│   │       ├── Header.tsx    # Barra de navegación
│   │       ├── FileZone.tsx  # Zona de arrastre
│   │       ├── TipoGastoSelect.tsx  # Selector de tipo
│   │       ├── FileCard.tsx  # Tarjeta de archivo
│   │       ├── ProcessButton.tsx    # Botón de proceso
│   │       └── ResultPanel.tsx      # Panel de resultados
│   └── utils/
│       ├── colors.ts         # Clasificador de colores
│       ├── formulas.ts       # Traducción de fórmulas
│       ├── gradient.ts       # Utilidades de gradiente
│       └── paths.ts          # Validación de rutas
├── dist/                     # Código compilado
├── vite.config.ts            # Configuración de Vite
├── package.json
├── tsconfig.json
└── README.md
```

## Compatibilidad

| Sistema Operativo | Arquitectura | Estado |
|-------------------|--------------|--------|
| Linux | x64 | Compatible |
| Linux | arm64 | Compatible |
| macOS | x64 | Compatible |
| macOS | arm64 (Apple Silicon) | Compatible |
| Windows | x64 | Compatible |

## Limitaciones conocidas

- Los nombres de columna de salida incluyen espacios finales (`SECUENCIAL `, doble espacio en `BASE  IVA`) para mantener compatibilidad con formatos existentes.
- El valor original de `irbpnr` del archivo de entrada no se conserva; `BASE CERO` se recalcula desde cero.
- La conversión de `.xls` a `.xlsx` puede generar advertencias internas que son suprimidas por la herramienta.
- La columna `TIPO GASTO` se asigna con un valor único para todas las filas. Para clasificaciones mixtas (personal/empresarial), se recomienda ajustar manualmente después de la transformación.

## Licencia

ISC

## Autor

InvoiceFlow
