import { useRef, useState, DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { useStore } from '../store';
import { FileCard } from './FileCard';

export function FileZone() {
    const allFiles = useStore(s => s.files);
    const selectedModule = useStore(s => s.selectedModule);
    const files = allFiles.filter(f => f.module === selectedModule.id);
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
        <div className="mb-8">
            <label className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.10em] text-text-muted">
                Archivos
            </label>
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-[18px] border-2 border-dashed px-6 py-11 text-center transition-all ${
                    isDragging
                        ? 'border-accent bg-accent-soft'
                        : 'border-border bg-white hover:border-text-faint'
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                        const selected = Array.from(e.target.files || []);
                        if (selected.length > 0) addFiles(selected);
                        e.target.value = '';
                    }}
                />
                <Upload
                    size={24}
                    className={`mx-auto mb-3 transition-colors ${isDragging ? 'text-accent' : 'text-text-faint'}`}
                    strokeWidth={1.5}
                />
                <p className="m-0 text-[0.97rem] leading-relaxed text-text-secondary">
                    {isUploading ? 'Subiendo archivos...' : 'Arrastra archivos Excel o haz clic para seleccionar'}
                </p>
                <p className="mt-1.5 m-0 text-[0.79rem] leading-relaxed text-text-faint">
                    .xlsx o .xls — hasta 50MB
                </p>
            </div>

            {files.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                    {files.map((f, i) => <FileCard key={f.id} file={f} index={i} />)}
                </div>
            )}
        </div>
    );
}
