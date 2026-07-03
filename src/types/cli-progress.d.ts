declare module 'cli-progress' {
  interface Options {
    format?: string;
    barCompleteChar?: string;
    barIncompleteChar?: string;
    hideCursor?: boolean;
    clearOnComplete?: boolean;
    stopOnComplete?: boolean;
    gracefulExit?: boolean;
    autopadding?: boolean;
    formatBarCompleteChar?: string;
    formatBarIncompleteChar?: string;
  }

  interface Payload {
    percentage?: number;
    total?: number;
    current?: number;
    filename?: string;
  }

  class SingleBar {
    constructor(options?: Options);
    start(total: number, startValue: number, payload?: Payload): void;
    update(current: number, payload?: Partial<Payload>): void;
    stop(): void;
    increment(value?: number, payload?: Partial<Payload>): void;
  }

  class MultiBar {
    constructor(options?: Options);
    create(total: number, startValue: number, payload?: Payload): SingleBar;
    stop(): void;
  }

  export { SingleBar, MultiBar, Options, Payload };
}