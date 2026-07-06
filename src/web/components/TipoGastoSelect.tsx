import { useStore } from '../store';

export function TipoGastoSelect() {
    const tipoGasto = useStore(s => s.tipoGasto);
    const setTipoGasto = useStore(s => s.setTipoGasto);

    return (
        <div className="mb-8">
            <label className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.10em] text-text-muted">
                Tipo de gasto
            </label>
            <div className="flex gap-2">
                {(['EMPRESARIAL', 'PERSONAL'] as const).map(opt => {
                    const active = tipoGasto === opt;
                    return (
                        <button
                            key={opt}
                            onClick={() => setTipoGasto(opt)}
                            className={`rounded-3xl border-none px-6 py-2.5 text-[0.9rem] font-medium transition-all ${
                                active
                                    ? 'bg-text text-white'
                                    : 'bg-transparent text-text-secondary hover:bg-surface-dim'
                            }`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
