import type { Signal } from "@lit-labs/signals";
import type {
  AnswerValue,
  QuestionnaireItemType,
  QuestionnaireResponseItem,
} from "./types.js";
import type { AnswerOption } from "./AnswerOption.js";
import type { QuestionnaireResponseModel } from "./QuestionnaireResponse.js";
import type { ParsedExpression } from "../build/extensions.js";
import type { ResponseAnswer } from "./ResponseAnswer.js";

export type EnabledResolver = (item: ResponseItem) => boolean;

/**
 * Common tree-node interface shared by ResponseItem and QuestionnaireResponseModel.
 * Enables tree traversal (e.g. enableWhen ancestor walk) without type casts.
 */
export interface ResponseNode {
  readonly items: ResponseItem[];
  readonly _itemsSignal: Signal.State<ResponseItem[]>;
  parent: ResponseNode | null;
  readonly hasAnswerItems: boolean;
  readonly answerEntries: ResponseAnswer[];
}

export interface ResponseItem extends ResponseNode {
  readonly id: string | undefined;
  readonly linkId: string;
  readonly text: string;
  readonly type: QuestionnaireItemType;
  readonly answerConstraint: "optionsOnly" | "optionsOrType" | "optionsOrString" | undefined;
  readonly disabledDisplay: "hidden" | "protected" | undefined;
  readonly required: boolean;
  readonly readOnly: boolean;
  readonly repeats: boolean;
  readonly answerOptions: AnswerOption[];
  readonly calculatedExpression: ParsedExpression | null;
  parent: ResponseNode;
  readonly root: QuestionnaireResponseModel;

  readonly items: ResponseItem[];
  readonly item: ResponseItem[];
  readonly answerValues: AnswerValue[] | null;
  /** FHIR alias — used by FHIRPath navigation. Prefer `answerValues`. */
  readonly answer: AnswerValue[] | null;
  readonly answerEntries: ResponseAnswer[];
  readonly hasAnswerItems: boolean;
  readonly enabled: boolean;
  readonly visible: boolean;
  readonly visibleItems: ResponseItem[];
  readonly hasVisibleItems: boolean;
  readonly enabledAnswerOptions: AnswerOption[];
  readonly dirty: boolean;
  readonly touched: boolean;

  /** @internal Provides direct access to the items signal for mutation methods. */
  readonly _itemsSignal: Signal.State<ResponseItem[]>;

  findNearestItem(linkId: string): ResponseItem | null;
  markTouched(): void;
  setAnswer(value: AnswerValue[]): void;
  addAnswer(value: AnswerValue): void;
  removeAnswer(index: number): void;
  addItem(linkId: string, initial?: QuestionnaireResponseItem): ResponseItem;
  removeItem(itemId: string): void;
  moveItem(linkId: string, fromIndex: number, toIndex: number): void;
  toFhir(): QuestionnaireResponseItem;
}
