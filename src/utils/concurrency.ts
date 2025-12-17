// 간단한 동시성 제한 유틸리티
export async function processWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R | undefined | null>
): Promise<R[]> {
  const results: Array<R | undefined | null> = new Array(items.length).fill(null);
  let cursor = 0;

  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const currentIndex = cursor++;
      if (currentIndex >= items.length) break;
      try {
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      } catch (e) {
        // worker 내부에서 처리하도록 두고, 여기서는 계속 진행
        results[currentIndex] = null;
      }
    }
  });

  await Promise.all(runners);
  return results.filter((r): r is R => r !== null && r !== undefined);
}


