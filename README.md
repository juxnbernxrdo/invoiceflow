# InvoiceFlow

**InvoiceFlow** es una herramienta de terminal y cliente web que transforma archivos de facturación electrónica ecuatoriana en formato Excel. Soporta dos módulos: **Facturas** (26 columnas → 12 columnas) y **Retenciones** (40 columnas → 7 columnas). Compatible con archivos `.xls` y `.xlsx`, ofrece dos interfaces: CLI interactiva y cliente web con arrastre de archivos.

## Características

- **Dos módulos**: Facturas (26→12 columnas) y Retenciones (40→7 columnas)
- **Dos interfaces**: CLI interactiva (terminal) y cliente web (navegador)
- **Archivos `.xls` y `.xlsx`**: los archivos `.xls` se convierten internamente a `.xlsx`
- **Modo interactivo**: selector de archivos con `@`, comandos `/facturas`, `/retenciones`, `/web`
- **Formato profesional de salida**: encabezados en negrita, filtros automáticos, paneles congelados, anchos dinámicos, formato monetario y de fechas
- **API REST**: el cliente web se comunica con endpoints Express para subir, procesar y descargar archivos

## Instalación

### Requisitos previos

- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior

### Instalación global

```bash
npm install -g invoiceflow-cli
```

### Instalación local (desarrollo)

```bash
git clone <repo-url>
npm install
npm run build
```

### Verificación

```bash
invo --version
# InvoiceFlow version 1.2.0
```

## Uso

### CLI — Modo interactivo

Sin argumentos, `invo` inicia el modo interactivo con un banner ASCII y prompt:

```bash
invo
```

```
╔════════════════════════════════════════════════════════════╗
║   ██╗███╗   ██╗██╗   ██╗ ██████╗ ██╗ ██████╗███████╗       ║
║   ██║████╗  ██║██║   ██║██╔═══██╗██║██╔════╝██╔════╝       ║
║   ██║██╔██╗ ██║██║   ██║██║   ██║██║██║     █████╗         ║
║   ██║██║╚██╗██║╚██╗ ██╔╝██║   ██║██║██║     ██╔══╝         ║
║   ██║██║ ╚████║ ╚████╔╝ ╚██████╔╝██║╚██████╗███████╗       ║
║   ╚═╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝ ╚═╝ ╚═════╝╚══════╝       ║
║                       InvoiceFlow                          ║
╚════════════════════════════════════════════════════════════╝

Escribe @ para seleccionar archivos Excel

  @            Buscar archivos
  @ruta        Abrir archivo específico
  /web         Iniciar cliente web
  /quit        Salir
> _
```

#### Selector `@`

Escribe `@` en el prompt para abrir el selector interactivo de archivos Excel en el directorio actual. Selecciona archivos con la barra espaciadora y confirma con Enter. También puedes escribir `@ruta` para abrir un archivo específico directamente.

Si eliminas el `@` con Backspace o Delete, el selector se cierra automáticamente.

#### Comandos

| Comando | Descripción |
|---------|-------------|
| `@` | Abrir selector de archivos Excel |
| `@ruta` | Abrir archivo por ruta específica |
| `/facturas` | Procesar archivos como facturas (26→12 columnas) |
| `/retenciones` | Procesar archivos como retenciones (40→7 columnas) |
| `/web` | Iniciar el cliente web en `http://localhost:3000` |
| `/help` | Mostrar ayuda y comandos disponibles |
| `/version` | Mostrar versión |
| `/exit` | Salir de la CLI |

#### Flujo de procesamiento (modo interactivo)

1. Escribe `@` para seleccionar archivos, o escribe la ruta de un archivo directamente
2. Presiona Enter para confirmar
3. Selecciona el **Tipo de gasto** (`EMPRESARIAL` o `PERSONAL`) cuando se solicite
4. Ingresa el **nombre del archivo de salida** (se sugiere automáticamente)
5. Los archivos se procesan y el resultado se guarda en el mismo directorio

### CLI — Modo argumentos

Pasa archivos directamente como argumentos. **Siempre se solicita el tipo de gasto y el nombre de salida**, sin importar el modo.

```bash
invo facturas.xlsx
invo enero.xlsx febrero.xlsx marzo.xlsx
invo --tipo-gasto PERSONAL reportes.xlsx
```

#### Opciones

| Opción | Descripción |
|--------|-------------|
| `--tipo-gasto <valor>` | Valor para la columna `TIPO GASTO`: `EMPRESARIAL` (default) o `PERSONAL` |
| `-V, --version` | Mostrar versión |
| `-h, --help` | Mostrar ayuda |

