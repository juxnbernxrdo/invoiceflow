export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultOutputName: string;
  fileExtensions: string[];
  supportsTipoGasto: boolean;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: 'facturas',
    name: 'Facturas',
    description: 'Procesar facturas electrónicas (26→12 columnas)',
    icon: '📄',
    defaultOutputName: 'FACTURAS',
    fileExtensions: ['.xlsx', '.xls'],
    supportsTipoGasto: true,
  },
  {
    id: 'retenciones',
    name: 'Retenciones',
    description: 'Procesar retenciones electrónicas (40→7 columnas)',
    icon: '📥',
    defaultOutputName: 'RETENCIONES',
    fileExtensions: ['.xlsx', '.xls'],
    supportsTipoGasto: false,
  },
];

export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULES.find(m => m.id === id);
}

export function getModuleByName(name: string): ModuleDefinition | undefined {
  return MODULES.find(m => m.name.toLowerCase() === name.toLowerCase());
}
