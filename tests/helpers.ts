import type { EventEmitter } from 'node:events';

/**
 * Wait for a specific event to be emitted
 */
export function waitForEvent<T = unknown>(
  emitter: EventEmitter,
  event: string,
  timeout = 5000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(new Error(`Event '${event}' not emitted within ${timeout}ms`));
    }, timeout);

    emitter.once(event, (data: T) => {
      clearTimeout(timeoutHandle);
      resolve(data);
    });
  });
}

/**
 * Delay execution for a specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to become true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await delay(interval);
  }
}
