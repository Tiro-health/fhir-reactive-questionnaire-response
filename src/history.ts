import { Signal } from "@lit-labs/signals";
import type { QuestionnaireResponseModel } from "./model/QuestionnaireResponse.js";
import type { ResponseItem } from "./model/ResponseItem.js";
import type { AnswerValue } from "./model/types.js";

export interface HistoryOptions {
  /** Maximum number of undo steps to keep. Default: 50 */
  maxSize?: number;
  /** Debounce interval in ms for auto-capture. Default: 300 */
  debounceMs?: number;
}

type Snapshot = Map<ResponseItem, AnswerValue[] | null>;

function takeSnapshot(model: QuestionnaireResponseModel): Snapshot {
  const snapshot: Snapshot = new Map();
  model.forEachItem((item) => {
    if (!item.calculatedExpression) {
      const values = item.answerValues;
      snapshot.set(
        item,
        values ? (JSON.parse(JSON.stringify(values)) as AnswerValue[]) : null,
      );
    }
  });
  return snapshot;
}

function restoreSnapshot(snapshot: Snapshot): void {
  for (const [item, values] of snapshot) {
    item.setAnswer(values ?? []);
  }
}

function snapshotsEqual(a: Snapshot, b: Snapshot): boolean {
  if (a.size !== b.size) return false;
  for (const [item, values] of a) {
    if (!b.has(item)) return false;
    if (JSON.stringify(values) !== JSON.stringify(b.get(item))) return false;
  }
  return true;
}

export class FormHistory {
  readonly #model: QuestionnaireResponseModel;
  readonly #maxSize: number;
  readonly #debounceMs: number;

  readonly #past: Snapshot[] = [];
  readonly #future: Snapshot[] = [];
  #current: Snapshot;
  readonly #version = new Signal.State(0);

  readonly #canUndo: Signal.Computed<boolean>;
  readonly #canRedo: Signal.Computed<boolean>;

  #restoring = false;
  #debounceTimer: ReturnType<typeof setTimeout> | null = null;
  #watcher: Signal.subtle.Watcher;
  #tracker: Signal.Computed<void>;
  #disposed = false;

  constructor(model: QuestionnaireResponseModel, options?: HistoryOptions) {
    this.#model = model;
    this.#maxSize = options?.maxSize ?? 50;
    this.#debounceMs = options?.debounceMs ?? 300;

    // Capture initial state
    this.#current = takeSnapshot(model);

    this.#canUndo = new Signal.Computed(() => {
      this.#version.get();
      return this.#past.length > 0;
    });

    this.#canRedo = new Signal.Computed(() => {
      this.#version.get();
      return this.#future.length > 0;
    });

    // Computed that tracks all non-calculated answer signals.
    // Reading answerValues inside forEachItem creates reactive dependencies
    // on every answer signal, so the watcher fires when any answer changes.
    this.#tracker = new Signal.Computed<void>(() => {
      model.forEachItem((item) => {
        if (!item.calculatedExpression) {
          item.answerValues;
        }
      });
    });

    // Initialize dependencies
    this.#tracker.get();

    // Watch for changes and schedule debounced capture
    this.#watcher = new Signal.subtle.Watcher(() => {
      if (!this.#restoring && !this.#disposed) {
        this.#scheduleCapture();
      }
    });
    this.#watcher.watch(this.#tracker);
  }

  /** Reactive: true when there is at least one undo step available. */
  get canUndo(): boolean {
    return this.#canUndo.get();
  }

  /** Reactive: true when there is at least one redo step available. */
  get canRedo(): boolean {
    return this.#canRedo.get();
  }

  /** Restore the previous state. No-op if nothing to undo. */
  undo(): void {
    if (this.#past.length === 0) return;

    this.#cancelPendingCapture();
    this.#future.push(this.#current);
    this.#current = this.#past.pop()!;
    this.#restore(this.#current);
    this.#bumpVersion();
  }

  /** Re-apply the next state. No-op if nothing to redo. */
  redo(): void {
    if (this.#future.length === 0) return;

    this.#cancelPendingCapture();
    this.#past.push(this.#current);
    this.#current = this.#future.pop()!;
    this.#restore(this.#current);
    this.#bumpVersion();
  }

  /**
   * Immediately capture the current answer state, bypassing debounce.
   * Useful after programmatic changes like `setResponse`.
   */
  captureState(): void {
    this.#cancelPendingCapture();
    this.#consumePending();
    this.#pushSnapshot();
  }

  /** Clean up watchers and pending timers. */
  dispose(): void {
    this.#disposed = true;
    this.#cancelPendingCapture();
    this.#watcher.unwatch(this.#tracker);
  }

  #pushSnapshot(): void {
    const snapshot = takeSnapshot(this.#model);
    if (snapshotsEqual(snapshot, this.#current)) return;

    this.#past.push(this.#current);
    if (this.#past.length > this.#maxSize) {
      this.#past.shift();
    }
    this.#current = snapshot;
    this.#future.length = 0;
    this.#bumpVersion();
  }

  #restore(snapshot: Snapshot): void {
    this.#restoring = true;
    try {
      restoreSnapshot(snapshot);
      this.#consumePending();
    } finally {
      this.#restoring = false;
    }
  }

  #scheduleCapture(): void {
    if (this.#debounceTimer !== null) {
      clearTimeout(this.#debounceTimer);
    }
    this.#debounceTimer = setTimeout(() => {
      this.#debounceTimer = null;
      this.#consumePending();
      this.#pushSnapshot();
    }, this.#debounceMs);
  }

  #cancelPendingCapture(): void {
    if (this.#debounceTimer !== null) {
      clearTimeout(this.#debounceTimer);
      this.#debounceTimer = null;
    }
  }

  /** Re-evaluate pending signals so the watcher resets its dirty state. */
  #consumePending(): void {
    for (const s of this.#watcher.getPending()) {
      s.get();
    }
  }

  #bumpVersion(): void {
    this.#version.set(this.#version.get() + 1);
  }
}
