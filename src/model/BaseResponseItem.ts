import { Signal } from "@lit-labs/signals";
import type {
  AnswerValue,
  OperationOutcomeIssue,
  QuestionnaireItemType,
  QuestionnaireResponseItem,
} from "./types.js";
import type { AnswerOption } from "./AnswerOption.js";
import type { QuestionnaireResponseModel } from "./QuestionnaireResponse.js";
import type { ParsedExpression } from "../build/extensions.js";
import type { EnabledResolver, ResponseItem, ResponseNode } from "./ResponseItem.js";
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
  answerConstraint?: "optionsOnly" | "optionsOrType" | "optionsOrString";
  disabledDisplay?: "hidden" | "protected";
  required?: boolean;
  readOnly?: boolean;
  repeats?: boolean;
  initialAnswers: AnswerValue[];
  enabledResolver: EnabledResolver;
  items: ResponseItem[];
  answerOptions: AnswerOption[];
  parent: ResponseNode;
  root: QuestionnaireResponseModel;
  calculatedExpression: ParsedExpression | null;
}

export abstract class BaseResponseItem implements ResponseItem {
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
  readonly parent: ResponseNode;
  readonly root: QuestionnaireResponseModel;

  readonly #items: Signal.State<ResponseItem[]>;
  readonly #enabled: Signal.Computed<boolean>;
  readonly #issues: Signal.State<readonly OperationOutcomeIssue[]>;
  protected readonly initialAnswers: AnswerValue[];
  readonly #touched = new Signal.State(false);

  constructor(opts: BaseResponseItemInit) {
    this.id = opts.id;
    this.linkId = opts.linkId;
    this.text = opts.text;
    this.type = opts.type;
    this.answerConstraint = opts.answerConstraint;
    this.disabledDisplay = opts.disabledDisplay;
    this.required = opts.required ?? false;
    this.readOnly = opts.readOnly ?? false;
    this.repeats = opts.repeats ?? false;
    this.#items = new Signal.State(opts.items);
    this.answerOptions = opts.answerOptions;
    this.parent = opts.parent;
    this.root = opts.root;
    this.calculatedExpression = opts.calculatedExpression;
    this.#enabled = new Signal.Computed(() => opts.enabledResolver(this));
    this.#issues = new Signal.State<readonly OperationOutcomeIssue[]>([]);
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

  get visible(): boolean {
    return this.enabled || this.disabledDisplay !== "hidden";
  }

  get visibleItems(): ResponseItem[] {
    return this.items.filter((i) => i.visible);
  }

  get hasVisibleItems(): boolean {
    return this.items.some((i) => i.visible);
  }

  get enabledAnswerOptions(): AnswerOption[] {
    return this.answerOptions.filter((o) => o.enabled);
  }

  get issues(): readonly OperationOutcomeIssue[] {
    return this.#issues.get();
  }

  /** @internal Set externally-reported issues on this item. Called by applyOutcome(). */
  _setIssues(issues: readonly OperationOutcomeIssue[]): void {
    this.#issues.set(issues);
  }

  get valid(): boolean {
    return !this.issues.some(
      (i) => i.severity === "error" || i.severity === "fatal",
    );
  }

  get dirty(): boolean {
    return !compare(this.answerValues ?? [], this.initialAnswers);
  }

  get touched(): boolean {
    return this.#touched.get();
  }

  findNearestItem(linkId: string): ResponseItem | null {
    const parent = this.parent;

    // Answer-entry siblings: if nested under answer[].item[], check
    // the same answer entry's items before walking the ancestor axis.
    if (parent.hasAnswerItems) {
      for (const entry of parent.answerEntries) {
        if (entry.items.includes(this as ResponseItem)) {
          const found = entry.items.find((i) => i.linkId === linkId);
          if (found) return found;
          break;
        }
      }
    }

    // Ancestor axis: walk up from item's parent, check each level's direct children
    let cursor: ResponseNode | null = parent;
    while (cursor) {
      const found = cursor.items.find((i) => i.linkId === linkId);
      if (found) return found;
      cursor = cursor.parent;
    }

    // Fallback: first registered instance (cross-group / top-level references)
    const all = this.root.getItems(linkId);
    return all.length > 0 ? all[0] : null;
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
  abstract toFhir(options?: import("./QuestionnaireResponse.js").ToFhirOptions): QuestionnaireResponseItem;
}
