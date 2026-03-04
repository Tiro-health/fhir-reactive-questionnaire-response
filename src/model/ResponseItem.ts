import { Signal } from "@lit-labs/signals";
import type {
  AnswerValue,
  QuestionnaireItemType,
  QuestionnaireResponseItem,
} from "./types.js";
import type { AnswerOption } from "./AnswerOption.js";
import type { QuestionnaireResponseModel } from "./QuestionnaireResponse.js";
import type { ParsedExpression } from "../build/extensions.js";
import compare from "./compare.js";

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

  #answer:
    | Signal.State<AnswerValue[] | null>
    | Signal.Computed<AnswerValue[] | null>;

  #enabled: Signal.Computed<boolean>;

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

    this.#answer = opts.calculatedAnswer
      ? opts.calculatedAnswer
      : new Signal.State<AnswerValue[]>(opts.initialAnswers, {
          equals: compare,
        });
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

  setAnswer(value: AnswerValue[]): void {
    if (Signal.isState(this.#answer)) {
      (this.#answer as Signal.State<AnswerValue[] | null>).set(value);
    }
  }

  toFhir(): QuestionnaireResponseItem {
    const result: QuestionnaireResponseItem = { linkId: this.linkId };

    if (this.id) result.id = this.id;
    if (this.text) result.text = this.text;

    const answers = this.answer;
    if (answers && answers.length > 0) result.answer = answers;

    const childItems = this.items.map((child) => child.toFhir());
    if (childItems.length > 0) result.item = childItems;

    return result;
  }
}
