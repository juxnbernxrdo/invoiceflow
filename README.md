# InvoiceFlow CLI

**InvoiceFlow CLI** es una herramienta de terminal y cliente web que transforma archivos de facturación electrónica ecuatoriana en formato Excel. Soporta dos módulos: **Facturas** (26 columnas → 12 columnas) y **Retenciones** (40 columnas → 7 columnas). Compatible con archivos `.xls` y `.xlsx`, ofrece dos interfaces: CLI interactiva con paleta de comandos y cliente web con arrastre de archivos.

## Características

- **Dos módulos**: Facturas (26→12 columnas) y Retenciones (40→7 columnas)
- **Dos interfaces**: CLI interactiva (terminal) y cliente web (navegador)
- **Archivos `.xls` y `.xlsx`**: los archivos `.xls` se convierten internamente a `.xlsx`
- **Modo interactivo**: paleta de comandos con `/`, selector de archivos con `@`
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
cd invoiceflow-cli
npm install
npm run build:all
```

### Verificación

```bash
invo --version
# 1.2.3
```

## Uso

### CLI — Modo interactivo

Sin argumentos (o con argumentos que no correspondan a comandos conocidos), `invo` inicia el modo interactivo con un banner ASCII y prompt `> `:

```bash
invo
```

```
      ██╗███╗   ██╗██╗   ██╗ ██████╗   InvoiceFlow CLI 1.2.3
      ╚═╝████╗  ██║██║   ██║██╔═══██╗  Excel Processing Platform
      ██╗██╔██╗ ██║██║   ██║██║   ██║  github.com/juxnbernxrdo/invoiceflow
      ██║██║╚██╗██║╚██████╔╝╚██████╔╝  ~
      ╚═╝╚═╝ ╚═══╝ ╚═════╝  ╚═════╝

> _
```

#### Paleta de comandos (`/`)

Escribe `/` en el prompt para abrir la **Paleta de Comandos Interactiva**. Navega con `↑`/`↓`, filtra escribiendo el nombre del comando y confirma con Enter. Pulsa Escape para cancelar.

#### Selector de archivos (`@`)

Escribe `@` en el prompt para abrir el **selector interactivo de archivos Excel** en el directorio actual y subdirectorios directos (excluye `node_modules`, `.git` y `dist`). Selecciona archivos con la barra espaciadora y confirma con Enter.

Si el carácter `@` desaparece de la línea (por Backspace o Delete), el selector se cierra automáticamente.

#### Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `/` | Abrir la Paleta de Comandos Interactiva |
| `@` | Abrir el selector interactivo de archivos Excel |
| `↑`, `↓` | Navegar opciones en la paleta o selector |
| `Espacio` | Seleccionar/deseleccionar un archivo Excel |
| `Enter` | Confirmar selección |
| `Backspace` / `Del` | Cerrar selector si `@` desaparece de la línea |
| `Ctrl + C` | Salir de la aplicación |

#### Comandos disponibles en la paleta

| Comando | Categoría | Descripción |
|---------|-----------|-------------|
| `/facturas` | Procesamiento | Procesa archivos de facturas electrónicas (26→12 columnas). |
| `/retenciones` | Procesamiento | Procesa archivos de retenciones electrónicas (40→7 columnas). |
| `/web` | Interfaz | Inicia el cliente web interactivo en `http://localhost:3000`. |
| `/help` | Sistema | Muestra la ayuda interactiva. Acepta `/help <comando>` para ayuda específica. |
| `/version` | Sistema | Muestra la versión instalada de InvoiceFlow. |
| `/exit` | Sistema | Salir de la aplicación InvoiceFlow. |
| `@archivo.xlsx` | — | Abre el selector de archivos Excel interactivo. |

> **Alias reconocidos**: `/exit` acepta también `exit`, `quit` y `/quit`.

#### Flujo de procesamiento en modo interactivo

1. Escribe `/facturas` o `/retenciones` (o selecciónalos desde la paleta con `/`)
2. Selecciona los archivos Excel con el selector interactivo
3. Si el módulo es **Facturas**, selecciona el **Tipo de gasto** (`EMPRESARIAL` o `PERSONAL`)
4. Ingresa el **nombre del archivo de salida** (se sugiere automáticamente)
5. El archivo se procesa y el resultado se guarda en el mismo directorio del archivo de entrada

También puedes pasar archivos directamente al comando:

```
> /facturas @facturas_junio.xlsx
> /retenciones @retenciones_2026.xls
```

