import { webServerManager } from './web-server-manager';

let isShuttingDown = false;

export function setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
        if (isShuttingDown) {
            return;
        }
        isShuttingDown = true;

        console.log(`\n${signal} received. Shutting down gracefully...`);

        try {
            if (webServerManager.isRunning()) {
                await webServerManager.stop();
            }
        } catch (err) {
            console.error('Error during shutdown:', err);
        }

        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Rejection:', reason);
        shutdown('unhandledRejection');
    });
}
