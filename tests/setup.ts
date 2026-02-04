import '@testing-library/jest-dom/vitest';

type ObserverInstance = { trigger: (entry?: Partial<IntersectionObserverEntry>) => void };

if (!globalThis.IntersectionObserver) {
  const instances: ObserverInstance[] = [];
  (globalThis as any).__ioInstances = instances;

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
    private readonly observed = new Set<Element>();

    constructor(private readonly callback: IntersectionObserverCallback) {
      this.callback = callback;
      instances.push(this);
    }

    disconnect(): void {
      this.observed.clear();
    }
    observe(target: Element): void {
      this.observed.add(target);
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    unobserve(target: Element): void {
      this.observed.delete(target);
    }

    trigger(entry: Partial<IntersectionObserverEntry> = {}): void {
      const targets = this.observed.size > 0 ? Array.from(this.observed) : [document.createElement('div')];
      const entries = targets.map((target) => ({
        isIntersecting: true,
        target,
        intersectionRatio: 1,
        boundingClientRect: new DOMRect(),
        intersectionRect: new DOMRect(),
        rootBounds: null,
        time: 0,
        ...entry,
      })) as IntersectionObserverEntry[];
      this.callback(entries, this);
    }
  }

  // @ts-expect-error - provide jsdom polyfill.
  globalThis.IntersectionObserver = MockIntersectionObserver;
}

const warnPattern = /--localstorage-file/;
const originalEmitWarning = process.emitWarning;
process.emitWarning = ((warning: any, ...args: any[]) => {
  const message = typeof warning === 'string' ? warning : warning?.message;
  if (typeof message === 'string' && warnPattern.test(message)) {
    return;
  }
  return originalEmitWarning.call(process, warning, ...args);
}) as typeof process.emitWarning;

const dropArg = (arg: string, index: number, all: string[]) =>
  arg === '--localstorage-file' || all[index - 1] === '--localstorage-file';
if (process.argv?.length) {
  process.argv = process.argv.filter((arg, index, all) => !dropArg(arg, index, all));
}
if (process.execArgv?.length) {
  process.execArgv = process.execArgv.filter((arg, index, all) => !dropArg(arg, index, all));
}