Si escribes archivos Excel sin especificar un comando, la CLI mostrará:

```
⚠ Por favor escribe un comando primero (/facturas o /retenciones) seguido de los archivos.
Ejemplo: /facturas @archivo.xlsx
```

### CLI — Modo argumentos

Pasa el comando y los archivos directamente como argumentos:

```bash
invo /facturas facturas.xlsx
invo /retenciones retenciones_2026.xls
invo /facturas enero.xlsx febrero.xlsx marzo.xlsx
invo /facturas --tipo-gasto PERSONAL gastos.xlsx
invo /facturas --output "Compras Junio 2026.xlsx" facturas.xlsx
```

Si el módulo soporta tipo de gasto y no se pasa `--tipo-gasto`, la CLI lo solicita interactivamente.

#### Opciones

| Opción | Descripción |
|--------|-------------|
| `--tipo-gasto <valor>` | Valor para la columna `TIPO GASTO`: `EMPRESARIAL` (default) o `PERSONAL`. Solo aplica al módulo Facturas. |
| `--output <valor>` | Nombre del archivo de salida (omite el prompt interactivo de nombre). |
| `--debug` | Activa modo debug con logging detallado. |
| `-V, --version` | Mostrar versión. |
| `-h, --help` | Mostrar ayuda de Commander. |

> **Nota**: `invo /web` iniciará el servidor web directamente y retornará (sin entrar al modo interactivo).

#### Ejemplos

```bash
# Procesar un archivo de facturas (solicita tipo de gasto y nombre de salida)
invo /facturas facturas_sri.xlsx

# Especificar tipo de gasto y nombre de salida sin prompts
invo /facturas --tipo-gasto PERSONAL --output "Gastos Personales.xlsx" facturas.xlsx

# Procesar múltiples archivos de retenciones
invo /retenciones enero.xls febrero.xls marzo.xls

# Iniciar cliente web directamente
invo /web

# Ver ayuda de un comando específico
invo /help facturas

# Activar logging detallado
invo /facturas --debug facturas.xlsx
```

### Cliente web

El cliente web permite procesar archivos desde el navegador con una interfaz visual.

#### Iniciar

```bash
# Desde la CLI interactiva
invo
> /web

# O directamente desde el terminal
invo /web
```

Accede a `http://localhost:3000`.

#### Funcionalidades

- **Selector de módulo**: elegir entre Facturas o Retenciones antes de procesar
- **Arrastre de archivos**: arrastrar y soltar o seleccionar archivos `.xls` / `.xlsx` (hasta 20 archivos, 50 MB c/u)
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
    A["invo"] --> B{"Hay argumentos de comando"}
    B -->|"/facturas o /retenciones"| D["Archivos pasados como argumentos"]
    B -->|"Sin argumentos o desconocido"| C["Modo interactivo - banner y prompt"]
    C --> C1["Tecla / - Paleta de Comandos"]
    C --> C2["Tecla @ - Selector de archivos Excel"]
    C1 --> E["Selecciona /facturas o /retenciones"]
    C2 --> E
    D --> E
    E --> F["Selector interactivo de archivos si no se pasaron"]
    F --> G["Prompt - Tipo de gasto solo para Facturas"]
    G --> H["Prompt - Nombre de archivo de salida"]
    H --> I["ExcelTransformer o TransformRetencionesUseCase"]
    I --> J["Archivo .xlsx en directorio de entrada"]
```

### Cliente web — Arquitectura

```mermaid
flowchart TD
    subgraph Server["Express Server - WebServerManager"]
        S1["web-server-manager.ts"] --> S2["express app"]
        S2 --> S3["static assets - dist/web"]
        S2 --> S4["API routes - /api/files"]
    end

    subgraph Client["Web Client - React + Vite"]
        C1["src/web/main.tsx"]
        C2["App.tsx"]
        C3["Zustand store"]
        C4["components"]
        C5["api.ts"]
    end

    S3 -->|"serve"| C1
    C1 --> C2
    C2 --> C3
    C3 --> C4
    C4 --> C5
    C5 -->|"POST /api/files"| S4
    C5 -->|"POST /api/files/process"| S4
    C5 -->|"GET /api/files/:id/download"| S4
