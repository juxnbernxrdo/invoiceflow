import { useStore } from '../store';
import { Zap } from 'lucide-react';

export function ProcessButton() {
    const files = useStore(s => s.files);
    const selectedModule = useStore(s => s.selectedModule);
    const isProcessing = useStore(s => s.isProcessing);
    const processAll = useStore(s => s.processAll);

    const pending = files.filter(f => f.module === selectedModule.id && f.status === 'pending');
    if (pending.length === 0) return null;

    return (
        <button
            onClick={processAll}
            disabled={isProcessing}
            className={`
                w-full py-3 px-7 rounded-[24px] border-none font-sans font-medium text-[0.9rem]
                inline-flex items-center justify-center gap-2 mb-8
                transition-all duration-200 ease-in-out
                ${isProcessing
                    ? 'bg-text-faint text-white cursor-default opacity-40'
                    : 'bg-accent text-white cursor-pointer hover:bg-accent-hover hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(0,113,227,0.3)] shadow-[0_2px_10px_rgba(0,113,227,0.2)]'
                }
            `}
        >
            <Zap size={16} strokeWidth={2} />
            {isProcessing ? 'Procesando...' : `Procesar ${pending.length} archivo(s)`}
        </button>
    );
}
