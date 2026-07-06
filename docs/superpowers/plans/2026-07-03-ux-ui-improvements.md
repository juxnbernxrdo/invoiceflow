# Plan de Implementación: Mejoras UX/UI - InvoiceFlow CLI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar el comando CLI a `invoiceflow`, agregar barra de progreso y mejorar el manejo de errores con sugerencias.

**Architecture:** Mantener la estructura actual de la CLI, agregar dependencia `cli-progress` para barras de progreso, y modificar el manejo de errores para incluir sugerencias de solución.

**Tech Stack:** TypeScript, Node.js, chalk, prompts, cli-progress

---

## Archivos a Modificar

| Archivo | Responsabilidad |
|---------|-----------------|
| `package.json` | Cambiar comando `bin` y agregar dependencia `cli-progress` |
| `src/cli.ts` | Implementar barra de progreso y mejorar mensajes de error |
| `src/transformer.ts` | Emitir eventos de progreso para la barra |

---

### Task 1: Actualizar package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Cambiar comando en package.json**

```json
{
  "bin": {
    "invoiceflow": "./dist/index.js"
  }
}
```

- [ ] **Step 2: Agregar dependencia cli-progress**

```json
{
  "dependencies": {
    "chalk": "^4.1.2",
    "cli-progress": "^3.12.0",
    "commander": "^15.0.0",
    "exceljs": "^4.4.0",
    "prompts": "^2.4.2",
    "xlsx": "^0.18.5"
  }
}
```

- [ ] **Step 3: Agregar tipo de cli-progress**

```json
{
  "devDependencies": {
    "@types/cli-progress": "^3.11.6",
    "@types/node": "^26.1.0",
    "@types/prompts": "^2.4.9",
    "ts-node": "^10.9.2",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 4: Instalar dependencias**

Run: `npm install`
Expected: Instalación exitosa de cli-progress y @types/cli-progress

- [ ] **Step 5: Verificar que el comando funciona**

Run: `npm run build && ./dist/index.js --version`
Expected: Muestra versión 1.0.1

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: change CLI command to invoiceflow and add cli-progress"
```

---

### Task 2: Actualizar types de cli-progress

**Files:**
- Create: `src/types/cli-progress.d.ts`

- [ ] **Step 1: Crear archivo de tipos**

```typescript
declare module 'cli-progress' {
  interface Options {
    format?: string;
    barCompleteChar?: string;
    barIncompleteChar?: string;
    hideCursor?: boolean;
    clearOnComplete?: boolean;
    stopOnComplete?: boolean;
    gracefulExit?: boolean;
    autopadding?: boolean;
    formatBarCompleteChar?: string;
    formatBarIncompleteChar?: string;
  }

  interface Payload {
    percentage?: number;
    total?: number;
    current?: number;
    filename?: string;
  }

  class SingleBar {
    constructor(options?: Options);
    start(total: number, startValue: number, payload?: Payload): void;
    update(current: number, payload?: Partial<Payload>): void;
    stop(): void;
    increment(value?: number, payload?: Partial<Payload>): void;
  }

  class MultiBar {
    constructor(options?: Options);
    create(total: number, startValue: number, payload?: Payload): SingleBar;
    stop(): void;
  }

  export { SingleBar, MultiBar, Options, Payload };
}
```

- [ ] **Step 2: Verificar que TypeScript reconoce los tipos**

Run: `npx tsc --noEmit`
Expected: No hay errores de tipos relacionados con cli-progress

- [ ] **Step 3: Commit**

```bash
git add src/types/cli-progress.d.ts
git commit -m "feat: add TypeScript types for cli-progress"
```

---

### Task 3: Actualizar transformer.ts para emitir eventos de progreso

**Files:**
- Modify: `src/transformer.ts`

- [ ] **Step 1: Agregar tipo de callback de progreso**

```typescript
export type ProgressCallback = (current: number, total: number, message: string) => void;
```

- [ ] **Step 2: Modificar constructor de ExcelTransformer**