```

## Flujo de procesamiento

### Módulo Facturas (26→12 columnas)

El motor de transformación procesa cada archivo en pasos:

```
1. Lectura          → ExcelJS lee el archivo; .xls se convierte a .xlsx con SheetJS
2. Detección        → Identifica columnas por nombre técnico (fila 1) y color
3. Eliminación      → Remueve 15 columnas innecesarias
4. Renombrado       → Reemplaza 10 nombres técnicos por nombres legibles
5. Inserción        → Inserta TIPO GASTO (configurable) después de DESCRIPCIÓN
6. Cálculo          → Suma base0 + valice + exento + noobjiva → BASE CERO
7. Formateo         → Negrita en encabezados, autofiltro, freeze pane, anchos dinámicos
8. Limpieza         → Elimina estilos residuales y formatos condicionales (JSZip)
```

### Módulo Retenciones (40→7 columnas)

El módulo de retenciones utiliza su propio pipeline (`TransformRetencionesUseCase`) con entidades de dominio, mappers y generación de fórmulas Excel. Produce un archivo con dos hojas (`RETENCIÓN` y `VENTAS`) con 7 columnas de salida.

### Columnas eliminadas — Módulo Facturas (15)

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
| `poriva` | Porcentaje IVA |
| `base0` | Base tarifa 0% (usada en cálculo BASE CERO, luego eliminada) |
| `valice` | Valor ICE (usada en cálculo BASE CERO, luego eliminada) |
| `exento` | Exento de IVA (usada en cálculo BASE CERO, luego eliminada) |
| `noobjiva` | No objeto de IVA (usada en cálculo BASE CERO, luego eliminada) |

### Columnas renombradas — Módulo Facturas (10)

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

### Columnas calculadas — Módulo Facturas (1)

| Columna | Fórmula | Descripción |
|---------|---------|-------------|
| `BASE CERO` | `base0 + valice + exento + noobjiva` | Suma de las columnas de tarifa 0%. Se posiciona antes de `BASE  IVA`. |

### Columna insertada — Módulo Facturas (1)

| Columna | Valor por defecto | Descripción |
|---------|-------------------|-------------|
| `TIPO GASTO` | `EMPRESARIAL` | Insertada después de `DESCRIPCIÓN`. Configurable con `--tipo-gasto` o desde el selector interactivo. |

### Resumen: 12 columnas de salida — Módulo Facturas

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
│   ├── transformer.ts           # Motor de transformación (ExcelTransformer)
│   ├── cli/
│   │   ├── index.ts             # Commander + dispatch de comandos
│   │   ├── interactive.ts       # Modo interactivo (paleta /, selector @, keypress)
│   │   ├── processor.ts         # Orquestación de procesamiento CLI
│   │   ├── progress.ts          # Barra de progreso (cli-progress)
│   │   ├── prompts.ts           # Prompts: tipo gasto, nombre de salida
│   │   └── registry.ts          # Registro de comandos (/facturas, /retenciones, /web, /help, /version, /exit)
│   ├── core/
│   │   ├── index.ts             # Re-exports del módulo core
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
│   │   ├── index.ts             # createApp factory (Express)
│   │   ├── store.ts             # SessionStore interfaz + InMemoryStore
│   │   ├── web-server-manager.ts  # WebServerManager (singleton, start/stop/restart)
│   │   ├── graceful-shutdown.ts   # Cierre limpio al recibir señales del SO
│   │   └── routes/
│   │       └── files.ts         # Rutas API: upload, list, get, delete, process, download
│   ├── utils/
│   │   ├── colors.ts            # Clasificador de colores (ARGB → HSL)
│   │   ├── formulas.ts          # Traducción de fórmulas Excel
│   │   ├── help-service.ts      # HelpService: ayuda general y por comando
│   │   ├── id.ts                # generateId() unificado
│   │   ├── logger.ts            # Logger con modo debug
│   │   ├── paths.ts             # Validación y limpieza de rutas
│   │   └── version-service.ts   # VersionService: lee versión desde package.json
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
│           ├── Header.tsx          # Barra de navegación
│           ├── ModuleSelector.tsx  # Selector de módulo (Facturas/Retenciones)
│           ├── FileZone.tsx        # Zona de arrastre
│           ├── TipoGastoSelect.tsx # Selector de tipo de gasto
│           ├── FileCard.tsx        # Tarjeta por archivo
│           ├── ProcessButton.tsx   # Botón "Procesar todos"
│           └── ResultPanel.tsx     # Panel de resultados
├── tests/
│   └── core/
│       ├── transformer.test.ts        # Tests del motor de transformación
│       ├── processor.test.ts          # Tests del orquestador de procesamiento
│       ├── retenciones.test.ts        # Tests del módulo retenciones
│       ├── retenciones-name.test.ts   # Tests de detección dinámica de hojas
│       ├── help-service.test.ts       # Tests del HelpService
│       └── version-service.test.ts    # Tests del VersionService
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
| `DELETE` | `/api/files/:id` | Eliminar un archivo y su temporal del disco. |
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
| `npm run start:web` | Iniciar servidor web en producción (`node dist/server/index.js`) |
| `npm run clean` | Eliminar `dist/` |
| `npm run rebuild` | Limpiar y recompilar todo |

### Instalación como comando global

Después de `npm install -g invoiceflow-cli`, el comando `invo` queda disponible globalmente en la terminal.

## Desarrollo

### Setup local

```bash
git clone <repo-url>
cd invoiceflow-cli
npm install
npm run build:all
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

