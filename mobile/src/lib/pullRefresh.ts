// Pull to refresh that never sticks. iOS can leave the spinner hanging when the
// reload finishes before its own animation has started, so it stays at least
// 600ms; and a slow network never keeps it longer than 8s (the data still
// arrives when it comes). A second pull while one runs is ignored.
import { useCallback, useEffect, useRef, useState } from "react";

const MIN = 600;
const MAX = 8000;

export function usePullRefresh(reload: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => () => {
    alive.current = false;
  }, []);
  const onRefresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      await Promise.all([Promise.race([reload().catch(() => {}), wait(MAX)]), wait(MIN)]);
    } finally {
      busy.current = false;
      if (alive.current) setRefreshing(false);
    }
  }, [reload]);
  return { refreshing, onRefresh };
}