#### Ejemplos

```bash
# Procesar un archivo (siempre solicita tipo de gasto y nombre de salida)
invo facturas.xlsx

# Especificar tipo de gasto
invo --tipo-gasto PERSONAL gastos_mensuales.xlsx

# Procesar múltiples archivos (solicita salida para cada uno)
invo enero.xlsx febrero.xlsx marzo.xlsx

# Usar ruta específica
invo ./carpeta/facturas_junio.xls
```

### Cliente web

El cliente web permite procesar archivos desde el navegador con una interfaz visual.

#### Iniciar

```bash
# Desde la CLI interactiva
invo
> /web

# Directamente (después de npm run build)
npm run start:web
```

Accede a `http://localhost:3000`.

#### Funcionalidades

- **Selector de módulo**: elegir entre Facturas o Retenciones antes de procesar
- **Arrastre de archivos**: arrastrar y soltar o seleccionar archivos `.xls` / `.xlsx` (hasta 20 archivos)
- **Selector de tipo de gasto**: elegir `EMPRESARIAL` o `PERSONAL` antes de procesar (solo módulo Facturas)
- **Nombre de salida personalizado**: cada archivo puede tener un nombre de salida diferente
- **Procesar todos**: un clic para procesar todos los archivos subidos
- **Descarga individual**: cada archivo procesado se puede descargar por separado
- **Descarga masiva**: un clic para descargar todos los resultados como archivos separados
- **Estado vacío**: pantalla de inicio cuando no hay archivos

## Arquitectura

### CLI — Flujo de datos

```mermaid
flowchart TD
    A["`invo <archivo>`"] --> B{"¿Modo interactivo?"}
    B -->|Sí| C["`@` selector → selecciona archivos"]
    B -->|No| D["Archivos pasados como argumentos"]
    C --> E["Prompt: Tipo de gasto"]
    D --> E
    E --> F["Prompt: Nombre de salida"]
    F --> G["ExcelTransformer.transform"]
    G --> H["Lectura: .xls → .xlsx si es necesario"]
    H --> I["Eliminación de 15 columnas"]
    I --> J["Renombrado de 10 columnas"]
    J --> K["Inserción: TIPO GASTO"]
    K --> L["Cálculo: BASE CERO"]
    L --> M["Formateo de salida"]
    M --> N["Archivo .xlsx en directorio de entrada"]
```

### Cliente web — Arquitectura

