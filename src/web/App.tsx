import './index.css';
import { Header } from './components/Header';
import { ModuleSelector } from './components/ModuleSelector';
import { FileZone } from './components/FileZone';
import { TipoGastoSelect } from './components/TipoGastoSelect';
import { ProcessButton } from './components/ProcessButton';
import { ResultPanel } from './components/ResultPanel';
import { useStore } from './store';
import { useEffect } from 'react';

export default function App() {
    const files = useStore(s => s.files);
    const selectedModule = useStore(s => s.selectedModule);
    const setModule = useStore(s => s.setModule);
    const refreshFiles = useStore(s => s.refreshFiles);

    useEffect(() => { refreshFiles(); }, []);

    return (
        <div className="min-h-screen bg-surface-dim text-text antialiased leading-relaxed">
            <Header />
            <main className="mx-auto max-w-[720px] px-6 py-12 md:py-20">
                <ModuleSelector 
                    selectedModule={selectedModule} 
                    onModuleChange={setModule} 
                />
                
                {selectedModule.supportsTipoGasto && <TipoGastoSelect />}
                <FileZone />
                <ProcessButton />
                <ResultPanel files={files} />
            </main>
        </div>
    );
}
