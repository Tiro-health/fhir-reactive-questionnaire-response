import { Signal } from "@lit-labs/signals";
import type {
  AnswerValue,
  QuestionnaireItemType,
  QuestionnaireResponseAnswer,
  QuestionnaireResponseItem,
} from "./types.js";
import type { AnswerOption } from "./AnswerOption.js";
import type { QuestionnaireResponseModel } from "./QuestionnaireResponse.js";
import type { ParsedExpression } from "../build/extensions.js";
import { ResponseAnswer } from "./ResponseAnswer.js";
import compare from "./compare.js";
import {
  addItemTo,
  removeItemFrom,
  moveItemIn,
  registerChildren,
  unregisterItem,
} from "./mutations.js";

export interface ResponseItemInit {
  linkId: string;
  text: string;
  type: QuestionnaireItemType;
  id?: string;
  initialAnswers: AnswerValue[];
  enabled: Signal.Computed<boolean>;
  calculatedAnswer: Signal.Computed<AnswerValue[] | null> | null;
  items: ResponseItem[];
  answerOptions: AnswerOption[];
  parent: ResponseItem | QuestionnaireResponseModel;
  root: QuestionnaireResponseModel;
  calculatedExpression: ParsedExpression | null;
  enableWhenExpression: ParsedExpression | null;
  answerEntries: ResponseAnswer[] | null;
}

export class ResponseItem {
  readonly id: string | undefined;
  readonly linkId: string;
  readonly text: string;
  readonly type: QuestionnaireItemType;
  readonly answerOptions: AnswerOption[];
  readonly calculatedExpression: ParsedExpression | null;
  readonly enableWhenExpression: ParsedExpression | null;
  readonly parent: ResponseItem | QuestionnaireResponseModel;
  readonly root: QuestionnaireResponseModel;

  readonly #items: Signal.State<ResponseItem[]>;
  readonly #answerEntries: Signal.State<ResponseAnswer[]> | null;

  #answer:
    | Signal.State<AnswerValue[] | null>
    | Signal.Computed<AnswerValue[] | null>;

  #enabled: Signal.Computed<boolean>;
  readonly #initialAnswers: AnswerValue[];
  readonly #touched = new Signal.State(false);

  constructor(opts: ResponseItemInit) {
    this.id = opts.id;
    this.linkId = opts.linkId;
    this.text = opts.text;
    this.type = opts.type;
    this.#items = new Signal.State(opts.items);
    this.answerOptions = opts.answerOptions;
    this.parent = opts.parent;
    this.root = opts.root;
    this.calculatedExpression = opts.calculatedExpression;
    this.enableWhenExpression = opts.enableWhenExpression;
    this.#enabled = opts.enabled;
    this.#initialAnswers = opts.initialAnswers;

    if (opts.answerEntries) {
      this.#answerEntries = new Signal.State(opts.answerEntries);
      this.#answer = new Signal.Computed(() =>
        this.#answerEntries!.get().map((e) => e.value),
      );
    } else {
      this.#answerEntries = null;
      this.#answer = opts.calculatedAnswer
        ? opts.calculatedAnswer
        : new Signal.State<AnswerValue[]>(opts.initialAnswers, {
            equals: compare,
          });
    }
  }

  get items(): ResponseItem[] {
    return this.#items.get();
  }

  /** @internal Provides direct access to the items signal for mutation methods. */
  get _itemsSignal(): Signal.State<ResponseItem[]> {
    return this.#items;
  }

  get item(): ResponseItem[] {
    return this.items;
  }

  get enabled(): boolean {
    return this.#enabled.get();
  }

  get answer(): AnswerValue[] | null {
    return this.#answer.get();
  }

  /**
   * Returns per-answer entries with nested child items.
   * Non-empty only for non-group items that have child item definitions
   * in the questionnaire (the FHIR `answer[].item[]` pattern).
   */
  get answers(): ResponseAnswer[] {
    return this.#answerEntries?.get() ?? [];
  }

  /**
   * Whether this item uses per-answer nested items (`answer[].item[]`).
   */
  get hasAnswerItems(): boolean {
    return this.#answerEntries !== null;
  }

  get dirty(): boolean {
    return !compare(this.answer ?? [], this.#initialAnswers);
  }

  get touched(): boolean {
    return this.#touched.get();
  }

  markTouched(): void {
    this.#touched.set(true);
  }

  /**
   * Add a new instance of a repeating child item.
   */
  addItem(
    linkId: string,
    initial?: QuestionnaireResponseItem,
  ): ResponseItem {
    return addItemTo(this, this.root, linkId, initial);
  }

  /**
   * Remove a child item instance by its unique ID.
   */
  removeItem(itemId: string): void {
    removeItemFrom(this.root, itemId);
  }

  /**
   * Move a child item instance within its sibling group (same linkId).
   */
  moveItem(linkId: string, fromIndex: number, toIndex: number): void {
    moveItemIn(this, linkId, fromIndex, toIndex);
  }

  addAnswer(value: AnswerValue): void {
    if (this.#answerEntries) {
      const entry = this.#buildAnswerEntry(value);
      this.#answerEntries.set([...this.#answerEntries.get(), entry]);
      return;
    }
    this.setAnswer([...(this.answer ?? []), value]);
  }

  removeAnswer(index: number): void {
    if (this.#answerEntries) {
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
      return;
    }

    const current = this.answer ?? [];
    if (index < 0 || index >= current.length) {
      throw new Error(
        `Answer index ${index} out of range (0-${current.length - 1})`,
      );
    }
    this.setAnswer(current.filter((_, i) => i !== index));
  }

  setAnswer(value: AnswerValue[]): void {
    if (this.#answerEntries) {
      const entries = this.#answerEntries.get();
      const minLen = Math.min(value.length, entries.length);
      for (let i = 0; i < minLen; i++) {
        entries[i].setValue(value[i]);
      }
      return;
    }
    if (Signal.isState(this.#answer)) {
      (this.#answer as Signal.State<AnswerValue[] | null>).set(value);
    }
  }

  toFhir(): QuestionnaireResponseItem {
    const result: QuestionnaireResponseItem = { linkId: this.linkId };

    if (this.id) result.id = this.id;
    if (this.text) result.text = this.text;

    if (this.#answerEntries) {
      const entries = this.#answerEntries.get();
      if (entries.length > 0) {
        result.answer = entries.map((entry) => {
          const ans: QuestionnaireResponseAnswer = { ...entry.value };
          const childItems = entry.items.map((child) => child.toFhir());
          if (childItems.length > 0) ans.item = childItems;
          return ans;
        });
      }
    } else {
      const answers = this.answer;
      if (answers && answers.length > 0) result.answer = answers;

      const childItems = this.items.map((child) => child.toFhir());
      if (childItems.length > 0) result.item = childItems;
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
