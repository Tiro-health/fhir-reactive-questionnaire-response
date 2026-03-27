import { Signal } from "@lit-labs/signals";
import type {
  AnswerValue,
  QuestionnaireResponseAnswer,
  QuestionnaireResponseItem,
} from "./types.js";
import type { ToFhirOptions } from "./QuestionnaireResponse.js";
import type { ResponseItem } from "./ResponseItem.js";
import { ResponseAnswer } from "./ResponseAnswer.js";
import { BaseResponseItem, type BaseResponseItemInit } from "./BaseResponseItem.js";
import { registerChildren, unregisterItem } from "./mutations.js";

export interface AnswerEntryResponseItemInit extends BaseResponseItemInit {
  answerEntries: ResponseAnswer[];
}

export class AnswerEntryResponseItem extends BaseResponseItem {
  readonly #answerEntries: Signal.State<ResponseAnswer[]>;

  constructor(opts: AnswerEntryResponseItemInit) {
    super(opts);
    this.#answerEntries = new Signal.State(opts.answerEntries);
  }

  get answerValues(): AnswerValue[] | null {
    return this.#answerEntries.get().map((e) => e.value);
  }

  /** FHIR backbone shape: each answer carries `value[x]` fields + child `item`. */
  get answer(): Array<AnswerValue & { item: ResponseItem[] }> {
    return this.#answerEntries.get().map((e) => ({ ...e.value, item: e.items }));
  }

  get answerEntries(): ResponseAnswer[] {
    return this.#answerEntries.get();
  }

  get hasAnswerItems(): boolean {
    return true;
  }

  setAnswer(value: AnswerValue[]): void {
    if (this.readOnly) return;
    const entries = this.#answerEntries.get();
    const minLen = Math.min(value.length, entries.length);
    for (let i = 0; i < minLen; i++) {
      entries[i].setValue(value[i]);
    }
  }

  addAnswer(value: AnswerValue): void {
    if (this.readOnly) return;
    const entry = this.#buildAnswerEntry(value);
    this.#answerEntries.set([...this.#answerEntries.get(), entry]);
  }

  removeAnswer(index: number): void {
    const entries = this.#answerEntries.get();
    if (index < 0 || index >= entries.length) {
      throw new Error(
        `Answer index ${index} out of range (0-${entries.length - 1})`,
      );
    }
    const removed = entries[index];
    for (const child of removed.items) {
      unregisterItem(child, this.root);
    }
    this.#answerEntries.set(entries.filter((_, i) => i !== index));
  }

  toFhir(options?: ToFhirOptions): QuestionnaireResponseItem {
    const result: QuestionnaireResponseItem = { linkId: this.linkId };

    if (this.id) result.id = this.id;
    if (this.text) result.text = this.text;

    const entries = this.#answerEntries.get();
    if (entries.length > 0) {
      result.answer = entries.map((entry) => {
        const ans: QuestionnaireResponseAnswer = { ...entry.value };
        const children = options?.excludeDisabled
          ? entry.items.filter((child) => child.enabled)
          : entry.items;
        const childItems = children.map((child) => child.toFhir(options));
        if (childItems.length > 0) ans.item = childItems;
        return ans;
      });
    }

    return result;
  }

  #buildAnswerEntry(value: AnswerValue): ResponseAnswer {
    const definition = this.root.definitions.get(this.linkId);
    const childDefs = definition?.item ?? [];
    const buildItem = this.root._buildItem;
    if (!buildItem) {
      throw new Error(
        "Model was not built with buildQuestionnaireResponse(). Cannot create answer entries at runtime.",
      );
    }

    const children: ResponseItem[] = [];
    for (const childDef of childDefs) {
      const child = buildItem(childDef, undefined, this, this.root);
      this.root.registerItem(child);
      registerChildren(child, this.root);
      children.push(child);
    }

    return new ResponseAnswer(value, children);
  }
}