```typescript
export class ExcelTransformer {
  private onProgress: (msg: string) => void;
  private onProgressUpdate?: ProgressCallback;
  private totalSteps: number = 0;
  private currentStep: number = 0;

  constructor(onProgress: (msg: string) => void, onProgressUpdate?: ProgressCallback) {
    this.onProgress = onProgress;
    this.onProgressUpdate = onProgressUpdate;
  }

  private updateProgress(message: string) {
    this.currentStep++;
    if (this.onProgressUpdate) {
      this.onProgressUpdate(this.currentStep, this.totalSteps, message);
    }
  }
  // ... resto de la clase
}
```

- [ ] **Step 3: Agregar pasos de progreso en el método transform**

```typescript
public async transform(inputPath: string, outputPath: string): Promise<TransformStats> {
  this.totalSteps = 8; // Total de pasos de progreso
  this.currentStep = 0;

  // ... código existente ...

  this.updateProgress('Archivo cargado');
  this.updateProgress('Analizando hojas...');
  this.updateProgress('Detectando columnas...');
  this.updateProgress('Calculando columnas...');
  this.updateProgress('Transformando...');
  this.updateProgress('Validando resultados...');
  this.updateProgress('Guardando archivo...');
  this.updateProgress('Limpiando estilos...');

  // ... resto del método
}
```

- [ ] **Step 4: Verificar que el transformer funciona**

Run: `npm run build && ./dist/index.js /tmp/facturas_test.xls`
Expected: Transformación exitosa sin errores

- [ ] **Step 5: Commit**

```bash
git add src/transformer.ts
git commit -m "feat: add progress callback to ExcelTransformer"
```

---

### Task 4: Actualizar cli.ts con barra de progreso

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Agregar importación de cli-progress**

```typescript
import * as cliProgress from 'cli-progress';
```

- [ ] **Step 2: Crear función para crear barra de progreso**

```typescript
function createProgressBar(): cliProgress.SingleBar {
  return new cliProgress.SingleBar({
    format: '  {bar} | {percentage}% | {value}/{total} | {filename}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    clearOnComplete: false,
    stopOnComplete: true,
    gracefulExit: true
  });
}
```

- [ ] **Step 3: Modificar función processFiles para usar barra de progreso**

```typescript
async function processFiles(filePaths: string[]): Promise<boolean> {
  const resolvedFiles: { original: string; resolved: string; isValid: boolean; error?: string }[] = [];

  // ... código de resolución de archivos existente ...

  if (resolvedFiles.length === 0) {
    console.log(chalk.yellow('No se seleccionaron archivos para procesar.'));
    return false;
  }

  const progressBar = createProgressBar();
  const processedSuccessfully: string[] = [];
  const skippedFiles: { path: string; reason: string }[] = [];

  // Process each file
  for (let idx = 0; idx < resolvedFiles.length; idx++) {
    const { original, resolved, isValid, error } = resolvedFiles[idx];

    if (!isValid) {
      console.log(chalk.yellow(`\n⚠ Omitiendo archivo inválido: ${original} - Razón: ${error}`));
      console.log(chalk.gray(`  💡 Sugerencia: ${getSuggestionForError(error || '')}`));
      skippedFiles.push({ path: original, reason: error || 'Archivo inválido' });
      continue;
    }

    const inputDir = path.dirname(resolved);
    const outPath = getUniqueOutputPath(inputDir, idx);

    console.log(chalk.cyan(`\nProcesando archivo ${idx + 1}/${resolvedFiles.length}: ${original}`));
    console.log(chalk.gray(`Destino de salida: ${outPath}`));

    // Iniciar barra de progreso
    progressBar.start(100, 0, { filename: path.basename(original) });

    const transformer = new ExcelTransformer(
      (msg) => {
        // La barra de progreso maneja la visualización
      },
      (current, total, message) => {
        const percentage = Math.round((current / total) * 100);
        progressBar.update(percentage, { filename: path.basename(original) });
      }
    );

    try {
      const stats = await transformer.transform(resolved, outPath);
      progressBar.update(100, { filename: path.basename(original) });
      progressBar.stop();

      console.log(chalk.green(`\n✔ ¡Transformación exitosa!`));
      console.log(chalk.gray(`- Columnas originales: ${stats.originalColumns}`));
      console.log(chalk.gray(`- Columnas finales: ${stats.finalColumns}`));
      console.log(chalk.gray(`- Columnas eliminadas: ${stats.deletedColumns.join(', ') || 'Ninguna'}`));
      if (stats.replacedColumns.length > 0) {
        console.log(chalk.gray(`- Columnas reemplazadas: ${stats.replacedColumns.map(r => `${r.red} -> ${r.green}`).join(', ')}`));
      }
      console.log(chalk.gray(`- Filas recalculadas (tarifa 0%): ${stats.recalculatedRows}`));
      console.log(chalk.green(`✔ Validación de integridad del archivo de salida superada.`));
      processedSuccessfully.push(original);
    } catch (err: any) {
      progressBar.stop();
      console.error(chalk.red(`\n❌ Error al procesar el archivo "${original}":`));
      console.error(chalk.red(`   Causa: ${err.message}`));
      console.log(chalk.gray(`  💡 Sugerencia: ${getSuggestionForError(err.message)}`));
      if (fs.existsSync(outPath)) {
        try {
          fs.unlinkSync(outPath);
        } catch {}
      }
      skippedFiles.push({ path: original, reason: err.message });
    }
  }

  // ... resto de la función de resumen
}
```

