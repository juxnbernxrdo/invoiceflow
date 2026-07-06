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
            style={{
                width: '100%',
                padding: '14px 28px',
                borderRadius: 24,
                border: 'none',
                background: isProcessing ? '#aeaeb2' : '#0071e3',
                color: '#ffffff',
                fontSize: '0.97rem',
                fontWeight: 500,
                fontFamily: "'Geist', -apple-system, sans-serif",
                cursor: isProcessing ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isProcessing ? 'none' : '0 4px 20px rgba(0,113,227,0.25)',
                marginBottom: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
            }}
            onMouseEnter={(e) => {
                if (!isProcessing) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,113,227,0.35)';
                    e.currentTarget.style.background = '#0077ed';
                }
            }}
            onMouseLeave={(e) => {
                if (!isProcessing) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,113,227,0.25)';
                    e.currentTarget.style.background = '#0071e3';
                }
            }}
        >
            <Zap size={18} strokeWidth={2} />
            {isProcessing ? 'Procesando...' : `Procesar ${pending.length} archivo(s)`}
        </button>
    );
}
