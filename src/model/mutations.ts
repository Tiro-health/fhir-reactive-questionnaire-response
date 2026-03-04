import type { QuestionnaireResponseItem } from "./types.js";
import type { ResponseItem } from "./ResponseItem.js";
import type { QuestionnaireResponseModel } from "./QuestionnaireResponse.js";

type ItemParent = ResponseItem | QuestionnaireResponseModel;

/**
 * Add a new instance of a repeating item as a child of `parent`.
 */
export function addItemTo(
  parent: ItemParent,
  root: QuestionnaireResponseModel,
  linkId: string,
  initial?: QuestionnaireResponseItem,
): ResponseItem {
  const definition = root.definitions.get(linkId);
  if (!definition) {
    throw new Error(`No questionnaire definition found for linkId "${linkId}"`);
  }
  if (definition.type !== "group") {
    throw new Error(
      `Item "${linkId}" is type "${definition.type}". Only repeating groups can have multiple instances. For non-group repeating items, use setAnswer() with multiple answer values.`,
    );
  }
  if (!definition.repeats) {
    throw new Error(
      `Group "${linkId}" does not have repeats=true. Only repeating groups can be added dynamically.`,
    );
  }

  const buildItem = root._buildItem;
  if (!buildItem) {
    throw new Error(
      "Model was not built with buildQuestionnaireResponse(). Cannot create items at runtime.",
    );
  }

  // Ensure the initial item has an ID
  const responseItem = initial
    ? { ...initial, id: initial.id ?? crypto.randomUUID() }
    : { linkId, id: crypto.randomUUID() };

  const newItem = buildItem(definition, responseItem, parent, root);

  // Register in root indexes
  root.registerItem(newItem);
  registerChildren(newItem, root);

  // Append to parent's items signal
  parent._itemsSignal.set([...parent.items, newItem]);

  return newItem;
}

/**
 * Remove an item instance by ID.
 */
export function removeItemFrom(
  root: QuestionnaireResponseModel,
  itemId: string,
): void {
  const item = root.getItemById(itemId);
  if (!item) {
    throw new Error(`No item found with id "${itemId}"`);
  }

  const parent = item.parent;

  // Remove from parent's items signal
  parent._itemsSignal.set(parent.items.filter((i) => i !== item));

  // Unregister from root indexes
  unregisterItem(item, root);
}

/**
 * Move an item instance within its sibling group (same linkId) under `parent`.
 * fromIndex/toIndex are relative to the matching linkId items within the parent.
 */
export function moveItemIn(
  parent: ItemParent,
  linkId: string,
  fromIndex: number,
  toIndex: number,
): void {
  if (fromIndex === toIndex) return;

  const currentItems = [...parent.items];

  // Collect positions of items with matching linkId within parent's items
  const matchIndices: number[] = [];
  for (let i = 0; i < currentItems.length; i++) {
    if (currentItems[i].linkId === linkId) {
      matchIndices.push(i);
    }
  }

  if (fromIndex < 0 || fromIndex >= matchIndices.length) {
    throw new Error(`fromIndex ${fromIndex} out of range (0-${matchIndices.length - 1})`);
  }
  if (toIndex < 0 || toIndex >= matchIndices.length) {
    throw new Error(`toIndex ${toIndex} out of range (0-${matchIndices.length - 1})`);
  }

  // Remove the item from its current absolute position
  const actualFrom = matchIndices[fromIndex];
  const [moved] = currentItems.splice(actualFrom, 1);

  // After removal, recalculate where the target slot is.
  // Re-scan for matching indices in the (now shorter) array.
  const newMatchIndices: number[] = [];
  for (let i = 0; i < currentItems.length; i++) {
    if (currentItems[i].linkId === linkId) {
      newMatchIndices.push(i);
    }
  }

  // Insert before the item currently at toIndex, or after the last match if toIndex is at the end
  const insertAt =
    toIndex < newMatchIndices.length
      ? newMatchIndices[toIndex]
      : (newMatchIndices[newMatchIndices.length - 1] ?? currentItems.length - 1) + 1;

  currentItems.splice(insertAt, 0, moved);
  parent._itemsSignal.set(currentItems);

  // Also update the itemsByLinkId index order
  const root = "resourceType" in parent ? parent : (parent as ResponseItem).root;
  const indexList = root.itemsByLinkId.get(linkId);
  if (indexList) {
    const idxInList = indexList.indexOf(moved);
    if (idxInList !== -1) indexList.splice(idxInList, 1);
    indexList.splice(toIndex, 0, moved);
  }
}

export function registerChildren(
  item: ResponseItem,
  root: QuestionnaireResponseModel,
): void {
  for (const child of item.items) {
    root.registerItem(child);
    registerChildren(child, root);
  }
}

export function unregisterItem(
  item: ResponseItem,
  root: QuestionnaireResponseModel,
): void {
  // Unregister children recursively first
  for (const child of item.items) {
    unregisterItem(child, root);
  }

  // Remove from itemsByLinkId
  const siblings = root.itemsByLinkId.get(item.linkId);
  if (siblings) {
    const idx = siblings.indexOf(item);
    if (idx !== -1) siblings.splice(idx, 1);
    if (siblings.length === 0) root.itemsByLinkId.delete(item.linkId);
  }

  // Remove from itemById
  if (item.id) {
    root.itemById.delete(item.id);
  }
}