Tests cubren el motor de transformación, el orquestador de procesamiento, el módulo de retenciones, `HelpService` y `VersionService`. Framework: **Vitest** (6 archivos de test).

## Solución de problemas

### No aparecen archivos Excel al escribir `@`

Asegúrate de que el terminal esté abierto en el directorio con archivos `.xls` o `.xlsx`. El selector busca en el directorio actual y en subdirectorios directos (excluye `node_modules`, `.git` y `dist`).

### El archivo no se procesa / archivo corrupto

Los archivos `.xls` (Excel 97-2003) se convierten internamente a `.xlsx`. Si la conversión falla:
1. Abre el archivo en Excel y guárdalo nuevamente como `.xlsx`
2. Verifica que el archivo no esté protegido con contraseña

### `Error: Solo se permiten archivos .xlsx o .xls`

El cliente web solo acepta archivos con extensión `.xlsx` o `.xls`. Verifica que el archivo sea un Excel válido y no un CSV u otro formato.

### No se puede abrir o escribir en el archivo de salida

Comprueba que el archivo Excel de salida no esté abierto en otra aplicación (ej. Microsoft Excel). Cierra la aplicación que lo está bloqueando e intenta de nuevo.

### `Error de permiso` al guardar

El archivo de salida se guarda en el mismo directorio del archivo de entrada. Verifica que tengas permisos de escritura en esa carpeta.

### El navegador no se abre automáticamente (comando `/web`)

El comando `/web` intenta abrir el navegador según la plataforma (`open` en macOS, `start` en Windows, `xdg-open` en Linux). Si falla, abre manualmente `http://localhost:3000`.

### Puerto 3000 ya está ocupado al iniciar `/web`

Cierra cualquier otra instancia del cliente web que se esté ejecutando en segundo plano, o detén la aplicación que ocupe ese puerto.

### Archivo demasiado grande

El cliente web limita cada archivo a 50 MB. Para archivos mayores, usa la CLI directamente.

### El archivo de salida tiene estilos o colores inesperados

InvoiceFlow limpia estilos residuales del archivo de entrada, pero algunos formatos muy complejos (hojas protegidas, macros) pueden generar conflictos. Intenta guardar el archivo de entrada como `.xlsx` limpio antes de procesarlo.

## Roadmap

- [x] **Tests automatizados** — Vitest con cobertura de transformación, procesamiento, retenciones, HelpService y VersionService
- [x] **Módulo retenciones** — Transformación de retenciones (40→7 columnas)
- [x] **Cliente web con módulos** — Selector de módulo, Tailwind CSS 4, Zustand
- [x] **Nombres de salida personalizados** — Cada archivo puede tener un nombre de salida diferente
- [x] **Paleta de comandos interactiva** — Búsqueda fuzzy por nombre, descripción y keywords
- [x] **HelpService modular** — Ayuda contextual por comando (`/help facturas`, `/help retenciones`, etc.)
- [x] **VersionService dinámico** — Lee la versión directamente desde `package.json`
- [ ] **Modo batch** — Procesar carpetas completas con patrón de archivos
- [ ] **Historial de procesamiento** — Guardar registro de archivos transformados
- [ ] **CLI pipe** — Encadenar transformaciones con `|` entre comandos
- [ ] **Exportación CSV** — Soporte para exportar a CSV además de `.xlsx`
- [ ] **Multi-idioma** — Soporte para inglés además de español
- [ ] **Configuración persistida** — Guardar preferencia de `tipo-gasto` por defecto
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