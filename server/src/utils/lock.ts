const lockMap: {
  [key: string]: Function[];
} = {};

export function getLock(key: string) {
  if (!lockMap[key]) lockMap[key] = [];

  const queue = lockMap[key];

  let resolve: Function;
  const promise = new Promise(res => {
    resolve = res;
  });
  queue.push(resolve!);

  if (queue.length === 1) {
    resolve!();
  }

  return promise;
}

export function releaseLock(key: string) {
  const queue = lockMap[key];
  if (!queue?.length) {
    console.error('releaseLock error: queue empty');
    return;
  }
  queue.shift();
  queue[0]?.();
}