- [ ] **Step 4: Agregar función getSuggestionForError**

```typescript
function getSuggestionForError(errorMessage: string): string {
  const lowerError = errorMessage.toLowerCase();

  if (lowerError.includes('no existe') || lowerError.includes('enoent')) {
    return 'Verifica que la ruta del archivo sea correcta y que el archivo exista.';
  }
  if (lowerError.includes('permiso') || lowerError.includes('eacces')) {
    return 'Verifica los permisos de lectura del archivo.';
  }
  if (lowerError.includes('zip') || lowerError.includes('central directory')) {
    return 'El archivo podría estar corrupto. Intenta abrirlo en Excel y guárdalo nuevamente.';
  }
  if (lowerError.includes('formato') || lowerError.includes('invalid')) {
    return 'Asegúrate de usar archivos Excel (.xlsx o .xls) válidos.';
  }
  if (lowerError.includes('xlrdfssheet')) {
    return 'El archivo podría tener hojas protegidas o formato incompatible. Prueba guardarlo como .xlsx.';
  }

  return 'Si el problema persiste, intenta con otro archivo o verifica que el archivo no esté dañado.';
}
```

- [ ] **Step 5: Verificar que la CLI funciona**

Run: `npm run build && ./dist/index.js --help`
Expected: Muestra ayuda con comando `invoiceflow`

- [ ] **Step 6: Probar con archivo .xls**

Run: `./dist/index.js /tmp/facturas_test.xls`
Expected: Barra de progreso se muestra y transformación exitosa

- [ ] **Step 7: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add progress bar and error suggestions to CLI"
```

---

### Task 5: Verificación final

**Files:**
- Verify: `package.json`
- Verify: `src/cli.ts`
- Verify: `src/transformer.ts`

- [ ] **Step 1: Compilar proyecto**

Run: `npm run build`
Expected: Compilación sin errores

- [ ] **Step 2: Verificar comando**

Run: `./dist/index.js --version`
Expected: Muestra `1.0.1`

- [ ] **Step 3: Verificar ayuda**

Run: `./dist/index.js --help`
Expected: Muestra ayuda con comando `invoiceflow`

- [ ] **Step 4: Probar transformación**

Run: `./dist/index.js /tmp/facturas_test.xls`
Expected: Barra de progreso se muestra, transformación exitosa, errores muestran sugerencias

- [ ] **Step 5: Verificar que no se rompió nada**

Run: `./dist/index.js --version && ./dist/index.js --help`
Expected: Ambos comandos funcionan correctamente

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "feat: complete UX/UI improvements with progress bar and error suggestions"
```