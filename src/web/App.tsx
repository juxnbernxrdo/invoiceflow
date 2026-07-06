import { Header } from './components/Header';
import { FileZone } from './components/FileZone';
import { TipoGastoSelect } from './components/TipoGastoSelect';
import { ProcessButton } from './components/ProcessButton';
import { ResultPanel } from './components/ResultPanel';
import { useStore } from './store';
import { useEffect } from 'react';

export default function App() {
    const files = useStore(s => s.files);
    const refreshFiles = useStore(s => s.refreshFiles);

    useEffect(() => { refreshFiles(); }, []);

    return (
        <div style={{
            fontFamily: "'Geist', -apple-system, sans-serif",
            background: '#f5f5f7',
            minHeight: '100vh',
            color: '#1d1d1f',
            lineHeight: 1.65,
        }}>
            <Header />
            <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
                <TipoGastoSelect />
                <FileZone />
                <ProcessButton />
                <ResultPanel files={files} />
            </main>
        </div>
    );
}
