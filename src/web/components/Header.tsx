import { FileSpreadsheet } from 'lucide-react';

export function Header() {
    return (
        <header style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid #ebebf0',
            padding: '14px 24px',
            position: 'sticky',
            top: 0,
            zIndex: 50,
        }}>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={20} color="#0071e3" strokeWidth={1.8} />
                <span style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: '1.35rem',
                    color: '#1d1d1f',
                    lineHeight: 1,
                }}>InvoiceFlow</span>
                <span style={{
                    fontSize: '0.65rem',
                    color: '#aeaeb2',
                    letterSpacing: '0.08em',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    marginLeft: 2,
                }}>Web</span>
            </div>
        </header>
    );
}
