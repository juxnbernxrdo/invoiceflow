import { useStore } from '../store';

export function TipoGastoSelect() {
    const tipoGasto = useStore(s => s.tipoGasto);
    const setTipoGasto = useStore(s => s.setTipoGasto);

    return (
        <div style={{ marginBottom: 32 }}>
            <label style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: '#6e6e73',
                display: 'block',
                marginBottom: 8,
            }}>
                Tipo de gasto
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
                {(['EMPRESARIAL', 'PERSONAL'] as const).map(opt => {
                    const active = tipoGasto === opt;
                    return (
                        <button
                            key={opt}
                            onClick={() => setTipoGasto(opt)}
                            style={{
                                padding: '10px 24px',
                                borderRadius: 24,
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                fontFamily: "'Geist', -apple-system, sans-serif",
                                transition: 'all 0.15s ease',
                                background: active ? '#1d1d1f' : 'transparent',
                                color: active ? '#ffffff' : '#424245',
                            }}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
