import { useState, useEffect } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useRoundStore } from '../store/useRoundStore';
import { usePracticeStore } from '../store/usePracticeStore';

export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(
    () =>
      useUserStore.persist.hasHydrated() &&
      useRoundStore.persist.hasHydrated() &&
      usePracticeStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (hydrated) return;

    let resolved = 0;
    function check() {
      resolved += 1;
      if (resolved === 3) setHydrated(true);
    }

    // Each store may already be hydrated by the time this runs
    function subscribe(store: typeof useUserStore | typeof useRoundStore | typeof usePracticeStore) {
      if ((store as any).persist.hasHydrated()) {
        check();
        return () => {};
      }
      return (store as any).persist.onFinishHydration(check);
    }

    const u1 = subscribe(useUserStore);
    const u2 = subscribe(useRoundStore);
    const u3 = subscribe(usePracticeStore);

    return () => { u1(); u2(); u3(); };
  }, [hydrated]);

  return hydrated;
}