```mermaid
flowchart LR
    A["`**Cliente Web**
    React + Zustand
    http://localhost:3000"] --> B["`**Express API**
    POST /api/files
    GET /api/files
    DELETE /api/files/:id
    POST /api/files/process
    GET /api/files/:id/download"]
    B --> C["`**Procesador**
    ExcelTransformer
    Same engine as CLI"]
    C --> D["`**Store (memoria)**
    FileJob[]
    tempPaths"]
```

### Flujo de transformación

```mermaid
flowchart TD
    subgraph Entrada
        A["**26 columnas originales**
        SRI / sistema contable"]
    end
    A --> B["Eliminar 15 columnas
    auxiliares e intermedias"]
    B --> C["Renombrar 10 columnas
    (nombres técnicos → español)"]
    C --> D["Insertar TIPO GASTO
    (EMPRESARIAL / PERSONAL)"]
    D --> E["Calcular BASE CERO
    base0 + valice + exento + noobjiva"]
    E --> F["Formatear y limpiar estilos"]
    F --> G["**12 columnas de salida**"]
```

## Flujo de procesamiento

El motor de transformación procesa cada archivo en 8 pasos:

```
1. Lectura          → ExcelJS lee el archivo; .xls se convierte a .xlsx con SheetJS
2. Detección        → Identifica columnas por nombre técnico (fila 1) y color
3. Eliminación      → Remueve 15 columnas: tpcomproba, numautori, fecautori, placa,
                      nro_item, codprincipal, codauxiliar, cantidad, precio_u,
                      descuento, poriva, base0, valice, exento, noobjiva
4. Renombrado       → Reemplaza 10 nombres técnicos por nombres legibles
5. Inserción        → Inserta TIPO GASTO (configurable) después de DESCRIPCIÓN
6. Cálculo          → Suma base0 + valice + exento + noobjiva → BASE CERO
7. Formateo         → Negrita en encabezados, autofiltro, freeze pane, anchos dinámicos
8. Limpieza         → Elimina estilos residuales y formatos condicionales
```

### Columnas eliminadas (15)

| Columna técnica | Descripción |
|-----------------|-------------|
| `tpcomproba` | Tipo de comprobante |
| `numautori` | Número de autorización SRI |
| `fecautori` | Fecha de autorización SRI |
| `placa` | Placa vehicular |
| `nro_item` | Número de ítem |
| `codprincipal` | Código principal del producto |
| `codauxiliar` | Código auxiliar del producto |
| `cantidad` | Cantidad |
| `precio_u` | Precio unitario |
| `descuento` | Descuento |
| `poriva` | Porcentaje IVA (siempre 15%) |
| `base0` | Base tarifa 0% (usada en cálculo, luego eliminada) |
| `valice` | Valor ICE (usado en cálculo, luego eliminado) |
| `exento` | Exento de IVA (usado en cálculo, luego eliminado) |
| `noobjiva` | No objeto de IVA (usado en cálculo, luego eliminado) |

### Columnas renombradas (10)

| Nombre original | Nombre de salida |
|-----------------|------------------|
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

### Columnas calculadas (1)

| Columna | Fórmula | Descripción |
|---------|---------|-------------|
| `BASE CERO` | `base0 + valice + exento + noobjiva` | Suma de las columnas de tarifa 0%. Se posiciona antes de `BASE  IVA`. |

### Columna insertada (1)

| Columna | Valor por defecto | Descripción |
|---------|-------------------|-------------|
| `TIPO GASTO` | `EMPRESARIAL` | Insertada después de `DESCRIPCIÓN`. Configurable con `--tipo-gasto` o desde el selector interactivo. |

### Resumen: 12 columnas de salida

| # | Columna | Origen |
|---|---------|--------|
| 1 | `ID RECEPTOR` | Renombrada de `idrecep` |
| 2 | `SECUENCIAL ` | Renombrada de `secuenciales` |
| 3 | `RUC EMISOR` | Renombrada de `ruc_emisor` |
| 4 | `RAZÓN SOCIAL` | Renombrada de `razonsocial` |
| 5 | `FECHA EMISIÓN` | Renombrada de `fechaemi` |
| 6 | `CLAVE ACCESO` | Renombrada de `claveacceso` |
| 7 | `DESCRIPCIÓN` | Renombrada de `descripcion` |
| 8 | `TIPO GASTO` | Insertada (default: `EMPRESARIAL`) |
| 9 | `BASE CERO` | Calculada: `base0 + valice + exento + noobjiva` |
| 10 | `BASE  IVA` | Renombrada de `baseimp` |
| 11 | `IVA` | Renombrada de `valiva` |
| 12 | `TOTAL` | Renombrada de `precio_t` |

### Formato del archivo de salida

- **Encabezados**: Arial 12, negrita, centrados, con ajuste de línea
- **Filtros automáticos**: habilitados en todas las columnas
- **Paneles congelados**: fila de encabezado fija (freeze pane en fila 2)
- **Ancho de columna**: calculado dinámicamente (mín. 8, máx. 50 / 80 para texto)
- **Formato numérico**: columnas monetarias con formato `#,##0.00`
- **Formato de fechas**: columna FECHA EMISIÓN con formato `mm-dd-yy`
- **Estilos limpios**: sin colores residuales, formatos condicionales ni metadatos

## Estructura del proyecto

```
invoiceflow-cli/
├── src/
│   ├── index.ts                 # Punto de entrada (ejecuta run() desde cli/)
│   ├── cli/
│   │   ├── index.ts             # Commander + dispatch de comandos
│   │   ├── interactive.ts       # Modo interactivo (selector @, keypress)
│   │   ├── processor.ts         # Orquestación de procesamiento CLI
│   │   ├── progress.ts          # Barra de progreso (cli-progress)
│   │   ├── prompts.ts           # Prompts: tipo gasto, nombre de salida
│   │   └── registry.ts          # Registro de comandos (/facturas, /retenciones, /web)
│   ├── core/
│   │   ├── types.ts             # Tipos compartidos (TransformOptions, TransformStats, etc.)
│   │   ├── processor.ts         # Orquestador: processFile, processFiles, genera IDs
│   │   ├── modules.ts           # Definición de módulos (facturas, retenciones)
│   │   ├── column-detector.ts   # Detección de columnas por nombre y color
│   │   ├── semantic-rules.ts    # Reglas de transformación (eliminación, renombrado)
│   │   ├── excel-formatter.ts   # Formateo de salida (anchos, filtros, estilos)
│   │   └── style-cleaner.ts     # Limpieza de estilos via JSZip
│   ├── modules/
│   │   └── retenciones/
│   │       ├── index.ts         # Re-exports
│   │       ├── domain/
│   │       │   ├── retencion.entity.ts   # Entidad Retencion
│   │       │   └── retencion.types.ts    # Tipos del dominio
│   │       ├── mappers/
│   │       │   └── excel-retencion.mapper.ts  # Mapeo Excel → entidad
│   │       └── use-cases/
│   │           └── transform-retenciones.ts   # Caso de uso principal
│   ├── server/
│   │   ├── index.ts             # Express app factory (createApp)
│   │   ├── store.ts             # SessionStore interfaz + InMemoryStore
│   │   └── routes/
│   │       └── files.ts         # Rutas API: upload, list, delete, process, download
│   ├── transformer.ts           # Orquestador de transformación
│   ├── utils/
│   │   ├── colors.ts            # Clasificador de colores (ARGB → HSL)
│   │   ├── formulas.ts          # Traducción de fórmulas Excel
│   │   ├── id.ts                # generateId() unificado
│   │   └── paths.ts             # Validación y limpieza de rutas
│   ├── types/
│   │   └── cli-progress.d.ts    # Declaraciones de tipos para cli-progress
│   └── web/
│       ├── index.html           # HTML de entrada (Vite)
│       ├── main.tsx             # Montaje React
│       ├── App.tsx              # Componente raíz
│       ├── index.css            # Estilos (Tailwind CSS 4)
│       ├── api.ts               # Cliente HTTP (fetch al backend)
│       ├── store.ts             # Estado global Zustand
│       └── components/
│           ├── Header.tsx       # Barra de navegación
│           ├── ModuleSelector.tsx  # Selector de módulo (Facturas/Retenciones)
│           ├── FileZone.tsx     # Zona de arrastre
│           ├── TipoGastoSelect.tsx  # Selector gasto
│           ├── FileCard.tsx     # Tarjeta por archivo
│           ├── ProcessButton.tsx    # Botón "Procesar todos"
│           └── ResultPanel.tsx      # Panel de resultados
├── tests/                       # Tests (vitest)
│   └── core/
│       ├── transformer.test.ts  # Tests del motor de transformación
│       ├── processor.test.ts    # Tests del orquestador
│       ├── retenciones.test.ts  # Tests del módulo retenciones
│       └── retenciones-name.test.ts  # Tests de detección dinámica de hojas
├── specs/                       # Especificaciones SDD (GitHub Spec Kit)
│   ├── 00-platform-vision/
│   ├── 01-core-module/
│   ├── 02-facturas-module/
│   ├── 03-plugin-architecture.md
│   └── migration/
├── dist/                        # Código compilado (TypeScript + Vite)
│   ├── web/                     # Cliente web compilado (Vite)
│   └── ...                      # CLI + servidor compilados
├── vite.config.ts               # Configuración Vite
├── vitest.config.ts             # Configuración Vitest
├── tsconfig.json
└── package.json
```

## API REST

El servidor Express expone los siguientes endpoints cuando se inicia el cliente web:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/files` | Subir archivos (multipart/form-data, hasta 20 archivos, 50 MB c/u). Acepta `tipoGasto` y `moduleId` en el body. |
| `GET` | `/api/files` | Listar todos los archivos subidos con su estado (`pending`, `processing`, `done`, `error`). |
| `GET` | `/api/files/:id` | Obtener detalle de un archivo específico. |
| `DELETE` | `/api/files/:id` | Eliminar un archivo y su archivo temporal del disco. |
| `POST` | `/api/files/process` | Procesar todos los archivos con estado `pending`. Body: `{ tipoGasto, outputNames, moduleId }`. |
| `GET` | `/api/files/:id/download` | Descargar el archivo procesado. Devuelve el `.xlsx` con el nombre de salida configurado. |

### Estados de un archivo

| Estado | Descripción |
|--------|-------------|
| `pending` | Archivo subido, a la espera de procesamiento |
| `processing` | Actualmente siendo transformado |
| `done` | Procesado correctamente, listo para descarga |
| `error` | Falló durante la transformación |

## Configuración y scripts

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Compilar TypeScript (CLI + servidor) y hacer ejecutable `dist/index.js` |
| `npm run build:web` | Compilar cliente web con Vite (salida en `dist/web/`) |
| `npm run build:all` | Compilar todo (CLI + servidor + web) |
| `npm run dev:web` | Desarrollo web con hot reload (Vite) |
| `npm run start:web` | Iniciar servidor web en producción (después de `npm run build:all`) |
| `npm run clean` | Eliminar `dist/` |
| `npm run rebuild` | Limpiar y recompilar todo |

### Instalación como comando global

Después de `npm install -g invoiceflow-cli`, el comando `invo` queda disponible globalmente en la terminal.

## Desarrollo

### Setup local

```bash
git clone <repo-url>
npm install
npm run build
```

### Ejecución durante desarrollo

```bash
# CLI con ts-node (sin compilar)
npm start

# Cliente web con hot reload
npm run dev:web

# Compilar cambios en CLI/servidor
npm run build
```

### Build para producción

```bash
npm run build:all
npm run start:web   # Inicia en http://localhost:3000
```

### Tests

```bash
npm test              # Ejecutar todos los tests (vitest)
npm run test:watch    # Modo watch (re-ejecuta al guardar)
```

Tests cubren el motor de transformación, el orquestador de procesamiento y el módulo de retenciones. Framework: **Vitest** (17 tests, 4 archivos de test).

## Solución de problemas

### "El archivo no se procesa / archivo corrupto"

Los archivos `.xls` (Excel 97-2003) se convierten internamente a `.xlsx`. Si la conversión falla:
1. Abre el archivo en Excel y guárdalo nuevamente como `.xlsx`
2. Verifica que el archivo no esté protegido con contraseña

### "Error: Solo se permiten archivos .xlsx o .xls"

El cliente web solo acepta archivos con extensión `.xlsx` o `.xls`. Verifica que el archivo sea un Excel válido y no un CSV u otro formato.

### "No se encontraron archivos Excel"

En modo interactivo, `@` solo busca archivos `.xlsx` y `.xls` en el directorio actual (no en subdirectórios, excepto `node_modules`, `.git` y `dist`).

### "Error de permiso" al guardar

El archivo de salida se guarda en el mismo directorio del archivo de entrada. Verifica que tengas permisos de escritura en esa carpeta.

### "El navegador no se abre automáticamente" (comando `/web`)

El comando `/web` intenta abrir el navegador según la plataforma (`open` en macOS, `start` en Windows, `xdg-open` en Linux). Si falla, abre manualmente `http://localhost:3000`.

### "Archivo demasiado grande"

El cliente web limita cada archivo a 50 MB. Para archivos mayores, usa la CLI directamente.

### El archivo de salida tiene estilos o colores inesperados

InvoiceFlow limpia estilos residuales del archivo de entrada, pero algunos formatos muy complejos (hojas protegidas, macros) pueden generar conflictos. Intenta guardar el archivo de entrada como `.xlsx` limpio antes de procesarlo.

## Roadmap

- [x] **Tests automatizados** — Vitest con cobertura de transformación, procesamiento y retenciones
- [x] **Módulo retenciones** — Transformación de retenciones (40→7 columnas)
- [x] **Cliente web con módulos** — Selector de módulo, Tailwind CSS 4, Zustand
- [x] **Nombres de salida personalizados** — Cada archivo puede tener un nombre de salida diferente
- [ ] **Modo batch** — Procesar carpetas completas con patrón de archivos
- [ ] **Historial de procesamiento** — Guardar registro de archivos transformados
- [ ] **CLI pipe** — Encadenar transformaciones con `|` entre comandos
- [ ] **Exportación CSV** — Soporte para exportar a CSV además de `.xlsx`
- [ ] **Multi-idioma** — Soporte para inglés además de español
- [ ] **Configuración persistida** — Guardar preferencia de `tipo-gasto` default
- [ ] **Progreso en web** — Barra de progreso visual durante el procesamiento

## Compatibilidad

InvoiceFlow funciona en las siguientes plataformas:

| Plataforma | Estado |
|------------|--------|
| Linux (x64, arm64) | ✅ Completamente soportado |
| macOS (x64, arm64) | ✅ Completamente soportado |
| Windows (x64, arm64) | ✅ Completamente soportado |

**Requisitos:** Node.js >= 18.0.0

**Notas por plataforma:**
- **Linux**: Se usa `xdg-open` para abrir el navegador
- **macOS**: Se usa `open` para abrir el navegador
- **Windows**: Se usa `start` para abrir el navegador. El comando `chmod` en `postinstall` se ejecuta con `|| true` para compatibilidad

## Limitaciones conocidas

- El cliente web limita cada archivo a 50 MB (para archivos mayores, usa la CLI directamente)
- Los archivos `.xls` (Excel 97-2003) se convierten internamente a `.xlsx` — si la conversión falla, guarda el archivo como `.xlsx` manualmente
- Algunos formatos Excel muy complejos (hojas protegidas, macros) pueden generar conflictos en los estilos de salida
- El procesamiento es secuencial (no se procesan archivos en paralelo)

## Licencia

ISC