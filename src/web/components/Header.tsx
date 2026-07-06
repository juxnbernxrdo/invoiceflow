import { FileSpreadsheet } from 'lucide-react';

export function Header() {
    return (
        <header className="sticky top-0 z-50 border-b border-border-light bg-white/72 backdrop-blur-xl backdrop-saturate-[180%] px-6 py-3.5">
            <div className="mx-auto flex max-w-[720px] items-center gap-2.5">
                <FileSpreadsheet size={20} className="text-accent" strokeWidth={1.8} />
                <span className="font-serif text-[1.35rem] leading-none text-text">InvoiceFlow</span>
                <span className="ml-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-text-faint">Web</span>
            </div>
        </header>
    );
}
