import * as cliProgress from 'cli-progress';

export function createProgressBar(): cliProgress.SingleBar {
    return new cliProgress.SingleBar({
        format: '  {bar} | {percentage}% | {value}/{total} | {filename}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false,
        stopOnComplete: true,
        gracefulExit: true
    });
}
