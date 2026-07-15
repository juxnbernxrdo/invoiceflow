import { describe, it, expect } from 'vitest';
import { VersionService } from '../../src/utils/version-service';

describe('VersionService', () => {
    it('should read the correct name from package.json', () => {
        const name = VersionService.getName();
        expect(name).toBe('invoiceflow-cli');
    });

    it('should read the correct version from package.json', () => {
        const expectedVersion = require('../../package.json').version;
        const version = VersionService.getVersion();
        expect(version).toBe(expectedVersion);
    });

    it('should generate a banner containing the version', () => {
        const expectedVersion = require('../../package.json').version;
        const banner = VersionService.getBanner();
        expect(banner).toContain(`InvoiceFlow CLI ${expectedVersion}`);
    });

    it('should return package info object', () => {
        const info = VersionService.getPackageInfo();
        expect(info).toHaveProperty('version');
        expect(info.name).toBe('invoiceflow-cli');
    });
});
