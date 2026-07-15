import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HelpService } from '../../src/utils/help-service';

describe('HelpService', () => {
    let logSpy: any;

    beforeEach(() => {
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        logSpy.mockRestore();
    });

    it('should output general help', () => {
        HelpService.general();
        expect(logSpy).toHaveBeenCalled();
        const calls = logSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
        expect(calls).toContain('FORMATOS SOPORTADOS');
        expect(calls).toContain('LISTA DE COMANDOS');
        expect(calls).toContain('ATAJOS DE TECLADO');
    });

    it('should output command help for facturas', () => {
        HelpService.command('facturas');
        expect(logSpy).toHaveBeenCalled();
        const calls = logSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
        expect(calls).toContain('AYUDA: /facturas');
        expect(calls).toContain('Objetivo');
        expect(calls).toContain('--tipo-gasto');
    });

    it('should output command help for retenciones', () => {
        HelpService.command('/retenciones');
        expect(logSpy).toHaveBeenCalled();
        const calls = logSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
        expect(calls).toContain('AYUDA: /retenciones');
    });

    it('should handle unrecognized commands gracefully', () => {
        HelpService.command('unknown');
        expect(logSpy).toHaveBeenCalled();
        const calls = logSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
        expect(calls).toContain('no reconocido');
    });
});
