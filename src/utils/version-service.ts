import * as path from 'path';
import * as fs from 'fs';

export class VersionService {
    private static packageJsonCache: any = null;

    public static getPackageInfo(): any {
        if (this.packageJsonCache) {
            return this.packageJsonCache;
        }

        // Try several potential locations to find package.json relative to __dirname
        // Location 1: Two directories up (e.g. dist/utils/version-service.js -> dist -> package.json root)
        // Location 2: One directory up (e.g. dist/version-service.js -> package.json root)
        // Location 3: Current directory
        const possiblePaths = [
            path.join(__dirname, '..', '..', 'package.json'),
            path.join(__dirname, '..', 'package.json'),
            path.join(__dirname, 'package.json'),
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                try {
                    const content = fs.readFileSync(p, 'utf8');
                    this.packageJsonCache = JSON.parse(content);
                    return this.packageJsonCache;
                } catch (e) {
                    // Ignore and try next
                }
            }
        }

        // Fallback if none found
        return {
            name: 'invoiceflow-cli',
            version: '1.2.0',
            description: 'CLI tool to transform electronic invoice Excel files'
        };
    }

    public static getVersion(): string {
        return this.getPackageInfo().version || '1.2.0';
    }

    public static getName(): string {
        return this.getPackageInfo().name || 'invoiceflow-cli';
    }

    public static getBanner(): string {
        const version = this.getVersion();
        return `
      ██╗███╗   ██╗██╗   ██╗ ██████╗   InvoiceFlow CLI ${version}
      ╚═╝████╗  ██║██║   ██║██╔═══██╗  Excel Processing Platform
      ██╗██╔██╗ ██║██║   ██║██║   ██║  github.com/juxnbernxrdo/invoiceflow
      ██║██║╚██╗██║╚██████╔╝╚██████╔╝  ~
      ╚═╝╚═╝ ╚═══╝ ╚═════╝  ╚═════╝
`;
    }
}
