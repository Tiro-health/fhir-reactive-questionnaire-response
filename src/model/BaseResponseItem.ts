import { Signal } from "@lit-labs/signals";
import type {
  AnswerValue,
  QuestionnaireItemType,
  QuestionnaireResponseItem,
} from "./types.js";
import type { AnswerOption } from "./AnswerOption.js";
import type { QuestionnaireResponseModel } from "./QuestionnaireResponse.js";
import type { ParsedExpression } from "../build/extensions.js";
import type { ResponseItem, ResponseNode } from "./ResponseItem.js";
import type { ResponseAnswer } from "./ResponseAnswer.js";
import compare from "./compare.js";
import {
  addItemTo,
  removeItemFrom,
  moveItemIn,
} from "./mutations.js";

export interface BaseResponseItemInit {
  linkId: string;
  text: string;
  type: QuestionnaireItemType;
  id?: string;
  initialAnswers: AnswerValue[];
  enabled: Signal.Computed<boolean>;
  items: ResponseItem[];
  answerOptions: AnswerOption[];
  parent: ResponseNode;
  root: QuestionnaireResponseModel;
  calculatedExpression: ParsedExpression | null;
  enableWhenExpression: ParsedExpression | null;
}

export abstract class BaseResponseItem implements ResponseItem {
  readonly id: string | undefined;
  readonly linkId: string;
  readonly text: string;
  readonly type: QuestionnaireItemType;
  readonly answerOptions: AnswerOption[];
  readonly calculatedExpression: ParsedExpression | null;
  readonly enableWhenExpression: ParsedExpression | null;
  readonly parent: ResponseNode;
  readonly root: QuestionnaireResponseModel;

  readonly #items: Signal.State<ResponseItem[]>;
  readonly #enabled: Signal.Computed<boolean>;
  protected readonly initialAnswers: AnswerValue[];
  readonly #touched = new Signal.State(false);

  constructor(opts: BaseResponseItemInit) {
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
    this.initialAnswers = opts.initialAnswers;
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

  get dirty(): boolean {
    return !compare(this.answerValues ?? [], this.initialAnswers);
  }

  get touched(): boolean {
    return this.#touched.get();
  }

  markTouched(): void {
    this.#touched.set(true);
  }

  addItem(
    linkId: string,
    initial?: QuestionnaireResponseItem,
  ): ResponseItem {
    return addItemTo(this, this.root, linkId, initial);
  }

  removeItem(itemId: string): void {
    removeItemFrom(this.root, itemId);
  }

  moveItem(linkId: string, fromIndex: number, toIndex: number): void {
    moveItemIn(this, linkId, fromIndex, toIndex);
  }

  abstract get answerValues(): AnswerValue[] | null;

  /** FHIR alias — used by FHIRPath navigation. Prefer `answerValues`. */
  abstract get answer(): AnswerValue[] | null;
  abstract get answerEntries(): ResponseAnswer[];
  abstract get hasAnswerItems(): boolean;
  abstract setAnswer(value: AnswerValue[]): void;
  abstract addAnswer(value: AnswerValue): void;
  abstract removeAnswer(index: number): void;
  abstract toFhir(): QuestionnaireResponseItem;
}
