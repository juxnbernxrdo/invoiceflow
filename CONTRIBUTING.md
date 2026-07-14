# Contributing a InvoiceFlow

Guía para contribuir con código, specs o documentación.

## Requisitos previos

- Node.js >= 18
- npm >= 9
- Git

## Setup de desarrollo

```bash
git clone <repo-url>
cd invoiceflow-cli
npm install
npm run build
npm test
```

## Arquitectura modular

InvoiceFlow sigue una arquitectura modular extraída incrementalmente:

| Módulo | Ubicación | Responsabilidad |
|--------|-----------|-----------------|
| **Core** | `src/core/` | Tipos compartidos, orquestación de procesamiento |
| **Transformer** | `src/transformer.ts` | Motor de transformación Excel (orquestador) |
| **CLI** | `src/cli/` | Commander, prompts, progress bar, modo interactivo |
| **Server** | `src/server/` | Express API, store, rutas |
| **Web** | `src/web/` | React + Zustand + Tailwind |
| **Utils** | `src/utils/` | Utilidades compartidas (colores, fórmulas, IDs, paths) |

### Regla de módulo

Cada módulo tiene una responsabilidad clara. Si necesitas agregar funcionalidad:

1. ¿Pertenece a un módulo existente? → Agrégalo ahí
2. ¿Es una nueva responsabilidad? → Crea un nuevo módulo con su propio directorio
3. ¿Necesitas comunicar entre módulos? → Usa tipos de `src/core/types.ts`

## Especificaciones (SDD)

InvoiceFlow usa **Spec-Driven Development** con GitHub Spec Kit methodology.

### Flujo

1. **Escribir spec** antes de código → `specs/`
2. **Aprobar spec** → revisión de diseño
3. **Implementar** → extraer/refactorizar código
4. **Tests** → cubrir comportamiento nuevo
5. **Build** → verificar que compila
6. **Commit** → un commit por fase/módulo

### Formato de spec

Las specs van en `specs/` organizadas por módulo:

```
specs/
├── 00-platform-vision/    # Visión de plataforma
├── 01-core-module/        # Módulo core
└── migration/             # Estrategia de migración
```

## Código

### Convenciones

- **TypeScript estricto** — no usar `any` innecesariamente
- **CommonJS** — el proyecto usa `"type": "commonjs"`
- **Sin comentarios** — el código debe ser autoexplicativo
- **Una responsabilidad por archivo** — no crear módulos diabólicos

### Archivos existentes

- `src/core/types.ts` → Fuente de verdad para tipos compartidos
- `src/utils/id.ts` → `generateId()` unificado (no re-implementar)
- `src/utils/paths.ts` → Validación y limpieza de rutas

### Agregar un tipo compartido

```typescript
// src/core/types.ts
export interface MiNuevoTipo {
  campo: string;
  valor: number;
}
```

### Agregar una utilidad

```typescript
// src/utils/mi-utilidad.ts
export function miFuncion(): MiTipo {
  // ...
}
```

Luego importar desde donde se necesite:

```typescript
import { miFuncion } from '../utils/mi-utilidad';
```

## Tests

Framework: **Vitest**

### Ejecutar

```bash
npm test              # Todos los tests
npm run test:watch    # Modo watch
```

### Escribir tests

Ubicación: `tests/core/` o `tests/<modulo>/`

```typescript
import { describe, it, expect } from 'vitest';
import { miFuncion } from '../../src/utils/mi-utilidad';

describe('miFuncion', () => {
  it('debería hacer X cuando Y', () => {
    const resultado = miFuncion();
    expect(resultado).toBe(valorEsperado);
  });
});
```

### Convenciones de tests

- **Nombres descriptivos** — "debería [acción] cuando [condición]"
- **Arrange-Act-Assert** — estructura clara
- **Un assertion por test** — mantener tests simples
- **Tests de comportamiento** — no testear implementación interna

## Commits

### Formato

```
<tipo>(<scope>): <descripción corta>

<descripción opcional más detallada>
```

### Tipos

| Tipo | Descripción |
|------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Refactorización sin cambio de comportamiento |
| `test` | Agregar o modificar tests |
| `docs` | Documentación |
| `chore` | Configuración, dependencias, etc. |

### Ejemplos

```
feat(transformer): agregar soporte para columnas personalizadas
fix(cli): corregir selector @ en Windows
refactor(server): extraer SessionStore a archivo separado
test(core): agregar tests para BASE CERO
docs: actualizar README con nueva estructura
```

### Reglas

- **Un commit por cambio** — no mezclar refactorización con features
- **Build debe pasar** — `npm run build && npm test` antes de commit
- **No secrets** — nunca commitear tokens, passwords, etc.

## Pull Requests

1. Crear rama desde `main`
2. Hacer cambios siguiendo las convenciones
3. Ejecutar `npm run build && npm test`
4. Crear PR con descripción clara
5. Esperar review

## Bug reports

Al reportar un bug, incluir:

1. Versión de InvoiceFlow (`invo --version`)
2. Sistema operativo
3. Pasos para reproducir
4. Resultado esperado vs actual
5. Archivo de entrada (si es posible)

## Questions

Para preguntas generales, abrir un issue con label `question`.
