import { Signal } from "@lit-labs/signals";
import type {
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
} from "./types.js";
import type { ResponseItem, ResponseNode } from "./ResponseItem.js";
import type { ResponseAnswer } from "./ResponseAnswer.js";
import { addItemTo, removeItemFrom, moveItemIn } from "./mutations.js";

export type QuestionnaireResponseStatus =
  | "in-progress"
  | "completed"
  | "amended"
  | "entered-in-error"
  | "stopped";

export interface ToFhirOptions {
  excludeDisabled?: boolean;
}

export class QuestionnaireResponseModel implements ResponseNode {
  readonly resourceType = "QuestionnaireResponse" as const;
  readonly id: string | undefined;
  readonly questionnaire: string;

  readonly #status: Signal.State<QuestionnaireResponseStatus>;

  readonly #items: Signal.State<ResponseItem[]>;
  readonly itemsByLinkId: Map<string, ResponseItem[]>;
  readonly itemById: Map<string, ResponseItem>;
  readonly definitions: Map<string, QuestionnaireItem>;

  // ResponseNode dummies — root has no parent and no answer entries
  readonly parent = null;
  readonly hasAnswerItems = false;
  readonly answerEntries: ResponseAnswer[] = [];

  /** @internal Factory for creating new ResponseItems at runtime. Set during build. */
  _buildItem:
    | ((
        definition: QuestionnaireItem,
        responseItem: QuestionnaireResponseItem | undefined,
        parent: ResponseNode,
        root: QuestionnaireResponseModel,
      ) => ResponseItem)
    | null = null;

  get status(): QuestionnaireResponseStatus {
    return this.#status.get();
  }

  set status(value: QuestionnaireResponseStatus) {
    this.#status.set(value);
  }

  get items(): ResponseItem[] {
    return this.#items.get();
  }

  get item(): ResponseItem[] {
    return this.items;
  }

  /** @internal Provides direct access to the items signal for mutation methods. */
  get _itemsSignal(): Signal.State<ResponseItem[]> {
    return this.#items;
  }

  constructor(opts: {
    id?: string;
    status: string;
    questionnaire?: string;
    items: ResponseItem[];
  }) {
    this.id = opts.id;
    this.#status = new Signal.State(
      opts.status as QuestionnaireResponseStatus,
    );
    this.questionnaire = opts.questionnaire ?? "";
    this.#items = new Signal.State(opts.items);

    this.itemsByLinkId = new Map();
    this.itemById = new Map();
    this.definitions = new Map();
  }

  getItems(linkId: string): ResponseItem[] {
    return this.itemsByLinkId.get(linkId) ?? [];
  }

  getItemById(id: string): ResponseItem | undefined {
    return this.itemById.get(id);
  }

  registerItem(item: ResponseItem): void {
    const existing = this.itemsByLinkId.get(item.linkId);
    if (existing) {
      existing.push(item);
    } else {
      this.itemsByLinkId.set(item.linkId, [item]);
    }
    if (item.id) {
      this.itemById.set(item.id, item);
    }
  }

  /**
   * Add a new instance of a repeating item at the root level.
   * The item must have `repeats: true` in its questionnaire definition.
   */
  addItem(
    linkId: string,
    initial?: QuestionnaireResponseItem,
  ): ResponseItem {
    return addItemTo(this, this, linkId, initial);
  }

  /**
   * Remove an item instance by its unique ID.
   */
  removeItem(itemId: string): void {
    removeItemFrom(this, itemId);
  }

  /**
   * Move an item instance within its sibling group (same linkId).
   */
  moveItem(linkId: string, fromIndex: number, toIndex: number): void {
    moveItemIn(this, linkId, fromIndex, toIndex);
  }

  toFhir(options?: ToFhirOptions): QuestionnaireResponse {
    const result: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: this.status,
      questionnaire: this.questionnaire,
    };

    if (this.id) result.id = this.id;

    const serialize = options?.excludeDisabled
      ? (items: ResponseItem[]) =>
          items
            .filter((item) => item.enabled)
            .map((item) => item.toFhir(options))
      : (items: ResponseItem[]) => items.map((item) => item.toFhir(options));

    const items = serialize(this.items);
    if (items.length > 0) result.item = items;

    return result;
  }

  submit(
    status: QuestionnaireResponseStatus = "completed",
  ): QuestionnaireResponse {
    this.#status.set(status);
    return this.toFhir({ excludeDisabled: true });
  }

  forEachItem(fn: (item: ResponseItem) => void): void {
    const walk = (items: ResponseItem[]) => {
      for (const item of items) {
        fn(item);
        walk(item.items);
        for (const entry of item.answerEntries) {
          walk(entry.items);
        }
      }
    };
    walk(this.items);
  }
}
