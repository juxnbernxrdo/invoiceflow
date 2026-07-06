import { useStore } from '../store';
import { Zap } from 'lucide-react';

export function ProcessButton() {
    const files = useStore(s => s.files);
    const isProcessing = useStore(s => s.isProcessing);
    const processAll = useStore(s => s.processAll);

    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) return null;

    return (
        <button
            onClick={processAll}
            disabled={isProcessing}
            className={`
                w-full py-3.5 px-7 rounded-3xl border-none font-sans font-medium text-[0.97rem]
                inline-flex items-center justify-center gap-2 mb-8
                transition-all duration-150 ease-in-out
                ${isProcessing
                    ? 'bg-text-faint text-white cursor-default'
                    : 'bg-accent text-white cursor-pointer hover:bg-accent-hover hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(0,113,227,0.35)] shadow-[0_4px_20px_rgba(0,113,227,0.25)]'
                }
            `}
        >
            <Zap size={18} strokeWidth={2} />
            {isProcessing ? 'Procesando...' : `Procesar ${pending.length} archivo(s)`}
        </button>
    );
}
