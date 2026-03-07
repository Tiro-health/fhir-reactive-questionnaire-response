import { Signal } from "@lit-labs/signals";
import type {
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
} from "./types.js";
import type { ResponseItem } from "./ResponseItem.js";
import { addItemTo, removeItemFrom, moveItemIn } from "./mutations.js";
import { mergeResponse, type MergeStrategy } from "./merge.js";

export class QuestionnaireResponseModel {
  readonly resourceType = "QuestionnaireResponse" as const;
  readonly id: string | undefined;
  readonly status: string;
  readonly questionnaire: string | undefined;

  readonly #items: Signal.State<ResponseItem[]>;
  readonly itemsByLinkId: Map<string, ResponseItem[]>;
  readonly itemById: Map<string, ResponseItem>;
  readonly definitions: Map<string, QuestionnaireItem>;

  /** @internal Factory for creating new ResponseItems at runtime. Set during build. */
  _buildItem:
    | ((
        definition: QuestionnaireItem,
        responseItem: QuestionnaireResponseItem | undefined,
        parent: ResponseItem | QuestionnaireResponseModel,
        root: QuestionnaireResponseModel,
      ) => ResponseItem)
    | null = null;

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
    this.status = opts.status;
    this.questionnaire = opts.questionnaire;
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

  toFhir(): QuestionnaireResponse {
    const result: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: this.status,
    };

    if (this.id) result.id = this.id;
    if (this.questionnaire) result.questionnaire = this.questionnaire;

    const items = this.items.map((item) => item.toFhir());
    if (items.length > 0) result.item = items;

    return result;
  }

  /**
   * Merge a partial QuestionnaireResponse into this model.
   * Delegates to `mergeResponse()`.
   */
  merge(partial: QuestionnaireResponse, strategy?: MergeStrategy): void {
    mergeResponse(this, partial, strategy);
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
