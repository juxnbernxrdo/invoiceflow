import { MODULES, ModuleDefinition } from '../../core/modules';
import { FileText, ArrowDownToLine } from 'lucide-react';

interface ModuleSelectorProps {
  selectedModule: ModuleDefinition;
  onModuleChange: (module: ModuleDefinition) => void;
}

export function ModuleSelector({ selectedModule, onModuleChange }: ModuleSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {MODULES.map((module) => {
        const isActive = selectedModule.id === module.id;
        return (
          <button
            key={module.id}
            onClick={() => onModuleChange(module)}
            className={`w-full p-6 text-left rounded-[18px] bg-surface cursor-pointer transition-all duration-250 ease-in-out border-2 ${
              isActive
                ? 'border-accent shadow-[0_4px_20px_rgba(0,113,227,0.15)] -translate-y-0.5'
                : 'border-border-light shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:border-text-faint hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)]'
            }`}
          >
            <div className="mb-4">
              {module.id === 'facturas' ? (
                <FileText className={isActive ? 'text-accent' : 'text-text-muted'} size={24} strokeWidth={1.8} />
              ) : (
                <ArrowDownToLine className={isActive ? 'text-accent' : 'text-text-muted'} size={24} strokeWidth={1.8} />
              )}
            </div>
            <div className="text-[1.05rem] font-semibold text-text mb-1">
              {module.name}
            </div>
            <div className="text-[0.79rem] text-text-muted leading-relaxed">
              {module.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
