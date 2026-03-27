import { Signal } from "@lit-labs/signals";
import type { AnswerValue } from "./types.js";
import type { ResponseItem } from "./ResponseItem.js";

/**
 * Wraps a single answer value together with its nested child items.
 * Models the FHIR `QuestionnaireResponse.item.answer` element,
 * where each answer can carry its own `answer.item[]` children.
 */
export class ResponseAnswer {
  readonly #value: Signal.State<AnswerValue>;
  readonly items: ResponseItem[];

  constructor(value: AnswerValue, items: ResponseItem[]) {
    this.#value = new Signal.State(value);
    this.items = items;
  }

  get value(): AnswerValue {
    return this.#value.get();
  }

  setValue(v: AnswerValue): void {
    this.#value.set(v);
  }

  get visibleItems(): ResponseItem[] {
    return this.items.filter((i) => i.visible);
  }

  get hasVisibleItems(): boolean {
    return this.items.some((i) => i.visible);
  }
}
