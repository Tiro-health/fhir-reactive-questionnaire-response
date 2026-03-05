import { Signal } from "@lit-labs/signals";
import type {
  AnswerValue,
  QuestionnaireResponseAnswer,
  QuestionnaireResponseItem,
} from "./types.js";
import type { ResponseAnswer } from "./ResponseAnswer.js";
import { BaseResponseItem, type BaseResponseItemInit } from "./BaseResponseItem.js";
import compare from "./compare.js";

export interface FlatResponseItemInit extends BaseResponseItemInit {
  calculatedAnswer: Signal.Computed<AnswerValue[] | null> | null;
}

export class FlatResponseItem extends BaseResponseItem {
  readonly #answer:
    | Signal.State<AnswerValue[] | null>
    | Signal.Computed<AnswerValue[] | null>;

  constructor(opts: FlatResponseItemInit) {
    super(opts);
    this.#answer = opts.calculatedAnswer
      ? opts.calculatedAnswer
      : new Signal.State<AnswerValue[]>(opts.initialAnswers, {
          equals: compare,
        });
  }

  get answerValues(): AnswerValue[] | null {
    return this.#answer.get();
  }

  get answer(): AnswerValue[] | null {
    return this.answerValues;
  }

  get answerEntries(): ResponseAnswer[] {
    return [];
  }

  get hasAnswerItems(): boolean {
    return false;
  }

  setAnswer(value: AnswerValue[]): void {
    if (Signal.isState(this.#answer)) {
      (this.#answer as Signal.State<AnswerValue[] | null>).set(value);
    }
  }

  addAnswer(value: AnswerValue): void {
    this.setAnswer([...(this.answerValues ?? []), value]);
  }

  removeAnswer(index: number): void {
    const current = this.answerValues ?? [];
    if (index < 0 || index >= current.length) {
      throw new Error(
        `Answer index ${index} out of range (0-${current.length - 1})`,
      );
    }
    this.setAnswer(current.filter((_, i) => i !== index));
  }

  toFhir(): QuestionnaireResponseItem {
    const result: QuestionnaireResponseItem = { linkId: this.linkId };

    if (this.id) result.id = this.id;
    if (this.text) result.text = this.text;

    const values = this.answerValues;
    if (values && values.length > 0) result.answer = values;

    const childItems = this.items.map((child) => child.toFhir());
    if (childItems.length > 0) result.item = childItems;

    return result;
  }
}
