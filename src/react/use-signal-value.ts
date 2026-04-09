import { useState, useEffect, useRef } from "react";
import { Signal } from "@lit-labs/signals";

/**
 * Subscribe to a signal-derived value and re-render when it changes.
 *
 * The `compute` function is called inside a `Signal.Computed` context,
 * so any signals read during execution are automatically tracked.
 * When any tracked signal changes, the component re-renders.
 */
export function useSignalValue<T>(compute: () => T): T {
  const computeRef = useRef(compute);
  computeRef.current = compute;

  const [, forceRender] = useState(0);

  const stateRef = useRef<{
    computed: Signal.Computed<T>;
    watcher: Signal.subtle.Watcher;
  } | null>(null);

  if (stateRef.current === null) {
    const computed = new Signal.Computed(() => computeRef.current());
    const watcher = new Signal.subtle.Watcher(() => {
      forceRender((n) => n + 1);
    });
    watcher.watch(computed);
    stateRef.current = { computed, watcher };
  }

  useEffect(() => {
    const { watcher, computed } = stateRef.current!;
    // Ensure the watcher is active
    watcher.watch(computed);
    return () => {
      watcher.unwatch(computed);
    };
  }, []);

  const { computed, watcher } = stateRef.current;
  // Read the value and re-arm the watcher.
  // getPending() alone does not reset the watcher's internal dirty flag —
  // watcher.watch() (no-args form) is required to reset it so the notify
  // callback can fire again on the next signal change.
  const value = computed.get();
  watcher.getPending();
  watcher.watch();
  return value;
}
