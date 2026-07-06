import { useRef, useState, DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { useStore } from '../store';
import { FileCard } from './FileCard';

export function FileZone() {
    const files = useStore(s => s.files);
    const addFiles = useStore(s => s.addFiles);
    const isUploading = useStore(s => s.isUploading);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = Array.from(e.dataTransfer.files).filter(f =>
            f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        );
        if (dropped.length > 0) addFiles(dropped);
    };

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
                Archivos
            </label>
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                    border: `2px dashed ${isDragging ? '#0071e3' : '#e0e0e5'}`,
                    borderRadius: 18,
                    padding: '44px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isDragging ? '#e8f0fc' : '#ffffff',
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const selected = Array.from(e.target.files || []);
                        if (selected.length > 0) addFiles(selected);
                        e.target.value = '';
                    }}
                />
                <Upload
                    size={24}
                    color={isDragging ? '#0071e3' : '#aeaeb2'}
                    strokeWidth={1.5}
                    style={{ marginBottom: 12, transition: 'color 0.15s ease' }}
                />
                <p style={{ fontSize: '0.97rem', color: '#424245', margin: 0, lineHeight: 1.5 }}>
                    {isUploading ? 'Subiendo archivos...' : 'Arrastra archivos Excel o haz clic para seleccionar'}
                </p>
                <p style={{ fontSize: '0.79rem', color: '#aeaeb2', margin: '6px 0 0', lineHeight: 1.5 }}>
                    .xlsx o .xls — hasta 50MB
                </p>
            </div>

            {files.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {files.map((f, i) => <FileCard key={f.id} file={f} index={i} />)}
                </div>
            )}
        </div>
    );
}
