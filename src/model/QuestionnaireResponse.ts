import { Signal } from "@lit-labs/signals";
import type {
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
} from "./types.js";
import type { ResponseItem } from "./ResponseItem.js";

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

  forEachItem(fn: (item: ResponseItem) => void): void {
    const walk = (items: ResponseItem[]) => {
      for (const item of items) {
        fn(item);
        walk(item.items);
      }
    };
    walk(this.items);
  }
}
